# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-21 Sydney (**v3.02 — Dashboard mobile/narrow viewport verification CLOSED/PASS**. CCB tested at 306×498 Nexus 5 Android Chrome UA, DPR 2 → MOBILE PASS. Mobile fix resolved: sidebar collapses to hamburger/drawer; desktop fixed rail no longer consumes mobile width; /operations rows readable; evidence paperclip badge visible; expanded Evidence section usable; triage guardrail usable; FAB usable; Roadmap readable; "Stop Claude" overlay remains external Claude Browser tooling. **Mobile/narrow viewport verification removed from open P3 carries.** Mobile-fix commit SHA NOT supplied in directive — recorded PENDING (not fabricated); backfill next session. NEW lesson candidate L-v3.02-a. cc-0015 Gate 11 watch / Stage E future / PRV deferred / Q-005 (if open) PRESERVED. 0 dashboard edits / 0 Supabase mutations / 0 Stage E / 0 cleanup / 0 cc-0015 start / 0 PRV closure / 0 smoke deletion / 0 D-01 fires / 0 memory edits / 0 decisions.md edits.) **Today/Next 5 core ranks v3.02**: Cowork lifecycle WARN → rank 1; cc-0016 Stage E scoping/dry-run design ONLY → rank 2 conditional (Option A); Wave 0f scoping → rank 3; PRV → rank 4 (deferred); close-the-loop → rank 5.

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v3.00.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + **L-v2.83-a (STRONG; 18+ v3.02)** + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL; 4 occurrences) + L-v2.85-b/c/d + **L-v2.85-e PROMOTION-CONFIRMED 14th consecutive v3.02** + 5 L-v2.86 candidates + **L-v2.88-a (watcher CLOSED for cc-0016; 2 prior occurrences carry)** + L-v2.88-b/c/d + L-v2.89-a + **L-v2.90-a through L-v2.90-f** + **L62 strongly reinforced via cc-0016 6-fire D-01 series** + **L-v3.02-a NEW candidate (mobile breakpoint verification after primary operator-surface change)**. **D-IOL-001 (v2.77)** + **D-CC-0017B-Q1** carried.

**v3.02 ADDITIONS:**

- **Mobile/narrow viewport verification RECORDED CLOSED/PASS v3.02.** CCB tested at 306×498 Nexus 5 Android Chrome UA, DPR 2 → MOBILE PASS. Cross-repo recording; no dashboard edits this session.
  - Mobile fix resolved: sidebar collapses to hamburger/drawer; desktop fixed rail no longer consumes mobile width; /operations rows readable; evidence paperclip badge visible; expanded Evidence section usable; triage guardrail usable; FAB usable; Roadmap readable; "Stop Claude" overlay remains external Claude Browser tooling.
  - **Removed from open P3 carries.** Was open since dashboard slice 3 limitation (v2.95 browser runtime overrode `resize_window`).

- **⚠️ Mobile-fix commit SHA NOT supplied in directive** — recorded as `<PENDING — SHA not supplied in directive>`. Chat did not fabricate. Backfill next session via small reconciliation commit.

- **NEW lesson candidate L-v3.02-a:** mobile/narrow breakpoint should be verified after any primary operator-surface change. Rationale: `/operations` shipped evidence display (Stage D) on desktop; mobile breakpoint regression only caught by dedicated narrow-viewport pass. 1 occurrence; watcher.

- **Items explicitly preserved v3.02 (per directive):**
  - cc-0015 Gate 11 watch — window closes 2026-05-26; do NOT start before.
  - cc-0016 Stage E lifecycle cleanup — future/separately-approved-only.
  - PRV brief authoring — deferred per D-FR-RECON-001 §7.D.
  - Cowork brief lifecycle gating WARN — core rank 1.
  - Q-005 — if open, preserved non-blocking (not in loaded carry set this session).
  - Backend/shared-metrics refactor — deferred carry.

- **Hard stops respected v3.02:**
  - 0 Invegent-dashboard edits this session
  - 0 Supabase mutations
  - 0 Stage E started / 0 cleanup run
  - 0 cc-0015 start before Gate 11 closes
  - 0 PRV closure
  - 0 deletion of smoke objects or test events
  - 0 D-01 fires / 0 memory edits / 0 decisions.md edits
  - 0 SHA fabrication

