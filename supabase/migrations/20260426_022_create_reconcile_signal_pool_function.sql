-- Stage 4.022 — m.reconcile_signal_pool: full recompute on class drift (F7)
-- Runs daily via cron. Detects three drift conditions and corrects each:
--
-- A. ORPHANED: pool entry references a canonical that no longer has a body row,
--    or a vertical_map row was deleted. Mark is_active=false.
-- B. CLASS DRIFT: pool entry's stored content_class doesn't match
--    f.canonical_content_body.content_class anymore (classifier reclassified
--    via version bump or rule change). Re-run refresh_signal_pool_for_pair to
--    update class + recompute fitness + reset expiry.
-- C. FITNESS DRIFT: pool entry's fitness_per_format doesn't match what
--    t.class_format_fitness currently produces (e.g. someone updated fitness scores).
--    Same fix: re-run refresh_signal_pool_for_pair.
--
-- Returns jsonb summary of work done.

CREATE OR REPLACE FUNCTION m.reconcile_signal_pool()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_orphans_deactivated integer := 0;
  v_class_drift_corrected integer := 0;
  v_fitness_drift_corrected integer := 0;
  v_row record;
BEGIN
  -- A. ORPHANED: deactivate pool entries whose canonical_vertical_map mapping is gone
  UPDATE m.signal_pool sp
  SET is_active = FALSE, updated_at = now()
  WHERE sp.is_active = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM f.canonical_vertical_map cvm
      WHERE cvm.canonical_id = sp.canonical_id
        AND cvm.vertical_id = sp.vertical_id
    );
  GET DIAGNOSTICS v_orphans_deactivated = ROW_COUNT;

  -- B + C. Class or fitness drift: walk active pool entries, compare to source-of-truth
  FOR v_row IN
    SELECT sp.canonical_id, sp.vertical_id, sp.content_class AS pool_class,
           ccb.content_class AS body_class,
           sp.fitness_score_max AS pool_fmax,
           (SELECT MAX(fitness_score) FROM t.class_format_fitness
            WHERE class_code = ccb.content_class AND is_current = TRUE) AS expected_fmax
    FROM m.signal_pool sp
    JOIN f.canonical_content_body ccb ON ccb.canonical_id = sp.canonical_id
    WHERE sp.is_active = TRUE
      AND ccb.content_class IS NOT NULL
  LOOP
    IF v_row.pool_class IS DISTINCT FROM v_row.body_class THEN
      PERFORM m.refresh_signal_pool_for_pair(v_row.canonical_id, v_row.vertical_id);
      v_class_drift_corrected := v_class_drift_corrected + 1;
    ELSIF v_row.pool_fmax IS DISTINCT FROM v_row.expected_fmax
          AND v_row.expected_fmax IS NOT NULL THEN
      PERFORM m.refresh_signal_pool_for_pair(v_row.canonical_id, v_row.vertical_id);
      v_fitness_drift_corrected := v_fitness_drift_corrected + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'orphans_deactivated', v_orphans_deactivated,
    'class_drift_corrected', v_class_drift_corrected,
    'fitness_drift_corrected', v_fitness_drift_corrected,
    'ran_at', now()
  );
END;
$$;

COMMENT ON FUNCTION m.reconcile_signal_pool() IS
  'Full pool reconciliation: deactivates orphans, fixes class drift, fixes fitness drift. Runs daily. Returns jsonb summary. Stage 4.022.';
