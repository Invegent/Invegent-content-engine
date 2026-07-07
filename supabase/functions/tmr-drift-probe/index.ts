// supabase/functions/tmr-drift-probe/index.ts
//
// tmr-drift-probe-v2.0.0 — TMR Provider/Registry Drift Probe (client-driven).
//
// Scheduled, read-only-against-the-world probe. It mechanizes the manual
// Creatomate Provider Reconciliation and the TMR-GOV-PROVIDER-1 guard's provider
// checks, plus a per-governed-client live-pool + render-sanity sweep. Rationale:
// 15 of the 16 live-selectable generics have zero code anchors — the registry is
// the ONLY deletion guard; the fb9820f8 provider-side deletion took PP image_quote
// production down ~27h.
//
// Gate-1 packets:
//   AP-2 (v1): docs/briefs/ap2-tmr-drift-probe-v0-packet.md
//   Spine Generalisation v1 (v2, THIS version, D3):
//     docs/briefs/spine-generalisation-v1-packet.md (PK-approved, D1–D5 as
//     recommended).
//
// WHAT CHANGED IN v2.0.0 (Spine Generalisation v1, D3) — de-hardcode, dark:
//   · REMOVED the PP hardcodes: PP_CLIENT_ID and B1_PRODUCTION_LABEL are gone.
//   · REMOVED the vendored-marker machinery entirely: markers.ts (POOL_MARKERS /
//     EIGHT_KEY_POOL) is DELETED and comparePoolToMarkers is retired. The
//     "markers lag the live pool" concept is RETIRED by design (D3) — the probe
//     now DERIVES each client's expected pool LIVE from the resolver, so there is
//     nothing to lag. Declarative-doc lag is now a separate audit/dashboard concern.
//   · ADDED fetchGovernedClients(): reads c.client_creative_governance WHERE
//     enabled = true (the Spine Generalisation v1 governance source) joined to
//     c.client for the slug. Today this returns EXACTLY ONE row (Property Pulse ×
//     image_quote), so behaviour is byte-identical for PP; a second governed
//     client will be a pure DATA change (a governance row), no code fork.
//   · Per governed client (loop; today one iteration): fetch that client's
//     background assets, compute the live eligible pool per platform, union =
//     the client's live-derived expected pool, then render-sanity that client's
//     recent succeeded renders labelled with the row's render_label against it.
//   · Provider check (a) STAYS GLOBAL and UNCHANGED (Creatomate templates vs
//     c.creative_provider_template — it is not client-scoped).
//
// STRICTLY OUT OF SCOPE (this lane): the live image-worker/ai-worker gate + the
// contract resolver (v2 T3); onboarding any client / populating a second
// governance row (v3 data lane); any provider write; any write outside
// c.tmr_drift_probe_run; new secrets; enforcement/blocking behaviour. The probe
// still INFORMS only — it never blocks, gates, or auto-remediates.
//
// Two checks per run (D3):
//   (a) provider↔registry — GET creatomate /v1/templates (GET ONLY; the probe
//       performs NO provider mutation of any kind) vs c.creative_provider_template:
//       provider_missing[] (the outage class; fb9820f8 allowlisted as
//       known_historical — see compare.ts), provider_unregistered[], renamed[].
//       GLOBAL, not client-scoped.
//   (b+c) per governed client — live eligible background pool per platform
//       (replicating resolve_slot_assets v1.1), union = live-derived expected pool;
//       then render sanity: each recent succeeded render labelled with the client's
//       render_label must have render_spec->>'background_key' in that live union.
//       The declarative registry is NEVER read at runtime (runtime-import guard).
//
// Verdict: 'ok' (no drift) | 'drift' (provider drift OR any client render-sanity
// violation) | 'error' (any check failed). The probe INFORMS only.
//
// Hard guarantees (unchanged from v1):
//   - Missing required env -> HTTP 500 JSON, no DB writes.
//   - Inbound service-role Bearer auth gate (verify_jwt=false pinned in
//     config.toml) — mismatch/missing -> HTTP 401, zero DB writes, zero provider
//     calls.
//   - Per-check / per-client failure -> recorded in that slot; the run CONTINUES
//     and the row is still written with status 'error'.
//   - EXACTLY ONE evidence row written per run to c.tmr_drift_probe_run
//     (the probe's ONLY write surface — it writes to no other table; the jsonb
//     columns absorb the v2 shape change, no ALTER of that table).
//   - If the evidence write itself fails -> HTTP 500 with the full payload in
//     the response body (fail-loud, never an empty success).
//
// Invocation
//   POST /functions/v1/tmr-drift-probe   (no parameters)
//
// Auth
//   verify_jwt:false (service-role-pattern; pinned in supabase/config.toml),
//   PLUS an in-handler inbound gate: Authorization must equal
//   `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` — anything else -> HTTP 401.
//   Fired daily by pg_cron 'tmr-drift-probe-daily' 35 17 * * * UTC.
//
// Required env
//   SUPABASE_URL                  (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY     (auto-injected)
//   CREATOMATE_API_KEY            (existing project secret)
//
// Changelog
//   v2.0.0 (2026-07-07) — Spine Generalisation v1 (D3): de-hardcode. Governance
//                         source c.client_creative_governance drives the checked
//                         client set (today {PP}); expected pool DERIVED LIVE from
//                         the resolver per client; vendored markers.ts + the
//                         marker-lag check RETIRED. Provider check (a) unchanged
//                         and global. Behaviour byte-identical for PP; no live
//                         production change. STRICTLY OUT OF SCOPE: live-gate /
//                         contract rewire (v2 T3), client onboarding (v3),
//                         provider writes, enforcement.
//   v1.0.0 (2026-07-06) — initial AP-2 build: three checks, one evidence row
//                         per run, fail-loud doctrine, vendored pool markers,
//                         service-role inbound auth gate, legacy-shape render
//                         classification, provider pagination guard.

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  type BrandAssetRow,
  checkRenderSanity,
  compareProviderRegistry,
  computeEligiblePool,
  computeUnionPool,
  computeVerdict,
  type LivePoolResult,
  type ProviderCheckResult,
  type ProviderTemplate,
  type RegistryTemplate,
  type RenderCheckResult,
  type RenderRow,
  PROBE_PLATFORMS,
  PROVIDER_PAGE_LIMIT,
  providerListPossiblyTruncated,
} from "./compare.ts";

