# F-PUB-005 Trigger Investigation + Patch Design

**Date:** 2026-05-03
**Authored by:** chat (parallel to CC running F-PUB-006 cleanup brief)
**PK directive:** "fast follow" on F-PUB-005 trigger patch
**Status:** investigation + draft design complete — patch brief committed at `docs/briefs/2026-05-03-fpub005-trigger-patch-cc.md`. **Not applied — pending PK review.**

## Purpose

Document the F-PUB-005 root cause, evaluate fix options, and produce a draft migration ready for PK review. Per Lesson #51 (terminal-decision authority requires disproportionate scrutiny) and the trigger touching publish-pipeline plumbing, the patch is investigated and drafted but not auto-applied.

## F-PUB-005 root cause

### The current lifecycle (broken)

```
m.ai_job.status = 'succeeded'
        ↓ (trigger trg_enqueue_publish_from_ai_job_v1 on m.ai_job)
m.post_publish_queue row INSERTED (status='queued', scheduled_for=now+min_gap)
        ↓
        post_draft is at approval_status='needs_review' ← QUEUE ROW IS PREMATURE
        ↓
auto-approver-v1.6.0 evaluates draft
        ↓
   ┌────┴────┐
   ↓         ↓
APPROVED   REJECTED (terminal)
   ↓         ↓
publisher   publisher fetches queue row
publishes   → pre-flight gate: not_approved:rejected
   ✅        → attempt_count++; row stays alive forever
              ↓
              QUEUE ROW IS A ZOMBIE
```

### What goes wrong

The `trg_enqueue_publish_from_ai_job_v1` trigger fires when `m.ai_job.status` moves to `'succeeded'`. At that moment, the `m.post_draft` row exists at `approval_status='needs_review'` — auto-approver hasn't evaluated yet. The trigger inserts a queue row regardless. If auto-approver later approves: queue row is correctly waiting. If auto-approver rejects: queue row points at a rejected draft and becomes a zombie.

The `trg_handle_draft_rejection` on `m.post_draft` (which fires when `approval_status` moves to `'rejected'`) currently resets the slot but **does not clean up the queue row**. So the zombie persists.

## Trigger inventory (verified via `information_schema.triggers` 2026-05-03 22:30 UTC)

| Schema | Table | Trigger | Event | Function |
|---|---|---|---|---|
| m | ai_job | trg_enqueue_publish_from_ai_job_v1 | AFTER UPDATE | m.enqueue_publish_from_ai_job_v1() |
| m | post_draft | trg_handle_draft_rejection | AFTER UPDATE | m.handle_draft_rejection() |

No other triggers touch `m.post_publish_queue`.

## Auto-approver behaviour (verified via repo source `supabase/functions/auto-approver/index.ts` v1.6.0)

The auto-approver EF only UPDATEs `m.post_draft.approval_status`. It does NOT directly insert/update/delete `m.post_publish_queue` rows. All queue management is trigger-driven.

This means the F-PUB-005 fix is single-vector: relocate the enqueue trigger from `m.ai_job` to `m.post_draft` on approval. No EF-side coordination required.

## Design options evaluated

### Option A — Relocate trigger (RECOMMENDED)

Drop the trigger on `m.ai_job`. Create a new trigger on `m.post_draft` that fires when `approval_status` changes to `'approved'`. Reuse the existing function logic (cap, gap, last-scheduled cadence) with adapted column references.

**Pros:**
- Cleanest semantics — queue row exists iff draft is approved
- No race with auto-approver (trigger fires AT approval, no premature insert)
- Resolves F-PUB-005 root cause permanently
- Existing logic (cap, gap calculation, ON CONFLICT) ports cleanly
- No status enum changes needed

