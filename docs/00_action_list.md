# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-21 Sydney (**v3.02 (+v3.02.1 reconciliation) — Dashboard mobile/narrow viewport verification CLOSED/PASS**. CCB tested at 306×498 Nexus 5 Android Chrome UA, DPR 2 → MOBILE PASS. Mobile fix resolved: sidebar collapses to hamburger/drawer; desktop fixed rail no longer consumes mobile width; /operations rows readable; evidence paperclip badge visible; expanded Evidence section usable; triage guardrail usable; FAB usable; Roadmap readable; "Stop Claude" overlay remains external Claude Browser tooling. **Mobile/narrow viewport verification removed from open P3 carries.** Mobile-fix commit SHA NOT supplied in directive — recorded PENDING (not fabricated); backfill next session. NEW lesson candidate L-v3.02-a. **v3.02.1 reconciliation: the original v3.02 push (`a08945d3`) was authored from pre-v3.01 content and reverted v3.01's `00_` index/ranking content (Cowork WARN closure; cc-0015 rank-1; v3.01 index row); restored here. The v3.02 commit's "L41 mitigation applied" claim was FALSE — HEAD not re-read before push; L41 genuinely re-exercised in this repair. v3.01 commit `83cd633c` + session file never lost.** cc-0015 Gate 11 watch / Stage E future / PRV deferred / Q-005 (non-blocking) PRESERVED. 0 dashboard edits / 0 Supabase mutations / 0 Stage E / 0 cleanup / 0 cc-0015 start / 0 PRV closure / 0 smoke deletion / 0 D-01 fires / 0 memory edits / 0 decisions.md edits.) **Today/Next 5 core ranks v3.02**: **cc-0015 Gate 11 watch → rank 1 (from v3.01; time-bound; closes 2026-05-26)**; cc-0016 Stage E scoping/dry-run design ONLY → rank 2 conditional (Option A); Wave 0f scoping → rank 3; PRV → rank 4 (deferred); close-the-loop → rank 5. Cowork lifecycle gating WARN no longer ranked (CLOSED v3.01).

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v3.01.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + **L-v2.83-a (STRONG; 18+)** + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL; 4 occurrences) + L-v2.85-b/c/d + **L-v2.85-e PROMOTION-CONFIRMED** + 5 L-v2.86 candidates + **L-v2.88-a (watcher CLOSED for cc-0016; 2 prior occurrences carry; re-fired as identical-directive event at v3.02 re-send — recognised + not re-executed)** + L-v2.88-b/c/d + L-v2.89-a + **L-v2.90-a through L-v2.90-f** + **L62 strongly reinforced via cc-0016 6-fire D-01 series** + **L-v2.94 convention NEW candidate** + **L-v3.02-a NEW candidate (mobile breakpoint verification after primary operator-surface change)** + **L41 re-exercised v3.02.1 (full-file push from stale content clobbers intervening out-of-band commit — re-read HEAD first)**. **D-IOL-001 (v2.77)** + **D-CC-0017B-Q1** carried.

**v3.02 (+v3.02.1) ADDITIONS:**

- **Mobile/narrow viewport verification RECORDED CLOSED/PASS v3.02.** CCB tested at 306×498 Nexus 5 Android Chrome UA, DPR 2 → MOBILE PASS. Cross-repo recording; no dashboard edits.
  - Mobile fix resolved: sidebar collapses to hamburger/drawer; desktop fixed rail no longer consumes mobile width; /operations rows readable; evidence paperclip badge visible; expanded Evidence section usable; triage guardrail usable; FAB usable; Roadmap readable; "Stop Claude" overlay remains external Claude Browser tooling.
  - **Removed from open P3 carries.** Was open since dashboard slice 3 limitation (v2.95 browser runtime overrode `resize_window`).
