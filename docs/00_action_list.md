# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-03 late night Sydney session-end reconcile (v2.32 — **runbook v2 → v2.1 patch (dead-rows-are-audit-trail clarification); F-HISTORIC-DEAD-CLEANUP RETIRED as miscategorised; F-INVESTIGATE-DRAFT-NOT-FOUND closure note corrected; T-MCP-12 lesson candidate logged**). Closure budget: +2.25h this session, trailing-14-day 14.7 → ~17.0h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S22)
3. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool. **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.32 application**: 3 plan-level reviews fired this session total; v2.32 doc-only updates following second external ChatGPT audit verification did NOT require a 4th D-01 fire (corrective doc updates following external review verification do not qualify as "production patch"). T-MCP-02 quota remains **21**.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~9 (B-PIPELINE-INCIDENT-REMEDIATION P1 ongoing) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~17.0h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~2.25h** (Migration 1+2 + audit-readiness completion + runbook v2 + ChatGPT 2nd audit response + runbook v2.1 patch).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-03 late night Sydney session-end reconcile (v2.32).
> **Tonight: 3 migrations applied + runbook v1→v2→v2.1 + ChatGPT 2nd external audit validated v2 work.** Pipeline is producing publishes (9 FB + 5 LI in last 48h per ChatGPT audit). Structural fixes deferred to next session.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **T05 Meta dev support contact** | **P1-urgent** | Unchanged | PK fills 2 placeholders and sends |
| 3 | **B-PIPELINE-INCIDENT-REMEDIATION** — deferred fixes | **P1** | 4 cap-blocked streams + 2 CFW slot_fill_failed streams remain. ChatGPT 2nd audit confirms PP-FB drained from cap-blocked → slot_orphan_filled (healthy progression). | Next session: (a) cap targets, (b) F-PUB-009 fix forward-only, (c) `m.recover_stuck_slots` patch. Sequence: F-PUB-009 first → cap lift → Fix 3. |
| 4 | **F-AAP-007 fix — apply path** | P2 | Brief committed at f793ddbf | Carry-forward |
| 5 | **B-AUDIT-CHECK5-DRIFT fix — apply path** | P3 | Brief committed at f793ddbf | Carry-forward |

**Demoted from prior Today/Next 5 in v2.31→v2.32 cycle:**
- C3 audit view rewrite ✅ DONE v2.31
- F-INVESTIGATE-DRAFT-NOT-FOUND ✅ DONE v2.31 (and clarified v2.32 — no new pattern, was already correctly handled by F-PUB-006 sweep with dead_reason annotation)
- F-RUNBOOK-V2 ✅ DONE v2.31 (→ v2.1 patch v2.32)
- F-HISTORIC-DEAD-CLEANUP **RETIRED v2.32 as miscategorised** — see backlog notes

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate | (per v2.30) | (per v2.30) |
| S17 | ChatGPT Review MCP cost + idempotency rate | (per v2.25) | **v2.32 note**: 21 fires total (3 this session + 18 historical). Plan_review escalation rate now 9 of 10 (90%) — strong T-MCP-06 signal. |
| S18 | D186 closure budget (per session start) | (per v2.25) | **Currently at ~17.0h trailing-14-day — well above 8.0 floor.** |
| S19 | R01 Data Auditor closure effectiveness | (per v2.30) | (per v2.30) |
| S21 | Pipeline incident health | `SELECT * FROM audit.v_brand_platform_audit_matrix ORDER BY CASE likely_bottleneck WHEN 'ok_or_recently_active' THEN 99 ELSE 1 END, client_slug, platform;` | Watch for: classification shifts (e.g. tonight's PP-FB cap_blocked → slot_orphan_filled is healthy progression). |
| S22 | Cron heartbeat health | `SELECT jobname, status, minutes_since_last, consecutive_misses FROM m.cron_health_status WHERE status != 'green';` | Empty result = all crons healthy. Vocabulary: `status text` with values like `'green'`. |

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.31.

**v2.32 status delta**: **Audit-readiness for ChatGPT free audit ✅ COMPLETE & EXTERNALLY VALIDATED.** Two ChatGPT external audits this session: (1) audit run against runbook v1 found 4 errors which were corrected in v2; (2) audit run against runbook v2 substantively validated all corrections + surfaced one nuance (dead_reason column) which was incorporated into v2.1 patch.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 21 of 5)

