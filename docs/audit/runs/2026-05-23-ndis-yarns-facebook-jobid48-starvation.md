# Evidence Memo — NDIS Yarns Facebook outage / `facebook.enqueue.jobid48_head_of_line_starvation`

**Date:** 2026-05-23
**Severity:** act_now (publishing outage — one client/platform dark since ~8 May)
**Mode:** read-only (no deploy, no Supabase mutation, no queue rows created, no enqueue RPC called, no dead rows touched)
**Supabase project:** `mbkmaxqhsohbtwsqolns` (content_engine)
**Pool key (recommended):** `facebook.enqueue.jobid48_head_of_line_starvation`
**Client:** ndis-yarns (`fb98a472-ae4d-432d-8738-2273231c1ef4`), platform `facebook`

This memo records a CCH read-only diagnosis, **independently re-confirmed this session via read-only SQL** (all values below verified against production catalog/data).

---

## 1. Problem statement

NDIS Yarns Facebook is dark. Approved May drafts are never enqueued, so nothing publishes. The cause is **head-of-line starvation in jobid 48** (`enqueue-publish-queue-every-5m`): the enqueuer selects exactly **one oldest candidate per (client, platform)** via `DISTINCT ON`, and the current NDIS Yarns/Facebook winner is a **poison draft** (`0de778a9`, created 2026-04-17) whose `computed_scheduled_for` is `NULL`. It is selected every run, then discarded by an **outer** `WHERE computed_scheduled_for IS NOT NULL`, never enqueues, never publishes, and therefore stays eligible forever — permanently blocking the 10 valid May drafts behind it.

## 2. Timeline

- **2026-05-07 22:00:52 UTC** — last successful NDIS Yarns Facebook publish (confirmed: `MAX(published_at)` in `m.post_publish` for client+platform, `status='published'`).
- **~2026-05-08 08:00 AEST** — corresponds to that publish (22:00 UTC + 10h); matches the visible "last post" on the Facebook page.
- **2026-05-09 → 2026-05-20** — 10 NDIS Yarns Facebook drafts approved (one per day, created 22:00 UTC each), **0 queue rows, 0 publish attempts**. These are the starved drafts:

  | post_draft_id | created_at (UTC) | format |
  |---|---|---|
  | `bdfe191f-c0a3-4ad3-bb95-594567951aff` | 2026-05-09 22:00 | text |
  | `f30a9464-7bca-4d7a-a08b-e646fa6b131e` | 2026-05-10 22:00 | image_quote |
  | `2107a1e2-4647-40f3-aa60-3d3803a1745f` | 2026-05-11 22:00 | image_quote |
  | `0306954c-b7d2-4cc3-b082-90fefaa394a3` | 2026-05-12 22:00 | image_quote |
  | `00d24a7d-d5ae-4036-8562-cfc4db38eafc` | 2026-05-13 22:00 | image_quote |
  | `04ff4804-5f68-478f-a448-76abfbbb9f81` | 2026-05-16 22:00 | text |
  | `4653d4e4-becd-40f6-bf08-46e41c860de7` | 2026-05-17 22:00 | image_quote |
  | `f0311623-1a88-42fc-8b4e-f999f6d21da8` | 2026-05-18 22:00 | text |
  | `2714233f-1fc6-4ba0-b2d8-88fa49f14e36` | 2026-05-19 22:00 | image_quote |
  | `9d3b2e65-3206-4e7a-8739-dcb5675a3875` | 2026-05-20 22:00 | text |

  (Query: approved facebook drafts for the client, `created_at >= '2026-05-08'`, `NOT EXISTS` a `m.post_publish_queue` row — returned exactly these 10.)

## 3. Exonerated non-causes

