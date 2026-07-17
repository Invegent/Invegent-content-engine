// supabase/functions/tmr-drift-probe/compare.ts
//
// tmr-drift-probe v2.1.0 — PURE comparison logic for the probe checks.
//
// This module is side-effect free (no network, no DB, no Deno APIs, no Date.now
// except where a caller injects `now`). Everything here is deterministic and
// fixture-testable — the deno tests in compare_test.ts drive exactly these
// functions.
//
// Checks (Spine Generalisation v1, D3 — docs/briefs/spine-generalisation-v1-packet.md):
//   (a) provider↔registry — Creatomate /v1/templates id+name set vs
//       c.creative_provider_template (the fb9820f8 outage class). GLOBAL, unchanged.
//   (b) live-derived expected pool — PER GOVERNED CLIENT, the live resolver
//       eligible background pool (full filter chain, per-platform), unioned across
//       platforms. There is NO longer any vendored-marker comparison: the expected
//       pool is DERIVED LIVE from the resolver (D3), so the AP-3/AP-4 marker-lag
//       machinery (markers.ts / comparePoolToMarkers) is RETIRED by design.
//   (c) render sanity — recent renders' background_key ∈ the client's live union pool.
//   (d) declarative coverage (D4 invariant, v2.1.0 — pp-tmr-definition-of-done-v1.md):
//       PER GOVERNED CLIENT, every LIVE governed background (usage=background,
//       is_active, approved, production_use_allowed) must be DECLARED in the pushed
//       declarative registry (pp_background_plus_scrim_v1.references_assets) OR
//       listed as an explicit exemption. must_declare − (declared ∪ exempt) =
//       violation_keys; any violation → 'drift'. INFORMS only (like the whole probe).
//       The SET math is pure here; the GitHub fetch/parse of the registry is impure
//       and lives in index.ts.

// ---------------------------------------------------------------------------
// Check (a): provider ↔ registry
// ---------------------------------------------------------------------------

/**
 * Allowlisted KNOWN-HISTORICAL provider template ids.
 *
 * fb9820f8-3fee-4448-b324-3d500fa74b40 is the original PP news-card 1:1 generic —
 * a production_proven registry row whose provider-side template was DELETED during
 * the reconciled 2026-06 cleanup (the deletion that took PP image_quote production
 * down ~27h; see docs/briefs/ap2-tmr-drift-probe-v0-packet.md source context and
 * docs/briefs/results/creatomate-provider-reconciliation-v0-result.md — the
 * 490ad9ea/fb9820f8/bc32f52f deletions are already reconciled, AP-1 evidence §3).
 * The registry row is retained deliberately as historical evidence, so its absence
 * from the provider is EXPECTED baseline, classified `known_historical`, NOT drift.
 * This is the single allowlisted id in v0 (hardcoded per the PK-approved packet).
 */
export const KNOWN_HISTORICAL_PROVIDER_IDS: readonly string[] = Object.freeze([
  "fb9820f8-3fee-4448-b324-3d500fa74b40",
]);

export interface ProviderTemplate {
  id: string;
  name: string;
}

export interface RegistryTemplate {
  provider_template_id: string;
  provider_template_name: string | null;
}

export interface RenamedEntry {
  id: string;
  registry_name: string | null;
  provider_name: string;
}

/**
 * Creatomate /v1/templates page size the probe requests. If the provider
 * returns a FULL page the inventory may be truncated, and diffing an
 * incomplete inventory would produce FALSE provider_missing drift — the
 * probe must record a check ERROR instead (db-rls-auditor C5 pagination guard).
 */
export const PROVIDER_PAGE_LIMIT = 100;

/**
 * Pure guard for the C5 pagination hazard: a provider list whose length
 * reaches the requested page limit is possibly truncated and must NOT be
 * diffed (check (a) errors 'provider_list_possibly_truncated').
 */
export function providerListPossiblyTruncated(count: number): boolean {
  return count >= PROVIDER_PAGE_LIMIT;
}

export interface ProviderCheckResult {
  /** Registered in c.creative_provider_template but ABSENT from the provider — the outage class. */
  provider_missing: RegistryTemplate[];
  /** Registered-but-absent ids on the historical allowlist — expected baseline, NOT drift. */
  known_historical: RegistryTemplate[];
  /** Present at the provider but not registered. */
  provider_unregistered: ProviderTemplate[];
  /** Same id both sides, different name. */
  renamed: RenamedEntry[];
  registered_count: number;
  provider_count: number;
  drift: boolean;
}

