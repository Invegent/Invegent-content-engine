# Result — B-roll Video Sourcing, 4 brands (sourcing only, harness-confined)

**Brief file:** none — PK-directed in-session (no Gate-1 brief authored for this lane).
Governing spec inherited from `docs/briefs/video-broll-intake-v1-gate1-brief-v1.md` §3/§6 (PK-ratified 2026-07-29).
**Executed by:** Claude Code (orchestrator) + 11 fenced general-purpose sourcing subagents
**Completed:** 2026-08-07 Sydney
**VERSION-LESS** — no register/sync-state cut taken by this lane; register payload at §10.

---

## 1. Result status

`Complete` — as a **sourcing** lane. **Nothing approved, nothing intaken, nothing promoted.**
24 candidate clips (6 per brand) sourced, licence-verified, duration-proofed and 9:16 crop-proofed.
**2 clips contested** (CFW), **1 conditional** (NDIS), **7 PK decisions open** (§7).

## 2. Commit(s)

N/A — no commits. Working-tree only. Commit/push remains a PK gate.

## 3. Files changed

- `docs/briefs/results/broll-video-sourcing-4brand-result-v1.md` — created (this doc). **The only write outside the harness root.**
- `_harness/broll_harvester_v1_20260806/{property-pulse,ndis-yarns,care-for-welfare,invegent}/**` — created (git-excluded; clips, extracted frames, manifests, changelogs, local tooling, licence evidence).

## 4. Actions taken

Three sequential passes. Passes 2 and 3 exist because of defects found in the pass before.

**Pass 1 — initial sourcing (24 clips, 6/brand).** Executed against an acceptance bar **the orchestrator got wrong**: "5+ seconds, prefer landscape". Both wrong (see §6 R1).

**Pass 2 — spec correction.** Re-run against the real §3/§6 bar: **≥12s USABLE after trimming** and **must crop safely to 1080×1920 (9:16 portrait)**, crop-proofed at review time with extracted delivery frames, `safe_for_text_overlay ∈ {'true','needs_scrim'}` only. 10+ clips replaced.

**Pass 3 — tier re-fetch (upscaling elimination).** Pexels publishes ~6 resolution tiers per clip ID at separate URLs; earlier passes had fetched a lower tier, forcing ×1.333–×1.78 upscales into the 9:16 delivery frame. For a 16:9 source the crop is `0.5625 × H`, so source height must be ≥1920 — and **no tier sits between 2560×1440 and 3840×2160**, making 4K the *lowest* qualifying tier, not a greedy grab. 11 clips re-fetched; **zero upscaling remains anywhere in the corpus.** Two clips (`pp-broll-07`, `pp-broll-01`) correctly **declined** a ~423MB tier that would remove a non-existent upscale.

**Standing method across all passes:** every verdict from frames extracted from the **downloaded bytes** across full clip duration — never source-page text. This repeatedly overturned provider metadata (§6 O1). Escalated over the run to include brightened native-resolution zooms of dark/distant regions, and automated blob-tracking over every delivered frame.

## 5. Constraints confirmed

- **ZERO database writes** — confirmed not done. No intake row, no fenced insert, no DML/DDL.
- **ZERO storage-bucket uploads** — confirmed not done.
- **ZERO git operations** — confirmed not done (no commit, no push, no branch/ref mutation).
- **ZERO repo-file edits outside the harness root** — confirmed, with the single disclosed exception of this result doc.
- **ZERO live-selection change** — no resolver, template, `enabled`, `fit_status` or promotion state touched.
- **Network GET/download only**, allow-listed providers — no POST, no authenticated API, no account creation.
- **No CAPTCHA/bot-challenge bypass** — a Cloudflare managed challenge was encountered and **not** circumvented (later found transient, §6 R3).
- **Nothing approved or promoted** — PK visual review remains the only deciding act; intake/promotion stays watch-gated.
- Superseded files **moved** to `_superseded_` folders, never deleted; all superseded hashes re-verified intact.

## 6. Open issues

### ⚠ P1 — `f84ac010` manifest-vs-harvest conflict (LIVE pool asset) — FLAGGED, NOT RESOLVED

`docs/briefs/results/m4-broll-locality-sourcing-manifest-prep-v1.md` §4.1 records live asset
**`f84ac010`** · `geo_scope='au_wa_perth'` · labelled **"Perth Cottesloe"** · **✅ eligible** ·
`source_pexels_id=`**`32433684`**.

