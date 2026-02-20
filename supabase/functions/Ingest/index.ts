import { XMLParser } from "npm:fast-xml-parser@4.3.5";
import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();
const httpClient = Deno.createHttpClient({ http2: false });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-ingest-key, apikey, authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const VERSION = "ingest-v7-write-normalize";

function getSupabaseServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in secrets");
  return createClient(url, key, { db: { schema: "f" } });
}

// Preflight
app.options("*", () => new Response(null, { status: 204, headers: corsHeaders }));

// Security gate
app.use("*", async (c, next) => {
  const expected = Deno.env.get("INGEST_API_KEY");
  const provided = c.req.header("x-ingest-key");

  if (!expected) return c.json({ ok: false, error: "INGEST_API_KEY is not set" }, 500, corsHeaders);
  if (!provided || provided !== expected) return c.json({ ok: false, error: "Unauthorized" }, 401, corsHeaders);

  await next();
});

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseRss(xml: string, maxItems: number) {
  const parser = new XMLParser({ ignoreAttributes: false });
  const obj = parser.parse(xml);

  const asArray = (v: any) => (v == null ? [] : Array.isArray(v) ? v : [v]);

  const getText = (v: any): string | null => {
    if (v == null) return null;
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "object") {
      if (v["#text"] != null) return String(v["#text"]);
    }
    return null;
  };

  const pickLink = (it: any): string | null => {
    if (typeof it?.link === "string") return it.link;
    const t = getText(it?.link);
    if (t) return t;
    if (it?.link?.["@_href"]) return String(it.link["@_href"]);
    if (Array.isArray(it?.link)) {
      const alt = it.link.find((l: any) => l?.["@_href"] && (!l?.["@_rel"] || l["@_rel"] === "alternate"));
      if (alt?.["@_href"]) return String(alt["@_href"]);
    }
    return null;
  };

  // RSS: obj.rss.channel might be object OR array
  const rssChannel = obj?.rss?.channel;
  const channel =
    rssChannel
      ? (Array.isArray(rssChannel) ? rssChannel[0] : rssChannel)
      : (obj?.feed ? (Array.isArray(obj.feed) ? obj.feed[0] : obj.feed) : null);

  const itemsRaw =
    channel?.item ?? channel?.entry ?? channel?.items ?? channel?.entries ?? [];

  const items = asArray(itemsRaw);

  return items.slice(0, maxItems).map((it: any) => {
    const title = (getText(it?.title) ?? "").toString().trim() || null;
    const link = pickLink(it);
    const guid = (getText(it?.guid) ?? getText(it?.id) ?? "").toString().trim() || null;
    const summary =
      ((getText(it?.description) ??
        getText(it?.summary) ??
        getText(it?.content) ??
        getText(it?.["content:encoded"]) ??
        "") as string)
        .toString()
        .trim()
        .slice(0, 2000) || null;


    const pubRaw = getText(it?.pubDate) ?? getText(it?.published) ?? getText(it?.updated) ?? null;
    let published_at: string | null = null;
    if (pubRaw) {
      const d = new Date(pubRaw);
      if (!Number.isNaN(d.getTime())) published_at = d.toISOString();
    }

    return { title, link, guid, published_at, summary };
  });
}


type RunFlags = {
  max_items: number;
  write: boolean;
  normalize: boolean;
  canonicalize: boolean;
  trigger_type: "manual" | "schedule" | "retry";
};

async function finalizeRun(
  supabase: any,
  run_id: string,
  items_len: number,
  inserted_raw: number,
  skipped_raw: number
) {
  const { count: error_count } = await supabase
    .from("ingest_error_log")
    .select("*", { count: "exact", head: true })
    .eq("run_id", run_id);

  const ec = Number(error_count ?? 0);
  const status = ec === 0 ? "success" : "partial";

  await supabase
    .from("ingest_run")
    .update({
      status,
      ended_at: new Date().toISOString(),
      fetched_count: items_len,
      inserted_count: inserted_raw,
      skipped_count: skipped_raw,
      updated_count: 0,
      error_count: ec,
    })
    .eq("run_id", run_id);

  return { status, error_count: ec };
}

