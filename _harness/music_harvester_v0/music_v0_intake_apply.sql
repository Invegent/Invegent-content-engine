-- Music Library v0 — STARTER HARVEST fenced intake (9 CC0 instrumental tracks)
-- Generated from manifest.json by build_intake.py. FENCED intake ONLY:
--   all four fences default-off (approval_status='intake_candidate', approved/production_use_allowed/is_active=false).
--   Nothing selectable; no approval, no fence-flip, no suitability rows. Approval is a SEPARATE PK gate.
-- Upload is DEFERRED (PK decision): the per-track storage byte-precheck presumes the .mp3 objects were
--   uploaded to bucket 'post-music' at the apply gate (post-approval); it will FAIL-CLOSED (rollback) otherwise.
-- Idempotent: WHERE NOT EXISTS on track_key. Mirrors ndis_yarns_logo_intake_apply.sql.
--
-- ROLLBACK (reference only — fenced rows are non-selectable; safe to remove pre-approval):
--   DELETE FROM m.music_license WHERE track_id IN (SELECT track_id FROM m.music_track WHERE notes = <batch_note>);
--   DELETE FROM m.music_track   WHERE notes = <batch_note>;

BEGIN;

-- warm_acoustic_simple_001  (A Simple Theme · warm · 97s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/warm/warm_acoustic_simple_001.mp3' AND (metadata->>'size')::bigint = 2339200;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/%% missing or wrong size — rolled back', 'global/warm/warm_acoustic_simple_001.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, mood, energy, tempo_band, genre, vocals, notes)
  SELECT 'warm_acoustic_simple_001', 'A Simple Theme', 'manual_harvest', 'post-music', 'post-music/global/warm/warm_acoustic_simple_001.mp3', 'e870e4994da2d7238b6bfa5bf1e96f2e432f71b7285f834edd332737ac747512', 'audio/mpeg', 2339200, 97.296, 'warm', 'low', 'slow', 'acoustic', 'instrumental_only', 'music-harvester-v0 starter intake (2026-07-09) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'warm_acoustic_simple_001')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/maarten-schellekens/public-domain-1/a-simple-theme/', '9907c86d500bb56e601942ad61babf743fa4a5509fe6aafd915fca5506fd62aa', 'candidates/warm_acoustic_simple_001.license.txt', true, true, true, true, false, false FROM ins;

-- warm_acoustic_ducklin_002  (Little Ducklin · warm · 139s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/warm/warm_acoustic_ducklin_002.mp3' AND (metadata->>'size')::bigint = 5579737;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/%% missing or wrong size — rolled back', 'global/warm/warm_acoustic_ducklin_002.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, mood, energy, tempo_band, genre, vocals, notes)
  SELECT 'warm_acoustic_ducklin_002', 'Little Ducklin', 'manual_harvest', 'post-music', 'post-music/global/warm/warm_acoustic_ducklin_002.mp3', 'ebfa2223640001f245f93388544efe60e3fc5418a46f010f8846eb018dde46ce', 'audio/mpeg', 5579737, 138.792, 'warm', 'medium', 'mid', 'acoustic', 'instrumental_only', 'music-harvester-v0 starter intake (2026-07-09) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'warm_acoustic_ducklin_002')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/maarten-schellekens/public-domain-1/little-ducklin/', '8a258ebff34130d7b66f85c4745026b1eb5c6ed5c04b913448e6d25e372248e9', 'candidates/warm_acoustic_ducklin_002.license.txt', true, true, true, true, false, false FROM ins;

-- calm_ambient_glen_003  (Whispers of the Glen · calm · 162s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/calm/calm_ambient_glen_003.mp3' AND (metadata->>'size')::bigint = 2589184;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/%% missing or wrong size — rolled back', 'global/calm/calm_ambient_glen_003.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, mood, energy, tempo_band, genre, vocals, notes)
  SELECT 'calm_ambient_glen_003', 'Whispers of the Glen', 'manual_harvest', 'post-music', 'post-music/global/calm/calm_ambient_glen_003.mp3', 'bba42f8a7d828d3631b2ed66f05455b19c5f88b59b3895e4a28a8533b07b6ae4', 'audio/mpeg', 2589184, 161.568, 'calm', 'low', 'slow', 'ambient', 'instrumental_only', 'music-harvester-v0 starter intake (2026-07-09) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'calm_ambient_glen_003')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/maarten-schellekens/public-domain-1/whispers-of-the-glen/', 'b54a3de70917c7e4fd9cf966a1dd83ccf938704c1b9b98faea1a38a28ca9a9b5', 'candidates/calm_ambient_glen_003.license.txt', true, true, true, true, false, false FROM ins;

-- neutral_jazz_saxpiano_004  (Sax and Piano (free track) · neutral · 94s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/neutral/neutral_jazz_saxpiano_004.mp3' AND (metadata->>'size')::bigint = 3796121;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/%% missing or wrong size — rolled back', 'global/neutral/neutral_jazz_saxpiano_004.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, mood, energy, tempo_band, genre, vocals, notes)
  SELECT 'neutral_jazz_saxpiano_004', 'Sax and Piano (free track)', 'manual_harvest', 'post-music', 'post-music/global/neutral/neutral_jazz_saxpiano_004.mp3', '83b8c88b10bbb21788636bccca8f0aa6817d195ef91557507d0981f323865ff1', 'audio/mpeg', 3796121, 94.201, 'neutral', 'medium', 'mid', 'other', 'instrumental_only', 'music-harvester-v0 starter intake (2026-07-09) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'neutral_jazz_saxpiano_004')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/maarten-schellekens/public-domain-1/sax-and-piano-free-track/', 'b0792be068a503c3821b471fd2e4a46941bcae409e70f61ea6894fd59830a102', 'candidates/neutral_jazz_saxpiano_004.license.txt', true, true, true, true, false, false FROM ins;

-- neutral_piano_spring_005  (Spring On The Horizon · neutral · 92s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/neutral/neutral_piano_spring_005.mp3' AND (metadata->>'size')::bigint = 3673165;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/%% missing or wrong size — rolled back', 'global/neutral/neutral_piano_spring_005.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, mood, energy, tempo_band, genre, vocals, notes)
  SELECT 'neutral_piano_spring_005', 'Spring On The Horizon', 'manual_harvest', 'post-music', 'post-music/global/neutral/neutral_piano_spring_005.mp3', '3776c85ecae4f6052c4fe4645bef02f51de35ba7257380bca3e0707853d1aa6e', 'audio/mpeg', 3673165, 91.8, 'neutral', 'low', 'slow', 'ambient', 'instrumental_only', 'music-harvester-v0 starter intake (2026-07-09) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'neutral_piano_spring_005')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/holiznacc0/background-music/spring-on-the-horizon/', '728a0ffd67c9d5dbc8838f030f508800cf41b64bb001119dfd772803522dd991', 'candidates/neutral_piano_spring_005.license.txt', true, true, true, true, false, false FROM ins;

-- calm_piano_drifting_006  (Drifting Piano · calm · 110s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/calm/calm_piano_drifting_006.mp3' AND (metadata->>'size')::bigint = 4420963;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/%% missing or wrong size — rolled back', 'global/calm/calm_piano_drifting_006.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, mood, energy, tempo_band, genre, vocals, notes)
  SELECT 'calm_piano_drifting_006', 'Drifting Piano', 'manual_harvest', 'post-music', 'post-music/global/calm/calm_piano_drifting_006.mp3', '5d1d80af901c244bcedb618b5350b83874167258ba4fa17da83a2a005a26f95e', 'audio/mpeg', 4420963, 110.496, 'calm', 'low', 'slow', 'ambient', 'instrumental_only', 'music-harvester-v0 starter intake (2026-07-09) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'calm_piano_drifting_006')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/holiznacc0/background-music/drifting-piano/', 'c7301a664c32b575b4984ab6b867ce9f9be4eee92265bed97938526bf15a291f', 'candidates/calm_piano_drifting_006.license.txt', true, true, true, true, false, false FROM ins;

-- uplifting_composed_pluto_007  (A Small Town On Pluto (Composed) · uplifting · 230s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/uplifting/uplifting_composed_pluto_007.mp3' AND (metadata->>'size')::bigint = 9211405;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/%% missing or wrong size — rolled back', 'global/uplifting/uplifting_composed_pluto_007.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, mood, energy, tempo_band, genre, vocals, notes)
  SELECT 'uplifting_composed_pluto_007', 'A Small Town On Pluto (Composed)', 'manual_harvest', 'post-music', 'post-music/global/uplifting/uplifting_composed_pluto_007.mp3', 'da6426f0753d11173a39dfdf0b6078afa833d4b1ec499a0b2b02550e8cd7501b', 'audio/mpeg', 9211405, 230.256, 'uplifting', 'medium', 'mid', 'orchestral', 'instrumental_only', 'music-harvester-v0 starter intake (2026-07-09) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'uplifting_composed_pluto_007')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/holiznacc0/background-music/a-small-town-on-pluto-composed/', 'df8a9da232c8db8273b9d65c54274c23fb7dc88c02d7bbff5647c53214389190', 'candidates/uplifting_composed_pluto_007.license.txt', true, true, true, true, false, false FROM ins;

-- corporate_theme_medieval_008  (Medieval Theme · corporate · 157s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/corporate/corporate_theme_medieval_008.mp3' AND (metadata->>'size')::bigint = 2512270;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/%% missing or wrong size — rolled back', 'global/corporate/corporate_theme_medieval_008.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, mood, energy, tempo_band, genre, vocals, notes)
  SELECT 'corporate_theme_medieval_008', 'Medieval Theme', 'manual_harvest', 'post-music', 'post-music/global/corporate/corporate_theme_medieval_008.mp3', 'c8e0f62c730001b881fdff86fc52a262e1654e778382661f97ce78f39c681ea7', 'audio/mpeg', 2512270, 156.761, 'corporate', 'medium', 'mid', 'orchestral', 'instrumental_only', 'music-harvester-v0 starter intake (2026-07-09) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'corporate_theme_medieval_008')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/maarten-schellekens/public-domain-1/medieval-theme/', '5aa0e47c09a7b5ee174a6d7d729021842187eb66cf90841085fe9d8fc44949a6', 'candidates/corporate_theme_medieval_008.license.txt', true, true, true, true, false, false FROM ins;

-- neutral_short_4mei_009  (4 mei · neutral · 66s · cc0)
DO $$ BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id = 'post-music'
    AND name = 'global/neutral/neutral_short_4mei_009.mp3' AND (metadata->>'size')::bigint = 2661335;
  IF NOT FOUND THEN RAISE EXCEPTION 'music-intake precheck failed: post-music/%% missing or wrong size — rolled back', 'global/neutral/neutral_short_4mei_009.mp3'; END IF;
END $$;
WITH ins AS (
  INSERT INTO m.music_track (track_key, title, source, storage_bucket, storage_path, sha256, mime, bytes, duration_seconds, mood, energy, tempo_band, genre, vocals, notes)
  SELECT 'neutral_short_4mei_009', '4 mei', 'manual_harvest', 'post-music', 'post-music/global/neutral/neutral_short_4mei_009.mp3', '956f7e96b736d729906092eceab484c7b803922f63e04a4f3f54406493e01283', 'audio/mpeg', 2661335, 65.832, 'neutral', 'low', 'slow', 'other', 'instrumental_only', 'music-harvester-v0 starter intake (2026-07-09) — fenced candidate, not selectable'
  WHERE NOT EXISTS (SELECT 1 FROM m.music_track WHERE track_key = 'neutral_short_4mei_009')
  RETURNING track_id
)
INSERT INTO m.music_license (track_id, license_type, license_name, source_url, license_snapshot_hash, license_snapshot_path, commercial_use_allowed, social_use_allowed, modification_allowed, paid_ads_allowed, attribution_required, content_id_safe)
SELECT ins.track_id, 'cc0', 'CC0 1.0 Universal (Public Domain Dedication)', 'https://freemusicarchive.org/music/maarten-schellekens/public-domain-1/4-mei/', '339ea078ecc1193c2f1423b17d13d8262371c62a77d52451e776237ca95205a9', 'candidates/neutral_short_4mei_009.license.txt', true, true, true, true, false, false FROM ins;

-- Verify: exactly N fenced rows in this batch, and ZERO selectable tracks anywhere (pool-neutral).
DO $$
DECLARE batch int; selectable int;
BEGIN
  SELECT count(*) INTO batch FROM m.music_track WHERE notes = 'music-harvester-v0 starter intake (2026-07-09) — fenced candidate, not selectable'
    AND is_active IS FALSE AND approved IS FALSE AND approval_status = 'intake_candidate' AND production_use_allowed IS FALSE;
  IF batch <> 9 THEN RAISE EXCEPTION 'music-intake verify: %% fenced rows in batch, expected 9 — rolled back', batch; END IF;
  SELECT count(*) INTO selectable FROM m.music_track
    WHERE is_active IS TRUE OR approved IS TRUE OR approval_status = 'approved_scoped' OR production_use_allowed IS TRUE;
  IF selectable <> 0 THEN RAISE EXCEPTION 'music-intake verify: %% selectable tracks, expected 0 (pool must stay neutral) — rolled back', selectable; END IF;
END $$;

COMMIT;
