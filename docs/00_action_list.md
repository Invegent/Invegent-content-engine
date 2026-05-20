# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-20 Sydney (**v2.99 — cc-0016 Stage B FAB upload/read UX validated + V-A5 PASS**. Dashboard Stage B shipped at `36fe6ad575a125870c9ac7eeb25a0da605a9c7d3` (files: `actions/emit-friction.ts`, `components/friction-form.tsx`; typecheck PASS). CCB verified FAB picker visible / no-attachment + one-attachment submit / max-3 enforced / GIF rejected / >5MB rejected. Chat/backend read-only confirmed no-attachment event `attachments=[]` / attachment event with one attachment / storage object exists / DB metadata matches. CCD read-back confirmed signed URL HTTP 200 / image/png / 861 bytes / PNG intact. **V-A5 now empirically PASS** (was DEFERRED across Stage A + Stage C). **cc-0016 Stage B CLOSED/PASS.** Stage A closed, Stage C closed, Stage B closed. Stage D (/operations evidence display) NEXT. Stage E future/separately-approved-only. Cowork lifecycle WARN / cc-0015 / PRV / Stage E UNCHANGED (open). 0 content-engine production code changes / 0 Supabase schema/function mutations / 0 Supabase mutations / 0 lifecycle cleanup / 0 retroactive attachment editing / 0 fn_set_event_attachments / 0 /operations evidence display / 0 Stage D/E work / 0 Invegent-dashboard edits / 0 smoke-object deletion / 0 D-01 fires / 0 memory edits / 0 decisions.md edits.) **Today/Next 5 core ranks v2.99**: Cowork lifecycle WARN → rank 1; **cc-0016 Stage D /operations evidence display → rank 2 (NEW; replaces closed Stage A/C)**; Wave 0f scoping → rank 3; PRV → rank 4 (deferred); close-the-loop → rank 5.

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v2.96.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + **L-v2.83-a (STRONG; 16+ v2.99)** + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL; 4 occurrences) + L-v2.85-b/c/d + **L-v2.85-e PROMOTION-CONFIRMED 12th consecutive v2.99** + 5 L-v2.86 candidates + **L-v2.88-a (watcher CLOSED for cc-0016; 2 prior occurrences carry for other contexts)** + L-v2.88-b/c/d + L-v2.89-a + **L-v2.90-a through L-v2.90-f** + **L62 strongly reinforced via cc-0016 6-fire D-01 series**. **D-IOL-001 (v2.77)** + **D-CC-0017B-Q1** carried.

**v2.99 ADDITIONS:**

- **cc-0016 Stage B RECORDED CLOSED/PASS v2.99.** FAB evidence upload/read UX shipped in Invegent-dashboard at `36fe6ad575a125870c9ac7eeb25a0da605a9c7d3` (files: `actions/emit-friction.ts`, `components/friction-form.tsx`; typecheck PASS). Cross-repo recording; no dashboard edits this session.
  - **CCB frontend verified:** FAB picker visible; no-attachment submit; one-attachment submit; max 3 enforced; GIF rejected; >5MB rejected.
  - **Chat/backend read-only confirmed:** no-attachment event `attachments=[]`; attachment event with one attachment; storage object exists in friction-evidence; DB metadata matches object.
  - **CCD read-back confirmed:** signed URL HTTP 200; Content-Type image/png; Content-Length 861 bytes; PNG bytes intact.
  - **V-A5 (storage round-trip) now empirically PASS** — was DEFERRED across Stage A (3 D-01 fires) + Stage C (3 D-01 fires).
  - **Smoke artefacts retained as V-A5 evidence (DO NOT DELETE):** no-attachment event `2120b2f7-219f-4d0d-be56-512d81430873`; attachment event `75f0c981-1180-4047-9aa3-f725bec6eb9b`; storage object `friction-evidence/9e314151-be65-434e-8588-c913012f6591/0_va5-smoke.png` (861 bytes, image/png).

- **cc-0016 stage ledger v2.99:** Stage A CLOSED (v2.97-assumed); Stage C CLOSED (v2.98-assumed); **Stage B CLOSED/PASS (v2.99)**; Stage D NEXT (/operations evidence display); Stage E FUTURE — separately approved only.