async function runOneSource(supabase: any, source_id: string, flags: RunFlags) {
  const { max_items, write, normalize, canonicalize, trigger_type } = flags;

  const { data: src, error: srcErr } = await supabase
    .from("feed_source")
    .select("source_id, source_name, output_kind, collection_region_key, default_content_region_key, config")
    .eq("source_id", source_id)
    .maybeSingle();

  if (srcErr || !src) {
    return { ok: false, source_id, step: "load_feed_source", error: srcErr ?? "source not found" };
  }

  if (src.output_kind !== "content_item") {
    return { ok: false, source_id, step: "validate_output_kind", error: `Unsupported output_kind: ${src.output_kind}` };
  }

  const feed_url = (src.config?.feed_url ?? null) as string | null;
  if (!feed_url) {
    return { ok: false, source_id, step: "validate_config", error: "feed_source.config.feed_url is missing" };
  }

  let items: any[] = [];

  try {
    const resp = await fetch(feed_url, {
      client: httpClient,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; InvegentRSSBot/1.0)",
        "Accept": "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7",
      },
    });


    if (!resp.ok) {
      return {
        ok: false,
        source_id,
        step: "fetch_rss",
        error: `Fetch failed: ${resp.status} ${resp.statusText}`,
      };
    }

    const xml = await resp.text();
    items = parseRss(xml, max_items);
  } catch (e: any) {
    return {
      ok: false,
      source_id,
      step: "fetch_or_parse",
      error: e?.message ?? String(e),
    };
  }


  const prepared = items
    .filter((x) => x.link)
    .map((x) => ({
      external_id: x.guid ?? null,
      title: x.title ?? null,
      url: x.link!,
      published_at: x.published_at,
      payload_preview: x,
      collection_region_key: src.collection_region_key,
      content_region_key: src.default_content_region_key,
      summary: x.summary ?? null,

    }));

  if (!write) {
    return {
      ok: true,
      dry_run: true,
      source: { source_id: src.source_id, source_name: src.source_name, feed_url },
      parsed_count: items.length,
      prepared_count: prepared.length,
      sample_prepared: prepared.slice(0, 2),
    };
  }

  const { data: runRow, error: runErr } = await supabase
    .from("ingest_run")
    .insert({
      source_id: src.source_id,
      status: "running",
      trigger_type,
      ingestor_version: VERSION,
      notes: `${trigger_type} run (max_items=${max_items})`,
      collection_region_key: src.collection_region_key,
      default_content_region_key: src.default_content_region_key,
    })
    .select("run_id")
    .single();

  if (runErr || !runRow?.run_id) {
    return { ok: false, source_id, step: "create_run", error: runErr ?? "run_id missing" };
  }

  const run_id = runRow.run_id as string;

  let inserted_raw = 0;
  let skipped_raw = 0;
  const raw_ids: string[] = [];

  for (const p of prepared) {
    const { data: rawRow, error: rawErr } = await supabase
      .from("raw_content_item")
      .insert({
        source_id: src.source_id,
        run_id,
        fetched_at: new Date().toISOString(),
        external_id: p.external_id,
        url: p.url,
        published_at: p.published_at,
        title: p.title,
        payload: p.payload_preview,
        summary: p.summary ?? null,
        collection_region_key: p.collection_region_key,
        content_region_key: p.content_region_key,
      })
      .select("raw_content_item_id")
      .single();

    if (rawErr) {
      const msg = (rawErr as any)?.message ?? "";
      const isDup = msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique");

      if (isDup) {
        skipped_raw += 1;

        const { data: existing } = await supabase
          .from("raw_content_item")
          .select("raw_content_item_id")
          .eq("source_id", src.source_id)
          .eq("url", p.url)
          .order("inserted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing?.raw_content_item_id) raw_ids.push(existing.raw_content_item_id);
        continue;
      }

      await supabase.from("ingest_error_log").insert({
        run_id,
        severity: "error",
        error_message: `raw_content_item insert failed: ${msg}`,
        error_detail: rawErr,
        collection_region_key: src.collection_region_key,
        content_region_key: src.default_content_region_key,
      });
      continue;
    }

    inserted_raw += 1;
    if (rawRow?.raw_content_item_id) raw_ids.push(rawRow.raw_content_item_id);
  }

  let inserted_norm = 0;
  let skipped_norm = 0;
  const content_item_ids: string[] = [];

  if (normalize && raw_ids.length > 0) {
    for (const raw_id of raw_ids) {
      const { data: r } = await supabase
        .from("raw_content_item")
        .select("raw_content_item_id, source_id, title, url, published_at, summary, collection_region_key, content_region_key")
        .eq("raw_content_item_id", raw_id)
        .maybeSingle();

      if (!r?.url) continue;

      const { data: existingCI } = await supabase
        .from("content_item")
        .select("content_item_id")
        .eq("raw_content_item_id", r.raw_content_item_id)
        .limit(1)
        .maybeSingle();

      if (existingCI?.content_item_id) {
        skipped_norm += 1;
        content_item_ids.push(existingCI.content_item_id);
        continue;
      }

      const url = r.url.toString();
      const title = (r.title ?? "").toString();
      const source_domain = url.replace("https://", "").replace("http://", "").split("/")[0] ?? null;
      const content_hash = await sha256Hex(`${title}|${url}`);

      const { data: ci, error: ciErr } = await supabase
        .from("content_item")
        .insert({
          source_id: r.source_id,
          raw_content_item_id: r.raw_content_item_id,
          content_type: "article",
          title: r.title ?? "(untitled)",
          summary: r.summary ?? null,
          url: r.url,
          published_at: r.published_at,
          author: null,
          language: null,
          source_domain,
          content_hash,
          collection_region_key: r.collection_region_key,
          content_region_key: r.content_region_key,
        })
        .select("content_item_id")
        .single();

      if (ciErr) {
        await supabase.from("ingest_error_log").insert({
          run_id,
          severity: "error",
          error_message: `content_item insert failed: ${(ciErr as any)?.message ?? "unknown error"}`,
          error_detail: ciErr,
          collection_region_key: src.collection_region_key,
          content_region_key: src.default_content_region_key,
        });
        continue;
      }

      inserted_norm += 1;
      if (ci?.content_item_id) content_item_ids.push(ci.content_item_id);
    }
  }

  let canonical_upserts = 0;
  let mapped = 0;
  const canonical_ids: string[] = [];

  if (canonicalize && content_item_ids.length > 0) {
    for (const content_id of content_item_ids) {
      const { data: ciRow } = await supabase
        .from("content_item")
        .select("content_item_id, title, url, collection_region_key, content_region_key")
        .eq("content_item_id", content_id)
        .maybeSingle();

      if (!ciRow?.url) continue;

      const canonical_key = await sha256Hex(ciRow.url);

      const { data: canonRow, error: canonErr } = await supabase
        .from("canonical_content_item")
        .upsert(
          {
            canonical_key,
            canonical_url: ciRow.url,
            canonical_title: ciRow.title,
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            collection_region_key: ciRow.collection_region_key,
            content_region_key: ciRow.content_region_key,
          },
          { onConflict: "canonical_key" }
        )
        .select("canonical_id")
        .single();

      if (canonErr || !canonRow?.canonical_id) {
        await supabase.from("ingest_error_log").insert({
          run_id,
          severity: "error",
          error_message: `canonical upsert failed: ${(canonErr as any)?.message ?? "unknown error"}`,
          error_detail: canonErr,
          collection_region_key: src.collection_region_key,
          content_region_key: src.default_content_region_key,
        });
        continue;
      }

      canonical_upserts += 1;
      canonical_ids.push(canonRow.canonical_id);

      const { error: mapErr } = await supabase
        .from("content_item_canonical_map")
        .upsert(
          {
            content_item_id: ciRow.content_item_id,
            canonical_id: canonRow.canonical_id,
            match_method: "url_exact",
            match_confidence: 1.0,
            collection_region_key: ciRow.collection_region_key,
            content_region_key: ciRow.content_region_key,
          },
          { onConflict: "content_item_id" }
        );

      if (mapErr) {
        await supabase.from("ingest_error_log").insert({
          run_id,
          severity: "error",
          error_message: `canonical map upsert failed: ${(mapErr as any)?.message ?? "unknown error"}`,
          error_detail: mapErr,
          collection_region_key: src.collection_region_key,
          content_region_key: src.default_content_region_key,
        });
        continue;
      }

      mapped += 1;
    }
  }

  const final = await finalizeRun(supabase, run_id, items.length, inserted_raw, skipped_raw);

  return {
    ok: true,
    source: { source_id: src.source_id, source_name: src.source_name, feed_url },
    run_id,
    parsed_count: items.length,
    prepared_count: prepared.length,
    inserted_raw,
    skipped_raw,
    inserted_norm,
    skipped_norm,
    canonical_upserts,
    mapped,
    status: final.status,
    error_count: final.error_count,
    raw_ids: raw_ids.slice(0, 3),
    content_item_ids: content_item_ids.slice(0, 3),
    canonical_ids: canonical_ids.slice(0, 3),
  };
}

