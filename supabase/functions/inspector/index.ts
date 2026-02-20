import { Hono } from "jsr:@hono/hono";

import { createClient } from "jsr:@supabase/supabase-js@2";


const app = new Hono();

// Minimal CORS (handy for browser testing; Actions doesn't need it)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in secrets");
  return createClient(url, key, { db: { schema: "k" } });

}
function getSupabaseClientForSchema(schema: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in secrets");
  return createClient(url, key, { db: { schema } });
}


// Handle preflight requests
app.options("*", (c) => {
  return new Response(null, { status: 204, headers: corsHeaders });
});

// --- API key gate (your "Option 1" security) ---
app.use("*", async (c, next) => {
  const expected = Deno.env.get("INSPECTOR_API_KEY"); // secret stored in Supabase :contentReference[oaicite:2]{index=2}
  const provided = c.req.header("x-inspector-key");

  if (!expected) {
    return c.json({ error: "INSPECTOR_API_KEY is not set in secrets" }, 500, corsHeaders);
  }

  if (!provided || provided !== expected) {
    return c.json({ error: "Unauthorized" }, 401, corsHeaders);
  }

  await next();
});

// --- Endpoint 1: Health ---
app.get("/inspector/health", (c) => {
  return c.json(
    {
      ok: true,
      function: "inspector",
      now: new Date().toISOString(),
      deployment: Deno.env.get("DENO_DEPLOYMENT_ID") ?? null,
    },
    200,
    corsHeaders
  );
});

app.get("/inspector/overview", async (c) => {
  try {
    const supabase = getSupabaseClient();

    const { data: schemas, error: schemasError } = await supabase
      .from("schema_registry")
      .select("schema_name, category, status, owner, refresh_cadence")
      .order("schema_name", { ascending: true });

    if (schemasError) {
      return c.json(
        { ok: false, step: "schema_registry", error: schemasError },
        500,
        corsHeaders
      );
    }

    const { data: summary, error: summaryError } = await supabase
      .from("vw_table_summary")
      .select("*");

    if (summaryError) {
      return c.json(
        { ok: false, step: "vw_table_summary", error: summaryError },
        500,
        corsHeaders
      );
    }

    return c.json(
      {
        ok: true,
        managed_schemas: schemas ?? [],
        table_summary: summary ?? [],
      },
      200,
      corsHeaders
    );
  } catch (err) {
    return c.json(
      {
        ok: false,
        step: "catch",
        error: err instanceof Error ? { name: err.name, message: err.message } : err,
      },
      500,
      corsHeaders
    );
  }
});

app.get("/inspector/coverage-check", async (c) => {
  try {
    const supabaseK = getSupabaseClientForSchema("k");

    // A) Managed schemas (source of truth)
    const { data: managed, error: managedError } = await supabaseK
      .from("schema_registry")
      .select("schema_name, category, status")
      .order("schema_name", { ascending: true });

    if (managedError) {
      return c.json(
        { ok: false, step: "k.schema_registry", error: managedError },
        500,
        corsHeaders
      );
    }

    const managedSet = new Set<string>((managed ?? []).map((x: any) => String(x.schema_name)));


    // B) Existing schemas in the database (live reality)
    const { data: existingRows, error: existingError } = await supabaseK
      .from("vw_db_schemas")
      .select("schema_name")
      .order("schema_name", { ascending: true });

    if (existingError) {
      return c.json(
        { ok: false, step: "k.vw_db_schemas", error: existingError },
        500,
        corsHeaders
      );
    }

    const existingSet = new Set<string>(
      (existingRows ?? []).map((r: any) => r.schema_name)
    );

    // Filter out system/internal schemas so the drift report is meaningful
    const ignorePrefixes = ["pg_"];
    const ignoreExact = new Set([
      "public",
      "information_schema",
      "pg_catalog",
      "extensions",
      "graphql",
      "graphql_public",
      "net",
      "realtime",
      "storage",
      "auth",
      "vault",
      "supabase_functions",
      "supabase_migrations",
      "cron",
    ]);

    const filteredExisting = Array.from(existingSet).filter((s) => {
      if (!s) return false;
      if (ignoreExact.has(s)) return false;
      if (ignorePrefixes.some((p) => s.startsWith(p))) return false;
      return true;
    });

    const existingFilteredSet = new Set(filteredExisting);

    // Exists but not registered (drift)
    const exists_not_registered = Array.from(existingFilteredSet)
      .filter((s: string) => !managedSet.has(s))
      .sort();


    // Registered but missing (registry stale OR schema exists but is empty and filtered out)
    const registered_not_exists = Array.from(managedSet as Set<string>)
      .filter((s: string) => !existingFilteredSet.has(s))
      .sort();

    return c.json(
      {
        ok: true,
        exists_source: "k.vw_db_schemas",
        managed_schemas_count: managed?.length ?? 0,
        existing_schemas_count: existingFilteredSet.size,
        exists_not_registered,
        registered_not_exists,
        managed_schemas: managed ?? [],
      },
      200,
      corsHeaders
    );
  } catch (err) {
    return c.json(
      {
        ok: false,
        step: "catch",
        error: err instanceof Error ? { name: err.name, message: err.message } : err,
      },
      500,
      corsHeaders
    );
  }
});

