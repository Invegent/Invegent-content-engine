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
| 2026-05-21 | v3.01-cowork-lifecycle-warn-closed | **Cowork brief lifecycle gating WARN CLOSED.** v2.94 lifecycle convention validated end-to-end on the first natural cycle: `nightly-health-check-v1` brief reset `ready → review_required → PK observed → ready` against the 2026-05-20T16:02:37Z natural 16:00 UTC fire (`docs/runtime/runs/nightly-health-check-v1-2026-05-20T160237Z.md`; finished 16:08:30Z; 0 schema-drift fallbacks; all 14 SQL queries verbatim; dual-write fired — 5 P1 → `friction.event`, 2 P2 → `friction.emit_error` with `CONDITION-KEY-UNRESOLVED`). Brief frontmatter reset to `status: ready`; queue row updated with closure annotation (2026-05-20 history preserved verbatim). **WARN no longer at core rank 1.** New core rank 1 = **cc-0015 Gate 11 watch** (window closes 2026-05-26, ~5 days out). **Q-nightly-health-check-v1-005 remains OPEN as non-blocking function-contract drift** — handled as a future brief v3.1 / spec patch; NOT bundled into this closure. cc-0015 still gated. PRV deferred. cc-0016 Stage E future/separately-approved-only. Mobile/narrow viewport remains P3. 0 Supabase mutations / 0 Invegent-dashboard touched / 0 manual cron / 0 Cowork forced run / 0 Q-005 resolution / 0 Stage E started / 0 cleanup / 0 cc-0015 advanced / 0 D-01 fires. L-v2.85-e 14th consecutive. L-v2.83-a 18+ STRONG. **L-v2.94 convention lesson NEW candidate** (confirm across 2-3 more natural cycles before promotion-eligible). Files changed: 5 (brief frontmatter + queue row + session file + sync_state + action_list, atomic single commit). | `docs/runtime/sessions/2026-05-21-v3.01-cowork-lifecycle-warn-closed.md` |
| 2026-05-21 | v3.00-cc0016-stage-d-evidence-display-visual-pass | **cc-0016 Stage D /operations evidence display VISUAL PASS.** Dashboard Stage D shipped at `9082beb` (files: `app/(dashboard)/operations/page.tsx`, `app/(dashboard)/operations/case-row.tsx`; typecheck PASS). CCB verified on production `/operations`: loads with recent 50 cases; V-A5 smoke case visible as "cc-0016 Stage B attachment smoke"; collapsed row shows purple paperclip badge 📎1; expanded row shows "Evidence (1)"; thumbnail renders; caption `va5-smoke.png · 861B · 10h ago`; thumbnail opens via signed URL `friction-evidence/9e314151-.../0_va5-smoke.png`; PNG opened in new tab titled `0_va5-smoke.png (64×64)`; unattached case renders normally with no paperclip/Evidence section; triage guardrail intact. **cc-0016 Stage D CLOSED/PASS.** cc-0016 evidence capture/display path COMPLETE through Stage D (A→B→C→D). Stage E future/separately-approved-only. Next action = PK choice: A (Stage E scoping/dry-run design only), B (pause → Cowork WARN + cc-0015 Gate 11 watch), C (mobile viewport verification). Cowork WARN / cc-0015 / PRV / Stage E UNCHANGED (open). 0 Supabase mutations / 0 SQL-RPC-view-function changes / 0 lifecycle cleanup / 0 retroactive editing / 0 upload-flow changes / 0 triage mutation / 0 dashboard edits / 0 smoke deletion / 0 D-01 fires. L-v2.85-e 13th consecutive. L-v2.83-a 17+ STRONG. Files changed: 3 (atomic single commit). *(v3.00.1 patch: stale v2.97/v2.98 placeholder note corrected — reconciled in v2.99.1 at `2db1656`.)* | `docs/runtime/sessions/2026-05-21-v3.00-cc0016-stage-d-evidence-display-visual-pass.md` |
| 2026-05-20 | v2.99-cc0016-stage-b-fab-upload-validated | **cc-0016 Stage B FAB upload/read UX validated + V-A5 PASS.** Dashboard Stage B at `36fe6ad` (files: `actions/emit-friction.ts`, `components/friction-form.tsx`; typecheck PASS). CCB + chat backend + CCD read-back verified. V-A5 empirically PASS (signed URL HTTP 200, image/png, 861 bytes, PNG intact). Smoke artefacts retained (events `2120b2f7` + `75f0c981`, object `friction-evidence/9e314151-.../0_va5-smoke.png`). **Stage B CLOSED/PASS.** | `docs/runtime/sessions/2026-05-20-v2.99-cc0016-stage-b-fab-upload-validated.md` |
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

