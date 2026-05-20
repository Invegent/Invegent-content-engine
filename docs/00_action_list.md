# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-21 Sydney (**v3.01 — Cowork brief lifecycle gating WARN CLOSED**. v2.94 lifecycle convention validated end-to-end on the first natural cycle: `nightly-health-check-v1` brief reset `ready → review_required → PK observed → ready` against the **2026-05-20T16:02:37Z** natural 16:00 UTC fire (`docs/runtime/runs/nightly-health-check-v1-2026-05-20T160237Z.md`; finished 16:08:30Z; 0 schema-drift fallbacks; all 14 SQL queries verbatim; dual-write fired — 5 P1 → `friction.event`, 2 P2 → `friction.emit_error` with `CONDITION-KEY-UNRESOLVED`). Brief frontmatter reset to `status: ready`; queue row updated with closure annotation (2026-05-20 history preserved verbatim). **WARN no longer at core rank 1.** New core rank 1 = **cc-0015 Gate 11 watch** (window closes 2026-05-26, ~5 days out). **Q-nightly-health-check-v1-005 remains OPEN as non-blocking function-contract drift** — handled as a future brief v3.1 / spec patch; NOT bundled into this closure. cc-0015 still gated. PRV deferred. cc-0016 Stage E future/separately-approved-only. Mobile/narrow viewport remains P3. 0 Supabase mutations / 0 SQL-RPC-view-function changes / 0 Invegent-dashboard touched / 0 nightly-health-check manual run / 0 Cowork forced execution / 0 Q-005 resolution / 0 Stage E started / 0 cleanup run / 0 cc-0015 advanced / 0 PRV closed / 0 retroactive editing / 0 fn_set_event_attachments / 0 lifecycle cleanup / 0 D-01 fires / 0 memory edits / 0 decisions.md edits. L-v2.85-e 14th consecutive. L-v2.83-a 18+ STRONG. **L-v2.94 convention lesson NEW candidate** (confirm across 2-3 more natural cycles before promotion-eligible). Files changed: 5 (brief frontmatter + queue row + session file + sync_state + action_list, atomic single commit).) **Today/Next 5 core ranks v3.01**: **cc-0015 Gate 11 watch → rank 1 (NEW; time-bound; closes 2026-05-26)**; cc-0016 Stage E scoping/dry-run design ONLY → rank 2 conditional (Option A); Wave 0f scoping → rank 3; PRV → rank 4 (deferred); close-the-loop → rank 5. Cowork lifecycle gating WARN no longer ranked (CLOSED v3.01).

*v3.00 (+v3.00.1 reconciliation patch) — cc-0016 Stage D /operations evidence display VISUAL PASS*. Dashboard Stage D shipped at `9082beb3e22df2e0f8d42924ed4e6f0a127c23ea` (files: `app/(dashboard)/operations/page.tsx`, `app/(dashboard)/operations/case-row.tsx`; typecheck PASS). CCB verified on production `/operations`: loads with recent 50 cases; V-A5 smoke case visible as "cc-0016 Stage B attachment smoke"; collapsed row purple paperclip badge 📎1; expanded row "Evidence (1)"; thumbnail renders; caption `va5-smoke.png · 861B · 10h ago`; thumbnail opens via signed URL `friction-evidence/9e314151-.../0_va5-smoke.png`; PNG in new tab `0_va5-smoke.png (64×64)`; unattached case renders normally; triage guardrail intact. **cc-0016 Stage D CLOSED/PASS.** cc-0016 evidence capture/display path COMPLETE through Stage D (A→B→C→D). Stage E future/separately-approved-only — do NOT start automatically. Cowork lifecycle WARN / cc-0015 / PRV / Stage E UNCHANGED (open). 0 Supabase mutations / 0 SQL-RPC-view-function changes / 0 lifecycle cleanup / 0 retroactive attachment editing / 0 upload-flow changes / 0 triage mutation during CCB verification / 0 unrelated dashboard mutations / 0 Invegent-dashboard edits / 0 smoke deletion / 0 D-01 fires / 0 memory edits / 0 decisions.md edits. **v3.00.1 reconciliation patch:** stale v2.97/v2.98 placeholder note corrected — reconciled in v2.99.1 at `2db1656`.) **Today/Next 5 core ranks v3.00**: Cowork lifecycle WARN → rank 1; **cc-0016 Stage E scoping/dry-run design ONLY → rank 2 conditional (Option A; replaced if PK picks Option B/C)**; Wave 0f scoping → rank 3; PRV → rank 4 (deferred); close-the-loop → rank 5.

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v3.00.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + **L-v2.83-a (STRONG; 18+ v3.01)** + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL; 4 occurrences) + L-v2.85-b/c/d + **L-v2.85-e PROMOTION-CONFIRMED 14th consecutive v3.01** + 5 L-v2.86 candidates + **L-v2.88-a (watcher CLOSED for cc-0016; 2 prior occurrences carry)** + L-v2.88-b/c/d + L-v2.89-a + **L-v2.90-a through L-v2.90-f** + **L62 strongly reinforced via cc-0016 6-fire D-01 series** + **L-v2.94 convention NEW candidate (validated against 2026-05-20T160237Z natural fire; confirm across 2-3 more cycles before promotion-eligible)**. **D-IOL-001 (v2.77)** + **D-CC-0017B-Q1** carried.

**v3.01 ADDITIONS:**