- **⚠️ Mobile-fix commit SHA NOT supplied in directive** — recorded as `<PENDING — SHA not supplied in directive>`. Not fabricated. Backfill next session.
- **NEW lesson candidate L-v3.02-a:** mobile/narrow breakpoint should be verified after any primary operator-surface change. 1 occurrence; watcher.
- **⚠️ v3.02.1 reconciliation:** the original v3.02 close clobbered v3.01's `00_` index/ranking content. Root cause: v3.01 (`83cd633c`, another agent) landed between v3.00.1 (`a98acaf`) and v3.02; chat's v3.02 full-file `push_files` wrote sync_state + action_list from pre-v3.01 held content, reverting v3.01's edits even though git advanced cleanly on parent `83cd633c`. v3.01 commit + session file survived (push didn't touch those paths). The v3.02 commit message + session file claimed "L41 clobber-mitigation applied (held content == HEAD verified)" — FALSE; HEAD was not re-read. v3.02.1 restores v3.01 facts (Cowork WARN CLOSED; cc-0015 rank 1; v3.01 index row; Q-005 carry) + keeps v3.02 mobile closure + corrects the false claim. Repair done via read-HEAD-first per-file patches (sync_state `958b056f`, this action_list commit, v3.02 session file patch).

- **Items explicitly preserved v3.02 (per directive + restored from v3.01):**
  - cc-0015 Gate 11 watch — rank 1; window closes 2026-05-26; do NOT start before.
  - cc-0016 Stage E lifecycle cleanup — future/separately-approved-only.
  - PRV brief authoring — deferred per D-FR-RECON-001 §7.D.
  - Q-nightly-health-check-v1-005 — OPEN, non-blocking.
  - Backend/shared-metrics refactor — deferred carry.

- **Hard stops respected v3.02 (+v3.02.1):**
  - 0 Invegent-dashboard edits / 0 Supabase mutations
  - 0 Stage E started / 0 cleanup run
  - 0 cc-0015 start before Gate 11 closes / 0 PRV closure
  - 0 deletion of smoke objects or test events
  - 0 D-01 fires / 0 memory edits / 0 decisions.md edits
  - 0 SHA fabrication
  - 0 re-execution of the duplicate v3.02 directive (recognised as L-v2.88-a identical-directive event)

- **Closed Active rows v3.02:** Mobile/narrow viewport verification → CLOSED/PASS.
- **Spawned v3.02:** Mobile-fix commit SHA backfill (P3 admin carry).
- **NO decisions.md change v3.02 / v3.02.1.**
- **Production mutations: 0. D-01 fires: 0. T-MCP-02 cum: ~92 unchanged. State-capture exceptions: 1 unchanged.**

**v3.01 ADDITIONS (preserved):**

- **Cowork brief lifecycle gating WARN CLOSED v3.01.** v2.94 lifecycle convention validated end-to-end against the 2026-05-20T16:02:37Z natural 16:00 UTC fire as convention-cycle-1 evidence:
  - Run state: `docs/runtime/runs/nightly-health-check-v1-2026-05-20T160237Z.md`. Finished 16:08:30Z (~6 min). 0 schema-drift fallbacks. All 14 SQL queries verbatim. Markdown `docs/audit/health/2026-05-20.md` (canonical per brief §12.4).
  - Dual-write: `{success_count: 5, failure_count: 0, skipped_count: 2}`. 5 P1 → `friction.event` (visible on `/operations` post Stage D); 2 P2 → `friction.emit_error` (`CONDITION-KEY-UNRESOLVED`).
  - Brief lifecycle: `ready → review_required → PK observed → ready` ✓. 0 Cowork forbidden-action violations.
- **`docs/briefs/nightly-health-check-v1.md`** frontmatter reset: `status: review_required → ready`. brief_version unchanged (v3.0).
- **`docs/briefs/queue.md`** Active row: `status: review_required → ready`; closure annotation prepended; 2026-05-20 run history preserved.
- **Q-nightly-health-check-v1-005 remains OPEN, non-blocking.** Function-contract drift (skipped_count + emit_error routing not in brief §12.3). Future v3.1 brief / spec patch. NOT bundled into closure.
- **Core ranks rebuilt v3.01:** rank 1 = cc-0015 Gate 11 watch; Cowork WARN no longer ranked (CLOSED).
- **L-v2.94 convention NEW candidate (v3.01)** — confirm across 2-3 more natural cycles before promotion-eligible.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | 0 (recon CLOSED v2.93; PHASES streak CLOSED v2.95; top alert bar CLOSED v2.96; Stage B CLOSED v2.99; Stage D CLOSED v3.00; Cowork WARN CLOSED v3.01; mobile viewport CLOSED v3.02) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~38h (cumulative v2.83–v3.02) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v3.02 cycle: ~0.5h** + **v3.02.1 reconciliation ~0.5h** (clobber diagnosis + restore). 0 schema mutations. 0 D-01 fires. **State-capture exception count: 0** (cumulative 1).

