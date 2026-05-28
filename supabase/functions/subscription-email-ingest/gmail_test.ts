/**
 * cc-0020 Subscription Email Ingest — Gmail metadata-only fetch tests
 * (Stage 5 Unit B). Hermetic: no real network, no real env reads. Stubs the
 * `fetch` function and the env reader so the live path is exercised without
 * touching Gmail.
 */

import {
  fetchSubscriptionEmails,
  gmailFetchEnabled,
  parseSenderAllowlist,
} from "./gmail.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error("Assertion failed: " + msg);
}
function assertEquals(actual: unknown, expected: unknown, msg = ""): void {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`assertEquals failed${msg ? ` (${msg})` : ""}: ${a} !== ${e}`);
}

// --- env-reader stubs ------------------------------------------------------

type EnvMap = Record<string, string | undefined>;
const envFrom = (m: EnvMap) => (name: string): string | undefined => m[name];

const FULL_ENV: EnvMap = {
  SUBSCRIPTION_GMAIL_INGEST_ENABLED: "true",
  SUBSCRIPTION_GMAIL_CLIENT_ID: "test-client-id",
  SUBSCRIPTION_GMAIL_CLIENT_SECRET: "test-client-secret",
  SUBSCRIPTION_GMAIL_REFRESH_TOKEN: "test-refresh-token",
  SUBSCRIPTION_GMAIL_SENDER_ALLOWLIST: "acmesaas.example,designhub.example",
};

// --- fetch stub ------------------------------------------------------------

interface StubRoute {
  match: (url: string, init?: RequestInit) => boolean;
  reply: () => Promise<Response>;
}

function stubFetch(routes: StubRoute[]): { fetch: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  const fakeFetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push(url);
    for (const r of routes) {
      if (r.match(url, init)) return r.reply();
    }
    return Promise.resolve(new Response("not-stubbed", { status: 404 }));
  };
  return { fetch: fakeFetch as typeof fetch, calls };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// --- flag / env / allowlist guard tests -----------------------------------

Deno.test("gmailFetchEnabled: default OFF", () => {
  assertEquals(gmailFetchEnabled(() => undefined), false, "undefined env → off");
  assertEquals(gmailFetchEnabled(() => "false"), false, "'false' string → off");
  assertEquals(gmailFetchEnabled(() => "1"), false, "'1' is not 'true' → off");
  assertEquals(gmailFetchEnabled(() => "true"), true, "'true' → on");
});

Deno.test("parseSenderAllowlist: filters bad entries", () => {
  assertEquals(parseSenderAllowlist(undefined), []);
  assertEquals(parseSenderAllowlist(""), []);
  assertEquals(parseSenderAllowlist("acme.example, foo.bar.example"), ["acme.example", "foo.bar.example"]);
  assertEquals(parseSenderAllowlist("not_a_domain, valid.example"), ["valid.example"], "drops invalid");
});

Deno.test("fetch: flag OFF → fail-closed, no fetch calls", async () => {
  const { fetch, calls } = stubFetch([]);
  const env = envFrom({ ...FULL_ENV, SUBSCRIPTION_GMAIL_INGEST_ENABLED: undefined });
  const r = await fetchSubscriptionEmails({ fetchFn: fetch }, env);
  assertEquals(r.ok, false, "ok=false");
  assert((r.error ?? "").includes("disabled"), "error mentions disabled");
  assertEquals(calls.length, 0, "no fetch calls were made");
});

Deno.test("fetch: missing client_id → fail-closed, no fetch calls", async () => {
  const { fetch, calls } = stubFetch([]);
  const env = envFrom({ ...FULL_ENV, SUBSCRIPTION_GMAIL_CLIENT_ID: undefined });
  const r = await fetchSubscriptionEmails({ fetchFn: fetch }, env);
  assertEquals(r.ok, false, "ok=false");
  assert((r.error ?? "").includes("missing_env"), "error mentions missing env");
  assertEquals(calls.length, 0, "no fetch calls");
});

Deno.test("fetch: empty allowlist → fail-closed, no fetch calls", async () => {
  const { fetch, calls } = stubFetch([]);
  const env = envFrom({ ...FULL_ENV, SUBSCRIPTION_GMAIL_SENDER_ALLOWLIST: undefined });
  const r = await fetchSubscriptionEmails({ fetchFn: fetch }, env);
  assertEquals(r.ok, false, "ok=false");
  assert((r.error ?? "").includes("no_allowlist"), "error mentions no_allowlist");
  assertEquals(calls.length, 0, "no fetch calls");
});

// --- happy path with stubbed Gmail responses ------------------------------

