import csv, json, hashlib, os, shutil, uuid
from PIL import Image

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P0 = r'C:\Users\parve\Invegent-content-engine\_harness\pp_background_intake_p0'
PP_CLIENT = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
LANE = 'pp-bg-p0-db-intake-batch2 (2026-07-03)'
BASE_URL = 'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/'

# candidate_file -> (asset_key, platform_scope, asset_name, location, has_text, scrim, notes_col)
PLAN = {
 'images/cand_r2b_fadder8_RESEQty1uvc.jpg': (
   'bg_pp_perth_skyline_dawn_moody', ['facebook','linkedin'],
   'Perth skyline dawn (moody) background', 'Perth', False, 0.55,
   'Intake candidate. PK visual review: moody Perth market-update background ONLY — not the bright-day hero skyline (day-hero remains a manual-sourcing carry). Key renamed from workbook bg_pp_perth_cbd_skyline_day_wide to reflect actual content.'),
 'images/cand_r3_tomrumble.jpg': (
   'bg_pp_au_suburb_aerial_grid', ['facebook','instagram','linkedin'],
   'Generic Australian suburb aerial grid background', 'Australia (generic; photographed over Melbourne — never label as Perth)', False, 0.64,
   'Intake candidate. PK visual review: generic Australian suburb ONLY; never label as Perth. Perth-specific aerial remains a manual-sourcing carry.'),
 'images/cand_r4_tmortier_sIsiRYz3VKk.jpg': (
   'bg_pp_modern_home_exterior_front', ['facebook','instagram'],
   'Modern Australian townhouse exteriors background', 'Australia (Clyde North, VIC)', False, 0.58,
   'Intake candidate. PK visual review: seller tips / modern housing / development content — not a detached-family-home hero.'),
 'images/cand_r5_rbell_z1EIv3nsHJQ.jpg': (
   'bg_pp_for_sale_sign_street', ['facebook','instagram','linkedin'],
   'Unbranded FOR SALE sign background', 'generic', True, 0.62,
   'Intake candidate. PK visual review: PARTIAL FIT — utility/sign-subject background only; no standard centre-text overlay unless the template offsets text.'),
 'images/cand_r6b_thirdman_8470834.jpg': (
   'bg_pp_sold_sign_closeup', ['facebook','instagram','linkedin'],
   'Unbranded SOLD sign on lawn background', 'generic', True, 0.60,
   'Intake candidate. PK visual review: PASS.'),
 'images/cand_r7_tmallorca_rgJ1J8SDEAY.jpg': (
   'bg_pp_home_keys_contract_table', ['facebook','instagram','linkedin'],
   'House keys and miniature house on desk background', 'generic (indoor)', False, 0.56,
   'Intake candidate. PK visual review: PASS. Widely-used non-exclusive stock image.'),
 'images/cand_r9_ftosolini_XcVm8mn7NUM.jpg': (
   'bg_pp_open_home_entry', ['facebook','instagram'],
   'Bright home porch entry background', 'generic (US-style porch)', False, 0.55,
   'Intake candidate. PK visual review: open-home checklist/tips; generic/open-home scope, not Perth-specific.'),
}

# fixed asset_ids (deterministic artifact + deterministic rollback)
IDS = {
 'bg_pp_perth_skyline_dawn_moody':   'b2a10001-9c4e-4f7a-8d21-0d5e6f7a8b01',
 'bg_pp_au_suburb_aerial_grid':      'b2a10002-9c4e-4f7a-8d21-0d5e6f7a8b02',
 'bg_pp_modern_home_exterior_front': 'b2a10003-9c4e-4f7a-8d21-0d5e6f7a8b03',
 'bg_pp_for_sale_sign_street':       'b2a10004-9c4e-4f7a-8d21-0d5e6f7a8b04',
 'bg_pp_sold_sign_closeup':          'b2a10005-9c4e-4f7a-8d21-0d5e6f7a8b05',
 'bg_pp_home_keys_contract_table':   'b2a10006-9c4e-4f7a-8d21-0d5e6f7a8b06',
 'bg_pp_open_home_entry':            'b2a10007-9c4e-4f7a-8d21-0d5e6f7a8b07',
}

