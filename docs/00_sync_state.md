# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-26 Sunday ~16:30 AEST — **Phase A COMPLETE: Gate A passed; Stages 1–6 deployed; pool + slots running autonomously**
> Written by: PK + Claude session sync

---

## ⏸ 26 APR SUNDAY ~16:30 AEST — PHASE A COMPLETE

### In one paragraph

Sunday 26 Apr was the second consecutive long-form session. Started with v4 pre-flight schema verification, which surfaced a structural gap (`f.canonical_vertical_map` did not exist in production despite v4 §A.5 assuming it), four schema mismatches with v4 SQL (vertical_id integer not uuid, canonical_title not title, ai_job_id not id, t.content_class versioned so partial-unique can't FK), and the standing-pattern blocker (`supabase db push` is incompatible with this repo's MCP-applied DB-only migration history). Architecture revised to add `f.canonical_vertical_map` as a structural piece (Migration 008), trigger split into a two-trigger chain (classifier→vertical_map→pool), and migration application standardised on Supabase MCP `apply_migration`. **All 6 Phase A stages deployed, 31 migrations applied, Gate A verified at ~06:11 UTC** (16:11 AEST). Phase A pipeline is now autonomous: pool stays fresh, slots auto-materialise nightly, slots auto-promote every 5 minutes. R6 still paused. Old pipeline still untouched. Anthropic spend still essentially zero.

### Critical state right now

1. **Phase A COMPLETE** — Gate A passed. All 6 Phase A crons firing on schedule. Pool + slots running autonomously.
2. **Pool: 1,694 active rows** in `m.signal_pool` across 8 verticals, 6 classes, 648 distinct canonicals. Growing organically (+26 since Stage 5 close).
3. **Slots: 70 total** (58 future, 12 pending_fill). Pending_fill slots are Mon 27 Apr — they'll wait for Stage 8 fill function.
4. **6 new Phase A crons active** (jobid 69-74). 2 confirmed firing in production (promote-slots-every-5m at jobid 73, backfill-every-15m at jobid 71).
5. **R6 seed crons all paused** (jobid 11, 64, 65 active=false) — unchanged.
6. **All 14 publish profiles** still have destination_id populated. Throttle bypass class CLOSED.
7. **FB and LI publishers healthy** (jobid 7, 54). 145 queued, 91 published, 42 dead — same shape as session start.
8. **All 4 external reviewers paused** per D162 — unchanged.
9. **Repo:** `feature/slot-driven-v3-build` branch — 6 commits Stage 1→Stage 6, 31 migration files, ahead of main by 31 migrations.

### Today's deltas (26 Apr)

| Item | Status |
|---|---|
| Stage 1 (extension + 7 tables, including canonical_vertical_map) | ✅ commit `b4c8308` (8 migrations applied via MCP) |
| Stage 2 (5 config tables + 2 helpers + post_draft cols + trigram index) | ✅ commit `d132a83`, fix-up `130a559` (FK on versioned class_code dropped) |
| Stage 3 (two-trigger chain — classifier→vertical_map→pool) | ✅ commit `80d7b4b` (3 migrations + V6 functional test passed) |
| Stage 4 (expire/reconcile/backfill maintenance + initial 1,666-row backfill) | ✅ commit `a8b0c1f` |
| Stage 5 (slot materialiser + promoter + rule-change trigger + 70-slot materialisation) | ✅ commit `8a072aa` |
| Stage 6 (heartbeat infrastructure + 6 cron registrations + Gate A) | ✅ commit `2799253` |
| Gate A verification | ✅ all 11 checks passed; first cron tick at 06:10:00 UTC succeeded in 81ms |

---

## 🟢 PHASE A — DEPLOYED STATE

### Migrations applied (31 total this session)

