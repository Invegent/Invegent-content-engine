# ICE — Sync State Index

> **This file is the lightweight session pointer index.** It never grows large. Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1) after two giant-file-rewrite truncation incidents in 24h. See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for the frozen pre-restructure history.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog
3. Open the most-recent session file from the index below if deeper context is needed

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-16 | v2.76-stage-e-close-and-window-open | **cc-0014 FULLY CLOSED + 14-DAY WINDOW OPEN + FAB LIVE ON PROD + cc-0015 + cc-0016 DRAFTED (v2.76).** Stage E close executed via migration `cc_0014_e_close_experiment_run_start` (defensive cleanup per brief §10 + INSERT into `friction.experiment_run` with brief §10 verbatim criteria_snapshot). PK pre-execution review caught 3 verification defects before fire (DELETE-protection trigger probe structurally wrong; probe isolation broken; Day-19 wording conflated capture-window-end with verdict-render-date) — all corrected before fire. 4 post-INSERT verifications PASS. **14-day window OPEN: 2026-05-15 06:20 UTC → 2026-05-29 06:20 UTC. Day-19 = 2026-05-29 Sydney.** **FAB live on production**: Vercel env var DASHBOARD_FRICTION_FAB_ENABLED=true (Production + Preview scope); 2 mid-execution defects caught + recovered (wrong project ID cited; uppercase value silent failure). Live FAB smoke test PASS — event `fbd1b12d`, auto-promoted case `b7369dc9`, triaged via /operations to acknowledged + quality_flag=true + action_decision=track. **cc-0015 + cc-0016 brief drafts committed** PENDING_EXECUTION (commits `9a5dc155` + `f35f8ea4`). **Memory edit cycle**: 30/30 → 19/30 (11 free slots). 1 mid-cycle unauthorised remove identified + recovered. **0 D-01 fires** per brief §13. T-MCP-02 cum unchanged at **66**. State-capture exceptions cum unchanged at **1**. **6 NEW L-candidates v2.76 (a-f)**. **L58 PROMOTED TO BASELINE**. **3-of-4-way sync** via 3 single-file chat MCP commits (dashboard PHASES **29th consecutive deferral** per IOL hold-stance). | `docs/runtime/sessions/2026-05-16-v2.76-stage-e-close-and-window-open.md` |
| 2026-05-15 | cc-0014-stage-d-and-e-prerun | **cc-0014 STAGE D CLOSED + STAGE E APPLIED (v2.75).** Stage D fully closed via V-D1..V-D5 + Supp-1/2 PASS after a 2-commit FAB relocation arc (CCD initial commits in wrong repo). Stage E backend + frontend + brief-completing promotion trigger ALL APPLIED. V-E1/V-E2/V-E3 + V-P1..V-P8 PASS. 5 PK V-D5 observations backfilled into 5 cases (1:1 distinct fingerprints). PostgREST exposed_schemas extended via PK manual UI to include `friction`. 0 D-01 fires per brief §13. 3 NEW L-candidates v2.75 (L63 brief implementation gap, L64 repo-target verification, L65 PostgREST exposed_schemas runtime config). L58 strengthened to 3rd preventive application (promotion to baseline applied at v2.76). 14-day window NOT started — begins at v2.76 INSERT. | `docs/runtime/sessions/2026-05-15-cc-0014-stage-d-and-e-prerun.md` |
| 2026-05-15 | cc-0014-stage-c-applied | **cc-0014 Stage C APPLIED (v2.74).** Health-check dual-write emitter live. Migration applied atomically (2 SECURITY DEFINER functions + 1 pg_cron job 86). 5 of 6 V-checks PASS; V-C3 PENDING live Cowork run. Cowork brief v2.1 → v3.0 (commit `bc32e86a`). 0 D-01 fires. L58 strengthened to 2nd preventive application. | `docs/runtime/sessions/2026-05-15-cc-0014-stage-c-applied.md` |
| 2026-05-15 | cc-0014-stage-b-applied | **cc-0014 Stage B APPLIED (v2.73).** Reconciliation emitter trigger live on `r.cadence_drift_log`. 5 V-checks PASS. 0 D-01 fires per brief §13. 3 brief V-B1 defects caught pre-execution. L60 NEW candidate. L58 first preventive application. | `docs/runtime/sessions/2026-05-15-cc-0014-stage-b-applied.md` |
| 2026-05-14 | cc-0014-stage-a-applied | **cc-0014 Stage A APPLIED (v2.72).** friction.* schema deployed (5 tables + 2 v1.1-patch triggers + full grants matrix). 11 V-checks PASS. 8 review rounds across strategic v0.1→v0.4 + brief v1.0→v1.1. 2 D-01 fires. L58 + L59 NEW candidates. T-MCP-02 cum 66 (+2). State-capture exceptions: 1. | `docs/runtime/sessions/2026-05-14-cc-0014-stage-a-applied.md` |
| 2026-05-13 | cc-0012-closed-with-variance | **cc-0012 CLOSED-WITH-VERIFIED-VARIANCE (v2.71).** Platform Reconciliation View (PRV) v1 delivered. Reconciliation v1 + PRV v1 family complete end-to-end. | `docs/runtime/sessions/2026-05-13-cc-0012-closed-with-variance.md` |
| 2026-05-13 | cc-0011-closed-with-variance | **cc-0011 CLOSED-WITH-VERIFIED-VARIANCE (v2.70).** cadence-drift-checker EF v2 ACTIVE; cron 85 installed. L42 reified at 4-job cardinality. L62 type-(c) NEW empirical use. | `docs/runtime/sessions/2026-05-13-cc-0011-closed-with-variance.md` |
| 2026-05-13 | cc-0010C-closed-stage-e-cron-equivalent | **cc-0010C CLOSED-WITH-VERIFIED-VARIANCE (v2.69).** reconciliation-matcher EF v1 deployed; cron 84 installed. | `docs/runtime/sessions/2026-05-13-cc-0010C-closed-stage-e-cron-equivalent.md` |
| 2026-05-13 | cc-0010B-closed-stage-e-cron-equivalent | **cc-0010B CLOSED-WITH-VERIFIED-VARIANCE (v2.68).** ice-evidence-materialiser EF v2 deployed; L40 reified end-to-end. | `docs/runtime/sessions/2026-05-13-cc-0010B-closed-stage-e-cron-equivalent.md` |
| 2026-05-12 | cc-0010A-applied | cc-0010A v1.5 APPLIED + CLOSED — r.* DDL foundation delivered (v2.67). | `docs/runtime/sessions/2026-05-12-cc-0010A-applied.md` |
| 2026-05-11 | post-cc0009-process-upgrades-l44-l48-applied | L44–L48 process upgrades FORMALISED + committed (v2.66). | `docs/runtime/sessions/2026-05-11-post-cc0009-process-upgrades-l44-l48-applied.md` |
| 2026-05-11 | cc-0009-stages-d-e-closed | cc-0009 Stages D + E CLOSED — PRV-1 second build COMPLETE (v2.65). | `docs/runtime/sessions/2026-05-11-cc-0009-stages-d-e-closed.md` |
| 2026-05-11 | cc-0009-stage-b-applied-closed | cc-0009 Stage B applied + merged + closed (v2.63). | `docs/runtime/sessions/2026-05-11-cc-0009-stage-b-applied-closed.md` |
| 2026-05-10 | cc-0009-authored | cc-0009 v1 authored (v2.62). | `docs/runtime/sessions/2026-05-10-cc-0009-authored.md` |
| 2026-05-09 | cc-0008-applied | cc-0008 v5 applied (v2.61). | `docs/runtime/sessions/2026-05-09-cc-0008-applied.md` |
| 2026-05-09 | cc-0005-v4-m8a-applied-pipeline-integrity-complete | M8a Path A applied (v2.59). | `docs/runtime/sessions/2026-05-09-cc-0005-v4-m8a-applied-pipeline-integrity-complete.md` |
| 2026-05-09 | cc-0007-applied-ai-worker-401-recovered | cc-0007 (v2.58). | `docs/runtime/sessions/2026-05-09-cc-0007-applied-ai-worker-401-recovered.md` |
| 2026-05-09 | cc-0006-closed-cc-0005-v3-patched | cc-0006 (v2.57). | `docs/runtime/sessions/2026-05-09-cc-0006-closed-cc-0005-v3-patched.md` |
| 2026-05-09 | cc-0004-applied-m6-phase-b-closed | cc-0004 (v2.56). | `docs/runtime/sessions/2026-05-09-cc-0004-applied-m6-phase-b-closed.md` |
| 2026-05-09 | cc-0003-v2-applied-m6-phase-a-closed | cc-0003 v2 (v2.55). | `docs/runtime/sessions/2026-05-09-cc-0003-v2-applied-m6-phase-a-closed.md` |
| 2026-05-08 | video-worker-v3-deploy-verify-jwt-recovery | video-worker v3.0.0 deployed (v2.54). | `docs/runtime/sessions/2026-05-08-video-worker-v3-deploy-verify-jwt-recovery.md` |

