import { Hono } from "jsr:@hono/hono";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-inspector-key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isReadOnly(query: string) {
  const q = query.trim();

  // allow only SELECT / WITH / EXPLAIN
  if (!/^(select|with|explain)\b/i.test(q)) return false;

  // reject multi-statement
  if (q.includes(";")) return false;

  // reject obvious write/ddl keywords
  if (/\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|call|do|copy|vacuum|analyze)\b/i.test(q)) {
    return false;
  }
  return true;
}

app.options("*", () => new Response(null, { status: 204, headers: corsHeaders }));
const VERSION = "inspector-sql-ro-v1";

app.get("/health", (c) => {
  return jsonResponse({ ok: true, function: "inspector_sql_ro", version: VERSION }, 200);
});
app.get("*", (c) => {
  const path = c.req.path || "/";
  if (path.endsWith("/health")) {
    return jsonResponse({ ok: true, function: "inspector_sql_ro", version: VERSION }, 200);
  }
  return jsonResponse({ ok: false, error: "not_found", path_seen: path }, 404);
});
app.post("*", async (c) => {
  const apiKey = Deno.env.get("INSPECTOR_SQL_API_KEY") ?? "";
  const provided = c.req.header("x-inspector-key") ?? "";
  if (!apiKey || provided !== apiKey) return jsonResponse({ ok: false, error: "unauthorized" }, 401);

  const dbUrl = Deno.env.get("INSPECTOR_RO_DB_URL");
  if (!dbUrl) return jsonResponse({ ok: false, error: "INSPECTOR_RO_DB_URL_missing" }, 500);

  const payload = await c.req.json().catch(() => null);
  const sqlText = payload?.sql;
  const params = Array.isArray(payload?.params) ? payload.params : [];
  const maxRows = Math.min(Math.max(Number(payload?.max_rows ?? 200), 1), 500);

  if (typeof sqlText !== "string" || !isReadOnly(sqlText)) {
    return jsonResponse({ ok: false, error: "rejected_read_only_only" }, 400);
  }

  // hard row cap by wrapping
  const wrapped = `select * from (${sqlText}) as _q limit ${maxRows}`;

  const db = postgres(dbUrl, { max: 1, idle_timeout: 5, prepare: false });

  try {
    const rows = await db.unsafe(wrapped, params);
    return jsonResponse({ ok: true, rows, row_count: rows.length, max_rows: maxRows }, 200);
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e).slice(0, 1200) }, 500);
  } finally {
    await db.end({ timeout: 1 });
  }
});

Deno.serve(app.fetch);
