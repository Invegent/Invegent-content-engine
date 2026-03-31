-- Tier 2 AI Diagnostic Agent — pipeline-fixer log table
-- Stores auto-fix actions and escalation alerts from each run

CREATE TABLE IF NOT EXISTS m.pipeline_fixer_log (
  fixer_log_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at           timestamptz NOT NULL DEFAULT now(),
  fixes_applied    jsonb,
  escalations      jsonb,
  health_ok        boolean,
  version          text,
  created_at       timestamptz DEFAULT now()
);

COMMENT ON TABLE m.pipeline_fixer_log IS 'Tier 2 AI diagnostic agent — auto-fix actions and escalation alerts';
