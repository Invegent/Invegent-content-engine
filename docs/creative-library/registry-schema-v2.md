# Creative Library Registry Schema v2 (A1.1 — declarative)

> **Status: A1.1 Registry Schema Evolution — declarative only.** This document defines the
> v2 registry schema that supports the ratified Creative Library v2 model
> ([creative-library-v2-architecture.md](creative-library-v2-architecture.md), A1.0).
>
> **Declarative only — NOT consumed by production workers.** No resolver change · no dashboard
> change · no runtime behaviour change · no DB-backed registry introduced. **Source of truth
> remains ICE governance; providers remain renderers only.** PK approval authority unchanged.
>
> Concrete instance: [property-pulse.json](property-pulse.json) (registry_version `v0.2`).

## Layer model (recap)

`Style Guide → (governs) → Assets + Patterns → (compose) → Template Families → (instantiate as)
→ Creative Instances → Evidence`. **Assets and Patterns are SIBLING governed libraries**
(patterns may reference assets; assets do not sit beneath patterns). Template Families compose
both. (Assets = the existing `c.client_brand_asset` library via `resolve_brand_assets`, unchanged.)

---

## 1. Style Guide

Brand-level governing rules that constrain everything below.

| Field | Required | Notes |
|---|---|---|
| `style_guide_key` | ✓ | stable key, e.g. `property-pulse-styleguide-v1` |
| `client_slug` | ✓ | |
| `version` | ✓ | |
| `status` | ✓ | `draft` \| `candidate` \| `active` |
| `purpose` | ✓ | one-line statement of the brand constitution's role |
| `governance` | ✓ | `{ owner, approval, ai_role }` (ICE owns · PK approves · AI propose-only) |
| `palette` | ✓ | colours / scrim colour+opacity. Unknown brand colours marked `to_be_confirmed` (never invented) |
| `typography` | ✓ | font family/weights/hierarchy (`to_be_confirmed` if undocumented) |
| `spacing` | ✓ | spacing/margins |
| `logo_rules` | ✓ | placement, which `logo_*` asset_type |
| `safe_area_rules` | ✓ | platform safe areas |
| `scrim_rules` | ✓ | when/how a scrim is applied for legibility |
| `voice_tone_rules` | ✓ | tone (`to_be_confirmed` if undocumented; never invented) |
| `accessibility_rules` | ✓ | contrast / min font size / text-over-image |
| `asset_rules` | ✓ | how governed assets (by `asset_key`) are used — assets governed separately; `resolve_brand_assets()` unchanged |
| `pattern_rules` | ✓ | which patterns the guide governs (patterns stay `candidate`) |
| `template_family_rules` | ✓ | template families must conform; the guide does not render |
| `proof_posture` | ✓ | for a style guide: `governance_candidate` (see §5) |
| `evidence` | ✓ | see §5 (a style guide is **not** a render-based object — no `render_log_id`; may list `supporting_render_log_ids`) |

---

## 2. Creative Patterns

Reusable creative **structures** (the "how it is built"), independent of theme. A **sibling**
of Assets; **may reference** Assets; **composed by** Template Families.

| Field | Required | Notes |
|---|---|---|
| `pattern_key` | ✓ | e.g. `pp_headline_block_v1` |
| `client_slug` | ✓ | |
| `version` | ✓ | |
| `status` | ✓ | `draft` \| `candidate` \| `active` |
| `pattern_type` | ✓ | enum below |
| `purpose` | ✓ | one-line statement of what the pattern is for |
| `used_by_template_families` | ✓ | array of `template_family_key` that compose this pattern (may be empty for an unbound candidate) |
| `conforms_to_style_guide` | ✓ | a `style_guide_key` |
| `references_assets` | ✓ | array of `asset_key` (may be empty) — references, never nesting |
| `required_fields` | ✓ | logical fields the pattern needs |
| `optional_fields` | ✓ | |
| `layout_rules` | ✓ | declarative layout/composition notes (may note the provider modification key, e.g. `Headline.text`, as documentation only — NOT a runtime binding) |
| `accessibility_rules` | ✓ | contrast / legibility / min font size notes |
| `governance` | ✓ | |
| `proof_posture` | ✓ | `draft` \| `candidate` \| `supported_by_host_render` \| `proven` (see §5) |
| `evidence` | ✓ | see §5 (a pattern is **not** a render output by itself — no independent `render_log_id`; may list `supporting_render_log_ids` of proven host variants) |

**`pattern_type` enum (initial):** `branding_strip` · `headline_block` · `stat_card` ·
`category_badge` · `background_plus_scrim` · `cta_strip` · `source_attribution`.

---

## 3. Template Families

Provider-backed groupings that **compose** Assets + Patterns into a renderable family, across
variants. (Evolution: template families become first-class objects, not plain strings.)

