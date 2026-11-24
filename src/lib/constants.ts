// Site-wide constants for Savin Group

export const BASE_URL = "https://www.savingroup.in";

/* -------------------------------------------------------------------------- */
/*                  Resolvable vs Indexable — the core split                  */
/* -------------------------------------------------------------------------- */

/**
 * Countries the site can RESOLVE URLs for. A visitor hitting `/us/en/about`
 * still gets a rendered page, country-aware metadata, and country-specific
 * content blocks from `country-content.ts`. Resolvable ≠ indexable: most of
 * these ship `noindex` until we earn local authority in those markets.
 *
 * Tiers (see `country-content.ts` for content depth):
 *   T1 — deep hand-written content: in, us, gb, ae
 *   T2 — templated + market-specific bullets: ca, au, sg, de
 *   T3 — lighter localization:       fr, es, nl, sa
 */
export const RESOLVABLE_COUNTRIES = [
  "in", "us", "gb", "ae",
  "ca", "au", "sg", "de",
  "fr", "es", "nl", "sa",
] as const;

/**
 * Every ISO 3166-1 alpha-2 code the router accepts as `/{country}/`. Codes
 * in RESOLVABLE_COUNTRIES render their own edition. Every other code would
 * render the India page word for word (`getCountryContent` falls back to
 * India), so the middleware 308s it to the canonical /in/ URL instead
 * (`retiredDuplicateTarget` in page-versions.ts). They stay in this list so
 * old URLs redirect rather than 404.
 */
export const ALL_COUNTRIES = [
  "ad", "ae", "af", "ag", "ai", "al", "am", "ao", "ar", "as", "at", "au", "aw", "ax", "az",
  "ba", "bb", "bd", "be", "bf", "bg", "bh", "bi", "bj", "bl", "bm", "bn", "bo", "bq", "br",
  "bs", "bt", "bv", "bw", "by", "bz", "ca", "cc", "cd", "cf", "cg", "ch", "ci", "ck", "cl",
  "cm", "cn", "co", "cr", "cu", "cv", "cw", "cx", "cy", "cz", "de", "dj", "dk", "dm", "do",
  "dz", "ec", "ee", "eg", "eh", "er", "es", "et", "fi", "fj", "fk", "fm", "fo", "fr", "ga",
  "gb", "gd", "ge", "gf", "gg", "gh", "gi", "gl", "gm", "gn", "gp", "gq", "gr", "gt", "gu",
  "gw", "gy", "hk", "hm", "hn", "hr", "ht", "hu", "id", "ie", "il", "im", "in", "io", "iq",
  "ir", "is", "it", "je", "jm", "jo", "jp", "ke", "kg", "kh", "ki", "km", "kn", "kp", "kr",
  "kw", "ky", "kz", "la", "lb", "lc", "li", "lk", "lr", "ls", "lt", "lu", "lv", "ly", "ma",
  "mc", "md", "me", "mf", "mg", "mh", "mk", "ml", "mm", "mn", "mo", "mp", "mq", "mr", "ms",
  "mt", "mu", "mv", "mw", "mx", "my", "mz", "na", "nc", "ne", "nf", "ng", "ni", "nl", "no",
  "np", "nr", "nu", "nz", "om", "pa", "pe", "pf", "pg", "ph", "pk", "pl", "pm", "pn", "pr",
  "ps", "pt", "pw", "py", "qa", "re", "ro", "rs", "ru", "rw", "sa", "sb", "sc", "sd", "se",
  "sg", "sh", "si", "sj", "sk", "sl", "sm", "sn", "so", "sr", "ss", "st", "sv", "sx", "sy",
  "sz", "tc", "td", "tf", "tg", "th", "tj", "tk", "tl", "tm", "tn", "to", "tr", "tt", "tv",
  "tz", "ua", "ug", "um", "us", "uy", "uz", "va", "vc", "ve", "vg", "vi", "vn", "vu", "wf",
  "ws", "ye", "yt", "za", "zm", "zw",
] as const;

