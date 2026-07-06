import json, hashlib, os, io
os.chdir(os.path.dirname(os.path.abspath(__file__)))
PP='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
LANE='pp-bg-promo-v2 (2026-07-06)'
PKT='_harness/image_harvester_v0/promo_review2/PROMOTION_V2_GATE_PACKET.md'

KITCHEN_META={"mime":"image/jpeg","bytes":12141430,"usage":"background","width":8640,"bucket":"brand-assets","height":5760,"sha256":"c889522be3da733e2b19a6b62b20a268e9c989de90430b40896f6b85b6325c27","license":"Unsplash License","approved":False,"asset_key":"bg_pp_kitchen_living_open_plan","source_url":"https://unsplash.com/photos/DFWU_G1ZZdo","license_url":"https://unsplash.com/license","pk_decision":"intake_only (B3 batch-intake, PK-gated 2026-07-06); production approval/promotion requires a separate PK gate — Option D: resolver pool is production-live, so any future promotion changes production rotation","source_path":"Property_Pulse/Backgrounds/bg_pp_kitchen_living_open_plan.jpg","source_site":"unsplash","aspect_ratio":"3:2","harvest_lane":"cc-0027 image-harvester B3 (2026-07-06)","license_type":"unsplash_license","photographer":"Ibrar Tariq (@stellar_shotsstudio)","visual_style":"photographic","review_packet":"_harness/image_harvester_v0/batch_intake/BATCH_INTAKE_GATE_PACKET.md","sha256_source":"B3 harvest final hashed at batch build 2026-07-06; upload target Property_Pulse/Backgrounds/bg_pp_kitchen_living_open_plan.jpg size-prechecked in-SQL + post-upload public-URL sha256 verified","approval_status":"intake_candidate","dominant_visual":"Luxury Australian open-plan kitchen + dining: travertine-look feature wall, stone waterfall island with clear benchtop, oak joinery, white stools, oval walnut dining table; sunset sunburst through glass doors onto AU suburban backdrop (weatherboard neighbour, tiled roofs, Colorbond fence); no people","attribution_note":"Photo by Ibrar Tariq on Unsplash (courtesy credit; attribution not legally required)","intake_lane_batch":"pp-bg-b3-batch-intake (2026-07-06)","visual_review_note":"B3M1 best-pick; ACCEPT_VISUAL_ONLY 2026-07-06; verified-AU open-plan; warm sunset-flare mood (style note)","attribution_required":False,"original_download_url":"https://unsplash.com/photos/DFWU_G1ZZdo/download?force=true","safe_for_text_overlay":"needs_scrim","visual_review_verdict":"ACCEPT_VISUAL_ONLY","production_use_allowed":False,"suggested_scrim_opacity":0.52}
KITCHEN_NOTES="Intake candidate (B3 batch, ACCEPT_VISUAL_ONLY 2026-07-06). Promotion = separate PK gate (Option D production-live)."

ADVISORY_META={"mime":"image/jpeg","bytes":2948464,"usage":"background","width":6000,"bucket":"brand-assets","height":4000,"sha256":"97e00405eb8c260c2376b3efd05ba6cebeb0ba4a8dfc2ddb7c646f3a3d0cf98a","license":"Pexels License","approved":False,"asset_key":"bg_pp_advisory_desk_flatlay","source_url":"https://www.pexels.com/photo/11391944/","license_url":"https://www.pexels.com/license/","pk_decision":"intake_only (B3M4 intake, PK-gated 2026-07-06); production approval/promotion requires a separate PK gate — Option D: resolver pool is production-live, so any future promotion changes production rotation","source_path":"Property_Pulse/Backgrounds/bg_pp_advisory_desk_flatlay.jpg","source_site":"pexels","aspect_ratio":"3:2","harvest_lane":"cc-0027 image-harvester B3M4 (2026-07-06)","license_type":"pexels_license","photographer":"Towfiqu barbhuiya","visual_style":"photographic","review_packet":"_harness/image_harvester_v0/b3m4_intake/B3M4_INTAKE_GATE_PACKET.md","sha256_source":"B3M4 harvest final hashed at intake build 2026-07-06; upload target Property_Pulse/Backgrounds/bg_pp_advisory_desk_flatlay.jpg size-prechecked in-SQL + post-upload public-URL sha256 verified","approval_status":"intake_candidate","dominant_visual":"Person-free top-down advisory desk flat-lay on warm wood: tablet with blank grey screen, black reading glasses, gold ballpoint pen, small succulent; no branding, no readable text, no faces.","attribution_note":"Photo by Towfiqu barbhuiya on Pexels (courtesy credit; attribution not legally required)","label_constraint":"person-free advisory/desk flat-lay; generic, never location-specific; REFRAME of the workbook agent-tablet slot (no identifiable person, no model release) — key proposed bg_pp_advisory_desk_flatlay (PK may instead key bg_pp_real_estate_agent_tablet to fill that workbook row)","intake_lane_batch":"pp-bg-b3m4-intake (2026-07-06)","visual_review_note":"B3M4 best-pick; ACCEPT_VISUAL_ONLY 2026-07-06; person-free advisory desk; reviewer PASS zero scope flags","attribution_required":False,"original_download_url":"https://images.pexels.com/photos/11391944/pexels-photo-11391944.jpeg","safe_for_text_overlay":"needs_scrim","visual_review_verdict":"ACCEPT_VISUAL_ONLY","production_use_allowed":False,"suggested_scrim_opacity":0.55}
ADVISORY_NOTES="Intake candidate (B3M4, ACCEPT_VISUAL_ONLY 2026-07-06). person-free advisory/desk flat-lay; generic, never location-specific; REFRAME of the workbook agent-tablet slot (no identifiable person, no model release) — key proposed bg_pp_advisory_desk_flatlay (PK may instead key bg_pp_real_estate_agent_tablet to fill that workbook row) Promotion = separate PK gate (Option D production-live)."

