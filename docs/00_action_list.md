# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-19 Sydney evening (**v2.92 — Health_check V-C3 + signal-production diagnostic CLOSED-PASS**. Empirically validated against 2026-05-17 `nightly-health-check-v1` v3.0 run (`run_id=nightly-health-check-v1/2026-05-17T160210Z`). 4 read-only `execute_sql` checks PASS: (1) `friction.fn_emit_health_check_findings(text,text,jsonb)→jsonb` SECURITY DEFINER owner=postgres signature intact; (2) all 5 markdown finding_ids reconcile 1:1 with `friction.event` rows (source='health_check', severity='critical', category='pipeline_integrity', all case_linked); (3) 0 health_check `emit_error` rows; (4) all-time aggregate shows only the 2026-05-17 v3.0 run as expected. Markdown footer `success_count=5 failure_count=0` empirically true. **NEW P2 follow-up spawned: Cowork scheduling diagnostic — `nightly-health-check-v1` cadence WARN** (rank 2). Of 5 calendar days since brief v3.0 published 2026-05-15, only 1 file produced (20% hit rate). Signal-production contract works when invoked; invocation cadence sparse. **Platform Reconciliation View brief described as next practical planning item per PK directive** (rank 3 — positionally unchanged but first non-wait, non-investigative item). L-v2.85-e re-applied **7th consecutive occurrence** (1+2 split close v2.92). L-v2.83-a re-applied at sync close commit. Cumulative **12+ STRONG**. 0 production mutations / 0 Supabase mutations (sync close itself) / 0 D-01 fires / 0 memory edits / 0 decisions.md edits / 0 Wave 0f / 0 force-run of `nightly-health-check-v1` / 0 force-run of cron 85. T-MCP-02 cum ~86 unchanged. State-capture exceptions cum 1 unchanged. Gate 11 Day 1 of 7 unchanged. Dashboard PHASES **45th deferral**. Per-session detail `2026-05-19-vc3-signal-production-closed.md` commit `55d26d3d07346acd1ab9be91f3c3f92d3ed48842` (11,169 B). sync_state + action_list atomic push_files this commit (1+2 split per L-v2.85-e baseline; L-v2.89-a fallback ready but not invoked).) **Today/Next 4**: Reconciliation daily diagnostic → rank 1 (P1 carry, unchanged, pending natural cron 85 fire); Cowork scheduling diagnostic → rank 2 (P2 NEW); Platform Reconciliation View → rank 3 (P2 carry, **next practical planning item per PK directive**); 5-row close-the-loop / pre-sales / purge_test_case helper extension → rank 4 (P2/P3 carry).

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v2.91.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46-v2.58 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + **L-v2.83-a (STRONG; 12+ v2.92)** + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL; 4 occurrences — promotion-eligible) + L-v2.85-b/c/d carried + **L-v2.85-e PROMOTION-CONFIRMED 7th consecutive v2.92 (carries forward from v2.88)** + 5 L-v2.86 candidates + **L-v2.88-a (2 occurrences — watcher)** + L-v2.88-b/c/d candidates + L-v2.89-a candidate (carry) + **L-v2.90-a through L-v2.90-f candidates** (a/b HIGH-SIGNAL; c/d/e/f candidates). **D-IOL-001 (v2.77)** carried. **D-CC-0017B-Q1** carried.

**v2.92 ADDITIONS:**

- **Health_check V-C3 + signal-production diagnostic CLOSED-PASS v2.92**. Empirical evidence from 4 read-only `execute_sql` checks against project `mbkmaxqhsohbtwsqolns`:
  1. `friction.fn_emit_health_check_findings(p_run_id text, p_markdown_path text, p_findings jsonb)` returns `jsonb`, SECURITY DEFINER, owner=postgres — matches `nightly-health-check-v1` v3.0 brief §12 pre-flight contract exactly.
  2. 5 `friction.event` rows for run_id `nightly-health-check-v1/2026-05-17T160210Z` reconcile 1:1 with the 5 P1 finding_ids in `docs/audit/health/2026-05-17.md` Section 10:
     - `priority-1/true-stuck-instagram-care-for-welfare-pty-ltd` → event_id `1e1ca526-…`
     - `priority-1/true-stuck-instagram-invegent` → event_id `db2de5da-…`
     - `priority-1/true-stuck-linkedin-property-pulse` → event_id `83b97248-…`
     - `priority-1/true-stuck-youtube-ndis-yarns` → event_id `2b0f378e-…`
     - `priority-1/true-stuck-youtube-property-pulse` → event_id `38cabb5e-…`
     All 5: source='health_check', reported_by='system', severity='critical', category='pipeline_integrity', case_linked=true, observed_at=2026-05-17 16:08:35.202881 UTC.
  3. `friction.emit_error` for health_check pattern: 0 rows. Markdown footer `failure_count=0` empirically true.
  4. All-time aggregate: only run_id `2026-05-17T160210Z` appears with 5 events. Earlier markdown files (2026-05-02/04/05) predate v3.0 emission and correctly absent.

