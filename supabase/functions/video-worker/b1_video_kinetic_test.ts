// Hermetic unit tests for the governed PP video_short_kinetic pure helpers.
// v1.0.0 (2026-08-01, WS-4/WS-5 D4). Governing design record:
// `docs/briefs/ws4-pp-yt-kinetic-operator-transposition-package-v1.md` §4-§9/§5e +
// `docs/briefs/results/ws5-constraints-shape-design-lane-result-v1.md`. The timing numbers below are
// cross-checked against the operator guide's own worked 3-point example
// (`docs/briefs/ws4-kinetic-transposition-operator-guide-v1.md` Step 6 — hook=6s/point×3@8s/cta=5s,
// 35s total; Point3Counter time=22.15/dur=7.6, CtaWatermark time=30/dur=5, CtaHeadline time=30.3/
// dur=4.4, CtaFooter time=30.9/dur=3.9 all match exactly).
// Run: deno test supabase/functions/video-worker/b1_video_kinetic_test.ts
// Pure module — no env, no network, no DB, no side effects.
import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  assertKineticScenesWithinGate,
  buildGovernedVideoKineticPlan,
  B1_VIDEO_KINETIC_GOVERNED_FORMAT,
  B1_VIDEO_KINETIC_PRODUCTION_LABEL,
  B1_VIDEO_KINETIC_MAX_POINT_SLOTS,
  B1_VIDEO_KINETIC_COLLAPSE_TIME,
  B1_VIDEO_KINETIC_COLLAPSE_DURATION,
  type KineticScene,
  type TmrSelectorResponse,
} from './b1_video_kinetic.ts';
import { B1_VIDEO_GOVERNED_FORMAT } from './b1_video_stat.ts';

const LOGO_URL = 'https://x.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/PP_logo_2.png';
const PROVIDER_ID = '0bd871ae-79c1-431a-a7bd-9f631a6cf75a';
const brand = { primaryColour: '#0A2A4A', secondaryColour: '#1C8A8A', clientName: 'Property Pulse' };

// Live-shape fixture for public.select_template('property-pulse', null, 'video_short_kinetic', null, seed).
// slot_resolution carries ONLY the Logo slot — Background/BarTop/BarBottom are brand-profile colours,
// not resolver-governed assets (WS-4 §6.1), so the resolver never returns a slot for them.
function liveShapeFixture(): TmrSelectorResponse {
  return {
    status: 'ok',
    context: {
      client_slug: 'property-pulse', platform: null, format: 'video_short_kinetic',
      variant_intent: null, seed: 'edf01c52-0000-4000-8000-000000000000',
    },
    rejected: [],
    selected: {
      assignment_id: 'aaaaaaaa-2222-2222-2222-222222222202',
      template_id: '9ad024cc-3eda-488e-b346-bc661ec70a6a',
      provider_template_id: PROVIDER_ID,
      provider_template_name: 'generic_kinetic_text_9x16_v1',
      variant_key: 'kinetic-typography-9x16-video-v1',
      format_key: 'video_short_kinetic',
      aspect_ratio: '9:16',
      assignment_status: 'visually_approved',
      reasons: ['format_match', 'generic_scope', 'assignment_visually_approved', 'assets_resolved'],
      proof: { visual_approval: 'passed', occurred_at: '2026-08-01T00:00:00Z', evidence_reference: 'render:2ccdb697' },
    },
    warnings: ['platform_input_missing', 'platform_suitability_unproven'],
    fail_reason: null,
    alternatives: [],
    slot_resolution: {
      status: 'ok',
      modifications: { 'Logo.source': LOGO_URL },
      selected: [
        { slot: 'Logo', asset_key: 'pp_logo_primary', asset_id: 'b7530c55-c320-43be-90d9-98c804694921', asset_url: LOGO_URL, reasons: ['governed', 'license_ok', 'client_match'] },
      ],
      rejected: [],
      warnings: [],
      fail_reason: null,
      context: {},
    },
  };
}

// ── gate constants ──────────────────────────────────────────────────────────────
Deno.test('gate: kinetic format constant is the exact silent literal, distinct from _voice and from stat', () => {
  assertEquals(B1_VIDEO_KINETIC_GOVERNED_FORMAT, 'video_short_kinetic');
  assert((B1_VIDEO_KINETIC_GOVERNED_FORMAT as string) !== 'video_short_kinetic_voice');
  assert((B1_VIDEO_KINETIC_GOVERNED_FORMAT as string) !== B1_VIDEO_GOVERNED_FORMAT);
});
Deno.test('gate: production label matches the render_label this migration lane must seed', () => {
  assertEquals(B1_VIDEO_KINETIC_PRODUCTION_LABEL, 'creative_library_video_kinetic_production');
});
Deno.test('gate: fixed point-slot count is 3 (WS-4 §4 — 3-slot design STANDS)', () => {
  assertEquals(B1_VIDEO_KINETIC_MAX_POINT_SLOTS, 3);
});

