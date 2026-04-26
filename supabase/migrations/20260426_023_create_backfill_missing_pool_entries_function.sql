-- Stage 4.023 — m.backfill_missing_pool_entries: LD19 batch-bounded backfill
--
-- Picks classified canonicals from the last 7 days that don't yet have
-- canonical_vertical_map rows, and runs them through the resolution chain.
-- Trigger 2 fires automatically on each canonical_vertical_map insert,
-- populating m.signal_pool.
--
-- LD19: hard LIMIT 100 + 60s statement_timeout per call.
-- Caller invokes repeatedly until function returns 0.
--
-- Idempotent: ON CONFLICT DO NOTHING on canonical_vertical_map insert.
-- Also catches the rare case where vertical_map rows exist but signal_pool
-- doesn't (Trigger 2 transaction rollback) — explicitly refreshes pool for
-- those.

CREATE OR REPLACE FUNCTION m.backfill_missing_pool_entries()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_processed_count integer := 0;
  v_pool_refreshed_count integer := 0;
  v_canonical record;
BEGIN
  -- LD19: per-call timeout
  SET LOCAL statement_timeout = '60s';

  -- Phase 1: canonicals with no vertical_map rows yet
  FOR v_canonical IN
    SELECT cci.canonical_id
    FROM f.canonical_content_item cci
    JOIN f.canonical_content_body ccb ON ccb.canonical_id = cci.canonical_id
    WHERE ccb.content_class IS NOT NULL
      AND cci.first_seen_at > now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM f.canonical_vertical_map cvm
        WHERE cvm.canonical_id = cci.canonical_id
      )
    ORDER BY cci.first_seen_at DESC
    LIMIT 100  -- LD19 batch cap
  LOOP
    -- Insert one canonical_vertical_map row per resolved vertical.
    -- Trigger 2 fires automatically and populates signal_pool.
    INSERT INTO f.canonical_vertical_map (canonical_id, vertical_id, mapping_source)
    SELECT v_canonical.canonical_id, vertical_id, 'backfill'
    FROM m.resolve_canonical_verticals(v_canonical.canonical_id)
    ON CONFLICT (canonical_id, vertical_id) DO NOTHING;

    v_processed_count := v_processed_count + 1;
  END LOOP;

  -- Phase 2: defensive — canonicals that have vertical_map rows but missing
  -- signal_pool entries (Trigger 2 transaction rolled back somehow).
  -- Limited to a small batch so this can't dominate the call.
  FOR v_canonical IN
    SELECT cvm.canonical_id, cvm.vertical_id
    FROM f.canonical_vertical_map cvm
    JOIN f.canonical_content_body ccb ON ccb.canonical_id = cvm.canonical_id
    JOIN f.canonical_content_item cci ON cci.canonical_id = cvm.canonical_id
    WHERE ccb.content_class IS NOT NULL
      AND cci.first_seen_at > now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM m.signal_pool sp
        WHERE sp.canonical_id = cvm.canonical_id
          AND sp.vertical_id = cvm.vertical_id
      )
    LIMIT 100
  LOOP
    PERFORM m.refresh_signal_pool_for_pair(v_canonical.canonical_id, v_canonical.vertical_id);
    v_pool_refreshed_count := v_pool_refreshed_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'processed_canonicals', v_processed_count,
    'pool_refreshed', v_pool_refreshed_count,
    'ran_at', now()
  );
END;
$$;

COMMENT ON FUNCTION m.backfill_missing_pool_entries() IS
  'LD19 batch-bounded backfill. Phase 1: insert canonical_vertical_map for unmapped canonicals (last 7d). Phase 2: refresh signal_pool for any vertical_map rows missing pool entries. LIMIT 100 + 60s timeout per call. Stage 4.023.';
