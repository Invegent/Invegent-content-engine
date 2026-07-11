// Hermetic unit tests for geo_pairing (C1 step 3: copy-geography derivation + pairing gate).
// Run: deno test supabase/functions/image-worker/geo_pairing_test.ts
// Pure module: no network, no DB, no stubs required.
//
// Fixtures marked [PROD] are REAL production headlines read from m.post_draft on 2026-07-10,
// not invented examples. The famous "Perth median house price hits new record this quarter"
// is NOT production copy — it is a test fixture in b1_production_test.ts. That mistake is the
// reason these tests use measured strings.
import { assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  copyGeoFromHeadline,
  assertGeoPairingWithinGate,
  type AssetGeoScope,
} from './geo_pairing.ts';

const scopesOf = (h: string) => copyGeoFromHeadline(h).scopes;

// ─────────────────────────────────────────────────────────────────────────────────────
// Derivation
// ─────────────────────────────────────────────────────────────────────────────────────

Deno.test('empty / null / whitespace headline claims nothing', () => {
  assertEquals(copyGeoFromHeadline('').scopes, []);
  assertEquals(copyGeoFromHeadline(null).scopes, []);
  assertEquals(copyGeoFromHeadline(undefined).scopes, []);
  assertEquals(copyGeoFromHeadline('   ').scopes, []);
});

Deno.test('[PROD] ~83% of copy names no place at all', () => {
  assertEquals(scopesOf('Rates move markets short term. Jobs determine which markets win.'), []);
  assertEquals(scopesOf('It is not interest rates — it is the jobs behind the buyers'), []);
  assertEquals(
    scopesOf('12.5 trillion in property, 2.5 trillion in debt — the numbers beneath the headlines'),
    [],
  );
  assertEquals(scopesOf('Small business costs falling — what that means for property investors'), []);
});

Deno.test('[PROD] single capital', () => {
  assertEquals(scopesOf('Perth rents climb as vacancy stays tight'), ['au_wa_perth']);
  assertEquals(scopesOf('Brisbane median hits $1.1M — up 85% in five years'), ['au_qld']);
  assertEquals(
    scopesOf('Rental vacancy in parts of Adelaide is so tight the data is almost hard to believe'),
    ['au_sa'],
  );
});

Deno.test('[PROD] copy geography is a SET — multi-city headlines exist', () => {
  // This is why a scalar copy_geo column would have been wrong on contact with production.
  assertEquals(
    scopesOf('Perth up 7.3% this quarter. Melbourne down 0.9%. Same country, very different markets.'),
    ['au_vic', 'au_wa_perth'],
  );
  assertEquals(
    scopesOf('Perth up 7.3% this quarter — Sydney and Melbourne both fell'),
    ['au_nsw', 'au_vic', 'au_wa_perth'],
  );
  assertEquals(
    scopesOf('Brisbane was 37% cheaper than Melbourne. Now it has overtaken it.'),
    ['au_qld', 'au_vic'],
  );
});

Deno.test('[PROD] national copy → au_generic', () => {
  assertEquals(scopesOf('No rental in Australia is affordable for someone on Youth Allowance'), [
    'au_generic',
  ]);
  assertEquals(scopesOf('Gen Z is 50% more likely to rentvest than the average Australian'), [
    'au_generic',
  ]);
  assertEquals(scopesOf("Australia's biggest bank stress-testing for three rate hikes in one year"), [
    'au_generic',
  ]);
});

Deno.test('abbreviations are uppercase-only (WA is also Washington)', () => {
  assertEquals(scopesOf('WA vacancy tightens'), ['au_wa_perth']);
  assertEquals(scopesOf('NSW and QLD diverge'), ['au_nsw', 'au_qld']);
  // lowercase / embedded must NOT match
  assertEquals(scopesOf('we saw a wa-like pattern'), []);
  assertEquals(scopesOf('the software was slow'), []);
  assertEquals(scopesOf('Swan River wattle'), []);
});

Deno.test('word boundaries: no substring matches', () => {
  assertEquals(scopesOf('Perthshire is in Scotland'), []); // \bperth\b must not fire on "Perthshire"
  assertEquals(scopesOf('victorian terrace homes'), []); // \bvictoria\b must not fire on "victorian"
  assertEquals(scopesOf('Australiana collectibles'), []); // \baustralias?\b must not fire
});

Deno.test('KNOWN OVER-MATCH: a place word used as a proper noun still claims that place', () => {
  // "Victoria Street" is a street; "Perth" is also a person's name. The gazetteer cannot tell.
  // Over-matching fails CLOSED (it invents a claim, so a mismatched asset throws) — noisy but
  // safe. Under-matching fails OPEN (see the unknown-place test), which is the dangerous side.
  // Recorded as behaviour, not fixed: disambiguation needs context this module does not have.
  assertEquals(scopesOf('Victoria Street auction draws a crowd'), ['au_vic']);
});

Deno.test('deduplicates repeated mentions, output is sorted', () => {
  const g = copyGeoFromHeadline('Perth and Perth again, plus Brisbane');
  assertEquals(g.scopes, ['au_qld', 'au_wa_perth']);
});

Deno.test('matches carry evidence tokens (for render_spec, never for the assert)', () => {
  const g = copyGeoFromHeadline('Brisbane median hits $1.1M');
  assertEquals(g.matches.length, 1);
  assertEquals(g.matches[0].scope, 'au_qld');
  assertEquals(g.matches[0].token.toLowerCase(), 'brisbane');
});

