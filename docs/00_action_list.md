# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-19 Sydney evening (**v2.90 — cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION**. Main migration `cc_0017e_friction_case_history_and_compat` applied. friction.case_history shadow table live; fn_triage_case 11-arg patched (legacy 10-arg dropped via `cc_0017e_drop_legacy_fn_triage_case_10arg`); 5 cc-0017d mutation functions patched byte-stable; 8-row backfill executed. D-01 `315baf84-65ed-4086-9e58-cc2497737f5f` AGREE → resolved/applied_with_correction. **5 brief defects surfaced + 4 Path B-prime corrective migrations**: severity / category / DROP legacy 10-arg / explicit-DELETE cleanup. **8-item v1.1 doc patch backlog**: vchecks.md V-D-setup × 3, migration-sql.md §2, risks-and-grants.md R4 + §3, d01-postapply-deferred.md §4 × 2, helper extension. Final V-check matrix PASS (V-A1/A2/B1/B2/C1/F1-4/D1-6 + compat smoke/E1-8/Z3 pre + Z1/Z2/Z3 post). V-Z3 reconciled: 15 pre-cleanup (brief 14 + 1 PK-directed compat smoke); 8 post-cleanup. **6 NEW L-v2.90 candidates** (a/b HIGH-SIGNAL; c/d/e/f). T-MCP-02 cum ~86 (+1). State-capture exceptions cum 1 unchanged. Gate 11 Day 1 of 7 unchanged. Dashboard PHASES 43rd deferral. L-v2.85-e re-applied 5th consecutive occurrence (promotion-confirmed v2.88 carries forward). L-v2.85-a HIGH-SIGNAL re-exercised — 4 occurrences. L-v2.83-a STRONG 9+. Per-session detail at `2026-05-19-cc0017e-applied.md` commit `77d09376d7cdc9e0dbc76c5ec0a937d0fd46adf2`. sync_state + action_list atomic push_files this commit per L-v2.85-e baseline (1+1+1 L-v2.89-a fallback ready if timeout).) **Today/Next 5**: cc-0017e v1.1 doc patch (8-item) → rank 1 (P2 carry NEW); reconciliation daily diagnostic → rank 2; health_check V-C3 → rank 3; Platform Reconciliation View → rank 4; 5-row close-the-loop / pre-sales / purge_test_case helper extension → rank 5.

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v2.89.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46-v2.58 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a (STRONG; **9+ v2.90**) + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL; **4 occurrences v2.90** — promotion-eligible) + L-v2.85-b/c/d carried + **L-v2.85-e PROMOTION-CONFIRMED 5th consecutive v2.90 (carries forward from v2.88)** + 5 L-v2.86 candidates + 4 L-v2.88-a/b/c/d candidates + L-v2.89-a candidate (carry) + **6 NEW L-v2.90-a/b/c/d/e/f candidates** (a/b HIGH-SIGNAL). **D-IOL-001 (v2.77)** carried. **D-CC-0017B-Q1** carried.

**v2.90 ADDITIONS:**

- **cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION** at v2.90. Main migration `cc_0017e_friction_case_history_and_compat`. friction.case_history table created with cc-0017c lockdown grants. fn_triage_case 11-arg patched (with `p_actor text DEFAULT NULL`, refactored body, INSERTs `case_history` with change_kind='compat_legacy_triage'). 5 cc-0017d mutation functions patched byte-stable (signatures unchanged; bodies append post-UPDATE case_history INSERT with appropriate change_kind). 8-row acknowledged-legacy backfill executed (triaged_at=reviewed_at, triaged_by='legacy_backfill').

- **Migrations applied this session (5 successful, 2 failed-rollback):**
  1. `cc_0017e_friction_case_history_and_compat` ✅
  2. `cc_0017e_vcheck_fixture_seed` (attempt 1 ❌ severity='low'; attempt 2 ❌ category='cc-0017e/v-d/category'; attempt 3 ✅ severity='info' + category='unclassified')
  3. `cc_0017e_drop_legacy_fn_triage_case_10arg` ✅
  4. `cc_0017e_vcheck_audit_cleanup` ✅ (inline dependency-ordered DELETEs)
  5. `cc_0017e_chatgpt_review_close` ✅ (schema-corrected for phantom columns)

- **5 brief defects surfaced (Path B-prime correctives) + 3 phantom column references = 8-item v1.1 doc patch backlog:**
  1. vchecks.md V-D-setup — severity='low' invalid (case_severity_check)
  2. vchecks.md V-D-setup — category='cc-0017e/v-d/category' violates case_category_fkey
  3. migration-sql.md §2 + risks-and-grants.md R4 — CREATE OR REPLACE FUNCTION with arity change creates sibling overload (not replacement); explicit DROP required
  4. vchecks.md V-D-setup + V-Z1 — fixture naming `cc-0017e/v-d/...` mismatches `purge_test_case` regex `^cc-[0-9]{4}[a-z]?-test/`
  5. cleanup path — purge_test_case is case_history-unaware
  6. d01-postapply-deferred.md §4 — `resolved_at` column phantom
  7. d01-postapply-deferred.md §4 — `result_summary` column phantom
  8. risks-and-grants.md §3 — broad-scope overclaim on "authenticated + anon zero grants"

- **D-01 fire:** `315baf84-65ed-4086-9e58-cc2497737f5f` AGREE / risk=medium / confidence=high / no escalation. Closed status=resolved / action_taken=applied_with_correction / resolved_by=cc-0017e-close-v2.90.

- **Final V-check matrix:** all PASS. V-A1 (post-DROP — only 11-arg fn_triage_case); V-A2 (body recognition); V-B1/B2 (SECURITY DEFINER + owner); V-C1 (grants); V-F1-4 (8 backfill correct deltas); V-D1-D6 + PK-directed compat smoke (7 history rows; idempotent record_first_view confirmed); V-E1-E8 (denials/validations); V-Z3 pre-cleanup = 15 (reconciled 14+1 PK compat smoke); V-Z1/V-Z2/V-Z3 post-cleanup (0 residue / 29 cases / 29 events / 8 backfill rows only).

