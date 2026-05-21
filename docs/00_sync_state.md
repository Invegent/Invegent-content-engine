# ICE — Sync State Index

> **This file is the lightweight session pointer index.** Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1). See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for pre-restructure history.

---

> **⚠️ v3.02.1 reconciliation note (2026-05-21):** the original v3.02 close (`a08945d3`) was authored from pre-v3.01 content and its full-file `push_files` **reverted v3.01's index/ranking content** in this file and in `action_list` (Cowork WARN closure, cc-0015 promoted to rank 1, v3.01 index row). The v3.01 commit (`83cd633c`) and its session file survived; only the `00_` index content was clobbered. This file now restores v3.01's facts AND keeps v3.02's mobile-viewport closure. The v3.02 commit's claim of "L41 clobber-mitigation applied" was **false** — HEAD was not re-read before that push; this patch is the repair. L41 genuinely re-exercised here.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog
3. Open the most-recent session file from the index below if deeper context is needed

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-21 | v3.02-dashboard-mobile-viewport-pass | **Dashboard mobile/narrow viewport verification CLOSED/PASS.** CCB tested at 306×498 Nexus 5 Android Chrome UA, DPR 2 → MOBILE PASS. Mobile fix resolved: sidebar collapses to hamburger/drawer; desktop fixed rail no longer consumes mobile width; /operations rows readable; evidence paperclip badge visible; expanded Evidence section usable; triage guardrail usable; FAB usable; Roadmap readable; "Stop Claude" overlay remains external Claude Browser tooling. **Mobile/narrow viewport verification removed from open P3 carries.** Mobile-fix commit SHA NOT supplied in directive — recorded PENDING (not fabricated); backfill next session. NEW lesson candidate L-v3.02-a: mobile breakpoint verified after any primary operator-surface change. cc-0015 Gate 11 watch / Stage E future / PRV deferred / Q-005 (if open) PRESERVED. *(v3.02.1 reconciliation: original v3.02 push clobbered v3.01 `00_` index content; restored — see footer + v3.02 session file.)* | `docs/runtime/sessions/2026-05-21-v3.02-dashboard-mobile-viewport-pass.md` |
| 2026-05-21 | v3.01-cowork-lifecycle-warn-closed | **Cowork brief lifecycle gating WARN CLOSED.** v2.94 lifecycle convention validated end-to-end on the first natural cycle: `nightly-health-check-v1` brief `ready → review_required → PK observed → ready` against the 2026-05-20T16:02:37Z natural 16:00 UTC fire (`docs/runtime/runs/nightly-health-check-v1-2026-05-20T160237Z.md`; finished 16:08:30Z; 0 schema-drift fallbacks; all 14 SQL queries verbatim; dual-write — 5 P1 → `friction.event`, 2 P2 → `friction.emit_error` `CONDITION-KEY-UNRESOLVED`). Brief frontmatter reset to `ready`; queue row closure-annotated. **WARN no longer at core rank 1.** New core rank 1 = **cc-0015 Gate 11 watch** (closes 2026-05-26). **Q-nightly-health-check-v1-005 remains OPEN** (non-blocking function-contract drift; future v3.1 / spec patch). L-v2.94 convention NEW candidate. | `docs/runtime/sessions/2026-05-21-v3.01-cowork-lifecycle-warn-closed.md` |
| 2026-05-21 | v3.00-cc0016-stage-d-evidence-display-visual-pass | **cc-0016 Stage D /operations evidence display VISUAL PASS** (+v3.00.1 reconciliation patch). Dashboard Stage D at `9082beb`. CCB VISUAL PASS: paperclip badge 📎1, Evidence (1) section, signed-URL thumbnail, PNG new tab (64×64), unattached cases normal, triage guardrail intact. **cc-0016 Stage D CLOSED/PASS.** Evidence path COMPLETE A→B→C→D. v3.00.1 corrected stale v2.97/v2.98 placeholder note (reconciled in v2.99.1 at `2db1656`). | `docs/runtime/sessions/2026-05-21-v3.00-cc0016-stage-d-evidence-display-visual-pass.md` |
| 2026-05-20 | v2.99-cc0016-stage-b-fab-upload-validated | **cc-0016 Stage B FAB upload/read UX validated + V-A5 PASS.** Dashboard Stage B at `36fe6ad`. CCB + chat backend + CCD read-back verified. V-A5 empirically PASS. Smoke artefacts retained (events `2120b2f7` + `75f0c981`, object `friction-evidence/9e314151-.../0_va5-smoke.png`). **Stage B CLOSED/PASS.** | `docs/runtime/sessions/2026-05-20-v2.99-cc0016-stage-b-fab-upload-validated.md` |
| 2026-05-20 | v2.98-cc0016-stage-c-applied | cc-0016 Stage C APPLIED/CLOSED. emit_event 13-arg + fn_emit_manual_event 8-arg; cc-0017b preserved. D-01 fires `56e65bb2` / `dbabb576` / `358c6fdd` (final APPROVED). *(Verified to exist in v2.99.1 at `2db1656`.)* | `docs/runtime/sessions/2026-05-20-v2.98-cc0016-stage-c-applied.md` |
| 2026-05-20 | v2.97-cc0016-stage-a-applied | cc-0016 Stage A APPLIED/CLOSED. Bucket + attachments column + 2 CHECK + index + view + GRANT. D-01 fires `6f2b8b1a` / `f573e684` / `9eb35144` (final APPROVED). *(Verified to exist in v2.99.1 at `2db1656`.)* | `docs/runtime/sessions/2026-05-20-v2.97-cc0016-stage-a-applied.md` |
| 2026-05-20 | v2.96-dashboard-slices-4a-4b-recorded | **Dashboard slices 4A–4B recorded.** Slice 4A `cd02402` / slice 4B `f5a980f` VISUAL PASS. Top alert bar count reconciliation CLOSED for UI-copy/linkification scope. | `docs/runtime/sessions/2026-05-20-v2.96-dashboard-slices-4a-4b-recorded.md` |
| 2026-05-20 | v2.95-dashboard-slices-1-3-recorded | **Dashboard slices 1–3 recorded.** Slice 1 `af60953` / slice 2 `de4501b` + `37008e5` / slice 3 `991a92b`. PHASES 46-streak deferral CLOSED by Slice 3. | `docs/runtime/sessions/2026-05-20-v2.95-dashboard-slices-1-3-recorded.md` |
| 2026-05-20 | v2.94-cowork-brief-lifecycle-reset-and-convention | Cowork brief lifecycle gating WARN REFRAMED + ready reset + convention patched. WARN NOT closed. | `docs/runtime/sessions/2026-05-20-v2.94-cowork-brief-lifecycle-reset-and-convention.md` |
| 2026-05-20 | v2.93-cron85-natural-fire-closed-9check-retired | Reconciliation daily cadence diagnostic CLOSED-PASS. D-FR-RECON-001 v1.0 at `fc726e3c`. | `docs/runtime/sessions/2026-05-20-v2.93-cron85-natural-fire-closed-9check-retired.md` |
| 2026-05-19 | v2.92-vc3-signal-production-closed | Health_check V-C3 CLOSED-PASS. Cowork brief lifecycle gating WARN spawned. | `docs/runtime/sessions/2026-05-19-vc3-signal-production-closed.md` |
| 2026-05-16 | v2.76-stage-e-close-and-window-open | cc-0014 FULLY CLOSED + 14-DAY WINDOW + FAB LIVE + cc-0015/0016 DRAFTED. | `docs/runtime/sessions/2026-05-16-v2.76-stage-e-close-and-window-open.md` |