- **Next ranked action: cc-0016 Stage D — /operations evidence display/thumbnails.** Goal: make attached evidence visible from the operator surface. Constraints: Stage D MUST NOT implement lifecycle cleanup; MUST NOT add retroactive attachment editing; MUST NOT change upload flow unless required. Likely read-side only (existing `case_with_attachment_count` view + signed URLs); if a new read RPC is needed, D-01 required.

- **Items explicitly NOT closed v2.99 (per directive):**
  - Cowork brief lifecycle gating WARN (`nightly-health-check-v1`) — core rank 1; preserved open.
  - cc-0015 (Wave 7) — DRAFTED at `9a5dc155`; gated on Gate 11 closing 2026-05-26.
  - PRV brief authoring — deferred per D-FR-RECON-001 §7.D.
  - cc-0016 Stage E lifecycle cleanup — future/separately-approved-only.
  - Mobile/narrow viewport verification — P3 carry.
  - Backend/shared-metrics refactor — deferred carry; not actively ranked.

- **Hard stops respected v2.99:**
  - 0 content-engine production code changes for Stage B
  - 0 Supabase schema/function mutations in Stage B
  - 0 Supabase mutations this session (read-only verification only)
  - 0 lifecycle cleanup
  - 0 retroactive attachment editing
  - 0 `fn_set_event_attachments` RPC
  - 0 `/operations` evidence display (Stage D — not started)
  - 0 Stage D/E work started
  - 0 Invegent-dashboard edits this session
  - 0 deletion of the V-A5 smoke object
  - 0 cleanup of test events
  - 0 closure of Cowork WARN / cc-0015 / PRV / Stage E
  - 0 D-01 fires this session
  - 0 memory edits / 0 decisions.md edits

- **Sync close mechanics v2.99 (atomic single-commit per L-v2.85-e baseline — 12th consecutive occurrence):**
  1. Per-session detail file `docs/runtime/sessions/2026-05-20-v2.99-cc0016-stage-b-fab-upload-validated.md`.
  2. sync_state + action_list + session file committed in **one atomic push**.
  L-v2.89-a fallback (1+1+1) ready but not invoked v2.99.

- **L-v2.85-e re-applied 12th consecutive occurrence**; promotion-confirmed v2.88 carries forward.
- **L-v2.83-a re-applied** at sync close. Cumulative **16+ STRONG**.
- **L62 strongly reinforced** via cc-0016 6-fire D-01 series (Stage A 3 fires + Stage C 3 fires) — both Stages converged via Path A satisfy-then-re-fire with NO state-capture override.
- **L-v2.88-a watcher CLOSED for cc-0016** — no identical-loop pattern across 7 cumulative fires; each re-fire showed genuine progress.
- **L40 / L41 / L46 / L58 NOT exercised v2.99** (read-only session; no DB mutation / no DDL / no apply).
- **L-v2.90-a-f NOT empirically re-exercised v2.99** (Stage C apply at v2.98).

- **No new L-v2.99-X candidates surfaced.**

- **Closed Active rows v2.99:** cc-0016 Stage B → CLOSED/PASS; V-A5 → PASS.
- **Promoted Active rows v2.99:** cc-0016 Stage D promoted to core rank 2 (replaces closed Stage A/C placeholder).
- **NO decisions.md change v2.99.**
- **Production mutations v2.99: 0. D-01 fires v2.99: 0. T-MCP-02 cum: ~92 unchanged. State-capture exceptions: 1 unchanged.**

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | 0 (recon diagnostic CLOSED v2.93; PHASES streak CLOSED v2.95; top alert bar CLOSED v2.96; cc-0016 Stage B CLOSED v2.99) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~36h (cumulative v2.83–v2.99) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.99 cycle: ~1h total** (cross-repo + cross-session state recording; read-only verification recording; sync close drafting). 0 schema mutations. 0 D-01 fires. 1 atomic git commit. **State-capture exception count v2.99: 0** (cumulative 1).

---

## ⭐ Today / Next 5 (core ICE ranks)

