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
    readonly asset_keys: readonly string[];
    readonly policy: CreativeContractFieldPolicy;
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
        max_chars: 90,
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
        // v2 (2026-07-04, PK decision "Option A-now-D-later"): background pool 3→5, aligned to
        // the governed resolver (resolve_slot_assets) eligible-pool rank order (B1-v3).
        asset_keys: Object.freeze(['bg_perth_cbd', 'bg_sydney_cbd', 'bg_brisbane_cbd', 'bg_pp_au_suburb_aerial_grid', 'bg_pp_home_keys_contract_table']),
        policy: 'deterministic_rotation_per_post_draft_id' as const,
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

// ---------------------------------------------------------------------------
// Deterministic resolver
// ---------------------------------------------------------------------------

/**
 * DETERMINISTIC, pure resolver. Returns PP_IMAGE_QUOTE_NEWS_CARD_V1 ONLY when the
 * client_id matches the governed Property-Pulse client AND the recommended_format is
 * exactly 'image_quote'; otherwise returns null.
 *
 * Keys on client_id, NEVER on slug (getBrandAndSlug can return the UUID as the slug —
 * see b1_production.ts). No side effects.
 */
export function resolveCreativeContract(
  clientId: string,
  recommendedFormat: string,
): CreativeContract | null {
  if (
    clientId === '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' &&
    recommendedFormat === 'image_quote'
  ) {
    return PP_IMAGE_QUOTE_NEWS_CARD_V1;
  }
  return null;
}
