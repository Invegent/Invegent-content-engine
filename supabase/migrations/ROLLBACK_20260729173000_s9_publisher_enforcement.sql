-- =====================================================================
-- ROLLBACK -- S9 Objective 2 publisher enforcement (20260729173000)
--
-- Restores all three functions to their EXACT pre-change bodies, pulled live via
-- prosrc on 2026-07-29 and md5-asserted at generation:
--   m.publisher_lock_queue_v2     d3fa9f82937ad7f9cbad79ad21ce0b46
--   m.auto_approver_fetch_drafts  1bf1dbf52ce56fd51b2f81c059dcfe29
--   m.gate_queue_on_asset_status  (captured this lane)
--
-- This file DOUBLES AS THE PROVENANCE BACKFILL: before this lane the repo carried
-- no tracked migration for publisher_lock_queue_v1/v2 at all, so these bodies are
-- the first repo record of the live definitions. m.publisher_lock_queue_v1 is NOT
-- reproduced because this lane never modifies it -- it is a pure delegating
-- wrapper whose live body is exactly:
--     SELECT * FROM m.publisher_lock_queue_v2(p_limit, p_worker_id, p_lock_seconds, p_platform);
--   (md5 54a6af1f965d40be2c7769d7e57e8ed2)
--
-- Function-body revert only: no table DDL, no data change. Queue rows already
-- stamped with a 'capability_hold:unknown_draft_provenance' last_error keep that
-- text as historical fact; after rollback they simply become dequeue-eligible
-- again on the pre-change rules.
--
-- CONCURRENCY: cron jobid 48 (enqueue, */5) and the publisher edge functions call
-- these continuously. PostgreSQL resolves a function body at the start of each
-- call and CREATE OR REPLACE does not abort a call already in flight, so no pause
-- is required for either the forward apply or this rollback.
--
-- VERIFY AFTER RUNNING:
--   SELECT p.proname, md5(p.prosrc) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='m' AND p.proname IN
--      ('publisher_lock_queue_v2','auto_approver_fetch_drafts','gate_queue_on_asset_status');
--   -- expect publisher_lock_queue_v2    = d3fa9f82937ad7f9cbad79ad21ce0b46
--   --        auto_approver_fetch_drafts = 1bf1dbf52ce56fd51b2f81c059dcfe29
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION m.gate_queue_on_asset_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_format       text;
  v_image_status text;
  v_video_status text;
BEGIN
  SELECT recommended_format, image_status, video_status
    INTO v_format, v_image_status, v_video_status
    FROM m.post_draft
   WHERE post_draft_id = NEW.post_draft_id;

  -- Image formats: hold when image not yet generated
  IF v_format IN ('image_quote','carousel','animated_text_reveal','animated_data')
     AND (v_image_status IS NULL OR v_image_status = 'pending')
  THEN
    NEW.scheduled_for := GREATEST(NEW.scheduled_for, NOW() + INTERVAL '4 hours');
  END IF;

  -- Video formats: hold when video not yet generated
  IF v_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')
     AND (v_video_status IS NULL OR v_video_status = 'pending')
  THEN
    NEW.scheduled_for := GREATEST(NEW.scheduled_for, NOW() + INTERVAL '4 hours');
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION m.publisher_lock_queue_v2(p_limit integer, p_worker_id text, p_lock_seconds integer DEFAULT 600, p_platform text DEFAULT NULL::text)
 RETURNS SETOF m.post_publish_queue
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'm', 'c'
AS $function$
declare
  v_now timestamptz := now();
