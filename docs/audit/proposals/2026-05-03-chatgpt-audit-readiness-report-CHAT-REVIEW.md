# Chat-side review — ChatGPT Audit Readiness Report 2026-05-03

> **Companion to**: `docs/audit/proposals/2026-05-03-chatgpt-audit-readiness-report.md`
> **Author**: chat (PK direction: "review carefully before we take any action")
> **Closure budget**: ~0.4h trailing-14d 14.3 → 14.7h. Above 8.0h floor.
> **Verdict**: PARTIAL ADOPTION RECOMMENDED. Not full adoption. Not full rejection.

---

## TL;DR

Report is well-intentioned and substantively better than I initially assumed (most schema references check out). But it **misdiagnoses tonight's incident**, **duplicates significant existing infrastructure**, and **contains material errors** that would create dead-on-arrival views if applied as written. The 20-view framework is also oversized for current closure budget and competes with tonight's actual fix path.

**Recommended adoption**: 2-4 views from the priority-1 set, with corrections. Skip indexes pending performance evidence. Skip cron maintenance — separate concern. Do NOT defer tonight's pipeline fixes for this work.

---

## What the report gets right

1. **Principle of stable summary views over ad-hoc raw queries** — sound. Aligns with existing audit infrastructure pattern.
2. **Don't expose secrets/tokens/raw payloads/cron command text** — correct security posture.
3. **Most column references actually exist** — verified via direct schema query 2026-05-03 night:
   - `c.client_publish_profile.mode`, `paused_at`, `paused_until`, `paused_reason`, `max_per_day`, `min_gap_minutes`, `auto_approve_enabled`, `require_client_approval`, `image_generation_enabled`, `video_generation_enabled`, `token_expires_at` — all exist
   - `c.client_publish_schedule` — table exists
   - `m.platform_token_health` columns (`ok`, `err`, `expires_at`, `checked_at`, `destination_id`, `credential_env_key`, `client_id`) — all exist
   - `m.post_publish` columns (`error`, `queue_id`, `attempt_no`, `destination_id`, `platform_post_id`) — all exist
   - `m.ai_job_attempt` columns (`attempt_no`, `model`, `started_at`, `finished_at`) — all exist
4. **Index suggestions are mostly defensible** for a stable read-heavy audit layer (though no performance evidence yet shows current queries are too slow).
5. **cron.job_run_details bloat observation** is plausibly real (260MB / 217 live rows is consistent with TOAST bloat from large `return_message` accumulation).
6. **Concept of `likely_bottleneck` enum classification** is genuinely useful design — single-word state per (client, platform) is more readable than raw counters.

---

## What the report gets materially wrong

### Error 1: `v_slot_health_by_client_platform` slot status vocabulary mismatch (HIGH)

Proposed view filters on `status='open'`, `status='skipped'`. Verified slot status vocab in production: `filled, future, failed, pending_fill`. Neither 'open' nor 'skipped' exists.

