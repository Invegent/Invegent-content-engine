// supabase/functions/tmr-drift-probe/index.ts
//
// tmr-drift-probe-v1.0.0 — TMR Provider/Registry Drift Probe v0 (AP-2).
//
// Scheduled, read-only-against-the-world probe that mechanizes the manual
// Creatomate Provider Reconciliation v0 and the TMR-GOV-PROVIDER-1 guard's
// checks 1/6/7. Rationale: 15 of the 16 live-selectable generics have zero
// code anchors — the registry is the ONLY deletion guard; the fb9820f8
// provider-side deletion took PP image_quote production down ~27h.
// Gate-1 packet: docs/briefs/ap2-tmr-drift-probe-v0-packet.md (PK-approved,
// D-AP2-1..5 as recommended).
//
// Three checks per run (D-AP2-2):
//   (a) provider↔registry — GET creatomate /v1/templates (GET ONLY; the probe
//       performs NO provider mutation of any kind) vs c.creative_provider_template:
//       provider_missing[] (the outage class; fb9820f8 allowlisted as
//       known_historical — see compare.ts), provider_unregistered[], renamed[].
//   (b) pool-lag — live resolver eligible background pool for PP, replicating
//       the resolve_slot_assets v1.1 filter chain per platform (facebook /
//       instagram / linkedin), union diffed against three BUILD-TIME-VENDORED
//       markers (markers.ts — declarative v0.4 / contract v2 / dashboard
//       v0.4@b9d02ca). The declarative registry is NEVER read at runtime
//       (runtime-import guard).
//   (c) render sanity — last 20 succeeded m.post_render_log rows labelled
//       creative_library_b1_production: render_spec->>'background_key' must be
//       in the union pool.
//
// Verdict: 'ok' (no drift) | 'drift' (any divergence) | 'error' (any check
// failed). The probe INFORMS only — it never blocks, gates, or auto-remediates.
//
// Hard guarantees (drift-check sibling pattern):
//   - Missing required env -> HTTP 500 JSON, no DB writes.
//   - Per-check failure -> recorded in that check's error slot; the run
//     CONTINUES and the row is still written with status 'error'.
//   - EXACTLY ONE evidence row written per run to c.tmr_drift_probe_run
//     (the probe's ONLY write surface — it writes to no other table).
//   - If the evidence write itself fails -> HTTP 500 with the full payload in
//     the response body (fail-loud, never an empty success).
//
// Invocation
//   POST /functions/v1/tmr-drift-probe   (no parameters in v0)
//
// Auth
//   verify_jwt:false (service-role-pattern; pinned in supabase/config.toml),
//   PLUS an in-handler inbound gate (AP-2 security triage, PK-disclosed):
//   Authorization must equal `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` — anything
//   else -> HTTP 401, zero DB writes, zero provider calls. The house cron
//   pattern already sends exactly this Bearer (drift-check-daily-fire
//   precedent), so the cron step needs nothing extra.
//   Fired daily by pg_cron 'tmr-drift-probe-daily' 35 17 * * * UTC (the
//   packet-recommended 30 17 slot is OCCUPIED by active jobid 85,
//   cadence_drift_checker_weekly — db-rls-auditor C1) — the cron is scheduled
//   ONLY as the final step of the PK conditional sequence (D-AP2-5); nothing
//   in this repo applies it.
//
// Required env
//   SUPABASE_URL                  (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY     (auto-injected)
//   CREATOMATE_API_KEY            (existing project secret; v0 reuses it —
//                                  the CREATOMATE_GENERICS_API_KEY split is an
//                                  explicit non-goal per the packet)
//
// STRICTLY OUT OF SCOPE (packet forbidden list): fixing found drift (AP-3/AP-4),
// dashboard surfacing (D-AP2-4 follow-up), alerting infra, any provider write,
// any write outside c.tmr_drift_probe_run, new secrets, enforcement behaviour.
//
// Changelog
//   v1.0.0 (2026-07-06) — initial AP-2 build: three checks, one evidence row
//                         per run, fail-loud doctrine, vendored pool markers.
//                         Pre-deploy audit fold-ins (same lane commit):
//                         service-role inbound auth gate (security triage);
//                         legacy-shape render classification (db-rls C2);
//                         provider pagination guard (db-rls C5).

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  type BrandAssetRow,
  checkRenderSanity,
  compareProviderRegistry,
  comparePoolToMarkers,
  computeEligiblePool,
  computeVerdict,
  type PoolCheckResult,
  type ProviderCheckResult,
  type ProviderTemplate,
  type RegistryTemplate,
  type RenderCheckResult,
  type RenderRow,
  PROBE_PLATFORMS,
  PROVIDER_PAGE_LIMIT,
  providerListPossiblyTruncated,
} from "./compare.ts";
import { POOL_MARKERS } from "./markers.ts";

