# ICE — Nightly Audit Report

**Generated:** 2026-04-02 03:00 AEST
**Status:** HEALTHY
**Issues found:** 3 (0 CRITICAL, 1 WARN, 2 INFO)

---

## Summary

Both clients published overnight — pipeline-ai-summary confirms 4 NDIS Yarns posts on 2026-04-01 and Property Pulse last published at 05:05 UTC the same day. All 24 edge functions are ACTIVE, all 3 Vercel frontends are READY, no queue errors, no image backlog, and no AI fallback traffic. The pipeline is in a momentarily clean state between generation cycles. Comparing to yesterday (ACTION NEEDED): the stale NDIS `paused_until` value has been cleared and the 6 stale PP February posts were dead-lettered as recommended — good follow-through. The NDIS queue tracking anomaly carries over as an open investigation item.

---

## Findings

1. **[WARN]** Both clients have 0 drafts in `needs_review` or `approved` status — this technically meets the CRITICAL "full pipeline stop" criterion. However, pipeline-ai-summary (generated 2026-04-01 12:55 UTC) reports health_ok=true and 4 NDIS Yarns posts published on 2026-04-01, and Property Pulse last published at 05:05 UTC. This is a clean pipeline between generation cycles, not a true stop. Downgraded to WARN; no action required unless the draft queue remains empty again tomorrow.

2. **[INFO]** NDIS Yarns queue tracking anomaly persists — `post_publish_queue.last_published_at` shows 2026-03-01, while pipeline-ai-summary reports 4 NDIS posts published on 2026-04-01 and the draft table shows 13 `approval_status='published'` records in the last 7 days. This discrepancy is logged as a Known Active Issue (MED priority) and carries over from the previous audit. Likely cause: `approval_status='published'` is set on approval rather than on successful Facebook publish, or `last_published_at` is not being updated by the publisher function.

3. **[INFO]** Status of 4 `post_draft` records with `client_id=NULL` (flagged in yesterday's audit as `needs_review` with `image_status='pending'`) is uncertain — these records are no longer visible in today's sync state, likely because the queue cleared and they fell out of the active query scope. If they still exist, they should be investigated and cleaned up. Worth a manual check: `SELECT id, created_at, approval_status, image_status FROM m.post_draft WHERE client_id IS NULL;`

---

## Actions Taken

No automated actions taken.

**Action A assessment:** Queue depth = 0 for both clients; no `post_draft_not_found` errors in `m.post_publish_queue` — condition not met.

**Action B assessment:** `image_status = 'failed'` count = 0; last Creatomate render was 2026-03-31 22:31 UTC (~15.5h before reconciler) — condition not met.

---

## Recommended Actions for PK

1. **[LOW — carry-over]** Investigate NDIS queue tracking anomaly. The pipeline is publishing NDIS posts but `post_publish_queue.last_published_at` is stuck at 2026-03-01. Determine whether the publisher function updates this field on successful Facebook publish or only on queue row creation. Check the publisher Edge Function logs around a recent NDIS publish event.

2. **[LOW — carry-over]** Confirm whether the 4 `post_draft` records with `client_id=NULL` still exist and clean up if so:
   ```sql
   SELECT id, created_at, approval_status, image_status, dead_reason
   FROM m.post_draft
   WHERE client_id IS NULL;
   ```
   If they are test/ingest artefacts with no value, dead-letter them.

3. **[WATCH — flag if persists]** Draft pipeline is momentarily empty (0 needs_review, 0 approved). If tomorrow's sync state shows the same, escalate to CRITICAL and investigate whether the generation cycle (ai-worker / auto-approver) is firing correctly.

---

## Stats Snapshot

| Metric | Value |
|---|---|
| NDIS posts published (24h) | 4 (per pipeline-ai-summary; queue tracking anomaly noted) |
| PP posts published (24h) | 1 (last: 2026-04-01 05:05 UTC) |
| Images pending | 0 |
| Image failed count | 0 |
| Last render | 2026-03-31 22:31 UTC (video_short_kinetic — succeeded) |
| AI calls (24h) | 3 (anthropic/claude-sonnet-4-6, no fallback) |
| AI fallback rate (24h) | 0% |
| Monthly AI cost (April to date) | $0.00 (month just started; 3 calls / $0.10 fall in March bucket) |
| Queue depth | 0 (both clients) |
| Edge functions active | 24 / 24 |
| Vercel frontends healthy | 3 / 3 |
| pipeline-ai-summary health_ok | true |
| Dead letter (7 days) | 67 — 61 pre-visual-pipeline bulk clear (2026-03-31) + 6 stale PP Feb posts (cleared by auditor 2026-04-01) — no new organic failures |

---

## Raw State Reference

Reconciler last run: 2026-04-01 14:00 UTC
Previous audit status: ACTION NEEDED (2026-04-01) — 0 CRITICAL, 1 WARN, 2 INFO
Resolved since yesterday: stale NDIS `paused_until` cleared ✓ — 6 stale PP Feb posts dead-lettered ✓
