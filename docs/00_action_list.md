# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-19 Sydney evening (**v2.88 — cc-0017e Wave 0e v1.0 brief AUTHORED-PENDING-APPLY at commit chain `8502fc49a0d981e95f8fed6bd7c3ece438fc669c → 1659b293da007ced41a6d0b08def1061dd38a414 → d349bdfecc1629dbaeca0d5cea579e69d9d03461`. 8 files landed and verified (main brief `a50e26e6` + migration-sql `d1946d7a` + vchecks `eef59ec5` + risks-and-grants `b52f1d8b` + preflight-pset `268f973b` + hardstop-rollback `1e3ddd07` + d01-postapply-deferred `237ae898` + lessons-metadata-changelog `e5ffac0f`). Scope: `friction.case_history` shadow table + 5 cc-0017d mutation function patches for in-function history INSERTs + `fn_triage_case` external-compat patch + 8-row acknowledged legacy backfill + V-Z3 residue cross-check convention codified. PK scope locked: A/C/D/H/A-extended IN; B/E/F/G OUT/DEFER. **0 production mutations. 0 apply_migration. 0 D-01 fires. 0 Wave 0f scope creep.** **Open anomaly:** preflight-pset.md §P3.2 + d01-postapply-deferred.md §3-4 reference m.chatgpt_review.review_id/proposal_text — actual columns are id/proposal. **cc-0017e v1.1 doc patch BLOCKS any D-01/apply.** Wave 0e brief authoring CLOSED rank 1 P1 v2.87 → cc-0017e v1.1 doc patch promoted as new rank 1 P1 v2.88; cc-0017e apply session promoted as new rank 2 P1 v2.88. T-MCP-02 cum ~85 unchanged. State-capture exceptions cum 1 unchanged. Dashboard PHASES 41st deferral. 4 new L-v2.88-a/b/c/d candidates (HINT-string false-positive + V-Z3 alignment + probe re-verification gate + in-function INSERT pattern). L-v2.85-e re-applied 3rd consecutive occurrence — **PROMOTION-CONFIRMED**. Per-session detail at `2026-05-19-cc0017e-v1.0-authored.md` (commit `5d1935cd`). Sync close via 1+2 split per L-v2.85-e mitigation.**) **Today/Next 5**: cc-0017e v1.1 doc patch → rank 1 (NEW P1, BLOCKS apply); cc-0017e apply session → rank 2 (NEW P1, gated on v1.1 doc patch); reconciliation daily diagnostic → rank 3; health_check V-C3 → rank 4; Platform Reconciliation View → rank 5.

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v2.87.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46-v2.58 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a (STRONG; 7+) + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL applied) + L-v2.85-b/c/d carried + **L-v2.85-e PROMOTION-CONFIRMED 3rd consecutive v2.88** + 5 L-v2.86 candidates + **4 new L-v2.88-a/b/c/d candidates**. **D-IOL-001 (v2.77)** carried. **D-CC-0017B-Q1** carried.

**v2.88 ADDITIONS:**

- **cc-0017e Wave 0e v1.0 brief AUTHORED-PENDING-APPLY** at commit chain `8502fc49 → 1659b293 → d349bdfe`. 8 files landed across 3 commits per L-v2.85-e split-commit mitigation (3rd consecutive occurrence). Read-back verified at sync close: all blob SHAs match push_files/create_or_update_file responses byte-for-byte.
- **8-file inventory:**
  - `docs/briefs/cc-0017e-friction-case-history-and-compat.md` (`a50e26e6`, 21,698 B) — main brief
  - `docs/briefs/cc-0017e/migration-sql.md` (`d1946d7a`, 27,203 B) — DDL + 5 mutation function patches + fn_triage_case patch + 8-row backfill CTE + COMMENTs; L-v2.86-a transactional EXEC pre-apply harness documented
  - `docs/briefs/cc-0017e/vchecks.md` (`eef59ec5`, 19,661 B) — V-A through V-Z matrix; **V-Z3 convention codified §X** (operation-alignment-equals-shadow-row-count invariant)
  - `docs/briefs/cc-0017e/risks-and-grants.md` (`b52f1d8b`, 9,346 B) — grant matrix (case_history service_role SELECT-only, cc-0017c lockdown pattern preserved) + risk register R1-R7
  - `docs/briefs/cc-0017e/preflight-pset.md` (`268f973b`, 7,996 B) — P1-P5 Lesson 61 pre-apply discipline (**ANOMALY: §P3.2 references review_id/proposal_text — v1.1 doc patch needed**)
  - `docs/briefs/cc-0017e/hardstop-rollback.md` (`1e3ddd07`, 9,077 B) — forward-only convention; per-section rollback; abort conditions; recovery paths
  - `docs/briefs/cc-0017e/d01-postapply-deferred.md` (`237ae898`, 9,113 B) — D-01 fire template + idempotency check + close-the-loop UPDATE template (**ANOMALY: §3-4 references review_id/proposal_text — v1.1 doc patch needed**)
  - `docs/briefs/cc-0017e/lessons-metadata-changelog.md` (`e5ffac0f`, 10,992 B) — 4 L-v2.88 candidates documented + authoring metadata table + v1.0 changelog
