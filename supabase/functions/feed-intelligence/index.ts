import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "feed-intelligence-v1.0.0";

// Thresholds
const GIVE_UP_THRESHOLD_PCT = 70;     // flag for deprecate if >= this
const GIVE_UP_MIN_ITEMS = 5;           // minimum items before deprecate fires
const ZERO_SUCCESS_DAYS = 30;          // flag for review if 0 successes in this window
const ZERO_SUCCESS_MIN_AGE_DAYS = 14;  // feed must be at least this old before review fires
const WATCH_GIVE_UP_PCT = 50;          // flag for watch if >= this (below deprecate threshold)

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

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === "GET") return jsonResponse({ ok: true, function: "feed-intelligence", version: VERSION });

  const supabase = getServiceClient();
  const now = new Date();
  const analysisWindow14d = new Date(now.getTime() - 14 * 24 * 60 * 60_000).toISOString();
  const analysisWindow30d = new Date(now.getTime() - 30 * 24 * 60 * 60_000).toISOString();

  const summary = {
    sources_analysed: 0,
    recommendations_written: 0,
    deprecate: 0,
    review: 0,
    watch: 0,
    healthy: 0,
    errors: [] as string[],
  };

  try {
    const { data: sources, error: srcErr } = await supabase
      .schema("f")
      .from("feed_source")
      .select("source_id, source_name, created_at")
      .eq("status", "active");

    if (srcErr) throw new Error(`load_sources: ${srcErr.message}`);
    if (!sources?.length) return jsonResponse({ ok: true, version: VERSION, message: "no_active_sources", ...summary });

    summary.sources_analysed = sources.length;

    for (const source of sources) {
      try {
        const statsQuery = await supabase.rpc("get_feed_stats", {
          p_source_id: source.source_id,
          p_since_14d: analysisWindow14d,
          p_since_30d: analysisWindow30d,
        });

        if (statsQuery.error) {
          summary.errors.push(`${source.source_name}: stats_rpc_failed: ${statsQuery.error.message}`);
          continue;
        }

        const stats = statsQuery.data as {
          total_14d: number;
          give_ups_14d: number;
          successes_14d: number;
          successes_30d: number;
          give_up_pct_14d: number;
        };

        const total = stats.total_14d ?? 0;
        const giveUpPct = stats.give_up_pct_14d ?? 0;
        const successes30d = stats.successes_30d ?? 0;
        const sourceAgeDays = (now.getTime() - new Date(source.created_at).getTime()) / (24 * 60 * 60_000);

        let recType: string | null = null;
        let reason = "";

        if (total >= GIVE_UP_MIN_ITEMS && giveUpPct >= GIVE_UP_THRESHOLD_PCT) {
          recType = "deprecate";
          reason = `Give-up rate ${giveUpPct.toFixed(1)}% over last 14 days (${stats.give_ups_14d}/${total} items). Threshold: ${GIVE_UP_THRESHOLD_PCT}%.`;
        } else if (sourceAgeDays >= ZERO_SUCCESS_MIN_AGE_DAYS && total > 0 && successes30d === 0) {
          recType = "review";
          reason = `Zero successful content fetches in last 30 days despite ${total} items ingested. Source may be low-value or inaccessible.`;
        } else if (total >= GIVE_UP_MIN_ITEMS && giveUpPct >= WATCH_GIVE_UP_PCT) {
          recType = "watch";
          reason = `Give-up rate ${giveUpPct.toFixed(1)}% over last 14 days — elevated but below deprecation threshold.`;
        } else {
          summary.healthy++;
          continue;
        }

        const { error: upsertErr } = await supabase
          .schema("m")
          .from("agent_recommendations")
          .upsert(
            {
              agent: "feed-intelligence",
              source_id: source.source_id,
              recommendation_type: recType,
              reason,
              stats: {
                source_name: source.source_name,
                total_14d: total,
                give_ups_14d: stats.give_ups_14d,
                successes_14d: stats.successes_14d,
                successes_30d,
                give_up_pct_14d: giveUpPct,
                analysed_at: now.toISOString(),
              },
              status: "pending",
            },
            { onConflict: "source_id,recommendation_type", ignoreDuplicates: false }
          );

        if (upsertErr && !upsertErr.message.includes("duplicate")) {
          summary.errors.push(`${source.source_name}: upsert_failed: ${upsertErr.message}`);
          continue;
        }

        summary.recommendations_written++;
        if (recType === "deprecate") summary.deprecate++;
        else if (recType === "review") summary.review++;
        else if (recType === "watch") summary.watch++;

      } catch (e: any) {
        summary.errors.push(`${source.source_name}: ${e?.message ?? String(e)}`);
      }
    }
  } catch (e: any) {
    return jsonResponse({ ok: false, version: VERSION, error: (e?.message ?? String(e)).slice(0, 800) }, 500);
  }

  return jsonResponse({ ok: true, version: VERSION, ...summary });
});