Deno.test("fetch: stubbed happy path → returns metadata-only RawEmailInput", async () => {
  const { fetch, calls } = stubFetch([
    {
      match: (u) => u.startsWith("https://oauth2.googleapis.com/token"),
      reply: () => Promise.resolve(jsonResponse({ access_token: "TEST_BEARER_OPAQUE" })),
    },
    {
      match: (u) => u.startsWith("https://gmail.googleapis.com/gmail/v1/users/me/messages?"),
      reply: () => Promise.resolve(jsonResponse({ messages: [{ id: "m1" }, { id: "m2" }] })),
    },
    {
      match: (u) => u.includes("/messages/m1?") && u.includes("format=metadata"),
      reply: () => Promise.resolve(jsonResponse({
        id: "m1",
        snippet: "Thanks for your payment",
        internalDate: String(Date.UTC(2026, 4, 3, 8, 0, 0)), // 2026-05-03
        payload: { headers: [
          { name: "From", value: "Acme <billing@acmesaas.example>" },
          { name: "Subject", value: "Receipt — Acme SaaS" },
          { name: "Date", value: "Sat, 03 May 2026 08:00:00 +0000" },
        ] },
      })),
    },
    {
      match: (u) => u.includes("/messages/m2?") && u.includes("format=metadata"),
      reply: () => Promise.resolve(jsonResponse({
        id: "m2",
        snippet: "Your invoice is ready",
        internalDate: String(Date.UTC(2026, 4, 4, 9, 0, 0)),
        payload: { headers: [
          { name: "From", value: "DesignHub <invoices@designhub.example>" },
          { name: "Subject", value: "Invoice #42" },
          { name: "Date", value: "Sun, 04 May 2026 09:00:00 +0000" },
        ] },
      })),
    },
  ]);

  const r = await fetchSubscriptionEmails({ fetchFn: fetch }, envFrom(FULL_ENV));
  assertEquals(r.ok, true, "ok=true");
  assertEquals(r.messages.length, 2, "2 rows");

  // V-B3 contract: every metadata call URL contains format=metadata; no format=full anywhere.
  const fullHits = calls.filter((u) => u.includes("format=full"));
  assertEquals(fullHits.length, 0, "no format=full calls");
  const metadataGets = calls.filter((u) => u.includes("/messages/") && u.includes("format=metadata"));
  assertEquals(metadataGets.length, 2, "2 metadata gets");

  // Rows have null body_text — body never crossed the wire.
  for (const row of r.messages) {
    assertEquals(row.body_text, null, "body_text is null");
    assert(row.snippet !== null && row.snippet !== undefined, "snippet present");
    assert(row.from.includes("@"), "from header present");
  }
});

// --- defence-in-depth allowlist enforcement -------------------------------

Deno.test("fetch: post-fetch allowlist drop for off-list From header", async () => {
  const { fetch } = stubFetch([
    {
      match: (u) => u.startsWith("https://oauth2.googleapis.com/token"),
      reply: () => Promise.resolve(jsonResponse({ access_token: "TEST_BEARER_OPAQUE" })),
    },
    {
      match: (u) => u.startsWith("https://gmail.googleapis.com/gmail/v1/users/me/messages?"),
      reply: () => Promise.resolve(jsonResponse({ messages: [{ id: "evil" }] })),
    },
    {
      match: (u) => u.includes("/messages/evil?"),
      reply: () => Promise.resolve(jsonResponse({
        id: "evil",
        snippet: "Forwarded",
        internalDate: String(Date.UTC(2026, 4, 3, 8, 0, 0)),
        payload: { headers: [
          { name: "From", value: "Phisher <attack@evil.example>" }, // not in allowlist
          { name: "Subject", value: "Payment receipt" },
        ] },
      })),
    },
  ]);

  const r = await fetchSubscriptionEmails({ fetchFn: fetch }, envFrom(FULL_ENV));
  assertEquals(r.ok, true, "ok=true");
  assertEquals(r.messages.length, 0, "off-list row dropped");
  assertEquals(r.meta?.skipped_by_allowlist, 1, "counted as skipped");
});

// --- token-refresh failure → fail-closed; no token in response -------------

Deno.test("fetch: token refresh failure → fail-closed, NO token in response payload", async () => {
  const { fetch } = stubFetch([
    {
      match: (u) => u.startsWith("https://oauth2.googleapis.com/token"),
      reply: () => Promise.resolve(new Response("token rejected", { status: 401 })),
    },
  ]);

  const r = await fetchSubscriptionEmails({ fetchFn: fetch }, envFrom(FULL_ENV));
  assertEquals(r.ok, false, "ok=false");
  assert((r.error ?? "").includes("token_refresh_failed"), "error mentions token_refresh_failed");

  // V-B4 contract: the result MUST NOT echo the refresh_token, client_secret,
  // or any "Bearer …" string anywhere in the JSON output.
  const json = JSON.stringify(r);
  assert(!json.includes("test-refresh-token"), "no refresh token in result");
  assert(!json.includes("test-client-secret"), "no client secret in result");
  assert(!json.includes("Bearer "), "no Bearer in result");
});

// --- maxResults / windowDays caps -----------------------------------------

Deno.test("fetch: caps maxResults at 25 and windowDays at 7", async () => {
  let listUrl = "";
  const { fetch } = stubFetch([
    {
      match: (u) => u.startsWith("https://oauth2.googleapis.com/token"),
      reply: () => Promise.resolve(jsonResponse({ access_token: "TEST_BEARER_OPAQUE" })),
    },
    {
      match: (u) => u.startsWith("https://gmail.googleapis.com/gmail/v1/users/me/messages?"),
      reply: () => Promise.resolve(jsonResponse({ messages: [] })),
    },
  ]);

  // Capture the list URL by re-stubbing with a sniffer.
  const sniffer: typeof fetch = (input, init) => {
    const u = typeof input === "string" ? input : input.toString();
    if (u.startsWith("https://gmail.googleapis.com/gmail/v1/users/me/messages?")) {
      listUrl = u;
    }
    return fetch(input as RequestInfo, init as RequestInit | undefined);
  };

  await fetchSubscriptionEmails(
    { fetchFn: sniffer, maxResults: 9999, windowDays: 30 },
    envFrom(FULL_ENV),
  );
  assert(listUrl.includes("maxResults=25"), `maxResults capped at 25 (was: ${listUrl})`);
  assert(listUrl.includes("newer_than%3A7d") || listUrl.includes("newer_than:7d"),
    `windowDays capped at 7 (was: ${listUrl})`);
});
