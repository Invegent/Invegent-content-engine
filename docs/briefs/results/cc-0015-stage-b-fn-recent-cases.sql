-- =====================================================================================
-- cc-0015 Stage B — extend friction.fn_recent_cases with backward-compatible filter params
-- PREPARED ARTIFACT — *** DO NOT APPLY AS-IS ***.
--   Gated on: plan_review D-01 (this package) + sql_destructive D-01 + PK approval phrase.
--   Apply via Supabase apply_migration as `cc_0015_b_fn_recent_cases_filters`.
--
-- WHY DROP+CREATE (not CREATE OR REPLACE): Postgres CREATE OR REPLACE cannot add parameters
--   (that creates a distinct overload → ambiguity on a p_limit-only call). So we DROP the
--   single-arg function and CREATE one function with the new params ALL DEFAULTED NULL. Existing
--   callers `fn_recent_cases(p_limit => N)` resolve to this same function with NULL filters =
--   identical behaviour. Verified safe: 0 in-DB functions/procs reference fn_recent_cases (only
--   the app calls it via PostgREST).
--
-- BACKWARD COMPATIBILITY (V-B2): when p_categories / p_triage_states / p_action_decisions are all
--   NULL (existing callers + the no-filter /operations default), the WHERE collapses to TRUE and
--   the ORDER BY + LIMIT are byte-identical to the current function → identical result set + order.
--
-- SCOPE: adds category / triage_state / action_decision filters only. Source filter + sort options
--   are DEFERRED (PK decision: source deferred; sort not in this slice). Return shape UNCHANGED
--   (no new columns) so the FrictionCase type + the roadmap caller are unaffected. Category
--   display_label/description hydration is a SEPARATE frontend read of friction.category (NOT here).
-- =====================================================================================

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

-- =====================================================================================
-- V-CHECKS (read-only, run SEPARATELY after apply)
--   V-B1  : SELECT count(*) FROM friction.fn_recent_cases(50, ARRAY['dashboard_ui'], NULL, NULL);  -- accepts new params, returns rows
--   V-B2a : fn_recent_cases(50)        == fn_recent_cases(50, NULL, NULL, NULL)  (same rows + order = backward-compatible)
--   V-B2b : fn_recent_cases(50, NULL, ARRAY['new'], NULL)  ⊆  fn_recent_cases(50)  and only triage_state='new'
--   V-B1c : fn_recent_cases(50, NULL, NULL, ARRAY['track']) returns only action_decision='track'
--   shape : return columns identical to the pre-change signature (12 columns, same names/types)
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS friction.fn_recent_cases(integer, text[], text[], text[]);
--   then re-CREATE the original single-arg friction.fn_recent_cases(integer) from
--   docs/briefs/cc-0015-stage-b-plan.md §rollback (verbatim prior definition).
-- =====================================================================================
