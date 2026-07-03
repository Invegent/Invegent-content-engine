"""PP Logo Variant Intake v0 — artifact generator.

Reads verification_manifest.json (produced by verify_assets.py) and emits:
  - upload_manifest.csv / upload_manifest.json   (18 accepted files -> storage targets)
  - lane_pp_logo_variant_intake_v0.sql           (proposed DML, PK-gated, fail-closed)
  - rollback_pp_logo_variant_intake_v0.sql       (standing rollback)
  - packet_tables.md                             (markdown tables for the intake packet)

Generator only — applies nothing.
"""
import json, csv, os, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
MAN = json.load(open(os.path.join(HERE, "verification_manifest.json"), encoding="utf-8"))
FILES = {f["rel_path"]: f for f in MAN["files"]}

CLIENT_ID = "4036a6b5-b4a3-406e-998d-c2fe14a8bbdd"
CLIENT_SLUG = "property-pulse"
BUCKET = "brand-assets"
PREFIX = "Property_Pulse/Logos"
PUBURL = f"https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/{BUCKET}/{PREFIX}"
LIVE_PRIMARY_ID = "b7530c55-c320-43be-90d9-98c804694921"
LIVE_TEMPLATE_REG_ID = "c0b10001-0000-4000-8000-000000000002"
PACKET = "docs/briefs/pp-logo-variant-intake-v0-packet.md"
LANE = "pp-logo-variant-intake-v0 (2026-07-03)"
SOURCE_PROJECT = "https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd"
SOURCE_RASTER_SHA = "feafee4e4452663636d547af070bdec24e38094a12565ed7a3e3ccb49183da5e"

LICENSE = ("Brand-owned / PK-authorised - Property Pulse (Invegent); "
           "authorised for ICE-generated publishing across external platforms")
RIGHTS = ("PK owns/controls the Property Pulse logo and authorises ICE use "
          "(mirrors pp_logo_primary rights confirmation 2026-07-02)")
LIMITS = ("Reconstructed kit, not the original designer master file: mark polygons traced from "
          "the 1024px production raster (sha256 " + SOURCE_RASTER_SHA[:16] + "...) which is "
          "byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist "
          "600/800 font outlines (close visual match, slight letterform deviation visible in "
          "overlay evidence). Carry: replace with true original vector master if ever found.")
PK_DECISION = ("intake_only (PP Logo Variant Intake v0, 2026-07-03); "
               "production approval requires a separate PK gate")

