# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-19 Sydney evening (**v2.89 — cc-0017e v1.1 doc patch CLOSED at commit `587ee4ac894a50708611cf9a053253083ae39e2b`. 2-file atomic `push_files` (preflight-pset.md §P3.2 + d01-postapply-deferred.md §3-4) corrects m.chatgpt_review column-name anomaly: 6× `review_id` → `id` + 2× `proposal_text` → `proposal`. Read-back verified byte-deltas exact match (preflight-pset −12 B; d01-postapply-deferred −40 B). Residual sweep across remaining 6 cc-0017e files = 0 occurrences anywhere in brief tree. Apply path unblocked. Gate 13.b CLOSED. cc-0017e v1.1 doc patch (rank 1 P1 v2.88) → CLOSED; cc-0017e apply session (rank 2 P1 v2.88) → PROMOTED rank 1 P1 v2.89. **0 production mutations / 0 apply_migration / 0 D-01 fires / 0 Wave 0f scope creep / 0 decisions.md edits / 0 memory edits.** Memory 19/30 unchanged. T-MCP-02 cum ~85 unchanged. State-capture exceptions cum 1 unchanged. Gate 11 Day 1 of 7 unchanged. Dashboard PHASES 42nd deferral. L-v2.85-e re-applied 4th consecutive occurrence (promotion-confirmed v2.88 carries forward) — extended to 1+1+1 split close this session due to atomic push_files timeout on first sync close attempt. L-v2.83-a re-applied (file-count=2 matched). **NEW L-v2.89-a candidate**: push_files atomic timeout fallback to individual create_or_update_file. Per-session detail at `2026-05-19-cc0017e-v1.1-doc-patch.md` commit `dca2a6e4`. sync_state alone commit `0c45eee8`. action_list this commit. Sync close mechanics: extended 1+1+1 per L-v2.85-e timeout recovery.**) **Today/Next 5**: cc-0017e apply session → rank 1 (PROMOTED P1, PK directive remaining gate); reconciliation daily diagnostic → rank 2; health_check V-C3 → rank 3; Platform Reconciliation View → rank 4; 5-row close-the-loop batch / pre-sales criteria refinement → rank 5.

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v2.88.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46-v2.58 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a (STRONG; **8+ v2.89**) + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL applied) + L-v2.85-b/c/d carried + **L-v2.85-e PROMOTION-CONFIRMED 4th consecutive v2.89 (carries forward from v2.88)** + 5 L-v2.86 candidates + 4 L-v2.88-a/b/c/d candidates (carry from v2.88) + **NEW L-v2.89-a candidate** (push_files atomic timeout → 1+1+1 fallback). **D-IOL-001 (v2.77)** carried. **D-CC-0017B-Q1** carried.

**v2.89 ADDITIONS:**

- **cc-0017e v1.1 doc patch CLOSED** at commit `587ee4ac894a50708611cf9a053253083ae39e2b`. 2-file atomic `push_files`. Read-back verified.
- **Substitutions (per PK directive):**
  - preflight-pset.md §P3.2 SQL block: `SELECT review_id, ...` → `SELECT id, ...` + `WHERE proposal_text ILIKE` → `WHERE proposal ILIKE` (1+1 changes; 1 file)
  - d01-postapply-deferred.md §3 idempotency check SQL: 1+1 changes
  - d01-postapply-deferred.md §4 close-the-loop UPDATE templates: 4 × `WHERE review_id =` → `WHERE id =` (4 changes across 4 UPDATE statements)
  - **Total: 6× `review_id` → `id`, 2× `proposal_text` → `proposal`**
- **File SHAs:**
  - preflight-pset.md: `268f973b416ee87ff73201e2c7b9b096cccf0e2d` → `22d555282245499b4b5cc69a63110a4888cce416` (7,996 B → 7,984 B; −12 B)
  - d01-postapply-deferred.md: `237ae8986302150e14423db2737945a685af4cdb` → `43ee19716119925f56f4585b415a549e9ab05f1d` (9,113 B → 9,073 B; −40 B)
  - Both byte-deltas exact match against expected (−6×7 + −2×5 = −52 total).
- **Residual sweep across other cc-0017e files:** main brief + migration-sql.md + vchecks.md + risks-and-grants.md + hardstop-rollback.md + lessons-metadata-changelog.md = 0 `review_id` + 0 `proposal_text` occurrences anywhere. Anomaly fully resolved. (Note: lessons-metadata-changelog.md §3.2 inventory table holds stale pre-patch SHA `268f973b...`/7996 B for preflight-pset.md — acceptable v1.0 authoring artefact per PK strict 2-file scope.)
- **Hard stops adhered v2.89:** 0 production mutations / 0 apply_migration / 0 D-01 fires / 0 Wave 0f scope creep / 0 decisions.md edits / 0 memory edits / 0 scope expansion.
- **Sync close mechanics v2.89 (EXTENDED per timeout recovery):**
  1. Doc patch commit: `587ee4ac` (2 files via `push_files`).
  2. Per-session detail commit: `dca2a6e4` (standalone via `create_or_update_file`).
  3. **First sync close attempt** (atomic push_files sync_state + action_list) — **TIMED OUT**.
  4. **Retry path:** sync_state.md alone via `create_or_update_file` (commit `0c45eee8`) + action_list.md alone via `create_or_update_file` (this commit). 1+1+1 split close.
