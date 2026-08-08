# SESSION SEED — CGU watch → Tuesday sitting (execution)

**Authored:** 2026-08-08 Sydney · **Authoring session:** CGU watch/consolidation, now CLOSED
**Purpose:** hand the remaining watch and the Tuesday sitting to a fresh session. Self-contained.
**This is an EXECUTION seed, not an assessment.** The programme assessment is done; do not redo it.

---

## 0. Standing posture for the remaining watch

- **The seven-day watch REMAINS IN FORCE through the agreed Tuesday gate (~2026-08-11 20:20 Sydney).
  DO NOT SHORTEN IT.** After six days there have been **zero STOP conditions** and the stability
  question has **effectively converged** — that is a reason to stop *analysing*, not a reason to
  bring the gate forward.
- **Do NOT continue daily evidence analysis to fill the remaining days.** The passive cron/pipeline
  signal is flat and has a proven blind spot (see §5). Further daily reads add rows, not information.
- **NO new investigation or design lanes during the remaining watch** — unless a **STOP condition** or
  a **new material production incident** appears. Those two are the only triggers.
- Production mutation stays watch-gated. Isolated non-production build remains allowed (v6.147).

## 1. The ONE worthwhile pre-verdict check — run it MONDAY, once

A single fresh read comparing these two NDIS skip classes, and whether their **ratio materially
changes**:

| skip class | last measured (2026-08-08) | M16 fixes it? |
|---|---|---|
| `pool_thin;no_eligible_evergreen` | 15 | **YES** |
| `bundle_diversity_insufficient:got_1_need_2;no_eligible_evergreen` | 17 | **NO** — supply-side |

Baseline for comparison (NDIS, since the v11 apply 2026-08-04): 18 filled · 32 non-capability skips ·
5 `capability_blocked:*` (correct fail-closed by design). Roughly **1 in 3 attempts fills**;
**~47% of non-capability skips are M16-fixable, ~53% are not.**

Query shape: `m.slot_fill_attempt a JOIN m.slot s ON s.slot_id=a.slot_id`, filter
`s.client_id='fb98a472-ae4d-432d-8738-2273231c1ef4'`, group by `a.skip_reason`.

**Why it matters:** if `pool_thin` fades on its own, **M16's expected yield drops and the apply-wave
order may change.** That is the only live variable left before the verdict.

## 2. Apply wave

**M16 remains FIRST in the apply wave** — unless Monday's fresh evidence *materially* changes its
expected benefit. It is built and unapplied on branch `lane/m16-pool-health-fix-build`; it is expected
to restore **both** CFW and NDIS `image_quote` fills, and it is E-1 precondition-2.

## 3. NDIS — TWO DISTINCT CONSTRAINTS. DO NOT CONFLATE THEM.

1. **M16-fixable thin-pool behaviour** — `pool_thin`; fitness caps below threshold under a
   green-masked health check. **Fixed by applying M16.**
2. **Supply-side diversity insufficiency** — `bundle_diversity_insufficient`; the top-2 picks share a
   `source_domain`. **M16 CANNOT solve this.** Needs the source-diversification decision (add
   NDIS-vertical sources vs adjust the diversity dimension — touching the check changes fleet
   behaviour).

Both classes also carry `no_eligible_evergreen`: `t.evergreen_library` is **empty fleet-wide, never
seeded** — a compounding factor on *both*, and its own small seeding decision.

## 4. Music execution chain — in order, no step skippable

```
Lane 4 Content-ID flip  →  cc-0091 Promotion Gate  →  eligible pool 1 → 4
                        →  Lane 5 seed rotation    →  PROVE ≥3 distinct tracks actually exercised
```

- **cc-0091 is FROZEN and execution-ready.** Brief sha256
  `06561eb2a2dc8aae8e9bd44ec843452164c9195fa7e2a54c5168de76f1993db8` (blob `b99fb106…`), external
  review **`c2409af4-…` agree/medium/high**, on `lane/cgu-watch-hygiene-20260808`. **Do not edit it** —
  any edit invalidates the pin. Only the PK apply gate remains.
- **All three CLEAN tracks must promote TOGETHER.** Proven mechanically: under cooldown
  `N = min(2, pool−1)`, a pool of **3 collapses to one candidate and yields NO rotation**. Pool 4 is
  the minimum. Two-of-three is a null result, not partial progress.
