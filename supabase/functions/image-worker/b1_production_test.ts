// b1_production_test.ts — CREATIVE-LIBRARY BRANCH B / LANE B1-v1 hermetic tests.
// Fully hermetic: NO DB, NO network, NO Deno.serve, NO Creatomate. Exercises
// ./b1_production.ts (the PP gate + asset contract + minimal headline hard-gate) and the
// governed evidence shape from ./manual_render.ts. Proves the governed path errors rather
// than yielding a legacy script when the resolver shorts (mapResolvedAssets throws).
// Run: deno test supabase/functions/image-worker/b1_production_test.ts

import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  B1_GOVERNED_CLIENT_ID, B1_GOVERNED_CLIENT_SLUG, B1_LOGO_KEY, B1_BACKGROUND_KEY,
  B1_BACKGROUND_KEYS, B1_HEADLINE_MAX_CHARS, B1_PRODUCTION_LABEL, B1_ASSET_KEYS,
  B1_SUBTITLE_MAX_CHARS, isB1GovernedImageQuote, assertHeadlineWithinGate,
  selectB1BackgroundKey, deriveB1Subtitle,
} from './b1_production.ts';
import {
  NEWS_STATIC_CENTERED_SCRIM_1x1, mapResolvedAssets, buildGovernedTemplateSpec,
} from './manual_render.ts';

const LOGO = { client_slug:'property-pulse', client_id:'4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', asset_id:'b7530c55-c320-43be-90d9-98c804694921', asset_key:'pp_logo_primary', asset_type:'logo_primary', asset_name:'Property Pulse primary logo', asset_url:'https://ex/logo.png', bucket:'brand-assets', source_path:'Property_Pulse/Logos/PP_logo_2.png', usage:'logo', location:null, approved:true, is_active:true };
const BG = { client_slug:'property-pulse', client_id:'4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', asset_id:'f9caed52-0859-4e22-91f6-7dc998485d77', asset_key:'bg_perth_cbd', asset_type:'other', asset_name:'Perth CBD suburbs background', asset_url:'https://ex/bg.jpg', bucket:'brand-assets', source_path:'Property_Pulse/Backgrounds/Perth_CBD_Suburbs.jpg', usage:'background', location:'Perth', approved:true, is_active:true };

// (1) PP client_id fires the governed branch (the gate keys on client_id, NOT slug).
Deno.test('B1-1: isB1GovernedImageQuote(B1_GOVERNED_CLIENT_ID) === true', () => {
  assert(isB1GovernedImageQuote(B1_GOVERNED_CLIENT_ID));
  assertEquals(B1_GOVERNED_CLIENT_ID, '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd');
});

// (2) UUID-fallback regression: the gate is client_id-based, so it fires on the PP client_id
// REGARDLESS of what slug getBrandAndSlug returns. The v3.14.0 defect was gating on the slug,
// which getBrandAndSlug returns as the client-id UUID when c.client.client_slug is null — that
// made the slug gate false. Now the loop passes the resolved client_id straight to the gate, so
// a UUID-as-slug from getBrandAndSlug can no longer affect routing: the SAME PP client_id value
// is exactly what the gate matches. We assert the gate fires on the client_id and that the
// (now unused-for-gating) slug constant is the canonical slug, not the UUID.
Deno.test('B1-2: client_id gate is immune to the getBrandAndSlug UUID-slug fallback', () => {
  // The loop calls isB1GovernedImageQuote(clientId) — clientId is the PP client_id.
  assert(isB1GovernedImageQuote(B1_GOVERNED_CLIENT_ID));
  // The canonical slug constant (passed to the resolver/path) is the slug, never the UUID.
  assert((B1_GOVERNED_CLIENT_SLUG as string) !== (B1_GOVERNED_CLIENT_ID as string));
  assertEquals(B1_GOVERNED_CLIENT_SLUG, 'property-pulse');
});

// (3) Resolver receives 'property-pulse' (the canonical slug constant the governed branch
// passes to resolve_brand_assets), not a UUID; client_id is the gate identity.
Deno.test('B1-3: governed branch sends canonical slug to resolver; asset contract pinned', () => {
  assertEquals(B1_GOVERNED_CLIENT_SLUG, 'property-pulse');
  assertEquals(B1_GOVERNED_CLIENT_ID, '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd');
  assertEquals(B1_ASSET_KEYS.logo, 'pp_logo_primary');
  assertEquals(B1_ASSET_KEYS.background, 'bg_perth_cbd');
  assertEquals(B1_LOGO_KEY, 'pp_logo_primary');
  assertEquals(B1_BACKGROUND_KEY, 'bg_perth_cbd');
  assertEquals(B1_PRODUCTION_LABEL, 'creative_library_b1_production');
});

