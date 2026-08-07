# Consolidated handoff — image + B-roll harvest programme → intake lane

**Purpose:** the **single document the intake lane opens.** It consolidates four prior result docs into
one ledger, one decision list and one custody map. Where it differs from a predecessor, **this doc is
current**; predecessors are not amended (no historical rewrite).
**Authored:** 2026-08-07 Sydney · **Working-tree only, uncommitted.**
**Status:** programme TERMINAL pending PK decisions. **Nothing intaken. Nothing promoted.**

**Predecessors (all still valid as evidence; superseded only where noted):**
`broll-video-sourcing-4brand-result-v1.md` (`9dcdb92`) · `broll-live-pool-fence-result-v1.md`
(`d5a7d5c`) · `broll-live-pool-fence-addendum-v1.md` (`a1bfb02`) ·
`broll-person-detection-pass-result-v1.md` (`1aaff71`)

---

## 1. Intake ledger — 38 assets

### 1.1 Still images — `_harness/image_harvester_v0/` · PK visual gate **PASSED 2026-08-06**

14 accepted. `usage='background'` (**not** `broll_background`) — a **different intake shape** from
§1.2; it needs its own `db-rls-auditor` pass.

| # | ID | Brand | Licence | sha256 (16) | Disposition |
|---|---|---|---|---|---|
| 1 | `cfw-03` | CFW | Unsplash | `7fc5a9dd71781c55` | PK ACCEPTED |
| 2 | `cfw-07` | CFW | Unsplash | `b94a02c4d5158c40` | PK ACCEPTED |
| 3 | `cfw-09` | CFW | Pexels | `51f6d67092d187df` | PK ACCEPTED — faint wall mark, zoom-check before use |
| 4 | `cfw-10` | CFW | Unsplash | `f467b9285138eef9` | PK ACCEPTED |
| 5 | `cfw-12` | CFW | Pexels | `952f6680939562e6` | PK ACCEPTED — strongest CFW |
| 6 | `cfw-13` | CFW | Pexels | `ba6ac08d4e0a8159` | PK ACCEPTED — **possible 3D render, authenticity unconfirmed** |
| 7 | `inv-03` | INV | Unsplash | `3aa41a4ec03692d1` | PK ACCEPTED |
| 8 | `inv-04` | INV | Unsplash | `bfead9bf2d69413a` | PK ACCEPTED |
| 9 | `inv-05` | INV | Unsplash | `c2e01be09de4f6cf` | PK ACCEPTED — ambiguous person-shaped reflection |
| 10 | `inv-06` | INV | Unsplash | `0e023fb32bdd62d9` | PK ACCEPTED |
| 11 | `inv-07` | INV | Pexels | `5f411bcfbd6cce11` | PK ACCEPTED — **Milwaukee Art Museum; NEVER geo-label** |
| 12 | `inv-08` | INV | Pexels | `9c208f737e096e0d` | PK ACCEPTED — **landmark-style facade; NEVER geo-label** |
| 13 | `inv-09` | INV | Unsplash | `b800b3f5e4a41284` | PK ACCEPTED |
| 14 | `inv-10` | INV | Unsplash | `8046f5106faedcf3` | PK ACCEPTED |

**Rejected (10, do not intake):** CFW `cfw-01 02 04 05 06 08 11` · INV `inv-01 02 11`.
`cfw-05`/`cfw-06` carry a **corrected** manifest record — a metadata swap was found and fixed
(`changelog` in `manifest.json`); byte provenance was never affected.

### 1.2 B-roll video — `_harness/broll_harvester_v1_20260806/<brand>/`

**24 assets: 20 INTAKE · 3 HOLD · 1 REJECT** — five per brand, one HOLD each in PP/CFW/INV, one REJECT
in NDIS. (Corrects the "22 INTAKE" figure in the predecessor's summary line, which contradicted its own
rows.) All Pexels License. All ≥12s usable, 1080×1920 crop-proofed, **zero upscaling**.
sha256 shown is the **source master**; PP additionally has delivery-encode hashes in §1.3.