---

## ⭐ Today / Next 5 (core ICE ranks)

> Last rebuilt: 2026-05-21 Sydney (v3.02 — mobile viewport CLOSED; ranks carried from v3.01 with Cowork WARN closed + cc-0015 Gate 11 watch at rank 1).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0015 Gate 11 watch** | **P2 carry, rank 1 (from v3.01)** | Time-bound. Window closes **2026-05-26** (~5 days out from 2026-05-21). Passive observation; when gate clears, cc-0015 friction-pool-view UI (Wave 7) unblocks as the leading dashboard build. | PK / chat | Observe close-date; no action needed until 2026-05-26. |
| 2 | **cc-0016 Stage E scoping/dry-run design ONLY** (conditional — Option A) | **P2, rank 2 conditional** | cc-0016 evidence path complete A→B→C→D + mobile-verified; only Stage E (lifecycle cleanup) remains. Option A = NON-MUTATING design + dry-run spec. First destructive run still requires separate PK approval. | PK → chat | PK picks. If A: author Stage E dry-run design (no execution). |
| 3 | **Wave 0f scoping** | **P3 brief-authoring only, opportunistic during Gate 11 window** | Non-mutating. Candidates: items B/E/F/G from cc-0017e + `purge_test_case` helper case_history extension (L-v2.90-d). | chat → PK | When PK directs (during Gate 11 window 2026-05-19 → 2026-05-26). |
| 4 | **Platform Reconciliation View brief authoring** | **P2 carry, deferred per D-FR-RECON-001 §7.D** | Defer until corrected friction-register baseline accepted. | PK → chat | When PK directs. |
| 5 | **5-row close-the-loop batch sweep / Pre-sales criteria / `purge_test_case` helper case_history extension** | **P2/P3 carry** | Outstanding close-the-loop UPDATEs (net not recomputed). | chat → PK | When PK directs. |

**Carries flagged (NOT actively ranked):** Q-nightly-health-check-v1-005 (non-blocking; future v3.1 / spec patch); Mobile-fix commit SHA backfill (PENDING from v3.02); 3 no-fire scheduler days (2026-05-16/18/19, P3 informational).

**Time-bound nudge:** cc-0015 Gate 11 observation window closes **2026-05-26** (~5 days out). cc-0015 friction-pool-view UI (Wave 7) unblocks then.

## ⭐ Dashboard work (separately ranked v3.02)

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| D1 | **cc-0015 friction-pool-view UI** (slice 5) | P2 carry | Backend already shipped. Gated on Gate 11 closing 2026-05-26. Leading dashboard build once gate clears. | PK → chat (Wave 7) | When window closes 2026-05-26. |
| D2 | **Platform Reconciliation View surface** (slice 7) | P2 carry | PRV brief deferred per D-FR-RECON-001 §7.D. | PK → chat | When PRV brief authored + PK-accepted. |

*(Mobile/narrow viewport verification removed — CLOSED/PASS v3.02.)*

**Deferred carry (not actively ranked):** Backend/shared-metrics refactor.

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Secondary follow-up (P3)**: 3 no-fire scheduler days for `nightly-health-check-v1` — 2026-05-16, 2026-05-18, 2026-05-19.

**Passive observation v3.02**: Cron 82-86 firing normally. friction.* state assumed unchanged from Stage C apply (not re-probed). **Dashboard `dashboard.invegent.com`**: slices 1–3 + 4A–4B + cc-0016 Stage B (FAB upload) + cc-0016 Stage D (evidence display) all shipped + verified; **now mobile-verified at 306×498 DPR2**. **V-A5 smoke artefacts retained** — do not delete.

