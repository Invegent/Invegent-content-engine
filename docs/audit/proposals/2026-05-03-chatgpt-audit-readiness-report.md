# ChatGPT Audit Readiness Report — received 2026-05-03 night Sydney

> **Source**: External ChatGPT thread (PK-driven), uploaded to chat session 2026-05-03 night Sydney during pipeline investigation.
> **Status**: PROPOSAL — not adopted. Under review.
> **Companion review**: `docs/audit/proposals/2026-05-03-chatgpt-audit-readiness-report-CHAT-REVIEW.md` (chat-side critical review).

---

## Executive Summary (as authored by ChatGPT)

The Supabase connection is working, but the current database setup is not yet audit-friendly.

The audit failed or became unstable because the current inspection approach relies too much on broad schema scans, multi-statement SQL bundles, raw cron job data, large JSON payloads, and potentially sensitive command fields. Small targeted SQL queries worked successfully, which confirms that the issue is not a total Supabase connection failure.

The database contains the required pipeline structures for a proper audit, including client configuration, publishing profiles, schedules, AI jobs, drafts, publishing queue records, token health records, worker HTTP logs, pipeline doctor/fixer logs, health snapshots, cron jobs, and cron run history.

However, the audit needs a dedicated layer of safe, narrow, read-only views. These views should summarize the state of the pipeline without exposing tokens, secrets, raw cron commands, large request/response payloads, or unbounded logs.

The most important confirmed pipeline signal from the working health check was:

- ai_jobs_queued = 0
- publish_queued = 501
- latest post publish update was current on 3 May 2026
- latest post seed was 25 April 2026

This suggests the pipeline is not dead, but there is a significant publish queue backlog and/or publishing downstream bottleneck.

---

## Confirmed Facts From Today's Supabase Checks (per ChatGPT)

### Supabase Access Works
- Database name: `postgres`
- Role: `supabase_read_only_user`
- Database returned current timestamp normally
- Conclusion: connector authenticated and able to read.

### Relevant Schemas Exist

| Schema | Purpose |
|---|---|
| c | Client, channel, platform, publish profile, schedule configuration |
| m | Marketing pipeline: slots, AI jobs, drafts, publishing queue, health logs, token health, incidents |
| f | Feed ingestion and raw/canonical content processing |
| cron | Scheduled jobs and run history |
| k | Database registry and metadata views |
| t | Taxonomy/reference tables |
| public | Portal-facing objects and small public views |

### Relevant Pipeline Tables Exist (per ChatGPT enumeration)

| Area | Objects |
|---|---|
| Client setup | c.client, c.client_channel, c.client_publish_profile, c.client_publish_schedule, c.platform_channel |
| Slot system | m.slot, m.slot_fill_attempt, m.slots_in_critical_window, m.slot_alerts |
| AI generation | m.ai_job, m.ai_job_attempt, m.ai_usage_log, m.pipeline_ai_summary |
| Drafting | m.post_draft, m.post_visual_spec, m.post_render_log, m.post_carousel_slide |
| Publishing | m.post_publish_queue, m.post_publish, m.worker_http_log |
| Health | m.vw_ops_pipeline_health, m.vw_ops_failures_24h, m.vw_ops_token_health, m.cron_health_status, m.pipeline_health_log |
| Tokens | m.platform_token_health, c.client_publish_profile token-related fields |
| Cron | cron.job, cron.job_run_details |
| Feed | f.ingest_run, f.ingest_error_log, f.raw_content_item, f.canonical_content_item, f.content_item |

### Current Database Runtime Constraints (per ChatGPT)

| Setting | Value | Audit Impact |
|---|---|---|
| statement_timeout | 120,000 ms | Any query over 120s will fail |
| work_mem | 2,184 kB | Complex joins/sorts can be slow or spill |
| max_parallel_workers_per_gather | 1 | Limited parallel query performance |
| lock_timeout | 0 | Not directly blocking reads |
| idle_in_transaction_session_timeout | 0 | Not directly blocking reads |

### cron.job_run_details bloat observation

- ~260 MB total
- ~217 estimated live rows
- Possible causes: large `return_message` values, stored HTTP responses, TOAST bloat, old cron history churn, insufficient vacuum.
- Last autovacuum/autoanalyze: 27 January 2026

---

## Audit Design Principles (per ChatGPT)

Each audit view should follow these principles:

- One purpose per view
- No secrets, tokens, raw command bodies, or raw HTTP bodies
- No `select *` in audit-facing views
- Bounded date windows where possible
- Return counts, timestamps, statuses, and short error heads only
- Expose client names/slugs, not just UUIDs
- Use platform/client/status grouping
- Return small result sets suitable for ChatGPT/tool inspection
- Separate configuration audit from operational audit
- Make bottlenecks obvious by stage

---

## Proposed Views (20)

Proposed schema: `audit`. Schema creation: `create schema if not exists audit;`

### Priority 1: Minimum Viable Audit View Set (6 views)

1. `audit.v_pipeline_overview` — one-row exec summary from `m.vw_ops_pipeline_health`
2. `audit.v_brand_platform_audit_matrix` — main brand/platform matrix (NOTE: SQL appears truncated/malformed in original document — see chat-side review)
3. `audit.v_publish_queue_summary` — queue backlog by client/platform/status
4. `audit.v_publish_failures_recent` — publish failures last 14 days
5. `audit.v_token_health_summary` — token validity per client/platform
6. `audit.v_cron_job_status_safe` — cron health without exposing command text

### Priority 2: Additional views