// ── scene structural + text hard-gate (WS-4 §9) ───────────────────────────────────
const okScene = (type: KineticScene['type'], headline: string, body: string | null, duration_s: number): KineticScene =>
  ({ type, headline, body, duration_s });

Deno.test('scene gate: valid 3-point script passes', () => {
  assertKineticScenesWithinGate([
    okScene('hook', 'Perth rents just hit a 10-year high', null, 6),
    okScene('point', 'Median asking rent: $650/week', 'Up 9% since this time last year', 8),
    okScene('point', 'Vacancy rate sits at just 0.8%', 'Tenants are competing for every listing', 8),
    okScene('point', 'New listings are down 12% on last spring', 'Sellers who list early face less competition', 8),
    okScene('cta', 'Thinking of listing this spring?', null, 5),
  ]);
});
Deno.test('scene gate: too few scenes throws', () => {
  assertThrows(() => assertKineticScenesWithinGate([okScene('hook', 'H', null, 5), okScene('cta', 'C', null, 5)]), Error, 'missing_or_invalid_scenes');
});
Deno.test('scene gate: null/undefined scenes throws', () => {
  assertThrows(() => assertKineticScenesWithinGate(null), Error, 'missing_or_invalid_scenes');
  assertThrows(() => assertKineticScenesWithinGate(undefined), Error, 'missing_or_invalid_scenes');
});
Deno.test('scene gate: first scene must be hook', () => {
  assertThrows(() => assertKineticScenesWithinGate([
    okScene('point', 'P', 'B', 8), okScene('point', 'P2', null, 8), okScene('cta', 'C', null, 5),
  ]), Error, "first scene must be type 'hook'");
});
Deno.test('scene gate: last scene must be cta', () => {
  assertThrows(() => assertKineticScenesWithinGate([
    okScene('hook', 'H', null, 5), okScene('point', 'P', null, 8), okScene('point', 'P2', null, 8),
  ]), Error, "last scene must be type 'cta'");
});
// NOTE: with the total-array-length bound (3-5 scenes) and exactly-one-hook/exactly-one-cta already
// enforced, a point count > 3 can ONLY arise via a >5-length array — which the length check catches
// FIRST (message reflects that, not the point-count-specific branch). The point-count check is
// defence-in-depth for a caller that bypasses the TS array-length inference; asserting the actual
// (correct) rejection here, not a hypothetical.
Deno.test('scene gate: 6 scenes (would be 4 point slots) throws on the total-length bound first', () => {
  assertThrows(() => assertKineticScenesWithinGate([
    okScene('hook', 'H', null, 5),
    okScene('point', 'P1', null, 8), okScene('point', 'P2', null, 8),
    okScene('point', 'P3', null, 8), okScene('point', 'P4', null, 8),
    okScene('cta', 'C', null, 5),
  ]), Error, 'missing_or_invalid_scenes');
});
Deno.test('scene gate: a middle scene that is not type point throws', () => {
  assertThrows(() => assertKineticScenesWithinGate([
    okScene('hook', 'H', null, 5), okScene('hook', 'not a point', null, 8), okScene('cta', 'C', null, 5),
  ]), Error, "must be type 'point'");
});
Deno.test('scene gate: blank hook.headline throws', () => {
  assertThrows(() => assertKineticScenesWithinGate([
    okScene('hook', '  ', null, 5), okScene('point', 'P', null, 8), okScene('cta', 'C', null, 5),
  ]), Error, 'missing hook.headline');
});
Deno.test('scene gate: hook.headline over 60 chars throws (no truncation)', () => {
  assertThrows(() => assertKineticScenesWithinGate([
    okScene('hook', 'x'.repeat(61), null, 5), okScene('point', 'P', null, 8), okScene('cta', 'C', null, 5),
  ]), Error, 'hook.headline length 61 exceeds max_chars=60');
});
Deno.test('scene gate: point.headline over 55 chars throws', () => {
  assertThrows(() => assertKineticScenesWithinGate([
    okScene('hook', 'H', null, 5), okScene('point', 'x'.repeat(56), null, 8), okScene('cta', 'C', null, 5),
  ]), Error, 'point[0].headline length 56 exceeds max_chars=55');
});
Deno.test('scene gate: point.body over 100 chars throws', () => {
  assertThrows(() => assertKineticScenesWithinGate([
    okScene('hook', 'H', null, 5), okScene('point', 'P', 'x'.repeat(101), 8), okScene('cta', 'C', null, 5),
  ]), Error, 'point[0].body length 101 exceeds max_chars=100');
});
Deno.test('scene gate: blank/absent point.body does NOT throw (empty_ok)', () => {
  assertKineticScenesWithinGate([okScene('hook', 'H', null, 5), okScene('point', 'P', null, 8), okScene('cta', 'C', null, 5)]);
  assertKineticScenesWithinGate([okScene('hook', 'H', null, 5), okScene('point', 'P', '   ', 8), okScene('cta', 'C', null, 5)]);
});
Deno.test('scene gate: cta.headline over 65 chars throws', () => {
  assertThrows(() => assertKineticScenesWithinGate([
    okScene('hook', 'H', null, 5), okScene('point', 'P', null, 8), okScene('cta', 'x'.repeat(66), null, 5),
  ]), Error, 'cta.headline length 66 exceeds max_chars=65');
});
Deno.test('scene gate: exact-limit values pass (boundary)', () => {
  assertKineticScenesWithinGate([
    okScene('hook', 'x'.repeat(60), null, 5),
    okScene('point', 'x'.repeat(55), 'x'.repeat(100), 8),
    okScene('cta', 'x'.repeat(65), null, 5),
  ]);
});

