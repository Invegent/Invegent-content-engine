// smoke_field_merge.ts — pure helper for the cc-0089 follow-up #2 field-merge fix
// (mirrors supabase/functions/publisher/attempt_no.ts's nextAttemptNoFrom extraction
// pattern: a small, additive, directly-testable pure function pulled out of index.ts's
// HTTP handler so the bug fix can be hermetically unit-tested without spinning up a
// server or a Supabase client).
//
// THE BUG (found + traced 2026-07-31, cc-0089 follow-up #2): the governed_image_quote_smoke
// branch's buildTmrRenderPlan call built its fields object as
//   { ...smokeFields, subtitle: smokeSubtitle, cta: body?.fields?.cta, slide_number: body?.fields?.slide_number }
// `smokeFields` (from buildProofFieldsFromDraft) can now carry a contract-resolved `cta`
// (e.g. Property Pulse's PK-authored 'Explore the latest market update', added in v3.37.0).
// But `cta: body?.fields?.cta` sits AFTER `...smokeFields` in the SAME object literal, so
// when the caller's request body has no fields.cta, that key evaluates to `cta: undefined`
// and — because later keys win in a JS object literal — OVERWRITES smokeFields.cta with
// undefined, stomping the contract-resolved value back out. Identical defect for
// slide_number. This function is the fix: it merges the override ONLY when the caller
// explicitly supplied the field (`!== undefined`), mirroring the exact guard already used
// downstream in b1_production.ts's TMR_WINNER_TEXT_FIELDS map (`f.cta !== undefined ? … : {}`).
//
// STRICTLY OUT OF SCOPE: the production image_quote branch's own buildTmrRenderPlan call
// (`{ ...fields, subtitle }`, no cta/slide_number keys at all — untouched, byte-identical),
// buildTmrRenderPlan itself, creative_contract.ts, branch_b_proof.ts, select_template, any
// other client's contract, any migration, the publisher, deploy/apply (later PK gate).
export function mergeSmokeOverrideFields<
  Base extends Record<string, unknown>,
>(
  base: Base,
  overrides: { cta?: string; slide_number?: string },
): Base & { cta?: string; slide_number?: string } {
  return {
    ...base,
    ...(overrides.cta !== undefined ? { cta: overrides.cta } : {}),
    ...(overrides.slide_number !== undefined ? { slide_number: overrides.slide_number } : {}),
  };
}
