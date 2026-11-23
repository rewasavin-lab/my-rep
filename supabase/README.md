# Blog database (Supabase)

Blog posts live in the `public.blog_posts` table. Everything else about the
blog (categories, topic clusters, UI text, design) stays in the codebase.

## Files

| File | Purpose |
| --- | --- |
| `schema.sql` | Table, constraints, RLS. Safe to re-run. |
| `reader-role.sql` | Read-only `blog_reader` role the site connects as. |
| `seed.sql` | The original posts (generated — `node supabase/generate-seed.ts`). Upserts every column, so re-running it overwrites dashboard edits to those posts. |
| `blog-posts.seed.ts` | Source for `seed.sql`. |
| `research-seed.sql` | The 14 research-desk posts, the spoke articles of the Research library at `/research` (generated — `node supabase/generate-research-seed.ts`). Upserts only those slugs, with `sort_order` from 100, so it never touches the original posts. |
| `research-posts.seed.ts`, `research-posts/` | Source for `research-seed.sql`, one file per research report. The byline is set once in `research-posts/author.ts`. `npm run test:research` checks every post before you generate. |

### Publishing the research posts

1. Run `npm run test:research`; it must pass.
2. Run `node supabase/generate-research-seed.ts`.
3. Paste `research-seed.sql` into the Supabase SQL editor and run it.
4. Call the revalidate webhook (below) or wait about six minutes. The posts
   then appear on `/blogs`, in three new topic clusters, in the sitemap and
   `/llms-full.txt`, and as "Articles from this report" on each research page.

The research reports themselves are not in the database: they live in
`src/lib/research/reports/` and deploy with the code.

## Environment

See `.env.example`. On Vercel set **`DATABASE_URL`** (the `blog_reader`
connection string from `.env.local`) and optionally `BLOG_REVALIDATE_SECRET`.
Never put `DIRECT_URL` (admin) on Vercel. Without `DATABASE_URL` — or with a
`localhost` one, which Vercel cannot reach — the site deploys with an empty
blog and newsroom and logs a `[blogs]` warning; set the real value and
redeploy to bring the posts back. A configured database that cannot be read
(down, wrong password) still fails the build rather than shipping an empty
blog.

## Editing posts

Use the Supabase Table Editor on `blog_posts`:

- `published = false` hides a post; `sort_order` sets list order and prev/next.
- Nested fields are JSON (`sections`, `keywords`, `faq`, `author`, …) with the
  shapes described in `schema.sql` and `src/lib/blogs.ts`. A row with an
  invalid `author.name`, `keywords.primary`, `category` or `hero_sketch` is
  skipped and logged instead of breaking the blog.
- A section with `"embed": "procurement"` renders the interactive procurement
  walkthrough after its text.

Changes appear within ~6 minutes. For instant updates, create a Database
Webhook (Database → Webhooks) on `blog_posts` for insert/update/delete:
`POST https://www.savingroup.in/api/revalidate/blog` with HTTP header
`x-revalidate-secret: <BLOG_REVALIDATE_SECRET>`.

## Connection security

The site connects as `blog_reader` (SELECT on published posts only) with full
TLS verification against the pinned Supabase root CA (`src/lib/supabase-ca.ts`).

## Newsroom table

Short industry stories live in `public.news_posts` (`news-schema.sql`, safe to
re-run). They are written automatically by the Savin Group publisher — the
`lib/sanat` pipeline in the sibling `automation` project — which connects with
the admin `DIRECT_URL`, upserts rows on `slug`, and then calls
`POST /api/revalidate/blog` so the story is live immediately. The site reads
the table through the same read-only `blog_reader` role as the blog
(`news-schema.sql` grants it SELECT on published rows).

The newsroom renders at `/{country}/{locale}/newsroom`, with one page per
desk (`/newsroom/category/{ai|automation|manufacturing|software|markets|policy}`)
and one per story (`/newsroom/{slug}`). A project without the table renders an
empty newsroom rather than failing the build.

## Leads (website enquiries)

Every form on the site posts to `POST /api/leads`, which stores the enquiry
through `public.submit_lead(jsonb)` and/or forwards it to a webhook. Nothing
is reported to the visitor as received unless one of the two succeeded.

| File | Purpose |
| --- | --- |
| `leads-schema.sql` | `leads`, `lead_tasks`, the `submit_lead` function and the `lead_writer` role. Safe to re-run. **Not applied automatically:** run it yourself in the SQL editor. |

### Setting it up

1. Run `leads-schema.sql` in the Supabase SQL editor.
2. Enable the login: `alter role lead_writer with login password '<long random>';`
3. Put that role's transaction-pooler connection string in the site's
   environment as `LEADS_DATABASE_URL` (see `.env.example`), and redeploy.
4. Submit a form, then check: `select reference, name, company, service, priority from public.leads order by created_at desc;`

### What the website can and cannot do

`lead_writer` holds EXECUTE on `submit_lead` and nothing else: no SELECT,
INSERT, UPDATE or DELETE on either table, and RLS is on with no policies, so
the REST API keys cannot reach the tables either. The site can add a lead; it
cannot read one back. Read leads from the dashboard, a CRM sync, or the admin
connection.

### What a row holds

- The enquiry, its `category` / `priority` / `score` (a sorting aid, see
  `src/lib/leads/categorize.ts`), and `status` (`new` until someone works it).
- Consent: `consent_contact`, `consent_marketing`, the exact wording agreed to
  and its version. **Send marketing only where `consent_marketing` is true.**
- `source`: form id, page, locale, market, landing page, referrer, UTM
  parameters and ad click ids.
- `duplicate_of`: set when the same email enquired in the last 30 days. The
  follow-up task for a repeat is attached to the original lead.
- `lead_tasks`: one `follow_up` task per new lead, due the next working day
  (IST, Sunday off).

A retried submission carries the same idempotency key and returns the row it
already wrote; it never creates a second lead or a second task.

### Webhook payload (`LEAD_WEBHOOK_URL`)

`POST` with `Content-Type: application/json` and these headers:

| Header | Value |
| --- | --- |
| `X-Savin-Event` | `lead.created` |
| `X-Savin-Idempotency-Key` | The submission's key. Drop repeats of it. |
| `X-Savin-Timestamp` | Epoch seconds at send time. |
| `X-Savin-Signature` | `sha256=` + hex HMAC-SHA256 of `<timestamp>.<raw body>` with `LEAD_WEBHOOK_SECRET`. |

Body: `{ "event": "lead.created", "version": 1, "sentAt": "...", "lead": { ... } }`
where `lead` is the stored record plus `id` (null without a database) and
`duplicate`. Answer 2xx to accept. A 5xx, 429 or timeout is retried once; a
4xx is not.