// Root info (Dashboard test tends to hit /ingest)
app.get("/ingest", (c) =>
  c.json(
    {
      ok: true,
      function: "ingest",
      version: VERSION,
      routes: ["/ingest/health", "/ingest/ingest/run", "/ingest/ingest/run-all"],
      note: "Use POST /ingest/ingest/run?source_id=... for one source, or POST /ingest/ingest/run-all for all active sources.",
    },
    200,
    corsHeaders
  )
);

// Health
app.get("/ingest/health", async (c) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("feed_source").select("source_id, source_name, output_kind").limit(1);

  return c.json(
    {
      ok: true,
      function: "ingest",
      version: VERSION,
      can_read_f_feed_source: !error,
      sample: data?.[0] ?? null,
      error: error ?? null,
      path_seen: c.req.path,
    },
    200,
    corsHeaders
  );
});

/**
 * MAIN ENDPOINT (the one your PowerShell hits)
 * POST /ingest/ingest/run?source_id=...&max_items=1&write=true&normalize=true
 */
app.post("/ingest/ingest/run", async (c) => {
  const supabase = getSupabaseServiceClient();

  const source_id = c.req.query("source_id");
  const max_items = Number(c.req.query("max_items") ?? "5");
  const write = (c.req.query("write") ?? "false").toLowerCase() === "true";
  const normalize = (c.req.query("normalize") ?? "false").toLowerCase() === "true";
  const canonicalize = (c.req.query("canonicalize") ?? "false").toLowerCase() === "true";
  const trigger_type =
    ((c.req.query("trigger") ?? "manual").toLowerCase() === "cron" ||
      (c.req.query("trigger") ?? "manual").toLowerCase() === "schedule"
      ? "schedule"
      : "manual") as "manual" | "schedule";

  if (!source_id) return c.json({ ok: false, error: "Missing query param: source_id" }, 400, corsHeaders);

  // ✅ Validation: max_items must be 1..50
  if (!Number.isFinite(max_items) || max_items < 1 || max_items > 50) {
    return c.json({ ok: false, error: "max_items must be 1..50" }, 400, corsHeaders);
  }

  const result = await runOneSource(supabase, source_id, {
    max_items,
    write,
    normalize,
    canonicalize,
    trigger_type,
  });

  return c.json({ ok: true, version: VERSION, path_seen: c.req.path, result }, 200, corsHeaders);
});

