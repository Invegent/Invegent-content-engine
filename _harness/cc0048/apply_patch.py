#!/usr/bin/env python
"""cc-0048 — insert the CFW + Invegent creative-contract entries into BOTH vendored copies.

Writes the SAME text into ai-worker/ and image-worker/ creative_contract.ts so the frozen
constants stay deep-equal (creative_contract_parity_test.ts asserts this).

category/footer are EXPLICIT PK-AUTHORED brand values (Gate-1 2026-07-22) — not derived,
not generated from free text.
"""
import io, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
TARGETS = [
    ROOT / "supabase/functions/image-worker/creative_contract.ts",
    ROOT / "supabase/functions/ai-worker/creative_contract.ts",
]

NEW_CONTRACTS = """
/**
 * Vendored projection of `care_for_welfare.image_quote.news_card.v1` (cc-0048 incident recovery).
 * Frozen (deeply) so it is immutable at runtime. Registered alongside PP + NDIS so the governed
 * image_quote path resolves Care For Welfare instead of throwing brand_payload_contract_unresolved.
 *
 * category + footer are EXPLICIT PK-AUTHORED brand values (Gate-1, 2026-07-22). They are NOT
 * derived from any database field and NOT generated from free text; any change to them is a PK
 * brand decision, not a code fix.
 *
 * maps_to_variant mirrors the LIVE governed selection — select_template('care-for-welfare-pty-ltd',
 * ...,'image_quote') returns generic_market_insight_card_1x1_v1 — and uses the AUTHORITATIVE
 * governed family/variant keys (c.creative_template_family / c.creative_template_variant_candidate)
 * rather than the client-branded names used by the older PP/NDIS entries. These fields are inert
 * documentation (not read on any runtime path), so accuracy is preferred over imitation.
 *
 * Background is a POLICY REFERENCE (policy:tmr_spine, resolver:resolve_slot_assets, NO hardcoded
 * pool) — same v3 shape as PP + NDIS.
 */
export const CFW_IMAGE_QUOTE_NEWS_CARD_V1: CreativeContract = Object.freeze({
  contract_key: 'care_for_welfare.image_quote.news_card.v1',
  contract_ref: 'care_for_welfare.image_quote.news_card',
  contract_version: 'v1',
  client_id: '3eca32aa-e460-462f-a846-3f6ace6a3cae',
  client_slug: 'care-for-welfare-pty-ltd',
  gate: Object.freeze({
    client_id: '3eca32aa-e460-462f-a846-3f6ace6a3cae',
    recommended_format: 'image_quote',
  }),
  maps_to_variant: Object.freeze({
    template_family_key: 'generic.real_estate.market_insight_card',
    template_variant_key: 'market_update.v1',
    provider: 'creatomate',
    provider_template_id: '48cba556-0a53-4001-90f0-05420d10efc0',
    implementation_id: 'generic_market_insight_card_1x1_v1',
    runtime_render_spec_template_variant: 'generic-market-insight-1x1',
  }),
  fields: Object.freeze({
    ai_authored: Object.freeze([
      Object.freeze({ field: 'headline', required: true, max_chars: 180, policy: 'hard_gate_throw' as const }),
    ]),
    derived: Object.freeze([
      Object.freeze({ field: 'subtitle', source: 'first non-empty paragraph of draft_body', required: false, max_chars: 90, policy: 'truncate_optional' as const }),
    ]),
    renderer_fixed: Object.freeze([
      Object.freeze({ field: 'category', value: 'CARE UPDATE' }),
      Object.freeze({ field: 'date', value: 'render date (today)' }),
      Object.freeze({ field: 'footer', value: 'Care For Welfare' }),
      Object.freeze({ field: 'location', value: '' }),
    ]),
    governed_assets: Object.freeze({
      logo: Object.freeze({ asset_key: 'cfw_logo_mark_colour_plate', policy: 'fixed' as const }),
      background: Object.freeze({ policy: 'tmr_spine', resolver: 'resolve_slot_assets', note: 'No hardcoded pool; runtime background resolved per-render by the TMR spine.' }),
    }),
  }),
  fallback_policy: 'governed_only_fail_loud',
  evidence_fields_for_renderer: Object.freeze(['variant_key', 'contract_ref', 'contract_version', 'selector_reason']),
  selector_reason_default: 'cfw_image_quote_default',
  source: Object.freeze({
    registry_version: 'v0.1',
    source_commit: '8a885df',
    contract_ref: 'care_for_welfare.image_quote.news_card',
    contract_version: 'v1',
  }),
});

/**
 * Vendored projection of `invegent.image_quote.quote_card.v1` (cc-0048 incident recovery).
 * Frozen (deeply) so it is immutable at runtime.
 *
 * category + footer are EXPLICIT PK-AUTHORED brand values (Gate-1, 2026-07-22) — NOT derived from
 * any database field and NOT generated from free text.
 *
 * contract_ref deliberately reads `.quote_card` rather than the `.news_card` used by PP/NDIS:
 * Invegent's LIVE governed selection is generic_quote_card_1x1_v1 (select_template), a different
 * template class. contract_ref IS stamped into render evidence, so it must be accurate.
 *
 * Background is a POLICY REFERENCE (policy:tmr_spine, resolver:resolve_slot_assets, NO hardcoded pool).
 */
export const INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1: CreativeContract = Object.freeze({
  contract_key: 'invegent.image_quote.quote_card.v1',
  contract_ref: 'invegent.image_quote.quote_card',
  contract_version: 'v1',
  client_id: '93494a09-cc89-41d1-b364-cb63983063a6',
  client_slug: 'invegent',
  gate: Object.freeze({
    client_id: '93494a09-cc89-41d1-b364-cb63983063a6',
    recommended_format: 'image_quote',
  }),
  maps_to_variant: Object.freeze({
    template_family_key: 'generic.news.quote_card',
    template_variant_key: 'quote_card.v1',
    provider: 'creatomate',
    provider_template_id: '2140ca19-d075-49d3-9dc9-30d924805e22',
    implementation_id: 'generic_quote_card_1x1_v1',
    runtime_render_spec_template_variant: 'generic-quote-card-1x1',
  }),
  fields: Object.freeze({
    ai_authored: Object.freeze([
      Object.freeze({ field: 'headline', required: true, max_chars: 180, policy: 'hard_gate_throw' as const }),
    ]),
    derived: Object.freeze([
      Object.freeze({ field: 'subtitle', source: 'first non-empty paragraph of draft_body', required: false, max_chars: 90, policy: 'truncate_optional' as const }),
    ]),
    renderer_fixed: Object.freeze([
      Object.freeze({ field: 'category', value: 'AI & AUTOMATION' }),
      Object.freeze({ field: 'date', value: 'render date (today)' }),
      Object.freeze({ field: 'footer', value: 'Invegent' }),
      Object.freeze({ field: 'location', value: '' }),
    ]),
    governed_assets: Object.freeze({
      logo: Object.freeze({ asset_key: 'invegent_logo_square_brand_bg', policy: 'fixed' as const }),
      background: Object.freeze({ policy: 'tmr_spine', resolver: 'resolve_slot_assets', note: 'No hardcoded pool; runtime background resolved per-render by the TMR spine.' }),
    }),
  }),
  fallback_policy: 'governed_only_fail_loud',
  evidence_fields_for_renderer: Object.freeze(['variant_key', 'contract_ref', 'contract_version', 'selector_reason']),
  selector_reason_default: 'invegent_image_quote_default',
  source: Object.freeze({
    registry_version: 'v0.1',
    source_commit: '8a885df',
    contract_ref: 'invegent.image_quote.quote_card',
    contract_version: 'v1',
  }),
});
"""

