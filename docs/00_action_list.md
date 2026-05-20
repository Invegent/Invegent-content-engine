# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-20 Sydney (**v2.96 — Dashboard slices 4A–4B recorded as completed visual/operator work**. Slice 4A `dashboard-status-strip-copy-links-v1` at `cd0240265507035cc93b8fb95927593f7c6b0da1` — VISUAL PASS (StatusStrip copy clarified; critical/posts/drafts clusters linked; stuck-jobs link implemented but only visible when precedence permits). Slice 4B `dashboard-drafts-count-clarity-v1` at `f5a980fea3a8411823285501307c2a52b3cf3de0` — VISUAL PASS (Overview "Drafts to review" now shows "Showing N of M drafts"; CCB observed `Showing 10 of 53 drafts`; M matched StatusStrip `53 drafts to review`). Count mismatch root cause confirmed: **copy/semantics, not cache or backend defect**. **Top alert bar count reconciliation CLOSED v2.96 for UI-copy/linkification scope** (was rank D1 v2.95). Deeper backend/shared-metrics refactor remains deferred unless separately directed (not actively ranked). Cowork brief lifecycle gating WARN UNCHANGED at core rank 1 (directive explicitly preserved as open). cc-0015 / cc-0016 / PRV / mobile-viewport verification UNCHANGED (open). 0 production mutations / 0 Supabase mutations / 0 deploys / 0 Invegent-dashboard edits this session / 0 D-01 fires / 0 application code edits / 0 memory edits / 0 decisions.md edits / 0 backend metric refactor started.) **Today/Next 5 core ranks v2.96 unchanged from v2.94/v2.95**: Cowork lifecycle WARN → rank 1; cc-0016 Stage A → rank 2; Wave 0f scoping → rank 3; PRV → rank 4 (deferred); close-the-loop → rank 5. **Dashboard work ranked v2.96 (D-rank shifted)**: cc-0015 UI → D1 (gated); cc-0016 UI → D2 (backend-gated); PRV surface → D3 (deferred); mobile viewport verification → D4 (P3).

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v2.95.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46-v2.58 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + **L-v2.83-a (STRONG; 15+ v2.96)** + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL; 4 occurrences — promotion-eligible) + L-v2.85-b/c/d carried + **L-v2.85-e PROMOTION-CONFIRMED 11th consecutive v2.96 (carries forward from v2.88)** + 5 L-v2.86 candidates + **L-v2.88-a (2 occurrences — watcher)** + L-v2.88-b/c/d candidates + L-v2.89-a candidate (carry) + **L-v2.90-a through L-v2.90-f candidates** (a/b HIGH-SIGNAL; c/d/e/f candidates). **D-IOL-001 (v2.77)** carried. **D-CC-0017B-Q1** carried.

**v2.96 ADDITIONS:**

- **Dashboard slices 4A–4B RECORDED v2.96 as completed visual/operator work** in Invegent-dashboard (cross-repo state recording; no Invegent-dashboard edits this session):
  - **Slice 4A: `dashboard-status-strip-copy-links-v1`** at `cd0240265507035cc93b8fb95927593f7c6b0da1` — VISUAL PASS. StatusStrip copy clarified; critical / posts / drafts clusters linked; stuck-jobs link implemented but only visible when precedence permits.
  - **Slice 4B: `dashboard-drafts-count-clarity-v1`** at `f5a980fea3a8411823285501307c2a52b3cf3de0` — VISUAL PASS. Overview "Drafts to review" now shows "Showing N of M drafts". CCB observed `Showing 10 of 53 drafts`; M matched StatusStrip `53 drafts to review`.

- **Count mismatch root cause confirmed v2.96: copy/semantics, not cache or backend defect.** Previously top bar ("4 critical alerts · 35 posts this week · 53 in inbox") and Overview banner ("5 published today · 116 overdue in queue · 4 critical incidents") read disagreeing numbers because each surface counted different things under similar labels. Clarified copy + N-of-M wording resolves the operator-confusion vector.

- **No mutating browser actions performed during CCB verification** (per directive).

- **Top alert bar count reconciliation CLOSED v2.96 for UI-copy/linkification scope** (was rank D1 v2.95 / spawned v2.95). Operator-confusion vector resolved. **Deeper backend/shared-metrics refactor remains deferred unless separately directed; not actively ranked.**

- **Remaining dashboard work ranked v2.96** (D-rank shifted up after D1 closure):
  - **Rank D1 (was D2 v2.95):** cc-0015 friction-pool-view UI (slice 5) — P2; backend already shipped; gated on Gate 11 observation window closing 2026-05-26.
  - **Rank D2 (was D3 v2.95):** cc-0016 evidence UI (slice 6) — P2; backend-gated (Stage A `friction.event` + Storage bucket + RLS policies; D-01 required).
  - **Rank D3 (was D4 v2.95):** Platform Reconciliation View surface (slice 7) — P2; PRV brief authoring deferred per D-FR-RECON-001 §7.D.
  - **Rank D4 (was D5 v2.95):** Mobile/narrow viewport verification — P3 carry; real-device or CCD viewport test; not blocking.
  - **Deferred carry (not actively ranked):** Backend/shared-metrics refactor — the deeper question behind the count mismatch (should both surfaces share a single metrics service). Deferred unless separately directed.