- **Cowork brief lifecycle gating WARN CLOSED v3.01.** v2.94 lifecycle convention validated end-to-end against the 2026-05-20T16:02:37Z natural 16:00 UTC fire as convention-cycle-1 evidence:
  - Run state: `docs/runtime/runs/nightly-health-check-v1-2026-05-20T160237Z.md`. Finished 16:08:30Z (~6 min). 0 schema-drift fallbacks. All 14 SQL queries verbatim. Markdown `docs/audit/health/2026-05-20.md` (canonical per brief §12.4).
  - Dual-write contract: `friction.fn_emit_health_check_findings(…)` returned `{success_count: 5, failure_count: 0, skipped_count: 2}`. **5 P1 → `friction.event`** (visible on `/operations` post cc-0016 Stage D); **2 P2 → `friction.emit_error`** (`error_code=CONDITION-KEY-UNRESOLVED`; function pattern matcher only recognises `true-stuck-{platform}-{slug}`).
  - Brief lifecycle: `ready → review_required → PK observed → ready` ✓.
  - 0 Cowork forbidden-action violations.

- **`docs/briefs/nightly-health-check-v1.md`** frontmatter reset: `status: review_required → status: ready`. brief_version unchanged (still v3.0). No other edits.

- **`docs/briefs/queue.md`** Active row for `nightly-health-check-v1`: `status: review_required → ready`; closure annotation prepended; prior 2026-05-20 run history preserved verbatim.

- **`Q-nightly-health-check-v1-005` remains OPEN as non-blocking carry.** Function-contract drift: brief §12.3 anticipated `{success_count, failure_count, run_id}` but function returns `+ skipped_count` and routes pattern-mismatches to `friction.emit_error` rather than per-row INSERT failure. Will be handled as a future brief v3.1 patch / `friction.fn_emit_health_check_findings` spec patch. **Explicitly NOT bundled into this closure per directive item 4.** Does NOT block the brief from running the next scheduled cycle.

- **Core ranks rebuilt v3.01:**
  - **Rank 1 (NEW): cc-0015 Gate 11 watch** — time-bound; window closes 2026-05-26 (~5 days out). Passive observation; when gate clears, cc-0015 friction-pool-view UI (Wave 7) unblocks as the leading dashboard build.
  - Rank 2 (conditional): cc-0016 Stage E scoping/dry-run design ONLY (Option A from v3.00 PK choice) — NON-MUTATING; first destructive run still requires separate PK approval. Replaced if PK picks Option C (mobile viewport).
  - Rank 3: Wave 0f scoping — P3 brief-authoring only; opportunistic during Gate 11 window.
  - Rank 4: PRV brief authoring — deferred per D-FR-RECON-001 §7.D.
  - Rank 5: 5-row close-the-loop batch / Pre-sales / `purge_test_case` helper case_history extension — P2/P3 carry.
  - **Cowork lifecycle gating WARN no longer ranked** (CLOSED v3.01).

- **Items explicitly NOT closed v3.01 (per directive):**
  - cc-0015 (Wave 7) — STILL GATED on Gate 11 closing 2026-05-26.
  - cc-0016 Stage E lifecycle cleanup — future/separately-approved-only.
  - PRV brief authoring — deferred per D-FR-RECON-001 §7.D.
  - Mobile/narrow viewport verification — P3 carry.
  - Q-nightly-health-check-v1-005 — OPEN, non-blocking; deferred to future v3.1 brief patch / spec patch.

- **Hard stops respected v3.01:**
  - 0 Supabase mutations / 0 SQL / RPC / view / function changes
  - 0 Invegent-dashboard touched
  - 0 nightly-health-check manual run / 0 Cowork forced execution
  - 0 Q-005 resolution / 0 closure of Q-005
  - 0 Stage E started / 0 cleanup run
  - 0 cc-0015 advanced / 0 PRV closed
  - 0 retroactive editing / 0 fn_set_event_attachments / 0 lifecycle cleanup
  - 0 D-01 fires / 0 memory edits / 0 decisions.md edits

- **Sync close mechanics v3.01 (atomic single-commit per L-v2.85-e baseline — 14th consecutive occurrence):**
  1. Per-session detail `docs/runtime/sessions/2026-05-21-v3.01-cowork-lifecycle-warn-closed.md`.
  2. Brief frontmatter + queue + session file + sync_state + action_list in one push.

  L-v2.89-a fallback (1+1+1) ready but not invoked v3.01.

- **L-v2.85-e re-applied 14th consecutive occurrence**; promotion-confirmed v2.88 carries forward.
- **L-v2.83-a re-applied** at sync close. Cumulative **18+ STRONG**.
- **L-v2.94 convention NEW candidate (v3.01)** — the "ready → fire → review_required → PK observe → ready" lifecycle convention worked on the first natural cycle without manual intervention. Tag for confirmation across 2-3 more natural cycles before promotion-eligible.
- **L40 / L41 / L46 / L58 / L62 NOT exercised v3.01** (no D-01, no migration).
- **L-v2.97-a / L-v2.97-b / L-v2.98-a-c**: carried (no fresh occurrences).

- **Closed Active rows v3.01:** Cowork brief lifecycle gating WARN.
- **Promoted Active rows v3.01:** cc-0015 Gate 11 watch → new core rank 1 (replaces closed Cowork WARN; time-bound).
- **Spawned Active rows v3.01:** Q-nightly-health-check-v1-005 as non-blocking carry (not actively ranked).
- **NO decisions.md change v3.01.**
- **Production mutations v3.01: 0. D-01 fires v3.01: 0. T-MCP-02 cum: ~92 unchanged. State-capture exceptions: 1 unchanged.**

