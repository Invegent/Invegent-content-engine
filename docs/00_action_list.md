# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-24 Sydney (**v3.05 — YouTube OAuth Production restore.** Root cause definitively found: the Google OAuth app was in **Testing** publishing status → refresh tokens capped at **7 days** (NY token lasted 7.00d, PP 7.92d after the 5 May reconnect). PK moved the OAuth app → **Production** + re-exchanged tokens (NY token_updated_at 10:48:22, PP 10:49:05 UTC); two single-draft live tests **published successfully** (PP `ma6EG1fz4XQ` 10:57 UTC, NY `qp-ZGm8lNIo` 11:02 UTC) confirming both channels refresh with no `invalid_grant`. Backlog **released** (fresh ≥12 May → `generated`: NY 6 + PP 7 = 13, draining 2/tick jobid 34) + **soft-retired** (stale <12 May → `archived_stale`: NY 3 + PP 11 = 14; retire-not-delete to keep audit + dodge FK risk). Migrations `yt_token_verify_reset_one_pp_draft` / `yt_token_verify_reset_one_ny_draft` / `yt_backlog_release_fresh_softretire_stale` (all 20260524; draft `video_status` only, guarded). 2 publisher invokes (real publishes). NEW findings F-YT-OAUTH-TESTING-MODE (root cause RESOLVED+recorded), F-YT-FAILED-NO-RETRY (publisher marks transient auth failure terminal `failed` → silently freezes backlog; candidate brief), F-YT-EXPIRY-DISPLAY-FAKE (callback hardcodes now+5y expiry → fake "Valid 2031"). Also **cc-0019 brief** (publish-eligibility gate before AI draft generation) authored `81cb414` + hardened `01a6cdf`; plan_review `a75c78f6`→`ff05c65e` clean — **brief only, NOT implemented**. 4 D-01 (2 plan_review + 2 sql_destructive `82443c8c`/`5f7bfc52`). 0 cron change / 0 EF deploy / 0 client enablement / 0 hard delete / 0 friction.* / 0 cc-0015 start / 0 Stage E / 0 Q-005 closure / 0 decisions.md / 0 dashboard edit. Dashboard roadmap/PHASES leg N/A (operational, no phase change). OWED: pre-compaction IG-publish-restore arc 4-way close.) **Prior: v3.04 — Dashboard Slice 0A MERGED to `invegent-dashboard` main at `3ec489b`** (Pre-Phase 0 / Gate-11-window sidebar IA shell + Visual Tokens v1; NOT real Phase 0). **Today/Next 5 core ranks (unchanged v3.02–v3.05)**: **cc-0015 Gate 11 watch → rank 1 (closes 2026-05-26)**; cc-0016 Stage E scoping/dry-run design ONLY → rank 2 conditional; Wave 0f scoping → rank 3; PRV → rank 4 (deferred); close-the-loop → rank 5.

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v3.01.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + L33–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + **L-v2.83-a (STRONG; 18+)** + L-v2.84-a/b/c/d + L-v2.85-a (HIGH-SIGNAL; 4 occurrences) + L-v2.85-b/c/d + **L-v2.85-e PROMOTION-CONFIRMED** + 5 L-v2.86 candidates + **L-v2.88-a** + L-v2.88-b/c/d + L-v2.89-a + **L-v2.90-a through L-v2.90-f** + **L62 strongly reinforced (cc-0016 6-fire series; v3.05 both YT sql_destructive partial/type-c)** + **L-v2.94 convention NEW candidate** + **L-v3.02-a / L-v3.03-a / L-v3.04-a NEW candidates** + **L-v3.05-a NEW candidate (record root CAUSE not just symptom; re-run stale audits against live data on pushback)** + **L41 re-exercised v3.02.1 + reinforced v3.03 + v3.04 + v3.05**. **D-IOL-001 (v2.77)** + **D-CC-0017B-Q1** carried.

**v3.05 ADDITIONS:**

- **YouTube publishing RESTORED.** Root cause definitively identified + the fix verified by two live publishes.
  - **Root cause: OAuth app in Google "Testing" publishing status → refresh tokens capped at 7 days.** NY token lasted 7.00d, PP 7.92d after the 5 May reconnect (`invalid_grant: Token expired or revoked`). Two independent accounts dying at the 7-day boundary = the Testing-mode fingerprint. The dashboard's "Expires 2031" is a hardcoded `now()+5y` placeholder in `app/api/youtube/callback/route.ts` ("tokens don't expire"), cosmetic, never read by the publisher. The stored token is a genuine `1//` refresh token, correctly stored. **The cause was never recorded before — only the symptom (reconnect token) — so it recurred ≥3×. Now recorded.**
  - **Fix:** PK moved the OAuth app Testing→Production in Google Cloud Console + re-exchanged tokens (NY token_updated_at 2026-05-24 10:48:22 UTC, PP 10:49:05 UTC; both `1//`, 103 chars).
  - **Verification (governed):** D-01 `82443c8c` (sql_destructive). mig `yt_token_verify_reset_one_pp_draft_20260524` (PP draft `2afce74e…` `failed→generated`) → invoke req 126325 → **published `ma6EG1fz4XQ`** (10:57:23 UTC, `m.post_publish` row). mig `yt_token_verify_reset_one_ny_draft_20260524` (NY draft `b9860637…`) → invoke req 126339 → **published `qp-ZGm8lNIo`** (11:02:24 UTC). Both tokens refresh, no `invalid_grant`.
  - **Backlog:** D-01 `5f7bfc52` (sql_destructive). mig `yt_backlog_release_fresh_softretire_stale_20260524` (two guarded UPDATEs, cutoff 2026-05-12): released ≥12 May (`failed→generated`: NY 6 + PP 7 = 13, draining 2/tick jobid 34); soft-retired <12 May (`failed→archived_stale`: NY 3 + PP 11 = 14, terminal/publisher-invisible/reversible — PK chose retire over hard-delete to preserve content+audit + avoid FK risk on `slot.filled_draft_id`/`slot_fill_attempt`/`ai_job`). Untouched: failed-out-of-guard NY 3 + PP 9 (non-uploadable format / non-approved).
  - **youtube-publisher v1.6.0 unchanged.** SELECT predicate `video_status='generated'` AND `approval_status='approved'` AND `youtube_video_id IS NULL` AND `video_url NOT NULL` AND `recommended_format IN (4 kinetic/stat)`, limit 2. **F-YT-FAILED-NO-RETRY:** catch handler sets transient auth failure to terminal `failed` (never re-selected) → a token outage silently bricks the whole rendered backlog. Candidate brief.
  - **Both D-01s partial/type-c, escalated→PK, PK pre-approved.** NY test reused PP verdict `82443c8c` (same action/guard/arc, same UTC day).