| # | Migration | Notes |
|---|---|---|
| 001 | `install_pg_trgm_extension` | For Stage 2 trigram index |
| 002 | `create_signal_pool_table` | Vertical-scoped materialised pool |
| 003 | `create_slot_table` | Slot state machine (8 states per LD13) |
| 004 | `create_slot_fill_attempt_table` | Audit trail per fill attempt |
| 005 | `create_evergreen_library_table` | LD3 fallback (Phase E populates) |
| 006 | `create_slot_alerts_table` | Operational alerts surface |
| 007 | `create_cron_health_check_table` | Heartbeat tracking, 10 jobnames seeded |
| 008 | `create_canonical_vertical_map_table` | **NEW vs v4** — closes structural gap |
| 009 | `create_class_freshness_rule_table` | 6 seeds; FK to t.content_class dropped due to versioning |
| 010 | `create_format_synthesis_policy_table` | 10 seeds (one per ice_format_key in production) |
| 011 | `create_format_quality_policy_table` | 10 seeds with per-format min_fitness_threshold |
| 012 | `create_reuse_penalty_curve_table` | 4 seeds (LD9 soft penalty buckets) |
| 013 | `create_dedup_policy_table` | 3 seeds (default/strict/lenient — LD16) |
| 014 | `alter_post_draft_add_slot_id_is_shadow` | Slot linkage + shadow flag |
| 015 | `create_title_similarity_function` | pg_trgm wrapper, IMMUTABLE |
| 016 | `create_keyword_overlap_function` | Jaccard on tokenised sets, IMMUTABLE |
| 017 | `create_canonical_title_trgm_index` | GiST on canonical_title (not title — corrected) |
| 018 | `create_resolve_canonical_verticals_function` | canonical → vertical chain |
| 019 | `create_refresh_signal_pool_for_pair_function` | UPSERT helper, F9-correct |
| 020 | `create_pool_population_triggers` | Two-trigger chain |
| 021 | `create_expire_signal_pool_function` | Hourly cleanup |
| 022 | `create_reconcile_signal_pool_function` | Daily 3-pass drift correction |
| 023 | `create_backfill_missing_pool_entries_function` | LD19 batch-bounded |
| 024 | `create_compute_rule_slot_times_function` | Per-rule future timestamp generator |
| 025 | `create_slot_unique_constraint` | Partial unique for ON CONFLICT |
| 026 | `create_materialise_slots_function` | Main materialiser |
| 027 | `create_handle_schedule_rule_change_trigger` | Auto-reflow on schedule edits |
| 028 | `create_promote_slots_to_pending_function` | F8 10-min lookahead |
| 029 | `create_heartbeat_infrastructure` | Heartbeat helper + view + check fn |
| 030 | `register_phase_a_crons` | 6 cron.schedule() calls |
| 031 | `seed_heartbeat_check_row` | 11th seed for self-monitor |

All migrations applied via Supabase MCP `apply_migration`. CC's role was creating source-of-truth migration files in the repo (`supabase/migrations/`), committing, and pushing. CLI `supabase db push` is incompatible with the repo's existing 280-migration history (CLI fails at history reconciliation pre-check) and was abandoned for this session and all future stages.

### Phase A crons registered (6 total)

| jobid | name | schedule (UTC) | next fire | what it does |
|---|---|---|---|---|
| 69 | `expire-signal-pool-hourly` | `5 * * * *` | 06:35 UTC = 16:35 AEST | Marks pool entries past pool_expires_at as is_active=false |
| 70 | `reconcile-signal-pool-daily` | `30 16 * * *` | 16:30 UTC tomorrow = 02:30 AEST Mon | 3-pass class/fitness/orphan drift correction |
| 71 | `backfill-missing-pool-entries-every-15m` | `*/15 * * * *` | (firing) | LD19 batch-bounded race-miss safety net |
| 72 | `materialise-slots-nightly` | `0 15 * * *` | 15:00 UTC tomorrow = 01:00 AEST Mon | Adds the 8th day forward to slot horizon |
| 73 | `promote-slots-to-pending-every-5m` | `*/5 * * * *` | (firing) | future → pending_fill at fill_window_opens_at |
| 74 | `cron-heartbeat-check-hourly` | `45 * * * *` | 06:45 UTC = 16:45 AEST | Self-monitor; raises slot_alerts on missed heartbeats |

Each cron command pattern: `SELECT m.heartbeat('<jobname>'); SELECT m.<function>();` so heartbeats happen on every tick.

Confirmed in production at 06:15:00 UTC: promote-slots fired in 59ms, backfill in 285ms, both `succeeded` in `cron.job_run_details`. Pool grew +26 rows in the 30 minutes since Stage 5 close — organic growth from classifier cron + backfill cron working in concert.

