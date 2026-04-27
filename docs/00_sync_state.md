# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-27 Monday afternoon — **Phase B Stages 10–12 COMPLETE; Gate B observation STARTS NOW**
> Written by: PK + Claude session sync

---

## 🟢 27 APR MONDAY — PHASE B STAGES 10–12 COMPLETE; GATE B STARTS

### In one paragraph

Monday 27 Apr was a single long session that took Phase B from "callable functions" all the way to "running in shadow mode and producing real LLM-generated drafts." Stage 10 wired five Phase B crons (jobids 75–79) and added the minimal ai-worker `is_shadow=false` filter via `f.ai_worker_lock_jobs_v1`. Stage 11 was the big ai-worker refactor — v2.9.x → v2.10.0 with native `slot_fill_synthesis_v1` payload handler, LD7 ephemeral prompt caching, LD18 partial unique index `uq_post_draft_slot_id`, slot status transitions, and shadow-filter removal. Stage 11 hit Lesson #32 a third time (column-name assumption — `body_text`/`body_excerpt` vs actual `extracted_text`/`extracted_excerpt`) and shipped a v2.10.1 fix-up. Stage 11 produced 20 real shadow drafts at $0.28 cost, but 19 of 20 slots stayed in `pending_fill` instead of `filled` — a silent UPDATE failure traced to `m.slot` having zero `service_role` grants (Lesson #33: every Supabase JS write must destructure `{ error }`). Stage 12 fixed it with three migrations (050 grants, 051 post_draft UPSERT, 053 ai_job UPSERT for symmetry) and ai-worker v2.11.0 with explicit error destructuring on every write. Phase B is now fully idempotent end-to-end. Total Phase B observation cost so far: ~$0.78 USD. Three new architectural lessons captured (#32 third-instance, #33, #34). **Gate B 5–7 day observation starts now.**

### Critical state right now

1. **Phase B Stages 10–12 COMPLETE.** All migrations applied (2 from Stage 10, 2 from Stage 11, 4 from Stage 12 — total 8 new). ai-worker deployed at v2.11.0. Five Phase B crons firing autonomously.
2. **Phase A still autonomous.** 6 Phase A crons (jobids 69–74) still firing on schedule, no failures, no alerts.
3. **Phase B running in shadow mode.** 35 shadow ai_jobs succeeded, 2 failed (content-quality, not architectural), 35 slots in `filled` state, 29 in `pending_fill`, 2 in `fill_in_progress`.
4. **Cost today: ~$0.78 USD** for ~46 LLM calls (mostly Claude Sonnet 4-6, 1–2 OpenAI fallbacks). Anthropic monthly cap $200 with 4 days to month-end reset.
5. **R6 paused** (jobids 11, 64, 65 active=false). FB + LI publishers still draining legacy queue normally (jobids 7, 54).
6. **R6 ai-worker (jobid 5) shared with Phase B.** Now processes BOTH live and shadow jobs (filter dropped in 12.052). v2.11.0 handles `slot_fill_synthesis_v1` natively + R6's existing `rewrite_v1` path.
7. **IG cron (jobid 53) paused** awaiting Meta restriction clear. All 4 external reviewers paused per D162.
8. **Repo state:** `feature/slot-driven-v3-build` at `6d66312f` (Stage 12.053 ai_job UPSERT). **53 migration files total** (31 Phase A + 14 Phase B Stages 7-9 + 2 Stage 10 + 2 Stage 11 + 4 Stage 12). ai-worker EF at v2.11.0.

### Today's deltas (27 Apr morning–afternoon)

