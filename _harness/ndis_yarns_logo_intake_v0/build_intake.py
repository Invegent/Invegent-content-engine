import json, hashlib, os, io, shutil
os.chdir(os.path.dirname(os.path.abspath(__file__)))
SRC='source'
NY='fb98a472-ae4d-432d-8738-2273231c1ef4'
LANE='ndis-yarns-logo-intake-v0 (2026-07-08)'
PACKET='_harness/ndis_yarns_logo_intake_v0/NDIS_LOGO_INTAKE_GATE_PACKET.md'
CAVEAT=("Claude Design MANUAL VECTOR RECONSTRUCTION of the live raster sources (NDIS_Yarns/Logos/NDIS-Yarns_Logo.png etc.); "
        "brand font APPROXIMATED (exact original not supplied); NOT guaranteed pixel-perfect to the original — "
        "production logo swap is a SEPARATE future PK gate. Intake is fenced-only.")

# curated 17: (key, filename, asset_type, usage, colour_mode, aspect, note)
V='logo_vector_source'; R='logo'
ROWS=[
 ("ny_logo_master_editable","ny_logo_master_editable.svg","logo_primary",V,"full_colour","vector","Master editable SVG (live text approximation)"),
 ("ny_logo_master_outlined","ny_logo_master_outlined.svg","logo_primary",V,"full_colour","vector","Production outlined SVG (preferred for automated rendering; == full-colour vector)"),
 ("ny_logo_dark_svg","ny_logo_dark_transparent.svg","logo_dark",V,"dark","vector","Dark logo vector (for light backgrounds)"),
 ("ny_logo_white_svg","ny_logo_white_transparent.svg","logo_light",V,"white","vector","White/reversed logo vector (for dark backgrounds)"),
 ("ny_logo_horizontal_svg","ny_logo_horizontal_transparent.svg","other",V,"full_colour","vector","Horizontal lockup vector (footer/lower-third)"),
 ("ny_logo_horizontal_white_svg","ny_logo_horizontal_white_transparent.svg","other",V,"white","vector","Horizontal white lockup vector (dark footer)"),
 ("ny_logo_mark_only_svg","ny_logo_mark_only_transparent.svg","logo_icon",V,"full_colour","vector","Mark-only speech-bubble/yarn icon vector"),
 ("ny_logo_square_brand_bg_svg","ny_logo_square_brand_bg.svg","other",V,"full_colour","vector","Square brand-background badge vector"),
 ("ny_logo_watermark_white_svg","ny_logo_watermark_white_transparent.svg","watermark",V,"white","vector","White watermark vector (== mark-only white)"),
 ("ny_logo_full_colour","ny_logo_full_colour_transparent.png","logo_primary",R,"full_colour","1:1","Full-colour master PNG 1024 (== master transparent) — primary raster"),
 ("ny_logo_white","ny_logo_white_transparent.png","logo_light",R,"white","1:1","White/reversed PNG 1024 (dark backgrounds)"),
 ("ny_logo_dark","ny_logo_dark_transparent.png","logo_dark",R,"dark","1:1","Dark PNG 1024 (light backgrounds)"),
 ("ny_logo_horizontal","ny_logo_horizontal_transparent.png","other",R,"full_colour","3:1","Horizontal lockup PNG 2048x666 (footer/lower-third)"),
 ("ny_logo_horizontal_white","ny_logo_horizontal_white_transparent.png","other",R,"white","3:1","Horizontal white lockup PNG 2048x666 (dark footer)"),
 ("ny_logo_mark_only","ny_logo_mark_only_transparent_1024.png","logo_icon",R,"full_colour","1:1","Mark-only icon PNG 1024 (small placements/favicon-style)"),
 ("ny_logo_watermark_white","ny_logo_watermark_white_transparent.png","watermark",R,"white","1:1","White watermark PNG 1024 (subtle low-contrast overlay)"),
 ("ny_logo_square_brand_bg","ny_logo_square_brand_bg_1024.png","other",R,"full_colour","1:1","Square brand-bg badge PNG 1024 (boxed/corner placement)"),
]
assert len({r[0] for r in ROWS})==len(ROWS), 'dup asset_key'
assert len({r[1] for r in ROWS})==len(ROWS), 'dup filename'

def dims(p):
    try:
        from PIL import Image; im=Image.open(p); return im.size[0], im.size[1]
    except Exception: return None, None

os.makedirs('upload_staging', exist_ok=True)
manifest=[]; META={}
for i,(key,fn,atype,usage,cmode,aspect,note) in enumerate(ROWS,1):
    sp=os.path.join(SRC,fn); dst='upload_staging/'+fn
    shutil.copy2(sp,dst)
    b=open(dst,'rb').read(); sha=hashlib.sha256(b).hexdigest()
    w,h=dims(dst)
    tgt='NDIS_Yarns/Logos/'+fn
    assert fn!='NDIS-Yarns_Logo.png' and not fn.startswith('NDIS-Yarns_'), 'collision guard'
    aid=f'd1b1{i:04d}-9c4e-4f7a-8d21-0d5e6f7a8b{i:02d}'
    manifest.append({'asset_key':key,'upload_file':dst,'target_path':'brand-assets/'+tgt,'bytes':len(b),'sha256':sha})
    META[key]={'aid':aid,'fn':fn,'atype':atype,'usage':usage,'tgt':tgt,'sha':sha,'bytes':len(b),'w':w,'h':h,
               'cmode':cmode,'aspect':aspect,'note':note,'mime':('image/svg+xml' if fn.endswith('.svg') else 'image/png')}
