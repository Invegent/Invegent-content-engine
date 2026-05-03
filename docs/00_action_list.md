# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-03 evening Sydney session-end reconcile (v2.28 — **Stance retired explicit by PK; F-AAP-001 + F-AAP-002 applied end-to-end; B-AUDIT-V4-PEERS clean; T05 returns to P1-urgent; two new findings logged (F-AAP-007 P2 + B-AUDIT-CHECK5-DRIFT P3)**). Closure budget: +1.9h this session, trailing-14-day 11.2 → 13.1h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S20)
3. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool. **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.28 application**: TWO MCP reviews fired this session. F-AAP-001 (`745482fb-...`) ESCALATED, corrected_action requested replay test, replay PASS produced new knowledge per T-MCP-08 pattern. F-AAP-002 (`d4e25cfa-...`) ESCALATED, identified as Lesson #62 type-(c) consistency-bias restatement, state-capture exception applied with PK explicit approval.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~8 (closed F-AAP-001 + F-AAP-002; net -2) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~13.1h (11.2h prior + 1.9h v2.28) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This bump's closure hours: ~1.9h** (B-AUDIT-V4-PEERS audit + 2 brief drafts + 2 MCP reviews + 2 applies + verifications + session reconciliation). Above 0.25h granularity threshold; increments trailing-14-day.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-03 evening Sydney session-end reconcile.
> **Stance retired** — T05 returns to P1-urgent.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **T05 Meta dev support contact** | **P1-urgent** | Stance retired explicit v2.28; B-AUDIT-V4-PEERS audit-gate cleared. Both message variants drafted in 2026-05-03 conversation history. PK fills 2 placeholders (App ID + submission date) and sends. | PK opens Meta dev support conversation using one of the two drafted variants. |
| 3 | **F-AAP-007 fix brief drafting** | P2 | Discovered v2.28 during F-AAP-002 verification. Audit Check 8 doesn't account for F-PUB-010 hard-cap backpressure. Currently misreporting fail cnt=56 and growing as F-AAP-001 drain continues. Same fix shape as F-AAP-002 but for F-PUB-010 (gate excludes drafts where (client, platform) queue is at or over `max_queued_per_platform` cap). | Author brief in `docs/briefs/2026-05-04-or-later-faap007-fix.md`. Triggers MCP review on `sql_destructive` before apply. |
| 4 | **B-AUDIT-V4-PEERS-EF read-only audit** | P3 | EF-side caller audit for `match_demand_to_canonicals`, `diagnose_match_pool_adequacy`, `summarise_match_pool_adequacy`. Verifies F-AAP-005 severity. CC-suitable read pass. | Scan `supabase/functions/` for `.rpc(...)` calls to these names. |
| 5 | **publish-queue-and-publish CC brief execution** | P2 | Brief at `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md` `status: ready`. ~70-95min CC closure budget. Two 0%-documented tables. Honours D-186 closure-first. Still queued from v2.27. | Trigger CC with brief. CC pre-flights + drafts migration; chat applies via Supabase MCP per D170. |

