# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-19 Sydney evening (**v2.86 — cc-0017d Wave 0d APPLIED-WITH-VCHECK-CORRECTION. Migrations `cc_0017d_friction_case_mutation_functions` + `cc_0017d_vcheck_fixture_seed` + `cc_0017d_vcheck_audit_cleanup` (zero-effect) + `cc_0017d_vcheck_audit_cleanup_v2` (1 row) + `cc_0017d_chatgpt_review_close`. D-01 review_id `206d2258-...` AGREE; status=resolved; resolved_by=cc-0017d-close-v2.86. 22/23 V-checks strict PASS + V-F1 PARTIAL (PK-disposition brief-expectation drift). 6 SECURITY DEFINER mutation functions live. Plan gate 12 CLOSED. Wave 7/8 unblocked-by-Wave-0d (still gated on 1-week observation window). cc-0017d v1.1 doc patch P1 NEW; Wave 0e P2 NEW (NOT started). T-MCP-02 cum ~76→~85. 5 new L-v2.86 candidates (a HIGH-SIGNAL). Dashboard PHASES 39th deferral carried.**) **Today/Next 5**: cc-0017d v1.1 doc patch → rank 1; Wave 0e brief authoring → rank 2; reconciliation daily diagnostic → rank 3; health_check V-C3 → rank 4; Platform Reconciliation View → rank 5.

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v2.85.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46-v2.58 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a (STRONG; 7+) + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL applied) + L-v2.85-b/c/d/e carried. **D-IOL-001 (v2.77)** carried. **D-CC-0017B-Q1** carried. **5 NEW L-v2.86 candidates**: a (HIGH-SIGNAL), b, c, d, e.

**v2.86 ADDITIONS:**

- **cc-0017d Wave 0d APPLIED-WITH-VCHECK-CORRECTION.** 6 SECURITY DEFINER case-mutation functions live in `friction.*`: `triage_case`, `resolve_case`, `reopen_case`, `mark_duplicate`, `record_first_view`, `purge_test_case`. All postgres-owner, search_path=friction,public, out_-prefix discipline on RETURNS TABLE columns.
- **Path B-prime applied** — two inline compile-fix rounds before deploy success: Round 1 substituted 24 RAISE format `%%`→`%`; Round 2 quoted 6 `friction.case%ROWTYPE`→`friction."case"%ROWTYPE`. Brief v1.1 doc patch P1 next session.
- **22/23 V-checks strict PASS.** V-A1 byte-match (L-v2.85-a proactive); V-B1/C1/C2 security+grants; V-D1-D5 positive smoke; V-E1-E10 negative SQLSTATEs; V-Z1 strict residue; V-Z2 baseline.
- **V-F1 PARTIAL via PK-approved disposition** — brief-expectation drift, not migration failure. cases_deleted=7 satisfies functional intent. events=0 expected via direct-INSERT fixture path (emission_rule CHECK forces). errors=0 due to mark_duplicate internal-prefix `cc-0017d/mark_duplicate/` not matching strict regex.
- **V-F1 corrective cleanup applied in two cycles.** PK-specified pattern v1 (`'%cc-0017d-test/%'`) hit 0 rows (fixture-naming convention mismatch: my fingerprints used `cc-0017d-test-fp-NNN`). PK-approved adjusted pattern v2 (drop trailing slash) removed exactly 1 leftover audit row. **Final residue zero across all 8 cross-checks; total_cases=29 baseline.**
- **Fresh D-01 CLOSED.** review_id `206d2258-...`; verdict AGREE; resolved_by `cc-0017d-close-v2.86`. Initial close-the-loop UPDATE failed on column-name error (used `review_id` not `id`); probe-then-correct via `information_schema.columns` query. L40 re-exercised.
- **Plan gate 12 CLOSED** (Wave 0d). Gate 11 (1-week observation window 2026-05-19 → 2026-05-26) ACTIVE.
- **Wave 7 (cc-0015) + Wave 8 (cc-0016) unblocked-by-Wave-0d.** Still gated on observation window for cc-0015; cc-0016 still gated on Wave 7 sequencing.
- **D-01 fires v2.86: 1.** T-MCP-02 cum **~76 → ~85** (+~9 from compile-fix probes + V-check probes + cleanup probes + column-name probe).
- **State-capture exceptions v2.86: 0.** Cumulative: 1 (unchanged).
- **L40 exercised, L41 not exercised, L46 exercised, L58 applied (1+2 split per L-v2.85-e), L62 exercised.**
- **L-v2.86-a candidate (NEW, HIGH-SIGNAL)** — Pre-apply syntactic validation via transactional EXEC (not just PARSE). Caught RAISE+ROWTYPE only at production-apply.
- **L-v2.86-b candidate (NEW)** — `out_`-prefix on RETURNS TABLE columns prevents SELECT-FROM-function name collision. Proactive in cc-0017d.
- **L-v2.86-c candidate (NEW)** — Reserved SQL keyword ROWTYPE quoting requirement in PL/pgSQL DECLARE.
- **L-v2.86-d candidate (NEW)** — Cross-column CHECK pre-validation inline in PL/pgSQL.
- **L-v2.86-e candidate (NEW)** — V-check fixture-data conventions must align with the prefix regex production purge helpers will match.
- **Closed Active rows v2.86**: cc-0017d apply; fresh D-01 fire; V-F1 corrective cleanup; Plan Wave 0d gate 12.
- **New Active rows v2.86**: cc-0017d v1.1 doc patch (P1); Wave 0e brief authoring (P2; NOT started this session).
- **Dashboard PHASES sync: 39th consecutive deferral** (no file-touch v2.86; PK directive scoped to standard pattern; recent practice is no-touch).
- **NO decisions.md change.** Wave 0d apply is execution of v2.79-signed Friction Register Consolidation Plan.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~4 (cc-0017d v1.1 doc patch + recon daily diagnostic + health_check signal diagnostic + music library) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~23h (v2.83 1h + v2.84 ~2h + v2.85 ~3h + v2.86 ~3.5h) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.86 cycle: ~3.5h total.** 5 schema mutations via apply_migration. 1 fresh D-01 fire. 1 m.chatgpt_review close-the-loop (after 1 column-probe retry). 1+2 split commit close per L-v2.85-e mitigation. **State-capture exception count v2.86: 0** (cumulative 1).

