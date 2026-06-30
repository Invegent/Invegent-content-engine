# Template Metadata Registry v1 — design (TMR-1, docs/design only)

> **Status:** design brief **only**. **No Supabase tables, no migration, no runtime/dashboard/CCF
> change, no binding, no render, no publish, no deploy.** No `property-pulse.json`/`creative_contract.ts`/
> `registry-schema-v2.md`/schema/migration change, no `execute_sql`, no provider API call, no secrets in
> docs, no production enablement.
> **Produced:** 2026-06-30 (CE session). **Type:** docs/design (+ register record).
> **CE state at write time:** `main == origin/main == 502b31c8e39d915b1238239036bf2aa491d0b90b`;
> register **v4.31**. CCF-01 Phase 1 guards present and **dry-run / log-only** (not enforcing) — not
> modified by this slice.
> **Purpose:** define the **canonical metadata model** ICE will use to onboard, audit, classify, and
> govern provider templates (Creatomate today; HeyGen / future providers later) — a **first-class
> Template Metadata Registry, separate from variant binding**. Decides direction; builds nothing.

---

## 0. Core architectural principle (load-bearing — do NOT collapse)

These are **distinct objects** with distinct lifecycles. The registry models them separately:

| Concept | What it is |
|---|---|
| **Template family** | the **reusable creative pattern** above individual provider templates |
| **Provider template** | the **exact external template asset** (e.g. one Creatomate template id) — an **inventory object first** |
| **Field inventory** | the elements/fields a provider template exposes |
| **Output contract** | the template's physical output (dimensions / type / duration) |
| **Platform suitability** | **first-class, per-platform** — whether the template is physically usable there |
| **Format variant** | a **governed usage** of a template (an ICE `variant_key`) |
| **Client / brand assignment** | a **scoped permission / use-case** (where brand logo, colours, style, governance apply) |
| **Platform proof** | **separate** from template capability — real per-platform render/publish evidence |

> **Rule:** a provider template existing ≠ a governed variant; template capability ≠ platform proof;
> a generic template ≠ a client assignment. TMR keeps these separate so none is silently assumed.

---

## 1. Problem statement

ICE needs a **Template Metadata Registry** because:
- ICE has **creative-library / variant / proof** records, but **no DB-backed provider-template
  metadata table** — provider templates exist only as scattered ids in code/docs.
- **Creatomate is template-based** (renders reference a `provider_template_id` + `modifications`).
- **Provider template names may be misleading** — e.g. `news_quote_insight_1x1_v1` (`490ad9ea…`) reads
  like a quote card but its element set (Headline/Subtitle/Location/Date/Footer + CategoryBadge) is a
  **market-insight / headline card**, not a true quote card.
- A template may be **generic, brand-specific, client-specific, platform-specific, or unassigned** —
  ICE must record which.
- ICE needs to know **what fields a template exposes** before binding it to a variant.
- ICE needs to know **which platforms a template is physically suitable for**.
- ICE needs **auditability**: who captured the metadata, when, from what source, and what changed.

TMR is the missing **inventory + classification + governance** spine that feeds (but never replaces)
the downstream systems (§12).

---

## 2. Template family model

**Template Family** = the reusable creative pattern **above** individual provider templates.
Examples: `generic.real_estate.market_insight_card` · `property_pulse.news_card_family` ·
`generic.quote_card` · `generic.testimonial_card`.

| Field | Notes |
|---|---|
| `family_key` | stable unique key (e.g. `generic.real_estate.market_insight_card`) |
| `family_name` | human-readable |
| `creative_purpose` | what the pattern is for |
| `default_format_candidate` | the likely `ice_format_key` (candidate, not binding) |
| `default_variant_candidate` | the likely `variant_key` (candidate, not binding) |
| `scope` | `generic` / `brand` / `client` |
| `industry_vertical` | e.g. real_estate, disability_services |
| `description` | free text |
| `brand_constraints_optional` | optional brand rules if the family is brand-scoped |
| `status` | lifecycle (§9 family-level) |
| `created_at` / `updated_at` | audit timestamps |

A family **may contain multiple provider templates** for: **1:1 · 4:5 · 9:16 · 16:9** aspect ratios ·
**platform-specific** variants · **client-specific** variants · **v1 / v2 / v3** design versions. The
family is the umbrella; each concrete asset is a provider-template row (§3).

