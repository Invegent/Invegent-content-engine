# ICE — Nightly Audit Report

**Generated:** 2026-04-03 02:00 AEST
**Status:** ACTION NEEDED
**Issues found:** 5 (0 CRITICAL, 3 WARN, 2 INFO)

---

## Summary

Both clients published overnight — NDIS Yarns and Property Pulse each had 2 posts published in the last 24 hours. All 25 edge functions are ACTIVE, all 3 Vercel frontends are READY, and AI calls are running on Anthropic with zero fallback. The draft pipeline remains nominally empty (0 needs_review, 0 approved) for the second consecutive night, but publishing continues, indicating a fast generation-to-publish cycle rather than a true stop. Two new concerns this audit: pipeline-ai-summary has not generated a new entry in 6 days (last: 2026-03-27), and no Creatomate renders have occurred in 13 days (last: 2026-03-20). Neither is blocking publishing today, but both indicate degraded observability and image generation capability. The 55 orphaned NULL client_id drafts from yesterday's report persist unchanged.

---

## Findings

1. **[WARN]** Draft pipeline empty for second consecutive night — 0 `needs_review` and 0 `approved` drafts for both clients. Yesterday's report flagged this as WARN with instruction to escalate if persistent. However, both clients published 2 posts each in the last 24h, and new drafts were generated in the last 7 days (NDIS: 10, PP: 5). The pipeline is operating in a fast-cycle mode where drafts are generated, auto-approved, and published within the same window, leaving the queue empty at audit time. Not escalating to CRITICAL — but this pattern should be confirmed as intentional.

2. **[WARN]** pipeline-ai-summary last generated 2026-03-27 23:55 UTC (6 days ago) with `health_ok=false`. The function is configured to run hourly at :55 but no new rows exist in `m.pipeline_ai_summary` since 2026-03-27. This means the hourly cron trigger may have stopped, the function may be failing silently, or the pg_cron invoking it may have been disabled. The stale `action_needed` message references a PP `post_draft_not_found` issue from 2026-03-27 which has since been resolved (that queue item is now dead-lettered).

3. **[WARN]** Last Creatomate render was 2026-03-20 12:30 UTC (13 days ago). No image generation activity in nearly 2 weeks. 341 drafts have `image_status='pending'` across all statuses, though 0 approved drafts have pending or failed images. Posts are publishing with `image_status='skipped'`. The image-worker function is ACTIVE but appears not to be picking up work. This may be by design if the current publishing flow skips images, but the 341 pending backlog suggests the image pipeline is dormant.

4. **[INFO]** 55 `post_draft` records with `client_id=NULL` persist — all `approval_status='published'`, `image_status` mostly `skipped`. These are orphaned records from earlier pipeline iterations (oldest: 2026-03-15). Not urgent but should be cleaned up to avoid polluting metrics.

5. **[INFO]** Compliance queue has 5 pending NDIS items with AI analysis complete — awaiting manual mark-reviewed in the dashboard (Monitor > Compliance). Carry-over from previous audits.

---

## Actions Taken

No automated actions taken.

**Action A assessment:** `stuck_queue_items` (queued with `post_draft_not_found`) = 0 — condition not met. There is 1 dead item with that error, already correctly dead-lettered.

**Action B assessment:** `image_status='failed'` count on approved drafts = 0; no approved drafts exist — condition not met.

---

## Recommended Actions for PK

1. **[MED — new]** Investigate pipeline-ai-summary silence. No new summaries since 2026-03-27. Check whether the hourly cron trigger for `pipeline-ai-summary` is still active:
   ```sql
   SELECT jobid, schedule, active, jobname, command
   FROM cron.job
   WHERE jobname ILIKE '%summary%' OR command ILIKE '%summary%';
   ```
   If the cron is active, check edge function logs for `pipeline-ai-summary` for errors in the last 7 days.

2. **[MED — new]** Investigate image-worker dormancy. Last render was 13 days ago despite 341 pending images. Confirm whether the current publishing flow intentionally skips images, or if image-worker's cron/trigger has stopped:
   ```sql
   SELECT jobid, schedule, active, jobname, command
   FROM cron.job
   WHERE jobname ILIKE '%image%' OR command ILIKE '%image%';
   ```

3. **[LOW — carry-over]** Investigate NDIS queue tracking anomaly. The pipeline is publishing NDIS posts but `post_publish_queue.last_published_at` may be stale. Check publisher function logs around a recent NDIS publish event.

4. **[LOW — carry-over]** Clean up 55 orphaned `post_draft` records with `client_id=NULL`:
   ```sql
   UPDATE m.post_draft
   SET approval_status = 'dead',
       dead_reason = 'orphaned — NULL client_id, cleaned by auditor 2026-04-03'
   WHERE client_id IS NULL;
   ```
   Note: This is NOT a pre-approved action — PK should review before executing.

5. **[LOW — carry-over]** Mark 5 compliance queue items as reviewed in dashboard (Monitor > Compliance).

---

## Stats Snapshot

| Metric | Value |
|---|---|
| NDIS posts published (24h) | 2 |
| PP posts published (24h) | 2 |
| NDIS new drafts (7d) | 10 |
| PP new drafts (7d) | 5 |
| Images pending (all drafts) | 341 |
| Images pending (approved only) | 0 |
| Image failed count | 0 |
| Last Creatomate render | 2026-03-20 12:30 UTC (13 days ago) |
| AI calls (24h) | 6 (anthropic/claude-sonnet-4-6) |
| AI fallback rate (24h) | 0% |
| Monthly AI cost (April) | $0.31 |
| Queue depth (queued) | 0 |
| Queue dead items (total) | 1 |
| Edge functions active | 25 / 25 |
| Vercel frontends healthy | 3 / 3 (all READY) |
| pipeline-ai-summary health_ok | false (stale — 2026-03-27) |
| Dead letter (7d) | 1 |

---

## Raw State Reference

Reconciler last run: 2026-04-02 (end-of-session reconciliation)
Previous audit status: HEALTHY (2026-04-02) — 0 CRITICAL, 1 WARN, 2 INFO
Changes since yesterday: pipeline-ai-summary staleness newly detected (6 days); image-worker dormancy newly detected (13 days); draft pipeline empty pattern persists (day 2); publishing continues normally for both clients.