- **Items explicitly NOT closed v2.96 (per directive):**
  - Cowork brief lifecycle gating WARN (`nightly-health-check-v1`) — core rank 1; preserved open.
  - cc-0015 (Wave 7) — DRAFTED at `9a5dc155`; still gated on Gate 11 closing 2026-05-26.
  - cc-0016 (Wave 8) — DRAFTED at `f35f8ea4`; backend-gated.
  - PRV brief authoring — deferred per D-FR-RECON-001 §7.D.
  - Mobile/narrow viewport verification — P3 carry.
  - Backend/shared-metrics refactor — deferred; not actively ranked.

- **Hard stops respected v2.96:**
  - 0 production mutations / 0 Supabase mutations / 0 deploys
  - 0 Invegent-dashboard edits this session (slices shipped upstream by CCD; chat did not touch dashboard repo)
  - 0 closure of the Cowork lifecycle WARN (directive explicitly preserves)
  - 0 marking of cc-0015 / cc-0016 / PRV as implemented
  - 0 backend/shared-metrics refactor started
  - 0 application code edits (in either repo)
  - 0 memory edits / 0 decisions.md edits
  - 0 D-01 fires
  - 0 force-run of cron 85 / 0 force-run of `nightly-health-check-v1`

- **Sync close mechanics v2.96 (atomic single-commit per L-v2.85-e baseline — 11th consecutive occurrence):**
  1. Per-session detail file `docs/runtime/sessions/2026-05-20-v2.96-dashboard-slices-4a-4b-recorded.md`.
  2. sync_state + action_list + session file committed in **one atomic push** (CCH-side `push_files` MCP).

  L-v2.89-a fallback (1+1+1) ready but not invoked v2.96.

- **L-v2.85-e re-applied 11th consecutive occurrence** (v2.86 → v2.96); promotion-confirmed v2.88 carries forward.
- **L-v2.83-a re-applied** at sync close commit. Cumulative **15+ STRONG**.
- **L-v2.88-a NOT re-occurring v2.96** — cross-repo recording session, not directive-loop.
- **L-v2.89-a NOT actively exercised v2.96** — atomic commit in flight; fallback ready.
- **L-v2.85-a HIGH-SIGNAL / L-v2.86-a HIGH-SIGNAL / L-v2.90-a-f NOT re-exercised v2.96** (doc-sync only).
- **L40 / L41 / L46 / L58 / L62 NOT exercised v2.96** (no DB / no DDL / no D-01 / no apply).

- **No new L-v2.96-X candidates surfaced.** Cross-repo recording session.

- **Closed Active rows v2.96:** Top alert bar count reconciliation (P2 rank D1 v2.95) → **CLOSED for UI-copy/linkification scope** by slices 4A + 4B ship.
- **Spawned Active rows v2.96 (deferred carry):** Backend/shared-metrics refactor — deferred unless separately directed; not actively ranked.
- **Promoted Active rows v2.96:** Dashboard D-ranks D2→D1, D3→D2, D4→D3, D5→D4 after D1 closure.

- **NO decisions.md change v2.96.** Doc-sync close.
- **Session compaction event v2.96:** 0.
- **Production mutations v2.96: 0.**
- **D-01 fires v2.96: 0.**
- **T-MCP-02 cum v2.96: ~86 unchanged.**
- **State-capture exceptions v2.96: 0.** Cumulative: 1 unchanged.
- **Close-the-loop UPDATEs v2.96: 0** (no D-01 fired). 22 outstanding unchanged.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | 0 (recon daily diagnostic CLOSED-PASS v2.93; dashboard PHASES streak CLOSED v2.95; top alert bar count reconciliation CLOSED v2.96 for UI scope) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~35h (cumulative v2.83–v2.96) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.96 cycle: ~1h total** (cross-repo state recording; no diagnostic SQL; sync close drafting). 0 schema mutations. 0 D-01 fires. 1 atomic git commit (sync_state + action_list + session file in single push per L-v2.85-e baseline). **State-capture exception count v2.96: 0** (cumulative 1).

---

## ⭐ Today / Next 5 (core ICE ranks)

