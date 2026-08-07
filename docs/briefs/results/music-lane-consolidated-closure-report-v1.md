# Music lane — CONSOLIDATED CLOSURE REPORT (for the CGU Final control tower / PK sitting)

**From:** the music session (batch-2 intake · Lane 4 Content-ID · Lane 5 step 1–2).
**Date:** 2026-08-07 Sydney. **Branch:** `lane/music-closure-report-20260807` (isolated — NOT `main`).
**Status of this session: work complete, awaiting control-tower confirmation that evidence is durable.**

**Net production effect of this entire arc: ZERO.** No DB write, no storage write, no fence flipped,
no deploy, no resolver change. The live selectable music pool is **still exactly 1**
(`calm_piano_drifting_006`), verified read-only 2026-08-07.

---

## 0. TWO CORRECTIONS to the control tower's read — please fix before the sitting

**(a) I hold no Lane 5 rotation artifacts.** The control tower's read says this session holds
*"FORWARD/ROLLBACK SQL authored as untracked artifacts"* for `select_music` seed/rotation. Verified
false:

- My FORWARD/ROLLBACK are the **Lane 4 `content_id_safe` flip**, not a resolver migration.
- They are **tracked and pushed**, not untracked.
- **This session has authored no `select_music` seed/rotation SQL at all.**

Any such artifacts belong to the **Lane 5 owner session**. Attributing them here puts the wrong owner
on the wrong lane in the sitting.

**(b) Closure task 1 cannot be executed as written, and executing it would breach a PK ruling.**
Task 1 asks this session to *"finish"* the Lane 5 FORWARD/ROLLBACK artifacts. They do not exist here
(per (a)), and PK ruled earlier the same day:

> *"The session holding the existing 34 KB `select-music-seed-rotation-gate1-brief-v1.md` is the
> Lane 5 owner. Other sessions must stop authoring competing Lane 5 contract or migration artifacts
> and may only provide review/audit input to that owner."*

**Task 1 is therefore redirected to the Lane 5 owner session, not performed here.** This session's
Lane 5 contribution is review/audit only and is already complete (§3).

## 1. Shared-checkout disclosure (control tower asked to be told NOW)

**This session holds ZERO local commits on `main`.** Parity 0/0 at time of writing.

**Full disclosure:** this session pushed **nine commits to shared `main`** earlier today, each under
an explicit in-chat PK authorisation, the last two after a `branch-warden` clean/isolated verdict PK
specifically requested. Nothing was stranded and no other session's commit rode along — branch-warden
verified the exact transfer set on both. Under the newly-hardened rule those pushes would not have
been allowed; recorded here rather than left to surface later.

**This report is on an isolated branch and was NOT committed to `main`,** per the hardened rule.

## 2. Work-item register — every open item in this lane

| # | Item | State | Artifacts (path · git-blob sha256 prefix) | Exact gate it waits on |
|---|---|---|---|---|
| 1 | **Batch-2 intake packet v4** — 12 CC0 survivors | **FROZEN-AWAITING-GATE** | `docs/briefs/music-batch2-four-brand-intake-packet-v1.md` · apply `_harness/music_harvester_v1_20260806/music_v1_batch2_intake_apply.sql` `64af3d94…` · rollback `…_rollback.sql` `6eb94d4e…` · manifest `9be3f403…` · generator `47b99d57…` · audit CSV `8d0d393f…` | **BLOCKED at the execution boundary**: `psql` installed but **no write DSN**. Then rehearsal → PK gate → watch. PK deprioritised this on 2026-08-07 (*"stop pursuing steps 1–3"*). |
| 2 | **Lane 4 Content-ID clearance** — 3 tracks | **EVIDENCE DONE (3/3 CLEAN), flip FROZEN** | `docs/briefs/music-lane4-content-id-clearance-packet-v1.md` · verdicts `_harness/music_lane4_contentid_20260807/VERDICTS.md` · FWD `71f50427…` · RBK `40ec24a1…` | PK T3 gate + watch. **Mandatory pre-flip step: re-check YouTube Studio Notices** (delayed claims). **Do not delete the 3 Private test uploads until the flip applies** — they are the only re-check route. |
| 3 | **Lane 5 resolver rotation** | **HANDED OFF — owner session** | This session's contributions: `docs/briefs/music-lane5-rotation-capability-packet-v1.md` · `…step1-5arg-draft-reconciliation-v1.md` · `…pk-freeze-record-v1.md` (`9e1dda3`) | Owner freezes the Gate-1 brief. This session is review/audit only. |
| 4 | **Music Promotion gate** | **⚠ UNOWNED — no packet, no tier, no owner** | none | **PK ruled it exists** (owns the 4 fences + the `scoped_approval` event for `(format, video_short_stat)` + proof the pool becomes exactly 4). Nobody holds it. **Lane 5's part-2 proof cannot be scheduled until it does.** |
| 5 | **Parked cc-0038 per-platform scope** | **PARKED — provenance durable** | `docs/briefs/artifacts/NOT_APPLIED_SUPERSEDED_cc0038_select_music_per_platform_scope_20260711003222.sql` `48a96d41…` | None. Retired from the migration discovery path; never applied; retained for its reasoning. Whichever of it/Lane 5 lands second must rebase on the first — both DROP+CREATE the same function. |
| 6 | **Corporate-mood gap** | **OPEN** | — | Manual sourcing (Pixabay HTTP 403 · YouTube Audio Library needs a Studio login). **Invegent is doubly exposed** — missing mood, and the aural cull cost it one advisory suggestion (5→4). |
| 7 | **Audio normalisation carry** | **OPEN / scoped** | recorded in packet v4 §4a | 7 survivors have positive true peaks; loudness spans 6.22 dB; **ICE has no normalisation or true-peak limiting anywhere in the render path**. Cheapest resolution: read the Creatomate template's baked bed volume (not readable from this repo). |

