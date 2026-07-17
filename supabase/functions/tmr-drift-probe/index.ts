// supabase/functions/tmr-drift-probe/index.ts
//
// tmr-drift-probe-v2.1.0 — TMR Provider/Registry Drift Probe (client-driven).
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
// WHAT CHANGED IN v2.1.0 (D4-close lane) — additive check (d), informs-only:
//   · ADDED check (d) DECLARATIVE-COVERAGE (the D4 invariant, Option 3): per
//     governed client, every LIVE governed background (usage=background,
//     is_active, approved, production_use_allowed) must be DECLARED in the pushed
//     declarative registry OR explicitly exempted. Fetches the client's registry
//     file from GitHub `main` via raw.githubusercontent (GITHUB_PAT auth — REUSING
//     the drift-check precedent, NO new secret), parses
//     pp_background_plus_scrim_v1.references_assets (declared) +
//     layout_rules.background_declaration_exemptions (exempt; string or {key}),
//     computes must_declare − (declared ∪ exempt) = violation_keys. Any violation
//     -> the run status is 'drift'. INFORMS only — no block, no remediation.
//   · Check (d) is INDEPENDENTLY FENCED: a registry fetch/parse failure (incl. a
//     missing GITHUB_PAT) is a recorded check-(d) error and the run CONTINUES;
//     checks (a)/(b)/(c) are byte-unchanged. GITHUB_PAT is therefore NOT added to
//     the required-env gate (that would 500 the whole run on absence and suppress
//     (a)/(b)/(c)) — check (d) reads it itself and fails loud only for itself.
//   · The declarative_coverage object is nested into the existing jsonb columns
//     (divergence_summary.clients[]) — NO new column, NO DDL of c.tmr_drift_probe_run.
//
// STRICTLY OUT OF SCOPE (this lane): the live image-worker/ai-worker gate + the
// contract resolver (v2 T3); onboarding any client / populating a second
// governance row (v3 data lane); any provider write; any write outside
// c.tmr_drift_probe_run; new secrets (GITHUB_PAT is an EXISTING project secret);
// any DDL of the evidence table; enforcement/blocking/remediation behaviour. The
// probe still INFORMS only — it never blocks, gates, or auto-remediates.
//
// Three checks per run (D3 + D4):
//   (a) provider↔registry — GET creatomate /v1/templates (GET ONLY; the probe
//       performs NO provider mutation of any kind) vs c.creative_provider_template:
//       provider_missing[] (the outage class; fb9820f8 allowlisted as
//       known_historical — see compare.ts), provider_unregistered[], renamed[].
//       GLOBAL, not client-scoped.
//   (b+c) per governed client — live eligible background pool per platform
//       (replicating resolve_slot_assets v1.1), union = live-derived expected pool;
//       then render sanity: each recent succeeded render labelled with the client's
//       render_label must have render_spec->>'background_key' in that live union.
//       The declarative registry is NEVER read on the render path (runtime-import
//       guard) — check (d) reads it only from the pushed GitHub copy, out-of-band.
//   (d) declarative coverage (D4) — per governed client, must_declare (live
//       governed backgrounds) − (declared ∪ exempt from the pushed registry) =
//       violation_keys; any violation -> 'drift'. Independently fenced, informs only.
//
// Verdict: 'ok' (no drift) | 'drift' (provider drift OR any client render-sanity
// violation OR any client declarative-coverage violation) | 'error' (any check
// failed). The probe INFORMS only.
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
// Optional env (check (d) only — absence fails ONLY check (d), never the run)
//   GITHUB_PAT                    (EXISTING project secret; private-repo raw fetch)
//
// Changelog
//   v2.1.0 (2026-07-17) — D4-close lane: ADD additive, informs-only check (d)
//                         DECLARATIVE-COVERAGE. Per governed client, fetch the
//                         pushed declarative registry from GitHub main via
//                         raw.githubusercontent (GITHUB_PAT auth — reused
//                         drift-check precedent, NO new secret), parse
//                         pp_background_plus_scrim_v1.references_assets (declared) +
//                         layout_rules.background_declaration_exemptions (exempt),
//                         and flag any live governed background (must_declare) in
//                         neither. Any violation -> run status 'drift'. Check (d) is
//                         INDEPENDENTLY FENCED (a fetch/parse/GITHUB_PAT failure is a
//                         recorded check-(d) error; run continues; (a)/(b)/(c)
//                         byte-unchanged). Nested into divergence_summary.clients[]
//                         (no new column, no DDL). Pure SET math in compare.ts;
//                         network+JSON in index.ts. STRICTLY OUT OF SCOPE: any
//                         block/remediation, new secret, evidence-table DDL.
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
  computeDeclarativeCoverage,
  type DeclarativeCoverageResult,
  computeEligiblePool,
  computeMustDeclareSet,
  computeUnionPool,
  computeVerdict,
  type LivePoolResult,
  normaliseExemptions,
  type ProviderCheckResult,
  type ProviderTemplate,
  type RegistryTemplate,
  type RenderCheckResult,
  type RenderRow,
  PROBE_PLATFORMS,
  PROVIDER_PAGE_LIMIT,
  providerListPossiblyTruncated,
} from "./compare.ts";