> Last rebuilt: 2026-05-20 Sydney (v2.96 — core ranks unchanged from v2.94/v2.95; dashboard work surfaced separately with D-rank shifted up after slice 4 closure).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** | **P2 carry, rank 1 (unchanged from v2.94/v2.95)** | Ready reset complete v2.94 + convention patched at `docs/runtime/automation_v1_spec.md` Status flow §. WARN explicitly NOT closed v2.96. | chat → PK | Observe next 16:00 UTC fire under new convention. |
| 2 | **cc-0016 friction-capture-evidence — Stage A** (Wave 8) | **P2, PK call per D-FR-RECON-001 §7.B** | Parallel-executable with cc-0015. Stage A touches `friction.event` + Storage bucket + RLS; D-01 required. | PK → chat | When PK directs. |
| 3 | **Wave 0f scoping** | **P3 brief-authoring only, opportunistic during Gate 11 observation window per D-FR-RECON-001 §7.C** | Brief-authoring is non-mutating. Candidates: items B/E/F/G deferred from cc-0017e + `purge_test_case` helper case_history extension (L-v2.90-d). | chat → PK | When PK directs (recommended during Gate 11 window 2026-05-19 → 2026-05-26). |
| 4 | **Platform Reconciliation View brief authoring** | **P2 carry, deferred per D-FR-RECON-001 §7.D** | Recommended to defer until corrected friction-register baseline accepted. | PK → chat | When PK directs. |
| 5 | **5-row close-the-loop batch sweep / Pre-sales criteria refinement / `purge_test_case` helper case_history extension** | **P2/P3 carry** | 22 outstanding close-the-loop UPDATEs. | chat → PK | When PK directs. |

## ⭐ Dashboard work (separately ranked v2.96, D-rank shifted)

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| D1 | **cc-0015 friction-pool-view UI** (slice 5) | P2 carry, **promoted from D2 v2.95** | Backend already shipped. Gated on Gate 11 observation window closing 2026-05-26. | PK → chat (Wave 7) | When window closes 2026-05-26. |
| D2 | **cc-0016 evidence UI** (slice 6) | P2 carry, **promoted from D3 v2.95** | Backend-gated. Stage A `friction.event` + Storage bucket + RLS policies; D-01 required. | PK → chat (Wave 8) | After backend Stage A applied. |
| D3 | **Platform Reconciliation View surface** (slice 7) | P2 carry, **promoted from D4 v2.95** | PRV brief authoring deferred per D-FR-RECON-001 §7.D. | PK → chat | When PRV brief authored + PK-accepted. |
| D4 | **Mobile/narrow viewport verification** (carry from slice 3) | **P3 carry, promoted from D5 v2.95** | Visual-audit browser runtime overrode `resize_window`. Not blocking. | CCD or PK | Real-device verification. |

**Deferred carry (not actively ranked):**
- **Backend/shared-metrics refactor** — the deeper question behind the v2.95 count mismatch (should both surfaces share a single metrics service). Deferred unless separately directed.

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Secondary follow-up (separate from core rank 1, lower priority)**: **3 no-fire scheduler days** for `nightly-health-check-v1` — 2026-05-16, 2026-05-18, 2026-05-19. P3 scheduler/agent-uptime investigation.

**Passive observation v2.96**: Cron 82-86 firing normally. PRV v1 operator views queryable. friction.* state: 10 tables, 19 functions (fn_triage_case 11-arg only), 29 cases + 29 events, 8 case_history rows. Cowork brief `nightly-health-check-v1` v3.0 reset to `ready` v2.94. **Dashboard `dashboard.invegent.com`**: slices 1–3 + 4A–4B all shipped + visually verified.

---

## 🟢 Dashboard slices — STATUS BLOCK (UPDATED v2.96)

**Status v2.96: Slices 1–3 + 4A–4B all RECORDED as completed visual/operator work in Invegent-dashboard. Cross-repo recording only; no dashboard edits this session.**

**Slices completed (per directive payloads v2.95 + v2.96):**
- Slice 1 `dashboard-nav-and-ops-copy-v1` at `af60953` — VISUAL PASS (v2.95).
- Slice 2 `dashboard-operations-usability-v1` + remediation at `de4501b` + `37008e5` — VISUAL PASS (v2.95).
- Slice 3 `dashboard-roadmap-phases-correction-v1` at `991a92b` — VISUAL PASS (v2.95).
- **Slice 4A `dashboard-status-strip-copy-links-v1` at `cd0240265507035cc93b8fb95927593f7c6b0da1` — VISUAL PASS (v2.96).**
- **Slice 4B `dashboard-drafts-count-clarity-v1` at `f5a980fea3a8411823285501307c2a52b3cf3de0` — VISUAL PASS (v2.96).**

**Slices remaining (ranked D1–D4 v2.96):**
- Slice 5: cc-0015 friction-pool-view UI — gated.
- Slice 6: cc-0016 evidence UI — backend-gated.
- Slice 7: PRV surface — deferred.
- Mobile viewport verification: P3 carry.

**Closed observations:**
- "Stop Claude" overlay confirmed external/non-app (v2.95).
- Top alert bar count reconciliation closed for UI-copy/linkification scope (v2.96).

