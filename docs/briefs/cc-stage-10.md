# CC Brief — Stage 10: Phase B crons + ai-worker is_shadow filter

**Branch:** `feature/slot-driven-v3-build`  
**Predecessor:** Stage 9 fix-up (commit `ca1e022`)  
**Outputs:** 1 migration file (cron registration) + 1 EF patch (ai-worker)  
**Estimated CC time:** 30–45 min

---

## Why this stage exists

Phase B Stages 7–9 shipped the fill function, recovery, breaking-news, critical-window scan, and pool-health helpers — all callable, none auto-fired. Stage 10 wires the 5 Phase B crons that turn dormant infrastructure into observable behaviour, AND patches the existing R6 ai-worker so it ignores the shadow ai_jobs the new fill cron will produce.

Per **D179**, the ai-worker patch must reach production BEFORE the cron migration applies. If the migration applies first, the R6 ai-worker (jobid 5) will pick up shadow ai_jobs the fill cron creates and likely fail them, polluting `m.ai_job` and breaking Gate B observation.

---

## Scope — exactly two things

### 1. Migration `20260427_046_register_phase_b_crons.sql`

Register 5 crons. Use migration 030 (`20260426_030_register_phase_a_crons.sql`) as the exact pattern — same `cron.schedule(...)` signature, same `$cron$ ... $cron$` body wrapping a heartbeat call followed by the function call.

**Schedules and function calls (these match the pre-seeded `m.cron_health_check` jobnames and intervals — DO NOT change them):**

| Jobname | Schedule (cron) | Body |
|---|---|---|
| `fill-pending-slots-every-10m` | `*/10 * * * *` | `SELECT m.heartbeat('fill-pending-slots-every-10m'); SELECT m.fill_pending_slots(p_max_slots := 5, p_shadow := true);` |
| `recover-stuck-fill-in-progress-every-15m` | `*/15 * * * *` | `SELECT m.heartbeat('recover-stuck-fill-in-progress-every-15m'); SELECT m.recover_stuck_slots();` |
| `try-urgent-breaking-fills-every-15m` | `*/15 * * * *` | `SELECT m.heartbeat('try-urgent-breaking-fills-every-15m'); SELECT m.try_urgent_breaking_fills();` |
| `critical-window-monitor-every-30m` | `*/30 * * * *` | `SELECT m.heartbeat('critical-window-monitor-every-30m'); SELECT m.scan_critical_windows();` |
| `pool-health-check-hourly` | `15 * * * *` | `SELECT m.heartbeat('pool-health-check-hourly'); PERFORM m.check_pool_health(NULL);` |

**Notes:**
- `pool-health-check-hourly` minute offset is `15` to avoid colliding with `expire-signal-pool-hourly` (minute 5) and `cron-heartbeat-check-hourly` (minute 45). `m.check_pool_health()` is a STABLE function — wrap with `PERFORM` (or `SELECT * FROM` and discard) since pg_cron treats `SELECT` returning rows as fine but `PERFORM` is safer for read-only diagnostics.
- The `*/10`, `*/15`, `*/30` schedules use UTC. PK is in AEST — does not matter, these are operational not user-facing.
- DO NOT seed any new `m.cron_health_check` rows. All 5 jobnames are already seeded (Stage 1 + Stage 6.031). The migration just registers the cron schedules; heartbeats begin populating on first tick.

**Format the file exactly like migration 030.** Keep the section comments. End the file with no trailing transactions or DO blocks — `cron.schedule()` cannot run inside a transaction the way pg_cron expects, and the existing migration 030 demonstrates the working pattern.

### 2. ai-worker EF patch — single-line filter

In `supabase/functions/ai-worker/index.ts` (or wherever the ai-worker source currently lives — check the existing repo structure on `feature/slot-driven-v3-build`), find the SELECT query that pulls queued `m.ai_job` rows for processing. It will look something like:

```ts
const { data: jobs } = await supabase
  .from('ai_job')           // or rpc(), or .schema('m').from('ai_job')
  .select(...)
  .eq('status', 'queued')
  .order(...)
  .limit(...)
```

Add `.eq('is_shadow', false)` to that chain. Single-line change. The `is_shadow` column was added by Stage 8 migration 036 (`alter_ai_job_for_slot_driven`) — it exists on `m.ai_job` with default `false`. Existing R6 ai_jobs all have `is_shadow=false` (default), so this filter is a no-op for them. Future shadow ai_jobs (created by `m.fill_pending_slots(p_shadow := true)`) will have `is_shadow=true` and be excluded.

If the queued-job SELECT uses raw SQL (`.rpc()` or `.from('exec_sql')`), add `AND is_shadow = false` to the WHERE clause instead.

