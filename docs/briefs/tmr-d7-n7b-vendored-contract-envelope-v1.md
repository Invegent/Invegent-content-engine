# TMR D7 · N7b — NDIS vendored CreativeContract (bounded envelope for the PK deploy gate)

**Status:** ENVELOPE (prep) — no code applied, no deploy. Awaits PK Gate-1 → ef-builder → full chain → **PK deploy gate**.
**Lane:** TMR D7 · **Tier T3** (production render worker; deploy = irreversible). **Render-critical.**
**Owner:** this lane (D7 steps 2–7). **Author:** orchestrator (main loop) driving through the TMR Lane Orchestrator (PK).
**Result doc:** `docs/briefs/results/tmr-d7-second-brand-proof-v1.md`.

## Why this is render-critical
Post-G0b, `image-worker/branch_b_proof.ts::buildProofFieldsFromDraft` (v3.28.0) sources `category`/`footer`/`location` from `resolveCreativeContract(client_id, recommended_format)`. For NDIS that returns **null** today → throw `brand_payload_contract_unresolved`. **NDIS cannot render image_quote until this vendored entry deploys.** Same shape/cost as G0b.

## The change (data addition — no guard-logic change)
Add ONE `CreativeContract` entry to `CREATIVE_CONTRACT_REGISTRY` in **both** vendored copies (kept byte-identical — the D6-3 cross-file parity test):
- `supabase/functions/image-worker/creative_contract.ts`
- `supabase/functions/ai-worker/creative_contract.ts`

**Guard verified — no code fix needed:** the completeness check is `if (category === undefined || footer === undefined)` (`branch_b_proof.ts:83`), a strict `=== undefined`. `fixedValue('footer')` returns the entry's `.value`, so `{field:'footer', value:''}` yields `''` (`!== undefined`) → **passes** (RESOLVED, not `brand_payload_contract_incomplete`). `footer=''` is a data value, not a guard change.

### Exact contract object (mirror of `PP_IMAGE_QUOTE_NEWS_CARD_V1`, NDIS values)
```ts
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
      Object.freeze({ field: 'headline', required: true, max_chars: 90, policy: 'hard_gate_throw' as const }),
    ]),
    derived: Object.freeze([
      Object.freeze({ field: 'subtitle', source: 'first non-empty paragraph of draft_body', required: false, max_chars: 90, policy: 'truncate_optional' as const }),
    ]),
    renderer_fixed: Object.freeze([
      Object.freeze({ field: 'category', value: 'NDIS UPDATE' }),
      Object.freeze({ field: 'date', value: 'render date (today)' }),
      Object.freeze({ field: 'footer', value: '' }),          // intentional RESOLVED BLANK (PK 2026-07-18)
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
    source_commit: '<ndis-yarns.json commit — pin at ef-builder>',
    contract_ref: 'ndis_yarns.image_quote.news_card',
    contract_version: 'v1',
  }),
});
```
Registry add (both files): extend `CREATIVE_CONTRACT_REGISTRY` with
`[`${NDIS_IMAGE_QUOTE_NEWS_CARD_V1.gate.client_id}::${NDIS_IMAGE_QUOTE_NEWS_CARD_V1.gate.recommended_format}`]: NDIS_IMAGE_QUOTE_NEWS_CARD_V1`.

**ef-builder finalizes** the annotation/stamping fields (`maps_to_variant`, `runtime_render_spec_template_variant`) so ai-worker's additive `draft_format.contract` stamping matches NDIS's actual `select_template` emission (G0a showed the generic winner stamps `variant_key='market_update.v1'`) — this is evidence-cosmetic, NOT render-blocking, but reconcile it. The render-critical fields are `gate` + `renderer_fixed`.

## Tests (hermetic — required before the gate)
1. `resolveCreativeContract('fb98a472-…','image_quote')` returns the NDIS contract (not null); every other pair still → null (PP unchanged).
2. **Empty-footer-resolves-clean (the flagged case):** `buildProofFieldsFromDraft({client_id: NDIS, recommended_format:'image_quote', image_headline:'x'}, today, resolveCreativeContract)` returns `{category:'NDIS UPDATE', footer:'', location:'', …}` and does **NOT** throw `brand_payload_contract_incomplete`. (Asserts `=== undefined` vs `''` distinction at the guard.)
3. **PP byte-identical:** all existing PP contract/proof-field tests unchanged.
4. **Cross-file parity:** the image-worker ↔ ai-worker `creative_contract.ts` no-drift test updated so BOTH carry the NDIS entry byte-identically.

## Deploy plan (HELD — PK authorises at the gate)
`supabase functions deploy ai-worker --no-verify-jwt` → `supabase functions deploy image-worker --no-verify-jwt` (flag REQUIRED on both — x-series-key callers; CLI default flips verify_jwt→true → 401/502). Deploy from the **worktree**, not the main checkout (Spine-Gen-v2/G0b lesson: main-checkout deploy redeployed OLD source — caught by artifact verify).
- **Version bumps:** image-worker v3.28.0→v3.29.0 · ai-worker v2.18.0→v2.19.0.
- **Post-deploy artifact verify:** grep DEPLOYED source (get_edge_function) for `NDIS_IMAGE_QUOTE_NEWS_CARD_V1` / `ndis_yarns.image_quote.news_card` on BOTH workers.

## Rollback
Redeploy prior binaries (image-worker v3.28.0 / ai-worker v2.18.0). No DB state to unwind (no migration/DML in N7b). Validate rollback path before the T3 apply.

## Preconditions (all green before the gate)
- N7a `ndis-yarns.json` structural PASS (creative-graph-auditor, done) ✅
- category/footer decided (PK 2026-07-18: `NDIS UPDATE` / `''`) ✅
- guard confirmed to treat `''` as resolved (source-verified) ✅
- final diff → `ask_chatgpt_review` pinned to the diff hash.

## STOP conditions (non-removable)
- PP not byte-identical (any PP contract/proof-field/parity test regresses).
- Cross-file parity test fails (image ≠ ai `creative_contract.ts`).
- Any `video-worker/**` file in the change set.
- External review non-clean → route by triage class → PK.
- Deployed-artifact mismatch (NDIS marker absent from either deployed worker post-deploy).
- Reviewed-input-hash ≠ current diff hash.

## Scope boundary / non-claims
N7b makes NDIS's contract RESOLVE; it does NOT by itself make NDIS render — still gated on N5 background eligible (brand_texture-01) + N2 assignment + N3 proof event + N1 governance flip, each its own PK gate. `footer=''` passing the guard is CODE-verified; **clean footer suppression (no divider/orphan spacing) is a RENDER property confirmed at the step-7 visual gate** (supported by PP's empty `Location=''` precedent on the same generic template; `Footer` is a distinct element — confirm specifically, or via a Creatomate template GET pre-check). No proof claimed; nothing deployed by this envelope.
