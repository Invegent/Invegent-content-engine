# B-INV-LinkedIn-Queue-Stall — Stage 4 investigation findings

**Brief:** `docs/briefs/2026-05-03-fpub006-zombie-cleanup-cc.md` (Stage 4)
**Investigator:** CC
**Date:** 2026-05-03 (DB clock 2026-05-02 22:51 UTC)
**Status:** Findings only — no remediation per brief Stage 4e

---

## 4a. Source-side eligibility logic

The publisher Edge Function `supabase/functions/linkedin-zapier-publisher/index.ts` (v1.1.0) **does not carry the eligibility query itself.** It delegates row selection to:

```ts
const { data: lockedRows, error: lockErr } = await supabase
  .schema('m')
  .rpc('publisher_lock_queue_v2', {
    p_limit: limit,            // default 3 (clamp 1..10)
    p_worker_id: workerId,
    p_lock_seconds: 300,
    p_platform: 'linkedin',
  });
```

The eligibility WHERE clause and ordering both live inside `m.publisher_lock_queue_v2`:

```sql
-- Excerpt — full body retrieved via pg_get_functiondef
WITH eligible AS (
  SELECT q.queue_id, q.client_id, q.platform, q.scheduled_for, q.created_at,
         cpp.destination_id, cpp.min_gap_minutes, cpp.max_per_day,
         stats.last_published_at, stats.published_today,
         row_number() OVER (
           PARTITION BY q.client_id, q.platform
           ORDER BY COALESCE(q.scheduled_for, v_now) ASC, q.created_at ASC
         ) AS rn
  FROM m.post_publish_queue q
  JOIN c.client_publish_profile cpp
    ON cpp.client_id = q.client_id
   AND cpp.platform  = q.platform
  LEFT JOIN LATERAL (
    SELECT MAX(p.created_at) FILTER (WHERE p.status = 'published') AS last_published_at,
           COUNT(*) FILTER (
             WHERE p.status='published'
               AND p.created_at >= date_trunc('day', v_now)
           ) AS published_today
    FROM m.post_publish p
    WHERE p.destination_id = cpp.destination_id
      AND p.created_at >= v_now - INTERVAL '7 days'
  ) stats ON TRUE
  WHERE q.status = 'queued'
    AND (p_platform IS NULL OR q.platform = p_platform)
    AND (q.scheduled_for IS NULL OR q.scheduled_for <= v_now)
    AND (q.locked_at IS NULL
         OR q.locked_at < v_now - make_interval(secs => p_lock_seconds))
    AND cpp.publish_enabled = true
    AND (cpp.paused_until IS NULL OR cpp.paused_until <= v_now)
    AND NOT EXISTS (... another running row with active lock ...)
    AND (cpp.min_gap_minutes IS NULL
         OR stats.last_published_at IS NULL
         OR stats.last_published_at <= v_now - make_interval(mins => cpp.min_gap_minutes))
    AND (cpp.max_per_day IS NULL OR stats.published_today < cpp.max_per_day)
),
picked AS (
  SELECT q.queue_id
  FROM eligible e
  JOIN m.post_publish_queue q ON q.queue_id = e.queue_id
  ORDER BY e.rn ASC, COALESCE(e.scheduled_for, v_now) ASC, e.created_at ASC
  FOR UPDATE OF q SKIP LOCKED
  LIMIT p_limit
)
UPDATE m.post_publish_queue q
SET status='running',
    locked_at = v_now,
    locked_by = p_worker_id,
    attempt_count = COALESCE(q.attempt_count,0) + 1,
    updated_at = v_now
FROM picked
WHERE q.queue_id = picked.queue_id
RETURNING q.*;
```

Key observations:
1. **`attempt_count` is incremented inside the lock RPC.** The 5 stuck rows have `attempt_count IS NULL`, which means the RPC never picked them — they were filtered out of the `eligible` CTE on every tick.
2. The CTE join to `c.client_publish_profile` does **not** filter `is_default`. If multiple cpp rows exist per (client_id, platform), they can amplify rows; for PP-LinkedIn, only 1 row exists, so this is not the issue here (verified: `total_cpp_rows=1`, `enabled_cpp_rows=1`).
3. There is no filter on `approval_status` or `image_status` here — those gates live in the EF itself, after lock. So they cannot explain `attempt_count IS NULL`.

