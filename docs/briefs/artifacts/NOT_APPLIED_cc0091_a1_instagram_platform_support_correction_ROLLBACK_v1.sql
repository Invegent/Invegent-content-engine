-- cc-0091 A1 — Instagram platform_support correction (ROLLBACK)
--
-- STATUS: NOT APPLIED. Rollback for
--         NOT_APPLIED_cc0091_a1_instagram_platform_support_correction_v1.sql
--
-- ⚠ THIS ROLLBACK IS DELIBERATELY NON-SYMMETRIC WITH THE FORWARD.
--
-- The forward sets three rows to instagram:true with a single uniform statement.
-- The inverse is NOT uniform, because the three rows did not start in the same state:
--
--   video_short_stat           instagram key PRESENT, value false  -> restore to false
--   video_short_stat_voice     instagram key ABSENT                -> REMOVE the key
--   video_short_kinetic_voice  instagram key ABSENT                -> REMOVE the key
--
-- A naive "SET instagram = false" rollback would appear to work and would be WRONG:
-- it would leave video_short_stat_voice and video_short_kinetic_voice holding an
-- explicit false they never had. That silently converts "nobody ever stated a value"
-- into "someone stated a denial" — destroying exactly the distinction cc-0091 A3
-- exists to preserve, and permanently erasing the evidence that these two rows were
-- never evaluated for Instagram in the first place.
--
-- Restoring true prior state therefore requires TWO statements, not one.
--
-- Scope: 3 rows, one JSONB key each. No DDL. No GRANT/REVOKE. youtube / facebook /
--        linkedin keys untouched throughout.
-- Idempotent: each guard makes a re-run a no-op.
-- video_short_kinetic is not referenced — the forward never touched it.

-- ── PRE-ROLLBACK BASELINE (run first; confirm the forward is actually in place) ──
-- SELECT ice_format_key, platform_support
--   FROM t."5.3_content_format"
--  WHERE ice_format_key IN ('video_short_stat','video_short_stat_voice',
--                           'video_short_kinetic_voice','video_short_kinetic')
--  ORDER BY ice_format_key;
-- EXPECTED (post-forward state):
--   video_short_kinetic       {"youtube":true,"facebook":false,"linkedin":false,"instagram":false}
--   video_short_kinetic_voice {"youtube":true,"facebook":false,"instagram":true}
--   video_short_stat          {"youtube":true,"facebook":false,"linkedin":false,"instagram":true}
--   video_short_stat_voice    {"youtube":true,"facebook":false,"instagram":true}

BEGIN;

-- (1) Key EXISTED as false before the forward -> restore the stated false.
UPDATE t."5.3_content_format"
   SET platform_support = jsonb_set(platform_support, '{instagram}', 'false'::jsonb, true),
       updated_at = now()
 WHERE ice_format_key = 'video_short_stat'
   AND platform_support ->> 'instagram' IS DISTINCT FROM 'false';

-- (2) Key was ABSENT before the forward -> remove it, restoring "never stated".
UPDATE t."5.3_content_format"
   SET platform_support = platform_support - 'instagram',
       updated_at = now()
 WHERE ice_format_key IN ('video_short_stat_voice', 'video_short_kinetic_voice')
   AND platform_support ? 'instagram';

-- Fail-closed assertions: verify the ASYMMETRY actually landed, not merely that
-- "nothing is true anymore". A rollback that sets all three false would pass a
-- naive check; these assertions are written so that it would NOT pass these.
DO $$
DECLARE v_n int;
BEGIN
  -- stat: key present AND false
  SELECT count(*) INTO v_n
    FROM t."5.3_content_format"
   WHERE ice_format_key = 'video_short_stat'
     AND platform_support ? 'instagram'
     AND platform_support ->> 'instagram' = 'false';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'cc-0091 A1 ROLLBACK ABORT: video_short_stat must hold instagram=false (found % rows)', v_n;
  END IF;

  -- the two _voice rows: key must be ABSENT, not false
  SELECT count(*) INTO v_n
    FROM t."5.3_content_format"
   WHERE ice_format_key IN ('video_short_stat_voice','video_short_kinetic_voice')
     AND NOT (platform_support ? 'instagram');
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'cc-0091 A1 ROLLBACK ABORT: both _voice rows must have the instagram key ABSENT, not false (found % of 2)', v_n;
  END IF;

  -- untouched-neighbour guard: youtube must still be true on all three
  SELECT count(*) INTO v_n
    FROM t."5.3_content_format"
   WHERE ice_format_key IN ('video_short_stat','video_short_stat_voice','video_short_kinetic_voice')
     AND platform_support ->> 'youtube' = 'true';
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'cc-0091 A1 ROLLBACK ABORT: youtube support collaterally altered (found % of 3)', v_n;
  END IF;
END $$;

COMMIT;

-- ── POST-ROLLBACK VERIFICATION — must equal the FORWARD's pre-apply baseline ──
-- SELECT ice_format_key, platform_support
--   FROM t."5.3_content_format"
--  WHERE ice_format_key IN ('video_short_stat','video_short_stat_voice',
--                           'video_short_kinetic_voice','video_short_kinetic')
--  ORDER BY ice_format_key;
-- EXPECTED AFTER ROLLBACK (byte-identical to the forward's EXPECTED BASELINE):
--   video_short_kinetic       {"youtube":true,"facebook":false,"linkedin":false,"instagram":false}
--   video_short_kinetic_voice {"youtube":true,"facebook":false}
--   video_short_stat          {"youtube":true,"facebook":false,"linkedin":false,"instagram":false}
--   video_short_stat_voice    {"youtube":true,"facebook":false}
--
-- NOTE: updated_at will differ from the original pre-apply values on all three rows.
-- That is expected and unavoidable; it is a timestamp, not capability state. Do not
-- treat an updated_at difference as a failed rollback.