---

## ⭐ Today / Next 5

> Last rebuilt: 2026-05-19 Sydney evening (v2.86).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0017d v1.1 doc patch / cleanup-pattern correction** | **P1 (NEW v2.86)** | Brief v1.0 had RAISE+ROWTYPE compile defects fixed inline at apply; V-F1 expected-counts drifted from implementation; V-D-setup fixture naming needs documented convention. | chat → PK | Single doc-only commit when PK greenlights scope. Three sub-patches per cc-0017d details. |
| 2 | **Wave 0e — case history / audit brief authoring** | **P2 (NEW v2.86)** | Per PK action-list directive. **NOT started this session per PK explicit instruction.** | chat → PK | PK scope confirmation; brief authoring next session. |
| 3 | **Reconciliation daily cadence diagnostic** | **P1 (rank 3 v2.86)** | First post-cc-0017d cron 85 fire pending. Confirms Wave 0d functions co-exist with cc-0017b wrappers + cc-0017c FK-hardened state. | chat → PK | Post-fire SQL count + emit_event signature check. |
| 4 | **Health_check V-C3 + signal-production diagnostic** | **P1 (rank 4 v2.86)** | V-C3 still PENDING. Cowork brief v3.0 ready. | Cowork → chat | Check post-fire `docs/audit/health/YYYY-MM-DD.md`. |
| 5 | **Platform Reconciliation View brief authoring** | **P2 (rank 5 v2.86)** | Reconciliation surface design. PK greenlight required. | PK → chat | When PK directs. |

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Passive observation v2.86**: Cron 82-86 unchanged. PRV v1 operator views queryable. friction.* state: 9 tables, **18 functions** (12 from cc-0017a/b/c + 6 new from cc-0017d), event_source_check → event_source_fk, service_role SELECT-only on event+case, 6 mediated mutation functions, 29 events + 29 cases. PostgREST exposes `friction`. Next fires: cron 85 daily; cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (UPDATED v2.86)

