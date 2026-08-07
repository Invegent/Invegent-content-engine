# Result — dedicated person-detection pass over the 4-brand B-roll corpus + PK policy ruling

**Brief file:** none — the pass was mandated by `docs/briefs/results/broll-video-sourcing-4brand-result-v1.md`
§7 ("run one dedicated person-detection pass before intake; do NOT inherit this lane's person-free
record as settled"), register-quoted at v6.162.
**Executed by:** Claude Code (orchestrator) + 4 fenced subagents, one per brand
**Completed:** 2026-08-07 Sydney
**VERSION-LESS** — register payload at §11.

---

## 1. Result status

`Complete`. Every clip file in the corpus scanned full-timeline. **The intake precondition from
`broll-video-sourcing-4brand-result-v1.md` §7 is DISCHARGED.**

The pass found people. It then became moot as a *blocker* — because PK ruled during the lane that
person-free is not required (§4). Both facts are recorded: the ruling does not erase the findings, and
the findings are what made the ruling well-founded rather than a guess.

**Scope scanned:** 37 clip files — Invegent 6 · Care for Welfare 10 (6 offered + 3 replaced-out + the
superseded HD tier of `cfw-broll-02` re-scanned as a deliberate control) · Property Pulse 6 ·
NDIS Yarns 15 (6 offered + 9 reserve). Each agent inspected the **current/final** tier — the file that
would actually ship — and recorded which file and sha256 it read.

## 2. Commit(s)

N/A at authoring — working-tree only. Persistence is the control tower's step.

## 3. Files changed

- `docs/briefs/results/broll-person-detection-pass-result-v1.md` — created (this doc).
- `_harness/broll_harvester_v1_20260806/**` — evidence frames, tooling, and a `person_detection_pass`
  block added per clip in each brand manifest (additive; pre-edit manifest backups written).
  **No pre-existing manifest field was altered.**
- **Zero DB writes · zero storage uploads · zero git operations · zero network · zero intake.**

## 4. PK POLICY RULING (2026-08-07) — with its scope fence

> **Strict person-free is NOT required for background footage/imagery.** Incidental
> **non-identifiable** people are ACCEPTABLE where the source is stock and the licence permits.
> Heavy scrim is available as a mitigation.

PK's reasoning, verbatim in substance: person-free is impossible if we want warm imagery, and
*"just because of faces ruining all the good background doesn't make sense."*

**Evidentiary basis — measured, not assumed.** This pass found **zero face-resolvable people anywhere in
the corpus.** The strongest case is ~33 delivered px with clothing and stance readable but no face
(`pp-broll-01`); everything else is 8–30 px, largely top-down. Licence-wise, the Pexels License permits
people — its only people-related restrictions are no-bad-light and no-implied-endorsement, neither
engaged by an anonymous distant figure.

**NDIS was flagged as a distinct case BEFORE the ruling was recorded, and confirmed separately.**
NDIS's person-free rule does not rest on licence: a person shown in disability-services content implies
that person is an NDIS participant, which is sensitive health information under OAIC. That is a policy
amendment with an external legal basis, not a preference. It was put to PK as its own question and PK
explicitly confirmed NDIS is included.

### 4.1 SCOPE FENCE — the ruling is recorded at the scope PK's words support, and no wider

| | |
|---|---|
| ✅ **Covered** | Incidental, **non-identifiable** background people — pedestrians, distant figures, top-down aerials |
| ❌ **NOT covered** | NDIS **Phase 2** (identifiable adults) — remains CLOSED; its disability-led representation reviewer prerequisite remains **unappointed** |
| ❌ **NOT covered** | NDIS **Phase 3** — minors · participant stories · clinical/personal-care · First-Nations-specific — remains HELD/hard-blocked and purpose-bound |
| ❌ **NOT covered** | The **signage** rule. The three assets fenced 2026-08-07 (`f84ac010`, `e6e24358`, `2d62b04e`) were fenced for third-party signage/brand marks — a different defect class. **They stay fenced.** |
| ❌ **NOT covered** | Intake. The corpus remains harness-only behind the watch gate; intake is its own T2/T3 chain + PK gate |
| ❌ **NOT covered** | A genuinely **face-identifiable** person. That would be a NEW decision |

**Operational consequence:** stop treating `person_free` as a pass/fail gate for background assets.
Record people found (count, delivered size, identifiability) as **metadata**, not as a blocker. Reserve
escalation for face-resolvable identity, minors, and the NDIS Phase-2/3 categories above.

**Note on scrim:** it helps **text legibility**, not identifiability. At these pixel sizes identifiability
is already near zero, so scrim is a legibility tool here — not a privacy control. It should not be
recorded as a privacy mitigation.

## 5. Verdict table

Evidence for every verdict — **including negative evidence for `person_free` calls** (resolved
false-positive tracks, activity maps, shadow-lifted and native zooms) — is in each brand's
`frames/person_detection/` and the per-clip `person_detection_pass` manifest block.

### 5.1 Property Pulse — 4 person_present · 1 indeterminate · 1 person_free

| Clip | Verdict | Detail |
|---|---|---|
| `pp-broll-01` | **person_present** | **≥4 at t=8 alone** — two civilians on a front lawn at ~33 px (black top/blue jeans/light cap; pink top/black bag), a worker at a ute tailgate, a pedestrian on the far footpath. No face. Record said "1–2 workers… under 20px" — **materially understated on both count and scale**. Likely higher across the clip |
| `pp-broll-02` | **person_present** | 2 (dog-walker + second pedestrian, t≈8). Not identifiable. Found independently before the prior evidence was opened |
| `pp-broll-03` | `person_free` | **Thin margin** — full-timeline proves no *moving* person; the static detector has no proven true-positive on a stationary human on this footage, and a figure under an eave is not positively excluded |
| `pp-broll-04` | **indeterminate** | Not a discovery of people — a refusal to claim absence. A colour-distinct, human-sized blob persists in deep tree shadow the whole 22 s, unclassifiable at 11× native. At this vantage a person is 8–12 px, indistinguishable from foliage speckle |
| `pp-broll-06` | **person_present** | ≥2 — a **previously unrecorded** upright pedestrian on the verge beside the cycleway (t=13, ~20 px, unmistakable head/torso/legs at 12×), plus a boat under way with an on-board form. The row's `people_finding` still read "PASS – no identifiable people" |
| `pp-broll-07` | **person_present** | ≥1, clearly resolved at the **open rear hatch of a parked car on the roadway** — not "on a footpath" as recorded. Swept visually at one timestamp across 38.9 s, so "at least one" is defensible; a total of one is not |

### 5.2 Care for Welfare — 1 person_present · 4 person_free (offered set)

| Clip | Verdict | Detail |
|---|---|---|
| `cfw-broll-02` | **person_present** | **Two figures, not one.** Primary track t=12.05→15.60s (end), 74 linked frames, monotonicity 0.88, constant ground-plane height; walk_score 122.9 vs 26.1 for the clip's next-highest track (4.7× clear of its own false-positive population). Second pale-lavender figure separately resolvable from t=15.0s. Reproduced by a *different* detector than originally found it |
| `cfw-broll-03` · `-04` · `-07` · `-08` | `person_free` | 572 / 685 / 620 / 1790 frames, all scanned |
| `cfw-broll-09` | **person_present (file)** / `person_free` **within declared 7.60–23.36 s window** | Hand/forearm last clearly in frame ~6.7 s; the trim retains ~0.9 s margin. **Confirms the record rather than overturning it** |
| `cfw-broll-01` · `-05` · `-06` (replaced out) | `person_free` | Scanned for completeness |

### 5.3 NDIS Yarns — 0 person_present · 3 indeterminate · 12 person_free

| Clip | Verdict | Detail |
|---|---|---|
| `ndis-broll-03` · `-06` | `person_free` (high) | Static camera — the only path with a passing positive control (§6) |
| `ndis-broll-07` · `-08` · `-09` · `-10` | `person_free` (moderate–moderate-high) | Moving-camera clips rest on dense visual sampling, not automation |
| `ndis-broll-R1`–`R4`, `R8`, `R9` | `person_free` (moderate) | Reserves |
| **`ndis-broll-R5`** | **indeterminate** | A wall-mounted TV acts as a mirror aimed at the volume the handheld operator occupies. Highlight recovery opened the reflection but left **dark head-scale rounded forms** above the reflected table line unresolved; hallway depth also unresolvable |
| **`ndis-broll-R6`** | **indeterminate** | A dense **mist band** crosses the mid-ground exactly at the vanishing point of a public path. No tonal processing recovers detail behind water vapour |
| **`ndis-broll-R7`** | **indeterminate** | The window wall is the only exterior sightline *and* the only large reflective surface — defocused, clipped to white; a pale rounded-top upright could not be discriminated from a distant standing figure |

**No `person_present` in NDIS.** The three `indeterminate` calls are reflections and mist, not sightings.

### 5.4 Invegent — 0 person_present · 6 person_free

All six `person_free` at the current tier. Frame coverage 341–1796 frames per clip, every delivered frame.
`inv-broll-03` (open-plan office) is the strongest evidence in the set — **zero** tracker detections
against proven instrument sensitivity, zero crushed cells, every chair confirmed empty under CLAHE.
The prior shadow-zone call was **re-run, not inherited**. No reflected figures found in the glass facades.

Two honest qualifications: `inv-broll-01`'s tracker is unreliable (a rotating camera over a regular
window grid threw two false walking-signature flags; verdict rests on visual sweep and on the fact that
ground level is never framed), and `inv-broll-05` has the largest dark area with **no higher tier to
escalate to**. Separately, `inv-broll-06` was documented as **pareidolia**: at contact-sheet scale a
section reads as a humanoid torso; at native resolution it is a rotating particle sphere's limb with no
anatomy. Recorded so it is not rediscovered later as a false alarm.

