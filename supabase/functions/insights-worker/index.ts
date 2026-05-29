import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "insights-worker-v14.2.0";
// v14.2.0 (2026-05-29, FB wall-clock starvation fix — NY-FB + CFW-FB never reached):
//   The all-client sequential loop exhausted the ~150s Edge wall-clock after ~2
//   clients (Invegent + Property Pulse), so NDIS-Yarns + Care For Welfare
//   (clients 3-4 in the unindexed profile order) were never processed — every run.
//   - POST body may now carry a SELECTOR (precedence top→down):
//       client_publish_profile_id | client_id | destination_id  (+ optional max_posts).
//     When a selector is present, ONLY that one profile is processed. It is still
//     validated as platform='facebook' AND status='active' AND publish_enabled=true
//     (the selector is ANDed onto those filters); a selector that matches none
//     returns HTTP 400 {error:"profile_not_eligible"}. Intended path: one cron
//     call per client (see the per-client cron migration).
//   - Legacy no-selector path is CAPPED to one PROCESSED client per invocation
//     (NO_SELECTOR_MAX_CLIENTS): remaining clients are recorded skipped
//     ("run_budget_exhausted"), never silently dropped. Count-based + deterministic
//     (profiles ordered), so it cannot hard-kill mid-client.
//   - Per-client run summary persisted best-effort to m.insights_worker_run
//     (observability) — never aborts the run. NO token values, NO raw Graph payloads.
//   Graph version (v19.0), metrics, token resolution, and the upsert payload are
//   UNCHANGED from v14.1.0.
// v14.1.0 (2026-05-23, pool observer.insights_ingestion_stalled_since_0506):
//   Type C selection fix — never-collected-first ordering. The old query
//   selected published FB posts with limit 50 and NO ordering, so it kept
//   refreshing the same old subset (collected_at churn) while newer posts never
//   received a first-time m.post_performance row. Selection now uses the
//   worker's existing exec_sql pattern with a LEFT JOIN to m.post_performance,
//   ordered: (1) posts with no perf row first, (2) then oldest collected_at,
//   (3) then most recent published_at. Per-client limit preserved. Success
//   metric is new post_performance rows (reported as first_time), not just
//   collected_at refresh.
//   Type B token-source fallback — use the credential_env_key env secret first;
//   if it is NULL or unavailable, fall back to the inline
//   client_publish_profile.page_access_token (same source the publisher uses).
//   Token values are never logged/returned/persisted (only a source label).
// v14.0.0: Fix impressions metric name.
// 'post_impressions_unique_28d' is not a valid Facebook Graph API metric.
// Correct names: 'post_impressions' (total) and 'post_impressions_unique' (unique reach).
// Also added 'post_engaged_users' as a direct metric.
// Previously, impressions was failing silently for most posts causing null values.

const GRAPH_VERSION = "v19.0";
const MAX_POSTS_PER_CLIENT = 50;
const INSIGHTS_PERIOD = "lifetime";
// v14.2.0 (F1): the LEGACY no-selector all-client path is capped to ONE processed
// client per invocation (count-based, NOT time-based — one client ~70s is always
// safely under the ~150s Edge hard limit). Remaining clients are recorded skipped
// rather than risking a mid-client hard-kill. The per-client cron path (one
// profile) is the production path and never hits this cap.
const NO_SELECTOR_MAX_CLIENTS = 1;

