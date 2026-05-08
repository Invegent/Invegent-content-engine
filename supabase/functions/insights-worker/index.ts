import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "insights-worker-v14.0.0";
// v14.0.0: Fix impressions metric name.
// 'post_impressions_unique_28d' is not a valid Facebook Graph API metric.
// Correct names: 'post_impressions' (total) and 'post_impressions_unique' (unique reach).
// Also added 'post_engaged_users' as a direct metric.
// Previously, impressions was failing silently for most posts causing null values.

const GRAPH_VERSION = "v19.0";
const MAX_POSTS_PER_CLIENT = 50;
const INSIGHTS_PERIOD = "lifetime";

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
  client_id: string;
  destination_id: string | null;
  credential_env_key: string | null;
};

type PublishedPost = {
  post_publish_id: string;
  client_id: string;
  platform_post_id: string;
  destination_id: string | null;
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
): Promise<{ processed: number; succeeded: number; failed: number; errors: any[] }> {
  let processed = 0, succeeded = 0, failed = 0;
  const errors: any[] = [];
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

  const { data: posts, error: postsErr } = await supabase
    .schema("m").from("post_publish")
    .select("post_publish_id, client_id, platform_post_id, destination_id")
    .eq("client_id", profile.client_id)
    .eq("platform", "facebook")
    .eq("status", "published")
    .not("platform_post_id", "is", null)
    .lt("published_at", cutoff)
    .limit(MAX_POSTS_PER_CLIENT);

  if (postsErr) {
    errors.push({ error: `load_posts_failed: ${postsErr.message}` });
    return { processed, succeeded, failed, errors };
  }

  for (const post of posts ?? []) {
    const p = post as PublishedPost;
    processed++;
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

  return { processed, succeeded, failed, errors };
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

  const clientSummaries: Record<string, any> = {};
  let totalProcessed = 0, totalSucceeded = 0, totalFailed = 0;

  try {
    const supabase = getServiceClient();

    const { data: profiles, error: profErr } = await supabase
      .schema("c").from("client_publish_profile")
      .select("client_id, destination_id, credential_env_key")
      .eq("platform", "facebook")
      .eq("status", "active")
      .eq("publish_enabled", true);

    if (profErr) return jsonResponse({ ok: false, error: "load_profiles_failed", detail: profErr }, 500);

    const activeProfiles = (profiles ?? []) as PublishProfile[];
    if (!activeProfiles.length) return jsonResponse({ ok: true, version: VERSION, message: "no_active_profiles", total_processed: 0 });

    for (const profile of activeProfiles) {
      const tokenKey = (profile.credential_env_key ?? "").toString();
      if (!tokenKey) { clientSummaries[profile.client_id] = { skipped: true, reason: "no_credential_env_key" }; continue; }
      const pageToken = Deno.env.get(tokenKey);
      if (!pageToken) { clientSummaries[profile.client_id] = { skipped: true, reason: `secret_not_found: ${tokenKey}` }; continue; }

      const result = await processClient(supabase, profile, pageToken);
      clientSummaries[profile.client_id] = result;
      totalProcessed += result.processed;
      totalSucceeded += result.succeeded;
      totalFailed += result.failed;
    }

    const allClientIds = activeProfiles.map(p => p.client_id);
    const formatPerfResult = await computeFormatPerformance(supabase, allClientIds);
    console.log(`[insights-worker] format_performance: ${formatPerfResult.windows_computed} windows, ${formatPerfResult.errors.length} errors`);

    return jsonResponse({
      ok: true, version: VERSION,
      total_processed: totalProcessed, total_succeeded: totalSucceeded, total_failed: totalFailed,
      format_performance: { windows_computed: formatPerfResult.windows_computed, errors: formatPerfResult.errors },
      clients: clientSummaries,
    });
  } catch (e: any) {
    return jsonResponse({ ok: false, version: VERSION, error: (e?.message ?? String(e)).slice(0, 800) }, 500);
  }
});
