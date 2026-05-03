---
id: fpub005-trigger-patch
status: ready
version: 2
created: 2026-05-03T22:55:00Z
revised: 2026-05-03T23:30:00Z
owner: chat (chat-applies via Supabase MCP apply_migration)
chat-applies-ddl: yes
sunset: 2026-05-10T22:55:00Z
related-findings: F-PUB-005, F-PUB-010 (candidate)
related-decisions: D170 (chat applies migrations), Lesson #51, Lesson #61, PK directive 2026-05-03 (hard cap semantics)
related-investigations:
  - docs/audit/runs/2026-05-03-fpub005-trigger-investigation.md
  - docs/audit/runs/2026-05-03-fpub006-existing-dead-audit.md
gates: F-PUB-006 cleanup brief MUST complete + verify before this brief runs (✅ DONE 3 May Sunday morning)
supersedes: v1 (relocate-trigger design)
---

# F-PUB-005 + F-PUB-010 Patch — Drop Trigger + Hard-Cap Cron (v2 — READY)

## Status

**READY.** Supersedes v1 ("relocate trigger to m.post_draft"). v2 is dramatically simpler — drops the buggy trigger entirely and lets the existing 5-min cron handle enqueueing, with one new line of cap enforcement added.

F-PUB-006 cleanup verified complete 3 May Sunday morning (Stages 1+2 applied, Stage 3 PASSED). Gate is open.

## Why this design changed (v1 → v2)

**v1 design ("relocate trigger"):** create new function `m.enqueue_publish_from_post_draft_approval()` on `m.post_draft` that enqueues at approval. Drop the buggy trigger on `m.ai_job`. ~150-line migration. Two functions to maintain.

**v2 design discovery (3 May Sunday morning):** the 5-min cron `enqueue-publish-queue-every-5m` already has the correct eligibility predicate:
```sql
AND pd2.approval_status IN ('approved', 'scheduled', 'published')
```
The cron does what v1's new trigger function would have done. **The cron is the safe enqueue path.** v1 was duplicating logic the cron already runs.

**v2 design ("drop trigger, hard-cap cron"):** drop the buggy trigger. Add cap check to cron WHERE clause. ~30-line migration. Zero new functions. Closes F-PUB-005 root cause AND F-PUB-010 (cap asymmetry) in one migration.

## What F-PUB-010 is

Verification of F-PUB-007 candidate on 3 May (post-F-PUB-006 closure) revealed:
- 34 approved drafts have no queue row
- All 34 are NDIS-Yarns × Facebook
- That platform has **92 queued** vs `max_queued_per_platform = 10` — **920% over cap**
- Trigger respects cap (silent-skip when over) → the 34 approvals sat in the gap
- Cron has no cap check → it added the 92 over time

**F-PUB-010 candidate finding**: asymmetric cap enforcement between the two enqueue paths. Cap of 10 is a hint when cron handles enqueueing, a wall when trigger handles it. PK directive 3 May morning: cap should be a hard wall, not a hint. Surface over-cap as backpressure, don't permit unbounded queue growth.

This patch implements the hard-cap directive.

## Trade-offs accepted

- **Approvals over cap stay un-enqueued.** Visibility: SQL query in §V3. This is the *intended* backpressure signal — it tells PK that publish rate is below approval rate for that (client, platform). PK can respond by raising `max_per_day`, raising `max_queued_per_platform`, or pausing approval.
- **Enqueue latency: up to 5 min.** Auto-approval → approved status → next cron tick (max 5 min) → queue row. Old trigger fired immediately on ai_job UPDATE; new path fires within 5 min. Acceptable: `min_gap_minutes` for publishes is 240 min (4 h), so a 5-min enqueue delay is invisible to publishing cadence.
- **No new function created.** Less code surface; relies on existing cron.

## Prerequisites

- ✅ F-PUB-006 cleanup verified complete (3 May Sunday morning — dead pool 63, F-PUB-005 zombies = 0, B31 closure of F-PUB-004 proven via 3 real FB publishes).
- ✅ Investigation reviewed: `docs/audit/runs/2026-05-03-fpub005-trigger-investigation.md`.
- ✅ Hard-cap directive received from PK (3 May morning).
- Supabase MCP available (chat applies via `apply_migration`).
- ChatGPT Review MCP available (chat fires before apply, action_type=`sql_destructive`).
- Quiet hour preferred — minimises ai_job updates during the swap.