## 3. Lane 5 audit findings handed to the owner (review/audit contribution, complete)

1. **PK's rulings ratify R2/R3 as drafted** and reorganise R6 into PK's two-part proof. Recorded in
   `select-music-seed-rotation-pk-freeze-record-v1.md`.
2. **Cooldown `(client_id, format)` IS implementable** — both columns exist on `m.music_usage_event`
   and the worker writes both. Three caveats for the owner:
   - `client_id` is **nullable** and can be NULL (smoke renders) → the lookup needs
     `IS NOT DISTINCT FROM`, not `=`, or cooldown silently goes inert for those rows.
   - Usage recording is **BEST-EFFORT by explicit design** (`video-worker/index.ts:225-230`: a
     production render can publish with no usage row, no retry, no durable alarm). Cooldown input is
     lossy; it fails toward *more* rotation, and part-2 evidence inherits the same gap.
   - `platform` is always written NULL → any future platform-scoped cooldown has no data.
3. **Ambiguity returned to PK, still open:** part 1 ends *"real PostgREST/RPC caller-path proof."*
   With no worker change the only available RPC call omits `p_seed`, which proves **compatibility**
   (index-0 path intact), not rotation. If a *seeded* RPC proof is intended, the worker change moves
   inside part 1.
4. **Hazard for a later lane:** eight unrelated **untracked `.sql` files still sit in
   `supabase/migrations/`** (incl. `20260710024829_create_select_music_rpc.sql`) — same class as
   cc-0038, wider than realised. Surfaced by `branch-warden`, owned by nobody.

## 4. Version-less register payload (for whoever holds the cut — NOT cut here)

> **Music lane consolidated closure (2026-08-07).** Batch-2 packet v4 FROZEN at the execution
> boundary — 12 CC0 survivors, apply `64af3d94…`, blocked on a write DSN, PK-deprioritised. Lane 4
> Content-ID **3/3 CLEAN** (`6b412f4`), flip authored + frozen (`71f50427…`), pre-flip Studio
> re-check mandatory, test uploads retained. Lane 5 consolidated to a single owner session; this
> lane's contribution is the PK contract-freeze record (`9e1dda3`, ratifies R2/R3, reorganises R6)
> plus cooldown-implementability audit. cc-0038 per-platform draft PARKED with durable provenance
> (`48a96d41…`), out of the migration discovery path. **⚠ Music Promotion gate is UNOWNED** — it
> holds the 4 fences + the `(format, video_short_stat)` scoped-approval event, and Lane 5's part-2
> proof is blocked on it, not on Lane 5. **Live selectable pool still exactly 1; zero production
> change from the whole arc.** Carries: corporate-mood gap (Invegent most exposed) · no loudness
> normalisation anywhere in the render path · 8 untracked `.sql` files in `supabase/migrations/`.

## 5. The lane's own finding, for the sitting

The arc was **disproportionate to its output** — and the reason is worth carrying beyond music.
ICE did not have a music-inventory shortage; it had a **music-selection capability gap**. Thirteen
tracks were sourced, packaged and audit-hardened before it was established that `select_music`
returns one deterministic winner with no seed — so the nine tracks already in the library had been
inert since July, and one track has scored every governed video since.

**Generalised lesson (PK, 2026-08-07):** *inspect the consuming resolver before building upstream
supply.* Asset gaps, avatar pools, video templates, music, backgrounds — establish that the live
consumer can actually choose and exercise inventory before creating more of it. Recorded to memory.

## 6. Boundaries honoured

Nothing applied. No DB write, no storage write, no fence flip, no deploy, no migration, no register
cut, no push to `main` from this report. The Lane 5 owner's in-flight brief was **not edited** —
it is uncommitted work in a shared checkout. The watch (to ~2026-08-11 20:20 Sydney) is **not waived**
by anything in this lane.