## 6. INSTRUMENT EPISTEMICS — the most reusable output of this lane

**Two of the four agents' first instruments failed their own positive controls, and both caught it.**

1. **Invegent's v1 scanner** used a short-baseline residual. A slow, soft-edged figure overlaps itself
   frame-to-frame, so the minimum collapsed to zero: a synthetic **120 px** figure went completely
   undetected. **This reproduced the `cfw-broll-02` false-negative class exactly** — it is a mechanistic
   explanation for the original miss, not a character judgement about the original reviewer. The failed
   scanner is retained in the package as recorded negative evidence and was used for no verdict.
2. **NDIS's first control pair** was built with ffmpeg `drawbox` and contained **no overlay at all** —
   the filter was silently dropped, briefly producing a false "the detector is blind" conclusion. Rebuilt
   in Python and pixel-verified; the invalid artefacts are quarantined under `INVALID-*` names.

**Measured bounds — these cap what ANY person-free verdict in this corpus can claim:**

| Bound | Value | Source |
|---|---|---|
| Detection floor | **~30 px delivered height at ~10/255 contrast**; 16 px **not** detected | Invegent — synthetic figures composited into the clip's *own* delivered frames (120 px/Δ18, 60 px/Δ12, 30 px/Δ10 all detected) |
| Camera motion | **Static-camera path DETECTED the control; moving-camera path MISSED it.** Activations appeared at the correct column but never isolated as a track | NDIS — synthetic 22×62 px figure, the size class that defeated earlier inspections |
| Aerial scale | An aerial walker crosses only **0.2–0.4 px per frame**, so frame-to-frame differencing is **near-blind** to pedestrians. Required a **1.0 s-gap** comparison (928 gap pairs) to move a figure its own body length | Property Pulse |
| Alignment | A single **global affine was measured and rejected** — it leaves ~34 % of an aerial frame above threshold. Dense block-local compensation required | Property Pulse |

