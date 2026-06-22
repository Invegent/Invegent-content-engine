# Property Pulse — Style Guide v1 (`property-pulse-styleguide-v1`, A1.3)

> **Status: A1.3 Style Guide v1 — declarative only, `candidate`.** The brand constitution that
> governs Property Pulse Assets, Patterns, and Template Families. **Declarative only — NOT
> consumed by production workers.** No resolver / dashboard / worker / provider / render / DB
> change. Source of truth = ICE governance; providers remain renderers only; PK approval
> authority unchanged.
>
> Registry: [property-pulse.json](property-pulse.json) (`style_guide`). Schema:
> [registry-schema-v2.md](registry-schema-v2.md). Patterns:
> [property-pulse-pattern-library-v1.md](property-pulse-pattern-library-v1.md).
>
> **No invented brand facts:** anything not evidenced by existing templates/registry is marked
> **`to_be_confirmed`**.

## 1. Purpose

`property-pulse-styleguide-v1` is the brand-level rule set — the "constitution" — that GOVERNS how
Property Pulse Assets and Patterns are used and how Template Families must look, across static,
carousel, and video formats. It is a governing object, not a renderable one.

## 2. Governance role

- **ICE owns** creative governance; **PK ratifies**; **AI may propose, never approves.**
- The style guide **governs** Assets (usage), Patterns (the Pattern Library v1 candidates), and
  Template Families (conformance). It does **not** itself render and does **not** own asset files.

## 3. Relationship to Assets and Patterns

- **Assets** are a **sibling** governed library (`c.client_brand_asset`), referenced by `asset_key`,
  never raw URLs. The style guide constrains **how** assets are used (placement, scrim) but does not
  own them. **`resolve_brand_assets()` is unchanged; no new resolver behaviour is introduced.**
- **Patterns** (siblings of Assets) **conform to** this style guide. It governs the five Pattern
  Library v1 candidates; **patterns stay `candidate`** (not promoted to proven).

## 4. Brand identity rules

- **Brand name treatment:** "Property Pulse" — consistent wordmark/logo usage.
- **Logo usage:** governed `pp_logo_primary` (asset_type `logo_primary`), top-left placement
  (`Logo.source` slot); wordmark text fallback if no logo asset.
- **Footer / brand strip:** footer carries the website (e.g. `propertypulse.com.au`), bottom-centred
  — see pattern `pp_branding_strip_v1`.
- **Consistency across formats:** the same branding strip + headline + category badge + background
  treatment applies across static (16:9), carousel, and video (9:16) formats.

## 5. Palette

- **primary:** `to_be_confirmed` · **secondary:** `to_be_confirmed` — brand colours are sourced at
  render time from `c.client_brand_profile` (`brand_colour_primary`/`secondary`) and are **not**
  documented here. **No brand colours invented.**
- **scrim:** dark scrim ~`#0B1220` at ~62% opacity — **evidence-derived** from the proven
  caption/headline scrim.

## 6. Typography

- **font_family:** Montserrat — **evidence-derived** from the existing ICE render specs.
- **hierarchy:** Headline dominant (heavy/large) > category badge / labels > subtitle
  (lighter/smaller) > footer (small).
- Exact weights/sizes per format: **`to_be_confirmed`**. **No font names invented.**

## 7. Layout

- **Centred headline** treatment (supported by the proven PP News templates).
- **Safe areas:** 9:16 reserves top/bottom brand bands (per the video-worker layout, y140 / y1620);
  16:9 uses a centred scrim/text panel; logo + footer kept inside the platform safe area.
- **Footer spacing:** ≥44px side insets; footer bottom-centred.
- **Hierarchy:** headline is the focal element; category badge above; subtitle below; footer subordinate.
- **Aspect ratios:** 16:9 (static) and 9:16 (video) are the proven targets; 1:1 / 4:5 are future.

## 8. Background and scrim

- **Governed background requirement:** backgrounds must resolve to a **governed asset** via
  `resolve_brand_assets` (`asset_key`), never a raw URL.
- **Dark scrim / contrast:** a dark scrim is applied over photographic backgrounds (governed PP
  backgrounds are flagged `needs_scrim`) so text-over-image meets contrast.
- **Text safety:** headline/category text sits over the scrim band, not bare photo.
- **Fallback posture:** if no governed background resolves, the host render **fails loud** (no
  raw-URL fallback) — consistent with the proven governed render path.

## 9. Accessibility

- **Minimum contrast:** white text over the dark scrim for legibility (exact ratio `to_be_confirmed`).
- **Readable text:** minimum legible font sizes per the proven templates.
- **No text over a busy image without the scrim.**
- **Safe-area awareness:** text / logo / footer kept inside platform safe areas.
- **Logo visibility:** logo legible against the scrim/background.

## 10. Voice and tone

- **Tone:** property market news — factual, concise, informative (**evidence-derived** from the
  proven PP News headlines: market-update / price-news).
- Marketing personality beyond this: **`to_be_confirmed`**. **Nothing invented.**

## 11. Evidence / proof posture

A style guide is **not a render output**, so it carries **no** `render_log_id` and is **never**
render-proven:

- `status: candidate` · `proof_posture: governance_candidate`.
- **Supporting evidence (conformance, NOT proof):** the proven PP News host renders (Gate C
  `7243e040…`, Gate D2 `508b4365…`), Pattern Library v1, and the governed static render
  `e7d096b8…` — listed as `supporting_render_log_ids`.
- **No PK ratification is formally recorded yet**, so the status stays `candidate`. No false proof
  is claimed.

## 12. Declarative-only statement

**This style guide is declarative only and is NOT consumed by production workers.** No DB-backed
registry, no resolver/dashboard/worker/provider change, no new renders, no runtime consumption.
Template Families must conform to it; **variants carry the render proof**; the style guide governs
but does not render.

## 13. Next phase

**A1.4 Template Families v1** — formalise the `property-pulse-news` template family (and its
variants) against this style guide. Declarative, separately PK-gated.