- **Hard stops respected:**
  - 5 hard-stop events to PK during apply; each with PK-directed Path B-prime disposition.
  - 0 Wave 0f scope creep.
  - 0 decisions.md edits.
  - 0 memory edits.
  - 0 state-capture overrides (D-01 returned AGREE; corrections were brief-defect Path B-prime, not verdict bypasses).

- **Sync close mechanics v2.90 (1+2 split per L-v2.85-e baseline):**
  1. Per-session detail standalone commit `77d09376` (`docs/runtime/sessions/2026-05-19-cc0017e-applied.md`, 26,994 B) via create_or_update_file.
  2. sync_state + action_list atomic commit this commit via push_files (2 files).
  - L-v2.89-a fallback (1+1+1) ready if atomic push_files times out.

- **L-v2.85-e re-applied 5th consecutive occurrence** (v2.86 + v2.87 + v2.88 + v2.89 + v2.90); promotion-confirmed v2.88 carries forward.
- **L-v2.83-a re-applied** at per-session commit + sync close commit. Cumulative 9+ STRONG.
- **L-v2.85-a HIGH-SIGNAL re-exercised** at V-A1 — caught Defect 3. 4 occurrences total. Promotion-eligible.
- **L-v2.85-d (REALIZED helper) bypassed** v2.90 — helper has regex + case_history coverage gaps. Fresh re-exercise.
- **L-v2.86-a HIGH-SIGNAL PARTIALLY exercised** — P2 transactional EXEC harness disclosed as PARTIAL in D-01 weak_evidence.
- **L-v2.88-c realised** v2.90 — probe re-verification at apply time via full P-set re-run.

- **6 NEW L-v2.90 candidates:**
  - **L-v2.90-a (HIGH-SIGNAL):** V-D fixture authoring must probe full CHECK + FK constraint surface on target tables.
  - **L-v2.90-b (HIGH-SIGNAL):** `CREATE OR REPLACE FUNCTION` arity changes are NOT signature-compatible at function-resolution level; explicit `DROP FUNCTION` of prior signature required.
  - **L-v2.90-c:** V-D fixture naming must conform to `purge_test_case` regex (`^cc-[0-9]{4}[a-z]?-test/`); slash-prefix alone insufficient.
  - **L-v2.90-d:** Shadow tables with FK ON DELETE RESTRICT require audit of all existing cleanup helpers for coverage gaps at authoring time.
  - **L-v2.90-e:** Close-the-loop SQL templates must be validated against actual m.chatgpt_review schema; phantom column names cause close failures even when migration is clean.
  - **L-v2.90-f:** Risk/grants verification clauses must match actual lockdown scope; broad-scope overclaims surface false-FAILs at apply-time S-probes.

- **Closed Active rows v2.90:** cc-0017e apply session (rank 1 P1 v2.89) → CLOSED-APPLIED-WITH-VCHECK-CORRECTION ✅.
- **Promoted Active row v2.90:** Reconciliation daily diagnostic → rank 2 (unblocked from cc-0017e apply gating).
- **NEW Active row v2.90:** cc-0017e v1.1 doc patch (8-item) → rank 1 P2 carry.
- **NEW Active row v2.90:** purge_test_case helper extension → P3 future Wave candidate.

