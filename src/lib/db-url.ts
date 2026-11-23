// lib/db-url.ts
//
// Turns a Postgres connection-string environment variable (DATABASE_URL,
// LEADS_DATABASE_URL) into a URL that both `new URL()` and postgres.js accept.
//
// A value typed into a hosting dashboard (Vercel → Settings → Environment
// Variables) arrives exactly as pasted, and `new URL()` rejects the usual paste
// slips with a bare "TypeError: Invalid URL" — which failed a production build
// while collecting page data for /blogs/[slug]. Three slips are harmless and
// are undone here:
//
//   - surrounding quotes, copied from .env.example     "postgresql://…"
//   - the whole line, name included                     DATABASE_URL=postgresql://…
//   - a password holding / ? # % or a space that was never percent-encoded
//
// Anything else — a <placeholder> from .env.example left in, a value that is
// not a postgres URL at all — throws an error that names the variable and the
// problem. The message never includes the value: it is a credential, and build
// logs are shared.
//
// Server-only.

const SCHEME = /^postgres(?:ql)?:\/\//i;
const PLACEHOLDER = /<(?:project-ref|password|region)>/i;

export function normalizeDatabaseUrl(raw: string, name = "DATABASE_URL"): string {
  let value = raw.trim();
  if (value.startsWith(`${name}=`)) value = value.slice(name.length + 1).trim();
  const quoted = /^(["'])([\s\S]*)\1$/.exec(value);
  if (quoted) value = quoted[2].trim();

  const fail = (problem: string) =>
    new Error(
      `${name} is not a usable connection string: ${problem}. ` +
        `Expected postgresql://USER:PASSWORD@HOST:6543/postgres, pasted without quotes (see .env.example).`
    );

  if (!value) throw fail("it is empty");
  if (PLACEHOLDER.test(value)) {
    throw fail("it still contains a placeholder such as <password> or <project-ref> from .env.example");
  }
  const scheme = SCHEME.exec(value);
  if (!scheme) throw fail("it does not start with postgresql://");

  // A host never contains "@", so the last one ends the credentials, whatever
  // characters the password holds.
  const rest = value.slice(scheme[0].length);
  const at = rest.lastIndexOf("@");
  if (at === -1) throw fail("it has no USER:PASSWORD@ before the host");
  const credentials = rest.slice(0, at);
  const colon = credentials.indexOf(":");
  const userinfo =
    colon === -1
      ? encode(credentials)
      : `${encode(credentials.slice(0, colon))}:${encode(credentials.slice(colon + 1))}`;

  let url: URL;
  try {
    url = new URL(`postgresql://${userinfo}@${rest.slice(at + 1)}`);
  } catch {
    throw fail("the host, port or database part cannot be parsed");
  }
  if (!url.hostname) throw fail("it has no host");
  // `pgbouncer=true` is a Prisma-style flag; postgres.js would forward it to
  // the server as a startup parameter.
  url.searchParams.delete("pgbouncer");
  return url.toString();
}

/**
 * True when a (normalized) connection string points at the machine it runs
 * on. On Vercel that is the build or function sandbox, where no database ever
 * listens — a value copied from a local .env.
 */
export function pointsAtThisMachine(url: string): boolean {
  const host = new URL(url).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return host === "localhost" || host === "0.0.0.0" || host === "::1" || /^127\./.test(host);
}

/** Percent-encodes a user name or password, leaving an already-encoded one as it is. */
function encode(part: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(part));
  } catch {
    // A "%" that does not start an escape: the password is raw text.
    return encodeURIComponent(part);
  }
}
