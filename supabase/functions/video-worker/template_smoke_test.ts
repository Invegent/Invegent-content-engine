// template_smoke_test.ts — CREATIVE-LIBRARY-V0 GATE D2 hermetic tests.
// Fully hermetic: NO DB, NO network, NO Deno.serve, NO Creatomate. Exercises
// ./template_smoke.ts (+ ./qa.ts for the render_spec composition shape).
// Run: deno test supabase/functions/video-worker/template_smoke_test.ts

import { assert, assertEquals } from 'jsr:@std/assert@1';
import {
  SMOKE_TEMPLATE_NAME, SMOKE_PROVIDER_TEMPLATE_ID, SMOKE_RENDER_SPEC_LABEL,
  isSmokeRequest, buildSmokeModifications, buildTemplateRenderScript,
  computePropsHash, buildRenderSpecTemplate, composeRenderSpec,
} from './template_smoke.ts';
import { buildRenderQa, safeQa } from './qa.ts';

const BG = 'https://example.com/bg.jpg';
const LOGO = 'https://example.com/logo.png';

// (1) Template-mode body shape: template_id + modifications + mp4, no element tree.
Deno.test('renderScript is template-mode (template_id + modifications + mp4)', () => {
  const mods = buildSmokeModifications({ background_url: BG, logo_url: LOGO });
  const rs = buildTemplateRenderScript(mods) as any;
  assertEquals(rs.template_id, SMOKE_PROVIDER_TEMPLATE_ID);
  assertEquals(rs.template_id, 'bc32f52f-f9da-4749-90aa-03f7572f0719');
  assertEquals(rs.output_format, 'mp4');
  assertEquals(rs.modifications['CategoryBadge.text'], 'MARKET NEWS');
  assertEquals(rs.modifications['Headline.text'], 'Sydney median house price hits record $1.6M');
  assertEquals(rs.modifications['Footer.text'], 'propertypulse.com.au');
  assertEquals(rs.modifications['Background.source'], BG);
  assertEquals(rs.modifications['Logo.source'], LOGO);
  assertEquals('elements' in rs, false); // template mode, not script mode
});

// (2) props_hash determinism + change-on-input.
Deno.test('props_hash is deterministic and 64-hex', async () => {
  const h1 = await computePropsHash(buildSmokeModifications({ background_url: BG, logo_url: LOGO }));
  const h2 = await computePropsHash(buildSmokeModifications({ background_url: BG, logo_url: LOGO }));
  assertEquals(h1, h2);
  assertEquals(h1.length, 64);
  assert(/^[0-9a-f]{64}$/.test(h1));
});

Deno.test('props_hash changes when an asset URL changes', async () => {
  const a = await computePropsHash(buildSmokeModifications({ background_url: BG, logo_url: LOGO }));
  const b = await computePropsHash(buildSmokeModifications({ background_url: 'https://example.com/bg-2.jpg', logo_url: LOGO }));
  assert(a !== b);
});

// (3) render_spec carries BOTH qa and template (additive siblings) + label.
Deno.test('composeRenderSpec yields { label, qa, template } with both siblings', async () => {
  const mods = buildSmokeModifications({ background_url: BG, logo_url: LOGO });
  const props_hash = await computePropsHash(mods);
  const template = buildRenderSpecTemplate(props_hash);
  const qa = safeQa(() => buildRenderQa({
    expected_format: 'video_short_stat', engine: 'creatomate', render_mode: 'composition',
    duration_semantics: 'render_wallclock', dimension: '1080x1920', aspect: '9:16',
    status: 'succeeded', avatar_expected: false,
  }));
  const spec = composeRenderSpec(qa, { label: SMOKE_RENDER_SPEC_LABEL, template });
  assert('qa' in spec, 'qa sibling present');
  assert('template' in spec, 'template sibling present');
  assertEquals(spec.label, 'creative_library_video_smoke');
  assertEquals((spec.template as any).provider_template_id, 'bc32f52f-f9da-4749-90aa-03f7572f0719');
  assertEquals((spec.template as any).template_id, 'pp-news-centred-scrim-9x16-video');
  assertEquals((spec.template as any).props_hash, props_hash);
  assertEquals((spec.template as any).asset_ids.length, 0);
  assertEquals((spec.template as any).fallback_taken, false);
  assertEquals((spec.qa as any).render_mode, 'composition');
  assertEquals((spec.qa as any).aspect, '9:16');
});

// (4) Production-shape composeRenderSpec (no extras) is byte-identical to { qa }.
Deno.test('composeRenderSpec without extras returns exactly { qa } (production unchanged)', () => {
  const qa = safeQa(() => buildRenderQa({ engine: 'creatomate', status: 'succeeded' }));
  const spec = composeRenderSpec(qa);
  assertEquals(Object.keys(spec), ['qa']);
  assert(!('label' in spec));
  assert(!('template' in spec));
});

// (5) render_spec.template identity matches the Gate D2 required shape.
Deno.test('render_spec.template has the exact Gate D2 identity keys/values', async () => {
  const props_hash = await computePropsHash(buildSmokeModifications({ background_url: BG, logo_url: LOGO }));
  const t = buildRenderSpecTemplate(props_hash) as any;
  assertEquals(t.template_id, 'pp-news-centred-scrim-9x16-video');
  assertEquals(t.template_version, 'v1');
  assertEquals(t.template_family, 'property-pulse-news');
  assertEquals(t.template_variant, 'centred-scrim-9x16-video');
  assertEquals(t.provider, 'creatomate');
  assertEquals(t.provider_template_id, 'bc32f52f-f9da-4749-90aa-03f7572f0719');
  assertEquals(t.asset_ids.length, 0);
  assertEquals(t.fallback_taken, false);
});

// (6) Strict smoke gate: BOTH mode + exact template required.
Deno.test('isSmokeRequest gates strictly on mode + exact template', () => {
  assert(isSmokeRequest({ mode: 'template_smoke', template: 'PP_NEWS_CENTRED_SCRIM_9x16_VIDEO_v1' }));
  assert(!isSmokeRequest({ mode: 'template_smoke', template: 'PP_NEWS_CENTRED_SCRIM_16x9_v1' }));
  assert(!isSmokeRequest({ mode: 'template_smoke' }));
  assert(!isSmokeRequest({ template: 'PP_NEWS_CENTRED_SCRIM_9x16_VIDEO_v1' }));
  assert(!isSmokeRequest({}));
  assert(!isSmokeRequest(null));
  assertEquals(SMOKE_TEMPLATE_NAME, 'PP_NEWS_CENTRED_SCRIM_9x16_VIDEO_v1');
  assertEquals(SMOKE_RENDER_SPEC_LABEL, 'creative_library_video_smoke');
});