const VERSION = "tmr-drift-probe-v2.1.0";

const CREATOMATE_TEMPLATES_URL =
  "https://api.creatomate.com/v1/templates?limit=100";

const RENDER_SANITY_LIMIT = 20;

// ---- check (d): declarative registry (GitHub main, GITHUB_PAT auth) ----
// REUSES the drift-check precedent (raw.githubusercontent + GITHUB_PAT for the
// private repo). GITHUB_PAT is an EXISTING project secret — NOT a new secret, and
// deliberately NOT in the required-env gate (see readEnv): its absence fails only
// check (d), never the run.
const GITHUB_OWNER = "Invegent";
const GITHUB_REPO = "Invegent-content-engine";
const GITHUB_REF = "main";
// The declarative_registry_ref in c.client_creative_governance is a filename
// pointer ('property-pulse.json'); the registry files live under this repo dir.
// A ref that already contains a '/' is treated as a full repo-relative path.
const DECLARATIVE_REGISTRY_DIR = "docs/creative-library";
// The D4 pattern that declares the governed background pool. Stable registry
// contract key (pp-tmr-definition-of-done-v1.md). references_assets = declared;
// layout_rules.background_declaration_exemptions = exempt.
const BACKGROUND_PATTERN_KEY = "pp_background_plus_scrim_v1";
const REGISTRY_SOURCE = "github:main";

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

// ---------- check (d): declarative coverage (D4 invariant) — v2.1.0 ----------

/**
 * The declarative_coverage object written into the evidence row: the pure D4
 * verdict plus the registry provenance the fetch supplies.
 */
interface DeclarativeCoverage extends DeclarativeCoverageResult {
  registry_version: string | null;
  registry_source: string;
}

/** Raw declared/exempt inputs extracted from the pushed registry JSON (impure). */
interface RegistryFetchResult {
  declared: string[];
  exemptionsRaw: unknown;
  registry_version: string | null;
  registry_source: string;
}

/**
 * Fetch + parse a governed client's declarative registry from GitHub `main`
 * (raw.githubusercontent, GITHUB_PAT auth — the drift-check precedent for the
 * private repo). Extracts the declared background pool
 * (pp_background_plus_scrim_v1.references_assets) and the raw exemptions list.
 * FAILS LOUD (throws) on missing GITHUB_PAT / missing pointer / HTTP error /
 * malformed JSON / missing pattern — the caller records it as a check-(d) error.
 */
