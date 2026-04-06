# Claude Code Brief — QA Framework Phase 2
## B3: Test Runner + B5: Weekly Manager Report

**Date:** April 2026
**Priority:** Phase 2 — build after C1 (Facebook Insights back-feed)
**Depends on:** B4 (system audit function) already applied, C1 live
**Estimated effort:** 1–2 days
**Execution:** Claude Code autonomous loop

---

## Context

This brief is part of the ICE QA framework (docs/quality/).
B4 (system audit function) and D3 (audience asset schema) are already
deployed as migrations in docs/migrations/.
This brief covers the two remaining automated QA builds.

---

## Task 1: B3 — Pipeline Test Runner

### What to build

A new Edge Function `test-runner` that runs every 30 minutes via pg_cron.
It checks actual pipeline output against documented expected ranges.
Writes pass/fail to a test log table.
Surfaces failures as dashboard alerts.

### Schema to create first

```sql
-- m.pipeline_test_expectation
-- Stores expected ranges per pipeline stage per metric
CREATE TABLE IF NOT EXISTS m.pipeline_test_expectation (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_name        text NOT NULL,
  -- 'ingest-worker' | 'content-fetch' | 'bundler' | 'ai-worker' |
  -- 'auto-approver' | 'publisher' | 'compliance-monitor'
  metric_name       text NOT NULL,
  expected_min      numeric,
  expected_max      numeric,
  alert_if_below    boolean NOT NULL DEFAULT true,
  alert_if_above    boolean NOT NULL DEFAULT false,
  client_id         uuid REFERENCES c.client(id),
  -- NULL = applies to all clients
  severity          text NOT NULL DEFAULT 'warn'
                    CHECK (severity IN ('info', 'warn', 'fail')),
  active            boolean NOT NULL DEFAULT true,
  last_calibrated_at timestamptz,
  notes             text,
  UNIQUE(stage_name, metric_name, client_id)
);

-- m.pipeline_test_log
-- Results of each test-runner execution
CREATE TABLE IF NOT EXISTS m.pipeline_test_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at            timestamptz NOT NULL DEFAULT now(),
  stage_name        text NOT NULL,
  metric_name       text NOT NULL,
  client_id         uuid REFERENCES c.client(id),
  expected_min      numeric,
  expected_max      numeric,
  actual_value      numeric,
  status            text NOT NULL CHECK (status IN ('pass', 'warn', 'fail')),
  detail            text
);
```

### Seed initial expectations

```sql
-- Publisher: active clients must publish at least 1 post per day
INSERT INTO m.pipeline_test_expectation
  (stage_name, metric_name, expected_min, alert_if_below, severity, notes)
VALUES
  ('publisher', 'posts_published_24h', 1, true, 'warn',
   'Each active client should publish at least 1 post per 24 hours'),
  ('ai-worker', 'draft_completion_rate_pct', 70, true, 'warn',
   '% of digest items that produce a draft within 2 hours'),
  ('ai-worker', 'hard_block_rate_pct', 0, false, 'fail',
   '% of drafts with HARD_BLOCK compliance status - must be 0'),
  ('ingest-worker', 'raw_items_per_run', 10, true, 'warn',
   'Minimum raw content items expected per ingest run'),
  ('publisher', 'stuck_queue_items', 0, false, 'fail',
   'Items in locked state > 2 hours must be 0'),
  ('ai-worker', 'stuck_ai_jobs', 0, false, 'fail',
   'AI jobs in generating state > 1 hour must be 0');
```

### Edge Function: test-runner

Location: `supabase/functions/test-runner/index.ts`

Logic:
1. Read active expectations from `m.pipeline_test_expectation`
2. For each expectation, run the appropriate query to get actual value
3. Compare actual vs expected range
4. Write result to `m.pipeline_test_log`
5. If any failures: write to `m.pipeline_doctor_log` or alert table
   so dashboard surfaces them

Key queries per metric:

```typescript
// posts_published_24h per client
const { data } = await supabase.rpc('exec_sql', { sql: `
  SELECT cl.name, COUNT(pp.id) as cnt
  FROM c.client cl
  LEFT JOIN m.post_publish pp
    ON pp.client_id = cl.id
    AND pp.published_at > now() - interval '24 hours'
  WHERE cl.status = 'active'
  GROUP BY cl.name
` });

// stuck_queue_items
const { data } = await supabase.rpc('exec_sql', { sql: `
  SELECT COUNT(*) as cnt FROM m.post_publish_queue
  WHERE status = 'locked'
  AND updated_at < now() - interval '2 hours'
` });

// hard_block_rate_pct (last 24h)
const { data } = await supabase.rpc('exec_sql', { sql: `
  SELECT
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE compliance_status = 'HARD_BLOCK')
      / NULLIF(COUNT(*), 0)
    , 2) as pct
  FROM m.post_draft
  WHERE created_at > now() - interval '24 hours'