*(Older sessions truncated for brevity. v2.77–v2.91 per prior index.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-21 Sydney — v3.02: Dashboard mobile/narrow viewport verification CLOSED/PASS

**Outcome:** Dashboard mobile/narrow viewport verification PASSED after the dashboard mobile fix. CCB tested at **306×498 Nexus 5 Android Chrome UA, DPR 2** — result MOBILE PASS. The mobile/narrow viewport verification carry (open since dashboard slice 3, P3) is now CLOSED/PASS and removed from open P3 carries. No content-engine code changes, no Supabase mutations, no dashboard edits this session.

**⚠️ Mobile-fix commit SHA NOT supplied in directive** — recorded as `<PENDING — SHA not supplied in directive>`; chat did not fabricate a SHA. Backfill next session.

**Mobile fix resolved (CCB verified at 306×498 DPR2):** sidebar collapses to hamburger/drawer; desktop fixed rail no longer consumes mobile width; /operations rows readable; evidence paperclip badge visible; expanded Evidence section usable; triage guardrail usable; FAB usable; Roadmap readable; "Stop Claude" overlay remains external Claude Browser tooling.

**Items closed v3.02:** Mobile/narrow viewport verification (CLOSED/PASS; removed from open P3 carries).

**Lesson candidate v3.02:** L-v3.02-a (NEW) — mobile/narrow breakpoint should be verified after any primary operator-surface change. 1 occurrence; watcher.

**⚠️ v3.02.1 reconciliation (2026-05-21):** the original v3.02 close (`a08945d3`) was authored from pre-v3.01 content and its full-file push reverted v3.01's `00_` index/ranking content (Cowork WARN closure; cc-0015 rank-1 promotion; v3.01 index row). That content is restored in this patch. The v3.02 commit's "L41 mitigation applied" claim was false (HEAD not re-read before push). L41 genuinely re-exercised in this repair. v3.01 commit + session file were never lost (push didn't touch those paths).

**Hard stops respected v3.02 (+v3.02.1):**
- 0 Invegent-dashboard edits / 0 Supabase mutations
- 0 Stage E started / 0 cleanup run
- 0 cc-0015 start before Gate 11 closes / 0 PRV closure
- 0 deletion of smoke objects or test events
- 0 D-01 fires / 0 memory edits / 0 decisions.md edits
- 0 SHA fabrication (mobile-fix commit recorded as PENDING)

---

### 2026-05-21 Sydney — v3.01: Cowork brief lifecycle gating WARN CLOSED (preserved)

**Outcome:** Cowork lifecycle gating WARN (open since v2.92 → reframed v2.94 → core rank 1 since v2.94) is **CLOSED**. The v2.94 lifecycle convention — `ready → (16:00 UTC natural fire) → review_required → PK observed → ready` — validated end-to-end against the **2026-05-20T16:02:37Z** natural fire as convention-cycle-1 evidence. PK accepted this single successful cycle as sufficient. `nightly-health-check-v1` brief frontmatter reset to `status: ready`. Q-nightly-health-check-v1-005 remains OPEN (non-blocking function-contract drift; future v3.1 brief / spec patch; NOT bundled into closure). No Supabase mutations; no dashboard touched; no manual/forced run.

| Fact | Value |
|---|---|
| Run trigger | Natural 16:00 UTC cron (no manual force) |
| Started → finished | 2026-05-20T16:02:37Z → 16:08:30Z (~6 min) |
| Schema-drift fallbacks | 0 |
| SQL queries | 14 / 14 verbatim |
| Markdown output | `docs/audit/health/2026-05-20.md` |
| Dual-write | `{success_count: 5, failure_count: 0, skipped_count: 2}` |
| friction.event | 5 P1 (true-stuck-cluster; visible on `/operations` post Stage D) |
| friction.emit_error | 2 P2 (`CONDITION-KEY-UNRESOLVED`) |
| Lifecycle transition | `ready → review_required` (correct v2.94 behaviour) |

**New core rank 1 = cc-0015 Gate 11 watch** (window closes 2026-05-26). Q-005 carries non-blocking. L-v2.94 convention NEW candidate (confirm across 2-3 more natural cycles before promotion-eligible).

*(Full detail at `docs/runtime/sessions/2026-05-21-v3.01-cowork-lifecycle-warn-closed.md`.)*

---

### 2026-05-21 Sydney — v3.00 close (brief)

cc-0016 Stage D /operations evidence display VISUAL PASS (+v3.00.1 reconciliation patch). Dashboard Stage D at `9082beb` (files: `app/(dashboard)/operations/page.tsx`, `app/(dashboard)/operations/case-row.tsx`; typecheck PASS). CCB VISUAL PASS: paperclip badge 📎1, Evidence (1) section, signed-URL thumbnail, PNG new tab (64×64). cc-0016 Stage D CLOSED/PASS; evidence path COMPLETE A→B→C→D. Stage E future/separately-approved-only. v3.00.1 corrected the stale v2.97/v2.98 placeholder note (reconciled in v2.99.1 at `2db1656`).

*(Full detail at `docs/runtime/sessions/2026-05-21-v3.00-cc0016-stage-d-evidence-display-visual-pass.md`.)*

---

## 🟡 Next session priorities (rebuilt v3.02)

**Core ICE ranks:**

1. **cc-0015 Gate 11 watch** — P2 carry, rank 1 (from v3.01; Cowork WARN closed). Time-bound: window closes **2026-05-26** (~5 days out from 2026-05-21). Passive observation; when gate clears, cc-0015 friction-pool-view UI (Wave 7) unblocks as the leading dashboard build.
2. **cc-0016 Stage E — scoping/dry-run design ONLY (if PK picks Option A)** — P2, rank 2 conditional. NON-MUTATING design work; first destructive cleanup run still requires separate PK approval + dry-run. Stage A CONSTRAINT 2 binds.
3. **Wave 0f scoping** — P3, rank 3. Opportunistic during Gate 11 window.
4. **Platform Reconciliation View brief authoring** — P2 carry, rank 4 (deferred per D-FR-RECON-001 §7.D).
5. **5-row close-the-loop batch / Pre-sales / `purge_test_case` helper case_history extension** — P2/P3 carry, rank 5.

**Carries flagged (NOT actively ranked):**
- **Q-nightly-health-check-v1-005** — function-contract drift (skipped_count + emit_error routing not in brief §12.3). NON-BLOCKING. Future v3.1 brief patch / spec patch.
- **Mobile-fix commit SHA backfill** — PENDING from v3.02 (not supplied in directive); supply + patch next session.
- **3 no-fire scheduler days** (2026-05-16, 2026-05-18, 2026-05-19) — P3 secondary; informational only.

**Time-bound nudge:** cc-0015 Gate 11 observation window closes **2026-05-26** (~5 days out). When it closes, cc-0015 friction-pool-view UI (Wave 7) unblocks.

**Dashboard work (separately ranked v3.02):**

1. **D1**: cc-0015 friction-pool-view UI (slice 5) — P2, Gate 11 closes 2026-05-26 (leading dashboard build once gate clears).
2. **D2**: PRV surface — P2, brief authoring deferred.

*(Mobile/narrow viewport verification removed from dashboard work — CLOSED/PASS v3.02.)*

**Standing P0:** Personal businesses check-in. Crazy Domains refund + clean-up carry from v2.51.

Carries: cc-0015 (Wave 7, gated on Gate 11 closing 2026-05-26); cc-0016 Stage E (future/separately-approved); mobile-fix commit SHA backfill (PENDING from v3.02); Q-005 (non-blocking); cc-0017c v1.2 doc patch; cc-0017a v1.2 doc patch; vchecks.md V-B4 doc patch; minor doc patches; F-CRON-AUTO-APPROVER-SECRET-INLINE; backend/shared-metrics refactor (deferred); lesson promotions (L-v2.83-a STRONG 18+; **L-v2.85-e PROMOTION-CONFIRMED**; L-v2.85-a HIGH-SIGNAL 4 occurrences; L62 strongly reinforced via cc-0016 6-fire series; L-v2.88-a watcher CLOSED for cc-0016; **L-v2.94 convention NEW candidate**; **L-v3.02-a NEW candidate**; **L41 re-exercised v3.02.1**; L-v2.90-a-f watchers).

---

## ⛔ Carried-forward "do not touch" state

**v3.02 (+v3.02.1) updates on standing items:**

- **Mobile/narrow viewport verification CLOSED/PASS v3.02.** CCB at 306×498 Nexus 5 DPR2. Removed from open P3 carries.
- **Mobile-fix commit SHA PENDING** — not supplied in v3.02 directive; backfill next session.
- **Cowork brief lifecycle gating WARN — CLOSED v3.01.** v2.94 convention validated end-to-end against the 2026-05-20T160237Z natural fire. Brief reset to `ready` for next cycle. Q-005 carries non-blocking. **No longer at core rank 1.** *(This fact was clobbered by the original v3.02 push and restored in v3.02.1.)*
- **cc-0016 Stage D CLOSED/PASS v3.00.** Dashboard `9082beb`. Evidence display live on `/operations` (now also mobile-verified).
- **cc-0016 evidence capture/display path COMPLETE through Stage D** (A→B→C→D).
- **cc-0016 Stage B CLOSED/PASS** (v2.99). Dashboard `36fe6ad`. V-A5 PASS.
- **cc-0016 Stage A CLOSED** (applied v2.97; session file verified in v2.99.1 at `2db1656`).
- **cc-0016 Stage C CLOSED** (applied v2.98; session file verified in v2.99.1 at `2db1656`).
- **cc-0016 Stage E** — future/separately-approved-only. Stage A CONSTRAINT 2 binds. Do NOT start automatically.
- **V-A5 smoke object** `friction-evidence/9e314151-be65-434e-8588-c913012f6591/0_va5-smoke.png` — DO NOT DELETE; Stage D demo artefact.
- **Smoke events** `2120b2f7` + `75f0c981` — DO NOT cleanup unless separately directed.
- **cc-0015 / PRV** unchanged — preserved open. cc-0015 do NOT start before Gate 11 closes 2026-05-26.
- **Q-nightly-health-check-v1-005** — OPEN, non-blocking; future v3.1 brief / spec patch.
- **Dashboard slices 1–3 + 4A–4B RECORDED** v2.95 + v2.96 (carry).
- **cc-0016 Stage B + Stage D** live on `dashboard.invegent.com` (`36fe6ad` + `9082beb`); now mobile-verified.
- **Top alert bar count reconciliation CLOSED for UI-copy scope v2.96** (carry).
- **Dashboard PHASES 46-streak deferral CLOSED v2.95** (carry).
- **"Stop Claude" overlay external/non-app v2.95** (carry; re-confirmed external in v3.02 mobile pass).
- **Backend/shared-metrics refactor** — deferred carry; not actively ranked.
- **Reconciliation daily cadence diagnostic CLOSED-PASS v2.93** — carry.
- **D-FR-RECON-001 v1.0 at `fc726e3c`** — carry.
- **cc-0017a/b/c/d/e APPLIED**, **cc-0014 CLOSED-ARCHIVED** — unchanged.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0**; reset to `ready` v2.94 + reset to `ready` again v3.01 (post-cycle-1 closure). Brief version unchanged; Q-005 carries non-blocking.
- **cron 82-86** firing normally.
- **L41**: **re-exercised v3.02.1** — the original v3.02 full-file push clobbered v3.01 `00_` content (claimed-but-not-performed HEAD re-read); v3.02.1 repaired via read-HEAD-first per-file patches. Strong negative-then-positive exemplar.
- **L40 / L46 / L58 / L62**: L62 strongly reinforced via cc-0016 series; L40/L46/L58 not exercised.
- **L-v2.83-a**: **18+ occurrences**. STRONG CANDIDATE confirmed.
- **L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged).
- **L-v2.85-e**: PROMOTION-CONFIRMED v2.88. *(Streak-counting muddied by the v3.02 clobber + v3.02.1 repair; treat the "consecutive" tally as needing a clean re-baseline next clean close rather than as a clean 15th.)*
- **L-v2.88-a**: watcher CLOSED for cc-0016. 2 prior occurrences (v2.88 + v2.91) carry for other contexts. **NOTE: this re-sent identical v3.02 directive is itself an L-v2.88-a identical-directive event — chat recognised the duplicate and did NOT re-execute; instead repaired the clobber.**
- **L-v2.94 convention**: NEW candidate (v3.01). Confirm across 2-3 more natural cycles.
- **L-v3.02-a**: NEW candidate (mobile breakpoint verification after primary operator-surface change). 1 occurrence; watcher.
- **L-v2.90-a-f**: not empirically re-exercised. Watchers.
- **22 close-the-loop UPDATEs baseline** — Stage C 3 rows assumed resolved at v2.98 apply; net not recomputed.
- **T-MCP-02 quota: ~92 cumulative** unchanged (0 D-01).
- State-capture exceptions: 1 unchanged.
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier).
- **Production FAB + evidence display live on dashboard.invegent.com** (Stage B + Stage D); now mobile-verified.
- **Localhost FAB cleanup pending** (`.env.local`).
- **D-CC-0017B-Q1** + **D-IOL-001** (v2.77) carried.

