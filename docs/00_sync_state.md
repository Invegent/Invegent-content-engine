# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-26 Sunday 08:35 AEST — **End-of-Saturday reconciliation: R6 paused for cost; Slot-Driven Architecture v4 build plan ready; Stage 1 begins next session**
> Written by: PK + Claude session sync

---

## ⏸ 26 APR SUNDAY 08:35 AEST — RECONCILIATION POINT

### In one paragraph

This is the reconciled handover after a 12-hour Saturday session. R6 ran live for ~13h and produced ~477 drafts/day against publish capacity of 32/day — Anthropic spend hit a $190/month run rate against the $18/month target (10× over). PK paused all 3 R6 seed crons (jobid 11, 64, 65) Saturday evening. Diagnostic surfaced a separate critical bug: 8 of 14 active publish profiles had `destination_id IS NULL`, which silently bypassed the publisher lock RPC's per-day throttle (NULL=anything is always NULL → throttle CTE returned 0 rows). Backfilled all profiles via `backfill_publish_profile_destination_id_throttle_fix_20260425`. Through the late evening + early Sunday, PK and Claude designed and pressure-tested a slot-driven architectural inversion across 4 brief versions, 7 external LLM reviews (4 first round + 3 second round on v3), with 17 locked architectural decisions emerging. **V4 build plan committed at `26d88b8`** — 19 stages, 3 verification gates, 28 Phase A migrations, 15-24h engineering + 3-4h content. Stage 1 begins next session.

### Critical state right now

1. **R6 seed crons all paused** (jobid 11, 64, 65 active=false). Anthropic spend essentially zero from this point.
2. **154 queued drafts** in `m.post_publish_queue` cover ~5 days of publishing buffer (32/day max × 5 days ≈ 160).
3. **656 drafts in `needs_review`** — the email storm backlog from R6 over-production. Auto-approver handling these passively; no urgency to clear.
4. **146 drafts approved + waiting** for publish queue.
5. **All 14 active+enabled publish profiles have destination_id** populated. Throttle bypass class CLOSED.
6. **IG cron jobid 53 still paused** — waiting on Meta API restriction (error subcode 2207051) to clear. v2.0.0 platform discipline already verified.
7. **FB and LI publishers active and healthy** (jobid 7, 54).
8. **All 4 external reviewers paused** per D162. One-shot risk reviewer activation Saturday evening was reverted post-review.

### Yesterday's deltas (24-25 Apr → 26 Apr morning)

| Item | Status |
|---|---|
| R6 LIVE cutover (Saturday morning, 75 min) | ✅ Completed; ran 13h before pause |
| M12 IG publisher v2.0.0 refactor | ✅ Deployed; platform discipline verified in production |
| 18 NY IG cross-posts cleanup | ⚠ Meta Graph API doesn't support DELETE on published IG media — manual via IG app or wait 24-48h auto-clear |
| PP LinkedIn 14 publishes vs cap=2 (throttle bypass) | ✅ Root cause: NULL destination_id; backfill fix applied |
| R6 cost discovery ($190/month run rate) | ✅ Crons paused; cost stopped |
| Slot-driven architecture v1-v4 | ✅ V4 build plan ready at commit `26d88b8` |
| Anthropic risk reviewer one-shot review | ✅ Cost $0.12, returned info severity (commit-shaped not design-shaped) |

---

## 🟢 SLOT-DRIVEN ARCHITECTURE v4 — READY TO BUILD

### What v4 is

V4 is the BUILD PLAN for the slot-driven inversion. The architecture (v3, commit `6319b17`) is locked. V4 takes that architecture plus 3 final critical fixes from round-3 reviewers (LD18-20) and lays out a stage-gated build sequence:
- **Phase A (Stages 1-6):** Foundation — 28 migrations, 5-7 hours
- **Phase B (Stages 7-11):** Fill function in shadow — 5-7 hours + 5-7 days observation
- **Phase C (Stages 12-18):** Per-client-platform cutover — 3-4 hours hands-on, ~6 weeks calendar
- **Phase D (Stage 19):** Decommission old R6 — 1-2 hours
- **Phase E:** Evergreen seeding (parallel content work) — 3-4 hours

### Locked architectural decisions (LD1-LD20)

