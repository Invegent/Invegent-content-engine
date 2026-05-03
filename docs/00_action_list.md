# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-03 Sunday late-morning Sydney session-end reconcile (v2.26 — **PK trust-rebuild stance recorded; T05 deferred to next week; Today/Next 5 rebuilt to lead with low-friction closure work that validates patches held before re-opening external action**). State reconciliation only — no new artefacts; no MCP review per state-capture exception. Closure budget unchanged from v2.25 (10.3h trailing-14-day, above 8.0 floor).

---

## 🧭 Operational stance — PK trust-rebuild (active 2026-05-03 → revisit when patches verified holding)

**Recorded 2026-05-03 session-end at PK explicit instruction.**

Recent fires on the publishing layer (F-PUB-004 through F-PUB-010 closures, IG subcode 2207051 block, phantom 00:00 UTC LinkedIn publishes, 5 over-cap (client, platform) combos draining slowly) accumulated faster than verification cycles. PK signalled need to rebuild trust in the system before opening new external action.

**Operational order of priorities while this stance is active:**

1. **Validate patches held** — F-PUB-005 V3-V5 wait-based verifications, idle-state observation, drain pattern on over-cap queues
2. **Investigate observable anomalies** — B-INV-CFW-Invegent-Silent-Approver (read-only), B-INV-LinkedIn-PhantomPublishes (read-only)
3. **Author/execute closure briefs** — publish-queue-and-publish CC brief, etc.
4. **External action only after 1+2+3 produce stable state** — T05 Meta dev support contact, T11 YouTube failed-draft replay plan

**Stance retire criteria (any one):**

- F-PUB-005 V3-V5 verifications run + result is "patches held" (single query, ~5 min)
- 7 days of clean nightly-health-check observations post-2026-05-03
- PK explicit signal that trust is restored

**Honour this stance**: chat does NOT surface T05 (or other external actions) as urgent at session-start until at least one retire criterion fires. T05 stays P1-deferred — not P1-urgent.

This stance does NOT prevent: read-only investigations, low-risk closures, observation queries, role calibration work, internal documentation, or any action that strengthens system understanding without external commitment.

**Removal of this stance**: chat removes this section in the next action_list bump after a retire criterion fires, with explicit PK confirmation in chat.

---

## How this file works

**At session start**, chat reads this file and:
1. **Reads the Operational stance section above** — applies the stance to all priority decisions in this session
2. Rebuilds the Today / Next 5 view honouring the stance
3. Runs Standing checks (S1–S19)
4. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
5. Asks PK about Personal businesses
6. Surfaces Time-bound items due today/tomorrow — but **P1-deferred items per stance are not surfaced as urgent**

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool. **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.26 application of state-capture exception**: this bump is pure state reconciliation (T05 deferral, Today/Next 5 reorder, Operational stance recorded) with zero structural change. No ChatGPT cross-check fired.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~10 | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~10.3 (unchanged from v2.25; v2.26 is reconcile-only ~0.1h, below 0.25h granularity threshold) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This bump's closure hours: ~0.1h** — clerical state reconciliation; below 0.25h granularity threshold per D186 methodology, so does not increment trailing-14-day.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-03 Sunday late-morning Sydney session-end reconcile.
> **Honours Operational stance above** — T05 demoted to rank 5 (deferred); low-friction patch-validation work promoted.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **F-PUB-005 patch V3-V5 wait-based verifications** | P2 | **Stance retire criterion #1** — validates whether the F-PUB-005 + F-PUB-010 patch held since 2026-05-03 02:29:48 UTC apply. ~5min active. Lowest-friction closure on the board; high trust-rebuild value. | Run V5 query: SELECT current queue counts per (client, platform); compare against captured T+0 baseline at `docs/runtime/sessions/2026-05-03-fpub005-apply.md`. Any over-cap combo growing past current value = FAIL. Also rerun F-PUB-007 verification query (V3 backpressure diagnostic). |
| 3 | **B-INV-CFW-Invegent-Silent-Approver investigation** | P2 | Read-only investigation; CC-suitable. NDIS-Yarns firing all 4 platforms; CFW + Invegent silent across all platforms. Likely SQL fetch-side filter or no fresh draft generation upstream. **Honours stance** — read-only, no DDL/DML, builds system understanding. | Read-only CC brief authoring next session; investigation only. |
| 4 | **publish-queue-and-publish CC brief execution** | P2 | Brief at `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md` `status: ready`. ~70-95min CC closure budget. Two 0%-documented tables central to F-PUB-006 + F-PUB-005 work area. Documentation-only outcome; honours stance. | Trigger CC with brief. CC pre-flights + drafts migration; chat applies via Supabase MCP per D170. |
| 5 | **T05 Meta dev support contact — DEFERRED** | P1-deferred | **Per Operational stance** — PK pushed to next week for trust-rebuild. Both message variants drafted in 2026-05-03 conversation history. PK fills 2 placeholders (App ID + submission date) and sends when stance is retired. Do NOT surface as urgent at session start. | When stance retired: PK opens Meta dev support conversation using one of the two drafted variants. |

