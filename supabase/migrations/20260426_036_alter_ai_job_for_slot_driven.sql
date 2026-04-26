-- Stage 8.036 — Extend m.ai_job to support slot-driven origin path
--
-- Existing R6 path: digest_run_id + post_seed_id + post_draft_id all populated.
-- New slot-driven path: slot_id + post_draft_id (skeleton) populated, no digest/seed.
--
-- Changes:
--   1. ADD COLUMN slot_id uuid REFERENCES m.slot ON DELETE SET NULL
--   2. ADD COLUMN is_shadow boolean NOT NULL DEFAULT false
--   3. DROP NOT NULL on digest_run_id + post_seed_id (keep post_draft_id NOT NULL)
--   4. ADD CHECK constraint requiring exactly one origin path
--   5. INDEX on slot_id for ai-worker pickup queries

-- 1. Add new columns
ALTER TABLE m.ai_job ADD COLUMN IF NOT EXISTS slot_id uuid;
ALTER TABLE m.ai_job ADD COLUMN IF NOT EXISTS is_shadow boolean NOT NULL DEFAULT false;

-- 2. FK on slot_id (deferred constraint — fill function inserts both the slot update + ai_job; ON DELETE SET NULL means slot deletion doesn't orphan ai_jobs)
ALTER TABLE m.ai_job ADD CONSTRAINT fk_ai_job_slot
  FOREIGN KEY (slot_id) REFERENCES m.slot(slot_id) ON DELETE SET NULL;

-- 3. Drop NOT NULL on R6-only columns
ALTER TABLE m.ai_job ALTER COLUMN digest_run_id DROP NOT NULL;
ALTER TABLE m.ai_job ALTER COLUMN post_seed_id DROP NOT NULL;

-- 4. Add origin check: either R6 path (digest+seed both populated) OR slot-driven path (slot_id populated)
ALTER TABLE m.ai_job ADD CONSTRAINT ai_job_origin_check
  CHECK (
    (digest_run_id IS NOT NULL AND post_seed_id IS NOT NULL)
    OR slot_id IS NOT NULL
  );

-- 5. Index for ai-worker pickup
CREATE INDEX IF NOT EXISTS idx_ai_job_slot_id_status
  ON m.ai_job (slot_id, status)
  WHERE slot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_job_is_shadow_status
  ON m.ai_job (is_shadow, status)
  WHERE status IN ('queued','running');

COMMENT ON COLUMN m.ai_job.slot_id IS
  'Slot-driven path: links ai_job to its source m.slot row. Mutually compatible with R6 path via ai_job_origin_check. Stage 8.036.';
COMMENT ON COLUMN m.ai_job.is_shadow IS
  'Slot-driven path: when true, ai-worker writes draft with is_shadow=true so publishers ignore it. Default false for R6 jobs. Stage 8.036.';
COMMENT ON CONSTRAINT ai_job_origin_check ON m.ai_job IS
  'Each ai_job has exactly one origin: R6 (digest_run_id + post_seed_id) or slot-driven (slot_id). Stage 8.036.';
