-- NOT_APPLIED_m1_create_record_render_loudness_rpc.sql
-- =====================================================================
-- CGU Final M1 (loudness measurement) Phase-1 — write-back RPC (author-only —
-- NOT APPLIED, produced under the isolated L1 build lane, PK ruling
-- docs/briefs/cgu-final-build-acceleration-ruling-v1.md).
-- =====================================================================
-- STATUS: NOT YET APPLIED. Authored on an isolated branch/worktree only.
--   Apply requires: branch-warden safe verdict, db-rls-auditor review, the
--   standing external-review gate on the final diff, and an explicit PK T3
--   deploy/apply gate — none of which have run against this file. Filename
--   is deliberately NOT a timestamped migration name so no apply tool sweeps
--   it up; the apply lane renames it to a real identity at apply time.
--
-- Design authority: docs/briefs/seeds/cgu-m1-loudness-measurement-design-v1.md
--   §6 (fail-closed shape), §8 (schema touch — this IS the "new write-back
--   path IS a migration" item named there, exact signature was explicitly
--   left as "a Phase-1 design decision, not fixed" in that doc — decided
--   here).
--
-- SHAPE MIRRORS public.record_music_usage (live def pulled read-only via
-- pg_get_functiondef, 2026-08-06): SECURITY DEFINER, SET search_path TO '',
-- required-param RAISE EXCEPTION guards, PUBLIC revoked / service_role only.
-- Differs in ONE material way: record_music_usage INSERTs a new usage-event
-- row; this RPC instead jsonb-MERGES into the EXISTING m.post_render_log row
-- (render_spec.qa is additive JSONB per qa.ts's own contract — see
-- supabase/functions/video-worker/qa.ts, "NEVER blocks publish or alters
-- render behaviour"). No new table, no DDL beyond the function itself.
--
-- Dark-write only: this RPC is called EXCLUSIVELY by the (also undeployed)
-- loudness-sweep Edge Function, on its own schedule, AFTER a render has
-- already succeeded and been logged. It never runs in the render hot path
-- (renderUploadAndLog / write_render_log) and never blocks anything.

CREATE OR REPLACE FUNCTION public.record_render_loudness(
  p_render_log_id uuid,
  p_status text,                    -- 'measured' | 'unmeasurable' | 'error' (never 'pending' — that is the qa.ts default, this RPC only ever advances OFF it)
  p_loudness_lufs numeric DEFAULT NULL,
  p_true_peak_dbtp numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_current jsonb;
  v_merged jsonb;
BEGIN
  IF p_render_log_id IS NULL THEN
    RAISE EXCEPTION 'record_render_loudness: p_render_log_id is required';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('measured', 'unmeasurable', 'error') THEN
    RAISE EXCEPTION 'record_render_loudness: p_status must be one of measured/unmeasurable/error, got %', p_status;
  END IF;
  -- Fail-closed shape guard (design doc §6): a 'measured' status without a
  -- numeric LUFS value would silently collapse "measured" and "not measured"
  -- into the same observable state — the exact ambiguity §6 was written to
  -- prevent. unmeasurable/error legitimately carry NULL values.
  IF p_status = 'measured' AND p_loudness_lufs IS NULL THEN
    RAISE EXCEPTION 'record_render_loudness: p_status=measured requires a non-null p_loudness_lufs';
  END IF;

  SELECT render_spec -> 'qa' INTO v_current
  FROM m.post_render_log
  WHERE render_log_id = p_render_log_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'record_render_loudness: unknown render_log_id %', p_render_log_id;
  END IF;

  -- jsonb-MERGE, not overwrite: preserve every other qa.* key untouched
  -- (qa.ts's own additive contract). COALESCE guards a render logged before
  -- QA-VISIBILITY-V0 shipped, whose render_spec.qa may be absent entirely.
  v_merged := COALESCE(v_current, '{}'::jsonb) || jsonb_build_object(
    'loudness_measurement_status', p_status,
    'loudness_lufs', p_loudness_lufs,
    'true_peak_dbtp', p_true_peak_dbtp
  );

  UPDATE m.post_render_log
  SET render_spec = jsonb_set(
    COALESCE(render_spec, '{}'::jsonb),
    '{qa}',
    v_merged,
    true
  )
  WHERE render_log_id = p_render_log_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_render_loudness(uuid, text, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_render_loudness(uuid, text, numeric, numeric) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_render_loudness(uuid, text, numeric, numeric) TO service_role;

-- ── INTENDED CRON REGISTRATION (documented only — NOT executed by this file,
--    NOT applied, per the ruling's "production worker deployment or cron
--    activation" prohibition) ──────────────────────────────────────────────
-- A future apply packet would additionally register, e.g.:
--   SELECT cron.schedule('loudness-sweep-every-15m', '*/15 * * * *', $$
--     SELECT net.http_post(
--       url := '<project_url>/functions/v1/loudness-sweep',
--       headers := jsonb_build_object('Authorization', 'Bearer ' || '<service-role-or-x-series-key>')
--     );
--   $$);
-- Batch size / cadence are to_be_confirmed against the real backlog size at
-- apply time (see result doc open questions) — 15m is a placeholder, not a
-- decided value.
