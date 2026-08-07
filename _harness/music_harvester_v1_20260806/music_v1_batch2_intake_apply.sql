-- Music Library v0 — BATCH 2 fenced intake (12 CC0 instrumental tracks, four-brand mood cover)
-- GENERATED from manifest.json by build_intake.py (v4) — do not hand-edit; regenerate instead.
-- v4: PK aural review complete (12 survivors, measured loudness_lufs written). Harness hardened
--     across three apply-harness-auditor shadow runs — see the generator docstring.
--
-- FENCED intake ONLY: all four fences written explicitly OFF (approval_status='intake_candidate',
--   approved / production_use_allowed / is_active = false). Nothing becomes selectable.
--   No approval, no fence-flip, no m.music_suitability rows, no c.client_music_profile rows.
--   Approval + scoped suitability are SEPARATE PK gates.
--
-- ⚠ PINNED EXECUTION CHANNEL (PK ruling 2026-08-06) — psql -f with ON_ERROR_STOP=1:
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <this file>
--   This file carries its OWN BEGIN/COMMIT and its own temp relations, so it needs a channel
--   that executes it as ONE call in ONE session.
--   apply_migration is RULED OUT: it mints its own migration version and supplies its own
--   transaction wrapper, which would nest this file's BEGIN/COMMIT and give a harness intake a
--   permanent migration identity (standing gotcha: migration name = permanent identity).
--   SCOPE OF THE EXECUTABLE GUARD: the transaction guard immediately below, before the first INSERT detects a SPLIT /
--   autocommitting channel (temp relations gone, or txid changed). It CANNOT detect a NESTING
--   wrapper such as apply_migration — under one, the temp relations still exist and the txid is
--   unchanged, so the guard passes while this file's BEGIN/COMMIT silently joins the outer
--   transaction. Ruling apply_migration out is therefore an OPERATOR control only; after the
--   fact it shows up as an unexpected migration-ledger entry (a db-rls-auditor read).
--
-- ⚠ UPLOAD PRECONDITION: each .mp3 must ALREADY exist in bucket 'post-music' at
--   global/<mood>/<track_key>.mp3 with the exact byte count. Missing/wrong-size => rollback.
--
-- Idempotent: WHERE NOT EXISTS on track_key. A re-run inserts nothing, and the row-count
--   assert accounts for rows already present, so a clean re-run still passes.
--
-- ROLLBACK: music_v1_batch2_intake_rollback.sql (a real transactional script keyed on the
--   same 12 track_keys this file inserts). Storage objects are LEFT IN PLACE for re-attempt
--   (PK ruling 2026-08-06).

BEGIN;

-- ── BASELINE CAPTURE (before ALL DML) ────────────────────────────────────────────────
CREATE TEMP TABLE _music_intake_txn ON COMMIT DROP AS
  SELECT txid_current() AS txid;

CREATE TEMP TABLE _music_intake_baseline ON COMMIT DROP AS
  SELECT track_key FROM m.music_track WHERE is_active IS TRUE OR approved IS TRUE OR approval_status = 'approved_scoped' OR production_use_allowed IS TRUE;

CREATE TEMP TABLE _music_intake_counts ON COMMIT DROP AS
  SELECT (SELECT count(*) FROM m.music_track)   AS track_n,
         (SELECT count(*) FROM m.music_license) AS license_n,
         (SELECT count(*) FROM m.music_track WHERE track_key IN ('calm_lofi_calmcurrents_019', 'calm_lofi_saturation_020', 'neutral_lofi_softreset_022', 'uplifting_lofi_bubbles_014', 'uplifting_lofi_hope_010', 'uplifting_lofi_springsight_011', 'uplifting_lofi_tranquilmind_012', 'uplifting_lofi_walkingaway_013', 'warm_lofi_humanagain_015', 'warm_lofi_rooftops_018', 'warm_lofi_sunlight_016', 'warm_lofi_warmfuzz_017')) AS pre_existing;