**Therefore:** automated full-timeline detection is **clearance-grade only on static-camera footage**.
On moving-camera clips it is supporting evidence; those verdicts rest on dense visual sampling and are
capped at moderate confidence accordingly. An independent alignment validator was also built on the
reasoning that *"no detections" from broken motion compensation is worse than no scan at all* — it
revealed two Invegent clips with unreliable tracker legs that would otherwise have read as clean.

**This is why the negatives here are worth something.** The `person_free` verdicts in this doc are backed
by instruments demonstrated to detect the thing they are looking for. That was not true of any prior pass
in this programme.

## 7. `cfw-broll-02` — the figure was present in its OWN original file

The CFW agent re-scanned the **superseded HD tier** as a deliberate control and found the same figure at
the **same timestamp and same delivered coordinates**.

**This was never a 4K-re-fetch discovery.** The original *"No text/watermark/legible signage across 9
sampled full-timeline frames"* / "person-free 16/16 frames" claim was **false against the very file it
was made on**. It removes the most comfortable available explanation — that a sharper master revealed
something previously invisible — and replaces it with: the check did not find what was there to be found.
Control evidence: `frames/person_detection/cfw-broll-02-hd/track0_native_crops.jpg`.

**One unreconciled discrepancy, flagged not silently fixed:** the prior record logs centroid x=530→304 at
y≈355; this pass measures delivered x=941.8→533.0 at y=600–640. Time window, direction, monotonicity and
constant height agree exactly; **the coordinate frames do not.** Cause unidentified.