---

## 🟢 cc-0016 friction-capture-evidence — STATUS BLOCK (v3.02 — Stage A/B/C/D closed + mobile-verified)

**Status: Stage A CLOSED + Stage C CLOSED + Stage B CLOSED/PASS + Stage D CLOSED/PASS. Evidence capture/display path COMPLETE through Stage D; now also mobile-verified (v3.02). Stage E future/separately-approved-only.**

| Stage | Scope | Status | Reference |
|---|---|---|---|
| A | bucket + attachments column + 2 CHECK + index + view + GRANT | CLOSED | D-01 `6f2b8b1a`/`f573e684`/`9eb35144`; applied v2.97 (verified in v2.99.1 at `2db1656`) |
| C | DROP+CREATE emit_event 13-arg + fn_emit_manual_event 8-arg; cc-0017b preserved | CLOSED | D-01 `56e65bb2`/`dbabb576`/`358c6fdd`; applied v2.98 (verified in v2.99.1 at `2db1656`) |
| B | FAB evidence upload/read UX | CLOSED/PASS v2.99 | dashboard `36fe6ad`; V-A5 PASS |
| D | /operations evidence display | CLOSED/PASS v3.00 | dashboard `9082beb`; mobile-verified v3.02 |
| E | lifecycle cleanup automation + dry-run report | FUTURE — separately approved only | Stage A CONSTRAINT 2 |

**V-A5 evidence (DO NOT DELETE):** no-attach event `2120b2f7-219f-4d0d-be56-512d81430873`; attach event `75f0c981-1180-4047-9aa3-f725bec6eb9b`; object `friction-evidence/9e314151-be65-434e-8588-c913012f6591/0_va5-smoke.png` (861 bytes, image/png).

**PK forward constraints carried:** CONSTRAINT 1 (operator-authorisation; Stage B closure; negative-path gap flagged); CONSTRAINT 2 (no lifecycle cleanup/destructive deletion; binds Stage E).

---

## 🟢 Dashboard slices — STATUS BLOCK (UPDATED v3.02)

**Status v3.02: Slices 1–3 + 4A–4B RECORDED. cc-0016 Stage B + Stage D CLOSED/PASS. Mobile/narrow viewport verification CLOSED/PASS (v3.02). Cross-repo recording only.**

- Slice 1 `af60953` / Slice 2 `de4501b` + `37008e5` / Slice 3 `991a92b` — VISUAL PASS (v2.95).
- Slice 4A `cd02402` / Slice 4B `f5a980f` — VISUAL PASS (v2.96).
- cc-0016 Stage B at `36fe6ad` — CLOSED/PASS (v2.99).
- cc-0016 Stage D at `9082beb` — CLOSED/PASS (v3.00).
- **Mobile fix** at `<PENDING SHA>` — MOBILE PASS at 306×498 DPR2 (v3.02).

**Remaining dashboard work:** cc-0015 UI (D1, gated on Gate 11 closing 2026-05-26); PRV (D2, deferred). *(Mobile viewport CLOSED.)*

---

## 🟢 Friction Register Consolidation Plan v1 — STATUS BLOCK (unchanged)

Wave 0 + 0d + 0e COMPLETE. Gates 10+12+13 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE — ~5 days out. Day count not refreshed. Wave 0f scoping rank 3 carry. **cc-0016 Wave 8 Stage A/B/C/D closed (+ mobile-verified); only Stage E (future/separately-approved) remains.**

---

## 🟢 Cowork brief `nightly-health-check-v1` — STATUS BLOCK (CLOSED v3.01)