const VERSION = "tmr-drift-probe-v2.0.0";

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

// ---------- governance source: which clients are governed ----------

/** One governed (client, format) row resolved for a probe sweep. */
interface GovernedClient {
  client_id: string;
  client_slug: string;
  format: string;
  contract_ref: string | null;
  declarative_registry_ref: string | null;
  render_label: string | null;
}

/**
 * Reads the Spine Generalisation v1 governance source
 * (c.client_creative_governance WHERE enabled = true) joined to c.client for the
 * slug. This is the ONLY place the probe learns which clients to check — no PP
 * literal remains. Today this returns EXACTLY ONE row (Property Pulse ×
 * image_quote), so the sweep is byte-identical to v1's PP-only behaviour.
 */
async function fetchGovernedClients(
  supabase: SupabaseClient,
): Promise<GovernedClient[]> {
  const { data, error } = await supabase
    .schema("c")
    .from("client_creative_governance")
    .select(
      "client_id, format, contract_ref, declarative_registry_ref, render_label, client:client_id(client_slug)",
    )
    .eq("enabled", true);
  if (error) throw new Error(`governed_clients_select: ${error.message}`);
  return ((data ?? []) as {
    client_id: string;
    format: string;
    contract_ref: string | null;
    declarative_registry_ref: string | null;
    render_label: string | null;
    client: { client_slug: string | null } | null;
  }[]).map((r) => {
    const slug = r.client?.client_slug;
    if (!slug) {
      // Fail-loud: a governed row must resolve to a client slug.
      throw new Error(
        `governed_client_slug_missing: client_id=${r.client_id} format=${r.format}`,
      );
    }
    return {
      client_id: r.client_id,
      client_slug: slug,
      format: r.format,
      contract_ref: r.contract_ref,
      declarative_registry_ref: r.declarative_registry_ref,
      render_label: r.render_label,
    };
  });
}

// ---------- check (a): provider ↔ registry (GLOBAL, unchanged) ----------

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

// ---------- per-client check (b+c): live pool + render sanity ----------

async function fetchBrandAssetRows(
  supabase: SupabaseClient,
  clientId: string,
): Promise<BrandAssetRow[]> {
  const { data, error } = await supabase
    .schema("c")
    .from("client_brand_asset")
    .select("asset_id, is_active, platform_scope, created_at, asset_meta")
    .eq("client_id", clientId)
    .eq("asset_meta->>usage", "background");
  if (error) throw new Error(`brand_asset_select: ${error.message}`);
  return (data ?? []) as BrandAssetRow[];
}