## 8. CORRECTION — `ndis-broll-10` signage/trim claim

**Recorded as a correction, not a quiet fix.** The orchestrator previously reported — to PK and to the
control tower — that `ndis-broll-10`'s Thai interpretive-board signage fell **outside** its offered trim
window, on the strength of the record's own claim that the board is in frame "~3s–14.5s" and that "the
offered trim [14.80, 31.40] excludes it entirely."

**That is false.** The board is plainly in frame with legible Thai script at **t=15.80 s, 21.07 s and
26.33 s — all inside the offered trim.** The clip therefore carries legible foreign-language signage in
its delivered window, and the Thai signage additionally places the location outside Australia,
reinforcing the pre-existing geo concern rather than resolving it.

The orchestrator relayed the record's claim without verifying it — the same failure mode this entire pass
exists to catch.

## 9. Non-people defects surfaced (nobody was looking for these)

- **Vehicle number plates at or near legibility** in `cfw-broll-05`'s distant street band at native
  resolution. A **PII class nobody was scanning for**. That clip is already replaced out, but the class
  exists in the corpus and no lane has checked for it.
- **Undisclosed evidence asymmetry (NDIS).** The three hardening stages (dense re-scan, head/tail, native
  zooms) were applied only to the 6 offered clips, yet the identical `person_free_confirmed: true` boolean
  was written for all 9 reserves on 12-sample contact sheets alone. Reserve evidence strings such as
  *"All 12 frames show an empty room; nobody enters"* over-claim regions never readable at that scale.
- **Unrecorded legible text.** NDIS `R5` — "ABSTRACT ART" on a book (field says false). `R9` — hotel room
  number "128" readable for the first ~5 s (field unset). `ndis-broll-09` carries a pedestrian-pictogram
  sign at t=30.24 s while its signage field reads false.
- **Two NDIS cultural flags ESCALATED, not cleared** — `R5`'s unattributable face-like mask panel and
  `R6`'s themed woven/thatch aesthetic of unidentified referent. Per policy these escalate; a lane must
  never clear them itself.
- **`cfw-broll-04` recorded as a static camera — it is not.** ~110 delivered px of slow monotonic global
  drift between t=7.9 s and t=21.0 s. Verdict unchanged, but it explains why background subtraction scores
  200+ there on pure artefacts.
- **Misleading record phrasing.** `people_in_frame: "none within the usable window"` on `cfw-broll-07`
  and `-08` makes them read **identically to `cfw-broll-09`, which genuinely contains a person**. For 07
  and 08 the honest phrasing is "none, whole clip". This is exactly the ambiguity that lets a real finding
  hide inside a routine one.
- **`ndis-broll-R4` has no declared 9:16 crop** despite being a 2560×1440 landscape clip — **no delivered
  frame is defined**, so its person-free claim is not anchored to anything shippable. A centre crop was
  assumed and flagged as an assumption, not evidence.

## 10. What the INTAKE ELECTION now needs from PK

The person precondition is discharged and, under §4, person findings are metadata. **The live blockers
are now signage and geography, not people.**

1. **The per-clip accept/reject set** across the four brands, under the new ruling.
2. **`ndis-broll-10` — recommend REJECT.** Legible foreign-language signage *inside* the delivered window
   (§8) plus non-AU location. Both grounds are signage/geo, untouched by the people ruling.
3. **The three `indeterminate` NDIS clips (`R5`, `R6`, `R7`)** — all reserves, none in the offered set.
   Simplest disposition is to leave them out rather than resolve them.
4. **`pp-broll-04`** — `indeterminate` by imagery limitation, not by defect. Under the new ruling this is
   plausibly acceptable; it needs a yes/no rather than more scanning, because more scanning will not
   resolve it.
5. **Whether the non-people defects in §9 gate anything** — particularly the `cfw-broll-05` number plates
   (that clip is already out) and the unrecorded legible text in NDIS `R5`/`R9`.
