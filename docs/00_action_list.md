# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-20 Sydney (**v2.95 — Dashboard slices 1–3 recorded as completed visual/operator work**. Three Invegent-dashboard slices shipped + visually verified on `dashboard.invegent.com`: slice 1 `dashboard-nav-and-ops-copy-v1` at `af60953` (sidebar nav + /operations subtitle); slice 2 `dashboard-operations-usability-v1` + remediation at `de4501b` + `37008e5` (Save guardrail + FAB severity default + Overview deep-links); slice 3 `dashboard-roadmap-phases-correction-v1` at `991a92b` (4 D-FR-RECON-001 §4 corrections + layout + "Stop Claude" investigation). "Stop Claude" overlay confirmed external/non-app during slice 3 — not part of dashboard codebase; closed observation. Mobile/narrow Roadmap layout unverified due browser resize override — P3 carry. **Dashboard PHASES 46-streak deferral BROKEN/CLOSED v2.95** by Slice 3 — PHASES surface now current with content-engine state; standing 46-streak carry retired. Cowork brief lifecycle gating WARN UNCHANGED at rank 1 (directive explicitly preserved as open). cc-0015 / cc-0016 / PRV / top alert bar count reconciliation UNCHANGED (open). 0 production mutations / 0 Supabase mutations / 0 deploys / 0 Invegent-dashboard edits this session / 0 D-01 fires / 0 application code edits / 0 memory edits / 0 decisions.md edits.) **Today/Next 5 v2.95 unchanged from v2.94**: Cowork lifecycle WARN → rank 1; cc-0016 Stage A → rank 2; Wave 0f scoping → rank 3; PRV → rank 4 (deferred); close-the-loop → rank 5. **Dashboard work ranked separately v2.95**: top alert bar count reconciliation → 1; cc-0015 UI → 2 (gated); cc-0016 UI → 3 (backend-gated); PRV surface → 4; mobile viewport verification → 5 (P3).

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v2.94.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46-v2.58 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + **L-v2.83-a (STRONG; 14+ v2.95)** + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL; 4 occurrences — promotion-eligible) + L-v2.85-b/c/d carried + **L-v2.85-e PROMOTION-CONFIRMED 10th consecutive v2.95 (carries forward from v2.88)** + 5 L-v2.86 candidates + **L-v2.88-a (2 occurrences — watcher)** + L-v2.88-b/c/d candidates + L-v2.89-a candidate (carry) + **L-v2.90-a through L-v2.90-f candidates** (a/b HIGH-SIGNAL; c/d/e/f candidates). **D-IOL-001 (v2.77)** carried. **D-CC-0017B-Q1** carried.

**v2.95 ADDITIONS:**

- **Dashboard slices 1–3 RECORDED v2.95 as completed visual/operator work** in Invegent-dashboard (cross-repo state recording; content-engine touched only to update sync/action docs; no Invegent-dashboard edits this session):
  - **Slice 1: `dashboard-nav-and-ops-copy-v1`** at `af60953` — VISUAL PASS. `/operations` sidebar nav integration + active-state matcher + operator-readable subtitle (replaced DB-internals string). Per outline, `/ef-drift` + `/onboarding` orphan routes were candidate inclusions; CCD/PK to confirm final shipped nav inventory.
  - **Slice 2: `dashboard-operations-usability-v1` + remediation** at `de4501b` + `37008e5` — VISUAL PASS. Save confirmation guardrail on triage form (`SECURITY DEFINER` write no longer mutates without operator confirm) + FAB severity default changed Critical → Warn + Overview "Open Incidents" deep-links into `/operations` applied.
  - **Slice 3: `dashboard-roadmap-phases-correction-v1`** at `991a92b` — VISUAL PASS. 4 D-FR-RECON-001 §4 corrections applied (LAST_UPDATED refresh from stale 2026-05-08 / deferral count corrected from 9th to current state / friction infrastructure rows surfaced for Wave 0/0d/0e / cc-0014 archival framing corrected from revert to CLOSED-ARCHIVED). Heading/layout collision addressed.

- **"Stop Claude" overlay confirmed external/non-app v2.95** during slice 3 investigation. Not part of the dashboard codebase. Closed observation; no further action required.

- **Mobile/narrow Roadmap layout remains UNVERIFIED v2.95** — visual-audit browser runtime overrode `resize_window` calls (window.innerWidth stayed at 1712 after resize to 400×800 and 420×850). Carry as **P3** for real-device or CCD viewport test. Not blocking.

- **Dashboard PHASES 46-streak deferral BROKEN/CLOSED v2.95** by Slice 3. Carried 46 consecutive deferrals at v2.94. Streak terminates at v2.95; PHASES surface now reflects content-engine state. **Standing 46-streak deferral line retired from carry text effective v2.95.**