-- C-12
-- SPLIT-CHANNEL GUARD (executable; runs BEFORE any INSERT).
-- If the channel autocommits per statement, the ON COMMIT DROP temp relations are already
-- gone and/or the xid has changed — abort here, while aborting still prevents the writes.
DO $$
DECLARE base_txid bigint;
BEGIN
  IF to_regclass('pg_temp._music_intake_txn') IS NULL
     OR to_regclass('pg_temp._music_intake_baseline') IS NULL
     OR to_regclass('pg_temp._music_intake_counts') IS NULL THEN
    RAISE EXCEPTION 'music-intake C-12: temp baseline relation(s) missing before INSERT — the execution channel is NOT running this file as one transaction; STOP, nothing written';
  END IF;
  SELECT txid INTO base_txid FROM pg_temp._music_intake_txn;
  IF base_txid <> txid_current() THEN
    RAISE EXCEPTION 'music-intake C-12: transaction id changed (% -> %) before INSERT — split channel; STOP, nothing written', base_txid, txid_current();
  END IF;
END $$;

-- C-3 BASELINE IS THE EXPECTED POOL.
DO $$
DECLARE n int; unexpected text;
BEGIN
  SELECT count(*) INTO n FROM pg_temp._music_intake_baseline;
  IF n <> 1 THEN
    RAISE EXCEPTION 'music-intake BASELINE: % selectable tracks, expected 1 — the live pool changed since this packet was authored; STOP and re-author — rolled back', n;
  END IF;
  SELECT string_agg(track_key, ', ') INTO unexpected FROM pg_temp._music_intake_baseline
    WHERE track_key NOT IN ('calm_piano_drifting_006');
  IF unexpected IS NOT NULL THEN
    RAISE EXCEPTION 'music-intake BASELINE: unexpected selectable track(s) [%], expected exactly [calm_piano_drifting_006] — rolled back', unexpected;
  END IF;
END $$;