- **L-v2.85-e mitigation extended v2.89:** original split was 1+2 (per-session standalone + sync_state+action_list atomic). After atomic push_files timeout, fell back to 1+1+1 (per-session + sync_state alone + action_list alone). Promotion-confirmed v2.88 carries forward; the rationale of the lesson ("trade strict atomicity for length-budget safety") extends naturally to timeout recovery.
- **cc-0017e v1.1 doc patch** (rank 1 P1 v2.88) → **CLOSED v2.89** at commit `587ee4ac`.
- **Gate 13.b** sub-gate → CLOSED v2.89.
- **Promoted Active row v2.89:** cc-0017e apply session (rank 2 P1 v2.88) → **rank 1 P1 v2.89**. Apply path unblocked. Only remaining gate: PK directive.
- **Production mutations v2.89: 0.** Schema state end of v2.89 = end of v2.88 = end of v2.86.
- **D-01 fires v2.89: 0.** Doc patch + sync close — no production action.
- **T-MCP-02 cum v2.89: ~85 unchanged** (no MCP probes consumed; no ask_chatgpt_review called).
- **State-capture exceptions v2.89: 0.** Cumulative: 1 unchanged.
- **L-series v2.89:** L40 not exercised; L41 not exercised; L46 not exercised; L58 applied 1× (extended split close per L-v2.85-e); L62 not exercised. **L-v2.85-e re-applied 4th consecutive occurrence** (v2.86 + v2.87 + v2.88 + v2.89); promotion-confirmed v2.88 carries forward; extended to 1+1+1 split v2.89. **L-v2.83-a re-applied at patch commit** (push_files response file-count = 2 matched expected). **NEW L-v2.89-a candidate surfaced**: atomic push_files timeout → 1+1+1 fallback pattern.
- **Closed Active rows v2.89:** cc-0017e v1.1 doc patch (rank 1 P1 v2.88) → CLOSED ✅.
- **Dashboard PHASES sync: 42nd consecutive deferral** (was 41 at v2.88; +1 at v2.89). No file-touch v2.89.
- **NO decisions.md change.** Doc-patch close; no new architectural decisions.
- **Session compaction event:** 0. No mid-session compaction needed.
- **PK-directive loop pattern from v2.88:** not re-exercised v2.89 (single directive received clean).
- **Atomicity loss v2.89 sync close:** sync_state and action_list updated as separate commits instead of atomic push_files (timeout recovery). Brief window during which sync_state was v2.89 but action_list was still v2.88 — minimised to seconds between consecutive commits. Acceptable per L-v2.85-e extended rationale.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~3 (cc-0017e apply gating + recon daily diagnostic + health_check signal diagnostic) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~26h (v2.83 1h + v2.84 ~2h + v2.85 ~3h + v2.86 ~3.5h + v2.87 ~0.5h + v2.88 ~1.5h + v2.89 ~1h) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.89 cycle: ~1h total** (added ~0.5h vs initial estimate due to atomic push_files timeout + 1+1+1 retry). 0 schema mutations. 0 D-01 fires. 4 commits (doc patch + per-session detail + sync_state alone + action_list alone). **State-capture exception count v2.89: 0** (cumulative 1).

---

## ⭐ Today / Next 5

> Last rebuilt: 2026-05-19 Sydney evening (v2.89).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0017e apply session** | **P1 v2.89 (PROMOTED from rank 2 P1 v2.88)** | Brief AUTHORED-PENDING-APPLY at commit chain `8502fc49 → 1659b293 → d349bdfe`. v1.1 doc patch CLOSED v2.89 at `587ee4ac`. Only remaining apply gate: PK directive. | chat → PK | When PK directs. Full P-set + D-01 fire + apply_migration + V-check matrix (V-A through V-Z including new V-Z3) + close-the-loop. |
| 2 | **Reconciliation daily cadence diagnostic** | P1 carry | First post-cc-0017d cron 85 fire pending. Confirms Wave 0d functions co-exist with cc-0017b wrappers + cc-0017c FK-hardened state. | chat → PK | Post-fire SQL count + emit_event signature check. |
| 3 | **Health_check V-C3 + signal-production diagnostic** | P1 carry | V-C3 still PENDING. Cowork brief v3.0 ready. | Cowork → chat | Check post-fire `docs/audit/health/YYYY-MM-DD.md`. |
| 4 | **Platform Reconciliation View brief authoring** | P2 carry | Reconciliation surface design. PK greenlight required. | PK → chat | When PK directs. |
| 5 | **5-row close-the-loop batch sweep / Pre-sales criteria refinement** | P2/P3 carry | 22 outstanding close-the-loop UPDATEs; Pre-sales 3-clock criteria per memory entry. | chat → PK | When PK directs. |

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Passive observation v2.89**: Cron 82-86 unchanged. PRV v1 operator views queryable. friction.* state: 9 tables, 19 functions, 29 cases + 29 events (unchanged baseline v2.86 → v2.87 → v2.88 → v2.89). PostgREST exposes `friction`. case_history does NOT yet exist (cc-0017e AUTHORED-PENDING-APPLY; v1.1 doc patch CLOSED v2.89; apply pending PK directive). Next fires: cron 85 daily; cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (UPDATED v2.89)