**Demoted from prior Today/Next 5** (still tracked):
- T04 R01 calibration session ✅ DONE v2.25
- B-INV-LinkedIn-PhantomPublishes investigation (still P2, in 📌Backlog)

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate post-B31 | `SELECT client_slug, platform, count(*) FILTER (WHERE approval_status='approved' AND approved_at > NOW() - INTERVAL '24 hours') AS fresh_approvals_24h FROM m.post_draft d JOIN c.client c USING (client_id) WHERE d.created_at > '2026-05-02 12:39:33'::timestamptz GROUP BY 1,2;` | **VERIFIED v2.21**: 252 approvals in 9.5h post-deploy. NDIS-Yarns firing all 4 platforms; CFW + Invegent silent. |
| S17 | ChatGPT Review MCP cost + idempotency rate | (per v2.25) | **v2.26 note**: 14 fires total. No new MCP fires this session per state-capture exception. |
| S18 | D186 closure budget (per session start) | (per v2.25) | **Currently at 10.3h trailing-14-day — above floor.** |
| S19 | R01 Data Auditor closure effectiveness | Read trailing-3-cycle structural closure rate from `docs/audit/open_findings.md` § "Closure effectiveness — historical" | **Currently at 28.6% (cycles 1-2 only); next cycle will be the third data point.** |
| **S20 *(NEW v2.26)*** | **Operational stance retire criteria** | Check Operational stance section at top of this file. Has any retire criterion fired? (V3-V5 verifications run with PASS verdict / 7 days clean nightly-health-check / PK explicit signal) | If yes → propose stance retirement to PK; if removed, T05 returns to P1-urgent at next session start. If no → continue honouring stance. |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| T02 | ~~Gate B exit decision — extended 24h~~ | — | ✅ **DONE 2026-05-03 late-morning Sydney** | — | Session: `docs/runtime/sessions/2026-05-03-t02-ratification.md` | `docs/audit/runs/2026-05-02-t02-extension.md` |
| T04 | ~~R01 calibration session~~ | — | ✅ **DONE 2026-05-03 late-morning Sydney** | — | Session: `docs/runtime/sessions/2026-05-03-r01-calibration.md`. Role doc v2 at `docs/audit/roles/data_auditor.md`. | |
| **T05** | **Meta dev support contact** | **P1-deferred (was P1)** | **DEFERRED to next week per Operational stance (recorded 2026-05-03 session-end)** | PK | Both message variants drafted in 2026-05-03 conversation history. PK fills 2 placeholders (App ID + submission date) and sends when stance retired. Do NOT surface as urgent at session start. | |
| T06 | Reconnect YouTube OAuth — UNBLOCKED | P1 | Within 7 days | PK | Reconnect OAuth at user/account level | |
| T07 | Instagram publisher recovery | P1 | Gated on S16 + T05 + cron `?limit=1` update | mixed | Step 4 cannot retry until ALL gates clear (T05 deferral extends this gate) | |
| T08 | ~~Auto-approver patch~~ | — | ✅ **DONE 2 May late evening** via B31 | — | `docs/runtime/runs/2026-05-02-b31-auto-approver-v160-deploy.md` |
| T09 | Safe-to-resume publisher checklist | P0 | Walk before each cron flip | PK | brief: `06_t09_*` |
| T10 | Pre-fix queue disposition | P0 | Now appropriate post-W1 | PK | brief: `07_t10_*` |
| T11 | YouTube failed-draft replay plan | P1 | After T17 + T06 | chat → MCP review → PK | next session |
| T12 | ~~F-PUB-005 trigger gate~~ | — | ✅ **DONE 3 May mid-morning** | — | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |
| T13a | LinkedIn Zapier publisher gate v1.1.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `03_t13_*` |
| T13b | LinkedIn direct publisher gate v1.2.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `03_t13_*` |
| T16 | Audit needs_review LinkedIn published drafts | P1 | This week | PK | Full window since 2026-03-12 | |
| T17 | YouTube publisher gate v1.6.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `01_t17_*` |
| T18 | FB publisher gate v1.8.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `02_t18_*` |

