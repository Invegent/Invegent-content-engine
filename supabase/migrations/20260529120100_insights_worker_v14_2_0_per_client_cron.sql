-- =====================================================================
-- insights-worker v14.2.0 — per-client cron (replaces the single all-client job)
-- STATUS: PROPOSED — NOT APPLIED.
--   Apply ONLY under a `sql_destructive` D-01 + PK exact approval phrase, AND
--   ONLY AFTER insights-worker-v14.2.0 is deployed (ef_deploy D-01) — otherwise
--   the deployed v14.1.0 ignores the body selector and each per-client call would
--   process ALL clients (re-introducing the timeout). Order: deploy v14.2.0 first,
--   then apply this cron migration.
--   On a feature branch off origin/main 6d31950; not on main; not applied.
-- Rationale: the all-client daily job (jobid 59) processed FB clients sequentially
--   in one ~150s invocation and starved clients 3-4 (NY-FB, CFW-FB). Each per-client
--   call processes ONE profile (~70s) — comfortably under the Edge wall-clock — and
--   does not depend on unindexed DB row order.
-- No dispatcher in this pass (explicit per-client entries for the 4 known FB clients).
--
-- ----------------------------------------------------------------------
-- ORIGINAL JOB PRESERVED FOR ROLLBACK (verbatim, jobid 59):
--   jobname : 'insights-worker-daily'
--   schedule: '0 3 * * *'
--   command :
--     SELECT net.http_post(
--       url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
--             || '/functions/v1/insights-worker',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
--       ),
--       body := '{}'::jsonb,
--       timeout_milliseconds := 120000
--     );
-- ----------------------------------------------------------------------
-- =====================================================================

-- 1) Remove the all-client daily job (idempotent: ignore if already absent).
DO $$
BEGIN
  PERFORM cron.unschedule('insights-worker-daily');
EXCEPTION WHEN OTHERS THEN
  -- job not present (e.g. re-run) — nothing to unschedule
  NULL;
END $$;

-- 2) Explicit per-client jobs, staggered to avoid overlap. cron.schedule upserts
--    by jobname (pg_cron >= 1.4), so re-running this migration is idempotent.
--    F3: each body carries a client_publish_profile_id selector (guaranteed-unique
--    PK) so each invocation targets EXACTLY one profile; v14.2.0 processes only it.

-- NDIS-Yarns (NY-FB)
SELECT cron.schedule('insights-worker-ny-fb', '0 3 * * *', $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
          || '/functions/v1/insights-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('client_publish_profile_id', 'd469a8f3-775b-41e1-b6d8-77b6c8947f99'),
    timeout_milliseconds := 120000
  );
$job$);

-- Care For Welfare (CFW-FB)
SELECT cron.schedule('insights-worker-cfw-fb', '5 3 * * *', $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
          || '/functions/v1/insights-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('client_publish_profile_id', 'e15f5621-ca89-4ca2-b1a6-d6665b2a8b7a'),
    timeout_milliseconds := 120000
  );
$job$);

-- Property Pulse (PP-FB control)
SELECT cron.schedule('insights-worker-pp-fb', '10 3 * * *', $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
          || '/functions/v1/insights-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('client_publish_profile_id', '1a30dd24-8751-4eb1-b973-6b75086247cd'),
    timeout_milliseconds := 120000
  );
$job$);

-- Invegent (control)
SELECT cron.schedule('insights-worker-invegent-fb', '15 3 * * *', $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
          || '/functions/v1/insights-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('client_publish_profile_id', 'c83f6cc5-69a8-4c4b-a725-a721fdec87f7'),
    timeout_milliseconds := 120000
  );
$job$);

-- =====================================================================
-- ROLLBACK (manual, gated) — restore the single all-client job:
--   SELECT cron.unschedule('insights-worker-ny-fb');
--   SELECT cron.unschedule('insights-worker-cfw-fb');
--   SELECT cron.unschedule('insights-worker-pp-fb');
--   SELECT cron.unschedule('insights-worker-invegent-fb');
--   SELECT cron.schedule('insights-worker-daily', '0 3 * * *', $job$
--     SELECT net.http_post(
--       url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
--             || '/functions/v1/insights-worker',
--       headers := jsonb_build_object('Content-Type','application/json',
--         'Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
--       body := '{}'::jsonb,
--       timeout_milliseconds := 120000
--     );
--   $job$);
--
-- VERIFICATION (after apply, read-only):
--   SELECT jobid, jobname, schedule, active FROM cron.job
--   WHERE jobname LIKE 'insights-worker-%' ORDER BY jobname;          -- expect 4 jobs, no 'insights-worker-daily'
--   -- next morning (after the 03:00-03:15 UTC window):
--   SELECT j.jobname, d.status, d.start_time FROM cron.job_run_details d
--   JOIN cron.job j ON j.jobid=d.jobid
--   WHERE j.jobname LIKE 'insights-worker-%-fb' ORDER BY d.start_time DESC LIMIT 8;
-- =====================================================================
