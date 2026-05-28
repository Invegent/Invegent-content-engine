/**
 * cc-0020 Subscription Email Ingest — Gmail metadata-only fetch (Stage 5 Unit B).
 *
 * PRIVACY CONTRACT (V-B3): this module MUST fetch with `format=metadata` ONLY.
 *   • The request URL hardcodes `format=metadata`. The `format=full` value is
 *     NEVER constructed here. A static canary test in `static_canary_test.ts`
 *     fails the build if anyone re-introduces `format=full` in this module.
 *   • The Gmail API's `messages.get?format=metadata` response includes only
 *     filtered headers + the Gmail-synthesized `snippet` (~200 chars). The
 *     message body (`payload.body.data`, `payload.parts`) is NOT returned and
 *     is NOT read by this module.
 *   • `RawEmailInput.body_text` is always set to `null` on the wire from this
 *     fetch — no body crosses the network.
 *
 * SAFETY CONTRACT:
 *   • Default OFF: `SUBSCRIPTION_GMAIL_INGEST_ENABLED` must be exactly the
 *     string "true" for the live path to run. Anything else fails closed.
 *   • Required env: REFRESH_TOKEN, CLIENT_ID, CLIENT_SECRET, SENDER_ALLOWLIST.
 *     Missing any one → fail closed (`ok:false`, no Gmail call, no exception).
 *   • Bounded: `maxResults` ≤ 25, `newer_than:1d` time window. Allowlist
 *     enforced server-side in the Gmail query AND defence-in-depth
 *     client-side on the From-domain.
 *   • Auth: refresh-token → access-token exchange. Token NEVER logged, NEVER
 *     stringified, NEVER returned in the result. Errors echo HTTP status + a
 *     short generic descriptor only.
 *   • Read-only scope: this module never calls `messages.modify`,
 *     `messages.send`, `messages.delete` or any label-mutating endpoint.
 */

import { type RawEmailInput } from "./parser.ts";

export interface GmailFetchResult {
  ok: boolean;
  error?: string;
  messages: RawEmailInput[];
  meta?: {
    fetched_count: number;
    skipped_by_allowlist: number;
    skipped_by_parse: number;
    window_days: number;
  };
}

export interface GmailFetchOptions {
  /** Max messages to pull from messages.list. Hard-capped to MAX_RESULTS_CAP. */
  maxResults?: number;
  /** Time window in days for the `newer_than:Nd` Gmail query. Hard-capped. */
  windowDays?: number;
  /** Inject the global fetch (tests can stub). Defaults to Deno's fetch. */
  fetchFn?: typeof fetch;
}

const MAX_RESULTS_CAP = 25;
const MAX_WINDOW_DAYS = 7;

// Allow `fetch` to be a `Deno.env` reader at runtime; tests will inject. The
// indirection means the live path can be exercised in tests without invoking
// real `fetch` or reading real env.
type EnvReader = (name: string) => string | undefined;

function defaultEnvReader(name: string): string | undefined {
  try {
    return Deno.env.get(name);
  } catch {
    return undefined; // sandboxed / no --allow-env → fail closed
  }
}

/** True only if explicitly enabled by env. Default OFF; fail closed if env is unreadable. */
export function gmailFetchEnabled(env: EnvReader = defaultEnvReader): boolean {
  return env("SUBSCRIPTION_GMAIL_INGEST_ENABLED") === "true";
}

/** Parse the comma-separated SENDER_ALLOWLIST. Empty / missing → empty list. */
export function parseSenderAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(s));
}

/** Extract the From header's domain (lowercased), defence-in-depth for the allowlist. */
function fromDomain(from: string): string | null {
  const m = from.match(/@([A-Za-z0-9.-]+)/);
  return m ? m[1].toLowerCase().replace(/[>.\s]+$/, "") : null;
}

function inAllowlist(fromHeader: string, allowlist: string[]): boolean {
  const dom = fromDomain(fromHeader);
  if (!dom) return false;
  return allowlist.some((d) => dom === d || dom.endsWith("." + d));
}

interface GmailListResponse {
  messages?: Array<{ id: string }>;
}

interface GmailMetadataResponse {
  id: string;
  snippet?: string;
  internalDate?: string; // ms-epoch string
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
}

function getHeader(headers: Array<{ name: string; value: string }> | undefined, name: string): string | null {
  if (!headers) return null;
  const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return found?.value ?? null;
}

function buildSenderQuery(allowlist: string[]): string {
  // Gmail `from:` accepts a single domain at a time; OR-joined with parens.
  return allowlist.map((d) => `from:${d}`).join(" OR ");
}

/**
 * Live Gmail metadata-only fetch.
 *
 * Returns ok:true with up to `maxResults` `RawEmailInput` rows. Each row has:
 *   • `gmail_message_id`, `received_at`, `from`, `subject` populated.
 *   • `snippet` populated from Gmail-synthesized snippet (metadata).
 *   • `body_text` set to `null` — never fetched, never decoded.
 *
 * Returns ok:false on: flag OFF, missing env, refresh failure, list failure,
 * or any unexpected error. NEVER throws; NEVER logs the token; NEVER logs the
 * full row. The most a caller learns about an auth failure is an HTTP status
 * code.
 */
