# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-21 Sydney (**v3.04 — Dashboard Slice 0A MERGED to `invegent-dashboard` main at `3ec489b`** (Pre-Phase 0 / Gate-11-window sidebar IA shell + Visual Tokens v1). Parent `d17b604`; squash merge of `e65b812` (initial slice) + `399c087` (CCB polish); committed 2026-05-21T08:17:18Z. Files: `components/sidebar.tsx` + `tailwind.config.ts` + `app/globals.css` (exactly 3). Typecheck exit 0; CCD review PASS / CCB visual QA PASS / CCB polish re-check PASS. Sidebar regrouped to locked target IA NOW/CLIENTS/CREATE/REPORTS/ADMIN (NOW split Daily + Investigate + collapsed Legacy); 5 semantic status colour scales + 10 typography/spacing token helpers added additively; `d17b604` mobile-drawer behaviour preserved verbatim; no routes added/removed, no redirects, no `page.tsx`/route/layout/middleware/Supabase touched, no Roadmap/PHASES touched. Commit SHA + content **independently verified** (Invegent GitHub `list_recent_commits` + live `sidebar.tsx` read — not taken on directive faith). **Slice 0A is NOT real Dashboard Phase 0** — review §9 Phase 0 schema groundwork (`m.attention_item`/`m.vw_pipeline_state`/`m.brief`/`m.action_event`) remains future/gated. Cross-repo documentation recording only. cc-0015 Gate 11 watch PRESERVED rank 1 (closes 2026-05-26); cc-0016 Stage E separately-approved-only; PRV deferred; Q-005 OPEN non-blocking next-fire watch. 0 Supabase / 0 dashboard edits / 0 Phase 0 schema / 0 cc-0015 start / 0 Stage E / 0 PRV / 0 Q-005 closure / 0 decisions.md change / 0 D-01 / 0 full-file rewrite from stale context.) **Prior: v3.03 — Q-005 Option A trail recorded (A-005 `56e992b4` + v3.1 `7005865` + CCD-FAIL finding + v3.1.1 guard `9ceb78a`); brief now v3.1.1; Q-005 stays OPEN, next-fire watch.** **Today/Next 5 core ranks (unchanged v3.02–v3.04)**: **cc-0015 Gate 11 watch → rank 1 (closes 2026-05-26)**; cc-0016 Stage E scoping/dry-run design ONLY → rank 2 conditional; Wave 0f scoping → rank 3; PRV → rank 4 (deferred); close-the-loop → rank 5.

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v3.01.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + **L-v2.83-a (STRONG; 18+)** + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL; 4 occurrences) + L-v2.85-b/c/d + **L-v2.85-e PROMOTION-CONFIRMED** + 5 L-v2.86 candidates + **L-v2.88-a (watcher CLOSED for cc-0016; 2 prior occurrences carry; re-fired as identical-directive event at v3.02 re-send — recognised + not re-executed)** + L-v2.88-b/c/d + L-v2.89-a + **L-v2.90-a through L-v2.90-f** + **L62 strongly reinforced via cc-0016 6-fire D-01 series** + **L-v2.94 convention NEW candidate** + **L-v3.02-a NEW candidate (mobile breakpoint verification after primary operator-surface change)** + **L-v3.03-a NEW candidate (verify downstream acceptance gates before declaring a contract-reconciliation patch correct)** + **L41 re-exercised v3.02.1 + reinforced v3.03 + v3.04 (full-file push from stale content clobbers intervening out-of-band commit — re-read HEAD first; surgical edits for 00_ index files)**. **D-IOL-001 (v2.77)** + **D-CC-0017B-Q1** carried.

**v3.04 ADDITIONS:**

- **Dashboard Slice 0A MERGED to `invegent-dashboard` main — RECORDED (documentation-only).** No Supabase, no dashboard edits, no Phase 0 schema work; the merge itself was applied by CCH locally + pushed, not by chat.
  - **Dashboard main HEAD: `3ec489b6fb1e4ad706aac9d32f7fefa4ad43b9c5`** (short `3ec489b`); parent `d17b6047411ce177d6182d86a21a79f7302459af` (`d17b604`); **squash merge** of `e65b812` (initial slice) + `399c087` (CCB polish); committed 2026-05-21T08:17:18Z.
  - **Files (exactly 3):** `components/sidebar.tsx` (NAV regrouped to NOW/CLIENTS/CREATE/REPORTS/ADMIN; NOW split Daily [Overview/Inbox/Pipeline→/queue] + Investigate [Flow/Pipeline Log/Visual Pipeline/Agents/Operations] + collapsed Legacy [Failures/EF Drift]; mobile drawer preserved verbatim); `tailwind.config.ts` (+5 status colour scales critical/warning/info/success/muted, additive; navy/cyan/signal-blue unchanged); `app/globals.css` (+`@layer components` 6 typography + 4 spacing helpers; existing blocks unchanged).
  - **Validation:** typecheck `npx tsc --noEmit` exit 0; CCD review PASS; CCB visual QA PASS; CCB polish re-check PASS; Vercel success (per directive).
  - **Verification by chat:** commit SHA, message, parent, and file scope confirmed via Invegent GitHub `list_recent_commits`; Slice 0A content confirmed by reading live `components/sidebar.tsx` on main (`NAV`/`NavGroup`/Legacy/`ChevronDown` present; mobile-drawer chrome intact). NOT recorded on directive faith.
  - **No routes added/removed; no redirects; no page/route/layout/middleware/actions/lib/supabase files; no Roadmap/PHASES.** Some NOW > Investigate labels (Pipeline, Visual Pipeline, Agents, Operations) are transitional stand-ins over existing routes.
  - **Slice 0A is NOT real Dashboard Phase 0.** The locked Phase 0 (dashboard-review §9) — `m.attention_item` / `m.vw_pipeline_state` / `m.brief` / `m.action_event` + the Inbox/Pipeline/Brief/Action-Layer data-backed surfaces — remains **future/gated** (S30 cleared + M5–M8 reconciliation prerequisites). Not started by this work.

- **Items explicitly preserved v3.04:**
  - cc-0015 Gate 11 watch — rank 1; window closes 2026-05-26; do NOT start before. *(Slice 0A merge does NOT start or advance cc-0015.)*
  - cc-0016 Stage E lifecycle cleanup — future/separately-approved-only.
  - PRV brief authoring — deferred per D-FR-RECON-001 §7.D.
  - Q-nightly-health-check-v1-005 — OPEN, non-blocking, next-fire watch (brief v3.1.1).
  - mobile viewport CLOSED/PASS (v3.02); mobile-fix SHA backfilled (v3.02.2; `d17b604` is now the parent of `3ec489b`).
  - Backend/shared-metrics refactor — deferred carry.

- **Hard stops respected v3.04:**
  - 0 Supabase mutations / 0 Invegent-dashboard edits (recording-only)
  - 0 Phase 0 schema/data work / 0 new data-backed surfaces
  - 0 cc-0015 start / 0 cc-0016 Stage E / 0 PRV / 0 Q-005 closure
  - 0 route removals / 0 redirects / 0 Roadmap/PHASES edits / 0 content-engine code changes (docs-only)
  - 0 full-file rewrite from stale context (both `00_` files re-read this session — sync_state blob `348c0a6e`, action_list blob `5734b407` — then section-patched; HEAD re-read first)
  - 0 D-01 fires / 0 memory edits / 0 decisions.md edits

