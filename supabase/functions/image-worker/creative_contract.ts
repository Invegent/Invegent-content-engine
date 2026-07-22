// creative_contract.ts — ACI Foundation v0 / Slice A2 (image-worker).
//
// Vendored projection of registry v0.3 contract `property_pulse.image_quote.news_card.v1`
// @ source_commit 2ac172b. Declarative source of truth = docs/creative-library/property-pulse.json.
//
// This module is a SELF-CONTAINED, SIDE-EFFECT-FREE vendored SNAPSHOT: there is NO live JSON
// import, NO read of docs/creative-library, NO network/DB/storage/secret/Deno.serve access.
// The contract values below are hard-coded so the runtime never depends on the declarative
// registry at render time (runtime-import guard). Pure constants from ./b1_production.ts are
// referenced ONLY by the test's no-drift consistency guard, not by this projection.
//
// WIRED (ADDITIVE STAMPING ONLY): ai-worker imports resolveCreativeContract to stamp the additive
// m.post_draft.draft_format.contract evidence (variant_key / contract_ref / contract_version /
// selector_reason) on the gated PP image_quote path (Slice B1). It does NOT select formats, does NOT
// change render selection, and enables NO variant. The image-worker render path does NOT import this
// module (it renders via the vendored b1_production constants). No format-selection / render-behaviour
// change on any path; the projection remains a pure vendored snapshot.

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

/** Field-handling policy a renderer must apply to a contract field. */
export type CreativeContractFieldPolicy =
  | 'hard_gate_throw'
  | 'truncate_optional'
  | 'fixed'
  | 'deterministic_rotation_per_post_draft_id';

/** An AI-authored field the AI layer must supply. */
export interface CreativeContractAiAuthoredField {
  readonly field: string;
  readonly required: boolean;
  readonly max_chars: number;
  readonly policy: CreativeContractFieldPolicy;
}

/** A field DERIVED from another source (e.g. draft_body) rather than AI-authored. */
export interface CreativeContractDerivedField {
  readonly field: string;
  readonly source: string;
  readonly required: boolean;
  readonly max_chars: number;
  readonly policy: CreativeContractFieldPolicy;
}

/** A renderer-fixed field with a constant (or render-time) value. */
export interface CreativeContractRendererFixedField {
  readonly field: string;
  readonly value: string;
}

/** Governed asset bindings (logo + rotating backgrounds). */
export interface CreativeContractGovernedAssets {
  readonly logo: {
    readonly asset_key: string;
    readonly policy: CreativeContractFieldPolicy;
  };
  readonly background: {
    // AP-4 contract v3 (2026-07-06): rebound from a hardcoded asset_keys pool to a
    // POLICY REFERENCE (policy: 'tmr_spine', resolver: 'resolve_slot_assets'). asset_keys
    // is now OPTIONAL — the shape expresses EITHER the legacy key list OR the policy
    // reference (absence of asset_keys is the load-bearing property of the v3 shape).
    readonly policy: string;
    readonly asset_keys?: readonly string[];
    readonly resolver?: string;
    readonly note?: string;
  };
}

/** The gate identity a resolver keys on (client_id + recommended_format). */
export interface CreativeContractGate {
  readonly client_id: string;
  readonly recommended_format: string;
}

/** The template/provider the contract maps to. */
export interface CreativeContractMapsToVariant {
  readonly template_family_key: string;
  readonly template_variant_key: string;
  readonly provider: string;
  readonly provider_template_id: string;
  readonly implementation_id: string;
  readonly runtime_render_spec_template_variant: string;
}

/** Provenance of this vendored projection. */
export interface CreativeContractSource {
  readonly registry_version: string;
  readonly source_commit: string;
  readonly contract_ref: string;
  readonly contract_version: string;
}

/** A complete vendored creative contract projection. */
export interface CreativeContract {
  readonly contract_key: string;
  readonly contract_ref: string;
  readonly contract_version: string;
  readonly client_id: string;
  readonly client_slug: string;
  readonly gate: CreativeContractGate;
  readonly maps_to_variant: CreativeContractMapsToVariant;
  readonly fields: {
    readonly ai_authored: readonly CreativeContractAiAuthoredField[];
    readonly derived: readonly CreativeContractDerivedField[];
    readonly renderer_fixed: readonly CreativeContractRendererFixedField[];
    readonly governed_assets: CreativeContractGovernedAssets;
  };
  readonly fallback_policy: string;
  readonly evidence_fields_for_renderer: readonly string[];
  readonly selector_reason_default: string;
  readonly source: CreativeContractSource;
}

