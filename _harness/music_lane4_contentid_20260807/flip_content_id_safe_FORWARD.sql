-- Lane 4 — FORWARD: flip m.music_license.content_id_safe false -> true for the minimum
-- representative set (3 batch-1 tracks whose rows ALREADY EXIST — no dependency on the
-- blocked batch-2 apply lane).
--
-- ⚠ HELD. Apply ONLY at a PK gate, and ONLY for tracks with a RECORDED CLEAN Content-ID verdict.
--   A track without a personally-observed YouTube Studio verdict MUST be deleted from the list
--   below before this runs. There is no inference path: CC0 does not prove Content-ID safety.
--
-- ⚠ PINNED EXECUTION CHANNEL: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <this file>
--   Same rule as the batch-2 packet: this file carries its own BEGIN/COMMIT, so it needs a channel
--   that runs it as ONE call in ONE session. apply_migration is RULED OUT (mints a permanent
--   migration identity for a harness file).
--
-- ⚠ THIS FLIP ALONE MAKES NOTHING SELECTABLE. content_id_safe is ONE of nine eligibility
--   conditions. These three tracks stay fenced (intake_candidate, all four fences false) and have
--   NO scoped_approval review-event, so select_music will keep returning exactly the same single
--   row. Promotion is a SEPARATE, later PK gate — see the packet's "what promotion still needs".
--
-- ROLLBACK: flip_content_id_safe_ROLLBACK.sql (keyed on the same three track_ids).

BEGIN;

-- Baseline BEFORE any write: the selectable pool must be identical afterwards.
CREATE TEMP TABLE _lane4_txn ON COMMIT DROP AS SELECT txid_current() AS txid;

CREATE TEMP TABLE _lane4_baseline ON COMMIT DROP AS
  SELECT track_key FROM m.music_track
   WHERE is_active IS TRUE OR approved IS TRUE
      OR approval_status = 'approved_scoped' OR production_use_allowed IS TRUE;

CREATE TEMP TABLE _lane4_targets (track_id uuid PRIMARY KEY, track_key text NOT NULL) ON COMMIT DROP;
INSERT INTO pg_temp._lane4_targets (track_id, track_key) VALUES
  ('7b0f641c-bc65-498c-86e8-35a7a6237112', 'uplifting_composed_pluto_007'),
  ('adbadf4c-57c3-405a-a889-00cb5c51a561', 'warm_acoustic_simple_001'),
  ('8a5e7835-5139-4e49-8eff-83fd2c8bffbc', 'neutral_short_4mei_009');

-- SPLIT-CHANNEL GUARD (executable; runs BEFORE any write).
DO $$
DECLARE base_txid bigint;
BEGIN
  IF to_regclass('pg_temp._lane4_txn') IS NULL
     OR to_regclass('pg_temp._lane4_baseline') IS NULL
     OR to_regclass('pg_temp._lane4_targets') IS NULL THEN
    RAISE EXCEPTION 'lane4: temp relations missing before DML — the channel is NOT running this file as one transaction; STOP, nothing written';
  END IF;
  SELECT txid INTO base_txid FROM pg_temp._lane4_txn;
  IF base_txid <> txid_current() THEN
    RAISE EXCEPTION 'lane4: transaction id changed (% -> %) before DML — split channel; STOP, nothing written', base_txid, txid_current();
  END IF;
END $$;

-- PRECONDITION: identity + current state. Every target must exist, be keyed as expected,
-- and currently read content_id_safe = false. Fail-closed on any surprise.
DO $$
DECLARE n bigint; bad text;
BEGIN
  SELECT count(*) INTO n FROM pg_temp._lane4_targets;
  IF n <> 3 THEN
    RAISE EXCEPTION 'lane4: target table loaded % rows, expected 3 — nothing written', n;
  END IF;

  SELECT string_agg(t.track_key, ', ') INTO bad
    FROM pg_temp._lane4_targets t
   WHERE NOT EXISTS (SELECT 1 FROM m.music_track mt
                      WHERE mt.track_id = t.track_id AND mt.track_key = t.track_key);
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'lane4: track_id/track_key mismatch or missing row for (%) — nothing written', bad;
  END IF;

  SELECT string_agg(t.track_key || '=' || coalesce(l.content_id_safe::text,'NULL'), ', ') INTO bad
    FROM pg_temp._lane4_targets t
    JOIN m.music_license l ON l.track_id = t.track_id
   WHERE l.content_id_safe IS DISTINCT FROM false;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'lane4: expected content_id_safe=false on every target, found (%) — nothing written', bad;
  END IF;
END $$;

-- The flip: CAS-guarded, exactly 3 rows.
DO $$
DECLARE v_rowcount integer;
BEGIN
  UPDATE m.music_license l
     SET content_id_safe = true
    FROM pg_temp._lane4_targets t
   WHERE l.track_id = t.track_id
     AND l.content_id_safe = false;
  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  IF v_rowcount <> 3 THEN
    RAISE EXCEPTION 'lane4 flip failed: expected exactly 3 rows updated, got % — rolled back', v_rowcount;
  END IF;
END $$;

-- POST-ASSERT — deliberately DIFFERENT from the cc-0039 precedent.
-- cc-0039 asserted select_music = 1 because its flip made a track selectable. THIS flip must
-- make NOTHING newly selectable: all three targets remain fenced with no scoped_approval event,
-- so the selectable pool must be byte-identical to the pre-write baseline, both directions.
DO $$
DECLARE drift int;
BEGIN
  IF (SELECT txid FROM pg_temp._lane4_txn) <> txid_current() THEN
    RAISE EXCEPTION 'lane4: transaction id changed during the flip — rolled back';
  END IF;

  SELECT count(*) INTO drift FROM (
    (SELECT track_key FROM m.music_track
      WHERE is_active IS TRUE OR approved IS TRUE
         OR approval_status = 'approved_scoped' OR production_use_allowed IS TRUE
     EXCEPT
     SELECT track_key FROM pg_temp._lane4_baseline)
    UNION ALL
    (SELECT track_key FROM pg_temp._lane4_baseline
     EXCEPT
     SELECT track_key FROM m.music_track
      WHERE is_active IS TRUE OR approved IS TRUE
         OR approval_status = 'approved_scoped' OR production_use_allowed IS TRUE)
  ) d;
  IF drift <> 0 THEN
    RAISE EXCEPTION 'lane4: selectable pool changed by % track(s) — a content_id_safe flip must be pool-neutral — rolled back', drift;
  END IF;
END $$;

COMMIT;