const VERSION = "tmr-drift-probe-v1.0.0";

// Property Pulse client_id — the governed B1 client (same constant as the
// vendored contract v2, creative_contract.ts gate.client_id).
const PP_CLIENT_ID = "4036a6b5-b4a3-406e-998d-c2fe14a8bbdd";

// S1 stamper / B1 production render_spec label (image-worker b1_production.ts).
const B1_PRODUCTION_LABEL = "creative_library_b1_production";

const CREATOMATE_TEMPLATES_URL =
  "https://api.creatomate.com/v1/templates?limit=100";

const RENDER_SANITY_LIMIT = 20;

// ---------- env ----------

interface RequiredEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CREATOMATE_API_KEY: string;
}

const REQUIRED_ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CREATOMATE_API_KEY",
] as const;

function readEnv():
  | { ok: true; env: RequiredEnv }
  | { ok: false; missing: string[] } {
  const env: Record<string, string> = {};
  const missing: string[] = [];
  for (const key of REQUIRED_ENV_KEYS) {
    const v = Deno.env.get(key);
    if (!v) missing.push(key);
    else env[key] = v;
  }
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, env: env as unknown as RequiredEnv };
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

function makeClient(env: RequiredEnv): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------- check (a): provider ↔ registry ----------

async function fetchProviderTemplates(
  env: RequiredEnv,
): Promise<ProviderTemplate[]> {
  const resp = await fetch(CREATOMATE_TEMPLATES_URL, {
    method: "GET", // GET ONLY — the probe never mutates the provider
    headers: { Authorization: `Bearer ${env.CREATOMATE_API_KEY}` },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(
      `creatomate_templates ${resp.status}: ${body.slice(0, 200)}`,
    );
  }
  const arr = await resp.json();
  if (!Array.isArray(arr)) {
    throw new Error("creatomate_templates: expected array response");
  }
  // db-rls-auditor C5 pagination guard: a FULL page means the inventory may be
  // truncated — diffing it would fabricate provider_missing drift. Error out.
  if (providerListPossiblyTruncated(arr.length)) {
    throw new Error(
      `provider_list_possibly_truncated: ${arr.length} templates returned (full page of ${PROVIDER_PAGE_LIMIT}); refusing to diff a possibly-incomplete inventory`,
    );
  }
  return arr.map((t: { id: string; name: string }) => ({
    id: t.id,
    name: t.name,
  }));
}

async function fetchRegistryTemplates(
  supabase: SupabaseClient,
): Promise<RegistryTemplate[]> {
  const { data, error } = await supabase
    .schema("c")
    .from("creative_provider_template")
    .select("provider_template_id, provider_template_name");
  if (error) throw new Error(`registry_select: ${error.message}`);
  return (data ?? []) as RegistryTemplate[];
}

async function runProviderCheck(
  env: RequiredEnv,
  supabase: SupabaseClient,
): Promise<ProviderCheckResult> {
  const [provider, registry] = await Promise.all([
    fetchProviderTemplates(env),
    fetchRegistryTemplates(supabase),
  ]);
  return compareProviderRegistry(provider, registry);
}

// ---------- check (b): pool-lag ----------

async function fetchBrandAssetRows(
  supabase: SupabaseClient,
): Promise<BrandAssetRow[]> {
  const { data, error } = await supabase
    .schema("c")
    .from("client_brand_asset")
    .select("asset_id, is_active, platform_scope, created_at, asset_meta")
    .eq("client_id", PP_CLIENT_ID)
    .eq("asset_meta->>usage", "background");
  if (error) throw new Error(`brand_asset_select: ${error.message}`);
  return (data ?? []) as BrandAssetRow[];
}

async function runPoolCheck(
  supabase: SupabaseClient,
): Promise<PoolCheckResult> {
  const rows = await fetchBrandAssetRows(supabase);
  const now = new Date();
  const poolsByPlatform: Record<string, string[]> = {};
  for (const platform of PROBE_PLATFORMS) {
    poolsByPlatform[platform] = computeEligiblePool(rows, platform, now);
  }
  return comparePoolToMarkers(poolsByPlatform, POOL_MARKERS);
}

// ---------- check (c): render sanity ----------

async function fetchRecentB1Renders(
  supabase: SupabaseClient,
): Promise<RenderRow[]> {
  const { data, error } = await supabase
    .schema("m")
    .from("post_render_log")
    .select("render_log_id, created_at, render_spec")
    .eq("render_spec->>label", B1_PRODUCTION_LABEL)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(RENDER_SANITY_LIMIT);
  if (error) throw new Error(`render_log_select: ${error.message}`);
  return ((data ?? []) as {
    render_log_id: string;
    created_at: string;
    render_spec: Record<string, unknown> | null;
  }[]).map((r) => {
    const bk = r.render_spec?.["background_key"];
    return {
      render_log_id: r.render_log_id,
      created_at: r.created_at,
      background_key: typeof bk === "string" ? bk : null,
      // db-rls C2: presence of the Option-D 'tmr' evidence block decides whether
      // a missing background_key is a genuine violation or pre-Option-D legacy
      // shape (see checkRenderSanity).
      has_tmr_evidence: r.render_spec !== null && r.render_spec !== undefined &&
        "tmr" in r.render_spec,
    };
  });
}

// ---------- evidence writer ----------

interface EvidenceRow {
  probe_version: string;
  status: "ok" | "drift" | "error";
  provider_check: unknown;
  pool_check: unknown;
  render_check: unknown;
  divergence_summary: unknown;
  error_detail: string | null;
}

async function writeEvidenceRow(
  supabase: SupabaseClient,
  row: EvidenceRow,
): Promise<{ id: string; run_at: string }> {
  const { data, error } = await supabase
    .schema("c")
    .from("tmr_drift_probe_run")
    .insert(row)
    .select("id, run_at")
    .single();
  if (error) throw new Error(`evidence_insert: ${error.message}`);
  return data as { id: string; run_at: string };
}

// ---------- handler ----------

Deno.serve(async (req) => {
  const startedAt = Date.now();

  const envRes = readEnv();
  if (!envRes.ok) {
    // Missing env -> HTTP 500, ZERO DB writes (sibling drift-check guarantee).
    return new Response(
      JSON.stringify({
        ok: false,
        version: VERSION,
        error: "missing required environment variables",
        missing: envRes.missing,
        wrote_row: false,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  const env = envRes.env;

  // Inbound auth gate (AP-2 security triage, PK-disclosed policy fix; precedent:
  // cadence-drift-checker's inbound check): with verify_jwt=false the gateway
  // enforces nothing, so the handler requires the service-role Bearer the house
  // cron pattern already sends (drift-check-daily-fire). Mismatch/missing ->
  // HTTP 401, ZERO DB writes, ZERO provider calls.
  if (
    req.headers.get("Authorization") !==
      `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
  ) {
    return new Response(
      JSON.stringify({ ok: false, error: "unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = makeClient(env);

  // Each check is independently fenced: a failure is recorded and the run
  // CONTINUES (per-check error doctrine), ending in status 'error'.
  let providerResult: ProviderCheckResult | null = null;
  let providerError: string | null = null;
  try {
    providerResult = await runProviderCheck(env, supabase);
  } catch (e) {
    providerError = (e as Error).message;
  }

  let poolResult: PoolCheckResult | null = null;
  let poolError: string | null = null;
  try {
    poolResult = await runPoolCheck(supabase);
  } catch (e) {
    poolError = (e as Error).message;
  }

  // Check (c) evaluates against the union pool from check (b); if the pool
  // check failed there is no trustworthy pool to validate against.
  let renderResult: RenderCheckResult | null = null;
  let renderError: string | null = null;
  if (poolResult === null) {
    renderError = "skipped: pool check failed, no union pool to validate against";
  } else {
    try {
      const renders = await fetchRecentB1Renders(supabase);
      renderResult = checkRenderSanity(renders, poolResult.union_pool);
    } catch (e) {
      renderError = (e as Error).message;
    }
  }

  const status = computeVerdict([
    { drift: providerResult?.drift ?? null, error: providerError },
    { drift: poolResult?.drift ?? null, error: poolError },
    { drift: renderResult?.drift ?? null, error: renderError },
  ]);

  const errors = [
    providerError ? `provider_check: ${providerError}` : null,
    poolError ? `pool_check: ${poolError}` : null,
    renderError ? `render_check: ${renderError}` : null,
  ].filter((e): e is string => e !== null);

  const divergenceSummary = {
    status,
    provider_drift: providerResult?.drift ?? null,
    provider_missing_count: providerResult?.provider_missing.length ?? null,
    provider_unregistered_count: providerResult?.provider_unregistered.length ?? null,
    renamed_count: providerResult?.renamed.length ?? null,
    known_historical_count: providerResult?.known_historical.length ?? null,
    pool_drift: poolResult?.drift ?? null,
    lagging_markers: poolResult?.markers
      .filter((m) => m.status === "lagging")
      .map((m) => m.marker) ?? null,
    union_pool_size: poolResult?.union_pool.length ?? null,
    render_drift: renderResult?.drift ?? null,
    render_violation_count: renderResult?.violations.length ?? null,
    render_legacy_shape_count: renderResult?.legacy_shape.length ?? null, // informational (db-rls C2), never drift
    renders_checked: renderResult?.checked ?? null,
    errors,
  };

  const evidenceRow: EvidenceRow = {
    probe_version: VERSION,
    status,
    provider_check: providerResult ?? { error: providerError },
    pool_check: poolResult ?? { error: poolError },
    render_check: renderResult ?? { error: renderError },
    divergence_summary: divergenceSummary,
    error_detail: errors.length > 0 ? errors.join(" | ") : null,
  };

  // ALWAYS exactly one evidence row per run — even on 'error'.
  let written: { id: string; run_at: string };
  try {
    written = await writeEvidenceRow(supabase, evidenceRow);
  } catch (e) {
    // Fail-loud: the evidence write itself failed. Return HTTP 500 with the
    // full payload in the body so the run is never an empty success.
    return new Response(
      JSON.stringify({
        ok: false,
        version: VERSION,
        error: `evidence write failed: ${(e as Error).message}`,
        wrote_row: false,
        payload: evidenceRow,
        duration_ms: Date.now() - startedAt,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify(
      {
        ok: status !== "error",
        version: VERSION,
        status,
        wrote_row: true,
        run_id: written.id,
        run_at: written.run_at,
        divergence_summary: divergenceSummary,
        provider_check: providerResult ?? { error: providerError },
        pool_check: poolResult ?? { error: poolError },
        render_check: renderResult ?? { error: renderError },
        duration_ms: Date.now() - startedAt,
      },
      null,
      2,
    ),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