Unchanged from v2.31. v2.32 doc-only updates did not require additional D-01 fires.

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | ✅ DONE | Closed | — |
| T-MCP-02 | ✅ EXCEEDED 21 of 5 | — | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days |
| T-MCP-04 | Operationalise D-01 standing rule | P1 | Half-codified v2.17 |
| T-MCP-05 | ✅ DONE v2.29 | — | — |
| T-MCP-05-NEW | Close-the-loop UPDATE on `1bae5068-...` | P3 | PK confirm |
| T-MCP-05-NEW2 | Close-the-loop UPDATE on 3 review_ids | P3 | Combine in next batch closure (4 total) |
| T-MCP-06 | Investigate plan_review escalation rate (~90%) | P3 | **v2.32 strong signal**: 9 of 10 plan_reviews escalated. May indicate plans inherently PK-decision-required scope. |
| T-MCP-08 | ✅ PROMOTED canonical v2.29 | — | — |
| T-MCP-09 | Lesson candidate: post-apply ACL verification | P3 | After 1-2 more instances |
| T-MCP-10 | Lesson candidate: state-snapshot age ≥ 4h re-verification | P3 | After 1-2 more instances |
| T-MCP-11 | Lesson candidate: pre-flight discipline includes verifying log/health table actually contains data assumed | P3 | After 1-2 more instances |
| **T-MCP-12 NEW v2.32** | **Lesson candidate**: when verifying claims about table contents, query EVERY annotation column (last_error, dead_reason, skip_reason, fail_reason, etc.) not just the most obvious one. ChatGPT's 2nd audit caught my dead-row miscategorisation by checking dead_reason which I didn't query in v2.31 verification. Reinforces T-MCP-11. | P3 | After 1-2 more instances; bundle with T-MCP-11 for promotion. |

---

## 🤖 Cowork automation (D182)

Unchanged from v2.30. Sunset review: 12 May 2026.

---

## 🟡 Active

Unchanged from v2.31 except:

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **B-PIPELINE-INCIDENT-REMEDIATION** | Cap lift + F-PUB-009 fix + recovery loop patch | **P1** | **v2.32 update**: ChatGPT 2nd audit confirms pipeline producing 9 FB + 5 LI publishes in last 48h. PP-FB drained cap_blocked → slot_orphan_filled (healthy). Structural fixes still deferred but pipeline is healthier than the morning state. | chat → PK | See Today/Next 5 #3 |
| (others) | per v2.31 | — | — | — | per v2.31 |

---

## 💼 Personal businesses

*(none flagged — PK to confirm at next session start)*

---

## 📌 Backlog

**v2.32 changes**:

- **F-HISTORIC-DEAD-CLEANUP** — **RETIRED as miscategorised**. The 47 dead queue rows all carry explicit `dead_reason` annotations (`m8_m11_bloat_window_2026-04-17`, `pre_m8_stale_2026-04-09`, `post_draft_not_found_orphan_F-PUB-006_2026-05-03`, `F-PUB-005_premature_enqueue_unblocks_F-PUB-006_2026-05-03`, hand-typed prose for the 734-attempt March row). Per Phase 1.7 Dead Letter Queue design principle (`docs/05_risks.md`): **"Dead items are never deleted — they are an audit trail."** ChatGPT's 2nd external audit surfaced the `dead_reason` column which v2.31 verification missed. The dead rows are functioning as designed. No cleanup is appropriate.

- **F-INVESTIGATE-DRAFT-NOT-FOUND** — closure note refined. The 5 dead `post_draft_not_found` rows were not a "new pattern" — they were already correctly swept by an earlier F-PUB-006 process with `dead_reason='post_draft_not_found_orphan_F-PUB-006_2026-05-03'`. Audit trail intact. No further action.

**Carried from v2.31**:

- **B-WORKER-LOG-GAP (P3)** — instrumentation gap. Recommend deprecate `m.worker_http_log` in favour of `net._http_response`.
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
- **B-PP-FB-ORPHAN-PENDING-FILL (P3)** — PP Facebook 1 orphan + 1 pending_fill (NOTE: ChatGPT 2nd audit confirms still present — 1 orphan slot still blocking PP-FB classification)

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, third vindication v2.15)
- Lesson #51 (HONOURED v2.32 fourteenth — verified `dead_reason` against live DB before applying corrections; would have repeated my v2.31 error if I'd just trusted ChatGPT's claim of "40 NULL-error" without re-verifying — actual was 47 with dead_reason populated)
- Lesson #58 candidate, #59 candidate, #60 candidate
- Lesson #61 PROMOTED canonical (REINFORCED v2.25, seventh vindication)
- Lesson #62 type-(c) APPLIED v2.28; v2.32 reinforced (3 ChatGPT escalations classified weak/medium/weak; cost-of-waiting reasoning held all session)
- G1 sync_state restructure (v2.23) — honoured through v2.32
- Lessons #40, #41, #42 promoted canonical (R01 calibration v2 v2.25)
- T-MCP-08 PROMOTED canonical v2.29
- T-MCP-09 lesson candidate: post-apply ACL verification (since v2.29)
- T-MCP-10 lesson candidate: state-snapshot age ≥ 4h re-verification (since v2.30)
- T-MCP-11 lesson candidate: pre-flight discipline includes verifying log/health tables actually contain data (since v2.31)
- **T-MCP-12 NEW lesson candidate v2.32**: query EVERY annotation column when verifying table contents — not just last_error but also dead_reason, skip_reason, fail_reason, etc. ChatGPT's 2nd audit caught a column I didn't query.
- **Meta-pattern (3-tier validation, v2.32)**: high-stakes documentation should pass through (1) author publishes, (2) external audit runs against doc, (3) author re-verifies external findings against ground truth. Tonight ran all 3 tiers; (3) caught one more nuance beyond what (2) found. Worth promoting to canonical after 1-2 more applications.

---

## v2.32 honest limitations

- All v2.31 limitations apply.
- **My v2.31 verification missed the dead_reason column.** I queried `last_error` patterns but didn't query `dead_reason`. Pattern signal: when verifying table state, scan ALL annotation columns. T-MCP-12 captures this.
- **F-HISTORIC-DEAD-CLEANUP miscategorisation** would have been caught earlier had I read `docs/05_risks.md` Phase 1.7 design principle ("Dead items are never deleted — they are an audit trail") with the dead-row analysis. Memory miss — the principle was in scope but didn't surface during F-INVESTIGATE-DRAFT-NOT-FOUND framing.
- **3 ChatGPT escalations + 2 ChatGPT external audits in one session** — unprecedented validation density. Suggests audit-infrastructure work in particular benefits from external pressure. Track this for future audit-infrastructure work.
- **Operator fatigue** — PK has been operating across multiple long sessions today. Tonight's late-night work continuing past midnight Sydney. Watching for signs that scope should be hard-capped on coming sessions.

---

## Changelog

- v1.0–2.31: per previous changelog.
- **v2.32 (3 May Sunday late-night Sydney, post-2nd-ChatGPT-external-audit reconcile):**
  - **ChatGPT 2nd external audit** ran against runbook v2 and substantively validated all 4 v2 corrections + audit views + matrix classifications. Surfaced one new nuance: the `dead_reason` column (which v2.31 verification didn't query) shows every dead row already carries an explicit annotation.
  - **F-HISTORIC-DEAD-CLEANUP RETIRED as miscategorised**. Per Phase 1.7 Dead Letter Queue design principle (`docs/05_risks.md`): "Dead items are never deleted — they are an audit trail." The 47 dead rows are functioning as designed.
  - **Runbook v2 → v2.1 patch** committed at `docs/audit/runbook/2026-05-03-audit-runbook-v2.md`: added "Dead rows are audit trail" subsection + refined `publish_queue_failed_or_dead` severity guidance (annotated = INFO; unannotated = P2 investigate) + refined drill-down query to surface `dead_reason`.
  - **F-INVESTIGATE-DRAFT-NOT-FOUND closure note refined**: 5 rows were not a "new pattern", they were correctly handled by an earlier F-PUB-006 sweep with `dead_reason='post_draft_not_found_orphan_F-PUB-006_2026-05-03'`.
  - **NEW lesson candidate T-MCP-12**: query every annotation column when verifying table contents.
  - **NEW canonical-meta-pattern candidate**: 3-tier validation (author → external audit → author re-verifies external findings against ground truth) caught one more nuance beyond what 2-tier would have caught.
  - **No D-01 fires this update**: corrective doc updates following external review verification do not qualify as "production patch". T-MCP-02 quota remains 21.
  - **Closure budget**: +0.25h this update (verification + 2 doc updates). Trailing-14d ~17.0h. Above floor.
- v2.31 (3 May Sunday late-night Sydney): runbook v2 + audit-readiness COMPLETE.
- v2.30 (3 May Sunday night Sydney): pipeline relief Migration 1+2 applied.
- v2.29 (3 May Sunday late evening Sydney): T-MCP-05 batch closed end-to-end.
- v2.28 (3 May evening Sydney): Stance retired.
- v2.27 and earlier: per prior changelog.
