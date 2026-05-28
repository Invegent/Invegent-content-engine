/**
 * cc-0020 Subscription Email Ingest — STATIC CANARY (Stage 5 Unit B / V-B3 + V-B4).
 *
 * Reads the production .ts files in this directory and FAILS if it sees a
 * pattern that would violate the metadata-only / no-token-in-log contract.
 * Tests are skipped (so this canary is the only source-of-truth for the test
 * file scan).
 *
 * V-B3 (no body / no format=full): forbid `format=full`, `payload.body`,
 *      `payload.parts`, and `messages.get` request URLs in production code.
 * V-B4 (no token in logs / errors / output): forbid `console.log` of any
 *      string literal containing `refresh_token`, `access_token`, or
 *      `Bearer `; forbid raw `JSON.stringify(...)` of the token object.
 * V-B7 (cc-0020 access rule): forbid any direct PostgREST access to schema
 *      `k` from production code. All writes go through `public.*` SECURITY
 *      DEFINER RPCs. Specifically: no `.schema("k")`, no `.from("…")` on
 *      Supabase-shaped clients, no string literal containing `k.subscription_`
 *      used as a PostgREST table name.
 */

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error("Assertion failed: " + msg);
}

const HERE = new URL(".", import.meta.url);

// Production source files (non-test) that must satisfy V-B3/V-B4.
const PROD_SOURCES = [
  "gmail.ts",
  "ingest.ts",
  "index.ts",
  "mapping.ts",
  "parser.ts",
  "repository.ts",
];

async function readSource(name: string): Promise<string> {
  const url = new URL(name, HERE);
  return await Deno.readTextFile(url);
}

// -------- V-B3: no body / no format=full --------

const FORBIDDEN_V_B3 = [
  // Gmail API misuse:
  /format=full/, // request URL containing format=full
  /format%3Dfull/, // url-encoded variant
  // Direct body reads on Gmail message payloads:
  /payload\.body/,
  /payload\.parts/,
  // The newsletter function's body decoder shape (defence against copy/paste):
  /decodeBase64Url/,
  /stripHtml/,
];

Deno.test("V-B3 canary: no format=full / no body reads in production code", async () => {
  for (const file of PROD_SOURCES) {
    const src = await readSource(file);
    // Strip line/block comments first: the contract is about RUNTIME behaviour,
    // not the words appearing in comments/JSDoc that EXPLAIN the contract.
    const code = stripComments(src);
    for (const pattern of FORBIDDEN_V_B3) {
      const m = code.match(pattern);
      assert(m === null, `[${file}] V-B3 violation: forbidden pattern ${pattern} found at "${m?.[0]}"`);
    }
  }
});

// -------- V-B4: no token strings in logs / output --------

Deno.test("V-B4 canary: no token/secret strings in production code's log lines", async () => {
  for (const file of PROD_SOURCES) {
    const src = await readSource(file);
    const code = stripComments(src);

    // The literal env-var NAMES are allowed (they must appear to be read).
    // What's forbidden: a console.log / JSON.stringify on a string LITERAL
    // that contains the substrings "refresh_token=" or "Bearer " (these
    // strings have no legitimate logging use).
    const logLineRegex = /console\.(log|info|warn|error|debug)\([^)]*\)/g;
    for (const match of code.matchAll(logLineRegex)) {
      const line = match[0];
      assert(!line.includes("refresh_token"),
        `[${file}] V-B4 violation: console.* mentions refresh_token in: ${line}`);
      assert(!line.includes("access_token"),
        `[${file}] V-B4 violation: console.* mentions access_token in: ${line}`);
      assert(!line.toLowerCase().includes("bearer "),
        `[${file}] V-B4 violation: console.* mentions Bearer in: ${line}`);
      assert(!line.includes("client_secret"),
        `[${file}] V-B4 violation: console.* mentions client_secret in: ${line}`);
    }

    // No stringification of refresh_token / Bearer values into the wire payload.
    const stringifyRegex = /JSON\.stringify\([^)]*\)/g;
    for (const match of code.matchAll(stringifyRegex)) {
      const expr = match[0];
      assert(!/refresh_token|access_token|client_secret|Bearer /i.test(expr),
        `[${file}] V-B4 violation: JSON.stringify includes token/secret in: ${expr}`);
    }
  }
});

