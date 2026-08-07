-- ============================================================================================
-- LANE 5 — select_music deterministic seed rotation — FORWARD
-- ============================================================================================
-- STATUS: AUTHORED / FROZEN FOR REVIEW. **NOT APPLIED.** T3.
--
-- ⚠ THIS FILE DELIBERATELY DOES NOT LIVE IN supabase/migrations/.
--   Placing an unapplied DROP+CREATE of a live production function in the migration discovery
--   path is exactly the hygiene risk PK closed under R1 (the retired cc-0038 draft). It moves
--   there only at the moment of apply, or is applied directly via apply_migration from here.
--
-- MIGRATION IDENTITY (permanent name; apply_migration mints its own version at apply time):
--   name: select_music_v3_seed_rotation
--
-- CHANNEL — apply_migration, and this file therefore carries NO BEGIN/COMMIT.
--   apply_migration supplies its own transaction wrapper and mints the version. Adding our own
--   BEGIN/COMMIT would nest inside it (the standing batch-2 lesson). The temp table below relies
--   on that single enclosing transaction: it MUST execute as ONE call in ONE session. A split or
--   autocommitting channel would break the baseline capture — do not substitute a channel.
--
-- PK RULINGS IMPLEMENTED:
--   R5 — single-transaction ATOMIC REPLACEMENT of the 4-arg with the 5-arg. Never two overloads.
--        Intended ACLs explicitly re-established after CREATE, including removal of the default
--        execution grants a fresh CREATE confers.
--   R4 — bounded cooldown N = min(2, eligible_pool_size - 1). Zero eligible -> zero rows.
--        A non-empty eligible pool can never be emptied by cooldown.
--
-- WHAT DOES NOT CHANGE (the containment that makes this reviewable):
--   * every eligibility gate, verbatim: licence commercial/social, content_id_safe IS TRUE, the
--     four fences, approval_status='approved_scoped', duration, mood, the scoped_approval event
--     for (p_scope_kind,p_scope_value), and the un-revoked check;
--   * the RETURNS TABLE contract — 8 columns, identical names/types/order (mapSelectMusicRow and
--     the D3 invariant stay untouched);
--   * STABLE, SECURITY DEFINER, SET search_path TO '';
--   * zero rows means "no eligible track" and is NOT an error.
-- WHAT CHANGES: only HOW a winner is chosen from the eligible set.
-- ============================================================================================

-- ── (0) PRE-GUARD: the world must be what this migration was reviewed against ────────────────
DO $$
DECLARE v_4arg bigint; v_5arg bigint;
BEGIN
  SELECT count(*) INTO v_4arg FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname='select_music'
     AND pg_get_function_identity_arguments(p.oid)
         = 'p_scope_kind text, p_scope_value text, p_min_duration_seconds numeric, p_mood text';
  IF v_4arg <> 1 THEN
    RAISE EXCEPTION 'L5 PRE FAIL: expected exactly 1 existing 4-arg select_music, found %', v_4arg;
  END IF;

  SELECT count(*) INTO v_5arg FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname='select_music'
     AND pg_get_function_identity_arguments(p.oid) LIKE '%, p_seed text';
  IF v_5arg <> 0 THEN
    RAISE EXCEPTION 'L5 PRE FAIL: a 5-arg seeded select_music already exists (%)', v_5arg;
  END IF;
END $$;

-- ── (1) BASELINE CAPTURE — before any DDL. Proves behaviour-preservation at p_seed IS NULL. ──
CREATE TEMP TABLE _l5_baseline ON COMMIT DROP AS
  SELECT track_key FROM public.select_music('format', 'video_short_stat', 12, NULL);

-- ── (2) ATOMIC REPLACEMENT (R5) ──────────────────────────────────────────────────────────────
DROP FUNCTION public.select_music(text, text, numeric, text);