**Cons:**
- Need to resolve `ai_job_id` for the queue row insert (m.post_draft doesn't have it directly; lookup via m.ai_job WHERE post_draft_id = X)
- Existing post_drafts that are already approved + queued are unaffected (idempotent ON CONFLICT) — but newly-approved-during-deploy drafts get one extra trigger fire (harmless)

### Option B — Add eligibility check to existing trigger

Add `AND post_draft.approval_status='approved'` to the trigger's IF clause. But at the time `m.ai_job.status` moves to succeeded, the post_draft is at `needs_review`. So the check would always fail and queue rows would never be created. This collapses to Option A (still need a trigger on m.post_draft for approval). Rejected.

### Option C — Two-stage with `pending_approval` status

Trigger on `m.ai_job` enqueues with status='pending_approval'. New trigger on `m.post_draft` moves to 'queued' on approval. Requires status enum change (DDL on `m.post_publish_queue.status` constraint). More moving parts. Rejected — Option A is simpler.

## Recommended design — Option A

### New function

```sql
CREATE OR REPLACE FUNCTION m.enqueue_publish_from_post_draft_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'm'
AS $function$
DECLARE
  v_queued_count INT;
  v_max_queued INT;
  v_min_gap INTERVAL;
  v_last_sched TIMESTAMPTZ;
  v_next_sched TIMESTAMPTZ;
  v_ai_job_id UUID;
BEGIN
  -- Only fire when approval_status transitions TO 'approved'
  IF tg_op = 'UPDATE'
     AND new.approval_status = 'approved'
     AND (old.approval_status IS DISTINCT FROM new.approval_status)
     AND COALESCE(new.platform, '') IN ('facebook', 'linkedin', 'instagram')
     AND new.client_id IS NOT NULL
  THEN
    -- Resolve ai_job_id (1:1 with post_draft via the generation pipeline)
    SELECT j.ai_job_id INTO v_ai_job_id
    FROM m.ai_job j
    WHERE j.post_draft_id = new.post_draft_id
    LIMIT 1;

    -- Read cap + gap from c.client_publish_profile (same logic as v1)
    SELECT
      COALESCE(cpp.max_queued_per_platform, 10),
      COALESCE(
        cpp.min_post_gap_minutes_override * INTERVAL '1 minute',
        cpp.min_gap_minutes * INTERVAL '1 minute',
        INTERVAL '120 minutes'
      )
    INTO v_max_queued, v_min_gap
    FROM c.client_publish_profile cpp
    WHERE cpp.client_id = new.client_id
      AND cpp.platform = new.platform;

    v_max_queued := COALESCE(v_max_queued, 10);
    v_min_gap    := COALESCE(v_min_gap, INTERVAL '120 minutes');

    -- Cap check
    SELECT COUNT(*) INTO v_queued_count
    FROM m.post_publish_queue
    WHERE status = 'queued'
      AND client_id = new.client_id
      AND platform = new.platform;

    IF v_queued_count < v_max_queued THEN
      -- Cadence
      SELECT MAX(scheduled_for) INTO v_last_sched
      FROM m.post_publish_queue
      WHERE status = 'queued'
        AND client_id = new.client_id
        AND platform = new.platform
        AND scheduled_for IS NOT NULL;

      v_next_sched := GREATEST(NOW(), COALESCE(v_last_sched, NOW()) + v_min_gap);

      -- Insert. Idempotent via existing constraint on (post_draft_id, platform).
      INSERT INTO m.post_publish_queue (
        ai_job_id, post_draft_id, client_id, platform, scheduled_for, status, attempt_count
      )
      VALUES (
        v_ai_job_id, new.post_draft_id, new.client_id, new.platform, v_next_sched, 'queued', 0
      )
      ON CONFLICT (post_draft_id, platform) DO NOTHING;
    END IF;
  END IF;

  RETURN new;
END;
$function$;
```

### New trigger

```sql
CREATE TRIGGER trg_enqueue_publish_on_approval
AFTER UPDATE ON m.post_draft
FOR EACH ROW
EXECUTE FUNCTION m.enqueue_publish_from_post_draft_approval();
```

(WHEN clause is inside the function body so the function gets called for all UPDATEs but exits cheaply for non-approval transitions — same pattern as the existing v1 trigger.)

### Drop the old trigger

```sql
DROP TRIGGER IF EXISTS trg_enqueue_publish_from_ai_job_v1 ON m.ai_job;
DROP FUNCTION IF EXISTS m.enqueue_publish_from_ai_job_v1();
```

(Function drop is optional — keeping it as archived would let us point at it for documentation. Recommend dropping for cleanliness.)

## Race conditions evaluated

| Scenario | Outcome under new design |
|---|---|
| Auto-approver approves → trigger fires → publisher picks up next 10min cron | Normal flow. Fine. |
| Manual approval via SQL or future portal UI | Trigger fires on UPDATE. Queue row inserted. Fine. |
| Draft moves rejected → approved (re-approval edge case) | Trigger fires (old IS DISTINCT FROM new). ON CONFLICT handles existing queue row. Fine. |
| Auto-approver fails mid-batch (EF crash) | No partial state — the EF UPDATEs each draft atomically. Trigger fires per UPDATE. Fine. |
| Approved draft is DELETEd somehow | Trigger doesn't fire (DELETE not UPDATE). Existing queue row may be orphaned, same problem as today. Out of scope for F-PUB-005; covered by F-PUB-006 orphan cleanup pattern. |

## Backfill / migration safety

### What happens to drafts already at approved + already queued?
No-op. The trigger only fires on FUTURE UPDATEs. Existing approved+queued drafts continue publishing normally.

### What happens to drafts already at approved but never enqueued?
This shouldn't exist under the v1 trigger (every approval came from a draft that was already enqueued at ai_job time). But to confirm:

```sql
-- pre-flight: any approved drafts without queue rows?
SELECT count(*) AS approved_without_queue
FROM m.post_draft pd
WHERE pd.approval_status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM m.post_publish_queue q
    WHERE q.post_draft_id = pd.post_draft_id
  );
```

Expected: 0. If non-zero, those need backfill (manual INSERT) or a one-shot UPDATE that bumps `updated_at` to retrigger the new function.

### What happens to drafts at needs_review with existing queue rows (today's F-PUB-005 mess)?
The Stage 2 cleanup in `docs/briefs/2026-05-03-fpub006-zombie-cleanup-cc.md` marks these dead. After that runs, no more zombies exist. Trigger patch then prevents new zombies from being created.

**Recommended order:** F-PUB-006 cleanup (running now) → F-PUB-005 trigger patch (after cleanup verified) → permanent closure.

## Verification plan

After applying the migration:

```sql
-- V1: confirm new trigger exists
SELECT trigger_name, event_object_table, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trg_enqueue_publish_on_approval';
-- Expected: 1 row, on m.post_draft, AFTER UPDATE

-- V2: confirm old trigger is gone
SELECT count(*) AS old_trigger_remaining
FROM information_schema.triggers
WHERE trigger_name = 'trg_enqueue_publish_from_ai_job_v1';
-- Expected: 0

-- V3: end-to-end smoke test (run after waiting for next ai_job → approval cycle)
-- After auto-approver approves at least one draft post-deploy:
SELECT count(*) AS new_queue_rows_post_patch
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.created_at > '<patch_apply_time>'
  AND pd.approval_status = 'approved';
-- Expected: > 0 (new queue rows are being created via the new trigger)

-- V4: confirm no new zombies are being created
SELECT count(*) AS new_zombies_post_patch
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.created_at > '<patch_apply_time>'
  AND pd.approval_status = 'needs_review';
-- Expected: 0 (no premature enqueue under new trigger)
```

V3 + V4 together prove the patch closes F-PUB-005.

## Risk assessment

| Risk | Severity | Mitigation |
|---|---|---|
| New trigger has a logic bug not caught in review | Medium | Function body is structurally identical to v1; only event source + WHEN clause changed. Code review + MCP review on apply. |
| ai_job_id lookup fails for some drafts | Low | LIMIT 1 + INSERT allows NULL ai_job_id. Queue row still functional without it. |
| Trigger doesn't fire because event WHEN logic is wrong | Low | Mirrored the same `IF tg_op = 'UPDATE' AND old IS DISTINCT FROM new` pattern as v1. |
| Drop of old trigger leaves a window where neither fires | Low | Migration is single transaction (CREATE → DROP → CREATE TRIGGER). PostgreSQL DDL is transactional. |
| Some EF or SQL function we missed is depending on the old trigger firing | Low-Medium | Read all triggers + read auto-approver source. No callers found. But unknown unknowns possible — apply with MCP review + verify on a quiet hour. |

## Open questions for PK

1. **Apply timing.** The patch should land AFTER F-PUB-006 cleanup brief completes (so we don't simultaneously change zombie state and trigger logic). Recommend Sun 3 May late session OR Mon 4 May.

2. **Drop or archive old function.** The recommendation drops `m.enqueue_publish_from_ai_job_v1()`. Alternative: keep the function definition but drop the trigger that calls it. Marginal documentation value; cleaner to drop.

3. **Backfill query (approved drafts without queue rows).** Should we run the pre-flight check in the patch brief, or trust v1 behaviour was always fully consistent?

## Cross-references

- F-PUB-006 cleanup brief: `docs/briefs/2026-05-03-fpub006-zombie-cleanup-cc.md`
- 42-dead audit: `docs/audit/runs/2026-05-03-fpub006-existing-dead-audit.md`
- Patch brief (drafted, not applied): `docs/briefs/2026-05-03-fpub005-trigger-patch-cc.md`
- B31 deploy: `docs/runtime/runs/2026-05-02-b31-auto-approver-v160-deploy.md`
- Auto-approver v1.6.0 source: `supabase/functions/auto-approver/index.ts` (commit f65e16d2)
