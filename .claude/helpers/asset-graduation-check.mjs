// asset-graduation-check.mjs — Asset Graduation Slice 1 (static background images)
//
// PURPOSE
//   Answer one question for a batch of FENCED background-asset candidates:
//   "Which mechanical questions are already answered, and which are not?"
//   It PRINTS a decision sheet and DECIDES NOTHING. It is a lens, not a gate.
//
// WHAT IT IS (contract: docs/briefs/asset-graduation-contract-v1.md;
//   build packet: docs/briefs/asset-graduation-backgrounds-slice1-build-packet-v1.md)
//   Zero-authority, deterministic, read-only. No network. No DB. No fs WRITE.
//   No git. It consumes a JSON payload produced by the hash-pinned read pack
//   (docs/briefs/artifacts/asset-graduation-candidates-v1.sql) and emits a
//   structured result. It mirrors the PROVEN shape of hash-checkpoint.mjs:
//   exported PURE-CORE functions (deterministic, unit-testable, no I/O) driven
//   by a thin main() that runs only on direct invocation, FAIL-CLOSED throughout.
//
// THE VERDICT CONTRACT
//   Native: READY_FOR_PK_REVIEW · FAILED · INCOMPLETE.
//   Normalized (CCF-02): READY_FOR_PK_REVIEW→clean · FAILED→block ·
//   INCOMPLETE→block.
//   READY_FOR_PK_REVIEW means "the mechanical questions are answered", NOT
//   "approve this". PK's visual verdict remains the only deciding act.
//
// THE GRADUATION RATCHET (contract §0)
//   Automation may move an asset only in the fail-closed direction. This tool
//   moves nothing at all. It cannot grant production eligibility, cannot flip a
//   fence, and its clean verdict clears NO gate (PK ruling 3, 2026-07-30).
//
// FOUR HONESTY GUARDRAILS (the whole point)
//   1. Never writes. No DB, no storage, no fence, no repo file. Read-only in,
//      report out.
//   2. Never a false READY. Every ambiguity resolves toward FAILED/INCOMPLETE.
//      Any internal/parse/validation error → INCOMPLETE. Unknown or missing
//      data on a BLOCKING check is `not_run`, and `not_run` NEVER counts as
//      `pass` (PK required proof, 2026-07-30).
//   3. Never claims a check it did not run. C12 (declared == resolver-reachable)
//      and C13 (pool neutrality) are explicitly NOT_EVALUATED in Slice 1 and are
//      stamped as such on every asset and on the batch. C12 stays guard G5
//      inside the T3 promotion apply.
//   4. Never clears the PK-visual-review flag. `requires_pk_visual_review`
//      defaults TRUE and no input can turn it off except positive, recorded
//      evidence of a prior PK approval for THAT client at THAT crop.
//
// PK GATE-1 RULINGS ENCODED HERE (2026-07-30)
//   R1 judgment framework only — no DB object; output is an auditable artifact.
//   R2 retained-crop floor 60%, and the ACTUAL retained percentage is always
//      reported so the threshold can later be calibrated from evidence.
//   R3 no auto-graduation carve-out; shadow/advisory only.
//   R4 hash-pinned prompted batch read; no widened SQL access.
//   R5 shared pool in scope from day one; ownership model always classified as
//      client_owned / shared_pooled / shared_unreachable / indeterminate.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// ===========================================================================
// PURE CORE — no side effects, no fs, no network, no clock, no randomness.
// Payload in, structured result out. These are what the unit tests exercise.
// ===========================================================================

export const VERDICT = {
  READY: 'READY_FOR_PK_REVIEW',
  FAILED: 'FAILED',
  INCOMPLETE: 'INCOMPLETE',
};

export const NORMALIZED = { CLEAN: 'clean', BLOCK: 'block' };

export const STATUS = { PASS: 'pass', FAIL: 'fail', NOT_RUN: 'not_run', NOT_EVALUATED: 'not_evaluated' };

export const OWNERSHIP = {
  CLIENT_OWNED: 'client_owned',
  SHARED_POOLED: 'shared_pooled',
  SHARED_UNREACHABLE: 'shared_unreachable',
  INDETERMINATE: 'indeterminate',
};

// Reason-code provenance. PK required proof: every failure maps either to the
// EXISTING resolver vocabulary or to a CLEARLY LABELLED graduation-only
// mechanical reason. `resolver` codes are verbatim literals read from
// supabase/migrations/20260703002813_create_resolve_slot_assets_v1.sql.
export const ORIGIN = { RESOLVER: 'resolver', GRADUATION: 'graduation' };

export const REASONS = {
  // ---- verbatim resolver literals (…resolve_slot_assets_v1.sql:179-209) ----
  inactive: ORIGIN.RESOLVER,
  not_approved: ORIGIN.RESOLVER,
  license_missing: ORIGIN.RESOLVER,
  license_expired: ORIGIN.RESOLVER,
  output_as_input_risk: ORIGIN.RESOLVER,
  platform_excluded: ORIGIN.RESOLVER,
  not_text_safe: ORIGIN.RESOLVER,
  text_safety_unknown: ORIGIN.RESOLVER,
  // ---- v1.5 geography literals (broll-rotation-governance-v1) ----
  geo_unclassified: ORIGIN.RESOLVER,
  geo_conflict: ORIGIN.RESOLVER,
  // ---- shared-pool literals, confirmed live against pg_get_functiondef
  // (public.resolve_slot_assets), 2026-07-30 — NOT from the base migration file ----
  purpose_bound: ORIGIN.RESOLVER,
  // ---- graduation-only mechanical reasons (contract §11) ----
  licence_unsafe: ORIGIN.GRADUATION,
  licence_ambiguous: ORIGIN.GRADUATION,
  provenance_incomplete: ORIGIN.GRADUATION,
  hash_mismatch: ORIGIN.GRADUATION,
  object_unreachable: ORIGIN.GRADUATION,
  legible_signage: ORIGIN.GRADUATION,
  identifiable_person: ORIGIN.GRADUATION,
  cultural_flag: ORIGIN.GRADUATION,
  sensitivity_escalate: ORIGIN.GRADUATION,
  dimension_short: ORIGIN.GRADUATION,
  upscale_required: ORIGIN.GRADUATION,
  aspect_mismatch: ORIGIN.GRADUATION,
  slot_contract_mismatch: ORIGIN.GRADUATION,
  // PK ruling 2026-07-30: this is NOT an existing resolver literal and must never
  // be dressed as one. The resolver silently EXCLUDES such a row from its
  // candidate loop before producing any rejection reason at all, so there is no
  // resolver word to borrow — hence a graduation-specific code.
  usage_not_resolver_eligible: ORIGIN.GRADUATION,
  shared_pool_unreachable: ORIGIN.GRADUATION,
  ownership_indeterminate: ORIGIN.GRADUATION,
  duplicate_exact: ORIGIN.GRADUATION,
  previously_rejected: ORIGIN.GRADUATION,
  fence_open_on_intake: ORIGIN.GRADUATION,
  theme_mismatch: ORIGIN.GRADUATION,
};

