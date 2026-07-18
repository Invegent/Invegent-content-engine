// format_output_schema_test.ts — cc-0040 Step 2 hermetic tests for buildFormatOutputSchema.
// Fully hermetic: NO DB, NO network, NO Deno.serve (index.ts guards its listener behind
// `if (import.meta.main)`, so importing it here does NOT start the server). Exercises the
// pure prompt-schema builder: the image-bearing formats now carry a ≤~60-CHARACTER budget for
// image_headline (not the old "10-15 word pull quote"), while retaining the advisor
// Starting-point seed; text / video_short_stat still emit an empty-string image_headline.
// Run: deno test --allow-read --allow-env supabase/functions/ai-worker/format_output_schema_test.ts

import { assert, assertStringIncludes } from 'jsr:@std/assert@1';
import { buildFormatOutputSchema } from './index.ts';

// The 4 image-bearing formats whose schema requests a real image_headline pull-quote line
// (source of truth: buildFormatOutputSchema's `needsImage` list).
const IMAGE_BEARING_FORMATS = ['image_quote', 'carousel', 'animated_text_reveal', 'animated_data'];
const SEED = 'Perth median house price hits new record this quarter';

// (1) every image-bearing format: ≤~60-char budget present, Starting-point seed retained,
// and the legacy "10-15 word" framing is GONE.
Deno.test('cc-0040 Step 2: image-bearing formats carry the ≤~60-char image_headline budget + seed, no "10-15 word"', () => {
  for (const fmt of IMAGE_BEARING_FORMATS) {
    const schema = buildFormatOutputSchema(fmt, SEED);
    assertStringIncludes(schema, '≤ ~60 characters', `${fmt}: must state the ≤~60 character budget`);
    assertStringIncludes(schema, `Starting point: "${SEED}"`, `${fmt}: must retain the advisor seed`);
    assert(!schema.includes('10-15 word'), `${fmt}: must NOT contain the legacy "10-15 word" framing`);
    assert(!schema.includes('pull quote for the visual overlay'), `${fmt}: legacy pull-quote phrasing removed`);
  }
});

// (2) text and video_short_stat still yield an empty-string image_headline instruction
// (no image overlay authored for these formats) — unchanged behaviour.
Deno.test('cc-0040 Step 2: text / video_short_stat still request image_headline: empty string', () => {
  for (const fmt of ['text', 'video_short_stat']) {
    const schema = buildFormatOutputSchema(fmt, SEED);
    assertStringIncludes(schema, '- image_headline: empty string', `${fmt}: must request an empty image_headline`);
    // and the char-budget line does NOT appear for these formats.
    assert(!schema.includes('≤ ~60 characters'), `${fmt}: must not carry the image_headline char budget`);
    assert(!schema.includes(`Starting point: "${SEED}"`), `${fmt}: must not carry the advisor seed`);
  }
});