- **Closed Active rows v3.04:** none net (Slice 0A merge recorded as a CLOSED/RECORDED row; Q-005 remains OPEN by design; ranks unchanged).
- **NO decisions.md change v3.04.**
- **Production mutations: 0. D-01 fires: 0. T-MCP-02 cum: ~92 unchanged. State-capture exceptions: 1 unchanged.**

**v3.03 ADDITIONS (preserved):**

- **Q-005 Option A resolution trail RECORDED (brief now v3.1.1; Q-005 stays OPEN).** Doc/spec work only — no Supabase mutation, no nightly run, no re-emission.
  - **A-nightly-health-check-v1-005 — `56e992b4`** (`claude_answers.md`): PK ratified **Option A** (explicit per-finding `condition_key`). Q-005 explicitly kept OPEN.
  - **v3.1 brief patch — `7005865`**: brief v3.0 → v3.1. §12.2 explicit `condition_key` required; §12.2a 9-key mapping; §12.3 4-field return incl `skipped_count`; §12.4/§12.5 reconciliation + skip semantics.
  - **CCD read-only finding (v3.1 FAIL):** the live emission path has TWO gates. (1) `friction.fn_emit_health_check_findings` DOES consume an explicit `finding.condition_key` first (v3.1 input-layer design correct). (2) BUT `friction.emit_event` requires an **enabled `friction.emission_rule` row for `(source='health_check', condition_key)`**, and only `condition_key = true_stuck` is enabled. v3.1's renamed `true_stuck_cluster` + 8 invented P2 keys would ALL be rejected — likely `success_count=0, failure_count=5–7`, regressing the P1 true-stuck path that has worked since 2026-05-17.
  - **v3.1.1 guard patch — `9ceb78a`**: brief v3.1 → v3.1.1 (no-Supabase guard). §12.2a corrected — true-stuck uses the live-enabled `condition_key = true_stuck` (NOT `true_stuck_cluster`). The other 8 P1/P2 types are **PARKED**: surfaced in Section 10 markdown with `finding_id` comments but **omitted from the emission JSONB array** (no invented keys → no avoidable `emit_error` noise). §12.3–§12.5 + success criteria reflect the interim. Full 9-key mapping parked pending a separate **Supabase-approved `friction.emission_rule` seed patch**.
  - **Current brief version: v3.1.1.**
  - **Next natural fire expected behaviour (SAFE):** P1 true-stuck emits to `friction.event` with `condition_key=true_stuck` (no regression); parked unsupported P1/P2 types appear in the markdown but are omitted from the emission JSONB (recorded under `omitted_unsupported_types`; expected, not a defect). Target: `failure_count=0`, `skipped_count=0` against the EMITTED (true-stuck-only) array.
  - **Q-005 status: OPEN, non-blocking, next-fire watch.** Close fork:
    - **(A)** Supabase-approved patch seeds `friction.emission_rule` rows for all desired P1/P2 `condition_key` values → restore full §12.2a mapping in a follow-up brief patch → natural fire verifies all P1+P2 emit with `failure_count=0` AND `skipped_count=0`; OR
    - **(B)** PK formally narrows emission scope to P1-true-stuck-only as the accepted end-state → natural fire verifies true-stuck with `failure_count=0` AND `skipped_count=0`.
    - A clean v3.1.1 interim fire is the GOOD outcome but does NOT by itself close Q-005.

- **Items explicitly preserved v3.03:**
  - cc-0015 Gate 11 watch — rank 1; window closes 2026-05-26; do NOT start before.
  - cc-0016 Stage E lifecycle cleanup — future/separately-approved-only.
  - PRV brief authoring — deferred per D-FR-RECON-001 §7.D.
  - mobile viewport CLOSED/PASS (v3.02); mobile-fix SHA backfilled (v3.02.2).
  - Backend/shared-metrics refactor — deferred carry.

- **Hard stops respected v3.03:**
  - 0 Supabase mutations / 0 Invegent-dashboard edits
  - 0 nightly-health-check run / 0 re-emission of 2026-05-20 P2 findings
  - 0 Q-005 closure / 0 cc-0015 start / 0 cc-0016 Stage E / 0 PRV closure
  - 0 emission_rule rows seeded (parked for a separate Supabase-approved patch)
  - 0 full-file rewrite from stale context (sync_state + action_list patched surgically; HEAD `9ceb78a` re-read; per-file blob-SHA passed)
  - 0 D-01 fires / 0 memory edits / 0 decisions.md edits

- **Closed Active rows v3.03:** none (recording-only; Q-005 remains OPEN by design).
- **NO decisions.md change v3.03.**
- **Production mutations: 0. D-01 fires: 0. T-MCP-02 cum: ~92 unchanged. State-capture exceptions: 1 unchanged.**

**v3.02 (+v3.02.1 +v3.02.2) ADDITIONS (preserved):**

- **Mobile/narrow viewport verification RECORDED CLOSED/PASS v3.02.** CCB tested at 306×498 Nexus 5 Android Chrome UA, DPR 2 → MOBILE PASS. Cross-repo recording; no dashboard edits.
  - Mobile fix resolved: sidebar collapses to hamburger/drawer; desktop fixed rail no longer consumes mobile width; /operations rows readable; evidence paperclip badge visible; expanded Evidence section usable; triage guardrail usable; FAB usable; Roadmap readable; "Stop Claude" overlay remains external Claude Browser tooling.
  - **Removed from open P3 carries.** Was open since dashboard slice 3 limitation (v2.95 browser runtime overrode `resize_window`).
- **✅ Mobile-fix commit SHA backfilled v3.02.2** — `d17b6047411ce177d6182d86a21a79f7302459af` (short `d17b604`); dashboard files `components/sidebar.tsx` + `app/(dashboard)/operations/case-row.tsx`; typecheck PASS. Was recorded `<PENDING — SHA not supplied in directive>` at v3.02 (not fabricated); CCD supplied it; backfilled surgically (HEAD `19a4734c` confirmed, per-file blob-SHA re-read). **No longer pending.** *(v3.04: `d17b604` is now the parent of the Slice 0A merge `3ec489b`.)*
- **NEW lesson candidate L-v3.02-a:** mobile/narrow breakpoint should be verified after any primary operator-surface change. 1 occurrence; watcher.
- **⚠️ v3.02.1 reconciliation:** the original v3.02 close clobbered v3.01's `00_` index/ranking content. Root cause: v3.01 (`83cd633c`, another agent) landed between v3.00.1 (`a98acaf`) and v3.02; chat's v3.02 full-file `push_files` wrote sync_state + action_list from pre-v3.01 held content, reverting v3.01's edits even though git advanced cleanly on parent `83cd633c`. v3.01 commit + session file survived (push didn't touch those paths). The v3.02 commit message + session file claimed "L41 clobber-mitigation applied (held content == HEAD verified)" — FALSE; HEAD was not re-read. v3.02.1 restores v3.01 facts (Cowork WARN CLOSED; cc-0015 rank 1; v3.01 index row; Q-005 carry) + keeps v3.02 mobile closure + corrects the false claim. Repair done via read-HEAD-first per-file patches (sync_state `958b056f`, action_list `20fb7390`, v3.02 session file patch). **v3.02.2 SHA backfill + v3.03 Q-005 recording + v3.04 dashboard-merge recording followed the same surgical discipline.**

