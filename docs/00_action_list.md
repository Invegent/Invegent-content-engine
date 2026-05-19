# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-19 Sydney evening (**v2.91 — cc-0017e v1.1 8-item backlog doc patch CLOSED at commit `be4e6772f20a73d093f53f609230fb565b1fe0df`**. 5 brief files patched atomically in single push_files (vchecks.md + migration-sql.md + risks-and-grants.md + d01-postapply-deferred.md + lessons-metadata-changelog.md). All 9 items covered: severity='info' + category='unclassified' + fixture naming `cc-0017e-test/...` (vchecks.md V-D-setup + V-Z1 + step 10) + explicit `DROP FUNCTION` arity-change discipline (migration-sql.md §2) + R4 reframe + §3 narrowed lockdown scope (risks-and-grants.md) + phantom `resolved_at` + `result_summary` removal from 4 §4 templates (d01-postapply-deferred.md) + L-v2.90-a through L-v2.90-f added (a/b HIGH-SIGNAL; lessons-metadata-changelog.md). Apply state preserved (cc-0017e Wave 0e remains APPLIED-WITH-VCHECK-CORRECTION; D-01 `315baf84-...` remains resolved/applied_with_correction). **Reconciliation daily cadence diagnostic promoted P1 rank 1.** L-v2.85-e re-applied 6th consecutive occurrence (promotion-confirmed v2.88 carries forward). L-v2.83-a 11+ STRONG. **L-v2.88-a "identical PK-directive loop" 2nd documented occurrence v2.91** (PK re-sent v2.90 cleanup directive verbatim; handled via hard-stop + read-only state-verification probe + 4 disposition options; no re-execution). 0 production mutations / 0 Supabase calls / 0 D-01 fires / 0 memory edits / 0 decisions.md edits. T-MCP-02 cum ~86 unchanged. State-capture exceptions cum 1 unchanged. Gate 11 Day 1 of 7 unchanged. Dashboard PHASES 44th deferral. Per-session detail `2026-05-19-cc0017e-v1.1-8item-doc-patch.md` commit `404475172ad54f022a6ccf6203aac06fb824b45d`. sync_state + action_list atomic push_files this commit (1+2 split per L-v2.85-e baseline; L-v2.89-a fallback ready but not invoked).) **Today/Next 5**: Reconciliation daily diagnostic → rank 1 (P1 carry, was rank 2); Health_check V-C3 → rank 2 (P1 carry, was rank 3); Platform Reconciliation View → rank 3 (P2 carry, was rank 4); 5-row close-the-loop / pre-sales / purge_test_case helper extension → rank 4 (P2/P3 carry, was rank 5).

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v2.90.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46-v2.58 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + **L-v2.83-a (STRONG; 11+ v2.91)** + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL; 4 occurrences — promotion-eligible) + L-v2.85-b/c/d carried + **L-v2.85-e PROMOTION-CONFIRMED 6th consecutive v2.91 (carries forward from v2.88)** + 5 L-v2.86 candidates + **L-v2.88-a (2 occurrences v2.91 — watcher)** + L-v2.88-b/c/d candidates + L-v2.89-a candidate (carry) + **L-v2.90-a through L-v2.90-f candidates** (a/b HIGH-SIGNAL; c/d/e/f candidates). **D-IOL-001 (v2.77)** carried. **D-CC-0017B-Q1** carried.

**v2.91 ADDITIONS:**

- **cc-0017e v1.1 8-item doc patch CLOSED v2.91** at commit `be4e6772f20a73d093f53f609230fb565b1fe0df`. Single atomic push_files (5 files in docs/briefs/cc-0017e/). All 9 patch points landed (8 backlog defects + L-v2.90 family addition).

- **Pre-patch state-verification (after PK identical-directive loop):** PK re-sent v2.90 Option A cleanup directive verbatim at v2.91 start (L-v2.88-a 2nd documented occurrence). Claude hard-stopped, ran read-only state-verification probe (29 cases / 29 events / 8 case_history / 8 backfill kind / 0 non-backfill / 0 vd_residue / d01 status=resolved — all 7 metrics AS_EXPECTED), presented 4 disposition options. PK redirected to v1.1 doc patch. No re-execution; v2.90 production state preserved intact.

- **Hard stops respected:**
  - 0 production mutations / 0 Supabase calls / 0 D-01 fires / 0 memory edits / 0 decisions.md edits
  - 0 Wave 0f scope creep
  - 0 purge_test_case helper changes (extension correctly deferred to future Wave brief per L-v2.90-d disposition)
  - 0 re-execution of cc-0017e apply instructions despite PK directive re-send
  - Atomic push_files per L-v2.85-e 1+2 split succeeded on first attempt; L-v2.89-a 1+1+1 fallback NOT invoked

