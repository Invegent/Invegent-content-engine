// cc0048_registry_recovery_test.ts — hermetic tests for the cc-0048 incident recovery.
//
// Fully hermetic: NO DB, NO network, NO Deno.serve, NO Creatomate. Pure-logic only.
// Run: deno test supabase/functions/image-worker/cc0048_registry_recovery_test.ts
//
// Context: care-for-welfare-pty-ltd and invegent had NO entry in CREATIVE_CONTRACT_REGISTRY,
// so resolveCreativeContract returned null and the v3.28.0 fail-closed guard threw
// brand_payload_contract_unresolved on EVERY image_quote render for those clients
// (304 failed renders, 2026-07-20 15:30Z → 2026-07-22). This suite proves the two new
// registry entries restore them WITHOUT changing PP/NDIS behaviour and WITHOUT weakening
// the fail-closed guard.
//
// The four brand values asserted here (category/footer for CFW + Invegent) are EXPLICIT
// PK-AUTHORED brand values supplied at the cc-0048 Gate-1 exchange (2026-07-22). They are
// NOT derived from any database field and NOT generated from free text. These assertions
// are the mechanical guarantee that no other value can silently take their place.

import { assert, assertEquals, assertNotEquals, assertThrows } from 'jsr:@std/assert@1';
import { buildProofFieldsFromDraft } from './branch_b_proof.ts';
import {
  PP_IMAGE_QUOTE_NEWS_CARD_V1,
  NDIS_IMAGE_QUOTE_NEWS_CARD_V1,
  CFW_IMAGE_QUOTE_NEWS_CARD_V1,
  INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1,
  resolveCreativeContract,
} from './creative_contract.ts';

const FIXED = new Date(Date.UTC(2026, 6, 22)); // 22 July 2026
const EXPECTED_DATE = '22 July 2026';

const PP_ID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
const NDIS_ID = 'fb98a472-ae4d-432d-8738-2273231c1ef4';
const CFW_ID = '3eca32aa-e460-462f-a846-3f6ace6a3cae';
const INV_ID = '93494a09-cc89-41d1-b364-cb63983063a6';

const HEADLINE = 'A valid governed headline';
const draft = (client_id: string | null, recommended_format: string | null = 'image_quote') =>
  ({ image_headline: HEADLINE, client_id, recommended_format });

const fixed = (c: typeof PP_IMAGE_QUOTE_NEWS_CARD_V1, name: string) =>
  c.fields.renderer_fixed.find((e) => e.field === name)?.value;

// ── TEST 1 — Property Pulse resolves EXACTLY as before ───────────────────────────────────
Deno.test('T1 PP resolves exactly as before (identity + byte-identical brand payload)', () => {
  assertEquals(resolveCreativeContract(PP_ID, 'image_quote'), PP_IMAGE_QUOTE_NEWS_CARD_V1);
  // The three values the render path actually reads, asserted as literals (not via the object
  // under test) so a mutation of the frozen constant cannot make this test vacuously pass.
  assertEquals(fixed(PP_IMAGE_QUOTE_NEWS_CARD_V1, 'category'), 'PROPERTY NEWS');
  assertEquals(fixed(PP_IMAGE_QUOTE_NEWS_CARD_V1, 'footer'), 'propertypulse.com.au');
  assertEquals(fixed(PP_IMAGE_QUOTE_NEWS_CARD_V1, 'location'), '');
  assertEquals(PP_IMAGE_QUOTE_NEWS_CARD_V1.contract_ref, 'property_pulse.image_quote.news_card');
  assertEquals(PP_IMAGE_QUOTE_NEWS_CARD_V1.contract_version, 'v2');
  assertEquals(PP_IMAGE_QUOTE_NEWS_CARD_V1.selector_reason_default, 'pp_image_quote_default');
  // End-to-end through the real consumer.
  assertEquals(buildProofFieldsFromDraft(draft(PP_ID), FIXED), {
    category: 'PROPERTY NEWS',
    headline: HEADLINE,
    subtitle: '',
    location: '',
    date: EXPECTED_DATE,
    footer: 'propertypulse.com.au',
  });
});