This lane independently sourced and **REJECTED that same provider ID**: the **"Fremantle" wordmark is
legible at 1080×1920 at 1:1**, verified at t=0.5/5/7/9/12/16 — legible at *every* sample, so no trim
removes it. Evidence: `_harness/broll_harvester_v1_20260806/property-pulse/frames/`.

Two implications, **neither resolved here**:
1. A row currently marked **eligible** in the live pool may carry legible third-party signage, contrary
   to the safe-content rule that same manifest restates (line 82).
2. Its **geo label may be wrong** — Cottesloe and Fremantle are distinct Perth-metro suburbs ~10km apart.
   Visible signage says Fremantle; the row says Cottesloe.

**This lane did NOT read the live DB row.** Confirming or dismissing this is a `db-rls-auditor` /
PK task. Recorded as a manifest-vs-harvest-evidence conflict, not as a finding of fact about the live row.

### RETRACTIONS (recorded AS retractions, not silently corrected)

- **R1 — the orchestrator's own acceptance bar was wrong.** Pass 1 ran on "5+ seconds, prefer landscape".
  The governing spec is ≥12s usable after trim + a 1080×1920 **portrait** crop-proof. The landscape
  instruction was not merely loose, it was **backwards**. ~8 of 24 pass-1 clips failed the real bar.
  Caught by a subagent flagging the discrepancy rather than silently reconciling it.
- **R2 — "provider metadata is unreliable on resolution" is RETRACTED.** Reported earlier as a provider
  fault; it is a **tier-selection artefact** (~6 tiers/clip, page headline = max tier). The UHD masters
  genuinely exist. This retraction is what made Pass 3 possible.
- **R3 — "Pixabay is blocked by Cloudflare" is RETRACTED.** Transient, not standing; Pixabay was
  reachable on a later pass. **Pixabay's per-clip licence-verification path therefore remains UNTESTED —
  the corpus is 100% Pexels.** The Gate-1 requirement to never assume site-wide CC0 has never been exercised.
- **R4 — `cfw-broll-02` "person-free across a full per-second scan (16/16 frames)" is FALSE and RETRACTED.**
  A defocused figure walks inside the delivered 9:16 frame t=12.05→15.64s (3.59s of 15.64s), found by
  blob-tracking all 375 delivered frames (64 detections, constant ground-plane height, monotonic lateral
  travel). **Equally visible in the superseded lower-tier file** — a pre-existing miss, not a tier artefact.
- **R5 — `cfw-broll-03`'s recorded 22.88s usable NEVER REPRODUCED.** Manifest's own rule yields 11.16s at
  the new tier and 10.92s at the old. The number was wrong from the start. Cause: the sharpness criterion
  fires on **composition** (a flat wall panel the dolly crosses), not a defect — and that same flat wall is
  what makes it the best text plate in the set.
- **R6 — `pp-broll-01`'s "~11.9s usable" is RETRACTED.** Re-measurement found no opening scene to trim;
  usable is the full 16.917s. Converted to an untrimmable **content** flag (utility line-works + boom lift
  in frame throughout, MEDIUM fit risk) — a PK content call, not a rule failure.
- **R7 — Property Pulse is no longer describable as person-free.** Two people newly on the record (a second
  promenade pedestrian on `pp-broll-02`, a cyclist on `pp-broll-06`), neither in the pass-2 record. Both
  top-down and faceless. `pp-broll-03`/`04` remain person-free.

### 🔬 SYSTEMIC EPISTEMICS CAVEAT — person-free is PROVISIONAL

**Every time inspection sharpened, more people appeared**, across three independent lanes:
CFW's false 16/16 claim (R4); two additions in Property Pulse (R7); an NDIS station-concourse clip with a
seated person that passed a 12-sample contact sheet **and** a dense 1.5s re-scan, caught only by a
brightened native-resolution zoom of a shadowed platform band.

**Person-free in this corpus is verified to the standard of the LAST pass, not absolutely.** Any intake
lane should treat it as provisional and run one dedicated person-detection pass rather than trusting this
record. This caveat is the single most important carry from the lane.

### GEO-DISCLOSURE BLOCK

**M4 acceptance bar** (verified by reading `m4-broll-locality-sourcing-manifest-prep-v1.md` directly, not
taken on relay): ≥3 distinct AU localities × ≥2 clips each. Live pool today: Sydney 4, Perth 1, generic 1.

**→ This corpus advances the M4 bar by ZERO.**

