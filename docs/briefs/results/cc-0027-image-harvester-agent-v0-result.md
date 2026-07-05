CLAIMED v4.97 · cc-0027-image-harvester-agent-v0 · main-checkout C:\Users\parve\Invegent-content-engine · gate: PK closeout commit gate · 2026-07-05T14:55Z

# cc-0027 — Image Harvester Agent v0 mini-proof: RESULT (workflow PASS as SIDE_PROVING)

**Lane class:** SIDE_PROVING · **Tier:** T2 by mapping (PK admission 2026-07-05; contract post-dates the lane) · **Register version:** v4.97 (claimed per protocol; head v4.96, zero competing stubs)
**Brief:** `docs/briefs/cc-0027-image-harvester-agent-v0.md` (issued at PK gate 1 with decisions Q1–Q5; drafted by `brief-author` CANDIDATE — provisional proving pass, not promoted)
**Phase 2 admission:** this lane = **CCF-02 Phase 2 Observation Note #1** — `docs/briefs/ccf-02-phase2-observation-note-1-cc0027.md` (conformance record + friction incl. PHASE2-FRICTION-001)

## Verdict

**Workflow PASS as SIDE_PROVING.** The two-stage licence-safe harvest → review workflow is proven end-to-end on the PK 2-row mini-manifest. **No image is approved or promoted** — PK visual verdicts on the 8 candidates remain an open, separate gate. `image-harvester` and `image-reviewer` remain **CANDIDATE**.

## Identity + gate trail

- PK gate 1 (2026-07-05): Q1 named candidate CCF-02 exceptions for the two agents · Q2 fresh 2-row mini-manifest (suburb bg / transaction-keys bg; no faces/branding/house numbers/Perth/held rows) · Q3 cc-0027 after registry re-read · Q4 harvester capability class = network GET + writes confined to `_harness/image_harvester_v0/**`; reviewer read-only · Q5 conservative licences (CC BY-SA hold · CC BY hold pending PK · AI excluded).
- Artifacts + hashes at review: brief `4c69186d…` · `.claude/agents/image-harvester.md` `b09ebf2b…` · `.claude/agents/image-reviewer.md` `f582915a…` — external review **`0dc99a6f` agree/zero-pushback, first packet attempt**, pre-execution.
- Stage 1 (`image-harvester`; ran as spec-faithful stand-in — type registered mid-session): **HARVEST_COMPLETE** — 8 candidates (4/row, Unsplash+Pexels only), full provenance (source/creator/licence+URL/dims/bytes/sha256-of-downloaded-bytes), best-picks staged in `final/`, contact sheet covering 8/8, **7 rejects with honest reasons** (4 city-identified, 3 faces). Package: `_harness/image_harvester_v0/` (13 MB; images stay local — nothing uploaded; hashes pin the evidence).
- Stage 2 (`image-reviewer`; **ran as the registered agent type** — clean proving run): **REVIEW_COMPLETE** — integrity pass; per-candidate suitability: keys-03 PASS · keys-01/-02 PASS_WITH_NOTE · suburb-01 PASS_GENERIC_ONLY (reads North American; never location-label) · 4× PARTIAL_FIT_ONLY (suburb-02/-03/-04 European styling confirmed at pixels; keys-04 SOLD-band/jewellery) · 8/8 constraint-clean (no faces/branding/house numbers/PII) · zero approval language.
- Orchestrator verification: containment audit clean (zero writes outside the package; zero tracked modifications) · **14/14 inventory sha256 independently recomputed, all match** · pre/post DB+storage invariants **byte-identical** (29 `c.client_brand_asset` rows · 39 `brand-assets` objects · fingerprint `198b0923…`) — no DB mutation, no upload, no TMR/B1 pool change, proven not asserted.
- PK package delivered (contact sheet + 2 best-picks) 2026-07-05.

## Phase 0/2 measurements

Lane wall-clock ~35 min (harvest ~14 min dominant) · external review **1 packet-cut attempt** (4th consecutive first-try under the ratified shape).

## Carries / open gates (each separately PK-gated)

PK visual verdicts on the 8 candidates (P0 taxonomy; any outcome incl. full rejection completes v0) · promotion decisions for `image-harvester` (stand-in caveat: one registered-type run recommended before promotion), `image-reviewer` (registered run complete), `brief-author` (2 registered runs complete; provisional pass standing) · licence-edge rules CC BY + AI imagery (Q5 defaults hold) · successor lanes if any images pass: storage upload → quadruple-fenced intake (v4.87 pattern) → per-asset promotion (re-enters pool-coupling rule) — none started.

**Non-claims:** nothing approved/active/selectable/production-safe · no storage/DB/render/publish/deploy touched · D6 untouched · agent candidacies unchanged · the local `_harness` package is evidence, not inventory.

---

## Addendum (2026-07-05) — registered-type run: image-harvester proving caveat CLOSED

PK-directed re-proof (T2 / SIDE_PROVING; external review **`8e333186` agree/low/high, first packet attempt**, pinned to the unchanged committed agent-spec hash `b09ebf2b…`). The REGISTERED `image-harvester` type executed one fresh proving row (`bg_moving_day_boxes`, max 2 candidates) with all writes confined to the isolated sub-root `_harness/image_harvester_v0/run2_registered_proof/` so this result doc's hash-pinned run-1 evidence stayed byte-intact.

**Outcome: `HARVEST_COMPLETE`** — 2 licence-safe Pexels candidates (full provenance, sha256-of-downloaded-bytes, contact sheet, best-pick staged). Reject discipline demonstrated live: an **Unsplash+ paid-tier item refused at the licence gate** (never downloaded) and a candidate with **readable printed box labels downloaded → visually inspected → failed → deleted from the package** (`constraint_readable_box_labels`, recorded in rejected_reasons).

**Verification (orchestrator, independent):** run-1 inventory **20/20 hashes recompute byte-identical** (evidence untouched) · run-2 inventory 6/6 · zero writes outside the sub-root · pre/post `c.client_brand_asset` + `brand-assets` storage fingerprint byte-identical (`198b0923…`).

**Status effects:** the stand-in caveat on `image-harvester` is **closed** — all three cc-0027-era candidates (brief-author ×2 runs, image-reviewer ×1, image-harvester ×1) now have clean registered-type executions on record. **Candidacy unchanged; promotion remains a PK decision.** Run-2 artifacts are **proving-only** — not intake candidates, nothing offered for approval; the 8 run-1 candidates still await PK visual verdicts.