- **Coverage map (9 patch points across 5 files):**
  1. severity='low'→'info' (vchecks.md V-D-setup)
  2. category='cc-0017e/v-d/category'→'unclassified' (vchecks.md V-D-setup)
  3. Fixture naming `cc-0017e-test/...` (vchecks.md V-D-setup + V-D1-D6 + V-Z1 + step 10)
  4. Explicit DROP FUNCTION before fn_triage_case CREATE OR REPLACE (migration-sql.md §2 + arity-change discipline)
  5. R4 arity/signature rationale corrected (risks-and-grants.md R4 fully reframed)
  6. §3 grants verification narrowed to actual lockdown scope (risks-and-grants.md §3; 4 tables: case + event + emit_error + case_history)
  7. `resolved_at` phantom removed (d01-postapply-deferred.md §4 — all 4 templates)
  8. `result_summary` phantom removed (d01-postapply-deferred.md §4 — all 4 templates)
  9. L-v2.90-a through L-v2.90-f added (lessons-metadata-changelog.md §2; a/b HIGH-SIGNAL; §3 metadata + §4 changelog v1.1 v2.91 entry)

- **Sync close mechanics v2.91 (1+2 split per L-v2.85-e baseline):**
  1. Doc patch commit `be4e6772` (5 files via push_files earlier this session).
  2. Per-session detail standalone commit `404475172ad54f022a6ccf6203aac06fb824b45d` (`docs/runtime/sessions/2026-05-19-cc0017e-v1.1-8item-doc-patch.md`, 13,800 B) via create_or_update_file.
  3. sync_state + action_list atomic commit this commit via push_files (2 files).

- **L-v2.85-e re-applied 6th consecutive occurrence** (v2.86 + v2.87 + v2.88 + v2.89 + v2.90 + v2.91); promotion-confirmed v2.88 carries forward.
- **L-v2.83-a re-applied** at doc patch commit + sync close commit. Cumulative **11+ STRONG**.
- **L-v2.88-a "identical PK-directive loop" 2nd documented occurrence v2.91** — handled via hard-stop + read-only probe + disposition options; no re-execution. Watcher.
- **L-v2.89-a NOT exercised v2.91** — atomic push_files succeeded; fallback ready but not invoked.
- **L-v2.85-a HIGH-SIGNAL NOT re-exercised v2.91** (doc-only; no V-check execution).
- **L-v2.90-a-f NOT empirically re-exercised v2.91** (codified documentationally only).
- **L40 / L41 / L46 / L58 / L62 NOT exercised v2.91** (no DB / no DDL / no D-01 / no apply).

- **No new L-v2.91-X candidates surfaced.** Mechanical doc-patch close session.

- **Closed Active rows v2.91:** cc-0017e v1.1 8-item doc patch (P2 rank 1 v2.90) → CLOSED ✅ at `be4e6772`.
- **Promoted Active rows v2.91:** Reconciliation daily diagnostic → rank 1 P1 v2.91 (was rank 2); Health_check V-C3 → rank 2 (was rank 3); Platform Reconciliation View → rank 3 (was rank 4); close-the-loop / pre-sales / helper extension → rank 4 (was rank 5).

- **Dashboard PHASES sync: 44th consecutive deferral** (was 43 at v2.90; +1 at v2.91). No file-touch v2.91.
- **NO decisions.md change v2.91.** Doc-only patch close; no new architectural decisions.
- **Session compaction event v2.91:** 0.
- **Production mutations v2.91: 0.**
- **D-01 fires v2.91: 0.**
- **T-MCP-02 cum v2.91: ~86 unchanged** (no MCP probes; no ask_chatgpt_review called).
- **State-capture exceptions v2.91: 0.** Cumulative: 1 unchanged.
- **Close-the-loop UPDATEs v2.91: 0** (no D-01 fired). 22 outstanding unchanged.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~2 (recon daily diagnostic + health_check signal diagnostic) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~31h (v2.83 1h + v2.84 ~2h + v2.85 ~3h + v2.86 ~3.5h + v2.87 ~0.5h + v2.88 ~1.5h + v2.89 ~1h + v2.90 ~4h + v2.91 ~1h) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.91 cycle: ~1h total** (doc patch + per-session detail + sync close). 0 schema mutations. 0 D-01 fires. 3 git commits (doc patch + per-session detail standalone + sync_state+action_list atomic). **State-capture exception count v2.91: 0** (cumulative 1).

---

## ⭐ Today / Next 5