- **Remaining dashboard work ranked v2.95** (separate from content-engine ranks):
  - **Rank 1 (dashboard):** Top alert bar count reconciliation (slice 4 candidate) — P2 carry. Top bar shows "4 critical alerts · 35 posts this week · 53 in inbox" while Overview banner says "5 published today · 116 overdue in queue · 4 critical incidents". Backend-adjacent: likely data-source reconciliation, not layout. CCD code audit recommended first.
  - **Rank 2 (dashboard):** cc-0015 friction-pool-view UI (slice 5) — P2; backend already shipped; gated on Gate 11 observation window closing 2026-05-26.
  - **Rank 3 (dashboard):** cc-0016 evidence UI (slice 6) — P2; backend-gated (Stage A `friction.event` schema + Storage bucket + RLS policies; D-01 required before any of that lands).
  - **Rank 4 (dashboard):** Platform Reconciliation View surface (slice 7) — P2; PRV brief authoring deferred per D-FR-RECON-001 §7.D until corrected friction-register baseline PK-accepted.
  - **Rank 5 (dashboard):** Mobile/narrow viewport verification — P3 carry; real-device or CCD viewport test; not blocking.

- **Items explicitly NOT closed v2.95 (per directive):**
  - Cowork brief lifecycle gating WARN (`nightly-health-check-v1`) — rank 1 in core ranking; preserved open.
  - cc-0015 (Wave 7) — DRAFTED at `9a5dc155`; still gated on Gate 11 closing 2026-05-26.
  - cc-0016 (Wave 8) — DRAFTED at `f35f8ea4`; backend-gated.
  - PRV brief authoring — deferred per D-FR-RECON-001 §7.D.
  - Top alert bar count reconciliation — backend-adjacent; data-source audit pending.

- **Hard stops respected v2.95:**
  - 0 production mutations / 0 Supabase mutations / 0 deploys
  - 0 Invegent-dashboard edits this session (slices shipped upstream by CCD; chat did not touch dashboard repo)
  - 0 closure of the Cowork lifecycle WARN (directive explicitly preserves)
  - 0 marking of cc-0015 / cc-0016 / PRV as implemented
  - 0 application code edits (in either repo)
  - 0 memory edits / 0 decisions.md edits
  - 0 D-01 fires
  - 0 force-run of cron 85 / 0 force-run of `nightly-health-check-v1`

- **Sync close mechanics v2.95 (atomic single-commit per L-v2.85-e baseline — 10th consecutive occurrence):**
  1. Per-session detail file `docs/runtime/sessions/2026-05-20-v2.95-dashboard-slices-1-3-recorded.md`.
  2. sync_state + action_list + session file committed in **one atomic push** (CCH-side `push_files` MCP).

  L-v2.89-a fallback (1+1+1) ready but not invoked v2.95.

- **L-v2.85-e re-applied 10th consecutive occurrence** (v2.86 → v2.95); promotion-confirmed v2.88 carries forward.
- **L-v2.83-a re-applied** at sync close commit. Cumulative **14+ STRONG**.
- **L-v2.88-a NOT re-occurring v2.95** — cross-repo recording session, not directive-loop. Watcher (2 occurrences total) carries forward.
- **L-v2.89-a NOT actively exercised v2.95** — atomic commit in flight; fallback ready.
- **L-v2.85-a HIGH-SIGNAL NOT re-exercised v2.95** (doc-sync only; no V-check execution).
- **L-v2.86-a HIGH-SIGNAL NOT re-exercised v2.95** (no apply).
- **L-v2.90-a-f NOT re-exercised v2.95** (no apply).
- **L40 / L41 / L46 / L58 / L62 NOT exercised v2.95** (no DB / no DDL / no D-01 / no apply).

- **No new L-v2.95-X candidates surfaced.** Cross-repo recording session.

- **Closed Active rows v2.95:** Dashboard PHASES 46-streak deferral (carry at v2.94) → CLOSED by Slice 3 ship (`991a92b`); recorded here. "Stop Claude" overlay investigation → CLOSED (external/non-app per slice 3).
- **Spawned Active rows v2.95 (dashboard side):** Top alert bar count reconciliation (slice 4 candidate; P2 backend-adjacent); Mobile/narrow viewport verification (P3 carry).
- **Promoted Active rows v2.95:** Dashboard work items 1–3 surfaced as RECORDED-COMPLETE (no longer invisible/deferred).

- **NO decisions.md change v2.95.** Doc-sync close.
- **Session compaction event v2.95:** 0.
- **Production mutations v2.95: 0.**
- **D-01 fires v2.95: 0.**
- **T-MCP-02 cum v2.95: ~86 unchanged.**
- **State-capture exceptions v2.95: 0.** Cumulative: 1 unchanged.
- **Close-the-loop UPDATEs v2.95: 0** (no D-01 fired). 22 outstanding unchanged.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | 0 (recon daily diagnostic CLOSED-PASS v2.93; dashboard PHASES streak CLOSED v2.95) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~34h (v2.83 1h + v2.84 ~2h + v2.85 ~3h + v2.86 ~3.5h + v2.87 ~0.5h + v2.88 ~1.5h + v2.89 ~1h + v2.90 ~4h + v2.91 ~1h + v2.92 ~1h + v2.93 ~1h + v2.94 ~1h + v2.95 ~1h) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.95 cycle: ~1h total** (cross-repo state recording; no diagnostic SQL; sync close ~1h). 0 schema mutations. 0 D-01 fires. 1 atomic git commit (sync_state + action_list + session file in single push per L-v2.85-e baseline). **State-capture exception count v2.95: 0** (cumulative 1).

---

## ⭐ Today / Next 5 (core ICE ranks)

