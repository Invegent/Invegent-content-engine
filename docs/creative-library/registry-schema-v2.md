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
| `governance` | ✓ | `{ owner, approval, ai_role }` (ICE owns · PK approves · AI propose-only) |
| `palette` | ✓ | colours / scrim colour+opacity |
| `typography` | ✓ | font family/weights |
| `spacing` | ✓ | spacing/margins |
| `logo_rules` | ✓ | placement, which `logo_*` asset_type |
| `safe_area_rules` | ✓ | platform safe areas |
| `scrim_rules` | ✓ | when/how a scrim is applied for legibility |
| `voice_tone_rules` | ✓ | |
| `accessibility_rules` | ✓ | contrast / min font size |
| `evidence` | ✓ | see §6 (a style guide is **not** a render-based object — no `render_log_id`) |

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
| `conforms_to_style_guide` | ✓ | a `style_guide_key` |
| `references_assets` | ✓ | array of `asset_key` (may be empty) — references, never nesting |
| `required_fields` | ✓ | logical fields the pattern needs |
| `optional_fields` | ✓ | |
| `layout_rules` | ✓ | declarative layout/composition notes (may note the provider modification key, e.g. `Headline.text`, as documentation only — NOT a runtime binding) |
| `governance` | ✓ | |
| `evidence` | ✓ | see §6 |

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
| `notes` | free text |

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

## 7. Validation notes

- JSON must parse; markdown must render.
- Every `references_assets` / `expected_assets` `asset_key` must already exist as a governed
  asset OR be explicitly marked expected/unverified.
- Every `composed_of_patterns` entry must reference a `pattern_key` defined in the same registry.
- Every variant `proof_status:"proven"` must carry a real `render_log_id`.
- No runtime import/code reference is added by a registry edit (declarative files only).

> **Next phase:** A1.2 Pattern Library v1 (define the first governed Creative Patterns, declarative).
