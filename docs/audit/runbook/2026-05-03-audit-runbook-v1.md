# ICE Audit Runbook v1

> **Purpose**: Enable a third-party (ChatGPT, an external auditor, or PK acting as auditor) to run a full audit of the ICE pipeline without writing ad-hoc SQL or having insider knowledge.
>
> **Scope**: Diagnostic only. Read-only. No mutations. No secret access.
>
> **Created**: 2026-05-03 night Sydney. Authored alongside Migration 3 `audit_views_v2_matrix_and_success`.

---

## How to run an audit (execution order)

### Step 1 — Pipeline overview (one-line health check)

```sql
SELECT * FROM m.vw_ops_pipeline_health;
```

Returns one row with system-wide latest timestamps and aggregate counts. Quick "is the pipeline alive" check.

### Step 2 — Brand/platform matrix (the main view)

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

### Step 3 — Drill into each bottleneck

The `likely_bottleneck` enum maps to a drill-down query:

| Bottleneck | What it means | Drill-down query |
|---|---|---|
| `channel_disabled` | Client-channel row is `is_enabled=false` | `SELECT * FROM c.client_channel WHERE client_id = ... AND platform = ...` |
| `publishing_disabled` | Publish profile `publish_enabled=false` | `SELECT * FROM c.client_publish_profile WHERE client_id = ... AND platform = ...` (don't query `page_access_token` or `refresh_token` columns — secrets) |
| `publish_profile_paused` | `paused_until > NOW()` | Same as above; check `paused_at`, `paused_until`, `paused_reason` |
| `token_failure` | Most-recent `m.platform_token_health.ok = false` | `SELECT checked_at, ok, expires_at, LEFT(err, 500) FROM m.platform_token_health WHERE client_id = ... AND platform = ... ORDER BY checked_at DESC LIMIT 5` |
| `approved_not_queued_cap_blocked` | Approved drafts can't enter queue because queue_ready ≥ cap | `SELECT * FROM audit.v_publish_queue_summary WHERE status = 'queued'` to see depth; F-PUB-010 hard-cap cron `delete-queue-overflow` (jobid 49 area) is enforcing |
| `slot_pending_fill_overdue` | Slots stuck in `pending_fill` past `scheduled_publish_at` | `SELECT slot_id, scheduled_publish_at, status, fill_attempts FROM m.slot WHERE client_id = ... AND platform = ... AND status = 'pending_fill' AND scheduled_publish_at < NOW()` |
| `slot_fill_failed` | Slots in terminal `failed` state in last 7d | `SELECT slot_id, scheduled_publish_at, fill_attempts, skip_reason FROM m.slot WHERE client_id = ... AND platform = ... AND status = 'failed' AND scheduled_publish_at >= NOW() - INTERVAL '7 days'`. If `skip_reason LIKE 'marked_failed:exceeded_recovery_attempts'`, recovery loop pathology — see CFW LinkedIn case study |
| `slot_orphan_filled` | Slot `status='filled'` but `filled_draft_id IS NULL` | `SELECT slot_id, scheduled_publish_at, filled_at, fill_attempts FROM m.slot WHERE client_id = ... AND platform = ... AND status = 'filled' AND filled_draft_id IS NULL` |
| `publish_queue_overdue` | Queue rows ready (status='queued') but past `scheduled_for` | `SELECT * FROM audit.v_publish_queue_summary` for overdue counts; check publisher cron health via `m.cron_health_status` |
| `publish_queue_failed_or_dead` | Rows with `status IN ('failed','dead')` | `SELECT scheduled_for, status, attempt_count, last_error_code, LEFT(last_error, 200), LEFT(dead_reason, 200) FROM m.post_publish_queue WHERE client_id = ... AND platform = ... AND status IN ('failed','dead') ORDER BY updated_at DESC LIMIT 20` |
| `legacy_spread_mismatch` | Queue rows scheduled > 6h from underlying slot's `scheduled_publish_at` | F-PUB-009 manifestation. `SELECT s.slot_id, s.scheduled_publish_at AS slot_when, q.scheduled_for AS queue_when, q.scheduled_for - s.scheduled_publish_at AS drift FROM m.slot s JOIN m.post_publish_queue q ON q.post_draft_id = s.filled_draft_id WHERE s.client_id = ... AND s.platform = ... AND q.status = 'queued' ORDER BY drift DESC` |
| `never_published_or_no_record` | No row in `m.post_publish` for this (client, platform) | New stream or never reached publish stage. Check that drafts are being created and slots are being filled |
| `publishing_stale` | Last publish > 7 days ago | Investigate cron health, recent errors, queue depth |
| `ok_or_recently_active` | All checks pass | No action needed |

### Step 4 — Recent publish history (proof-of-published)

```sql
SELECT client_slug, platform, status, platform_post_id, published_at
FROM audit.v_publish_success_recent
ORDER BY published_at DESC
LIMIT 50;
```

Useful for: reconciling against expected schedule, spotting NULL `platform_post_id` (F-PUB-008), seeing publishing cadence.

### Step 5 — System-level health

```sql
-- Recent failures (24h window, redacted-safe)
SELECT * FROM m.vw_ops_failures_24h;

-- Cron job health
SELECT * FROM m.cron_health_status WHERE NOT is_healthy;

-- Open incidents
SELECT incident_id, opened_at, severity, summary
FROM m.pipeline_incident
WHERE resolved_at IS NULL
ORDER BY opened_at DESC;

-- Recent doctor/fixer log activity
SELECT * FROM m.pipeline_doctor_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC LIMIT 20;
```

### Step 6 — Audit log review

```sql
-- Recent system audit log entries (intentional manual interventions)
SELECT run_at, triggered_by, results, overall_status
FROM m.system_audit_log
ORDER BY run_at DESC
LIMIT 20;
```

---

## What's safe to query

- **`audit.*`** schema views (this runbook's primary audit surface; bounded windows; no secrets)
- **`m.vw_ops_*`** views (existing operational dashboards)
- **`m.cron_health_*`** tables (health/status/snapshot/alert)
- **`m.pipeline_doctor_log`**, **`m.pipeline_fixer_log`**, **`m.pipeline_incident`**, **`m.pipeline_health_log`**, **`m.system_audit_log`** (audit log family)
- **`c.client`**, **`c.client_channel`**, **`c.client_publish_profile`** (excluding token columns), **`c.client_publish_schedule`**
- **`m.post_draft`** (excluding `body_text` if large), **`m.post_publish`** (excluding `request_payload` / `response_payload`), **`m.post_publish_queue`** (excluding payload), **`m.slot`**, **`m.platform_token_health`** (excluding any access/refresh token columns)

## What NOT to query

| Forbidden | Why |
|---|---|
| `cron.job.command` | May contain secrets/bearer tokens in cron SQL |
| `cron.job_run_details.return_message` | May contain large/sensitive payloads; table itself is bloated (~260MB) |
| `vault.*` | Secret store |
| `c.client_publish_profile.page_access_token` / `.refresh_token` | OAuth secrets |
| `m.platform_token_health.access_token` / `.refresh_token` (if present) | OAuth secrets |
| `m.ai_job.input_payload` / `.output_payload` | Large JSON, expensive |
| `m.worker_http_log.content` | Response bodies, may include sensitive |
| `m.post_publish.request_payload` / `.response_payload` | Large publishing JSON |
| `m.post_publish_queue.payload` (if present) | Same |
| `m.post_draft.body_text` (when full text not needed) | Large; use `body_excerpt` or `LEFT(body_text, 500)` instead |

---

## Severity / triage guidance

When auditor is sorting findings:

| Bottleneck | Default severity | Action urgency |
|---|---|---|
| `channel_disabled`, `publishing_disabled`, `publish_profile_paused` | INFO | None (intentional config) |
| `token_failure` | P1 | Within hours |
| `approved_not_queued_cap_blocked` | P1 | Within hours (drafts piling up) |
| `slot_fill_failed` | P1 if recovery_attempts exceeded | Within day |
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

**Fix**: deferred to `m.recover_stuck_slots` patch (refuse already-published-draft refills).

### F-PUB-009 legacy spread (April 2026)

**Symptom**: `legacy_spread_mismatch` count > 0; queue rows scheduled at unrelated times to slot's `scheduled_publish_at`.

**Cause**: `m.get_next_scheduled_for` legacy function ignores slot's intended publish time; uses an old spread algorithm.

**Fix**: deferred. Replace with forward-only `slot.scheduled_publish_at → post_draft.scheduled_for` at fill time.

### F-PUB-010 hard-cap (April 2026)

**Symptom**: `approved_not_queued_cap_blocked`; approved drafts pile up because `queue_ready >= max_queued_per_platform`.

**Cause**: `delete-queue-overflow` cron (jobid 49 area) deletes excess queue rows, but underlying drafts remain `approved`. They cannot re-enter queue until cap drains.

**Mitigation**: cap lift with revised per-stream targets (deferred).

---

## How a fully-autonomous ChatGPT audit would run

A consumer of this runbook (e.g. ChatGPT) should:

1. Run Step 1 (overview).
2. Run Step 2 (matrix). Capture full output as the spine of the audit report.
3. For each row where `likely_bottleneck != 'ok_or_recently_active'` AND `likely_bottleneck != 'publishing_disabled'`: run the corresponding Step 3 drill-down. Capture results.
4. Run Step 4 (recent publishes). Cross-reference with the matrix's `latest_published_at` to confirm no inconsistencies.
5. Run Step 5 (system health). Capture any unhealthy crons, open incidents, recent failures.
6. Run Step 6 (audit log). Note any recent manual interventions that may have created or resolved findings.
7. Synthesise into a report with: (a) current state per (client, platform), (b) severity ranking using the table above, (c) cross-references to known pathologies / open findings, (d) suggested next actions.

The runbook + the views together should be sufficient. If the auditor finds a question they cannot answer with the views above, that's a gap in the audit infrastructure and should be raised as a finding for runbook v2.

---

## Versioning

- **v1** (2026-05-03) — initial. Built around `audit.v_brand_platform_audit_matrix` + `audit.v_publish_queue_summary` + `audit.v_slot_health_by_client_platform` + `audit.v_publish_success_recent`. Plus complementary `m.vw_ops_*` and `m.cron_health_*` family.

Future revisions should bump version + date and note what changed.
