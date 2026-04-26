-- Stage 9.045 — Extend m.slot_fill_attempt.decision CHECK to allow new values
--
-- Pre-flight gap caught during Stage 9 V3 verification. The original CHECK
-- (created with the table in Stage 1) limited decision to:
--   'filled', 'evergreen', 'skipped', 'error'
--
-- Stage 9.040 m.recover_stuck_slots writes new decision values:
--   'recovered_to_pending'  — slot reset for retry
--   'marked_failed'         — slot exhausted retries
--
-- Stage 8.037 m.fill_pending_slots writes 'failed' on the format_policy_missing
-- path. This is a latent bug — never triggered yet because all production
-- slots use formats with valid policies, but would fire if a slot ever picks
-- an unconfigured format. Fold the fix in here.
--
-- Drop + recreate the CHECK with the extended ARRAY.

ALTER TABLE m.slot_fill_attempt DROP CONSTRAINT m_slot_fill_attempt_decision_check;

ALTER TABLE m.slot_fill_attempt ADD CONSTRAINT m_slot_fill_attempt_decision_check
  CHECK (decision = ANY (ARRAY[
    'filled'::text,
    'evergreen'::text,
    'skipped'::text,
    'error'::text,
    'failed'::text,
    'recovered_to_pending'::text,
    'marked_failed'::text
  ]));

COMMENT ON CONSTRAINT m_slot_fill_attempt_decision_check ON m.slot_fill_attempt IS
  'Extended Stage 9.045 fix-up: added failed (Stage 8 latent), recovered_to_pending and marked_failed (Stage 9 recovery).';