app.get("/inspector/describe-table", async (c) => {
  try {
    const schema = c.req.query("schema");
    const table = c.req.query("table");

    if (!schema || !table) {
      return c.json(
        { ok: false, error: "Missing required query params: schema, table" },
        400,
        corsHeaders
      );
    }

    const supabaseK = getSupabaseClientForSchema("k");

    // Columns (includes FK flags + your registry metadata)
    const { data: columns, error: columnsError } = await supabaseK
      .from("vw_db_columns")
      .select("*")
      .eq("schema_name", schema)
      .eq("table_name", table)
      .order("ordinal_position", { ascending: true });

    if (columnsError) {
      return c.json(
        { ok: false, step: "k.vw_db_columns", error: columnsError },
        500,
        corsHeaders
      );
    }
    // Foreign keys derived from vw_db_columns (you already have FK metadata there)
    const foreign_keys = (columns ?? [])
      .filter((c: any) => c.is_foreign_key === true)
      .map((c: any) => ({
        column_name: c.column_name,
        ref_schema: c.fk_ref_schema,
        ref_table: c.fk_ref_table,
        ref_column: c.fk_ref_column,
      }));

    // Constraints
    const { data: constraints, error: constraintsError } = await supabaseK
      .from("vw_db_constraints")
      .select("*")
      .eq("schema_name", schema)
      .eq("table_name", table);

    if (constraintsError) {
      return c.json(
        { ok: false, step: "k.vw_db_constraints", error: constraintsError },
        500,
        corsHeaders
      );
    }

    // Indexes
    const { data: indexes, error: idxError } = await supabaseK
      .from("vw_db_indexes")
      .select("*")
      .eq("schema_name", schema)
      .eq("table_name", table);

    if (idxError) {
      return c.json(
        { ok: false, step: "k.vw_db_indexes", error: idxError },
        500,
        corsHeaders
      );
    }

    // Triggers
    const { data: triggers, error: trgError } = await supabaseK
      .from("vw_db_triggers")
      .select("*")
      .eq("schema_name", schema)
      .eq("table_name", table);

    if (trgError) {
      return c.json(
        { ok: false, step: "k.vw_db_triggers", error: trgError },
        500,
        corsHeaders
      );
    }

    // RLS (table-level flags)
    const { data: rls, error: rlsError } = await supabaseK
      .from("vw_db_rls")
      .select("*")
      .eq("schema_name", schema)
      .eq("table_name", table);

    if (rlsError) {
      return c.json(
        { ok: false, step: "k.vw_db_rls", error: rlsError },
        500,
        corsHeaders
      );
    }

    return c.json(
      {
        ok: true,
        target: { schema, table },
        counts: {
          columns: columns?.length ?? 0,
          constraints: constraints?.length ?? 0,
          foreign_keys: foreign_keys?.length ?? 0,
          indexes: indexes?.length ?? 0,
          triggers: triggers?.length ?? 0,
          rls: rls?.length ?? 0,
        },
        columns: columns ?? [],
        constraints: constraints ?? [],
        foreign_keys: foreign_keys ?? [],
        indexes: indexes ?? [],
        triggers: triggers ?? [],
        rls: rls ?? [],
      },
      200,
      corsHeaders
    );
  } catch (err) {
    return c.json(
      {
        ok: false,
        step: "catch",
        error: err instanceof Error ? { name: err.name, message: err.message } : err,
      },
      500,
      corsHeaders
    );
  }
});

