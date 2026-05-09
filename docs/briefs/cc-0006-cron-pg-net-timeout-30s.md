# Brief cc-0006 — F-CRON-PG-NET-TIMEOUT-5S apply (timeout_milliseconds := 30000 on jobs 33/44/58)

**Created:** 2026-05-09 Sydney
**Author:** chat (drafted from CC's read-only triage 2026-05-09)
**Executor:** TBD (Claude Code via Supabase MCP `execute_sql`, OR chat directly via Supabase MCP)
**Status:** issued (draft)
**Result file:** `docs/briefs/results/cc-0006-cron-pg-net-timeout-30s.md` (created on completion)

---

## Task

Patch three pg_cron jobs so each `net.http_post(...)` call passes `timeout_milliseconds := 30000` (30 s) instead of falling through to the documented pg_net default of 5000 ms (5 s). Preserve every other aspect of each cron command verbatim: URL derivation, headers, body, and — explicitly — job 58's inline `x-auto-approver-key` secret value (security rotation is out of scope, tracked separately under F-CRON-AUTO-APPROVER-SECRET-INLINE).

Apply via three sequential `cron.alter_job(...)` calls in a single Supabase MCP `execute_sql` transaction. No DDL. No DML. No EF deploys. No new secrets. No code changes.

**Expected scope:** exactly 3 cron jobs — `33`, `44`, `58`. Pre-flight re-verifies that each job's `command` column matches the captured baseline (no concurrent edits) and that none of the three already contains `timeout_milliseconds` (no-op guard).

---

## Source context

- `docs/00_action_list.md` v2.54 — registers F-CRON-PG-NET-TIMEOUT-5S as P2.
- CC read-only triage (2026-05-09, in-session) — confirmed structurally that all 3 jobs use `net.http_post` without `timeout_milliseconds`; verified the pg_net default = 5000 via `pg_get_function_arguments`.
- `cron.job` rows for jobids 33, 44, 58 (read-only via `exec_sql`) — captured live command bodies.
- `cron.job_run_details` last 7 d for the 3 jobs — 100% `succeeded` SQL status, sub-second SQL duration. Cron-side telemetry does NOT surface HTTP timeouts (the SQL `SELECT net.http_post(...)` returns the request_id and the SQL completes regardless of HTTP outcome).
- `m.cron_health_snapshot` last 7 d — 0 failed_runs across all 3 jobs, latest_error NULL, consistent with the SQL-level success-despite-HTTP-timeout pattern.
- `net._http_response` available retention window (~6 h, 2026-05-08 19:47 UTC → 2026-05-09 01:45 UTC at triage time): 392 responses, all 200 OK, 0 timed_out, 0 NULL status_code.
- `m.worker_http_log` is jobid 5 only; does not log 33/44/58, so cannot corroborate timeouts on these jobs from that source.
- F-CRON-AUTO-APPROVER-SECRET-INLINE entry in `docs/00_action_list.md` v2.54 — separate P2 (security) tracking for job 58's hardcoded secret. **Out of scope** for this brief.

### Empirical evidence note (load-bearing for the brief)

The brief that registered F-CRON-PG-NET-TIMEOUT-5S cited specific timeout events at 2026-05-08 03:00 / 03:30 / 04:00 / 07:30 UTC. Those events are **no longer DB-recoverable**: `net._http_response` retention is ~6 hours and the cited rows have been pruned. The triage confirmed via the available 6-hour window that there are 0 currently-visible `timed_out=true` or NULL-status responses for any cron-driven HTTP call.

**This patch is justified on the structural defect, not on incident re-reproduction:**

1. `net.http_post` documented default is 5000 ms (verified via `pg_get_function_arguments`).
2. All three cron commands omit `timeout_milliseconds` and therefore inherit that default.
3. The Edge Functions in question (`video-worker`, `heygen-worker`, `auto-approver`) perform DB queries + outbound API calls and can plausibly exceed 5 s, especially on cold start.
4. SQL-level success masks HTTP-level failures, so the absence of cron failure signals does NOT imply absence of HTTP timeouts.

The brief that registered F-CRON-PG-NET-TIMEOUT-5S retains its status (P2 logged) — this brief is its closure path.

---

## Scope

**In scope:**
- Pre-flight verification (read-only SELECTs against `cron.job`, `pg_proc` for `net.http_post` signature re-verification, `m.cron_health_snapshot` for baseline)
- D-01 fire (`ask_chatgpt_review`) with packet specified in §5; action_type `cron_edit`
- Single Supabase MCP `execute_sql` call wrapping three sequential `cron.alter_job(...)` statements per the locked SQL in §3
- Verification queries V1–V4 from §7
- Rollback within session if any verification fails (per §8.3) — uses pre-flight-captured original `command` text per job
- Close-the-loop UPDATE on `m.chatgpt_review` (chat-owned at session close)
- 4-way sync at session close (session file + sync_state pointer + action_list bump + memory)

**Out of scope:**
- F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec) — secret rotation for job 58. Separate cc-NNNN brief; PK auth required for rotation; vault entry creation required first; this brief PRESERVES the inline secret verbatim.
- F-CRON-INGEST-STALE / F-CRON-COMPLIANCE-MONITOR-STALE / F-CRON-PIPELINE-AI-SUMMARY-STALE / F-CRON-PIPELINE-DOCTOR-STALE — separate findings; deploy-only ghost slugs; not relevant to timeout patch.
- Any cron job other than 33, 44, 58.
- Any change to URL derivation, headers, body, or schedule on the 3 jobs.
- Any DDL, DML, or table mutation. Cron metadata only.
- M8 atomic cutover (cc-0005 scope), M-09-03 view DDL (Phase 0).
- Touching `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` (P1 SECURITY-DEFINER hold).
- Modifying `m.ef_drift_log`, `STANDING_THREE` array in `scripts/safe-deploy.sh`, or any EF source.

