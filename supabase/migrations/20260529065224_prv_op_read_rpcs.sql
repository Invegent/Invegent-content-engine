-- =====================================================================
-- prv_op_read_rpcs -- APPLIED TO PRODUCTION at version 20260529065224
--                     (project mbkmaxqhsohbtwsqolns), 2026-05-29.
--
-- 3 public SECURITY DEFINER read-only RPCs over the existing cc-0012 op.*
-- reconciliation views (PRV production-dashboard transport, option (i)).
--
-- GOVERNANCE: D-FR-RECON-001 ; PK approval phrase "PK APPROVES PRV READ-RPC
--             MIGRATION APPLY" (2026-05-29) ; D-01 87c618a5 (agree/proceed).
--             Prior D-01 103f5a6c (partial/type-c) superseded. Both rows
--             closed-loop on m.chatgpt_review (status=completed).
-- POST-APPLY V-CHECKS (all PASS): prosecdef=t / provolatile=s on all 3;
--             EXECUTE granted to service_role only (anon/authenticated false);
--             RPC-vs-view row-count parity 1/14/40, 26 actionable drift.
--
-- NOTE: the EXECUTABLE body below (DO guard + 3 CREATE OR REPLACE + grants) is
--       byte-identical to schema_migrations[20260529065224].statements[1]
--       (md5 of the stored statement = 9103b26e948baa9bb3c3d582b2a53c20);
--       only this comment header differs (status annotation). This file
--       supersedes the PROPOSED file 20260529120000_proposed_prv_op_read_rpcs.sql
--       (now tombstoned).
-- =====================================================================

-- Self-aborting pre-flight: abort if any op.* view column the RPCs depend on is
-- missing or its type changed (no partial apply; a RAISE rolls back everything).
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
    WHERE ic.table_schema = 'op' AND ic.table_name = req.v
      AND ic.column_name = req.c AND ic.udt_name = req.t
  );

  IF drift IS NOT NULL THEN
    RAISE EXCEPTION 'PRV pre-flight ABORT -- op.* view contract drift; missing/changed: %', drift;
  END IF;
END $$;

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

REVOKE EXECUTE ON FUNCTION public.prv_get_reconciliation_summary() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prv_get_freshness_rollup()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prv_get_drift_rollup()           FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.prv_get_reconciliation_summary() TO service_role;
GRANT EXECUTE ON FUNCTION public.prv_get_freshness_rollup()       TO service_role;
GRANT EXECUTE ON FUNCTION public.prv_get_drift_rollup()           TO service_role;
