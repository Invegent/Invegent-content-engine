# ICE — System Audit Function Specification
## Layer 3 QA — m.run_system_audit()

This document specifies the system audit function.
The function is called automatically weekly (Sunday night)
and on demand before any significant deploy or client onboarding.

---

## PURPOSE

The audit function answers three questions:
1. Is the system structurally intact?
2. Is the pipeline operationally healthy?
3. Is the data internally consistent and compliant?

It produces a structured result set — one row per invariant — that can be
read by the weekly manager report, surfaced in the dashboard, and acted on.

---

## FUNCTION SIGNATURE

```sql
CREATE OR REPLACE FUNCTION m.run_system_audit()
RETURNS TABLE (
  category        text,      -- 'structural' | 'operational' | 'data_integrity' | 'compliance'
  invariant_name  text,      -- human-readable name
  status          text,      -- 'pass' | 'fail' | 'warn'
  detail          text,      -- what was found
  recommendation  text,      -- what to do if fail/warn
  checked_at      timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Implementation per categories below
END;
$$;
```

---

## CATEGORY 1 — STRUCTURAL INVARIANTS

```sql
-- Check 1: Edge Function count
-- Expected: 25 active Edge Functions
-- Source: supabase_functions.functions (if accessible) or manual count

-- Check 2: pg_cron job count and active status
SELECT COUNT(*) FROM cron.job WHERE active = true;
-- Expected: matches documented cron job count (update when jobs change)

-- Check 3: k schema catalog completeness
SELECT COUNT(*) FROM k.table_registry;
-- Expected: 117+ tables documented (grows as new tables added)

SELECT COUNT(*) FROM k.table_registry WHERE purpose = 'TODO';
-- Expected: 0 (no undocumented tables)

-- Check 4: RLS policy existence on client-scoped tables
-- For each table in m schema and c schema with client_id column:
SELECT tablename FROM pg_policies
WHERE schemaname IN ('m', 'c')
GROUP BY tablename;
-- Expected: every client-scoped table has at least one RLS policy
```

---

## CATEGORY 2 — OPERATIONAL INVARIANTS

```sql
-- Check 1: Client publish profiles active
SELECT COUNT(*) FROM c.client_publish_profile
WHERE enabled = true;
-- Expected: 2 (both NDIS Yarns and Property Pulse)

-- Check 2: Platform token expiry
SELECT client_id, platform, token_expires_at
FROM c.client_channel
WHERE token_expires_at < now() + interval '7 days'
AND status = 'active';
-- Expected: 0 rows (no tokens expiring within 7 days)

-- Check 3: Active feed count per client
SELECT cs.client_id, COUNT(*) as active_feeds
FROM c.client_source cs
JOIN f.feed_source fs ON fs.id = cs.feed_source_id
WHERE fs.status = 'active'
GROUP BY cs.client_id;
-- Expected: >= 10 per client

-- Check 4: Stuck ai_jobs
SELECT COUNT(*) FROM m.ai_job
WHERE status = 'generating'
AND updated_at < now() - interval '1 hour';
-- Expected: 0

-- Check 5: Stuck publish queue items
SELECT COUNT(*) FROM m.post_publish_queue
WHERE status = 'locked'
AND updated_at < now() - interval '2 hours';
-- Expected: 0

-- Check 6: Dead letter queue not growing
-- Compare current dead count vs 24 hours ago via pipeline_doctor_log
SELECT 
  current_dead.cnt as dead_now,
  yesterday_dead.cnt as dead_yesterday
FROM (
  SELECT dead_item_count as cnt 
  FROM m.pipeline_doctor_log 
  ORDER BY created_at DESC LIMIT 1
) current_dead,
(
  SELECT dead_item_count as cnt 
  FROM m.pipeline_doctor_log 
  WHERE created_at < now() - interval '24 hours'
  ORDER BY created_at DESC LIMIT 1
) yesterday_dead;
-- Expected: dead_now <= dead_yesterday + 5 (allow small growth, flag large growth)

-- Check 7: Publishing activity — active clients publishing
SELECT 
  pp.client_id,
  MAX(pp.published_at) as last_published
FROM m.post_publish pp
GROUP BY pp.client_id;
-- Expected: last_published < 48 hours ago for all active clients
```

