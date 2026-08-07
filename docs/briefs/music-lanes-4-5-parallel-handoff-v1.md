# Music lanes 4 + 5 — PARALLEL SESSION HANDOFF (seed doc)

**Purpose:** seed a fresh session to run **Lane 4 (Content-ID clearance)** and **Lane 5 (rotation
decision)** *in parallel*, independent of the blocked apply lane. Self-contained — assumes no prior
conversation.

**Authored:** 2026-08-07 · **Register head at authoring:** v6.166 · **HEAD:** `f958940`
**Both lanes are DESIGN / PREPARATION ONLY. Neither is authorised to mutate production.**

---

## 0. The single finding that drives both lanes

**Stocking the music library does not make the system use it.** Live `select_music`
(`supabase/migrations/20260710115043_select_music_require_content_id_safe.sql:80-120`, confirmed
live) ends with:

```sql
ORDER BY t.loudness_lufs NULLS LAST, t.duration_seconds DESC, t.track_key
LIMIT 1
```

One deterministic winner, ascending by loudness. The sole live track
**`calm_piano_drifting_006` is −27.2 LUFS**; the 12 batch-2 survivors span **−16.73 to −10.51**.
So Drifting Piano sorts first and **wins every call, forever** — even if all 12 were fully approved
and Content-ID-cleared tomorrow. Growing the pool changes *which track could win*, never *whether
the pool rotates*.

**Consequence:** Lane 4's outcome is invisible until Lane 5 lands. Lane 5 is the critical path.

## 1. Current state (verified 2026-08-07, read-only)

- **Live selectable pool: exactly 1 track** — `calm_piano_drifting_006`, `approved_scoped`, all four
  fences true, `content_id_safe=true`, −27.2 LUFS. (`ice_ro.music_governance_status`.)
- **Library: 9 live rows** (batch 1, keys `001`–`009`); 8 are fenced `intake_candidate` with
  `content_id_safe=false`.
- **Batch 2: 12 survivors packaged, NOT applied.** Packet
  `docs/briefs/music-batch2-four-brand-intake-packet-v1.md` (v4), harness
  `_harness/music_harvester_v1_20260806/`. PK aural gate complete 2026-08-07 (culled
  `neutral_lofi_shimmer_021`). All 12 `content_id_safe=false`, all four fences off.
  Measured `loudness_lufs` written. Commits `3b20e19` · `d3b94ce` · `f958940`.
- **Apply lane (upload → rehearse → apply) is BLOCKED and OUT OF SCOPE here** — `psql` is not
  installed and `DATABASE_URL` is unset in the working environment; the packet pins `psql -f` with
  `ON_ERROR_STOP=1` (C-11) and rules out `apply_migration`. **Do not attempt the apply, do not
  substitute a channel, do not upload to `post-music`.** That is a separate PK decision.
- **Only one consumer exists:** `video-worker` calls
  `select_music({scopeKind:'format', scopeValue:'video_short_stat'})` — `video-worker/index.ts:906`.
  No other scope is ever queried live.
- **Phase-1 watch runs to ~2026-08-11 20:20 Sydney.** PK has authorised specific production writes
  during it case-by-case; neither lane below may assume that authorisation.

## 2. The FULL eligibility gate (all must hold, or `select_music` returns zero rows)

Read from the live function, not inferred:

| # | Condition | Batch 2 today |
|---|---|---|
| 1 | `l.commercial_use_allowed IS TRUE` | ✅ |
| 2 | `l.social_use_allowed IS TRUE` | ✅ |
| 3 | `l.content_id_safe IS TRUE` | ❌ false on all 12 → **Lane 4** |
| 4 | `t.is_active` · `t.approved` · `t.production_use_allowed` all TRUE | ❌ fenced off |
| 5 | `t.approval_status = 'approved_scoped'` | ❌ `intake_candidate` |
| 6 | `t.duration_seconds >= p_min_duration_seconds` | ✅ all ≥131s (worker asks 12s) |
| 7 | an `m.music_review_event` row with `event_kind='scoped_approval'`, `scope_kind='format'`, `scope_value='video_short_stat'` | ❌ **none exist for batch 2** — easily missed |
| 8 | NO later `revocation`/`restriction`/`rejection` event | ✅ n/a |
| 9 | wins `ORDER BY loudness_lufs ASC … LIMIT 1` | ❌ **never, while Drifting Piano is selectable** → **Lane 5** |

Gate 7 is the one most likely to be forgotten: approval is not just fence columns, it needs a
scoped-approval *event row* for the exact `(scope_kind, scope_value)` the worker queries.

---

## LANE 4 — Content-ID clearance preparation

**Goal:** make it possible for PK to clear `content_id_safe` on chosen tracks, and have the
guarded flip ready to apply the moment verdicts exist.

**The method is PK's, and cannot be delegated or simulated.** Per
`docs/briefs/cc-0039-drifting-piano-content-id-verification.md`, the only method that has ever
produced authoritative evidence: PK builds a track-forward test clip, uploads it **unlisted** to a
real YouTube channel, and personally reads the Content-ID/copyright status in YouTube Studio after
processing. CC0 waives the *uploader's* copyright but does **not** prove the absence of a
*third-party* Content-ID fingerprint. **No DB flag, licence text, or agent inference substitutes.**

