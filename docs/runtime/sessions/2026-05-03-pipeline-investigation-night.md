# 2026-05-03 night Sydney — Pipeline end-to-end investigation

**Trigger**: PK observation that LinkedIn for CFW / NDIS-Yarns / Invegent has been silent 2-3 days; FB silent for CFW + Invegent. PK directed: "investigate tonight end to end pipeline".

**Scope**: read-only investigation. No writes, no applies.

**Closure budget**: ~0.5h chat-side. Trailing-14d 13.8 → ~14.3h. Above 8.0h floor.

---

## TL;DR

The pipeline IS running. Crons are firing. Auto-approver is approving. Slots are filling. Publishers are publishing. **What's not happening is throughput on 4 streams (NDIS-Yarns LinkedIn, CFW LinkedIn, CFW FB, Invegent LinkedIn)** because three structural issues are colliding:

1. **F-AAP-001 backlog avalanche**: ~25 days of drafts piled up at `needs_review` while the auto-approver was broken. F-AAP-001 fix re-approved them en-masse on 2026-05-03 09:30-10:30 UTC.
2. **F-PUB-010 hard-cap blocks the avalanche**: caps of 6-20 per (client, platform). Pre-existing queue depth was already 50-128 on 4 streams (5-15x over cap). New approvals have nowhere to go — `queue_status=null` on ~30+ recent approvals.
3. **Legacy `get_next_scheduled_for` ignores slot intent**: queue rows for slot-driven drafts are scheduled via the legacy spread-forward function, not the slot's `scheduled_publish_at`. A slot saying "publish 4 May 00:00" can produce a queue row saying "publish 21 May".

Plus a recovery-loop pathology specific to CFW LinkedIn (4 slots marked_failed) and 10 stale dead queue rows.

## Publishing snapshot (2026-05-03 ~12:00 UTC)

| Stream | Cap | Queued | Last published | Hours ago | State |
|---|---|---|---|---|---|
| NDIS-Yarns FB | 10 | 105 | 5-3 12:00 | 0.0h | ✅ active, 10x over cap |
| Property Pulse FB | 20 | 3 | 5-3 06:10 | 5.9h | ✅ active |
| Property Pulse LinkedIn | 8 | 72 | 5-3 00:00 | 12.0h | ✅ active, 9x over cap |
| Invegent FB | 10 | 0 | 5-3 10:55 | 1.1h | ✅ active |
| **NDIS-Yarns LinkedIn** | **6** | **50** | **5-1 00:00** | **60h** | 🔴 gap, 8x over cap |
| **CFW Facebook** | **10** | **1** | **4-30 19:15** | **65h** | 🔴 gap |
| **CFW LinkedIn** | **10** | **1** | **4-30 07:20** | **77h** | 🔴 gap, recovery-loop |
| **Invegent LinkedIn** | **10** | **1** | **4-30 03:00** | **81h** | 🔴 gap, 1 pending_fill stuck |
| Invegent IG | 10 | 6 (paused) | 4-25 04:02 | 200h | 🟡 paused (T07) |
| NDIS-Yarns IG | 6 | 128 (paused) | n/a | n/a | 🟡 paused (T07) |
| PP IG | 6 | 111 (paused) | n/a | n/a | 🟡 paused (T07) |
| YouTube (any) | 10 | 0-10 | none | dead | 🟠 OAuth (T06/T11) |
| CFW Website | n/a | n/a | 4-20 06:00 | 318h | 🔴 separate issue |

## Per-stream diagnosis (4 red streams)

### NDIS-Yarns LinkedIn — cap=6, queued=50, gap 60h
- 50 items queued spread to 7 July via legacy `get_next_scheduled_for`. Earliest_due tomorrow 5-4 00:00 UTC.
- 6 slots from 27 Apr to 4 May filled with drafts only auto-approved today (5-3 09:30-10:30) by the F-AAP-001 fix wave.
  - Of these 6 drafts: 3 made it into queue (scheduled 5-4 06:00, 5-4 12:00, 5-4 18:00, 5-5 00:00); 2 (drafts 55d86f32, 75516334) are cap-blocked (`queue_status=null`); 1 slot for 27 Apr 00:00 has `filled` status but `filled_draft_id=NULL` (orphan).
- Publisher (jobid 54, every 20 min) will resume publishing tomorrow when the first item becomes due.
- Visible symptom: 4-day publish gap.