### Pool composition (post-Gate A)

| Vertical | Pool size |
|---|---|
| 11 NDIS | 279 |
| 12 AU Disability Policy | 279 |
| 7 AU Residential Property | 271 |
| 9 AU Property Investment | 271 |
| 10 AU Mortgage & Lending | 271 |
| 17 Content Marketing | 99 |
| 16 Social Media Strategy | 99 |
| 15 AI & Automation | 99 |

NDIS+ADP and PP-verticals are equal pairs because clients sharing those verticals (NY+CFW share 11+12; PP gets 7+9+10 for every property canonical) share pool entries — exactly v3's vertical-scoped design intent.

**Operational signal:** Invegent's globals (15/16/17) at 99 each vs AU verticals at 271–279 — Invegent's pool is roughly 3× thinner than NY/PP. Phase E evergreen seeding for Invegent should be prioritised over the others.

### Slots materialised

70 slots over Mon 27 Apr → Fri 1 May, distributed:

| Client | FB | IG | LI | YT | Total |
|---|---|---|---|---|---|
| NDIS-Yarns | 5 | 5 | 5 | 5 | 20 |
| Property Pulse | 5 | 5 | 5 | 5 | 20 |
| Care For Welfare | 5 | 5 | 5 | — | 15 |
| Invegent | 5 | 5 | 5 | — | 15 |

12 slots are already in `pending_fill` status (Mon 27 Apr slots whose fill window has already opened — within 24h of now). They will wait there until Stage 8 fill function exists and Stage 10 wires its cron.

### Format preferences resolved at materialisation

- All FB slots: `image_quote` (set on c.client_publish_profile.preferred_format_facebook for all 4 clients)
- NY YT, PP YT slots: `video_short_avatar` (hardcoded default — no preferred_format_youtube column exists)
- All IG slots: NULL (preferred_format_instagram not set on any profile)
- All LI slots: NULL (preferred_format_linkedin not set on any profile)

**Note:** IG and LI NULL is acceptable — Stage 8 fill function falls back to "any viable format" when format_preference is empty. But it's a tuning opportunity — if PK wants IG and LI to default-prefer something specific, set those columns post-Phase B.

---

## ARCHITECTURAL REVISIONS vs v4 (LOCKED IN PRODUCTION)

### R-A — `f.canonical_vertical_map` added as Stage 1 Migration 008

v4 §A.5 assumed this table existed. Pre-flight discovered it didn't. The actual classifier output writes `content_class` to `f.canonical_content_body.content_class` — there was no canonical→vertical mapping anywhere in production.

**Resolution:** Added `f.canonical_vertical_map` as a 7th Stage 1 table (canonical_id + vertical_id PK). Populated by the Trigger 1 chain on classifier output. Stage 4 backfill seeded the existing 648 canonicals × ~2.6 verticals = 1,668 rows. Mapping_source column distinguishes `classifier_auto` vs `backfill` for audit.

### R-B — Two-trigger chain replaces v4's single trigger

v4 §A.5 proposed one trigger on `f.canonical_vertical_map`. Stage 3 split this into:

1. **Trigger 1** — `f.canonical_content_body` AFTER UPDATE OF content_class OR INSERT — resolves verticals via `canonical → content_item → client_source → client_content_scope`, INSERTs vertical_map rows (ON CONFLICT DO NOTHING).
2. **Trigger 2** — `f.canonical_vertical_map` AFTER INSERT — calls `m.refresh_signal_pool_for_pair(canonical_id, vertical_id)` per row.