` });
```

### pg_cron schedule

```sql
SELECT cron.schedule(
  'ice-test-runner',
  '*/30 * * * *',  -- every 30 minutes
  $$ SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/test-runner',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) $$
);
```

### Regression test rule

Every bug that has been fixed should have a test here.
Current regression tests to add:
- publisher retry count never exceeds configured max (error 368 pattern)
- No queue item remains in 'locked' state after publisher completes

---

## Task 2: B5 — Weekly Manager Report

### What to build

Extend the existing `ai-diagnostic` Edge Function to produce a
weekly manager report delivered by email every Sunday at 10 PM AEST.

Reference: `docs/quality/04_weekly_manager_report_spec.md`

### Logic changes to ai-diagnostic

Add a `mode` parameter: `'daily' | 'weekly_manager_report'`

When mode = 'weekly_manager_report':
1. Run `m.run_system_audit()` — get full audit results
2. Query publishing summary for the past 7 days per client
3. Query pipeline health averages for the past 7 days
4. Query `m.audience_asset` sizes if table exists
5. Query `m.system_audit_log` for trend (is pass_count improving or degrading?)
6. Build HTML email per the spec in docs/quality/04_weekly_manager_report_spec.md
7. Send via Resend to pk@invegent.com
8. Write report summary to `m.system_audit_log` with triggered_by = 'scheduled'

### Email format

Reference the spec exactly. Key sections:
- Overall status (one line, green/amber/red)
- Publishing summary (posts, engagement per client)
- Pipeline health summary (each stage with icon)
- Audit results (pass/warn/fail counts + detail on warns/fails)
- Actions required (prioritised list)
- Audience building progress (from m.audience_asset)
- Upcoming (token expiry, external blockers)

Subject line format:
`ICE Weekly Report — 07 Apr 2026 — ✅ Healthy`
or
`ICE Weekly Report — 07 Apr 2026 — ⚠️ 2 Warnings`
or
`ICE Weekly Report — 07 Apr 2026 — 🔴 Action Required`

### pg_cron schedule

```sql
SELECT cron.schedule(
  'ice-weekly-manager-report',
  '0 12 * * 0',  -- Sunday 12:00 UTC = Sunday 10 PM AEST
  $$ SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/ai-diagnostic',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"mode": "weekly_manager_report"}'::jsonb
  ) $$
);
```

---

## Execution Instructions for Claude Code

```
1. Read docs/00_sync_state.md
2. Read docs/quality/00_session_action_register.md (B3, B5 tasks)
3. Read docs/quality/03_system_audit_spec.md
4. Read docs/quality/04_weekly_manager_report_spec.md
5. Check existing ai-diagnostic Edge Function:
   supabase/functions/ai-diagnostic/index.ts
6. Verify m.run_system_audit() is deployed:
   SELECT proname FROM pg_proc WHERE proname = 'run_system_audit';
   If not deployed: apply docs/migrations/2026-04-07-system-audit-function.sql first
7. Apply pipeline_test_expectation + pipeline_test_log schema
8. Seed initial expectations
9. Build test-runner Edge Function
10. Deploy test-runner
11. Schedule test-runner cron
12. Extend ai-diagnostic for weekly_manager_report mode
13. Deploy ai-diagnostic
14. Schedule weekly_manager_report cron
15. Manually trigger weekly_manager_report to verify email arrives
16. Update k registry: SELECT refresh_catalog();
17. Commit all new files to GitHub
18. Update docs/00_sync_state.md with new function versions
```

## Pre-execution verification

```sql
-- Confirm B4 is deployed before starting
SELECT proname FROM pg_proc
WHERE proname = 'run_system_audit';
-- Expected: 1 row

-- Confirm D3 is deployed before starting
SELECT table_name FROM information_schema.tables
WHERE table_schema IN ('m', 'c')
AND table_name IN ('audience_asset', 'client_audience_policy');
-- Expected: 2 rows
```

## Post-execution verification

```sql
-- Test runner is scheduled
SELECT jobname, schedule, active FROM cron.job
WHERE jobname IN ('ice-test-runner', 'ice-weekly-manager-report');
-- Expected: 2 rows, both active

-- Test log has entries (after first run)
SELECT stage_name, status, COUNT(*)
FROM m.pipeline_test_log
WHERE run_at > now() - interval '1 hour'
GROUP BY stage_name, status;
-- Expected: rows from each stage

-- Email delivered
-- Check pk@invegent.com inbox for weekly manager report
```

---

*Brief created: April 2026*
*Execute when: C1 (Facebook Insights back-feed) is live*
*B4 and D3 must be applied as migrations first*