- **Items explicitly preserved v3.02 (per directive + restored from v3.01):**
  - cc-0015 Gate 11 watch — rank 1; window closes 2026-05-26; do NOT start before.
  - cc-0016 Stage E lifecycle cleanup — future/separately-approved-only.
  - PRV brief authoring — deferred per D-FR-RECON-001 §7.D.
  - Q-nightly-health-check-v1-005 — OPEN, non-blocking.
  - mobile viewport CLOSED/PASS.
  - Backend/shared-metrics refactor — deferred carry.

- **Hard stops respected v3.02 (+v3.02.1 +v3.02.2):**
  - 0 Invegent-dashboard edits / 0 Supabase mutations
  - 0 Stage E started / 0 cleanup run
  - 0 cc-0015 start before Gate 11 closes / 0 PRV closure / 0 Q-005 closure
  - 0 deletion of smoke objects or test events
  - 0 D-01 fires / 0 memory edits / 0 decisions.md edits
  - 0 SHA fabrication (PENDING at v3.02; CCD-supplied SHA backfilled v3.02.2)
  - 0 re-execution of the duplicate v3.02 directive (recognised as L-v2.88-a identical-directive event)
  - 0 full-file rewrite from stale context (v3.02.2 done surgically, HEAD re-read per file)

- **Closed Active rows v3.02:** Mobile/narrow viewport verification → CLOSED/PASS. **Mobile-fix commit SHA backfill → CLOSED v3.02.2 (`d17b604`).**
- **NO decisions.md change v3.02 / v3.02.1 / v3.02.2.**
- **Production mutations: 0. D-01 fires: 0. T-MCP-02 cum: ~92 unchanged. State-capture exceptions: 1 unchanged.**

**v3.01 ADDITIONS (preserved):**

- **Cowork brief lifecycle gating WARN CLOSED v3.01.** v2.94 lifecycle convention validated end-to-end against the 2026-05-20T16:02:37Z natural 16:00 UTC fire as convention-cycle-1 evidence:
  - Run state: `docs/runtime/runs/nightly-health-check-v1-2026-05-20T160237Z.md`. Finished 16:08:30Z (~6 min). 0 schema-drift fallbacks. All 14 SQL queries verbatim. Markdown `docs/audit/health/2026-05-20.md` (canonical per brief §12.4).
  - Dual-write: `{success_count: 5, failure_count: 0, skipped_count: 2}`. 5 P1 → `friction.event` (visible on `/operations` post Stage D); 2 P2 → `friction.emit_error` (`CONDITION-KEY-UNRESOLVED`).
  - Brief lifecycle: `ready → review_required → PK observed → ready` ✓. 0 Cowork forbidden-action violations.
- **`docs/briefs/nightly-health-check-v1.md`** frontmatter reset: `status: review_required → ready`. brief_version unchanged (v3.0). *(v3.03: brief_version subsequently bumped to v3.1.1 by the Q-005 Option A patch series.)*
- **`docs/briefs/queue.md`** Active row: `status: review_required → ready`; closure annotation prepended; 2026-05-20 run history preserved.
- **Q-nightly-health-check-v1-005 remains OPEN, non-blocking.** Function-contract drift. *(v3.03: resolved via Option A → v3.1 → v3.1.1 guard; still OPEN as next-fire watch.)*
- **Core ranks rebuilt v3.01:** rank 1 = cc-0015 Gate 11 watch; Cowork WARN no longer ranked (CLOSED).
- **L-v2.94 convention NEW candidate (v3.01)** — confirm across 2-3 more natural cycles before promotion-eligible.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | 0 (recon CLOSED v2.93; PHASES streak CLOSED v2.95; top alert bar CLOSED v2.96; Stage B CLOSED v2.99; Stage D CLOSED v3.00; Cowork WARN CLOSED v3.01; mobile viewport CLOSED v3.02). *(Q-005 is P3 non-blocking, not counted.)* | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~38h (cumulative v2.83–v3.02) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v3.04 cycle: ~0.4h** (dashboard Slice 0A merge verification + cross-repo recording; docs-only). 0 schema mutations. 0 D-01 fires. **State-capture exception count: 0** (cumulative 1).
**v3.03 cycle: ~0.75h** (A-005 + v3.1 + v3.1.1 brief patches + sync recording; doc/spec only). 0 schema mutations. 0 D-01 fires.

---

## ⭐ Today / Next 5 (core ICE ranks)

> Last rebuilt: 2026-05-21 Sydney (ranks carried unchanged from v3.02; v3.03 was a Q-005 recording cycle; v3.04 was a dashboard-merge recording cycle — no rank change either cycle).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0015 Gate 11 watch** | **P2 carry, rank 1 (from v3.01)** | Time-bound. Window closes **2026-05-26** (~5 days out from 2026-05-21). Passive observation; when gate clears, cc-0015 friction-pool-view UI (Wave 7) unblocks as the leading dashboard build. *(Slice 0A merge v3.04 did NOT start or advance cc-0015 — it was cosmetic shell only.)* | PK / chat | Observe close-date; no action needed until 2026-05-26. |
| 2 | **cc-0016 Stage E scoping/dry-run design ONLY** (conditional — Option A) | **P2, rank 2 conditional** | cc-0016 evidence path complete A→B→C→D + mobile-verified; only Stage E (lifecycle cleanup) remains. Option A = NON-MUTATING design + dry-run spec. First destructive run still requires separate PK approval. | PK → chat | PK picks. If A: author Stage E dry-run design (no execution). |
| 3 | **Wave 0f scoping** | **P3 brief-authoring only, opportunistic during Gate 11 window** | Non-mutating. Candidates: items B/E/F/G from cc-0017e + `purge_test_case` helper case_history extension (L-v2.90-d). | chat → PK | When PK directs (during Gate 11 window 2026-05-19 → 2026-05-26). |
| 4 | **Platform Reconciliation View brief authoring** | **P2 carry, deferred per D-FR-RECON-001 §7.D** | Defer until corrected friction-register baseline accepted. | PK → chat | When PK directs. |
| 5 | **5-row close-the-loop batch sweep / Pre-sales criteria / `purge_test_case` helper case_history extension** | **P2/P3 carry** | Outstanding close-the-loop UPDATEs (net not recomputed). | chat → PK | When PK directs. |

**Carries flagged (NOT actively ranked):** **Q-nightly-health-check-v1-005 (OPEN, non-blocking, next-fire watch; brief v3.1.1; emission_rule seed-or-narrow close fork — see Active table + v3.03 ADDITIONS)**; 3 no-fire scheduler days (2026-05-16/18/19, P3 informational). *(Mobile-fix commit SHA backfill — CLOSED v3.02.2: `d17b604`. No longer a carry.)*

