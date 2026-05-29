-- =====================================================================
-- PROPOSED MIGRATION -- NOT APPLIED
-- prv_op_read_rpcs : public SECURITY DEFINER read-only RPCs over the
--                    existing cc-0012 op.* reconciliation views, for the
--                    production dashboard PRV port (transport option (i)).
--
-- STATUS:   PROPOSED. Do NOT apply until BOTH are true:
--             1. D-01 (sql_destructive) review complete (this lane), AND
--             2. PK gives the exact approval phrase:
--                  "PK APPROVES PRV READ-RPC MIGRATION APPLY"
-- AUTHOR:   CCH 2026-05-29
-- DECISION: D-FR-RECON-001 ; PK transport confirmation 2026-05-29 (option (i))
-- D-01:     103f5a6c (sql_destructive, partial/type-c) -> corrected_action
--           ("verify view column signatures immediately prior to apply") is
--           now satisfied AUTOMATICALLY by the in-migration pre-flight guard
--           below, which aborts the whole migration on any op.* contract drift.
-- SCOPE:    1 pre-flight guard + 3 CREATE OR REPLACE FUNCTION + grants.
--           NO tables, NO views, NO change to op.* . SELECT-only wrappers.
--           Contracts mirror the exact localhost /recon projections (column
--           subset + casts + ORDER BY + LIMIT) so the ported dashboard
--           component is parity-preserving with no row-type change.
--
-- PRE-FLIGHT (event-trigger survey verified read-only 2026-05-29):
--   * CREATE FUNCTION fires only extensions.issue_pg_graphql_access (benign
--     grant) and extensions.pgrst_ddl_watch (PostgREST cache reload ->
--     auto-exposes the new public RPCs; no manual NOTIFY pgrst needed).
--   * The k.* registry/catalog triggers (trg_k_refresh_catalog,
--     trg_k_registry_sync_on_create_table) are TABLE/VIEW-scoped only and do
--     NOT fire for a function-only migration. No k.* registry mutation.
--   * No public.prv_get_* name collision (only unrelated write_ef_drift_log).
--   * Column-signature drift is self-checked by the DO block below.
--
-- POST-APPLY VERIFICATION (run as SEPARATE single statements):
--   SELECT proname, prosecdef, provolatile FROM pg_proc
--     WHERE pronamespace='public'::regnamespace AND proname LIKE 'prv_get_%';
--     -- expect 3 rows; prosecdef = t ; provolatile = s
--   SELECT has_function_privilege('service_role','public.prv_get_reconciliation_summary()','EXECUTE'); -- true
--   SELECT has_function_privilege('anon','public.prv_get_reconciliation_summary()','EXECUTE');          -- false
--   SELECT has_function_privilege('authenticated','public.prv_get_reconciliation_summary()','EXECUTE'); -- false
--   SELECT count(*) FROM public.prv_get_freshness_rollup(); -- parity vs localhost /recon (same DB, same moment)
-- =====================================================================

-- --- Self-aborting pre-flight: abort the whole migration if any op.* view
-- --- column the RPCs depend on is missing or its type has changed since
-- --- the 2026-05-29 read. (No partial apply: a RAISE rolls back everything.)
DO $$
DECLARE
  drift text;
BEGIN
  SELECT string_agg(format('op.%s.%s (expected udt %s)', req.v, req.c, req.t), '; ' ORDER BY req.v, req.c)
  INTO drift
  FROM (VALUES
    ('v_reconciliation_summary','as_of_at','timestamptz'),
    ('v_reconciliation_summary','window_start','date'),
    ('v_reconciliation_summary','window_end','date'),
    ('v_reconciliation_summary','total_expected_7d','int8'),
    ('v_reconciliation_summary','total_matched_7d','int8'),
    ('v_reconciliation_summary','total_late_7d','int8'),
    ('v_reconciliation_summary','total_suppressed_7d','int8'),
    ('v_reconciliation_summary','total_cancelled_7d','int8'),
    ('v_reconciliation_summary','on_time_rate_7d','numeric'),
    ('v_reconciliation_summary','late_rate_7d','numeric'),
    ('v_reconciliation_summary','drift_info_count_7d','int8'),
    ('v_reconciliation_summary','drift_warn_count_7d','int8'),
    ('v_reconciliation_summary','drift_critical_count_7d','int8'),
    ('v_reconciliation_summary','observer_stale_client_platform_count','int8'),
    ('v_reconciliation_summary','attention_needed','bool'),
    ('v_freshness_rollup','client_slug','text'),
    ('v_freshness_rollup','client_id','uuid'),
    ('v_freshness_rollup','platform','text'),
    ('v_freshness_rollup','freshness_status','text'),
    ('v_freshness_rollup','last_evidence_at','timestamptz'),
    ('v_freshness_rollup','last_match_at','timestamptz'),
    ('v_freshness_rollup','evidence_count_7d','int8'),
    ('v_freshness_rollup','match_count_7d','int8'),
    ('v_freshness_rollup','drift_warn_critical_count_7d','int8'),
    ('v_freshness_rollup','minutes_since_last_evidence','int4'),
    ('v_freshness_rollup','observer_is_healthy','bool'),
    ('v_freshness_rollup','observer_consecutive_failure_count','int4'),
    ('v_freshness_rollup','attention_needed','bool'),
    ('v_freshness_rollup','as_of_at','timestamptz'),
    ('v_drift_rollup','created_at','timestamptz'),
    ('v_drift_rollup','client_slug','text'),
    ('v_drift_rollup','client_id','uuid'),
    ('v_drift_rollup','platform','text'),
    ('v_drift_rollup','drift_type','text'),
    ('v_drift_rollup','drift_severity','text'),
    ('v_drift_rollup','observation_window_start','date'),
    ('v_drift_rollup','observation_window_end','date'),
    ('v_drift_rollup','observed_count','int4'),
    ('v_drift_rollup','expected_count','int4'),
    ('v_drift_rollup','is_recent','bool'),
    ('v_drift_rollup','is_actionable','bool')
  ) AS req(v,c,t)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema = 'op'
      AND ic.table_name  = req.v
      AND ic.column_name = req.c
      AND ic.udt_name    = req.t
  );

  IF drift IS NOT NULL THEN
    RAISE EXCEPTION 'PRV pre-flight ABORT -- op.* view contract drift; missing/changed: %', drift;
  END IF;