> Last rebuilt: 2026-05-20 Sydney (v2.99 — cc-0016 Stage D promoted to rank 2 after Stage A/B/C closure).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** | **P2 carry, rank 1 (unchanged)** | Ready reset complete v2.94 + convention patched. WARN explicitly NOT closed. | chat → PK | Observe next 16:00 UTC fire under new convention. |
| 2 | **cc-0016 Stage D — /operations evidence display/thumbnails** | **P2, rank 2 (NEW v2.99)** | Stage A/B/C all closed; V-A5 PASS. Stage D makes attached evidence visible from operator surface. Read-side likely (existing view + signed URLs). | PK → chat | Author Stage D brief. Must NOT add lifecycle cleanup / retroactive editing / upload-flow changes. If new read RPC needed, D-01 required. |
| 3 | **Wave 0f scoping** | **P3 brief-authoring only, opportunistic during Gate 11 window** | Brief-authoring is non-mutating. Candidates: items B/E/F/G from cc-0017e + `purge_test_case` helper case_history extension (L-v2.90-d). | chat → PK | When PK directs (recommended during Gate 11 window 2026-05-19 → 2026-05-26). |
| 4 | **Platform Reconciliation View brief authoring** | **P2 carry, deferred per D-FR-RECON-001 §7.D** | Defer until corrected friction-register baseline accepted. | PK → chat | When PK directs. |
| 5 | **5-row close-the-loop batch sweep / Pre-sales criteria / `purge_test_case` helper case_history extension** | **P2/P3 carry** | Outstanding close-the-loop UPDATEs (Stage C 3 rows assumed resolved at v2.98 apply; net not recomputed v2.99). | chat → PK | When PK directs. |

## ⭐ Dashboard work (separately ranked v2.99)

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| D1 | **cc-0016 Stage D /operations evidence display** (= core rank 2) | P2 (NEW v2.99) | Active dashboard build after Stage B close. | PK → chat | Author Stage D brief. |
| D2 | **cc-0015 friction-pool-view UI** (slice 5) | P2 carry | Backend already shipped. Gated on Gate 11 closing 2026-05-26. | PK → chat (Wave 7) | When window closes 2026-05-26. |
| D3 | **Platform Reconciliation View surface** (slice 7) | P2 carry | PRV brief deferred per D-FR-RECON-001 §7.D. | PK → chat | When PRV brief authored + PK-accepted. |
| D4 | **Mobile/narrow viewport verification** | P3 carry | Browser runtime overrode `resize_window`. Not blocking. | CCD or PK | Real-device verification. |

**Deferred carry (not actively ranked):** Backend/shared-metrics refactor (deeper scope behind v2.95 count mismatch).

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Secondary follow-up (P3)**: 3 no-fire scheduler days for `nightly-health-check-v1` — 2026-05-16, 2026-05-18, 2026-05-19.

**Passive observation v2.99**: Cron 82-86 firing normally. friction.* state assumed unchanged from Stage C apply (not re-probed). **Dashboard `dashboard.invegent.com`**: slices 1–3 + 4A–4B + cc-0016 Stage B (FAB evidence upload UX) all shipped + verified. **V-A5 smoke artefacts retained** — do not delete.

---

## 🟢 cc-0016 friction-capture-evidence — STATUS BLOCK (NEW/UPDATED v2.99)

**Status v2.99: Stage A CLOSED + Stage C CLOSED + Stage B CLOSED/PASS. V-A5 PASS. Stage D NEXT. Stage E future/separately-approved-only.**

**Stage ledger:**

| Stage | Scope | Status | Reference |
|---|---|---|---|
| A | bucket + attachments column + 2 CHECK + index + view + GRANT | CLOSED | D-01 fires `6f2b8b1a` / `f573e684` / `9eb35144` (APPROVED); applied v2.97-assumed |
| C | DROP+CREATE emit_event 13-arg + fn_emit_manual_event 8-arg; shape validation; cc-0017b preserved | CLOSED | D-01 fires `56e65bb2` / `dbabb576` / `358c6fdd` (APPROVED); applied v2.98-assumed |
| **B** | **FAB evidence upload/read UX** | **CLOSED/PASS v2.99** | dashboard `36fe6ad`; V-A5 PASS |
| D | /operations evidence display / thumbnails | **NEXT** | core rank 2 v2.99 |
| E | lifecycle cleanup automation + dry-run report | FUTURE — separately approved only | Stage A CONSTRAINT 2 |

**V-A5 evidence (DO NOT DELETE):**
- No-attachment smoke event `2120b2f7-219f-4d0d-be56-512d81430873` (attachments=[]).
- Attachment smoke event `75f0c981-1180-4047-9aa3-f725bec6eb9b` (one attachment).
- Storage object `friction-evidence/9e314151-be65-434e-8588-c913012f6591/0_va5-smoke.png` (861 bytes, image/png; signed-URL read-back PASS).