json.dump(manifest, io.open('upload_manifest.json','w',encoding='utf-8'), indent=1)

def jstr(o): return json.dumps(o, ensure_ascii=False, separators=(',',':')).replace("'","''")
def esc(s): return s.replace("'","''")

sql=[f"""-- NDIS YARNS LOGO-VARIANT INTAKE v0 — {len(ROWS)} uploads + {len(ROWS)} INSERT-only FENCED candidates.
-- T2->full-chain (NEW client/shape). All four fences set. NOT approval/promotion. NO brand_profile change. NO production logo swap.
-- SVGs usage=logo_vector_source (outside resolver scan); PNGs usage=logo (fenced -> resolver would reject 'inactive').
-- NDIS Yarns currently has ZERO governed logo assets; live logo is served from c.client_brand_profile.brand_logo_url (untouched here).
BEGIN;"""]
for key,m in META.items():
    meta={"mime":m['mime'],"bytes":m['bytes'],"usage":m['usage'],"bucket":"brand-assets","sha256":m['sha'],
     "asset_key":key,"source_path":m['tgt'],"colour_mode":m['cmode'],"aspect_ratio":m['aspect'],
     "approved":False,"approval_status":"intake_candidate","production_use_allowed":False,"is_active":False,
     "license":"Client-owned (NDIS Yarns brand asset)","license_type":"client_owned","attribution_required":False,
     "provenance":"Claude Design logo kit (ndis_yarns_logo_kit.zip), sourced from the client's live NDIS_Yarns/Logos source rasters",
     "reconstruction_caveat":CAVEAT,"pk_decision":"intake_only (NDIS Yarns logo kit v0, PK-gated 2026-07-08); production logo swap / brand_profile change = SEPARATE future PK gate",
     "recommended_use":m['note'],"harvest_lane":"ndis-yarns-logo-intake-v0","intake_lane_batch":LANE,"review_packet":PACKET}
    if m['w']: meta["width"]=m['w']; meta["height"]=m['h']
    sql.append(f"""
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='{m['tgt']}' AND (metadata->>'size')::bigint = {m['bytes']};
  IF NOT FOUND THEN RAISE EXCEPTION 'ndis-logo precheck failed: {m['tgt']} missing or wrong size — rolled back'; END IF;
END $$;
INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, is_active, notes)
SELECT '{m['aid']}', '{NY}', '{m['atype']}', '{esc('NDIS Yarns logo — '+m['note'])}',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/{m['tgt']}',
       '{jstr(meta)}'::jsonb, false, 'Fenced logo intake candidate (NDIS Yarns kit v0, 2026-07-08). Reconstruction — not pixel-perfect; production swap = separate PK gate.'
WHERE NOT EXISTS (SELECT 1 FROM c.client_brand_asset WHERE client_id='{NY}' AND asset_meta->>'asset_key'='{key}');""")

sql.append(f"""
DO $$
DECLARE fenced int; governed int; bp_logo text;
BEGIN
  SELECT count(*) INTO fenced FROM c.client_brand_asset
  WHERE client_id='{NY}' AND asset_meta->>'intake_lane_batch'='{LANE}'
    AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status'='intake_candidate' AND (asset_meta->>'production_use_allowed')::boolean IS FALSE;
  IF fenced <> {len(ROWS)} THEN RAISE EXCEPTION 'ndis-logo verify failed: % fenced rows, expected {len(ROWS)} — rolled back', fenced; END IF;

  -- production-neutrality: NDIS Yarns must have ZERO governed/active logo assets (nothing selectable)
  SELECT count(*) INTO governed FROM c.client_brand_asset
  WHERE client_id='{NY}' AND asset_meta->>'usage' IN ('logo','logo_vector_source')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF governed <> 0 THEN RAISE EXCEPTION 'ndis-logo verify failed: % governed logo rows, expected 0 — rolled back', governed; END IF;

  -- brand_profile.brand_logo_url must remain the live source (untouched by this DML)
  SELECT brand_logo_url INTO bp_logo FROM c.client_brand_profile WHERE client_id='{NY}';
  IF bp_logo <> 'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/NDIS_Yarns/Logos/NDIS-Yarns_Logo.png'
    THEN RAISE EXCEPTION 'ndis-logo verify failed: brand_profile.brand_logo_url changed (%) — rolled back', bp_logo; END IF;
END $$;

COMMIT;""")
io.open('ndis_logo_intake_apply.sql','w',encoding='utf-8',newline='\n').write('\n'.join(sql)+'\n')

aids="','".join(m['aid'] for m in META.values())
rb=f"""-- NDIS logo intake ROLLBACK: guarded delete of the {len(ROWS)} fenced lane rows; storage objects excluded.
BEGIN;
DELETE FROM c.client_brand_asset WHERE client_id='{NY}' AND asset_meta->>'intake_lane_batch'='{LANE}'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE;
DO $$ DECLARE r int; BEGIN
  SELECT count(*) INTO r FROM c.client_brand_asset WHERE asset_id IN ('{aids}');
  IF r <> 0 THEN RAISE EXCEPTION 'ndis-logo rollback refused: % rows remain (promoted?) — manual review', r; END IF;
END $$;
COMMIT;"""
io.open('ndis_logo_intake_rollback.sql','w',encoding='utf-8',newline='\n').write(rb+'\n')

for f in ('ndis_logo_intake_apply.sql','ndis_logo_intake_rollback.sql'):
    print(f, hashlib.sha256(open(f,'rb').read()).hexdigest(), os.path.getsize(f),'bytes')
print('curated rows:', len(ROWS), '| staged files:', len(manifest))