begin
  return query
  with eligible as (
    select
      q.queue_id,
      q.client_id,
      q.platform,
      q.scheduled_for,
      q.created_at,
      cpp.destination_id,
      cpp.min_gap_minutes,
      cpp.max_per_day,
      stats.last_published_at,
      stats.published_today,
      row_number() over (
        partition by q.client_id, q.platform
        order by coalesce(q.scheduled_for, v_now) asc, q.created_at asc
      ) as rn
    from m.post_publish_queue q
    join c.client_publish_profile cpp
      on cpp.client_id = q.client_id
     and cpp.platform  = q.platform
    left join lateral (
      select
        max(p.created_at) filter (where p.status = 'published') as last_published_at,
        count(*) filter (
          where p.status='published'
            and p.created_at >= date_trunc('day', v_now)
        ) as published_today
      from m.post_publish p
      where p.destination_id = cpp.destination_id
        and p.created_at >= v_now - interval '7 days'
    ) stats on true
    where q.status = 'queued'
      and (p_platform IS NULL OR q.platform = p_platform)
      and (q.scheduled_for is null or q.scheduled_for <= v_now)
      and (
        q.locked_at is null
        or q.locked_at < (v_now - make_interval(secs => p_lock_seconds))
      )
      and cpp.publish_enabled = true
      and (cpp.paused_until is null or cpp.paused_until <= v_now)
      and not exists (
        select 1
        from m.post_publish_queue qr
        where qr.client_id = q.client_id
          and qr.platform  = q.platform
          and qr.status    = 'running'
          and qr.locked_at is not null
          and qr.locked_at >= (v_now - make_interval(secs => p_lock_seconds))
      )
      and (
        cpp.min_gap_minutes is null
        or stats.last_published_at is null
        or stats.last_published_at <= v_now - make_interval(mins => cpp.min_gap_minutes)
      )
      and (
        cpp.max_per_day is null
        or stats.published_today < cpp.max_per_day
      )
  ),
  picked as (
    select q.queue_id
    from eligible e
    join m.post_publish_queue q on q.queue_id = e.queue_id
    where e.rn <= GREATEST(0, COALESCE(e.max_per_day, 999) - e.published_today)  -- Bug 2 fix: per-partition remaining-cap filter
    order by e.rn asc, coalesce(e.scheduled_for, v_now) asc, e.created_at asc
    for update of q skip locked
    limit p_limit
  )
  update m.post_publish_queue q
  set
    status = 'running',
    locked_at = v_now,
    locked_by = p_worker_id,
    attempt_count = coalesce(q.attempt_count,0) + 1,
    updated_at = v_now
  from picked
  where q.queue_id = picked.queue_id
  returning q.*;
end;
$function$;

CREATE OR REPLACE FUNCTION m.auto_approver_fetch_drafts(p_limit integer DEFAULT 10)
 RETURNS TABLE(post_draft_id uuid, client_id uuid, draft_body text, draft_title text, draft_format jsonb, approval_status text, digest_item_id uuid, final_score numeric, auto_approve_enabled boolean, platform text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'm', 'c', 'public'
AS $function$
  WITH ranked AS (
    SELECT
      pd.post_draft_id, pd.client_id, pd.draft_body, pd.draft_title, pd.draft_format,
      pd.approval_status, pd.digest_item_id, di.final_score, pd.platform,
      cpp.auto_approve_enabled,
      ROW_NUMBER() OVER (
        PARTITION BY pd.client_id, pd.platform
        ORDER BY di.final_score DESC NULLS LAST, pd.created_at ASC
      ) AS bucket_rank
    FROM m.post_draft pd
    LEFT JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
    LEFT JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
    JOIN LATERAL (
      SELECT cpp.client_publish_profile_id, cpp.auto_approve_enabled
      FROM c.client_publish_profile cpp
      WHERE cpp.client_id = pd.client_id
        AND cpp.platform = pd.platform
        AND cpp.status = 'active'
      ORDER BY cpp.is_default DESC NULLS LAST,
               cpp.created_at DESC NULLS LAST,
               cpp.client_publish_profile_id DESC
      LIMIT 1
    ) cpp ON COALESCE(cpp.auto_approve_enabled, false) = true
    WHERE pd.approval_status = 'needs_review'
  )
  SELECT
    post_draft_id, client_id, draft_body, draft_title, draft_format,
    approval_status, digest_item_id, final_score, auto_approve_enabled, platform
  FROM ranked
  ORDER BY bucket_rank ASC, final_score DESC NULLS LAST, post_draft_id
  LIMIT p_limit;
$function$;

COMMIT;
