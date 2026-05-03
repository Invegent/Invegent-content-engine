# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-03 night Sydney session-end reconcile (v2.31 — **runbook v2 committed; F-INVESTIGATE-DRAFT-NOT-FOUND closed; B-WORKER-LOG-GAP + F-HISTORIC-DEAD-CLEANUP added to backlog; T-MCP-11 lesson candidate logged**). Closure budget: +2.0h this session (Migration 1+2 + audit-readiness completion + runbook v2), trailing-14-day 14.7 → ~16.7h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S21)
3. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool. **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.31 application**: 3 plan-level reviews fired this session (`7228440f`, `cee17af5`, `648ae6a4`), all ESCALATED partial verdict, all honoured per protocol. T-MCP-02 quota 18 → **21**.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~9 (B-PIPELINE-INCIDENT-REMEDIATION P1 ongoing; T-MCP-05-NEW/2 P3 unchanged) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~16.7h (15.4h post-relief + 1.3h audit-readiness completion) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~2.0h** (state-drift verification + 3 ChatGPT D-01 reviews + 3 migrations applied + smoke tests + investigation + runbook v2 + 4-way sync).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-03 night Sydney session-end reconcile (v2.31).
> **Tonight: 3 migrations applied + runbook v1+v2 committed + audit-readiness COMPLETE.** Pipeline relief partial; structural fixes + historic dead cleanup deferred.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **T05 Meta dev support contact** | **P1-urgent** | Unchanged from v2.28-v2.30. Both message variants drafted. PK fills 2 placeholders (App ID + submission date) and sends. | PK opens Meta dev support conversation using one of the two drafted variants. |
| 3 | **B-PIPELINE-INCIDENT-REMEDIATION** — deferred fixes from tonight | **P1** | 4 streams remain partially stalled (NDIS-LI, CFW-LI, PP cap-blocked streams). Cap lift + recovery loop patch + F-PUB-009 needed. | Next session: (a) decide cap targets per stream (~80/100/130/30 vs alternative), (b) author + apply F-PUB-009 fix (forward-only), (c) author + apply `m.recover_stuck_slots` patch refusing already-published-draft refills. Sequence: F-PUB-009 first → cap lift → Fix 3. Pair with F-HISTORIC-DEAD-CLEANUP for queue hygiene. |
| 4 | **F-AAP-007 fix — apply path** | P2 | Brief committed at f793ddbf. Carry-forward from v2.29-v2.30. | Check whether night-job ran pre-flight; if yes, review pre-flight + finalise SQL + fire MCP review + apply via apply_migration + verify. |
| 5 | **B-AUDIT-CHECK5-DRIFT fix — apply path** | P3 | Brief committed at f793ddbf. Carry-forward. | Same flow as F-AAP-007. |

**Demoted from prior Today/Next 5** (now elsewhere):
- C3 audit view rewrite ✅ DONE v2.31 (`audit.v_brand_platform_audit_matrix` applied)
- F-INVESTIGATE-DRAFT-NOT-FOUND ✅ DONE v2.31 (5 rows = unrecoverable orphans, bundled into F-HISTORIC-DEAD-CLEANUP)
- F-RUNBOOK-V2 ✅ DONE v2.31

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate post-F-AAP-001 | `SELECT client_slug, platform, count(*) FILTER (WHERE approval_status='approved' AND approved_at > NOW() - INTERVAL '24 hours') AS fresh_approvals_24h FROM m.post_draft d JOIN c.client c USING (client_id) WHERE d.created_at > '2026-05-03 09:25:00'::timestamptz GROUP BY 1,2;` | **Reinstated v2.28** post-F-AAP-001 fix. Watch for sustained throughput across drain period. |
| S17 | ChatGPT Review MCP cost + idempotency rate | (per v2.25) | **v2.31 note**: 21 fires total (3 new this session). All 3 ESCALATED, all honoured per protocol. |
| S18 | D186 closure budget (per session start) | (per v2.25) | **Currently at ~16.7h trailing-14-day — well above 8.0 floor.** |
| S19 | R01 Data Auditor closure effectiveness | (per v2.30) | (per v2.30) |
| S21 | **Pipeline incident health** | `SELECT * FROM audit.v_brand_platform_audit_matrix ORDER BY CASE likely_bottleneck WHEN 'ok_or_recently_active' THEN 99 ELSE 1 END, client_slug, platform;` (per runbook v2 Step 3) | Watch for: `likely_bottleneck` changes per stream; new orphan/pending findings; recovery-loop pathology spreading beyond CFW LinkedIn. |
| **S22 NEW v2.31** | **Cron heartbeat health** | `SELECT jobname, status, minutes_since_last, consecutive_misses FROM m.cron_health_status WHERE status != 'green';` | Empty result = all crons healthy. Vocabulary: column is `status text` with values like `'green'`. NOT a boolean `is_healthy`. |

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.30.

