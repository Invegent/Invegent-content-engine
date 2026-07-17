// branch_b_proof.ts — CREATIVE-LIBRARY BRANCH B / LANE B-PROOF (image-worker).
//
// Pure helper module for the NON-PUBLISHING governed-render mechanism proof. Sources
// the render fields DETERMINISTICALLY from a REAL m.post_draft row (READ-ONLY) — no
// LLM, no network, no DB, no storage, no secret access here. The draft is consumed
// read-only by the caller; this module only shapes the fields.
//
// HARD INVARIANTS (enforced by the caller; restated here for the field-builder):
//   - The draft is READ-ONLY. This builder NEVER mutates the draft.
//   - Deterministic: same draft → same fields. NO LLM, NO randomness.
//   - The hard-gate field is image_headline — throws if missing/blank.
//   - Field shape is the 6 text keys (category/headline/subtitle/location/date/footer);
//     governed asset URLs are supplied separately by the resolver path, NOT here.
//
// LANE W TRIM (2026-07-05, image-worker v3.23.0): DRAFT_PROOF_MODE / DRAFT_PROOF_LABEL
// were removed with the retired creative_library_draft_proof branch (its only impls
// pinned deleted/repurposed provider templates — see
// docs/briefs/tmr-dead-reference-cleanup-plan-packet.md). buildProofFieldsFromDraft
// stays LIVE: the Option-D B1 TMR production branch in index.ts consumes it.
//
// TMR D6-5 (2026-07-17, image-worker v3.28.0) — BRAND-PAYLOAD DE-HARDCODE: the
// category/footer/location fields are NO LONGER PP literals baked into this builder. They
// are now sourced from the D6-3 governed contract registry via resolveCreativeContract
// (client_id + recommended_format → CreativeContract). Fail-CLOSED on an unresolved
// contract (throws brand_payload_contract_unresolved, replacing the old
// brand_payload_non_pp_fail_closed guard) and on an incomplete contract (missing
// category/footer → brand_payload_contract_incomplete). PP resolves byte-identically
// (its registry entry carries category='PROPERTY NEWS' / footer='propertypulse.com.au' /
// location=''). DELIBERATE CHANGE: the image RENDER path now imports resolveCreativeContract
// — previously it did NOT (only ai-worker's additive stamper did). Still no I/O: the
// resolver is a pure in-module registry lookup, and it is injectable purely for hermetic tests.

import { resolveCreativeContract, type CreativeContract } from './creative_contract.ts';

// Minimal read-only view of the post_draft columns the proof consumes.
export type ProofDraftRow = {
  image_headline: string | null;
  client_id: string | null;
  recommended_format: string | null;
};

// Deterministic "D Month YYYY" formatter (e.g. "24 June 2026"), en-AU month names.
// Defaults to today (UTC) but accepts an injectable date for hermetic tests.
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export function formatProofDate(d: Date = new Date()): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Build the deterministic proof fields from a READ-ONLY draft row.
// Throws (fail loud) when image_headline is missing/blank — it is the hard-gate field.
// `today` is injectable purely so tests are hermetic; production passes nothing.
// `resolve` is injectable purely for hermetic tests; production uses resolveCreativeContract.
export function buildProofFieldsFromDraft(
  draft: ProofDraftRow | null | undefined,
  today: Date = new Date(),
  resolve: (clientId: string, recommendedFormat: string) => CreativeContract | null = resolveCreativeContract,
): { category: string; headline: string; subtitle: string; location: string; date: string; footer: string } {
  // (1) Headline hard-gate FIRST — a missing-headline draft throws the headline error
  // regardless of client_id, so this MUST precede the contract resolution below.
  const headline = (draft?.image_headline ?? '').trim();
  if (!headline) {
    throw new Error('missing image_headline hard-gate field');
  }
  // (2) GOVERNED brand-payload read (TMR D6-5): category/footer/location are no longer PP
  // literals — they come from the D6-3 governed contract registry keyed on
  // (client_id, recommended_format). This FAILS CLOSED: an unresolved contract (unregistered
  // client, or a non-image_quote format) throws — no PP literal can leak onto a non-PP render.
  // This REPLACES the old brand_payload_non_pp_fail_closed guard. PP resolves to its real
  // contract → byte-identical output.
  const contract = resolve((draft?.client_id ?? ''), (draft?.recommended_format ?? ''));
  if (!contract) {
    throw new Error('brand_payload_contract_unresolved');
  }
  // (3) Read the renderer-fixed brand fields from the contract. category + footer are
  // REQUIRED (missing entry / undefined value → fail closed); location is OPTIONAL (→ '').
  const fixedValue = (name: string): string | undefined =>
    contract.fields.renderer_fixed.find((e) => e.field === name)?.value;
  const category = fixedValue('category');
  const footer = fixedValue('footer');
  if (category === undefined || footer === undefined) {
    throw new Error('brand_payload_contract_incomplete');
  }
  const location = fixedValue('location') ?? '';
  // (4) Emit the fixed 6-key field shape. date stays render-time via the injectable `today`
  // (the contract's renderer_fixed 'date' entry is a descriptive placeholder, not a literal).
  return {
    category,
    headline,
    subtitle: '',
    location,
    date: formatProofDate(today),
    footer,
  };
}
