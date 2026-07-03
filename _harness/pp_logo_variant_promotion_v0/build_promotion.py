"""PP Logo Variant Promotion v0 - artifact generator (PK-gated; generates only).

Promotes 7 of the 18 fenced intake candidates from pp-logo-variant-intake-v0 to
governed/eligible; the other 11 stay fenced. Emits:
  - promote_pp_logo_variants_v0.sql   (UPDATE-only, single transaction, fail-closed)
  - rollback_pp_logo_variants_v0.sql  (exact restore of the 7 rows to intake fences)
  - packet_tables.md
"""
import os, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
CLIENT_ID = "4036a6b5-b4a3-406e-998d-c2fe14a8bbdd"
CLIENT_SLUG = "property-pulse"
LIVE_PRIMARY_ID = "b7530c55-c320-43be-90d9-98c804694921"
LIVE_TEMPLATE_REG_ID = "c0b10001-0000-4000-8000-000000000002"
PACKET = "docs/briefs/pp-logo-variant-promotion-v0-packet.md"
LANE = "pp-logo-variant-promotion-v0 (2026-07-04)"
INTAKE_PK_DECISION = ("intake_only (PP Logo Variant Intake v0, 2026-07-03); "
                      "production approval requires a separate PK gate")

# (asset_id, asset_key, role note)
PROMOTE = [
    ("c3a20009-9c4e-4f7a-8d21-0d5e6f7a8c09", "pp_logo_master_png_1024", "master white_gold transparent - dark backgrounds"),
    ("c3a20011-9c4e-4f7a-8d21-0d5e6f7a8c11", "pp_logo_full_colour_png_1024", "navy_gold transparent - light backgrounds"),
    ("c3a20012-9c4e-4f7a-8d21-0d5e6f7a8c12", "pp_logo_white_png_1024", "white mono transparent - dark/photo backgrounds"),
    ("c3a20013-9c4e-4f7a-8d21-0d5e6f7a8c13", "pp_logo_dark_png_1024", "navy mono transparent - light backgrounds"),
    ("c3a20014-9c4e-4f7a-8d21-0d5e6f7a8c14", "pp_logo_mark_only_png_512", "compact mark - badges/small placements"),
    ("c3a20017-9c4e-4f7a-8d21-0d5e6f7a8c17", "pp_logo_square_navy_bg_png_1024", "boxed navy badge - profile/corner box"),
    ("c3a20018-9c4e-4f7a-8d21-0d5e6f7a8c18", "pp_logo_watermark_white_png", "white watermark - reduced-opacity corner use"),
]

HOLD = [
    ("c3a20008-9c4e-4f7a-8d21-0d5e6f7a8c08", "pp_logo_master_png_512", "alternate size - promote on demand"),
    ("c3a20010-9c4e-4f7a-8d21-0d5e6f7a8c10", "pp_logo_master_png_2048", "alternate size - promote on demand"),
    ("c3a20015-9c4e-4f7a-8d21-0d5e6f7a8c15", "pp_logo_mark_only_png_1024", "alternate size - promote on demand"),
    ("c3a20016-9c4e-4f7a-8d21-0d5e6f7a8c16", "pp_logo_square_navy_bg_png_512", "alternate size - promote on demand"),
    ("c3a20001-9c4e-4f7a-8d21-0d5e6f7a8c01", "pp_logo_master_svg", "vector source-of-truth - never a render asset"),
    ("c3a20002-9c4e-4f7a-8d21-0d5e6f7a8c02", "pp_logo_master_editable_svg", "editing source (Urbanist dependency) - never a render asset"),
    ("c3a20003-9c4e-4f7a-8d21-0d5e6f7a8c03", "pp_logo_full_colour_svg", "vector source-of-truth"),
    ("c3a20004-9c4e-4f7a-8d21-0d5e6f7a8c04", "pp_logo_white_svg", "vector source-of-truth"),
    ("c3a20005-9c4e-4f7a-8d21-0d5e6f7a8c05", "pp_logo_dark_svg", "vector source-of-truth"),
    ("c3a20006-9c4e-4f7a-8d21-0d5e6f7a8c06", "pp_logo_mark_only_svg", "vector source-of-truth"),
    ("c3a20007-9c4e-4f7a-8d21-0d5e6f7a8c07", "pp_logo_mark_only_dark_svg", "vector source-of-truth"),
]

