// content_fetch — v2.4 (RPC-based, bypasses PostgREST schema exposure)
// Fixes: f.* schema not PostgREST-exposed → all DB ops now via SECURITY DEFINER RPCs

import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "content-fetch-v2.4-rpc";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-ingest-key, apikey, authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const MAX_LIMIT = 50;
const MIN_TEXT_LEN = 500;
const DEFAULT_SINCE_HOURS = 168;
const PENDING_LOCK_HOURS = 1;
const SUCCESS_RETENTION_DAYS = 7;
const MAX_ATTEMPTS_DEFAULT = 3;
const COOLDOWN_HOURS_ERROR = 6;
const COOLDOWN_DAYS_BLOCKED = 30;
const COOLDOWN_DAYS_PAYWALLED = 365;
const COOLDOWN_DAYS_GIVEUP = 3650;

const RES_ACTIVE = "active";
const RES_SUCCESS = "success";
const RES_GIVEUP_BLOCKED = "give_up_blocked";
const RES_GIVEUP_PAYWALLED = "give_up_paywalled";
const RES_GIVEUP_ERROR = "give_up_error";

const TERMINAL_RESOLUTIONS = new Set([
  RES_SUCCESS, RES_GIVEUP_BLOCKED, RES_GIVEUP_PAYWALLED, RES_GIVEUP_ERROR, "give_up_stale"
]);

const PAYWALL_DOMAINS = new Set([
  "theaustralian.com.au", "afr.com", "afr.com.au"
]);

function getClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function domainFromUrl(url: string): string | null {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h.startsWith("www.") ? h.slice(4) : h;
  } catch { return null; }
}

