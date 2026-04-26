-- Stage 5.025 — Add a unique partial index on (client_id, platform, scheduled_publish_at)
-- where status NOT IN terminal states. This lets the materialiser ON CONFLICT DO NOTHING
-- without colliding with old skipped/published slots that might overlap historically.

CREATE UNIQUE INDEX idx_slot_unique_active
  ON m.slot (client_id, platform, scheduled_publish_at)
  WHERE status NOT IN ('skipped','failed','published');

COMMENT ON INDEX m.idx_slot_unique_active IS
  'Unique partial index: prevents materialiser from creating duplicate active slots. Allows historical published/skipped/failed slots to remain alongside re-materialised future slots if days_forward overlaps. Stage 5.025.';