- **Cowork scheduling diagnostic — `nightly-health-check-v1` cadence WARN** — NEW v2.92 follow-up, P2 rank 2. Cadence record over 18 calendar days from 2026-05-02 to 2026-05-19: 4 daily files (~22% hit rate). Over 5 days since brief v3.0 published 2026-05-15: 1 file (20% hit rate). Signal-production contract works when invoked; invocation cadence sparse. Root-cause candidates: Cowork agent uptime / idempotency-check false positives / schedule misconfiguration / task paused. Recommended next step (when PK directs): read-only probe of `docs/runtime/runs/nightly-health-check-v1-*.md` state files + Cowork agent run history.

- **Hard stops respected v2.92:**
  - 0 production mutations / 0 Supabase mutations (sync close itself); 4 read-only `execute_sql` calls earlier for V-C3 evidence (already reported, no mutations)
  - 0 DDL / 0 apply_migration / 0 D-01 fires
  - 0 Wave 0f scope creep
  - 0 force-run of `nightly-health-check-v1`
  - 0 force-run of cron 85
  - 0 production code edits (Dashboard PHASES **45th consecutive deferral** carries forward)
  - 0 memory edits / 0 decisions.md edits
  - 0 `purge_test_case` helper changes
  - 0 re-execution of cc-0017e apply instructions

- **Sync close mechanics v2.92 (1+2 split per L-v2.85-e baseline — 7th consecutive occurrence):**
  1. Per-session detail standalone commit `55d26d3d07346acd1ab9be91f3c3f92d3ed48842` (`docs/runtime/sessions/2026-05-19-vc3-signal-production-closed.md`, 11,169 B) via create_or_update_file.
  2. sync_state + action_list atomic commit this commit via push_files (2 files).
  
  L-v2.89-a fallback (1+1+1) ready but not invoked unless atomic push_files times out.

- **L-v2.85-e re-applied 7th consecutive occurrence** (v2.86 + v2.87 + v2.88 + v2.89 + v2.90 + v2.91 + v2.92); promotion-confirmed v2.88 carries forward.
- **L-v2.83-a re-applied** at sync close commit. Cumulative **12+ STRONG**.
- **L-v2.88-a NOT re-occurring v2.92** — PK directive forward-looking close-and-spawn, not directive-loop. Watcher (2 occurrences total) carries forward.
- **L-v2.89-a NOT actively exercised v2.92** — atomic push_files in flight; fallback ready.
- **L-v2.85-a HIGH-SIGNAL NOT re-exercised v2.92** (doc-sync only; no V-check execution).
- **L-v2.86-a HIGH-SIGNAL NOT re-exercised v2.92** (no apply).
- **L-v2.90-a-f NOT re-exercised v2.92** (no apply; codified documentationally v2.91 only).
- **L40 / L41 / L46 / L58 / L62 NOT exercised v2.92** (no DB / no DDL / no D-01 / no apply).

- **No new L-v2.92-X candidates surfaced.** Mechanical close-and-spawn session.

- **Closed Active rows v2.92:** Health_check V-C3 + signal-production diagnostic (P1 rank 2 v2.91) → **CLOSED-PASS** ✅. Evidence preserved in `friction.event` rows + `docs/audit/health/2026-05-17.md` markdown + per-session detail.
- **Spawned Active rows v2.92:** Cowork scheduling diagnostic — `nightly-health-check-v1` cadence WARN (P2 NEW, rank 2).
- **Promoted Active rows v2.92:** Platform Reconciliation View brief authoring (rank 3 v2.91 → rank 3 v2.92, positionally unchanged but **described as next practical planning item per PK directive**).

