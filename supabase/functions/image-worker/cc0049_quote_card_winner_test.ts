// cc0049_quote_card_winner_test.ts — hermetic tests for the cc-0049 incident recovery.
// Fully hermetic: NO DB, NO network, NO Deno.serve. Pure-logic only.
// Run: deno test supabase/functions/image-worker/cc0049_quote_card_winner_test.ts
//
// Context: after cc-0048 cleared brand_payload_contract_unresolved, Invegent hit the NEXT
// governed fail-closed guard — tmr_winner_unmapped: generic_quote_card_1x1_v1. This suite
// proves the new winner mapping is (a) taken from the AUTHORITATIVE governed element capture
// (c.creative_provider_template_field for 2140ca19-d075-49d3-9dc9-30d924805e22) and NOT
// guessed, (b) leaves every other winner and client byte-identical, and (c) cannot leak one
// client's brand payload onto another.

import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1';
import { buildProofFieldsFromDraft } from './branch_b_proof.ts';
import { TMR_WINNER_TEXT_FIELDS, buildTmrRenderPlan, type B1Fields } from './b1_production.ts';
import {
  PP_IMAGE_QUOTE_NEWS_CARD_V1, NDIS_IMAGE_QUOTE_NEWS_CARD_V1,
  CFW_IMAGE_QUOTE_NEWS_CARD_V1, INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1,
} from './creative_contract.ts';

const FIXED = new Date(Date.UTC(2026, 6, 22));
const PP_ID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
const NDIS_ID = 'fb98a472-ae4d-432d-8738-2273231c1ef4';
const CFW_ID = '3eca32aa-e460-462f-a846-3f6ace6a3cae';
const INV_ID = '93494a09-cc89-41d1-b364-cb63983063a6';
const HEADLINE = 'A valid governed headline';
const draft = (id: string) => ({ image_headline: HEADLINE, client_id: id, recommended_format: 'image_quote' });
const fixed = (c: typeof PP_IMAGE_QUOTE_NEWS_CARD_V1, n: string) =>
  c.fields.renderer_fixed.find((e) => e.field === n)?.value;

// AUTHORITATIVE element inventory — c.creative_provider_template_field, template
// 2140ca19-d075-49d3-9dc9-30d924805e22, captured from live Creatomate (v4.71 fresh-capture).
// dynamic text elements ONLY; QuoteMark + Scrim are dynamic=false and must NOT be mapped.
const QUOTE_CARD_DYNAMIC_TEXT = ['Attribution', 'Footer', 'QuoteText', 'SourceLabel'] as const;
const QUOTE_CARD_NON_DYNAMIC = ['QuoteMark', 'Scrim'] as const;
const MARKET_INSIGHT_DYNAMIC_TEXT =
  ['CategoryBadge', 'Date', 'Footer', 'Headline', 'Location', 'Subtitle'] as const;

const invFields = (): B1Fields =>
  buildProofFieldsFromDraft(draft(INV_ID), FIXED) as B1Fields;

// ── T1 — Invegent's winner maps to the EXACT authoritative elements ──────────────────────
Deno.test('T1 quote-card winner maps exactly the authoritative dynamic text elements', () => {
  const fn = TMR_WINNER_TEXT_FIELDS['generic_quote_card_1x1_v1'];
  assert(fn !== undefined, 'quote-card winner must be registered');
  const keys = Object.keys(fn(invFields())).sort();
  // Exactly the 4 dynamic text elements, each in the proven '<Element>.text' key form.
  assertEquals(keys, QUOTE_CARD_DYNAMIC_TEXT.map((e) => `${e}.text`).sort());
  // Non-dynamic elements are NEVER modified.
  for (const e of QUOTE_CARD_NON_DYNAMIC) {
    assert(!keys.includes(`${e}.text`), `${e} is dynamic=false and must not be mapped`);
    assert(!keys.includes(e), `${e} must not be mapped in bare form either`);
  }
  // No asset/scrim keys — slot_resolution stays authoritative for those.
  for (const k of keys) assert(!/^(Background|Logo|Scrim)\b/.test(k), `asset key leaked: ${k}`);
});

// ── T2 — the intended values populate the correct elements ──────────────────────────────
Deno.test('T2 quote-card fields populate the correct elements with PK-authored values', () => {
  const out = TMR_WINNER_TEXT_FIELDS['generic_quote_card_1x1_v1'](invFields());
  assertEquals(out['QuoteText.text'], HEADLINE);                      // PK ruling: QuoteText <- headline
  assertEquals(out['Attribution.text'], 'Invegent — AI & Automation');
  assertEquals(out['SourceLabel.text'], 'invegent.com');
  assertEquals(out['Footer.text'], 'Invegent');
  // The two brand values come from the CLIENT CONTRACT, not from this map.
  assertEquals(fixed(INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1, 'attribution'), 'Invegent — AI & Automation');
  assertEquals(fixed(INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1, 'source_label'), 'invegent.com');
});