---

## 3. Provider template model

**Provider Template** = the exact external template asset. For Creatomate, a specific Creatomate
template id.

| Field | Notes |
|---|---|
| `provider` | `creatomate` / `heygen` / future |
| `provider_template_id` | the external id (e.g. `490ad9ea-7473-49e4-9d3c-e1ae8a12d790`) |
| `provider_template_name` | the external name (**may be misleading** — see §1) |
| `family_key` | FK → template family (§2) |
| `scope` | `generic` / `brand` / `client` |
| `client_id` | optional (only if client-scoped) |
| `brand_key` | optional (only if brand-scoped) |
| `width` / `height` | pixels |
| `aspect_ratio` | e.g. `1:1` |
| `output_type` | `static_image` / `animated_image` / `video` / `audio` / `unknown` |
| `file_type_candidate` | `jpg` / `png` / `mp4` / `unknown` |
| `duration_seconds` | optional (video/animated) |
| `provider_project_reference` | optional / **sanitized** (no secrets) |
| `inventory_status` | from the CI-3 status set (`missing`…`verified`/`stale`/`blocked`) |
| `inventory_source` | how captured (§10 `capture_method`) |
| `captured_by` / `captured_at` | audit |
| `inventory_hash` | hash of the sanitized captured inventory |
| `status` | lifecycle (§9) |

> **Security (binding):** do **not** store secrets, API keys, bearer tokens, raw provider credentials,
> billing data, or unsafe account metadata. Only safe ids / names / field metadata.

---

## 4. Field inventory model

How ICE captures the fields/elements **inside** a provider template (one row per element).

| Field | Notes |
|---|---|
| `element_id` | provider element id (if available) |
| `element_name` | e.g. `Headline` |
| `element_type` | provider type (text / image / shape / …) |
| `track` | provider track/layer (if applicable) |
| `dynamic` | `true` / `false` (modifiable vs fixed) |
| `field_kind` | `text` / `image` / `logo` / `background` / `shape` / `audio` / `video` / `unknown` |
| `default_value_safe` | optional — only if safe (no sensitive content) |
| `style_summary` | optional, sanitized |
| `constraints` | optional (max length, etc.) |
| `required_for_render` | optional flag |

**Sample inventory — `490ad9ea…` `news_quote_insight_1x1_v1`** (from the manual sanitized export):

| element_name | field_kind | dynamic | role |
|---|---|---|---|
| Background | image / background | dynamic | background photo |
| CategoryBadge | text / label | dynamic | category label |
| Logo | image / logo | dynamic | brand logo |
| Headline | text | dynamic | primary headline |
| Subtitle | text | dynamic | context |
| Location | text | dynamic | region |
| Date | text | dynamic | timeframe |
| Footer | text | dynamic | footer |
| Scrim | shape | **fixed** | readability overlay |

> 8 dynamic elements + 1 fixed Scrim. The element set (Headline/Subtitle/Location/Date/Footer +
> CategoryBadge) is a **market-insight / headline card** — **not** a quote-led card (no quote/attribution
> element). This is *why* the name is misleading and a registry is needed.

---

## 5. Output contract

The template's **physical output** (what it can produce):

`width` · `height` · `aspect_ratio` · `orientation` · `static / animated / video` · `duration` ·
`file_type` · `safe_export_formats` · `mobile_readability_notes` · `text_capacity_notes`.

> The **output contract determines possible platform suitability** (§6). For `490ad9ea…`: 1080×1080,
> square, static image, jpg — suitable for square feed images; not for video/vertical placements.

---

## 6. Platform suitability model (first-class, per-platform)

A provider template must be **assessable per platform** (one row per platform/placement).

| Field | Notes |
|---|---|
| `platform` | facebook / instagram / linkedin / youtube / … |
| `placement` | optional (feed / reel / story / …) |
| `suitability_status` | `unknown` / `candidate` / `not_suitable` / `needs_review` / `platform_safe` / `production_proven` / `blocked` |
| `reason` | why |
| `constraints` | platform constraints |
| `proof_reference` | optional (render/publish evidence id) |
| `last_reviewed_at` | audit |

**Example — the 1080×1080 `490ad9ea…` template:**