**Deferred carries (not actively ranked):**
- Backend/shared-metrics refactor (the deeper scope behind slice 4 reconciliation).
- `/ef-drift` + `/onboarding` orphan-route confirmation (whether shipped in slice 1 nav).

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (v2.96 unchanged from v2.94/v2.95)

**Status v2.96: ✅ Wave 0 + Wave 0d + Wave 0e COMPLETE. Gates 10+12+13 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE. Day count not refreshed v2.96. Wave 0f scoping rank 3 carry.**

---

## 🟢 cc-0017e Wave 0e — STATUS BLOCK (unchanged v2.96)

Production state unchanged from v2.90+v2.91. friction.case_history table; fn_triage_case 11-arg patched; 5 cc-0017d mutation functions patched byte-stable; 8 backfill rows.

---

## 🟢 Cowork brief `nightly-health-check-v1` — STATUS BLOCK (unchanged v2.96)

Status v2.96: FROZEN at v3.0. Signal-production contract empirically validated v2.92 (V-C3 CLOSED-PASS). Lifecycle gating WARN unchanged — core rank 1; directive explicitly preserved as open v2.96. Brief reset to `status: ready` v2.94; convention patched v2.94 at `docs/runtime/automation_v1_spec.md` Status flow §. Closure waits on PK observation of next 16:00 UTC fire.

---

## 🟢 cc-0017d / cc-0017c / cc-0017b / cc-0017a / cc-0014 / cc-0015 / cc-0016 / cc-0012 / cc-0010A/B/C / cc-0011 / cc-0009 — STATUS BLOCKS

**v2.96 updates:** unchanged from v2.94/v2.95. Gate 11 day count not refreshed v2.96.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v2.96)

**L41**: cumulative v2.80-v2.96 = 11 (no new exercises v2.96).
**L40 / L46 / L58 / L62**: not exercised v2.96.
**L-v2.78-a / L-v2.81-a**: 2 occurrences each, promotion-eligible.
**L-v2.83-a**: **15+ occurrences v2.96** (re-applied at sync close commit). STRONG CANDIDATE confirmed.
**L-v2.84-a/b/c/d**: unchanged.
**L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v2.96).
**L-v2.85-b/c/d**: not re-exercised v2.96.
**L-v2.85-e**: **re-applied v2.96 — 11th consecutive occurrence** (v2.86 → v2.96). Atomic sync_state + action_list + session-file single commit. PROMOTION-CONFIRMED v2.88 carries forward.
**L-v2.86-a HIGH-SIGNAL**: not re-exercised v2.96.
**L-v2.86-b/c/d/e**: not re-exercised v2.96.
**L-v2.88-a**: 2 occurrences (v2.88 + v2.91); NOT re-occurring v2.96. Watcher carries forward.
**L-v2.88-b/c/d**: realised v2.90; carry forward.
**L-v2.89-a**: atomic commit in flight v2.96; fallback ready but not actively exercised.
**L-v2.90-a-f**: codified documentationally v2.91. Not empirically re-exercised v2.96. Watchers.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated. Day count not refreshed v2.96.
- **First cc-0017e-post-apply cron 85 fire** → **CLOSED-PASS v2.93** (carry unchanged).
- **Cowork `nightly-health-check-v1` lifecycle gating WARN** — core rank 1 carry; directive explicitly preserved as open v2.96.
- **Dashboard slices 1–3 + 4A–4B visual PASS recorded v2.95 + v2.96** — cross-repo state recording.
- No new v2.96 calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v2.96: **0 D-01 fires.** T-MCP-02 cum **~86 unchanged** v2.96. L46 NOT exercised v2.96 (no D-01). L62 NOT exercised v2.96. State-capture exceptions v2.96: 0 (cum 1). Close-the-loop UPDATEs v2.96: 0. **22 outstanding unchanged net.**

---

## 🤖 Cowork automation (D182)