CREATE FUNCTION public.select_music(
  p_scope_kind           text,
  p_scope_value          text,
  p_min_duration_seconds numeric DEFAULT 12,
  p_mood                 text    DEFAULT NULL,
  p_seed                 text    DEFAULT NULL
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_eligible uuid[];
  v_recent   uuid[];
  v_cand     uuid[];
  v_n        integer;
  v_excl     integer;
  v_hash     bigint;
  v_bytes    bytea;
  v_idx      integer;
  v_pick     uuid;
BEGIN
  -- (a) ELIGIBLE SET E, ranked. PREDICATE VERBATIM from the 4-arg function (ledger 20260710115043).
  --     The rank key is retained unchanged — it no longer decides the winner, only array order.
  SELECT COALESCE(
           array_agg(t.track_id ORDER BY t.loudness_lufs NULLS LAST,
                                          t.duration_seconds DESC,
                                          t.track_key), '{}')
    INTO v_eligible
    FROM m.music_track t
    JOIN m.music_license l
      ON l.track_id = t.track_id
     AND l.commercial_use_allowed IS TRUE
     AND l.social_use_allowed     IS TRUE
     AND l.content_id_safe        IS TRUE
   WHERE t.is_active              IS TRUE
     AND t.approved               IS TRUE
     AND t.production_use_allowed IS TRUE
     AND t.approval_status         = 'approved_scoped'
     AND t.duration_seconds >= p_min_duration_seconds
     AND (p_mood IS NULL OR t.mood = p_mood)
     AND EXISTS (
       SELECT 1 FROM m.music_review_event e
        WHERE e.track_id    = t.track_id
          AND e.event_kind  = 'scoped_approval'
          AND e.scope_kind  = p_scope_kind
          AND e.scope_value = p_scope_value
     )
     AND NOT EXISTS (
       SELECT 1 FROM m.music_review_event r
        WHERE r.track_id   = t.track_id
          AND r.event_kind IN ('revocation', 'restriction', 'rejection')
          AND r.occurred_at >= (
            SELECT max(a.occurred_at) FROM m.music_review_event a
             WHERE a.track_id    = t.track_id
               AND a.event_kind  = 'scoped_approval'
               AND a.scope_kind  = p_scope_kind
               AND a.scope_value = p_scope_value
          )
     );

  v_n := COALESCE(array_length(v_eligible, 1), 0);

  -- (b) ZERO ELIGIBLE -> ZERO ROWS. Unchanged fail-closed contract (R4). Caller renders VO-only.
  IF v_n = 0 THEN
    RETURN;
  END IF;

  -- (c) COOLDOWN (R4): N = min(2, |E| - 1). The bound is the guarantee — at |E|=1, N=0.
  --     Applied ONLY for scope_kind='format', the sole scope any live caller queries; any other
  --     scope takes N=0 (conservative, deterministic) because usage rows are keyed by format.
  --     Recent set is restricted to E so the exclusion budget is never spent on ineligible tracks,
  --     which is what makes |C| >= |E| - N >= 1 hold by construction.
  --     Smoke renders (client_id IS NULL) are EXCLUDED — a smoke render must not consume a
  --     rotation slot. This mirrors the recorded resolve_slot_assets v1.5 decision and is a
  --     deliberate design choice, not a side effect.
  v_excl := LEAST(2, v_n - 1);

  IF v_excl > 0 AND p_scope_kind = 'format' THEN
    SELECT COALESCE(array_agg(x.track_id ORDER BY x.last_used DESC), '{}')
      INTO v_recent
      FROM (
        SELECT u.track_id, max(u.used_at) AS last_used
          FROM m.music_usage_event u
         WHERE u.client_id IS NOT NULL
           AND u.format    = p_scope_value
           AND u.track_id  = ANY (v_eligible)
         GROUP BY u.track_id
         ORDER BY max(u.used_at) DESC
         LIMIT v_excl
      ) x;
  ELSE
    v_recent := '{}';
  END IF;

  SELECT COALESCE(array_agg(e.tid ORDER BY e.ord), '{}')
    INTO v_cand
    FROM unnest(v_eligible) WITH ORDINALITY AS e(tid, ord)
   WHERE NOT (e.tid = ANY (v_recent));

  -- Belt-and-braces. Unreachable given the bound above; if it ever fires that is a defect signal,
  -- not normal operation. Fail SAFE (full eligible pool), never to zero rows.
  IF COALESCE(array_length(v_cand, 1), 0) = 0 THEN
    v_cand := v_eligible;
  END IF;

  -- (d) DETERMINISTIC SEED INDEX (R3) — FNV-1a 32-bit, verbatim from resolve_slot_assets v1.5.
  --     p_seed IS NULL -> index 0. Never random.
  IF p_seed IS NOT NULL THEN
    v_hash  := 2166136261;
    v_bytes := convert_to(p_seed, 'UTF8');
    FOR i IN 0 .. octet_length(v_bytes) - 1 LOOP
      v_hash := v_hash # get_byte(v_bytes, i)::bigint;
      v_hash := (v_hash * 16777619) % 4294967296;
    END LOOP;
    v_idx := (v_hash % COALESCE(array_length(v_cand, 1), 1))::int;
  ELSE
    v_idx := 0;
  END IF;

  -- ⚠ OFF-BY-ONE: the v1.5 precedent indexes a jsonb array (0-based). This is a PostgreSQL
  --    array (1-BASED), so the modulo result must be shifted by +1. Named because it is the
  --    single most likely transcription defect when mirroring that precedent.
  v_pick := v_cand[v_idx + 1];

  RETURN QUERY
    SELECT t.track_id, t.track_key, t.title, t.mood,
           t.duration_seconds, t.loudness_lufs, t.storage_bucket,
           t.storage_path            -- RAW, already bucket-prefixed. Do NOT double-prefix.
      FROM m.music_track t
     WHERE t.track_id = v_pick;
END;
$function$;

COMMENT ON FUNCTION public.select_music(text,text,numeric,text,text) IS
  'Governed music-bed selector v3 (Lane 5: deterministic seed rotation). Returns AT MOST ONE row; '
  'ZERO ROWS means no eligible track — that is the "null" and is NOT an error. Caller renders VO-only '
  'by sending MusicBed.source='''' and NEVER omitting the key. ELIGIBILITY IS UNCHANGED from v2: 4 '
  'fences (approval_status=''approved_scoped'') AND commercial+social licence AND content_id_safe AND '
  'an un-revoked scoped_approval for (p_scope_kind,p_scope_value) AND duration AND mood. SELECTION is '
  'new: the eligible set is ranked (loudness_lufs NULLS LAST, duration_seconds DESC, track_key), the '
  'N=min(2,|E|-1) most recently used tracks are excluded (format scope only; smoke renders with '
  'client_id NULL never consume a slot), and the winner is chosen by FNV-1a(p_seed) mod |candidates|. '
  'p_seed IS NULL => index 0 (deterministic, never random) so a caller that passes no seed behaves '
  'exactly as v2 did. Cooldown can NEVER empty a non-empty eligible pool. storage_path is RAW and '
  'ALREADY bucket-prefixed. NOTE: scope is per-FORMAT, not per-PLATFORM; per-platform scoping is the '
  'retired cc-0038 carry, not implemented here.';

-- ── (3) ACL RESTORATION (R5, PK-mandated) ────────────────────────────────────────────────────
-- LOAD-BEARING, NOT BELT-AND-BRACES. DROP+CREATE re-applies pg_default_acl: a freshly CREATED
-- public function is born EXECUTE-able by anon + authenticated, and REVOKE FROM PUBLIC alone does
-- NOT clear that. These three statements are the intended-ACL establishment PK required.
REVOKE ALL ON FUNCTION public.select_music(text,text,numeric,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.select_music(text,text,numeric,text,text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_music(text,text,numeric,text,text) TO service_role;

-- ── (4) IN-TRANSACTION POST-ASSERTS — any failure aborts the whole migration ─────────────────
DO $$
DECLARE
  v_overloads bigint;
  v_before    text;
  v_after     text;
  v_n_elig    bigint;
BEGIN
  -- 4.1 EXACTLY ONE overload. This is the R5 guarantee: the PGRST203 ambiguity window never opens.
  SELECT count(*) INTO v_overloads
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname='select_music';
  IF v_overloads <> 1 THEN
    RAISE EXCEPTION 'L5 POST FAIL: expected exactly 1 select_music overload, found %', v_overloads;
  END IF;

  -- 4.2 ACLs are as intended.
  IF has_function_privilege('anon','public.select_music(text,text,numeric,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'L5 POST FAIL: anon retains EXECUTE on select_music';
  END IF;
  IF has_function_privilege('authenticated','public.select_music(text,text,numeric,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'L5 POST FAIL: authenticated retains EXECUTE on select_music';
  END IF;
  IF NOT has_function_privilege('service_role','public.select_music(text,text,numeric,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'L5 POST FAIL: service_role lacks EXECUTE on select_music';
  END IF;

  -- 4.3 BEHAVIOUR PRESERVATION at p_seed IS NULL — the deployed worker passes no seed, so the
  --     migration must be a no-op for it. Compares against the pre-DDL baseline.
  SELECT track_key INTO v_before FROM _l5_baseline;
  SELECT track_key INTO v_after
    FROM public.select_music('format','video_short_stat', 12, NULL);
  IF v_after IS DISTINCT FROM v_before THEN
    RAISE EXCEPTION
      'L5 POST FAIL: seedless selection changed % -> %. The migration must be behaviour-identical for the deployed worker.',
      coalesce(v_before,'<none>'), coalesce(v_after,'<none>');
  END IF;

  -- 4.4 COOLDOWN CANNOT EMPTY A NON-EMPTY POOL (R4). At any eligible count >= 1, a seedless call
  --     must still return exactly one row.
  SELECT count(*) INTO v_n_elig
    FROM public.select_music('format','video_short_stat', 12, NULL);
  IF v_before IS NOT NULL AND v_n_elig <> 1 THEN
    RAISE EXCEPTION 'L5 POST FAIL: non-empty eligible pool returned % rows (cooldown emptied it)', v_n_elig;
  END IF;

  RAISE NOTICE 'L5 OK: atomic replacement complete. 1 overload, ACLs locked to service_role, seedless behaviour unchanged (%).',
    coalesce(v_before,'<none>');
END $$;

-- ============================================================================================
-- NOT PROVEN BY THIS FILE — and it cannot be:
--   * The PostgREST/RPC caller-path proof (R5, PK-mandated) is necessarily POST-COMMIT — an HTTP
--     RPC call cannot run inside this transaction. The rollback is the safety net for it, which
--     is why the rollback must be written AND proven BEFORE this is applied.
--   * Rotation itself. With the live eligible pool at 1, this migration is provably a no-op.
--     The reachability/uniformity proof needs 4 eligible tracks, delivered upstream by:
--       Lane 4 Content-ID flip -> Music Promotion gate -> four eligible tracks -> Lane 5 proof.
-- ============================================================================================