> Last rebuilt: 2026-05-19 Sydney evening (v2.91).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Reconciliation daily cadence diagnostic** | **P1 carry, rank 1 v2.91 (PROMOTED)** | First post-cc-0017e cron 85 fire pending. Confirms cc-0017e patched functions + new case_history shadow table co-exist with cc-0017b wrappers + cc-0017c lockdown. Now unblocked from cc-0017e apply + doc-patch gating. | chat → PK | Post-fire SQL count + emit_event signature check. |
| 2 | **Health_check V-C3 + signal-production diagnostic** | P1 carry, rank 2 | V-C3 still PENDING. Cowork brief v3.0 ready. | Cowork → chat | Check post-fire `docs/audit/health/YYYY-MM-DD.md`. |
| 3 | **Platform Reconciliation View brief authoring** | P2 carry, rank 3 | Reconciliation surface design. PK greenlight required. | PK → chat | When PK directs. |
| 4 | **5-row close-the-loop batch sweep / Pre-sales criteria refinement / `purge_test_case` helper case_history extension** | P2/P3 carry, rank 4 | 22 outstanding close-the-loop UPDATEs (unchanged net by v2.91); Pre-sales 3-clock criteria per memory entry; helper case_history extension future Wave candidate (L-v2.90-d). | chat → PK | When PK directs. |

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Passive observation v2.91**: Cron 82-86 unchanged. PRV v1 operator views queryable. friction.* state: 10 tables, 19 functions (fn_triage_case 11-arg only), 29 cases + 29 events (baseline preserved), 8 case_history rows (backfill only). PostgREST exposes `friction`. Next fires: cron 85 daily; cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (v2.91 unchanged from v2.90)

**Status v2.91: ✅ Wave 0 + Wave 0d + Wave 0e COMPLETE. Gates 10+12+13 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE Day 1 of 7. Wave 0f NOT YET SCOPED — candidates: items B/E/F/G deferred from cc-0017e + purge_test_case helper case_history extension.**

**Documents (v2.91 changes):**
- `docs/briefs/cc-0017e-friction-case-history-and-compat.md` v1.0 AUTHORED v2.88 + v1.1 doc patch CLOSED v2.89 at `587ee4ac` + APPLIED v2.90 (5 migrations) + **v1.1 8-item backlog doc patch CLOSED v2.91 at `be4e6772`** (5 files: vchecks.md + migration-sql.md + risks-and-grants.md + d01-postapply-deferred.md + lessons-metadata-changelog.md)
- All other briefs unchanged from v2.90
- Per-session files: v2.79–v2.90 unchanged; **v2.91 at `2026-05-19-cc0017e-v1.1-8item-doc-patch.md` (commit `404475172ad54f022a6ccf6203aac06fb824b45d`, 13,800 B)**

**Open gates v2.91:**
1-9. ✅ PK approval + cc-0017a/b/c brief authoring + D-01 cycles + cc-0017c v1.0+v1.1 D-01 fires
10. ✅ cc-0017c apply (CLOSED v2.85)
11. ⏳ **1-week empirical observation window** ACTIVE 2026-05-19 → 2026-05-26 (Day 1 of 7 unchanged v2.91)
12. ✅ cc-0017d Wave 0d apply (CLOSED v2.86) + v1.1 doc patch CLOSED v2.87
13. **Wave 0e** — case history / audit
    - 13.a Authoring sub-gate ✅ CLOSED v2.88
    - 13.b v1.1 doc patch sub-gate ✅ CLOSED v2.89 at `587ee4ac`
    - 13.c Apply sub-gate ✅ CLOSED v2.90 (APPLIED-WITH-VCHECK-CORRECTION)
    - **13.d v1.1 8-item backlog doc patch sub-gate ✅ CLOSED v2.91 at `be4e6772`**

---

## 🟢 cc-0017e Wave 0e — STATUS BLOCK (UPDATED v2.91)

**Status: ✅ APPLIED-WITH-VCHECK-CORRECTION v2.90 + v1.1 8-item BACKLOG CLOSED v2.91. All known authoring-time defects from v2.90 apply discovery are now reflected in docs.**

**Brief commits (5 in chain):**
- Commit 1 `8502fc49a0d981e95f8fed6bd7c3ece438fc669c` (v2.88) — main brief
- Commit 2 `1659b293da007ced41a6d0b08def1061dd38a414` (v2.88) — 4 substantive sub-files
- Commit 3 `d349bdfecc1629dbaeca0d5cea579e69d9d03461` (v2.88) — 3 process sub-files
- Commit 4 `587ee4ac894a50708611cf9a053253083ae39e2b` (v2.89) — v1.1 doc patch (2 sub-files; column-name correction)
- **Commit 5** `be4e6772f20a73d093f53f609230fb565b1fe0df` (v2.91) — v1.1 8-item backlog doc patch (5 sub-files)

**Production state (post-v2.91 unchanged from v2.90):**
- `friction.case_history` exists with cc-0017c lockdown grants
- `friction.fn_triage_case` 11-arg patched body (legacy 10-arg dropped)
- 5 cc-0017d mutation functions patched byte-stable
- 8 acknowledged-legacy cases backfilled
- 8 backfill rows in case_history (change_kind='backfill')
- D-01 `315baf84-...` resolved/applied_with_correction/resolved_by=cc-0017e-close-v2.90