*(Older sessions truncated for brevity — full index preserved in v2.66 archive.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---
## 🟢 Most recent session — inline summary

### 2026-05-16 Sydney — cc-0014 FULLY CLOSED + 14-DAY WINDOW OPEN + FAB LIVE ON PRODUCTION (v2.76)

**Outcome:** Stage E close executed. 14-day experiment window OPEN. FAB live on production. First in-window event + case captured + triaged via live UI end-to-end. Two follow-up briefs (cc-0015 + cc-0016) drafted PENDING_EXECUTION. Day-19 verdict review = **2026-05-29 Sydney**.

**Build arc (5 phases):**

**Phase 1 — Stage E close + window INSERT.** Pre-flight V-E4 + V-E5 PASS. PK pre-execution review caught 3 verification defects pre-fire: (a) DELETE-protection trigger probe was structurally wrong — DELETE on non-existent rows matches 0 rows, fires 0 trigger calls, would produce false PASS; corrected to INSERT real test row inside savepoint-rollback DO block, DELETE that row, catch P0001, force outer rollback. (b) Probe isolation broken — initial proposal had criteria_snapshot fail-test and notes success-test in one txn; expected P0001 would have aborted surrounding txn before success path; corrected to two independent subtxns inside one DO block. (c) Day-19 wording conflated capture-window-end with verdict-render-date; corrected. Baseline exclusion audit walked all 10 brief §11 scoring queries — every Q1-Q10 has BETWEEN starts_at AND ends_at filter, so 5 baseline events + 5 baseline cases are correctly excluded from verdict computation. Migration `cc_0014_e_close_experiment_run_start` applied single-shot. 4 post-INSERT verification calls all PASS (V-E5 + DELETE-protection probe + criteria_snapshot immutability + final state).

**Phase 2 — FAB live on production via Vercel env var.** PK navigated to Vercel invegent-dashboard project (correctly despite chat misciting `prj_EpPsX7gCu5wGbiSJr1SA3CmjVlAa` which is invegent-portal, not the correct dashboard ID `prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg`), added DASHBOARD_FRICTION_FAB_ENABLED=true env var Production + Preview scope, triggered redeploy. Mid-execution defect 2: PK initially set value to `TRUE` uppercase — strict `=== "true"` gate rendered nothing silently; diagnosed via "FAB not showing" report, corrected to lowercase `true`, second redeploy succeeded. Vercel API verification post-fix: deployment `dpl_9Geda1dbhitN5ykTfV7UxF9A3pKc`, target=production, state=READY, originalDeploymentId points at v2.75 close state at commit `5753f41b` — confirms code unchanged.

**Phase 3 — Live FAB smoke test end-to-end.** PK opened https://dashboard.invegent.com/content-studio, FAB rendered, filed real observation. Form returned `event_id: fbd1b12d-27fd-4444-a861-8051ac3a9937`. DB probe confirmed source=manual, observed_at 2026-05-15 23:51:40 UTC (in-window=true), category=operator_friction, auto-derived problem_key + auto-generated dedupe_fingerprint. Promotion trigger created matching case `b7369dc9-f0d1-4f70-903c-6a590c21a657` same txn with triage_state=new.

**Phase 4 — Triage via /operations on live.** PK opened /operations (screenshot confirms 6 cases visible). All 6 cases triaged to acknowledged this session. For the in-window case (b7369dc9): triage_state=acknowledged, quality_flag=true (criterion 1 qualifying), action_decision=track + next_review_at=2026-05-23 (criterion 4 total but NOT high-intent), capture_reason=routine_log (does NOT count for criterion 5), capture_reason_note='dashboard review'. The `routine_log` choice surfaces the exact gap cc-0015 Stage F addresses — PK's actual semantic ("would have been hit again next workflow touch" = `would_have_rediscovered`, criterion-5-eligible) was not selectable because form gave no guidance mapping options to counterfactuals. Not fixing retrospectively — stands as empirical example for cc-0015 Stage F.

**Phase 5 — Emitter coverage diagnostic + cc-0015 + cc-0016 brief drafting.** PK raised concern about reconciliation/health_check building up. Empirical check via Supabase MCP refuted initial chat diagnosis: trigger `friction_emit_reconciliation` ACTIVE on `r.cadence_drift_log`, all 4 emit/verify functions exist, cron active. Reason for zero events: `r.cadence_drift_log` last INSERT 2026-05-13 (3 historical rows, trigger created after); Cowork silent since 2026-05-06 (10 days). Pipes are dry not unwired. Implication for criterion 3: source-mix likely structurally challenging unless Cowork recovers or Monday reconciliation fires ≥3 drift signals. cc-0015 + cc-0016 briefs drafted and committed PENDING_EXECUTION (commits `9a5dc155` + `f35f8ea4`). Both blocked-on cc-0014 Day-19 verdict.

**Memory edit cycle: 30/30 → 19/30.** 11 approved removals + 2 in-place updates + 1 unauthorised remove (#10 RLS) identified mid-cycle and recovered to authorised state via PK Option (i) re-add verbatim. PK then issued structured approved-list directive — check each memory number against approved-removal list before each destructive op, stop if not in list. Remaining cycle completed without further error. Same-browser PKCE note preserved.

**V-check matrix (4+ PASS this session):**
- V-E4 PASS pre-flight (0 residue)
- V-E5 PASS pre-state + post-INSERT (1 running row, window correct, criteria_snapshot complete)
- DELETE-protection trigger probe PASS (P0001 fired, rollback successful)
- criteria_snapshot immutability + notes mutability PASS (both subtxns expected outcomes)
- Live FAB smoke test PASS (event_id returned, DB landed event + auto-created case)
- Live triage smoke test PASS (8 fields persisted correctly)

**6 NEW L-candidates this session:**
- **L-v2.76-a**: Project IDs cited in chat must be verified from userMemories at point of citation, never recalled from working memory. v2.76 burned by chat asserting `prj_EpPsX7gCu5wGbiSJr1SA3CmjVlAa` as invegent-dashboard when it's invegent-portal. userMemories #15 had correct mapping. Pattern: query userMemories before typing a project ID. 1 occurrence; promotion pending.
- **L-v2.76-b**: Env-gated feature flag setup directives must explicitly state literal value shape (case sensitivity, no quotes, no whitespace). Strict `=== "true"` gates fail silently. Pattern: include explicit literal `Value: \`true\` (lowercase, no quotes, no spaces)` in any env var setup directive. 1 occurrence; promotion pending.
- **L-v2.76-c**: Row-level BEFORE DELETE trigger probes require existing row + savepoint-rollback DO block. DELETE on non-existent rows produces false PASS. Pattern: INSERT test row (outer subtxn), DELETE that row (inner subtxn, catch P0001), force outer rollback so probe doesn't contaminate baseline. 1 occurrence (caught pre-fire by PK); promotion pending.
- **L-v2.76-d**: Post-stage emitter coverage verification — sealing experiment window with N/3 emitters live should be flagged at window-open moment. Pattern: window-open checklist must include emitter-existence + last-upstream-event check for each declared emitter. 1 occurrence; promotion pending.
- **L-v2.76-e (positive)**: PK pre-execution review caught 3 verification defects pre-fire. Confirms pre-fire review value. Generalisable: chat should present verification plan as part of directive surface, expect PK to scrutinise verification approach with same rigour as production action. 1 occurrence; promotion pending.
- **L-v2.76-f**: Destructive memory operations must check each target against explicit approved-list at moment of execution, not against re-derived intent from proposal text. Same class as L-v2.76-a: chat operates from cached internal state when authoritative source is available. PK's structured directive — check memory number against approved-removal list before each destructive op, stop if not in list — is now the protocol. 1 occurrence; promotion pending.

**L-series carries:**
- **L41 + L45** baseline-eligible at 5+ exercises (Vercel API verification + post-INSERT trigger probes + post-FAB submit DB probes + post-triage DB probes).
- **L44** baseline-eligible at 7 cycles (V-E4 + V-E5 + baseline exclusion audit added v2.76).
- **L48** re-exercised (1 atomic migration).
- **L52** not exercised (no EF deploys).
- **L53** not exercised.
- **L55** not exercised (no fixture defects — PK pre-execution review caught probe defect class pre-fire).
- **L58 PROMOTED TO BASELINE v2.76** (3 consecutive preventive applications with zero failures).
- **L60** NOT exercised (different defect class this session).
- **L62** not exercised (0 D-01 fires).

**Production mutations this session:**
- 1 `apply_migration` (`cc_0014_e_close_experiment_run_start`)
- ~12 `execute_sql` calls
- 0 EF deploys, 0 cron mutations, 0 vault writes
- 0 `ask_chatgpt_review` D-01 fires (per brief §13)
- 3 GitHub commits via chat MCP (cc-0015 brief + cc-0016 brief + 3-file sync close as 3 single-file commits per L58)
- 1 PK manual Vercel UI change (env var + value correction)
- 1 PK manual Vercel UI action (Redeploy)
- 13 memory edits (11 removes + 1 unauthorised remove + 1 restore + 2 in-place replaces; final 19/30 cap)

**Production state at v2.76 close:**
- `friction.*` schema live in Supabase `mbkmaxqhsohbtwsqolns`
- **6 friction.event rows**: 5 baseline pre-window + 1 in-window manual via live FAB
- **6 friction.case rows**: all 6 triaged to acknowledged this session
- `friction.emit_error`: 0 rows
- `friction.experiment_run`: **1 row, status='running', brief_id='cc-0014'**, starts_at 2026-05-15 06:20:13 UTC, ends_at 2026-05-29 06:20:13 UTC, criteria_snapshot brief §10 verbatim immutable
- **8 friction.* functions** (unchanged from v2.75)
- **4 triggers on friction.***: 3 now ACTIVE-while-running (criteria_snapshot immutability + 2× DELETE-protection) + 1 always-active (promotion BEFORE INSERT)
- 1 active trigger on r.cadence_drift_log: friction_emit_reconciliation (has not fired since creation)
- 5 pg_cron jobs (82, 83, 84, 85, 86)
- PostgREST exposed_schemas: includes `friction` (carry v2.75)
- `invegent-dashboard` HEAD: `5753f41b` (unchanged from v2.75 — env var only)
- **Vercel invegent-dashboard production**: deployment `dpl_9Geda1dbhitN5ykTfV7UxF9A3pKc` serving with DASHBOARD_FRICTION_FAB_ENABLED=true (Production + Preview scope); FAB live on dashboard.invegent.com
- Localhost `.env.local` still has DASHBOARD_FRICTION_FAB_ENABLED=true (cross-surface duplicate risk acknowledged; cleanup post-window recommended)
- T-MCP-02 cum: **66** (unchanged from v2.72)
- State-capture exceptions cumulative: **1** (unchanged from v2.72)
- main HEAD on Invegent-content-engine: this commit (v2.76 sync_state) building on `e3a2d6a7` (v2.76 session file) building on `f35f8ea4` (cc-0016 brief) building on `9a5dc155` (cc-0015 brief)

---

### 2026-05-15 Sydney — cc-0014 STAGE D CLOSED + STAGE E APPLIED (v2.75)

**Outcome:** Stage D fully closed + Stage E backend + frontend + brief-completing promotion trigger ALL APPLIED. 14-day experiment window NOT yet started — one step (experiment_run INSERT) remained for v2.76. Verdict Day-19 = 2026-05-29 Sydney.

**Build arc (5 phases)**: Stage D close via FAB relocation (CCD initial commits in wrong repo `Invegent-content-engine/dashboard/` cc-0013 sandbox; recovery via PK directive v2 — kebab-case + Option K2 + Option E2; HEADs `6711d5f4` invegent-dashboard + `86d2c2b9` content-engine revert); PostgREST exposed_schemas fix via PK manual UI; Stage E backend (fn_recent_cases + fn_triage_case migration; first apply timed out at 4-min wait without committing, verified non-commit + retry succeeded); Stage E frontend CCD at HEAD `5753f41b`; brief gap discovery (cc-0014 §7 "7-day case lookup" never built across A-D; ALL Day-19 criteria on friction.case rows joined via case_id but 5 orphan events); PK directive G1 dedupe_fingerprint identity for promotion trigger; V-P1..V-P8 PASS + 5 V-D5 orphans backfilled 1:1 into 5 cases; V-E3 PK manual 4 screenshots.

**V-check matrix (16 PASS)**: V-D1..V-D5 + Supp-1/2 + V-E1/V-E2/V-E3 + V-P1..V-P8.

**3 NEW L-candidates v2.75**: L63 (brief implementation gap at sub-stage UI integration), L64 (repo-target verification before chaining CCD operations), L65 (PostgREST exposed_schemas as runtime config dependency).

**L58 strengthened to 3rd preventive application** — promotion to baseline applied at v2.76. **L41 + L45** baseline-eligible at 4 exercises. **L44** baseline-eligible at 6 cycles. **L48** re-exercised (2 atomic migrations). **L55 reactive cycle 4**. **L60 occurrence 7** (V-E2 UUID fixture).

**Production state v2.75 close**: friction.event 5 rows + friction.case 5 rows (4 new + 1 acknowledged) + friction.experiment_run empty + 8 friction.* functions + 4 friction.* triggers + 1 active trigger on r.cadence_drift_log + 5 pg_cron jobs + PostgREST exposed_schemas extended via PK manual UI + invegent-dashboard HEAD `5753f41b` + DASHBOARD_FRICTION_FAB_ENABLED=true in PK's local .env.local + T-MCP-02 cum 66 + state-capture exceptions 1 + 0 memory edits (30/30 cap; memory cycle needed next session).

---

## 🟡 Next session priorities (rebuilt v2.76)

1. **In-window operational use of FAB** — **P1 rank 1 v2.76.** Target ≥3 in-window events from source=manual to qualify manual as a contributing source for criterion 3. Currently at 1 in-window event. PK files real friction observations via dashboard.invegent.com FAB during normal operations. Each event auto-promotes via promotion trigger; PK triages on /operations within 72h to maintain late_triage_ratio ≤ 0.50 invalidation gate.
2. **Cowork output pipeline recovery** — P1 rank 2 v2.76 (carry from v2.75). Output pipeline silent since 2026-05-06 (11+ days as of v2.76 close). Recovery via PK manual `openclaw tui` trigger on Windows. Critical for criterion 3 source-mix viability.
3. **Mid-window check-in at ~Day 7** — P1 rank 3 v2.76. Target 2026-05-22 Sydney. Empirical reading of all 5 criteria + invalidation gates against current friction state. If criterion 3 looks structurally unsatisfiable at Day 7, flag for honest INVALID-EXTEND vs FAIL conversation.
4. **Day-19 verdict execution** — P1 rank 4 v2.76. **2026-05-29 Sydney**. Execute all 10 brief §11 scoring queries. Render verdict PASS / FAIL / INVALID. Author postmortem brief within 14 days per brief §14. If PASS: cc-0015 + cc-0016 unblocked for execution (parallel-executable). If INVALID: identify instrument cause, decide re-run with same criteria_snapshot OR cc-0014-v2.
5. **Brief v1.2 doc patch (combined defects + L60 + L63 + L64 + L65 + L-v2.76-a-f framing)** — P3 rank 5 carry from v2.75. Doc-only. Defer until post Day-19.
6. **cc-0013 Dashboard Phase 0** — **P2 DEPRIORITISED rank 6 carry.** Hold pending cc-0014 Day-19 verdict.
7. **Close-the-loop batch sweep** — P2 rank 7. 31 eligible rows (5 prior cc-NNNN + 2 v2.72 + 24 historical). v2.76 adds 0 new D-01 rows.
8. **Personal businesses check-in** — standing P0. Crazy Domains refund + clean-up follow-up still carried from v2.51.

Carries (lower priority unchanged from v2.75):
- v1.1 cc-0012 doc patch (P3)
- v1.6 cc-0010A doc patch (P3)
- v1.3 cc-0011 doc patch (P3)
- F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN)
- Publisher latent config risk follow-up (P3)
- M8b separate brief (NOT YET AUTHORED)
- 94-row un-publishable legacy draft cohort
- Feature branch `feature/cc-0009-stage-b-ef-source` preservation (P3)
- Memory cap hygiene (19/30 v2.76; 11 free slots headroom; no urgent action needed)
- Dashboard mobile responsiveness (P3)
- AI cost view (P3 quick win)
- github MCP write tools — L58 promoted to baseline v2.76
- Platform Reconciliation View brief authoring (P2, fully eligible since v2.68)
- 3 pre-v2 forensic `r.reconciliation_run failed` rows (P3 carry)
- Cron 82-86 firing normally
- **NEW v2.76 carry**: localhost FAB cleanup post-window (`.env.local` still has flag enabled; cleanup recommended post-window)

---

## ⛔ Carried-forward "do not touch" state

**v2.76 update on standing items:**

- **cc-0014 CLOSED v2.76** (all stages applied through window-open INSERT). Verdict Day-19 = 2026-05-29 Sydney.
- **cc-0014 Stage E: window OPEN v2.76.** Migration `cc_0014_e_close_experiment_run_start` applied. friction.experiment_run row live (status=running, starts_at 2026-05-15 06:20:13 UTC, ends_at 2026-05-29 06:20:13 UTC, criteria_snapshot brief §10 verbatim immutable). DELETE-protection triggers + criteria_snapshot immutability trigger all active for next 14 days.
- **cc-0014 Stage D: live on production v2.76.** Vercel env var DASHBOARD_FRICTION_FAB_ENABLED=true set Production + Preview scope. Deployment dpl_9Geda1dbh... serving production. FAB rendered on dashboard.invegent.com all (dashboard) routes. First in-window event captured + auto-promoted + triaged end-to-end.
- **cc-0014 Stage C: APPLIED v2.74.** Health_check emitter ready for Cowork dual-write. V-C3 still PENDING live Cowork run; Cowork pipeline silent 11+ days as of v2.76 close.
- **cc-0014 Stage B: APPLIED v2.73.** Reconciliation trigger active; no new drift rows since 2026-05-13 so trigger has not fired.
- **cc-0014 Stage A: APPLIED v2.72.** Schema foundation unchanged.
- **cc-0014 brief FROZEN at v1.1** (commit `34305092f4`). Brief v1.2 doc-patch scope continues to expand (now includes L-v2.76-a through L-v2.76-f framing alongside prior 6 defects + L60 + L63 + L64 + L65 framing).
- **cc-0015 friction-pool-view: AUTHORED PENDING_EXECUTION v2.76.** Commit `9a5dc155`. Blocked-on cc-0014 Day-19 verdict.
- **cc-0016 friction-capture-evidence: AUTHORED PENDING_EXECUTION v2.76.** Commit `f35f8ea4`. Blocked-on cc-0014 Day-19 verdict. Parallel-executable with cc-0015.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0** (commit `bc32e86`). Sunset 2026-06-15.
- **L38 candidate VINDICATED v2.67 + reaffirmed v2.68.** Recommend promotion to baseline next cycle.
- **L40 reified end-to-end at runtime v2.68.** Not re-exercised v2.76.
- **L41 strengthened v2.76** (5+ baseline-eligible exercises now).
- **L44 baseline-eligible** strengthened v2.76 (7 cycles cumulative).
- **L45 baseline-eligible** strengthened v2.76 (5+ exercises now).
- **L46 baseline shape v2.76**: 0 D-01 fires this session (4th consecutive 0-D-01 stage-execution session).
- **L47 still deferred v2.76.** No parallel-writer race opportunity observed.
- **L48 re-exercised v2.76** (1 atomic migration).
- **L52 candidate carry from v2.70**. Not exercised v2.76.
- **L53 reactive carry**. Not exercised v2.76.
- **L55 reactive carry from v2.75** (4 cycles cumulative). Not exercised v2.76.
- **L57 candidate carry from v2.71**: not exercised v2.76.
- **L58 PROMOTED TO BASELINE v2.76**: 3 consecutive preventive applications within consistent cc-0014 context with zero failures.
- **L59 candidate carry from v2.72**: not re-exercised v2.76 (but vindicated by trigger activation this session).
- **L60 candidate carry from v2.75** (7 occurrences cumulative). NOT exercised v2.76. Promotion still pending pattern repeat in independent brief.
- **L62 carry from v2.72**: not exercised v2.76 (0 D-01 fires).
- **L63 candidate carry from v2.75**: not re-exercised v2.76. Promotion pending.
- **L64 candidate carry from v2.75**: not re-exercised v2.76. Promotion pending.
- **L65 candidate carry from v2.75**: not re-exercised v2.76. Promotion pending.
- **L-v2.76-a NEW v2.76**: 1 occurrence. Promotion pending.
- **L-v2.76-b NEW v2.76**: 1 occurrence. Promotion pending.
- **L-v2.76-c NEW v2.76**: 1 occurrence (caught pre-fire by PK). Promotion pending.
- **L-v2.76-d NEW v2.76**: 1 occurrence. Promotion pending.
- **L-v2.76-e NEW v2.76 (positive)**: 1 occurrence. Promotion pending.
- **L-v2.76-f NEW v2.76**: 1 occurrence. Promotion pending. Same class as L-v2.76-a.
- **L49 carry from v2.67**: not exercised v2.76.
- **cc-0009 PRV-1 second build: COMPLETE.** Unchanged.
- **cc-0012 PRV v1: CLOSED-WITH-VERIFIED-VARIANCE v2.71.** Unchanged.
- **cc-0011 cadence-drift-checker: CLOSED-WITH-VERIFIED-VARIANCE v2.70.**
- **cc-0010C reconciliation-matcher: CLOSED-WITH-VERIFIED-VARIANCE v2.69.**
- **cc-0010B ice-evidence-materialiser: CLOSED-WITH-VERIFIED-VARIANCE v2.68.**
- **cc-0010A r.* DDL Foundation: APPLIED + CLOSED v2.67.**
- **5 prior close-the-loop carries: still pending, 17 sessions overdue v2.76.**
- **2 new close-the-loop carries v2.72**: 903cfd8e + 873985f7 both PK-resolved, pending status='resolved' UPDATE.
- **24 unrelated historical escalated m.chatgpt_review rows**: intentionally untouched per CCH directive.
- **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION**: P3 OPEN.
- **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY**: P3 OPEN.
- **L34 trigger filter audit**: P3 carry.
- **3 pre-v2 forensic `r.reconciliation_run failed` rows**: retained per directives.
- **T-MCP-02 quota: 66 cumulative v2.76** (unchanged from v2.72).
- **State-capture exceptions cumulative: 1** (unchanged from v2.72).
- Cron 82-86 firing normally.
- Dashboard roadmap PHASES — **29th** consecutive deferral. Intentional per IOL hold-stance pending Day-19 verdict 2026-05-29.
- M-series total dead-letter rows cleared since 8 May 2026: 396 rows (unchanged).
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier) — list unchanged.
- github MCP write tools: L58 promoted to baseline v2.76; per-file single-file commit strategy now default.
- PostgREST exposed_schemas continues to include `friction` (carry from v2.75).
- **Cowork output pipeline silence since 2026-05-06** — now 11+ day gap as of v2.76 close. Continues to be P1 OPEN rank 2.
- **Production FAB live on dashboard.invegent.com**: NEW v2.76. Vercel env var DASHBOARD_FRICTION_FAB_ENABLED=true. Deployment dpl_9Geda1dbh... serving. Localhost cleanup pending — `.env.local` still has the flag enabled (post-window cleanup recommended).