// ── T3/T4/T5 — PP, NDIS and CFW are byte-identical ──────────────────────────────────────
Deno.test('T3-T5 PP / NDIS / CFW mappings and emitted fields are unchanged', () => {
  const mi = TMR_WINNER_TEXT_FIELDS['generic_market_insight_card_1x1_v1'];
  assertEquals(Object.keys(mi({
    category: 'C', headline: 'H', subtitle: 'S', location: 'L', date: 'D', footer: 'F',
  })).sort(), MARKET_INSIGHT_DYNAMIC_TEXT.map((e) => `${e}.text`).sort());
  // Those three clients declare NO attribution/source_label, so their emitted field object is
  // still EXACTLY the original 6 keys — no consumer sees a shape change.
  for (const [id, cat, foot] of [
    [PP_ID, 'PROPERTY NEWS', 'propertypulse.com.au'],
    [NDIS_ID, 'NDIS UPDATE', 'NDIS Yarns'],
    [CFW_ID, 'CARE UPDATE', 'Care For Welfare'],
  ] as const) {
    const f = buildProofFieldsFromDraft(draft(id), FIXED);
    assertEquals(Object.keys(f).sort(), ['category', 'date', 'footer', 'headline', 'location', 'subtitle']);
    assertEquals(f.category, cat);
    assertEquals(f.footer, foot);
    assertEquals((f as Record<string, unknown>).attribution, undefined);
    assertEquals((f as Record<string, unknown>).source_label, undefined);
  }
  for (const c of [PP_IMAGE_QUOTE_NEWS_CARD_V1, NDIS_IMAGE_QUOTE_NEWS_CARD_V1, CFW_IMAGE_QUOTE_NEWS_CARD_V1]) {
    assertEquals(fixed(c, 'attribution'), undefined);
    assertEquals(fixed(c, 'source_label'), undefined);
  }
});

// ── T6 — unknown winners still fail closed ──────────────────────────────────────────────
Deno.test('T6 unknown winners still fail closed with tmr_winner_unmapped', () => {
  const sel = (name: string) => ({
    status: 'ok', selected: { provider_template_name: name, provider_template_id: 'x' },
    slot_resolution: { status: 'ok', modifications: { 'Background.source': 'b', 'Logo.source': 'l' },
      selected: [{ slot: 'Background', asset_key: 'bg' }, { slot: 'Logo', asset_key: 'lg' }] },
  });
  for (const bad of ['generic_quote_card_1x1_v2', 'quote_card', 'generic_quote_card', '']) {
    assertThrows(() => buildTmrRenderPlan(sel(bad) as never, invFields(), '22 July 2026'),
      Error, 'tmr_winner_unmapped');
  }
  assertEquals(Object.keys(TMR_WINNER_TEXT_FIELDS).sort(),
    ['generic_market_insight_card_1x1_v1', 'generic_quote_card_1x1_v1']);
});

// ── T7 — no selection / asset / publish behaviour change ────────────────────────────────
Deno.test('T7 slot_resolution stays authoritative; no selection or asset behaviour change', () => {
  const sel = {
    status: 'ok',
    selected: { provider_template_name: 'generic_quote_card_1x1_v1', provider_template_id: '2140ca19' },
    slot_resolution: { status: 'ok',
      modifications: { 'Background.source': 'BG_URL', 'Logo.source': 'LOGO_URL', 'Scrim.opacity': 40 },
      selected: [{ slot: 'Background', asset_key: 'bg_k' }, { slot: 'Logo', asset_key: 'logo_k' }] },
  };
  const plan = buildTmrRenderPlan(sel as never, invFields(), '22 July 2026');
  assertEquals(plan.providerTemplateId, '2140ca19');
  // Asset/scrim modifications survive untouched — the winner map never overrides them.
  assertEquals(plan.modifications['Background.source'], 'BG_URL');
  assertEquals(plan.modifications['Logo.source'], 'LOGO_URL');
  assertEquals(plan.modifications['Scrim.opacity'], 40);
  assertEquals(plan.backgroundAssetKey, 'bg_k');
  assertEquals(plan.logoAssetKey, 'logo_k');
  // Text fields present alongside.
  assertEquals(plan.modifications['QuoteText.text'], HEADLINE);
  assertEquals(plan.modifications['Attribution.text'], 'Invegent — AI & Automation');
});

// ── T8 — no cross-template field-name guessing, no cross-client brand leak ───────────────
Deno.test('T8 no cross-template guessing and no cross-brand leak', () => {
  const q = Object.keys(TMR_WINNER_TEXT_FIELDS['generic_quote_card_1x1_v1'](invFields()));
  const m = Object.keys(TMR_WINNER_TEXT_FIELDS['generic_market_insight_card_1x1_v1']({
    category: 'C', headline: 'H', subtitle: 'S', location: 'L', date: 'D', footer: 'F',
  }));
  // The only shared key is Footer.text — every other key set is disjoint.
  assertEquals(q.filter((k) => m.includes(k)).sort(), ['Footer.text']);
  for (const k of ['CategoryBadge.text', 'Subtitle.text', 'Location.text', 'Date.text', 'Headline.text']) {
    assert(!q.includes(k), `market-insight key leaked into quote card: ${k}`);
  }
  for (const k of ['QuoteText.text', 'Attribution.text', 'SourceLabel.text']) {
    assert(!m.includes(k), `quote-card key leaked into market-insight: ${k}`);
  }
  // CROSS-BRAND LEAK GUARD: a client that selects the quote card WITHOUT declaring the two
  // brand fields must FAIL CLOSED — it must never inherit Invegent's strings or render the
  // template's placeholder defaults. (property-pulse holds a visually_approved assignment on
  // this exact template, so this is a live risk, not a hypothetical.)
  const ppFields = buildProofFieldsFromDraft(draft(PP_ID), FIXED) as B1Fields;
  assertThrows(() => TMR_WINNER_TEXT_FIELDS['generic_quote_card_1x1_v1'](ppFields),
    Error, 'tmr_winner_brand_fields_missing');
  // And the literals appear in NO other client's contract.
  for (const c of [PP_IMAGE_QUOTE_NEWS_CARD_V1, NDIS_IMAGE_QUOTE_NEWS_CARD_V1, CFW_IMAGE_QUOTE_NEWS_CARD_V1]) {
    for (const e of c.fields.renderer_fixed) {
      assert(e.value !== 'Invegent — AI & Automation', 'Invegent attribution leaked');
      assert(e.value !== 'invegent.com', 'Invegent source_label leaked');
    }
  }
});
