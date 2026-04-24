# Cron Failure-Rate Monitoring — Layer 1

**Session:** 24 Apr 2026 afternoon (after A11b close).
**Status:** **LIVE in production.** 15-min refresh cron active. v3 function deployed.
**Parent context:** M11 incident (2,258 silent cron failures over 8 days, 14–22 Apr). ID004 incident (9-day content-fetch HTTP 401 under pg_cron `succeeded` status).

## Why this exists

M11 happened because Postgres knew — `cron.job_run_details.status = 'failed'` on every single cron invocation — but no one was looking. The failure was correctly reported at the database layer for 8 days before a human noticed IG publisher behaviour was off and traced backwards.

The cost of the gap: 120 FB drafts marked dead in the D165 cleanup, IG publisher paused until router integration, plus the investigation time itself. The lesson was explicit in sync_state: *"2,258 silent failures over 8 days should never recur undetected."*

This monitor is the cheapest possible mitigation. It reads `cron.job_run_details` every 15 minutes, aggregates failure patterns into a small snapshot table, and raises lifecycle-tracked alerts when thresholds cross.

## What this catches vs what it doesn't

**Catches (Layer 1 — M11 class):**
- `cron.job_run_details.status = 'failed'` patterns — crons where Postgres reports the failure directly
- Consecutive failures (≥ 3 in a row)
- High 24h failure rate (≥ 20% with ≥ 3 runs)
- Jobs that haven't run in ≥ 2× their historical median interval (schedule-aware)
- Active jobs that have never run at all

**Does NOT catch (Layer 2 — ID004 class):**
- `cron.job_run_details.status = 'succeeded'` when the underlying HTTP call returned 4xx/5xx
- `net.http_post` scheduling succeeded but downstream Edge Function failed
- Edge Function invocations where the response was "accepted" but the work wasn't done

Layer 2 is **D168 domain** — response-layer sentinel, separate system. The two layers compose. D168 spec exists in `docs/06_decisions.md`; implementation deferred.

## Schema

Two tables, one function, one cron job. Deliberately tiny.

### `m.cron_health_snapshot`

UPSERT target, one row per `(jobid, window_hours)` combination. Stays at ~80 rows total regardless of how long the system runs.

```
snapshot_id UUID PRIMARY KEY
jobid INTEGER NOT NULL
jobname TEXT NOT NULL
schedule TEXT                       -- cron expression ("*/5 * * * *" etc)
is_active BOOLEAN NOT NULL          -- current cron.job.active value
window_hours INTEGER NOT NULL       -- 1 or 24 (CHECK constraint)
total_runs INTEGER
succeeded_runs INTEGER
failed_runs INTEGER
failure_rate NUMERIC(5,4)
consecutive_failures_at_end INTEGER -- count of failures since last success
latest_run_at TIMESTAMPTZ
latest_run_status TEXT              -- 'succeeded' | 'failed'
latest_error TEXT                   -- most recent return_message
latest_error_at TIMESTAMPTZ
computed_at TIMESTAMPTZ
UNIQUE (jobid, window_hours)
```

Indexes on `jobid` and partial on `failure_rate > 0`.

### `m.cron_health_alert`

Lifecycle-tracked. Rows created when thresholds cross, `resolved_at` set when condition clears. Grows slowly — one row per (jobid, alert_type, active-period).