ALL_KEYS = [k for _, k, _ in PROMOTE] + [k for _, k, _ in HOLD]
promote_ids = ", ".join(f"'{i}'" for i, _, _ in PROMOTE)
hold_ids = ", ".join(f"'{i}'" for i, _, _ in HOLD)
all_key_list = ", ".join(f"'{k}'" for k in ALL_KEYS)
hold_png_count = 4   # held rows with usage='logo' (the 4 alternate-size PNGs)

sql = f"""-- ============================================================================
-- PP Logo Variant Promotion v0 (PK-gated; DO NOT APPLY without PK approval)
-- Lane: {LANE}
-- Packet: {PACKET}
-- Promotes 7 intake candidates (from pp-logo-variant-intake-v0, commit 3fdab33) to
-- governed/eligible: approved=true + approval_status='governed' +
-- production_use_allowed=true + is_active=true + platform_scope {{facebook,instagram,linkedin}}.
-- The 11 other candidates stay fenced. The live pp_logo_primary is NOT touched and
-- REMAINS the resolver Logo pick by construction (oldest created_at); production render
-- workers read client_brand_profile.brand_logo_url and are unaffected either way.
-- 0 DDL / 1 UPDATE (7 rows) / fail-closed assertions / in-transaction invariant probes.
-- ============================================================================

BEGIN;

-- ── A1: client identity (fail-closed) ──────────────────────────────────────
DO $$
BEGIN
  IF (SELECT count(*) FROM c.client
      WHERE client_id = '{CLIENT_ID}' AND client_slug = '{CLIENT_SLUG}') <> 1 THEN
    RAISE EXCEPTION 'A1 FAIL: Property Pulse client row not found/mismatched';
  END IF;
END $$;

-- ── A2: all 7 promotion targets exist in the EXACT fenced intake pre-state ──
DO $$
BEGIN
  IF (SELECT count(*) FROM c.client_brand_asset
      WHERE asset_id IN ({promote_ids})
        AND client_id = '{CLIENT_ID}'
        AND is_active IS FALSE
        AND (asset_meta->>'approved')::boolean IS FALSE
        AND asset_meta->>'approval_status' = 'intake_candidate'
        AND (asset_meta->>'production_use_allowed')::boolean IS FALSE
        AND platform_scope IS NULL) <> 7 THEN
    RAISE EXCEPTION 'A2 FAIL: promotion targets not in expected fenced intake pre-state';
  END IF;
END $$;

-- ── A3: live primary logo intact BEFORE change (fail-closed) ────────────────
DO $$
BEGIN
  IF (SELECT count(*) FROM c.client_brand_asset
      WHERE asset_id = '{LIVE_PRIMARY_ID}'
        AND asset_meta->>'asset_key' = 'pp_logo_primary'
        AND (asset_meta->>'approved')::boolean IS TRUE
        AND is_active IS TRUE) <> 1 THEN
    RAISE EXCEPTION 'A3 FAIL: live pp_logo_primary not in expected pre-state';
  END IF;
END $$;

-- ── A4: selection-order invariant precondition: primary is strictly OLDEST ──
-- resolve_slot_assets picks the FIRST eligible logo by (created_at ASC, asset_id ASC);
-- this assertion machine-proves the promoted rows CANNOT outrank the primary.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM c.client_brand_asset
             WHERE asset_id IN ({promote_ids})
               AND created_at <= (SELECT created_at FROM c.client_brand_asset
                                  WHERE asset_id = '{LIVE_PRIMARY_ID}')) THEN
    RAISE EXCEPTION 'A4 FAIL: a promotion target is not strictly newer than the live primary';
  END IF;
END $$;

-- ── PROMOTION: single UPDATE, 7 rows ────────────────────────────────────────
UPDATE c.client_brand_asset
SET is_active      = true,
    platform_scope = ARRAY['facebook','instagram','linkedin'],
    asset_meta     = asset_meta || jsonb_build_object(
                       'approved', true,
                       'approval_status', 'governed',
                       'production_use_allowed', true,
                       'approved_at', to_jsonb(now())#>>'{{}}',
                       'approved_by', 'PK',
                       'pk_decision', 'promote ({LANE}); supersedes intake_only (2026-07-03)',
                       'promotion_lane', '{LANE}',
                       'promotion_packet', '{PACKET}',
                       'governed_by', 'pp-logo-variant-promotion-v0'),
    updated_at     = now()
WHERE asset_id IN ({promote_ids});

-- ── P1: exactly 7 promoted rows in the full governed state ──────────────────
DO $$
BEGIN
  IF (SELECT count(*) FROM c.client_brand_asset
      WHERE asset_id IN ({promote_ids})
        AND is_active IS TRUE
        AND (asset_meta->>'approved')::boolean IS TRUE
        AND asset_meta->>'approval_status' = 'governed'
        AND (asset_meta->>'production_use_allowed')::boolean IS TRUE
        AND platform_scope = ARRAY['facebook','instagram','linkedin']) <> 7 THEN
    RAISE EXCEPTION 'P1 FAIL: promoted rows not exactly 7 in governed state';
  END IF;
END $$;

-- ── P1b: the 11 held candidates remain FULLY fenced and untouched ───────────
DO $$
BEGIN
  IF (SELECT count(*) FROM c.client_brand_asset
      WHERE asset_id IN ({hold_ids})
        AND is_active IS FALSE
        AND (asset_meta->>'approved')::boolean IS FALSE
        AND asset_meta->>'approval_status' = 'intake_candidate'
        AND (asset_meta->>'production_use_allowed')::boolean IS FALSE
        AND platform_scope IS NULL) <> 11 THEN
    RAISE EXCEPTION 'P1b FAIL: held candidates no longer fully fenced';
  END IF;
END $$;

-- ── P2: governed resolver returns EXACTLY primary + the 7 promoted keys ─────
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
  FROM public.resolve_brand_assets('{CLIENT_SLUG}',
        ARRAY['pp_logo_primary', {all_key_list}]);
  IF n <> 8 THEN
    RAISE EXCEPTION 'P2 FAIL: resolve_brand_assets returned % rows (expected 8: primary + 7 promoted)', n;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.resolve_brand_assets('{CLIENT_SLUG}', ARRAY['pp_logo_primary'])
    WHERE asset_id = '{LIVE_PRIMARY_ID}') THEN
    RAISE EXCEPTION 'P2 FAIL: live pp_logo_primary no longer resolves';
  END IF;
END $$;

-- ── P3: production selection UNCHANGED (live template probe) ────────────────
-- Baseline (post-intake, 2026-07-03): status=ok, Logo pick={LIVE_PRIMARY_ID},
-- rejected Logo entries 11 x 'inactive'. Post-promotion expectation: pick UNCHANGED
-- (primary is strictly oldest, A4); rejected Logo entries now exactly {hold_png_count} x 'inactive'
-- (the held alternate-size PNGs); the 7 promoted rows are eligible-but-not-picked
-- (not selected, not rejected); SVG rows remain invisible (usage='logo_vector_source').
DO $$
DECLARE
  r jsonb;
  pick text;
  rej_logo_inactive int;
  rej_logo_other int;
BEGIN
  r := public.resolve_slot_assets('{CLIENT_SLUG}', 'facebook', NULL,
        '{LIVE_TEMPLATE_REG_ID}', NULL);
  IF r->>'status' <> 'ok' THEN
    RAISE EXCEPTION 'P3 FAIL: resolver status % (expected ok)', r->>'status';
  END IF;
  SELECT e->>'asset_id' INTO pick
  FROM jsonb_array_elements(r->'selected') e WHERE e->>'slot' = 'Logo';
  IF pick IS DISTINCT FROM '{LIVE_PRIMARY_ID}' THEN
    RAISE EXCEPTION 'P3 FAIL: Logo pick changed to % (expected live primary)', pick;
  END IF;
  SELECT
    count(*) FILTER (WHERE e->>'reason_code' = 'inactive'),
    count(*) FILTER (WHERE e->>'reason_code' <> 'inactive')
  INTO rej_logo_inactive, rej_logo_other
  FROM jsonb_array_elements(r->'rejected') e
  WHERE e->>'slot' = 'Logo';
  IF rej_logo_inactive <> {hold_png_count} OR rej_logo_other <> 0 THEN
    RAISE EXCEPTION 'P3 FAIL: rejected Logo entries inactive=%/other=% (expected {hold_png_count}/0)',
      rej_logo_inactive, rej_logo_other;
  END IF;
END $$;

COMMIT;
"""

