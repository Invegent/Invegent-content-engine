// Hermetic unit tests for the governed PP video_short_stat pure helpers (v3.5.0).
// Run: deno test supabase/functions/video-worker/b1_video_stat_test.ts
// Pure module — no env, no network, no DB, no side effects.
import { assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  isB1GovernedVideoStat,
  assertStatFieldsWithinGate,
  buildGovernedVideoStatPlan,
  composeGovernedVideoNarration,
  B1_VIDEO_GOVERNED_CLIENT_ID,
  B1_VIDEO_PROVIDER_TEMPLATE_ID,
  B1_VIDEO_PRODUCTION_LABEL,
  B1_VIDEO_VARIANT_KEY,
  B1_VIDEO_CONTRACT_REF,
  type B1VideoStatFields,
} from './b1_video_stat.ts';

const PP_ID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
const NDIS_ID = 'fb98a472-ae4d-432d-8738-2273231c1ef4';
const LOGO = 'https://example.test/pp_logo.png';
const VOICE = 'https://example.test/pp_voice.mp3';
const BED = 'https://example.test/post-music/global/calm/drifting_piano.mp3';
const okFields: B1VideoStatFields = {
  statValue: '$782K',
  statLabel: 'Perth median house price',
  contextLine: 'Up 3.7% over the past quarter.',
  ctaText: 'What does this mean for you?',
};

// ── gate ──────────────────────────────────────────────────────────────────────
Deno.test('gate: PP + video_short_stat is governed', () => {
  assertEquals(isB1GovernedVideoStat(PP_ID, 'video_short_stat'), true);
  assertEquals(B1_VIDEO_GOVERNED_CLIENT_ID, PP_ID);
});
Deno.test('gate: PP + video_short_stat_voice is NOT governed (_voice excluded)', () => {
  assertEquals(isB1GovernedVideoStat(PP_ID, 'video_short_stat_voice'), false);
});
Deno.test('gate: PP + other video formats are NOT governed', () => {
  assertEquals(isB1GovernedVideoStat(PP_ID, 'video_short_kinetic'), false);
  assertEquals(isB1GovernedVideoStat(PP_ID, 'video_short_kinetic_voice'), false);
});
Deno.test('gate: other client + video_short_stat is NOT governed', () => {
  assertEquals(isB1GovernedVideoStat(NDIS_ID, 'video_short_stat'), false);
});

// ── field hard-gates ───────────────────────────────────────────────────────────
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

