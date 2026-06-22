// template_smoke.ts — CREATIVE-LIBRARY-V0 GATE D2 (video template-mode smoke).
//
// Pure helper module for the manual-only video template smoke. NO side effects:
// no Deno.serve, no network/DB/storage call, no secret access. It only builds
// the Creatomate template-mode render body, the deterministic props_hash, the
// render_spec.template identity object, the strict smoke-gate predicate, and the
// additive render_spec composer. Mirrors the PROVEN image-worker Gate C template
// shape ({ template_id, modifications, output_format }); video output is 'mp4'.
//
// True Creative Library identity lives in render_spec.template (NOT in the
// governed ice_format_key label 'video_short_stat', which is a telemetry label
// only). composeRenderSpec keeps the production render_spec byte-identical: with
// no label/template extras it returns exactly { qa } as before; the smoke branch
// is the only caller that supplies label + template.

export const SMOKE_TEMPLATE_NAME = 'PP_NEWS_CENTRED_SCRIM_9x16_VIDEO_v1';
export const SMOKE_PROVIDER_TEMPLATE_ID = 'bc32f52f-f9da-4749-90aa-03f7572f0719';
export const SMOKE_RENDER_SPEC_LABEL = 'creative_library_video_smoke';

export type SmokeBodyInput = { background_url?: string | null; logo_url?: string | null };

// Strict smoke gate: BOTH the mode and the exact template name must match.
export function isSmokeRequest(body: any): boolean {
  return body?.mode === 'template_smoke' && body?.template === SMOKE_TEMPLATE_NAME;
}

// Fixed Gate D2 approved smoke copy (text modifications).
const SMOKE_TEXT: Record<string, string> = {
  'CategoryBadge.text': 'MARKET NEWS',
  'Headline.text': 'Sydney median house price hits record $1.6M',
  'Subtitle.text': 'Auction clearance rates climb for a third straight week',
  'Location.text': 'Sydney, NSW',
  'Date.text': '21 June 2026',
  'Footer.text': 'propertypulse.com.au',
};

// Build the full modifications map (fixed text + the two body-supplied asset URLs).
export function buildSmokeModifications(body: SmokeBodyInput): Record<string, string | null> {
  return {
    ...SMOKE_TEXT,
    'Background.source': body.background_url ?? null,
    'Logo.source': body.logo_url ?? null,
  };
}

// Template-mode render body. Matches image-worker Gate C shape; output mp4.
export function buildTemplateRenderScript(modifications: Record<string, string | null>): object {
  return { template_id: SMOKE_PROVIDER_TEMPLATE_ID, modifications, output_format: 'mp4' };
}

// Deterministic SHA-256 hex over the modifications JSON. Same input => same hash.
export async function computePropsHash(modifications: Record<string, string | null>): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(modifications)));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// render_spec.template identity object (Gate D2 required shape).
export function buildRenderSpecTemplate(propsHash: string): Record<string, unknown> {
  return {
    template_id: 'pp-news-centred-scrim-9x16-video',
    template_version: 'v1',
    template_family: 'property-pulse-news',
    template_variant: 'centred-scrim-9x16-video',
    provider: 'creatomate',
    provider_template_id: SMOKE_PROVIDER_TEMPLATE_ID,
    props_hash: propsHash,
    asset_ids: [],
    fallback_taken: false,
  };
}

// Additive render_spec composer. Production callers pass no extras -> { qa }
// (byte-identical to the prior inline literal). The smoke branch supplies label
// + template, yielding { label, qa, template } as sibling keys.
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
