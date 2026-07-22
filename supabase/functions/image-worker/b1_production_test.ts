// b1_production_test.ts — CREATIVE-LIBRARY BRANCH B / LANE B1 hermetic tests.
// Fully hermetic: NO DB, NO network, NO Deno.serve, NO Creatomate. Exercises
// ./b1_production.ts (the PP gate + minimal headline hard-gate + governed subtitle +
// the OPTION D TMR selector consumption: the D1 fail-closed winner allowlist and the
// pure buildTmrRenderPlan). Proves the governed path THROWS rather than yielding a
// legacy script when the selector fails closed, the winner is unmapped, or the
// slot_resolution is incomplete.
//
// OPTION D (2026-07-05): the v2-1..v2-5 rotation tests are RETIRED with the rotation
// constants (B1_BACKGROUND_KEYS / selectB1BackgroundKey deleted — "the constant dies",
// D5). The selector-consuming path is covered here hermetically with a live-shape
// fixture (shape cross-checked against supabase/migrations/
// 20260703035154_create_select_template_v1.sql + 20260704002811_update_resolve_slot_assets_v1_1_scrim48.sql
// and the PGlite harness docs/briefs/option-d-validation.mjs).
// Run: deno test supabase/functions/image-worker/b1_production_test.ts

import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  B1_GOVERNED_CLIENT_ID, B1_GOVERNED_CLIENT_SLUG,
  B1_HEADLINE_MAX_CHARS, B1_HEADLINE_MAX_TOKEN_CHARS, B1_SUBTITLE_MAX_CHARS, B1_PRODUCTION_LABEL, B1_SMOKE_LABEL,
  isB1GovernedImageQuote, assertHeadlineWithinGate, assertExpectedProviderTemplate, deriveB1Subtitle,
  TMR_WINNER_TEXT_FIELDS, TMR_WINNER_LAYOUT_GUARD, buildTmrRenderPlan,
  type B1Fields, type TmrSelectorResponse,
} from './b1_production.ts';
// LANE W (2026-07-05, v3.23.0): the mapResolvedAssets import + test B1-6 were removed —
// mapResolvedAssets was retired with the manual/draft-proof surfaces (its only callers);
// the B1 production branch consumes slot_resolution from select_template instead.

// (1) PP client_id fires the governed branch (the gate keys on client_id, NOT slug).
Deno.test('B1-1: isB1GovernedImageQuote(B1_GOVERNED_CLIENT_ID) === true', () => {
  assert(isB1GovernedImageQuote(B1_GOVERNED_CLIENT_ID));
  assertEquals(B1_GOVERNED_CLIENT_ID, '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd');
});

// (2) UUID-fallback regression: the gate is client_id-based, so it fires on the PP client_id
// REGARDLESS of what slug getBrandAndSlug returns. The v3.14.0 defect was gating on the slug,
// which getBrandAndSlug returns as the client-id UUID when c.client.client_slug is null — that
// made the slug gate false. Now the loop passes the resolved client_id straight to the gate, so
// a UUID-as-slug from getBrandAndSlug can no longer affect routing.
Deno.test('B1-2: client_id gate is immune to the getBrandAndSlug UUID-slug fallback', () => {
  assert(isB1GovernedImageQuote(B1_GOVERNED_CLIENT_ID));
  assert((B1_GOVERNED_CLIENT_SLUG as string) !== (B1_GOVERNED_CLIENT_ID as string));
  assertEquals(B1_GOVERNED_CLIENT_SLUG, 'property-pulse');
});

