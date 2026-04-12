# Brief 022 Result — Publisher Schedule Wiring

**Executed:** 12 April 2026
**Executor:** Claude Code (Opus 4.6)
**Supabase project:** mbkmaxqhsohbtwsqolns

---

## Task Results

| Task | Description | Status |
|------|-------------|--------|
| 1 | Create get_next_scheduled_for() | COMPLETED (with timezone fix) |
| 2 | Update draft_approve_and_enqueue | COMPLETED |
| 3 | Update draft_approve_and_enqueue_scheduled | COMPLETED |
| 4 | Recreate enqueue-publish-queue-every-5m cron | COMPLETED — job ID 48 |
| 5 | Dry-run verification | COMPLETED — all slots correct |
| 6 | Write result file | COMPLETED |

---

## Details

### Task 1 — get_next_scheduled_for()
Created and verified. Required a timezone fix: `generate_series` with date intervals produces `timestamptz` values, so the `AT TIME ZONE` conversion was inverted. Fixed by casting `gs` to `date` explicitly before adding `publish_time`, ensuring a proper `timestamp without time zone` → `AT TIME ZONE` → `timestamptz` conversion.

Verification:
- NDIS Yarns facebook: next slot Tue 12:00 AEST (UTC 2026-04-14 02:00:00) — correct
- CFW facebook: fallback now() + 5 minutes — correct (no schedule rows)

### Task 2 — draft_approve_and_enqueue
Replaced `now()` with `public.get_next_scheduled_for(v_client_id, COALESCE(v_platform, 'facebook'), NOW())` in the INSERT.

### Task 3 — draft_approve_and_enqueue_scheduled
Replaced `now()` fallback in COALESCE chain with `public.get_next_scheduled_for(...)`.

### Task 4 — Cron job
- Old job unscheduled (jobid 8)
- New job created (jobid 48) with:
  - `DISTINCT ON (client_id, platform)` — 1 item per client per platform per run
  - `get_next_scheduled_for()` as fallback for `pd.scheduled_for`
  - `ORDER BY created_at ASC` — oldest first

### Task 5 — Dry-run verification

| Client | Platform | Next slot UTC | Next slot local |
|--------|----------|---------------|-----------------|
| NDIS-Yarns | facebook | 2026-04-14 02:00 | Tue 12:00 AEST |
| Property Pulse | facebook | 2026-04-12 21:30 | Mon 07:30 AEST |
| Property Pulse | youtube | now() + 5min | fallback (no schedule) |

All slots match configured schedule times. Fallback works for platforms without schedule rows.

---

## Functions Modified

| Function | Change |
|----------|--------|
| public.get_next_scheduled_for() | CREATED — schedule-aware slot finder |
| public.draft_approve_and_enqueue() | UPDATED — now() → get_next_scheduled_for() |
| public.draft_approve_and_enqueue_scheduled() | UPDATED — now() fallback → get_next_scheduled_for() |
| cron: enqueue-publish-queue-every-5m | RECREATED — DISTINCT ON + schedule fallback |

---

## Notes

- Timezone handling required explicit `d::date + publish_time` cast to avoid `timestamptz AT TIME ZONE` double-conversion
- April 2026 in Sydney is AEST (UTC+10) — daylight saving ends first Sunday of April
- Publisher Edge Function was NOT changed — it correctly processes items where `scheduled_for <= now()`
- seed-and-enqueue-facebook-every-10m was NOT changed — it feeds AI worker, not publish queue
- Care For Welfare has no schedule rows — gracefully falls back to now() + 5 minutes
