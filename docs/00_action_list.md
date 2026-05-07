# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-07 Sydney (v2.47 — **S30 PASS + Stage 2b kickoff.** Cron-backed drift logging confirmed LIVE end-to-end: jobid 80 fired 2026-05-06 17:00 UTC, succeeded, wrote 49 rows under `c3446a47`. `m.ef_drift_log` 98 → 147. All 8 S30 criteria PASS. Class distribution stable across all 3 runs. 3 SD-risk = standing don't-redeploy three. v2.46 UTC/Sydney framing recorded as documentation-only error per PK directive. Stage 2b brief authored at `docs/briefs/2026-05-07-f-ef-drift-prevention-stage-2b.md` with §1.5 Pre-flight discovery added per D-01 corrected_action. D-01 review `e0ab4a0b` returned partial/escalate (Lesson #62 echo pattern). PK approval gate before CC hand-off. T-MCP-02 41 → 42. Stage 3 + P1 SD triage held until Stage 2b ships. 0 production mutations. Hold-state respected throughout.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S30)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **v2.47 application**: 1 D-01 fire on Stage 2b brief plan_review (`e0ab4a0b`); 0 fires on production patches (no apply work this session). T-MCP-02 quota cumulative 42.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is the approved target design. Stage 1 closed v2.41. Stage 2a closed v2.44. **Stage 2a verified end-to-end via S30 v2.47.** Stages 2b + 3 sequenced behind. **S30 fully cleared.**