---

## Allowed actions

- Read source files referenced in §Source context.
- Read-only `SELECT` against `cron.job`, `pg_proc`, `m.cron_health_snapshot`, `net._http_response`, `m.cron_health_alert` for pre-flight + post-apply verification.
- One `ask_chatgpt_review` D-01 fire per §5 packet.
- One Supabase MCP `execute_sql` call wrapping the three `cron.alter_job(...)` statements per §3 (after PK explicit approval based on D-01 result).
- Up to 3 retries on the post-apply verification queries (network/timeout reasons only, not for re-trying after an actual verification failure).
- One rollback `execute_sql` call per §8.3 if any verification fails.
- One close-the-loop UPDATE on `m.chatgpt_review` after success (chat-owned).
- One commit creating `docs/briefs/results/cc-0006-cron-pg-net-timeout-30s.md`.
- 4-way sync close commits at session end.

---

## Forbidden actions

- No `cron.alter_job` on any job other than 33, 44, 58.
- No `cron.schedule` / `cron.unschedule` on any job.
- No DDL, no DML, no INSERT/UPDATE/DELETE on any table outside the cron metadata path.
- No EF deploys. No `supabase functions deploy`.
- No changes to vault. No new secrets. No secret rotation.
- No edits to job 58's `x-auto-approver-key` value or to the headers JSONB shape — preserve the inline secret verbatim. Adding `timeout_milliseconds` is the ONLY semantic change.
- No edits to the `body`, `url`, or other `headers` keys for any of the three jobs.
- No D-01 fire beyond the one in §5.
- No `execute_sql` apply if the read-only pre-flight finds:
  - any of jobs 33/44/58 missing or inactive,
  - any of the three commands diverged from the captured baseline (concurrent edit detected),
  - any of the three commands already contains `timeout_milliseconds` (no-op guard),
  - the `net.http_post` default has changed from 5000 (substrate drift).
- No proceeding past D-01 if the verdict is anything other than `agree` with `proceed`. Escalation to PK per standing protocol if D-01 returns escalate=true or pushback.
- No assumption that the three jobs' command bodies haven't changed since triage. Always re-verify in pre-flight.
- No edit to `00_overview.md`, `04_phases.md`, `06_decisions.md` from this session unless 4-way sync requires it.
- No Phase 0 scheduling.

---

## 1. Pre-flight verification (read-only, runs at apply session start)

### 1.1 Confirm `net.http_post` default has not changed from 5000

```sql
SELECT proname,
       pg_get_function_arguments(oid) AS args,
       pg_get_function_arguments(oid) ILIKE '%timeout_milliseconds integer DEFAULT 5000%' AS default_is_5000
FROM pg_proc
WHERE proname = 'http_post' AND pronamespace = 'net'::regnamespace;
```

**Decision rule:** `default_is_5000` MUST be `true`. If `false`, the substrate has changed and the brief's structural justification (5000 ms default) needs re-evaluation. HALT and escalate to PK before D-01.

### 1.2 Confirm jobs 33, 44, 58 still exist, active, and capture baseline command text

```sql
SELECT jobid, jobname, schedule, active, command
FROM cron.job
WHERE jobid IN (33, 44, 58)
ORDER BY jobid;
```

**Decision rule:**
- All 3 rows MUST be present. If any missing → HALT.
- All 3 MUST have `active = true`. If any inactive → HALT (cron edit on inactive job is suspicious — escalate).
- Persist `(jobid, command)` map to chat context (or scratch file `/tmp/cc-0006-cron-baseline-{date}.csv`) for rollback path. **The pre-flight-captured command text IS the rollback authority.**

### 1.3 No-op guard — confirm none of the three already has `timeout_milliseconds`

```sql
SELECT jobid,
       command ILIKE '%timeout_milliseconds%' AS already_has_timeout_arg
FROM cron.job
WHERE jobid IN (33, 44, 58)
ORDER BY jobid;
```

**Decision rule:**
- All three `already_has_timeout_arg` MUST be `false`. If any is `true`, that job has been edited between triage and apply (likely by another session). HALT for the job(s) flagged; PK directs whether to proceed with the remaining jobs only or to abort the whole brief.

### 1.4 Concurrent-edit detection — re-fetch and compare to triage capture

```sql
SELECT jobid, md5(command) AS command_md5, length(command) AS command_len
FROM cron.job
WHERE jobid IN (33, 44, 58)
ORDER BY jobid;
```

**Decision rule:**
- The apply session compares these `(jobid, md5, length)` triples to the triage baseline captured here for reference (chat persists this in apply-session context):

  | jobid | jobname | command_len (triage 2026-05-09) |
  |---|---|---:|
  | 33 | `video-worker-every-30min` | 348 (approx; exact value captured at apply time) |
  | 44 | `heygen-worker-every-30min` | 350 (approx) |
  | 58 | `auto-approver-sweep` | 312 (approx) |

  Triage did NOT compute md5 — apply session captures md5 at pre-flight time as the baseline that the patched command will diverge from cleanly (post-patch md5 will differ in a known-controlled way: only the `timeout_milliseconds := 30000` insertion).

