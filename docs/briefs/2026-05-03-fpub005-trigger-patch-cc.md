---
id: fpub005-trigger-patch
status: draft
created: 2026-05-03T22:55:00Z
owner: chat (chat-applies via Supabase MCP apply_migration)
chat-applies-ddl: yes
sunset: 2026-05-10T22:55:00Z
related-findings: F-PUB-005
related-decisions: D170 (chat applies migrations), Lesson #51, Lesson #61
related-investigations: docs/audit/runs/2026-05-03-fpub005-trigger-investigation.md
gates: F-PUB-006 cleanup brief MUST complete + verify before this brief runs
---

# F-PUB-005 Trigger Patch — Apply Brief (DRAFTED, NOT APPLIED)

## Status

**DRAFT — pending PK approval.** Do not run this brief until PK explicitly promotes status to `ready` AND the F-PUB-006 cleanup brief has completed all stages successfully (verified at Stage 3: ≥1 fresh publish on each enabled channel).

## Purpose

Apply Option A of the F-PUB-005 fix: relocate the enqueue trigger from `m.ai_job` (fires at generation, premature) to `m.post_draft` (fires at approval, correct). Closes the F-PUB-005 root cause permanently — no more zombie queue rows pointing at unapproved drafts.

## Prerequisites

- F-PUB-006 brief Stage 3 verified (publishes flowing post-cleanup)
- Investigation document reviewed: `docs/audit/runs/2026-05-03-fpub005-trigger-investigation.md`
- Supabase MCP available (chat applies via `apply_migration`)
- ChatGPT Review MCP available (chat fires before apply)
- Quiet hour selected (low generation volume — minimises unobserved trigger firings during the swap window)

## Pre-flight validation (Lesson #61)

Run before the migration. If any check fails, abort and update investigation doc with what changed.

### P1 — Confirm trigger state hasn't drifted

```sql
SELECT trigger_name, event_object_schema, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN ('trg_enqueue_publish_from_ai_job_v1', 'trg_enqueue_publish_on_approval', 'trg_handle_draft_rejection')
ORDER BY trigger_name;
```
**Expected:**
- `trg_enqueue_publish_from_ai_job_v1` on m.ai_job (will be dropped)
- `trg_handle_draft_rejection` on m.post_draft (unchanged)
- `trg_enqueue_publish_on_approval` MUST NOT EXIST yet

### P2 — Confirm function source matches investigation

```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'enqueue_publish_from_ai_job_v1'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'm');
```
**Expected:** Source matches the version captured in `docs/audit/runs/2026-05-03-fpub005-trigger-investigation.md` "trigger inventory" section. If drifted, abort and re-investigate.

### P3 — Confirm no approved drafts are missing queue rows

```sql
SELECT count(*) AS approved_without_queue
FROM m.post_draft pd
WHERE pd.approval_status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM m.post_publish_queue q
    WHERE q.post_draft_id = pd.post_draft_id
  );
```
**Expected:** 0. If non-zero, those drafts will need backfill. **Abort if > 5** — investigate why before patching.

### P4 — Quiet hour check

```sql
-- Confirm low ai_job activity in last 30min (we want fewer triggers firing during the swap)
SELECT count(*) AS recent_ai_job_succeeds
FROM m.ai_job
WHERE updated_at > now() - interval '30 minutes'
  AND status = 'succeeded';
```
**Recommendation:** apply when this returns < 5. Not a hard gate, but reduces window for missed-fire edge cases.

## Migration SQL (chat applies via apply_migration)

Migration name (snake_case, per Supabase MCP convention):
`fpub005_relocate_enqueue_trigger_from_ai_job_to_post_draft_approval`

```sql
-- F-PUB-005 patch: relocate the enqueue trigger.
-- Old: trg_enqueue_publish_from_ai_job_v1 on m.ai_job (fires at generation — premature)
-- New: trg_enqueue_publish_on_approval on m.post_draft (fires at approval — correct)
-- This is a single-transaction swap. PostgreSQL DDL is transactional, so no window
-- exists where neither trigger is active.

-- Step 1: Create new function on m.post_draft approval transitions
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
  IF tg_op = 'UPDATE'
     AND new.approval_status = 'approved'
     AND (old.approval_status IS DISTINCT FROM new.approval_status)
     AND COALESCE(new.platform, '') IN ('facebook', 'linkedin', 'instagram')
     AND new.client_id IS NOT NULL
  THEN
    -- Resolve ai_job_id (1:1 with post_draft via generation pipeline)
    SELECT j.ai_job_id INTO v_ai_job_id
    FROM m.ai_job j
    WHERE j.post_draft_id = new.post_draft_id
    LIMIT 1;

    -- Read cap + gap from c.client_publish_profile
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

    SELECT COUNT(*) INTO v_queued_count
    FROM m.post_publish_queue
    WHERE status = 'queued'
      AND client_id = new.client_id
      AND platform = new.platform;

    IF v_queued_count < v_max_queued THEN
      SELECT MAX(scheduled_for) INTO v_last_sched
      FROM m.post_publish_queue
      WHERE status = 'queued'
        AND client_id = new.client_id
        AND platform = new.platform
        AND scheduled_for IS NOT NULL;

      v_next_sched := GREATEST(NOW(), COALESCE(v_last_sched, NOW()) + v_min_gap);

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

-- Step 2: Create trigger on m.post_draft for the new function
CREATE TRIGGER trg_enqueue_publish_on_approval
AFTER UPDATE ON m.post_draft
FOR EACH ROW
EXECUTE FUNCTION m.enqueue_publish_from_post_draft_approval();

-- Step 3: Drop old trigger and function (single transaction with steps 1+2)
DROP TRIGGER IF EXISTS trg_enqueue_publish_from_ai_job_v1 ON m.ai_job;
DROP FUNCTION IF EXISTS m.enqueue_publish_from_ai_job_v1();

-- Step 4: Comment for forward documentation
COMMENT ON FUNCTION m.enqueue_publish_from_post_draft_approval() IS
  'F-PUB-005 patch (2026-05-03): enqueues post_publish_queue rows when m.post_draft.approval_status transitions TO approved. Replaces trg_enqueue_publish_from_ai_job_v1 which fired at generation time and produced zombie queue rows. See docs/audit/runs/2026-05-03-fpub005-trigger-investigation.md.';
```