// ── (a) plan builder — 3-point script: exact suffixed-key modification set ────────
Deno.test('plan: 3-point script — exact suffixed-key modifications dict (cross-checked vs operator-guide worked example)', () => {
  const scenes: KineticScene[] = [
    okScene('hook', 'Perth rents just hit a 10-year high', null, 6),
    okScene('point', 'Median asking rent: $650/week', 'Up 9% since this time last year', 8),
    okScene('point', 'Vacancy rate sits at just 0.8%', 'Tenants are competing for every listing', 8),
    okScene('point', 'New listings are down 12% on last spring', 'Sellers who list early face less competition', 8),
    okScene('cta', 'Thinking of listing this spring?', null, 5),
  ];
  const plan = buildGovernedVideoKineticPlan(liveShapeFixture(), scenes, brand);
  assertEquals(plan.providerTemplateId, PROVIDER_ID);
  assertEquals(plan.modifications, {
    'Background.fill_color': '#0A2A4A',
    'BarTop.fill_color': '#1C8A8A',
    'BarBottom.fill_color': '#1C8A8A',
    'Logo.source': LOGO_URL,
    // v3.17.1 (PK ruling 2026-08-03): VoiceAudio.source OMITTED — silent format declares no
    // voice (the old always-'' binding tripped assertAudioSpec terminally). MusicBed stays ''.
    'MusicBed.source': '',
    'duration': 35,

    'HookHeadline.text': 'Perth rents just hit a 10-year high', 'HookHeadline.time': 0.4, 'HookHeadline.duration': 5.2,
    'HookSubtitle.text': '↓ Keep watching', 'HookSubtitle.time': 1.2, 'HookSubtitle.duration': 4.4,

    'Point1Counter.text': '1/3', 'Point1Counter.time': 6.15, 'Point1Counter.duration': 7.6,
    'Point1Bar.time': 6.30, 'Point1Bar.duration': 7.4,
    'Point1Headline.text': 'Median asking rent: $650/week', 'Point1Headline.time': 6.50, 'Point1Headline.duration': 7.2,
    'Point1Divider.time': 6.75, 'Point1Divider.duration': 7.0,
    'Point1Body.text': 'Up 9% since this time last year', 'Point1Body.time': 6.90, 'Point1Body.duration': 7.0,

    'Point2Counter.text': '2/3', 'Point2Counter.time': 14.15, 'Point2Counter.duration': 7.6,
    'Point2Bar.time': 14.30, 'Point2Bar.duration': 7.4,
    'Point2Headline.text': 'Vacancy rate sits at just 0.8%', 'Point2Headline.time': 14.50, 'Point2Headline.duration': 7.2,
    'Point2Divider.time': 14.75, 'Point2Divider.duration': 7.0,
    'Point2Body.text': 'Tenants are competing for every listing', 'Point2Body.time': 14.90, 'Point2Body.duration': 7.0,

    'Point3Counter.text': '3/3', 'Point3Counter.time': 22.15, 'Point3Counter.duration': 7.6,
    'Point3Bar.time': 22.30, 'Point3Bar.duration': 7.4,
    'Point3Headline.text': 'New listings are down 12% on last spring', 'Point3Headline.time': 22.50, 'Point3Headline.duration': 7.2,
    'Point3Divider.time': 22.75, 'Point3Divider.duration': 7.0,
    'Point3Body.text': 'Sellers who list early face less competition', 'Point3Body.time': 22.90, 'Point3Body.duration': 7.0,

    'CtaWatermark.time': 30, 'CtaWatermark.duration': 5,
    'CtaHeadline.text': 'Thinking of listing this spring?', 'CtaHeadline.time': 30.3, 'CtaHeadline.duration': 4.4,
    'CtaFooter.text': 'Follow Property Pulse for more', 'CtaFooter.time': 30.9, 'CtaFooter.duration': 3.9,
  });
  assertEquals(plan.templateSpec.tmr.scene_summary, { active_point_count: 3, total_duration_seconds: 35 });
});

