import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "insights-worker-v14.5.0";
// v14.5.0 (2026-06-19, ENGAGEMENT-SIGNAL-RECOVERY A1): reach metric FAIL-SAFE fallback list.
//   post_impressions_unique now returns (#100) for Invegent (deprecated / mid-rollout per
//   Session-2 A0) while post_clicks + post_reactions_by_type_total return 200 on the same objects
//   → Invegent reach was all NULL. Fix (add-fallbacks-only, no new logic): the reach MetricSpec now
//   tries ["post_impressions_unique", "post_impressions"]. post_impressions_unique
//   stays FIRST so still-working cases are unchanged; fetchSingleMetric already iterates names and
//   records EVERY attempt in raw_payload.calls; the first 200 wins; if ALL fail, reach stays NULL
//   (no false zero) and engagement_rate stays NULL. No backfill — normal collection self-probes and
//   reveals which metric lands. NB: v14.2.0 found post_impressions #100 across all four clients on
//   2026-06-12; re-added here ONLY as a fail-safe self-probe candidate (rollout is in flux → may now
//   200 for some objects; harmless if it #100s). (post_media_view was considered but DROPPED after
//   Session-2 review flagged its validity as unverified — A1 scope forbids a live Graph probe.)
// v14.4.1 (2026-06-19, F-INSIGHTS-WORKER-COLLECTION-RUNTIME): runtime tuning only —
//   MAX_POSTS_PER_CLIENT 50→25 so a per-client collection run (~3s/post observed) finishes
//   ~75s, comfortably under the ~150s EF wall-clock and the 120s cron net.http_post timeout.
//   Coverage preserved by the v14.1.0 never-collected-first / stalest-collected_at ordering
//   across the per-client daily crons (large clients cycle in ~10 days, inside the 30-day
//   window). No logic change — pure constant + version bump.
// v14.4.0 (2026-06-19, F-INSIGHTS-WORKER-WINDOW30-90-FRESHNESS): complete recovery.
//   - Per-client cron selector now HONORED: the 4 crons POST a JSON body
//     {"client_publish_profile_id":"<uuid>"} (one client each). The handler parses
//     the body defensively (try/catch around req.json(); any error/non-JSON → {})
//     and scopes the heavy collection loop to a SINGLE profile, ending the ~150s
//     all-client sweep that exhausted the wall-clock budget.
//   - D-A2 aggregation-only fallback: scope_mode is decided after aggregation —
//       client_publish_profile_id present → collect only that profile ("client_scoped");
//       all_clients===true → collect all profiles ("all_clients_explicit");
//       otherwise (no/invalid body, no selector) → collect NOTHING ("no_client_scope").
//     The empty-collection default is deliberate: a malformed cron body must NOT
//     silently re-trigger the full multi-client sweep.
//   - Aggregation-first RETAINED (v14.3.0): computeFormatPerformance() still runs
//     FIRST and GLOBALLY over ALL active FB client_ids every run, before any
//     collection, so windows 30/90 can never be starved by the collection loop.
//   - Additive only: PublishProfile gains client_publish_profile_id (PK column) +
//     the profile SELECT loads it; the success response gains a scope_mode field.
//     computeFormatPerformance, fetchPostInsights, fetchSingleMetric, processClient,
//     METRICS_TO_TRY, token handling, engagement/NULL semantics, and raw_payload are
//     all byte-identical to v14.2.0/v14.3.0.
// v14.3.0 (2026-06-19, F-INSIGHTS-WORKER-WINDOW30-90-FRESHNESS): pure statement
//   reorder — computeFormatPerformance() (windows 30/90 aggregation) now runs
//   FIRST, right after activeProfiles is resolved and BEFORE the heavy per-client
//   Facebook collection loop, so the ~150s wall-clock kill in collection can no
//   longer starve the cheap window aggregation (frozen since 2026-06-12). No
//   behavioural/shape change; final response still returns formatPerfResult.
// v14.2.0 (2026-06-12, F-OPTIONC-ENGAGEMENT-EVIDENCE-NULL Fix 1, Stage R verified):
//   - post_engaged_users and post_impressions REMOVED: both return (#100)
//     invalid metric under the actually-served Graph version (v19 sunset →
//     Meta silently served v24.0; version now pinned explicitly).
//   - Engagement basis (canonical): reactions+comments+shares when the post
//     fields call succeeds (200); else total reactions from
//     post_reactions_by_type_total (proven 200 without pages_read_engagement).
//     Clicks excluded from the basis. engaged_users column now stores this
//     basis count. engagement_rate = basis/reach from trustworthy 200 inputs
//     only; failed reads are NULL, never 0 (incl. reach — was coerced via ??0).
//   - Fields call (R/C/S) retained behind failure-visible recording: it fails
//     (#10) APP-level (denied App Review) — auto-heals when the Meta-side
//     carry lands; per-row call record is the live permission signal.
//   - raw_payload now carries per-call records {source, http_status,
//     fb_error_code, fb_error_message, value_present} + engagement_basis_source.
//   - L-StageR-paging: paging blocks deleted post-parse, never logged/persisted.
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