// (4) non-PP stays legacy, and a slug string is NOT the client_id → does not trigger governed
// (proves the gate is id-based, not slug-based).
Deno.test('B1-4: non-PP client_ids stay legacy; slug strings never trigger the gate', () => {
  assert(!isB1GovernedImageQuote('11111111-2222-3333-4444-555555555555')); // some other client UUID
  assert(!isB1GovernedImageQuote('property-pulse')); // a slug string is NOT the client_id
  assert(!isB1GovernedImageQuote('ndis'));
  assert(!isB1GovernedImageQuote('invegent'));
  assert(!isB1GovernedImageQuote(''));
  assert(!isB1GovernedImageQuote('4036A6B5-B4A3-406E-998D-C2FE14A8BBDD')); // case-sensitive — only the exact id
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

// ── B1-v2: deterministic background rotation (selectB1BackgroundKey) ─────────────
// A small fixed set of UUID-shaped sample ids used across the rotation tests.
const SAMPLE_IDS = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-000000000000',
  'edf01c52-0000-4000-8000-000000000000',
  'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
];

// (v2-1) Determinism: the SAME id yields the SAME key across many repeated calls.
Deno.test('B1-v2-1: selectB1BackgroundKey is deterministic (same id → same key, repeated)', () => {
  for (const id of SAMPLE_IDS) {
    const first = selectB1BackgroundKey(id);
    for (let i = 0; i < 1000; i++) {
      assertEquals(selectB1BackgroundKey(id), first);
    }
  }
});

// (v2-2) Membership: output is ALWAYS one of the 5 governed background keys.
// B1-v3 (2026-07-04): pool 3→5, aligned to the governed resolver rank order (PK Option A).
Deno.test('B1-v2-2: selectB1BackgroundKey output is always a member of B1_BACKGROUND_KEYS', () => {
  assertEquals(B1_BACKGROUND_KEYS as readonly string[], ['bg_perth_cbd', 'bg_sydney_cbd', 'bg_brisbane_cbd', 'bg_pp_au_suburb_aerial_grid', 'bg_pp_home_keys_contract_table']);
  for (let i = 0; i < 2000; i++) {
    const id = `id-${i}-${(i * 2654435761 >>> 0).toString(16)}-${i}`;
    assert((B1_BACKGROUND_KEYS as readonly string[]).includes(selectB1BackgroundKey(id)));
  }
});

// (v2-3) Distribution coverage: over ≥300 distinct ids, every one of the 5 keys appears.
Deno.test('B1-v2-3: selectB1BackgroundKey covers all 5 keys over ≥300 distinct ids', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 500; i++) {
    seen.add(selectB1BackgroundKey(`distinct-${i}-${(i * 40503 >>> 0).toString(16)}`));
  }
  assertEquals(seen.size, 5);
  for (const k of B1_BACKGROUND_KEYS) assert(seen.has(k), `expected key ${k} to be selected at least once`);
});

// (v2-4) Stability pins: fixed UUID literals locked to their COMPUTED key. These cover
// all 5 keys and lock the FNV-1a hash against accidental change. If the hash, the key
// order, or the modulo ever changes, these break. Re-pinned for B1-v3 (pool 3→5, mod 5,
// resolver-rank order — PK 2026-07-04): the SAME hash over the SAME seed now lands on
// different keys because both the modulus and the array changed; all pins below were
// RECOMPUTED by running selectB1BackgroundKey, not hand-derived.
Deno.test('B1-v2-4: selectB1BackgroundKey stability pins (locks the FNV-1a hash)', () => {
  assertEquals(selectB1BackgroundKey('11111111-1111-4111-8111-111111111111'), 'bg_pp_home_keys_contract_table');
  assertEquals(selectB1BackgroundKey('22222222-2222-4222-8222-222222222222'), 'bg_pp_home_keys_contract_table');
  assertEquals(selectB1BackgroundKey('44444444-4444-4444-8444-000000000000'), 'bg_pp_home_keys_contract_table');
  // B1-v3 additions so EVERY key in the 5-key pool is pinned by at least one fixed literal:
  assertEquals(selectB1BackgroundKey('99999999-9999-4999-8999-999999999999'), 'bg_perth_cbd');
  assertEquals(selectB1BackgroundKey('88888888-8888-4888-8888-888888888888'), 'bg_sydney_cbd');
  assertEquals(selectB1BackgroundKey('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'), 'bg_brisbane_cbd');
  assertEquals(selectB1BackgroundKey('55555555-5555-4555-8555-555555555555'), 'bg_pp_au_suburb_aerial_grid');
});