# asset_type is 'other' for ALL rows: the live CHECK constraint
# client_brand_asset_asset_type_check only allows (logo_primary, logo_dark, logo_light,
# logo_icon, brand_colour_set, intro_clip, outro_clip, background_music, voiceover_profile,
# font_primary, font_secondary, watermark, other) and the proven P0 intake used 'other';
# fine-grained typing lives in asset_meta.logo_role (db-rls-auditor block 2026-07-03).
# (src_rel, asset_key, legacy_type_unused, usage, logo_role, colour_mode, background_type, extra)
ACCEPT = [
    ("vector/pp_logo_master.svg", "pp_logo_master_svg", "logo_vector", "logo_vector_source",
     "logo_master", "white_gold", "dark",
     {"vector_note": "text converted to outlines; renders without fonts", "viewBox": "125 254 752 402"}),
    ("vector/pp_logo_master_editable.svg", "pp_logo_master_editable_svg", "logo_vector", "logo_vector_source",
     "logo_master_editable", "white_gold", "dark",
     {"vector_note": "live-text editing source ONLY; requires Urbanist 600+800 installed",
      "font_dependency": "Urbanist 600 + 800", "viewBox": "125 254 752 402"}),
    ("vector/pp_logo_full_colour.svg", "pp_logo_full_colour_svg", "logo_vector", "logo_vector_source",
     "logo_primary_light_bg", "navy_gold", "light",
     {"vector_note": "outlines; Property + roof in brand navy for light backgrounds", "viewBox": "125 254 752 402"}),
    ("vector/pp_logo_white.svg", "pp_logo_white_svg", "logo_vector", "logo_vector_source",
     "logo_white", "white_mono", "dark",
     {"vector_note": "outlines", "viewBox": "125 254 752 402"}),
    ("vector/pp_logo_dark.svg", "pp_logo_dark_svg", "logo_vector", "logo_vector_source",
     "logo_dark", "navy_mono", "light",
     {"vector_note": "outlines", "viewBox": "125 254 752 402"}),
    ("vector/pp_logo_mark_only.svg", "pp_logo_mark_only_svg", "logo_vector", "logo_vector_source",
     "logo_mark", "white_gold", "dark",
     {"vector_note": "roof + pulse only; white roof needs dark background", "viewBox": "189 266 624 266"}),
    ("vector/pp_logo_mark_only_dark.svg", "pp_logo_mark_only_dark_svg", "logo_vector", "logo_vector_source",
     "logo_mark", "navy_gold", "light",
     {"vector_note": "roof + pulse only; navy roof for light backgrounds", "viewBox": "189 266 624 266"}),
    ("vector/pp_logo_master_transparent_512.png", "pp_logo_master_png_512", "logo_variant", "logo",
     "logo_master", "white_gold", "transparent", {"render_note": "rendered from pp_logo_master.svg"}),
    ("vector/pp_logo_master_transparent_1024.png", "pp_logo_master_png_1024", "logo_variant", "logo",
     "logo_master", "white_gold", "transparent", {"render_note": "rendered from pp_logo_master.svg"}),
    ("vector/pp_logo_master_transparent_2048.png", "pp_logo_master_png_2048", "logo_variant", "logo",
     "logo_master", "white_gold", "transparent", {"render_note": "rendered from pp_logo_master.svg"}),
    ("vector/pp_logo_full_colour_1024.png", "pp_logo_full_colour_png_1024", "logo_variant", "logo",
     "logo_primary_light_bg", "navy_gold", "transparent", {"render_note": "rendered from pp_logo_full_colour.svg"}),
    ("vector/pp_logo_white_1024.png", "pp_logo_white_png_1024", "logo_variant", "logo",
     "logo_white", "white_mono", "transparent", {"render_note": "rendered from pp_logo_white.svg"}),
    ("vector/pp_logo_dark_1024.png", "pp_logo_dark_png_1024", "logo_variant", "logo",
     "logo_dark", "navy_mono", "transparent", {"render_note": "rendered from pp_logo_dark.svg"}),
    ("assets/pp_logo_mark_only_transparent_512.png", "pp_logo_mark_only_png_512", "logo_mark", "logo",
     "logo_mark", "white_gold", "transparent",
     {"render_note": "raster-derived export; white roof needs dark background"}),
    ("assets/pp_logo_mark_only_transparent_1024.png", "pp_logo_mark_only_png_1024", "logo_mark", "logo",
     "logo_mark", "white_gold", "transparent",
     {"render_note": "raster-derived export; white roof needs dark background"}),
    ("assets/pp_logo_square_navy_bg_512.png", "pp_logo_square_navy_bg_png_512", "logo_boxed", "logo",
     "logo_square", "white_gold_on_navy", "solid_navy",
     {"render_note": "solid #1E2532 background, generous padding; boxed corner/profile badge"}),
    ("assets/pp_logo_square_navy_bg_1024.png", "pp_logo_square_navy_bg_png_1024", "logo_boxed", "logo",
     "logo_square", "white_gold_on_navy", "solid_navy",
     {"render_note": "solid #1E2532 background, generous padding; boxed corner/profile badge"}),
    ("assets/pp_logo_watermark_white_transparent.png", "pp_logo_watermark_white_png", "logo_watermark", "logo",
     "logo_watermark", "white_mono", "transparent",
     {"render_note": "corner watermark; use at reduced opacity (40-70%)"}),
]

REJECT = [
    ("assets/pp_logo_horizontal_transparent_1024.png",
     "byte-identical duplicate of assets/pp_logo_full_colour_transparent.png (source has a single lockup; horizontal = same artwork)"),
    ("assets/pp_logo_horizontal_white_transparent_1024.png",
     "byte-identical duplicate of assets/pp_logo_white_transparent.png"),
    ("assets/pp_logo_master_transparent.png",
     "raster-derived export superseded by the crisper SVG render vector/pp_logo_master_transparent_1024.png (same 1024x547 role)"),
    ("assets/pp_logo_full_colour_transparent.png",
     "raster-derived export superseded by vector/pp_logo_full_colour_1024.png"),
    ("assets/pp_logo_white_transparent.png",
     "raster-derived export superseded by vector/pp_logo_white_1024.png"),
    ("assets/pp_logo_dark_transparent.png",
     "raster-derived export superseded by vector/pp_logo_dark_1024.png"),
    ("uploads/PP_logo.png",
     "source raster; byte-identical to live production Property_Pulse/Logos/PP_logo_2.png - evidence only, never re-uploaded"),
    ("uploads/PP_logo_2.png",
     "byte-identical duplicate of uploads/PP_logo.png - evidence only"),
]