**Time-bound nudge:** cc-0015 Gate 11 observation window closes **2026-05-26** (~5 days out). cc-0015 friction-pool-view UI (Wave 7) unblocks then.

## ⭐ Dashboard work (separately ranked v3.02; v3.04 status note)

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| D1 | **cc-0015 friction-pool-view UI** (slice 5) | P2 carry | Backend already shipped. Gated on Gate 11 closing 2026-05-26. Leading dashboard build once gate clears. **NOT advanced by Slice 0A (0A was cosmetic IA shell only).** | PK → chat (Wave 7) | When window closes 2026-05-26. |
| D2 | **Platform Reconciliation View surface** (slice 7) | P2 carry | PRV brief deferred per D-FR-RECON-001 §7.D. | PK → chat | When PRV brief authored + PK-accepted. |

*(Mobile/narrow viewport verification removed — CLOSED/PASS v3.02; SHA backfilled v3.02.2. **Dashboard Slice 0A IA shell + Visual Tokens v1 MERGED v3.04 at `3ec489b` — Pre-Phase 0 cosmetic work, NOT a ranked build and NOT real Phase 0.**)*

**Deferred carry (not actively ranked):** Backend/shared-metrics refactor.

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Secondary follow-up (P3)**: 3 no-fire scheduler days for `nightly-health-check-v1` — 2026-05-16, 2026-05-18, 2026-05-19.

**Passive observation v3.03/v3.04**: Cron 82-86 firing normally. friction.* state assumed unchanged from Stage C apply (not re-probed). **Brief `nightly-health-check-v1` now v3.1.1** — next natural 16:00 UTC fire safe (true-stuck P1 emits; parked types markdown-only). **Dashboard `dashboard.invegent.com`**: slices 1–3 + 4A–4B + cc-0016 Stage B (FAB upload) + cc-0016 Stage D (evidence display) all shipped + verified; mobile-verified at 306×498 DPR2 (mobile fix `d17b604`); **Slice 0A IA shell + Visual Tokens v1 merged at `3ec489b` (v3.04)**. **V-A5 smoke artefacts retained** — do not delete.

---

## 🟢 cc-0016 friction-capture-evidence — STATUS BLOCK (v3.02 — Stage A/B/C/D closed + mobile-verified)

**Status: Stage A CLOSED + Stage C CLOSED + Stage B CLOSED/PASS + Stage D CLOSED/PASS. Evidence capture/display path COMPLETE through Stage D; now also mobile-verified (v3.02). Stage E future/separately-approved-only.**

| Stage | Scope | Status | Reference |
|---|---|---|---|
| A | bucket + attachments column + 2 CHECK + index + view + GRANT | CLOSED | D-01 `6f2b8b1a`/`f573e684`/`9eb35144`; applied v2.97 (verified in v2.99.1 at `2db1656`) |
| C | DROP+CREATE emit_event 13-arg + fn_emit_manual_event 8-arg; cc-0017b preserved | CLOSED | D-01 `56e65bb2`/`dbabb576`/`358c6fdd`; applied v2.98 (verified in v2.99.1 at `2db1656`) |
| B | FAB evidence upload/read UX | CLOSED/PASS v2.99 | dashboard `36fe6ad`; V-A5 PASS |
| D | /operations evidence display | CLOSED/PASS v3.00 | dashboard `9082beb`; mobile-verified v3.02 (mobile fix `d17b604`) |
| E | lifecycle cleanup automation + dry-run report | FUTURE — separately approved only | Stage A CONSTRAINT 2 |

**V-A5 evidence (DO NOT DELETE):** no-attach event `2120b2f7-219f-4d0d-be56-512d81430873`; attach event `75f0c981-1180-4047-9aa3-f725bec6eb9b`; object `friction-evidence/9e314151-be65-434e-8588-c913012f6591/0_va5-smoke.png` (861 bytes, image/png).

**PK forward constraints carried:** CONSTRAINT 1 (operator-authorisation; Stage B closure; negative-path gap flagged); CONSTRAINT 2 (no lifecycle cleanup/destructive deletion; binds Stage E).

---

## 🟢 Dashboard slices — STATUS BLOCK (UPDATED v3.04)

**Status v3.04: Slices 1–3 + 4A–4B RECORDED. cc-0016 Stage B + Stage D CLOSED/PASS. Mobile/narrow viewport verification CLOSED/PASS (v3.02; SHA backfilled v3.02.2). Slice 0A (Pre-Phase 0 IA shell + Visual Tokens v1) MERGED v3.04 at `3ec489b`. Cross-repo recording only.**

- Slice 1 `af60953` / Slice 2 `de4501b` + `37008e5` / Slice 3 `991a92b` — VISUAL PASS (v2.95).
- Slice 4A `cd02402` / Slice 4B `f5a980f` — VISUAL PASS (v2.96).
- cc-0016 Stage B at `36fe6ad` — CLOSED/PASS (v2.99).
- cc-0016 Stage D at `9082beb` — CLOSED/PASS (v3.00).
- **Mobile fix** at `d17b604` (`d17b6047411ce177d6182d86a21a79f7302459af`; files `components/sidebar.tsx` + `app/(dashboard)/operations/case-row.tsx`; typecheck PASS) — MOBILE PASS at 306×498 DPR2 (v3.02; SHA backfilled v3.02.2).
- **Slice 0A (Pre-Phase 0 IA shell + Visual Tokens v1)** at `3ec489b` (`3ec489b6fb1e4ad706aac9d32f7fefa4ad43b9c5`; parent `d17b604`; squash of `e65b812` + `399c087` CCB polish; committed 2026-05-21T08:17:18Z; files `components/sidebar.tsx` + `tailwind.config.ts` + `app/globals.css`; typecheck exit 0; CCD/CCB/CCB-polish PASS) — **MERGED v3.04.** Sidebar regrouped to locked IA NOW/CLIENTS/CREATE/REPORTS/ADMIN; 5 status colour scales + 10 typography/spacing helpers additive; mobile drawer preserved. **NOT real Dashboard Phase 0.** Independently verified (Invegent GitHub `list_recent_commits` + live `sidebar.tsx` read).

**Remaining dashboard work:** cc-0015 UI (D1, gated on Gate 11 closing 2026-05-26; NOT advanced by Slice 0A); PRV (D2, deferred). Real Dashboard Phase 0 (review §9 schema groundwork) future/gated. *(Mobile viewport CLOSED.)*

---

## 🟢 Friction Register Consolidation Plan v1 — STATUS BLOCK (unchanged)

Wave 0 + 0d + 0e COMPLETE. Gates 10+12+13 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE — ~5 days out. Day count not refreshed. Wave 0f scoping rank 3 carry. **cc-0016 Wave 8 Stage A/B/C/D closed (+ mobile-verified); only Stage E (future/separately-approved) remains.**

---

