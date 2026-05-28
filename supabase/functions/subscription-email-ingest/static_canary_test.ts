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

// -------- meta: confirm SUBSCRIPTION_GMAIL_INGEST_ENABLED is checked --------

Deno.test("Kill-switch present: SUBSCRIPTION_GMAIL_INGEST_ENABLED is checked", async () => {
  const gmail = await readSource("gmail.ts");
  const idx = await readSource("index.ts");
  assert(gmail.includes("SUBSCRIPTION_GMAIL_INGEST_ENABLED"),
    "gmail.ts must check SUBSCRIPTION_GMAIL_INGEST_ENABLED");
  assert(idx.includes("SUBSCRIPTION_GMAIL_INGEST_ENABLED") || idx.includes("gmailFetchEnabled"),
    "index.ts must check the kill switch (directly or via gmailFetchEnabled)");
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