- **Dashboard PHASES sync: 43rd consecutive deferral** (was 42 at v2.89; +1 at v2.90). No file-touch v2.90.
- **NO decisions.md change.** Apply-with-correction close; no new architectural decisions (5 brief defects are corrections, not new direction).
- **Session compaction event v2.90:** 0. No mid-session compaction needed despite session length and complexity.
- **Production mutations v2.90: 5 successful migrations + 1 DML close (chatgpt_review UPDATE).** Schema deltas: +1 table + 6 function patches + 8 UPDATEs + 8 INSERTs.
- **D-01 fires v2.90: 1** (AGREE; resolved).
- **T-MCP-02 cum v2.90: ~86** (+1 from this session's D-01 fire).
- **State-capture exceptions v2.90: 0.** Cumulative: 1 unchanged.
- **Close-the-loop UPDATEs v2.90: 1** (cc-0017e close — closed in same session as fire; no net add to outstanding queue).

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~3 (cc-0017e v1.1 doc patch authoring + recon daily diagnostic + health_check signal diagnostic) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~30h (v2.83 1h + v2.84 ~2h + v2.85 ~3h + v2.86 ~3.5h + v2.87 ~0.5h + v2.88 ~1.5h + v2.89 ~1h + v2.90 ~4h) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.90 cycle: ~4h total** (apply session + 5 corrective migrations + V-check matrix + close + sync close). 5 schema mutations. 1 D-01 fire (AGREE). 2 git commits (per-session detail standalone + sync_state+action_list atomic). **State-capture exception count v2.90: 0** (cumulative 1).

---

## ⭐ Today / Next 5

> Last rebuilt: 2026-05-19 Sydney evening (v2.90).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0017e v1.1 doc patch (8-item)** | **P2 v2.90 (NEW)** | Apply discovery surfaced 5 brief defects + 3 phantom column references. Authoring required across 5 brief files + lessons-metadata-changelog.md (new L-v2.90 family). | chat → PK | When PK directs. Multi-file doc patch via push_files (per L-v2.85-e mitigation). |
| 2 | **Reconciliation daily cadence diagnostic** | P1 carry, rank 2 | First post-cc-0017e cron 85 fire pending. Confirms cc-0017e patched functions + new case_history shadow table co-exist with cc-0017b wrappers + cc-0017c lockdown. Unblocked from cc-0017e apply gating. | chat → PK | Post-fire SQL count + emit_event signature check. |
| 3 | **Health_check V-C3 + signal-production diagnostic** | P1 carry, rank 3 | V-C3 still PENDING. Cowork brief v3.0 ready. | Cowork → chat | Check post-fire `docs/audit/health/YYYY-MM-DD.md`. |
| 4 | **Platform Reconciliation View brief authoring** | P2 carry, rank 4 | Reconciliation surface design. PK greenlight required. | PK → chat | When PK directs. |
| 5 | **5-row close-the-loop batch sweep / Pre-sales criteria refinement / `purge_test_case` helper extension** | P2/P3 carry | 22 outstanding close-the-loop UPDATEs (unchanged net by v2.90); Pre-sales 3-clock criteria per memory entry; helper case_history extension future Wave candidate. | chat → PK | When PK directs. |

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Passive observation v2.90**: Cron 82-86 unchanged. PRV v1 operator views queryable. friction.* state: **10 tables** (case_history added v2.90), 19 functions (5 patched byte-stable + fn_triage_case 11-arg refactored; legacy 10-arg dropped), 29 cases + 29 events (baseline preserved through V-D + cleanup), 8 case_history rows (backfill only). PostgREST exposes `friction`. **case_history exists.** Next fires: cron 85 daily; cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (UPDATED v2.90)

**Status v2.90: ✅ Wave 0 + Wave 0d + Wave 0e COMPLETE. Gates 10+12+13 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE Day 1 of 7. Wave 0f NOT YET SCOPED — candidates: items B/E/F/G deferred from cc-0017e + purge_test_case helper case_history extension.**

**Documents:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`) — unchanged
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` SIGNED — unchanged
- `docs/briefs/cc-0017a-friction-register-foundational-schema.md` v1.1 — APPLIED v2.81
- `docs/briefs/cc-0017b-friction-register-unified-emit-event.md` v1.1 — APPLIED v2.82
- `docs/briefs/cc-0017c-friction-register-lockdown-and-backfill.md` v1.1 — APPLIED v2.85
- `docs/briefs/cc-0017d-friction-case-mutation-functions.md` v1.1 — APPLIED v2.86 + v1.1 doc patch CLOSED v2.87 at commit `f0367405`
- `docs/briefs/cc-0017e-friction-case-history-and-compat.md` v1.0 AUTHORED v2.88 + v1.1 doc patch CLOSED v2.89 at commit `587ee4ac` + **APPLIED v2.90 (5 migrations + corrective DROP + cleanup + close)**
- **Migrations live v2.90**: `cc_0017e_friction_case_history_and_compat` + `cc_0017e_drop_legacy_fn_triage_case_10arg` + `cc_0017e_vcheck_fixture_seed` + `cc_0017e_vcheck_audit_cleanup` + `cc_0017e_chatgpt_review_close` (+ all cc-0017d migrations + all cc-0017c migrations preserved).
- Per-session files: v2.79–v2.89 unchanged; **v2.90 at `2026-05-19-cc0017e-applied.md` (commit `77d09376`, 26,994 B)**

**Open gates v2.90:**
1-9. ✅ PK approval + cc-0017a/b/c brief authoring + D-01 cycles + cc-0017c v1.0+v1.1 D-01 fires
10. ✅ cc-0017c apply (CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.85)
11. ⏳ **1-week empirical observation window** ACTIVE 2026-05-19 → 2026-05-26 (Day 1 of 7 unchanged v2.90; same calendar day as v2.86/v2.87/v2.88/v2.89 closes)
12. ✅ cc-0017d Wave 0d apply (CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.86) + v1.1 doc patch CLOSED v2.87
13. **Wave 0e** — case history / audit
    - 13.a Authoring sub-gate ✅ CLOSED v2.88
    - 13.b v1.1 doc patch sub-gate ✅ CLOSED v2.89 at `587ee4ac`
    - 13.c Apply sub-gate **✅ CLOSED v2.90** — APPLIED-WITH-VCHECK-CORRECTION

**v2.90 provenance:** v1.1 doc patch verification reads (preflight-pset.md + d01-postapply-deferred.md) + 8 brief file reads + full P-set + S-series sanity probes (S1–S9 + S7-narrow) + D-01 fire (1) + 5 production migrations + V-check matrix (V-A/B/C/D/E/F/Z) + cleanup + close-the-loop UPDATE + per-session detail commit (`77d09376`) + sync_state+action_list atomic push_files (this commit).

**Empirical findings v2.90 (8-item v1.1 doc patch backlog):**
1. severity='low' invalid (case_severity_check)
2. category='cc-0017e/v-d/category' violates FK
3. CREATE OR REPLACE arity-change creates sibling overload
4. V-D naming `cc-0017e/v-d/...` mismatches purge_test_case regex
5. purge_test_case helper case_history coverage gap
6. d01-postapply-deferred.md §4 resolved_at column phantom
7. d01-postapply-deferred.md §4 result_summary column phantom
8. risks-and-grants.md §3 broad-scope overclaim

---

## 🟢 cc-0017e Wave 0e — STATUS BLOCK (UPDATED v2.90)

**Status: ✅ APPLIED-WITH-VCHECK-CORRECTION v2.90. case_history shadow table live + 6 functions patched + 8-row backfill executed. D-01 closed. 8-item v1.1 doc patch backlog carries.**

**Brief commits (5 in chain):**
- Commit 1 `8502fc49a0d981e95f8fed6bd7c3ece438fc669c` (v2.88) — main brief
- Commit 2 `1659b293da007ced41a6d0b08def1061dd38a414` (v2.88) — 4 substantive sub-files
- Commit 3 `d349bdfecc1629dbaeca0d5cea579e69d9d03461` (v2.88) — 3 process sub-files
- Commit 4 `587ee4ac894a50708611cf9a053253083ae39e2b` (v2.89) — v1.1 doc patch (2 sub-files; column-name correction)
- **No commit 5** (v2.90 was production apply, not brief edits. v1.1 doc patch backlog awaits authoring.)

**Production state (post-v2.90):**
- `friction.case_history` exists. Columns: history_id (PK gen_random_uuid), case_id (FK→friction.case ON DELETE RESTRICT), changed_at (timestamptz now()), changed_by (text NN), change_kind (text NN CHECK IN 7 values), before_row (jsonb), after_row (jsonb). Index `(case_id, changed_at DESC)`. Lockdown: postgres full + service_role SELECT only.
- `friction.fn_triage_case` 11-arg version live with refactored body (legacy 10-arg dropped via `cc_0017e_drop_legacy_fn_triage_case_10arg`).
- 5 cc-0017d mutation functions patched byte-stable (signatures unchanged; post-UPDATE case_history INSERT appended).
- 8 acknowledged-legacy cases backfilled.
- 8 backfill rows in `friction.case_history` with change_kind='backfill', changed_by='cc-0017e-backfill'.

**Scope (PK directive locked v2.88, applied as-locked v2.90):**
- IN: A (case_history shadow) + C (fn_triage_case compat) + D (8-row backfill) + H (V-Z3 convention) + A-extended (5-function patch)
- OUT/DEFER: B / E / F / G — Wave 0f or other wave candidates
- **Implicit additions v2.90:** PK-directed compat smoke (10-arg positional call shape on fixture-002); 4 Path B-prime corrective migrations.

**v1.1 doc patch backlog (8 items):**
1. vchecks.md V-D-setup — severity correction
2. vchecks.md V-D-setup — category correction
3. vchecks.md V-D-setup + V-Z1 cleanup — fixture naming (`cc-0017e-test/` form per purge_test_case regex)
4. migration-sql.md §2 — explicit DROP statement before CREATE OR REPLACE for fn_triage_case arity change + discipline note
5. risks-and-grants.md R4 — corrected rationale (call-resolution vs schema-resolution compatibility distinction)
6. risks-and-grants.md §3 — narrowed lockdown scope verification clause
7. d01-postapply-deferred.md §4 — all 4 template variants schema-corrected (drop resolved_at + result_summary; use escalation_resolved_at OR no timestamp; rich summary in session detail file, not in m.chatgpt_review row)
8. lessons-metadata-changelog.md — 6 new L-v2.90 candidates documented

**Lesson candidates v2.88 (4 — status post-v2.90):**
- L-v2.88-a: still candidate; not directly exercised v2.90
- L-v2.88-b: realised — V-Z3 convention now executed live; pre-cleanup count reconciliation (14 brief + 1 compat smoke = 15) is fresh evidence
- L-v2.88-c: **REALISED v2.90** — probe re-verification at apply via P-set re-run
- L-v2.88-d: realised — in-function INSERT pattern for case_history confirmed working across all 6 patched functions

**Lesson candidates v2.89 (1):**
- L-v2.89-a: not re-exercised v2.90 (atomic push_files at sync close attempted; 1+1+1 fallback ready)

**6 NEW Lesson candidates v2.90:**
- L-v2.90-a (HIGH-SIGNAL): V-D fixture authoring full constraint-surface probing
- L-v2.90-b (HIGH-SIGNAL): CREATE OR REPLACE FUNCTION arity change → explicit DROP
- L-v2.90-c: V-D fixture naming must match purge_test_case regex
- L-v2.90-d: shadow tables + helper coverage gap audit
- L-v2.90-e: close-the-loop SQL template column validation
- L-v2.90-f: risks-and-grants verification clauses must match actual lockdown scope

---

## 🟢 cc-0017d / cc-0017c / cc-0017b / cc-0017a / cc-0014 / cc-0015 / cc-0016 / cc-0012 / cc-0010A/B/C / cc-0011 / cc-0009 — STATUS BLOCKS

**v2.90 updates:**
- cc-0017d: APPLIED v2.86 + v1.1 doc patch CLOSED v2.87. **5 of 6 functions patched byte-stable by cc-0017e v2.90 (signatures unchanged; post-UPDATE case_history INSERT appended).** fn_triage_case is not part of cc-0017d.
- cc-0015 friction-pool-view (Wave 7): Wave 0e gate cleared v2.90; still gated on 1-week observation window closing 2026-05-26.
- cc-0016 friction-capture-evidence (Wave 8): Wave 0e gate cleared v2.90; still gated on Wave 7 sequencing.
- All others unchanged from v2.85/v2.86/v2.87/v2.88/v2.89.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v2.90)