**v2.96 update:** Cron 82/83/85/86 firing normally. **Cron 85 first post-cc-0017e natural fire CLOSED-PASS v2.93** unchanged. V-C3 signal-production CLOSED-PASS v2.92 carry unchanged. **Cowork brief lifecycle gating WARN** — core rank 1 carry; directive explicitly preserved as open v2.96.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Dashboard slice 4A — `dashboard-status-strip-copy-links-v1`** | StatusStrip copy + linkification + stuck-jobs link (precedence-gated) | RECORDED v2.96 | **CLOSED-VISUAL-PASS** at `cd0240265507035cc93b8fb95927593f7c6b0da1` | n/a (recorded) | n/a |
| **Dashboard slice 4B — `dashboard-drafts-count-clarity-v1`** | Overview "Drafts to review" shows "Showing N of M drafts" | RECORDED v2.96 | **CLOSED-VISUAL-PASS** at `f5a980fea3a8411823285501307c2a52b3cf3de0`. CCB observed `Showing 10 of 53 drafts`; M matched StatusStrip `53 drafts to review`. | n/a (recorded) | n/a |
| **Top alert bar count reconciliation (UI-copy/linkification scope)** | Was rank D1 v2.95 (P2 backend-adjacent). Root cause: copy/semantics, not cache/backend defect. | RECORDED v2.96 | **CLOSED for UI-copy/linkification scope** by slices 4A + 4B. | n/a (recorded) | n/a |
| **Backend/shared-metrics refactor** | Deeper scope behind v2.95 count mismatch. Should both surfaces share a single metrics service? | **DEFERRED carry v2.96** | OPEN. Not actively ranked. | n/a | When separately directed. |
| **Dashboard slice 1 — `dashboard-nav-and-ops-copy-v1`** | Sidebar nav + /operations subtitle | RECORDED v2.95 | **CLOSED-VISUAL-PASS** at `af60953` | n/a (recorded) | n/a |
| **Dashboard slice 2 — `dashboard-operations-usability-v1` + remediation** | Save guardrail + FAB severity default + Overview deep-links | RECORDED v2.95 | **CLOSED-VISUAL-PASS** at `de4501b` + `37008e5` | n/a (recorded) | n/a |
| **Dashboard slice 3 — `dashboard-roadmap-phases-correction-v1`** | 4 D-FR-RECON-001 §4 corrections + layout + "Stop Claude" investigation | RECORDED v2.95 | **CLOSED-VISUAL-PASS** at `991a92b`. "Stop Claude" overlay confirmed external/non-app. | n/a (recorded) | n/a |
| **Mobile/narrow Roadmap layout verification** | Visual-audit browser runtime overrode `resize_window` | **P3 carry v2.95** | OPEN. Not blocking. | CCD or PK | Real-device verification. |
| **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** | Reframed v2.94; ready reset complete; convention patched. Directive explicitly preserved as open v2.96. | **P2 carry, core rank 1 (unchanged from v2.94/v2.95)** | OPEN. Closure waits on PK observation of next 16:00 UTC fire. | chat → PK | Observe next 16:00 UTC fire. |
| **3 no-fire scheduler days — `nightly-health-check-v1`** | 2026-05-16, 2026-05-18, 2026-05-19 | **P3 secondary follow-up** | OPEN. Distinct from core rank 1. | chat → PK | Read-only probe. |
| **cc-0016 friction-capture-evidence — Stage A** (Wave 8) | Parallel-executable with cc-0015 per D-FR-RECON-001 §7.B | **P2, core rank 2 (unchanged)** | NOT STARTED. Backend-gated. | PK → chat | When PK directs. |
| **Wave 0f scoping** | Brief-authoring only; opportunistic during Gate 11 | **P3, core rank 3 (unchanged)** | NOT STARTED. | chat → PK | When PK directs. |
| **Platform Reconciliation View brief** | Deferred per D-FR-RECON-001 §7.D | **P2 carry, core rank 4 (unchanged)** | NOT STARTED. | PK → chat | When PK directs. |
| **5-row close-the-loop batch / Pre-sales / `purge_test_case` helper case_history extension** | 22 outstanding CCH + 1 T-MCP-05 meta + Pre-sales 3-clock criteria + helper coverage gap | **P2/P3 carry, core rank 5 (unchanged)** | OPEN. | chat → PK | When PK directs. |
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
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (15+ occurrences v2.96; STRONG CANDIDATE)** | Re-applied at sync close commit v2.96. | chat → next lesson cycle | Promote. |
| **L-v2.84-a/b/c candidates** | Empirical precedence / idempotent REVOKE/GRANT / Path A corrected_action | P3 carry | 1 occurrence each. | chat → next session | Watcher. |
| **L-v2.84-d candidate** | Schema-probe-before-DML | P3 carry (2 occurrences) | Related to L-v2.90-a. | chat → next session | Promote-eligible co-promotion candidate. |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | P3 (4 occurrences; promotion-eligible; not re-exercised v2.96) | Promotion-eligible carries forward. | chat → next lesson cycle | Promote. |
| **L-v2.85-b** | Inline V-check rewrite Path 1 / Path B-prime | P3 (carry; not re-exercised v2.96) | v2.90 ×4. | chat → next session | Watcher. |
| **L-v2.85-c** | SECURITY DEFINER bypass post REVOKE | P3 (1 occurrence) | Not re-exercised v2.96. | chat → next session | Watcher. |
| **L-v2.85-d** | Postgres-owner cleanup migration | P3 (REALIZED v2.86; re-exercised v2.90; not re-exercised v2.96) | Carries forward. | chat → next session | Watcher. |
| **L-v2.85-e** | push_files length budget — split-commit mitigation | **P3 (PROMOTION-CONFIRMED v2.88; 11th consecutive occurrence v2.96)** | Atomic single-commit close v2.96. | chat → next lesson cycle | **PROMOTE.** |
| **L-v2.86-a candidate (HIGH-SIGNAL)** | Pre-apply syntactic validation via transactional EXEC | P3 (PARTIALLY exercised v2.90; not re-exercised v2.96) | Lesson scope clarified v1.1. | chat → next session | Watcher. |
| **L-v2.86-b/c/d/e candidates** | out_-prefix / ROWTYPE quoting / CHECK pre-validation / slash-prefix fixture convention | P3 (b+c exercised v2.90 byte-stable; d+e unchanged; none re-exercised v2.96) | Carry. | chat → next session | Cross-brief carry. |
| **L-v2.88-a candidate** | Identical PK-directive loop | **P3 (2 occurrences v2.88 + v2.91; NOT re-occurring v2.96; watcher)** | Carries forward. | chat → next lesson cycle | Pair-promote with L-v2.85-e. |
| **L-v2.88-b/c/d candidates** | V-Z3 alignment / probe re-verification gate / in-function INSERT pattern | P3 (b realised v2.90; c REALISED v2.90; d realised v2.90; none re-exercised v2.96) | Carry forward. | chat → next lesson cycle | Promote after one more cycle. |
| **L-v2.89-a candidate** | push_files atomic timeout → 1+1+1 fallback | P3 (1 occurrence v2.89; not re-exercised v2.96 — atomic in flight; fallback ready) | Watcher. | chat → next session | Pair-promote with L-v2.85-e. |
| **L-v2.90-a (HIGH-SIGNAL)** | V-D fixture constraint-surface probing | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.96) | Caught 2 defects at v2.90 apply. | chat → next session | Watcher; pair with L-v2.84-d. |
| **L-v2.90-b (HIGH-SIGNAL)** | CREATE OR REPLACE FUNCTION arity change → explicit DROP | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.96) | Caught Defect 3. | chat → next session | Watcher. |
| **L-v2.90-c** | V-D fixture naming purge_test_case regex | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.96) | Caught Defect 4. | chat → next session | Watcher. |
| **L-v2.90-d** | Shadow tables + helper coverage gap audit | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.96) | Caught Defect 5. | chat → next session | Watcher. |
| **L-v2.90-e** | Close-the-loop SQL template schema validation | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.96) | Caught Defects 6 + 7. | chat → next session | Watcher. |
| **L-v2.90-f** | Risk/grants verification clauses match actual lockdown scope | P3 (1 occurrence v2.90; codified documentationally v2.91; not re-exercised v2.96) | Caught Defect 8. | chat → next session | Watcher. |
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
| **Parallel agent coordination (L47)** | informational | P3 carry | No interference v2.96. | chat → future | Passive. |
| **Other carries** | Dashboard mobile / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged from v2.86-v2.95. | various | various |

