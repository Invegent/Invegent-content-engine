# ICE — Developer Verification Protocol
## Layer 1 QA — What Every Build Must Pass Before Production Deploy

This checklist applies to every Edge Function change, SQL function change,
pg_cron change, or schema migration before it touches production.

No exceptions. No deploy-and-see.

---

## PRE-DEPLOY CHECKLIST

### Step 1 — State the expected outcome before writing any code
```
Before starting any build, write down:
- What this change produces that did not exist before
- What existing behaviour must not change
- What the verification query will be
- What the rollback plan is if production breaks
```
If you cannot answer all four, do not start the build.

### Step 2 — Verify current state first
```sql
-- Check current system state before any change
SELECT schema_name, table_name, purpose
FROM k.vw_table_summary
WHERE schema_name = '<affected_schema>';

-- Confirm no existing issues before adding new code
SELECT * FROM m.run_system_audit()
WHERE status = 'fail';
```
Do not deploy into a system with pre-existing audit failures.
Fix existing issues first.

### Step 3 — Test invocation before deploy
For every Edge Function, run a manual test invocation against
staging or with minimal production impact before scheduling via pg_cron.

Template:
```
Function: <function_name>
Test input: <describe the specific input used>
Expected output: <exact rows/records/state changes expected>
Actual output: <fill in after running>
Pass/Fail: <circle one>
```

### Step 4 — Verification queries
Every build must have documented verification queries run after deploy.
```sql
-- Template — replace with actual queries for each build
-- Query 1: Confirm new rows/records created
SELECT COUNT(*) FROM <table> WHERE <condition>;
-- Expected: <N> rows

-- Query 2: Confirm no unintended side effects
SELECT COUNT(*) FROM <table> WHERE status = 'error';
-- Expected: 0 rows

-- Query 3: Confirm FK integrity
SELECT COUNT(*) FROM <child_table> c
LEFT JOIN <parent_table> p ON p.id = c.parent_id
WHERE p.id IS NULL;
-- Expected: 0 rows (no orphans)
```

### Step 5 — Rollback plan
Document before deploying:
```
If this breaks production:
1. <First action — e.g. disable pg_cron job>
2. <Second action — e.g. revert Edge Function to previous version>
3. <Third action — e.g. run this SQL to reset state>
Estimated rollback time: <N minutes>
```

---

## EDGE FUNCTION VERIFICATION TEMPLATES

### ingest-worker
```sql
-- After manual invocation:
SELECT 
  COUNT(*) as raw_items_created,
  MAX(created_at) as last_created
FROM f.raw_content_item
WHERE created_at > now() - interval '10 minutes';
-- Expected: > 0 rows, last_created within last 10 minutes

SELECT status, COUNT(*) 
FROM f.ingest_run 
WHERE created_at > now() - interval '10 minutes'
GROUP BY status;
-- Expected: status = 'complete', count = 1
```

### ai-worker
```sql
-- After manual invocation:
SELECT 
  approval_status,
  compliance_status,
  COUNT(*)
FROM m.post_draft
WHERE created_at > now() - interval '10 minutes'
GROUP BY approval_status, compliance_status;
-- Expected: rows with approval_status = 'needs_review' or 'approved'
-- Expected: 0 rows with compliance_status = 'HARD_BLOCK'

SELECT status, COUNT(*)
FROM m.ai_job
WHERE updated_at > now() - interval '10 minutes'
GROUP BY status;
-- Expected: status = 'complete', 0 rows with status = 'generating'
```

### publisher
```sql
-- After manual invocation:
SELECT 
  p.client_id,
  COUNT(*) as posts_published,
  MAX(published_at) as last_published
FROM m.post_publish p
WHERE p.published_at > now() - interval '10 minutes'
GROUP BY p.client_id;
-- Expected: 1 row per client in auto mode, published_at recent

SELECT COUNT(*) as stuck_items
FROM m.post_publish_queue
WHERE status = 'locked'
AND updated_at < now() - interval '30 minutes';
-- Expected: 0
```

### auto-approver
```sql
-- After manual invocation:
SELECT 
  approval_status,
  COUNT(*)
FROM m.post_draft
WHERE updated_at > now() - interval '10 minutes'
GROUP BY approval_status;
-- Expected: rows moved from 'needs_review' to 'approved' or 'flagged'
-- Review auto_approval_score distribution for calibration
```

### compliance-reviewer
```sql
-- After manual invocation:
SELECT 
  status,
  compliance_status,
  COUNT(*)
FROM m.compliance_review_queue
WHERE created_at > now() - interval '10 minutes'
GROUP BY status, compliance_status;
-- Expected: rows created, ai_analysis JSONB populated
-- Expected: 0 rows with compliance_status = null
```

---

## SCHEMA MIGRATION VERIFICATION

After every schema change:
```sql
-- 1. Confirm table exists with correct columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = '<schema>' AND table_name = '<table>'
ORDER BY ordinal_position;

-- 2. Confirm FK constraints exist
SELECT constraint_name, column_name
FROM information_schema.key_column_usage
WHERE table_schema = '<schema>' AND table_name = '<table>';

-- 3. Confirm RLS policy exists (if client-scoped table)
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = '<schema>' AND tablename = '<table>';

-- 4. Update k schema registry
SELECT refresh_catalog();

-- 5. Confirm k registry updated
SELECT table_name, purpose, columns_list
FROM k.vw_table_summary
WHERE table_name = '<table>';
-- Expected: new table appears in k catalog with purpose documented
```

---

## pg_cron JOB VERIFICATION

After any cron job change:
```sql
-- Confirm job exists with correct schedule
SELECT jobname, schedule, command, active
FROM cron.job
WHERE jobname = '<job_name>';
-- Expected: correct schedule, active = true

-- Manual trigger test
SELECT cron.schedule('test-manual', 'now', '<command>');
-- Then verify output using stage-specific queries above

-- Check last run status
SELECT 
  jobname,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobname = '<job_name>'
ORDER BY start_time DESC
LIMIT 5;
-- Expected: status = 'succeeded'
```

---

## GITHUB DEPLOY SEQUENCE

Always in this order. Never reversed.
```
1. Write code locally
2. Test invocation manually
3. Verify expected output
4. Commit to GitHub
5. Deploy to Supabase (not before GitHub push)
6. Verify in production using stage queries above
7. Run system audit: SELECT * FROM m.run_system_audit() WHERE status = 'fail';
8. If any audit failures: investigate before declaring deploy complete
9. Document: what was deployed, when, verified by whom
```

---

## REGRESSION TEST RULE

Every time a bug is found and fixed:
1. Add the failure condition to `docs/quality/01_expected_system_state.md` regression log
2. Add a permanent check to the audit function that catches this condition
3. The bug cannot silently return — the audit will catch it

---

*Document owner: PK*
*Review cycle: Update when new Edge Functions are added*
*Last updated: April 2026*
