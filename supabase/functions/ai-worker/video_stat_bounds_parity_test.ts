// video_stat_bounds_parity_test.ts — one-source-of-truth guard for the vendored governed
// video_short_stat character bounds.
//
// TEST-ONLY cross-dir import: this file imports the four canonical constants from
// ../video-worker/b1_video_stat.ts ONLY to compare them against the ai-worker vendored copy in
// ./video_stat_bounds.ts. Tests are NOT deployed, so this does NOT violate the no cross-function
// RUNTIME-import house rule — no production ai-worker path imports anything under ../video-worker.
// (Same sanctioned pattern as creative_contract_parity_test.ts.) If any pair diverges, the
// vendored bounds have drifted from the render gate's authority and must be re-synced.

import { assertEquals } from 'jsr:@std/assert@1';

import {
  B1_VIDEO_CONTEXT_LINE_MAX_CHARS as AI_CONTEXT_LINE,
  B1_VIDEO_CTA_TEXT_MAX_CHARS as AI_CTA_TEXT,
  B1_VIDEO_STAT_LABEL_MAX_CHARS as AI_STAT_LABEL,
  B1_VIDEO_STAT_VALUE_MAX_CHARS as AI_STAT_VALUE,
} from './video_stat_bounds.ts';

import {
  B1_VIDEO_CONTEXT_LINE_MAX_CHARS as CANON_CONTEXT_LINE,
  B1_VIDEO_CTA_TEXT_MAX_CHARS as CANON_CTA_TEXT,
  B1_VIDEO_STAT_LABEL_MAX_CHARS as CANON_STAT_LABEL,
  B1_VIDEO_STAT_VALUE_MAX_CHARS as CANON_STAT_VALUE,
} from '../video-worker/b1_video_stat.ts';

Deno.test('parity: B1_VIDEO_STAT_VALUE_MAX_CHARS equal (vendored == canonical)', () => {
  assertEquals(AI_STAT_VALUE, CANON_STAT_VALUE);
});

Deno.test('parity: B1_VIDEO_STAT_LABEL_MAX_CHARS equal (vendored == canonical)', () => {
  assertEquals(AI_STAT_LABEL, CANON_STAT_LABEL);
});

Deno.test('parity: B1_VIDEO_CONTEXT_LINE_MAX_CHARS equal (vendored == canonical)', () => {
  assertEquals(AI_CONTEXT_LINE, CANON_CONTEXT_LINE);
});

Deno.test('parity: B1_VIDEO_CTA_TEXT_MAX_CHARS equal (vendored == canonical)', () => {
  assertEquals(AI_CTA_TEXT, CANON_CTA_TEXT);
});
