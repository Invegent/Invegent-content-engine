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
import { B1_GOVERNED_CLIENT_ID, TMR_WINNER_TEXT_FIELDS } from './b1_production.ts';
import type { CreativeContract } from './creative_contract.ts';

const FIXED = new Date(Date.UTC(2026, 5, 24)); // 24 June 2026 (month index 5 = June)

Deno.test('formatProofDate renders "D Month YYYY" (UTC, en month names)', () => {
  assertEquals(formatProofDate(new Date(Date.UTC(2026, 5, 24))), '24 June 2026');
  assertEquals(formatProofDate(new Date(Date.UTC(2026, 0, 1))), '1 January 2026');
  assertEquals(formatProofDate(new Date(Date.UTC(2025, 11, 31))), '31 December 2025');
});

Deno.test('buildProofFieldsFromDraft returns draft headline + deterministic defaults', () => {
  const f = buildProofFieldsFromDraft(
    { image_headline: 'Perth median rent climbs to record high', client_id: B1_GOVERNED_CLIENT_ID, recommended_format: 'image_quote' },
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
    { image_headline: '   Spaced headline   ', client_id: B1_GOVERNED_CLIENT_ID, recommended_format: 'image_quote' },
    FIXED,
  );
  assertEquals(f.headline, 'Spaced headline');
});

Deno.test('buildProofFieldsFromDraft is deterministic for a fixed date (same draft → same fields)', () => {
  const draft = { image_headline: 'Stable', client_id: B1_GOVERNED_CLIENT_ID, recommended_format: 'image_quote' };
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

Deno.test('buildProofFieldsFromDraft fails CLOSED (contract_unresolved) for an unregistered client_id', () => {
  // A present headline passes the headline gate, so the governed brand-payload read
  // (TMR D6-5) is what must throw here — the REAL resolver returns null for these
  // unregistered client_ids, so no PP literal is producible for a non-PP client.
  const base = { image_headline: 'A valid headline', recommended_format: 'image_quote' };
  assertThrows(
    () => buildProofFieldsFromDraft({ ...base, client_id: '11111111-1111-1111-1111-111111111111' }, FIXED),
    Error,
    'brand_payload_contract_unresolved',
  );
  assertThrows(
    () => buildProofFieldsFromDraft({ ...base, client_id: null }, FIXED),
    Error,
    'brand_payload_contract_unresolved',
  );
  assertThrows(
    () => buildProofFieldsFromDraft({ ...base, client_id: '' }, FIXED),
    Error,
    'brand_payload_contract_unresolved',
  );
});

Deno.test('proof fields have EXACTLY the 6 text keys the B1 field consumer expects', () => {
  const f = buildProofFieldsFromDraft(
    { image_headline: 'h', client_id: B1_GOVERNED_CLIENT_ID, recommended_format: 'image_quote' },
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

// A minimal fake CreativeContract carrying only the renderer_fixed entries the builder reads.
// Cast through `unknown` because we deliberately omit the rest of the (large) contract shape —
// buildProofFieldsFromDraft only touches contract.fields.renderer_fixed.
function fakeContract(rendererFixed: ReadonlyArray<{ field: string; value: string }>): CreativeContract {
  return { fields: { renderer_fixed: rendererFixed } } as unknown as CreativeContract;
}

Deno.test('D6-5 non-PP populated profile (injected resolver): emits the governed brand fields, no PP leak', () => {
  const ndis = fakeContract([
    { field: 'category', value: 'DISABILITY NEWS' },
    { field: 'footer', value: 'ndisyarns.com.au' },
    { field: 'location', value: '' },
  ]);
  const f = buildProofFieldsFromDraft(
    { image_headline: 'x', client_id: '22222222-2222-2222-2222-222222222222', recommended_format: 'image_quote' },
    FIXED,
    () => ndis,
  );
  assertEquals(f.category, 'DISABILITY NEWS');
  assertEquals(f.footer, 'ndisyarns.com.au');
  assert(f.category !== 'PROPERTY NEWS');
  assert(f.footer !== 'propertypulse.com.au');

  // D7-C3: assert on the EMITTED modifications payload — compose the fields through the real
  // winner→text-field mapping and prove the governed values reach the render keys, PP-free.
  const emitted = TMR_WINNER_TEXT_FIELDS['generic_market_insight_card_1x1_v1'](f);
  assertEquals(emitted['CategoryBadge.text'], 'DISABILITY NEWS');
  assertEquals(emitted['Footer.text'], 'ndisyarns.com.au');
  for (const v of Object.values(emitted)) {
    assert(!v.includes('PROPERTY NEWS'), `emitted value leaked PP category: ${v}`);
    assert(!v.includes('propertypulse'), `emitted value leaked PP footer: ${v}`);
  }
});

Deno.test('D6-5 contract-incomplete fail-closed (injected resolver): missing footer throws', () => {
  const missingFooter = fakeContract([
    { field: 'category', value: 'DISABILITY NEWS' },
    { field: 'location', value: '' },
  ]);
  assertThrows(
    () => buildProofFieldsFromDraft(
      { image_headline: 'x', client_id: '22222222-2222-2222-2222-222222222222', recommended_format: 'image_quote' },
      FIXED,
      () => missingFooter,
    ),
    Error,
    'brand_payload_contract_incomplete',
  );
});

Deno.test('D7 N7b NDIS resolves-clean (REAL resolver): NDIS footer "NDIS Yarns" (D7 fold-in); empty location/subtitle resolve clean', () => {
  // Uses the DEFAULT (real) resolver — proves NDIS is registered end-to-end via
  // resolveCreativeContract. cc-0040 D7 fold-in: the NDIS footer is now 'NDIS Yarns'.
  // The `=== undefined` completeness guard still treats empty-string fields (location '',
  // subtitle '') as RESOLVED (present-but-empty), not missing.
  const NDIS_CLIENT_ID = 'fb98a472-ae4d-432d-8738-2273231c1ef4';
  const f = buildProofFieldsFromDraft(
    { image_headline: 'Test headline', client_id: NDIS_CLIENT_ID, recommended_format: 'image_quote' },
    new Date('2026-07-18T00:00:00Z'),
  );
  assertEquals(f, {
    category: 'NDIS UPDATE',
    footer: 'NDIS Yarns',
    location: '',
    headline: 'Test headline',
    subtitle: '',
    date: '18 July 2026',
  });
});

Deno.test('D6-5 headline-gate precedence: missing headline + unregistered client throws the HEADLINE error', () => {
  // The headline hard-gate must run BEFORE contract resolution: a null-headline draft for an
  // unregistered client throws the headline error, NOT brand_payload_contract_unresolved.
  assertThrows(
    () => buildProofFieldsFromDraft(
      { image_headline: null, client_id: 'unregistered', recommended_format: 'image_quote' },
      FIXED,
    ),
    Error,
    'missing image_headline hard-gate field',
  );
});
