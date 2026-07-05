// manual_render.ts — LANE W TRIM (2026-07-05, image-worker v3.23.0).
//
// This module previously carried the CREATIVE-LIBRARY-V0.1 Lane 3B manual governed
// render surface: the PP_NEWS_STATIC_16x9 + NEWS_STATIC_CENTERED_SCRIM_1x1 governed
// implementation identities (GovernedImpl), MANUAL_RENDER_MODE/LABEL,
// isManualRenderRequest, ResolvedAsset, mapResolvedAssets, buildManualModifications
// and buildGovernedTemplateSpec. Those surfaces were RETIRED in Lane W
// (docs/briefs/tmr-dead-reference-cleanup-plan-packet.md): their provider templates
// were deleted (fb9820f8…) or paste-repurposed (48cba556… now renders the LIVE 1:1
// market-insight card), and the index.ts branches that consumed them are now explicit
// 410 guards. See git history (≤ v3.22.0) for the removed code.
//
// The ONE surviving export below is LIVE: the Option-D B1 TMR production branch in
// index.ts computes render_spec.template.props_hash with it. Pure — no side effects,
// no network/DB/storage/secret access.

export async function computePropsHash(modifications: Record<string, string>): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(modifications)));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