**Brief defects 1-8 + L-v2.90 family disposition (v2.91 close):**
- Defects 1, 2 (vchecks.md V-D-setup severity + category) → patched
- Defect 3 (migration-sql.md §2 + risks-and-grants.md R4 arity-change DROP) → patched
- Defect 4 (vchecks.md V-D-setup + V-Z1 fixture naming `cc-0017e-test/...`) → patched
- Defect 5 (purge_test_case helper case_history coverage) → documented as workaround in vchecks.md V-Z1; helper extension future Wave candidate
- Defects 6, 7 (d01-postapply-deferred.md §4 phantom columns) → patched
- Defect 8 (risks-and-grants.md §3 broad-scope verification clause) → patched
- L-v2.90-a (HIGH-SIGNAL) constraint-surface probing → lessons-metadata-changelog.md §2
- L-v2.90-b (HIGH-SIGNAL) arity-change DROP discipline → lessons-metadata-changelog.md §2
- L-v2.90-c (V-D naming purge_test_case regex) → lessons-metadata-changelog.md §2
- L-v2.90-d (shadow-table helper coverage gap audit) → lessons-metadata-changelog.md §2
- L-v2.90-e (close-the-loop schema validation) → lessons-metadata-changelog.md §2
- L-v2.90-f (risks/grants verification scope matching) → lessons-metadata-changelog.md §2

---

## 🟢 cc-0017d / cc-0017c / cc-0017b / cc-0017a / cc-0014 / cc-0015 / cc-0016 / cc-0012 / cc-0010A/B/C / cc-0011 / cc-0009 — STATUS BLOCKS

**v2.91 updates:** unchanged from v2.90. All earlier waves preserved. cc-0015 (Wave 7) + cc-0016 (Wave 8) still gated on observation window + sequencing.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v2.91)

**L41**: cumulative v2.80-v2.91 = 11 (no new exercises v2.91 — doc-only).
**L40 / L46 / L58 / L62**: not exercised v2.91.
**L-v2.78-a / L-v2.81-a**: 2 occurrences each, promotion-eligible (unchanged).
**L-v2.83-a**: **11+ occurrences v2.91** (re-applied at doc patch commit + sync close commit). STRONG CANDIDATE confirmed.
**L-v2.84-a/b/c**: unchanged. L-v2.84-d related to L-v2.90-a.
**L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v2.91; not re-exercised in doc-only).
**L-v2.85-b**: 4× v2.90 occurrences; not re-exercised v2.91.
**L-v2.85-c**: 1 occurrence (unchanged).
**L-v2.85-d**: REALIZED v2.86 + re-exercised v2.90; not re-exercised v2.91.
**L-v2.85-e**: **re-applied v2.91 — 6th consecutive occurrence** (v2.86 + v2.87 + v2.88 + v2.89 + v2.90 + v2.91). 1+2 split close. PROMOTION-CONFIRMED v2.88 carries forward.
**L-v2.86-a HIGH-SIGNAL**: PARTIALLY exercised v2.90; not re-exercised v2.91.
**L-v2.86-b/c**: exercised v2.90 byte-stable; not re-exercised v2.91.
**L-v2.86-d/e**: not re-exercised v2.91.
**L-v2.88-a**: **2 occurrences v2.91 (v2.88 + v2.91)**. Identical PK-directive loop re-observed v2.91 at session start (PK re-sent v2.90 Option A cleanup directive verbatim); handled via hard-stop + read-only state-verification probe + 4 disposition options; no re-execution. Watcher.
**L-v2.88-b**: realised via V-Z3 live execution v2.90.
**L-v2.88-c**: REALISED v2.90 (probe re-verification at apply).
**L-v2.88-d**: realised v2.90.
**L-v2.89-a**: 1 occurrence v2.89; not re-exercised v2.91 (atomic push_files succeeded; fallback not invoked).
**L-v2.90-a (HIGH-SIGNAL) / b (HIGH-SIGNAL) / c / d / e / f**: codified documentationally v2.91 (cc-0017e v1.1 doc patch lessons-metadata-changelog.md §2). Not empirically re-exercised v2.91. Watchers.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated. Day 1 of 7 unchanged v2.91 (same calendar day as v2.86-v2.90 closes; no elapsed observation time).
- **First cc-0017e-post-apply cron 85 fire** pending — diagnostic **P1 rank 1 v2.91 (PROMOTED)** — unblocked from cc-0017e apply + doc-patch gating.
- No new v2.91 calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v2.91: **0 D-01 fires.** T-MCP-02 cum **~86 unchanged** v2.91. L46 NOT exercised v2.91 (no D-01). L62 NOT exercised v2.91. State-capture exceptions v2.91: 0 (cum 1). Close-the-loop UPDATEs v2.91: 0. **22 outstanding unchanged net.**

