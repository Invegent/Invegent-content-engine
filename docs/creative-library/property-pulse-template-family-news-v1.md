# Property Pulse — Template Family v1: `property-pulse-news` (A1.4)

> **Status: A1.4 Template Families v1 — declarative only, family `candidate`.** Formalises the
> existing `property-pulse-news` template family and its two proven variants against the v2 model.
> **Declarative only — NOT consumed by production workers.** No resolver / dashboard / worker /
> provider / render / DB change. **No new templates, variants, or provider template IDs.** Source
> of truth = ICE governance; providers remain renderers only; PK approval authority unchanged.
>
> Registry: [property-pulse.json](property-pulse.json) (`template_families[0]`). Schema:
> [registry-schema-v2.md](registry-schema-v2.md). Style guide:
> [property-pulse-styleguide-v1.md](property-pulse-styleguide-v1.md). Patterns:
> [property-pulse-pattern-library-v1.md](property-pulse-pattern-library-v1.md).

## 1. Purpose

`property-pulse-news` is the governed **composition** of the Property Pulse news-card creative —
branding strip + headline + category badge + background/scrim — realised across a **static 16:9**
variant and an **animated 9:16** variant. It is a composition object, not a render.

## 2. Governance role

ICE owns the composition; **PK ratifies**; **AI proposes, never approves**. The family **composes**
governed Patterns + Assets and **conforms to** the style guide. It does **not** render — its
**variants** carry the render proof.

## 3. Relationship to `property-pulse-styleguide-v1`

`conforms_to_style_guide: property-pulse-styleguide-v1` (the `candidate` brand constitution). The
family and both variants must obey the style guide's palette/typography/layout/scrim/safe-area/
accessibility rules. **Style-guide conformance is a PK/brand judgment — not asserted here as
verified; only the reference resolves.**

## 4. Relationship to Pattern Library v1

The family **composes 4** governed pattern candidates: `pp_branding_strip_v1`,
`pp_headline_block_v1`, `pp_category_badge_v1`, `pp_background_plus_scrim_v1`. **`pp_stat_card_v1`
is deliberately NOT composed** — the proven renders show a headline, not a stat reveal (it stays a
forward-looking, unbound candidate). Patterns remain `candidate`; the family does **not** promote them.

## 5. Relationship to governed assets

`expected_assets: [pp_logo_primary, bg_perth_cbd]`. Assets are a **sibling** governed library,
referenced by `asset_key` (never raw URLs); resolution stays via `resolve_brand_assets()` —
**unchanged**. The family references assets; it does not own files.

## 6. Family-level proof posture

`status: candidate` · `proof_posture: governance_candidate` · `evidence.proof_status: unproven`
(`render_log_id: null`). **The family is a composition, not a render** — it makes **no** direct
render-proof claim. Proof lives at the variant level via `proven_variants:
[centred-scrim-16x9, centred-scrim-9x16-video]`.

> **Distinction:** **Family** = governed composition candidate · **Variant** = render-proven
> implementation target · **Instance** = produced render event (`m.post_render_log`).

## 7. Variant matrix

| Variant | aspect | output | ice_format_key | provider_template_id | composes | proof | render_log_id |
|---|---|---|---|---|---|---|---|
| `centred-scrim-16x9` | 16:9 | jpg | `image_quote` | `48cba556…` | 4 patterns | **proven** (Gate C) | `7243e040…` |
| `centred-scrim-9x16-video` | 9:16 | mp4 | `video_short_stat` | `bc32f52f…` | 4 patterns | **proven** (Gate D2) | `508b4365…` |

Both variants render via Creatomate (provider `creatomate`); required fields = headline, subtitle,
category, location, date, footer, background, logo.

## 8. Static 16:9 variant contract (`centred-scrim-16x9`)

- **Use:** static news card (still image) for feed/website.
- **Required fields:** headline, subtitle, category, location, date, footer, background, logo. **Optional:** none.
- **Expected governed assets:** `pp_logo_primary`, `bg_perth_cbd`.
- **Composed patterns:** branding_strip, headline_block, category_badge, background_plus_scrim.
- **Style-guide conformance:** conforms to `property-pulse-styleguide-v1` (reference resolves).
- **Evidence:** Gate C ICE-controlled template smoke `7243e040…` (registers v3.81); also a governed
  manual render `e7d096b8…` (Intake Lane 3B, resolver_used=true, fallback_taken=false).
- **Proof gate:** Gate C. **proof_status:** proven.
- **Known limitations:** static image only (no motion/audio); 16:9 master only (1:1 / 4:5 future);
  does not compose `pp_stat_card_v1`.

## 9. Video/stat 9:16 variant contract (`centred-scrim-9x16-video`)

- **Use:** animated news card (MP4) for short-video surfaces.
- **Required fields:** headline, subtitle, category, location, date, footer, background, logo. **Optional:** none.
- **Expected governed assets:** `pp_logo_primary`, `bg_perth_cbd`.
- **Composed patterns ACTUALLY used:** branding_strip, headline_block, category_badge,
  background_plus_scrim — **NOT** `pp_stat_card_v1`.
- **Style-guide conformance:** conforms to `property-pulse-styleguide-v1` (reference resolves).
- **Evidence:** Gate D2 ICE-controlled animated/video template smoke `508b4365…` (registers v3.82).
- **Proof gate:** Gate D2. **proof_status:** proven.
- **Known limitations:** the `ice_format_key` is `video_short_stat`, but the **proven render composes
  the NEWS patterns (headline), NOT a stat reveal** — `pp_stat_card_v1` is forward-looking and not
  rendered here. No voice/captions in the proven smoke.

## 10. Creative instance relationship

**Creative Instances are produced render events, not authored registry objects.** Known instances
(from existing evidence only, recorded in the registry's `creative_instances`): governed manual
render `e7d096b8…` (16:9), Gate C smoke `7243e040…`, Gate D2 smoke `508b4365…`. **No new instances
invented; none marked proven without real render evidence.**

## 11. Evidence / proof posture

Family = `unproven` composition (no `render_log_id`); variants = `proven` with real
`render_log_id`s; legacy `implementations[]` retain their historic proof fields verbatim (each
`render_log_id` equals its mapped variant's). **No false proof; the family is not marked
render-proven.**

## 12. Declarative-only statement

**This template family is declarative only and is NOT consumed by production workers.** No
DB-backed registry, no resolver/dashboard/worker/provider change, no new renders, no runtime
consumption. The workers that produced the proven renders are unchanged.

## 13. Known limitations

- Only 16:9 (static) and 9:16 (video) variants exist — proven, no others; 1:1 / 4:5 are future.
- `pp_stat_card_v1` is unbound (not rendered by either proven variant).
- Style-guide conformance is referenced, not independently verified (a PK/brand judgment).
- Brand palette primary/secondary remain `to_be_confirmed` in the style guide.

## 14. Next phase recommendation

The Lane A — Creative Design System sequence (A1.0–A1.4) now has a complete declarative spine
(style guide → patterns → template family → variants → evidence). Recommended next: **A1.5
Dashboard Evolution** (surface the v2 layers; revisit IA — was deferred) and/or **A1.6 Intake
Generalisation** (extend intake review-packets/scores to patterns/style-guides/families). Each is a
separate, PK-gated lane.