| Field | Required | Notes |
|---|---|---|
| `template_family_key` | ✓ | e.g. `property-pulse-news` |
| `client_slug` | ✓ | |
| `version` | ✓ | |
| `status` | ✓ | `draft` \| `candidate` \| `active` |
| `compatible_ice_format_keys` | ✓ | EXISTING governed format keys only (no new taxonomy) |
| `composed_of_patterns` | ✓ | array of `pattern_key` |
| `expected_assets` | ✓ | array of `asset_key` |
| `variants` | ✓ | array of Variant objects (below) |
| `governance` | ✓ | |
| `evidence` | ✓ | see §5. A family object holds **NO independent render-based proof**: `evidence.proof_status` stays `unproven` (`render_log_id` null) and points to its proven variants via a `proven_variants` list. |

### Variant object

| Field | Required | Notes |
|---|---|---|
| `template_variant_key` | ✓ | e.g. `centred-scrim-16x9` |
| `aspect_ratio` | ✓ | |
| `output_type` | ✓ | |
| `render_engine` | ✓ | e.g. `creatomate` |
| `provider` | ✓ | |
| `provider_template_id` | ✓ | the real provider template id |
| `required_fields` | ✓ | |
| `expected_assets` | ✓ | |
| `proof_status` | ✓ | `unproven` \| `proven` (proven requires a real `render_log_id`) |
| `proof_gate` | ✓ | e.g. `Gate C` |
| `evidence` | ✓ | see §6 |

---

## 4. Creative Instances

**Creative Instances are NOT manually authored registry objects.** They are **produced render
events** — a concrete instantiation of a Template Family variant with specific field values +
resolved assets. They are represented by:

- `m.post_render_log` rows,
- `render_spec.template` (template identity + governed `asset_ids` + `resolver_used` + `fallback_taken`),
- `render_spec.qa` (when present),
- linked draft / render / proof evidence.

The registry declares families/variants; the **instance lives in the evidence spine**, not as a
hand-authored registry entry.

---

## 5. Evidence (generalised)

Every governed object carries an `evidence` block.

| Field | Notes |
|---|---|
| `status` | object status echo (`draft`/`candidate`/`active`/`proven`) |
| `proof_status` | `unproven` \| `proven` |
| `proof_gate` | e.g. `Gate C` / `Gate D2` (null if not render-proven) |
| `render_log_id` | a REAL `m.post_render_log.render_log_id` — **mandatory for a render-based `proven` claim** |
| `render_spec_template_id` | the template identity recorded in evidence |
| `source_commit` | the commit the object/proof was landed at |
| `review_packet` | path to the PK review packet, if any |
| `approved_by` / `approved_at` | PK approval trail |
| `supporting_render_log_ids` | (patterns) real `render_log_id`s of proven host variants that exercise the pattern — SUPPORTING evidence, NOT proof of the pattern itself |
| `notes` | free text |

**`proof_posture` vocabulary (patterns; advisory, distinct from the binding `proof_status`):**
- `draft` — proposed; contract not yet complete.
- `candidate` — contract-complete governed candidate; **not** yet shown in a proven host render (`used_by_template_families` may be empty).
- `supported_by_host_render` — appears in one or more **proven** host-variant renders (record those in `supporting_render_log_ids`) — SUPPORTING evidence only; the pattern is still not independently render-proven.
- `proven` — independently render-proven (requires a real `render_log_id`). In practice only **variants** reach this; a pattern does not, since a pattern is not a render output by itself.
- `governance_candidate` — (Style Guides) a contract-complete governing object awaiting PK ratification. A style guide is **not** a render output, so it never carries `proven`/`render_log_id`; conformance may be **supported** by host renders (listed in `supporting_render_log_ids`). Stays `candidate` until PK ratification is formally recorded.

**Proof discipline (binding):**
- **No object may claim `proven` without evidence.**
- **No render-based object may claim `proven` without a real `render_log_id`.**
- Style Guides and Patterns are **not** render-based; absent independent proof they stay
  `draft`/`candidate`/`unproven` (a non-null `render_log_id` is not invented for them).
- A **Template Family** object is a COMPOSITION, not a single render — it carries **no
  independent render-based `proven` claim**. Its `evidence.proof_status` stays `unproven`
  (`render_log_id` null) and points to its proven **variants** (each with a real
  `render_log_id`) via a `proven_variants` list. Only **variants** carry a render-based
  `proven` status.

---

## 6. Registry posture (every v2 registry document must state)

- **Declarative only — not consumed by production workers.**
- No resolver change · no dashboard change · no runtime behaviour change.
- No DB-backed registry introduced (the registry is repo/config files, not tables).
- Source of truth remains **ICE governance**; **providers remain renderers only**.
- PK approval authority unchanged; AI may propose, never approves.

---

## 7. Capability Contract (v0.3 — runtime-projection source of truth)

