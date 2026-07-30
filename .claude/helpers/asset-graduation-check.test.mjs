// Hermetic tests for asset-graduation-check.mjs (Asset Graduation Slice 1).
// Node built-in test runner. NO network, NO DB, NO fs writes. Fixtures are
// inline objects so the build stays at exactly three files (PK Gate-1 limit).
//   Run: node --test .claude/helpers/asset-graduation-check.test.mjs
//
// The four REQUIRED SLICE-1 PROOFS (PK, 2026-07-30) are the four §"HISTORICAL
// DEFECT CLASS" blocks below. Each fixture is built from a real recorded case,
// not an invented one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  VERDICT, NORMALIZED, STATUS, OWNERSHIP, ORIGIN, REASONS, REMEDIATION,
  SFTO_ACCEPTED, RETAINED_AREA_FLOOR, CHECKS, NOT_EVALUATED_IN_SLICE1,
  EVALUATOR_VERSION, POSTURE, USAGE_LITERALS,
  normalizedVerdict, stableStringify, inputDigest, cropGeometry,
  classifyOwnership, checkFenceIntegrity, checkSlotCompatibility,
  checkTextSafetyVocabulary, checkDimensions, checkRights, checkByteIdentity,
  checkObjectReachability, checkGeography, checkTheme, checkExactDuplicate,
  checkPreviouslyRejected, rejectedFingerprint, computePkReviewFlag,
  evaluateAsset, evaluateBatch, validatePayload, readArgs,
  renderJson, renderReport,
} from './asset-graduation-check.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULE = join(HERE, 'asset-graduation-check.mjs');
const SRC = readFileSync(MODULE, 'utf-8');

const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f900112233445566778899aabbccddeeff0';

// A candidate that passes every Slice-1 check. Every other fixture is this
// with one field changed, so a test failure localises to that field.
const clean = (over = {}) => ({
  asset_id: '00000000-0000-4000-8000-000000000001',
  asset_key: 'bg_clean_baseline',
  client_id: 'client-1',
  source_table: 'c.client_brand_asset',
  is_active: false,
  asset_meta_approved: false,
  asset_meta_sha256: SHA,
  asset_meta_bucket: 'brand-assets',
  hash_observations: { sha256_local: SHA, sha256_public_url: SHA },
  url_observations: { http_status: 200, content_type: 'image/jpeg' },
  provenance: {
    source_url: 'https://www.pexels.com/photo/example-12345/',
    provider: 'pexels',
    provider_asset_id: '12345',
    author: 'A Photographer',
    licence_name: 'Pexels License',
    licence_url: 'https://www.pexels.com/license/',
    commercial_use_permitted: true,
  },
  source_width: 2000,
  source_height: 2000,
  target_width: 1080,
  target_height: 1080,
  crop_geometry_key: '1080x1080-cover',
  geo_scope: 'generic',
  geo_basis: 'source_title',
  known_geo_classes: ['generic', 'au', 'au_nsw', 'au_nsw_sydney_metro', 'au_wa_perth'],
  subject_tags: ['abstract'],
  family_tag_vocabulary: ['abstract', 'skyline', 'coastal'],
  target_slot: 'background',
  asset_meta_usage: 'background',
  asset_kind: 'image',
  target_platforms: ['facebook'],
  platform_scope: ['facebook', 'instagram'],
  safe_for_text_overlay: 'true',
  existing_pool_sha256: [],
  rejected_fingerprints: [],
  reviewer_verdict: 'PASS',
  prior_pk_approval: {
    client_id: 'client-1',
    crop_geometry_key: '1080x1080-cover',
    evidence_reference: 'contact-sheet-2026-07-30#3',
  },
  ...over,
});

// A shared-pool candidate that is correctly pooled and passes everything.
// Shapes confirmed live 2026-07-30 (db-rls-auditor against pg_catalog on
// mbkmaxqhsohbtwsqolns): governance_scope CHECK IN ('global_generic',
// 'vertical_shared','purpose_bound'); sensitivity_class CHECK IN ('person_free',
// 'contains_people','unknown'); c.client_asset_pool_policy has NO
// permitted_scopes — reachability is the two booleans allow_vertical_shared /
// allow_global_shared; c.shared_creative_asset.asset_kind CHECK IN
// ('static_background','logo','image','video_broll').
const cleanShared = (over = {}) => clean({
  asset_key: 'bg_shared_baseline',
  source_table: 'c.shared_creative_asset',
  asset_kind: 'static_background',
  approval_status: 'intake_candidate',
  production_use_allowed: false,
  sensitivity_class: 'person_free',
  licence_allows_multi_entity_use: true,
  governance_scope: 'global_generic',
  client_asset_pool_policy: { pool_policy: 'best_fit', allow_global_shared: true, allow_vertical_shared: false },
  ...over,
});

const batch = (assets) => ({ batch_id: 'test-batch-1', assets });
const one = (a) => evaluateAsset(a, { evaluated_at: '2026-07-30T00:00:00Z' });

// ===========================================================================
// SANITY — the baselines must be clean, or every negative test is meaningless.
// ===========================================================================

test('baseline client-owned candidate is READY with no reason code', () => {
  const r = one(clean());
  assert.equal(r.verdict, VERDICT.READY, `unexpected gaps: ${JSON.stringify(r.blocking_gaps)} / reason ${r.reason_code}`);
  assert.equal(r.reason_code, null);
  assert.equal(r.ownership_model, OWNERSHIP.CLIENT_OWNED);
  assert.deepEqual(r.blocking_gaps, []);
});

test('baseline shared candidate is READY and classified shared_pooled', () => {
  const r = one(cleanShared());
  assert.equal(r.verdict, VERDICT.READY, `unexpected: ${r.reason_code} ${JSON.stringify(r.blocking_gaps)}`);
  assert.equal(r.ownership_model, OWNERSHIP.SHARED_POOLED);
});

