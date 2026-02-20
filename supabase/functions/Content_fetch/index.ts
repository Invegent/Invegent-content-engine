// content_fetch.ts — v2.3 (freshness-first + resolution_status closed loop)
// - Only processes canonicals seen in last N hours (default 168 = 7 days)
// - resolution_status is the truth: active | success | give_up_*
// - fetch_status is last attempt outcome: pending/success/blocked/paywalled/timeout/error/etc.
// - “pending” is ONLY a short TTL lock; everything else must resolve to a non-pending outcome.

import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-ingest-key, apikey, authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const VERSION = "content-fetch-v2.3-jina-freshness-resolution";

// --- Config knobs ---
const MAX_LIMIT = 50;
const MIN_TEXT_LEN = 500;

// Freshness policy (content engine)
const DEFAULT_SINCE_HOURS = 168; // 7 days

// Lock / retention
const PENDING_LOCK_HOURS = 1;
const SUCCESS_RETENTION_DAYS = 7;

// Retry policy
const MAX_ATTEMPTS_DEFAULT = 3;
const COOLDOWN_HOURS_ERROR = 6;       // timeout/error/too_short
const COOLDOWN_DAYS_BLOCKED = 30;     // blocked/captcha
const COOLDOWN_DAYS_PAYWALLED = 365;  // paywall is “give up”
const COOLDOWN_DAYS_GIVEUP = 3650;    // long-term “done” states

// Resolution status truth table
const RES_ACTIVE = "active";
const RES_SUCCESS = "success";
const RES_GIVEUP_BLOCKED = "give_up_blocked";
const RES_GIVEUP_PAYWALLED = "give_up_paywalled";
const RES_GIVEUP_ERROR = "give_up_error";
const RES_GIVEUP_STALE = "give_up_stale";

const TERMINAL_RESOLUTIONS = new Set<string>([
  RES_SUCCESS,
  RES_GIVEUP_BLOCKED,
  RES_GIVEUP_PAYWALLED,
  RES_GIVEUP_ERROR,
  RES_GIVEUP_STALE,
]);

// Simple paywall domain policy (optional)
const PAYWALL_DOMAINS = new Set<string>([
  "theaustralian.com.au",
  "afr.com",
  "afr.com.au",
]);

function getSupabaseServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in secrets");
  return createClient(url, key, { db: { schema: "f" } });
}

app.options("*", () => new Response(null, { status: 204, headers: corsHeaders }));

// Security gate
app.use("*", async (c, next) => {
  const expected = Deno.env.get("INGEST_API_KEY");
  const provided = c.req.header("x-ingest-key");

  if (!expected) return c.json({ ok: false, error: "INGEST_API_KEY is not set", path_seen: c.req.path }, 500, corsHeaders);
  if (!provided || provided !== expected) return c.json({ ok: false, error: "Unauthorized", path_seen: c.req.path }, 401, corsHeaders);

  await next();
});

function domainFromUrl(url: string): string | null {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h.startsWith("www.") ? h.slice(4) : h;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; InvegentFetcher/1.0)",
        "Accept": "text/plain, text/html;q=0.9, */*;q=0.8",
      },
    });
    return resp;
  } finally {
    clearTimeout(t);
  }
}

function isoNow() {
  return new Date().toISOString();
}
function isoInHours(h: number) {
  return new Date(Date.now() + h * 3600 * 1000).toISOString();
}
function isoInDays(d: number) {
  return new Date(Date.now() + d * 24 * 3600 * 1000).toISOString();
}
function isExpired(expires_at: string | null | undefined): boolean {
  if (!expires_at) return true;
  const t = Date.parse(expires_at);
  if (!Number.isFinite(t)) return true;
  return t <= Date.now();
}

function detectBlockedOrPaywalled(cleaned: string) {
  const lc = cleaned.toLowerCase();

  const isBlocked =
    lc.includes("just a moment") ||
    lc.includes("captcha") ||
    lc.includes("cloudflare") ||
    lc.includes("access denied") ||
    lc.includes("forbidden") ||
    lc.includes("restricted access");

  const isPaywalled =
    lc.includes("subscribe") ||
    lc.includes("subscription") ||
    lc.includes("sign in") ||
    lc.includes("log in") ||
    lc.includes("premium") ||
    lc.includes("paywall");

  return { isBlocked, isPaywalled };
}

