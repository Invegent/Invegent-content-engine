-- Lane 4 — ROLLBACK: revert m.music_license.content_id_safe true -> false for the same three
-- track_ids the FORWARD flips. Same identity basis (track_id + track_key pair), same channel rule.
--
-- ⚠ PINNED EXECUTION CHANNEL: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <this file>
--
-- ⚠ VALIDITY WINDOW: valid only while the targets are still FENCED. If a later gate has promoted
--   any of them (fences flipped and/or a scoped_approval event written), reverting content_id_safe
--   would silently REMOVE a live, selectable bed from production — so this script ABORTS in that
--   case rather than reverting. Resolve by hand.
--
-- Reverting to false is the FAIL-CLOSED direction (false/NULL => excluded by select_music), so this
-- can never make anything newly selectable. The post-assert proves it changed nothing selectable.

BEGIN;

CREATE TEMP TABLE _lane4_rb_txn ON COMMIT DROP AS SELECT txid_current() AS txid;

CREATE TEMP TABLE _lane4_rb_baseline ON COMMIT DROP AS
  SELECT track_key FROM m.music_track
   WHERE is_active IS TRUE OR approved IS TRUE
      OR approval_status = 'approved_scoped' OR production_use_allowed IS TRUE;

CREATE TEMP TABLE _lane4_rb_targets (track_id uuid PRIMARY KEY, track_key text NOT NULL) ON COMMIT DROP;
INSERT INTO pg_temp._lane4_rb_targets (track_id, track_key) VALUES
  ('7b0f641c-bc65-498c-86e8-35a7a6237112', 'uplifting_composed_pluto_007'),
  ('adbadf4c-57c3-405a-a889-00cb5c51a561', 'warm_acoustic_simple_001'),
  ('8a5e7835-5139-4e49-8eff-83fd2c8bffbc', 'neutral_short_4mei_009');

-- SPLIT-CHANNEL GUARD (before any write).
DO $$
DECLARE base_txid bigint;
BEGIN
  IF to_regclass('pg_temp._lane4_rb_txn') IS NULL
     OR to_regclass('pg_temp._lane4_rb_baseline') IS NULL
     OR to_regclass('pg_temp._lane4_rb_targets') IS NULL THEN
    RAISE EXCEPTION 'lane4-rollback: temp relations missing before DML — the channel is NOT running this file as one transaction; STOP, nothing written';
  END IF;
  SELECT txid INTO base_txid FROM pg_temp._lane4_rb_txn;
  IF base_txid <> txid_current() THEN
    RAISE EXCEPTION 'lane4-rollback: transaction id changed (% -> %) before DML — split channel; STOP, nothing written', base_txid, txid_current();
  END IF;
END $$;

-- PRECONDITION: cardinality, identity, and the validity window (targets must still be FENCED).
DO $$
DECLARE n bigint; bad text; promoted text;
BEGIN
  SELECT count(*) INTO n FROM pg_temp._lane4_rb_targets;
  IF n <> 3 THEN
    RAISE EXCEPTION 'lane4-rollback: target table loaded % rows, expected 3 — nothing written', n;
  END IF;

  SELECT string_agg(t.track_key, ', ') INTO bad
    FROM pg_temp._lane4_rb_targets t
   WHERE NOT EXISTS (SELECT 1 FROM m.music_track mt
                      WHERE mt.track_id = t.track_id AND mt.track_key = t.track_key);
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'lane4-rollback: track_id/track_key mismatch or missing row for (%) — nothing written', bad;
  END IF;

  SELECT string_agg(mt.track_key || ' [' || mt.approval_status
           || ' approved=' || mt.approved
           || ' prod=' || mt.production_use_allowed
           || ' active=' || mt.is_active || ']', ', ')
    INTO promoted
    FROM m.music_track mt JOIN pg_temp._lane4_rb_targets t ON t.track_id = mt.track_id
   WHERE NOT (mt.approval_status = 'intake_candidate'
              AND mt.approved IS FALSE
              AND mt.production_use_allowed IS FALSE
              AND mt.is_active IS FALSE);
  IF promoted IS NOT NULL THEN
    RAISE EXCEPTION 'lane4-rollback ABORTED: target(s) are no longer fenced (%) — promotion has begun; reverting content_id_safe would pull a LIVE bed out of production; resolve by hand — nothing written', promoted;
  END IF;

  SELECT string_agg(t.track_key, ', ') INTO bad
    FROM pg_temp._lane4_rb_targets t
    JOIN m.music_license l ON l.track_id = t.track_id
   WHERE l.content_id_safe IS DISTINCT FROM true;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'lane4-rollback: expected content_id_safe=true on every target, found otherwise for (%) — already reverted? nothing written', bad;
  END IF;
END $$;

DO $$
DECLARE v_rowcount integer;
BEGIN
  UPDATE m.music_license l
     SET content_id_safe = false
    FROM pg_temp._lane4_rb_targets t
   WHERE l.track_id = t.track_id
     AND l.content_id_safe = true;
  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  IF v_rowcount <> 3 THEN
    RAISE EXCEPTION 'lane4-rollback failed: expected exactly 3 rows reverted, got % — rolled back', v_rowcount;
  END IF;
END $$;

-- POST-ASSERT: pool-neutral in both directions (reverting is fail-closed, so this must hold).
DO $$
DECLARE drift int;
BEGIN
  IF (SELECT txid FROM pg_temp._lane4_rb_txn) <> txid_current() THEN
    RAISE EXCEPTION 'lane4-rollback: transaction id changed during the revert — rolled back';
  END IF;
  SELECT count(*) INTO drift FROM (
    (SELECT track_key FROM m.music_track
      WHERE is_active IS TRUE OR approved IS TRUE
         OR approval_status = 'approved_scoped' OR production_use_allowed IS TRUE
     EXCEPT
     SELECT track_key FROM pg_temp._lane4_rb_baseline)
    UNION ALL
    (SELECT track_key FROM pg_temp._lane4_rb_baseline
     EXCEPT
     SELECT track_key FROM m.music_track
      WHERE is_active IS TRUE OR approved IS TRUE
         OR approval_status = 'approved_scoped' OR production_use_allowed IS TRUE)
  ) d;
  IF drift <> 0 THEN
    RAISE EXCEPTION 'lane4-rollback: selectable pool changed by % track(s) — rolled back', drift;
  END IF;
END $$;

COMMIT;
