# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-07 Sydney (v2.48 — **Stage 2b SHIPPED + ACCEPTED on desktop.** CC commits `66aea99` (dashboard) + `9564297` (result file). Live at `dashboard.invegent.com/ef-drift` (route adapted from brief's `/admin/ef-drift` per §1.5 pre-flight). 5/5 SQL V1–V5 PASS. PK visual acceptance 7/7 desktop checks PASS. Pre-flight (§1.5) deltas: no `/admin/*` group; single-tier middleware auth (reused); Tailwind+lucide only (no shadcn). Mobile responsiveness bucketed as **system-wide P3** (whole-dashboard gap, not Stage 2b scope). Stage 3 + P1 SECURITY-DEFINER triage trio NEWLY UNBLOCKED. F-YT-NY-FORMAT-SELECTION + M6 Phase A still BLOCKED behind P1 triage. Hold-state respected; 0 production mutations chat-side.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch + action_list version bump goes through ChatGPT cross-check before deploy/commit. **v2.48 application**: 0 D-01 fires (verification + acceptance work, not a new patch). T-MCP-02 cumulative unchanged at 42.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is approved target design. Stage 1 closed v2.41. Stage 2a closed v2.44. **Stage 2a verified end-to-end via S30 v2.47.** **Stage 2b CLOSED v2.48 — shipped + accepted on desktop.** Stage 3 newly UNBLOCKED.

