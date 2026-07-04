# Property Pulse — Creative Pattern Library v1 (A1.2)

> **Status: A1.2 Pattern Library v1 — declarative only.** Formalises the first Property Pulse
> Creative Patterns introduced (as drafts) in A1.1 into governed **candidate** patterns.
> **Declarative only — NOT consumed by production workers.** No resolver / dashboard / worker /
> provider / render / DB change. Source of truth = ICE governance; providers remain renderers
> only; PK approval authority unchanged.
>
> Registry instance: [property-pulse.json](property-pulse.json) (`patterns[]`, registry v0.2).
> Schema: [registry-schema-v2.md](registry-schema-v2.md). Architecture: [creative-library-v2-architecture.md](creative-library-v2-architecture.md).

## 1. Purpose

Pattern Library v1 turns the proven Property Pulse News templates' reusable **structures** into
first-class, governed pattern candidates — the "how it is built", independent of any one theme —
so future Template Families can compose them. Patterns are documented and contract-defined here;
they are **not** rendered or consumed at runtime in this phase.

## 2. The sibling rule

- **Assets and Patterns are SIBLING governed libraries.**
- **Patterns may reference Assets** (e.g. `pp_background_plus_scrim_v1` references the governed
  backgrounds; `pp_branding_strip_v1` references `pp_logo_primary`).
- **Assets do NOT sit beneath Patterns.**
- **Template Families compose BOTH** Assets and Patterns.

## 3. The five initial patterns (status `candidate`)

| Pattern | type | required / optional fields | references assets | proof_posture |
|---|---|---|---|---|
| `pp_branding_strip_v1` | branding_strip | footer / — | `pp_logo_primary` | supported_by_host_render |
| `pp_headline_block_v1` | headline_block | headline / subtitle | — | supported_by_host_render |
| `pp_category_badge_v1` | category_badge | category / location, date | — | supported_by_host_render |
| `pp_background_plus_scrim_v1` | background_plus_scrim | background / — | `bg_perth_cbd`, `bg_sydney_cbd`, `bg_brisbane_cbd`, `bg_pp_au_suburb_aerial_grid`, `bg_pp_home_keys_contract_table` | supported_by_host_render |
| `pp_stat_card_v1` | stat_card | stat_value / stat_label, context_line, movement | — | candidate (not yet host-rendered) |

The first four appear in **both** proven PP News host variants (Gate C still-image `7243e040…`,
Gate D2 video `508b4365…`) and carry those as `supporting_render_log_ids`. `pp_stat_card_v1` is a
**forward-looking candidate** — the proven PP News family renders a headline, not a stat reveal —
so it is **not** in `property-pulse-news.composed_of_patterns` and its `used_by_template_families`
is empty.

## 4. Optional candidates — NOT added in v1 (evidence insufficient)

- **`pp_cta_strip`** — **deferred.** The proven templates' footer slot carries the **website**
  (e.g. `propertypulse.com.au`), governed by `pp_branding_strip_v1`; there is no distinct
  call-to-action element in a proven render to support a separate CTA pattern. Add later if a
  host render introduces a real CTA.
- **`pp_source_attribution`** — **deferred.** The current governed backgrounds are licensed under
  the Pexels License (**no attribution required**), and no proven render displays an attribution
  element. No evidence supports a source-attribution pattern in v1. Add later if a licence/source
  that mandates visible attribution is governed and rendered.

## 5. Pattern contracts

- **`pp_branding_strip_v1`** — logo top-left (≥44px inset, contained), brand bars off the canvas
  edges (9:16 safe layout), footer/website label bottom-centred; website lives in the footer slot
  (a distinct CTA is out of scope → `pp_cta_strip` deferred); asset dependency `pp_logo_primary`
  (wordmark text fallback). Maps to `Logo.source` + `Footer.text` (documentation only).
- **`pp_headline_block_v1`** — required `headline` (hard-gate), optional `subtitle`; centred;
  headline dominant (heavy/large), subtitle lighter/smaller; ~2–3 / ~1–2 line guidance; long text
  wraps within the reserved band (engine-handled). Maps to `Headline.text` + `Subtitle.text`.
- **`pp_stat_card_v1`** — required `stat_value` (hero number), optional `stat_label` / `context_line`
  / `movement`; stat value is the largest, heaviest element; optional +/- movement indicator.
  **Forward-looking** (matches the existing video stat-reveal composition; not in the proven PP
  News family).
- **`pp_category_badge_v1`** — required `category` (badge label, small-caps), optional
  `location`/`date` secondary line; placed above the headline; badge omitted if category absent
  (headline still renders). Maps to `CategoryBadge.text` / `Location.text` / `Date.text`.
- **`pp_background_plus_scrim_v1`** — required `background` that **must resolve to a governed asset
  via `resolve_brand_assets`** (never a raw URL); dark scrim over the photo for text legibility
  (PP backgrounds flagged `needs_scrim`); on no governed background the host render **fails loud**
  (no raw-URL fallback). Maps to `Background.source` + scrim.

## 6. Evidence / proof posture

Patterns are **not render outputs by themselves**, so no pattern claims `proven`:

- `status: candidate` for all five.
- `proof_posture: supported_by_host_render` for the four that appear in the proven host variants;
  their `evidence.supporting_render_log_ids` list the real host render_log_ids (`7243e040…`,
  `508b4365…`) as **supporting** evidence only — `evidence.proof_status` stays `unproven`.
- `proof_posture: candidate` for `pp_stat_card_v1` (no host-render support yet).
- **Only Template-Family variants carry a render-based `proven` status** (each with a real
  `render_log_id`). No false proof is claimed at the pattern or family level.

## 7. Relationship to the other layers

- **Style Guide** — every pattern `conforms_to_style_guide: property-pulse-styleguide-v1` (the
  draft style guide; to be formalised in A1.3).
- **Assets** — patterns **reference** governed assets (siblings); they never nest assets.
- **Template Families** — `property-pulse-news` **composes** the four bound patterns + assets; its
  proven variants are the render-proven objects.
- **Creative Instances** — produced render events (`m.post_render_log` + `render_spec.template`/`qa`),
  not authored here.

## 8. Posture

**The pattern library is declarative only and is NOT consumed by production workers.** No DB-backed
registry, no resolver/dashboard/worker/provider change, no new renders, no runtime consumption.

## 9. Next phase

**A1.3 Property Pulse Style Guide v1** — formalise `property-pulse-styleguide-v1` (the brand-level
rules these patterns conform to). Declarative, separately PK-gated.
