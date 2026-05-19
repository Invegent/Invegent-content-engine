# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-19 Sydney evening (**v2.87 — cc-0017d v1.1 doc-only patch CLOSED at commit `f0367405c04dd21e4e08bc4c8beebd4d77635229`. Exactly 4 files patched and read-back verified: main brief v1.0→v1.1 (`04b1edf1`); `migration-sql.md` v1.1 Addendum at top with Substitution classes 1+2 + Path B-prime + L-v2.86-a pre-apply discipline, v1.0 SQL preserved as authored (`2a8e0287`); `vchecks.md` v1.1 Addendum at end with Drifts 1+2+3 + corrected V-F1 matrix + recommended V-Z3 (`15b924fe`); `lessons-metadata-changelog.md` lessons reconciled to authoritative v2.86 a–e set (`ec292723`). No production mutations. No D-01 fire. No Wave 0e work started. cc-0017d v1.1 source-of-truth now matches v2.86 production apply / V-check reality. Wave 0e brief authoring promoted rank 2 P2 → rank 1 P1; next task. T-MCP-02 cum ~85 unchanged. State-capture exceptions cumulative 1 unchanged. Dashboard PHASES 40th deferral carried. No new lesson exercises (L-v2.85-e re-applied, 2nd consecutive occurrence). Per-session detail at `2026-05-19-cc0017d-v1.1-doc-patch.md` (commit `786fb9be`). Sync close via 1+2 split per L-v2.85-e mitigation.**) **Today/Next 5**: Wave 0e brief authoring → rank 1 (PROMOTED P1); reconciliation daily diagnostic → rank 2; health_check V-C3 → rank 3; Platform Reconciliation View → rank 4; Dashboard PHASES sync → rank 5.

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v2.86.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46-v2.58 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a (STRONG; 7+) + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL applied) + L-v2.85-b/c/d/e carried (L-v2.85-e re-applied 2nd consecutive v2.87). **D-IOL-001 (v2.77)** carried. **D-CC-0017B-Q1** carried. **5 L-v2.86 candidates** (a HIGH-SIGNAL, b, c, d, e) — all live in cc-0017d v1.1 brief on `main` post v2.87.

**v2.87 ADDITIONS:**

- **cc-0017d v1.1 doc-only patch CLOSED** at commit `f0367405c04dd21e4e08bc4c8beebd4d77635229`. Exactly 4 files patched + read-back verified (blob SHAs match push_files response byte-for-byte). The v1.1 doc patch had landed in the prior turn before compaction; v2.87 session executed the close only (verification + sync close), no redundant commit issued.
- **4-file scope at commit `f0367405`:**
  - `docs/briefs/cc-0017d-friction-case-mutation-functions.md` (`04b1edf1`) — header v1.0→v1.1; status `CLOSED-APPLIED-WITH-VCHECK-CORRECTION`; v1.1 patch summary block; structure table v1.1 notes; `purge_test_case` + `Loose resolve_case` annotations.
  - `docs/briefs/cc-0017d/migration-sql.md` (`2a8e0287`) — v1.1 Addendum at top: Substitution class 1 (24× RAISE EXCEPTION `%%`→`%`) + class 2 (6× `friction.case%ROWTYPE` → `friction.\"case\"%ROWTYPE`) + Path B-prime sequence + L-v2.86-a HIGH-SIGNAL pre-apply discipline (transactional EXEC with marker `PERFORM` block). v1.0 SQL preserved verbatim below addendum for historical-record auditability. Function 4 + 6 COMMENT updates; mark_duplicate v1.1 inline note re internal-prefix audit namespace.
  - `docs/briefs/cc-0017d/vchecks.md` (`15b924fe`) — v1.1 Addendum at end: Drift 1 (V-D-setup direct-INSERT fallback; emission_rule CHECK rejects manual-source test-prefix payloads) + Drift 2 (mark_duplicate writes audit under internal prefix `cc-0017d/mark_duplicate/…`; intentionally outside test-prefix regex) + Drift 3 (corrective cleanup v1 zero-effect due to hyphen-prefix fixture-naming drift; cleanup v2 PK-approved adjusted pattern removed exactly 1 row). Fixture-naming slash-prefix convention reaffirmed. Corrected V-F1 expected matrix. Recommended V-Z3 cross-check.
  - `docs/briefs/cc-0017d/lessons-metadata-changelog.md` (`ec292723`) — lesson numbering reconciled to authoritative v2.86 a–e set per sync_state. v1.0 draft "legacy/new coexistence" candidate retired/not-promoted. Metadata table v1.1 + CLOSED-APPLIED-WITH-VCHECK-CORRECTION + status timeline + v1.0 apply migrations list (5: main + fixture seed + cleanup v1 + cleanup v2 + chatgpt_review close) + D-01 review_id `206d2258-…` + v1.1 changelog entry.
