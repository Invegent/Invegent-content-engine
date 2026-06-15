-- ============================================================================
-- F-SERIES-FORMAT-DIVERSITY — Stage 0: platform_support -> publisher reality
-- ============================================================================
-- Corrects t."5.3_content_format".platform_support so the per-platform format
-- resolver (Stage 1 fan_out_episode + the existing retry_episode Stage 3.5b
-- resolver) can never resolve a (platform, format) pair the publisher cannot
-- actually ship.
--
-- Publisher reality (read from publisher source this cycle):
--   * Facebook  (publisher v1.9.0 guard.ts): default-deny for video + animated;
--     ships text / image_quote / carousel only.
--   * LinkedIn  (linkedin-zapier-publisher v1.1.0): TEXT + title only.
--   * Instagram (v2.4.0): image_quote / carousel + avatar as a REEL; no animated.
--   * YouTube   (v1.12.0): the five buildable short-video formats only.
--
-- Scope = the 9 formats whose platform_support changes (text is already correct
-- and is intentionally untouched). Built from the LIVE baseline observed
-- 2026-06-15 (per-format before-md5 asserted in the pre-flight guard below).
--
-- DELIBERATELY OUT OF SCOPE: video_short, video_long_podcast_clip and
--   video_long_explainer still carry facebook=true in platform_support, BUT they
--   are is_buildable=false and get_studio_capabilities reports them as
--   state='hidden', so the resolver NEVER offers them (verified live this cycle).
--   They are inert today. When any of them becomes buildable, its platform_support
--   MUST be reviewed (latent-future note) — not corrected here, to stay within the
--   approved Stage 0 matrix.
--
-- ORDER DEPENDENCY: Stage 2 (series-outline v1.5.0 union resolver) MUST already
--   be live (it is). With the old intersection outline, correcting support would
--   make every YouTube-inclusive series 422. Stage 1 (per-platform fan_out_episode)
--   should be applied immediately after this migration.
--
-- Rollback: restore the exact prior platform_support per format (see footer).
-- ============================================================================

-- ---- Pre-flight: assert the live baseline matches what this migration was
-- ---- authored against; abort with NO writes on any drift.
DO $guard$
DECLARE
  v_expected jsonb := jsonb_build_object(
    'video_short_avatar',        '80e2c85264366528287448c3c5673521',
    'video_short_kinetic',       'ea05938e2d637d5111f4b12f9738428b',
    'video_short_stat',          'ea05938e2d637d5111f4b12f9738428b',
    'video_short_kinetic_voice', 'c49e815f5aeab44d5ac5a780a21ac981',
    'video_short_stat_voice',    'c49e815f5aeab44d5ac5a780a21ac981',
    'animated_text_reveal',      'aaae14e76ed4541359cf2b9e6cbfe122',
    'animated_data',             'aaae14e76ed4541359cf2b9e6cbfe122',
    'image_quote',               'f31ad6409a1985a7b700e10a659c8d80',
    'carousel',                  'f31ad6409a1985a7b700e10a659c8d80'
  );
  v_key text; v_now text; v_mismatch int := 0;
BEGIN
  FOR v_key IN SELECT jsonb_object_keys(v_expected) LOOP
    SELECT md5(platform_support::text) INTO v_now
      FROM t."5.3_content_format" WHERE ice_format_key = v_key;
    IF v_now IS DISTINCT FROM (v_expected->>v_key) THEN
      RAISE WARNING 'Stage0 baseline drift on %: expected %, found %',
        v_key, v_expected->>v_key, COALESCE(v_now, '(missing)');
      v_mismatch := v_mismatch + 1;
    END IF;
  END LOOP;
  IF v_mismatch > 0 THEN
    RAISE EXCEPTION 'STAGE0 ABORT: % format(s) drifted from observed baseline; re-observe before applying', v_mismatch;
  END IF;
END
$guard$;

-- ---- Apply the corrected matrix. Explicit full-object SET per format: same key
-- ---- set as the observed baseline, values flipped to publisher reality
-- ---- (deterministic end-state, not a merge-flip).

-- Video: Facebook cannot publish video -> facebook=false. YouTube keeps all five.
-- Avatar additionally keeps Instagram (publishable as a Reel).
UPDATE t."5.3_content_format" SET platform_support =
  '{"youtube":true,"facebook":false,"linkedin":false,"instagram":true}'::jsonb
  WHERE ice_format_key = 'video_short_avatar';
UPDATE t."5.3_content_format" SET platform_support =
  '{"youtube":true,"facebook":false,"linkedin":false,"instagram":false}'::jsonb
  WHERE ice_format_key = 'video_short_kinetic';
UPDATE t."5.3_content_format" SET platform_support =
  '{"youtube":true,"facebook":false,"linkedin":false,"instagram":false}'::jsonb
  WHERE ice_format_key = 'video_short_stat';
UPDATE t."5.3_content_format" SET platform_support =
  '{"youtube":true,"facebook":false}'::jsonb
  WHERE ice_format_key = 'video_short_kinetic_voice';
UPDATE t."5.3_content_format" SET platform_support =
  '{"youtube":true,"facebook":false}'::jsonb
  WHERE ice_format_key = 'video_short_stat_voice';