**PK forward constraints carried:**
- CONSTRAINT 1 (operator-authorisation) — Stage B closure event. CCB verified the FAB flow; negative-path operator-auth test not explicitly asserted in directive (single-operator posture; flagged limitation).
- CONSTRAINT 2 (no lifecycle cleanup / destructive deletion) — binds Stage E; unchanged.

**Stage D constraints (per directive):** no lifecycle cleanup; no retroactive attachment editing; no upload-flow changes unless required.

---

## 🟢 Dashboard slices — STATUS BLOCK (UPDATED v2.99)

**Status v2.99: Slices 1–3 + 4A–4B RECORDED (v2.95+v2.96). cc-0016 Stage B FAB evidence upload UX CLOSED/PASS (v2.99). Cross-repo recording only; no dashboard edits this session.**

- Slice 1 `af60953` / Slice 2 `de4501b` + `37008e5` / Slice 3 `991a92b` — VISUAL PASS (v2.95).
- Slice 4A `cd02402` / Slice 4B `f5a980f` — VISUAL PASS (v2.96).
- **cc-0016 Stage B at `36fe6ad`** (files: `actions/emit-friction.ts`, `components/friction-form.tsx`) — CLOSED/PASS (v2.99); V-A5 PASS.

**Remaining dashboard work:** Stage D /operations evidence display (D1 / core rank 2); cc-0015 UI (D2, gated); PRV (D3, deferred); mobile viewport (D4, P3).

---

## 🟢 Friction Register Consolidation Plan v1 — STATUS BLOCK (v2.99 unchanged)

Wave 0 + 0d + 0e COMPLETE. Gates 10+12+13 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE. Day count not refreshed v2.99. Wave 0f scoping rank 3 carry. **cc-0016 Wave 8 now Stage A/B/C closed; Stage D next; Stage E future.**

---

## 🟢 Cowork brief `nightly-health-check-v1` — STATUS BLOCK (v2.99 unchanged)

FROZEN at v3.0. Signal-production contract empirically validated v2.92 (V-C3 CLOSED-PASS). Lifecycle gating WARN unchanged — core rank 1; directive explicitly preserved as open v2.99. Brief reset to `ready` v2.94; convention patched v2.94. Closure waits on PK observation of next 16:00 UTC fire.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v2.99)

**L41**: no new exercises v2.99 (read-only session).
**L40 / L46 / L58**: not exercised v2.99.
**L62**: strongly reinforced via cc-0016 6-fire D-01 series; both Stages converged via Path A with no state-capture override.
**L-v2.83-a**: **16+ occurrences v2.99**. STRONG CANDIDATE confirmed.
**L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged).
**L-v2.85-e**: re-applied v2.99 — **12th consecutive occurrence**. PROMOTION-CONFIRMED v2.88 carries forward.
**L-v2.88-a**: watcher CLOSED for cc-0016 (no identical-loop across 7 fires). 2 prior occurrences (v2.88 + v2.91) carry for other contexts.
**L-v2.90-a-f**: not empirically re-exercised v2.99. Watchers.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated. Day count not refreshed v2.99.
- **Cowork `nightly-health-check-v1` lifecycle gating WARN** — core rank 1 carry; preserved open v2.99.
- **cc-0016 Stage B CLOSED/PASS v2.99; V-A5 PASS.** Stage D next.
- No new v2.99 calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v2.99: **0 D-01 fires.** T-MCP-02 cum **~92 unchanged**. Across the cc-0016 series (Stage A 3 fires + Stage C 3 fires) T-MCP-02 burn was 6 fires; both Stages reached clean APPROVED via Path A. L62 strongly reinforced. State-capture exceptions v2.99: 0 (cum 1). Close-the-loop UPDATEs v2.99: 0 (Stage C 3 rows assumed resolved at v2.98 apply).

---

## 🤖 Cowork automation (D182)