| platform / placement | suitability_status |
|---|---|
| facebook feed image | candidate |
| instagram feed image | candidate |
| linkedin feed image | candidate / unproven |
| youtube video | not_suitable |
| instagram reel/story | not_suitable |
| facebook video | not_suitable |

> **Platform suitability ≠ production proof.** `candidate`/`platform_safe` describe physical/safe-area
> fit; `production_proven` requires real per-platform render **and** publish evidence (§9).

---

## 7. Variant candidate mapping

How a provider template maps to **possible** ICE variants (candidate, not binding).

| Field | Notes |
|---|---|
| `format_key` | candidate `ice_format_key` |
| `variant_key` | candidate `variant_key` |
| `fit_status` | `unknown` / `candidate` / `strong_candidate` / `weak_candidate` / `needs_template_edit` / `unsuitable` / `blocked` |
| `fit_reason` | why |
| `required_field_mapping_status` | whether required ICE fields map to elements |
| `missing_fields` | list of unmapped required fields |
| `reviewed_by` / `reviewed_at` | audit |

**Example — `490ad9ea…`:**

| variant_key | fit_status |
|---|---|
| `market_update.v1` | **strong_candidate** (headline + supporting fields fit a market-insight treatment) |
| `quote_card.v1` | **needs_template_edit** (no quote/attribution element; would require a template edit) |
| `news_card.v1` | candidate, **needs review** (overlaps the proven news treatment; verify before any claim) |

> Mapping is **candidate analysis**, not a binding. A `strong_candidate` still needs definition,
> governance, render proof, and platform proof before anything is usable.

---

## 8. Client / brand assignment

Assignment is modelled **separately** from template metadata — a generic template can later be assigned
to Property Pulse, NDIS Yarns, or another client.

| Field | Notes |
|---|---|
| `template_id` | FK → provider template (§3) |
| `client_id` | optional |
| `brand_key` | optional |
| `assignment_scope` | `generic_allowed` / `brand_allowed` / `client_allowed` / `client_blocked` / `pilot_only` |
| `assignment_status` | `proposed` / `approved` / `visually_approved` / `client_enabled` / `production_proven` / `deprecated` / `blocked` |
| `style_guide_reference` | the brand style guide that governs this assignment |
| `approved_by` / `approved_at` | audit |

> **Assignment is where Property-Pulse-specific logo, colours, style rules, and governance apply.** The
> same generic family/template can be assigned to multiple clients, each with its own style guide,
> approval trail, and proof state — without duplicating the template inventory.

---

## 9. Governance and proof lifecycle

The lifecycle from an untrusted provider template to production-proven usage:

```
discovered → inventory_requested → inventory_captured → inventory_verified → classified →
field_mapped → governance_reviewed → smoke_rendered → visually_approved → platform_safe →
client_enabled → production_proven   (+ deprecated, blocked)
```

**Binding clarifications (anti-overclaim):**
- **Inventory captured ≠ renderable.**
- **Renderable ≠ platform safe.**
- **Platform safe ≠ client enabled.**
- **Client enabled ≠ production proven** (production proven needs real publish evidence).

> This generalises the FVI/CI proof chains and makes each transition evidence-gated. Different objects
> carry different slices of this lifecycle (template-level vs assignment-level vs platform-level).

---

## 10. Audit and change tracking

Required audit metadata per capture/change:

`captured_by` · `captured_at` · `capture_method` (`manual_sanitized_export` / `provider_read_endpoint`
/ `connector_read` / `render_probe` / `unknown`) · `source_reference` · `inventory_hash` ·
`changed_fields` · `reviewed_by` · `reviewed_at` · `decision` · `decision_reason` ·
`no_secret_assertion` · `no_mutation_assertion`.

> **Raw provider secrets must never be stored.** `inventory_hash` lets a capture be referenced without
> storing raw payloads; `no_secret_assertion` / `no_mutation_assertion` are explicit per-capture
> attestations (aligns with CI-4B §10). `render_probe` is recorded as a capture method only if a render
> was **separately authorized** — it is not a default inventory method.

---

## 11. Future Supabase direction (DESIGN ONLY — no tables in this slice)