// Remediation route per reason (contract §11). Deliberately terse — the route,
// not a lecture. `null` means "no mechanical route; PK judgment".
export const REMEDIATION = {
  licence_unsafe: 'discard — never re-offer; write the composite fingerprint',
  licence_ambiguous: 'PK per-asset exception, or discard — silence is not permission',
  license_expired: 're-source; auto-retire if already graduated',
  license_missing: 're-harvest with full licence metadata',
  provenance_incomplete: 're-harvest with full provenance metadata',
  hash_mismatch: 'HARD STOP — investigate the object; never patch the recorded hash',
  object_unreachable: 'fix storage; auto-fence if already graduated',
  legible_signage: 'discard — never "fix in crop"',
  identifiable_person: 'discard unless documented asset-specific rights + PK',
  cultural_flag: 'ESCALATE to PK — never auto-anything',
  sensitivity_escalate: 'ESCALATE to PK',
  dimension_short: 're-source at higher resolution',
  upscale_required: 're-source native, or re-encode and re-intake as a NEW asset',
  aspect_mismatch: 're-source at native target aspect',
  text_safety_unknown: 'do NOT edit the value in place — re-assess against the real crop',
  not_text_safe: 'template needs a scrim, or re-source',
  platform_excluded: 'platform_scope widening — a T3 PK gate, not an edit',
  slot_contract_mismatch: 'wrong asset class for this format — re-route',
  usage_not_resolver_eligible: "correct asset_meta.usage through the GOVERNED INTAKE PATH (a reviewed, guarded, PK-gated apply) — never by an ad-hoc in-place metadata edit. The resolver admits only usage IN ('background','logo'); any other value makes the row silently invisible to selection",
  shared_pool_unreachable: 'client has no permissive client_asset_pool_policy — grant one (T3) or use a client-owned asset',
  ownership_indeterminate: 'resolve the owning table / client binding before any graduation',
  geo_unclassified: 'classify from the SOURCE TITLE, not the provider tag; record the basis',
  geo_conflict: 'correct the label, or exclude for this client×format',
  duplicate_exact: 'discard, cite the incumbent',
  previously_rejected: 'discard — the composite fingerprint already caught it once',
  fence_open_on_intake: 'ABORT — the row was born unfenced; close the fence before anything else',
  theme_mismatch: null,
  inactive: null,
  not_approved: null,
  output_as_input_risk: 'the asset is a pipeline output — never re-ingest a render as a source',
};

// The resolver's literal accepted text-safety vocabulary
// (…resolve_slot_assets_v1.sql:207). Anything outside this set fails CLOSED in
// production while still counting toward a flag-based pool total — the false-6
// class (broll-promotion-batch1-result.md §11.2).
export const SFTO_ACCEPTED = ['true', 'needs_scrim'];

// Provider allow-list (image-harvester charter). Hold-list and excluded
// licences are NEVER offered without a per-asset PK exception.
export const PROVIDER_ALLOWLIST = ['unsplash', 'pexels', 'wikimedia'];
export const LICENCE_HOLDLIST = ['cc-by', 'cc-by-sa', 'ai-generated', 'paid-stock', 'commissioned'];

// PK ruling 2 (2026-07-30): 60% retained source area, provisional.
export const RETAINED_AREA_FLOOR = 0.60;

// Slice-1 check register. `blocking` drives the verdict rollup; a non-blocking
// check can flag but never fail a batch.
export const CHECKS = [
  { id: 'C1', name: 'byte_identity', blocking: true },
  { id: 'C2', name: 'object_reachability', blocking: true },
  { id: 'C3', name: 'rights_and_provenance', blocking: true },
  { id: 'C4', name: 'dimensions_and_aspect', blocking: true },
  { id: 'C5', name: 'geography_classification', blocking: true },
  { id: 'C6', name: 'content_theme', blocking: false },
  { id: 'C7', name: 'slot_compatibility', blocking: true },
  { id: 'C8', name: 'text_safety_vocabulary', blocking: true },
  { id: 'C9', name: 'exact_duplicate', blocking: true },
  { id: 'C10', name: 'previously_rejected', blocking: true },
  { id: 'C11', name: 'near_duplicate_phash', blocking: false },
  { id: 'C12', name: 'declared_equals_reachable', blocking: false },
  { id: 'C13', name: 'pool_neutrality', blocking: false },
  { id: 'C14', name: 'fence_integrity', blocking: true },
  { id: 'D7', name: 'compression_artefact', blocking: false },
];

// Checks Slice 1 deliberately does NOT evaluate, with where they actually live.
// Stamped on every result so a clean sheet can never imply they were checked.
export const NOT_EVALUATED_IN_SLICE1 = {
  C12: 'declared == resolver-reachable — requires a live seed sweep; stays guard G5 inside the T3 promotion apply',
  C13: 'pool neutrality — an in-transaction apply assertion; there is no transaction here',
};

const CHECK_BY_ID = Object.fromEntries(CHECKS.map((c) => [c.id, c]));

export function normalizedVerdict(v) {
  return v === VERDICT.READY ? NORMALIZED.CLEAN : NORMALIZED.BLOCK;
}

// Deterministic serialization: object keys sorted at every depth. Same input
// bytes → same output bytes, always (PK required proof: determinism).
export function stableStringify(value) {
  const walk = (v) => {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(walk);
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = walk(v[k]);
    return out;
  };
  return JSON.stringify(walk(value), null, 2);
}