> Last rebuilt: 2026-05-20 Sydney (v2.95 — core ranks unchanged from v2.94; dashboard work surfaced separately below).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** | **P2 carry, rank 1 (unchanged from v2.94)** | Ready reset complete v2.94 + convention patched at `docs/runtime/automation_v1_spec.md` Status flow §. WARN explicitly NOT closed — closure waits on PK observation of the next 16:00 UTC fire under the new convention. v2.95 directive explicitly preserved this. | chat → PK | Observe next 16:00 UTC fire under new convention; if brief returns to `ready` cleanly, close WARN in a follow-up sync. |
| 2 | **cc-0016 friction-capture-evidence — Stage A** (Wave 8) | **P2, PK call per D-FR-RECON-001 §7.B** | Parallel-executable with cc-0015 per cc-0016 brief header + footer. Stage A touches `friction.event` + Storage bucket + RLS policies and requires a D-01 fire before DDL/storage work. Estimated ~1h build + ~15–30 min D-01 cycle. | PK → chat | When PK directs. |
| 3 | **Wave 0f scoping** | **P3 brief-authoring only, opportunistic during Gate 11 observation window per D-FR-RECON-001 §7.C** | Brief-authoring is non-mutating; converts dead Gate 11 window time into ready inventory. Candidates: items B/E/F/G deferred from cc-0017e + `purge_test_case` helper case_history extension (L-v2.90-d). Estimated ~2–3h chat to draft. | chat → PK | When PK directs (recommended during Gate 11 window 2026-05-19 → 2026-05-26). |
| 4 | **Platform Reconciliation View brief authoring** | **P2 carry, deferred per D-FR-RECON-001 §7.D** | Recommended to defer until corrected friction-register baseline accepted (D-FR-RECON-001 v1.0 PK-accepted). | PK → chat | When PK directs. |
| 5 | **5-row close-the-loop batch sweep / Pre-sales criteria refinement / `purge_test_case` helper case_history extension** | **P2/P3 carry** | 22 outstanding close-the-loop UPDATEs (unchanged net by v2.95); Pre-sales 3-clock criteria per memory entry; helper case_history extension future Wave 0f candidate. | chat → PK | When PK directs. |

## ⭐ Dashboard work (separately ranked v2.95)

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| D1 | **Top alert bar count reconciliation** (slice 4 candidate) | **P2 carry, NEW v2.95** | Top bar ("4 critical alerts · 35 posts this week · 53 in inbox") and Overview banner ("5 published today · 116 overdue in queue · 4 critical incidents") read disagreeing numbers. Likely data-source reconciliation, not layout. | CCD → chat | CCD code audit of both surfaces; identify data sources; decide reconciliation strategy before any dashboard fix. |
| D2 | **cc-0015 friction-pool-view UI** (slice 5) | P2 carry | Backend already shipped. Gated on Gate 11 observation window closing 2026-05-26. | PK → chat (Wave 7) | When window closes 2026-05-26. |
| D3 | **cc-0016 evidence UI** (slice 6) | P2 carry | Backend-gated. Stage A `friction.event` + Storage bucket + RLS policies; D-01 required. | PK → chat (Wave 8) | After backend Stage A applied. |
| D4 | **Platform Reconciliation View surface** (slice 7) | P2 carry | PRV brief authoring deferred per D-FR-RECON-001 §7.D. | PK → chat | When PRV brief authored + PK-accepted. |
| D5 | **Mobile/narrow viewport verification** (carry from slice 3) | **P3 carry, NEW v2.95** | Visual-audit browser runtime overrode `resize_window`; needs real-device or CCD viewport test. Not blocking. | CCD or PK | Real-device verification of `/operations` + `/roadmap` + sidebar collapse behaviour. |

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Secondary follow-up (separate from core rank 1, lower priority)**: **3 no-fire scheduler days** for `nightly-health-check-v1` — 2026-05-16, 2026-05-18, 2026-05-19. P3 scheduler/agent-uptime investigation. Distinct from the brief lifecycle gating WARN at core rank 1.

**Passive observation v2.95**: Cron 82-86 unchanged. **Cron 85 first post-cc-0017e natural fire CLOSED-PASS v2.93** unchanged. PRV v1 operator views queryable. friction.* state: 10 tables, 19 functions (fn_triage_case 11-arg only), 29 cases + 29 events (baseline preserved), 8 case_history rows (backfill only). Cowork brief `nightly-health-check-v1` v3.0 — brief reset to `ready` v2.94; next fire eligible. **Dashboard `dashboard.invegent.com`**: slices 1–3 shipped + visually verified v2.95.

---

## 🟢 Dashboard slices — STATUS BLOCK (NEW v2.95)

**Status v2.95: Slices 1–3 RECORDED as completed visual/operator work in Invegent-dashboard. Cross-repo recording only; no dashboard edits this session.**

**Slices completed (per directive payload):**
- **Slice 1** `dashboard-nav-and-ops-copy-v1` at `af60953` — VISUAL PASS. Sidebar nav (`/operations`) + active-state matcher + operator-readable subtitle.
- **Slice 2** `dashboard-operations-usability-v1` + remediation at `de4501b` + `37008e5` — VISUAL PASS. Save guardrail + FAB severity default (Critical → Warn) + Overview deep-links.
- **Slice 3** `dashboard-roadmap-phases-correction-v1` at `991a92b` — VISUAL PASS. 4 D-FR-RECON-001 §4 corrections + layout collision + "Stop Claude" investigation (confirmed external/non-app).

