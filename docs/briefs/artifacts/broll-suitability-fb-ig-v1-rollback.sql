-- ============================================================================
-- B-roll platform suitability (facebook + instagram) v1 — ROLLBACK
-- Deletes exactly the 2 rows the forward packet inserted, returning facebook and
-- instagram to the incumbent, and PROVES the restore by re-asserting selection.
-- Identity-pinned: refuses to run against a state it did not create.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  c_tid       CONSTANT uuid := 'dd5fd75e-982d-4c3d-89cd-7ce0936076b2';
  c_incumbent CONSTANT text := 'video_stat_reveal_9x16_v2';
  c_broll     CONSTANT text := 'AU_generic_national_Suburb_9:16_V1';

  v_n           int;
  v_left        int;
  v_before_null jsonb;
  v_after_null  jsonb;
  v_fb          text;
  v_ig          text;
BEGIN
  -- G0 — arm atomicity before any write.
  PERFORM set_config('ice.rollback_txid', txid_current()::text, TRUE);
  IF current_setting('ice.rollback_txid', TRUE) IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'G0 FAILED: atomicity guard could not be armed — refusing to write';
  END IF;

  -- G1 — identity pin: exactly the 2 applied rows must be present, nothing else.
  IF (SELECT count(*) FROM c.creative_template_platform_suitability
       WHERE template_id = c_tid) <> 2
     OR (SELECT count(*) FROM c.creative_template_platform_suitability
          WHERE template_id = c_tid
            AND platform IN ('facebook','instagram')
            AND placement = 'feed'
            AND suitability_status = 'candidate') <> 2 THEN
    RAISE EXCEPTION 'G1 FAILED: template % is not in the exact applied state (2 rows: fb+ig/feed/candidate) — this rollback did not create the current state, refusing to write', c_tid;
  END IF;

  v_before_null := public.select_template('property-pulse', NULL, 'video_short_stat', NULL, 'rollback-probe');

  -- ---- THE RESTORE ------------------------------------------------------
  DELETE FROM c.creative_template_platform_suitability
   WHERE template_id = c_tid
     AND platform IN ('facebook','instagram')
     AND placement = 'feed'
     AND suitability_status = 'candidate';
  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF v_n <> 2 THEN
    RAISE EXCEPTION 'G2 FAILED: expected exactly 2 rows deleted, got % — refusing to commit', v_n;
  END IF;

  -- G3 — PROVE the restore: zero suitability rows remain for this template.
  SELECT count(*) INTO v_left
    FROM c.creative_template_platform_suitability WHERE template_id = c_tid;
  IF v_left <> 0 THEN
    RAISE EXCEPTION 'G3 FAILED: % suitability row(s) still remain for this template — refusing to commit', v_left;
  END IF;

  -- G4 — facebook + instagram are back on the incumbent.
  v_fb := public.select_template('property-pulse','facebook','video_short_stat',NULL,'rollback-probe')->'selected'->>'provider_template_name';
  v_ig := public.select_template('property-pulse','instagram','video_short_stat',NULL,'rollback-probe')->'selected'->>'provider_template_name';
  IF v_fb IS DISTINCT FROM c_incumbent OR v_ig IS DISTINCT FROM c_incumbent THEN
    RAISE EXCEPTION 'G4 FAILED: expected the incumbent % at fb/ig after rollback, got fb=% ig=% — refusing to commit',
      c_incumbent, COALESCE(v_fb,'(none)'), COALESCE(v_ig,'(none)');
  END IF;

  -- G5 — production signature untouched throughout.
  v_after_null := public.select_template('property-pulse', NULL, 'video_short_stat', NULL, 'rollback-probe');
  IF (v_before_null->'selected'->>'provider_template_name')
     IS DISTINCT FROM (v_after_null->'selected'->>'provider_template_name')
     OR (v_after_null->'selected'->>'provider_template_name') IS DISTINCT FROM c_broll THEN
    RAISE EXCEPTION 'G5 FAILED: production-signature winner moved during rollback — refusing to commit';
  END IF;

  IF current_setting('ice.rollback_txid', TRUE) IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'G0 FAILED (post): transaction identity changed mid-rollback — refusing to commit';
  END IF;

  RAISE NOTICE 'ROLLBACK OK: 2 rows deleted; fb+ig back on the incumbent; production winner unchanged';
END $$;

COMMIT;
