import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-publisher-key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const VERSION = "publisher-v1.2.0";

// -------------------------
// Helpers
// -------------------------
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeParseJson<T>(raw: string): { ok: true; value: T } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "invalid_json" };
  }
}

function nowIso() {
  return new Date().toISOString();
}

function parseBool(v: unknown, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["1", "true", "yes", "y"].includes(s)) return true;
    if (["0", "false", "no", "n"].includes(s)) return false;
  }
  return fallback;
}

function clampInt(n: number, lo: number, hi: number) {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.trunc(n)));
}

function startOfUtcDayIso(d = new Date()) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  return x.toISOString();
}

function startOfNextUtcDayIso(d = new Date()) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0));
  return x.toISOString();
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in secrets");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function requirePublisherKey(c: any) {
  const expected = Deno.env.get("PUBLISHER_API_KEY");
  const provided = c.req.header("x-publisher-key");
  if (!expected) return { ok: false, res: jsonResponse({ ok: false, error: "PUBLISHER_API_KEY_not_set" }, 500) };
  if (!provided || provided !== expected) return { ok: false, res: jsonResponse({ ok: false, error: "Unauthorized" }, 401) };
  return { ok: true as const };
}

function getGraphVersion() {
  return (Deno.env.get("FB_GRAPH_VERSION") ?? "v25.0").toString();
}

function getAppAccessTokenOrNull() {
  const appId = Deno.env.get("FB_APP_ID");
  const appSecret = Deno.env.get("FB_APP_SECRET");
  if (!appId || !appSecret) return null;
  return `${appId}|${appSecret}`;
}

async function fbDebugToken(opts: { graphVersion: string; inputToken: string; appAccessToken: string }) {
  const { graphVersion, inputToken, appAccessToken } = opts;
  const url =
    `https://graph.facebook.com/${graphVersion}/debug_token` +
    `?input_token=${encodeURIComponent(inputToken)}` +
    `&access_token=${encodeURIComponent(appAccessToken)}`;

  const resp = await fetch(url, { method: "GET" });
  const text = await resp.text();

  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

  if (!resp.ok) {
    throw new Error(`facebook_debug_token_http_${resp.status}: ${text.slice(0, 1200)}`);
  }
  return parsed; // { data: { is_valid, expires_at, scopes, ... } }
}

async function fbPostToFeed(opts: {
  graphVersion: string;
  pageId: string;
  pageToken: string;
  message: string;
}) {
  const { graphVersion, pageId, pageToken, message } = opts;

  const url = `https://graph.facebook.com/${graphVersion}/${pageId}/feed`;
  const body = new URLSearchParams();
  body.set("message", message);
  body.set("access_token", pageToken);

  const resp = await fetch(url, { method: "POST", body });
  const text = await resp.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

  if (!resp.ok) {
    throw new Error(`facebook_http_${resp.status}: ${text.slice(0, 1200)}`);
  }
  if (!parsed?.id) {
    throw new Error(`facebook_missing_post_id: ${text.slice(0, 1200)}`);
  }

  return parsed; // { id: "pageid_postid" }
}

// -------------------------
// Types
// -------------------------
type PublisherRequest = {
  limit?: number;
  worker_id?: string;
  lock_seconds?: number;
  dry_run?: boolean;
  dry_run_hold_minutes?: number;
};

type PublishQueueRow = {
  queue_id: string;
  ai_job_id: string | null;
  post_draft_id: string;
  client_id: string;
  platform: string;
  status: string;
  scheduled_for: string | null;
  attempt_count: number | null;
  last_error: string | null;
  locked_at: string | null;
  locked_by: string | null;
};

type PublishProfile = {
  client_publish_profile_id: string;
  client_id: string;
  platform: string;
  status: string;
  mode: string | null;
  is_default: boolean | null;
  // Legacy token method (env-var based)
  destination_id: string | null;
  credential_env_key: string | null;
  // OAuth token method (DB-stored, preferred)
  page_id: string | null;
  page_access_token: string | null;
  page_name: string | null;
  // Publishing config
  publish_enabled: boolean | null;
  test_prefix: string | null;
  max_per_day: number | null;
  min_gap_minutes: number | null;
};