**Slices remaining (ranked D1–D5 above):**
- **Slice 4 candidate**: Top alert bar count reconciliation — backend-adjacent.
- **Slice 5**: cc-0015 friction-pool-view UI — gated.
- **Slice 6**: cc-0016 evidence UI — backend-gated.
- **Slice 7**: PRV surface — deferred.
- **Mobile viewport verification**: P3 carry.

**Observations recorded:**
- "Stop Claude" overlay confirmed external/non-app during slice 3 — closed observation.
- Mobile/narrow Roadmap layout unverified due browser resize override — P3 carry.
- `/ef-drift` + `/onboarding` orphan routes: candidate inclusions in slice 1 per outline; CCD/PK to confirm final shipped nav inventory.

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (v2.95 unchanged from v2.94)

**Status v2.95: ✅ Wave 0 + Wave 0d + Wave 0e COMPLETE. Gates 10+12+13 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE. Day count not refreshed v2.95. Wave 0f scoping rank 3 carry.**

**Documents:** D-FR-RECON-001 v1.0 at `fc726e3c`. Per-session files: v2.79–v2.94 unchanged; **v2.95 at `docs/runtime/sessions/2026-05-20-v2.95-dashboard-slices-1-3-recorded.md`**.

**Open gates v2.95:** unchanged from v2.94.

---

## 🟢 cc-0017e Wave 0e — STATUS BLOCK (UPDATED v2.95)

**Status: ✅ APPLIED-WITH-VCHECK-CORRECTION v2.90 + v1.1 8-item BACKLOG CLOSED v2.91. Unchanged v2.95.**

Production state unchanged from v2.90+v2.91+v2.92+v2.93+v2.94. friction.case_history table exists with cc-0017c lockdown grants; fn_triage_case 11-arg patched body; 5 cc-0017d mutation functions patched byte-stable; 8 acknowledged-legacy cases backfilled; 8 backfill rows in case_history.

---

## 🟢 Cowork brief `nightly-health-check-v1` — STATUS BLOCK (UPDATED v2.95)

**Status v2.95: ✅ FROZEN at v3.0. Signal-production contract EMPIRICALLY VALIDATED v2.92 (V-C3 CLOSED-PASS). Lifecycle gating WARN unchanged — rank 1 carry; directive explicitly preserved as open v2.95.**

Brief was reset to `status: ready` v2.94 (queue.md + frontmatter). Convention patched v2.94 at `docs/runtime/automation_v1_spec.md` Status flow §. Closure waits on PK observation of next 16:00 UTC fire under new convention. **v2.95 made no changes to brief status; directive explicitly preserved the WARN as open.**

---

## 🟢 cc-0017d / cc-0017c / cc-0017b / cc-0017a / cc-0014 / cc-0015 / cc-0016 / cc-0012 / cc-0010A/B/C / cc-0011 / cc-0009 — STATUS BLOCKS

**v2.95 updates:** unchanged from v2.94 for cc-0014/0015/0017a-e/0009-0012. Gate 11 (1-week observation window 2026-05-19 → 2026-05-26) day count not refreshed v2.95.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v2.95)

**L41**: cumulative v2.80-v2.95 = 11 (no new exercises v2.95 — doc-sync only).
**L40 / L46 / L58 / L62**: not exercised v2.95.
**L-v2.78-a / L-v2.81-a**: 2 occurrences each, promotion-eligible (unchanged).
**L-v2.83-a**: **14+ occurrences v2.95** (re-applied at sync close commit). STRONG CANDIDATE confirmed.
**L-v2.84-a/b/c/d**: unchanged.
**L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v2.95).
**L-v2.85-b/c/d**: not re-exercised v2.95.
**L-v2.85-e**: **re-applied v2.95 — 10th consecutive occurrence** (v2.86 → v2.95). Atomic sync_state + action_list + session-file single commit. PROMOTION-CONFIRMED v2.88 carries forward.
**L-v2.86-a HIGH-SIGNAL**: not re-exercised v2.95.
**L-v2.86-b/c/d/e**: not re-exercised v2.95.
**L-v2.88-a**: 2 occurrences (v2.88 + v2.91); NOT re-occurring v2.95. Watcher carries forward.
**L-v2.88-b/c/d**: realised v2.90; carry forward.
**L-v2.89-a**: atomic commit in flight v2.95; fallback ready but not actively exercised.
**L-v2.90-a-f**: codified documentationally v2.91. Not empirically re-exercised v2.95. Watchers.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated. Day count not refreshed v2.95.
- **First cc-0017e-post-apply cron 85 fire** → **CLOSED-PASS v2.93** (carry unchanged).
- **Cowork `nightly-health-check-v1` lifecycle gating WARN** — rank 1 carry; directive explicitly preserved as open v2.95.
- **Dashboard slices 1–3 visual PASS recorded v2.95** — cross-repo state recording; carry as Active rows for any follow-up dashboard work (slices 4+).
- No new v2.95 calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v2.95: **0 D-01 fires.** T-MCP-02 cum **~86 unchanged** v2.95. L46 NOT exercised v2.95 (no D-01). L62 NOT exercised v2.95. State-capture exceptions v2.95: 0 (cum 1). Close-the-loop UPDATEs v2.95: 0. **22 outstanding unchanged net.**

---

## 🤖 Cowork automation (D182)