### CFW LinkedIn — cap=10, queued=1, gap 77h, recovery-loop pathology
- **4 slots from 27 Apr to 1 May are `status=failed`, `skip_reason=exceeded_recovery_attempts`** (slots `bd979865`, `f6e56cff`, `b1f55068`, `b6c77804`).
- Forensic pattern: `recover_stuck_slots` (jobid 76) is filling failed slots with drafts that **already have a `post_publish` row from older slots**. Three attempts → marked_failed.
  - Slot `bd979865` scheduled 5-1 03:04 → filled today 5-3 10:10 with draft `ecb7b8e9` → that draft was already published 4-30 07:20.
  - Slot `f6e56cff` scheduled 4-28 07:00 → filled today with draft already published 4-28 11:40.
  - Slot `b1f55068` scheduled 4-28 03:04 → filled today with draft already published 4-27 11:00.
- `pending_fill` slot for tomorrow 5-4 03:04 is intact. Will fill normally.
- Visible symptom: 3-day publish gap that won't self-heal because the 4 in-window slots are now permanently failed.

### CFW Facebook — cap=10, queued=1, gap 65h
- 6 filled slots scheduled 26 Apr - 3 May. Most published successfully (6 publishes recorded in 7d). Slot for 5-3 23:06 has draft, queued for today 12:50 — will publish at next cron tick (jobid 7, every 5 min).
- 1 dead slot (4-22 23:06).
- Less alarming than appears: just a normal cadence gap. Tomorrow's cron resumes.

### Invegent LinkedIn — cap=10, queued=1, gap 81h
- 1 `pending_fill` slot from 4-30 02:36 never filled (1 day past_due).
- Other slots filled normally. 4 filled past_due (28 Apr - 4 May), 4 future, 1 pending_fill.
- Filled slot for tomorrow 5-4 02:36 has approved draft `8b9104a8`, queued for tomorrow 02:36 ✅.
- Visible symptom: 4-day gap. Self-heals tomorrow IF the pending_fill 4-30 doesn't keep blocking.

## Five structural issues

### Issue 1 — Cap-vs-throughput mismatch (P1)
Cap was calibrated for legacy seed-and-enqueue ~1-2 drafts/day. Slot-driven v4 produces 1/day per slot. After F-AAP-001 reapproved 25 days of backlog, 4 streams are 5-15x over cap. New approvals can't enter queue. Estimated ~30 newly-approved drafts have `queue_status=null` (lost throughput).

This is what F-AAP-007 brief was already designed to detect (Audit Check 8 backpressure-blind). The fix to F-AAP-007 only fixes the *audit*; the *system behaviour* (lost throughput) is unchanged.

### Issue 2 — Legacy `get_next_scheduled_for` ignores slot.scheduled_publish_at (P1)
From jobid 48 SQL: `scheduled_for = COALESCE(pd.scheduled_for, get_next_scheduled_for(j.client_id, j.platform, NOW()))`.

Because `pd.scheduled_for IS NULL` for slot-filled drafts, the legacy function picks the date — spreading drafts forward arbitrarily. A slot with `scheduled_publish_at=2026-05-04 00:00` produces a queue row with `scheduled_for=2026-05-21`.

This is **F-PUB-009 (currently P3-backlogged)** — actively biting now. Promote to P1.

### Issue 3 — Recovery loop refills failed slots with already-published drafts (P1, scoped to CFW LinkedIn evidenced)
4 CFW LinkedIn slots in `marked_failed` state via this pathology. `m.recover_stuck_slots` doesn't check whether a candidate refill draft has an existing `post_publish` row.

### Issue 4 — Stale dead queue rows (P3)
- 9 PP-FB queue rows: `status=dead`, `last_error=not_approved:needs_review`, attempts 9-10. Drafts now approved.
- 1 NDIS-Yarns FB queue row: same pattern, draft `52e1616f`, attempts 19.

Historical artifact of the F-AAP-001 outage. Drafts are now approved but their queue rows are stuck dead.

### Issue 5 — Known gates carry-forward (no change)
- T05/T07 — Instagram (Meta dev support pending PK action)
- T06/T11 — YouTube (OAuth reconnect pending PK action)
- CFW Website 318h dead — separate WordPress publisher investigation (not yet logged as finding)

## Recommended fix sequence (priority order)

### Fix 1 — Lift cap on over-cap streams (5 min apply, immediate effect)
Raise `max_queued_per_platform`:
- NDIS-Yarns LinkedIn: 6 → 60
- Property Pulse LinkedIn: 8 → 100
- NDIS-Yarns FB: 10 → 120 (or normalise existing 105 first)
- Property Pulse FB: 20 → 30 (small headroom)
- IG caps unchanged (paused anyway)
- YouTube unchanged

**Effect**: Unblocks the ~30 cap-stuck approved drafts to enter queue at next jobid 48 tick. Doesn't change publish rate (publisher still respects scheduled_for).

**Caveat**: This is a *symptom* fix not a *root* fix. Without Fix 2, raised caps will fill again over the next week as new slots produce drafts and the spread-forward function keeps stretching the queue.