- **v3.01 honest limitations:**
  - Single-cycle closure (PK accepted one healthy fire as sufficient). Multi-cycle observation would be stronger; not required.
  - Q-005 deferred — the next 16:00 UTC fire will likely produce the same `skipped_count > 0` annotation until brief v3.1 / function pattern matcher updated.
  - Pattern-matcher gap unresolved: `friction.fn_emit_health_check_findings` still only recognises `true-stuck-{platform}-{slug}` problem_keys.

**v3.00 ADDITIONS:**

- **cc-0016 Stage D RECORDED CLOSED/PASS v3.00.** /operations evidence display shipped in Invegent-dashboard at `9082beb3e22df2e0f8d42924ed4e6f0a127c23ea` (files: `app/(dashboard)/operations/page.tsx`, `app/(dashboard)/operations/case-row.tsx`; typecheck PASS). Cross-repo recording; no dashboard edits this session.
  - **CCB verified VISUAL PASS:** /operations loads with recent 50 cases; V-A5 smoke case visible as "cc-0016 Stage B attachment smoke"; collapsed row purple paperclip badge 📎1; expanded row "Evidence (1)"; thumbnail renders; caption `va5-smoke.png · 861B · 10h ago`; thumbnail opens via signed URL `friction-evidence/9e314151-be65-434e-8588-c913012f6591/0_va5-smoke.png`; PNG in new tab `0_va5-smoke.png (64×64)`; unattached smoke case renders normally (no paperclip, no Evidence section); triage confirmation guardrail intact; no unrelated mutating actions.
  - **Stage D features live:** paperclip evidence-count badge; Evidence (N) expanded section; signed-URL thumbnail display; attached smoke object visible from /operations; unattached cases render normally; triage guardrail unchanged.

- **cc-0016 stage ledger v3.00 — evidence path COMPLETE through Stage D:** Stage A CLOSED; Stage C CLOSED; Stage B CLOSED/PASS (v2.99); **Stage D CLOSED/PASS (v3.00)**; Stage E FUTURE — separately approved only. capture (B) → store (A) → emit (C) → display (D). Only Stage E (lifecycle cleanup) remains.

- **Next ranked action — PK choice (do NOT start Stage E automatically):**
  - **Option A** — cc-0016 Stage E scoping only (lifecycle cleanup dry-run design). Brief-authoring; non-mutating; first destructive run still requires separate PK approval + dry-run (Stage A answers 2 + 6 + 7; CONSTRAINT 2).
  - **Option B** — pause cc-0016; return to Cowork lifecycle WARN (core rank 1) + cc-0015 Gate 11 watch (window closes 2026-05-26).
  - **Option C** — mobile/narrow viewport verification (P3; opportunistic given fresh operator-surface UI).

- **Items explicitly NOT closed v3.00 (per directive):**
  - Cowork brief lifecycle gating WARN — core rank 1; preserved open.
  - cc-0015 (Wave 7) — DRAFTED `9a5dc155`; gated on Gate 11 closing 2026-05-26.
  - PRV brief authoring — deferred per D-FR-RECON-001 §7.D.
  - cc-0016 Stage E lifecycle cleanup — future/separately-approved-only.
  - Mobile/narrow viewport verification — P3 carry.
  - Backend/shared-metrics refactor — deferred carry; not actively ranked.

- **Hard stops respected v3.00:**
  - 0 Supabase mutations for Stage D
  - 0 SQL / RPC / view / function changes
  - 0 lifecycle cleanup
  - 0 retroactive attachment editing
  - 0 upload-flow changes
  - 0 triage mutation during CCB verification
  - 0 unrelated dashboard mutations
  - 0 Invegent-dashboard edits this session
  - 0 deletion of smoke object or test events
  - 0 Stage E started / 0 cleanup run
  - 0 closure of Cowork WARN / cc-0015 / PRV / Stage E
  - 0 D-01 fires / 0 memory edits / 0 decisions.md edits

- **Sync close mechanics v3.00 (atomic single-commit per L-v2.85-e baseline — 13th consecutive occurrence):**
  1. Per-session detail file `docs/runtime/sessions/2026-05-21-v3.00-cc0016-stage-d-evidence-display-visual-pass.md`.
  2. sync_state + action_list + session file committed in **one atomic push**.
  L-v2.89-a fallback (1+1+1) ready but not invoked v3.00.

- **L-v2.85-e re-applied 13th consecutive occurrence**; promotion-confirmed v2.88 carries forward.
- **L-v2.83-a re-applied** at sync close. Cumulative **17+ STRONG**.
- **L40 / L41 / L46 / L58 / L62 NOT exercised v3.00** (read-only session; L62 reinforcement noted but no new D-01).
- **L-v2.90-a-f NOT empirically re-exercised v3.00.**

- **No new L-v3.00-X candidates surfaced.**

- **Closed Active rows v3.00:** cc-0016 Stage D → CLOSED/PASS; cc-0016 evidence capture/display path → COMPLETE through Stage D.
- **NO decisions.md change v3.00.**
- **Production mutations v3.00: 0. D-01 fires v3.00: 0. T-MCP-02 cum: ~92 unchanged. State-capture exceptions: 1 unchanged.**