// Upsert helper that surfaces DB write problems
async function upsertBody(supabase: any, row: any) {
  const { data, error } = await supabase
    .from("canonical_content_body")
    .upsert(row, { onConflict: "canonical_id" })
    .select("canonical_id, fetch_status, resolution_status, fetched_at, fetch_attempts, expires_at")
    .maybeSingle();

  if (error) return { ok: false, error: error.message, data: null };
  return { ok: true, error: null, data };
}

app.get("/content_fetch/health", async (c) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("canonical_content_item")
    .select("canonical_id")
    .limit(1);

  return c.json(
    {
      ok: true,
      function: "content_fetch",
      version: VERSION,
      path_seen: c.req.path,
      can_read_canonical: !error,
      sample: data?.[0] ?? null,
      error: error ?? null,
    },
    200,
    corsHeaders
  );
});

app.get("/content_fetch", (c) =>
  c.json(
    {
      ok: true,
      function: "content_fetch",
      version: VERSION,
      path_seen: c.req.path,
      routes: ["/content_fetch/health", "/content_fetch/run"],
    },
    200,
    corsHeaders
  )
);

// POST /content_fetch/run?limit=30&since_hours=168&write=true&max_attempts=3
app.post("/content_fetch/run", async (c) => {
  const supabase = getSupabaseServiceClient();

  const limit = Number(c.req.query("limit") ?? "10");
  const since_hours = Number(c.req.query("since_hours") ?? String(DEFAULT_SINCE_HOURS));
  const write = (c.req.query("write") ?? "false").toLowerCase() === "true";
  const max_attempts = Number(c.req.query("max_attempts") ?? String(MAX_ATTEMPTS_DEFAULT));

  if (!Number.isFinite(limit) || limit < 1 || limit > MAX_LIMIT) {
    return c.json({ ok: false, error: `limit must be 1..${MAX_LIMIT}`, path_seen: c.req.path }, 400, corsHeaders);
  }
  if (!Number.isFinite(since_hours) || since_hours < 1 || since_hours > 720) {
    return c.json({ ok: false, error: "since_hours must be 1..720", path_seen: c.req.path }, 400, corsHeaders);
  }
  if (!Number.isFinite(max_attempts) || max_attempts < 1 || max_attempts > 10) {
    return c.json({ ok: false, error: "max_attempts must be 1..10", path_seen: c.req.path }, 400, corsHeaders);
  }

  const sinceIso = new Date(Date.now() - since_hours * 3600 * 1000).toISOString();

  // 1) Load fresh canonicals only (freshness-first)
  const { data: canon, error: canonErr } = await supabase
    .from("canonical_content_item")
    .select("canonical_id, canonical_url, canonical_title, last_seen_at")
    .gte("last_seen_at", sinceIso)
    .order("last_seen_at", { ascending: false })
    .limit(2000);

  if (canonErr) {
    return c.json({ ok: false, step: "load_canonicals", error: canonErr, path_seen: c.req.path }, 500, corsHeaders);
  }

  const canonList = canon ?? [];
  const canonIds = canonList.map((x: any) => x.canonical_id);

  // 2) Load existing body rows (include resolution_status)
  const existingMap = new Map<string, any>();
  if (canonIds.length > 0) {
    const { data: bodies, error: bodyErr } = await supabase
      .from("canonical_content_body")
      .select("canonical_id, fetch_status, resolution_status, fetched_at, expires_at, fetch_attempts")
      .in("canonical_id", canonIds);

    if (bodyErr) {
      return c.json({ ok: false, step: "load_existing_bodies", error: bodyErr, path_seen: c.req.path }, 500, corsHeaders);
    }
    (bodies ?? []).forEach((b: any) => existingMap.set(b.canonical_id, b));
  }

  // 3) Backlog-driven candidates (fresh + active + expired lock/cooldown + attempts remaining)
  const candidates = canonList.filter((x: any) => {
    const existing = existingMap.get(x.canonical_id);
    if (!existing) return true;

    const res = String(existing.resolution_status ?? RES_ACTIVE);
    if (TERMINAL_RESOLUTIONS.has(res)) return false;

    const attempts = Number(existing.fetch_attempts ?? 0);
    if (attempts >= max_attempts) return false;

    // Only retry if TTL expired (pending lock or cooldown)
    return isExpired(existing.expires_at);
  });

  const toProcess = candidates.slice(0, limit).map((x: any) => ({
    canonical_id: x.canonical_id,
    url: x.canonical_url,
    title: x.canonical_title,
    last_seen_at: x.last_seen_at,
    existing: existingMap.get(x.canonical_id) ?? null,
  }));

  // Dry run
  if (!write) {
    return c.json(
      {
        ok: true,
        version: VERSION,
        path_seen: c.req.path,
        dry_run: true,
        limit,
        since_hours,
        max_attempts,
        canonicals_loaded: canonList.length,
        candidates_total: candidates.length,
        will_process: toProcess.length,
        sample: toProcess.slice(0, 5).map((x: any) => ({
          canonical_id: x.canonical_id,
          url: x.url,
          last_seen_at: x.last_seen_at,
          existing_status: x.existing?.fetch_status ?? null,
          existing_resolution: x.existing?.resolution_status ?? null,
          existing_attempts: x.existing?.fetch_attempts ?? 0,
          existing_expires_at: x.existing?.expires_at ?? null,
        })),
      },
      200,
      corsHeaders
    );
  }

  // 4) Process
  const results: any[] = [];
  let success = 0, paywalled = 0, blocked = 0, failed = 0, giveups = 0;
  let write_failures = 0;

  for (const item of toProcess) {
    const url = String(item.url ?? "").trim();
    const domain = domainFromUrl(url);

    const prevAttempts = Number(item.existing?.fetch_attempts ?? 0);
    const nextAttempts = prevAttempts + 1;

    // Claim as pending (short TTL lock)
    const claimRes = await upsertBody(supabase, {
      canonical_id: item.canonical_id,
      resolution_status: RES_ACTIVE,
      fetch_status: "pending",
      fetch_method: "jina",
      fetched_at: isoNow(),
      final_url: url || null,
      fetch_attempts: nextAttempts,
      expires_at: isoInHours(PENDING_LOCK_HOURS),
      error_message: null,
    });

    if (!claimRes.ok) {
      write_failures += 1;
      results.push({ canonical_id: item.canonical_id, ok: false, status: "db_write_failed", stage: "claim_pending", error: claimRes.error });
      continue;
    }

    // Missing URL -> give up as error (not useful for a news engine)
    if (!url) {
      failed += 1;
      giveups += 1;

      const writeRes = await upsertBody(supabase, {
        canonical_id: item.canonical_id,
        resolution_status: RES_GIVEUP_ERROR,
        fetch_status: "error",
        fetch_method: "policy",
        fetched_at: isoNow(),
        final_url: null,
        error_message: "missing_url",
        fetch_attempts: nextAttempts,
        expires_at: isoInDays(COOLDOWN_DAYS_GIVEUP),
      });

      if (!writeRes.ok) write_failures += 1;
      results.push({ canonical_id: item.canonical_id, ok: writeRes.ok, status: "give_up_error", error: "missing_url", attempts: nextAttempts, upsert_error: writeRes.error });
      continue;
    }

    // Paywall domain policy -> give up immediately
    if (domain && PAYWALL_DOMAINS.has(domain)) {
      paywalled += 1;
      giveups += 1;

      const writeRes = await upsertBody(supabase, {
        canonical_id: item.canonical_id,
        resolution_status: RES_GIVEUP_PAYWALLED,
        fetch_status: "paywalled",
        fetch_method: "policy",
        fetched_at: isoNow(),
        http_status: null,
        final_url: url,
        content_type: null,
        error_message: `Paywall domain policy: ${domain}`,
        fetch_attempts: nextAttempts,
        expires_at: isoInDays(COOLDOWN_DAYS_PAYWALLED),
      });

      if (!writeRes.ok) write_failures += 1;
      results.push({ canonical_id: item.canonical_id, ok: writeRes.ok, status: "give_up_paywalled", domain, attempts: nextAttempts, upsert_error: writeRes.error });
      continue;
    }

    const readerUrl = "https://r.jina.ai/" + encodeURI(url);

    try {
      const resp = await fetchWithTimeout(readerUrl, 12000);

      const http_status = resp.status;
      const content_type = resp.headers.get("content-type") ?? null;

      // HTTP-level “blocked” -> give up (realistic for a 7-day news engine)
      if (!resp.ok) {
        const isBlockedHttp = [401, 403, 429, 451].includes(http_status);

        if (isBlockedHttp) {
          blocked += 1;
          giveups += 1;

          const writeRes = await upsertBody(supabase, {
            canonical_id: item.canonical_id,
            resolution_status: RES_GIVEUP_BLOCKED,
            fetch_status: "blocked",
            fetch_method: "jina",
            fetched_at: isoNow(),
            http_status,
            final_url: url,
            content_type,
            error_message: `Reader fetch blocked: ${http_status}`,
            fetch_attempts: nextAttempts,
            expires_at: isoInDays(COOLDOWN_DAYS_BLOCKED),
          });

          if (!writeRes.ok) write_failures += 1;
          results.push({ canonical_id: item.canonical_id, ok: writeRes.ok, status: "give_up_blocked", http_status, attempts: nextAttempts, upsert_error: writeRes.error });
          continue;
        }

        // Non-block HTTP failure -> retry until max_attempts, then give_up_error
        failed += 1;
        const terminal = nextAttempts >= max_attempts;

        const writeRes = await upsertBody(supabase, {
          canonical_id: item.canonical_id,
          resolution_status: terminal ? RES_GIVEUP_ERROR : RES_ACTIVE,
          fetch_status: terminal ? "error" : "error",
          fetch_method: "jina",
          fetched_at: isoNow(),
          http_status,
          final_url: url,
          content_type,
          error_message: `Reader fetch failed: ${http_status}`,
          fetch_attempts: nextAttempts,
          expires_at: terminal ? isoInDays(COOLDOWN_DAYS_GIVEUP) : isoInHours(COOLDOWN_HOURS_ERROR),
        });

        if (terminal) giveups += 1;
        if (!writeRes.ok) write_failures += 1;
        results.push({ canonical_id: item.canonical_id, ok: writeRes.ok, status: terminal ? "give_up_error" : "error", http_status, attempts: nextAttempts, upsert_error: writeRes.error });
        continue;
      }

      const text = await resp.text();
      const cleaned = String(text ?? "").trim();
      const { isBlocked, isPaywalled } = detectBlockedOrPaywalled(cleaned);

      // Content-level blocked/paywall -> give up immediately
      if (isBlocked || isPaywalled) {
        if (isPaywalled) {
          paywalled += 1;
          giveups += 1;

          const writeRes = await upsertBody(supabase, {
            canonical_id: item.canonical_id,
            resolution_status: RES_GIVEUP_PAYWALLED,
            fetch_status: "paywalled",
            fetch_method: "jina",
            fetched_at: isoNow(),
            http_status: 200,
            final_url: url,
            content_type,
            error_message: "Paywall detected in extracted text",
            extracted_excerpt: cleaned.slice(0, 800),
            fetch_attempts: nextAttempts,
            expires_at: isoInDays(COOLDOWN_DAYS_PAYWALLED),
          });

          if (!writeRes.ok) write_failures += 1;
          results.push({ canonical_id: item.canonical_id, ok: writeRes.ok, status: "give_up_paywalled", attempts: nextAttempts, upsert_error: writeRes.error });
          continue;
        }

        blocked += 1;
        giveups += 1;

        const writeRes = await upsertBody(supabase, {
          canonical_id: item.canonical_id,
          resolution_status: RES_GIVEUP_BLOCKED,
          fetch_status: "blocked",
          fetch_method: "jina",
          fetched_at: isoNow(),
          http_status: 200,
          final_url: url,
          content_type,
          error_message: "Blocked/CAPTCHA detected in extracted text",
          extracted_excerpt: cleaned.slice(0, 800),
          fetch_attempts: nextAttempts,
          expires_at: isoInDays(COOLDOWN_DAYS_BLOCKED),
        });

        if (!writeRes.ok) write_failures += 1;
        results.push({ canonical_id: item.canonical_id, ok: writeRes.ok, status: "give_up_blocked", attempts: nextAttempts, upsert_error: writeRes.error });
        continue;
      }

      // Too short -> retry until max_attempts then give_up_error
      if (cleaned.length < MIN_TEXT_LEN) {
        failed += 1;
        const terminal = nextAttempts >= max_attempts;
        if (terminal) giveups += 1;

        const writeRes = await upsertBody(supabase, {
          canonical_id: item.canonical_id,
          resolution_status: terminal ? RES_GIVEUP_ERROR : RES_ACTIVE,
          fetch_status: terminal ? "error" : "error",
          fetch_method: "jina",
          fetched_at: isoNow(),
          http_status: 200,
          final_url: url,
          content_type,
          error_message: "Extracted text too short",
          extracted_excerpt: cleaned.slice(0, 800),
          fetch_attempts: nextAttempts,
          expires_at: terminal ? isoInDays(COOLDOWN_DAYS_GIVEUP) : isoInHours(COOLDOWN_HOURS_ERROR),
        });

        if (!writeRes.ok) write_failures += 1;
        results.push({ canonical_id: item.canonical_id, ok: writeRes.ok, status: terminal ? "give_up_error" : "retry_too_short", attempts: nextAttempts, upsert_error: writeRes.error });
        continue;
      }

      // Success
      const excerpt = cleaned.slice(0, 800);
      const word_count = cleaned.split(/\s+/).filter(Boolean).length;

      const writeRes = await upsertBody(supabase, {
        canonical_id: item.canonical_id,
        resolution_status: RES_SUCCESS,
        fetch_status: "success",
        fetch_method: "jina",
        fetched_at: isoNow(),
        http_status: 200,
        final_url: url,
        content_type,
        extracted_text: cleaned.slice(0, 50000),
        extracted_excerpt: excerpt,
        word_count,
        error_message: null,
        fetch_attempts: nextAttempts,
        expires_at: isoInDays(SUCCESS_RETENTION_DAYS),
      });

      if (!writeRes.ok) {
        write_failures += 1;
        results.push({ canonical_id: item.canonical_id, ok: false, status: "db_write_failed", stage: "write_success", attempts: nextAttempts, upsert_error: writeRes.error });
        continue;
      }

      success += 1;
      results.push({ canonical_id: item.canonical_id, ok: true, status: "success", word_count, attempts: nextAttempts });
    } catch (e: any) {
      const isTimeout = e?.name === "AbortError";
      const msg = isTimeout ? "timeout" : (e?.message ?? String(e));

      failed += 1;
      const terminal = nextAttempts >= max_attempts;
      if (terminal) giveups += 1;

      const writeRes = await upsertBody(supabase, {
        canonical_id: item.canonical_id,
        resolution_status: terminal ? RES_GIVEUP_ERROR : RES_ACTIVE,
        fetch_status: isTimeout ? "timeout" : "error",
        fetch_method: "jina",
        fetched_at: isoNow(),
        final_url: url,
        error_message: msg,
        fetch_attempts: nextAttempts,
        expires_at: terminal ? isoInDays(COOLDOWN_DAYS_GIVEUP) : isoInHours(COOLDOWN_HOURS_ERROR),
      });

      if (!writeRes.ok) write_failures += 1;
      results.push({ canonical_id: item.canonical_id, ok: writeRes.ok, status: terminal ? "give_up_error" : (isTimeout ? "timeout" : "error"), error: msg, attempts: nextAttempts, upsert_error: writeRes.error });
    }
  }

  return c.json(
    {
      ok: true,
      version: VERSION,
      path_seen: c.req.path,
      write: true,
      limit,
      since_hours,
      max_attempts,
      attempted: toProcess.length,
      success,
      paywalled,
      blocked,
      failed,
      giveups,
      write_failures,
      results: results.slice(0, 30),
    },
    200,
    corsHeaders
  );
});

app.all("*", (c) =>
  c.json(
    { ok: false, error: "Route not found", path_seen: c.req.path, version: VERSION },
    404,
    corsHeaders
  )
);

Deno.serve(app.fetch);
