import json, hashlib, os, io, shutil
os.chdir(os.path.dirname(os.path.abspath(__file__)))
SRC='source/invegent_logo_kit'
INV='93494a09-cc89-41d1-b364-cb63983063a6'
LANE='invegent-logo-intake-v0 (2026-07-08)'
PACKET='_harness/invegent_logo_intake_v0/INVEGENT_LOGO_INTAKE_GATE_PACKET.md'
CAVEAT=("Invegent supplied assets were mostly PNG exports (no native SVG/AI source); this kit is a MANUAL SVG RECONSTRUCTION "
        "of the mark + lockups; wordmark and tagline APPROXIMATED with a close sans-serif and outlined; the rebuilt SVG is a "
        "governed working master, NOT a pixel-perfect original design file. Invegent currently has NO brand_logo_url set. "
        "Production logo swap / brand_profile change = SEPARATE future PK gate. Intake is fenced-only.")

V='logo_vector_source'; R='logo'
ROWS=[
 ("invegent_logo_master","invegent_logo_master_outlined.svg","logo_primary",V,"full_colour","3:1","Production master outlined SVG (== full-colour/horizontal)"),
 ("invegent_logo_master_editable_svg","invegent_logo_master_editable.svg","logo_primary",V,"full_colour","3:1","Editable master lockup SVG (live text; font fallback may vary)"),
 ("invegent_logo_dark_svg","invegent_logo_dark_transparent.svg","logo_dark",V,"dark","3:1","Dark navy logo vector (light backgrounds)"),
 ("invegent_logo_white_svg","invegent_logo_white_transparent.svg","logo_light",V,"white","3:1","White/reversed logo vector (dark backgrounds; == horizontal_white)"),
 ("invegent_logo_horizontal_kwts_svg","invegent_logo_horizontal_know_what_to_say_transparent.svg","other",V,"full_colour","3:1","Horizontal legacy 'Know what to say' tagline lockup vector"),
 ("invegent_logo_mark_only_svg","invegent_logo_mark_only_transparent.svg","logo_icon",V,"cyan","1:1","Mark-only cyan icon vector"),
 ("invegent_logo_mark_only_navy_svg","invegent_logo_mark_only_navy_transparent.svg","logo_icon",V,"dark","1:1","Mark-only navy icon vector (light backgrounds)"),
 ("invegent_logo_watermark_white_svg","invegent_logo_watermark_white_transparent.svg","watermark",V,"white","1:1","White mark / watermark vector (== mark-only white)"),
 ("invegent_logo_square_brand_bg_svg","invegent_logo_square_brand_bg.svg","other",V,"cyan_on_navy","1:1","Square brand-background badge vector (cyan mark on navy)"),
 ("invegent_logo_full_colour","invegent_logo_full_colour_transparent.png","logo_primary",R,"full_colour","3:1","Full-colour lockup PNG 2000x700 (primary raster; == master/horizontal)"),
 ("invegent_logo_white","invegent_logo_white_transparent.png","logo_light",R,"white","3:1","White/reversed PNG 2000x700 (dark backgrounds)"),
 ("invegent_logo_dark","invegent_logo_dark_transparent.png","logo_dark",R,"dark","3:1","Dark navy PNG 2000x700 (light backgrounds)"),
 ("invegent_logo_horizontal_kwts","invegent_logo_horizontal_know_what_to_say_transparent.png","other",R,"full_colour","3:1","Horizontal legacy 'Know what to say' tagline PNG 2000x700"),
 ("invegent_logo_mark_only","invegent_logo_mark_only_transparent_1024.png","logo_icon",R,"cyan","1:1","Mark-only cyan icon PNG 1024 (small placements)"),
 ("invegent_logo_mark_only_navy","invegent_logo_mark_only_navy_transparent_1024.png","logo_icon",R,"dark","1:1","Mark-only navy icon PNG 1024 (light backgrounds)"),
 ("invegent_logo_watermark_white","invegent_logo_watermark_white_transparent.png","watermark",R,"white","1:1","White mark / watermark PNG 1024 (== mark-only white)"),
 ("invegent_logo_square_brand_bg","invegent_logo_square_brand_bg_1024.png","other",R,"cyan_on_navy","1:1","Square brand-bg badge PNG 1024 (boxed/corner placement)"),
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
    w,h=dims(dst); tgt='Invegent/Logos/'+fn
    assert not fn.startswith('source_'), 'collision guard'
    aid=f'd3d1{i:04d}-9c4e-4f7a-8d21-0d5e6f7a8d{i:02d}'
    manifest.append({'asset_key':key,'upload_file':dst,'target_path':'brand-assets/'+tgt,'bytes':len(b),'sha256':sha})
    META[key]={'aid':aid,'fn':fn,'atype':atype,'usage':usage,'tgt':tgt,'sha':sha,'bytes':len(b),'w':w,'h':h,
               'cmode':cmode,'aspect':aspect,'note':note,'mime':('image/svg+xml' if fn.endswith('.svg') else 'image/png')}
json.dump(manifest, io.open('upload_manifest.json','w',encoding='utf-8'), indent=1)

def jstr(o): return json.dumps(o, ensure_ascii=False, separators=(',',':')).replace("'","''")
def esc(s): return s.replace("'","''")

sql=[f"""-- INVEGENT LOGO-VARIANT INTAKE v0 — {len(ROWS)} uploads + {len(ROWS)} INSERT-only FENCED candidates.
-- T2->full-chain (NEW client/shape). All four fences set. NOT approval/promotion. NO brand_profile change. NO production logo swap.
-- SVGs usage=logo_vector_source (outside resolver scan); PNGs usage=logo (fenced -> resolver rejects 'inactive').
-- Invegent has ZERO governed logo assets AND brand_profile.brand_logo_url IS NULL (no live logo set) — intake is production-neutral; assertion keeps brand_logo_url NULL.
BEGIN;"""]
for key,m in META.items():
    meta={"mime":m['mime'],"bytes":m['bytes'],"usage":m['usage'],"bucket":"brand-assets","sha256":m['sha'],
     "asset_key":key,"source_path":m['tgt'],"colour_mode":m['cmode'],"aspect_ratio":m['aspect'],
     "approved":False,"approval_status":"intake_candidate","production_use_allowed":False,"is_active":False,
     "license":"Client-owned (Invegent brand asset)","license_type":"client_owned","attribution_required":False,
     "provenance":"Invegent ICE logo kit (invegent_logo_kit.zip), reconstructed from the client's PNG brand exports (no native SVG/AI source supplied)",
     "reconstruction_caveat":CAVEAT,"pk_decision":"intake_only (Invegent logo kit v0, PK-gated 2026-07-08); production logo swap / brand_profile change = SEPARATE future PK gate",
     "recommended_use":m['note'],"harvest_lane":"invegent-logo-intake-v0","intake_lane_batch":LANE,"review_packet":PACKET}
    if m['w']: meta["width"]=m['w']; meta["height"]=m['h']
    sql.append(f"""
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='{m['tgt']}' AND (metadata->>'size')::bigint = {m['bytes']};
  IF NOT FOUND THEN RAISE EXCEPTION 'invegent-logo precheck failed: {m['tgt']} missing or wrong size — rolled back'; END IF;
END $$;
INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, is_active, notes)
SELECT '{m['aid']}', '{INV}', '{m['atype']}', '{esc('Invegent logo — '+m['note'])}',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/{m['tgt']}',
       '{jstr(meta)}'::jsonb, false, 'Fenced logo intake candidate (Invegent kit v0, 2026-07-08). Reconstruction — governed working master, not pixel-perfect; production swap = separate PK gate.'
WHERE NOT EXISTS (SELECT 1 FROM c.client_brand_asset WHERE client_id='{INV}' AND asset_meta->>'asset_key'='{key}');""")

sql.append(f"""
DO $$
DECLARE fenced int; governed int; bp_logo text;
BEGIN
  SELECT count(*) INTO fenced FROM c.client_brand_asset
  WHERE client_id='{INV}' AND asset_meta->>'intake_lane_batch'='{LANE}'
    AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status'='intake_candidate' AND (asset_meta->>'production_use_allowed')::boolean IS FALSE;
  IF fenced <> {len(ROWS)} THEN RAISE EXCEPTION 'invegent-logo verify failed: % fenced rows, expected {len(ROWS)} — rolled back', fenced; END IF;

  SELECT count(*) INTO governed FROM c.client_brand_asset
  WHERE client_id='{INV}' AND asset_meta->>'usage' IN ('logo','logo_vector_source')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF governed <> 0 THEN RAISE EXCEPTION 'invegent-logo verify failed: % governed logo rows, expected 0 — rolled back', governed; END IF;

  SELECT brand_logo_url INTO bp_logo FROM c.client_brand_profile WHERE client_id='{INV}';
  IF bp_logo IS NOT NULL THEN RAISE EXCEPTION 'invegent-logo verify failed: brand_profile.brand_logo_url changed from NULL (%) — rolled back', bp_logo; END IF;
END $$;

COMMIT;""")
io.open('invegent_logo_intake_apply.sql','w',encoding='utf-8',newline='\n').write('\n'.join(sql)+'\n')

aids="','".join(m['aid'] for m in META.values())
rb=f"""-- Invegent logo intake ROLLBACK: guarded delete of the {len(ROWS)} fenced lane rows; storage objects excluded.
BEGIN;
DELETE FROM c.client_brand_asset WHERE client_id='{INV}' AND asset_meta->>'intake_lane_batch'='{LANE}'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE;
DO $$ DECLARE r int; BEGIN
  SELECT count(*) INTO r FROM c.client_brand_asset WHERE asset_id IN ('{aids}');
  IF r <> 0 THEN RAISE EXCEPTION 'invegent-logo rollback refused: % rows remain (promoted?) — manual review', r; END IF;
END $$;
COMMIT;"""
io.open('invegent_logo_intake_rollback.sql','w',encoding='utf-8',newline='\n').write(rb+'\n')

for f in ('invegent_logo_intake_apply.sql','invegent_logo_intake_rollback.sql'):
    print(f, hashlib.sha256(open(f,'rb').read()).hexdigest(), os.path.getsize(f),'bytes')
print('curated rows:', len(ROWS), '| staged:', len(manifest), '| distinct sha:', len(seen))
