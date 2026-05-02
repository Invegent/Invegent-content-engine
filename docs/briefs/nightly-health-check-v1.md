---
brief_id: nightly-health-check-v1
status: review_required
risk_tier: 0
owner: cowork
created_by: PK + chat session 2026-05-02 Saturday afternoon Sydney
default_action: write_markdown_only
allowed_paths:
  - docs/audit/health/**
  - docs/runtime/runs/**
  - docs/runtime/claude_questions.md
  - docs/briefs/queue.md
  - docs/briefs/nightly-health-check-v1.md
forbidden_actions:
  - apply_migration
  - update_production_data
  - any INSERT / UPDATE / DELETE on c.*, m.*, f.*, t.*, a.* schemas
  - delete_branch
  - merge_pr
  - close_audit_finding
  - calling ask_chatgpt_review (Tier 0 boundary — do not escalate from inside this brief)
idempotency_check: "health_file_absent"
idempotency_pattern: "docs/audit/health/{YYYY-MM-DD}.md"
success_output:
  - docs/audit/health/{YYYY-MM-DD}.md
  - docs/runtime/runs/nightly-health-check-v1-{YYYY-MM-DDTHHMMSSZ}.md
---

# Brief: Nightly Health Check v1

Generate a daily Supabase pipeline health snapshot. Read-only queries, markdown output, no production touch. Tier 0.

## Purpose

Automate the recurring health-check pattern PK currently runs ad-hoc at chat session start (memory-flagged "Nightly health check Cowork task (Supabase pipeline only) — not yet built"). This is the third D182 brief shape after migration-draft and audit-snapshot — progresses the validation portfolio toward the 12 May D182 sunset review.

Goal: a markdown file at `docs/audit/health/{YYYY-MM-DD}.md` that surfaces pipeline state, recent activity, and notable anomalies in a fixed shape PK can scan in <60 seconds.

## Idempotency

If `docs/audit/health/{YYYY-MM-DD}.md` already exists for today's date (UTC), write `already_applied` to the state file and stop. Do not overwrite.

## Pre-flight (already done by chat 2026-05-02 ~06:30 UTC)

The following table shapes are authoritative:

- `m.pipeline_health_log` columns: `log_id, snapshot_at, queue_total, queue_queued, queue_running, queue_published_1h, queue_failed, drafts_needs_review, drafts_approved, images_pending, images_generated, images_failed, iw_generated_30m, iw_failed_30m, pub_published_30m, pub_held_30m, pub_throttled_30m, ndis_published_today, pp_published_today, has_stuck_items, has_failed_images`
- `m.cron_health_snapshot` columns: `snapshot_id, jobid, jobname, schedule, is_active, window_hours, total_runs, succeeded_runs, failed_runs, failure_rate, consecutive_failures_at_end, latest_run_at, latest_run_status, latest_error, latest_error_at, computed_at`
- `m.worker_http_log` columns: `id, created_at, cron_jobid, http_response_id, url, status_code, timed_out, content`
- All other tables (`m.ai_job`, `m.slot_fill_attempt`, `m.post_publish`, `m.post_publish_queue`, `m.post_render_log`, `m.chatgpt_review`, `f.canonical_content_body`, `f.ingest_run`) confirmed active.

Known caveat: `pipeline_health_log` only has `ndis_published_today` + `pp_published_today` columns — two-client vestige. CFW and Invegent published-today counts must be derived separately from `m.post_publish` JOIN `c.client`.

## Queries to run

Execute all 11 queries via Supabase MCP `execute_sql` against project `mbkmaxqhsohbtwsqolns`.

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

### Q3 — Cron health latest snapshot

```sql
SELECT jobid, jobname, is_active, total_runs, succeeded_runs, failed_runs, failure_rate,
       consecutive_failures_at_end, latest_run_at, latest_run_status
FROM m.cron_health_snapshot
WHERE computed_at = (SELECT max(computed_at) FROM m.cron_health_snapshot)
ORDER BY failure_rate DESC, jobname;
```

### Q4 — Cron jobs with active failures

```sql
SELECT jobid, jobname, consecutive_failures_at_end, failure_rate, latest_error, latest_error_at
FROM m.cron_health_snapshot
WHERE computed_at = (SELECT max(computed_at) FROM m.cron_health_snapshot)
  AND (consecutive_failures_at_end > 0 OR failure_rate > 0)
ORDER BY consecutive_failures_at_end DESC;
```

### Q5 — Publish output last 24h

```sql
SELECT pp.platform, pp.status, count(*) AS n
FROM m.post_publish pp
WHERE pp.published_at > now() - interval '24 hours'
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

### Q7 — Per-client published count last 24h (covers all 4 clients)

```sql
SELECT c.slug, count(*) AS published_24h
FROM m.post_publish pp
JOIN m.post_draft pd ON pd.draft_id = pp.draft_id
JOIN c.client c ON c.client_id = pd.client_id
WHERE pp.published_at > now() - interval '24 hours'
  AND pp.status = 'success'
GROUP BY c.slug
ORDER BY c.slug;
```

### Q8 — ai_job activity last 24h

```sql
SELECT status, count(*) AS n
FROM m.ai_job
WHERE created_at > now() - interval '24 hours'
GROUP BY status
ORDER BY n DESC;
```

### Q9 — slot_fill_attempt activity last 24h

```sql
SELECT outcome, count(*) AS n
FROM m.slot_fill_attempt
WHERE created_at > now() - interval '24 hours'
GROUP BY outcome
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

## Output format

Write a single markdown file at `docs/audit/health/{YYYY-MM-DD}.md` with these sections in order. Use today's UTC date for the filename.

```markdown
# ICE Pipeline Health — {YYYY-MM-DD}

> Generated by `nightly-health-check-v1` brief.
> Run timestamp (UTC): {ISO-8601}
> Window: 24h trailing where applicable.

## 1. Headline

- Pipeline health snapshot age: {minutes since last `pipeline_health_log` snapshot}
- Cron health snapshot age: {minutes since last `cron_health_snapshot` snapshot}
- Stuck items flag: {has_stuck_items from latest pipeline_health_log}
- Failed images flag: {has_failed_images from latest pipeline_health_log}
- Notable anomalies: {bulleted list — see Section 8}

## 2. Pipeline health latest snapshot (Q1)

{Tabulate the single row from Q1, all columns. Use a 2-column table: metric | value.}

## 3. Pipeline health 3-hour trend (Q2)

{Tabulate Q2 results, 6 rows, oldest first.}

## 4. Cron health (Q3 + Q4)

Summary: {n} cron jobs total, {n} active, {n} with failures.

{If Q4 returned rows, tabulate them. Otherwise: "No cron jobs with active failures."}

## 5. Publish output 24h (Q5 + Q7)

By platform/status (Q5):

{Tabulate Q5.}

Per client (Q7):

{Tabulate Q7.}

## 6. Publish queue current state (Q6)

{Tabulate Q6.}

## 7. Pipeline activity 24h (Q8 + Q9 + Q10)

- ai_job: {Tabulate Q8 inline.}
- slot_fill_attempt: {Tabulate Q9 inline.}
- ingest (canonical_content_body): {Tabulate Q10 inline.}

## 8. Worker errors 24h (Q11)

{If Q11 returned rows, tabulate. Otherwise: "No 4xx/5xx or timeout HTTP responses in last 24h."}

## 9. ChatGPT Review MCP (Q12)

{Single row from Q12 as 5 metrics.}

Threshold check (per S17):
- Spend: estimated ~${(total_tokens ÷ 1000) × weighted_avg_rate}; flag if > $35 implied monthly burn
- Escalation rate: {escalated_count / calls}; flag if > 40%

## 10. Notable signals

List any of the following:
- Snapshot age > 60 minutes (pipeline_health or cron_health)
- has_stuck_items = true
- has_failed_images = true
- Any cron job with consecutive_failures_at_end >= 3
- Zero counts in any of: ai_job 24h, slot_fill_attempt 24h, post_publish 24h, canonical_content_body 24h
- Worker HTTP errors > 0
- Publish queue rows in unusual states

If nothing notable, write: "No anomalies above default thresholds."

## 11. Footer

- Brief: `nightly-health-check-v1`
- Run state file: `docs/runtime/runs/nightly-health-check-v1-{YYYY-MM-DDTHHMMSSZ}.md`
- Idempotency check: `health_file_absent` → passed at start of run
- Next: PK reviews; if pattern stable after 2-3 runs, schedule via Cowork at 02:00 AEST
```

## Likely questions and defaults (answer-key)

1. **Q: `pipeline_health_log.queue_published_1h` semantics ambiguous — "items where status changed to published in last 1h" or "items in queue now whose published_at < 1h ago"?**
   **Default:** Report the value verbatim. Do not interpret. Caveat in Section 2 footnote: "Column semantics defer to producer code in `m.take_pipeline_health_snapshot`; see m schema docs."

2. **Q: `cron_health_snapshot` — should "failing" count jobs where `failure_rate > 0`, or jobs where `latest_run_status='failed'`, or jobs with `consecutive_failures_at_end > 0`?**
   **Default:** Report all three views in Section 4 — (a) total failed, (b) latest failed, (c) consecutive-failure streak. Q3 covers (a)+(b); Q4 isolates (c).

3. **Q: `m.ai_job` returns 0 rows in 24h — anomaly or normal?**
   **Default:** Report as factual zero. Surface in Section 10 "Notable signals" without interpreting (PK knows about auto-approver starvation per memory; do not editorialise).

4. **Q: `m.post_publish_queue.status` values — unfamiliar enum values appear; how to tabulate?**
   **Default:** Report all status values returned, sorted by count descending. Do not filter.

5. **Q: Worker HTTP `endpoint` extraction via split_part — may produce empty strings for malformed URLs?**
   **Default:** Group with NULL endpoint as "(unparseable)" row. Do not crash.

6. **Q: Estimated cost calculation in Section 9 — ChatGPT Review uses gpt-4o-mini at $0.00015 input + $0.0006 output per 1k tokens. Should I compute exact cost?**
   **Default:** Use simplified flat estimate `(total_tokens / 1000) * 0.0003` (mid-rate proxy). Note as approximation. B34 will replace with exact when populated.

7. **Q: Output file already exists when I run — append, overwrite, or skip?**
   **Default:** Per idempotency_check: skip. Write `already_applied` to state file and stop. Do not overwrite.

If a decision arises that is NOT covered above and NOT obviously safe to default, write the question to `docs/runtime/claude_questions.md` per D182 default-and-continue, then proceed with your best-judgement default and note the divergence in the state file.

## Stop conditions

- Any query returns an error you cannot recover from → write error to state file, halt that section but continue with remaining sections.
- File at `docs/audit/health/{YYYY-MM-DD}.md` already exists → idempotency hit, write `already_applied` to state file, stop.
- Any query attempts a non-SELECT operation → you have a brief-author bug, write `BRIEF_ERROR` to state file, stop.
- Any allowed_paths violation attempt → halt immediately.

## Success criteria for first run

| Metric | Good | Re-evaluate |
|---|---|---|
| Questions asked | ≤ 5 | > 10 |
| Defaults overridden | ≤ 20% | > 50% |
| Output file produced | yes | no |
| Production writes | 0 (mandatory) | any > 0 |
| PK review time | ≤ 5 min | > 15 min |

If 4+ "Good" thresholds hit: brief-shape #3 validated; consider scheduling at 02:00 AEST after 2-3 manual runs prove stability.

## Run lifecycle (per D182 v1)

1. Cowork picks up this brief from `docs/briefs/queue.md` (status=ready, owner=cowork)
2. Verify frontmatter complete → run idempotency check
3. Execute Q1–Q12 → build markdown per output format spec
4. Write output to `docs/audit/health/{YYYY-MM-DD}.md`
5. Write state file to `docs/runtime/runs/nightly-health-check-v1-{ISO-timestamp}.md`
6. Update `docs/briefs/queue.md`: move this row from Active to Recently completed
7. Commit all three files in a single commit per D182 3-commit-pattern simplified to 1 (Tier 0)

## Notes for next iteration (v2)

- After 2-3 stable runs, schedule via Cowork app `Scheduled` tab at 02:00 AEST daily
- Add per-vertical pool retention from `m.fill_pending_slots` results once production is stable post-T08
- Add S16 fresh-approval rate when auto-approver v1.6.0 EF deploys
- Consider extending to weekly digest aggregating 7 nightly snapshots

## Sunset review

If this brief is still in v1 unchanged on 2026-06-02 (one-month review window), evaluate: (a) is the data useful? (b) are there persistently-asked questions that should become brief-spec'd? (c) has automation matured enough to schedule it without first-run-style manual oversight?