**L40 exercised v2.90** (close-the-loop UPDATE on m.chatgpt_review via apply_migration).
**L41 exercised v2.90** — 5× apply_migration on friction schema. Cumulative v2.80-v2.90 = 11.
**L46 exercised v2.90** — D-01 evidence gate; transparent weak_evidence disclosure (P2 PARTIAL + external callers + V-Z3 novelty + S7 finding).
**L58 applied v2.90** — atomic close-the-loop UPDATE pattern via single apply_migration.
**L62 exercised v2.90** — D-01 fire immediately preceded production action; AGREE → apply; no state-capture override.
**L-v2.78-a, L-v2.81-a**: 2 occurrences each, promotion-eligible (unchanged).
**L-v2.83-a**: **9+ occurrences v2.90** (re-applied at per-session commit + sync close commit). STRONG candidate confirmed.
**L-v2.84-a/b/c**: not re-exercised v2.90 in net new form.
**L-v2.84-d**: related to L-v2.90-a; carries forward.
**L-v2.85-a HIGH-SIGNAL**: re-exercised v2.90 — V-A1 strict signature byte-match surfaced Defect 3 (dual overload). Cumulative 4 occurrences. **Promotion-eligible carries forward.**
**L-v2.85-b**: applied throughout v2.90 (Path B-prime corrective migration pattern 4×).
**L-v2.85-c**: not re-exercised v2.90.
**L-v2.85-d**: REALIZED helper bypassed v2.90 due to regex + case_history coverage gaps. Fresh re-exercise.
**L-v2.85-e**: **re-applied v2.90 — 5th consecutive occurrence** (v2.86 + v2.87 + v2.88 + v2.89 + v2.90). 1+2 split close (per-session detail standalone + sync_state+action_list atomic). **PROMOTION-CONFIRMED v2.88 carries forward.**
**L-v2.86-a HIGH-SIGNAL**: **PARTIALLY exercised v2.90** — P2 transactional EXEC harness disclosed as PARTIAL in D-01 weak_evidence; defensive coverage via visual + cc-0017d precedent worked for substitution-class drift; but value-class / schema-phantom / helper-coverage defects (1-5) are outside the harness scope. Lesson reinforced.
**L-v2.86-b/c**: exercised v2.90 throughout (out_ prefix + ROWTYPE quoting byte-stable).
**L-v2.86-d/e**: not re-exercised v2.90 in net new form.
**L-v2.88-a**: not re-exercised v2.90.
**L-v2.88-b**: realised via V-Z3 live execution.
**L-v2.88-c**: REALISED v2.90 — probe re-verification at apply via P-set re-run.
**L-v2.88-d**: realised — in-function INSERT pattern confirmed across all 6 patched functions.
**L-v2.89-a**: not re-exercised v2.90 (atomic push_files at sync close attempted; 1+1+1 fallback ready).
**6 NEW L-v2.90-X candidates (a HIGH-SIGNAL, b HIGH-SIGNAL, c/d/e/f candidates)**: see v2.90 ADDITIONS block.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated. Day 1 of 7 unchanged v2.90 (same calendar day as v2.86-v2.89 closes; no elapsed observation time).
- **First cc-0017e-post-apply cron 85 fire** pending — diagnostic now P1 rank 2 (was rank 2 P1 in v2.89; carries unchanged in priority but unblocked from cc-0017e gating).
- No new v2.90 calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v2.90: **1 D-01 fire** (`315baf84-...` AGREE; resolved/applied_with_correction/resolved_by=cc-0017e-close-v2.90). T-MCP-02 cum **~86 v2.90** (+1). L46 Evidence Gate exercised v2.90. L62 exercised v2.90. State-capture exceptions v2.90: 0 (cum 1). Close-the-loop UPDATEs v2.90: 1 (cc-0017e — closed in same session; no net add to outstanding queue). **22 outstanding unchanged.**

