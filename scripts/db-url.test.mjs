/**
 * Offline tests for src/lib/db-url.ts: the connection-string check that
 * DATABASE_URL (blog reads, run at build time) and LEADS_DATABASE_URL go
 * through. A bad paste of DATABASE_URL in Vercel once failed the production
 * build with a bare "TypeError: Invalid URL".
 *
 *   node --test scripts/db-url.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeDatabaseUrl, pointsAtThisMachine } from "../src/lib/db-url.ts";

const PASSWORD = "s3cr3tValue";
const CLEAN = `postgresql://blog_reader.abcdefgh:${PASSWORD}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

/** What postgres.js reads out of the URL. */
function parts(url) {
  const u = new URL(url);
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: u.port,
    database: u.pathname.slice(1),
    search: u.search,
  };
}

test("a correct value passes through, minus the Prisma-only pgbouncer flag", () => {
  assert.equal(normalizeDatabaseUrl(CLEAN), CLEAN);
  assert.equal(normalizeDatabaseUrl(`${CLEAN}?pgbouncer=true`), CLEAN);
  assert.equal(normalizeDatabaseUrl(`${CLEAN}?pgbouncer=true&sslmode=require`), `${CLEAN}?sslmode=require`);
  assert.equal(normalizeDatabaseUrl(CLEAN.replace("postgresql:", "postgres:")), CLEAN);
});

test("paste slips from .env.example are undone", () => {
  for (const pasted of [
    `"${CLEAN}?pgbouncer=true"`,
    `'${CLEAN}'`,
    `  ${CLEAN}\n`,
    `DATABASE_URL=${CLEAN}`,
    `DATABASE_URL="${CLEAN}?pgbouncer=true"`,
  ]) {
    assert.equal(normalizeDatabaseUrl(pasted), CLEAN, JSON.stringify(pasted));
  }
  assert.equal(normalizeDatabaseUrl(`LEADS_DATABASE_URL="${CLEAN}"`, "LEADS_DATABASE_URL"), CLEAN);
});

test("a password with URL-reserved characters reaches the driver intact", () => {
  for (const password of ["pa/ss", "pa?ss", "pa#ss", "p@ss", "100%sure", "with space", "a:b", "x/y?z#w@v%"]) {
    const raw = `postgresql://blog_reader.abcdefgh:${password}@db.example.co:6543/postgres`;
    const got = parts(normalizeDatabaseUrl(raw));
    assert.deepEqual(
      got,
      { user: "blog_reader.abcdefgh", password, host: "db.example.co", port: "6543", database: "postgres", search: "" },
      password,
    );
  }
});

test("an already percent-encoded password is not encoded twice", () => {
  const encoded = `postgresql://blog_reader.abcdefgh:pa%2Fss%40x@db.example.co:6543/postgres`;
  assert.equal(normalizeDatabaseUrl(encoded), encoded);
  assert.equal(parts(normalizeDatabaseUrl(encoded)).password, "pa/ss@x");
});

test("values it cannot repair fail with a reason, never echoing the value", () => {
  const cases = [
    ["", /is empty/],
    ['""', /is empty/],
    [`postgresql://blog_reader.<project-ref>:${PASSWORD}@aws-0-<region>.pooler.supabase.com:6543/postgres`, /placeholder/],
    [`postgresql://blog_reader.abcdefgh:<password>@db.example.co:6543/postgres`, /placeholder/],
    [`https://blog_reader:${PASSWORD}@db.example.co/postgres`, /does not start with postgresql:\/\//],
    [`db.example.co:6543/${PASSWORD}`, /does not start with postgresql:\/\//],
    [`postgresql://db.example.co:6543/${PASSWORD}`, /no USER:PASSWORD@/],
    [`postgresql://blog_reader:${PASSWORD}@db.example.co:port/postgres`, /host, port or database/],
  ];
  for (const [value, reason] of cases) {
    assert.throws(
      () => normalizeDatabaseUrl(value, "DATABASE_URL"),
      (err) => {
        assert.match(err.message, /^DATABASE_URL is not a usable connection string: /);
        assert.match(err.message, reason);
        assert.ok(!err.message.includes(PASSWORD), `message leaks the value: ${err.message}`);
        return true;
      },
      JSON.stringify(value),
    );
  }
});

test("a local database address is recognised (Vercel can never reach it)", () => {
  for (const host of ["127.0.0.1:5433", "localhost:5432", "LOCALHOST", "127.1.2.3:5432", "[::1]:5432", "0.0.0.0:5432"]) {
    const url = normalizeDatabaseUrl(`postgresql://rakazo:secret@${host}/rakazo_app`);
    assert.equal(pointsAtThisMachine(url), true, host);
  }
  for (const host of ["aws-0-ap-south-1.pooler.supabase.com:6543", "db.example.co", "10.0.0.5:5432", "localhost.example.com"]) {
    const url = normalizeDatabaseUrl(`postgresql://blog_reader.ref:secret@${host}/postgres`);
    assert.equal(pointsAtThisMachine(url), false, host);
  }
});