| # | Decision | Source |
|---|---|---|
| LD1 | Vertical-scoped pool with client filter at fill time | All reviewers + PK |
| LD2 | Materialised pool (`m.signal_pool` table) | All + PK |
| LD3 | Evergreen library as fallback (never skip default) | All + PK |
| LD4 | 24-hour lead time | PK direct (production-time aware: images/carousels/kinetic shorts need lead time) |
| LD5 | Format-aware synthesis: single-item for image_quote/video/timely; bundle 2 for text; bundle 3 for carousel | Reviewer 4 + PK |
| LD6 | AEST-day throttle migration | All + PK |
| LD7 | Prompt caching from day 1 (60-80% savings) | All |
| LD8 | Lightweight title-similarity dedup in v1 (pg_trgm + keyword overlap) | Reviewer 4 + PK |
| LD9 | Reuse penalty curve (table-driven, soft) — not binary dedup | Reviewer 4 |
| LD10 | Slot confidence score (composite metric) | Reviewer 4 |
| LD11 | Phased rollout with verification gates | All |
| LD12 | Evergreen ratio guardrail (7-day rolling) | v3 reviewers |
| LD13 | Slot state machine: future → pending_fill → fill_in_progress → filled → approved → published | v3 reviewers |
| LD14 | Pool completeness backfill cron required | v3 reviewers |
| LD15 | Same-canonical platform-day hard block | v3 reviewers |
| LD16 | Dedup thresholds in `t.dedup_policy` config table (no magic numbers) | v3 reviewers |
| LD17 | Breaking news auto-insert (architectural, not manual-only) | v3 reviewers |
| **LD18** | **AI worker idempotency MUST be DB-enforced via atomic UPDATE WHERE status='fill_in_progress'** | **v4 round 3** |
| **LD19** | **Pool backfill function MUST be batch-bounded (LIMIT 100 + 60s timeout)** | **v4 round 3** |
| **LD20** | **Breaking news collision check uses "replaceable slot" logic, not "absent slot"** | **v4 round 3** |

### Brief commit history

| Version | Commit | Purpose |
|---|---|---|
| v1 | `74a985d` | Initial proposal — problem framing + Q1-Q6 |
| v1 detailed | `1c433083` | Architectural design with options |
| v2 | `a49f0b6` | Detailed flow IN/OUT, full DDL, scenarios, objectivity |
| v3 | `6319b17` | Build-ready: 16 fixes, full DDL, migration sequence §K |
| **v4** | **`26d88b8`** | **BUILD PLAN: stage-gated CC handoffs, LD18-20 folded in** |

### Stage 1 — what happens at the start of the next session

1. Claude reads `docs/00_sync_state.md` (this file) and v4 commit `26d88b8`
2. Claude runs Supabase MCP pre-flight schema queries (verify column names match v4 SQL)
3. PK answers 3 critical questions (branch strategy, first cutover target, CC execution mechanism)
4. Claude writes Stage 1 brief for Claude Code (CC) — extension + 6 tables, no behaviour change
5. PK runs CC with Stage 1 brief
6. CC reports back; Claude verifies via Supabase MCP
7. PK approves → Stage 2

**Stage 1 estimated duration:** 30-45 minutes including all roles.

### v4 build plan critical questions for PK (deferred from last session)

1. **Branch strategy** — feature branch for Phase A's 28 migrations, or direct to main? Default: feature branch.
2. **First cutover target** — NY Facebook (Stage 13, expected default) or different?
3. **CC execution mechanism** — how PK runs Claude Code? CLI + paste, RC, etc.

Defaults will be assumed if not answered when build starts.

---

## 🟢 25 APR SATURDAY EVENING — R6 PAUSED + THROTTLE FIX

### What happened

PK noticed three signals upon return from break: (1) Anthropic invoice in inbox (4 receipts ~$11 each over 7 days = ~$190/mo run rate), (2) FB/IG/LI publishing more posts than schedule allowed, (3) 15 review-notification emails in 7 hours. Diagnosis surfaced two distinct issues:

**Issue 1: Volume scaling architecture mismatch (cost driver, NOT a loop).**

- 24h: 479 ai_jobs, 0 retries, 0 failures
- R6 produced 477 drafts today across NY (277) + PP (200), spread FB 21 / IG 228 / LI 228
- Publish capacity = 4 clients × 4 platforms × cap 2/day = 32/day max
- 15× overproduction structurally baked in; reuse penalty insufficient at fill-out scale

**Resolution:** All 3 R6 seed crons paused via `pause_r6_seed_crons_cost_control_20260425_evening`. Cost stopped immediately. Architectural redesign captured in v1-v4 briefs (final v4 at `26d88b8`).

**Issue 2: Throttle silent bypass (separate critical bug).**

