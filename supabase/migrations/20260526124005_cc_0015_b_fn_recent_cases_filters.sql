-- RECONSTRUCTED 2026-05-26 from supabase_migrations.schema_migrations (version 20260526124005),
-- applied to production via Supabase MCP apply_migration 2026-05-26 (cc-0015 Stage B RPC, by CCD;
-- plan_review D-01 58d89efe + sql_destructive D-01 17db8b27 + PK approval phrase). Committed same-session
-- (L-v3.06-a drift closure) — no DB change (version already recorded as applied).
-- cc-0015 Stage B: extend friction.fn_recent_cases with backward-compatible category/triage/action filters.
-- COEXIST model: /operations/pools (Repair Board v0) untouched; this changes only the shared RPC, additively.
-- Backward-compatible: NULL-defaulted params => existing fn_recent_cases(p_limit) callers = current behaviour
-- (V-B2 verified post-apply: fn_recent_cases(50) and (50,NULL,NULL,NULL) both = baseline n=44, md5 af67c0ee...).
-- Source filter + sort DEFERRED. Brief: docs/briefs/cc-0015b-pool-view-reconciliation.md §8.
DROP FUNCTION IF EXISTS friction.fn_recent_cases(integer);

CREATE FUNCTION friction.fn_recent_cases(
  p_limit            integer DEFAULT 50,
  p_categories       text[]  DEFAULT NULL,
  p_triage_states    text[]  DEFAULT NULL,
  p_action_decisions text[]  DEFAULT NULL
)
RETURNS TABLE(
  case_id uuid, case_title text, first_seen_at timestamptz, last_seen_at timestamptz,
  event_count integer, severity text, category text, triage_state text, quality_flag boolean,
  action_decision text, next_review_at timestamptz, notes text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'friction', 'public'
AS $function$
  SELECT
    case_id, case_title, first_seen_at, last_seen_at, event_count,
    severity, category, triage_state, quality_flag, action_decision,
    next_review_at, notes
  FROM friction.case
  WHERE (p_categories       IS NULL OR category        = ANY(p_categories))
    AND (p_triage_states    IS NULL OR triage_state    = ANY(p_triage_states))
    AND (p_action_decisions IS NULL OR action_decision = ANY(p_action_decisions))
  ORDER BY
    CASE severity WHEN 'critical' THEN 1 WHEN 'warn' THEN 2 ELSE 3 END,
    CASE triage_state WHEN 'new' THEN 1 WHEN 'acknowledged' THEN 2 ELSE 3 END,
    last_seen_at DESC
  LIMIT p_limit;
$function$;

GRANT EXECUTE ON FUNCTION friction.fn_recent_cases(integer, text[], text[], text[]) TO service_role, authenticated;
