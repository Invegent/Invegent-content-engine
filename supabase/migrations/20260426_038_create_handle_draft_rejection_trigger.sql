-- Stage 8.038 — Rejection retry policy: 1 retry, then skip the slot (§B.9)
--
-- When m.post_draft.approval_status transitions to 'rejected' AND the draft
-- has a slot_id:
--   - First rejection (no prior rejected drafts for this slot):
--     reset slot to pending_fill, clear filled_draft_id; fill function
--     will pick it up again on next cron tick.
--   - Second rejection (one prior rejected draft for this slot):
--     mark slot status='skipped' with reason='draft_rejected_twice'.

CREATE OR REPLACE FUNCTION m.handle_draft_rejection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_prior_rejection_count integer;
BEGIN
  IF NEW.approval_status = 'rejected'
     AND COALESCE(OLD.approval_status, '') <> 'rejected'
     AND NEW.slot_id IS NOT NULL
  THEN
    SELECT COUNT(*)
    INTO v_prior_rejection_count
    FROM m.post_draft
    WHERE slot_id = NEW.slot_id
      AND approval_status = 'rejected'
      AND post_draft_id <> NEW.post_draft_id;

    IF v_prior_rejection_count >= 1 THEN
      -- This is rejection #2+. Skip the slot.
      UPDATE m.slot
      SET status = 'skipped',
          skip_reason = 'draft_rejected_twice',
          updated_at = NOW()
      WHERE slot_id = NEW.slot_id;
    ELSE
      -- First rejection. Reset slot for one retry.
      UPDATE m.slot
      SET status = 'pending_fill',
          filled_draft_id = NULL,
          canonical_ids = NULL,
          evergreen_id = NULL,
          is_evergreen = false,
          format_chosen = NULL,
          slot_confidence = NULL,
          filled_at = NULL,
          updated_at = NOW()
      WHERE slot_id = NEW.slot_id
        AND status NOT IN ('skipped','published');  -- don't reopen terminal slots
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_draft_rejection
AFTER UPDATE OF approval_status ON m.post_draft
FOR EACH ROW
EXECUTE FUNCTION m.handle_draft_rejection();

COMMENT ON FUNCTION m.handle_draft_rejection() IS
  'Rejection retry policy per §B.9. 1st rejection on slot-linked draft → reset slot to pending_fill. 2nd rejection → skip the slot. Stage 8.038.';