**v2.95 update:** Cron 82/83/85/86 firing normally. **Cron 85 first post-cc-0017e natural fire CLOSED-PASS v2.93** unchanged. V-C3 signal-production CLOSED-PASS v2.92 carry unchanged. **Cowork brief lifecycle gating WARN** — rank 1 carry; directive explicitly preserved as open v2.95.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Dashboard slice 1 — `dashboard-nav-and-ops-copy-v1`** | Sidebar nav + /operations subtitle | RECORDED v2.95 | **CLOSED-VISUAL-PASS** at `af60953` | n/a (recorded) | n/a |
| **Dashboard slice 2 — `dashboard-operations-usability-v1` + remediation** | Save guardrail + FAB severity default + Overview deep-links | RECORDED v2.95 | **CLOSED-VISUAL-PASS** at `de4501b` + `37008e5` | n/a (recorded) | n/a |
| **Dashboard slice 3 — `dashboard-roadmap-phases-correction-v1`** | 4 D-FR-RECON-001 §4 corrections + layout + "Stop Claude" investigation | RECORDED v2.95 | **CLOSED-VISUAL-PASS** at `991a92b`. "Stop Claude" overlay confirmed external/non-app. | n/a (recorded) | n/a |
| **"Stop Claude" overlay external/non-app** | Slice 3 investigation outcome | RECORDED v2.95 | **CLOSED** — external/non-app. Not part of dashboard codebase. | n/a (recorded) | n/a |
| **Mobile/narrow Roadmap layout verification** | Visual-audit browser runtime overrode `resize_window`; needs real-device or CCD viewport test | **P3 carry, NEW v2.95** | OPEN. Not blocking. | CCD or PK | Real-device verification. |
| **Top alert bar count reconciliation** (dashboard slice 4 candidate) | Top bar vs Overview banner read disagreeing numbers; likely data-source reconciliation | **P2 carry, NEW v2.95** | OPEN. Backend-adjacent. | CCD → chat | CCD code audit before any dashboard fix. |
| **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** | Reframed v2.94; ready reset complete; convention patched. v2.95 directive explicitly preserved as open. | **P2 carry, rank 1 (unchanged from v2.94)** | OPEN. Closure waits on PK observation of next 16:00 UTC fire. | chat → PK | Observe next 16:00 UTC fire. |
| **3 no-fire scheduler days — `nightly-health-check-v1`** | 2026-05-16, 2026-05-18, 2026-05-19 | **P3 secondary follow-up (carry from v2.94)** | OPEN. Distinct from rank 1. | chat → PK | Read-only probe. |
| **cc-0016 friction-capture-evidence — Stage A** (Wave 8) | Parallel-executable with cc-0015 per D-FR-RECON-001 §7.B | **P2, rank 2 (unchanged)** | NOT STARTED. Backend-gated. | PK → chat | When PK directs. |
| **Wave 0f scoping** | Brief-authoring only; opportunistic during Gate 11 | **P3, rank 3 (unchanged)** | NOT STARTED. | chat → PK | When PK directs. |
| **Platform Reconciliation View brief** | Deferred per D-FR-RECON-001 §7.D | **P2 carry, rank 4 (unchanged)** | NOT STARTED. | PK → chat | When PK directs. |
| **5-row close-the-loop batch / Pre-sales / `purge_test_case` helper case_history extension** | 22 outstanding CCH + 1 T-MCP-05 meta + Pre-sales 3-clock criteria + helper coverage gap | **P2/P3 carry, rank 5 (unchanged)** | OPEN. | chat → PK | When PK directs. |
| **Music library activation** | video-worker v3.0.0 env-var gated | P2 carry | PENDING PK. | PK + chat | Bucket + tracks + env + smoke. |
| **vchecks.md V-B4 doc patch** | Correct V-B4 to 12-param signature | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **cc-0017c v1.2 doc patch candidate** | Date correction + 3 D-01 references + V-B4 signature correction | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **cc-0015 friction-pool-view brief** (Wave 7) | Authored PENDING_EXECUTION | P2 (Wave 7; still gated on 1-week window closing 2026-05-26) | DRAFTED commit `9a5dc155`. | chat → PK (Wave 7) | When window closes 2026-05-26. |
| **cc-0016 friction-capture-evidence brief** (Wave 8) | Authored PENDING_EXECUTION | P2 (Wave 8; parallel-executable per D-FR-RECON-001 §3) | DRAFTED commit `f35f8ea4`. | chat → PK (Wave 8) | When PK directs. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | P2 carry | OBSERVED. | chat → PK | Verify + dry-run + re-enable. |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P2 carry | LOGGED. | chat → PK | Audit m.post_draft. |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 carry | OPEN. | PK | When PK directs. |
| **L-v2.78-a baseline promotion** | Reviewer convergence | P3 carry | 2 occurrences, eligible. | chat → next lesson cycle | Promote alongside L-v2.81-a. |
| **L47 baseline promotion** | list_recent_commits before retry | P3 carry | 1 occurrence. | chat → next session | Consider co-promotion with L-v2.85-e. |
| **L-v2.81-a baseline promotion** | Parallel-session coordination | P3 carry | 2 occurrences, eligible. | chat → next lesson cycle | Promote. |
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (14+ occurrences v2.95; STRONG CANDIDATE)** | Re-applied at sync close commit v2.95. | chat → next lesson cycle | Promote. |
| **L-v2.84-a/b/c candidates** | Empirical precedence / idempotent REVOKE/GRANT / Path A corrected_action | P3 carry | 1 occurrence each. | chat → next session | Watcher. |
| **L-v2.84-d candidate** | Schema-probe-before-DML | P3 carry (2 occurrences) | Related to L-v2.90-a. | chat → next session | Promote-eligible co-promotion candidate. |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | P3 (4 occurrences; promotion-eligible; not re-exercised v2.95 doc-sync only) | Promotion-eligible carries forward. | chat → next lesson cycle | Promote. |
| **L-v2.85-b** | Inline V-check rewrite Path 1 / Path B-prime | P3 (carry; not re-exercised v2.95) | v2.90 ×4. | chat → next session | Watcher. |
| **L-v2.85-c** | SECURITY DEFINER bypass post REVOKE | P3 (1 occurrence) | Not re-exercised v2.95. | chat → next session | Watcher. |
| **L-v2.85-d** | Postgres-owner cleanup migration | P3 (REALIZED v2.86; re-exercised v2.90; not re-exercised v2.95) | Carries forward. | chat → next session | Watcher. |
| **L-v2.85-e** | push_files length budget — split-commit mitigation | **P3 (PROMOTION-CONFIRMED v2.88; 10th consecutive occurrence v2.95)** | Atomic single-commit close v2.95. | chat → next lesson cycle | **PROMOTE.** |
| **L-v2.86-a candidate (HIGH-SIGNAL)** | Pre-apply syntactic validation via transactional EXEC | P3 (PARTIALLY exercised v2.90; not re-exercised v2.95) | Lesson scope clarified v1.1. | chat → next session | Watcher. |
| **L-v2.86-b/c/d/e candidates** | out_-prefix / ROWTYPE quoting / CHECK pre-validation / slash-prefix fixture convention | P3 (b+c exercised v2.90 byte-stable; d+e unchanged; none re-exercised v2.95) | Carry. | chat → next session | Cross-brief carry. |
| **L-v2.88-a candidate** | Identical PK-directive loop | **P3 (2 occurrences v2.88 + v2.91; NOT re-occurring v2.95; watcher)** | Carries forward. | chat → next lesson cycle | Pair-promote with L-v2.85-e. |
| **L-v2.88-b/c/d candidates** | V-Z3 alignment / probe re-verification gate / in-function INSERT pattern | P3 (b realised v2.90; c REALISED v2.90; d realised v2.90; none re-exercised v2.95) | Carry forward. | chat → next lesson cycle | Promote after one more cycle. |
| **L-v2.89-a candidate** | push_files atomic timeout → 1+1+1 fallback | P3 (1 occurrence v2.89; not re-exercised v2.95 — atomic in flight; fallback ready) | Watcher. | chat → next session | Pair-promote with L-v2.85-e. |
| **L-v2.90-a (HIGH-SIGNAL)** | V-D fixture constraint-surface probing | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.95) | Caught 2 defects at v2.90 apply. | chat → next session | Watcher; pair with L-v2.84-d. |
| **L-v2.90-b (HIGH-SIGNAL)** | CREATE OR REPLACE FUNCTION arity change → explicit DROP | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.95) | Caught Defect 3. | chat → next session | Watcher. |
| **L-v2.90-c** | V-D fixture naming purge_test_case regex | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.95) | Caught Defect 4. | chat → next session | Watcher. |
| **L-v2.90-d** | Shadow tables + helper coverage gap audit | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.95) | Caught Defect 5; informs purge_test_case extension future Wave brief. | chat → next session | Watcher. |
| **L-v2.90-e** | Close-the-loop SQL template schema validation | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.95) | Caught Defects 6 + 7. | chat → next session | Watcher. |
| **L-v2.90-f** | Risk/grants verification clauses match actual lockdown scope | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.95) | Caught Defect 8. | chat → next session | Watcher. |
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
| **Parallel agent coordination (L47)** | informational | P3 carry | No interference v2.95. | chat → future | Passive. |
| **Other carries** | Dashboard mobile / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged from v2.86-v2.94. | various | various |