- If the live command for any job differs from the captured baseline AND that difference is not the no-op-guard `timeout_milliseconds` already-present case from §1.3, HALT and escalate.

### 1.5 Capture pre-state baselines for V3 / V4 verification

```sql
SELECT jobid, jobname, succeeded_runs, failed_runs, latest_run_status, latest_error,
       latest_error_at, computed_at
FROM m.cron_health_snapshot
WHERE jobid IN (33, 44, 58)
ORDER BY jobid, computed_at DESC
LIMIT 12;
```

**Purpose:** baseline for post-apply confirmation that no failures appear in subsequent snapshots. No HALT criterion; informational.

### 1.6 Capture `_http_response` baseline (informational)

```sql
SELECT date_trunc('hour', created) AS hour_bucket,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status_code = 200) AS http_200,
       COUNT(*) FILTER (WHERE timed_out = true) AS timed_out,
       COUNT(*) FILTER (WHERE status_code IS NULL) AS null_status
FROM net._http_response
WHERE created > now() - interval '6 hours'
GROUP BY hour_bucket
ORDER BY hour_bucket DESC;
```

**Purpose:** records the pre-patch HTTP outcome distribution within the available retention window so the post-patch comparison (V4) can demonstrate no regression. No HALT criterion.

---

## 2. Selection criterion (final, locked)

```
jobid IN (33, 44, 58)
```

Three specific jobs by id. No criterion-based selection; the scope is enumerated.

**Why these three:** all three were named in the F-CRON-PG-NET-TIMEOUT-5S finding registration. Triage confirmed all three currently use `net.http_post` without `timeout_milliseconds`. No other cron job is in scope of this brief; broader sweep belongs to a separate audit.

---

## 3. Proposed SQL (final, locked)

Applied via Supabase MCP `execute_sql` as a single call wrapping three `cron.alter_job(...)` statements. The migration name is informational (this is `execute_sql`, not `apply_migration`) and is recorded in the result file.

**Logical migration name:** `cron_pg_net_timeout_30s_v1`
**Project ID:** `mbkmaxqhsohbtwsqolns`

```sql
-- F-CRON-PG-NET-TIMEOUT-5S — patch jobs 33, 44, 58 to add timeout_milliseconds := 30000
-- See: docs/briefs/cc-0006-cron-pg-net-timeout-30s.md
-- See: F-CRON-PG-NET-TIMEOUT-5S in docs/00_action_list.md v2.54 (P2)
-- See: F-CRON-AUTO-APPROVER-SECRET-INLINE (separate P2 sec; OUT OF SCOPE for cc-0006)
--
-- Justification: pg_net's net.http_post default timeout_milliseconds is 5000 ms.
-- All three jobs omit the argument and therefore inherit the 5 s default. Workers in
-- question (video-worker, heygen-worker, auto-approver) can exceed 5 s on cold start
-- + DB query + outbound API. SQL completes regardless of HTTP outcome, so cron-side
-- telemetry never surfaces the timeout. Setting an explicit 30000 ms ceiling brings the
-- HTTP deadline into line with realistic worker latency without exceeding the EF
-- platform ceiling.
--
-- Job 58 PRESERVES its inline x-auto-approver-key secret verbatim. Secret rotation is
-- tracked separately under F-CRON-AUTO-APPROVER-SECRET-INLINE; this brief does not
-- touch the security shape.

-- Job 33 — video-worker-every-30min (every 30 min; vault-secret auth)
SELECT cron.alter_job(
  job_id := 33,
  command := $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
          || '/functions/v1/video-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-video-worker-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'publisher_api_key')
    ),
    body := '{}',
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);

-- Job 44 — heygen-worker-every-30min (every 30 min; vault-secret auth)
SELECT cron.alter_job(
  job_id := 44,
  command := $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
          || '/functions/v1/heygen-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-heygen-worker-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'publisher_api_key')
    ),
    body := '{}',
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);

-- Job 58 — auto-approver-sweep (every 10 min; INLINE secret PRESERVED VERBATIM —
-- F-CRON-AUTO-APPROVER-SECRET-INLINE is a separate brief and out of scope here)
SELECT cron.alter_job(
  job_id := 58,
  command := $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
          || '/functions/v1/auto-approver',
    headers := '{"Content-Type": "application/json", "x-auto-approver-key": "DfMs_7SfmGnQA.B"}'::jsonb,
    body := '{"limit": 30}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
```

**Notes on the SQL:**

1. **Atomicity:** Supabase MCP `execute_sql` runs all statements in a single transaction by default. If any of the three `cron.alter_job` calls raises, the entire transaction rolls back and no cron metadata is changed. No partial state.
2. **Idempotency:** if accidentally re-run, each `cron.alter_job` simply re-writes the same command body. No state mutation beyond `command` being set to the same value. Safe to re-attempt within the apply session.
3. **`cron.alter_job` semantics:** sets the `command` column on `cron.job` for the specified job_id. Does NOT change `schedule`, `database`, `username`, `nodename`, `nodeport`, or `active` — those columns retain prior values. Verified-safe by design.
4. **Inline secret on job 58:** the `x-auto-approver-key` value `DfMs_7SfmGnQA.B` is intentionally preserved character-for-character. Any character difference would constitute a security action that requires a separate brief + PK auth.
5. **Quoting:** `$$ … $$` dollar-quoting is used for each command body to avoid escape gymnastics on the embedded JSON / nested quotes. This matches the prevailing style across the repo's other `cron.alter_job` examples.
6. **No `WHERE` clause:** `cron.alter_job` is a function call, not an UPDATE. Each invocation targets exactly one `job_id`.