**Workstream 1 status: COMPLETE.**
**Workstream 2 status: ✅ COMPLETE 2 May late evening.**
**Phase B body-health gate: ✅ RATIFIED v2.24.**
**R01 Data Auditor calibration v2: ✅ COMPLETE v2.25.**
**Meta-tooling — ChatGPT Review MCP: SHIPPED v2.15. Production fires at 14 of 5 v2.26.**
**G1 sync_state restructure: COMPLETE v2.23.**
**Operational stance — PK trust-rebuild: ACTIVE v2.26.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP (v2.26 update — T-MCP-02 quota at 14 of 5)

Unchanged from v2.25. No new MCP fires this session. v2.26 bump committed under state-capture exception (pure reconciliation, no structural change).

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | ✅ DONE | Closed | — |
| T-MCP-02 | ✅ EXCEEDED 14 of 5 | — | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days |
| T-MCP-04 | Operationalise D-01 standing rule | P1 | Half-codified v2.17. Pending PK manual update. |
| T-MCP-05 | Close-the-loop UPDATE on `2bab95d5-...` AND `521628d0-...` | P3 | PK confirmation required. |
| T-MCP-06 | Investigate sql_destructive escalation rate (~50%) | P3 | If next 3 fires also escalate weak. |
| T-MCP-07 | Retrospective MCP review on R01 calibration v2 | P3 | Optional. PK fires if desired. |

---

## 🤖 Cowork automation (D182 — v2.26)

Unchanged from v2.25. 11 briefs run; 3 brief shapes validated; 0 production writes from automation; 1 scheduled task live.

**Sunset review**: 12 May 2026.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| ~~T02~~ | Phase B body-health gate exit | — | ✅ **CLOSED v2.24** | — | Session: `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| ~~T04~~ | R01 calibration session | — | ✅ **CLOSED v2.25** | — | Session: `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| publish-queue-and-publish-column-purposes | New CC brief | P2 | status: ready | cc | Trigger CC with brief. |
| B-INV-LinkedIn-Queue-Stall | Investigate 5 LinkedIn × Property Pulse true-stuck drafts | P1 | investigation complete v2.20 — remediation pending PK review | chat | Findings: `docs/audit/runs/2026-05-03-fpub006-linkedin-investigation.md`. |
| B-INV-CFW-Invegent-Silent-Approver | Investigate why CFW + Invegent silent post-B31 | P2 | candidate (still unaddressed v2.26) | chat | Read-only investigation; CC-suitable. **Promoted to Today/Next 5 rank 3 per stance.** |

---

## 💼 Personal businesses

*(none flagged this session — PK to confirm at next session start)*

---

## 📌 Backlog

Unchanged from v2.25. See v2.25 for full table.

Highlights:
- **B-AUDIT-CYCLE3** — Cycle 3 R01 Data Auditor run (first test of calibration v2 mechanisms; picks up C2-CAND-001 punted from this calibration)
- **F-PUB-008** — NDIS-Yarns FB publishes with NULL platform_post_id (P2, not investigated)
- **F-PUB-009** — Scheduling drift to August/October (P3, bounded by F-PUB-005 patch v2)
- **B-INV-LinkedIn-PhantomPublishes** — Daily phantom 00:00 UTC PP-LinkedIn publishes (P2, reproducible)
- **B39** — Drain over-cap queues (P3, by design)

---

## 🧊 Frozen / Deferred

Unchanged from v2.20.

---

## 🎓 Canonical Lessons

Unchanged from v2.25.

- Lesson #46 (PROMOTED, third vindication v2.15)
- Lesson #51 (HONOURED v2.25, eighth honour)
- Lesson #58 candidate, #59 candidate, #60 candidate
- Lesson #61 PROMOTED canonical (REINFORCED v2.25, seventh vindication)
- Lesson #62 candidate refined to type-(c)
- G1 sync_state restructure (v2.23) — honoured v2.25
- **NEW v2.25** — Lessons #40, #41, #42 promoted candidate → canonical (R01 calibration v2)

