# Creative Score definitions — Creative Library Intake v0 (deliverable D)

> **Advisory only.** Creative Scores help PK triage and prioritise candidates. They are
> **never** a gate and **never** an approval. **PK approval remains mandatory**, and
> `license_confidence` **does not** override the **no-license → no-governance** hard rule.

## Scale

All component scores use an integer **0–5** scale (0 = unusable/unknown, 5 = excellent),
unless noted. Composite scores (`overall_score`, `priority_score`) are advisory roll-ups on
a **0–100** scale. A score of `null` means "not assessed" (treated as unknown, never as a pass).

## A) Asset score fields

| Field | Meaning |
|---|---|
| `visual_quality` | Resolution, composition, sharpness, professional look. |
| `brand_fit` | Fit with the brand's palette / tone / style. |
| `location_fit` | Match to the intended location/market (e.g. Sydney bg for a Sydney post). |
| `text_overlay_suitability` | Clear space + contrast for headline/scrim overlay (ties to `safe_for_text_overlay`). |
| `topic_fit` | Suitability for the intended topics/verticals. |
| `license_confidence` | Confidence the licence is valid + sufficient for our use. **Advisory only — does NOT override no-license-no-governance.** A high score on an asset with no recorded licence is still `blocked_license`. |
| `reuse_potential` | How many future posts/formats the asset could serve. |
| `overall_score` | Advisory 0–100 roll-up of the above (suggested weighting below). |

**Suggested advisory weighting for `overall_score`** (sums to 100; tune later — advisory):
visual_quality 20 · brand_fit 20 · location_fit 15 · text_overlay_suitability 15 ·
topic_fit 15 · reuse_potential 15. `license_confidence` is reported **but excluded** from
`overall_score` so that creative quality and licence validity stay separate signals (licence
is a hard gate, not a quality dimension).

## B) Template score fields

| Field | Meaning |
|---|---|
| `reuse_potential` | How many posts/clients/topics the template could serve. |
| `build_complexity` | Effort to build/validate the template (higher = more complex). |
| `creative_value` | Quality/impact uplift the template adds vs existing options. |
| `platform_coverage` | How many target platforms/aspect ratios it covers. |
| `proof_effort` | Effort to prove it end-to-end (gates A→D-style). |
| `priority_score` | Advisory 0–100 roll-up balancing value vs effort. |

**Suggested advisory `priority_score`** (advisory): reward `reuse_potential`, `creative_value`,
`platform_coverage`; penalise `build_complexity`, `proof_effort`. e.g.
`priority_score ≈ clamp( (reuse_potential + creative_value + platform_coverage)×6 −
(build_complexity + proof_effort)×4 , 0, 100 )`. Tune later; advisory only.

## Clarifications (binding)

- **Scores are advisory only** — they inform PK triage/prioritisation; they never approve,
  gate, or govern anything.
- **PK approval remains mandatory** for every asset and every template.
- **`license_confidence` does not override `no-license → no-governance`.** A missing/ambiguous
  licence is `blocked_license` regardless of any score.
- Scores live in `asset_meta.creative_score` (asset) or alongside the proposed registry entry
  (template) — never in a constrained column; no migration.