## 🟢 Cowork brief `nightly-health-check-v1` — STATUS BLOCK (UPDATED v3.03 — now v3.1.1)

**Brief version: v3.1.1** (was FROZEN at v3.0; reopened for the Q-005 Option A `condition_key` contract reconciliation + v3.1.1 emission_rule guard). Signal-production contract empirically validated v2.92. Lifecycle gating WARN CLOSED v3.01. Frontmatter `status: ready`.

**Q-005 Option A trail (v3.03):** A-005 `56e992b4` (Option A ratified) → v3.1 `7005865` (explicit `condition_key`, 9-key §12.2a mapping) → **CCD read-only finding: v3.1 would FAIL live emission** (the `friction.emit_event` `emission_rule` gate accepts only `condition_key=true_stuck`; v3.1's `true_stuck_cluster` + 8 invented keys would all be rejected, regressing the known-good P1 path) → v3.1.1 `9ceb78a` (guard: restore `condition_key=true_stuck` for true-stuck P1; PARK the other 8 keys markdown-only / omitted from emission JSONB).

**Next natural 16:00 UTC fire — SAFE:** true-stuck P1 emits with `condition_key=true_stuck`; parked unsupported P1/P2 types appear in markdown but omitted from emission (recorded under `omitted_unsupported_types`). Target `failure_count=0`, `skipped_count=0` against the EMITTED (true-stuck-only) array.

**Q-005 remains OPEN, non-blocking, next-fire watch.** Close fork: (A) Supabase-approved `friction.emission_rule` seed patch for all desired keys + restore full §12.2a mapping + verify; OR (B) PK formally narrows scope to P1-true-stuck-only + verify. Does NOT block the next scheduled cycle.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v3.04)

**L41**: **re-exercised v3.02.1 + reinforced v3.03 + v3.04** (negative-then-positive). Original v3.02 full-file push clobbered v3.01 `00_` content; v3.02.1 repaired via read-HEAD-first per-file patches; v3.02.2 SHA backfill + v3.03 Q-005 recording + v3.04 dashboard-merge recording all done surgically (HEAD re-read, per-file blob-SHA passed). Pair-promote with the full-file-write mitigation lesson.
**L40 / L46 / L58**: not exercised.
**L62**: strongly reinforced via cc-0016 6-fire D-01 series; not newly exercised (no D-01).
**L-v2.83-a**: **18+ occurrences**. STRONG CANDIDATE confirmed.
**L-v2.85-a HIGH-SIGNAL**: 4 occurrences.
**L-v2.85-e**: PROMOTION-CONFIRMED v2.88. Consecutive-streak tally muddied by v3.02 clobber/repair — re-baseline at next clean close rather than claim a clean 15th.
**L-v2.88-a**: watcher CLOSED for cc-0016; re-fired as identical-directive event at the v3.02 re-send (recognised; not re-executed; clobber repaired instead). 2 prior occurrences carry.
**L-v2.94 convention**: NEW candidate (v3.01).
**L-v3.02-a**: NEW candidate (mobile breakpoint verification after primary operator-surface change). 1 occurrence.
**L-v3.03-a**: NEW candidate (verify downstream acceptance gates before declaring a contract-reconciliation patch correct). 1 occurrence.
**L-v3.04-a**: NEW candidate (v3.04) — before recording a cross-repo merge/close as fact, independently verify the commit SHA + content (here via `list_recent_commits` + live file read), do not record on directive payload faith. Mirrors the v3.02 "did not fabricate the SHA" discipline; 1 occurrence; watcher.

**Process note (v3.03):** the Q-005 → v3.1 → CCD-FAIL → v3.1.1 sequence is a clean example of CCD read-only verification catching a brief-author defect (invented `condition_key` values with no backing `emission_rule`) BEFORE a live fire — candidate L-v3.03-a watcher.

---

## 🔵 cc-0020 — Generation Eligibility & Demand Modes — FUTURE DESIGN BLOCK (recorded CCD 2026-05-24; doc-only, non-blocking)

**Origin:** follow-up identified during cc-0019 execution + CCH investigation. **Not** folded into cc-0019; cc-0019 stands as the v1 safety patch.

**Problem statement.** Overlapping, mis-layered controls:
- `c.client_publish_schedule.enabled` controls whether platform schedule demand can materialise into slots.
- `c.client_publish_profile.publish_enabled` controls publishing eligibility and — after cc-0019 Unit A — drafting eligibility at fill time.
- RSS/feed ingestion + signal accumulation run independently of publishing.
- **CCH root-cause finding:** the earlier slot-driven architecture referenced `publish_enabled` only in the slot-materialisation path **for format-preference selection**, not for generation eligibility. So `publish_enabled=false` was effectively read as *"no preferred format available"* rather than *"do not generate AI drafting work."* Result: `client_publish_schedule.enabled=true` could still create slots; empty `format_preference` fell through to default format behaviour; disabled NY/PP IG could still progress toward draft/ai_job creation and token spend.

**Where the urgent cost problem actually is.** Not RSS ingestion, not Supabase data accumulation — the costly transition is **slot → draft → ai_job → Claude/OpenAI spend**. The AI-spend gate belongs between slot/demand and drafting/ai_job creation.

**Design principle.** Do **not** treat "not publishing" as equivalent to "stop collecting useful content intelligence."

**Business context (why ingestion should not auto-stop on pause).** RSS.app (top plan) and Supabase are already paid for. Continued feed/signal retention has upside: client intelligence, newsletters, prospective-client demos, historical archive, reactivation, "what we could do for you" previews. If a client leaves/pauses/declines to publish, the feed/signal data may still be valuable. The correct pause/cost-control layer is slot/demand → drafting, **not necessarily** RSS ingestion.

**Preferred control model — separate states (or equivalent policy):**
1. `ingest_enabled` — should RSS/feed/signal collection continue?
2. `slot_planning_enabled` — should the system plan demand/opportunities for this client/platform?
3. `ai_generation_enabled` / `drafting_enabled` — should the system spend Claude/OpenAI tokens to create drafts?
4. `publish_enabled` — should approved output be allowed to go live?

**Suggested modes to evaluate:**
1. **Live** — ingest=t, slot_planning=t, ai_generation=t, publish=t.
2. **Paused publishing / no AI spend** — ingest=t, slot_planning=t/limited, ai_generation=f, publish=f.
3. **Shadow/demo** — ingest=t, slot_planning=t, ai_generation=t, publish=f.
4. **Newsletter/intelligence** — ingest=t, slot_planning=maybe separate pipeline, ai_generation=optional, publish=f.
5. **Fully inactive** — ingest=f/archived, slot_planning=f, ai_generation=f, publish=f.

**Future design questions:**
1. Should feed ingestion be client-, platform-, or source-level?
2. Should slots exist for paused/non-publishing clients as visible suppressed demand?
3. Should paused clients produce: no slots / skipped slots / opportunity-demo-newsletter slots / normal slots that stop before drafting?
4. Should "demo mode" allow AI drafting while publishing stays disabled?
5. Should "newsletter mode" reuse the same slots or a separate opportunity pipeline?
6. Retention/archive policy for raw feed items, `signal_pool` rows, low-value/noisy items?
7. Should `materialise_slots` eventually call `m.is_publish_eligible`, or a different predicate such as `m.is_generation_eligible`?
8. Should generation eligibility be platform-, client-, or mode-specific?
9. What telemetry keeps suppressed demand visible without wasting tokens?

