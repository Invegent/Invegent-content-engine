-- cc-0091 A3-3 — mix-rewrite removal detector + class-elimination guard (FORWARD)
--
-- STATUS: NOT APPLIED. Authored under cc-0091 Gate A (brief v3, ISSUED 2026-08-08).
--         Gate A applies nothing and changes no live behaviour.
--
-- DEPENDS ON: NOT_APPLIED_cc0091_a3_1_format_capability_drop_surface_v1.sql
--             (m.format_capability_drop, with the detection_source discriminator).
--             A3-1 MUST be applied first. This file asserts that below and aborts if not.
-- ROLLBACK:   NOT_APPLIED_cc0091_a3_3_mix_rewrite_removal_detector_ROLLBACK_v1.sql
--
-- ─── Why this exists ──────────────────────────────────────────────────────────
-- A3-1 detects RUNTIME drops (carried a mix share, dropped by the grid). It structurally
-- CANNOT detect the cc-0079 Slice-2 incident, because a format deleted from
-- t.platform_format_mix_default never enters enabled_set — there is nothing left to drop.
-- That loss happens at AUTHORING time, upstream of every runtime guard. Instagram went
-- 35% video -> 0% and it went unnoticed for 14 days, surfaced only by an external report.
--
-- ─── Class axis: output_mime_type, NOT format_category ────────────────────────
-- ⚠ format_category is NULL for ALL SEVEN video formats (video_short_avatar,
--   video_short_kinetic, video_short_kinetic_voice, video_short_stat,
--   video_short_stat_voice, video_long_explainer, video_long_podcast_clip). Only a legacy
--   'video_short' key carries format_category='video'.
--   Building the class guard on format_category would make it BLIND to the exact class
--   that was eliminated — reproducing, inside the guard, the same "absent data silently
--   means nothing" defect A3 exists to fix.
--
-- output_mime_type IS fully populated and semantically exact:
--   video/mp4 (7) · image/png (carousel, image_quote) · image/gif (animated_*) ·
--   text/plain (text)
-- It is EXISTING data — no new taxonomy is introduced (PK constraint C1).
--
-- SEPARATE FINDING, surfaced not fixed here: format_category being NULL across the whole
-- video family is itself a data defect of the same class as the platform_support gaps.
-- It is not corrected by this migration.
--
-- ─── Honesty constraint encoded below ─────────────────────────────────────────
-- platform_support is read AT DETECTION TIME, not as it was at removal time. That column
-- has no history, so the value that actually drove a past rewrite is unrecoverable. The
-- output column is named platform_support_raw_now and the writer records
-- classifier_error='platform_support_read_at_detection_time_not_removal_time' so no
-- reader can mistake a post-hoc read for the historical cause. After A1 is applied these
-- values WILL differ from what drove the 2026-07-25 rewrite — by design, and that must
-- not be misread as evidence about the past.
--
-- public.classify_format_capability is CLIENT-SCOPED and a mix rewrite is PLATFORM-level,
-- so the classifier is NOT applicable here and its columns are left NULL rather than
-- populated with a fabricated client. This is why m.format_capability_drop permits NULL
-- classifier columns and enforces client_id IS NULL for detection_source='mix_rewrite'.

BEGIN;

-- Hard dependency assertion — fail closed rather than create a detector with nowhere to write.
DO $$
BEGIN
  IF to_regclass('m.format_capability_drop') IS NULL THEN
    RAISE EXCEPTION 'cc-0091 A3-3 ABORT: m.format_capability_drop does not exist — apply A3-1 first';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='m' AND table_name='format_capability_drop'
       AND column_name='detection_source'
  ) THEN
    RAISE EXCEPTION 'cc-0091 A3-3 ABORT: m.format_capability_drop lacks detection_source — apply the AMENDED A3-1';
  END IF;
END $$;