- **Sync close mechanics v3.02 (atomic single-commit per L-v2.85-e baseline — 14th consecutive occurrence):**
  1. Per-session detail file `docs/runtime/sessions/2026-05-21-v3.02-dashboard-mobile-viewport-pass.md`.
  2. sync_state + action_list + session file committed in **one atomic push**.
  L41 clobber-mitigation applied (held content == HEAD verified before full-file push, per v3.00.1 lesson). L-v2.89-a fallback (1+1+1) ready but not invoked.

- **L-v2.85-e re-applied 14th consecutive occurrence**; promotion-confirmed v2.88 carries forward.
- **L-v2.83-a re-applied** at sync close. Cumulative **18+ STRONG**.
- **L-v3.02-a NEW candidate** registered.
- **L40 / L41 / L46 / L58 / L62 NOT newly exercised v3.02** (L41 mitigation lightly applied; no DDL/D-01).

- **Closed Active rows v3.02:** Mobile/narrow viewport verification → CLOSED/PASS.
- **NO decisions.md change v3.02.**
- **Production mutations v3.02: 0. D-01 fires v3.02: 0. T-MCP-02 cum: ~92 unchanged. State-capture exceptions: 1 unchanged.**

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | 0 (recon CLOSED v2.93; PHASES streak CLOSED v2.95; top alert bar CLOSED v2.96; Stage B CLOSED v2.99; Stage D CLOSED v3.00; mobile viewport CLOSED v3.02) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~37.5h (cumulative v2.83–v3.02) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v3.02 cycle: ~0.5h total** (cross-repo state recording; sync close drafting). 0 schema mutations. 0 D-01 fires. 1 atomic git commit. **State-capture exception count v3.02: 0** (cumulative 1).

---

## ⭐ Today / Next 5 (core ICE ranks)

> Last rebuilt: 2026-05-21 Sydney (v3.02 — mobile viewport verification CLOSED; core ranks unchanged from v3.00).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** | **P2 carry, rank 1 (unchanged)** | Ready reset complete v2.94 + convention patched. WARN explicitly NOT closed. | chat → PK | Observe next 16:00 UTC fire under new convention. |
| 2 | **cc-0016 Stage E scoping/dry-run design ONLY** (conditional — Option A) | **P2, rank 2 conditional** | cc-0016 evidence path complete A→B→C→D + mobile-verified; only Stage E (lifecycle cleanup) remains. Option A = NON-MUTATING design + dry-run spec. First destructive run still requires separate PK approval. **Replaced if PK picks Option B (pause → Cowork/cc-0015) or Option C (now closed — mobile done).** | PK → chat | PK picks. If A: author Stage E dry-run design (no execution). |
| 3 | **Wave 0f scoping** | **P3 brief-authoring only, opportunistic during Gate 11 window** | Non-mutating. Candidates: items B/E/F/G from cc-0017e + `purge_test_case` helper case_history extension (L-v2.90-d). | chat → PK | When PK directs (during Gate 11 window 2026-05-19 → 2026-05-26). |
| 4 | **Platform Reconciliation View brief authoring** | **P2 carry, deferred per D-FR-RECON-001 §7.D** | Defer until corrected friction-register baseline accepted. | PK → chat | When PK directs. |
| 5 | **5-row close-the-loop batch sweep / Pre-sales criteria / `purge_test_case` helper case_history extension** | **P2/P3 carry** | Outstanding close-the-loop UPDATEs (net not recomputed). | chat → PK | When PK directs. |

**Time-bound nudge:** cc-0015 Gate 11 observation window closes **2026-05-26** (~5 days out from 2026-05-21). cc-0015 friction-pool-view UI (Wave 7) unblocks then → leading dashboard build.

**Backfill carry:** Mobile-fix commit SHA PENDING from v3.02 directive — supply + patch next session.

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

## 🟢 cc-0016 friction-capture-evidence — STATUS BLOCK (v3.02 — unchanged from v3.00)