| Brand | ID | Pexels ID | Usable s | sfto | sha256 (16) | Disposition |
|---|---|---|---|---|---|---|
| **PP** | `pp-broll-07` | 31845109 | 38.939 | needs_scrim | `40ac0cfdb596a596` | **INTAKE** |
| PP | `pp-broll-04` | 25921920 | 22.155 | true | `ea7ea53e2c6841c8` | **INTAKE** |
| PP | `pp-broll-06` | 30517085 | 19.620 | needs_scrim | `19aba4251933d771` | **INTAKE** |
| PP | `pp-broll-02` | 36870461 | 12.696 | true | `029839d39c3235b2` | **INTAKE** — 0.70s headroom |
| PP | `pp-broll-03` | 26547053 | 12.546 | needs_scrim | `0801b9ae35da7a51` | **INTAKE** — 0.55s headroom |
| PP | `pp-broll-01` | 31965047 | 16.917 | needs_scrim | `4a4afa5f85b74723` | **HOLD** (PK ruled) — ≥4 people, 2 civilians ~33px; utility crew + boom lift throughout |
| **CFW** | `cfw-broll-04` | 15232585 | 22.856 | needs_scrim | `1626e6629dbcbf43` | **INTAKE** — strongest CFW |
| CFW | `cfw-broll-08` | 26653871 | 59.72 | needs_scrim | `1068da5dd97fe5bf` | **INTAKE** — 262MB, transcode expected |
| CFW | `cfw-broll-07` | 36623154 | 20.66 | needs_scrim | `898821fc75ac707e` | **INTAKE** |
| CFW | `cfw-broll-09` | 7239162 | 15.76 | needs_scrim | `468df7079c6404ca` | **INTAKE** — hand in frame pre-trim; people ruling likely retires the trim |
| CFW | `cfw-broll-02` | 2278036 | 15.641 | needs_scrim | `3a9540bac1f47ba3` | **INTAKE** — **2 people confirmed**; the 0.05s trim problem is moot under the people ruling |
| CFW | `cfw-broll-03` | 6627129 | **DISPUTED** | needs_scrim | `31664a45bb0dbe51` | **HOLD** — 11.16s rule-as-written vs 22.88s defect-only. **Decision 4** |
| **INV** | `inv-broll-05` | 5712539 | 25.78 | needs_scrim | `e4a74a601b90b471` | **INTAKE** — native portrait, no crop |
| INV | `inv-broll-04` | 5716999 | 20.06 | true | `78e3bc346f63c564` | **INTAKE** — cleanest crop |
| INV | `inv-broll-01` | 4216715 | 20.70 | needs_scrim | `6650e8fef846effe` | **INTAKE** — text zone migrates |
| INV | `inv-broll-02` | 8477689 | 59.45 | true | `a1bc18f9c62905de` | **INTAKE** — 185MB; **`generic_use_only`, NEVER geo-label** |
| INV | `inv-broll-06` | 3141210 | 18.55 | needs_scrim | `70d1361eeefc5706` | **INTAKE** — legible numerals ("2020" reads as a year) |
| INV | `inv-broll-03` | 5483080 | 13.24 | needs_scrim | `352ddc409110b71e` | **HOLD** — left-anchor crop only, 1.24s margin, sub-legible maker mark |
| **NDIS** | `ndis-broll-07` | 36622181 | 63.93 | needs_scrim | `0cf209e37c9576ac` | **INTAKE** |
| NDIS | `ndis-broll-09` | 34411694 | 26.20 | needs_scrim | `b0afaa545060105f` | **INTAKE** |
| NDIS | `ndis-broll-08` | 29513615 | 25.93 | needs_scrim | `f06199cec84044b6` | **INTAKE** |
| NDIS | `ndis-broll-03` | 6377373 | 19.60 | needs_scrim | `be5adc2d88dd7503` | **INTAKE** |
| NDIS | `ndis-broll-06` | 37339279 | 16.44 | needs_scrim | `9652cfaea0790886` | **INTAKE** |
| NDIS | `ndis-broll-10` | 36743176 | 16.60 | needs_scrim | `5a19913586d190a7` | **REJECT — recommended.** Legible Thai signage **INSIDE** the delivered window (t=15.80/21.07/26.33 within trim [14.80,31.40]) + non-AU location. **Decision 5** |

