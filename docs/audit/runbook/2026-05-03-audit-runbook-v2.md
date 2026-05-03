# ICE Audit Runbook v2

> **Purpose**: Enable a third-party (ChatGPT, an external auditor, or PK acting as auditor) to run a full audit of the ICE pipeline without writing ad-hoc SQL or having insider knowledge.
>
> **Scope**: Diagnostic only. Read-only. No mutations. No secret access.
>
> **Created**: 2026-05-03 night Sydney v2. Supersedes v1 (`2026-05-03-audit-runbook-v1.md`) which had 4 verified errors uncovered by ChatGPT external audit run.
>
> **v2 corrections**:
> 1. Replaced broken `m.worker_http_log` references with `net._http_response` (aggregate) + `m.post_publish` (per-publisher outcomes) + `m.cron_health_status` (per-cron heartbeat) — `worker_http_log` only logs cron_jobid 5 with NULL `status_code`, not usable for publisher health
> 2. Fixed `m.cron_health_status` predicate vocabulary — column is `status` (text, value `'green'`), not boolean `is_healthy`
> 3. Added explicit publisher cron jobid table for grounding
> 4. Added row-list discipline section for any sweep-style migrations
> 5. Re-verified every example query against live DB before committing

---

## How to run an audit (execution order)

### Step 1 — Pipeline overview (one-line health check)

```sql
SELECT * FROM m.vw_ops_pipeline_health;
```

Returns one row with system-wide latest timestamps and aggregate counts. Quick "is the pipeline alive" check.

### Step 2 — Cron heartbeat health

```sql
-- All cron jobs and their heartbeat status
-- IMPORTANT: status is text, allowed values include 'green'. Don't use a boolean predicate.
SELECT jobname, status, last_heartbeat_at, minutes_since_last,
       expected_interval_minutes, consecutive_misses
FROM m.cron_health_status
WHERE status != 'green'
ORDER BY consecutive_misses DESC, minutes_since_last DESC;
```

Empty result = all crons healthy. Any rows = investigate each.

### Step 3 — Brand/platform matrix (the spine)

```sql
SELECT
  client_slug, platform, likely_bottleneck,
  queue_ready, max_queued_per_platform AS cap,
  approved_drafts_without_queue,
  failed_slots_7d, overdue_pending_fill_slots, orphan_filled_slots,
  legacy_spread_mismatch_count,
  latest_published_at, published_7d
FROM audit.v_brand_platform_audit_matrix
ORDER BY
  CASE likely_bottleneck WHEN 'ok_or_recently_active' THEN 99 ELSE 1 END,
  client_slug, platform;
```

Returns one row per (active client, platform). Read the `likely_bottleneck` column for the dominant blocker. Healthy streams sort to the bottom.

### Step 4 — Aggregate publisher HTTP health

```sql
-- All Edge Function calls in the last 6 hours via pg_net
SELECT
  COUNT(*) AS total_calls,
  COUNT(*) FILTER (WHERE status_code = 200) AS ok,
  COUNT(*) FILTER (WHERE status_code BETWEEN 400 AND 499) AS http_4xx,
  COUNT(*) FILTER (WHERE status_code BETWEEN 500 AND 599) AS http_5xx,
  COUNT(*) FILTER (WHERE timed_out IS TRUE) AS timeouts,
  COUNT(*) FILTER (WHERE error_msg IS NOT NULL) AS errored
FROM net._http_response
WHERE created > NOW() - INTERVAL '6 hours';
```

**Caveat**: `net._http_response` has no URL column — you cannot attribute a specific call to a specific cron / publisher from this table alone. `net.http_request_queue` only holds pending requests, not historic. For per-publisher attribution, use Step 5 (`m.post_publish` outcome counts) or Step 7 (specific drill-downs).

```sql
-- Recent failures (status != 200, errors, timeouts)
SELECT id, status_code, content_type, timed_out,
       LEFT(error_msg, 200) AS error_msg,
       LEFT(content::text, 200) AS content_head,
       created
FROM net._http_response
WHERE created > NOW() - INTERVAL '6 hours'
  AND (status_code != 200 OR error_msg IS NOT NULL OR timed_out IS TRUE)
ORDER BY created DESC
LIMIT 20;
```

### Step 5 — Per-publisher outcome verification

`net._http_response` is unattributable. To verify each publisher is actually working, look at the **outcome table** directly:

```sql
-- Recent published rows per (client, platform) — proof-of-published
SELECT client_slug, platform, status, platform_post_id, published_at
FROM audit.v_publish_success_recent
ORDER BY published_at DESC
LIMIT 50;
```

Cross-reference with the matrix's `latest_published_at` and `published_7d` columns. Any (client, platform) combo with no rows in the last 24h that isn't paused warrants investigation.