END $$;

-- 1) Reconciliation summary (single-row 7d totals) -------------------
CREATE OR REPLACE FUNCTION public.prv_get_reconciliation_summary()
RETURNS TABLE (
  as_of_at                              text,
  window_start                          text,
  window_end                            text,
  total_expected_7d                     integer,
  total_matched_7d                      integer,
  total_late_7d                         integer,
  total_suppressed_7d                   integer,
  total_cancelled_7d                    integer,
  on_time_rate_7d                       double precision,
  late_rate_7d                          double precision,
  drift_info_count_7d                   integer,
  drift_warn_count_7d                   integer,
  drift_critical_count_7d               integer,
  observer_stale_client_platform_count  integer,
  attention_needed                      boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    v.as_of_at::text,
    v.window_start::text,
    v.window_end::text,
    v.total_expected_7d::int,
    v.total_matched_7d::int,
    v.total_late_7d::int,
    v.total_suppressed_7d::int,
    v.total_cancelled_7d::int,
    v.on_time_rate_7d::float8,
    v.late_rate_7d::float8,
    v.drift_info_count_7d::int,
    v.drift_warn_count_7d::int,
    v.drift_critical_count_7d::int,
    v.observer_stale_client_platform_count::int,
    v.attention_needed
  FROM op.v_reconciliation_summary v
$$;

-- 2) Per-account freshness rollup (client x platform) ----------------
CREATE OR REPLACE FUNCTION public.prv_get_freshness_rollup()
RETURNS TABLE (
  client_slug                         text,
  client_id                           text,
  platform                            text,
  freshness_status                    text,
  last_evidence_at                    text,
  last_match_at                       text,
  evidence_count_7d                   integer,
  match_count_7d                      integer,
  drift_warn_critical_count_7d        integer,
  minutes_since_last_evidence         integer,
  observer_is_healthy                 boolean,
  observer_consecutive_failure_count  integer,
  attention_needed                    boolean,
  as_of_at                            text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    v.client_slug,
    v.client_id::text,
    v.platform,
    v.freshness_status,
    v.last_evidence_at::text,
    v.last_match_at::text,
    v.evidence_count_7d::int,
    v.match_count_7d::int,
    v.drift_warn_critical_count_7d::int,
    v.minutes_since_last_evidence,
    v.observer_is_healthy,
    v.observer_consecutive_failure_count,
    v.attention_needed,
    v.as_of_at::text
  FROM op.v_freshness_rollup v
  ORDER BY v.attention_needed DESC NULLS LAST,
           v.last_evidence_at ASC NULLS FIRST,
           v.client_slug ASC,
           v.platform ASC
$$;

-- 3) Drift findings (expected ICE vs observed platform) --------------
CREATE OR REPLACE FUNCTION public.prv_get_drift_rollup()
RETURNS TABLE (
  created_at                text,
  client_slug               text,
  client_id                 text,
  platform                  text,
  drift_type                text,
  drift_severity            text,
  observation_window_start  text,
  observation_window_end    text,
  observed_count            integer,
  expected_count            integer,
  is_recent                 boolean,
  is_actionable             boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    v.created_at::text,
    v.client_slug,
    v.client_id::text,
    v.platform,
    v.drift_type,
    v.drift_severity,
    v.observation_window_start::text,
    v.observation_window_end::text,
    v.observed_count,
    v.expected_count,
    v.is_recent,
    v.is_actionable
  FROM op.v_drift_rollup v
  ORDER BY v.is_actionable DESC NULLS LAST,
           v.created_at DESC
  LIMIT 200
$$;

-- Grants: deny-by-default, service_role only ------------------------
-- Explicit anon+authenticated revoke avoids the Supabase default-privilege
-- leak that required the cc-0020 114333 hotfix.
REVOKE EXECUTE ON FUNCTION public.prv_get_reconciliation_summary() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prv_get_freshness_rollup()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prv_get_drift_rollup()           FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.prv_get_reconciliation_summary() TO service_role;
GRANT EXECUTE ON FUNCTION public.prv_get_freshness_rollup()       TO service_role;
GRANT EXECUTE ON FUNCTION public.prv_get_drift_rollup()           TO service_role;
