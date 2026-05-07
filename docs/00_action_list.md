# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-07 Sydney (v2.49 — **Stage 3 SHIPPED + VERIFIED.** `scripts/safe-deploy.sh` live (CC commit `3d43796`); A1–A8 PASS; brief D-01 `39a588d4` PASS; result D-01 `82aff9d3` read-only PASS. §1.5 schema delta adapted (`function_name`→`slug`, `class`→`current_class`); curl + `exec_sql` RPC connection method. Above-spec defensive additions: SQL-injection guard, standing-three pre-DB ordering, unknown-class fallback. T-MCP-02 42 → 44. P1 SECURITY-DEFINER triage trio NEWLY UNBLOCKED. v2.49 manifest folded: 5th-deferral correction, visual-acceptance integrity standing rule, AI cost view P3, cc-0001 parenthetical. Hold-state respected; 0 production mutations chat-side.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch + action_list version bump goes through ChatGPT cross-check before deploy/commit. **v2.49 application**: 2 D-01 fires (Stage 3 brief + read-only verification of result, both PASS). T-MCP-02 cumulative 42 → 44.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is approved target design. Stage 1 closed v2.41. Stage 2a closed v2.44. Stage 2a verified end-to-end via S30 v2.47. Stage 2b CLOSED v2.48 — shipped + accepted on desktop. **Stage 3 CLOSED v2.49 — `scripts/safe-deploy.sh` live + verified.**