FROZEN at v3.0. Signal-production contract empirically validated v2.92. **Lifecycle gating WARN CLOSED v3.01** against the 2026-05-20T16:02:37Z natural fire as convention-cycle-1 evidence (v2.94 lifecycle convention `ready → fire → review_required → PK observed → ready` validated end-to-end). Brief frontmatter reset to `status: ready` for the next 16:00 UTC fire. **No longer at core rank 1.** Run state: `docs/runtime/runs/nightly-health-check-v1-2026-05-20T160237Z.md`. Markdown: `docs/audit/health/2026-05-20.md`. Emission: 5 P1 → `friction.event`; 2 P2 → `friction.emit_error` (CONDITION-KEY-UNRESOLVED; pattern-matcher gap). **Q-nightly-health-check-v1-005 remains OPEN, non-blocking**; deferred to future v3.1 brief / spec patch. Does NOT block next scheduled cycle.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v3.02.1)

**L41**: **re-exercised v3.02.1** (negative-then-positive). Original v3.02 full-file push clobbered v3.01 `00_` content; v3.02.1 repaired via read-HEAD-first per-file patches. Pair-promote with the full-file-write mitigation lesson.
**L40 / L46 / L58**: not exercised.
**L62**: strongly reinforced via cc-0016 6-fire D-01 series; not newly exercised (no D-01).
**L-v2.83-a**: **18+ occurrences**. STRONG CANDIDATE confirmed.
**L-v2.85-a HIGH-SIGNAL**: 4 occurrences.
**L-v2.85-e**: PROMOTION-CONFIRMED v2.88. Consecutive-streak tally muddied by v3.02 clobber/repair — re-baseline at next clean close rather than claim a clean 15th.
**L-v2.88-a**: watcher CLOSED for cc-0016; **re-fired as identical-directive event at the v3.02 re-send** (recognised; not re-executed; clobber repaired instead). 2 prior occurrences carry.
**L-v2.94 convention**: NEW candidate (v3.01).
**L-v3.02-a**: NEW candidate (mobile breakpoint verification after primary operator-surface change). 1 occurrence.
**L-v2.90-a-f**: not re-exercised. Watchers.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated. ~5 days out. Day count not refreshed.
- **Cowork `nightly-health-check-v1` lifecycle gating WARN** — **CLOSED v3.01.** No longer time-bound; brief reset to `ready`. Q-005 carries non-blocking.
- **Mobile-fix commit SHA backfill** — PENDING from v3.02; supply next session.
- No new calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v3.02: **0 D-01 fires.** T-MCP-02 cum **~92 unchanged**. State-capture exceptions: 0 (cum 1). Close-the-loop UPDATEs: 0.

---

## 🤖 Cowork automation (D182)