**Closed v2.96:**
- **Top alert bar count reconciliation (UI-copy/linkification scope)** — was rank D1 v2.95 → **CLOSED** by slices 4A + 4B ship.
- **Dashboard slice 4A** → RECORDED-CLOSED-VISUAL-PASS.
- **Dashboard slice 4B** → RECORDED-CLOSED-VISUAL-PASS.

**Spawned v2.96 (deferred carry):**
- **Backend/shared-metrics refactor** — the deeper scope behind v2.95 count mismatch. Deferred unless separately directed; not actively ranked.

**Promoted v2.96:** Dashboard D-ranks D2→D1, D3→D2, D4→D3, D5→D4 after D1 closure.

**Closed earlier:** v2.95 dashboard slices 1–3 + PHASES 46-streak deferral + "Stop Claude" investigation; v2.93 Reconciliation daily cadence diagnostic; v2.92 Health_check V-C3; v2.91 cc-0017e v1.1 8-item doc patch; v2.90 cc-0017e apply; v2.89 cc-0017e v1.1 column-name patch; v2.88 Wave 0e brief authoring; v2.87 cc-0017d v1.1 doc patch; v2.86 cc-0017d apply; v2.85 cc-0017c apply; v2.84 brief authoring + 2× D-01; v2.83 cc-0017b v1.1 doc patch; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.80 cc-0017a authoring; v2.79 PK approval gate.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v2.95.

---

## 📌 Backlog

**v2.96 state changes:**
- **Dashboard slices 4A–4B RECORDED v2.96** as completed visual/operator work (cross-repo state recording).
- **Top alert bar count reconciliation CLOSED v2.96** for UI-copy/linkification scope (was rank D1 v2.95).
- **Backend/shared-metrics refactor** added as deferred carry (not actively ranked).
- Dashboard D-ranks shifted: D2→D1, D3→D2, D4→D3, D5→D4 after slice 4 closure.
- Cowork brief lifecycle gating WARN unchanged at core rank 1 — directive explicitly preserved as open.
- cc-0015 / cc-0016 / PRV unchanged — directive explicitly preserved as open.
- Mobile/narrow viewport verification unchanged (P3 carry).
- T-MCP-02 cum ~86 unchanged.
- State-capture exceptions cum 1 unchanged.
- friction.* schema state: unchanged from v2.90-v2.95.
- L-v2.85-e mitigation re-applied **11th consecutive occurrence v2.96** (promotion-confirmed v2.88 carries forward).
- L-v2.83-a re-applied at sync close commit. Cumulative **15+ STRONG**.
- L-v2.88-a NOT re-occurring v2.96. Watcher (2 occurrences total) carries forward.
- L-v2.85-a HIGH-SIGNAL not re-exercised v2.96 (doc-sync only). 4 occurrences, promotion-eligible carries forward.
- L-v2.90-a-f not re-exercised v2.96. Watchers.
- **No decisions.md change v2.96.**