---

## 🤖 Cowork automation (D182)

Unchanged from v2.85-v2.89. Cron 82/83/86 firing normally. V-C3 PENDING.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0017e v1.1 doc patch (8-item)** | Apply discovery surfaced 5 brief defects + 3 phantom column references | **P2 v2.90, rank 1 (NEW)** | OPEN. Authoring required across 5 brief files + lessons-metadata-changelog.md. | chat → PK | When PK directs. Multi-file doc patch via push_files. |
| **Reconciliation daily diagnostic** | First post-cc-0017e cron 85 fire | **P1 carry, rank 2** | OPEN. Unblocked from cc-0017e apply gating. | chat → PK | Post-fire SQL + emit_event check. |
| **Health_check V-C3 diagnostic** | Cowork pipe | **P1 carry, rank 3** | OPEN. V-C3 PENDING. | Cowork → chat | Check post-fire health doc. |
| **Platform Reconciliation View brief** | Reconciliation surface design | **P2 carry, rank 4** | NOT YET STARTED. | PK → chat | When PK directs. |
| **purge_test_case helper extension** | Helper case_history coverage gap (cc-0017e v2.90 discovery) | **P3 carry NEW** | NOT YET SCOPED. Future Wave 0f candidate. | chat → PK | When PK directs. |
| **Music library activation** | video-worker v3.0.0 env-var gated | P2 carry | PENDING PK. | PK + chat | Bucket + tracks + env + smoke. |
| **vchecks.md V-B4 doc patch** | Correct V-B4 to 12-param signature (L-v2.85-a follow-up) | P3 carry | Doc-only. May fold into cc-0017c v1.2. | chat → PK | PK decides scope. |
| **cc-0017c v1.2 doc patch candidate** | Date correction + 3 D-01 references + V-B4 signature correction | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **cc-0015 friction-pool-view brief** (Wave 7) | Authored PENDING_EXECUTION | P2 (Wave 7; Wave 0e gate cleared v2.90; still gated on 1-week window) | DRAFTED commit `9a5dc155`. | chat → PK (Wave 7) | When window closes 2026-05-26. |
| **cc-0016 friction-capture-evidence brief** (Wave 8) | Authored PENDING_EXECUTION | P2 (Wave 8; Wave 0e gate cleared v2.90; still gated on Wave 7) | DRAFTED commit `f35f8ea4`. | chat → PK (Wave 8) | After Wave 7. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | P2 carry | OBSERVED. | chat → PK | Verify + dry-run + re-enable. |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P2 carry | LOGGED. | chat → PK | Audit m.post_draft. |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 carry | OPEN. | PK | When PK directs. |
| **Close-the-loop batch sweep — 22 escalated** | 21 historical CCH + 1 T-MCP-05 meta | P2 carry | Gated on PK directive. | chat → future PK | Hold. |
| **L-v2.78-a baseline promotion** | Reviewer convergence | P3 carry | 2 occurrences, eligible. | chat → next lesson cycle | Promote alongside L-v2.81-a. |
| **L47 baseline promotion** | list_recent_commits before retry | P3 carry | 1 occurrence. | chat → next session | Consider co-promotion with L-v2.85-e. |
| **L-v2.81-a baseline promotion** | Parallel-session coordination | P3 carry | 2 occurrences, eligible. | chat → next lesson cycle | Promote. |
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (9+ occurrences v2.90; STRONG CANDIDATE)** | Re-applied at per-session + sync close commits v2.90. | chat → next lesson cycle | Promote. |
| **L-v2.84-a/b/c candidates** | Empirical precedence / idempotent REVOKE/GRANT / Path A corrected_action | P3 carry | 1 occurrence each. | chat → next session | Watcher. |
| **L-v2.84-d candidate** | Schema-probe-before-DML | P3 carry (2 occurrences) | Related to L-v2.90-a (extends to value-enum probes). | chat → next session | Promote-eligible co-promotion candidate. |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | **P3 (4 occurrences v2.90; PROMOTION-ELIGIBLE)** | Re-exercised at V-A1 v2.90 — caught Defect 3 (dual overload). | chat → next lesson cycle | Promote. |
| **L-v2.85-b** | Inline V-check rewrite Path 1 / Path B-prime | P3 (2+ occurrences; Path B-prime applied 4× v2.90) | Re-applied throughout v2.90. | chat → next session | Watcher; trending toward promotion. |
| **L-v2.85-c** | SECURITY DEFINER bypass post REVOKE | P3 (1 occurrence) | Not re-exercised v2.90. | chat → next session | Watcher. |
| **L-v2.85-d** | Postgres-owner cleanup migration | P3 (REALIZED v2.86; re-exercised v2.90 — helper bypass due to gaps) | Fresh re-exercise. | chat → next session | Carries; informs L-v2.90-c+d. |
| **L-v2.85-e** | push_files length budget — split-commit mitigation | **P3 (PROMOTION-CONFIRMED v2.88; 5th consecutive occurrence v2.90)** | 1+2 split close v2.90. | chat → next lesson cycle | **PROMOTE.** |
| **L-v2.86-a candidate (HIGH-SIGNAL)** | Pre-apply syntactic validation via transactional EXEC | P3 (PARTIALLY exercised v2.90 — disclosed as PARTIAL in D-01) | Lesson reinforced: harness scope limited to substitution-class drift; value-class / schema-phantom / helper-coverage outside scope. | chat → next session | Watcher with refined scope. |
| **L-v2.86-b/c/d/e candidates** | out_-prefix / ROWTYPE quoting / CHECK pre-validation / slash-prefix fixture convention | P3 (b+c exercised v2.90 byte-stable; d+e unchanged) | b+c carried forward; d+e not re-exercised. | chat → next session | Cross-brief carry. |
| **L-v2.88-a/b/c/d candidates** | HINT-string false positives / V-Z3 alignment / probe re-verification gate / in-function INSERT pattern | P3 (b realised; c REALISED v2.90; d realised; a unchanged) | b/c/d realisations v2.90; a awaits future re-exercise. | chat → next lesson cycle | Promote b/c/d after one more cycle. |
| **L-v2.89-a candidate** | push_files atomic timeout → 1+1+1 fallback | P3 (1 occurrence v2.89; carry — not re-exercised v2.90 if atomic succeeds) | Watcher. | chat → next session | Pair-promote with L-v2.85-e. |
| **L-v2.90-a (NEW; HIGH-SIGNAL)** | V-D fixture authoring constraint-surface probing | **P3 (1 occurrence v2.90)** | Captured in v2.90 ADDITIONS. Caught 2 defects this session (severity + category). | chat → next session | Watcher; pair with L-v2.84-d. |
| **L-v2.90-b (NEW; HIGH-SIGNAL)** | CREATE OR REPLACE FUNCTION arity change → explicit DROP required | **P3 (1 occurrence v2.90)** | Caught Defect 3 (dual overload). | chat → next session | Watcher; specific to function-patch briefs. |
| **L-v2.90-c (NEW)** | V-D fixture naming must match purge_test_case regex | P3 (1 occurrence v2.90) | Caught Defect 4. | chat → next session | Watcher. |
| **L-v2.90-d (NEW)** | Shadow tables + helper coverage gap audit | P3 (1 occurrence v2.90) | Caught Defect 5. | chat → next session | Watcher; informs purge_test_case extension brief. |
| **L-v2.90-e (NEW)** | Close-the-loop SQL template schema validation | P3 (1 occurrence v2.90) | Caught Defects 6 + 7. | chat → next session | Watcher. |
| **L-v2.90-f (NEW)** | Risk/grants verification clauses must match actual lockdown scope | P3 (1 occurrence v2.90 — S7 finding) | Caught Defect 8. | chat → next session | Watcher. |
| **Brief v1.2 doc patches (cc-0017a/c)** | Combined defects + lesson framing | P3 carry | DRAFT scope. | chat → future | Single doc patch when PK greenlights. |
| **Minor doc patches** (cc-0010A/0011/0012) | Various | P3 carry | HOLD. | chat → future | Doc-only. |
| **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 audit** | 3 geography rows | P3 carry | OPEN. | chat → future | Cleanup brief. |
| **AI cost view** | `vw_ai_cost_monthly` | P3 quick win | Carry. | chat → future | DDL + tile. |
| **Publisher latent config** | verify_jwt = false doc patch | P3 carry | OPEN. | chat → future | Single-file commit. |
| **M8b separate brief** | Function rename | P3 carry | NOT AUTHORED. | PK → chat | When PK directs. |
| **94-row un-publishable legacy cohort** | SQL filter per cc-0007 | P3 carry | LOGGED. | PK → chat | If PK directs. |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 secret | P2 sec OPEN | PK approval gate. | chat → future | PK authorisation. |
| **morning-inbox-sweep-v1** | PK personal-email triage | P3 carry | DRAFT exists. | PK → chat | PK reviews. |
| **22 escalated m.chatgpt_review rows** | 21 CCH + 1 T-MCP-05 meta | P3 carry gated | Untouched per CCH. | chat → future PK | Hold. |
| **Memory cap hygiene** | 19/30 (11 free) | P3 carry | — | chat → future | As needed. |
| **Parallel agent coordination (L47)** | informational | P3 carry | No interference v2.90. | chat → future | Passive. |
| **Other carries** | Dashboard mobile / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged from v2.86-v2.89. | various | various |

