import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "insights-worker-v1.6.0";
const GRAPH_VERSION = "v19.0";
const MAX_POSTS_PER_RUN = 50;
const INSIGHTS_PERIOD = "lifetime";

// New Pages Experience metric availability (pages created ~2023+):
// - post_impressions_unique  WORKS  → stored as reach
// - post_impressions         BROKEN → stored as null (no replacement available)
// - post_engaged_users       BROKEN → derived from reactions+comments+shares
//
// Reference: https://developers.facebook.com/docs/graph-api/reference/insights

const METRICS_TO_TRY: { key: string; names: string[] }[] = [
  // reach: unique accounts who saw the post
  { key: "reach", names: ["post_impressions_unique"] },
  // impressions: total views - try 28d window variant first, then classic
  { key: "impressions", names: ["post_impressions_unique_28d", "post_impressions"] },
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

function nowIso() {
  return new Date().toISOString();
}

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
  postId: string,
  pageToken: string,
  metricNames: string[],
): Promise<{ value: number; metricName: string } | null> {
  const encodedId = encodeURIComponent(postId);
  const encodedToken = encodeURIComponent(pageToken);

  for (const metricName of metricNames) {
    const url =
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodedId}/insights` +
      `?metric=${metricName}&period=${INSIGHTS_PERIOD}&access_token=${encodedToken}`;
    try {
      const resp = await fetch(url);
      const text = await resp.text();
      let parsed: any;
      try { parsed = JSON.parse(text); } catch { continue; }
      if (parsed?.error) continue;
      const val = parsed?.data?.[0]?.values?.[0]?.value ?? parsed?.data?.[0]?.value;
      return { value: Number(val) || 0, metricName };
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchPostInsights(
  platformPostId: string,
  pageToken: string,
): Promise<{
  impressions: number | null;
  reach: number | null;
  engaged_users: number | null;
  reactions: number;
  comments: number;
  shares: number;
  metricNamesUsed: Record<string, string>;
  failedMetrics: string[];
}> {
  const encodedId = encodeURIComponent(platformPostId);
  const encodedToken = encodeURIComponent(pageToken);
  const metricResults: Record<string, number | null> = {};
  const metricNamesUsed: Record<string, string> = {};
  const failedMetrics: string[] = [];

  for (const { key, names } of METRICS_TO_TRY) {
    const result = await fetchSingleMetric(platformPostId, pageToken, names);
    if (result) {
      metricResults[key] = result.value;
      metricNamesUsed[key] = result.metricName;
    } else {
      metricResults[key] = null;
      failedMetrics.push(key);
    }
  }

  // Post object: reactions, comments, shares always available with page token
  const postUrl =
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodedId}` +
    `?fields=reactions.summary(true),comments.limit(0).summary(true),shares` +
    `&access_token=${encodedToken}`;

  let postParsed: any = {};
  try {
    const postResp = await fetch(postUrl);
    const postText = await postResp.text();
    try { postParsed = JSON.parse(postText); } catch { postParsed = {}; }
    if (postParsed?.error) postParsed = {};
  } catch { postParsed = {}; }

  const reactions = Number(postParsed?.reactions?.summary?.total_count) || 0;
  const comments = Number(postParsed?.comments?.summary?.total_count) || 0;
  const shares = Number(postParsed?.shares?.count) || 0;

  // engaged_users derived from post object when API metric unavailable
  // This undercounts (excludes clicks/views) but is consistent and honest
  const derivedEngaged = reactions + comments + shares;

  return {
    impressions: metricResults["impressions"] ?? null,
    reach: metricResults["reach"] ?? null,
    engaged_users: derivedEngaged > 0 ? derivedEngaged : null,
    reactions,
    comments,
    shares,
    metricNamesUsed,
    failedMetrics,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method === "GET") {
    return jsonResponse({ ok: true, function: "insights-worker", version: VERSION });
  }

  let postsProcessed = 0;
  let postsSucceeded = 0;
  let postsFailed = 0;
  const errors: { post_publish_id: string; platform_post_id: string; error: string }[] = [];
  const metricNamesSample: Record<string, string> = {};

  try {
    const supabase = getServiceClient();

    const { data: profiles, error: profErr } = await supabase
      .schema("c")
      .from("client_publish_profile")
      .select("client_id, destination_id, credential_env_key")
      .eq("platform", "facebook")
      .eq("status", "active");

    if (profErr) return jsonResponse({ ok: false, error: "load_profiles_failed", detail: profErr }, 500);

    const activeProfiles = (profiles ?? []) as PublishProfile[];
    if (!activeProfiles.length) {
      return jsonResponse({ ok: true, version: VERSION, message: "no_active_profiles", posts_processed: 0, posts_succeeded: 0, posts_failed: 0 });
    }

    const allPosts: { post: PublishedPost; pageToken: string }[] = [];
    const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

    for (const profile of activeProfiles) {
      const tokenKey = (profile.credential_env_key ?? "").toString();
      if (!tokenKey) continue;
      const pageToken = Deno.env.get(tokenKey);
      if (!pageToken) continue;

      const { data: posts, error: postsErr } = await supabase
        .schema("m")
        .from("post_publish")
        .select("post_publish_id, client_id, platform_post_id, destination_id")
        .eq("client_id", profile.client_id)
        .eq("platform", "facebook")
        .eq("status", "published")
        .not("platform_post_id", "is", null)
        .lt("published_at", cutoff);

      if (postsErr) {
        errors.push({ post_publish_id: "", platform_post_id: "", error: `load_posts_failed: ${postsErr.message}` });
        continue;
      }

      for (const post of posts ?? []) {
        allPosts.push({ post: post as PublishedPost, pageToken });
        if (allPosts.length >= MAX_POSTS_PER_RUN) break;
      }
      if (allPosts.length >= MAX_POSTS_PER_RUN) break;
    }

    for (const { post, pageToken } of allPosts) {
      postsProcessed++;
      try {
        const metrics = await fetchPostInsights(post.platform_post_id, pageToken);
        Object.assign(metricNamesSample, metrics.metricNamesUsed);

        const reach = metrics.reach ?? 0;
        const engagedUsers = metrics.engaged_users ?? 0;

        const { error: upsertErr } = await supabase
          .schema("m")
          .from("post_performance")
          .upsert(
            {
              post_publish_id: post.post_publish_id,
              client_id: post.client_id,
              platform: "facebook",
              platform_post_id: post.platform_post_id,
              reach: metrics.reach,
              impressions: metrics.impressions,
              engaged_users: metrics.engaged_users,
              reactions: metrics.reactions,
              comments: metrics.comments,
              shares: metrics.shares,
              clicks: null,
              engagement_rate: reach > 0 ? engagedUsers / reach : null,
              collected_at: nowIso(),
              insights_period: INSIGHTS_PERIOD,
              raw_payload: {
                metric_names_used: metrics.metricNamesUsed,
                failed_metrics: metrics.failedMetrics,
                source_note: "engaged_users derived from reactions+comments+shares when post_engaged_users unavailable",
              },
            },
            { onConflict: "platform_post_id,insights_period" }
          );

        if (upsertErr) throw new Error(`upsert_failed: ${upsertErr.message}`);
        postsSucceeded++;
      } catch (e: any) {
        postsFailed++;
        errors.push({ post_publish_id: post.post_publish_id, platform_post_id: post.platform_post_id, error: (e?.message ?? String(e)).slice(0, 800) });
      }
    }
  } catch (e: any) {
    return jsonResponse({ ok: false, version: VERSION, error: (e?.message ?? String(e)).slice(0, 800) }, 500);
  }

  return jsonResponse({
    ok: true,
    version: VERSION,
    posts_processed: postsProcessed,
    posts_succeeded: postsSucceeded,
    posts_failed: postsFailed,
    metric_names_used: metricNamesSample,
    ...(errors.length ? { errors } : {}),
  });
});
