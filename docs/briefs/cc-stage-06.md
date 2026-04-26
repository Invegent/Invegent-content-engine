# Claude Code Brief — Stage 6: Phase A crons + heartbeat → GATE A

**Stage:** 6 of 19 (LAST Phase A stage)
**Phase:** A — Foundation
**Pre-req:** Stage 5 complete (commit `8a072aa`, all migrations 001–028 applied, pool=1,668, slots=70 future)
**Goal:** Create heartbeat helper + cron-health view + heartbeat-check function. Register 5 Phase A crons (expire, reconcile, backfill, materialise, promote) plus 1 heartbeat-check cron. Each Phase A cron writes its heartbeat on every tick. Then **GATE A**: verify all 6 crons firing, heartbeats writing, R6 still paused, no errors. **Visible behaviour change** — Phase A is now fully autonomous: pool stays fresh, slots materialise nightly, slots promote every 5 minutes. Old pipeline still untouched. R6 paused.
**Estimated duration:** 30 min create + 30–45 min observation for heartbeats to verify.

---

## Context for CC

This stage closes Phase A. Six crons get registered:

| Cron name | Schedule | What it does |
|---|---|---|
| `expire-signal-pool-hourly` | `5 * * * *` | Marks pool entries past `pool_expires_at` as is_active=false |
| `reconcile-signal-pool-daily` | `30 16 * * *` | Daily class/fitness/orphan drift reconciliation (16:30 UTC = 02:30/03:30 AEST) |
| `backfill-missing-pool-entries-every-15m` | `*/15 * * * *` | LD19 batch-bounded async-race-miss backfill |
| `materialise-slots-nightly` | `0 15 * * *` | Materialise next 7d of slots (15:00 UTC = 01:00/02:00 AEST) |
| `promote-slots-to-pending-every-5m` | `*/5 * * * *` | future → pending_fill at fill_window_opens_at |
| `cron-heartbeat-check-hourly` | `45 * * * *` | Reads cron_health_check; writes slot_alerts when crons miss heartbeats |

Each Phase A cron's command wraps the actual function call with a `m.heartbeat()` call so heartbeats happen on every tick:

```sql
SELECT m.heartbeat('expire-signal-pool-hourly'), m.expire_signal_pool();
```

The heartbeat helper UPDATEs `m.cron_health_check.last_heartbeat_at = now()` for the matching jobname. The check function compares `last_heartbeat_at` to `now() - (1.5 * expected_interval_minutes)` and raises a `cron_heartbeat_missing` alert in `m.slot_alerts` if behind.

### Pre-flight findings folded in

The standing cron pattern in this repo uses `select m.func()` for SQL-only jobs (jobid 65, 68 are good examples) and `select net.http_post(...)` for Edge Function jobs (jobid 7, 54). Stage 6 is all SQL functions, so we use the direct-invocation pattern.

UTC schedules: `15 * * * *` and `30 16 * * *` are chosen so the daily-cadence crons fire during AEST early-morning (01:00 and 02:30 AEST respectively) — out of business hours, low-load window.

### Behaviour change envelope

After Stage 6 + Gate A:
- Pool stays fresh: expire hourly, reconcile daily, backfill catches misses every 15 min
- Slots auto-materialise nightly at 01:00 AEST
- Slots auto-promote to pending_fill every 5 min when their fill window opens
- 12 slots will promote within minutes (the Mon 27 Apr slots) — but the fill function (Stage 8) doesn't exist yet, so they'll sit in pending_fill until Stage 10 wires the fill cron
- Heartbeat-check raises alerts if any cron stops firing

This is the first stage where the new pipeline is **autonomously active**. R6 still paused, old pipeline untouched, but Phase A's plumbing now self-maintains.

---

## Pre-flight checks (CC runs first)

- [ ] Working directory: `C:\Users\parve\Invegent-content-engine`
- [ ] On `feature/slot-driven-v3-build` branch
- [ ] Clean working tree apart from untracked `.claude/`
- [ ] `git pull origin feature/slot-driven-v3-build` — fast-forward, latest is `8a072aa`

---

## Files to create

