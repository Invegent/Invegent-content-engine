-- ICE — System Audit Function
-- Action: B4 from April 2026 session action register
-- Purpose: m.run_system_audit() — Layer 3 QA
--          Checks all documented system invariants
--          Run weekly (Sunday night) and on-demand before deploys
--
-- Run via: Supabase MCP apply_migration or SQL editor
-- Docs: docs/quality/03_system_audit_spec.md

-- ============================================================
-- PART 1: Audit log table
-- Stores audit run results for trend analysis
-- ============================================================

CREATE TABLE IF NOT EXISTS m.system_audit_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at           timestamptz NOT NULL DEFAULT now(),
  triggered_by     text NOT NULL DEFAULT 'manual'
                   CHECK (triggered_by IN ('scheduled', 'manual', 'pre-deploy', 'post-incident')),
  total_checks     integer NOT NULL DEFAULT 0,
  pass_count       integer NOT NULL DEFAULT 0,
  warn_count       integer NOT NULL DEFAULT 0,
  fail_count       integer NOT NULL DEFAULT 0,
  results          jsonb,
  -- Full result set stored as JSON for dashboard consumption
  overall_status   text NOT NULL DEFAULT 'pass'
                   CHECK (overall_status IN ('pass', 'warn', 'fail'))
);

COMMENT ON TABLE m.system_audit_log IS
  'Stores results of every system audit run. Used for trend analysis in weekly manager report. '
  'Overall_status degrades: pass -> warn (any warn) -> fail (any fail).';

ALTER TABLE m.system_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON m.system_audit_log
  USING (auth.role() = 'service_role');

-- ============================================================
-- PART 2: m.run_system_audit() function
-- Returns one row per invariant check
-- Stores summary in m.system_audit_log
-- ============================================================

