---
brief_id: nightly-health-check-v1
brief_version: v3.0
status: review_required
risk_tier: 0
owner: cowork
created_by: PK + chat session 2026-05-02 Saturday afternoon Sydney (v1 first-run learnings + B investigation patches; v2.1 closes Q-002 SQL-syntax fix); v3.0 adds cc-0014 Stage C dual-write to friction.event via friction.fn_emit_health_check_findings (2026-05-15 Sydney)
default_action: write_markdown_and_emit
allowed_paths:
  - docs/audit/health/**
  - docs/runtime/runs/**
  - docs/runtime/claude_questions.md
  - docs/briefs/queue.md
  - docs/briefs/nightly-health-check-v1.md
forbidden_actions:
  - apply_migration
  - update_production_data
  - any INSERT / UPDATE / DELETE on c.*, m.*, f.*, t.*, a.*, r.*, op.*, k.* schemas
  - any direct INSERT / UPDATE / DELETE on friction.* tables (writes only via SECURITY DEFINER function friction.fn_emit_health_check_findings)
  - delete_branch
  - merge_pr
  - close_audit_finding
  - calling ask_chatgpt_review (Tier 0 boundary — do not escalate from inside this brief)
idempotency_check: "health_file_absent"
idempotency_pattern: "docs/audit/health/{YYYY-MM-DD}.md"
success_output:
  - docs/audit/health/{YYYY-MM-DD}.md
  - docs/runtime/runs/nightly-health-check-v1-{YYYY-MM-DDTHHMMSSZ}.md
  - friction.event rows (one per P1+P2 finding, written via friction.fn_emit_health_check_findings; not a file)
---

# Brief: Nightly Health Check (v3.0)

Generate a daily Supabase pipeline health snapshot. Read-only queries, markdown output, and dual-write of priority findings to `friction.event` via a SECURITY DEFINER function. Still Tier 0 — no direct table writes, no migrations, no production touch beyond the append-only register.

## Version history

- **v1** (2026-05-02 morning) — first run, hit 4-of-4 measurable thresholds. Surfaced 4 brief-author schema bugs in Q7/Q9 (recovered via default-and-continue) + S17 minimum-n gap + boolean `has_stuck_items` too coarse to be actionable.
- **v2** (2026-05-02 afternoon) — schema fixes + stuck-items drill-down + true-stuck identification + S17 n-guard. PK + chat investigation discovered the v1 boolean obscured a meaningful signal: **5 LinkedIn-approved drafts at Property Pulse with `publish_attempts=0`** sitting in queue from yesterday afternoon despite `publish_enabled=true` — worth a separate diagnosis (not in scope of this brief).
- **v2.1** (2026-05-02 evening) — closes Q-nightly-health-check-v1-002. Q-true-stuck `array_agg(... ORDER BY ... LIMIT 5)` was invalid Postgres syntax (LIMIT not allowed inside aggregate). Replaced with slice notation `(array_agg(... ORDER BY ...))[1:5]` — single-aggregate-evaluation, idiomatic Postgres, semantically identical (top-5 earliest sample IDs per cluster). v2 first-run hit 7-of-7 measurable thresholds; v2.1 makes tomorrow's run verbatim-clean (no fallback recovery). **Lesson #61 (pre-flight discipline) extends from `information_schema.columns` lookup to also include EXPLAIN-ing every brief SQL block before authoring** — see automation_v1_spec.md.
- **v3.0** (2026-05-15 Sydney, cc-0014 Stage C) — adds **dual-write to `friction.event`** via `friction.fn_emit_health_check_findings(run_id, markdown_path, findings)` SECURITY DEFINER function. v2.1 brief-lock is intentionally reopened to deliver cc-0014 Stage C per the friction register experiment brief §8. Each priority finding in Section 10 gets a stable `finding_id` of form `priority-N/short-key` (schema in new section below). Findings JSONB array is built during run; emission call follows markdown write; emission summary recorded in Section 11 footer. Brief remains Tier 0 — emission writes only to `friction.event` (append-only experiment register) and `friction.emit_error` (per-finding failure sink), both via SECURITY DEFINER. No source-table writes. Per cc-0014 brief §13, no new D-01 fires because Stage C execution matches the spec.

## Purpose

Automate the recurring Supabase pipeline health-check pattern. Output: a markdown file at `docs/audit/health/{YYYY-MM-DD}.md` that surfaces pipeline state, recent activity, and **actionable** anomalies (categorised so chat doesn't have to triage). v3.0 additionally emits each P1+P2 finding as one row in `friction.event` so the IOL friction register experiment can score the signal.

## Idempotency

If `docs/audit/health/{YYYY-MM-DD}.md` already exists for today's UTC date, write `already_applied` to the state file and **skip the emission step** (the prior run already emitted for today). Do not overwrite. To force a re-run on the same UTC day, PK deletes the existing file before firing.

## Pre-flight (verified by chat 2026-05-02 06:30–07:30 UTC against actual DB)

The following table shapes are authoritative — verified via `information_schema.columns` and live queries:

- `m.pipeline_health_log`: `log_id, snapshot_at, queue_total, queue_queued, queue_running, queue_published_1h, queue_failed, drafts_needs_review, drafts_approved, images_pending, images_generated, images_failed, iw_generated_30m, iw_failed_30m, pub_published_30m, pub_held_30m, pub_throttled_30m, ndis_published_today, pp_published_today, has_stuck_items, has_failed_images`
- `m.cron_health_snapshot`: `snapshot_id, jobid, jobname, schedule, is_active, window_hours, total_runs, succeeded_runs, failed_runs, failure_rate, consecutive_failures_at_end, latest_run_at, latest_run_status, latest_error, latest_error_at, computed_at`. **NOTE: dual rows per jobid per `computed_at` — one for `window_hours=1`, one for `window_hours=24`.** v2 filters Q3/Q4 on `window_hours=24` for stability.
- `m.post_publish`: uses `created_at` as the time-of-attempt field (verified via producer code in `m.take_pipeline_health_snapshot`); status enum is `{published, failed}` (NOT `success`).
- `m.post_draft`: PK column is `post_draft_id` (NOT `draft_id`).
- `c.client`: slug column is `client_slug` (NOT `slug`).
- `m.slot_fill_attempt`: time-of-attempt column is `attempted_at` (NOT `created_at`); decision column is `decision` (NOT `outcome`).
- `m.worker_http_log`: created_at, status_code, timed_out, url confirmed.
- `m.post_publish_queue`: `queue_id, post_draft_id, platform, status, scheduled_for, client_id` confirmed.
- `c.client_publish_profile`: `client_id, platform, is_default, status, publish_enabled, paused_reason` confirmed.

**v3.0 additional pre-flight** (verified by chat 2026-05-15 against Supabase `mbkmaxqhsohbtwsqolns`):
- `friction.fn_emit_health_check_findings(text, text, jsonb)` exists, SECURITY DEFINER, owner postgres, GRANT EXECUTE TO service_role. Reachable via `SELECT friction.fn_emit_health_check_findings(...)`.
- `friction.event`, `friction.emit_error`, `friction.category` tables live. `pipeline_integrity` category active.

**Stuck-items semantic** (per producer code `m.take_pipeline_health_snapshot`):

```sql
v_stuck := EXISTS (
  SELECT 1 FROM m.post_publish_queue
  WHERE status='queued' AND scheduled_for IS NOT NULL
    AND scheduled_for < now() - interval '1 hour'
);
```

This is too coarse — returns `true` if ANY queue item is overdue, regardless of cause. v2 replaces this with categorised drill-down.

## Queries to run

Execute all 14 queries via Supabase MCP `execute_sql` against project `mbkmaxqhsohbtwsqolns`. Q1–Q12 + Q-stuck + Q-true-stuck.

### Q1 — Latest pipeline health snapshot

```sql
SELECT *
FROM m.pipeline_health_log
ORDER BY snapshot_at DESC
LIMIT 1;
```

### Q2 — Pipeline health trend (last 6 snapshots, ~3h window)

```sql
SELECT snapshot_at, queue_total, queue_failed, drafts_needs_review, drafts_approved,
       images_pending, images_failed, pub_published_30m, has_stuck_items, has_failed_images
FROM m.pipeline_health_log
ORDER BY snapshot_at DESC
LIMIT 6;
```

### Q3 — Cron health latest snapshot (24h window)

```sql
SELECT jobid, jobname, is_active, total_runs, succeeded_runs, failed_runs, failure_rate,
       consecutive_failures_at_end, latest_run_at, latest_run_status
FROM m.cron_health_snapshot
WHERE computed_at = (SELECT max(computed_at) FROM m.cron_health_snapshot)
  AND window_hours = 24
ORDER BY failure_rate DESC, jobname;
```

### Q4 — Cron jobs with active failures (24h window)

```sql
SELECT jobid, jobname, consecutive_failures_at_end, failure_rate, latest_error, latest_error_at
FROM m.cron_health_snapshot
WHERE computed_at = (SELECT max(computed_at) FROM m.cron_health_snapshot)
  AND window_hours = 24
  AND (consecutive_failures_at_end > 0 OR failure_rate > 0)
ORDER BY consecutive_failures_at_end DESC;
```

### Q5 — Publish output last 24h

```sql
SELECT pp.platform, pp.status, count(*) AS n
FROM m.post_publish pp
WHERE pp.created_at > now() - interval '24 hours'
GROUP BY pp.platform, pp.status
ORDER BY pp.platform, pp.status;
```

### Q6 — Publish queue current state

```sql
SELECT status, count(*) AS n
FROM m.post_publish_queue
GROUP BY status
ORDER BY n DESC;
```

### Q7 — Per-client published count last 24h (CORRECTED v2)

```sql
SELECT c.client_slug, count(*) AS published_24h
FROM m.post_publish pp
JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
JOIN c.client c ON c.client_id = pd.client_id
WHERE pp.created_at > now() - interval '24 hours'
  AND pp.status = 'published'
GROUP BY c.client_slug
ORDER BY c.client_slug;
```

### Q8 — ai_job activity last 24h

```sql
SELECT status, count(*) AS n
FROM m.ai_job
WHERE created_at > now() - interval '24 hours'
GROUP BY status
ORDER BY n DESC;
```

### Q9 — slot_fill_attempt activity last 24h (CORRECTED v2)

```sql
SELECT decision, count(*) AS n
FROM m.slot_fill_attempt
WHERE attempted_at > now() - interval '24 hours'
GROUP BY decision
ORDER BY n DESC;
```

### Q10 — Ingest activity last 24h

```sql
SELECT fetch_status, count(*) AS n
FROM f.canonical_content_body
WHERE updated_at > now() - interval '24 hours'
GROUP BY fetch_status
ORDER BY n DESC;
```

### Q11 — Worker HTTP errors last 24h

```sql
SELECT split_part(replace(url, 'https://', ''), '/', 2) AS endpoint,
       status_code,
       count(*) AS n
FROM m.worker_http_log
WHERE created_at > now() - interval '24 hours'
  AND (status_code >= 400 OR timed_out = true)
GROUP BY endpoint, status_code
ORDER BY n DESC;
```

### Q12 — ChatGPT Review MCP cost + idempotency (S17 standing check)

```sql
SELECT count(*) AS calls,
       sum(input_tokens + output_tokens) AS total_tokens,
       count(*) FILTER (WHERE status = 'completed') AS completed_count,
       count(*) FILTER (WHERE status = 'escalated') AS escalated_count,
       count(*) FILTER (WHERE response_jsonb IS NULL) AS failed_count
FROM m.chatgpt_review
WHERE created_at > now() - interval '7 days';
```

### Q-stuck (NEW v2) — Stuck items full categorisation

```sql
SELECT 
  ppq.platform,
  c.client_slug,
  pd.approval_status,
  count(*) AS n,
  count(*) FILTER (
    WHERE (SELECT count(*) FROM m.post_publish pp WHERE pp.post_draft_id = pd.post_draft_id) = 0
  ) AS zero_publish_attempts,
  bool_or(cpp.publish_enabled IS TRUE) AS profile_enabled,
  min(ppq.scheduled_for) AS earliest_scheduled,
  max(ppq.scheduled_for) AS latest_scheduled
FROM m.post_publish_queue ppq
JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
LEFT JOIN c.client c ON c.client_id = ppq.client_id
LEFT JOIN c.client_publish_profile cpp 
  ON cpp.client_id = ppq.client_id 
  AND cpp.platform = ppq.platform 
  AND cpp.is_default = true
  AND cpp.status = 'active'
WHERE ppq.status = 'queued'
  AND ppq.scheduled_for IS NOT NULL
  AND ppq.scheduled_for < now() - interval '1 hour'
GROUP BY ppq.platform, c.client_slug, pd.approval_status
ORDER BY ppq.platform, c.client_slug, pd.approval_status;
```

### Q-true-stuck (PATCHED v2.1) — Genuinely-stuck items (actionable)

**v2.1 fix:** prior version used `array_agg(... ORDER BY ... LIMIT 5)` which is invalid Postgres (LIMIT is a SELECT-clause modifier, not allowed inside aggregate function calls). Replaced with slice notation `(array_agg(... ORDER BY ...))[1:5]`. Single aggregate evaluation per group; semantically identical (top-5 earliest sample IDs per cluster).

```sql
SELECT 
  ppq.platform,
  c.client_slug,
  count(*) AS true_stuck_n,
  min(ppq.scheduled_for) AS earliest_stuck,
  max(ppq.scheduled_for) AS latest_stuck,
  (array_agg(pd.post_draft_id ORDER BY ppq.scheduled_for))[1:5] AS sample_draft_ids
FROM m.post_publish_queue ppq
JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
JOIN c.client c ON c.client_id = ppq.client_id
JOIN c.client_publish_profile cpp 
  ON cpp.client_id = ppq.client_id 
  AND cpp.platform = ppq.platform 
  AND cpp.is_default = true
  AND cpp.status = 'active'
WHERE ppq.status = 'queued'
  AND ppq.scheduled_for IS NOT NULL
  AND ppq.scheduled_for < now() - interval '1 hour'
  AND pd.approval_status = 'approved'
  AND cpp.publish_enabled = true
  AND (SELECT count(*) FROM m.post_publish pp WHERE pp.post_draft_id = pd.post_draft_id) = 0
GROUP BY ppq.platform, c.client_slug
ORDER BY true_stuck_n DESC;
```

A "true-stuck" item meets ALL of: queued + overdue + approved + publish_enabled=true + zero publish attempts ever logged. These are items that SHOULD be publishing but aren't — the only stuck-items category that needs investigation.

## Finding ID schema (NEW v3.0)

**Emission scope (PK rule, v3.0):** Only P1 and P2 findings are emitted to friction.event. P3 items are informational markdown-only observations and are excluded from friction emission and ID-level count matching.

Each priority finding gets a stable `finding_id` of form `priority-N/short-key`. The `short-key` is deterministic across runs so the same kind of finding at the same target produces the same `finding_id` day-over-day. This allows the friction register experiment to detect recurrence via the `friction.case` 7-day lookup.

**Priority 1 (Actionable — emit one friction.event row per instance):**

| Trigger | finding_id pattern | Instance dimension |
|---|---|---|
| True-stuck cluster (Section 6b, Cat C) | `priority-1/true-stuck-{platform}-{client_slug}` | One per platform×client cluster |
| Cron job with `consecutive_failures_at_end >= 3` | `priority-1/cron-consecutive-failures-{jobname}` | One per failing job |
| Worker HTTP error rows present (Q11 > 0 rows) | `priority-1/worker-http-errors` | Single aggregated finding (cluster details in `raw_payload`) |
| Pipeline health snapshot age > 60 min | `priority-1/pipeline-snapshot-stale` | Single |

**Priority 2 (Worth noting — emit one friction.event row per instance):**

| Trigger | finding_id pattern | Instance dimension |
|---|---|---|
| `has_stuck_items=true` AND `true_stuck_n=0` (boolean dilution) | `priority-2/stuck-items-dilution` | Single |
| `has_failed_images=true` | `priority-2/failed-images-present` | Single |
| Zero counts in a 24h activity table | `priority-2/zero-counts-{metric}` | One per affected metric: `ai-job`, `slot-fill-attempt`, `post-publish`, `canonical-content-body`, `pub-published-30m` |
| S17 escalation rate > 40% AND calls >= 10 | `priority-2/s17-escalation-rate` | Single |
| S17 failure rate > 5% AND calls >= 10 | `priority-2/s17-failure-rate` | Single |

**Priority 3 (Informational — NOT emitted):**

Per cc-0014 brief §8 the function accepts any `priority` value, but this brief intentionally emits only P1 and P2 findings. P3 entries are documentary observations that the source brief itself explicitly marks "inform but do not flag" / "report but suppress alert". Emitting them would dilute the IOL signal. P3 entries remain in the markdown for human reading; they are not in the JSONB `findings` array passed to the function.

**short-key normalisation rules:**
- All lowercase
- Replace any non `[a-z0-9-]` character with `-`
- Collapse consecutive `-` into single `-`
- Strip leading/trailing `-`
- Example: `linkedin-zapier-publisher-every-20m` stays as-is; `LinkedIn × Property Pulse` becomes `linkedin-property-pulse`

The `finding_id` is reproducible from the trigger inputs (Section 10 logic) without random IDs, surrogate UUIDs, or run-timestamps. This is the property that makes ID-level reconciliation possible: an independent reader of the markdown can derive the same `finding_id` set as the emission step did.

## Output format

Write a single markdown file at `docs/audit/health/{YYYY-MM-DD}.md` with these sections in order. Use today's UTC date for the filename.

```markdown
# ICE Pipeline Health — {YYYY-MM-DD}

> Generated by `nightly-health-check-v1` (v3.0 brief).
> Run timestamp (UTC): {ISO-8601}
> Window: 24h trailing where applicable.

## 1. Headline

- Pipeline health snapshot age: {minutes since last `pipeline_health_log` snapshot}
- Cron health snapshot age: {minutes since last `cron_health_snapshot` 24h-window snapshot}
- has_stuck_items flag (raw boolean): {true|false}
- True-stuck items count (Cat C, actionable): {count from Q-true-stuck}
- has_failed_images flag: {has_failed_images from latest pipeline_health_log}
- Notable anomalies: {bulleted list — see Section 10}

## 2. Pipeline health latest snapshot (Q1)

{Tabulate the single row from Q1, all columns. Use a 2-column table: metric | value.}

## 3. Pipeline health 3-hour trend (Q2)

{Tabulate Q2 results, 6 rows, oldest first.}

## 4. Cron health (Q3 + Q4)

Window: 24h. Summary: {n} cron jobs total, {n} active, {n} with failures.

{If Q4 returned rows, tabulate them. Otherwise: "No cron jobs with active failures."}

## 5. Publish output 24h (Q5 + Q7)

By platform/status (Q5):

{Tabulate Q5.}

Per client (Q7):

{Tabulate Q7.}

## 6. Publish queue current state (Q6)

{Tabulate Q6.}

## 6a. Stuck items drill-down (Q-stuck) — NEW v2

{Tabulate Q-stuck.}

Classify each row into one of three categories:
- **Cat A — Known platform-lock artefact**: platform=instagram + scheduled_for >= 25 Apr 2026, OR `profile_enabled=false`. These items are queue-residue from disabled platforms; not actionable from this brief.
- **Cat B — Known F-PUB-004/F-PUB-005 starvation**: `approval_status=needs_review` (any platform). These items shouldn't be in the queue (F-PUB-005 trigger gap) and won't get approved (F-PUB-004 starvation) until B31 ships; not actionable from this brief.
- **Cat C — TRUE stuck**: `approval_status=approved` + `profile_enabled=true` + `zero_publish_attempts > 0`. These items SHOULD be publishing but aren't. **Actionable. Surface in Section 10.**

Report totals per category at end of section.

## 6b. True-stuck items (Q-true-stuck) — NEW v2

{Tabulate Q-true-stuck.}

If 0 rows: write "No true-stuck items. All queued items either explained by known platform locks or upstream auto-approver starvation (F-PUB-004)."

If >0 rows: list each platform × client cluster with `true_stuck_n`, `earliest_stuck`, `latest_stuck`, sample draft IDs. **PRIORITY-FLAG in Section 10.**

## 7. Pipeline activity 24h (Q8 + Q9 + Q10)

- ai_job: {Tabulate Q8 inline.}
- slot_fill_attempt: {Tabulate Q9 inline.}
- ingest (canonical_content_body): {Tabulate Q10 inline.}

## 8. Worker errors 24h (Q11)

{If Q11 returned rows, tabulate. Otherwise: "No 4xx/5xx or timeout HTTP responses in last 24h."}

## 9. ChatGPT Review MCP (Q12)

{Single row from Q12 as 5 metrics.}

Threshold check (per S17, with v2 minimum-n guard):
- **Minimum-n guard (NEW v2)**: skip threshold alerts if `calls < 10`. Small-sample escalation rates are misleading. Report metrics but do not flag.
- Spend: estimated `~$(total_tokens / 1000) * 0.0003`; flag if implied monthly burn > $35
- Escalation rate: `escalated_count / calls`; flag if > 40% **AND** `calls >= 10`
- Failure rate: `failed_count / calls`; flag if > 5% **AND** `calls >= 10`

## 10. Notable signals

List in priority order. **v3.0: every P1 and P2 bullet ends with `<!-- finding_id: priority-N/short-key -->` so the `finding_id` is independently derivable by reading the markdown.** Build the `findings` JSONB array in parallel with this section for the emission step in Section 12.

**PRIORITY 1 — Actionable:**
- True-stuck items (Cat C from Section 6b) > 0 — always priority 1 if present. **One bullet per platform×client cluster**, with `<!-- finding_id: priority-1/true-stuck-{platform}-{client_slug} -->`.
- Any cron job with `consecutive_failures_at_end >= 3`. **One bullet per failing job**, with `<!-- finding_id: priority-1/cron-consecutive-failures-{jobname} -->`.
- Worker HTTP errors > 0. **Single aggregated bullet**, with `<!-- finding_id: priority-1/worker-http-errors -->`.
- Pipeline health snapshot age > 60 minutes. **Single bullet**, with `<!-- finding_id: priority-1/pipeline-snapshot-stale -->`.

**PRIORITY 2 — Worth noting:**
- has_stuck_items=true with NO true-stuck items — means the boolean is firing on known-lock artefacts only (informational, not actionable). `<!-- finding_id: priority-2/stuck-items-dilution -->`.
- has_failed_images = true. `<!-- finding_id: priority-2/failed-images-present -->`.
- Zero counts in any of: ai_job 24h, slot_fill_attempt 24h, post_publish 24h, canonical_content_body 24h. **One bullet per affected metric**, with `<!-- finding_id: priority-2/zero-counts-{metric} -->` where `{metric}` is one of `ai-job`, `slot-fill-attempt`, `post-publish`, `canonical-content-body`, `pub-published-30m`.
- S17 escalation rate breached AND calls >= 10. `<!-- finding_id: priority-2/s17-escalation-rate -->`.
- S17 failure rate breached AND calls >= 10. `<!-- finding_id: priority-2/s17-failure-rate -->`.

**PRIORITY 3 — Informational (NOT emitted in v3.0):**
- Per-client publish skew (e.g. 6/6 to one client) — inform but do not flag if explained by known platform locks
- S17 metrics with calls < 10 — report but suppress alert

If nothing notable: write "No anomalies above default thresholds. has_stuck_items {true|false}; true-stuck {n}; cron healthy; workers clean."

## 11. Footer

- Brief: `nightly-health-check-v1` (v3.0)
- Run state file: `docs/runtime/runs/nightly-health-check-v1-{YYYY-MM-DDTHHMMSSZ}.md`
- Idempotency check: `health_file_absent` → passed at start of run
- Emission summary (v3.0): `success_count={N} failure_count={M} run_id={run_id}` (from Section 12 result)
- Next: PK reviews; if Section 10 has Priority 1 items, action; brief shape locked from v3.0 onward (sunset 2026-06-15)
```

## 12. Emission to friction register (NEW v3.0)

**Emission scope (PK rule, v3.0):** Only P1 and P2 findings are emitted to friction.event. P3 items are informational markdown-only observations and are excluded from friction emission and ID-level count matching.

After writing the markdown file, build a JSONB findings array containing one object per P1+P2 bullet from Section 10, then call the emission function. **Do not emit P3.** **Do not emit anything if the markdown write failed.** Order of operations is markdown-first.

### 12.1. Construct `run_id`

`run_id = 'nightly-health-check-v1/' || {YYYY-MM-DDTHHMMSSZ}` using the same UTC timestamp used in the run state file naming convention. Example: `nightly-health-check-v1/2026-05-15T024500Z`.

This makes `run_id` deterministic from run-start time and globally unique per run.

### 12.2. Build the `findings` JSONB array

For each P1 and P2 bullet that was actually included in Section 10 (i.e. its trigger condition was true on this run's data), append one object to the array:

```json
{
  "finding_id": "priority-N/short-key",
  "priority": "1" | "2",
  "title": "<short human-readable title — first line of bullet>",
  "observation_text": "<full bullet text without the finding_id HTML comment>",
  "related_object": { "type": "...", ...keyed dimensions... },
  "raw_payload": { ...optional context for Day-19 audit... }
}
```

`related_object` schema by finding type:
- `priority-1/true-stuck-{platform}-{client_slug}`: `{"type": "true_stuck_cluster", "platform": "...", "client_slug": "...", "true_stuck_n": N, "earliest_stuck": "...", "latest_stuck": "...", "sample_draft_ids": [...]}`
- `priority-1/cron-consecutive-failures-{jobname}`: `{"type": "cron_failure", "jobname": "...", "consecutive_failures_at_end": N, "latest_error": "..."}`
- `priority-1/worker-http-errors`: `{"type": "worker_http_errors", "clusters": [{"endpoint": "...", "status_code": N, "n": N}, ...]}`
- `priority-1/pipeline-snapshot-stale`: `{"type": "snapshot_stale", "snapshot_age_minutes": N}`
- `priority-2/stuck-items-dilution`: `{"type": "stuck_items_dilution", "raw_boolean_total": N, "true_stuck_n": 0}`
- `priority-2/failed-images-present`: `{"type": "failed_images"}`
- `priority-2/zero-counts-{metric}`: `{"type": "zero_count", "metric": "ai-job" | "slot-fill-attempt" | "post-publish" | "canonical-content-body" | "pub-published-30m"}`
- `priority-2/s17-escalation-rate`: `{"type": "s17_metric", "metric": "escalation_rate", "rate": 0.NN, "calls": N}`
- `priority-2/s17-failure-rate`: `{"type": "s17_metric", "metric": "failure_rate", "rate": 0.NN, "calls": N}`

If no P1 or P2 bullets were generated this run, the findings array is `[]` and emission is still called (so the verification job can see "0 events / 0 errors" instead of "no run today").

### 12.3. Call the emission function

```sql
SELECT friction.fn_emit_health_check_findings(
  '{run_id}',
  'docs/audit/health/{YYYY-MM-DD}.md',
  '{findings_jsonb_array}'::jsonb
);
```

The function returns a JSONB row with `success_count`, `failure_count`, and `run_id`. Capture both counts.

### 12.4. Record outcome in Section 11 footer

Update the "Emission summary" line in Section 11 with the captured `success_count` and `failure_count` values. If `success_count != number_of_P1_P2_bullets_in_Section_10`, **do not edit Section 10** — write the discrepancy to the state file as a brief-author defect for next-day review. The markdown remains the source of truth for what the brief identified; emission is a side-effect that may be partially fail-isolated.

### 12.5. Error handling

The function itself catches per-finding INSERT failures and routes them to `friction.emit_error`. The Cowork brief does NOT need to handle per-finding errors. The Cowork brief only needs to handle:
- **Function call itself failed (e.g. database connection issue):** write the SQL error to the state file under a `EMISSION_FAILED` key. The markdown file remains unaffected. Section 11 records `success_count=unknown failure_count=unknown` with the error code.
- **Function returned but count mismatch:** record in state file, do not retry.

## Likely questions and defaults (answer-key)

1. **Q: `pipeline_health_log.queue_published_1h` semantics ambiguous.**
   **Default:** Report verbatim. Per producer `m.take_pipeline_health_snapshot`: count of `m.post_publish` rows with `created_at >= now() - 1 hour AND status='published'`. Caveat in Section 2 footnote.

2. **Q: `cron_health_snapshot` returned dual rows per jobid (window_hours=1 + window_hours=24).**
   **Default:** v2 queries Q3/Q4 already filter on `window_hours=24`. If a future schema adds window_hours=4 or other values, default to 24h for stability and note the additional windows in Section 4.

3. **Q: `m.ai_job` returns 0 rows in 24h — anomaly or normal?**
   **Default:** Report as factual zero. Reference F-PUB-004 (auto-approver starvation) is the known cause. Surface in Section 10 Priority 2 (`priority-2/zero-counts-ai-job`) not Priority 1.

4. **Q: Q-stuck classification — what if a row matches both Cat A and Cat B (e.g. instagram + needs_review)?**
   **Default:** Cat A takes precedence (platform-lock is the upstream cause; Cat B starvation is downstream). Single classification per row.

5. **Q: Q-true-stuck returned > 0 rows — how many is "too many"?**
   **Default:** Any > 0 is Priority 1. Do not editorialise on count. One `priority-1/true-stuck-{platform}-{client_slug}` finding per cluster.

6. **Q: `m.post_publish_queue.status` values — unfamiliar enum values appear?**
   **Default:** Report all status values returned, sorted by count descending. Do not filter.

7. **Q: Worker HTTP `endpoint` extraction may produce empty strings for malformed URLs?**
   **Default:** Group with NULL endpoint as "(unparseable)" row. Do not crash.

8. **Q: Estimated cost calculation in Section 9 — use exact rates?**
   **Default:** Use simplified flat estimate `(total_tokens / 1000) * 0.0003` (mid-rate proxy). Note as approximation. B34 will replace with exact when populated.

9. **Q: S17 minimum-n guard — what if `calls = 0`?**
   **Default:** Report metrics with `calls=0`, divide-by-zero protect (escalation_rate = NULL not 0/0). No alert.

10. **Q: Output file already exists when I run — append, overwrite, or skip?**
    **Default:** Per idempotency_check: skip. Write `already_applied` to state file and stop. **v3.0: also skip the emission step** (the prior run already emitted for today's run_id).

11. **Q (v3.0): What if a P1/P2 bullet's trigger fires but a required `related_object` field is missing in the source data (e.g. NULL `client_slug` in a true-stuck row)?**
    **Default:** Include the bullet in Section 10 with `(unknown)` substituted in the finding_id position. Build the corresponding finding object with `related_object.client_slug = null`. The function's per-finding error handler will catch any downstream issue. Do not skip the bullet — that hides signal.

12. **Q (v3.0): What if `friction.fn_emit_health_check_findings` does not exist when called (e.g. migration was rolled back)?**
    **Default:** Function call returns "function does not exist" error. Catch, write `EMISSION_FAILED: function_missing` to state file, complete the run with markdown only. Section 11 records `success_count=N/A`. Do NOT attempt to retry or recreate the function — that is migration scope.

13. **Q (v3.0): What if the Section 10 logic produces more than one bullet that would map to the same finding_id (e.g. two true-stuck clusters with identical platform×client_slug — should not happen but could if data is corrupted)?**
    **Default:** Emit both. The function uses `source_event_id = run_id/finding_id` as the UNIQUE constraint; duplicate finding_ids within one run would cause the second emission to violate UNIQUE and land in `friction.emit_error` — the right behaviour. Do not deduplicate at the brief layer.

If a decision arises NOT covered above and NOT obviously safe to default, write the question to `docs/runtime/claude_questions.md` per D182 default-and-continue, then proceed with your best-judgement default and note the divergence in the state file.

## Stop conditions

- Any query returns an error you cannot recover from → write error to state file, halt that section but continue with remaining sections.
- File at `docs/audit/health/{YYYY-MM-DD}.md` already exists → idempotency hit, write `already_applied` to state file, stop.
- Any query attempts a non-SELECT operation → you have a brief-author bug, write `BRIEF_ERROR` to state file, stop.
- Any allowed_paths violation attempt → halt immediately.
- **v3.0: Markdown write succeeded but emission call failed with an error other than per-finding (i.e. the function call itself returned an error, not just `failure_count > 0`).** Write `EMISSION_FAILED: {SQLSTATE}` and `EMISSION_ERROR_MESSAGE: {SQLERRM}` to state file. Markdown remains valid. Do not delete the markdown. Do not retry.
- **v3.0: Section 10 was successfully generated but the findings array is empty AND there were P1 or P2 bullets in Section 10.** This is a brief-author bug in the build step (Section 12.2). Write `BRIEF_ERROR: findings_array_empty_but_section_10_has_priorities` to state file.

## Success criteria for v3.0 scheduled run

| Metric | Good | Re-evaluate |
|---|---|---|
| Questions asked | 0 | > 0 |
| Defaults overridden | 0% | > 0% |
| Schema bugs / SQL syntax bugs | 0 | > 0 |
| Output file produced | yes | no |
| Production writes via non-function path | 0 (mandatory) | any > 0 |
| friction.event emission success_count | matches number of P1+P2 bullets in Section 10 | mismatch |
| friction.event emission failure_count | 0 | > 0 |
| PK review time (next morning) | ≤ 3 min | > 10 min |
| Section 10 Priority 1 surfacing accuracy | matches independent chat triage | misses true-stuck or false-flags known-lock items |
| Section 12 emission summary recorded in footer | yes | no |

If 10-of-10 hit on the first scheduled v3.0 run: brief is locked indefinitely until cc-0014 verdict at Day 19 from experiment start. Sunset review extended to 2026-06-15.

## Run lifecycle

v3.0 adds one step to the v2.1 lifecycle:

1. Cowork picks up brief, runs all 14 queries via Supabase MCP `execute_sql`
2. Generates Section 10 priority findings and **simultaneously builds the JSONB findings array** per Section 12.2
3. Writes markdown file at `docs/audit/health/{YYYY-MM-DD}.md`
4. **v3.0 NEW step:** calls `friction.fn_emit_health_check_findings(run_id, markdown_path, findings)` via Supabase MCP `execute_sql`
5. Captures `success_count` + `failure_count` from function return; writes to Section 11 emission summary line via second markdown edit (or assemble before write — implementation choice)
6. Writes state file with run outcome
7. Commits markdown + state file to git
8. PK reviews via state file

## Sunset review

If this brief is unchanged at 2026-06-15 (extended from 2026-06-02 by v3.0 cc-0014 reopening), evaluate: (a) is the data useful? (b) are there persistent questions that should become brief-spec'd? (c) ready to retire D182 v1 first-run-style oversight or extend the framework? (d) what did the cc-0014 IOL experiment verdict at Day 19 reveal about whether this dual-write was worth maintaining?