- **Not the Facebook insights token.** Insights/token health is orthogonal to enqueue; the failure is upstream of publishing — drafts never reach the queue.
- **Not a platform-visible mismatch.** The starved drafts are correctly `platform='facebook'` for the NDIS Yarns client; this is not the IG-style cross-post / platform-tag bug.
- **Not `dead_letter_sweep`.** The 10 May drafts are not dead — they have `approval_status='approved'` and simply have no queue row. The sweep is not removing live work.
- **Not M8/M11 dead rows needing requeue.** The dead rows are deliberately terminal (see §6); requeuing them is **not** the fix and is explicitly forbidden.
- **Not an auto-approver enqueue failure.** Auto-approver is **approve-only by design** — it does not enqueue. The enqueue step is jobid 48's job, and that is where the break is.

## 4. Confirmed root cause

**jobid 48 = `enqueue-publish-queue-every-5m`** (`schedule */5 * * * *`, `active=true`). Its body (verified via `cron.job.command`) is structurally:

```sql
WITH candidates AS (
  SELECT j.ai_job_id, j.post_draft_id, j.client_id, j.platform,
         COALESCE(pd.scheduled_for, s.scheduled_publish_at) AS computed_scheduled_for
  FROM (
    SELECT DISTINCT ON (j2.client_id, j2.platform)        -- ← one row per client/platform
      j2.ai_job_id, j2.post_draft_id, j2.client_id, j2.platform
    FROM m.ai_job j2
    JOIN m.post_draft pd2 ON pd2.post_draft_id = j2.post_draft_id
    WHERE j2.status = 'succeeded'
      AND j2.post_draft_id IS NOT NULL
      AND pd2.approval_status IN ('approved','scheduled','published')
      AND NOT EXISTS (SELECT 1 FROM m.post_publish_queue q WHERE q.post_draft_id = j2.post_draft_id)
      AND NOT EXISTS (SELECT 1 FROM m.post_publish p WHERE p.post_draft_id = j2.post_draft_id AND p.status='published')
      AND ( /* F-PUB-010 hard cap: queued count < max_queued_per_platform (default 10) */ )
    ORDER BY j2.client_id, j2.platform, j2.created_at ASC   -- ← picks the OLDEST
  ) j
  JOIN m.post_draft pd ON pd.post_draft_id = j.post_draft_id
  LEFT JOIN m.slot s ON s.slot_id = pd.slot_id
)
INSERT INTO m.post_publish_queue (...)
SELECT ... FROM candidates
WHERE computed_scheduled_for IS NOT NULL   -- ← OUTER filter, applied AFTER DISTINCT ON
ON CONFLICT (post_draft_id, platform) DO NOTHING;
```

**The mechanism:**
1. The inner subquery uses `DISTINCT ON (client_id, platform) ... ORDER BY ... created_at ASC` → it emits the **single oldest** eligible draft per client/platform, and nothing else.
2. The `computed_scheduled_for IS NOT NULL` guard is in the **outer** query — it runs **after** `DISTINCT ON` has already collapsed the set to one row.
3. The NDIS Yarns/Facebook winner is the **poison draft `0de778a9-5518-42a0-8435-d19ca844aa82`** (created 2026-04-17 06:50 UTC, approved 2026-05-02 18:50 UTC, `recommended_format=image_quote`). It satisfies every inner predicate (succeeded job, approved, no queue row, never published, under cap) and is the oldest, so it always wins `DISTINCT ON`.
4. Its schedule is unresolvable: confirmed `pd.scheduled_for = NULL`, `pd.slot_id = NULL`, `s.scheduled_publish_at = NULL` ⇒ `computed_scheduled_for = NULL`. The outer filter therefore **discards it every run**, inserting 0 rows.
5. Because it never gets a queue row and is never published, it remains eligible on the **next** run, and the next, forever. The 10 newer May drafts — which **do** have a resolvable `computed_scheduled_for` — are never even considered, because `DISTINCT ON` never emits more than the one oldest per client/platform.