- PP LinkedIn published 14 times vs cap=2 throughout the day, one every ~20 min matching cron schedule
- Root cause: `cpp.destination_id IS NULL` on every LinkedIn profile (4), every YouTube profile (2), CFW+Invegent FB profiles (2) — total 8 of 14 active+enabled
- Lock RPC throttle CTE filters `WHERE p.destination_id = cpp.destination_id`. NULL = anything is always NULL → count returns 0 → max_per_day silently bypassed
- NY+PP FB had destination_id populated so throttle worked correctly there
- IG was fine post-v2.0.0 deploy

**Resolution:** 
1. `pause_linkedin_cron_throttle_bypass_20260425_evening` — paused jobid 54 immediately to stop bleeding
2. `backfill_publish_profile_destination_id_throttle_fix_20260425` — `UPDATE c.client_publish_profile SET destination_id = page_id WHERE destination_id IS NULL AND page_id IS NOT NULL AND status='active'`
3. Verified all 14 active+enabled profiles now have destination_id matching page_id
4. Lock RPC dry-run for LinkedIn returned 0 rows (PP at 14/cap-2, NY at 2/cap-2 — throttle correctly blocking)
5. `unpause_linkedin_cron_post_throttle_fix_20260425` — re-enabled jobid 54
6. **Bleeding stopped.**

### Email storm context

- 15 emails to PK in 7 hours, each listing 10-26 NDIS-Yarns drafts in `needs_review`
- **NOT auto-approval failure** — PK's initial hypothesis disproven
- Drafts piling up faster than auto-approver could process due to R6 over-production volume
- With R6 paused, the storm is over (no new drafts being created)

### Architectural diagnosis (recorded for future reference)

The cost was the symptom. The disease was that R6 treats signal cardinality (~50 canonicals/day) as work cardinality. With fan-out across (clients × platforms × formats) the work cardinality multiplied 10× beyond what publishing could consume. The slot-driven inversion in v3/v4 makes demand the unit of work — supply enters a pool, fills only fire when slots are due. Cost scales with slots, not signals.

---

## 🟢 25 APR SATURDAY AFTERNOON — M12 CLOSURE: IG PUBLISHER v2.0.0 SHIPPED

### What's shipped

| Artefact | Location | Status |
|---|---|---|
| **instagram-publisher v2.0.0** | `supabase/functions/instagram-publisher/index.ts` (commit `562ab3e`) | ✅ Deployed with `--no-verify-jwt`. Platform discipline VERIFIED 25 Apr 08:15 UTC live tick: failed-publish row `m.post_publish.platforms_match = TRUE` proves platform discipline working. Cron 53 still `active=false` while Meta-side restriction clears. |
| **D169 decision** | `docs/decisions/D169_instagram_publisher_v2_queue_refactor.md` (commit `7d8c8b5`) | ✅ |
| **Cleanup script for 18 cross-posts** | `scripts/delete_ny_ig_crosspost_cleanup_20260419.sh` (commit `f0c34f3`) | ⚠ DOES NOT WORK — Meta Graph API doesn't support DELETE on published IG media. Manual deletion via IG app required, OR wait 24-48h auto-clear. Script docstring needs updating. |

### v2.0.0 architecture — three-layer platform discipline

```
Cron tick → instagram-publisher (HTTP POST)
         ↓
[Layer 1] m.publisher_lock_queue_v1(p_platform='instagram')
   ↓ filters WHERE q.platform = 'instagram' at SQL level
   ↓ enforces max_per_day + min_gap_minutes via lock RPC
   ↓ FOR UPDATE SKIP LOCKED — concurrent ticks can't double-process
   ↓
[Layer 2] EF defensive check: q.platform === 'instagram'
   ↓
[Layer 3] EF defensive check: draft.platform === 'instagram'
   ↓ writes m.post_publish status='failed' for audit if fails
   ↓
[Publish] IG Graph API call (single, reel, or carousel)
```

### A10b status

- A10b (first IG post publishes) gates on: clean v2.0.0 publish to NY or PP IG
- Currently blocked by Meta API restriction (error 2207051) on NY IG account, likely caused by 18 cross-posts on 19 April + 4 rapid Invegent publishes 25 April morning under v1.0.0
- v2.0.0 platform discipline already verified independently
- **A10b closes when next clean v2.0.0 publish lands** post-restriction-clear (24-48h after cross-post cleanup or natural Meta auto-recovery)

---

## 🟢 25 APR SATURDAY MORNING — R6 LIVE (75 MIN CUTOVER)

