// branch_b_proof_test.ts — hermetic tests for ./branch_b_proof.ts.
// Fully hermetic: NO DB, NO network, NO Deno.serve, NO Creatomate. Pure-logic only.
//
// LANE W TRIM (2026-07-05, image-worker v3.23.0): the DRAFT_PROOF_MODE/LABEL constants
// test and the buildManualModifications round-trip were removed with the retired
// draft-proof/manual surfaces — see git history (≤ v3.22.0). buildProofFieldsFromDraft
// + formatProofDate stay LIVE (Option-D B1 TMR production branch) and keep coverage.
// Run: deno test supabase/functions/image-worker/branch_b_proof_test.ts

import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1';
import { buildProofFieldsFromDraft, formatProofDate } from './branch_b_proof.ts';

const FIXED = new Date(Date.UTC(2026, 5, 24)); // 24 June 2026 (month index 5 = June)

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

Deno.test('proof fields have EXACTLY the 6 text keys the B1 field consumer expects', () => {
  const f = buildProofFieldsFromDraft(
    { image_headline: 'h', client_id: 'c', recommended_format: 'image_quote' },
    FIXED,
  );
  assertEquals(Object.keys(f).sort(), ['category', 'date', 'footer', 'headline', 'location', 'subtitle']);
  assertEquals(f.category, 'PROPERTY NEWS');
  assertEquals(f.headline, 'h');
  assertEquals(f.subtitle, '');
  assertEquals(f.location, '');
  assertEquals(f.date, '24 June 2026');
  assertEquals(f.footer, 'propertypulse.com.au');
  assert(!('elements' in f));
});