async function fetchDeclarativeRegistry(
  registryRef: string | null,
): Promise<RegistryFetchResult> {
  if (!registryRef) {
    throw new Error(
      "declarative_registry_ref_missing: governed row has no registry pointer",
    );
  }
  const pat = Deno.env.get("GITHUB_PAT");
  if (!pat) {
    // Fail loud like drift-check — but ONLY for check (d) (the caller fences it).
    throw new Error(
      "missing GITHUB_PAT: cannot fetch the private-repo declarative registry",
    );
  }
  const path = registryRef.includes("/")
    ? registryRef
    : `${DECLARATIVE_REGISTRY_DIR}/${registryRef}`;
  const url =
    `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_REF}/${path}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
      "User-Agent": "tmr-drift-probe/2.1",
    },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(
      `fetch_declarative_registry ${resp.status} (${path}): ${
        body.slice(0, 200)
      }`,
    );
  }
  const text = await resp.text();
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch (e) {
    throw new Error(`declarative_registry_parse (${path}): ${(e as Error).message}`);
  }

  const patterns = (doc as { patterns?: unknown }).patterns;
  if (!Array.isArray(patterns)) {
    throw new Error(
      `declarative_registry_shape (${path}): patterns[] missing or not an array`,
    );
  }
  const pattern = patterns.find((p) =>
    p && typeof p === "object" &&
    (p as { pattern_key?: unknown }).pattern_key === BACKGROUND_PATTERN_KEY
  ) as { references_assets?: unknown; layout_rules?: unknown } | undefined;
  if (!pattern) {
    throw new Error(
      `declarative_registry_shape (${path}): pattern '${BACKGROUND_PATTERN_KEY}' not found`,
    );
  }
  const refs = pattern.references_assets;
  if (!Array.isArray(refs)) {
    throw new Error(
      `declarative_registry_shape (${path}): ${BACKGROUND_PATTERN_KEY}.references_assets missing or not an array`,
    );
  }
  const declared = refs.filter((k): k is string => typeof k === "string");

  const layoutRules = pattern.layout_rules;
  // Missing/undefined exemptions -> normaliseExemptions returns [] ("empty = none").
  const exemptionsRaw = (layoutRules && typeof layoutRules === "object")
    ? (layoutRules as { background_declaration_exemptions?: unknown })
      .background_declaration_exemptions
    : undefined;

  const rv = (doc as { registry_version?: unknown }).registry_version;
  const registry_version = typeof rv === "string" ? rv : null;

  return {
    declared,
    exemptionsRaw,
    registry_version,
    registry_source: REGISTRY_SOURCE,
  };
}

/**
 * Compose check (d) for one governed client: fetch the pushed registry (impure),
 * normalise exemptions + compute must_declare (pure), and derive the coverage
 * verdict. `rows` are the SAME brand-asset rows check (b) already fetched.
 */
async function runDeclarativeCoverageCheck(
  gc: GovernedClient,
  rows: BrandAssetRow[],
): Promise<DeclarativeCoverage> {
  const reg = await fetchDeclarativeRegistry(gc.declarative_registry_ref);
  const exempt = normaliseExemptions(reg.exemptionsRaw);
  const mustDeclare = computeMustDeclareSet(rows);
  const cov = computeDeclarativeCoverage(reg.declared, exempt, mustDeclare);
  return {
    ...cov,
    registry_version: reg.registry_version,
    registry_source: reg.registry_source,
  };
}

/** Per-governed-client result (live-derived pool + render sanity + D4 coverage). */
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
  // check (d) — INDEPENDENTLY fenced from (b)/(c).
  declarative_coverage: DeclarativeCoverage | null;
  declarative_error: string | null;
}

async function runClientCheck(
  supabase: SupabaseClient,
  gc: GovernedClient,
  now: Date,
): Promise<ClientCheckResult> {
  const base: Omit<
    ClientCheckResult,
    | "live_pool"
    | "render_check"
    | "error"
    | "declarative_coverage"
    | "declarative_error"
  > = {
    client_id: gc.client_id,
    client_slug: gc.client_slug,
    format: gc.format,
    contract_ref: gc.contract_ref,
    declarative_registry_ref: gc.declarative_registry_ref,
    render_label: gc.render_label,
  };

  // (b)+(c) — behaviour byte-unchanged from v2.0.0. rows is captured in the outer
  // scope so check (d) can reuse it even if (c)'s render fetch later fails.
  let rows: BrandAssetRow[] | null = null;
  let live_pool: LivePoolResult | null = null;
  let render_check: RenderCheckResult | null = null;
  let error: string | null = null;
  try {
    // (b) live-derived expected pool
    rows = await fetchBrandAssetRows(supabase, gc.client_id);
    const poolsByPlatform: Record<string, string[]> = {};
    for (const platform of PROBE_PLATFORMS) {
      poolsByPlatform[platform] = computeEligiblePool(rows, platform, now);
    }
    live_pool = computeUnionPool(poolsByPlatform);

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
    render_check = checkRenderSanity(renders, live_pool.union_pool);
  } catch (e) {
    // Preserve v2.0.0 semantics: any (b)/(c) failure nulls both slots.
    error = (e as Error).message;
    live_pool = null;
    render_check = null;
  }

  // (d) declarative coverage — ADDITIVE, INDEPENDENTLY fenced. A failure here
  // NEVER disturbs (b)/(c) and vice versa. Needs the brand-asset rows from (b).
  let declarative_coverage: DeclarativeCoverage | null = null;
  let declarative_error: string | null = null;
  try {
    if (rows === null) {
      throw new Error(
        `declarative_coverage_skipped: brand-asset fetch failed (${error ?? "unknown"})`,
      );
    }
    declarative_coverage = await runDeclarativeCoverageCheck(gc, rows);
  } catch (e) {
    declarative_error = (e as Error).message;
  }

  return {
    ...base,
    live_pool,
    render_check,
    error,
    declarative_coverage,
    declarative_error,
  };
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

  // Verdict: provider drift OR any client render-sanity violation OR any client
  // declarative-coverage (D4) violation -> drift; any check/client error (incl.
  // the governance read, incl. a check-(d) registry fetch/parse error) -> error.
  const anyClientRenderDrift = clientResults.some(
    (c) => c.render_check?.drift === true,
  );
  const anyDeclarativeDrift = clientResults.some(
    (c) => c.declarative_coverage?.status === "drift",
  );
  const clientErrors = clientResults
    .filter((c) => c.error !== null)
    .map((c) => `client_check[${c.client_slug}]: ${c.error}`);
  // Check (d) errors are recorded but DO NOT mask (a)/(b)/(c): each is its own
  // error outcome, distinct from client_check[...] so the two never collide.
  const declarativeErrors = clientResults
    .filter((c) => c.declarative_error !== null)
    .map((c) => `declarative_coverage[${c.client_slug}]: ${c.declarative_error}`);

  const status = computeVerdict([
    { drift: providerResult?.drift ?? null, error: providerError },
    { drift: governedError !== null ? null : anyClientRenderDrift, error: governedError },
    // Declarative-coverage drift (only meaningful when the governance read succeeded).
    { drift: governedError !== null ? null : anyDeclarativeDrift, error: null },
    // Each client error contributes an error outcome (no drift bit).
    ...clientErrors.map((e) => ({ drift: null, error: e })),
    // Each check-(d) error contributes an error outcome (no drift bit).
    ...declarativeErrors.map((e) => ({ drift: null, error: e })),
  ]);

  const errors = [
    providerError ? `provider_check: ${providerError}` : null,
    governedError ? `governed_clients: ${governedError}` : null,
    ...clientErrors,
    ...declarativeErrors,
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
    // Client sweep (b+c+d) — D3: governed set + per-client live pool + render
    // sanity; D4 (v2.1.0): per-client declarative coverage.
    // NOTE: the v1 `lagging_markers` field is RETIRED by design (D3) — declarative
    // -doc lag is now a separate audit/dashboard concern, not a probe verdict.
    governed_clients: governedClientSlugs,
    governed_client_count: governedClientSlugs.length,
    // D4 roll-up: run-level drift bit for check (d).
    declarative_coverage_drift: governedError !== null ? null : anyDeclarativeDrift,
    clients: clientResults.map((c) => ({
      client_slug: c.client_slug,
      format: c.format,
      render_label: c.render_label,
      live_pool_size: c.live_pool?.union_pool.length ?? null,
      render_violation_count: c.render_check?.violations.length ?? null,
      render_legacy_shape_count: c.render_check?.legacy_shape.length ?? null, // informational (db-rls C2), never drift
      renders_checked: c.render_check?.checked ?? null,
      error: c.error,
      // check (d) — the full declarative_coverage object nested per client:
      // { status, must_declare_count, declared_count, exempt_count,
      //   violation_keys[], registry_version, registry_source } (or null on error).
      declarative_coverage: c.declarative_coverage,
      declarative_coverage_error: c.declarative_error,
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
