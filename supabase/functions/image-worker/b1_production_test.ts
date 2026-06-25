// b1_production_test.ts — CREATIVE-LIBRARY BRANCH B / LANE B1-v1 hermetic tests.
// Fully hermetic: NO DB, NO network, NO Deno.serve, NO Creatomate. Exercises
// ./b1_production.ts (the PP gate + asset contract + minimal headline hard-gate) and the
// governed evidence shape from ./manual_render.ts. Proves the governed path errors rather
// than yielding a legacy script when the resolver shorts (mapResolvedAssets throws).
// Run: deno test supabase/functions/image-worker/b1_production_test.ts

import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  B1_GOVERNED_CLIENT_SLUG, B1_LOGO_KEY, B1_BACKGROUND_KEY, B1_HEADLINE_MAX_CHARS,
  B1_PRODUCTION_LABEL, B1_ASSET_KEYS,
  isB1GovernedImageQuote, assertHeadlineWithinGate,
} from './b1_production.ts';
import {
  NEWS_STATIC_CENTERED_SCRIM_1x1, mapResolvedAssets, buildGovernedTemplateSpec,
} from './manual_render.ts';

const LOGO = { client_slug:'property-pulse', client_id:'4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', asset_id:'b7530c55-c320-43be-90d9-98c804694921', asset_key:'pp_logo_primary', asset_type:'logo_primary', asset_name:'Property Pulse primary logo', asset_url:'https://ex/logo.png', bucket:'brand-assets', source_path:'Property_Pulse/Logos/PP_logo_2.png', usage:'logo', location:null, approved:true, is_active:true };
const BG = { client_slug:'property-pulse', client_id:'4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', asset_id:'f9caed52-0859-4e22-91f6-7dc998485d77', asset_key:'bg_perth_cbd', asset_type:'other', asset_name:'Perth CBD suburbs background', asset_url:'https://ex/bg.jpg', bucket:'brand-assets', source_path:'Property_Pulse/Backgrounds/Perth_CBD_Suburbs.jpg', usage:'background', location:'Perth', approved:true, is_active:true };

// (1) PP chooses the governed branch.
Deno.test('B1-1: isB1GovernedImageQuote(property-pulse) === true', () => {
  assert(isB1GovernedImageQuote('property-pulse'));
  assertEquals(B1_GOVERNED_CLIENT_SLUG, 'property-pulse');
});

// (2)+(3) the fixed governed asset-key contract.
Deno.test('B1-2/3: B1_ASSET_KEYS pins pp_logo_primary + bg_perth_cbd', () => {
  assertEquals(B1_ASSET_KEYS.logo, 'pp_logo_primary');
  assertEquals(B1_ASSET_KEYS.background, 'bg_perth_cbd');
  assertEquals(B1_LOGO_KEY, 'pp_logo_primary');
  assertEquals(B1_BACKGROUND_KEY, 'bg_perth_cbd');
  assertEquals(B1_PRODUCTION_LABEL, 'creative_library_b1_production');
});

// (4) non-PP stays legacy.
Deno.test('B1-4: non-PP slugs stay legacy (governed gate === false)', () => {
  assert(!isB1GovernedImageQuote('ndis'));
  assert(!isB1GovernedImageQuote('invegent'));
  assert(!isB1GovernedImageQuote('property-pulse-v2'));
  assert(!isB1GovernedImageQuote(''));
  assert(!isB1GovernedImageQuote('Property-Pulse')); // case-sensitive — only the exact slug routes
});

// (5) minimal headline-length hard-gate: long throws BEFORE any Creatomate call; short passes; blank throws.
Deno.test('B1-5: assertHeadlineWithinGate — long throws, short passes, blank throws', () => {
  const tooLong = 'x'.repeat(B1_HEADLINE_MAX_CHARS + 1); // 91 chars
  assertEquals(tooLong.length, 91);
  const err = assertThrows(() => assertHeadlineWithinGate(tooLong), Error);
  assert(String(err).includes('exceeds B1_HEADLINE_MAX_CHARS=90'));
  assert(String(err).includes('headline length 91'));

  // boundary: exactly 90 passes; 89 passes.
  assertHeadlineWithinGate('y'.repeat(B1_HEADLINE_MAX_CHARS)); // no throw
  assertHeadlineWithinGate('Perth median house price hits new record this quarter'); // short, no throw

  // blank / whitespace-only / null → missing-headline throw.
  assertThrows(() => assertHeadlineWithinGate(''), Error, 'b1: missing image_headline');
  assertThrows(() => assertHeadlineWithinGate('   '), Error, 'b1: missing image_headline');
  assertThrows(() => assertHeadlineWithinGate(null), Error, 'b1: missing image_headline');

  // trims before measuring: a 90-char core padded with whitespace still passes.
  assertHeadlineWithinGate('   ' + 'z'.repeat(B1_HEADLINE_MAX_CHARS) + '   ');
});

// (6) resolver-failure-no-fallback: mapResolvedAssets THROWS on empty + on 1-row shortfall —
// proving the governed path errors rather than yielding a legacy script.
Deno.test('B1-6: resolver shortfall throws (no legacy fallback)', () => {
  assertThrows(() => mapResolvedAssets([], B1_ASSET_KEYS), Error, 'expected exactly 2 resolved assets, got 0');
  assertThrows(() => mapResolvedAssets([LOGO], B1_ASSET_KEYS), Error, 'expected exactly 2 resolved assets, got 1');
  // wrong-key shortfall (2 rows but missing the background key) also throws.
  assertThrows(() => mapResolvedAssets([LOGO, { ...LOGO, asset_id: 'dup', asset_key: 'pp_logo_secondary' }], B1_ASSET_KEYS), Error);
});

// Governed evidence shape for B1: the 1:1 impl carries the proven provider_template_id and
// resolver_used=true / fallback_taken=false.
Deno.test('B1-evidence: buildGovernedTemplateSpec(NEWS_STATIC_CENTERED_SCRIM_1x1) carries governed shape', () => {
  const mapped = mapResolvedAssets([LOGO, BG], B1_ASSET_KEYS);
  const spec = buildGovernedTemplateSpec(NEWS_STATIC_CENTERED_SCRIM_1x1, { propsHash: 'deadbeef', logo: mapped.logo, background: mapped.background });
  assertEquals(spec.provider_template_id, 'fb9820f8-3fee-4448-b324-3d500fa74b40');
  assertEquals(spec.resolver_used, true);
  assertEquals(spec.fallback_taken, false);
  assertEquals(spec.implementation_id, 'news_static_centered_scrim_1x1_v1');
  assertEquals(spec.asset_keys, ['pp_logo_primary', 'bg_perth_cbd']);
  assertEquals(spec.asset_ids, [LOGO.asset_id, BG.asset_id]);
  assertEquals(NEWS_STATIC_CENTERED_SCRIM_1x1.output_format, 'jpg');
});