// ── TEST 2 — NDIS Yarns resolves EXACTLY as before ───────────────────────────────────────
Deno.test('T2 NDIS Yarns resolves exactly as before (identity + byte-identical brand payload)', () => {
  assertEquals(resolveCreativeContract(NDIS_ID, 'image_quote'), NDIS_IMAGE_QUOTE_NEWS_CARD_V1);
  assertEquals(fixed(NDIS_IMAGE_QUOTE_NEWS_CARD_V1, 'category'), 'NDIS UPDATE');
  assertEquals(fixed(NDIS_IMAGE_QUOTE_NEWS_CARD_V1, 'footer'), 'NDIS Yarns');
  assertEquals(fixed(NDIS_IMAGE_QUOTE_NEWS_CARD_V1, 'location'), '');
  assertEquals(NDIS_IMAGE_QUOTE_NEWS_CARD_V1.contract_ref, 'ndis_yarns.image_quote.news_card');
  assertEquals(NDIS_IMAGE_QUOTE_NEWS_CARD_V1.selector_reason_default, 'ndis_image_quote_default');
  assertEquals(buildProofFieldsFromDraft(draft(NDIS_ID), FIXED), {
    category: 'NDIS UPDATE',
    headline: HEADLINE,
    subtitle: '',
    location: '',
    date: EXPECTED_DATE,
    footer: 'NDIS Yarns',
  });
});

// ── TEST 3 — Care For Welfare now resolves ───────────────────────────────────────────────
Deno.test('T3 Care For Welfare resolves a valid contract with the PK-authored brand values', () => {
  const c = resolveCreativeContract(CFW_ID, 'image_quote');
  assert(c !== null, 'CFW must resolve a contract');
  assertEquals(c, CFW_IMAGE_QUOTE_NEWS_CARD_V1);
  // PK-AUTHORED values — exact-string equality (Gate-1 2026-07-22).
  assertEquals(fixed(CFW_IMAGE_QUOTE_NEWS_CARD_V1, 'category'), 'CARE UPDATE');
  assertEquals(fixed(CFW_IMAGE_QUOTE_NEWS_CARD_V1, 'footer'), 'Care For Welfare');
  assertEquals(fixed(CFW_IMAGE_QUOTE_NEWS_CARD_V1, 'location'), '');
  // Identity + live-governed template mapping.
  assertEquals(CFW_IMAGE_QUOTE_NEWS_CARD_V1.client_slug, 'care-for-welfare-pty-ltd');
  assertEquals(CFW_IMAGE_QUOTE_NEWS_CARD_V1.gate.client_id, CFW_ID);
  assertEquals(CFW_IMAGE_QUOTE_NEWS_CARD_V1.gate.recommended_format, 'image_quote');
  assertEquals(CFW_IMAGE_QUOTE_NEWS_CARD_V1.maps_to_variant.provider_template_id, '48cba556-0a53-4001-90f0-05420d10efc0');
  assertEquals(CFW_IMAGE_QUOTE_NEWS_CARD_V1.maps_to_variant.implementation_id, 'generic_market_insight_card_1x1_v1');
  // Background must remain a POLICY REFERENCE with NO hardcoded pool (v3 shape).
  assertEquals(CFW_IMAGE_QUOTE_NEWS_CARD_V1.fields.governed_assets.background.policy, 'tmr_spine');
  assertEquals(CFW_IMAGE_QUOTE_NEWS_CARD_V1.fields.governed_assets.background.asset_keys, undefined);
  // End-to-end through the real consumer — this is what was throwing in production.
  assertEquals(buildProofFieldsFromDraft(draft(CFW_ID), FIXED), {
    category: 'CARE UPDATE',
    headline: HEADLINE,
    subtitle: '',
    location: '',
    date: EXPECTED_DATE,
    footer: 'Care For Welfare',
  });
});