- **cc-0019 brief — publish-eligibility gate before AI draft generation (BRIEF ONLY).**
  - Read-only audit found `m.fill_pending_slots` creates a skeleton `post_draft` + `queued` `ai_job` (token spend) with no publish-eligibility check → disabled NY/PP IG generated ~12% wasted ai_jobs/7d. Bonus: `m.materialise_slots` reads `publish_enabled` only inside the per-platform format-preference lookup (NULL format → slot still inserted, defaults `image_quote`) — disablement wired to format-selection, not skip. Two switches never unified (`client_publish_profile.publish_enabled` vs `client_publish_schedule.enabled`).
  - Brief `docs/briefs/cc-0019-publish-eligibility-gate.md` — `81cb414` (create) → `01a6cdf` (harden §4 eligibility transition handling). Design: `m.is_publish_eligible(client_id, platform)` SECURITY DEFINER + fill-gate in `fill_pending_slots` + ai-worker preflight. Cron dimension out of v1 (operational: `publish_enabled=false` also stops generation).
  - plan_review `a75c78f6` (partial/type-c "add transition fail-safes") → brief hardened → re-fire `ff05c65e` (**agree/clean**).
  - **NOT implemented.** Execution gated on sql_destructive (Unit A migration recreating `fill_pending_slots` + new function) + ef_deploy (Unit B ai-worker) D-01s + PK approval, in a separate supervised session.

- **Items explicitly preserved v3.05:**
  - cc-0015 Gate 11 watch — rank 1; window closes 2026-05-26; do NOT start before.
  - cc-0016 Stage E — future/separately-approved-only.
  - PRV brief authoring — deferred per D-FR-RECON-001 §7.D.
  - Q-nightly-health-check-v1-005 — OPEN, non-blocking, next-fire watch (brief v3.1.1).
  - Dashboard Slice 0A merged at `3ec489b` (cosmetic, NOT Phase 0); mobile CLOSED/PASS; backend/shared-metrics refactor deferred.

- **Hard stops respected v3.05:**
  - cc-0019 brief only — 0 gate migration applied, 0 EF deploy, `fill_pending_slots` unchanged, `is_publish_eligible` NOT created
  - YT mutations: exactly the 3 listed migrations (draft `video_status` only, bounded+guarded) + 2 publisher invokes (real publishes)
  - 0 cron change / 0 EF deploy / 0 client enablement change / 0 queue/profile mutation / 0 hard delete
  - 0 friction.* write / Q-005 untouched / cc-0015 not started / cc-0016 Stage E not started / CFW+Invegent untouched
  - 0 decisions.md change / 0 memory edits / 0 dashboard edit (roadmap/PHASES leg N/A — operational session)
  - 0 full-file rewrite from stale context (session file new `f9ddd51`; sync_state + action_list patched read-HEAD-first with blob SHAs passed — sync_state `7d2b0eb8`, action_list `ecaf50f8`)

- **Closed Active rows v3.05:** YouTube publishing restore (RESTORED/VERIFIED — both channels publishing); cc-0019 plan_review (CLEAN — brief ready for execution). Q-005 stays OPEN by design; ranks unchanged.
- **NO decisions.md change v3.05.**
- **Production mutations: 3 apply_migration (draft video_status only) + 2 publisher invokes. D-01 fires: 4 (2 plan_review + 2 sql_destructive). T-MCP-02 cum: ~96 (v3.05 +4), needs re-baseline incl. unrecorded pre-compaction IG arc (~+5). State-capture exceptions: 1 unchanged.**

**v3.04 ADDITIONS (preserved):**

- **Dashboard Slice 0A MERGED to `invegent-dashboard` main — RECORDED (documentation-only).** Dashboard main HEAD `3ec489b6fb1e4ad706aac9d32f7fefa4ad43b9c5` (parent `d17b604`; squash of `e65b812` + `399c087`); files `components/sidebar.tsx` + `tailwind.config.ts` + `app/globals.css`; typecheck exit 0; CCD/CCB/CCB-polish PASS; SHA + content independently verified (Invegent GitHub `list_recent_commits` + live `sidebar.tsx` read). Locked IA NOW/CLIENTS/CREATE/REPORTS/ADMIN; 5 status colour scales + 10 typography/spacing helpers additive; mobile drawer preserved. **NOT real Dashboard Phase 0** (review §9 groundwork future/gated). No routes/redirects/Roadmap/PHASES touched.
- **Production mutations: 0. D-01 fires: 0.**

**v3.03 ADDITIONS (preserved):**

- **Q-005 Option A resolution trail RECORDED (brief now v3.1.1; Q-005 stays OPEN).** A-005 `56e992b4` → v3.1 `7005865` (9-key mapping) → CCD finding (v3.1 would fail live emission_rule acceptance; only `health_check/true_stuck` enabled) → v3.1.1 `9ceb78a` (true_stuck restored; 8 keys PARKED markdown-only). Close fork: (A) seed `friction.emission_rule` rows + restore full §12.2a mapping + verify; OR (B) PK formally narrows scope to P1-true-stuck-only + verify. Does NOT block the next cycle.
- **Production mutations: 0. D-01 fires: 0.**