> **Added v0.3 (ACI Foundation v0 — Slice A).** A **Capability Contract** is the canonical,
> machine-projectable description of what a single governed **variant** requires when it is
> produced in a specific live path. It is the **source of truth** the runtime consumes via a
> **vendored projection** — the registry stays declarative; **no production worker imports this
> JSON at runtime** (the runtime-import guard is unchanged). A contract does NOT add render
> proof — it points at a variant whose proof lives in §6 evidence.

A `capability_contracts[]` entry has this shape:

| Field | Required | Notes |
|---|---|---|
| `contract_key` | ✓ | the canonical **variant_key**, e.g. `property_pulse.image_quote.news_card.v1` |
| `contract_ref` | ✓ | stable ref without the version, e.g. `property_pulse.image_quote.news_card` |
| `contract_version` | ✓ | semver, e.g. `v1` — bumped only when fields/limits/policy change |
| `client_slug` / `client_id` | ✓ | the scoped client |
| `status` | ✓ | `draft` \| `candidate` \| `active` (PK ratifies; a contract is not auto-`active`) |
| `gate` | ✓ | the **deterministic resolver inputs**: `{ client_id, recommended_format }` (the only inputs that select this contract; no AI, no scoring) |
| `maps_to_variant` | ✓ | `{ template_family_key, template_variant_key, provider, provider_template_id, implementation_id, runtime_render_spec_template_variant }` — binds the contract to a variant defined in §3 and to the **runtime** template identity. Record any spelling/identity drift between the registry `template_variant_key` and the worker's emitted `render_spec.template.template_variant` here. |
| `fields` | ✓ | field classes: `ai_authored[]` (e.g. headline — `{field, required, max_chars, policy}`), `derived[]` (e.g. subtitle — `{field, source, required, max_chars, policy}`), `renderer_fixed[]` (`{field, value}`), `governed_assets` (`{logo:{asset_key,policy}, background:{asset_keys,policy}}` OR — contract v3+, AP-4 2026-07-06 — a **policy-reference** background `{policy:'tmr_spine', resolver, note}` with NO `asset_keys`: the runtime background is resolved per-render by the TMR spine rather than snapshotted as a key list, ending per-key contract lag), and — for governed **video** contracts (contract v-video, Phase 2 2026-07-08) — `motion` `{duration_seconds, aspect_ratio, frame_rate, output_type, audio}`: the video field class the static/image contracts lack, declaring the temporal + output shape of the render (e.g. `{duration_seconds:20, aspect_ratio:'9:16', frame_rate:30, output_type:'mp4', audio:'none'}`; `audio:'none'` = silent, the first video slice — voice/captions are a later lane) |
| `fallback_policy` | ✓ | e.g. `governed_only_fail_loud` (no legacy fallback) |
| `validator_policy` | ✓ | declares later-slice behaviour: v0 records what each ACI slice will enforce (C = check, E = one bounded repair then fail-loud). Declarative in Slice A. |
| `evidence_fields_for_renderer` | ✓ | the jsonb keys later slices STAMP into `draft_format` / `render_spec`: `variant_key`, `contract_ref`, `contract_version`, `selector_reason` |
| `selector_reason_default` | ✓ | the deterministic `selector_reason` value, e.g. `pp_image_quote_default` |
| `runtime_consumption` | ✓ | MUST state: vendored projection only; no live JSON import |
| `governance` | ✓ | `{ owner, approval, ai_role }` |
| `evidence` | ✓ | points at the mapped variant's proof (`render_log_id`) + any production instance(s); the contract itself adds NO new render proof. Its `proof_status` is `unproven` (no proof yet) or `proven_via_mapped_variant` (proof is INHERITED from the variant in `maps_to_variant`, never independent) — a contract never claims a bare `proven`. |

**Contract discipline (binding):**
- A contract **adds no render proof.** Its proof is the proof of the variant it `maps_to_variant`
  (which must satisfy §6 — a real `render_log_id` to claim `proven`).
- `gate` must be **deterministic** (config inputs only — `client_id` + `recommended_format`).
  No AI, no mix, no scoring selects a contract.
- The runtime consumes a **vendored projection** of the contract; a registry edit adds **no**
  runtime import (the guard in §6/§8 is unchanged).
- A contract is `candidate` until PK ratifies; it is never auto-`active`.

---

## 8. Validation notes

- JSON must parse; markdown must render.
- Every `references_assets` / `expected_assets` `asset_key` must already exist as a governed
  asset OR be explicitly marked expected/unverified.
- Every `composed_of_patterns` entry must reference a `pattern_key` defined in the same registry.
- Every variant `proof_status:"proven"` must carry a real `render_log_id`.
- Every `capability_contracts[].maps_to_variant` must reference a `template_variant_key`
  defined in the same registry; its `evidence.render_log_id` must be a real proven render.
- No runtime import/code reference is added by a registry edit (declarative files only).

> **Next phase:** A1.2 Pattern Library v1 (define the first governed Creative Patterns, declarative).
