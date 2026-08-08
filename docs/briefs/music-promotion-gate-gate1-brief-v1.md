# Brief cc-XXXX — Music Promotion Gate (GATE 1)

**Created:** 2026-08-07 Sydney
**Author:** CGU final-watch coordination session (PK directive 2026-08-07, watch-window priority 1)
**Executor:** TBD — **not yet issued**
**Status:** **draft — awaiting PK Gate-1 approval + task-ID allocation**
**Task ID:** `cc-XXXX` — **PK to allocate** (single cut owner)
**Result file:** `docs/briefs/results/cc-XXXX-music-promotion-gate.md`
**Tier:** **T3** — opens eligibility fences on the live governed render path.
**Lane classification (CCF-02):** SAFETY_GATE.

> **This lane exists because no lane owned this step.** Lane 4 ends at Content-ID clearance and is
> forbidden from flipping fences; Lane 5 consumes the eligible pool and is forbidden from touching
> approval. The true sequence is
> `Lane 4 flip → **THIS GATE** → Lane 5 R6 Part-2`. Recorded as an unowned gap in
> `docs/briefs/select-music-seed-rotation-pk-freeze-record-v1.md` §4–5.

---

## Task

Take the **three already-Content-ID-CLEAN tracks** through the exact governed eligibility state
`public.select_music` requires, so the live eligible pool can move **1 → 4**.

Nothing else. This lane does not change the resolver, does not add tracks, does not source, and does
not touch batch-2.

---

## The eligibility contract — read live, not inherited

Transcribed from `pg_get_functiondef(public.select_music)`, live 2026-08-07, function md5
**`61a18d15e9f49830bd257265e8c5ffbe`** (4-arg: `p_scope_kind, p_scope_value, p_min_duration_seconds,
p_mood`). A track is selectable **only if all nine hold**:

| # | Condition | Source |
|---|---|---|
| 1 | `l.commercial_use_allowed IS TRUE` | `m.music_license` |
| 2 | `l.social_use_allowed IS TRUE` | `m.music_license` |
| 3 | `l.content_id_safe IS TRUE` | `m.music_license` |
| 4 | `t.is_active IS TRUE` | `m.music_track` |
| 5 | `t.approved IS TRUE` | `m.music_track` |
| 6 | `t.production_use_allowed IS TRUE` | `m.music_track` |
| 7 | `t.approval_status = 'approved_scoped'` | `m.music_track` |
| 8 | `EXISTS` a `m.music_review_event` with `event_kind='scoped_approval'` matching `(scope_kind, scope_value)` | `m.music_review_event` |
| 9 | `NOT EXISTS` a `revocation`/`restriction`/`rejection` event at or after the latest matching `scoped_approval` | `m.music_review_event` |

> **⚠ Correction to the prior record.** The freeze record §4 named **four** fences
> (`approved`, `production_use_allowed`, `is_active`, `approval_status`) plus the scoped-approval
> event. It **omitted conditions 1–2**, which live on a *different table* (`m.music_license`).
> **Verified live: conditions 1 and 2 are ALREADY TRUE for all three targets**, so the omission costs
> this lane no work — but the gate specification must carry all nine, or a future track will be
> promoted into a state that still fails silently.

## Live baseline (read-only, 2026-08-07 — re-verify at apply, do not inherit)

| track_key | track_id | mood | dur | loudness | is_active | approved | prod_use | approval_status | comm | social | cid_safe | scoped_appr |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `warm_acoustic_simple_001` | `adbadf4c…` | warm | 97.3 | **NULL** | false | false | false | `intake_candidate` | ✅ | ✅ | false | 0 |
| `uplifting_composed_pluto_007` | `7b0f641c…` | uplifting | 230.3 | **NULL** | false | false | false | `intake_candidate` | ✅ | ✅ | false | 0 |
| `neutral_short_4mei_009` | `8a5e7835…` | neutral | 65.8 | **NULL** | false | false | false | `intake_candidate` | ✅ | ✅ | false | 0 |
| `calm_piano_drifting_006` *(incumbent)* | `8f520a93…` | calm | 110.5 | **−27.2** | true | true | true | `approved_scoped` | ✅ | ✅ | true | 1 |