**v3.02 (+v3.02.1 +v3.02.2) ADDITIONS (preserved):**

- **Mobile/narrow viewport verification RECORDED CLOSED/PASS** (CCB 306×498 Nexus 5 DPR2). **Mobile-fix commit SHA backfilled v3.02.2** — `d17b604`. **v3.02.1 reconciliation:** original v3.02 full-file push clobbered v3.01 `00_` content; repaired read-HEAD-first; L41 re-exercised.
- **Production mutations: 0. D-01 fires: 0.**

**v3.01 ADDITIONS (preserved):**

- **Cowork brief lifecycle gating WARN CLOSED.** v2.94 convention validated end-to-end vs the 2026-05-20T16:02:37Z natural fire. Brief reset to `ready`. Q-005 remains OPEN, non-blocking. Core rank 1 = cc-0015 Gate 11 watch.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | 0 (recon CLOSED v2.93; PHASES streak CLOSED v2.95; top alert bar CLOSED v2.96; Stage B CLOSED v2.99; Stage D CLOSED v3.00; Cowork WARN CLOSED v3.01; mobile viewport CLOSED v3.02; **YouTube publishing RESTORED v3.05**). *(Q-005 P3 non-blocking; F-YT-FAILED-NO-RETRY + F-YT-EXPIRY-DISPLAY-FAKE P2/P3 candidate-brief, not counted as open P0/P1.)* | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~40h (cumulative v2.83–v3.05) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v3.05 cycle: ~1.5h** (YouTube full-depth audit + root-cause + 2 live test publishes + backlog release/retire + cc-0019 brief authoring/harden/review + full session close). 3 apply_migration (draft video_status only). 2 publisher invokes. 4 D-01 fires. **State-capture exception count: 0** (cumulative 1).
**v3.04 cycle: ~0.4h** (dashboard Slice 0A merge verification + cross-repo recording; docs-only). 0 schema mutations. 0 D-01.

---

## ⭐ Today / Next 5 (core ICE ranks)

> Last rebuilt: 2026-05-24 Sydney (core ranks carried unchanged from v3.02; v3.05 added YouTube + cc-0019 carries below the core table — no core rank change).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0015 Gate 11 watch** | **P2 carry, rank 1 (from v3.01)** | Time-bound. Window closes **2026-05-26** (~2 days out from 2026-05-24). Passive observation; when gate clears, cc-0015 friction-pool-view UI (Wave 7) unblocks as the leading dashboard build. | PK / chat | Observe close-date; no action needed until 2026-05-26. |
| 2 | **cc-0016 Stage E scoping/dry-run design ONLY** (conditional — Option A) | **P2, rank 2 conditional** | cc-0016 evidence path complete A→B→C→D + mobile-verified; only Stage E (lifecycle cleanup) remains. Option A = NON-MUTATING design + dry-run spec. First destructive run still requires separate PK approval. | PK → chat | PK picks. If A: author Stage E dry-run design (no execution). |
| 3 | **Wave 0f scoping** | **P3 brief-authoring only, opportunistic during Gate 11 window** | Non-mutating. Candidates: items B/E/F/G from cc-0017e + `purge_test_case` helper case_history extension (L-v2.90-d). | chat → PK | When PK directs (during Gate 11 window → 2026-05-26). |
| 4 | **Platform Reconciliation View brief authoring** | **P2 carry, deferred per D-FR-RECON-001 §7.D** | Defer until corrected friction-register baseline accepted. | PK → chat | When PK directs. |
| 5 | **5-row close-the-loop batch sweep / Pre-sales criteria / `purge_test_case` helper case_history extension** | **P2/P3 carry** | Outstanding close-the-loop UPDATEs (net not recomputed). | chat → PK | When PK directs. |

**YouTube carries (NEW v3.05, not core-ranked — operational):**
- **YT backlog drain watch** — 13 `generated` draining 2/tick via jobid 34 (`:15/:45`). Verify `m.post_publish` rows land + `generated` counts down; re-promote any transient failure. (PK released all fresh at once to watch the real pipeline.)
- **YT token durability** — spot-check NY/PP tokens still work past ~31 May (confirms Production removed the 7-day cap, not just reset the clock).
- **CFW + Invegent YouTube onboarding** — never connected (no `c.client_channel` YT row, no refresh token); CFW failed drafts also `approval_status='published'`. First-time setup, not a reconnect.
- **F-YT-FAILED-NO-RETRY brief** — candidate (retryable vs terminal failure / retry sweep).
- **F-YT-EXPIRY-DISPLAY-FAKE cleanup** — candidate (dashboard callback hardcoded 5y expiry).
- **cc-0019 execution** — when PK directs: sql_destructive (Unit A migration) + ef_deploy (Unit B ai-worker) + PK approval. Brief reviewed clean (`ff05c65e`).

**Carries flagged (NOT actively ranked):** **Q-nightly-health-check-v1-005 (OPEN, non-blocking, next-fire watch; brief v3.1.1)**; **OWED IG-publish-restore arc 4-way close (pre-compaction 2026-05-24)**; 3 no-fire scheduler days (2026-05-16/18/19, P3 informational).

**Time-bound nudge:** cc-0015 Gate 11 observation window closes **2026-05-26** (~2 days out).

## ⭐ Dashboard work (separately ranked; v3.04 status note)

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| D1 | **cc-0015 friction-pool-view UI** (slice 5) | P2 carry | Backend already shipped. Gated on Gate 11 closing 2026-05-26. Leading dashboard build once gate clears. NOT advanced by Slice 0A. | PK → chat (Wave 7) | When window closes 2026-05-26. |
| D2 | **Platform Reconciliation View surface** (slice 7) | P2 carry | PRV brief deferred per D-FR-RECON-001 §7.D. | PK → chat | When PRV brief authored + PK-accepted. |

