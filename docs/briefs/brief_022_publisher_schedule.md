# Claude Code Brief 022 — Publisher Schedule Wiring

**Date:** 12 April 2026
**Status:** READY TO RUN
**Repo:** `Invegent-content-engine`
**Working directory:** `C:\Users\parve\Invegent-content-engine`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** Supabase MCP, GitHub MCP
**Estimated time:** 1–2 hours

---

## What this builds

`c.client_publish_schedule` has schedule data for NDIS Yarns and Property Pulse
(Mon–Sat, specific times in Australia/Sydney). The publisher is ignoring it —
every approved draft is queued with `scheduled_for = now()`.

This brief wires the schedule into the queue. Posts will now land at the
configured times instead of immediately.

---

## Verified data

```
NDIS Yarns schedule (facebook):
  Mon 08:00, Tue 12:00, Wed 19:00, Thu 08:00, Fri 12:00, Sat 10:00

Property Pulse schedule (facebook):
  Mon 07:30, Tue 12:00, Wed 07:30, Thu 12:00, Fri 17:00, Sat 10:00

All clients timezone: Australia/Sydney
day_of_week: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat (matches PostgreSQL DOW)
Care For Welfare: no schedule rows (fallback to now() + 5min)
```

---

## Task 1 — Create get_next_scheduled_for() function

This function finds the next publish slot for a given client + platform,
respecting the gap between the last queued item.

```sql
CREATE OR REPLACE FUNCTION public.get_next_scheduled_for(
  p_client_id UUID,
  p_platform  TEXT,
  p_from_utc  TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_timezone        TEXT        := 'Australia/Sydney';
  v_min_gap         INTEGER     := 60;
  v_last_queued     TIMESTAMPTZ;
  v_effective_from  TIMESTAMPTZ;
  v_result          TIMESTAMPTZ;
BEGIN
  -- Client timezone
  SELECT COALESCE(timezone, 'Australia/Sydney')
  INTO v_timezone
  FROM c.client WHERE client_id = p_client_id;

  -- Min gap from publish profile (default 60 min)
  SELECT COALESCE(min_gap_minutes, 60)
  INTO v_min_gap
  FROM c.client_publish_profile
  WHERE client_id = p_client_id AND platform = p_platform
  LIMIT 1;

  -- Last slot already in queue (avoid stacking)
  SELECT MAX(scheduled_for)
  INTO v_last_queued
  FROM m.post_publish_queue
  WHERE client_id = p_client_id
    AND platform   = p_platform
    AND status IN ('queued', 'running');

  -- Effective search start: latest of p_from_utc and last_queued + gap
  v_effective_from := GREATEST(
    p_from_utc,
    COALESCE(v_last_queued, p_from_utc - INTERVAL '1 day') + (v_min_gap || ' minutes')::INTERVAL
  );

  -- Find the next enabled schedule slot after v_effective_from.
  -- Generate dates for the next 14 days in local timezone,
  -- join to schedule, pick the first matching slot that is in the future.
  SELECT
    (gs + cps.publish_time) AT TIME ZONE v_timezone
  INTO v_result
  FROM
    generate_series(
      (v_effective_from AT TIME ZONE v_timezone)::date,
      (v_effective_from AT TIME ZONE v_timezone)::date + 14,
      '1 day'::INTERVAL
    ) AS gs,
    c.client_publish_schedule cps
  WHERE cps.client_id = p_client_id
    AND cps.platform   = p_platform
    AND cps.enabled    = true
    AND EXTRACT(DOW FROM gs)::int = cps.day_of_week
    AND (gs + cps.publish_time) AT TIME ZONE v_timezone > v_effective_from
  ORDER BY (gs + cps.publish_time) AT TIME ZONE v_timezone
  LIMIT 1;

  -- Fallback: no schedule configured for this client/platform
  IF v_result IS NULL THEN
    RETURN p_from_utc + INTERVAL '5 minutes';
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_scheduled_for(UUID, TEXT, TIMESTAMPTZ)
  TO service_role, authenticated;
```

**Verify with:**
```sql
-- Should return next Mon/Tue/etc slot for NDIS Yarns in AEST
SELECT public.get_next_scheduled_for(
  'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid,
  'facebook',
  NOW()
);

-- Should return in next 7 days, at one of the configured times
-- (08:00, 12:00, 19:00, 08:00, 12:00, 10:00 AEST)
```

---

## Task 2 — Update draft_approve_and_enqueue

Read the current function first:
```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'draft_approve_and_enqueue'
  AND pronamespace = 'public'::regnamespace;
```

Replace `now()` in the INSERT with `get_next_scheduled_for`:

```sql
-- BEFORE:
VALUES (
  p_draft_id, v_client_id, COALESCE(v_platform, 'facebook'), 'queued', now(), 0
);

-- AFTER:
VALUES (
  p_draft_id,
  v_client_id,
  COALESCE(v_platform, 'facebook'),
  'queued',
  public.get_next_scheduled_for(v_client_id, COALESCE(v_platform, 'facebook'), NOW()),
  0
);
```

Create or replace the full function with this change applied.

---

## Task 3 — Update draft_approve_and_enqueue_scheduled

Read the current function:
```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'draft_approve_and_enqueue_scheduled'
  AND pronamespace = 'public'::regnamespace;
```

The fallback in `v_enqueue_at` currently falls back to `now()`:
```sql
v_enqueue_at := COALESCE(
  p_scheduled_for,
  (SELECT scheduled_for FROM c.content_series_episode WHERE post_draft_id = p_draft_id LIMIT 1),
  now()
);
```