- **v3.00.1 reconciliation patch (2026-05-21):** stale "v2.97/v2.98 unverified placeholder" wording corrected across session file + sync_state + this file. Those session files were already verified to exist — ancestry clean, Stage A/C facts confirmed, placeholder rows patched — in **v2.99.1 at `2db16568bfc8eeb0036d9a8cbe377cc198e4c6a7`**. No outstanding placeholder issue remains.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | 0 (recon diagnostic CLOSED v2.93; PHASES streak CLOSED v2.95; top alert bar CLOSED v2.96; cc-0016 Stage B CLOSED v2.99; cc-0016 Stage D CLOSED v3.00) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~37h (cumulative v2.83–v3.00) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v3.00 cycle: ~1h total** (cross-repo state recording; read-only verification recording; sync close drafting). 0 schema mutations. 0 D-01 fires. 1 atomic git commit. **State-capture exception count v3.00: 0** (cumulative 1).

---

## ⭐ Today / Next 5 (core ICE ranks)

> Last rebuilt: 2026-05-21 Sydney (v3.01 — Cowork lifecycle gating WARN CLOSED; cc-0015 Gate 11 watch promoted to rank 1).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0015 Gate 11 watch** | **P2 carry, rank 1 (NEW v3.01)** | Time-bound. Window closes **2026-05-26** (~5 days out from 2026-05-21). Passive observation; when gate clears, cc-0015 friction-pool-view UI (Wave 7) unblocks as the leading dashboard build. | PK / chat | Observe close-date; no action needed until 2026-05-26. |
| 2 | **cc-0016 Stage E scoping/dry-run design ONLY** (conditional — Option A) | **P2, rank 2 conditional** | cc-0016 evidence path complete A→B→C→D; only Stage E (lifecycle cleanup) remains. Option A = NON-MUTATING design + dry-run spec. First destructive run still requires separate PK approval. **Replaced if PK picks Option C (mobile viewport).** | PK → chat | PK picks A/C. If A: author Stage E dry-run design (no execution). |
| 3 | **Wave 0f scoping** | **P3 brief-authoring only, opportunistic during Gate 11 window** | Non-mutating. Candidates: items B/E/F/G from cc-0017e + `purge_test_case` helper case_history extension (L-v2.90-d). | chat → PK | When PK directs (recommended during Gate 11 window 2026-05-19 → 2026-05-26). |
| 4 | **Platform Reconciliation View brief authoring** | **P2 carry, deferred per D-FR-RECON-001 §7.D** | Defer until corrected friction-register baseline accepted. | PK → chat | When PK directs. |
| 5 | **5-row close-the-loop batch sweep / Pre-sales criteria / `purge_test_case` helper case_history extension** | **P2/P3 carry** | Outstanding close-the-loop UPDATEs (net not recomputed v3.00). | chat → PK | When PK directs. |

**Time-bound nudge:** cc-0015 Gate 11 observation window closes **2026-05-26** (~5 days out from 2026-05-21). cc-0015 friction-pool-view UI (Wave 7) unblocks then.

## ⭐ Dashboard work (separately ranked v3.00)

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| D1 | **cc-0015 friction-pool-view UI** (slice 5) | P2 carry | Backend already shipped. Gated on Gate 11 closing 2026-05-26. Leading dashboard build once gate clears (cc-0016 Stage D now shipped). | PK → chat (Wave 7) | When window closes 2026-05-26. |
| D2 | **Platform Reconciliation View surface** (slice 7) | P2 carry | PRV brief deferred per D-FR-RECON-001 §7.D. | PK → chat | When PRV brief authored + PK-accepted. |
| D3 | **Mobile/narrow viewport verification** | P3 carry (Option C candidate) | Browser runtime overrode `resize_window`. Opportunistic given fresh operator-surface UI just shipped. | CCD or PK | Real-device verification of /operations + /roadmap + sidebar. |

**Deferred carry (not actively ranked):** Backend/shared-metrics refactor.

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Secondary follow-up (P3)**: 3 no-fire scheduler days for `nightly-health-check-v1` — 2026-05-16, 2026-05-18, 2026-05-19.

**Passive observation v3.00**: Cron 82-86 firing normally. friction.* state assumed unchanged from Stage C apply (not re-probed). **Dashboard `dashboard.invegent.com`**: slices 1–3 + 4A–4B + cc-0016 Stage B (FAB upload) + cc-0016 Stage D (evidence display) all shipped + verified. **V-A5 smoke artefacts retained** — do not delete (now also the visible Stage D demo artefact on /operations).

---

## 🟢 cc-0016 friction-capture-evidence — STATUS BLOCK (UPDATED v3.00)

**Status v3.00: Stage A CLOSED + Stage C CLOSED + Stage B CLOSED/PASS + Stage D CLOSED/PASS. Evidence capture/display path COMPLETE through Stage D. Stage E future/separately-approved-only.**

**Stage ledger:**

| Stage | Scope | Status | Reference |
|---|---|---|---|
| A | bucket + attachments column + 2 CHECK + index + view + GRANT | CLOSED | D-01 `6f2b8b1a`/`f573e684`/`9eb35144`; applied v2.97 (session file verified in v2.99.1 at `2db1656`) |
| C | DROP+CREATE emit_event 13-arg + fn_emit_manual_event 8-arg; cc-0017b preserved | CLOSED | D-01 `56e65bb2`/`dbabb576`/`358c6fdd`; applied v2.98 (session file verified in v2.99.1 at `2db1656`) |
| B | FAB evidence upload/read UX | CLOSED/PASS v2.99 | dashboard `36fe6ad`; V-A5 PASS |
| **D** | **/operations evidence display (badge + Evidence section + signed-URL thumbnail)** | **CLOSED/PASS v3.00** | dashboard `9082beb` |
| E | lifecycle cleanup automation + dry-run report | FUTURE — separately approved only | Stage A CONSTRAINT 2 |