### What's shipped (earlier today)

R6 LIVE: NY+PP `r6_enabled=TRUE`, R5-driven seeding, multi-platform cross-canonical spread real for first time. Eight migrations applied. Smoke tests across 3 platforms produced 33 fresh seeds, 0 duplicates, 8 cross-platform canonicals. Ran for ~13 hours before pause.

### Function versions

- `m.seed_and_enqueue_ai_jobs_v1(text, int)` v1.0.1 (R5-driven, grade-gated, **PAUSED**)
- `m.enqueue_publish_from_ai_job_v1()` R6 rewrite (column reads, Finding 1 closed)
- `m.match_demand_to_canonicals(uuid, date, numeric, int)` v1.4 (active-seed canonical dedup)
- `m.publisher_lock_queue_v1` / `_v2` — platform-aware atomic locking with throttle (now armed for all 14 profiles via destination_id backfill)
- `instagram-publisher` v2.0.0 (deployed `--no-verify-jwt`; M12 verified)

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else.**

### Priority 1 — Slot-driven architecture build (Stage 1)

1. Read v4 brief: `docs/briefs/2026-04-25-slot-driven-architecture-build-plan-v4.md` (commit `26d88b8`)
2. Run pre-flight schema verification queries (5 queries listed in v4 §4)
3. Get PK answers to 3 critical questions (branch, first cutover, CC mechanism)
4. Write Stage 1 brief for CC: extension + 6 tables (DDL only, no behaviour change)
5. Hand to PK; PK runs CC; CC reports; Claude verifies; PK approves → Stage 2

### Priority 2 — PP LinkedIn cap breach root cause (resolved)

✅ Already resolved Saturday evening via destination_id backfill. **Verification next session:** confirm no LinkedIn over-publish in last 24h.

### Priority 3 — A10b (waiting on external)

⏸ Meta restriction clearance. No active work. Re-test Monday 27 Apr if no auto-recovery by then.

### Critical state awareness

1. **R6 paused, cost stopped.** 154-draft buffer covers ~5 days publishing.
2. **All 14 publish profiles have destination_id.** Throttle armed.
3. **All reviewers paused** per D162.
4. **656 drafts in needs_review** — backlog from R6 over-production. Not urgent.
5. **IG cron paused** awaiting Meta restriction clear.
6. CFW + Invegent r6_enabled=FALSE (irrelevant while crons paused).
7. **v4 build plan ready** at commit `26d88b8`.

---

## SESSION STARTUP PROTOCOL

1. Read this file in full
2. Read v4 brief (`docs/briefs/2026-04-25-slot-driven-architecture-build-plan-v4.md`, commit `26d88b8`)
3. Orphan branch sweep — all 3 repos
4. Check `c.external_reviewer` — confirm all paused
5. Check R6 seed crons — confirm jobid 11, 64, 65 active=false
6. Check IG cron jobid 53 — confirm active=false (Meta restriction)
7. Check FB+LI publisher crons — confirm active=true (jobid 7, 54)
8. Run v4 §4 pre-flight schema queries
9. Get PK answers to v4 critical questions
10. Begin Stage 1

---

## DEV WORKFLOW RULE (D165)

**Default: direct-push to main.** Deviate only for multi-repo coordinated risk or PK-flagged risk.

**v4 Phase A may use feature branch** for the 28 coordinated migrations — PK to confirm.

**EF deploys remain manual via PowerShell** (Windows MCP times out on `supabase functions deploy`).

---

## EXTERNAL REVIEWER LAYER

All four reviewers paused per D162. Saturday evening one-shot activation of risk reviewer for slot-driven proposal review reverted post-review (cost $0.12, returned info severity — reviewer infrastructure is commit-shaped not design-shaped, lesson learned).

---

## CURRENT PHASE

**Phase 1 — COMPLETE.** **Phase 3 — Expand + Personal Brand** active.

**Sub-phase 3.x — Slot-Driven Architecture build** (NEW) — v4 ready, Stage 1 begins next session.

Pre-sales gate: 12 of 28 Section A items closed. A10b waiting on Meta restriction clear.

---

## ALL CLIENTS — STATE