```
alert_id UUID PRIMARY KEY
jobid INTEGER NOT NULL
jobname TEXT NOT NULL
alert_type TEXT NOT NULL            -- CHECK: failure_rate_high | consecutive_failures | no_recent_runs
threshold_crossed TEXT              -- human-readable what triggered it
first_seen_at TIMESTAMPTZ
last_seen_at TIMESTAMPTZ            -- refreshed on each cycle condition persists
current_failure_rate NUMERIC(5,4)
current_consecutive_failures INTEGER
latest_error TEXT
resolved_at TIMESTAMPTZ             -- NULL while active
resolution_notes TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**Partial unique index:** `(jobid, alert_type) WHERE resolved_at IS NULL` — one active alert per jobid per type at a time. Historical resolved alerts accumulate but don't block new ones.

### `m.refresh_cron_health()`

SECURITY DEFINER function, reads `cron.*` tables. Returns `(snapshots_written, alerts_raised, alerts_resolved)`. Three phases per invocation:

1. **Snapshot refresh** — aggregate `cron.job_run_details` for 1h + 24h windows per active + inactive job; UPSERT into `m.cron_health_snapshot`
2. **Alert raise** — three passes (failure_rate_high, consecutive_failures, no_recent_runs); INSERT with ON CONFLICT DO UPDATE to refresh `last_seen_at` and latest data
3. **Alert resolve** — sweep all active alerts where underlying condition has cleared; set `resolved_at`

### Cron schedule

```sql
SELECT cron.schedule(
  'cron-health-every-15m',
  '*/15 * * * *',
  $$ SELECT m.refresh_cron_health(); $$
);
```

Every 15 minutes. Lightweight query — takes well under 1 second on current data volume.

## Thresholds

Current parameter values (hardcoded in the function; easy to tune by redeploying):

| Parameter | Value | Rationale |
|---|---|---|
| `v_failure_rate_threshold` | 0.20 (20%) | M11 was at 100% failure for 8 days; 20% catches it within hours of first occurrence |
| `v_consecutive_threshold` | 3 | Catches short sharp failures that don't have time to accumulate to a high rate |
| `v_no_runs_min_threshold` | 2 hours | Floor — sub-hourly crons should always run within 2h |
| `v_no_runs_max_threshold` | 32 days | Ceiling — monthly crons get buffer but not infinite |
| `v_no_runs_multiplier` | 2.0 | Alert when 2× expected interval has passed |
| `v_min_runs_for_cadence` | 1 | Accept a single observed interval as cadence estimate (v3 fix — was 3) |

The `no_recent_runs` check uses median historical interval × 2 for jobs with enough data, else falls back to the 2-hour floor. Calculation uses the last 10 runs' intervals, median (not mean) to resist outliers.

## What happened when we turned it on

**First refresh — 18 alerts raised:**
- **1 legitimate alert** — `token-expiry-alert-daily` (jobid 60), 8 consecutive failures, `ERROR: column "checked_at" does not exist`. Silent production bug that had been running every day at 22:05 UTC since at least 16 Apr. Nothing else in the system was surfacing this.
- **17 `no_recent_runs` false positives** — all daily / weekly / monthly crons that hadn't run in > 2 hours (obvious given their cadence)

**Tuning passes (both applied same session):**
- **v2** — schedule-aware `no_recent_runs` using historical median × 2. Cleared 8 false positives on first refresh run. 10 remained.
- **v3** — lowered `v_min_runs_for_cadence` from 3 to 1. Cleared 3 more. 7 remained.

**Final state after v3 (7 active alerts):**

| Job | Alert | Status | Correct? |
|---|---|---|---|
| `token-expiry-alert-daily` (60) | consecutive_failures × 8 | **real bug** | ✅ true positive |
| `compliance-reviewer-monthly` (40) | no run ever recorded | job never ran | ✅ true positive |
| `external-reviewer-digest-weekly` (66) | no run ever recorded | reviewer layer paused | ✅ true positive |
| `cron-health-every-15m` (67) | no run ever recorded | bootstrap transient (just created) | ✅ self-clears next tick |
| `compliance-monitor-monthly` (31) | no run since 1 Apr | next run 1 May, only 1 historical run | 🟡 premature |
| `client-weekly-summary-monday-730am-aest` (51) | no run since 19 Apr | next run 26 Apr, only 1 historical run | 🟡 premature |
| `feed-intelligence-weekly` (57) | no run since 19 Apr | next run 26 Apr, only 1 historical run | 🟡 premature |

The 3 remaining false positives all have exactly 1 run in history — no intervals to compute cadence from. They self-resolve when the next scheduled run happens (at most 7 days out for the monthly; 2 days for the weeklies). Acceptable for v1; see v3.1 below.

## Live bug caught — `token-expiry-alert-daily`

Detail for the follow-up ticket.

**Schedule:** `5 22 * * *` (daily 22:05 UTC)
**Command:** `SELECT public.check_token_expiry();`
**Error:** `ERROR:  column "checked_at" does not exist`

**Root cause:** `public.check_token_expiry()` was written against an older version of `m.token_expiry_alert`. The current table has `created_at` (not `checked_at`) and no `client_name` column, but the function still references both in its DELETE predicate and INSERT column list. Classic schema drift — table was rebuilt at some point without updating the consuming function.

**Current severity: LOW.** All 4 Facebook tokens are permanent (`expires_at: 0`). The token-expiry monitor has no relevant work to do today because no expiring tokens exist in production. The bug only becomes operationally relevant when LinkedIn / YouTube tokens come in (those use refresh-token flows with real expiry).

**Fix sketch (not applied today):**
- Replace `checked_at` → `created_at` in DELETE predicate
- Remove `client_name` from INSERT column list (or re-add the column to the table if it was dropped unintentionally)
- Re-test function manually before next cron run

Tracked as backlog item. The fact that the monitor caught it is the primary value — previously, this error was only visible by deliberately querying `cron.job_run_details` for jobid 60.

## Known limitations (v3)

### Bootstrap false positives for newly-added crons

A cron that has run exactly once (no intervals computable) falls back to the 2-hour floor threshold, which will fire if the cron's natural cadence is longer than 2 hours. This is what the 3 remaining false positives above demonstrate.

**Mitigation today:** they self-resolve on the next natural run. Max exposure ~7 days for a monthly cron added last month.

**Proper fix (v3.1 — backlog):** schedule-string parsing. Map cron expressions to expected intervals:
- `*/N * * * *` → `N * 2` minutes
- `M H * * *` → 36 hours
- `M H * * 0-6` → 10 days
- `M H D * *` → 35 days

When `sample_size` insufficient, use schedule-parsed threshold instead of 2-hour floor. Straightforward, ~1 hour to implement.

### No dashboard surface

Alerts currently live in `m.cron_health_alert` with no UI. PK can query them directly:
```sql
SELECT jobname, alert_type, threshold_crossed, last_seen_at, LEFT(latest_error, 140) AS error_preview
FROM m.cron_health_alert WHERE resolved_at IS NULL ORDER BY first_seen_at DESC;
```

**Proper fix (backlog):** `/monitoring/cron-health` route on `invegent-dashboard`. Small table view, red-yellow-green per alert_type, click-through to full error + cron.job_run_details history. ~2-3 hours of dashboard work when warranted. Not building today.

### No notification layer

Alerts accumulate in the table but don't push anywhere. No email, no Slack, no Telegram. An alert that's raised but never looked at is barely better than no alert at all.

**Proper fix (backlog):** weekly digest email of unresolved alerts, or push to `@InvegentICEbot` Telegram channel. Deferred — PK checks the system regularly at session start anyway; manual-query discipline is adequate while the system is small.

### Doesn't differentiate "paused intentionally" from "broken"

`instagram-publisher-every-15m` (jobid 53) is paused per D165 so `is_active = false`. The monitor correctly excludes it from alerting. But `external-reviewer-digest-weekly` (jobid 66) is a different flavour of paused — the reviewer layer is intentionally down during reviewer-pause-era. The monitor raises a `no_recent_runs` alert because `is_active = true` but the job never ran. Technically correct; pragmatically noisy.

**Mitigation:** add a conceptual tag like "paused_until" or a `m.cron_monitor_exemption` table that the monitor honors. Not today — intentionally-paused-but-technically-active is a rare state and the alert is a reasonable reminder.

## Verification against M11 — partial backtest

The M11 window was 14–22 Apr. Current 24h alert window doesn't reach that far back, so we can't directly replay M11 through the monitor.

**Indirect check:** queried `cron.job_run_details` for jobid 48 (`enqueue-publish-queue-every-5m`) manually. 288 `failed` rows from 14 Apr 05:20 UTC onward, all with the same error. If the monitor had existed then, `failure_rate_high` (24h) would have fired within ~20 minutes of the first failure (3-run threshold crossed), and `consecutive_failures` would have fired within ~15 minutes.

**Realistic outage-to-alert lag for M11-class bugs: ~15-30 minutes.** Compared with the actual 8-day detection time, that's a 300-800× improvement.

## Composition with D168

D168 is the planned response-layer sentinel for ID004-class failures (pg_cron `succeeded` but HTTP response non-2xx). Not yet built. When it ships, the two layers compose:

- **Layer 1 (this system):** `cron.job_run_details.status = 'failed'` — Postgres knows it failed
- **Layer 2 (D168):** `cron.job_run_details.status = 'succeeded'` BUT HTTP response non-2xx — Postgres doesn't know it failed

No code sharing needed — they write to different tables, read different source signals, surface through the same `m.cron_health_alert` pattern (or D168 gets its own alert table, either works).

## Effort record

| Phase | Actual |
|---|---|
| Schema design + v1 migration | ~20 min |
| First refresh + diagnosis of false-positive mechanics | ~10 min |
| v2 migration (schedule-aware threshold) | ~15 min |
| v3 tuning (sample_size threshold lowered) | ~10 min |
| Verification + bug triage | ~10 min |
| This brief | ~20 min |
| **Total** | **~1h 25min** |

Slightly over the "~1 hour" estimate, mostly because the first-refresh false positives needed two tuning passes. Worth it.

## Files and migrations

**Migrations (DB-only, not in the repo):**
1. `cron_health_monitoring_layer_1_schema_and_refresh_20260424` — v1 tables + function + pg_cron job
2. `cron_health_schedule_aware_no_run_threshold_20260424` — v2 function replacement
3. `cron_health_lower_cadence_sample_size_min_20260424` — v3 function replacement

**No Edge Function changes, no portal/dashboard changes.** Entirely database-layer.

**Queries for operator use (bookmark-worthy):**

```sql
-- Active alerts (most useful daily check)
SELECT jobid, jobname, alert_type, threshold_crossed,
       ROUND((EXTRACT(EPOCH FROM NOW() - first_seen_at) / 3600)::numeric, 1) || 'h' AS alert_age,
       LEFT(COALESCE(latest_error, ''), 140) AS error_preview
