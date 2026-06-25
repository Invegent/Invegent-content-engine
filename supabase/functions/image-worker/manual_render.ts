// manual_render.ts — CREATIVE-LIBRARY-V0.1 LANE 3B (image-worker) manual governed render.
//
// Pure helper module: validates the governed-asset resolver output, maps the resolved
// assets to logo/background, builds the Creatomate template-mode modifications from
// PK-supplied fields + RESOLVED governed asset URLs, computes the deterministic
// props_hash, and builds the render_spec.template GOVERNED evidence (asset_keys +
// asset_ids + resolver_used + fallback_taken). NO side effects: no Deno.serve, no
// network/DB/storage/secret access. Governed-only — there is NO raw-URL fallback; any
// resolver shortfall throws so the caller fails loud.

export const MANUAL_RENDER_MODE = 'creative_library_manual_render';
export const MANUAL_RENDER_LABEL = 'creative_library_manual_governed_render';

// Shared SHAPE for a registry-pinned governed implementation identity. Both the proven
// 16:9 PP implementation and the new brand-agnostic 1:1 implementation conform to this
// one type so they cannot drift apart structurally.
export type GovernedImpl = {
  implementation_id: string;
  template_name: string;
  template_id: string;
  template_version: string;
  template_family: string;
  template_variant: string;
  creative_intent: string;
  capability: string;
  provider: string;
  provider_template_id: string;
  ice_format_key: string;
  output_format: string;
};

// Registry-pinned identity for the proven 16:9 PP implementation (Lane 3B / B-Proof).
export const PP_NEWS_STATIC_16x9: GovernedImpl = {
  implementation_id: 'pp_news_static_16x9_v1',
  template_name: 'PP_NEWS_CENTRED_SCRIM_16x9_v1',
  template_id: 'pp-news-centred-scrim-16x9',
  template_version: 'v1',
  template_family: 'property-pulse-news',
  template_variant: 'centred-scrim-16x9',
  creative_intent: 'pp_news',
  capability: 'static_news',
  provider: 'creatomate',
  provider_template_id: '48cba556-0a53-4001-90f0-05420d10efc0',
  ice_format_key: 'image_quote',
  output_format: 'jpg',
} as const;

// Branch B / Lane B0: NEW brand-agnostic 1:1 governed identity. The layout is reusable —
// brand identity (logo, background, text) arrives via the existing 8 modification inputs;
// nothing PP-specific is baked into this identity (family/intent are generic). PP is the
// pilot proof brand only. Provider template + output format authored/supplied by PK.
export const NEWS_STATIC_CENTERED_SCRIM_1x1: GovernedImpl = {
  implementation_id: 'news_static_centered_scrim_1x1_v1',
  template_name: 'news_static_centered_scrim_1x1_v1',
  template_id: 'news_static_centered_scrim_1x1_v1',
  template_version: 'v1',
  template_family: 'news-static',          // generic — NOT brand-scoped, NOT property-pulse-news
  template_variant: 'centered-scrim-1x1',
  creative_intent: 'news_static',          // generic — NOT pp_news
  capability: 'static_news',
  provider: 'creatomate',
  provider_template_id: 'fb9820f8-3fee-4448-b324-3d500fa74b40',
  ice_format_key: 'image_quote',
  output_format: 'jpg',                     // Creatomate token; storage mime image/jpeg
} as const;

export type ResolvedAsset = {
  client_slug: string; client_id: string; asset_id: string; asset_key: string;
  asset_type: string; asset_name: string; asset_url: string;
  bucket: string | null; source_path: string | null;
  usage: string | null; location: string | null; approved: boolean; is_active: boolean;
};

// Strict gate.
export function isManualRenderRequest(body: any): boolean {
  return body?.mode === MANUAL_RENDER_MODE;
}

// Validate the resolver returned EXACTLY the two requested keys (approved+active, with
// a URL) and map them to {logo, background}. Fail loud on any
// missing/wrong/duplicate/extra/non-approved/url-less row. NO fallback.
export function mapResolvedAssets(
  resolved: ResolvedAsset[] | null | undefined,
  wanted: { logo: string; background: string },
): { logo: ResolvedAsset; background: ResolvedAsset } {
  const rows = Array.isArray(resolved) ? resolved : [];
  if (rows.length !== 2) {
    throw new Error(`governed_resolution: expected exactly 2 resolved assets, got ${rows.length}`);
  }
  const byKey = new Map<string, ResolvedAsset>();
  for (const r of rows) {
    if (!r || !r.asset_key) throw new Error('governed_resolution: row without asset_key');
    if (byKey.has(r.asset_key)) throw new Error(`governed_resolution: duplicate asset_key=${r.asset_key}`);
    if (r.approved !== true || r.is_active !== true) throw new Error(`governed_resolution: non-approved/inactive asset_key=${r.asset_key}`);
    if (!r.asset_url) throw new Error(`governed_resolution: asset_key=${r.asset_key} has no asset_url`);
    byKey.set(r.asset_key, r);
  }
  const logo = byKey.get(wanted.logo);
  const background = byKey.get(wanted.background);
  if (!logo) throw new Error(`governed_resolution: logo asset_key=${wanted.logo} not resolved`);
  if (!background) throw new Error(`governed_resolution: background asset_key=${wanted.background} not resolved`);
  return { logo, background };
}

// Build the 8 Creatomate modification keys from PK fields + resolved governed URLs.
export function buildManualModifications(opts: {
  fields: Record<string, string> | null | undefined;
  logoUrl: string; backgroundUrl: string;
}): Record<string, string> {
  const f = opts.fields ?? {};
  return {
    'CategoryBadge.text': f.category ?? '',
    'Headline.text': f.headline ?? '',
    'Subtitle.text': f.subtitle ?? '',
    'Location.text': f.location ?? '',
    'Date.text': f.date ?? '',
    'Footer.text': f.footer ?? '',
    'Background.source': opts.backgroundUrl,
    'Logo.source': opts.logoUrl,
  };
}

export async function computePropsHash(modifications: Record<string, string>): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(modifications)));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// render_spec.template GOVERNED evidence (Lane 3B shape).
// The governed implementation identity is supplied by the caller (parametrized in B0 so
// the same builder serves both PP_NEWS_STATIC_16x9 and NEWS_STATIC_CENTERED_SCRIM_1x1);
// the body is otherwise identical to the proven 16:9 path.
export function buildGovernedTemplateSpec(impl: GovernedImpl, opts: {
  propsHash: string; logo: ResolvedAsset; background: ResolvedAsset;
}): Record<string, unknown> {
  const t = impl;
  return {
    implementation_id: t.implementation_id,
    template_id: t.template_id,
    template_version: t.template_version,
    template_family: t.template_family,
    template_variant: t.template_variant,
    creative_intent: t.creative_intent,
    capability: t.capability,
    provider: t.provider,
    provider_template_id: t.provider_template_id,
    props_hash: opts.propsHash,
    asset_keys: [opts.logo.asset_key, opts.background.asset_key],
    asset_ids: [opts.logo.asset_id, opts.background.asset_id],
    resolver_used: true,
    fallback_taken: false,
  };
}
