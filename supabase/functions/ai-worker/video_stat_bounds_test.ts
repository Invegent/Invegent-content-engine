// video_stat_bounds_test.ts — hermetic, PURE unit tests for the vendored governed
// video_short_stat bounds validator + re-prompt builder. No network, no DB, no Date/random.
//
// Both directions: a conformant script yields [], and every over-bound case yields exactly one
// violation for the right field with the exact measured length + max. The headline fixture is
// cc-0038 B4's own 133-char cta_text padding literal (byte-identical to
// _harness/cc0038_b4_proof/B4_1_write.sql) — the one input already proven to trip the render
// gate — so this test proves the producer-side validator measures IDENTICALLY to the gate.

import { assertEquals } from 'jsr:@std/assert@1';
import {
  B1_VIDEO_CONTEXT_LINE_MAX_CHARS,
  B1_VIDEO_CTA_TEXT_MAX_CHARS,
  B1_VIDEO_STAT_LABEL_MAX_CHARS,
  B1_VIDEO_STAT_VALUE_MAX_CHARS,
  buildBoundReminder,
  validateStatScriptBounds,
} from './video_stat_bounds.ts';

// cc-0038 B4 gate-trip padding literal — copied VERBATIM from _harness/cc0038_b4_proof/B4_1_write.sql.
// The 👇 (U+1F447) is one emoji = 2 UTF-16 code units, so String.length yields 133 (NOT the 131
// codepoints Postgres length() would count) — this is the render gate's measurement.
const CC0038_B4_CTA_133 =
  'Are you watching the Perth market? Drop your thoughts below 👇 [cc-0038 B4 gate-trip padding to exceed the 90-char CtaText hard gate]';

// A fully conformant governed stat script (every field within its bound).
const CONFORMANT = {
  stat_value: '$62.17/hr',
  stat_label: 'Median Perth rental yield',
  context_line: 'Perth rents climbed again this quarter, tightening an already-scarce market.',
  cta_text: 'What does this mean for your next move?',
};

Deno.test('validate: conformant stat script returns no violations', () => {
  assertEquals(validateStatScriptBounds(CONFORMANT), []);
});

Deno.test('validate: measurement guard — the cc-0038 B4 133-char literal measures 133 UTF-16 units', () => {
  // If this ever differs from 133 the producer validator would enforce a different bound than
  // the render gate (which measures the same String.length) — a measurement mismatch. Fail loud.
  assertEquals(CC0038_B4_CTA_133.length, 133);
  assertEquals(CC0038_B4_CTA_133.trim().length, 133);
});

Deno.test('validate: cc-0038 B4 over-length cta_text → exactly one cta_text violation (133 > 90)', () => {
  const violations = validateStatScriptBounds({ ...CONFORMANT, cta_text: CC0038_B4_CTA_133 });
  assertEquals(violations, [{ field: 'cta_text', length: 133, max: B1_VIDEO_CTA_TEXT_MAX_CHARS }]);
});

Deno.test('validate: over-length stat_value → exactly one stat_value violation', () => {
  const over = 'X'.repeat(B1_VIDEO_STAT_VALUE_MAX_CHARS + 1); // 13
  const violations = validateStatScriptBounds({ ...CONFORMANT, stat_value: over });
  assertEquals(violations, [{ field: 'stat_value', length: 13, max: B1_VIDEO_STAT_VALUE_MAX_CHARS }]);
});

Deno.test('validate: over-length stat_label → exactly one stat_label violation', () => {
  const over = 'y'.repeat(B1_VIDEO_STAT_LABEL_MAX_CHARS + 5); // 53
  const violations = validateStatScriptBounds({ ...CONFORMANT, stat_label: over });
  assertEquals(violations, [{ field: 'stat_label', length: 53, max: B1_VIDEO_STAT_LABEL_MAX_CHARS }]);
});

Deno.test('validate: over-length context_line → exactly one context_line violation', () => {
  const over = 'z'.repeat(B1_VIDEO_CONTEXT_LINE_MAX_CHARS + 2); // 162
  const violations = validateStatScriptBounds({ ...CONFORMANT, context_line: over });
  assertEquals(violations, [{ field: 'context_line', length: 162, max: B1_VIDEO_CONTEXT_LINE_MAX_CHARS }]);
});

Deno.test('validate: a field exactly at its max is conformant (strictly-greater boundary)', () => {
  const exact = 'q'.repeat(B1_VIDEO_CTA_TEXT_MAX_CHARS); // 90
  assertEquals(validateStatScriptBounds({ ...CONFORMANT, cta_text: exact }), []);
});

Deno.test('validate: multiple over-length fields → one violation each', () => {
  const violations = validateStatScriptBounds({
    stat_value: 'X'.repeat(20),
    stat_label: CONFORMANT.stat_label,
    context_line: CONFORMANT.context_line,
    cta_text: CC0038_B4_CTA_133,
  });
  assertEquals(violations, [
    { field: 'stat_value', length: 20, max: B1_VIDEO_STAT_VALUE_MAX_CHARS },
    { field: 'cta_text', length: 133, max: B1_VIDEO_CTA_TEXT_MAX_CHARS },
  ]);
});

Deno.test('validate: blank fields are NOT length violations (render gate owns blanks)', () => {
  assertEquals(validateStatScriptBounds({ stat_value: '', stat_label: '   ', cta_text: undefined }), []);
});

Deno.test('buildBoundReminder: names the violated field, its length, and its max', () => {
  const reminder = buildBoundReminder([{ field: 'cta_text', length: 133, max: 90 }]);
  assertEquals(reminder.includes('cta_text was 133 chars (max 90)'), true);
  assertEquals(reminder.includes('cta_text max 90'), true);
  assertEquals(reminder.includes('Return ONLY the JSON.'), true);
});

Deno.test('buildBoundReminder: deterministic — same input yields the same string', () => {
  const v = [{ field: 'cta_text', length: 133, max: 90 }, { field: 'stat_value', length: 20, max: 12 }];
  assertEquals(buildBoundReminder(v), buildBoundReminder(v));
});