// ---------------------------------------------------------------------------
// Vendored contract snapshot (registry v0.3 @ commit 2ac172b)
// ---------------------------------------------------------------------------

/**
 * Vendored projection of `property_pulse.image_quote.news_card.v1`.
 * Frozen (deeply) so it is immutable at runtime.
 */
export const PP_IMAGE_QUOTE_NEWS_CARD_V1: CreativeContract = Object.freeze({
  contract_key: 'property_pulse.image_quote.news_card.v1',
  contract_ref: 'property_pulse.image_quote.news_card',
  contract_version: 'v2',
  client_id: '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd',
  client_slug: 'property-pulse',
  gate: Object.freeze({
    client_id: '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd',
    recommended_format: 'image_quote',
  }),
  maps_to_variant: Object.freeze({
    template_family_key: 'property-pulse-news',
    template_variant_key: 'centred-scrim-1x1',
    provider: 'creatomate',
    provider_template_id: 'fb9820f8-3fee-4448-b324-3d500fa74b40',
    implementation_id: 'news_static_centered_scrim_1x1_v1',
    runtime_render_spec_template_variant: 'centered-scrim-1x1',
  }),
  fields: Object.freeze({
    ai_authored: Object.freeze([
      Object.freeze({
        field: 'headline',
        required: true,
        max_chars: 180,
        policy: 'hard_gate_throw' as const,
      }),
    ]),
    derived: Object.freeze([
      Object.freeze({
        field: 'subtitle',
        source: 'first non-empty paragraph of draft_body',
        required: false,
        max_chars: 90,
        policy: 'truncate_optional' as const,
      }),
    ]),
    renderer_fixed: Object.freeze([
      Object.freeze({ field: 'category', value: 'PROPERTY NEWS' }),
      Object.freeze({ field: 'date', value: 'render date (today)' }),
      Object.freeze({ field: 'footer', value: 'propertypulse.com.au' }),
      Object.freeze({ field: 'location', value: '' }),
    ]),
    governed_assets: Object.freeze({
      logo: Object.freeze({
        asset_key: 'pp_logo_primary',
        policy: 'fixed' as const,
      }),
      background: Object.freeze({
        // AP-4 contract v3 (2026-07-06): rebound from a hardcoded 5-key asset_keys pool to a
        // policy reference. NO asset_keys — the contract declares no hardcoded pool (its
        // absence is the load-bearing property). contract_version STAYS 'v2': governed_assets
        // is an inert annotation, never stamped into render evidence (D-AP4-2).
        policy: 'tmr_spine',
        resolver: 'resolve_slot_assets',
        note: 'Runtime background resolved per-render by the TMR spine (buildTmrRenderPlan -> select_template -> resolve_slot_assets); contract declares NO hardcoded pool — ends per-key contract lag permanently (Option D, v4.95+). contract_version stays v2: governed_assets.background is an annotation, never stamped into render evidence.',
      }),
    }),
  }),
  fallback_policy: 'governed_only_fail_loud',
  evidence_fields_for_renderer: Object.freeze([
    'variant_key',
    'contract_ref',
    'contract_version',
    'selector_reason',
  ]),
  selector_reason_default: 'pp_image_quote_default',
  source: Object.freeze({
    registry_version: 'v0.3',
    source_commit: '2ac172b',
    contract_ref: 'property_pulse.image_quote.news_card',
    contract_version: 'v2',
  }),
});

/**
 * Vendored projection of `ndis_yarns.image_quote.news_card.v1` (TMR D7 N7b).
 * Frozen (deeply) so it is immutable at runtime. Registered alongside PP so the governed
 * image_quote path resolves NDIS Yarns instead of throwing brand_payload_contract_unresolved.
 * Background is a POLICY REFERENCE (policy:tmr_spine, resolver:resolve_slot_assets, NO
 * hardcoded pool) — same v3 shape as PP; runtime background resolved per-render by the TMR spine.
 */