// (v2-5) Back-compat: the v1 fixed default constant remains index 0 of the rotation set.
Deno.test('B1-v2-5: B1_BACKGROUND_KEY stays bg_perth_cbd (rotation-set index 0); logo key fixed', () => {
  assertEquals(B1_BACKGROUND_KEY, 'bg_perth_cbd');
  assertEquals(B1_BACKGROUND_KEYS[0], 'bg_perth_cbd');
  assertEquals(B1_LOGO_KEY, 'pp_logo_primary');
  // B1_ASSET_KEYS still pins the v1 default background (back-compat surface unchanged).
  assertEquals(B1_ASSET_KEYS.background, 'bg_perth_cbd');
});

// ── B1-v2: governed subtitle derived from draft_body (deriveB1Subtitle) ──────────
// Pure / hermetic. The subtitle is DERIVED + OPTIONAL (unlike the headline hard-gate):
// empty/whitespace/absent body → ''; an over-length first paragraph is TRUNCATED.

// (v2-sub-1) empty / null / undefined / whitespace-only body → '' (no subtitle; proceeds).
Deno.test('B1-v2-sub-1: empty/null/undefined/whitespace body → empty subtitle', () => {
  assertEquals(deriveB1Subtitle(''), '');
  assertEquals(deriveB1Subtitle(null), '');
  assertEquals(deriveB1Subtitle(undefined), '');
  assertEquals(deriveB1Subtitle('   '), '');
  assertEquals(deriveB1Subtitle('\n\n   \n\n'), '');
  assertEquals(deriveB1Subtitle('\t  \r\n  \t'), '');
});

// (v2-sub-2) single short paragraph (≤ max) → returned verbatim (trimmed).
Deno.test('B1-v2-sub-2: short single paragraph returned verbatim', () => {
  const body = 'Perth median house price hits a new record this quarter.';
  assert(body.length <= B1_SUBTITLE_MAX_CHARS);
  assertEquals(deriveB1Subtitle(body), body);
  // surrounding whitespace is trimmed off the paragraph.
  assertEquals(deriveB1Subtitle('   ' + body + '   '), body);
});

// (v2-sub-3) single long paragraph (> max) → truncated: ends with '…', length ≤ max,
// and NOT cut mid-word (char before '…' is a whole-word char; no trailing space/punct).
Deno.test('B1-v2-sub-3: long single paragraph is truncated word-boundary + ellipsis', () => {
  const body = 'Perth median house prices have climbed sharply across every inner-city suburb this quarter according to the latest figures released today.';
  assert(body.length > B1_SUBTITLE_MAX_CHARS);
  const out = deriveB1Subtitle(body);
  assert(out.endsWith('…'), `expected trailing ellipsis, got: ${out}`);
  assert(out.length <= B1_SUBTITLE_MAX_CHARS, `length ${out.length} must be ≤ ${B1_SUBTITLE_MAX_CHARS}`);
  // the char immediately before the ellipsis is NOT a space or trailing punctuation.
  const beforeEllipsis = out.slice(0, -1);
  assert(!/[\s.,;:!?-]$/.test(beforeEllipsis), `must not end on space/punct before '…': ${out}`);
  // not cut mid-word: the truncated head is a whole-word prefix of the original body.
  assert(body.startsWith(beforeEllipsis), 'truncated head must be a prefix of the body');
  assert(body[beforeEllipsis.length] === ' ' || beforeEllipsis === body.slice(0, beforeEllipsis.length),
    'the truncation boundary is a word boundary');
});

// (v2-sub-4) multi-paragraph body → only the FIRST non-empty paragraph is used; a string
// that appears ONLY in a later paragraph must be absent from the subtitle.
Deno.test('B1-v2-sub-4: only the first non-empty paragraph is used', () => {
  const body = 'First paragraph headline sentence.\n\nSECOND_PARA_MARKER should never appear.\n\nThird para too.';
  const out = deriveB1Subtitle(body);
  assertEquals(out, 'First paragraph headline sentence.');
  assert(!out.includes('SECOND_PARA_MARKER'));
  assert(!out.includes('Third'));
});

// (v2-sub-5) leading blank / whitespace-only paragraphs then real text → first NON-EMPTY.
Deno.test('B1-v2-sub-5: skips leading blank/whitespace-only paragraphs', () => {
  const body = '\n\n   \n\n   \n\nReal first paragraph here.\n\nLater paragraph.';
  assertEquals(deriveB1Subtitle(body), 'Real first paragraph here.');
});

// (v2-sub-6) \r\n (and lone \r) line endings are normalized before paragraph splitting.
Deno.test('B1-v2-sub-6: CRLF / CR line endings are normalized', () => {
  const crlf = 'First CRLF paragraph.\r\n\r\nSecond CRLF paragraph marker.';
  assertEquals(deriveB1Subtitle(crlf), 'First CRLF paragraph.');
  const cr = 'First CR paragraph.\r\rSecond CR paragraph marker.';
  assertEquals(deriveB1Subtitle(cr), 'First CR paragraph.');
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