- **Promotion alone changes nothing observable** — `select_music` orders `loudness_lufs NULLS LAST`
  and the incumbent has a measured value, so it keeps winning until Lane 5 lands. Do not report
  promotion as a user-visible music outcome.
- **Lane 4 pre-flip step is mandatory:** re-check YouTube Studio Notices on the three Private test
  uploads immediately before the flip; **do not delete those uploads** until it applies.
- **Lane 5 R6 Part-1 deterministic algorithm proof = PASS** (40 seeds, pools 1–4, 10/10/10/10 at pool 4,
  zero determinism mismatches). The **BEGIN/ROLLBACK live-schema rehearsal is NOT discharged** and
  remains a separate pre-apply gate. `execute_sql` cannot do it — pooled channel, no transaction
  composition across calls.

## 5. Publish-truth v2

Ready for its **post-watch apply + service-role RPC consumption proof**. Branch
`worktree-agent-a8016aefa5cab42d1` @ `a45f7a3`; blobs `300c337f` (forward) / `ef11a8fc` (rollback) —
**pin by BLOB hash, not working-copy sha256** (CRLF trap). The SETOF-composite-from-unexposed-`ice_ro`
RPC has zero precedent here; named contingency is a re-cut to `RETURNS TABLE` under a NEW migration
number. Schedule the retirement of the blind queue-backed `ice_ro.publish_status` in the same wave.

## 6. B-roll — the constraint is DEMAND, not inventory

**Do not resume sourcing or intake.** Proven by end-to-end trace: pool depth blocked **zero** renders;
where a B-roll-capable render ran it used B-roll and published (1/1). B-roll is reachable from exactly
one fleet cell — **PP × YouTube × `video_short_stat`** — and **Phase-2 as approved adds ZERO
B-roll-capable slots**. Post-watch work must address **governed-video / B-roll-capable schedule
demand**. Shaped question already drafted, no lane opened:
`docs/briefs/video-demand-generation-post-watch-brief-v1.md`.

## 7. Closed — do not reopen

- **The 2026-08-13 PP YouTube slot is CLOSED as a sitting decision.** Recovered 2026-08-08: draft
  `452f58b9…` is `video_status='generated'` with a real `video_url`, rendered in 27,483 ms. Leave it
  alone; it publishes on schedule.
- Ghost-EF sweep closed: `ingest`, `compliance-monitor`, `pipeline-doctor` all **HEALTHY**;
  `pipeline-ai-summary` **DEAD 53.6 days** — **do NOT revive before the verdict**; post-watch decision
  is recover-or-formally-retire cron jobid 30.
- Migration apply-risk closed: three destructive correctly-timestamped rollbacks retired out of the
  discovery path, duplicate version `20260730120000` reconciled to true ledger identities.

## 8. Standing gotchas that bit THIS session — read before any git work

- **Shared `main` is not a holding area.** Parallel sessions commit and stage into
  `C:\Users\parve\Invegent-content-engine` continuously. **Always commit with an explicit PATHSPEC**
  (`git commit -F msg -- <path>`) — a plain `git commit` takes the WHOLE shared index and will sweep
  another session's staged files in. That happened this session and had to be `reset --soft` and redone.
- **A push carries every commit ahead of origin, regardless of author.** Re-verify
  `git log origin/main..HEAD` in the same breath as the push. Three ride-alongs occurred this session,
  each disclosed and authorized first.
- Post-watch governance item: **gated work sits on ISOLATED BRANCHES.**
- Post-watch capability item (recorded, not started): **EF health must be measured by OUTPUT/EFFECT
  FRESHNESS, not cron dispatch success.** `cron.job_run_details` records dispatch — it reported
  240/240 `succeeded` through an eight-week outage. Preferred over widening `ice_ro.cron_health` from
  12 jobs to 71.

---

## 9. FRAME THE TUESDAY SITTING AROUND FOUR THINGS

1. **Watch verdict.**
2. **Apply-wave order.**
3. **NDIS supply decisions.**
4. **Execution of already-proven capability.**

The full pre-staged agenda (items A–M, the 8-step apply-wave order) is
`docs/briefs/cgu-final-watch-expiry-sitting-agenda-v1.md`. The watch evidence is
`docs/briefs/artifacts/cgu-final-phase1-watch-log-v1.md` (Days 1–6 complete, Day 4 labelled backfill,
plus the deferred-check and ghost-sweep blocks).

**The sitting should be about execution, not surprises. The surprises were found during the watch.**