### 2026-05-21 Sydney — v3.01: Cowork brief lifecycle gating WARN CLOSED

**Outcome:** Cowork lifecycle gating WARN (open since v2.92 → reframed v2.94 → core rank 1 since v2.94) is now **CLOSED**. The v2.94 lifecycle convention — `ready → (16:00 UTC natural fire) → review_required → PK observed → ready` — has been validated end-to-end against the **2026-05-20T16:02:37Z** natural fire as convention-cycle-1 evidence. PK accepted this single successful cycle as sufficient. `nightly-health-check-v1` brief frontmatter has been reset to `status: ready` for the next 16:00 UTC fire. Q-nightly-health-check-v1-005 remains OPEN as a non-blocking function-contract drift item, to be addressed in a future v3.1 brief patch / spec patch — explicitly NOT bundled into this closure. No Supabase mutations; no dashboard touched; no manual cron / forced Cowork run.

**Evidence — the 2026-05-20T16:02:37Z natural fire** (per run state file `docs/runtime/runs/nightly-health-check-v1-2026-05-20T160237Z.md`):

| Fact | Value |
|---|---|
| Run trigger | Natural 16:00 UTC cron (no manual force) |
| Started → finished | 2026-05-20T16:02:37Z → 16:08:30Z (~6 min) |
| Schema-drift fallbacks | **0** (v2.1 + v3.0 brief locks held) |
| SQL queries executed | 14 / 14 verbatim |
| Markdown output | `docs/audit/health/2026-05-20.md` (canonical per brief §12.4) |
| Dual-write contract | `friction.fn_emit_health_check_findings(…)` returned `{success_count: 5, failure_count: 0, skipped_count: 2}` |
| friction.event emitted | 5 P1 (true-stuck-cluster rows; visible on `/operations` post Stage D) |
| friction.emit_error routed | 2 P2 (`zero-counts-pub-published-30m` + `s17-escalation-rate` with `error_code=CONDITION-KEY-UNRESOLVED`) |
| Brief lifecycle transition | `ready → review_required` per v2.94 convention |
| Cowork forbidden-action violations | 0 |
| Q-005 logged | function-contract drift (skipped_count + emit_error routing not in brief §12.3) — **non-blocking carry** |

**Diagnosis:** the brief did NOT get stuck. The `ready → review_required` transition was the correct v2.94 convention behaviour (post-fire requires PK observation before re-arming). PK observed; v3.01 resets to `ready` to complete the cycle.

**What v3.01 actually changed:**

1. `docs/briefs/nightly-health-check-v1.md` frontmatter: `status: review_required → ready`. brief_version unchanged.
2. `docs/briefs/queue.md` Active row for `nightly-health-check-v1`: `status: review_required → ready`; closure annotation prepended; prior 2026-05-20 run history preserved verbatim.
3. `docs/00_sync_state.md` (this file): v3.01 row added to session index; inline summary updated; Next priorities rebuilt (Cowork WARN removed from rank 1).
4. `docs/00_action_list.md`: Last-updated bumped to v3.01; v3.01 ADDITIONS section added; core ranks rebuilt; Cowork brief STATUS BLOCK marked CLOSED; Time-bound section updated.
5. `docs/runtime/sessions/2026-05-21-v3.01-cowork-lifecycle-warn-closed.md` (new).