**v2.99 update:** Cron 82/83/85/86 firing normally. Cowork brief lifecycle gating WARN — core rank 1 carry; preserved open v2.99.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0016 Stage B — FAB evidence upload/read UX** | dashboard `36fe6ad`; CCB + chat backend + CCD read-back verified; V-A5 PASS | RECORDED v2.99 | **CLOSED/PASS** | n/a (recorded) | n/a |
| **cc-0016 V-A5 storage round-trip** | signed URL HTTP 200 / image/png / 861 bytes / PNG intact | RECORDED v2.99 | **PASS** | n/a (recorded) | n/a |
| **cc-0016 Stage D — /operations evidence display** | Make attached evidence visible from operator surface; thumbnails | **P2, core rank 2 (NEW v2.99)** | NOT STARTED. Read-side likely. | PK → chat | Author Stage D brief; no cleanup / no retroactive editing / no upload-flow change. |
| **cc-0016 Stage E — lifecycle cleanup** | Cleanup automation + dry-run report | FUTURE — separately approved only | NOT STARTED. CONSTRAINT 2 binds. | PK → chat | Separate approval + dry-run required. |
| **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** | Reframed v2.94; ready reset; convention patched. Preserved open v2.99. | **P2 carry, core rank 1** | OPEN. Closure waits on PK observation of next 16:00 UTC fire. | chat → PK | Observe next fire. |
| **3 no-fire scheduler days — `nightly-health-check-v1`** | 2026-05-16, 2026-05-18, 2026-05-19 | **P3 secondary follow-up** | OPEN. | chat → PK | Read-only probe. |
| **Wave 0f scoping** | Brief-authoring only; opportunistic during Gate 11 | **P3, core rank 3** | NOT STARTED. | chat → PK | When PK directs. |
| **Platform Reconciliation View brief** | Deferred per D-FR-RECON-001 §7.D | **P2 carry, core rank 4** | NOT STARTED. | PK → chat | When PK directs. |
| **5-row close-the-loop batch / Pre-sales / `purge_test_case` helper extension** | Close-the-loop UPDATEs + Pre-sales 3-clock + helper coverage gap | **P2/P3 carry, core rank 5** | OPEN. | chat → PK | When PK directs. |
| **cc-0015 friction-pool-view brief** (Wave 7) | Authored PENDING_EXECUTION | P2 (gated on Gate 11 closing 2026-05-26) | DRAFTED `9a5dc155`. | chat → PK (Wave 7) | When window closes 2026-05-26. |
| **Music library activation** | video-worker v3.0.0 env-var gated | P2 carry | PENDING PK. | PK + chat | Bucket + tracks + env + smoke. |
| **vchecks.md V-B4 doc patch** | Correct V-B4 to 12-param signature | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **cc-0017c v1.2 doc patch candidate** | Date + 3 D-01 refs + V-B4 signature | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | P2 carry | OBSERVED. | chat → PK | Verify + dry-run + re-enable. |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P2 carry | LOGGED. | chat → PK | Audit m.post_draft. |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 carry | OPEN. | PK | When PK directs. |
| **Backend/shared-metrics refactor** | Deeper scope behind v2.95 count mismatch | DEFERRED carry | OPEN. Not actively ranked. | n/a | When separately directed. |
| **Mobile/narrow viewport verification** | Browser runtime overrode `resize_window` | P3 carry | OPEN. Not blocking. | CCD or PK | Real-device verification. |
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (16+ occurrences v2.99; STRONG)** | Re-applied at sync close v2.99. | chat → next lesson cycle | Promote. |
| **L-v2.85-e** | push_files length budget — split-commit mitigation | **P3 (PROMOTION-CONFIRMED v2.88; 12th consecutive v2.99)** | Atomic single-commit close v2.99. | chat → next lesson cycle | **PROMOTE.** |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | P3 (4 occurrences; not re-exercised v2.99) | Promotion-eligible. | chat → next lesson cycle | Promote. |
| **L62 reinforcement** | Type-B vs Type-C D-01 handling | P3 (strongly reinforced via cc-0016 6-fire series v2.99) | Both Stages converged via Path A; no state-capture override. | chat → next lesson cycle | Strong empirical record. |
| **L-v2.88-a** | Identical PK-directive loop watcher | P3 (watcher CLOSED for cc-0016; 2 prior occurrences carry) | No identical-loop across 7 cc-0016 fires. | chat → next lesson cycle | Pair-promote with L-v2.85-e if recurs elsewhere. |
| **L-v2.90-a-f** | V-D fixture / arity DROP / etc. | P3 (not re-exercised v2.99) | Watchers. | chat → next session | Watcher. |
| **L-v2.78-a / L-v2.81-a / L47 / L-v2.84-a-d / L-v2.85-b/c/d / L-v2.86-a-e / L-v2.88-b/c/d / L-v2.89-a** | Various candidates | P3 carry | Unchanged from v2.96. | chat → next session/lesson cycle | Various. |
| **Other carries** | Minor doc patches (cc-0010A/0011/0012) / F-K-SCHEMA-REGISTRY-R-STALE / AI cost view / Publisher latent config / M8b / 94-row cohort / F-CRON-AUTO-APPROVER-SECRET-INLINE / morning-inbox-sweep-v1 / 22 escalated m.chatgpt_review rows / Memory cap 19/30 / Dashboard mobile / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged from v2.96. | various | various |