*(Mobile viewport CLOSED/PASS v3.02. **Dashboard Slice 0A IA shell + Visual Tokens v1 MERGED v3.04 at `3ec489b` — Pre-Phase 0 cosmetic, NOT a ranked build and NOT real Phase 0.**)*

**Deferred carry (not actively ranked):** Backend/shared-metrics refactor.

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Secondary follow-up (P3)**: 3 no-fire scheduler days for `nightly-health-check-v1` — 2026-05-16, 2026-05-18, 2026-05-19.

**Passive observation v3.05**: Cron 82-86 firing normally. **jobid 34 (youtube-publisher, `15,45 * * * *`) active — now draining the released YT backlog (2/tick).** Brief `nightly-health-check-v1` v3.1.1 — next 16:00 UTC fire safe. Dashboard `dashboard.invegent.com`: slices 1–3 + 4A–4B + cc-0016 Stage B/D shipped + verified; mobile-verified; Slice 0A IA shell merged at `3ec489b`. V-A5 smoke artefacts retained — do not delete.

---

## 🟢 cc-0019 publish-eligibility-gate — STATUS BLOCK (NEW v3.05)

**Status: BRIEF authored + hardened + plan_review CLEAN. NOT implemented.**

| Item | Value |
|---|---|
| Brief | `docs/briefs/cc-0019-publish-eligibility-gate.md` — `81cb414` (create) → `01a6cdf` (harden §4) |
| Problem | `fill_pending_slots` spends AI tokens (skeleton draft + queued ai_job) with no publish-eligibility check → ~12% waste on disabled NY/PP IG (7d) |
| Design | `m.is_publish_eligible(client_id, platform)` SECURITY DEFINER + fill-gate (skip→`slot_fill_attempt` decision='skipped' skip_reason='publish_path_disabled', no draft/ai_job) + ai-worker preflight (abandon queued job pre-model-call). Cron dimension out of v1. |
| plan_review | `a75c78f6` (partial/type-c) → re-fire `ff05c65e` (agree/clean) |
| Execution units | Unit A: apply_migration recreating `fill_pending_slots` + new function (sql_destructive D-01). Unit B: ai-worker EF deploy (ef_deploy D-01). PK approval per unit. |
| Status | DRAFT — NOT implemented. `fill_pending_slots` unchanged; `is_publish_eligible` not created. |

---

## 🟢 YouTube publishing — STATUS BLOCK (NEW v3.05 — RESTORED)

**Status: RESTORED + verified. Both channels (NY, PP) publishing. Backlog draining + stale soft-retired.**

| Item | Value |
|---|---|
| Root cause | OAuth app in Google **Testing** publishing status → refresh tokens capped at 7 days (NY 7.00d / PP 7.92d post-5 May reconnect) |
| Fix | PK moved OAuth app → Production + re-exchanged tokens (NY 10:48 / PP 10:49 UTC) |
| Verified publishes | PP `ma6EG1fz4XQ` (10:57 UTC) / NY `qp-ZGm8lNIo` (11:02 UTC) |
| Backlog | generated NY 6 + PP 7 = 13 (draining 2/tick jobid 34); archived_stale NY 3 + PP 11 = 14; failed-out-of-guard NY 3 + PP 9 (untouched) |
| Migrations | `yt_token_verify_reset_one_pp_draft` / `yt_token_verify_reset_one_ny_draft` / `yt_backlog_release_fresh_softretire_stale` (all 20260524) |
| D-01 | `82443c8c` (PP+NY tests) / `5f7bfc52` (batch) |
| F-YT-FAILED-NO-RETRY | publisher v1.6.0 catch sets transient auth failure to terminal `failed` (never re-selected) → freezes backlog silently. Candidate brief. |
| F-YT-EXPIRY-DISPLAY-FAKE | callback hardcodes `token_expires_at=now()+5y` → fake "Valid 2031" masks dead tokens. Candidate cleanup. |
| CFW + Invegent | never connected (no YT channel row, no token). Separate onboarding. |
| Durability | unproven until past ~31 May (Production-issued token should not carry the 7-day cap). |

**Do NOT:** reconnect tokens as the "fix" if YT breaks at a clean 7-day boundary (cause = publishing status, not token); bulk-reset `archived_stale`→`generated` without PK direction; treat `failed` YT drafts as auto-recoverable (F-YT-FAILED-NO-RETRY).

---

## 🟢 cc-0016 friction-capture-evidence — STATUS BLOCK (v3.02 — Stage A/B/C/D closed + mobile-verified)

**Status: Stage A CLOSED + Stage C CLOSED + Stage B CLOSED/PASS + Stage D CLOSED/PASS. Evidence path COMPLETE through Stage D; mobile-verified. Stage E future/separately-approved-only.**

| Stage | Scope | Status | Reference |
|---|---|---|---|
| A | bucket + attachments column + 2 CHECK + index + view + GRANT | CLOSED | D-01 `6f2b8b1a`/`f573e684`/`9eb35144`; applied v2.97 |
| C | DROP+CREATE emit_event 13-arg + fn_emit_manual_event 8-arg; cc-0017b preserved | CLOSED | D-01 `56e65bb2`/`dbabb576`/`358c6fdd`; applied v2.98 |
| B | FAB evidence upload/read UX | CLOSED/PASS v2.99 | dashboard `36fe6ad`; V-A5 PASS |
| D | /operations evidence display | CLOSED/PASS v3.00 | dashboard `9082beb`; mobile-verified v3.02 (`d17b604`) |
| E | lifecycle cleanup automation + dry-run report | FUTURE — separately approved only | Stage A CONSTRAINT 2 |