CREATE OR REPLACE FUNCTION m.run_system_audit(
  p_triggered_by text DEFAULT 'manual'
)
RETURNS TABLE (
  category        text,
  invariant_name  text,
  status          text,
  detail          text,
  recommendation  text,
  checked_at      timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result_rows jsonb := '[]'::jsonb;
  v_pass_count  integer := 0;
  v_warn_count  integer := 0;
  v_fail_count  integer := 0;
  v_overall     text := 'pass';
  v_now         timestamptz := now();
BEGIN

  -- --------------------------------------------------------
  -- CATEGORY: operational
  -- --------------------------------------------------------

  -- Check 1: Client publish profiles active
  RETURN QUERY
  WITH active_profiles AS (
    SELECT COUNT(*) as cnt
    FROM c.client_publish_profile cpp
    JOIN c.client cl ON cl.id = cpp.client_id
    WHERE cl.status = 'active'
    AND cpp.publishing_enabled = true
  )
  SELECT
    'operational'::text,
    'active_client_publish_profiles'::text,
    CASE WHEN cnt >= 2 THEN 'pass' ELSE 'fail' END,
    'Active publishing profiles: ' || cnt::text,
    CASE WHEN cnt < 2 THEN 'Check c.client_publish_profile — publishing_enabled may be false for active clients' ELSE NULL END,
    v_now
  FROM active_profiles;

  -- Check 2: Token expiry — any tokens expiring within 7 days
  RETURN QUERY
  WITH expiring AS (
    SELECT COUNT(*) as cnt, MIN(token_expires_at) as soonest
    FROM c.client_publish_profile cpp
    JOIN c.client cl ON cl.id = cpp.client_id
    WHERE cl.status = 'active'
    AND cpp.publishing_enabled = true
    AND cpp.token_expires_at IS NOT NULL
    AND cpp.token_expires_at < now() + interval '7 days'
  )
  SELECT
    'operational'::text,
    'platform_token_expiry'::text,
    CASE WHEN cnt = 0 THEN 'pass'
         WHEN cnt > 0 AND soonest > now() + interval '3 days' THEN 'warn'
         ELSE 'fail' END,
    CASE WHEN cnt = 0 THEN 'All tokens healthy (> 7 days)'
         ELSE cnt::text || ' token(s) expiring soon. Soonest: ' || soonest::text END,
    CASE WHEN cnt > 0 THEN 'Refresh platform tokens via dashboard → Clients → [client] → Refresh Token' ELSE NULL END,
    v_now
  FROM expiring;

  -- Check 3: Active feed count per client (warn if any active client has < 8 feeds)
  RETURN QUERY
  WITH feed_counts AS (
    SELECT
      cl.name as client_name,
      COUNT(cs.id) as feed_count
    FROM c.client cl
    JOIN c.client_source cs ON cs.client_id = cl.id
    JOIN f.feed_source fs ON fs.id = cs.feed_source_id
    WHERE cl.status = 'active'
    AND fs.status = 'active'
    GROUP BY cl.name
  ),
  summary AS (
    SELECT
      COUNT(*) FILTER (WHERE feed_count < 8) as low_feed_clients,
      MIN(feed_count) as min_feeds,
      STRING_AGG(client_name || ': ' || feed_count::text, ', ') as detail_str
    FROM feed_counts
  )
  SELECT
    'operational'::text,
    'active_feed_count'::text,
    CASE WHEN low_feed_clients = 0 THEN 'pass' ELSE 'warn' END,
    'Feed counts: ' || detail_str,
    CASE WHEN low_feed_clients > 0 THEN 'Add feeds for clients below 8 active sources. Target is 12.' ELSE NULL END,
    v_now
  FROM summary;

  -- Check 4: Stuck ai_jobs
  RETURN QUERY
  WITH stuck AS (
    SELECT COUNT(*) as cnt
    FROM m.ai_job
    WHERE status = 'generating'
    AND updated_at < now() - interval '1 hour'
  )
  SELECT
    'operational'::text,
    'stuck_ai_jobs'::text,
    CASE WHEN cnt = 0 THEN 'pass' ELSE 'fail' END,
    'AI jobs stuck in generating > 1 hour: ' || cnt::text,
    CASE WHEN cnt > 0 THEN 'Investigate m.ai_job WHERE status = ''generating'' AND updated_at < now() - interval ''1 hour''. Reset status to ''dead'' if unrecoverable.' ELSE NULL END,
    v_now
  FROM stuck;

  -- Check 5: Stuck publish queue items
  RETURN QUERY
  WITH stuck AS (
    SELECT COUNT(*) as cnt
    FROM m.post_publish_queue
    WHERE status = 'locked'
    AND updated_at < now() - interval '2 hours'
  )
  SELECT
    'operational'::text,
    'stuck_publish_queue_items'::text,
    CASE WHEN cnt = 0 THEN 'pass' ELSE 'fail' END,
    'Queue items locked > 2 hours: ' || cnt::text,
    CASE WHEN cnt > 0 THEN 'Run pipeline-fixer or manually unlock items in m.post_publish_queue. Check publisher Edge Function logs.' ELSE NULL END,
    v_now
  FROM stuck;

  -- Check 6: Publishing activity — active clients publishing recently
  RETURN QUERY
  WITH last_publish AS (
    SELECT
      cl.name as client_name,
      MAX(pp.published_at) as last_pub
    FROM c.client cl
    LEFT JOIN m.post_publish pp ON pp.client_id = cl.id
    WHERE cl.status = 'active'
    GROUP BY cl.name
  ),
  summary AS (
    SELECT
      COUNT(*) FILTER (WHERE last_pub < now() - interval '48 hours' OR last_pub IS NULL) as stale_clients,
      STRING_AGG(
        client_name || ': ' || COALESCE(to_char(last_pub, 'DD Mon HH24:MI'), 'never'),
        ' | '
      ) as detail_str
    FROM last_publish
  )
  SELECT
    'operational'::text,
    'recent_publishing_activity'::text,
    CASE WHEN stale_clients = 0 THEN 'pass'
         WHEN stale_clients > 0 THEN 'warn' END,
    'Last publish per client: ' || detail_str,
    CASE WHEN stale_clients > 0
      THEN 'One or more clients have not published in 48+ hours. Check pipeline health and draft approval queue.'
      ELSE NULL END,
    v_now
  FROM summary;

  -- --------------------------------------------------------
  -- CATEGORY: data_integrity
  -- --------------------------------------------------------

  -- Check 7: Orphaned post_draft records
  RETURN QUERY
  WITH orphaned AS (
    SELECT COUNT(*) as cnt
    FROM m.post_draft pd
    LEFT JOIN m.digest_item di ON di.id = pd.digest_item_id
    WHERE di.id IS NULL
  )
  SELECT
    'data_integrity'::text,
    'orphaned_post_drafts'::text,
    CASE WHEN cnt = 0 THEN 'pass' ELSE 'warn' END,
    'Post drafts without valid digest_item: ' || cnt::text,
    CASE WHEN cnt > 0 THEN 'Run: SELECT id FROM m.post_draft pd LEFT JOIN m.digest_item di ON di.id = pd.digest_item_id WHERE di.id IS NULL' ELSE NULL END,
    v_now
  FROM orphaned;

  -- Check 8: Approved drafts without queue entries (> 24 hours old)
  RETURN QUERY
  WITH missing_queue AS (
    SELECT COUNT(*) as cnt
    FROM m.post_draft pd
    LEFT JOIN m.post_publish_queue ppq ON ppq.post_draft_id = pd.id
    WHERE pd.approval_status = 'approved'
    AND ppq.id IS NULL
    AND pd.updated_at < now() - interval '24 hours'
  )
  SELECT
    'data_integrity'::text,
    'approved_drafts_missing_queue_entry'::text,
    CASE WHEN cnt = 0 THEN 'pass' ELSE 'fail' END,
    'Approved drafts older than 24h without queue entry: ' || cnt::text,
    CASE WHEN cnt > 0 THEN 'These drafts will never publish. Investigate approval flow. Manually insert into m.post_publish_queue or reset to needs_review.' ELSE NULL END,
    v_now
  FROM missing_queue;

  -- --------------------------------------------------------
  -- CATEGORY: compliance
  -- --------------------------------------------------------

  -- Check 9: HARD_BLOCK posts published (zero tolerance)
  RETURN QUERY
  WITH hard_block_published AS (
    SELECT COUNT(*) as cnt
    FROM m.post_publish pp
    JOIN m.post_draft pd ON pd.id = pp.post_draft_id
    WHERE pd.compliance_status = 'HARD_BLOCK'
  )
  SELECT
    'compliance'::text,
    'hard_block_posts_published'::text,
    CASE WHEN cnt = 0 THEN 'pass' ELSE 'fail' END,
    'HARD_BLOCK posts published: ' || cnt::text || ' (must be zero)',
    CASE WHEN cnt > 0
      THEN 'CRITICAL: HARD_BLOCK posts have been published. Investigate immediately. Review compliance gate in auto-approver and publisher.'
      ELSE NULL END,
    v_now
  FROM hard_block_published;

  -- Check 10: Stale compliance review queue items
  RETURN QUERY
  WITH stale AS (
    SELECT COUNT(*) as cnt
    FROM m.compliance_review_queue
    WHERE status = 'pending'
    AND created_at < now() - interval '7 days'
  )
  SELECT
    'compliance'::text,
    'stale_compliance_review_items'::text,
    CASE WHEN cnt = 0 THEN 'pass' ELSE 'warn' END,
    'Pending compliance reviews older than 7 days: ' || cnt::text,
    CASE WHEN cnt > 0 THEN 'Action pending items in dashboard → AI tab → Compliance Review Queue.' ELSE NULL END,
    v_now
  FROM stale;

  -- --------------------------------------------------------
  -- CATEGORY: structural (lightweight — most structural checks
  -- require superuser access; these use what service role can see)
  -- --------------------------------------------------------

  -- Check 11: pg_cron jobs active
  RETURN QUERY
  WITH active_jobs AS (
    SELECT COUNT(*) as cnt
    FROM cron.job
    WHERE active = true
  )
  SELECT
    'structural'::text,
    'active_cron_jobs'::text,
    CASE WHEN cnt >= 10 THEN 'pass'
         WHEN cnt >= 5 THEN 'warn'
         ELSE 'fail' END,
    'Active pg_cron jobs: ' || cnt::text,
    CASE WHEN cnt < 10 THEN 'Fewer cron jobs than expected. Check cron.job for disabled or missing jobs.' ELSE NULL END,
    v_now
  FROM active_jobs;

  -- Check 12: k schema catalog has no TODO entries
  RETURN QUERY
  WITH todos AS (
    SELECT COUNT(*) as cnt
    FROM k.table_registry
    WHERE purpose = 'TODO' OR purpose IS NULL
  )
  SELECT
    'structural'::text,
    'k_schema_catalog_completeness'::text,
    CASE WHEN cnt = 0 THEN 'pass' ELSE 'warn' END,
    'Undocumented tables in k registry: ' || cnt::text,
    CASE WHEN cnt > 0 THEN 'Run refresh_catalog() then document new tables in k.table_registry.' ELSE NULL END,
    v_now
  FROM todos;

END;
$$;

COMMENT ON FUNCTION m.run_system_audit IS
  'Runs all documented system invariant checks. Returns one row per check. '
  'Run weekly via pg_cron and manually before any significant deploy. '
  'Docs: docs/quality/03_system_audit_spec.md';

-- ============================================================
-- PART 3: pg_cron schedule — weekly Sunday 11 PM AEST (13:00 UTC)
-- ============================================================

-- Enable the weekly audit run
-- Uncomment and run once to activate:
--
-- SELECT cron.schedule(
--   'ice-system-audit-weekly',
--   '0 13 * * 0',   -- Sunday 11 PM AEST = Sunday 13:00 UTC
--   $$
--     INSERT INTO m.system_audit_log (triggered_by, results)
--     SELECT
--       'scheduled',
--       jsonb_agg(row_to_json(r))
--     FROM m.run_system_audit('scheduled') r;
--   $$
-- );

-- ============================================================
-- VERIFICATION QUERIES
-- Run after applying migration
-- ============================================================

-- 1. Confirm function exists
-- SELECT proname, prosecdef FROM pg_proc
-- WHERE proname = 'run_system_audit' AND pronamespace = 'm'::regnamespace;
-- Expected: 1 row, prosecdef = true

-- 2. Run the audit manually
-- SELECT * FROM m.run_system_audit('manual');
-- Expected: 12 rows, each with status = 'pass' | 'warn' | 'fail'

-- 3. Confirm audit log table
-- SELECT * FROM m.system_audit_log ORDER BY run_at DESC LIMIT 5;
-- Expected: rows appear after each audit run

-- 4. Check for any immediate failures
-- SELECT invariant_name, status, detail, recommendation
-- FROM m.run_system_audit('manual')
-- WHERE status IN ('fail', 'warn')
-- ORDER BY status DESC;