## Pre-flight validation (Lesson #61)

Run before the migration. If any check fails, abort and update investigation doc.

### P1 — Confirm trigger state hasn't drifted

```sql
SELECT
  n.nspname AS schema,
  c.relname AS table_name,
  t.tgname AS trigger_name,
  CASE t.tgenabled WHEN 'O' THEN 'enabled' WHEN 'D' THEN 'disabled' ELSE t.tgenabled::text END AS state
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND p.proname = 'enqueue_publish_from_ai_job_v1';
```
**Expected:** Single row — `trg_enqueue_publish_from_ai_job_v1` on `m.ai_job`, state `enabled`. If empty → already dropped, abort. If state changed → re-investigate.

### P2 — Confirm function source matches investigation

```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'enqueue_publish_from_ai_job_v1'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'm');
```
**Expected:** Source matches the version captured in `docs/audit/runs/2026-05-03-fpub005-trigger-investigation.md`. If drifted, abort and re-investigate (someone modified the function out-of-band).

### P3 — Capture current cron command for rollback

```sql
SELECT jobid, schedule, active, command
FROM cron.job
WHERE jobname = 'enqueue-publish-queue-every-5m';
```
**Expected:** Single row, `active=true`, schedule `*/5 * * * *`. **Save the `command` text verbatim into the run-state file** before applying the migration — required for emergency rollback.

### P4 — Snapshot current queue distribution + cap config

```sql
SELECT
  c.client_slug,
  pd.platform,
  COUNT(*) FILTER (WHERE q.status = 'queued') AS currently_queued,
  cpp.max_queued_per_platform AS cap,
  CASE
    WHEN COUNT(*) FILTER (WHERE q.status = 'queued') >= cpp.max_queued_per_platform THEN 'AT_CAP_OR_OVER'
    ELSE 'BELOW_CAP'
  END AS cap_status
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
JOIN c.client c USING (client_id)
JOIN c.client_publish_profile cpp ON cpp.client_id = pd.client_id AND cpp.platform = pd.platform
WHERE q.status = 'queued'
GROUP BY c.client_slug, pd.platform, cpp.max_queued_per_platform
ORDER BY 1, 2;
```
**Expected (3 May morning):** at minimum, NDIS-Yarns × facebook returns `currently_queued=92, cap=10, cap_status=AT_CAP_OR_OVER`. Other (client, platform) pairs may also be over cap. **Document the snapshot in run-state** — this is the "before" picture for the backpressure surfacing.

### P5 — Quiet hour check

```sql
SELECT count(*) AS recent_ai_job_succeeds
FROM m.ai_job
WHERE updated_at > NOW() - INTERVAL '30 minutes'
  AND status = 'succeeded';
```
**Recommendation:** apply when this returns < 5. Not a hard gate. Reduces window for missed-fire edge cases between trigger drop and cron next tick.

## Migration SQL

Migration name (snake_case, per Supabase MCP convention):
`fpub005_drop_trigger_and_add_hard_cap_to_enqueue_cron`