**STANDING RULE (Lesson #62, v2.41)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, default is NOT automatic state-capture override.

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline.

**STANDING RULE (v2.46 — Dashboard Architecture Review)**: All architecture-level decisions live in `docs/dashboard-review-2026-05/`. Reopen triggers in `11_final_consolidation.md` §11.7. Amendment-doc protocol at `docs/dashboard-review-2026-05/amendments/`.

**STANDING RULE (v2.47 — Documentation framing)**: Sync_state framing of cron timing always anchors to **UTC clock-time + Sydney clock-time** for the upcoming fire window, not "tonight" without qualifier.

**STANDING RULE (v2.48 — Pre-flight discovery as standard CC pattern)**: §1.5-style pre-flight discovery (verify route convention, auth gate, UI library, **schema column names**, against actual repo + database before coding) is now the **default brief pattern** for any CC dashboard/portal/web/script work. **v2.49 application validated again** — §1.5 surfaced significant schema delta (`function_name`→`slug`, `class`→`current_class`) which CC adapted cleanly per §1.5 step 5 mandate without scope drift or D-01 re-fire.

**STANDING RULE (v2.49 NEW — Visual acceptance integrity)**: Visual acceptance is not complete until the actual visual review artifact (screenshot, screen recording, or equivalent direct visual confirmation) is received and reviewed. A "looks good" signal alone is NOT sufficient to declare acceptance. Chat does not advance state, close items, or trigger sync close on the basis of an unverified visual signal.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~7 (Stage 3 closure removes one; AI cost view P3 doesn't count toward P0+P1; P1 SD triage was already counted) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~50.5h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~1.0h** (verification + read-only review + 4-way sync close).

**Day total v2.47 + v2.48 + v2.49: ~4.5h.**

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-07 Sydney (v2.49).
> **This session: Stage 3 SHIPPED + VERIFIED. P1 SECURITY-DEFINER triage NEWLY UNBLOCKED.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **P1 SECURITY-DEFINER regression-risk triage** | **P1 TOP** | Newly UNBLOCKED v2.49 — Stage 3 ships the gate that mechanically blocks redeploys; sync now protected by encoded standing-three | Use `bash scripts/safe-deploy.sh heygen-avatar-creator --check-only` first to confirm BLOCK behavior. Then sync repo → deployed source via Windows CLI for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`. Sync-only commits, no redeploys. |
| 2 | **insights-worker P1 functional drift** | P1 | D-PREV-07: manual review, no auto-sync | PK reviews deployed source v14.0.0 vs repo v1.6.0. After triage trio. |
| 3 | **Personal businesses check-in** | P0 | Standing P0 — last asked v2.46 | PK reports any time-sensitive items from Care for Welfare / Property Buyers Agent / NDIS Accessories. |
| 4 | **Dashboard Architecture Review Phase 0 prerequisites** | P1 | Independent of triage timeline; can run in parallel | PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md` (brief-runner-v0 cycle #1, open and unexecuted). M5–M8 reconciliation independent. |
| 5 | **AI cost view P3** (NEW v2.49) | P3 | Cheap closure from ruflo analysis 6 May; surfaces existing AI spend visibility | Author `vw_ai_cost_monthly` on `m.ai_job` + NOW dashboard tile. ~1h estimate. |

**Demoted from prior Today/Next 5 (v2.48 → v2.49):**

- **F-EF-DRIFT-PREVENTION Stage 3** — CLOSED v2.49.
- **P1 SECURITY-DEFINER triage** — promoted #2 → #1 (newly unblocked).
- **insights-worker P1 functional drift** — promoted #3 → #2.
- **Dashboard Architecture Review Phase 0 prerequisites** — promoted #5 → #4.
- **AI cost view P3** — NEW v2.49 entry.

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (v2.49 update)

**v2.49 NEW**: Stage 3 SHIPPED + VERIFIED. `scripts/safe-deploy.sh` live. P1 SECURITY-DEFINER triage UNBLOCKED.

**Stage status:**
- Stage 1: CLOSED v2.41
- Stage 2a: CLOSED v2.44; verified end-to-end via S30 v2.47
- Stage 2b: CLOSED v2.48 — `dashboard.invegent.com/ef-drift` live, 5/5 SQL + 7/7 PK visual PASS
- **Stage 3: CLOSED v2.49** — `scripts/safe-deploy.sh` live, A1–A8 PASS, read-only D-01 PASS

**Cron status (all live, unchanged from v2.48):**
- jobid 80 `drift-check-daily-fire` — `0 17 * * *` UTC, `active=true`
- jobid 81 `ef-drift-log-retention-90d` — `15 17 * * *` UTC, `active=true`
- Next fire window: 2026-05-07 17:00 UTC = 03:00 AEST 8 May Sydney

**Live surfaces:**
- `m.ef_drift_log` — cron-backed advisory log, 147 rows
- `m.vw_ef_drift_current` — stable contract for downstream tooling
- `dashboard.invegent.com/ef-drift` — desktop drift panel (Stage 2b)
- `scripts/safe-deploy.sh` — pre-deploy CLI gate (Stage 3)

**Architecture review final placement** (Phase 4 B-09-36): drift panel relocated to NOW > Investigate per `06_final_target_design.md` §6.9.

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK

**Status:** COMPLETE at v2.46. 12 docs at `docs/dashboard-review-2026-05/`.

**v2.49 update on hard blockers:**
- ✅ S30 cleared v2.47 — first hard blocker DONE.
- 🔲 M5–M8 reconciliation — second hard blocker still pending.
- 🔲 7 Phase 0 confirmation-blocker defaults — pending PK confirm/override (brief at `docs/briefs/cc-0001-dashboard-phase-0-defaults.md` open and unexecuted; brief-runner-v0 cycle #1).

**Phase 0 still gated**, but one of two hard blockers cleared.

**Reopen triggers:** see `11_final_consolidation.md` §11.7.

**Amendment-doc protocol:** new docs at `docs/dashboard-review-2026-05/amendments/YYYY-MM-DD-{slug}.md`.

---

## 🟢 Tier 1 + M4 + M5 + F-YT-OAUTH-PP queue integrity & stability remediation — STATUS BLOCK

Unchanged from v2.48. M6–M8 still pending. M6 Phase A explicitly BLOCKED behind P1 SD triage.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. **S30 closed PASS v2.47**, remains documented as a one-time verification. Daily cron fires self-monitor via `m.ef_drift_log` row growth.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged. **v2.49 status delta**: Next drift cron fire 2026-05-07 17:00 UTC = 03:00 AEST 8 May (will increment `m.ef_drift_log` from 147 → 196 rows).

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 44 of 5)

**v2.49 application**: 2 D-01 fires (Stage 3 brief + read-only verification of CC result). Both PASS, 0 pushback.

Cumulative T-MCP-02: 44. Cumulative T-MCP-08: 2.

---

## 🤖 Cowork automation (D182)

**v2.49 status delta:** No change. `docs/audit/health/2026-05-06.md` still absent — carry as P3 follow-up. Sunset review: 12 May 2026.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **P1 SECURITY-DEFINER triage** | `heygen-avatar-creator` + `heygen-avatar-poller` + `draft-notifier` | P1 TOP | NEWLY UNBLOCKED v2.49 | PK + chat | Use `safe-deploy.sh --check-only` against each to confirm BLOCK; then sync repo → deployed source via Windows CLI as sync-only commits. |
| **insights-worker P1 functional drift** | Deployed v14.0.0 vs repo v1.6.0 | P1 | D-PREV-07: manual review | PK | After triage trio: PK reviews deployed source. |
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults + M5–M8 reconciliation | P1 | S30 cleared v2.47; M5–M8 + defaults pending | PK | Review §11.4 items 3–9; confirm defaults or propose alternatives via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md` (brief-runner-v0 cycle #1, open and unexecuted). M5–M8 reconciliation independent. |
| **F-YT-NY-FORMAT-SELECTION** (carry-forward) | Brief committed `ff5ae6ae` | P1 | BLOCKED behind P1 SD triage | chat → future session | After triage: read v2.11.1 source post-build; locate `format-advisor-v1`; decide between 4 fix shapes. |
| **M6 Phase A** (carry-forward) | 108 historical Bug 3 dead-letter | P1 | BLOCKED behind P1 SD triage | PK → chat → future session | Coordinate with M-09-03 view definition. |
| **AI cost view** (NEW v2.49) | `vw_ai_cost_monthly` view on `m.ai_job` + NOW dashboard tile | P3 | Backlog | chat → future session | Author view DDL (read-only over `m.ai_job`); add NOW dashboard tile surfacing monthly AI spend per client. **Source:** ruflo analysis 2026-05-06; concept from `ruflo-cost-tracker`. **Estimate:** ~30 min view DDL + ~30 min dashboard tile. |
| **Dashboard mobile responsiveness — system-wide** | Whole-dashboard gap; affects all tabs/views | P3 | OBSERVED, bucketed | chat → dedicated session OR Phase 1+ build | Either dedicated dashboard mobile-responsive session OR roll into architecture review Phase 1+ build sequence. |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | After M6 Phase A. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P2 | Passive monitoring | chat → next session | Continue passive monitoring. |
| **Invegent IG cap-throttle planning** | When jobid 53 unblocks, ~104 IG-overdue posts will fire | P3 | OBSERVED | chat → T05 unblock session | Plan cap-throttle / rate-limit handling. |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | Investigate downstream cap/approval pathway. `/ef-drift` panel may surface relevant signals. |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future session | Read-only scope-check; rename if appropriate. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session if still absent | Investigate Cowork status. |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates in `11_final_consolidation.md` §11.1 | chat → future session | Update `00_overview.md`. ~15 min. |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 bulk approve | chat → Phase 2 session | After Phase 0 + Phase 1: bulk approve UI in Phase 2. |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried v2.45/v2.46/v2.47/v2.48/v2.49 (**5th deferral**, sequence-honesty corrected) | chat → dedicated session | Open `app/(dashboard)/roadmap/page.tsx` and bring PHASES + LAST_UPDATED current. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 needs natural skip event OR synthetic test. |

**Closed v2.49:**

- **🎉 F-EF-DRIFT-PREVENTION Stage 3** — SHIPPED + VERIFIED. CC commit `3d43796`. `scripts/safe-deploy.sh` live; `scripts/README.md` documented; A1–A8 PASS; brief D-01 `39a588d4` PASS; result D-01 `82aff9d3` read-only PASS. Above-spec defensive additions: SQL-injection guard, standing-three pre-DB ordering, unknown-class fallback. §1.5 schema delta adapted (`function_name`→`slug`, `class`→`current_class`).

**Closed v2.48:** Stage 2b dashboard drift panel.
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

*(none flagged at session start — PK directed straight to Stage 3 planning + handoff; ICE proceeded. Standing P0 to ask at next session start.)*

---

## 📌 Backlog

**v2.49 changes**:

- **CLOSED v2.49**: F-EF-DRIFT-PREVENTION Stage 3.
- **PROMOTED v2.49**: P1 SECURITY-DEFINER triage (#2 → #1), insights-worker P1 functional drift (#3 → #2), Dashboard Architecture Review Phase 0 prerequisites (#5 → #4).
- **NEW v2.49 (P3)**: AI cost view — `vw_ai_cost_monthly` on `m.ai_job` + NOW dashboard tile. Source: ruflo analysis 6 May. ~1h.
- **NEW v2.49 standing rule**: Visual acceptance integrity — visual acceptance not complete until actual artifact received/reviewed.
- **CARRIED v2.49 (corrected count)**: Dashboard roadmap PHASES — **5th** consecutive deferral (was framed as "4th" in v2.48 docs; sequence-honesty cleanup folded into this close).
- **NOTED v2.49**: brief-runner-v0 cycle #1 (`docs/briefs/cc-0001-dashboard-phase-0-defaults.md`) remains open and unexecuted. Tracked under existing Phase 0 prerequisites Active row, not as a separate item.

**v2.48 changes** (still active): per v2.48.

**v2.47 changes** (still active): per v2.47.

**v2.46 changes** (still active): per v2.46.

**v2.45 + v2.44 + v2.43 + v2.42 + v2.41 + v2.40 + v2.39 + v2.38 + v2.37 + v2.36 + v2.35 + v2.34 + v2.33 changes**: per v2.47.

**Carried from v2.31**: per v2.47.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Per v2.48. **No new candidates v2.49** (Stage 3 ship is well-trodden ground; the §1.5 schema-delta adaptation reinforces v2.48's pre-flight standing rule but doesn't introduce a new lesson).

**Lesson observation v2.49 (informal):** When CC executes a brief that includes a §1.5-style pre-flight discovery section AND the brief assumes a schema/contract that turns out to differ from reality, CC's adaptation per §1.5 step 5 is the correct behaviour and does NOT require D-01 re-fire. The pattern is robust enough that brief assumptions can be made at draft time without rigorous schema introspection — §1.5 catches the gap. v2.48 validated this for UI conventions; v2.49 validates it for database schema. Pattern continues to hold.

---

## v2.49 honest limitations

- All v2.31-v2.48 limitations apply.
- **`--fail-with-body` curl flag** is recent; if PK runs `safe-deploy.sh` in a non-WSL environment it may fail in unexpected ways. Untested across environments.
- **Standing-three list is hardcoded** in `scripts/safe-deploy.sh`; future updates require code change + sync_state + action_list updates first per encoded rule. Drift between docs and code possible if rule not followed.
- **Class A AND A-LE are blocked** in the gate. Acceptable per brief but worth flagging — a "matches deployed" Class A also blocks (because redeploy is unnecessary). PK reading "Class A" as permissive would be wrong.
- **Verification was read-only by chat** (read repo files + commit body); chat did not run A1–A8 directly. Trust placed in CC's reported outputs, cross-checked against script logic. No discrepancy found.
- **v2.48 premature acceptance documentation** (corrected v2.49): Stage 2b acceptance was declared in chat ahead of the actual visual review artifact arriving; subsequent screenshots reconciled the claim post-hoc. Documentation gap noted: chat sequenced the v2.48 close with "5/5 SQL PASS → declared accept → committed → screenshots → 7/7 visual PASS post-hoc → correction commit reconciles." New standing rule on visual acceptance integrity prevents recurrence.
- **Dashboard roadmap PHASES still stale** — **5th** consecutive deferral (corrected from v2.48's "4th" framing). P3 risk: roadmap claims phase positions that don't reflect Stage 2b ship, Stage 3 ship, or any recent work.
- **17+ close-the-loop UPDATEs to `m.chatgpt_review`** still pending — carried since v2.40+. v2.49 adds 2 more (`39a588d4` + `82aff9d3`); cumulative pending now 19+.

---

## Changelog

- v1.0–v2.48: per previous changelog.
- **v2.49 (2026-05-07 Sydney, Stage 3 SHIPPED + VERIFIED):**
  - **F-EF-DRIFT-PREVENTION Stage 3** SHIPPED + VERIFIED. CC commit `3d43796`. `scripts/safe-deploy.sh` (mode 100755, 9095 bytes) + `scripts/README.md` (1590 bytes). Brief commit `3f1135b9`.
  - **§1.5 pre-flight deltas adapted cleanly:**
    - **§1.5.1** shebang + set flags per existing scripts; no root package.json so no npm-script alias.
    - **§1.5.2** CLI v2.75 has no ad-hoc SQL subcommand; psql not installed; adopted curl + `exec_sql` RPC. Required env `SUPABASE_SERVICE_ROLE_KEY`; optional `SUPABASE_PROJECT_REF`.
    - **§1.5.3 SCHEMA DELTA (significant)** — brief assumed `function_name` and `class`; actual `slug` and `current_class`. Adapted per §1.5 step 5.
    - **§1.5.4** standing-three slug values exact match.
  - **A1–A8 acceptance — all PASS**: usage / standing-three trio / insights-worker B-RR BLOCK / WARN-PASS / row-absent PASS / 100755.
  - **Above-spec defensive additions (CC, net-positive)**: SQL-injection guard via regex; standing-three check fires BEFORE pre-flight; default unknown-class advisory PASS.
  - **Two D-01 fires (both PASS)**: brief `39a588d4-3fb4-41e4-a5a4-07916b6d64c7` (verdict agree, risk medium) + result `82aff9d3-5176-41e9-9102-71f30a90e130` (verdict agree, risk LOW). T-MCP-02 cumulative 42 → 44.
  - **P1 SECURITY-DEFINER triage UNBLOCKED.** Sequenced #1 for next session. Use `safe-deploy.sh --check-only` as the gate.
  - **NEW STANDING RULE (visual acceptance integrity)**: visual acceptance not complete until actual visual review artifact received/reviewed; "looks good" signal alone insufficient.
  - **AI cost view P3 ADDED** (Active table): `vw_ai_cost_monthly` on `m.ai_job` + NOW dashboard tile. Source: ruflo analysis 6 May.
  - **Sequence-honesty cleanup folded in**: dashboard roadmap PHASES corrected 4th → 5th consecutive deferral; honest-limitation bullet added re: v2.48 premature acceptance documentation.
  - **cc-0001 status note added**: parenthetical on existing Phase 0 prerequisites Active row noting brief-runner-v0 cycle #1 open and unexecuted. No new tracking row.
  - **Closure budget**: ~1.0h chat. Day total v2.47+v2.48+v2.49 ~4.5h. Trailing-14-day ~50.5h above 8.0 floor.
  - **0 production mutations chat-side.** Read-only SQL only. Hold-state respected throughout. Standing-three not redeployed; merely encoded as gate logic in the new script.
  - **`m.ef_drift_log` unchanged at 147 rows** (no new cron fire this session window). jobid 80 + 81 unchanged active=true.