**V-A5 evidence (DO NOT DELETE):** no-attach event `2120b2f7-219f-4d0d-be56-512d81430873`; attach event `75f0c981-1180-4047-9aa3-f725bec6eb9b`; object `friction-evidence/9e314151-be65-434e-8588-c913012f6591/0_va5-smoke.png`.

---

## 🟢 Dashboard slices — STATUS BLOCK (v3.04)

**Slices 1–3 + 4A–4B RECORDED. cc-0016 Stage B + Stage D CLOSED/PASS. Mobile viewport CLOSED/PASS. Slice 0A (Pre-Phase 0 IA shell + Visual Tokens v1) MERGED at `3ec489b`.** Slice 1 `af60953` / Slice 2 `de4501b`+`37008e5` / Slice 3 `991a92b` / Slice 4A `cd02402` / Slice 4B `f5a980f` / Stage B `36fe6ad` / Stage D `9082beb` / mobile fix `d17b604` / Slice 0A `3ec489b`. Remaining: cc-0015 UI (D1, gated on Gate 11); PRV (D2, deferred). Real Phase 0 future/gated.

---

## 🟢 Friction Register Consolidation Plan v1 — STATUS BLOCK (unchanged)

Wave 0 + 0d + 0e COMPLETE. Gates 10+12+13 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE — ~2 days out. Wave 0f scoping rank 3 carry. cc-0016 Wave 8 Stage A/B/C/D closed; only Stage E (future/separately-approved) remains.

---

## 🟢 Cowork brief `nightly-health-check-v1` — STATUS BLOCK (v3.03 — v3.1.1)

**Brief version: v3.1.1.** Lifecycle gating WARN CLOSED v3.01; frontmatter `status: ready`. Q-005 Option A trail: A-005 `56e992b4` → v3.1 `7005865` → CCD finding → v3.1.1 `9ceb78a`. Next 16:00 UTC fire SAFE (true-stuck P1 emits with `condition_key=true_stuck`; 8 parked keys markdown-only). **Q-005 OPEN, non-blocking, next-fire watch.** Close fork (A) seed emission_rule + restore mapping + verify, OR (B) narrow scope + verify.

---

## 🟢 Process Upgrades — STATUS BLOCK (v3.05)

**L41**: re-exercised v3.02.1 + reinforced v3.02.2/v3.03/v3.04 + **reinforced v3.05** (session file new; sync_state + action_list patched read-HEAD-first with blob SHAs passed). Negative-then-positive exemplar.
**L62**: strongly reinforced via cc-0016 6-fire series; **v3.05: reinforced again** — both YT sql_destructive D-01s (`82443c8c`/`5f7bfc52`) returned partial/type-c echoes (corrected_action = the verification already planned), satisfied + proceeded on PK approval.
**L-v2.83-a**: 18+ occurrences. STRONG.
**L-v2.85-e**: PROMOTION-CONFIRMED v2.88; streak re-baseline pending.
**L-v2.88-a**: watcher; 3 cumulative.
**L-v2.94 / L-v3.02-a / L-v3.03-a / L-v3.04-a**: NEW candidates (watchers).
**L-v3.05-a**: NEW candidate (v3.05) — **record the root CAUSE, not just the symptom** (YouTube re-diagnosed as "reconnect token" ≥3× because the Testing-mode 7-day cause was never written into the durable record); sub-lesson: **re-run a stale audit against live data when the user reports the situation changed** (the 1 May YT audit was outdated; PK was right). 1 occurrence; watcher.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated. ~2 days out.
- **YT token durability spot-check (v3.05)** — verify NY/PP YT tokens still work past ~31 May (proves Production removed the 7-day cap). Not a hard calendar item; soft watch.
- **Q-nightly-health-check-v1-005 next-fire watch (v3.03)** — next natural 16:00 UTC fire under brief v3.1.1. Watch `failure_count`/`skipped_count`=0 on EMITTED array. Does NOT block the cycle.
- No new hard calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v3.05: **4 D-01 fires** — plan_review `a75c78f6` (partial) + `ff05c65e` (agree); sql_destructive `82443c8c` (PP+NY YT tests) + `5f7bfc52` (YT batch). T-MCP-02 cum **~96 (v3.05 +4)**, BUT ~+5 from the unrecorded pre-compaction IG arc → **treat cumulative as needing a clean re-baseline (~101–105 range)**. State-capture exceptions: 0 (cum 1). Close-the-loop UPDATEs: 0.

---

## 🤖 Cowork automation (D182)