3 migration files. Cron registration uses `cron.schedule()` which IS DDL-equivalent and can run inside a migration. Claude (chat) will apply via Supabase MCP.

### Migration 029 — `20260426_029_create_heartbeat_infrastructure.sql`

```sql
-- Stage 6.029 — Heartbeat helper + cron health view + heartbeat-check function

-- Helper: each Phase A cron calls this at the start of its command
CREATE OR REPLACE FUNCTION m.heartbeat(p_jobname text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE m.cron_health_check
  SET last_heartbeat_at = now(),
      consecutive_misses = 0,
      updated_at = now()
  WHERE jobname = p_jobname;

  -- If the row doesn't exist (cron added without seed), create it permissively
  IF NOT FOUND THEN
    INSERT INTO m.cron_health_check (jobname, last_heartbeat_at, expected_interval_minutes, notes)
    VALUES (p_jobname, now(), 60, 'Auto-created on first heartbeat');
  END IF;
END;
$$;

COMMENT ON FUNCTION m.heartbeat(text) IS
  'Records a cron heartbeat in m.cron_health_check. Each Phase A cron calls this at start of command. Stage 6.029.';

-- View: human-readable health status across all tracked crons
CREATE OR REPLACE VIEW m.cron_health_status AS
SELECT
  c.jobname,
  c.last_heartbeat_at,
  c.expected_interval_minutes,
  c.consecutive_misses,
  CASE
    WHEN c.last_heartbeat_at IS NULL THEN 'never_fired'
    WHEN c.last_heartbeat_at >
         now() - (c.expected_interval_minutes * interval '1 minute') THEN 'green'
    WHEN c.last_heartbeat_at >
         now() - (1.5 * c.expected_interval_minutes * interval '1 minute') THEN 'yellow'
    ELSE 'red'
  END AS status,
  EXTRACT(epoch FROM (now() - c.last_heartbeat_at)) / 60 AS minutes_since_last
FROM m.cron_health_check c
ORDER BY c.jobname;

COMMENT ON VIEW m.cron_health_status IS
  'Human-readable cron health: green/yellow/red based on last_heartbeat_at vs expected_interval. Stage 6.029.';

-- Check function: scans for crons over 1.5x interval; raises slot_alerts
CREATE OR REPLACE FUNCTION m.check_cron_heartbeats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_alerted_count integer := 0;
  v_row record;
BEGIN
  FOR v_row IN
    SELECT jobname, last_heartbeat_at, expected_interval_minutes, last_alert_at
    FROM m.cron_health_check
    WHERE last_heartbeat_at IS NOT NULL  -- ignore never-fired (handled differently)
      AND last_heartbeat_at < now() - (1.5 * expected_interval_minutes * interval '1 minute')
      -- Rate-limit: don't spam alerts; only re-alert after 1 hour
      AND (last_alert_at IS NULL OR last_alert_at < now() - interval '1 hour')
  LOOP
    INSERT INTO m.slot_alerts (alert_kind, severity, payload, message)
    VALUES (
      'cron_heartbeat_missing',
      CASE
        WHEN v_row.expected_interval_minutes <= 5 THEN 'critical'
        WHEN v_row.expected_interval_minutes <= 30 THEN 'warning'
        ELSE 'info'
      END,
      jsonb_build_object(
        'jobname', v_row.jobname,
        'last_heartbeat_at', v_row.last_heartbeat_at,
        'expected_interval_minutes', v_row.expected_interval_minutes,
        'minutes_since_last', EXTRACT(epoch FROM (now() - v_row.last_heartbeat_at)) / 60
      ),
      format('Cron %s missed heartbeat. Last seen %s minutes ago (interval %s min).',
             v_row.jobname,
             ROUND(EXTRACT(epoch FROM (now() - v_row.last_heartbeat_at)) / 60),
             v_row.expected_interval_minutes)
    );

    UPDATE m.cron_health_check
    SET last_alert_at = now(),
        consecutive_misses = consecutive_misses + 1,
        updated_at = now()
    WHERE jobname = v_row.jobname;

    v_alerted_count := v_alerted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'alerted_count', v_alerted_count,
    'ran_at', now()
  );
END;
$$;

COMMENT ON FUNCTION m.check_cron_heartbeats() IS
  'Scans cron_health_check for missed heartbeats (>1.5x interval). Raises slot_alerts of cron_heartbeat_missing kind. Rate-limited 1h between alerts per jobname. Stage 6.029.';
```