**STANDING RULE (Lesson #62, v2.41)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, the default is NOT automatic state-capture override. **v2.47 application**: Stage 2b brief D-01 review fired Lesson #62 pattern. Path chosen = incorporation (added §1.5 Pre-flight discovery) over override. PK approval gate held.

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline. A discarded first attempt cannot fall out of session memory just because a later formally-authorised replay supersedes it.

**STANDING RULE (v2.46 — Dashboard Architecture Review)**: All architecture-level decisions for ICE Dashboard live in `docs/dashboard-review-2026-05/`. Reopen triggers documented in `11_final_consolidation.md` §11.7. Amendment-doc protocol at `docs/dashboard-review-2026-05/amendments/` for in-build discoveries.

**STANDING RULE (v2.47 NEW — Documentation framing)**: Sync_state framing of cron timing should always anchor to **UTC clock-time + Sydney clock-time** for the upcoming fire window, not "tonight" without qualifier. v2.46 used "first natural fire 17:00 UTC tonight" and the bare "tonight" caused session-opener misparse. Future sync_states write fire windows as e.g. "first natural fire 2026-05-06 17:00 UTC = 03:00 AEST 7 May Sydney."

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~8 unchanged from v2.46 (Stage 2b brief is design closure not finding closure; the 17 architecture build-blockers will appear in P0+P1 count once Phase 0 begins) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~48h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~2h** (S30 investigation + brief + D-01 + 4-way sync close).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-07 Sydney (v2.47).
> **This session: S30 PASS + Stage 2b brief; PK approval gate before CC hand-off.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **PK approval on Stage 2b brief** | **P1 TOP** | D-01 escalate=true; chat does not auto-proceed | PK reads `docs/briefs/2026-05-07-f-ef-drift-prevention-stage-2b.md` §1.5 + §10 + §12. Confirms or revises. Hands to CC. |
| 2 | **CC builds Stage 2b panel** | P1 | After PK approves brief | CC follows §1.5 Pre-flight discovery → adapts to actual repo conventions → ships at `/admin/ef-drift` (or adapted route). Writes result file. ~1.5–2h. Vercel auto-deploys main. |
| 3 | **Stage 2b post-ship verification** | P1 | After CC ships | Chat runs 5 SQL queries from brief §8. Confirms 49 rows / 3 SD-risk / 6 active findings render correctly. ~10 min. |
| 4 | **F-EF-DRIFT-PREVENTION Stage 3** | P1 | After Stage 2b verified live | `scripts/safe-deploy.sh` consumes `m.vw_ef_drift_current`. ~30 min. |
| 5 | **P1 SECURITY-DEFINER regression-risk triage** | P1 | After Stage 3 | Sync repo → deployed via Windows CLI for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`. |

**Demoted from prior Today/Next 5 in v2.46→v2.47 cycle:**

- **S30** — closed PASS this session; removed from active list.
- **Dashboard Architecture Review Phase 0 prerequisites** — demoted from #2 to #11 (Active section). Phase 0 work is independent of Stage 2b/3 timeline; PK can confirm 7 default-blockers in parallel but the cron-backed drift work has natural priority through S30 closure → Stage 2b ship → Stage 3.

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (v2.47 update)

**v2.47 NEW**: S30 fully closed PASS. Cron-backed drift logging is LIVE end-to-end. `m.ef_drift_log` 98 → 147 rows from cron fire. Stage 2b brief authored.

**Stage status:**
- Stage 1: CLOSED v2.41
- Stage 2a: CLOSED v2.44; verified end-to-end via S30 v2.47
- Stage 2b: brief authored v2.47, awaiting PK approval → CC build → chat verify
- Stage 3: held until Stage 2b shipped + verified

**Cron status (all live):**
- jobid 80 `drift-check-daily-fire` — `0 17 * * *` UTC, `active=true`, **1 successful run** (164707, 2026-05-06 17:00:00 UTC)
- jobid 81 `ef-drift-log-retention-90d` — `15 17 * * *` UTC, `active=true`, **1 successful run** (164756, `DELETE 0`)
- Next fire window: 2026-05-07 17:00 UTC = 03:00 AEST 8 May Sydney

**Architecture review final placement** (Phase 4 B-09-36): drift panel relocated to NOW > Investigate per `06_final_target_design.md` §6.9. Stage 2b is interim; brief explicitly forbids top-nav/sidebar link.

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK

**Status:** COMPLETE at v2.46. 12 docs at `docs/dashboard-review-2026-05/`.

**v2.47 update on hard blockers:**
- ✅ S30 cleared — first hard blocker DONE.
- 🔲 M5–M8 reconciliation — second hard blocker still pending.
- 🔲 7 Phase 0 confirmation-blocker defaults — pending PK confirm/override.

**Phase 0 still gated**, but one of the two hard blockers is now cleared.

**Reopen triggers:** see `11_final_consolidation.md` §11.7.

**Amendment-doc protocol:** new docs at `docs/dashboard-review-2026-05/amendments/YYYY-MM-DD-{slug}.md`.

---

## 🟢 Tier 1 + M4 + M5 + F-YT-OAUTH-PP queue integrity & stability remediation — STATUS BLOCK

Unchanged from v2.46. M6–M8 still pending. M6 Phase A explicitly BLOCKED behind Stage 2b ship + Stage 3 + P1 SD triage.

**v2.47 NEW**: Architecture review's Phase 0 M-09-03 (`m.vw_pipeline_state` view) must reconcile with M5–M8 schema changes. Sequencing decision = Phase 0 hard blocker per `09_implementation_plan.md` §9.13.

---

## 🔄 Standing session-start checks

S1–S29 unchanged from v2.46. **S30 closed PASS v2.47**; remains documented as a one-time verification that has now passed. No replacement S30-equivalent added — daily cron fires are now self-monitoring via `m.ef_drift_log` row growth.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged. **v2.47 status delta**: First automated drift-check cron fire 2026-05-06 17:00 UTC = succeeded; next fire 2026-05-07 17:00 UTC = 03:00 AEST 8 May.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 42 of 5)

**v2.47 application**: 1 D-01 fire (`e0ab4a0b` on Stage 2b brief plan_review). Verdict `partial`, escalate=true, Lesson #62 echo pattern, incorporation chosen over override.

Cumulative T-MCP-02 quota: 42 of 5. Cumulative T-MCP-08: 2. Cost still well under $0.50 cumulative.

---

## 🤖 Cowork automation (D182)

**v2.47 status delta:** No change. `docs/audit/health/2026-05-06.md` still absent at v2.47 close — carry as P3 follow-up.

Sunset review: 12 May 2026.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Stage 2b brief PK approval** (NEW v2.47) | D-01 escalate=true on `e0ab4a0b`; PK gate before CC hand-off | P1 TOP | Awaiting PK | PK | Read brief §1.5 + §10 + §12. Confirm or revise. |
| **Stage 2b panel build** (NEW v2.47) | CC implements `/admin/ef-drift` panel per brief | P1 | Pending PK approval | CC | After approval: §1.5 pre-flight → build → result file → push. ~1.5–2h. |
| **Stage 2b post-ship verification** (NEW v2.47) | Chat runs 5 SQL queries from brief §8 against live deployment | P1 | Pending CC ship | chat → next session | After Vercel deploys: row count + class distribution + SD-risk pinning + active drift + run identity. ~10 min. |
| **F-EF-DRIFT-PREVENTION Stage 3** | `scripts/safe-deploy.sh` | P1 | Held until Stage 2b verified | chat → future session | Author wrapper consuming `m.vw_ef_drift_current`. ~30 min. |
| **P1 SECURITY-DEFINER triage** | `heygen-avatar-creator` + `heygen-avatar-poller` + `draft-notifier` | P1 | Held until Stage 3 | PK + chat | Sync repo → deployed via Windows CLI; sync-only commits. |
| **insights-worker P1 functional drift** | Deployed v14.0.0 vs repo v1.6.0 | P1 | D-PREV-07: no auto-sync; manual review | PK | After Stage 3: PK reviews deployed source. |
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults + M5–M8 reconciliation | P1 | S30 cleared v2.47; remaining blockers pending | PK | Review §11.4 items 3–9; confirm defaults or propose alternatives. M5–M8 reconciliation independent. |
| **F-YT-NY-FORMAT-SELECTION** (carry-forward) | Brief committed `ff5ae6ae` | P1 | BLOCKED behind Stage 3 + P1 triage | chat → future session | After triage clears: read v2.11.1 source post-build; locate `format-advisor-v1`; decide between 4 fix shapes. |
| **M6 Phase A** (carry-forward) | 108 historical Bug 3 dead-letter | P1 | BLOCKED behind Stage 3 + P1 triage | PK → chat → future session | Coordinate with M-09-03 view definition from architecture review. |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | After M6 Phase A. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P2 | Passive monitoring | chat → next session | Continue passive monitoring. |
| **Invegent IG cap-throttle planning** | When jobid 53 unblocks, ~104 IG-overdue posts will fire | P3 | OBSERVED, not actioning | chat → T05 unblock session | Plan cap-throttle / rate-limit handling before re-enabling. |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | Investigate downstream cap/approval pathway. Stage 2b panel may surface. |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED, not actioning | chat → future session | Read-only scope-check; rename if appropriate. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session if still absent | Investigate Cowork status. |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates in `11_final_consolidation.md` §11.1 | chat → future session | Update `00_overview.md`. ~15 min. |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 bulk approve | chat → Phase 2 session | After Phase 0 + Phase 1: bulk approve UI in Phase 2. |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried v2.45/v2.46/v2.47 | chat → dedicated session | Open `app/(dashboard)/roadmap/page.tsx` and bring PHASES + LAST_UPDATED current. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 needs natural skip event OR synthetic test. |

**Closed v2.47:**

- **🎉 S30 — first automated drift-check cron fire verification** PASS (all 8 criteria). Cron-backed drift logging is LIVE end-to-end. `m.ef_drift_log` 98 → 147 rows. 3 SD-risk = standing don't-redeploy three.

**Closed v2.46:** Dashboard Architecture Review of 2026-05.
**Closed v2.45:** (none — lightweight checkpoint).
**Closed v2.44:** F-EF-DRIFT-PREVENTION Stage 2a finalisation.
**Closed v2.43:** bef6be96 origin investigation.
**Closed v2.42:** (none)
**Closed v2.41:** F-EF-DRIFT-PREVENTION Stage 1.
**Closed v2.40:** F-EF-DRIFT-PREVENTION investigation phase.

---

## 💼 Personal businesses

*(none flagged at session start — PK directed straight to S30; ICE proceeded)*

---

## 📌 Backlog

**v2.47 changes**:

- **NEW v2.47**: Stage 2b brief PK approval gate (#1 in Today/Next 5).
- **NEW v2.47**: Stage 2b panel build by CC (#2).
- **NEW v2.47**: Stage 2b post-ship verification (#3).
- **NEW v2.47**: Documentation framing standing rule — UTC + Sydney clock-time always specified.
- **REMOVED v2.47**: S30 (closed PASS).
- **DEMOTED v2.47**: Dashboard Architecture Review Phase 0 prerequisites — independent of Stage 2b/3 timeline; can run in parallel but lower than the cron-drift workstream.

**v2.46 changes** (still active): per v2.46.

**v2.45 + v2.44 + v2.43 + v2.42 + v2.41 + v2.40 + v2.39 + v2.38 + v2.37 + v2.36 + v2.35 + v2.34 + v2.33 changes**: per v2.46.

**Carried from v2.31**: per v2.46.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Per v2.46. **No new candidates v2.47** (S30 verification + brief authoring is well-trodden ground; D-01 review fired Lesson #62 echo pattern as expected). Lesson candidate #69 from v2.45 still on probation.

**Lesson observation v2.47 (informal, not promoted):** Sync_state framing of UTC clock-time should always be paired with Sydney clock-time for the upcoming fire window. v2.46 used "tonight" without qualifier and the bare "tonight" caused session-opener misparse (interpreted as 17:00 UTC of the next day rather than 17:00 UTC of the same day). Documentation framing rule promoted to standing rule above. Single occurrence; not a pattern yet.

---

## v2.47 honest limitations

- All v2.31-v2.46 limitations apply.
- **PK approval gate on Stage 2b brief** is genuine — D-01 escalate=true. Chat does not auto-proceed to CC hand-off. PK direction or revision needed.
- **GitHub write tools were initially not loaded in this session** (web/mobile chat surface) — `Invegent GitHub` MCP is read-only. After PK enabled GitHub MCP write tools mid-session, v2.47 deliverables (session file, sync_state, action_list, brief) committed directly via `github:push_files` and `github:create_or_update_file`.
- **No verification that the `bef6be96` lesson #68 fix has held** (only 3 distinct runs in `m.ef_drift_log`; if a fourth chat-spawned scan appeared, lesson #68 hygiene would be re-tested, but no such opportunity has arisen this session).
- **Dashboard roadmap PHASES still stale** — third consecutive session deferring this. P3 risk: roadmap claims phase positions that don't reflect the locked architecture review or the Stage 2b interim location.
- **Stage 2b interim location** at `/admin/ef-drift` will be relocated in Phase 4 B-09-36; PK and CC accept the small UI-rework cost (recreating panel under NOW > Investigate eventually) as the cost of shipping Stage 2b before Phase 4.

---

## Changelog

- v1.0–2.46: per previous changelog.
- **v2.47 (2026-05-07 Sydney, S30 PASS + Stage 2b kickoff):**
  - **S30 closed PASS** (all 8 criteria) — cron-backed drift logging is LIVE end-to-end. jobid 80 fired 2026-05-06 17:00 UTC, succeeded, wrote 49 rows under `c3446a47`. jobid 81 fired 17:15 UTC, `DELETE 0` (no rows >90d).
  - **`m.ef_drift_log` 98 → 147 rows.** 3 distinct `drift_check_run_id` values. Class distribution stable across all 3 runs (A=16, A-LE=9, B-RR=5, B-FD=1, C=9, D=7, repo-only=2).
  - **3 SD-risk rows confirmed = standing don't-redeploy three** (`draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller`).
  - **v2.46 UTC/Sydney framing recorded as documentation-only error** per PK directive. Cron behaved as scheduled. Standing rule added: sync_state framing always pairs UTC with Sydney clock-time for fire windows.
  - **Stage 2b brief authored** at `docs/briefs/2026-05-07-f-ef-drift-prevention-stage-2b.md` (12 sections, includes §1.5 Pre-flight discovery added per D-01 corrected_action). Target: `Invegent/invegent-dashboard`. Estimated CC effort 1.5–2h. Interim location `/admin/ef-drift`, no top-nav link, Phase 4 B-09-36 will relocate to NOW > Investigate.
  - **D-01 review** `e0ab4a0b-3593-4323-ade5-076b90c1343b`: `partial` / `escalate=true` / risk `medium` / confidence `medium`. Pushback was Lesson #62 echo pattern. corrected_action incorporated as §1.5. PK approval gate before CC hand-off.
  - **Stage 3 + P1 SECURITY-DEFINER triage** held until Stage 2b ships and PK has inspected.
  - **Closure budget**: ~2h chat. Trailing-14-day ~48h above 8.0 floor. 1 D-01 fire (plan_review). T-MCP-02 cumulative 42.
  - **0 production mutations** across full session. Read-only SQL only. No EF deploys, no cron triggers, no DDL/DML, no close-the-loop UPDATEs, no vault edits.
  - **Hold-state respected throughout** — `m.ef_drift_log` row growth from expected cron fire only, not chat-authored.
  - **GitHub write constraint resolved mid-session** — PK enabled GitHub MCP write tools after initial check returned read-only. Final 4-way sync committed atomically via push_files + create_or_update_file: docs/briefs/2026-05-07-f-ef-drift-prevention-stage-2b.md (NEW) + docs/runtime/sessions/2026-05-07-s30-pass-stage2b-kickoff.md (NEW) + docs/00_sync_state.md (REPLACE) + docs/00_action_list.md (REPLACE).