app.get("/inspector/object-definition", async (c) => {
  try {
    const schema = c.req.query("schema");
    const name = c.req.query("name");
    if (!schema || !name) {
      return c.json({ ok: false, error: "schema_and_name_required" }, 400, corsHeaders);
    }

    const include_indexes = c.req.query("include_indexes") !== "false";
    const include_triggers = c.req.query("include_triggers") !== "false";
    const include_policies = c.req.query("include_policies") !== "false";
    const max_chars = Number(c.req.query("max_chars") ?? "200000");

    const supabaseK = getSupabaseClientForSchema("k");

    const { data, error } = await supabaseK.rpc("inspect_object_definition", {
      p_schema: schema,
      p_name: name,
      p_include_indexes: include_indexes,
      p_include_triggers: include_triggers,
      p_include_policies: include_policies,
      p_max_chars: max_chars,
    });

    if (error) {
      return c.json({ ok: false, step: "rpc.inspect_object_definition", error: error.message }, 500, corsHeaders);
    }

    return c.json(data, 200, corsHeaders);
  } catch (err) {
    return c.json(
      {
        ok: false,
        step: "catch",
        error: err instanceof Error ? { name: err.name, message: err.message } : err,
      },
      500,
      corsHeaders
    );
  }
});

app.get("/inspector/function-definition", async (c) => {
  try {
    const schema = c.req.query("schema");
    const name = c.req.query("name");
    if (!schema || !name) {
      return c.json({ ok: false, error: "schema_and_name_required" }, 400, corsHeaders);
    }

    const max_chars = Number(c.req.query("max_chars") ?? "200000");
    const supabaseK = getSupabaseClientForSchema("k");

    const { data, error } = await supabaseK.rpc("inspect_function_definition", {
      p_schema: schema,
      p_name: name,
      p_max_chars: max_chars,
    });

    if (error) {
      return c.json({ ok: false, step: "rpc.inspect_function_definition", error: error.message }, 500, corsHeaders);
    }
    return c.json(data, 200, corsHeaders);
  } catch (err) {
    return c.json(
      { ok: false, step: "catch", error: err instanceof Error ? { name: err.name, message: err.message } : err },
      500,
      corsHeaders
    );
  }
});
app.get("/inspector/object-full", async (c) => {
  try {
    const schema = c.req.query("schema");
    const name = c.req.query("name");
    if (!schema || !name) {
      return c.json({ ok: false, error: "schema_and_name_required" }, 400, corsHeaders);
    }

    const supabaseK = getSupabaseClientForSchema("k");

    // 1) Definition (RPC)
    const { data: defn, error: defErr } = await supabaseK.rpc("inspect_object_definition", {
      p_schema: schema,
      p_name: name,
      p_include_indexes: true,
      p_include_triggers: true,
      p_include_policies: true,
      p_max_chars: Number(c.req.query("max_chars") ?? "200000"),
    });

    if (defErr) {
      return c.json(
        { ok: false, step: "rpc.inspect_object_definition", error: defErr.message },
        500,
        corsHeaders
      );
    }

    // 2) Structure (registry-backed views)
    const [cols, cons, idx, trg, rls] = await Promise.all([
      supabaseK
        .from("vw_db_columns")
        .select("*")
        .eq("schema_name", schema)
        .eq("table_name", name)
        .order("ordinal_position", { ascending: true }),

      supabaseK
        .from("vw_db_constraints")
        .select("*")
        .eq("schema_name", schema)
        .eq("table_name", name),

      supabaseK
        .from("vw_db_indexes")
        .select("*")
        .eq("schema_name", schema)
        .eq("table_name", name),

      supabaseK
        .from("vw_db_triggers")
        .select("*")
        .eq("schema_name", schema)
        .eq("table_name", name),

      supabaseK
        .from("vw_db_rls")
        .select("*")
        .eq("schema_name", schema)
        .eq("table_name", name),
    ]);

    const firstError = cols.error || cons.error || idx.error || trg.error || rls.error;
    if (firstError) {
      return c.json({ ok: false, step: "structure_views", error: firstError }, 500, corsHeaders);
    }

    // ✅ 2B: fallback to catalog-backed columns from the RPC payload
    const catalogCols = (defn as any)?.columns_catalog ?? [];
    const columnsOut =
      (cols.data && (cols.data as any[]).length > 0)
        ? cols.data
        : catalogCols;

    return c.json(
      {
        ok: true,
        target: { schema, name },
        definition: defn,
        structure: {
          columns: columnsOut,
          constraints: cons.data ?? [],
          indexes: idx.data ?? [],
          triggers: trg.data ?? [],
          rls: rls.data ?? [],
        },
      },
      200,
      corsHeaders
    );
  } catch (err) {
    return c.json(
      {
        ok: false,
        step: "catch",
        error: err instanceof Error ? { name: err.name, message: err.message } : err,
      },
      500,
      corsHeaders
    );
  }
});