**Items closed v3.01:** Cowork brief lifecycle gating WARN.

**Items explicitly NOT closed v3.01 (per directive):**
- **cc-0015 (Wave 7)** — STILL GATED on Gate 11 closing 2026-05-26 (~5 days out).
- **cc-0016 Stage E lifecycle cleanup** — future/separately-approved-only.
- **PRV brief authoring** — deferred per D-FR-RECON-001 §7.D.
- **Mobile/narrow viewport verification** — P3 carry.
- **Q-nightly-health-check-v1-005** — OPEN, non-blocking; deferred to future v3.1 brief patch / spec patch (NOT bundled into this closure per directive item 4).

**Next ranked actionable item:** **cc-0015 Gate 11 watch** (new rank 1 — time-bound; window closes 2026-05-26). Opportunistic alternatives during the gate window: cc-0016 Stage E scoping (Option A, NON-MUTATING design only) or mobile/narrow viewport verification (Option C).

**Hard stops respected v3.01:**
- 0 Supabase mutations / 0 SQL/RPC/view/function changes
- 0 Invegent-dashboard touched
- 0 nightly-health-check manual run / 0 Cowork forced execution
- 0 Q-005 resolution / 0 closure of Q-005
- 0 Stage E started / 0 cleanup run
- 0 cc-0015 advanced / 0 PRV closed
- 0 retroactive editing / 0 fn_set_event_attachments / 0 lifecycle cleanup
- 0 D-01 fires / 0 memory edits / 0 decisions.md edits

**Sync close mechanics v3.01 (atomic single-commit per L-v2.85-e baseline — 14th consecutive occurrence):** brief frontmatter + queue + session file + sync_state + action_list in one push. L-v2.89-a fallback (1+1+1) ready but not invoked.

**Lesson exercise v3.01:**
- **L-v2.85-e**: 14th consecutive occurrence.
- **L-v2.83-a**: cumulative **18+ STRONG**.
- **L-v2.94 convention lesson NEW candidate**: the "ready → fire → review_required → PK observe → ready" lifecycle convention worked on the first natural cycle without manual intervention. Confirm across 2-3 more natural cycles before promotion-eligible.
- L40 / L41 / L46 / L58 / L62 not exercised v3.01 (no D-01, no migration).

**v3.01 honest limitations:**
- Single-cycle closure (PK accepted one healthy fire as sufficient). Multi-cycle observation would be a stronger signal but was not required.
- Q-005 deferred — the next 16:00 UTC fire will likely produce the same `skipped_count > 0` annotation until brief v3.1 / function pattern matcher updated.
- T-MCP-02 cumulative ~92 unchanged. State-capture exceptions cumulative 1 unchanged.

---

### 2026-05-21 Sydney — v3.00 close (brief)

cc-0016 Stage D /operations evidence display VISUAL PASS. Dashboard Stage D at `9082beb3e22df2e0f8d42924ed4e6f0a127c23ea` (files: `app/(dashboard)/operations/page.tsx`, `app/(dashboard)/operations/case-row.tsx`; typecheck PASS). CCB VISUAL PASS on production `/operations`: paperclip badge 📎1, Evidence (1) section, signed-URL thumbnail, PNG in new tab (64×64), unattached cases render normally, triage guardrail intact. **cc-0016 Stage D CLOSED/PASS.** cc-0016 evidence capture/display path COMPLETE through Stage D (A→B→C→D). Stage E future/separately-approved-only. *(v3.00.1: small reconciliation patch corrected stale v2.97/v2.98 placeholder note.)*

*(Full detail at `docs/runtime/sessions/2026-05-21-v3.00-cc0016-stage-d-evidence-display-visual-pass.md`.)*

---