**Demoted from prior Today/Next 5** (still tracked):
- F-AAP-001 fix brief drafting ✅ DONE v2.28 (applied end-to-end)
- F-AAP-001 fix ✅ CLOSED v2.28 (criteria #1, #4, #6 PASS)
- B-AUDIT-V4-PEERS read-only audit pass ✅ DONE v2.28 (audit-gate cleared)
- F-AAP-002 fix ✅ CLOSED v2.28 (criterion #1 reconciled, others PASS)
- Operational stance retire decision ✅ RETIRED v2.28 (PK explicit)

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate post-F-AAP-001 | `SELECT client_slug, platform, count(*) FILTER (WHERE approval_status='approved' AND approved_at > NOW() - INTERVAL '24 hours') AS fresh_approvals_24h FROM m.post_draft d JOIN c.client c USING (client_id) WHERE d.created_at > '2026-05-03 09:25:00'::timestamptz GROUP BY 1,2;` | **REINSTATED v2.28** post-F-AAP-001 fix as auto-approver health metric. Initial post-fix tick at 09:30 UTC delivered 23 v4 approvals across 10 of 11 distinct combos. Watch for sustained throughput across drain period. |
| S17 | ChatGPT Review MCP cost + idempotency rate | (per v2.25) | **v2.28 note**: 17 fires total (2 new this session: 745482fb F-AAP-001 ESCALATED replay-test correction, d4e25cfa F-AAP-002 ESCALATED type-(c) consistency-bias). Pattern: `sql_destructive` action_type with strong-pushback escalation can be either new-knowledge (F-AAP-001 replay) or consistency-bias (F-AAP-002). Distinguishing factor: does the corrected_action prompt downstream verification that produces measured evidence? |
| S18 | D186 closure budget (per session start) | (per v2.25) | **Currently at 13.1h trailing-14-day — well above 8.0 floor.** |
| S19 | R01 Data Auditor closure effectiveness | Read trailing-3-cycle structural closure rate from `docs/audit/open_findings.md` § "Closure effectiveness — historical" | **Currently at 28.6% (cycles 1-2 only); next cycle will be the third data point.** |
| ~~S20~~ | ~~Operational stance retire criteria~~ | — | **RETIRED v2.28** (stance retired explicit by PK). |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| T02 | ~~Gate B exit decision~~ | — | ✅ DONE | — | Session: `docs/runtime/sessions/2026-05-03-t02-ratification.md` | |
| T04 | ~~R01 calibration session~~ | — | ✅ DONE | — | Session: `docs/runtime/sessions/2026-05-03-r01-calibration.md` | |
| **T05** | **Meta dev support contact** | **P1-urgent** | **✅ UNBLOCKED v2.28**. Stance retired + audit-gate cleared. Send within next 7 days for momentum on Standard Access progression. | PK | Both message variants drafted in 2026-05-03 conversation history. PK fills 2 placeholders (App ID + submission date) and sends. | |
| T06 | Reconnect YouTube OAuth — UNBLOCKED | P1 | Within 7 days | PK | Reconnect OAuth at user/account level | |
| T07 | Instagram publisher recovery | P1 | Gated on S16 + T05 + cron `?limit=1` update; **v2.28 update**: F-AAP-001 fix is no longer a precondition (auto-approver feeding now functional). Step 4 still gated on T05 + S16 sustained-PASS. | mixed | Step 4 cannot retry until ALL gates clear | |
| T08 | ~~Auto-approver patch~~ | — | ✅ DONE 2 May late evening via B31 | — | `docs/runtime/runs/2026-05-02-b31-auto-approver-v160-deploy.md` | |
| T09 | Safe-to-resume publisher checklist | P0 | Walk before each cron flip | PK | brief: `06_t09_*` | |
| T10 | Pre-fix queue disposition | P0 | Now appropriate post-W1 | PK | brief: `07_t10_*` | |
| T11 | YouTube failed-draft replay plan | P1 | After T17 + T06 | chat → MCP review → PK | next session | |
| T12 | ~~F-PUB-005 trigger gate~~ | — | ✅ DONE 3 May mid-morning | — | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` | |
| T13a | LinkedIn Zapier publisher gate v1.1.0 | P0 | ✅ DONE 2026-05-01 | — | brief: `03_t13_*` | |
| T13b | LinkedIn direct publisher gate v1.2.0 | P0 | ✅ DONE 2026-05-01 | — | brief: `03_t13_*` | |
| T16 | Audit needs_review LinkedIn published drafts | P1 | This week | PK | Full window since 2026-03-12 | |
| T17 | YouTube publisher gate v1.6.0 | P0 | ✅ DONE 2026-05-01 | — | brief: `01_t17_*` | |
| T18 | FB publisher gate v1.8.0 | P0 | ✅ DONE 2026-05-01 | — | brief: `02_t18_*` | |

**Workstream 1 status: COMPLETE.**
**Workstream 2 status: ✅ COMPLETE.**
**Phase B body-health gate: ✅ RATIFIED.**
**R01 Data Auditor calibration v2: ✅ COMPLETE.**
**Meta-tooling — ChatGPT Review MCP: SHIPPED. Production fires at 17 of 5 v2.28.**
**G1 sync_state restructure: COMPLETE.**
**Operational stance — PK trust-rebuild: ✅ RETIRED v2.28.**
**B-AUDIT-V4-PEERS audit pass: ✅ COMPLETE v2.28 (audit-gate cleared for T05).**
**F-AAP-001 fix: ✅ CLOSED v2.28 (criteria #1 + #4 + #6-interim PASS).**
**F-AAP-002 fix: ✅ CLOSED v2.28 (criterion #1 reconciled to warn cnt=2, others PASS).**

---

## 🛠 Meta-tooling — ChatGPT Review MCP (v2.28 update — T-MCP-02 quota at 17 of 5)

Two new fires this session:
- review_id `745482fb-aeb8-4532-8ed5-027232f7d0d1`, action_type=`sql_destructive` (F-AAP-001 apply), ESCALATED, PK accepted corrected_action (replay test), replay PASS produced new knowledge — T-MCP-08 lesson candidate reinforced.
- review_id `d4e25cfa-7217-4f69-a96c-2383426531d2`, action_type=`sql_destructive` (F-AAP-002 apply), ESCALATED, identified as Lesson #62 type-(c) consistency-bias restatement, state-capture exception applied with PK explicit approval. Distinct from T-MCP-08 pattern (no new evidence available; corrected_action would have been ceremony, not substance).

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | ✅ DONE | Closed | — |
| T-MCP-02 | ✅ EXCEEDED 17 of 5 | — | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days |
| T-MCP-04 | Operationalise D-01 standing rule | P1 | Half-codified v2.17. Pending PK manual update. |
| T-MCP-05 | Close-the-loop UPDATE on `2bab95d5-...` AND `521628d0-...` AND `1e5ab2eb-...` AND **NEW v2.28: `745482fb-...` AND `d4e25cfa-...`** | P3 | PK confirmation required. |
| T-MCP-06 | Investigate sql_destructive escalation rate (~50%) | P3 | **v2.28 update**: 2 sql_destructive escalations this session out of 2 fires (100%). Hypothesis updated: sql_destructive action_type may have HIGH baseline escalation rate, but escalation outcomes split between new-knowledge (T-MCP-08 pattern) and consistency-bias (Lesson #62 type-(c)). Next 3 sql_destructive fires should test this distinction. |
| T-MCP-07 | Retrospective MCP review on R01 calibration v2 | P3 | Optional. PK fires if desired. |
| **T-MCP-08** | **Lesson candidate REINFORCED v2.28**: "On `sql_destructive` actions where the proposal includes forecast assumptions (magnitude, downstream effects), MCP escalation requesting downstream verification is high-value when one-tool-call-away replay can replace forecast with measured evidence. Validates correctness AND fills magnitude gap in one shot. Distinct from Lesson #62 type-(c): produces new knowledge." | P3 | After 1-2 more such instances (currently 2: F-AAP-001 v2.28, plus the v2.27 plan_review correction), promote to canonical lesson. |

---

## 🤖 Cowork automation (D182 — v2.28)

Unchanged from v2.27. 11 briefs run; 3 brief shapes validated; 0 production writes from automation; 1 scheduled task live.

**Sunset review**: 12 May 2026.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| ~~F-AAP-001~~ | Auto-approver SQL fetcher v4 compat | — | ✅ **CLOSED v2.28** | — | Session: `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |
| ~~F-AAP-002~~ | Audit Check 7 v4 compat | — | ✅ **CLOSED v2.28** | — | Session: `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |
| **F-AAP-007 (NEW v2.28)** | Audit Check 8 doesn't account for F-PUB-010 backpressure | **P2** | logged for backlog; ranked #3 in Today/Next 5 for next session | chat → CC | Author fix brief next session. |
| **B-AUDIT-CHECK5-DRIFT (NEW v2.28)** | Audit Check 5 vocabulary drift (`status='locked'` not in current vocab) | **P3** | logged for backlog | chat → CC (cleanup) | Author fix brief when bandwidth allows. |
| publish-queue-and-publish-column-purposes | New CC brief | P2 | status: ready | cc | Trigger CC with brief. Ranked #5 in Today/Next 5. |
| B-INV-LinkedIn-Queue-Stall | Investigate 5 LinkedIn × Property Pulse true-stuck drafts | P1 | investigation complete v2.20 — remediation pending PK review | chat | Findings: `docs/audit/runs/2026-05-03-fpub006-linkedin-investigation.md` |

---

## 💼 Personal businesses

*(none flagged this session — PK to confirm at next session start)*

---

## 📌 Backlog

**v2.28 additions:**

- **F-AAP-007 (P2)** — audit Check 8 (`approved_drafts_missing_queue_entry`) doesn't account for F-PUB-010 hard-cap backpressure. Currently fail cnt=56 and growing as F-AAP-001 drain continues. Fix shape: same as F-AAP-002 but exclude drafts where (client, platform) queue is at or over `max_queued_per_platform` cap. **Already promoted to Today/Next 5 rank #3.**
- **B-AUDIT-CHECK5-DRIFT (P3)** — audit Check 5 (`stuck_publish_queue_items`) queries `m.post_publish_queue` for `status='locked'` which isn't in current vocabulary (queued/published/dead/throttled/held/skipped). Locks signalled via `locked_at`/`locked_by`. Older drift, not v4-specific. Fix candidate: rewrite gate to `locked_at IS NOT NULL AND locked_at < now() - interval '2 hours'`.
- **B-AUDIT-V4-PEERS-EF (P3)** — EF-side caller audit. TypeScript Edge Functions may call `match_demand_to_canonicals`, `diagnose_match_pool_adequacy`, `summarise_match_pool_adequacy` via Supabase RPC. Verifies F-AAP-005 severity. CC-suitable. **Already promoted to Today/Next 5 rank #4.**
- **B-CRON-V3-ORPHAN-READERS (P3)** — reader-side audit on `m.digest_item` / `m.digest_run` consumers (EFs, dashboards, ad-hoc queries) before pausing jobid 12. Required precondition for B-CRON-V3-ORPHAN resolution.

**Other backlog (carried from v2.27):**

- **F-AAP-003 (P3)** — `m.vw_ops_pipeline_health` misleading-metric (reads digest_run/digest_item max timestamps). Audit doc: `docs/audit/runs/2026-05-03-baudit-v4-peers.md`.
- **B-CRON-V3-ORPHAN (P3)** — jobid 12 hourly orphan production. Gate: B-CRON-V3-ORPHAN-READERS audit must complete first.
- **F-AAP-004 (P3-dormant)** — `match_demand_to_canonicals` INNER JOIN through digest_item. Reachable only via paused crons 11/64/65. Gate to resumption: must fix or deprecate.
- **F-AAP-005 (P3-dormant)** — `diagnose_match_pool_adequacy` + `summarise_match_pool_adequacy`. EF caller audit pending (B-AUDIT-V4-PEERS-EF).
- **F-AAP-006 (P4-dormant)** — `cluster_digest_items_v1`. Operates on digest_item only.
- **F-AAP-001 dead-join cleanup** — `LEFT JOIN m.digest_run dr` is now unreferenced post-fix; Postgres planner optimises away. Cleanup-candidate, not correctness issue.
- **B-AUDIT-CYCLE3** — Cycle 3 R01 Data Auditor run (first test of calibration v2 mechanisms; picks up C2-CAND-001 punted from this calibration).
- **F-PUB-008** — NDIS-Yarns FB publishes with NULL platform_post_id (P2, not investigated).
- **F-PUB-009** — Scheduling drift to August/October (P3, bounded by F-PUB-005 patch v2).
- **B-INV-LinkedIn-PhantomPublishes** — Daily phantom 00:00 UTC PP-LinkedIn publishes (P2, reproducible).
- **B39** — Drain over-cap queues (P3, by design).
- **B-AUDIT-V4-PEERS** SQL-side audit — ✅ **CLOSED v2.28**. Doc: `docs/audit/runs/2026-05-03-baudit-v4-peers.md`.

---

## 🧊 Frozen / Deferred

Unchanged from v2.20.

---

## 🎓 Canonical Lessons

Unchanged from v2.27.

- Lesson #46 (PROMOTED, third vindication v2.15)
- Lesson #51 (HONOURED v2.25 eighth, v2.27 ninth, **v2.28 tenth** — pre-flight discipline applied to F-AAP-001 + F-AAP-002 work)
- Lesson #58 candidate, #59 candidate, #60 candidate
- Lesson #61 PROMOTED canonical (REINFORCED v2.25, seventh vindication)
- **Lesson #62 type-(c) APPLIED v2.28** — F-AAP-002 MCP escalation correctly identified as consistency-bias restatement; distinguished from F-AAP-001's escalation which produced new knowledge via replay. Lesson #62 framework working as designed.
- G1 sync_state restructure (v2.23) — honoured v2.25/v2.27/**v2.28**
- Lessons #40, #41, #42 promoted candidate → canonical (R01 calibration v2 v2.25)
- **Lesson candidate (T-MCP-08)** REINFORCED v2.28: now has 2 instances (v2.27 plan_review + v2.28 sql_destructive replay test). Promote to canonical after 1-2 more.

---

## v2.28 honest limitations

- All v2.27 limitations apply.
- **F-AAP-001 criterion #6 verification at 8min interim only**, not full 30min mark. Decision recorded in session: backpressure already PASSING decisively at 8min (zero over-cap growth, three full drains visible); 30min check skipped per session-end pragmatism. Risk: a regression that appears between 8min and 30min would not be caught in this session. Mitigation: nightly-health-check Cowork at 02:00 AEST will surface any regression. Severity: low.
- **F-AAP-002 criterion #3 verified approximately, not byte-strictly.** Other 11 audit checks ran successfully with sensible verdicts post-apply, but pre-apply baseline run was not captured for direct byte-identity comparison. Mitigation: source byte-identity preserved per CC pre-flight #1; data-state shifts between pre and post apply windows would cause minor numerical drift independent of the fix. Acceptable.
- **F-AAP-002 brief criterion #1 expectation (cnt=0) was incorrect**; actual reconciled to cnt=2. Brief on disk at f03ec564 remains as historical reference. MCP review record `d4e25cfa-...` is the authoritative reconciliation document. No brief amendment committed (deliberate — the audit trail is durable through MCP record).
- **B-AUDIT-V4-PEERS EF-side audit not yet run.** F-AAP-005 severity remains uncertain pending that pass. Logged as B-AUDIT-V4-PEERS-EF in backlog, ranked #4 in Today/Next 5.
- **F-AAP-007 found during F-AAP-002 verification, not during B-AUDIT-V4-PEERS audit pass.** This is because audit pass scoped to digest_item/digest_run references only; F-AAP-007 is about F-PUB-010 backpressure logic, different surface area. Suggests future audit cycles should include cross-architectural-boundary checks ("does this audit gate logic match current architecture?" not just "does this audit reference v3 contracts?").
- **T-MCP-04 status: half-codified.**
- **T-MCP-05 close-the-loop UPDATEs still pending** for 5 review_ids: `2bab95d5-...`, `521628d0-...`, `1e5ab2eb-...`, **NEW v2.28: `745482fb-...`, `d4e25cfa-...`**.
- **T-MCP-06 sql_destructive escalation rate** updated to 100% (2 of 2 this session). Sample size still small. Hypothesis refinement: high baseline escalation rate is acceptable IF outcomes split cleanly between new-knowledge (T-MCP-08) and consistency-bias (Lesson #62 type-c).

---

## Changelog

- v1.0–2.27: per previous changelog.
- **v2.28 (3 May Sunday evening Sydney session-end reconcile): Stance retired explicit + F-AAP-001 + F-AAP-002 applied end-to-end + B-AUDIT-V4-PEERS clean + T05 returns to P1-urgent + 2 new findings logged.**
  - **Operational stance retired** by PK explicit decision under S20. T05 audit-gating logic shifted from trust-rebuild stance to verification-driven (B-AUDIT-V4-PEERS clean). Removal of stance section deferred to v2.29 to preserve transition record in this changelog.
  - **B-AUDIT-V4-PEERS read-only audit** complete (commit 356e0588). 27 functions + 1 view + 2 triggers in c/m/f/t/a/k schemas referencing digest_item/digest_run. Active-path findings: F-AAP-001 (known), F-AAP-002 (P2 NEW), F-AAP-003 (P3 NEW), B-CRON-V3-ORPHAN (P3 NEW). Dormant: F-AAP-004/005/006 (paused-cron-only). Confirmed-safe: m.fill_pending_slots, 2 _updated_at triggers, all bundle/select/score legacy. Audit-gate verdict: CLEAR.
  - **F-AAP-001 fix end-to-end CLOSED**. Brief (dbf8c488) → CC migration (f3b6604) → MCP review escalated (`745482fb-...`) corrected_action=replay test → replay PASS 96 rows → apply 09:25 UTC → criterion #1 PASS (96), #4 PASS (23 v4 approvals at 09:30 cron), #6 interim PASS (zero over-cap growth).
  - **F-AAP-002 fix end-to-end CLOSED**. Brief (f03ec564) → CC migration with surprise pre-flight #4 (ee03009): OLD Check 7 = 112 = 110 v4 false-positives + 2 v3 genuine orphans (NDIS-Yarns YouTube manual seeds 2026-04-09 by postgres role) → MCP review escalated (`d4e25cfa-...`) Lesson #62 type-(c) consistency-bias → state-capture exception applied with PK approval → apply ~09:35 UTC → criterion #1 reconciled warn cnt=2 (Path 1 accept), other 11 checks unchanged.
  - **F-AAP-007 (NEW P2)** logged: audit Check 8 (`approved_drafts_missing_queue_entry`) doesn't account for F-PUB-010 hard-cap backpressure. Currently fail cnt=56 and growing. Fix shape: same as F-AAP-002 but for F-PUB-010. Promoted to Today/Next 5 rank #3.
  - **B-AUDIT-CHECK5-DRIFT (NEW P3)** logged: Check 5 vocabulary drift (`status='locked'` not in current vocab; locks via locked_at/locked_by columns). Older drift, not v4-specific.
  - **T05 returns to P1-urgent** (audit-gate cleared post B-AUDIT-V4-PEERS clean). Send within 7 days for momentum on Standard Access progression.
  - **Today/Next 5 rebuilt**: rank 1 personal businesses; rank 2 T05 P1-urgent; rank 3 F-AAP-007 fix brief; rank 4 B-AUDIT-V4-PEERS-EF audit; rank 5 publish-queue-and-publish CC brief.
  - **T-MCP-02** quota: 17 of 5 (was 15 v2.27).
  - **T-MCP-05** queue updated with `745482fb-...` and `d4e25cfa-...` for close-the-loop UPDATE pending PK confirmation.
  - **T-MCP-06** hypothesis updated: 100% escalation rate this session (2/2), sample still small. Outcomes split cleanly between T-MCP-08 (new-knowledge) and Lesson #62 type-(c) (consistency-bias) — the split itself is the meaningful signal, not the rate alone.
  - **T-MCP-08 lesson candidate REINFORCED**: now 2 instances. Promote to canonical after 1-2 more.
  - **Closure budget**: +1.9h. Trailing-14-day 11.2 → 13.1h. Above 8.0 floor.
  - **No production DML, no EF deploys.** 2 DDL via apply_migration (F-AAP-001 + F-AAP-002 CREATE OR REPLACE FUNCTION). All other operations read-only.
- v2.27 (3 May late-afternoon Sydney F-AAP-001 close-out): F-PUB-005 V3-V5 PASS + B-INV-CFW-Invegent-Silent-Approver resolved + F-AAP-001 P1 logged with confirmed root cause + ChatGPT correction validated.
- v2.26 (3 May late-morning Sydney session-end reconcile): T05 deferred + Operational stance recorded + Today/Next 5 rebuilt.
- v2.25 (3 May late-morning Sydney R01 calibration session-end): T04 R01 Data Auditor calibration v2 COMPLETE.
- v2.24 (3 May late-morning Sydney T02 ratification session-end): T02 Gate B body-health exit RATIFIED.
- v2.23 (3 May mid-morning Sydney F-PUB-005 apply session-end): F-PUB-005 + F-PUB-010 CLOSED + G1 sync_state restructure.
- v2.22–v2.15: per prior changelog.
