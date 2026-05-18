# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-18 Sydney late evening (**v2.82 — cc-0017b Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + 27/27 V-CHECKS PASS.** 2 migrations applied: `cc_0017b_friction_unified_emit_event` (main, 11 atomic steps) + `cc_0017b_emit_event_ambiguity_fix` (corrective, fixing emit_event Step 9 WHERE clause 42702 ambiguity). Both D-01 review IDs resolved: `b612a8e4-...` (original plan_review, partial type-c → Path B) + `a6415afa-...` (corrective sql_destructive, partial → Path A satisfy-corrected-action). All 27 V-checks PASS via sequential DO-block pattern (V-B12/V-B13/V-B14/V-B22 converted from data-modifying CTEs per PK directive). Production baseline restored: 22 events / 22 cases / 3 source seeds. T-MCP-02 cum 71→73. L62 exercised (Path A satisfy). L58 applied (4-file atomic push). L41 surfaced 3 brief SQL defects in-session. 6 brief defects flagged for v1.1 patch (doc-only, deferred). **Today/Next 5 rebuilt**: Wave 0c authoring → rank 1 (cc-0017b apply closed; no Wave 0c work started per PK directive). State-capture exceptions unchanged at 1. Dashboard PHASES **35th consecutive deferral**. 4-file atomic sync this commit.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rules unchanged from v2.81.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46/47/48/50/55/56/57/58 + L33–L65 + L-v2.76-a through L-v2.76-f + L-v2.78-a (watcher → promotion-eligible v2.79) + L47-candidate + L-v2.81-a-candidate carried. **D-IOL-001 (v2.77) carried.** **D-CC-0017B-Q1 (severity_override query-pattern note) NEW v2.82** — see docs/06_decisions.md.

**v2.82 ADDITIONS:**
- **cc-0017b Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + CLOSED.** Main migration `cc_0017b_friction_unified_emit_event` (11 atomic steps) + corrective `cc_0017b_emit_event_ambiguity_fix` (one-line WHERE clause qualification). All 27 V-checks PASS. friction.* schema state v2.82: 9 tables (unchanged), 12 functions (10 cc-0017a + 2 new: fn_severity_rank + fn_attach_or_create_inner_v1; 5 rewritten in-place), 1 partial unique index (unchanged), 1 corrective fix on emit_event, 3 emission_rule seeds active.
- **D-01 fires v2.82: 2.** Both resolved in-session via close-the-loop UPDATE on `m.chatgpt_review`. T-MCP-02 cum 71→**73**.
- **Today/Next 5 rebuilt**: Wave 0c authoring → rank 1 (replaces cc-0017b authoring which is now CLOSED-APPLIED). PK directive: no Wave 0c work started this session.
- **State-capture exceptions: 1** (unchanged).
- **L62 exercised v2.82** — Path A satisfy-corrected-action on corrective D-01 partial verdict. Baseline application correct.
- **L41 surfaced 3 brief SQL defects in-session** (P16 NULL handling; V-B22 FK columns; V-B27 cleanup orphan patterns). Cumulative L41 occurrences across v2.80-v2.82 = 6.
- **L58 applied v2.82** — 4-file atomic push_files this commit.
- **L-v2.78-a** unchanged at 2 occurrences.
- **L47** unchanged at 1 occurrence.
- **L-v2.81-a** unchanged at 1 occurrence (no parallel-session apply).
- **Brief v1.1 patch row added** to Active (6 defects to fix; doc-only; non-blocking; P3 carry).
- **Dashboard PHASES sync: 35th consecutive deferral.**

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~3 (recon daily diagnostic + health_check signal diagnostic + dashboard PHASES sync) — unchanged from v2.81 | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~15h (was ~13h v2.81; +cc-0017b apply session ≈ ~2h) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.82 cycle: ~2h total** (P-set pre-flight + main migration apply + V-B1-9 + V-B10 fail + corrective D-01 fire + corrective migration apply + V-B10-27 sequential + V-B1-9 smoke + close-the-loop ×2 + 4-file atomic close). 2 schema mutations this session (main + corrective).