- **Dashboard PHASES sync: 45th consecutive deferral** (was 44 at v2.91; +1 at v2.92). No file-touch v2.92.
- **NO decisions.md change v2.92.** Doc-sync close; no new architectural decisions.
- **Session compaction event v2.92:** 0.
- **Production mutations v2.92: 0.**
- **D-01 fires v2.92: 0.**
- **T-MCP-02 cum v2.92: ~86 unchanged** (no MCP probes; no ask_chatgpt_review called).
- **State-capture exceptions v2.92: 0.** Cumulative: 1 unchanged.
- **Close-the-loop UPDATEs v2.92: 0** (no D-01 fired). 22 outstanding unchanged.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | 1 (recon daily diagnostic — V-C3 closed v2.92) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~32h (v2.83 1h + v2.84 ~2h + v2.85 ~3h + v2.86 ~3.5h + v2.87 ~0.5h + v2.88 ~1.5h + v2.89 ~1h + v2.90 ~4h + v2.91 ~1h + v2.92 ~1h) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.92 cycle: ~1h total** (V-C3 read-only diagnostic ~0.5h earlier + sync close ~0.5h). 0 schema mutations. 0 D-01 fires. 2 git commits (per-session detail standalone + sync_state+action_list atomic). **State-capture exception count v2.92: 0** (cumulative 1).

---

## ⭐ Today / Next 5

> Last rebuilt: 2026-05-19 Sydney evening (v2.92).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Reconciliation daily cadence diagnostic** | **P1 carry, rank 1 v2.92 (UNCHANGED)** | First post-cc-0017e cron 85 fire still pending. Next scheduled 2026-05-19 17:30 UTC ≈ 2026-05-20 03:30 AEST. Latest fire in `cron.job_run_details` is 2026-05-18 17:30:00 UTC (succeeded, pre-cc-0017e). | chat → PK | Re-run 9-check diagnostic after natural fire lands. |
| 2 | **Cowork scheduling diagnostic — `nightly-health-check-v1` cadence WARN** | **P2 NEW v2.92, rank 2** | Signal-production validated v2.92 (V-C3 CLOSED-PASS); only 1 v3.0 run since brief published 2026-05-15. Read-only investigation. | chat → PK | Read-only probe of `docs/runtime/runs/nightly-health-check-v1-*.md` state files + Cowork agent run history. |
| 3 | **Platform Reconciliation View brief authoring** | **P2 carry, rank 3 (described as next practical planning item per PK directive)** | First non-wait, non-investigative item in queue. PK greenlight required. | PK → chat | When PK directs. |
| 4 | **5-row close-the-loop batch sweep / Pre-sales criteria refinement / `purge_test_case` helper case_history extension** | **P2/P3 carry, rank 4** | 22 outstanding close-the-loop UPDATEs (unchanged net by v2.92); Pre-sales 3-clock criteria per memory entry; helper case_history extension future Wave 0f candidate (L-v2.90-d). | chat → PK | When PK directs. |

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Passive observation v2.92**: Cron 82-86 unchanged. PRV v1 operator views queryable. friction.* state: 10 tables, 19 functions (fn_triage_case 11-arg only), 29 cases + 29 events (baseline preserved), 8 case_history rows (backfill only). Cowork brief `nightly-health-check-v1` v3.0 signal-production contract empirically validated v2.92. Next fires: cron 85 daily; cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (v2.92 unchanged from v2.91)

**Status v2.92: ✅ Wave 0 + Wave 0d + Wave 0e COMPLETE. Gates 10+12+13 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE Day 1 of 7. Wave 0f NOT YET SCOPED — candidates: items B/E/F/G deferred from cc-0017e + purge_test_case helper case_history extension.**

**Documents (v2.92 changes):**
- All briefs unchanged from v2.91. No new brief authored v2.92.
- Per-session files: v2.79–v2.91 unchanged; **v2.92 at `2026-05-19-vc3-signal-production-closed.md` (commit `55d26d3d07346acd1ab9be91f3c3f92d3ed48842`, 11,169 B)**