**v3.02 update:** Cron 82/83/85/86 firing normally. Cowork brief lifecycle gating WARN — **CLOSED v3.01** (no longer ranked). Brief reset to `ready` for next natural 16:00 UTC fire; Q-005 non-blocking carry.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Mobile/narrow viewport verification** | CCB 306×498 Nexus 5 DPR2 → MOBILE PASS | RECORDED v3.02 | **CLOSED/PASS** | n/a (recorded) | n/a |
| **Mobile-fix commit SHA backfill** | SHA not supplied in v3.02 directive | P3 admin carry NEW v3.02 | OPEN (PENDING). Recorded `<PENDING SHA>`. | PK → chat | Supply SHA; small reconciliation patch. |
| **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** | v2.94 convention validated end-to-end vs 2026-05-20T160237Z natural fire | CLOSED v3.01 | **CLOSED** | n/a (recorded) | Brief reset to `ready`; Q-005 non-blocking carry. |
| **Q-nightly-health-check-v1-005** | function-contract drift (skipped_count + emit_error routing not in brief §12.3) | P3 non-blocking carry | OPEN. | chat → PK | Future v3.1 brief / spec patch. Does NOT block next cycle. |
| **cc-0016 Stage D — /operations evidence display** | dashboard `9082beb`; CCB VISUAL PASS; mobile-verified v3.02 | RECORDED v3.00 | **CLOSED/PASS** | n/a (recorded) | n/a |
| **cc-0016 evidence capture/display path** | A→B→C→D complete; mobile-verified | RECORDED v3.00/v3.02 | **COMPLETE through Stage D** | n/a (recorded) | n/a |
| **cc-0016 Stage B — FAB evidence upload/read UX** | dashboard `36fe6ad`; V-A5 PASS | RECORDED v2.99 | **CLOSED/PASS** | n/a (recorded) | n/a |
| **cc-0016 Stage E — lifecycle cleanup** | Cleanup automation + dry-run report | FUTURE — separately approved only | NOT STARTED. CONSTRAINT 2 binds. Option A = scoping/dry-run design only. | PK → chat | Separate approval + dry-run before any destructive run. |
| **cc-0015 friction-pool-view brief** (Wave 7) | Authored PENDING_EXECUTION | P2, rank 1 (Gate 11 watch) | DRAFTED `9a5dc155`. Do NOT start before Gate 11 closes 2026-05-26. | chat → PK (Wave 7) | When window closes 2026-05-26. |
| **3 no-fire scheduler days — `nightly-health-check-v1`** | 2026-05-16, 2026-05-18, 2026-05-19 | **P3 secondary follow-up** | OPEN. | chat → PK | Read-only probe. |
| **Wave 0f scoping** | Brief-authoring only; opportunistic during Gate 11 | **P3, core rank 3** | NOT STARTED. | chat → PK | When PK directs. |
| **Platform Reconciliation View brief** | Deferred per D-FR-RECON-001 §7.D | **P2 carry, core rank 4** | NOT STARTED. | PK → chat | When PK directs. |
| **5-row close-the-loop batch / Pre-sales / `purge_test_case` helper extension** | Close-the-loop UPDATEs + Pre-sales 3-clock + helper coverage gap | **P2/P3 carry, core rank 5** | OPEN. | chat → PK | When PK directs. |
| **Music library activation** | video-worker v3.0.0 env-var gated | P2 carry | PENDING PK. | PK + chat | Bucket + tracks + env + smoke. |
| **vchecks.md V-B4 doc patch** | Correct V-B4 to 12-param signature | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **cc-0017c v1.2 doc patch candidate** | Date + 3 D-01 refs + V-B4 signature | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | P2 carry | OBSERVED. | chat → PK | Verify + dry-run + re-enable. |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P2 carry | LOGGED. | chat → PK | Audit m.post_draft. |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 carry | OPEN. | PK | When PK directs. |
| **Backend/shared-metrics refactor** | Deeper scope behind v2.95 count mismatch | DEFERRED carry | OPEN. Not actively ranked. | n/a | When separately directed. |
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (18+ occurrences; STRONG)** | Re-applied at sync close. | chat → next lesson cycle | Promote. |
| **L-v2.85-e** | push_files length budget — split-commit mitigation | **P3 (PROMOTION-CONFIRMED v2.88; streak re-baseline pending after v3.02 clobber)** | — | chat → next lesson cycle | **PROMOTE.** |
| **L41 / full-file-write clobber mitigation** | Re-read HEAD before any full-file sync write; out-of-band commits silently reverted otherwise | **P2 (re-exercised v3.02.1 — recurred because mitigation was claimed-not-performed at v3.02)** | NEGATIVE exemplar at v3.02; POSITIVE repair at v3.02.1. | chat → next lesson cycle | **Pair-promote with L-v2.85-e. Strong candidate.** |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | P3 (4 occurrences) | Promotion-eligible. | chat → next lesson cycle | Promote. |
| **L-v2.94 convention (NEW)** | brief lifecycle ready→fire→review_required→PK observe→ready | P3 (1 natural cycle v3.01) | Confirm across 2-3 more cycles. | chat → next session | Watcher. |
| **L-v3.02-a (NEW)** | Mobile breakpoint verification after primary operator-surface change | P3 (1 occurrence v3.02) | Watcher. | chat → next session | Promote after one more occurrence. |
| **L62 reinforcement** | Type-B vs Type-C D-01 handling | P3 (strongly reinforced via cc-0016 6-fire series) | — | chat → next lesson cycle | Strong empirical record. |
| **L-v2.88-a** | Identical PK-directive loop watcher | P3 (watcher CLOSED for cc-0016; re-fired at v3.02 re-send — recognised + not re-executed) | 3 cumulative occurrences now (v2.88 + v2.91 + v3.02 re-send). | chat → next lesson cycle | Pair-promote with L-v2.85-e if recurs. |
| **L-v2.90-a-f** | V-D fixture / arity DROP / etc. | P3 (not re-exercised) | Watchers. | chat → next session | Watcher. |
| **L-v2.78-a / L-v2.81-a / L47 / L-v2.84-a-d / L-v2.85-b/c/d / L-v2.86-a-e / L-v2.88-b/c/d / L-v2.89-a** | Various candidates | P3 carry | Unchanged. | chat → next session/lesson cycle | Various. |
| **Other carries** | Minor doc patches (cc-0010A/0011/0012) / F-K-SCHEMA-REGISTRY-R-STALE / AI cost view / Publisher latent config / M8b / 94-row cohort / F-CRON-AUTO-APPROVER-SECRET-INLINE / morning-inbox-sweep-v1 / 22 escalated m.chatgpt_review rows / Memory cap 19/30 / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged. | various | various |