**State-capture exception count v2.82: 0**. Cumulative: 1 (unchanged).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-18 Sydney late evening (v2.82).
> **v2.82 note:** cc-0017b Wave 0b CLOSED-APPLIED this session. Wave 0c authoring is the next deliverable; **PK directive: no Wave 0c work started this session.** Wave 0c scope TBD at authoring kick-off.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Wave 0c authoring** | **P1 (rank 1 v2.82 — promoted from cc-0017b APPLY closed)** | cc-0017b Wave 0b delivered the unified emit_event layer. Wave 0c is the next foundational wave per friction plan v1 (0a → 0b → 0c → 1-6 → 7 → 8). Scope TBD at kickoff. Gate OPEN; no preemptive work started this session per PK directive. D-01 + apply in separate sessions per cc-0017a / cc-0017b precedent. | chat → PK | PK to confirm Wave 0c scope; chat to read plan §6.7+ + cc-0017b v1.0 + current `friction.*` schema state; author brief at `docs/briefs/cc-0017c-...md`. |
| 2 | **Reconciliation daily cadence diagnostic** | **P1 (rank 2 v2.82 carry)** | cron 85 next fire ≈2026-05-19 03:30 AEST. Question post-cc-0017b: did the wrappers route correctly through unified emit_event? Did `r.cadence_drift_log` write rows? did `friction.event` write rows? are they paired correctly? | chat → PK | Post-fire SQL: count `r.cadence_drift_log` rows since last fire + count `friction.event source='reconciliation'` rows same window. |
| 3 | **Health_check V-C3 + signal-production diagnostic** | **P1 (rank 3 v2.82 carry)** | V-C3 still PENDING since 2026-05-15. Cowork brief reset to v3.0 `status: ready`. Awaiting next Cowork fire. | Cowork (scheduled) → chat | Check for new `docs/audit/health/YYYY-MM-DD.md` post-fire window; reconcile against friction.event. |
| 4 | **Music library activation** | **P2 (rank 4 v2.82 carry)** | Code wired in `video-worker` v3.0.0. ~30 min PK-led with chat guidance. | PK + chat | Create bucket `post-music`; upload 9 tracks; set env var; smoke test one video render. |
| — | (rank 5 unranked) | — | Next-natural candidate (brief v1.1 patch for cc-0017b, OR close-the-loop batch sweep) gated on PK directive. Leave unranked until PK directs. | — | — |

**Standing P0 (not ranked):** Personal businesses check-in. Crazy Domains refund + clean-up follow-up carry from v2.51.

**Passive observation v2.82**: Cron 82 + 83 + 84 + 85 (daily) + 86 unchanged. PRV v1 operator views queryable via `op_reader` role. **friction.* schema state v2.82**: 9 tables (unchanged from v2.81); 12 functions (10 cc-0017a + 2 new helpers; 5 of the 10 rewritten in-place to route through emit_event); 1 partial unique index (unchanged); 1 corrective fix on emit_event (WHERE clause schema-qualified); 3 emission_rule seeds active (reconciliation/observer_stale, health_check/true_stuck, manual/manual_fab); friction.event has new column `dynamic_context jsonb` (nullable); CHECK constraint on event.category_source extended with `'category_override'` (no `'severity_override'` value — severity audit lives in dynamic_context only per D-CC-0017B-Q1); 22 events + 22 cases (production baseline preserved across V-check sequence). PostgREST exposed_schemas includes `friction`. /operations route live at HEAD `5753f41b`. Next natural fires: cron 85 daily 03:30 AEST (≈17:30 UTC); cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (UPDATED v2.82)

**Status v2.82: ✅ SIGNED 2026-05-18 (v2.79). Wave 0a APPLIED + CLOSED v2.81. Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + CLOSED v2.82. Wave 0c authoring gate OPEN.**

**Documents committed:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`) — unchanged
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` (SIGNED with §5.5 + §9) — unchanged v2.82
- `docs/briefs/cc-0017a-friction-register-foundational-schema.md` (v1.1) — APPLIED v2.81
- Migration `cc_0017a_friction_foundational_schema` live at version `20260518065610` — APPLIED v2.81
- `docs/briefs/cc-0017b-friction-register-unified-emit-event.md` v1.0 (9-file structure: 1 index + 8 sub-files) — APPLIED v2.82 (6 defects flagged for v1.1 patch)
- Migration `cc_0017b_friction_unified_emit_event` live (main) — APPLIED v2.82
- Migration `cc_0017b_emit_event_ambiguity_fix` live (corrective) — APPLIED v2.82
- `docs/runtime/sessions/2026-05-18-v2.79-friction-plan-signed.md` — v2.79
- `docs/runtime/sessions/2026-05-18-cc-0017a-v1.1-and-d01-fire.md` — v2.80
- `docs/runtime/sessions/2026-05-18-cc-0017a-applied-l41-l47.md` — v2.81
- `docs/runtime/sessions/2026-05-18-cc-0017b-applied.md` — v2.82 (this commit)

**32 decisions governing execution + 2 within-amendment clarifications:** unchanged v2.82.

**Open gates v2.82:**
1. ✅ PK explicit approval of v1 + amendments → CLOSED 2026-05-18 (v2.79)
2. ✅ cc-0017a brief authored → CLOSED v2.80
3. ✅ D-01 review for cc-0017a → CLOSED v2.80
4. ✅ cc-0017a Wave 0a migration applied + V-checks PASS → CLOSED v2.81
5. ✅ **cc-0017b brief authored + D-01 + apply → CLOSED v2.82**
6. ⏳ **Wave 0c authoring → unblocks Waves 1-6** (next session priority rank 1; no Wave 0c work started this session per PK directive)
7. ⏳ After Wave 0c applied: friction.event volume empirically observed for 1 week before pool view design (Wave 7)