- **Out of scope at v1.1** (unchanged from v1.0): `risks-and-grants.md`, `preflight-pset.md`, `hardstop-rollback.md`, `d01-postapply-deferred.md`. Latter is historical record (D-01 fired+resolved v2.86).
- **Read-back verification this session:** 4× GET against `main` confirmed all blob SHAs match push_files response byte-for-byte; spot-checks confirmed v1.1 content present in each file (header bumps, addenda, lesson reconciliation, metadata updates).
- **Sync close mechanics:** L-v2.85-e split-commit mitigation re-applied (2nd consecutive occurrence v2.86 + v2.87). Per-session detail `docs/runtime/sessions/2026-05-19-cc0017d-v1.1-doc-patch.md` landed standalone at commit `786fb9be`. This sync_state + action_list update lands as atomic 2-file push_files immediately after.
- **Wave 0e — case history / audit brief authoring** PROMOTED from rank 2 P2 v2.86 → **rank 1 P1 v2.87**. Next task. Opens after this sync close verifies cleanly. Likely sub-files following cc-0017a/b/c/d multi-file precedent.
- **Production mutations v2.87: 0.** Schema state end of v2.87 = schema state end of v2.86.
- **D-01 fires v2.87: 0.** Doc-only patch + sync close — no production action.
- **T-MCP-02 cum v2.87: ~85 unchanged** (read-only GETs against `main` do not consume the budget).
- **State-capture exceptions v2.87: 0.** Cumulative: 1 unchanged.
- **L-series v2.87:** L40 not exercised; L41 not exercised; L46 not exercised; L58 applied 1× (1+2 split close per L-v2.85-e); L62 not exercised. **L-v2.85-e re-applied 2nd consecutive occurrence** (v2.86 + v2.87); promotion-eligible after one more cycle. No new L-v2.87 candidates surfaced.
- **Closed Active rows v2.87:** cc-0017d v1.1 doc patch (P1 rank 1 NEW v2.86) → **CLOSED** ✅.
- **Promoted Active rows v2.87:** Wave 0e brief authoring (P2 rank 2 v2.86 → P1 rank 1 v2.87).
- **Dashboard PHASES sync: 40th consecutive deferral** (was 39 at v2.86; +1 at v2.87). No file-touch v2.87.
- **NO decisions.md change.** Doc-patch close; no new architectural decisions, no scope amendments.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~3 (Wave 0e auth pending + recon daily diagnostic + health_check signal diagnostic) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~23.5h (v2.83 1h + v2.84 ~2h + v2.85 ~3h + v2.86 ~3.5h + v2.87 ~0.5h) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.87 cycle: ~0.5h total.** 0 schema mutations. 0 D-01 fires. 4× read-only GET (verification) + 1 single-file create_or_update_file (per-session detail) + 1 atomic 2-file push_files (sync_state + action_list). **State-capture exception count v2.87: 0** (cumulative 1).

---

## ⭐ Today / Next 5

