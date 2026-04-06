# ICE — Nightly Audit Report

**Generated:** 2026-04-06 02:00 AEST
**Status:** CRITICAL
**Issues found:** 7 (1 CRITICAL, 3 WARN, 3 INFO)

---

## Summary

The nightly reconciler has not written a fresh sync state since 2026-04-03 04:55 AEST — it has missed three consecutive nightly runs (2026-04-04, 2026-04-05, 2026-04-06). This is the primary critical finding: all pipeline health data below is 3 days stale and must be treated with caution. From the last known state, both clients had active publishing as of 2026-04-03, all 25 edge functions were ACTIVE, all 3 Vercel frontends were READY, and AI calls were running on Anthropic with zero fallback. The pipeline-ai-summary staleness flagged in the 2026-04-03 audit was resolved (health_ok=true, 2026-04-02). Compared to yesterday's ACTION NEEDED status, the situation has escalated to CRITICAL purely due to the reconciler outage — it is not possible to confirm current publishing health, draft pipeline state, or queue depth without a fresh reconciler run.

---

## Findings

1. **[CRITICAL]** Nightly reconciler has not run since 2026-04-03 04:55 AEST — three consecutive nights missed (2026-04-04, 2026-04-05, 2026-04-06). The reconciler is configured to overwrite `docs/00_sync_state.md` at midnight AEST nightly. Without it, this audit operates on 3-day-old data and cannot confirm current publishing health, queue depth, draft pipeline state, or AI usage. All remaining findings are based on stale state and should be verified manually.

2. **[WARN]** NDIS Yarns queue tracking anomaly persists unresolved — `post_publish_queue.last_published_at` = 2026-03-01 (36 days ago as of today), yet 10 drafts transitioned to `published` in the 7-day window ending 2026-04-03. Carry-over from the 2026-04-03 audit. The publisher function appears to be operating but not updating the queue tracking timestamp. Current status unknown due to stale sync state.

3. **[WARN]** Property Pulse last confirmed publish was 2026-04-01 05:05 UTC — 5 days ago as of this audit. With 3-day-old data, it is not possible to confirm whether PP has published since. The 7-day window in the sync state showed 5 PP drafts published (1 image_quote, 1 text, 1 video_short_kinetic, 2 video_short_stat), indicating the pipeline was healthy as of 2026-04-03.

4. **[WARN]** Both clients had 0 `approved` and 0 `needs_review` drafts at the time the sync state was written (2026-04-03). The 2026-04-03 audit attributed this to fast-cycle mode (drafts generated, auto-approved, and published within the same window). That explanation could not be verified at the next audit interval and cannot be confirmed today. If the pipeline has stopped generating new drafts since 2026-04-03, this would be a full pipeline stop — CRITICAL. Requires manual verification.

5. **[INFO]** pipeline-ai-summary resolved — last run 2026-04-02 17:55 UTC with `health_ok=true` and `action_needed=none`. This was a WARN in the 2026-04-03 audit (stale since 2026-03-27, health_ok=false). The hourly cron appears to have resumed. The stale `action_needed` message referencing a PP `post_draft_not_found` issue is no longer present.

6. **[INFO]** Last Creatomate render was 2026-03-31 22:31 UTC — 5+ days ago. No approved drafts have pending or failed images (pipeline clear on approved side). Not currently blocking publishing. The overall 341 pending images across all draft statuses remains unchanged from the 2026-04-03 sync state, suggesting the image pipeline remains dormant for non-approved content.

7. **[INFO]** Monthly AI spend for April: $0.31 across 6 calls (anthropic/claude-sonnet-4-6, 0 fallback). Well within budget. This low figure is consistent with a quietly running pipeline; trend to watch if AI calls remain this low into week 2 of April.

---

## Actions Taken

No automated actions taken.

**Action A assessment:** `stuck_queue_items` (queued with `post_draft_not_found`) = 0 as of 2026-04-03 sync state — condition not met.