**Closed v2.99:**
- **cc-0016 Stage B** → RECORDED-CLOSED/PASS (dashboard `36fe6ad`).
- **cc-0016 V-A5 storage round-trip** → PASS.

**Promoted v2.99:** cc-0016 Stage D → core rank 2 (replaces closed Stage A/C placeholder).

**Closed earlier:** v2.98 cc-0016 Stage C apply (assumed); v2.97 cc-0016 Stage A apply (assumed); v2.96 dashboard slices 4A–4B + top alert bar reconciliation; v2.95 dashboard slices 1–3 + PHASES streak + "Stop Claude"; v2.93 Reconciliation daily cadence diagnostic; v2.92 Health_check V-C3; v2.91 cc-0017e v1.1 doc patch; v2.90 cc-0017e apply; v2.85 cc-0017c apply; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.77 cc-0014 archived.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v2.96.

---

## 📌 Backlog

**v2.99 state changes:**
- **cc-0016 Stage B RECORDED CLOSED/PASS v2.99** (dashboard `36fe6ad`; V-A5 PASS).
- **cc-0016 Stage D** promoted to core rank 2 (next evidence step).
- **cc-0016 Stage E** carried as future/separately-approved-only.
- **V-A5 smoke artefacts** retained (2 events + 1 storage object) — do not delete.
- Cowork lifecycle gating WARN unchanged at core rank 1.
- cc-0015 / PRV unchanged — preserved open.
- T-MCP-02 cum ~92 unchanged.
- State-capture exceptions cum 1 unchanged.
- L-v2.85-e 12th consecutive; L-v2.83-a 16+ STRONG; L62 strongly reinforced; L-v2.88-a watcher closed for cc-0016.
- **No decisions.md change v2.99.**
- **Cross-session reconciliation flagged:** v2.97 + v2.98 session files not loaded in chat context; placeholders in index; reconcile next session.

---

## 🧊 Frozen / Deferred

Unchanged from v2.96. Plus: **cc-0016 Stage E lifecycle cleanup** — future/separately-approved-only. **Backend/shared-metrics refactor** — deferred carry.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e + L-v2.88-a-d + L-v2.89-a + L-v2.90-a-f candidates carried per v2.99.

- **L40 / L41 / L46 / L58**: not exercised v2.99 (read-only session).
- **L62**: strongly reinforced via cc-0016 6-fire D-01 series. Both Stages converged via Path A satisfy-then-re-fire with no state-capture override. Highest-confidence empirical record to date.
- **L-v2.83-a**: **16+ occurrences v2.99**. STRONG CANDIDATE confirmed.
- **L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v2.99).
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88; 12th consecutive occurrence v2.99**.
- **L-v2.88-a**: watcher CLOSED for cc-0016. 2 prior occurrences (v2.88 + v2.91) carry for other contexts.
- **L-v2.90-a-f**: not empirically re-exercised v2.99. Watchers.
- Other lessons unchanged from v2.96.

**L-v2.85-e + L-v2.85-a + L-v2.83-a remain highest-priority promotions at next lesson cycle. L62 now has a strong 6-fire empirical record. L-v2.88-a watcher closed for cc-0016.**

---

## v2.99 honest limitations