**Geo/locality:** **no B-roll clip carries a verifiable geography claim.** This corpus advances the M4
locality bar by **ZERO**. `inv-broll-02`, image `inv-07`/`inv-08` are landmark-recognisable and must
never be geo-labelled. AU CBD skylines proved effectively unharvestable (Brisbane 0/5).

**People:** per the **PK ruling 2026-08-07**, incidental **non-identifiable** people are acceptable
where licence permits — recorded as metadata, not a blocker. **Zero face-resolvable people** corpus-wide.
Scope is fenced: NDIS Phase 2/3 untouched, signage rule untouched, face-identifiable = a new decision.

### 1.3 PP delivery encodes — FROZEN packet, review chain complete

`docs/briefs/pp-broll-batch4-intake-v1-apply-packet.md` · **frozen sha256
`239b5ffc7819403c79c92e18d8c7822d3da85de3655db4757b8eb0c43bcc68db`** (git blob `acc9d3a3`, 45,470 B).
Encodes at `.../property-pulse/delivery_encodes/` + pinned `manifest.sha256`
(`de1747769f9eab7d…`). 1080×1920 h264, 0 audio streams, 198.8 MB total (from ~690 MB masters).

| asset_key | Delivered bytes | Delivered sha256 (16) |
|---|---|---|
| `broll_pp_au_residential_streets` | 77,513,615 | `109caccfd6026ff8` |
| `broll_pp_au_suburb_skyview` | 33,625,514 | `f40b12cb0a9c8c38` |
| `broll_pp_au_foreshore_parkland` | 33,280,185 | `fa70f2e892265429` |
| `broll_pp_au_suburban_neighbourhood` | 29,690,728 | `e7368f40f163d165` |
| `broll_pp_au_waterfront_homes` | 24,733,517 | `0d9dde607cc3236b` |

**Review chain:** `db-rls-auditor` ×2 (concerns → all must-fix closed) · `apply-harness-auditor` ×2
(INCOMPLETE → CONCERNS, all 18 findings closed) · external review ×2 — **`disagree`/escalate,
STANDING** (`2396ad28`, `52425853`) · **rolled-back production proof PASSED** (PK-authorised, one run).

**The proof is the strongest evidence in the programme:** inside a transaction, the live resolver
**rejected all five** new rows (they appear in its own `rejected` array), selected a pre-existing clip,
and reported `pool_eligible = 3`. Rollback verified: 134 rows, both content digests byte-identical,
**zero residue**. `geo_scope='au'` + `geo_national_safe=true` per PK ruling.

⚠ **The external review verdict is unresolved and is PK's to close.** Its live objection is
cross-channel ordering: storage upload and DB insert are two non-transactional channels, so ordering is
**operator-sequenced, not machine-enforced** (a storage precondition is unreachable from SQL). Fenced
rows make every failure state inert and recoverable.

---

## 2. Live pool state — what intake must restore

| | |
|---|---|
| PP B-roll eligible pool | **3** (was 6 on 2026-08-07 morning) |
| **Effective selection** | **2** — recent-use exclusion strips 2 of 3 |
| Governance floor | minimum **4**, target **6** → currently `below_floor = true` |
| Backfill | **none automatic** |

**Fenced 2026-08-07** (PK-authorised production writes, all reversible, rollback SQL + prior-state md5s
in the fence result docs): `f84ac010` (legible "Fremantle" wordmark; geo label also wrong — Fremantle,
not Cottesloe) · `e6e24358` (legible "Owen Hodge" law-firm wordmark) · `2d62b04e` (McDonald's arches
~15px; also named "Generic" while geo-tagged Hurstville).