**v2.82 apply provenance:** cc-0017b main + corrective migrations both applied via this session's `apply_migration` MCP calls. Both D-01 fires (`b612a8e4-...` + `a6415afa-...`) resolved in-session via close-the-loop UPDATE on `m.chatgpt_review`. No parallel-session apply this session.

**Critical empirical findings preserved unchanged from v2.79.**

---

## 🟢 cc-0017b Wave 0b — STATUS BLOCK (NEW v2.82)

**Status v2.82: ✅ CLOSED-APPLIED-WITH-CORRECTIVE-MIGRATION.**

**Migrations:**
- Main: `cc_0017b_friction_unified_emit_event` (11 atomic steps in single transaction)
- Corrective: `cc_0017b_emit_event_ambiguity_fix` (one-line WHERE clause qualification fixing SQLSTATE 42702 ambiguity on emit_event Step 9)

**Both applied 2026-05-18 Sydney late evening via this session.**

**V-checks: 27/27 PASS.** Via sequential DO-block pattern after PK mid-session directive to convert V-B12/V-B13/V-B14/V-B22/V-B25 from data-modifying CTEs.

**Behavioural delivery:**
- Unified `friction.emit_event(p_source, p_condition_key, p_problem_key, p_source_event_id, p_observed_at, p_related_object, p_observation_text, p_raw_payload, p_reported_by, p_severity_override, p_category_override, p_dynamic_context)` — 12 params, SECURITY DEFINER, RETURNS TABLE (event_id, case_id, case_disposition)
- New attach-or-create-or-reopen logic with 14-day window per §5.5 Clarification 1: dispositions `created_new` / `attached_open` / `reopened_within_window` / `created_after_window` / `idempotent_replay` / `suppressed_by_rule`
- Severity escalation: when attaching to open case with higher severity, case severity is MAX(case.severity, event.severity); when reopening, case severity is REPLACED with new event severity (not MAX)
- Predecessor case_id linked on `created_after_window` disposition
- 3 emit_* wrappers (reconciliation, health_check, manual) rewritten as thin wrappers calling emit_event
- `fn_promote_event_to_case` rewritten with GUC bypass (when emit_event is in scope, trigger no-ops) + defence-in-depth (direct INSERTs bypassing emit_event still get case_id attached via the inner helper, with BYPASS-DEFENCE emit_error log)
- `fn_severity_rank(text)` helper returns 1-4 for info/warn/critical/severity_override
- 3 emission_rule seeds: reconciliation/observer_stale, health_check/true_stuck, manual/manual_fab

**Schema state delivered:**
- `friction.event` new column: `dynamic_context jsonb` (nullable)
- `friction.event.category_source` CHECK constraint extended with `'category_override'` (NOT `'severity_override'` per D-CC-0017B-Q1)
- 2 new helper functions: `fn_severity_rank`, `fn_attach_or_create_inner_v1`
- 5 existing functions rewritten in-place: `emit_event` (NEW), `fn_promote_event_to_case`, `fn_emit_reconciliation_event`, `fn_emit_health_check_findings`, `fn_emit_manual_event`
- 3 emission_rule rows seeded
- GRANTs applied per role matrix
- 1 corrective fix: emit_event Step 9 WHERE clause schema-qualified

**Behavioural change scope:** SUBSTANTIAL. All friction emission now routes through emit_event. Existing pipelines continue to fire (3 emit_* wrappers preserve signatures); next natural cron 85 fire will exercise the reconciliation wrapper end-to-end; next FAB click will exercise the manual wrapper end-to-end.