app.get("/inspector/search-objects", async (c) => {
  try {
    const q = c.req.query("q");
    if (!q) return c.json({ ok: false, error: "q_required" }, 400, corsHeaders);

    const schema = c.req.query("schema"); // optional
    const kindRaw = c.req.query("kind");  // optional
    const kind = (kindRaw ?? "").toLowerCase();
    const limit = Number(c.req.query("limit") ?? "50");

    const supabaseK = getSupabaseClientForSchema("k");

    // ✅ NEW: function search mode
    if (kind === "function" || kind === "fn") {
      const { data, error } = await supabaseK.rpc("inspect_search_functions", {
        p_q: q,
        p_schema: schema ?? null,
        p_limit: limit,
      });

      if (error) {
        return c.json({ ok: false, step: "rpc.inspect_search_functions", error: error.message }, 500, corsHeaders);
      }

      return c.json({ ok: true, q, kind: "function", results: data ?? [] }, 200, corsHeaders);
    }

    // ✅ Default: object search via vw_db_objects
    let query = supabaseK
      .from("vw_db_objects")
      .select("schema_name, object_name, object_kind, status, purpose, refresh_cadence, source_system")
      .ilike("object_name", `%${q}%`)
      .limit(limit);

    if (schema) query = query.eq("schema_name", schema);
    if (kind) query = query.eq("object_kind", kindRaw); // keep original value for exact match

    const { data, error } = await query;
    if (error) return c.json({ ok: false, step: "k.vw_db_objects", error: error.message }, 500, corsHeaders);

    return c.json({ ok: true, q, kind: kindRaw ?? null, results: data ?? [] }, 200, corsHeaders);
  } catch (err) {
    return c.json(
      { ok: false, step: "catch", error: err instanceof Error ? { name: err.name, message: err.message } : err },
      500,
      corsHeaders
    );
  }
});

app.get("/inspector/registry-context", async (c) => {
  try {
    const schema = c.req.query("schema");
    const table = c.req.query("table");

    if (!schema || !table) {
      return c.json(
        { ok: false, error: "Missing required query params: schema, table" },
        400,
        corsHeaders
      );
    }

    const supabaseK = getSupabaseClientForSchema("k");

    // 1) table_registry row
    const { data: tableRows, error: trErr } = await supabaseK
      .from("table_registry")
      .select("*")
      .eq("schema_name", schema)
      .eq("table_name", table)
      .limit(1);

    if (trErr) {
      return c.json({ ok: false, step: "k.table_registry", error: trErr }, 500, corsHeaders);
    }

    const table_registry = (tableRows ?? [])[0] ?? null;

    if (!table_registry) {
      return c.json(
        { ok: false, error: "not_found_in_table_registry", schema, table },
        404,
        corsHeaders
      );
    }

    // 2) column_registry rows for that table_id
    const { data: columns, error: crErr } = await supabaseK
      .from("column_registry")
      .select("*")
      .eq("table_id", table_registry.table_id)
      .order("ordinal_position", { ascending: true });

    if (crErr) {
      return c.json({ ok: false, step: "k.column_registry", error: crErr }, 500, corsHeaders);
    }

    // 3) optional FK edges (helps join_keys suggestions)
    const { data: fkRows, error: fkErr } = await supabaseK
      .from("vw_db_foreign_keys")
      .select("*")
      .eq("src_schema", schema)
      .eq("src_table", table);

    if (fkErr) {
      return c.json({ ok: false, step: "k.vw_db_foreign_keys", error: fkErr }, 500, corsHeaders);
    }

    return c.json(
      {
        ok: true,
        target: { schema, table },
        table_registry,
        column_registry: columns ?? [],
        foreign_keys: fkRows ?? [],
      },
      200,
      corsHeaders
    );
  } catch (err) {
    return c.json(
      {
        ok: false,
        step: "catch",
        error: err instanceof Error ? { name: err.name, message: err.message } : err,
      },
      500,
      corsHeaders
    );
  }
});

