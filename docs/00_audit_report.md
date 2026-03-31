# ICE — Nightly Audit Report

**Generated:** 2026-04-01 02:00 AEST
**Status:** ACTION NEEDED
**Issues found:** 3 (0 CRITICAL, 1 WARN, 2 INFO)

---

## Summary

Both clients published overnight — Property Pulse produced 3 posts and NDIS Yarns produced 1 post in the last 24 hours, with all edge functions active and no queue errors. The main flag is a stale `paused_until` value on NDIS Yarns' publish profile (set to 2026-03-01, long expired) that should be cleared as a housekeeping item. The image-worker CRITICAL trigger was investigated and found to be a false positive: the 6 Property Pulse posts with `image_status='pending'` are stale records from February 11–12 that missed their scheduled window by 7 weeks and were not captured in the March 31 bulk cleanup; they are not active posts awaiting generation. This is the first audit run — no prior report available for trend comparison.

---

## Findings

1. **[WARN]** NDIS-Yarns publish profile has a stale `paused_until` value set to 2026-03-01 UTC (7 weeks past). Publishing is proceeding normally — 1 post published in 24h, 11 in the last 7 days — so this is a data hygiene issue only, not an operational one. The ICE Control Room UI may be displaying a misleading pause indicator.

2. **[INFO]** 6 Property Pulse posts in `approval_status = 'scheduled'` with `image_status = 'pending'` have `scheduled_for` dates of 2026-02-11 to 2026-02-12. These are 7-week-old orphaned records that were not included in the 2026-03-31 bulk cleanup. They pose no operational risk (their publish window is long past) but should be dead-lettered to clean up the backlog.

3. **[INFO]** 4 post_draft records with `client_id = NULL` exist in `needs_review` status with `image_status = 'pending'`. Origin is unclear — likely test records or orphaned ingestion artefacts. Low priority but worth investigating.

---

## Actions Taken

No automated actions taken.

**Action A assessment:** No `post_draft_not_found` errors found in `m.post_publish_queue` — condition not met.

**Action B assessment:** `image_status = 'failed'` count = 0 — condition not met.

---

## Recommended Actions for PK

1. **[MEDIUM — housekeeping]** Clear the stale `paused_until` value on the NDIS Yarns publish profile. Publishing is unaffected, but the value is confusing in the UI.
   ```sql
   UPDATE m.client_publish_profile
   SET paused_until = NULL,
       paused_reason = NULL
   WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4';
   ```

2. **[LOW — housekeeping]** Dead-letter the 6 stale PP `scheduled` posts from February 11–12 that have been sitting with `image_status = 'pending'` for 7 weeks. Their `scheduled_for` dates are long past and they were missed by the March 31 bulk cleanup.
   ```sql
   UPDATE m.post_draft
   SET approval_status = 'dead',
       dead_reason = 'stale scheduled post — missed Feb 11-12 window, image never generated, cleared by auditor 2026-04-01'
   WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
     AND approval_status = 'scheduled'
     AND image_status = 'pending'
     AND scheduled_for < '2026-03-01';
   ```

3. **[LOW — investigate]** 4 `post_draft` records with `client_id = NULL` are in `needs_review` with `image_status = 'pending'`. Identify origin (possibly test/ingest artefacts) and clean up if not needed.

---

## Stats Snapshot

| Metric | Value |
|---|---|
| NDIS posts published (24h) | 1 |
| PP posts published (24h) | 3 |
| Images pending (active drafts) | 10 (6 stale PP Feb, 2 NDIS needs_review, 2 null needs_review) |
| Image failed count | 0 |
| Last render | 2026-03-20 13:00 UTC (succeeded, carousel) |
| AI calls (24h) | 8 (Anthropic claude-sonnet-4-6) |
| AI fallback rate (24h) | 0% |
| Monthly AI cost (April to date) | $0.06 (2 calls — month just rolled over) |
| Queue depth | 0 (both clients) |
| Edge functions active | 25 / 25 |
| Vercel frontends healthy | 3 / 3 |
| pipeline-ai-summary health_ok | true |
| Dead letter (24h) | 61 — deliberate bulk cleanup 2026-03-31, not an error |

---

## Raw State Reference

Reconciler last run: 2026-03-31 14:00 UTC (midnight AEST 2026-04-01)
Previous audit status: N/A — first run
