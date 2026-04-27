-- Stage 11.049 — Drop the Stage 10.046 shadow filter
--
-- Stage 10.046 added an `is_shadow = false` filter as a temporary measure to
-- keep the v2.9.0 ai-worker from picking up shadow ai_jobs it couldn't process.
-- Stage 11 ships the v2.10.0 ai-worker with full slot_fill_synthesis_v1 handling,
-- so the filter is no longer needed. Restore the original function body.
--
-- Per D179 sequencing: this MUST apply AFTER the v2.10.0 ai-worker deploy.

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
  'R6 ai-worker job lock. Stage 11.049: shadow filter removed; ai-worker v2.10.0 handles slot_fill_synthesis_v1 natively.';