Deno.test('plan: 3-point script — active point with NO body collapses ONLY Divider+Body off-timeline', () => {
  const scenes: KineticScene[] = [
    okScene('hook', 'H', null, 5),
    okScene('point', 'P1 headline', null, 8),   // no body
    okScene('point', 'P2 headline', 'has a body', 8),
    okScene('point', 'P3 headline', null, 8),   // no body
    okScene('cta', 'C', null, 5),
  ];
  const plan = buildGovernedVideoKineticPlan(liveShapeFixture(), scenes, brand);
  // Point1 (no body): Divider + Body collapsed; Counter/Bar/Headline stay on the ACTIVE timing walk.
  assertEquals(plan.modifications['Point1Divider.time'], B1_VIDEO_KINETIC_COLLAPSE_TIME);
  assertEquals(plan.modifications['Point1Divider.duration'], B1_VIDEO_KINETIC_COLLAPSE_DURATION);
  assertEquals(plan.modifications['Point1Body.text'], '');
  assertEquals(plan.modifications['Point1Body.time'], B1_VIDEO_KINETIC_COLLAPSE_TIME);
  assertEquals(plan.modifications['Point1Body.duration'], B1_VIDEO_KINETIC_COLLAPSE_DURATION);
  assertEquals(plan.modifications['Point1Headline.text'], 'P1 headline');
  assertEquals(plan.modifications['Point1Counter.time'], 5.15);  // unaffected — real active timing
  // Point2 (has body): normal active timing for all 5 sub-elements.
  assertEquals(plan.modifications['Point2Body.text'], 'has a body');
  assert((plan.modifications['Point2Divider.time'] as number) < B1_VIDEO_KINETIC_COLLAPSE_TIME);
});

Deno.test('plan: pure/deterministic — same inputs give same output', () => {
  const scenes: KineticScene[] = [okScene('hook', 'H', null, 5), okScene('point', 'P', 'B', 8), okScene('cta', 'C', null, 5)];
  const a = buildGovernedVideoKineticPlan(liveShapeFixture(), scenes, brand);
  const b = buildGovernedVideoKineticPlan(liveShapeFixture(), scenes, brand);
  assertEquals(JSON.stringify(a), JSON.stringify(b));
});

