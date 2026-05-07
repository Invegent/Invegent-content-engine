# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-07 Sydney (v2.50 — **P1 SECURITY-DEFINER triage CLOSED.** Three sync-only commits as closure artifacts: `a83ab4c0` (draft-notifier), `448eeb30` (heygen-avatar-creator), `5aefd6e6` (heygen-avatar-poller). 3 D-01 fires this session: `32ade261` advisory PASS-with-correction (STEP C.5 adopted); `9cbc7de3` verification PASS-with-correction (corrected_action verified empirically → surfaced orphan-RPC finding); `4a48024f` sync-close partial (non-testable corrected_action → PK override approved, state-capture exception count v2.50: 1). T-MCP-02 44 → 47. NEW finding: F-HEYGEN-RPC-MIGRATIONS-MISSING P2. NEW STANDING RULE: acceptance integrity (generalised from v2.49). Lesson #62 refinement: testable → verify, non-testable → override. Hold-state respected; 0 production mutations chat-side.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch + action_list version bump goes through ChatGPT cross-check before deploy/commit. **v2.50 application**: 3 D-01 fires (advisory `32ade261` PASS-with-correction; verification `9cbc7de3` PASS-with-correction; sync-close `4a48024f` partial → state-capture override). T-MCP-02 cumulative 44 → 47.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is approved target design. Stage 1 closed v2.41. Stage 2a closed v2.44. Stage 2a verified end-to-end via S30 v2.47. Stage 2b CLOSED v2.48. Stage 3 CLOSED v2.49. **P1 SECURITY-DEFINER triage CLOSED v2.50** with three sync-only commits.