/**
 * Resolve page ID: prefer OAuth page_id, fall back to legacy destination_id.
 */
function resolvePageId(profile: PublishProfile): string {
  return (profile.page_id ?? profile.destination_id ?? "").toString();
}

/**
 * Resolve page access token: prefer OAuth page_access_token stored in DB,
 * fall back to legacy env-var method via credential_env_key.
 * Returns null if neither is available.
 */
function resolvePageToken(profile: PublishProfile): string | null {
  if (profile.page_access_token) return profile.page_access_token;
  const tokenKey = (profile.credential_env_key ?? "").toString();
  return tokenKey ? (Deno.env.get(tokenKey) ?? null) : null;
}

// -------------------------
// Routes
// -------------------------
app.options("*", () => new Response(null, { status: 204, headers: corsHeaders }));

app.get("*", async (c) => {
  const path = c.req.path || "/";

  if (path.endsWith("/health")) {
    return jsonResponse({ ok: true, function: "publisher", version: VERSION, path_seen: path }, 200);
  }

  // Token health endpoint (secured with x-publisher-key)
  if (path.endsWith("/token-health")) {
    const gate = requirePublisherKey(c);
    if (!gate.ok) return gate.res;

    const supabase = getServiceClient();
    const graphVersion = getGraphVersion();
    const appAccessToken = getAppAccessTokenOrNull();

    if (!appAccessToken) {
      return jsonResponse(
        {
          ok: false,
          error: "FB_APP_ID_or_FB_APP_SECRET_missing",
          hint: "Set FB_APP_ID and FB_APP_SECRET Edge Secrets to enable token-health checks.",
          version: VERSION,
        },
        400
      );
    }

    // Pull all active facebook profiles
    const { data: profiles, error } = await supabase
      .schema("c")
      .from("client_publish_profile")
      .select("*")
      .eq("platform", "facebook")
      .eq("status", "active");

    if (error) {
      return jsonResponse({ ok: false, error: "load_publish_profiles_failed", detail: error }, 500);
    }

    const results: any[] = [];
    for (const p of profiles ?? []) {
      const profile = p as unknown as PublishProfile;
      const pageId = resolvePageId(profile);
      const pageToken = resolvePageToken(profile);
      const tokenSource = profile.page_access_token ? "db_oauth" : "env_var";

      if (!pageId || !pageToken) {
        results.push({
          client_id: p.client_id,
          page_id: pageId || null,
          page_name: profile.page_name || null,
          token_source: tokenSource,
          ok: false,
          error: "missing_page_id_or_token",
        });
        continue;
      }

      try {
        const dbg = await fbDebugToken({ graphVersion, inputToken: pageToken, appAccessToken });
        const d = dbg?.data ?? {};
        results.push({
          client_id: p.client_id,
          page_id: pageId,
          page_name: profile.page_name || null,
          token_source: tokenSource,
          is_valid: Boolean(d.is_valid),
          expires_at: d.expires_at ?? null,
          data_access_expires_at: d.data_access_expires_at ?? null,
          scopes: d.scopes ?? null,
          raw: dbg,
        });
      } catch (e: any) {
        results.push({
          client_id: p.client_id,
          page_id: pageId,
          page_name: profile.page_name || null,
          token_source: tokenSource,
          ok: false,
          error: (e?.message ?? String(e)).slice(0, 1200),
        });
      }
    }

    return jsonResponse({ ok: true, version: VERSION, graph_version: graphVersion, checked: results.length, results }, 200);
  }

  return jsonResponse(
    { ok: true, function: "publisher", version: VERSION, routes: ["GET */health", "GET */token-health", "POST * (runs publisher)"], path_seen: path },
    200
  );
});