> Last rebuilt: 2026-05-19 Sydney evening (v2.87).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Wave 0e — case history / audit brief authoring** | **P1 (PROMOTED rank 2 P2 v2.86 → rank 1 P1 v2.87)** | cc-0017d v1.1 doc patch closed v2.87 → Wave 0e is the next active item per PK directive. | chat → PK | PK scope confirmation; brief authoring sub-files following cc-0017a/b/c/d precedent. Audit-trail and event-replay design. |
| 2 | **Reconciliation daily cadence diagnostic** | **P1 (rank 2 v2.87)** | First post-cc-0017d cron 85 fire pending. Confirms Wave 0d functions co-exist with cc-0017b wrappers + cc-0017c FK-hardened state. | chat → PK | Post-fire SQL count + emit_event signature check. |
| 3 | **Health_check V-C3 + signal-production diagnostic** | **P1 (rank 3 v2.87)** | V-C3 still PENDING. Cowork brief v3.0 ready. | Cowork → chat | Check post-fire `docs/audit/health/YYYY-MM-DD.md`. |
| 4 | **Platform Reconciliation View brief authoring** | **P2 (rank 4 v2.87)** | Reconciliation surface design. PK greenlight required. | PK → chat | When PK directs. |
| 5 | **Dashboard PHASES sync** | **P2 (rank 5 v2.87)** | 40th consecutive deferral. Discipline call overdue. | chat → PK | Update roadmap page at next dashboard session. |

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Passive observation v2.87**: Cron 82-86 unchanged. PRV v1 operator views queryable. friction.* state: 9 tables, 18 functions (12 from cc-0017a/b/c + 6 from cc-0017d), event_source_check → event_source_fk, service_role SELECT-only on event+case, 6 mediated mutation functions, 29 events + 29 cases (unchanged from v2.86 baseline). PostgREST exposes `friction`. Next fires: cron 85 daily; cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (UPDATED v2.87)

**Status v2.87: ✅ Wave 0 + Wave 0d COMPLETE. Brief v1.1 doc patch CLOSED. Gates 10+12 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE. Gate 13 (Wave 0e) OPEN — next.**

**Documents:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`) — unchanged
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` SIGNED — unchanged
- `docs/briefs/cc-0017a-friction-register-foundational-schema.md` v1.1 — APPLIED v2.81
- `docs/briefs/cc-0017b-friction-register-unified-emit-event.md` v1.1 — APPLIED v2.82
- `docs/briefs/cc-0017c-friction-register-lockdown-and-backfill.md` v1.1 — APPLIED v2.85
- `docs/briefs/cc-0017d-friction-case-mutation-functions.md` **v1.1** — **APPLIED v2.86 + v1.1 doc patch CLOSED v2.87** (commit `f0367405`); source-of-truth now matches production apply / V-check reality
- **Migrations live v2.87**: unchanged from v2.86 — `cc_0017d_friction_case_mutation_functions` + `cc_0017d_vcheck_fixture_seed` + `cc_0017d_vcheck_audit_cleanup` (zero-effect) + `cc_0017d_vcheck_audit_cleanup_v2` (1 row) + `cc_0017d_chatgpt_review_close`
- Per-session files: v2.79–v2.86 unchanged; **v2.87 at `2026-05-19-cc0017d-v1.1-doc-patch.md` (commit `786fb9be`)**

**Open gates v2.87:**
1-9. ✅ PK approval + cc-0017a/b/c brief authoring + D-01 cycles + cc-0017c v1.0+v1.1 D-01 fires
10. ✅ cc-0017c apply (CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.85)
11. ⏳ **1-week empirical observation window** ACTIVE 2026-05-19 → 2026-05-26 (Day 1 of 7 unchanged v2.87; same calendar day)
12. ✅ **cc-0017d Wave 0d apply** (CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.86) — **v1.1 doc patch CLOSED v2.87**
13. ⏳ **Wave 0e — case history / audit** (P1 PROMOTED v2.87, NOT yet started)

**v2.87 provenance:** Read-only verification (4× GET) + 1 standalone per-session create + 1 atomic 2-file push_files. No production mutations. No D-01 cycle. No parallel-agent contributions observed.

