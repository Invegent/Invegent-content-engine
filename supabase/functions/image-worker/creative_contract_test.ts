// creative_contract_test.ts — ACI Foundation v0 / Slice A2 (image-worker).
//
// Hermetic Deno tests for the vendored creative-contract projection + deterministic resolver.
// NO network/DB. Verifies the vendored snapshot matches registry v0.3 @ 2ac172b, the resolver
// gates on client_id (not slug), the no-drift consistency against b1_production.ts runtime
// constants, and the runtime-import guard (no live JSON / docs/creative-library import).

import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertExists,
} from 'jsr:@std/assert@1';

import {
  PP_IMAGE_QUOTE_NEWS_CARD_V1,
  resolveCreativeContract,
} from './creative_contract.ts';

import {
  B1_GOVERNED_CLIENT_ID,
  B1_GOVERNED_CLIENT_SLUG,
  B1_LOGO_KEY,
  B1_BACKGROUND_KEYS,
  B1_HEADLINE_MAX_CHARS,
  B1_SUBTITLE_MAX_CHARS,
} from './b1_production.ts';

const PP_CLIENT_ID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';

// Test 1 — PP client_id + 'image_quote' resolves to a non-null contract.
Deno.test('resolveCreativeContract: PP client_id + image_quote -> non-null', () => {
  const contract = resolveCreativeContract(PP_CLIENT_ID, 'image_quote');
  assertExists(contract);
  assertStrictEquals(contract, PP_IMAGE_QUOTE_NEWS_CARD_V1);
});

// Test 2 — PP client_id + other formats -> null.
Deno.test('resolveCreativeContract: PP client_id + non-image_quote formats -> null', () => {
  for (const fmt of ['carousel', 'text', 'video_short_avatar']) {
    assertEquals(
      resolveCreativeContract(PP_CLIENT_ID, fmt),
      null,
      `expected null for format ${fmt}`,
    );
  }
});

// Test 3 — non-PP client_id + 'image_quote' -> null.
Deno.test('resolveCreativeContract: non-PP client_id + image_quote -> null', () => {
  assertEquals(
    resolveCreativeContract('00000000-0000-0000-0000-000000000000', 'image_quote'),
    null,
  );
});

// Test 4 — contract identifiers exact.
Deno.test('contract identifiers exact', () => {
  assertEquals(PP_IMAGE_QUOTE_NEWS_CARD_V1.contract_key, 'property_pulse.image_quote.news_card.v1');
  assertEquals(PP_IMAGE_QUOTE_NEWS_CARD_V1.contract_ref, 'property_pulse.image_quote.news_card');
  assertEquals(PP_IMAGE_QUOTE_NEWS_CARD_V1.contract_version, 'v1');
});

// Test 5 — mapped variant / provider / template IDs exact.
Deno.test('maps_to_variant identifiers exact', () => {
  const v = PP_IMAGE_QUOTE_NEWS_CARD_V1.maps_to_variant;
  assertEquals(v.provider, 'creatomate');
  assertEquals(v.provider_template_id, 'fb9820f8-3fee-4448-b324-3d500fa74b40');
  assertEquals(v.implementation_id, 'news_static_centered_scrim_1x1_v1');
  assertEquals(v.template_family_key, 'property-pulse-news');
  assertEquals(v.template_variant_key, 'centred-scrim-1x1');
  assertEquals(v.runtime_render_spec_template_variant, 'centered-scrim-1x1');
});

// Test 6 — CONSISTENCY with b1_production.ts runtime constants (no-drift guard).
Deno.test('no-drift consistency with b1_production.ts runtime constants', () => {
  const c = PP_IMAGE_QUOTE_NEWS_CARD_V1;
  assertEquals(c.client_id, B1_GOVERNED_CLIENT_ID);
  assertEquals(c.client_slug, B1_GOVERNED_CLIENT_SLUG);
  assertEquals(c.fields.governed_assets.logo.asset_key, B1_LOGO_KEY);
  assertEquals(
    c.fields.governed_assets.background.asset_keys,
    Array.from(B1_BACKGROUND_KEYS),
  );

  const headline = c.fields.ai_authored.find((f) => f.field === 'headline');
  assertExists(headline);
  assertEquals(headline.max_chars, B1_HEADLINE_MAX_CHARS);

  const subtitle = c.fields.derived.find((f) => f.field === 'subtitle');
  assertExists(subtitle);
  assertEquals(subtitle.max_chars, B1_SUBTITLE_MAX_CHARS);
});

// Test 7 — runtime-import guard: no live JSON / docs/creative-library import in the module source.
// The mandated top-of-file provenance comment legitimately NAMES the declarative source of
// truth (docs/creative-library/property-pulse.json) in prose, so a naive whole-file substring
// match would be self-defeating. We instead strip comments first, then assert the *executable*
// source imports neither a .json specifier nor anything under docs/creative-library — i.e. no
// live registry read at runtime. (This preserves the spec's intent: no live JSON import.)
function stripComments(src: string): string {
  // Remove block comments, then line comments. Good enough for this hermetic guard.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

Deno.test('runtime-import guard: no live JSON / docs/creative-library import', async () => {
  const src = await Deno.readTextFile(new URL('./creative_contract.ts', import.meta.url));
  const code = stripComments(src);
  assert(
    !code.includes('docs/creative-library'),
    'executable source must not reference docs/creative-library',
  );
  assert(!code.includes('.json'), 'executable source must not import a .json source');
});

// Test 8 — source metadata.
Deno.test('source metadata exact', () => {
  const s = PP_IMAGE_QUOTE_NEWS_CARD_V1.source;
  assertEquals(s.registry_version, 'v0.3');
  assertEquals(s.source_commit, '2ac172b');
  assertExists(s.contract_ref);
  assertExists(s.contract_version);
});

// Test 9 — resolver determinism + default selector reason.
Deno.test('resolver determinism + selector_reason_default', () => {
  const a = resolveCreativeContract(PP_CLIENT_ID, 'image_quote');
  const b = resolveCreativeContract(PP_CLIENT_ID, 'image_quote');
  assertStrictEquals(a, b);
  assertEquals(PP_IMAGE_QUOTE_NEWS_CARD_V1.selector_reason_default, 'pp_image_quote_default');
});
