-- Stage 12.052 — Drop the emergency shadow filter from f.ai_worker_lock_jobs_v1
--
-- Context: at end of Stage 11, the shadow filter was re-applied as defence in
-- depth while the recovery+fill+LD18 architectural conflict was investigated
-- (migration stage_11_pause_readd_shadow_filter, applied chat-only).
--
-- Stage 12 has now landed:
--   050 — service_role grants on m.slot
--   051 — fill_pending_slots UPSERT
--   ai-worker v2.11.0 — { error } destructuring
--
-- All three address the failure modes that justified the pause. Phase B is
-- ready to reactivate. This migration drops the filter so ai-worker picks up
-- shadow ai_jobs again. Paired with cron.alter_job(75..79, active := true)
-- which is applied separately as operational state, not a migration.

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
  'R6 ai-worker job lock. Stage 12.052: shadow filter dropped post Stage 12 architectural fixes. Picks both shadow and live ai_jobs.';