export async function fetchSubscriptionEmails(
  opts: GmailFetchOptions = {},
  envReader: EnvReader = defaultEnvReader,
): Promise<GmailFetchResult> {
  if (!gmailFetchEnabled(envReader)) {
    return {
      ok: false,
      error:
        "gmail_fetch_disabled: live Gmail ingestion is OFF (Stage 5 kill switch). Use manual/fixture mode.",
      messages: [],
    };
  }

  const clientId = envReader("SUBSCRIPTION_GMAIL_CLIENT_ID");
  const clientSecret = envReader("SUBSCRIPTION_GMAIL_CLIENT_SECRET");
  const refreshToken = envReader("SUBSCRIPTION_GMAIL_REFRESH_TOKEN");
  const allowlist = parseSenderAllowlist(envReader("SUBSCRIPTION_GMAIL_SENDER_ALLOWLIST"));

  // Privacy-by-fail-closed: missing any required env → no Gmail call.
  if (!clientId || !clientSecret || !refreshToken) {
    return {
      ok: false,
      error: "gmail_fetch_missing_env: required SUBSCRIPTION_GMAIL_* secrets not set",
      messages: [],
    };
  }
  if (allowlist.length === 0) {
    return {
      ok: false,
      error: "gmail_fetch_no_allowlist: SUBSCRIPTION_GMAIL_SENDER_ALLOWLIST is empty",
      messages: [],
    };
  }

  const fetchFn = opts.fetchFn ?? fetch;
  const maxResults = Math.min(opts.maxResults ?? MAX_RESULTS_CAP, MAX_RESULTS_CAP);
  const windowDays = Math.min(opts.windowDays ?? 1, MAX_WINDOW_DAYS);

  // --- Refresh access token (token NEVER logged, NEVER returned) ----------
  let accessToken: string;
  try {
    const tokenResp = await fetchFn("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });
    if (!tokenResp.ok) {
      return { ok: false, error: `gmail_token_refresh_failed: status ${tokenResp.status}`, messages: [] };
    }
    const tokenJson = await tokenResp.json() as { access_token?: string };
    if (!tokenJson.access_token) {
      return { ok: false, error: "gmail_token_refresh_failed: no access_token in response", messages: [] };
    }
    accessToken = tokenJson.access_token;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    // Generic-only; the body of the token response is never echoed.
    return { ok: false, error: `gmail_token_refresh_error: ${msg.slice(0, 80)}`, messages: [] };
  }

  // --- List candidate messages (sender allowlist + time window) -----------
  const q = `(${buildSenderQuery(allowlist)}) newer_than:${windowDays}d`;
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?` +
    new URLSearchParams({ q, maxResults: String(maxResults) }).toString();

  let ids: string[] = [];
  try {
    const listResp = await fetchFn(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!listResp.ok) {
      return { ok: false, error: `gmail_list_failed: status ${listResp.status}`, messages: [] };
    }
    const listJson = await listResp.json() as GmailListResponse;
    ids = (listJson.messages ?? []).map((m) => m.id).slice(0, maxResults);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return { ok: false, error: `gmail_list_error: ${msg.slice(0, 80)}`, messages: [] };
  }

  // --- Get each message in METADATA format ONLY (V-B3 contract) -----------
  const out: RawEmailInput[] = [];
  let fetched = 0;
  let skippedByAllowlist = 0;
  let skippedByParse = 0;
  for (const id of ids) {
    fetched++;
    // V-B3: format=metadata is the ONLY format value this module emits.
    const metaUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?` +
      new URLSearchParams({
        format: "metadata",
        metadataHeaders: "From,Subject,Date",
      }).toString();
    try {
      const msgResp = await fetchFn(metaUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!msgResp.ok) {
        skippedByParse++;
        continue;
      }
      const msg = await msgResp.json() as GmailMetadataResponse;
      const headers = msg.payload?.headers;
      const from = getHeader(headers, "From");
      const subject = getHeader(headers, "Subject") ?? "(no subject)";
      const dateHdr = getHeader(headers, "Date");

      if (!from || !inAllowlist(from, allowlist)) {
        // Defence-in-depth: even if Gmail returned something off-allowlist
        // (e.g. forwarded mail with rewritten headers), drop it locally.
        skippedByAllowlist++;
        continue;
      }

      let receivedAt: string;
      if (msg.internalDate) {
        receivedAt = new Date(parseInt(msg.internalDate, 10)).toISOString();
      } else if (dateHdr) {
        const d = new Date(dateHdr);
        receivedAt = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      } else {
        receivedAt = new Date().toISOString();
      }

      out.push({
        gmail_message_id: msg.id,
        received_at: receivedAt,
        from,
        subject,
        snippet: msg.snippet ?? null,
        body_text: null, // V-B3: body never read, never crossed the wire.
      });
    } catch {
      // Per-message resilience: skip on parse/network error rather than aborting the batch.
      skippedByParse++;
      continue;
    }
  }

  return {
    ok: true,
    messages: out,
    meta: {
      fetched_count: fetched,
      skipped_by_allowlist: skippedByAllowlist,
      skipped_by_parse: skippedByParse,
      window_days: windowDays,
    },
  };
}