- **PK scope confirmed:**
  - IN: A (case_history shadow table; emission_rule_history precedent shape) + C (fn_triage_case external-compat patch with optional p_actor 11th arg; defensive prospective protection — P6 corrected P3's false-positive in-DB caller finding) + D (8-row acknowledged legacy backfill via CTE; `triaged_at = COALESCE(reviewed_at, updated_at)`, sentinel `'legacy_backfill'`) + H (V-Z3 convention codified inline in vchecks.md §X, no new process doc) + A-extended (all 5 cc-0017d mutation functions patched to INSERT case_history with semantic change_kind: triage/resolve/reopen/mark_duplicate/first_view; trigger-based pattern explicitly rejected per P5b)
  - OUT/DEFER: B (emit_event audit events) + E (fn_triage_case rename/deprecation) + F (write-side CHECK) + G (emit_event rule relaxation) — future Wave 0f or other wave candidates
- **8 read-only authoring probes (P1-P6 + P5a/P5b/P1b):** 9 friction tables; 28 case columns including triaged_at/triaged_by at positions 22/23; 19 friction functions; fn_triage_case body confirmed not writing triaged_at/by; P3 false-positive HINT-string match in resolve_case corrected by P6 body inspection; P4 confirms 8 backfill targets (21 new + 8 acknowledged = 29 baseline); P5b confirms in-function INSERT is canonical (no UPDATE trigger on case; emission_rule has zero triggers); P6 confirms cc-0017d mutation functions byte-stable to authoring expectation.
- **Sync-close verification:** 4 read-only probes — information_schema column probe of m.chatgpt_review (surfaced anomaly); m.chatgpt_review fire count for cc-0017e (0 rows confirmed); baseline preservation check ×2 (29/29/21/8/8/9/0 bit-for-bit identical at sync close).
- **Anomaly disposition:** v1.1 doc patch scope: 2 sub-files corrected (preflight-pset.md §P3.2 SQL query, d01-postapply-deferred.md §3 idempotency check + §4 close-the-loop UPDATE template). Optional 3rd file: lessons-metadata-changelog.md changelog entry. **MUST land BEFORE any D-01 fire for cc-0017e apply.** Severity LOW.
- **Hard stops adhered v2.88:** 0 production mutations / 0 apply_migration / 0 D-01 fires / 0 Wave 0f scope creep.
- **Sync close mechanics:** L-v2.85-e split-commit mitigation re-applied (3rd consecutive occurrence v2.86 + v2.87 + v2.88). Per-session detail standalone at commit `5d1935cd`. This sync_state + action_list update lands as atomic 2-file push_files immediately after. **L-v2.85-e PROMOTION-CONFIRMED per the v2.87 "after one more cycle" criterion.**
- **Wave 0e brief authoring** (rank 1 P1 PROMOTED v2.87) → **CLOSED-AUTHORED v2.88** at commit chain `8502fc49 → 1659b293 → d349bdfe`. **Apply pending v1.1 doc patch + PK directive.**
- **NEW Active rows v2.88:**
  - **cc-0017e v1.1 doc patch** (m.chatgpt_review column-name correction) — P1 rank 1 NEW v2.88. BLOCKS apply.
  - **cc-0017e apply session** — P1 rank 2 NEW v2.88. Gated on v1.1 doc patch + PK directive.
- **Production mutations v2.88: 0.** Schema state end of v2.88 = schema state end of v2.87 = schema state end of v2.86.
- **D-01 fires v2.88: 0.** Brief-authoring + sync close — no production action.
- **T-MCP-02 cum v2.88: ~85 unchanged** (read-only probes do not consume; no ask_chatgpt_review called).
- **State-capture exceptions v2.88: 0.** Cumulative: 1 unchanged.
- **L-series v2.88:** L40 not exercised; L41 not exercised; L46 not exercised; L58 applied 1× (1+2 split close per L-v2.85-e); L62 not exercised. **L-v2.85-e re-applied 3rd consecutive occurrence** (v2.86 + v2.87 + v2.88); **PROMOTION-CONFIRMED**. **L-v2.85-a HIGH-SIGNAL applied proactively** at authoring (P2 + P6 signature probes pre-emptively executed). 4 new L-v2.88 candidates surfaced.
- **Closed Active rows v2.88:** Wave 0e brief authoring (P1 rank 1 PROMOTED v2.87) → **CLOSED-AUTHORED** ✅.
- **Promoted Active rows v2.88:** cc-0017e v1.1 doc patch (NEW P1 rank 1); cc-0017e apply session (NEW P1 rank 2).
- **Dashboard PHASES sync: 41st consecutive deferral** (was 40 at v2.87; +1 at v2.88). No file-touch v2.88.
- **NO decisions.md change.** Brief-authoring close; no new architectural decisions. Open design decisions captured in cc-0017e brief §9, not promoted to architectural decisions.
- **Session compaction event:** 1 mid-authoring (between commit 2 and commit 3). Compaction summary preserved continuity; commit 3 completed post-compaction at `d349bdfe`.
- **Identical PK directive received twice** in successive turns at sync-close verification. Re-verified state matched bit-for-bit; flagged loop pattern to PK; PK directed sync close to proceed.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~4 (cc-0017e v1.1 doc patch + cc-0017e apply gating + recon daily diagnostic + health_check signal diagnostic) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~25h (v2.83 1h + v2.84 ~2h + v2.85 ~3h + v2.86 ~3.5h + v2.87 ~0.5h + v2.88 ~1.5h) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.88 cycle: ~1.5h total.** 0 schema mutations. 0 D-01 fires. 8 read-only authoring probes + 4 read-only sync-close verification probes + 3 brief-authoring commits + 2 sync-close commits. **State-capture exception count v2.88: 0** (cumulative 1).

---

## ⭐ Today / Next 5

> Last rebuilt: 2026-05-19 Sydney evening (v2.88).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0017e v1.1 doc patch** (m.chatgpt_review column-name correction) | **P1 NEW v2.88** | Anomaly surfaced at sync-close verification: 2 sub-files reference review_id/proposal_text but actual columns are id/proposal. BLOCKS any D-01 fire / apply_migration. Doc-only patch; severity LOW. | chat → PK | PK directive; 2-file patch (preflight-pset.md §P3.2 + d01-postapply-deferred.md §3-4); optional 3rd file (lessons-metadata-changelog.md changelog entry); single atomic push_files commit. |
| 2 | **cc-0017e apply session** | **P1 NEW v2.88** | Brief AUTHORED-PENDING-APPLY at commit chain `8502fc49 → 1659b293 → d349bdfe`. Apply gating: v1.1 doc patch + PK directive. | chat → PK | After v1.1 doc patch lands. Full P-set + D-01 fire + apply_migration + V-check matrix (V-A through V-Z including new V-Z3) + close-the-loop. |
| 3 | **Reconciliation daily cadence diagnostic** | P1 carry | First post-cc-0017d cron 85 fire pending. Confirms Wave 0d functions co-exist with cc-0017b wrappers + cc-0017c FK-hardened state. | chat → PK | Post-fire SQL count + emit_event signature check. |
| 4 | **Health_check V-C3 + signal-production diagnostic** | P1 carry | V-C3 still PENDING. Cowork brief v3.0 ready. | Cowork → chat | Check post-fire `docs/audit/health/YYYY-MM-DD.md`. |
| 5 | **Platform Reconciliation View brief authoring** | P2 carry | Reconciliation surface design. PK greenlight required. | PK → chat | When PK directs. |

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Passive observation v2.88**: Cron 82-86 unchanged. PRV v1 operator views queryable. friction.* state: 9 tables, 19 functions (12 from cc-0017a/b/c + 6 from cc-0017d + 1 trigger function tally not previously counted; corrected from v2.87's "18" tally), event_source_check → event_source_fk, service_role SELECT-only on event+case, 6 mediated mutation functions, 29 events + 29 cases (unchanged baseline v2.86 → v2.87 → v2.88). PostgREST exposes `friction`. case_history does NOT yet exist (cc-0017e AUTHORED-PENDING-APPLY). Next fires: cron 85 daily; cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (UPDATED v2.88)

**Status v2.88: ✅ Wave 0 + Wave 0d COMPLETE. Wave 0e brief AUTHORED-PENDING-APPLY. Gates 10+12 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE Day 1 of 7. Gate 13 (Wave 0e) authoring sub-gate CLOSED; apply sub-gate OPEN — next.**

**Documents:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`) — unchanged
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` SIGNED — unchanged
- `docs/briefs/cc-0017a-friction-register-foundational-schema.md` v1.1 — APPLIED v2.81
- `docs/briefs/cc-0017b-friction-register-unified-emit-event.md` v1.1 — APPLIED v2.82
- `docs/briefs/cc-0017c-friction-register-lockdown-and-backfill.md` v1.1 — APPLIED v2.85
- `docs/briefs/cc-0017d-friction-case-mutation-functions.md` v1.1 — APPLIED v2.86 + v1.1 doc patch CLOSED v2.87 at commit `f0367405`
- `docs/briefs/cc-0017e-friction-case-history-and-compat.md` **v1.0 AUTHORED-PENDING-APPLY v2.88** at commit chain `8502fc49 → 1659b293 → d349bdfe`; **v1.1 doc patch BLOCKS apply** for m.chatgpt_review column-name correction
- **Migrations live v2.88**: unchanged from v2.86 — `cc_0017d_friction_case_mutation_functions` + `cc_0017d_vcheck_fixture_seed` + `cc_0017d_vcheck_audit_cleanup` (zero-effect) + `cc_0017d_vcheck_audit_cleanup_v2` (1 row) + `cc_0017d_chatgpt_review_close`. **No new migrations v2.88** (cc-0017e is authored only; apply pending).
- Per-session files: v2.79–v2.87 unchanged; **v2.88 at `2026-05-19-cc0017e-v1.0-authored.md` (commit `5d1935cd`)**

**Open gates v2.88:**
1-9. ✅ PK approval + cc-0017a/b/c brief authoring + D-01 cycles + cc-0017c v1.0+v1.1 D-01 fires
10. ✅ cc-0017c apply (CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.85)
11. ⏳ **1-week empirical observation window** ACTIVE 2026-05-19 → 2026-05-26 (Day 1 of 7 unchanged v2.88; same calendar day)
12. ✅ cc-0017d Wave 0d apply (CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.86) + v1.1 doc patch CLOSED v2.87
13. **Wave 0e** — case history / audit
    - 13.a Authoring sub-gate ✅ CLOSED v2.88 (brief at commit chain `8502fc49 → 1659b293 → d349bdfe`)
    - 13.b v1.1 doc patch sub-gate ⏳ OPEN (m.chatgpt_review column-name correction; BLOCKS apply)
    - 13.c Apply sub-gate ⏳ OPEN (gated on 13.b + PK directive)

**v2.88 provenance:** Read-only authoring probes (8) + read-only sync-close probes (4) + 3 brief-authoring commits (create_or_update_file + push_files ×2) + 2 sync-close commits (create_or_update_file + push_files). No production mutations. No D-01 cycle. No parallel-agent contributions observed.

**Empirical findings v2.88 (additive to v2.86 carry):**
- `friction.case_history` shape designed per `emission_rule_history` in-schema precedent (7-column shape).
- `fn_triage_case` confirmed via P5a to set reviewed_at + updated_at on every call but never touch triaged_at/triaged_by.
- 8 acknowledged legacy cases all have NULL triaged_at AND NULL triaged_by AND reviewed_at SET — backfill source `COALESCE(reviewed_at, updated_at)` resolves cleanly.
- `fn_triage_case` has ZERO confirmed in-DB callers (P6 corrected P3 HINT-string false positive).
- friction.emission_rule has zero triggers — in-function INSERT is the canonical shadow-table population pattern.
- m.chatgpt_review actual schema: PK column `id`, proposal text column `proposal` (not `review_id`/`proposal_text` as cc-0017e v1.0 sub-files incorrectly state).

---

## 🟢 cc-0017e Wave 0e — STATUS BLOCK (NEW v2.88)

**Status: 📝 AUTHORED-PENDING-APPLY (v2.88). Apply blocked on v1.1 doc patch.**

**Brief commits (3 in chain):**
- Commit 1 `8502fc49a0d981e95f8fed6bd7c3ece438fc669c` — main brief via `create_or_update_file`
- Commit 2 `1659b293da007ced41a6d0b08def1061dd38a414` — 4 substantive sub-files via atomic `push_files` (parent `8502fc49`)
- Commit 3 `d349bdfecc1629dbaeca0d5cea579e69d9d03461` — 3 process sub-files via atomic `push_files` (parent `1659b293`)

**8-file inventory (all SHAs cross-verified at sync-close):** see v2.88 ADDITIONS block above.

**Scope (PK directive locked v2.88):**
- IN: A (case_history shadow) + C (fn_triage_case compat) + D (8-row backfill) + H (V-Z3 convention) + A-extended (5-function patch)
- OUT/DEFER: B / E / F / G — future Wave 0f or other wave candidates

**Empirical foundation (8 read-only authoring probes):** see Friction Plan STATUS BLOCK empirical findings above.

**Open design decisions (7 defaulted at authoring; PK may override at D-01 or v1.1):**
1. case_history change_kind enum: `{triage, resolve, reopen, mark_duplicate, first_view, compat_legacy_triage, backfill}` (no `'create'` in v1.0)
2. fn_triage_case patch: add `p_actor text DEFAULT NULL` 11th arg (signature-compatible)
3. Patch transition condition: triaged_at/by set only on first 'new'→non-'new' AND current value IS NULL (idempotent)
4. Backfill triaged_by sentinel: `'legacy_backfill'`
5. Backfill triaged_at source: `COALESCE(reviewed_at, updated_at)`
6. Scope of mutation-function history writes: ALL 5 cc-0017d functions + fn_triage_case
7. V-Z3 convention codification location: inline in `cc-0017e/vchecks.md` §X (no new process doc)

**Open anomaly (sync-close verification surfaced):**
- `preflight-pset.md` §P3.2 references `m.chatgpt_review.review_id` and `proposal_text` columns
- `d01-postapply-deferred.md` §3 (idempotency check SQL) and §4 (close-the-loop UPDATE templates) reference same incorrect column names
- Actual column names: `id` and `proposal`
- Functional impact at v1.0: zero. At apply time: D-01 idempotency check would fail; close-the-loop UPDATE would fail. Recoverable but disruptive.
- **Disposition:** v1.1 doc patch (2-3 file commit) BEFORE any D-01/apply. Severity LOW.

**Lesson candidates v2.88 (4 NEW):**
- L-v2.88-a: HINT-string substring-match false positives in `pg_proc.prosrc` caller probes — body inspection required
- L-v2.88-b: V-Z3 shadow-table operation alignment convention
- L-v2.88-c: Probe re-verification gate at apply time (authoring-time probes are snapshots)
- L-v2.88-d: In-function INSERT pattern preferred over trigger-based for shadow tables in locked-down schemas

**Apply prerequisites (carry from v2.87):**
- cc-0017d Wave 0d CLOSED-APPLIED-WITH-VCHECK-CORRECTION (v2.86) ✅
- cc-0017d v1.1 doc patch CLOSED (v2.87 at `f0367405`) ✅
- cc-0017c lockdown applied (v2.85) ✅
- friction schema event_source_fk in place ✅
- service_role REVOKE on event+case in place ✅

**Apply gating v2.88+:**
- v1.1 doc patch must land (rank 1 P1 v2.88) — BLOCKS apply
- PK directive to proceed to apply session (rank 2 P1 v2.88)

---

## 🟢 cc-0017d / cc-0017c / cc-0017b / cc-0017a / cc-0014 / cc-0015 / cc-0016 / cc-0012 / cc-0010A/B/C / cc-0011 / cc-0009 — STATUS BLOCKS

**v2.88 updates:** None. All carry from v2.87.
- cc-0017d: APPLIED v2.86 + v1.1 doc patch CLOSED v2.87. Unchanged v2.88.
- cc-0015 friction-pool-view (Wave 7): Wave 0d gate cleared v2.86; still gated on 1-week observation window closing 2026-05-26.
- cc-0016 friction-capture-evidence (Wave 8): Wave 0d gate cleared v2.86; still gated on Wave 7 sequencing.
- All others unchanged from v2.85/v2.86/v2.87.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v2.88)

**L40 not exercised v2.88** (no DML against m.chatgpt_review; column-name discovery via information_schema only).
**L41 not exercised v2.88** for non-friction schemas. Cumulative v2.80-v2.88 = 6 unchanged.
**L46 not exercised v2.88** (no fresh D-01).
**L58 applied 1× v2.88** — 1+2 split close per L-v2.85-e mitigation (per-session detail standalone `5d1935cd` + sync_state+action_list atomic push_files).
**L62 not exercised v2.88** (no D-01 cycle).
**L-v2.78-a, L-v2.81-a**: 2 occurrences each, promotion-eligible (unchanged).
**L-v2.83-a**: 7+ occurrences (unchanged; STRONG PROMOTION CANDIDATE confirmed).
**L-v2.84-a/b/c/d**: not re-exercised v2.88. L-v2.84-d unchanged at 2 occurrences.
**L-v2.85-a HIGH-SIGNAL**: re-exercised proactively at cc-0017e authoring (P2 + P6 signature probes pre-emptive; 3rd occurrence). Promotion-eligible after one more cycle.
**L-v2.85-b**: not re-exercised v2.88 (no fresh inline-rewrite event).
**L-v2.85-c**: not re-exercised v2.88.
**L-v2.85-d**: REALIZED v2.86 (`friction.purge_test_case(text)` deployed). Documented at cc-0017e brief P5/vchecks for next apply use. Unchanged.
**L-v2.85-e**: **re-applied v2.88 — 3rd consecutive occurrence** (v2.86 + v2.87 + v2.88). 1+2 split close. **PROMOTION-CONFIRMED per the v2.87 "after one more cycle" criterion.**
**L-v2.86-a HIGH-SIGNAL candidate**: documented in cc-0017e migration-sql.md as recommended pre-apply harness. Watching for apply-time exercise.
**L-v2.86-b candidate**: applied proactively in cc-0017e function patches (out_-prefix preserved across all 5 cc-0017d mutation function patches). Watching.
**L-v2.86-c candidate**: applied throughout cc-0017e (every `friction."case"%ROWTYPE` reference quoted). Watching.
**L-v2.86-d candidate**: documented in cc-0017e risks-and-grants R2. Watching.
**L-v2.86-e candidate**: applied throughout cc-0017e vchecks.md (slash-prefix convention `cc-0017e/v-d/...`). Watching.
**L-v2.88-a candidate (NEW)**: HINT-string substring-match false positives. 1 occurrence (P3/P6 correction). Watching.
**L-v2.88-b candidate (NEW)**: V-Z3 shadow-table operation alignment. 1 occurrence (codification in vchecks.md §X). Watching for apply-time first exercise.
**L-v2.88-c candidate (NEW)**: Probe re-verification gate at apply time. 1 occurrence (preflight-pset P1 design). Watching for apply-time first exercise.
**L-v2.88-d candidate (NEW)**: In-function INSERT pattern for shadow tables. 1 occurrence (P5b discovery + cc-0017e design adoption). Watching.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated. Day 1 of 7 unchanged v2.88 (same calendar day as v2.86 close; no elapsed observation time).
- **First cc-0017d-post-apply cron 85 fire** pending.
- **cc-0017e v1.1 doc patch** — no calendar deadline but BLOCKS apply; recommended landing same-day to keep apply path open at PK's pace.
- No new v2.88 calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v2.88: 0 D-01 fires. T-MCP-02 cum **~85 unchanged** from v2.87 (read-only probes do not consume; no ask_chatgpt_review called). L46 Evidence Gate not exercised v2.88. L62 not exercised v2.88. State-capture exceptions v2.88: 0 (cum 1). Close-the-loop UPDATEs v2.88: 0. **22 outstanding** unchanged.

---

## 🤖 Cowork automation (D182)

Unchanged from v2.85/v2.86/v2.87. Cron 82/83/86 firing normally. V-C3 PENDING.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0017e v1.1 doc patch** | m.chatgpt_review column-name correction (review_id→id, proposal_text→proposal) in preflight-pset.md §P3.2 + d01-postapply-deferred.md §3-4 | **P1 NEW v2.88, rank 1** | OPEN. BLOCKS apply. Doc-only patch. | chat → PK | PK directive; 2-3 file commit; single atomic push_files. |
| **cc-0017e apply session** | Full P-set + D-01 fire + apply_migration + V-check matrix + close-the-loop | **P1 NEW v2.88, rank 2** | OPEN. Gated on v1.1 doc patch + PK directive. | chat → PK | After v1.1 doc patch lands. |
| **Reconciliation daily diagnostic** | First post-cc-0017d cron 85 fire | **P1 carry, rank 3** | OPEN. | chat → PK | Post-fire SQL + emit_event check. |
| **Health_check V-C3 diagnostic** | Cowork pipe | **P1 carry, rank 4** | OPEN. V-C3 PENDING. | Cowork → chat | Check post-fire health doc. |
| **Platform Reconciliation View brief** | Reconciliation surface design | **P2 carry, rank 5** | NOT YET STARTED. | PK → chat | When PK directs. |
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
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (7+ occurrences; STRONG CANDIDATE)** | Unchanged v2.88. | chat → next lesson cycle | Promote. |
| **L-v2.84-a candidate** | Empirical-finding precedence | P3 carry | 1 occurrence. | chat → next session | Watcher. |
| **L-v2.84-b candidate** | Defensive idempotent REVOKE/GRANT | P3 carry | 1 occurrence. | chat → next session | Watcher. |
| **L-v2.84-c candidate** | Path A corrected_action satisfaction | P3 carry | 1 occurrence. | chat → next session | Watcher. |
| **L-v2.84-d candidate** | Schema-probe-before-DML | P3 carry (2 occurrences unchanged v2.88) | Not re-exercised v2.88. | chat → next session | Promotion-eligible. |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | **P3 (3 occurrences v2.88; promotion-eligible)** | Re-exercised proactively at cc-0017e authoring (P2 + P6). | chat → next session | Promotion-eligible. |
| **L-v2.85-b** | Inline V-check rewrite Path 1 / Path B-prime | P3 (2 occurrences unchanged v2.88) | Not re-exercised v2.88. | chat → next session | Watcher. |
| **L-v2.85-c** | SECURITY DEFINER bypass post REVOKE | P3 (1 occurrence) | Not re-exercised v2.88. | chat → next session | Watcher. |
| **L-v2.85-d** | Postgres-owner cleanup migration | P3 (REALIZED v2.86; documented at cc-0017e vchecks for next apply use) | Unchanged. | chat → next session | Resolved; archive after one more exercise. |
| **L-v2.85-e** | push_files length budget — split-commit mitigation | **P3 (PROMOTION-CONFIRMED v2.88; 3rd consecutive occurrence)** | 1+2 split close avoided truncation risk thrice running. | chat → next lesson cycle | **PROMOTE.** |
| **L-v2.86-a candidate (HIGH-SIGNAL)** | Pre-apply syntactic validation via transactional EXEC | P3 (1 occurrence; documented in cc-0017d v1.1 + cc-0017e v1.0 briefs) | Now live as recommendation in 2 briefs. | chat → next session | Watcher; recommendation for future brief P-sets. |
| **L-v2.86-b candidate** | `out_`-prefix on RETURNS TABLE columns | P3 (1 occurrence at apply; applied proactively in cc-0017e v1.0 brief patches) | Cross-brief carry. | chat → next session | Watcher. |
| **L-v2.86-c candidate** | Reserved SQL keyword ROWTYPE quoting | P3 (1 occurrence at apply; applied throughout cc-0017e v1.0 brief patches) | Cross-brief carry. | chat → next session | Watcher. |
| **L-v2.86-d candidate** | Cross-column CHECK pre-validation inline | P3 (1 occurrence; documented in cc-0017d v1.1 + cc-0017e risks-and-grants R2) | Cross-brief carry. | chat → next session | Watcher. |
| **L-v2.86-e candidate** | V-check fixture-data convention alignment | P3 (1 occurrence; applied throughout cc-0017e v1.0 brief vchecks.md slash-prefix) | Cross-brief carry. | chat → next session | Watcher. |
| **L-v2.88-a candidate (NEW)** | HINT-string substring-match false positives in pg_proc.prosrc caller probes | P3 (1 occurrence; documented in cc-0017e lessons-metadata-changelog) | NEW v2.88. | chat → next session | Watcher. |
| **L-v2.88-b candidate (NEW)** | V-Z3 shadow-table operation alignment convention | P3 (1 occurrence; codified in cc-0017e vchecks.md §X) | NEW v2.88. | chat → next session | Watcher; first apply-time exercise at cc-0017e apply. |
| **L-v2.88-c candidate (NEW)** | Probe re-verification gate at apply time | P3 (1 occurrence; cc-0017e preflight-pset P1 design) | NEW v2.88. | chat → next session | Watcher; first apply-time exercise at cc-0017e apply. |
| **L-v2.88-d candidate (NEW)** | In-function INSERT pattern for shadow tables | P3 (1 occurrence; cc-0017e design adoption per P5b discovery) | NEW v2.88. | chat → next session | Watcher; validated empirically at cc-0017e apply. |
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
| **Parallel agent coordination (L47)** | informational | P3 carry | No interference v2.88. | chat → future | Passive. |
| **Other carries** | Dashboard mobile / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged from v2.86/v2.87. | various | various |

**Closed v2.88:**
- Wave 0e brief authoring (P1 rank 1 PROMOTED v2.87) → **CLOSED-AUTHORED** ✅ at commit chain `8502fc49 → 1659b293 → d349bdfe`. 8 files landed, blob SHAs cross-verified, 0 production mutations, 0 D-01 fires.

**Closed earlier:** v2.87 cc-0017d v1.1 doc patch (`f0367405`); v2.86 cc-0017d apply + fresh D-01 + V-F1 cleanup + Plan gate 12; v2.85 cc-0017c apply + fresh D-01 + V-B4 PK Path 1 + V-B4 smoke cleanup + Plan gate 10; v2.84 brief authoring + 2× D-01; v2.83 cc-0017b v1.1 doc patch; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.80 cc-0017a authoring; v2.79 PK approval gate.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v2.87.

---

## 📌 Backlog

**v2.88 state changes:**
- Wave 0e brief authoring (P1 rank 1 v2.87) → **CLOSED-AUTHORED v2.88** at commit chain `8502fc49 → 1659b293 → d349bdfe` (8 files + read-back verified).
- **cc-0017e v1.1 doc patch** PROMOTED as NEW P1 rank 1 v2.88. BLOCKS apply.
- **cc-0017e apply session** PROMOTED as NEW P1 rank 2 v2.88. Gated on v1.1 doc patch + PK directive.
- Friction Register Consolidation Plan: cc-0017e Wave 0e brief AUTHORED-PENDING-APPLY; Gate 13 split into authoring sub-gate CLOSED + v1.1 doc patch sub-gate OPEN + apply sub-gate OPEN.
- T-MCP-02 cum ~85 unchanged from v2.87 (no MCP probes consumed v2.88).
- State-capture exceptions cum 1 unchanged.
- friction.* schema state unchanged from v2.87 (no production mutations v2.88).
- 4 NEW L-v2.88-a/b/c/d candidates documented in cc-0017e v1.0 brief.
- L-v2.85-e mitigation **PROMOTION-CONFIRMED** (3rd consecutive occurrence v2.86 + v2.87 + v2.88); recommended for next lesson cycle promotion.
- L-v2.85-a HIGH-SIGNAL re-exercised at authoring (3 occurrences total; promotion-eligible).
- 1+2 split commit close (per-session detail standalone `5d1935cd` + sync_state+action_list atomic).
- Dashboard PHASES 41st deferral carried (was 40 at v2.87; +1 at v2.88 = 41). No file-touch.
- **No decisions.md change.**

---

## 🧊 Frozen / Deferred

Unchanged from v2.85/v2.86/v2.87.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e + **L-v2.88-a-d (NEW)** candidates carried per v2.88.

- **L40 not exercised v2.88**.
- **L41 not exercised v2.88**.
- **L46 not exercised v2.88**.
- **L52-L65** various: not re-exercised v2.88.
- **L58 baseline**: 1× v2.88 (1+2 split close per L-v2.85-e mitigation).
- **L62 baseline-eligible**: not exercised v2.88.
- **L-v2.76-a-f**: not re-exercised v2.88.
- **L-v2.78-a**: 2 occurrences (unchanged).
- **L47**: 1 occurrence (unchanged).
- **L-v2.81-a**: 2 occurrences (unchanged).
- **L-v2.83-a**: 7+ occurrences (unchanged; STRONG CANDIDATE).
- **L-v2.84-a/b/c**: 1 occurrence each (unchanged).
- **L-v2.84-d**: 2 occurrences (unchanged v2.88).
- **L-v2.85-a HIGH-SIGNAL**: **3 occurrences v2.88** (re-exercised proactively at cc-0017e authoring P2 + P6 signature probes); promotion-eligible.
- **L-v2.85-b**: 2 occurrences (unchanged v2.88).
- **L-v2.85-c**: 1 occurrence (unchanged v2.88).
- **L-v2.85-d**: REALIZED v2.86 (unchanged v2.88).
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88 — 3rd consecutive occurrence**; ready to promote at next lesson cycle.
- **L-v2.86-a (HIGH-SIGNAL)**: 1 occurrence, documented in cc-0017d v1.1 + cc-0017e v1.0 briefs.
- **L-v2.86-b**: 1 occurrence, applied proactively in cc-0017e v1.0 patches.
- **L-v2.86-c**: 1 occurrence, applied throughout cc-0017e v1.0 patches.
- **L-v2.86-d**: 1 occurrence, documented in cc-0017e risks-and-grants R2.
- **L-v2.86-e**: 1 occurrence, applied throughout cc-0017e vchecks.md slash-prefix.
- **L-v2.88-a (NEW)**: 1 occurrence — HINT-string substring-match false positives.
- **L-v2.88-b (NEW)**: 1 occurrence — V-Z3 shadow-table operation alignment.
- **L-v2.88-c (NEW)**: 1 occurrence — Probe re-verification gate at apply.
- **L-v2.88-d (NEW)**: 1 occurrence — In-function INSERT pattern for shadow tables.

All candidates recommended for promotion at appropriate cycle once empirical evidence accumulates. **L-v2.85-e is the highest-priority promotion at next lesson cycle.**

---

## v2.88 honest limitations

- All v2.31–v2.87 limitations apply.
- **Brief-authoring session only.** No production schema change, no migration applied, no V-check run, no fresh empirical evidence beyond the 8 read-only authoring probes + 4 read-only sync-close verification probes. Schema state end of v2.88 = schema state end of v2.87.
- **`friction.case_history` does NOT yet exist in production.** Authored design only; applies in future apply session.
- **8 acknowledged legacy cases remain with NULL triaged_at/triaged_by.** Backfill scoped but not executed.
- **`fn_triage_case` external-caller surface not enumerable from inside the database.** Item C is defensive prospective protection; no evidence-based caller list.
- **V-Z3 convention introduced but not empirically validated.** First use at cc-0017e apply session V-check matrix.
- **v1.1 doc patch required BEFORE any D-01/apply.** Brief is functional at SQL design layer but operationally blocked on m.chatgpt_review column-name correction in 2 sub-files.
- **22 outstanding close-the-loop UPDATEs** unchanged.
- **Memory cap 19/30** unchanged.
- **Action_list size at v2.88**: ~37KB (compacted per L-v2.85-e mitigation; v2.87 was ~35KB; +~2KB from v2.88 additions).
- **Per-session files v2.88**: 1 — `2026-05-19-cc0017e-v1.0-authored.md` (commit `5d1935cd`).
- **Doc-sync v2.88**: 1+2 split commit per L-v2.85-e mitigation (per-session detail standalone; sync_state+action_list atomic). **L-v2.85-e PROMOTION-CONFIRMED.**
- **Close-the-loop UPDATEs v2.88: 0**. 22 outstanding unchanged.
- **State-capture exceptions v2.88: 0**. Cumulative: 1.
- **Production mutations v2.88: 0**.
- **Dashboard PHASES 41st deferral** carried (was 40 at v2.87; +1 at v2.88). No file-touch v2.88.
- **No decisions.md change.** Brief-authoring close; no new architectural decisions. Open design decisions captured in cc-0017e brief §9, not promoted to architectural decisions.
- **No Wave 0f work started v2.88** per PK explicit instruction.
- **Session compacted once mid-authoring** (between commit 2 and commit 3). Continuity preserved via compaction summary; commit 3 completed post-compaction.
- **Identical PK directive received twice in successive turns** at sync-close verification. Re-verified state matched bit-for-bit; flagged loop pattern to PK; PK directed sync close to proceed.

---

## Changelog

- v1.0–v2.87: per commit history.
- **v2.88 (2026-05-19 Sydney evening, cc-0017e Wave 0e v1.0 brief AUTHORED-PENDING-APPLY):**
  - Build arc: session resumed v2.87 state → Wave 0e brief scope confirmation → 8 read-only authoring probes (P1–P6 + P1b/P5a/P5b) → design decisions locked → 3-commit authoring sequence per L-v2.85-e split (`8502fc49` main brief + `1659b293` 4 substantive sub-files + `d349bdfe` 3 process sub-files) → sync-close verification probes surfaced m.chatgpt_review column-name anomaly in 2 sub-files → honest status report to PK → PK directive for sync close → 1+2 split commit close per L-v2.85-e (3rd consecutive occurrence).
  - cc-0017e Wave 0e v1.0 brief AUTHORED-PENDING-APPLY at commit chain `8502fc49 → 1659b293 → d349bdfe`. 8 files landed + read-back verified.
  - PK scope locked: A (case_history shadow) + C (fn_triage_case external-compat patch) + D (8-row acknowledged legacy backfill) + H (V-Z3 convention codified) + A-extended (5 cc-0017d mutation function patches) IN; B/E/F/G OUT/DEFER.
  - Wave 0e brief authoring (rank 1 P1 PROMOTED v2.87) → **CLOSED-AUTHORED v2.88**.
  - cc-0017e v1.1 doc patch PROMOTED as NEW P1 rank 1 v2.88 (BLOCKS apply).
  - cc-0017e apply session PROMOTED as NEW P1 rank 2 v2.88 (gated on v1.1 doc patch + PK directive).
  - No production mutations. No apply_migration. No D-01 fires. No Wave 0f scope creep.
  - T-MCP-02 cum ~85 unchanged. State-capture exceptions cumulative 1 unchanged.
  - 4 NEW L-v2.88-a/b/c/d candidates documented in cc-0017e v1.0 brief lessons-metadata-changelog.md.
  - L-v2.85-e re-applied 3rd consecutive occurrence — **PROMOTION-CONFIRMED**.
  - L-v2.85-a HIGH-SIGNAL re-exercised proactively (3rd occurrence; promotion-eligible).
  - Active rows updated: Wave 0e brief authoring → CLOSED-AUTHORED; cc-0017e v1.1 doc patch + cc-0017e apply session promoted to P1 ranks 1+2.
  - STATUS BLOCKS updated: NEW cc-0017e STATUS BLOCK added; Friction Plan STATUS BLOCK Gate 13 split into authoring/v1.1-doc-patch/apply sub-gates.
  - Closure budget: ~1.5h v2.88. Trailing-14-day ~25h.
  - Doc-sync: 1+2 split commit per L-v2.85-e mitigation (3rd consecutive occurrence).
  - Production mutations: 0.
  - No decisions.md change.
  - Session compacted once mid-authoring; continuity preserved via compaction summary.
  - Identical PK directive received twice in successive turns at sync-close verification; loop pattern surfaced; sync close proceeded under PK directive.