export const NDIS_IMAGE_QUOTE_NEWS_CARD_V1: CreativeContract = Object.freeze({
  contract_key: 'ndis_yarns.image_quote.news_card.v1',
  contract_ref: 'ndis_yarns.image_quote.news_card',
  contract_version: 'v1',
  client_id: 'fb98a472-ae4d-432d-8738-2273231c1ef4',
  client_slug: 'ndis-yarns',
  gate: Object.freeze({
    client_id: 'fb98a472-ae4d-432d-8738-2273231c1ef4',
    recommended_format: 'image_quote',
  }),
  maps_to_variant: Object.freeze({
    template_family_key: 'ndis-yarns-news',
    template_variant_key: 'generic-market-insight-1x1',
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
      Object.freeze({ field: 'category', value: 'NDIS UPDATE' }),
      Object.freeze({ field: 'date', value: 'render date (today)' }),
      Object.freeze({ field: 'footer', value: 'NDIS Yarns' }),
      Object.freeze({ field: 'location', value: '' }),
    ]),
    governed_assets: Object.freeze({
      logo: Object.freeze({ asset_key: 'ny_logo_full_colour', policy: 'fixed' as const }),
      background: Object.freeze({ policy: 'tmr_spine', resolver: 'resolve_slot_assets', note: 'No hardcoded pool; runtime background resolved per-render by the TMR spine.' }),
    }),
  }),
  fallback_policy: 'governed_only_fail_loud',
  evidence_fields_for_renderer: Object.freeze(['variant_key', 'contract_ref', 'contract_version', 'selector_reason']),
  selector_reason_default: 'ndis_image_quote_default',
  source: Object.freeze({
    registry_version: 'v0.1',
    source_commit: 'c15245a',
    contract_ref: 'ndis_yarns.image_quote.news_card',
    contract_version: 'v1',
  }),
});

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
      // cc-0049: the quote-card winner (generic_quote_card_1x1_v1) has Attribution +
      // SourceLabel dynamic text elements that no B1Fields member fed. These are PK-AUTHORED
      // brand values (Gate-1 2026-07-22) and live HERE, per-client, NOT in the template-keyed
      // winner map — a template-keyed literal would leak Invegent's brand onto any other
      // client selecting the same winner (property-pulse holds a visually_approved assignment
      // on this exact template).
      Object.freeze({ field: 'attribution', value: 'Invegent — AI & Automation' }),
      Object.freeze({ field: 'source_label', value: 'invegent.com' }),
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

// ---------------------------------------------------------------------------
// Per-(client_id, recommended_format) contract registry + deterministic resolver
// ---------------------------------------------------------------------------

/**
 * In-module contract registry keyed on `${gate.client_id}::${gate.recommended_format}`.
 * Spine Gen v2 D6-3 (2026-07-17): the resolver is NO LONGER hardcoded to the single PP UUID
 * literal — it is a registry lookup, so PP behaviour is IDENTICAL but a second governed brand
 * becomes a DATA addition (one entry), not a code edit. The registry currently holds ONLY the
 * PP entry; its key is derived from the contract's OWN gate.client_id / gate.recommended_format
 * so the gate identity stays single-sourced on the frozen contract object.
 */
const CREATIVE_CONTRACT_REGISTRY: Readonly<Record<string, CreativeContract>> = Object.freeze({
  [`${PP_IMAGE_QUOTE_NEWS_CARD_V1.gate.client_id}::${PP_IMAGE_QUOTE_NEWS_CARD_V1.gate.recommended_format}`]:
    PP_IMAGE_QUOTE_NEWS_CARD_V1,
  [`${NDIS_IMAGE_QUOTE_NEWS_CARD_V1.gate.client_id}::${NDIS_IMAGE_QUOTE_NEWS_CARD_V1.gate.recommended_format}`]:
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
});

/**
 * DETERMINISTIC, pure resolver. Returns the registered CreativeContract for the
 * (clientId, recommendedFormat) pair, or null. Keys on client_id, NEVER on slug
 * (getBrandAndSlug can return the UUID as the slug — see b1_production.ts). No side effects.
 * For PP + 'image_quote' this returns PP_IMAGE_QUOTE_NEWS_CARD_V1 exactly as before; every
 * other pair (non-PP client, or PP + non-image_quote format) → null.
 */
export function resolveCreativeContract(
  clientId: string,
  recommendedFormat: string,
): CreativeContract | null {
  return CREATIVE_CONTRACT_REGISTRY[`${clientId}::${recommendedFormat}`] ?? null;
}