**STANDING RULE (Lesson #62, v2.41 + v2.50 refinement)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, default is NOT automatic state-capture override. **v2.50 refinement**: When the corrected_action is **low-cost and testable**, prefer empirical verification over override. Empirical check either dissolves the pushback (verifies the assertion) or surfaces a real adjacent finding (validates the pushback). When the corrected_action is **non-testable** (vague, tautological, no concrete acceptance criteria), override remains the default with PK approval as state-capture exception per existing protocol.

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline.

**STANDING RULE (v2.46 — Dashboard Architecture Review)**: All architecture-level decisions live in `docs/dashboard-review-2026-05/`. Reopen triggers in `11_final_consolidation.md` §11.7. Amendment-doc protocol at `docs/dashboard-review-2026-05/amendments/`.

**STANDING RULE (v2.47 — Documentation framing)**: Sync_state framing of cron timing always anchors to **UTC clock-time + Sydney clock-time** for the upcoming fire window, not "tonight" without qualifier.

**STANDING RULE (v2.48 — Pre-flight discovery as standard CC pattern)**: §1.5-style pre-flight discovery (verify route convention, auth gate, UI library, schema column names, against actual repo + database before coding) is now the default brief pattern for any CC dashboard/portal/web/script work. **v2.50 application validated again** — `cc-0002-p1-sd-triage-sync.md` §1.5 pre-flight surfaced the no-`SUPABASE_ACCESS_TOKEN` env delta and the local-main-1-behind-origin condition; CC adapted cleanly without re-fire.

**STANDING RULE (v2.50 NEW — Acceptance integrity, generalised from v2.49 visual-acceptance integrity)**: Acceptance is not complete until the actual review artifact is received and reviewed, regardless of artifact type — visual, diff, log, command output, screen capture, or otherwise. A "looks good" / "passed" / "matches" signal alone is NOT sufficient to declare acceptance. Chat does not advance state, close items, or trigger sync close on the basis of an unverified summary. **Empirical validation v2.50:** STEP C.5 held heygen-avatar-poller sync until full diff artifact was in chat context, which is exactly what surfaced the orphan-RPC finding (F-HEYGEN-RPC-MIGRATIONS-MISSING P2). The rule is load-bearing.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~6 (Stage 3 closure already removed one v2.49; P1 SD triage closure removes another v2.50; F-HEYGEN-RPC-MIGRATIONS-MISSING is P2 doesn't count toward P0+P1) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~52h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~1.5h** (orchestration + 3 D-01 fires + verification reviews + sync-close authoring).

**Day total v2.47 + v2.48 + v2.49 + v2.50: ~6.0h.**

**State-capture exception count v2.50: 1** (D-01 `4a48024f` sync-close override per Lesson #62 v2.50 refinement; non-testable corrected_action).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-07 Sydney (v2.50).
> **This session: P1 SECURITY-DEFINER triage CLOSED. NEW finding F-HEYGEN-RPC-MIGRATIONS-MISSING P2 logged.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **insights-worker P1 functional drift** | **P1 TOP** | NEWLY UNBLOCKED v2.50 (was sequenced after triage trio) | PK reviews deployed source v14.0.0 vs repo v1.6.0. D-PREV-07: manual review, no auto-sync. |
| 2 | **Personal businesses check-in** | P0 | Standing P0 — last asked v2.46 | PK reports any time-sensitive items from Care for Welfare / Property Buyers Agent / NDIS Accessories. |
| 3 | **Dashboard Architecture Review Phase 0 prerequisites** | P1 | Independent of #1 timeline; can run in parallel | PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md` (brief-runner-v0 cycle #1, open and unexecuted). M5–M8 reconciliation independent. |
| 4 | **F-HEYGEN-RPC-MIGRATIONS-MISSING** (NEW v2.50) | P2 | Cheap closure adjacent to today's work; resolves orphan-deployed RPC drift | `pg_get_functiondef` (read-only) on the 4 RPCs (`store_gen_poll_response`, `advance_avatar_to_creating`, `complete_avatar_training`, `fail_avatar_generation`) → write single migration file → commit. ~30 min. |
| 5 | **AI cost view P3** (carry from v2.49) | P3 | Cheap closure from ruflo analysis 6 May | Author `vw_ai_cost_monthly` on `m.ai_job` + NOW dashboard tile. ~1h estimate. |

**Demoted from prior Today/Next 5 (v2.49 → v2.50):**

- **P1 SECURITY-DEFINER triage** — CLOSED v2.50 (was #1).
- **insights-worker P1 functional drift** — promoted #2 → #1.
- **Personal businesses check-in** — promoted #3 → #2.
- **Dashboard Architecture Review Phase 0 prerequisites** — promoted #4 → #3.
- **F-HEYGEN-RPC-MIGRATIONS-MISSING** — NEW v2.50 entry at #4.
- **AI cost view P3** — demoted #5 → #5 (held position).

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (v2.50 update)

**v2.50 NEW**: P1 SECURITY-DEFINER triage CLOSED via three sync-only commits. Standing-three list in `safe-deploy.sh` unchanged. Triage scope was repo-source-to-deployed alignment for the standing-three EFs; that scope is fully met.

**Stage status:**
- Stage 1: CLOSED v2.41
- Stage 2a: CLOSED v2.44; verified end-to-end via S30 v2.47
- Stage 2b: CLOSED v2.48 — `dashboard.invegent.com/ef-drift` live, 5/5 SQL + 7/7 PK visual PASS
- Stage 3: CLOSED v2.49 — `scripts/safe-deploy.sh` live, A1–A8 PASS
- **P1 SECURITY-DEFINER triage: CLOSED v2.50** — 3 sync-only commits as closure artifacts

**Cron status (all live, unchanged from v2.48):**
- jobid 80 `drift-check-daily-fire` — `0 17 * * *` UTC, `active=true`
- jobid 81 `ef-drift-log-retention-90d` — `15 17 * * *` UTC, `active=true`
- Next fire window: 2026-05-07 17:00 UTC = 03:00 AEST 8 May Sydney → `m.ef_drift_log` 147 → 196 rows expected

**Live surfaces:**
- `m.ef_drift_log` — cron-backed advisory log, 147 rows
- `m.vw_ef_drift_current` — stable contract for downstream tooling
- `dashboard.invegent.com/ef-drift` — desktop drift panel (Stage 2b)
- `scripts/safe-deploy.sh` — pre-deploy CLI gate (Stage 3) + standing-three encoded gate logic (drove v2.50 triage)

**Adjacent open finding (NEW v2.50):**
- **F-HEYGEN-RPC-MIGRATIONS-MISSING (P2)** — surfaced by P1 SD triage diff review. 4 RPCs orphan-deployed (DB-only, not in repo migrations). Pre-existing drift, not introduced by sync. Filename-only scan caveat documented. ~30 min next session.

**Architecture review final placement** (Phase 4 B-09-36): drift panel relocated to NOW > Investigate per `06_final_target_design.md` §6.9.

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK

**Status:** COMPLETE at v2.46. 12 docs at `docs/dashboard-review-2026-05/`.

**v2.50 update on hard blockers:**
- ✅ S30 cleared v2.47 — first hard blocker DONE.
- 🔲 M5–M8 reconciliation — second hard blocker still pending.
- 🔲 7 Phase 0 confirmation-blocker defaults — pending PK confirm/override (brief at `docs/briefs/cc-0001-dashboard-phase-0-defaults.md` open and unexecuted; brief-runner-v0 cycle #1).

**Phase 0 still gated**, but one of two hard blockers cleared.

**Reopen triggers:** see `11_final_consolidation.md` §11.7.

**Amendment-doc protocol:** new docs at `docs/dashboard-review-2026-05/amendments/YYYY-MM-DD-{slug}.md`.

---

## 🟢 Tier 1 + M4 + M5 + F-YT-OAUTH-PP queue integrity & stability remediation — STATUS BLOCK

Unchanged from v2.48. M6–M8 still pending. **M6 Phase A NEWLY UNBLOCKED v2.50** (was BLOCKED behind P1 SD triage).

---

## 🔄 Standing session-start checks

S1–S29 unchanged. **S30 closed PASS v2.47**, remains documented as a one-time verification. Daily cron fires self-monitor via `m.ef_drift_log` row growth.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged. **v2.50 status delta**: Next drift cron fire 2026-05-07 17:00 UTC = 03:00 AEST 8 May (will increment `m.ef_drift_log` from 147 → 196 rows).

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 47 of 5)

**v2.50 application**: 3 D-01 fires this session.

- `32ade261-5f99-4c75-a643-5a20c7c978ae` advisory: partial → STEP C.5 adopted, no re-fire per PK
- `9cbc7de3-537f-425c-8e77-b1245a76a2e1` verification: partial → corrected_action verified empirically, surfaced F-HEYGEN-RPC-MIGRATIONS-MISSING P2
- `4a48024f-e361-4876-b5a0-89651eb7c662` sync-close: partial → non-testable corrected_action, PK override approved (state-capture exception)

Cumulative T-MCP-02: 47. Cumulative T-MCP-08: 2. State-capture exceptions v2.50: 1.

---

## 🤖 Cowork automation (D182)

**v2.50 status delta:** No change. `docs/audit/health/2026-05-06.md` still absent — carry as P3 follow-up. Sunset review: 12 May 2026.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **insights-worker P1 functional drift** | Deployed v14.0.0 vs repo v1.6.0 | P1 TOP | NEWLY UNBLOCKED v2.50 | PK | PK reviews deployed source. |
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults + M5–M8 reconciliation | P1 | S30 cleared v2.47; M5–M8 + defaults pending | PK | Review §11.4 items 3–9; confirm defaults or propose alternatives via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md` (brief-runner-v0 cycle #1). M5–M8 reconciliation independent. |
| **F-HEYGEN-RPC-MIGRATIONS-MISSING** (NEW v2.50) | 4 RPCs called by heygen-avatar-poller v2.0.0 not in repo migrations | P2 | NEW v2.50 | chat → next session | `pg_get_functiondef` (read-only) on `store_gen_poll_response`, `advance_avatar_to_creating`, `complete_avatar_training`, `fail_avatar_generation` → write single migration file → commit. ~30 min. Surfaced by P1 SD triage diff review. Filename-only scan caveat. |
| **F-YT-NY-FORMAT-SELECTION** (carry-forward) | Brief committed `ff5ae6ae` | P1 | NEWLY UNBLOCKED v2.50 (was BLOCKED behind P1 SD triage) | chat → future session | Read v2.11.1 source post-build; locate `format-advisor-v1`; decide between 4 fix shapes. |
| **M6 Phase A** (carry-forward) | 108 historical Bug 3 dead-letter | P1 | NEWLY UNBLOCKED v2.50 (was BLOCKED behind P1 SD triage) | PK → chat → future session | Coordinate with M-09-03 view definition. |
| **AI cost view** (carry from v2.49) | `vw_ai_cost_monthly` view on `m.ai_job` + NOW dashboard tile | P3 | Backlog | chat → future session | Author view DDL (read-only over `m.ai_job`); add NOW dashboard tile surfacing monthly AI spend per client. **Source:** ruflo analysis 2026-05-06. **Estimate:** ~1h. |
| **Dashboard mobile responsiveness — system-wide** | Whole-dashboard gap; affects all tabs/views | P3 | OBSERVED, bucketed | chat → dedicated session OR Phase 1+ build | Either dedicated session OR roll into architecture review Phase 1+ build sequence. |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | After M6 Phase A. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P2 | Passive monitoring | chat → next session | Continue passive monitoring. |
| **Invegent IG cap-throttle planning** | When jobid 53 unblocks, ~104 IG-overdue posts will fire | P3 | OBSERVED | chat → T05 unblock session | Plan cap-throttle / rate-limit handling. |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | Investigate downstream cap/approval pathway. |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future session | Read-only scope-check; rename if appropriate. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session if still absent | Investigate Cowork status. |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates in `11_final_consolidation.md` §11.1 | chat → future session | Update `00_overview.md`. ~15 min. |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 bulk approve | chat → Phase 2 session | After Phase 0 + Phase 1: bulk approve UI in Phase 2. |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried v2.45 → v2.50 (**6th deferral**, corrected v2.50 from prior 5th) | chat → dedicated session | Open `app/(dashboard)/roadmap/page.tsx` and bring PHASES + LAST_UPDATED current. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 needs natural skip event OR synthetic test. |

**Closed v2.50:**

- **🎉 P1 SECURITY-DEFINER regression-risk triage** — CLOSED. Three sync-only commits as closure artifacts: `a83ab4c0` (draft-notifier), `448eeb30` (heygen-avatar-creator), `5aefd6e6` (heygen-avatar-poller). All three: safe-deploy BLOCK verified (exit 2 standing-three pre-DB), STEP C.5 respected (under-threshold pair auto-committed; over-threshold third held + diff reviewed in chat against actual artifact + PK approved), repo aligned to deployed, no redeploys, no Supabase mutations. Standing-three list in `scripts/safe-deploy.sh` unchanged.

**Closed v2.49:** F-EF-DRIFT-PREVENTION Stage 3.
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

*(none flagged at session start — PK directed straight to P1 SD triage; ICE proceeded. Standing P0 to ask at next session start.)*

---

## 📌 Backlog

**v2.50 changes**:

- **CLOSED v2.50**: P1 SECURITY-DEFINER regression-risk triage (3 sync-only commits as artifacts).
- **PROMOTED v2.50**: insights-worker P1 functional drift (#2 → #1), Personal businesses (#3 → #2), Dashboard Phase 0 prerequisites (#4 → #3).
- **NEW v2.50 (P2)**: F-HEYGEN-RPC-MIGRATIONS-MISSING — 4 RPCs called by heygen-avatar-poller v2.0.0 deployed source not in repo migrations. Pre-existing orphan-deployed drift, surfaced by diff review during P1 SD triage. ~30 min.
- **NEW v2.50 STANDING RULE**: Acceptance integrity (generalised from v2.49 visual-acceptance integrity).
- **REFINED v2.50**: Lesson #62 — testable corrected_action → verify; non-testable → override.
- **CARRIED v2.50 (corrected count)**: Dashboard roadmap PHASES — **6th** consecutive deferral (was framed as "5th" in v2.49 docs; sequence-honesty cleanup).
- **NEWLY UNBLOCKED v2.50** (carry from v2.49 Active table): F-YT-NY-FORMAT-SELECTION P1; M6 Phase A P1.
- **NOTED v2.50**: 3 D-01 fires this session (cumulative T-MCP-02 44 → 47); 1 state-capture exception (`4a48024f` sync-close override per non-testable corrected_action).

**v2.49 changes** (still active): per v2.49.

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

Per v2.48 + v2.50 refinement to Lesson #62.

**Lesson #62 v2.50 refinement (new wording):** When `corrected_action` from a D-01 escalate is **low-cost and testable**, prefer empirical verification over override. Empirical check either dissolves the pushback (verifies the assertion) or surfaces a real adjacent finding (validates the pushback). Both outcomes are net-positive vs override. When `corrected_action` is **non-testable** (vague, tautological, no concrete acceptance criteria), override remains the default — with PK explicit approval as a state-capture exception per existing protocol.

**Two empirical proofs this session:**
- Fire #2 (`9cbc7de3`): testable corrected_action ("verify RPCs in migrations") → chat verified via filename scan → surfaced F-HEYGEN-RPC-MIGRATIONS-MISSING P2 as real adjacent finding. Verification was net-positive.
- Fire #3 (`4a48024f`): non-testable corrected_action ("have a contingency plan for unforeseen findings") → PK override approved → state-capture exception count v2.50: 1.

**Lesson observation v2.50 (informal):** The acceptance-integrity rule (newly generalised) and the Lesson #62 refinement are mutually reinforcing. Acceptance-integrity says "verify against the artifact, not the summary". Lesson #62 v2.50 says "verify when testable, override when not". Together: when there's a concrete artifact to test against, testing is the disposition. When there isn't, override is. The pattern shape is consistent.

---

## v2.50 honest limitations

- All v2.31-v2.49 limitations apply.
- **Filename-only scan** for F-HEYGEN-RPC-MIGRATIONS-MISSING — confidence high but not 100%. A non-obvious match could theoretically live inside a generic phase-patch file (e.g. `20260430033748_phase_b_patch_image_quote_body_health_gate.sql`). Confirming would require GitHub code-search or direct-grep via CC. Bucketed P2 follow-up.
- **Standard CC paste-back chain** for P1 SD triage execution evidence. Chat did not directly run `safe-deploy.sh`, did not directly download deployed source, did not directly diff. All execution evidence comes from CC paste-back + GitHub MCP cross-checks against the resulting commits. Standard pattern, but worth noting the verification chain.
- **State-capture exception count v2.50: 1** (D-01 `4a48024f` sync-close override). First exception this version line. Per protocol, exception count is tracked per session — escalation pattern (multiple exceptions per session) would be a signal worth surfacing.
- **Dashboard roadmap PHASES still stale** — **6th** consecutive deferral (corrected from v2.49's 5th framing). P3 risk: roadmap claims phase positions that don't reflect Stage 2b ship, Stage 3 ship, P1 SD triage closure, or any recent work.
- **21+ close-the-loop UPDATEs to `m.chatgpt_review`** still pending — carried since v2.40+. v2.50 adds 3 more (`32ade261` + `9cbc7de3` + `4a48024f`); cumulative pending now 21+.
- **Brief retroactive commit** — `docs/briefs/cc-0002-p1-sd-triage-sync.md` was authored mid-session and pasted into chat for handoff but not committed at the time. The three sync commits (`a83ab4c0` + `448eeb30` + `5aefd6e6`) cited the brief path before it existed. v2.50 sync-close commit retroactively committed the brief at that path so citations resolve. Acceptable since brief content is preserved verbatim, but worth noting as a documentation-sequencing gap.

---

## Changelog

- v1.0–v2.49: per previous changelog.
- **v2.50 (2026-05-07 Sydney, P1 SECURITY-DEFINER triage CLOSED):**
  - **P1 SECURITY-DEFINER regression-risk triage** CLOSED with three sync-only commits as closure artifacts: `a83ab4c0` (draft-notifier; 77 lines, +15.0%; UNDER threshold), `448eeb30` (heygen-avatar-creator; 86 lines, -9.3%; UNDER threshold), `5aefd6e6` (heygen-avatar-poller; 269 lines, +34.3%; OVER cond i; held + diff reviewed in chat against actual artifact + PK approved).
  - **STEP C.5 threshold checkpoint** (>100 lines OR >50% size delta → STOP, report full diff, wait for explicit PK approval phrase) adopted from D-01 advisory `32ade261` corrected_action; worked exactly as designed.
  - **3 D-01 fires** (T-MCP-02 cumulative 44 → 47):
    - `32ade261-5f99-4c75-a643-5a20c7c978ae` advisory: partial → STEP C.5 adopted; no re-fire per PK directive.
    - `9cbc7de3-537f-425c-8e77-b1245a76a2e1` verification: partial → corrected_action verified empirically (filename scan of `supabase/migrations/`); surfaced F-HEYGEN-RPC-MIGRATIONS-MISSING P2 as real adjacent finding.
    - `4a48024f-e361-4876-b5a0-89651eb7c662` sync-close: partial → non-testable corrected_action; PK override approved as state-capture exception per Lesson #62 v2.50 refinement.
  - **NEW finding F-HEYGEN-RPC-MIGRATIONS-MISSING (P2)** — four RPCs called by heygen-avatar-poller v2.0.0 deployed source (`store_gen_poll_response`, `advance_avatar_to_creating`, `complete_avatar_training`, `fail_avatar_generation`) not present in repo migrations. Pre-existing orphan-deployed drift. ~30 min next session.
  - **NEW STANDING RULE — Acceptance integrity** (generalised from v2.49 visual-acceptance integrity): acceptance not complete until actual review artifact received and reviewed regardless of artifact type. "Looks good" / "passed" / "matches" signal alone insufficient. Empirically validated this session.
  - **Lesson #62 refinement**: testable corrected_action → verify empirically; non-testable → override remains default with PK approval as state-capture exception. Two empirical proofs this session.
  - **State-capture exception count v2.50: 1** (`4a48024f`).
  - **Brief retroactive commit**: `docs/briefs/cc-0002-p1-sd-triage-sync.md` folded into v2.50 sync-close commit so the three sync commits' citations resolve. Documentation-sequencing gap noted.
  - **Newly unblocked**: insights-worker P1 functional drift (#1 next session), F-YT-NY-FORMAT-SELECTION P1, M6 Phase A P1 — all were sequenced behind P1 SD triage in v2.49.
  - **Closure budget**: ~1.5h chat. Day total v2.47+v2.48+v2.49+v2.50 ~6.0h. Trailing-14-day ~52h above 8.0 floor. ~6 P0+P1 open (was ~7).
  - **Carried**: Dashboard roadmap PHASES — 6th consecutive deferral (corrected from v2.49 5th).
  - **0 production mutations chat-side.** No SQL DDL/DML, no EF deploys, no cron changes, STANDING_THREE array unchanged. Hold-state respected throughout.
