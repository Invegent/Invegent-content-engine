-- Stage 1.004 — m.slot_fill_attempt: audit trail for every fill function call
-- One row per fill attempt per slot. Captures pool snapshot, decision, and reason.
-- Used for debugging, threshold tuning, and post-mortem analysis.

CREATE TABLE m.slot_fill_attempt (
  attempt_id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id                   uuid NOT NULL REFERENCES m.slot(slot_id) ON DELETE CASCADE,
  attempted_at              timestamptz NOT NULL DEFAULT now(),
  pool_size_at_attempt      integer,
    -- count of active pool entries for the slot's vertical at attempt time
  pool_snapshot             jsonb,
    -- top N pool candidates considered with fitness scores; truncated to ~20 entries
  decision                  text NOT NULL,
    -- 'filled' | 'evergreen' | 'skipped' | 'error'
  skip_reason               text,
    -- 'thin_pool' | 'no_format_fit' | 'all_dedup' | 'breaker_closed' | other
  selected_canonical_ids    uuid[] DEFAULT ARRAY[]::uuid[],
  selected_evergreen_id     uuid,
    -- FK added after t.evergreen_library exists (Migration 005)
  chosen_format             text,
  threshold_relaxed         boolean NOT NULL DEFAULT false,
    -- set true if pool health check or evergreen ratio check loosened thresholds
  pool_health_at_attempt    jsonb,
    -- snapshot from Stage 7 m.check_pool_health()
  evergreen_ratio_at_attempt numeric,
    -- 7d rolling evergreen ratio for this client at attempt time
  ai_job_id                 uuid REFERENCES m.ai_job(ai_job_id) ON DELETE SET NULL,
    -- v4 §11 references m.ai_job.id — actual PK is ai_job_id; corrected here
  error_message             text,
  created_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT m_slot_fill_attempt_decision_check CHECK (
    decision IN ('filled','evergreen','skipped','error')
  )
);

-- Per-slot history lookup (most recent first)
CREATE INDEX idx_slot_fill_attempt_slot
  ON m.slot_fill_attempt (slot_id, attempted_at DESC);

-- Decision-type aggregation (skip-reason analysis, evergreen ratio tracking)
CREATE INDEX idx_slot_fill_attempt_decision
  ON m.slot_fill_attempt (decision, attempted_at);

COMMENT ON TABLE m.slot_fill_attempt IS
  'Audit trail of fill function attempts per slot. One row per attempt. Includes pool snapshot for debugging. Stage 1.004.';