**Evidence path A→B→C→D complete:** capture (Stage B FAB upload) → store (Stage A bucket + column) → emit (Stage C RPC shape validation) → display (Stage D operator surface). Only lifecycle cleanup (Stage E) remains, intentionally gated.

**Stage D features live on /operations:** paperclip evidence-count badge 📎N; Evidence (N) expanded section; signed-URL thumbnail; PNG opens in new tab; unattached cases render normally; triage guardrail unchanged.

**V-A5 evidence (DO NOT DELETE; now also Stage D demo artefact):**
- No-attachment smoke event `2120b2f7-219f-4d0d-be56-512d81430873` (attachments=[]).
- Attachment smoke event `75f0c981-1180-4047-9aa3-f725bec6eb9b` (one attachment; visible as "cc-0016 Stage B attachment smoke" on /operations).
- Storage object `friction-evidence/9e314151-be65-434e-8588-c913012f6591/0_va5-smoke.png` (861 bytes, image/png; renders as thumbnail + opens 64×64 PNG).

**PK forward constraints carried:**
- CONSTRAINT 1 (operator-authorisation) — Stage B closure event. Negative-path test not explicitly asserted (single-operator posture; flagged limitation; Stage D read/display only, unaffected).
- CONSTRAINT 2 (no lifecycle cleanup / destructive deletion) — binds Stage E; unchanged.

**Next:** Stage E scoping (Option A) OR pause to Cowork/cc-0015 (Option B) OR mobile viewport (Option C) — PK choice. Do NOT start Stage E automatically.

---

## 🟢 Dashboard slices — STATUS BLOCK (UPDATED v3.00)

**Status v3.00: Slices 1–3 + 4A–4B RECORDED (v2.95+v2.96). cc-0016 Stage B FAB upload (v2.99) + Stage D evidence display (v3.00) CLOSED/PASS. Cross-repo recording only; no dashboard edits this session.**

- Slice 1 `af60953` / Slice 2 `de4501b` + `37008e5` / Slice 3 `991a92b` — VISUAL PASS (v2.95).
- Slice 4A `cd02402` / Slice 4B `f5a980f` — VISUAL PASS (v2.96).
- cc-0016 Stage B at `36fe6ad` (`actions/emit-friction.ts`, `components/friction-form.tsx`) — CLOSED/PASS (v2.99).
- **cc-0016 Stage D at `9082beb`** (`app/(dashboard)/operations/page.tsx`, `app/(dashboard)/operations/case-row.tsx`) — CLOSED/PASS (v3.00).

**Remaining dashboard work:** cc-0015 UI (D1, gated on Gate 11 closing 2026-05-26); PRV (D2, deferred); mobile viewport (D3, P3 / Option C).

---

## 🟢 Friction Register Consolidation Plan v1 — STATUS BLOCK (v3.00 unchanged)

Wave 0 + 0d + 0e COMPLETE. Gates 10+12+13 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE — ~5 days out. Day count not refreshed v3.00. Wave 0f scoping rank 3 carry. **cc-0016 Wave 8 now Stage A/B/C/D closed; only Stage E (future/separately-approved) remains.**

---

## 🟢 Cowork brief `nightly-health-check-v1` — STATUS BLOCK (UPDATED v3.01)

FROZEN at v3.0. Signal-production contract empirically validated v2.92. **Lifecycle gating WARN CLOSED v3.01** against the 2026-05-20T16:02:37Z natural fire as convention-cycle-1 evidence (v2.94 lifecycle convention: `ready → fire → review_required → PK observed → ready` validated end-to-end). Brief frontmatter reset to `status: ready` for the next 16:00 UTC fire. **No longer at core rank 1.** Run state file: `docs/runtime/runs/nightly-health-check-v1-2026-05-20T160237Z.md`. Markdown output: `docs/audit/health/2026-05-20.md` (canonical per brief §12.4). Emission summary: 5 P1 → `friction.event` (visible on `/operations` post Stage D); 2 P2 → `friction.emit_error` (CONDITION-KEY-UNRESOLVED; pattern-matcher gap). **Q-nightly-health-check-v1-005 remains OPEN as non-blocking function-contract drift** (skipped_count + emit_error routing not documented in brief §12.3); deferred to future v3.1 brief patch / `friction.fn_emit_health_check_findings` spec patch. Does NOT block the brief from running the next scheduled cycle.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v3.00)