rollback = f"""-- PP Logo Variant Promotion v0 - standing rollback (PK-gated)
-- Restores the 7 promoted rows to their EXACT pre-promotion intake fences and strips
-- every promotion-added meta key. Never touches the live pp_logo_primary or the 11
-- held candidates.
BEGIN;

UPDATE c.client_brand_asset
SET is_active      = false,
    platform_scope = NULL,
    asset_meta     = (asset_meta - 'approved_at' - 'approved_by' - 'promotion_lane'
                                  - 'promotion_packet' - 'governed_by')
                     || jsonb_build_object(
                       'approved', false,
                       'approval_status', 'intake_candidate',
                       'production_use_allowed', false,
                       'pk_decision', '{INTAKE_PK_DECISION}'),
    updated_at     = now()
WHERE asset_id IN ({promote_ids});

DO $$
BEGIN
  IF (SELECT count(*) FROM c.client_brand_asset
      WHERE asset_id IN ({promote_ids})
        AND is_active IS FALSE
        AND (asset_meta->>'approved')::boolean IS FALSE
        AND asset_meta->>'approval_status' = 'intake_candidate'
        AND (asset_meta->>'production_use_allowed')::boolean IS FALSE
        AND platform_scope IS NULL
        AND NOT (asset_meta ? 'approved_at')
        AND NOT (asset_meta ? 'promotion_lane')) <> 7 THEN
    RAISE EXCEPTION 'ROLLBACK FAIL: promoted rows not fully restored to intake fences';
  END IF;
  IF (SELECT count(*) FROM c.client_brand_asset
      WHERE asset_id = '{LIVE_PRIMARY_ID}'
        AND (asset_meta->>'approved')::boolean IS TRUE
        AND is_active IS TRUE) <> 1 THEN
    RAISE EXCEPTION 'ROLLBACK FAIL: live pp_logo_primary not intact';
  END IF;
END $$;

COMMIT;
"""

table = ["### Promote (7)", "",
         "| asset_id | asset_key | role |", "|---|---|---|"]
for i, k, note in PROMOTE:
    table.append(f"| `{i[:13]}…` | `{k}` | {note} |")
table += ["", "### Hold — stay fenced intake candidates (11)", "",
          "| asset_id | asset_key | why held |", "|---|---|---|"]
for i, k, note in HOLD:
    table.append(f"| `{i[:13]}…` | `{k}` | {note} |")

with open(os.path.join(HERE, "promote_pp_logo_variants_v0.sql"), "w", encoding="utf-8", newline="\n") as f:
    f.write(sql)
with open(os.path.join(HERE, "rollback_pp_logo_variants_v0.sql"), "w", encoding="utf-8", newline="\n") as f:
    f.write(rollback)
with open(os.path.join(HERE, "packet_tables.md"), "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(table) + "\n")

for name in ("promote_pp_logo_variants_v0.sql", "rollback_pp_logo_variants_v0.sql"):
    p = os.path.join(HERE, name)
    print(f"sha256 {name}: {hashlib.sha256(open(p,'rb').read()).hexdigest()}")