### 2026-05-21 Sydney — v3.00 inline detail (preserved below for context)

### 2026-05-21 Sydney — v3.00: cc-0016 Stage D /operations evidence display VISUAL PASS

**Outcome:** cc-0016 Stage D (/operations evidence display) shipped in Invegent-dashboard at `9082beb3e22df2e0f8d42924ed4e6f0a127c23ea` and verified VISUAL PASS by CCB on production `/operations`. The attached V-A5 smoke object renders end-to-end from the operator surface. **The cc-0016 evidence capture/display path is now complete through Stage D (A→B→C→D).** Stage E (lifecycle cleanup) remains future/separately-approved-only. No content-engine code changes, no Supabase mutations, no dashboard edits this session.

> **v3.00.1 reconciliation patch (2026-05-21):** the stale "v2.97/v2.98 unverified placeholder" limitation note (below + index rows above) was corrected. Those session files were already verified to exist — ancestry clean, Stage A/C facts confirmed, placeholder rows patched — in **v2.99.1 at `2db16568bfc8eeb0036d9a8cbe377cc198e4c6a7`**. No outstanding placeholder issue remains.

**Stage D facts:**

| Fact | Value |
|---|---|
| Dashboard commit | `9082beb3e22df2e0f8d42924ed4e6f0a127c23ea` |
| Files changed | `app/(dashboard)/operations/page.tsx`, `app/(dashboard)/operations/case-row.tsx` |
| Typecheck | PASS |

**CCB verification (VISUAL PASS):** `/operations` loads with recent 50 cases; V-A5 smoke case visible as "cc-0016 Stage B attachment smoke"; collapsed row shows purple paperclip badge 📎1; expanded row shows "Evidence (1)"; thumbnail renders; caption `va5-smoke.png · 861B · 10h ago`; thumbnail opens via signed URL `friction-evidence/9e314151-be65-434e-8588-c913012f6591/0_va5-smoke.png`; PNG opened in new tab titled `0_va5-smoke.png (64×64)`; unattached case renders normally (no paperclip, no Evidence section); triage confirmation guardrail intact; no unrelated mutating actions.

**cc-0016 stage ledger — evidence path COMPLETE through Stage D:**

| Stage | Status |
|---|---|
| A | CLOSED |
| C | CLOSED |
| B | CLOSED/PASS (v2.99) |
| **D** | **CLOSED/PASS (v3.00)** |
| E | FUTURE — separately approved only |

capture (Stage B) → store (Stage A) → emit (Stage C) → display (Stage D). Only lifecycle cleanup (Stage E) remains, intentionally gated behind separate approval.

**Items closed v3.00:** cc-0016 Stage D (CLOSED/PASS); cc-0016 evidence capture/display path (COMPLETE through Stage D).

**Next ranked action — PK choice (do NOT start Stage E automatically):**
- **Option A** — cc-0016 Stage E scoping only (lifecycle cleanup dry-run design). Brief-authoring; non-mutating; still requires separate PK approval before any first destructive run.
- **Option B** — pause cc-0016; return to Cowork lifecycle WARN (core rank 1) + cc-0015 Gate 11 watch (window closes 2026-05-26).
- **Option C** — mobile/narrow viewport verification (P3; opportunistic given fresh operator-surface UI).

**Items explicitly NOT closed (per directive):** Cowork lifecycle gating WARN (core rank 1); cc-0015 (gated on Gate 11 closing 2026-05-26); PRV (deferred per D-FR-RECON-001 §7.D); Stage E lifecycle cleanup (future/separately-approved); mobile/narrow viewport verification (P3); backend/shared-metrics refactor (deferred carry).

**Hard stops respected v3.00:**
- 0 Supabase mutations for Stage D
- 0 SQL / RPC / view / function changes
- 0 lifecycle cleanup / 0 retroactive attachment editing / 0 upload-flow changes
- 0 triage mutation during CCB verification / 0 unrelated dashboard mutations
- 0 Invegent-dashboard edits / 0 smoke-object or test-event deletion
- 0 Stage E started / 0 cleanup run
- 0 closure of Cowork WARN / cc-0015 / PRV / Stage E
- 0 D-01 fires / 0 memory edits / 0 decisions.md edits