export function compareProviderRegistry(
  provider: ProviderTemplate[],
  registry: RegistryTemplate[],
): ProviderCheckResult {
  const providerById = new Map<string, ProviderTemplate>();
  for (const t of provider) providerById.set(t.id, t);
  const registryIds = new Set(registry.map((r) => r.provider_template_id));

  const provider_missing: RegistryTemplate[] = [];
  const known_historical: RegistryTemplate[] = [];
  const renamed: RenamedEntry[] = [];

  for (const r of registry) {
    const p = providerById.get(r.provider_template_id);
    if (!p) {
      if (KNOWN_HISTORICAL_PROVIDER_IDS.includes(r.provider_template_id)) {
        known_historical.push(r);
      } else {
        provider_missing.push(r);
      }
      continue;
    }
    if (
      r.provider_template_name !== null &&
      r.provider_template_name !== p.name
    ) {
      renamed.push({
        id: r.provider_template_id,
        registry_name: r.provider_template_name,
        provider_name: p.name,
      });
    }
  }

  const provider_unregistered = provider.filter((t) => !registryIds.has(t.id));

  const drift = provider_missing.length > 0 ||
    provider_unregistered.length > 0 ||
    renamed.length > 0;

  return {
    provider_missing,
    known_historical,
    provider_unregistered,
    renamed,
    registered_count: registry.length,
    provider_count: provider.length,
    drift,
  };
}

// ---------------------------------------------------------------------------
// Check (b): resolver eligible pool (filter-chain replica) — live-derived
// ---------------------------------------------------------------------------

/**
 * Raw c.client_brand_asset row shape the probe SELECTs (per governed client,
 * usage filter applied in SQL; the FULL chain is re-applied here so the logic is
 * pure-testable).
 */
export interface BrandAssetRow {
  asset_id: string;
  is_active: boolean | null;
  platform_scope: string[] | null;
  created_at: string;
  asset_meta: Record<string, unknown> | null;
}

/** The three platforms the probe evaluates (per Q-AP2-2 / registers v5.02 fence fact). */
export const PROBE_PLATFORMS: readonly string[] = Object.freeze([
  "facebook",
  "instagram",
  "linkedin",
]);

function metaText(
  meta: Record<string, unknown> | null,
  key: string,
): string | null {
  if (!meta) return null;
  const v = meta[key];
  if (v === null || v === undefined) return null;
  // jsonb ->> renders scalars as text (booleans as 'true'/'false', numbers as digits).
  if (typeof v === "string") return v;
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  return null; // objects/arrays would not satisfy any filter below
}

/**
 * Postgres boolean-literal cast semantics for `(text)::boolean` — the resolver
 * casts asset_meta->>'approved'. Accepts t/true/y/yes/on/1 and f/false/n/no/off/0
 * (case-insensitive, trimmed). Anything else would RAISE in SQL; the probe treats
 * it as not-true (the row cannot be an eligible pool member either way).
 */
function pgBooleanIsTrue(text: string | null): boolean {
  if (text === null) return false;
  const t = text.trim().toLowerCase();
  // v1.1 carry (db-rls C3, recorded not fixed): Postgres also accepts unique
  // PREFIXES of the boolean literals ('tr', 'fals', …); not replicated here.
  return ["t", "true", "y", "yes", "on", "1"].includes(t);
}

/**
 * Replica of the resolve_slot_assets v1.1 background filter chain
 * (supabase/migrations/20260704002811_update_resolve_slot_assets_v1_1_scrim48.sql §4):
 *   usage=background · is_active · approved · license present · not expired ·
 *   bucket='brand-assets' · platform_scope NULL-or-contains-platform ·
 *   safe_for_text_overlay ∈ ('true','needs_scrim').
 * Returns eligible asset_keys in resolver RANK order: 'true' class first, then
 * 'needs_scrim', each in (created_at ASC, asset_id ASC).
 *
 * The probe always supplies a concrete platform (never NULL), so the resolver's
 * NULL-platform permissive branch is intentionally not replicated.
 */