**Failing predicate:** `WHERE computed_scheduled_for IS NOT NULL`, evaluated post-`DISTINCT ON`. **Poison row:** `0de778a9`.

## 5. Repair options (for PK decision — none executed here)

1. **Move the `computed_scheduled_for IS NOT NULL` test ahead of `DISTINCT ON`** (the surgical fix). Compute the schedule inside the inner subquery (join `post_draft`/`slot` there) and add `AND COALESCE(pd2.scheduled_for, s2.scheduled_publish_at) IS NOT NULL` to the inner `WHERE`. Then `DISTINCT ON` picks the oldest **schedulable** draft, so an unschedulable poison row can never occupy the single per-client/platform slot. Eliminates the starvation class, not just this instance.
2. **Rethink / drop the `DISTINCT ON` throughput cap.** As written, the enqueuer admits at most one draft per client/platform per 5-min tick; combined with the F-PUB-010 `max_queued_per_platform` cap this is the real limiter and the starvation vector. Consider a windowed/`LIMIT`-per-partition admission up to the queued cap so a single stuck row cannot block a partition.
3. **Resolve or void the poison draft `0de778a9`.** Give it a resolvable schedule, or move it to a terminal state, so it stops winning `DISTINCT ON`. (Targeted, but only clears this one instance; the class persists without option 1/2.)
4. **Controlled backfill of only the 10 May drafts** listed in §2 — enqueue exactly those, nothing else. (A mutation; PK-approved only. Pair with option 1/2 so the fix holds, otherwise the poison row re-blocks the next cohort.)

## 6. Hard warning — do NOT requeue the m8_* dead rows

NDIS Yarns/Facebook has **113 `dead` queue rows**, of which **110 carry an `m8_*` marker** and were killed deliberately:

| dead reason | count |
|---|---|
| `m8_cutover_legacy_path_deprecated` | 97 |
| `m8_m11_bloat_window_2026-04-17` | 13 |
| `post_draft_not_found_orphan_F-PUB-006_2026-05-03` | 2 |
| `F-PUB-005_premature_enqueue_unblocks_F-PUB-006_2026-05-03` | 1 |

The **110 `m8_*` rows are the deprecated-legacy / bloat-window cohort and must stay dead.** Requeuing them would re-flood the live NDIS Yarns Facebook page with stale April content. The outage fix is the §5 enqueue-logic repair plus a controlled 10-draft backfill — **not** resurrecting dead rows.

## 7. Recommended pool key

```
facebook.enqueue.jobid48_head_of_line_starvation
```

## 8. Evidence (CCH read-only run; re-confirmed this session, read-only)

- `cron.job` jobid 48 → `enqueue-publish-queue-every-5m`, `active=true`, `*/5`, body quoted in §4 (`DISTINCT ON` + outer `computed_scheduled_for IS NOT NULL`).
- `m.post_draft` `0de778a9-5518-42a0-8435-d19ca844aa82` → ndis-yarns/facebook/approved/image_quote, created 2026-04-17 06:50 UTC; `scheduled_for=NULL`, `slot_id=NULL`, `slot.scheduled_publish_at=NULL` ⇒ `computed_scheduled_for=NULL`.
- 10 approved facebook drafts (2026-05-09→2026-05-20) for the client with `NOT EXISTS` queue row (listed §2).
- `MAX(published_at)` for client+facebook+published = 2026-05-07 22:00:52 UTC.
- `m.post_publish_queue` status breakdown for client+facebook: `dead`=113, `published`=56; dead-reason breakdown in §6 (110 `m8_*`).

## 9. No production mutation occurred

Read-only throughout: `SELECT`/catalog reads via Supabase MCP `execute_sql` only. No deploy, no cron change, no queue rows created, no enqueue RPC called, no dead rows touched, no Supabase mutation, no `friction.case`/`friction.event` write, Q-005 left open, cc-0015 not started. Memo persisted via local git only (not the GitHub bridge write path).