---

## 📜 G1 convention (the rule)

Unchanged. v3.02 per-session file `docs/runtime/sessions/2026-05-21-v3.02-dashboard-mobile-viewport-pass.md` committed; v3.02.1 reconciliation restored v3.01 `00_` content + corrected the false L41-mitigation claim via read-HEAD-first per-file `create_or_update_file` patches (sync_state + action_list + v3.02 session file). `decisions.md` not touched.

**Lesson surfaced (v3.02.1):** after an out-of-band commit lands (here v3.01 `83cd633c`, authored by another agent between v3.00.1 and v3.02), a subsequent full-file `push_files` from stale-held content silently reverts the intervening work even though git advances cleanly on the new parent. Full-file sync writes MUST re-read HEAD first. This is the same failure flagged at v3.00.1 — it recurred at v3.02 because the mitigation was claimed but not performed. Pair-promote with L41.

---

*Last updated: 2026-05-21 Sydney — v3.02 (+v3.02.1 reconciliation): Dashboard mobile/narrow viewport verification CLOSED/PASS (CCB 306×498 Nexus 5 DPR2 → MOBILE PASS; sidebar drawer; rail fixed; /operations + paperclip badge + Evidence section + triage guardrail + FAB + Roadmap all usable; "Stop Claude" external). Mobile/narrow viewport removed from open P3 carries. Mobile-fix commit SHA PENDING (not supplied; not fabricated). NEW L-v3.02-a. v3.02.1 restored v3.01 content that the original v3.02 push clobbered (Cowork WARN CLOSED; cc-0015 rank-1; v3.01 index row) and corrected the false "L41 mitigation applied" claim — L41 genuinely re-exercised. Rank 1 = cc-0015 Gate 11 watch (closes 2026-05-26). cc-0015 / Stage E / PRV / Q-005 preserved. 0 dashboard edits / 0 Supabase mutations / 0 Stage E / 0 cleanup / 0 cc-0015 start / 0 PRV closure / 0 smoke deletion / 0 D-01 / 0 memory edits / 0 decisions.md edits. T-MCP-02 cum ~92. State-capture exceptions cum 1. L-v2.83-a 18+ STRONG. v3.01 (Cowork WARN CLOSED) + v3.00 (+v3.00.1) detail preserved above.*