**Status v2.86: ✅ Wave 0 + Wave 0d COMPLETE. Gates 10+12 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE.**

**Documents:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`) — unchanged
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` SIGNED — unchanged
- `docs/briefs/cc-0017a-friction-register-foundational-schema.md` v1.1 — APPLIED v2.81
- `docs/briefs/cc-0017b-friction-register-unified-emit-event.md` v1.1 — APPLIED v2.82
- `docs/briefs/cc-0017c-friction-register-lockdown-and-backfill.md` v1.1 — APPLIED v2.85
- `docs/briefs/cc-0017d-friction-case-mutation-functions.md` v1.0 — **APPLIED v2.86** (v1.1 doc patch P1 pending)
- **Migrations live v2.86**: `cc_0017d_friction_case_mutation_functions` + `cc_0017d_vcheck_fixture_seed` + `cc_0017d_vcheck_audit_cleanup` (zero-effect) + `cc_0017d_vcheck_audit_cleanup_v2` (1 row) + `cc_0017d_chatgpt_review_close`
- Per-session files: v2.79–v2.85 unchanged; **v2.86 at `2026-05-19-cc0017d-applied-with-vcheck-correction.md` (commit `3dc099fb`)**

**Open gates v2.86:**
1-9. ✅ PK approval + cc-0017a/b/c brief authoring + D-01 cycles + cc-0017c v1.0+v1.1 D-01 fires
10. ✅ cc-0017c apply (CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.85)
11. ⏳ **1-week empirical observation window** ACTIVE 2026-05-19 → 2026-05-26
12. ✅ **cc-0017d Wave 0d apply** (CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.86)
13. ⏳ **Wave 0e — case history / audit** (P2 NEW, NOT started v2.86)

**v2.86 provenance:** P-set + fresh D-01 + apply_migration (×5 via Path B-prime) + 23 V-checks + V-F1 corrective cleanup v2 + close-the-loop + 4-way sync close (1+2 split commit per L-v2.85-e) all chat-side this session. No parallel-agent contributions observed.

**Empirical findings v2.86:**
- 6 SECURITY DEFINER mutation functions can co-exist with cc-0017c-lockdown service_role REVOKE without conflict.
- `friction.purge_test_case(text)` operates as service_role-only postgres-owner helper (realization of L-v2.85-d candidate).
- Reserved SQL keywords (`case`) require quoting in `%ROWTYPE` type-names even when permissive in DML grammar.
- RAISE EXCEPTION format strings use single `%` placeholder, distinct from PL/pgSQL `%%` escape in `format()` calls.
- Cross-fingerprint mark_duplicate writes audit to `friction.emit_error` with internal-prefix `cc-0017d/mark_duplicate/` namespace.

---

## 🟢 cc-0017d Wave 0d — STATUS BLOCK (NEW v2.86)

**Status: ✅ CLOSED-APPLIED-WITH-VCHECK-CORRECTION.**

**Migrations live:** `cc_0017d_friction_case_mutation_functions` (main) + `cc_0017d_vcheck_fixture_seed` (V-D-setup) + `cc_0017d_vcheck_audit_cleanup` (PK-specified pattern v1, zero-effect) + `cc_0017d_vcheck_audit_cleanup_v2` (PK-approved adjusted pattern, 1 row removed) + `cc_0017d_chatgpt_review_close`.

**Brief commits:** v1.0 multi-file (8 commits between `25797f7c` and `8a5c6b6b`); v1.1 doc patch P1 candidate (NEW v2.86; covers RAISE+ROWTYPE inline fixes, V-F1 expected-counts reconciliation, fixture-naming convention documentation).

**D-01 cycle:** Fresh `206d2258-...`: AGREE (procedural escalate only) → resolved v2.86 via close-the-loop UPDATE.