**Status: Stage A CLOSED + Stage C CLOSED + Stage B CLOSED/PASS + Stage D CLOSED/PASS. Evidence capture/display path COMPLETE through Stage D; now also mobile-verified (v3.02). Stage E future/separately-approved-only.**

**Stage ledger:**

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

## 🟢 Friction Register Consolidation Plan v1 — STATUS BLOCK (v3.02 unchanged)

Wave 0 + 0d + 0e COMPLETE. Gates 10+12+13 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE — ~5 days out. Day count not refreshed v3.02. Wave 0f scoping rank 3 carry. **cc-0016 Wave 8 Stage A/B/C/D closed (+ mobile-verified); only Stage E (future/separately-approved) remains.**

---

## 🟢 Cowork brief `nightly-health-check-v1` — STATUS BLOCK (v3.02 unchanged)

FROZEN at v3.0. Signal-production contract empirically validated v2.92. Lifecycle gating WARN unchanged — core rank 1; preserved open v3.02. Brief reset to `ready` v2.94; convention patched v2.94. Closure waits on PK observation of next 16:00 UTC fire.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v3.02)

**L41**: lightly reinforced v3.02 (v3.00.1 clobber-mitigation applied: held content == HEAD verified before full-file push). No DDL exercises.
**L40 / L46 / L58**: not exercised v3.02.
**L62**: strongly reinforced via cc-0016 6-fire D-01 series; not newly exercised v3.02 (no D-01).
**L-v2.83-a**: **18+ occurrences v3.02**. STRONG CANDIDATE confirmed.
**L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged).
**L-v2.85-e**: re-applied v3.02 — **14th consecutive occurrence**. PROMOTION-CONFIRMED v2.88 carries forward.
**L-v2.88-a**: watcher CLOSED for cc-0016. 2 prior occurrences carry.
**L-v3.02-a**: NEW candidate — mobile breakpoint verification after primary operator-surface change. 1 occurrence; watcher.
**L-v2.90-a-f**: not empirically re-exercised v3.02. Watchers.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated. ~5 days out. Day count not refreshed v3.02.
- **Cowork `nightly-health-check-v1` lifecycle gating WARN** — core rank 1 carry; preserved open v3.02.
- **Mobile-fix commit SHA backfill** — PENDING from v3.02; supply next session.
- No new v3.02 calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v3.02: **0 D-01 fires.** T-MCP-02 cum **~92 unchanged**. State-capture exceptions v3.02: 0 (cum 1). Close-the-loop UPDATEs v3.02: 0.

---

## 🤖 Cowork automation (D182)