---

## 📜 G1 convention (the rule)

Unchanged. Per-session file `docs/runtime/sessions/2026-05-16-v2.76-stage-e-close-and-window-open.md` (new this session) written. This sync_state + action_list updated. **No cc-0014 result file** (closes at Day 19 verdict, not at window-open INSERT). All 3 sync files via chat MCP per-file single commits this session per L58 (now baseline). 3-of-4-way sync this session (docs + memory updated; dashboard PHASES 29th consecutive deferral per IOL hold-stance pending Day-19 verdict).

**This file size**: ~50KB after this update (v2.76 — v2.76 current + v2.75 previous inlined per G1 "1-2 sessions inlined" rule; v2.74 + earlier retained as pointer rows in session index table only).

---

*Last updated: 2026-05-16 Sydney — v2.76: cc-0014 FULLY CLOSED + 14-DAY WINDOW OPEN + FAB LIVE ON PRODUCTION + cc-0015 + cc-0016 DRAFTED. Stage E close via migration cc_0014_e_close_experiment_run_start. Window open 2026-05-15 06:20 UTC → 2026-05-29 06:20 UTC. Day-19 verdict = 2026-05-29 Sydney. PK pre-execution review caught 3 verification defects pre-fire. FAB live on dashboard.invegent.com via Vercel env var; 2 mid-execution defects caught and recovered. Live FAB smoke test + triage end-to-end PASS. cc-0015 + cc-0016 briefs AUTHORED PENDING_EXECUTION (commits 9a5dc155 + f35f8ea4). Memory cycle 30→19 with 1 mid-cycle defect identified and recovered. 0 D-01 fires per brief §13. T-MCP-02 cum 66. State-capture exceptions cum 1. 6 NEW L-candidates v2.76 (a–f). L58 PROMOTED TO BASELINE. Dashboard PHASES 29th consecutive deferral intentional. Previous (v2.75): cc-0014 Stage D CLOSED + Stage E APPLIED.*