-- Animated: not publishable on any wired platform (FB guard blocks; no IG/LI path).
UPDATE t."5.3_content_format" SET platform_support =
  '{"facebook":false,"linkedin":false,"instagram":false}'::jsonb
  WHERE ice_format_key = 'animated_text_reveal';
UPDATE t."5.3_content_format" SET platform_support =
  '{"facebook":false,"linkedin":false,"instagram":false}'::jsonb
  WHERE ice_format_key = 'animated_data';

-- Image: LinkedIn (Zapier) is text/title only -> linkedin=false. FB + IG keep.
UPDATE t."5.3_content_format" SET platform_support =
  '{"facebook":true,"linkedin":false,"instagram":true}'::jsonb
  WHERE ice_format_key = 'image_quote';
UPDATE t."5.3_content_format" SET platform_support =
  '{"facebook":true,"linkedin":false,"instagram":true}'::jsonb
  WHERE ice_format_key = 'carousel';

-- ---- Post-check: assert all 9 rows are now at the planned end-state; abort
-- ---- (rolls back the migration) on any mismatch.
DO $verify$
DECLARE
  v_planned jsonb := jsonb_build_object(
    'video_short_avatar',        'de49efac745355b20bdc9944a495f9a7',
    'video_short_kinetic',       'a5ce0399c3ae06336dd38d7a1be873fa',
    'video_short_stat',          'a5ce0399c3ae06336dd38d7a1be873fa',
    'video_short_kinetic_voice', 'c358e26f86efdc94f14f5204acca8c45',
    'video_short_stat_voice',    'c358e26f86efdc94f14f5204acca8c45',
    'animated_text_reveal',      '03746184e617b1eda8b304b9b61a746e',
    'animated_data',             '03746184e617b1eda8b304b9b61a746e',
    'image_quote',               'aaae14e76ed4541359cf2b9e6cbfe122',
    'carousel',                  'aaae14e76ed4541359cf2b9e6cbfe122'
  );
  v_key text; v_now text; v_bad int := 0;
BEGIN
  FOR v_key IN SELECT jsonb_object_keys(v_planned) LOOP
    SELECT md5(platform_support::text) INTO v_now
      FROM t."5.3_content_format" WHERE ice_format_key = v_key;
    IF v_now IS DISTINCT FROM (v_planned->>v_key) THEN
      RAISE WARNING 'Stage0 post-check mismatch on %: expected %, found %',
        v_key, v_planned->>v_key, COALESCE(v_now, '(missing)');
      v_bad := v_bad + 1;
    END IF;
  END LOOP;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'STAGE0 POST-CHECK FAILED: % row(s) not at planned end-state', v_bad;
  END IF;
END
$verify$;

-- ============================================================================
-- ROLLBACK (manual; forward-only convention). Restore the exact prior baseline:
--
--   UPDATE t."5.3_content_format" SET platform_support = '{"youtube":true,"facebook":true,"linkedin":true,"instagram":true}'::jsonb  WHERE ice_format_key='video_short_avatar';        -- -> md5 80e2c85264366528287448c3c5673521
--   UPDATE t."5.3_content_format" SET platform_support = '{"youtube":true,"facebook":true,"linkedin":false,"instagram":false}'::jsonb WHERE ice_format_key='video_short_kinetic';       -- -> md5 ea05938e2d637d5111f4b12f9738428b
--   UPDATE t."5.3_content_format" SET platform_support = '{"youtube":true,"facebook":true,"linkedin":false,"instagram":false}'::jsonb WHERE ice_format_key='video_short_stat';          -- -> md5 ea05938e2d637d5111f4b12f9738428b
--   UPDATE t."5.3_content_format" SET platform_support = '{"youtube":true,"facebook":true}'::jsonb                                    WHERE ice_format_key='video_short_kinetic_voice'; -- -> md5 c49e815f5aeab44d5ac5a780a21ac981
--   UPDATE t."5.3_content_format" SET platform_support = '{"youtube":true,"facebook":true}'::jsonb                                    WHERE ice_format_key='video_short_stat_voice';    -- -> md5 c49e815f5aeab44d5ac5a780a21ac981
--   UPDATE t."5.3_content_format" SET platform_support = '{"facebook":true,"linkedin":false,"instagram":true}'::jsonb                 WHERE ice_format_key='animated_text_reveal';      -- -> md5 aaae14e76ed4541359cf2b9e6cbfe122
--   UPDATE t."5.3_content_format" SET platform_support = '{"facebook":true,"linkedin":false,"instagram":true}'::jsonb                 WHERE ice_format_key='animated_data';             -- -> md5 aaae14e76ed4541359cf2b9e6cbfe122
--   UPDATE t."5.3_content_format" SET platform_support = '{"facebook":true,"linkedin":true,"instagram":true}'::jsonb                  WHERE ice_format_key='image_quote';               -- -> md5 f31ad6409a1985a7b700e10a659c8d80
--   UPDATE t."5.3_content_format" SET platform_support = '{"facebook":true,"linkedin":true,"instagram":true}'::jsonb                  WHERE ice_format_key='carousel';                  -- -> md5 f31ad6409a1985a7b700e10a659c8d80
-- ============================================================================