async function fetchWithTimeout(url: string, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; InvegentFetcher/1.0)", "Accept": "text/plain,text/html;q=0.9,*/*;q=0.8" }
    });
  } finally { clearTimeout(t); }
}

function isoNow() { return new Date().toISOString(); }
function isoInHours(h: number) { return new Date(Date.now() + h * 3600_000).toISOString(); }
function isoInDays(d: number) { return new Date(Date.now() + d * 86400_000).toISOString(); }
function isExpired(exp: string | null | undefined) {
  if (!exp) return true;
  const t = Date.parse(exp);
  return !Number.isFinite(t) || t <= Date.now();
}

function detectBlockedOrPaywalled(text: string) {
  const lc = text.toLowerCase();
  const isBlocked = lc.includes("just a moment") || lc.includes("captcha") || lc.includes("cloudflare") || lc.includes("access denied") || lc.includes("forbidden");
  const isPaywalled = lc.includes("subscribe") || lc.includes("subscription") || lc.includes("sign in") || lc.includes("log in") || lc.includes("premium") || lc.includes("paywall");
  return { isBlocked, isPaywalled };
}

async function upsertBody(supabase: any, params: any) {
  const { data, error } = await supabase.rpc("content_fetch_upsert_body", {
    p_canonical_id:      params.canonical_id,
    p_resolution_status: params.resolution_status,
    p_fetch_status:      params.fetch_status,
    p_fetch_method:      params.fetch_method,
    p_fetched_at:        params.fetched_at,
    p_http_status:       params.http_status ?? null,
    p_final_url:         params.final_url ?? null,
    p_content_type:      params.content_type ?? null,
    p_extracted_text:    params.extracted_text ?? null,
    p_extracted_excerpt: params.extracted_excerpt ?? null,
    p_word_count:        params.word_count ?? null,
    p_error_message:     params.error_message ?? null,
    p_fetch_attempts:    params.fetch_attempts,
    p_expires_at:        params.expires_at,
  });
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };
  return { ok: true };
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method !== "GET") {
    const expected = Deno.env.get("INGEST_API_KEY");
    const provided = req.headers.get("x-ingest-key");
    if (!expected) return jsonResp({ ok: false, error: "INGEST_API_KEY not set" }, 500);
    if (!provided || provided !== expected) return jsonResp({ ok: false, error: "Unauthorized" }, 401);
  }

  if (req.method === "GET") {
    return jsonResp({ ok: true, function: "content_fetch", version: VERSION, path });
  }

  if (!path.endsWith("/run")) {
    return jsonResp({ ok: false, error: "Route not found", path, version: VERSION }, 404);
  }

  let supabase: any;
  try { supabase = getClient(); }
  catch (e: any) { return jsonResp({ ok: false, error: e?.message }, 500); }

  const limit        = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "10"), 1), MAX_LIMIT);
  const since_hours  = Math.min(Math.max(Number(url.searchParams.get("since_hours") ?? String(DEFAULT_SINCE_HOURS)), 1), 720);
  const write        = (url.searchParams.get("write") ?? "false").toLowerCase() === "true";
  const max_attempts = Math.min(Math.max(Number(url.searchParams.get("max_attempts") ?? String(MAX_ATTEMPTS_DEFAULT)), 1), 10);
  const sinceIso     = new Date(Date.now() - since_hours * 3600_000).toISOString();

  const { data: canonRaw, error: canonErr } = await supabase.rpc("content_fetch_load_canonicals", { p_since_iso: sinceIso, p_limit: 2000 });
  if (canonErr) return jsonResp({ ok: false, step: "load_canonicals", error: canonErr.message, version: VERSION }, 500);

  const canonList: any[] = canonRaw ?? [];
  const canonIds: string[] = canonList.map((x: any) => x.canonical_id);

  const existingMap = new Map<string, any>();
  if (canonIds.length > 0) {
    const { data: bodiesRaw, error: bodyErr } = await supabase.rpc("content_fetch_load_bodies", { p_canonical_ids: canonIds });
    if (bodyErr) return jsonResp({ ok: false, step: "load_bodies", error: bodyErr.message, version: VERSION }, 500);
    (bodiesRaw ?? []).forEach((b: any) => existingMap.set(b.canonical_id, b));
  }

  const candidates = canonList.filter((x: any) => {
    const ex = existingMap.get(x.canonical_id);
    if (!ex) return true;
    if (TERMINAL_RESOLUTIONS.has(String(ex.resolution_status ?? RES_ACTIVE))) return false;
    if (Number(ex.fetch_attempts ?? 0) >= max_attempts) return false;
    return isExpired(ex.expires_at);
  });

  const toProcess = candidates.slice(0, limit).map((x: any) => ({
    canonical_id: x.canonical_id, url: x.canonical_url, existing: existingMap.get(x.canonical_id) ?? null,
  }));

  if (!write) {
    return jsonResp({ ok: true, version: VERSION, dry_run: true, limit, since_hours, max_attempts, canonicals_loaded: canonList.length, candidates_total: candidates.length, will_process: toProcess.length });
  }

  const results: any[] = [];
  let success = 0, paywalled = 0, blocked = 0, failed = 0, giveups = 0, write_failures = 0;

  for (const item of toProcess) {
    const itemUrl = String(item.url ?? "").trim();
    const domain = domainFromUrl(itemUrl);
    const prevAttempts = Number(item.existing?.fetch_attempts ?? 0);
    const nextAttempts = prevAttempts + 1;

    const claimRes = await upsertBody(supabase, { canonical_id: item.canonical_id, resolution_status: RES_ACTIVE, fetch_status: "pending", fetch_method: "jina", fetched_at: isoNow(), final_url: itemUrl || null, fetch_attempts: nextAttempts, expires_at: isoInHours(PENDING_LOCK_HOURS), error_message: null });
    if (!claimRes.ok) { write_failures++; results.push({ canonical_id: item.canonical_id, ok: false, status: "db_write_failed", stage: "claim", error: claimRes.error }); continue; }

    if (!itemUrl) {
      giveups++; failed++;
      const wr = await upsertBody(supabase, { canonical_id: item.canonical_id, resolution_status: RES_GIVEUP_ERROR, fetch_status: "error", fetch_method: "policy", fetched_at: isoNow(), fetch_attempts: nextAttempts, expires_at: isoInDays(COOLDOWN_DAYS_GIVEUP), error_message: "missing_url" });
      if (!wr.ok) write_failures++;
      results.push({ canonical_id: item.canonical_id, ok: wr.ok, status: "give_up_error", error: "missing_url", attempts: nextAttempts }); continue;
    }

    if (domain && PAYWALL_DOMAINS.has(domain)) {
      giveups++; paywalled++;
      const wr = await upsertBody(supabase, { canonical_id: item.canonical_id, resolution_status: RES_GIVEUP_PAYWALLED, fetch_status: "paywalled", fetch_method: "policy", fetched_at: isoNow(), final_url: itemUrl, fetch_attempts: nextAttempts, expires_at: isoInDays(COOLDOWN_DAYS_PAYWALLED), error_message: `Paywall domain: ${domain}` });
      if (!wr.ok) write_failures++;
      results.push({ canonical_id: item.canonical_id, ok: wr.ok, status: "give_up_paywalled", domain, attempts: nextAttempts }); continue;
    }

    const readerUrl = "https://r.jina.ai/" + encodeURI(itemUrl);
    try {
      const resp = await fetchWithTimeout(readerUrl, 12000);
      const http_status = resp.status;
      const content_type = resp.headers.get("content-type") ?? null;

      if (!resp.ok) {
        const terminal = nextAttempts >= max_attempts;
        if ([401, 403, 429, 451].includes(http_status)) {
          giveups++; blocked++;
          const wr = await upsertBody(supabase, { canonical_id: item.canonical_id, resolution_status: RES_GIVEUP_BLOCKED, fetch_status: "blocked", fetch_method: "jina", fetched_at: isoNow(), http_status, final_url: itemUrl, content_type, fetch_attempts: nextAttempts, expires_at: isoInDays(COOLDOWN_DAYS_BLOCKED), error_message: `HTTP ${http_status}` });
          if (!wr.ok) write_failures++;
          results.push({ canonical_id: item.canonical_id, ok: wr.ok, status: "give_up_blocked", http_status, attempts: nextAttempts }); continue;
        }
        failed++; if (terminal) giveups++;
        const wr = await upsertBody(supabase, { canonical_id: item.canonical_id, resolution_status: terminal ? RES_GIVEUP_ERROR : RES_ACTIVE, fetch_status: "error", fetch_method: "jina", fetched_at: isoNow(), http_status, final_url: itemUrl, content_type, fetch_attempts: nextAttempts, expires_at: terminal ? isoInDays(COOLDOWN_DAYS_GIVEUP) : isoInHours(COOLDOWN_HOURS_ERROR), error_message: `HTTP ${http_status}` });
        if (!wr.ok) write_failures++;
        results.push({ canonical_id: item.canonical_id, ok: wr.ok, status: terminal ? "give_up_error" : "error", http_status, attempts: nextAttempts }); continue;
      }

      const text = await resp.text();
      const cleaned = String(text ?? "").trim();
      const { isBlocked, isPaywalled } = detectBlockedOrPaywalled(cleaned);

      if (isPaywalled) {
        giveups++; paywalled++;
        const wr = await upsertBody(supabase, { canonical_id: item.canonical_id, resolution_status: RES_GIVEUP_PAYWALLED, fetch_status: "paywalled", fetch_method: "jina", fetched_at: isoNow(), http_status: 200, final_url: itemUrl, content_type, extracted_excerpt: cleaned.slice(0, 800), fetch_attempts: nextAttempts, expires_at: isoInDays(COOLDOWN_DAYS_PAYWALLED), error_message: "Paywall in content" });
        if (!wr.ok) write_failures++;
        results.push({ canonical_id: item.canonical_id, ok: wr.ok, status: "give_up_paywalled", attempts: nextAttempts }); continue;
      }
      if (isBlocked) {
        giveups++; blocked++;
        const wr = await upsertBody(supabase, { canonical_id: item.canonical_id, resolution_status: RES_GIVEUP_BLOCKED, fetch_status: "blocked", fetch_method: "jina", fetched_at: isoNow(), http_status: 200, final_url: itemUrl, content_type, extracted_excerpt: cleaned.slice(0, 800), fetch_attempts: nextAttempts, expires_at: isoInDays(COOLDOWN_DAYS_BLOCKED), error_message: "Blocked/CAPTCHA in content" });
        if (!wr.ok) write_failures++;
        results.push({ canonical_id: item.canonical_id, ok: wr.ok, status: "give_up_blocked", attempts: nextAttempts }); continue;
      }

      if (cleaned.length < MIN_TEXT_LEN) {
        failed++; const terminal = nextAttempts >= max_attempts; if (terminal) giveups++;
        const wr = await upsertBody(supabase, { canonical_id: item.canonical_id, resolution_status: terminal ? RES_GIVEUP_ERROR : RES_ACTIVE, fetch_status: "error", fetch_method: "jina", fetched_at: isoNow(), http_status: 200, final_url: itemUrl, content_type, extracted_excerpt: cleaned.slice(0, 800), fetch_attempts: nextAttempts, expires_at: terminal ? isoInDays(COOLDOWN_DAYS_GIVEUP) : isoInHours(COOLDOWN_HOURS_ERROR), error_message: "Text too short" });
        if (!wr.ok) write_failures++;
        results.push({ canonical_id: item.canonical_id, ok: wr.ok, status: terminal ? "give_up_error" : "retry_too_short", attempts: nextAttempts }); continue;
      }

      const word_count = cleaned.split(/\s+/).filter(Boolean).length;
      const wr = await upsertBody(supabase, { canonical_id: item.canonical_id, resolution_status: RES_SUCCESS, fetch_status: "success", fetch_method: "jina", fetched_at: isoNow(), http_status: 200, final_url: itemUrl, content_type, extracted_text: cleaned.slice(0, 50000), extracted_excerpt: cleaned.slice(0, 800), word_count, fetch_attempts: nextAttempts, expires_at: isoInDays(SUCCESS_RETENTION_DAYS), error_message: null });
      if (!wr.ok) { write_failures++; results.push({ canonical_id: item.canonical_id, ok: false, status: "db_write_failed", error: wr.error, attempts: nextAttempts }); continue; }
      success++;
      results.push({ canonical_id: item.canonical_id, ok: true, status: "success", word_count, attempts: nextAttempts });

    } catch (e: any) {
      const isTimeout = e?.name === "AbortError";
      const msg = isTimeout ? "timeout" : (e?.message ?? String(e));
      failed++; const terminal = nextAttempts >= max_attempts; if (terminal) giveups++;
      const wr = await upsertBody(supabase, { canonical_id: item.canonical_id, resolution_status: terminal ? RES_GIVEUP_ERROR : RES_ACTIVE, fetch_status: isTimeout ? "timeout" : "error", fetch_method: "jina", fetched_at: isoNow(), final_url: itemUrl, fetch_attempts: nextAttempts, expires_at: terminal ? isoInDays(COOLDOWN_DAYS_GIVEUP) : isoInHours(COOLDOWN_HOURS_ERROR), error_message: msg });
      if (!wr.ok) write_failures++;
      results.push({ canonical_id: item.canonical_id, ok: wr.ok, status: terminal ? "give_up_error" : (isTimeout ? "timeout" : "error"), error: msg, attempts: nextAttempts });
    }
  }

  return jsonResp({ ok: true, version: VERSION, write: true, limit, since_hours, max_attempts, attempted: toProcess.length, success, paywalled, blocked, failed, giveups, write_failures, results: results.slice(0, 30) });
});