**Open gates v2.92:**
1-9. ✅ PK approval + cc-0017a/b/c brief authoring + D-01 cycles + cc-0017c v1.0+v1.1 D-01 fires
10. ✅ cc-0017c apply (CLOSED v2.85)
11. ⏳ **1-week empirical observation window** ACTIVE 2026-05-19 → 2026-05-26 (Day 1 of 7 unchanged v2.92)
12. ✅ cc-0017d Wave 0d apply (CLOSED v2.86) + v1.1 doc patch CLOSED v2.87
13. ✅ cc-0017e Wave 0e — all 4 sub-gates CLOSED:
    - 13.a Authoring sub-gate ✅ CLOSED v2.88
    - 13.b v1.1 doc patch sub-gate ✅ CLOSED v2.89 at `587ee4ac`
    - 13.c Apply sub-gate ✅ CLOSED v2.90 (APPLIED-WITH-VCHECK-CORRECTION)
    - 13.d v1.1 8-item backlog doc patch sub-gate ✅ CLOSED v2.91 at `be4e6772`

---

## 🟢 cc-0017e Wave 0e — STATUS BLOCK (UPDATED v2.92)

**Status: ✅ APPLIED-WITH-VCHECK-CORRECTION v2.90 + v1.1 8-item BACKLOG CLOSED v2.91. Unchanged v2.92.**

**Production state (post-v2.92 unchanged from v2.90+v2.91):**
- `friction.case_history` exists with cc-0017c lockdown grants (postgres full + service_role SELECT only; no anon/auth/PUBLIC)
- `friction.fn_triage_case` 11-arg patched body (legacy 10-arg dropped)
- 5 cc-0017d mutation functions patched byte-stable
- 8 acknowledged-legacy cases backfilled
- 8 backfill rows in case_history (change_kind='backfill')
- D-01 `315baf84-...` resolved/applied_with_correction/resolved_by=cc-0017e-close-v2.90

**Brief defects 1-8 + L-v2.90 family disposition:** all 9 patch points covered in v2.91 commit `be4e6772`. Unchanged v2.92.

---

## 🟢 Cowork brief `nightly-health-check-v1` — STATUS BLOCK (NEW v2.92)

**Status v2.92: ✅ FROZEN at v3.0. Signal-production contract EMPIRICALLY VALIDATED (V-C3 CLOSED-PASS). Cadence WARN flagged separately.**

**Signal-production layer (V-C3) — CLOSED-PASS v2.92:**
- Brief v3.0 published 2026-05-15. Adds dual-write to `friction.event` via `friction.fn_emit_health_check_findings(text, text, jsonb)` SECURITY DEFINER function.
- First v3.0 run: 2026-05-17T160210Z. 5 P1 findings emitted. `success_count=5 failure_count=0`.
- V-C3 evidence (4 read-only checks v2.92):
  1. Function signature intact (matches brief §12).
  2. 5 friction.event rows reconcile 1:1 with markdown finding_ids; source='health_check', severity='critical', category='pipeline_integrity', all case_linked.
  3. 0 health_check emit_errors.
  4. All-time aggregate clean (only the 2026-05-17 v3.0 run appears).
- Sunset review extended to 2026-06-15 per cc-0014 IOL Day-19 verdict pending.

**Cadence layer — WARN v2.92 (separate from V-C3):**
- Of 18 calendar days 2026-05-02 to 2026-05-19: 4 daily files (~22% hit rate).
- Of 5 calendar days since v3.0 publish 2026-05-15: 1 file (20% hit rate). Missing: 2026-05-16, 2026-05-18, 2026-05-19.
- Investigation deferred to next session per rank 2 P2 carry. Read-only probe candidates: state files at `docs/runtime/runs/nightly-health-check-v1-*.md`; Cowork agent run history.

---

## 🟢 cc-0017d / cc-0017c / cc-0017b / cc-0017a / cc-0014 / cc-0015 / cc-0016 / cc-0012 / cc-0010A/B/C / cc-0011 / cc-0009 — STATUS BLOCKS

**v2.92 updates:** unchanged from v2.91. All earlier waves preserved. cc-0015 (Wave 7) + cc-0016 (Wave 8) still gated on observation window + sequencing.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v2.92)