**V-check final matrix:**
| Check | Status |
|---|---|
| V-A1 | ✅ PASS — signatures byte-match brief §3 (L-v2.85-a proactive) |
| V-B1 | ✅ PASS — security attributes |
| V-C1 | ✅ PASS — 17 grant rows per §4 matrix |
| V-C2 | ✅ PASS — purge_test_case not granted to authenticated |
| V-D1 | ✅ PASS — triage_case positive smoke |
| V-D2 | ✅ PASS — resolve_case positive smoke |
| V-D3 | ✅ PASS — reopen_case positive smoke |
| V-D4 | ✅ PASS — mark_duplicate cross-fingerprint audit written |
| V-D5 | ✅ PASS — record_first_view idempotency |
| V-E1-E10 | ✅ PASS (all 10 negative tests; correct SQLSTATEs) |
| V-F1 | ⚠️ PARTIAL — cases_deleted=7 functional; events=0 vs brief ≥7 (direct INSERT seed path); errors=0 vs brief ≥1 (mark_duplicate internal prefix not in strict regex). **PK-approved disposition: APPLIED-WITH-VCHECK-CORRECTION; brief v1.1 doc patch P1 next session.** |
| V-Z1 | ✅ PASS — 0/0/0 strict-prefix residue |
| V-Z2 | ✅ PASS — total_cases=29 baseline |

**Final empirical state (post-cleanup-v2):** event=29, case=29, source=3/3; all cc-0017d residue across 8 cross-checks = 0; baseline preserved.

**Wave 0d scope (per brief, all deployed):** 6 SECURITY DEFINER mutation functions with `out_`-prefix RETURNS TABLE discipline, `friction,public` search_path, postgres ownership, and grant matrix per §4.

**Out of scope (deferred):** Wave 0e case history / audit (P2 NEW); Wave 7 cc-0015 friction-pool-view (still gated on observation window); Wave 8 cc-0016 friction-capture-evidence (still gated on Wave 7).

**Open follow-ups:** cc-0017d v1.1 doc patch P1; Wave 0e brief authoring P2; 1-week observation window 2026-05-19 → 2026-05-26.

---

## 🟢 cc-0017c / cc-0017b / cc-0017a / cc-0014 / cc-0015 / cc-0016 / cc-0012 / cc-0010A/B/C / cc-0011 / cc-0009 — STATUS BLOCKS

**v2.86 updates:**
- cc-0015 friction-pool-view (Wave 7): **Wave 0d gate cleared v2.86**; still gated on 1-week observation window closing 2026-05-26.
- cc-0016 friction-capture-evidence (Wave 8): **Wave 0d gate cleared v2.86**; still gated on Wave 7 sequencing.
- All others unchanged from v2.85.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v2.86)

**L40 exercised v2.86** — column-name discipline re-probed on m.chatgpt_review (initial UPDATE used prior-memory `review_id`/`terminal_status`/`resolved_at`; corrected via `information_schema.columns` probe).
**L41 not exercised v2.86** for non-friction schemas. Cumulative v2.80-v2.86 = 6 unchanged.
**L46 Evidence Gate exercised v2.86** — fresh D-01 with verbatim P-set.
**L58 applied 1× v2.86** — 3-file close split into 1+2 commits per L-v2.85-e mitigation.
**L62 exercised 1× v2.86** — fresh D-01 cycle clean.
**L-v2.78-a, L-v2.81-a**: 2 occurrences each, promotion-eligible (unchanged).
**L-v2.83-a**: 7+ occurrences (+1 v2.86 from this 1+2 commit close). STRONG PROMOTION CANDIDATE confirmed.
**L-v2.84-a/b/c/d**: L-v2.84-d re-exercised (occurrence 2; column-probe-before-DML on m.chatgpt_review).
**L-v2.85-a HIGH-SIGNAL**: applied proactively v2.86. `out_`-prefix discipline pre-baked into brief signatures.
**L-v2.85-b**: applied v2.86. Path B-prime is inline-correction-during-apply variant of Path 1.
**L-v2.85-c**: not re-exercised v2.86 (Wave 0d does not touch the SECDEF/REVOKE boundary).
**L-v2.85-d**: realized v2.86. `friction.purge_test_case(text)` is the postgres-owner cleanup helper.
**L-v2.85-e**: mitigation applied v2.86. 1+2 split close avoided length-budget risk.
**L-v2.86-a candidate (NEW, HIGH-SIGNAL)**: Pre-apply syntactic validation via transactional EXEC (not just PARSE). Recommendation: brief P-set should include `BEGIN; <full SQL>; ROLLBACK;` with marker SELECT before production apply.
**L-v2.86-b candidate (NEW)**: `out_`-prefix on RETURNS TABLE columns.
**L-v2.86-c candidate (NEW)**: Reserved SQL keyword ROWTYPE quoting in PL/pgSQL DECLARE.
**L-v2.86-d candidate (NEW)**: Cross-column CHECK pre-validation inline in PL/pgSQL.
**L-v2.86-e candidate (NEW)**: V-check fixture-data convention alignment with prefix regex.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated.
- **First cc-0017d-post-apply cron 85 fire** pending.
- No new v2.86 calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v2.86: 1 fresh D-01 fire. T-MCP-02 cum **~85** (was 76; +~9 from compile-fix probes + V-check probes + cleanup probes + column-name probe). L46 Evidence Gate exercised once. L62 1× clean. State-capture exceptions v2.86: 0 (cum 1). Close-the-loop UPDATEs v2.86: 1 in-session (row `206d2258-...`; after 1 column-probe retry). **22 outstanding** unchanged.