## 4b. Data-side state of the 5 stuck rows

Run via the named-queue_id diagnostic (brief Step 0c + extended state dump):

| queue_id (8) | scheduled_for (UTC) | hours_overdue | attempt_count | locked_at | approval_status | image_status | video_status | publish_enabled | paused_until | total_cpp_rows |
|---|---|---|---|---|---|---|---|---|---|---|
| 479236ad | 2026-05-01 15:30 | 31.4 h | NULL | NULL | approved | pending | failed | true | NULL | 1 |
| cd0db34a | 2026-05-01 16:45 | 30.1 h | NULL | NULL | approved | generated | NULL | true | NULL | 1 |
| 5085087f | 2026-05-01 17:15 | 29.6 h | NULL | NULL | approved | generated | NULL | true | NULL | 1 |
| dd0a25e5 | 2026-05-01 20:45 | 26.1 h | NULL | NULL | approved | generated | NULL | true | NULL | 1 |
| c3a23f32 | 2026-05-01 21:00 | 25.9 h | NULL | NULL | approved | pending | failed | true | NULL | 1 |

All 5 are at: `status='queued'`, no lock, no errors, scheduled at least 25 hours ago.

## Throttle profile and publish history

`c.client_publish_profile` for PP-LinkedIn:
- `is_default = true` · `publish_enabled = true` · `paused_until = NULL`
- `destination_id = urn:li:organization:112999127`
- **`min_gap_minutes = 240`** (4 h between LinkedIn posts)
- **`max_per_day = 2`** (per-day cap)

PP-LinkedIn publish history per UTC day (`destination_id=urn:li:organization:112999127`, status='published', last 7d):

| pub_day (UTC) | published_count | first_pub | last_pub |
|---|---|---|---|
| 2026-04-26 | 2 | 00:00:08 | 00:00:15 |
| 2026-04-27 | 2 | 00:00:07 | 00:00:08 |
| 2026-04-28 | 3 | 00:00:05 | 04:20:03 |
| 2026-04-29 | 3 | 00:00:05 | 04:20:03 |
| 2026-04-30 | 3 | 00:00:08 | 04:00:13 |
| 2026-05-01 | 3 | 00:00:13 | 14:20:03 |
| 2026-05-02 | 3 | 00:00:05 | 00:00:06 |

**Every UTC day has 2 or 3 publishes, all packed into the first 4-14 hours of the day.**

## 4c. Hypothesis (which filter is excluding them)

**Primary hypothesis:** the `cpp.max_per_day=2` filter inside the `eligible` CTE excludes the 5 stuck rows on every publisher tick. Specifically:

1. At each UTC-day rollover (00:00 UTC), `published_today` resets to 0 (because `date_trunc('day', v_now)` is `00:00 UTC` of the new day).
2. The publisher's first tick after rollover (typically within the first 5-15 seconds of the new day, observed at 00:00:05-15 UTC every day) finds **3 eligible rows other than the 5 stuck ones** at the front of the partition by `scheduled_for ASC`.
3. Those 3 rows are locked, `published_today` becomes 3 once they publish, and from that point onward in the same UTC day the filter `published_today < max_per_day` (3 < 2) is FALSE for every subsequent tick — the 5 stuck rows are filtered out.
4. The next day, the cycle repeats: 3 OTHER rows win at 00:00 UTC, 5 stuck rows continue to be filtered. They've never been at the front of the partition at the moment a tick fires with `published_today=0`.

**This explains both** (a) `attempt_count IS NULL` and (b) why the rows have been stuck for 25-31 hours.

**Why the 5 stuck rows have never been first in the partition at a 00:00 UTC tick:** at every day boundary in the last week, OTHER queue rows must have had `scheduled_for <= v_now` AND `scheduled_for ≤ stuck-row scheduled_for`. The 5 stuck rows have scheduled_for = 2026-05-01 15:30-21:00 UTC. So at 2026-05-02 00:00 UTC tick, *those 5 were the oldest scheduled_for in queue at that instant* — they should have been rn=1..5.

