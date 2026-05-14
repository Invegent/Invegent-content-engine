# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-15 Sydney (**v2.73 — cc-0014 STAGE B APPLIED.** Reconciliation emitter trigger live on `r.cadence_drift_log`. Migration `cc_0014_b_reconciliation_emitter` applied via `apply_migration` MCP. Function `friction.fn_emit_reconciliation_event()` deployed as SECURITY DEFINER (owner postgres; REVOKE EXECUTE FROM PUBLIC + GRANT EXECUTE TO postgres). Trigger `friction_emit_reconciliation` AFTER INSERT FOR EACH ROW on `r.cadence_drift_log`. r.cadence_drift_log now has 2 triggers, orthogonal: `set_updated_at` BEFORE UPDATE (cc-0010A) + `friction_emit_reconciliation` AFTER INSERT (this session). All 5 V-checks PASS (V-B1 trigger fired + 1 friction.event row; V-B2 translation fields correct; V-B3 defensive handler verified — source row exists + event row blocked by temp CHECK + emit_error logged SQLSTATE 23514 + emitter_version `cc-0014-v1.0`; V-B4 anon INSERT blocked at GRANT layer SQLSTATE 42501; V-B5 zero residual test rows). **3 brief V-B1 defects caught pre-execution at L53/L55 pre-flight, not at V-check failure**: (1) UUID `cc0014test01` non-hex `t`/`s` → substituted `00cc0014b001`; (2) `drift_check_run_id` + `created_by_run_id` FK to `r.reconciliation_run` not satisfied by fabricated UUIDs → substituted real run_id `8b4453b0-...`; (3) `updated_by_run_id` NOT NULL no default omitted from INSERT column list → supplied same run_id. Same defect class as v2.72 V-A10/V-A11 (`cc0014va10` and `cc00014va11a`). **L60 NEW candidate v2.73**: fabricated test-fixture validity must be checked at brief authoring (UUID hex-validity + FK target row existence + NOT NULL completeness). Composes with but does not subsume L53 + L55. Empirically recurred 6 times across cc-0014. 0 D-01 fires this session per brief §13 (Stage B execution did not diverge from v1.1 brief). T-MCP-02 cum unchanged at 66. State-capture exceptions unchanged at 1 cumulative. 14-day experiment window still NOT started — begins at end of Stage E. **Sync debt resolved by this commit**: 2 session files (2026-05-14 Stage A retroactive + 2026-05-15 Stage B) + action_list v2.73 + sync_state v2.73 with inline drift from v2.68→v2.73 corrected. All 4 files in single atomic commit via Path C (CC local git per L58 compliance — chat MCP write paths explicitly avoided for the >30KB action_list and sync_state). **Next major:** Stage C — Cowork brief `nightly-health-check-v1` v2.1→v3.0 with stable `finding_id` per priority finding + Supabase migration `cc_0014_c_health_check_emitter` + pg_cron job `friction-verification-daily` 01:15 UTC daily. HARD-STOP if Stage C cannot deliver clean dual-write before experiment start.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rules unchanged from v2.72.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46/47/48/50/55/56/57/58 + L33–L60 carried.

**v2.73 ADDITIONS:**
- **cc-0014 Stage B APPLIED via apply_migration MCP.** Migration `cc_0014_b_reconciliation_emitter`. Function + trigger live. Brief §13 governance: Stage B did not diverge from v1.1 brief → 0 D-01 fires required for execution; v1.0 D-01 (903cfd8e) already covered defensive handling scope.
- **L60 NEW candidate v2.73**: Fabricated test-fixture validity at brief-authoring across UUID hex-validity + FK target row existence + NOT NULL completeness. Independent from L53 (FK source-column-type) and L55 (column-name verification). Empirically recurred 6 times in cc-0014: V-A10 + V-A11 + V-B1 ×3 defects. Promotion pending one more independent brief exhibiting any of (a)/(b)/(c).
- **L53 + L55 reactive catches strengthened**: Stage B pre-flight enumerated 4 FKs on `r.cadence_drift_log` via `information_schema.referential_constraints` and column defaults via `information_schema.columns`. Defects caught before V-B1 attempted, not after V-B1 failed. **L46 baseline shape evolution v2.73**: pre-flight prevents failed V-checks from needing recovery cycles. Per-stage discipline.
- **Path C sync commit chosen by PK for v2.73 docs sync** per L58 strict compliance. Chat MCP `create_or_update_file` explicitly avoided for action_list (>40KB) + sync_state. Multi-file commit handled via CC local git workflow. Pattern repeat of v2.72 successful brief-recovery path (commit `34305092f4`).
- **Sync debt resolved this commit**: action_list v2.72→v2.73 + sync_state v2.68 inline→v2.73 inline (inline drift from v2.68 corrected; session index entries added for v2.72 + v2.73) + retroactive session file for 2026-05-14 Stage A (carried since v2.72 close) + new session file for 2026-05-15 Stage B. **2-of-4-way sync** this commit (docs + memory carries; dashboard PHASES intentionally deferred — 26th consecutive — per IOL hold-stance pending Day-19 verdict).
- **Brief v1.2 doc patch (P3 carry)** scope grows to 6 documented defects: 3 V-A10/V-A11 UUID errors from v2.72 + 3 V-B1 errors from this session + L60 framing as a brief-authoring discipline section addition. Authored when PK directs; not part of v2.73 sync.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~3 (cc-0014 Stages C+D+E in-flight; Phase 0 carried; cc-0013 deprioritised) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~7h v2.73 (Stage B pre-flight + apply + 5 V-checks + variance documentation + 4-file sync drafting + commit prep) | 8.0 floor | ⚠️ marginal — at floor today |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**v2.73 cycle: ~7h total** (Stage B pre-flight ~1h + apply ~30 min + V-checks ~1h + variance + lessons documentation ~1.5h + sync_state/action_list/2 session files drafting ~3h).