**L41**: cumulative v2.80-v2.92 = 11 (no new exercises v2.92 — doc-sync only).
**L40 / L46 / L58 / L62**: not exercised v2.92.
**L-v2.78-a / L-v2.81-a**: 2 occurrences each, promotion-eligible (unchanged).
**L-v2.83-a**: **12+ occurrences v2.92** (re-applied at sync close commit). STRONG CANDIDATE confirmed.
**L-v2.84-a/b/c/d**: unchanged.
**L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v2.92; not re-exercised in doc-sync only).
**L-v2.85-b/c/d**: not re-exercised v2.92.
**L-v2.85-e**: **re-applied v2.92 — 7th consecutive occurrence** (v2.86 → v2.92). 1+2 split close. PROMOTION-CONFIRMED v2.88 carries forward.
**L-v2.86-a HIGH-SIGNAL**: not re-exercised v2.92.
**L-v2.86-b/c/d/e**: not re-exercised v2.92.
**L-v2.88-a**: 2 occurrences (v2.88 + v2.91); NOT re-occurring v2.92. Watcher carries forward.
**L-v2.88-b/c/d**: realised v2.90; carry forward.
**L-v2.89-a**: atomic push_files in flight v2.92; fallback ready but not actively exercised.
**L-v2.90-a-f**: codified documentationally v2.91. Not empirically re-exercised v2.92. Watchers.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated. Day 1 of 7 unchanged v2.92 (same calendar day as v2.86-v2.91 closes; no elapsed observation time).
- **First cc-0017e-post-apply cron 85 fire** pending — diagnostic **P1 rank 1 v2.92** (unchanged).
- **Cowork `nightly-health-check-v1` cadence WARN** — NEW v2.92. Investigation rank 2 P2.
- No new v2.92 calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v2.92: **0 D-01 fires.** T-MCP-02 cum **~86 unchanged** v2.92. L46 NOT exercised v2.92 (no D-01). L62 NOT exercised v2.92. State-capture exceptions v2.92: 0 (cum 1). Close-the-loop UPDATEs v2.92: 0. **22 outstanding unchanged net.**

---

## 🤖 Cowork automation (D182)