**v3.02 update:** Cron 82/83/85/86 firing normally. Cowork brief lifecycle gating WARN — core rank 1 carry; preserved open v3.02.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Mobile/narrow viewport verification** | CCB 306×498 Nexus 5 DPR2 → MOBILE PASS | RECORDED v3.02 | **CLOSED/PASS** | n/a (recorded) | n/a |
| **Mobile-fix commit SHA backfill** | SHA not supplied in v3.02 directive | P3 admin carry NEW v3.02 | OPEN (PENDING). Recorded as `<PENDING SHA>`. | PK → chat | Supply SHA; small reconciliation patch. |
| **cc-0016 Stage D — /operations evidence display** | dashboard `9082beb`; CCB VISUAL PASS; mobile-verified v3.02 | RECORDED v3.00 | **CLOSED/PASS** | n/a (recorded) | n/a |
| **cc-0016 evidence capture/display path** | A→B→C→D complete; mobile-verified | RECORDED v3.00/v3.02 | **COMPLETE through Stage D** | n/a (recorded) | n/a |
| **cc-0016 Stage B — FAB evidence upload/read UX** | dashboard `36fe6ad`; V-A5 PASS | RECORDED v2.99 | **CLOSED/PASS** | n/a (recorded) | n/a |
| **cc-0016 Stage E — lifecycle cleanup** | Cleanup automation + dry-run report | FUTURE — separately approved only | NOT STARTED. CONSTRAINT 2 binds. Option A = scoping/dry-run design only. | PK → chat | Separate approval + dry-run before any destructive run. |
| **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** | Reframed v2.94; ready reset; convention patched. Preserved open v3.02. | **P2 carry, core rank 1** | OPEN. Closure waits on PK observation of next 16:00 UTC fire. | chat → PK | Observe next fire. |
| **3 no-fire scheduler days — `nightly-health-check-v1`** | 2026-05-16, 2026-05-18, 2026-05-19 | **P3 secondary follow-up** | OPEN. | chat → PK | Read-only probe. |
| **Wave 0f scoping** | Brief-authoring only; opportunistic during Gate 11 | **P3, core rank 3** | NOT STARTED. | chat → PK | When PK directs. |
| **Platform Reconciliation View brief** | Deferred per D-FR-RECON-001 §7.D | **P2 carry, core rank 4** | NOT STARTED. | PK → chat | When PK directs. |
| **5-row close-the-loop batch / Pre-sales / `purge_test_case` helper extension** | Close-the-loop UPDATEs + Pre-sales 3-clock + helper coverage gap | **P2/P3 carry, core rank 5** | OPEN. | chat → PK | When PK directs. |
| **cc-0015 friction-pool-view brief** (Wave 7) | Authored PENDING_EXECUTION | P2 (gated on Gate 11 closing 2026-05-26) | DRAFTED `9a5dc155`. Do NOT start before gate closes. | chat → PK (Wave 7) | When window closes 2026-05-26. |
| **Q-005** | If open — non-blocking | P3 carry (status unverified this session) | Preserved untouched per directive. | chat → PK | Reconcile status if expected to track here. |
| **Music library activation** | video-worker v3.0.0 env-var gated | P2 carry | PENDING PK. | PK + chat | Bucket + tracks + env + smoke. |
| **vchecks.md V-B4 doc patch** | Correct V-B4 to 12-param signature | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **cc-0017c v1.2 doc patch candidate** | Date + 3 D-01 refs + V-B4 signature | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | P2 carry | OBSERVED. | chat → PK | Verify + dry-run + re-enable. |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P2 carry | LOGGED. | chat → PK | Audit m.post_draft. |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 carry | OPEN. | PK | When PK directs. |
| **Backend/shared-metrics refactor** | Deeper scope behind v2.95 count mismatch | DEFERRED carry | OPEN. Not actively ranked. | n/a | When separately directed. |
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (18+ occurrences v3.02; STRONG)** | Re-applied at sync close v3.02. | chat → next lesson cycle | Promote. |
| **L-v2.85-e** | push_files length budget — split-commit mitigation | **P3 (PROMOTION-CONFIRMED v2.88; 14th consecutive v3.02)** | Atomic single-commit close v3.02. | chat → next lesson cycle | **PROMOTE.** |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | P3 (4 occurrences; not re-exercised v3.02) | Promotion-eligible. | chat → next lesson cycle | Promote. |
| **L-v3.02-a (NEW)** | Mobile breakpoint verification after primary operator-surface change | P3 (1 occurrence v3.02) | Watcher. | chat → next session | Promote after one more occurrence. |
| **L62 reinforcement** | Type-B vs Type-C D-01 handling | P3 (strongly reinforced via cc-0016 6-fire series) | Both Stages converged via Path A; no state-capture override. | chat → next lesson cycle | Strong empirical record. |
| **L-v2.88-a** | Identical PK-directive loop watcher | P3 (watcher CLOSED for cc-0016; 2 prior occurrences carry) | No identical-loop across 7 cc-0016 fires. | chat → next lesson cycle | Pair-promote with L-v2.85-e if recurs. |
| **L-v2.90-a-f** | V-D fixture / arity DROP / etc. | P3 (not re-exercised v3.02) | Watchers. | chat → next session | Watcher. |
| **L-v2.78-a / L-v2.81-a / L47 / L-v2.84-a-d / L-v2.85-b/c/d / L-v2.86-a-e / L-v2.88-b/c/d / L-v2.89-a** | Various candidates | P3 carry | Unchanged from v3.00. | chat → next session/lesson cycle | Various. |
| **Other carries** | Minor doc patches (cc-0010A/0011/0012) / F-K-SCHEMA-REGISTRY-R-STALE / AI cost view / Publisher latent config / M8b / 94-row cohort / F-CRON-AUTO-APPROVER-SECRET-INLINE / morning-inbox-sweep-v1 / 22 escalated m.chatgpt_review rows / Memory cap 19/30 / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged from v3.00. | various | various |

