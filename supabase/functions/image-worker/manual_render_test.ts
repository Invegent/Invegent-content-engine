// manual_render_test.ts — CREATIVE-LIBRARY-V0.1 LANE 3B hermetic tests.
// Fully hermetic: NO DB, NO network, NO Deno.serve, NO Creatomate. Exercises ./manual_render.ts.
// Run: deno test supabase/functions/image-worker/manual_render_test.ts

import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  MANUAL_RENDER_MODE, MANUAL_RENDER_LABEL, PP_NEWS_STATIC_16x9,
  isManualRenderRequest, mapResolvedAssets, buildManualModifications,
  computePropsHash, buildGovernedTemplateSpec,
} from './manual_render.ts';

const LOGO = { client_slug:'property-pulse', client_id:'4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', asset_id:'b7530c55-c320-43be-90d9-98c804694921', asset_key:'pp_logo_primary', asset_type:'logo_primary', asset_name:'Property Pulse primary logo', asset_url:'https://ex/logo.png', bucket:'brand-assets', source_path:'Property_Pulse/Logos/PP_logo_2.png', usage:'logo', location:null, approved:true, is_active:true };
const BG = { client_slug:'property-pulse', client_id:'4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', asset_id:'f9caed52-0859-4e22-91f6-7dc998485d77', asset_key:'bg_perth_cbd', asset_type:'other', asset_name:'Perth CBD suburbs background', asset_url:'https://ex/bg.jpg', bucket:'brand-assets', source_path:'Property_Pulse/Backgrounds/Perth_CBD_Suburbs.jpg', usage:'background', location:'Perth', approved:true, is_active:true };
const want = { logo:'pp_logo_primary', background:'bg_perth_cbd' };

Deno.test('isManualRenderRequest gates on exact mode', () => {
  assert(isManualRenderRequest({ mode: 'creative_library_manual_render' }));
  assert(!isManualRenderRequest({ mode: 'template_smoke' }));
  assert(!isManualRenderRequest({}));
  assert(!isManualRenderRequest(null));
  assertEquals(MANUAL_RENDER_MODE, 'creative_library_manual_render');
  assertEquals(MANUAL_RENDER_LABEL, 'creative_library_manual_governed_render');
});

Deno.test('mapResolvedAssets maps logo+background (order-independent)', () => {
  const m = mapResolvedAssets([BG, LOGO], want);
  assertEquals(m.logo.asset_id, 'b7530c55-c320-43be-90d9-98c804694921');
  assertEquals(m.background.asset_id, 'f9caed52-0859-4e22-91f6-7dc998485d77');
});

Deno.test('mapResolvedAssets fails loud on missing/extra/dup/non-approved/no-url/null', () => {
  assertThrows(() => mapResolvedAssets([LOGO], want));
  assertThrows(() => mapResolvedAssets([LOGO, BG, BG], want));
  assertThrows(() => mapResolvedAssets([LOGO, LOGO], want));
  assertThrows(() => mapResolvedAssets([LOGO, { ...BG, approved:false }], want));
  assertThrows(() => mapResolvedAssets([LOGO, { ...BG, is_active:false }], want));
  assertThrows(() => mapResolvedAssets([LOGO, { ...BG, asset_url:'' }], want));
  assertThrows(() => mapResolvedAssets([LOGO, { ...BG, asset_key:'other_key' }], want));
  assertThrows(() => mapResolvedAssets(null, want));
});

Deno.test('buildManualModifications maps fields + governed urls to 8 keys', () => {
  const mods = buildManualModifications({ fields: { category:'PROPERTY NEWS', headline:'Perth Market Update', subtitle:'Buyer demand remains steady across key suburbs', location:'Perth', date:'2026-06-22', footer:'Property Pulse' }, logoUrl: LOGO.asset_url, backgroundUrl: BG.asset_url });
  assertEquals(mods['CategoryBadge.text'], 'PROPERTY NEWS');
  assertEquals(mods['Headline.text'], 'Perth Market Update');
  assertEquals(mods['Subtitle.text'], 'Buyer demand remains steady across key suburbs');
  assertEquals(mods['Location.text'], 'Perth');
  assertEquals(mods['Date.text'], '2026-06-22');
  assertEquals(mods['Footer.text'], 'Property Pulse');
  assertEquals(mods['Background.source'], 'https://ex/bg.jpg');
  assertEquals(mods['Logo.source'], 'https://ex/logo.png');
  assertEquals('elements' in mods, false);
});

Deno.test('buildGovernedTemplateSpec records governed keys/ids + resolver_used + fallback_taken=false', async () => {
  const mods = buildManualModifications({ fields:{ headline:'x' }, logoUrl: LOGO.asset_url, backgroundUrl: BG.asset_url });
  const h = await computePropsHash(mods);
  const m = mapResolvedAssets([LOGO, BG], want);
  const t = buildGovernedTemplateSpec({ propsHash: h, logo: m.logo, background: m.background }) as any;
  assertEquals(t.implementation_id, 'pp_news_static_16x9_v1');
  assertEquals(t.creative_intent, 'pp_news');
  assertEquals(t.capability, 'static_news');
  assertEquals(t.provider, 'creatomate');
  assertEquals(t.provider_template_id, '48cba556-0a53-4001-90f0-05420d10efc0');
  assertEquals(t.template_id, 'pp-news-centred-scrim-16x9');
  assertEquals(t.asset_keys, ['pp_logo_primary', 'bg_perth_cbd']);
  assertEquals(t.asset_ids, ['b7530c55-c320-43be-90d9-98c804694921', 'f9caed52-0859-4e22-91f6-7dc998485d77']);
  assertEquals(t.resolver_used, true);
  assertEquals(t.fallback_taken, false);
  assertEquals(t.props_hash, h);
});

Deno.test('computePropsHash deterministic 64-hex; changes on input', async () => {
  const a = await computePropsHash({ 'Headline.text':'A', 'Logo.source':'u' });
  const b = await computePropsHash({ 'Headline.text':'A', 'Logo.source':'u' });
  const c = await computePropsHash({ 'Headline.text':'B', 'Logo.source':'u' });
  assertEquals(a, b);
  assert(a !== c);
  assertEquals(a.length, 64);
  assert(/^[0-9a-f]{64}$/.test(a));
});