**v2.92 update:** Cron 82/83/86 firing normally. **V-C3 signal-production CLOSED-PASS v2.92** (replaces prior v2.91 "V-C3 PENDING" — empirically validated against 2026-05-17 v3.0 run). **NEW: Cowork scheduling cadence WARN v2.92** — `nightly-health-check-v1` brief firing ~20% of scheduled days since v3.0 publish. Separate investigation item rank 2.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Reconciliation daily diagnostic** | First post-cc-0017e cron 85 fire | **P1 carry, rank 1 v2.92 (UNCHANGED)** | OPEN. Next scheduled fire 2026-05-19 17:30 UTC ≈ 2026-05-20 03:30 AEST. | chat → PK | Re-run 9-check diagnostic after natural fire. |
| **Cowork scheduling diagnostic — `nightly-health-check-v1` cadence WARN** | Brief firing ~20% of scheduled days since v3.0 publish 2026-05-15 | **P2 NEW v2.92, rank 2** | OPEN. V-C3 signal-production layer validated v2.92; invocation cadence sparse. | chat → PK | Read-only probe of state files + Cowork agent run history. |
| **Platform Reconciliation View brief** | Reconciliation surface design | **P2 carry, rank 3 (next practical planning item per PK directive v2.92)** | NOT YET STARTED. First non-wait, non-investigative item in queue. | PK → chat | When PK directs. |
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
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (12+ occurrences v2.92; STRONG CANDIDATE)** | Re-applied at sync close commit v2.92. | chat → next lesson cycle | Promote. |
| **L-v2.84-a/b/c candidates** | Empirical precedence / idempotent REVOKE/GRANT / Path A corrected_action | P3 carry | 1 occurrence each. | chat → next session | Watcher. |
| **L-v2.84-d candidate** | Schema-probe-before-DML | P3 carry (2 occurrences) | Related to L-v2.90-a. | chat → next session | Promote-eligible co-promotion candidate. |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | P3 (4 occurrences; promotion-eligible; not re-exercised v2.92 doc-sync only) | Promotion-eligible carries forward. | chat → next lesson cycle | Promote. |
| **L-v2.85-b** | Inline V-check rewrite Path 1 / Path B-prime | P3 (carry; not re-exercised v2.92) | v2.90 ×4. | chat → next session | Watcher. |
| **L-v2.85-c** | SECURITY DEFINER bypass post REVOKE | P3 (1 occurrence) | Not re-exercised v2.92. | chat → next session | Watcher. |
| **L-v2.85-d** | Postgres-owner cleanup migration | P3 (REALIZED v2.86; re-exercised v2.90; not re-exercised v2.92) | Carries forward. | chat → next session | Watcher. |
| **L-v2.85-e** | push_files length budget — split-commit mitigation | **P3 (PROMOTION-CONFIRMED v2.88; 7th consecutive occurrence v2.92)** | 1+2 split close v2.92. | chat → next lesson cycle | **PROMOTE.** |
| **L-v2.86-a candidate (HIGH-SIGNAL)** | Pre-apply syntactic validation via transactional EXEC | P3 (PARTIALLY exercised v2.90; not re-exercised v2.92) | Lesson scope clarified v1.1. | chat → next session | Watcher with refined scope. |
| **L-v2.86-b/c/d/e candidates** | out_-prefix / ROWTYPE quoting / CHECK pre-validation / slash-prefix fixture convention | P3 (b+c exercised v2.90 byte-stable; d+e unchanged; none re-exercised v2.92) | Carry. | chat → next session | Cross-brief carry. |
| **L-v2.88-a candidate** | Identical PK-directive loop | **P3 (2 occurrences v2.88 + v2.91; NOT re-occurring v2.92; watcher)** | Carries forward. | chat → next lesson cycle | Pair-promote with L-v2.85-e. |
| **L-v2.88-b/c/d candidates** | V-Z3 alignment / probe re-verification gate / in-function INSERT pattern | P3 (b realised v2.90; c REALISED v2.90; d realised v2.90; none re-exercised v2.92) | Carry forward. | chat → next lesson cycle | Promote after one more cycle. |
| **L-v2.89-a candidate** | push_files atomic timeout → 1+1+1 fallback | P3 (1 occurrence v2.89; not re-exercised v2.92 — atomic in flight; fallback ready) | Watcher. | chat → next session | Pair-promote with L-v2.85-e. |
| **L-v2.90-a (HIGH-SIGNAL)** | V-D fixture constraint-surface probing | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.92) | Caught 2 defects at v2.90 apply. | chat → next session | Watcher; pair with L-v2.84-d. |
| **L-v2.90-b (HIGH-SIGNAL)** | CREATE OR REPLACE FUNCTION arity change → explicit DROP | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.92) | Caught Defect 3. | chat → next session | Watcher. |
| **L-v2.90-c** | V-D fixture naming purge_test_case regex | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.92) | Caught Defect 4. | chat → next session | Watcher. |
| **L-v2.90-d** | Shadow tables + helper coverage gap audit | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.92) | Caught Defect 5; informs purge_test_case extension future Wave brief. | chat → next session | Watcher. |
| **L-v2.90-e** | Close-the-loop SQL template schema validation | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.92) | Caught Defects 6 + 7. | chat → next session | Watcher. |
| **L-v2.90-f** | Risk/grants verification clauses match actual lockdown scope | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.92) | Caught Defect 8. | chat → next session | Watcher. |
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
| **Parallel agent coordination (L47)** | informational | P3 carry | No interference v2.92. | chat → future | Passive. |
| **Other carries** | Dashboard mobile / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged from v2.86-v2.91. | various | various |

**Closed v2.92:**
- **Health_check V-C3 + signal-production diagnostic** (P1 rank 2 v2.91) → **CLOSED-PASS** ✅. Empirically validated against 2026-05-17 v3.0 run. Evidence preserved in `friction.event` rows + `docs/audit/health/2026-05-17.md` markdown + per-session detail `55d26d3d`.

**Spawned v2.92:**
- **Cowork scheduling diagnostic — `nightly-health-check-v1` cadence WARN** (P2 NEW, rank 2). Separate from signal-production layer.

**Closed earlier:** v2.91 cc-0017e v1.1 8-item doc patch; v2.90 cc-0017e apply; v2.89 cc-0017e v1.1 column-name patch; v2.88 Wave 0e brief authoring; v2.87 cc-0017d v1.1 doc patch; v2.86 cc-0017d apply; v2.85 cc-0017c apply; v2.84 brief authoring + 2× D-01; v2.83 cc-0017b v1.1 doc patch; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.80 cc-0017a authoring; v2.79 PK approval gate.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v2.91.

---

## 📌 Backlog