**Closed v3.02:**
- **Mobile/narrow viewport verification** → CLOSED/PASS (CCB 306×498 DPR2).

**Spawned v3.02:**
- **Mobile-fix commit SHA backfill** — P3 admin carry (SHA not supplied in directive).

**Closed earlier:** v3.00 cc-0016 Stage D + evidence path; v2.99 cc-0016 Stage B + V-A5; v2.98 cc-0016 Stage C apply; v2.97 cc-0016 Stage A apply; v2.96 dashboard slices 4A–4B + top alert bar reconciliation; v2.95 dashboard slices 1–3 + PHASES streak + "Stop Claude"; v2.93 Reconciliation daily cadence diagnostic; v2.92 Health_check V-C3; v2.91 cc-0017e v1.1 doc patch; v2.90 cc-0017e apply; v2.85 cc-0017c apply; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.77 cc-0014 archived.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v3.00.

---

## 📌 Backlog

**v3.02 state changes:**
- **Mobile/narrow viewport verification CLOSED/PASS v3.02** (CCB 306×498 DPR2). Removed from open P3 carries.
- **Mobile-fix commit SHA backfill** added as P3 admin carry (PENDING; not supplied in directive).
- **L-v3.02-a NEW lesson candidate** registered.
- cc-0016 Stage A/B/C/D all closed; evidence path complete + mobile-verified; only Stage E remains (future/separately-approved).
- Cowork lifecycle gating WARN unchanged at core rank 1.
- cc-0015 / PRV unchanged — preserved open. Q-005 (if open) preserved non-blocking.
- T-MCP-02 cum ~92 unchanged.
- State-capture exceptions cum 1 unchanged.
- L-v2.85-e 14th consecutive; L-v2.83-a 18+ STRONG; L62 strongly reinforced; L-v2.88-a watcher closed for cc-0016; L-v3.02-a new.
- **No decisions.md change v3.02.**

---

## 🧊 Frozen / Deferred

Unchanged from v3.00. **cc-0016 Stage E lifecycle cleanup** — future/separately-approved-only. **Backend/shared-metrics refactor** — deferred carry.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e + L-v2.88-a-d + L-v2.89-a + L-v2.90-a-f + L-v3.02-a candidates carried per v3.02.

- **L40 / L41 / L46 / L58**: L41 lightly reinforced v3.02 (clobber-mitigation); others not exercised.
- **L62**: strongly reinforced via cc-0016 6-fire D-01 series. Not newly exercised v3.02 (no D-01).
- **L-v2.83-a**: **18+ occurrences v3.02**. STRONG CANDIDATE confirmed.
- **L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v3.02).
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88; 14th consecutive occurrence v3.02**.
- **L-v2.88-a**: watcher CLOSED for cc-0016. 2 prior occurrences carry.
- **L-v3.02-a (NEW)**: mobile breakpoint verification after primary operator-surface change. 1 occurrence; watcher.
- **L-v2.90-a-f**: not empirically re-exercised v3.02. Watchers.
- Other lessons unchanged from v3.00.

**L-v2.85-e + L-v2.85-a + L-v2.83-a remain highest-priority promotions at next lesson cycle. L62 has a strong 6-fire empirical record. L-v2.88-a watcher closed for cc-0016. L-v3.02-a new watcher.**

---

## v3.02 honest limitations

