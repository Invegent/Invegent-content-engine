-- cc-0039 FORWARD — flip m.music_license.content_id_safe false -> true for Drifting Piano.
-- HELD: apply ONLY at the T3 PK gate, AFTER a CLEAN YouTube Content-ID verdict is recorded.
-- Migration identity (permanent name; apply_migration will mint its own version at apply time):
--   name: flip_music_license_content_id_safe_drifting_piano_cc0039
-- Single-row, CAS-guarded, self-proving (aborts unless exactly 1 row flips AND select_music then = 1).

BEGIN;

-- (1) Guarded single-row flip: require current value = false, require exactly 1 row updated.
DO $$
DECLARE
  v_before   boolean;
  v_rowcount integer;
BEGIN
  SELECT content_id_safe INTO v_before
    FROM m.music_license
   WHERE track_id = '8f520a93-a2ed-4ba3-80fa-1ca4884dff88';

  IF v_before IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'cc0039 precondition failed: content_id_safe expected false, got %', v_before;
  END IF;

  UPDATE m.music_license
     SET content_id_safe = true
   WHERE track_id = '8f520a93-a2ed-4ba3-80fa-1ca4884dff88'
     AND content_id_safe = false;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  IF v_rowcount <> 1 THEN
    RAISE EXCEPTION 'cc0039 flip failed: expected exactly 1 row updated, got %', v_rowcount;
  END IF;
END $$;

-- (2) In-txn post-assert: the governed video selector now returns EXACTLY 1 row (B3 -> TRUE).
--     Aborts the whole migration if the flip did not produce the intended single eligible track.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
    FROM public.select_music('format','video_short_stat', 12, null);
  IF n <> 1 THEN
    RAISE EXCEPTION 'cc0039 post-assert failed: select_music returned % rows (expected 1)', n;
  END IF;
END $$;

COMMIT;