**v2.92 state changes:**
- **Health_check V-C3 + signal-production diagnostic** (P1 rank 2 v2.91) → **CLOSED-PASS v2.92**. Empirically validated.
- **Cowork scheduling diagnostic — `nightly-health-check-v1` cadence WARN** → **NEW v2.92 P2 rank 2**.
- Reconciliation daily diagnostic → **P1 rank 1 (UNCHANGED)** — still pending natural cron 85 fire.
- Platform Reconciliation View → **rank 3 (UNCHANGED positionally; described as next practical planning item per PK directive v2.92)**.
- close-the-loop sweep / pre-sales / purge_test_case helper extension → **rank 4 (UNCHANGED)**.
- Friction Register Consolidation Plan: all 4 sub-gates of Gate 13 CLOSED — unchanged v2.92.
- T-MCP-02 cum ~86 unchanged.
- State-capture exceptions cum 1 unchanged.
- friction.* schema state: unchanged from v2.90+v2.91.
- L-v2.85-e mitigation re-applied **7th consecutive occurrence v2.92** (promotion-confirmed v2.88 carries forward).
- L-v2.83-a re-applied at sync close commit. Cumulative **12+ STRONG**.
- L-v2.88-a NOT re-occurring v2.92. Watcher (2 occurrences total) carries forward.
- L-v2.85-a HIGH-SIGNAL not re-exercised v2.92 (doc-sync only). 4 occurrences, promotion-eligible carries forward.
- L-v2.90-a-f not re-exercised v2.92. Watchers.
- Dashboard PHASES **45th deferral** carried (was 44; +1 v2.92). No file-touch.
- **No decisions.md change v2.92.**

---

## 🧊 Frozen / Deferred

Unchanged from v2.85-v2.91.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e + L-v2.88-a-d + L-v2.89-a + L-v2.90-a-f candidates carried per v2.92.

- **L40 / L41 / L46 / L58 / L62**: not exercised v2.92 (doc-sync only).
- **L-v2.76-a-f**: not re-exercised v2.92.
- **L-v2.78-a**: 2 occurrences (unchanged).
- **L47**: 1 occurrence (unchanged).
- **L-v2.81-a**: 2 occurrences (unchanged).
- **L-v2.83-a**: **12+ occurrences v2.92** (re-applied at sync close commit). STRONG CANDIDATE confirmed.
- **L-v2.84-a/b/c**: 1 occurrence each (unchanged).
- **L-v2.84-d**: 2 occurrences unchanged; related to L-v2.90-a.
- **L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v2.92; not re-exercised in doc-sync only).
- **L-v2.85-b**: 4× v2.90; not re-exercised v2.92.
- **L-v2.85-c**: 1 occurrence (unchanged).
- **L-v2.85-d**: REALIZED v2.86 + re-exercised v2.90; not re-exercised v2.92.
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88; 7th consecutive occurrence v2.92**.
- **L-v2.86-a (HIGH-SIGNAL)**: PARTIALLY exercised v2.90; not re-exercised v2.92.
- **L-v2.86-b/c**: exercised v2.90 byte-stable; not re-exercised v2.92.
- **L-v2.86-d/e**: unchanged.
- **L-v2.88-a**: 2 occurrences (v2.88 + v2.91); NOT re-occurring v2.92. Watcher.
- **L-v2.88-b**: realised v2.90 (V-Z3 live).
- **L-v2.88-c**: REALISED v2.90 (probe re-verification at apply).
- **L-v2.88-d**: realised v2.90.
- **L-v2.89-a**: 1 occurrence v2.89; not re-exercised v2.92 (atomic push_files in flight; fallback ready).
- **L-v2.90-a-f**: codified documentationally v2.91; not empirically re-exercised v2.92. Watchers.

All candidates recommended for promotion at appropriate cycle once empirical evidence accumulates. **L-v2.85-e + L-v2.85-a + L-v2.83-a remain the highest-priority promotions at next lesson cycle; L-v2.88-a now eligible (2 occurrences); L-v2.90-a + L-v2.90-b (both HIGH-SIGNAL) join the watch.**

---

## v2.92 honest limitations