ROWS=[
 dict(aid='b3a20003-9c4e-4f7a-8d21-0d5e6f7a8b03', key='bg_pp_kitchen_living_open_plan', rank='#1', sha=KITCHEN_META['sha256'], meta=KITCHEN_META, notes=KITCHEN_NOTES,
      new_notes='GOVERNED (promoted from intake_candidate 2026-07-06, PK promotion review v2 #1 — LIVE production-rotation change acknowledged: joins Option-D pool fb/li/ig). Verified-AU open-plan; warm sunset-flare mood (style note); first interior in the pool.'),
 dict(aid='b3a20009-9c4e-4f7a-8d21-0d5e6f7a8b09', key='bg_pp_advisory_desk_flatlay', rank='#2', sha=ADVISORY_META['sha256'], meta=ADVISORY_META, notes=ADVISORY_NOTES,
      new_notes='GOVERNED (promoted from intake_candidate 2026-07-06, PK promotion review v2 #2 — LIVE production-rotation change acknowledged: joins Option-D pool fb/li/ig). Person-free advisory desk; usage constraint stands: generic, never location-specific.'),
]
json.dump({r['aid']:{'key':r['key'],'meta':r['meta'],'notes':r['notes']} for r in ROWS},
          io.open('before_state.json','w',encoding='utf-8'), indent=1, ensure_ascii=False)

def jstr(o): return json.dumps(o, ensure_ascii=False, separators=(',',':')).replace("'","''")
def esc(s): return s.replace("'","''")

parts=["""-- PROMOTION v2 — promote 2 intake candidates to governed/active. *** LIVE PRODUCTION CHANGE ***
-- kitchen_living_open_plan (#1) + advisory_desk_flatlay (#2), both platform_scope {fb,ig,li}.
-- Option D: resolver pool drives PP image_quote production. At COMMIT the eligible pool grows
-- fb 6→8 / li 6→8 / ig 5→7. Rotation composition shifts on all three platforms. PK gate = acknowledgement.
BEGIN;"""]
for r in ROWS:
    merge={'approved':True,'approval_status':'governed','production_use_allowed':True,'approved_by':'PK',
      'pk_decision':f'promote (promotion review v2 {r["rank"]}, PK-ratified 2026-07-06) — LIVE PRODUCTION CHANGE acknowledged: joins the Option-D resolver pool (fb/li/ig); pool 6/6/6/5 → fb8/li8/ig7; usage constraints in visual_review_note/label_constraint remain binding',
      'promotion_lane':LANE,'promotion_packet':PKT}
    parts.append(f"""
-- {r['key']} ({r['rank']})
UPDATE c.client_brand_asset
SET is_active = true,
    asset_meta = asset_meta || '{jstr(merge)}'::jsonb
      || jsonb_build_object('approved_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US+00:00')),
    notes = '{esc(r['new_notes'])}',
    updated_at = now()
WHERE asset_id = '{r['aid']}' AND client_id = '{PP}' AND asset_meta->>'asset_key' = '{r['key']}'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
  AND asset_meta->>'approval_status' = 'intake_candidate'
  AND asset_meta->>'sha256' = '{r['sha']}';""")