**Closed v2.90:**
- **cc-0017e apply session** (rank 1 P1 v2.89) → **CLOSED-APPLIED-WITH-VCHECK-CORRECTION** ✅. Migration applied + 4 Path B-prime correctives + V-checks PASS + D-01 closed.

**Closed earlier:** v2.89 cc-0017e v1.1 doc patch; v2.88 Wave 0e brief authoring; v2.87 cc-0017d v1.1 doc patch; v2.86 cc-0017d apply; v2.85 cc-0017c apply; v2.84 brief authoring + 2× D-01; v2.83 cc-0017b v1.1 doc patch; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.80 cc-0017a authoring; v2.79 PK approval gate.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v2.89.

---

## 📌 Backlog

**v2.90 state changes:**
- cc-0017e apply session (P1 rank 1 v2.89) → **CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.90.**
- **cc-0017e v1.1 doc patch (8-item)** PROMOTED to P2 rank 1 v2.90 (NEW). Authoring scope: 5 brief files + lessons-metadata-changelog.md.
- **Reconciliation daily diagnostic** PROMOTED to P1 rank 2 v2.90 (unblocked from cc-0017e gating).
- **purge_test_case helper extension** NEW carry P3 future Wave candidate.
- Friction Register Consolidation Plan: Gate 13.c (apply) → CLOSED v2.90. Wave 0e APPLIED.
- T-MCP-02 cum ~86 (+1 from v2.89).
- State-capture exceptions cum 1 unchanged.
- friction.* schema state: case_history table NOW EXISTS (was NO at v2.89). fn_triage_case at 11-arg only.
- **6 NEW L-v2.90-X candidates** (a + b HIGH-SIGNAL; c/d/e/f).
- L-v2.85-e mitigation re-applied 5th consecutive occurrence (v2.86 + v2.87 + v2.88 + v2.89 + v2.90); promotion-confirmed v2.88 carries forward. 1+2 split close v2.90 (per-session detail standalone + sync_state+action_list atomic).
- L-v2.83-a re-applied at each push_files this session. Cumulative 9+ STRONG.
- L-v2.85-a HIGH-SIGNAL re-exercised — 4 occurrences, promotion-eligible.
- Dashboard PHASES 43rd deferral carried (was 42 at v2.89; +1 at v2.90 = 43). No file-touch.
- **No decisions.md change.**