**No tables are created here.** Future candidate tables (for a later **TMR-2 / TMR-3** task):
- `creative_template_family`
- `creative_provider_template`
- `creative_provider_template_field`
- `creative_template_platform_suitability`
- `creative_template_variant_candidate`
- `creative_template_client_assignment`
- `creative_template_inventory_audit`
- `creative_template_proof_event`

> **DB creation belongs to a later TMR-2/TMR-3 task** (design packet → security review → migration →
> apply under the PK gate). This brief defines the *model*, not the schema. No `registry-schema-v2.md`
> change either — that governs the declarative Creative Library JSON, a separate concern.

---

## 12. Relationship to existing ICE systems

| System | Relationship to TMR |
|---|---|
| **GFCP** | global platform × format capability — TMR informs *which templates physically support* a platform×format |
| **Client Overlay** | client × platform × format enablement + proof — TMR's client assignment (§8) feeds client enablement |
| **FVI** | format variant intake + variant lifecycle — TMR's variant-candidate mapping (§7) precedes a governed variant |
| **Creative Intake** | the operator flow / wizard for onboarding templates — TMR is the **data model** the wizard reads/writes |
| **Creative Library** | the governed registry of **proven** creative assets/contracts — TMR feeds it candidates; only proven ones graduate |
| **Format Mix** | only uses templates/variants **after** proof + eligibility — never reads TMR candidates directly |

> **Key rule:** **TMR *feeds* these systems; TMR does not itself enable production publishing.** A row
> in TMR is metadata + classification + governance state — not a live capability.

---

## 13. Example classification record (illustrative, non-binding)

```
provider:               creatomate
provider_template_id:   490ad9ea-7473-49e4-9d3c-e1ae8a12d790
provider_template_name: news_quote_insight_1x1_v1
width:                  1080
height:                 1080
aspect_ratio:           1:1
output_type:            static_image
field inventory:        Background, Scrim, CategoryBadge, Logo, Headline,
                        Subtitle, Location, Date, Footer
likely family:          generic.real_estate.market_insight_card
platform candidates:    facebook feed image, instagram feed image, linkedin feed image
variant candidates:
  market_update.v1:     promising candidate (strong_candidate)
  quote_card.v1:        needs_template_edit
```

> **This is not a binding. This is not production enablement. This is not render proof.** It is only an
> example of the registry model. `quote_card.v1` and `market_update.v1` remain **defined / unwired**;
> `news_card.v1` remains the **default + production-proven** variant (PP × facebook + instagram only).
> No proof is borrowed; no template is bound; nothing is enabled.

---

## Explicit non-claims / scope
- **Docs/design only.** No Supabase table/migration, no `execute_sql`, no runtime/edge/dashboard/CCF
  code change, no `property-pulse.json`/`creative_contract.ts`/`registry-schema-v2.md`/schema change, no
  provider/Creatomate/HeyGen API call, no render/publish/upload, no template binding, no deploy, no
  production enablement, no GFCP Layer 3, no Canonical Capability Model, **no secrets in docs.**
- CCF-01 Phase 1 guards remain **dry-run / log-only** and are **not modified**.
- The §13 record is **illustrative** — no binding, no enablement, no render proof.
- `quote_card.v1` (needs_template_edit) and `market_update.v1` (strong candidate) remain **defined /
  unwired**; `news_card.v1` remains default + production-proven (PP × facebook + instagram only).
- All tables/fields are a **non-authoritative future design** — DB creation is TMR-2/TMR-3.

## Cross-references
- CI-4B provider inventory read access pattern (v4.31): `docs/briefs/provider-inventory-read-access-pattern-v1.md`.
- CI-4 read attempt (BLOCKED, v4.30) + manual export source: `docs/briefs/format-variant-quote-card-creatomate-template-inventory.md`.
- CI-3 provider inventory capture model (v4.29): `docs/briefs/creative-intake-provider-inventory-capture-model-v1.md`.
- CI-2 wizard spec (v4.28) / Creative Intake Operator Flow v1 (v4.26): `docs/briefs/creative-intake-new-template-wizard-spec-v1.md`, `docs/briefs/creative-intake-operator-flow-v1.md`.
- FVI pilot records: `docs/creative-library/format-variant-intake-pp-image-quote-pilot-v1.md`.
- Register: v4.32 (this brief).