**Status v2.89: ✅ Wave 0 + Wave 0d COMPLETE. Wave 0e brief AUTHORED-PENDING-APPLY at v2.88; v1.1 doc patch CLOSED v2.89. Gates 10+12 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE Day 1 of 7. Gate 13.a CLOSED v2.88; Gate 13.b CLOSED v2.89; Gate 13.c (apply) OPEN — next.**

**Documents:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`) — unchanged
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` SIGNED — unchanged
- `docs/briefs/cc-0017a-friction-register-foundational-schema.md` v1.1 — APPLIED v2.81
- `docs/briefs/cc-0017b-friction-register-unified-emit-event.md` v1.1 — APPLIED v2.82
- `docs/briefs/cc-0017c-friction-register-lockdown-and-backfill.md` v1.1 — APPLIED v2.85
- `docs/briefs/cc-0017d-friction-case-mutation-functions.md` v1.1 — APPLIED v2.86 + v1.1 doc patch CLOSED v2.87 at commit `f0367405`
- `docs/briefs/cc-0017e-friction-case-history-and-compat.md` v1.0 AUTHORED v2.88 at commit chain `8502fc49 → 1659b293 → d349bdfe`; **v1.1 doc patch CLOSED v2.89 at commit `587ee4ac`** (m.chatgpt_review column-name correction in preflight-pset.md §P3.2 + d01-postapply-deferred.md §3-4)
- **Migrations live v2.89**: unchanged from v2.86 — `cc_0017d_friction_case_mutation_functions` + `cc_0017d_vcheck_fixture_seed` + `cc_0017d_vcheck_audit_cleanup` (zero-effect) + `cc_0017d_vcheck_audit_cleanup_v2` (1 row) + `cc_0017d_chatgpt_review_close`. **No new migrations v2.89** (cc-0017e still authored only; apply pending PK directive).
- Per-session files: v2.79–v2.88 unchanged; **v2.89 at `2026-05-19-cc0017e-v1.1-doc-patch.md` (commit `dca2a6e4`)**

**Open gates v2.89:**
1-9. ✅ PK approval + cc-0017a/b/c brief authoring + D-01 cycles + cc-0017c v1.0+v1.1 D-01 fires
10. ✅ cc-0017c apply (CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.85)
11. ⏳ **1-week empirical observation window** ACTIVE 2026-05-19 → 2026-05-26 (Day 1 of 7 unchanged v2.89; same calendar day as v2.86/v2.87/v2.88 closes)
12. ✅ cc-0017d Wave 0d apply (CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.86) + v1.1 doc patch CLOSED v2.87
13. **Wave 0e** — case history / audit
    - 13.a Authoring sub-gate ✅ CLOSED v2.88 (brief at commit chain `8502fc49 → 1659b293 → d349bdfe`)
    - 13.b v1.1 doc patch sub-gate **✅ CLOSED v2.89** at commit `587ee4ac` (m.chatgpt_review column-name correction landed and verified)
    - 13.c Apply sub-gate ⏳ OPEN (gated on PK directive only; v1.1 doc patch no longer blocking)

**v2.89 provenance:** 4 read-only reads at session start (sync_state, action_list, preflight-pset.md, d01-postapply-deferred.md) + 1 patch commit (push_files 2 files) + 2 read-back verification reads + 6 residual-sweep reads (other cc-0017e files) + 1 per-session detail commit (create_or_update_file) + 1 failed atomic push_files attempt (timed out) + 2 retry commits (create_or_update_file × 2 for sync_state + action_list). No production mutations. No D-01 cycle.

**Empirical findings v2.89:** none beyond v2.88 carry. v2.89 is a documentation correction of v2.88 authoring residue.

---

## 🟢 cc-0017e Wave 0e — STATUS BLOCK (UPDATED v2.89)

**Status: 📝 AUTHORED-PENDING-APPLY (v2.88) + v1.1 doc patch CLOSED (v2.89). Apply unblocked; gated on PK directive only.**

**Brief commits (4 in chain):**
- Commit 1 `8502fc49a0d981e95f8fed6bd7c3ece438fc669c` (v2.88) — main brief via `create_or_update_file`
- Commit 2 `1659b293da007ced41a6d0b08def1061dd38a414` (v2.88) — 4 substantive sub-files via atomic `push_files`
- Commit 3 `d349bdfecc1629dbaeca0d5cea579e69d9d03461` (v2.88) — 3 process sub-files via atomic `push_files`
- **Commit 4 `587ee4ac894a50708611cf9a053253083ae39e2b` (v2.89) — v1.1 doc patch: 2 sub-files (preflight-pset.md + d01-postapply-deferred.md) via atomic `push_files`**

