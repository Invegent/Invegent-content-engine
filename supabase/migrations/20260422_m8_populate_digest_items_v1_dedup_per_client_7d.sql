-- M8: root-cause fix for draft multiplication (NDIS Yarns IG incident 17-19 Apr).
--
-- populate_digest_items_v1 was re-selecting the same canonical_id into a fresh
-- digest_item on every hourly planner run. ON CONFLICT is scoped to
-- (digest_run_id, canonical_id) which only dedups WITHIN one run — not across
-- runs. Result: N hourly runs x M fresh canonicals = N*M bloated digest_items
-- for effectively the same content, each eventually becoming a distinct draft.
--
-- Confirmed via diagnostic SQL (22 Apr): 97 drafts, 97 digest_items, but only
-- 13 canonical_ids across 15 digest_runs for NDIS Yarns in the incident
-- window. Property Pulse showed canonicals repeated 24x each (1 per hourly
-- run for a full 24h freshness window) still actively happening at time of
-- audit.
--
-- Fix: add NOT EXISTS check against prior digest_items for the same client
-- within a 7-day window. One canonical -> one digest_item per client per 7d.
-- Platform fan-out still happens at the seed layer downstream of this.
-- Excludes the current digest_run_id from the NOT EXISTS so re-running
-- populate for the same run remains idempotent.
--
-- Out of M8 scope: existing bloated digest_items and drafts are NOT cleaned
-- up. PK handles IG-published cleanup manually via Instagram UI. No backfill.

