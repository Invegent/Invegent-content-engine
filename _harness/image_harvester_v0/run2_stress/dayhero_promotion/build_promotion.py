import json, hashlib, os, io

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PP = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
AID = 'b2a10008-9c4e-4f7a-8d21-0d5e6f7a8b08'
KEY = 'bg_pp_perth_cbd_skyline_day_wide'
SHA = '620c77b43edc557a7f1790b15c27c4f2c993fd1588afb1322ee001c2073743cb'
LANE = 'pp-bg-dayhero-promotion (2026-07-05)'

BEFORE_META = {"mime":"image/jpeg","bytes":2386153,"usage":"background","width":4000,"bucket":"brand-assets","height":2250,"sha256":SHA,"license":"Unsplash License (free for commercial use, no attribution required)","approved":False,"has_text":False,"location":"Perth","asset_key":KEY,"has_people":False,"source_url":"https://unsplash.com/photos/gl7nkS_h4lo","license_url":"https://unsplash.com/license","pk_decision":"intake_only (day-hero intake lane, PK best-pick acceptance 2026-07-05); production approval/promotion requires a separate PK gate — WARNING: since Option D (v4.95) the resolver pool drives LIVE PP image_quote production, so promotion of this asset changes production rotation","source_path":"Property_Pulse/Backgrounds/bg_pp_perth_cbd_skyline_day_wide.jpg","source_site":"unsplash","aspect_ratio":"16:9","harvest_lane":"cc-0027 image-harvester run2_stress (2026-07-05)","license_type":"unsplash_license","photographer":"Joshua Leong (@jleonnn)","visual_style":"photographic","review_packet":"_harness/image_harvester_v0/run2_stress/dayhero_intake/DAYHERO_GATE_PACKET.md","sha256_source":"cc-0027 run2_stress harvest file hashed at packet build 2026-07-05; upload target Property_Pulse/Backgrounds/bg_pp_perth_cbd_skyline_day_wide.jpg must byte-match (in-SQL size precheck + mandatory post-upload public-URL sha256 check)","approval_status":"intake_candidate","attribution_note":"Not required (optional credit: Photo by Joshua Leong on Unsplash)","visual_review_note":"cc-0027 run-2 stress proof: harvester best-pick, image-reviewer concurred PASS_WITH_NOTE (skyline construction cranes + small rooftop corporate logos [RioTinto + one LED sign] legible at full res = accepted trade-off, no agency branding, no faces); PK ACCEPTED as day-hero best-pick 2026-07-05 — closes the bright-day Perth skyline sourcing carry at the sourcing level.","intake_lane_dayhero":"pp-bg-dayhero-intake (2026-07-05)","attribution_required":False,"original_download_url":"https://unsplash.com/photos/gl7nkS_h4lo/download?force=true","safe_for_text_overlay":"needs_scrim","visual_review_verdict":"PASS_WITH_NOTE","production_use_allowed":False,"suggested_scrim_opacity":0.48}
BEFORE_NOTES = 'Intake candidate (cc-0027 run-2 best-pick, PK-accepted day-hero — closes the bright-day Perth skyline sourcing carry). PROMOTION WARNING: resolver pool is production-live (Option D) — promoting this asset changes PP image_quote rotation in production; promotion is its own PK gate.'
NEW_NOTES = 'GOVERNED (promoted from intake_candidate 2026-07-05, PK day-hero promotion gate — LIVE production-rotation change acknowledged: eligible pool 5→6 for facebook/linkedin; instagram pool unchanged at 5 via platform fence). cc-0027 run-2 best-pick; PASS_WITH_NOTE trade-offs (skyline cranes + small rooftop corporate logos) accepted.'

