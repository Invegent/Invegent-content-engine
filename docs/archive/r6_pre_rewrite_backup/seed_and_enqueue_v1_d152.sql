-- ROLLBACK ARTEFACT — preserved 2026-04-24 Session 2 before R6 rewrite
-- Original state: post-D152 patch, demand-aware v2, client_id now set in draft INSERT
-- Use: if R6 Task A deploy requires rollback, paste this into a migration and apply.

CREATE OR REPLACE FUNCTION m.seed_and_enqueue_ai_jobs_v1(p_platform text DEFAULT 'facebook'::text, p_limit integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
/*
  D142 — Demand-Aware Seeder v2 + D152 patch (18 Apr 2026)
  v2: demand-aware selection
  D152: ins_draft now sets client_id (was NULL, causing orphan drafts)
*/
declare
  v_seeds         int := 0;
  v_drafts        int := 0;
  v_jobs          int := 0;
  v_demand_json   jsonb := '[]'::jsonb;
begin

  -- STEP 1: Capture demand diagnostics
  select jsonb_agg(
    jsonb_build_object(
      'client_id',     d.client_id,
      'target_depth',  d.target_depth,
      'in_pipeline',   d.in_pipeline,
      'allowed',       greatest(0, d.target_depth - d.in_pipeline)
    )
  )
  into v_demand_json
  from (
    select
      c.client_id,
      case
        when COUNT(cps.schedule_id) > 0
          then CEIL(COUNT(cps.schedule_id) * 1.5)::int
        else CEIL(COALESCE(cpp.max_per_day, 2) * 7 * 1.5)::int
      end as target_depth,
      COALESCE((
        select COUNT(*)::int
        from m.post_draft pd2
        where pd2.client_id = c.client_id
          and pd2.platform   = p_platform
          and pd2.approval_status IN ('draft','needs_review','approved','scheduled')
          and pd2.created_at > now() - interval '7 days'
      ), 0) as in_pipeline
    from c.client c
    join c.client_publish_profile cpp
      on cpp.client_id = c.client_id
      and cpp.platform = p_platform
      and cpp.mode     = 'auto'
      and cpp.publish_enabled = true
    left join c.client_publish_schedule cps
      on cps.client_id = c.client_id
      and cps.platform = p_platform
      and cps.enabled  = true
    where c.status = 'active'
    group by c.client_id, cpp.max_per_day
  ) d;

  -- STEP 2: Seed, draft, and enqueue only within demand budget
  with

  client_demand as (
    select
      c.client_id,
      case
        when COUNT(cps.schedule_id) > 0
          then CEIL(COUNT(cps.schedule_id) * 1.5)::int
        else CEIL(COALESCE(cpp.max_per_day, 2) * 7 * 1.5)::int
      end as target_depth,
      COALESCE((
        select COUNT(*)::int
        from m.post_draft pd2
        where pd2.client_id = c.client_id
          and pd2.platform   = p_platform
          and pd2.approval_status IN ('draft','needs_review','approved','scheduled')
          and pd2.created_at > now() - interval '7 days'
      ), 0) as in_pipeline
    from c.client c
    join c.client_publish_profile cpp
      on cpp.client_id = c.client_id
      and cpp.platform = p_platform
      and cpp.mode     = 'auto'
      and cpp.publish_enabled = true
    left join c.client_publish_schedule cps
      on cps.client_id = c.client_id
      and cps.platform = p_platform
      and cps.enabled  = true
    where c.status = 'active'
    group by c.client_id, cpp.max_per_day
  ),

  client_allowance as (
    select
      client_id,
      greatest(0, target_depth - in_pipeline) as allowed
    from client_demand
    where greatest(0, target_depth - in_pipeline) > 0
  ),

  ranked_candidates as (
    select
      di.digest_item_id,
      di.digest_run_id,
      dr.client_id,
      row_number() over (
        partition by dr.client_id
        order by di.created_at desc nulls last
      ) as rn
    from m.digest_item di
    join m.digest_run dr on dr.digest_run_id = di.digest_run_id
    join client_allowance ca on ca.client_id = dr.client_id
    where not exists (
      select 1 from m.post_seed ps
      where ps.digest_item_id = di.digest_item_id
    )
    and di.selection_state    = 'selected'
    and di.bundled            = true
    and di.body_fetch_status  = 'success'
  ),

  candidates as (
    select rc.digest_item_id, rc.digest_run_id
    from ranked_candidates rc
    join client_allowance ca on ca.client_id = rc.client_id
    where rc.rn <= ca.allowed
    limit p_limit
  ),

  ins_seed as (
    insert into m.post_seed (
      post_seed_id,
      digest_run_id,
      digest_item_id,
      client_id,
      seed_type,
      seed_payload,
      status,
      created_by,
      created_at,
      updated_at
    )
    select
      gen_random_uuid(),
      c.digest_run_id,
      c.digest_item_id,
      dr.client_id,
      'digest_item_v1',
      jsonb_build_object(
        'platform',    p_platform,
        'digest_item', to_jsonb(di)
      ),
      'sent_to_ai',
      'seed_and_enqueue',
      now(),
      now()
    from candidates c
    join m.digest_run dr on dr.digest_run_id = c.digest_run_id
    join m.digest_item di on di.digest_item_id = c.digest_item_id
    returning post_seed_id, digest_item_id, digest_run_id, client_id, seed_payload
  ),

  -- D152 FIX: client_id now included in INSERT column list + SELECT
  ins_draft as (
    insert into m.post_draft (
      post_draft_id,
      client_id,                              -- D152: was missing
      digest_item_id,
      platform,
      draft_title,
      draft_body,
      draft_format,
      approval_status,
      created_by,
      created_at,
      updated_at,
      version
    )
    select
      gen_random_uuid(),
      s.client_id,                            -- D152: was missing
      s.digest_item_id,
      p_platform,
      '[AUTO] Draft pending AI',
      '',
      jsonb_build_object(
        'seed_stub',  true,
        'seeded_at',  now(),
        'platform',   p_platform
      ),
      'draft',
      'seed_and_enqueue',
      now(),
      now(),
      1
    from ins_seed s
    where not exists (
      select 1
      from m.post_draft d
      where d.digest_item_id = s.digest_item_id
        and d.platform = p_platform
    )
    returning post_draft_id, digest_item_id, client_id
  ),

  draft_map as (
    select
      s.post_seed_id,
      s.digest_item_id,
      s.digest_run_id,
      s.client_id,
      s.seed_payload,
      coalesce(d.post_draft_id, d2.post_draft_id) as post_draft_id
    from ins_seed s
    left join ins_draft d on d.digest_item_id = s.digest_item_id
    left join m.post_draft d2
      on d2.digest_item_id = s.digest_item_id
     and d2.platform = p_platform
  ),

  ins_job as (
    insert into m.ai_job (
      ai_job_id,
      client_id,
      digest_run_id,
      post_seed_id,
      post_draft_id,
      platform,
      job_type,
      status,
      priority,
      input_payload,
      created_at,
      updated_at
    )
    select
      gen_random_uuid(),
      dm.client_id,
      dm.digest_run_id,
      dm.post_seed_id,
      dm.post_draft_id,
      p_platform,
      'rewrite_v1',
      'queued',
      100,
      dm.seed_payload,
      now(),
      now()
    from draft_map dm
    where dm.post_draft_id is not null
      and not exists (
        select 1 from m.ai_job j
        where j.post_draft_id = dm.post_draft_id
          and j.job_type = 'rewrite_v1'
      )
    returning ai_job_id
  )

  select
    (select count(*) from ins_seed),
    (select count(*) from ins_draft),
    (select count(*) from ins_job)
  into v_seeds, v_drafts, v_jobs;

  return jsonb_build_object(
    'ok',           true,
    'version',      'demand-aware-v2-d152',
    'platform',     p_platform,
    'seeded',       v_seeds,
    'drafts',       v_drafts,
    'jobs_queued',  v_jobs,
    'demand',       COALESCE(v_demand_json, '[]'::jsonb)
  );

end $function$;