- All v2.31–v3.00 limitations apply.
- **Mobile-fix commit SHA not supplied in directive** — recorded as PENDING; not fabricated. Backfill next session.
- **Cross-repo recording only** — chat did not fetch dashboard repo HEAD or independently verify the mobile fix. Recorded per directive payload.
- **"CCB MOBILE PASS" = one device profile** (Nexus 5, 306×498, DPR2), not a cross-device matrix. Other narrow widths (tablet portrait, very small foldables) not separately asserted.
- **Q-005** not in chat's loaded carry set this session; preserved untouched per directive but existence/status unverified here.
- **Smoke artefacts retained** (2 events + 1 storage object); NOT cleaned up.
- **friction.* schema state assumed unchanged** from Stage C apply; not re-probed.
- **CONSTRAINT 1 operator-authorisation negative-path test gap** (flagged v2.99) carries forward; mobile fix is layout-only and does not affect it.
- **T-MCP-02 cumulative ~92 unchanged** v3.02 (0 D-01 fires). State-capture exceptions cumulative 1.
- **Gate 11 day count not refreshed v3.02** (window closes 2026-05-26; ~5 days out).
- **Memory cap 19/30** unchanged.
- **Production mutations v3.02: 0.** Net schema deltas: 0. Supabase mutations: 0. apply_migration: 0. EF deploys: 0. Application code edits (either repo): 0.
- **No decisions.md change. No Wave 0f work started. No state-capture override. No Stage E work started. No cc-0015 start. No PRV closure.**

---

## Changelog

- v1.0–v2.96: per commit history.
- v2.97 (2026-05-20 Sydney): cc-0016 Stage A apply (session file verified in v2.99.1 at `2db1656`).
- v2.98 (2026-05-20 Sydney): cc-0016 Stage C apply (session file verified in v2.99.1 at `2db1656`).
- v2.99 (2026-05-20 Sydney): cc-0016 Stage B FAB upload/read UX validated + V-A5 PASS. Stage B CLOSED/PASS.
- v2.99.1 (2026-05-21 Sydney): reconciliation at `2db1656` — ancestry clean; v2.97 + v2.98 session files confirmed to exist; placeholder rows patched; Stage A/C facts confirmed.
- v3.00 (2026-05-21 Sydney): cc-0016 Stage D /operations evidence display VISUAL PASS. Stage D CLOSED/PASS; evidence path COMPLETE A→B→C→D.
- v3.00.1 (2026-05-21 Sydney): reconciliation patch — corrected stale v2.97/v2.98 placeholder wording across session file (`e052962`) + sync_state (`6ab1149`) + action_list (`a98acaf`).
- **v3.02 (2026-05-21 Sydney, Dashboard mobile/narrow viewport verification CLOSED/PASS):**
  - Build arc: read current HEAD content (held from v3.00.1 patch; confirmed == HEAD per L41 mitigation) → edit action_list + sync_state + write per-session file → atomic single-commit `push_files` (3 files).
  - Mobile/narrow viewport verification CLOSED/PASS — CCB tested at 306×498 Nexus 5 Android Chrome UA, DPR 2 → MOBILE PASS. Removed from open P3 carries.
  - Mobile fix resolved: sidebar collapses to hamburger/drawer; desktop fixed rail no longer consumes mobile width; /operations rows readable; evidence paperclip badge visible; expanded Evidence section usable; triage guardrail usable; FAB usable; Roadmap readable; "Stop Claude" overlay remains external Claude Browser tooling.
  - **Mobile-fix commit SHA NOT supplied in directive** — recorded as PENDING; not fabricated; backfill next session.
  - NEW lesson candidate L-v3.02-a: mobile breakpoint verification after primary operator-surface change.
  - cc-0015 Gate 11 watch / cc-0016 Stage E future/separately-approved / PRV deferred / Q-005 (if open) PRESERVED.
  - 0 dashboard edits; 0 Supabase mutations; 0 Stage E start; 0 cleanup; 0 cc-0015 start before Gate 11; 0 PRV closure; 0 smoke-object/test-event deletion; 0 D-01 fires; 0 memory edits; 0 decisions.md edits; 0 SHA fabrication.
  - L-v2.85-e re-applied 14th consecutive. L-v2.83-a 18+ STRONG. L41 clobber-mitigation applied. L-v3.02-a registered.
  - T-MCP-02 cum ~92 unchanged. State-capture exceptions cum 1 unchanged.
  - Closure budget: ~0.5h v3.02. Trailing-14-day ~37.5h.
