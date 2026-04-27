-- STAGE 10 SHADOW FILTER (D179): excludes is_shadow=true ai_jobs.
-- Stage 11 redefines this to drop the filter once full slot-driven payload
-- handling lands.
--
-- Stage 10.046 — Redefine f.ai_worker_lock_jobs_v1 to skip shadow ai_jobs
--
-- Per D179 ordering: this MUST apply before migration 047 (Phase B cron
-- registration) so the R6 ai-worker (jobid 5) does not pick up the shadow
-- ai_jobs that m.fill_pending_slots(p_shadow := true) will start producing
-- once the fill cron is active.
--
-- Body identical to the live function except for the added shadow filter
-- in the inner queued-job SELECT (the `picked` CTE). Signature, return
-- type, language, security context, and search_path preserved exactly.

CREATE OR REPLACE FUNCTION f.ai_worker_lock_jobs_v1(
  p_limit integer DEFAULT 1,
  p_worker_id text DEFAULT 'worker'::text,
  p_lock_seconds integer DEFAULT 900
)
RETURNS SETOF m.ai_job
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'f', 'k', 'm'
AS $function$
  with picked as (
    select aj.ai_job_id
    from m.ai_job aj
    where aj.status = 'queued'
      and aj.is_shadow = false  -- STAGE 10 SHADOW FILTER (D179)
      and (aj.locked_at is null or aj.locked_at < now() - make_interval(secs => p_lock_seconds))
    order by aj.priority asc, aj.created_at asc
    limit greatest(p_limit, 0)
    for update skip locked
  )
  update m.ai_job aj
  set
    status = 'running',
    locked_at = now(),
    locked_by = p_worker_id,
    updated_at = now()
  from picked
  where aj.ai_job_id = picked.ai_job_id
  returning aj.*;
$function$;

COMMENT ON FUNCTION f.ai_worker_lock_jobs_v1(integer, text, integer) IS
  'R6 ai-worker job lock. Stage 10.046 (D179): added is_shadow=false filter so the existing R6 worker ignores shadow ai_jobs produced by m.fill_pending_slots(p_shadow := true). Stage 11 will redefine again to drop this filter once slot-driven payload handling lands.';