```sql
-- F-PUB-005 + F-PUB-010 patch (3 May 2026):
-- 1. Drop the buggy trigger that fires at m.ai_job status update (premature,
--    creates zombie queue rows pointing at unapproved drafts).
-- 2. Drop its function.
-- 3. Update the existing 5-min cron `enqueue-publish-queue-every-5m` to add
--    a hard-cap check via correlated subquery against
--    c.client_publish_profile.max_queued_per_platform.
--
-- Single migration. After this runs, the cron is the only enqueue path,
-- and it respects max_queued_per_platform as a hard wall.
--
-- Rollback: replay the captured pre-flight P3 cron.command via
-- cron.alter_job + recreate the dropped trigger and function from
-- docs/audit/runs/2026-05-03-fpub005-trigger-investigation.md.

-- Step 1: Drop the buggy trigger
DROP TRIGGER IF EXISTS trg_enqueue_publish_from_ai_job_v1 ON m.ai_job;

-- Step 2: Drop the orphaned function
DROP FUNCTION IF EXISTS m.enqueue_publish_from_ai_job_v1();

-- Step 3: Update the cron command to enforce hard cap.
-- Source command captured from cron.job table 3 May 2026. Diff vs original:
--   one new AND clause (correlated subquery + COALESCE-fallback) added inside
--   the SELECT DISTINCT ON subquery's WHERE, after the existing NOT EXISTS
--   on m.post_publish.
SELECT cron.alter_job(
  job_id => (SELECT jobid FROM cron.job WHERE jobname = 'enqueue-publish-queue-every-5m'),
  command => $cmd$
  INSERT INTO m.post_publish_queue
    (ai_job_id, post_draft_id, client_id, platform, scheduled_for, status)
  SELECT
    j.ai_job_id,
    j.post_draft_id,
    j.client_id,
    j.platform,
    COALESCE(
      pd.scheduled_for,
      public.get_next_scheduled_for(j.client_id, j.platform, NOW())
    ),
    'queued'
  FROM (
    SELECT DISTINCT ON (j2.client_id, j2.platform)
      j2.ai_job_id, j2.post_draft_id, j2.client_id, j2.platform
    FROM m.ai_job j2
    JOIN m.post_draft pd2 ON pd2.post_draft_id = j2.post_draft_id
    WHERE j2.status = 'succeeded'
      AND j2.post_draft_id IS NOT NULL
      AND pd2.approval_status IN ('approved', 'scheduled', 'published')
      AND NOT EXISTS (
        SELECT 1 FROM m.post_publish_queue q
        WHERE q.post_draft_id = j2.post_draft_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM m.post_publish p
        WHERE p.post_draft_id = j2.post_draft_id AND p.status = 'published'
      )
      -- F-PUB-010 hard-cap enforcement: skip enqueue if (client, platform)
      -- queue is already at or over max_queued_per_platform. Approvals over
      -- cap surface as backpressure via the diagnostic query in V3.
      AND (
        SELECT COUNT(*)
        FROM m.post_publish_queue q3
        WHERE q3.client_id = j2.client_id
          AND q3.platform = j2.platform
          AND q3.status = 'queued'
      ) < COALESCE(
        (
          SELECT cpp.max_queued_per_platform
          FROM c.client_publish_profile cpp
          WHERE cpp.client_id = j2.client_id
            AND cpp.platform = j2.platform
          LIMIT 1
        ),
        10
      )
    ORDER BY j2.client_id, j2.platform, j2.created_at ASC
  ) j
  JOIN m.post_draft pd ON pd.post_draft_id = j.post_draft_id
  ON CONFLICT (post_draft_id, platform) DO NOTHING;
$cmd$
);

-- Step 4: Comment for forward documentation (cron commands have no native
-- comment field; we leave a marker on the cap function instead).
COMMENT ON COLUMN c.client_publish_profile.max_queued_per_platform IS
  'Hard cap on simultaneous queued posts per platform. Enforced by the cron `enqueue-publish-queue-every-5m` (F-PUB-005 + F-PUB-010 patch, 2026-05-03). Approvals over cap stay un-enqueued — they surface as backpressure via the diagnostic in docs/briefs/2026-05-03-fpub005-trigger-patch-cc.md §V3. PK directive 2026-05-03: this is a hard wall, not a soft hint.';
```

## MCP review payload (chat fires before apply, protocol v2.17)

- `action_type`: `sql_destructive` (DROP TRIGGER + DROP FUNCTION + cron.alter_job are destructive/mutating)
- `decision_under_review`: "Drop trigger trg_enqueue_publish_from_ai_job_v1 + its function. Add hard-cap WHERE clause to cron enqueue-publish-queue-every-5m. Closes F-PUB-005 (zombie queue rows) and F-PUB-010 candidate (cap asymmetry between trigger and cron) in single migration."
- `production_action_if_approved`: full migration SQL above
- `consequence_if_delayed`: "F-PUB-005 keeps generating ~4 zombies/day per F-PUB-006 audit pattern. F-PUB-010 candidate keeps allowing unbounded queue growth (already 92 vs cap 10 on NDIS-Yarns FB). Every cleanup brief faces predicate-vs-count drift on apply (Lesson learned from F-PUB-006 Stage 2 17-vs-13 drift)."
- `cost_of_waiting`: "Low for 24-48h — F-PUB-006 cleanup pattern absorbs new zombies. Beyond that, dead-pool growth + queue-cap excess compound. Both are observability/correctness costs, not production breakage. F-PUB-009 (scheduling drift to August/October) gets worse without cap enforcement."
- `current_evidence`:
  - Trigger source captured in investigation doc (3 May)
  - Cron command captured pre-flight in P3
  - Live evidence of cap asymmetry: NDIS-Yarns FB at 92 vs cap 10 (3 May morning verification query)
  - 34 approved drafts confirmed sitting un-enqueued due to trigger silent-skip-at-cap (verification query, 3 May morning)
  - F-PUB-006 cleanup PROVEN successful (3 real FB publishes observed in post-Stage-1 window)
  - PK directive 2026-05-03: hard-cap semantics confirmed
