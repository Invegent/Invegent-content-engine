# TMR-supp-ndis-bg — NDIS Yarns background sourcing (D7 governed-image-proof prep)

**Status:** ✅ PK VISUAL/SOURCE VERDICT RECORDED 2026-07-17 — lane STOPS here. Sourcing only; nothing approved, uploaded, inserted, or promoted. All candidates remain FENCED (files live only under this package). No DB / storage / git / pool / deploy surface touched. DB intake is a **later D7 step at PK's gate** — NOT part of this lane.

## PK VERDICT (2026-07-17)
- **Licence policy:** Pexels License **ACCEPTED** for this D7 NDIS proof lane (already inside the proven allow-list used for PP backgrounds / B-roll).
- **P0 proof set (accepted):** `brand_texture-01` (deep navy wash) + `civic_neutral-04` (calm curved facade).
- **Data-grid row:** **HELD** from P0 for now (register decision deferred).
- **`data_grid-04`:** AI-generated **deny-category CONFIRMED → dropped.**
- **Standing scope (unchanged):** candidates stay FENCED · no DB promotion · no production activation · no governance flip · no people-forward imagery · no First-Nations motifs · no medical stereotypes · no readable third-party signage.
- **Next:** DB intake = later D7 step at PK's gate (separate lane).

**Package root:** `_harness/image_harvester_v0/ndis_bg_20260717/`
**Two-stage lane:** image-harvester (stage 1) → orchestrator byte-verify (13/13 sha256 OK, 0 mismatch) → image-reviewer (stage 2) → orchestrator authoritative crop-proof → **this PK gate**.

## Scope flags (read first)
- **NON-PP brand.** NDIS Yarns is outside the image agents' PROVEN-SCOPED envelope → first-attempt **candidate-level scrutiny** applies (per CLAUDE.md image-agents charter). Fenced-only + PK gate is the mitigated posture.
- **Person-free / abstract by design.** Deliberately stayed clear of people-forward disability imagery (cat D/E) and First-Nations / cultural visual language (cat F) — no cultural sign-off exists for this lane. No people, faces, bodies, flags, crests, government-identifying buildings, medical/clinical stereotypes, First-Nations motifs, or readable signage in any offered candidate.
- **Licence source.** Strict CC0 alone did NOT harvest any of the three rows cleanly (civic CC0 skewed to interior-design renders; data-grid CC0 was off-target). On-target candidates are **Pexels License** (attribution-free, policy-permitted). **OPEN PK QUESTION: is Pexels-licence stock acceptable for this non-PP brand, or CC0-only?**
- **One reviewer catch removed from the offer:** `ndis_bg_data_grid-04` → REJECT_PROPOSED (reads AI-generated: hallucination artifacts inside the "plexus" spheres + listing-page-only unverified creator; AI-gen is a policy deny category; also text-unsafe at centre). **Not offered to PK.** (Stage 2 catching a stage-1 miss = the two-stage shape working.)
- Creator names were read from Pexels **listing** pages, not re-confirmed per photo page — re-confirm before any promotion.

## Candidate shortlist (12 offered; -04 data-grid excluded)

### Row A — civic / policy / service-system neutral (person-free)
| id | dims | creator | licence | reviewer | note |
|---|---|---|---|---|---|
| civic-04 | 1920×2400 | Mikitayo | Pexels | **PASS** | **Recommended civic pick** — calmest; smooth curved metal/glass, cool neutral, low text competition |
| civic-05 | 1920×1284 | Ronald van Eendenburg | Pexels | PASS_WITH_NOTE | Teal-green panel grid — most on-palette; confirm no moire vs small text |
| civic-01 | 1920×1280 | Mineia Martins | Pexels | PASS_WITH_NOTE | (harvester best-pick) busiest/brightest — bright sky-blue left half + white central mullion fight the headline; **downgraded** |
| civic-02 | 1920×1280 | Jan van der Wolf | Pexels | PASS_WITH_NOTE | Gold diagonal mullions cross the baseline; warm gold slightly off-palette |
| civic-03 | 1920×1280 | Jan van der Wolf | Pexels | PASS_GENERIC_ONLY | High-key sky top-right; keep headline low; generic-only |

### Row B — brand-colour wash / abstract brand texture (person-free) — STRONGEST ROW
| id | dims | creator | licence | reviewer | note |
|---|---|---|---|---|---|
| brand_texture-01 | 1920×2877 | Allec Gomes | Pexels | **PASS** | **Recommended anchor** — deep navy silky waves, minimal detail, on-brand navy; ideal overlay negative space |
| brand_texture-02 | 1920×2880 | Eva Bronzini | Pexels | PASS | Dark teal→navy gradient wash; excellent legibility |
| brand_texture-03 | 1920×2880 | Eva Bronzini | Pexels | PASS | Near-solid deep navy; maximal negative space |
| brand_texture-04 | 1920×2880 | UP Modern | Pexels | PASS_WITH_NOTE | Mostly-black 3D render; accent curve leans lavender/purple (off palette) |