const GRAPH_VERSION = "v24.0"; // pinned to served version (v14.2.0) — v19 sunset; silent auto-upgrade caused the dead-metric failure mode
const MAX_POSTS_PER_CLIENT = 25; // v14.4.1 F-INSIGHTS-WORKER-COLLECTION-RUNTIME: ~3s/post → ≤25 keeps a per-client run ~75s, under the EF wall-clock + 120s cron timeout (was 50 → ~150s overrun)
const INSIGHTS_PERIOD = "lifetime";

type MetricSpec = { key: string; names: string[]; sumObjectValues?: boolean };
const METRICS_TO_TRY: MetricSpec[] = [
  // v14.5.0 A1: reach fail-safe fallback list — tried in order, every attempt recorded in
  // raw_payload.calls; first 200 wins; all-fail → reach NULL (no false zero). post_impressions_unique
  // stays FIRST (working cases unchanged); it now #100s for Invegent (Session-2 A0) so the fallbacks
  // self-probe a working reach metric without a live Graph probe or any backfill.
  { key: "reach",           names: ["post_impressions_unique", "post_impressions"] },
  { key: "clicks",          names: ["post_clicks"] },
  { key: "reactions_total", names: ["post_reactions_by_type_total"], sumObjectValues: true },
];
// v14.2.0: post_engaged_users + post_impressions removed — (#100) invalid
// under served Graph version (Stage R 2026-06-12, all four clients/tokens).

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
  client_publish_profile_id: string; // PK (uuid) — v14.4.0 per-client cron selector
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

type MetricCallRecord = {
  source: string;                    // metric name or "post_fields_rcs"
  http_status: number | null;
  fb_error_code: number | null;
  fb_error_message: string | null;   // truncated 140 chars; never raw body
  value_present: boolean;            // true = trustworthy 200 read (0 is a REAL 0)
};

