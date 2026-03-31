# AI Diagnostic Agent — Tier 2 Build Spec
**Date:** 31 March 2026
**Depends on:** Tier 1 (pipeline-ai-summary) running for 1–2 weeks
**Effort:** ~1 day in Claude Code
**Decision ref:** D057 (to be committed)

---

## What Tier 1 Does (Already Live)

`pipeline-ai-summary` Edge Function runs at :55 every hour via pg_cron.

1. Reads the latest `m.pipeline_health_snapshot` row
2. Calls Claude to reason about the state
3. Writes a structured JSON diagnosis to `m.pipeline_ai_summary`
4. Dashboard Monitor → Pipeline tab surfaces the result

**Tier 1 is diagnosis only. It never touches data.**

---

## What Tier 2 Adds

Two layers:

### Layer A — Real-Time Auto-Fixer (Edge Function)

A new Edge Function `pipeline-fixer` runs every 30 minutes via pg_cron,
30 minutes after Tier 1 (so at :25 and :55+30 → :25 past each hour effectively).

It reads the latest `m.pipeline_ai_summary` and executes a defined set of
**pre-approved auto-fix actions** that require no human judgement. These are
fixes that are always safe to apply regardless of context.

### Layer B — Nightly Strategic Auditor (Cowork Task — Already Built)

The Nightly Auditor Cowork task (running at 2am AEST) is the strategic Tier 2.
It looks at 24-hour patterns, not individual failure events. It writes
`docs/00_audit_report.md`. No additional build needed.

---

## Layer A — pipeline-fixer Edge Function

**File:** `supabase/functions/pipeline-fixer/index.ts` (new)
**Schedule:** every 30 minutes via pg_cron (offset from pipeline-ai-summary)
**Input:** reads `m.pipeline_ai_summary` latest row + direct DB queries
**Output:** writes to `m.pipeline_doctor_log` (already exists) + updates records

### Pre-Approved Auto-Fix Actions

These are executed unconditionally when conditions are met:

#### Fix 1 — Unstick locked ai_jobs
**Condition:** `m.ai_job` rows with `status = 'locked'` and `locked_at < now() - interval '30 minutes'`
**Action:** `UPDATE m.ai_job SET status = 'queued', locked_by = null, locked_at = null WHERE ...`
**Safe because:** Lock timeout means the worker crashed. Re-queuing is always correct.

#### Fix 2 — Reset stuck image generation
**Condition:** `m.post_draft` with `image_status = 'pending'` AND `approval_status = 'approved'`
AND `updated_at < now() - interval '2 hours'` AND `recommended_format IN ('image_quote','carousel')`
**Action:** No action needed — image-worker picks these up automatically on next run.
Actually: check if `image_status = 'failed'` for approved image-format drafts — reset those to `'pending'` for retry.
**Safe because:** Retrying a failed render is always correct. Worst case: fails again and gets marked failed.

#### Fix 3 — Kill orphaned publish queue items
**Condition:** `m.post_publish_queue` with `status = 'running'` AND `updated_at < now() - interval '20 minutes'`
**Action:** `UPDATE m.post_publish_queue SET status = 'queued', attempt_count = attempt_count + 1 WHERE ...`
**Safe because:** A publish item stuck in 'running' for 20+ min means the worker timed out. Re-queuing allows retry.

#### Fix 4 — Dead-letter items stuck too long
**Condition:** `m.ai_job` with `status IN ('failed', 'locked')` AND `updated_at < now() - interval '7 days'`
**Action:** `UPDATE m.ai_job SET status = 'dead', dead_reason = 'auto-dead: stuck 7+ days' WHERE ...`
**Safe because:** Items failing for 7 days will never succeed. Dead-lettering is housekeeping.

### Escalation Detection (writes to `m.pipeline_ai_summary.escalations` field)

These do NOT auto-fix — they write a structured alert that the Nightly Auditor picks up:

| Condition | Alert |
|---|---|
| No posts published for active client in >36 hours | `publishing_stalled` |
| `m.ai_job` queue depth > 50 for any client | `ai_backlog_critical` |
| 0 image renders in last 48 hours, image_generation_enabled = true | `image_pipeline_silent` |
| Dead letter count increased by >10 in last 24 hours | `dead_letter_spike` |
| Any `m.pipeline_ai_summary` health_ok = false for 3 consecutive runs | `health_degraded_persistent` |

### Output — `m.pipeline_doctor_log`

Each run writes one row (table already exists from pipeline-doctor v1):
```json
{
  "run_at": "2026-03-31T07:00:00Z",
  "fixes_applied": [
    {"fix": "unstick_locked_jobs", "count": 2, "ids": ["..."]},
    {"fix": "reset_failed_images", "count": 1, "ids": ["..."]}
  ],
  "escalations": ["image_pipeline_silent"],
  "health_ok": true,
  "version": "pipeline-fixer-v1.0.0"
}
```

---

## What NOT to Include in Tier 2

**Do not auto-fix:**
- Draft content (never modify draft_body or draft_title automatically)
- Approval status (never auto-approve or auto-reject a draft)
- Client configuration (never change client settings)
- Published posts (never touch m.post_publish)
- Feed sources (never disable or modify feeds)

All of the above require human judgement. If Tier 2 gets one of these wrong,
the consequence is real. The pipeline-fixer only touches queue state and
job status — things that are fully reversible with no client-visible impact.

---

## New DB Table — `m.pipeline_fixer_log`

If `m.pipeline_doctor_log` already has the right schema, reuse it.
Otherwise create `m.pipeline_fixer_log`:

```sql
CREATE TABLE m.pipeline_fixer_log (
  fixer_log_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at           timestamptz NOT NULL DEFAULT now(),
  fixes_applied    jsonb,
  escalations      jsonb,
  health_ok        boolean,
  version          text,
  created_at       timestamptz DEFAULT now()
);
```

---

## pg_cron Job

```sql
SELECT cron.schedule(
  'pipeline-fixer-30min',
  '25,55 * * * *',
  $$
  SELECT net.http_post(
    url := ... || '/functions/v1/pipeline-fixer',
    headers := jsonb_build_object('x-pipeline-fixer-key', ...),
    body := '{}'::jsonb
  );
  $$
);
```

Runs at :25 and :55 — offset from pipeline-ai-summary (:55) so Tier 1 has time to write before Tier 2 reads.

---

## Dashboard Integration

Add a "Fixer" section to the Monitor → Pipeline tab showing:
- Last fixer run time
- Fixes applied (count) in last 24 hours
- Active escalations (if any) — shown as amber/red banners
- Link to full fixer log

This closes the loop: Tier 1 diagnoses → Tier 2 fixes → dashboard shows both.

---

## Build Order in Claude Code

1. Check what columns `m.pipeline_doctor_log` actually has — reuse if compatible
2. If not compatible, apply the `m.pipeline_fixer_log` migration
3. Write `pipeline-fixer/index.ts` with 4 auto-fix actions + 5 escalation checks
4. Add `PIPELINE_FIXER_API_KEY` to Supabase secrets
5. Deploy Edge Function
6. Add pg_cron job
7. Add fixer section to Monitor → Pipeline tab in dashboard

**Estimated effort:** 4–5 hours in Claude Code.

---

## Notes for Claude Code

- Read `docs/00_sync_state.md` first
- Read `docs/skills/edge-function.md` before writing the function
- The `pipeline-doctor` v1 (already live) does a subset of this — review its code first
  to understand what it already handles so Tier 2 doesn't duplicate
- Tier 2 is additive. Do not modify pipeline-doctor v1.
- The 4 auto-fix actions should each be idempotent — running twice should have no effect
- Test each fix action in isolation with a targeted SQL query before deploying