---

## 🤖 Cowork automation (D182)

Unchanged from v2.85. Cron 82/83/86 firing normally. V-C3 PENDING.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0017d v1.1 doc patch** | RAISE+ROWTYPE compile fixes + V-F1 reconciliation + fixture-naming convention docs | **P1 (rank 1 NEW v2.86)** | Doc-only. Three sub-patches. | chat → PK | PK greenlights scope; single doc-only commit. |
| **Wave 0e — case history / audit brief authoring** | Audit-trail and event-replay design | **P2 (rank 2 NEW v2.86)** | NOT YET STARTED per PK explicit instruction. | chat → PK | PK scope confirmation next session. |
| **Reconciliation daily diagnostic** | First post-cc-0017d cron 85 fire | **P1 (rank 3 v2.86)** | OPEN. | chat → PK | Post-fire SQL + emit_event check. |
| **Health_check V-C3 diagnostic** | Cowork pipe | **P1 (rank 4 v2.86)** | OPEN. V-C3 PENDING. | Cowork → chat | Check post-fire health doc. |
| **Platform Reconciliation View brief** | Reconciliation surface design | **P2 (rank 5 v2.86)** | NOT YET STARTED. | PK → chat | When PK directs. |
| **Music library activation** | video-worker v3.0.0 env-var gated | P2 carry | PENDING PK. | PK + chat | Bucket + tracks + env + smoke. |
| **vchecks.md V-B4 doc patch** | Correct V-B4 to 12-param signature (L-v2.85-a follow-up) | P3 carry | Doc-only. May fold into cc-0017c v1.2. | chat → PK | PK decides scope. |
| **cc-0017c v1.2 doc patch candidate** | Date correction + 3 D-01 references + V-B4 signature correction | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **cc-0015 friction-pool-view brief** (Wave 7) | Authored PENDING_EXECUTION | P2 (Wave 7; **Wave 0d gate cleared v2.86**; still gated on 1-week window) | DRAFTED commit `9a5dc155`. | chat → PK (Wave 7) | When window closes 2026-05-26. |
| **cc-0016 friction-capture-evidence brief** (Wave 8) | Authored PENDING_EXECUTION | P2 (Wave 8; **Wave 0d gate cleared v2.86**; still gated on Wave 7) | DRAFTED commit `f35f8ea4`. | chat → PK (Wave 8) | After Wave 7. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | P2 carry | OBSERVED. | chat → PK | Verify + dry-run + re-enable. |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P2 carry | LOGGED. | chat → PK | Audit m.post_draft. |
| **Dashboard PHASES sync** | 39th consecutive deferral | P2 carry | Discipline call overdue. | chat → PK | Update roadmap page at next dashboard session. |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 carry | OPEN. | PK | When PK directs. |
| **Close-the-loop batch sweep — 22 escalated** | 21 historical CCH + 1 T-MCP-05 meta | P2 carry | Gated on PK directive. | chat → future PK | Hold. |
| **L-v2.78-a baseline promotion** | Reviewer convergence | P3 carry | 2 occurrences, eligible. | chat → next lesson cycle | Promote alongside L-v2.81-a. |
| **L47 baseline promotion** | list_recent_commits before retry | P3 carry | 1 occurrence. | chat → next session | Consider co-promotion with L-v2.85-e. |
| **L-v2.81-a baseline promotion** | Parallel-session coordination | P3 carry | 2 occurrences, eligible. | chat → next lesson cycle | Promote. |
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (7+ occurrences; STRONG CANDIDATE)** | Re-exercised v2.86. | chat → next lesson cycle | Promote. |
| **L-v2.84-a candidate** | Empirical-finding precedence | P3 carry | 1 occurrence. | chat → next session | Watcher. |
| **L-v2.84-b candidate** | Defensive idempotent REVOKE/GRANT | P3 carry | 1 occurrence. | chat → next session | Watcher. |
| **L-v2.84-c candidate** | Path A corrected_action satisfaction | P3 carry | 1 occurrence. | chat → next session | Watcher. |
| **L-v2.84-d candidate** | Schema-probe-before-DML | **P3 carry (2 occurrences v2.86)** | Re-exercised v2.86 on m.chatgpt_review column-name probe. | chat → next session | Promotion-eligible. |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | **P3 (2 occurrences; applied proactively v2.86)** | `out_`-prefix discipline pre-baked into cc-0017d brief. | chat → next session | Watcher; promotion-eligible after re-exercise. |
| **L-v2.85-b** | Inline V-check rewrite Path 1 / Path B-prime | **P3 (2 occurrences)** | Path B-prime applied v2.86 (inline-correction-during-apply variant). | chat → next session | Watcher. |
| **L-v2.85-c** | SECURITY DEFINER bypass post REVOKE | P3 (1 occurrence) | Not re-exercised v2.86. | chat → next session | Watcher. |
| **L-v2.85-d** | Postgres-owner cleanup migration | **P3 (REALIZED v2.86)** | `friction.purge_test_case(text)` deployed. | chat → next session | Resolved; archive after one more exercise. |
| **L-v2.85-e** | push_files length budget | **P3 (mitigation applied v2.86)** | 1+2 split commit avoided truncation risk. | chat → next session | Watcher. |
| **L-v2.86-a candidate (NEW, HIGH-SIGNAL)** | Pre-apply syntactic validation via transactional EXEC | **P3 NEW (1 occurrence)** | RAISE+ROWTYPE only caught at production apply; dry-run with marker would have caught both. | chat → next session | Watcher; recommendation for brief P-set. |
| **L-v2.86-b candidate (NEW)** | `out_`-prefix on RETURNS TABLE columns | P3 NEW (1 occurrence) | Proactive in cc-0017d. | chat → next session | Watcher. |
| **L-v2.86-c candidate (NEW)** | Reserved SQL keyword ROWTYPE quoting | P3 NEW (1 occurrence) | `friction.case%ROWTYPE` requires quoting. | chat → next session | Watcher. |
| **L-v2.86-d candidate (NEW)** | Cross-column CHECK pre-validation inline | P3 NEW (1 occurrence) | Predictable PL/pgSQL exception vs raw SQLSTATE. | chat → next session | Watcher. |
| **L-v2.86-e candidate (NEW)** | V-check fixture-data convention alignment | P3 NEW (1 occurrence) | Fixture-naming hyphen vs strict-prefix slash mismatch. | chat → next session | Watcher. |
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
| **Parallel agent coordination (L47)** | informational | P3 carry | No interference v2.86. | chat → future | Passive. |
| **Other carries** | Dashboard mobile / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged from v2.85. | various | various |