**Action B assessment:** `image_status='failed'` count on approved drafts = 0; no approved drafts exist — condition not met.

---

## Recommended Actions for PK

1. **[HIGH — new]** Investigate why the nightly reconciler stopped running after 2026-04-03 04:55 AEST. Check the Cowork scheduled task configuration for the reconciler. Three missed runs means three days of blind-spot in pipeline health. Until the reconciler is restored, the auditor cannot function effectively. Check Cowork > Scheduled Tasks for the reconciler task status and last run time.

2. **[MED — new]** Once the reconciler is restored, manually verify current publishing health for both clients before the next automated audit. Specifically confirm: (a) has NDIS Yarns published since 2026-04-03, (b) has PP published since 2026-04-01, (c) are new drafts being generated in the fast-cycle pipeline. A quick query to confirm:
   ```sql
   SELECT client_id, COUNT(*) AS published_last_7d, MAX(updated_at) AS last_published
   FROM m.post_draft
   WHERE approval_status = 'published'
     AND updated_at > NOW() - INTERVAL '7 days'
   GROUP BY client_id;
   ```

3. **[MED — carry-over]** Resolve NDIS Yarns queue tracking anomaly. The `post_publish_queue.last_published_at` has been stale since 2026-03-01 despite confirmed publishing activity. Check publisher function logs around a recent NDIS publish event to determine why the queue record is not being updated.

4. **[LOW — carry-over]** Confirm fast-cycle draft pipeline is intentional. If auto-approver and ai-worker are running on a tight schedule that leaves the queue empty at 2am audit time, document this as expected behaviour in the reconciler so the audit check can be adjusted.

5. **[LOW — carry-over]** Clean up 55 orphaned `post_draft` records with `client_id=NULL` (all `approval_status='published'`, `image_status` mostly `skipped`). Not a pre-approved action — PK to review before executing:
   ```sql
   UPDATE m.post_draft
   SET approval_status = 'dead',
       dead_reason = 'orphaned — NULL client_id, cleaned by auditor 2026-04-06'
   WHERE client_id IS NULL;
   ```

6. **[LOW — carry-over]** Mark 5 NDIS compliance queue items as reviewed in the dashboard (Monitor > Compliance). AI analysis is complete — awaiting manual sign-off only.

---

## Stats Snapshot

| Metric | Value |
|---|---|
| NDIS posts published (24h) | Unknown — sync state 3 days stale |
| PP posts published (24h) | Unknown — sync state 3 days stale |
| NDIS new drafts (7d, as of 2026-04-03) | 10 |
| PP new drafts (7d, as of 2026-04-03) | 5 |
| Images pending (approved drafts) | 0 |
| Images pending (all drafts) | 341 |
| Last Creatomate render | 2026-03-31 22:31 UTC (5+ days ago) |
| AI calls (24h, as of 2026-04-02) | 6 (anthropic/claude-sonnet-4-6) |
| AI fallback rate (24h) | 0% |
| Monthly AI cost (April) | $0.31 |
| Queue depth (queued) | 0 (as of 2026-04-03) |
| Edge functions active | 25 / 25 (as of 2026-04-03) |
| Vercel frontends healthy | 3 / 3 READY (as of 2026-04-03) |
| pipeline-ai-summary health_ok | true (2026-04-02 17:55 UTC) — resolved |
| Dead letter (7d housekeeping) | 67 (all planned cleanup — not pipeline failures) |

---

## Raw State Reference

Reconciler last run: 2026-04-03 04:55 AEST (3 days ago — STALE)
Previous audit status: ACTION NEEDED (2026-04-03) — 0 CRITICAL, 3 WARN, 2 INFO
Changes since previous audit: Reconciler stopped running (3 nights missed) — escalated to CRITICAL; pipeline-ai-summary resolved (WARN cleared); NDIS queue tracking anomaly persists; PP last known publish 2026-04-01 (5 days ago).
