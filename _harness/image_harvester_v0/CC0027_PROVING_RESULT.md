# cc-0027 — Image Harvester / Image Reviewer v0 side-proving lane: RESULT (PK review gate)

**Date:** 2026-07-05 · **Status:** both candidate agents ran end-to-end on the PK mini-manifest; package ready for PK visual review. **Nothing approved, uploaded, inserted, promoted, rendered, published, deployed, or committed.** D6 pause-rule checked at lane start AND end context: draft `8bbbd34c…` publish_rows=0 at 02:12Z, slot 21:30Z — D6 armed, not yet actionable, lane proceeded.

## What ran (the cc-0027 two-stage workflow, first live execution)
1. **image-harvester (CANDIDATE, stage 1):** 2-row mini-manifest → 11 downloads (8 offered: 4+4; 3 honest rejects kept on disk, transparently marked), best-picks selected, contact sheets + metadata.csv/json + inventory.json + harvester_manifest.json written — all inside `_harness/image_harvester_v0/**` (write-confinement held; repo tracked files untouched). Network GET-only to Unsplash/Pexels; 9 premium (Unsplash+/Getty) and 4 faces-visible results skipped at discovery; freshness exclusions screened by slug AND sha256 (verified independently: no match).
2. **Orchestrator verification (between stages):** recomputed sha256 from bytes for finals + all 11 candidates — **all match recorded values** (this closes the reviewer's declared no-Bash residual); dims verified; git status clean of tracked-file modifications.
3. **image-reviewer (CANDIDATE, stage 2, read-only):** verified recorded-hash consistency across all 4 metadata surfaces (11/11), re-assessed every candidate with its own eyes, and returned per-candidate verdicts in the P0 vocabulary. **Zero critical findings.**

## Review outcomes (suggestive only — PK decides)
- **Row A (suburb texture):** best-pick `mm_a-01` Martin David regional-town aerial — **PASS**, reviewer concurs. Notable catch: the reviewer **upgraded the harvester's warning on `mm_a-02` to REJECT_PROPOSED** — "VILLANOVA COLLEGE" is readable INSIDE the 1:1 centre crop (blind rotation can't avoid it), plus two more partially legible signs and a location-identification concern the harvester missed. `mm_a-04` (nadir Melbourne) flagged as arguably the strongest 1:1 surface despite portrait orientation.
- **Row B (transaction/keys/table):** best-pick `mm_b-01` FreeStockPro contract+keys+house-model — **PASS_WITH_NOTE**, reviewer concurs; document text verified Ukrainian-form-template with only generic words legible at review resolution; **one residual for PK: zoom the printed sheet once at 100%** (reviewer's view was 3× downsampled). Zerdzicki alternates confirmed **same-frame duplicates** (keep the Unsplash copy only); `rc.xyz` attribution resolved as a genuine pseudonymous Unsplash account (licence posture unaffected); its key macro is PARTIAL_FIT (overlay-gold, half-brief).
- **Licence posture:** every offered candidate is Unsplash/Pexels standard licence with full provenance; nothing on CC BY / CC BY-SA hold this run; no AI-generated, no paid-tier.

## Agent proving assessment (evidence for the promotion decision, which is PK's)
- **image-harvester:** followed allow-list + GET-only + write-confinement + freshness exclusions + honest-reject taxonomy; descriptions verified accurate by the independent reviewer ("no description invented"); one calibration miss: under-weighted the Villanova signage (warned instead of rejecting). Quality: strong; judgment: good-with-one-miss.
- **image-reviewer:** added real value beyond the harvester (the Villanova catch, the same-frame duplicate proof, the attribution resolution, honest residual declarations); zero approval-language violations; correctly delegated byte-hash certainty to the orchestrator, who performed it.
- **The two-stage shape worked as designed:** stage-2 caught a stage-1 misjudgment — exactly the failure mode the reviewer exists for.

## PK review inputs
- **Gallery:** `sheets/contact_sheet_all.jpg` (all 11, labelled) + per-row sheets.
- **Deciding acts requested:** (1) visual verdicts on the 8 offered candidates (esp. the two best-picks); (2) the 100% zoom of mm_b-01's document; (3) whether the workflow is useful → candidate-agent promotion/iteration/retirement decision; (4) whether these harvested images enter the normal intake pipeline (would be a separate gated lane, unchanged machinery).

## Boundaries held
No DB mutation · no storage upload · no approval/promotion/production_use_allowed claims · no TMR/B1 pool change (eligible pool remains 5) · no render/publish/deploy · no commit/push (this packet awaits a PK commit gate) · agent writes confined to `_harness/image_harvester_v0/**` (verified via clean tracked-file status).