async function fetchSingleMetric(
  postId: string, pageToken: string, spec: MetricSpec, calls: MetricCallRecord[],
): Promise<{ value: number | null; metricName: string | null }> {
  for (const metricName of spec.names) {
    const rec: MetricCallRecord = { source: metricName, http_status: null, fb_error_code: null, fb_error_message: null, value_present: false };
    const url =
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(postId)}/insights` +
      `?metric=${metricName}&period=${INSIGHTS_PERIOD}&access_token=${encodeURIComponent(pageToken)}`;
    try {
      const resp = await fetch(url);
      rec.http_status = resp.status;
      const text = await resp.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { parsed = null; }
      if (parsed && typeof parsed === "object" && "paging" in parsed) delete parsed.paging; // L-StageR-paging: paging URLs echo the token
      if (!parsed) { rec.fb_error_message = "unparseable_response"; calls.push(rec); continue; }
      if (parsed.error) {
        rec.fb_error_code = parsed.error.code ?? null;
        rec.fb_error_message = String(parsed.error.message ?? "").slice(0, 140);
        calls.push(rec); continue;
      }
      const raw = parsed?.data?.[0]?.values?.[0]?.value ?? parsed?.data?.[0]?.value;
      if (spec.sumObjectValues && raw != null && typeof raw === "object") {
        // post_reactions_by_type_total: by-type map; {} = genuine zero on 200
        const total = Object.values(raw).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
        rec.value_present = true; calls.push(rec);
        return { value: total, metricName };
      }
      if (raw == null) { rec.fb_error_message = "no_value_in_200"; calls.push(rec); continue; }
      const n = Number(raw);
      if (!Number.isFinite(n)) { rec.fb_error_message = "non_numeric_value"; calls.push(rec); continue; }
      rec.value_present = true; calls.push(rec);
      return { value: n, metricName };
    } catch (e: any) {
      rec.fb_error_message = String(e?.message ?? e).slice(0, 140);
      calls.push(rec); continue;
    }
  }
  return { value: null, metricName: null }; // NULL on failure — never 0
}

async function fetchPostInsights(platformPostId: string, pageToken: string) {
  const metricResults: Record<string, number | null> = {};
  const metricNamesUsed: Record<string, string> = {};
  const failedMetrics: string[] = [];
  const calls: MetricCallRecord[] = [];

  for (const spec of METRICS_TO_TRY) {
    const result = await fetchSingleMetric(platformPostId, pageToken, spec, calls);
    metricResults[spec.key] = result.value;
    if (result.metricName) metricNamesUsed[spec.key] = result.metricName;
    if (result.value == null) failedMetrics.push(spec.key);
  }

  // Post-level fields: reactions, comments, shares. Known-failing (#10) at
  // APP level (Stage R + new-token retest 2026-06-12 — fails even on tokens
  // whose debug_token shows pages_read_engagement). Retained behind
  // failure-visible recording: auto-heals with zero deploys when the
  // Meta-side carry (§3a) lands; the per-row record is the live signal.
  const fieldsRec: MetricCallRecord = { source: "post_fields_rcs", http_status: null, fb_error_code: null, fb_error_message: null, value_present: false };
  let fReactions: number | null = null, fComments: number | null = null, fShares: number | null = null;
  const postUrl =
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(platformPostId)}` +
    `?fields=reactions.summary(true),comments.limit(0).summary(true),shares` +
    `&access_token=${encodeURIComponent(pageToken)}`;
  try {
    const postResp = await fetch(postUrl);
    fieldsRec.http_status = postResp.status;
    const postText = await postResp.text();
    let postParsed: any = null;
    try { postParsed = JSON.parse(postText); } catch { postParsed = null; }
    if (postParsed && typeof postParsed === "object" && "paging" in postParsed) delete postParsed.paging; // L-StageR-paging
    if (postParsed?.error) {
      fieldsRec.fb_error_code = postParsed.error.code ?? null;
      fieldsRec.fb_error_message = String(postParsed.error.message ?? "").slice(0, 140);
    } else if (postResp.status === 200 && postParsed) {
      fieldsRec.value_present = true; // genuine read — zeros below are REAL zeros
      fReactions = Number(postParsed?.reactions?.summary?.total_count ?? 0) || 0;
      fComments  = Number(postParsed?.comments?.summary?.total_count ?? 0) || 0;
      fShares    = Number(postParsed?.shares?.count ?? 0) || 0;
    } else {
      fieldsRec.fb_error_message = "unparseable_or_non_200";
    }
  } catch (e: any) {
    fieldsRec.fb_error_message = String(e?.message ?? e).slice(0, 140);
  }
  calls.push(fieldsRec);

  // Engagement basis (v14.2.0 canonical): trustworthy 200 inputs ONLY.
  const reactionsTotal = metricResults["reactions_total"];
  let engagementBasis: number | null = null;
  let engagementBasisSource: string | null = null;
  if (fieldsRec.value_present) {
    engagementBasis = (fReactions ?? 0) + (fComments ?? 0) + (fShares ?? 0);
    engagementBasisSource = "fields_rcs";
  } else if (reactionsTotal != null) {
    engagementBasis = reactionsTotal;
    engagementBasisSource = "reactions_by_type_total";
  }

  const reach = metricResults["reach"];   // NULL-preserving (was `?? 0`)
  const clicks = metricResults["clicks"];
  const reactions = fieldsRec.value_present ? fReactions : reactionsTotal; // same quantity, two endpoints
  const comments  = fieldsRec.value_present ? fComments : null;
  const shares    = fieldsRec.value_present ? fShares : null;
  const engaged_users = engagementBasis;  // semantic change: canonical basis count
  const impressions: number | null = null; // post_impressions removed; column kept for compat
  const engagement_rate = reach != null && reach > 0 && engagementBasis != null
    ? engagementBasis / reach : null;

  return {
    impressions, reach, engaged_users, reactions, comments, shares, clicks,
    engagement_rate,
    metricNamesUsed, failedMetrics, calls,
    engagementBasisSource,
  };
}