| Bucket | Property Pulse clips |
|---|---|
| (a) Geo-verifiable — counts toward M4 localities | **none** |
| (b) Geo-neutral — generic pool only | all 6 |

`pp-broll-01/02/03/04/07` never carried a geo claim (deliberately left unlabelled rather than guessed).
`pp-broll-06` (Swan River / South Perth) had its Perth claim **downgraded to `low_in_delivered_frame`** —
the distinctive tower grounding it sits outside the 9:16 crop window.

M4 gap unchanged: **Perth +1, third locality ×2 from scratch.**

**Brisbane finding for whoever runs that lane: 0/5 clean.** Every Brisbane CBD aerial failed on readable
corporate signage (Charlotte Towers, FELIX, hbf, QIC, THIESS, scape, mantra, dexus, RIVERCITY, mosaic).
Perth CBD likewise (BHP, Rio Tinto, Bankwest). **AU CBD skylines are effectively unharvestable under the
no-readable-signage rule** — suburban/coastal residential is the only clean lane.

**`ndis-broll-10` is Thailand-sourced** — reads geo-neutral tropical boardwalk within its trim window, no
AU cue present and none claimed. Same disclosure block; PK call whether "geo-neutral" suffices or whether
foreign-locale provenance disqualifies it.

### KNOWN THEMATIC GAPS (NDIS Yarns)

- **No assistive-technology imagery at all** in the offered set — both pass-1 assistive-tech clips failed
  the 12s bar and no licence-safe person-free replacement exists.
- **No community/service-centre reception space** — every ≥13s portrait candidate failed on wordmark,
  embedded text, person, or no continuous ≥12s segment.
- **Ramps / accessible entrances: `not_harvestable_licence_safe`** — re-confirmed portrait-first across
  nine fresh queries, not carried forward. On Pexels, "ramp" is dominated by skate parks, and genuine
  wheelchair-ramp footage contains a wheelchair **user** (Phase 2, CLOSED). Nothing merely architectural
  was substituted.

These are the brand's most on-theme categories. The NDIS Phase-1 person-free policy is working as designed;
the consequence is a thin pool exactly where the brand most needs depth.

### OTHER OPEN ITEMS

- **Licence-page byte archive uncapturable** (NDIS lane) — Cloudflare interstitial. The interstitial was
  deleted rather than kept as a fake archive; per-clip JSON-LD licence declarations archived instead. Open
  if the intake gate requires a byte archive.
- **Storage:** packages exceed 1GB with superseded files retained. `cfw-broll-08` alone is 261.9MB /
  35.1Mbps; `inv-broll-02` is 184.9MB for 60s where only ~12–20s will ever be cut into a slot.
- **`inv-broll-03`** — record corrected from "no equipment logos" (an absolute claim, now false) to
  "one sub-legible manufacturer mark": ~16×5px in the delivered frame, does not resolve into letters at 6×.
  Also the tightest crop in the corpus (left-anchor only; centre **not** proven) with a 1.24s duration margin.
- **`inv-broll-06`** — numeric readouts now crisply legible at 4K (1940, 2020, 2838…). Generic numerals, no
  brand, so no rule broken — but louder than the offered set implied, and "2020" can read as a year.
- **`inv-broll-02`** — `generic_use_only` / never-geo-label flag **retained and now more load-bearing**: 4K
  resolves fin spacing and mullion pattern sharply enough to be a real recognition cue. Still not
  identifiable to a specific building, so the flag stands rather than escalating.
- **`cfw-broll-04` honest quality regression** — its sky-band text plate moved *further* from `'true'`
  (lapvar 365 → 1464) because the sharper master resolves every pine needle against the sky.
- **`6537417`** (PP alternate, not offered) — signage falls **outside** the 9:16 crop window, but that safety
  depends entirely on the crop staying centred/left and nothing pins a crop window today. Promotion would
  need an explicit crop-window row condition.
- **`32433684`** (Fremantle) — **stays REJECTED** on legible signage. Crowd ground released; signage
  dispositive alone. See P1 above — this is the same ID as live asset `f84ac010`.
- **Methodology defect found and fixed:** the pass-1 Pexels collector **hard-coded `?orientation=landscape`**
  and (in one lane) additionally discarded `width <= height` — structurally excluding native-portrait sources
  under a portrait-delivery spec. Confirmed present in 2 of 4 lanes; NDIS checked and was clean. Re-searching
  portrait-first surfaced hundreds of candidates the first pass could never see, and every native-portrait
  replacement beat its landscape predecessor on crop-safety.

