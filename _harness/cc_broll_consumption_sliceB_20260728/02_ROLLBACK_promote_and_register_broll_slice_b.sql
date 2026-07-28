-- ROLLBACK for Migration B — delete the registered template rows + reverse the clip promotion.
-- Run AFTER re-applying the resolver rollback (01_ROLLBACK) if you are fully unwinding Slice B.

-- Part 2 reverse: delete registration (child rows cascade via FK ON DELETE CASCADE from the template,
-- but delete explicitly for clarity / in case cascade is not relied upon).
DO $$
DECLARE
  v_tid uuid;
BEGIN
  SELECT id INTO v_tid FROM c.creative_provider_template
   WHERE provider = 'creatomate' AND provider_template_id = '46c5c4ac-4d35-488c-b57c-44e05d790fb9';
  IF v_tid IS NOT NULL THEN
    DELETE FROM c.creative_template_proof_event        WHERE template_id = v_tid;
    DELETE FROM c.creative_template_client_assignment  WHERE template_id = v_tid;
    -- Defensive, template_id-scoped: Migration B intentionally inserts NO platform_suitability row
    -- (containment), so this DELETE affects 0 rows here (AHA-07-1). Kept only to fully unwind a
    -- suitability row a later deliberate step might add for this template before an unwind.
    DELETE FROM c.creative_template_platform_suitability WHERE template_id = v_tid;
    DELETE FROM c.creative_template_variant_candidate  WHERE template_id = v_tid;
    DELETE FROM c.creative_provider_template_field      WHERE template_id = v_tid;
    DELETE FROM c.creative_provider_template            WHERE id = v_tid;
  END IF;
END $$;

-- Part 1 reverse: restore the clip to its fenced state (CAS on the governed state we set).
-- Wrapped with a fail-closed row-count assertion (mirrors the apply promotion) so an incomplete
-- unwind (CAS miss / state drift) ABORTS visibly instead of silently updating 0 rows (AHA-07-2).
DO $$
DECLARE v_n int;
BEGIN
  UPDATE c.client_brand_asset
  SET is_active = false,
      asset_meta = (asset_meta
        || jsonb_build_object(
             'approved',               false,
             'approval_status',        'intake_candidate',
             'production_use_allowed', false,
             'safe_for_text_overlay',  'needs_gradient_scrim'))
        - 'approved_by' - 'approved_at' - 'promotion_lane' - 'promotion_packet',
      updated_at = now()
  WHERE asset_id = '2d62b04e-c1b5-44df-b382-59cbb991e166'
    AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
    AND asset_meta->>'asset_key' = 'broll_pp_au_suburb_aerial'
    AND asset_meta->>'approval_status' = 'governed'
    AND asset_meta->>'sha256' = '4c89358d842db974c16354c88fb0e920bc2bd81ad24ff5c4ef7222a413da8885';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'SLICE_B_ROLLBACK_REFENCE_FAIL: expected 1 row, updated % (clip state drifted from governed)', v_n;
  END IF;
END $$;