### Row C — abstract data-grid / information-flow (person-free) — THIN ROW
| id | dims | creator | licence | reviewer | note |
|---|---|---|---|---|---|
| data_grid-01 | 1920×2880 | Evija Ciematniece | Pexels | PASS_WITH_NOTE | Only defensible pick; dark central zone is text-safe but reads "warp/motion" more than "data" — keep headline central |
| data_grid-02 | 1920×1280 | Solen Feyissa | Pexels | PASS_WITH_NOTE | Teal connected lines/dots on black; brighter clusters upper |
| data_grid-03 | 1920×2880 | Valentin Ivantsov | Pexels | PARTIAL_FIT_ONLY | Bright full-frame mesh; moire + low contrast; alternate-only |
| ~~data_grid-04~~ | — | Merlin | — | **REJECT_PROPOSED** | AI-provenance ambiguous + text-unsafe — **NOT offered** |

## Recommended P0 proof background set (for the D7 governed image proof)
1. **brand_texture-01** — deep navy wash (anchor; cleanest overlay, on-brand)
2. **civic_neutral-04** — calm curved facade (neutral civic register) — with **civic-05** as the most-on-palette swap/alternate

**Data-grid: RECOMMEND HOLD from the P0 set.** The register is genuinely thin (only -01 is defensible) and the "data/network/motion" tone is a marginal fit for a compliance-strict plain-English explainer; brand-texture already fills the clean-dark-abstract need. Include `data_grid-01` only if PK wants the data register represented in the D7 proof.

Rationale: two clean PASS anchors (one calm branded backdrop + one neutral civic) give a safe, low-risk D7 proof without leaning on any marginal or sensitive-category material.

## Evidence
- Authoritative crop-proof (1:1 centre-crop @1080 @0.55 scrim + sample white headline), orchestrator-generated: `orch_cropproof/ORCH_CROPPROOF_finalists.jpg` (+ per-candidate `orch_cropproof/*__proof.jpg`).
- Harvester package: `manifest.json` / `metadata.csv` / `inventory.json`, `images/` (13), `final/` (3), `sheets/` (contact + harvester crop-proofs).
- All 13 sha256 byte-verified by orchestrator: 0 mismatch, 0 missing. Full hashes in `manifest.json`.

## PK deciding acts at this gate
1. Visual verdict per row / best-pick selection (only deciding act).
2. Pexels-licence vs CC0-only policy for this non-PP brand.
3. Keep or drop the data-grid register for the D7 proof.
4. Confirm `data_grid-04` dropped (AI-provenance).
5. (After accept) whether to proceed to a separate PK-gated intake gate — NOT part of this lane.

## Follow-up: `civic_neutral-04` pre-crop (2026-07-18, routed back from v5.71)
PK requested a pre-crop of `civic_neutral-04` (the v5.71 NDIS intake used `brand_texture-01` as sole P0 and routed the civic crop back to this lane).

- **Deliverable (fenced):** `final/ndisyarns_bg_civic_neutral_04_precrop_1x1.jpg` — 1600×1600 1:1, **453669 B**, sha256 `9801dfdd…`. Provenance: `precrop/civic04_precrop_provenance.json`.
- **Op:** pure 1:1 crop, no scaling/colour edit — `src_box_xywh=[320,320,1600,1600]` of the 1920×2400 source (Mikitayo, Pexels, source sha `17c54fa3…`).
- **Why not the template center-cover:** a center square lands the headline partly on the bright metal sweep; this crop shifts right+down into the dark-glass band, dropping central-band luminance **110→95** for clean white-headline contrast while keeping the diagonal architecture as top/bottom framing.
- **Safety re-confirmed:** no text/signage, no people, no gov/NDIS-identifying markers, no cultural motifs; text-safe under the 0.55-scrim centred-headline proof.
- **Evidence:** `precrop/PRECROP_finalists.jpg` (center vs optimized), `precrop/PRECROP_candidates.jpg`, `precrop/proof_optimized.jpg`.
- **Status:** FENCED prep only. Any civic-04 DB intake is a **separate later PK gate** (as brand_texture-01's was) — not part of this step.

## Non-claims
Nothing here is approved or production-safe. No DB promotion, no production activation, no governance flip. This lane STOPS at the PK visual/source approval gate.