| Item | Status |
|---|---|
| Stage 10 brief | ✅ commit `e9f2c9a` |
| Stage 10 execution (4 cron registrations + ai-worker shadow filter) | ✅ migrations 046, 047 (commits `c22f460`, `7aa6f8f`) |
| Stage 10 V1–V6 verification | ✅ all passed |
| Stage 11 brief | ✅ commit `c826fb5` |
| Stage 11 execution (LD18 unique index + ai-worker v2.10.0 + drop shadow filter) | ✅ migrations 048, 049 (commits `2d4c02b`, `ae9689c`, `f865a69`) |
| Stage 11 fix-up brief | ✅ commit `792e8b8` |
| Stage 11 fix-up (v2.10.0 → v2.10.1 column name fix) | ✅ commit `6f33b5c`, deployed by PK |
| Stage 12 silent-UPDATE root-cause investigation | ✅ confirmed `m.slot` zero service_role grants |
| Stage 12 brief | ✅ commit `3908a58` |
| Stage 12 execution (grants 050 + post_draft UPSERT 051 + ai-worker v2.11.0) | ✅ migrations 050, 051 (commits `ef8116c`, `359c8e7`); ai-worker `65d171a` deployed by PK |
| Stage 12 reactivation (drop shadow filter 052 + reactivate Phase B crons) | ✅ migration 052 (commit `f58e82d`); crons confirmed active |
| Stage 12.053 ai_job UPSERT (architectural symmetry with 051) | ✅ migration 053 (commit `6d66312f`) |
| Stage 12 V1–V8 verification | ✅ all passed; phantom cron-pause issues observed (operational, not architectural) |
| Lessons #33 + #34 captured | ✅ this commit |
| Memory updated | ✅ this commit |
| Dashboard roadmap update | ✅ next commit (separate repo) |

---

## 🟢 PHASE B STAGES 10–12 — DEPLOYED STATE

### Migrations applied this session (8 total: 046–053)

| # | Migration | Stage | Notes |
|---|---|---|---|
| 046 | `stage_10_ai_worker_shadow_filter_initial` | 10 | Add `aj.is_shadow = false` to `f.ai_worker_lock_jobs_v1` picked CTE |
| 047 | `stage_10_register_phase_b_crons` | 10 | Register fill (75), recovery (76), breaking (77), critical-window (78), pool-health (79) crons; insert 5 heartbeat seeds |
| 048 | `stage_11_ld18_unique_partial_index` | 11 | `CREATE UNIQUE INDEX uq_post_draft_slot_id ON m.post_draft (slot_id) WHERE slot_id IS NOT NULL` |
| 049 | `stage_11_drop_shadow_filter` | 11 | Drop `is_shadow=false` filter from lock function (ai-worker v2.10.0+ handles natively) |
| 050 | `stage_12_050_grant_slot_to_service_role` | 12 | `GRANT SELECT, UPDATE ON m.slot TO service_role` — fixes silent UPDATE failure |
| 051 | `stage_12_051_fill_pending_slots_upsert` | 12 | post_draft INSERT → UPSERT with `ON CONFLICT (slot_id) WHERE (slot_id IS NOT NULL) DO UPDATE` matching LD18 partial index predicate |
| 052 | `stage_12_052_drop_shadow_filter` | 12 | Drop emergency-readded shadow filter post Stage 12 architectural fixes |
| 053 | `stage_12_053_fill_pending_slots_ai_job_upsert` | 12 | ai_job INSERT → UPSERT with `ON CONFLICT (post_draft_id, job_type) DO UPDATE` for architectural symmetry with 051 |

All migrations applied via Supabase MCP `apply_migration`. Three paired in-EF version bumps: v2.10.0 (Stage 11), v2.10.1 (Stage 11 fix-up), and v2.11.0 (Stage 12).

### Phase B objects in production (auto-firing)

**Phase B crons (jobids 75–79, all `active=true`):**

| jobid | Name | Schedule | Calls |
|---|---|---|---|
| 75 | fill-pending-slots-every-10m | `*/10 * * * *` | `m.fill_pending_slots(p_max_slots := 5, p_shadow := true)` |
| 76 | recover-stuck-fill-in-progress-every-15m | `*/15 * * * *` | `m.recover_stuck_slots()` |
| 77 | try-urgent-breaking-fills-every-15m | `*/15 * * * *` | `m.try_urgent_breaking_fills()` |
| 78 | critical-window-monitor-every-30m | `*/30 * * * *` | `m.scan_critical_windows()` |
| 79 | pool-health-check-hourly | `15 * * * *` | `m.check_pool_health(NULL)` |