7. `audit.v_client_platform_config` — config snapshot per client/platform
8. `audit.v_publish_schedule_summary` — schedule slots enabled per client/platform
9. `audit.v_slot_health_by_client_platform` — slot fill/skip/overdue counts
10. `audit.v_slot_fill_failures_recent` — why slots aren't filling
11. `audit.v_ai_job_health_by_client_platform` — AI job status by stream
12. `audit.v_ai_attempt_failures_recent` — AI attempt-level errors
13. `audit.v_draft_health_by_client_platform` — draft generation/approval state
14. `audit.v_publish_success_recent` — actual publishes last 14 days
15. `audit.v_worker_http_summary_recent` — worker HTTP calls grouped by hour/url/status
16. `audit.v_cron_failures_safe_recent` — cron failures with truncated return_message
17. `audit.v_pipeline_incidents_open` — unresolved incidents from `m.pipeline_incident`
18. `audit.v_pipeline_doctor_recent` — doctor run history
19. `audit.v_pipeline_fixer_recent` — fixer run history
20. `audit.v_feed_ingest_health_recent` — feed ingestion (column inspection required first)

---

## Proposed Indexes (8 sets)

```sql
-- Publish Queue
create index if not exists idx_post_publish_queue_client_platform_status on m.post_publish_queue (client_id, platform, status);
create index if not exists idx_post_publish_queue_scheduled_for on m.post_publish_queue (scheduled_for);
create index if not exists idx_post_publish_queue_updated_at on m.post_publish_queue (updated_at);

-- Publish History
create index if not exists idx_post_publish_client_platform_published_at on m.post_publish (client_id, platform, published_at desc);
create index if not exists idx_post_publish_status_created_at on m.post_publish (status, created_at desc);

-- Drafts
create index if not exists idx_post_draft_client_platform_created_at on m.post_draft (client_id, platform, created_at desc);
create index if not exists idx_post_draft_approval_status on m.post_draft (approval_status);

-- AI Jobs
create index if not exists idx_ai_job_client_platform_status_created_at on m.ai_job (client_id, platform, status, created_at desc);
create index if not exists idx_ai_job_locked_at on m.ai_job (locked_at) where locked_at is not null;

-- Slots
create index if not exists idx_slot_client_platform_scheduled_status on m.slot (client_id, platform, scheduled_publish_at, status);
create index if not exists idx_slot_fill_attempt_attempted_at on m.slot_fill_attempt (attempted_at desc);

-- Token Health
create index if not exists idx_platform_token_health_client_platform_checked on m.platform_token_health (client_id, platform, checked_at desc);

-- Worker HTTP Logs
create index if not exists idx_worker_http_log_created_status on m.worker_http_log (created_at desc, status_code);

-- Cron Run Details
create index if not exists idx_cron_job_run_details_jobid_start_time on cron.job_run_details (jobid, start_time desc);
create index if not exists idx_cron_job_run_details_start_status on cron.job_run_details (start_time desc, status);
```

---

## Proposed Cron Table Maintenance

```sql
-- Inspect bloat
select
  pg_size_pretty(pg_total_relation_size('cron.job_run_details')) as total_size,
  pg_size_pretty(pg_relation_size('cron.job_run_details')) as table_size,
  pg_size_pretty(pg_total_relation_size('cron.job_run_details') - pg_relation_size('cron.job_run_details')) as index_or_toast_size;

-- Inspect message lengths
select
  count(*) as rows,
  max(length(return_message)) as max_return_message_length,
  avg(length(return_message)) as avg_return_message_length
from cron.job_run_details;

-- Vacuum analyze (during low-traffic window)
vacuum analyze cron.job_run_details;
```

---

## Forbidden Patterns During Audit (per ChatGPT)

- `select * from cron.job;`
- `select command from cron.job;`
- `select * from cron.job_run_details;`
- `select * from m.ai_job;`
- `select * from m.ai_job_attempt;`
- `select * from m.worker_http_log;`
- `select request_payload, response_payload from m.post_publish;`
- `select input_payload, output_payload from m.ai_job;`

Avoid returning: cron command text, raw tokens, page_access_token, vault secrets, full request payloads, full response payloads, full AI prompts or model responses unless deliberately needed, large JSON fields, unbounded log tables.

---

## Hypotheses To Test (per ChatGPT)

1. **Publishing queue backlog is the main bottleneck** — publish_queued = 501
2. **Slot/content generation side is stale** — latest post seed 25 April vs other components 3 May
3. **Some platforms are intentionally disabled or paused** — Instagram and YouTube observation
4. **Platform tokens or destination configuration are blocking publishing**
5. **Cron/tooling audit queries are unstable because cron history is too large or contains sensitive command/output bodies**

---

## Recommended Audit Flow (per ChatGPT)

1. Create `audit` schema
2. Create the core safe views first (priority 1, six views)
3. Run the four-brand matrix query
4. Identify the bottleneck per platform via classified `likely_bottleneck` enum
5. Drill only into the bottleneck via the targeted view

Classifications proposed:
- `channel_disabled`
- `publishing_disabled`
- `publish_profile_paused`
- `no_enabled_schedule`
- `token_failure`
- `publish_queue_overdue`
- `publish_queue_backlog`
- `publishing_stale`
- `never_published_or_no_record`
- `ok_or_recently_active`

---

## Final Recommendation (per ChatGPT)

Do not continue the audit with broad manual SQL against raw operational tables.

Instead, create a safe audit schema with small summary views, then run the audit through those views only.

The database has enough information to diagnose the pipeline, but the current raw structure is too large, too sensitive, and too easy to query inefficiently through the ChatGPT/Supabase connector.

---

*End of received report. Original document had truncation in `v_brand_platform_audit_matrix` SQL (CTEs missing) and final paragraph cut off mid-sentence ("The..."). Reproduced as received. See chat-side critical review for assessment.*
