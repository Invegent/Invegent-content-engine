-- Stage 9.039 — Change m.ai_job.slot_id FK from ON DELETE SET NULL to CASCADE
--
-- Caught during Stage 8 cleanup: ON DELETE SET NULL leaves all three origin
-- columns (digest_run_id, post_seed_id, slot_id) NULL when a slot is deleted,
-- which violates ai_job_origin_check. CASCADE is the honest semantic —
-- historical ai_jobs for a deleted slot have no useful state to preserve.
--
-- Decision logged as D178.

ALTER TABLE m.ai_job DROP CONSTRAINT fk_ai_job_slot;

ALTER TABLE m.ai_job ADD CONSTRAINT fk_ai_job_slot
  FOREIGN KEY (slot_id) REFERENCES m.slot(slot_id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT fk_ai_job_slot ON m.ai_job IS
  'Slot-driven path FK. ON DELETE CASCADE: deleting a slot removes its ai_jobs (D178). Stage 9.039.';