**L41**: no new exercises v3.00 (read-only session).
**L40 / L46 / L58**: not exercised v3.00.
**L62**: strongly reinforced via cc-0016 6-fire D-01 series; not newly exercised v3.00 (no D-01).
**L-v2.83-a**: **17+ occurrences v3.00**. STRONG CANDIDATE confirmed.
**L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged).
**L-v2.85-e**: re-applied v3.00 — **13th consecutive occurrence**. PROMOTION-CONFIRMED v2.88 carries forward.
**L-v2.88-a**: watcher CLOSED for cc-0016. 2 prior occurrences carry for other contexts.
**L-v2.90-a-f**: not empirically re-exercised v3.00. Watchers.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated. ~5 days out from 2026-05-21. Day count not refreshed v3.01.
- **Cowork `nightly-health-check-v1` lifecycle gating WARN** — **CLOSED v3.01.** No longer time-bound; brief reset to `ready` for next natural 16:00 UTC fire. Q-005 carries non-blocking.
- **cc-0016 Stage D CLOSED/PASS v3.00; evidence path complete A→B→C→D.** Stage E future.
- No new v3.00 calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v3.00: **0 D-01 fires.** T-MCP-02 cum **~92 unchanged**. L46 / L62 not newly exercised v3.00 (no D-01). State-capture exceptions v3.00: 0 (cum 1). Close-the-loop UPDATEs v3.00: 0.

---

## 🤖 Cowork automation (D182)

**v3.00 update:** Cron 82/83/85/86 firing normally. Cowork brief lifecycle gating WARN — core rank 1 carry; preserved open v3.00.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0016 Stage D — /operations evidence display** | dashboard `9082beb`; CCB VISUAL PASS; badge + Evidence section + signed-URL thumbnail | RECORDED v3.00 | **CLOSED/PASS** | n/a (recorded) | n/a |
| **cc-0016 evidence capture/display path** | A→B→C→D complete | RECORDED v3.00 | **COMPLETE through Stage D** | n/a (recorded) | n/a |
| **cc-0016 Stage B — FAB evidence upload/read UX** | dashboard `36fe6ad`; V-A5 PASS | RECORDED v2.99 | **CLOSED/PASS** | n/a (recorded) | n/a |
| **cc-0016 Stage E — lifecycle cleanup** | Cleanup automation + dry-run report | FUTURE — separately approved only | NOT STARTED. CONSTRAINT 2 binds. Option A = scoping/dry-run design only. | PK → chat | Separate approval + dry-run required before any destructive run. |
| **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** | Reframed v2.94; ready reset; convention patched. Preserved open v3.00. | **P2 carry, core rank 1** | OPEN. Closure waits on PK observation of next 16:00 UTC fire. | chat → PK | Observe next fire. |
| **3 no-fire scheduler days — `nightly-health-check-v1`** | 2026-05-16, 2026-05-18, 2026-05-19 | **P3 secondary follow-up** | OPEN. | chat → PK | Read-only probe. |
| **Wave 0f scoping** | Brief-authoring only; opportunistic during Gate 11 | **P3, core rank 3** | NOT STARTED. | chat → PK | When PK directs. |
| **Platform Reconciliation View brief** | Deferred per D-FR-RECON-001 §7.D | **P2 carry, core rank 4** | NOT STARTED. | PK → chat | When PK directs. |
| **5-row close-the-loop batch / Pre-sales / `purge_test_case` helper extension** | Close-the-loop UPDATEs + Pre-sales 3-clock + helper coverage gap | **P2/P3 carry, core rank 5** | OPEN. | chat → PK | When PK directs. |
| **cc-0015 friction-pool-view brief** (Wave 7) | Authored PENDING_EXECUTION | P2 (gated on Gate 11 closing 2026-05-26) | DRAFTED `9a5dc155`. | chat → PK (Wave 7) | When window closes 2026-05-26. |
| **Mobile/narrow viewport verification** | Browser runtime overrode `resize_window`; Option C candidate | P3 carry | OPEN. Not blocking. Opportunistic given fresh /operations UI. | CCD or PK | Real-device verification. |
| **Music library activation** | video-worker v3.0.0 env-var gated | P2 carry | PENDING PK. | PK + chat | Bucket + tracks + env + smoke. |
| **vchecks.md V-B4 doc patch** | Correct V-B4 to 12-param signature | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **cc-0017c v1.2 doc patch candidate** | Date + 3 D-01 refs + V-B4 signature | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | P2 carry | OBSERVED. | chat → PK | Verify + dry-run + re-enable. |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P2 carry | LOGGED. | chat → PK | Audit m.post_draft. |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 carry | OPEN. | PK | When PK directs. |
| **Backend/shared-metrics refactor** | Deeper scope behind v2.95 count mismatch | DEFERRED carry | OPEN. Not actively ranked. | n/a | When separately directed. |
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (17+ occurrences v3.00; STRONG)** | Re-applied at sync close v3.00. | chat → next lesson cycle | Promote. |
| **L-v2.85-e** | push_files length budget — split-commit mitigation | **P3 (PROMOTION-CONFIRMED v2.88; 13th consecutive v3.00)** | Atomic single-commit close v3.00. | chat → next lesson cycle | **PROMOTE.** |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | P3 (4 occurrences; not re-exercised v3.00) | Promotion-eligible. | chat → next lesson cycle | Promote. |
| **L62 reinforcement** | Type-B vs Type-C D-01 handling | P3 (strongly reinforced via cc-0016 6-fire series) | Both Stages converged via Path A; no state-capture override. | chat → next lesson cycle | Strong empirical record. |
| **L-v2.88-a** | Identical PK-directive loop watcher | P3 (watcher CLOSED for cc-0016; 2 prior occurrences carry) | No identical-loop across 7 cc-0016 fires. | chat → next lesson cycle | Pair-promote with L-v2.85-e if recurs elsewhere. |
| **L-v2.90-a-f** | V-D fixture / arity DROP / etc. | P3 (not re-exercised v3.00) | Watchers. | chat → next session | Watcher. |
| **L-v2.78-a / L-v2.81-a / L47 / L-v2.84-a-d / L-v2.85-b/c/d / L-v2.86-a-e / L-v2.88-b/c/d / L-v2.89-a** | Various candidates | P3 carry | Unchanged from v2.99. | chat → next session/lesson cycle | Various. |
| **Other carries** | Minor doc patches (cc-0010A/0011/0012) / F-K-SCHEMA-REGISTRY-R-STALE / AI cost view / Publisher latent config / M8b / 94-row cohort / F-CRON-AUTO-APPROVER-SECRET-INLINE / morning-inbox-sweep-v1 / 22 escalated m.chatgpt_review rows / Memory cap 19/30 / Dashboard mobile / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged from v2.99. | various | various |

