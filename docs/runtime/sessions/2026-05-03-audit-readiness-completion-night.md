# 2026-05-03 late night Sydney — Audit-readiness completion + 2-tier ChatGPT external validation

**Trigger**: PK directive "i want this to be in place so a free audit can be run by chatgpt" following the earlier pipeline-relief apply session (`2026-05-03-pipeline-relief-apply-night.md`). Continuous chat session; this file covers the v2.31 + v2.32 arc.

**Closure budget**: ~1.5h chat-side this phase. Combined with prior phase ~2.25h total session. Trailing-14d 14.7 → ~17.0h. Above 8.0h floor.

**Migration log**: 1 applied this phase (Migration 3 = audit views v2).

---

## Major events

### 1. Audit-readiness gap analysis

After M1+M2 applied (prior session file), gaps remained:
- C3 view (`audit.v_brand_platform_audit_matrix`) not yet authored — the spine of any audit
- C4 view (`audit.v_publish_success_recent`) not yet authored — proof-of-published reconciliation
- No audit runbook documenting the audit flow autonomously

PK directive made the goal explicit: ChatGPT should be able to run the audit on its own without ad-hoc SQL.

### 2. Migration 3 applied

`audit_views_v2_matrix_and_success` — created:

- **`audit.v_brand_platform_audit_matrix`**: one row per (active client, platform) with `likely_bottleneck` enum classifying the dominant blocker. Computed via 7 CTEs (latest_publish, queue_state, slot_state, draft_state, token_state, legacy_spread, schedule_state).
- **`audit.v_publish_success_recent`**: simple 14-day window of successful publishes for proof-of-published reconciliation.

Pre-apply dry-run validated correct classifications matching tonight's incident diagnosis (CFW-LI=`slot_fill_failed`, NDIS-FB/PP-LI/PP-FB/PP-YT/NDIS-LI=`approved_not_queued_cap_blocked`, Invegent=`ok_or_recently_active`).

ChatGPT D-01 review #21 (`648ae6a4`) ESCALATED partial, 3 pushback points classified weak/medium/weak per Lesson #62. Cost-of-waiting reasoning held. Applied.

### 3. Runbook v1 committed

`docs/audit/runbook/2026-05-03-audit-runbook-v1.md` — 6-step audit flow ChatGPT can follow autonomously, with drill-down query per bottleneck type, severity guidance, known pathologies, forbidden-column list.

### 4. ChatGPT 1st external audit — v1 errors caught

PK shared ChatGPT's external investigation against runbook v1. ChatGPT found 4 verified errors:

1. `m.worker_http_log` doesn't capture publishers — only cron_jobid 5 (ai-worker), 288 rows in 24h with NULL `status_code`. Runbook reference was wrong source.
2. `WHERE NOT is_healthy` predicate fails — column is `status` (text, value `'green'`), not boolean `is_healthy`.
3. Fix 4 sweep selection narrower than broader picture (47 dead rows total post-sweep, not just 16).
4. Cap=30 wouldn't unblock streams already at 50-105 queued.

### 5. Runbook v2 written + committed

Verified each ChatGPT claim against ground truth before authoring v2. Key changes:

- Replaced `m.worker_http_log` with `net._http_response` (aggregate) + `m.post_publish` (per-publisher outcomes) + `m.cron_health_status` (per-cron heartbeat).
- Fixed cron health vocabulary: `WHERE status != 'green'`.
- Added explicit publisher cron jobid table (jobid 7=publisher, 34=youtube-publisher, 53=instagram-publisher PAUSED, 54=linkedin-zapier-publisher, 55=wordpress-publisher).
- Added Row-list discipline section for any sweep migrations.
- Re-verified every example query against live DB before committing.

T-MCP-11 lesson candidate logged: pre-flight discipline includes verifying log/health table actually contains the data assumed; table existence ≠ table populated; column references must be schema-verified.

### 6. ChatGPT 2nd external audit — v2 substantively validated + 1 nuance surfaced

PK shared ChatGPT's second investigation, this time against runbook v2. Substantively validated all 4 v2 corrections + audit views + matrix classifications.

