import json, hashlib, os, io
os.chdir(os.path.dirname(os.path.abspath(__file__)))
PP='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
AID='b3a20011-9c4e-4f7a-8d21-0d5e6f7a8b11'
KEY='bg_pp_market_data_chart_grid'
SHA='d3cb9b1c305d207bde49c3a114b51fa33b5693dd0fed9c5f73ec94addaf517b0'
LANE='pp-bg-mktdata-promo (2026-07-06)'
PACKET='_harness/image_harvester_v0/mktdata_promo/MKTDATA_PROMO_GATE_PACKET.md'
# the 8 current governed keys (verified live 2026-07-06) that MUST stay governed
PRIOR=['bg_brisbane_cbd','bg_perth_cbd','bg_pp_advisory_desk_flatlay','bg_pp_au_suburb_aerial_grid',
       'bg_pp_home_keys_contract_table','bg_pp_kitchen_living_open_plan','bg_pp_perth_cbd_skyline_day_wide','bg_sydney_cbd']

# EXACT pre-promotion fenced asset_meta (identical to the intake build) — used verbatim for byte-exact demotion
fenced_meta={"mime":"image/jpeg","bytes":1147375,"width":2400,"height":3600,"sha256":SHA,
 "sha256_source":"market-data re-source final hashed at intake build 2026-07-06; upload target Property_Pulse/Backgrounds/bg_pp_market_data_chart_grid.jpg size-prechecked in-SQL + post-upload public-URL sha256 verified",
 "usage":"background","bucket":"brand-assets","source_path":"Property_Pulse/Backgrounds/bg_pp_market_data_chart_grid.jpg","asset_key":KEY,"aspect_ratio":"2:3","visual_style":"photographic",
 "license":"Pexels License","license_type":"pexels_license","license_url":"https://www.pexels.com/license/","attribution_required":False,
 "attribution_note":"Photo by cottonbro studio on Pexels (courtesy credit; attribution not legally required)",
 "photographer":"cottonbro studio","source_site":"pexels","source_url":"https://www.pexels.com/photo/chart-on-black-background-6203470/",
 "original_download_url":"https://images.pexels.com/photos/6203470/pexels-photo-6203470.jpeg","source_pexels_id":"6203470",
 "approved":False,"approval_status":"intake_candidate","production_use_allowed":False,
 "pk_decision":"intake_only (market-data re-source intake, PK-gated 2026-07-06); production approval/promotion requires a separate PK gate — Option D: resolver pool is production-live, so any future promotion changes production rotation",
 "visual_review_verdict":"ACCEPT_VISUAL_ONLY",
 "visual_review_note":"market-data RE-SOURCE best-pick (replaces the HELD Morris-Charts pick). PK ACCEPT_VISUAL_ONLY 2026-07-06. Reads clearly as market/data (neon line-chart on dark grid).",
 "text_safety":"zero legible text — no ticker, claim, date, legend, brand, or agency text anywhere in the full frame",
 "crop_proof":"PASSED — orchestrator re-ran the exact 1:1 centre-crop at 1080 under scrim 0.56 (the proof the prior Morris-Charts pick failed); zero legible text survives. Artifacts: _harness/image_harvester_v0/run7_mktdata_resource/orch_cropproof/",
 "scrim_proof_spec":"1:1, 1080px, scrim 0.56",
 "ai_exclusion":"AI-diffusion exclusion CLEARED — real photo-of-screen (display moire, RGB sub-pixel bloom, natural exposure, coherent grid); reviewer + orchestrator concur, not AI-generated",
 "suggested_scrim_opacity":0.56,"safe_for_text_overlay":"needs_scrim",
 "harvest_lane":"cc-0027 image-harvester market-data re-source run7 (2026-07-06)","intake_lane_batch":"pp-bg-mktdata-intake (2026-07-06)",
 "review_packet":"_harness/image_harvester_v0/mktdata_intake/MKTDATA_INTAKE_GATE_PACKET.md",
 "dominant_visual":"Neon-blue jagged line chart over a plain grid on a dark screen; pure graphical shapes, no labels or numbers.",
 "label_constraint":"abstract market/data line-chart-on-grid; generic, geography-neutral; text-clean (crop-proof passed)"}

def esc(s): return s.replace("'","''")
fenced_json=json.dumps(fenced_meta, ensure_ascii=False, separators=(',',':')).replace("'","''")

promote_patch={"approved":True,"approval_status":"governed","production_use_allowed":True,"approved_by":"PK",
 "pk_decision":"promote (market-data, PK-ratified 2026-07-06) — LIVE PRODUCTION CHANGE acknowledged: joins the Option-D resolver pool (fb/li/ig); pool 8/8/8/7 → fb9/li9/ig8; usage constraint (abstract market/data, geography-neutral, text-clean) remains binding",
 "promotion_lane":LANE,"promotion_packet":PACKET}
