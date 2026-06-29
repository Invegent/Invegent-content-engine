# FVI Slice 3A — `quote_card.v1` template-binding feasibility (read-only)

> **Status:** feasibility / design assessment **only**. **No binding, no render, no publish, no
> production enablement.** No `property-pulse.json` edit, no `creative_contract.ts` edit, no schema
> edit, no runtime/DB/dashboard change, no deploy. Read-only inspection + this docs note.
> **Produced:** 2026-06-30 (CE session). **CE state:** `main == origin/main == 9435946f5358c5c208963f63cd5389bdf740041c`; register **v4.23**.
> **Question:** can `property_pulse.image_quote.quote_card.v1` safely bind the unwired Creatomate
> template candidate `news_quote_insight_1x1_v1` (`490ad9ea-7473-49e4-9d3c-e1ae8a12d790`) as its
> future `maps_to_variant`?

---

## Verdict: **NEEDS_TEMPLATE_DEFINITION**
(plus a co-requisite **NEEDS_SCHEMA_DECISION** on the deterministic selector gate — see Q9.)

The candidate template is a **real provider template** but is **not defined enough to bind**: no
documented field/element inventory, no registry variant object, schema §8 requires a *proven render*
before a contract can be added, and the current deterministic resolver gate cannot distinguish a
second PP `image_quote` variant from the existing `news_card.v1`.

---

## Evidence inspected (read-only)
- `docs/briefs/branch-b-lane-b1-v2-expansion-brief.md` §7: "Two sibling 1:1 templates already exist
  but are unwired: `news_static_lower_third_1x1_v1`=`2fd50302…`, **`news_quote_insight_1x1_v1`=`490ad9ea-7473-49e4-9d3c-e1ae8a12d790` (PK-authored in B0; never wired).**"
- `docs/creative-library/property-pulse.json`: **0** occurrences of `news_quote_insight`/`490ad9ea` —
  it is **not** a registry object (no variant, no contract).
- `supabase/functions/image-worker/creative_contract.ts` resolver: gate is
  `clientId === '4036a6b5…' && recommendedFormat === 'image_quote' → return PP_IMAGE_QUOTE_NEWS_CARD_V1`.
- `docs/creative-library/registry-schema-v2.md` §3/§7/§8: variant objects need a `template_variant_key`
  + provider IDs; **§8: every `capability_contracts[].maps_to_variant` must reference a variant defined
  in the registry, and its `evidence.render_log_id` must be a real proven render; every variant
  `proof_status:"proven"` must carry a real `render_log_id`.**
- `news_card.v1` binding pattern: contract `maps_to_variant` → family `property-pulse-news` / variant
  `centred-scrim-1x1` (provider `fb9820f8…`), whose evidence carries real proven render IDs.
- No field/element inventory for `news_quote_insight_1x1_v1` exists anywhere in `docs/` or `supabase/`.

## Feasibility answers
1. **Exists in docs/registry evidence?** As a **noted provider-template reference** in 2 briefs
   (B1-v2 expansion §7 + the FVI intake doc), "PK-authored in B0; never wired." **Not** present in
   `property-pulse.json` (not a registry object).
2. **Creatomate template / pattern / note?** A **Creatomate provider template**; in the ICE registry
   it currently exists only as a brief-level note (no variant/contract object).
3. **Stable ID/reference?** **Yes** — `provider_template_id 490ad9ea-7473-49e4-9d3c-e1ae8a12d790`
   (consistent across both briefs).
4. **Matches the `quote_card.v1` field contract?** **UNKNOWN** — there is **no documented
   field/element inventory** for the template; we cannot confirm it exposes the quote fields.
5. **Supports `quote_text` / `attribution` / `topic_label` / `short_context` / `source_context`?**
   **UNKNOWN** (same gap as Q4) — the template's modifiable Creatomate elements are undocumented in-repo.
6. **Compatible with PP brand/style?** **Plausibly** (a PP-family B0 1:1 template, same provider/brand
   context as the proven `centred-scrim-1x1`), but **unverified** against the field contract.