---

## 🧊 Frozen / Deferred

Unchanged from v2.85-v2.89.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e + L-v2.88-a-d + L-v2.89-a + **6 NEW L-v2.90-a-f** candidates carried per v2.90.

- **L40 exercised v2.90** (close-the-loop UPDATE on m.chatgpt_review).
- **L41 exercised v2.90** (5× apply_migration on friction). Cumulative v2.80-v2.90 = 11.
- **L46 exercised v2.90** (D-01 evidence gate; transparent weak_evidence disclosure).
- **L52-L65 various:** L58 applied v2.90 (atomic close-the-loop UPDATE).
- **L62 exercised v2.90**.
- **L-v2.76-a-f**: not re-exercised v2.90.
- **L-v2.78-a**: 2 occurrences (unchanged).
- **L47**: 1 occurrence (unchanged).
- **L-v2.81-a**: 2 occurrences (unchanged).
- **L-v2.83-a**: **9+ occurrences v2.90** (re-applied at per-session commit + sync close commit). STRONG CANDIDATE confirmed.
- **L-v2.84-a/b/c**: 1 occurrence each (unchanged).
- **L-v2.84-d**: 2 occurrences unchanged; related to L-v2.90-a.
- **L-v2.85-a HIGH-SIGNAL**: **4 occurrences v2.90 (PROMOTION-ELIGIBLE)** — V-A1 caught Defect 3 v2.90.
- **L-v2.85-b**: applied 4× v2.90 (Path B-prime correctives).
- **L-v2.85-c**: 1 occurrence (unchanged).
- **L-v2.85-d**: REALIZED v2.86; re-exercised v2.90 (helper bypass).
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88 carries forward v2.90; 5th consecutive occurrence**.
- **L-v2.86-a (HIGH-SIGNAL)**: 1 occurrence + PARTIALLY exercised v2.90 (disclosed as PARTIAL in D-01).
- **L-v2.86-b/c**: exercised v2.90 byte-stable; d+e unchanged.
- **L-v2.88-a**: 1 occurrence unchanged.
- **L-v2.88-b**: realised v2.90 (V-Z3 live execution).
- **L-v2.88-c**: REALISED v2.90 (probe re-verification at apply).
- **L-v2.88-d**: realised v2.90 (in-function INSERT pattern confirmed across 6 functions).
- **L-v2.89-a**: 1 occurrence v2.89; not re-exercised v2.90.
- **L-v2.90-a (NEW HIGH-SIGNAL)**: 1 occurrence v2.90.
- **L-v2.90-b (NEW HIGH-SIGNAL)**: 1 occurrence v2.90.
- **L-v2.90-c (NEW)**: 1 occurrence v2.90.
- **L-v2.90-d (NEW)**: 1 occurrence v2.90.
- **L-v2.90-e (NEW)**: 1 occurrence v2.90.
- **L-v2.90-f (NEW)**: 1 occurrence v2.90.

All candidates recommended for promotion at appropriate cycle once empirical evidence accumulates. **L-v2.85-e + L-v2.85-a are the highest-priority promotions at next lesson cycle; L-v2.90-a + L-v2.90-b (both HIGH-SIGNAL) join the watch.**

---

## v2.90 honest limitations

- All v2.31–v2.89 limitations apply.
- **8-item v1.1 doc patch backlog** is significant. Brief was AUTHORED + v1.1 column-name patch applied but apply revealed gaps in: V-D fixture constraint-surface probing, CREATE OR REPLACE arity semantics, helper coverage, and template column-name validity.
- **P2 transactional EXEC harness PARTIAL** — value-class defects (defects 1 + 2) would have surfaced earlier with full P2 harness on a branch DB; visual + precedent inspection caught substitution-class drift (none surfaced) but missed value drift.
- **`purge_test_case` helper case_history coverage gap** — separate future Wave brief candidate.
- **fn_triage_case external callers** still not enumerable via SQL — defensive 11-arg patch correctly in place but caller-surface inventory remains weak evidence.
- **22 outstanding close-the-loop UPDATEs unchanged net from prior sessions** (cc-0017e close was for the D-01 fired in this same session; closure within session means no net add to outstanding queue).
- **Memory cap 19/30** unchanged.
- **Action_list size at v2.90**: growth significant due to v2.90 ADDITIONS (5 migrations + 5 brief defects + 6 lesson candidates). Compaction not yet warranted but watching at v2.92+.
- **Per-session files v2.90**: 1 — `2026-05-19-cc0017e-applied.md` (commit `77d09376`, 26,994 B).
- **Doc-sync v2.90**: 1+2 split commit per L-v2.85-e baseline (per-session detail standalone + sync_state + action_list atomic via push_files). L-v2.89-a fallback (1+1+1) ready if atomic times out — not invoked v2.90 if first attempt succeeds.
- **Close-the-loop UPDATEs v2.90: 1** (cc-0017e — closed in same session). **22 outstanding unchanged net.**
- **State-capture exceptions v2.90: 0**. Cumulative: 1.
- **Production mutations v2.90: 5 migrations + 1 DML close UPDATE.** Plus 2 failed-rollback fixture seed attempts (atomic rollback left no residue).
- **Dashboard PHASES 43rd deferral** carried (was 42 at v2.89; +1 at v2.90). No file-touch v2.90.
- **No decisions.md change.**
- **No Wave 0f work started v2.90** per PK explicit instruction.
- **No mid-session compaction event v2.90.** Session was long (~4h apply + sync) but in-context coherent.
- **Apply session brief defects 1-8 indicate cc-0017e v1.0 brief was AUTHORED-PENDING-APPLY with significant pre-apply review gaps.** Future Wave authoring should incorporate L-v2.90-a/b/c/d/e/f discipline upfront.

