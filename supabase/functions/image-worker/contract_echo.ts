// contract_echo.ts — ACI Foundation v0 / Slice B2 (image-worker).
//
// Pure, side-effect-free helper that ECHOES the four creative-contract identity fields
// (written by ai-worker Slice B1 under m.post_draft.draft_format.contract) into the
// render_spec recorded to m.post_render_log, for the governed PP image_quote branch ONLY.
//
// EVIDENCE-ONLY. This is NOT validation and NOT fail-loud: a missing, null, non-object,
// or malformed contract is a SAFE NO-OP (render_spec returned UNCHANGED). Validation /
// fail-loud is Slice C — never throw here.
//
// PURE: no Date/crypto/network/DB/storage; no mutation of the input. Returns the SAME
// renderSpec reference when there is nothing to echo, otherwise a NEW object.
//
// SAFE POLICY — echo ONLY IF draftFormat.contract is a non-null object AND all FOUR of
// these are present as NON-EMPTY strings: variant_key, contract_ref, contract_version,
// selector_reason. Echo ONLY those four (top-level on render_spec). Do NOT copy
// registry_version / source_commit / resolved_at.

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

export function echoContractToRenderSpec(
  renderSpec: Record<string, unknown>,
  draftFormat: unknown,
): Record<string, unknown> {
  const contract = (draftFormat as any)?.contract;
  if (contract === null || typeof contract !== 'object') {
    return renderSpec; // absent / null / not an object → unchanged
  }
  const variant_key = (contract as any).variant_key;
  const contract_ref = (contract as any).contract_ref;
  const contract_version = (contract as any).contract_version;
  const selector_reason = (contract as any).selector_reason;
  if (
    !isNonEmptyString(variant_key) ||
    !isNonEmptyString(contract_ref) ||
    !isNonEmptyString(contract_version) ||
    !isNonEmptyString(selector_reason)
  ) {
    return renderSpec; // any of the four missing / non-string / empty → unchanged
  }
  // Valid: echo exactly the four identity fields onto a NEW object. Base fields preserved.
  return { ...renderSpec, variant_key, contract_ref, contract_version, selector_reason };
}