**Current SHAs (post-v1.1 doc patch):**
- Main brief `cc-0017e-friction-case-history-and-compat.md`: `a50e26e6` (unchanged from v2.88)
- `cc-0017e/migration-sql.md`: `d1946d7a` (unchanged from v2.88)
- `cc-0017e/vchecks.md`: `eef59ec5` (unchanged from v2.88) — V-Z3 convention codified §X
- `cc-0017e/risks-and-grants.md`: `b52f1d8b` (unchanged from v2.88)
- **`cc-0017e/preflight-pset.md`: `22d55528` (UPDATED v2.89 from `268f973b`)**
- `cc-0017e/hardstop-rollback.md`: `1e3ddd07` (unchanged from v2.88)
- **`cc-0017e/d01-postapply-deferred.md`: `43ee1971` (UPDATED v2.89 from `237ae898`)**
- `cc-0017e/lessons-metadata-changelog.md`: `e5ffac0f` (unchanged from v2.88; §3.2 inventory table still references pre-patch preflight-pset.md SHA `268f973b`/7996 B — acceptable v1.0 authoring artefact per PK strict scope)

**Scope (PK directive locked v2.88, unchanged v2.89):**
- IN: A (case_history shadow) + C (fn_triage_case compat) + D (8-row backfill) + H (V-Z3 convention) + A-extended (5-function patch)
- OUT/DEFER: B / E / F / G — future Wave 0f or other wave candidates

**Resolved anomalies v2.89:**
- `preflight-pset.md` §P3.2 m.chatgpt_review column references corrected (review_id→id, proposal_text→proposal)
- `d01-postapply-deferred.md` §3 idempotency check + §4 4× close-the-loop UPDATE templates corrected (review_id→id, proposal_text→proposal)
- D-01 idempotency check SQL now valid against actual m.chatgpt_review schema
- Close-the-loop UPDATE templates now valid against actual m.chatgpt_review schema

**Lesson candidates v2.88 (4 carry; none re-exercised v2.89):**
- L-v2.88-a: HINT-string substring-match false positives in `pg_proc.prosrc` caller probes
- L-v2.88-b: V-Z3 shadow-table operation alignment convention
- L-v2.88-c: Probe re-verification gate at apply time
- L-v2.88-d: In-function INSERT pattern preferred over trigger-based for shadow tables in locked-down schemas

**Lesson candidates v2.89 (1 NEW):**
- **L-v2.89-a:** push_files atomic timeout — when the combined payload of a 2-file atomic push_files times out, the established 1+2 split (per L-v2.85-e) is INSUFFICIENT mitigation; 1+1+1 split via individual `create_or_update_file` calls is the next defensive pattern. Atomicity of sync_state+action_list traded for delivery reliability per the same L-v2.85-e rationale.

**Apply prerequisites (all met at v2.89):**
- cc-0017d Wave 0d CLOSED-APPLIED-WITH-VCHECK-CORRECTION (v2.86) ✅
- cc-0017d v1.1 doc patch CLOSED (v2.87 at `f0367405`) ✅
- cc-0017c lockdown applied (v2.85) ✅
- friction schema event_source_fk in place ✅
- service_role REVOKE on event+case in place ✅
- cc-0017e v1.0 brief AUTHORED (v2.88 at commit chain) ✅
- **cc-0017e v1.1 doc patch CLOSED (v2.89 at `587ee4ac`)** ✅

**Apply gating v2.89+:**
- v1.1 doc patch ✅ LANDED v2.89 (no longer blocking)
- PK directive to proceed to apply session — ONLY REMAINING GATE

---

## 🟢 cc-0017d / cc-0017c / cc-0017b / cc-0017a / cc-0014 / cc-0015 / cc-0016 / cc-0012 / cc-0010A/B/C / cc-0011 / cc-0009 — STATUS BLOCKS

**v2.89 updates:** None. All carry from v2.88.
- cc-0017d: APPLIED v2.86 + v1.1 doc patch CLOSED v2.87. Unchanged v2.89.
- cc-0015 friction-pool-view (Wave 7): Wave 0d gate cleared v2.86; still gated on 1-week observation window closing 2026-05-26.
- cc-0016 friction-capture-evidence (Wave 8): Wave 0d gate cleared v2.86; still gated on Wave 7 sequencing.
- All others unchanged from v2.85/v2.86/v2.87/v2.88.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v2.89)

