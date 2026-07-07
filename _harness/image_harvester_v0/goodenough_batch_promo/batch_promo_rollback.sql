-- GOOD-ENOUGH BATCH PROMOTION ROLLBACK (demotion): mechanical reversal → each row restored byte-exact.
-- *** LIVE PRODUCTION CHANGE IN REVERSE *** — pool returns 17/17/15/14 → 11/11/11/10 on COMMIT.
BEGIN;
UPDATE c.client_brand_asset
SET is_active = false,
    asset_meta = (asset_meta - 'approved_by' - 'approved_at' - 'promotion_decision' - 'promotion_lane' - 'promotion_packet')
      || '{"approved":false,"approval_status":"intake_candidate","production_use_allowed":false}'::jsonb,
    updated_at = now()
WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'promotion_lane' = 'pp-bg-goodenough-batch-promo (2026-07-06)';

DO $$ DECLARE n int; pool int; BEGIN
  SELECT count(*) INTO n FROM c.client_brand_asset
  WHERE asset_id IN ('b2a10005-9c4e-4f7a-8d21-0d5e6f7a8b05','b3a20005-9c4e-4f7a-8d21-0d5e6f7a8b05','b3a20006-9c4e-4f7a-8d21-0d5e6f7a8b06','b3a20007-9c4e-4f7a-8d21-0d5e6f7a8b07','b3a20008-9c4e-4f7a-8d21-0d5e6f7a8b08','b2a10003-9c4e-4f7a-8d21-0d5e6f7a8b03') AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status'='intake_candidate' AND NOT (asset_meta ? 'promotion_lane');
  IF n <> 6 THEN RAISE EXCEPTION 'batch-promo demotion failed: % restored, expected 6', n; END IF;
  WITH elig AS (SELECT a.platform_scope FROM c.client_brand_asset a WHERE a.client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND a.asset_meta->>'usage'='background'
    AND a.is_active AND (a.asset_meta->>'approved')::boolean AND (a.asset_meta->>'license_type' IS NOT NULL OR a.asset_meta->>'license' IS NOT NULL)
    AND COALESCE(a.asset_meta->>'bucket','')='brand-assets' AND a.asset_meta->>'safe_for_text_overlay' IN ('true','needs_scrim'))
  SELECT count(*) INTO pool FROM elig;
  IF pool <> 11 THEN RAISE EXCEPTION 'batch-promo demotion failed: pool=%, expected restored 11', pool; END IF;
END $$;
COMMIT;