**v3.05 update:** Cron 82/83/85/86 firing normally. **jobid 34 (youtube-publisher) active, draining the released YT backlog.** Cowork brief `nightly-health-check-v1` v3.1.1; frontmatter `status: ready`; Q-005 OPEN non-blocking next-fire watch.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **YouTube publishing restore** | OAuth app moved Testing→Production (PK) + tokens re-exchanged; PP `ma6EG1fz4XQ` + NY `qp-ZGm8lNIo` published; backlog released (13 generated, draining) + soft-retired (14 archived_stale). Root cause F-YT-OAUTH-TESTING-MODE (7-day Testing-mode token cap). | RESTORED v3.05 | **RESTORED/VERIFIED** | n/a (recorded) | Watch drain + token durability past ~31 May. |
| **cc-0019 publish-eligibility-gate brief** | `m.is_publish_eligible` + fill-gate + ai-worker preflight to stop AI token spend on no-publish-path drafts. Brief `81cb414`→`01a6cdf`; plan_review `a75c78f6`→`ff05c65e` clean. | P2, brief ready | **DRAFT — reviewed clean; NOT implemented** | PK → chat | Execute when PK directs (Unit A sql_destructive + Unit B ef_deploy + approval). |
| **F-YT-FAILED-NO-RETRY** | youtube-publisher v1.6.0 catch sets transient auth failure to terminal `video_status='failed'` (never re-selected) → token outage silently freezes rendered backlog | **P2 candidate brief** | LOGGED v3.05 | chat → PK | Author brief: retryable vs terminal failure / retry sweep. |
| **F-YT-EXPIRY-DISPLAY-FAKE** | dashboard `app/api/youtube/callback/route.ts` hardcodes `token_expires_at=now()+5y` → fabricated "Valid 2031" masks dead tokens | **P3 candidate cleanup** | LOGGED v3.05 | chat → PK | Record real expiry or omit; stop masking. |
| **CFW + Invegent YouTube onboarding** | Never connected (no `c.client_channel` YT row, no refresh token); CFW failed drafts `approval_status='published'` | **P2/P3 carry** | OPEN | PK → chat | First-time OAuth connect (not a reconnect). |
| **IG-publish-restore arc 4-way close (OWED)** | Pre-compaction 2026-05-24: instagram-publisher v2.4.0 deploy; IG queue soft-purge; void+repurge migrations; cron 53 enable. Detail in transcript `2026-05-24-07-57-08-…`. | **P2 carry (sync hygiene)** | OWED — not recorded | chat → PK | Record its own session close (verify SHAs from transcript). |
| **Q-nightly-health-check-v1-005** | Brief v3.1.1: P1 true-stuck emits `condition_key=true_stuck`; 8 keys PARKED pending Supabase-approved `friction.emission_rule` seed. A-005 `56e992b4` / v3.1 `7005865` / v3.1.1 `9ceb78a`. | **P3 non-blocking, next-fire watch** | **OPEN** | chat → PK | Watch next fire; close via fork (A) seed+restore+verify or (B) narrow scope+verify. Do NOT seed/re-emit/close without PK. |
| **emission_rule seed patch (P1/P2 condition keys)** | Supabase-approved patch to seed enabled `friction.emission_rule` rows for the 8 parked keys; then restore full §12.2a mapping | **P2/P3 carry (Q-005 close fork A)** | NOT STARTED. Supabase mutation — D-01 + PK approval. | PK → chat | When PK directs (fork A). Alt: fork B. |
| **Dashboard Slice 0A** | Merged `3ec489b` (Pre-Phase 0 IA shell + Visual Tokens v1; NOT real Phase 0) | RECORDED v3.04 | **MERGED/RECORDED** | n/a (recorded) | Real Phase 0 (review §9) future/gated. |
| **Mobile/narrow viewport verification** | CCB 306×498 DPR2 → MOBILE PASS | RECORDED v3.02 | **CLOSED/PASS** | n/a | n/a |
| **Cowork brief lifecycle gating WARN** | v2.94 convention validated vs 2026-05-20T160237Z fire | CLOSED v3.01 | **CLOSED** | n/a | Brief reset to `ready`. |
| **cc-0016 Stage D — /operations evidence display** | dashboard `9082beb`; mobile-verified | RECORDED v3.00 | **CLOSED/PASS** | n/a | n/a |
| **cc-0016 Stage E — lifecycle cleanup** | Cleanup automation + dry-run report | FUTURE — separately approved only | NOT STARTED. CONSTRAINT 2 binds. | PK → chat | Separate approval + dry-run before any destructive run. |
| **cc-0015 friction-pool-view brief** (Wave 7) | Authored PENDING_EXECUTION | P2, rank 1 (Gate 11 watch) | DRAFTED `9a5dc155`. Do NOT start before Gate 11 closes 2026-05-26. | chat → PK (Wave 7) | When window closes 2026-05-26. |
| **3 no-fire scheduler days — `nightly-health-check-v1`** | 2026-05-16, 2026-05-18, 2026-05-19 | **P3 secondary follow-up** | OPEN. | chat → PK | Read-only probe. |
| **Wave 0f scoping** | Brief-authoring only; opportunistic during Gate 11 | **P3, core rank 3** | NOT STARTED. | chat → PK | When PK directs. |
| **Platform Reconciliation View brief** | Deferred per D-FR-RECON-001 §7.D | **P2 carry, core rank 4** | NOT STARTED. | PK → chat | When PK directs. |
| **5-row close-the-loop batch / Pre-sales / `purge_test_case` helper extension** | Close-the-loop UPDATEs + Pre-sales 3-clock + helper coverage gap | **P2/P3 carry, core rank 5** | OPEN. | chat → PK | When PK directs. |
| **Music library activation** | video-worker v3.0.0 env-var gated | P2 carry | PENDING PK. | PK + chat | Bucket + tracks + env + smoke. |
| **vchecks.md V-B4 doc patch** | Correct V-B4 to 12-param signature | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **cc-0017c v1.2 doc patch candidate** | Date + 3 D-01 refs + V-B4 signature | P3 carry | Doc-only. | chat → PK | PK decides scope. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | P2 carry | OBSERVED. *(v3.05: cron 53 enabled in pre-compaction IG arc; close owed.)* | chat → PK | Verify + dry-run + re-enable. |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher format filter | P2 carry | LOGGED. *(v3.05: confirmed eligible formats = 4 kinetic/stat; `video_short_avatar` not in set.)* | chat → PK | Audit m.post_draft. |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 carry | OPEN. | PK | When PK directs. |
| **Backend/shared-metrics refactor** | Deeper scope behind v2.95 count mismatch | DEFERRED carry | OPEN. Not actively ranked. | n/a | When separately directed. |
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (18+; STRONG)** | Re-applied at sync close. | chat → next lesson cycle | Promote. |
| **L-v2.85-e** | push_files length budget — split-commit mitigation | **P3 (PROMOTION-CONFIRMED v2.88)** | — | chat → next lesson cycle | **PROMOTE.** |
| **L41 / full-file-write clobber mitigation** | Re-read HEAD before any full-file sync write; prefer surgical/sha-passed edits for 00_ index files | **P2 (re-exercised v3.02.1; reinforced v3.02.2/v3.03/v3.04/v3.05)** | POSITIVE exemplars v3.02.2→v3.05 (all sha-passed surgical edits). | chat → next lesson cycle | **Pair-promote with L-v2.85-e.** |
| **L-v2.85-a (HIGH-SIGNAL)** | V-check function signature probe at brief authoring | P3 (4 occurrences) | Promotion-eligible. | chat → next lesson cycle | Promote. |
| **L-v2.94 convention (NEW)** | brief lifecycle ready→fire→review_required→PK observe→ready | P3 (1 natural cycle v3.01) | Confirm across 2-3 more cycles. | chat → next session | Watcher. |
| **L-v3.02-a / L-v3.03-a / L-v3.04-a (NEW)** | mobile breakpoint verify / downstream acceptance gates / independently verify cross-repo merge SHA | P3 (1 occurrence each) | Watchers. | chat → next session | Promote after one more occurrence each. |
| **L-v3.05-a (NEW)** | Record root CAUSE not just symptom (YT re-diagnosed as token-reconnect ≥3×); re-run stale audits against live data on user pushback | P3 (1 occurrence v3.05) | Watcher. | chat → next session | Promote after one more occurrence. Pair with L41 / no-fabrication discipline. |
| **L62 reinforcement** | Type-B vs Type-C D-01 handling | P3 (cc-0016 6-fire series; v3.05 both YT sql_destructive partial/type-c) | Strong empirical record. | chat → next lesson cycle | Strong. |
| **L-v2.88-a** | Identical PK-directive loop watcher | P3 (3 cumulative) | — | chat → next lesson cycle | Pair-promote if recurs. |
| **L-v2.90-a-f** | V-D fixture / arity DROP / etc. | P3 (not re-exercised) | Watchers. | chat → next session | Watcher. |
| **L-v2.78-a / L-v2.81-a / L47 / L-v2.84-a-d / L-v2.85-b/c/d / L-v2.86-a-e / L-v2.88-b/c/d / L-v2.89-a** | Various candidates | P3 carry | Unchanged. | chat → next session/lesson cycle | Various. |
| **Other carries** | Minor doc patches (cc-0010A/0011/0012) / F-K-SCHEMA-REGISTRY-R-STALE / AI cost view / Publisher latent config / M8b / 94-row cohort / F-CRON-AUTO-APPROVER-SECRET-INLINE / morning-inbox-sweep-v1 / 22 escalated m.chatgpt_review rows / Memory cap 19/30 / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged. | various | various |