| Client | client_id | FB | IG | LI | YT | Adequacy | r6_enabled | Notes |
|---|---|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ | ⏸ Meta restr | ✅ | 🔲 | **A** | ✅ all (R6 paused) | 18 cross-posts to delete via IG app or auto-clear |
| Property Pulse | 4036a6b5 | ✅ | ⏸ Meta restr | ✅ | 🔲 | **A** | ✅ all (R6 paused) | LI throttle now armed |
| Care For Welfare | 3eca32aa | ✅ | ⏸ Meta restr | ✅ | 🔲 | **B** | ❌ all | Awaiting feed activation |
| Invegent | 93494a09 | — | ⏸ Meta restr | ✅ | ✅ | **D** | ❌ all | 4 IG publishes Sat morning on v1.0.0 (clean — Invegent has no FB drafts to confuse) |

---

## SPRINT MODE — THE BOARD

### Slot-Driven Architecture track (NEW — primary track)

| # | Item | Status |
|---|---|---|
| Architecture v1-v4 | 7 LLM reviews across 3 rounds | ✅ COMPLETE |
| v4 build plan | commit `26d88b8` | ✅ READY |
| Stage 1 (extensions + 6 tables) | Phase A | 🔲 NEXT SESSION |
| Stages 2-6 | Phase A foundation | 🔲 |
| Gate A | Phase A verification | 🔲 |
| Stages 7-11 | Phase B fill function + shadow | 🔲 |
| Gate B | Phase B observation 5-7 days | 🔲 |
| Stages 12-18 | Phase C cutover per-client-platform | 🔲 |
| Stage 19 | Phase D decommission old R6 | 🔲 |
| Phase E | Evergreen seeding | 🔲 (parallel) |

### Router track (legacy — superseded by slot-driven)

| # | Item | Status |
|---|---|---|
| R1-R5 | shadow infrastructure + classifier + matching | ✅ LIVE |
| R6 seed_and_enqueue | v1.0.1 | ⏸ PAUSED (cost) — to be DECOMMISSIONED in slot-driven Phase D |
| M12 IG publisher refactor | v2.0.0 | ✅ DEPLOYED |
| R7 ai-worker platform-awareness | — | 🔲 OBSOLETE in slot-driven (ai-worker gets refactored anyway in Stage 11) |
| R8 cron changes | — | 🔲 OBSOLETE in slot-driven (replaced by new cron set) |

### HIGH priority items remaining

| # | Item | Status |
|---|---|---|
| **Slot-driven Stage 1** | Begin v4 build | NEXT SESSION |
| Manual deletion of 18 NY IG cross-posts | OR wait 24-48h Meta auto-clear | PK action when convenient |
| **CC-TASK-02 fix** | Feed-intelligence upsert | Dormant — orthogonal to slot-driven build |

### Not HIGH but actionable

- LI publisher audit (was deferred Saturday afternoon — root cause of cap breach now known via destination_id fix; still worth confirming no other M12-class bugs)
- m.post_publish_queue.status CHECK with 'dead' (D163 backlog)
- Carousel verification (v2.0.0 untested in production for carousel format)
- Meta App Review escalation (Mon 27 Apr trigger)

---

## WATCH LIST

### Due next session

- v4 Stage 1 begin
- Verify destination_id backfill held (no LI over-publish in last 24h)
- Check IG Meta restriction status
- Check email storm subsided (no new R6 generation since pause)

### Due week of 26 Apr - 2 May

- **Mon 27 Apr** — Meta App Review escalation trigger
- **Sun 26 Apr - Wed 29 Apr** — v4 Phase A (Stages 1-6) target window
- **Thu 30 Apr - Wed 6 May** — v4 Phase B shadow phase observation
- **Sat 2 May** — original reviewer calibration cycle trigger (defer)

### Backlog (open)

**Top of list — slot-driven architecture build:**
- Stage 1: Extension + 6 tables (DDL only)
- Stages 2-6: Phase A foundation
- Gate A verification
- Stages 7-11: Phase B fill function + shadow
- Gate B observation
- Stages 12-18: Cutover per-client-platform
- Stage 19: Decommission
- Phase E: Evergreen seeding (~50 items hand-curated)

**Carried forward (orthogonal to slot-driven):**
- Manual IG cross-post deletion or wait for auto-clear
- m.post_publish_queue.status CHECK with 'dead'
- LI publisher audit (low priority — root cause now known)
- Carousel verification (deferred until IG cron resumes)
- CC-TASK-02 HIGH (PK to choose Option A vs B)
- Cron health v3.1 schedule-string parsing
- D168 Layer 2 implementation
- Avatar configuration for Invegent (HeyGen)
- Invegent FB + IG activation (v0.2 positioning required)
- TPM saturation, docs/archive 5th file, reviewer pollution
- PP Schedule FB 6/5 violation, exec_sql sweep
- facebook-publisher EF audit, Shrishti 2FA