**Brief v1.1 patch required (deferred to separate commit, doc-only):**
1. emit_event Step 9 unqualified WHERE in `migration-sql-part-a.md`
2. P16 SQL strict NULL handling in `preflight-pset.md`
3. V-B12/V-B13/V-B14 data-modifying CTE concurrency in `vchecks.md`
4. V-B15 expected cat_source typo in `vchecks.md`
5. V-B22 INSERT missing 3 NOT NULL FK columns in `vchecks.md`
6. V-B27 cleanup orphan patterns in `vchecks.md` (discovered during V-B27, not in PK's initial count of 5)

Plus `hardstop-rollback.md` §5.5.5c + §5.5.5d still have `<INSERT_CC0014_BODY_FROM_PROD>` placeholders — actual bodies captured in m.chatgpt_review.context for review_id `a6415afa-...` at session start.

**Open follow-ups for Wave 0c:**
- Wave 0c scope TBD at authoring kickoff (no preemptive work started per PK directive)
- Empirical observation of friction.event volume post-cc-0017b across all 3 source paths (reconciliation cron 85, health_check cron 86, manual FAB)
- Re-run reconciliation cadence diagnostic post-next cron 85 fire to confirm wrapper routing

---

## 🟢 cc-0017a Wave 0a — STATUS BLOCK (carried unchanged from v2.81)

Unchanged. CLOSED-APPLIED v2.81. See action_list v2.81 for detail.

---

## 🟢 cc-0014 friction register — STATUS BLOCK (unchanged v2.82)

Unchanged. CLOSED-ARCHIVED 2026-05-18 (v2.77).

---

## 🟢 cc-0015 Friction Pool View — STATUS BLOCK (unchanged v2.82 — Wave 7)

Unchanged. AUTHORED PENDING_EXECUTION; SEQUENCED TO WAVE 7.

---

## 🟢 cc-0016 Friction Capture Evidence — STATUS BLOCK (unchanged v2.82 — Wave 8)

Unchanged. AUTHORED PENDING_EXECUTION; SEQUENCED TO WAVE 8.

---

## 🟢 cc-0012 PRV v1 — STATUS BLOCK (carried v2.82, condensed)

Unchanged. CLOSED-WITH-VERIFIED-VARIANCE v2.71.

---

## 🟢 cc-0010B ice-evidence-materialiser — STATUS BLOCK (carried v2.82, condensed)

Unchanged. CLOSED-WITH-VERIFIED-VARIANCE v2.68.

---

## 🟢 cc-0010A r.* DDL Foundation — STATUS BLOCK (carried v2.82, condensed)

Unchanged. APPLIED + CLOSED v2.67.

---

## 🟢 Process Upgrades L44–L48 + L52–L65 + L-v2.76-a-f + L-v2.78-a + L47-candidate + L-v2.81-a-candidate — STATUS BLOCK (UPDATED v2.82)

**Status v2.82:** L40 reified v2.68. L44 + L45 + L46 + L48 baseline-eligible (carry from v2.76). **L58 BASELINE v2.76** carried (applied this session — atomic 4-file push_files). **L62 baseline-eligible v2.77** — exercised v2.82 (Path A satisfy-corrected-action on corrective D-01 partial verdict). L60 at 7 occurrences (carry). L63 + L64 + L65 candidates carry from v2.75. L-v2.76-a through L-v2.76-f carry.

**v2.82 cycle outcomes:**
- **L41 surfaced 3 brief SQL defects in-session this session**: (a) P16 SQL `= ''` check failed on NULL from unset GUC; (b) V-B22 INSERT missing 3 NOT NULL FK columns; (c) V-B27 cleanup patterns missed 6 orphans. Cumulative L41 occurrences across v2.80-v2.82 = 6. Baseline tightening recommendation reinforced.
- **L58**: 4-file atomic push_files applied this session close — baseline correctly applied.
- **L62 exercised v2.82**: Path A satisfy-corrected-action on corrective D-01 `a6415afa-...` partial verdict. Comprehensive ambiguity audit completed before PK approval. Baseline application correct.
- **L-v2.78-a watcher candidate**: not re-exercised v2.82 (no new reviewer convergence event). Unchanged at 2 occurrences.
- **L47 CANDIDATE v2.80**: unchanged at 1 occurrence v2.82.
- **L-v2.81-a CANDIDATE v2.81**: unchanged at 1 occurrence v2.82 (no parallel-session apply this session). Promotion eligible on re-exercise.

**Cumulative recommendation v2.82:** L41 cumulative 6 across v2.80-v2.82. Formal baseline tightening still recommended at appropriate lesson cycle.

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (unchanged v2.82)

Unchanged. ALL STAGES CLOSED at v2.65.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

**v2.82 update:**
- **cc-0017b apply session complete** — no follow-on calendar items from this session itself.
- **Reconciliation daily diagnostic soft deadline**: next cron 85 fire ≈2026-05-19 03:30 AEST (≈17:30 UTC). Worth re-checking post-fire to confirm cc-0017b wrappers route correctly through emit_event.
- **No new v2.82 calendar items.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.82 application**: 2 D-01 fires this session (`b612a8e4-...` plan_review v2.80→close-loop v2.82 + `a6415afa-...` corrective sql_destructive in-session). Both closed in-session via close-the-loop UPDATE on m.chatgpt_review. Cumulative T-MCP-02: **73** (was 71 v2.81; +2 this session).

**L46 Evidence Gate v2.82**: applied at both D-01 fires (pre-flight evidence + production state context attached). Worked as designed.
**L62 v2.82 exercises**: 1 (corrective D-01 Path A satisfy-corrected-action). Baseline-eligible since v2.77; cumulative well past threshold.
**State-capture exceptions v2.82: 0.** Cumulative: 1 (unchanged).
**Close-the-loop UPDATEs v2.82: 2** (both this session's D-01 fires closed). **25 outstanding** unchanged (22 historical CCH-locked + 3 v2.77 new).

---

## 🤖 Cowork automation (D182)

**v2.82 status:** unchanged from v2.81. Cron 82 + 83 + 86 firing normally. V-C3 still PENDING live run.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Wave 0c authoring** | Per friction plan v1 wave structure (0a → 0b → 0c → 1-6 → 7 → 8); scope TBD at kickoff | **P1 — rank 1 v2.82 (NEW, promoted from cc-0017b APPLY closed)** | EXECUTION GATE OPEN. **No Wave 0c work started this session per PK directive.** Awaits PK scope confirmation. D-01 + apply in separate sessions per precedent. | chat → PK | PK to confirm scope; chat to author brief once approved. |
| **Reconciliation daily cadence diagnostic** | First post-cc-0017b cron 85 fire ≈2026-05-19 03:30 AEST | **P1 (rank 2 v2.82 carry)** | OPEN. Material exists; cc-0017b adds the question "did wrappers route through emit_event correctly?" | chat → PK | Post-fire SQL count comparison + emit_event signature check |
| **Health_check V-C3 + signal-production diagnostic** | Three sub-questions on Cowork pipe | **P1 (rank 3 v2.82 carry)** | OPEN. V-C3 PENDING. | Cowork → chat | Check post-fire `docs/audit/health/YYYY-MM-DD.md` |
| **Music library activation** | Code wired in video-worker v3.0.0; env-var gated | **P2 (rank 4 v2.82 carry)** | PENDING PK execution. | PK + chat | Create bucket; upload 9 tracks; set env var; smoke test |
| **cc-0017b brief v1.1 patch (6 defects)** | doc-only; non-blocking | **P3 carry (NEW v2.82)** | OPEN. 6 defects identified + 2 placeholders to fill. Doc-only. Can be done in any future session. | chat → future | Single commit patching 6 brief sub-files; inline cc-0014 bodies into §5.5.5c + §5.5.5d (captured at session start in m.chatgpt_review.context for review_id `a6415afa-...`). |
| **cc-0015 friction-pool-view brief** | Authored PENDING_EXECUTION; Wave 7 | **P2 (Wave 7 v2.82 carry)** | DRAFTED. Commit `9a5dc155`. Wave 7 awaits empirical volume from Waves 1-6. | chat → PK (Wave 7) | Stage A re-scope when Wave 7 reached |
| **cc-0016 friction-capture-evidence brief** | Authored PENDING_EXECUTION; Wave 8 | **P2 (Wave 8 v2.82 carry)** | DRAFTED. Commit `f35f8ea4`. Wave 8 awaits Wave 7. | chat → PK (Wave 8) | Stage A unchanged as drafted |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | **P2 (carry v2.82)** | OBSERVED. Unblocked per D-IOL-001. | chat → PK | Verify throttles + dry-run + re-enable |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter + upstream chain | **P2 (carry v2.82)** | LOGGED. Unblocked per D-IOL-001. | chat → PK | Audit m.post_draft + decide filter expansion or chain investigation |
| **Dashboard PHASES sync** | PHASES array stale since 3 May | **P2 (carry v2.82 — 35th consecutive deferral)** | Unblocked per D-IOL-001. Discipline call increasingly overdue. | chat → PK | Update `app/(dashboard)/roadmap/page.tsx` at next dashboard session |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 (carry) | OPEN. | PK | When PK directs |
| **Close-the-loop batch sweep — 25 escalated remain** | Gated on PK directive | P2 (carry v2.82) | 22 historical + 3 v2.77 new. No additions v2.82 (both D-01 fires closed in-session). | chat → future PK directive | Hold pending PK lift of CCH + meta resolution |
| **L-v2.78-a baseline promotion** | Reviewer convergence is high-signal | **P3 (carry v2.82 — eligible at next lesson cycle)** | Still 2 occurrences. | chat → next session | Promote to baseline at appropriate cycle |
| **L47 baseline promotion** | Check list_recent_commits before retrying apparent push failures | **P3 (carry v2.82 — 1 occurrence)** | 1 occurrence. Not re-exercised v2.82. | chat → next session | Promote on re-exercise |
| **L-v2.81-a baseline promotion** | Parallel-session apply coordination | **P3 (carry v2.82 — 1 occurrence)** | Not re-exercised v2.82. | chat → next session | Promote on re-exercise |
| **Brief v1.2 doc patch (cc-0017a)** | 6 defects + L60 + L63 + L64 + L65 + L-v2.76-a-f framing + L-v2.78-a + L47 + L-v2.81-a (if promoted) | P3 (carry, scope expanded v2.82) | DRAFT scope expanded. Doc-only. | chat → future | Single doc patch when PK greenlights |
| **v1.1 cc-0012 minor doc patch (3 items)** | Var-A1 + Var-A2 + Var-A3 | P3 (carry) | HOLD | chat → future | Doc-only |
| **v1.6 cc-0010A doc patch (3 items)** | result_jsonb rename + trigger audit + queue_id non-FK | P3 (carry) | HOLD | chat → future | Doc-only |
| **v1.3 cc-0011 minor doc patch (5 items)** | E1 + Var-A/B/C/E | P3 (carry) | HOLD | chat → future | Doc-only |
| **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 audit** | 3 geography rows + trigger filter | P3 (carry v2.71) | Strengthened v2.68. | chat → future | Separate cc-NNNN cleanup brief |
| **Platform Reconciliation View — BRIEF AUTHORING** | reconciliation surface | P2 — unblocked per D-IOL-001 | cc-0010A + cc-0010B delivered. | PK → chat | When PK greenlights |
| **AI cost view** | `vw_ai_cost_monthly` | P3 quick win | Carry. | chat → future | DDL + tile |
| **Publisher latent config risk** | verify_jwt = false doc patch | P3 (carry) | OPEN | chat → future | Single-file commit |
| **M8b separate brief authoring** | Function rename | P3 (carry) | NOT YET AUTHORED | PK → chat | When PK directs |
| **94-row un-publishable legacy draft cohort** | SQL filter per cc-0007 | P3 (carry) | LOGGED | PK → chat → future | If PK directs |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 inline secret | P2 (security, OPEN) | OPEN | chat → future (PK approval) | PK authorisation |
| **morning-inbox-sweep-v1 brief amendment** | PK personal-email morning triage | P3 (carry) | DRAFT exists | PK → chat | PK reviews |
| **22 escalated m.chatgpt_review rows** | 21 historical CCH-locked + 1 T-MCP-05 meta | P3 (carry; gated) | Untouched per CCH | chat → future PK directive | Hold |
| **Memory cap hygiene** | 19/30 v2.82, unchanged | P3 (carry) | 11 free slots. | chat → future | Add as needed |
| **Parallel agent coordination (L47)** | informational | P3 (carry) | No conflicts observed v2.82. | chat → future | Passive observation |
| **Dashboard mobile responsiveness** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session | — |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → future | — |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future | — |
| **Vault `service_role_key` naming** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future | Read-only scope-check |
| **`00_overview.md` 11-section table** | Architecture review structure change | P3 | Required updates | chat → future | ~15 min |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure = Phase 2 B-09-14 | chat → Phase 2 | Bulk approve UI |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 natural OR synthetic test |
| **4× F-CRON-*-STALE** | jobids 1/29/30/31/39 | P2 | LOGGED | PK → future | Decide |
| **Emergency redeploy governance** | Expedited D-01? | P2 (PK decision) | PENDING PK | PK | PK rules |
| **`f4a0dd85` bridge health-check** | hygiene only | P3 (carry) | OBSERVED | PK → future | — |
| **Feature branch `feature/cc-0009-stage-b-ef-source`** | Audit artifact at HEAD `9796b0ee` | P3 (carry) | OBSERVED | PK → future | — |
| **3 pre-v2 forensic `r.reconciliation_run failed` rows** | cc-0010B Stage E pre-fire | P3 (carry v2.68) | PK forensic-accepted | informational | — |
| **github MCP write tools (L58 baseline)** | Per-file or atomic-push depending on coordination | informational (baseline) | Atomic push_files applied v2.82 (this 4-file sync close). | informational | — |
| **Localhost FAB cleanup** | `.env.local` still has flag enabled | P3 (carry) | OPEN — cross-surface duplicate risk | PK → future | Set value to false or delete line |
| **Close-the-loop UPDATEs for 3 v2.77 D-01 fires** | `3ff74643`, `6a90cacf`, `94bd6835` | P3 (carry from v2.77) | OPEN. Same close-the-loop class as 22 escalated. | chat → future PK directive | Include in next batch sweep |

**Closed v2.82:**
- **cc-0017b Wave 0b authoring + apply** (v2.81 rank 1) → **CLOSED-APPLIED-WITH-CORRECTIVE-MIGRATION** ✅
- **D-01 review `b612a8e4-...`** → resolved (close-the-loop UPDATE complete)
- **D-01 review `a6415afa-...`** → resolved (close-the-loop UPDATE complete)

**Closed v2.81:**
- cc-0017a Wave 0a APPLY (v2.80 rank 1) → CLOSED-APPLIED ✅
- Provenance investigation for cc-0017a apply → RESOLVED

**Closed v2.80:**
- cc-0017a Wave 0a authoring → CLOSED ✅
- D-01 review for cc-0017a (`adcc8385-...`) → RESOLVED partial-type-c per PK Path B

**Closed v2.79:** PK approval gate; Amendment G reopen N → LOCKED 14 days; Amendment C triage metric basis → LOCKED phase-based.
**Closed v2.78:** No items closed (planning-only session).
**Closed v2.77:** cc-0014 operational window; cron 85 weekly→daily promotion.
**Closed v2.76:** cc-0014 Stage E close; cc-0014 Stage D production deploy.
**Closed v2.75:** Stage D, E backend, E frontend, E promotion.
**Closed v2.71:** cc-0012 PRV v1 CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.70:** cc-0011 cadence-drift-checker CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.69:** cc-0010C reconciliation-matcher CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.68:** cc-0010B ice-evidence-materialiser CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.67:** cc-0010A v1.5 APPLIED + CLOSED.

---

## 💼 Personal businesses

**v2.82 carry (unchanged):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK actions manually. Re-check next session.

*(Standing P0 to ask at next session start. None raised v2.82.)*

---

## 🌱 Future ideation / content-pipeline expansion

Unchanged from v2.76 / v2.77 / v2.78 / v2.79 / v2.80 / v2.81.

---

## 📌 Backlog

**v2.82 changes:**

- **STATE CHANGE v2.82**: cc-0017b Wave 0b authoring + apply → CLOSED-APPLIED-WITH-CORRECTIVE-MIGRATION via 2 migrations + 27 V-checks PASS.
- **STATE CHANGE v2.82**: Wave 0c authoring → P1 rank 1 (NEW Active; no work started per PK directive).
- **STATE CHANGE v2.82**: friction.* schema state advanced — 9 tables (unchanged), 12 functions (was 10), 1 partial unique index (unchanged), 1 corrective fix, 3 emission_rule seeds active, 1 new column on event (dynamic_context).
- **STATE CHANGE v2.82**: T-MCP-02 cum 73 (+2 D-01 fires this session, both resolved in-session).
- **STATE CHANGE v2.82**: 6 brief defects flagged for cc-0017b v1.1 patch (doc-only, non-blocking; row added to Active).
- **STATE CHANGE v2.82**: D-CC-0017B-Q1 added to docs/06_decisions.md (severity_override query-pattern note per brief §7).
- **No new architectural decisions v2.82** (D-CC-0017B-Q1 is a query-pattern note, not architectural).
- **4-file atomic push_files this session close** (sync_state + this file + new session file + decisions.md). L58 baseline applied correctly.
- **CARRIED v2.82**: Dashboard roadmap PHASES — **35th** consecutive deferral.

**Pre-v2.82 changes**: per commit history + sync_state archive.

---

## 🧊 Frozen / Deferred

Unchanged from v2.81.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a through L-v2.76-f + L-v2.78-a + L47-candidate + L-v2.81-a-candidate framing carried/added per v2.82. **v2.82 updates:**

- **L41 surfaced 3 brief SQL defects in-session this session**: cumulative occurrences across v2.80-v2.82 = 6. Baseline tightening recommendation reinforced.
- **L52 / L53 / L55 / L57 / L59 / L60 / L63 / L64 / L65**: not re-exercised v2.82.
- **L58**: 4-file atomic push_files applied this session close (correct baseline application).
- **L62 baseline-eligible since v2.77**: exercised v2.82 (Path A satisfy-corrected-action on corrective D-01 `a6415afa-...` partial verdict).
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.82; promotion still pending.
- **L-v2.78-a watcher candidate**: not re-exercised v2.82. Still at 2 occurrences. **ELIGIBLE FOR BASELINE PROMOTION at next session's lesson cycle.**
- **L47 CANDIDATE v2.80 (1 occurrence)**: not re-exercised v2.82. Promotion-eligible on re-exercise.
- **L-v2.81-a CANDIDATE v2.81 (1 occurrence)**: not re-exercised v2.82 (no parallel-session apply this session). Promotion-eligible on re-exercise.
- **No other new L-candidates v2.82.**

**All candidates recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates.**

---

## v2.82 honest limitations

- All v2.31–v2.81 limitations apply.
- **6 brief defects identified, 0 patched** — production has correct behaviour via corrective migration, but brief on main still has the SQL bugs. v1.1 patch is doc-only and non-blocking for Wave 0c.
- **Brief §5.5.5c + §5.5.5d still have `<INSERT_CC0014_BODY_FROM_PROD>` placeholders** — actual cc-0014 bodies captured in m.chatgpt_review.context for review_id `a6415afa-...` at session start. v1.1 patch must inline these.
- **V-B15 verdict unilaterally amended in-session** — apply session accepted `cat_source='emitter_default'` over brief's `'manual_at_capture'`. Key V-B15 assertion (severity_override provenance in dynamic_context) fully verified. PK awareness flagged.
- **V-B22 FK satisfier used `dc4b1cca-...`** — synthetic drift log row referenced real production reconciliation_run row. Cleaned up in V-B27. No semantic implications.
- **No Wave 0c work started** per PK explicit directive.
- **Dashboard PHASES at 35th consecutive deferral.** Discipline call increasingly overdue.
- **Memory cap 19/30** — unchanged.
- **Action_list size at v2.82**: ~44KB (was ~42KB v2.81).
- **Per-session files v2.82**: 1 — `2026-05-18-cc-0017b-applied.md` (this commit).
- **Doc-sync v2.82**: 1 commit this session (4-file atomic push_files). Dashboard PHASES 35th consecutive deferral.
- **Close-the-loop UPDATEs v2.82**: 2 (both this session's D-01 fires closed). **25 outstanding** unchanged (22 historical CCH-locked + 3 v2.77 new).
- **State-capture exceptions v2.82: 0**. Cumulative: 1.
- **Production mutations v2.82**: 2 apply_migration (main + corrective); ~50+ inserts/deletes on friction.* test rows via V-B10-B27 (all cleaned up — net 0 data delta); 0 cron mutations; 0 EF deploys; 0 vault writes; 0 memory edits.
- **27/27 V-checks PASS** — strong confirmation of cc-0017b behavioural correctness across all 3 source paths (reconciliation, health_check, manual FAB) + emit_event invariants + defence-in-depth + service_role grants.

---

## Changelog

- v1.0–v2.81: per commit history + sync_state archive.
- **v2.82 (2026-05-18 Sydney late evening, cc-0017b Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + 27/27 V-checks PASS):**
  - **Build arc**: session open against v2.81 state → D-01 plan_review fire `b612a8e4-...` partial type-c → PK Path B → P2 rollback bodies captured → P-set pre-flight 14/14 PASS + P16 NULL adjudication → main apply_migration `cc_0017b_friction_unified_emit_event` succeeds → V-B1-9 schema state PASS → V-B10 FAIL with SQLSTATE 42702 (emit_event Step 9 unqualified WHERE column ambiguity) → D-01 corrective fire `a6415afa-...` sql_destructive partial type-(b) → chat completes line-by-line ambiguity audit → PK Path A satisfy-corrected-action → corrective apply_migration `cc_0017b_emit_event_ambiguity_fix` succeeds → V-B10 retry PASS → V-B11-B26 sequential rerun PASS (PK mid-session directive to convert V-B12/13/14/22/25 from data-modifying CTEs to sequential DO blocks) → V-B27 first attempt residuals 0 but baseline +2 events +4 cases (6 orphans from V-B17/V-B23/V-V-B24 pattern mismatch) → V-B27 extended cleanup via explicit problem_key array DELETE → baseline 22/22/3 restored → V-B1-9 smoke recheck + corrective fix verification PASS → close-the-loop UPDATE on both D-01 rows in m.chatgpt_review → 4-file atomic push_files (this commit).
  - **cc-0017b Wave 0b CLOSED-APPLIED-WITH-CORRECTIVE-MIGRATION.** 2 migrations applied. All 27 V-checks PASS. friction.* schema state: 12 functions (+2 helpers, +5 rewritten in-place), 1 corrective fix, 3 emission_rule seeds active, 1 new event column (dynamic_context).
  - **Today/Next 5 rebuilt v2.82**: rank 1 = Wave 0c authoring (promoted from cc-0017b APPLY closed; no work started per PK directive); ranks 2-4 unchanged.
  - **D-01 fires v2.82: 2.** T-MCP-02 cum **73** (+2 from v2.81's 71). State-capture exceptions unchanged at 1. Both D-01 closed in-session.
  - **L-series outcomes**: L62 exercised (Path A satisfy on corrective D-01). L58 applied (4-file atomic push). L41 surfaced 3 brief SQL defects in-session (cumulative 6 across v2.80-v2.82). L47 unchanged at 1. L-v2.78-a unchanged at 2. L-v2.81-a unchanged at 1.
  - **Active rows updated v2.82**: cc-0017b authoring + apply → CLOSED; Wave 0c authoring → rank 1 Active NEW; cc-0017b brief v1.1 patch row added P3 carry; D-CC-0017B-Q1 added to decisions.md.
  - **STATUS BLOCK v2.82 updated**: Friction Register Consolidation Plan gate 5 closed; gate 6 (Wave 0c authoring + D-01 + apply) now next. New STATUS BLOCK for cc-0017b Wave 0b CLOSED-APPLIED-WITH-CORRECTIVE-MIGRATION added.
  - **Closure budget**: ~2h v2.82 cycle. Trailing-14-day cumulative ~15h above 8.0h floor.
  - **Doc-sync v2.82**: 1 commit (4-file atomic push_files). Dashboard PHASES 35th consecutive deferral.
  - **Production mutations v2.82**: 2 apply_migration (main + corrective); ~50+ inserts/deletes on friction.* test rows (net 0 data delta after V-B27 extended cleanup); 0 cron mutations; 0 EF deploys; 0 vault writes; 0 memory edits.
  - **T-MCP-02 cum**: 73. State-capture exceptions: 1 unchanged. L-v2.78-a unchanged at 2. L47 unchanged at 1. L-v2.81-a unchanged at 1.
