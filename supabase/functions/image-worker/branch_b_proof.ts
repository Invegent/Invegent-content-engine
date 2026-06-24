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
//   - Field shape matches EXACTLY the 6 text keys buildManualModifications() consumes
//     (category/headline/subtitle/location/date/footer); governed asset URLs are
//     supplied separately by the resolver path, NOT here.

export const DRAFT_PROOF_MODE = 'creative_library_draft_proof';
export const DRAFT_PROOF_LABEL = 'creative_library_draft_proof';

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
export function buildProofFieldsFromDraft(
  draft: ProofDraftRow | null | undefined,
  today: Date = new Date(),
): { category: string; headline: string; subtitle: string; location: string; date: string; footer: string } {
  const headline = (draft?.image_headline ?? '').trim();
  if (!headline) {
    throw new Error('missing image_headline hard-gate field');
  }
  return {
    category: 'PROPERTY NEWS',
    headline,
    subtitle: '',
    location: '',
    date: formatProofDate(today),
    footer: 'propertypulse.com.au',
  };
}
