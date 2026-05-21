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
| 2026-05-21 | v3.02-dashboard-mobile-viewport-pass | **Dashboard mobile/narrow viewport verification CLOSED/PASS.** CCB tested at 306×498 Nexus 5 Android Chrome UA, DPR 2 → MOBILE PASS. Mobile fix resolved: sidebar collapses to hamburger/drawer; desktop fixed rail no longer consumes mobile width; /operations rows readable; evidence paperclip badge visible; expanded Evidence section usable; triage guardrail usable; FAB usable; Roadmap readable; "Stop Claude" overlay remains external Claude Browser tooling. **Mobile/narrow viewport verification removed from open P3 carries.** Mobile-fix commit SHA NOT supplied in directive — recorded as PENDING (not fabricated); patch next session. NEW lesson candidate L-v3.02-a: mobile breakpoint verified after any primary operator-surface change. cc-0015 Gate 11 watch / Stage E future / PRV deferred / Q-005 (if open) PRESERVED. 0 dashboard edits / 0 Supabase mutations / 0 Stage E / 0 cleanup / 0 cc-0015 start / 0 PRV closure / 0 smoke deletion / 0 D-01 fires. L-v2.85-e 14th consecutive. L-v2.83-a 18+ STRONG. Files changed: 3 (atomic single commit). | `docs/runtime/sessions/2026-05-21-v3.02-dashboard-mobile-viewport-pass.md` |
| 2026-05-21 | v3.00-cc0016-stage-d-evidence-display-visual-pass | **cc-0016 Stage D /operations evidence display VISUAL PASS** (+v3.00.1 reconciliation patch). Dashboard Stage D at `9082beb`. CCB VISUAL PASS: paperclip badge 📎1, Evidence (1) section, signed-URL thumbnail, PNG new tab (64×64), unattached cases normal, triage guardrail intact. **cc-0016 Stage D CLOSED/PASS.** Evidence path COMPLETE A→B→C→D. v3.00.1 corrected stale v2.97/v2.98 placeholder note (reconciled in v2.99.1 at `2db1656`). | `docs/runtime/sessions/2026-05-21-v3.00-cc0016-stage-d-evidence-display-visual-pass.md` |
| 2026-05-20 | v2.99-cc0016-stage-b-fab-upload-validated | **cc-0016 Stage B FAB upload/read UX validated + V-A5 PASS.** Dashboard Stage B at `36fe6ad`. CCB + chat backend + CCD read-back verified. V-A5 empirically PASS. Smoke artefacts retained (events `2120b2f7` + `75f0c981`, object `friction-evidence/9e314151-.../0_va5-smoke.png`). **Stage B CLOSED/PASS.** | `docs/runtime/sessions/2026-05-20-v2.99-cc0016-stage-b-fab-upload-validated.md` |
| 2026-05-20 | v2.98-cc0016-stage-c-applied | cc-0016 Stage C APPLIED/CLOSED. emit_event 13-arg + fn_emit_manual_event 8-arg; cc-0017b preserved. D-01 fires `56e65bb2` / `dbabb576` / `358c6fdd` (final APPROVED). *(Verified to exist in v2.99.1 at `2db1656`.)* | `docs/runtime/sessions/2026-05-20-v2.98-cc0016-stage-c-applied.md` |
| 2026-05-20 | v2.97-cc0016-stage-a-applied | cc-0016 Stage A APPLIED/CLOSED. Bucket + attachments column + 2 CHECK + index + view + GRANT. D-01 fires `6f2b8b1a` / `f573e684` / `9eb35144` (final APPROVED). *(Verified to exist in v2.99.1 at `2db1656`.)* | `docs/runtime/sessions/2026-05-20-v2.97-cc0016-stage-a-applied.md` |
| 2026-05-20 | v2.96-dashboard-slices-4a-4b-recorded | **Dashboard slices 4A–4B recorded.** Slice 4A `cd02402` / slice 4B `f5a980f` VISUAL PASS. Top alert bar count reconciliation CLOSED for UI-copy/linkification scope. | `docs/runtime/sessions/2026-05-20-v2.96-dashboard-slices-4a-4b-recorded.md` |
| 2026-05-20 | v2.95-dashboard-slices-1-3-recorded | **Dashboard slices 1–3 recorded.** Slice 1 `af60953` / slice 2 `de4501b` + `37008e5` / slice 3 `991a92b`. PHASES 46-streak deferral CLOSED by Slice 3. | `docs/runtime/sessions/2026-05-20-v2.95-dashboard-slices-1-3-recorded.md` |
| 2026-05-20 | v2.94-cowork-brief-lifecycle-reset-and-convention | Cowork brief lifecycle gating WARN REFRAMED + ready reset + convention patched. WARN NOT closed. | `docs/runtime/sessions/2026-05-20-v2.94-cowork-brief-lifecycle-reset-and-convention.md` |
| 2026-05-20 | v2.93-cron85-natural-fire-closed-9check-retired | Reconciliation daily cadence diagnostic CLOSED-PASS. D-FR-RECON-001 v1.0 at `fc726e3c`. | `docs/runtime/sessions/2026-05-20-v2.93-cron85-natural-fire-closed-9check-retired.md` |
| 2026-05-16 | v2.76-stage-e-close-and-window-open | cc-0014 FULLY CLOSED + 14-DAY WINDOW + FAB LIVE + cc-0015/0016 DRAFTED. | `docs/runtime/sessions/2026-05-16-v2.76-stage-e-close-and-window-open.md` |