### Fix 2 — Promote F-PUB-009 to P1 and fix root cause (~30-60 min apply)
Path: at slot fill time, write `slot.scheduled_publish_at → post_draft.scheduled_for`. Then jobid 48's `COALESCE(pd.scheduled_for, get_next_scheduled_for(...))` uses slot intent. New drafts queue at the right time. Old ones stay where they are.

This is the structural fix. Without it, the cap-vs-throughput problem will recur.

### Fix 3 — Patch recovery loop + reset 4 CFW LinkedIn failed slots (~15-20 min)
- Modify `m.recover_stuck_slots` to refuse refilling a slot with a draft that has any row in `m.post_publish`.
- Reset the 4 CFW LinkedIn `marked_failed` slots: either (a) status=`failed` with skip_reason=`stale_recovery` and let new slots cover those gaps, or (b) reset to `pending_fill` for re-attempt with fresh draft. Option (a) is safer (no double-publish risk).

### Fix 4 — Sweep stale dead queue rows (~5 min)
Delete 9 PP-FB + 1 NDIS-Yarns FB queue rows where `status='dead' AND last_error LIKE 'not_approved:%'`. Jobid 48 will re-enqueue cleanly at next tick.

### Fix 5 — Tactical orphan cleanup (~5 min)
- NDIS-Yarns LinkedIn slot for 4-27 00:00 has `filled` status but NULL `filled_draft_id` — set to `failed` with skip_reason=`orphan`.
- Invegent LinkedIn `pending_fill` slot from 4-30 02:36 — same: set to `failed` skip_reason=`stale_pending`.

## What NOT to touch tonight
- IG cron 53 (T05/T07 gated)
- YouTube publisher (T06/T11 OAuth)
- Jobids 11/64/65 seed-and-enqueue (F-AAP-004 still blocks)
- F-PUB-005 paused-cron hardening
- `fill_pending_slots` `p_shadow := true` parameter — separate question (may not even mean what it appears to mean given fills are succeeding)

## D-01 protocol
All five fixes are production patches. Each goes through `ask_chatgpt_review` per D-01 before apply. Recommended apply sequence in next chat session:
1. Fix 1 (cap lift) — `config_change`, low-risk
2. Fix 4 (dead row sweep) — `sql_destructive`, low-risk (DELETE with bounded WHERE)
3. Fix 5 (orphan cleanup) — `sql_destructive`, low-risk (UPDATE 2 rows)
4. Fix 3 (recovery loop) — `sql_destructive` + `apply_migration` (function patch)
5. Fix 2 (F-PUB-009 promotion) — `apply_migration` (structural)

Fixes 1, 4, 5 give visible relief tonight. Fix 3 closes the CFW LinkedIn-specific failure mode. Fix 2 is the only one that prevents recurrence at scale.

## Open questions for PK
1. Tonight's apply scope: just Fixes 1+4+5 (visible relief), or include 3 (CFW LinkedIn full reset), or full set including 2?
2. Cap lift target — are 60/100/120/30 reasonable, or tighter?
3. CFW LinkedIn 4 marked_failed slots — accept the gap (Option a) or attempt republish via reset (Option b)?
4. CFW Website 318h dead — investigate now or log as backlog finding?

## Findings to log to action_list
- **F-PUB-009 PROMOTE P3 → P1**: legacy `get_next_scheduled_for` overrides slot intent; structural fix needed.
- **F-RECOVER-LOOP-001 NEW P1**: `m.recover_stuck_slots` refills failed slots with already-published drafts; CFW LinkedIn x4 evidenced.
- **B-CAP-AVALANCHE NEW P2**: F-AAP-001 backfill avalanche × F-PUB-010 cap = lost throughput on ~30 approved drafts. Symptom-fixed by cap raise; root-fixed by F-PUB-009 promotion.
- **B-DEAD-QUEUE-LEGACY NEW P3**: 10 dead queue rows from F-AAP-001 outage era. One-time sweep.
- **F-CFW-WEBSITE-DEAD NEW P3**: WordPress publisher (jobid 55, every 6h) hasn't published for CFW since 4-20. Cause unknown, separate investigation needed.

## Honest limitations
- This investigation didn't drill into the publisher EF logs (`m.worker_http_log`) for actual error responses — just observed the queue state. If publisher is silently 4xx-ing on specific drafts that's a separate issue.
- `fill_pending_slots(p_shadow := true)` parameter wasn't decoded — assumed slots fill via other path because evidence shows fills succeeding. Could be wrong.
- Cap lift recommendation values are best-guess. PK should review against actual desired posting cadence.
- Closure-effectiveness of Fix 2 not yet validated — could surface secondary issues.

---

*Author: chat. Investigation only — no writes. Apply path gated on D-01 review per next chat session.*