/**
 * The country editions Google should INDEX — the "canonical editions". Each
 * one gets an entry in the sitemap index, its own sitemap, and self-canonical
 * pages. Every other country still renders (a visitor on /us/en/pricing sees
 * the US page), but its pages declare the /in/ copy as their canonical, so
 * Google files them as "Alternate page with proper canonical tag" and puts
 * every ranking signal on one URL.
 *
 * WHY ONLY INDIA (2026-11-23). From 2026-09-29 this list held every ISO code,
 * and the sitemaps listed ~93,000 URLs: each page × ~250 countries × 8
 * locales. Search Console's verdict, from the 2026-11 export:
 *   - "Discovered – currently not indexed" went from 38 to 93,275 the week
 *     the sitemaps grew, and 72,660 were still never crawled two months on.
 *     Google will not spend crawl budget on tens of thousands of copies.
 *   - "Duplicate, Google chose different canonical than user" on the copies
 *     it did crawl — including hreflang markets (/ae/en/about, /au/en/terms).
 *     Each copy called itself canonical; Google disagreed.
 * The country variants differ only in a few market blocks and a place name in
 * the title, and the .in ccTLD already geo-targets the whole site to India
 * (Google does not let subfolders on a ccTLD target other countries), so the
 * extra editions could only ever compete with /in/, never rank alongside it.
 *
 * TO ADD A MARKET BACK: give it genuinely different content first, then add
 * its code here. The sitemap, canonicals and hreflang cluster all follow.
 */
export const INDEXABLE_COUNTRIES: readonly (typeof ALL_COUNTRIES)[number][] = ["in"];

/** The edition every non-indexable country variant points its canonical at. */
export const PRIMARY_COUNTRY = INDEXABLE_COUNTRIES[0];

/**
 * Countries in the hreflang cluster that `buildAlternates` (seo.ts) emits.
 * Only canonical editions can be cluster members: a page whose canonical
 * points elsewhere cannot carry hreflang, or Google discards the cluster.
 */
export const HREFLANG_COUNTRIES = INDEXABLE_COUNTRIES;

/**
 * Locales the site can RESOLVE. Adding a new language = add it here AND in
 * `i18n.ts` (LOCALES record) AND in `middleware.ts` (validLocales).
 */
export const RESOLVABLE_LOCALES = [
  "en", "es", "fr", "de", "ar", "hi", "zh", "gu",
] as const;

/**
 * Languages the whole site is actually WRITTEN in. A page in any other locale
 * still renders, but declares its English copy as canonical (see
 * `buildAlternates` in seo.ts). A single page can be written in more
 * languages than this — a city with a hand-written Hindi body passes its own
 * list (`getCityIndexableLocales`) — but never in fewer.
 *
 * WHY ENGLISH ONLY (2026-11-23). Measured against en.json, the other locale
 * files hold: hi 40%, es/fr/de 45%, ar/zh 39%, gu 1% of the keys. Every
 * missing key falls back to English, and blog, industry, newsroom and
 * Factory Graph bodies are English in every locale. So /in/hi/services is
 * mostly the English page with a Hindi header, and Search Console listed
 * those URLs among the 93,000 "Discovered – currently not indexed".
 *
 * TO ADD A LANGUAGE BACK: translate its locale file completely (and the
 * bodies of anything it should rank for), then add it here. Do it per
 * language, and only when a native reader would call the page theirs.
 */
export const INDEXABLE_LOCALES: readonly (typeof RESOLVABLE_LOCALES)[number][] = ["en"];

/** The language every not-yet-written locale variant points its canonical at. */
export const PRIMARY_LOCALE = "en";

/* -------------------------------------------------------------------------- */
/*                       Backwards-compat aliases                             */
/* -------------------------------------------------------------------------- */

/** @deprecated Use RESOLVABLE_COUNTRIES (URL works) or INDEXABLE_COUNTRIES (in sitemap). */
export const TARGET_COUNTRIES = RESOLVABLE_COUNTRIES;
export type TargetCountry = (typeof RESOLVABLE_COUNTRIES)[number];

/** Alias used by sitemap routes — equivalent to INDEXABLE_LOCALES. */
export const LANGUAGES = INDEXABLE_LOCALES;

/** Alias used by sitemap-index — equivalent to INDEXABLE_COUNTRIES. */
export const COUNTRIES = INDEXABLE_COUNTRIES;

/* -------------------------------------------------------------------------- */
/*                              Type guards                                   */
/* -------------------------------------------------------------------------- */

/** Is this country one of the canonical editions (INDEXABLE_COUNTRIES)? */
export function isIndexableCountry(
  code: string,
): code is (typeof INDEXABLE_COUNTRIES)[number] {
  return (INDEXABLE_COUNTRIES as readonly string[]).includes(code.toLowerCase());
}

export function isIndexableLocale(
  code: string,
): code is (typeof INDEXABLE_LOCALES)[number] {
  return (INDEXABLE_LOCALES as readonly string[]).includes(code.toLowerCase());
}

