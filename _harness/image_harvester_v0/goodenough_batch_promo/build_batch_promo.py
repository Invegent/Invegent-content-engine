import json, hashlib, os, io
os.chdir(os.path.dirname(os.path.abspath(__file__)))
PP='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
LANE='pp-bg-goodenough-batch-promo (2026-07-06)'
PACKET='_harness/image_harvester_v0/goodenough_batch_promo/GOODENOUGH_BATCH_PROMO_GATE_PACKET.md'

# 6 fenced rows (verified live). (asset_id, key, sha, pillar)
ROWS=[
 ("b2a10005-9c4e-4f7a-8d21-0d5e6f7a8b05","bg_pp_sold_sign_closeup","d566d622b28f8ecc291d848436e6399ca326bf4f87a29557abee7ee09d0c31a0","sales/results"),
 ("b3a20005-9c4e-4f7a-8d21-0d5e6f7a8b05","bg_pp_new_build_construction_site","6e32a1e292e0c8fdd244ab630619e8b1a317a7fa608baf80d10c44172087b780","construction"),
 ("b3a20006-9c4e-4f7a-8d21-0d5e6f7a8b06","bg_pp_subdivision_land_estate","03482fe2586ea23cbc1e1f6a63476bca62160b4cb29e46c308cfca6103785b68","land"),
 ("b3a20007-9c4e-4f7a-8d21-0d5e6f7a8b07","bg_pp_mortgage_calculator_keys","84dbab66a9fe2550a673a0e66bbc2b5fe7a21362d60c2b9459d157670cadd842","finance"),
 ("b3a20008-9c4e-4f7a-8d21-0d5e6f7a8b08","bg_pp_inspection_checklist_clipboard","5db1fbe3677babc38cb66aa071d3c9e52a5a3bfcdab1600eb51a09d8f4d4b634","inspection"),
 ("b2a10003-9c4e-4f7a-8d21-0d5e6f7a8b03","bg_pp_modern_home_exterior_front","836d2cf62a0cac5704e956fb96d237287a77929dcc495c6229915fadfc3a28ec","residential exterior"),
]
PRIOR=['bg_brisbane_cbd','bg_perth_cbd','bg_pp_advisory_desk_flatlay','bg_pp_au_suburb_aerial_grid','bg_pp_city_skyline_vantage',
       'bg_pp_coastal_waterfront','bg_pp_home_keys_contract_table','bg_pp_kitchen_living_open_plan','bg_pp_market_data_chart_grid',
       'bg_pp_perth_cbd_skyline_day_wide','bg_sydney_cbd']
prior_sql="','".join(PRIOR)

# Forward patch — pk_decision, label_constraint, geography, notes ALL untouched (enables clean mechanical reversal).
patch={"approved":True,"approval_status":"governed","production_use_allowed":True,"approved_by":"PK",
 "promotion_decision":"good-enough coverage batch promotion (PK-ratified 2026-07-06) — LIVE PRODUCTION CHANGE: joins the Option-D resolver pool; each row adds a distinct content pillar; per-row label_constraint/geography fences remain binding",
 "promotion_lane":LANE,"promotion_packet":PACKET}
patch_json=json.dumps(patch, ensure_ascii=False, separators=(',',':')).replace("'","''")
# added keys the rollback must strip:
ADDED=['approved_by','approved_at','promotion_decision','promotion_lane','promotion_packet']

sql=[f"""-- GOOD-ENOUGH BATCH PROMOTION — promote 6 intake candidates to governed/active. *** LIVE PRODUCTION CHANGE ***
-- P1 batch applied at the T3 promotion tier: ONE full T3 chain for the batch (§2 keeps the full chain; P2 waiver is intake-only).
-- Rows (distinct pillars): sold_sign · construction · land · mortgage · inspection · modern_home_exterior.
-- Design: forward patch does NOT touch pk_decision/label_constraint/geography/notes → the rollback is a clean MECHANICAL reversal
--         (strip the 5 added keys, reset the 3 flags) that restores each row byte-exact. Verified read-only pre-apply.
-- Pool: fb 11→17 · li 11→15 · ig 10→14 · all 11→17 (scopes differ per row).
BEGIN;"""]
for aid,key,sha,pillar in ROWS:
    sql.append(f"""
UPDATE c.client_brand_asset
SET is_active = true,
    asset_meta = asset_meta || '{patch_json}'::jsonb
      || jsonb_build_object('approved_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US+00:00')),
    updated_at = now()
WHERE asset_id = '{aid}' AND client_id = '{PP}' AND asset_meta->>'asset_key' = '{key}'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
  AND asset_meta->>'approval_status' = 'intake_candidate'
  AND asset_meta->>'sha256' = '{sha}';""")