**State-capture exception count v2.73: 0** (no D-01 fires this session; v2.72's count of 1 carries cumulatively).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-15 Sydney (v2.73).
> **v2.73 note:** cc-0014 Stage B APPLIED. Reconciliation emitter live. **Stage C promoted to rank 1** (Cowork health check dual-write — **HARD-STOP if fails**). Stage D rank 2. Stage E rank 3. Brief v1.2 doc patch rank 4 (P3, doc-only, combines 6 documented brief defects + L60 framing). cc-0013 Dashboard Phase 0 stays deprioritised at rank 5 pending Day-19 verdict. Close-the-loop batches rank 6 (now 31+ rows: 5 prior + 2 from v2.72 + 24 historical). Personal businesses rank 7 standing P0.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0014 Stage C — Health check dual-write emitter** | **P1 (rank 1 v2.73) — HARD-STOP IF FAILS** | Cowork brief `nightly-health-check-v1` v2.1 → v3.0: add stable `finding_id` per priority finding in Section 10 (`priority-N/short-key` anchors). Each finding becomes one `friction.event` row at run completion. Supabase migration `cc_0014_c_health_check_emitter`: `friction.fn_emit_health_check_findings(run_id, markdown_path, findings)` SECURITY DEFINER + `friction.fn_verify_health_check_daily()` + pg_cron job `friction-verification-daily` at `15 1 * * *` UTC. Three-day verification failure threshold = invalidation. **If Stage C cannot deliver clean dual-write before experiment start, experiment is cancelled (per brief §12).** | chat → next session (PK directive) | Author Cowork brief v3.0 modification + Supabase migration. Test on next nightly run with ID-level verification. |
| 2 | **cc-0014 Stage D — Manual capture FAB** | P1 (rank 2 v2.73) | Floating action button in invegent-dashboard reachable from every route (added to root layout). Modal form with: observation_text (textarea, ≥5 chars), severity (radio, info/warn/critical, localStorage last-choice default), category (dropdown excluding `unclassified` from default visibility, last-choice remembered), current_route auto-filled from `window.location.pathname`. Backend: `friction.fn_emit_manual_event` SECURITY DEFINER with input validation. Migration `cc_0014_d_manual_emit_function`. V-D5 instrument-failure threshold: average submission > 15 sec = invalidation. | chat → CC → PK | Backend migration via apply_migration; frontend components built by Claude Code in invegent-dashboard repo. |
| 3 | **cc-0014 Stage E — Read surface + experiment_run start** | P1 (rank 3 v2.73) | `/operations` route in invegent-dashboard with `friction.fn_recent_cases(p_limit int)` + `friction.fn_triage_case(...)` RPCs. Inline edit for triage_state, quality_flag, action_decision, capture_reason, next_review_at, suppression_reason, notes. **End of Stage E**: pre-experiment cleanup of `cc-0014-test/%` rows, then INSERT into `friction.experiment_run` with `status='running'`, `criteria_snapshot` jsonb populated with locked thresholds. **This is when the 14-day window starts.** Day 19 from Stage E close = verdict via 10 locked SQL queries in brief §11. | chat → CC → PK | Route + RPCs in invegent-dashboard repo; final pre-experiment cleanup + experiment_run row creation; chat fires verdict queries on Day 19. |
| 4 | **Brief v1.2 doc patch (combined defects + L60 framing)** | **P3 (NEW rank 4 v2.73, P3 carry)** | Combine 6 documented brief defects into a single v1.2 doc patch: (a) V-A10 UUID `cc0014va10` non-hex `v` (v2.72); (b) V-A11 UUID `cc00014va11a` 13-char segment (v2.72); (c) V-B1 UUID `cc0014test01` non-hex `t`/`s` (v2.73); (d) V-B1 missing FK seed for `drift_check_run_id` + `created_by_run_id` (v2.73); (e) V-B1 missing `updated_by_run_id` in INSERT col list (v2.73); plus add L60 framing as a brief-authoring discipline section. Doc-only; no production state change. | chat → future session (PK directs) | Single doc patch via local git when PK greenlights. |
| 5 | **cc-0013 Dashboard Phase 0** | **P2 (DEPRIORITISED — rank 5 carry from v2.72)** | DEPRIORITISED pending cc-0014 Day-19 verdict. If cc-0014 PASSES, dashboard work should fold the IOL read surface (`/operations` route) as the new dashboard anchor rather than the pre-IOL `cc-0013` framing. If cc-0014 FAILS, return to cc-0013 original scope. If cc-0014 INVALID, address instrument cause first. **Hold and register stance**: use the dashboard as-is during the 14-day window; capture friction observations via Stage D manual form when they surface; reconsider scope after verdict. | chat → future session post-Day 19 | Hold. |
| 6 | **Close-the-loop batch sweep** | P2 (rank 6 v2.73) | 5 prior cc-NNNN rows still in escalated status + 2 from v2.72 (`903cfd8e` + `873985f7`, both PK-resolved with type-(b) patch + type-(c) override; pending status='resolved' UPDATE) + 24 unrelated historical escalated rows untouched per CCH directive. v2.73 adds **0 new D-01 rows** (Stage B fired no D-01). Total eligible: **31 rows** (5 + 2 + 24). | chat → next session | Single `execute_sql` UPDATE with CASE for 5+2 row batch; separate review for 24-row historical batch. |
| 7 | **Personal businesses check-in** | P0 standing | Carry. | PK reports any time-sensitive items + Crazy Domains clean-up status. |

**Passive observation v2.73**: Cron 83 `ice_evidence_materialiser_30min` (steady-state); cron 84 `reconciliation_matcher_30min` (steady-state); cron 85 `cadence_drift_checker_weekly` (every Sunday 17:30 UTC). PRV v1 operator views queryable via `op_reader` role. **friction.\* schema NEW v2.72 + emitter trigger NEW v2.73**: 5 tables live; 6 active categories + 1 unclassified placeholder seeded; `friction_emit_reconciliation` trigger live on `r.cadence_drift_log`; no events or cases yet (no production drift events fired since trigger installed; cron 85 next fires Sun 18 May 17:30 UTC).

---

## 🟢 cc-0014 friction register experiment — STATUS BLOCK (UPDATED v2.73)

**Status v2.73: STAGES A + B APPLIED.** Migration `cc_0014_a_friction_schema` applied 2026-05-14 (Stage A). Migration `cc_0014_b_reconciliation_emitter` applied 2026-05-15 (Stage B). All 11 V-A checks + 5 V-B checks PASS. Zero residual test data. Stages C–E pending. The 14-day experiment window has NOT started — begins at end of Stage E.

**Brief lineage (unchanged from v2.72):** v1.0 (D-01 review `903cfd8e-…` returned partial; pushback 3 reclassified type-(b) genuine) → **v1.1 final** (D-01 review `873985f7-…` returned partial; both new pushbacks type-(c) generic consistency-bias; PK state-capture override per L62; Stage A applied as v1.1).

**Stages delivered:**
- Stage A v1.1: schema + grants + 2 triggers + 11 V-checks all PASS (v2.72, 2026-05-14)
- **Stage B**: SECURITY DEFINER function + AFTER INSERT trigger on `r.cadence_drift_log` + 5 V-checks all PASS (v2.73, 2026-05-15)

**Stages pending:**
- Stage C: reconciliation health check dual-write (Cowork brief v3.0 + pg_cron verification) — **HARD-STOP if fails**
- Stage D: manual capture FAB + `friction.fn_emit_manual_event`
- Stage E: read surface (`/operations`) + experiment_run creation = 14-day window start

**Production state at v2.73 close:**
- `friction` schema live in Supabase `mbkmaxqhsohbtwsqolns`
- 5 tables: `friction.category` (6 active + 1 unclassified), `friction.event` (empty), `friction.case` (empty), `friction.emit_error` (empty), `friction.experiment_run` (empty — no `running` row yet)
- 4 CHECK constraints on `friction.case`
- 3 triggers in `friction.*`: `friction_event_no_delete_during_run` + `friction_case_no_delete_during_run` + `friction_experiment_run_criteria_immutable` (all dormant until experiment_run.status='running')
- 1 NEW trigger on `r.cadence_drift_log`: `friction_emit_reconciliation` AFTER INSERT
- 2 NEW functions in `friction.*` schema: `fn_prevent_delete_during_run`, `fn_lock_criteria_snapshot`, `fn_emit_reconciliation_event`
- Grants per brief Section 3 role matrix; service_role/authenticated/anon all explicit
- main HEAD at session close: tbd (this commit) building on `81a67325` (v2.72 action_list)

**Stage B V-check evidence (all 5 PASS):**
| V-check | Evidence |
|---|---|
| V-B1 | INSERT to r.cadence_drift_log with corrected fixture → friction.event count = 1 |
| V-B2 | Translation fields all correct: problem_key=observer_stale, category=client_commitment, reported_by=system, category_source=emitter_default, severity=info, observation_text=`observer_stale for NDIS-Yarns on instagram. Window: 2026-05-01 to 2026-05-14. Observed: 0, Expected: 0.`, related_object contains type/client_id/client_name/platform, dedupe_fingerprint=md5 hash, observed_at = NEW.created_at |
| V-B3 | Temp CHECK constraint `cc_0014_test_v_b3_reject` added → INSERT to r.cadence_drift_log succeeded (source row exists) + friction.event INSERT blocked by CHECK + friction.emit_error logged SQLSTATE 23514 + emitter_version `cc-0014-v1.0` + SQLERRM `new row for relation "event" violates check constraint "cc_0014_test_v_b3_reject"` + CHECK constraint dropped |
| V-B4 | SET ROLE anon + INSERT → SQLSTATE 42501 `permission denied for table cadence_drift_log` (HINT: Grant the required privileges to the current role with: GRANT INSERT ON r.cadence_drift_log TO anon — not actioned, as anon should never have INSERT) |
| V-B5 | DELETE on all 3 tables produced 0 residual rows |

**D-01 fires this session (Stage B): 0** (per brief §13 — Stage B did not diverge from v1.1 brief).

**Cumulative D-01 history for cc-0014:**
| review_id | brief version | session | verdict | classification | resolution status |
|---|---|---|---|---|---|
| `903cfd8e-5c59-45d5-a310-1e2ff35ef93e` | v1.0 | v2.72 | partial | type-(b) | PK-resolved (v1.1 patch); pending close-the-loop UPDATE |
| `873985f7-4069-4471-a3e1-0e0e0e0e0e0e` | v1.1 | v2.72 | partial | type-(c) | PK-resolved (state-capture override); pending close-the-loop UPDATE |

**Result file:** (deferred — cc-0014 closes at Day 19 verdict, not at Stage A/B apply).

**Session files:**
- `docs/runtime/sessions/2026-05-14-cc-0014-stage-a-applied.md` (retroactive, written v2.73)
- `docs/runtime/sessions/2026-05-15-cc-0014-stage-b-applied.md` (new, written v2.73)

**Open follow-ups:**
- Stage C authoring + apply (HARD-STOP scope)
- Stage D backend migration + frontend FAB + form
- Stage E read surface + RPCs + experiment_run creation
- Close-the-loop UPDATEs on 2 m.chatgpt_review rows from v2.72
- Brief v1.2 doc patch — 6 documented defects + L60 framing
- L58 (MCP large-payload reliability) + L59 (schema vs convention) + L60 (test-fixture validity) NEW candidates — promotion pending pattern repeat

---

## 🟢 cc-0012 PRV v1 — STATUS BLOCK (carried v2.73, condensed)

**Status v2.73:** **CLOSED-WITH-VERIFIED-VARIANCE v2.71.** PRV v1 operator views live. `op_reader` role NOLOGIN; SELECT to `op_reader` + `service_role` only; REVOKE ALL from PUBLIC/anon/authenticated. **Reconciliation v1 + PRV v1 family complete end-to-end** (cc-0009 + cc-0010A + cc-0010B + cc-0010C + cc-0011 + cc-0012 all closed).

3 carry items into v1.1 cc-0012 minor doc patch (now P3 deprioritised pending IOL outcome):
- Var-A1: information_schema.columns vs pg_attribute relkind-aware primitive
- Var-A2: §7 V5 narrative 7-client → 4-client correction
- Var-A3: op.v_freshness_rollup.attention_needed NULL handling

---

## 🟢 cc-0010B ice-evidence-materialiser — STATUS BLOCK (carried v2.73, condensed)

**Status v2.73:** **CLOSED-WITH-VERIFIED-VARIANCE v2.68.** EF v2 ACTIVE; cron 83 firing every 30 min. F4 path (b) hotfix encoded → merged → deployed → cron-validated. L40 reified end-to-end at runtime. **Result file:** `docs/briefs/results/cc-0010B-ice-evidence-materialiser.md`.

---

## 🟢 cc-0010A r.* DDL Foundation — STATUS BLOCK (carried v2.73, condensed)

**Status v2.73:** **APPLIED + CLOSED v2.67.** 6 r.* tables + 1 helper + 1 FK + 86 k.column_registry rows live. **v1.6 doc patch (3 items) DEPRIORITISED to P3 pending IOL outcome.** **Result file:** `docs/briefs/results/cc-0010A-r-reconciliation-ddl-foundation.md`.

---

## 🟢 Process Upgrades L44–L48 + L52–L60 — STATUS BLOCK (UPDATED v2.73)

**Status v2.73:** **L44 + L45 + L46 + L48 baseline-eligible.** L40 reified end-to-end v2.68. L52 + L53 + L57 candidates carry from v2.68–v2.72. **L58 + L59 candidates carry from v2.72. L60 NEW candidate v2.73.**

- **L40**: reified end-to-end at runtime v2.68; not re-exercised v2.73.
- **L41**: honored v2.68; not exercised v2.73.
- **L44 (Runtime Proof Pre-flight)**: 3 live exercises (v1.3 + v1.4 + v1.5 cc-0010A) + 1 fresh exercise (Stage B pre-flight v2.73). Baseline-eligible — strengthened by pre-flight catching 3 brief defects before V-B1.
- **L45 (Post-mutation truth check)**: 2 live exercises (cc-0010A + cc-0010B). Baseline-eligible. Not re-exercised v2.73 (no variance to declare — Stage B applied per brief §7 verbatim once corrected fixtures used).
- **L46 (Reviewer Evidence Gate)**: 5 consecutive clean pass-through D-01s at v2.68 (strongest baseline). v2.72: 0 clean pass-through (both fires returned partial). v2.73: not exercised (0 D-01 fires). Pattern shape v2.73: pre-flight discipline prevents need for D-01 cycles at stage execution.
- **L47**: still deferred. No race opportunity v2.73.
- **L48**: vindicated v2.67–v2.68.
- **L49 carry**: PG reserved-word collision check. No PL/pgSQL-heavy work v2.73 (function used standard control flow + standard types).
- **L52 (MCP vs CLI deploy reliability)**: 4 consecutive clean CLI deploys v2.70 STRONG PROMOTION CANDIDATE. v2.72: no EF deploys. v2.73: no EF deploys.
- **L53 (FK source-column-type asymmetry at brief authoring)**: cc-0010B reactive + cc-0010C preventive + cc-0011 preventive + **cc-0014 Stage B reactive v2.73** = 4 cycles. Promotion eligibility strengthened.
- **L54 (V-check duration derivation)**: v2.69 reified.
- **L55 (EF grep checklist for column names → extends to column-value validity)**: cc-0011 reified + cc-0014 Stage A reactive (V-A10/V-A11) + cc-0014 Stage B reactive (V-B1 UUID + NOT NULL) = 3 cycles. Promotion eligibility strengthened.
- **L56 (timestamptz string-parsing pre-validation)**: v2.70 informal.
- **L57 (relkind-aware column-shape probe)**: v2.71 NEW candidate. Not exercised v2.73 (no view/matview probes).
- **L58 (MCP `create_or_update_file` >30KB reliability)**: pattern-of-one at v2.72. v2.73: applied preventively via Path C for the v2.73 sync commit per PK directive — single CC local-git commit chosen over chat MCP write paths. Promotion-eligible after one more independent occurrence.
- **L59 (schema-enforced append-only > convention)**: v2.72 reified in Stage A v1.1 patch. Not re-exercised v2.73.
- **L60 NEW candidate v2.73**: Fabricated test-fixture validity at brief-authoring time across three independent properties:
  - **(a) UUID hex-validity** — every UUID literal in a V-check INSERT contains only `0-9a-f` digits with correct segment lengths (8-4-4-4-12)
  - **(b) FK target row existence** — every FK column in a fabricated INSERT references a row that either (i) is seeded earlier in the same migration, or (ii) is queried from production state at V-check execution time
  - **(c) NOT NULL completeness** — every NOT NULL column without a default appears in the INSERT column list

  Empirically recurred **6 times** across cc-0014: V-A10 (a), V-A11 (a), V-B1 ×3 defects covering all of (a)/(b)/(c). Composes with but does not subsume L53 or L55 — those are reviewer-discipline lessons for production code; L60 is the test-fixture-author counterpart. Brief-authoring discipline addition. **Promotion pending one more independent brief that exhibits any of (a)/(b)/(c).**
- **L62 type-(c) state-capture override empirically used v2.72** at Stage A v1.1 D-01. Not exercised v2.73 (0 D-01 fires).

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (unchanged v2.73)

Unchanged from v2.65–v2.72. ALL STAGES CLOSED at v2.65.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.72.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.73 application**: 0 D-01 fires this session (Stage B execution did not diverge from v1.1 brief per §13). Cumulative T-MCP-02 stays at **66** (unchanged from v2.72).

**L46 Evidence Gate v2.73**: not exercised this session. v2.72's 2 partial verdicts (903cfd8e + 873985f7) remain the most-recent operational data point. Pattern: stage-execution D-01 budget is conserved when brief governance gate (§13) is honored — saves both ChatGPT credits and ICE-side review-cycle latency.

**Close-the-loop UPDATEs to m.chatgpt_review v2.73: 0 this session.** 5 prior + 2 from v2.72 + 24 historical = **31 eligible** for next-session batch sweep.

---

## 🤖 Cowork automation (D182)

**v2.73 status:** unchanged from v2.72 production state. Cron 82 firing daily. Cron 83 firing every 30 min. **Cowork brief `nightly-health-check-v1` v2.1 PENDING modification to v3.0 for cc-0014 Stage C** (dual-write emitter). After Stage C: brief writes markdown AND calls `friction.fn_emit_health_check_findings` with stable `finding_id` per priority finding. pg_cron job `friction-verification-daily` to be installed at Stage C apply (`15 1 * * *` UTC daily).

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0014 Stage C** | Health check Cowork brief v3.0 dual-write + pg_cron verification | **P1 (rank 1 v2.73) — HARD-STOP IF FAILS** | UNBLOCKED — Stage B applied. Brief authoring + migration `cc_0014_c_health_check_emitter`. | chat → next session | Cowork brief modification + Supabase migration + verify on next nightly run with ID-level check |
| **cc-0014 Stage D** | Manual capture FAB + `friction.fn_emit_manual_event` | P1 (rank 2 v2.73) | UNBLOCKED. Migration `cc_0014_d_manual_emit_function` + frontend components in invegent-dashboard. | chat → CC → PK | Backend via apply_migration; frontend via Claude Code |
| **cc-0014 Stage E** | Read surface `/operations` + experiment_run row creation | P1 (rank 3 v2.73) | UNBLOCKED. Migration `cc_0014_e_read_surface_and_triage` + frontend route. **End of Stage E = 14-day window start.** | chat → CC → PK | RPCs + route + pre-experiment cleanup + experiment_run INSERT |
| **Brief v1.2 doc patch (combined defects + L60)** | 6 brief defects (3 Stage A + 3 Stage B) + L60 brief-authoring discipline section | **P3 (NEW rank 4 v2.73)** | DRAFT scope defined. Doc-only; no production state change. | chat → future session (PK directs) | Single doc patch via local git when PK greenlights |
| **cc-0013 Dashboard Phase 0** | DEPRIORITISED pending cc-0014 Day 19 verdict | **P2 (DEPRIORITISED, carry v2.72 v2.73)** | HOLD. PRV v1 operator views consumable via `op_reader` role for ad-hoc sustained observation in the meantime. | chat → future session post-Day 19 | Hold |
| **v1.1 cc-0012 minor doc patch (3 carry items)** | Var-A1 + Var-A2 + Var-A3 | **P3 (carry v2.72)** | HOLD pending cc-0014 outcome. | chat → future session | Doc-only patch via local git |
| **v1.6 doc-only patch to cc-0010A (3 items)** | result_jsonb rename + r.set_updated_at trigger audit + m.post_publish.queue_id non-FK | **P3 (carry v2.72)** | HOLD pending cc-0014 outcome. | chat → future session | Doc-only patch via local git |
| **v1.3 cc-0011 minor doc patch (5 carry items)** | E1 + Var-A + Var-B + Var-C + Var-E | **P3 (carry v2.72)** | HOLD pending cc-0014 outcome. | chat → future session | Doc-only patch via local git |
| **Close-the-loop batch sweep** | 5-row + 2 v2.72 rows + 24-row historical = 31 eligible | **P2 (rank 6 v2.73)** | UNBLOCKED. v2.73 adds 0 new rows (no D-01 fires this session). | chat → next session | Single execute_sql UPDATE with CASE for 5+2 row batch; separate review for 24-row historical |
| **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 trigger filter audit (combined)** | 3 geography rows + trigger filter | **P3 (carry v2.71)** | Strengthened v2.68 by E1. | chat → future session | Separate cc-NNNN cleanup brief |
| **Platform Reconciliation View — BRIEF AUTHORING** | reconciliation surface | **P2 — fully eligible v2.68** | cc-0010A delivered schema; cc-0010B delivered data. | PK → chat | Brief authoring when PK greenlights |
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults | P1 TOP (unchanged) | Carry. | PK | Confirm via cc-0001 |
| **AI cost view** | `vw_ai_cost_monthly` | P3 quick win | Carry. | chat → future session | DDL + tile |
| **Publisher latent config risk follow-up** | `[functions.publisher] verify_jwt = false` doc patch | P3 (carry) | OPEN | chat → future | Single-file commit |
| **M8b separate brief authoring** | Function rename | P3 (carry) | NOT YET AUTHORED | PK → chat | When PK directs |
| **94-row un-publishable legacy draft cohort cleanup** | SQL filter per cc-0007 | P3 (carry) | LOGGED | PK → chat → future | If PK directs |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 inline secret | P2 (security, OPEN) | OPEN | chat → future (PK approval) | PK authorisation for rotation |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P3 (carry) | LOGGED | chat → future (passive) | — |
| **morning-inbox-sweep-v1 brief amendment** | PK personal-email morning triage | P3 (carry) | DRAFT exists | PK → chat | PK reviews |
| **24 unrelated historical escalated m.chatgpt_review rows** | Historical escalated review backlog | **P3 (carry v2.73)** | Untouched per CCH. Eligible for next-session sweep. | chat → next session | Single execute_sql query to enumerate + categorise, then batched UPDATEs |
| **Memory cap hygiene carry** | Memory at 30/30 cap; line-replacement strategy | P3 (carry) | v2.73: 0 memory edits this session (no new content warrants edit). | PK → future | PK to consider pruning cadence |
| **Parallel agent coordination observation** | L47 informational | P3 (carry) | No parallel-writer conflicts observed v2.73. | chat → future | Continue passive observation |
| **Dashboard mobile responsiveness** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session | — |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → next session | — |
| **Invegent IG cap-throttle planning** | jobid 53 unblock readiness | P3 | OBSERVED | chat → T05 unblock session | — |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | — |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future session | Read-only scope-check |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session | — |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates | chat → future session | ~15 min |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 | chat → Phase 2 session | Bulk approve UI in Phase 2 |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried (**26th deferral v2.73**) | chat → dedicated session post-cc-0014 verdict | Update PHASES + LAST_UPDATED after Day 19 |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 natural skip event OR synthetic test |
| **4× F-CRON-*-STALE** | jobids 1/29/30/31/39 call slugs whose folders are absent | P2 | LOGGED | PK → future session | Decide |
| **Music library activation checklist** | 9 mp3 upload + bucket + env var | P3 (PK action) | PENDING PK ACTION | PK | — |
| **Emergency redeploy governance question** | Expedited D-01 for bounded production-restoration? | P2 (PK decision) | PENDING PK DECISION | PK | PK rules |
| **`f4a0dd85` bridge health-check `sql_read` row** | hygiene only | P3 (carry) | OBSERVED | PK → future | — |
| **Feature branch `feature/cc-0009-stage-b-ef-source`** | Audit artifact at HEAD `9796b0ee` | P3 (carry) | OBSERVED | PK → future | — |
| **3 pre-v2 forensic `r.reconciliation_run failed` rows** | cc-0010B Stage E pre-fire failures | P3 (carry v2.68) | Retained per directives. PK forensic-accepted. | informational | — |
| **github MCP local server restart needed** | Write tools unresponsive | P3 (operational carry v2.68) | Recovered via Windows-MCP local git workflow v2.68. v2.72 confirmed: MCP `create_or_update_file` reliability degrades on >30KB payloads — pattern, not transient. v2.73: applied preventively via Path C for sync commit. L58 candidate. | PK | Continue Claude Code local git for any large commits |

**Closed v2.73:** (none — Stage B is a milestone within cc-0014, not a brief closure. cc-0014 closes at Day 19 verdict.)

**Closed v2.72:** (none — Stage A is a milestone within cc-0014.)
**Closed v2.71:** cc-0012 PRV v1 CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.70:** cc-0011 cadence-drift-checker CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.69:** cc-0010C reconciliation-matcher CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.68:** cc-0010B ice-evidence-materialiser CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.67:** cc-0010A v1.5 APPLIED + CLOSED.
*(Older closures truncated; see v2.71 archive.)*

---

## 💼 Personal businesses

**v2.73 carry (unchanged from v2.55–v2.72):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK actions manually. Re-check status next session.

*(no other items flagged at v2.73 close — standing P0 to ask at next session start.)*

---

## 🌱 Future ideation / content-pipeline expansion

Unchanged from v2.72.

---

## 📌 Backlog

**v2.73 changes:**

- **NEW v2.73**: cc-0014 Stage B APPLIED. Reconciliation emitter trigger live on `r.cadence_drift_log`. Function `friction.fn_emit_reconciliation_event()` deployed.
- **STATE CHANGE v2.73**: Today/Next 5 reshuffled: Stage C rank 1 (HARD-STOP); Stage D rank 2; Stage E rank 3; Brief v1.2 doc patch NEW rank 4; cc-0013 stays rank 5 deprioritised; close-the-loop sweep stays rank 6 (count grows to 31 with 0 new this session); Personal businesses stays rank 7 standing P0.
- **NEW v2.73 LESSON CANDIDATE**: L60 (fabricated test-fixture validity at brief-authoring time across UUID hex-validity + FK target existence + NOT NULL completeness). Composes with but does not subsume L53 + L55. Empirically 6 occurrences across cc-0014.
- **L53 + L55 reactive catches strengthened v2.73**: Stage B pre-flight enumerated 4 FKs + column defaults BEFORE V-B1; 3 brief defects caught at pre-flight rather than at V-check failure.
- **0 D-01 fires this session** per brief §13 — stage execution that does not diverge from v1.1 brief doesn't require a new D-01. T-MCP-02 cumulative unchanged at 66; state-capture exceptions unchanged at 1 cumulative.
- **Path C sync commit chosen by PK for v2.73 docs sync** per L58 strict compliance — chat MCP write paths explicitly avoided for action_list (>40KB) + sync_state; CC local-git workflow used instead. Mirrors v2.72 successful brief-recovery pattern.
- **Sync debt resolved this commit**: action_list v2.72→v2.73 + sync_state v2.68 inline→v2.73 inline (inline drift from v2.68 corrected; session index entries added for v2.72 + v2.73) + 2026-05-14 Stage A session file retroactive + 2026-05-15 Stage B session file new. 2-of-4-way sync this commit (docs + memory carries; dashboard PHASES intentionally deferred — 26th consecutive — per IOL hold-stance pending Day-19 verdict).
- **CARRIED v2.73**: Dashboard roadmap PHASES — **26th** consecutive deferral. All v2.72 carries unchanged otherwise.

**Pre-v2.73 changes**: per commit history + sync_state archive.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

L37–L60 framing carried + extended from v2.72. **v2.73 updates:**

- **L46**: not exercised v2.73 (0 D-01 fires this session). v2.72 baseline of 0 clean pass-through (both partial) carries; v2.73 adds no new operational shape data.
- **L52**: not exercised v2.73 (no EF deploys).
- **L53 preventive + reactive carry**: cc-0014 Stage B pre-flight enumerated 4 FKs on `r.cadence_drift_log` via `information_schema.referential_constraints` BEFORE attempting V-B1; brief's fabricated UUIDs for drift_check_run_id + created_by_run_id would have violated FK; substituted real `8b4453b0-...` reconciliation_run_id. **4 cycles total** (cc-0010B + cc-0010C + cc-0011 + cc-0014 Stage B). Promotion eligibility strengthened.
- **L55 reactive carry**: cc-0014 Stage B pre-flight enumerated column defaults via `information_schema.columns` BEFORE attempting V-B1; brief's missing `updated_by_run_id` (NOT NULL no default) in INSERT column list caught at column-shape probe. **3 cycles total** (cc-0011 + cc-0014 Stage A + cc-0014 Stage B). Promotion eligibility strengthened.
- **L57 candidate carry from v2.71**: not exercised v2.73 (no view/matview column-shape probes).
- **L58 candidate carry from v2.72**: applied preventively v2.73 — PK directed Path C (CC local git) for v2.73 sync commit rather than chat MCP write paths. action_list at >40KB sits firmly in L58 caution band. Mirrors v2.72 recovery pattern (commit `34305092f4`).
- **L59 candidate carry from v2.72**: not re-exercised v2.73 (no new convention-vs-schema discipline events).
- **L60 NEW candidate v2.73**: Fabricated test-fixture validity at brief-authoring time across three independent properties:
  - **(a) UUID hex-validity** — every fabricated UUID literal in a V-check INSERT contains only `0-9a-f` digits with correct segment lengths (8-4-4-4-12)
  - **(b) FK target row existence** — every FK column in a fabricated INSERT references a row that either (i) is seeded earlier in the same migration, or (ii) is queried from production state at V-check execution time
  - **(c) NOT NULL completeness** — every NOT NULL column without a default appears in the INSERT column list

  Empirically recurred **6 times** across cc-0014 (V-A10 (a) + V-A11 (a) + V-B1 ×3 covering all of (a)/(b)/(c)). Composes with but does not subsume L53 (FK source-column-type, for production code) or L55 (column-name verification). It is the test-fixture-author counterpart. Brief-authoring discipline addition. **Promotion pending one more independent brief that exhibits any of (a)/(b)/(c).**
- **L62**: not exercised v2.73 (0 D-01 fires this session).

**All candidates recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates** (L37 + L38 + L39 + L40 + L41 + L42 + L43 + L44 + L45 + L46 + L47 + L48 + L49 + L52 + L53 + L54 + L55 + L56 + L57 + L58 + L59 + L60 — plus standing baseline).

---

## v2.73 honest limitations

- All v2.31–v2.72 limitations apply.
- **L60 NEW candidate v2.73** is pattern-of-6 occurrences but all within a single brief (cc-0014). Promotion pending pattern repeat in an independent brief — same defect classes need to recur in cc-NNNN where NNNN != 0014.
- **L58 applied preventively v2.73** via Path C for this sync commit; pattern repeat needed for baseline promotion. v2.73 represents the first preventive application of L58 (v2.72 was the originating reactive observation).
- **Sync_state.md inline drift from v2.68 → v2.73 corrected this commit** (5-version drift before v2.73 close; index table was current to v2.71 at v2.72 close). This was the longest inline drift to date.
- **0 clean pass-through D-01s v2.73** — different operational shape from v2.68's 5-streak; v2.73 has 0 D-01 fires period (per brief §13 governance gate). Pattern shape: stage-execution D-01 budget conserved when brief itself does not diverge.
- **5 prior outstanding m.chatgpt_review close-the-loop UPDATEs UNBLOCKED v2.61, still pending v2.73** — batch now **14 sessions overdue** + 2 from v2.72 (`903cfd8e` + `873985f7`).
- **24 unrelated historical escalated rows** untouched per CCH directive — eligible for next-session review.
- **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION** still P3; geography drift still present.
- **Dashboard roadmap PHASES still stale** — **26th** consecutive deferral. Pending cc-0014 Day-19 verdict before update (the verdict will determine whether the dashboard absorbs the IOL surface or returns to pre-IOL scope).
- **Action_list file size**: estimated ~47KB at v2.73 close (up from ~42KB at v2.72; target was 10KB — historically over since v2.30s). Sync_state estimated ~24KB at v2.73 close (target 16KB).
- **Per-session files written v2.73**: 2 — `docs/runtime/sessions/2026-05-14-cc-0014-stage-a-applied.md` (retroactive) + `docs/runtime/sessions/2026-05-15-cc-0014-stage-b-applied.md` (new). Both in the same v2.73 atomic commit per directive.
- **Result file written v2.73**: N/A (cc-0014 not yet closed; result file is at Day 19 verdict).
- **Doc-sync this session**: single atomic 4-file commit via CC local git workflow (Path C per PK directive). Dashboard PHASES NOT updated this session — 26th consecutive deferral, intentional per IOL hold-stance.
- **Close-the-loop UPDATEs on m.chatgpt_review v2.73**: 0 this session. 5 prior + 2 v2.72 + 24 historical = 31 eligible for batch sweep at next session.
- **State-capture exceptions v2.73: 0** (no D-01 fires this session). Cumulative since v2.72: 1.
- **MCP `create_or_update_file` reliability concern v2.73**: applied preventively this commit via Path C. action_list at ~47KB and sync_state at ~24KB both routed via CC local git rather than chat MCP write. **L58 caution band reaffirmed; not stress-tested.**
- **Brief v1.2 doc patch scope now 6 documented defects + L60 framing**: 3 Stage A UUID defects (V-A10/V-A11) + 3 Stage B V-B1 defects (UUID + FK seed + NOT NULL). Authored when PK directs; not part of v2.73 sync.

---

## Changelog

- v1.0–v2.72: per commit history + sync_state archive.
- **v2.73 (2026-05-15 Sydney, cc-0014 STAGE B APPLIED — reconciliation emitter trigger live; 14-day experiment window still NOT yet started):**
  - **Build arc**: pre-flight verification via `information_schema.columns` + `information_schema.referential_constraints` + `pg_constraint` + `pg_event_trigger` → 3 brief V-B1 defects caught (UUID hex + 2 FKs + NOT NULL) → migration `cc_0014_b_reconciliation_emitter` applied via `apply_migration` MCP → 5 V-checks all PASS (V-B1 trigger fired + V-B2 translation correct + V-B3 defensive handler verified + V-B4 anon block + V-B5 zero residual) → 0 D-01 fires per brief §13 → close-out preparation → sync debt assessment → PK directive for v2.73 docs sync via Path C (CC local git) → 4-file atomic commit (this commit) covering: 2026-05-14 Stage A session file retroactive + 2026-05-15 Stage B session file new + action_list v2.73 + sync_state v2.73 with v2.68→v2.73 inline drift corrected.
  - **Stage B V-check pattern**: 5 V-checks: V-B1 happy path (trigger fires + event row materialised), V-B2 translation field correctness (8 fields validated against expected values), V-B3 defensive failure 3-phase test (ADD CHECK → INSERT triggers exception handler → verify state + DROP CHECK), V-B4 GRANT-layer security block (anon denied at table level before trigger reached), V-B5 cleanup (zero residual across 3 tables).
  - **D-01 fires (0)**: brief §13 governance gate honored — Stage B execution did not diverge from v1.1 brief (defensive handling already covered by v1.0 D-01 review 903cfd8e). T-MCP-02 cumulative unchanged at 66.
  - **L-series outcomes**: L53 reactive catch strengthened (4 cycles total). L55 reactive catch strengthened (3 cycles total). L60 NEW candidate (fabricated test-fixture validity across UUID hex-validity + FK target row existence + NOT NULL completeness; composes with but does not subsume L53 + L55). L58 applied preventively via Path C for this sync commit.
  - **Pattern firsts (4)**: first 0-D-01 stage execution under brief §13 governance gate; first preventive application of L58 for a multi-file doc-sync commit; first L60 candidate exhibiting 6 occurrences within a single brief lineage; first cc-NNNN stage execution where pre-flight discipline (information_schema probes) prevented 3 distinct brief defects from materialising as V-check failures.
  - **Today/Next 5 rebuild**: cc-0014 Stage C = rank 1 (HARD-STOP); Stage D = rank 2; Stage E = rank 3; Brief v1.2 doc patch = rank 4 (NEW); cc-0013 Dashboard Phase 0 stays rank 5 deprioritised; close-the-loop batch stays rank 6; Personal businesses stays rank 7 standing P0.
  - **Active rows updated v2.73**: cc-0014 Stage C+D+E remain P1 (Stage B closed out of P1 stack at applied); Brief v1.2 doc patch ADDED at P3 rank 4; close-the-loop count grows to 31 eligible.
  - **NEW STATUS BLOCK v2.73**: "🟢 cc-0014 friction register experiment — STATUS BLOCK (UPDATED v2.73)" with Stage B V-check evidence table.
  - **Closure budget**: ~7h v2.73 cycle (Stage B pre-flight + apply + V-checks + variance documentation + sync drafting + commit prep). Trailing-14-day ~91h above 8.0h floor.
  - **Doc-sync this session**: single atomic 4-file commit via CC local git workflow (Path C per PK directive); 0 memory edits; dashboard PHASES NOT updated (26th consecutive deferral, intentional per IOL hold-stance pending Day-19 verdict).
  - **Production mutations this session**: 1 apply_migration (`cc_0014_b_reconciliation_emitter`); 5 execute_sql calls for V-checks (all cleaned); 0 EF deploys; 0 ask_chatgpt_review D-01 fires; 0 GitHub commits via chat MCP (the v2.73 sync commit is via CC local git workflow per PK directive). Zero cron mutations. Zero vault writes.
  - **T-MCP-02 cum**: 66 (unchanged from v2.72). State-capture exceptions cumulative: 1 (unchanged from v2.72). L46 baseline: not exercised this session.