## MCP review payload (chat fires before apply)

- `action_type`: `sql_destructive` (DDL — DROP TRIGGER + DROP FUNCTION are destructive)
- `decision_under_review`: "Relocate enqueue trigger from m.ai_job → m.post_draft on approval to close F-PUB-005 zombie-queue-row root cause"
- `production_action_if_approved`: full migration SQL above
- `consequence_if_delayed`: "F-PUB-005 keeps creating new zombies at every ai_job → succeeded transition. Stage 2 of F-PUB-006 cleanup is recurring closure work, not permanent."
- `cost_of_waiting`: "low for 24h — F-PUB-006 Stage 2 cleanup absorbs new zombies. Beyond 24h, dead-letter accumulation grows; observability cost only, no production breakage."
- `current_evidence`:
  - Trigger source captured in investigation doc
  - Auto-approver source confirmed not touching queue directly
  - 42-dead audit confirmed no other broken patterns
  - Pre-flight P1-P4 results
- `known_weak_evidence`:
  - "Haven't tested the new function in a non-prod environment — Supabase free tier doesn't have a staging branch active"
  - "Don't know if any external system (e.g. dashboard, future portal) reads m.ai_job and assumes the v1 trigger fires"
- `default_action`: "If review escalates: pause and pull PK in. If review approves: apply during quiet hour (P4 < 5 succeeds in last 30min)."

## Verification (after apply)

### V1 — Confirm trigger swap completed
```sql
SELECT trigger_name, event_object_schema, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%enqueue_publish%'
ORDER BY trigger_name;
```
**Expected:** Single row — `trg_enqueue_publish_on_approval` on `m.post_draft`. Old trigger gone.

### V2 — Confirm function swap completed
```sql
SELECT proname FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname='m')
  AND proname LIKE '%enqueue_publish%';
```
**Expected:** Single row — `enqueue_publish_from_post_draft_approval`. Old function gone.

### V3 — End-to-end smoke test (wait ~20 min after apply)

Once auto-approver-sweep cron has fired at least twice post-apply (it runs every 10 min):

```sql
-- New queue rows created since patch apply
SELECT count(*) AS new_queue_rows
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.created_at > '<apply_timestamp>'
  AND pd.approval_status = 'approved';
```
**Expected:** > 0 (new trigger is firing on approvals). If 0, either (a) nothing was approved in that window OR (b) trigger isn't wired correctly. Investigate before declaring success.

### V4 — Confirm no new zombies
```sql
SELECT count(*) AS new_zombies_post_patch
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.created_at > '<apply_timestamp>'
  AND pd.approval_status = 'needs_review';
```
**Expected:** 0 (premature enqueue is no longer happening).

V3 + V4 together prove the patch closes F-PUB-005 permanently.

## Failure modes

| If… | Then… |
|---|---|
| P1 finds the new trigger already exists | Stop. Investigate — someone applied this brief out-of-band. |
| P2 finds function source has drifted | Stop. Re-investigate. Investigation doc is stale. |
| P3 returns > 5 approved-without-queue | Stop. Investigate root cause first; backfill required before patch. |
| MCP review returns `escalate` | Follow protocol v2.17 response-side. Pause for PK. |
| Migration apply errors | Single transaction — all-or-nothing rollback. Re-check P1 to confirm clean state, fix issue, retry. |
| V3 returns 0 after 30 min | Trigger isn't firing on approvals. Possible WHEN clause bug. Check trigger via `\d+ m.post_draft`. |
| V4 returns > 0 | Trigger fires too early. Check function body — is the IF clause correct? |

## Handover (per memory entry 11 — 4-way sync)

After completion (success or partial), chat writes:
- **Run state**: `docs/runtime/runs/2026-05-03-fpub005-trigger-patch-apply.md` — chronological log of pre-flight, MCP review ID, migration apply result, V1-V4 results
- **Decisions**: append D188 (or next available) to `docs/06_decisions.md` confirming Option A as the chosen design with rationale
- **Action list bump**: add row marking F-PUB-005 closed (or partial), bump to v2.21
- **Sync state addendum**: append session segment to `docs/00_sync_state.md`
- **Memory candidate**: capture as Lesson #63 candidate if any unexpected issues arose during apply

## What this brief explicitly does NOT do

- Cleanup any existing zombie rows (that's F-PUB-006 Stage 2's job, runs first)
- Modify auto-approver EF (no EF changes needed)
- Change `c.client_publish_profile` schema or values
- Add backfill for approved-without-queue drafts (gated by P3 result)
- Touch `trg_handle_draft_rejection` (separately handles slot reset, unaffected)

## Estimated time

- Pre-flight P1-P4 (chat): 5 min
- MCP review fire (chat): 2 min
- Migration apply (chat): 1 min
- Wait + V1-V4 (chat): 25 min

Total: ~35 min. Closure budget tracking per D186: estimate 0.5h logged.