**Preferred future-state architecture:**
- Keep RSS/feed ingestion available unless explicitly disabled.
- Keep content intelligence + signal scoring available where strategically useful.
- Stop AI token spend unless the client/platform is in an allowed generation mode.
- Stop publishing unless `publish_enabled=true`.
- Preserve telemetry explaining why work was not drafted or published.
- Keep the cc-0019 `fill_pending_slots` gate as defence-in-depth + the ai-worker preflight as the final pre-token backstop.

**Spoil-sport / risk notes:**
1. Supabase bloat is real even though paid — future work needs retention/archive rules for raw feeds, `signal_pool`, low-fitness items, old slots.
2. Slots may be the wrong object for prospects/ex-clients/newsletters — consider "opportunity" or "demo/newsletter candidate" objects instead of platform publish slots.
3. `publish_enabled=false` should **not** permanently mean "no AI drafting" — there are valid cases (demo/intelligence) where drafting is useful while publishing stays off.
4. cc-0019 is a valid v1 safety patch (publish-eligibility as the AI-spend gate to stop current waste); the mature architecture should distinguish **generation** eligibility from **publishing** eligibility.
5. Do **not** widen cc-0019 mid-execution — this is a follow-up design task, not a blocker to Unit B unless PK separately decides.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated. ~5 days out. Day count not refreshed.
- **Q-nightly-health-check-v1-005 next-fire watch (v3.03)** — next natural 16:00 UTC `nightly-health-check-v1` fire under brief v3.1.1. Expected: true-stuck P1 emits clean (`condition_key=true_stuck`); parked types markdown-only. Watch `failure_count`/`skipped_count` = 0 on the EMITTED array. Does NOT block the cycle. Not a hard calendar item.
- **Cowork `nightly-health-check-v1` lifecycle gating WARN** — **CLOSED v3.01.** No longer time-bound; brief reset to `ready`.
- **Mobile-fix commit SHA backfill** — **CLOSED v3.02.2** (`d17b604`). No longer pending.
- **Dashboard Slice 0A** — **MERGED + RECORDED v3.04** (`3ec489b`). No longer pending. Not time-bound.
- No new calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v3.04: **0 D-01 fires.** T-MCP-02 cum **~92 unchanged**. State-capture exceptions: 0 (cum 1). Close-the-loop UPDATEs: 0.

---

## 🤖 Cowork automation (D182)