| ID | Item | Priority | Due | Owner | Next action / Done when |
|---|---|---|---|---|---|
| T05 | **Meta dev support contact** | **P1-urgent** | Unblocked v2.28; send within next 7 days for momentum | PK | Both message variants drafted; PK fills 2 placeholders and sends |
| T06 | Reconnect YouTube OAuth — UNBLOCKED | P1 | Within 7 days | PK | Reconnect OAuth at user/account level |
| T07 | Instagram publisher recovery | P1 | Gated on S16 + T05 + cron `?limit=1` update | mixed | Step 4 cannot retry until ALL gates clear |
| (others) | per v2.30 | — | per v2.30 | — | per v2.30 |

**v2.31 status delta**: **Audit-readiness for ChatGPT free audit ✅ COMPLETE.** Runbook v2 corrects v1's verified errors and is ready for autonomous third-party use.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (v2.31 update — T-MCP-02 quota at 21 of 5)

Three fires this session (all ESCALATED):
- review_id `7228440f-...` (initial pipeline-relief plan)
- review_id `cee17af5-...` (apply-level after revisions)
- review_id `648ae6a4-...` (audit views v2 plan)

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | ✅ DONE | Closed | — |
| T-MCP-02 | ✅ EXCEEDED 21 of 5 | — | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days |
| T-MCP-04 | Operationalise D-01 standing rule | P1 | Half-codified v2.17. Pending PK manual update. |
| T-MCP-05 | Close-the-loop UPDATE on 5 v2.20-v2.28 review_ids | ✅ DONE v2.29 | — |
| T-MCP-05-NEW | Close-the-loop UPDATE on `1bae5068-...` (fire #18) | P3 | PK confirmation required. Use `public.close_chatgpt_review` directly. |
| T-MCP-05-NEW2 | Close-the-loop UPDATE on `7228440f-...`, `cee17af5-...`, **`648ae6a4-...` (added v2.31)** | P3 | Same self-similar pattern; combine in next batch closure of 4 review_ids total |
| T-MCP-06 | Investigate sql_destructive escalation rate (~50%) | P3 | **v2.31 update**: plan_review escalation rate now 9 of 10 (90%) — strong pattern signal |
| T-MCP-08 | Lesson canonical: high-value MCP escalation pattern | ✅ PROMOTED v2.29 | — |
| T-MCP-09 | Lesson candidate: post-apply ACL verification for SECURITY DEFINER functions | P3 | After 1-2 more such instances, promote to canonical. |
| T-MCP-10 | Lesson candidate: state-snapshot age ≥ 4h requires re-verification before any DML/DDL apply | P3 | Logged v2.30. After 1-2 more such instances, promote to canonical. |
| **T-MCP-11 NEW v2.31** | **Lesson candidate**: Pre-flight discipline includes verifying log/health tables actually contain the data assumed. Table existence ≠ table populated. Verify column names against `information_schema` before using in runbook examples. Caught this session: runbook v1 referenced `m.worker_http_log` (only logs cron_jobid 5 with NULL status_code) and predicate `WHERE NOT is_healthy` (column doesn't exist; actual is `status text` with value `'green'`). | P3 | After 1-2 more such instances, promote to canonical. |

---

## 🤖 Cowork automation (D182)

Unchanged from v2.30. Sunset review: 12 May 2026.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **B-PIPELINE-INCIDENT-REMEDIATION** | Cap lift + F-PUB-009 fix + recovery loop patch | **P1** | Investigation done; partial relief applied. Three structural items deferred. | chat → PK | See Today/Next 5 #3 for next-action detail. |
| **B-PP-FB-ORPHAN-PENDING-FILL** | PP Facebook 1 orphan + 1 pending_fill (surfaced via audit view) | P3 | Surfaced v2.30; still pending | chat | Investigation query in v2.30 |
| F-AAP-007 | Audit Check 8 doesn't account for F-PUB-010 backpressure | P2 | brief committed at f793ddbf | chat → night-job (pre-flight) → chat (apply) | Carry-forward |
| B-AUDIT-CHECK5-DRIFT | Audit Check 5 vocabulary drift | P3 | brief committed at f793ddbf | chat → night-job (pre-flight) → chat (apply) | Carry-forward |
| publish-queue-and-publish-column-purposes | New CC brief | P2 | status: ready | cc | Trigger CC with brief |
| B-INV-LinkedIn-Queue-Stall | 5 LinkedIn × Property Pulse true-stuck drafts | P1 | investigation complete v2.20 — remediation pending PK review | chat | Findings: `docs/audit/runs/2026-05-03-fpub006-linkedin-investigation.md` |
| T-MCP-05-NEW | Close-the-loop on `1bae5068-...` | P3 | Self-similar | chat → PK confirm | Use `public.close_chatgpt_review` directly |
| T-MCP-05-NEW2 | Close-the-loop on 3 review_ids (v2.30 + v2.31) | P3 | Same pattern | chat → PK confirm | Combine in next batch closure (4 total: 1bae5068 + 7228440f + cee17af5 + 648ae6a4) |

---

## 💼 Personal businesses

*(none flagged this session — PK to confirm at next session start)*

---

## 📌 Backlog

**v2.31 additions**:

- **B-WORKER-LOG-GAP (P3, NEW v2.31)** — `m.worker_http_log` only captures cron_jobid 5 (ai-worker, 288 rows/24h) and even those rows have NULL `status_code`. Other publisher crons (jobid 7, 34, 53, 54, 55) not instrumented. Decision needed: (a) deprecate `m.worker_http_log` in favour of `net._http_response` + `m.post_publish` for observability (recommended), OR (b) fix instrumentation so all publisher crons write status_code properly. Runbook v2 already removes `worker_http_log` references in favour of `net._http_response` aggregate + `m.post_publish` outcome verification.

- **F-HISTORIC-DEAD-CLEANUP (P3, NEW v2.31)** — 45 historic dead queue rows pending hygiene sweep with explicit row-list discipline:
  - 40 rows from 2026-04-22 with NULL `last_error` (pre-existing, unrelated to tonight's incident)
  - 5 rows with `post_draft_not_found` error (4 from 2026-05-03 + 1 from 2026-04-01 with 734 attempt_count); all 5 verified as unrecoverable orphans (drafts gone, never published, no slot references) — see investigation in v2.31 session work
  - 1 NDIS-FB row preserved per F-PUB-005 carry-forward (do not sweep)
  - Selection rule must be explicit per row-list discipline section in runbook v2.
  - Pair with B-PIPELINE-INCIDENT-REMEDIATION next session for queue hygiene.

**Demoted to DONE v2.31**:
- C3 audit view rewrite ✅ DONE (`audit.v_brand_platform_audit_matrix` applied via Migration 3)
- F-INVESTIGATE-DRAFT-NOT-FOUND ✅ DONE (5 rows verified as unrecoverable orphans, bundled into F-HISTORIC-DEAD-CLEANUP)
- F-RUNBOOK-V2 ✅ DONE (corrects 4 verified v1 errors caught by ChatGPT external audit)

**Other backlog (carried from v2.30)**:
- **B-AUDIT-FRAMEWORK-PROPOSAL (P3)** — 18 additional views from ChatGPT proposal v2 (deferred)
- **B-CRON-BLOAT (P3)** — `cron.job_run_details` ~260MB suspected bloat
- **F-AAP-003 (P3)** — misleading metric in `m.vw_ops_pipeline_health`
- **B-CRON-V3-ORPHAN (P3)** + **B-CRON-V3-ORPHAN-READERS (P3)**
- **F-AAP-004/005/006 (P3-P4 dormant)**
- **F-AAP-001 dead-join cleanup**
- **B-AUDIT-CYCLE3**
- **F-PUB-008** — NULL platform_post_id (P2)
- **B-INV-LinkedIn-PhantomPublishes** (P2)
- **B39** — Drain over-cap queues (P3, by design)

---

## 🧊 Frozen / Deferred

Unchanged from v2.20.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, third vindication v2.15)
- Lesson #51 (HONOURED v2.31 thirteenth — pre-flight discipline applied to runbook v2 (verifying every example query against live DB before committing))
- Lesson #58 candidate, #59 candidate, #60 candidate
- Lesson #61 PROMOTED canonical (REINFORCED v2.25, seventh vindication)
- Lesson #62 type-(c) APPLIED v2.28 (F-AAP-002), distinguished from type-(a) v2.29 (T-MCP-05 plan_review). **v2.31 reinforced**: applied to ChatGPT escalation `648ae6a4` (3 pushback points classified weak/medium/weak; cost-of-waiting reasoning held).
- G1 sync_state restructure (v2.23) — honoured through v2.31
- Lessons #40, #41, #42 promoted candidate → canonical (R01 calibration v2 v2.25)
- T-MCP-08 PROMOTED canonical v2.29
- T-MCP-09 NEW lesson candidate v2.29: post-apply ACL verification
- T-MCP-10 NEW lesson candidate v2.30: state-snapshot age ≥ 4h requires re-verification before any DML/DDL
- **T-MCP-11 NEW lesson candidate v2.31**: pre-flight verification of log/health table population + column existence (table existence ≠ table populated; column references must be schema-verified)

---

## v2.31 honest limitations

- All v2.30 limitations apply.
- **Runbook v1 had 4 verified errors** caught by ChatGPT external audit. Severity: would have produced incorrect or null query results, NOT data corruption. But still a quality failure on initial doc — the very first thing a third-party auditor would have done is hit these errors. Now corrected in v2.
- **net._http_response cannot attribute calls to specific publisher** (no URL column; `http_request_queue` is empty / drain-on-process). Aggregate health is verifiable; per-publisher attribution requires the outcome table (`m.post_publish`). Documented in runbook v2.
- **3 ChatGPT escalations consecutive on related plans** today (T-MCP-06 evidence accumulating to 90% plan_review escalation rate). Worth tracking. May indicate plans are PK-decision-required scope by nature, or that review tool calibration is conservative.
- **PK has been working long hours tonight.** Multiple sessions since morning. Operator fatigue risk increases probability of miss-classification or over-application of fixes. Watching for fatigue signals.

---

## Changelog

- v1.0–2.30: per previous changelog.
- **v2.31 (3 May Sunday late-night Sydney session-end reconcile, post-audit-readiness completion):**
  - **Migration 3** (`audit_views_v2_matrix_and_success`) APPLIED: `audit.v_brand_platform_audit_matrix` (one row per active client/platform with `likely_bottleneck` enum) + `audit.v_publish_success_recent` (proof-of-published 14d window). 14 matrix rows produced; classifications validated against tonight's incident diagnosis.
  - **Audit-readiness COMPLETE**: 4 audit views in place (`v_publish_queue_summary`, `v_slot_health_by_client_platform`, `v_brand_platform_audit_matrix`, `v_publish_success_recent`). ChatGPT can now run autonomous audits per runbook.
  - **ChatGPT external audit ran against runbook v1 and exposed 4 verified errors**: (1) `m.worker_http_log` only captures cron_jobid 5 with NULL status_code (broken instrumentation), (2) `WHERE NOT is_healthy` predicate fails (column is `status text` with value `'green'`), (3) Fix 4 sweep selection was narrower than the broader picture (47 dead rows total post-sweep, not just 16), (4) cap=30 wouldn't unblock streams already at 50-105 queued.
  - **Runbook v2 committed** at `docs/audit/runbook/2026-05-03-audit-runbook-v2.md` with all 4 corrections + publisher cron jobid reference table (jobid 7/34/53/54/55) + row-list discipline section + every example query re-verified against live DB.
  - **F-INVESTIGATE-DRAFT-NOT-FOUND CLOSED**: 5 dead queue rows with `post_draft_not_found` error verified as unrecoverable orphans (drafts gone, never published, no slot references). 4 from 2026-05-03 (likely earlier sweep), 1 from 2026-04-01 (734 attempt_count, much older). Bundled into F-HISTORIC-DEAD-CLEANUP for next session.
  - **NEW backlog**: B-WORKER-LOG-GAP P3 (instrumentation gap; recommend deprecating worker_http_log), F-HISTORIC-DEAD-CLEANUP P3 (45 dead rows for selection-rule disciplined sweep next session).
  - **NEW lesson candidate T-MCP-11**: pre-flight discipline includes verifying log/health table actually contains the data assumed; table existence ≠ table populated; column references must be schema-verified before runbook examples reference them.
  - **NEW Standing check S22**: cron heartbeat health via `m.cron_health_status WHERE status != 'green'` (correct vocabulary).
  - **T-MCP-02 quota**: 20 → 21. T-MCP-05-NEW2 batch grows to 4 review_ids: `1bae5068`, `7228440f`, `cee17af5`, `648ae6a4`.
  - **Closure budget**: ~1.3h this audit-readiness completion phase + ~0.7h Migration 1+2 phase = ~2.0h total this session. Trailing-14d 14.7 → ~16.7h. Above 8.0 floor.
  - **3 DDL applied** via apply_migration this session. 1 doc commit (runbook v2).
- v2.30 (3 May Sunday night Sydney): pipeline relief Migration 1+2 applied; cap lift / Fix 3 / Fix 2 deferred.
- v2.29 (3 May Sunday late evening Sydney): T-MCP-05 batch closed end-to-end + post-apply ACL gap surfaced + closed via break-glass.
- v2.28 (3 May evening Sydney): Stance retired explicit + F-AAP-001 + F-AAP-002 applied + B-AUDIT-V4-PEERS clean.
- v2.27 (3 May late-afternoon Sydney): F-PUB-005 V3-V5 PASS + B-INV-CFW-Invegent-Silent-Approver resolved.
- v2.26–v2.15: per prior changelog.