- All v2.31–v2.96 limitations apply.
- **Cross-session state recording.** v2.97 (Stage A apply close) + v2.98 (Stage C apply close) are NOT loaded in chat's current context window. Stage A/C treated as CLOSED per directive assertion, not independently re-verified this session. Session-index entries for v2.97 + v2.98 are placeholders — reconcile next session against actual session files (if they exist).
- **Cross-repo recording only** — chat did not fetch dashboard repo HEAD or independently verify commit `36fe6ad`. Recorded per directive payload.
- **"CCB verified" reflects operator browser walkthrough**, not automated test coverage.
- **CONSTRAINT 1 operator-authorisation negative-path test** (unauthorised operator blocked) is not explicitly asserted in the directive payload. Acceptable under single-operator posture (Stage A approval item 5) but recorded as a gap for any future multi-operator hardening.
- **Smoke artefacts retained** (2 events + 1 storage object) as V-A5 evidence; NOT to be cleaned up unless separately directed.
- **friction.* schema state assumed unchanged** from Stage C apply (10 tables / view / 19 functions net / 29 cases / 29 events / 8 case_history); not re-probed this session.
- **Outstanding close-the-loop UPDATEs**: 3 Stage C review rows (`56e65bb2`, `dbabb576`, `358c6fdd`) assumed resolved at Stage C apply (v2.98); net count not recomputed v2.99.
- **T-MCP-02 cumulative ~92 unchanged** v2.99 (0 D-01 fires). State-capture exceptions cumulative 1.
- **Gate 11 day count not refreshed v2.99.**
- **Memory cap 19/30** unchanged.
- **Production mutations v2.99: 0.** Net schema deltas: 0. Supabase mutations: 0. apply_migration: 0. EF deploys: 0. Application code edits (either repo): 0.
- **No decisions.md change. No Wave 0f work started. No mid-session compaction event. No state-capture override.**

---

## Changelog

- v1.0–v2.93: per commit history.
- v2.94 (2026-05-20 Sydney): Cowork brief lifecycle gating WARN REFRAMED + ready reset + convention patched.
- v2.95 (2026-05-20 Sydney): Dashboard slices 1–3 RECORDED. PHASES 46-streak deferral CLOSED.
- v2.96 (2026-05-20 Sydney): Dashboard slices 4A–4B RECORDED + top alert bar count reconciliation CLOSED for UI scope.
- *(v2.97 cc-0016 Stage A apply + v2.98 cc-0016 Stage C apply — recorded in their own sessions; not loaded in v2.99 chat context; reconcile next session.)*
- **v2.99 (2026-05-20 Sydney, cc-0016 Stage B FAB upload/read UX validated + V-A5 PASS):**
  - Build arc: pull main → read v2.96 close state → record Stage B directive payload (dashboard `36fe6ad`; CCB + chat backend + CCD read-back; V-A5 PASS; smoke artefacts) → edit action_list (header + ADDITIONS + Today/Next 5 + dashboard ranking + cc-0016 status block + Active + Backlog + Lessons + Limitations + Changelog) → edit sync_state (index + inline + Next priorities + do-not-touch + footer) → write per-session file → atomic single-commit `push_files` (3 files).
  - cc-0016 Stage B at dashboard `36fe6ad575a125870c9ac7eeb25a0da605a9c7d3` (files: `actions/emit-friction.ts`, `components/friction-form.tsx`; typecheck PASS) — CLOSED/PASS.
  - V-A5 (storage round-trip) empirically PASS (signed URL HTTP 200 / image/png / 861 bytes / PNG intact).
  - cc-0016 stage ledger: Stage A CLOSED / Stage C CLOSED / Stage B CLOSED/PASS / Stage D NEXT / Stage E future.
  - cc-0016 Stage D promoted to core rank 2.
  - Cowork lifecycle gating WARN / cc-0015 / PRV / Stage E UNCHANGED — preserved open.
  - 0 content-engine code changes; 0 Supabase mutations; 0 lifecycle cleanup; 0 retroactive editing; 0 fn_set_event_attachments; 0 /operations display; 0 Stage D/E; 0 dashboard edits; 0 smoke-object deletion; 0 D-01 fires; 0 memory edits; 0 decisions.md edits.
  - L-v2.85-e re-applied 12th consecutive. L-v2.83-a 16+ STRONG. L62 strongly reinforced via cc-0016 6-fire series. L-v2.88-a watcher CLOSED for cc-0016.
  - T-MCP-02 cum ~92 unchanged. State-capture exceptions cum 1 unchanged.
  - Closure budget: ~1h v2.99. Trailing-14-day ~36h.
  - Cross-session note: v2.97 + v2.98 not loaded in chat context; placeholders; reconcile next session.