---

## 4. P1–P5 pre-flight checklist (per Lesson #61)

Apply session walks each step, captures evidence, and refuses to proceed past any FAIL.

### P1 — Pre-state capture

- [ ] **P1.1** Run §1.1 `net.http_post` signature check; confirm `default_is_5000 = true`. HALT if substrate drift.
- [ ] **P1.2** Run §1.2 `cron.job` snapshot; confirm 3 rows present + `active = true`; persist `(jobid, command)` map. HALT if any missing or inactive.
- [ ] **P1.3** Run §1.3 no-op guard; confirm `already_has_timeout_arg = false` for all three. HALT (per-job or whole-brief, PK call) if any `true`.
- [ ] **P1.4** Run §1.4 md5 capture; persist baseline triples. Use this for V1 post-patch divergence proof.
- [ ] **P1.5** Run §1.5 cron_health_snapshot baseline; persist for V3 comparison.
- [ ] **P1.6** Run §1.6 `_http_response` baseline; persist for V4 comparison.

**Pass criterion:** all 6 checks PASS. Any FAIL halts the session.

### P2 — Side-effect surface

- [ ] **P2.1** `cron.alter_job` is a function call inside the postgres `cron` extension. It writes to `cron.job` (catalog-style table). No triggers fire on `cron.job` writes that are known to externalise.
- [ ] **P2.2** `pg_cron` background worker reads `cron.job` to schedule next runs. The next fire of each patched job will use the new command. **Magnitude:** the next scheduled run for each job (jobs 33/44 next at the next 30-min mark; job 58 next at the next 10-min mark).
- [ ] **P2.3** No EF deploys, no DB DDL, no row-level changes to any production table. `m.post_publish_queue`, `m.post_draft`, `m.slot`, `m.ai_job` etc. are completely untouched.
- [ ] **P2.4** Health-check Cowork (daily 02:00 AEST `docs/audit/health/{date}.md`) sees no count change. The patched cron commands' SQL still completes and returns a request_id — `cron.job_run_details` will continue showing `succeeded`.
- [ ] **P2.5** Worker EFs themselves see no change. They still receive the same headers, same body, same URL. The only difference is pg_net's deadline is now 30 s instead of 5 s — the EF doesn't observe this.
- [ ] **P2.6** Inline secret on job 58 is preserved character-for-character. F-CRON-AUTO-APPROVER-SECRET-INLINE risk profile is unchanged (still P2 sec).

**Pass criterion:** P2.1–P2.6 reviewed; no unaccounted-for side effect identified.

### P3 — Transitive dependency map

- [ ] **P3.1** Search for any function/view that references `cron.alter_job`:
  ```sql
  SELECT n.nspname, p.proname
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE pg_get_functiondef(p.oid) ILIKE '%cron.alter_job%'
    AND n.nspname IN ('m','public','c','f','a','k','t');
  ```
  **Decision rule:** for each result, confirm its caller pattern. None expected to collide with our specific 3-jobid scope. HALT only if a function is mid-execution that could re-write our jobs concurrently.

- [ ] **P3.2** Search for any function that re-defines or restores cron commands for jobs 33/44/58 by jobid or jobname:
  ```sql
  SELECT n.nspname, p.proname
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE pg_get_functiondef(p.oid) ~* '(33|44|58|video-worker-every-30min|heygen-worker-every-30min|auto-approver-sweep)'
    AND pg_get_functiondef(p.oid) ILIKE '%cron%';
  ```
  **Decision rule:** zero hits expected. If non-zero, read the function body — any function that restores/overwrites these jobs would undo this patch. HALT and escalate.

- [ ] **P3.3** Confirm no Cowork brief / scheduled task is scheduled to edit cron jobs in the apply window. Cowork tasks are listed in `docs/briefs/morning-inbox-sweep-v1.md` (DRAFT, not scheduled), `nightly-health-check-v1.md`. None edit cron. **Pass:** no action needed.

- [ ] **P3.4** Confirm `pg_cron` extension is at expected version. Check `SELECT extversion FROM pg_extension WHERE extname = 'pg_cron';`. Capture for record (no HALT criterion).

- [ ] **P3.5** Confirm `pg_net` extension is at expected version. Check `SELECT extversion FROM pg_extension WHERE extname = 'pg_net';`. Capture (no HALT criterion). Recommended by §1.1 substrate-drift check.

**Pass criterion:** P3.1–P3.5 reviewed; transitive readers either absent or non-conflicting.

### P4 — Reversibility

- [ ] **P4.1** Rollback SQL templated at apply time using captured original commands (per P1.2 snapshot). Three `cron.alter_job(jobid, command := <original>)` calls. **Cannot be templated in this brief** — original command text is read at apply time.
- [ ] **P4.2** Acknowledge irreversible side-effects: NONE. Cron metadata change only. No HTTP calls fired, no rows written, no notifications.
- [ ] **P4.3** Time-window for rollback: indefinite. The patched cron will fire on its schedule regardless; rollback can land at any future time.
- [ ] **P4.4** Confirm rollback would not collide with any newer command edits: rollback re-writes the captured original verbatim, so any later edit by a different session would be silently overwritten by the rollback. **Mitigation:** if rollback fires, re-run §1.2 and compare; if a third party has edited the command between apply and rollback, escalate to PK rather than blindly overwrite.

**Pass criterion:** P4.1–P4.4 PASS.

### P5 — Post-state verification preconditions