const METRICS_TO_TRY: { key: string; names: string[] }[] = [
  { key: "reach",         names: ["post_impressions_unique"] },
  { key: "impressions",   names: ["post_impressions"] },
  { key: "engaged_users", names: ["post_engaged_users"] },
  { key: "clicks",        names: ["post_clicks"] },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function nowIso() { return new Date().toISOString(); }

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type PublishProfile = {
  client_publish_profile_id: string; // v14.2.0: needed for the selector + run-log
  client_id: string;
  destination_id: string | null;
  credential_env_key: string | null;
  // v14.1.0 Type B fallback: inline token used when credential_env_key is
  // NULL/unavailable. Never logged, returned, or persisted.
  page_access_token: string | null;
};

type PublishedPost = {
  post_publish_id: string;
  client_id: string;
  platform_post_id: string;
  destination_id: string | null;
  never_collected?: boolean;
};

async function fetchSingleMetric(
  postId: string, pageToken: string, metricNames: string[],
): Promise<{ value: number; metricName: string } | null> {
  for (const metricName of metricNames) {
    const url =
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(postId)}/insights` +
      `?metric=${metricName}&period=${INSIGHTS_PERIOD}&access_token=${encodeURIComponent(pageToken)}`;
    try {
      const resp = await fetch(url);
      const text = await resp.text();
      let parsed: any;
      try { parsed = JSON.parse(text); } catch { continue; }
      if (parsed?.error) { console.log(`[insights-worker] ${metricName} error: ${parsed.error.message}`); continue; }
      const val = parsed?.data?.[0]?.values?.[0]?.value ?? parsed?.data?.[0]?.value;
      if (val == null) continue;
      return { value: Number(val) || 0, metricName };
    } catch { continue; }
  }
  return null;
}

async function fetchPostInsights(platformPostId: string, pageToken: string) {
  const metricResults: Record<string, number | null> = {};
  const metricNamesUsed: Record<string, string> = {};
  const failedMetrics: string[] = [];

  for (const { key, names } of METRICS_TO_TRY) {
    const result = await fetchSingleMetric(platformPostId, pageToken, names);
    if (result) { metricResults[key] = result.value; metricNamesUsed[key] = result.metricName; }
    else { metricResults[key] = null; failedMetrics.push(key); }
  }

  // Post-level fields: reactions, comments, shares (always attempt)
  const postUrl =
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(platformPostId)}` +
    `?fields=reactions.summary(true),comments.limit(0).summary(true),shares` +
    `&access_token=${encodeURIComponent(pageToken)}`;
  let postParsed: any = {};
  try {
    const postResp = await fetch(postUrl);
    const postText = await postResp.text();
    try { postParsed = JSON.parse(postText); } catch { postParsed = {}; }
    if (postParsed?.error) { console.log(`[insights-worker] post fields error: ${postParsed.error.message}`); postParsed = {}; }
  } catch { postParsed = {}; }

  const reactions = Number(postParsed?.reactions?.summary?.total_count) || 0;
  const comments  = Number(postParsed?.comments?.summary?.total_count)  || 0;
  const shares    = Number(postParsed?.shares?.count) || 0;
  
  // Use direct engaged_users metric if available, else derive
  const directEngaged = metricResults["engaged_users"];
  const derivedEngaged = reactions + comments + shares;
  const engaged_users = directEngaged ?? (derivedEngaged > 0 ? derivedEngaged : null);

  const reach = metricResults["reach"] ?? 0;
  const impressions = metricResults["impressions"] ?? null;
  const clicks = metricResults["clicks"] ?? null;
  const engagementRate = reach > 0 && engaged_users != null ? engaged_users / reach : null;

  return {
    impressions, reach, engaged_users, reactions, comments, shares, clicks,
    engagement_rate: engagementRate,
    metricNamesUsed, failedMetrics,
  };
}

async function processClient(
  supabase: ReturnType<typeof getServiceClient>,
  profile: PublishProfile,
  pageToken: string,
  maxPosts: number = MAX_POSTS_PER_CLIENT, // v14.2.0: per-invocation cap (default unchanged)
): Promise<{ processed: number; succeeded: number; failed: number; first_time: number; errors: any[] }> {
  let processed = 0, succeeded = 0, failed = 0, first_time = 0;
  const errors: any[] = [];
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

  // Type C fix (v14.1.0): never-collected-first ordering. PostgREST cannot
  // cleanly express "rows with no related m.post_performance row first, then
  // stalest collected_at" across an embedded resource, so we use the worker's
  // existing exec_sql pattern (same as computeFormatPerformance). Ordering:
  //   1. posts with NO post_performance row (this insights_period) first,
  //   2. then oldest collected_at,
  //   3. then most recent published_at as tie-breaker.
  // Per-client limit preserved. client_id / cutoff are system-generated values
  // (UUID / ISO timestamp), interpolated the same way computeFormatPerformance
  // already interpolates client_id. D-01 hardening (2026-05-23): they are cast
  // explicitly (::uuid / ::timestamptz) for defence-in-depth — a malformed
  // value would fail the cast rather than alter the query shape.
  const selectSql = `
    SELECT pp.post_publish_id, pp.client_id, pp.platform_post_id, pp.destination_id,
           (perf.platform_post_id IS NULL) AS never_collected
    FROM m.post_publish pp
    LEFT JOIN m.post_performance perf
      ON perf.platform_post_id = pp.platform_post_id
     AND perf.insights_period = '${INSIGHTS_PERIOD}'
    WHERE pp.client_id = '${profile.client_id}'::uuid
      AND pp.platform = 'facebook'
      AND pp.status = 'published'
      AND pp.platform_post_id IS NOT NULL
      AND pp.published_at < '${cutoff}'::timestamptz
    ORDER BY (perf.platform_post_id IS NULL) DESC,
             perf.collected_at ASC NULLS FIRST,
             pp.published_at DESC
    LIMIT ${maxPosts}
  `;

  const { data: posts, error: postsErr } = await supabase.rpc("exec_sql", { query: selectSql });

  if (postsErr) {
    errors.push({ error: `load_posts_failed: ${postsErr.message}` });
    return { processed, succeeded, failed, first_time, errors };
  }

  for (const post of (posts as any[]) ?? []) {
    const p = post as PublishedPost;
    processed++;
    if (p.never_collected) first_time++;
    try {
      const metrics = await fetchPostInsights(p.platform_post_id, pageToken);
      const { error: upsertErr } = await supabase
        .schema("m").from("post_performance")
        .upsert({
          post_publish_id:  p.post_publish_id,
          client_id:        p.client_id,
          platform:         "facebook",
          platform_post_id: p.platform_post_id,
          reach:            metrics.reach,
          impressions:      metrics.impressions,
          engaged_users:    metrics.engaged_users,
          reactions:        metrics.reactions,
          comments:         metrics.comments,
          shares:           metrics.shares,
          clicks:           metrics.clicks,
          engagement_rate:  metrics.engagement_rate,
          collected_at:     nowIso(),
          insights_period:  INSIGHTS_PERIOD,
          raw_payload: {
            metric_names_used: metrics.metricNamesUsed,
            failed_metrics:    metrics.failedMetrics,
            version:           VERSION,
          },
        }, { onConflict: "platform_post_id,insights_period" });

      if (upsertErr) throw new Error(`upsert_failed: ${upsertErr.message}`);
      succeeded++;
    } catch (e: any) {
      failed++;
      errors.push({
        post_publish_id:  p.post_publish_id,
        platform_post_id: p.platform_post_id,
        error: (e?.message ?? String(e)).slice(0, 800),
      });
    }
  }

  return { processed, succeeded, failed, first_time, errors };
}

async function computeFormatPerformance(
  supabase: ReturnType<typeof getServiceClient>,
  clientIds: string[],
): Promise<{ windows_computed: number; errors: any[] }> {
  let windows_computed = 0;
  const errors: any[] = [];
  if (!clientIds.length) return { windows_computed, errors };

  for (const windowDays of [30, 90]) {
    const clientList = clientIds.map(id => `'${id}'`).join(",");
    const { data, error } = await supabase.rpc("exec_sql", {
      query: `
        WITH base AS (
          SELECT
            pp_pub.client_id,
            pd.recommended_format AS ice_format_key,
            pp_pub.post_draft_id,
            perf.engagement_rate,
            perf.reach,
            perf.impressions,
            perf.clicks,
            perf.shares
          FROM m.post_performance perf
          JOIN m.post_publish pp_pub ON pp_pub.post_publish_id = perf.post_publish_id
          JOIN m.post_draft pd ON pd.post_draft_id = pp_pub.post_draft_id
          WHERE pd.recommended_format IS NOT NULL
            AND pp_pub.client_id IN (${clientList})
            AND perf.collected_at > now() - interval '${windowDays} days'
        ),
        agg AS (
          SELECT client_id, ice_format_key,
            COUNT(*) AS post_count,
            AVG(reach) AS avg_reach, AVG(impressions) AS avg_impressions,
            AVG(engagement_rate) AS avg_engagement_rate,
            AVG(clicks) AS avg_clicks, AVG(shares) AS avg_shares
          FROM base GROUP BY client_id, ice_format_key
        ),
        ranked AS (
          SELECT b.client_id, b.ice_format_key, b.post_draft_id, b.engagement_rate,
            ROW_NUMBER() OVER (PARTITION BY b.client_id, b.ice_format_key ORDER BY b.engagement_rate DESC NULLS LAST) AS rn_best,
            ROW_NUMBER() OVER (PARTITION BY b.client_id, b.ice_format_key ORDER BY b.engagement_rate ASC NULLS LAST) AS rn_worst
          FROM base b
        )
        SELECT a.client_id, a.ice_format_key, a.post_count, a.avg_reach, a.avg_impressions,
          a.avg_engagement_rate, a.avg_clicks, a.avg_shares,
          best.post_draft_id AS best_post_draft_id, worst.post_draft_id AS worst_post_draft_id
        FROM agg a
        LEFT JOIN ranked best ON best.client_id = a.client_id AND best.ice_format_key = a.ice_format_key AND best.rn_best = 1
        LEFT JOIN ranked worst ON worst.client_id = a.client_id AND worst.ice_format_key = a.ice_format_key AND worst.rn_worst = 1
      `
    });

    if (error) { errors.push({ window_days: windowDays, error: error.message }); continue; }

    for (const row of (data as any[]) ?? []) {
      try {
        const { error: upsertErr } = await supabase.rpc("upsert_format_performance", {
          p_client_id: row.client_id, p_ice_format_key: row.ice_format_key,
          p_rolling_window_days: windowDays, p_post_count: Number(row.post_count),
          p_avg_reach: row.avg_reach != null ? Number(row.avg_reach) : null,
          p_avg_impressions: row.avg_impressions != null ? Number(row.avg_impressions) : null,
          p_avg_engagement_rate: row.avg_engagement_rate != null ? Number(row.avg_engagement_rate) : null,
          p_avg_clicks: row.avg_clicks != null ? Number(row.avg_clicks) : null,
          p_avg_shares: row.avg_shares != null ? Number(row.avg_shares) : null,
          p_best_post_draft_id: row.best_post_draft_id ?? null,
          p_worst_post_draft_id: row.worst_post_draft_id ?? null,
        });
        if (upsertErr) throw new Error(upsertErr.message);
        windows_computed++;
      } catch (e: any) {
        errors.push({ window_days: windowDays, client_id: row.client_id, format: row.ice_format_key, error: (e?.message ?? String(e)).slice(0, 400) });
      }
    }
  }
  return { windows_computed, errors };
}

// v14.2.0: optional request selector. Token VALUES never appear here.
type Selector = {
  client_publish_profile_id?: string;
  client_id?: string;
  destination_id?: string;
  max_posts?: number;
};

async function readSelector(req: Request): Promise<Selector> {
  try {
    const txt = await req.text();
    if (!txt) return {};
    const b = JSON.parse(txt) ?? {};
    const mp = Number(b.max_posts);
    return {
      client_publish_profile_id: b.client_publish_profile_id ? String(b.client_publish_profile_id) : undefined,
      client_id: b.client_id ? String(b.client_id) : undefined,
      destination_id: b.destination_id ? String(b.destination_id) : undefined,
      // F2: floor to an integer AFTER clamping so a non-integer can never reach SQL LIMIT.
      max_posts: Number.isFinite(mp) ? Math.max(1, Math.min(MAX_POSTS_PER_CLIENT, Math.floor(mp))) : undefined,
    };
  } catch {
    return {}; // malformed/empty body → behave as no-selector (legacy) run
  }
}

// Redact any token-shaped substring defensively. Graph/upsert error strings do
// not normally contain tokens, but this guarantees no token ever lands in a log row.
function safeErr(s: unknown): string {
  let t = String(typeof s === "string" ? s : JSON.stringify(s ?? ""));
  t = t.replace(/access_token=[^&\s"']+/g, "access_token=[REDACTED]")
       .replace(/EAA[A-Za-z0-9]{12,}/g, "[REDACTED]");
  return t.slice(0, 300);
}

// Best-effort per-client run summary → m.insights_worker_run. NEVER throws (a
// logging failure must not abort the actual collection run). NO token, NO payload.
async function writeRunLog(supabase: ReturnType<typeof getServiceClient>, row: Record<string, unknown>) {
  try {
    await supabase.schema("m").from("insights_worker_run").insert(row);
  } catch (_e) { /* observability is best-effort */ }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  // GET stays strictly read-only (health/version only — no DB access, no writes).
  if (req.method === "GET") return jsonResponse({ ok: true, function: "insights-worker", version: VERSION });

  const runId = crypto.randomUUID();
  const selector = await readSelector(req);
  const perClient = !!(selector.client_publish_profile_id || selector.client_id || selector.destination_id);
  const maxPosts = selector.max_posts ?? MAX_POSTS_PER_CLIENT;

  const clientSummaries: Record<string, any> = {};
  let totalProcessed = 0, totalSucceeded = 0, totalFailed = 0, totalFirstTime = 0;

  try {
    const supabase = getServiceClient();

    // Validation is enforced by ANDing the selector onto the mandatory
    // facebook/active/publish_enabled filters: a selector pointing at a
    // non-facebook / inactive / disabled profile simply matches zero rows → 400.
    let q = supabase
      .schema("c").from("client_publish_profile")
      .select("client_publish_profile_id, client_id, destination_id, credential_env_key, page_access_token")
      .eq("platform", "facebook")
      .eq("status", "active")
      .eq("publish_enabled", true);
    if (selector.client_publish_profile_id) q = q.eq("client_publish_profile_id", selector.client_publish_profile_id);
    else if (selector.client_id) q = q.eq("client_id", selector.client_id);
    else if (selector.destination_id) q = q.eq("destination_id", selector.destination_id);
    // F1: deterministic order so the legacy one-client cap is stable (no unindexed row order).
    q = q.order("client_publish_profile_id", { ascending: true });

    const { data: profiles, error: profErr } = await q;
    // F4: redact any returned error text (defensive — these carry no token today).
    if (profErr) return jsonResponse({ ok: false, run_id: runId, error: "load_profiles_failed", detail: safeErr(profErr) }, 500);

    const activeProfiles = (profiles ?? []) as PublishProfile[];

    if (perClient && activeProfiles.length === 0) {
      // selector did not resolve to an eligible facebook/active/enabled profile
      return jsonResponse({
        ok: false, run_id: runId, mode: "per_client", error: "profile_not_eligible",
        detail: "selector matched no platform=facebook, status=active, publish_enabled=true profile",
      }, 400);
    }
    if (!activeProfiles.length) {
      return jsonResponse({ ok: true, run_id: runId, version: VERSION, message: "no_active_profiles", total_processed: 0 });
    }

    const processedClientIds: string[] = [];
    let processedThisRun = 0; // F1: counts actually-processed clients (legacy cap)

    for (const profile of activeProfiles) {
      const startedAt = nowIso();
      const cStart = Date.now();

      // F1: LEGACY no-selector path is capped to ONE processed client per invocation.
      // Count-based + deterministic (profiles ordered); cannot hard-kill mid-client.
      // Per-client invocations (perClient) are never capped.
      if (!perClient && processedThisRun >= NO_SELECTOR_MAX_CLIENTS) {
        clientSummaries[profile.client_id] = { skipped: true, reason: "run_budget_exhausted" };
        await writeRunLog(supabase, {
          run_id: runId, worker_version: VERSION, invocation_mode: "all_client",
          client_id: profile.client_id, destination_id: profile.destination_id,
          started_at: startedAt, finished_at: nowIso(), duration_ms: 0,
          eligible_count: null, selected_count: 0, succeeded: 0, failed: 0,
          skipped_reason: "run_budget_exhausted", first_error_code: null, first_error_message: null,
        });
        continue;
      }

      // Type B token-source fallback (v14.1.0): env secret first, then inline
      // profile.page_access_token. Token VALUES are never logged/returned/
      // persisted — only the source label ("env" / "inline_profile").
      const tokenKey = (profile.credential_env_key ?? "").toString();
      let pageToken: string | undefined;
      let tokenSource = "";
      if (tokenKey) {
        const envVal = Deno.env.get(tokenKey);
        if (envVal) { pageToken = envVal; tokenSource = "env"; }
      }
      if (!pageToken && profile.page_access_token) {
        pageToken = profile.page_access_token;
        tokenSource = "inline_profile";
      }
      if (!pageToken) {
        clientSummaries[profile.client_id] = {
          skipped: true,
          reason: "no_token_available",
          credential_env_key_present: !!tokenKey,
          inline_token_present: !!profile.page_access_token,
        };
        await writeRunLog(supabase, {
          run_id: runId, worker_version: VERSION, invocation_mode: perClient ? "per_client" : "all_client",
          client_id: profile.client_id, destination_id: profile.destination_id,
          started_at: startedAt, finished_at: nowIso(), duration_ms: Date.now() - cStart,
          eligible_count: null, selected_count: 0, succeeded: 0, failed: 0,
          skipped_reason: "no_token_available", first_error_code: null, first_error_message: null,
        });
        continue;
      }

      const result = await processClient(supabase, profile, pageToken, maxPosts);
      processedThisRun++; // F1: count only actually-processed clients toward the cap
      // F4: redact per-post error strings before they enter the HTTP response.
      const safeErrors = result.errors.map((e: any) => ({ ...e, error: safeErr(e?.error ?? e) }));
      clientSummaries[profile.client_id] = { ...result, errors: safeErrors, token_source: tokenSource };
      totalProcessed += result.processed;
      totalSucceeded += result.succeeded;
      totalFailed += result.failed;
      totalFirstTime += result.first_time;
      processedClientIds.push(profile.client_id);

      await writeRunLog(supabase, {
        run_id: runId, worker_version: VERSION, invocation_mode: perClient ? "per_client" : "all_client",
        client_id: profile.client_id, destination_id: profile.destination_id,
        started_at: startedAt, finished_at: nowIso(), duration_ms: Date.now() - cStart,
        // selected_count = posts the capped SELECT returned (= processed). eligible_count
        // mirrors it in this minimal first pass (the SELECT is capped at maxPosts).
        eligible_count: result.processed, selected_count: result.processed,
        succeeded: result.succeeded, failed: result.failed,
        skipped_reason: null, first_error_code: null,
        first_error_message: result.errors.length ? safeErr(result.errors[0]?.error ?? result.errors[0]) : null,
      });
    }

    // Compute format performance only for clients actually processed this run.
    const formatPerfResult = await computeFormatPerformance(supabase, processedClientIds);
    console.log(`[insights-worker] run=${runId} mode=${perClient ? "per_client" : "all_client"} format_performance: ${formatPerfResult.windows_computed} windows, ${formatPerfResult.errors.length} errors`);

    return jsonResponse({
      ok: true, run_id: runId, version: VERSION,
      mode: perClient ? "per_client" : "all_client",
      total_processed: totalProcessed, total_succeeded: totalSucceeded, total_failed: totalFailed,
      total_first_time: totalFirstTime,
      format_performance: { windows_computed: formatPerfResult.windows_computed, errors: formatPerfResult.errors },
      clients: clientSummaries,
    });
  } catch (e: any) {
    // F4: redact top-level error text too.
    return jsonResponse({ ok: false, run_id: runId, version: VERSION, error: safeErr(e?.message ?? e) }, 500);
  }
});
