-- =====================================================================
-- S9 Capability Enforcement -- Objective 2 (PUBLISHER chokepoint)
--
-- Brief:        docs/briefs/s9-publisher-enforcement-build-brief-v1.md
-- Architecture: docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md section 3
-- Tier:         T3 (production dequeue path + the irreversible public-upload claim)
--
-- CONSUMES the signal Objective 1 made live (v6.58):
--   m.post_draft.final_format_authority = 'blocked_by_capability'.
--
-- THREE OBJECTS, ONE TRANSACTION (PK rulings 2026-07-29):
--   1. m.gate_queue_on_asset_status()   -- ENQUEUE boundary: a capability-blocked
--      draft cannot enter the queue (per-row RETURN NULL, NEVER an exception --
--      cron jobid 48 bulk-enqueues every 5 minutes in one multi-row INSERT, and a
--      raise would abort the batch for every client). Unknown draft provenance is
--      RETAINED with a visible reason, not dropped.
--   2. m.publisher_lock_queue_v2()      -- DEQUEUE boundary: a blocked draft is
--      never handed to a publisher even if a row arrived via legacy data, manual
--      mutation or a race. Inherited by facebook + instagram (through the pure
--      delegating wrapper m.publisher_lock_queue_v1) and by linkedin-zapier
--      (which calls v2 directly) with NO edge-function change on those three.
--   3. m.auto_approver_fetch_drafts()   -- guards auto-approval BEFORE it sets
--      'approved', so approval can never be used to launder a blocked draft.
--
--   YouTube is NOT covered here: it bypasses the lock queue entirely and is
--   handled by two edits in supabase/functions/youtube-publisher/index.ts.
--
-- FAIL-CLOSED ON UNKNOWN PROVENANCE (PK ruling): the dequeue guard is an
-- EXISTS-must-match, so NULL post_draft_id, a dangling post_draft_id, and a
-- blocked draft ALL fail closed through one positive test. Live at authoring:
-- 835 queue rows, 0 with NULL post_draft_id -- no valid live behaviour is changed.
--
-- ZERO table DDL. No GRANT/REVOKE. All three functions keep their existing
-- SECURITY DEFINER / owner / search_path posture (CREATE OR REPLACE preserves ACL).
--
-- BASELINE PROVENANCE -- this repo has NO tracked migration for
-- publisher_lock_queue_v1/v2; the bodies below were pulled live via prosrc on
-- 2026-07-29 and are asserted by md5 in the generator:
--   publisher_lock_queue_v2    d3fa9f82937ad7f9cbad79ad21ce0b46
--   auto_approver_fetch_drafts 1bf1dbf52ce56fd51b2f81c059dcfe29
--   gate_queue_on_asset_status (no prior hash on record; captured this lane)
-- The paired ROLLBACK file doubles as the provenance backfill for all three.
--
-- ROLLBACK: supabase/migrations/ROLLBACK_20260729173000_s9_publisher_enforcement.sql
-- =====================================================================

BEGIN;

