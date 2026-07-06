import json, hashlib, os, shutil

BASE = r'C:\Users\parve\Invegent-content-engine\_harness\image_harvester_v0'
os.chdir(BASE)
os.makedirs('batch_intake/upload_staging', exist_ok=True)

# (asset_key, final_path, source_metadata_file, platform_scope, wb_scrim, label_constraint, usage_note)
SPEC = [
 ('bg_pp_au_suburb_texture', 'final/mm_a_au_suburb_texture_bestpick.jpg', 'metadata.json',
  ['facebook','instagram','linkedin'], 0.55,
  'generic Australian suburb texture; photographed over a NSW regional town — never label location-specific',
  'cc-0027 run-1 best-pick; ACCEPT_VISUAL_ONLY 2026-07-05'),
 ('bg_pp_transaction_keys_contract', 'final/mm_b_transaction_keys_table_bestpick.jpg', 'metadata.json',
  ['facebook','instagram','linkedin'], 0.56,
  'contract + keys + house model flat-lay; document is an unsigned foreign template, zero legible PII (zoom-verified)',
  'cc-0027 run-1 best-pick; ACCEPT_VISUAL_ONLY 2026-07-05'),
 ('bg_pp_kitchen_living_open_plan', 'run3_b3m1/final/bg_pp_kitchen_living_open_plan.jpg', 'run3_b3m1/metadata.json',
  ['facebook','instagram','linkedin'], 0.52, None,
  'B3M1 best-pick; ACCEPT_VISUAL_ONLY 2026-07-06; verified-AU open-plan; warm sunset-flare mood (style note)'),
 ('bg_pp_family_backyard_summer', 'run3_b3m1/final/bg_pp_family_backyard_summer.jpg', 'run3_b3m1/metadata.json',
  ['facebook','instagram'], 0.54, None,
  'B3M1 best-pick; ACCEPT_VISUAL_ONLY 2026-07-06; verified Gold Coast QLD; filmic haze (style note); pool/alfresco-led'),
 ('bg_pp_new_build_construction_site', 'run4_b3m2/final/bg_pp_new_build_construction_site.jpg', 'run4_b3m2/metadata.json',
  ['facebook','linkedin'], 0.72, None,
  'B3M2 best-pick; ACCEPT_VISUAL_ONLY 2026-07-06; AU timber trusses; Low text-safe; needs strong scrim; mill codes unreadable at card scale'),
 ('bg_pp_subdivision_land_estate', 'run4_b3m2/final/bg_pp_subdivision_land_estate.jpg', 'run4_b3m2/metadata.json',
  ['facebook','linkedin'], 0.60,
  'generic new-estate / subdivision ONLY; NEVER label as WA, Perth, or location-specific (geography unconfirmed)',
  'B3M2 best-pick; ACCEPT_VISUAL_ONLY 2026-07-06; top-down nadir estate; text-safe at 0.60'),
 ('bg_pp_mortgage_calculator_keys', 'run5_b3m3/final/bg_pp_mortgage_calculator_keys.jpg', 'run5_b3m3/metadata.json',
  ['facebook','instagram','linkedin'], 0.56, None,
  'B3M3 best-pick; ACCEPT_VISUAL_ONLY 2026-07-06; calculator+key+foam-house concept props; blank display (no misleading sum)'),
 ('bg_pp_inspection_checklist_clipboard', 'run5_b3m3/final/bg_pp_inspection_checklist_clipboard.jpg', 'run5_b3m3/metadata.json',
  ['facebook','instagram'], 0.55, None,
  'B3M3 best-pick; ACCEPT_VISUAL_ONLY 2026-07-06; hand ticking generic scribble checklist; NO face; items unreadable'),
]

def load_candidates(mf):
    d = json.load(open(mf, encoding='utf-8'))
    if isinstance(d, list): return d
    return d.get('candidates', [])

def field(rec, *names):
    for n in names:
        if n in rec and rec[n] not in (None, ''): return rec[n]
    return None

roster = []
for key, fin, mf, scope, wb_scrim, label, note in SPEC:
    data = open(fin, 'rb').read()
    sha = hashlib.sha256(data).hexdigest()
    cands = load_candidates(mf)
    rec = next((c for c in cands if c.get('sha256') == sha), None)
    assert rec is not None, f'no metadata record matching sha for {key} in {mf}'
    from PIL import Image
    im = Image.open(fin)
    entry = {
     'asset_key': key,
     'final_path': fin,
     'bytes': len(data), 'sha256': sha, 'width': im.width, 'height': im.height,
     'source_platform': field(rec,'source_platform'),
     'source_url': field(rec,'source_url','source_page_url'),
     'download_url': field(rec,'download_url'),
     'photographer': field(rec,'photographer','creator'),
     'licence_name': field(rec,'licence_name'),
     'licence_url': field(rec,'licence_url'),
     'attribution_required': rec.get('attribution_required', False),
     'attribution_text': field(rec,'attribution_text'),
     'visual_description': field(rec,'visual_description'),
     'text_safe_notes': field(rec,'text_safe_notes'),
     'suggested_scrim_opacity': field(rec,'suggested_scrim_opacity') or wb_scrim,
     'platform_scope': scope,
     'label_constraint': label,
     'usage_note': note,
     'source_metadata_file': mf,
    }
    # stage upload copy named by asset_key
    dst = f'batch_intake/upload_staging/{key}.jpg'
    shutil.copy2(fin, dst)
    assert hashlib.sha256(open(dst,'rb').read()).hexdigest() == sha, 'staging copy hash drift'
    entry['upload_file'] = dst
    entry['target_path'] = f'Property_Pulse/Backgrounds/{key}.jpg'
    roster.append(entry)

json.dump(roster, open('batch_intake/roster.json','w',encoding='utf-8'), indent=1, ensure_ascii=False)
print('roster assembled:', len(roster), 'assets; staged + hash-verified')
for e in roster:
    print(f"  {e['asset_key']:38} {e['width']}x{e['height']:<5} {e['sha256'][:12]} {e['photographer']} / {e['licence_name']} | scope {[s[:2] for s in e['platform_scope']]}")
EOF_MARK = None
