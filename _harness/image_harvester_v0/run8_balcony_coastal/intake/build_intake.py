import json, hashlib, os, io, shutil
os.chdir(os.path.dirname(os.path.abspath(__file__)))
PP='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
LANE='pp-bg-balcony-coastal-intake (2026-07-06)'
PACKET='_harness/image_harvester_v0/run8_balcony_coastal/intake/BALCONY_COASTAL_INTAKE_GATE_PACKET.md'

# Two rows — SAME SHAPE as the proven market-data/v5.12 fenced-intake template (P2 mechanical gate).
ROWS=[
 {"aid":"b3a20012-9c4e-4f7a-8d21-0d5e6f7a8b12","key":"bg_pp_city_skyline_vantage",
  "sha":"2ef9d39b15ba0e683e7e3bd3b3114a91e3b6df6b38aa0e3529155e58fb45c66d","bytes":1254714,"w":4000,"h":2667,
  "src":"../final/bg_pp_city_skyline_vantage.jpg","tgt":"Property_Pulse/Backgrounds/bg_pp_city_skyline_vantage.jpg",
  "name":"City skyline vantage (generic) background","pexels":"97906","photographer":"Kaique Rocha",
  "source_url":"https://www.pexels.com/photo/aerial-photography-of-city-skyline-97906/",
  "dl":"https://images.pexels.com/photos/97906/pexels-photo-97906.jpeg","aspect":"3:2",
  "vr_note":"run8 Row A best-pick; PK ACCEPT (generic) 2026-07-06. Elevated dense city skyline under large clean sky; strong upper negative space.",
  "dominant":"Elevated dense city skyline (Sao Paulo, Brazil) under a large clean blue sky with scattered cloud; strong upper-third negative space; person-free.",
  "label":"GENERIC non-Australian skyline (Sao Paulo) — usable generic-only; NEVER label AU/Perth/WA/any Australian capital; the pool already carries real Perth/Brisbane/Sydney CBD skylines.",
  "geo":"generic_non_au"},
 {"aid":"b3a20013-9c4e-4f7a-8d21-0d5e6f7a8b13","key":"bg_pp_coastal_waterfront",
  "sha":"b164c47a28edd1f5e24ab09fed932ba4d18cd3a53f595c009cd1debcea346966","bytes":1613937,"w":4000,"h":2666,
  "src":"../final/bg_pp_coastal_waterfront.jpg","tgt":"Property_Pulse/Backgrounds/bg_pp_coastal_waterfront.jpg",
  "name":"Coastal waterfront (AU) background","pexels":"33698814","photographer":"Paul Pulimoottil",
  "source_url":"https://www.pexels.com/photo/stunning-aerial-view-of-whitehaven-beach-australia-33698814/",
  "dl":"https://images.pexels.com/photos/33698814/pexels-photo-33698814.jpeg","aspect":"3:2",
  "vr_note":"run8 Row B best-pick; PK ACCEPT 2026-07-06. Verifiable AU coastal (Whitehaven Beach / Hill Inlet, Whitsundays QLD); turquoise water, clean upper sky/water negative space; two small unbranded moored vessels lower-centre (croppable/scrimmable).",
  "dominant":"Aerial AU coastal: Whitehaven Beach / Hill Inlet, Whitsundays QLD — turquoise water, white silica sand, forested headland, clean sky negative space; two small unbranded moored vessels lower-centre; no people; no readable branding.",
  "label":"Verifiable AU coastal (Whitehaven Beach, Whitsundays QLD) — label AU coastal ONLY; NEVER label Perth/WA (it is QLD, not WA); fills the pool's coastal gap.",
  "geo":"au_qld_not_wa"},
]

os.makedirs('upload_staging', exist_ok=True)
manifest=[]
for r in ROWS:
    dst='upload_staging/'+r['key']+'.jpg'
    shutil.copy2(r['src'],dst)
    h=hashlib.sha256(open(dst,'rb').read()).hexdigest()
    assert h==r['sha'] and os.path.getsize(dst)==r['bytes'], 'staged mismatch '+r['key']
    manifest.append({'asset_key':r['key'],'upload_file':dst,'target_path':'brand-assets/'+r['tgt'],'bytes':r['bytes'],'sha256':r['sha']})
json.dump(manifest, io.open('upload_manifest.json','w',encoding='utf-8'), indent=1)

def jstr(o): return json.dumps(o, ensure_ascii=False, separators=(',',':')).replace("'","''")
def esc(s): return s.replace("'","''")

