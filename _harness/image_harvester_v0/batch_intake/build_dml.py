import json, os, io
from math import gcd

os.chdir(r'C:\Users\parve\Invegent-content-engine\_harness\image_harvester_v0')
roster = json.load(open('batch_intake/roster.json', encoding='utf-8'))
PP = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
LANE = 'pp-bg-b3-batch-intake (2026-07-06)'
PACKET = '_harness/image_harvester_v0/batch_intake/BATCH_INTAKE_GATE_PACKET.md'

IDS = {r['asset_key']: f'b3a2000{i+1}-9c4e-4f7a-8d21-0d5e6f7a8b0{i+1}' for i, r in enumerate(roster)}
NAMES = {
 'bg_pp_au_suburb_texture':'Australian suburb texture (aerial) background',
 'bg_pp_transaction_keys_contract':'Property transaction — keys + contract flat-lay background',
 'bg_pp_kitchen_living_open_plan':'Open-plan kitchen & living background',
 'bg_pp_family_backyard_summer':'Family backyard / alfresco background',
 'bg_pp_new_build_construction_site':'New-build residential construction frame background',
 'bg_pp_subdivision_land_estate':'New land estate / subdivision background',
 'bg_pp_mortgage_calculator_keys':'Mortgage calculator + keys background',
 'bg_pp_inspection_checklist_clipboard':'Home inspection checklist clipboard background',
}
def aspect(w,h):
    g=gcd(w,h); return f'{w//g}:{h//g}'
def j(o): return json.dumps(o, ensure_ascii=False, separators=(',',':')).replace("'","''")
def esc(s): return s.replace("'","''")

parts = ["""-- PP background B3 BATCH INTAKE — 8 uploads + 8 INSERT-only intake CANDIDATES (double-fenced).
-- T2 SAFETY_GATE. NOT approval/promotion. is_active=false + approved=false + production_use_allowed=false.
-- POOL-NEUTRAL (machine-asserted): facebook 6 / linkedin 6 / instagram 5 UNCHANGED; the 8 inactive rows
-- cannot enter resolve_slot_assets (is_active is its FIRST reject filter). Existing 6 governed untouched.
-- Fail-closed: 8 storage-object size prechecks, NOT-EXISTS dedup, end-state + per-platform-pool asserts.
BEGIN;

DO $$
BEGIN"""]
for r in roster:
    parts.append(f"  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='{r['target_path']}' AND (metadata->>'size')::bigint = {r['bytes']};")
    parts.append(f"  IF NOT FOUND THEN RAISE EXCEPTION 'batch-intake precheck failed: {r['target_path']} missing or wrong size — rolled back'; END IF;")
parts.append("END $$;\n")

for r in roster:
    key=r['asset_key']; aid=IDS[key]
    meta = {
      "mime":"image/jpeg","bytes":r['bytes'],"width":r['width'],"height":r['height'],"sha256":r['sha256'],
      "sha256_source":"B3 harvest final hashed at batch build 2026-07-06; upload target "+r['target_path']+" size-prechecked in-SQL + post-upload public-URL sha256 verified",
      "usage":"background","bucket":"brand-assets","source_path":r['target_path'],"asset_key":key,
      "aspect_ratio":aspect(r['width'],r['height']),"visual_style":"photographic",
      "license":r['licence_name'],"license_type":("pexels_license" if 'Pexels' in (r['licence_name'] or '') else "unsplash_license"),
      "license_url":r['licence_url'],"attribution_required":bool(r['attribution_required']),
      "attribution_note":r['attribution_text'] or "Not required (optional courtesy credit)",
      "photographer":r['photographer'],"source_site":r['source_platform'],"source_url":r['source_url'],
      "original_download_url":r['download_url'],
      "approved":False,"approval_status":"intake_candidate","production_use_allowed":False,
      "pk_decision":"intake_only (B3 batch-intake, PK-gated 2026-07-06); production approval/promotion requires a separate PK gate — Option D: resolver pool is production-live, so any future promotion changes production rotation",
      "visual_review_verdict":"ACCEPT_VISUAL_ONLY",
      "visual_review_note":r['usage_note'],
      "suggested_scrim_opacity":r['suggested_scrim_opacity'],
      "safe_for_text_overlay":"needs_scrim",
      "harvest_lane":"cc-0027 image-harvester B3 (2026-07-06)",
      "intake_lane_batch":LANE,
      "review_packet":PACKET,
    }
    if r['visual_description']: meta['dominant_visual']=r['visual_description']
    if r['label_constraint']: meta['label_constraint']=r['label_constraint']
    scope_sql = "ARRAY[" + ",".join(f"'{s}'" for s in r['platform_scope']) + "]"
    note = "Intake candidate (B3 batch, ACCEPT_VISUAL_ONLY 2026-07-06). " + (r['label_constraint']+". " if r['label_constraint'] else "") + "Promotion = separate PK gate (Option D production-live)."
    parts.append(f"""-- {key}
INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT '{aid}', '{PP}', 'other', '{esc(NAMES[key])}',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/{r['target_path']}',
       '{j(meta)}'::jsonb, {scope_sql}, false, '{esc(note)}'
WHERE NOT EXISTS (SELECT 1 FROM c.client_brand_asset WHERE client_id='{PP}' AND asset_meta->>'asset_key'='{key}');
""")