**Empirical findings v2.87:** None (doc-only). v2.86 empirical findings carried verbatim:
- 6 SECURITY DEFINER mutation functions can co-exist with cc-0017c-lockdown service_role REVOKE without conflict.
- `friction.purge_test_case(text)` operates as service_role-only postgres-owner helper (realization of L-v2.85-d candidate).
- Reserved SQL keywords (`case`) require quoting in `%ROWTYPE` type-names even when permissive in DML grammar.
- RAISE EXCEPTION format strings use single `%` placeholder, distinct from PL/pgSQL `%%` escape in `format()` calls.
- Cross-fingerprint mark_duplicate writes audit to `friction.emit_error` with internal-prefix `cc-0017d/mark_duplicate/` namespace.

---

## 🟢 cc-0017d Wave 0d — STATUS BLOCK (UPDATED v2.87)

**Status: ✅ CLOSED-APPLIED-WITH-VCHECK-CORRECTION (v2.86). Brief v1.1 doc patch CLOSED v2.87.**

**Migrations live (unchanged v2.87):** `cc_0017d_friction_case_mutation_functions` (main) + `cc_0017d_vcheck_fixture_seed` (V-D-setup) + `cc_0017d_vcheck_audit_cleanup` (PK-specified pattern v1, zero-effect) + `cc_0017d_vcheck_audit_cleanup_v2` (PK-approved adjusted pattern, 1 row removed) + `cc_0017d_chatgpt_review_close`.

**Brief commits:** v1.0 multi-file (8 commits between `25797f7c` and `8a5c6b6b`); **v1.1 doc patch CLOSED v2.87** at single atomic commit `f0367405c04dd21e4e08bc4c8beebd4d77635229` covering 4 files (main brief + migration-sql.md + vchecks.md + lessons-metadata-changelog.md).

**D-01 cycle:** Fresh `206d2258-...`: AGREE (procedural escalate only) → resolved v2.86 via close-the-loop UPDATE. Unchanged v2.87.

**V-check final matrix (unchanged v2.87, now fully documented in v1.1 brief):**
| Check | Status |
|---|---|
| V-A1 | ✅ PASS — signatures byte-match brief §3 (L-v2.85-a proactive) |
| V-B1 | ✅ PASS — security attributes |
| V-C1 | ✅ PASS — 17 grant rows per §4 matrix |
| V-C2 | ✅ PASS — purge_test_case not granted to authenticated |
| V-D1–D5 | ✅ PASS — positive smoke |
| V-E1–E10 | ✅ PASS — all 10 negative tests; correct SQLSTATEs |
| V-F1 | ⚠️ PARTIAL — cases_deleted=7 functional; events=0 (direct INSERT seed path); errors=0 (mark_duplicate internal prefix). **PK-approved disposition. v1.1 brief now documents corrected expected matrix.** |
| V-Z1 | ✅ PASS — 0/0/0 strict-prefix residue |
| V-Z2 | ✅ PASS — total_cases=29 baseline |

**Final empirical state (post-cleanup-v2; unchanged v2.87):** event=29, case=29, source=3/3; all cc-0017d residue across 8 cross-checks = 0; baseline preserved.

**Wave 0d scope (per brief, all deployed):** 6 SECURITY DEFINER mutation functions with `out_`-prefix RETURNS TABLE discipline, `friction,public` search_path, postgres ownership, and grant matrix per §4.

**Out of scope (deferred):** Wave 0e case history / audit (**P1 PROMOTED v2.87, NEXT TASK**); Wave 7 cc-0015 friction-pool-view (still gated on observation window); Wave 8 cc-0016 friction-capture-evidence (still gated on Wave 7).

**Open follow-ups:** Wave 0e brief authoring P1 (next task); 1-week observation window 2026-05-19 → 2026-05-26; first post-cc-0017d cron 85 fire pending.

---

## 🟢 cc-0017c / cc-0017b / cc-0017a / cc-0014 / cc-0015 / cc-0016 / cc-0012 / cc-0010A/B/C / cc-0011 / cc-0009 — STATUS BLOCKS

