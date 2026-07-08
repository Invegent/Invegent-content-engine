import json, hashlib, os, io, shutil
os.chdir(os.path.dirname(os.path.abspath(__file__)))
SRC='source/care_for_welfare_logo_kit'
CFW='3eca32aa-e460-462f-a846-3f6ace6a3cae'
LANE='cfw-logo-intake-v0 (2026-07-08)'
PACKET='_harness/care_for_welfare_logo_intake_v0/CFW_LOGO_INTAKE_GATE_PACKET.md'
LIVE_LOGO='https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/client-assets/submissions/730049b9-937a-4032-b284-e40cd626ffa1/logo.png'
CAVEAT=("Prepared from GENUINE Care for Welfare vector sources (source SVG/AI/EPS); the production SVG has true vector paths, "
        "no embedded raster, wordmark already outlined (no font dependency) — FAITHFUL to source, NOT a font-approximated reconstruction. "
        "A minor 'original vs rebuilt' preview exists in the kit. Production logo swap / brand_profile change = SEPARATE future PK gate. Intake is fenced-only.")

V='logo_vector_source'; R='logo'
ROWS=[
 ("cfw_logo_master","cfw_logo_master_outlined.svg","logo_primary",V,"full_colour","3:1","Production master outlined SVG (true vector, wordmark outlined; == editable)"),
 ("cfw_logo_full_colour_svg","cfw_logo_full_colour_transparent.svg","logo_primary",V,"full_colour","3:1","Full-colour lockup vector (== horizontal)"),
 ("cfw_logo_dark_svg","cfw_logo_dark_transparent.svg","logo_dark",V,"dark","3:1","Dark single-colour logo vector (light backgrounds)"),
 ("cfw_logo_white_svg","cfw_logo_white_transparent.svg","logo_light",V,"white","3:1","White/reversed logo vector (dark backgrounds; == horizontal_white)"),
 ("cfw_logo_mark_only_svg","cfw_logo_mark_only_transparent.svg","logo_icon",V,"full_colour","1:1","Mark-only tree/person icon vector (full colour)"),
 ("cfw_logo_mark_only_dark_svg","cfw_logo_mark_only_dark_transparent.svg","logo_icon",V,"dark","1:1","Mark-only icon vector (dark single-colour)"),
 ("cfw_logo_mark_only_white_svg","cfw_logo_mark_only_white_transparent.svg","logo_icon",V,"white","1:1","Mark-only icon vector (white, dark backgrounds)"),
 ("cfw_logo_square_brand_bg_svg","cfw_logo_square_brand_bg.svg","other",V,"full_colour","1:1","Square brand-background badge vector"),
 ("cfw_logo_watermark_white_svg","cfw_logo_watermark_white_transparent.svg","watermark",V,"white","1:1","White watermark vector (subtle, ~72% opacity)"),
 ("cfw_logo_full_colour","cfw_logo_full_colour_transparent.png","logo_primary",R,"full_colour","3:1","Full-colour wordmark PNG 2048x676 (primary raster; == horizontal)"),
 ("cfw_logo_white","cfw_logo_white_transparent.png","logo_light",R,"white","3:1","White/reversed wordmark PNG 2048x676 (dark backgrounds)"),
 ("cfw_logo_dark","cfw_logo_dark_transparent.png","logo_dark",R,"dark","3:1","Dark wordmark PNG 2048x676 (light backgrounds; == master)"),
 ("cfw_logo_mark_only","cfw_logo_mark_only_transparent_1024.png","logo_icon",R,"full_colour","1:1","Mark-only icon PNG 1024 (small placements)"),
 ("cfw_logo_mark_only_white","cfw_logo_mark_only_white_transparent_1024.png","logo_icon",R,"white","1:1","White mark-only icon PNG 1024 (dark backgrounds)"),
 ("cfw_logo_watermark_white","cfw_logo_watermark_white_transparent.png","watermark",R,"white","1:1","White watermark PNG 1024 (subtle overlay)"),
 ("cfw_logo_square_brand_bg","cfw_logo_square_brand_bg_1024.png","other",R,"full_colour","1:1","Square brand-bg badge PNG 1024 (boxed/corner placement)"),
]
assert len({r[0] for r in ROWS})==len(ROWS) and len({r[1] for r in ROWS})==len(ROWS), 'dup'

def dims(p):
    try:
        from PIL import Image; im=Image.open(p); return im.size[0], im.size[1]
    except Exception: return None, None

os.makedirs('upload_staging', exist_ok=True)
manifest=[]; META={}; seen=set()
for i,(key,fn,atype,usage,cmode,aspect,note) in enumerate(ROWS,1):
    sp=os.path.join(SRC,fn); dst='upload_staging/'+fn
    shutil.copy2(sp,dst)
    b=open(dst,'rb').read(); sha=hashlib.sha256(b).hexdigest()
    assert sha not in seen, 'byte-duplicate in curated set: '+fn
    seen.add(sha)
    w,h=dims(dst); tgt='Care_for_Welfare/Logos/'+fn
    assert not fn.startswith('source_') and 'logo.png'!=fn, 'collision guard'
    aid=f'd2c1{i:04d}-9c4e-4f7a-8d21-0d5e6f7a8c{i:02d}'
    manifest.append({'asset_key':key,'upload_file':dst,'target_path':'brand-assets/'+tgt,'bytes':len(b),'sha256':sha})
    META[key]={'aid':aid,'fn':fn,'atype':atype,'usage':usage,'tgt':tgt,'sha':sha,'bytes':len(b),'w':w,'h':h,
               'cmode':cmode,'aspect':aspect,'note':note,'mime':('image/svg+xml' if fn.endswith('.svg') else 'image/png')}