**Effect if applied**: View returns zeros for `open_slots`, `skipped_slots`, `overdue_open_slots` columns — missing the exact cases that matter (failed slots and stuck pending_fill are tonight's actual bottlenecks on CFW LinkedIn x4 and Invegent LinkedIn x1).

**Fix**: Replace `status='open'` with `status='pending_fill'`, replace `status='skipped'` with `status='failed'`. Also surface `skip_reason` distribution since the report's recovery-loop pattern (`exceeded_recovery_attempts`) is invisible without it.

### Error 2: `v_brand_platform_audit_matrix` SQL is truncated/malformed (HIGH)

The view as authored starts:

```sql
create or replace view audit.v_brand_platform_audit_matrix as
  select
    client_id,
    platform,
    count(*) filter (where enabled) as enabled_schedule_rows
  from c.client_publish_schedule
  group by client_id, platform
), token as (
```

The leading `WITH` clause is missing. CTEs `latest_publish`, `queue`, `schedule` are referenced in the joins later but never defined. The `, token as (` continuation has no preceding CTE. The view will not compile as written. The original document also ends with truncation ("The...") so this looks like a copy-paste failure, not a logical error — but the SQL is unusable as published.

**Effect if applied**: SQL parse error. The most heavily-promoted view in the report (the "main human-readable matrix", priority 1, the answer to "which brand/platform is broken") doesn't run.

**Fix**: Author the missing CTEs from scratch — or skip this view entirely and use simpler per-stream queries.

### Error 3: "latest post seed = 25 April" misdiagnosis (MEDIUM)

Report flags this as evidence the slot/content generation side is stale. Reality: `seed-and-enqueue` crons (jobid 11, 64, 65) are **intentionally paused** per slot-driven v4 migration (carried-forward "do not touch" state, action_list v2.29). Slot-driven v4 produces drafts via `m.fill_pending_slots` (jobid 75), not via the seed pathway. The 25 April timestamp on `m.post_seed` reflects when the legacy seed pipeline was last used — **not** a stall.

A report that frames `post_seed` staleness as a problem will lead any future audit reader (ChatGPT or human) toward the wrong root cause.

**Fix**: Remove `latest_post_seed` from `v_pipeline_overview` or annotate explicitly that it's an archived/paused signal. Add `latest_slot_filled_at` instead.

### Error 4: Misframes tonight's actual incident (HIGH)

Report's hypothesis 1 is "publish queue backlog is the main bottleneck" because `publish_queued = 501`. That's a partial truth. The deeper diagnosis (per chat-side investigation `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md`) is:

1. F-AAP-001 backlog avalanche reapproved ~25 days of drafts on 5-3 09:30-10:30 UTC
2. F-PUB-010 hard-cap (jobid 48) blocks ~30 newly-approved drafts from entering queue
3. F-PUB-009 legacy `get_next_scheduled_for` ignores `slot.scheduled_publish_at`, spreading queue rows arbitrarily
4. `m.recover_stuck_slots` refills failed slots with already-published drafts (CFW LinkedIn x4 evidenced)
5. 10 stale dead queue rows from F-AAP-001 outage era

**None of these would surface from the report's proposed views as written.** 
- `v_publish_queue_summary` would show "backlog" but not why or that it's cap-blocked
- `v_slot_health_by_client_platform` (with status vocab fix) might surface `failed` slots but won't explain the recovery-loop pathology
- No view correlates draft.approval_status='approved' with queue_status=NULL (the cap-blocking signal)
- No view shows `slot.scheduled_publish_at` vs `post_publish_queue.scheduled_for` (the legacy-spread signal)

**Implication**: The audit framework, as authored, is calibrated for general health checks but not for the structural pathologies actually present.

### Error 5: Significant duplication with existing infrastructure (MEDIUM)

Existing infra (verified from cron jobs + table list):

| ChatGPT proposal | Already exists |
|---|---|
| `audit.v_pipeline_overview` | `m.vw_ops_pipeline_health` view |
| `audit.v_publish_failures_recent` | `m.vw_ops_failures_24h` view |
| `audit.v_token_health_summary` | `m.vw_ops_token_health` view |
| `audit.v_cron_job_status_safe` | `m.cron_health_status`, `m.cron_health_check`, `m.cron_health_alert`, `m.cron_health_snapshot` (refreshed every 15m via jobid 67) |
| `audit.v_slot_health_by_client_platform` (partial) | `m.slots_in_critical_window` view, `m.slot_alerts` |
| `audit.v_pipeline_doctor_recent` | `m.pipeline_doctor_log` table directly |
| `audit.v_pipeline_fixer_recent` | `m.pipeline_fixer_log` table directly |
| `audit.v_pipeline_incidents_open` | `m.pipeline_incident` table + jobid 63 auto-resolver |
| `audit.v_pipeline_overview` (extended) | `m.pipeline_ai_summary` (jobid 30 hourly) |
| Hourly + 15m snapshots | jobids 28, 49, 50, 67 already running |

Plus there's a **nightly health check Cowork task at 02:00 AEST** that runs 14 SQL queries and writes `docs/audit/health/{date}.md`. 

The report does not acknowledge any of this. It builds a parallel framework rather than extending or replacing the existing one. **If any view is created, it should consolidate or replace what's there — not add a 4th layer.**

---

## Closure budget impact

Full adoption (20 views + 8 index sets + cron maintenance + diagnostic queries) is realistically **3-6 hours of authoring + apply work** including D-01 reviews per migration. That's nearly half a trailing-14d closure budget for a parallel framework that doesn't fix the active P1/P2 findings.

Meanwhile the actual pipeline incident has 4 stalled streams. CFW LinkedIn won't self-heal without Fix 3.

**The economical interpretation**: if we adopt this as a substitute for tonight's fix, we lose 1+ more days of LinkedIn silence on 3 streams plus indefinite gap on CFW LinkedIn. If we adopt as additive, we burn closure budget on infrastructure that duplicates existing.

---

## Recommended adoption: PARTIAL

### Adopt (with corrections) — ~0.5-1h apply work next session

1. **`audit.v_publish_queue_summary`** — useful gap not currently filled by `vw_ops_failures_24h`. Apply with no changes. ~10 min.
2. **`audit.v_slot_health_by_client_platform`** — useful BUT only with corrected status vocabulary (`pending_fill`, `failed` instead of `open`, `skipped`). ~15 min.
3. **`audit.v_brand_platform_audit_matrix`** — useful CONCEPT but the SQL is unusable as published. Author from scratch using working CTEs. The `likely_bottleneck` enum classification is the genuinely valuable design pattern. ~30-45 min including testing.
4. **(optional) `audit.v_publish_success_recent`** — useful as proof-of-published. Cheap. ~5 min.

### Skip

- `v_pipeline_overview` — redundant with existing `m.vw_ops_pipeline_health`. Just use the existing view directly. Updating that view is a separate question.
- `v_publish_failures_recent` — redundant with `m.vw_ops_failures_24h`.
- `v_token_health_summary` — redundant with `m.vw_ops_token_health`.
- `v_cron_job_status_safe` / `v_cron_failures_safe_recent` — redundant with `m.cron_health_status` family.
- `v_pipeline_doctor_recent` / `v_pipeline_fixer_recent` / `v_pipeline_incidents_open` — underlying tables are already small, narrow-purpose, and queryable directly. View wrapping adds nothing.
- `v_client_platform_config` — a `select * from c.client_publish_profile` returns 14 rows. Audit overhead exceeds value.
- `v_publish_schedule_summary` — if needed, write the query inline. Don't materialise as view.
- `v_ai_job_health_by_client_platform` / `v_ai_attempt_failures_recent` / `v_draft_health_by_client_platform` — nice-to-have, not blocking. Defer.
- `v_worker_http_summary_recent` — redundant with existing health snapshots; the report's specific concern (response body bloat) is real but better solved by NOT logging full response bodies in the first place.
- `v_feed_ingest_health_recent` — the report itself flags this needs column inspection first; defer.

### Defer or reject

- **All proposed indexes**: defer until evidence of slow queries exists. Index addition is not free — each one slows writes. Without measured query latency or `pg_stat_statements` evidence, this is speculative optimisation. Adding 16 indexes "in case" is anti-pattern.
- **Cron table maintenance** (`vacuum analyze cron.job_run_details`): separate concern, not pipeline-related. Worth doing eventually but not part of audit-readiness. Log as **B-CRON-BLOAT P3** for the backlog.

---

## Correct framing for tonight

Two distinct workstreams here, and they should not be conflated:

**Workstream A (URGENT)**: Pipeline incident remediation — 4 stalled streams. ChatGPT-reviewed proposal already escalated; revised plan in chat session waiting on PK direction (uniform cap=30, pre-flight EF logs, then Fixes 4+5+1+3+2 in sequence).

**Workstream B (BACKLOG)**: Audit infrastructure improvement — the report's actual subject. Worth doing in some form; not worth deferring A for. If we adopt the recommended subset (3-4 views with corrections), apply alongside Workstream A in next session, not as a precondition.

**The framing in the report — "build audit infrastructure first, then fix" — is wrong for the present state.** We have enough audit visibility right now to diagnose the issues (chat-side investigation already produced the diagnosis with existing tools and ad-hoc SQL). The fixes don't require the audit framework. Conversely, building the audit framework while 4 streams remain stalled is a closure-budget mistake.

---

## Open questions for PK

1. **Adopt the partial subset (3-4 corrected views)** in next session, or **defer all of it**?
2. **Workstream A path** — still proceeding tonight per ChatGPT-revised plan (Fixes 4+5+1 with uniform cap=30, plus pre-flight EF log query)? Or pause to reconsider?
3. **Findings to log**: B-AUDIT-FRAMEWORK-PROPOSAL P3 (this proposal as backlog item) and B-CRON-BLOAT P3 (cron history bloat as separate finding) — OK to add to action_list?

---

## Honest limitations of this review

- I did not author and run the proposed views to verify each one compiles. The slot vocabulary error and the truncated CTE error were caught by reading. Other compile-time errors may exist.
- I did not benchmark any current audit query latency, so my "defer indexes" recommendation is also speculative — just speculative in the opposite direction.
- The cron bloat claim (260MB / 217 rows) is from the report; I did not independently verify with `pg_total_relation_size` tonight. If the bloat is real and causing tool timeouts on adjacent operations, that's a stronger argument for cron maintenance than I've credited.
- I'm trusting my own diagnosis of tonight's incident over the report's hypothesis. ChatGPT may also be right that the diagnosis is incomplete — e.g. publisher EF errors I haven't yet checked could reveal a different root cause that better fits the report's framing.

---

*End chat-side review. Adoption decision pending PK direction.*
