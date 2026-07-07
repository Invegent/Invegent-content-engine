import json, hashlib, os, io
os.chdir(os.path.dirname(os.path.abspath(__file__)))
PP='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
AID='b3a20012-9c4e-4f7a-8d21-0d5e6f7a8b12'
KEY='bg_pp_city_skyline_vantage'
SHA='2ef9d39b15ba0e683e7e3bd3b3114a91e3b6df6b38aa0e3529155e58fb45c66d'
LANE='pp-bg-skyline-promo (2026-07-06)'
PACKET='_harness/image_harvester_v0/run8_balcony_coastal/skyline_promo/SKYLINE_PROMO_GATE_PACKET.md'
PRIOR=['bg_brisbane_cbd','bg_perth_cbd','bg_pp_advisory_desk_flatlay','bg_pp_au_suburb_aerial_grid','bg_pp_coastal_waterfront',
       'bg_pp_home_keys_contract_table','bg_pp_kitchen_living_open_plan','bg_pp_market_data_chart_grid',
       'bg_pp_perth_cbd_skyline_day_wide','bg_sydney_cbd']

# EXACT pre-promotion fenced asset_meta (identical to the run8 intake build) — verbatim for byte-exact demotion
fenced_meta={"mime":"image/jpeg","bytes":1254714,"width":4000,"height":2667,"sha256":SHA,
 "sha256_source":"run8 harvest final hashed at intake build 2026-07-06; upload target Property_Pulse/Backgrounds/bg_pp_city_skyline_vantage.jpg size-prechecked in-SQL + post-upload public-URL sha256 verified",
 "usage":"background","bucket":"brand-assets","source_path":"Property_Pulse/Backgrounds/bg_pp_city_skyline_vantage.jpg","asset_key":KEY,"aspect_ratio":"3:2","visual_style":"photographic",
 "license":"Pexels License","license_type":"pexels_license","license_url":"https://www.pexels.com/license/","attribution_required":False,
 "attribution_note":"Photo by Kaique Rocha on Pexels (courtesy credit; attribution not legally required)",
 "photographer":"Kaique Rocha","source_site":"pexels","source_url":"https://www.pexels.com/photo/aerial-photography-of-city-skyline-97906/",
 "original_download_url":"https://images.pexels.com/photos/97906/pexels-photo-97906.jpeg","source_pexels_id":"97906",
 "approved":False,"approval_status":"intake_candidate","production_use_allowed":False,
 "pk_decision":"intake_only (run8 balcony/coastal batch, PK-gated 2026-07-06); production approval/promotion requires a separate PK gate — Option D: resolver pool is production-live",
 "visual_review_verdict":"ACCEPT_VISUAL_ONLY",
 "visual_review_note":"run8 Row A best-pick; PK ACCEPT (generic) 2026-07-06. Elevated dense city skyline under large clean sky; strong upper negative space.",
 "text_safety":"no legible third-party signage/brand/watermark/rego/boat-name in the 1:1 centre-crop band (image-reviewer + orchestrator concur)",
 "crop_proof":"PASSED — orchestrator 1:1 centre-crop at 1080 under scrim 0.56, headline crisp over clean negative space, zero legible text survives. Artifacts: _harness/image_harvester_v0/run8_balcony_coastal/orch_cropproof/",
 "scrim_proof_spec":"1:1, 1080px, scrim 0.56","ai_exclusion":"n/a — real photograph (Pexels), not AI-generated; reviewer + orchestrator concur",
 "suggested_scrim_opacity":0.56,"safe_for_text_overlay":"needs_scrim",
 "harvest_lane":"cc-0027 image-harvester run8 balcony/coastal (2026-07-06)","intake_lane_batch":"pp-bg-balcony-coastal-intake (2026-07-06)",
 "review_packet":"_harness/image_harvester_v0/run8_balcony_coastal/intake/BALCONY_COASTAL_INTAKE_GATE_PACKET.md",
 "dominant_visual":"Elevated dense city skyline (Sao Paulo, Brazil) under a large clean blue sky with scattered cloud; strong upper-third negative space; person-free.",
 "label_constraint":"GENERIC non-Australian skyline (Sao Paulo) — usable generic-only; NEVER label AU/Perth/WA/any Australian capital; the pool already carries real Perth/Brisbane/Sydney CBD skylines.",
 "geography":"generic_non_au"}

fenced_json=json.dumps(fenced_meta, ensure_ascii=False, separators=(',',':')).replace("'","''")

promote_patch={"approved":True,"approval_status":"governed","production_use_allowed":True,"approved_by":"PK",
 "pk_decision":"promote (city_skyline_vantage, PK-ratified 2026-07-06) — LIVE PRODUCTION CHANGE acknowledged: joins the Option-D resolver pool (fb/li/ig); pool 10/10/10/9 → 11/11/11/10; GENERIC-only geography fence (never label AU/Perth/WA — it is Sao Paulo) remains binding",
 "promotion_lane":LANE,"promotion_packet":PACKET}
patch_json=json.dumps(promote_patch, ensure_ascii=False, separators=(',',':')).replace("'","''")
prior_sql="','".join(PRIOR)