**Closed v2.86:**
- cc-0017d apply (P1 rank 1 NEW-BLOCKING v2.85) → **CLOSED-APPLIED-WITH-VCHECK-CORRECTION** ✅
- Fresh D-01 fire (`206d2258-...`) → **resolved** ✅
- V-F1 corrective cleanup → **applied; 1 row deleted as expected** ✅
- Plan gate 12 (Wave 0d) → **CLOSED** ✅

**Closed earlier:** v2.85 cc-0017c apply + fresh D-01 + V-B4 PK Path 1 + V-B4 smoke cleanup + Plan gate 10; v2.84 brief authoring + 2× D-01; v2.83 cc-0017b v1.1 doc patch; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.80 cc-0017a authoring; v2.79 PK approval gate.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v2.85.

---

## 📌 Backlog

**v2.86 state changes:**
- cc-0017d apply → CLOSED-APPLIED-WITH-VCHECK-CORRECTION (Path B-prime; 24 RAISE %%→% + 6 ROWTYPE quoting inline fixes).
- V-F1 corrective cleanup v2 → CLOSED-APPLIED (1 row deleted).
- Fresh D-01 → resolved (`206d2258-...`, verdict AGREE).
- Friction Register Consolidation Plan gate 12 → CLOSED. Gate 11 ACTIVE; Gate 13 (Wave 0e) NEW.
- cc-0017d v1.1 doc patch → P1 NEW (promoted from inline-fix capture).
- Wave 0e brief authoring → P2 NEW (per PK directive; NOT started this session).
- cc-0015 / cc-0016 → Wave 0d gate cleared (still gated on observation window / Wave 7 sequencing).
- T-MCP-02 cum ~76 → ~85 (+~9 D-01-adjacent probes).
- State-capture exceptions cum 1 (unchanged).
- friction.* schema: 6 new SECURITY DEFINER mutation functions live; 18 functions total.
- 5 new L-candidates (a HIGH-SIGNAL, b, c, d, e); L-v2.85-a HIGH-SIGNAL applied proactively; L-v2.85-d realized; L-v2.85-e mitigation applied.
- 1+2 split commit close (per-session detail standalone + sync_state+action_list atomic).
- Dashboard PHASES 39th carried (no file-touch).
- **No decisions.md change.**

