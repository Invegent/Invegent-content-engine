# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-03 night Sydney session-end reconcile (v2.30 — **pipeline relief Migration 1+2 applied: 16 dead queue rows swept (NDIS-FB preserved per F-PUB-005), audit schema + 2 views created with corrected slot vocab; cap lift / Fix 3 / Fix 2 deferred; PP-FB orphan/pending finding surfaced via new audit view**). Closure budget: +0.7h this session, trailing-14-day 14.7 → 15.4h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S20)
3. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool. **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.30 application**: TWO plan-level reviews fired (`7228440f` initial pipeline-relief plan, `cee17af5` apply-level after PK revisions). Both ESCALATED partial verdict; both honoured per protocol — PK explicitly resolved option (a) on second to proceed with reduced scope. T-MCP-02 quota 18 → **20**.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~9 (B-PIPELINE-INCIDENT-REMEDIATION new P1; T-MCP-05 was P3 so unchanged from v2.29) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~15.4h (14.7h prior + 0.7h v2.30) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This bump's closure hours: ~0.7h** (state-drift verification + 2 ChatGPT D-01 reviews + 2 migrations applied + smoke tests + 4-way sync).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-03 night Sydney session-end reconcile.
> **2 migrations applied tonight.** Pipeline relief partial; structural fixes deferred.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **T05 Meta dev support contact** | **P1-urgent** | Unchanged from v2.28-v2.29. Both message variants drafted. PK fills 2 placeholders (App ID + submission date) and sends. | PK opens Meta dev support conversation using one of the two drafted variants. |
| 3 | **B-PIPELINE-INCIDENT-REMEDIATION** — deferred fixes from tonight | **P1** | 4 streams remain stalled or partially stalled (NDIS-LI 70h, CFW-LI 88h, Invegent-LI 92h though will resume tomorrow, CFW-FB 76h normal cadence). Cap lift + recovery loop patch + F-PUB-009 needed for full resolution. | Next session: (a) decide cap targets per stream (~80/100/130/30 vs alternative), (b) author + apply F-PUB-009 fix (slot.scheduled_publish_at → post_draft.scheduled_for at fill time, forward-only), (c) author + apply `m.recover_stuck_slots` patch refusing already-published-draft refills. Sequence: F-PUB-009 first, then cap lift, then recovery patch. |
| 4 | **F-AAP-007 fix — apply path** | P2 | Brief committed at f793ddbf. Carry-forward from v2.29. | Check whether night-job ran pre-flight; if yes, review pre-flight + finalise SQL + fire MCP review + apply via apply_migration + verify. |
| 5 | **B-AUDIT-CHECK5-DRIFT fix — apply path** | P3 | Brief committed at f793ddbf. Carry-forward from v2.29. | Same flow as F-AAP-007. |

**Demoted from prior Today/Next 5** (now elsewhere):
- T-MCP-05 batch closure ✅ DONE v2.29
- publish-queue-and-publish CC brief execution — still backlogged (P2, not active)

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate post-F-AAP-001 | `SELECT client_slug, platform, count(*) FILTER (WHERE approval_status='approved' AND approved_at > NOW() - INTERVAL '24 hours') AS fresh_approvals_24h FROM m.post_draft d JOIN c.client c USING (client_id) WHERE d.created_at > '2026-05-03 09:25:00'::timestamptz GROUP BY 1,2;` | **Reinstated v2.28** post-F-AAP-001 fix. Watch for sustained throughput across drain period. |
| S17 | ChatGPT Review MCP cost + idempotency rate | (per v2.25) | **v2.30 note**: 20 fires total (2 new this session: `7228440f` plan-level + `cee17af5` apply-level, both ESCALATED partial). |
| S18 | D186 closure budget (per session start) | (per v2.25) | **Currently at 15.4h trailing-14-day — well above 8.0 floor.** |
| S19 | R01 Data Auditor closure effectiveness | Read trailing-3-cycle structural closure rate from `docs/audit/open_findings.md` § "Closure effectiveness — historical" | **Currently at 28.6% (cycles 1-2 only); next cycle will be the third data point.** |
| **S21 NEW v2.30** | **Pipeline incident health** | `SELECT * FROM audit.v_publish_queue_summary WHERE status='queued' AND queue_items > 30 ORDER BY queue_items DESC;` and `SELECT * FROM audit.v_slot_health_by_client_platform WHERE failed_slots_7d > 0 OR overdue_pending_fill_slots > 0 OR orphan_filled_slots > 0;` | Watch for: queue depth changes on the 4 stalled streams; new orphan/pending findings; recovery-loop pathology spreading beyond CFW LinkedIn. |
| ~~S20~~ | ~~Operational stance retire criteria~~ | — | **RETIRED v2.28** (stance retired explicit by PK). |

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.29.