**v3.04 update:** Cron 82/83/85/86 firing normally. Cowork brief `nightly-health-check-v1` **v3.1.1** (Q-005 Option A condition_key contract reconciliation + emission_rule guard). Frontmatter `status: ready` for next natural 16:00 UTC fire; Q-005 OPEN non-blocking next-fire watch.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Dashboard Slice 0A (Pre-Phase 0 IA shell + Visual Tokens v1)** | Merged to `invegent-dashboard` main `3ec489b` (parent `d17b604`; squash `e65b812` + `399c087` CCB polish). Files `components/sidebar.tsx` + `tailwind.config.ts` + `app/globals.css`. Locked IA NOW/CLIENTS/CREATE/REPORTS/ADMIN; 5 status colour scales + 10 typography/spacing helpers; mobile drawer preserved. Typecheck exit 0; CCD/CCB/CCB-polish PASS. SHA + content independently verified. **NOT real Dashboard Phase 0.** | RECORDED v3.04 | **MERGED/RECORDED** | n/a (recorded) | n/a. Real Phase 0 (review §9) remains future/gated. |
| **Q-nightly-health-check-v1-005** | Brief v3.1.1: P1 true-stuck emits with `condition_key=true_stuck`; 8 P1/P2 keys PARKED (markdown-only, omitted from emission JSONB) pending Supabase-approved `friction.emission_rule` seed patch. Trail: A-005 `56e992b4` / v3.1 `7005865` / v3.1.1 `9ceb78a`. CCD read-only finding: v3.1 would have regressed (only `health_check/true_stuck` emission_rule enabled). | **P3 non-blocking, next-fire watch** | **OPEN.** Next natural fire safe. | chat → PK | Watch next fire `failure_count`/`skipped_count`=0 on EMITTED array. Close via fork (A) seed emission_rule rows + restore full §12.2a mapping + verify, OR (B) PK formally narrows scope to P1-true-stuck-only + verify. Do NOT seed rules / re-emit / close without explicit PK direction. |
| **Mobile/narrow viewport verification** | CCB 306×498 Nexus 5 DPR2 → MOBILE PASS | RECORDED v3.02 | **CLOSED/PASS** | n/a (recorded) | n/a |
| **Mobile-fix commit SHA backfill** | `d17b604` (`d17b6047411ce177d6182d86a21a79f7302459af`); files `components/sidebar.tsx` + `app/(dashboard)/operations/case-row.tsx`; typecheck PASS | RECORDED v3.02.2 | **CLOSED** | n/a (recorded) | n/a. *(v3.04: now parent of `3ec489b`.)* |
| **Cowork brief lifecycle gating WARN — `nightly-health-check-v1`** | v2.94 convention validated end-to-end vs 2026-05-20T160237Z natural fire | CLOSED v3.01 | **CLOSED** | n/a (recorded) | Brief reset to `ready`; Q-005 non-blocking carry. |
| **cc-0016 Stage D — /operations evidence display** | dashboard `9082beb`; CCB VISUAL PASS; mobile-verified v3.02 | RECORDED v3.00 | **CLOSED/PASS** | n/a (recorded) | n/a |
| **cc-0016 evidence capture/display path** | A→B→C→D complete; mobile-verified | RECORDED v3.00/v3.02 | **COMPLETE through Stage D** | n/a (recorded) | n/a |
| **cc-0016 Stage B — FAB evidence upload/read UX** | dashboard `36fe6ad`; V-A5 PASS | RECORDED v2.99 | **CLOSED/PASS** | n/a (recorded) | n/a |
| **cc-0016 Stage E — lifecycle cleanup** | Cleanup automation + dry-run report | FUTURE — separately approved only | NOT STARTED. CONSTRAINT 2 binds. Option A = scoping/dry-run design only. | PK → chat | Separate approval + dry-run before any destructive run. |
| **cc-0015 friction-pool-view brief** (Wave 7) | Authored PENDING_EXECUTION | P2, rank 1 (Gate 11 watch) | DRAFTED `9a5dc155`. Do NOT start before Gate 11 closes 2026-05-26. **NOT advanced by Slice 0A merge.** | chat → PK (Wave 7) | When window closes 2026-05-26. |
| **emission_rule seed patch (P1/P2 condition keys)** | Supabase-approved patch to seed enabled `friction.emission_rule` rows for the 8 parked v3.1.1 condition keys; then restore full §12.2a mapping in a follow-up brief patch | **P2/P3 carry (Q-005 close fork A)** | NOT STARTED. Supabase mutation — requires D-01 + PK approval. | PK → chat | When PK directs (Q-005 close fork A). Alternative: fork B (narrow scope). |
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
| **cc-0020 — Generation Eligibility & Demand Modes** | Future-design follow-up from cc-0019. Separate the controls for ingest / slot-planning / AI-drafting / publishing; the AI-spend gate belongs at the **slot→draft→ai_job** boundary, not at publishing. Do NOT stop RSS/feed ingestion just because publishing is paused (feed/signal retention has business upside). CCH root cause: the prior slot design referenced `publish_enabled` only for **format preference**, not generation eligibility, so disabled platforms still created/filled slots + spent tokens. cc-0019 is the **v1 safety patch** (uses `m.is_publish_eligible` as the spend gate); this item is the mature architecture. See FUTURE DESIGN BLOCK below. | **P3 future design, non-blocking** | NOT STARTED. Recorded 2026-05-24 (CCD, doc-only). Does NOT block cc-0019 Unit B. | PK → chat | Own design brief when PK directs. |
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (18+ occurrences; STRONG)** | Re-applied at sync close. | chat → next lesson cycle | Promote. |
| **L-v2.85-e** | push_files length budget — split-commit mitigation | **P3 (PROMOTION-CONFIRMED v2.88; streak re-baseline pending after v3.02 clobber)** | — | chat → next lesson cycle | **PROMOTE.** |
| **L41 / full-file-write clobber mitigation** | Re-read HEAD before any full-file sync write; out-of-band commits silently reverted otherwise; prefer surgical/section-scoped edits for 00_ index files | **P2 (re-exercised v3.02.1; reinforced v3.02.2 + v3.03 + v3.04 surgical recordings)** | NEGATIVE exemplar at v3.02; POSITIVE repair v3.02.1 + clean surgical edits v3.02.2 + v3.03 + v3.04. | chat → next lesson cycle | **Pair-promote with L-v2.85-e. Strong candidate.** |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | P3 (4 occurrences) | Promotion-eligible. | chat → next lesson cycle | Promote. |
| **L-v2.94 convention (NEW)** | brief lifecycle ready→fire→review_required→PK observe→ready | P3 (1 natural cycle v3.01) | Confirm across 2-3 more cycles. | chat → next session | Watcher. |
| **L-v3.02-a (NEW)** | Mobile breakpoint verification after primary operator-surface change | P3 (1 occurrence v3.02) | Watcher. | chat → next session | Promote after one more occurrence. |
| **L-v3.03-a (NEW)** | Verify downstream acceptance gates (e.g. emission_rule), not just function input contract, before declaring a contract-reconciliation patch correct | P3 (1 occurrence v3.03 — CCD caught v3.1 emission_rule gap) | Watcher. | chat → next session | Promote after one more occurrence. |
| **L-v3.04-a (NEW)** | Before recording a cross-repo merge/close as fact, independently verify commit SHA + content (list_recent_commits + live file read); do not record on directive payload faith | P3 (1 occurrence v3.04) | Watcher. | chat → next session | Promote after one more occurrence. Pair with L41 / no-fabrication discipline. |
| **L62 reinforcement** | Type-B vs Type-C D-01 handling | P3 (strongly reinforced via cc-0016 6-fire series) | — | chat → next lesson cycle | Strong empirical record. |
| **L-v2.88-a** | Identical PK-directive loop watcher | P3 (watcher CLOSED for cc-0016; re-fired at v3.02 re-send — recognised + not re-executed) | 3 cumulative occurrences now (v2.88 + v2.91 + v3.02 re-send). | chat → next lesson cycle | Pair-promote with L-v2.85-e if recurs. |
| **L-v2.90-a-f** | V-D fixture / arity DROP / etc. | P3 (not re-exercised) | Watchers. | chat → next session | Watcher. |
| **L-v2.78-a / L-v2.81-a / L47 / L-v2.84-a-d / L-v2.85-b/c/d / L-v2.86-a-e / L-v2.88-b/c/d / L-v2.89-a** | Various candidates | P3 carry | Unchanged. | chat → next session/lesson cycle | Various. |
| **Other carries** | Minor doc patches (cc-0010A/0011/0012) / F-K-SCHEMA-REGISTRY-R-STALE / AI cost view / Publisher latent config / M8b / 94-row cohort / F-CRON-AUTO-APPROVER-SECRET-INLINE / morning-inbox-sweep-v1 / 22 escalated m.chatgpt_review rows / Memory cap 19/30 / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged. | various | various |

**Closed v3.04:** Dashboard Slice 0A → MERGED/RECORDED at `3ec489b` (cosmetic Pre-Phase 0 shell; NOT real Phase 0). No core/dashboard rank change.
**Closed v3.03:** none (recording-only cycle; Q-005 stays OPEN by design).
**Closed v3.02:** Mobile/narrow viewport verification → CLOSED/PASS (CCB 306×498 DPR2). **Mobile-fix commit SHA backfill → CLOSED v3.02.2 (`d17b604`).**
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

**v3.04 state changes:**
- **Dashboard Slice 0A MERGED + RECORDED** at `3ec489b` (parent `d17b604`; squash `e65b812` + `399c087`). Pre-Phase 0 / Gate-11-window sidebar IA shell + Visual Tokens v1. NOT real Dashboard Phase 0 (review §9 groundwork future/gated). Documentation-only; SHA + content independently verified.
- **L-v3.04-a NEW lesson candidate** registered (independently verify cross-repo merge SHA + content before recording as fact).
- **L41 reinforced v3.04** — surgical sync recording (both `00_` HEADs re-read; per-file blob-SHA).
- No decisions.md change.

**v3.03 state changes (preserved):**
- **Q-005 Option A trail RECORDED** — A-005 `56e992b4` / v3.1 `7005865` / v3.1.1 `9ceb78a`. Brief now **v3.1.1**. Q-005 OPEN, non-blocking, next-fire watch. Close fork: seed emission_rule rows + restore mapping, OR formally narrow scope to P1-true-stuck-only.
- **emission_rule seed patch** registered as Active carry (Q-005 close fork A; Supabase mutation, requires D-01 + PK approval).
- **L-v3.03-a NEW lesson candidate** registered (verify downstream acceptance gates before declaring a contract-reconciliation patch correct).
- **L41 reinforced v3.03** — surgical sync recording (HEAD re-read; per-file blob-SHA).
- No decisions.md change.

**v3.02 (+v3.02.1 +v3.02.2) state changes (preserved):**
- **Mobile/narrow viewport verification CLOSED/PASS v3.02** (CCB 306×498 DPR2). Removed from open P3 carries.
- **Mobile-fix commit SHA CLOSED v3.02.2** — `d17b604`. No longer pending.
- **L-v3.02-a NEW lesson candidate** registered.
- **L41 re-exercised v3.02.1** — full-file push from stale content clobbered v3.01; repaired read-HEAD-first; v3.02.2 clean surgical backfill reinforced the discipline.
- **Cowork brief lifecycle gating WARN CLOSED v3.01** (restored after original-v3.02 clobber).
- cc-0016 Stage A/B/C/D all closed; evidence path complete + mobile-verified; only Stage E remains (future/separately-approved).
- cc-0015 Gate 11 watch at rank 1 (closes 2026-05-26). PRV unchanged. Q-005 non-blocking carry.
- T-MCP-02 cum ~92 unchanged. State-capture exceptions cum 1 unchanged.
- **No decisions.md change.**