**ai-worker EF v2.11.0:**

- Native handler for `slot_fill_synthesis_v1` payload (slot-driven path)
- Existing `rewrite_v1` handler retained (R6 path)
- LD7 ephemeral prompt caching on compliance/brand/platform_voice blocks
- LD18 idempotency via partial unique index on `m.post_draft(slot_id)`
- Lesson #33: `{ error }` destructuring on every Supabase JS write (insert/update/upsert/delete/rpc), `console.error` for best-effort writes (`writeUsageLog`), `throw` for must-succeed writes (slot/draft/ai_job UPDATEs)

### Verification summary across Stages 10–12

| Stage | Check | Result |
|---|---|---|
| 10 | V1–V6 (cron registration, heartbeats, shadow filter behaviour) | All passed |
| 11 | V1–V4 (LD18 index, payload handler, deploy, drop filter) | All passed |
| 11.1 | v2.10.1 fix-up (column name correction + fail-fast no-body check) | All passed |
| 12 | V1 grants applied | ✅ |
| 12 | V2 fill_pending_slots UPSERT present | ✅ |
| 12 | V3 ai-worker v2.11.0 deployed | ✅ |
| 12 | V4 shadow filter dropped post-Stage-12 | ✅ |
| 12 | V5 Phase B crons all active | ✅ (5 of 5) |
| 12 | V6 fill ticks succeeding | ✅ (6 successes; 1 historical dup-key on `ux_ai_job_unique` resolved by 053) |
| 12 | V7 shadow ai_jobs processing | ✅ (35 succeeded, 2 failed on content-quality only) |
| 12 | V8 slot lifecycle pending → fill_in_progress → filled | ✅ (33 of 35 filled slots have proper `filled_draft_id`/`filled_at`; 2 are pre-existing anomalies) |

### Three new lessons captured this session

- **Lesson #32 (third instance — pre-flight column verification).** Stage 11 brief assumed `body_text`/`body_excerpt` on `f.canonical_content_body` (actual: `extracted_text`/`extracted_excerpt`). Now codified as standing rule: **pre-flight queries must hit every directly-touched table for column names + types + NOT NULL + CHECK constraints + partial indexes.**
- **Lesson #33 (NEW — Supabase JS error destructuring).** Every `await supabase.from(...).insert/update/upsert/delete()` and `await supabase.rpc(...)` must destructure `{ error }` and throw on non-null. Without this, PostgREST permission errors and constraint violations pass silently. Surfaced via the silent slot UPDATE failure: `m.slot` had zero `service_role` grants → PostgREST returned a permission error → ai-worker code never read `error` → calling code believed UPDATE succeeded → 19 of 20 shadow ai_jobs left their slots in `pending_fill`. Codified in v2.11.0 ai-worker; standing rule for all future EF code.
- **Lesson #34 (NEW — recovery owns dependent state).** When `m.recover_stuck_slots()` resets a slot to `pending_fill`, it must consider every row that points BACK at the slot: post_draft (LD18 conflict via 12.051) and ai_job (`ux_ai_job_unique` conflict via 12.053). The fix here was to make the downstream `m.fill_pending_slots()` idempotent via UPSERT rather than make recovery delete dependents (preserves audit trail). Future recovery-style functions: think about every dependent row and either delete it or arrange for the next-stage function to refresh it.

### One observed phantom (operational, not architectural)

Calls to `cron.alter_job(jobid, active := false)` returned `success` but the pause did NOT persist across the session. Verified twice — pause confirmed via `SELECT active FROM cron.job` immediately after, but minutes later the cron was active again. No cron alteration was performed by any subsequent migration or deploy. Working hypothesis: a Supabase MCP wrapper transaction rolling back the alter_job DDL after returning success. **Not blocking** — system stayed in safe state because the shadow filter prevented unintended ai-worker pickups during the affected window. **Track for future investigation** — if `cron.alter_job` is unreliable in the MCP context, all future emergency pause sequences should verify with a second query AFTER 30+ seconds AND consider direct DB connection as fallback.

