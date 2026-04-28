# Gate B Observation — Day 2 (Tue 28 Apr 2026 evening re-sweep)

> Run ~12h after Day 1 morning sweep. Calendar Tuesday evening. Day 3 = Wed 29 Apr morning.
> Earliest Gate B exit: Sat 2 May.

## Verdict

**HEALTHY. No new failures, no stuck items, no cost concern.**

Continue Phase B autonomous through Wed morning Day 3 obs. The 3 known
`exceeded_recovery_attempts` slots are stable — no new failures since EOD
sync state write. Stage 9 bounded recovery is doing exactly what it was
designed to do.

## Slot distribution

| Bucket | Status | Count |
|---|---|---|
| Past, within 7d | filled | 72 |
| Past, within 7d | failed | 2 |
| Next 24h | filled | 13 |
| Next 24h | failed | 1 |
| Next 7d | future | 42 |

**Totals:** 85 filled, 42 future, 3 failed. Forward = 13 (next 24h filled) + 42 (future) + 1 failed = 56 slots in the forward horizon. Historical = 72 + 2 = 74 in the past 7d.

EOD sync state recorded "71 filled past + 13 already-filled in next 24h + 43 future in next 7d". Today's count: 72 past-filled (+1), 13 next-24h-filled (same), 42 future (-1, one rolled into the 24h bucket as time passed). All consistent with normal slot ageing.

## Failed slots — no change

All 3 still showing `exceeded_recovery_attempts`. None new since EOD.

| Client | Platform | Scheduled (AEST) | Updated (AEST) |
|---|---|---|---|
| care-for-welfare-pty-ltd | linkedin | Mon 27 Apr 13:04 | Mon 27 Apr 16:45 |
| property-pulse | youtube | Mon 27 Apr 13:15 | Mon 27 Apr 17:30 |
| property-pulse | instagram | Wed 29 Apr 10:00 | Tue 28 Apr 12:00 |

PP Instagram has 1 open slot_alert (severity=warning, alert_kind=slot_recovery_exhausted, message references attempts 3/3). Not acknowledged. Acceptable to leave unacknowledged for now since the cron fired correctly and the alert is informational, not actionable until we decide whether to deepen the pool for PP Instagram or accept it as a thin-pool platform.

## ai_job last 24h

| Status | Count |
|---|---|
| succeeded | 19 |
| failed | 1 |
| running | 0 |
| pending | 0 |

Failure rate 5.0% — same as Day 1, at the upper edge of the <5% Gate B exit target. Watch in Day 3. If failure rate stays at 5% or rises, that's a potential flag for delaying exit.

## Stuck-item check — clean

| Metric | Value |
|---|---|
| publish_queue pending | 0 |
| publish_queue pending >2h | 0 |
| ai_jobs running >30min | 0 |
| slot_alerts last 24h | 1 (the PP Instagram entry above) |

## Pool

`m.signal_pool` = **2,000** active rows (was 1,983 at EOD — net **+17** in ~12h, pool deepening as expected with normal ingest).

## Stage 2.3 trigger check — NOT activated

Posts published last 48h, broken down by client × platform:

| Client | FB | LinkedIn | Total | First publish (AEST) |
|---|---|---|---|---|
| care-for-welfare-pty-ltd | 3 | 2 | 5 | Mon 27 Apr 16:45 |
| invegent | 3 | 3 | 6 | Mon 27 Apr 16:45 |
| ndis-yarns | 4 | 4 | 8 | Mon 27 Apr 10:00 |
| property-pulse | 4 | 5 | 9 | Mon 27 Apr 10:00 |

**Total 28 posts in last 48h.** CFW and Invegent both fired their first post within hours of yesterday's mode=auto + r6=true flip. Stage 2.3 (slot outcome resolver) **does NOT need to jump the queue** — legacy publisher producing posts on the new client config exactly as expected.

## Cost — run-rate clean, cap-window dominated by historical incident

| Window | Calls | USD |
|---|---|---|
| Last 24h | 20 | $0.24 |
| Last 48h | 112 | $1.45 |

| Period | Calls | USD |
|---|---|---|
| Apr 1–14 (pre-incident) | 41 | $1.54 |
| Apr 15–19 (ID003 incident) | 3,346 | $119.93 |
| Apr 20–25 (post-incident) | 545 | $11.13 |
| Apr 26–27 (Phase B) | 96 | $1.27 |
| Apr 28 (today, partial) | 16 | $0.19 |

Post-incident run-rate ~$0.60/day → ~$20/month projection. Right at the $18/month target, well under Stop 1 ($30/month). The cap-window total since 1 Apr is $134.05 (incident-dominated); cap resets Fri 1 May with a clean slate.

## What to bring to Day 3 (Wed 29 Apr morning)

1. Re-check ai_job failure rate — if it stays at 5% or rises, flag it. If it drops below 5%, fine.
2. Confirm all 4 clients still publishing (no 24h gap for any client × platform combo).
3. Confirm pool growth is positive (>1,983 baseline).
4. Look for any NEW exceeded_recovery_attempts slots (the existing 3 are accepted).
5. Optional: acknowledge the PP Instagram open alert if PK has decided how to treat thin-pool platforms.

## Conditions for Gate B exit (Sat 2 May earliest)

- 5–7 days clean shadow data — currently Day 2 of ~7
- No critical alerts beyond the known acknowledged 32
- Cost stays under Stop 1 ($30/month run-rate)
- ai_job failure rate <5% sustained — currently AT 5%, needs to drop or hold

If exit clean: Phase C cutover (Stages 12–18) — production traffic shifts to slot-driven.