## 7. Next recommended step

**PK decisions — seven open, none decidable by this lane or the control tower:**

1. **`f84ac010` (PRIORITY — live pool asset).** Verify the signage + geo-label conflict; decide whether it
   stays `eligible`. Needs a `db-rls-auditor` live-row read.
2. **`cfw-broll-02`** — drop, or accept a non-identifiable figure inconsistent with this lane's own reject
   precedent (`37246259` rejected on the same calibration). Trim rescue leaves 0.05s headroom — thinner than
   the 0.17s this package itself called unsafe.
3. **`cfw-broll-03`** — rule-as-written (11.16s, fails) vs defect-only reading (22.88s, passes).
4. **`ndis-broll-10`** — Thailand-sourced, geo-neutral. Accept or drop NDIS to 5.
5. **Property Pulse's three incidental non-identifying people** — acceptable under the Pexels
   no-implied-endorsement restriction?
6. **`inv-broll-02`** — trim to the used sub-range before any upload (~46MB for 15s, still native) rather
   than carrying 184.9MB.
7. **Storage/transcode policy** for the corpus generally.

**Before any intake:** run one dedicated person-detection pass over the whole corpus (see the systemic
caveat above). Do **not** inherit this lane's person-free record as settled.

**If M4 is the goal:** a targeted follow-up sourcing run against `au_wa_perth` (+1) and a third locality
(×2), aimed at **suburban/coastal, not CBD**.

**Intake remains a separate, later, PK-gated T2/T3 lane** — unchanged.

---

## 8. Verification (chat fills this)

**Verdict:** _pending PK_

**Notes:**

- Output vs brief: no Gate-1 brief existed for this lane; spec inherited from `video-broll-intake-v1`.
  **A Gate-1 brief would have prevented R1** (see §9).
- Constraints respected: §5 attestation — zero DB/storage/git/live-selection writes.
- Unexpected files changed: this result doc is the only write outside the harness root.
- Success criteria: 24 clips meeting the corrected bar; 2 contested, 1 conditional, 7 decisions open.
- New risks: the systemic person-free epistemics caveat (§6) and the `f84ac010` live-pool conflict (§6 P1).

## 9. Learning notes (chat fills this)

- **Running a sourcing lane with no Gate-1 brief is what caused R1.** The orchestrator set the acceptance
  bar from judgment instead of reading `video-broll-intake-v1-gate1-brief-v1.md` first. A brief-author pass
  would have cost minutes and saved two full re-runs. **The absence of a brief is itself the finding.**
- **Subagents flagging spec discrepancies upward is load-bearing.** R1, R4, R5 and R6 were all surfaced by
  subagents contradicting their own instructions or their own prior records, rather than complying quietly.
  Instructions that explicitly invite "report the regression, don't preserve the count" produced this.
- **Verification depth is not monotone with confidence.** Three successive tightenings of person-detection
  each found what the previous pass had certified clean. A "verified" property should carry the *method*
  that verified it, not just a boolean.
- **A quality upgrade can surface a rule violation.** Re-fetching sharper masters was a pure quality action
  that invalidated prior sub-legibility judgments. Any resolution change must re-run content checks, not
  inherit them.
- **Reusable:** for a portrait-delivery spec, check the collector's orientation parameter FIRST — a
  hard-coded `orientation=landscape` silently poisons the entire candidate pool before any judgment is applied.

---

## 10. Register payload (version-less — pointer only, per Convention 1)

```
B-roll video sourcing, 4 brands — SOURCING COMPLETE, nothing intaken (T-none; harness-confined).
24 clips (6/brand) @ ≥12s usable + 1080×1920 crop-proofed + zero upscaling. Corpus 100% Pexels
(Pixabay per-clip licence path still UNTESTED). CFW 4 solid + 2 contested · NDIS 6→5 conditional ·
PP 6 (advances M4 by ZERO — no geo-verifiable clip) · INV 6.
⚠ P1: live asset f84ac010 (source_pexels_id 32433684) flagged — legible "Fremantle" signage found by
independent harvest + possible wrong geo label ("Cottesloe"); db-rls-auditor/PK verification required.
7 PK decisions open. Person-free status PROVISIONAL — see result doc §6 systemic caveat.
Result: docs/briefs/results/broll-video-sourcing-4brand-result-v1.md
Zero DB/storage/git/live-selection writes. Next gate: PK decisions, then separate T2/T3 intake lane.
```
