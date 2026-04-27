-- Stage 2.1 — audit trail for publish profile toggle changes
-- Append-only. Never updated, never deleted in normal operation.

CREATE TABLE IF NOT EXISTS c.client_publish_profile_audit (
  audit_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
  platform          text NOT NULL,
  field             text NOT NULL,
  old_value         jsonb,
  new_value         jsonb,
  changed_by        text NOT NULL DEFAULT 'dashboard',
  changed_at        timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_publish_profile_audit_client_platform
  ON c.client_publish_profile_audit (client_id, platform, changed_at DESC);

COMMENT ON TABLE c.client_publish_profile_audit IS
  'Append-only audit of toggle changes on c.client_publish_profile. Stage 2.1 deliverable.';