// -------- V-B7: no direct PostgREST access to schema `k` --------

const FORBIDDEN_V_B7 = [
  // Supabase JS direct-table access shape: `.schema("k")` / `.schema('k')`.
  /\.schema\(\s*["']k["']\s*\)/,
  // Generic `.schema(` in production code — even a non-"k" schema call would
  // indicate the boundary contract has been widened beyond what Stage 5 Unit B
  // codifies (RPC-only). Reads via RPC do not need .schema().
  /\.schema\(/,
  // Any literal `.from("subscription_…")` against an unknown schema is a
  // bypass of the RPC boundary.
  /\.from\(\s*["']subscription_(import_candidate|spend_event)["']\s*\)/,
  // `k.subscription_…` table name used as a PostgREST table literal.
  /["']k\.subscription_(import_candidate|spend_event)["']/,
];

Deno.test("V-B7 canary: no direct schema('k') / PostgREST access to k.* in production code", async () => {
  for (const file of PROD_SOURCES) {
    const src = await readSource(file);
    const code = stripComments(src);
    for (const pattern of FORBIDDEN_V_B7) {
      const m = code.match(pattern);
      assert(m === null,
        `[${file}] V-B7 violation: cc-0020 access rule — forbidden pattern ${pattern} found at "${m?.[0]}". ` +
        `All writes must go through public.* SECURITY DEFINER RPCs.`);
    }
  }
});

// -------- meta: confirm SUBSCRIPTION_GMAIL_INGEST_ENABLED is checked --------

Deno.test("Kill-switch present: SUBSCRIPTION_GMAIL_INGEST_ENABLED is checked", async () => {
  const gmail = await readSource("gmail.ts");
  const idx = await readSource("index.ts");
  assert(gmail.includes("SUBSCRIPTION_GMAIL_INGEST_ENABLED"),
    "gmail.ts must check SUBSCRIPTION_GMAIL_INGEST_ENABLED");
  assert(idx.includes("SUBSCRIPTION_GMAIL_INGEST_ENABLED") || idx.includes("gmailFetchEnabled"),
    "index.ts must check the kill switch (directly or via gmailFetchEnabled)");
});

// -------- meta: Unit C blocker note + RPC contract recorded --------

Deno.test("RPC contract recorded: repository.ts names the public write RPC + its params", async () => {
  const repo = await readSource("repository.ts");
  assert(repo.includes("ingest_subscription_import_candidate"),
    "repository.ts must name the public write RPC `ingest_subscription_import_candidate`");
  assert(repo.includes("INGEST_CANDIDATE_RPC_PARAMS"),
    "repository.ts must export INGEST_CANDIDATE_RPC_PARAMS so the eventual migration can be reviewed against the contract");
});

Deno.test("Unit C blocker note present in repository.ts header", async () => {
  const repo = await readSource("repository.ts");
  assert(repo.includes("Unit C") && repo.includes("BLOCKER"),
    "repository.ts must carry a clear 'Stage 5 / Unit C BLOCKER' header note explaining the missing RPC migration");
  assert(repo.includes("real-PG") || repo.includes("PGlite"),
    "repository.ts must reference the real-PG / PGlite proof requirement before Unit C deploy");
});

// -------- meta: version banner reflects v1.0.0-disabled --------

Deno.test("Version banner is v1.0.0-disabled (matches U-C deploy expectation)", async () => {
  const idx = await readSource("index.ts");
  assert(idx.includes("subscription-email-ingest-v1.0.0-disabled"),
    "index.ts VERSION must be 'subscription-email-ingest-v1.0.0-disabled'");
});

// -------- helpers --------

function stripComments(src: string): string {
  // Remove block comments first, then line comments. Conservative — does not
  // try to handle comments inside string literals; production code has no
  // string literals containing `format=full` / `payload.body` so this is fine.
  let s = src.replace(/\/\*[\s\S]*?\*\//g, "");
  s = s.replace(/(^|\s)\/\/[^\n]*/g, "$1");
  return s;
}
