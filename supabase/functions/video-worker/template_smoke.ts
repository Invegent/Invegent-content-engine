// template_smoke.ts — LANE W TRIM (2026-07-05, video-worker v3.4.0).
//
// This module previously carried the CREATIVE-LIBRARY-V0 Gate D2 manual-only video
// template smoke surface: SMOKE_TEMPLATE_NAME ('PP_NEWS_CENTRED_SCRIM_9x16_VIDEO_v1'),
// SMOKE_PROVIDER_TEMPLATE_ID (bc32f52f…), SMOKE_RENDER_SPEC_LABEL, isSmokeRequest,
// buildSmokeModifications, buildTemplateRenderScript, computePropsHash and
// buildRenderSpecTemplate. That surface was RETIRED in Lane W
// (docs/briefs/tmr-dead-reference-cleanup-plan-packet.md, candidate C3): the provider
// template bc32f52f… was deleted provider-side, and the index.ts smoke branch is now
// an explicit 410 guard. See git history (≤ v3.3.1) for the removed code.
//
// The ONE surviving export below is LIVE PRODUCTION code: renderUploadAndLog composes
// every render_spec through it (4 call sites — success + catch log, ×2 QA shapes).
// Pure — no side effects, no network/DB/storage/secret access.

// Additive render_spec composer. Production callers pass no extras -> { qa }
// (byte-identical to the prior inline literal). The extras path ({ label, qa,
// template }) is retained for signature stability; no live caller supplies extras
// since the smoke branch was retired.
export function composeRenderSpec(
  qa: Record<string, unknown>,
  extra?: { label?: string | null; template?: Record<string, unknown> | null },
): Record<string, unknown> {
  const spec: Record<string, unknown> = {};
  if (extra?.label) spec.label = extra.label;
  spec.qa = qa;
  if (extra?.template) spec.template = extra.template;
  return spec;
}