app.post("/ingest/ingest/run-all", async (c) => {
  const supabase = getSupabaseServiceClient();

  const max_items = Number(c.req.query("max_items") ?? "5");
  const write = (c.req.query("write") ?? "false").toLowerCase() === "true";
  const normalize = (c.req.query("normalize") ?? "true").toLowerCase() === "true";
  const canonicalize = (c.req.query("canonicalize") ?? "true").toLowerCase() === "true";
  const limit_sources = Number(c.req.query("limit_sources") ?? "0");
  const trigger_type =
    ((c.req.query("trigger") ?? "schedule").toLowerCase() === "manual"
      ? "manual"
      : "schedule") as "manual" | "schedule";

  // ✅ Validation: max_items must be 1..50
  if (!Number.isFinite(max_items) || max_items < 1 || max_items > 50) {
    return c.json({ ok: false, error: "max_items must be 1..50" }, 400, corsHeaders);
  }

  const { data: sources, error } = await supabase
    .from("feed_source")
    .select("source_id, source_name, output_kind, status")
    .eq("output_kind", "content_item")
    .eq("status", "active");

  if (error) return c.json({ ok: false, step: "load_sources", error }, 500, corsHeaders);

  const list = (sources ?? []).slice(0, limit_sources > 0 ? limit_sources : undefined);

  const results: any[] = [];
  for (const s of list) {
    try {
      const r = await runOneSource(supabase, s.source_id, {
        max_items,
        write,
        normalize,
        canonicalize,
        trigger_type,
      });
      results.push(r);
    } catch (e: any) {
      // Do NOT crash the whole batch if one feed breaks
      results.push({
        ok: false,
        source_id: s.source_id,
        step: "unhandled_exception",
        error: e?.message ?? String(e),
      });
    }
  }


  const success = results.filter((x) => x?.ok).length;
  const failed = results.length - success;

  return c.json(
    {
      ok: true,
      version: VERSION,
      dry_run: !write,
      sources_total: results.length,
      sources_success: success,
      sources_failed: failed,
      results,
      path_seen: c.req.path,
      failed_sources: results.filter((x: any) => !x?.ok).map((x: any) => ({ source_id: x.source_id, step: x.step, error: x.error })).slice(0, 10),

    },
    200,
    corsHeaders
  );
});

// Catch-all (learning-friendly)
app.all("*", (c) =>
  c.json(
    {
      ok: false,
      function: "ingest",
      version: VERSION,
      error: "Route not found",
      method: c.req.method,
      path_seen: c.req.path,
    },
    200,
    corsHeaders
  )
);

Deno.serve(app.fetch);