---

## ⛔ DO NOT TOUCH NEXT SESSION

1. **The 5 Phase B crons (jobids 75–79).** Let them run. Gate B observation requires uninterrupted firing for 5–7 days.
2. **The 35 shadow drafts in `m.post_draft` with `is_shadow=true`.** Don't approve, don't reject, don't delete. They are the Gate B evaluation set — PK reviews them in dashboard inbox to assess shadow draft quality vs R6 baseline.
3. **R6 seed crons (jobids 11, 64, 65).** Stay paused. Only unpause after Gate B exit decision.
4. **R6 ai-worker (jobid 5).** Active. Processing both legacy R6 jobs AND Phase B shadow jobs after 12.052 dropped the filter. Do NOT add the filter back unless paused by Gate B exit.
5. **IG cron (jobid 53).** Paused awaiting Meta restriction clear. Check Meta status before unpausing.
6. **All 4 external reviewers paused per D162.**
7. **2 anomalous filled slots without `filled_draft_id`/`filled_at`** (slots `8f9e5c57-...` and `52bfb83b-...`). The first is from Stage 11's silent-UPDATE-period; the second was a manual UPDATE by chat during root-cause investigation. Don't try to retrofit them — recovery cron will eventually flag them or they'll age out. Both slots are `scheduled_publish_at` in the past so they're harmless ghosts.

---

## 🟡 NEXT SESSION — GATE B OBSERVATION + STAGE 13 PLANNING

### Gate B observation (5–7 days, starts 27 Apr afternoon)

Watch daily:

- **Pool health per vertical** — `m.check_pool_health()` per vertical_id; expect green for AU client verticals, watch for yellow/red on thin Invegent verticals (D174 — Invegent verticals 3× thinner than AU client verticals)
- **Evergreen ratio per client** — `m.evergreen_ratio_7d` view; LD12 alert at >30%
- **Slot confidence distribution** — aggregate over `m.slot_fill_attempt`; is the ratio of `filled` vs `evergreen` vs `skipped` decisions sensible?
- **Recovery rate** — count of `m.slot_fill_attempt.decision='recovered_to_pending'` per day; should be <5% of slots in healthy state
- **Critical-window alert frequency** — `m.slot_alerts WHERE alert_type='slot_critical_window'`; baseline TBD
- **Breaking news urgent-slot insertion rate** — `m.try_urgent_breaking_fills` outputs; baseline TBD
- **ai-worker cost per shadow draft** — total Anthropic spend / shadow drafts produced; target $0.012 per draft (proves LD7 prompt caching delivers)
- **Failure rate** — `m.ai_job WHERE is_shadow=true AND status='failed'` per day; current baseline 2 failures (both content-quality, not architectural). Track trend.

### Gate B exit criteria

- **Decision quality.** PK manually reviews ≥10 shadow drafts and judges them indistinguishable from (or better than) R6 baseline drafts on tone, accuracy, vertical relevance, compliance.
- **Cost predictability.** Per-draft cost stable around $0.012; total monthly run-rate projects to under $30/month at full Phase B scale.
- **Stability.** No untriaged alerts. Recovery rate under 5%. ai_job failure rate under 5% and trending toward 0.
- **Performance.** p95 `m.fill_pending_slots` latency under 5 seconds (TBD — measure during Gate B).

### Stage 13 candidate items (post Gate B)

Captured for backlog, NOT for immediate action:

- **Stuck-failure kill switch.** The 2 current failures (`slot_fill_no_body_content`, `openai_missing_title_or_body`) will cycle indefinitely as recovery resets the slot and fill UPSERT refreshes the ai_job. Need a max-retry cap that promotes a slot to `skipped` with reason after N failed fills. Probably extend `m.recover_stuck_slots()` with an `attempts` cap on the ai_job → if reached, slot transitions to `skipped` with `skip_reason='exhausted_retries:<error_signature>'`.
- **Duplicate unique-index cleanup.** `ux_ai_job_unique` and `ux_ai_job_post_draft_job_type` enforce the same constraint on `m.ai_job(post_draft_id, job_type)`. Drop one for hygiene. Not blocking.
- **Grants audit pass on m.* schema.** 34 of 43 m.* tables have zero `service_role` grants. Stage 12 fixed only `m.slot` (the table that actively bit). Lesson #33 (`{ error }` destructuring) defends against future grant gaps generically — when the next EF hits a missing grant, it'll throw with a clear PostgREST error. We'll add grants reactively as needed. A blanket sweep would be tempting but risks granting more than necessary.
- **`cron.alter_job` reliability investigation.** If the phantom-pause issue recurs, dig into Supabase MCP's transaction handling for `cron` schema operations. Maybe direct `psql` via Windows for emergency pauses.
- **Branch sweep follow-up.** 9 orphan fix branches across the three repos can be deleted once PK confirms each is fully merged: `Invegent-content-engine` (3): `fix/m11-fb-ig-publish-disparity`, `fix/m8-ai-worker-draft-multiplication`, `fix/q2-normalise-feed-config-url`; `invegent-dashboard` (5): `fix/cfw-schedule-save-silent-error`, `fix/m5-rpc-get-publish-schedule`, `fix/m7-dashboard-feeds-create-exec-sql`, `fix/m9-client-switch-staleness-and-platform-display`, `fix/q2-dashboard-feeds-create-key`; `invegent-portal` (1): `fix/m6-portal-exec-sql-eradication`. All are M-series or Q-series fixes whose work is documented as merged in main.

### Phase B reactivation doc (pre-sales follow-up)

A10b on the pre-sales register was gated on Phase B running. Now unblocks for first-shadow-results review next session.

---

## ARCHITECTURAL REVISIONS vs v4 (LOCKED IN PRODUCTION)

From Phase A: R-A through R-E (canonical_vertical_map, two-trigger chain, MCP-applied migrations, FK on versioned class_code, 10 ice_format_keys).

From Phase B Stages 7-9: D177 (fitness scale 0..100), D178 (FK CASCADE), D179 (Stage 10/11 ordering Option B).

From Phase B Stages 10–12: NO new architectural revisions to v4. Stage 12 was three corrective migrations (grants gap + UPSERT idempotency × 2) and an EF defensive-coding upgrade. v4's intent preserved.

---

## SESSION STARTUP PROTOCOL

1. Read this file in full
2. Read v4 brief Phase B sections (`docs/briefs/2026-04-25-slot-driven-architecture-build-plan-v4.md`) — now describes deployed state, NOT pending state
3. Read Stage 12 brief (`docs/briefs/cc-stage-12.md`) — most recent CC stage; useful template for future briefs
4. Orphan branch sweep — all 3 repos
5. Check `c.external_reviewer` — confirm all 4 paused
6. Check R6 seed crons — confirm jobid 11, 64, 65 active=false
7. Check IG cron jobid 53 — confirm active=false (Meta restriction)
8. Check FB+LI publisher crons — confirm active=true (jobid 7, 54)
9. Check Phase A crons — jobid 69-74 all active=true, recent firing
10. Check Phase B crons — jobid 75-79 all active=true, recent firing
11. Check `cron.job_run_details` for jobid 5 (R6 ai-worker) — should be processing both rewrite_v1 AND slot_fill_synthesis_v1 jobs
12. Check `m.signal_pool` row counts (was 1,694 at Phase A close; should have grown organically)
13. Check `m.slot` distribution — should show pending_fill count cycling through 25–50 as fills happen and new slots promote
14. Check `m.post_draft WHERE is_shadow=true` count — should be growing every 10min by ~3–5 drafts per fill tick
15. Check `m.ai_usage_log WHERE created_at::date = CURRENT_DATE` SUM(cost_usd) — should be in line with Gate B target
16. Check `m.slot_alerts` for any unexpected types — `cron_heartbeat_missing` should be ZERO; `slot_critical_window` and `evergreen_threshold_exceeded` are expected as observation data
17. Check `m.ai_job WHERE is_shadow=true AND status IN ('failed','dead')` — track failure trend across sessions
18. **Decide:** are we still in Gate B observation or ready for Phase C cutover prep? Default = observation continues until Day 5 minimum.