**v2.87 updates:** None. All carry from v2.86.
- cc-0015 friction-pool-view (Wave 7): Wave 0d gate cleared v2.86; still gated on 1-week observation window closing 2026-05-26.
- cc-0016 friction-capture-evidence (Wave 8): Wave 0d gate cleared v2.86; still gated on Wave 7 sequencing.
- All others unchanged from v2.85/v2.86.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v2.87)

**L40 not exercised v2.87** (no DML against m.chatgpt_review or any other table).
**L41 not exercised v2.87** for non-friction schemas. Cumulative v2.80-v2.87 = 6 unchanged.
**L46 not exercised v2.87** (no fresh D-01).
**L58 applied 1× v2.87** — 1+2 split close per L-v2.85-e mitigation (per-session detail standalone `786fb9be` + sync_state+action_list atomic push_files).
**L62 not exercised v2.87** (no D-01 cycle).
**L-v2.78-a, L-v2.81-a**: 2 occurrences each, promotion-eligible (unchanged).
**L-v2.83-a**: 7+ occurrences (unchanged v2.87; STRONG PROMOTION CANDIDATE confirmed).
**L-v2.84-a/b/c/d**: not re-exercised v2.87. L-v2.84-d unchanged at 2 occurrences.
**L-v2.85-a HIGH-SIGNAL**: not re-exercised v2.87 (no fresh function-signature probe).
**L-v2.85-b**: not re-exercised v2.87 (no fresh inline-rewrite event).
**L-v2.85-c**: not re-exercised v2.87.
**L-v2.85-d**: REALIZED v2.86 (`friction.purge_test_case(text)` deployed). Unchanged v2.87.
**L-v2.85-e**: **re-applied v2.87 — 2nd consecutive occurrence** (v2.86 + v2.87). 1+2 split close. **Promotion-eligible after one more cycle.**
**L-v2.86-a HIGH-SIGNAL candidate**: now fully documented in cc-0017d v1.1 brief (`migration-sql.md` v1.1 Addendum); recommendation for brief P-set (transactional EXEC with marker `PERFORM` block). Watching for next exercise.
**L-v2.86-b candidate**: live in v1.1 brief; `out_`-prefix on RETURNS TABLE columns confirmed by V-A1 byte-match at v2.86 apply. Watching.
**L-v2.86-c candidate**: live in v1.1 brief; reserved SQL keyword ROWTYPE quoting requirement documented. Watching.
**L-v2.86-d candidate**: live in v1.1 brief; cross-column CHECK pre-validation inline pattern. Watching.
**L-v2.86-e candidate**: live in v1.1 brief; V-check fixture-data convention alignment. Watching.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated. Day 1 of 7 unchanged v2.87 (same calendar day as v2.86 close; no elapsed observation time).
- **First cc-0017d-post-apply cron 85 fire** pending.
- No new v2.87 calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v2.87: 0 D-01 fires. T-MCP-02 cum **~85 unchanged** from v2.86 (read-only GETs against `main` do not consume the budget). L46 Evidence Gate not exercised v2.87. L62 not exercised v2.87. State-capture exceptions v2.87: 0 (cum 1). Close-the-loop UPDATEs v2.87: 0. **22 outstanding** unchanged.

---

## 🤖 Cowork automation (D182)