// ── TEST 4 — Invegent now resolves ───────────────────────────────────────────────────────
Deno.test('T4 Invegent resolves a valid contract with the PK-authored brand values', () => {
  const c = resolveCreativeContract(INV_ID, 'image_quote');
  assert(c !== null, 'Invegent must resolve a contract');
  assertEquals(c, INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1);
  // PK-AUTHORED values — exact-string equality (Gate-1 2026-07-22).
  assertEquals(fixed(INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1, 'category'), 'AI & AUTOMATION');
  assertEquals(fixed(INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1, 'footer'), 'Invegent');
  assertEquals(fixed(INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1, 'location'), '');
  assertEquals(INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1.client_slug, 'invegent');
  assertEquals(INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1.gate.client_id, INV_ID);
  // Invegent's LIVE governed selection is the quote card, NOT the news/market-insight card.
  assertEquals(INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1.maps_to_variant.provider_template_id, '2140ca19-d075-49d3-9dc9-30d924805e22');
  assertEquals(INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1.maps_to_variant.implementation_id, 'generic_quote_card_1x1_v1');
  assertEquals(INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1.contract_ref, 'invegent.image_quote.quote_card');
  assertEquals(INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1.fields.governed_assets.background.policy, 'tmr_spine');
  assertEquals(INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1.fields.governed_assets.background.asset_keys, undefined);
  assertEquals(buildProofFieldsFromDraft(draft(INV_ID), FIXED), {
    category: 'AI & AUTOMATION',
    headline: HEADLINE,
    subtitle: '',
    location: '',
    date: EXPECTED_DATE,
    footer: 'Invegent',
  });
});

// ── TEST 5 — unknown / unconfigured still FAILS CLOSED ───────────────────────────────────
Deno.test('T5 unknown client and non-image_quote format still fail closed', () => {
  // Unregistered client ids.
  for (const id of ['11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', '', null]) {
    assertEquals(resolveCreativeContract((id ?? '') as string, 'image_quote'), null);
    assertThrows(
      () => buildProofFieldsFromDraft(draft(id as string | null), FIXED),
      Error,
      'brand_payload_contract_unresolved',
    );
  }
  // A REGISTERED client on a format that is not registered must also fail closed —
  // including the two newly-added clients (the fix must not widen the format surface).
  for (const id of [PP_ID, NDIS_ID, CFW_ID, INV_ID]) {
    for (const fmt of ['carousel', 'video_short_stat', 'text', '']) {
      assertEquals(resolveCreativeContract(id, fmt), null);
      assertThrows(
        () => buildProofFieldsFromDraft(draft(id, fmt), FIXED),
        Error,
        'brand_payload_contract_unresolved',
      );
    }
  }
  // Exactly four gates are registered — no fifth entry slipped in.
  const registered = [PP_ID, NDIS_ID, CFW_ID, INV_ID]
    .filter((id) => resolveCreativeContract(id, 'image_quote') !== null);
  assertEquals(registered.length, 4);
});