---

## v2.26 honest limitations

- All v2.25 limitations apply.
- **Operational stance (PK trust-rebuild)**: this is the first time the action_list has carried an explicit "do not surface item X as urgent" instruction tied to retire criteria. The mechanism is documented in this file but has no automated enforcement — relies on chat reading the stance section at session start (S20 standing check). If chat fails to read S20, the stance gets ignored and T05 may surface as urgent. Risk: low (S20 is in the standing check list); fallback: PK can correct in chat.
- **Stance has no hard expiry**. If trust restoration takes longer than expected, the stance simply persists. PK can also explicitly retire via chat instruction at any time.
- **Closure budget**: this bump is reconcile-only, ~0.1h, below 0.25h granularity threshold; trailing-14-day stays at 10.3h.
- T-MCP-04 status: half-codified.
- T-MCP-05 close-the-loop UPDATEs still pending.
- T-MCP-06 sql_destructive escalation rate unchanged at ~50%.

---

## Changelog

- v1.0–2.25: per previous changelog.
- **v2.26 (3 May Sunday late-morning Sydney session-end reconcile): T05 deferred + Operational stance recorded + Today/Next 5 rebuilt to lead with patch-validation work.**
  - **PK explicit instruction** at session-end: "T05 i will push to other day may be next week — i need to get my trust back in system first — lets close this session, reconcile."
  - **New "Operational stance — PK trust-rebuild" section** added at top of file. Documents: (a) reasoning (recent fires accumulated faster than verification cycles); (b) order of priorities while active (validate patches → investigate → close briefs → external action); (c) retire criteria (V3-V5 verifications PASS / 7 days clean / PK explicit signal); (d) honour rule (chat does NOT surface T05 as urgent at session start until criterion fires).
  - **T05 row updated** in time-bound table: priority changed from P1 to P1-deferred; due changed from "ASAP — Mon 4 May latest" to "DEFERRED to next week per Operational stance (recorded 2026-05-03 session-end)".
  - **Today/Next 5 rebuilt**: T05 demoted from rank 2 to rank 5 (P1-deferred); F-PUB-005 V3-V5 verifications promoted from rank 3 to rank 2 (highest trust-rebuild value, ~5min active); B-INV-CFW-Invegent-Silent-Approver promoted from rank 5 to rank 3.
  - **New S20 standing check** added: "Operational stance retire criteria" — chat checks at session start whether stance should be retired and proposes retirement to PK if criterion fired.
  - **Workstream summary line added**: "Operational stance — PK trust-rebuild: ACTIVE v2.26."
  - **State-capture exception applies**: pure state reconciliation; no structural change; no MCP review fired. Closure budget unchanged from v2.25 (10.3h trailing-14-day).
  - **No new artefacts**: no session file (R01 calibration session file is the substantive artefact; this is the postscript). sync_state pointer index unchanged.
- v2.25 (3 May Sunday late-morning Sydney R01 calibration session-end): T04 R01 Data Auditor calibration v2 COMPLETE.
- v2.24 (3 May Sunday late-morning Sydney T02 ratification session-end): T02 Gate B body-health exit RATIFIED.
- v2.23 (3 May Sunday mid-morning Sydney F-PUB-005 apply session-end): F-PUB-005 + F-PUB-010 CLOSED + G1 sync_state restructure.
- v2.22 (3 May Sunday mid-morning Sydney chat session 2 end): F-PUB-007 closed not-real-bug + F-PUB-010 candidate surfaced + addressed in F-PUB-005 patch v2 + F04 applied.
- v2.21 (3 May Sunday morning Sydney chat session-end): F-PUB-006 CLOSED + B31 closure of F-PUB-004 PROVEN.
- v2.20 (3 May Sunday morning Sydney CC pre-T01/T02): F-PUB-006 partial + B-INV-LinkedIn investigation complete + B38.
- v2.19 (2 May Saturday very late evening Sydney session-end): B31 / B32 / T08 closed end-to-end.
- v2.18 (2 May Saturday late evening Sydney session-end): full session reconciliation.
- v2.17 (2 May Saturday afternoon Sydney): MCP review protocol codified.
- v2.16 (2 May Saturday afternoon Sydney): T-MCP-01 closed end-to-end.
- v2.15 (2 May Saturday afternoon Sydney): ChatGPT Review MCP system SHIPPED.
