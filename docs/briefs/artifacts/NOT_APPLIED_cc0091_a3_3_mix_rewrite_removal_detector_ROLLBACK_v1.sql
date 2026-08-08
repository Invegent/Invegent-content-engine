-- cc-0091 A3-3 — mix-rewrite removal detector + class-elimination guard (ROLLBACK)
--
-- STATUS: NOT APPLIED. Rollback for
--         NOT_APPLIED_cc0091_a3_3_mix_rewrite_removal_detector_v1.sql
--
-- The forward is purely ADDITIVE — two functions and one view. It alters no existing
-- object and writes no data of its own. This rollback drops exactly those three, in
-- dependency order, and touches nothing else.
--
-- Created by the forward, removed here:
--   ice_ro.mix_rewrite_class_elimination        (view — depends on the detector)
--   m.record_mix_rewrite_removals(text)         (writer — depends on the detector)
--   m.detect_mix_rewrite_removals(text)         (detector)
--
-- ⚠ SCOPE BOUNDARY — this rollback does NOT touch m.format_capability_drop.
-- That table belongs to A3-1 and may hold 'runtime_grid' rows that have nothing to do
-- with A3-3. Rolling back A3-3 must never destroy A3-1's evidence. If the intent is to
-- remove the whole A3 surface, run THIS rollback first, then A3-1's rollback (which
-- carries its own data-loss guard).
--
-- ⚠ 'mix_rewrite' ROWS SURVIVE THIS ROLLBACK, deliberately.
-- If Gate B wired the writer and rows were recorded, they remain in
-- m.format_capability_drop after this rollback. That is correct: the evidence of what a
-- past mix rewrite removed is historical fact and does not stop being true because the
-- detector was withdrawn. Deleting it here would be the same silent-evidence-loss defect
-- A3 exists to fix. To remove those rows it must be a separate, deliberate, gated act.

BEGIN;

-- Drop in dependency order (view -> writer -> detector).
DROP VIEW IF EXISTS ice_ro.mix_rewrite_class_elimination;

DROP FUNCTION IF EXISTS m.record_mix_rewrite_removals(text);
DROP FUNCTION IF EXISTS m.detect_mix_rewrite_removals(text);

-- Fail-closed post-conditions.
DO $$
DECLARE v_n integer;
BEGIN
  IF to_regclass('ice_ro.mix_rewrite_class_elimination') IS NOT NULL THEN
    RAISE EXCEPTION 'cc-0091 A3-3 ROLLBACK ABORT: ice_ro.mix_rewrite_class_elimination still exists';
  END IF;

  SELECT count(*) INTO v_n
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'm'
     AND p.proname IN ('detect_mix_rewrite_removals','record_mix_rewrite_removals');
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'cc-0091 A3-3 ROLLBACK ABORT: % A3-3 function(s) still present', v_n;
  END IF;

  -- COLLATERAL GUARD 1: A3-1's surface must be INTACT. This rollback is scoped to A3-3
  -- and must never have removed A3-1's table, view or functions.
  IF to_regclass('m.format_capability_drop') IS NULL THEN
    RAISE EXCEPTION
      'cc-0091 A3-3 ROLLBACK ABORT: m.format_capability_drop is GONE — this rollback must '
      'never remove A3-1''s evidence surface';
  END IF;
  SELECT count(*) INTO v_n
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'm'
     AND p.proname IN ('detect_format_capability_drops',
                       'record_format_capability_drops',
                       'prune_format_capability_drop');
  IF v_n <> 3 THEN
    RAISE EXCEPTION
      'cc-0091 A3-3 ROLLBACK ABORT: expected A3-1''s 3 functions intact, found %', v_n;
  END IF;

  -- COLLATERAL GUARD 2: the source of truth this lane only READS must be untouched.
  SELECT count(*) INTO v_n FROM t.platform_format_mix_default;
  IF v_n < 1 THEN
    RAISE EXCEPTION
      'cc-0091 A3-3 ROLLBACK ABORT: t.platform_format_mix_default is empty — the mix table '
      'must never be affected by this rollback';
  END IF;
END $$;

COMMIT;

-- ── POST-ROLLBACK VERIFICATION ───────────────────────────────────────────────
-- SELECT to_regclass('ice_ro.mix_rewrite_class_elimination');                    -- NULL
-- SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--  WHERE n.nspname='m' AND p.proname LIKE '%mix_rewrite_removals%';              -- 0
-- A3-1 intact:
-- SELECT to_regclass('m.format_capability_drop');                                -- NOT NULL
-- Any previously recorded mix_rewrite evidence is INTENTIONALLY retained:
-- SELECT detection_source, count(*) FROM m.format_capability_drop GROUP BY 1;