# verification block: 8 fenced rows + pool neutrality (fb6/li6/ig5) + governed 6 untouched + no true-flags
parts.append(f"""DO $$
DECLARE n int; pool int; fb int; li int; ig int; gov int; truerows int;
BEGIN
  SELECT count(*) INTO n FROM c.client_brand_asset
  WHERE client_id='{PP}' AND asset_meta->>'intake_lane_batch'='{LANE}'
    AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status'='intake_candidate'
    AND (asset_meta->>'production_use_allowed')::boolean IS FALSE
    AND asset_meta->>'visual_review_verdict'='ACCEPT_VISUAL_ONLY';
  IF n <> 8 THEN RAISE EXCEPTION 'batch-intake verify failed: % fenced candidate rows, expected 8 — rolled back', n; END IF;

  SELECT count(*) INTO truerows FROM c.client_brand_asset
  WHERE client_id='{PP}' AND asset_meta->>'intake_lane_batch'='{LANE}'
    AND (is_active IS TRUE OR (asset_meta->>'approved')::boolean IS TRUE OR (asset_meta->>'production_use_allowed')::boolean IS TRUE);
  IF truerows <> 0 THEN RAISE EXCEPTION 'batch-intake verify failed: % new rows carry a true flag, expected 0 — rolled back', truerows; END IF;

  -- eligible-pool replica (mirrors resolve_slot_assets background filter) MUST be unchanged
  WITH elig AS (
    SELECT a.platform_scope FROM c.client_brand_asset a
    WHERE a.client_id='{PP}' AND a.asset_meta->>'usage'='background'
      AND a.is_active AND (a.asset_meta->>'approved')::boolean
      AND (a.asset_meta->>'license_type' IS NOT NULL OR a.asset_meta->>'license' IS NOT NULL)
      AND COALESCE(a.asset_meta->>'bucket','')='brand-assets'
      AND a.asset_meta->>'safe_for_text_overlay' IN ('true','needs_scrim'))
  SELECT count(*),
         count(*) FILTER (WHERE platform_scope IS NULL OR 'facebook'=ANY(platform_scope)),
         count(*) FILTER (WHERE platform_scope IS NULL OR 'linkedin'=ANY(platform_scope)),
         count(*) FILTER (WHERE platform_scope IS NULL OR 'instagram'=ANY(platform_scope))
    INTO pool, fb, li, ig FROM elig;
  IF pool<>6 OR fb<>6 OR li<>6 OR ig<>5 THEN
    RAISE EXCEPTION 'batch-intake verify failed: pool neutrality broken (all=% fb=% li=% ig=%, expected 6/6/6/5) — rolled back', pool, fb, li, ig; END IF;

  SELECT count(*) INTO gov FROM c.client_brand_asset
  WHERE client_id='{PP}' AND asset_meta->>'asset_key' IN
    ('bg_perth_cbd','bg_brisbane_cbd','bg_sydney_cbd','bg_pp_au_suburb_aerial_grid','bg_pp_home_keys_contract_table','bg_pp_perth_cbd_skyline_day_wide')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF gov <> 6 THEN RAISE EXCEPTION 'batch-intake verify failed: governed set=%, expected 6 untouched — rolled back', gov; END IF;
END $$;

COMMIT;
""")
io.open('batch_intake/batch_intake_apply.sql','w',encoding='utf-8',newline='\n').write("\n".join(parts))

# rollback: delete the 8 lane rows IF still unpromoted; storage objects NOT deleted (separate gate)
rb = [f"""-- PP background B3 BATCH INTAKE ROLLBACK: delete the 8 candidate rows IF still unpromoted (guarded).
-- Storage objects intentionally NOT deleted (storage deletion is separately PK-gated).
BEGIN;
DELETE FROM c.client_brand_asset
WHERE client_id='{PP}' AND asset_meta->>'intake_lane_batch'='{LANE}'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE;
DO $$
DECLARE remaining int;
BEGIN
  SELECT count(*) INTO remaining FROM c.client_brand_asset
  WHERE client_id='{PP}' AND asset_meta->>'intake_lane_batch'='{LANE}';
  IF remaining <> 0 THEN
    RAISE EXCEPTION 'batch-intake rollback refused: % lane rows remain (promoted?) — manual review', remaining; END IF;
END $$;
COMMIT;
"""]
io.open('batch_intake/batch_intake_rollback.sql','w',encoding='utf-8',newline='\n').write("\n".join(rb))

# upload manifest
um=[{'asset_key':r['asset_key'],'upload_file':r['upload_file'],'target_path':'brand-assets/'+r['target_path'],'bytes':r['bytes'],'sha256':r['sha256']} for r in roster]
json.dump(um, io.open('batch_intake/upload_manifest.json','w',encoding='utf-8'), indent=1)

import hashlib
for f in ('batch_intake/batch_intake_apply.sql','batch_intake/batch_intake_rollback.sql'):
    print(os.path.basename(f), hashlib.sha256(open(f,'rb').read()).hexdigest(), os.path.getsize(f),'bytes')