**Anomaly worth flagging:** the 3 queue_ids that won at 2026-05-02 00:00 UTC tick — `c2fdafe6-987a-4a09-ba0b-6a915863d9a9`, `3785396b-ddbf-48c0-995a-73f6cfcb3dea`, `2a117aa2-294f-437f-aec4-21f6b45433f8` — do **not exist in `m.post_publish_queue` at the time of this investigation.** A SELECT on those 3 queue_ids (any status) returns 0 rows. Their `m.post_publish` records reference those queue_ids and show `platform_post_id = zapier-li-1777680005321 / 1777680006117 / 1777680006444` (Unix-ms epoch suggesting this same EF was the producer).

If the queue rows that won at 00:00:05 had been hard-deleted afterwards (or never existed and the publish is from a different code path), the publisher_lock_queue_v2 RPC could not have picked them in the normal flow. Either:
- (a) Queue rows were created, picked, published, and then hard-deleted by some cleanup path (unusual — publisher EF only updates status to 'published').
- (b) The 3 publishes came from a non-standard path that writes directly to `m.post_publish` without going through the queue (e.g. backfill, manual operator, cron-triggered RPC).
- (c) FK on `post_publish.queue_id` is not enforced and a stale value was written.

If (b), the throttle counters in the eligible CTE (`stats.published_today` reads `m.post_publish` filtered by `destination_id` and `created_at`) **see those 3 publishes anyway** and exclude the 5 stuck rows from eligibility. That is consistent with the data.

## 4d. Proposed remediation direction (NOT applied — separate brief next session, post PK review)

Three candidate paths, ordered from least to most invasive. PK chooses; do not implement here.

1. **Identify the source of the 3 daily 00:00 UTC publishes.** If they come from a non-publisher_lock_queue_v2 code path (backfill cron, manual operator script, retry path), confirm whether they are the expected behaviour or a leftover. If a leftover, disable the path so the queue's natural ordering wins. The 5 stuck rows would then drain on the next 00:00 UTC tick.
2. **Temporarily raise `cpp.max_per_day` for PP-LinkedIn.** Set to 6-8 for one or two UTC days, observe the 5 stuck rows drain, then restore to 2. Surgical and reversible. Risk: a downstream platform may flag PP-LinkedIn for posting frequency, but the destination has tolerated 3/day for the past 7 days already.
3. **Reset `scheduled_for` on the 5 stuck rows to a value AFTER the next phantom 00:00 UTC publish window** (e.g. 2026-05-03 02:00 UTC). The phantom path consumes its 3, then the 5 stuck rows are eligible against `published_today=3 < max_per_day=2` ... still FAILS. So this path doesn't actually help unless paired with (1) or (2). DO NOT pursue alone.

Recommendation for the next-brief author: option (1) is the right investigation to lead with — the 3 phantom publishes per day are the underlying anomaly. Stage 4 of this brief did not have time to identify the source of those phantom publishes; that's the natural next step.

## 4e. STOP

CC stops here per brief Stage 4e. No remediation drafted, no DML proposed, no code changes. PK reviews findings before next brief.

---

## Investigation queries (reproducible)

1. Source: `pg_get_functiondef('m.publisher_lock_queue_v2'::regprocedure)`
2. cpp profile: `SELECT * FROM c.client_publish_profile WHERE platform='linkedin' AND client_id IN (SELECT client_id FROM c.client WHERE client_slug='property-pulse')`
3. Day-by-day publish count: `SELECT date_trunc('day', created_at), count(*) FROM m.post_publish WHERE destination_id='urn:li:organization:112999127' AND status='published' AND created_at >= now() - interval '7 days' GROUP BY 1 ORDER BY 1 DESC`
4. Stuck-row eligibility check (parameterized over the 5 named queue_ids — see brief Step 0c)
5. Phantom queue_id reverse lookup: `SELECT * FROM m.post_publish_queue WHERE queue_id IN (...)` → returned 0 rows for the 3 today-winners.
