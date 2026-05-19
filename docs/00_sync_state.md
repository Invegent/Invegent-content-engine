# ICE — Sync State Index

> **This file is the lightweight session pointer index.** Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog
3. Open the most-recent session file from the index below if deeper context is needed

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-19 | v2.90-cc0017e-applied | **cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION**. Main migration `cc_0017e_friction_case_history_and_compat` applied — case_history shadow table created + lockdown grants + fn_triage_case 11-arg patched + 5 cc-0017d mutation functions patched byte-stable + 8-row acknowledged-legacy backfill executed. 5 brief defects surfaced + 4 Path B-prime corrective migrations: severity='low'→'info' + category='cc-0017e/v-d/category'→'unclassified' (fixture seed value defects); explicit `DROP FUNCTION` legacy 10-arg fn_triage_case (CREATE OR REPLACE arity-change semantics); explicit dependency-ordered cleanup DELETEs (purge_test_case regex mismatch + case_history coverage gap); schema-correct close-the-loop UPDATE (resolved_at + result_summary phantom columns in template). D-01 review `315baf84-65ed-4086-9e58-cc2497737f5f` AGREE → resolved/applied_with_correction. Final V-check matrix PASS: V-A1/A2/B1/B2/C1, V-F1-4, V-D1-6 + PK-directed compat smoke (15 pre-cleanup case_history rows reconciled with +1 compat smoke), V-E1-8, V-Z1/Z2/Z3 post-cleanup (0 residue / 29 cases / 29 events / 8 backfill rows). **6 new L-v2.90 candidates surfaced** (L-v2.90-a/b HIGH-SIGNAL; L-v2.90-c/d/e/f candidates). **8-item v1.1 doc patch backlog** (vchecks.md V-D-setup × 3, migration-sql.md §2, risks-and-grants.md R4 + §3, d01-postapply-deferred.md §4 × 2, helper extension future Wave). T-MCP-02 cum ~86 (+1 D-01). State-capture exceptions cum 1 unchanged. Gate 11 Day 1 of 7 unchanged. Dashboard PHASES 43rd deferral. L-v2.85-e 5th consecutive occurrence — promotion-confirmed carries forward. | `docs/runtime/sessions/2026-05-19-cc0017e-applied.md` |
| 2026-05-19 | v2.89-cc0017e-v1.1-doc-patch | cc-0017e v1.1 doc patch CLOSED at commit `587ee4ac894a50708611cf9a053253083ae39e2b`. 2-file atomic `push_files` corrects m.chatgpt_review column-name anomaly in preflight-pset.md §P3.2 + d01-postapply-deferred.md §3-4: 6× `review_id`→`id`, 2× `proposal_text`→`proposal`. L-v2.85-e extended to 1+1+1 split this session due to atomic push_files timeout. NEW L-v2.89-a candidate. | `docs/runtime/sessions/2026-05-19-cc0017e-v1.1-doc-patch.md` |
| 2026-05-19 | v2.88-cc0017e-v1.0-authored | cc-0017e Wave 0e v1.0 brief AUTHORED-PENDING-APPLY at commit chain `8502fc49 → 1659b293 → d349bdfe`. 8 files. Open anomaly: m.chatgpt_review column-name discrepancy — **resolved v2.89; surfaced 7 more brief defects at v2.90 apply**. | `docs/runtime/sessions/2026-05-19-cc0017e-v1.0-authored.md` |
| 2026-05-19 | v2.87-cc0017d-v1.1-doc-patch | cc-0017d v1.1 doc-only patch CLOSED at commit `f0367405`. 4 files patched + read-back verified. No production mutations. | `docs/runtime/sessions/2026-05-19-cc0017d-v1.1-doc-patch.md` |
| 2026-05-19 | v2.86-cc0017d-applied-with-vcheck-correction | cc-0017d Wave 0d APPLIED-WITH-VCHECK-CORRECTION. 6 SECURITY DEFINER mutation functions deployed. | `docs/runtime/sessions/2026-05-19-cc0017d-applied-with-vcheck-correction.md` |
| 2026-05-19 | v2.85-cc0017c-applied-with-vcheck-correction | cc-0017c APPLIED-WITH-VCHECK-CORRECTION. Friction.* Wave 0 (0a+0b+0c) COMPLETE. | `docs/runtime/sessions/2026-05-19-v2.85-cc0017c-applied-with-vcheck-correction.md` |
| 2026-05-19 | v2.84-cc0017c-v1.0-v1.1-d01-deferred | cc-0017c v1.0+v1.1 BRIEF AUTHORED + 2× D-01 + APPLY DEFERRED TO FRESH SESSION (Path C). | `docs/runtime/sessions/2026-05-19-v2.84-cc0017c-v1.0-v1.1-d01-deferred.md` |
| 2026-05-18 | v2.83-cc0017b-v1.1-close-cc0017c-open | cc-0017b v1.1 doc-only patch CLOSED + L-v2.81-a re-exercised + cc-0017c authoring open. | `docs/runtime/sessions/2026-05-18-v2.83-cc0017b-v1.1-close-cc0017c-open.md` |
| 2026-05-18 | cc-0017b-applied | cc-0017b Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + 27/27 V-CHECKS PASS (v2.82). | `docs/runtime/sessions/2026-05-18-cc-0017b-applied.md` |
| 2026-05-18 | cc-0017a-applied-l41-l47 | cc-0017a Wave 0a APPLIED + 20/20 V-CHECKS PASS (v2.81). | `docs/runtime/sessions/2026-05-18-cc-0017a-applied-l41-l47.md` |
| 2026-05-18 | cc-0017a-v1.1-and-d01-fire | cc-0017a v1.0+v1.1 PATCH + D-01 PARTIAL TYPE-C + PK PATH B (v2.80). | `docs/runtime/sessions/2026-05-18-cc-0017a-v1.1-and-d01-fire.md` |
| 2026-05-18 | v2.79-friction-plan-signed | FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS SIGNED (v2.79). | `docs/runtime/sessions/2026-05-18-v2.79-friction-plan-signed.md` |
| 2026-05-18 | v2.78-friction-register-consolidation-planning | FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS LOCKED (v2.78). | `docs/runtime/sessions/2026-05-18-v2.78-friction-register-consolidation-planning.md` |
| 2026-05-18 | cc-0014-archived-and-recon-daily | cc-0014 CLOSED-ARCHIVED + RECON CRON DAILY (v2.77). | `docs/runtime/sessions/2026-05-18-cc-0014-archived-and-recon-daily.md` |
| 2026-05-16 | v2.76-stage-e-close-and-window-open | cc-0014 FULLY CLOSED + 14-DAY WINDOW + FAB LIVE + cc-0015/0016 DRAFTED (v2.76). | `docs/runtime/sessions/2026-05-16-v2.76-stage-e-close-and-window-open.md` |
| 2026-05-15 | cc-0014-stage-d-and-e-prerun | cc-0014 STAGE D CLOSED + STAGE E APPLIED (v2.75). | `docs/runtime/sessions/2026-05-15-cc-0014-stage-d-and-e-prerun.md` |
| 2026-05-15 | cc-0014-stage-c-applied | cc-0014 Stage C APPLIED (v2.74). | `docs/runtime/sessions/2026-05-15-cc-0014-stage-c-applied.md` |
| 2026-05-15 | cc-0014-stage-b-applied | cc-0014 Stage B APPLIED (v2.73). | `docs/runtime/sessions/2026-05-15-cc-0014-stage-b-applied.md` |
| 2026-05-14 | cc-0014-stage-a-applied | cc-0014 Stage A APPLIED (v2.72). | `docs/runtime/sessions/2026-05-14-cc-0014-stage-a-applied.md` |