/**
 * May this URL carry `index, follow`? True for every country and locale the
 * router renders; false only for codes it does not know (/zz/en, /in/xx).
 *
 * This is deliberately NOT "is this the copy Google should index". That is
 * the canonical's job: /us/en/pricing is indexable and declares
 * /in/en/pricing as canonical, which is what makes Google report it as an
 * alternate instead of a competing duplicate. Putting `noindex` on it as well
 * would send two conflicting signals. For "is this the canonical edition",
 * use `isCanonicalEdition`.
 */
export function isIndexable(country: string, locale: string): boolean {
  return (
    (ALL_COUNTRIES as readonly string[]).includes(country.toLowerCase()) &&
    (RESOLVABLE_LOCALES as readonly string[]).includes(locale.toLowerCase())
  );
}

/**
 * Is /{country}/{locale}/ the canonical edition for site-wide pages — the copy
 * that is self-canonical and listed in the sitemap? Pages written in extra
 * languages (a city with a Hindi body) check their own locale list instead.
 */
export function isCanonicalEdition(country: string, locale: string): boolean {
  return isIndexableCountry(country) && isIndexableLocale(locale);
}

/** Is this country a member of the hreflang cluster? See HREFLANG_COUNTRIES. */
export function isHreflangCountry(code: string): boolean {
  return (HREFLANG_COUNTRIES as readonly string[]).includes(code.toLowerCase());
}

/** Resolvable check — does this country render at all? */
export function isResolvableCountry(
  code: string,
): code is TargetCountry {
  return (RESOLVABLE_COUNTRIES as readonly string[]).includes(code.toLowerCase());
}

/**
 * @deprecated Renamed to isIndexableCountry. Kept as an alias because
 * country-content.ts comments still reference the old name.
 */
export const isTargetCountry = isIndexableCountry;

/* -------------------------------------------------------------------------- */
/*                              Page registry                                 */
/* -------------------------------------------------------------------------- */

export const STATIC_PAGES = [
  "",
  "services",
  "industries",
  "pricing",
  "case-studies",
  "about",
  "contact",
  "privacy",
  "terms",
];

export const URLS_PER_SITEMAP = 50000;

/* -------------------------------------------------------------------------- */
/*                          Brand + social identity                           */
/* -------------------------------------------------------------------------- */

/**
 * SOCIAL PROFILES — one list, read by the footer icons AND by the
 * `sameAs` array in the Organization JSON-LD (`seo.ts`).
 *
 * WHY IT IS EMPTY. The footer used to render three icons pointing at
 * `https://www.linkedin.com/`, `https://x.com/` and `https://github.com/` —
 * the platforms' own front doors, not profiles. To a visitor checking whether
 * a stranger is real, a "LinkedIn" button that dumps them on LinkedIn's
 * homepage is worse than no button: it reads as a template nobody finished.
 * `seo.ts` had already, correctly, refused to emit those as `sameAs` for the
 * same reason.
 *
 * Both surfaces now render nothing rather than something false, and both come
 * back on the moment a real URL is added here — no other edit needed.
 *
 * TO ENABLE: add the full profile URL, e.g.
 *   { platform: "linkedin", url: "https://www.linkedin.com/company/savin-group" }
 * `platform` must be one of the keys in the footer's icon map.
 */
export const SOCIAL_PROFILES: ReadonlyArray<{
  platform: "linkedin" | "x" | "github" | "instagram" | "youtube";
  url: string;
}> = [];

/**
 * The brand's own name, and the domain it trades under.
 *
 * These differ — the site is Savin Group, the domain is savingroup.in — and
 * nothing on the site acknowledged it, so a visitor who noticed had no way to
 * tell whether they were on the right site. The footer now states the pairing
 * plainly.
 *
 * `legalNote` is deliberately a bare statement of fact about this website. If
 * Savin Group is a unit, brand or subsidiary of a company called Savin Group,
 * say so here — that is a matter of record only the owner can supply, and
 * guessing at a corporate relationship in a footer is how you end up with a
 * misleading disclosure.
 */
export const BRAND = {
  name: "Savin Group",
  domain: "savingroup.in",
  legalNote: "Savin Group is the trading name for this site, savingroup.in.",
} as const;

/**
 * The one identifier for Savin Group in structured data. The site-wide
 * Organization node declares it, and every `provider` / `publisher` points at
 * it, so search engines and AI knowledge graphs merge every Service, WebSite
 * and page node into ONE entity instead of dozens of nameless "Savin Group"
 * blank nodes. Never change it: it is an identifier, not a link.
 */
export const ORGANIZATION_ID = `${BASE_URL}/#organization`;