Deno.test('FAILS OPEN on places the lexicon does not know — the documented hole', () => {
  // A suburb, a colloquialism, an overseas city. None are known; none produce a claim.
  assertEquals(scopesOf('Fremantle rents climb'), []);
  assertEquals(scopesOf('the western suburbs are tightening'), []);
  assertEquals(scopesOf('São Paulo apartment yields'), []);
  // => each of these would pair with a non_au background. This is why step 5 ships warn-only
  //    and why non_au assets stay fenced.
});

// ─────────────────────────────────────────────────────────────────────────────────────
// Pairing gate
// ─────────────────────────────────────────────────────────────────────────────────────

const NO_CLAIM = copyGeoFromHeadline('Rates move markets short term.');
const PERTH = copyGeoFromHeadline('Perth rents climb as vacancy stays tight');
const BRISBANE = copyGeoFromHeadline('Brisbane median hits $1.1M');
const NATIONAL = copyGeoFromHeadline('No rental in Australia is affordable');
const PERTH_AND_MELB = copyGeoFromHeadline('Perth up 7.3%. Melbourne down 0.9%.');

Deno.test('assets making no claim always pass', () => {
  for (const asset of ['none', 'unidentified'] as AssetGeoScope[]) {
    assertGeoPairingWithinGate(PERTH, asset);
    assertGeoPairingWithinGate(BRISBANE, asset);
    assertGeoPairingWithinGate(NO_CLAIM, asset);
  }
});

Deno.test('copy making no claim pairs with anything — including non_au', () => {
  for (const asset of ['au_wa_perth', 'au_nsw', 'au_qld', 'au_generic', 'non_au'] as AssetGeoScope[]) {
    assertGeoPairingWithinGate(NO_CLAIM, asset);
  }
});

Deno.test('non_au throws under ANY place claim — the São Paulo case', () => {
  assertThrows(
    () => assertGeoPairingWithinGate(PERTH, 'non_au', { assetKey: 'bg_pp_city_skyline_vantage' }),
    Error,
    'non-Australian background',
  );
  assertThrows(() => assertGeoPairingWithinGate(NATIONAL, 'non_au'), Error, 'non-Australian');
});

Deno.test('au_generic pairs with any Australian claim, INCLUDING Perth (PK ratified)', () => {
  assertGeoPairingWithinGate(PERTH, 'au_generic');
  assertGeoPairingWithinGate(BRISBANE, 'au_generic');
  assertGeoPairingWithinGate(NATIONAL, 'au_generic');
});

Deno.test('place-specific asset passes iff the copy names that place', () => {
  assertGeoPairingWithinGate(PERTH, 'au_wa_perth');
  assertGeoPairingWithinGate(BRISBANE, 'au_qld');
  // multi-city copy licenses either
  assertGeoPairingWithinGate(PERTH_AND_MELB, 'au_wa_perth');
});

Deno.test('au_nsw under a Perth headline throws — Sydney IS somewhere else', () => {
  assertThrows(
    () => assertGeoPairingWithinGate(PERTH, 'au_nsw', { assetKey: 'bg_sydney_cbd' }),
    Error,
    'contradicts copy',
  );
});

Deno.test('the broll case: au_nsw B-roll must never sit under a Perth headline', () => {
  assertThrows(
    () => assertGeoPairingWithinGate(PERTH, 'au_nsw', { assetKey: 'broll_pp_au_suburb_aerial' }),
    Error,
    'contradicts copy',
  );
  // ...but it is fine under national copy? NO — see next test. Recorded here to prevent a
  // future reader assuming symmetry.
});

Deno.test('RELAXED POLICY (PK ratified): national-ONLY copy licenses any AU city', () => {
  // "No rental in Australia is affordable" over a Perth skyline: a photo illustrating a national
  // stat does not assert the stat is Perth-specific. PK ratified 2026-07-10.
  assertGeoPairingWithinGate(NATIONAL, 'au_wa_perth');
  assertGeoPairingWithinGate(NATIONAL, 'au_qld');
  assertGeoPairingWithinGate(NATIONAL, 'au_nsw');
  // non_au is NOT licensed by national copy — "Australia" is still a place claim.
  assertThrows(() => assertGeoPairingWithinGate(NATIONAL, 'non_au'), Error, 'non-Australian');
});

Deno.test('RELAXED POLICY does NOT launder a city contradiction via a national mention', () => {
  // "Brisbane leads Australia" claims BOTH au_qld and au_generic. The copy names Brisbane, so a
  // Perth background is still a mismatch. If the `claims.length === 1` guard were dropped, any
  // mention of "Australia" would turn every city contradiction into a pass. This is the test
  // that catches that regression.
  const mixed = copyGeoFromHeadline('Brisbane leads Australia on five-year growth');
  assertEquals(mixed.scopes, ['au_generic', 'au_qld']);
  assertThrows(
    () => assertGeoPairingWithinGate(mixed, 'au_wa_perth', { assetKey: 'bg_perth_cbd' }),
    Error,
    'contradicts copy',
  );
  // the correctly-scoped asset still passes
  assertGeoPairingWithinGate(mixed, 'au_qld');
});

Deno.test('other-city copy still throws — the relaxation changed nothing here', () => {
  assertThrows(() => assertGeoPairingWithinGate(BRISBANE, 'au_wa_perth'), Error, 'contradicts copy');
  assertThrows(() => assertGeoPairingWithinGate(PERTH, 'au_qld'), Error, 'contradicts copy');
});

Deno.test('"national" is in the gazetteer (a dry-run over 766 headlines found 6 missing it)', () => {
  assertEquals(scopesOf('The national vacancy rate just moved'), ['au_generic']);
});

Deno.test('error names the asset when given, for actionable render logs', () => {
  assertThrows(
    () => assertGeoPairingWithinGate(BRISBANE, 'au_wa_perth', { assetKey: 'bg_perth_cbd' }),
    Error,
    'bg_perth_cbd',
  );
});