**L40 not exercised v2.89** (no DML against m.chatgpt_review; v1.1 doc patch corrects brief text only).
**L41 not exercised v2.89** for non-friction schemas. Cumulative v2.80-v2.89 = 6 unchanged.
**L46 not exercised v2.89** (no fresh D-01).
**L58 applied 1× v2.89** — extended split close per L-v2.85-e mitigation (per-session detail standalone `dca2a6e4` + sync_state alone `0c45eee8` + action_list alone this commit). 1+1+1 instead of 1+2 due to atomic push_files timeout on first attempt.
**L62 not exercised v2.89** (no D-01 cycle).
**L-v2.78-a, L-v2.81-a**: 2 occurrences each, promotion-eligible (unchanged).
**L-v2.83-a**: **8+ occurrences v2.89** (re-applied at the v2.89 patch commit — push_files response file-count = 2 matched expected). Cumulative STRONG candidate confirmed.
**L-v2.84-a/b/c/d**: not re-exercised v2.89. L-v2.84-d unchanged at 2 occurrences.
**L-v2.85-a HIGH-SIGNAL**: not re-exercised v2.89 (no fresh function-signature probe; doc patch only). Cumulative 3 unchanged.
**L-v2.85-b**: not re-exercised v2.89.
**L-v2.85-c**: not re-exercised v2.89.
**L-v2.85-d**: REALIZED v2.86. Unchanged.
**L-v2.85-e**: **re-applied v2.89 — 4th consecutive occurrence** (v2.86 + v2.87 + v2.88 + v2.89). Extended to 1+1+1 split close due to atomic push_files timeout recovery. **PROMOTION-CONFIRMED v2.88 carries forward.**
**L-v2.86-a HIGH-SIGNAL candidate**: documented in cc-0017d v1.1 + cc-0017e v1.0 briefs. Not re-exercised v2.89.
**L-v2.86-b candidate**: applied throughout cc-0017e v1.0 patches. Not re-exercised v2.89.
**L-v2.86-c candidate**: applied throughout cc-0017e v1.0 patches. Not re-exercised v2.89.
**L-v2.86-d candidate**: documented in cc-0017e risks-and-grants R2. Not re-exercised v2.89.
**L-v2.86-e candidate**: applied throughout cc-0017e vchecks.md slash-prefix. Not re-exercised v2.89.
**L-v2.88-a/b/c/d candidates**: documented in cc-0017e v1.0 lessons-metadata-changelog.md. Not re-exercised v2.89 (no apply work). Watching for cc-0017e apply session.
**L-v2.89-a candidate (NEW v2.89)**: push_files atomic timeout fallback to 1+1+1 via individual `create_or_update_file` calls. 1 occurrence v2.89 (this sync close). Watching for re-exercise.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated. Day 1 of 7 unchanged v2.89 (same calendar day as v2.86/v2.87/v2.88 closes; no elapsed observation time).
- **First cc-0017d-post-apply cron 85 fire** pending.
- No new v2.89 calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v2.89: 0 D-01 fires. T-MCP-02 cum **~85 unchanged** from v2.88 (no MCP probes consumed; no ask_chatgpt_review called). L46 Evidence Gate not exercised v2.89. L62 not exercised v2.89. State-capture exceptions v2.89: 0 (cum 1). Close-the-loop UPDATEs v2.89: 0. **22 outstanding** unchanged.

---

## 🤖 Cowork automation (D182)

