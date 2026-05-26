-- RECONSTRUCTED 2026-05-26 from supabase_migrations.schema_migrations (version 20260526110657),
-- applied to production via Supabase MCP apply_migration 2026-05-26 (cc-0015 Stage A, by CCD;
-- plan_review D-01 58d89efe escalate->PK + PK approval phrase). Committed same-session (L-v3.06-a
-- drift closure) — no DB change (version already recorded as applied).
-- cc-0015 Stage A — friction pool schema additions: new dashboard_ui category + friction.pool_session.
-- Brief: docs/briefs/cc-0015-friction-pool-view.md §3. Additive only; no change to existing
-- categories, friction.case, fn_recent_cases/fn_triage_case, or the read-only /operations Repair-Board v0.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM friction.category WHERE category_code = 'dashboard_ui') THEN
    RAISE EXCEPTION 'ABORT: friction.category dashboard_ui already exists — Stage A already applied?';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='friction' AND table_name='pool_session') THEN
    RAISE EXCEPTION 'ABORT: friction.pool_session already exists — Stage A already applied?';
  END IF;
  INSERT INTO friction.category (category_code, display_label, default_sla_hours, description, counts_for_success, is_active)
  VALUES (
    'dashboard_ui',
    'Dashboard UI / UX',
    NULL,
    'Operations dashboard interface issue — layout, density, navigation, copy, visual bugs. Distinct from operator_friction which covers general workflow pain (e.g., wrong-default-behaviour outside the dashboard, missing affordances in other tools).',
    true,
    true
  );
END $$;

CREATE TABLE IF NOT EXISTS friction.pool_session (
  pool_session_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date        date NOT NULL DEFAULT current_date,
  pool_label          text NOT NULL,
  category_filter     text[],
  triage_state_filter text[],
  cases_reviewed      integer NOT NULL DEFAULT 0,
  cases_addressed     integer NOT NULL DEFAULT 0,
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
