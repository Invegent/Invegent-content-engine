import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "1.0.0";

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
  seed_type: "url" | "keyword";
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
  if (!rssappApiKey) {
    return jsonResponse({ ok: false, error: "RSSAPP_API_KEY not set" }, 500);
  }

  const supabase = getServiceClient();
  const summary = { processed: 0, provisioned: 0, failed: 0, skipped: 0 };

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
        // Call RSS.app API
        const feed = await createRSSAppFeed(rssappApiKey, seed);

        // Check if feed_source already has this rss_feed_url
        const { data: existing } = await supabase.rpc("exec_sql", {
          query: `SELECT source_id FROM f.feed_source WHERE config->>'url' = '${feed.rss_feed_url.replace(/'/g, "''")}' LIMIT 1`,
        });

        let feedSourceId: string | null = null;

        if (existing && existing.length > 0) {
          // Already exists — link but don't duplicate
          feedSourceId = existing[0].source_id;
          summary.skipped++;
        } else {
          // Insert new feed_source via SECURITY DEFINER function
          const sourceName = seed.label || feed.title || seed.seed_value;
          const config = {
            url: feed.rss_feed_url,
            rssapp_feed_id: feed.id,
            seed_type: seed.seed_type,
            seed_value: seed.seed_value,
          };
          if (seed.vertical_slug) {
            (config as Record<string, unknown>).vertical_slug = seed.vertical_slug;
          }

          const { data: newId, error: insertErr } = await supabase.rpc(
            "create_feed_source_rss",
            {
              p_source_name: sourceName,
              p_source_type_code: "rss_app",
              p_config: config,
            },
          );

          if (insertErr) throw new Error(`Insert feed_source: ${insertErr.message}`);
          feedSourceId = newId;
        }

        // Update seed as provisioned
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
      } catch (err) {
        // Mark seed as failed
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`Seed ${seed.seed_id} failed:`, errMsg);

        await supabase.rpc("update_feed_discovery_seed", {
          p_seed_id: seed.seed_id,
          p_status: "failed",
          p_error_message: errMsg.slice(0, 500),
        });

        summary.failed++;
      }

      // Rate limit: 500ms between API calls
      await delay(500);
    }

    return jsonResponse({ ok: true, ...summary, version: VERSION });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("feed-discovery error:", msg);
    return jsonResponse({ ok: false, error: msg, ...summary, version: VERSION }, 500);
  }
});