export function computeEligiblePool(
  rows: BrandAssetRow[],
  platform: string,
  now: Date,
): string[] {
  const eligible: { key: string; sfto: string; created_at: string; asset_id: string }[] = [];

  for (const r of rows) {
    const meta = r.asset_meta;
    const usage = metaText(meta, "usage");
    if (usage !== "background") continue;
    if (r.is_active !== true) continue;
    if (!pgBooleanIsTrue(metaText(meta, "approved"))) continue;
    const licenseType = metaText(meta, "license_type");
    const license = metaText(meta, "license");
    if (licenseType === null && license === null) continue;
    const expiresAt = metaText(meta, "license_expires_at");
    if (expiresAt !== null) {
      const exp = new Date(expiresAt);
      if (Number.isNaN(exp.getTime())) continue; // malformed timestamp would RAISE in SQL; never eligible here
      if (exp.getTime() < now.getTime()) continue;
    }
    const bucket = metaText(meta, "bucket") ?? "";
    if (bucket !== "brand-assets") continue;
    if (r.platform_scope !== null && !r.platform_scope.includes(platform)) {
      continue;
    }
    const sfto = metaText(meta, "safe_for_text_overlay");
    if (sfto !== "true" && sfto !== "needs_scrim") continue;

    eligible.push({
      key: metaText(meta, "asset_key") ?? r.asset_id,
      sfto,
      created_at: r.created_at,
      asset_id: r.asset_id,
    });
  }

  // v1.1 carry (db-rls C4, recorded not fixed): JS Date compares at MILLISECOND
  // precision; sub-ms created_at differences fall through to the asset_id
  // tiebreak, whereas Postgres orders timestamptz at microsecond precision.
  const byTiebreak = (
    a: { created_at: string; asset_id: string },
    b: { created_at: string; asset_id: string },
  ) => {
    const at = new Date(a.created_at).getTime();
    const bt = new Date(b.created_at).getTime();
    if (at !== bt) return at - bt;
    return a.asset_id < b.asset_id ? -1 : a.asset_id > b.asset_id ? 1 : 0;
  };
  const trueClass = eligible.filter((e) => e.sfto === "true").sort(byTiebreak);
  const needsClass = eligible.filter((e) => e.sfto === "needs_scrim").sort(byTiebreak);
  return [...trueClass, ...needsClass].map((e) => e.key);
}

/**
 * A governed client's live-derived expected background pool (D3): the per-platform
 * eligible pools plus their union. There is NO drift verdict here — the union is the
 * live-derived EXPECTED pool that check (c) validates a client's renders against.
 * (The former vendored-marker lag comparison is retired by design.)
 */
export interface LivePoolResult {
  live_pools_by_platform: Record<string, string[]>;
  union_pool: string[];
}

/**
 * Union the per-platform eligible pools into the client's live-derived expected
 * pool, preserving first-seen order (resolver rank order within each platform).
 */
export function computeUnionPool(
  poolsByPlatform: Record<string, string[]>,
): LivePoolResult {
  const unionSet = new Set<string>();
  const union_pool: string[] = [];
  for (const platform of Object.keys(poolsByPlatform)) {
    for (const key of poolsByPlatform[platform]) {
      if (!unionSet.has(key)) {
        unionSet.add(key);
        union_pool.push(key);
      }
    }
  }
  return { live_pools_by_platform: poolsByPlatform, union_pool };
}

// ---------------------------------------------------------------------------
// Check (c): render sanity
// ---------------------------------------------------------------------------

export interface RenderRow {
  render_log_id: string;
  created_at: string;
  background_key: string | null;
  /** true when render_spec carries the 'tmr' evidence block (Option-D shape). */
  has_tmr_evidence: boolean;
}

export interface RenderViolation {
  render_log_id: string;
  created_at: string;
  background_key: string | null;
  reason: "background_key_missing" | "background_key_not_in_pool";
}

/** Informational record of a pre-Option-D-shape render (NOT a violation). */
export interface RenderLegacyEntry {
  render_log_id: string;
  created_at: string;
}

export interface RenderCheckResult {
  checked: number;
  violations: RenderViolation[];
  /**
   * Legacy-shape rows (db-rls-auditor C2): live truth includes ONE succeeded
   * B1 render (c3c7489b…, 2026-06-26) whose render_spec has only
   * [label, template] keys — pre-Option-D shape, no background_key and no tmr
   * evidence block. Counted + listed INFORMATIONALLY; never a violation, never
   * sets drift (would otherwise pollute the blind acceptance case).
   */
  legacy_shape: RenderLegacyEntry[];
  drift: boolean;
}

