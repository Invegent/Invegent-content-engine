# Brief: B-AUDIT-CHECK5-DRIFT fix — stuck_publish_queue_items lock vocabulary drift

**Status**: ready-for-night-job (read-only + migration draft) | apply gated on MCP review next chat session
**Priority**: P3
**Finding ID**: B-AUDIT-CHECK5-DRIFT
**Related**: F-AAP-007 (sibling cleanup brief, ship together if convenient)
**Created**: 2026-05-03 evening Sydney
**Author**: chat
**Honours**: D-01, D-170, D-186, Lesson #51

---

## Problem

Audit Check 5 (`stuck_publish_queue_items`) queries `m.post_publish_queue` for rows with `status = 'locked'`. This value is not in the current status vocabulary:

- queued
- published
- dead
- throttled
- held
- skipped

In the current architecture, locks are signalled via two columns: `locked_at` (timestamptz) and `locked_by` (text). A row with `locked_at IS NOT NULL` is locked; the worker that locked it is in `locked_by`. The `status` column tracks the row's lifecycle state, not its lock state.

This is older drift, not v4-specific. Likely predates the slot-driven v4 work — the check has been silently ineffective for some time, just less visible than the v4-era findings.

Operational impact: zero so far (the check has been returning zero rows because no row has `status='locked'`). Risk: the audit suite gives false reassurance about queue lock health, and any genuinely stuck locked rows have been invisible.

---

## Cowork execution scope

**IN SCOPE for night job**:
- Pre-flight PF1–PF5
- Migration draft with confirmed identifiers from PF1
- Pre-flight report at `docs/audit/runs/2026-05-04-baudit-check5-drift-preflight.md`

**OUT OF SCOPE**:
- Applying the migration (chat per D-170)
- MCP review (chat per D-01)
- Manual unlock or requeue of any genuinely stuck rows surfaced by PF4 (triage path lives outside this brief)

---

## Pre-flight (read-only, night-job-runnable)

**PF1**. Locate Check 5 function definition. Same approach as F-AAP-007 PF1: search `supabase/migrations/` and `pg_get_functiondef(oid)`. Report function name, schema, current definition, return signature, source migration.

**PF2**. Confirm `m.post_publish_queue` columns. Verify `locked_at` and `locked_by` exist with the expected names and types. Report column list with types via `information_schema.columns`.

**PF3**. Confirm Check 5's current return value. Run the existing function. Almost certainly returns 0 rows (because `status='locked'` matches no rows in current vocabulary). Report.

**PF4**. Find genuinely stuck rows under correct semantics:
```sql
SELECT count(*)
FROM m.post_publish_queue
WHERE locked_at IS NOT NULL
  AND locked_at < now() - interval '2 hours';
```
Report cnt. This is what the fixed check should return. Sample 3 rows for triage context (queue_id, client_id, platform, locked_by, locked_at).

**PF5** (threshold sanity-check). Sample `locked_at` durations from successful publishes in the past 24h:
```sql
SELECT
  percentile_cont(0.5)  WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (published_at - locked_at))) AS p50_seconds,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (published_at - locked_at))) AS p95_seconds,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (published_at - locked_at))) AS p99_seconds,
  max(EXTRACT(EPOCH FROM (published_at - locked_at)))                                          AS max_seconds
FROM m.post_publish_queue
WHERE status = 'published'
  AND published_at > now() - interval '24 hours'
  AND locked_at IS NOT NULL;
```
If p99 or max comfortably exceeds 1 hour, raise the threshold accordingly. Report recommended threshold with reasoning.

---

## Proposed fix (DRAFT, do not apply)

Migration filename: `YYYYMMDDHHMMSS_baudit_check5_drift_lock_semantics.sql`

```sql
CREATE OR REPLACE FUNCTION <schema>.<check5_function>()
RETURNS TABLE(...) -- match existing signature, capture in PF1
LANGUAGE sql
STABLE
AS $$
  SELECT
    queue_id,
    client_id,
    platform,
    locked_at,
    locked_by,
    EXTRACT(EPOCH FROM (now() - locked_at)) / 60 AS locked_minutes
  FROM m.post_publish_queue
  WHERE locked_at IS NOT NULL
    AND locked_at < now() - interval '2 hours';
$$;
```

Threshold (`2 hours`) pending PF5 confirmation. If healthy locks routinely exceed 30min in the data, raise to 4 hours.

---

## Apply path (CHAT next session)

A1. Pre-flight reports PF1–PF5 reviewed by PK
A2. Final SQL committed with confirmed identifiers and threshold
A3. MCP review fired (action_type = `sql_destructive`)
A4. PK approves outcome of review
A5. Chat applies via `apply_migration`
A6. Verification (V1–V3)

---

## Verification (post-apply, chat)

**V1**. Source byte-identity preserved (Lesson #36)

**V2**. Check 5 returns the expected cnt from PF4. May be zero — that's healthy, not failure.

**V3**. Other 11 audit checks unchanged in verdict

---

## Triage path for newly-surfaced stuck rows

If PF4 / V2 returns non-zero, those are pre-existing genuinely-stuck rows the system has been blind to. Triage outside this brief, but standing approach:

1. Inspect `locked_by` to identify the worker (publisher? boost-worker? etc.)
2. Check that worker's logs around `locked_at` for failure pattern
3. Decision tree:
   - Worker crashed mid-publish, no platform_post_id → manual unlock + requeue
   - Platform call succeeded but write-back failed → manual unlock + mark published with platform_post_id
   - Worker still running (rare given >2h threshold) → wait, then requeue if still stuck
4. Log triage outcome in run notes

---

## Honest limitations

- **Cleanup, not crisis.** Zero current operational impact. The fix's value is restoring true visibility, not fixing an active bleed.
- **Threshold is a guess.** PF5 should confirm or amend with measured percentiles.
- **PF4 may surface zero rows**, in which case the fix is purely structural and V2's success criterion becomes "check runs clean against current data." That's still worth shipping.
- **No MCP escalation expected** — this is a pure-rewrite fix with no architectural ambiguity. If MCP review does escalate, that would be informative signal worth investigating before apply.

---

## References

- F-AAP-007 brief (sibling cleanup): `docs/briefs/2026-05-04-or-later-faap007-fix.md`
- B-AUDIT-V4-PEERS audit: `docs/audit/runs/2026-05-03-baudit-v4-peers.md`
- MCP review protocol v2.17: `docs/runtime/mcp_review_protocol.md`