---

## 🧊 Frozen / Deferred

Unchanged from v2.85.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e candidates carried per v2.86.

- **L40 exercised v2.86** — column-name discipline re-probed on m.chatgpt_review.
- **L41 not exercised v2.86** — cumulative 6 (v2.80-v2.86).
- **L46 exercised v2.86** — Evidence Gate.
- **L52-L65** various: not re-exercised v2.86.
- **L58 baseline**: 1× v2.86 (1+2 split close per L-v2.85-e mitigation).
- **L62 baseline-eligible**: exercised 1× v2.86 clean.
- **L-v2.76-a-f**: not re-exercised.
- **L-v2.78-a**: 2 occurrences, eligible.
- **L47**: 1 occurrence.
- **L-v2.81-a**: 2 occurrences, eligible.
- **L-v2.83-a**: 7+ occurrences, STRONG CANDIDATE.
- **L-v2.84-a/b/c**: 1 occurrence each.
- **L-v2.84-d**: 2 occurrences (re-exercised v2.86 on column-probe-before-DML).
- **L-v2.85-a HIGH-SIGNAL**: 2 occurrences (applied proactively v2.86 — `out_`-prefix on RETURNS TABLE).
- **L-v2.85-b**: 2 occurrences (Path B-prime applied v2.86).
- **L-v2.85-c**: 1 occurrence (not re-exercised v2.86).
- **L-v2.85-d**: REALIZED v2.86 (`purge_test_case` deployed).
- **L-v2.85-e**: mitigation applied v2.86.
- **L-v2.86-a (HIGH-SIGNAL)** — Pre-apply syntactic validation via transactional EXEC.
- **L-v2.86-b** — `out_`-prefix on RETURNS TABLE columns.
- **L-v2.86-c** — Reserved SQL keyword ROWTYPE quoting.
- **L-v2.86-d** — Cross-column CHECK pre-validation inline.
- **L-v2.86-e** — V-check fixture-data convention alignment.

All candidates recommended for promotion at appropriate cycle once empirical evidence accumulates.

---

## v2.86 honest limitations