---

## Changelog

- v1.0–v2.88: per commit history.
- v2.89 (2026-05-19 Sydney evening, cc-0017e v1.1 doc patch CLOSED): 2-file atomic push_files corrects m.chatgpt_review column-name anomaly; L-v2.85-e extended to 1+1+1 split due to atomic timeout; NEW L-v2.89-a candidate; 0 production mutations.
- **v2.90 (2026-05-19 Sydney evening, cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION):**
  - Build arc: session resumed v2.89 state → PK directive to apply cc-0017e → preflight P-set live (P1.1-1.5 + P3.2 PASS; P2 PARTIAL disclosed; S1-9 sanity probes with S7-broad false-FAIL on 6 reference-table grants; S7-narrow PASS) → D-01 fire `315baf84-...` AGREE / risk=medium / confidence=high / no escalation → PK approval phrase received → Step 1 main migration applied (DDL + 6 function patches + 8-row backfill + COMMENTs) → Step 2 fixture seed attempt 1 FAIL (severity='low' invalid CHECK) → PK Path B-prime severity='info' → attempt 2 FAIL (category='cc-0017e/v-d/category' violates FK) → PK Path B-prime continuation with constraint-surface check + category='unclassified' → attempt 3 PASS → V-A1 FAIL (fn_triage_case dual overload) → PK Path B-prime `DROP FUNCTION` legacy 10-arg → V-A1 re-run PASS → V-A2 PASS → PK-directed compat smoke on fixture-002 (10-arg positional call) PASS → V-B1/B2/C1 PASS → V-F1-F4 PASS → V-D1-D6 PASS → V-E1-E8 PASS → V-Z3 pre-cleanup 15 (reconciled with brief 14 + 1 compat smoke) → Step 4 cleanup blocked by purge_test_case regex mismatch + case_history coverage gap → PK Path A inline dependency-ordered DELETEs corrective → V-Z1/V-Z2/V-Z3 post-cleanup PASS (0 residue / 29 cases / 29 events / 8 backfill-only) → Step 6 close-the-loop FAIL on phantom `resolved_at` column → schema-corrected UPDATE (no `resolved_at` / no `result_summary`) → D-01 row resolved/applied_with_correction → per-session detail commit `77d09376` (26,994 B) standalone → sync_state + action_list atomic push_files this commit.
  - cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION. 5 successful migrations + 2 failed-rollback fixture-seed attempts.
  - PK scope unchanged from v2.88 directive (A/C/D/H/A-extended IN; B/E/F/G OUT/DEFER). Implicit additions v2.90: PK-directed compat smoke (legacy 10-arg positional shape on fixture-002) + 4 Path B-prime corrective migrations.
  - cc-0017e apply session (rank 1 P1 v2.89) → **CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.90**.
  - Gate 13.c sub-gate CLOSED v2.90. **Wave 0e APPLIED.**
  - 5 brief defects + 3 phantom column references = 8-item v1.1 doc patch backlog identified. PROMOTED to P2 rank 1 v2.90.
  - Reconciliation daily diagnostic UNBLOCKED from cc-0017e apply gating → P1 rank 2 carry.
  - purge_test_case helper extension NEW P3 future Wave candidate.
  - 1 D-01 fire (`315baf84-...` AGREE → resolved/applied_with_correction). T-MCP-02 cum ~86 (+1).
  - 5 production migrations applied + 1 DML close UPDATE. State-capture exceptions cumulative 1 unchanged.
  - **6 NEW L-v2.90 candidates** (a HIGH-SIGNAL + b HIGH-SIGNAL + c/d/e/f) documented in v2.90 ADDITIONS + Process Upgrades + Active table + Canonical Lessons.
  - L-v2.85-e re-applied **5th consecutive occurrence** (v2.86 + v2.87 + v2.88 + v2.89 + v2.90) — promotion-confirmed v2.88 carries forward. 1+2 split close v2.90 (per-session detail standalone + sync_state+action_list atomic push_files).
  - L-v2.85-a HIGH-SIGNAL re-exercised at V-A1 (Defect 3). 4 occurrences. **Promotion-eligible carries forward.**
  - L-v2.83-a re-applied at each push commit. Cumulative 9+ STRONG confirmed.
  - L-v2.85-b applied 4× v2.90 (Path B-prime correctives).
  - L-v2.85-d REALIZED helper bypassed v2.90 due to regex + coverage gaps. Fresh re-exercise informs L-v2.90-c/d.
  - L-v2.86-a HIGH-SIGNAL PARTIALLY exercised — P2 PARTIAL disclosed. Lesson reinforced: harness scope limited to substitution-class drift; value/schema-phantom/helper-coverage defects outside scope.
  - L-v2.88-b/c/d realised v2.90 (V-Z3 live; probe re-verification at apply; in-function INSERT pattern confirmed across 6 functions).
  - Active rows updated: cc-0017e apply session row CLOSED; cc-0017e v1.1 doc patch row NEW; reconciliation daily diagnostic PROMOTED rank 2; 6 NEW L-v2.90-X watcher rows added; purge_test_case helper extension NEW row.
  - STATUS BLOCKS updated: cc-0017e Wave 0e STATUS BLOCK updated with apply outcome + 8-item v1.1 backlog; Friction Plan STATUS BLOCK Gate 13.c CLOSED.
  - Closure budget: ~4h v2.90 (significantly larger than recent doc-patch sessions but in line with prior apply sessions v2.85/v2.86). Trailing-14-day ~30h.
  - Doc-sync: 1+2 split commit per L-v2.85-e baseline (per-session detail standalone + sync_state + action_list atomic via push_files). L-v2.89-a 1+1+1 fallback ready if atomic times out.
  - Production mutations: 5 migrations + 1 DML close UPDATE. Net schema deltas: +1 table + 6 function patches + 8 UPDATEs + 8 INSERTs.
  - No decisions.md change.
  - No mid-session compaction event.
  - No state-capture override.
  - No identical-PK-directive loop v2.90 (PK directives received clean across all 5 hard-stop events).
  - 5 hard-stop events to PK during apply (each with PK-directed Path B-prime disposition). Hard-stop discipline preserved end-to-end.