-- G-4 (db-rls-auditor): EXECUTABLE drift guard. The baselines are asserted at APPLY
-- time, not merely documented in a header comment. If any of the three bodies has
-- drifted since authoring, this transaction ABORTS instead of silently clobbering it.
-- (The authoring-time equivalent of this check already caught a real transcription
-- drift during this lane's dry runs, which is the argument for making it executable.)
DO $guard$
DECLARE
  r        record;
  expected text;
  n        int := 0;
BEGIN
  FOR r IN
    SELECT p.proname, md5(p.prosrc) AS live
      FROM pg_proc p JOIN pg_namespace n2 ON n2.oid = p.pronamespace
     WHERE n2.nspname = 'm'
       AND p.proname IN ('publisher_lock_queue_v2','auto_approver_fetch_drafts','gate_queue_on_asset_status')
  LOOP
    expected := CASE r.proname
      WHEN 'publisher_lock_queue_v2'    THEN 'd3fa9f82937ad7f9cbad79ad21ce0b46'
      WHEN 'auto_approver_fetch_drafts' THEN '1bf1dbf52ce56fd51b2f81c059dcfe29'
      WHEN 'gate_queue_on_asset_status' THEN 'f58c2e4daa8288446689a513cb06fd54'
    END;
    IF r.live <> expected THEN
      RAISE EXCEPTION 'STOP: baseline drift on m.% -- live md5 %, expected %', r.proname, r.live, expected;
    END IF;
    n := n + 1;
  END LOOP;
  IF n <> 3 THEN
    RAISE EXCEPTION 'STOP: expected 3 baseline functions, found %', n;
  END IF;
END
$guard$;

-- 1/3 ENQUEUE boundary
CREATE OR REPLACE FUNCTION m.gate_queue_on_asset_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_format       text;
  v_image_status text;
  v_video_status text;
  v_authority    text;
  v_found        boolean;
BEGIN
  -- == S9 OBJECTIVE 2 — ENQUEUE CAPABILITY GUARD (fail-closed) ================
  -- Extends this pre-existing BEFORE INSERT gate (PK ruling 2026-07-29) so a
  -- capability-blocked draft cannot ENTER the publish queue at all. This is the
  -- contamination boundary; m.publisher_lock_queue_v2 carries the publication
  -- boundary. Two boundaries, two different failure modes, deliberately not
  -- treated as redundant.
  --
  -- CRITICAL — THIS TRIGGER MUST NEVER RAISE. cron jobid 48 bulk-enqueues every
  -- 5 minutes with a single multi-row INSERT ... ON CONFLICT DO NOTHING across
  -- ALL clients. An exception here would abort that entire batch, so one blocked
  -- draft would stop enqueue for every client. Suppression is therefore per-row
  -- (RETURN NULL), never an exception.
  SELECT recommended_format, image_status, video_status, final_format_authority
    INTO v_format, v_image_status, v_video_status, v_authority
    FROM m.post_draft
   WHERE post_draft_id = NEW.post_draft_id;
  v_found := FOUND;

  IF NEW.post_draft_id IS NOT NULL AND v_found
     AND v_authority = 'blocked_by_capability' THEN
    -- Contamination prevented: the row never enters the queue. Durable evidence
    -- already exists ON THE DRAFT (final_format_authority + final_format_reason +
    -- resolver_evidence), so suppressing the queue row loses no audit trail.
    RAISE WARNING '[s9-enqueue-guard] suppressed queue INSERT for capability-blocked draft % (client=% platform=%)',
      NEW.post_draft_id, NEW.client_id, NEW.platform;
    RETURN NULL;
  END IF;

  IF NEW.post_draft_id IS NULL OR NOT v_found THEN
    -- Unknown draft provenance. PK ruling: NOT eligible for automatic publish,
    -- but RETAINED for investigation rather than silently dropped. The row is
    -- kept queued and carries a visible reason; m.publisher_lock_queue_v2's
    -- EXISTS guard is what actually holds it back from publishing.
    NEW.last_error := COALESCE(NEW.last_error || ' | ', '')
      || 'capability_hold:unknown_draft_provenance — '
      || CASE WHEN NEW.post_draft_id IS NULL THEN 'post_draft_id IS NULL'
              ELSE 'post_draft row not found' END
      || ' — ineligible for automatic publish (S9 Objective 2, PK ruling 2026-07-29); retained for investigation';
    RAISE WARNING '[s9-enqueue-guard] retained queue row with unknown draft provenance (post_draft_id=%, client=%, platform=%) — held, not publishable',
      NEW.post_draft_id, NEW.client_id, NEW.platform;
  END IF;
  -- == end S9 OBJECTIVE 2 ENQUEUE GUARD ======================================

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

-- 2/3 DEQUEUE boundary
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
      -- == S9 OBJECTIVE 2 — DEQUEUE CAPABILITY GUARD (fail-closed) ==========
      -- A capability-blocked draft must never be published, EVEN IF already
      -- approved and even if a row reached this queue via legacy data, manual
      -- mutation or a race (the enqueue guard in m.gate_queue_on_asset_status is
      -- the other half of this defence; enqueue prevents contamination, dequeue
      -- prevents publication).
      -- This is deliberately an EXISTS-must-match, not a NOT EXISTS: a single
      -- positive test fails closed on ALL THREE unknown-provenance cases at once —
      --   * q.post_draft_id IS NULL      -> no match -> ineligible
      --   * post_draft row missing       -> no match -> ineligible  (dangling link)
      --   * final_format_authority blocked -> no match -> ineligible
      -- PK ruling 2026-07-29: a queue row of unknown draft provenance is NOT
      -- eligible for automatic publish; it is RETAINED (status stays 'queued',
      -- nothing is deleted) for investigation rather than becoming an
      -- undocumented bypass around capability enforcement.
      -- NOTE this does NOT trust approval_status as a safety proxy — capability is
      -- re-checked here on every dequeue, independently, every time.
      and exists (
        select 1
        from m.post_draft pd
        where pd.post_draft_id = q.post_draft_id
          and pd.final_format_authority is distinct from 'blocked_by_capability'
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

-- 3/3 auto-approval boundary
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
      -- == S9 OBJECTIVE 2 — AUTO-APPROVAL CAPABILITY GUARD (fail-closed) ======
      -- Guard auto-approval BEFORE it flips the draft to 'approved' (PK ruling
      -- 2026-07-29). Without this, a capability-blocked draft left at (or returned
      -- to) 'needs_review' is silently re-approved on the next tick, which would
      -- defeat the publisher gates the moment approval_status changed.
      -- This is exactly why the publisher-side gates must not trust
      -- approval_status as a capability proxy.
      AND pd.final_format_authority IS DISTINCT FROM 'blocked_by_capability'
  )
  SELECT
    post_draft_id, client_id, draft_body, draft_title, draft_format,
    approval_status, digest_item_id, final_score, auto_approve_enabled, platform
  FROM ranked
  ORDER BY bucket_rank ASC, final_score DESC NULLS LAST, post_draft_id
  LIMIT p_limit;
$function$;

COMMIT;