// ===========================================================================
// HISTORICAL DEFECT CLASS 1 — the FALSE DECLARED POOL.
// Real case: broll_pp_perth_skyline carried safe_for_text_overlay=
// 'needs_gradient_scrim', outside the resolver's accepted set. The flag-based
// pool reported 6; the resolver could only ever reach 5.
// ===========================================================================

test('DEFECT 1 · needs_gradient_scrim FAILS with the resolver literal text_safety_unknown', () => {
  const r = one(clean({ safe_for_text_overlay: 'needs_gradient_scrim' }));
  assert.equal(r.verdict, VERDICT.FAILED);
  assert.equal(r.reason_code, 'text_safety_unknown');
  assert.equal(r.reason_origin, ORIGIN.RESOLVER, 'must reuse the resolver vocabulary, not mint a parallel code');
  assert.match(r.reason_detail, /outside the resolver's accepted vocabulary/i);
});

test('DEFECT 1 · the false-pool consequence is stated, not merely the mismatch', () => {
  const r = one(clean({ safe_for_text_overlay: 'needs_gradient_scrim' }));
  assert.match(r.checks.C8.detail, /FALSE-POOL/i);
});

test('DEFECT 1 · remediation forbids editing the value in place', () => {
  assert.match(REMEDIATION.text_safety_unknown, /do NOT edit the value in place/i);
});

test('DEFECT 1 · absent safe_for_text_overlay also fails closed', () => {
  const r = one(clean({ safe_for_text_overlay: undefined }));
  assert.equal(r.reason_code, 'text_safety_unknown');
});

test("DEFECT 1 · only 'true' and 'needs_scrim' are accepted; needs_scrim carries the rank note", () => {
  assert.deepEqual(SFTO_ACCEPTED, ['true', 'needs_scrim']);
  assert.equal(one(clean({ safe_for_text_overlay: 'needs_scrim' })).verdict, VERDICT.READY);
  assert.match(checkTextSafetyVocabulary(clean({ safe_for_text_overlay: 'needs_scrim' })).data.rank_note, /second-class/);
  assert.equal(checkTextSafetyVocabulary(clean({ safe_for_text_overlay: 'false' })).reason_code, 'not_text_safe');
});

// ===========================================================================
// USAGE/KIND CROSS-CHECK — corrected 2026-07-30 against the LIVE deployed
// public.resolve_slot_assets (pg_get_functiondef), not the base migration
// file. Admission is CONDITIONAL on the target template's Background field
// type: usage='broll_background' IS live-admitted (for a video-typed
// Background), it is simply outside SLICE 1's OWN static-image scope. That
// must never be mislabelled as usage_not_resolver_eligible, which claims the
// resolver universally excludes the row — false for this literal.
// ===========================================================================

test("a truly non-existent usage value FAILS as usage_not_resolver_eligible — invisible under EVERY target", () => {
  const r = one(clean({ asset_meta_usage: 'promo_bg' }));
  assert.equal(r.verdict, VERDICT.FAILED);
  assert.equal(r.reason_code, 'usage_not_resolver_eligible');
  assert.equal(r.reason_origin, ORIGIN.GRADUATION);
  assert.match(r.reason_detail, /under ANY target template/);
});

test("usage='broll_background' is a REAL resolver literal — it FAILS as slot_contract_mismatch, NOT usage_not_resolver_eligible", () => {
  const r = one(clean({ asset_meta_usage: 'broll_background', asset_kind: 'video' }));
  assert.equal(r.verdict, VERDICT.FAILED);
  assert.equal(r.reason_code, 'slot_contract_mismatch');
  assert.notEqual(r.reason_code, 'usage_not_resolver_eligible');
  assert.match(r.reason_detail, /IS a real, live-admitted resolver literal/);
  assert.match(r.reason_detail, /SCOPE decision, not a resolver-eligibility defect/);
});

test("usage='logo' is a real resolver literal too — wrong slot, not a resolver-eligibility defect", () => {
  const r = one(clean({ asset_meta_usage: 'logo' }));
  assert.equal(r.reason_code, 'slot_contract_mismatch');
  assert.notEqual(r.reason_code, 'usage_not_resolver_eligible');
});

test('an absent usage still fails closed, now via usage_not_resolver_eligible (the only genuinely-nonexistent case)', () => {
  const r = one(clean({ asset_meta_usage: undefined }));
  assert.equal(r.verdict, VERDICT.FAILED);
  assert.equal(r.reason_code, 'usage_not_resolver_eligible');
});

test('USAGE_LITERALS is exactly the three live-confirmed values', () => {
  assert.deepEqual([...USAGE_LITERALS].sort(), ['background', 'broll_background', 'logo']);
});

test('a real B-roll asset_kind (video_broll, the shared-table native value) is caught as a VIDEO background', () => {
  const r = one(clean({ asset_kind: 'video_broll' }));
  assert.equal(r.reason_code, 'slot_contract_mismatch');
  assert.match(r.reason_detail, /VIDEO background/);
});

test('kind normalization accepts BOTH tables\' native static-image vocabulary (image, static_background)', () => {
  assert.equal(one(clean({ asset_kind: 'image' })).verdict, VERDICT.READY);
  assert.equal(one(cleanShared({ asset_kind: 'static_background' })).verdict, VERDICT.READY);
});

test('an unrecognised asset_kind (neither image family nor video family) fails closed, not silently passes', () => {
  const r = one(clean({ asset_kind: 'gif_animation' }));
  assert.equal(r.reason_code, 'slot_contract_mismatch');
  assert.match(r.reason_detail, /unrecognised asset class/);
});

test('absent asset_kind is INCOMPLETE, never an assumed image pass', () => {
  const r = one(clean({ asset_kind: undefined }));
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
});

// ===========================================================================
// HISTORICAL DEFECT CLASS 2 — the ~32% RETAINED CROP / UPSCALE defect.
// Real case: 42211c0f, 1920×1080 landscape offered for a 1080×1920 target.
// Recorded: ~32% of frame retained, ≈1.78× upscale.
// ===========================================================================

test('DEFECT 2 · 1920×1080 → 1080×1920 FAILS as upscale_required', () => {
  const r = one(clean({ source_width: 1920, source_height: 1080, target_width: 1080, target_height: 1920 }));
  assert.equal(r.verdict, VERDICT.FAILED);
  assert.equal(r.reason_code, 'upscale_required');
  assert.equal(r.reason_origin, ORIGIN.GRADUATION, 'graduation-only mechanical reason, clearly labelled');
});

test('DEFECT 2 · the recorded ~32% retained area and ≈1.78× upscale are reproduced', () => {
  const g = cropGeometry(1920, 1080, 1080, 1920);
  assert.ok(Math.abs(g.retained_area_pct - 31.64) < 0.1, `retained was ${g.retained_area_pct}, expected ≈31.6`);
  assert.ok(Math.abs(g.upscale_factor - 1.7778) < 0.001, `upscale was ${g.upscale_factor}, expected ≈1.78`);
  assert.equal(g.crop_w, 607.5, 'the retained source region is 607.5px wide — the recorded figure');
});

test('DEFECT 2 · PK ruling 2 — the ACTUAL percentage is always reported, not just pass/fail', () => {
  const fail = one(clean({ source_width: 1920, source_height: 1080, target_width: 1080, target_height: 1920 }));
  assert.ok(Math.abs(fail.retained_area_pct - 31.64) < 0.1);
  assert.equal(fail.upscale_factor, 1.7778);
  // Reported on a PASS too, so the 60% floor can be calibrated from evidence.
  const pass = one(clean());
  assert.equal(pass.retained_area_pct, 100);
  assert.ok(pass.upscale_factor !== null);
});

test('DEFECT 2 · the 60% floor is the ratified provisional value and is enforced', () => {
  assert.equal(RETAINED_AREA_FLOOR, 0.60);
  // 3000×1000 → 1000×1000: retained = 1/3 = 33.3%, but no upscale is needed,
  // so this isolates the floor from the upscale rule.
  const r = one(clean({ source_width: 3000, source_height: 1000, target_width: 1000, target_height: 1000 }));
  assert.equal(r.reason_code, 'aspect_mismatch');
  assert.ok(r.retained_area_pct < 60);
});

test('DEFECT 2 · a genuinely too-small source is dimension_short, not upscale_required', () => {
  const r = one(clean({ source_width: 640, source_height: 360, target_width: 1080, target_height: 1920 }));
  assert.equal(r.reason_code, 'dimension_short');
});

test('DEFECT 2 · a native-only class rejects a non-native source even when the aspect matches', () => {
  const r = one(clean({
    source_width: 2160, source_height: 3840, target_width: 1080, target_height: 1920, native_only_class: true,
  }));
  assert.equal(r.reason_code, 'aspect_mismatch');
  assert.match(r.reason_detail, /NATIVE 1080×1920 only/);
});

test('DEFECT 2 · mechanical crop PASS explicitly does not claim visual approval (PK ruling 2)', () => {
  const c = checkDimensions(clean());
  assert.equal(c.status, STATUS.PASS);
  assert.match(c.detail, /composition, subject loss and signage truncation remain PK/i);
});

// ===========================================================================
// HISTORICAL DEFECT CLASS 3 — the PHANTOM SHARED ASSET.
// A shared asset for a client with no c.client_asset_pool_policy row: absent
// row ⇒ client_only ⇒ the shared pool is structurally unreachable. It would
// count toward the pool and never be selectable.
// ===========================================================================

test('DEFECT 3 · shared asset with NO pool-policy row is shared_unreachable and FAILS', () => {
  const r = one(cleanShared({ client_asset_pool_policy: null }));
  assert.equal(r.ownership_model, OWNERSHIP.SHARED_UNREACHABLE);
  assert.equal(r.verdict, VERDICT.FAILED);
  assert.equal(r.reason_code, 'shared_pool_unreachable');
  assert.match(r.reason_detail, /PHANTOM/i);
});

test("DEFECT 3 · pool_policy='client_only' is equally unreachable", () => {
  const r = one(cleanShared({ client_asset_pool_policy: { pool_policy: 'client_only' } }));
  assert.equal(r.ownership_model, OWNERSHIP.SHARED_UNREACHABLE);
  assert.equal(r.reason_code, 'shared_pool_unreachable');
});

test('DEFECT 3 · a policy that permits vertical_shared but not global_generic leaves a global_generic asset unreachable', () => {
  const r = one(cleanShared({
    governance_scope: 'global_generic',
    client_asset_pool_policy: { pool_policy: 'best_fit', allow_global_shared: false, allow_vertical_shared: true },
  }));
  assert.equal(r.ownership_model, OWNERSHIP.SHARED_UNREACHABLE);
  assert.equal(r.reason_code, 'shared_pool_unreachable');
});

test('DEFECT 3 · the SYMMETRIC case — vertical_shared asset is reachable only when allow_vertical_shared is true', () => {
  assert.equal(classifyOwnership(cleanShared({
    governance_scope: 'vertical_shared',
    client_asset_pool_policy: { pool_policy: 'best_fit', allow_vertical_shared: true, allow_global_shared: false },
  })), OWNERSHIP.SHARED_POOLED);
  assert.equal(classifyOwnership(cleanShared({
    governance_scope: 'vertical_shared',
    client_asset_pool_policy: { pool_policy: 'best_fit', allow_vertical_shared: false, allow_global_shared: true },
  })), OWNERSHIP.SHARED_UNREACHABLE);
});

test("DEFECT 3 · governance_scope='purpose_bound' is NEVER shared-pool-eligible under ANY policy (structural, confirmed live)", () => {
  const anyPolicy = { pool_policy: 'best_fit', allow_vertical_shared: true, allow_global_shared: true };
  const r = one(cleanShared({ governance_scope: 'purpose_bound', client_asset_pool_policy: anyPolicy }));
  assert.equal(r.ownership_model, OWNERSHIP.SHARED_UNREACHABLE);
  assert.equal(r.reason_code, 'shared_pool_unreachable');
});

test('DEFECT 3 · an unrecognised governance_scope value is indeterminate, not assumed reachable', () => {
  assert.equal(classifyOwnership(cleanShared({ governance_scope: 'made_up_scope' })), OWNERSHIP.INDETERMINATE);
});

test('DEFECT 3 · PK ruling 5 — all four ownership models are distinguishable', () => {
  assert.equal(classifyOwnership(clean()), OWNERSHIP.CLIENT_OWNED);
  assert.equal(classifyOwnership(cleanShared()), OWNERSHIP.SHARED_POOLED);
  assert.equal(classifyOwnership(cleanShared({ client_asset_pool_policy: null })), OWNERSHIP.SHARED_UNREACHABLE);
  // Never looked at the policy at all ⇒ indeterminate, never assumed reachable.
  assert.equal(classifyOwnership(cleanShared({ client_asset_pool_policy: undefined })), OWNERSHIP.INDETERMINATE);
  assert.equal(classifyOwnership(clean({ source_table: undefined })), OWNERSHIP.INDETERMINATE);
});

test('DEFECT 3 · indeterminate ownership fails closed rather than guessing a reachability rule', () => {
  const r = one(cleanShared({ client_asset_pool_policy: undefined }));
  assert.equal(r.verdict, VERDICT.FAILED);
  assert.equal(r.reason_code, 'ownership_indeterminate');
});

test('DEFECT 3 · the batch sheet counts every ownership model', () => {
  const b = evaluateBatch(batch([
    clean({ asset_key: 'a1' }),
    cleanShared({ asset_key: 'a2' }),
    cleanShared({ asset_key: 'a3', client_asset_pool_policy: null }),
    cleanShared({ asset_key: 'a4', client_asset_pool_policy: undefined }),
  ]));
  assert.deepEqual(b.ownership_summary, {
    client_owned: 1, shared_pooled: 1, shared_unreachable: 1, indeterminate: 1,
  });
});

// ===========================================================================
// HISTORICAL DEFECT CLASS 4 — client_brand_asset.is_active DEFAULT-OPEN.
// The column defaults OPEN, so an unset fence is an OPEN fence. An absent
// value must never be read as "probably false".
// ===========================================================================

test('DEFECT 4 · absent is_active on c.client_brand_asset is fence_open_on_intake', () => {
  const a = clean();
  delete a.is_active;
  const r = one(a);
  assert.equal(r.verdict, VERDICT.FAILED);
  assert.equal(r.reason_code, 'fence_open_on_intake');
  assert.match(r.reason_detail, /DEFAULTS OPEN/);
});

test('DEFECT 4 · is_active=true is fence_open_on_intake', () => {
  assert.equal(one(clean({ is_active: true })).reason_code, 'fence_open_on_intake');
});

test('DEFECT 4 · asset_meta.approved=true on a candidate row is also an open fence', () => {
  assert.equal(one(clean({ asset_meta_approved: true })).reason_code, 'fence_open_on_intake');
});

test('DEFECT 4 · the fence check is HOISTED — an unfenced row reports the exposure, not a later defect', () => {
  // This row is BOTH unfenced and has a bad sfto. The exposure must win.
  const a = clean({ is_active: true, safe_for_text_overlay: 'needs_gradient_scrim' });
  assert.equal(one(a).reason_code, 'fence_open_on_intake');
});

test('DEFECT 4 · the shared fence model is checked separately and completely', () => {
  assert.equal(checkFenceIntegrity(cleanShared()).status, STATUS.PASS);
  for (const over of [
    { approval_status: 'governed' },
    { production_use_allowed: true },
    { is_active: true },
    { sensitivity_class: 'unknown' },
    { sensitivity_class: undefined },
  ]) {
    const c = checkFenceIntegrity(cleanShared(over));
    assert.equal(c.status, STATUS.FAIL, `expected FAIL for ${JSON.stringify(over)}`);
    assert.equal(c.reason_code, 'fence_open_on_intake');
  }
});

// ===========================================================================
// REQUIRED PROOF — determinism.
// ===========================================================================

test('same input produces byte-identical output', () => {
  const p = batch([clean({ asset_key: 'z' }), cleanShared({ asset_key: 'a' }), clean({ asset_key: 'm', is_active: true })]);
  const a = renderJson(evaluateBatch(p, { evaluated_at: '2026-07-30T00:00:00Z' }));
  const b = renderJson(evaluateBatch(p, { evaluated_at: '2026-07-30T00:00:00Z' }));
  assert.equal(a, b);
  assert.equal(renderReport(evaluateBatch(p)), renderReport(evaluateBatch(p)));
});

test('output is independent of input ORDER — assets are sorted deterministically', () => {
  const x = clean({ asset_key: 'aaa' });
  const y = clean({ asset_key: 'bbb', is_active: true });
  const f = (p) => evaluateBatch(p).assets.map((a) => a.asset_key);
  assert.deepEqual(f(batch([x, y])), ['aaa', 'bbb']);
  assert.deepEqual(f(batch([y, x])), ['aaa', 'bbb']);
});

test('stableStringify sorts keys at every depth, and inputDigest follows it', () => {
  const p = { b: 1, a: { d: 2, c: [{ f: 3, e: 4 }] } };
  const q = { a: { c: [{ e: 4, f: 3 }], d: 2 }, b: 1 };
  assert.equal(stableStringify(p), stableStringify(q));
  assert.equal(inputDigest(p), inputDigest(q));
  assert.notEqual(inputDigest(p), inputDigest({ ...p, b: 2 }));
});

test('no clock or randomness leaks into the result', () => {
  assert.doesNotMatch(SRC, /Math\.random|Date\.now|new Date\(\)/, 'evaluator must not read the clock or randomness');
});

// ===========================================================================
// REQUIRED PROOF — every failure maps to a labelled vocabulary.
// ===========================================================================

test('every reason code in REASONS carries an origin of resolver or graduation', () => {
  for (const [code, origin] of Object.entries(REASONS)) {
    assert.ok([ORIGIN.RESOLVER, ORIGIN.GRADUATION].includes(origin), `${code} has origin '${origin}'`);
  }
});

test('the resolver-origin codes are the literals the live resolver actually emits', () => {
  const live = ['inactive', 'not_approved', 'license_missing', 'license_expired',
    'output_as_input_risk', 'platform_excluded', 'not_text_safe', 'text_safety_unknown'];
  for (const c of live) assert.equal(REASONS[c], ORIGIN.RESOLVER, `${c} must be labelled as resolver vocabulary`);
});

test('every emitted reason code is a known, labelled code with a remediation entry', () => {
  const mutations = [
    { is_active: true }, { safe_for_text_overlay: 'needs_gradient_scrim' }, { safe_for_text_overlay: 'false' },
    { source_width: 1920, source_height: 1080, target_width: 1080, target_height: 1920 },
    { source_width: 640, source_height: 360, target_width: 1080, target_height: 1920 },
    { source_width: 3000, source_height: 1000, target_width: 1000, target_height: 1000 },
    { geo_scope: 'atlantis' }, { geo_basis: 'provider_tag' }, { geo_scope: undefined },
    { asset_meta_bucket: 'public' }, { url_observations: { http_status: 404 } },
    { asset_meta_usage: 'logo' },
    { hash_observations: { sha256_local: 'deadbeef', sha256_public_url: SHA } },
    { provenance: { ...clean().provenance, provider: 'shutterstock' } },
    { provenance: { ...clean().provenance, licence_name: 'CC BY 4.0' } },
    { provenance: { ...clean().provenance, commercial_use_permitted: undefined } },
    { provenance: { ...clean().provenance, author: undefined } },
    { provenance: { ...clean().provenance, licence_name: undefined, licence_url: undefined } },
    { provenance: { ...clean().provenance, licence_expires_at: '2020-01-01T00:00:00Z' } },
    { identifiable_person: true }, { cultural_element: true }, { legible_signage: true }, { ndis_phase: 2 },
    { existing_pool_sha256: [SHA] }, { rejected_fingerprints: ['pexels|12345|' + SHA] },
    { target_slot: 'logo' }, { asset_kind: 'video' }, { platform_scope: ['linkedin'] },
    { subject_tags: ['unicorns'] },
  ];
  const seen = new Set();
  for (const m of mutations) {
    const r = one(clean(m));
    const codes = [r.reason_code, ...r.advisory_flags.map((f) => f.reason_code)].filter(Boolean);
    assert.ok(codes.length, `mutation produced no reason code: ${JSON.stringify(m)}`);
    for (const c of codes) {
      assert.ok(c in REASONS, `unknown reason code '${c}'`);
      assert.ok(c in REMEDIATION, `reason '${c}' has no remediation entry`);
      seen.add(c);
    }
  }
  // Confirm the mutation sweep actually exercised a broad slice of the vocabulary.
  assert.ok(seen.size >= 18, `only ${seen.size} distinct codes exercised: ${[...seen].sort().join(', ')}`);
});

test('the sensitive-content fences are absolute and precede any licence reasoning', () => {
  assert.equal(one(clean({ identifiable_person: true })).reason_code, 'identifiable_person');
  assert.equal(one(clean({ cultural_element: true })).reason_code, 'cultural_flag');
  assert.equal(one(clean({ ndis_phase: 3 })).reason_code, 'sensitivity_escalate');
  assert.equal(one(clean({ legible_signage: true })).reason_code, 'legible_signage');
  // Even with immaculate licence evidence, the fence still wins.
  const r = one(clean({ cultural_element: true, provenance: { ...clean().provenance, pk_exception: true } }));
  assert.equal(r.reason_code, 'cultural_flag');
});

test('a hold-list licence needs a recorded per-asset PK exception', () => {
  const held = { ...clean().provenance, licence_name: 'CC BY-SA 4.0' };
  assert.equal(one(clean({ provenance: held })).reason_code, 'licence_unsafe');
  assert.equal(one(clean({ provenance: { ...held, pk_exception: true } })).verdict, VERDICT.READY);
});

// Provider-derivation fix, 2026-07-30, from the live shadow batch:
// c.shared_creative_asset genuinely has NO dedicated `provider` field on any
// of the 9 real fenced rows read this session — only `licence_name` ('pexels',
// 'wikimedia_cc0') identifies the source. Requiring a separate field the table
// structurally never populates was a real bug, not an honest corpus finding —
// fixed by deriving provider from licence_name as a fallback.
test("REAL DATA FIX · absent provider field, but licence_name identifies the source ('pexels') — PASSES the provider check", () => {
  const noProviderField = { ...clean().provenance, provider: undefined, licence_name: 'pexels' };
  const r = one(clean({ provenance: noProviderField }));
  assert.notEqual(r.reason_code, 'provenance_incomplete');
  assert.notEqual(r.reason_code, 'licence_unsafe');
});

test('provider derivation recognises unsplash and wikimedia licence_name patterns too', () => {
  assert.notEqual(one(clean({ provenance: { ...clean().provenance, provider: undefined, licence_name: 'unsplash_license' } })).reason_code, 'provenance_incomplete');
  assert.notEqual(one(clean({ provenance: { ...clean().provenance, provider: undefined, licence_name: 'wikimedia_cc0' } })).reason_code, 'provenance_incomplete');
});

test('absent provider field AND an unrecognised licence_name genuinely fails closed — no source identity at all', () => {
  const r = one(clean({ provenance: { ...clean().provenance, provider: undefined, licence_name: 'some_random_stock_site' } }));
  assert.equal(r.reason_code, 'provenance_incomplete');
  assert.match(r.reason_detail, /no dedicated field, and licence_name does not identify/);
});

test('a DEDICATED provider field always wins over licence_name derivation, including a wrong one', () => {
  // Real regression guard: the derivation is a FALLBACK only, never a silent override.
  const r = one(clean({ provenance: { ...clean().provenance, provider: 'shutterstock', licence_name: 'pexels' } }));
  assert.equal(r.reason_code, 'licence_unsafe');
  assert.match(r.reason_detail, /'shutterstock'/);
});

test('provider_asset_id stays a HARD requirement, deliberately NOT relaxed — a genuine, disclosed corpus gap, not a bug', () => {
  const r = one(clean({ provenance: { ...clean().provenance, provider_asset_id: undefined } }));
  assert.equal(r.reason_code, 'provenance_incomplete');
  assert.match(r.reason_detail, /provider_asset_id/);
});

test('a shared asset without documented multi-entity rights is licence_ambiguous', () => {
  assert.equal(one(cleanShared({ licence_allows_multi_entity_use: undefined })).reason_code, 'licence_ambiguous');
  assert.equal(one(cleanShared({ licence_allows_multi_entity_use: false })).reason_code, 'licence_ambiguous');
});

// The resolver's candidate loop is entered by usage IN ('background',
// 'broll_background','logo') — CONFIRMED LIVE 2026-07-30, conditional on the
// target template's Background field type. A value OUTSIDE that set makes a
// row INVISIBLE under EVERY target — never even rejected with a reason.
test('a genuinely non-existent usage value FAILS as usage_not_resolver_eligible', () => {
  const r = one(clean({ asset_meta_usage: 'promo_bg' }));
  assert.equal(r.verdict, VERDICT.FAILED);
  assert.equal(r.reason_code, 'usage_not_resolver_eligible');
  assert.match(r.reason_detail, /SILENTLY EXCLUDED before any rejection reason/);
});

test('an ABSENT asset_meta.usage also FAILS CLOSED — not merely a gap (PK ruling)', () => {
  const r = one(clean({ asset_meta_usage: undefined }));
  assert.equal(r.verdict, VERDICT.FAILED, 'an unset usage key is exactly as invisible as a wrong one');
  assert.equal(r.reason_code, 'usage_not_resolver_eligible');
});

test('usage_not_resolver_eligible is labelled GRADUATION, never dressed as a resolver literal', () => {
  assert.equal(REASONS.usage_not_resolver_eligible, ORIGIN.GRADUATION);
  const r = one(clean({ asset_meta_usage: 'promo_bg' }));
  assert.equal(r.reason_origin, ORIGIN.GRADUATION);
  // The detail must say so in words, so no reader can mistake its provenance.
  assert.match(r.reason_detail, /GRADUATION-ONLY mechanical check: there is no resolver literal for this/);
  assert.match(one(clean({ asset_meta_usage: undefined })).reason_detail, /no resolver literal for this/);
});

test('usage remediation requires the GOVERNED INTAKE PATH, not an in-place metadata edit', () => {
  assert.match(REMEDIATION.usage_not_resolver_eligible, /GOVERNED INTAKE PATH/);
  assert.match(REMEDIATION.usage_not_resolver_eligible, /never by an ad-hoc in-place metadata edit/);
});

test('a wrong bucket uses the resolver literal output_as_input_risk, not a minted code', () => {
  const r = one(clean({ asset_meta_bucket: 'post-renders' }));
  assert.equal(r.reason_code, 'output_as_input_risk');
  assert.equal(r.reason_origin, ORIGIN.RESOLVER);
  // object_unreachable stays reserved for a genuine HTTP/content failure.
  assert.equal(one(clean({ url_observations: { http_status: 404 } })).reason_code, 'object_unreachable');
  assert.equal(REASONS.object_unreachable, ORIGIN.GRADUATION);
});

test('geography: a provider tag alone is not a basis', () => {
  const r = one(clean({ geo_basis: 'provider_tag' }));
  assert.equal(r.reason_code, 'geo_unclassified');
  assert.match(r.reason_detail, /wrong four separate times/);
});

test('the composite rejected-fingerprint key is provider + asset_id/url + sha256, not sha256 alone', () => {
  assert.equal(rejectedFingerprint({ provider: 'Pexels', provider_asset_id: '12345' }, SHA), `pexels|12345|${SHA}`);
  // Same sha, different provider ⇒ different key ⇒ not a match.
  assert.equal(one(clean({ rejected_fingerprints: [`unsplash|999|${SHA}`] })).verdict, VERDICT.READY);
  assert.equal(one(clean({ rejected_fingerprints: [`pexels|12345|${SHA}`] })).reason_code, 'previously_rejected');
});

// ===========================================================================
// REQUIRED PROOF — unknown or missing data fails closed.
// ===========================================================================

test('a blocking check that could not be run yields INCOMPLETE, never READY', () => {
  const cases = [
    ['C1 hashes', { hash_observations: undefined }],
    ['C2 url observation', { url_observations: undefined }],
    ['C5 known classes', { known_geo_classes: undefined }],
    ['C7 target platforms', { target_platforms: undefined }],
    ['C9 pool hashes', { existing_pool_sha256: undefined }],
    ['C10 rejected store', { rejected_fingerprints: undefined }],
    ['C4 dimensions', { source_width: undefined }],
  ];
  for (const [label, over] of cases) {
    const r = one(clean(over));
    assert.equal(r.verdict, VERDICT.INCOMPLETE, `${label} should force INCOMPLETE`);
    assert.notEqual(r.verdict, VERDICT.READY);
    assert.ok(r.blocking_gaps.length > 0, `${label} should name the gap`);
  }
});

test('not_run NEVER counts as pass on a blocking check', () => {
  const r = one(clean({ hash_observations: undefined }));
  assert.equal(r.checks.C1.status, STATUS.NOT_RUN);
  assert.notEqual(r.checks.C1.status, STATUS.PASS);
  assert.equal(r.verdict, VERDICT.INCOMPLETE);
});

test('partial hash agreement is not proof — two of three is still not_run', () => {
  const r = checkByteIdentity(clean({ hash_observations: { sha256_local: SHA }, asset_meta_sha256: SHA }));
  assert.equal(r.status, STATUS.NOT_RUN);
  assert.match(r.detail, /only 2 of 3/);
});

test('a hash DISAGREEMENT is a hard failure, not a gap', () => {
  const r = one(clean({ hash_observations: { sha256_local: 'deadbeef', sha256_public_url: SHA } }));
  assert.equal(r.reason_code, 'hash_mismatch');
  assert.match(REMEDIATION.hash_mismatch, /never patch the recorded hash/i);
});

test('C11 pHash is permanently not_run in Slice 1 and never reported as pass', () => {
  const r = one(clean());
  assert.equal(r.checks.C11.status, STATUS.NOT_RUN);
  assert.match(r.checks.C11.detail, /DEFERRED to v2/);
  // It is non-blocking, so it must not by itself prevent READY.
  assert.equal(r.verdict, VERDICT.READY);
});

test('a malformed or absent payload fails closed to INCOMPLETE', () => {
  for (const bad of [null, undefined, 42, 'nope', {}, { batch_id: 'x' }, { assets: [] }, { batch_id: 'x', assets: 'no' }]) {
    const r = evaluateBatch(bad);
    assert.equal(r.batch_verdict, VERDICT.INCOMPLETE, `payload ${JSON.stringify(bad)} should be INCOMPLETE`);
    assert.equal(r.normalized, NORMALIZED.BLOCK);
  }
  assert.equal(validatePayload({ batch_id: 'x', assets: [] }).ok, true);
  assert.equal(evaluateBatch({ batch_id: 'x', assets: [] }).batch_verdict, VERDICT.INCOMPLETE, 'an empty batch proves nothing');
});

test('an entirely empty asset object fails closed and does not throw', () => {
  const r = one({});
  assert.notEqual(r.verdict, VERDICT.READY);
  assert.equal(r.ownership_model, OWNERSHIP.INDETERMINATE);
});

test('batch verdict is the worst asset verdict — one FAILED sinks the batch', () => {
  assert.equal(evaluateBatch(batch([clean()])).batch_verdict, VERDICT.READY);
  assert.equal(evaluateBatch(batch([clean(), clean({ asset_key: 'b', hash_observations: undefined })])).batch_verdict, VERDICT.INCOMPLETE);
  assert.equal(evaluateBatch(batch([clean(), clean({ asset_key: 'b', is_active: true })])).batch_verdict, VERDICT.FAILED);
  // FAILED outranks INCOMPLETE.
  assert.equal(evaluateBatch(batch([
    clean({ asset_key: 'a', hash_observations: undefined }),
    clean({ asset_key: 'b', is_active: true }),
  ])).batch_verdict, VERDICT.FAILED);
});

test('normalizedVerdict: only READY_FOR_PK_REVIEW is clean', () => {
  assert.equal(normalizedVerdict(VERDICT.READY), NORMALIZED.CLEAN);
  assert.equal(normalizedVerdict(VERDICT.FAILED), NORMALIZED.BLOCK);
  assert.equal(normalizedVerdict(VERDICT.INCOMPLETE), NORMALIZED.BLOCK);
});

// ===========================================================================
// REQUIRED PROOF — advisory output cannot mutate eligibility.
// ===========================================================================

test('the module contains no write, DB, network, or git capability at all', () => {
  const banned = [
    /writeFileSync/, /appendFileSync/, /createWriteStream/, /\bmkdirSync\b/, /\brmSync\b/, /unlinkSync/,
    /child_process/, /\bspawn\b/, /\bexecSync\b/,
    /\bfetch\s*\(/, /node:https?/, /XMLHttpRequest/,
    /execute_sql/, /apply_migration/, /\bINSERT\b/, /\bUPDATE\b/, /\bDELETE\b/, /\bGRANT\b/,
  ];
  for (const re of banned) {
    assert.doesNotMatch(SRC, re, `evaluator must not contain ${re}`);
  }
  // Exactly one fs import, and it is read-only.
  assert.match(SRC, /import \{ readFileSync \} from 'node:fs'/);
});

test('no exported function returns anything that could be applied as a state change', () => {
  const r = one(clean());
  for (const k of ['is_active', 'approved', 'production_use_allowed', 'approval_status', 'sql', 'statement']) {
    assert.ok(!(k in r), `result must not carry an applicable field '${k}'`);
  }
});

test('the posture text disclaims authority in the result AND in the rendered report', () => {
  const b = evaluateBatch(batch([clean()]));
  assert.deepEqual(b.posture, POSTURE);
  const joined = POSTURE.join(' ');
  assert.match(joined, /SHADOW \/ ADVISORY/);
  assert.match(joined, /NOT an approval/);
  assert.match(joined, /only deciding act/);
  assert.match(joined, /clears NO gate/i);
  const text = renderReport(b);
  assert.match(text, /DECIDES NOTHING/);
  assert.match(text, /only deciding act/);
});

test('READY is worded as "ready for PK visual review", never as approval', () => {
  const text = renderReport(evaluateBatch(batch([clean()])));
  assert.match(text, /READY FOR PK VISUAL REVIEW/);
  assert.doesNotMatch(text, /\bAPPROVED\b/);
  assert.doesNotMatch(text, /\bpromote\b/i);
});

// ===========================================================================
// REQUIRED PROOF — the PK-visual-review flag cannot be cleared by input.
// ===========================================================================

test('requires_pk_visual_review defaults TRUE without a recorded prior approval', () => {
  const a = clean();
  delete a.prior_pk_approval;
  assert.equal(one(a).requires_pk_visual_review, true);
});

test('a prior approval clears the flag only for the SAME client at the SAME crop', () => {
  assert.equal(one(clean()).requires_pk_visual_review, false);
  assert.equal(one(clean({ client_id: 'client-2' })).requires_pk_visual_review, true, 'approval is never transferable between clients');
  assert.equal(one(clean({ crop_geometry_key: '1080x1920-cover' })).requires_pk_visual_review, true, 'a new crop is new pixels');
  const noEvidence = { client_id: 'client-1', crop_geometry_key: '1080x1080-cover' };
  assert.equal(one(clean({ prior_pk_approval: noEvidence })).requires_pk_visual_review, true, 'a bare claim is not evidence');
});

test('any §10 trigger pins the flag ON even with a valid prior approval', () => {
  for (const over of [
    { identifiable_person: true }, { cultural_element: true }, { ndis_phase: 2 },
    { brand_neutral_reclassified: true }, { new_shape: true },
    { reviewer_verdict: 'PARTIAL_FIT_ONLY' }, { reviewer_verdict: 'REJECT_PROPOSED' },
    { subject_tags: ['unicorns'] },
  ]) {
    const r = one(clean(over));
    assert.equal(r.requires_pk_visual_review, true, `trigger not honoured: ${JSON.stringify(over)}`);
    assert.ok(r.pk_review_triggers.length > 0);
  }
});

test('pk_review_triggers are sorted, so the flag reason is deterministic', () => {
  const r = one(clean({ identifiable_person: true, cultural_element: true, new_shape: true }));
  assert.deepEqual(r.pk_review_triggers, [...r.pk_review_triggers].sort());
});

// ===========================================================================
// REQUIRED PROOF — C12 declared-vs-reachable is explicitly NOT evaluated.
// ===========================================================================

test('C12 and C13 are stamped not_evaluated on every asset', () => {
  const r = one(clean());
  assert.equal(r.checks.C12.status, STATUS.NOT_EVALUATED);
  assert.equal(r.checks.C13.status, STATUS.NOT_EVALUATED);
  assert.match(r.checks.C12.detail, /guard G5 inside the T3 promotion apply/);
});

test('C12/C13 are declared at batch level so a clean sheet cannot imply they were checked', () => {
  const b = evaluateBatch(batch([clean()]));
  assert.deepEqual(b.not_evaluated_in_slice1, NOT_EVALUATED_IN_SLICE1);
  assert.ok('C12' in b.not_evaluated_in_slice1 && 'C13' in b.not_evaluated_in_slice1);
});

test('the rendered report always prints the NOT EVALUATED section, even on a fully clean batch', () => {
  const text = renderReport(evaluateBatch(batch([clean()])));
  assert.match(text, /NOT EVALUATED IN SLICE 1/);
  assert.match(text, /declared == resolver-reachable/);
  assert.match(text, /pool neutrality/);
});

test('C12/C13 never contribute to the verdict in either direction', () => {
  const r = one(clean());
  assert.equal(r.verdict, VERDICT.READY, 'not_evaluated must not force INCOMPLETE');
  assert.ok(!r.blocking_gaps.some((g) => g.startsWith('C12') || g.startsWith('C13')));
});

// ===========================================================================
// CHECK REGISTER + CLI shell.
// ===========================================================================

test('every registered check produces a status on every evaluation', () => {
  const r = one(clean());
  for (const c of CHECKS) {
    assert.ok(c.id in r.checks, `check ${c.id} missing from result`);
    assert.ok(Object.values(STATUS).includes(r.checks[c.id].status), `check ${c.id} has an invalid status`);
  }
  assert.equal(Object.keys(r.checks).length, CHECKS.length);
});

test('non-blocking checks flag but never fail a batch', () => {
  const r = one(clean({ subject_tags: ['unicorns'] }));
  assert.equal(r.checks.C6.status, STATUS.FAIL);
  assert.equal(r.verdict, VERDICT.READY, 'a theme flag is advisory, not blocking');
  assert.deepEqual(r.advisory_flags.map((f) => f.reason_code), ['theme_mismatch']);
  assert.equal(r.requires_pk_visual_review, true, 'but it does route to PK');
});

test('readArgs parses input/format and rejects nonsense', () => {
  assert.deepEqual(readArgs(['--input', 'p.json']), { input: 'p.json', format: 'report', evaluated_at: null });
  assert.equal(readArgs(['p.json', '--json']).format, 'json');
  assert.throws(() => readArgs([]), /no --input/);
  assert.throws(() => readArgs(['p.json', '--format', 'yaml']), /unknown --format/);
});

test('evaluator version is stamped on every result for the audit record (PK ruling 1)', () => {
  assert.equal(evaluateBatch(batch([clean()])).evaluator_version, EVALUATOR_VERSION);
  assert.equal(evaluateBatch(null).evaluator_version, EVALUATOR_VERSION);
  assert.match(EVALUATOR_VERSION, /slice1/);
});

test('input_digest is present on every result, including the fail-closed path', () => {
  assert.match(evaluateBatch(batch([clean()])).input_digest, /^[0-9a-f]{8}$/);
  assert.match(evaluateBatch(null).input_digest, /^[0-9a-f]{8}$/);
});