---

## DEV WORKFLOW RULE (D165 + Phase A reality + D179)

**Default for Phase A/B build: feature branch `feature/slot-driven-v3-build`.** Direct push to main is the standing rule for non-build work.

**Stage briefs go to main** (`docs/briefs/cc-stage-NN.md`). **Stage execution goes to feature branch** (`supabase/migrations/20260427_NNN_*.sql`).

**Migrations applied via Supabase MCP, NOT `supabase db push`** (R-C / D170).

**EF deploys via PowerShell from `C:\Users\parve\Invegent-content-engine`** — Windows MCP times out on `supabase functions deploy`. v2.11.0 deployed successfully via this path.

**Lesson #32 (pre-flight) applies to every brief.** Lesson #33 (`{ error }` destructuring) applies to every Supabase JS write. Lesson #34 (recovery owns dependent state) applies to every recovery-style function design.

---

## CURRENT PHASE

**Phase 3 — Expand + Personal Brand** active.

**Sub-phase 3.x — Slot-Driven Architecture build:**
- Phase A — ✅ **COMPLETE 26 Apr morning** — Foundation (Stages 1-6, 31 migrations, 6 crons, Gate A passed)
- Phase B Stages 7-9 — ✅ **COMPLETE 26 Apr afternoon–evening** — Scoring helpers + fill function + defensive layer (14 migrations)
- Phase B Stages 10-12 — ✅ **COMPLETE 27 Apr** — Crons wired + ai-worker refactor (v2.10 → v2.11) + grants + UPSERT idempotency end-to-end (8 migrations + 3 EF deploys)
- Gate B — 🟡 **STARTS NOW** — 5-7 days shadow observation
- Phase C — 🔲 Cutover per-client-platform (Stages 13–18, post Gate B)
- Phase D — 🔲 Decommission old R6 (Stage 19)
- Phase E — 🔲 Evergreen seeding (parallel content work, ~50 items, prioritise Invegent verticals)

Pre-sales gate: **14 of 30** Section A items closed (A11b + A21 24 Apr; A22 + A27 + A28 27 Apr — see `docs/15_pre_post_sales_criteria.md` v4.4 drift notice). A10b unblocks tomorrow (Phase B running gate now passed).

---

## TODAY'S COMMITS (27 APR)

**Invegent-content-engine — `feature/slot-driven-v3-build` branch:**

Stage briefs (committed to `main`):
- `e9f2c9a` — docs(briefs): Stage 10 CC brief
- `c826fb5` — docs(briefs): Stage 11 CC brief
- `792e8b8` — docs(briefs): Stage 11 fix-up brief
- `3908a58` — docs(briefs): Stage 12 brief