- All v2.31–v2.91 limitations apply.
- **V-C3 close is empirically anchored to a single v3.0 run** (2026-05-17T160210Z). The contract validates correctly for that run; future runs will continue to validate or break the contract daily. The Cowork-cadence WARN means the contract is not being exercised daily as the schedule intends.
- **No fresh production state change v2.92.** Sync close documents existing read-only diagnostic evidence; signal-production layer was already working when this session opened.
- **22 outstanding close-the-loop UPDATEs unchanged net from v2.91.**
- **Memory cap 19/30** unchanged.
- **Action_list size at v2.92**: minor growth (v2.92 ADDITIONS block + Cowork brief STATUS BLOCK + Active table row swap); compaction not yet warranted.
- **Per-session files v2.92**: 1 — `2026-05-19-vc3-signal-production-closed.md` (commit `55d26d3d07346acd1ab9be91f3c3f92d3ed48842`, 11,169 B).
- **Doc-sync v2.92**: 1+2 split commit per L-v2.85-e baseline (per-session detail standalone + sync_state + action_list atomic via push_files). L-v2.89-a fallback (1+1+1) ready but NOT invoked v2.92.
- **Close-the-loop UPDATEs v2.92: 0** (no D-01 fired). 22 outstanding unchanged.
- **State-capture exceptions v2.92: 0**. Cumulative: 1.
- **Production mutations v2.92: 0.**
- **Dashboard PHASES 45th deferral** carried (was 44 at v2.91; +1 at v2.92). No file-touch v2.92.
- **No decisions.md change.**
- **No Wave 0f work started v2.92** per PK explicit instruction.
- **No mid-session compaction event v2.92.**

---

## Changelog

- v1.0–v2.90: per commit history.
- v2.91 (2026-05-19 Sydney evening, cc-0017e v1.1 8-item backlog doc patch CLOSED): see prior changelog.
- **v2.92 (2026-05-19 Sydney evening, Health_check V-C3 signal-production CLOSED-PASS + Cowork-cadence WARN spawned):**
  - Build arc: session start → PK directive to close V-C3 using prior session read-only evidence + spawn Cowork-cadence WARN as new P2 + promote PRV brief to next practical planning item → compose per-session detail → standalone commit → compose sync_state + action_list updates → atomic push_files (this commit).
  - Health_check V-C3 + signal-production diagnostic CLOSED-PASS v2.92. Empirically validated against 2026-05-17 `nightly-health-check-v1` v3.0 run (`run_id=nightly-health-check-v1/2026-05-17T160210Z`). 4 read-only checks PASS.
  - NEW Cowork scheduling diagnostic — `nightly-health-check-v1` cadence WARN spawned as P2 rank 2 follow-up. ~20% hit rate over 5-day v3.0 window.
  - Health_check V-C3 row in Active table (P1 rank 2 v2.91) → CLOSED-PASS v2.92.
  - Cowork scheduling diagnostic row added to Active table (P2 NEW v2.92).
  - Platform Reconciliation View → rank 3 unchanged positionally; described as next practical planning item per PK directive.
  - Reconciliation daily diagnostic → rank 1 unchanged (P1; still pending natural cron 85 fire).
  - close-the-loop / pre-sales / purge_test_case helper extension → rank 4 unchanged.
  - 0 D-01 fires; T-MCP-02 cum ~86 unchanged. State-capture exceptions cumulative 1 unchanged.
  - L-v2.85-e re-applied **7th consecutive occurrence** v2.92 (v2.86–v2.92). Promotion-confirmed v2.88 carries forward. 1+2 split close v2.92.
  - L-v2.83-a re-applied at sync close commit. Cumulative **12+ STRONG**.
  - L-v2.88-a NOT re-occurring v2.92 (PK directive forward-looking close-and-spawn). Watcher (2 occurrences total) carries forward.
  - L-v2.89-a NOT actively exercised v2.92 (atomic push_files in flight; fallback ready).
  - L-v2.85-a HIGH-SIGNAL NOT re-exercised v2.92 (doc-sync only; no V-check execution).
  - L-v2.90-a-f NOT empirically re-exercised v2.92.
  - L40 / L41 / L46 / L58 / L62 NOT exercised v2.92.
  - No new L-v2.92-X candidates surfaced.
  - Production mutations: 0. Net schema deltas: 0.
  - No decisions.md change.
  - No mid-session compaction event.
  - No state-capture override.
  - Hard-stop discipline preserved end-to-end: 0 force-run of `nightly-health-check-v1`; 0 force-run of cron 85; 0 Wave 0f scope creep; 0 purge_test_case helper changes; 0 production code edits (Dashboard PHASES **45th deferral**).
  - Closure budget: ~1h v2.92 (significantly smaller than v2.90 apply session ~4h; in line with prior doc-sync sessions v2.87/v2.89 ~0.5–1h). Trailing-14-day ~32h.
  - Doc-sync: 1+2 split commit per L-v2.85-e baseline (per-session detail standalone `55d26d3d` + sync_state + action_list atomic this commit).
