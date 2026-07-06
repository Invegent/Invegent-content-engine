import json, hashlib, os, io, shutil

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PP='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
LANE='pp-bg-b3m4-intake (2026-07-06)'
os.makedirs('upload_staging', exist_ok=True)

# (asset_id, key, source_final, target_name, name, meta)
ASSETS=[
 dict(aid='b3a20009-9c4e-4f7a-8d21-0d5e6f7a8b09', key='bg_pp_advisory_desk_flatlay',
      src='../run6_b3m4/final/bg_advisory_desk_flatlay_v1.jpg',
      name='Advisory desk flat-lay (person-free) background',
      sha='97e00405eb8c260c2376b3efd05ba6cebeb0ba4a8dfc2ddb7c646f3a3d0cf98a', bytes=2948464, w=6000, h=4000, ar='3:2',
      lic='Pexels License', lict='pexels_license', licurl='https://www.pexels.com/license/',
      ph='Towfiqu barbhuiya', site='pexels', surl='https://www.pexels.com/photo/11391944/',
      dl='https://images.pexels.com/photos/11391944/pexels-photo-11391944.jpeg',
      scope="ARRAY['facebook','instagram','linkedin']", scrim=0.55,
      dom='Person-free top-down advisory desk flat-lay on warm wood: tablet with blank grey screen, black reading glasses, gold ballpoint pen, small succulent; no branding, no readable text, no faces.',
      lc='person-free advisory/desk flat-lay; generic, never location-specific; REFRAME of the workbook agent-tablet slot (no identifiable person, no model release) — key proposed bg_pp_advisory_desk_flatlay (PK may instead key bg_pp_real_estate_agent_tablet to fill that workbook row)',
      vrn='B3M4 best-pick; ACCEPT_VISUAL_ONLY 2026-07-06; person-free advisory desk; reviewer PASS zero scope flags'),
 dict(aid='b3a20010-9c4e-4f7a-8d21-0d5e6f7a8b10', key='bg_pp_contract_signing_closeup',
      src='../run6_b3m4/final/bg_contract_pen_blank_v1.jpg',
      name='Contract signing — pen on blank sheet background',
      sha='ff4d3682f7a758cf5bba58c53b8dc16d4223a5a1f43c241b65012c9133283b82', bytes=277280, w=3888, h=2592, ar='3:2',
      lic='Pexels License', lict='pexels_license', licurl='https://www.pexels.com/license/',
      ph='Elisabeth Ende', site='pexels', surl='https://www.pexels.com/photo/7431849/',
      dl='https://images.pexels.com/photos/7431849/pexels-photo-7431849.jpeg',
      scope="ARRAY['facebook','instagram','linkedin']", scrim=0.60,
      dom='Close-up of a black fountain pen resting on the edge of a completely BLANK sheet of paper on plain white; no text, signature, keys, hands, or faces.',
      lc='pen on blank paper; NO legible document content (blank preferred per PK 2026-07-06); generic contract/settlement theme; near-white field — confirm scrim holds headline contrast',
      vrn='B3M4 best-pick; ACCEPT_VISUAL_ONLY 2026-07-06; blank contract PREFERRED; reviewer PASS zero scope flags'),
]

def jstr(o): return json.dumps(o, ensure_ascii=False, separators=(',',':')).replace("'","''")
def esc(s): return s.replace("'","''")

manifest=[]
for a in ASSETS:
    dst='upload_staging/'+a['key']+'.jpg'
    shutil.copy2(a['src'], dst)
    h=hashlib.sha256(open(dst,'rb').read()).hexdigest()
    assert h==a['sha'] and os.path.getsize(dst)==a['bytes'], 'staged mismatch '+dst
    tgt='Property_Pulse/Backgrounds/'+a['key']+'.jpg'
    manifest.append(dict(asset_key=a['key'], upload_file=dst, target_path='brand-assets/'+tgt, bytes=a['bytes'], sha256=a['sha']))
json.dump(manifest, open('upload_manifest.json','w'), indent=1)

parts=["""-- PP B3M4 INTAKE — 2 uploads + 2 INSERT-only double-fenced candidates (advisory desk + contract pen-on-blank).
-- T2 SAFETY_GATE. is_active=false + approved=false + production_use_allowed=false. NOT approval/promotion.
-- POOL-NEUTRAL (machine-asserted): fb 6 / li 6 / ig 5 UNCHANGED; is_active is resolve_slot_assets' FIRST reject.
BEGIN;

DO $$
BEGIN"""]
for a in ASSETS:
    tgt='Property_Pulse/Backgrounds/'+a['key']+'.jpg'
    parts.append(f"""  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='{tgt}' AND (metadata->>'size')::bigint = {a['bytes']};
  IF NOT FOUND THEN RAISE EXCEPTION 'b3m4-intake precheck failed: {tgt} missing or wrong size — rolled back'; END IF;""")
parts.append("END $$;\n")