**Closed v3.02:** Mobile/narrow viewport verification → CLOSED/PASS (CCB 306×498 DPR2).
**Spawned v3.02:** Mobile-fix commit SHA backfill — P3 admin carry.
**Closed v3.01:** Cowork brief lifecycle gating WARN.
**Closed earlier:** v3.00 cc-0016 Stage D + evidence path; v2.99 cc-0016 Stage B + V-A5; v2.98 cc-0016 Stage C apply; v2.97 cc-0016 Stage A apply; v2.96 dashboard slices 4A–4B + top alert bar reconciliation; v2.95 dashboard slices 1–3 + PHASES streak + "Stop Claude"; v2.93 Reconciliation daily cadence diagnostic; v2.92 Health_check V-C3; v2.91 cc-0017e v1.1 doc patch; v2.90 cc-0017e apply; v2.85 cc-0017c apply; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.77 cc-0014 archived.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v3.01.

---

## 📌 Backlog

**v3.02 (+v3.02.1) state changes:**
- **Mobile/narrow viewport verification CLOSED/PASS v3.02** (CCB 306×498 DPR2). Removed from open P3 carries.
- **Mobile-fix commit SHA backfill** added as P3 admin carry (PENDING; not supplied in directive).
- **L-v3.02-a NEW lesson candidate** registered.
- **L41 re-exercised v3.02.1** — full-file push from stale content clobbered v3.01; repaired read-HEAD-first.
- **Cowork brief lifecycle gating WARN CLOSED v3.01** (restored after original-v3.02 clobber).
- cc-0016 Stage A/B/C/D all closed; evidence path complete + mobile-verified; only Stage E remains (future/separately-approved).
- cc-0015 Gate 11 watch at rank 1 (closes 2026-05-26). PRV unchanged. Q-005 non-blocking carry.
- T-MCP-02 cum ~92 unchanged. State-capture exceptions cum 1 unchanged.
- **No decisions.md change.**

---

## 🧊 Frozen / Deferred

Unchanged. **cc-0016 Stage E lifecycle cleanup** — future/separately-approved-only. **Backend/shared-metrics refactor** — deferred carry.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e + L-v2.88-a-d + L-v2.89-a + L-v2.90-a-f + L-v2.94 + L-v3.02-a candidates carried.

- **L41**: re-exercised v3.02.1 (full-file-write clobber → read-HEAD-first repair). Strong pair-promote candidate.
- **L62**: strongly reinforced via cc-0016 6-fire D-01 series. Not newly exercised (no D-01).
- **L-v2.83-a**: 18+ occurrences. STRONG.
- **L-v2.85-e**: PROMOTION-CONFIRMED v2.88; streak re-baseline pending after v3.02 clobber.
- **L-v2.88-a**: watcher CLOSED for cc-0016; re-fired at v3.02 re-send (recognised; not re-executed). 3 cumulative.
- **L-v2.94 convention**: NEW candidate (v3.01).
- **L-v3.02-a**: NEW candidate (v3.02).
- **L-v2.90-a-f**: watchers.

**Highest-priority promotions next lesson cycle: L41 + full-file-write mitigation (pair), L-v2.85-e, L-v2.85-a, L-v2.83-a.**

---

## v3.02 (+v3.02.1) honest limitations