**Measured cliff (rolled-back transactions):** pool 3 → `status:ok`; pool **0** →
**`fail_closed` / `no_governed_background`**. **Video has NO shared-pool fallback** (the branch is gated
on `NOT v_bg_is_video`), and **no minimum-pool threshold exists in the resolver** — "POOL=6 MET" is a
governance figure, not a mechanical one. **Treat the third fence as the last before backfill.**

**Promoting the PP five would take the pool 3 → 8**, clearing both floor and target.

---

## 3. Open PK decisions — ONE list, deduplicated across four docs

1. **`f84ac010` geo label still wrong** (`au_wa_perth_cottesloe`; footage is Fremantle). Harmless while
   fenced — **must not be un-fenced with the label intact.**
2. **`42211c0f`** (separately fenced) carries `safe_for_text_overlay='needs_gradient_scrim'` — a value
   the resolver does **not** recognise. Inert while fenced; would misbehave if promoted as-is.
3. **PP intake apply gate** — packet frozen at `239b5ffc…`, external review `disagree`/escalate
   standing. Proceed, or hold? Also unresolved: the **73.9 MiB** object vs a 59.5 MiB bucket
   high-water mark (project limit not DB-readable, no resumable fallback).
4. **`cfw-broll-03` duration** — rule-as-written (11.16s, fails) vs defect-only reading (22.88s,
   passes). The recorded 22.88s never reproduced on either tier.
5. **`ndis-broll-10`** — REJECT recommended (Thai signage inside the delivered window + non-AU).
6. **The three HOLDs** — `pp-broll-01`, `cfw-broll-03`, `inv-broll-03`: confirm HOLD or admit.
7. **Sibling packets (CFW / INV / NDIS)** — the once-per-shape review does **NOT** carry: adding
   `geo_national_safe` is an eligibility-touching **structural diff**, and the shape already passes
   **86 of 100** `jsonb_build_object` arguments (8 more pairs fails at parse time).
8. **Still-image intake** — 14 PK-accepted assets, a **different shape** (`usage='background'`),
   needing its own packet and auditor pass.
9. **`still-background-signage-verification-v1`** — 44 live still-image background rows carry **no
   recorded signage verification**. Named, unstarted, unauthorised. ⚠ **Widen it to PII**: near-legible
   vehicle **number plates** were found in `cfw-broll-05` — a class nobody has ever scanned for.
10. **NDIS policy-doc drift** — the ratified policy says Phase 1 is *"PERSON-FREE / non-identifying"*;
    the 2026-08-07 ruling selects **non-identifying**. A PK-gated amendment would stop paper and
    practice diverging. **Named, not written.**
11. **Structural:** nothing re-checks live pool contents against the rules they were admitted under.
    All three fenced defects surfaced **by accident**, via an unrelated harvest re-sourcing the same
    provider IDs.
12. **NDIS thematic gaps** (sourcing, not decisions): no assistive-technology imagery, no
    reception/community space; ramps remain `not_harvestable_licence_safe`.

---

## 4. Evidence custody map

| What | Where | If lost |
|---|---|---|
| Image package | `_harness/image_harvester_v0/` (worktree `admiring-shtern-6fdb19`) | images re-fetchable by source URL + sha256 in `manifest.json` |
| B-roll packages | `_harness/broll_harvester_v1_20260806/{property-pulse,care-for-welfare,invegent,ndis-yarns}/` | **clips re-fetchable by Pexels provider ID + sha256** (§1.2) |
| PP delivery encodes | `.../property-pulse/delivery_encodes/` + `manifest.sha256` | **reproducible** — masters + the exact ffmpeg command are in the frozen packet §3 |
| Person-detection evidence | `<brand>/frames/person_detection/` — 518 (NDIS) + 152 (INV) + 59 (PP) + 32 MB (CFW), incl. **negative** evidence | not reproducible without re-running the pass |
| Non-video evidence backup | `C:/Users/parve/ice-harvest-evidence-backup-20260807/harness-metadata-evidence.tgz` — **2,116 files** (manifests, frames, sheets) | — |
| Frozen apply packet | `docs/briefs/pp-broll-batch4-intake-v1-apply-packet.md` (main checkout, committed path) | in git |