// ── plan builder (v3.6.0 combo audio) ─────────────────────────────────────────────
Deno.test('plan: binds v2 provider template id c11bb8ab', () => {
  const plan = buildGovernedVideoStatPlan(okFields, LOGO, VOICE, BED);
  assertEquals(plan.providerTemplateId, B1_VIDEO_PROVIDER_TEMPLATE_ID);
  assertEquals(B1_VIDEO_PROVIDER_TEMPLATE_ID, 'c11bb8ab-18bd-45ff-aedd-0a59cb3773ab');
  assertEquals(B1_VIDEO_VARIANT_KEY, 'stat-reveal-9x16-video-v2');
});
Deno.test('plan: 7 modifications = 5 visual/text + 2 audio (Background baked, not present)', () => {
  const plan = buildGovernedVideoStatPlan(okFields, LOGO, VOICE, BED);
  assertEquals(plan.modifications, {
    'StatValue': '$782K',
    'StatLabel': 'Perth median house price',
    'ContextLine': 'Up 3.7% over the past quarter.',
    'CtaText': 'What does this mean for you?',
    'Logo.source': LOGO,
    'VoiceAudio.source': VOICE,
    'MusicBed.source': BED,
  });
  // Background is BAKED — must NOT be a modification key.
  assertEquals(Object.keys(plan.modifications).some((k) => k.startsWith('Background')), false);
  // N1/N3 SETTLED (cc-0032, EMPTY_BED_TEST_RESULT R0/R1/R2, 2026-07-10): R0 = OMITTING MusicBed.source
  // plays c11bb8ab's baked Drifting Piano default; R1 = MusicBed.source:'' DISABLES the element (no
  // audio stream); R2 = adding volume:0 is byte-identical to R1 (a no-op). So the guard is KEY
  // PRESENCE, not volume — MusicBed.source is ALWAYS a modification key (N1) and MusicBed.volume is
  // NEVER set (N3 — template-controlled at 70% when a bed IS bound).
  assertEquals('MusicBed.source' in plan.modifications, true);
  assertEquals('MusicBed.volume' in plan.modifications, false);
});
Deno.test('plan: mods include both audio sources', () => {
  const plan = buildGovernedVideoStatPlan(okFields, LOGO, VOICE, BED);
  assertEquals(plan.modifications['VoiceAudio.source'], VOICE);
  assertEquals(plan.modifications['MusicBed.source'], BED);
});
// N1/N3 SETTLED (cc-0032, EMPTY_BED_TEST_RESULT R1/R2, 2026-07-10): Creatomate treats MusicBed.source:''
// as DISABLED (R1 = no audio stream) and volume:0 as a no-op (R2 ≡ R1); the baked Drifting Piano default
// plays ONLY if the key is OMITTED (R0). So the fail-closed silent bed = MusicBed.source PRESENT and
// EMPTY — never omit the key. Key presence is the guard.
Deno.test('plan: N1 — blank bed → MusicBed.source present + empty = silent (key presence is the guard)', () => {
  for (const blankBed of ['', '   ', null, undefined]) {
    const plan = buildGovernedVideoStatPlan(okFields, LOGO, VOICE, blankBed as string | null | undefined);
    assertEquals('MusicBed.source' in plan.modifications, true);   // key ALWAYS present (omitting it → baked default plays)
    assertEquals(plan.modifications['MusicBed.source'], '');       // empty string = disabled/silent (R1)
    assertEquals('MusicBed.volume' in plan.modifications, false);  // volume:0 is a no-op (R2); N3 template-controlled
    assertEquals(plan.modifications['VoiceAudio.source'], VOICE);
    assertEquals(plan.templateSpec.tmr.audio, { voiceover: true, music_bed: false });
  }
});
Deno.test('plan: blank voiceover throws b1_video_missing_voiceover (VO required)', () => {
  assertThrows(() => buildGovernedVideoStatPlan(okFields, LOGO, null, BED), Error, 'b1_video_missing_voiceover');
  assertThrows(() => buildGovernedVideoStatPlan(okFields, LOGO, '   ', BED), Error, 'b1_video_missing_voiceover');
  assertThrows(() => buildGovernedVideoStatPlan(okFields, LOGO, '', ''), Error, 'b1_video_missing_voiceover');
});
Deno.test('plan: templateSpec tmr audio evidence reflects bound bed', () => {
  const plan = buildGovernedVideoStatPlan(okFields, LOGO, VOICE, BED);
  assertEquals(plan.templateSpec.tmr.audio, { voiceover: true, music_bed: true });
});
Deno.test('plan: templateSpec carries label-independent tmr evidence (direct_bind)', () => {
  const plan = buildGovernedVideoStatPlan(okFields, LOGO, VOICE, BED);
  assertEquals(plan.templateSpec.provider, 'creatomate');
  assertEquals(plan.templateSpec.provider_template_id, B1_VIDEO_PROVIDER_TEMPLATE_ID);
  assertEquals(plan.templateSpec.variant_key, B1_VIDEO_VARIANT_KEY);
  assertEquals(plan.templateSpec.contract_ref, B1_VIDEO_CONTRACT_REF);
  assertEquals(plan.templateSpec.resolver_used, false);
  assertEquals(plan.templateSpec.fallback_taken, false);
  assertEquals(plan.templateSpec.tmr.bind_mode, 'direct_bind_pre_select_template');
  assertEquals(plan.templateSpec.tmr.provider_template_id, B1_VIDEO_PROVIDER_TEMPLATE_ID);
});
Deno.test('plan: missing governed logo throws (no wordmark fallback in governed video path)', () => {
  assertThrows(() => buildGovernedVideoStatPlan(okFields, null, VOICE, BED), Error, 'b1_video_missing_governed_logo');
  assertThrows(() => buildGovernedVideoStatPlan(okFields, '   ', VOICE, BED), Error, 'b1_video_missing_governed_logo');
});
Deno.test('plan: field gate runs first — blank field throws before logo/voice check', () => {
  assertThrows(() => buildGovernedVideoStatPlan({ ...okFields, statValue: '' }, null, null, null), Error, 'missing stat_value');
});
Deno.test('plan: label constant matches the seeded governance render_label', () => {
  assertEquals(B1_VIDEO_PRODUCTION_LABEL, 'creative_library_video_stat_production');
});

// ── narration composer (v3.6.0 D3 / N2) ───────────────────────────────────────────
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
  // does not double-punctuate when already terminal
  const n2 = composeGovernedVideoNarration({ ...okFields, contextLine: 'Big move!' });
  assertEquals(n2.endsWith('!'), true);
  assertEquals(n2.endsWith('!.'), false);
});