---

### Migration 030 — `20260426_030_register_phase_a_crons.sql`

```sql
-- Stage 6.030 — Register 5 Phase A crons + 1 heartbeat-check cron
-- Each Phase A cron wraps its function call with m.heartbeat() so heartbeats
-- happen on every tick.

-- 1. Pool expiry — hourly at minute 5
SELECT cron.schedule(
  'expire-signal-pool-hourly',
  '5 * * * *',
  $cron$
    SELECT m.heartbeat('expire-signal-pool-hourly');
    SELECT m.expire_signal_pool();
  $cron$
);

-- 2. Pool reconciliation — daily at 16:30 UTC (~02:30/03:30 AEST)
SELECT cron.schedule(
  'reconcile-signal-pool-daily',
  '30 16 * * *',
  $cron$
    SELECT m.heartbeat('reconcile-signal-pool-daily');
    SELECT m.reconcile_signal_pool();
  $cron$
);

-- 3. Pool backfill — every 15 minutes (catches async-race misses)
SELECT cron.schedule(
  'backfill-missing-pool-entries-every-15m',
  '*/15 * * * *',
  $cron$
    SELECT m.heartbeat('backfill-missing-pool-entries-every-15m');
    SELECT m.backfill_missing_pool_entries();
  $cron$
);

-- 4. Slot materialisation — daily at 15:00 UTC (~01:00/02:00 AEST)
SELECT cron.schedule(
  'materialise-slots-nightly',
  '0 15 * * *',
  $cron$
    SELECT m.heartbeat('materialise-slots-nightly');
    SELECT m.materialise_slots(7);
  $cron$
);

-- 5. Slot promotion — every 5 minutes
SELECT cron.schedule(
  'promote-slots-to-pending-every-5m',
  '*/5 * * * *',
  $cron$
    SELECT m.heartbeat('promote-slots-to-pending-every-5m');
    SELECT m.promote_slots_to_pending();
  $cron$
);

-- 6. Heartbeat check — hourly at minute 45 (offset from minute 5 expire so they don't collide)
SELECT cron.schedule(
  'cron-heartbeat-check-hourly',
  '45 * * * *',
  $cron$
    SELECT m.heartbeat('cron-heartbeat-check-hourly');
    SELECT m.check_cron_heartbeats();
  $cron$
);
```

---

### Migration 031 — `20260426_031_seed_heartbeat_check_row.sql`

```sql
-- Stage 6.031 — Add cron-heartbeat-check-hourly to m.cron_health_check seed
-- (Stage 1 seeded 10 jobnames; this is the 11th, separately because it monitors itself)

INSERT INTO m.cron_health_check (jobname, expected_interval_minutes, notes)
VALUES (
  'cron-heartbeat-check-hourly',
  60,
  'Stage 6. Self-monitoring: writes its own heartbeat then checks all others.'
)
ON CONFLICT (jobname) DO NOTHING;

-- Sanity
DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM m.cron_health_check;
  IF v_count <> 11 THEN
    RAISE EXCEPTION 'cron_health_check expected 11 rows after Stage 6.031, got %', v_count;
  END IF;
END $$;
```

---

## Code changes

None.

---

## Commands to run