**Closed v3.00:**
- **cc-0016 Stage D** → RECORDED-CLOSED/PASS (dashboard `9082beb`).
- **cc-0016 evidence capture/display path** → COMPLETE through Stage D.

**Promoted v3.00:** cc-0016 Stage E scoping (Option A) → conditional core rank 2 (replaces closed Stage D). cc-0015 UI → dashboard D1 (leading dashboard build once Gate 11 clears).

**Closed earlier:** v2.99 cc-0016 Stage B + V-A5; v2.98 cc-0016 Stage C apply; v2.97 cc-0016 Stage A apply; v2.96 dashboard slices 4A–4B + top alert bar reconciliation; v2.95 dashboard slices 1–3 + PHASES streak + "Stop Claude"; v2.93 Reconciliation daily cadence diagnostic; v2.92 Health_check V-C3; v2.91 cc-0017e v1.1 doc patch; v2.90 cc-0017e apply; v2.85 cc-0017c apply; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.77 cc-0014 archived.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v2.99.

---

## 📌 Backlog

**v3.00 state changes:**
- **cc-0016 Stage D RECORDED CLOSED/PASS v3.00** (dashboard `9082beb`).
- **cc-0016 evidence capture/display path COMPLETE through Stage D** (A→B→C→D).
- **cc-0016 Stage E** carried as future/separately-approved-only; Option A = scoping/dry-run design only.
- **V-A5 smoke artefacts** retained (2 events + 1 storage object) — do not delete; now also Stage D demo artefact.
- Cowork lifecycle gating WARN unchanged at core rank 1.
- cc-0015 / PRV unchanged — preserved open.
- T-MCP-02 cum ~92 unchanged.
- State-capture exceptions cum 1 unchanged.
- L-v2.85-e 13th consecutive; L-v2.83-a 17+ STRONG; L62 strongly reinforced; L-v2.88-a watcher closed for cc-0016.
- **No decisions.md change v3.00.**
- **v3.00.1 reconciliation:** v2.97 + v2.98 session files confirmed to exist (reconciled in v2.99.1 at `2db1656`); placeholder concern closed; no outstanding placeholder issue remains.

---

## 🧊 Frozen / Deferred

Unchanged from v2.99. **cc-0016 Stage E lifecycle cleanup** — future/separately-approved-only. **Backend/shared-metrics refactor** — deferred carry.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e + L-v2.88-a-d + L-v2.89-a + L-v2.90-a-f candidates carried per v3.00.

- **L40 / L41 / L46 / L58**: not exercised v3.00 (read-only session).
- **L62**: strongly reinforced via cc-0016 6-fire D-01 series. Highest-confidence empirical record to date. Not newly exercised v3.00 (no D-01).
- **L-v2.83-a**: **17+ occurrences v3.00**. STRONG CANDIDATE confirmed.
- **L-v2.85-a HIGH-SIGNAL**: 4 occurrences (unchanged v3.00).
- **L-v2.85-e**: **PROMOTION-CONFIRMED v2.88; 13th consecutive occurrence v3.00**.
- **L-v2.88-a**: watcher CLOSED for cc-0016. 2 prior occurrences carry for other contexts.
- **L-v2.90-a-f**: not empirically re-exercised v3.00. Watchers.
- Other lessons unchanged from v2.99.

**L-v2.85-e + L-v2.85-a + L-v2.83-a remain highest-priority promotions at next lesson cycle. L62 has a strong 6-fire empirical record. L-v2.88-a watcher closed for cc-0016.**

---

## v3.00 honest limitations