// ── (b) plan builder — 1-point script: Point2/Point3 off-timeline collapse (ALL 5 sub-elements) ──
Deno.test('plan: 1-point script — Point2 + Point3 collapse off-timeline across ALL 5 sub-elements', () => {
  const scenes: KineticScene[] = [
    okScene('hook', 'One-point hook', null, 5),
    okScene('point', 'Only point headline', 'Only point body', 7),
    okScene('cta', 'Single point CTA', null, 4),
  ];
  const plan = buildGovernedVideoKineticPlan(liveShapeFixture(), scenes, brand);
  assertEquals(plan.templateSpec.tmr.scene_summary, { active_point_count: 1, total_duration_seconds: 16 });
  assertEquals(plan.modifications['duration'], 16);

  // Point1 — ACTIVE, real content + real timing.
  assertEquals(plan.modifications['Point1Counter.text'], '1/1');
  assertEquals(plan.modifications['Point1Headline.text'], 'Only point headline');
  assertEquals(plan.modifications['Point1Body.text'], 'Only point body');
  assert((plan.modifications['Point1Counter.time'] as number) < B1_VIDEO_KINETIC_COLLAPSE_TIME);

  // Point2 + Point3 — COLLAPSED, every one of the 5 sub-elements, per slot.
  for (const n of [2, 3]) {
    for (const el of ['Counter', 'Bar', 'Headline', 'Divider', 'Body']) {
      const key = `Point${n}${el}`;
      assertEquals(plan.modifications[`${key}.time`], B1_VIDEO_KINETIC_COLLAPSE_TIME, `${key}.time`);
      assertEquals(plan.modifications[`${key}.duration`], B1_VIDEO_KINETIC_COLLAPSE_DURATION, `${key}.duration`);
    }
    // .text='' applies ONLY to the 3 text-bearing sub-elements — Bar/Divider have NO .text key
    // in the confirmed key map (shape elements), so no such key should exist at all.
    assertEquals(plan.modifications[`Point${n}Counter.text`], '');
    assertEquals(plan.modifications[`Point${n}Headline.text`], '');
    assertEquals(plan.modifications[`Point${n}Body.text`], '');
    assertEquals(`Point${n}Bar.text` in plan.modifications, false);
    assertEquals(`Point${n}Divider.text` in plan.modifications, false);
  }

  // Exact key count sanity: every point slot (active OR collapsed) sets the SAME key set, just with
  // sentinel vs. real values — 13 keys/slot either way (Counter 3 + Bar 2 + Headline 3 + Divider 2 +
  // Body 3). 6 global + 6 hook + 13*3 points + 8 cta = 6+6+39+8 = 59.
  // (v3.17.1: global dropped 7 → 6 — VoiceAudio.source is OMITTED, the silent format declares no
  // voice; MusicBed.source '' remains.)
  assertEquals(Object.keys(plan.modifications).length, 59);
});

// ── fail-loud contract (mirrors b1_video_stat.ts) ─────────────────────────────────
Deno.test('plan: scene gate runs FIRST — invalid scenes throw before any selector work', () => {
  assertThrows(() => buildGovernedVideoKineticPlan(null, [okScene('cta', 'only cta', null, 5)], brand), Error, 'missing_or_invalid_scenes');
});
Deno.test('plan: selector status fail_closed → throws tmr_video_selector_fail_closed', () => {
  const scenes: KineticScene[] = [okScene('hook', 'H', null, 5), okScene('point', 'P', null, 8), okScene('cta', 'C', null, 5)];
  const fx = liveShapeFixture();
  fx.status = 'fail_closed';
  fx.fail_reason = 'variant_not_visually_approved';
  assertThrows(() => buildGovernedVideoKineticPlan(fx, scenes, brand), Error, 'tmr_video_selector_fail_closed: variant_not_visually_approved');
  assertThrows(() => buildGovernedVideoKineticPlan(null, scenes, brand), Error, 'tmr_video_selector_fail_closed');
});
Deno.test('plan: slot_resolution fail_closed/missing → throws', () => {
  const scenes: KineticScene[] = [okScene('hook', 'H', null, 5), okScene('point', 'P', null, 8), okScene('cta', 'C', null, 5)];
  const fx = liveShapeFixture();
  fx.slot_resolution = { status: 'fail_closed', modifications: {}, selected: [], rejected: [], warnings: [], fail_reason: 'no_governed_logo' };
  assertThrows(() => buildGovernedVideoKineticPlan(fx, scenes, brand), Error, 'tmr_video_selector_fail_closed: slot_resolution:no_governed_logo');
});
Deno.test('plan: missing/blank Logo.source → throws tmr_video_slot_resolution_incomplete (no client-name fallback)', () => {
  const scenes: KineticScene[] = [okScene('hook', 'H', null, 5), okScene('point', 'P', null, 8), okScene('cta', 'C', null, 5)];
  const fx = liveShapeFixture();
  delete fx.slot_resolution!.modifications!['Logo.source'];
  assertThrows(() => buildGovernedVideoKineticPlan(fx, scenes, brand), Error, 'tmr_video_slot_resolution_incomplete: missing Logo.source');
});
Deno.test('plan: missing selected.provider_template_id → throws', () => {
  const scenes: KineticScene[] = [okScene('hook', 'H', null, 5), okScene('point', 'P', null, 8), okScene('cta', 'C', null, 5)];
  const fx = liveShapeFixture();
  fx.selected = { ...fx.selected!, provider_template_id: undefined };
  assertThrows(() => buildGovernedVideoKineticPlan(fx, scenes, brand), Error, 'tmr_video_selector_fail_closed: missing_provider_template_id');
});