hand = {r['candidate_file']: r for r in csv.DictReader(open(os.path.join(P0, 'pp_background_intake_p0_handoff.csv'), encoding='utf-8-sig'))}

os.makedirs('upload_staging', exist_ok=True)
manifest, inserts, checks = [], [], []
for cand, (key, scope, name, loc, has_text, scrim, note_col) in PLAN.items():
    r = hand[cand]
    src = os.path.join(P0, cand.replace('/', os.sep))
    data = open(src, 'rb').read()
    sha = hashlib.sha256(data).hexdigest()
    assert sha == r['sha256'], f'hash drift for {cand}: {sha} != {r["sha256"]}'
    im = Image.open(src)
    assert (im.width, im.height) == (int(r['width']), int(r['height'])), f'dim drift {cand}'
    fname = key + '.jpg'
    dest = os.path.join('upload_staging', fname)
    shutil.copy2(src, dest)
    path = 'Property_Pulse/Backgrounds/' + fname
    manifest.append(dict(upload_file='upload_staging/' + fname, target_path='brand-assets/' + path,
                         bytes=len(data), width=im.width, height=im.height, sha256=sha,
                         asset_key=key, source_candidate=cand))
    ar = im.width / im.height
    ratios = {'16:9': 16/9, '3:2': 3/2, '4:3': 4/3, '1:1': 1.0, '4:5': 4/5, '2:3': 2/3, '9:16': 9/16}
    aspect = min(ratios, key=lambda k: abs(ratios[k] - ar))
    lic_type = 'unsplash_license' if r['license_name'] == 'Unsplash License' else 'pexels_license'
    meta = {
        'mime': 'image/jpeg', 'bytes': len(data), 'width': im.width, 'height': im.height,
        'sha256': sha,
        'sha256_source': 'harvest package file hashed at packet build 2026-07-03; upload target ' + path + ' must byte-match (verified in apply assertions + post-upload hash check)',
        'usage': 'background', 'bucket': 'brand-assets', 'source_path': path,
        'asset_key': key, 'location': loc, 'aspect_ratio': aspect,
        'has_people': False, 'has_text': has_text, 'visual_style': 'photographic',
        'license': r['license_name'] + ' (free for commercial use, no attribution required)',
        'license_type': lic_type, 'license_url': r['license_url'],
        'attribution_required': False,
        'attribution_note': r['attribution_text'],
        'photographer': r['photographer'],
        'source_site': r['source_platform'].lower(), 'source_url': r['source_url'],
        'original_download_url': r['download_url'],
        'approved': False, 'approval_status': 'intake_candidate',
        'pk_decision': 'intake_only (Batch 2 DB-intake, 2026-07-03); production approval requires a separate PK gate',
        'production_use_allowed': False,
        'visual_review_verdict': r['visual_review_verdict'],
        'visual_review_note': r['visual_review_note'],
        'suggested_scrim_opacity': scrim,
        'safe_for_text_overlay': 'needs_scrim',
        'harvest_lane': 'pp-background-intake-p0 (2026-07-03)',
        'intake_lane_b2': LANE,
        'review_packet': '_harness/pp_background_coverage_recon/batch2/BATCH2_GATE_PACKET.md',
    }
    meta_sql = json.dumps(meta, ensure_ascii=False, separators=(',', ':')).replace("'", "''")
    scope_sql = 'ARRAY[' + ','.join(f"'{p}'" for p in scope) + ']'
    inserts.append(f"""
-- {key}
INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT '{IDS[key]}', '{PP_CLIENT}', 'other', '{name}',
       '{BASE_URL}{path}',
       '{meta_sql}'::jsonb,
       {scope_sql}, false,
       '{note_col.replace(chr(39), chr(39)*2)}'
WHERE NOT EXISTS (
  SELECT 1 FROM c.client_brand_asset
  WHERE client_id = '{PP_CLIENT}' AND asset_meta->>'asset_key' = '{key}'
);""")
    checks.append(f"  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='{path}' AND (metadata->>'size')::bigint = {len(data)};\n"
                  f"  IF NOT FOUND THEN RAISE EXCEPTION 'batch2 upload precheck failed: {path} missing or wrong size — transaction rolled back'; END IF;")

