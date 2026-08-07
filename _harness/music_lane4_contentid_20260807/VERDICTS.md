# Lane 4 — Content-ID verdicts — **RECORDED 2026-08-07: 3/3 CLEAN**

**Method:** cc-0039 (`docs/briefs/cc-0039-drifting-piano-content-id-verification.md`).
**Verdict source:** PK, personally observed in YouTube Studio → Channel content → Videos, 2026-08-07.
This is the deciding act; no agent inferred, predicted, or filled in any verdict below.

| # | track_key | mood | Uploaded | Visibility | Notices column | Verdict | Evidence |
|---|---|---|---|---|---|---|---|
| 1 | `uplifting_composed_pluto_007` | uplifting | 2026-08-07 | **Private** | `—` | **CLEAN** | Studio "Channel content → Videos" listing, PK screenshot 2026-08-07; hover tooltip: *"No notices — This video is reaching viewers and earning according to your settings"* |
| 2 | `warm_acoustic_simple_001` | warm | 2026-08-07 | **Private** | `—` | **CLEAN** | as above |
| 3 | `neutral_short_4mei_009` | neutral | 2026-08-07 | **Private** | `—` | **CLEAN** | as above |

## Cross-check performed on the evidence (2026-08-07)

The Studio listing showed durations **1:40 · 3:53 · 1:09**; the clips built by `_build_clips.py` are
**1:39 · 3:52 · 1:08** (YouTube rounds up to the whole second). Titles matched the filenames as
intended. **This confirms the three uploads were the three intended clips** — the check exists
because a mis-upload would otherwise produce a CLEAN verdict for a track that was never tested.

All three were uploaded **Private**, satisfying the cc-0039 "never public" constraint.

## Consequences

- **No edit to the flip is required.** `flip_content_id_safe_FORWARD.sql` targets exactly these three
  `track_id`s and asserts exactly 3 rows updated. With 3/3 CLEAN, the `VALUES` list and both `<> 3`
  cardinality checks stand as authored.
- **The flip is now unblocked on evidence**, and blocked only on its gates (below).

## Residual worth honouring before the flip applies

**Content-ID matching is not always immediate, and a claim can appear after an initially clean read.**
The flip will not run today — it sits behind a PK gate, the Phase-1 production-write watch
(to ~2026-08-11 20:20 Sydney), and Lane 5. That gap is an asset, not a problem:

> **Re-check the Notices column on all three immediately before the flip is applied.** It costs one
> Studio page load and catches a delayed claim that would otherwise be baked into a governance
> column. If any track has acquired a notice by then, remove it from the flip's `VALUES` list and
> update both `<> 3` checks in the same edit.

Do **not** delete the three test uploads until the flip has been applied — they are the only way to
perform that re-check. (This supersedes step 8 of the original runbook, which assumed the verdict
and the flip happened together.)

## Still true after CLEAN — the flip changes nothing observable

`content_id_safe` is one of nine `select_music` conditions. After the flip these three remain:

- **fenced** — `approval_status='intake_candidate'`, all four fences false; and
- **without a `scoped_approval` review-event** for `(format, video_short_stat)`; and
- **behind Drifting Piano** on `ORDER BY loudness_lufs NULLS LAST` — all three are `loudness_lufs=NULL`
  and sort last, so they would lose every call even if fully promoted.

Promotion is a separate later gate, sequenced **after Lane 5** delivers rotation. See
`docs/briefs/music-lane4-content-id-clearance-packet-v1.md` §4 and
`docs/briefs/music-lane5-rotation-capability-packet-v1.md`.
