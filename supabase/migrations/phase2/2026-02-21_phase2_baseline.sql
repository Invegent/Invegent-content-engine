-- Phase 2 baseline snapshot
-- Date: 2026-02-21
-- Purpose: Gate seeding behind bundled+selected, add scoring/selection + property bundling (forward-only)

CREATE OR REPLACE FUNCTION m.seed_and_enqueue_ai_jobs_v1(p_platform text DEFAULT 'facebook'::text, p_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
declare
  v_seeds int := 0;
  v_drafts int := 0;
  v_jobs int := 0;
begin
  with candidates as (
    select di.digest_item_id, di.digest_run_id
    from m.digest_item di
    join m.digest_run dr on dr.digest_run_id = di.digest_run_id
    where not exists (
      select 1 from m.post_seed ps
      where ps.digest_item_id = di.digest_item_id
    )
    -- ✅ PHASE 2 GATE: only seed editorially approved bundles
    and di.selection_state = 'selected'
    and di.bundled = true
    and di.body_fetch_status = 'success'
    order by di.created_at desc nulls last
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
        'platform', p_platform,
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
  ins_draft as (
    insert into m.post_draft (
      post_draft_id,
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
      s.digest_item_id,
      p_platform,
      '[AUTO] Draft pending AI',
      '',
      jsonb_build_object(
        'seed_stub', true,
        'seeded_at', now(),
        'platform', p_platform
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
    returning post_draft_id, digest_item_id
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
    'ok', true,
    'platform', p_platform,
    'seeded', v_seeds,
    'drafts', v_drafts,
    'jobs_queued', v_jobs
  );
end;
$function$;


CREATE OR REPLACE FUNCTION m.bundle_property_strict_v1(p_bundle_size integer DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
declare
  v_bundles int := 0;
  v_items int := 0;
begin
  with cat as (
    select unnest(array['rentals','interest_rates']) as final_category
  ),
  picked as (
    select
      di.digest_item_id,
      di.final_category,
      di.final_score,
      row_number() over (
        partition by di.final_category
        order by di.final_score desc, di.created_at desc
      ) as rn
    from m.digest_item di
    join m.digest_run dr on dr.digest_run_id = di.digest_run_id
    join cat on cat.final_category = di.final_category
    where dr.client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid
      and di.selection_state = 'selected'
      and di.bundled = false
      and di.body_fetch_status = 'success'
      and di.created_at >= now() - interval '12 hours'
      -- ✅ Forward-only: only items that haven't been seeded yet
      and not exists (
        select 1 from m.post_seed ps
        where ps.digest_item_id = di.digest_item_id
      )
  ),
  eligible as (
    select final_category
    from picked
    group by final_category
    having count(*) >= 3
  ),
  to_bundle as (
    select p.*
    from picked p
    join eligible e using (final_category)
    where p.rn <= p_bundle_size
  ),
  grp as (
    select final_category, gen_random_uuid() as bundle_group_id
    from eligible
  ),
  upd as (
    update m.digest_item di
    set bundled = true,
        bundled_at = now(),
        bundle_group_id = grp.bundle_group_id
    from to_bundle tb
    join grp on grp.final_category = tb.final_category
    where di.digest_item_id = tb.digest_item_id
    returning di.digest_item_id
  )
  select
    (select count(*) from eligible),
    (select count(*) from upd)
  into v_bundles, v_items;

  return jsonb_build_object('ok', true, 'bundles_created', v_bundles, 'items_bundled', v_items);
end;
$function$;


CREATE OR REPLACE FUNCTION m.score_digest_items_v1(p_hours integer DEFAULT 48)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
declare
  v_updated int := 0;
begin
  update m.digest_item
  set final_category =
    case
      when lower(coalesce(title,'') || ' ' || coalesce(body_text,'')) ~ '(rba|interest|rate|hike|cut)'
        then 'interest_rates'
      when lower(coalesce(title,'') || ' ' || coalesce(body_text,'')) ~ '(price|median|growth|decline)'
        then 'house_prices'
      when lower(coalesce(title,'') || ' ' || coalesce(body_text,'')) ~ '(rent|rental|vacancy)'
        then 'rentals'
      when lower(coalesce(title,'') || ' ' || coalesce(body_text,'')) ~ '(tax|cgt|gearing|policy|reform)'
        then 'policy'
      when lower(coalesce(title,'') || ' ' || coalesce(body_text,'')) ~ '(build|approval|dwelling|supply)'
        then 'construction'
      when lower(coalesce(title,'') || ' ' || coalesce(body_text,'')) ~ '(investor|yield|return)'
        then 'investment'
      else 'general'
    end
  where final_category is null
    and created_at >= now() - make_interval(hours => p_hours);

  update m.digest_item
  set final_score =
    (case
      when created_at >= now() - interval '6 hours' then 5
      when created_at >= now() - interval '12 hours' then 3
      when created_at >= now() - interval '24 hours' then 1
      else 0
    end)
    +
    (case
      when length(coalesce(body_text,'')) > 2000 then 3
      when length(coalesce(body_text,'')) > 1000 then 2
      when length(coalesce(body_text,'')) > 300 then 1
      else 0
    end)
    +
    (case
      when coalesce(final_category,'general') <> 'general' then 3
      else 0
    end)
  where selection_state = 'candidate'
    and created_at >= now() - make_interval(hours => p_hours);

  get diagnostics v_updated = row_count;

  return jsonb_build_object('ok', true, 'hours', p_hours, 'scored_candidates_updated_last_stmt', v_updated);
end;
$function$;


CREATE OR REPLACE FUNCTION m.select_property_v1(p_hours integer DEFAULT 12, p_min_score numeric DEFAULT 6)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
declare
  v_selected int := 0;
begin
  update m.digest_item di
  set selection_state = 'selected',
      selected_at = now()
  from m.digest_run dr
  where dr.digest_run_id = di.digest_run_id
    and dr.client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid
    and di.selection_state = 'candidate'
    and di.body_fetch_status = 'success'
    and di.created_at >= now() - make_interval(hours => p_hours)
    and di.final_score >= p_min_score
    and not exists (
      select 1 from m.post_seed ps
      where ps.digest_item_id = di.digest_item_id
    );

  get diagnostics v_selected = row_count;

  return jsonb_build_object('ok', true, 'selected', v_selected, 'hours', p_hours, 'min_score', p_min_score);
end;
$function$;


CREATE OR REPLACE FUNCTION m.select_ndis_v1(p_hours integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
declare
  v_selected int := 0;
begin
  update m.digest_item di
  set selection_state = 'selected',
      selected_at = now()
  from m.digest_run dr
  where dr.digest_run_id = di.digest_run_id
    and dr.client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid
    and di.selection_state = 'candidate'
    and di.body_fetch_status = 'success'
    and di.created_at >= now() - make_interval(hours => p_hours)
    and not exists (
      select 1 from m.post_seed ps
      where ps.digest_item_id = di.digest_item_id
    );

  get diagnostics v_selected = row_count;

  return jsonb_build_object('ok', true, 'selected', v_selected, 'hours', p_hours);
end;
$function$;