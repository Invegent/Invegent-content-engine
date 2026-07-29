// Hermetic unit tests for the governed PP video_short_stat pure helpers.
// v3.8.0 (Video D6 Lane 3): the plan builder is now SPINE-DRIVEN — it consumes a public.select_template
// response and derives provider_template_id + Logo.source from it (the direct-bind constants are
// retired). v3.10.0 (cc-0044 Checkpoint E — Option B): Background.source is OPTIONAL — present (a generic
// variant) → bound as a dynamic bg; absent (a baked-bg variant) → omitted so the baked background is
// unchanged. Logo.source stays REQUIRED (fail-loud). These tests exercise both paths.
// Run: deno test supabase/functions/video-worker/b1_video_stat_test.ts
// Pure module — no env, no network, no DB, no side effects.
import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  isB1GovernedVideoStat,
  assertStatFieldsWithinGate,
  assertExpectedVideoProviderTemplate,
  buildGovernedVideoStatPlan,
  composeGovernedVideoNarration,
  // v3.15.0 (B-roll Template Parity — TPR-1 wiring)
  parityOverlayForProviderTemplate,
  assertParityOverlayDisjoint,
  B1_VIDEO_TEMPLATE_OUTPUT_PARITY,
  B1_VIDEO_GOVERNED_OUTPUT_SPEC,
  B1_VIDEO_GOVERNED_CLIENT_ID,
  B1_VIDEO_GOVERNED_FORMAT,
  B1_VIDEO_PRODUCTION_LABEL,
  type B1VideoStatFields,
  type TmrSelectorResponse,
} from './b1_video_stat.ts';

const PP_ID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
const NDIS_ID = 'fb98a472-ae4d-432d-8738-2273231c1ef4';
const VOICE = 'https://example.test/pp_voice.mp3';
const BED = 'https://example.test/post-music/global/calm/drifting_piano.mp3';
const PROVIDER_ID = 'c11bb8ab-18bd-45ff-aedd-0a59cb3773ab';
const LOGO_URL = 'https://x.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/PP_logo_2.png';

const okFields: B1VideoStatFields = {
  statValue: '$782K',
  statLabel: 'Perth median house price',
  contextLine: 'Up 3.7% over the past quarter.',
  ctaText: 'What does this mean for you?',
};

