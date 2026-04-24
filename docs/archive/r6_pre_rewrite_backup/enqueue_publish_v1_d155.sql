-- ROLLBACK ARTEFACT — preserved 2026-04-24 Session 2 before R6 rewrite
-- Original state: post-D155 patch, ON CONFLICT (post_draft_id, platform) fix, 9-branch UUID cascade
-- Use: if R6 Task F deploy requires rollback, paste this into a migration and apply.

CREATE OR REPLACE FUNCTION m.enqueue_publish_from_ai_job_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'm'
AS $function$
declare
  v_queued_count int;
  v_max_queued int;
  v_min_gap interval;
  v_last_sched timestamptz;
  v_next_sched timestamptz;
begin
  if tg_op = 'UPDATE'
     and new.status = 'succeeded'
     and (old.status is distinct from new.status)
     and coalesce(new.platform,'') IN ('facebook','linkedin','instagram')
     and new.post_draft_id is not null
     and new.client_id is not null
  then
    -- per-client + per-platform caps + cadence
    IF new.platform = 'facebook' THEN
      if new.client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid then
        v_max_queued := 20; v_min_gap := interval '90 minutes';
      elsif new.client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid then
        v_max_queued := 10; v_min_gap := interval '180 minutes';
      else
        v_max_queued := 10; v_min_gap := interval '120 minutes';
      end if;
    ELSIF new.platform = 'linkedin' THEN
      if new.client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid then
        v_max_queued := 8; v_min_gap := interval '240 minutes';
      elsif new.client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid then
        v_max_queued := 6; v_min_gap := interval '360 minutes';
      else
        v_max_queued := 6; v_min_gap := interval '360 minutes';
      end if;
    ELSIF new.platform = 'instagram' THEN
      -- Instagram: similar cadence to LinkedIn, ~2-3 posts/day peak
      if new.client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid then
        v_max_queued := 6; v_min_gap := interval '360 minutes';
      elsif new.client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid then
        v_max_queued := 6; v_min_gap := interval '360 minutes';
      else
        v_max_queued := 4; v_min_gap := interval '480 minutes';
      end if;
    END IF;

    select count(*) into v_queued_count
    from m.post_publish_queue
    where status = 'queued'
      and client_id = new.client_id
      and platform = new.platform;

    if v_queued_count < v_max_queued then
      select max(scheduled_for) into v_last_sched
      from m.post_publish_queue
      where status = 'queued'
        and client_id = new.client_id
        and platform = new.platform
        and scheduled_for is not null;

      v_next_sched := greatest(now(), coalesce(v_last_sched, now()) + v_min_gap);

      -- D155 FIX: ON CONFLICT must match the unique constraint
      -- uq_post_publish_queue_post_draft_platform on (post_draft_id, platform)
      insert into m.post_publish_queue (ai_job_id, post_draft_id, client_id, platform, scheduled_for, status, attempt_count)
      values (new.ai_job_id, new.post_draft_id, new.client_id, new.platform, v_next_sched, 'queued', 0)
      on conflict (post_draft_id, platform) do nothing;  -- was (post_draft_id)
    end if;
  end if;

  return new;
end;
$function$;