### Step 6 — System-level failure surface

```sql
-- Recent failures (24h, redacted-safe)
SELECT * FROM m.vw_ops_failures_24h;

-- Open incidents
SELECT incident_id, opened_at, severity, summary
FROM m.pipeline_incident
WHERE resolved_at IS NULL
ORDER BY opened_at DESC;

-- Recent doctor / fixer log activity
SELECT created_at, log_type, severity, LEFT(summary, 150) AS summary
FROM m.pipeline_doctor_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC LIMIT 20;
```

### Step 7 — Drill into each non-OK matrix row

The `likely_bottleneck` enum maps to a drill-down query:

| Bottleneck | What it means | Drill-down query |
|---|---|---|
| `channel_disabled` | `c.client_channel.is_enabled = false` | `SELECT client_id, platform, handle, is_enabled FROM c.client_channel WHERE client_id = ... AND platform = ...` |
| `publishing_disabled` | `c.client_publish_profile.publish_enabled = false` | `SELECT client_id, platform, publish_enabled, status, mode, paused_at, paused_reason FROM c.client_publish_profile WHERE client_id = ... AND platform = ...` (don't query `page_access_token` / `refresh_token` columns — secrets) |
| `publish_profile_paused` | `paused_until > NOW()` | Same as above; check `paused_at`, `paused_until`, `paused_reason` |
| `token_failure` | Most-recent `m.platform_token_health.ok = false` | `SELECT checked_at, ok, expires_at, LEFT(err, 500) FROM m.platform_token_health WHERE client_id = ... AND platform = ... ORDER BY checked_at DESC LIMIT 5` |
| `approved_not_queued_cap_blocked` | Approved drafts can't enter queue because `queue_ready ≥ max_queued_per_platform` | Verify cap + queue depth via `audit.v_publish_queue_summary`; F-PUB-010 hard-cap cron `delete-queue-overflow` enforces |
| `slot_pending_fill_overdue` | Slots stuck in `pending_fill` past `scheduled_publish_at` | `SELECT slot_id, scheduled_publish_at, status, fill_attempts, skip_reason FROM m.slot WHERE client_id = ... AND platform = ... AND status = 'pending_fill' AND scheduled_publish_at < NOW()` |
| `slot_fill_failed` | Slots in terminal `failed` state in last 7d | `SELECT slot_id, scheduled_publish_at, fill_attempts, skip_reason FROM m.slot WHERE client_id = ... AND platform = ... AND status = 'failed' AND scheduled_publish_at >= NOW() - INTERVAL '7 days'`. If `skip_reason LIKE 'marked_failed:%exceeded_recovery_attempts%'`, recovery loop pathology — see CFW LinkedIn case study |
| `slot_orphan_filled` | Slot `status='filled'` but `filled_draft_id IS NULL` | `SELECT slot_id, scheduled_publish_at, filled_at, fill_attempts FROM m.slot WHERE client_id = ... AND platform = ... AND status = 'filled' AND filled_draft_id IS NULL` |
| `publish_queue_overdue` | Queue rows `status='queued'` but `scheduled_for < NOW()` | `SELECT * FROM audit.v_publish_queue_summary WHERE overdue_ready_items > 0`; check publisher cron heartbeat in Step 2 |
| `publish_queue_failed_or_dead` | Rows with `status IN ('failed','dead')` | `SELECT scheduled_for, status, attempt_count, last_error_code, LEFT(last_error, 200), LEFT(dead_reason, 200) FROM m.post_publish_queue WHERE client_id = ... AND platform = ... AND status IN ('failed','dead') ORDER BY updated_at DESC LIMIT 20` |
| `legacy_spread_mismatch` | Queue rows scheduled > 6h from underlying slot's `scheduled_publish_at` | F-PUB-009 manifestation. `SELECT s.slot_id, s.scheduled_publish_at AS slot_when, q.scheduled_for AS queue_when, q.scheduled_for - s.scheduled_publish_at AS drift FROM m.slot s JOIN m.post_publish_queue q ON q.post_draft_id = s.filled_draft_id WHERE s.client_id = ... AND s.platform = ... AND q.status = 'queued' ORDER BY drift DESC` |
| `never_published_or_no_record` | No row in `m.post_publish` for this (client, platform) | New stream or never reached publish stage. Check that drafts are being created and slots are being filled |
| `publishing_stale` | Last publish > 7 days ago | Investigate token, queue, recent errors per Steps 2/4/6 |
| `ok_or_recently_active` | All checks pass | No action needed |

### Step 8 — Audit log review

```sql
-- Recent intentional manual interventions
SELECT run_at, triggered_by, results, overall_status
FROM m.system_audit_log
ORDER BY run_at DESC
LIMIT 20;
```

---

## Publisher cron jobid reference (verified 2026-05-03)

When a `likely_bottleneck` points at the publisher path, ground each diagnosis in the actual cron job:

| jobid | jobname | schedule | active | notes |
|---|---|---|---|---|
| **7** | `publisher-every-10m` | `*/5 * * * *` | TRUE | Main Facebook publisher (despite name says 10m, schedule is every 5m) |
| **34** | `youtube-publisher-every-30min` | `15,45 * * * *` | TRUE | YouTube publisher |
| **53** | `instagram-publisher-every-15m` | `*/15 * * * *` | **FALSE** | PAUSED — do not assume IG publishing is happening |
| **54** | `linkedin-zapier-publisher-every-20m` | `*/20 * * * *` | TRUE | LinkedIn via Zapier webhook bridge |
| **55** | `wordpress-publisher-every-6h` | `0 */6 * * *` | TRUE | CFW website publisher |

**Important**: `m.worker_http_log` only captures cron_jobid 5 (ai-worker), and even those rows have NULL `status_code`. This is a known instrumentation gap (see B-WORKER-LOG-GAP P3 backlog). **Do not use `m.worker_http_log` for publisher health verification.** Use `net._http_response` (aggregate) or `m.post_publish` (per-publisher outcomes).

---

## Row-list discipline (for any sweep-style mutation)

Tonight's apply session caught a planning failure: a proposed cap of 30 wouldn't have unblocked streams already at 50-105 queued. ChatGPT external audit also caught that a "10-row sweep" plan was actually 16+ rows in reality, with broader picture remaining (47 dead rows total post-sweep).

**Rule**: any DML that deletes / modifies rows **must** include an explicit row-list dry-run inside the migration before the mutation. Pattern:

```sql
-- Step 1: identify exact rows
SELECT queue_id, client_id, platform, scheduled_for, created_at, updated_at,
       last_error
FROM m.post_publish_queue
WHERE status = 'dead'
  AND last_error LIKE 'specific_error_pattern:%'
ORDER BY updated_at;
-- Document expected row count in migration comment

-- Step 2: same WHERE clause used for DELETE
WITH deleted AS (
  DELETE FROM m.post_publish_queue
  WHERE status = 'dead'
    AND last_error LIKE 'specific_error_pattern:%'
  RETURNING client_id, platform
)
INSERT INTO m.system_audit_log (triggered_by, ...)
-- triggered_by must be one of: scheduled, manual, pre-deploy, post-incident
SELECT 'manual', ...;
```

Selection rule must be explicit, narrow, and bounded. "Sweep all dead rows" is never acceptable without enumerating which conditions are actually targeted.

---

## What's safe to query

- **`audit.*`** schema views (this runbook's primary audit surface; bounded windows; no secrets)
- **`m.vw_ops_*`** views (existing operational dashboards)
- **`m.cron_health_*`** tables (status/heartbeat info)
- **`m.pipeline_doctor_log`**, **`m.pipeline_fixer_log`**, **`m.pipeline_incident`**, **`m.pipeline_health_log`**, **`m.system_audit_log`** (audit log family)
- **`c.client`**, **`c.client_channel`**, **`c.client_publish_profile`** (excluding token columns), **`c.client_publish_schedule`**
- **`m.post_draft`** (excluding `body_text` if large), **`m.post_publish`** (excluding `request_payload` / `response_payload`), **`m.post_publish_queue`** (excluding payload), **`m.slot`**, **`m.platform_token_health`** (excluding any access/refresh token columns)
- **`net._http_response`** (response status, error_msg, timed_out, content) — `content` may be sensitive depending on what publisher returns; trim with `LEFT(content::text, N)`

## What NOT to query

| Forbidden | Why |
|---|---|
| `cron.job.command` | May contain bearer tokens / vault references in cron SQL |
| `cron.job_run_details.return_message` | May contain large/sensitive payloads; table itself is bloated (~260MB; B-CRON-BLOAT P3) |
| `vault.*` | Secret store |
| `c.client_publish_profile.page_access_token` / `.refresh_token` | OAuth secrets |
| `m.platform_token_health.access_token` / `.refresh_token` (if present) | OAuth secrets |
| `m.ai_job.input_payload` / `.output_payload` | Large JSON, expensive |
| `m.worker_http_log.content` | Response bodies may include sensitive data; also worker_http_log is broken instrumentation, prefer net._http_response |
| `m.post_publish.request_payload` / `.response_payload` | Large publishing JSON |
| `m.post_publish_queue.payload` (if present) | Same |
| `m.post_draft.body_text` (when full text not needed) | Large; use `body_excerpt` or `LEFT(body_text, 500)` instead |

---

## Severity / triage guidance

| Bottleneck | Default severity | Action urgency |
|---|---|---|
| `channel_disabled`, `publishing_disabled`, `publish_profile_paused` | INFO | None (intentional config) |
| `token_failure` | P1 | Within hours |
| `approved_not_queued_cap_blocked` | P1 | Within hours (drafts piling up) |
| `slot_fill_failed` (recovery_attempts exceeded) | P1 | Within day |
| `slot_pending_fill_overdue` | P2 | Within day |
| `slot_orphan_filled` | P2 | Within day (manual unblock) |
| `publish_queue_failed_or_dead` | P2 | Within day |
| `publish_queue_overdue` | P2 if not paused-stream | Within day |
| `legacy_spread_mismatch` | P3 | Within week (structural fix) |
| `publishing_stale` | P3 | Within week |
| `never_published_or_no_record` | P3 | Investigate as needed |
| `ok_or_recently_active` | INFO | None |

**Caveat**: an auditor should always cross-reference with `m.pipeline_incident` and `docs/audit/open_findings.md` before declaring severity, because some bottlenecks may be known-and-tracked.

---

## Known pathologies (case studies)

### CFW LinkedIn recovery loop (April 2026, ongoing)

**Symptom**: `slot_fill_failed` with 4-6 failed slots in 7d; `skip_reason` = `marked_failed: exceeded_recovery_attempts`.

**Cause**: `m.recover_stuck_slots` function refilled `pending_fill` slots with already-published drafts, which then failed at publish time and were marked `failed`. After N attempts, terminal `marked_failed`.

**Fix**: deferred to `m.recover_stuck_slots` patch (refuse already-published-draft refills). Tracked under B-PIPELINE-INCIDENT-REMEDIATION P1.

### F-PUB-009 legacy spread (April 2026)

**Symptom**: `legacy_spread_mismatch` count > 0; queue rows scheduled at unrelated times to slot's `scheduled_publish_at`.

**Cause**: `m.get_next_scheduled_for` legacy function ignores slot's intended publish time; uses an old spread algorithm.

**Fix**: deferred. Replace with forward-only `slot.scheduled_publish_at → post_draft.scheduled_for` at fill time. Tracked under B-PIPELINE-INCIDENT-REMEDIATION P1.

### F-PUB-010 hard-cap (April 2026)

**Symptom**: `approved_not_queued_cap_blocked`; approved drafts pile up because `queue_ready >= max_queued_per_platform`.

**Cause**: `delete-queue-overflow` cron deletes excess queue rows, but underlying drafts remain `approved`. They cannot re-enter queue until cap drains.

**Mitigation**: cap lift with revised per-stream targets paired with F-PUB-009 fix (deferred). Tracked under B-PIPELINE-INCIDENT-REMEDIATION P1.

### F-AAP-001 backfill avalanche (May 2026)

**Symptom**: `approved_not_queued_cap_blocked` shortly after a deployment; large batches of drafts re-approved at once.

**Cause**: auto-approver SQL fetcher contract was broken by slot-driven v4 architecture; ~25 days of drafts re-evaluated in a single window.

**Fix**: applied 2026-05-03 (F-AAP-001 closed). Side effects: dead-row residue swept tonight (16 rows via Migration 1).

---

## How a fully-autonomous ChatGPT audit would run

A consumer of this runbook should:

1. **Step 1 (overview)** — confirm pipeline alive
2. **Step 2 (cron heartbeat)** — confirm crons green; flag any not-green
3. **Step 3 (matrix)** — capture as the spine of the audit report
4. **Step 4 (HTTP aggregate)** — flag failure-rate spikes; cannot attribute to specific publisher from here
5. **Step 5 (per-publisher outcomes)** — proof-of-published reconciliation
6. **Step 6 (system failure surface)** — catalogue recent failures, open incidents, doctor activity
7. **Step 7 (drill-downs)** — for each non-`ok` matrix row, run the bottleneck-specific drill-down
8. **Step 8 (audit log)** — note recent manual interventions
9. Synthesise into a report with: (a) current state per (client, platform), (b) severity ranking, (c) cross-references to known pathologies / open findings, (d) suggested next actions.

The runbook + the `audit.*` views together should be sufficient. If the auditor finds a question they cannot answer, that's a gap in the audit infrastructure and should be raised as a finding for runbook v3.

---

## Versioning

- **v1** (2026-05-03 evening) — initial. Found to have 4 verified errors via ChatGPT external audit. SUPERSEDED.
- **v2** (2026-05-03 night) — corrects worker_http_log misuse, cron health vocabulary, adds publisher cron jobid reference, adds row-list discipline section. **CURRENT.**

Future revisions should bump version + date and note what changed.