```bash
git status
git branch --show-current
git pull origin feature/slot-driven-v3-build

git add supabase/migrations/20260426_029_create_heartbeat_infrastructure.sql
git add supabase/migrations/20260426_030_register_phase_a_crons.sql
git add supabase/migrations/20260426_031_seed_heartbeat_check_row.sql

git commit -m "feat(slot-driven): Stage 6 — Phase A crons + heartbeat → closes Gate A

LAST Phase A stage. Phase A complete after Gate A verifies.

- m.heartbeat(text): UPDATE cron_health_check.last_heartbeat_at on call.
  Auto-creates row if jobname not seeded (permissive).
- m.cron_health_status view: green/yellow/red based on
  (now - last_heartbeat) vs expected_interval.
- m.check_cron_heartbeats(): scans for >1.5x interval misses,
  raises cron_heartbeat_missing alerts in m.slot_alerts.
  Rate-limited 1h between re-alerts per jobname.

Phase A crons registered (6 total):
- expire-signal-pool-hourly         '5 * * * *'
- reconcile-signal-pool-daily       '30 16 * * *' (~02:30 AEST)
- backfill-missing-pool-entries-every-15m '*/15 * * * *'
- materialise-slots-nightly         '0 15 * * *'  (~01:00 AEST)
- promote-slots-to-pending-every-5m '*/5 * * * *'
- cron-heartbeat-check-hourly       '45 * * * *'

Each cron command:
  SELECT m.heartbeat('jobname');
  SELECT m.<function>();

Per-tick heartbeat ensures monitoring captures cron health
in real-time, not just function call success.

cron-heartbeat-check-hourly seeded to m.cron_health_check
(11th row — was 10 from Stage 1).

After CC pushes, Claude (chat):
1. Applies migrations 029–031 via Supabase MCP
2. Waits 5–7 minutes for first promote-slots tick
3. Runs Gate A verification:
   - 6 crons registered, all active
   - Heartbeats writing for high-frequency crons
   - 12 Mon-27-Apr slots will have re-promoted to pending_fill
   - signal_pool/canonical_vertical_map populated
   - R6 still paused
   - Publishing pipeline unaffected

If Gate A passes: Phase A is COMPLETE. Phase B begins (Stage 7).
If anything fails: forward-fix or roll back the failing piece.

Refs: 26d88b8 (v4), 8a072aa (Stage 5)"

git push origin feature/slot-driven-v3-build
```

---

## What CC reports back

```
## Stage 6 CC report (git side only)

- ✅ Pre-flight passed: yes/no
- ✅ Branch: feature/slot-driven-v3-build
- ✅ Files staged: 3/3
- ✅ Commit SHA: ____________
- ✅ Branch pushed: yes/no
- Anything unexpected: ____________ or "none"

DB state NOT touched by me. No SQL run. No supabase db push.
Awaiting Claude (chat) to apply migrations and run Gate A verification.
```

---

## Gate A verification queries (Claude in chat runs)

### Phase 1 — immediate, after MCP apply

```sql
-- A1: 6 new crons registered, all active
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname IN (
  'expire-signal-pool-hourly',
  'reconcile-signal-pool-daily',
  'backfill-missing-pool-entries-every-15m',
  'materialise-slots-nightly',
  'promote-slots-to-pending-every-5m',
  'cron-heartbeat-check-hourly'
)
ORDER BY jobname;
-- EXPECTED: 6 rows, all active=true

-- A2: cron_health_check has 11 seed rows
SELECT COUNT(*) FROM m.cron_health_check;
-- EXPECTED: 11

-- A3: heartbeat function callable
SELECT m.heartbeat('test_synthetic_jobname');
SELECT * FROM m.cron_health_check WHERE jobname='test_synthetic_jobname';
-- EXPECTED: 1 row with auto-created entry; clean up after
DELETE FROM m.cron_health_check WHERE jobname='test_synthetic_jobname';

-- A4: check_cron_heartbeats callable, returns clean (no missed heartbeats yet)
SELECT m.check_cron_heartbeats();
-- EXPECTED: jsonb {alerted_count: 0, ran_at: ...}

-- A5: cron_health_status view callable
SELECT * FROM m.cron_health_status;
-- EXPECTED: 11 rows; status='never_fired' for all (no ticks yet)

-- A6: R6 still paused
SELECT jobid, jobname, active FROM cron.job WHERE jobid IN (11, 64, 65);
-- EXPECTED: all three active=false

-- A7: Publishing pipeline state preserved
SELECT status, COUNT(*) FROM m.post_publish_queue GROUP BY status;
-- EXPECTED: same shape as before (147 queued, 91 published, 42 dead approximately)
```

### Phase 2 — after 6 minutes (one promote-slots tick)