export function checkRenderSanity(
  renders: RenderRow[],
  unionPool: string[],
): RenderCheckResult {
  const pool = new Set(unionPool);
  const violations: RenderViolation[] = [];
  const legacy_shape: RenderLegacyEntry[] = [];
  for (const r of renders) {
    if (r.background_key === null || r.background_key === "") {
      if (!r.has_tmr_evidence) {
        // No background_key AND no tmr block → pre-Option-D legacy shape (C2):
        // informational, not drift.
        legacy_shape.push({
          render_log_id: r.render_log_id,
          created_at: r.created_at,
        });
      } else {
        // The Option-D contract guarantees background_key when the tmr block
        // is present — its absence here is a GENUINE violation.
        violations.push({
          render_log_id: r.render_log_id,
          created_at: r.created_at,
          background_key: r.background_key,
          reason: "background_key_missing",
        });
      }
    } else if (!pool.has(r.background_key)) {
      violations.push({
        render_log_id: r.render_log_id,
        created_at: r.created_at,
        background_key: r.background_key,
        reason: "background_key_not_in_pool",
      });
    }
  }
  return {
    checked: renders.length,
    violations,
    legacy_shape,
    drift: violations.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Check (d): declarative coverage (D4 invariant) — v2.1.0
// ---------------------------------------------------------------------------
//
// The D4 invariant (pp-tmr-definition-of-done-v1.md, 2026-07-17): every
// active/approved/production-use governed background MUST be declared in the
// pushed declarative registry OR explicitly exempted (or deactivated). This
// mechanises the "declared control production never reads" failure mode in the
// OTHER direction — it catches a LIVE governed asset that was never back-declared.
// All logic here is pure SET/shape math; the network+JSON fetch of the registry
// (references_assets + exemptions) is impure and lives in index.ts.

/**
 * An exemption entry as it may appear in
 * pp_background_plus_scrim_v1.layout_rules.background_declaration_exemptions —
 * either a bare key string OR a { key, reason? } object. Empty array = no
 * exemptions.
 */
export type DeclarationExemption = string | { key: string; reason?: string };

/**
 * Normalise the raw exemptions array to a de-duplicated list of keys. Accepts
 * string entries and { key } objects; ignores anything else. A non-array input
 * (missing/undefined field) normalises to [] — "empty = no exemptions".
 */
export function normaliseExemptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const e of raw) {
    let key: string | null = null;
    if (typeof e === "string") {
      key = e;
    } else if (
      e && typeof e === "object" &&
      typeof (e as { key?: unknown }).key === "string"
    ) {
      key = (e as { key: string }).key;
    }
    if (key && key.length > 0 && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/**
 * must_declare_set — the LIVE governed background keys that the D4 invariant
 * requires to be declared-or-exempt. From the SAME c.client_brand_asset rows the
 * probe already fetches for check (b) (usage=background), keep the rows that are
 * is_active AND approved AND production_use_allowed (COALESCE(...,true)=true —
 * an ABSENT production_use_allowed means allowed). Deduplicated asset_key list.
 *
 * NOTE: this filter is DELIBERATELY BROADER than check (b)'s eligible-pool chain
 * (no license / bucket / platform / text-safety fences): D4 asks "is this a live
 * governed asset that must be declared", NOT "is it resolver-eligible right now".
 */
export function computeMustDeclareSet(rows: BrandAssetRow[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const meta = r.asset_meta;
    if (metaText(meta, "usage") !== "background") continue;
    if (r.is_active !== true) continue;
    if (!pgBooleanIsTrue(metaText(meta, "approved"))) continue;
    // COALESCE((asset_meta->>'production_use_allowed')::bool, true) = true:
    // absent -> allowed; present-and-not-true -> excluded.
    const pua = metaText(meta, "production_use_allowed");
    if (pua !== null && !pgBooleanIsTrue(pua)) continue;
    const key = metaText(meta, "asset_key");
    if (!key) continue; // a governed asset with no asset_key cannot be declared
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/** The pure D4 coverage verdict (index.ts adds registry_version + registry_source). */
export interface DeclarativeCoverageResult {
  status: "ok" | "drift";
  must_declare_count: number;
  declared_count: number;
  exempt_count: number;
  violation_keys: string[];
}

/**
 * Pure D4 predicate: violation_keys = must_declare − (declared ∪ exempt), in
 * must_declare order, deduplicated. status = 'drift' iff any violation, else 'ok'.
 */
export function computeDeclarativeCoverage(
  declaredKeys: string[],
  exemptKeys: string[],
  mustDeclareKeys: string[],
): DeclarativeCoverageResult {
  const covered = new Set<string>([...declaredKeys, ...exemptKeys]);
  const violation_keys: string[] = [];
  const seenViol = new Set<string>();
  for (const k of mustDeclareKeys) {
    if (!covered.has(k) && !seenViol.has(k)) {
      seenViol.add(k);
      violation_keys.push(k);
    }
  }
  return {
    status: violation_keys.length > 0 ? "drift" : "ok",
    must_declare_count: new Set(mustDeclareKeys).size,
    declared_count: new Set(declaredKeys).size,
    exempt_count: new Set(exemptKeys).size,
    violation_keys,
  };
}

// ---------------------------------------------------------------------------
// Run verdict
// ---------------------------------------------------------------------------

export type RunStatus = "ok" | "drift" | "error";

export interface CheckOutcome<T extends { drift: boolean }> {
  result: T | null;
  error: string | null;
}

/**
 * Verdict doctrine (packet success criteria): any check failure → 'error'
 * (a probe error is a visible failed run, never an empty success); otherwise
 * any divergence anywhere → 'drift'; otherwise 'ok'.
 */
export function computeVerdict(
  outcomes: { drift: boolean | null; error: string | null }[],
): RunStatus {
  if (outcomes.some((o) => o.error !== null)) return "error";
  if (outcomes.some((o) => o.drift === true)) return "drift";
  return "ok";
}