**Closed v3.05:** YouTube publishing restore → RESTORED/VERIFIED (both channels publishing; backlog released + soft-retired). cc-0019 brief → reviewed CLEAN (ready for execution). No core/dashboard rank change.
**Closed v3.04:** Dashboard Slice 0A → MERGED/RECORDED at `3ec489b`.
**Closed v3.03:** none (recording-only; Q-005 stays OPEN by design).
**Closed v3.02:** Mobile/narrow viewport verification → CLOSED/PASS. Mobile-fix commit SHA backfill → CLOSED v3.02.2.
**Closed v3.01:** Cowork brief lifecycle gating WARN.
**Closed earlier:** v3.00 cc-0016 Stage D + evidence path; v2.99 cc-0016 Stage B + V-A5; v2.98 cc-0016 Stage C apply; v2.97 cc-0016 Stage A apply; v2.96 dashboard slices 4A–4B + top alert bar; v2.95 dashboard slices 1–3 + PHASES streak; v2.93 Reconciliation daily cadence; v2.92 Health_check V-C3; v2.91 cc-0017e v1.1; v2.90 cc-0017e apply; v2.85 cc-0017c apply; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.77 cc-0014 archived.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v3.01.

---

## 📌 Backlog

**v3.05 state changes:**
- **YouTube publishing RESTORED** — root cause OAuth Testing-mode 7-day token cap (F-YT-OAUTH-TESTING-MODE); fix = app→Production + reconnect; verified PP `ma6EG1fz4XQ` + NY `qp-ZGm8lNIo`; backlog released (13 generated) + soft-retired (14 archived_stale).
- **F-YT-FAILED-NO-RETRY** + **F-YT-EXPIRY-DISPLAY-FAKE** registered (candidate brief / cleanup).
- **cc-0019 brief** authored + reviewed clean (`81cb414`→`01a6cdf`; plan_review `ff05c65e`). Brief only.
- **emission_rule seed patch** still Active carry (Q-005 fork A).
- **IG-publish-restore arc 4-way close** registered OWED.
- **L-v3.05-a NEW lesson candidate** (record root cause not symptom; re-run stale audits on pushback).
- **L41 reinforced v3.05** — surgical sha-passed sync recording.
- No decisions.md change.

**v3.04 state changes (preserved):** Dashboard Slice 0A MERGED + RECORDED at `3ec489b` (Pre-Phase 0; NOT real Phase 0). L-v3.04-a NEW candidate. L41 reinforced. No decisions.md change.

**v3.03 state changes (preserved):** Q-005 Option A trail recorded; brief v3.1.1; OPEN next-fire watch; emission_rule seed patch registered. L-v3.03-a NEW. No decisions.md change.

**v3.02 (+.1 +.2) state changes (preserved):** Mobile viewport CLOSED/PASS; mobile-fix SHA `d17b604` backfilled; L-v3.02-a NEW; L41 re-exercised (clobber→repair); Cowork WARN CLOSED v3.01 (restored). cc-0016 A/B/C/D closed; only Stage E remains. T-MCP cum re-baseline pending.

---

## 🧊 Frozen / Deferred