---

## 🤖 Cowork automation (D182)

Unchanged from v2.85-v2.90. Cron 82/83/86 firing normally. V-C3 PENDING.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Reconciliation daily diagnostic** | First post-cc-0017e cron 85 fire | **P1 carry, rank 1 v2.91 (PROMOTED)** | OPEN. Unblocked from cc-0017e apply + doc-patch gating. | chat → PK | Post-fire SQL + emit_event check. |
| **Health_check V-C3 diagnostic** | Cowork pipe | **P1 carry, rank 2** | OPEN. V-C3 PENDING. | Cowork → chat | Check post-fire health doc. |
| **Platform Reconciliation View brief** | Reconciliation surface design | **P2 carry, rank 3** | NOT YET STARTED. | PK → chat | When PK directs. |
| **5-row close-the-loop batch / Pre-sales / `purge_test_case` helper case_history extension** | 22 outstanding CCH + 1 T-MCP-05 meta + Pre-sales 3-clock criteria + helper case_history coverage gap from cc-0017e v2.90 discovery (L-v2.90-d) | **P2/P3 carry, rank 4** | OPEN. Helper extension future Wave 0f candidate. | chat → PK | When PK directs. |
| **Music library activation** | video-worker v3.0.0 env-var gated | P2 carry | PENDING PK. | PK + chat | Bucket + tracks + env + smoke. |
| **vchecks.md V-B4 doc patch** | Correct V-B4 to 12-param signature (L-v2.85-a follow-up) | P3 carry | Doc-only. May fold into cc-0017c v1.2. | chat → PK | PK decides scope. |
| **cc-0017c v1.2 doc patch candidate** | Date correction + 3 D-01 references + V-B4 signature correction | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **cc-0015 friction-pool-view brief** (Wave 7) | Authored PENDING_EXECUTION | P2 (Wave 7; Wave 0e gate cleared v2.90; still gated on 1-week window) | DRAFTED commit `9a5dc155`. | chat → PK (Wave 7) | When window closes 2026-05-26. |
| **cc-0016 friction-capture-evidence brief** (Wave 8) | Authored PENDING_EXECUTION | P2 (Wave 8; Wave 0e gate cleared v2.90; still gated on Wave 7) | DRAFTED commit `f35f8ea4`. | chat → PK (Wave 8) | After Wave 7. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | P2 carry | OBSERVED. | chat → PK | Verify + dry-run + re-enable. |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P2 carry | LOGGED. | chat → PK | Audit m.post_draft. |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 carry | OPEN. | PK | When PK directs. |
| **L-v2.78-a baseline promotion** | Reviewer convergence | P3 carry | 2 occurrences, eligible. | chat → next lesson cycle | Promote alongside L-v2.81-a. |
| **L47 baseline promotion** | list_recent_commits before retry | P3 carry | 1 occurrence. | chat → next session | Consider co-promotion with L-v2.85-e. |
| **L-v2.81-a baseline promotion** | Parallel-session coordination | P3 carry | 2 occurrences, eligible. | chat → next lesson cycle | Promote. |
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (11+ occurrences v2.91; STRONG CANDIDATE)** | Re-applied at doc patch commit + sync close commit v2.91. | chat → next lesson cycle | Promote. |
| **L-v2.84-a/b/c candidates** | Empirical precedence / idempotent REVOKE/GRANT / Path A corrected_action | P3 carry | 1 occurrence each. | chat → next session | Watcher. |
| **L-v2.84-d candidate** | Schema-probe-before-DML | P3 carry (2 occurrences) | Related to L-v2.90-a. | chat → next session | Promote-eligible co-promotion candidate. |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | P3 (4 occurrences; promotion-eligible; not re-exercised v2.91 doc-only) | Promotion-eligible carries forward. | chat → next lesson cycle | Promote. |
| **L-v2.85-b** | Inline V-check rewrite Path 1 / Path B-prime | P3 (carry; not re-exercised v2.91) | v2.90 ×4. | chat → next session | Watcher; trending toward promotion. |
| **L-v2.85-c** | SECURITY DEFINER bypass post REVOKE | P3 (1 occurrence) | Not re-exercised v2.91. | chat → next session | Watcher. |
| **L-v2.85-d** | Postgres-owner cleanup migration | P3 (REALIZED v2.86; re-exercised v2.90; not re-exercised v2.91) | Carries forward; informs L-v2.90-c/d. | chat → next session | Watcher. |
| **L-v2.85-e** | push_files length budget — split-commit mitigation | **P3 (PROMOTION-CONFIRMED v2.88; 6th consecutive occurrence v2.91)** | 1+2 split close v2.91. | chat → next lesson cycle | **PROMOTE.** |
| **L-v2.86-a candidate (HIGH-SIGNAL)** | Pre-apply syntactic validation via transactional EXEC | P3 (PARTIALLY exercised v2.90 — disclosed as PARTIAL in D-01) | Lesson scope clarified v1.1: harness catches substitution-class drift only. | chat → next session | Watcher with refined scope. |
| **L-v2.86-b/c/d/e candidates** | out_-prefix / ROWTYPE quoting / CHECK pre-validation / slash-prefix fixture convention | P3 (b+c exercised v2.90 byte-stable; d+e unchanged; none re-exercised v2.91) | Carry. | chat → next session | Cross-brief carry. |
| **L-v2.88-a candidate** | Identical PK-directive loop | **P3 (2 occurrences v2.88 + v2.91; watcher)** | Re-observed v2.91 at session start; handled via hard-stop + read-only probe + disposition options. | chat → next lesson cycle | Pair-promote with L-v2.85-e. |
| **L-v2.88-b/c/d candidates** | V-Z3 alignment / probe re-verification gate / in-function INSERT pattern | P3 (b realised v2.90; c REALISED v2.90; d realised v2.90; none re-exercised v2.91) | Carry forward. | chat → next lesson cycle | Promote after one more cycle. |
| **L-v2.89-a candidate** | push_files atomic timeout → 1+1+1 fallback | P3 (1 occurrence v2.89; not re-exercised v2.91 — atomic succeeded) | Watcher. | chat → next session | Pair-promote with L-v2.85-e. |
| **L-v2.90-a (HIGH-SIGNAL)** | V-D fixture constraint-surface probing | P3 (1 occurrence v2.90; codified documentationally v2.91) | Caught 2 defects at v2.90 apply. | chat → next session | Watcher; pair with L-v2.84-d. |
| **L-v2.90-b (HIGH-SIGNAL)** | CREATE OR REPLACE FUNCTION arity change → explicit DROP | P3 (1 occurrence v2.90; codified documentationally v2.91) | Caught Defect 3 (dual overload). | chat → next session | Watcher; specific to function-patch briefs. |
| **L-v2.90-c** | V-D fixture naming purge_test_case regex | P3 (1 occurrence v2.90; codified documentationally v2.91) | Caught Defect 4. | chat → next session | Watcher. |
| **L-v2.90-d** | Shadow tables + helper coverage gap audit | P3 (1 occurrence v2.90; codified documentationally v2.91) | Caught Defect 5; informs purge_test_case extension future Wave brief. | chat → next session | Watcher. |
| **L-v2.90-e** | Close-the-loop SQL template schema validation | P3 (1 occurrence v2.90; codified documentationally v2.91) | Caught Defects 6 + 7. | chat → next session | Watcher. |
| **L-v2.90-f** | Risk/grants verification clauses match actual lockdown scope | P3 (1 occurrence v2.90 — S7 finding; codified documentationally v2.91) | Caught Defect 8. | chat → next session | Watcher. |
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
| **Parallel agent coordination (L47)** | informational | P3 carry | No interference v2.91. | chat → future | Passive. |
| **Other carries** | Dashboard mobile / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged from v2.86-v2.90. | various | various |

