-- =====================================================================================
-- ***  NOT_APPLIED / SUPERSEDED  — RETIRED FROM THE MIGRATION DISCOVERY PATH  ***
-- =====================================================================================
-- PK RULING R1, 2026-08-07: retire this draft. The SEED DESIGN owns the 5-arg signature.
-- This file is retained for PROVENANCE ONLY. It was never applied and must never be applied.
--
--   Original path      : supabase/migrations/20260711003222_select_music_per_platform_scope.sql
--   Original state     : UNTRACKED in git (never committed, never in the applied ledger)
--   Status             : NOT_APPLIED · SUPERSEDED
--   Superseded by      : the select_music seed-rotation design (Lane 5) — 5-arg seeded function
--                        applied as a single-transaction atomic replacement (PK ruling R5)
--   Retired on         : 2026-08-07 Sydney
--
-- VERIFIED AT RETIREMENT (live, read-only):
--   public.select_music        = 4-arg  (p_scope_kind, p_scope_value, p_min_duration_seconds, p_mood)
--                                SECURITY DEFINER, STABLE, def md5 61a18d15e9f49830bd257265e8c5ffbe
--   public.record_music_usage  = 6-arg, SECURITY DEFINER
--   => exactly ONE select_music overload exists live; this 5-arg draft is confirmed UNAPPLIED.
--
-- WHY IT WAS RETIRED, not deleted: it is the only written record of the cc-0038 per-platform
-- approval-scope reasoning (platform-conditional content_id_safe allowlist; the composed
-- format+platform scope; the pg_default_acl CREATE-vs-REPLACE trap that makes REVOKE FROM
-- anon, authenticated load-bearing). The seed design must not silently lose those findings.
--
-- ⚠ DO NOT move this file back under supabase/migrations/. Its presence there put an unapplied,
--    untracked 5-arg DROP+CREATE in the migration discovery path alongside a live 4-arg function.
-- =====================================================================================

-- 20260711003222_select_music_per_platform_scope
--
-- cc-0038 · T3 · SAFETY_GATE. Replaces the GLOBAL content_id_safe gate (ledger 20260710115043) with a
-- PLATFORM-CONDITIONAL one, and COMPOSES a per-platform approval scope on top of the per-format scope.
--
-- WHY. Music approval is per-FORMAT; publishing is per-PLATFORM. The global content_id_safe stop-gap
-- excludes every CC0 track on every platform (0 eligible library-wide), which is over-broad: YouTube runs
-- Content-ID, Facebook/LinkedIn do not. This migration lets CC0 beds play where their licence permits and
-- keeps YouTube bed-less until a Content-ID-safe track exists.
--
-- SIGNATURE CHANGE (D2): adds p_platform text DEFAULT NULL. That makes a NEW 5-arg signature, so this is a
-- DROP + CREATE, not a CREATE OR REPLACE. Consequence, per the cc-0032/pg_default_acl lesson: a freshly
-- CREATED function is born EXECUTE-able by anon+authenticated (default ACL applies on CREATE, not REPLACE),
-- and REVOKE FROM PUBLIC does not clear it. Here the explicit REVOKE FROM anon, authenticated is therefore
-- LOAD-BEARING, not belt-and-braces. The in-transaction ACL post-assert makes a leak abort the migration.
--
-- The deployed video-worker v3.7.0 calls select_music('format','video_short_stat') with TWO positional args.
-- Against the new 5-arg function that binds p_min_duration_seconds/p_mood/p_platform to their DEFAULTs, so
-- p_platform = NULL. NULL platform is FAIL-CLOSED (see below): it returns 0 rows, identical to today. The
-- worker only starts binding beds once it is updated to pass draft.platform (separate step). Apply order is
-- therefore free: applying this before the worker update changes nothing the worker does.
--
-- PLATFORM-CONDITIONAL content_id_safe (fail-closed by allowlist): content_id_safe IS required UNLESS the
-- platform is explicitly one with no Content-ID equivalent. Allowlist = {facebook, linkedin, instagram}.
-- Anything else — youtube, an unrecognised value, or NULL — requires content_id_safe (strictest).
--
-- COMPOSED SCOPE (D1): eligibility now requires an un-revoked scoped_approval for the FORMAT
-- (p_scope_kind/p_scope_value) AND an un-revoked scoped_approval for the PLATFORM
-- (scope_kind='platform', scope_value=p_platform). Every currently-approved track becomes INELIGIBLE until
-- PK grants a platform approval — fail-closed by construction, no silent widening.
--
-- ⚠ CENTRAL RISK (cc-0038 §6, named per PK ruling): relaxing content_id_safe for facebook/linkedin is safe
-- ONLY because a non-youtube draft cannot reach YouTube. That guarantee lives in youtube-publisher's
-- .eq('platform','youtube') filter (application code in a DIFFERENT edge function; v1.12.0+, deployed
-- v1.13.0) and in NOTHING in this database. If that filter is reverted, a facebook-scoped bed reaches
-- YouTube AND the governance record asserts it was approved. A monitor (cc-0038 §6, own T2 sub-step)
-- detects a breach; there is no DB constraint that prevents it. Rollback re-globalises content_id_safe.
--
-- Rollback: _harness/music_ratify_v0/rollback_20260711003222.sql (validated before apply). It restores the
-- 4-arg global-content_id_safe function and DROPs this 5-arg one.