app.post("*", async (c) => {
  const gate = requirePublisherKey(c);
  if (!gate.ok) return gate.res;

  const supabase = getServiceClient();
  const path = c.req.path || "/";
  const graphVersion = getGraphVersion();

  const appAccessToken = getAppAccessTokenOrNull();
  const validateToken = parseBool(Deno.env.get("PUBLISH_VALIDATE_TOKEN") ?? "true", true);

  // Parse query/body
  const qDry = (c.req.query("dry_run") ?? "").toString();
  const dryRunFromQuery = parseBool(qDry, false);

  const qHold = (c.req.query("dry_run_hold_minutes") ?? "").toString();
  const holdFromQuery = Number(qHold);

  const bodyText = await c.req.text();
  const bodyJson = bodyText?.trim()
    ? safeParseJson<PublisherRequest>(bodyText)
    : ({ ok: true as const, value: {} as PublisherRequest });

  if (!bodyJson.ok) return jsonResponse({ ok: false, error: "bad_json", detail: bodyJson.error, path_seen: path }, 400);

  const limit = clampInt(Number(bodyJson.value.limit ?? c.req.query("limit") ?? 1), 1, 20);
  const workerId = (bodyJson.value.worker_id ?? `publisher-${crypto.randomUUID().slice(0, 8)}`).toString();
  const lockSeconds = clampInt(Number(bodyJson.value.lock_seconds ?? 600), 30, 3600);

  const dryRun = Boolean(bodyJson.value.dry_run ?? dryRunFromQuery);
  const dryRunHoldMinutes = clampInt(Number(bodyJson.value.dry_run_hold_minutes ?? holdFromQuery ?? 60), 1, 24 * 60);

  // 1) Lock queue rows
  const { data: lockedRows, error: lockErr } = await supabase
    .schema("m")
    .rpc("publisher_lock_queue_v1", { p_limit: limit, p_worker_id: workerId, p_lock_seconds: lockSeconds });

  if (lockErr) {
    return jsonResponse({ ok: false, error: "lock_queue_failed", detail: lockErr, path_seen: path }, 500);
  }

  const rows = (lockedRows ?? []) as PublishQueueRow[];
  if (!rows.length) {
    return jsonResponse({ ok: true, message: "no_publish_jobs", worker_id: workerId, locked: 0, path_seen: path }, 200);
  }

  const results: any[] = [];

  for (const q of rows) {
    const queueId = q.queue_id;

    try {
      // 2) Load publish profile
      const { data: prof, error: profErr } = await supabase
        .schema("c")
        .from("client_publish_profile")
        .select("*")
        .eq("client_id", q.client_id)
        .eq("platform", "facebook")
        .eq("status", "active")
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profErr) throw new Error(`load_publish_profile_failed: ${profErr.message ?? JSON.stringify(profErr)}`);
      if (!prof) throw new Error("no_active_publish_profile");

      const profile = prof as unknown as PublishProfile;

      if (profile.publish_enabled === false) {
        await supabase.schema("m").from("post_publish_queue").update({
          status: "skipped",
          last_error: "publish_disabled",
          locked_at: null,
          locked_by: null,
          updated_at: nowIso(),
        }).eq("queue_id", queueId);

        results.push({ queue_id: queueId, post_draft_id: q.post_draft_id, status: "skipped", reason: "publish_disabled" });
        continue;
      }

      // ── Token resolution ──────────────────────────────────────────────────
      // Prefer OAuth page_access_token stored in DB (from /connect flow).
      // Fall back to legacy env-var method for clients not yet migrated.
      const pageId = resolvePageId(profile);
      const pageToken = resolvePageToken(profile);
      const tokenSource = profile.page_access_token ? "db_oauth" : "env_var";

      if (!pageId) throw new Error("missing_page_id");
      if (!pageToken) throw new Error("missing_page_access_token");

      // 2.5) Optional token validation (fail-fast)
      if (validateToken) {
        if (!appAccessToken) {
          throw new Error("token_validation_enabled_but_FB_APP_ID_or_FB_APP_SECRET_missing");
        }
        const dbg = await fbDebugToken({ graphVersion, inputToken: pageToken, appAccessToken });
        const d = dbg?.data ?? {};
        if (!d.is_valid) {
          const backoffIso = new Date(Date.now() + 6 * 60 * 60_000).toISOString(); // 6h
          await supabase.schema("m").from("post_publish_queue").update({
            status: "queued",
            scheduled_for: backoffIso,
            last_error: `invalid_facebook_token`,
            locked_at: null,
            locked_by: null,
            updated_at: nowIso(),
          }).eq("queue_id", queueId);

          await supabase.schema("m").from("post_publish").insert({
            queue_id: queueId,
            ai_job_id: q.ai_job_id,
            post_draft_id: q.post_draft_id,
            client_id: q.client_id,
            platform: "facebook",
            destination_id: pageId,
            status: "failed",
            platform_post_id: null,
            request_payload: { graph_version: graphVersion, endpoint: `/${pageId}/feed`, dry_run: dryRun, token_source: tokenSource },
            response_payload: dbg,
            error: "invalid_facebook_token",
            created_at: nowIso(),
          });

          results.push({ queue_id: queueId, post_draft_id: q.post_draft_id, status: "failed", error: "invalid_facebook_token" });
          continue;
        }
      }

      // 3) Load draft content
      const { data: draft, error: draftErr } = await supabase
        .schema("m")
        .from("post_draft")
        .select("post_draft_id, draft_title, draft_body, approval_status")
        .eq("post_draft_id", q.post_draft_id)
        .maybeSingle();

      if (draftErr) throw new Error(`load_post_draft_failed: ${draftErr.message ?? JSON.stringify(draftErr)}`);
      if (!draft) throw new Error("post_draft_not_found");

      const title = (draft.draft_title ?? "").toString().trim();
      const body = (draft.draft_body ?? "").toString().trim();
      if (!title && !body) throw new Error("empty_draft_title_and_body");

      // 4) Throttle: max_per_day (UTC day)
      const maxPerDay = Number(profile.max_per_day ?? 0);
      if (Number.isFinite(maxPerDay) && maxPerDay > 0) {
        const dayStart = startOfUtcDayIso(new Date());
        const { count: todayCount, error: cntErr } = await supabase
          .schema("m")
          .from("post_publish")
          .select("post_publish_id", { count: "exact", head: true })
          .eq("destination_id", pageId)
          .eq("status", "published")
          .gte("created_at", dayStart);

        if (cntErr) throw new Error(`max_per_day_count_failed: ${cntErr.message ?? JSON.stringify(cntErr)}`);

        if ((todayCount ?? 0) >= maxPerDay) {
          const requeueFor = startOfNextUtcDayIso(new Date());

          await supabase.schema("m").from("post_publish_queue").update({
            status: "queued",
            scheduled_for: requeueFor,
            last_error: `throttled:max_per_day:${maxPerDay}`,
            locked_at: null,
            locked_by: null,
            updated_at: nowIso(),
          }).eq("queue_id", queueId);

          results.push({ queue_id: queueId, post_draft_id: q.post_draft_id, status: "throttled", reason: "max_per_day", requeue_for: requeueFor });
          continue;
        }
      }

      // 5) Throttle: min_gap_minutes (based on our DB published posts)
      const minGap = Number(profile.min_gap_minutes ?? 0);
      if (Number.isFinite(minGap) && minGap > 0) {
        const { data: lastPub } = await supabase
          .schema("m")
          .from("post_publish")
          .select("created_at")
          .eq("destination_id", pageId)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(1);

        const lastAt = lastPub?.[0]?.created_at ? new Date(lastPub[0].created_at).getTime() : null;
        const nowMs = Date.now();

        if (lastAt && nowMs - lastAt < minGap * 60_000) {
          const requeueFor = new Date(lastAt + minGap * 60_000).toISOString();

          await supabase.schema("m").from("post_publish_queue").update({
            status: "queued",
            scheduled_for: requeueFor,
            last_error: `throttled:min_gap:${minGap}m`,
            locked_at: null,
            locked_by: null,
            updated_at: nowIso(),
          }).eq("queue_id", queueId);

          results.push({ queue_id: queueId, post_draft_id: q.post_draft_id, status: "throttled", reason: "min_gap", requeue_for: requeueFor });
          continue;
        }
      }

      // 6) Build message
      const prefix = (profile.mode === "staging" ? (profile.test_prefix ?? "[TEST] ") : "") as string;
      const msg = `${prefix}${title}${title && body ? "\n\n" : ""}${body}`.trim();

      // 7) Dry run handling (SAFE)
      if (dryRun) {
        const requeueFor = new Date(Date.now() + dryRunHoldMinutes * 60_000).toISOString();
        await supabase.schema("m").from("post_publish_queue").update({
          status: "queued",
          scheduled_for: requeueFor,
          last_error: "dry_run_ok",
          locked_at: null,
          locked_by: null,
          updated_at: nowIso(),
        }).eq("queue_id", queueId);

        results.push({
          queue_id: queueId,
          post_draft_id: q.post_draft_id,
          status: "dry_run_ok",
          dry_run: true,
          token_source: tokenSource,
          would_post_to: `/${pageId}/feed`,
          requeue_for: requeueFor,
        });
        continue;
      }

      // 8) Publish for real
      const fbResp = await fbPostToFeed({ graphVersion, pageId, pageToken, message: msg });
      const platformPostId = fbResp?.id ?? null;

      // 9) Write publish attempt log
      await supabase.schema("m").from("post_publish").insert({
        queue_id: queueId,
        ai_job_id: q.ai_job_id,
        post_draft_id: q.post_draft_id,
        client_id: q.client_id,
        platform: "facebook",
        destination_id: pageId,
        status: "published",
        platform_post_id: platformPostId,
        published_at: nowIso(),
        request_payload: { endpoint: `/${pageId}/feed`, graph_version: graphVersion, dry_run: false, message_len: msg.length, token_source: tokenSource },
        response_payload: fbResp,
        error: null,
        created_at: nowIso(),
      });

      // 10) Mark queue done
      await supabase.schema("m").from("post_publish_queue").update({
        status: "published",
        last_error: null,
        locked_at: null,
        locked_by: null,
        updated_at: nowIso(),
      }).eq("queue_id", queueId);

      // 11) Mark draft as published
      await supabase.schema("m").from("post_draft").update({
        approval_status: "published",
        updated_at: nowIso(),
      }).eq("post_draft_id", q.post_draft_id);

      results.push({
        queue_id: queueId,
        post_draft_id: q.post_draft_id,
        status: "published",
        dry_run: false,
        token_source: tokenSource,
        platform_post_id: platformPostId,
      });
    } catch (e: any) {
      const msg = (e?.message ?? String(e)).slice(0, 4000);

      // Requeue with backoff (10m)
      const backoffIso = new Date(Date.now() + 10 * 60_000).toISOString();

      await supabase.schema("m").from("post_publish_queue").update({
        status: "queued",
        scheduled_for: backoffIso,
        last_error: msg,
        locked_at: null,
        locked_by: null,
        updated_at: nowIso(),
      }).eq("queue_id", queueId);

      // Log failure attempt
      await supabase.schema("m").from("post_publish").insert({
        queue_id: queueId,
        ai_job_id: q.ai_job_id,
        post_draft_id: q.post_draft_id,
        client_id: q.client_id,
        platform: "facebook",
        destination_id: null,
        status: "failed",
        platform_post_id: null,
        request_payload: { graph_version: graphVersion },
        response_payload: null,
        error: msg,
        created_at: nowIso(),
      });

      results.push({ queue_id: queueId, post_draft_id: q.post_draft_id, status: "failed", error: msg });
    }
  }

  return jsonResponse({
    ok: true,
    version: VERSION,
    worker_id: workerId,
    graph_version: graphVersion,
    locked: rows.length,
    processed: results.length,
    results,
    path_seen: path,
  });
});

Deno.serve(app.fetch);