async function fetchRecentRenders(
  supabase: SupabaseClient,
  clientId: string,
  renderLabel: string,
): Promise<RenderRow[]> {
  const { data, error } = await supabase
    .schema("m")
    .from("post_render_log")
    .select("render_log_id, created_at, render_spec, client_id")
    .eq("client_id", clientId)
    .eq("render_spec->>label", renderLabel)
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

/** Per-governed-client result (live-derived pool + render sanity, both fenced). */
interface ClientCheckResult {
  client_id: string;
  client_slug: string;
  format: string;
  contract_ref: string | null;
  declarative_registry_ref: string | null;
  render_label: string | null;
  live_pool: LivePoolResult | null;
  render_check: RenderCheckResult | null;
  error: string | null;
}

async function runClientCheck(
  supabase: SupabaseClient,
  gc: GovernedClient,
  now: Date,
): Promise<ClientCheckResult> {
  const base: Omit<ClientCheckResult, "live_pool" | "render_check" | "error"> = {
    client_id: gc.client_id,
    client_slug: gc.client_slug,
    format: gc.format,
    contract_ref: gc.contract_ref,
    declarative_registry_ref: gc.declarative_registry_ref,
    render_label: gc.render_label,
  };
  try {
    // (b) live-derived expected pool
    const rows = await fetchBrandAssetRows(supabase, gc.client_id);
    const poolsByPlatform: Record<string, string[]> = {};
    for (const platform of PROBE_PLATFORMS) {
      poolsByPlatform[platform] = computeEligiblePool(rows, platform, now);
    }
    const live_pool = computeUnionPool(poolsByPlatform);

    // (c) render sanity against this client's live union pool. A governed row
    // without a render_label cannot be render-checked — that is a config error.
    if (!gc.render_label) {
      throw new Error(
        `render_label_missing: client=${gc.client_slug} format=${gc.format}`,
      );
    }
    const renders = await fetchRecentRenders(
      supabase,
      gc.client_id,
      gc.render_label,
    );
    const render_check = checkRenderSanity(renders, live_pool.union_pool);

    return { ...base, live_pool, render_check, error: null };
  } catch (e) {
    return {
      ...base,
      live_pool: null,
      render_check: null,
      error: (e as Error).message,
    };
  }
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

  // Inbound auth gate (verify_jwt=false, so the gateway enforces nothing): the
  // handler requires the service-role Bearer the house cron pattern already sends.
  // Mismatch/missing -> HTTP 401, ZERO DB writes, ZERO provider calls.
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
  const now = new Date();

  // Check (a): provider ↔ registry — GLOBAL, independently fenced.
  let providerResult: ProviderCheckResult | null = null;
  let providerError: string | null = null;
  try {
    providerResult = await runProviderCheck(env, supabase);
  } catch (e) {
    providerError = (e as Error).message;
  }

  // Governance source: which clients are governed (today: exactly {PP}). If this
  // read fails there is no client set to sweep — recorded, run still writes 'error'.
  let governed: GovernedClient[] = [];
  let governedError: string | null = null;
  try {
    governed = await fetchGovernedClients(supabase);
  } catch (e) {
    governedError = (e as Error).message;
  }

  // Per-governed-client check (b+c), each independently fenced.
  const clientResults: ClientCheckResult[] = [];
  for (const gc of governed) {
    clientResults.push(await runClientCheck(supabase, gc, now));
  }

  // Verdict: provider drift OR any client render-sanity violation -> drift; any
  // check/client error (incl. the governance read) -> error.
  const anyClientRenderDrift = clientResults.some(
    (c) => c.render_check?.drift === true,
  );
  const clientErrors = clientResults
    .filter((c) => c.error !== null)
    .map((c) => `client_check[${c.client_slug}]: ${c.error}`);

  const status = computeVerdict([
    { drift: providerResult?.drift ?? null, error: providerError },
    { drift: governedError !== null ? null : anyClientRenderDrift, error: governedError },
    // Each client error contributes an error outcome (no drift bit).
    ...clientErrors.map((e) => ({ drift: null, error: e })),
  ]);

  const errors = [
    providerError ? `provider_check: ${providerError}` : null,
    governedError ? `governed_clients: ${governedError}` : null,
    ...clientErrors,
  ].filter((e): e is string => e !== null);

  const governedClientSlugs = clientResults.map((c) => c.client_slug);

  const divergenceSummary = {
    status,
    // Provider (a) — global, unchanged summary fields.
    provider_drift: providerResult?.drift ?? null,
    provider_missing_count: providerResult?.provider_missing.length ?? null,
    provider_unregistered_count: providerResult?.provider_unregistered.length ?? null,
    renamed_count: providerResult?.renamed.length ?? null,
    known_historical_count: providerResult?.known_historical.length ?? null,
    // Client sweep (b+c) — D3: governed set + per-client live pool + render sanity.
    // NOTE: the v1 `lagging_markers` field is RETIRED by design (D3) — declarative
    // -doc lag is now a separate audit/dashboard concern, not a probe verdict.
    governed_clients: governedClientSlugs,
    governed_client_count: governedClientSlugs.length,
    clients: clientResults.map((c) => ({
      client_slug: c.client_slug,
      format: c.format,
      render_label: c.render_label,
      live_pool_size: c.live_pool?.union_pool.length ?? null,
      render_violation_count: c.render_check?.violations.length ?? null,
      render_legacy_shape_count: c.render_check?.legacy_shape.length ?? null, // informational (db-rls C2), never drift
      renders_checked: c.render_check?.checked ?? null,
      error: c.error,
    })),
    errors,
  };

  const evidenceRow: EvidenceRow = {
    probe_version: VERSION,
    status,
    provider_check: providerResult ?? { error: providerError },
    // pool_check now carries the per-client live-derived pools (marker machinery gone).
    pool_check: {
      governed_clients: governedClientSlugs,
      clients: clientResults.map((c) => ({
        client_slug: c.client_slug,
        format: c.format,
        live_pool: c.live_pool,
        error: c.error,
      })),
      error: governedError,
    },
    render_check: {
      clients: clientResults.map((c) => ({
        client_slug: c.client_slug,
        render_label: c.render_label,
        render_check: c.render_check,
        error: c.error,
      })),
    },
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
        pool_check: evidenceRow.pool_check,
        render_check: evidenceRow.render_check,
        duration_ms: Date.now() - startedAt,
      },
      null,
      2,
    ),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