**Sync close mechanics v3.00 (atomic single-commit per L-v2.85-e — 13th consecutive):** session file + sync_state + action_list in one push.

**v3.00 honest limitations:**
- Cross-repo recording only — chat did not fetch dashboard HEAD or verify `9082beb`. Per directive payload.
- "CCB VISUAL PASS" = operator browser walkthrough, not automated test coverage.
- *(v3.00.1 patch: v2.97/v2.98 placeholder concern reconciled in v2.99.1 at `2db1656`; no outstanding placeholder issue remains.)*
- CONSTRAINT 1 operator-authorisation negative-path gap (flagged v2.99) carries forward; Stage D is read/display only and does not affect it.
- T-MCP-02 cum ~92 unchanged (0 D-01). State-capture exceptions cum 1.
- friction.* schema state assumed unchanged from Stage C apply; not re-probed.
- Gate 11 day count not refreshed (window closes 2026-05-26).

---

### 2026-05-20 Sydney — v2.99 close (brief)

cc-0016 Stage B FAB upload/read UX validated + V-A5 PASS. Dashboard Stage B at `36fe6ad` (files: `actions/emit-friction.ts`, `components/friction-form.tsx`; typecheck PASS). CCB + chat backend + CCD read-back verified. V-A5 empirically PASS. Smoke artefacts retained (events `2120b2f7` + `75f0c981`, object `friction-evidence/9e314151-.../0_va5-smoke.png`). Stage B CLOSED/PASS.

*(Full detail at `docs/runtime/sessions/2026-05-20-v2.99-cc0016-stage-b-fab-upload-validated.md`.)*

---

## 🟡 Next session priorities (rebuilt v3.01)

**Core ICE ranks:**

1. **cc-0015 Gate 11 watch** — P2 carry, rank 1 (NEW v3.01; promoted after Cowork WARN closure). Time-bound: window closes **2026-05-26** (~5 days out from 2026-05-21). Passive observation; when gate clears, cc-0015 friction-pool-view UI (Wave 7) unblocks as the leading dashboard build.
2. **cc-0016 Stage E — scoping/dry-run design ONLY (if PK picks Option A)** — P2, rank 2 conditional. NON-MUTATING design work; first destructive cleanup run still requires separate PK approval + dry-run. Stage A CONSTRAINT 2 binds. **If PK picks Option C (mobile viewport), this rank is replaced.**
3. **Wave 0f scoping** — P3, rank 3. Opportunistic during Gate 11 window.
4. **Platform Reconciliation View brief authoring** — P2 carry, rank 4 (deferred per D-FR-RECON-001 §7.D).
5. **5-row close-the-loop batch / Pre-sales / `purge_test_case` helper case_history extension** — P2/P3 carry, rank 5.

**Carries flagged (NOT actively ranked):**
- **Q-nightly-health-check-v1-005** — function-contract drift (skipped_count + emit_error routing not in brief §12.3). NON-BLOCKING. Future v3.1 brief patch / spec patch.
- **3 no-fire scheduler days** (2026-05-16, 2026-05-18, 2026-05-19) — P3 secondary; informational only.

**Time-bound nudge:** cc-0015 Gate 11 observation window closes **2026-05-26** (~5 days out). When it closes, cc-0015 friction-pool-view UI (Wave 7) unblocks.

**Dashboard work (separately ranked v3.00):**

1. **D1**: cc-0015 friction-pool-view UI (slice 5) — P2, Gate 11 closes 2026-05-26 (now the leading dashboard build once gate clears, since cc-0016 Stage D shipped).
2. **D2**: PRV surface — P2, brief authoring deferred.
3. **D3**: Mobile/narrow viewport verification — P3 carry (Option C candidate).