**Live selectable pool = 1.** Zero `scoped_approval` events exist for the three targets.

## 🔴 The finding that governs sequencing — this gate alone changes NOTHING observable

`select_music` ends `ORDER BY t.loudness_lufs NULLS LAST, t.duration_seconds DESC, t.track_key
LIMIT 1`.

All three targets have `loudness_lufs = NULL`; Drifting Piano has **−27.2**. Under `NULLS LAST` a
non-null sorts **first**. So after this gate completes successfully and the pool is genuinely 4,
**`select_music` still returns Drifting Piano on every single call** — the same deterministic winner
that produced the measured 11/11.

- **This gate is necessary and invisible.** It converts pool size 1 → 4.
- **Lane 5 (seed rotation) is what makes it visible.** Only seed-indexed selection turns pool depth
  into observed variety.
- **Neither alone produces a user-visible outcome. Both must land.**

Do not record this gate as delivering rotation, and do not let its completion be read as the music
problem being solved.

---

## In scope

1. Re-verify the nine conditions live against the three `track_id`s immediately before apply.
2. **Sequence and own the Lane 4 flip** (condition 3) — artifacts already authored and frozen:
   `_harness/music_lane4_contentid_20260807/flip_content_id_safe_FORWARD.sql` (`71f50427…`) /
   `…_ROLLBACK.sql` (`40ec24a1…`), targeting exactly these three `track_id`s, asserting exactly 3 rows.
   **Mandatory pre-flip step: re-check YouTube Studio Notices on the three Private test uploads**
   — Content-ID can claim after an initially clean read. **Do not delete those uploads until the
   flip applies**; they are the only re-check route.
3. Open conditions 4–7 on the three tracks (guarded, asserted row counts, rollback authored first).
4. Insert one `scoped_approval` `m.music_review_event` per track for
   `scope_kind='format'`, `scope_value='video_short_stat'`, with a real `actor` and `reason`.
5. Prove the outcome: `select_music('format','video_short_stat', …)` candidate-set count = **4**
   (assert the *eligible set*, not the `LIMIT 1` winner — the winner will still be Drifting Piano).
6. Return a result doc naming the before/after eligible pool and the residual sequencing fact above.

## Out of scope — forbidden

- **Any resolver change.** `select_music` is not modified, dropped, replaced, or given a 5th argument
  by this lane. That is Lane 5's, and only Lane 5's.
- **Any batch-2 work.** No intake, no sourcing, no Content-ID clearance beyond the three named tracks.
  PK deprioritised batch-2 on 2026-08-07; adding inventory the resolver cannot exercise is the
  documented anti-pattern.
- Writing `loudness_lufs` on any track (that is M1, on hold — and under Lane 5's ratified design
  loudness is **not** the winner, so it is not a prerequisite).
- Promoting a fourth or any further track.
- Register cuts, pushes without explicit separate PK instruction, deploys.

## Blocking preconditions

1. **PK Gate-1 approval + task ID.**
2. **The Phase-1 production-write watch (~2026-08-11 20:20 Sydney) is NOT waived.** Per PK's standing
   2026-08-07 direction, authorisation on one step does not override an independent hold. This lane
   applies **after** the watch unless PK rules otherwise at the sitting.
3. Fresh YouTube Studio Notices re-check (above).

## Success criteria

- All nine conditions TRUE for all three tracks, verified by a fresh live read post-apply.
- `select_music` eligible candidate set for `('format','video_short_stat')` = **4 distinct tracks,
  4 distinct moods** (calm · warm · uplifting · neutral).
- Rollback authored, reviewed and proven **before** apply; every step asserts an exact row count and
  fails closed.
- Result doc records that the observable winner is unchanged and names Lane 5 as the remaining step.

## Stop condition

Any of: a Studio Notices claim appears on any of the three · a live re-read disagrees with the
baseline table above · an assertion returns an unexpected row count · the eligible set is anything
other than 4 after apply → **STOP, roll back, surface to PK.** Do not proceed by partial promotion.