**Comment the change** so Stage 11 can find it for removal:

```ts
// STAGE 10 SHADOW FILTER (D179): exclude is_shadow=true ai_jobs.
// Stage 11 removes this once full slot-driven payload handling lands.
.eq('is_shadow', false)
```

**No other changes to ai-worker.** No idempotency, no LD7 prompt caching, no payload reshape — those are Stage 11.

---

## Branch & commit discipline

- Confirm you're on `feature/slot-driven-v3-build` BEFORE writing files. `git status`. If not, `git fetch origin && git checkout feature/slot-driven-v3-build && git pull`.
- One commit per artefact. Two commits total:
  - `feat(crons): Stage 10 register 5 Phase B crons (migration 046)`
  - `feat(ai-worker): Stage 10 add is_shadow=false filter (D179)`
- After both commits, push to `feature/slot-driven-v3-build`. PK pulls and deploys ai-worker.

**Branch sweep before push:** confirm no orphan feature branches exist on the other two repos (`invegent-dashboard`, `invegent-portal`) — if any, flag them in your push message but do not delete.

---

## Sequencing

1. **CC writes both artefacts**, commits, pushes (this brief).
2. **PK pulls + deploys ai-worker** via PowerShell:
   ```
   cd C:\Users\parve\Invegent-content-engine
   git fetch origin && git checkout feature/slot-driven-v3-build && git pull
   supabase functions deploy ai-worker --no-verify-jwt
   ```
   Reports deploy success in chat.
3. **Chat applies migration 046** via Supabase MCP `apply_migration`.
4. **Chat runs verification** (V1–V6 below).
5. **PK approves**, Stage 11 brief next.

If V1–V6 fail at any point: chat will produce a fix-up brief. DO NOT preemptively unschedule the new crons unless chat explicitly says to.

---

## Verification (chat will run after migration applies)

**V1 — Migration applied cleanly:** `m` schema has 5 new entries in `cron.job` matching the jobnames above, all `active=true`.

**V2 — Heartbeats firing:** within ~10 minutes, `m.cron_health_check.last_heartbeat_at` for all 5 new jobnames is non-NULL and within the last interval.

**V3 — Fill cron producing shadow ai_jobs:** within 10 minutes, at least one row in `m.ai_job` with `is_shadow=true` and `status='queued'`. Counts may stay low if pool health is yellow/red for some verticals — that's expected behaviour, not a failure.

**V4 — ai-worker NOT processing shadow jobs:** shadow ai_jobs accumulate with `status='queued'`. They do NOT transition to `running` or `succeeded`. R6-era ai_jobs (is_shadow=false) continue to be processed normally.

**V5 — `slot_fill_attempt` audit rows appearing:** `m.slot_fill_attempt` accumulates rows for every fill cron tick — successful fills, evergreen fallbacks, and skipped attempts all logged.

**V6 — No new alerts except expected ones:** `m.slot_alerts` may gain `slot_critical_window` rows (slots crossing the 1h threshold) — those are expected. No `cron_heartbeat_missing` alerts. No `recovery_*` alerts in the first 30 min (recovery cron has nothing to recover yet).

---

## Rollback plan

If anything breaks:
1. **Disable the 5 new crons:** `UPDATE cron.job SET active=false WHERE jobname IN (5 jobnames above);`
2. **Revert ai-worker:** redeploy from main: `git checkout main && supabase functions deploy ai-worker --no-verify-jwt`
3. The migration itself does no destructive DDL — leaving the cron schedules registered-but-inactive is safe.

Phase A crons (jobid 69–74) and R6 ai-worker (jobid 5) are unaffected by Stage 10 work. R6 paused state remains. Only new state introduced: 5 new cron rows + ai-worker filter.

---

## What's NOT in scope

- Full ai-worker refactor (LD7 prompt caching, LD18 idempotency, slot-driven payload shape) — Stage 11
- Removing the `is_shadow=false` filter — Stage 11
- Wiring R6 seed crons back on (jobid 11, 64, 65) — Phase C
- Re-enabling external reviewers — post-sprint per D162
- IG cron (jobid 53) re-enable — gated on Meta restriction clear, separate from Stage 10

---

## Brief metadata

- **Stage:** 10
- **Phase:** B
- **Predecessor:** Stage 9 fix-up `ca1e022`
- **Successor:** Stage 11 (full ai-worker refactor)
- **Decisions referenced:** D161 (live state authoritative), D162 (reviewers paused), D179 (Stage 10/11 ordering Option B)
- **Pre-flight gaps caught:** sync_state Stage 10 scope had 4 schedules wrong; pre-flight against `m.cron_health_check` showed 5 seeded jobnames with different intervals. Reconciled here per D161.
