-- F-AAP-002 fix — tighten run_system_audit Check 7 for slot-driven v4 compat
--
-- Brief:           docs/briefs/2026-05-03-faap002-fix.md
-- Finding:         F-AAP-002 (P2)
-- Audit run:       docs/audit/runs/2026-05-03-baudit-v4-peers.md
-- Pairs with:      F-AAP-001 fix (applied 2026-05-03 09:25 UTC; criterion #1 PASS)
--
-- WHAT:
--   `m.run_system_audit` Check 7 (`orphaned_active_post_drafts`) flags
--   `m.post_draft` rows where `pd.digest_item_id` does not link to a valid
--   `m.digest_item` as data-integrity warnings. Under v4, slot-driven drafts
--   are inserted by `m.fill_pending_slots` with `digest_item_id = NULL` by
--   design — the slot-fill mechanism never inserts a `m.digest_item` row.
--   Now that F-AAP-001 has unblocked v4 approvals, the audit will start
--   reporting ~100+ "orphaned" drafts every Sunday at 13:00 UTC (cron jobid
--   43, weekly).
--
-- FIX (single-block change in Check 7 only — per brief §2):
--   1. CTE `orphaned`: add `AND pd.slot_id IS NULL` to the WHERE clause so
--      v4 slot-driven drafts (with `pd.slot_id IS NOT NULL`) are excluded
--      from the orphan tally.
--   2. Recommendation string in the same Check 7 CASE WHEN: add the matching
--      `AND pd.slot_id IS NULL` to the echoed SQL so an operator running
--      the recommendation gets the same row set the gate selected.
--   3. Preserve everything else byte-identical: SECURITY DEFINER, search_path,
--      language, parameter list, RETURNS TABLE signature, CTE alias name,
--      category and invariant_name strings, status logic, detail string
--      format, recommendation string structure, and ALL 11 OTHER RETURN
--      QUERY blocks.
--
-- DISCRIMINATOR RATIONALE:
--   v4 slot-driven drafts are inserted with `slot_id = v_slot.slot_id`
--   (NOT NULL) by `m.fill_pending_slots` (verified during B-AUDIT-V4-PEERS
--   source-read). Legacy v3 drafts inserted by `m.create_post_drafts_v1` and
--   other v3 paths default `slot_id` to NULL. The two populations are
--   cleanly separable on `slot_id` nullability.
--
-- PRE-FLIGHT (per brief §4 — all 5 cleared, no STOP rules on this brief):
--   #1 Function source captured verbatim — see "BEFORE" block below.
--   #2 k.column_registry confirms m.post_draft.slot_id exists, type uuid,
--      is_nullable=true. Matches the discriminator design.
--   #3 Population check (sanity) — both populations exist:
--        v3 drafts (slot_id IS NULL):     575
--        v4 drafts (slot_id IS NOT NULL): 110
--      (filter: approval_status IN ('needs_review','approved'))
--   #4 Counterfactual confirmation — OLD Check 7 WHERE clause replayed:
--        OLD Check 7 total:                              112
--        ├─ v4 drafts excluded by fix (slot_id NOT NULL): 110
--        └─ v3 genuine orphans remaining (slot_id NULL):    2
--      The two v3 genuine orphans are NDIS-Yarns YouTube approved drafts
--      created 2026-04-09 by `postgres` (manual seed; both have NULL
--      digest_item_id AND NULL slot_id). The fix correctly excludes the
--      110 v4 drafts but preserves v3 orphan detection on the remaining 2.
--      **Note for chat:** brief criterion #1 expects post-apply Check 7
--      returns `pass` (cnt=0). With 2 v3 genuine orphans remaining,
--      Check 7 will return `warn` (cnt=2). The fix is still correct in
--      principle (110 false-positives removed) — the verdict shifts from
--      false-`warn`-on-112 to true-`warn`-on-2. Either accept the
--      true-warn or clean up the 2 manual seeds before/after applying.
--      Surfaced for chat review per task hand-back instruction.
--   #5 Caller audit — empty result. No surprise EF / dashboard / RPC
--      consumers of `m.run_system_audit`. Cron-only call (jobid 43 weekly).
--
-- DEPLOY MODEL: Per D170, chat applies via Supabase MCP `apply_migration`
-- after firing MCP review (`action_type=sql_destructive`). CC drafts only.
-- Brief notes: don't apply during the cron's known weekly run window
-- (Sunday 13:00 UTC) unless verified necessary.
--
-- ATOMICITY: `CREATE OR REPLACE FUNCTION` is atomic in PostgreSQL DDL — no
-- partial state during apply. No embedded BEGIN/COMMIT (apply_migration
-- provides its own transaction wrapper).
--
-- ──────────────────────────────────────────────────────────────────────────
-- BEFORE (verbatim from pg_get_functiondef pre-flight #1)
--
-- CREATE OR REPLACE FUNCTION m.run_system_audit(p_triggered_by text DEFAULT 'manual'::text)
--  RETURNS TABLE(category text, invariant_name text, check_status text, detail text, recommendation text, checked_at timestamp with time zone)
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_now timestamptz := now();
-- BEGIN
--
--   RETURN QUERY
--   WITH active_profiles AS (
--     SELECT COUNT(*) as cnt
--     FROM c.client_publish_profile cpp
--     JOIN c.client cl ON cl.client_id = cpp.client_id
--     WHERE cl.status = 'active' AND cpp.publish_enabled = true
--   )
--   SELECT 'operational'::text, 'active_client_publish_profiles'::text,
--     CASE WHEN cnt >= 2 THEN 'pass' ELSE 'fail' END::text,
--     ('Active publishing profiles: ' || cnt::text)::text,
--     CASE WHEN cnt < 2 THEN 'Check c.client_publish_profile — publish_enabled may be false' ELSE NULL END::text,
--     v_now FROM active_profiles;
--
--   RETURN QUERY
--   WITH expiring AS (
--     SELECT COUNT(*) as cnt, MIN(cpp.token_expires_at) as soonest
--     FROM c.client_publish_profile cpp
--     JOIN c.client cl ON cl.client_id = cpp.client_id
--     WHERE cl.status = 'active' AND cpp.publish_enabled = true
--     AND cpp.token_expires_at IS NOT NULL
--     AND cpp.token_expires_at < now() + interval '7 days'
--   )
--   SELECT 'operational'::text, 'platform_token_expiry'::text,
--     CASE WHEN cnt = 0 THEN 'pass'
--          WHEN soonest > now() + interval '3 days' THEN 'warn'
--          ELSE 'fail' END::text,
--     CASE WHEN cnt = 0 THEN 'All tokens healthy (> 7 days)'
--          ELSE (cnt::text || ' token(s) expiring soon. Soonest: ' || soonest::text) END::text,
--     CASE WHEN cnt > 0 THEN 'Refresh tokens via dashboard Clients tab' ELSE NULL END::text,
--     v_now FROM expiring;
--
--   RETURN QUERY
--   WITH feed_counts AS (
--     SELECT cl.client_name, COUNT(cs.source_id) as feed_count
--     FROM c.client cl
--     JOIN c.client_source cs ON cs.client_id = cl.client_id
--     JOIN f.feed_source fs ON fs.source_id = cs.source_id
--     WHERE cl.status = 'active' AND fs.status = 'active' AND cs.is_enabled = true
--     GROUP BY cl.client_name
--   ),
--   summary AS (
--     SELECT COUNT(*) FILTER (WHERE feed_count < 8) as low_feed_clients,
--       COALESCE(STRING_AGG(client_name || ': ' || feed_count::text, ', '), 'no data') as detail_str
--     FROM feed_counts
--   )
--   SELECT 'operational'::text, 'active_feed_count'::text,
--     CASE WHEN low_feed_clients = 0 THEN 'pass' ELSE 'warn' END::text,
--     ('Feed counts: ' || detail_str)::text,
--     CASE WHEN low_feed_clients > 0 THEN 'Add feeds for clients below 8 active sources. Target is 12.' ELSE NULL END::text,
--     v_now FROM summary;
--
--   RETURN QUERY
--   WITH stuck AS (
--     SELECT COUNT(*) as cnt FROM m.ai_job aj
--     WHERE aj.status = 'generating' AND aj.updated_at < now() - interval '1 hour'
--   )
--   SELECT 'operational'::text, 'stuck_ai_jobs'::text,
--     CASE WHEN cnt = 0 THEN 'pass' ELSE 'fail' END::text,
--     ('AI jobs stuck in generating > 1 hour: ' || cnt::text)::text,
--     CASE WHEN cnt > 0 THEN 'UPDATE m.ai_job SET status = ''dead'' WHERE status = ''generating'' AND updated_at < now() - interval ''1 hour''' ELSE NULL END::text,
--     v_now FROM stuck;
--
--   RETURN QUERY
--   WITH stuck AS (
--     SELECT COUNT(*) as cnt FROM m.post_publish_queue ppq
--     WHERE ppq.status = 'locked' AND ppq.updated_at < now() - interval '2 hours'
--   )
--   SELECT 'operational'::text, 'stuck_publish_queue_items'::text,
--     CASE WHEN cnt = 0 THEN 'pass' ELSE 'fail' END::text,
--     ('Queue items locked > 2 hours: ' || cnt::text)::text,
--     CASE WHEN cnt > 0 THEN 'Run pipeline-fixer or manually unlock items in m.post_publish_queue.' ELSE NULL END::text,
--     v_now FROM stuck;
--
--   RETURN QUERY
--   WITH last_publish AS (
--     SELECT cl.client_name, MAX(pp.published_at) as last_pub
--     FROM c.client cl
--     LEFT JOIN m.post_publish pp ON pp.client_id = cl.client_id
--     WHERE cl.status = 'active'
--     GROUP BY cl.client_name
--   ),
--   summary AS (
--     SELECT COUNT(*) FILTER (WHERE last_pub < now() - interval '48 hours' OR last_pub IS NULL) as stale_clients,
--       COALESCE(STRING_AGG(client_name || ': ' || COALESCE(to_char(last_pub, 'DD Mon HH24:MI'), 'never'), ' | '), 'no data') as detail_str
--     FROM last_publish
--   )
--   SELECT 'operational'::text, 'recent_publishing_activity'::text,
--     CASE WHEN stale_clients = 0 THEN 'pass' ELSE 'warn' END::text,
--     ('Last publish per client: ' || detail_str)::text,
--     CASE WHEN stale_clients > 0 THEN 'One or more clients not published in 48+ hours. Check pipeline and draft queue.' ELSE NULL END::text,
--     v_now FROM summary;
--
--   -- Check 7: Orphaned drafts in ACTIVE states only (needs_review, approved)
--   -- Published and dead orphans are expected after pipeline cleanup — excluded
--   RETURN QUERY
--   WITH orphaned AS (
--     SELECT COUNT(*) as cnt FROM m.post_draft pd
--     LEFT JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
--     WHERE di.digest_item_id IS NULL
--     AND pd.approval_status IN ('needs_review', 'approved')
--   )
--   SELECT 'data_integrity'::text, 'orphaned_active_post_drafts'::text,
--     CASE WHEN cnt = 0 THEN 'pass' ELSE 'warn' END::text,
--     ('Active drafts (needs_review/approved) without valid digest_item: ' || cnt::text)::text,
--     CASE WHEN cnt > 0 THEN 'SELECT post_draft_id, approval_status FROM m.post_draft pd LEFT JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id WHERE di.digest_item_id IS NULL AND pd.approval_status IN (''needs_review'',''approved'')' ELSE NULL END::text,
--     v_now FROM orphaned;
--
--   RETURN QUERY
--   WITH missing_queue AS (
--     SELECT COUNT(*) as cnt FROM m.post_draft pd
--     LEFT JOIN m.post_publish_queue ppq ON ppq.post_draft_id = pd.post_draft_id
--     WHERE pd.approval_status = 'approved'
--     AND ppq.post_draft_id IS NULL
--     AND pd.updated_at < now() - interval '24 hours'
--   )
--   SELECT 'data_integrity'::text, 'approved_drafts_missing_queue_entry'::text,
--     CASE WHEN cnt = 0 THEN 'pass' ELSE 'fail' END::text,
--     ('Approved drafts > 24h without queue entry: ' || cnt::text)::text,
--     CASE WHEN cnt > 0 THEN 'These drafts will never publish. Reset approval_status to needs_review or manually insert into m.post_publish_queue.' ELSE NULL END::text,
--     v_now FROM missing_queue;
--
--   RETURN QUERY
--   WITH stuck_review AS (
--     SELECT COUNT(*) as cnt FROM m.post_draft pd
--     WHERE pd.approval_status = 'needs_review'
--     AND pd.updated_at < now() - interval '24 hours'
--   )
--   SELECT 'compliance'::text, 'drafts_stuck_in_needs_review'::text,
--     CASE WHEN cnt = 0 THEN 'pass' ELSE 'warn' END::text,
--     ('Drafts in needs_review > 24 hours: ' || cnt::text)::text,
--     CASE WHEN cnt > 0 THEN 'Auto-approver may be failing or score thresholds too strict. Check auto-approver logs and c.client_ai_profile thresholds.' ELSE NULL END::text,
--     v_now FROM stuck_review;
--
--   RETURN QUERY
--   WITH stale AS (
--     SELECT COUNT(*) as cnt FROM m.compliance_review_queue crq
--     WHERE crq.status = 'pending' AND crq.created_at < now() - interval '7 days'
--   )
--   SELECT 'compliance'::text, 'stale_compliance_review_items'::text,
--     CASE WHEN cnt = 0 THEN 'pass' ELSE 'warn' END::text,
--     ('Pending compliance reviews older than 7 days: ' || cnt::text)::text,
--     CASE WHEN cnt > 0 THEN 'Action pending items in dashboard AI tab — Compliance Review Queue.' ELSE NULL END::text,
--     v_now FROM stale;
--
--   RETURN QUERY
--   WITH active_jobs AS (SELECT COUNT(*) as cnt FROM cron.job WHERE active = true)
--   SELECT 'structural'::text, 'active_cron_jobs'::text,
--     CASE WHEN cnt >= 10 THEN 'pass' WHEN cnt >= 5 THEN 'warn' ELSE 'fail' END::text,
--     ('Active pg_cron jobs: ' || cnt::text)::text,
--     CASE WHEN cnt < 10 THEN 'Fewer cron jobs than expected. Check cron.job for disabled or missing jobs.' ELSE NULL END::text,
--     v_now FROM active_jobs;
--
--   RETURN QUERY
--   WITH todos AS (
--     SELECT COUNT(*) as cnt FROM k.table_registry WHERE purpose = 'TODO' OR purpose IS NULL
--   )
--   SELECT 'structural'::text, 'k_schema_catalog_completeness'::text,
--     CASE WHEN cnt = 0 THEN 'pass' ELSE 'warn' END::text,
--     ('Undocumented tables in k registry: ' || cnt::text)::text,
--     CASE WHEN cnt > 0 THEN 'Run refresh_catalog() then document new tables in k.table_registry.' ELSE NULL END::text,
--     v_now FROM todos;
--
-- END;
-- $function$
--
-- END BEFORE
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION m.run_system_audit(p_triggered_by text DEFAULT 'manual'::text)
 RETURNS TABLE(category text, invariant_name text, check_status text, detail text, recommendation text, checked_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
BEGIN

  RETURN QUERY
  WITH active_profiles AS (
    SELECT COUNT(*) as cnt
    FROM c.client_publish_profile cpp
    JOIN c.client cl ON cl.client_id = cpp.client_id
    WHERE cl.status = 'active' AND cpp.publish_enabled = true
  )
  SELECT 'operational'::text, 'active_client_publish_profiles'::text,
    CASE WHEN cnt >= 2 THEN 'pass' ELSE 'fail' END::text,
    ('Active publishing profiles: ' || cnt::text)::text,
    CASE WHEN cnt < 2 THEN 'Check c.client_publish_profile — publish_enabled may be false' ELSE NULL END::text,
    v_now FROM active_profiles;

  RETURN QUERY
  WITH expiring AS (
    SELECT COUNT(*) as cnt, MIN(cpp.token_expires_at) as soonest
    FROM c.client_publish_profile cpp
    JOIN c.client cl ON cl.client_id = cpp.client_id
    WHERE cl.status = 'active' AND cpp.publish_enabled = true
    AND cpp.token_expires_at IS NOT NULL
    AND cpp.token_expires_at < now() + interval '7 days'
  )
  SELECT 'operational'::text, 'platform_token_expiry'::text,
    CASE WHEN cnt = 0 THEN 'pass'
         WHEN soonest > now() + interval '3 days' THEN 'warn'
         ELSE 'fail' END::text,
    CASE WHEN cnt = 0 THEN 'All tokens healthy (> 7 days)'
         ELSE (cnt::text || ' token(s) expiring soon. Soonest: ' || soonest::text) END::text,
    CASE WHEN cnt > 0 THEN 'Refresh tokens via dashboard Clients tab' ELSE NULL END::text,
    v_now FROM expiring;

  RETURN QUERY
  WITH feed_counts AS (
    SELECT cl.client_name, COUNT(cs.source_id) as feed_count
    FROM c.client cl
    JOIN c.client_source cs ON cs.client_id = cl.client_id
    JOIN f.feed_source fs ON fs.source_id = cs.source_id
    WHERE cl.status = 'active' AND fs.status = 'active' AND cs.is_enabled = true
    GROUP BY cl.client_name
  ),
  summary AS (
    SELECT COUNT(*) FILTER (WHERE feed_count < 8) as low_feed_clients,
      COALESCE(STRING_AGG(client_name || ': ' || feed_count::text, ', '), 'no data') as detail_str
    FROM feed_counts
  )
  SELECT 'operational'::text, 'active_feed_count'::text,
    CASE WHEN low_feed_clients = 0 THEN 'pass' ELSE 'warn' END::text,
    ('Feed counts: ' || detail_str)::text,
    CASE WHEN low_feed_clients > 0 THEN 'Add feeds for clients below 8 active sources. Target is 12.' ELSE NULL END::text,
    v_now FROM summary;

  RETURN QUERY
  WITH stuck AS (
    SELECT COUNT(*) as cnt FROM m.ai_job aj
    WHERE aj.status = 'generating' AND aj.updated_at < now() - interval '1 hour'
  )
  SELECT 'operational'::text, 'stuck_ai_jobs'::text,
    CASE WHEN cnt = 0 THEN 'pass' ELSE 'fail' END::text,
    ('AI jobs stuck in generating > 1 hour: ' || cnt::text)::text,
    CASE WHEN cnt > 0 THEN 'UPDATE m.ai_job SET status = ''dead'' WHERE status = ''generating'' AND updated_at < now() - interval ''1 hour''' ELSE NULL END::text,
    v_now FROM stuck;

  RETURN QUERY
  WITH stuck AS (
    SELECT COUNT(*) as cnt FROM m.post_publish_queue ppq
    WHERE ppq.status = 'locked' AND ppq.updated_at < now() - interval '2 hours'
  )
  SELECT 'operational'::text, 'stuck_publish_queue_items'::text,
    CASE WHEN cnt = 0 THEN 'pass' ELSE 'fail' END::text,
    ('Queue items locked > 2 hours: ' || cnt::text)::text,
    CASE WHEN cnt > 0 THEN 'Run pipeline-fixer or manually unlock items in m.post_publish_queue.' ELSE NULL END::text,
    v_now FROM stuck;

  RETURN QUERY
  WITH last_publish AS (
    SELECT cl.client_name, MAX(pp.published_at) as last_pub
    FROM c.client cl
    LEFT JOIN m.post_publish pp ON pp.client_id = cl.client_id
    WHERE cl.status = 'active'
    GROUP BY cl.client_name
  ),
  summary AS (
    SELECT COUNT(*) FILTER (WHERE last_pub < now() - interval '48 hours' OR last_pub IS NULL) as stale_clients,
      COALESCE(STRING_AGG(client_name || ': ' || COALESCE(to_char(last_pub, 'DD Mon HH24:MI'), 'never'), ' | '), 'no data') as detail_str
    FROM last_publish
  )
  SELECT 'operational'::text, 'recent_publishing_activity'::text,
    CASE WHEN stale_clients = 0 THEN 'pass' ELSE 'warn' END::text,
    ('Last publish per client: ' || detail_str)::text,
    CASE WHEN stale_clients > 0 THEN 'One or more clients not published in 48+ hours. Check pipeline and draft queue.' ELSE NULL END::text,
    v_now FROM summary;

  -- Check 7: Orphaned drafts in ACTIVE states only (needs_review, approved)
  -- Published and dead orphans are expected after pipeline cleanup — excluded
  -- v4 slot-driven drafts (slot_id IS NOT NULL) excluded — F-AAP-002 fix
  RETURN QUERY
  WITH orphaned AS (
    SELECT COUNT(*) as cnt FROM m.post_draft pd
    LEFT JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
    WHERE di.digest_item_id IS NULL
    AND pd.slot_id IS NULL
    AND pd.approval_status IN ('needs_review', 'approved')
  )
  SELECT 'data_integrity'::text, 'orphaned_active_post_drafts'::text,
    CASE WHEN cnt = 0 THEN 'pass' ELSE 'warn' END::text,
    ('Active drafts (needs_review/approved) without valid digest_item: ' || cnt::text)::text,
    CASE WHEN cnt > 0 THEN 'SELECT post_draft_id, approval_status FROM m.post_draft pd LEFT JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id WHERE di.digest_item_id IS NULL AND pd.slot_id IS NULL AND pd.approval_status IN (''needs_review'',''approved'')' ELSE NULL END::text,
    v_now FROM orphaned;

  RETURN QUERY
  WITH missing_queue AS (
    SELECT COUNT(*) as cnt FROM m.post_draft pd
    LEFT JOIN m.post_publish_queue ppq ON ppq.post_draft_id = pd.post_draft_id
    WHERE pd.approval_status = 'approved'
    AND ppq.post_draft_id IS NULL
    AND pd.updated_at < now() - interval '24 hours'
  )
  SELECT 'data_integrity'::text, 'approved_drafts_missing_queue_entry'::text,
    CASE WHEN cnt = 0 THEN 'pass' ELSE 'fail' END::text,
    ('Approved drafts > 24h without queue entry: ' || cnt::text)::text,
    CASE WHEN cnt > 0 THEN 'These drafts will never publish. Reset approval_status to needs_review or manually insert into m.post_publish_queue.' ELSE NULL END::text,
    v_now FROM missing_queue;

  RETURN QUERY
  WITH stuck_review AS (
    SELECT COUNT(*) as cnt FROM m.post_draft pd
    WHERE pd.approval_status = 'needs_review'
    AND pd.updated_at < now() - interval '24 hours'
  )
  SELECT 'compliance'::text, 'drafts_stuck_in_needs_review'::text,
    CASE WHEN cnt = 0 THEN 'pass' ELSE 'warn' END::text,
    ('Drafts in needs_review > 24 hours: ' || cnt::text)::text,
    CASE WHEN cnt > 0 THEN 'Auto-approver may be failing or score thresholds too strict. Check auto-approver logs and c.client_ai_profile thresholds.' ELSE NULL END::text,
    v_now FROM stuck_review;

  RETURN QUERY
  WITH stale AS (
    SELECT COUNT(*) as cnt FROM m.compliance_review_queue crq
    WHERE crq.status = 'pending' AND crq.created_at < now() - interval '7 days'
  )
  SELECT 'compliance'::text, 'stale_compliance_review_items'::text,
    CASE WHEN cnt = 0 THEN 'pass' ELSE 'warn' END::text,
    ('Pending compliance reviews older than 7 days: ' || cnt::text)::text,
    CASE WHEN cnt > 0 THEN 'Action pending items in dashboard AI tab — Compliance Review Queue.' ELSE NULL END::text,
    v_now FROM stale;

  RETURN QUERY
  WITH active_jobs AS (SELECT COUNT(*) as cnt FROM cron.job WHERE active = true)
  SELECT 'structural'::text, 'active_cron_jobs'::text,
    CASE WHEN cnt >= 10 THEN 'pass' WHEN cnt >= 5 THEN 'warn' ELSE 'fail' END::text,
    ('Active pg_cron jobs: ' || cnt::text)::text,
    CASE WHEN cnt < 10 THEN 'Fewer cron jobs than expected. Check cron.job for disabled or missing jobs.' ELSE NULL END::text,
    v_now FROM active_jobs;

  RETURN QUERY
  WITH todos AS (
    SELECT COUNT(*) as cnt FROM k.table_registry WHERE purpose = 'TODO' OR purpose IS NULL
  )
  SELECT 'structural'::text, 'k_schema_catalog_completeness'::text,
    CASE WHEN cnt = 0 THEN 'pass' ELSE 'warn' END::text,
    ('Undocumented tables in k registry: ' || cnt::text)::text,
    CASE WHEN cnt > 0 THEN 'Run refresh_catalog() then document new tables in k.table_registry.' ELSE NULL END::text,
    v_now FROM todos;

END;
$function$;