- [ ] **P5.1** V1: each patched command body contains `timeout_milliseconds := 30000` AND has `command_md5` differing from the P1.4 baseline. Define before apply.
- [ ] **P5.2** V2: `cron.job` rows for 33/44/58 retain `active = true`, same `schedule`, same `jobname`. Only `command` changed.
- [ ] **P5.3** V3: in next snapshot of `m.cron_health_snapshot` for each job, `latest_run_status = 'succeeded'`, `latest_error IS NULL`. Captured against P1.5 baseline.
- [ ] **P5.4** V4: in `net._http_response` 6 h post-patch window, 100% `status_code = 200`, 0 `timed_out = true`. Captured against P1.6 baseline.

**Pass criterion:** all 4 verification queries written and ready to fire post-apply (§7).

---

## 5. D-01 packet content (NOT YET FIRED)

When the apply session reaches D-01 fire, use exactly this packet structure. **Action type:** `cron_edit`.

### 5.1 `proposal` (prose)

```
Apply F-CRON-PG-NET-TIMEOUT-5S patch: add timeout_milliseconds := 30000 to net.http_post calls
in cron jobs 33, 44, 58.

Logical name: cron_pg_net_timeout_30s_v1
Project: mbkmaxqhsohbtwsqolns
Method: Supabase MCP execute_sql wrapping three sequential cron.alter_job(...) statements,
        single transaction.
Scope: cron.job rows for jobid IN (33, 44, 58). No other cron job, no other table.
Action: SET command (via cron.alter_job) to the same command body PLUS
        `timeout_milliseconds := 30000` in the net.http_post call.
        All other elements (URL, headers, body, schedule, active flag) preserved verbatim.
        Job 58 inline x-auto-approver-key secret PRESERVED VERBATIM
        (F-CRON-AUTO-APPROVER-SECRET-INLINE is a separate brief and out of scope).

WHY: pg_net's net.http_post default timeout_milliseconds is 5000 ms (verified live via
pg_get_function_arguments). All three jobs omit the argument and inherit the 5 s default.
The Edge Functions (video-worker, heygen-worker, auto-approver) can exceed 5 s on cold
start + DB query + outbound API. SQL completes regardless of HTTP outcome, so cron-side
telemetry (cron.job_run_details, m.cron_health_snapshot) never surfaces these timeouts.

EVIDENCE NOTE: the F-CRON-PG-NET-TIMEOUT-5S registration cited specific events at
2026-05-08 03:00/03:30/04:00/07:30 UTC. Those events are no longer DB-recoverable —
net._http_response retention is ~6 hours and the cited rows have been pruned. This
patch is justified on the structural defect (5000 ms default + jobs omit the arg),
not on incident re-reproduction.

ROLLBACK: pre-flight P1.2 captures original command text per job; rollback uses three
cron.alter_job(jobid, command := <captured original>) calls. No data state change.

VERIFICATION: V1-V4 per cc-0006 §7. Cron-side V1+V2 verify metadata change. Worker-side
V3+V4 verify no new failures appear in m.cron_health_snapshot or net._http_response
within the post-patch observation window.
```

### 5.2 `context` (structured object)