apply=f"""-- SKYLINE PROMOTION — promote 1 intake candidate to governed/active. *** LIVE PRODUCTION CHANGE ***
-- bg_pp_city_skyline_vantage (b3a20012…, GENERIC Sao Paulo skyline), platform_scope {{fb,ig,li}}.
-- Option D: resolver pool drives PP image_quote production. At COMMIT the eligible pool grows fb 10→11 / li 10→11 / ig 9→10.
-- §2 keeps the FULL T3 chain (P2 waiver is intake-only). PK gate = live-rotation acknowledgement. GEOGRAPHY FENCE: generic-only, never AU/Perth/WA.
BEGIN;

UPDATE c.client_brand_asset
SET is_active = true,
    asset_meta = asset_meta || '{patch_json}'::jsonb
      || jsonb_build_object('approved_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US+00:00')),
    notes = 'GOVERNED (promoted from intake_candidate 2026-07-06, PK skyline promotion — LIVE production-rotation change acknowledged: joins Option-D pool fb/li/ig). GENERIC non-Australian skyline (Sao Paulo); usable generic-only; NEVER label AU/Perth/WA/any Australian capital.',
    updated_at = now()
WHERE asset_id = '{AID}' AND client_id = '{PP}' AND asset_meta->>'asset_key' = '{KEY}'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
  AND asset_meta->>'approval_status' = 'intake_candidate'
  AND asset_meta->>'sha256' = '{SHA}';

DO $$
DECLARE promoted int; pool int; fb int; li int; ig int; gov int;
BEGIN
  SELECT count(*) INTO promoted FROM c.client_brand_asset
  WHERE asset_id = '{AID}'
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE
    AND asset_meta->>'approval_status' = 'governed' AND (asset_meta->>'production_use_allowed')::boolean IS TRUE
    AND asset_meta->>'promotion_lane' = '{LANE}' AND asset_meta ? 'approved_at' AND asset_meta->>'approved_by' = 'PK';
  IF promoted <> 1 THEN RAISE EXCEPTION 'skyline-promo verify failed: % promoted, expected 1 — rolled back', promoted; END IF;

  WITH elig AS (
    SELECT a.platform_scope FROM c.client_brand_asset a
    WHERE a.client_id='{PP}' AND a.asset_meta->>'usage'='background'
      AND a.is_active AND (a.asset_meta->>'approved')::boolean
      AND (a.asset_meta->>'license_type' IS NOT NULL OR a.asset_meta->>'license' IS NOT NULL)
      AND COALESCE(a.asset_meta->>'bucket','')='brand-assets'
      AND a.asset_meta->>'safe_for_text_overlay' IN ('true','needs_scrim'))
  SELECT count(*), count(*) FILTER (WHERE platform_scope IS NULL OR 'facebook'=ANY(platform_scope)),
         count(*) FILTER (WHERE platform_scope IS NULL OR 'linkedin'=ANY(platform_scope)),
         count(*) FILTER (WHERE platform_scope IS NULL OR 'instagram'=ANY(platform_scope))
    INTO pool, fb, li, ig FROM elig;
  IF pool<>11 OR fb<>11 OR li<>11 OR ig<>10 THEN
    RAISE EXCEPTION 'skyline-promo verify failed: pool (all=% fb=% li=% ig=%), expected 11/11/11/10 — rolled back', pool, fb, li, ig; END IF;

  SELECT count(*) INTO gov FROM c.client_brand_asset
  WHERE client_id='{PP}' AND asset_meta->>'asset_key' IN ('{prior_sql}')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF gov <> 10 THEN RAISE EXCEPTION 'skyline-promo verify failed: prior governed set=%, expected 10 untouched — rolled back', gov; END IF;
END $$;

COMMIT;"""
io.open('skyline_promo_apply.sql','w',encoding='utf-8',newline='\n').write(apply+'\n')

rollback=f"""-- SKYLINE PROMOTION ROLLBACK (demotion): restore the row to its exact pre-promotion candidate state.
-- *** LIVE PRODUCTION CHANGE IN REVERSE *** — pool returns 11/11/11/10 → 10/10/10/9 on COMMIT.
BEGIN;

UPDATE c.client_brand_asset
SET is_active = false, asset_meta = '{fenced_json}'::jsonb,
    notes = 'Intake candidate (run8 balcony/coastal, ACCEPT_VISUAL_ONLY 2026-07-06). GENERIC non-Australian skyline (Sao Paulo) — usable generic-only; NEVER label AU/Perth/WA/any Australian capital; the pool already carries real Perth/Brisbane/Sydney CBD skylines. Promotion = separate PK gate (Option D production-live).',
    updated_at = now()
WHERE asset_id = '{AID}' AND asset_meta->>'asset_key' = '{KEY}';

DO $$ DECLARE n int; pool int; BEGIN
  SELECT count(*) INTO n FROM c.client_brand_asset
  WHERE asset_id = '{AID}' AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status'='intake_candidate' AND NOT (asset_meta ? 'promotion_lane');
  IF n <> 1 THEN RAISE EXCEPTION 'skyline-promo demotion failed: % restored, expected 1', n; END IF;
  WITH elig AS (SELECT a.platform_scope FROM c.client_brand_asset a WHERE a.client_id='{PP}' AND a.asset_meta->>'usage'='background'
    AND a.is_active AND (a.asset_meta->>'approved')::boolean AND (a.asset_meta->>'license_type' IS NOT NULL OR a.asset_meta->>'license' IS NOT NULL)
    AND COALESCE(a.asset_meta->>'bucket','')='brand-assets' AND a.asset_meta->>'safe_for_text_overlay' IN ('true','needs_scrim'))
  SELECT count(*) INTO pool FROM elig;
  IF pool <> 10 THEN RAISE EXCEPTION 'skyline-promo demotion failed: pool=%, expected restored 10', pool; END IF;
END $$;
COMMIT;"""
io.open('skyline_promo_rollback.sql','w',encoding='utf-8',newline='\n').write(rollback+'\n')

for f in ('skyline_promo_apply.sql','skyline_promo_rollback.sql'):
    print(f, hashlib.sha256(open(f,'rb').read()).hexdigest(), os.path.getsize(f),'bytes')