```sql
-- A8: At least one cron has fired (promote-slots is */5 — first tick within 5 min)
SELECT jobname, status, ROUND(minutes_since_last) AS mins_ago
FROM m.cron_health_status
ORDER BY jobname;
-- EXPECTED: 'promote-slots-to-pending-every-5m' status='green', mins_ago < 6

-- A9: Slots re-promoted to pending_fill (the 12 Mon 27 Apr slots)
SELECT status, COUNT(*) FROM m.slot GROUP BY status;
-- EXPECTED: ~58 future, ~12 pending_fill (slots whose fill window has opened)

-- A10: Pool maintenance crons firing on schedule
-- (backfill-every-15m may not have fired yet if window <15 min after Stage 6 apply)
SELECT jobname, last_heartbeat_at, status
FROM m.cron_health_status
WHERE jobname IN (
  'promote-slots-to-pending-every-5m',
  'backfill-missing-pool-entries-every-15m',
  'expire-signal-pool-hourly'
)
ORDER BY jobname;

-- A11: cron.job_run_details — recent runs
SELECT 
  j.jobname,
  jr.start_time,
  jr.status,
  jr.return_message
FROM cron.job_run_details jr
JOIN cron.job j ON j.jobid = jr.jobid
WHERE j.jobname IN (
  'promote-slots-to-pending-every-5m',
  'backfill-missing-pool-entries-every-15m'
)
  AND jr.start_time > now() - interval '15 minutes'
ORDER BY jr.start_time DESC
LIMIT 10;
-- EXPECTED: rows showing status='succeeded' (or empty if no ticks yet);
-- if any 'failed', report the return_message
```

### GATE A final check

If A1–A11 all pass:
- Phase A is COMPLETE.
- 1,668 active pool entries flowing.
- 70 slots materialised, 12 promoted to pending_fill.
- 6 Phase A crons firing, heartbeats writing.
- R6 paused, publishing untouched.

If anything fails:
- Forward-fix the failing piece (don't roll back unless structural).
- Common likely failures: cron command syntax error (would surface in cron.job_run_details.status='failed'); fix and re-register the affected cron.

---

## Rollback (if Gate A fails irrecoverably)

```sql
-- Unregister all 6 Phase A crons
SELECT cron.unschedule('cron-heartbeat-check-hourly');
SELECT cron.unschedule('promote-slots-to-pending-every-5m');
SELECT cron.unschedule('materialise-slots-nightly');
SELECT cron.unschedule('backfill-missing-pool-entries-every-15m');
SELECT cron.unschedule('reconcile-signal-pool-daily');
SELECT cron.unschedule('expire-signal-pool-hourly');

-- Drop heartbeat infrastructure
DROP FUNCTION IF EXISTS m.check_cron_heartbeats();
DROP VIEW IF EXISTS m.cron_health_status;
DROP FUNCTION IF EXISTS m.heartbeat(text);

-- Pool + slots stay populated; old pipeline unaffected; R6 still paused.
```

---

## Notes for after Gate A passes

- **Phase B begins**: Stage 7 (confidence + pool health + ratio functions), Stage 8 (THE FILL FUNCTION — heart of v3), Stage 9 (recovery + breaking news), Stage 10 (Phase B crons + shadow mode), Stage 11 (ai-worker idempotency).
- **Stage 8 is the longest single migration** in the build (~150 lines of fill function logic per v3 §B.4-B.8).
- After Stage 11, Gate B = 5–7 days of shadow observation before any cutover.
- Phase B promotes the 12 currently-pending slots into actual shadow drafts (with `is_shadow=true` so publishers ignore them).

After Gate A, the system has:
- **Supply** (pool) maintained autonomously
- **Demand** (slots) materialised and promoted autonomously
- **Monitoring** (heartbeats + alerts) in place
- **No fill** yet — that's Stage 8

This is the natural Phase A → Phase B boundary: the static-state pieces work; now we build the fill logic that consumes them.

---

*End Stage 6 brief. v4 commit `26d88b8`. Stage 5 closed at `8a072aa`. Author: Claude (chat). For execution by: Claude Code (local).*