**Existing HIGH:** CC-TASK-02 HIGH fix (orthogonal)

---

## TODAY'S COMMITS (25 APR — FINAL FOR SESSION)

**Invegent-content-engine (main) — Saturday session totals:**

Saturday morning + afternoon (R6 + M12) — 27 commits.

Saturday evening + night (R6 pause + slot-driven design):
- `74a985d` — docs(briefs): slot-driven architecture proposal v1
- `1c433083` — docs(briefs): slot-driven architecture detailed design v1
- `a49f0b6` — docs(briefs): slot-driven architecture detailed design v2
- `6319b17` — docs(briefs): slot-driven architecture detailed design v3 (build-ready)
- `26d88b8` — docs(briefs): slot-driven architecture build plan v4
- **THIS COMMIT** — docs(sync_state): end-of-Saturday reconciliation

**Migrations (DB-only, Saturday evening):**
- `pause_linkedin_cron_throttle_bypass_20260425_evening`
- `backfill_publish_profile_destination_id_throttle_fix_20260425`
- `unpause_linkedin_cron_post_throttle_fix_20260425`
- `pause_r6_seed_crons_cost_control_20260425_evening`
- `activate_risk_reviewer_for_slot_architecture_review_20260425`
- `deactivate_risk_reviewer_post_brief_review_20260425`

---

## CLOSING NOTE FOR NEXT SESSION

Saturday 25 Apr was the highest-output session day on record across two distinct work streams:

**Stream 1: R6 + M12 (morning + afternoon)**
- R6 cutover landed in 75 min (morning)
- M12 IG publisher v2.0.0 refactor + cleanup script + 3 commits + 3 migrations (afternoon)
- Two material shifts: R6 LIVE, M12 closed

**Stream 2: Cost crisis + architectural redesign (evening)**
- R6 ran 13h, produced 477 drafts/day, hit $190/month run rate vs $18 target
- Throttle bypass discovered (8 NULL destination_id profiles) and fixed
- R6 paused for cost control
- Slot-driven architecture designed across 4 brief versions
- 7 external LLM reviews (Gemini, ChatGPT, Grok, Perplexity × 3 rounds varying participation)
- 20 locked architectural decisions
- v4 build plan committed and ready

**Pipeline state at close:**
- R4 + R5 + R6 (paused) all live but R6 will be decommissioned in slot-driven Phase D
- All publishers healthy (FB, LI active; IG paused on Meta restriction)
- 154 queued drafts (~5 days buffer)
- 656 drafts in needs_review (R6 backlog, will drain over time as auto-approver works)
- Anthropic spend: ~$11/day to ~$0/day post-R6-pause

**Realistic next working windows:**
- 26 Apr Sunday morning: Stage 1 of slot-driven build
- 26-29 Apr: Phase A foundation (Stages 1-6)
- 30 Apr - 6 May: Phase B shadow observation
- 7 May onwards: Cutover phase (1 client-platform per week)

**Lessons captured 24-25 Apr (23 total, 3 new from Saturday evening):**

1-22. (See prior commits.)

23. **Volume scaling architecture errors hide as cost.** Current R6 generates at signal scale, consumes at slot scale. The cost is the symptom; the structural error is mismatched cardinality. Inversion to slot-driven is correct, but introduces brittle precision that the volume safety net previously masked. Mitigation in v4: defensive crons (backfill, recovery, urgent breaking, critical window, pool health, heartbeat) make the precision observable and recoverable rather than just brittle.

24. **NULL-equality semantics in throttle filters silently bypasses limits.** `WHERE p.destination_id = cpp.destination_id` with NULL on either side returns NULL (not TRUE, not FALSE), which the COUNT discards. Always use `IS NOT DISTINCT FROM` for nullable equality OR backfill NULLs before relying on equality. The bug had been live since destination_id was added to the schema; NY+PP FB worked only because their rows happened to have destination_id populated.

25. **External reviewer infrastructure shape doesn't always match the question.** Risk reviewer is built for post-commit code review (find production failure modes in what just shipped). It correctly assessed the slot-driven proposal as a docs-only commit with no production impact (info severity). That's not the reviewer being wrong — that's the question being miscategorised. Pre-implementation design review needs different framing: either Path C manual external + paste (what we did for design rounds 1-3), or a custom reviewer with a different system prompt. Lesson: $0.12 cheap; learn before scaling.