Unchanged from v2.85/v2.86. Cron 82/83/86 firing normally. V-C3 PENDING.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Wave 0e — case history / audit brief authoring** | Audit-trail and event-replay design | **P1 (rank 1 PROMOTED v2.87)** | NOT YET STARTED. Next task post sync close verification. | chat → PK | PK scope confirmation; sub-files following cc-0017a/b/c/d precedent. |
| **Reconciliation daily diagnostic** | First post-cc-0017d cron 85 fire | **P1 (rank 2 v2.87)** | OPEN. | chat → PK | Post-fire SQL + emit_event check. |
| **Health_check V-C3 diagnostic** | Cowork pipe | **P1 (rank 3 v2.87)** | OPEN. V-C3 PENDING. | Cowork → chat | Check post-fire health doc. |
| **Platform Reconciliation View brief** | Reconciliation surface design | **P2 (rank 4 v2.87)** | NOT YET STARTED. | PK → chat | When PK directs. |
| **Dashboard PHASES sync** | 40th consecutive deferral | **P2 (rank 5 v2.87)** | Discipline call overdue. | chat → PK | Update roadmap page at next dashboard session. |
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
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (7+ occurrences; STRONG CANDIDATE)** | Unchanged v2.87. | chat → next lesson cycle | Promote. |
| **L-v2.84-a candidate** | Empirical-finding precedence | P3 carry | 1 occurrence. | chat → next session | Watcher. |
| **L-v2.84-b candidate** | Defensive idempotent REVOKE/GRANT | P3 carry | 1 occurrence. | chat → next session | Watcher. |
| **L-v2.84-c candidate** | Path A corrected_action satisfaction | P3 carry | 1 occurrence. | chat → next session | Watcher. |
| **L-v2.84-d candidate** | Schema-probe-before-DML | P3 carry (2 occurrences unchanged v2.87) | Not re-exercised v2.87. | chat → next session | Promotion-eligible. |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | P3 (2 occurrences unchanged v2.87) | Not re-exercised v2.87. | chat → next session | Watcher. |
| **L-v2.85-b** | Inline V-check rewrite Path 1 / Path B-prime | P3 (2 occurrences unchanged v2.87) | Not re-exercised v2.87. | chat → next session | Watcher. |
| **L-v2.85-c** | SECURITY DEFINER bypass post REVOKE | P3 (1 occurrence) | Not re-exercised v2.87. | chat → next session | Watcher. |
| **L-v2.85-d** | Postgres-owner cleanup migration | P3 (REALIZED v2.86; unchanged v2.87) | `friction.purge_test_case(text)` deployed. | chat → next session | Resolved; archive after one more exercise. |
| **L-v2.85-e** | push_files length budget — split-commit mitigation | **P3 (mitigation re-applied 2nd consecutive occurrence v2.87)** | 1+2 split close avoided truncation risk twice running. | chat → next session | Promotion-eligible after one more cycle. |
| **L-v2.86-a candidate (HIGH-SIGNAL)** | Pre-apply syntactic validation via transactional EXEC | P3 (1 occurrence; documented in cc-0017d v1.1 brief v2.87) | Now live as recommendation in `migration-sql.md` v1.1 Addendum. | chat → next session | Watcher; recommendation for future brief P-sets. |
| **L-v2.86-b candidate** | `out_`-prefix on RETURNS TABLE columns | P3 (1 occurrence; documented in v1.1 brief v2.87) | Proactive in cc-0017d. | chat → next session | Watcher. |
| **L-v2.86-c candidate** | Reserved SQL keyword ROWTYPE quoting | P3 (1 occurrence; documented in v1.1 brief v2.87) | `friction.case%ROWTYPE` requires quoting. | chat → next session | Watcher. |
| **L-v2.86-d candidate** | Cross-column CHECK pre-validation inline | P3 (1 occurrence; documented in v1.1 brief v2.87) | Predictable PL/pgSQL exception vs raw SQLSTATE. | chat → next session | Watcher. |
| **L-v2.86-e candidate** | V-check fixture-data convention alignment | P3 (1 occurrence; documented in v1.1 brief v2.87) | Fixture-naming hyphen vs strict-prefix slash mismatch. | chat → next session | Watcher. |
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
| **Parallel agent coordination (L47)** | informational | P3 carry | No interference v2.87. | chat → future | Passive. |
| **Other carries** | Dashboard mobile / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged from v2.86. | various | various |

**Closed v2.87:**
- cc-0017d v1.1 doc patch (P1 rank 1 NEW v2.86) → **CLOSED at commit `f0367405c04dd21e4e08bc4c8beebd4d77635229`** ✅