// ── evidence ───────────────────────────────────────────────────────────────────
Deno.test('plan: tmr evidence is resolver-driven, audio always false (v1 silent scope)', () => {
  const scenes: KineticScene[] = [okScene('hook', 'H', null, 5), okScene('point', 'P', 'B', 8), okScene('cta', 'C', null, 5)];
  const plan = buildGovernedVideoKineticPlan(liveShapeFixture(), scenes, brand);
  const ev = plan.templateSpec.tmr;
  assertEquals(ev.provider_template_id, PROVIDER_ID);
  assertEquals(ev.variant_key, 'kinetic-typography-9x16-video-v1');
  assertEquals(ev.bind_mode, 'resolved');
  assertEquals(ev.resolver_used, true);
  assertEquals(ev.fallback_taken, false);
  assertEquals(ev.selector_status, 'ok');
  assertEquals(ev.audio, { voiceover: false, music_bed: false });
  assertEquals(plan.templateSpec.provider, 'creatomate');
  assertEquals(plan.templateSpec.resolver_used, true);
});

// ── v3.17.1 (PK ruling 2026-08-03) — the silent plan vs the REAL audio gate ───────
// The production defect this fix closes: 'VoiceAudio.source': '' in the silent kinetic plan
// tripped assertAudioSpec's AUDIO_SPEC_ASSERT_FAILED (only MusicBed's '' is the exempt N1
// silent bed), terminally killing EVERY governed kinetic render (live: draft 90381483).
// These tests run the REAL exported gate functions from index.ts against the REAL
// buildGovernedVideoKineticPlan output, wrapped in the EXACT template-mode renderScript shape
// renderGovernedVideoKinetic submits ({ template_id, modifications, output_format: 'mp4' }).
// Direction (b) — voiced formats still fail closed on declared-but-empty VoiceAudio — is
// covered by the UNTOUCHED audio_failclosed_test.ts assertions.
//
// index.ts has a top-level Deno.serve entrypoint — neutralise it BEFORE the dynamic import
// (the proven house pattern from audio_failclosed_test.ts / render_upload_music_usage_test.ts)
// so importing the module does not bind a port. Production code is byte-unchanged.
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (..._args: any[]) => ({ finished: Promise.resolve(), async shutdown() {}, ref() {}, unref() {}, addr: { transport: 'tcp', hostname: '0.0.0.0', port: 0 } });
const { assertAudioSpec, specHasAudio } = await import('./index.ts');

Deno.test('v3.17.1: silent kinetic plan OMITS VoiceAudio.source and keeps the explicit N1 MusicBed', () => {
  const scenes: KineticScene[] = [okScene('hook', 'H', null, 5), okScene('point', 'P', 'B', 8), okScene('cta', 'C', null, 5)];
  const plan = buildGovernedVideoKineticPlan(liveShapeFixture(), scenes, brand);
  assertEquals('VoiceAudio.source' in plan.modifications, false);   // spec declares NO voice
  assertEquals(plan.modifications['MusicBed.source'], '');          // intentional silent bed (N1), byte-unchanged
});

Deno.test('v3.17.1: REAL assertAudioSpec passes the silent kinetic renderScript (no VoiceAudio key → no-op)', () => {
  const scenes: KineticScene[] = [okScene('hook', 'H', null, 5), okScene('point', 'P', 'B', 8), okScene('cta', 'C', null, 5)];
  const plan = buildGovernedVideoKineticPlan(liveShapeFixture(), scenes, brand);
  const renderScript = { template_id: plan.providerTemplateId, modifications: plan.modifications, output_format: 'mp4' };
  assertAudioSpec(renderScript);   // would have thrown AUDIO_SPEC_ASSERT_FAILED before v3.17.1
});

Deno.test('v3.17.1: REAL specHasAudio returns false for the silent kinetic renderScript (post-render silent-mp4 enforcement exempt)', () => {
  const scenes: KineticScene[] = [okScene('hook', 'H', null, 5), okScene('point', 'P', 'B', 8), okScene('cta', 'C', null, 5)];
  const plan = buildGovernedVideoKineticPlan(liveShapeFixture(), scenes, brand);
  const renderScript = { template_id: plan.providerTemplateId, modifications: plan.modifications, output_format: 'mp4' };
  assertEquals(specHasAudio(renderScript), false);
});