id_list = ',\n                     '.join(f"'{IDS[k]}'" for k in IDS)
apply_sql = f"""-- Batch 2: PP P0 background DB-intake (INSERT-only, governed inventory CANDIDATES)
-- 7 new c.client_brand_asset rows: is_active=false, asset_meta.approved=false, approval_status=intake_candidate.
-- NOT production approval. No UPDATE/DELETE. Existing 4 PP rows untouched.
-- Precondition (asserted below, fail-closed): the 7 files are already uploaded to
-- brand-assets/Property_Pulse/Backgrounds/ with exact expected byte sizes.
BEGIN;

-- upload prechecks (same-DB storage catalog; abort before any insert if uploads missing/wrong)
DO $$
BEGIN
{chr(10).join(checks)}
END $$;
{''.join(inserts)}

DO $$
DECLARE n int; pre int; tot int;
BEGIN
  SELECT count(*) INTO n FROM c.client_brand_asset
  WHERE client_id = '{PP_CLIENT}'
    AND asset_meta->>'intake_lane_b2' = '{LANE}'
    AND is_active IS FALSE
    AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status' = 'intake_candidate'
    AND asset_id IN ({id_list});
  IF n <> 7 THEN
    RAISE EXCEPTION 'batch2 verification failed: % candidate rows in expected state, expected 7 — transaction rolled back', n;
  END IF;

  SELECT count(*) INTO pre FROM c.client_brand_asset
  WHERE client_id = '{PP_CLIENT}'
    AND (asset_meta->>'approved')::boolean IS TRUE AND is_active IS TRUE;
  IF pre <> 4 THEN
    RAISE EXCEPTION 'batch2 verification failed: pre-existing approved+active PP rows = %, expected 4 (must be untouched) — transaction rolled back', pre;
  END IF;

  SELECT count(*) INTO tot FROM c.client_brand_asset WHERE client_id = '{PP_CLIENT}';
  IF tot <> 11 THEN
    RAISE EXCEPTION 'batch2 verification failed: PP total rows = %, expected 11 — transaction rolled back', tot;
  END IF;
END $$;

COMMIT;
"""
open('batch2_apply.sql', 'w', encoding='utf-8').write(apply_sql)

rollback_sql = f"""-- Batch 2 ROLLBACK: delete ONLY the 7 Batch-2 intake-candidate rows (guarded), restoring PP to 4 rows.
-- Refuses to delete any row that is active or approved (i.e. anything promoted since intake).
BEGIN;

DELETE FROM c.client_brand_asset
WHERE asset_id IN ({id_list})
  AND client_id = '{PP_CLIENT}'
  AND asset_meta->>'intake_lane_b2' = '{LANE}'
  AND is_active IS FALSE
  AND (asset_meta->>'approved')::boolean IS FALSE;

DO $$
DECLARE remaining int; tot int;
BEGIN
  SELECT count(*) INTO remaining FROM c.client_brand_asset
  WHERE asset_meta->>'intake_lane_b2' = '{LANE}';
  IF remaining <> 0 THEN
    RAISE EXCEPTION 'batch2 rollback verification failed: % lane rows remain (some may be promoted — manual review required)', remaining;
  END IF;
  SELECT count(*) INTO tot FROM c.client_brand_asset WHERE client_id = '{PP_CLIENT}';
  IF tot <> 4 THEN
    RAISE EXCEPTION 'batch2 rollback verification failed: PP total rows = %, expected 4', tot;
  END IF;
END $$;

COMMIT;
-- NOTE: storage objects uploaded for Batch 2 are NOT deleted by this script (storage deletion is
-- PK-gated and out of scope); after a rollback they become inert ungoverned files pending PK decision.
"""
open('batch2_rollback.sql', 'w', encoding='utf-8').write(rollback_sql)

json.dump(manifest, open('upload_manifest.json', 'w', encoding='utf-8'), indent=1)
with open('upload_manifest.csv', 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.DictWriter(fh, fieldnames=list(manifest[0].keys())); w.writeheader(); w.writerows(manifest)

for f in ('batch2_apply.sql', 'batch2_rollback.sql'):
    print(f, hashlib.sha256(open(f, 'rb').read()).hexdigest(), os.path.getsize(f), 'bytes')
print('staged:', len(manifest), 'files in upload_staging/')