---

## 🧊 Frozen / Deferred

Unchanged from v2.85-v2.95. Plus: **Backend/shared-metrics refactor** added v2.96 as deferred carry.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e + L-v2.88-a-d + L-v2.89-a + L-v2.90-a-f candidates carried per v2.96.

- **L40 / L41 / L46 / L58 / L62**: not exercised v2.96 (doc-sync only).
- **L-v2.76-a-f**: not re-exercised v2.96.
- **L-v2.78-a**: 2 occurrences (unchanged).
- **L47**: 1 occurrence (unchanged).
- **L-v2.81-a**: 2 occurrences (unchanged).
- **L-v2.83-a**: **15+ occurrences v2.96** (re-applied at sync close commit). STRONG CANDIDATE confirmed.
- **L-v2.84-a/b/c**: 1 occurrence each (unchanged).
- **L-v2.84-d**: 2 occurrences unchanged; related to L-v2.90-a.
- **L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v2.96).
- **L-v2.85-b**: 4× v2.90; not re-exercised v2.96.
- **L-v2.85-c**: 1 occurrence (unchanged).
- **L-v2.85-d**: REALIZED v2.86 + re-exercised v2.90; not re-exercised v2.96.
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88; 11th consecutive occurrence v2.96**.
- **L-v2.86-a (HIGH-SIGNAL)**: PARTIALLY exercised v2.90; not re-exercised v2.96.
- **L-v2.86-b/c**: exercised v2.90 byte-stable; not re-exercised v2.96.
- **L-v2.86-d/e**: unchanged.
- **L-v2.88-a**: 2 occurrences (v2.88 + v2.91); NOT re-occurring v2.96. Watcher.
- **L-v2.88-b**: realised v2.90 (V-Z3 live).
- **L-v2.88-c**: REALISED v2.90 (probe re-verification at apply).
- **L-v2.88-d**: realised v2.90.
- **L-v2.89-a**: 1 occurrence v2.89; not re-exercised v2.96.
- **L-v2.90-a-f**: codified documentationally v2.91; not empirically re-exercised v2.96. Watchers.

All candidates recommended for promotion at appropriate cycle once empirical evidence accumulates. **L-v2.85-e + L-v2.85-a + L-v2.83-a remain the highest-priority promotions at next lesson cycle; L-v2.88-a now eligible (2 occurrences); L-v2.90-a + L-v2.90-b (both HIGH-SIGNAL) join the watch.**

---

## v2.96 honest limitations

- All v2.31–v2.95 limitations apply.
- **Cross-repo state recording only** — chat did not fetch dashboard repo HEAD or independently verify the listed commits. Commit SHAs (`cd0240265507035cc93b8fb95927593f7c6b0da1` / `f5a980fea3a8411823285501307c2a52b3cf3de0`) are recorded per PK directive payload.
- **"VISUAL PASS" reflects CCB operator browser walkthrough**, not automated test coverage. Numbers cited (`Showing 10 of 53 drafts`; `53 drafts to review`) are per directive payload.
- **Closure of top alert bar count reconciliation is scoped to UI-copy/linkification only.** The deeper question — should both surfaces share a single metrics service — remains deferred. If the same operator-confusion vector resurfaces under different copy, the deferred backend refactor would need separate authorisation.
- **Stuck-jobs link in slice 4A is "only visible when precedence permits"** — the precedence rule itself is not described in the directive; chat did not inspect dashboard code. CCD code audit would surface the rule if needed.
- **No fresh production state change v2.96.** friction.* state, T-MCP-02 cum (~86), state-capture exceptions (cum 1), 22 outstanding close-the-loop UPDATEs all unchanged net from v2.95.
- **Cowork lifecycle gating WARN explicitly preserved as open** at core rank 1 — directive did not authorise closure.
- **Gate 11 day count not refreshed v2.96** — chat did not recompute calendar arithmetic this directive.
- **Memory cap 19/30** unchanged.
- **Action_list size at v2.96**: minor net change (ADDITIONS block + dashboard slices 4A–4B Active rows + D-rank shift); compaction not yet warranted.
- **Per-session files v2.96**: 1 — `docs/runtime/sessions/2026-05-20-v2.96-dashboard-slices-4a-4b-recorded.md`.
- **Doc-sync v2.96**: 1-commit atomic per L-v2.85-e baseline (sync_state + action_list + session file in single push). L-v2.89-a fallback (1+1+1) ready but NOT invoked v2.96.
- **Close-the-loop UPDATEs v2.96: 0** (no D-01 fired). 22 outstanding unchanged.
- **State-capture exceptions v2.96: 0**. Cumulative: 1.
- **Production mutations v2.96: 0.**
- **No decisions.md change.**
- **No Wave 0f work started v2.96.**
- **No mid-session compaction event v2.96.**
- **No backend/shared-metrics refactor started v2.96.**

