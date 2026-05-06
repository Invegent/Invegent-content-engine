# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-07 Sydney (v2.46 — **Dashboard Architecture Review COMPLETE.** 12 docs committed across 11 sequential turns from kickoff (2026-05-04) to closure (today). 5-section IA locked (Option B). HYBRID Brief generation locked. 6 product primitives at contract level. 17 build-blockers as PK execution checklist (§11.4). 5-phase implementation plan (~44–54h / 5–9 weeks elapsed). Zero production mutations. Hold-state respected. **S30 still pending natural fire 17:00 UTC tonight** as in v2.45. Next phase = implementation Phase 0 after S30 clearance + PK confirms 7 Phase 0 defaults.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29 + S30 v2.45)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **v2.46 application**: 0 D-01 fires this session (documentation-only review docs). T-MCP-02 quota unchanged at 41.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is the approved target design. Stage 1 closed v2.41. **Stage 2a fully CLOSED v2.44.** Stages 2b + 3 sequenced behind. S30 verification gate before Stage 2b.

**STANDING RULE (Lesson #62, v2.41)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, the default is NOT automatic state-capture override.

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline. A discarded first attempt cannot fall out of session memory just because a later formally-authorised replay supersedes it.

**STANDING RULE (v2.46 NEW — Dashboard Architecture Review)**: All architecture-level decisions for ICE Dashboard live in `docs/dashboard-review-2026-05/`. Reopen triggers documented in `11_final_consolidation.md` §11.7. Amendment-doc protocol at `docs/dashboard-review-2026-05/amendments/` for in-build discoveries.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~8 unchanged from v2.45 (architecture review work was design closure, not finding closure; 17 build-blockers will become P0/P1 findings as PK works through them) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~46h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed (after S30) |

**This session's closure hours: ~10–12h** (architecture review across 11 sequential turns + this 4-way sync).

**Day total: ~14h** (v2.45 lightweight checkpoint earlier + architecture review + sync close).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-07 Sydney (v2.46).
> **This session: dashboard architecture review COMPLETE; hold continues until S30 window.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **S30** — forward verification of first automated drift-check cron fire | **P1 TOP** | Cron live since v2.44; first natural fire 17:00 UTC tonight (~few hours away from this v2.46 close). | Run S30 ~17:15 UTC / 03:15 AEST tomorrow: confirm jobid 80 ran, jobid 81 ran or scheduled, new `drift_check_run_id` exists with 49 rows, errors empty, SD-risk count = 3, `vw_ef_drift_current` updated, no duplicate scans. |
| 2 | **Dashboard Architecture Review Phase 0 prerequisites** | P1 (NEW v2.46) | Architecture review COMPLETE; Phase 0 gates on S30 + M5–M8 reconciliation + 7 confirm-defaults | After S30 PASS: PK reviews `11_final_consolidation.md` §11.4 items 3–9 (Phase 0 confirmation blockers). Confirm or override defaults. Then schedule Phase 0 work: M-09-01 (doctor severity+ack cols) + M-09-02 (m.brief table) + M-09-03 (m.vw_pipeline_state view) + S-09-01 (health log JSONB col additive) + 4 inventory sweeps. ~7–9h Phase 0 capacity. |
| 3 | **F-EF-DRIFT-PREVENTION Stage 2b** | P1 (after S30 green) | Stage 2a CLOSED v2.44; cron live; S30 gates Stage 2b. Architecture review reserved slot under NOW > Investigate per `06_final_target_design.md` §6.9 + `09_implementation_plan.md` Phase 4 B-09-36. | After S30 PASS: design dashboard drift panel reading `m.vw_ef_drift_current` + filtered queries. Class buckets, P1 SECURITY-DEFINER highlighted, B-FD informational, repo-only directories listed separately. ~1–2h. |
| 4 | **F-EF-DRIFT-PREVENTION Stage 3** | P1 | After Stage 2b. | `scripts/safe-deploy.sh` wrapper. ~30 min. |
| 5 | **P1 SECURITY-DEFINER regression-risk triage** | P1 | After Stage 2b live. | Sync repo → deployed via Windows CLI for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`. |

**Demoted from prior Today/Next 5 in v2.45→v2.46 cycle:**

- **insights-worker P1 functional drift** demoted from #5 to #6 (Active section); replaced at #2 by Dashboard Architecture Review Phase 0 prerequisites which is now the second-highest-priority workstream.

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (v2.46 update)

Unchanged from v2.45 — Stage 2a fully CLOSED. Both crons live (jobid 80 + 81), `active=true`. **0 runs ever** in `cron.job_run_details` for either job (correct — first natural fire is 17:00 UTC tonight, only a few hours away from this v2.46 close). S30 verification is the gate to Stage 2b.

**v2.46 NEW**: Architecture review reserved slot for drift panel UI under NOW > Investigate per `06_final_target_design.md` §6.9. Implementation gates on F-EF-DRIFT-PREVENTION Stage 2b shipping; placeholder slot in `09_implementation_plan.md` Phase 4 B-09-36.

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK (v2.46 NEW)

**Status:** **COMPLETE** at v2.46 close. 12 docs at `docs/dashboard-review-2026-05/` (`00_overview.md` + `01_*` through `11_*`).

**Locked decisions consolidated in `11_final_consolidation.md` §11.2.**

**17 build-blockers as PK execution checklist in `11_final_consolidation.md` §11.4.**

**Reopen triggers documented in `11_final_consolidation.md` §11.7.**

**Amendment-doc protocol** for in-build discoveries: new docs at `docs/dashboard-review-2026-05/amendments/YYYY-MM-DD-{slug}.md` rather than restarting the review. The 11 main docs remain the v1 record.

**Phase 0 prerequisites:** S30 cleared + M5–M8 reconciliation + 7 Phase 0 confirmation-blocker defaults confirmed/overridden.

**Open from this review (deferred):**
- `00_overview.md` 11-section table reconciliation — required updates specified in `11_final_consolidation.md` §11.1; not applied at v2.46 close per files-changed minimisation.
- Architecture review doc footers say "Created 2026-05-06 (Sydney)" but actual close is 2026-05-07 Sydney; 1-day discrepancy not retroactively fixed.

---

## 🟢 Tier 1 + M4 + M5 + F-YT-OAUTH-PP queue integrity & stability remediation — STATUS BLOCK

Unchanged from v2.45. M6–M8 still pending. M6 Phase A explicitly BLOCKED behind Stage 2b close + P1 triage per v2.44/v2.45.

**v2.46 NEW**: Architecture review's Phase 0 M-09-03 (`m.vw_pipeline_state` view) must reconcile with M5–M8 schema changes. Either M5–M8 ships first OR M-09-03 is built against M5–M8 stable schema. Sequencing decision = Phase 0 hard blocker per `09_implementation_plan.md` §9.13.

---

## 🔄 Standing session-start checks

Unchanged from v2.45 (S1–S30). **No new standing checks added v2.46** — architecture review work doesn't add session-start verification.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged. **v2.46 status delta**: First automated drift-check scan tonight 2026-05-07 17:00 UTC = 03:00 AEST tomorrow.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 41 of 5)

**v2.46 application: 0 D-01 fires** this session (documentation-only review docs).

Cumulative T-MCP-02 quota: 41 of 5. Cumulative T-MCP-08: 2. Cost still well under $0.50 cumulative.

---

## 🤖 Cowork automation (D182)

**v2.46 status delta:** No change. `docs/audit/health/2026-05-06.md` still absent at v2.46 close — carry as P3 follow-up.

Sunset review: 12 May 2026.

---

## 🧭 ICE Dashboard Architecture Review (v2.35)

**v2.46:** **COMPLETE.** See dedicated status block above.

---

## 🟡 Active

Per v2.45 except:

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **S30** (NEW v2.45) | First automated drift-check cron fire verification | P1 TOP | Pending natural fire 17:00 UTC tonight (only hours away from v2.46 close) | chat → next session | Run S30 ~17:15 UTC / 03:15 AEST tomorrow. |
| **Dashboard Architecture Review Phase 0 prerequisites** (NEW v2.46) | 7 Phase 0 confirmation blockers + S30 + M5–M8 reconciliation | P1 | Pending PK confirm/override on `11_final_consolidation.md` §11.4 items 3–9 | PK | Review §11.4 items 3–9; confirm defaults or propose alternatives. Schedule Phase 0 work post-S30. |
| **3 stuck-item clusters re-evaluation** | LinkedIn-PP + YouTube-PP + YouTube-NY | — | **RE-EVAL CAPTURED v2.45** in session file. PP×YT + LI-PP CLEARED. NY×YT still blocked behind F-YT-NY-FORMAT-SELECTION. | — | (No further action; will re-check after F-YT-NY-FORMAT-SELECTION fix.) |
| **F-AI-WORKER-PARSER-SKIP-BUG V3-V5** | Forward acid-test of parser fix | P1 → P2 | **V3 + V5 PASS v2.45.** V4 INCONCLUSIVE (no natural skip in 48h window). | chat → future | V4 needs natural skip event OR synthetic test. Demoted to P2 monitoring. |
| **F-EF-DRIFT-PREVENTION Stage 2b** | Dashboard drift panel | P1 (after S30) | Sequenced after S30 green | chat → future session | Read `m.vw_ef_drift_current` + filtered drift queries; class buckets; P1 SECURITY-DEFINER highlighted. ~1–2h. **v2.46 NEW**: architecture review reserved slot under NOW > Investigate per `06_final_target_design.md` §6.9; full implementation in Phase 4 B-09-36. |
| **F-EF-DRIFT-PREVENTION Stage 3** | `scripts/safe-deploy.sh` | P1 | PENDING | chat → future session | Author wrapper; commit; habit-builder. ~30 min. |
| **P1 SECURITY-DEFINER triage** | `heygen-avatar-creator` + `heygen-avatar-poller` + `draft-notifier` | P1 | Sequenced after Stage 2b live | PK + chat | Sync repo → deployed via Windows CLI; commit as sync-only commits. |
| **insights-worker P1 functional drift** | Deployed v14.0.0 vs repo v1.6.0 | P1 | D-PREV-07: no auto-sync; manual review first | PK | After Stage 2b live: PK reviews deployed source. |
| **F-YT-NY-FORMAT-SELECTION** (carry-forward) | Brief committed `ff5ae6ae` | P1 | **BLOCKED behind Stage 2b close + P1 triage**; v2.45 confirmed still gating NY×YT (8 text-format ready rows) | chat → future session | After triage clears: read v2.11.1 source post-build; locate `format-advisor-v1`; decide between 4 fix shapes. |
| **M6 Phase A** (carry-forward) | 108 historical Bug 3 dead-letter | P1 | **BLOCKED behind Stage 2b close + P1 triage**; v2.45 confirmed 32 NY-FB+PP-FB orphans still in scope. **v2.46 NEW**: also coordinate with architecture review M-09-03 view definition. | PK → chat → future session | After F-YT-NY-FORMAT-SELECTION clears: PK directs start. |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | After M6 Phase A. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P2 | v2.45 confirms 4/4 drafts have scheduled_for | chat → next session | Continue passive monitoring. |
| **Invegent IG cap-throttle planning** (NEW v2.45) | When jobid 53 unblocks, ~104 IG-overdue posts will fire | P3 | OBSERVED, not actioning | chat → T05 unblock session | Plan cap-throttle / rate-limit handling before re-enabling jobid 53. |
| **CFW post-ai-worker dead drafts** (NEW v2.45) | Drafts dying after AI succeeds | P3 | OBSERVED, not in F-AI-WORKER-PARSER-SKIP-BUG scope | chat → future session | Investigate downstream cap/approval pathway. Stage 2b dashboard panel will surface. |
| **Vault `service_role_key` naming hygiene** (NEW v2.45) | Vault entry is misleadingly named (15 chars; not a JWT). Drift-check cron unaffected. | P3 | OBSERVED, not actioning | chat → future session | Read-only scope-check; rename if appropriate. **No fix unless something is found broken.** |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session if still absent | Investigate Cowork status. |
| **`00_overview.md` 11-section table reconciliation** (NEW v2.46) | Architecture review changed actual section structure; overview table out-of-sync | P3 | Required updates specified in `11_final_consolidation.md` §11.1 | chat → future session | Update `00_overview.md` per §11.1 guidance. ~15 min. |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | OBSERVED v2.45; **closure target = architecture review Phase 2 B-09-14 bulk approve** | chat → Phase 2 session | After Phase 0 + Phase 1 ship: bulk approve UI in Phase 2 closes this 28-draft backlog with confirmation modal + per-draft opt-out + 10s undo. |
| (others) | per v2.45 | — | — | — | per v2.45 |

**Closed v2.46:**

- **🎉 ICE Dashboard Architecture Review of 2026-05 COMPLETE** — 12 docs at `docs/dashboard-review-2026-05/`, 11 sequential turns from kickoff (2026-05-04) to closure (2026-05-07). 5-section IA locked. Option B locked. HYBRID Brief generation locked. 6 product primitives at contract level. 17 build-blockers as PK execution checklist. 5-phase implementation plan. Zero production mutations across all 11 turns. Reopen triggers documented; amendment-doc protocol committed.

**Closed v2.45:** (none formally; lightweight checkpoint)
**Closed v2.44:** F-EF-DRIFT-PREVENTION Stage 2a finalisation.
**Closed v2.43:** bef6be96 origin investigation.
**Closed v2.42:** (none)
**Closed v2.41:** F-EF-DRIFT-PREVENTION Stage 1.
**Closed v2.40:** F-EF-DRIFT-PREVENTION investigation phase.

---

## 💼 Personal businesses

*(none flagged at session start — PK confirmed nothing live; ICE proceeded)*

---

## 📌 Backlog

**v2.46 changes**:

- **NEW v2.46**: Dashboard Architecture Review Phase 0 prerequisites (P1, second-highest workstream after S30). Once Phase 0 starts, Phases 1–4 are committed work; rough capacity ~44–54h chat across 5–9 weeks at 2–3 sessions/week.
- **NEW v2.46**: 17 build-blockers as PK execution checklist (`11_final_consolidation.md` §11.4). Hard blockers (S30 + M5–M8 reconciliation) + 7 Phase 0 confirmation blockers + 3 Phase 1 confirmation blockers + 1 Phase 2 confirmation blocker + 4 Phase 3 confirmation blockers.
- **NEW v2.46**: `00_overview.md` 11-section table reconciliation (P3) — required updates specified in `11_final_consolidation.md` §11.1.
- **NEW v2.46**: F-AAP-NEEDS-REVIEW-BACKLOG (28 drafts) closure target moves from "future" to **architecture review Phase 2 B-09-14 bulk approve**.
- **NEW v2.46**: Future closures of multiple existing items now have explicit landing in architecture review phases:
  - Action Layer (requeue/retry/ack/inline-rule-update/override-format/inline-reconnect/bulk-approve) → Phase 1+2+3
  - Dead-item requeue UI → Phase 1 (CRITICAL §3 row 22 close)
  - MONITOR_TABS removal → Phase 1 (AP5 ship-blocker)
  - Hardcoded NDIS+PP UI sweep → Phase 1; column drop → Phase 4 (AP6 ship-blocker)
  - Doctor severity ack → Phase 1+3 (AP7 close)
  - Cross-section pre-fill → Phase 3 (AP4 close)
  - Brief surface → Phase 3 templated MVP + Phase 4 LLM enrichment
  - Telegram daily push → Phase 1 infra + Phase 3 push
  - EF drift panel placement → Phase 4 placeholder slot under NOW > Investigate

**v2.45 changes** (still active): per v2.45.

**v2.44 + v2.43 + v2.42 + v2.41 + v2.40 + v2.39 + v2.38 + v2.37 + v2.36 + v2.35 + v2.34 + v2.33 changes**: per v2.45.

**Carried from v2.31**: per v2.45.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Per v2.45. **No new candidates v2.46** (documentation-only architecture review work; no production mutations to learn from). Lesson candidate #69 from v2.45 still on probation — single occurrence, low cost.

**Lesson observation v2.46 (informal, not promoted):** A bounded multi-turn architecture review delivered ~80 locked decisions across 11 docs at zero production mutation. The 4-way sync close discipline was preserved by deferring the close until the review COMPLETED, rather than syncing per-turn. Trade-off: PK had to trust the review would converge before close-of-day; alternative would have been per-turn syncs at higher overhead. Single occurrence; not a pattern yet.

---

## v2.46 honest limitations

- All v2.31-v2.45 limitations apply.
- **Architecture review docs carry footer dating "Created 2026-05-06 (Sydney)"** based on running UTC perspective during composition; actual Sydney close date is 2026-05-07 (consistent with v2.45 sync_state ordering). 1-day footer discrepancy across 12 docs not retroactively fixed.
- **`00_overview.md` 11-section table out-of-sync** with the actual 11 sections committed. Required updates specified in `11_final_consolidation.md` §11.1; not applied at v2.46 close.
- **17 build-blockers from architecture review will become Phase 0/Phase 1/Phase 2/Phase 3 P0+P1 findings** as PK confirms defaults and Phase 0 starts. Closure budget tracking will need to account for these as separate from existing P0+P1 finding count.
- **Architecture review work was design closure not finding closure.** P0+P1 open finding count unchanged at ~8. The 17 build-blockers will appear in P0+P1 count once Phase 0 begins.
- **All other v2.45 limitations apply unchanged.**

---

## Changelog

- v1.0–2.45: per previous changelog.
- **v2.46 (2026-05-07 Sydney, Dashboard Architecture Review COMPLETE):**
  - **Architecture Review COMPLETE**: 12 docs at `docs/dashboard-review-2026-05/` across 11 sequential turns from kickoff (2026-05-04) to closure (today). Commits `487a761b` → `c30d5ac9`.
  - **5-section IA locked** (NOW + CLIENTS + CREATE + REPORTS + ADMIN), Option B (operational consolidation).
  - **HYBRID Brief generation locked** (templated baseline + LLM enrichment with deterministic fallback). Web canonical, Telegram nudge-only, email deferred to v2.
  - **6 product primitives at contract level**: `m.attention_item` (NEW table backing Inbox), `m.vw_pipeline_state`, `m.vw_agent_status`, scope (jsonb shape), `m.brief`, `m.action_event` (single-table audit).
  - **17 build-blockers as PK execution checklist** in `11_final_consolidation.md` §11.4: 2 hard blockers (S30 + M5–M8) + 7 Phase 0 + 3 Phase 1 + 1 Phase 2 + 4 Phase 3.
  - **5-phase implementation plan** in `09_implementation_plan.md`: ~44–54h chat / 5–9 weeks elapsed at 2–3 sessions/week.
  - **4 top-tier residual risks** identified with mitigations cited (`11_final_consolidation.md` §11.5).
  - **0 D-01 fires** this session (documentation-only). T-MCP-02 quota unchanged at 41.
  - **Net P0+P1 open: 8 unchanged.** Architecture review work was design closure not finding closure. 17 build-blockers will appear in P0+P1 count once Phase 0 begins.
  - **Closure budget**: ~10–12h chat across 11 sequential turns + ~1h sync close. Day total ~14h with v2.45. Trailing-14-day ~46h above 8.0 floor.
  - **Zero production mutations** across all 11 turns. Read-only throughout. No vault edit. No manual cron trigger. No EF deploy.
  - **Hold-state respected throughout** (no Stage 2b/3, no P1 triage, no NY×YT, no M6, no DDL/DML, no close-the-loop UPDATEs, no heygen-creator/poller/draft-notifier deploys, `m.ef_drift_log` 98 rows preserved).
  - **S30 still pending natural fire 17:00 UTC tonight** as in v2.45. Next action: S30 around 17:15 UTC / 03:15 AEST tomorrow.
  - **Phase 0 prerequisites** identified: S30 cleared + M5–M8 reconciliation + 7 confirm-defaults blockers (`11_final_consolidation.md` §11.4 items 3–9).
  - **Dating note**: architecture review docs carry "Created 2026-05-06 (Sydney)" footers based on running UTC perspective; actual Sydney close is 2026-05-07. 1-day discrepancy not retroactively fixed.
  - **`00_overview.md` 11-section table out-of-sync** with actual sections; required updates in `11_final_consolidation.md` §11.1; deferred to PK action.
  - **F-AAP-NEEDS-REVIEW-BACKLOG closure target** moves from "future" to architecture review Phase 2 B-09-14 (bulk approve UI with Q5 default UX).
  - **EF drift panel placement** reserved slot under NOW > Investigate per `06_final_target_design.md` §6.9; full implementation gates on F-EF-DRIFT-PREVENTION Stage 2b shipping (`09_implementation_plan.md` Phase 4 B-09-36).
  - **Reopen triggers documented**: 5 conditions that would reopen the architecture review (`11_final_consolidation.md` §11.7); amendment-doc protocol at `docs/dashboard-review-2026-05/amendments/` for in-build discoveries.
  - **Hold until S30 window.** Next action: S30 around 17:15 UTC / 03:15 AEST tomorrow, then PK confirms 7 Phase 0 defaults, then Phase 0 starts.