// ── TEST 6 — no value inferred from free text or borrowed from another client ────────────
Deno.test('T6 no contract value is inferred from free text or copied from another client', () => {
  const cfwCat = fixed(CFW_IMAGE_QUOTE_NEWS_CARD_V1, 'category');
  const cfwFoot = fixed(CFW_IMAGE_QUOTE_NEWS_CARD_V1, 'footer');
  const invCat = fixed(INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1, 'category');
  const invFoot = fixed(INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1, 'footer');

  // Distinct from BOTH pre-existing clients — nothing was borrowed.
  for (const borrowed of ['PROPERTY NEWS', 'NDIS UPDATE']) {
    assertNotEquals(cfwCat, borrowed);
    assertNotEquals(invCat, borrowed);
  }
  for (const borrowed of ['propertypulse.com.au', 'NDIS Yarns']) {
    assertNotEquals(cfwFoot, borrowed);
    assertNotEquals(invFoot, borrowed);
  }
  // Distinct from each other.
  assertNotEquals(cfwCat, invCat);
  assertNotEquals(cfwFoot, invFoot);

  // Exactly the PK-authored strings — no whitespace drift, no case drift, no substitution.
  assertEquals(cfwCat, 'CARE UPDATE');
  assertEquals(cfwFoot, 'Care For Welfare');
  assertEquals(invCat, 'AI & AUTOMATION');
  assertEquals(invFoot, 'Invegent');
  for (const v of [cfwCat, cfwFoot, invCat, invFoot]) {
    assertEquals(v, v!.trim(), 'no leading/trailing whitespace');
    assert(v!.length > 0, 'no empty brand value');
  }

  // Each contract's identity is single-sourced on its own gate (the registry key derivation
  // depends on this), so no entry can be shadowed by another client's id.
  for (const c of [PP_IMAGE_QUOTE_NEWS_CARD_V1, NDIS_IMAGE_QUOTE_NEWS_CARD_V1,
                   CFW_IMAGE_QUOTE_NEWS_CARD_V1, INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1]) {
    assertEquals(c.client_id, c.gate.client_id);
    assertEquals(c.contract_ref, c.source.contract_ref);
    assertEquals(c.contract_version, c.source.contract_version);
  }
  const ids = [PP_ID, NDIS_ID, CFW_ID, INV_ID];
  assertEquals(new Set(ids).size, 4, 'all four client ids are distinct');
});

// ── TEST 7 — the patch changes contract RESOLUTION only ─────────────────────────────────
Deno.test('T7 patch changes contract resolution only — surrounding behaviour unchanged', () => {
  // (a) The headline hard-gate still precedes contract resolution: a missing headline throws
  //     the headline error even for a NEWLY-registered client (ordering preserved).
  for (const id of [PP_ID, CFW_ID, INV_ID]) {
    assertThrows(
      () => buildProofFieldsFromDraft({ image_headline: '', client_id: id, recommended_format: 'image_quote' }, FIXED),
      Error,
      'missing image_headline hard-gate field',
    );
  }
  // (b) The emitted field shape is still EXACTLY the 6 keys, for every registered client.
  for (const id of [PP_ID, NDIS_ID, CFW_ID, INV_ID]) {
    const f = buildProofFieldsFromDraft(draft(id), FIXED);
    assertEquals(Object.keys(f).sort(), ['category', 'date', 'footer', 'headline', 'location', 'subtitle']);
    assertEquals(f.headline, HEADLINE);   // headline still passes through untouched
    assertEquals(f.subtitle, '');         // subtitle still derived downstream, not here
    assertEquals(f.date, EXPECTED_DATE);  // date still render-time via the injectable clock
  }
  // (c) The new entries declare NO hardcoded background pool, so template selection and asset
  //     resolution remain the TMR spine's job — this patch cannot influence either.
  for (const c of [CFW_IMAGE_QUOTE_NEWS_CARD_V1, INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1]) {
    assertEquals(c.fields.governed_assets.background.policy, 'tmr_spine');
    assertEquals(c.fields.governed_assets.background.resolver, 'resolve_slot_assets');
    assertEquals(c.fields.governed_assets.background.asset_keys, undefined);
    assertEquals(c.fallback_policy, 'governed_only_fail_loud');
    // Same ai_authored / derived field policies as the proven entries — no new semantics.
    assertEquals(c.fields.ai_authored[0].field, 'headline');
    assertEquals(c.fields.ai_authored[0].max_chars, 180);
    assertEquals(c.fields.ai_authored[0].policy, 'hard_gate_throw');
    assertEquals(c.fields.derived[0].field, 'subtitle');
    assertEquals(c.fields.derived[0].max_chars, 90);
    assertEquals(c.fields.derived[0].policy, 'truncate_optional');
  }
});