| ID | Item | Priority | Due | Owner | Next action / Done when |
|---|---|---|---|---|---|
| T02 | Gate B exit decision | — | ✅ DONE | — | Session: `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| T04 | R01 calibration session | — | ✅ DONE | — | Session: `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| **T05** | **Meta dev support contact** | **P1-urgent** | **Unblocked v2.28**. Send within next 7 days for momentum. | PK | Both message variants drafted; PK fills 2 placeholders and sends. |
| T06 | Reconnect YouTube OAuth — UNBLOCKED | P1 | Within 7 days | PK | Reconnect OAuth at user/account level |
| T07 | Instagram publisher recovery | P1 | Gated on S16 + T05 + cron `?limit=1` update | mixed | Step 4 cannot retry until ALL gates clear |
| T08–T18 | (per v2.29) | — | (per v2.29) | — | (per v2.29) |

**Workstream 1 status: COMPLETE.** **Workstream 2 status: ✅ COMPLETE.** **Phase B body-health gate: ✅ RATIFIED.** **R01 Data Auditor calibration v2: ✅ COMPLETE.** **Operational stance: ✅ RETIRED v2.28.** **B-AUDIT-V4-PEERS audit pass: ✅ COMPLETE v2.28.** **F-AAP-001 fix: ✅ CLOSED v2.28.** **F-AAP-002 fix: ✅ CLOSED v2.28.** **T-MCP-05 batch closure (5 v2.20-v2.28 review_ids): ✅ CLOSED v2.29.** **G1 sync_state restructure: COMPLETE.** **NEW v2.30: Pipeline relief Migration 1 (dead-queue sweep) + Migration 2 (audit views v1) APPLIED.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP (v2.30 update — T-MCP-02 quota at 20 of 5)

