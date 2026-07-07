-- ============================================================================
-- cc-0028 — LinkedIn image_quote media-publish enable: GFCP platform_support flip
-- ============================================================================
-- Flips t."5.3_content_format".platform_support for image_quote ONLY, setting
-- linkedin:true so the per-platform format resolver may resolve
-- (linkedin, image_quote) — now that linkedin-zapier-publisher v1.3.0 has a real
-- single-image media-publish path (cc-0028, image_quote-first v0).
--
-- IMAGE_QUOTE ONLY. This migration touches NO other row. Carousel stays
-- linkedin:false (deferred pending a separate Zapier ordered-slide lane); every
-- video_* / animated_* row is untouched and stays hard-blocked. Do NOT read this
-- as broad platform expansion.
--
-- Baseline: post-Stage0 (20260615110000) image_quote = linkedin:false. This flips
-- linkedin:false -> linkedin:true for image_quote alone.
--
-- Pre/post verification with self-abort on hash mismatch (extends the
-- 20260615110000 pattern): the pre-flight asserts the live baseline md5 and the
-- post-check asserts the planned end-state md5; either mismatch RAISEs (pre-flight
-- writes nothing; post-check rolls back the migration). md5 = md5(platform_support::text),
-- computed live in-DB this session against project mbkmaxqhsohbtwsqolns.
--
-- Rollback: restore image_quote to linkedin:false (see commented footer).
-- ============================================================================

-- ---- Pre-flight: assert the live baseline for image_quote; abort with NO writes on drift.
DO $guard$
DECLARE
  v_expected text := 'aaae14e76ed4541359cf2b9e6cbfe122';  -- {"facebook":true,"linkedin":false,"instagram":true}
  v_now text;
BEGIN
  SELECT md5(platform_support::text) INTO v_now
    FROM t."5.3_content_format" WHERE ice_format_key = 'image_quote';
  IF v_now IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'cc-0028 ABORT: image_quote baseline drift; expected %, found % — re-observe before applying',
      v_expected, COALESCE(v_now, '(missing)');
  END IF;
END
$guard$;

-- ---- Apply: image_quote linkedin:true. Deterministic full-object SET (not a merge).
UPDATE t."5.3_content_format" SET platform_support =
  '{"facebook":true,"linkedin":true,"instagram":true}'::jsonb
  WHERE ice_format_key = 'image_quote';

-- ---- Post-check: assert image_quote is at the planned end-state; abort (rolls back) on mismatch.
DO $verify$
DECLARE
  v_planned text := 'f31ad6409a1985a7b700e10a659c8d80';  -- {"facebook":true,"linkedin":true,"instagram":true}
  v_now text;
BEGIN
  SELECT md5(platform_support::text) INTO v_now
    FROM t."5.3_content_format" WHERE ice_format_key = 'image_quote';
  IF v_now IS DISTINCT FROM v_planned THEN
    RAISE EXCEPTION 'cc-0028 POST-CHECK FAILED: image_quote not at planned end-state; expected %, found %',
      v_planned, COALESCE(v_now, '(missing)');
  END IF;
END
$verify$;

-- ============================================================================
-- ROLLBACK (manual; forward-only convention). Restore the prior image_quote baseline:
--
--   UPDATE t."5.3_content_format" SET platform_support = '{"facebook":true,"linkedin":false,"instagram":true}'::jsonb WHERE ice_format_key='image_quote';  -- -> md5 aaae14e76ed4541359cf2b9e6cbfe122
-- ============================================================================