Unchanged from v2.85/v2.86/v2.87/v2.88. Cron 82/83/86 firing normally. V-C3 PENDING.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0017e apply session** | Full P-set + D-01 fire + apply_migration + V-check matrix + close-the-loop | **P1 v2.89, rank 1 (PROMOTED from rank 2 v2.88)** | OPEN. v1.1 doc patch landed v2.89 at `587ee4ac`; only remaining gate is PK directive. | chat → PK | When PK directs. |
| **Reconciliation daily diagnostic** | First post-cc-0017d cron 85 fire | **P1 carry, rank 2** | OPEN. | chat → PK | Post-fire SQL + emit_event check. |
| **Health_check V-C3 diagnostic** | Cowork pipe | **P1 carry, rank 3** | OPEN. V-C3 PENDING. | Cowork → chat | Check post-fire health doc. |
| **Platform Reconciliation View brief** | Reconciliation surface design | **P2 carry, rank 4** | NOT YET STARTED. | PK → chat | When PK directs. |
| **Music library activation** | video-worker v3.0.0 env-var gated | P2 carry | PENDING PK. | PK + chat | Bucket + tracks + env + smoke. |
| **vchecks.md V-B4 doc patch** | Correct V-B4 to 12-param signature (L-v2.85-a follow-up) | P3 carry | Doc-only. May fold into cc-0017c v1.2. | chat → PK | PK decides scope. |
| **cc-0017c v1.2 doc patch candidate** | Date correction + 3 D-01 references + V-B4 signature correction | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **cc-0015 friction-pool-view brief** (Wave 7) | Authored PENDING_EXECUTION | P2 (Wave 7; Wave 0d gate cleared v2.86; still gated on 1-week window) | DRAFTED commit `9a5dc155`. | chat → PK (Wave 7) | When window closes 2026-05-26. |
| **cc-0016 friction-capture-evidence brief** (Wave 8) | Authored PENDING_EXECUTION | P2 (Wave 8; Wave 0d gate cleared v2.86; still gated on Wave 7) | DRAFTED commit `f35f8ea4`. | chat → PK (Wave 8) | After Wave 7. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | P2 carry | OBSERVED. | chat → PK | Verify + dry-run + re-enable. |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P2 carry | LOGGED. | chat → PK | Audit m.post_draft. |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 carry | OPEN. | PK | When PK directs. |
| **Close-the-loop batch sweep — 22 escalated** | 21 historical CCH + 1 T-MCP-05 meta | P2 carry | Gated on PK directive. | chat → future PK | Hold. |
| **L-v2.78-a baseline promotion** | Reviewer convergence | P3 carry | 2 occurrences, eligible. | chat → next lesson cycle | Promote alongside L-v2.81-a. |
| **L47 baseline promotion** | list_recent_commits before retry | P3 carry | 1 occurrence. | chat → next session | Consider co-promotion with L-v2.85-e. |
| **L-v2.81-a baseline promotion** | Parallel-session coordination | P3 carry | 2 occurrences, eligible. | chat → next lesson cycle | Promote. |
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (8+ occurrences v2.89; STRONG CANDIDATE)** | Re-applied at v2.89 patch commit. | chat → next lesson cycle | Promote. |
| **L-v2.84-a/b/c candidates** | Empirical precedence / idempotent REVOKE/GRANT / Path A corrected_action | P3 carry | 1 occurrence each. | chat → next session | Watcher. |
| **L-v2.84-d candidate** | Schema-probe-before-DML | P3 carry (2 occurrences unchanged v2.89) | Not re-exercised v2.89. | chat → next session | Promotion-eligible. |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | P3 (3 occurrences; promotion-eligible) | Not re-exercised v2.89. | chat → next session | Promotion-eligible. |
| **L-v2.85-b** | Inline V-check rewrite Path 1 / Path B-prime | P3 (2 occurrences) | Not re-exercised v2.89. | chat → next session | Watcher. |
| **L-v2.85-c** | SECURITY DEFINER bypass post REVOKE | P3 (1 occurrence) | Not re-exercised v2.89. | chat → next session | Watcher. |
| **L-v2.85-d** | Postgres-owner cleanup migration | P3 (REALIZED v2.86) | Unchanged. | chat → next session | Resolved; archive after one more exercise. |
| **L-v2.85-e** | push_files length budget — split-commit mitigation | **P3 (PROMOTION-CONFIRMED v2.88; 4th consecutive occurrence v2.89; extended to 1+1+1 split)** | Extended split close worked through atomic push_files timeout. | chat → next lesson cycle | **PROMOTE.** |
| **L-v2.86-a candidate (HIGH-SIGNAL)** | Pre-apply syntactic validation via transactional EXEC | P3 (1 occurrence; documented in cc-0017d v1.1 + cc-0017e v1.0 briefs) | Not re-exercised v2.89. | chat → next session | Watcher; recommendation for future brief P-sets. |
| **L-v2.86-b/c/d/e candidates** | out_-prefix / ROWTYPE quoting / CHECK pre-validation / slash-prefix fixture convention | P3 (1 occurrence each; applied in cc-0017e v1.0 brief) | Not re-exercised v2.89. | chat → next session | Cross-brief carry. |
| **L-v2.88-a/b/c/d candidates** | HINT-string false positives / V-Z3 alignment / probe re-verification gate / in-function INSERT pattern | P3 (1 occurrence each; documented in cc-0017e v1.0 lessons-metadata-changelog.md) | Not re-exercised v2.89 (no apply work). | chat → cc-0017e apply session | Watcher; first apply-time exercise at cc-0017e apply. |
| **L-v2.89-a candidate (NEW v2.89)** | push_files atomic timeout → 1+1+1 fallback via individual create_or_update_file | **P3 (1 occurrence v2.89; this sync close)** | Captured in v2.89 ADDITIONS block and Process Upgrades. | chat → next session | Watcher. Pairs naturally with L-v2.85-e at promotion time. |
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
| **Parallel agent coordination (L47)** | informational | P3 carry | No interference v2.89. | chat → future | Passive. |
| **Other carries** | Dashboard mobile / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged from v2.86/v2.87/v2.88. | various | various |

**Closed v2.89:**
- cc-0017e v1.1 doc patch (rank 1 P1 v2.88) → **CLOSED** ✅ at commit `587ee4ac`. 2-file atomic push_files. Read-back verified. Residual sweep clean. Gate 13.b CLOSED.

**Closed earlier:** v2.88 Wave 0e brief authoring (rank 1 P1 v2.87) → CLOSED-AUTHORED at commit chain `8502fc49 → 1659b293 → d349bdfe`; v2.87 cc-0017d v1.1 doc patch (`f0367405`); v2.86 cc-0017d apply + fresh D-01 + V-F1 cleanup + Plan gate 12; v2.85 cc-0017c apply + fresh D-01 + V-B4 PK Path 1 + V-B4 smoke cleanup + Plan gate 10; v2.84 brief authoring + 2× D-01; v2.83 cc-0017b v1.1 doc patch; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.80 cc-0017a authoring; v2.79 PK approval gate.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v2.88.

---

## 📌 Backlog