6. Pool context, unchanged and pressing: **live PP B-roll pool is 3, effective selection 2**, with the
   `fail_closed` cliff measured at 0 and no shared-pool fallback for video.

## 11. Open issues

1. **⚠ NDIS POLICY DOC vs PRACTICE DRIFT — named, NOT written.**
   `docs/briefs/ndis-sensitive-real-imagery-intake-policy-v1.md` defines Phase 1 as
   **"REAL but PERSON-FREE / non-identifying"**. PK's 2026-08-07 ruling effectively selects the
   **non-identifying** reading over the **person-free** reading for backgrounds. The policy document
   itself may deserve a **PK-gated amendment** recording the ruling, so the paper and the practice do not
   drift apart. **This lane did not edit that document and must not** — naming it is the deliverable.
2. **Moving-camera detection has no clearance-grade instrument.** Building one is unscoped and
   unauthorized; until it exists, moving-camera person-free claims are capped at moderate confidence.
3. **`cfw-broll-02` coordinate discrepancy** (§7) — unexplained.
4. **`still-background-signage-verification-v1`** — 44 live still-image background rows with no recorded
   signage verification (from `broll-live-pool-fence-result-v1.md` §8.2). Still named, unstarted,
   unauthorized. **Note:** the §9 number-plate finding suggests that lane should scan for PII, not only
   signage.
5. **Nothing re-checks live pool contents against the rules they were admitted under** — the structural
   recommendation from `broll-live-pool-fence-result-v1.md` §8.3, still unadopted.
6. The seven PK decisions from `broll-video-sourcing-4brand-result-v1.md` §7 carry unchanged.

---

## 12. Register payload (version-less — pointer only, per Convention 1)

```
PERSON-DETECTION PASS COMPLETE — 37 clip files, 4 brands, full-timeline. §7 intake precondition
DISCHARGED. Verdicts: PP 4 person_present / 1 indeterminate / 1 person_free(thin) · CFW 1
person_present (2 figures, not 1) + 1 in-file-clean-in-trim / 4 free · NDIS 0 present / 3
indeterminate (reflection+mist) / 12 free · INV 0 present / 6 free. ZERO face-resolvable people
anywhere in the corpus.
PK RULING 2026-08-07 (all 4 brands, NDIS confirmed separately after its distinct OAIC grounds were
flagged): person-free NOT required; incidental NON-IDENTIFIABLE people acceptable where licence
permits; scrim = legibility tool, NOT a privacy control. SCOPE FENCED: NDIS Phase 2/3 untouched ·
signage rule untouched (3 fenced assets stay fenced) · no intake authorized · face-identifiable =
NEW decision.
INSTRUMENT BOUNDS (register-worthy): detection floor ~30px delivered @10/255 contrast (16px missed) ·
static-camera path DETECTED positive control, MOVING-camera path MISSED it => automated clearance is
static-only · aerial walker moves 0.2-0.4px/frame (frame-differencing near-blind; 1.0s-gap needed) ·
global affine rejected on aerial parallax. TWO of four agents' first instruments FAILED their own
positive controls, caught it, rebuilt.
cfw-broll-02 figure present in its SUPERSEDED HD tier at identical timestamp+coords => the original
person-free claim was FALSE AGAINST ITS OWN FILE, not a 4K-refetch discovery.
CORRECTION: ndis-broll-10 Thai signage is INSIDE the offered trim (t=15.80/21.07/26.33), not outside
as previously relayed => recommend REJECT (signage + non-AU location; both untouched by the ruling).
ALSO FOUND: vehicle number plates near-legible (cfw-broll-05) = PII class nobody scanned for ·
NDIS reserve evidence asymmetry · unrecorded legible text (R5, R9, clip 09) · 2 cultural flags
ESCALATED not cleared · cfw-broll-04 mis-recorded as static (~110px drift) · misleading
"none within the usable window" phrasing · ndis-broll-R4 has NO declared 9:16 crop.
OPEN: NDIS policy DOC says "PERSON-FREE / non-identifying" - ruling selects the latter; doc may need
a PK-gated amendment so paper and practice don't drift (NAMED, NOT WRITTEN).
Result: docs/briefs/results/broll-person-detection-pass-result-v1.md
Zero DB/storage/git/network/intake. Next gate: PK intake election (blockers now signage/geo, not people).
```