**Standing P0:** Personal businesses check-in. Crazy Domains refund + clean-up carry from v2.51.

Carries: cc-0015 (Wave 7, gated on Gate 11 closing 2026-05-26); cc-0016 Stage E (future/separately-approved); cc-0017c v1.2 doc patch; cc-0017a v1.2 doc patch; vchecks.md V-B4 doc patch; minor doc patches; F-CRON-AUTO-APPROVER-SECRET-INLINE; backend/shared-metrics refactor (deferred); lesson promotions (L-v2.83-a STRONG 17+; **L-v2.85-e PROMOTION-CONFIRMED 13th consecutive v3.00**; L-v2.85-a HIGH-SIGNAL 4 occurrences; L62 strongly reinforced via cc-0016 6-fire series; L-v2.88-a watcher CLOSED for cc-0016; L-v2.90-a-f watchers).

---

## ⛔ Carried-forward "do not touch" state

**v3.00 updates on standing items:**

- **cc-0016 Stage D CLOSED/PASS v3.00.** Dashboard commit `9082beb`. Evidence display live on `/operations`.
- **cc-0016 evidence capture/display path COMPLETE through Stage D** (A→B→C→D).
- **cc-0016 Stage B CLOSED/PASS** (v2.99). Dashboard `36fe6ad`. V-A5 PASS.
- **cc-0016 Stage A CLOSED** (applied v2.97; session file verified in v2.99.1 at `2db1656`).
- **cc-0016 Stage C CLOSED** (applied v2.98; session file verified in v2.99.1 at `2db1656`).
- **cc-0016 Stage E** — future/separately-approved-only. Stage A CONSTRAINT 2 binds. Do NOT start automatically.
- **V-A5 smoke object** `friction-evidence/9e314151-be65-434e-8588-c913012f6591/0_va5-smoke.png` — DO NOT DELETE; now also the visible Stage D demo artefact on `/operations`.
- **Smoke events** `2120b2f7` + `75f0c981` — DO NOT cleanup unless separately directed.
- **Cowork brief lifecycle gating WARN** — **CLOSED v3.01.** v2.94 convention validated end-to-end against the 2026-05-20T160237Z natural fire. Brief reset to `ready` for next cycle. Q-005 carries non-blocking. No longer at core rank 1.
- **cc-0015 / PRV** unchanged — directive explicitly preserves as open.
- **Dashboard slices 1–3 + 4A–4B RECORDED** v2.95 + v2.96 (carry).
- **cc-0016 Stage B + Stage D** now both live on `dashboard.invegent.com` (`36fe6ad` + `9082beb`).
- **Top alert bar count reconciliation CLOSED for UI-copy scope v2.96** (carry).
- **Dashboard PHASES 46-streak deferral CLOSED v2.95** (carry).
- **"Stop Claude" overlay external/non-app v2.95** (carry).
- **Mobile/narrow Roadmap layout unverified** — P3 carry (Option C candidate).
- **Backend/shared-metrics refactor** — deferred carry; not actively ranked.
- **Reconciliation daily cadence diagnostic CLOSED-PASS v2.93** — carry.
- **D-FR-RECON-001 v1.0 at `fc726e3c`** — carry.
- **cc-0017a/b/c/d/e APPLIED**, **cc-0014 CLOSED-ARCHIVED** — unchanged.
- **Cowork brief `nightly-health-check-v1` FROZEN at v3.0**; reset to `ready` v2.94 + reset to `ready` again v3.01 (post-cycle-1 closure). Brief version unchanged; Q-005 carries non-blocking for future v3.1 patch.
- **cron 82-86** firing normally.
- **L41**: no new exercises v3.00 (read-only session).
- **L40 / L46 / L58 / L62**: L62 strongly reinforced via cc-0016 series; L40/L46/L58 not exercised v3.00.
- **L-v2.83-a**: **17+ occurrences v3.00**. STRONG CANDIDATE confirmed.
- **L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v3.00).
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88; 13th consecutive occurrence v3.00**.
- **L-v2.88-a**: watcher CLOSED for cc-0016. 2 prior occurrences (v2.88 + v2.91) carry for other contexts.
- **L-v2.90-a-f**: not empirically re-exercised v3.00. Watchers.
- **22 close-the-loop UPDATEs baseline** — Stage C 3 rows assumed resolved at v2.98 apply; net not recomputed.
- **T-MCP-02 quota: ~92 cumulative v3.00** unchanged (0 D-01 v3.00).
- State-capture exceptions: 1 unchanged.
- Standing don't-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier).
- **Production FAB + evidence display live on dashboard.invegent.com** (Stage B + Stage D).
- **Localhost FAB cleanup pending** (`.env.local`).
- **D-CC-0017B-Q1** + **D-IOL-001** (v2.77) carried.