-- ── 1. Detector — STABLE, writes nothing ─────────────────────────────────────
CREATE OR REPLACE FUNCTION m.detect_mix_rewrite_removals(p_platform text DEFAULT NULL)
RETURNS TABLE(
  platform                      text,
  requested_format              text,
  removed_share_pct             numeric,
  prior_effective_from          date,
  current_effective_from        date,
  output_mime_type              text,
  render_engine                 text,
  platform_support_raw_now      text,
  platform_support_key_present  boolean,
  class_share_before            numeric,
  class_share_after             numeric,
  class_eliminated              boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH cur AS (
    SELECT d.platform, d.ice_format_key, d.default_share_pct, d.effective_from
      FROM t.platform_format_mix_default d
     WHERE d.is_current = true
       AND (p_platform IS NULL OR d.platform = p_platform)
  ),
  -- Prior generation = the most recent SUPERSEDED generation on that platform.
  prior_gen AS (
    SELECT d.platform, max(d.effective_from) AS gen_from
      FROM t.platform_format_mix_default d
     WHERE d.is_current = false
       AND (p_platform IS NULL OR d.platform = p_platform)
     GROUP BY d.platform
  ),
  prior AS (
    SELECT d.platform, d.ice_format_key, d.default_share_pct, d.effective_from
      FROM t.platform_format_mix_default d
      JOIN prior_gen g ON g.platform = d.platform AND g.gen_from = d.effective_from
     WHERE d.is_current = false
  ),
  -- Class totals per platform per mime type, before and after.
  class_before AS (
    SELECT p.platform, f.output_mime_type, sum(p.default_share_pct) AS share_before
      FROM prior p
      JOIN t."5.3_content_format" f ON f.ice_format_key = p.ice_format_key
     GROUP BY p.platform, f.output_mime_type
  ),
  class_after AS (
    SELECT c.platform, f.output_mime_type, sum(c.default_share_pct) AS share_after
      FROM cur c
      JOIN t."5.3_content_format" f ON f.ice_format_key = c.ice_format_key
     GROUP BY c.platform, f.output_mime_type
  ),
  removed AS (
    SELECT p.platform, p.ice_format_key, p.default_share_pct, p.effective_from
      FROM prior p
     WHERE NOT EXISTS (
       SELECT 1 FROM cur c
        WHERE c.platform = p.platform AND c.ice_format_key = p.ice_format_key)
  )
  SELECT
    r.platform,
    r.ice_format_key,
    r.default_share_pct,
    r.effective_from,
    (SELECT min(c.effective_from) FROM cur c WHERE c.platform = r.platform),
    f.output_mime_type,
    f.render_engine,
    (f.platform_support ->> r.platform),
    COALESCE(f.platform_support ? r.platform, false),
    COALESCE(cb.share_before, 0),
    COALESCE(ca.share_after, 0),
    (COALESCE(cb.share_before, 0) > 0 AND COALESCE(ca.share_after, 0) = 0)
  FROM removed r
  JOIN t."5.3_content_format" f ON f.ice_format_key = r.ice_format_key
  LEFT JOIN class_before cb ON cb.platform = r.platform AND cb.output_mime_type = f.output_mime_type
  LEFT JOIN class_after  ca ON ca.platform = r.platform AND ca.output_mime_type = f.output_mime_type
  ORDER BY r.platform, r.ice_format_key;
$function$;

COMMENT ON FUNCTION m.detect_mix_rewrite_removals(text) IS
  'cc-0091 A3-3. Formats that held a share in the most recent SUPERSEDED generation of '
  't.platform_format_mix_default but are absent from the current generation — i.e. removed '
  'by an authoring-time mix rewrite, which A3-1''s runtime detector structurally cannot see. '
  'class_eliminated flags a rewrite that took an entire output_mime_type class from '
  'non-zero to zero on a platform. Class axis is output_mime_type because format_category '
  'is NULL for every video format. platform_support_raw_now is read AT DETECTION TIME — '
  'that column has no history, so it is NOT the value that drove a past rewrite. STABLE.';

-- ── 2. Writer — VOLATILE; Gate B owns the call site ──────────────────────────
CREATE OR REPLACE FUNCTION m.record_mix_rewrite_removals(p_platform text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE v_n integer;
BEGIN
  INSERT INTO m.format_capability_drop (
    detection_source, week_start, client_id, client_slug, platform,
    requested_format, requested_share_pct,
    capability_status, reason_code, routed_lane, classifier_evidence, classifier_error,
    platform_support_raw, platform_support_key_present,
    -- M1 FIX: persist the class-elimination facts AS AT DETECTION TIME so the operator
    -- view can be a pure table projection (owner-rights) instead of calling this
    -- SECURITY INVOKER function, which ice_readonly cannot execute against schema t.
    prior_effective_from, output_mime_type,
    class_share_before, class_share_after, class_eliminated
  )
  SELECT
    'mix_rewrite',
    NULL, NULL, NULL,                       -- platform-level: no client scope (ck_fcd_client_scope)
    d.platform,
    d.requested_format,
    d.removed_share_pct,
    NULL, NULL, NULL, NULL,                 -- classifier is client-scoped; NOT applicable here
    'platform_support_read_at_detection_time_not_removal_time',
    d.platform_support_raw_now,
    d.platform_support_key_present,
    d.prior_effective_from, d.output_mime_type,
    d.class_share_before, d.class_share_after, d.class_eliminated
  FROM m.detect_mix_rewrite_removals(p_platform) d
  ON CONFLICT DO NOTHING;   -- S4: the prior generation is STATIC, so a nightly call site
                            -- would otherwise re-record the same removals every night.
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$function$;

COMMENT ON FUNCTION m.record_mix_rewrite_removals(text) IS
  'cc-0091 A3-3. Persists m.detect_mix_rewrite_removals output into m.format_capability_drop '
  'with detection_source=''mix_rewrite'' and client_id NULL. Classifier columns are '
  'deliberately NULL (client-scoped classifier, platform-level event) rather than fabricated. '
  'NOT wired to any trigger or cron — Gate B owns the call site.';

-- ── 3. Class-elimination alarm view ──────────────────────────────────────────
-- "This is BIG — confirm it", never "this is wrong". On the 2026-07-25 data this fires
-- for instagram AND facebook; facebook is a CORRECT elimination (its publisher has no
-- video path) and a human confirms it. Surfacing both is the point.
CREATE OR REPLACE VIEW ice_ro.mix_rewrite_class_elimination AS
SELECT platform,
       output_mime_type,
       min(prior_effective_from)   AS removed_from_generation,
       min(observed_at)            AS first_observed_at,
       max(class_share_before)     AS class_share_before,
       max(class_share_after)      AS class_share_after,
       count(*)                    AS formats_removed,
       array_agg(requested_format ORDER BY requested_format) AS removed_formats,
       sum(requested_share_pct)    AS total_share_removed
  FROM m.format_capability_drop
 WHERE detection_source = 'mix_rewrite'
   AND class_eliminated
 GROUP BY platform, output_mime_type;

COMMENT ON VIEW ice_ro.mix_rewrite_class_elimination IS
  'cc-0091 A3-3. Platforms where an authoring-time mix rewrite took an entire '
  'output_mime_type class from non-zero share to zero. Advisory: it means "this is large, '
  'confirm it was intended", NOT "this is an error". A correct elimination (e.g. facebook '
  'video, which its publisher genuinely cannot post) is expected to appear here. '
  'M1 FIX: this is a PURE PROJECTION over m.format_capability_drop (owner-rights, readable '
  'by ice_readonly), NOT a call to m.detect_mix_rewrite_removals. CONSEQUENCE, stated '
  'plainly: it shows what the writer has PERSISTED, not live truth — it is empty until '
  'm.record_mix_rewrite_removals() has run, and its figures are as-at detection time.';

REVOKE ALL ON ice_ro.mix_rewrite_class_elimination FROM PUBLIC;
REVOKE ALL ON ice_ro.mix_rewrite_class_elimination FROM anon;
REVOKE ALL ON ice_ro.mix_rewrite_class_elimination FROM authenticated;
GRANT SELECT ON ice_ro.mix_rewrite_class_elimination TO ice_readonly;

COMMIT;

-- ── POST-APPLY VERIFICATION (behaviour-inertness + expected content) ─────────
-- 1. Detector is read-only; the evidence table gains nothing by calling it:
--    SELECT count(*) FROM m.format_capability_drop;                    -- record it
--    SELECT * FROM m.detect_mix_rewrite_removals(NULL) ORDER BY platform, requested_format;
--    SELECT count(*) FROM m.format_capability_drop;                    -- UNCHANGED
--
-- 2. EXPECTED detector output — VERIFIED read-only against live data 2026-08-08.
--    10 removals across 3 platforms (youtube has no superseded generation, so none):
--      facebook  animated_text_reveal       5   image/gif   class 5 -> 0     ELIMINATED
--      facebook  video_short_kinetic       10   video/mp4   class 20 -> 0    ELIMINATED
--      facebook  video_short_kinetic_voice 10   video/mp4   class 20 -> 0    ELIMINATED
--      instagram animated_data             10   image/gif   class 15 -> 0    ELIMINATED
--      instagram animated_text_reveal       5   image/gif   class 15 -> 0    ELIMINATED
--      instagram video_short_kinetic       20   video/mp4   class 35 -> 0    ELIMINATED
--      instagram video_short_stat_voice    15   video/mp4   class 35 -> 0    ELIMINATED
--      linkedin  carousel                  40   image/png   class 55 -> 42.86  NOT eliminated
--      linkedin  video_short_kinetic       15   video/mp4   class 25 -> 0    ELIMINATED
--      linkedin  video_short_stat_voice    10   video/mp4   class 25 -> 0    ELIMINATED
--
--    Note video_short_stat_voice returns platform_support_raw_now = NULL with
--    key_present = false on BOTH instagram and linkedin — the absent-key case, correctly
--    distinguished from an explicit 'false'.
--
-- 3. EXPECTED class-elimination alarm: video/mp4 on facebook + instagram + linkedin;
--    image/gif on facebook + instagram. FIVE rows.
--
--    THE GUARD DOES NOT CRY WOLF — verified: LinkedIn's carousel removal (40 pct, the
--    single largest removal in the whole rewrite) is correctly NOT flagged, because
--    image/png still holds 42.86 via image_quote. A class SWAP within a surviving class
--    is not a class elimination. Only genuine zeroings surface.
--
--    Facebook video/mp4 IS expected here and is a CORRECT elimination (its publisher has
--    no video path). Its presence is the guard working as designed, not a false positive:
--    the alarm means "this is large, confirm it was intended".
--
--    ⚠ M1 FIX CHANGED THIS VIEW'S SEMANTICS. It is now a PURE PROJECTION over
--    m.format_capability_drop, so it is EMPTY until m.record_mix_rewrite_removals() has
--    run. Verify in that order:
--      SELECT m.record_mix_rewrite_removals(NULL);          -- expect 10
--      SELECT * FROM ice_ro.mix_rewrite_class_elimination
--       ORDER BY platform, output_mime_type;                -- expect 5 rows
--      SELECT m.record_mix_rewrite_removals(NULL);          -- expect 0 (S4 dedupe)
--    A read of the view BEFORE the writer returns zero rows and that is CORRECT, not a
--    detector failure — use m.detect_mix_rewrite_removals(NULL) for live truth.
--
-- 4. No call site was created:
--    SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--     WHERE p.proname <> 'record_mix_rewrite_removals'
--       AND pg_get_functiondef(p.oid) ILIKE '%record_mix_rewrite_removals%';   -- expect 0