- All v2.31–v2.99 limitations apply.
- **Cross-repo recording only** — chat did not fetch dashboard repo HEAD or independently verify commit `9082beb`. Recorded per directive payload.
- *(v3.00.1 patch: the prior "cross-session gap" note was stale. v2.97 (Stage A apply close) + v2.98 (Stage C apply close) session files were already verified to exist — ancestry clean, Stage A/C facts confirmed, placeholder rows patched — in **v2.99.1 at `2db16568bfc8eeb0036d9a8cbe377cc198e4c6a7`**. No outstanding placeholder issue remains.)*
- **"CCB VISUAL PASS" reflects operator browser walkthrough**, not automated test coverage.
- **Signed-URL thumbnail render + new-tab open** are CCB functional confirmations; chat did not independently re-issue the signed URL this session (read-only recording).
- **"10h ago" caption** is relative to CCB verification time, recorded verbatim; absolute timestamp not pinned.
- **Smoke artefacts retained** (2 events + 1 storage object) as V-A5 evidence + Stage D demo artefact; NOT to be cleaned up unless separately directed.
- **friction.* schema state assumed unchanged** from Stage C apply (10 tables / view / 19 functions net / 29 cases / 29 events / 8 case_history); not re-probed this session.
- **CONSTRAINT 1 operator-authorisation negative-path test gap** (flagged v2.99) carries forward; Stage D is read/display only and does not affect it.
- **Outstanding close-the-loop UPDATEs**: Stage C review rows assumed resolved at v2.98 apply; net count not recomputed v3.00.
- **T-MCP-02 cumulative ~92 unchanged** v3.00 (0 D-01 fires). State-capture exceptions cumulative 1.
- **Gate 11 day count not refreshed v3.00** (window closes 2026-05-26; ~5 days out).
- **Memory cap 19/30** unchanged.
- **Production mutations v3.00: 0.** Net schema deltas: 0. Supabase mutations: 0. apply_migration: 0. EF deploys: 0. Application code edits (either repo): 0.
- **No decisions.md change. No Wave 0f work started. No mid-session compaction event. No state-capture override. No Stage E work started.**

---

## Changelog

- v1.0–v2.93: per commit history.
- v2.94 (2026-05-20 Sydney): Cowork brief lifecycle gating WARN REFRAMED + ready reset + convention patched.
- v2.95 (2026-05-20 Sydney): Dashboard slices 1–3 RECORDED. PHASES 46-streak deferral CLOSED.
- v2.96 (2026-05-20 Sydney): Dashboard slices 4A–4B RECORDED + top alert bar count reconciliation CLOSED for UI scope.
- v2.97 (2026-05-20 Sydney): cc-0016 Stage A apply — own session file at `docs/runtime/sessions/2026-05-20-v2.97-cc0016-stage-a-applied.md` (verified to exist in v2.99.1 at `2db1656`).
- v2.98 (2026-05-20 Sydney): cc-0016 Stage C apply — own session file at `docs/runtime/sessions/2026-05-20-v2.98-cc0016-stage-c-applied.md` (verified to exist in v2.99.1 at `2db1656`).
- v2.99 (2026-05-20 Sydney): cc-0016 Stage B FAB upload/read UX validated + V-A5 PASS. Stage B CLOSED/PASS.
- v2.99.1 (2026-05-21 Sydney): reconciliation at `2db16568bfc8eeb0036d9a8cbe377cc198e4c6a7` — ancestry clean; v2.97 + v2.98 session files confirmed to exist; placeholder rows patched; Stage A/C facts confirmed.
- **v3.00 (2026-05-21 Sydney, cc-0016 Stage D /operations evidence display VISUAL PASS):**
  - Build arc: pull main → read v2.99 close state → record Stage D directive payload (dashboard `9082beb`; CCB VISUAL PASS facts) → edit action_list (header + ADDITIONS + Today/Next 5 + dashboard ranking + cc-0016 status block + Active + Backlog + Lessons + Limitations + Changelog) → edit sync_state (index + inline + Next priorities + do-not-touch + footer) → write per-session file → atomic single-commit `push_files` (3 files).
  - cc-0016 Stage D at dashboard `9082beb3e22df2e0f8d42924ed4e6f0a127c23ea` (files: `app/(dashboard)/operations/page.tsx`, `app/(dashboard)/operations/case-row.tsx`; typecheck PASS) — CLOSED/PASS.
  - CCB VISUAL PASS: paperclip badge 📎1, Evidence (1) section, signed-URL thumbnail, PNG new tab (64×64), unattached cases normal, triage guardrail intact.
  - cc-0016 stage ledger: Stage A CLOSED / Stage C CLOSED / Stage B CLOSED/PASS / Stage D CLOSED/PASS / Stage E future. Evidence path COMPLETE A→B→C→D.
  - Next action = PK choice: Option A (Stage E scoping/dry-run design only), Option B (pause → Cowork WARN + cc-0015 Gate 11 watch), Option C (mobile viewport). Stage E NOT started automatically.
  - Cowork lifecycle gating WARN / cc-0015 / PRV / Stage E UNCHANGED — preserved open.
  - 0 Supabase mutations; 0 SQL/RPC/view/function changes; 0 lifecycle cleanup; 0 retroactive editing; 0 upload-flow changes; 0 triage mutation; 0 unrelated dashboard mutations; 0 dashboard edits; 0 smoke-object/test-event deletion; 0 Stage E start; 0 cleanup run; 0 D-01 fires; 0 memory edits; 0 decisions.md edits.
  - L-v2.85-e re-applied 13th consecutive. L-v2.83-a 17+ STRONG. L62 strongly reinforced (carry). L-v2.88-a watcher CLOSED for cc-0016.
  - T-MCP-02 cum ~92 unchanged. State-capture exceptions cum 1 unchanged.
  - Closure budget: ~1h v3.00. Trailing-14-day ~37h.
- **v3.00.1 (2026-05-21 Sydney, reconciliation patch):** corrected the stale "v2.97/v2.98 unverified placeholder" wording across session file + sync_state + action_list. Those session files were already verified to exist in v2.99.1 at `2db1656`. No outstanding placeholder issue remains. 3 single-file `create_or_update_file` commits (session file `e052962`, sync_state `6ab1149`, action_list this commit). Non-mutating doc patch; cc-0016 Stage D remains CLOSED/PASS. 0 Supabase mutations / 0 dashboard edits / 0 Stage E start.