⚠ **`_harness/**` is git-EXCLUDED and lives ONLY in worktree `admiring-shtern-6fdb19` (~5.3 GB).**
Archiving this session or cleaning the worktree **destroys the video evidence** (the metadata backup
does not include video). The register carries this warning at **v6.162**. Videos are re-fetchable;
frames and contact sheets are not.

---

## 5. Verification posture — read before trusting any claim here

- **Person-free is PROVISIONAL, not settled.** Three separate person-free claims in this programme were
  **false**, each caught only when inspection sharpened. Automated detection is **clearance-grade only on
  static-camera footage** (a pixel-verified positive control was **detected** on static, **missed** on
  moving camera). Measured floor: **~30px** delivered height at ~10/255 contrast; 16px not detected. An
  aerial walker moves **0.2–0.4 px/frame**, so frame-differencing is near-blind.
- **`cfw-broll-02`'s figure was present in its own original HD tier** — same timestamp, same
  coordinates. The original "person-free 16/16 frames" claim was **false against the very file it was
  made on**, not a discovery enabled by a sharper master.
- **Two of four detection agents' first instruments failed their own positive controls**, were discarded
  and rebuilt. The `person_free` verdicts here are backed by instruments proven to detect what they look
  for — which was **not** true of any earlier pass.
- **Fence targeting:** `resolve_slot_assets` gates on `is_active` + `approved` **only**;
  `production_use_allowed` and `approval_status` are read by **no live function**. Fencing via those two
  alone looks correct in the row and does nothing.

---

## 6. Register payload (version-less — pointer only, per Convention 1)

```
CONSOLIDATED HANDOFF for the image + B-roll harvest programme -> intake lane. ONE doc replaces
reconciling four result docs (9dcdb92, d5a7d5c, a1bfb02, 1aaff71; none amended).
LEDGER: 38 assets. Images 14 PK-ACCEPTED (visual gate PASSED 2026-08-06, usage='background' = a
DIFFERENT intake shape) + 10 rejected. B-roll 24 = 20 INTAKE / 3 HOLD / 1 REJECT (corrects the
predecessor's "22 INTAKE" summary-line error). All rows carry package path, provider ID, sha256,
licence, geo claim, signage status, disposition.
LIVE POOL: eligible 3, EFFECTIVE SELECTION 2, floor min 4 / target 6 => below_floor. Measured cliff:
pool 0 = fail_closed/no_governed_background; video has NO shared-pool fallback; no mechanical
min-pool threshold exists. Promoting the PP five restores 3 -> 8.
PP PACKET FROZEN 239b5ffc... - db-rls-auditor x2 + apply-harness-auditor x2 all findings closed;
external review x2 DISAGREE/ESCALATE STANDING (PK's to close); rolled-back production proof PASSED
(live resolver REJECTED all five; zero residue).
12 OPEN PK DECISIONS consolidated + deduplicated (S3).
CUSTODY: _harness/** is git-excluded, worktree-only, ~5.3GB. DO NOT ARCHIVE OR CLEAN. Videos
re-fetchable by provider ID + sha256; frames/sheets are NOT. Metadata backup = 2,116 files.
CAVEAT: person-free is PROVISIONAL - detection is clearance-grade only on STATIC camera; ~30px floor.
Result: docs/briefs/results/broll-image-harvest-consolidated-handoff-v1.md
Zero DB/storage/git/live-selection writes by this doc. Next gate: PK single-pass ruling at the sitting.
```
