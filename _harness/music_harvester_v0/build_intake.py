#!/usr/bin/env python3
"""Build the FENCED-intake SQL package for Music Library v0 starter harvest.

Reads manifest.json → emits music_v0_intake_apply.sql:
  - per track: storage byte-precheck (runs at the apply gate, AFTER the deferred upload)
    + CTE INSERT into m.music_track (all four fences default-off) + 1:1 m.music_license row,
    idempotent via WHERE NOT EXISTS on track_key.
  - final in-txn asserts: batch fenced-count == N AND pool-neutrality (0 selectable tracks).
Mirrors _harness/ndis_yarns_logo_intake_v0/ndis_logo_intake_apply.sql. NO upload, NO apply here.
"""
import json, os

BATCH_NOTE = "music-harvester-v0 starter intake (2026-07-09) — fenced candidate, not selectable"
OUT = "music_v0_intake_apply.sql"

def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"

def obj_name(storage_path):
    # storage.objects.name is bucket-relative: strip the leading 'post-music/'
    p = storage_path
    return p[len("post-music/"):] if p.startswith("post-music/") else p

m = json.load(open("manifest.json", encoding="utf-8"))
tracks = m["tracks"]
n = len(tracks)

lines = []
lines.append("-- Music Library v0 — STARTER HARVEST fenced intake (9 CC0 instrumental tracks)")
lines.append("-- Generated from manifest.json by build_intake.py. FENCED intake ONLY:")
lines.append("--   all four fences default-off (approval_status='intake_candidate', approved/production_use_allowed/is_active=false).")
lines.append("--   Nothing selectable; no approval, no fence-flip, no suitability rows. Approval is a SEPARATE PK gate.")
lines.append("-- Upload is DEFERRED (PK decision): the per-track storage byte-precheck presumes the .mp3 objects were")
lines.append("--   uploaded to bucket 'post-music' at the apply gate (post-approval); it will FAIL-CLOSED (rollback) otherwise.")
lines.append("-- Idempotent: WHERE NOT EXISTS on track_key. Mirrors ndis_yarns_logo_intake_apply.sql.")
lines.append("--")
lines.append("-- ROLLBACK (reference only — fenced rows are non-selectable; safe to remove pre-approval):")
lines.append("--   DELETE FROM m.music_license WHERE track_id IN (SELECT track_id FROM m.music_track WHERE notes = <batch_note>);")
lines.append("--   DELETE FROM m.music_track   WHERE notes = <batch_note>;")
lines.append("")
lines.append("BEGIN;")
lines.append("")

for t in tracks:
    lic = t["license"]
    lines.append(f"-- {t['track_key']}  ({t.get('title')} · {t.get('mood')} · {round(t.get('duration_seconds',0))}s · {lic.get('license_type')})")
    lines.append("DO $$ BEGIN")
    lines.append(f"  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'")
    lines.append(f"    AND name = {q(obj_name(t['storage_path']))} AND (metadata->>'size')::bigint = {int(t['bytes'])};")
    lines.append(f"  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/%% missing or wrong size — rolled back', {q(obj_name(t['storage_path']))}; END IF;")
    lines.append("END $$;")
    lines.append("WITH ins AS (")
    lines.append("  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, mood, energy, tempo_band, genre, vocals, notes)")
    lines.append("  SELECT " + ", ".join([
        q(t["track_key"]), q(t.get("title")), q("manual_harvest"), q("post-music"),
        q(t["storage_path"]), q(t["sha256"]), q(t.get("mime")), str(int(t["bytes"])),
        (repr(t["duration_seconds"]) if t.get("duration_seconds") is not None else "NULL"),
        q(t.get("mood")), q(t.get("energy")), q(t.get("tempo_band")), q(t.get("genre")),
        q("instrumental_only"), q(BATCH_NOTE),
    ]))
    lines.append(f"  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = {q(t['track_key'])})")
    lines.append("  RETURNING track_id")
    lines.append(")")
    lines.append("INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)")
    lines.append("SELECT ins.track_id, " + ", ".join([
        q(lic.get("license_type")), q(lic.get("license_name")), q(lic.get("source_url")),
        q(lic.get("license_snapshot_hash")), q(lic.get("license_snapshot_path")),
        q(lic.get("commercial_use_allowed")), q(lic.get("social_use_allowed")),
        q(lic.get("modification_allowed")), q(lic.get("paid_ads_allowed")),
        q(lic.get("attribution_required")), q(lic.get("content_id_safe")),
    ]) + " FROM ins;")
    lines.append("")

# Final in-txn asserts
lines.append("-- Verify: exactly N fenced rows in this batch, and ZERO selectable tracks anywhere (pool-neutral).")
lines.append("DO $$")
lines.append("DECLARE batch int; selectable int;")
lines.append("BEGIN")
lines.append(f"  SELECT count(*) INTO batch FROM m.music_track WHERE notes = {q(BATCH_NOTE)}")
lines.append("    AND is_active IS FALSE AND approved IS FALSE AND approval_status = 'intake_candidate' AND production_use_allowed IS FALSE;")
lines.append(f"  IF batch <> {n} THEN RAISE EXCEPTION 'music-intake verify: %% fenced rows in batch, expected {n} — rolled back', batch; END IF;")
lines.append("  SELECT count(*) INTO selectable FROM m.music_track")
lines.append("    WHERE is_active IS TRUE OR approved IS TRUE OR approval_status = 'approved_scoped' OR production_use_allowed IS TRUE;")
lines.append("  IF selectable <> 0 THEN RAISE EXCEPTION 'music-intake verify: %% selectable tracks, expected 0 (pool must stay neutral) — rolled back', selectable; END IF;")
lines.append("END $$;")
lines.append("")
lines.append("COMMIT;")
lines.append("")

open(OUT, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
print(f"wrote {OUT}: {n} tracks, {len(lines)} lines")
print(f"batch note: {BATCH_NOTE}")