Stage execution + fix-ups (committed to `feature/slot-driven-v3-build`):
- `c22f460` — feat(ai-worker): Stage 10 add is_shadow=false filter (migration 046)
- `7aa6f8f` — feat(crons): Stage 10 register 5 Phase B crons (migration 047)
- `2d4c02b` — feat(db): Stage 11 LD18 unique partial index (migration 048)
- `ae9689c` — feat(ai-worker): Stage 11 v2.10.0
- `f865a69` — feat(db): Stage 11 drop shadow filter (migration 049)
- `6f33b5c` — feat(ai-worker): Stage 11 v2.10.1 column-name fix-up
- `ef8116c` — feat(db): Stage 12.050 service_role grants on m.slot
- `359c8e7` — feat(db): Stage 12.051 fill_pending_slots post_draft UPSERT
- `65d171a` — feat(ai-worker): Stage 12 v2.11.0 error destructuring (Lesson #33)
- `f58e82d` — feat(db): Stage 12.052 drop shadow filter, reactivate Phase B
- `6d66312f` — feat(db): Stage 12.053 fill_pending_slots ai_job UPSERT (architectural symmetry)

**Reconciliation (committed to `main`):**
- `6107e790` — docs(sync_state): Phase B Stages 10–12 complete, Gate B starts (initial)
- `71bb329b` — feat(roadmap): Phase A + B COMPLETE 27 Apr; Gate B observation in progress (invegent-dashboard)
- THIS COMMIT — docs(sync_state): full reconciliation pass — arithmetic corrections, branch sweep, pre-sales cross-reference

**Migrations (DB-only, all via Supabase MCP):** **8 total this session (046–053). Total Phase A + B end-to-end: 53 migrations** (31 Phase A + 14 Phase B Stages 7-9 + 2 Stage 10 + 2 Stage 11 + 4 Stage 12).

**EF deploys this session:** 3 — ai-worker v2.10.0 (Stage 11), v2.10.1 (Stage 11 fix-up), v2.11.0 (Stage 12). All deployed by PK from PowerShell.

---

## CLOSING NOTE FOR NEXT SESSION

Monday 27 Apr was the longest single ICE build session yet. Started ~11pm Sunday Sydney, continued through the entire day. Phase B went from "callable functions" to "running in shadow mode and producing real LLM-generated drafts" via three complete stages and one fix-up. Three new lessons codified.

**The slot-driven architecture is now live in shadow mode. R6 still publishes. Gate B observation begins.**

**State at close (27 Apr ~3:45pm Sydney):**

- **Phase A still autonomous** (6 crons, 1,694+ pool, no alerts)
- **Phase B autonomous in shadow mode** (5 crons firing, 35 shadow drafts produced, 2 content-quality failures)
- **R6 paused, FB+LI publishing healthy** (legacy queue draining)
- **R6 ai-worker (jobid 5) shared between R6 and Phase B paths** (filter dropped, v2.11.0 handles both job types)
- **Anthropic spend today: ~$0.78** for Phase B observation; well within $200 monthly cap (4 days to reset)
- **All three architectural Stage 12 fixes deployed and verified** (grants, post_draft UPSERT, ai_job UPSERT)
- **Branch sweep done.** 9 orphan fix branches identified across 3 repos (3+5+1) — listed under Stage 13 backlog above for PK to delete via `git push origin --delete <branch>`.

**Realistic next working windows:**

- Tue 28 Apr through Mon 5 May: Gate B observation. Daily ~10-min check on the metrics in "Gate B observation" section above. No build work unless a real blocker surfaces.
- During Gate B: Pre-sales register A11b (content prompts × 18 rows for CFW + Invegent), A6 subscription costs, A4→A3 proof doc, A18 source-less EFs are all good parallel work.
- Tue 6 May or once Gate B exit criteria met: Phase C planning session (cutover per-client-platform).

**Lessons captured 27 Apr (35 total — 32 from prior, 3 new):**

33. **Every Supabase JS write must destructure `{ error }`.** PostgREST permission errors and constraint violations pass silently when `error` is not read. Throw on non-null for must-succeed writes; `console.error` for best-effort writes. This rule applies to `.insert()`, `.update()`, `.upsert()`, `.delete()`, `.rpc()` — both with and without `.schema()` prefix. Codified in v2.11.0; standing rule for all future EF code.

34. **Recovery systems must own dependent state.** `m.recover_stuck_slots()` resets the slot but leaves orphaned `m.post_draft` and `m.ai_job` rows. The fix here was to make the downstream fill function idempotent via UPSERT rather than have recovery delete dependents (preserves audit trail). Future recovery-style functions: enumerate every row that points back at the primary entity and design the next-stage function to refresh it.

(Lesson #32 logged third instance this session — column-name assumption — with no new content but reinforcing severity. Three instances in three weeks crystallises the standing rule: pre-flight queries hit every directly-touched table.)

---

## END OF MONDAY 27 APR SESSION

Next session priority: Gate B observation start. Daily check-in cadence. Build pause until Gate B exit decision (5–7 days).

R6 paused, Phase A autonomous, Phase B autonomous in shadow, publishing healthy via legacy queue. Anthropic spend bounded. Very solid handover state.