**Closed v2.95:**
- **Dashboard PHASES 46-streak deferral** (carry at v2.94) → **CLOSED** by Slice 3 ship (`991a92b`).
- **"Stop Claude" overlay investigation** → **CLOSED** (external/non-app per slice 3).
- **Dashboard slice 1 / 2 / 3** → all **RECORDED-CLOSED-VISUAL-PASS** v2.95.

**Spawned v2.95:**
- **Top alert bar count reconciliation** (dashboard slice 4 candidate; P2 backend-adjacent).
- **Mobile/narrow Roadmap layout verification** (P3 carry from slice 3 limitation).

**Promoted v2.95:** none (core ranks 1–5 unchanged from v2.94).

**Closed earlier:** v2.93 Reconciliation daily cadence diagnostic; v2.92 Health_check V-C3; v2.91 cc-0017e v1.1 8-item doc patch; v2.90 cc-0017e apply; v2.89 cc-0017e v1.1 column-name patch; v2.88 Wave 0e brief authoring; v2.87 cc-0017d v1.1 doc patch; v2.86 cc-0017d apply; v2.85 cc-0017c apply; v2.84 brief authoring + 2× D-01; v2.83 cc-0017b v1.1 doc patch; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.80 cc-0017a authoring; v2.79 PK approval gate.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v2.94.