---

## 📜 G1 convention (the rule)

Unchanged. v3.00 per-session file `docs/runtime/sessions/2026-05-21-v3.00-cc0016-stage-d-evidence-display-visual-pass.md` written and committed atomically alongside sync_state + action_list per L-v2.85-e baseline (**13th consecutive occurrence**). CCH-side `push_files` MCP single atomic commit. `decisions.md` not touched. L-v2.89-a fallback (1+1+1) ready but **not invoked v3.00**. *(v3.00.1: small reconciliation patch corrected the stale v2.97/v2.98 placeholder note across session file + this file + action_list.)*

**This file size**: ~21KB after this update.

---

*Last updated: 2026-05-21 Sydney — v3.01 (Cowork brief lifecycle gating WARN CLOSED; v2.94 convention validated end-to-end against the 2026-05-20T160237Z natural fire as convention-cycle-1 evidence; `nightly-health-check-v1` brief reset to `status: ready` for next cycle; Q-005 remains OPEN as non-blocking carry; rank 1 now cc-0015 Gate 11 watch — window closes 2026-05-26). Carries v3.00 (+v3.00.1) below for context.*

*v3.00 (+v3.00.1 reconciliation patch): cc-0016 Stage D /operations evidence display VISUAL PASS. Dashboard Stage D at `9082beb3e22df2e0f8d42924ed4e6f0a127c23ea` (files: `app/(dashboard)/operations/page.tsx`, `app/(dashboard)/operations/case-row.tsx`; typecheck PASS). CCB VISUAL PASS on production `/operations`: paperclip badge 📎1, Evidence (1) section, signed-URL thumbnail, PNG in new tab (64×64), unattached cases render normally, triage guardrail intact. **cc-0016 Stage D CLOSED/PASS.** cc-0016 evidence capture/display path COMPLETE through Stage D (A→B→C→D). Stage E future/separately-approved-only — do NOT start automatically. Next action = PK choice: A (Stage E scoping/dry-run design only), B (pause → Cowork WARN + cc-0015 Gate 11 watch), C (mobile viewport verification). Cowork lifecycle WARN / cc-0015 / PRV / Stage E UNCHANGED (open). 0 Supabase mutations / 0 SQL-RPC-view-function changes / 0 lifecycle cleanup / 0 retroactive editing / 0 upload-flow changes / 0 triage mutation / 0 dashboard edits / 0 smoke deletion / 0 D-01 fires / 0 memory edits / 0 decisions.md edits. T-MCP-02 cum ~92 unchanged. State-capture exceptions cum 1. L-v2.85-e 13th consecutive. L-v2.83-a 17+ STRONG. Per-session detail `docs/runtime/sessions/2026-05-21-v3.00-cc0016-stage-d-evidence-display-visual-pass.md`. 3-file atomic single-commit. v3.00.1 reconciliation: v2.97 + v2.98 session files confirmed to exist (reconciled in v2.99.1 at `2db1656`); no outstanding placeholder issue remains.*