---

## 🧊 Frozen / Deferred

Unchanged. **cc-0016 Stage E lifecycle cleanup** — future/separately-approved-only. **Backend/shared-metrics refactor** — deferred carry. **emission_rule seed patch** — Q-005 close fork A; not started; Supabase mutation requires D-01 + PK approval. **Real Dashboard Phase 0 (review §9 schema groundwork)** — future/gated (S30 + M5–M8 prerequisites); Slice 0A is NOT this.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e + L-v2.88-a-d + L-v2.89-a + L-v2.90-a-f + L-v2.94 + L-v3.02-a + L-v3.03-a + L-v3.04-a candidates carried.

- **L41**: re-exercised v3.02.1 (full-file-write clobber → read-HEAD-first repair); v3.02.2 + v3.03 + v3.04 clean surgical edits. Strong pair-promote candidate.
- **L62**: strongly reinforced via cc-0016 6-fire D-01 series. Not newly exercised (no D-01).
- **L-v2.83-a**: 18+ occurrences. STRONG.
- **L-v2.85-e**: PROMOTION-CONFIRMED v2.88; streak re-baseline pending after v3.02 clobber.
- **L-v2.88-a**: watcher CLOSED for cc-0016; re-fired at v3.02 re-send (recognised; not re-executed). 3 cumulative.
- **L-v2.94 convention**: NEW candidate (v3.01).
- **L-v3.02-a**: NEW candidate (v3.02).
- **L-v3.03-a**: NEW candidate (v3.03) — verify downstream acceptance gates before declaring a contract-reconciliation patch correct.
- **L-v3.04-a**: NEW candidate (v3.04) — independently verify cross-repo merge SHA + content before recording as fact.
- **L-v2.90-a-f**: watchers.

**Highest-priority promotions next lesson cycle: L41 + full-file-write mitigation (pair), L-v2.85-e, L-v2.85-a, L-v2.83-a.**

---

## v3.04 honest limitations

- **Slice 0A merge recorded from verified facts, but chat did not run the dashboard typecheck/Vercel itself** — typecheck exit 0 + CCD/CCB/CCB-polish PASS + Vercel success are recorded per the directive + the merge commit message; chat independently verified the commit SHA, parent, file scope (`list_recent_commits`) and the Slice 0A sidebar content (live `sidebar.tsx` read), but did not re-run the build or the visual QA.
- **`tailwind.config.ts` + `app/globals.css` merge content not separately re-read** — their inclusion in the 3-file squash is taken from the verified commit message + diff scope, not an independent per-file read this cycle (sidebar.tsx was read directly).
- **Slice 0A is NOT real Dashboard Phase 0** — review §9 schema groundwork remains future/gated; recorded explicitly to prevent the cosmetic shell being mistaken for the data-backed surfaces.
- **Cross-file recording only** — sync_state + action_list updated; the v3.04 per-session detail file (`docs/runtime/sessions/2026-05-21-v3.04-dashboard-slice-0a-merged.md`) is referenced but to be authored at session close (G1 4-way sync completion item). **Dashboard repo `roadmap/page.tsx` PHASES NOT touched** (per directive + 4-way-sync note: PHASES reconciliation remains a separate deferred item; Slice 0A directive explicitly excluded Roadmap/PHASES).
- **Production mutations: 0.** Supabase: 0. apply_migration: 0. EF deploys: 0. dashboard edits: 0. emission_rule rows seeded: 0.
- **No decisions.md change. No Stage E. No cc-0015 start. No PRV closure. No re-emission. No Q-005 closure.**
- T-MCP-02 cum ~92 unchanged (0 D-01). State-capture exceptions cum 1. Memory cap 19/30 unchanged. Gate 11 day count not refreshed (closes 2026-05-26).

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
- **v3.02 (2026-05-21T00:42Z, `a08945d3`): Dashboard mobile/narrow viewport verification CLOSED/PASS** — CCB 306×498 Nexus 5 DPR2 → MOBILE PASS. Mobile-fix SHA PENDING. L-v3.02-a NEW. **DEFECT: this commit's full-file push reverted v3.01's `00_` index/ranking content and falsely claimed L41 mitigation.**
- **v3.02.1 (2026-05-21, reconciliation patch): restored v3.01 `00_` content clobbered by v3.02 + corrected the false L41-mitigation claim. Read-HEAD-first per-file `create_or_update_file` patches: sync_state `958b056f`, action_list `20fb7390`, v3.02 session file.**
- **v3.02.2 (2026-05-21, SHA backfill): mobile-fix commit SHA `d17b604` backfilled across v3.02 session file (`efaa4688`), sync_state (`12e618d0`), action_list (`059c081`). Surgical read-HEAD-first per-file edits.**
- **v3.03 (2026-05-21, Q-005 Option A recording): A-005 `56e992b4` (Option A ratified) + v3.1 brief `7005865` (explicit condition_key, 9-key mapping) + CCD read-only finding (v3.1 would fail live emission_rule acceptance; only health_check/true_stuck enabled) + v3.1.1 guard `9ceb78a` (true_stuck restored; 8 keys PARKED markdown-only). Brief now v3.1.1. Q-005 OPEN, non-blocking, next-fire watch; close fork A (seed rules + restore mapping + verify) or B (narrow scope + verify). Recorded into sync_state (`43868403`) + action_list via read-HEAD-first surgical edits (HEAD `9ceb78a`; per-file blob-SHA passed).**
- **v3.04 (2026-05-21, Dashboard Slice 0A merge recording): Dashboard Slice 0A (Pre-Phase 0 sidebar IA shell + Visual Tokens v1) MERGED to invegent-dashboard main at `3ec489b6fb1e4ad706aac9d32f7fefa4ad43b9c5` (parent `d17b604`; squash of `e65b812` + `399c087` CCB polish; committed 2026-05-21T08:17:18Z; files `components/sidebar.tsx` + `tailwind.config.ts` + `app/globals.css`; typecheck exit 0; CCD/CCB/CCB-polish PASS). Commit SHA + content independently verified (Invegent GitHub `list_recent_commits` + live `sidebar.tsx` read). Slice 0A is NOT real Dashboard Phase 0. Recorded into sync_state (`160405e6`) + this action_list commit via read-HEAD-first surgical edits (both `00_` HEADs re-read — sync_state `348c0a6e`, action_list `5734b407`). cc-0015 Gate 11 watch preserved rank 1; Stage E / PRV / Q-005 preserved. 0 Supabase / 0 dashboard edits / 0 Phase 0 schema / 0 cc-0015 start / 0 Stage E / 0 PRV / 0 Q-005 closure / 0 Roadmap/PHASES / 0 decisions.md change / 0 D-01.**