json.dump({'asset_id': AID, 'meta': BEFORE_META, 'notes': BEFORE_NOTES, 'updated_at_before': '2026-07-05 05:03:02.443134+00', 'pool_before': 5},
          io.open('before_state.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

def jstr(o):
    return json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace("'", "''")

def esc(s):
    return s.replace("'", "''")

merge = {
 'approved': True,
 'approval_status': 'governed',
 'production_use_allowed': True,
 'approved_by': 'PK',
 'pk_decision': 'promote (day-hero promotion gate, PK-approved 2026-07-05) — LIVE PRODUCTION CHANGE acknowledged: joins the Option-D resolver pool (facebook/linkedin 5→6; instagram stays 5, platform fence); usage trade-offs in visual_review_note remain recorded',
 'promotion_lane_dayhero': LANE,
 'promotion_packet': '_harness/image_harvester_v0/run2_stress/dayhero_promotion/PROMOTION_GATE_PACKET.md',
}

apply_sql = f"""-- Day-hero PROMOTION: 1 row intake_candidate -> governed/active. *** LIVE PRODUCTION CHANGE ***
-- Option D: the resolver pool drives PP image_quote production. This apply changes the eligible
-- background pool for facebook/linkedin callers from 5 to 6 (instagram remains 5 via the live
-- platform fence — this asset's platform_scope is {{facebook,linkedin}}). Rotation composition for
-- affected platforms shifts from the moment of COMMIT. PK gate approval = acknowledgement of that.
BEGIN;

UPDATE c.client_brand_asset
SET is_active = true,
    asset_meta = asset_meta
      || '{jstr(merge)}'::jsonb
      || jsonb_build_object('approved_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US+00:00')),
    notes = '{esc(NEW_NOTES)}',
    updated_at = now()
WHERE asset_id = '{AID}'
  AND client_id = '{PP}'
  AND asset_meta->>'asset_key' = '{KEY}'
  AND is_active IS FALSE
  AND (asset_meta->>'approved')::boolean IS FALSE
  AND asset_meta->>'approval_status' = 'intake_candidate'
  AND asset_meta->>'intake_lane_dayhero' = 'pp-bg-dayhero-intake (2026-07-05)'
  AND asset_meta->>'sha256' = '{SHA}';

DO $$
DECLARE promoted int; pool int; governed7 int; still_candidates int;
BEGIN
  SELECT count(*) INTO promoted FROM c.client_brand_asset
  WHERE asset_id = '{AID}'
    AND is_active IS TRUE
    AND (asset_meta->>'approved')::boolean IS TRUE
    AND asset_meta->>'approval_status' = 'governed'
    AND (asset_meta->>'production_use_allowed')::boolean IS TRUE
    AND asset_meta->>'promotion_lane_dayhero' = '{LANE}'
    AND asset_meta ? 'approved_at' AND asset_meta->>'approved_by' = 'PK';
  IF promoted <> 1 THEN
    RAISE EXCEPTION 'dayhero promotion verification failed: % rows promoted, expected 1 — rolled back', promoted;
  END IF;

  -- pool becomes exactly 6 (production-live under Option D)
  SELECT count(*) INTO pool FROM c.client_brand_asset
  WHERE client_id = '{PP}' AND asset_meta->>'usage' = 'background'
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE
    AND (asset_meta->>'license_type' IS NOT NULL OR asset_meta->>'license' IS NOT NULL)
    AND COALESCE(asset_meta->>'bucket','') = 'brand-assets'
    AND asset_meta->>'safe_for_text_overlay' IN ('true','needs_scrim');
  IF pool <> 6 THEN
    RAISE EXCEPTION 'dayhero promotion verification failed: eligible pool = %, expected exactly 6 — rolled back', pool;
  END IF;

  SELECT count(*) INTO governed7 FROM c.client_brand_asset
  WHERE client_id = '{PP}'
    AND asset_meta->>'asset_key' IN ('bg_perth_cbd','bg_brisbane_cbd','bg_sydney_cbd','bg_pp_au_suburb_aerial_grid','bg_pp_home_keys_contract_table')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF governed7 <> 5 THEN
    RAISE EXCEPTION 'dayhero promotion verification failed: prior governed set = %, expected 5 untouched — rolled back', governed7;
  END IF;

  SELECT count(*) INTO still_candidates FROM c.client_brand_asset
  WHERE asset_meta->>'intake_lane_b2' = 'pp-bg-p0-db-intake-batch2 (2026-07-03)'
    AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE;
  IF still_candidates <> 5 THEN
    RAISE EXCEPTION 'dayhero promotion verification failed: batch-2 candidates = %, expected 5 untouched — rolled back', still_candidates;
  END IF;
END $$;

COMMIT;
"""
io.open('promotion_apply.sql', 'w', encoding='utf-8', newline='\n').write(apply_sql)

rollback_sql = f"""-- Day-hero promotion ROLLBACK (demotion): restore the exact pre-promotion candidate state.
-- *** LIVE PRODUCTION CHANGE IN REVERSE *** — pool returns 6 -> 5 for facebook/linkedin on COMMIT.
BEGIN;
UPDATE c.client_brand_asset
SET is_active = false,
    asset_meta = '{jstr(BEFORE_META)}'::jsonb,
    notes = '{esc(BEFORE_NOTES)}',
    updated_at = now()
WHERE asset_id = '{AID}'
  AND asset_meta->>'asset_key' = '{KEY}';

DO $$
DECLARE n int; pool int;
BEGIN
  SELECT count(*) INTO n FROM c.client_brand_asset
  WHERE asset_id = '{AID}' AND is_active IS FALSE
    AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status' = 'intake_candidate'
    AND NOT (asset_meta ? 'promotion_lane_dayhero');
  IF n <> 1 THEN
    RAISE EXCEPTION 'dayhero demotion verification failed: % rows restored, expected 1', n;
  END IF;
  SELECT count(*) INTO pool FROM c.client_brand_asset
  WHERE client_id = '{PP}' AND asset_meta->>'usage' = 'background'
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE
    AND (asset_meta->>'license_type' IS NOT NULL OR asset_meta->>'license' IS NOT NULL)
    AND COALESCE(asset_meta->>'bucket','') = 'brand-assets'
    AND asset_meta->>'safe_for_text_overlay' IN ('true','needs_scrim');
  IF pool <> 5 THEN
    RAISE EXCEPTION 'dayhero demotion verification failed: pool = %, expected restored 5', pool;
  END IF;
END $$;
COMMIT;
"""
io.open('promotion_rollback.sql', 'w', encoding='utf-8', newline='\n').write(rollback_sql)

for f in ('promotion_apply.sql', 'promotion_rollback.sql'):
    print(f, hashlib.sha256(open(f, 'rb').read()).hexdigest(), os.path.getsize(f), 'bytes')
