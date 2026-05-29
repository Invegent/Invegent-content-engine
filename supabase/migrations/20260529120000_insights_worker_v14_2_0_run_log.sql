-- =====================================================================
-- insights-worker v14.2.0 — observability run-log table
-- STATUS: PROPOSED — NOT APPLIED.
--   Apply ONLY under a `sql_destructive` D-01 + PK exact approval phrase.
--   On a feature branch off origin/main 6d31950; not on main; not applied to
--   production (mbkmaxqhsohbtwsqolns).
-- Purpose: persist a durable per-client run summary so partial / timed-out
--   insights-worker runs are VISIBLE (net._http_response is pruned; cron only
--   records the net.http_post request id, not the worker's per-client outcome).
-- Privacy: NO token values, NO raw Graph payloads — counts + safe metadata only.
-- Additive + idempotent: CREATE ... IF NOT EXISTS; safe to re-run.
-- =====================================================================

CREATE TABLE IF NOT EXISTS m.insights_worker_run (
  run_id              uuid        NOT NULL,
  client_id           uuid        NOT NULL,
  worker_version      text        NOT NULL,
  invocation_mode     text        NOT NULL,            -- 'per_client' | 'all_client'
  destination_id      text,                            -- page_id (not sensitive)
  started_at          timestamptz NOT NULL,
  finished_at         timestamptz NOT NULL,
  duration_ms         integer,
  eligible_count      integer,                         -- capped-selection count (first pass)
  selected_count      integer,                         -- posts the SELECT returned (= processed)
  succeeded           integer,
  failed              integer,
  skipped_reason      text,                            -- 'no_token_available' | 'run_budget_exhausted' | NULL
  first_error_code    text,
  first_error_message text,                            -- redacted + capped (<=300 chars) by the worker
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insights_worker_run_pkey PRIMARY KEY (run_id, client_id)
);

CREATE INDEX IF NOT EXISTS insights_worker_run_client_created_idx
  ON m.insights_worker_run (client_id, created_at DESC);

COMMENT ON TABLE m.insights_worker_run IS
  'insights-worker v14.2.0 per-client run summary (observability). No tokens, no raw Graph payloads.';

-- Deny-by-default. service_role bypasses RLS (the worker writes as service_role);
-- anon/authenticated get nothing. Mirrors the repo''s deny-by-default convention.
ALTER TABLE m.insights_worker_run ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON m.insights_worker_run FROM anon, authenticated;
GRANT SELECT, INSERT ON m.insights_worker_run TO service_role;

-- =====================================================================
-- ROLLBACK (manual, gated):
--   DROP TABLE IF EXISTS m.insights_worker_run;   -- additive; no FK dependents
-- VERIFICATION (after apply, read-only):
--   SELECT to_regclass('m.insights_worker_run');  -- expect non-null
--   SELECT relrowsecurity FROM pg_class WHERE oid = 'm.insights_worker_run'::regclass; -- expect t
--   -- after first v14.2.0 run:
--   SELECT run_id, invocation_mode, client_id, selected_count, succeeded, failed, skipped_reason, duration_ms
--   FROM m.insights_worker_run ORDER BY created_at DESC LIMIT 10;
-- =====================================================================