// Live-shape fixture for public.select_template('property-pulse', null, 'video_short_stat', null, seed).
// BAKED-BG: slot_resolution carries ONLY the Logo slot (NO Background) — the video background is baked
// into template c11bb8ab (D2 ruling), so the resolver returns no Background slot for this template.
// Shape mirrors b1_production's live-shape fixture, minus the Background/Scrim slots.
function liveShapeFixture(): TmrSelectorResponse {
  return {
    status: 'ok',
    context: {
      client_slug: 'property-pulse', platform: null, format: 'video_short_stat',
      variant_intent: null, seed: 'edf01c52-0000-4000-8000-000000000000',
    },
    rejected: [],
    selected: {
      assignment_id: 'aaaaaaaa-1111-1111-1111-111111111102',
      template_id: '22222222-2222-2222-2222-222222222202',
      provider_template_id: PROVIDER_ID,
      provider_template_name: 'vid_market_stat_reveal_v2',
      variant_key: 'stat-reveal-9x16-video-v2',
      format_key: 'video_short_stat',
      aspect_ratio: '9:16',
      assignment_status: 'visually_approved',
      reasons: ['format_match', 'generic_scope', 'assignment_visually_approved', 'assets_resolved'],
      proof: { visual_approval: 'passed', occurred_at: '2026-07-10T01:00:00Z', evidence_reference: 'render:8c41689a' },
    },
    warnings: ['platform_input_missing', 'platform_suitability_unproven'],
    fail_reason: null,
    alternatives: [],
    slot_resolution: {
      status: 'ok',
      modifications: {
        'Logo.source': LOGO_URL,
      },
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

// ── gate (retained for reference — no longer the production gate) ─────────────────
Deno.test('gate: PP + video_short_stat is governed', () => {
  assertEquals(isB1GovernedVideoStat(PP_ID, 'video_short_stat'), true);
  assertEquals(B1_VIDEO_GOVERNED_CLIENT_ID, PP_ID);
});
Deno.test('gate: PP + video_short_stat_voice is NOT governed (_voice excluded)', () => {
  assertEquals(isB1GovernedVideoStat(PP_ID, 'video_short_stat_voice'), false);
  // the exact format constant excludes the _voice variant (index.ts gates on this constant).
  assertEquals(B1_VIDEO_GOVERNED_FORMAT, 'video_short_stat');
  assert((B1_VIDEO_GOVERNED_FORMAT as string) !== 'video_short_stat_voice');
});
Deno.test('gate: PP + other video formats are NOT governed', () => {
  assertEquals(isB1GovernedVideoStat(PP_ID, 'video_short_kinetic'), false);
  assertEquals(isB1GovernedVideoStat(PP_ID, 'video_short_kinetic_voice'), false);
});
Deno.test('gate: other client + video_short_stat is NOT governed', () => {
  assertEquals(isB1GovernedVideoStat(NDIS_ID, 'video_short_stat'), false);
});

// ── field hard-gates (unchanged contract) ────────────────────────────────────────
Deno.test('gate: valid fields pass', () => {
  assertStatFieldsWithinGate(okFields);
});
Deno.test('gate: blank stat_value throws', () => {
  assertThrows(() => assertStatFieldsWithinGate({ ...okFields, statValue: '   ' }), Error, 'missing stat_value');
});
Deno.test('gate: blank stat_label throws', () => {
  assertThrows(() => assertStatFieldsWithinGate({ ...okFields, statLabel: '' }), Error, 'missing stat_label');
});
Deno.test('gate: blank context_line throws', () => {
  assertThrows(() => assertStatFieldsWithinGate({ ...okFields, contextLine: '' }), Error, 'missing context_line');
});
Deno.test('gate: blank cta_text throws', () => {
  assertThrows(() => assertStatFieldsWithinGate({ ...okFields, ctaText: '' }), Error, 'missing cta_text');
});
Deno.test('gate: stat_value over 12 chars throws (no truncation)', () => {
  assertThrows(() => assertStatFieldsWithinGate({ ...okFields, statValue: '1234567890123' }), Error, 'stat_value length 13 exceeds max_chars=12');
});
Deno.test('gate: stat_label over 48 chars throws', () => {
  assertThrows(() => assertStatFieldsWithinGate({ ...okFields, statLabel: 'x'.repeat(49) }), Error, 'stat_label length 49 exceeds max_chars=48');
});
Deno.test('gate: context_line over 160 chars throws', () => {
  assertThrows(() => assertStatFieldsWithinGate({ ...okFields, contextLine: 'x'.repeat(161) }), Error, 'context_line length 161 exceeds max_chars=160');
});
Deno.test('gate: cta_text over 90 chars throws', () => {
  assertThrows(() => assertStatFieldsWithinGate({ ...okFields, ctaText: 'x'.repeat(91) }), Error, 'cta_text length 91 exceeds max_chars=90');
});
Deno.test('gate: exact-limit values pass (boundary)', () => {
  assertStatFieldsWithinGate({
    statValue: 'x'.repeat(12), statLabel: 'x'.repeat(48),
    contextLine: 'x'.repeat(160), ctaText: 'x'.repeat(90),
  });
});

// ── SPINE-DRIVEN plan builder (v3.8.0) ────────────────────────────────────────────

// (1) SUCCESS PATH: provider_template_id from selected, Logo.source from slot mods, the 4 text mods,
// VoiceAudio.source, MusicBed.source. Background is BAKED — NOT a modification key.
Deno.test('plan: success — provider id + Logo.source resolved; exact 7-key modification set (Background baked)', () => {
  const plan = buildGovernedVideoStatPlan(liveShapeFixture(), okFields, VOICE, BED);
  assertEquals(plan.providerTemplateId, PROVIDER_ID);           // from selected.provider_template_id
  assertEquals(plan.modifications, {
    'StatValue': '$782K',
    'StatLabel': 'Perth median house price',
    'ContextLine': 'Up 3.7% over the past quarter.',
    'CtaText': 'What does this mean for you?',
    'Logo.source': LOGO_URL,                                    // from slot_resolution.modifications
    'VoiceAudio.source': VOICE,
    'MusicBed.source': BED,
  });
  // Background is BAKED — must NOT be a modification key.
  assertEquals(Object.keys(plan.modifications).some((k) => k.startsWith('Background')), false);
  // MusicBed.source ALWAYS present (key presence is the silent-bed guard, N1); volume NEVER set (N3).
  assertEquals('MusicBed.source' in plan.modifications, true);
  assertEquals('MusicBed.volume' in plan.modifications, false);
});

// (1b) OPTION B (v3.10.0): the resolver supplies Background.source (a generic video variant carrying a
// Background field mapping — the image-path pattern) → the plan BINDS it as a modification. Proves the
// dynamic-bg path: a second client uses the SAME generic spine with its background supplied by governed
// data (no new Creatomate template; c11bb8ab already exposes an addressable Background element).
Deno.test('plan: OPTION B — Background.source resolved → bound (8-key set, dynamic bg)', () => {
  const NDIS_BG = 'https://x.supabase.co/storage/v1/object/public/brand-assets/NDIS_Yarns/Backgrounds/navy_waves.jpg';
  const fx = liveShapeFixture();
  fx.slot_resolution!.modifications!['Background.source'] = NDIS_BG;
  fx.slot_resolution!.selected!.push(
    { slot: 'Background', asset_key: 'ndis_bg_navy_waves', asset_id: 'c1c1c1c1-0000-4000-8000-000000000001', asset_url: NDIS_BG, reasons: ['governed', 'license_ok', 'client_match'] },
  );
  const plan = buildGovernedVideoStatPlan(fx, okFields, VOICE, BED);
  assertEquals(plan.modifications['Background.source'], NDIS_BG);
  // exact 8-key set now (the 7 baked-bg keys + Background.source), nothing else.
  assertEquals(Object.keys(plan.modifications).sort(), [
    'Background.source', 'ContextLine', 'CtaText', 'Logo.source', 'MusicBed.source', 'StatLabel', 'StatValue', 'VoiceAudio.source',
  ]);
  // Logo stays required + present; the slot evidence now carries the Background slot too.
  assertEquals(plan.modifications['Logo.source'], LOGO_URL);
  assertEquals(plan.templateSpec.tmr.slot_reasons.some((s) => s.slot === 'Background'), true);
});

// (1c) OPTION B: blank/whitespace Background.source → OMITTED (baked-bg preserved). Unlike MusicBed
// (always a key, '' = silent), sending Background.source='' would BLANK the element — so a baked-bg
// variant that returns no usable bg leaves the provider template's baked background untouched.
Deno.test('plan: OPTION B — blank Background.source → OMITTED (baked-bg preserved)', () => {
  const fx = liveShapeFixture();
  fx.slot_resolution!.modifications!['Background.source'] = '   ';
  const plan = buildGovernedVideoStatPlan(fx, okFields, VOICE, BED);
  assertEquals('Background.source' in plan.modifications, false);
  assertEquals(Object.keys(plan.modifications).length, 7);
});

// (1d) OPTION B: non-string Background.source (defensive) → OMITTED (never coerced into the render).
Deno.test('plan: OPTION B — non-string Background.source → OMITTED', () => {
  const fx = liveShapeFixture();
  (fx.slot_resolution!.modifications as Record<string, unknown>)['Background.source'] = 12345;
  const plan = buildGovernedVideoStatPlan(fx, okFields, VOICE, BED);
  assertEquals('Background.source' in plan.modifications, false);
});

// (1b) determinism: pure — same inputs, same output.
Deno.test('plan: pure/deterministic — same inputs give same output', () => {
  const a = buildGovernedVideoStatPlan(liveShapeFixture(), okFields, VOICE, BED);
  const b = buildGovernedVideoStatPlan(liveShapeFixture(), okFields, VOICE, BED);
  assertEquals(JSON.stringify(a), JSON.stringify(b));
});

// (2) FAIL-LOUD: selector status !== 'ok' → throw (no fallback, fail_reason surfaced); null response too.
Deno.test('plan: selector status fail_closed → throws tmr_video_selector_fail_closed', () => {
  const fx = liveShapeFixture();
  fx.status = 'fail_closed';
  fx.fail_reason = 'variant_not_visually_approved';
  fx.selected = null;
  fx.slot_resolution = null;
  assertThrows(() => buildGovernedVideoStatPlan(fx, okFields, VOICE, BED), Error, 'tmr_video_selector_fail_closed: variant_not_visually_approved');
  // null/undefined response is equally fail-closed.
  assertThrows(() => buildGovernedVideoStatPlan(null, okFields, VOICE, BED), Error, 'tmr_video_selector_fail_closed');
  assertThrows(() => buildGovernedVideoStatPlan(undefined, okFields, VOICE, BED), Error, 'tmr_video_selector_fail_closed');
});

// (3) FAIL-LOUD: embedded slot_resolution fail_closed (or missing) → throw.
Deno.test('plan: slot_resolution fail_closed/missing → throws tmr_video_selector_fail_closed', () => {
  const fx = liveShapeFixture();
  fx.slot_resolution = { status: 'fail_closed', modifications: {}, selected: [], rejected: [], warnings: [], fail_reason: 'no_governed_logo' };
  assertThrows(() => buildGovernedVideoStatPlan(fx, okFields, VOICE, BED), Error, 'tmr_video_selector_fail_closed: slot_resolution:no_governed_logo');
  const fx2 = liveShapeFixture();
  fx2.slot_resolution = null;
  assertThrows(() => buildGovernedVideoStatPlan(fx2, okFields, VOICE, BED), Error, 'tmr_video_selector_fail_closed: slot_resolution:missing');
});

// (4) FAIL-LOUD: missing/blank Logo.source → throw (Logo is the ONLY governed visual asset).
Deno.test('plan: missing/blank Logo.source → throws tmr_video_slot_resolution_incomplete', () => {
  const fx = liveShapeFixture();
  delete fx.slot_resolution!.modifications!['Logo.source'];
  assertThrows(() => buildGovernedVideoStatPlan(fx, okFields, VOICE, BED), Error, 'tmr_video_slot_resolution_incomplete: missing Logo.source');
  const fx2 = liveShapeFixture();
  fx2.slot_resolution!.modifications = { 'Logo.source': '   ' };
  assertThrows(() => buildGovernedVideoStatPlan(fx2, okFields, VOICE, BED), Error, 'tmr_video_slot_resolution_incomplete: missing Logo.source');
});

// (5) FAIL-LOUD: blank voiceover → throw (VO REQUIRED — never render a silent governed video).
Deno.test('plan: blank voiceover throws b1_video_missing_voiceover (VO required)', () => {
  assertThrows(() => buildGovernedVideoStatPlan(liveShapeFixture(), okFields, null, BED), Error, 'b1_video_missing_voiceover');
  assertThrows(() => buildGovernedVideoStatPlan(liveShapeFixture(), okFields, '   ', BED), Error, 'b1_video_missing_voiceover');
  assertThrows(() => buildGovernedVideoStatPlan(liveShapeFixture(), okFields, '', ''), Error, 'b1_video_missing_voiceover');
});

// (6) BAKED-BG CONTRACT (v3.10.0, Option B — now CONDITIONAL): when the resolver returns NO
// Background.source (a baked-bg variant, e.g. the PP client-scoped template), the builder does NOT
// throw (Background is OPTIONAL, not required) and Background is NOT a modification key → the provider
// template's baked background renders unchanged. When a Background.source IS present it is now bound —
// see the OPTION B tests above. This is the D2 divergence, retained ONLY for baked-bg variants.
Deno.test('plan: baked-bg — Background.source absent → no throw, not a modification key (baked bg unchanged)', () => {
  const plan = buildGovernedVideoStatPlan(liveShapeFixture(), okFields, VOICE, BED);
  assert(plan.providerTemplateId === PROVIDER_ID);
  assertEquals('Background.source' in plan.modifications, false);
  assertEquals(Object.keys(plan.modifications).length, 7);
});

// (7) FAIL-LOUD: mapped response without provider_template_id → throw (never submit an empty id).
Deno.test('plan: missing selected.provider_template_id → throws', () => {
  const fx = liveShapeFixture();
  fx.selected = { ...fx.selected!, provider_template_id: undefined };
  assertThrows(() => buildGovernedVideoStatPlan(fx, okFields, VOICE, BED), Error, 'tmr_video_selector_fail_closed: missing_provider_template_id');
});

// (8) N1 silent bed: blank/absent bed → MusicBed.source present + empty; music_bed evidence false.
Deno.test('plan: N1 — blank bed → MusicBed.source present + empty = silent (key presence is the guard)', () => {
  for (const blankBed of ['', '   ', null, undefined]) {
    const plan = buildGovernedVideoStatPlan(liveShapeFixture(), okFields, VOICE, blankBed as string | null | undefined);
    assertEquals('MusicBed.source' in plan.modifications, true);
    assertEquals(plan.modifications['MusicBed.source'], '');
    assertEquals('MusicBed.volume' in plan.modifications, false);
    assertEquals(plan.modifications['VoiceAudio.source'], VOICE);
    assertEquals(plan.templateSpec.tmr.audio, { voiceover: true, music_bed: false });
  }
});

// (9) D6-7 EVIDENCE: resolver-driven, variant_key from selector, NO contract_ref anywhere.
Deno.test('plan: D6-7 evidence is resolver-driven (variant_key from selector, no contract_ref)', () => {
  const plan = buildGovernedVideoStatPlan(liveShapeFixture(), okFields, VOICE, BED);
  const ev = plan.templateSpec.tmr;
  assertEquals(ev.provider_template_id, PROVIDER_ID);
  assertEquals(ev.registry_template_id, '22222222-2222-2222-2222-222222222202');
  assertEquals(ev.assignment_id, 'aaaaaaaa-1111-1111-1111-111111111102');
  assertEquals(ev.variant_key, 'stat-reveal-9x16-video-v2');   // FROM selected.variant_key (D6-7), not a literal
  assertEquals(ev.winner, 'vid_market_stat_reveal_v2');
  assertEquals(ev.seed, 'edf01c52-0000-4000-8000-000000000000');
  assertEquals(ev.bind_mode, 'resolved');                      // was 'direct_bind_pre_select_template'
  assertEquals(ev.resolver_used, true);                        // was false
  assertEquals(ev.fallback_taken, false);
  assertEquals(ev.selector_status, 'ok');
  assertEquals(ev.audio, { voiceover: true, music_bed: true });
  // baked-bg: slot_reasons carries only the Logo slot (no Background slot).
  assertEquals(ev.slot_reasons, [
    { slot: 'Logo', asset_key: 'pp_logo_primary', reasons: ['governed', 'license_ok', 'client_match'] },
  ]);
  // contract_ref is DROPPED everywhere (D6-7 — mirrors image TmrEvidence).
  assertEquals('contract_ref' in (ev as unknown as Record<string, unknown>), false);
  assertEquals('contract_ref' in (plan.templateSpec as unknown as Record<string, unknown>), false);
});

// (9b) templateSpec identity fields come from the selector; resolver_used true; no contract_ref.
Deno.test('plan: templateSpec is resolver-derived (variant/format/aspect from selector)', () => {
  const plan = buildGovernedVideoStatPlan(liveShapeFixture(), okFields, VOICE, BED);
  assertEquals(plan.templateSpec.provider, 'creatomate');
  assertEquals(plan.templateSpec.provider_template_id, PROVIDER_ID);
  assertEquals(plan.templateSpec.variant_key, 'stat-reveal-9x16-video-v2');
  assertEquals(plan.templateSpec.format_key, 'video_short_stat');
  assertEquals(plan.templateSpec.aspect_ratio, '9:16');
  assertEquals(plan.templateSpec.implementation_id, 'vid_market_stat_reveal_v2');
  assertEquals(plan.templateSpec.resolver_used, true);
  assertEquals(plan.templateSpec.fallback_taken, false);
});

// (10) slot_resolution warnings carried verbatim into evidence.
Deno.test('plan: slot_resolution warnings carried into tmr evidence', () => {
  const fx = liveShapeFixture();
  fx.slot_resolution!.warnings = ['optional_slot_unfilled:Watermark'];
  const plan = buildGovernedVideoStatPlan(fx, okFields, VOICE, BED);
  assertEquals(plan.templateSpec.tmr.slot_warnings, ['optional_slot_unfilled:Watermark']);
});

// (11) field gate runs FIRST — a blank field throws before any selector/logo/voice check.
Deno.test('plan: field gate runs first — blank field throws before selector/logo/voice', () => {
  // even with a null response + null voice, the field gate fires first.
  assertThrows(() => buildGovernedVideoStatPlan(null, { ...okFields, statValue: '' }, null, null), Error, 'missing stat_value');
});

Deno.test('plan: label constant matches the seeded governance render_label', () => {
  assertEquals(B1_VIDEO_PRODUCTION_LABEL, 'creative_library_video_stat_production');
});

// ── SMOKE-ONLY provider-template parity guard (PK follow-up, external review 747bc701) ──────
// The smoke asserts the RESOLVED provider id equals the template it proves render parity against.
// Production (renderGovernedVideoStat) NEVER calls this — it stays fully spine-driven.
Deno.test('smoke-guard: assertExpectedVideoProviderTemplate passes on a match', () => {
  assertExpectedVideoProviderTemplate(PROVIDER_ID, PROVIDER_ID);  // no throw
  // the id the smoke proves against is the currently-mapped video template.
  assertEquals(PROVIDER_ID, 'c11bb8ab-18bd-45ff-aedd-0a59cb3773ab');
});
Deno.test('smoke-guard: assertExpectedVideoProviderTemplate throws naming both ids on drift', () => {
  const drifted = 'deadbeef-0000-4000-8000-000000000000';
  const err = assertThrows(
    () => assertExpectedVideoProviderTemplate(drifted, PROVIDER_ID),
    Error,
    'provider drift',
  );
  assert(String(err).includes(PROVIDER_ID), 'message must name the EXPECTED id');
  assert(String(err).includes(drifted), 'message must name the ACTUAL id');
});

// ── narration composer (unchanged) ────────────────────────────────────────────────
Deno.test('narration: deterministic — same inputs give same string', () => {
  assertEquals(composeGovernedVideoNarration(okFields), composeGovernedVideoNarration({ ...okFields }));
});
Deno.test('narration: contains statLabel, statValue, and contextLine', () => {
  const n = composeGovernedVideoNarration(okFields);
  assertEquals(n.includes(okFields.statLabel), true);
  assertEquals(n.includes(okFields.statValue), true);
  assertEquals(n.includes('Up 3.7% over the past quarter'), true);
});
Deno.test('narration: does NOT contain the CTA text (N2 — CTA stays visual)', () => {
  const n = composeGovernedVideoNarration(okFields);
  assertEquals(n.includes(okFields.ctaText), false);
});
Deno.test('narration: reasonable length for a 12s VO (<= 40 words)', () => {
  const n = composeGovernedVideoNarration(okFields);
  assertEquals(n.trim().split(/\s+/).length <= 40, true);
});
Deno.test('narration: adds terminal punctuation when contextLine lacks it', () => {
  const n = composeGovernedVideoNarration({ ...okFields, contextLine: 'Strongest growth in the country' });
  assertEquals(n.endsWith('.'), true);
  const n2 = composeGovernedVideoNarration({ ...okFields, contextLine: 'Big move!' });
  assertEquals(n2.endsWith('!'), true);
  assertEquals(n2.endsWith('!.'), false);
});

// ── v3.11.0 (cc-0044 CP-E): governed narration intro (de-hardcode of "Market update.") ────────────
// REGRESSION: no code path emits the retired hardcoded real-estate prefix.
Deno.test('narration: NEVER contains the retired "Market update." hardcode', () => {
  assertEquals(composeGovernedVideoNarration(okFields).includes('Market update'), false);              // neutral (no intro)
  assertEquals(composeGovernedVideoNarration(okFields, 'Property Pulse').includes('Market update'), false); // governed intro
  assertEquals(composeGovernedVideoNarration(okFields, null).includes('Market update'), false);
});
Deno.test('narration: governed brandIntro is spoken as the prefix', () => {
  const n = composeGovernedVideoNarration(okFields, 'NDIS Yarns');
  assertEquals(n.startsWith('NDIS Yarns. '), true);
  assertEquals(n.includes(okFields.statLabel), true);   // stat body still present
  assertEquals(n.includes(okFields.statValue), true);
});
Deno.test('narration: blank/absent/whitespace brandIntro → NEUTRAL (no prefix, no leading period)', () => {
  const neutral = `${okFields.statLabel} is ${okFields.statValue}. ${okFields.contextLine}`;
  assertEquals(composeGovernedVideoNarration(okFields), neutral);                 // no arg (back-compat)
  assertEquals(composeGovernedVideoNarration(okFields, ''), neutral);
  assertEquals(composeGovernedVideoNarration(okFields, '   '), neutral);
  assertEquals(composeGovernedVideoNarration(okFields, null), neutral);
  assertEquals(composeGovernedVideoNarration(okFields, undefined), neutral);
  assertEquals(neutral.startsWith('.'), false);
});
Deno.test('narration: brandIntro trailing punctuation is normalized to one separating period', () => {
  // "NDIS Yarns." must not yield a doubled period "NDIS Yarns.. …".
  const n = composeGovernedVideoNarration(okFields, 'NDIS Yarns.');
  assertEquals(n.startsWith('NDIS Yarns. '), true);
  assertEquals(n.includes('NDIS Yarns.. '), false);
  assertEquals(n.includes('NDIS Yarns..'), false);
});
Deno.test('narration: brandIntro is trimmed', () => {
  assertEquals(composeGovernedVideoNarration(okFields, '  Property Pulse  ').startsWith('Property Pulse. '), true);
});

// ═══════════════════════════════════════════════════════════════════════════════════
// v3.15.0 — B-ROLL TEMPLATE PARITY (TPR-1 wiring). The render-time output-parity overlay.
//
// Contract under test:
//   A. the overlay is TEMPLATE-SCOPED — empty for every template not in the map, so the incumbent
//      (and every other selectable template) is byte-unchanged by this version;
//   B. for 46c5c4ac it forces the governed output contract 1080x1920/12s on EVERY element;
//   C. it can NEVER displace a governed binding (resolver asset / AI text / audio);
//   D. the effective output spec is stamped into the render evidence.
// ═══════════════════════════════════════════════════════════════════════════════════

const BROLL_PROVIDER_ID = '46c5c4ac-4d35-488c-b57c-44e05d790fb9';
const BROLL_BG = 'https://x.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Broll/broll_pp_au_suburb_aerial.mp4';

// Live-shape fixture for the B-roll selection: same selector response shape, but the winner is the
// B-roll template and the resolver returns a governed VIDEO Background (resolver v1.4 exclusive-by-type).
function brollFixture(): TmrSelectorResponse {
  const fx = liveShapeFixture();
  fx.selected!.provider_template_id = BROLL_PROVIDER_ID;
  fx.selected!.provider_template_name = 'AU_generic_national_Suburb_9:16_V1';
  fx.selected!.template_id = 'dd5fd75e-982d-4c3d-89cd-7ce0936076b2';
  fx.selected!.variant_key = 'stat-reveal-9x16-broll-v1';
  fx.slot_resolution!.modifications!['Background.source'] = BROLL_BG;
  fx.slot_resolution!.selected!.push({
    slot: 'Background', asset_key: 'broll_pp_au_suburb_aerial',
    asset_id: '2d62b04e-c1b5-44df-b382-59cbb991e166', asset_url: BROLL_BG,
    reasons: ['governed', 'license_ok', 'client_match', 'broll_background'],
  });
  return fx;
}

// (A) SCOPE — the incumbent gets NO overlay. This is the regression that keeps the live production
// render byte-identical to v3.14.0 while this version is deployed but not yet activated.
Deno.test('parity: incumbent template gets an EMPTY overlay (byte-unchanged from v3.14.0)', () => {
  assertEquals(parityOverlayForProviderTemplate(PROVIDER_ID), {});
  const plan = buildGovernedVideoStatPlan(liveShapeFixture(), okFields, VOICE, BED);
  assertEquals(Object.keys(plan.modifications).sort(), [
    'ContextLine', 'CtaText', 'Logo.source', 'MusicBed.source', 'StatLabel', 'StatValue', 'VoiceAudio.source',
  ]);
  assertEquals('width' in plan.modifications, false);
  assertEquals('height' in plan.modifications, false);
  assertEquals(Object.keys(plan.modifications).some((k) => k.endsWith('.duration')), false);
  assertEquals(plan.templateSpec.tmr.output_spec, {
    width: null, height: null, duration_seconds: null, source: 'provider_template_default',
  });
});

// (A) SCOPE — an unknown/never-seen template also gets nothing (the map is an allow-list, not a default).
Deno.test('parity: unlisted template gets an EMPTY overlay', () => {
  assertEquals(parityOverlayForProviderTemplate('00000000-0000-4000-8000-000000000000'), {});
  assertEquals(parityOverlayForProviderTemplate(''), {});
});

// (B) THE OVERLAY — the B-roll template renders at the governed output contract.
Deno.test('parity: B-roll template forces 1080x1920 and duration 12 on EVERY element', () => {
  const plan = buildGovernedVideoStatPlan(brollFixture(), okFields, VOICE, BED);
  assertEquals(plan.providerTemplateId, BROLL_PROVIDER_ID);
  assertEquals(plan.modifications['width'], 1080);
  assertEquals(plan.modifications['height'], 1920);
  for (const el of ['Background', 'Logo', 'StatValue', 'StatLabel', 'ContextLine', 'CtaText', 'MusicBed', 'VoiceAudio']) {
    assertEquals(plan.modifications[el + '.duration'], 12, el + '.duration must be 12');
  }
  // exact key set: 8 governed keys (7 + Background.source) + 2 geometry + 8 durations = 18.
  assertEquals(Object.keys(plan.modifications).length, 18);
});

// (B) the overlay matches the incumbent's registry-confirmed native spec — the point of TPR-1.
Deno.test('parity: overlay target equals the governed output contract 1080x1920/12s', () => {
  assertEquals(B1_VIDEO_GOVERNED_OUTPUT_SPEC, { width: 1080, height: 1920, duration_seconds: 12 });
  const ov = parityOverlayForProviderTemplate(BROLL_PROVIDER_ID);
  assertEquals(ov['width'], 1080);
  assertEquals(ov['height'], 1920);
  // EVERY overlay duration key is the contract duration — no element left at the saved object's 8s.
  const durations = Object.entries(ov).filter(([k]) => k.endsWith('.duration')).map(([, v]) => v);
  assertEquals(durations.length, 8);
  assertEquals(durations.every((d) => d === 12), true);
});

// (C) GOVERNANCE — the overlay never touches a governed binding. Resolver-selected asset URLs, the four
// AI-authored text slots and both audio sources survive the merge exactly as the resolver/AI supplied them.
Deno.test('parity: governed bindings are UNCHANGED by the overlay (assets stay resolver-governed)', () => {
  const plan = buildGovernedVideoStatPlan(brollFixture(), okFields, VOICE, BED);
  assertEquals(plan.modifications['Background.source'], BROLL_BG);   // resolver-supplied, not a constant
  assertEquals(plan.modifications['Logo.source'], LOGO_URL);
  assertEquals(plan.modifications['VoiceAudio.source'], VOICE);
  assertEquals(plan.modifications['MusicBed.source'], BED);
  assertEquals(plan.modifications['StatValue'], okFields.statValue);
  assertEquals(plan.modifications['StatLabel'], okFields.statLabel);
  assertEquals(plan.modifications['ContextLine'], okFields.contextLine);
  assertEquals(plan.modifications['CtaText'], okFields.ctaText);
  // N3 still holds: the worker never sets an audio LEVEL (bed volume stays template-controlled).
  assertEquals('MusicBed.volume' in plan.modifications, false);
  assertEquals('VoiceAudio.volume' in plan.modifications, false);
});

// (C) the shipped overlay map contains no key that could ever bind an asset or a level.
Deno.test('parity: no shipped overlay entry carries a .source or .volume key', () => {
  for (const [tid, ov] of Object.entries(B1_VIDEO_TEMPLATE_OUTPUT_PARITY)) {
    for (const k of Object.keys(ov)) {
      assertEquals(k.endsWith('.source'), false, tid + ': ' + k);
      assertEquals(k.endsWith('.volume'), false, tid + ': ' + k);
    }
  }
});

// (C) the disjointness guard is real — a hypothetical bad overlay entry is refused, not merged.
Deno.test('parity: assertParityOverlayDisjoint throws on a governed-key collision', () => {
  assertThrows(
    () => assertParityOverlayDisjoint({ 'Logo.source': 'https://evil.test/logo.png' }, ['Logo.source']),
    Error, 'b1_video_parity_overlay_conflict',
  );
  assertThrows(
    () => assertParityOverlayDisjoint({ 'StatValue': 'hardcoded' }, ['StatValue']),
    Error, 'b1_video_parity_overlay_conflict',
  );
  // a .source key is refused even when it is NOT in the current governed set (future-proofing).
  assertThrows(
    () => assertParityOverlayDisjoint({ 'Watermark.source': 'https://x.test/w.png' }, []),
    Error, 'b1_video_parity_overlay_conflict',
  );
  // geometry-only overlays pass.
  assertParityOverlayDisjoint({ width: 1080, 'Logo.duration': 12 }, ['Logo.source']);
});

// (C) the LIVE shipped overlay is disjoint from the LIVE governed key set (guards the real config).
Deno.test('parity: shipped B-roll overlay is disjoint from the real governed modification set', () => {
  const plan = buildGovernedVideoStatPlan(brollFixture(), okFields, VOICE, BED);
  const governed = ['StatValue', 'StatLabel', 'ContextLine', 'CtaText', 'Logo.source', 'VoiceAudio.source', 'MusicBed.source', 'Background.source'];
  assertParityOverlayDisjoint(parityOverlayForProviderTemplate(BROLL_PROVIDER_ID), governed);
  assertEquals(governed.every((k) => k in plan.modifications), true);
});

// (D) EVIDENCE — the effective output spec is stamped, so a render log proves what was rendered.
Deno.test('parity: tmr evidence stamps the effective output spec + its source', () => {
  const plan = buildGovernedVideoStatPlan(brollFixture(), okFields, VOICE, BED);
  assertEquals(plan.templateSpec.tmr.output_spec, {
    width: 1080, height: 1920, duration_seconds: 12, source: 'render_time_parity_overlay',
  });
  // the rest of the evidence stays resolver-driven for the B-roll winner.
  assertEquals(plan.templateSpec.tmr.provider_template_id, BROLL_PROVIDER_ID);
  assertEquals(plan.templateSpec.tmr.variant_key, 'stat-reveal-9x16-broll-v1');
  assertEquals(plan.templateSpec.tmr.resolver_used, true);
  assertEquals(plan.templateSpec.tmr.slot_reasons.some((s) => s.slot === 'Background'), true);
  assertEquals(plan.templateSpec.tmr.audio, { voiceover: true, music_bed: true });
});

// (B/C) determinism — the overlay is a constant, so the B-roll plan is still pure.
Deno.test('parity: B-roll plan is pure/deterministic', () => {
  const a = buildGovernedVideoStatPlan(brollFixture(), okFields, VOICE, BED);
  const b = buildGovernedVideoStatPlan(brollFixture(), okFields, VOICE, BED);
  assertEquals(a.modifications, b.modifications);
  assertEquals(JSON.stringify(a.templateSpec), JSON.stringify(b.templateSpec));
});

// (B) fail-loud still wins over the overlay: a fail-closed selection never reaches the merge.
Deno.test('parity: overlay does NOT rescue a fail-closed selection', () => {
  const fx = brollFixture();
  fx.status = 'fail_closed';
  fx.fail_reason = 'no_selectable_template';
  assertThrows(() => buildGovernedVideoStatPlan(fx, okFields, VOICE, BED), Error, 'tmr_video_selector_fail_closed');
  const fx2 = brollFixture();
  delete fx2.slot_resolution!.modifications!['Logo.source'];
  assertThrows(() => buildGovernedVideoStatPlan(fx2, okFields, VOICE, BED), Error, 'tmr_video_slot_resolution_incomplete');
  const fx3 = brollFixture();
  assertThrows(() => buildGovernedVideoStatPlan(fx3, okFields, '', BED), Error, 'b1_video_missing_voiceover');
});

// ── v3.15.0 — smoke parity guard widened from ONE id to a SET ──────────────────────
Deno.test('smoke guard: accepts EITHER parity-proven template, refuses anything else', () => {
  const SET = [PROVIDER_ID, BROLL_PROVIDER_ID] as const;
  assertExpectedVideoProviderTemplate(PROVIDER_ID, SET);         // incumbent  -> ok
  assertExpectedVideoProviderTemplate(BROLL_PROVIDER_ID, SET);   // B-roll     -> ok
  assertThrows(() => assertExpectedVideoProviderTemplate('03bc6a3c-985a-4488-b008-67632372783c', SET), Error, 'provider drift');
  // single-string form still works (back-compat with every existing call/test).
  assertExpectedVideoProviderTemplate(PROVIDER_ID, PROVIDER_ID);
  assertThrows(() => assertExpectedVideoProviderTemplate(BROLL_PROVIDER_ID, PROVIDER_ID), Error, 'provider drift');
  // an EMPTY expected set is fail-closed, never an accept-all.
  assertThrows(() => assertExpectedVideoProviderTemplate(PROVIDER_ID, []), Error, 'empty expected-template set');
});

// (A) CANARY — the overlay allow-list must contain EXACTLY ONE template. This is deliberately a
// brittle test: it exists so that ADDING a template to the parity map cannot happen quietly. Any new
// entry is a product-output change for whichever format selects that template and must go through
// TPR-1 (diff the outgoing vs incoming output spec) at its own gate — updating this assertion is the
// mechanical reminder to do that. Raised by the external review of the activation packet as the
// residual risk of a widened surface.
Deno.test('parity: CANARY — overlay allow-list holds exactly one template (46c5c4ac)', () => {
  assertEquals(Object.keys(B1_VIDEO_TEMPLATE_OUTPUT_PARITY), [BROLL_PROVIDER_ID]);
});

// (A) CANARY — every overlay entry must declare the FULL contract: both geometry keys and a duration
// for every element. A partial entry would produce a mixed-spec render (e.g. 1080x1920 but an element
// still ending at 8s), which is the failure mode this whole lane exists to prevent.
Deno.test('parity: CANARY — every overlay entry is complete (2 geometry keys + 8 element durations)', () => {
  for (const [tid, ov] of Object.entries(B1_VIDEO_TEMPLATE_OUTPUT_PARITY)) {
    assertEquals(ov['width'], B1_VIDEO_GOVERNED_OUTPUT_SPEC.width, tid);
    assertEquals(ov['height'], B1_VIDEO_GOVERNED_OUTPUT_SPEC.height, tid);
    const durs = Object.keys(ov).filter((k) => k.endsWith('.duration')).sort();
    assertEquals(durs, [
      'Background.duration', 'ContextLine.duration', 'CtaText.duration', 'Logo.duration',
      'MusicBed.duration', 'StatLabel.duration', 'StatValue.duration', 'VoiceAudio.duration',
    ], tid);
    assertEquals(Object.keys(ov).length, 10, tid);
  }
});