Surfaced one nuance v2.31 verification missed: the `dead_reason` column (which I didn't query). Actual breakdown of remaining dead rows post-M1 sweep:

| dead_reason | last_error | rows |
|---|---|---|
| `m8_m11_bloat_window_2026-04-17` | NULL | 39 |
| `post_draft_not_found_orphan_F-PUB-006_2026-05-03` | post_draft_not_found | 4 |
| `pre_m8_stale_2026-04-09` | NULL | 2 |
| `F-PUB-005_premature_enqueue_unblocks_F-PUB-006_2026-05-03` | not_approved:needs_review | 1 |
| `orphaned queue item — manually resolved 2 Apr 2026` (handtyped) | post_draft_not_found | 1 |

Total **47 rows, all with explicit `dead_reason` annotations**. Per Phase 1.7 Dead Letter Queue design principle (`docs/05_risks.md`): **"Dead items are never deleted — they are an audit trail."**

### 7. F-HISTORIC-DEAD-CLEANUP retired

The dead rows are functioning as designed. F-HISTORIC-DEAD-CLEANUP backlog item was miscategorised. Retired with explanation in v2.32.

### 8. Runbook v2.1 patch committed

Added "Dead rows are audit trail, not hygiene candidates" subsection in Row-list Discipline section. Refined `publish_queue_failed_or_dead` severity guidance to distinguish annotated (audit trail; INFO) vs unannotated (P2 investigate) rows. Refined drill-down query to surface `dead_reason`.

T-MCP-12 lesson candidate logged: query EVERY annotation column when verifying table contents (last_error, dead_reason, skip_reason, fail_reason, etc.), not just the most obvious one.

### 9. ChatGPT 2nd audit also reported pipeline drain progression

ChatGPT's audit re-run showed PP-FB classification shifted from `approved_not_queued_cap_blocked` (earlier today) → `slot_orphan_filled` (now). The Migration 1 dead-queue sweep + jobid 48 ticking allowed the previously cap-blocked drafts to enter queue. PP-FB's only remaining blocker is the 1 orphan slot.

Also reported: pipeline producing 9 FB + 5 LI publishes in last 48h. Pipeline is healthier than morning state.

---

## Standing rules honoured

- **D-01**: 3 plan-level reviews fired this session (`7228440f`, `cee17af5`, `648ae6a4`), all ESCALATED partial verdict, all honoured per protocol. v2.32 doc-only updates following external review verification did NOT require an additional D-01 fire.
- **D-170**: chat applies migrations only via `apply_migration`. No CLI use.
- **D-186**: closure +2.25h total session, trailing-14d 14.7 → 17.0h, above 8.0h floor.
- **G1 sync_state convention**: this file is the second session file for tonight's work (first: `2026-05-03-pipeline-relief-apply-night.md`).
- **Lesson #51 honoured fourteenth time**: pre-flight verified `dead_reason` against live DB before applying v2.32 corrections; would have repeated v2.31 error if I'd just trusted ChatGPT's claim of "40 NULL-error" without re-verifying (actual was 47 rows with `dead_reason` populated).

## Pattern signals

### 3-tier validation pattern works

Tonight ran the full 3 tiers on audit-infrastructure work:

1. **Author publishes** (chat → runbook v1)
2. **External audit runs against the doc** (ChatGPT 1st audit → 4 verified errors caught)
3. **Author re-verifies external findings against ground truth** (chat verified ChatGPT's claims, authored v2)

Then a second cycle:

1' **Author publishes again** (runbook v2)
2' **External audit runs against v2** (ChatGPT 2nd audit → substantively validated + surfaced 1 nuance)
3' **Author re-verifies** (verified `dead_reason` claim, retired F-HISTORIC-DEAD-CLEANUP, authored v2.1)

The third tier is what made the difference between "looks fixed" and "actually fixed-and-verified." Worth promoting to canonical lesson after 1-2 more high-stakes documentation cycles.

### My pre-flight discipline gaps

Two distinct gaps caught this session by external pressure:

- **T-MCP-11** (caught by ChatGPT 1st audit): I referenced `m.worker_http_log` and `WHERE NOT is_healthy` in runbook v1 without verifying the log table was actually populated and the column existed. Table existence ≠ usable.
- **T-MCP-12** (caught by ChatGPT 2nd audit): I queried `last_error` patterns when characterising dead rows but didn't query `dead_reason`. Multi-column annotation tables need multi-column verification.

Both lessons are about **pre-flight rigor for reads against unfamiliar tables**. Bundle for canonical promotion together.

### Plan-review escalation rate (T-MCP-06 evidence)

Plan_review escalations now 9 of 10 (90%). Strong pattern signal. May indicate:
- Plans are PK-decision-required scope by nature (each escalation ended with PK direction resolving)
- Review tool calibration is conservative
- Or: plans are genuinely under-developed when authored

Worth tracking. Currently no action — escalations are functioning as designed in catching strong objections (Lesson #62 type-(a) framework holds).

## What's deferred to next session

- **Cap lift** with revised per-stream targets paired with F-PUB-009 fix (was always going to be next session)
- **Fix 3** recovery loop function patch (CFW LinkedIn 6 marked_failed slots remain; recovery loop not yet patched)
- **Fix 2** F-PUB-009 structural (slot.scheduled_publish_at → post_draft.scheduled_for at fill time, forward-only)
- **PP-FB orphan + pending_fill** investigation
- **NDIS-LI orphan slot 8f9e5c57** marking
- **B-CRON-BLOAT** investigation (`cron.job_run_details` ~260MB)
- **F-AAP-007** + **B-AUDIT-CHECK5-DRIFT** apply paths (briefs committed, awaiting night-job pre-flight)

## Honest limitations

- v2.31 verification missed `dead_reason` column. Specific gap: when characterising 5 dead rows with `last_error='post_draft_not_found'`, I didn't check if they had a `dead_reason` annotation. They did. Pattern: scan ALL annotation columns.
- F-HISTORIC-DEAD-CLEANUP miscategorisation would have been caught earlier had I read `docs/05_risks.md` Phase 1.7 design principle ("Dead items are never deleted — they are an audit trail") with the dead-row analysis. Memory miss.
- Operator fatigue is real. PK has been operating across multiple long sessions today. Late-night work past midnight Sydney. Hard cap on next session's scope worth considering.
- 3 ChatGPT escalations + 2 ChatGPT external audits in one session is unprecedented validation density. Hopefully tonight's audit-readiness work was a one-time investment, not the new normal.

---

## Migration record (this phase)

| Migration name | Effect | Verified |
|---|---|---|
| audit_views_v2_matrix_and_success | CREATE OR REPLACE VIEW × 2 (audit.v_brand_platform_audit_matrix + audit.v_publish_success_recent) | Yes (smoke test queries returned expected shape + counts; later validated by ChatGPT 2nd audit) |

## Doc commits (this phase)

| File | Purpose |
|---|---|
| docs/audit/runbook/2026-05-03-audit-runbook-v1.md | Initial runbook (later superseded) |
| docs/audit/runbook/2026-05-03-audit-runbook-v2.md (v2.0 then v2.1 patch) | Corrected runbook with v1 errors fixed; v2.1 patch added dead-rows-are-audit-trail subsection |
| docs/audit/proposals/2026-05-03-chatgpt-audit-readiness-report.md (committed earlier in session) | ChatGPT v1 proposal received |
| docs/audit/proposals/2026-05-03-chatgpt-audit-readiness-report-CHAT-REVIEW.md | Chat-side critical review |
| docs/audit/proposals/2026-05-03-chatgpt-audit-readiness-report-v2.md | ChatGPT v2 (incorporating addendum) |
| docs/00_action_list.md (v2.31 → v2.32) | Updates: audit-readiness COMPLETE; runbook v2.1; F-HISTORIC-DEAD-CLEANUP retired; T-MCP-11/12 logged |

*Author: chat. Tonight's full session arc spans this file + the prior `2026-05-03-pipeline-relief-apply-night.md`. PK approval at each major decision point.*