7. **Schema allows it as `maps_to_variant` without a schema change?** **Not cleanly.** A capability
   contract's `maps_to_variant` must reference a **registry-defined variant**, and **§8 requires that
   variant's `evidence.render_log_id` be a real PROVEN render**. So a schema-valid contract binding is
   **not** achievable by a declarative patch alone (it needs a render — out of declarative scope). A
   declarative **variant object** (`proof_status:"unproven"`, `render_log_id:null`) *could* be added
   without a schema change, but that does not satisfy §8 for a contract and is still a `property-pulse.json` edit.
8. **Would adding it to `property-pulse.json` require vendoring into `creative_contract.ts`?** A
   **capability_contract that is wired** would need vendoring; a **variant object** would not (variants
   are not projected). A contract should not be wired without proof.
9. **Would vendoring change runtime, or only add a non-selected snapshot?** **SELECTOR-MODEL GAP
   (co-requisite NEEDS_SCHEMA_DECISION).** The deterministic resolver gate is `{client_id,
   recommended_format='image_quote'}` and already returns `news_card.v1` for PP. A second PP
   `image_quote` contract (`quote_card`) **cannot be selected** by the current gate inputs — wiring it
   would be unreachable or would break the deterministic 1:1 gate. Vendoring is therefore **not** a safe
   "add a non-selected snapshot" until the selector model can distinguish multiple variants within one
   `(client, format)`.
10. **Tests required before a binding patch?** creative-graph-auditor (registry shape / reference
    resolution / evidence-shape / runtime-import guard / vendored drift); a **real governed render** to
    satisfy §8 (proven `render_log_id` on the variant); deno `creative_contract_test.ts` +
    `creative_contract_parity_test.ts` (if/when vendored); and the selector-gate decision (Q9).
11. **Still missing after a binding (even once attempted):** `governed` ratification · `renderable`
    (render proof) · `visually_approved` · `platform_safe` · `client_enabled` · `production_proven` —
    **plus** the selector-gate disambiguation (Q9).

## What the next slice must do BEFORE any binding patch (prerequisites)
1. **Document the template's field/element inventory** (the Creatomate dynamic elements of
   `news_quote_insight_1x1_v1`) and map them to the `quote_card.v1` field contract (`quote_text`,
   `attribution`, `topic_label`, `short_context`, `source_context`). Resolves Q4/Q5.
2. **Resolve the selector-model question (Q9):** decide how the deterministic gate distinguishes
   multiple variants within `(PP, image_quote)` (e.g. an additional gate input / a variant selector) —
   a PK/schema decision, since today `(client_id, recommended_format)` is 1:1 with a single contract.
3. **Define a declarative Template-Family variant object** for the quote treatment in
   `property-pulse.json` `property-pulse-news.variants[]` (`proof_status:"unproven"`, no render_log) —
   the only schema-clean declarative step; a *contract* still cannot be added until §8's proven render exists.
4. **Govern + render** (later, separately-gated, NON-declarative): a controlled governed render
   (proven `render_log_id`) is required before a `capability_contract.maps_to_variant` is schema-valid (§8).

## If this had been READY_FOR_BINDING_PATCH (it is NOT) — for reference only
- files: `property-pulse.json` (+ vendored `creative_contract.ts` only once wired) — **blocked** by Q4/Q7/Q9.
- proof state after a declarative variant-object add would be at most `defined`/variant-`unproven`
  (still NOT renderable/governed/production_proven). Nothing would be enabled.

## What must still NOT be claimed
`quote_card.v1` remains **`defined` only**. **Not** governed, **not** renderable, **not**
`platform_safe`, **not** `client_enabled`, **not** `production_proven`. No proof is borrowed from
`news_card.v1`. The candidate template is **unwired and unproven**.

---

## Cross-references
- Intake doc (variant records): `docs/creative-library/format-variant-intake-pp-image-quote-pilot-v1.md` (§3 quote_card.v1).
- Template candidate origin: `docs/briefs/branch-b-lane-b1-v2-expansion-brief.md` §7.
- Schema: `docs/creative-library/registry-schema-v2.md` (§3 Variant, §7 Capability Contract, §8 validation).
- Resolver / vendored projection: `supabase/functions/{image,ai}-worker/creative_contract.ts`.
- Register: v4.23 (FVI pilot initial-definition stage complete).
