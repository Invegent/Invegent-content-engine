# Music Lane 4 — Content-ID clearance, minimum representative set — packet v1 (NOTHING APPLIED)

**Status: PREPARED AND HELD.** No Content-ID verdict exists yet. No flip applied. No fence touched.
**Lane:** cc-0039 method, batch application · **Tier: T3** (the flip is production DML on a
governance column) · **Authored:** 2026-08-07 · Harness `_harness/music_lane4_contentid_20260807/`.

**PK scope ruling (2026-08-07):** *"Do not clear all 12 tracks merely to build inventory before the
resolver problem is solved. Use the minimum representative Content-ID-cleared set needed to prove
multi-track selection once the rotation capability exists."* This packet is built to that.

---

## 0. The unlock: this lane needs NOTHING from the blocked apply

The batch-2 apply (upload → rehearse → apply) is blocked on an execution channel. **This lane does
not touch it.** The three tracks below are **batch-1 rows that already exist in production**
(verified live 2026-08-07 via `ice_ro.music_governance_status`), so their `content_id_safe` can be
flipped without batch 2 ever landing.

That fully decouples the rotation proof from the blocked lane — which matters, because Lane 5 is
the critical path and would otherwise have been queued behind a channel decision.

## 1. The minimum representative set — 3 tracks

Drifting Piano (`calm`) is already the sole selectable track. Adding these three gives **4 selectable
with 4 distinct moods**, which simultaneously satisfies the standing PK ruling of 2026-08-04
(*4 selectable Content-ID-safe tracks; ≥3 exercised in the proof week* —
`docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md:226-227`) and gives a rotation proof
enough distinct winners to be meaningful.

| # | track_key | track_id | mood | dur | Why this one |
|---|---|---|---|---|---|
| 1 | `uplifting_composed_pluto_007` | `7b0f641c-…` | uplifting | 230.3s | **Sole uplifting track in batch 1** — highest marginal mood diversity |
| 2 | `warm_acoustic_simple_001` | `adbadf4c-…` | warm | 97.3s | Shortest warm track; warm is the next distinct register after calm |
| 3 | `neutral_short_4mei_009` | `8a5e7835-…` | neutral | 65.8s | **Shortest track in the library** — cheapest to test, and neutral is the deepest batch-1 pool (3 candidates) so it can absorb a CLAIMED result |

Consistent with the independent recommendation already on file
(`docs/briefs/s3-m12-music-sourcing-plan-content-prep.md` §3), reached before this lane existed.

**Deliberately excluded:** `corporate_theme_medieval_008` — it carries an open mood-tag question
(title reads medieval/period, not corporate) that should resolve before it is worth a test. Not a
licence or Content-ID defect.

**Not batch 2.** Batch-2 tracks would each require the blocked apply first. Using batch-1 rows keeps
this lane independent, and is also the smaller set PK asked for.

## 2. Runbook — the cc-0039 method (PK performs; cannot be delegated)

**Only PK can produce the verdict.** CC0 waives the *uploader's* copyright; it does not prove the
absence of a *third-party* Content-ID fingerprint. No DB flag, licence text, or agent inference
substitutes for a personally-observed YouTube Studio result.

**Test clips are built and waiting** in `_harness/music_lane4_contentid_20260807/clips/`:

| Clip | Size |
|---|---|
| `uplifting_composed_pluto_007__contentid_test.mp4` | 5.88 MB |
| `warm_acoustic_simple_001__contentid_test.mp4` | 2.47 MB |
| `neutral_short_4mei_009__contentid_test.mp4` | 1.67 MB |

Each is a neutral dark still with the **full track at unity gain** — no VO, no attenuation, nothing
that would weaken the fingerprint. Filenames carry identity because YouTube titles an upload from
its filename, so the three are distinguishable in Studio at a glance.
`clips/_clips.json` records each clip's sha256 and its source mp3's sha256.

**Steps:**

1. Upload all three to a YouTube channel as **UNLISTED or PRIVATE**. Never public. A test/personal
   channel is preferred over a production client channel (cc-0039 precedent).