*(Older sessions truncated for brevity. v2.77–v2.92 per prior index.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-21 Sydney — v3.02: Dashboard mobile/narrow viewport verification CLOSED/PASS

**Outcome:** Dashboard mobile/narrow viewport verification PASSED after the dashboard mobile fix. CCB tested at **306×498 Nexus 5 Android Chrome UA, DPR 2** — result MOBILE PASS. The mobile/narrow viewport verification carry (open since dashboard slice 3, P3) is now CLOSED/PASS and removed from open P3 carries. No content-engine code changes, no Supabase mutations, no dashboard edits this session.

**⚠️ Mobile-fix commit SHA NOT supplied in directive** — recorded as `<PENDING — SHA not supplied in directive>`; chat did not fabricate a SHA. Patch next session.

**Mobile fix facts:**

| Fact | Value |
|---|---|
| Dashboard mobile-fix commit | `<PENDING — SHA not supplied in directive>` |
| Test device profile | Nexus 5, Android Chrome UA |
| Viewport | 306×498 |
| DPR | 2 |
| Result | **MOBILE PASS** |

**Mobile fix resolved (CCB verified):** sidebar collapses to hamburger/drawer; desktop fixed rail no longer consumes mobile width; /operations rows readable; evidence paperclip badge visible; expanded Evidence section usable; triage guardrail usable; FAB usable; Roadmap readable; "Stop Claude" overlay remains external Claude Browser tooling.

**Items closed v3.02:** Mobile/narrow viewport verification (CLOSED/PASS; removed from open P3 carries).

**Items explicitly preserved (per directive):** cc-0015 Gate 11 watch (window closes 2026-05-26; do NOT start before); cc-0016 Stage E lifecycle cleanup (future/separately-approved); PRV (deferred per D-FR-RECON-001 §7.D); Cowork lifecycle gating WARN (core rank 1); Q-005 (if open, preserved non-blocking); backend/shared-metrics refactor (deferred carry).

**Lesson candidate v3.02:** L-v3.02-a (NEW) — mobile/narrow breakpoint should be verified after any primary operator-surface change. 1 occurrence; watcher.

**Hard stops respected v3.02:**
- 0 Invegent-dashboard edits / 0 Supabase mutations
- 0 Stage E started / 0 cleanup run
- 0 cc-0015 start before Gate 11 closes / 0 PRV closure
- 0 deletion of smoke objects or test events
- 0 D-01 fires / 0 memory edits / 0 decisions.md edits
- 0 SHA fabrication (mobile-fix commit recorded as PENDING)

**Sync close mechanics v3.02 (atomic single-commit per L-v2.85-e — 14th consecutive):** session file + sync_state + action_list in one push. L41 mitigation applied (held content == HEAD before full-file push, per v3.00.1 lesson).

**v3.02 honest limitations:**
- Mobile-fix commit SHA not supplied; recorded PENDING, not fabricated.
- Cross-repo recording only — chat did not fetch dashboard HEAD or verify the fix.
- "CCB MOBILE PASS" = one device profile (Nexus 5, 306×498, DPR2), not a cross-device matrix.
- Q-005 not in loaded carry set; preserved untouched but unverified here.
- T-MCP-02 cum ~92 unchanged. State-capture exceptions cum 1.
- friction.* schema state assumed unchanged; not re-probed.
- Gate 11 day count not refreshed (window closes 2026-05-26).

---

### 2026-05-21 Sydney — v3.00 close (brief)

cc-0016 Stage D /operations evidence display VISUAL PASS (+v3.00.1 reconciliation patch). Dashboard Stage D at `9082beb` (files: `app/(dashboard)/operations/page.tsx`, `app/(dashboard)/operations/case-row.tsx`; typecheck PASS). CCB VISUAL PASS: paperclip badge 📎1, Evidence (1) section, signed-URL thumbnail, PNG new tab (64×64). cc-0016 Stage D CLOSED/PASS; evidence path COMPLETE A→B→C→D. Stage E future/separately-approved-only. v3.00.1 corrected the stale v2.97/v2.98 placeholder note (reconciled in v2.99.1 at `2db1656`).

*(Full detail at `docs/runtime/sessions/2026-05-21-v3.00-cc0016-stage-d-evidence-display-visual-pass.md`.)*

---

## 🟡 Next session priorities (rebuilt v3.02)

**Core ICE ranks:**

1. **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** — P2 carry, rank 1. Closure waits on PK observation of next 16:00 UTC fire. **Secondary (P3):** 3 no-fire scheduler days (2026-05-16, 2026-05-18, 2026-05-19).
2. **cc-0016 Stage E — scoping/dry-run design ONLY (if PK picks Option A)** — P2, rank 2 conditional. NON-MUTATING design work; first destructive cleanup run still requires separate PK approval + dry-run. Stage A CONSTRAINT 2 binds.
3. **Wave 0f scoping** — P3, rank 3. Opportunistic during Gate 11 window.
4. **Platform Reconciliation View brief authoring** — P2 carry, rank 4 (deferred per D-FR-RECON-001 §7.D).
5. **5-row close-the-loop batch / Pre-sales / `purge_test_case` helper case_history extension** — P2/P3 carry, rank 5.

**Time-bound nudge:** cc-0015 Gate 11 observation window closes **2026-05-26** (~5 days out). When it closes, cc-0015 friction-pool-view UI (Wave 7) unblocks → becomes leading dashboard build.

**Dashboard work (separately ranked v3.02):**

1. **D1**: cc-0015 friction-pool-view UI (slice 5) — P2, Gate 11 closes 2026-05-26.
2. **D2**: PRV surface — P2, brief authoring deferred.

*(Mobile/narrow viewport verification removed from dashboard work — CLOSED/PASS v3.02.)*

**Standing P0:** Personal businesses check-in. Crazy Domains refund + clean-up carry from v2.51.

Carries: cc-0015 (Wave 7, gated on Gate 11 closing 2026-05-26); cc-0016 Stage E (future/separately-approved); mobile-fix commit SHA backfill (PENDING from v3.02); cc-0017c v1.2 doc patch; cc-0017a v1.2 doc patch; vchecks.md V-B4 doc patch; minor doc patches; F-CRON-AUTO-APPROVER-SECRET-INLINE; backend/shared-metrics refactor (deferred); Q-005 (if open, non-blocking); lesson promotions (L-v2.83-a STRONG 18+; **L-v2.85-e PROMOTION-CONFIRMED 14th consecutive v3.02**; L-v2.85-a HIGH-SIGNAL 4 occurrences; L62 strongly reinforced via cc-0016 6-fire series; L-v2.88-a watcher CLOSED for cc-0016; **L-v3.02-a NEW candidate**; L-v2.90-a-f watchers).

---

## ⛔ Carried-forward "do not touch" state

**v3.02 updates on standing items:**

- **Mobile/narrow viewport verification CLOSED/PASS v3.02.** CCB at 306×498 Nexus 5 DPR2. Removed from open P3 carries.
- **Mobile-fix commit SHA PENDING** — not supplied in v3.02 directive; backfill next session.
- **cc-0016 Stage D CLOSED/PASS v3.00.** Dashboard `9082beb`. Evidence display live on `/operations` (now also mobile-verified).
- **cc-0016 evidence capture/display path COMPLETE through Stage D** (A→B→C→D).
- **cc-0016 Stage B CLOSED/PASS** (v2.99). Dashboard `36fe6ad`. V-A5 PASS.
- **cc-0016 Stage A CLOSED** (applied v2.97; session file verified in v2.99.1 at `2db1656`).
- **cc-0016 Stage C CLOSED** (applied v2.98; session file verified in v2.99.1 at `2db1656`).
- **cc-0016 Stage E** — future/separately-approved-only. Stage A CONSTRAINT 2 binds. Do NOT start automatically.
- **V-A5 smoke object** `friction-evidence/9e314151-be65-434e-8588-c913012f6591/0_va5-smoke.png` — DO NOT DELETE; Stage D demo artefact.
- **Smoke events** `2120b2f7` + `75f0c981` — DO NOT cleanup unless separately directed.
- **Cowork brief lifecycle gating WARN** — Not closed v3.02. Core rank 1 unchanged.
- **cc-0015 / PRV** unchanged — preserved open. cc-0015 do NOT start before Gate 11 closes 2026-05-26.
- **Q-005** — if open, preserved non-blocking (not in loaded carry set this session).
- **Dashboard slices 1–3 + 4A–4B RECORDED** v2.95 + v2.96 (carry).
- **cc-0016 Stage B + Stage D** live on `dashboard.invegent.com` (`36fe6ad` + `9082beb`); now mobile-verified.
- **Top alert bar count reconciliation CLOSED for UI-copy scope v2.96** (carry).
- **Dashboard PHASES 46-streak deferral CLOSED v2.95** (carry).
- **"Stop Claude" overlay external/non-app v2.95** (carry; re-confirmed external in v3.02 mobile pass).
- **Backend/shared-metrics refactor** — deferred carry; not actively ranked.
- **Reconciliation daily cadence diagnostic CLOSED-PASS v2.93** — carry.
- **D-FR-RECON-001 v1.0 at `fc726e3c`** — carry.
- **cc-0017a/b/c/d/e APPLIED**, **cc-0014 CLOSED-ARCHIVED** — unchanged.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0**; reset to `ready` v2.94.
- **cron 82-86** firing normally.
- **L41**: lightly reinforced v3.02 (v3.00.1 clobber-mitigation applied). No DDL exercises.
- **L40 / L46 / L58 / L62**: L62 strongly reinforced via cc-0016 series; L40/L46/L58 not exercised v3.02.
- **L-v2.83-a**: **18+ occurrences v3.02**. STRONG CANDIDATE confirmed.
- **L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v3.02).
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88; 14th consecutive occurrence v3.02**.
- **L-v2.88-a**: watcher CLOSED for cc-0016. 2 prior occurrences carry for other contexts.
- **L-v3.02-a**: NEW candidate (mobile breakpoint verification after primary operator-surface change). 1 occurrence; watcher.
- **L-v2.90-a-f**: not empirically re-exercised v3.02. Watchers.
- **22 close-the-loop UPDATEs baseline** — Stage C 3 rows assumed resolved at v2.98 apply; net not recomputed.
- **T-MCP-02 quota: ~92 cumulative v3.02** unchanged (0 D-01 v3.02).
- State-capture exceptions: 1 unchanged.
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier).
- **Production FAB + evidence display live on dashboard.invegent.com** (Stage B + Stage D); now mobile-verified.
- **Localhost FAB cleanup pending** (`.env.local`).
- **D-CC-0017B-Q1** + **D-IOL-001** (v2.77) carried.