Replace `now()` with the schedule function:
```sql
v_enqueue_at := COALESCE(
  p_scheduled_for,
  (SELECT scheduled_for FROM c.content_series_episode WHERE post_draft_id = p_draft_id LIMIT 1),
  public.get_next_scheduled_for(v_client_id, COALESCE(v_platform, 'facebook'), NOW())
);
```

Create or replace the full function with this change applied.

---

## Task 4 — Update enqueue-publish-queue-every-5m cron

This cron job picks up auto-approved drafts. Currently uses `COALESCE(pd.scheduled_for, now())`.

Replace the cron command to use `get_next_scheduled_for` as fallback, AND limit to
1 item per client per platform per run (prevents multiple items getting same slot):

```sql
-- Delete the old job
SELECT cron.unschedule('enqueue-publish-queue-every-5m');

-- Recreate with schedule-aware fallback and per-client limit
SELECT cron.schedule(
  'enqueue-publish-queue-every-5m',
  '*/5 * * * *',
  $$
  INSERT INTO m.post_publish_queue
    (ai_job_id, post_draft_id, client_id, platform, scheduled_for, status)
  SELECT
    j.ai_job_id,
    j.post_draft_id,
    j.client_id,
    j.platform,
    COALESCE(
      pd.scheduled_for,
      public.get_next_scheduled_for(j.client_id, j.platform, NOW())
    ),
    'queued'
  FROM (
    -- One item per client per platform, oldest first
    SELECT DISTINCT ON (j2.client_id, j2.platform)
      j2.ai_job_id, j2.post_draft_id, j2.client_id, j2.platform
    FROM m.ai_job j2
    JOIN m.post_draft pd2 ON pd2.post_draft_id = j2.post_draft_id
    WHERE j2.status = 'succeeded'
      AND j2.post_draft_id IS NOT NULL
      AND pd2.approval_status IN ('approved', 'scheduled', 'published')
      AND NOT EXISTS (
        SELECT 1 FROM m.post_publish_queue q
        WHERE q.post_draft_id = j2.post_draft_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM m.post_publish p
        WHERE p.post_draft_id = j2.post_draft_id AND p.status = 'published'
      )
    ORDER BY j2.client_id, j2.platform, j2.created_at ASC
  ) j
  JOIN m.post_draft pd ON pd.post_draft_id = j.post_draft_id
  ON CONFLICT (post_draft_id) DO NOTHING;
  $$
);
```

**Verify the new job exists:**
```sql
SELECT jobname, schedule, active FROM cron.job
WHERE jobname = 'enqueue-publish-queue-every-5m';
```

---

## Task 5 — Verify with a test

Run a dry-run verification (no inserts):

```sql
-- Simulate what the next scheduled_for would be for each client's next item
SELECT
  c.client_name,
  j.platform,
  public.get_next_scheduled_for(j.client_id, j.platform, NOW()) AS next_slot_utc,
  (public.get_next_scheduled_for(j.client_id, j.platform, NOW()) AT TIME ZONE c.timezone) AS next_slot_local
FROM (
  SELECT DISTINCT client_id, platform
  FROM m.ai_job
  WHERE status = 'succeeded'
  LIMIT 6
) j
JOIN c.client c ON c.client_id = j.client_id
ORDER BY c.client_name, j.platform;
```

Expected: slots that fall on Mon–Sat at the configured AEST times.
For CFW (no schedule): next_slot is now() + 5 minutes (fallback).

---

## Task 6 — Commit result file

Write `docs/briefs/brief_022_result.md` in Invegent-content-engine:
- Task 1: get_next_scheduled_for() created — verification result (next slot for NDIS Yarns)
- Task 2: draft_approve_and_enqueue updated
- Task 3: draft_approve_and_enqueue_scheduled updated
- Task 4: cron job recreated — verification result
- Task 5: dry-run verification results
- Notes

---

## Error handling

- If `generate_series` with date + interval returns timestamps not dates:
  cast to `::date` explicitly: `gs::date + cps.publish_time`

- If DOW mapping differs (e.g. Sunday=0 creates edge case):
  Our schedule has no Sunday rows (days 1–6 only), so Sunday items
  will correctly find no match and look to the following Monday.

- If cron.unschedule fails because job doesn't exist with that name:
  use `SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'enqueue-publish-queue-every-5m'`

- If `ON CONFLICT (post_draft_id)` fails because the constraint name differs:
  check the actual constraint name: `SELECT conname FROM pg_constraint WHERE conrelid = 'm.post_publish_queue'::regclass`

- If `min_gap_minutes` is NULL for a client: the function defaults to 60. That's correct.

- Do NOT change the publisher Edge Function. It already correctly processes
  items where `scheduled_for <= now()`. The schedule wiring only affects when
  items are inserted into the queue.

- Do NOT change the `seed-and-enqueue-facebook-every-10m` cron job.
  That feeds the AI worker, not the publish queue.

---

## What this brief does NOT include

- UI in dashboard to show scheduled times on queue items (future)
- Care For Welfare schedule setup (no schedule rows yet — fallback is fine)
- LinkedIn and YouTube schedule support (same function works, no schedule rows yet)
- Sunday publishing (no Sunday rows in schedule — add later if needed)
- Max posts per day enforcement (min_gap_minutes handles effective rate limiting)