**v2.89 state changes:**
- cc-0017e v1.1 doc patch (P1 rank 1 v2.88) → **CLOSED v2.89** at commit `587ee4ac` (2 files patched + read-back verified + residual sweep clean across 6 other cc-0017e files).
- **cc-0017e apply session** PROMOTED from P1 rank 2 v2.88 → **P1 rank 1 v2.89**. Apply path unblocked; only PK directive remaining.
- Friction Register Consolidation Plan: Gate 13.b sub-gate CLOSED v2.89; Gate 13.c (apply) remains OPEN.
- T-MCP-02 cum ~85 unchanged from v2.88 (no MCP probes consumed v2.89).
- State-capture exceptions cum 1 unchanged.
- friction.* schema state unchanged from v2.88 (no production mutations v2.89).
- **NEW L-v2.89-a candidate**: push_files atomic timeout → 1+1+1 fallback. Documented in v2.89 ADDITIONS + Process Upgrades + Active table.
- L-v2.85-e mitigation re-applied 4th consecutive occurrence (v2.86 + v2.87 + v2.88 + v2.89); extended to 1+1+1 split due to atomic push_files timeout. **Promotion-confirmed v2.88 carries forward.**
- L-v2.83-a re-applied at patch commit (push_files response file-count = 2 matched expected). Cumulative 8+ STRONG candidate confirmed.
- 1+1+1 split commit close (per-session detail standalone `dca2a6e4` + sync_state alone `0c45eee8` + action_list alone this commit) instead of original 1+2 due to atomic push_files timeout on first attempt.
- Dashboard PHASES 42nd deferral carried (was 41 at v2.88; +1 at v2.89 = 42). No file-touch.
- **No decisions.md change.**

---

## 🧊 Frozen / Deferred

Unchanged from v2.85/v2.86/v2.87/v2.88.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e + L-v2.88-a-d + **L-v2.89-a (NEW)** candidates carried per v2.89.

- **L40 not exercised v2.89**.
- **L41 not exercised v2.89**.
- **L46 not exercised v2.89**.
- **L52-L65** various: not re-exercised v2.89.
- **L58 baseline**: 1× v2.89 (1+1+1 split close per L-v2.85-e mitigation — extended due to atomic push_files timeout).
- **L62 baseline-eligible**: not exercised v2.89.
- **L-v2.76-a-f**: not re-exercised v2.89.
- **L-v2.78-a**: 2 occurrences (unchanged).
- **L47**: 1 occurrence (unchanged).
- **L-v2.81-a**: 2 occurrences (unchanged).
- **L-v2.83-a**: **8+ occurrences v2.89** (re-applied at v2.89 patch commit; STRONG CANDIDATE confirmed).
- **L-v2.84-a/b/c**: 1 occurrence each (unchanged).
- **L-v2.84-d**: 2 occurrences (unchanged v2.89).
- **L-v2.85-a HIGH-SIGNAL**: 3 occurrences (unchanged v2.89; promotion-eligible).
- **L-v2.85-b**: 2 occurrences (unchanged v2.89).
- **L-v2.85-c**: 1 occurrence (unchanged v2.89).
- **L-v2.85-d**: REALIZED v2.86 (unchanged v2.89).
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88 carries forward v2.89; 4th consecutive occurrence** (extended to 1+1+1 split this session). Ready to promote at next lesson cycle.
- **L-v2.86-a (HIGH-SIGNAL)**: 1 occurrence (unchanged v2.89).
- **L-v2.86-b/c/d/e**: 1 occurrence each (unchanged v2.89).
- **L-v2.88-a/b/c/d**: 1 occurrence each (unchanged v2.89; carry to apply session).
- **L-v2.89-a (NEW)**: 1 occurrence v2.89 — push_files atomic timeout → 1+1+1 fallback via individual create_or_update_file calls.

All candidates recommended for promotion at appropriate cycle once empirical evidence accumulates. **L-v2.85-e is the highest-priority promotion at next lesson cycle; L-v2.89-a pairs with it naturally.**

---

## v2.89 honest limitations

- All v2.31–v2.88 limitations apply.
- **Doc-only patch session.** No production schema change, no migration applied, no V-check run, no fresh empirical evidence beyond the v2.88 column-name verification probe carried forward. Schema state end of v2.89 = schema state end of v2.88 = end of v2.86.
- **`friction.case_history` does NOT yet exist in production.** Authored design only.
- **8 acknowledged legacy cases remain with NULL triaged_at/triaged_by.** Backfill scoped but not executed.
- **cc-0017e apply session still requires PK directive + fresh P-set + D-01 fire + V-check matrix execution.**
- **`lessons-metadata-changelog.md` §3.2 holds stale pre-patch SHA/size entry** for preflight-pset.md (`268f973b`/7996 B) — acceptable v1.0 authoring artefact per PK strict 2-file scope; not corrected in this session.
- **22 outstanding close-the-loop UPDATEs** unchanged.
- **Memory cap 19/30** unchanged.
- **Action_list size at v2.89**: ~36KB (compacted from v2.88 ~41KB; trimmed historical noise; v2.89 ADDITIONS replaces v2.88 ADDITIONS).
- **Per-session files v2.89**: 1 — `2026-05-19-cc0017e-v1.1-doc-patch.md` (commit `dca2a6e4`, 9,126 B).
- **Doc-sync v2.89**: 1+1+1 split commit (per-session standalone + sync_state alone + action_list alone) instead of original L-v2.85-e 1+2 (per-session + sync_state+action_list atomic) due to atomic push_files timeout on first attempt. **L-v2.85-e PROMOTION-CONFIRMED carries forward; NEW L-v2.89-a candidate captures the 1+1+1 fallback pattern.**
- **Close-the-loop UPDATEs v2.89: 0**. 22 outstanding unchanged.
- **State-capture exceptions v2.89: 0**. Cumulative: 1.
- **Production mutations v2.89: 0**.
- **Dashboard PHASES 42nd deferral** carried (was 41 at v2.88; +1 at v2.89). No file-touch v2.89.
- **No decisions.md change.** Doc-patch close; no new architectural decisions.
- **No Wave 0f work started v2.89** per PK explicit instruction.
- **No mid-session compaction event v2.89.**
- **Atomicity loss at v2.89 sync close:** sync_state and action_list updated as separate commits instead of atomic push_files (timeout recovery). Brief window during which sync_state was v2.89 but action_list was still v2.88 — minimised to the time between consecutive `create_or_update_file` calls. Acceptable per L-v2.85-e extended rationale; L-v2.89-a candidate captures the pattern for future re-exercise.