```json
{
  "decision_under_review": "Apply cc-0006: add timeout_milliseconds := 30000 to net.http_post in cron jobs 33, 44, 58",
  "production_action_if_approved": "Single Supabase MCP execute_sql call wrapping three cron.alter_job(...) statements, in one transaction. Each call sets the cron.job.command for one specific jobid to a command body identical to the current one EXCEPT it adds timeout_milliseconds := 30000 to the net.http_post call. URLs, headers, body, schedule, active flag are preserved verbatim. Job 58's inline secret (x-auto-approver-key value 'DfMs_7SfmGnQA.B') is preserved character-for-character — security rotation is tracked separately under F-CRON-AUTO-APPROVER-SECRET-INLINE and is OUT OF SCOPE.",
  "consequence_if_delayed": "Low-grade latent risk continues. Workers occasionally exceed 5 s and pg_net abandons the connection while the EF logic continues server-side. Workload outcome may silently complete without retry visibility. Each delayed week is another set of slow-fire cycles where cron-side telemetry shows green but HTTP results are not actually captured. No customer-visible incident expected from delay.",
  "cost_of_waiting": "Low. The 5000 ms default is the structural defect; the patch is conservative (30 s well below EF ceiling) and has no data-state implications. Brief authoring is one-shot; apply is one transaction. No drain considerations.",
  "current_evidence": [
    "Pre-flight §1.1 net.http_post default verified live: timeout_milliseconds DEFAULT 5000 (via pg_get_function_arguments)",
    "Pre-flight §1.2 cron.job rows present + active for jobid IN (33, 44, 58); baseline command text captured for rollback",
    "Pre-flight §1.3 no-op guard: <result> (expected: all three already_has_timeout_arg = false)",
    "Pre-flight §1.4 md5 baseline captured",
    "Pre-flight §1.5 m.cron_health_snapshot baseline: 0 failures, latest_run_status='succeeded' for all 3 (last 7 d at triage time)",
    "Pre-flight §1.6 net._http_response 6 h baseline: 392 responses, 100% http_200, 0 timed_out, 0 null_status (at triage time)",
    "F-CRON-AUTO-APPROVER-SECRET-INLINE is an OPEN P2 (security) finding for job 58 — preserved as-is in this patch; rotation is a separate cc-NNNN brief"
  ],
  "known_weak_evidence": [
    "The F-CRON-PG-NET-TIMEOUT-5S registration cited specific timeout events at 2026-05-08 03:00/03:30/04:00/07:30 UTC. These are no longer DB-recoverable: net._http_response retention is ~6 hours and the cited rows have been pruned. Triage's available 6-hour window showed 0 timed_out responses for any cron-driven HTTP call. The structural argument (5000 ms default + jobs omit the arg) stands independently, but the empirical record of THIS specific failure mode firing in production is not currently re-verifiable from DB.",
    "The 30000 ms ceiling is conservative but not load-tested. If an EF actually requires >30 s under any cold-start condition, the patch would still cut the call short. Mitigation: 30 s is well above the worst-case observed cold-start for the 3 EFs in question (sub-3 s typical, sub-10 s worst case empirically per ad-hoc observation). If post-patch monitoring shows new timed_out responses at the 30 s mark, raise to 60 s or higher in a follow-up patch.",
    "Job 58 carries an inline hardcoded secret (F-CRON-AUTO-APPROVER-SECRET-INLINE). Preserving it verbatim through this patch maintains the existing risk profile but does NOT improve it. A reviewer might argue that touching job 58's command at all is the right moment to fix the security issue — counter-argument: bundling timeout fix + secret rotation requires PK auth + vault provisioning + key rotation steps that broaden scope and delay the timeout fix. Keeping cc-0006 narrow is intentional.",
    "cron.alter_job is one of the few cron-extension functions with side-effect on cron metadata. No precedent for using it on these specific 3 jobs in this codebase (commit history shows no prior alter_job calls on jobid 33/44/58). First-use risk is low because cron.alter_job is well-documented and atomic.",
    "Post-patch observation window for V4 is bounded by net._http_response retention (~6 h). If the apply happens during a quiet period, V4 may not see enough fire cycles to demonstrate no regression. Mitigation: V3 (m.cron_health_snapshot) extends observation to the next snapshot computation regardless of _http_response retention."
  ],
  "default_action": "proceed if D-01 returns clean agree; halt and escalate to PK if any escalation, pushback, or risk-elevation",
  "references": {
    "cc-0006 brief": "docs/briefs/cc-0006-cron-pg-net-timeout-30s.md (this file)",
    "F-CRON-PG-NET-TIMEOUT-5S registration": "docs/00_action_list.md v2.54",
    "F-CRON-AUTO-APPROVER-SECRET-INLINE (out of scope)": "docs/00_action_list.md v2.54 (separate P2 sec)",
    "Triage report (in-session, not committed)": "CC read-only triage 2026-05-09 (post cc-0004 apply)",
    "cc-0003 brief shape (pattern source)": "docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md",
    "cc-0004 patched brief (pattern source)": "docs/briefs/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md"
  },
  "sql_to_apply": "<full SQL from cc-0006 §3 verbatim>"
}
```

### 5.3 Decision rule on D-01 verdict

- **Verdict `agree` + `proceed` + risk ≤ medium + 0 pushback:** apply.
- **Verdict `agree` with non-trivial pushback:** treat as escalation; PK approval required before apply.
- **Verdict anything else (escalate, partial, refuse, disagree):** halt; escalate to PK; do NOT apply on chat judgement alone.
- **Lesson #62 v2.50 refinement:** if D-01 pushback specifically targets the empirical-evidence gap (the 8 May events not being DB-recoverable), accept the gap as a first-class limitation. The structural argument is the load-bearing justification — not the historical record. PK can independently authorise on the structural argument alone. Override only with PK explicit approval per existing protocol.

---

## 6. Apply procedure

After D-01 returns clean agree + PK explicit approval:

1. **Final read-only re-verification** — re-run §1.1 + §1.2 + §1.3 + §1.4 within ~60 s of apply. Confirm:
   - `default_is_5000 = true` (no substrate drift)
   - all 3 jobs present + active (no concurrent disable/delete)
   - none of the 3 already has `timeout_milliseconds` (no concurrent patch from another session)
   - md5 of each command equals the baseline (no concurrent edit by another session)
   - If any check fails → HALT per §8.2.

2. **`execute_sql` call** — single Supabase MCP call wrapping the three `cron.alter_job(...)` statements per §3 verbatim.

3. **Capture the result** — record success vs failure, exact return value, any RAISE NOTICE messages.

4. **Run all 4 verification queries (§7)** — if any fails, immediately move to §8.3 rollback.

5. **If all 4 PASS:** session continues to close-the-loop UPDATE on `m.chatgpt_review` (chat-owned) and 4-way sync.

---

## 7. Verification queries (post-apply)

Run all 4 in sequence. Each must PASS to declare success.

### V1 — Patched commands contain `timeout_milliseconds` and md5 has changed

```sql
SELECT jobid,
       command ILIKE '%timeout_milliseconds%' AS has_timeout_arg,
       command ILIKE '%30000%' AS has_30000_value,
       md5(command) AS post_md5
FROM cron.job
WHERE jobid IN (33, 44, 58)
ORDER BY jobid;
```

**Pass:** all 3 rows show `has_timeout_arg = true`, `has_30000_value = true`, AND `post_md5` differs from the captured baseline md5 from §1.4. (Triage did not compute md5; the apply session captures it during pre-flight.)

### V2 — All other cron metadata preserved

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobid IN (33, 44, 58)
ORDER BY jobid;
```

**Pass:** unchanged from §1.2 baseline:
- (33, `video-worker-every-30min`, `*/30 * * * *`, true)
- (44, `heygen-worker-every-30min`, `*/30 * * * *`, true)
- (58, `auto-approver-sweep`, `*/10 * * * *`, true)

### V3 — Next cron_health_snapshot shows no new failures

```sql
SELECT jobid, jobname, latest_run_status, latest_error, latest_error_at, computed_at
FROM m.cron_health_snapshot
WHERE jobid IN (33, 44, 58)
  AND computed_at > <patch_time>