FROM m.cron_health_alert
WHERE resolved_at IS NULL
ORDER BY first_seen_at DESC;

-- All cron job current health (dashboard-tile equivalent)
SELECT jobid, jobname, schedule, is_active,
       failure_rate, total_runs, failed_runs,
       consecutive_failures_at_end,
       latest_run_at, latest_run_status
FROM m.cron_health_snapshot
WHERE window_hours = 24
ORDER BY failure_rate DESC, jobid;

-- Resolve history (see what's been caught and cleared)
SELECT jobid, jobname, alert_type, first_seen_at, resolved_at,
       (EXTRACT(EPOCH FROM resolved_at - first_seen_at) / 60)::int || 'min' AS duration,
       resolution_notes
FROM m.cron_health_alert
WHERE resolved_at IS NOT NULL
ORDER BY resolved_at DESC
LIMIT 20;

-- Manual refresh (for when you want an up-to-the-second snapshot)
SELECT * FROM m.refresh_cron_health();
```

## Decision record

This doesn't warrant a D-entry on its own — it's a sprint-track build, not an architectural decision. But it closes the "Cron failure-rate monitoring" HIGH-priority sprint item that has been on the board since 22 Apr's M11 close. File 15 Section G can mark this closed.

Related:
- **D168** — response-layer sentinel (Layer 2, not yet built)
- **M11 incident** — the originating event
- **D165** — the cleanup of M11 fallout (120 FB drafts marked dead, IG publisher paused)