ids="','".join(r[0] for r in ROWS)
sql.append(f"""
DO $$
DECLARE promoted int; pool int; fb int; li int; ig int; gov int;
BEGIN
  SELECT count(*) INTO promoted FROM c.client_brand_asset
  WHERE asset_id IN ('{ids}')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE
    AND asset_meta->>'approval_status' = 'governed' AND (asset_meta->>'production_use_allowed')::boolean IS TRUE
    AND asset_meta->>'promotion_lane' = '{LANE}' AND asset_meta ? 'approved_at' AND asset_meta->>'approved_by' = 'PK';
  IF promoted <> 6 THEN RAISE EXCEPTION 'batch-promo verify failed: % promoted, expected 6 — rolled back', promoted; END IF;

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
  IF pool<>17 OR fb<>17 OR li<>15 OR ig<>14 THEN
    RAISE EXCEPTION 'batch-promo verify failed: pool (all=% fb=% li=% ig=%), expected 17/17/15/14 — rolled back', pool, fb, li, ig; END IF;

  SELECT count(*) INTO gov FROM c.client_brand_asset
  WHERE client_id='{PP}' AND asset_meta->>'asset_key' IN ('{prior_sql}')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF gov <> 11 THEN RAISE EXCEPTION 'batch-promo verify failed: prior governed set=%, expected 11 untouched — rolled back', gov; END IF;
END $$;

COMMIT;""")
io.open('batch_promo_apply.sql','w',encoding='utf-8',newline='\n').write('\n'.join(sql)+'\n')

# Mechanical rollback: strip added keys + reset 3 flags → byte-exact original. Keyed on promotion_lane.
strip=' '.join("- '%s'"%k for k in ADDED)
rb=f"""-- GOOD-ENOUGH BATCH PROMOTION ROLLBACK (demotion): mechanical reversal → each row restored byte-exact.
-- *** LIVE PRODUCTION CHANGE IN REVERSE *** — pool returns 17/17/15/14 → 11/11/11/10 on COMMIT.
BEGIN;
UPDATE c.client_brand_asset
SET is_active = false,
    asset_meta = (asset_meta {strip})
      || '{{"approved":false,"approval_status":"intake_candidate","production_use_allowed":false}}'::jsonb,
    updated_at = now()
WHERE client_id = '{PP}' AND asset_meta->>'promotion_lane' = '{LANE}';

DO $$ DECLARE n int; pool int; BEGIN
  SELECT count(*) INTO n FROM c.client_brand_asset
  WHERE asset_id IN ('{ids}') AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status'='intake_candidate' AND NOT (asset_meta ? 'promotion_lane');
  IF n <> 6 THEN RAISE EXCEPTION 'batch-promo demotion failed: % restored, expected 6', n; END IF;
  WITH elig AS (SELECT a.platform_scope FROM c.client_brand_asset a WHERE a.client_id='{PP}' AND a.asset_meta->>'usage'='background'
    AND a.is_active AND (a.asset_meta->>'approved')::boolean AND (a.asset_meta->>'license_type' IS NOT NULL OR a.asset_meta->>'license' IS NOT NULL)
    AND COALESCE(a.asset_meta->>'bucket','')='brand-assets' AND a.asset_meta->>'safe_for_text_overlay' IN ('true','needs_scrim'))
  SELECT count(*) INTO pool FROM elig;
  IF pool <> 11 THEN RAISE EXCEPTION 'batch-promo demotion failed: pool=%, expected restored 11', pool; END IF;
END $$;
COMMIT;"""
io.open('batch_promo_rollback.sql','w',encoding='utf-8',newline='\n').write(rb+'\n')

for f in ('batch_promo_apply.sql','batch_promo_rollback.sql'):
    print(f, hashlib.sha256(open(f,'rb').read()).hexdigest(), os.path.getsize(f),'bytes')