ORDER BY jobid, computed_at DESC
LIMIT 12;
```

**Pass:** for each of the 3 jobs, the most recent snapshot post-`<patch_time>` has `latest_run_status = 'succeeded'` and `latest_error IS NULL`. **Timing:** `m.cron_health_snapshot` is computed periodically; the apply session may need to wait one snapshot interval (typically ~5–15 min depending on the snapshot cron) before V3 can be evaluated. Acceptable wait; it does NOT block the close-the-loop UPDATE if V1+V2 PASS and V3 is pending — capture the wait + outcome in the result file.

### V4 — `_http_response` window post-patch shows no timeouts

```sql
SELECT date_trunc('hour', created) AS hour_bucket,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status_code = 200) AS http_200,
       COUNT(*) FILTER (WHERE timed_out = true) AS timed_out,
       COUNT(*) FILTER (WHERE status_code IS NULL) AS null_status
FROM net._http_response
WHERE created > <patch_time>
GROUP BY hour_bucket
ORDER BY hour_bucket DESC;
```

**Pass:** within the post-patch window (bounded by ~6 h `_http_response` retention), 100% of responses are `status_code = 200`, 0 `timed_out = true`, 0 `null_status`. **Caveat:** during a quiet period, V4 may show very few rows — do NOT inflate this into a positive signal. The pre-patch baseline from §1.6 already showed 0 timeouts within the available 6-h window, so V4's value is "no regression" rather than "improvement". V3 is the load-bearing health check.

---

## 8. Rollback / no-op / halt logic

### 8.1 NO-OP path (run before D-01 fire)

If §1.3 returns `already_has_timeout_arg = true` for ALL three jobs:

1. NO `execute_sql` apply call.
2. NO D-01 fire (nothing to review).
3. Document outcome in the cc-0006 result file: "cc-0006 no-op: all three jobs already carry timeout_milliseconds. Pre-flight indicates a prior session has already patched them. Migration retiring without apply."
4. Action list bump: close F-CRON-PG-NET-TIMEOUT-5S as `no_op_already_patched` after confirming the existing timeout values are sane (≥ 30000 expected).
5. No memory edit beyond the standard close.

If §1.3 returns `already_has_timeout_arg = true` for SOME but not all three jobs, PK directs whether to:
- (a) Patch only the unflagged jobs (skip the already-patched ones), OR
- (b) Halt and escalate.

### 8.2 HALT paths (substrate or scope drift)

**8.2.a Substrate drift:** §1.1 returns `default_is_5000 = false`:

1. NO `execute_sql` apply call.
2. NO D-01 fire (the structural justification needs re-evaluation).
3. Document: "cc-0006 halted at apply: net.http_post default has changed from 5000 ms. Brief justification needs re-derivation."
4. Escalate to PK with the new default value + brief amendment options.

**8.2.b Job missing or inactive:** §1.2 returns fewer than 3 rows or any `active = false`:

1. NO `execute_sql` apply call.
2. NO D-01 fire.
3. Document: "cc-0006 halted at apply: jobid <N> missing or inactive at pre-flight."
4. Escalate to PK with the actual cron.job state.

**8.2.c Concurrent edit:** §1.4 md5 baseline differs from triage capture in a way NOT explained by §1.3 no-op guard:

1. NO `execute_sql` apply call.
2. Document: "cc-0006 halted at apply: jobid <N> command edited between triage and apply. Captured md5 vs pre-flight md5 differ."
3. Escalate to PK with the diff.

### 8.3 ROLLBACK path (verification fails after apply)

If any of V1–V4 FAIL:

1. Immediately halt session continuation; do NOT proceed to close-the-loop or 4-way sync.
2. Apply rollback `execute_sql` wrapping three `cron.alter_job(...)` calls — one per affected jobid — using the captured original command text from P1.2 (NOT the criterion-based WHERE; the P1.2 snapshot IS the rollback authority):
   ```sql
   SELECT cron.alter_job(job_id := 33, command := <P1.2-captured original for 33>);
   SELECT cron.alter_job(job_id := 44, command := <P1.2-captured original for 44>);
   SELECT cron.alter_job(job_id := 58, command := <P1.2-captured original for 58>);
   ```
   The actual rollback SQL is constructed at apply time from P1.2's snapshot (cannot be templated in advance because the capture is point-in-time).
3. Re-run V1–V4 to confirm rollback restored pre-apply state. V1 post-rollback should show `has_timeout_arg = false` and `post_md5 = baseline_md5` for all three.
4. Document: "cc-0006 applied + rolled back. Pre-state restored. Failure mode: <verification ID + diagnosis>."
5. PK escalation; cc-0006v2 with corrective measures.

### 8.4 Why not template the rollback in this brief

The rollback SQL needs the captured original command text per job from §1.2. That snapshot is known only at apply time (the live commands could differ slightly from the triage-time text shown in §3, e.g. if PK manually adjusted whitespace between triage and apply). Templating now would either (a) hardcode the triage-time text (wrong if a benign edit happened in between), or (b) re-derive at apply (which is what §8.3 specifies). The brief specifies the mechanism; the apply session writes the literal SQL.

---

## 9. Stop condition

The cc-0006 apply session is COMPLETE when:

1. §1 pre-flight all 6 checks PASS.
2. §4 P1–P5 all PASS.
3. §5 D-01 fire returns clean agree + PK approval.
4. §6 apply procedure completes; `execute_sql` returns success on all three `cron.alter_job` calls.
5. §7 verification V1+V2 PASS immediately; V3 PASS within one cron_health_snapshot interval (capture wait in result file); V4 PASS within the available 6-h `_http_response` retention (capture caveats per §7 V4).
6. Close-the-loop UPDATE on `m.chatgpt_review` (chat-owned).
7. Result file `docs/briefs/results/cc-0006-cron-pg-net-timeout-30s.md` created and committed.
8. 4-way sync close: session file + sync_state pointer + action_list closure of F-CRON-PG-NET-TIMEOUT-5S + memory `recent_updates` entry.

If any of §8.1, §8.2.a, §8.2.b, §8.2.c, or §8.3 paths trigger: report the outcome and stop. Do NOT cross to F-CRON-AUTO-APPROVER-SECRET-INLINE (the security rotation) in the same session unless PK explicitly directs.

The cc-0006 brief itself (this file) is COMPLETE when committed and verified. The apply session is a separate execution that uses this brief.

---

## Success criteria (for this brief draft, NOT for the apply itself)

This cc-0006 brief is correctly drafted when:

1. The brief file exists at `docs/briefs/cc-0006-cron-pg-net-timeout-30s.md`.
2. The apply procedure can be executed by chat or CC using only this brief + read-only DB access + Supabase MCP `execute_sql`, without re-reading the triage.
3. Forbidden actions are explicit and enumerated (jobid scope, no secret rotation, no schedule change).
4. SQL is locked to the version in §3.
5. Verification queries V1–V4 are runnable as-is.
6. Rollback mechanism is concrete (captures originals at P1.2; rebuilds rollback SQL at apply time).
7. Disjointness vs F-CRON-AUTO-APPROVER-SECRET-INLINE is explicit (job 58's secret is preserved verbatim; rotation is a separate brief).
8. The empirical-evidence gap (8 May events no longer DB-recoverable) is explicitly acknowledged in the D-01 packet `known_weak_evidence` block.
9. No production state changed by drafting this brief.

---

## Notes

This is the fourth cc-NNNN brief in the brief-runner-v0 trial; **first cron-edit-class brief** (cc-0001 was decision-only; cc-0002 was sync-only commit; cc-0003 + cc-0004 were `apply_migration` SQL DDL/DML). cc-0006 introduces the `cron_edit` action_type for D-01 and the `execute_sql` apply method.

### New patterns vs prior briefs

1. **`cron_edit` action_type vs `sql_destructive`** — first use in the cc-NNNN series. D-01 reviewer should treat cron metadata edits with similar care as DML (cron edits change behaviour silently across all future fire cycles), but the data-state impact is zero. Worth observing how D-01 handles this verdict-class differently (or not) than `sql_destructive`.
2. **`execute_sql` vs `apply_migration`** — `cron.alter_job` doesn't fit the migration model (no schema change, no version bump, no idempotent re-runnable migration name semantics). `execute_sql` is the right tool. Apply session should record the logical name `cron_pg_net_timeout_30s_v1` in the result file even though Supabase's migration registry does not.
3. **md5 baseline + post-md5 divergence** — first use of this verification idiom. Useful for any future "patch metadata, preserve everything else" brief.
4. **Empirical-evidence-gap acknowledgement in D-01 packet** — the brief explicitly tells the D-01 reviewer that the cited incidents are no longer DB-recoverable. Pattern worth promoting to a brief-runner-v0 standing rule for any patch where the registering finding's evidence has retention bounds.

### Open: brief-runner-v0 watch items for cc-0006 specifically

1. **V3 timing** — `m.cron_health_snapshot` is computed periodically; the wait-for-next-snapshot pattern is new vs cc-0003/cc-0004 (which had immediate verification). Result file should note actual wait duration and outcome.
2. **V4 retention coupling** — `_http_response` 6-h retention couples V4 quality to apply-session timing. If apply happens during quiet hours, V4 may not have enough rows. The brief explicitly downgrades V4 to "no regression" semantics; V3 is load-bearing.
3. **Job 58 inline secret** — the deliberate non-action on the security issue means the patch leaves a known-flagged risk intact. Result file should explicitly state "F-CRON-AUTO-APPROVER-SECRET-INLINE remains OPEN; cc-0006 did not touch its risk profile."
4. **No `pg_get_function_arguments` substrate-drift check precedent** — §1.1's check that `net.http_post` default is still 5000 is a paranoid first-of-its-kind guard. If the substrate has changed (e.g. Supabase platform upgrade silently raised the default), the patch might be unnecessary. Worth adopting the substrate-drift check as a standing pattern for any brief that justifies an action on a substrate constant.

---

*Brief authored 2026-05-09 Sydney by chat from CC's read-only triage. Inputs: F-CRON-PG-NET-TIMEOUT-5S registration in action_list v2.54; live `cron.job` rows for jobid IN (33, 44, 58); verified `net.http_post` default = 5000 ms via `pg_get_function_arguments`; cc-0003 + cc-0004 brief shapes; F-CRON-AUTO-APPROVER-SECRET-INLINE separation. Output: full apply brief (pre-flight + multi-job cron.alter_job SQL via execute_sql + P1–P5 + D-01 packet with cron_edit action_type + V1–V4 verification + rollback via captured originals + halt paths + stop condition). No production state changed. Awaiting PK direction to schedule the cc-0006 apply session.*