BEGIN;

-- Pre-guard: exactly the current 4-arg select_music must exist, and no 5-arg one yet.
DO $$
DECLARE v_4arg bigint; v_5arg bigint;
BEGIN
  SELECT count(*) INTO v_4arg FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='select_music'
     AND pg_get_function_identity_arguments(p.oid)='p_scope_kind text, p_scope_value text, p_min_duration_seconds numeric, p_mood text';
  IF v_4arg <> 1 THEN
    RAISE EXCEPTION 'PRE FAIL: expected exactly 1 existing 4-arg select_music, found %', v_4arg;
  END IF;
  SELECT count(*) INTO v_5arg FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='select_music'
     AND pg_get_function_identity_arguments(p.oid) LIKE '%p_platform text';
  IF v_5arg <> 0 THEN
    RAISE EXCEPTION 'PRE FAIL: a 5-arg select_music already exists (%)', v_5arg;
  END IF;
END $$;

DROP FUNCTION public.select_music(text,text,numeric,text);

CREATE FUNCTION public.select_music(
  p_scope_kind           text,
  p_scope_value          text,
  p_min_duration_seconds numeric DEFAULT 12,
  p_mood                 text    DEFAULT NULL,
  p_platform             text    DEFAULT NULL
)
RETURNS TABLE (
  track_id         uuid,
  track_key        text,
  title            text,
  mood             text,
  duration_seconds numeric,
  loudness_lufs    numeric,
  storage_bucket   text,
  storage_path     text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    t.track_id, t.track_key, t.title, t.mood, t.duration_seconds, t.loudness_lufs,
    t.storage_bucket, t.storage_path
  FROM m.music_track t
  JOIN m.music_license l
    ON l.track_id = t.track_id
   AND l.commercial_use_allowed IS TRUE
   AND l.social_use_allowed     IS TRUE
   -- platform-conditional Content-ID safety. content_id_safe is REQUIRED unless the target platform is
   -- explicitly one with no Content-ID equivalent. NULL / youtube / unknown => strict (require it).
   AND ( l.content_id_safe IS TRUE
         OR p_platform = ANY (ARRAY['facebook','linkedin','instagram']) )
  WHERE
        t.is_active              IS TRUE
    AND t.approved               IS TRUE
    AND t.production_use_allowed IS TRUE
    AND t.approval_status         = 'approved_scoped'
    AND t.duration_seconds >= p_min_duration_seconds
    AND (p_mood IS NULL OR t.mood = p_mood)
    -- FORMAT scope: un-revoked scoped_approval for (p_scope_kind, p_scope_value)
    AND EXISTS (
      SELECT 1 FROM m.music_review_event e
       WHERE e.track_id = t.track_id AND e.event_kind='scoped_approval'
         AND e.scope_kind = p_scope_kind AND e.scope_value = p_scope_value
    )
    AND NOT EXISTS (
      SELECT 1 FROM m.music_review_event r
       WHERE r.track_id = t.track_id AND r.event_kind IN ('revocation','restriction','rejection')
         AND r.occurred_at >= (
           SELECT max(a.occurred_at) FROM m.music_review_event a
            WHERE a.track_id=t.track_id AND a.event_kind='scoped_approval'
              AND a.scope_kind=p_scope_kind AND a.scope_value=p_scope_value )
    )
    -- PLATFORM scope (D1 compose): un-revoked scoped_approval for (platform, p_platform). A NULL p_platform
    -- cannot match scope_value, so NULL platform yields 0 rows — fail-closed independent of the licence gate.
    AND EXISTS (
      SELECT 1 FROM m.music_review_event e
       WHERE e.track_id = t.track_id AND e.event_kind='scoped_approval'
         AND e.scope_kind = 'platform' AND e.scope_value = p_platform
    )
    AND NOT EXISTS (
      SELECT 1 FROM m.music_review_event r
       WHERE r.track_id = t.track_id AND r.event_kind IN ('revocation','restriction','rejection')
         AND r.occurred_at >= (
           SELECT max(a.occurred_at) FROM m.music_review_event a
            WHERE a.track_id=t.track_id AND a.event_kind='scoped_approval'
              AND a.scope_kind='platform' AND a.scope_value=p_platform )
    )
  ORDER BY t.loudness_lufs NULLS LAST, t.duration_seconds DESC, t.track_key
  LIMIT 1;
$function$;

COMMENT ON FUNCTION public.select_music(text,text,numeric,text,text) IS
  'Governed music-bed selector (cc-0038: per-platform scope). Returns AT MOST ONE row; ZERO ROWS = no '
  'eligible track (the "null", not an error). Eligibility = 4 fences (approval_status=''approved_scoped'') '
  'AND commercial+social licence AND un-revoked scoped_approval for BOTH (p_scope_kind,p_scope_value) '
  '[format] AND (platform,p_platform) AND duration AND mood AND content_id_safe UNLESS p_platform IN '
  '(facebook,linkedin,instagram). NULL/youtube/unknown platform => content_id_safe required AND (for NULL) '
  'no platform scope can match => 0 rows (fail-closed). storage_path is RAW/bucket-prefixed. RISK: the '
  'content_id_safe relaxation is safe only while youtube-publisher''s platform filter holds (no DB '
  'constraint enforces it — see cc-0038 §6).';

-- LOAD-BEARING (DROP+CREATE re-applies default ACL): lock to service_role.
REVOKE ALL ON FUNCTION public.select_music(text,text,numeric,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.select_music(text,text,numeric,text,text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_music(text,text,numeric,text,text) TO service_role;

DO $$
BEGIN
  IF has_function_privilege('anon','public.select_music(text,text,numeric,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'POST FAIL: anon retains EXECUTE'; END IF;
  IF has_function_privilege('authenticated','public.select_music(text,text,numeric,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'POST FAIL: authenticated retains EXECUTE'; END IF;
  IF NOT has_function_privilege('service_role','public.select_music(text,text,numeric,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'POST FAIL: service_role lacks EXECUTE'; END IF;
  -- exactly one select_music overload survives (the new 5-arg); the old 4-arg is gone.
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='select_music') <> 1 THEN
    RAISE EXCEPTION 'POST FAIL: expected exactly 1 select_music overload after DROP+CREATE'; END IF;
  -- fail-closed proof at apply time: no platform grant exists yet, so every scope returns 0.
  IF (SELECT count(*) FROM public.select_music('format','video_short_stat',12,NULL,'facebook')) <> 0 THEN
    RAISE EXCEPTION 'POST FAIL: facebook returned rows before any platform grant exists'; END IF;
  IF (SELECT count(*) FROM public.select_music('format','video_short_stat',12,NULL,'youtube')) <> 0 THEN
    RAISE EXCEPTION 'POST FAIL: youtube returned rows (content_id_safe must exclude)'; END IF;
  IF (SELECT count(*) FROM public.select_music('format','video_short_stat')) <> 0 THEN
    RAISE EXCEPTION 'POST FAIL: NULL-platform (deployed-worker call) returned rows'; END IF;
  RAISE NOTICE 'OK: per-platform select_music installed; all scopes 0 until PK grants a platform approval.';
END $$;

COMMIT;
