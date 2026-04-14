# Brief 040 Result — YouTube fix + LinkedIn setup (Tasks 1-2 only)

**Executed:** 14 April 2026
**Tasks 3-6 superseded — skipped per instruction**

---

## Task Results

| Task | Status |
|------|--------|
| 1. Confirm youtube-publisher v1.5.0 deployed | COMPLETED — already v1.5.0 |
| 2. Backfill missing YouTube post_publish record | COMPLETED |
| 3-6. LinkedIn setup | SKIPPED (superseded) |

---

## Task 1 — YouTube version check

Deployed version confirmed via GET request: `youtube-publisher-v1.5.0`. No redeploy needed — Git and deployed versions match.

## Task 2 — YouTube backfill

| Field | Value |
|-------|-------|
| Draft | "Two markets, one story: where population growth meets housing supply" |
| Client | Property Pulse |
| YouTube Video ID | KvBzUZIpwTA |
| YouTube URL | https://www.youtube.com/watch?v=KvBzUZIpwTA |
| Published at | 2026-04-01 19:21:06 UTC |
| Backfill attempt_no | 2 (Facebook publish already at attempt_no=1) |

The unique constraint `uq_publish_attempt(post_draft_id, attempt_no)` required using attempt_no=2 since the Facebook publish for the same draft already occupied attempt_no=1. This is correct — each platform publish is a separate attempt.

YouTube engagement data can now be tracked by insights-worker for this video.
