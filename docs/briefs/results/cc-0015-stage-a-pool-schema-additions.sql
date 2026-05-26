-- =====================================================================================
-- cc-0015 Stage A — pool schema additions (PREPARED ARTIFACT — *** DO NOT APPLY AS-IS ***)
--
-- STATUS: prepared during the cc-0015 readiness pass (2026-05-26). NOT applied, NOT committed.
--   Gated on: D-01 (plan_review of the cc-0015 7 questions + the Pools/Repair-Board reconciliation
--   question) + PK approval of the first-slice scope. Apply via Supabase apply_migration as
--   `cc_0015_a_pool_schema_additions` only after that.
--
-- VERIFIED against live schema 2026-05-26:
--   * friction.category(category_code, display_label, default_sla_hours, description,
--     counts_for_success, is_active, created_at) — brief INSERT columns all present + correct types.
--   * dashboard_ui category absent (0 rows); friction.pool_session table absent (0 rows) — preflight clean.
--   * Additive only: no change to existing categories, friction.case, fn_recent_cases, fn_triage_case,
--     or the read-only /operations Pools/Repair-Board v0 (which keys off friction.case.notes, untouched).
-- =====================================================================================

DO $$
BEGIN
  -- Preflight guards (idempotency / half-apply safety): abort if either object already exists.
  IF EXISTS (SELECT 1 FROM friction.category WHERE category_code = 'dashboard_ui') THEN
    RAISE EXCEPTION 'ABORT: friction.category dashboard_ui already exists — Stage A already applied?';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='friction' AND table_name='pool_session') THEN
    RAISE EXCEPTION 'ABORT: friction.pool_session already exists — Stage A already applied?';
  END IF;

  -- Step 1: add dashboard_ui category (distinct from operator_friction).
  INSERT INTO friction.category (category_code, display_label, default_sla_hours, description, counts_for_success, is_active)
  VALUES (
    'dashboard_ui',
    'Dashboard UI / UX',
    NULL,  -- not SLA-driven; batch-resolved on the Dashboard pool cadence
    'Operations dashboard interface issue — layout, density, navigation, copy, visual bugs. Distinct from operator_friction which covers general workflow pain (e.g., wrong-default-behaviour outside the dashboard, missing affordances in other tools).',
    true,
    true
  );
END $$;

-- Step 2: pool_session table (records what was reviewed when — empirical pooling-discipline record).
CREATE TABLE IF NOT EXISTS friction.pool_session (
  pool_session_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date        date NOT NULL DEFAULT current_date,
  pool_label          text NOT NULL,   -- 'dashboard_ui','reconciliation','pipeline_integrity','all_track', custom
  category_filter     text[],
  triage_state_filter text[],
  cases_reviewed      integer NOT NULL DEFAULT 0,
  cases_addressed     integer NOT NULL DEFAULT 0,  -- those whose action_decision moved away from 'track'/'new'
  notes               text,
  started_at          timestamptz NOT NULL DEFAULT now(),
  ended_at            timestamptz,
  duration_minutes    integer GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL
         THEN EXTRACT(EPOCH FROM (ended_at - started_at))::integer / 60
         ELSE NULL END
  ) STORED,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pool_session_session_date_idx ON friction.pool_session (session_date DESC);
CREATE INDEX IF NOT EXISTS pool_session_pool_label_idx   ON friction.pool_session (pool_label);

GRANT SELECT, INSERT, UPDATE ON friction.pool_session TO service_role;
GRANT SELECT ON friction.pool_session TO authenticated;
-- authenticated writes go via a SECURITY DEFINER function in Stage E (fn_start/end_pool_session) — NOT here.

-- =====================================================================================
-- V-CHECKS (read-only, run SEPARATELY after apply)
--   V-A1: SELECT * FROM friction.category WHERE category_code='dashboard_ui';            -- exists + is_active
--   V-A2: \d friction.pool_session  (or information_schema)                              -- shape incl. generated duration_minutes
--   V-A3: grants — authenticated has SELECT only (no INSERT/UPDATE), service_role has SELECT/INSERT/UPDATE
--   V-A4: no CHECK on cases_addressed (intentional)
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS friction.pool_session;
--   DELETE FROM friction.category WHERE category_code='dashboard_ui';
--
-- NOTE: brief §3's Stage A.5 backfill recategorisation (operator_friction -> dashboard_ui) is a
-- SEPARATE manual, PK-confirmed, per-case fn_triage_case step — NOT part of this migration.
-- =====================================================================================
