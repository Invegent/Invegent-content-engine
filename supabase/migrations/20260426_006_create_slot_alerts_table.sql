-- Stage 1.006 — m.slot_alerts: monitoring alerts surfaced to dashboard
-- Written by various Phase B+ functions (pool health check, critical window scan, recovery, etc.)
-- Read by dashboard and reviewed by PK during sprint mode.

CREATE TABLE m.slot_alerts (
  alert_id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_kind                text NOT NULL,
    -- 'pool_thin' | 'evergreen_overuse' | 'critical_window_unfilled'
    -- | 'fill_in_progress_stuck' | 'cron_heartbeat_missing' | 'class_drift'
  severity                  text NOT NULL,
    -- 'info' | 'warning' | 'critical'
  client_id                 uuid REFERENCES c.client(client_id) ON DELETE CASCADE,
  platform                  text,
  vertical_id               integer REFERENCES t.content_vertical(vertical_id) ON DELETE SET NULL,
  slot_id                   uuid REFERENCES m.slot(slot_id) ON DELETE CASCADE,
  payload                   jsonb,
    -- alert-kind-specific data; e.g. {pool_size: 2, threshold: 5} for pool_thin
  message                   text,
    -- human-readable one-line summary
  created_at                timestamptz NOT NULL DEFAULT now(),
  acknowledged_at           timestamptz,
  acknowledged_by           text,

  CONSTRAINT m_slot_alerts_severity_check CHECK (
    severity IN ('info','warning','critical')
  )
);

-- Active alert lookup (unacknowledged, severity-ordered)
CREATE INDEX idx_slot_alerts_active
  ON m.slot_alerts (severity, created_at DESC)
  WHERE acknowledged_at IS NULL;

-- Per-client alert filtering
CREATE INDEX idx_slot_alerts_client
  ON m.slot_alerts (client_id, created_at DESC)
  WHERE acknowledged_at IS NULL;

-- Alert-kind aggregation (e.g. how many pool_thin alerts in last 24h)
CREATE INDEX idx_slot_alerts_kind
  ON m.slot_alerts (alert_kind, created_at DESC);

COMMENT ON TABLE m.slot_alerts IS
  'Operational alerts from slot-driven pipeline functions. Surfaced to dashboard. Stage 1.006.';
