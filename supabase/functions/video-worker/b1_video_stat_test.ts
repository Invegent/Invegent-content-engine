// Hermetic unit tests for the governed PP video_short_stat pure helpers (v3.5.0).
// Run: deno test supabase/functions/video-worker/b1_video_stat_test.ts
// Pure module — no env, no network, no DB, no side effects.
import { assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  isB1GovernedVideoStat,
  assertStatFieldsWithinGate,
  buildGovernedVideoStatPlan,
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

// ── plan builder ────────────────────────────────────────────────────────────────
Deno.test('plan: direct-binds provider template id + 5 modifications (Background baked, not present)', () => {
  const plan = buildGovernedVideoStatPlan(okFields, LOGO);
  assertEquals(plan.providerTemplateId, B1_VIDEO_PROVIDER_TEMPLATE_ID);
  assertEquals(plan.modifications, {
    'StatValue': '$782K',
    'StatLabel': 'Perth median house price',
    'ContextLine': 'Up 3.7% over the past quarter.',
    'CtaText': 'What does this mean for you?',
    'Logo.source': LOGO,
  });
  // Background is BAKED — must NOT be a modification key.
  assertEquals(Object.keys(plan.modifications).some((k) => k.startsWith('Background')), false);
});
Deno.test('plan: templateSpec carries label-independent tmr evidence (direct_bind)', () => {
  const plan = buildGovernedVideoStatPlan(okFields, LOGO);
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
  assertThrows(() => buildGovernedVideoStatPlan(okFields, null), Error, 'b1_video_missing_governed_logo');
  assertThrows(() => buildGovernedVideoStatPlan(okFields, '   '), Error, 'b1_video_missing_governed_logo');
});
Deno.test('plan: field gate runs first — blank field throws before logo check', () => {
  assertThrows(() => buildGovernedVideoStatPlan({ ...okFields, statValue: '' }, null), Error, 'missing stat_value');
});
Deno.test('plan: label constant matches the seeded governance render_label', () => {
  assertEquals(B1_VIDEO_PRODUCTION_LABEL, 'creative_library_video_stat_production');
});