---

## 📌 Backlog

**v2.95 state changes:**
- **Dashboard slices 1–3 RECORDED v2.95** as completed visual/operator work (cross-repo state recording).
- **Dashboard PHASES 46-streak deferral CLOSED v2.95** by Slice 3 ship. Standing 46-streak deferral carry retired.
- **"Stop Claude" overlay confirmed external/non-app v2.95** — closed observation.
- **Mobile/narrow Roadmap layout verification** added as P3 carry.
- **Top alert bar count reconciliation** added as P2 carry (dashboard slice 4 candidate).
- Cowork brief lifecycle gating WARN unchanged at rank 1 — directive explicitly preserved as open.
- cc-0015 / cc-0016 / PRV unchanged — directive explicitly preserved as open.
- T-MCP-02 cum ~86 unchanged.
- State-capture exceptions cum 1 unchanged.
- friction.* schema state: unchanged from v2.90-v2.94.
- L-v2.85-e mitigation re-applied **10th consecutive occurrence v2.95** (promotion-confirmed v2.88 carries forward).
- L-v2.83-a re-applied at sync close commit. Cumulative **14+ STRONG**.
- L-v2.88-a NOT re-occurring v2.95. Watcher (2 occurrences total) carries forward.
- L-v2.85-a HIGH-SIGNAL not re-exercised v2.95 (doc-sync only). 4 occurrences, promotion-eligible carries forward.
- L-v2.90-a-f not re-exercised v2.95. Watchers.
- **Dashboard PHASES 46-streak deferral CARRY RETIRED v2.95.**
- **No decisions.md change v2.95.**

---

## 🧊 Frozen / Deferred

Unchanged from v2.85-v2.94.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e + L-v2.88-a-d + L-v2.89-a + L-v2.90-a-f candidates carried per v2.95.

- **L40 / L41 / L46 / L58 / L62**: not exercised v2.95 (doc-sync only).
- **L-v2.76-a-f**: not re-exercised v2.95.
- **L-v2.78-a**: 2 occurrences (unchanged).
- **L47**: 1 occurrence (unchanged).
- **L-v2.81-a**: 2 occurrences (unchanged).
- **L-v2.83-a**: **14+ occurrences v2.95** (re-applied at sync close commit). STRONG CANDIDATE confirmed.
- **L-v2.84-a/b/c**: 1 occurrence each (unchanged).
- **L-v2.84-d**: 2 occurrences unchanged; related to L-v2.90-a.
- **L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v2.95).
- **L-v2.85-b**: 4× v2.90; not re-exercised v2.95.
- **L-v2.85-c**: 1 occurrence (unchanged).
- **L-v2.85-d**: REALIZED v2.86 + re-exercised v2.90; not re-exercised v2.95.
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88; 10th consecutive occurrence v2.95**.
- **L-v2.86-a (HIGH-SIGNAL)**: PARTIALLY exercised v2.90; not re-exercised v2.95.
- **L-v2.86-b/c**: exercised v2.90 byte-stable; not re-exercised v2.95.
- **L-v2.86-d/e**: unchanged.
- **L-v2.88-a**: 2 occurrences (v2.88 + v2.91); NOT re-occurring v2.95. Watcher.
- **L-v2.88-b**: realised v2.90 (V-Z3 live).
- **L-v2.88-c**: REALISED v2.90 (probe re-verification at apply).
- **L-v2.88-d**: realised v2.90.
- **L-v2.89-a**: 1 occurrence v2.89; not re-exercised v2.95 (atomic commit in flight; fallback ready).
- **L-v2.90-a-f**: codified documentationally v2.91; not empirically re-exercised v2.95. Watchers.

All candidates recommended for promotion at appropriate cycle once empirical evidence accumulates. **L-v2.85-e + L-v2.85-a + L-v2.83-a remain the highest-priority promotions at next lesson cycle; L-v2.88-a now eligible (2 occurrences); L-v2.90-a + L-v2.90-b (both HIGH-SIGNAL) join the watch.**

---

## v2.95 honest limitations

- All v2.31–v2.94 limitations apply.
- **Cross-repo state recording only** — chat did not fetch dashboard repo HEAD or independently verify the listed commits. Commit SHAs (`af60953` / `de4501b` / `37008e5` / `991a92b`) are recorded per PK directive payload.
- **"VISUAL PASS" reflects operator browser walkthrough**, not automated test coverage.
- **"Stop Claude" overlay external/non-app determination** is per slice 3 investigation report; precise origin not captured here.
- **Mobile/narrow Roadmap layout deliberately deferred to P3** — visual audit could not verify due to host-runtime override of `resize_window`.
- **Whether `/ef-drift` and `/onboarding` orphan routes ship as sidebar entries in slice 1** is recorded as candidate inclusion per outline; final shipped nav inventory awaits CCD/PK confirmation.
- **No fresh production state change v2.95.** friction.* state, T-MCP-02 cum (~86), state-capture exceptions (cum 1), 22 outstanding close-the-loop UPDATEs all unchanged net from v2.94.
- **Cowork lifecycle gating WARN explicitly preserved as open** at rank 1 — directive did not authorise closure.
- **Gate 11 day count not refreshed v2.95** — chat did not recompute calendar arithmetic this directive.
- **Memory cap 19/30** unchanged.
- **Action_list size at v2.95**: minor net change (ADDITIONS block + dashboard slices status block + Active table reshuffle); compaction not yet warranted.
- **Per-session files v2.95**: 1 — `docs/runtime/sessions/2026-05-20-v2.95-dashboard-slices-1-3-recorded.md`.
- **Doc-sync v2.95**: 1-commit atomic per L-v2.85-e baseline (sync_state + action_list + session file in single push). L-v2.89-a fallback (1+1+1) ready but NOT invoked v2.95.
- **Close-the-loop UPDATEs v2.95: 0** (no D-01 fired). 22 outstanding unchanged.
- **State-capture exceptions v2.95: 0**. Cumulative: 1.
- **Production mutations v2.95: 0.**
- **Dashboard PHASES 46-streak deferral CLOSED v2.95** by Slice 3. Standing 46-streak deferral carry retired.
- **No decisions.md change.**
- **No Wave 0f work started v2.95.**
- **No mid-session compaction event v2.95.**