Unchanged. **cc-0016 Stage E lifecycle cleanup** — future/separately-approved-only. **Backend/shared-metrics refactor** — deferred carry. **emission_rule seed patch** — Q-005 close fork A; Supabase mutation requires D-01 + PK approval. **Real Dashboard Phase 0 (review §9)** — future/gated. **cc-0019 execution** — gated on sql_destructive + ef_deploy D-01s + PK approval (brief reviewed clean). **F-YT-FAILED-NO-RETRY / F-YT-EXPIRY-DISPLAY-FAKE** — candidate brief/cleanup, not started.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e + L-v2.86-a-e + L-v2.88-a-d + L-v2.89-a + L-v2.90-a-f + L-v2.94 + L-v3.02-a + L-v3.03-a + L-v3.04-a + L-v3.05-a candidates carried.

- **L41**: re-exercised v3.02.1; clean surgical sha-passed edits v3.02.2 + v3.03 + v3.04 + v3.05. Strong pair-promote candidate.
- **L62**: strongly reinforced via cc-0016 6-fire series; v3.05 both YT sql_destructive partial/type-c.
- **L-v2.83-a**: 18+ occurrences. STRONG.
- **L-v2.85-e**: PROMOTION-CONFIRMED v2.88.
- **L-v2.88-a**: 3 cumulative.
- **L-v2.94 / L-v3.02-a / L-v3.03-a / L-v3.04-a / L-v3.05-a**: NEW candidates.
- **L-v3.05-a**: record root CAUSE not just symptom; re-run stale audits against live data on user pushback.
- **L-v2.90-a-f**: watchers.

**Highest-priority promotions next lesson cycle: L41 + full-file-write mitigation (pair), L-v2.85-e, L-v2.85-a, L-v2.83-a.**

---

## v3.05 honest limitations

- **YT token durability unproven today** — both publishes succeeded (tokens refresh now); a Production-issued token surviving past 7 days is the expectation but only confirmable after ~31 May.
- **"App is in Production" taken from PK + the successful live publish** — chat cannot see Google Cloud Console; the successful refresh against a previously-7-day-dying token is the empirical confirmation.
- **Both YT sql_destructive D-01s returned `partial` (type-c echoes), escalated to PK; PK had already directed the action** — proceeded on standing approval. NY test reused the PP verdict (`82443c8c`, same action/guard/arc, same UTC day).
- **T-MCP-02 count uncertain** — sync_state recorded ~92 (v3.04); pre-compaction IG arc fired ~5 more (unrecorded close, owed); v3.05 +4 → cumulative needs re-baseline (~101–105).
- **cc-0019 is brief only** — `fill_pending_slots` unchanged; `is_publish_eligible` not created; execution gated.
- **Production mutations:** 3 apply_migration (draft `video_status` only) + 2 publisher invokes (real publishes). EF deploys: 0. cron: 0. enablement: 0. hard deletes: 0. emission_rule rows seeded: 0. dashboard edits: 0.
- **No decisions.md change. No Stage E. No cc-0015 start. No Q-005 closure. No re-emission. CFW/Invegent untouched.**
- Memory cap 19/30 unchanged. Gate 11 closes 2026-05-26 (~2 days).

---

## Changelog

- v1.0–v2.96: per commit history.
- v2.97–v3.00.1 (2026-05-20/21): cc-0016 Stage A/B/C/D applies + Stage D visual pass + reconciliations.
- v3.01 (2026-05-20T23:29Z, `83cd633c`): Cowork brief lifecycle gating WARN CLOSED; v2.94 convention validated; cc-0015 Gate 11 watch rank 1.
- v3.02 (2026-05-21T00:42Z, `a08945d3`): Dashboard mobile viewport CLOSED/PASS. *(DEFECT: full-file push clobbered v3.01 `00_` content.)*
- v3.02.1 / v3.02.2 (2026-05-21): clobber repair + mobile-fix SHA `d17b604` backfill (read-HEAD-first surgical).
- v3.03 (2026-05-21): Q-005 Option A trail recorded; brief v3.1.1; Q-005 OPEN next-fire watch.
- v3.04 (2026-05-21): Dashboard Slice 0A merge recorded at `3ec489b` (Pre-Phase 0; NOT real Phase 0).
- **v3.05 (2026-05-24): YouTube OAuth Production restore. Root cause = OAuth app in Google Testing publishing status → refresh tokens capped at 7 days (NY 7.00d / PP 7.92d after 5 May reconnect). PK moved app → Production + re-exchanged tokens (NY token_updated_at 10:48:22, PP 10:49:05 UTC); two live tests published (PP `ma6EG1fz4XQ` 10:57 UTC, NY `qp-ZGm8lNIo` 11:02 UTC). Backlog released (fresh ≥12 May → generated: NY 6 + PP 7 = 13, draining 2/tick jobid 34) + soft-retired (stale <12 May → archived_stale: NY 3 + PP 11 = 14). Migrations yt_token_verify_reset_one_pp_draft / yt_token_verify_reset_one_ny_draft / yt_backlog_release_fresh_softretire_stale (20260524). cc-0019 brief `81cb414`→`01a6cdf`, plan_review `a75c78f6`→`ff05c65e` clean — brief only. NEW F-YT-OAUTH-TESTING-MODE (root cause RESOLVED+recorded) / F-YT-FAILED-NO-RETRY / F-YT-EXPIRY-DISPLAY-FAKE. 4 D-01 (2 plan_review + 2 sql_destructive). 3 apply_migration + 2 publisher invokes. 0 cron / 0 EF deploy / 0 enablement / 0 hard delete / 0 friction.* / 0 cc-0015 / 0 Stage E / 0 Q-005 closure / 0 decisions.md / 0 dashboard edit. Session file `f9ddd51`; sync_state `119e54e7`; this action_list commit. Recorded via read-HEAD-first sha-passed surgical edits (sync_state blob `7d2b0eb8`, action_list blob `ecaf50f8`). Dashboard roadmap/PHASES leg N/A (operational). OWED: pre-compaction IG-publish-restore arc 4-way close.**
