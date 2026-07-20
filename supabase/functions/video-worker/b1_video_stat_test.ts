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