**Closed v2.91:**
- **cc-0017e v1.1 8-item doc patch** (P2 rank 1 v2.90) → **CLOSED** ✅ at `be4e6772`. 5 brief files patched atomically; all 9 items covered (8 backlog defects + L-v2.90 family addition).

**Closed earlier:** v2.90 cc-0017e apply session; v2.89 cc-0017e v1.1 column-name patch; v2.88 Wave 0e brief authoring; v2.87 cc-0017d v1.1 doc patch; v2.86 cc-0017d apply; v2.85 cc-0017c apply; v2.84 brief authoring + 2× D-01; v2.83 cc-0017b v1.1 doc patch; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.80 cc-0017a authoring; v2.79 PK approval gate.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v2.90.

---

## 📌 Backlog

**v2.91 state changes:**
- cc-0017e v1.1 8-item doc patch (P2 rank 1 v2.90) → **CLOSED v2.91** at `be4e6772`.
- **Reconciliation daily diagnostic** PROMOTED to **P1 rank 1 v2.91** (was rank 2; unblocked from cc-0017e gating).
- Health_check V-C3 → rank 2 (was rank 3; shifted by promotion).
- Platform Reconciliation View → rank 3 (was rank 4).
- close-the-loop sweep / pre-sales / purge_test_case helper extension → rank 4 (was rank 5).
- Friction Register Consolidation Plan: Gate 13.d (v1.1 8-item doc patch sub-gate) → CLOSED v2.91.
- T-MCP-02 cum ~86 unchanged.
- State-capture exceptions cum 1 unchanged.
- friction.* schema state: unchanged from v2.90.
- L-v2.85-e mitigation re-applied 6th consecutive occurrence v2.91 (promotion-confirmed v2.88 carries forward).
- L-v2.83-a re-applied at doc patch commit + sync close commit. Cumulative 11+ STRONG.
- L-v2.88-a re-observed v2.91 (2nd occurrence). Watcher.
- L-v2.85-a HIGH-SIGNAL not re-exercised v2.91 (doc-only). 4 occurrences, promotion-eligible carries forward.
- L-v2.90-a-f codified documentationally v2.91; not empirically re-exercised. Watchers.
- Dashboard PHASES 44th deferral carried (was 43; +1 at v2.91 = 44). No file-touch.
- **No decisions.md change v2.91.**