- All v2.31–v2.85 limitations apply.
- **Brief v1.0 had two syntactic defects** (RAISE %%, ROWTYPE quoting). L-v2.86-a addresses going forward.
- **V-F1 PARTIAL is brief-expectation drift**, not migration failure. Functional intent satisfied.
- **3 migration entries for one logical apply** (main + cleanup-v1-zero-effect + cleanup-v2-effective). Cleanup-v1 retained for auditability.
- **Initial close-the-loop UPDATE failed on column-name error**; L40 re-exercised.
- **22 outstanding close-the-loop UPDATEs** unchanged.
- **Memory cap 19/30** unchanged.
- **Action_list size at v2.86**: ~33KB (compacted per L-v2.85-e mitigation).
- **Per-session files v2.86**: 1 — `2026-05-19-cc0017d-applied-with-vcheck-correction.md` (commit `3dc099fb`).
- **Doc-sync v2.86**: 1+2 split commit per L-v2.85-e mitigation (per-session detail standalone; sync_state+action_list atomic).
- **Close-the-loop UPDATEs v2.86: 1** (in-session, after 1 column-probe retry). 22 outstanding unchanged.
- **State-capture exceptions v2.86: 0**. Cumulative: 1.
- **Production mutations v2.86**: 4 apply_migration + 1 m.chatgpt_review row UPDATE (exempt; routed via apply_migration).
- **Dashboard PHASES 39th deferral** carried (no file-touch v2.86; PK directive scoped to standard pattern; recent practice is no-touch).
- **No decisions.md change.** Wave 0d apply is execution of v2.79-signed plan.
- **No Wave 0e work started** per PK explicit instruction.

---

## Changelog

- v1.0–v2.85: per commit history.
- **v2.86 (2026-05-19 Sydney evening, cc-0017d Wave 0d APPLIED-WITH-VCHECK-CORRECTION):**
  - Build arc: session resumed post-compaction → cleanup directive sequence (initial cleanup zero-effect → halt → PK adjusted pattern → 1 row deleted → verification all-zero) → D-01 close-the-loop UPDATE (failed on column-name; probe; corrected) → 4-way sync close v2.86 (1+2 split commit per L-v2.85-e mitigation).
  - cc-0017d Wave 0d APPLIED-WITH-VCHECK-CORRECTION. 6 SECURITY DEFINER case-mutation functions live.
  - Path B-prime applied: 24 RAISE %%→% + 6 ROWTYPE quoting inline at production apply (caught at runtime; cc-0017d v1.1 doc patch P1 captures).
  - V-F1 corrective cleanup in two cycles (PK-specified v1 zero-effect due to fixture-naming drift; PK-approved adjusted v2 removed 1 row exactly).
  - Final residue zero across all 8 cross-checks; total_cases=29 baseline preserved.
  - D-01 review_id `206d2258-...` AGREE; closed-the-loop after column-probe retry.
  - Plan gate 12 CLOSED. Wave 7/8 unblocked-by-Wave-0d (still gated on observation window / Wave 7 sequencing).
  - D-01 fires v2.86: 1. T-MCP-02 cum ~76 → ~85. State-capture exceptions 1 unchanged.
  - L-series: L40 exercised; L41 not exercised; L46 exercised; L58 applied (1+2 split); L62 exercised. L-v2.83-a +1 (7+ STRONG). L-v2.84-d +1 (2 occurrences). L-v2.85-a HIGH-SIGNAL applied proactively. L-v2.85-d realized. L-v2.85-e mitigation applied. 5 NEW L-v2.86 candidates (a HIGH-SIGNAL, b, c, d, e).
  - Active rows updated: cc-0017d apply → CLOSED; cc-0017d v1.1 doc patch → P1 NEW; Wave 0e brief authoring → P2 NEW (NOT started); cc-0015/0016 Wave 0d gate cleared.
  - STATUS BLOCKS updated: Plan gate 12 CLOSED; cc-0017d STATUS BLOCK NEW.
  - Closure budget: ~3.5h v2.86. Trailing-14-day ~23h.
  - Doc-sync: 1+2 split commit per L-v2.85-e mitigation.
  - Production mutations: 4 apply_migration + 1 m.chatgpt_review UPDATE (exempt).
  - No decisions.md change.