-- calm_lofi_calmcurrents_019  (Calm Currents (Lofi, Relax, Calm) · calm · 148s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/calm/calm_lofi_calmcurrents_019.mp3' AND (metadata->>'size')::bigint = 5907043;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/% missing or wrong size — rolled back', 'global/calm/calm_lofi_calmcurrents_019.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, loudness_lufs, mood, energy, tempo_band, genre, vocals, approval_status, approved, production_use_allowed, is_active, notes)
  SELECT 'calm_lofi_calmcurrents_019', 'Calm Currents (Lofi, Relax, Calm)', 'manual_harvest', 'post-music', 'post-music/global/calm/calm_lofi_calmcurrents_019.mp3', '2dcb297376cfe0cb8a547ce74e4d10f406649e007ff01d6e2edb573996d23dc4', 'audio/mpeg', 5907043, 147.648, -15.08, 'calm', 'low', 'slow', 'electronic', 'instrumental_only', 'intake_candidate', false, false, false, 'music-harvester-v1 batch2 four-brand intake (2026-08-06) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'calm_lofi_calmcurrents_019')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/calm-currents-lofi-relax-calm/', '81fd8c8600eafc57e712356764640a28dd02648e125cf611b0895ddb2302a6a4', '_harness/music_harvester_v1_20260806/candidates/calm_lofi_calmcurrents_019.license.txt', true, true, true, true, false, false FROM ins;

-- calm_lofi_saturation_020  (Saturation (Lofi, Calm, Relaxed) · calm · 156s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/calm/calm_lofi_saturation_020.mp3' AND (metadata->>'size')::bigint = 6240163;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/% missing or wrong size — rolled back', 'global/calm/calm_lofi_saturation_020.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, loudness_lufs, mood, energy, tempo_band, genre, vocals, approval_status, approved, production_use_allowed, is_active, notes)
  SELECT 'calm_lofi_saturation_020', 'Saturation (Lofi, Calm, Relaxed)', 'manual_harvest', 'post-music', 'post-music/global/calm/calm_lofi_saturation_020.mp3', '340a14dffd98001edbae1e7da16e2b9f8f54e0687cd215fa5dfc0b351f4777c2', 'audio/mpeg', 6240163, 155.976, -10.51, 'calm', 'low', 'slow', 'electronic', 'instrumental_only', 'intake_candidate', false, false, false, 'music-harvester-v1 batch2 four-brand intake (2026-08-06) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'calm_lofi_saturation_020')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/saturation-lofi-calm-relaxed/', '4797da125ea98423243b1ffa58d4f4e9ec3fbfaa9a9f657b4ef1053596c81b22', '_harness/music_harvester_v1_20260806/candidates/calm_lofi_saturation_020.license.txt', true, true, true, true, false, false FROM ins;

-- neutral_lofi_softreset_022  (Soft Reset · neutral · 186s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/neutral/neutral_lofi_softreset_022.mp3' AND (metadata->>'size')::bigint = 7669852;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/% missing or wrong size — rolled back', 'global/neutral/neutral_lofi_softreset_022.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, loudness_lufs, mood, energy, tempo_band, genre, vocals, approval_status, approved, production_use_allowed, is_active, notes)
  SELECT 'neutral_lofi_softreset_022', 'Soft Reset', 'manual_harvest', 'post-music', 'post-music/global/neutral/neutral_lofi_softreset_022.mp3', '9bedd59cdd0706be2d0ab9f436d73c45d95eecf55d2d1a7e68b1e484dfeabb99', 'audio/mpeg', 7669852, 185.568, -14.08, 'neutral', 'low', 'slow', 'electronic', 'instrumental_only', 'intake_candidate', false, false, false, 'music-harvester-v1 batch2 four-brand intake (2026-08-06) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'neutral_lofi_softreset_022')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/holiznacc0/we-drove-all-night-game-soundtrack/soft-reset/', '0eb130a78b1e2353685cf3395fc04577d0491275e56822c60028288aca995bb9', '_harness/music_harvester_v1_20260806/candidates/neutral_lofi_softreset_022.license.txt', true, true, true, true, false, false FROM ins;

-- uplifting_lofi_bubbles_014  (Bubbles (Lofi, Bright, Relaxed) · uplifting · 148s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/uplifting/uplifting_lofi_bubbles_014.mp3' AND (metadata->>'size')::bigint = 5907043;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/% missing or wrong size — rolled back', 'global/uplifting/uplifting_lofi_bubbles_014.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, loudness_lufs, mood, energy, tempo_band, genre, vocals, approval_status, approved, production_use_allowed, is_active, notes)
  SELECT 'uplifting_lofi_bubbles_014', 'Bubbles (Lofi, Bright, Relaxed)', 'manual_harvest', 'post-music', 'post-music/global/uplifting/uplifting_lofi_bubbles_014.mp3', '73efb557d8cfcca0f5cf3b435d3a0157bf9a702115b55266b8a2529f3997b542', 'audio/mpeg', 5907043, 147.648, -13.69, 'uplifting', 'medium', 'mid', 'electronic', 'instrumental_only', 'intake_candidate', false, false, false, 'music-harvester-v1 batch2 four-brand intake (2026-08-06) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'uplifting_lofi_bubbles_014')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/bubbles-lofi-bright-relaxed/', 'b6d970f4795741986aaa9b69c1783b7fb0e23841db7d32442cf73d67e4bb755a', '_harness/music_harvester_v1_20260806/candidates/uplifting_lofi_bubbles_014.license.txt', true, true, true, true, false, false FROM ins;

-- uplifting_lofi_hope_010  (Hope On Repeat · uplifting · 164s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/uplifting/uplifting_lofi_hope_010.mp3' AND (metadata->>'size')::bigint = 6884136;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/% missing or wrong size — rolled back', 'global/uplifting/uplifting_lofi_hope_010.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, loudness_lufs, mood, energy, tempo_band, genre, vocals, approval_status, approved, production_use_allowed, is_active, notes)
  SELECT 'uplifting_lofi_hope_010', 'Hope On Repeat', 'manual_harvest', 'post-music', 'post-music/global/uplifting/uplifting_lofi_hope_010.mp3', 'e781cf3926ea5b769f3b5667011234f4524cbcb06e539ba563c7f15fd805477a', 'audio/mpeg', 6884136, 163.728, -15.38, 'uplifting', 'medium', 'mid', 'electronic', 'instrumental_only', 'intake_candidate', false, false, false, 'music-harvester-v1 batch2 four-brand intake (2026-08-06) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'uplifting_lofi_hope_010')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/holiznacc0/spring-woke-me-up/hope-on-repeat/', '062d7c38b74261fd6f583bb495fcb32a2c88d7f95e6e4348266521309cb042da', '_harness/music_harvester_v1_20260806/candidates/uplifting_lofi_hope_010.license.txt', true, true, true, true, false, false FROM ins;

-- uplifting_lofi_springsight_011  (Spring In Sight · uplifting · 132s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/uplifting/uplifting_lofi_springsight_011.mp3' AND (metadata->>'size')::bigint = 5614056;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/% missing or wrong size — rolled back', 'global/uplifting/uplifting_lofi_springsight_011.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, loudness_lufs, mood, energy, tempo_band, genre, vocals, approval_status, approved, production_use_allowed, is_active, notes)
  SELECT 'uplifting_lofi_springsight_011', 'Spring In Sight', 'manual_harvest', 'post-music', 'post-music/global/uplifting/uplifting_lofi_springsight_011.mp3', '31b8701fbc795f05881d7544943e64983cd008732d1388bef07bd7dd6d4a87a8', 'audio/mpeg', 5614056, 131.976, -16.73, 'uplifting', 'medium', 'mid', 'electronic', 'instrumental_only', 'intake_candidate', false, false, false, 'music-harvester-v1 batch2 four-brand intake (2026-08-06) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'uplifting_lofi_springsight_011')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/holiznacc0/spring-woke-me-up/spring-in-sight/', '6807ba0bf6748316fc1e2a35a34cbd8633928fef4d21e3c47717f5671bdb70d8', '_harness/music_harvester_v1_20260806/candidates/uplifting_lofi_springsight_011.license.txt', true, true, true, true, false, false FROM ins;

-- uplifting_lofi_tranquilmind_012  (Tranquil Mindscape (Lofi, Happy, Reflection) · uplifting · 154s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/uplifting/uplifting_lofi_tranquilmind_012.mp3' AND (metadata->>'size')::bigint = 6143203;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/% missing or wrong size — rolled back', 'global/uplifting/uplifting_lofi_tranquilmind_012.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, loudness_lufs, mood, energy, tempo_band, genre, vocals, approval_status, approved, production_use_allowed, is_active, notes)
  SELECT 'uplifting_lofi_tranquilmind_012', 'Tranquil Mindscape (Lofi, Happy, Reflection)', 'manual_harvest', 'post-music', 'post-music/global/uplifting/uplifting_lofi_tranquilmind_012.mp3', '488d9693c13e44c5213c0647ee89ea91b21e17d9ac602225a78ee089720134c0', 'audio/mpeg', 6143203, 153.552, -13.79, 'uplifting', 'low', 'slow', 'electronic', 'instrumental_only', 'intake_candidate', false, false, false, 'music-harvester-v1 batch2 four-brand intake (2026-08-06) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'uplifting_lofi_tranquilmind_012')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/tranquil-mindscape-lofi-happy-reflection/', '14d77b5b065656bfdbcc3acb4b9f020fce356948cab82e2562d0d770952fb81a', '_harness/music_harvester_v1_20260806/candidates/uplifting_lofi_tranquilmind_012.license.txt', true, true, true, true, false, false FROM ins;

-- uplifting_lofi_walkingaway_013  (Walking Away (Lofi, Peaceful, Motivating) · uplifting · 156s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/uplifting/uplifting_lofi_walkingaway_013.mp3' AND (metadata->>'size')::bigint = 6243043;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/% missing or wrong size — rolled back', 'global/uplifting/uplifting_lofi_walkingaway_013.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, loudness_lufs, mood, energy, tempo_band, genre, vocals, approval_status, approved, production_use_allowed, is_active, notes)
  SELECT 'uplifting_lofi_walkingaway_013', 'Walking Away (Lofi, Peaceful, Motivating)', 'manual_harvest', 'post-music', 'post-music/global/uplifting/uplifting_lofi_walkingaway_013.mp3', 'fd8a618a4076b76f02f69414d6beb4ad7ddf3b8c26164085bd6dc1a9fd2f7610', 'audio/mpeg', 6243043, 156.048, -13.28, 'uplifting', 'medium', 'mid', 'electronic', 'instrumental_only', 'intake_candidate', false, false, false, 'music-harvester-v1 batch2 four-brand intake (2026-08-06) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'uplifting_lofi_walkingaway_013')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/walking-away-lofi-peaceful-motivating/', '99bf92297e1b92dadb01acd3fdd57738e11f77e04d543bccd3f7aace583cb4cc', '_harness/music_harvester_v1_20260806/candidates/uplifting_lofi_walkingaway_013.license.txt', true, true, true, true, false, false FROM ins;

-- warm_lofi_humanagain_015  (Feeling Human Again · warm · 231s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/warm/warm_lofi_humanagain_015.mp3' AND (metadata->>'size')::bigint = 9569256;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/% missing or wrong size — rolled back', 'global/warm/warm_lofi_humanagain_015.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, loudness_lufs, mood, energy, tempo_band, genre, vocals, approval_status, approved, production_use_allowed, is_active, notes)
  SELECT 'warm_lofi_humanagain_015', 'Feeling Human Again', 'manual_harvest', 'post-music', 'post-music/global/warm/warm_lofi_humanagain_015.mp3', '896a6ddf192c6bca7f135d44bd42c7070b263215039cde22f19501f9beb9dbaf', 'audio/mpeg', 9569256, 230.856, -13.93, 'warm', 'low', 'slow', 'electronic', 'instrumental_only', 'intake_candidate', false, false, false, 'music-harvester-v1 batch2 four-brand intake (2026-08-06) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'warm_lofi_humanagain_015')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/holiznacc0/spring-woke-me-up/feeling-human-again/', '2e12bd949e2cd3345ae02627257b4aef78b59f4dd9d31e91c3df0817213b6ebe', '_harness/music_harvester_v1_20260806/candidates/warm_lofi_humanagain_015.license.txt', true, true, true, true, false, false FROM ins;

-- warm_lofi_rooftops_018  (Roof Tops · warm · 214s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/warm/warm_lofi_rooftops_018.mp3' AND (metadata->>'size')::bigint = 8902309;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/% missing or wrong size — rolled back', 'global/warm/warm_lofi_rooftops_018.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, loudness_lufs, mood, energy, tempo_band, genre, vocals, approval_status, approved, production_use_allowed, is_active, notes)
  SELECT 'warm_lofi_rooftops_018', 'Roof Tops', 'manual_harvest', 'post-music', 'post-music/global/warm/warm_lofi_rooftops_018.mp3', 'f6e619fbfdc0898c409494d5c810d34d9cd29be2b75bb2d8c197e1edb37155b5', 'audio/mpeg', 8902309, 214.464, -14.88, 'warm', 'low', 'slow', 'electronic', 'instrumental_only', 'intake_candidate', false, false, false, 'music-harvester-v1 batch2 four-brand intake (2026-08-06) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'warm_lofi_rooftops_018')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/holiznacc0/summer-air-lo-fi/roof-tops/', 'b4753f366b953044228fb392845619817dc7236411e784c0a20fc793eb83b55e', '_harness/music_harvester_v1_20260806/candidates/warm_lofi_rooftops_018.license.txt', true, true, true, true, false, false FROM ins;

-- warm_lofi_sunlight_016  (Faded in the Sunlight · warm · 178s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/warm/warm_lofi_sunlight_016.mp3' AND (metadata->>'size')::bigint = 7453669;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/% missing or wrong size — rolled back', 'global/warm/warm_lofi_sunlight_016.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, loudness_lufs, mood, energy, tempo_band, genre, vocals, approval_status, approved, production_use_allowed, is_active, notes)
  SELECT 'warm_lofi_sunlight_016', 'Faded in the Sunlight', 'manual_harvest', 'post-music', 'post-music/global/warm/warm_lofi_sunlight_016.mp3', '0262718d6091a8a456b870b3af749a48b83d7903a6c551a99a662e67bf206aa4', 'audio/mpeg', 7453669, 178.248, -15.83, 'warm', 'low', 'slow', 'electronic', 'instrumental_only', 'intake_candidate', false, false, false, 'music-harvester-v1 batch2 four-brand intake (2026-08-06) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'warm_lofi_sunlight_016')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/holiznacc0/summer-air-lo-fi/faded-in-the-sunlight/', 'a79db1a008a56d0a34c7802dc974481d2b6a5fbe2705d621721f810048a7c1ea', '_harness/music_harvester_v1_20260806/candidates/warm_lofi_sunlight_016.license.txt', true, true, true, true, false, false FROM ins;

-- warm_lofi_warmfuzz_017  (Warm Fuzz (LoFi, Retro) · warm · 173s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/warm/warm_lofi_warmfuzz_017.mp3' AND (metadata->>'size')::bigint = 6905485;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/% missing or wrong size — rolled back', 'global/warm/warm_lofi_warmfuzz_017.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, loudness_lufs, mood, energy, tempo_band, genre, vocals, approval_status, approved, production_use_allowed, is_active, notes)
  SELECT 'warm_lofi_warmfuzz_017', 'Warm Fuzz (LoFi, Retro)', 'manual_harvest', 'post-music', 'post-music/global/warm/warm_lofi_warmfuzz_017.mp3', '974ffd083b09aecbe60412f3376db07fb241adbbb0abf89698a22229a2de02c6', 'audio/mpeg', 6905485, 172.608, -14.17, 'warm', 'medium', 'mid', 'electronic', 'instrumental_only', 'intake_candidate', false, false, false, 'music-harvester-v1 batch2 four-brand intake (2026-08-06) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'warm_lofi_warmfuzz_017')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/warm-fuzz-lofi-retro/', '2d76c867bbbfaee128421d7050461d4e6b010c9191067ca9111c503b0681b14e', '_harness/music_harvester_v1_20260806/candidates/warm_lofi_warmfuzz_017.license.txt', true, true, true, true, false, false FROM ins;

-- ── VERIFY (all fail-closed; any breach rolls the whole batch back) ──────────────────
DO $$
DECLARE batch int; bad_lic int; missing_lic int; drift int;
        base_track bigint; base_lic bigint; pre_ex bigint; expected_new bigint;
        grew_track bigint; grew_lic bigint; incongruent text;
BEGIN
  -- 0. Still the same transaction (C-12 re-check at the far end).
  IF (SELECT txid FROM pg_temp._music_intake_txn) <> txid_current() THEN
    RAISE EXCEPTION 'music-intake C-12: transaction id changed during the batch — rolled back';
  END IF;

  -- 1. Fenced-count: exactly N rows, every one of the four fences off.
  --    Scoped on track_key, NOT on notes: notes is nullable unconstrained free text that a
  --    human may legitimately edit at the aural gate, so it is not a safe identity predicate
  --    (the same reasoning that re-keyed the rollback).
  SELECT count(*) INTO batch FROM m.music_track WHERE track_key IN ('calm_lofi_calmcurrents_019', 'calm_lofi_saturation_020', 'neutral_lofi_softreset_022', 'uplifting_lofi_bubbles_014', 'uplifting_lofi_hope_010', 'uplifting_lofi_springsight_011', 'uplifting_lofi_tranquilmind_012', 'uplifting_lofi_walkingaway_013', 'warm_lofi_humanagain_015', 'warm_lofi_rooftops_018', 'warm_lofi_sunlight_016', 'warm_lofi_warmfuzz_017')
    AND is_active IS FALSE AND approved IS FALSE
    AND approval_status = 'intake_candidate' AND production_use_allowed IS FALSE;
  IF batch <> 12 THEN
    RAISE EXCEPTION 'music-intake verify: % fenced rows in batch, expected 12 — rolled back', batch;
  END IF;

  -- 2. MARKER CONSISTENCY (data quality, not identity): every row this apply is responsible
  --    for should also carry the batch marker, and the marker should not have leaked to any
  --    other row. Identity itself is the track_key set above and in the rollback.
  SELECT string_agg(track_key, ', ') INTO incongruent FROM (
    (SELECT track_key FROM m.music_track WHERE notes = 'music-harvester-v1 batch2 four-brand intake (2026-08-06) — fenced candidate, not selectable'
     EXCEPT
     SELECT * FROM (VALUES ('calm_lofi_calmcurrents_019'), ('calm_lofi_saturation_020'), ('neutral_lofi_softreset_022'), ('uplifting_lofi_bubbles_014'), ('uplifting_lofi_hope_010'), ('uplifting_lofi_springsight_011'), ('uplifting_lofi_tranquilmind_012'), ('uplifting_lofi_walkingaway_013'), ('warm_lofi_humanagain_015'), ('warm_lofi_rooftops_018'), ('warm_lofi_sunlight_016'), ('warm_lofi_warmfuzz_017')) v(track_key))
    UNION ALL
    (SELECT * FROM (VALUES ('calm_lofi_calmcurrents_019'), ('calm_lofi_saturation_020'), ('neutral_lofi_softreset_022'), ('uplifting_lofi_bubbles_014'), ('uplifting_lofi_hope_010'), ('uplifting_lofi_springsight_011'), ('uplifting_lofi_tranquilmind_012'), ('uplifting_lofi_walkingaway_013'), ('warm_lofi_humanagain_015'), ('warm_lofi_rooftops_018'), ('warm_lofi_sunlight_016'), ('warm_lofi_warmfuzz_017')) v(track_key)
     EXCEPT
     SELECT track_key FROM m.music_track WHERE notes = 'music-harvester-v1 batch2 four-brand intake (2026-08-06) — fenced candidate, not selectable')
  ) d;
  IF incongruent IS NOT NULL THEN
    RAISE EXCEPTION 'music-intake verify: batch marker and track_key set diverge on [%] — rolled back', incongruent;
  END IF;

  -- 3. Every batch track has its 1:1 licence row (no orphan track).
  SELECT count(*) INTO missing_lic FROM m.music_track t
    WHERE t.track_key IN ('calm_lofi_calmcurrents_019', 'calm_lofi_saturation_020', 'neutral_lofi_softreset_022', 'uplifting_lofi_bubbles_014', 'uplifting_lofi_hope_010', 'uplifting_lofi_springsight_011', 'uplifting_lofi_tranquilmind_012', 'uplifting_lofi_walkingaway_013', 'warm_lofi_humanagain_015', 'warm_lofi_rooftops_018', 'warm_lofi_sunlight_016', 'warm_lofi_warmfuzz_017')
      AND NOT EXISTS (SELECT 1 FROM m.music_license l WHERE l.track_id = t.track_id);
  IF missing_lic <> 0 THEN
    RAISE EXCEPTION 'music-intake verify: % batch track(s) with no licence row — rolled back', missing_lic;
  END IF;

  -- 4. v0 licence invariants: cc0, no attribution obligation, Content-ID fail-closed.
  SELECT count(*) INTO bad_lic FROM m.music_track t JOIN m.music_license l USING (track_id)
    WHERE t.track_key IN ('calm_lofi_calmcurrents_019', 'calm_lofi_saturation_020', 'neutral_lofi_softreset_022', 'uplifting_lofi_bubbles_014', 'uplifting_lofi_hope_010', 'uplifting_lofi_springsight_011', 'uplifting_lofi_tranquilmind_012', 'uplifting_lofi_walkingaway_013', 'warm_lofi_humanagain_015', 'warm_lofi_rooftops_018', 'warm_lofi_sunlight_016', 'warm_lofi_warmfuzz_017')
      AND NOT (l.license_type = 'cc0'
               AND l.attribution_required IS FALSE
               AND l.content_id_safe IS FALSE
               AND l.commercial_use_allowed IS TRUE
               AND l.social_use_allowed IS TRUE);
  IF bad_lic <> 0 THEN
    RAISE EXCEPTION 'music-intake verify: % batch licence row(s) violate the v0 invariant — rolled back', bad_lic;
  END IF;

  -- 5. ADDITIVE-ONLY: both tables grew by exactly the number of rows this run inserted
  --    (12 minus any already present), so nothing else was created or destroyed.
  SELECT track_n, license_n, pre_existing INTO base_track, base_lic, pre_ex
    FROM pg_temp._music_intake_counts;
  expected_new := 12 - pre_ex;
  SELECT count(*) - base_track INTO grew_track FROM m.music_track;
  SELECT count(*) - base_lic   INTO grew_lic   FROM m.music_license;
  IF grew_track <> expected_new THEN
    RAISE EXCEPTION 'music-intake verify: m.music_track grew by %, expected % — rolled back', grew_track, expected_new;
  END IF;
  IF grew_lic <> expected_new THEN
    RAISE EXCEPTION 'music-intake verify: m.music_license grew by %, expected % — rolled back', grew_lic, expected_new;
  END IF;

  -- 6. POOL NEUTRALITY: the selectable set must equal the pre-DML baseline, BOTH directions.
  --    NOTE: EXCEPT and UNION ALL share precedence and are LEFT-associative in Postgres,
  --    so each arm MUST be parenthesised. Without the parens this collapses to a
  --    one-directional check that silently misses newly-selectable tracks.
  SELECT count(*) INTO drift FROM (
    (SELECT track_key FROM m.music_track WHERE is_active IS TRUE OR approved IS TRUE OR approval_status = 'approved_scoped' OR production_use_allowed IS TRUE
     EXCEPT
     SELECT track_key FROM pg_temp._music_intake_baseline)
    UNION ALL
    (SELECT track_key FROM pg_temp._music_intake_baseline
     EXCEPT
     SELECT track_key FROM m.music_track WHERE is_active IS TRUE OR approved IS TRUE OR approval_status = 'approved_scoped' OR production_use_allowed IS TRUE)
  ) d;
  IF drift <> 0 THEN
    RAISE EXCEPTION 'music-intake verify: selectable pool changed by % track(s) — intake must be pool-neutral — rolled back', drift;
  END IF;
END $$;

COMMIT;