for a in ASSETS:
    tgt='Property_Pulse/Backgrounds/'+a['key']+'.jpg'
    url='https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/'+tgt
    meta={"mime":"image/jpeg","bytes":a['bytes'],"width":a['w'],"height":a['h'],"sha256":a['sha'],
     "sha256_source":"B3M4 harvest final hashed at intake build 2026-07-06; upload target "+tgt+" size-prechecked in-SQL + post-upload public-URL sha256 verified",
     "usage":"background","bucket":"brand-assets","source_path":tgt,"asset_key":a['key'],"aspect_ratio":a['ar'],"visual_style":"photographic",
     "license":a['lic'],"license_type":a['lict'],"license_url":a['licurl'],"attribution_required":False,
     "attribution_note":"Photo by "+a['ph']+" on Pexels (courtesy credit; attribution not legally required)",
     "photographer":a['ph'],"source_site":a['site'],"source_url":a['surl'],"original_download_url":a['dl'],
     "approved":False,"approval_status":"intake_candidate","production_use_allowed":False,
     "pk_decision":"intake_only (B3M4 intake, PK-gated 2026-07-06); production approval/promotion requires a separate PK gate — Option D: resolver pool is production-live, so any future promotion changes production rotation",
     "visual_review_verdict":"ACCEPT_VISUAL_ONLY","visual_review_note":a['vrn'],
     "suggested_scrim_opacity":a['scrim'],"safe_for_text_overlay":"needs_scrim",
     "harvest_lane":"cc-0027 image-harvester B3M4 (2026-07-06)","intake_lane_batch":LANE,
     "review_packet":"_harness/image_harvester_v0/b3m4_intake/B3M4_INTAKE_GATE_PACKET.md",
     "dominant_visual":a['dom'],"label_constraint":a['lc']}
    note=f"Intake candidate (B3M4, ACCEPT_VISUAL_ONLY 2026-07-06). {a['lc']} Promotion = separate PK gate (Option D production-live)."
    parts.append(f"""-- {a['key']}
INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT '{a['aid']}', '{PP}', 'other', '{esc(a['name'])}',
       '{url}',
       '{jstr(meta)}'::jsonb, {a['scope']}, false, '{esc(note)}'
WHERE NOT EXISTS (SELECT 1 FROM c.client_brand_asset WHERE client_id='{PP}' AND asset_meta->>'asset_key'='{a['key']}');
""")

parts.append(f"""DO $$
DECLARE n int; pool int; fb int; li int; ig int; gov int; truerows int;
BEGIN
  SELECT count(*) INTO n FROM c.client_brand_asset
  WHERE client_id='{PP}' AND asset_meta->>'intake_lane_batch'='{LANE}'
    AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status'='intake_candidate' AND (asset_meta->>'production_use_allowed')::boolean IS FALSE
    AND asset_meta->>'visual_review_verdict'='ACCEPT_VISUAL_ONLY';
  IF n <> 2 THEN RAISE EXCEPTION 'b3m4-intake verify failed: % fenced rows, expected 2 — rolled back', n; END IF;

  SELECT count(*) INTO truerows FROM c.client_brand_asset
  WHERE client_id='{PP}' AND asset_meta->>'intake_lane_batch'='{LANE}'
    AND (is_active IS TRUE OR (asset_meta->>'approved')::boolean IS TRUE OR (asset_meta->>'production_use_allowed')::boolean IS TRUE);
  IF truerows <> 0 THEN RAISE EXCEPTION 'b3m4-intake verify failed: % new rows carry a true flag — rolled back', truerows; END IF;

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
  IF pool<>6 OR fb<>6 OR li<>6 OR ig<>5 THEN
    RAISE EXCEPTION 'b3m4-intake verify failed: pool neutrality broken (all=% fb=% li=% ig=%, expected 6/6/6/5) — rolled back', pool, fb, li, ig; END IF;

  SELECT count(*) INTO gov FROM c.client_brand_asset
  WHERE client_id='{PP}' AND asset_meta->>'asset_key' IN
    ('bg_perth_cbd','bg_brisbane_cbd','bg_sydney_cbd','bg_pp_au_suburb_aerial_grid','bg_pp_home_keys_contract_table','bg_pp_perth_cbd_skyline_day_wide')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF gov <> 6 THEN RAISE EXCEPTION 'b3m4-intake verify failed: governed set=%, expected 6 — rolled back', gov; END IF;
END $$;

COMMIT;""")
io.open('b3m4_intake_apply.sql','w',encoding='utf-8',newline='\n').write('\n'.join(parts)+'\n')

# rollback
rb=["-- B3M4 intake ROLLBACK: guarded delete of the 2 unpromoted lane rows; storage objects excluded (separate gate).","BEGIN;"]
ids=",".join("'"+a['aid']+"'" for a in ASSETS)
rb.append(f"""DELETE FROM c.client_brand_asset WHERE client_id='{PP}' AND asset_meta->>'intake_lane_batch'='{LANE}'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE;
DO $$ DECLARE r int; BEGIN
  SELECT count(*) INTO r FROM c.client_brand_asset WHERE asset_id IN ({ids});
  IF r <> 0 THEN RAISE EXCEPTION 'b3m4 rollback refused: % lane rows remain (promoted?) — manual review', r; END IF;
END $$;
COMMIT;""")
io.open('b3m4_intake_rollback.sql','w',encoding='utf-8',newline='\n').write('\n'.join(rb)+'\n')

for f in ('b3m4_intake_apply.sql','b3m4_intake_rollback.sql'):
    print(f, hashlib.sha256(open(f,'rb').read()).hexdigest(), os.path.getsize(f),'bytes')
print('staged:', [m['upload_file'] for m in manifest], '(hash+size verified)')