**Closed earlier:** v2.86 cc-0017d apply + fresh D-01 + V-F1 cleanup + Plan gate 12; v2.85 cc-0017c apply + fresh D-01 + V-B4 PK Path 1 + V-B4 smoke cleanup + Plan gate 10; v2.84 brief authoring + 2× D-01; v2.83 cc-0017b v1.1 doc patch; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.80 cc-0017a authoring; v2.79 PK approval gate.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v2.86.

---

## 📌 Backlog

**v2.87 state changes:**
- cc-0017d v1.1 doc patch → CLOSED at commit `f0367405` (4 files patched + read-back verified).
- Wave 0e brief authoring → PROMOTED rank 2 P2 v2.86 → rank 1 P1 v2.87. NEXT TASK.
- Friction Register Consolidation Plan: cc-0017d brief v1.1 doc patch now CLOSED; source-of-truth aligned to production reality.
- T-MCP-02 cum ~85 unchanged from v2.86 (no MCP probes consumed v2.87).
- State-capture exceptions cum 1 unchanged.
- friction.* schema state unchanged from v2.86 (no production mutations v2.87).
- 5 L-v2.86 candidates now fully documented in cc-0017d v1.1 brief on `main`.
- L-v2.85-e mitigation re-applied (2nd consecutive occurrence v2.86 + v2.87); promotion-eligible after one more cycle.
- 1+2 split commit close (per-session detail standalone + sync_state+action_list atomic).
- Dashboard PHASES 40th carried (was 39 at v2.86; +1 at v2.87 = 40). No file-touch.
- **No decisions.md change.**

---

## 🧊 Frozen / Deferred

Unchanged from v2.85/v2.86.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e candidates carried per v2.87.

- **L40 not exercised v2.87**.
- **L41 not exercised v2.87**.
- **L46 not exercised v2.87**.
- **L52-L65** various: not re-exercised v2.87.
- **L58 baseline**: 1× v2.87 (1+2 split close per L-v2.85-e mitigation).
- **L62 baseline-eligible**: not exercised v2.87.
- **L-v2.76-a-f**: not re-exercised v2.87.
- **L-v2.78-a**: 2 occurrences (unchanged).
- **L47**: 1 occurrence (unchanged).
- **L-v2.81-a**: 2 occurrences (unchanged).
- **L-v2.83-a**: 7+ occurrences (unchanged; STRONG CANDIDATE).
- **L-v2.84-a/b/c**: 1 occurrence each (unchanged).
- **L-v2.84-d**: 2 occurrences (unchanged v2.87).
- **L-v2.85-a HIGH-SIGNAL**: 2 occurrences (unchanged v2.87).
- **L-v2.85-b**: 2 occurrences (unchanged v2.87).
- **L-v2.85-c**: 1 occurrence (unchanged v2.87).
- **L-v2.85-d**: REALIZED v2.86 (unchanged v2.87).
- **L-v2.85-e**: **re-applied v2.87 — 2nd consecutive occurrence**; promotion-eligible after one more cycle.
- **L-v2.86-a (HIGH-SIGNAL)**: 1 occurrence, now fully documented in v1.1 brief.
- **L-v2.86-b**: 1 occurrence, now documented in v1.1 brief.
- **L-v2.86-c**: 1 occurrence, now documented in v1.1 brief.
- **L-v2.86-d**: 1 occurrence, now documented in v1.1 brief.
- **L-v2.86-e**: 1 occurrence, now documented in v1.1 brief.

All candidates recommended for promotion at appropriate cycle once empirical evidence accumulates.

---

## v2.87 honest limitations