---

## 🧊 Frozen / Deferred

Unchanged from v2.85-v2.90.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e + L-v2.88-a-d + L-v2.89-a + L-v2.90-a-f candidates carried per v2.91.

- **L40 / L41 / L46 / L58 / L62**: not exercised v2.91 (doc-only).
- **L-v2.76-a-f**: not re-exercised v2.91.
- **L-v2.78-a**: 2 occurrences (unchanged).
- **L47**: 1 occurrence (unchanged).
- **L-v2.81-a**: 2 occurrences (unchanged).
- **L-v2.83-a**: **11+ occurrences v2.91** (re-applied at doc patch commit + sync close commit). STRONG CANDIDATE confirmed.
- **L-v2.84-a/b/c**: 1 occurrence each (unchanged).
- **L-v2.84-d**: 2 occurrences unchanged; related to L-v2.90-a.
- **L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v2.91; not re-exercised in doc-only).
- **L-v2.85-b**: 4× v2.90; not re-exercised v2.91.
- **L-v2.85-c**: 1 occurrence (unchanged).
- **L-v2.85-d**: REALIZED v2.86 + re-exercised v2.90; not re-exercised v2.91.
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88; 6th consecutive occurrence v2.91**.
- **L-v2.86-a (HIGH-SIGNAL)**: PARTIALLY exercised v2.90; not re-exercised v2.91.
- **L-v2.86-b/c**: exercised v2.90 byte-stable; not re-exercised v2.91.
- **L-v2.86-d/e**: unchanged.
- **L-v2.88-a**: **2 occurrences v2.91 (v2.88 + v2.91 identical-directive loop)**. Watcher.
- **L-v2.88-b**: realised v2.90 (V-Z3 live).
- **L-v2.88-c**: REALISED v2.90 (probe re-verification at apply).
- **L-v2.88-d**: realised v2.90.
- **L-v2.89-a**: 1 occurrence v2.89; not re-exercised v2.91 (atomic succeeded).
- **L-v2.90-a-f**: codified documentationally v2.91; not empirically re-exercised. Watchers.

All candidates recommended for promotion at appropriate cycle once empirical evidence accumulates. **L-v2.85-e + L-v2.85-a + L-v2.83-a are the highest-priority promotions at next lesson cycle; L-v2.88-a now eligible (2 occurrences); L-v2.90-a + L-v2.90-b (both HIGH-SIGNAL) join the watch.**

---

## v2.91 honest limitations

- All v2.31–v2.90 limitations apply.
- **Doc-only patch close session.** No production schema change. No migration applied. No V-check executed. No fresh empirical evidence beyond v2.90 apply-time verification carried forward.
- **8-item v1.1 doc patch is now CLOSED in docs**, but the brief defects 1–8 + L-v2.90 family represent significant authoring-time gaps that v2.90 apply surfaced. Future brief authoring should incorporate L-v2.90-a (constraint-surface probing) + L-v2.90-b (arity-change DROP discipline) + L-v2.90-d (shadow-table helper coverage audit) + L-v2.90-e (close-the-loop schema validation) upfront.
- **purge_test_case helper case_history coverage gap (L-v2.90-d)** remains open future Wave candidate. v1.1 documented inline workaround pattern; helper itself unchanged.
- **22 outstanding close-the-loop UPDATEs unchanged net from v2.90.**
- **Memory cap 19/30** unchanged.
- **Action_list size at v2.91**: minor growth (v2.91 ADDITIONS block); compaction not yet warranted.
- **Per-session files v2.91**: 1 — `2026-05-19-cc0017e-v1.1-8item-doc-patch.md` (commit `404475172ad54f022a6ccf6203aac06fb824b45d`, 13,800 B).
- **Doc-sync v2.91**: 1+2 split commit per L-v2.85-e baseline (per-session detail standalone + sync_state + action_list atomic via push_files). L-v2.89-a fallback (1+1+1) ready but NOT invoked v2.91.
- **Close-the-loop UPDATEs v2.91: 0** (no D-01 fired). 22 outstanding unchanged.
- **State-capture exceptions v2.91: 0**. Cumulative: 1.
- **Production mutations v2.91: 0.**
- **Dashboard PHASES 44th deferral** carried (was 43 at v2.90; +1 at v2.91). No file-touch v2.91.
- **No decisions.md change.**
- **No Wave 0f work started v2.91** per PK explicit instruction.
- **No mid-session compaction event v2.91.**
- **L-v2.88-a "identical PK-directive loop" 2nd documented occurrence v2.91** — PK re-sent the v2.90 Option A cleanup directive verbatim at session start; Claude hard-stopped, ran read-only state-verification probe (all 7 metrics AS_EXPECTED), presented 4 disposition options; PK redirected to v1.1 doc patch. No re-execution; v2.90 state preserved intact.

