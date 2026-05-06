# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-07 Sydney (v2.45 — **lightweight checkpoint.** S30 deferred to natural cron fire (~11.5h away, 17:00 UTC tonight). Read-only re-evaluation: PP×YT + LinkedIn-PP clusters CLEARED, NY×YT STILL BLOCKED by F-YT-NY-FORMAT-SELECTION. Invegent IG backlog observed under same root cause as NY/PP IG (jobid 53 paused). No NULL scheduled_for. Active publisher crons green. F-AI-WORKER-PARSER-SKIP-BUG V3 PASS (28 jobs, 0 bugs); V5 PASS (4/4 sched written); V4 INCONCLUSIVE (no natural skip in 48h). Zero production mutations. ~35 min closure. Hold until S30 window.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **v2.45 application**: 0 D-01 fires this session (read-only). T-MCP-02 quota unchanged at 41.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is the approved target design. Stage 1 closed v2.41. **Stage 2a fully CLOSED v2.44.** Stages 2b + 3 sequenced behind. S30 verification gate before Stage 2b.

**STANDING RULE (Lesson #62, v2.41)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, the default is NOT automatic state-capture override.

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline. A discarded first attempt cannot fall out of session memory just because a later formally-authorised replay supersedes it.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~8 unchanged from v2.44 (cluster re-eval and parser acid test were monitoring tasks, not closures) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~36.25h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed (after S30) |

**This session's closure hours: ~35 min** (option 6 stuck-cluster recheck + option 4 parser acid test + this checkpoint sync).

**Day total: ~10h** (Stage 1 morning + Stage 2a checkpoint afternoon + investigation + cron close + this checkpoint).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-07 Sydney (v2.45).
> **This session: lightweight checkpoint; hold until S30 window.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **S30** — forward verification of first automated drift-check cron fire | **P1 TOP** | Cron live since v2.44; first natural fire 17:00 UTC tonight (~11.5h away). | Run S30 ~17:15 UTC / 03:15 AEST tomorrow: confirm jobid 80 ran, jobid 81 ran or scheduled, new `drift_check_run_id` exists with 49 rows, errors empty, SD-risk count = 3, `vw_ef_drift_current` updated, no duplicate scans. |
| 2 | **F-EF-DRIFT-PREVENTION Stage 2b** | P1 (after S30 green) | Stage 2a CLOSED v2.44; cron live; S30 gates Stage 2b. | After S30 PASS: design dashboard drift panel reading `m.vw_ef_drift_current` + filtered queries. Class buckets, P1 SECURITY-DEFINER highlighted, B-FD informational, repo-only directories listed separately. ~1–2h. |
| 3 | **F-EF-DRIFT-PREVENTION Stage 3** | P1 | After Stage 2b. | `scripts/safe-deploy.sh` wrapper. ~30 min. |
| 4 | **P1 SECURITY-DEFINER regression-risk triage** | P1 | After Stage 2b live. | Sync repo → deployed via Windows CLI for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`. |
| 5 | **insights-worker P1 functional drift** | P1 | After Stage 2b live + P1 triage. | PK reviews deployed source for correctness, then decides sync direction. |

**Demoted from prior Today/Next 5 in v2.44→v2.45 cycle:**

- (none promoted/demoted; v2.45 is a lightweight checkpoint within the same hold-state)

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (v2.45 update)

Unchanged from v2.44 — Stage 2a fully CLOSED. Both crons live (jobid 80 + 81), `active=true`. **0 runs ever** in `cron.job_run_details` for either job (correct — first natural fire is 17:00 UTC tonight). S30 verification is the gate to Stage 2b.

---

## 🟢 Tier 1 + M4 + M5 + F-YT-OAUTH-PP queue integrity & stability remediation — STATUS BLOCK

**v2.45 confirmation:** Read-only re-eval of stuck-item clusters confirms M4 + F-YT-OAUTH-PP held cleanly:
- M4 (NULL scheduled_for fix): 0 NULL `scheduled_for` rows in active queue v2.45.
- F-YT-OAUTH-PP: 4 PP×YT publishes confirmed at 05-05 09:15–09:45 UTC. 0 `invalid_grant` errors anywhere in last 7d.

M6-M8 still pending. M6 Phase A explicitly BLOCKED behind Stage 2b close + P1 triage per v2.44/v2.45.

---

## 🔄 Standing session-start checks

Unchanged from v2.40 (S1–S29). **S30 added v2.45**: forward verification of first automated drift-check cron fire. Run after natural fire window (17:00 UTC daily).

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged. **v2.45 status delta**: First automated drift-check scan tonight 2026-05-07 17:00 UTC = 03:00 AEST tomorrow.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 41 of 5)

**v2.45 application: 0 D-01 fires** this session (read-only).

Cumulative T-MCP-02 quota: 41 of 5. Cumulative T-MCP-08: 2. Cost still well under $0.50 cumulative.

---

## 🤖 Cowork automation (D182)

**v2.45 status delta:** No change. `docs/audit/health/2026-05-06.md` still absent at v2.45 close — carry as P3 follow-up. Cowork ruled out as bef6be96 caller (v2.43).

Sunset review: 12 May 2026.

---

## 🧭 ICE Dashboard Architecture Review (v2.35)

Unchanged. §1 (Current-state inventory) remains NEXT — when PK signals.

---

## 🟡 Active

Per v2.44 except:

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **S30** (NEW v2.45) | First automated drift-check cron fire verification | P1 TOP | Pending natural fire 17:00 UTC tonight | chat → next session | Run S30 ~17:15 UTC / 03:15 AEST tomorrow. |
| **3 stuck-item clusters re-evaluation** | LinkedIn-PP + YouTube-PP + YouTube-NY | — | **RE-EVAL CAPTURED v2.45** in session file. PP×YT + LI-PP CLEARED. NY×YT still blocked behind F-YT-NY-FORMAT-SELECTION. | — | (No further action; will re-check after F-YT-NY-FORMAT-SELECTION fix.) |
| **F-AI-WORKER-PARSER-SKIP-BUG V3-V5** | Forward acid-test of parser fix | P1 → P2 | **V3 + V5 PASS v2.45.** V4 INCONCLUSIVE (no natural skip in 48h window). | chat → future | V4 needs natural skip event OR synthetic test (mutation, deferred). Demoted to P2 monitoring. |
| **F-EF-DRIFT-PREVENTION Stage 2b** | Dashboard drift panel | P1 (after S30) | Sequenced after S30 green | chat → future session | Read `m.vw_ef_drift_current` + filtered drift queries; class buckets; P1 SECURITY-DEFINER highlighted. ~1–2h. |
| **F-EF-DRIFT-PREVENTION Stage 3** | `scripts/safe-deploy.sh` | P1 | PENDING | chat → future session | Author wrapper; commit; habit-builder. ~30 min. |
| **P1 SECURITY-DEFINER triage** | `heygen-avatar-creator` + `heygen-avatar-poller` + `draft-notifier` | P1 | Sequenced after Stage 2b live | PK + chat | Sync repo → deployed via Windows CLI; commit as sync-only commits. |
| **insights-worker P1 functional drift** | Deployed v14.0.0 vs repo v1.6.0 | P1 | D-PREV-07: no auto-sync; manual review first | PK | After Stage 2b live: PK reviews deployed source. |
| **F-YT-NY-FORMAT-SELECTION** (carry-forward) | Brief committed `ff5ae6ae` | P1 | **BLOCKED behind Stage 2b close + P1 triage**; v2.45 confirmed still gating NY×YT (8 text-format ready rows) | chat → future session | After triage clears: read v2.11.1 source post-build; locate `format-advisor-v1`; decide between 4 fix shapes. |
| **M6 Phase A** (carry-forward) | 108 historical Bug 3 dead-letter | P1 | **BLOCKED behind Stage 2b close + P1 triage**; v2.45 confirmed 32 NY-FB+PP-FB orphans still in scope | PK → chat → future session | After F-YT-NY-FORMAT-SELECTION clears: PK directs start. |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | After M6 Phase A. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P2 | v2.45 confirms 4/4 drafts have scheduled_for | chat → next session | Continue passive monitoring. |
| **Verify first automated drift-check scan** = S30 | (rolled into S30 above) | — | merged | — | — |
| **Invegent IG cap-throttle planning** (NEW v2.45) | When jobid 53 unblocks, ~104 IG-overdue posts will fire | P3 | OBSERVED, not actioning | chat → T05 unblock session | Plan cap-throttle / rate-limit handling before re-enabling jobid 53. |
| **CFW post-ai-worker dead drafts** (NEW v2.45) | Drafts dying after AI succeeds | P3 | OBSERVED, not in F-AI-WORKER-PARSER-SKIP-BUG scope | chat → future session | Investigate downstream cap/approval pathway. Stage 2b dashboard panel will surface. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session if still absent | Investigate Cowork status. |
| **ICE Dashboard Architecture Review** | 11-section formal review | strategic-product | KICKOFF complete; §1 next | chat ↔ PK | PK signals start. |
| (others) | per v2.44 | — | — | — | per v2.44 |

**Closed v2.45:**

- (none formally; lightweight checkpoint. Stuck-cluster re-eval delivered output but cluster items remain in monitoring state. F-AI-WORKER-PARSER-SKIP-BUG V3+V5 PASS but V4 inconclusive.)

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

**v2.45 changes**:

- **NEW v2.45**: S30 forward verification task (P1 TOP next session).
- **OBSERVED v2.45**: Invegent IG cap-throttle planning (P3) — ~104 IG-overdue when jobid 53 unblocks.
- **OBSERVED v2.45**: CFW post-ai-worker dead drafts (P3) — downstream issue, dashboard panel candidate.
- **DEMOTED v2.45**: F-AI-WORKER-PARSER-SKIP-BUG from P1 to P2 (V3+V5 PASS; V4 monitoring only).
- **CONFIRMED v2.45**: M4 NULL `scheduled_for` fix held; F-YT-OAUTH-PP held; no `invalid_grant` errors 7d.

**v2.44 changes** (still active):

- F-EF-DRIFT-PREVENTION Stage 2a finalisation CLOSED.
- D-01 review `c261e338` close-the-loop UPDATE pending.

**v2.43 changes** (still active):

- bef6be96 origin investigation CLOSED.
- Lesson candidate #68 captured.
- 98 rows in `m.ef_drift_log` preserved by design.

**v2.42 changes** (still active where relevant):

- 5 lesson candidates surfaced #63-#67.
- drift-check v1.0.8 deployed.

**v2.41 + v2.40 + v2.39 + v2.38 + v2.37 + v2.36 + v2.35 + v2.34 + v2.33 changes**: per v2.44.

**Carried from v2.31**: per v2.44.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Per v2.44. No new candidates v2.45. Lesson #68 not exercised this session (no fired writes).

---

## v2.45 honest limitations

- All v2.31-v2.44 limitations apply.
- **F-AI-WORKER-PARSER-SKIP-BUG V4 inconclusive.** Skip-path hasn't been exercised by natural data in 48h. Two options for closure: (a) wait for natural skip event, (b) deliberately schedule a synthetic test with a known skip-cause input. Both deferred.
- **CFW post-ai-worker dead drafts** observed but not investigated this session.
- **Cron 80/81 have 0 runs in `cron.job_run_details`** — correct, first natural fire is 17:00 UTC tonight. S30 will validate.
- **Standing don't-redeploy** for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` (P1 SECURITY-DEFINER regression-risk).
- **`m.ef_drift_log` retains 98 rows by design** (carry-over).
- **17+ close-the-loop UPDATEs still pending** (carry-over). Combine in next batch closure.
- **`docs/audit/health/2026-05-06.md` absent** (carry-over).
- **Closure budget remains well above floor** (~36.25h trailing-14-day).

---

## Changelog

- v1.0–2.44: per previous changelog.
- **v2.45 (2026-05-07 Sydney, lightweight checkpoint — S30 paused / stuck-cluster recheck):**
  - **S30 deferred** to natural cron fire 17:00 UTC tonight (~11.5h). jobid 80 + 81 both `active=true`, 0 runs ever (correct).
  - **Read-only re-evaluation of 3 stuck-item clusters:** PP×YT CLEARED (4 publishes confirmed); LinkedIn-PP CLEARED (17/7d, 0 fail); NY×YT STILL BLOCKED by F-YT-NY-FORMAT-SELECTION.
  - **Side findings:** Invegent IG 6 queued + same root cause as NY/PP IG (jobid 53 paused); 32 historical orphans = M6 Phase A scope; CFW post-ai-worker dead drafts (downstream issue).
  - **F-AI-WORKER-PARSER-SKIP-BUG forward acid test:** V3 PASS (28 jobs, 0 bug fingerprints). V5 PASS (4/4 sched written). V4 INCONCLUSIVE (no natural skip in 48h). Demoted P1 → P2.
  - **Health checks:** 0 invalid_grant 7d; 0 NULL scheduled_for; active publisher crons all green (IG cron paused intentionally).
  - **0 D-01 fires** this session (read-only). T-MCP-02 quota unchanged at 41.
  - **Net P0+P1 open: 8 unchanged** (cluster re-eval and parser acid test were monitoring, not closures).
  - **Closure budget**: +~35 min this checkpoint. Day ~10h. Trailing-14-day ~36.25h above 8.0 floor.
  - **Zero production mutations.** Read-only throughout.
  - **Hold until S30 window.** Next action: S30 around 17:15 UTC / 03:15 AEST tomorrow.