async function processClient(
  supabase: ReturnType<typeof getServiceClient>,
  profile: PublishProfile,
  pageToken: string,
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
    LIMIT ${MAX_POSTS_PER_CLIENT}
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
            calls:             metrics.calls,
            engagement_basis_source: metrics.engagementBasisSource,
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === "GET") return jsonResponse({ ok: true, function: "insights-worker", version: VERSION });

  // v14.4.0: parse optional scope from the request body DEFENSIVELY. The 4 crons
  // POST {"client_publish_profile_id":"<uuid>"} (one client each). Any error or
  // non-JSON body is treated as {} — a bad body must NEVER throw or widen scope.
  let body: { client_publish_profile_id?: string; all_clients?: boolean } = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object") body = parsed;
  } catch { body = {}; }

  const clientSummaries: Record<string, any> = {};
  let totalProcessed = 0, totalSucceeded = 0, totalFailed = 0, totalFirstTime = 0;

  try {
    const supabase = getServiceClient();

    const { data: profiles, error: profErr } = await supabase
      .schema("c").from("client_publish_profile")
      .select("client_publish_profile_id, client_id, destination_id, credential_env_key, page_access_token")
      .eq("platform", "facebook")
      .eq("status", "active")
      .eq("publish_enabled", true);

    if (profErr) return jsonResponse({ ok: false, error: "load_profiles_failed", detail: profErr }, 500);

    const activeProfiles = (profiles ?? []) as PublishProfile[];
    if (!activeProfiles.length) return jsonResponse({ ok: true, version: VERSION, message: "no_active_profiles", total_processed: 0 });

    // v14.3.0 (F-INSIGHTS-WORKER-WINDOW30-90-FRESHNESS): run the cheap window-30/90
    // aggregation FIRST. It reads only already-collected m.post_performance rows
    // (collection upserts those incrementally and stays fresh on its own), so it
    // must not sit behind the heavy per-client Facebook collection loop — that loop
    // exhausts the ~150s wall-clock budget and was killing this tail before it
    // committed, freezing windows 30/90 since 2026-06-12.
    const allClientIds = activeProfiles.map(p => p.client_id);
    const formatPerfResult = await computeFormatPerformance(supabase, allClientIds);
    console.log(`[insights-worker] format_performance: ${formatPerfResult.windows_computed} windows, ${formatPerfResult.errors.length} errors`);

    // v14.4.0 D-A2: scope the heavy collection loop. Aggregation above stays
    // GLOBAL; only collection is scoped by the cron body.
    //   - client_publish_profile_id (non-empty string) → that one profile.
    //   - all_clients === true → every profile (explicit opt-in).
    //   - otherwise (no/invalid body, no selector) → NOTHING (aggregation-only).
    // The empty default is the safety property: a malformed cron body must not
    // silently re-trigger the full multi-client sweep that exhausts wall-clock.
    let profilesToCollect: PublishProfile[];
    let scope_mode: string;
    if (typeof body.client_publish_profile_id === "string" && body.client_publish_profile_id.length > 0) {
      const target = body.client_publish_profile_id;
      profilesToCollect = activeProfiles.filter(p => p.client_publish_profile_id === target);
      scope_mode = "client_scoped";
    } else if (body.all_clients === true) {
      profilesToCollect = activeProfiles;
      scope_mode = "all_clients_explicit";
    } else {
      profilesToCollect = [];
      scope_mode = "no_client_scope";
    }
    console.log(`[insights-worker] scope_mode=${scope_mode} profiles_to_collect=${profilesToCollect.length}`);

    for (const profile of profilesToCollect) {
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
        continue;
      }

      const result = await processClient(supabase, profile, pageToken);
      clientSummaries[profile.client_id] = { ...result, token_source: tokenSource };
      totalProcessed += result.processed;
      totalSucceeded += result.succeeded;
      totalFailed += result.failed;
      totalFirstTime += result.first_time;
    }

    return jsonResponse({
      ok: true, version: VERSION,
      scope_mode,
      total_processed: totalProcessed, total_succeeded: totalSucceeded, total_failed: totalFailed,
      total_first_time: totalFirstTime,
      format_performance: { windows_computed: formatPerfResult.windows_computed, errors: formatPerfResult.errors },
      clients: clientSummaries,
    });
  } catch (e: any) {
    return jsonResponse({ ok: false, version: VERSION, error: (e?.message ?? String(e)).slice(0, 800) }, 500);
  }
});