patch_json=json.dumps(promote_patch, ensure_ascii=False, separators=(',',':')).replace("'","''")
prior_sql="','".join(PRIOR)

apply=f"""-- MARKET-DATA PROMOTION — promote 1 intake candidate to governed/active. *** LIVE PRODUCTION CHANGE ***
-- bg_pp_market_data_chart_grid (b3a20011…), platform_scope {{fb,ig,li}}.
-- Option D: resolver pool drives PP image_quote production. At COMMIT the eligible pool grows
-- fb 8→9 / li 8→9 / ig 7→8. Rotation composition shifts on all three platforms. PK gate = acknowledgement.
BEGIN;

UPDATE c.client_brand_asset
SET is_active = true,
    asset_meta = asset_meta || '{patch_json}'::jsonb
      || jsonb_build_object('approved_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US+00:00')),
    notes = 'GOVERNED (promoted from intake_candidate 2026-07-06, PK market-data promotion — LIVE production-rotation change acknowledged: joins Option-D pool fb/li/ig). Abstract market/data line-chart-on-grid; text-clean (crop-proof passed); geography-neutral usage constraint stands.',
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
  IF promoted <> 1 THEN RAISE EXCEPTION 'mktdata-promo verify failed: % promoted, expected 1 — rolled back', promoted; END IF;

  -- eligible pool must become exactly 9 (fb9/li9/ig8) — production-live under Option D
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
  IF pool<>9 OR fb<>9 OR li<>9 OR ig<>8 THEN
    RAISE EXCEPTION 'mktdata-promo verify failed: pool (all=% fb=% li=% ig=%), expected 9/9/9/8 — rolled back', pool, fb, li, ig; END IF;

  -- prior 8 governed backgrounds must remain governed (untouched)
  SELECT count(*) INTO gov FROM c.client_brand_asset
  WHERE client_id='{PP}' AND asset_meta->>'asset_key' IN ('{prior_sql}')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF gov <> 8 THEN RAISE EXCEPTION 'mktdata-promo verify failed: prior governed set=%, expected 8 untouched — rolled back', gov; END IF;
END $$;

COMMIT;"""
io.open('mktdata_promo_apply.sql','w',encoding='utf-8',newline='\n').write(apply+'\n')

rollback=f"""-- MARKET-DATA PROMOTION ROLLBACK (demotion): restore the row to its exact pre-promotion candidate state.
-- *** LIVE PRODUCTION CHANGE IN REVERSE *** — pool returns fb9/li9/ig8 → 8/8/8/7 on COMMIT.
BEGIN;

UPDATE c.client_brand_asset
SET is_active = false, asset_meta = '{fenced_json}'::jsonb,
    notes = 'Intake candidate (market-data re-source, ACCEPT_VISUAL_ONLY 2026-07-06). Replaces the HELD Morris-Charts pick; zero legible text, crop-proof passed at 1:1 1080 scrim 0.56; AI-diffusion cleared (real photo-of-screen). Promotion = separate PK gate (Option D production-live).',
    updated_at = now()
WHERE asset_id = '{AID}' AND asset_meta->>'asset_key' = '{KEY}';

DO $$ DECLARE n int; pool int; BEGIN
  SELECT count(*) INTO n FROM c.client_brand_asset
  WHERE asset_id = '{AID}' AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status'='intake_candidate' AND NOT (asset_meta ? 'promotion_lane');
  IF n <> 1 THEN RAISE EXCEPTION 'mktdata-promo demotion failed: % restored, expected 1', n; END IF;
  WITH elig AS (SELECT a.platform_scope FROM c.client_brand_asset a WHERE a.client_id='{PP}' AND a.asset_meta->>'usage'='background'
    AND a.is_active AND (a.asset_meta->>'approved')::boolean AND (a.asset_meta->>'license_type' IS NOT NULL OR a.asset_meta->>'license' IS NOT NULL)
    AND COALESCE(a.asset_meta->>'bucket','')='brand-assets' AND a.asset_meta->>'safe_for_text_overlay' IN ('true','needs_scrim'))
  SELECT count(*) INTO pool FROM elig;
  IF pool <> 8 THEN RAISE EXCEPTION 'mktdata-promo demotion failed: pool=%, expected restored 8', pool; END IF;
END $$;
COMMIT;"""
io.open('mktdata_promo_rollback.sql','w',encoding='utf-8',newline='\n').write(rollback+'\n')

for f in ('mktdata_promo_apply.sql','mktdata_promo_rollback.sql'):
    print(f, hashlib.sha256(open(f,'rb').read()).hexdigest(), os.path.getsize(f),'bytes')