---

## 📜 G1 convention (the rule)

Unchanged. v3.02 per-session file `docs/runtime/sessions/2026-05-21-v3.02-dashboard-mobile-viewport-pass.md` written and committed atomically alongside sync_state + action_list per L-v2.85-e baseline (**14th consecutive occurrence**). CCH-side `push_files` MCP single atomic commit. `decisions.md` not touched. L-v2.89-a fallback (1+1+1) ready but **not invoked v3.02**. L41 clobber-mitigation applied (held content == HEAD verified before full-file push, per v3.00.1 lesson).

**This file size**: ~22KB after this update.

---

*Last updated: 2026-05-21 Sydney — v3.02: Dashboard mobile/narrow viewport verification CLOSED/PASS. CCB tested at 306×498 Nexus 5 Android Chrome UA, DPR 2 → MOBILE PASS. Mobile fix resolved: sidebar collapses to hamburger/drawer; desktop fixed rail no longer consumes mobile width; /operations rows readable; evidence paperclip badge visible; expanded Evidence section usable; triage guardrail usable; FAB usable; Roadmap readable; "Stop Claude" overlay remains external Claude Browser tooling. **Mobile/narrow viewport verification removed from open P3 carries.** Mobile-fix commit SHA NOT supplied in directive — recorded PENDING (not fabricated); backfill next session. NEW lesson candidate L-v3.02-a: mobile breakpoint verified after any primary operator-surface change. cc-0015 Gate 11 watch / Stage E future/separately-approved / PRV deferred / Q-005 (if open) PRESERVED. 0 dashboard edits / 0 Supabase mutations / 0 Stage E / 0 cleanup / 0 cc-0015 start / 0 PRV closure / 0 smoke deletion / 0 D-01 fires / 0 memory edits / 0 decisions.md edits. T-MCP-02 cum ~92 unchanged. State-capture exceptions cum 1. L-v2.85-e 14th consecutive. L-v2.83-a 18+ STRONG. Per-session detail `docs/runtime/sessions/2026-05-21-v3.02-dashboard-mobile-viewport-pass.md`. 3-file atomic single-commit.*