**STANDING RULE (Lesson #62, v2.41)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, default is NOT automatic state-capture override. **v2.47 application**: Stage 2b brief D-01 review fired Lesson #62 pattern; incorporation chosen over override. **v2.48: incorporation path validated** — CC's pre-flight discovery surfaced 3 deltas, all adapted cleanly without scope drift.

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline.

**STANDING RULE (v2.46 — Dashboard Architecture Review)**: All architecture-level decisions live in `docs/dashboard-review-2026-05/`. Reopen triggers in `11_final_consolidation.md` §11.7. Amendment-doc protocol at `docs/dashboard-review-2026-05/amendments/`.

**STANDING RULE (v2.47 — Documentation framing)**: Sync_state framing of cron timing always anchors to **UTC clock-time + Sydney clock-time** for the upcoming fire window, not "tonight" without qualifier.

**STANDING RULE (v2.48 NEW — Pre-flight discovery as standard CC pattern)**: §1.5-style pre-flight discovery (verify route convention, auth gate, UI library against actual repo before coding) is now the **default brief pattern** for any CC dashboard/portal/web work. v2.47 added it post-D-01; v2.48 validated the value (3 deltas surfaced, all adapted cleanly). Future briefs targeting front-end repos should include §1.5-equivalent pre-flight section by default rather than waiting for D-01 to flag it.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~8 unchanged from v2.47 (Stage 2b ship is closure of an Active item but doesn't reveal new findings; Stage 3 + P1 triage now in priority queue but were already counted) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~49.5h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~1.5h** (verification + visual acceptance review + 4-way sync close).

**Day total v2.47 + v2.48: ~3.5h.**

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-07 Sydney (v2.48).
> **This session: Stage 2b SHIPPED + ACCEPTED on desktop. Stage 3 + P1 SD triage NEWLY UNBLOCKED.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **F-EF-DRIFT-PREVENTION Stage 3** | **P1 TOP** | Newly UNBLOCKED v2.48 — Stage 2b accepted on desktop | Author `scripts/safe-deploy.sh` consuming `m.vw_ef_drift_current`. ~30 min. D-01 review before commit. |
| 2 | **P1 SECURITY-DEFINER regression-risk triage** | P1 | Newly UNBLOCKED v2.48 | Sync repo → deployed via Windows CLI for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`. Sync-only commits. Sequenced after Stage 3. |
| 3 | **insights-worker P1 functional drift** | P1 | D-PREV-07: manual review, no auto-sync | PK reviews deployed source v14.0.0 vs repo v1.6.0. After Stage 3. |
| 4 | **Personal businesses check-in** | P0 | Standing P0 — last asked v2.46 | PK reports any time-sensitive items from Care for Welfare / Property / NDIS Accessories. |
| 5 | **Dashboard Architecture Review Phase 0 prerequisites** | P1 | Independent of Stage 3 timeline; can run in parallel | PK confirms 7 default-blockers in `11_final_consolidation.md` §11.4. M5–M8 reconciliation independent. |

**Demoted from prior Today/Next 5 (v2.47 → v2.48):**

- **Stage 2b PK approval** — CLOSED v2.48 (PK approved mid-session).
- **Stage 2b panel build (CC)** — CLOSED v2.48 (commit `66aea99`).
- **Stage 2b post-ship verification (chat)** — CLOSED v2.48 (5/5 SQL PASS).
- **Stage 3** — promoted #4 → #1 (newly unblocked).
- **P1 SECURITY-DEFINER triage** — promoted #5 → #2 (newly unblocked).

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (v2.48 update)

**v2.48 NEW**: Stage 2b SHIPPED + ACCEPTED on desktop. Stage 3 + P1 triage UNBLOCKED.

**Stage status:**
- Stage 1: CLOSED v2.41
- Stage 2a: CLOSED v2.44; verified end-to-end via S30 v2.47
- Stage 2b: **CLOSED v2.48** — `dashboard.invegent.com/ef-drift` live, 5/5 SQL + 7/7 PK visual PASS
- Stage 3: **UNBLOCKED v2.48** — eligible for next session

**Cron status (all live, unchanged from v2.47):**
- jobid 80 `drift-check-daily-fire` — `0 17 * * *` UTC, `active=true`
- jobid 81 `ef-drift-log-retention-90d` — `15 17 * * *` UTC, `active=true`
- Next fire window: 2026-05-07 17:00 UTC = 03:00 AEST 8 May Sydney

**Live dashboard surface:** `dashboard.invegent.com/ef-drift`. Direct URL only — no top-nav/sidebar link per brief §4. Phase 4 B-09-36 will relocate to NOW > Investigate.

**Architecture review final placement** (Phase 4 B-09-36): drift panel relocated to NOW > Investigate per `06_final_target_design.md` §6.9.

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK

**Status:** COMPLETE at v2.46. 12 docs at `docs/dashboard-review-2026-05/`.

**v2.48 update on hard blockers:**
- ✅ S30 cleared v2.47 — first hard blocker DONE.
- 🔲 M5–M8 reconciliation — second hard blocker still pending.
- 🔲 7 Phase 0 confirmation-blocker defaults — pending PK confirm/override.

**Phase 0 still gated**, but one of two hard blockers cleared.

**Reopen triggers:** see `11_final_consolidation.md` §11.7.

**Amendment-doc protocol:** new docs at `docs/dashboard-review-2026-05/amendments/YYYY-MM-DD-{slug}.md`.

---

## 🟢 Tier 1 + M4 + M5 + F-YT-OAUTH-PP queue integrity & stability remediation — STATUS BLOCK

Unchanged from v2.46/v2.47. M6–M8 still pending. M6 Phase A explicitly BLOCKED behind Stage 3 + P1 SD triage.

**v2.47 carry**: Architecture review's Phase 0 M-09-03 (`m.vw_pipeline_state` view) must reconcile with M5–M8 schema changes.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. **S30 closed PASS v2.47**, remains documented as a one-time verification. Daily cron fires self-monitor via `m.ef_drift_log` row growth.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged. **v2.48 status delta**: Next drift cron fire 2026-05-07 17:00 UTC = 03:00 AEST 8 May (will increment `m.ef_drift_log` from 147 → 196 rows).

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 42 of 5)

**v2.48 application**: 0 D-01 fires (verification + acceptance work, not a new patch).

Cumulative T-MCP-02: 42. Cumulative T-MCP-08: 2.

---

## 🤖 Cowork automation (D182)

**v2.48 status delta:** No change. `docs/audit/health/2026-05-06.md` still absent — carry as P3 follow-up. Sunset review: 12 May 2026.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **F-EF-DRIFT-PREVENTION Stage 3** | `scripts/safe-deploy.sh` | P1 TOP | NEWLY UNBLOCKED v2.48 | chat → next session | Author wrapper consuming `m.vw_ef_drift_current`. ~30 min. D-01 review. |
| **P1 SECURITY-DEFINER triage** | `heygen-avatar-creator` + `heygen-avatar-poller` + `draft-notifier` | P1 | NEWLY UNBLOCKED v2.48 | PK + chat | After Stage 3: sync repo → deployed via Windows CLI; sync-only commits. |
| **insights-worker P1 functional drift** | Deployed v14.0.0 vs repo v1.6.0 | P1 | D-PREV-07: manual review | PK | After Stage 3: PK reviews deployed source. |
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults + M5–M8 reconciliation | P1 | S30 cleared v2.47; M5–M8 + defaults pending | PK | Review §11.4 items 3–9; confirm defaults or propose alternatives. M5–M8 reconciliation independent. |
| **F-YT-NY-FORMAT-SELECTION** (carry-forward) | Brief committed `ff5ae6ae` | P1 | BLOCKED behind P1 SD triage | chat → future session | After triage: read v2.11.1 source post-build; locate `format-advisor-v1`; decide between 4 fix shapes. |
| **M6 Phase A** (carry-forward) | 108 historical Bug 3 dead-letter | P1 | BLOCKED behind P1 SD triage | PK → chat → future session | Coordinate with M-09-03 view definition. |
| **Dashboard mobile responsiveness — system-wide** (NEW v2.48) | Whole-dashboard gap, not just `/ef-drift`; affects all tabs/views | P3 | OBSERVED, bucketed | chat → dedicated session OR Phase 1+ build | Either dedicated dashboard mobile-responsive session OR roll into architecture review Phase 1+ build sequence. |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | After M6 Phase A. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P2 | Passive monitoring | chat → next session | Continue passive monitoring. |
| **Invegent IG cap-throttle planning** | When jobid 53 unblocks, ~104 IG-overdue posts will fire | P3 | OBSERVED | chat → T05 unblock session | Plan cap-throttle / rate-limit handling. |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | Investigate downstream cap/approval pathway. `/ef-drift` panel may surface relevant signals. |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future session | Read-only scope-check; rename if appropriate. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session if still absent | Investigate Cowork status. |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates in `11_final_consolidation.md` §11.1 | chat → future session | Update `00_overview.md`. ~15 min. |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 bulk approve | chat → Phase 2 session | After Phase 0 + Phase 1: bulk approve UI in Phase 2. |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried v2.45/v2.46/v2.47/v2.48 (4th deferral) | chat → dedicated session | Open `app/(dashboard)/roadmap/page.tsx` and bring PHASES + LAST_UPDATED current. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 needs natural skip event OR synthetic test. |

**Closed v2.48:**

- **🎉 Stage 2b dashboard drift panel** — SHIPPED + ACCEPTED on desktop. CC commits `66aea99` (dashboard) + `9564297` (result file). Live at `dashboard.invegent.com/ef-drift`. 5/5 SQL V1–V5 + 7/7 PK desktop visual checks PASS. Pre-flight (§1.5) deltas all adapted cleanly: no `/admin/*` group → `/ef-drift`; single-tier middleware auth reused; Tailwind+lucide only.

**Closed v2.47:** S30 — first automated drift-check cron fire verification.
**Closed v2.46:** Dashboard Architecture Review of 2026-05.
**Closed v2.45:** (none — lightweight checkpoint).
**Closed v2.44:** F-EF-DRIFT-PREVENTION Stage 2a finalisation.
**Closed v2.43:** bef6be96 origin investigation.
**Closed v2.42:** (none)
**Closed v2.41:** F-EF-DRIFT-PREVENTION Stage 1.
**Closed v2.40:** F-EF-DRIFT-PREVENTION investigation phase.

---

## 💼 Personal businesses

*(none flagged at session start — PK directed straight to S30 + Stage 2b; ICE proceeded. Standing P0 to ask at next session start.)*

---

## 📌 Backlog

**v2.48 changes**:

- **CLOSED v2.48**: Stage 2b ship + verification + acceptance.
- **PROMOTED v2.48**: Stage 3 (#4 → #1), P1 SECURITY-DEFINER triage (#5 → #2).
- **NEW v2.48 (P3)**: Dashboard mobile responsiveness — system-wide gap, not Stage 2b scope.
- **NEW v2.48 standing rule**: Pre-flight discovery (§1.5-equivalent) is now default brief pattern for CC front-end work.

**v2.47 changes** (still active): per v2.47.

**v2.46 changes** (still active): per v2.47.

**v2.45 + v2.44 + v2.43 + v2.42 + v2.41 + v2.40 + v2.39 + v2.38 + v2.37 + v2.36 + v2.35 + v2.34 + v2.33 changes**: per v2.47.

**Carried from v2.31**: per v2.47.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Per v2.47. **No new candidates v2.48** (Stage 2b ship is well-trodden ground; pre-flight discovery worked exactly as expected and is being promoted to standing rule above rather than logged as a lesson candidate).

**Lesson observation v2.48 (informal):** When CC executes a brief that includes a §1.5-style pre-flight discovery section, the discovery findings tend to surface 2–4 minor brief-vs-repo deltas, all of which can be adapted in-flight without scope drift or D-01 re-fire. This validates the v2.47 incorporation-over-override decision. Pattern is robust enough to promote to standard practice.

---

## v2.48 honest limitations

- All v2.31-v2.47 limitations apply.
- **Mobile responsiveness untested in production** — CC's code includes responsive Tailwind primitives but PK has not visually confirmed 375px rendering. Bucketed as system-wide P3; will be tested when whole-dashboard mobile work happens.
- **Dashboard roadmap PHASES still stale** — fourth consecutive deferral. P3 risk: roadmap claims phase positions that don't reflect current deployment state including Stage 2b ship.
- **Stage 2b interim location** at `/ef-drift` will be relocated in Phase 4 B-09-36 to NOW > Investigate. PK accepts the small UI-rework cost.
- **`/ef-drift` is reachable by any authed user** — single-tier middleware auth (no separate operator-role check). Acceptable for Stage 2b because: (a) no PII exposure, (b) read-only, (c) only PK has dashboard credentials currently. Future client-facing dashboard work will need auth tier expansion.
- **No verification that the bef6be96 lesson #68 fix has held** — only 3 distinct runs in `m.ef_drift_log`; no fourth chat-spawned scan opportunity.
- **17+ close-the-loop UPDATEs to `m.chatgpt_review` still pending** — quota-of-cleanups carried since v2.40+.

---

## Changelog

- v1.0–2.47: per previous changelog.
- **v2.48 (2026-05-07 Sydney, Stage 2b SHIPPED + ACCEPTED):**
  - **Stage 2b dashboard drift panel** SHIPPED + ACCEPTED on desktop. CC commits `66aea99` (dashboard) + `9564297` (result file). Live at `dashboard.invegent.com/ef-drift`.
  - **Pre-flight (§1.5) discovery deltas all adapted cleanly:**
    - §1.5.1: no `/admin/*` route group → adapted to `/ef-drift`
    - §1.5.2: single-tier middleware auth → reused, no new auth code
    - §1.5.3: Tailwind + lucide only → hand-rolled primitives
  - **Chat verification 5/5 PASS:** V1 row count = 49; V2 class distribution exact match; V3 SD-risk = 3 standing don't-redeploy; V4 active drift non-SD = 3 rows; V5 single cron run identity `c3446a47`.
  - **PK visual acceptance 7/7 desktop checks PASS:** load, run UUID, summary cards 49/3/6/25, SD-risk red panel with 🔒 lock icons, active drift visible, background collapsed by default count 43, no mutation surfaces.
  - **Mobile bucketed as system-wide P3** per PK directive — whole-dashboard gap, not just `/ef-drift`. Separate dedicated task.
  - **Stage 3 + P1 SECURITY-DEFINER triage UNBLOCKED.** Sequenced for next session.
  - **NEW standing rule**: Pre-flight discovery (§1.5-equivalent) is now default pattern for CC front-end briefs, validated by clean v2.48 execution.
  - **Closure budget**: ~1.5h chat. Day total v2.47+v2.48 ~3.5h. Trailing-14-day ~49.5h above 8.0 floor. 0 D-01 fires (verification + acceptance work).
  - **0 production mutations chat-side.** Read-only SQL only. Hold-state respected throughout.
  - **`m.ef_drift_log` unchanged at 147 rows** (no new cron fire this session). jobid 80 + 81 unchanged active=true.