- **Mobile-fix commit SHA not supplied in directive** — recorded PENDING; not fabricated. Backfill next session.
- **Original v3.02 push clobbered v3.01 `00_` content** — root cause: full-file `push_files` from stale-held (pre-v3.01) content after v3.01 (`83cd633c`) landed out-of-band; the v3.02 commit falsely claimed L41 mitigation. Repaired in v3.02.1 (this patch set). v3.01 commit + session file never lost.
- **Cross-repo recording only** — chat did not fetch dashboard repo HEAD or independently verify the mobile fix. Recorded per directive payload.
- **"CCB MOBILE PASS" = one device profile** (Nexus 5, 306×498, DPR2), not a cross-device matrix.
- **Smoke artefacts retained** (2 events + 1 storage object); NOT cleaned up.
- **friction.* schema state assumed unchanged** from Stage C apply; not re-probed.
- **CONSTRAINT 1 operator-authorisation negative-path test gap** (flagged v2.99) carries forward; mobile fix layout-only.
- **T-MCP-02 cumulative ~92 unchanged** (0 D-01 fires). State-capture exceptions cumulative 1.
- **Gate 11 day count not refreshed** (window closes 2026-05-26).
- **Memory cap 19/30** unchanged.
- **Production mutations: 0.** Supabase mutations: 0. apply_migration: 0. EF deploys: 0. Application code edits (either repo): 0.
- **No decisions.md change. No Stage E work. No cc-0015 start. No PRV closure. No re-execution of the duplicate v3.02 directive.**

---

## Changelog

- v1.0–v2.96: per commit history.
- v2.97 (2026-05-20 Sydney): cc-0016 Stage A apply (verified in v2.99.1 at `2db1656`).
- v2.98 (2026-05-20 Sydney): cc-0016 Stage C apply (verified in v2.99.1 at `2db1656`).
- v2.99 (2026-05-20 Sydney): cc-0016 Stage B FAB upload/read UX validated + V-A5 PASS.
- v2.99.1 (2026-05-21 Sydney): reconciliation at `2db1656` — ancestry clean; v2.97 + v2.98 session files confirmed; placeholder rows patched.
- v3.00 (2026-05-21 Sydney): cc-0016 Stage D /operations evidence display VISUAL PASS. Evidence path COMPLETE A→B→C→D.
- v3.00.1 (2026-05-21 Sydney): reconciliation patch — corrected stale v2.97/v2.98 placeholder wording (session file `e052962`, sync_state `6ab1149`, action_list `a98acaf`).
- v3.01 (2026-05-20T23:29Z, `83cd633c`, authored by another agent): Cowork brief lifecycle gating WARN CLOSED; v2.94 convention validated end-to-end vs 2026-05-20T160237Z natural fire; brief reset to `ready`; cc-0015 Gate 11 watch promoted to rank 1; Q-005 OPEN non-blocking; L-v2.94 NEW candidate. 5-file atomic commit.
- **v3.02 (2026-05-21T00:42Z, `a08945d3`): Dashboard mobile/narrow viewport verification CLOSED/PASS** — CCB 306×498 Nexus 5 DPR2 → MOBILE PASS; mobile fix resolved sidebar/rail/operations/badge/Evidence/triage/FAB/Roadmap; "Stop Claude" external. Mobile-fix SHA PENDING (not supplied). L-v3.02-a NEW. **DEFECT: this commit's full-file push reverted v3.01's `00_` index/ranking content and falsely claimed L41 mitigation.**
- **v3.02.1 (2026-05-21, reconciliation patch): restored v3.01 `00_` content clobbered by v3.02 (Cowork WARN CLOSED; cc-0015 rank 1; v3.01 index row; Q-005 carry) + kept v3.02 mobile closure + corrected the false L41-mitigation claim. L41 genuinely re-exercised. Read-HEAD-first per-file `create_or_update_file` patches: sync_state `958b056f`, this action_list commit, v3.02 session file patch. 0 Supabase / 0 dashboard / 0 Stage E / 0 cc-0015 start / 0 PRV closure / 0 smoke deletion.**
