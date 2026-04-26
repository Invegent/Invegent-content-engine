-- Stage 2.014 — Extend m.post_draft with slot_id and is_shadow
-- slot_id: links draft back to the slot that originated it (NULL for legacy R6 drafts).
-- is_shadow: drafts created during shadow-mode fill (Phase B) — never published.
-- Both columns are nullable for backwards-compatibility with existing drafts.

ALTER TABLE m.post_draft
  ADD COLUMN slot_id    uuid REFERENCES m.slot(slot_id) ON DELETE SET NULL,
  ADD COLUMN is_shadow  boolean NOT NULL DEFAULT false;

-- Index 1: slot lookup (ai-worker idempotency check, Stage 11 LD18)
CREATE INDEX idx_post_draft_slot_id
  ON m.post_draft (slot_id)
  WHERE slot_id IS NOT NULL;

-- Index 2: shadow filter (publishers exclude is_shadow=true)
CREATE INDEX idx_post_draft_is_shadow
  ON m.post_draft (is_shadow, created_at)
  WHERE is_shadow = true;

COMMENT ON COLUMN m.post_draft.slot_id IS
  'FK to m.slot. NULL for legacy R6 drafts. Set by Stage 8 fill function for slot-driven drafts. Stage 2.014.';
COMMENT ON COLUMN m.post_draft.is_shadow IS
  'TRUE for drafts created during Phase B shadow mode. Excluded from publish queue. Default false. Stage 2.014.';