- All v2.31–v2.86 limitations apply.
- **Doc-only patch + sync close.** No production schema change, no migration applied, no V-check run, no fresh empirical evidence v2.87. Schema state end of v2.87 = schema state end of v2.86.
- **v1.0 SQL preserved verbatim in `migration-sql.md` below the v1.1 Addendum.** Future authors using this brief as a template MUST apply both substitution classes (RAISE `%%`→`%` + `friction.case%ROWTYPE`→`friction.\"case\"%ROWTYPE`) before any production apply attempt. v1.1 Addendum at the top flags this loudly.
- **V-D-setup block in `vchecks.md`** still shows the `emit_event` path as the documented setup, with inline v1.1 note + addendum-end Drift 1 documenting the fallback direct-INSERT path.
- **V-Z3 cross-check not retroactively added** to cc-0017d V-checks; documented as recommendation for future briefs introducing a `mark_duplicate`-class function.
- **1+2 split commit pattern** carries L58 atomic-close-the-loop / L-v2.85-e length-budget trade-off into v2.87.
- **Wave 0e is the next active item but is not started v2.87.**
- **22 outstanding close-the-loop UPDATEs** unchanged.
- **Memory cap 19/30** unchanged.
- **Action_list size at v2.87**: ~35KB (compacted per L-v2.85-e mitigation; v2.86 was ~33KB; +~2KB from v2.87 additions).
- **Per-session files v2.87**: 1 — `2026-05-19-cc0017d-v1.1-doc-patch.md` (commit `786fb9be`).
- **Doc-sync v2.87**: 1+2 split commit per L-v2.85-e mitigation (per-session detail standalone; sync_state+action_list atomic).
- **Close-the-loop UPDATEs v2.87: 0**. 22 outstanding unchanged.
- **State-capture exceptions v2.87: 0**. Cumulative: 1.
- **Production mutations v2.87: 0**.
- **Dashboard PHASES 40th deferral** carried (was 39 at v2.86; +1 at v2.87). No file-touch v2.87.
- **No decisions.md change.** Doc-patch close; no new architectural decisions, no scope amendments.
- **No Wave 0e work started v2.87** per PK explicit instruction.

---

## Changelog

- v1.0–v2.86: per commit history.
- **v2.87 (2026-05-19 Sydney evening, cc-0017d v1.1 doc-only patch CLOSED):**
  - Build arc: session resumed post-compaction → v1.1 doc patch commit `f0367405…` recognized as already landed (prior turn) → no redundant commit issued → 4× read-only GET verification confirmed all blob SHAs match push_files response byte-for-byte → status report to PK → PK directive for sync close → 1+2 split commit close per L-v2.85-e mitigation (per-session detail standalone `786fb9be` + this atomic 2-file push_files).
  - cc-0017d v1.1 doc-only patch CLOSED. Exactly 4 files patched + read-back verified. cc-0017d v1.1 source-of-truth now matches v2.86 production apply / V-check reality.
  - Wave 0e brief authoring PROMOTED rank 2 P2 v2.86 → rank 1 P1 v2.87. NEXT TASK.
  - No production mutations. No D-01 fire. No Wave 0e work started.
  - T-MCP-02 cum ~85 unchanged. State-capture exceptions cumulative 1 unchanged.
  - L-series: No new lesson exercises. L58 applied 1× (1+2 split close per L-v2.85-e mitigation). L-v2.85-e re-applied 2nd consecutive occurrence (v2.86 + v2.87); promotion-eligible after one more cycle.
  - 5 L-v2.86 candidates (a HIGH-SIGNAL, b, c, d, e) now fully documented in cc-0017d v1.1 brief on `main`.
  - Active rows updated: cc-0017d v1.1 doc patch → CLOSED at commit `f0367405`; Wave 0e brief authoring promoted to rank 1 P1.
  - STATUS BLOCKS updated: cc-0017d STATUS BLOCK marks v1.1 doc patch CLOSED; Friction Plan STATUS BLOCK confirms gate 13 (Wave 0e) is the next open gate.
  - Closure budget: ~0.5h v2.87. Trailing-14-day ~23.5h.
  - Doc-sync: 1+2 split commit per L-v2.85-e mitigation (per-session standalone `786fb9be` + sync_state+action_list atomic).
  - Production mutations: 0.
  - No decisions.md change.