// FNV-1a over the stable serialization. A content digest for the audit record —
// not a security hash, and never presented as one.
export function inputDigest(value) {
  const s = stableStringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isArr = (v) => Array.isArray(v);
const lc = (v) => (isStr(v) ? v.trim().toLowerCase() : '');
// Tri-state boolean read. A missing/unparseable flag is UNKNOWN, never false —
// the difference between "we checked and it's safe" and "we never looked".
const tri = (v) => {
  if (v === true || v === 'true' || v === 't') return true;
  if (v === false || v === 'false' || v === 'f') return false;
  return null;
};

function mk(status, reason = null, detail = null, data = null) {
  const out = { status };
  if (reason) out.reason_code = reason;
  if (detail) out.detail = detail;
  if (data) out.data = data;
  return out;
}

// ---------------------------------------------------------------------------
// Crop geometry — the arithmetic behind PK ruling 2.
//
// A cover-crop to the target aspect retains min(As,At)/max(As,At) of the source
// AREA, where As and At are the source and target aspect ratios. Verified
// against the recorded real case: 1920×1080 → 1080×1920 gives 0.5625/1.7778 =
// 31.6% retained and a 1.78× upscale (broll-promotion-batch1-result.md §11.2
// records ~32% and ≈1.78×).
// ---------------------------------------------------------------------------
export function cropGeometry(srcW, srcH, tgtW, tgtH) {
  if (!isNum(srcW) || !isNum(srcH) || !isNum(tgtW) || !isNum(tgtH)) return null;
  if (srcW <= 0 || srcH <= 0 || tgtW <= 0 || tgtH <= 0) return null;
  const as = srcW / srcH;
  const at = tgtW / tgtH;
  const retained = Math.min(as, at) / Math.max(as, at);
  // The source-pixel region kept by a cover-crop to the target aspect.
  const cropW = as > at ? srcH * at : srcW;
  const cropH = as > at ? srcH : srcW / at;
  const upscale = Math.max(tgtW / cropW, tgtH / cropH);
  return {
    source_w: srcW,
    source_h: srcH,
    target_w: tgtW,
    target_h: tgtH,
    source_aspect: round4(as),
    target_aspect: round4(at),
    crop_w: round2(cropW),
    crop_h: round2(cropH),
    // PK ruling 2: ALWAYS report the actual percentage, not just pass/fail, so
    // the 60% floor can be calibrated from evidence later.
    retained_area_pct: round2(retained * 100),
    upscale_factor: round4(upscale),
    is_native_exact: srcW === tgtW && srcH === tgtH,
  };
}

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

// ---------------------------------------------------------------------------
// C14 — fence integrity. Runs FIRST conceptually: a row born unfenced is an
// exposure, not a candidate.
//
// c.client_brand_asset.is_active defaults OPEN (asset-governed-intake-framework
// -v1.md:47), so an ABSENT is_active is exactly the default-open trap and must
// fail — never be read as "probably false".
// ---------------------------------------------------------------------------
export function checkFenceIntegrity(a) {
  const table = lc(a.source_table);
  const active = tri(a.is_active);

  if (!isStr(a.source_table)) {
    return mk(STATUS.NOT_RUN, null, 'source_table absent — cannot determine which fence model applies');
  }

  if (table === 'c.client_brand_asset') {
    if (active === null) {
      return mk(STATUS.FAIL, 'fence_open_on_intake',
        'is_active is absent/unparseable and this column DEFAULTS OPEN on c.client_brand_asset — an unset fence is an open fence');
    }
    if (active === true) {
      return mk(STATUS.FAIL, 'fence_open_on_intake', 'is_active=true on a candidate row');
    }
    const approved = tri(a.asset_meta_approved);
    if (approved === true) {
      return mk(STATUS.FAIL, 'fence_open_on_intake', 'asset_meta.approved=true on a candidate row');
    }
    return mk(STATUS.PASS, null, 'is_active=false explicitly set (default-open column correctly closed)');
  }

  if (table === 'c.shared_creative_asset') {
    const opened = [];
    if (active !== false) opened.push(`is_active=${a.is_active ?? 'absent'}`);
    if (tri(a.production_use_allowed) !== false) opened.push(`production_use_allowed=${a.production_use_allowed ?? 'absent'}`);
    if (lc(a.approval_status) !== 'intake_candidate') opened.push(`approval_status=${a.approval_status ?? 'absent'}`);
    if (opened.length) {
      return mk(STATUS.FAIL, 'fence_open_on_intake', `fence(s) not closed: ${opened.join(', ')}`);
    }
    if (lc(a.sensitivity_class) === 'unknown' || !isStr(a.sensitivity_class)) {
      return mk(STATUS.FAIL, 'fence_open_on_intake', 'sensitivity_class is unclassified — must never be left \'unknown\'');
    }
    return mk(STATUS.PASS, null, 'all shared-pool fences closed and sensitivity classified');
  }

  return mk(STATUS.NOT_RUN, null, `unrecognised source_table '${a.source_table}'`);
}

// ---------------------------------------------------------------------------
// C7 — slot compatibility, and the PK-ruling-5 ownership classification.
//
// CORRECTED 2026-07-30 against the LIVE deployed public.resolve_slot_assets
// (pg_get_functiondef), NOT the base migration file — the two have already
// diverged once elsewhere in ICE (creatomate-registry-integrity-graduation
// -contract-v1.md §0.3's undocumented "A2" extension) and this session found
// a second, independent instance of the same class:
//
//   c.client_asset_pool_policy has NO `permitted_scopes` array. Reachability
//   is derived from TWO BOOLEAN COLUMNS — `allow_vertical_shared` and
//   `allow_global_shared` — matched against the asset's `governance_scope`
//   ('global_generic' / 'vertical_shared' / 'purpose_bound' — a CHECK
//   constraint, confirmed live). The live function builds this permitted-set
//   itself: `IF pool_policy IN ('client_preferred','best_fit') THEN
//   IF allow_vertical_shared THEN permitted += 'vertical_shared'; IF
//   allow_global_shared THEN permitted += 'global_generic'; END IF`, then
//   filters `WHERE governance_scope = ANY(permitted)`.
//
//   `governance_scope='purpose_bound'` can NEVER enter `permitted` under any
//   policy — 'purpose_bound' is not one of the two literals the loop ever
//   adds. This matches the contract's own model (§1's participant/campaign-
//   bound assets never auto-enter the reusable pool) and is asserted here
//   directly from the live WHERE-clause construction, not inferred.
//
// NAMED GAP (not modeled, disclosed rather than silently assumed complete):
//   the live function ALSO checks a per-row BOOLEAN `purpose_bound` column
//   (defense-in-depth even for global_generic/vertical_shared rows), plus
//   `vertical_key` match and `allowed_clients`/`excluded_clients` membership.
//   The read pack does not currently select these columns. SHARED_POOLED
//   here means "policy + governance_scope permit consultation" — it is NOT a
//   complete reachability proof. See POSTURE.
// ---------------------------------------------------------------------------
export function classifyOwnership(a) {
  const table = lc(a.source_table);
  if (!isStr(a.source_table) || !isStr(a.client_id)) return OWNERSHIP.INDETERMINATE;
  if (table === 'c.client_brand_asset') return OWNERSHIP.CLIENT_OWNED;
  if (table !== 'c.shared_creative_asset') return OWNERSHIP.INDETERMINATE;

  // Shared. The policy row is the whole question.
  const policy = a.client_asset_pool_policy;
  if (policy === undefined) return OWNERSHIP.INDETERMINATE; // we never looked
  if (policy === null) return OWNERSHIP.SHARED_UNREACHABLE; // we looked; no row ⇒ client_only
  const mode = lc(policy.pool_policy);
  if (!isStr(policy.pool_policy)) return OWNERSHIP.INDETERMINATE;
  if (mode === 'client_only') return OWNERSHIP.SHARED_UNREACHABLE;
  if (mode !== 'client_preferred' && mode !== 'best_fit') return OWNERSHIP.INDETERMINATE;

  const gs = lc(a.governance_scope);
  if (!isStr(a.governance_scope)) return OWNERSHIP.INDETERMINATE;
  // Structural exclusion: 'purpose_bound' is never added to the live permitted
  // set by any policy — confirmed from the function's own construction, not
  // merely absence of a matching flag.
  if (gs === 'purpose_bound') return OWNERSHIP.SHARED_UNREACHABLE;
  if (gs === 'global_generic') {
    const allowed = tri(policy.allow_global_shared);
    if (allowed === null) return OWNERSHIP.INDETERMINATE;
    return allowed ? OWNERSHIP.SHARED_POOLED : OWNERSHIP.SHARED_UNREACHABLE;
  }
  if (gs === 'vertical_shared') {
    const allowed = tri(policy.allow_vertical_shared);
    if (allowed === null) return OWNERSHIP.INDETERMINATE;
    return allowed ? OWNERSHIP.SHARED_POOLED : OWNERSHIP.SHARED_UNREACHABLE;
  }
  return OWNERSHIP.INDETERMINATE; // an unrecognised governance_scope value
}

// The resolver's genuinely valid asset_meta.usage literals for the Background/
// Logo family — confirmed live: a row outside this set NEVER enters the
// candidate loop under ANY target template, regardless of the target's
// Background field type. This is the true "silently excluded, no target could
// ever admit it" case.
export const USAGE_LITERALS = ['background', 'broll_background', 'logo'];

// Kind vocabulary equivalence across the two source tables' own vocabularies —
// the evaluator works in the normalized {image, video} space; the read pack is
// responsible for translating each table's native values into it.
const STATIC_IMAGE_KINDS = ['image', 'static_background'];
const VIDEO_KINDS = ['video', 'video_broll'];

export function checkSlotCompatibility(a, ownership) {
  if (ownership === OWNERSHIP.INDETERMINATE) {
    return mk(STATUS.FAIL, 'ownership_indeterminate',
      'ownership/fence model could not be determined — fail-closed rather than guess which reachability rule applies');
  }
  if (ownership === OWNERSHIP.SHARED_UNREACHABLE) {
    return mk(STATUS.FAIL, 'shared_pool_unreachable',
      "shared asset, but the client's c.client_asset_pool_policy does not permit this governance_scope (pool_policy='client_only', or the matching allow_vertical_shared/allow_global_shared flag is false, or governance_scope='purpose_bound' which is NEVER shared-pool-eligible under any policy) — graduating this would create a PHANTOM pool entry: counted, never selectable");
  }

  // Slot must exist and match element kind. The resolver models exactly two
  // slots — Background and Logo (cc-0073 §A).
  const slot = lc(a.target_slot);
  if (!isStr(a.target_slot)) return mk(STATUS.NOT_RUN, null, 'target_slot absent');
  if (slot !== 'background') {
    return mk(STATUS.FAIL, 'slot_contract_mismatch',
      `Slice 1 governs the Background slot only; got '${a.target_slot}'`);
  }

  // ---------------------------------------------------------------------------
  // asset_meta.usage — CORRECTED 2026-07-30 against the LIVE function body.
  //
  // Admission is CONDITIONAL on the TARGET template's Background field type
  // (`v_bg_is_video`), not a single fixed set: `usage='broll_background'` IS
  // live-admitted for a video-typed Background field. Confirmed live:
  //   (usage='logo') OR (v_bg_is_video AND usage='broll_background')
  //     OR (NOT v_bg_is_video AND usage='background')
  // A row outside USAGE_LITERALS is invisible under EVERY target — the true
  // "no resolver word exists for this" case. A row WITH a genuine literal that
  // simply doesn't match SLICE 1's OWN static-image scope is a scope decision,
  // not a resolver-admission fact — it must not be mislabelled as
  // usage_not_resolver_eligible, which would falsely imply the resolver
  // universally excludes it.
  // ---------------------------------------------------------------------------
  if (lc(a.source_table) === 'c.client_brand_asset') {
    const usage = a.asset_meta_usage;
    if (!isStr(usage) || !USAGE_LITERALS.includes(lc(usage))) {
      return mk(STATUS.FAIL, 'usage_not_resolver_eligible',
        `asset_meta.usage is ${isStr(usage) ? `'${usage}'` : 'absent'} — the resolver's candidate loop admits ONLY usage IN (${USAGE_LITERALS.map((u) => `'${u}'`).join(', ')}) under ANY target template, so this row would be SILENTLY EXCLUDED before any rejection reason is produced, regardless of what is being evaluated. GRADUATION-ONLY mechanical check: there is no resolver literal for this because the resolver never reports it`);
    }
    if (lc(usage) === 'logo') {
      return mk(STATUS.FAIL, 'slot_contract_mismatch',
        "asset_meta.usage='logo' is a real, live-admitted resolver literal — for the Logo slot, not Background. Wrong slot for this evaluation");
    }
    if (lc(usage) === 'broll_background') {
      return mk(STATUS.FAIL, 'slot_contract_mismatch',
        "asset_meta.usage='broll_background' IS a real, live-admitted resolver literal — for a VIDEO-typed Background field. Slice 1 governs STATIC image backgrounds only (B-roll video is Slice 5). This is a Slice-1 SCOPE decision, not a resolver-eligibility defect — do not confuse the two");
    }
    // usage === 'background' from here — Slice 1's own scope.
  }

  // Kind cross-check (defense-in-depth against a data inconsistency: usage
  // says 'background' but the derived/recorded kind disagrees). Works across
  // both source tables' native vocabularies via the normalized equivalence —
  // c.shared_creative_asset's real CHECK values are 'static_background' /
  // 'logo' / 'image' / 'video_broll' (confirmed live), not the plain
  // 'image'/'video' the read pack synthesizes for client_brand_asset.
  const kind = a.asset_kind;
  if (!isStr(kind)) {
    return mk(STATUS.NOT_RUN, null, 'asset_kind absent/unresolved — cannot confirm this is a static image');
  }
  if (VIDEO_KINDS.includes(lc(kind))) {
    return mk(STATUS.FAIL, 'slot_contract_mismatch',
      `asset_kind='${kind}' is a VIDEO background — Slice 1 governs STATIC image backgrounds only (B-roll video is Slice 5)`);
  }
  if (!STATIC_IMAGE_KINDS.includes(lc(kind))) {
    return mk(STATUS.FAIL, 'slot_contract_mismatch',
      `asset_kind='${kind}' is neither a recognised static-image kind (${STATIC_IMAGE_KINDS.join('/')}) nor a recognised video kind (${VIDEO_KINDS.join('/')}) — unrecognised asset class`);
  }

  // platform_scope is a COLUMN, not an asset_meta key (cc-0073 §A). NULL means
  // "all platforms"; a non-NULL array must contain every target platform.
  const targets = isArr(a.target_platforms) ? a.target_platforms.map(lc) : null;
  if (targets === null || targets.length === 0) {
    return mk(STATUS.NOT_RUN, null, 'target_platforms absent — cannot verify platform_scope coverage');
  }
  if (a.platform_scope !== null && a.platform_scope !== undefined) {
    if (!isArr(a.platform_scope)) {
      return mk(STATUS.NOT_RUN, null, 'platform_scope present but not an array — unreadable');
    }
    const have = a.platform_scope.map(lc);
    const missing = targets.filter((p) => !have.includes(p));
    if (missing.length) {
      return mk(STATUS.FAIL, 'platform_excluded',
        `platform_scope does not cover: ${missing.join(', ')} — the asset would silently never appear there`);
    }
  }
  return mk(STATUS.PASS, null, `Background/image slot, platforms covered (${targets.join(', ')})`, { ownership });
}

// ---------------------------------------------------------------------------
// C8 — the false-6 guard. Highest-value check in Slice 1.
// ---------------------------------------------------------------------------
export function checkTextSafetyVocabulary(a) {
  const v = a.safe_for_text_overlay;
  if (v === null || v === undefined || !isStr(v)) {
    return mk(STATUS.FAIL, 'text_safety_unknown', 'safe_for_text_overlay absent — the resolver fails this closed');
  }
  const s = lc(v);
  if (s === 'false') {
    return mk(STATUS.FAIL, 'not_text_safe', "safe_for_text_overlay='false'");
  }
  if (!SFTO_ACCEPTED.includes(s)) {
    return mk(STATUS.FAIL, 'text_safety_unknown',
      `'${v}' is OUTSIDE the resolver's accepted vocabulary {${SFTO_ACCEPTED.join(', ')}} — production fails this asset closed while a flag-based pool count still includes it (the FALSE-POOL class)`);
  }
  return mk(STATUS.PASS, null, `'${s}' is in the resolver's accepted vocabulary`,
    s === 'needs_scrim' ? { rank_note: "the resolver ranks 'true' above 'needs_scrim' — legal, but second-class" } : null);
}

// ---------------------------------------------------------------------------
// C4 — dimensions and aspect. The ONLY gate where this can be enforced at all:
// the resolver applies no aspect filter by design
// (…resolve_slot_assets_v1.sql:35).
// ---------------------------------------------------------------------------
export function checkDimensions(a) {
  const g = cropGeometry(a.source_width, a.source_height, a.target_width, a.target_height);
  if (!g) {
    return mk(STATUS.NOT_RUN, null, 'source or target dimensions absent/invalid');
  }
  const data = { geometry: g };

  // D4 first when the class admits native only — it is the strictest and the
  // most specific diagnosis (guard G7 precedent).
  if (a.native_only_class === true && !g.is_native_exact) {
    return mk(STATUS.FAIL, 'aspect_mismatch',
      `class admits NATIVE ${g.target_w}×${g.target_h} only; source is ${g.source_w}×${g.source_h} (retained ${g.retained_area_pct}%, upscale ${g.upscale_factor}×)`, data);
  }
  // D1 — genuinely too small: cannot supply the target even at the right aspect.
  const srcMax = Math.max(g.source_w, g.source_h);
  const srcMin = Math.min(g.source_w, g.source_h);
  const tgtMax = Math.max(g.target_w, g.target_h);
  const tgtMin = Math.min(g.target_w, g.target_h);
  if (srcMax < tgtMax || srcMin < tgtMin) {
    return mk(STATUS.FAIL, 'dimension_short',
      `source ${g.source_w}×${g.source_h} is smaller than target ${g.target_w}×${g.target_h} in raw pixels`, data);
  }
  // D2 — enough raw pixels, but the crop to target aspect throws away so much
  // that an upscale is required. This is the recorded 16:9→9:16 defect.
  if (g.upscale_factor > 1.0001) {
    return mk(STATUS.FAIL, 'upscale_required',
      `cover-crop to ${g.target_w}×${g.target_h} retains only ${g.retained_area_pct}% of frame and needs a ${g.upscale_factor}× upscale — visibly soft, and invisible in every pool count`, data);
  }
  // D3 — retained-area floor (PK ruling 2, provisional 60%).
  if (g.retained_area_pct < RETAINED_AREA_FLOOR * 100) {
    return mk(STATUS.FAIL, 'aspect_mismatch',
      `retained source area ${g.retained_area_pct}% is below the ${RETAINED_AREA_FLOOR * 100}% floor`, data);
  }
  return mk(STATUS.PASS, null,
    `retained ${g.retained_area_pct}% of source, upscale ${g.upscale_factor}× — mechanical crop check only; composition, subject loss and signage truncation remain PK's call`, data);
}

// ---------------------------------------------------------------------------
// C3 — rights and provenance.
// ---------------------------------------------------------------------------
export function checkRights(a, nowIso) {
  // Sensitive-content fences come first: they are absolute, and no licence
  // evidence can unlock them.
  if (tri(a.legible_signage) === true) {
    return mk(STATUS.FAIL, 'legible_signage', 'readable third-party signage/branding in the crop area');
  }
  if (tri(a.identifiable_person) === true) {
    return mk(STATUS.FAIL, 'identifiable_person', 'identifiable person present — prohibited by default');
  }
  if (tri(a.cultural_element) === true) {
    return mk(STATUS.FAIL, 'cultural_flag', 'cultural element present — ESCALATE, never auto-anything');
  }
  const phase = a.ndis_phase;
  if (phase === 2 || phase === 3 || phase === '2' || phase === '3') {
    return mk(STATUS.FAIL, 'sensitivity_escalate', `NDIS Phase ${phase} — Phase 2 CLOSED, Phase 3 HELD`);
  }

  const prov = a.provenance || {};
  const missing = [];
  for (const f of ['source_url', 'provider_asset_id', 'author']) {
    if (!isStr(prov[f])) missing.push(f);
  }

  // Provider identity: a dedicated `provider` field, OR derived from a
  // recognised `licence_name` pattern. CORRECTED 2026-07-30 against the live
  // shadow batch: c.shared_creative_asset does NOT populate a distinct
  // `provider` key at all (confirmed on all 9 real fenced shared candidates
  // read this session) — its `licence_name` ('pexels', 'wikimedia_cc0', …) IS
  // the provider identity in this corpus's convention. Requiring a SEPARATE
  // field the table structurally never has was a genuine defect in this
  // check, not a real corpus gap — fixed here. `provider_asset_id` stays a
  // hard requirement (contract §4 point 3, deliberately NOT relaxed: most
  // real rows genuinely lack it, which is an authentic provenance-completeness
  // finding, not a false positive to paper over).
  let provider = isStr(prov.provider) ? lc(prov.provider) : null;
  if (!provider && isStr(prov.licence_name)) {
    const ln = lc(prov.licence_name);
    if (ln.includes('pexels')) provider = 'pexels';
    else if (ln.includes('unsplash')) provider = 'unsplash';
    else if (ln.includes('wikimedia')) provider = 'wikimedia';
  }
  if (!provider) missing.push('provider (no dedicated field, and licence_name does not identify a known provider)');

  if (missing.length) {
    return mk(STATUS.FAIL, 'provenance_incomplete', `missing provenance field(s): ${missing.join(', ')}`);
  }
  if (!isStr(prov.licence_name) || !isStr(prov.licence_url)) {
    return mk(STATUS.FAIL, 'license_missing', 'licence name and/or licence URL absent');
  }

  if (!PROVIDER_ALLOWLIST.includes(provider)) {
    return mk(STATUS.FAIL, 'licence_unsafe',
      `provider '${provider}' is not on the allow-list {${PROVIDER_ALLOWLIST.join(', ')}}`);
  }
  const licence = lc(prov.licence_name).replace(/\s+/g, '-');
  const held = LICENCE_HOLDLIST.find((h) => licence.includes(h));
  if (held && tri(prov.pk_exception) !== true) {
    return mk(STATUS.FAIL, 'licence_unsafe',
      `licence '${prov.licence_name}' is on the hold-list (${held}) and carries no recorded per-asset PK exception`);
  }

  const commercial = tri(prov.commercial_use_permitted);
  if (commercial !== true) {
    return mk(STATUS.FAIL, 'licence_ambiguous',
      `commercial_use_permitted is ${commercial === null ? 'unrecorded' : 'false'} — silence is not permission`);
  }

  if (isStr(prov.licence_expires_at)) {
    const exp = Date.parse(prov.licence_expires_at);
    const now = Date.parse(nowIso);
    if (Number.isNaN(exp) || Number.isNaN(now)) {
      return mk(STATUS.NOT_RUN, null, 'licence_expires_at or evaluation date unparseable');
    }
    if (exp <= now) {
      return mk(STATUS.FAIL, 'license_expired', `licence expired ${prov.licence_expires_at}`);
    }
  }

  // Shared assets additionally need documented multi-entity rights.
  if (lc(a.source_table) === 'c.shared_creative_asset') {
    const multi = tri(a.licence_allows_multi_entity_use);
    if (multi !== true) {
      return mk(STATUS.FAIL, 'licence_ambiguous',
        'shared-pool asset without documented multi-entity use rights — per-client only');
    }
  }
  return mk(STATUS.PASS, null, `${prov.provider} / ${prov.licence_name}, commercial use documented`);
}

// ---------------------------------------------------------------------------
// C1 / C2 — byte identity and object reachability. No network here: both are
// evaluated from observations the read pack (or a hash-observation file)
// supplied. Absent observation → not_run, never pass.
// ---------------------------------------------------------------------------
export function checkByteIdentity(a) {
  const h = a.hash_observations;
  if (!h || typeof h !== 'object') {
    return mk(STATUS.NOT_RUN, null, 'no hash observations supplied (this tool performs no network reads)');
  }
  const recorded = lc(a.asset_meta_sha256);
  const local = lc(h.sha256_local);
  const remote = lc(h.sha256_public_url);
  const present = [recorded, local, remote].filter((x) => x !== '');
  if (present.length < 2) {
    return mk(STATUS.NOT_RUN, null, 'fewer than two of {asset_meta.sha256, local bytes, public URL} available to compare');
  }
  const distinct = new Set(present);
  if (distinct.size > 1) {
    return mk(STATUS.FAIL, 'hash_mismatch',
      `sha256 disagreement — meta=${recorded || 'absent'} local=${local || 'absent'} public=${remote || 'absent'}`);
  }
  if (present.length < 3) {
    return mk(STATUS.NOT_RUN, null, `only ${present.length} of 3 hashes available — agreement is partial, not proof`);
  }
  return mk(STATUS.PASS, null, 'asset_meta.sha256 == local bytes == public URL bytes');
}

export function checkObjectReachability(a) {
  const bucket = lc(a.asset_meta_bucket);
  if (bucket !== 'brand-assets') {
    // The resolver's own literal for this case is `output_as_input_risk`, not a
    // generic unreachable: the brand-assets bucket is the ONLY acceptable
    // SOURCE, and anything else risks feeding a rendered output back in as an
    // input (…resolve_slot_assets_v1.sql:186-190). Reuse its word, not ours.
    return mk(STATUS.FAIL, 'output_as_input_risk',
      `asset_meta.bucket is '${a.asset_meta_bucket ?? 'absent'}' — only 'brand-assets' is an acceptable source bucket`);
  }
  const o = a.url_observations;
  if (!o || typeof o !== 'object' || !isNum(o.http_status)) {
    return mk(STATUS.NOT_RUN, null, 'no URL observation supplied (this tool performs no network reads)');
  }
  if (o.http_status !== 200) {
    return mk(STATUS.FAIL, 'object_unreachable', `HTTP ${o.http_status} on asset_url`);
  }
  if (isStr(o.content_type) && !lc(o.content_type).startsWith('image/')) {
    return mk(STATUS.FAIL, 'object_unreachable', `content-type '${o.content_type}' is not an image`);
  }
  return mk(STATUS.PASS, null, 'object reachable in brand-assets, HTTP 200');
}

// ---------------------------------------------------------------------------
// C5 — geography. A provider tag is a HINT, never a basis: four separate wrong
// Pexels geo tags this arc (broll-promotion-batch1-result.md §12.1).
// ---------------------------------------------------------------------------
export function checkGeography(a) {
  if (!isStr(a.geo_scope)) {
    return mk(STATUS.FAIL, 'geo_unclassified', 'geo_scope absent — never silently treated as generic');
  }
  const known = isArr(a.known_geo_classes) ? a.known_geo_classes.map(lc) : null;
  if (known === null) {
    return mk(STATUS.NOT_RUN, null, 'known_geo_classes not supplied — cannot verify the class exists in c.geo_class');
  }
  if (!known.includes(lc(a.geo_scope))) {
    return mk(STATUS.FAIL, 'geo_unclassified', `'${a.geo_scope}' is not a known c.geo_class key`);
  }
  const basis = lc(a.geo_basis);
  if (!isStr(a.geo_basis)) {
    return mk(STATUS.FAIL, 'geo_unclassified', 'geo_basis not recorded — the label must state how it was determined');
  }
  if (basis === 'provider_tag') {
    return mk(STATUS.FAIL, 'geo_unclassified',
      'geo_basis is the provider tag alone — provider geo tags have been wrong four separate times this arc; use the source title or an explicit human call');
  }
  return mk(STATUS.PASS, null, `geo_scope='${a.geo_scope}' (basis: ${a.geo_basis})`);
}

// ---------------------------------------------------------------------------
// C6 — content theme. ADVISORY ONLY. Vocabulary conformance is mechanical;
// whether the image FEELS right for the brand is PK's, and this never claims it.
// ---------------------------------------------------------------------------
export function checkTheme(a) {
  const tags = isArr(a.subject_tags) ? a.subject_tags.map(lc).filter(Boolean) : null;
  if (tags === null || tags.length === 0) {
    return mk(STATUS.NOT_RUN, null, 'subject_tags absent — no vocabulary to check');
  }
  const vocab = isArr(a.family_tag_vocabulary) ? a.family_tag_vocabulary.map(lc) : null;
  if (vocab === null) {
    return mk(STATUS.NOT_RUN, null, 'family_tag_vocabulary not supplied');
  }
  const off = tags.filter((t) => !vocab.includes(t));
  if (off.length) {
    return mk(STATUS.FAIL, 'theme_mismatch',
      `tag(s) outside the family vocabulary: ${off.sort().join(', ')} — ADVISORY: routes to PK judgment, does not block`);
  }
  return mk(STATUS.PASS, null, 'subject tags conform to the family vocabulary (vocabulary only — brand fit is PK\'s call)');
}

// ---------------------------------------------------------------------------
// C9 / C10 — duplicate detection.
// ---------------------------------------------------------------------------
export function checkExactDuplicate(a) {
  const sha = lc(a.asset_meta_sha256);
  if (!sha) return mk(STATUS.NOT_RUN, null, 'asset_meta.sha256 absent');
  const pool = isArr(a.existing_pool_sha256) ? a.existing_pool_sha256.map(lc) : null;
  if (pool === null) return mk(STATUS.NOT_RUN, null, 'existing_pool_sha256 not supplied');
  if (pool.includes(sha)) return mk(STATUS.FAIL, 'duplicate_exact', `sha256 ${sha.slice(0, 12)}… already present in the pool`);
  return mk(STATUS.PASS, null, 'no exact sha256 duplicate in the pool');
}

// Composite key = provider + provider_asset_id/source_url + sha256 (the
// Gate-1-locked key; sha256 alone misses the same image at another size).
export function rejectedFingerprint(prov, sha) {
  const p = lc(prov?.provider);
  const id = lc(prov?.provider_asset_id) || lc(prov?.source_url);
  return `${p}|${id}|${lc(sha)}`;
}

export function checkPreviouslyRejected(a) {
  const store = a.rejected_fingerprints;
  if (!isArr(store)) {
    return mk(STATUS.NOT_RUN, null, 'rejected-fingerprint store not supplied — its existence is not assumed');
  }
  const fp = rejectedFingerprint(a.provenance, a.asset_meta_sha256);
  if (fp.split('|').some((p) => p === '')) {
    return mk(STATUS.NOT_RUN, null, 'composite key incomplete (need provider + asset_id/url + sha256)');
  }
  if (store.map(lc).includes(fp)) {
    return mk(STATUS.FAIL, 'previously_rejected', `composite fingerprint ${fp} is in the rejected store`);
  }
  return mk(STATUS.PASS, null, 'composite fingerprint not previously rejected');
}

// ---------------------------------------------------------------------------
// Guardrail 4 — the PK-visual-review flag. Defaults TRUE; only positive,
// recorded evidence of a prior PK approval for THAT client at THAT crop can
// turn it off, and any §10 trigger pins it back on irreversibly.
// ---------------------------------------------------------------------------
export function computePkReviewFlag(a, checks) {
  const triggers = [];
  const prior = a.prior_pk_approval;
  const hasPrior = prior && typeof prior === 'object'
    && isStr(prior.client_id) && prior.client_id === a.client_id
    && isStr(prior.evidence_reference)
    && isStr(prior.crop_geometry_key) && prior.crop_geometry_key === a.crop_geometry_key;

  if (!hasPrior) triggers.push('no recorded prior PK approval for this client at this crop (contract §10.1/§10.2)');
  if (tri(a.identifiable_person) === true) triggers.push('identifiable person (§10.4)');
  if (tri(a.cultural_element) === true) triggers.push('cultural element (§10.4)');
  if (a.ndis_phase === 2 || a.ndis_phase === 3) triggers.push('NDIS Phase 2/3 subject (§10.4)');
  if (tri(a.brand_neutral_reclassified) === true) triggers.push('brand-neutral ⇄ client-specific reclassification (§10.5)');
  if (tri(a.new_shape) === true) triggers.push('first asset of a new shape (§10.7)');
  const rv = lc(a.reviewer_verdict);
  if (rv && !['pass', 'pass_with_note'].includes(rv)) triggers.push(`reviewer verdict '${a.reviewer_verdict}' (§10.3)`);
  if (checks.C6?.reason_code === 'theme_mismatch') triggers.push('theme outside the family vocabulary (§10.6)');

  return { required: triggers.length > 0, triggers: triggers.sort() };
}

// ---------------------------------------------------------------------------
// Per-asset evaluation.
// ---------------------------------------------------------------------------
export function evaluateAsset(asset, ctx = {}) {
  const a = asset || {};
  const nowIso = ctx.evaluated_at || '1970-01-01T00:00:00Z';
  const ownership = classifyOwnership(a);

  const checks = {
    C1: checkByteIdentity(a),
    C2: checkObjectReachability(a),
    C3: checkRights(a, nowIso),
    C4: checkDimensions(a),
    C5: checkGeography(a),
    C6: checkTheme(a),
    C7: checkSlotCompatibility(a, ownership),
    C8: checkTextSafetyVocabulary(a),
    C9: checkExactDuplicate(a),
    C10: checkPreviouslyRejected(a),
    C11: mk(STATUS.NOT_RUN, null, 'perceptual/pHash near-duplicate DEFERRED to v2 by Gate-1 ruling — never reported as pass'),
    C12: mk(STATUS.NOT_EVALUATED, null, NOT_EVALUATED_IN_SLICE1.C12),
    C13: mk(STATUS.NOT_EVALUATED, null, NOT_EVALUATED_IN_SLICE1.C13),
    C14: checkFenceIntegrity(a),
    D7: mk(STATUS.NOT_RUN, null, 'compression/artefact judgment stays with image-reviewer and PK'),
  };

  // First failing BLOCKING check wins the headline reason — mirroring the
  // resolver's own "FIRST failing filter = the reason_code" convention.
  // C14 is hoisted: a row born unfenced is an exposure, not a candidate.
  const order = ['C14', 'C1', 'C2', 'C3', 'C4', 'C5', 'C7', 'C8', 'C9', 'C10'];
  let reason = null;
  let detail = null;
  const blockingGaps = [];
  for (const id of order) {
    const r = checks[id];
    if (r.status === STATUS.FAIL && reason === null) {
      reason = r.reason_code;
      detail = `${id} ${CHECK_BY_ID[id].name}: ${r.detail ?? ''}`.trim();
    }
    if (r.status === STATUS.NOT_RUN) {
      blockingGaps.push(`${id} ${CHECK_BY_ID[id].name}: ${r.detail ?? 'not run'}`);
    }
  }

  let verdict;
  if (reason !== null) verdict = VERDICT.FAILED;
  else if (blockingGaps.length > 0) verdict = VERDICT.INCOMPLETE;
  else verdict = VERDICT.READY;

  const pk = computePkReviewFlag(a, checks);
  const advisory = Object.entries(checks)
    .filter(([id, r]) => !CHECK_BY_ID[id].blocking && r.status === STATUS.FAIL)
    .map(([id, r]) => ({ check: id, reason_code: r.reason_code, detail: r.detail }));

  return {
    asset_id: isStr(a.asset_id) ? a.asset_id : null,
    asset_key: isStr(a.asset_key) ? a.asset_key : null,
    client_id: isStr(a.client_id) ? a.client_id : null,
    source_table: isStr(a.source_table) ? a.source_table : null,
    ownership_model: ownership,
    verdict,
    reason_code: reason,
    reason_origin: reason ? REASONS[reason] ?? ORIGIN.GRADUATION : null,
    reason_detail: detail,
    remediation_route: reason ? (REMEDIATION[reason] ?? null) : null,
    retained_area_pct: checks.C4.data?.geometry?.retained_area_pct ?? null,
    upscale_factor: checks.C4.data?.geometry?.upscale_factor ?? null,
    requires_pk_visual_review: pk.required,
    pk_review_triggers: pk.triggers,
    blocking_gaps: blockingGaps,
    advisory_flags: advisory,
    checks,
  };
}

// ---------------------------------------------------------------------------
// Batch evaluation + the decision sheet.
// ---------------------------------------------------------------------------
export function validatePayload(p) {
  if (!p || typeof p !== 'object') return { ok: false, error: 'payload is not an object' };
  if (!isArr(p.assets)) return { ok: false, error: 'payload.assets is missing or not an array' };
  if (!isStr(p.batch_id)) return { ok: false, error: 'payload.batch_id is missing' };
  return { ok: true };
}

export function evaluateBatch(payload, ctx = {}) {
  const v = validatePayload(payload);
  if (!v.ok) {
    return {
      evaluator_version: EVALUATOR_VERSION,
      batch_id: null,
      input_digest: inputDigest(payload ?? null),
      batch_verdict: VERDICT.INCOMPLETE,
      normalized: NORMALIZED.BLOCK,
      error: v.error,
      not_evaluated_in_slice1: NOT_EVALUATED_IN_SLICE1,
      posture: POSTURE,
      assets: [],
      sheet: { ready_for_pk_review: [], failed: [], incomplete: [] },
    };
  }

  const assets = payload.assets
    .map((a) => evaluateAsset(a, ctx))
    // Deterministic ordering independent of input order.
    .sort((x, y) => String(x.asset_key ?? x.asset_id ?? '').localeCompare(String(y.asset_key ?? y.asset_id ?? '')));

  const any = (vv) => assets.some((a) => a.verdict === vv);
  const batchVerdict = assets.length === 0
    ? VERDICT.INCOMPLETE
    : any(VERDICT.FAILED) ? VERDICT.FAILED
      : any(VERDICT.INCOMPLETE) ? VERDICT.INCOMPLETE
        : VERDICT.READY;

  return {
    evaluator_version: EVALUATOR_VERSION,
    batch_id: payload.batch_id,
    input_digest: inputDigest(payload),
    batch_verdict: batchVerdict,
    normalized: normalizedVerdict(batchVerdict),
    not_evaluated_in_slice1: NOT_EVALUATED_IN_SLICE1,
    posture: POSTURE,
    ownership_summary: {
      client_owned: assets.filter((a) => a.ownership_model === OWNERSHIP.CLIENT_OWNED).length,
      shared_pooled: assets.filter((a) => a.ownership_model === OWNERSHIP.SHARED_POOLED).length,
      shared_unreachable: assets.filter((a) => a.ownership_model === OWNERSHIP.SHARED_UNREACHABLE).length,
      indeterminate: assets.filter((a) => a.ownership_model === OWNERSHIP.INDETERMINATE).length,
    },
    assets,
    sheet: {
      ready_for_pk_review: assets.filter((a) => a.verdict === VERDICT.READY).map(sheetRow),
      failed: assets.filter((a) => a.verdict === VERDICT.FAILED).map(sheetRow),
      incomplete: assets.filter((a) => a.verdict === VERDICT.INCOMPLETE).map(sheetRow),
    },
  };
}

const sheetRow = (a) => ({
  asset_key: a.asset_key,
  asset_id: a.asset_id,
  ownership_model: a.ownership_model,
  reason_code: a.reason_code,
  reason_origin: a.reason_origin,
  retained_area_pct: a.retained_area_pct,
  requires_pk_visual_review: a.requires_pk_visual_review,
  remediation_route: a.remediation_route,
  gaps: a.blocking_gaps.length,
});

export const EVALUATOR_VERSION = 'asset-graduation-check/1.0.0-slice1';

export const POSTURE = [
  'SHADOW / ADVISORY — zero authority.',
  'READY_FOR_PK_REVIEW means the MECHANICAL questions are answered. It is NOT an approval.',
  'PK\'s visual verdict remains the only deciding act. This tool clears NO gate.',
  'It writes nothing: no DB, no storage, no fence, no asset state.',
  'C12 declared==resolver-reachable and C13 pool neutrality are NOT evaluated here.',
  'SHARED_POOLED means policy + governance_scope permit consultation — NOT a complete ' +
  'reachability proof. The live resolver ALSO checks a per-row purpose_bound boolean, ' +
  'vertical_key match, and allowed_clients/excluded_clients membership; none of those ' +
  'are modeled in Slice 1 (named gap, not silently assumed clear).',
];

// ===========================================================================
// RENDERERS
// ===========================================================================

export function renderJson(result) {
  return stableStringify(result);
}

export function renderReport(result) {
  const L = [];
  const rule = '='.repeat(75);
  L.push(rule);
  L.push('=== ASSET GRADUATION CHECK (Slice 1 · static background images) ===');
  L.push(`=== ${EVALUATOR_VERSION} · SHADOW/ADVISORY · READ-ONLY · DECIDES NOTHING ===`);
  L.push(rule);
  L.push('');
  L.push(`batch_id     : ${result.batch_id ?? '(none)'}`);
  L.push(`input_digest : ${result.input_digest}`);
  L.push(`VERDICT      : ${result.batch_verdict}  (normalized: ${result.normalized})`);
  if (result.error) L.push(`ERROR        : ${result.error}  → fail-closed to INCOMPLETE`);
  L.push('');

  if (result.ownership_summary) {
    const o = result.ownership_summary;
    L.push('--- OWNERSHIP MODEL (PK ruling 5 — shared pool in scope from day one) ---');
    L.push(`  client_owned ${o.client_owned} · shared_pooled ${o.shared_pooled} · shared_unreachable ${o.shared_unreachable} · indeterminate ${o.indeterminate}`);
    L.push('');
  }

  const group = (title, rows) => {
    L.push(`--- ${title} (${rows.length}) ---`);
    if (!rows.length) { L.push('  (none)'); L.push(''); return; }
    for (const r of rows) {
      const pct = r.retained_area_pct === null ? '—' : `${r.retained_area_pct}%`;
      L.push(`  ${r.asset_key ?? r.asset_id ?? '(unidentified)'}  [${r.ownership_model}]  retained ${pct}`);
      if (r.reason_code) L.push(`      reason  : ${r.reason_code}  (${r.reason_origin})`);
      if (r.remediation_route) L.push(`      route   : ${r.remediation_route}`);
      if (r.gaps) L.push(`      gaps    : ${r.gaps} blocking check(s) not run`);
      L.push(`      PK visual review required: ${r.requires_pk_visual_review ? 'YES' : 'no'}`);
    }
    L.push('');
  };

  group('READY FOR PK VISUAL REVIEW — mechanical questions answered', result.sheet.ready_for_pk_review);
  group('FAILED — reason and remediation route named', result.sheet.failed);
  group('INCOMPLETE — a blocking check could not be run', result.sheet.incomplete);

  L.push('--- NOT EVALUATED IN SLICE 1 (never imply these were checked) ---');
  for (const [k, why] of Object.entries(result.not_evaluated_in_slice1)) L.push(`  ${k}: ${why}`);
  L.push('');
  L.push('--- POSTURE ---');
  for (const p of result.posture) L.push(`  ${p}`);
  L.push(rule);
  return L.join('\n');
}

// ===========================================================================
// THIN I/O SHELL — the only part that touches the filesystem, and only to READ.
// ===========================================================================

export function readArgs(argv) {
  const args = { input: null, format: 'report', evaluated_at: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--input' || t === '-i') args.input = argv[++i] ?? null;
    else if (t === '--format' || t === '-f') args.format = argv[++i] ?? 'report';
    else if (t === '--evaluated-at') args.evaluated_at = argv[++i] ?? null;
    else if (t === '--json') args.format = 'json';
    else if (!args.input && !t.startsWith('-')) args.input = t;
  }
  if (!args.input) throw new Error('no --input payload path supplied');
  if (!['report', 'json'].includes(args.format)) throw new Error(`unknown --format '${args.format}'`);
  return args;
}

const EXIT = { READY_FOR_PK_REVIEW: 0, INCOMPLETE: 2, FAILED: 3 };

export function main(argv = process.argv.slice(2)) {
  let result;
  try {
    const args = readArgs(argv);
    const raw = readFileSync(args.input, 'utf-8');
    const payload = JSON.parse(raw);
    result = evaluateBatch(payload, { evaluated_at: args.evaluated_at });
    process.stdout.write((args.format === 'json' ? renderJson(result) : renderReport(result)) + '\n');
  } catch (e) {
    // Final fail-closed net: any error → INCOMPLETE, never a clean-sounding sheet.
    const fallback = evaluateBatch(null);
    fallback.error = e.message;
    process.stdout.write(renderReport(fallback) + '\n');
    process.stdout.write(`(fail-closed: ${e.message})\n`);
    process.exitCode = EXIT.INCOMPLETE;
    return;
  }
  process.exitCode = EXIT[result.batch_verdict] ?? EXIT.INCOMPLETE;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