app.get("/inspector/diag-bundle", async (c) => {
  try {
    const hours = Number(c.req.query("hours") ?? "48");
    const limit = Math.min(Number(c.req.query("limit") ?? "50"), 200);

    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

    const supabaseF = getSupabaseClientForSchema("f");
    const supabaseNet = getSupabaseClientForSchema("net");
    const supabaseCron = getSupabaseClientForSchema("cron");

    // --- f: ingest freshness ---
    const ingestAgg = await supabaseF
      .from("ingest_run")
      .select("started_at", { count: "exact", head: false })
      .order("started_at", { ascending: false })
      .limit(1);

    // last 24h count (approx via filter)
    const ingestRecent = await supabaseF
      .from("ingest_run")
      .select("run_id", { count: "exact", head: true })
      .gte("started_at", since);

    // --- f: body coverage ---
    const canonCount = await supabaseF
      .from("canonical_content_item")
      .select("canonical_id", { count: "exact", head: true });

    const bodyCount = await supabaseF
      .from("canonical_content_body")
      .select("canonical_id", { count: "exact", head: true });

    const bodyStatus = await supabaseF
      .from("canonical_content_body")
      .select("fetch_status", { count: "exact", head: false });

    // --- net: last responses ---
    const netResp = await supabaseNet
      .from("_http_response")
      .select("id, created, status_code, timed_out, error_msg, content_type, content")
      .gte("created", since)
      .order("created", { ascending: false })
      .limit(limit);

    // --- cron: last runs for job 1 (or all jobs if jobid not provided)
    const jobid = c.req.query("jobid");
    let cronQuery = supabaseCron
      .from("job_run_details")
      .select("jobid, runid, status, start_time, end_time, return_message")
      .gte("start_time", since)
      .order("start_time", { ascending: false })
      .limit(limit);

    if (jobid) cronQuery = cronQuery.eq("jobid", Number(jobid));

    const cronRuns = await cronQuery;

    // Summaries
    const latestStartedAt = ingestAgg.data?.[0]?.started_at ?? null;
    const runsSince = ingestRecent.count ?? 0;

    const canonicals = canonCount.count ?? 0;
    const bodies = bodyCount.count ?? 0;
    const pct_with_body = canonicals ? Math.round((bodies / canonicals) * 10000) / 100 : null;

    const statusCounts: Record<string, number> = {};
    for (const r of (bodyStatus.data ?? []) as any[]) {
      const k = r.fetch_status ?? "null";
      statusCounts[k] = (statusCounts[k] ?? 0) + 1;
    }

    // Sanitize net content (avoid huge blobs)
    const netOut = (netResp.data ?? []).map((r: any) => ({
      id: r.id,
      created: r.created,
      status_code: r.status_code,
      timed_out: r.timed_out,
      error_msg: r.error_msg ? String(r.error_msg).slice(0, 160) : null,
      content_type: r.content_type,
      content_snip: r.content ? String(r.content).slice(0, 220) : null,
    }));

    return c.json(
      {
        ok: true,
        window: { hours, since },
        f: {
          ingest: { latest_started_at: latestStartedAt, runs_in_window: runsSince },
          body: { canonicals, bodies, pct_with_body, status_counts: statusCounts },
        },
        net: { responses: netOut },
        cron: { runs: cronRuns.data ?? [] },
      },
      200,
      corsHeaders
    );
  } catch (err) {
    return c.json(
      { ok: false, step: "diag-bundle", error: err instanceof Error ? err.message : String(err) },
      500,
      corsHeaders
    );
  }
});

app.get("/inspector/auth-debug", (c) => {
  const expected = Deno.env.get("INSPECTOR_API_KEY") ?? "";
  const provided = c.req.header("x-inspector-key") ?? "";

  return c.json(
    {
      ok: true,
      expected_len: expected.length,
      provided_len: provided.length,
      match: provided === expected,
      has_header: provided.length > 0,
    },
    200,
    corsHeaders
  );
});


Deno.serve(app.fetch);