// (3) The selector receives 'property-pulse' (the canonical slug constant the governed
// branch passes to select_template), not a UUID; the production label is unchanged (D3 —
// the S1 stamper predicate keys on it).
Deno.test('B1-3: canonical slug + production label pinned (D3: label unchanged)', () => {
  assertEquals(B1_GOVERNED_CLIENT_SLUG, 'property-pulse');
  assertEquals(B1_GOVERNED_CLIENT_ID, '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd');
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

// (5) headline hard-gate: over-length (multi-word) throws BEFORE any Creatomate call;
// an at-bound multi-word headline passes; blank throws. cc-0040: bound is 180 chars.
Deno.test('B1-5: assertHeadlineWithinGate — length bound (180), boundary passes, blank throws', () => {
  assertEquals(B1_HEADLINE_MAX_CHARS, 180);
  // 181-char MULTI-WORD headline (no single token > 40) → length throw.
  // build from 45 four-char words joined by spaces = 45*4 + 44 = 224; slice to 181.
  const words181 = Array.from({ length: 60 }, () => 'abcd').join(' ').slice(0, 181);
  assertEquals(words181.length, 181);
  const err = assertThrows(() => assertHeadlineWithinGate(words181), Error);
  assert(String(err).includes('exceeds B1_HEADLINE_MAX_CHARS=180'));
  assert(String(err).includes('headline length 181'));

  // boundary: an exactly-180-char MULTI-WORD headline (each token ≤ 40) passes.
  const words180 = Array.from({ length: 60 }, () => 'abcd').join(' ').slice(0, 180);
  assertEquals(words180.length, 180);
  assertHeadlineWithinGate(words180); // no throw
  assertHeadlineWithinGate('Perth median house price hits new record this quarter'); // short, no throw

  // blank / whitespace-only / null → missing-headline throw.
  assertThrows(() => assertHeadlineWithinGate(''), Error, 'b1: missing image_headline');
  assertThrows(() => assertHeadlineWithinGate('   '), Error, 'b1: missing image_headline');
  assertThrows(() => assertHeadlineWithinGate(null), Error, 'b1: missing image_headline');

  // trims before measuring: a 180-char multi-word core padded with whitespace still passes.
  assertHeadlineWithinGate('   ' + words180 + '   ');
});

// (5b) cc-0040 unbreakable-token guard: a single whitespace-free token longer than
// B1_HEADLINE_MAX_TOKEN_CHARS throws EVEN when the total length is within 180; a 40-char
// token (boundary, inclusive) passes.
Deno.test('B1-5b: assertHeadlineWithinGate — 41-char token throws, 40-char token passes', () => {
  assertEquals(B1_HEADLINE_MAX_TOKEN_CHARS, 40);
  // a lone 41-char token (total length 41 ≤ 180) → token-guard throw.
  const token41 = 'a'.repeat(41);
  assertEquals(token41.length, 41);
  assert(token41.length <= B1_HEADLINE_MAX_CHARS);
  const err = assertThrows(() => assertHeadlineWithinGate(token41), Error);
  assert(String(err).includes('token length 41'));
  assert(String(err).includes('B1_HEADLINE_MAX_TOKEN_CHARS=40'));

  // an over-long token embedded in otherwise-short copy still throws.
  assertThrows(() => assertHeadlineWithinGate('Perth ' + 'z'.repeat(41) + ' record'), Error, 'token length 41');

  // boundary: a lone 40-char token passes (inclusive).
  assertHeadlineWithinGate('b'.repeat(B1_HEADLINE_MAX_TOKEN_CHARS)); // no throw
});

// (6) RETIRED (Lane W): B1-6 exercised mapResolvedAssets, which was removed with the
// manual/draft-proof surfaces. The B1 fail-closed behaviour is covered by B1-D-5..D-10.

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

// ── OPTION D: TMR selector consumption (buildTmrRenderPlan) ─────────────────────
// Live-shape fixture: mirrors the verified public.select_template response for
// ('property-pulse','facebook','image_quote',NULL,seed) — winner
// generic_market_insight_card_1x1_v1 (provider 48cba556…), embedded slot_resolution
// with Background.source / Logo.source / Scrim.opacity 48 (resolver v1.1) and the
// per-slot selected[] evidence entries. Shape cross-checked against the migration
// SQL and the PGlite harness (docs/briefs/option-d-validation.mjs).

const WINNER_PROVIDER_ID = '48cba556-0a53-4001-90f0-05420d10efc0';
const BG_URL = 'https://x.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/Perth_CBD_Suburbs.jpg';
const LOGO_URL = 'https://x.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/PP_logo_2.png';

const FIELDS: B1Fields = {
  category: 'PROPERTY NEWS',
  headline: 'Perth median house price hits new record this quarter',
  subtitle: 'Auction clearance rates climb for a third straight week.',
  location: '',
  date: 'IGNORED — renderDate is injected separately',
  footer: 'propertypulse.com.au',
};

function liveShapeFixture(): TmrSelectorResponse {
  return {
    status: 'ok',
    context: {
      client_slug: 'property-pulse', platform: 'facebook', format: 'image_quote',
      variant_intent: null, seed: 'edf01c52-0000-4000-8000-000000000000',
      selectable_definition: 'visually_approved+ AND passed visual_approval proof',
    },
    rejected: [],
    selected: {
      assignment_id: 'aaaaaaaa-1111-1111-1111-111111111101',
      template_id: '11111111-1111-1111-1111-111111111101',
      provider_template_id: WINNER_PROVIDER_ID,
      provider_template_name: 'generic_market_insight_card_1x1_v1',
      variant_key: 'market_insight.v1',
      format_key: 'image_quote',
      aspect_ratio: '1:1',
      assignment_status: 'visually_approved',
      reasons: ['format_match', 'generic_scope', 'platform_declared', 'assignment_visually_approved', 'visual_proof_passed', 'assets_resolved'],
      proof: { visual_approval: 'passed', occurred_at: '2026-06-21T01:00:00Z', evidence_reference: 'render:smoke:mi' },
    },
    warnings: ['platform_suitability_unproven'],
    fail_reason: null,
    alternatives: [],
    slot_resolution: {
      status: 'ok',
      modifications: {
        'Background.source': BG_URL,
        'Logo.source': LOGO_URL,
        'Scrim.opacity': 48,
      },
      selected: [
        { slot: 'Background', asset_key: 'bg_perth_cbd', asset_id: 'f9caed52-0859-4e22-91f6-7dc998485d77', asset_url: BG_URL, reasons: ['governed', 'license_ok', 'text_safe_needs_scrim', 'client_match'] },
        { slot: 'Logo', asset_key: 'pp_logo_primary', asset_id: 'b7530c55-c320-43be-90d9-98c804694921', asset_url: LOGO_URL, reasons: ['governed', 'license_ok', 'client_match'] },
      ],
      rejected: [],
      warnings: [],
      fail_reason: null,
      context: {},
    },
  };
}

// (D-1) The D1 allowlist maps ONLY the market-insight winner in v1.
// cc-0049: the allowlist gained generic_quote_card_1x1_v1 (Invegent's governed winner). The
// allowlist is still CLOSED — any winner outside it fails loud (see B1-D-7 / B1-LG-4).
Deno.test('B1-D-1: TMR_WINNER_TEXT_FIELDS allowlist = market-insight + quote-card ONLY', () => {
  assertEquals(Object.keys(TMR_WINNER_TEXT_FIELDS).sort(),
    ['generic_market_insight_card_1x1_v1', 'generic_quote_card_1x1_v1']);
});

// (D-2) Happy path: exact 13-key modification set (3 slot keys + 4 layout-guard keys +
// 6 text keys), Scrim 48 passthrough, slot_resolution authoritative for assets, renderDate
// injected into Date.text. The 4 guard keys are cc-0033a's winner-scoped layout guard.
Deno.test('B1-D-2: buildTmrRenderPlan builds the exact 13-key modification set (incl. layout guard) from the live-shape fixture', () => {
  const plan = buildTmrRenderPlan(liveShapeFixture(), FIELDS, '5 July 2026');
  assertEquals(plan.providerTemplateId, WINNER_PROVIDER_ID);
  assertEquals(Object.keys(plan.modifications).sort(), [
    'Background.source', 'CategoryBadge.text', 'Date.text', 'Footer.text',
    'Headline.font_size', 'Headline.font_size_maximum', 'Headline.font_size_minimum',
    'Headline.height', 'Headline.text', 'Location.text', 'Logo.source',
    'Scrim.opacity', 'Subtitle.text',
  ]);
  assertEquals(plan.modifications['CategoryBadge.text'], 'PROPERTY NEWS');
  assertEquals(plan.modifications['Headline.text'], FIELDS.headline);
  assertEquals(plan.modifications['Subtitle.text'], FIELDS.subtitle);
  assertEquals(plan.modifications['Location.text'], '');
  assertEquals(plan.modifications['Date.text'], '5 July 2026');            // injected renderDate, NOT fields.date
  assertEquals(plan.modifications['Footer.text'], 'propertypulse.com.au');
  assertEquals(plan.modifications['Background.source'], BG_URL);           // from slot_resolution ONLY
  assertEquals(plan.modifications['Logo.source'], LOGO_URL);               // from slot_resolution ONLY
  assertEquals(plan.modifications['Scrim.opacity'], 48);                   // resolver v1.1 scrim 48 passthrough (numeric)
  // db-rls-auditor must-fix: the selected slot asset_keys are exposed on the plan —
  // backgroundAssetKey feeds the TOP-LEVEL render_spec.background_key (legacy name) that
  // stamp_tmr_shadow_forward reads to compute background_match.
  assertEquals(plan.backgroundAssetKey, 'bg_perth_cbd');
  assertEquals(plan.logoAssetKey, 'pp_logo_primary');
});

// (D-3) Determinism: pure function — same inputs, same output; no Date.now inside
// (renderDate is caller-injected; two calls with different renderDate differ ONLY in Date.text).
Deno.test('B1-D-3: buildTmrRenderPlan is pure/deterministic; renderDate fully caller-controlled', () => {
  const a = buildTmrRenderPlan(liveShapeFixture(), FIELDS, '5 July 2026');
  const b = buildTmrRenderPlan(liveShapeFixture(), FIELDS, '5 July 2026');
  assertEquals(JSON.stringify(a), JSON.stringify(b));
  const c = buildTmrRenderPlan(liveShapeFixture(), FIELDS, '6 July 2026');
  assertEquals(c.modifications['Date.text'], '6 July 2026');
  const { 'Date.text': _da, ...restA } = a.modifications;
  const { 'Date.text': _dc, ...restC } = c.modifications;
  assertEquals(JSON.stringify(restA), JSON.stringify(restC));
});

// (D-4) tmrEvidence carries the D3 evidence block (winner, ids, variant, seed, trimmed
// slot reasons, warnings, selector_status).
Deno.test('B1-D-4: tmrEvidence shape (winner/ids/variant/seed/slot_reasons/slot_warnings)', () => {
  const plan = buildTmrRenderPlan(liveShapeFixture(), FIELDS, '5 July 2026');
  const ev = plan.tmrEvidence;
  assertEquals(ev.winner, 'generic_market_insight_card_1x1_v1');
  assertEquals(ev.provider_template_id, WINNER_PROVIDER_ID);
  assertEquals(ev.registry_template_id, '11111111-1111-1111-1111-111111111101');
  assertEquals(ev.assignment_id, 'aaaaaaaa-1111-1111-1111-111111111101');
  assertEquals(ev.variant_key, 'market_insight.v1');
  assertEquals(ev.seed, 'edf01c52-0000-4000-8000-000000000000');
  assertEquals(ev.selector_status, 'ok');
  assertEquals(ev.slot_reasons, [
    { slot: 'Background', asset_key: 'bg_perth_cbd', reasons: ['governed', 'license_ok', 'text_safe_needs_scrim', 'client_match'] },
    { slot: 'Logo', asset_key: 'pp_logo_primary', reasons: ['governed', 'license_ok', 'client_match'] },
  ]);
  assertEquals(ev.slot_warnings, []);
});

// (D-5) fail-closed selector status → throw (no fallback, fail_reason surfaced).
Deno.test('B1-D-5: selector status fail_closed → throws tmr_selector_fail_closed', () => {
  const fx = liveShapeFixture();
  fx.status = 'fail_closed';
  fx.fail_reason = 'no_selectable_template';
  fx.selected = null;
  fx.slot_resolution = null;
  assertThrows(() => buildTmrRenderPlan(fx, FIELDS, '5 July 2026'), Error, 'tmr_selector_fail_closed: no_selectable_template');
  // null/undefined response is equally fail-closed.
  assertThrows(() => buildTmrRenderPlan(null, FIELDS, '5 July 2026'), Error, 'tmr_selector_fail_closed');
});

// (D-6) embedded slot_resolution fail_closed (or missing) → throw.
Deno.test('B1-D-6: slot_resolution fail_closed/missing → throws tmr_selector_fail_closed', () => {
  const fx = liveShapeFixture();
  fx.slot_resolution = { status: 'fail_closed', modifications: {}, selected: [], rejected: [], warnings: [], fail_reason: 'no_governed_background' };
  assertThrows(() => buildTmrRenderPlan(fx, FIELDS, '5 July 2026'), Error, 'tmr_selector_fail_closed: slot_resolution:no_governed_background');
  const fx2 = liveShapeFixture();
  fx2.slot_resolution = null;
  assertThrows(() => buildTmrRenderPlan(fx2, FIELDS, '5 July 2026'), Error, 'tmr_selector_fail_closed: slot_resolution:missing');
});

// (D-7) D1 fail-closed allowlist: an unmapped winner (e.g. quote_card) → throw, never guess.
// cc-0049: generic_quote_card_1x1_v1 is now MAPPED, so this test uses a genuinely unregistered
// winner instead. The fail-closed contract itself is unchanged.
Deno.test('B1-D-7: unmapped winner → throws tmr_winner_unmapped', () => {
  const fx = liveShapeFixture();
  fx.selected = { ...fx.selected!, provider_template_name: 'generic_unregistered_card_1x1_v9' };
  assertThrows(() => buildTmrRenderPlan(fx, FIELDS, '5 July 2026'), Error, 'tmr_winner_unmapped: generic_unregistered_card_1x1_v9');
  const fx2 = liveShapeFixture();
  fx2.selected = { ...fx2.selected!, provider_template_name: undefined };
  assertThrows(() => buildTmrRenderPlan(fx2, FIELDS, '5 July 2026'), Error, 'tmr_winner_unmapped');
});

// (D-8) slot_resolution warnings are carried into tmrEvidence.slot_warnings verbatim.
Deno.test('B1-D-8: slot_resolution warnings carried into tmrEvidence', () => {
  const fx = liveShapeFixture();
  fx.slot_resolution!.warnings = ['scrim_override_invalid', 'optional_slot_unfilled:FaceObject'];
  const plan = buildTmrRenderPlan(fx, FIELDS, '5 July 2026');
  assertEquals(plan.tmrEvidence.slot_warnings, ['scrim_override_invalid', 'optional_slot_unfilled:FaceObject']);
});

// (D-9) incomplete slot modifications (missing Background.source / Logo.source) → throw.
Deno.test('B1-D-9: missing Background.source / Logo.source → throws tmr_slot_resolution_incomplete', () => {
  const fx = liveShapeFixture();
  delete fx.slot_resolution!.modifications!['Logo.source'];
  assertThrows(() => buildTmrRenderPlan(fx, FIELDS, '5 July 2026'), Error, 'tmr_slot_resolution_incomplete');
  const fx2 = liveShapeFixture();
  fx2.slot_resolution!.modifications = { 'Scrim.opacity': 48 };
  assertThrows(() => buildTmrRenderPlan(fx2, FIELDS, '5 July 2026'), Error, 'tmr_slot_resolution_incomplete');
});

// (D-9b) db-rls-auditor must-fix: slot_resolution.selected missing the Background (or Logo)
// entry → throw (the stamper's background_key evidence would otherwise be unbuildable).
Deno.test('B1-D-9b: missing Background/Logo selected entry → throws tmr_slot_resolution_incomplete', () => {
  const fx = liveShapeFixture();
  fx.slot_resolution!.selected = fx.slot_resolution!.selected!.filter((s) => s.slot !== 'Background');
  assertThrows(() => buildTmrRenderPlan(fx, FIELDS, '5 July 2026'), Error, 'tmr_slot_resolution_incomplete: missing Background/Logo selected entry');
  const fx2 = liveShapeFixture();
  fx2.slot_resolution!.selected = fx2.slot_resolution!.selected!.filter((s) => s.slot !== 'Logo');
  assertThrows(() => buildTmrRenderPlan(fx2, FIELDS, '5 July 2026'), Error, 'tmr_slot_resolution_incomplete: missing Background/Logo selected entry');
  const fx3 = liveShapeFixture();
  fx3.slot_resolution!.selected = [];
  assertThrows(() => buildTmrRenderPlan(fx3, FIELDS, '5 July 2026'), Error, 'tmr_slot_resolution_incomplete');
});

// (D-10) missing provider_template_id on a mapped winner → fail loud (never submit an
// empty template_id to Creatomate).
Deno.test('B1-D-10: mapped winner without provider_template_id → throws', () => {
  const fx = liveShapeFixture();
  fx.selected = { ...fx.selected!, provider_template_id: undefined };
  assertThrows(() => buildTmrRenderPlan(fx, FIELDS, '5 July 2026'), Error, 'tmr_selector_fail_closed: missing_provider_template_id');
});

// ── cc-0033a: winner-scoped layout guard (headline/subtitle overprint structural fix) ──

// (LG-1) The layout guard is present in the built modifications for the mapped winner, with
// the EXACT geometry values — including Headline.font_size === null (the auto-fit selector,
// not expressible in the pre-fix Record<string, string | number> type).
Deno.test('B1-LG-1: layout guard injected for generic_market_insight_card_1x1_v1 with exact values', () => {
  const plan = buildTmrRenderPlan(liveShapeFixture(), FIELDS, '5 July 2026');
  assertEquals(plan.modifications['Headline.height'], '22%');
  assertEquals(plan.modifications['Headline.font_size'], null);
  assertEquals(plan.modifications['Headline.font_size_minimum'], '30 px');
  assertEquals(plan.modifications['Headline.font_size_maximum'], '74 px');
  // sanity: the guard const itself carries exactly these four keys for the mapped winner.
  assertEquals(TMR_WINNER_LAYOUT_GUARD['generic_market_insight_card_1x1_v1'], {
    'Headline.height': '22%',
    'Headline.font_size': null,
    'Headline.font_size_minimum': '30 px',
    'Headline.font_size_maximum': '74 px',
  });
});

// (LG-2) The guard sits BETWEEN slotMods and textFields, so neither can clobber the geometry.
// Inject decoy geometry into slotMods (spread BEFORE the guard) → the guard's values win.
// The text field (spread AFTER the guard, but carries only `.text` keys — no geometry overlap)
// coexists: Headline.text is intact and the guard geometry is untouched.
Deno.test('B1-LG-2: guard is not overridden by slotMods (or clobbered by textFields)', () => {
  const fx = liveShapeFixture();
  // decoy geometry in slotMods that would collide with the guard keys if ordering were wrong.
  fx.slot_resolution!.modifications = {
    ...fx.slot_resolution!.modifications!,
    'Headline.height': '99%',
    'Headline.font_size': '200 px',
    'Headline.font_size_minimum': '1 px',
    'Headline.font_size_maximum': '999 px',
  };
  const plan = buildTmrRenderPlan(fx, FIELDS, '5 July 2026');
  // guard (later spread) overrides the slotMods decoys.
  assertEquals(plan.modifications['Headline.height'], '22%');
  assertEquals(plan.modifications['Headline.font_size'], null);
  assertEquals(plan.modifications['Headline.font_size_minimum'], '30 px');
  assertEquals(plan.modifications['Headline.font_size_maximum'], '74 px');
  // textFields (spread last) touches only `.text` — geometry survives, headline text present.
  assertEquals(plan.modifications['Headline.text'], FIELDS.headline);
});

// (LG-3) The `null` value survives spread + assignment into the modifications map (i.e. the
// widened Record<string, string | number | null> is doing real work — a lost/coerced null
// would silently disable Creatomate auto-fit).
Deno.test('B1-LG-3: Headline.font_size null survives into the modifications map', () => {
  const plan = buildTmrRenderPlan(liveShapeFixture(), FIELDS, '5 July 2026');
  assert('Headline.font_size' in plan.modifications);
  assertEquals(plan.modifications['Headline.font_size'], null);
  assert(plan.modifications['Headline.font_size'] === null); // strict null, not undefined/absent
});

// (LG-4) An unmapped winner still throws tmr_winner_unmapped BEFORE any guard lookup —
// fail-closed behaviour unchanged. (Complements D-7; a guard-absent winner never reaches
// the merge, so it can neither be un-guarded silently nor guessed.)
Deno.test('B1-LG-4: unmapped winner still throws tmr_winner_unmapped (fail-closed unchanged)', () => {
  const fx = liveShapeFixture();
  fx.selected = { ...fx.selected!, provider_template_name: 'generic_unregistered_card_1x1_v9' };
  assertThrows(() => buildTmrRenderPlan(fx, FIELDS, '5 July 2026'), Error, 'tmr_winner_unmapped: generic_unregistered_card_1x1_v9');
  // cc-0049: the now-MAPPED quote card still carries NO layout guard (merges {} — the
  // market-insight geometry is explicitly non-portable and must never be reused for it).
  assertEquals(TMR_WINNER_LAYOUT_GUARD['generic_quote_card_1x1_v1'], undefined);
  assertEquals(TMR_WINNER_LAYOUT_GUARD['generic_unregistered_card_1x1_v9'], undefined);
});

// ── cc-0037: SUPERVISED GOVERNED IMAGE_QUOTE SMOKE (b1_production.ts contributions) ──────
// The smoke's stamper-safety invariant + its fail-loud provider-drift assert are pure and
// hermetic; they are the two testable pieces the smoke branch depends on.

// (smoke-1) B1_SMOKE_LABEL is the exact registered smoke label.
Deno.test('cc-0037 smoke-1: B1_SMOKE_LABEL === "creative_library_b1_smoke"', () => {
  assertEquals(B1_SMOKE_LABEL, 'creative_library_b1_smoke');
});

// (smoke-2) THE STAMPER-SAFETY INVARIANT: the smoke label must NOT equal the production label.
// stamp_tmr_shadow_forward keys on render_spec->>'label' = B1_PRODUCTION_LABEL AND
// post_draft_id IS NOT NULL; the distinct smoke label is defence-in-depth. If this ever fails,
// the smoke could become stampable were the null-draft-id clause dropped.
Deno.test('cc-0037 smoke-2: B1_SMOKE_LABEL !== B1_PRODUCTION_LABEL (stamper-safety invariant)', () => {
  assert((B1_SMOKE_LABEL as string) !== (B1_PRODUCTION_LABEL as string));
  assertEquals(B1_PRODUCTION_LABEL, 'creative_library_b1_production');
});

// (smoke-3) assertExpectedProviderTemplate PASS path: equal ids → no throw.
Deno.test('cc-0037 smoke-3: assertExpectedProviderTemplate passes on a match', () => {
  assertExpectedProviderTemplate(WINNER_PROVIDER_ID, WINNER_PROVIDER_ID);  // no throw
});

// (smoke-4) assertExpectedProviderTemplate THROW path: mismatch throws, naming BOTH ids
// (converts silent C4 provider drift into a loud failure).
Deno.test('cc-0037 smoke-4: assertExpectedProviderTemplate throws naming both ids on drift', () => {
  const drifted = 'deadbeef-0000-4000-8000-000000000000';
  const err = assertThrows(
    () => assertExpectedProviderTemplate(drifted, WINNER_PROVIDER_ID),
    Error,
    'provider drift',
  );
  assert(String(err).includes(WINNER_PROVIDER_ID), 'message must name the EXPECTED id');
  assert(String(err).includes(drifted), 'message must name the ACTUAL id');
});
