-- ============================================================================================
-- LANE 5 — select_music deterministic seed rotation — ROLLBACK
-- ============================================================================================
-- STATUS: AUTHORED / FROZEN FOR REVIEW. **NOT APPLIED, NOT YET PROVEN.** T3.
--
-- ⚠ DOES NOT LIVE IN supabase/migrations/ — deliberately. A rollback script inside the migration
--   discovery path is the highest-priority instance of the risk PK closed under R1: a `db push`
--   could sweep it up and silently REVERT a live production function. It stays here.
--
-- MIGRATION IDENTITY (if applied as a migration): select_music_v3_seed_rotation_rollback
--
-- CHANNEL: apply_migration. No BEGIN/COMMIT of its own — see the FORWARD header for why.
--
-- WHAT IT DOES: restores the EXACT 4-arg v2 function (ledger 20260710115043,
--   select_music_require_content_id_safe) and drops the 5-arg seeded one. Atomic replacement in
--   the same shape as the FORWARD, in the opposite direction.
--
-- APPLY/ROLLBACK IDENTITY: the body below is transcribed from
--   supabase/migrations/20260710115043_select_music_require_content_id_safe.sql:71-121 — the
--   definition that is live today. Verify before apply with:
--     SELECT md5(pg_get_functiondef(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--      WHERE n.nspname='public' AND p.proname='select_music';
--   Expected pre-FORWARD value, captured live 2026-08-07: 61a18d15e9f49830bd257265e8c5ffbe
--   If that md5 does not match before the FORWARD is applied, THIS ROLLBACK IS STALE — stop.
--
-- EFFECT OF APPLYING: selection returns to one permanent deterministic winner (the quietest
--   eligible track). Eligibility is unchanged in both directions — this rollback restores
--   SELECTION behaviour only. No fence, no approval, no content_id_safe value is touched.
-- ============================================================================================

-- ── (0) PRE-GUARD: exactly the 5-arg seeded function must exist, and no 4-arg one ────────────
DO $$
DECLARE v_5arg bigint; v_4arg bigint;
BEGIN
  SELECT count(*) INTO v_5arg FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname='select_music'
     AND pg_get_function_identity_arguments(p.oid)
         = 'p_scope_kind text, p_scope_value text, p_min_duration_seconds numeric, p_mood text, p_seed text';
  IF v_5arg <> 1 THEN
    RAISE EXCEPTION 'L5 ROLLBACK PRE FAIL: expected exactly 1 seeded 5-arg select_music, found %', v_5arg;
  END IF;

  SELECT count(*) INTO v_4arg FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname='select_music'
     AND pg_get_function_identity_arguments(p.oid)
         = 'p_scope_kind text, p_scope_value text, p_min_duration_seconds numeric, p_mood text';
  IF v_4arg <> 0 THEN
    RAISE EXCEPTION 'L5 ROLLBACK PRE FAIL: a 4-arg select_music already exists (%)', v_4arg;
  END IF;
END $$;

-- ── (1) BASELINE CAPTURE — before any DDL ────────────────────────────────────────────────────
CREATE TEMP TABLE _l5_rb_baseline ON COMMIT DROP AS
  SELECT track_key FROM public.select_music('format', 'video_short_stat', 12, NULL, NULL);

-- ── (2) ATOMIC REPLACEMENT, REVERSE DIRECTION ────────────────────────────────────────────────
DROP FUNCTION public.select_music(text, text, numeric, text, text);

CREATE FUNCTION public.select_music(
  p_scope_kind           text,
  p_scope_value          text,
  p_min_duration_seconds numeric DEFAULT 12,
  p_mood                 text    DEFAULT NULL
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
    t.track_id,
    t.track_key,
    t.title,
    t.mood,
    t.duration_seconds,
    t.loudness_lufs,
    t.storage_bucket,
    t.storage_path          -- RAW, already bucket-prefixed.
  FROM m.music_track t
  JOIN m.music_license l
    ON l.track_id = t.track_id
   AND l.commercial_use_allowed IS TRUE
   AND l.social_use_allowed     IS TRUE
   AND l.content_id_safe        IS TRUE
  WHERE
        t.is_active              IS TRUE
    AND t.approved               IS TRUE
    AND t.production_use_allowed IS TRUE
    AND t.approval_status         = 'approved_scoped'
    AND t.duration_seconds >= p_min_duration_seconds
    AND (p_mood IS NULL OR t.mood = p_mood)
    AND EXISTS (
      SELECT 1
        FROM m.music_review_event e
       WHERE e.track_id    = t.track_id
         AND e.event_kind  = 'scoped_approval'
         AND e.scope_kind  = p_scope_kind
         AND e.scope_value = p_scope_value
    )
    AND NOT EXISTS (
      SELECT 1
        FROM m.music_review_event r
       WHERE r.track_id   = t.track_id
         AND r.event_kind IN ('revocation', 'restriction', 'rejection')
         AND r.occurred_at >= (
           SELECT max(a.occurred_at)
             FROM m.music_review_event a
            WHERE a.track_id    = t.track_id
              AND a.event_kind  = 'scoped_approval'
              AND a.scope_kind  = p_scope_kind
              AND a.scope_value = p_scope_value
         )
    )
  ORDER BY t.loudness_lufs NULLS LAST, t.duration_seconds DESC, t.track_key
  LIMIT 1;
$function$;

COMMENT ON FUNCTION public.select_music(text,text,numeric,text) IS
  'Governed music-bed selector (cc-0032; content_id_safe required as of 20260710094353). Returns AT MOST '
  'ONE row; ZERO ROWS means no eligible track — that is the "null" and is NOT an error. Caller renders '
  'VO-only by sending MusicBed.source='''' and NEVER omitting the key (omission plays any template baked '
  'default). Eligibility = 4 fences (approval_status=''approved_scoped'') AND licence permits commercial '
  'AND social use AND is content_id_safe AND an un-revoked scoped_approval for '
  '(p_scope_kind,p_scope_value) AND duration >= p_min_duration_seconds. storage_path is RAW and ALREADY '
  'bucket-prefixed. NOTE: scope is per-FORMAT, not per-PLATFORM; content_id_safe is the stop-gap for '
  'YouTube exposure until per-platform scoping lands.';

-- ── (3) ACL RESTORATION — load-bearing here too (this is also a fresh CREATE) ─────────────────
REVOKE ALL ON FUNCTION public.select_music(text,text,numeric,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.select_music(text,text,numeric,text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_music(text,text,numeric,text) TO service_role;

-- ── (4) IN-TRANSACTION POST-ASSERTS ──────────────────────────────────────────────────────────
DO $$
DECLARE
  v_overloads bigint;
  v_before    text;
  v_after     text;
BEGIN
  SELECT count(*) INTO v_overloads
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname='select_music';
  IF v_overloads <> 1 THEN
    RAISE EXCEPTION 'L5 ROLLBACK POST FAIL: expected exactly 1 select_music overload, found %', v_overloads;
  END IF;

  IF has_function_privilege('anon','public.select_music(text,text,numeric,text)','EXECUTE') THEN
    RAISE EXCEPTION 'L5 ROLLBACK POST FAIL: anon retains EXECUTE';
  END IF;
  IF has_function_privilege('authenticated','public.select_music(text,text,numeric,text)','EXECUTE') THEN
    RAISE EXCEPTION 'L5 ROLLBACK POST FAIL: authenticated retains EXECUTE';
  END IF;
  IF NOT has_function_privilege('service_role','public.select_music(text,text,numeric,text)','EXECUTE') THEN
    RAISE EXCEPTION 'L5 ROLLBACK POST FAIL: service_role lacks EXECUTE';
  END IF;

  -- Selection must be unchanged across the rollback for the SEEDLESS call: the 5-arg function at
  -- p_seed IS NULL picks index 0 of the ranked candidate set, and the 4-arg picks rank 1 of the
  -- eligible set. These coincide whenever cooldown is inert (|E| = 1). At |E| > 1 they may
  -- legitimately DIFFER — cooldown may have excluded the rank-1 track. This assert is therefore
  -- conditional on a single-track pool and is NOT a general invariant.
  SELECT track_key INTO v_before FROM _l5_rb_baseline;
  SELECT track_key INTO v_after
    FROM public.select_music('format','video_short_stat', 12, NULL);

  IF (SELECT count(*) FROM public.select_music('format','video_short_stat',12,NULL)) > 1 THEN
    RAISE EXCEPTION 'L5 ROLLBACK POST FAIL: restored function returned more than one row';
  END IF;

  RAISE NOTICE 'L5 ROLLBACK OK: v2 4-arg restored, 1 overload, ACLs locked. seedless pick % -> % (may differ legitimately when |E|>1).',
    coalesce(v_before,'<none>'), coalesce(v_after,'<none>');
END $$;

-- ============================================================================================
-- MUST BE PROVEN BEFORE THE FORWARD IS APPLIED (cc-0039 zero-persist pattern):
--   run FORWARD then ROLLBACK inside a single aborting transaction against live, surfacing
--   before/after state via RAISE, and confirm live state is untouched afterwards.
--   Not yet performed — see the brief's STOP conditions.
-- ============================================================================================
