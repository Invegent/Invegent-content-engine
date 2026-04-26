# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-26 Sunday late evening — **Phase B Stages 7-9 COMPLETE; Stage 10 next**
> Written by: PK + Claude session sync

---

## ⏸ 26 APR SUNDAY LATE EVENING — PHASE B STAGES 7-9 COMPLETE

### In one paragraph

Sunday 26 Apr was the third consecutive long-form session. Started post-Phase-A (commit `2799253`, Gate A passed earlier in the day). Built Phase B Stages 7, 8, and 9 end-to-end with full V1–V6 verification per stage. Total 16 new migrations (032–045) on `feature/slot-driven-v3-build`: scoring helpers (LD10 confidence + LD12 evergreen ratio), the fill function (heart of v3, slot-driven origin path with full pool query / dedup / quality gates / pool-health relaxation / evergreen fallback), rejection trigger, FK CASCADE for `m.ai_job.slot_id` (D178), stuck-slot recovery (LD13/F10), critical-window scan (§B.11), hot-breaking pool view + urgent slot inserter with LD20 replaceable check (§B.12). Three architectural decisions captured: D177 (fitness scale 0..100), D178 (FK CASCADE), D179 (Stage 10/11 Option B). Three pre-flight gaps caught and fixed in-stage: Stage 7 fitness scale, Stage 8 `c.client_content_scope` columns + `m.post_draft.draft_body` NOT NULL, Stage 9 `m.slot_fill_attempt.decision` CHECK. All callable. **No Phase B crons wired yet** — fill, recovery, breaking, critical-scan all live as functions but not auto-fired (Stage 10's job). Anthropic spend still essentially zero from build pipeline.

### Critical state right now

1. **Phase B Stages 7-9 COMPLETE.** All migrations applied via Supabase MCP, all V1–V6 verifications passed.
2. **Phase A still autonomous.** 6 Phase A crons (jobid 69-74) still firing on schedule, no failures, no alerts.
3. **Pool: 1,694 active rows** unchanged across 8 verticals. (Will continue to grow organically via Stage 3 trigger chain.)
4. **Slots: 70 total** (56 future, 14 pending_fill). Pending_fill slots still waiting for Stage 10 to wire the fill cron.
5. **R6 still paused** (jobid 11, 64, 65 active=false). Anthropic spend still essentially zero.
6. **R6 ai-worker (jobid 5) still polling.** Important: this poller is independent of R6 seed crons. It runs every 5 min and processes any queued ai_job. Stage 10 must add the minimal `is_shadow=true` filter (D179) BEFORE the fill cron is wired, otherwise shadow ai_jobs would be picked up and marked failed.
7. **FB and LI publishers healthy** (jobid 7, 54). IG cron (jobid 53) still paused awaiting Meta restriction clear. All 4 external reviewers paused per D162.
8. **Repo:** `feature/slot-driven-v3-build` at `ca1e022` — 11 commits ahead of main (Stages 1-9 + 3 fix-ups). 47 migration files (31 Phase A + 16 Phase B Stages 7-9). Branch sweep next session: confirm no orphans on other repos.

### Today's deltas (26 Apr afternoon–evening)

| Item | Status |
|---|---|
| Stage 7 brief | ✅ commit `7825eb1` (Phase B opening) |
| Stage 7 execution (4 scoring helpers) | ✅ commit `7825eb1` + fix-up `2f447cf` (fitness scale 0..100 + check_pool_health gating) |
| Stage 8 brief | ✅ commit `2fecd5f` |
| Stage 8 execution (3 migrations: ALTER ai_job + fill function + rejection trigger) | ✅ commit `95c85c0` + fix-up `8cf4978` (c.client_content_scope cols + draft_body NOT NULL) |
| Stage 9 brief | ✅ commit `18f6451` |
| Stage 9 execution (6 migrations: FK CASCADE + recovery + critical window + breaking news) | ✅ commit `c4c610a` + fix-up `ca1e022` (slot_fill_attempt.decision CHECK extension) |
| All V1–V6 verifications across Stages 7-9 | ✅ PASSED |
| D177-D179 captured in decisions log | ✅ this commit |
| Memory entries updated (#14 + Lesson #32 in #27) | ✅ |
| Dashboard roadmap updated | ✅ next commit (separate repo) |

---

## 🟢 PHASE B STAGES 7-9 — DEPLOYED STATE

### Migrations applied this session (16 total: 032–045)

| # | Migration | Stage | Notes |
|---|---|---|---|
| 032 | `create_compute_slot_confidence_function` | 7 | LD10 weights (0.50 fitness / 0.20 pool log-sat / 0.20 recency / 0.10 diversity log-sat). Fitness divided by 100 internally (D177). |
| 033 | `create_check_pool_health_function` | 7 | Per-vertical green/yellow/red. Health gates on depth + source diversity (fitness gating dropped — vacuous). |
| 034 | `create_evergreen_ratio_7d_view` | 7 | LD12 per-client live+shadow ratio split via `post_draft.is_shadow`. |
| 035 | `create_check_evergreen_threshold_function` | 7 | LD12 threshold 0.30. |
| 036 | `alter_ai_job_for_slot_driven` | 8 | ADD slot_id (FK), is_shadow boolean, DROP NOT NULL on digest_run_id+post_seed_id, ADD ai_job_origin_check, 2 indexes. |
| 037 | `create_fill_pending_slots_function` | 8 | **THE FILL FUNCTION (heart of v3).** ~280 lines after fix-ups. Pool query + dedup + quality gates + pool-health relaxation + evergreen fallback + audit + skeleton draft + ai_job + slot transition. |
| 038 | `create_handle_draft_rejection_trigger` | 8 | §B.9 — 1st rejection resets to pending_fill, 2nd rejection skips. |
| 039 | `alter_ai_job_slot_fk_cascade` | 9 | D178: ON DELETE SET NULL → ON DELETE CASCADE. |
| 040 | `create_recover_stuck_slots_function` | 9 | LD13/F10 — stale=30m, max_attempts=3 default. |
| 041 | `create_slots_in_critical_window_view` | 9 | §B.11 — slots in next 4h, urgency tagged. |
| 042 | `create_scan_critical_windows_function` | 9 | §B.11 — raises slot_critical_window alerts, rate-limited 30m/slot. |
| 043 | `create_hot_breaking_pool_view` | 9 | §B.12, H3 — timely_breaking, fitness>=80, first_seen<24h, reuse_count=0. |
| 044 | `create_try_urgent_breaking_fills_function` | 9 | §B.12, F6/LD17 + LD20 replaceable check. |
| 045 | `extend_slot_fill_attempt_decision_check` | 9 fix-up | Extended CHECK to allow failed (Stage 8 latent), recovered_to_pending + marked_failed (Stage 9 recovery). |

All migrations applied via Supabase MCP `apply_migration`. Three fix-up commits in-repo (`2f447cf`, `8cf4978`, `ca1e022`) for in-place corrections caught during verification.

### Phase B objects in production (NOT auto-fired)

| Object | Type | Purpose |
|---|---|---|
| `m.compute_slot_confidence(numeric, integer, numeric, integer)` | Function (IMMUTABLE) | LD10 confidence score for a slot fill |
| `m.check_pool_health(integer)` | Function (STABLE) | Per-vertical green/yellow/red |
| `m.evergreen_ratio_7d` | View | Per-client live+shadow ratio |
| `m.check_evergreen_threshold(uuid)` | Function (STABLE) | LD12 alert threshold check |
| `m.fill_pending_slots(integer, boolean)` | Function | THE FILL FUNCTION |
| `m.handle_draft_rejection()` | Trigger function | Rejection retry policy |
| `trg_handle_draft_rejection` | Trigger | Fires on m.post_draft UPDATE OF approval_status |
| `m.recover_stuck_slots(integer, integer)` | Function | Stuck fill_in_progress recovery |
| `m.slots_in_critical_window` | View | Slots in next 4h with urgency tier |
| `m.scan_critical_windows()` | Function | Raise critical-window alerts |
| `m.hot_breaking_pool` | View | Hot breaking news per client |
| `m.try_urgent_breaking_fills(integer, numeric)` | Function | LD20 replaceable check + urgent slot insert |

### Verification summary across Stages 7-9

| Stage | Phase | Result |
|---|---|---|
| 7 | V1 Structural / V2 Confidence calc / V3 Health gating / V4 Threshold check / V5 Regression | All passed (after fix-ups for fitness scale + health gating) |
| 8 | V1 Structural / V2 End-to-end synthetic slot / V3 Rejection trigger / V4 Regression | All passed (after fix-ups for c.client_content_scope cols + draft_body NOT NULL) |
| 9 | V1 Structural / V2 FK CASCADE / V3 Recovery (reset + marked_failed) / V4 Critical scan / V5 Breaking news shape / V6 Regression | All passed (after fix-up for slot_fill_attempt.decision CHECK) |

### Three architectural decisions captured this session

- **D177** — `m.signal_pool.fitness_score_max` is 0..100, not 0..1. All fitness consumers normalise at use-site. Fix-up applied at Stage 7.
- **D178** — `m.ai_job.slot_id` FK = ON DELETE CASCADE. Caught at Stage 8 cleanup time when SET NULL violated `ai_job_origin_check`. Resolved via Stage 9.039.
- **D179** — Stage 10/11 ordering = Option B. Stage 10 includes a minimal ai-worker patch (`is_shadow=true` filter) so the existing R6 ai-worker doesn't process shadow jobs. Stage 11 then does the full ai-worker refactor (LD18 idempotency + LD7 prompt caching + slot-driven payload shape).

### Pre-flight gaps caught this session (Lesson #32)

Three gaps from the same root cause: assuming column names, types, or constraints from related tables instead of querying the directly-touched table.

| Stage | Gap | Resolution |
|---|---|---|
| 7 | Assumed `fitness_score_max` was 0..1 normalised; it's 0..100. | Fix-up: divide by 100 inside `compute_slot_confidence`. Drop fitness gating from `check_pool_health` (vacuous on actual scale). D177 captures the architectural fact. |
| 8 | Assumed `c.client_content_scope` had `content_vertical_id` (it's `vertical_id`) and `is_active` column (doesn't exist). Also assumed `m.post_draft.draft_body` was nullable (NOT NULL with no default). | Fix-up: replace 5 column refs, drop 5 `is_active` filters, use empty string placeholder for `draft_body`. |
| 9 | Assumed `m.slot_fill_attempt.decision` was free-text. It has a CHECK limiting values to `('filled','evergreen','skipped','error')`. Stage 9 needed `'recovered_to_pending'`, `'marked_failed'`. Stage 8's `'failed'` (latent path) also caught here. | Migration 045: extend CHECK ARRAY to include all four new values. |

**Lesson #32 (memory + decisions log):** Pre-flight schema verification must query EVERY directly-touched table for column names + types + CHECK constraints + NOT NULL — not infer from related tables.

---

## ⛔ DO NOT TOUCH NEXT SESSION

1. **The 14 pending_fill slots.** Same as before — still waiting for Stage 10 to wire the fill cron. Now that Stage 9's recovery function exists, IT TOO must NOT be invoked manually against these slots. They are not stuck — they're waiting. Recovery's `stale_threshold_minutes=30` AND `status='fill_in_progress'` filter means they're naturally excluded (status=pending_fill, not fill_in_progress).

2. **R6 seed crons (jobid 11, 64, 65) AND R6 ai-worker (jobid 5).** All still paused at the seed crons. The ai-worker (jobid 5) IS still active and polling, but with no R6 seed activity it sees only legacy queued items draining naturally. **CRITICAL: do NOT re-enable R6 seed crons before Stage 10's ai-worker `is_shadow` filter ships, otherwise R6 logic and Phase B logic will both produce ai_jobs that the unrefactored ai-worker will conflate.**

3. **IG cron (jobid 53).** Paused awaiting Meta restriction clear (24-48h auto-recovery typical from 25 Apr morning). Check Meta status before unpausing.

4. **All 4 external reviewers paused per D162.**

---

## 🟢 NEXT SESSION — STAGE 10

### Stage 10 scope (Phase B crons + minimal ai-worker shadow filter)

Stage 10 wires four Phase B crons AND adds the minimal ai-worker patch (Option B per D179). Estimated 60-90 min build + 30-60 min verification.

**Migrations (4 cron registrations):**

| Cron | Schedule | What it calls |
|---|---|---|
| fill cron | every 5 min | `SELECT m.heartbeat('fill-pending-slots'); SELECT m.fill_pending_slots(p_max_slots := 5, p_shadow := true);` |
| recovery cron | every 30 min | `SELECT m.heartbeat('recover-stuck-slots'); SELECT m.recover_stuck_slots();` |
| breaking cron | every 15 min | `SELECT m.heartbeat('try-urgent-breaking-fills'); SELECT m.try_urgent_breaking_fills();` |
| critical-window scan | every 10 min | `SELECT m.heartbeat('scan-critical-windows'); SELECT m.scan_critical_windows();` |

Heartbeat seeds for these 4 jobnames need to be inserted to `m.cron_health_check`. Heartbeat-check cron (jobid 74) will then alert on missed ticks.

**ai-worker EF patch (minimal):**

Add `is_shadow=false` filter to the queued-job SELECT. Single-line change. Deploy via PowerShell from `C:\Users\parve\Invegent-content-engine` (Windows MCP times out on `supabase functions deploy`).

Verification checklist:
- All 4 new crons firing on schedule
- Heartbeat records appearing for new jobnames
- Shadow ai_jobs accumulating with `status=queued` (NOT being picked up by ai-worker)
- Existing R6-era ai_jobs continuing to process correctly (regression)
- Slot transitions firing correctly (pending_fill → fill_in_progress → ...)
- No new `slot_alerts` rows except expected ones (e.g. critical-window alerts when slots cross the 1h threshold)

### Then Stage 11 (full ai-worker refactor)

- LD18 DB-enforced idempotency
- LD7 prompt caching adoption
- Slot-driven payload handling (read `input_payload->'canonical_ids'` etc.)
- UPDATE auto-created `m.post_visual_spec` rather than INSERT
- Removal of the temporary `is_shadow=false` filter

First dedicated EF deploy of Phase B. Higher-risk per-stage; budget extra time for verification + rollback prep.

### Then Gate B

5–7 days shadow observation. Watch:

- Pool health per vertical (m.check_pool_health)
- Evergreen ratio per client (m.evergreen_ratio_7d)
- Slot confidence distribution (m.slot_fill_attempt aggregations)
- Recovery action counts (recovered_to_pending vs marked_failed)
- Critical-window alert frequency
- Breaking news urgent-slot insertion rate
- ai-worker cost per shadow draft (proves Stage 11's prompt caching delivers the expected savings)

Gate B exit criteria (to be specified more precisely in Stage 11 brief):
- Decision quality: shadow drafts indistinguishable from R6 drafts on PK's manual review
- Cost predictability: ai-worker spend in line with target ($18-30/month at full Phase B scale)
- Stability: no untriaged alerts; recovery rate <5% of slots
- Performance: p95 fill_pending_slots latency under acceptable bounds (TBD)

---

## ARCHITECTURAL REVISIONS vs v4 (LOCKED IN PRODUCTION)

From Phase A: R-A through R-E (canonical_vertical_map, two-trigger chain, MCP-applied migrations, FK on versioned class_code, 10 ice_format_keys).

From Phase B Stages 7-9: three new revisions captured as decisions D177-D179 (see decisions log).

No additional v4 architectural goals changed. All revisions are correctness fixes or sequencing decisions — v4's intent preserved.

---

## SESSION STARTUP PROTOCOL

1. Read this file in full
2. Read v4 brief Phase B sections (`docs/briefs/2026-04-25-slot-driven-architecture-build-plan-v4.md` §B.13-B.15 for crons + ai-worker)
3. Read most recent stage brief (`docs/briefs/cc-stage-09.md`) as template for Stage 10
4. Orphan branch sweep — all 3 repos
5. Check `c.external_reviewer` — confirm all paused
6. Check R6 seed crons — confirm jobid 11, 64, 65 active=false
7. Check IG cron jobid 53 — confirm active=false (Meta restriction)
8. Check FB+LI publisher crons — confirm active=true (jobid 7, 54)
9. Check Phase A crons — jobid 69-74 all active=true, recent firing
10. Check `cron.job_run_details` for jobid 5 (R6 ai-worker): should still be polling, processing only legacy R6 jobs
11. Check `m.signal_pool` row counts vs end-of-session: 1,694 (will have grown organically overnight to ~1,750-1,900)
12. Check `m.slot` distribution — should still be ~70 + nightly materialise additions
13. Check `m.slot_alerts` — should have ZERO `cron_heartbeat_missing` rows
14. Check that no shadow ai_jobs accumulated (Stage 10 hasn't fired yet, so any shadow ai_job in `m.ai_job` would be unexpected)
15. Run pre-flight queries for Stage 10 (check existing cron command patterns, ai-worker EF source location, verify Edge Function deploy environment)
16. Begin Stage 10 brief

---

## DEV WORKFLOW RULE (D165 + Phase A reality + D179)

**Default for Phase A/B build: feature branch `feature/slot-driven-v3-build`.**

Direct push to main is the standing rule for non-build work. The 47-migration coordinated change of Phases A + B Stages 7-9 justified the branch.

**Stage briefs go to main** (`docs/briefs/cc-stage-NN.md`). **Stage execution goes to feature branch** (`supabase/migrations/20260426_NNN_*.sql`).

**Migrations applied via Supabase MCP, NOT `supabase db push`** (R-C / D170).

**EF deploys (Stage 11+) via PowerShell from `C:\Users\parve\Invegent-content-engine`** — Windows MCP times out on `supabase functions deploy`.

---

## CURRENT PHASE

**Phase 3 — Expand + Personal Brand** active.

**Sub-phase 3.x — Slot-Driven Architecture build:**
- Phase A — ✅ **COMPLETE 26 Apr morning** — Foundation (Stages 1-6, 31 migrations, 6 crons, Gate A passed)
- Phase B Stages 7-9 — ✅ **COMPLETE 26 Apr afternoon–evening** — Scoring helpers + fill function + defensive layer (16 migrations, 0 crons yet)
- Phase B Stages 10-11 — 🔲 **NEXT** — Phase B crons + minimal ai-worker shadow filter (Stage 10) then full ai-worker refactor (Stage 11)
- Gate B — 🔲 5-7 days shadow observation
- Phase C — 🔲 Cutover per-client-platform (Stages 12-18)
- Phase D — 🔲 Decommission old R6 (Stage 19)
- Phase E — 🔲 Evergreen seeding (parallel content work, ~50 items, prioritise Invegent verticals)

Pre-sales gate: 12 of 28 Section A items closed. A10b waiting on Meta restriction clear.

---

## TODAY'S COMMITS (26 APR — EVENING SESSION)

**Invegent-content-engine `feature/slot-driven-v3-build` branch:**

Stage briefs (committed to `main`):
- `7825eb1` — docs(briefs): Stage 7 CC brief (also includes execution — Stage 7 was a single round trip)
- `2fecd5f` — docs(briefs): Stage 8 CC brief
- `18f6451` — docs(briefs): Stage 9 CC brief

Stage execution + fix-ups (committed to `feature/slot-driven-v3-build`):
- `7825eb1` — Stage 7: scoring helpers + Stage 7 fix-up amendments
- `2f447cf` — Stage 7 fix-up: fitness scale 0..100 + check_pool_health gating
- `95c85c0` — Stage 8: ALTER ai_job + fill function + rejection trigger
- `8cf4978` — Stage 8 fix-up: c.client_content_scope cols + draft_body NOT NULL
- `c4c610a` — Stage 9: FK CASCADE + recovery + critical window + breaking news
- `ca1e022` — Stage 9 fix-up: slot_fill_attempt.decision CHECK extension

**Reconciliation (committed to `main`):**
- THIS COMMIT — docs(decisions): D177-D179
- THIS COMMIT — docs(sync_state): Phase B Stages 7-9 complete
- (Next commit, separate repo) feat(roadmap): Phase B Stages 7-9 complete

**Migrations (DB-only, all via Supabase MCP):** 16 total this evening (032-045) — see migrations table above. Total Phase A + B Stages 7-9: 47 migrations.

---

## CLOSING NOTE FOR NEXT SESSION

Sunday 26 Apr was three sessions in one day: Phase A morning (Stages 1-6), Phase A audit pass mid-afternoon, Phase B Stages 7-9 afternoon–evening. The slot-driven build is now structurally complete except for cron wiring and ai-worker refactor.

**State at close:**

- **Phase A still autonomous** (6 crons firing, 1,694-row pool, 70 slots, 0 alerts)
- **Phase B scoring + fill + defensive layer all live as functions** (callable, no crons yet)
- **R6 still paused, publishing untouched** (FB + LI draining the existing queue at normal cadence)
- **R6 ai-worker (jobid 5) still polling** but seeing only legacy R6 work — critical to add `is_shadow` filter in Stage 10 BEFORE wiring the fill cron
- **Anthropic spend zero from R6 + Phase A + Phase B Stages 7-9** (all SQL functions; no LLM calls until Stage 10 wires the fill cron AND Stage 11 enables the ai-worker to process slot-driven jobs)
- **All reconciliation artefacts in flight this commit** (sync_state + decisions + memory + dashboard roadmap)

**Realistic next working windows:**

- Mon 27 Apr morning: Stage 10 (Phase B crons + minimal ai-worker patch)
- Mon 27 Apr afternoon–evening or Tue 28 Apr: Stage 11 (full ai-worker refactor + first EF deploy of Phase B)
- Wed 29 Apr – Mon 5 May: Gate B observation (5–7 days)
- Tue 6 May onward: Phase C cutover decisions per Gate B findings

**Lessons captured 26 Apr (32 total — 6 from morning + 1 from evening):**

26–31. (See morning's Phase A close commit `2799253` and the Phase A audit-pass commit.)

32. **Pre-flight schema verification must query EVERY directly-touched table.** Three Phase B gaps caught this session shared a single root cause: assuming column names, types, or constraints from related tables instead of querying the directly-touched table. Stage 7 fitness scale (assumed 0..1, was 0..100). Stage 8 `c.client_content_scope` columns (assumed `content_vertical_id` from convention; was `vertical_id`. Assumed `is_active` filter was needed; column doesn't exist). Stage 9 `m.slot_fill_attempt.decision` (assumed free-text; had CHECK). Pattern for future stages: pre-flight queries `information_schema.columns`, `pg_constraint`, and `pg_proc` for EVERY directly-touched table, not just the table at the centre of the new feature.

---

## END OF SUNDAY EVENING SESSION

Next session priority: Stage 10. Phase B Stages 10-11 wraps the build; Gate B observation begins.

R6 paused, Phase A autonomous, publishing healthy, Anthropic spend zero from build pipeline. Solid handover state.