Two new fires this session:
- review_id `7228440f-1138-483b-8ee9-71876e7142e4`, action_type=`plan_review` (initial pipeline-relief plan), ESCALATED partial verdict, 3 pushback points (cap targets / stale_recovery vs pending_fill / Fix 2 in-flight side effects). Honoured per protocol — PK direction triggered scope reduction.
- review_id `cee17af5-86f7-4d99-9734-ae87556f8a85`, action_type=`plan_review` (apply-level after revisions), ESCALATED partial verdict, 3 pushback points (NDIS-FB carry-forward / view efficiency / orphan slot recovery interaction). Honoured per protocol — PK explicitly resolved option (a) to proceed with NDIS-FB exclusion + Fix 5 deferred.

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | ✅ DONE | Closed | — |
| T-MCP-02 | ✅ EXCEEDED 20 of 5 | — | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days |
| T-MCP-04 | Operationalise D-01 standing rule | P1 | Half-codified v2.17. Pending PK manual update. |
| T-MCP-05 | Close-the-loop UPDATE on 5 v2.20-v2.28 review_ids | ✅ DONE v2.29 | — |
| **T-MCP-05-NEW** | Close-the-loop UPDATE on `1bae5068-...` (fire #18) | P3 | PK confirmation required. Use `public.close_chatgpt_review` directly. |
| **T-MCP-05-NEW2 (NEW v2.30)** | Close-the-loop UPDATE on `7228440f-...` and `cee17af5-...` (fires #19, #20) | P3 | Same self-similar pattern. Two more rows accumulating for next batch closure. |
| T-MCP-06 | Investigate sql_destructive escalation rate (~50%) | P3 | **v2.30 update**: plan_review escalation rate now ~8 of 9 (very high — pattern signal). |
| T-MCP-07 | Retrospective MCP review on R01 calibration v2 | P3 | Optional. PK fires if desired. |
| T-MCP-08 | Lesson canonical: high-value MCP escalation pattern | ✅ PROMOTED v2.29 | — |
| T-MCP-09 | Lesson candidate: post-apply ACL verification for SECURITY DEFINER functions | P3 | After 1-2 more such instances, promote to canonical. |
| **T-MCP-10 (NEW v2.30)** | **Lesson candidate**: state-snapshot age ≥ 4h requires re-verification before any DML/DDL apply. State drifted in 9h between investigation and apply (10→17 dead rows; 1 stuck slot self-healed). First instance this session. | P3 | After 1-2 more such instances, promote to canonical. |

---

## 🤖 Cowork automation (D182 — v2.30)

Unchanged from v2.29. Sunset review: 12 May 2026.

**v2.30 dependency**: F-AAP-007 + B-AUDIT-CHECK5-DRIFT briefs at `docs/briefs/2026-05-04-or-later-{...}.md` are scoped for night-job pickup. Status unchanged from v2.29 (not yet picked up or applied).

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **B-PIPELINE-INCIDENT-REMEDIATION (NEW v2.30)** | Cap lift + F-PUB-009 fix + recovery loop patch | **P1** | Investigation done; partial relief applied (Migration 1+2 v2.30). Three structural items deferred. | chat → PK | See Today/Next 5 #3 for next-action detail. |
| **B-PP-FB-ORPHAN-PENDING-FILL (NEW v2.30)** | Property Pulse Facebook 1 orphan_filled_slot + 1 pending_fill_slot surfaced via `audit.v_slot_health_by_client_platform` first query | P3 | Surfaced tonight; investigation pending | chat | Query specifics: `SELECT slot_id, scheduled_publish_at, status, filled_at, filled_draft_id, skip_reason FROM m.slot WHERE client_id=...PP_id... AND platform='facebook' AND (status='pending_fill' OR (status='filled' AND filled_draft_id IS NULL))` next session. |
| F-AAP-007 | Audit Check 8 doesn't account for F-PUB-010 backpressure | P2 | brief committed at f793ddbf | chat → night-job (pre-flight) → chat (apply) | Carry-forward from v2.29. |
| B-AUDIT-CHECK5-DRIFT | Audit Check 5 vocabulary drift (`status='locked'` not in current vocab) | P3 | brief committed at f793ddbf | chat → night-job (pre-flight) → chat (apply) | Carry-forward from v2.29. |
| publish-queue-and-publish-column-purposes | New CC brief | P2 | status: ready | cc | Trigger CC with brief. Carry-forward from v2.29. |
| B-INV-LinkedIn-Queue-Stall | Investigate 5 LinkedIn × Property Pulse true-stuck drafts | P1 | investigation complete v2.20 — remediation pending PK review | chat | Findings: `docs/audit/runs/2026-05-03-fpub006-linkedin-investigation.md` |
| T-MCP-05-NEW | Close-the-loop UPDATE on `1bae5068-...` fire #18 | P3 | Self-similar to closed T-MCP-05 batch | chat → PK confirm | Use new `public.close_chatgpt_review` function directly. |
| **T-MCP-05-NEW2 (NEW v2.30)** | Close-the-loop UPDATE on `7228440f-...` + `cee17af5-...` fires #19, #20 | P3 | Same self-similar pattern as T-MCP-05-NEW; combine in next batch closure | chat → PK confirm | Combine with T-MCP-05-NEW for batch closure of 3 review_ids. |

---

## 💼 Personal businesses

*(none flagged this session — PK to confirm at next session start)*

---

## 📌 Backlog

**v2.30 additions**:

- **B-AUDIT-FRAMEWORK-PROPOSAL (P3, NEW v2.30)** — broader audit framework from ChatGPT audit-readiness report v2 (18 additional views beyond the 2 applied tonight). Adopted partially per chat-side review; remaining 18 views deferred. See `docs/audit/proposals/2026-05-03-chatgpt-audit-readiness-report-v2.md` and chat-side review at `2026-05-03-chatgpt-audit-readiness-report-CHAT-REVIEW.md`. Resurface only if specific incident-debugging needs justify a particular view.
- **B-CRON-BLOAT (P3, NEW v2.30)** — `cron.job_run_details` reportedly ~260MB total with ~217 estimated live rows. Last autovacuum 27 Jan 2026 (>3 months ago). Investigation: actual size via `pg_total_relation_size`, max return_message length, candidate retention/cleanup approach. Not affecting tonight's pipeline issue but worth addressing in low-traffic window.
- **C3 audit view rewrite (P3, NEW v2.30)** — `audit.v_brand_platform_audit_matrix` as full rewrite from scratch with extended `likely_bottleneck` enum (`approved_not_queued_cap_blocked`, `slot_pending_fill_overdue`, `slot_fill_failed`, `legacy_spread_mismatch`, etc). Original ChatGPT v1 SQL was malformed; v2 design is sound but full SQL not yet authored. ~30-45 min apply work. Pairs with B-PIPELINE-INCIDENT-REMEDIATION investigation for next session.

**Demoted from Today/Next 5 v2.30**:
- (none)

**Other backlog (carried from v2.29)**:

- **F-AAP-003 (P3)** — `m.vw_ops_pipeline_health` misleading-metric.
- **B-CRON-V3-ORPHAN (P3)** — jobid 12 hourly orphan production. Gate: B-CRON-V3-ORPHAN-READERS audit must complete first.
- **B-CRON-V3-ORPHAN-READERS (P3)** — reader-side audit on `m.digest_item` / `m.digest_run` consumers before pausing jobid 12.
- **F-AAP-004 (P3-dormant)** — `match_demand_to_canonicals` INNER JOIN through digest_item. Reachable only via paused crons 11/64/65.
- **F-AAP-005 (P3-dormant)** — `diagnose_match_pool_adequacy` + `summarise_match_pool_adequacy`. EF caller audit pending.
- **F-AAP-006 (P4-dormant)** — `cluster_digest_items_v1`.
- **F-AAP-001 dead-join cleanup** — `LEFT JOIN m.digest_run dr` is now unreferenced post-fix; cleanup-candidate.
- **B-AUDIT-CYCLE3** — Cycle 3 R01 Data Auditor run.
- **F-PUB-008** — NDIS-Yarns FB publishes with NULL platform_post_id (P2).
- **F-PUB-009 (NOTE: now SUBSUMED into B-PIPELINE-INCIDENT-REMEDIATION P1)** — legacy `get_next_scheduled_for` overrides slot intent. Was P3 in v2.29; promoted via B-PIPELINE-INCIDENT-REMEDIATION as the structural fix needed alongside cap lift.
- **B-INV-LinkedIn-PhantomPublishes** — Daily phantom 00:00 UTC PP-LinkedIn publishes (P2).
- **B39** — Drain over-cap queues (P3, by design).

---

## 🧊 Frozen / Deferred

Unchanged from v2.20.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, third vindication v2.15)
- Lesson #51 (HONOURED v2.30 twelfth — pre-flight discipline applied to dead-queue-sweep + audit views work, schema lookup + status vocab check + state drift verification before applying)
- Lesson #58 candidate, #59 candidate, #60 candidate
- Lesson #61 PROMOTED canonical (REINFORCED v2.25, seventh vindication)
- Lesson #62 type-(c) APPLIED v2.28 (F-AAP-002), distinguished from type-(a) v2.29 (T-MCP-05 plan_review). Framework working as designed. **v2.30 reinforced**: applied to two ChatGPT escalations tonight (`7228440f`, `cee17af5`); strong/medium/weak classification held — NDIS-FB exclusion (strong) actioned, view efficiency (weak) declined.
- G1 sync_state restructure (v2.23) — honoured through v2.30
- Lessons #40, #41, #42 promoted candidate → canonical (R01 calibration v2 v2.25)
- T-MCP-08 PROMOTED canonical v2.29
- T-MCP-09 NEW lesson candidate v2.29: post-apply ACL verification
- **T-MCP-10 NEW lesson candidate v2.30**: state-snapshot age ≥ 4h requires re-verification before any DML/DDL apply. First instance this session (10→17 dead rows + 1 stuck slot self-healed in 9h gap between investigation and apply).

---

## v2.30 honest limitations

- All v2.29 limitations apply.
- **Cap math error caught only at apply time**, not in initial proposal. cap=30 was approved by PK based on flawed reasoning ("14-day buffer at 1/day cadence") that didn't account for current queue depth on over-cap streams. Self-correction triggered before any apply, but discipline says this should have been caught earlier.
- **State drift between investigation and apply** highlighted: 9h gap is enough for cron-driven state changes (recovery loop self-healing slots, dead row accumulation). Going forward, sub-1h gap or fresh re-verification immediately before apply is preferred. **T-MCP-10 lesson candidate**.
- **PP-FB orphan + pending_fill finding** surfaced incidentally on first audit view query. Suggests there may be more such pathologies across (client, platform) combos that ad-hoc SQL has been missing. Worth integrating audit views into nightly health check.
- **CFW Website 318h dead** still uninvestigated (logged in v2.29 honest limitations; not addressed tonight). WordPress publisher (jobid 55) running normally per cron status; cause of inactivity unclear.
- **The 4 CFW LinkedIn `marked_failed` slots** remain quiescent. Without Fix 3 (recovery loop function patch), the recovery loop COULD theoretically re-engage if slot state drifted. Watching via S21 standing check.
- **2 ChatGPT escalations consecutive on related plans** indicates either: (a) review tool calibration is conservative, (b) plans were genuinely under-developed, or (c) escalation pattern correlates with PK-decision-required scope. Worth tracking. T-MCP-06 question gains evidence.

---

## Changelog

- v1.0–2.29: per previous changelog.
- **v2.30 (3 May Sunday night Sydney session-end reconcile): Pipeline relief Migration 1+2 applied; cap lift / Fix 3 / Fix 2 deferred; PP-FB finding surfaced.**
  - **End-to-end pipeline investigation** triggered by PK observation of 4 stalled streams. Three structural issues identified: F-AAP-001 backfill avalanche × F-PUB-010 cap collision × F-PUB-009 legacy spread. Plus CFW LinkedIn recovery-loop pathology ×4 evidenced. Plus 17 stale dead queue rows.
  - **ChatGPT audit-readiness report v1 received** mid-session; chat-side critical review identified 5 material errors (slot vocab mismatch, malformed SQL, post_seed misdiagnosis, incident misframing, infrastructure duplication). Recommended partial adoption (3-4 corrected views).
  - **ChatGPT audit-readiness report v2 received** incorporating the 5 corrections + addendum. Adoption plan firmed: M1 (relief sweep) + M2 (2 corrected audit views) tonight; remaining views deferred to backlog.
  - **Two D-01 ESCALATED reviews** (`7228440f` plan-level, `cee17af5` apply-level), both honoured per protocol. Strong/medium/weak classification held; NDIS-FB exclusion actioned; Fix 5 orphan slot deferred for safety.
  - **State drift caught at apply time**: dead rows 10→17, Invegent-LI stuck pending_fill self-healed. Math error in cap=30 also caught at apply time — cap lift deferred entirely to next session.
  - **Migration 1 v2** (`pipeline_relief_dead_queue_sweep_v2`) APPLIED: 16 rows deleted (12 PP-FB + 4 CFW-IG; 1 NDIS-FB preserved per F-PUB-005 carry-forward). v1 attempt failed on `m.system_audit_log.triggered_by` check constraint; v2 used `manual` and succeeded. Audit log row recorded.
  - **Migration 2** (`audit_schema_and_views_v1`) APPLIED: schema `audit` + `audit.v_publish_queue_summary` + `audit.v_slot_health_by_client_platform` (with CORRECTED slot status vocab `filled|future|failed|pending_fill` and new `orphan_filled_slots` column).
  - **First audit view query surfaced new finding**: PP-FB has 1 orphan_filled_slot + 1 pending_fill_slot — not in tonight's original diagnosis. Logged as `B-PP-FB-ORPHAN-PENDING-FILL P3`.
  - **Today/Next 5 rebuilt**: rank 1 personal businesses; rank 2 T05 P1-urgent; rank 3 B-PIPELINE-INCIDENT-REMEDIATION P1 (deferred fixes); rank 4 F-AAP-007; rank 5 B-AUDIT-CHECK5-DRIFT.
  - **NEW backlog items**: B-AUDIT-FRAMEWORK-PROPOSAL P3, B-CRON-BLOAT P3, C3 audit view rewrite P3.
  - **NEW lesson candidate T-MCP-10**: state-snapshot age ≥ 4h requires re-verification before any DML/DDL apply.
  - **NEW Standing check S21**: pipeline incident health via the 2 audit views.
  - **T-MCP-02 quota**: 18 → 20.
  - **Closure budget**: +0.7h. Trailing-14-day 14.7 → 15.4h. Above 8.0 floor.
  - **2 DDL applied** via apply_migration. **NO production DML beyond the bounded sweep + audit log insert.**
- v2.29 (3 May Sunday late evening Sydney): T-MCP-05 batch closed end-to-end + post-apply ACL gap surfaced + closed via break-glass.
- v2.28 (3 May evening Sydney): Stance retired explicit + F-AAP-001 + F-AAP-002 applied + B-AUDIT-V4-PEERS clean.
- v2.27 (3 May late-afternoon Sydney): F-PUB-005 V3-V5 PASS + B-INV-CFW-Invegent-Silent-Approver resolved.
- v2.26–v2.15: per prior changelog.