EVIDENCE = [
    "vector/comparison_raster_vs_svg.png", "vector/font_compare.png", "vector/font_compare2.png",
    "vector/text_closeup.png", "vector/weight_compare.png", "vector/traced.json",
    "vector/pp_logo_vector_metadata.csv", "assets/pp_logo_metadata.csv", "uploads/primary_colors.txt",
    "Logo_Kit_Contact_Sheet.dc.html", "Logo_Kit_Contact_Sheet-print-1anzf8b.dc.html",
]


def aid(n):
    return f"c3a200{n:02d}-9c4e-4f7a-8d21-0d5e6f7a8c{n:02d}"


def content_type(rel):
    return "image/svg+xml" if rel.endswith(".svg") else "image/png"


def aspect(w, h):
    if not w:
        return None
    if w == h:
        return "1:1"
    return f"{w}:{h}"


def build():
    rows = []
    for i, (rel, key, atype, usage, role, colour, bg, extra) in enumerate(ACCEPT, start=1):
        f = FILES[rel]
        fname = os.path.basename(rel)
        target = f"{PREFIX}/{fname}"
        w, h = f.get("width"), f.get("height")
        meta = {
            "asset_key": key,
            "usage": usage,
            "logo_role": role,
            "colour_mode": colour,
            "background_type": bg,
            "bucket": BUCKET,
            "source_path": target,
            "mime": content_type(rel),
            "bytes": f["bytes"],
            "sha256": f["sha256"],
            "file_format": "svg" if rel.endswith(".svg") else "png",
            "approved": False,
            "approval_status": "intake_candidate",
            "production_use_allowed": False,
            "attribution_required": False,
            "license": LICENSE,
            "license_type": "brand_owned_or_pk_authorised",
            "rights_note": RIGHTS,
            "pk_decision": PK_DECISION,
            "intake_lane": LANE,
            "review_packet": PACKET,
            "source": "claude_design_export",
            "source_project": SOURCE_PROJECT,
            "source_file": rel.replace("Logo_Kit", "Logo Kit"),
            "source_limitations": LIMITS,
            "brand_palette": {"navy": "#1E2532", "gold": "#ECA02D", "white": "#FFFFFF"},
        }
        if w:
            meta["width"] = w
            meta["height"] = h
            meta["aspect_ratio"] = aspect(w, h)
            meta["has_transparency"] = bool(f.get("alpha_used"))
        else:
            meta["scalable"] = True
            meta["has_transparency"] = True
        if rel.endswith(".svg"):
            meta["visual_verification"] = ("true vector (paths only, no embedded raster); fills match brand "
                                           "palette exactly; verified " + LANE)
        elif f.get("alpha_used"):
            meta["visual_verification"] = ("alpha transparency verified; dominant colours match brand palette; "
                                           "visual identity match vs live logo confirmed; verified " + LANE)
        else:
            meta["visual_verification"] = ("intentionally opaque solid #1E2532 navy background (no alpha); "
                                           "dominant colours match brand palette; visual identity match vs "
                                           "live logo confirmed; verified " + LANE)
        meta.update(extra)
        rows.append({
            "n": i, "asset_id": aid(i), "asset_key": key, "asset_type": "other",
            "asset_name": f"Property Pulse {role.replace('_', ' ')} ({fname})",
            "src_rel": rel, "target_path": target, "public_url": f"{PUBURL}/{fname}",
            "content_type": content_type(rel), "bytes": f["bytes"], "sha256": f["sha256"],
            "width": w, "height": h, "meta": meta,
        })

    # ---- upload manifest ----
    um = [{
        "order": r["n"], "local_path": f"_harness/pp_logo_variant_intake_v0/source/{r['src_rel']}",
        "bucket": BUCKET, "target_path": r["target_path"], "content_type": r["content_type"],
        "bytes": r["bytes"], "sha256": r["sha256"], "upsert": False, "public_url": r["public_url"],
    } for r in rows]
    with open(os.path.join(HERE, "upload_manifest.json"), "w", encoding="utf-8") as fh:
        json.dump({"lane": LANE, "bucket": BUCKET, "overwrite": "disabled (upsert=false)",
                   "post_upload_verification": "HTTP 200 on public_url + byte size match + sha256 match vs local source",
                   "files": um}, fh, indent=1)
    with open(os.path.join(HERE, "upload_manifest.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(um[0].keys()))
        w.writeheader()
        w.writerows(um)

    # ---- SQL artifact ----
    key_list = ", ".join(f"'{r['asset_key']}'" for r in rows)
    id_list = ", ".join(f"'{r['asset_id']}'" for r in rows)
    path_size_pairs = ",\n        ".join(f"('{r['target_path']}', {r['bytes']})" for r in rows)

    inserts = []
    for r in rows:
        mj = json.dumps(r["meta"], separators=(",", ":")).replace("'", "''")
        inserts.append(
            "INSERT INTO c.client_brand_asset\n"
            "  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)\n"
            "VALUES\n"
            f"  ('{r['asset_id']}', '{CLIENT_ID}', '{r['asset_type']}',\n"
            f"   '{r['asset_name']}',\n"
            f"   '{r['public_url']}',\n"
            f"   '{mj}'::jsonb,\n"
            "   NULL, false,\n"
            f"   'Intake candidate (Claude Design logo kit v2, {LANE}). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');"
        )
    inserts_sql = "\n\n".join(inserts)

    sql = f"""-- ============================================================================
-- PP Logo Variant Intake v0 - governed intake DML (PK-gated; DO NOT APPLY without PK approval)
-- Lane: {LANE}
-- Packet: {PACKET}
-- Source: Claude Design project {SOURCE_PROJECT}
-- Posture: intake candidates ONLY - triple-fenced (is_active=false, approved=false,
--          production_use_allowed=false, approval_status=intake_candidate).
--          The live pp_logo_primary ({LIVE_PRIMARY_ID}) is NOT touched.
-- Apply order: storage uploads (upload_manifest.json, upsert=false) FIRST, then this file.
-- 0 DDL / 18 data-only INSERTs / fail-closed assertions / in-transaction invariant probes.
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

-- ── A2: no pre-existing rows for these asset_ids or asset_keys (fail-closed, idempotency guard)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM c.client_brand_asset
             WHERE asset_id IN ({id_list})) THEN
    RAISE EXCEPTION 'A2 FAIL: one or more intake asset_ids already exist';
  END IF;
  IF EXISTS (SELECT 1 FROM c.client_brand_asset
             WHERE client_id = '{CLIENT_ID}'
               AND asset_meta->>'asset_key' IN ({key_list})) THEN
    RAISE EXCEPTION 'A2 FAIL: one or more intake asset_keys already exist for property-pulse';
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

-- ── A4: storage objects uploaded and byte-sizes match (fail-closed; run AFTER uploads)
DO $$
DECLARE
  missing int;
BEGIN
  SELECT count(*) INTO missing
  FROM (VALUES
        {path_size_pairs}
       ) AS expected(pth, sz)
  WHERE NOT EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id = '{BUCKET}'
      AND o.name = expected.pth
      AND (o.metadata->>'size')::bigint = expected.sz);
  IF missing <> 0 THEN
    RAISE EXCEPTION 'A4 FAIL: % storage object(s) missing or size-mismatched - run uploads first', missing;
  END IF;
END $$;

-- ── 18 data-only INSERTs (intake candidates, triple-fenced) ─────────────────

{inserts_sql}

-- ── P1: exactly 18 new rows, every one fully fenced ─────────────────────────
DO $$
BEGIN
  IF (SELECT count(*) FROM c.client_brand_asset
      WHERE asset_id IN ({id_list})
        AND is_active IS FALSE
        AND (asset_meta->>'approved')::boolean IS FALSE
        AND asset_meta->>'approval_status' = 'intake_candidate'
        AND (asset_meta->>'production_use_allowed')::boolean IS FALSE) <> 18 THEN
    RAISE EXCEPTION 'P1 FAIL: inserted rows not exactly 18 fully-fenced intake candidates';
  END IF;
END $$;

-- ── P2: governed resolver returns ONLY the live primary for all logo keys ───
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
  FROM public.resolve_brand_assets('{CLIENT_SLUG}',
        ARRAY['pp_logo_primary', {key_list}]);
  IF n <> 1 THEN
    RAISE EXCEPTION 'P2 FAIL: resolve_brand_assets returned % rows (expected 1: live primary only)', n;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.resolve_brand_assets('{CLIENT_SLUG}', ARRAY['pp_logo_primary'])
    WHERE asset_id = '{LIVE_PRIMARY_ID}') THEN
    RAISE EXCEPTION 'P2 FAIL: live pp_logo_primary no longer resolves';
  END IF;
END $$;

-- ── P3: production selection PROVABLY unchanged (live template probe) ───────
-- Baseline recorded pre-change 2026-07-03: status=ok, Logo pick={LIVE_PRIMARY_ID},
-- rejected_logos=0. Post-insert expectation: Logo pick unchanged; the 11 new
-- usage='logo' candidates appear ONLY as rejected 'inactive'; the 7 SVG rows
-- (usage='logo_vector_source') are invisible to the resolver.
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
  IF rej_logo_inactive <> 11 OR rej_logo_other <> 0 THEN
    RAISE EXCEPTION 'P3 FAIL: rejected Logo entries inactive=%/other=% (expected 11/0)',
      rej_logo_inactive, rej_logo_other;
  END IF;
END $$;

COMMIT;
"""
    with open(os.path.join(HERE, "lane_pp_logo_variant_intake_v0.sql"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(sql)

    rollback = f"""-- PP Logo Variant Intake v0 - standing rollback (PK-gated)
-- Removes ONLY the 18 intake-candidate rows inserted by lane_pp_logo_variant_intake_v0.sql.
-- Never touches the live pp_logo_primary ({LIVE_PRIMARY_ID}).
BEGIN;

DELETE FROM c.client_brand_asset
WHERE asset_id IN ({id_list});

DO $$
BEGIN
  IF (SELECT count(*) FROM c.client_brand_asset WHERE asset_id IN ({id_list})) <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK FAIL: intake rows still present';
  END IF;
  IF (SELECT count(*) FROM c.client_brand_asset
      WHERE asset_id = '{LIVE_PRIMARY_ID}'
        AND (asset_meta->>'approved')::boolean IS TRUE
        AND is_active IS TRUE) <> 1 THEN
    RAISE EXCEPTION 'ROLLBACK FAIL: live pp_logo_primary not intact';
  END IF;
END $$;

COMMIT;

-- Storage rollback (manual, PK-gated; only if full unwind is wanted):
-- delete the 18 objects listed in upload_manifest.json under {BUCKET}/{PREFIX}/ .
-- PP_logo_2.png is NOT part of this lane and must never be deleted.
"""
    with open(os.path.join(HERE, "rollback_pp_logo_variant_intake_v0.sql"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(rollback)

    # ---- packet tables ----
    lines = ["### Accepted files (18)", "",
             "| # | source file | asset_key | dims | bytes | fmt | alpha | sha256 |",
             "|---|---|---|---|---|---|---|---|"]
    for r in rows:
        dims = f"{r['width']}x{r['height']}" if r["width"] else "vector"
        alpha = "yes" if r["meta"].get("has_transparency") else "no (solid navy)"
        lines.append(f"| {r['n']} | `{r['src_rel']}` | `{r['asset_key']}` | {dims} | {r['bytes']} | "
                     f"{r['meta']['file_format']} | {alpha} | `{r['sha256']}` |")
    lines += ["", "### Rejected / do-not-intake (8)", "",
              "| source file | sha256 (12) | reason |", "|---|---|---|"]
    for rel, reason in REJECT:
        f = FILES[rel]
        lines.append(f"| `{rel}` | `{f['sha256'][:12]}` | {reason} |")
    lines += ["", "### Evidence files (kept in harness, not uploaded)", ""]
    for rel in EVIDENCE:
        f = FILES[rel]
        lines.append(f"- `{rel}` ({f['bytes']} B, sha256 `{f['sha256'][:12]}…`)")
    with open(os.path.join(HERE, "packet_tables.md"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")

    print(f"wrote upload_manifest (18 files), SQL artifact, rollback, packet tables")
    for name in ("lane_pp_logo_variant_intake_v0.sql", "rollback_pp_logo_variant_intake_v0.sql",
                 "upload_manifest.json"):
        p = os.path.join(HERE, name)
        h = hashlib.sha256(open(p, "rb").read()).hexdigest()
        print(f"sha256 {name}: {h}")


if __name__ == "__main__":
    build()
