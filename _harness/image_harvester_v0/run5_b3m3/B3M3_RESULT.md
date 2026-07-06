# B3 manifest 3 (P1 rows 7–9) — RESULT

> **PK VISUAL VERDICTS (2026-07-06):**
> - **Mortgage (Żerdzicki 27920274): ACCEPT_VISUAL_ONLY** → future pool-neutral inactive intake queue.
> - **Inspection (Żerdzicki weJ7qyjHYwk): ACCEPT_VISUAL_ONLY** → future pool-neutral inactive intake queue.
> - **Market data (Blazek 669623): HOLD / NEEDS FINAL CROP PROOF** — not added to the accepted queue yet. Produce a final 1080 production crop at scrim 0.56 with the headline/text-safe zone. **Decision rule:** if "Morris Charts" is NOT practically legible at production scale under scrim → mark ACCEPT_VISUAL_ONLY; if it remains readable → keep HOLD and re-source/re-scope the row. (Proof + determination appended below.)
>
> No DB/storage/upload/approval/promotion/production_use_allowed/render/publish. **Accepted-not-intaken queue (8):** mm_a-01, mm_b-01, kitchen/living, backyard/alfresco, construction, estate/subdivision, mortgage, inspection.

**Date:** 2026-07-06 · T2 · SIDE_PROVING/SAFETY_GATE · **local harness-only** (all writes in `run5_b3m3/`; prior packages byte-untouched; no DB/storage/git/upload/intake; **AP-2/TMR untouched** — confirmed). Two-stage proven-scoped agents + orchestrator byte-verification: 19 files hashed, **0 freshness violations**, all 3 finals byte-identical to their `images/` sources, best-pick hashes match the manifest.
**This was the highest-risk manifest** (screen/document subjects; finance/business = the most AI-polluted stock category). Result: **0 AI-suspected across 16 candidates**, and the dominant reject driver was readable text/branding exactly as predicted.

## Row outcomes (harvester clean → reviewer clean/REVIEW_COMPLETE; all 3 best-picks concurred, no swaps)

| Row | Best-pick | Reviewer verdict | Proposed PK verdict |
|---|---|---|---|
| **market_data_laptop_charts** | Lukas Blazek (Pexels 669623) — laptop + generic printed analytics demo-sheet on dark desk, big dark overlay space | PASS_WITH_NOTE — real capture; charts generic (no ticker/brand/stock/$/%) **BUT one legible generic proper-noun: "Morris Charts"** (an open-source chart-library name, not a company/agency brand) | **ACCEPT_VISUAL_ONLY — CONDITIONAL on your eyeball** (see decision below). No text-clean alternative exists for this row today. |
| **mortgage_calculator_keys** | Jakub Żerdzicki (Pexels 27920274) — calculator (blank display) + house key + foam-house concept props on black, ~55% clean negative space | **PASS** (clean) — real capture, no readable figures/branding, dark tonal match ideal for the scrim | **ACCEPT_VISUAL_ONLY.** Foam-house props read as credible concept staging; clean-desk keyless alt (7111550) available if you prefer concept-free (costs keys + bright tone). |
| **inspection_checklist_clipboard** | Jakub Żerdzicki (Unsplash weJ7qyjHYwk) — hand ticking a generic scribble "CHECK LIST", **no face** | PASS_WITH_NOTE — real capture, hands-only (people rule satisfied), checklist items genuinely unreadable | **ACCEPT_VISUAL_ONLY.** Reads as a general desk checklist (fit note, not risk). |

## Market-data crop-proof DETERMINATION (2026-07-06)
Produced the actual 1080 production crops at scrim 0.56 (`cropproof/`): `01_1x1_1080_scrim056_noheadline.jpg`, `02_..._headline.jpg`, `03_16x9_...`. **Result: "Morris Charts" (and "Sparkline Charts", "Easy Pie Charts", the per-chart labels) REMAINS clearly readable** at 1:1 1080 under the 0.56 scrim — it sits upper-right on the sheet, within the centre crop and NOT masked by the centred headline. Per PK's decision rule ("if it remains readable, keep HOLD and re-source/re-scope"): **market_data = HOLD confirmed.** Not added to the intake queue. The row needs a re-source (a genuinely text-free chart/data-desk image) or a re-scope (e.g., accept only truly unreadable/abstract on-screen charts, or a different data-theme subject). No text-clean free-stock alternative surfaced this run.

## The one real decision — market_data legible header (superseded by the crop determination above)
The best-pick's printed sheet carries the word **"Morris Charts"** plus generic chart-type labels (Line/Bar/Donut/Pie/Sparkline), faintly word-legible at 1080 centre-crop. The reviewer's read: this is **generic chart vocabulary, not signage/branding/a market claim** — so PASS_WITH_NOTE, not a reject. But under your 2026-07-06 near/mid-readable-text policy it *is* legible text, so the call is yours: **eyeball the final 1:1 card at scrim 0.56 and either accept it, or decline** — in which case this row has **no text-clean alternative** in free stock (every real laptop-screen chart carried ticker/claim risk) and would need a fresh discovery pass or a re-scope. Everything else in the manifest is a clean accept.

## Audit integrity (both directions, again clean)
- **Over-refusal: 9/9 JUSTIFIED, zero over-strict, zero readable-text warn-and-offered.** Three hard-rejects verified at zoom: an Excel-chrome laptop with person names + unit figures; a real-estate flyer with "$231,400 … National Association of Realtors"; and **the "For Buyers"-branded HOME INSPECTION checklist** with legible section headers — the exact branded-form class the reviewer stage exists to catch, correctly rejected by stage 1 and never offered.
- **AI-tell: every offered candidate REAL_CAPTURE** — finger counts, keycap/button coherence, paper grain, prop shadows all verified; no generative artifacts.
- **Face check:** confirmed no face in either inspection candidate.
- **Calibration datum:** the one text-clean reject (a people-forward clipboard) was refused on people-caution posture, not text — flagged for the record.

## Accepted-not-intaken queue
**Current (6):** mm_a-01 · mm_b-01 · kitchen/living · backyard/alfresco · construction · estate/subdivision.
**If M3 accepted → up to 9:** + market_data (conditional) · mortgage · inspection.

## Next step (per directive): the pool-neutral batch-intake gate
Once you rule on M3, I prepare **one** reviewed batch-intake packet for the full accepted set — day-hero pattern: PK-authorised uploads + double-fenced `approved=false / is_active=false / production_use_allowed=false` INSERTs, pool-neutrality machine-asserted (eligible pool stays 6; per-asset usage/label constraints — incl. the estate "never WA/Perth" rule — written into `asset_meta`), full db-rls-auditor + external-review chain, stop at your hash gate. No intake is built until your M3 verdicts land.
