// branch_b_proof_test.ts — CREATIVE-LIBRARY BRANCH B / LANE B-PROOF hermetic tests.
// Fully hermetic: NO DB, NO network, NO Deno.serve, NO Creatomate. Pure-logic only —
// does NOT exercise the network/DB branch in index.ts. Exercises ./branch_b_proof.ts.
// Run: deno test supabase/functions/image-worker/branch_b_proof_test.ts

import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  DRAFT_PROOF_MODE, DRAFT_PROOF_LABEL,
  buildProofFieldsFromDraft, formatProofDate,
} from './branch_b_proof.ts';
import { buildManualModifications } from './manual_render.ts';

const FIXED = new Date(Date.UTC(2026, 5, 24)); // 24 June 2026 (month index 5 = June)

Deno.test('mode/label constants are the proof identity', () => {
  assertEquals(DRAFT_PROOF_MODE, 'creative_library_draft_proof');
  assertEquals(DRAFT_PROOF_LABEL, 'creative_library_draft_proof');
});

Deno.test('formatProofDate renders "D Month YYYY" (UTC, en month names)', () => {
  assertEquals(formatProofDate(new Date(Date.UTC(2026, 5, 24))), '24 June 2026');
  assertEquals(formatProofDate(new Date(Date.UTC(2026, 0, 1))), '1 January 2026');
  assertEquals(formatProofDate(new Date(Date.UTC(2025, 11, 31))), '31 December 2025');
});

Deno.test('buildProofFieldsFromDraft returns draft headline + deterministic defaults', () => {
  const f = buildProofFieldsFromDraft(
    { image_headline: 'Perth median rent climbs to record high', client_id: 'c1', recommended_format: 'image_quote' },
    FIXED,
  );
  assertEquals(f.headline, 'Perth median rent climbs to record high');
  assertEquals(f.category, 'PROPERTY NEWS');
  assertEquals(f.subtitle, '');
  assertEquals(f.location, '');
  assertEquals(f.date, '24 June 2026');
  assertEquals(f.footer, 'propertypulse.com.au');
});

Deno.test('buildProofFieldsFromDraft trims surrounding whitespace from headline', () => {
  const f = buildProofFieldsFromDraft(
    { image_headline: '   Spaced headline   ', client_id: null, recommended_format: 'image_quote' },
    FIXED,
  );
  assertEquals(f.headline, 'Spaced headline');
});

Deno.test('buildProofFieldsFromDraft is deterministic for a fixed date (same draft → same fields)', () => {
  const draft = { image_headline: 'Stable', client_id: 'c', recommended_format: 'image_quote' };
  assertEquals(buildProofFieldsFromDraft(draft, FIXED), buildProofFieldsFromDraft(draft, FIXED));
});

Deno.test('buildProofFieldsFromDraft fails loud on missing/blank/null image_headline', () => {
  const base = { client_id: 'c', recommended_format: 'image_quote' };
  assertThrows(() => buildProofFieldsFromDraft({ image_headline: null, ...base }, FIXED), Error, 'missing image_headline hard-gate field');
  assertThrows(() => buildProofFieldsFromDraft({ image_headline: '', ...base }, FIXED), Error, 'missing image_headline hard-gate field');
  assertThrows(() => buildProofFieldsFromDraft({ image_headline: '   ', ...base }, FIXED), Error, 'missing image_headline hard-gate field');
  assertThrows(() => buildProofFieldsFromDraft(null, FIXED), Error, 'missing image_headline hard-gate field');
  assertThrows(() => buildProofFieldsFromDraft(undefined, FIXED), Error, 'missing image_headline hard-gate field');
});

Deno.test('proof fields have EXACTLY the 6 keys buildManualModifications consumes', () => {
  const f = buildProofFieldsFromDraft(
    { image_headline: 'h', client_id: 'c', recommended_format: 'image_quote' },
    FIXED,
  );
  assertEquals(Object.keys(f).sort(), ['category', 'date', 'footer', 'headline', 'location', 'subtitle']);
  // Round-trip through the existing manual modifications builder: the proof fields map
  // cleanly onto the governed Creatomate text keys (governed URLs supplied separately).
  const mods = buildManualModifications({ fields: f, logoUrl: 'https://ex/logo.png', backgroundUrl: 'https://ex/bg.jpg' });
  assertEquals(mods['CategoryBadge.text'], 'PROPERTY NEWS');
  assertEquals(mods['Headline.text'], 'h');
  assertEquals(mods['Subtitle.text'], '');
  assertEquals(mods['Location.text'], '');
  assertEquals(mods['Date.text'], '24 June 2026');
  assertEquals(mods['Footer.text'], 'propertypulse.com.au');
  assertEquals(mods['Background.source'], 'https://ex/bg.jpg');
  assertEquals(mods['Logo.source'], 'https://ex/logo.png');
  assert(!('elements' in mods));
});