Reclassification handled by explicit refresh loop in Trigger 1 (the ON CONFLICT path doesn't fire Trigger 2 on existing mappings, so we manually refresh existing pool entries when class changes).

Functionally equivalent to v4's intent; testable in isolation; better audit trail.

### R-C — Migrations applied via Supabase MCP, NOT `supabase db push`

CLI `supabase db push` fails at history reconciliation pre-check because the repo has ~280 DB-only migration entries on the remote (applied via SQL editor, MCP, or direct SQL — the standing pattern) that don't exist as files in `supabase/migrations/` locally. Two CLI fixes were rejected: `migration repair --status reverted` (papers over the gap), `db pull` (pollutes the diff with 280 files).

**Pattern locked for all future stages:** CC creates source-of-truth files in `supabase/migrations/`, commits, pushes. Claude (chat) applies via Supabase MCP `apply_migration`. CLI link is still useful for `supabase functions deploy` (Stage 11) but never for `db push`.

### R-D — FK on `t.class_freshness_rule.class_code` dropped

`t.content_class` is a versioned table — `class_code` is unique only per (`class_code`, `version`) and via a partial-unique index `WHERE is_current=true`. PostgreSQL won't accept a partial unique as an FK target. Resolution: dropped the FK, added a `DO $$ ... $$` orphan check that validates seed values exist as `is_current=true AND is_active=true` rows. Application-level integrity. CC was instructed to amend the migration file to match the applied SQL (commit `130a559`).

### R-E — 10 ice_format_keys, not 6

v4 §C.1.5 specced 6 `format_synthesis_policy` and `format_quality_policy` rows. Production has 10 distinct `ice_format_key` values in `t.class_format_fitness`. Both seeds expanded to 10 rows.

---

## 🟢 NEXT SESSION — PHASE B BEGINS

### Phase B overview (Stages 7-11, ~5-7 hours engineering + 5-7 days observation)

| Stage | Goal |
|---|---|
| 7 | Confidence + pool health + ratio functions (LD10, LD12) |
| 8 | **THE FILL FUNCTION** — heart of v3, longest single migration |
| 9 | Recovery (stuck fill_in_progress) + breaking news (LD17, LD20) |
| 10 | Phase B crons + shadow mode wiring |
| 11 | ai-worker idempotency (LD18) |
| Gate B | 5-7 days shadow observation before any cutover |

### Stage 7 prerequisites

- 12 slots already in `pending_fill` waiting for fill function
- 1,694 active pool rows already present
- All Phase A maintenance running autonomously (pool stays fresh, new slots materialise)

### Critical questions deferred

None outstanding. v4 §5 questions answered:

- **Branch strategy:** feature branch `feature/slot-driven-v3-build` — confirmed working through Stages 1-6
- **First cutover target:** NY Facebook (Stage 13, expected default) — to be re-confirmed at Phase C entry
- **CC execution mechanism:** brief committed to `docs/briefs/cc-stage-NN.md`, PK runs CC against the file locally, CC reports back to chat — confirmed working through Stages 1-6

### Defaults reconfirmed for Phase B

- Migrations applied via Supabase MCP, NOT `supabase db push`
- Each stage = brief commit → CC creates files → CC commits + pushes → Claude (chat) applies via MCP → Claude (chat) verifies → PK approves → next stage
- R6 stays paused throughout Phase B
- Old pipeline (digest_run, ai_job, post_seed, post_publish_queue from R6 era) untouched — Phase B is shadow-only

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else.**

### Priority 1 — Stage 7 brief

1. Read this sync_state file (which captures all 31 Phase A migrations + 6 architectural revisions)
2. Read v4 brief `docs/briefs/2026-04-25-slot-driven-architecture-build-plan-v4.md` for Phase B specs (§B)
3. Run pre-flight Supabase MCP queries against any Stage 7-specific schema (LD10 confidence, LD12 evergreen ratio inputs)
4. Write Stage 7 brief for CC: confidence/health/ratio functions
5. Hand to PK; PK runs CC; CC reports; Claude (chat) applies via MCP; Claude (chat) verifies; PK approves → Stage 8

### Priority 2 — Verify Phase A crons survived overnight

Confirm at session start:
- Cron ticks accumulated overnight (look at `cron.job_run_details` for jobid 69-74)
- expire-signal-pool fired at hourly intervals (should see ~24 ticks for daily session-to-session)
- Pool growth from organic classifier activity
- No `cron_heartbeat_missing` alerts in `m.slot_alerts`
- Materialise nightly fired at 15:00 UTC = 01:00 AEST (next morning) — slots horizon should advance to Tue 28 Apr → Sat 3 May
- Reconcile daily fired at 16:30 UTC = 02:30 AEST — should see clean zeros

### Priority 3 — A10b (waiting on external)

⏸ Meta restriction clearance. No active work. Re-test Mon 27 Apr if no auto-recovery.

### Critical state awareness

1. **R6 paused, cost stopped.** ~145-draft buffer covers ~4.5 days publishing.
2. **Phase A pipeline autonomous and healthy.** 6 crons firing, 1,694-row pool, 70 slots.
3. **Old pipeline untouched.** Publishers still draining the 145 R6-era queued drafts at normal cadence.
4. **All reviewers paused** per D162.
5. **IG cron paused** awaiting Meta restriction clear.
6. **12 slots in pending_fill** — these are Mon 27 Apr's slots, waiting for Stage 8 fill function. They will sit there harmlessly until Stage 10 wires the consumer.
7. **Anthropic spend zero from R6 perspective** — Phase A is all SQL functions, no LLM calls. (Phase B Stage 8 fill function will start consuming Claude API tokens once it ships and Stage 10 wires the cron.)

---

## SESSION STARTUP PROTOCOL

1. Read this file in full
2. Read v4 brief Phase B sections (`docs/briefs/2026-04-25-slot-driven-architecture-build-plan-v4.md`)
3. Orphan branch sweep — all 3 repos (focus: `feature/slot-driven-v3-build` should be ahead of main by 31 migrations + 6 brief commits)
4. Check `c.external_reviewer` — confirm all paused
5. Check R6 seed crons — confirm jobid 11, 64, 65 active=false
6. Check IG cron jobid 53 — confirm active=false (Meta restriction)
7. Check FB+LI publisher crons — confirm active=true (jobid 7, 54)
8. Check Phase A crons — jobid 69-74 all active=true, recent firing
9. Check `m.signal_pool` row counts vs end-of-26-Apr: 1,694 (will have grown organically)
10. Check `m.slot` distribution — should still be 70 minus any past-published, plus any from overnight materialise
11. Check `m.slot_alerts` — should have zero `cron_heartbeat_missing` rows
12. Run pre-flight queries for Stage 7 (LD10 confidence, LD12 evergreen ratio)
13. Begin Stage 7

---

## DEV WORKFLOW RULE (D165 + Phase A reality)

**Default for Phase A/B build: feature branch `feature/slot-driven-v3-build`.**

Direct push to main is the standing rule for non-build work. The 28-migration coordinated change of Phase A justified the branch (per v4 §5 default + practical experience over 6 stages).

**Migrations applied via Supabase MCP, NOT `supabase db push`** (R-C above). Use Supabase MCP `apply_migration` for all schema changes.

**EF deploys remain manual via PowerShell** (Windows MCP times out on `supabase functions deploy`). Stage 11 (ai-worker refactor) will be the first EF deploy of Phase B.

---

## EXTERNAL REVIEWER LAYER

All four reviewers paused per D162. No activations this session.

---

## CURRENT PHASE

**Phase 1 — COMPLETE.** **Phase 3 — Expand + Personal Brand** active.

**Sub-phase 3.x — Slot-Driven Architecture build:**
- Phase A — **COMPLETE 26 Apr** — Foundation (Stages 1-6, 31 migrations, 6 crons, Gate A passed)
- Phase B — **NEXT** — Fill function in shadow (Stages 7-11)
- Gate B — 5-7 days shadow observation
- Phase C — Cutover per-client-platform (Stages 12-18)
- Phase D — Decommission old R6 (Stage 19)
- Phase E — Evergreen seeding (parallel content work, ~50 items)

Pre-sales gate: 12 of 28 Section A items closed. A10b waiting on Meta restriction clear.

---

## ALL CLIENTS — STATE

| Client | client_id | FB | IG | LI | YT | Adequacy | r6_enabled | Notes |
|---|---|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ | ⏸ Meta restr | ✅ | 🔲 | **A** | ✅ all (R6 paused) | 18 cross-posts to delete via IG app or auto-clear. Pool: 279 (NDIS) + 279 (ADP). Slots: 20. |
| Property Pulse | 4036a6b5 | ✅ | ⏸ Meta restr | ✅ | 🔲 | **A** | ✅ all (R6 paused) | LI throttle armed. Pool: 271×3 (Resi/Investment/Mortgage). Slots: 20. |
| Care For Welfare | 3eca32aa | ✅ | ⏸ Meta restr | ✅ | 🔲 | **B** | ❌ all | Awaiting feed activation. Pool shared with NY (279+279). Slots: 15. |
| Invegent | 93494a09 | — | ⏸ Meta restr | ✅ | ✅ | **D** | ❌ all | 4 IG publishes Sat morning on v1.0.0 (clean). Pool: 99×3 (AI/Social/Content) — thinnest. Slots: 15. |

---

## SPRINT MODE — THE BOARD

### Slot-Driven Architecture track

| # | Item | Status |
|---|---|---|
| Architecture v1-v4 | 7 LLM reviews across 3 rounds | ✅ COMPLETE |
| v4 build plan | commit `26d88b8` | ✅ READY |
| Stage 1 (extension + 7 tables, including canonical_vertical_map) | Phase A | ✅ commit `b4c8308` |
| Stage 2 (config tables + helpers + post_draft cols + trigram) | Phase A | ✅ commit `d132a83`, fix `130a559` |
| Stage 3 (two-trigger chain) | Phase A | ✅ commit `80d7b4b` |
| Stage 4 (maintenance + backfill) | Phase A | ✅ commit `a8b0c1f` |
| Stage 5 (slot materialiser + promoter) | Phase A | ✅ commit `8a072aa` |
| Stage 6 (Phase A crons + heartbeat) | Phase A | ✅ commit `2799253` |
| **Gate A** | Phase A verification | ✅ **PASSED 26 Apr ~16:11 AEST** |
| Stage 7 (confidence + pool health + ratio) | Phase B | 🔲 NEXT SESSION |
| Stage 8 (fill function — biggest migration) | Phase B | 🔲 |
| Stage 9 (recovery + breaking news) | Phase B | 🔲 |
| Stage 10 (Phase B crons + shadow mode) | Phase B | 🔲 |
| Stage 11 (ai-worker idempotency, LD18) | Phase B | 🔲 |
| Gate B | Phase B 5-7 days shadow observation | 🔲 |
| Stages 12-18 | Phase C cutover per-client-platform | 🔲 |
| Stage 19 | Phase D decommission old R6 | 🔲 |
| Phase E | Evergreen seeding (~50 items hand-curated) | 🔲 (parallel) |

### Router track (legacy — being superseded)

| # | Item | Status |
|---|---|---|
| R1-R5 | shadow infrastructure + classifier + matching | ✅ LIVE (classifier cron 68 still feeding new pool entries via Stage 3 trigger chain) |
| R6 seed_and_enqueue | v1.0.1 | ⏸ PAUSED — to be DECOMMISSIONED in slot-driven Phase D Stage 19 |
| M12 IG publisher refactor | v2.0.0 | ✅ DEPLOYED |
| R7 ai-worker platform-awareness | — | OBSOLETE (refactored in Stage 11) |
| R8 cron changes | — | OBSOLETE (replaced by Phase A/B cron set) |

### HIGH priority items remaining

| # | Item | Status |
|---|---|---|
| **Slot-driven Stage 7** | Begin Phase B | NEXT SESSION |
| Manual deletion of 18 NY IG cross-posts | OR wait 24-48h Meta auto-clear | PK action when convenient |
| **CC-TASK-02 fix** | Feed-intelligence upsert | Dormant — orthogonal to slot-driven build |

### Not HIGH but actionable

- LI publisher audit (deferred — root cause of Sat cap breach now known via destination_id fix)
- m.post_publish_queue.status CHECK with 'dead' (D163 backlog)
- Carousel verification (v2.0.0 untested in production for carousel format)
- Meta App Review escalation (Mon 27 Apr trigger)
- IG and LI default format preferences (set `preferred_format_instagram` and `preferred_format_linkedin` post-Phase B if desired)

---

## WATCH LIST

### Due next session (Mon 27 Apr or later)

- Stage 7 begin (Phase B kickoff)
- Verify Phase A crons survived overnight (check `cron.job_run_details` for jobid 69-74)
- Verify pool growth (~1,700+ rows expected vs 1,694 at session close)
- Check `m.slot_alerts` for any cron_heartbeat_missing rows
- Verify nightly materialise + reconcile fired (jobid 72, 70)
- Verify destination_id backfill held (no LI over-publish in 24h)
- Check IG Meta restriction status

### Due week of 26 Apr - 2 May

- **Sun 26 Apr** ✅ DONE — Phase A complete
- **Mon 27 Apr - Wed 29 Apr** — Phase B target window (Stages 7-11)
- **Thu 30 Apr - Wed 6 May** — Phase B shadow phase observation
- **Mon 27 Apr** — Meta App Review escalation trigger (independent track)
- **Sat 2 May** — original reviewer calibration cycle trigger (defer)

### Backlog (open)

**Top of list — slot-driven Phase B:**
- Stage 7: Confidence + pool health + ratio functions (LD10, LD12)
- Stage 8: Fill function (longest single migration; ~150 lines per v3 §B.4-B.8)
- Stage 9: Recovery + breaking news (LD17, LD20)
- Stage 10: Phase B crons + shadow mode wiring
- Stage 11: ai-worker idempotency (LD18) — **first EF deploy of Phase B**
- Gate B: 5-7 days shadow observation
- Phase E: Evergreen seeding (parallel; prioritise Invegent given thin pool)

**Carried forward (orthogonal):**
- Manual IG cross-post deletion or wait for auto-clear
- m.post_publish_queue.status CHECK with 'dead'
- LI publisher audit (low priority — root cause known)
- Carousel verification (deferred until IG cron resumes)
- CC-TASK-02 HIGH (PK to choose Option A vs B)
- Cron health v3.1 schedule-string parsing (Phase A heartbeat is independent of this)
- D168 Layer 2 implementation
- Avatar configuration for Invegent (HeyGen)
- Invegent FB + IG activation (v0.2 positioning required)
- TPM saturation, docs/archive 5th file, reviewer pollution
- PP Schedule FB 6/5 violation, exec_sql sweep
- facebook-publisher EF audit, Shrishti 2FA
- IG/LI default format preferences (tuning, Phase B+)

---

## TODAY'S COMMITS (26 APR)

**Invegent-content-engine `feature/slot-driven-v3-build`:**

Stage briefs (committed to `main`):
- `7dfdcfd` — docs(briefs): Stage 1 CC brief
- `45c5e40` — docs(briefs): Stage 2 CC brief
- `24904bb` — docs(briefs): Stage 3 CC brief
- `dd20b83` — docs(briefs): Stage 4 CC brief
- `9e6903c` — docs(briefs): Stage 5 CC brief
- `44cb81e` — docs(briefs): Stage 6 CC brief

Stage execution (committed to `feature/slot-driven-v3-build`):
- `b4c8308` — Stage 1: extension + 7 tables (DDL only)
- `d132a83` — Stage 2: config tables + helpers + post_draft cols + trigram
- `130a559` — Stage 2 fix-up: drop FK on versioned class_code
- `80d7b4b` — Stage 3: pool population trigger chain
- `a8b0c1f` — Stage 4: pool maintenance + backfill
- `8a072aa` — Stage 5: slot materialiser + promoter + rule-change trigger
- `2799253` — Stage 6: Phase A crons + heartbeat → Gate A passed

**Migrations (DB-only, all via Supabase MCP):** 31 total — see migrations table above.

**This commit** — docs(sync_state): Phase A complete reconciliation

---

## CLOSING NOTE FOR NEXT SESSION

Sunday 26 Apr was the second consecutive long-form session. Phase A — the foundation of the slot-driven architecture inversion — is complete and running autonomously in production.

**State at close:**

- **Phase A crons firing** (6 registered, 2 confirmed firing live, 4 awaiting first scheduled tick — daily and hourly schedules)
- **Pool growing organically** (1,694 active rows; classifier cron 68 + backfill cron 71 + Stage 3 trigger chain compounding new entries every 5 minutes)
- **Slots populated** (70 total; 12 already promoted to pending_fill awaiting fill function)
- **R6 still paused, publishing untouched** (FB + LI draining the existing 145-row queue at normal cadence)
- **Old pipeline still functional** (the Phase A pipeline runs alongside, neither blocking the other)
- **Anthropic spend zero from R6 + Phase A** (Phase A is all SQL; no LLM calls until Stage 8 fill function ships and Stage 10 wires its cron)

**Realistic next working windows:**

- Mon 27 Apr morning: Stage 7 (confidence + pool health + ratio)
- Mon 27 Apr midday: Stage 8 (fill function — biggest single migration)
- Tue 28 Apr: Stage 9 (recovery + breaking news)
- Wed 29 Apr: Stage 10 (Phase B crons + shadow mode wiring)
- Thu 30 Apr: Stage 11 (ai-worker idempotency, first EF deploy of Phase B)
- Thu 30 Apr - Wed 6 May: Gate B observation (5-7 days)

**Lessons captured 26 Apr (29 total, 6 new from Sunday session):**

1-25. (See prior commits.)

26. **Supabase CLI `supabase db push` is incompatible with this repo's standing pattern.** The repo has ~280 DB-only migrations applied via SQL editor, MCP, or direct SQL — not via the local migrations folder. CLI fails at history reconciliation pre-check before reaching any new migration SQL. Two CLI fixes were rejected (migration repair papers over the gap; db pull pollutes the diff with 280 files). **Pattern locked: CC creates source-of-truth files in `supabase/migrations/`, commits, pushes. Claude (chat) applies via Supabase MCP `apply_migration`.** CLI link is still useful for `supabase functions deploy` (Stage 11 onwards).

27. **`t.content_class` is a versioned table — never FK to its `class_code`.** Versioning means class_code is unique only per (`class_code`, `version`) and via partial-unique index `WHERE is_current=true`. PostgreSQL won't accept a partial unique as an FK target. Pattern: drop the FK, keep PK on the lookup column, validate seeds via `DO $$ ... $$` orphan-check block referencing `is_current=true AND is_active=true`. Same pattern applies to any other versioned reference table in the schema.

28. **Pre-flight schema verification catches 4 v4 SQL mismatches in 30 minutes that would have cost hours mid-stage.** Issues found: `f.canonical_vertical_map` didn't exist (added as Stage 1 Migration 008); `vertical_id` is integer not uuid; `canonical_title` not `title` on `f.canonical_content_item`; `ai_job_id` not `id` on `m.ai_job`. The pattern matters for Phase B too — every stage brief should start with pre-flight queries against the live DB before SQL is written.

29. **Vertical-scoped pool design produces dramatic asymmetry across clients.** Post-Stage 4 backfill: NY+CFW shared verticals (NDIS=11, ADP=12) have 279 entries each; PP verticals (Resi=7, Investment=9, Mortgage=10) have 271 each; Invegent globals (AI=15, Social=16, Content=17) have 99 each. Invegent's pool is 3× thinner because Invegent has 2 enabled feed sources vs 14+ for the AU clients. **Operational implication for Phase E:** evergreen seeding must prioritise Invegent's verticals, otherwise Invegent will hit thin-pool conditions far more often than NY/PP and over-rely on the LD3 fallback.

30. **F8 buffer (10-min lookahead in promote_slots_to_pending) interacts with manual function calls during build.** When Stage 5's promote function is called manually before Stage 8's fill function exists, slots correctly transition future → pending_fill but then have no consumer. Solution: roll back to `future` after manual verification (don't leave slots stranded for the days/weeks until Stage 8 ships). When Stage 6 cron starts firing every 5 minutes, the 12 Mon 27 Apr slots re-promoted naturally — and they'll wait there harmlessly until Stage 10 wires the fill cron. **Pattern: state-changing functions should be tested with rollback in mind during incremental builds.**

31. **Two-trigger chain is more debuggable than one trigger doing two jobs.** v4 originally specified one trigger on `f.canonical_vertical_map`. Splitting into Trigger 1 (classifier_output → vertical_map) and Trigger 2 (vertical_map → signal_pool) means each can be tested independently, has its own audit table (`canonical_vertical_map.mapping_source` records `classifier_auto` vs `backfill`), and supports backfill via direct vertical_map INSERT (Stage 4 Phase 1) without needing to touch the classifier path. Pattern for future trigger work: if a trigger does two distinct jobs that could conceivably be invoked separately, split it.

---

## END OF SUNDAY SESSION

Next session priority: Stage 7 (Phase B begins). v4 brief Phase B sections are the spec; this sync_state captures everything Phase A established.

R6 paused, Phase A autonomous, publishing healthy, Anthropic spend zero from build pipeline. Solid handover state.