*(Older sessions truncated for brevity.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-19 Sydney evening — v2.90: cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION

**Outcome:** cc-0017e v1.0 applied. friction.case_history shadow table live; fn_triage_case 11-arg patched body with case_history INSERT; 5 cc-0017d mutation functions patched byte-stable with case_history INSERT writes; 8-row acknowledged-legacy backfill executed. D-01 review `315baf84-65ed-4086-9e58-cc2497737f5f` AGREE → resolved/applied_with_correction. 5 brief defects + 4 Path B-prime corrective migrations + 8-item v1.1 doc patch backlog identified.

**Migrations applied this session (5 successful, 2 failed-rollback):**

1. `cc_0017e_friction_case_history_and_compat` ✅ — DDL + 6 function patches + 8-row backfill + COMMENTs (atomic)
2. `cc_0017e_vcheck_fixture_seed` attempts 1+2 ❌ ROLLBACK (severity / category defects) → attempt 3 ✅ (severity='info', category='unclassified')
3. `cc_0017e_drop_legacy_fn_triage_case_10arg` ✅ — corrective DROP of legacy 10-arg overload (CREATE OR REPLACE arity-change semantics)
4. `cc_0017e_vcheck_audit_cleanup` ✅ — explicit dependency-ordered DELETEs (purge_test_case helper bypassed)
5. `cc_0017e_chatgpt_review_close` ✅ — D-01 close UPDATE (schema-corrected for phantom columns)

**Brief defects surfaced (5 + 3 phantom column refs = 8 v1.1 items):**

1. vchecks.md V-D-setup — severity='low' invalid (case_severity_check allows info/warn/critical only)
2. vchecks.md V-D-setup — category='cc-0017e/v-d/category' violates case_category_fkey (6 valid codes only)
3. migration-sql.md §2 + risks-and-grants.md R4 — `CREATE OR REPLACE FUNCTION` with arity change creates a sibling overload, not a replacement; explicit `DROP FUNCTION` of prior signature required
4. vchecks.md V-D-setup + V-Z1 — fixture naming `cc-0017e/v-d/...` doesn't match `purge_test_case` regex `^cc-[0-9]{4}[a-z]?-test/`
5. cleanup path — `purge_test_case` helper is case_history-unaware (helper realised v2.86 pre-dated case_history)
6. d01-postapply-deferred.md §4 — `resolved_at` column phantom (not in m.chatgpt_review schema)
7. d01-postapply-deferred.md §4 — `result_summary` column phantom
8. risks-and-grants.md §3 — broad-scope clause ("authenticated + anon have zero grants on friction.*") overclaims; actual lockdown scope is case + event + emit_error only

**V-check matrix (all PASS final state):**

V-A1 (post-DROP) → only 11-arg fn_triage_case + 5 cc-0017d byte-stable; V-A2 → body recognition 4/4 markers; V-B1/B2 → SECURITY DEFINER + owner=postgres; V-C1 → postgres full + service_role SELECT only + no authenticated/anon; V-F1-4 → 8 backfill rows correct deltas; V-D1-D6 + PK-directed compat smoke (legacy 10-arg positional call shape on fixture-002 → 11-arg DEFAULT p_actor=NULL → current_user fallback → 'postgres') = 7 case_history rows; V-E1-E8 → all denials/rejections fire (23514, 23503, 42501×3, P0001×4, P0002); V-Z3 pre-cleanup → 15 (reconciled with PK +1 compat smoke); V-Z1/V-Z2/V-Z3 post-cleanup → 0 residue / 29 cases / 29 events / 8 backfill-only.

**V-Z3 reconciliation:** brief expected 14 pre-cleanup; actual 15 = brief 14 + 1 compat smoke PK explicitly directed mid-session. Reported transparently. Post-cleanup: 8 (matches brief).

**Hard stops respected (5 hard-stop events to PK during apply, each with PK-directed Path B-prime disposition):**

1. Step 2 fixture seed severity FAIL → PK directed retry with severity='info'
2. Step 2 retry category FAIL → PK directed continuation with constraint-surface check first
3. V-A1 dual overload → PK directed `DROP FUNCTION` corrective
4. Step 4 cleanup blocked → PK directed inline DELETE corrective (Option A)
5. Close-the-loop phantom columns → non-blocking; closed with schema-correct columns

0 Wave 0f scope creep / 0 decisions.md edits / 0 memory edits / 0 state-capture overrides.

**6 NEW L-v2.90 lesson candidates:** L-v2.90-a (V-D fixture constraint-surface probing — HIGH-SIGNAL) / L-v2.90-b (CREATE OR REPLACE arity-change → explicit DROP required — HIGH-SIGNAL) / L-v2.90-c (V-D naming must match purge_test_case regex) / L-v2.90-d (shadow tables + helper coverage gaps) / L-v2.90-e (close-the-loop SQL templates must validate against actual m.chatgpt_review schema) / L-v2.90-f (risk-and-grants verification clauses must match actual lockdown scope).

**Items closed v2.90:**
- **cc-0017e apply session** (rank 1 P1 v2.89) → **CLOSED-APPLIED-WITH-VCHECK-CORRECTION** ✅
- **Gate 13.c** sub-gate → CLOSED v2.90
- **Wave 0e** → APPLIED
- D-01 `315baf84-...` → resolved/applied_with_correction

**Items newly opened v2.90:**
- **cc-0017e v1.1 doc patch (8-item)** — P2 carry, NEW. Authoring required for 5 vchecks.md/migration-sql.md/risks-and-grants.md/d01-postapply-deferred.md correction items + lessons-metadata-changelog.md (new L-v2.90 family).
- **`purge_test_case` helper extension** — P3 future Wave candidate. Helper needs case_history coverage.

**Lesson exercise v2.90:**
- **L-v2.85-e**: re-applied **5th consecutive occurrence** (v2.86 + v2.87 + v2.88 + v2.89 + v2.90). Promotion-confirmed v2.88 carries forward. v2.90 1+2 split close attempted (per-session detail standalone + sync_state+action_list atomic push_files).
- **L-v2.85-a (HIGH-SIGNAL)**: re-exercised — V-A1 strict signature byte-match surfaced Defect 3 (dual overload). 4th occurrence. Promotion-eligible carries forward.
- **L-v2.85-d**: REALIZED helper (purge_test_case) bypassed this session due to regex mismatch + case_history coverage gap. Fresh re-exercise.
- **L-v2.86-a (HIGH-SIGNAL)**: PARTIALLY exercised — P2 transactional EXEC harness disclosed as PARTIAL; defensive coverage via visual + cc-0017d precedent worked for substitution-class drift (none surfaced); value-class / schema-phantom / helper-coverage defects are outside harness scope.
- **L41**: exercised 5× (apply_migration on k.schema_registry-registered friction schema).
- **L40 / L46 / L58 / L62**: all exercised at appropriate gates.
- **L-v2.83-a**: 9+ occurrences; STRONG candidate confirmed.
- **L-v2.88-c** (probe re-verification gate at apply time): realised by full P-set re-run at apply.
- **L-v2.89-a**: not exercised — atomic push_files at sync close attempted (1+2 split); if timeout occurs, 1+1+1 fallback.

**Sync close mechanics v2.90:**
1. cc-0017e migration applied (no git commit).
2. Per-session detail file standalone via `create_or_update_file`: commit `77d09376d7cdc9e0dbc76c5ec0a937d0fd46adf2` (26,994 B).
3. sync_state.md + action_list.md atomic push_files (1+2 split per L-v2.85-e baseline).

Total git commits this session: 2 (per-session detail + atomic sync_state+action_list) if atomic succeeds; 3 if L-v2.89-a fallback to 1+1+1.

**v2.90 honest limitations:**
- **8-item v1.1 doc patch backlog** is significant. Brief AUTHORED but apply revealed gaps in: V-D fixture constraint-surface probing, CREATE OR REPLACE arity semantics, helper coverage, and template column-name validity.
- **P2 transactional EXEC harness PARTIAL** — value-class defects (defects 1+2) would have surfaced earlier with full P2 harness on a branch DB; visual + precedent inspection caught substitution-class drift but missed value drift.
- **`purge_test_case` helper case_history coverage gap** — separate future Wave brief candidate.
- **fn_triage_case external callers** still not enumerable via SQL — defensive 11-arg patch correctly in place but caller-surface inventory remains weak evidence.
- **22 outstanding close-the-loop UPDATEs unchanged** from prior sessions; +1 added this session (cc-0017e close).
- **Gate 11 (1-week observation window) still Day 1 of 7** (same calendar day as v2.86-v2.89 closes).
- **No mid-session compaction event v2.90** despite session length and complexity.

---

### 2026-05-19 Sydney evening — v2.89 close (brief)

cc-0017e v1.1 doc patch CLOSED at commit `587ee4ac`. 2-file atomic push_files corrects m.chatgpt_review column-name anomaly in preflight-pset.md §P3.2 + d01-postapply-deferred.md §3-4. NEW L-v2.89-a candidate (push_files atomic timeout → 1+1+1 fallback). Apply path unblocked. **cc-0017e applied at v2.90 (see above) with 5 additional brief defects + 8-item v1.1 doc patch backlog surfacing during apply.**

*(Full detail at `docs/runtime/sessions/2026-05-19-cc0017e-v1.1-doc-patch.md` commit `dca2a6e4`.)*

---

## 🟡 Next session priorities (rebuilt v2.90)

1. **cc-0017e v1.1 doc patch (8-item)** — **P2 carry, rank 1 v2.90 (NEW)**. Authoring required across 5 brief files + lessons-metadata-changelog.md (new L-v2.90 family).
2. **Reconciliation daily cadence diagnostic** — **P1 carry, rank 2**. First post-cc-0017e cron 85 fire pending; check after fire lands. Now unblocked from cc-0017e apply gating.
3. **Health_check V-C3 + signal-production diagnostic** — **P1 carry, rank 3**. V-C3 still PENDING.
4. **Platform Reconciliation View brief authoring** — **P2 carry, rank 4**. PK greenlight required.
5. **5-row close-the-loop batch sweep / Pre-sales criteria refinement / `purge_test_case` helper case_history extension** — P2/P3 carries, rank 5 placeholder per PK direction.

**Standing P0:** Personal businesses check-in. Crazy Domains follow-up carry from v2.51.

Carries: cc-0015 friction-pool-view (Wave 7, still gated on observation window closing 2026-05-26); cc-0016 friction-capture-evidence (Wave 8, still gated on Wave 7); cc-0017c v1.2 doc patch; cc-0017a v1.2 doc patch; vchecks.md V-B4 doc patch; 22 close-the-loop outstanding (+1 from v2.90 if any); Dashboard PHASES 43rd deferral; minor doc patches; F-CRON-AUTO-APPROVER-SECRET-INLINE; lesson promotions (L-v2.78-a + L-v2.81-a eligible; L-v2.83-a STRONG 9+; L-v2.84-a/b/c/d watching; L-v2.85-a/b/c/d/e — **L-v2.85-e PROMOTION-CONFIRMED 5th consecutive v2.90**, L-v2.85-a HIGH-SIGNAL 4 occurrences watching; L-v2.86-a/b/c/d/e watching; L-v2.88-a/b/c/d candidates carried; L-v2.89-a candidate carried (not re-exercised v2.90); **6 NEW L-v2.90-a/b/c/d/e/f candidates** — L-v2.90-a/b HIGH-SIGNAL).

---

## ⛔ Carried-forward "do not touch" state

**v2.90 updates on standing items:**

- **cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION v2.90.** Migration `cc_0017e_friction_case_history_and_compat` applied. friction.case_history table exists with cc-0017c lockdown grants. fn_triage_case 11-arg patched (legacy 10-arg dropped via `cc_0017e_drop_legacy_fn_triage_case_10arg`). 5 cc-0017d mutation functions patched byte-stable. 8 acknowledged-legacy cases backfilled (triaged_at=reviewed_at, triaged_by='legacy_backfill'). 8 backfill rows in case_history (change_kind='backfill'). All V-checks final PASS. D-01 `315baf84-...` resolved/applied_with_correction.
- **cc-0017e v1.1 doc patch (8-item) NEW v2.90.** P2 rank 1 v2.90. Authoring required for: vchecks.md V-D-setup (severity + category + naming), migration-sql.md §2 (DROP statement + arity-change discipline), risks-and-grants.md R4 + §3, d01-postapply-deferred.md §4 (4 template variants — resolved_at + result_summary phantoms), V-Z1 cleanup pattern, lessons-metadata-changelog.md (NEW L-v2.90 family).
- **cc-0017e v1.1 doc patch CLOSED v2.89** at commit `587ee4ac894a50708611cf9a053253083ae39e2b` — unchanged.
- **cc-0017e Wave 0e v1.0 brief AUTHORED-PENDING-APPLY** at commit chain `8502fc49 → 1659b293 → d349bdfe` — now APPLIED. Carry: brief commits remain on main for audit + v1.1 patch surfaces.
- **`purge_test_case` helper case_history coverage gap NEW v2.90.** Helper realised v2.86 deletes from event + case + emit_error, NOT case_history. case_history.case_id is FK ON DELETE RESTRICT. Helper extension is a future Wave brief candidate. Workaround: inline dependency-ordered DELETEs (cc-0017e v2.90 precedent).
- **cc-0017d v1.1 doc patch CLOSED v2.87** at commit `f0367405`. Unchanged.
- **cc-0017d migration applied v2.86** — unchanged. `cc_0017d_friction_case_mutation_functions`. 6 SECURITY DEFINER mutation functions live. Note: 5 of the 6 (triage_case, resolve_case, reopen_case, mark_duplicate, record_first_view) patched byte-stable by cc-0017e v2.90. fn_triage_case patched (not part of cc-0017d).
- **cc-0017d V-check artefacts** — unchanged from v2.86.
- **m.chatgpt_review row `206d2258-...`** — unchanged from v2.86.
- **m.chatgpt_review row `315baf84-...` NEW v2.90** — D-01 fire for cc-0017e v1.0 apply, status=resolved/applied_with_correction/resolved_by=cc-0017e-close-v2.90.
- **m.chatgpt_review schema** confirmed v2.90: no `resolved_at` column; no `result_summary` column. d01-postapply-deferred.md §4 templates reference both phantoms — v1.1 doc patch required.
- **Friction Register Consolidation Plan gate 13.c** (cc-0017e apply) → CLOSED v2.90. **Wave 0e APPLIED.** Next gate: PK direction on Wave 0f (B/E/F/G items deferred from cc-0017e + helper extension) OR cc-0015 / cc-0016 sequencing after observation window closes 2026-05-26.
- **Gate 11** (1-week observation window 2026-05-19 → 2026-05-26) ACTIVE. Day 1 of 7 unchanged (v2.90 same calendar day as v2.86/v2.87/v2.88/v2.89 closes).
- **Wave 0e — case history/audit** — APPLIED v2.90. v1.1 doc patch backlog (8 items) carries forward.
- **Wave 0f** — NOT YET SCOPED. Items B/E/F/G deferred from cc-0017e + helper extension are candidates.
- **m.chatgpt_review rows `d18fa6db-...`, `a37eff28-...`, `9e602a2d-...`, `b612a8e4-...`, `a6415afa-...`, `adcc8385-...`** all status=resolved (unchanged).
- **cc-0017c APPLIED-WITH-VCHECK-CORRECTION v2.85** unchanged.
- **cc-0017b APPLIED-WITH-CORRECTIVE v2.82 + v1.1 doc patch v2.83.** Unchanged.
- **cc-0017a APPLIED v2.81.** Unchanged.
- **cc-0014 CLOSED-ARCHIVED v2.77.** Unchanged.
- **cc-0015 friction-pool-view** (Wave 7, commit `9a5dc155`): Wave 0e gate cleared v2.90; still gated on 1-week observation window closing 2026-05-26.
- **cc-0016 friction-capture-evidence** (Wave 8, commit `f35f8ea4`): Wave 0e gate cleared v2.90; still gated on Wave 7 sequencing.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0** (commit `bc32e86`). Sunset 2026-06-15.
- **PostgREST exposed_schemas includes `friction`** (carry).
- **cron 85 daily** (since v2.77). First cc-0017e-post-apply cron 85 fire pending — diagnostic now P1 rank 2.
- **L58 BASELINE v2.76** carried.
- **L62 baseline-eligible v2.77** — exercised v2.90.
- **L41**: exercised v2.90 (5× apply_migration on friction schema). Cumulative v2.80-v2.90 = 11.
- **L40**: exercised v2.90 (close-the-loop UPDATE on m.chatgpt_review via apply_migration).
- **L46**: exercised v2.90 (D-01 evidence gate; transparent weak_evidence disclosure).
- **L-v2.78-a / L-v2.81-a / L-v2.83-a candidates**: L-v2.83-a re-exercised v2.90 (push_files file-count verification across all push commits); cumulative 9+ STRONG.
- **L-v2.84-a/b/c/d candidates**: not re-exercised v2.90 in net new form (L-v2.84-d related to L-v2.90-a).
- **L-v2.85-a/b/c/d/e candidates**: **L-v2.85-a HIGH-SIGNAL** re-exercised v2.90 — V-A1 surfaced Defect 3. 4 occurrences, promotion-eligible. **L-v2.85-d** (REALIZED helper) bypassed v2.90 due to regex + coverage gaps. **L-v2.85-e re-applied 5th consecutive occurrence — promotion-confirmed v2.88 carries forward**. Others not re-exercised v2.90.
- **L-v2.86-a/b/c/d/e candidates**: L-v2.86-a HIGH-SIGNAL PARTIALLY exercised (P2 limitation disclosed); L-v2.86-b/c exercised throughout via byte-stable signatures + ROWTYPE quoting. Others carry.
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.90.
- **L-v2.88-a/b/c/d candidates**: L-v2.88-c realised v2.90 (probe re-verification at apply via P-set re-run). Others not re-exercised.
- **L-v2.89-a candidate**: not re-exercised v2.90 (atomic push_files at sync close attempted; 1+1+1 fallback ready if timeout).
- **6 NEW L-v2.90-X candidates v2.90.** See per-session detail Section 13 + action_list Process Upgrades.
- **cc-0009 / cc-0010A / cc-0010B / cc-0010C / cc-0011 / cc-0012**: unchanged from v2.89.
- **22 close-the-loop UPDATEs outstanding** unchanged from v2.89. v2.90 ADDED 1 (cc-0017e close itself: `315baf84-...` now resolved — net effect on outstanding queue: 0 additional; this was the new D-01 fired this session, closed in same session).
- **T-MCP-02 quota: ~86 cumulative v2.90** (+1 D-01 fire this session). State-capture exceptions cumulative: 1 unchanged.
- Cron 82-86 firing normally.
- **Dashboard roadmap PHASES — 43rd consecutive deferral.** No file-touch v2.90.
- M-series total dead-letter rows cleared since 8 May 2026: 396.
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier).
- **Cowork output pipeline V-C3 still PENDING.**
- **Production FAB live on dashboard.invegent.com** unchanged.
- **Localhost FAB cleanup pending** (`.env.local`).
- **D-CC-0017B-Q1** (severity_override query-pattern note) carried.
- **D-IOL-001** (v2.77) carried.