---

## Changelog

- v1.0–v2.91: per commit history.
- v2.92 (2026-05-19 Sydney evening): Health_check V-C3 signal-production CLOSED-PASS + Cowork-cadence WARN spawned.
- v2.93 (2026-05-20 Sydney): Reconciliation daily cadence diagnostic CLOSED-PASS + 9-check matrix retired + D-FR-RECON-001 documented + Cowork cadence WARN promoted to rank 1.
- v2.94 (2026-05-20 Sydney): Cowork brief lifecycle gating WARN REFRAMED (was "scheduling cadence WARN") + `nightly-health-check-v1` ready reset + recurring-brief lifecycle convention patched at `docs/runtime/automation_v1_spec.md` Status flow § (4-case routing). 3 no-fire scheduler days carry as P3 secondary. WARN explicitly NOT closed.
- **v2.95 (2026-05-20 Sydney, Dashboard slices 1–3 RECORDED as completed visual/operator work):**
  - Build arc: pull main → read v2.94 close state → record directive payload (3 slices + observations + items NOT closed) → edit action_list (header + ADDITIONS + Today/Next 5 + dashboard ranking + Active + status blocks + Backlog + Lessons + Limitations + Changelog) → edit sync_state (index + inline + Next priorities + do-not-touch + footer) → write per-session file → atomic single-commit `push_files` (3 files).
  - Dashboard slice 1 `dashboard-nav-and-ops-copy-v1` at `af60953` — VISUAL PASS. Sidebar nav + /operations subtitle.
  - Dashboard slice 2 `dashboard-operations-usability-v1` + remediation at `de4501b` + `37008e5` — VISUAL PASS. Save guardrail + FAB severity default (Critical → Warn) + Overview deep-links.
  - Dashboard slice 3 `dashboard-roadmap-phases-correction-v1` at `991a92b` — VISUAL PASS. 4 D-FR-RECON-001 §4 corrections + layout collision + "Stop Claude" investigation.
  - "Stop Claude" overlay confirmed external/non-app during slice 3 — closed observation.
  - Mobile/narrow Roadmap layout unverified due browser resize override — P3 carry, not blocking.
  - **Dashboard PHASES 46-streak deferral BROKEN/CLOSED v2.95** by Slice 3. Standing 46-streak deferral carry retired.
  - Cowork brief lifecycle gating WARN UNCHANGED — rank 1 carry; directive explicitly preserved as open.
  - cc-0015 / cc-0016 / PRV UNCHANGED — directive explicitly preserved as open.
  - Top alert bar count reconciliation added as P2 carry (dashboard slice 4 candidate; backend-adjacent).
  - Mobile/narrow viewport verification added as P3 carry.
  - 0 D-01 fires; T-MCP-02 cum ~86 unchanged. State-capture exceptions cumulative 1 unchanged.
  - L-v2.85-e re-applied **10th consecutive occurrence** v2.95 (v2.86–v2.95). Promotion-confirmed v2.88 carries forward. Atomic single-commit close.
  - L-v2.83-a re-applied at sync close commit. Cumulative **14+ STRONG**.
  - L-v2.88-a NOT re-occurring v2.95 (cross-repo recording, not directive-loop). Watcher carries forward.
  - L-v2.89-a NOT actively exercised v2.95 (atomic commit in flight; fallback ready).
  - L-v2.85-a HIGH-SIGNAL NOT re-exercised v2.95.
  - L-v2.90-a-f NOT empirically re-exercised v2.95.
  - L40 / L41 / L46 / L58 / L62 NOT exercised v2.95.
  - No new L-v2.95-X candidates surfaced.
  - Production mutations: 0. Net schema deltas: 0. Supabase mutations: 0. apply_migration: 0. Edge-Function deploys: 0. Application code edits (either repo): 0.
  - No decisions.md change.
  - No mid-session compaction event.
  - No state-capture override.
  - Hard-stop discipline preserved end-to-end: 0 closure of Cowork lifecycle WARN; 0 marking of cc-0015 / cc-0016 / PRV as implemented; 0 Invegent-dashboard edits; 0 application code edits; 0 force-run of cron 85; 0 force-run of `nightly-health-check-v1`.
  - Closure budget: ~1h v2.95 (cross-repo state recording; sync close drafting). Trailing-14-day ~34h.
  - Doc-sync: atomic single-commit per L-v2.85-e baseline (sync_state + action_list + session file).