parts.append(f"""
DO $$
DECLARE promoted int; pool int; fb int; li int; ig int; gov int;
BEGIN
  SELECT count(*) INTO promoted FROM c.client_brand_asset
  WHERE asset_id IN ('b3a20003-9c4e-4f7a-8d21-0d5e6f7a8b03','b3a20009-9c4e-4f7a-8d21-0d5e6f7a8b09')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE
    AND asset_meta->>'approval_status' = 'governed' AND (asset_meta->>'production_use_allowed')::boolean IS TRUE
    AND asset_meta->>'promotion_lane' = '{LANE}' AND asset_meta ? 'approved_at' AND asset_meta->>'approved_by' = 'PK';
  IF promoted <> 2 THEN RAISE EXCEPTION 'promo-v2 verify failed: % promoted, expected 2 — rolled back', promoted; END IF;

  -- eligible pool must become exactly 8 (fb8/li8/ig7) — production-live under Option D
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
  IF pool<>8 OR fb<>8 OR li<>8 OR ig<>7 THEN
    RAISE EXCEPTION 'promo-v2 verify failed: pool (all=% fb=% li=% ig=%), expected 8/8/8/7 — rolled back', pool, fb, li, ig; END IF;

  SELECT count(*) INTO gov FROM c.client_brand_asset
  WHERE client_id='{PP}' AND asset_meta->>'asset_key' IN
    ('bg_perth_cbd','bg_brisbane_cbd','bg_sydney_cbd','bg_pp_au_suburb_aerial_grid','bg_pp_home_keys_contract_table','bg_pp_perth_cbd_skyline_day_wide')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF gov <> 6 THEN RAISE EXCEPTION 'promo-v2 verify failed: prior governed set=%, expected 6 untouched — rolled back', gov; END IF;
END $$;

COMMIT;""")
io.open('promotion_apply.sql','w',encoding='utf-8',newline='\n').write('\n'.join(parts)+'\n')

rb=["""-- PROMOTION v2 ROLLBACK (demotion): restore both rows to exact pre-promotion candidate state.
-- *** LIVE PRODUCTION CHANGE IN REVERSE *** — pool returns fb8/li8/ig7 → 6/6/6/5 on COMMIT.
BEGIN;"""]
for r in ROWS:
    rb.append(f"""
UPDATE c.client_brand_asset
SET is_active = false, asset_meta = '{jstr(r['meta'])}'::jsonb, notes = '{esc(r['notes'])}', updated_at = now()
WHERE asset_id = '{r['aid']}' AND asset_meta->>'asset_key' = '{r['key']}';""")
rb.append(f"""
DO $$ DECLARE n int; pool int; BEGIN
  SELECT count(*) INTO n FROM c.client_brand_asset
  WHERE asset_id IN ('b3a20003-9c4e-4f7a-8d21-0d5e6f7a8b03','b3a20009-9c4e-4f7a-8d21-0d5e6f7a8b09')
    AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status'='intake_candidate' AND NOT (asset_meta ? 'promotion_lane');
  IF n <> 2 THEN RAISE EXCEPTION 'promo-v2 demotion failed: % restored, expected 2', n; END IF;
  WITH elig AS (SELECT a.platform_scope FROM c.client_brand_asset a WHERE a.client_id='{PP}' AND a.asset_meta->>'usage'='background'
    AND a.is_active AND (a.asset_meta->>'approved')::boolean AND (a.asset_meta->>'license_type' IS NOT NULL OR a.asset_meta->>'license' IS NOT NULL)
    AND COALESCE(a.asset_meta->>'bucket','')='brand-assets' AND a.asset_meta->>'safe_for_text_overlay' IN ('true','needs_scrim'))
  SELECT count(*) INTO pool FROM elig;
  IF pool <> 6 THEN RAISE EXCEPTION 'promo-v2 demotion failed: pool=%, expected restored 6', pool; END IF;
END $$;
COMMIT;""")
io.open('promotion_rollback.sql','w',encoding='utf-8',newline='\n').write('\n'.join(rb)+'\n')

# fidelity probe
probe=[]
for r in ROWS:
    probe.append(f"select '{r['key']}' k,(asset_meta='{jstr(r['meta'])}'::jsonb) meta_exact,(notes='{esc(r['notes'])}') notes_exact from c.client_brand_asset where asset_id='{r['aid']}'")
io.open('fidelity_check.sql','w',encoding='utf-8').write(' union all '.join(probe)+';')

for f in ('promotion_apply.sql','promotion_rollback.sql'):
    print(f, hashlib.sha256(open(f,'rb').read()).hexdigest(), os.path.getsize(f),'bytes')