---

## Changelog

- v1.0–v2.91: per commit history.
- v2.92 (2026-05-19 Sydney evening): Health_check V-C3 signal-production CLOSED-PASS + Cowork-cadence WARN spawned.
- v2.93 (2026-05-20 Sydney): Reconciliation daily cadence diagnostic CLOSED-PASS + 9-check matrix retired + D-FR-RECON-001 documented.
- v2.94 (2026-05-20 Sydney): Cowork brief lifecycle gating WARN REFRAMED + nightly-health-check-v1 ready reset + recurring-brief lifecycle convention patched.
- v2.95 (2026-05-20 Sydney): Dashboard slices 1–3 RECORDED as completed visual/operator work. Dashboard PHASES 46-streak deferral CLOSED.
- **v2.96 (2026-05-20 Sydney, Dashboard slices 4A–4B RECORDED + top alert bar count reconciliation CLOSED for UI scope):**
  - Build arc: pull main → read v2.95 close state → record directive payload (2 slices + observations + items NOT closed) → edit action_list (header + ADDITIONS + Today/Next 5 + dashboard ranking + Active + status blocks + Backlog + Lessons + Limitations + Changelog) → edit sync_state (index + inline + Next priorities + do-not-touch + footer) → write per-session file → atomic single-commit `push_files` (3 files).
  - Dashboard slice 4A `dashboard-status-strip-copy-links-v1` at `cd0240265507035cc93b8fb95927593f7c6b0da1` — VISUAL PASS. StatusStrip copy + linkification + precedence-gated stuck-jobs link.
  - Dashboard slice 4B `dashboard-drafts-count-clarity-v1` at `f5a980fea3a8411823285501307c2a52b3cf3de0` — VISUAL PASS. Overview "Drafts to review" shows N-of-M wording (CCB observed `Showing 10 of 53 drafts`; M matched `53 drafts to review`).
  - Count mismatch root cause confirmed: copy/semantics, not cache or backend defect.
  - **Top alert bar count reconciliation CLOSED v2.96 for UI-copy/linkification scope** (was rank D1 v2.95).
  - **Backend/shared-metrics refactor** added v2.96 as deferred carry (not actively ranked).
  - Dashboard D-ranks shifted up by one (D2→D1, D3→D2, D4→D3, D5→D4).
  - Cowork brief lifecycle gating WARN UNCHANGED — core rank 1; directive explicitly preserved as open.
  - cc-0015 / cc-0016 / PRV UNCHANGED — directive explicitly preserved as open.
  - Mobile/narrow viewport verification UNCHANGED (P3 carry).
  - 0 D-01 fires; T-MCP-02 cum ~86 unchanged. State-capture exceptions cumulative 1 unchanged.
  - L-v2.85-e re-applied **11th consecutive occurrence** v2.96 (v2.86–v2.96). Promotion-confirmed v2.88 carries forward. Atomic single-commit close.
  - L-v2.83-a re-applied at sync close commit. Cumulative **15+ STRONG**.
  - L-v2.88-a NOT re-occurring v2.96 (cross-repo recording, not directive-loop). Watcher carries forward.
  - L-v2.89-a NOT actively exercised v2.96 (atomic commit in flight; fallback ready).
  - L-v2.85-a HIGH-SIGNAL NOT re-exercised v2.96.
  - L-v2.90-a-f NOT empirically re-exercised v2.96.
  - L40 / L41 / L46 / L58 / L62 NOT exercised v2.96.
  - No new L-v2.96-X candidates surfaced.
  - Production mutations: 0. Net schema deltas: 0. Supabase mutations: 0. apply_migration: 0. Edge-Function deploys: 0. Application code edits (either repo): 0. Backend metric refactor started: 0.
  - No decisions.md change.
  - No mid-session compaction event.
  - No state-capture override.
  - Hard-stop discipline preserved end-to-end: 0 closure of Cowork lifecycle WARN; 0 marking of cc-0015 / cc-0016 / PRV as implemented; 0 Invegent-dashboard edits; 0 application code edits; 0 force-run of cron 85; 0 force-run of `nightly-health-check-v1`; 0 backend/shared-metrics refactor started.
  - Closure budget: ~1h v2.96 (cross-repo state recording; sync close drafting). Trailing-14-day ~35h.
  - Doc-sync: atomic single-commit per L-v2.85-e baseline (sync_state + action_list + session file).