---

## Changelog

- v1.0–v2.89: per commit history.
- v2.90 (2026-05-19 Sydney evening, cc-0017e Wave 0e APPLIED-WITH-VCHECK-CORRECTION): cc-0017e v1.0 applied. friction.case_history live + fn_triage_case 11-arg patched + 5 cc-0017d functions byte-stable + 8-row backfill + D-01 `315baf84-...` resolved. 5 brief defects + 4 Path B-prime correctives. 8-item v1.1 doc patch backlog identified. 6 NEW L-v2.90 candidates (a/b HIGH-SIGNAL).
- **v2.91 (2026-05-19 Sydney evening, cc-0017e v1.1 8-item backlog doc patch CLOSED):**
  - Build arc: session start → PK identical-directive loop re-occurrence (re-sent v2.90 Option A cleanup directive verbatim) → Claude hard-stop + read-only state-verification probe (7 metrics AS_EXPECTED) + 4 disposition options presented → PK redirect to v1.1 doc patch → 5 source file reads → atomic push_files (5 files in 1 commit) → read-back spot-check on d01-postapply-deferred.md confirms phantom-column removal → PK directive for sync close → per-session detail standalone commit → sync_state + action_list atomic push_files (this commit).
  - cc-0017e v1.1 8-item backlog doc patch CLOSED at commit `be4e6772f20a73d093f53f609230fb565b1fe0df`. 5 brief files patched atomically.
  - Coverage map: 9 patch points across 5 files — severity (vchecks.md) + category (vchecks.md) + fixture naming (vchecks.md V-D-setup + V-Z1 + step 10) + DROP statement (migration-sql.md §2) + R4 reframe (risks-and-grants.md) + §3 narrowed lockdown scope (risks-and-grants.md) + `resolved_at` phantom removal (d01-postapply-deferred.md §4) + `result_summary` phantom removal (d01-postapply-deferred.md §4) + L-v2.90-a through L-v2.90-f added (lessons-metadata-changelog.md).
  - cc-0017e v1.1 8-item doc patch row in Active table (P2 rank 1 v2.90) → CLOSED v2.91.
  - Reconciliation daily diagnostic PROMOTED P1 rank 1 (was rank 2; unblocked from cc-0017e gating).
  - Health_check V-C3 → rank 2; Platform Reconciliation View → rank 3; close-the-loop/pre-sales/helper extension → rank 4.
  - Gate 13.d (v1.1 8-item doc patch sub-gate) CLOSED v2.91.
  - 0 D-01 fires; T-MCP-02 cum ~86 unchanged. State-capture exceptions cumulative 1 unchanged.
  - L-v2.85-e re-applied **6th consecutive occurrence** v2.91 (v2.86–v2.91). Promotion-confirmed v2.88 carries forward. 1+2 split close v2.91 (per-session detail standalone + sync_state+action_list atomic push_files).
  - L-v2.83-a re-applied at doc patch commit + sync close commit. Cumulative 11+ STRONG.
  - **L-v2.88-a "identical PK-directive loop" 2nd documented occurrence v2.91** (handled via hard-stop + read-only probe + disposition options; no re-execution). Watcher carries forward.
  - L-v2.89-a NOT exercised v2.91 (atomic push_files succeeded on first attempt; fallback ready but not invoked).
  - L-v2.85-a HIGH-SIGNAL NOT re-exercised v2.91 (doc-only; no V-check execution).
  - L-v2.90-a-f NOT empirically re-exercised v2.91 (lessons codified documentationally).
  - L40 / L41 / L46 / L58 / L62 NOT exercised v2.91.
  - No new L-v2.91-X candidates surfaced.
  - Production mutations: 0. Net schema deltas: 0.
  - No decisions.md change.
  - No mid-session compaction event.
  - No state-capture override.
  - Hard-stop discipline preserved end-to-end: 0 re-execution of cc-0017e apply instructions despite PK directive re-send; 0 Wave 0f scope creep; 0 purge_test_case helper changes.
  - Closure budget: ~1h v2.91 (significantly smaller than v2.90 apply session ~4h; in line with prior doc-patch sessions v2.87/v2.89 ~0.5–1h). Trailing-14-day ~31h.
  - Doc-sync: 1+2 split commit per L-v2.85-e baseline (per-session detail standalone `40447517` + sync_state + action_list atomic this commit).