def meta(r):
    return {"mime":"image/jpeg","bytes":r['bytes'],"width":r['w'],"height":r['h'],"sha256":r['sha'],
     "sha256_source":"run8 harvest final hashed at intake build 2026-07-06; upload target "+r['tgt']+" size-prechecked in-SQL + post-upload public-URL sha256 verified",
     "usage":"background","bucket":"brand-assets","source_path":r['tgt'],"asset_key":r['key'],"aspect_ratio":r['aspect'],"visual_style":"photographic",
     "license":"Pexels License","license_type":"pexels_license","license_url":"https://www.pexels.com/license/","attribution_required":False,
     "attribution_note":"Photo by "+r['photographer']+" on Pexels (courtesy credit; attribution not legally required)",
     "photographer":r['photographer'],"source_site":"pexels","source_url":r['source_url'],
     "original_download_url":r['dl'],"source_pexels_id":r['pexels'],
     "approved":False,"approval_status":"intake_candidate","production_use_allowed":False,
     "pk_decision":"intake_only (run8 balcony/coastal batch, PK-gated 2026-07-06); production approval/promotion requires a separate PK gate — Option D: resolver pool is production-live",
     "visual_review_verdict":"ACCEPT_VISUAL_ONLY","visual_review_note":r['vr_note'],
     "text_safety":"no legible third-party signage/brand/watermark/rego/boat-name in the 1:1 centre-crop band (image-reviewer + orchestrator concur)",
     "crop_proof":"PASSED — orchestrator 1:1 centre-crop at 1080 under scrim 0.56, headline crisp over clean negative space, zero legible text survives. Artifacts: _harness/image_harvester_v0/run8_balcony_coastal/orch_cropproof/",
     "scrim_proof_spec":"1:1, 1080px, scrim 0.56","ai_exclusion":"n/a — real photograph (Pexels), not AI-generated; reviewer + orchestrator concur",
     "suggested_scrim_opacity":0.56,"safe_for_text_overlay":"needs_scrim",
     "harvest_lane":"cc-0027 image-harvester run8 balcony/coastal (2026-07-06)","intake_lane_batch":LANE,
     "review_packet":PACKET,"dominant_visual":r['dominant'],"label_constraint":r['label'],"geography":r['geo']}

sql=[f"""-- RUN8 BALCONY/COASTAL BATCH INTAKE — 2 uploads + 2 INSERT-only double-fenced candidates.
-- T2 SAFETY_GATE. All four fences set. NOT approval/promotion. First lane under Image Workflow Accel v1 (P1 batch / P4 one pointer).
-- P2 mechanical same-shape gate PASSED vs the proven market-data/v5.12 template (same table · asset_type 'other' · identical
--    column set · four fences false · same eligibility key set [usage/bucket/license/safe_for_text_overlay/sha256/asset_key] ·
--    bucket=brand-assets · no DDL · no GRANT/REVOKE · no ON CONFLICT) → full review chain rides the proven shape; per-apply guards NOT waived.
-- POOL-NEUTRAL (machine-asserted): eligible pool UNCHANGED at fb 9 / li 9 / ig 8; is_active=false ⇒ resolver rejects at first filter.
BEGIN;"""]

for r in ROWS:
    sql.append(f"""
DO $$
BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='{r['tgt']}' AND (metadata->>'size')::bigint = {r['bytes']};
  IF NOT FOUND THEN RAISE EXCEPTION 'run8-intake precheck failed: {r['tgt']} missing or wrong size — rolled back'; END IF;
END $$;

INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT '{r['aid']}', '{PP}', 'other', '{esc(r['name'])}',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/{r['tgt']}',
       '{jstr(meta(r))}'::jsonb, ARRAY['facebook','instagram','linkedin'], false,
       'Intake candidate (run8 balcony/coastal, ACCEPT_VISUAL_ONLY 2026-07-06). {esc(r['label'])} Promotion = separate PK gate (Option D production-live).'
WHERE NOT EXISTS (SELECT 1 FROM c.client_brand_asset WHERE client_id='{PP}' AND asset_meta->>'asset_key'='{r['key']}');""")

sql.append(f"""
DO $$
DECLARE n int; pool int; fb int; li int; ig int;
BEGIN
  SELECT count(*) INTO n FROM c.client_brand_asset
  WHERE asset_id IN ('{ROWS[0]['aid']}','{ROWS[1]['aid']}') AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status'='intake_candidate' AND (asset_meta->>'production_use_allowed')::boolean IS FALSE
    AND asset_meta->>'intake_lane_batch'='{LANE}' AND asset_meta->>'visual_review_verdict'='ACCEPT_VISUAL_ONLY';
  IF n <> 2 THEN RAISE EXCEPTION 'run8-intake verify failed: % fenced rows, expected 2 — rolled back', n; END IF;

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
    RAISE EXCEPTION 'run8-intake verify failed: pool changed (all=% fb=% li=% ig=%, expected UNCHANGED 9/9/9/8) — rolled back', pool, fb, li, ig; END IF;
END $$;

COMMIT;""")
io.open('run8_intake_apply.sql','w',encoding='utf-8',newline='\n').write('\n'.join(sql)+'\n')

rb=f"""-- run8 batch intake ROLLBACK: guarded delete of the 2 unpromoted lane rows; storage objects excluded.
BEGIN;
DELETE FROM c.client_brand_asset WHERE asset_id IN ('{ROWS[0]['aid']}','{ROWS[1]['aid']}') AND client_id='{PP}'
  AND asset_meta->>'intake_lane_batch'='{LANE}' AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE;
DO $$ DECLARE r int; BEGIN
  SELECT count(*) INTO r FROM c.client_brand_asset WHERE asset_id IN ('{ROWS[0]['aid']}','{ROWS[1]['aid']}');
  IF r <> 0 THEN RAISE EXCEPTION 'run8 rollback refused: row remains (promoted?) — manual review'; END IF;
END $$;
COMMIT;"""
io.open('run8_intake_rollback.sql','w',encoding='utf-8',newline='\n').write(rb+'\n')

for f in ('run8_intake_apply.sql','run8_intake_rollback.sql'):
    print(f, hashlib.sha256(open(f,'rb').read()).hexdigest(), os.path.getsize(f),'bytes')
print('staged+verified:', [m['upload_file'] for m in manifest])