---

## CATEGORY 3 — DATA INTEGRITY INVARIANTS

```sql
-- Check 1: No orphaned post_draft records
SELECT COUNT(*) as orphaned_drafts
FROM m.post_draft pd
LEFT JOIN m.digest_item di ON di.id = pd.digest_item_id
WHERE di.id IS NULL;
-- Expected: 0

-- Check 2: No orphaned post_publish records
SELECT COUNT(*) as orphaned_publishes
FROM m.post_publish pp
LEFT JOIN m.post_publish_queue ppq ON ppq.id = pp.post_publish_queue_id
WHERE ppq.id IS NULL;
-- Expected: 0

-- Check 3: Approved drafts without queue entries
SELECT COUNT(*) as approved_without_queue
FROM m.post_draft pd
LEFT JOIN m.post_publish_queue ppq ON ppq.post_draft_id = pd.id
WHERE pd.approval_status = 'approved'
AND ppq.id IS NULL
AND pd.updated_at < now() - interval '24 hours';
-- Expected: 0 (approved drafts should be queued within 24 hours)

-- Check 4: No orphaned ai_job records
SELECT COUNT(*) as orphaned_jobs
FROM m.ai_job aj
LEFT JOIN m.digest_item di ON di.id = aj.digest_item_id
WHERE di.id IS NULL;
-- Expected: 0
```

---

## CATEGORY 4 — COMPLIANCE INVARIANTS

```sql
-- Check 1: No HARD_BLOCK posts published
SELECT COUNT(*) as hard_block_published
FROM m.post_publish pp
JOIN m.post_draft pd ON pd.id = pp.post_draft_id
WHERE pd.compliance_status = 'HARD_BLOCK';
-- Expected: 0 (absolute zero tolerance)

-- Check 2: Compliance review queue not stale
SELECT COUNT(*) as stale_reviews
FROM m.compliance_review_queue
WHERE status = 'pending'
AND created_at < now() - interval '7 days';
-- Expected: 0

-- Check 3: All clients have compliance rules
SELECT c.name as client_name
FROM c.client c
WHERE c.status = 'active'
AND NOT EXISTS (
  SELECT 1 FROM m.get_compliance_rules(
    (SELECT vertical_slug FROM c.client_content_scope WHERE client_id = c.id LIMIT 1),
    c.profession_slug
  )
);
-- Expected: 0 rows (all active clients have compliance rules)

-- Check 4: Compliance monitor has run recently
SELECT MAX(created_at) as last_compliance_run
FROM m.compliance_review_queue;
-- Expected: within last 35 days
```

---

## AUDIT RESULT INTERPRETATION

```
All pass   → System healthy. No action required.
Any warn   → Investigate within 48 hours. Not critical but trending toward fail.
Any fail   → Action required before proceeding with new builds.
Multiple   
fail       → Stop all new development. Fix system first.
```

## AUDIT RUN SCHEDULE

```
Automatic:  Sunday 11 PM AEST via pg_cron
Manual:     Before any significant deploy
Manual:     Before onboarding any new client
Manual:     After any incident resolution
Manual:     Any time confidence in system state is low
```

---

## AUDIT LOG TABLE

```sql
-- Store audit results for trend analysis
m.system_audit_log
  audit_id       uuid PK
  run_at         timestamptz
  triggered_by   text    -- 'scheduled' | 'manual' | 'pre-deploy' | 'post-incident'
  total_checks   integer
  pass_count     integer
  warn_count     integer
  fail_count     integer
  results        jsonb   -- full result set
  overall_status text    -- 'pass' | 'warn' | 'fail'
```

Trend over time: if fail_count is increasing week over week,
system health is degrading and requires architectural attention.

---

*Document owner: PK*
*Review cycle: Add new invariants whenever new pipeline stages are added*
*Last updated: April 2026*
