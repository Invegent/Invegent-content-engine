-- Stage 11.048 — LD18 DB-enforced idempotency: one draft per slot
--
-- Prior to this migration, "one draft per slot_id" was an implicit invariant
-- maintained by m.fill_pending_slots inserting exactly one skeleton per slot.
-- This migration makes it a DB-enforced invariant. Any race where two parallel
-- callers attempt to create a second draft for the same slot will now fail at
-- the DB level rather than silently producing duplicates.
--
-- Partial — only enforced when slot_id IS NOT NULL. Legacy R6 drafts without
-- slot_id remain unaffected.
--
-- Implemented as a UNIQUE INDEX (Postgres does not support partial UNIQUE
-- constraints via ADD CONSTRAINT; partial unique index is the canonical pattern).
--
-- Pre-flight verified: zero rows in m.post_draft with duplicate slot_id at
-- author time, so the index will create cleanly.

CREATE UNIQUE INDEX IF NOT EXISTS uq_post_draft_slot_id
  ON m.post_draft (slot_id)
  WHERE slot_id IS NOT NULL;

COMMENT ON INDEX m.uq_post_draft_slot_id IS
  'LD18 DB-enforced idempotency: one draft per slot. Partial — only enforced when slot_id IS NOT NULL. Stage 11.048.';