---

## Changelog

- v1.0–v2.87: per commit history.
- v2.88 (2026-05-19 Sydney evening, cc-0017e Wave 0e v1.0 brief AUTHORED-PENDING-APPLY): brief authored at commit chain `8502fc49 → 1659b293 → d349bdfe`; 8 files; PK scope locked A/C/D/H/A-extended IN, B/E/F/G OUT/DEFER; 8 read-only probes; 0 production mutations / 0 D-01 fires; open anomaly surfaced at sync close (m.chatgpt_review column-name discrepancy in 2 sub-files); 4 NEW L-v2.88-a/b/c/d candidates; L-v2.85-e re-applied 3rd consecutive occurrence — promotion-confirmed.
- **v2.89 (2026-05-19 Sydney evening, cc-0017e v1.1 doc patch CLOSED):**
  - Build arc: session resumed v2.88 state → read sync_state + action_list + 2 target sub-files → identified 6× review_id + 2× proposal_text substitutions across preflight-pset.md §P3.2 + d01-postapply-deferred.md §3+§4 → 2-file atomic push_files commit `587ee4ac` → read-back verified byte-deltas exact match (preflight-pset −12 B; d01-postapply-deferred −40 B) → residual sweep across other 6 cc-0017e files = 0 occurrences anywhere → per-session detail standalone commit `dca2a6e4` → first sync close attempt (atomic push_files sync_state + action_list) **TIMED OUT** → retry sync close as 1+1+1: sync_state alone commit `0c45eee8` + action_list alone this commit.
  - cc-0017e v1.1 doc patch CLOSED at commit `587ee4ac894a50708611cf9a053253083ae39e2b`. Apply path unblocked.
  - PK scope strictly 2 files (preflight-pset.md §P3.2 + d01-postapply-deferred.md §3-4) per PK directive. Optional 3rd file (lessons-metadata-changelog.md inventory update) explicitly out of scope.
  - cc-0017e v1.1 doc patch (rank 1 P1 v2.88) → **CLOSED v2.89**.
  - cc-0017e apply session (rank 2 P1 v2.88) → **PROMOTED rank 1 P1 v2.89**. Only remaining gate: PK directive.
  - Gate 13.b sub-gate CLOSED v2.89.
  - No production mutations. No apply_migration. No D-01 fires. No Wave 0f scope creep. No decisions.md edits. No memory edits.
  - T-MCP-02 cum ~85 unchanged. State-capture exceptions cumulative 1 unchanged.
  - **NEW L-v2.89-a candidate** documented: push_files atomic timeout → 1+1+1 fallback via individual create_or_update_file calls. Pairs naturally with L-v2.85-e at promotion time.
  - L-v2.85-e re-applied **4th consecutive occurrence** — promotion-confirmed v2.88 carries forward; extended to 1+1+1 split this session.
  - L-v2.83-a re-applied at the v2.89 patch commit (push_files response file-count = 2 matched expected). Cumulative 8+ STRONG confirmed.
  - Active rows updated: cc-0017e v1.1 doc patch row CLOSED; cc-0017e apply session promoted to rank 1; NEW L-v2.89-a watcher row added.
  - STATUS BLOCKS updated: cc-0017e STATUS BLOCK updated with 4th commit + v1.1 doc patch resolution; Friction Plan STATUS BLOCK Gate 13.b CLOSED.
  - Closure budget: ~1h v2.89. Trailing-14-day ~26h.
  - Doc-sync: 1+1+1 split commit (per-session detail standalone + sync_state alone + action_list alone) instead of original L-v2.85-e 1+2 due to atomic push_files timeout on first attempt. **L-v2.85-e PROMOTION-CONFIRMED carries forward.**
  - Production mutations: 0.
  - No decisions.md change.
  - No mid-session compaction event.
  - No identical-PK-directive loop pattern v2.89 (single directive received clean).
  - Atomicity loss minimised: brief window during which sync_state was v2.89 but action_list was still v2.88 between consecutive create_or_update_file calls.