json.dump(manifest, io.open('upload_manifest.json','w',encoding='utf-8'), indent=1)

def jstr(o): return json.dumps(o, ensure_ascii=False, separators=(',',':')).replace("'","''")
def esc(s): return s.replace("'","''")

sql=[f"""-- CARE FOR WELFARE LOGO-VARIANT INTAKE v0 — {len(ROWS)} uploads + {len(ROWS)} INSERT-only FENCED candidates.
-- T2->full-chain (NEW client/shape). All four fences set. NOT approval/promotion. NO brand_profile change. NO production logo swap.
-- SVGs usage=logo_vector_source (outside resolver scan); PNGs usage=logo (fenced -> resolver rejects 'inactive').
-- CFW has ZERO governed logo assets; live logo served from c.client_brand_profile.brand_logo_url (client-assets bucket, DIFFERENT bucket — untouched).
BEGIN;"""]
for key,m in META.items():
    meta={"mime":m['mime'],"bytes":m['bytes'],"usage":m['usage'],"bucket":"brand-assets","sha256":m['sha'],
     "asset_key":key,"source_path":m['tgt'],"colour_mode":m['cmode'],"aspect_ratio":m['aspect'],
     "approved":False,"approval_status":"intake_candidate","production_use_allowed":False,"is_active":False,
     "license":"Client-owned (Care for Welfare brand asset)","license_type":"client_owned","attribution_required":False,
     "provenance":"Care for Welfare ICE logo kit (care_for_welfare_logo_kit.zip), prepared from the client's genuine vector sources (SVG/AI/EPS)",
     "reconstruction_caveat":CAVEAT,"pk_decision":"intake_only (CFW logo kit v0, PK-gated 2026-07-08); production logo swap / brand_profile change = SEPARATE future PK gate",
     "recommended_use":m['note'],"harvest_lane":"cfw-logo-intake-v0","intake_lane_batch":LANE,"review_packet":PACKET}
    if m['w']: meta["width"]=m['w']; meta["height"]=m['h']
    sql.append(f"""
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='{m['tgt']}' AND (metadata->>'size')::bigint = {m['bytes']};
  IF NOT FOUND THEN RAISE EXCEPTION 'cfw-logo precheck failed: {m['tgt']} missing or wrong size — rolled back'; END IF;
END $$;
INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, is_active, notes)
SELECT '{m['aid']}', '{CFW}', '{m['atype']}', '{esc('Care for Welfare logo — '+m['note'])}',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/{m['tgt']}',
       '{jstr(meta)}'::jsonb, false, 'Fenced logo intake candidate (CFW kit v0, 2026-07-08). Faithful vector kit; production swap = separate PK gate.'
WHERE NOT EXISTS (SELECT 1 FROM c.client_brand_asset WHERE client_id='{CFW}' AND asset_meta->>'asset_key'='{key}');""")

sql.append(f"""
DO $$
DECLARE fenced int; governed int; bp_logo text;
BEGIN
  SELECT count(*) INTO fenced FROM c.client_brand_asset
  WHERE client_id='{CFW}' AND asset_meta->>'intake_lane_batch'='{LANE}'
    AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status'='intake_candidate' AND (asset_meta->>'production_use_allowed')::boolean IS FALSE;
  IF fenced <> {len(ROWS)} THEN RAISE EXCEPTION 'cfw-logo verify failed: % fenced rows, expected {len(ROWS)} — rolled back', fenced; END IF;

  SELECT count(*) INTO governed FROM c.client_brand_asset
  WHERE client_id='{CFW}' AND asset_meta->>'usage' IN ('logo','logo_vector_source')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF governed <> 0 THEN RAISE EXCEPTION 'cfw-logo verify failed: % governed logo rows, expected 0 — rolled back', governed; END IF;

  SELECT brand_logo_url INTO bp_logo FROM c.client_brand_profile WHERE client_id='{CFW}';
  IF bp_logo <> '{LIVE_LOGO}' THEN RAISE EXCEPTION 'cfw-logo verify failed: brand_profile.brand_logo_url changed (%) — rolled back', bp_logo; END IF;
END $$;

COMMIT;""")
io.open('cfw_logo_intake_apply.sql','w',encoding='utf-8',newline='\n').write('\n'.join(sql)+'\n')

aids="','".join(m['aid'] for m in META.values())
rb=f"""-- CFW logo intake ROLLBACK: guarded delete of the {len(ROWS)} fenced lane rows; storage objects excluded.
BEGIN;
DELETE FROM c.client_brand_asset WHERE client_id='{CFW}' AND asset_meta->>'intake_lane_batch'='{LANE}'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE;
DO $$ DECLARE r int; BEGIN
  SELECT count(*) INTO r FROM c.client_brand_asset WHERE asset_id IN ('{aids}');
  IF r <> 0 THEN RAISE EXCEPTION 'cfw-logo rollback refused: % rows remain (promoted?) — manual review', r; END IF;
END $$;
COMMIT;"""
io.open('cfw_logo_intake_rollback.sql','w',encoding='utf-8',newline='\n').write(rb+'\n')

for f in ('cfw_logo_intake_apply.sql','cfw_logo_intake_rollback.sql'):
    print(f, hashlib.sha256(open(f,'rb').read()).hexdigest(), os.path.getsize(f),'bytes')
print('curated rows:', len(ROWS), '| staged:', len(manifest), '| distinct sha:', len(seen))
