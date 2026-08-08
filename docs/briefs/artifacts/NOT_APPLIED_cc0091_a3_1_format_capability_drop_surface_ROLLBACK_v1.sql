-- cc-0091 A3-1 — durable format-capability drop surface (ROLLBACK)
--
-- STATUS: NOT APPLIED. Rollback for
--         NOT_APPLIED_cc0091_a3_1_format_capability_drop_surface_v1.sql
--
-- The forward is purely ADDITIVE — it alters no existing table, function, view or grant.
-- This rollback is therefore a clean DROP of exactly what the forward created, in
-- dependency order, and touches nothing else.
--
-- Created by the forward, removed here:
--   ice_ro.format_capability_drop_status        (view — drop first, depends on the table)
--   m.record_format_capability_drops(uuid,date) (writer — depends on the detector)
--   m.detect_format_capability_drops(uuid,date) (detector)
--   m.prune_format_capability_drop(integer)     (retention)
--   m.format_capability_drop                    (table; its 3 indexes drop with it)
--
-- ⚠ DATA-LOSS GUARD — READ THIS BEFORE RUNNING
-- If Gate B has wired the nightly call site, this table holds the ONLY durable record of
-- which requested formats were dropped and why. Dropping it destroys that evidence
-- irrecoverably — and that evidence is the entire point of A3.
--
-- The guard below ABORTS if the table contains any rows. That is deliberate and
-- fail-closed: a rollback that silently deletes accumulated capability evidence would
-- reproduce, in the rollback path, exactly the silent-loss defect A3 exists to fix.
--
-- To roll back anyway (a conscious decision, never a default):
--   1. Export first:  COPY (SELECT * FROM m.format_capability_drop) TO STDOUT WITH CSV HEADER;
--   2. Then comment out the guard block below and re-run.
-- Do NOT weaken the guard in this file. Comment it out at run time, deliberately, once.

BEGIN;

-- ── Guard 0: refuse to destroy accumulated evidence ──────────────────────────
DO $$
DECLARE v_n bigint;
BEGIN
  IF to_regclass('m.format_capability_drop') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM m.format_capability_drop' INTO v_n;
    IF v_n > 0 THEN
      RAISE EXCEPTION
        'cc-0091 A3-1 ROLLBACK ABORT: m.format_capability_drop holds % row(s) of capability '
        'evidence. Export it, then comment out this guard deliberately. Refusing to destroy '
        'the only durable record of dropped format requests.', v_n;
    END IF;
  END IF;
END $$;

-- ── Drop in dependency order (view -> writer -> detector -> retention -> table) ──
DROP VIEW IF EXISTS ice_ro.format_capability_drop_status;

DROP FUNCTION IF EXISTS m.record_format_capability_drops(uuid, date);
DROP FUNCTION IF EXISTS m.detect_format_capability_drops(uuid, date);
DROP FUNCTION IF EXISTS m.prune_format_capability_drop(integer);

DROP TABLE IF EXISTS m.format_capability_drop;   -- ix_fcd_* drop with the table

-- ── Fail-closed post-conditions: prove the removal AND prove nothing else moved ──
DO $$
DECLARE v_n integer;
BEGIN
  -- Everything the forward created is gone.
  IF to_regclass('m.format_capability_drop') IS NOT NULL THEN
    RAISE EXCEPTION 'cc-0091 A3-1 ROLLBACK ABORT: m.format_capability_drop still exists';
  END IF;
  IF to_regclass('ice_ro.format_capability_drop_status') IS NOT NULL THEN
    RAISE EXCEPTION 'cc-0091 A3-1 ROLLBACK ABORT: ice_ro.format_capability_drop_status still exists';
  END IF;

  SELECT count(*) INTO v_n
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'm'
     AND p.proname IN ('detect_format_capability_drops',
                       'record_format_capability_drops',
                       'prune_format_capability_drop');
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'cc-0091 A3-1 ROLLBACK ABORT: % A3-1 function(s) still present', v_n;
  END IF;

  -- COLLATERAL GUARD: the functions this lane READS must be untouched by the rollback.
  -- A rollback that removed or damaged the grid / classifier would be catastrophic and
  -- must not pass silently just because the A3-1 objects are gone.
  SELECT count(*) INTO v_n
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE (n.nspname = 'm'      AND p.proname = 'build_weekly_demand_grid')
      OR (n.nspname = 'public' AND p.proname = 'classify_format_capability')
      OR (n.nspname = 'm'      AND p.proname = 'fill_pending_slots')
      OR (n.nspname = 'm'      AND p.proname = 'materialise_slots');
  IF v_n < 4 THEN
    RAISE EXCEPTION
      'cc-0091 A3-1 ROLLBACK ABORT: expected 4 untouched live functions '
      '(build_weekly_demand_grid / classify_format_capability / fill_pending_slots / '
      'materialise_slots), found %', v_n;
  END IF;
END $$;

COMMIT;

-- ── POST-ROLLBACK VERIFICATION ───────────────────────────────────────────────
-- SELECT to_regclass('m.format_capability_drop')          AS tbl,          -- NULL
--        to_regclass('ice_ro.format_capability_drop_status') AS vw;        -- NULL
-- SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--  WHERE n.nspname='m' AND p.proname LIKE '%format_capability_drop%';      -- 0
-- Nothing else in the schema is expected to differ. The forward altered no pre-existing
-- object, so a correct rollback leaves the database byte-equivalent to its pre-apply state
-- apart from the absence of these five objects.