- `known_weak_evidence`:
  - Cap-aware cron not tested in non-prod (Supabase free tier — no active staging branch)
  - The COALESCE default of 10 is conservative but assumes that "missing cpp row" is rare; if there's a (client, platform) pair generating ai_jobs WITHOUT a cpp row, cap defaults to 10 (probably fine, but not validated empirically)
  - No backfill of the 34 NDIS-Yarns FB un-enqueued approvals — they remain un-enqueued post-patch (because cap stays at 10, queue still at 92). Intended behaviour per backpressure design, but worth noting
- `default_action`: "If review escalates → pause and pull PK in. If review approves → apply during quiet hour (P5 < 5 succeeds in last 30min). Document V1-V4 results in run-state."

## Verification (after apply)

### V1 — Confirm trigger gone

```sql
SELECT trigger_name, event_object_schema, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trg_enqueue_publish_from_ai_job_v1';
```
**Expected:** 0 rows.

### V2 — Confirm function gone

```sql
SELECT proname FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname='m')
  AND proname = 'enqueue_publish_from_ai_job_v1';
```
**Expected:** 0 rows.

### V3 — Confirm cap is now enforced (smoke + backpressure visibility)

Wait at least 10 min after apply (2 cron ticks).

```sql
-- Diagnostic: approvals waiting at cap (the backpressure signal)
SELECT
  c.client_slug,
  pd.platform,
  COUNT(*) FILTER (WHERE q.status = 'queued') AS currently_queued,
  cpp.max_queued_per_platform AS cap,
  COUNT(pd_lost.post_draft_id) FILTER (WHERE pd_lost.approval_status = 'approved') AS approvals_waiting_at_cap
FROM c.client c
JOIN c.client_publish_profile cpp USING (client_id)
LEFT JOIN m.post_publish_queue q ON q.client_id = c.client_id AND q.platform = cpp.platform AND q.status = 'queued'
LEFT JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
LEFT JOIN m.post_draft pd_lost
  ON pd_lost.client_id = c.client_id
  AND pd_lost.platform = cpp.platform
  AND pd_lost.approval_status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM m.post_publish_queue q2 WHERE q2.post_draft_id = pd_lost.post_draft_id)
  AND NOT EXISTS (SELECT 1 FROM m.post_publish p2 WHERE p2.post_draft_id = pd_lost.post_draft_id AND p2.status = 'published')
WHERE cpp.publish_enabled = true
GROUP BY c.client_slug, pd.platform, cpp.max_queued_per_platform
ORDER BY 1, 2;
```
**Expected:** for any (client, platform) where queue is AT or OVER cap, `approvals_waiting_at_cap` will be non-zero. **This is intended.** The number should be stable or slowly growing (new approvals queue up behind cap), not exploding (which would mean cap isn't binding).

### V4 — Confirm no new zombies

Wait at least 30 min after apply.

```sql
SELECT
  COUNT(*) AS new_zombies_post_patch
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.created_at > '<apply_timestamp>'
  AND pd.approval_status = 'needs_review';
```
**Expected:** 0. Cron only enqueues `approval_status IN ('approved', 'scheduled', 'published')` so no `needs_review` zombie should appear.

### V5 — Confirm queue isn't growing past cap

Wait 60 min after apply.

```sql
SELECT
  c.client_slug,
  pd.platform,
  COUNT(*) AS currently_queued,
  cpp.max_queued_per_platform
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
JOIN c.client c USING (client_id)
JOIN c.client_publish_profile cpp ON cpp.client_id = pd.client_id AND cpp.platform = pd.platform
WHERE q.status = 'queued'
GROUP BY c.client_slug, pd.platform, cpp.max_queued_per_platform
HAVING COUNT(*) > cpp.max_queued_per_platform
ORDER BY 1, 2;
```
**Expected:** rows that were already over cap pre-patch will remain over cap (cap doesn't shrink existing queue). But the count should be **non-increasing** — if it grows post-patch, cap check isn't working. Compare to P4 snapshot.

V1 + V2 + V4 + V5 together prove the patch works. V3 surfaces backpressure as designed.

## Failure modes

| If… | Then… |
|---|---|
| P1 returns 0 rows | Trigger already dropped (someone applied this brief out-of-band). Stop. Investigate. |
| P2 source has drifted | Stop. Re-investigate. Investigation doc is stale. |
| P3 cron not active or schedule changed | Stop. Investigate why before patching. |
| P4 finds NO over-cap (client, platform) | Surprising — verify the F-PUB-007 verification query repeated post-patch. Continue if cap config plausibly correct. |
| MCP review returns `escalate` | Follow protocol v2.17 response-side. Stop and pull PK in. |
| Migration apply errors (e.g. cron.alter_job permissions) | Single transaction — auto-rollback. Investigate, fix, retry. |
| V1 or V2 returns rows | Migration partially failed. Single transaction means all-or-nothing — re-run the full migration after diagnosing why. |
| V4 returns > 0 | Some other code path is enqueueing `needs_review` drafts. Investigate (possible: dashboard manual enqueue, untracked function). |
| V5 shows queue growing past cap | Cap check isn't binding. Likely COALESCE pulling default 10 instead of CPP value. Investigate cpp lookup. |

## Rollback procedure (emergency only)

If the migration applied but causes pipeline breakage and must be reverted:

1. Replay the captured P3 cron command via `cron.alter_job` (revert WHERE clause to original).
2. Recreate the dropped trigger from `docs/audit/runs/2026-05-03-fpub005-trigger-investigation.md` (full source captured there).
3. Recreate the dropped function from same source.

Rollback is fully scripted from artefacts — do not improvise.

## Handover (per memory entry 11 — 4-way sync)

After completion (success or partial), chat writes:
- **Run state**: `docs/runtime/runs/2026-05-03-fpub005-trigger-patch-apply.md` — chronological log of pre-flight (P1-P5), MCP review ID, migration apply result, V1-V5 results
- **Decisions**: append to `docs/06_decisions.md` confirming v2 design (drop trigger + hard-cap cron) as the chosen design with rationale
- **Action list bump**: row marking F-PUB-005 closed + F-PUB-010 closed (or partial), bump action_list version
- **Sync state addendum**: append session segment to `docs/00_sync_state.md`
- **Lesson candidate**: F-PUB-005 + F-PUB-010 closed in single migration. Consider promoting Lesson #62 candidate (silence-with-evidence response to type-(b) MCP escalations) on second instance.

## What this brief explicitly does NOT do

- Backfill the 34 NDIS-Yarns FB approvals currently waiting un-enqueued (intentional — they're the backpressure signal)
- Modify auto-approver EF (no EF changes needed)
- Change `c.client_publish_profile` schema or values (only adds a comment)
- Touch `trg_handle_draft_rejection` (separately handles slot reset, unaffected)
- Address F-PUB-009 directly (scheduling drift to August/October) — but the cap enforcement *limits* drift growth, since queue can't grow past cap anymore. F-PUB-009 still a separate triage item.

## Estimated time

- Pre-flight P1-P5 (chat): 5-10 min
- MCP review fire (chat): 2-5 min
- Migration apply (chat): 1 min
- Wait + V1-V5 (chat): 60 min total (V5 needs 60min wait)

**Active chat time: ~15 min. Total wall time: ~75 min including waits. Closure budget tracking per D186: estimate ~0.5h logged.**

## Notes

- Lesson #51 reinforced: this brief itself is a terminal-decision artefact (DDL drop + cron mutation). Pre-flight discipline is non-negotiable.
- Lesson #61 honoured: P1-P5 cover schema + cron + queue + activity windows.
- Lesson #62 candidate: if MCP review response surfaces only Claude's own known_weak_evidence, follow Path B (silence with evidence).