CREATE OR REPLACE FUNCTION m.populate_digest_items_v1(p_digest_run_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
  v_client_id uuid;
  v_ws timestamptz;
  v_we timestamptz;

  v_mode text;
  v_allow_missing boolean;
  v_allow_paywalled boolean;
  v_allow_blocked boolean;
  v_max_items int;

  v_inserted int := 0;
begin
  select client_id, window_start, window_end
    into v_client_id, v_ws, v_we
  from m.digest_run
  where digest_run_id = p_digest_run_id;

  if v_client_id is null then
    raise exception
      'digest_run % has client_id NULL. Set it or create runs via m.create_digest_run_for_client().',
      p_digest_run_id;
  end if;

  select mode, allow_missing_body, allow_paywalled, allow_blocked, max_items
    into v_mode, v_allow_missing, v_allow_paywalled, v_allow_blocked, v_max_items
  from c.client_digest_policy
  where client_id = v_client_id;

  if v_mode is null then v_mode := 'strict'; end if;
  if v_max_items is null then v_max_items := 12; end if;

  if v_mode = 'strict' then
    v_allow_missing := false;
    v_allow_paywalled := false;
    v_allow_blocked := false;
  elsif v_mode = 'hybrid' then
    v_allow_paywalled := false;
    v_allow_blocked := false;
  end if;

  with candidates as (
    select
      ir.run_id,
      ir.started_at as run_ts,
      ir.source_id,
      rci.raw_content_item_id as raw_id,
      coalesce(
        to_jsonb(rci)->>'raw_title',
        to_jsonb(rci)->>'title',
        to_jsonb(rci)->>'item_title'
      ) as raw_title,
      coalesce(
        to_jsonb(rci)->>'raw_url',
        to_jsonb(rci)->>'source_url',
        to_jsonb(rci)->>'url',
        to_jsonb(rci)->>'link'
      ) as raw_url,
      ci.content_item_id as content_id,
      coalesce(
        to_jsonb(ci)->>'content_title',
        to_jsonb(ci)->>'title'
      ) as content_title,
      coalesce(
        to_jsonb(ci)->>'content_url',
        to_jsonb(ci)->>'url',
        to_jsonb(ci)->>'link',
        to_jsonb(ci)->>'final_url'
      ) as content_url,
      cm.canonical_id,
      coalesce(
        to_jsonb(cci)->>'canonical_title',
        to_jsonb(cci)->>'title'
      ) as canonical_title,
      coalesce(
        to_jsonb(cci)->>'canonical_url',
        to_jsonb(cci)->>'url'
      ) as canonical_url,
      coalesce(to_jsonb(ccb)->>'fetch_status', to_jsonb(ccb)->>'status') as body_fetch_status,
      to_jsonb(ccb)->>'resolution_status' as body_resolution_status,
      (coalesce(to_jsonb(ccb)->>'attempts', to_jsonb(ccb)->>'fetch_attempts'))::int as body_attempts,
      (to_jsonb(ccb)->>'expires_at')::timestamptz as body_expires_at,
      (to_jsonb(ccb)->>'fetched_at')::timestamptz as body_fetched_at,
      (to_jsonb(ccb)->>'updated_at')::timestamptz as body_updated_at,
      coalesce(to_jsonb(ccb)->>'final_url', to_jsonb(ccb)->>'url') as body_final_url,
      coalesce(to_jsonb(ccb)->>'error', to_jsonb(ccb)->>'error_message') as body_error,
      coalesce(to_jsonb(ccb)->>'excerpt', to_jsonb(ccb)->>'extracted_excerpt') as body_excerpt,
      coalesce(to_jsonb(ccb)->>'body_text', to_jsonb(ccb)->>'extracted_text', to_jsonb(ccb)->>'text') as body_text
    from f.ingest_run ir
    join f.raw_content_item rci
      on rci.run_id = ir.run_id
    left join f.content_item ci
      on ci.raw_content_item_id = rci.raw_content_item_id
    left join f.content_item_canonical_map cm
      on cm.content_item_id = ci.content_item_id
    left join f.canonical_content_item cci
      on cci.canonical_id = cm.canonical_id
    left join f.canonical_content_body ccb
      on ccb.canonical_id = cci.canonical_id
    join c.client_source cs
      on cs.client_id = v_client_id
     and cs.source_id = ir.source_id
     and cs.is_enabled = true
    where ir.started_at >= v_ws
      and ir.started_at <  v_we
      and cm.canonical_id is not null
      -- M8 dedup: skip canonicals already in a digest_item for this client in the last 7 days.
      -- Excludes self (p_digest_run_id) so re-running populate for the same run is idempotent.
      and not exists (
        select 1
        from m.digest_item di_prev
        join m.digest_run dr_prev on dr_prev.digest_run_id = di_prev.digest_run_id
        where di_prev.canonical_id = cm.canonical_id
          and dr_prev.client_id   = v_client_id
          and di_prev.created_at >= now() - interval '7 days'
          and di_prev.digest_run_id <> p_digest_run_id
      )
  ),
  eligible as (
    select *
    from candidates
    where
      (body_fetch_status = 'success')
      or (v_allow_paywalled and body_fetch_status = 'paywalled')
      or (v_allow_blocked  and body_fetch_status = 'blocked')
      or (v_allow_missing and (
            body_fetch_status is null
            or body_fetch_status in ('pending','queued','new')
          ))
  ),
  ranked as (
    select distinct on (canonical_id)
      canonical_id,
      source_id,
      coalesce(canonical_title, content_title, raw_title) as title,
      coalesce(canonical_url,   content_url,   raw_url)   as url,
      body_fetch_status,
      body_resolution_status,
      body_attempts,
      body_expires_at,
      body_fetched_at,
      body_updated_at,
      body_final_url,
      body_error,
      body_excerpt,
      body_text,
      run_ts
    from eligible
    order by canonical_id, run_ts desc
  )
  insert into m.digest_item (
    digest_run_id,
    canonical_id,
    source_id,
    title,
    url,
    body_fetch_status,
    body_resolution_status,
    body_attempts,
    body_expires_at,
    body_fetched_at,
    body_updated_at,
    body_final_url,
    body_error,
    body_excerpt,
    body_text,
    selection_state
  )
  select
    p_digest_run_id,
    canonical_id,
    source_id,
    title,
    url,
    body_fetch_status,
    body_resolution_status,
    body_attempts,
    body_expires_at,
    body_fetched_at,
    body_updated_at,
    body_final_url,
    body_error,
    body_excerpt,
    body_text,
    'candidate'
  from ranked
  order by run_ts desc
  limit v_max_items
  on conflict (digest_run_id, canonical_id) do nothing;

  get diagnostics v_inserted = row_count;

  update m.digest_run
  set status = 'populated',
      updated_at = now()
  where digest_run_id = p_digest_run_id;

  return v_inserted;
end;
$function$;
