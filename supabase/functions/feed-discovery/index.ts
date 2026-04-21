import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "1.1.0";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface Seed {
  seed_id: string;
  seed_type: "url" | "keyword" | "youtube_keyword";
  seed_value: string;
  region: string;
  vertical_slug: string | null;
  label: string | null;
}

interface RSSAppFeed {
  id: string;
  rss_feed_url: string;
  title?: string;
}

interface YouTubeSearchItem {
  id: { channelId: string };
  snippet: { channelTitle: string; description: string };
}

async function createRSSAppFeed(
  apiKey: string,
  seed: Seed,
): Promise<RSSAppFeed> {
  const body: Record<string, string> =
    seed.seed_type === "url"
      ? { url: seed.seed_value }
      : { keyword: seed.seed_value, region: seed.region || "AU:en" };

  const res = await fetch("https://api.rss.app/v1/feeds", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RSS.app ${res.status}: ${text}`);
  }

  return await res.json() as RSSAppFeed;
}

async function searchYouTubeChannels(
  apiKey: string,
  keyword: string,
): Promise<YouTubeSearchItem[]> {
  const params = new URLSearchParams({
    key: apiKey,
    q: keyword,
    type: "channel",
    regionCode: "AU",
    relevanceLanguage: "en",
    maxResults: "3",
    part: "snippet",
  });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`,
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube API ${res.status}: ${text}`);
  }

  const data = await res.json();
  return (data.items ?? []) as YouTubeSearchItem[];
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  // Auth: x-publisher-key header
  const expected = Deno.env.get("PUBLISHER_API_KEY");
  const provided = req.headers.get("x-publisher-key");
  if (!expected) return jsonResponse({ ok: false, error: "PUBLISHER_API_KEY not set" }, 500);
  if (!provided || provided !== expected) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  const rssappApiKey = Deno.env.get("RSSAPP_API_KEY");
  const youtubeApiKey = Deno.env.get("ICE_YOUTUBE_DATA_API_KEY");

  const supabase = getServiceClient();
  const summary = { processed: 0, provisioned: 0, failed: 0, skipped: 0, youtube_provisioned: 0 };

  try {
    // Fetch pending seeds
    const { data: seeds, error: fetchErr } = await supabase
      .schema("f")
      .from("feed_discovery_seed")
      .select("seed_id, seed_type, seed_value, region, vertical_slug, label")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchErr) throw new Error(`Fetch seeds: ${fetchErr.message}`);
    if (!seeds || seeds.length === 0) {
      return jsonResponse({ ok: true, message: "No pending seeds", ...summary, version: VERSION });
    }

    for (const seed of seeds as Seed[]) {
      summary.processed++;

      try {
        if (seed.seed_type === "youtube_keyword") {
          // ── YouTube keyword discovery ──
          if (!youtubeApiKey) throw new Error("ICE_YOUTUBE_DATA_API_KEY not set");

          const channels = await searchYouTubeChannels(youtubeApiKey, seed.seed_value);

          if (channels.length === 0) {
            throw new Error("YouTube API returned 0 channels");
          }

          let firstSourceId: string | null = null;

          for (const item of channels) {
            const channelId = item.id.channelId;
            const channelTitle = item.snippet.channelTitle;

            const { data: sourceId, error: insertErr } = await supabase.rpc(
              "create_feed_source_youtube_channel",
              {
                p_source_name: channelTitle,
                p_channel_id: channelId,
                p_channel_name: channelTitle,
                p_added_by: "discovery_pipeline",
              },
            );

            if (insertErr) {
              console.error(`Insert YT channel ${channelId}:`, insertErr.message);
              continue;
            }

            if (!firstSourceId) firstSourceId = sourceId;
            await delay(500);
          }

          // Mark seed as provisioned using first channel
          const { error: updateErr } = await supabase.rpc(
            "update_feed_discovery_seed",
            {
              p_seed_id: seed.seed_id,
              p_status: "provisioned",
              p_rssapp_feed_id: channels[0].id.channelId,
              p_rssapp_feed_url: `https://www.youtube.com/feeds/videos.xml?channel_id=${channels[0].id.channelId}`,
              p_feed_source_id: firstSourceId,
            },
          );
          if (updateErr) console.error(`Update seed ${seed.seed_id}:`, updateErr.message);

          summary.provisioned++;
          summary.youtube_provisioned += channels.length;

        } else {
          // ── RSS.app discovery (url / keyword) ──
          if (!rssappApiKey) throw new Error("RSSAPP_API_KEY not set");

          const feed = await createRSSAppFeed(rssappApiKey, seed);

          // Q2 fix: ingest EF reads config.feed_url. Pre-Q2 this dedup query
          // looked at config.url, so it stayed consistent with the INSERT below —
          // but both keys were wrong per the ingest contract. Renamed both.
          const { data: existing } = await supabase.rpc("exec_sql", {
            query: `SELECT source_id FROM f.feed_source WHERE config->>'feed_url' = '${feed.rss_feed_url.replace(/'/g, "''")}' LIMIT 1`,
          });

          let feedSourceId: string | null = null;

          if (existing && existing.length > 0) {
            feedSourceId = existing[0].source_id;
            summary.skipped++;
          } else {
            const sourceName = seed.label || feed.title || seed.seed_value;
            // Q2 fix: ingest EF reads config.feed_url. Pre-Q2 this was 'url' which
            // caused 14 historical feeds to silently fail every ingest cron.
            const config: Record<string, unknown> = {
              feed_url: feed.rss_feed_url,
              rssapp_feed_id: feed.id,
              seed_type: seed.seed_type,
              seed_value: seed.seed_value,
            };
            if (seed.vertical_slug) {
              config.vertical_slug = seed.vertical_slug;
            }

            const { data: newId, error: insertErr } = await supabase.rpc(
              "create_feed_source_rss",
              {
                p_source_name: sourceName,
                p_source_type_code: "rss_app",
                p_config: config,
                p_content_origin: null,
                p_added_by: "discovery_pipeline",
              },
            );

            if (insertErr) throw new Error(`Insert feed_source: ${insertErr.message}`);
            feedSourceId = newId;
          }

          const { error: updateErr } = await supabase.rpc(
            "update_feed_discovery_seed",
            {
              p_seed_id: seed.seed_id,
              p_status: "provisioned",
              p_rssapp_feed_id: feed.id,
              p_rssapp_feed_url: feed.rss_feed_url,
              p_feed_source_id: feedSourceId,
            },
          );
          if (updateErr) console.error(`Update seed ${seed.seed_id}:`, updateErr.message);

          summary.provisioned++;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`Seed ${seed.seed_id} failed:`, errMsg);

        await supabase.rpc("update_feed_discovery_seed", {
          p_seed_id: seed.seed_id,
          p_status: "failed",
          p_error_message: errMsg.slice(0, 500),
        });

        summary.failed++;
      }

      // Rate limit between API calls
      await delay(500);
    }

    return jsonResponse({ ok: true, ...summary, version: VERSION });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("feed-discovery error:", msg);
    return jsonResponse({ ok: false, error: msg, ...summary, version: VERSION }, 500);
  }
});