OLD_REGISTRY = """  [`${NDIS_IMAGE_QUOTE_NEWS_CARD_V1.gate.client_id}::${NDIS_IMAGE_QUOTE_NEWS_CARD_V1.gate.recommended_format}`]:
    NDIS_IMAGE_QUOTE_NEWS_CARD_V1,
});"""

NEW_REGISTRY = """  [`${NDIS_IMAGE_QUOTE_NEWS_CARD_V1.gate.client_id}::${NDIS_IMAGE_QUOTE_NEWS_CARD_V1.gate.recommended_format}`]:
    NDIS_IMAGE_QUOTE_NEWS_CARD_V1,
  // cc-0048 incident recovery (2026-07-22): CFW + Invegent were rendering image_quote drafts with
  // no registry entry, so resolveCreativeContract returned null and the v3.28.0 fail-closed guard
  // threw brand_payload_contract_unresolved on every render. Adding the entries is a DATA addition
  // through the existing registry — the guard itself is unchanged and still fails closed for any
  // unregistered (client_id, format) pair.
  [`${CFW_IMAGE_QUOTE_NEWS_CARD_V1.gate.client_id}::${CFW_IMAGE_QUOTE_NEWS_CARD_V1.gate.recommended_format}`]:
    CFW_IMAGE_QUOTE_NEWS_CARD_V1,
  [`${INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1.gate.client_id}::${INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1.gate.recommended_format}`]:
    INVEGENT_IMAGE_QUOTE_QUOTE_CARD_V1,
});"""

# Anchor: the end of the NDIS constant, immediately before the registry section banner.
ANCHOR = """});

// ---------------------------------------------------------------------------
// Per-(client_id, recommended_format) contract registry + deterministic resolver
// ---------------------------------------------------------------------------"""

REPLACEMENT = """});
""" + NEW_CONTRACTS + """
// ---------------------------------------------------------------------------
// Per-(client_id, recommended_format) contract registry + deterministic resolver
// ---------------------------------------------------------------------------"""

failures = []
for path in TARGETS:
    src = path.read_text(encoding="utf-8")
    if "CFW_IMAGE_QUOTE_NEWS_CARD_V1" in src:
        failures.append(f"{path}: already patched")
        continue
    if src.count(ANCHOR) != 1:
        failures.append(f"{path}: anchor count = {src.count(ANCHOR)} (expected 1)")
        continue
    if src.count(OLD_REGISTRY) != 1:
        failures.append(f"{path}: registry block count = {src.count(OLD_REGISTRY)} (expected 1)")
        continue
    out = src.replace(ANCHOR, REPLACEMENT, 1).replace(OLD_REGISTRY, NEW_REGISTRY, 1)
    path.write_text(out, encoding="utf-8", newline="")
    print(f"PATCHED {path}")

if failures:
    print("FAILED:", *failures, sep="\n  ")
    sys.exit(1)
print("OK - both vendored copies patched identically")