2. Wait for Content-ID processing to complete — it is not instant, and a too-early read looks CLEAN.
3. In **YouTube Studio → Content → the video → Restrictions column**, read the copyright/claim
   status per video. Capture a screenshot or an exact state description per track.
4. Record each verdict as **CLEAN** or **CLAIMED** in the result doc. A CLAIMED track keeps
   `content_id_safe=false` and stays fenced — it is not deleted, not re-sourced, and not a failure
   of the lane.
5. Delete the test uploads once verdicts are captured, unless you want them retained as evidence.

**If fewer than 3 come back CLEAN:** say so and stop. Do not substitute an untested track to reach a
number. The batch-1 pool has 5 more candidates (`002`, `003`, `004`, `005`, plus `008` pending its
mood question) that can be tested in a second round.

## 3. The prepared flip — HELD, and deliberately pool-neutral

`_harness/music_lane4_contentid_20260807/flip_content_id_safe_FORWARD.sql` (+ `_ROLLBACK.sql`).

Mirrors the proven cc-0039 precedent, with one deliberate difference worth stating:

> **cc-0039's post-assert was `select_music(...) = 1`, because that flip made a track selectable.
> This flip must make NOTHING newly selectable** — all three targets stay fenced with no
> scoped-approval event. So the post-assert here is **pool-neutrality**: the selectable set must be
> byte-identical before and after, checked in both directions. Copying cc-0039's assert unchanged
> would have been wrong and would have failed.

Controls: single transaction · pre-DML split-channel guard (temp-relation + `txid_current()`) ·
identity precondition (every `track_id`/`track_key` pair must exist and match) · state precondition
(every target must currently read `content_id_safe=false`) · CAS-guarded update asserting exactly 3
rows · pool-neutrality post-assert · pinned channel `psql -f` with `ON_ERROR_STOP=1`,
`apply_migration` ruled out.

The rollback aborts rather than reverting if any target has since been promoted — reverting
`content_id_safe` on a live bed would silently pull it out of production.

**Before applying, delete from the target list any track that did not come back CLEAN.** The
cardinality asserts expect exactly 3; edit both the `VALUES` list and the two `<> 3` checks together.

## 4. What promotion still needs — the flip alone changes nothing

This is the "approved ≠ selectable" trap this codebase has hit before. `content_id_safe` is **one of
nine** conditions in `select_music`. After a successful flip these three tracks are still **not**
selectable, because they also need:

- all four fences flipped (`approval_status='approved_scoped'`, `approved`,
  `production_use_allowed`, `is_active` all true); **and**
- an `m.music_review_event` row with `event_kind='scoped_approval'`, `scope_kind='format'`,
  `scope_value='video_short_stat'` — the exact scope `video-worker` queries
  (`supabase/functions/video-worker/index.ts:906`). Fence columns alone do not satisfy this.

**And even then**, `ORDER BY loudness_lufs NULLS LAST` means these three (all `loudness_lufs=NULL`,
so they sort **last**) would still lose every call to Drifting Piano at −27.2 LUFS. **Promotion
without Lane 5 buys zero observable change.** That is why PK opened Lane 5 as the capability lane
and why this set is deliberately minimal.

Promotion is therefore a **separate later PK gate**, sequenced *after* Lane 5 lands — not part of
this packet.

## 5. Gates and boundaries

**Sequencing:** the Content-ID *testing* is independent and can run now. The *flip* is a T3
production DML — a PK gate. Promotion is a further gate after Lane 5.

**Watch:** the Phase-1 production-write watch (to ~2026-08-11 20:20 Sydney) is **not waived** by any
authorisation in this lane. PK's 2026-08-07 direction is explicit that a step-3 authorisation does
not override an independent hold. **Surface the watch at execution time and get it addressed
explicitly** rather than treating it as implicitly cleared.

**Not done and not authorised here:** applying any flip · flipping any fence · writing any
review-event row · promoting anything · uploading anything to YouTube (PK's act) · touching batch 2
or its blocked apply · changing `select_music` · re-sourcing.
