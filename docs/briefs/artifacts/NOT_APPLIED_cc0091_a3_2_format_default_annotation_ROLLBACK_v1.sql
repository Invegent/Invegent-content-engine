-- cc-0091 A3-2 — format-default annotation at the fill site (ROLLBACK)
--
-- STATUS: NOT APPLIED. Rollback for
--         NOT_APPLIED_cc0091_a3_2_format_default_annotation_v1.sql
--
-- The forward is purely ADDITIVE — one trigger function, one trigger, one view. It alters
-- no existing object and rewrites no existing row.
--
-- Created by the forward, removed here:
--   ice_ro.slot_format_default_status                    (view)
--   tg_slot_fill_attempt_annotate_format_default         (trigger on m.slot_fill_attempt)
--   m.tg_annotate_format_default()                       (trigger function)
--
-- ⚠ ANNOTATIONS ALREADY WRITTEN ARE DELIBERATELY LEFT IN PLACE.
-- Rows whose pool_snapshot carries the 'cc0091_a3_2' key keep it. Two reasons:
--   1. It is TRUE. That fill really did take the default, and withdrawing the trigger does
--      not change what happened. Stripping it would destroy evidence — the same silent
--      loss A3 exists to prevent.
--   2. Removing it means UPDATEing m.slot_fill_attempt rows, i.e. a data mutation on a
--      production audit table, which is categorically more dangerous than the additive
--      change being reversed. A rollback must not be riskier than the thing it undoes.
-- If the annotations must genuinely be purged, that is a separate, deliberate, gated act.
-- The optional statement is provided at the foot of this file, commented out.
--
-- ⚠ m.fill_pending_slots was never modified by the forward, so it is not referenced here.
-- A rollback that touched it would be out of scope and is asserted against below.

BEGIN;

DROP VIEW IF EXISTS ice_ro.slot_format_default_status;

DROP TRIGGER IF EXISTS tg_slot_fill_attempt_annotate_format_default ON m.slot_fill_attempt;

DROP FUNCTION IF EXISTS m.tg_annotate_format_default();

-- Fail-closed post-conditions.
DO $$
DECLARE v_n integer;
BEGIN
  IF to_regclass('ice_ro.slot_format_default_status') IS NOT NULL THEN
    RAISE EXCEPTION 'cc-0091 A3-2 ROLLBACK ABORT: ice_ro.slot_format_default_status still exists';
  END IF;

  SELECT count(*) INTO v_n
    FROM pg_trigger
   WHERE tgrelid = 'm.slot_fill_attempt'::regclass
     AND tgname  = 'tg_slot_fill_attempt_annotate_format_default';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'cc-0091 A3-2 ROLLBACK ABORT: trigger still attached';
  END IF;

  SELECT count(*) INTO v_n
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'm' AND p.proname = 'tg_annotate_format_default';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'cc-0091 A3-2 ROLLBACK ABORT: trigger function still present';
  END IF;

  -- COLLATERAL GUARD 1: the audit table itself must survive intact.
  IF to_regclass('m.slot_fill_attempt') IS NULL THEN
    RAISE EXCEPTION 'cc-0091 A3-2 ROLLBACK ABORT: m.slot_fill_attempt is GONE';
  END IF;

  -- COLLATERAL GUARD 2: the fill path must be untouched. The forward never modified it,
  -- so its absence here would mean this rollback did something far outside its scope.
  SELECT count(*) INTO v_n
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'm' AND p.proname = 'fill_pending_slots';
  IF v_n <> 1 THEN
    RAISE EXCEPTION
      'cc-0091 A3-2 ROLLBACK ABORT: m.fill_pending_slots not found intact (count %) — this '
      'rollback must never touch the fill path', v_n;
  END IF;

  -- COLLATERAL GUARD 3: no OTHER trigger on the audit table was collaterally dropped.
  SELECT count(*) INTO v_n
    FROM pg_trigger
   WHERE tgrelid = 'm.slot_fill_attempt'::regclass AND NOT tgisinternal;
  RAISE NOTICE 'cc-0091 A3-2 ROLLBACK: % non-internal trigger(s) remain on m.slot_fill_attempt', v_n;
END $$;

COMMIT;

-- ── POST-ROLLBACK VERIFICATION ───────────────────────────────────────────────
-- SELECT to_regclass('ice_ro.slot_format_default_status');                       -- NULL
-- SELECT count(*) FROM pg_trigger WHERE tgrelid='m.slot_fill_attempt'::regclass
--   AND tgname='tg_slot_fill_attempt_annotate_format_default';                   -- 0
-- Annotations INTENTIONALLY retained (this is expected, not a failed rollback):
-- SELECT count(*) FROM m.slot_fill_attempt WHERE pool_snapshot ? 'cc0091_a3_2';
--
-- ── OPTIONAL, SEPARATE, DELIBERATE PURGE — NOT part of this rollback ─────────
-- Only run this if PK has explicitly decided the annotations must be destroyed.
-- It mutates a production audit table and is irreversible.
--   UPDATE m.slot_fill_attempt
--      SET pool_snapshot = pool_snapshot - 'cc0091_a3_2'
--    WHERE pool_snapshot ? 'cc0091_a3_2';