---

## 📜 G1 convention (the rule)

Unchanged. Per-session file `docs/runtime/sessions/2026-05-19-cc0017e-applied.md` written first as standalone commit (`77d09376`). sync_state and action_list updated as **atomic push_files commit** this session per L-v2.85-e baseline mitigation 1+2 split (5th consecutive occurrence — promotion-confirmed v2.88 carries forward). `decisions.md` not touched. Dashboard PHASES 43rd consecutive deferral — no file-touch. L-v2.89-a fallback (1+1+1) ready if atomic push_files times out — not invoked this session if first attempt succeeds.

**This file size**: ~24KB after this update.

---

*Last updated: 2026-05-19 Sydney evening — v2.90: cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION. Main migration `cc_0017e_friction_case_history_and_compat` applied — friction.case_history shadow table live + fn_triage_case 11-arg patched (legacy 10-arg dropped via corrective) + 5 cc-0017d functions patched byte-stable + 8-row acknowledged-legacy backfill executed. D-01 review `315baf84-65ed-4086-9e58-cc2497737f5f` resolved/applied_with_correction. Final V-check matrix PASS (V-A1/A2/B/C/F/D/E/Z3 pre + V-Z1/Z2/Z3 post). 5 brief defects + 4 Path B-prime corrective migrations + 8-item v1.1 doc patch backlog identified. **6 NEW L-v2.90 candidates** (a/b HIGH-SIGNAL; c/d/e/f). T-MCP-02 cum ~86 (+1). State-capture exceptions cum 1 unchanged. Memory 19/30 unchanged. Gate 11 Day 1 of 7 unchanged. Dashboard PHASES 43rd deferral. L-v2.85-e 5th consecutive — promotion-confirmed carries forward. Per-session detail commit `77d09376`. sync_state + action_list atomic push_files this commit (1+2 split per L-v2.85-e baseline).*