**In scope for this session:**
1. Prepare track-forward test clips from the local `.mp3` files in
   `_harness/music_harvester_v1_20260806/candidates/` (the audio is LOCAL-ONLY — never committed —
   and this checkout is the only copy). Clips need no storage object and no DB row, which is why
   this lane is parallel to the apply.
2. Write the cc-0039 runbook for a batch: exact steps, what to look for in Studio, how to record a
   verdict, and what a CLAIMED result means (track stays fenced, not deleted).
3. Author (do **not** apply) the guarded single-row `content_id_safe` flip, mirroring the proven
   precedent `_harness/cc0039_content_id_verify/flip_content_id_safe_FORWARD.sql` and its
   `_ROLLBACK.sql`. One row per verdict, fail-closed, idempotent, with a pool-neutrality assert.
4. Recommend a **priority order** for which tracks PK should test first — mood diversity and
   likely-use weighting. Note the existing 8 batch-1 candidates are also unverified; PK may prefer
   to resolve those first.

**Forbidden in this lane:** setting `content_id_safe` anywhere · flipping any fence · uploading ·
applying any SQL · claiming a Content-ID result that PK did not personally observe · treating CC0
or "it's on FMA" as evidence of Content-ID safety.

**Deliverable:** runbook + priority list + un-applied flip SQL, returned for PK.

---

## LANE 5 — Rotation decision (CRITICAL PATH)

**Goal:** give PK a decision packet on the winner-takes-all problem in §0. Nothing is built or
changed without a fresh PK gate.

`select_music` has **no seed/rotation mechanism at all** — unlike `resolve_slot_assets`, whose
Background slot performs seed-stable ranked selection. This is a known, named, unauthorised gap:
see `docs/briefs/music-completion-gate1-packet-v1.md` §6 item 3 and
`docs/briefs/s3-m12-music-sourcing-plan-content-prep.md` §4.

**The three options to analyse honestly (do not pre-judge):**

- **(A) Revoke/fence Drifting Piano** so a newly approved track wins. Cheapest, no resolver change.
  But it just moves the single permanent winner — still zero rotation — and it removes the only
  currently-working bed, so it carries live-render risk. Note the resolver returns zero rows when
  nothing is eligible, and the caller renders VO-only (silent bed) rather than failing.
- **(B) Resolver upgrade — add `p_seed`/weighted selection**, mirroring `resolve_slot_assets`'s
  proven seed-stable ranking. This is the real fix. It is its own T2/T3-gated lane and touches a
  live production function — **out of scope to build here**; scope and design only.
- **(C) Accept one permanent bed** and treat batch 2 as bench depth. Legitimate if music variety is
  not a near-term product goal; say so plainly rather than defaulting to it.

**Prerequisite already partly met:** the delta audit named **M1 (automated loudness measurement)**
as the blocker for M12's rotation proof, because an all-NULL sort key is degenerate. Batch 2's 12
survivors now carry **measured** `loudness_lufs` — but from a one-off external audit, **not** a
pipeline. **M1 as a capability remains UNBUILT**; do not record it as done.

**Proof method to reuse when a rotation lane eventually runs:** the B-roll seed-distribution
uniformity check — ≥40 distinct seeds through the resolver, requiring (i) 100% reachability (every
eligible track hit at least once) and (ii) near-uniform distribution. Proven live at 40 seeds /
4-clip pool → 10/10/10/10, zero unreachable (`docs/briefs/results/broll-promotion-batch1-result.md`
§ guard G8). Cross-check against real usage in `m.music_usage_event`, not synthetic seeds alone.

**Forbidden in this lane:** modifying `select_music` · any migration · any deploy · revoking or
fencing Drifting Piano · flipping any fence · treating the measured loudness as M1 being built.

**Deliverable:** a decision packet — the three options with honest costs/risks, a recommendation,
the named next gate for whichever PK picks, and the proof method that would demonstrate it worked.

---

## Standing constraints for BOTH lanes

- **No production mutation.** No DB write, no storage write, no fence flip, no deploy, no migration.
- **Do not touch the blocked apply lane** (upload → rehearse → apply). It is waiting on a PK channel
  decision, not on these lanes.
- **Do not cut a register version.** Version allocation belongs to a single cut owner; out-of-channel
  cuts get retracted. Hand any register pointer text to PK as text.
- **Local HEAD is authoritative**; re-verify HEAD/branch before any commit (25 active worktrees,
  shared checkout — a push fast-forwards everything ahead, including other sessions' commits).
- **Push is a hard stop** requiring explicit PK instruction, separate from commit.
- **Line-ending trap:** repo has `core.autocrlf` on. Verify any pinned hash with
  `git show origin/main:<path> | sha256sum`, never against a checked-out working copy. This has
  already bitten once in this lane.
- Report outcomes plainly; if something is blocked or unverifiable, say so rather than inferring.
