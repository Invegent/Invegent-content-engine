# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D100 — See earlier commits

## D101–D125 — See 16 Apr 2026 commits

## D126–D141 — See 17 Apr 2026 commits (pipeline analysis, synthesis decision, demand-aware seeding direction). **D141 sequencing recommendation reversed by D166 — see below.**

## D142–D146 — See 17 Apr 2026 evening commits (demand-aware seeder, classifier, router, benchmark, feed score — all but D142 gated on 60d data). **D144 MVP shadow infrastructure shipped via D167. D145 research portion shipped via D167.**

## D147–D151 — See 18 Apr 2026 afternoon commit (pilot structure, buyer-risk form, advisor layer, session-close SOP, table-purpose rule)

## D152–D155 — See 18 Apr 2026 evening commit (seeder client_id fix, token-health live direction, native LinkedIn flow, ON CONFLICT root-cause fix)

## D156–D162 — See 21 Apr 2026 commits (external reviewer layer shipped + paused, cost guardrails architecture, reviewer implementation details)

## D163–D168 — See 21–23 Apr 2026 commits (DLQ scoping, bundler dedup, bloat cleanup, router sequencing reversal, router MVP shadow infrastructure, ID004 sentinel scope)

## D170–D176 — See 26 Apr 2026 morning commits (slot-driven Phase A: MCP-applied migrations, pre-flight as gate, architectural revision authority, two-trigger chain, thin-pool signal, versioned ref FK pattern, state-change rollback discipline)

---

## D177 — `m.signal_pool.fitness_score_max` Scale Is 0..100, Not 0..1
**Date:** 26 April 2026 afternoon | **Status:** ✅ APPLIED in Stage 7.032 (production, commit `2f447cf`)

### The problem this decides

V3/v4 architectural docs treated fitness as a 0..1 normalised score. Stage 7 brief writing assumed the same. Pre-flight sample query during V4 verification of `m.compute_slot_confidence` returned slot_confidence values exceeding 1.0 (e.g. 9.31), revealing the mismatch.

Production sample distribution:

| Statistic | Value |
|---|---|
| Min fitness_score_max | ~30 |
| Median fitness_score_max | ~80 |
| Max fitness_score_max | ~98 |
| Distribution | bell curve in 50–98 range |

The 0..100 scale is set by the classifier output (R4) and inherited by `m.signal_pool.fitness_score_max` via the Stage 3 trigger chain.

### The decision

**Treat `m.signal_pool.fitness_score_max` as a 0..100 integer-ish numeric. All slot-driven functions that consume it must internally normalise to 0..1 where the LD10 confidence weights expect.**

Concretely:

- `m.compute_slot_confidence(numeric, integer, numeric, integer)` — first argument is fitness on 0..100 scale; function divides by 100 internally before applying the 0.50 LD10 weight.
- `m.check_pool_health(integer)` — fitness gating dropped (vacuous on >=0.65 because 100% of pool meets >=65 fitness on 0..100 scale). High_fitness threshold raised to >=90 informational only.
- `t.format_quality_policy.min_fitness_threshold` — values are 0..100 (e.g. `image_quote=70`, `video_short_avatar=85`).
- `t.reuse_penalty_curve.fitness_multiplier` — multiplicative on the 0..100 scale.

### Why not migrate to 0..1

Three reasons:

1. **Backward compatibility.** R4 classifier writes 0..100 to ~3,000 existing canonicals. Migration would require recomputing all of them.
2. **Sub-percent precision unnecessary.** Pool fitness is a coarse signal; 0..100 with one decimal place is plenty.
3. **Display-friendly.** Operators reading the dashboard see fitness=87 immediately as "high quality" without mental conversion from 0.87.

Normalising at use-site (in confidence computation) keeps storage simple and computation explicit.

### What this requires

Every slot-driven function that combines fitness with other dimensions must:

1. Document the input scale in the function comment
2. Divide by 100 before combining with 0..1-scaled inputs (recency, etc.)
3. Threshold checks against fitness use 0..100 values (>=70, >=85, >=90)

### Related decisions

- **D171** — pre-flight schema verification (D177 caught by sample-data pre-flight)
- **LD10** — confidence weights (0.50 fitness / 0.20 pool log-sat / 0.20 recency / 0.10 diversity log-sat). The 0..1 normalisation happens at the fitness input layer.

---

## D178 — `m.ai_job.slot_id` FK = ON DELETE CASCADE
**Date:** 26 April 2026 evening | **Status:** ✅ APPLIED in Stage 9.039 (production, commit `c4c610a`)

### The problem this decides

Stage 8.036 added FK `fk_ai_job_slot` with `ON DELETE SET NULL`. Caught during Stage 8 cleanup when deleting a synthetic test slot:

```
ERROR: 23514: new row for relation "ai_job" violates check constraint "ai_job_origin_check"
```

FK action `SET NULL` set `slot_id=NULL` on the linked ai_job, leaving all three origin columns (`digest_run_id`, `post_seed_id`, `slot_id`) NULL. This violates `ai_job_origin_check` which requires at least one origin pair populated.

Three options considered:

| Option | Behaviour | Trade-off |
|---|---|---|
| `ON DELETE CASCADE` | Deleting a slot deletes its ai_jobs | Loses historical ai_job state |
| `ON DELETE RESTRICT` | Refuse to delete slots with referenced ai_jobs | Blocks legitimate cleanup |
| Loosen `ai_job_origin_check` | Allow fully-null origin for terminal jobs | Defeats the constraint's purpose |

### The decision

**`ON DELETE CASCADE`.**

### Why CASCADE is the correct semantic

Historical ai_jobs for a deleted slot have no useful state. The slot they referenced is gone — there's no parent context to interpret the job against. Three concrete reasons:

1. **No parent context.** An ai_job exists to do work for a specific slot. Without the slot, the job has no operational meaning. CASCADE makes this explicit.
2. **Cleanup discipline.** Operator-driven slot deletion (e.g. canceling a misconfigured schedule) should leave a clean state, not orphan rows that fail FK checks elsewhere. CASCADE delivers this.
3. **Audit trail preserved elsewhere.** `m.slot_fill_attempt` rows survive slot deletion (no FK cascade there) — the audit of *what fill attempts were made* persists even when the slot itself is purged.

RESTRICT was rejected because it would block legitimate operator actions like cancelling future slots when a schedule rule changes. Loosening the origin check was rejected because the check exists specifically to prevent fully-null ai_jobs, which would break the synthesis pipeline silently.

### What this changes

- `m.ai_job.slot_id` FK behaviour: `ON DELETE SET NULL` → `ON DELETE CASCADE`
- No data migration required; constraint change only
- Verified via V2 test in Stage 9: insert slot + ai_job, delete slot, confirm ai_job auto-removed

### What this does NOT change

- R6-era ai_jobs (digest_run_id + post_seed_id + post_draft_id all populated) are untouched
- `ai_job_origin_check` remains strict; CASCADE prevents the violation rather than relaxing the rule

### Related decisions

- **Stage 8.036** — added the FK with the original (incorrect) ON DELETE behaviour
- **D171** — pre-flight as gate. D178 was caught at apply-time during cleanup, not pre-flight — a class of finding (incompatible constraint actions) that's hard to detect without exercising the delete path

---

## D179 — Stage 10/11 Ordering: Stage 10 Includes Minimal ai-worker Patch (Option B)
**Date:** 26 April 2026 evening | **Status:** ✅ LOCKED for Stage 10 brief

### The problem this decides

Stage 10 wires four Phase B crons including the fill cron (`m.fill_pending_slots`). The fill function produces shadow ai_jobs with `is_shadow=true`. The existing R6 ai-worker (cron jobid 5 `ai-worker-every-5m`) actively polls `m.ai_job` regardless of `is_shadow` flag — it picks up shadow jobs and tries to process them via R6 logic. Caught during Stage 8 V2 testing: a shadow ai_job was picked up within ~70 seconds and marked `status=failed` with `error='openai_missing_title_or_body'` (because slot-driven jobs have no R6 origin columns).

Without addressing this before the fill cron fires:
- Shadow drafts created by the fill function would be marked failed by the R6 ai-worker
- The 5–7 day Gate B observation period would be polluted by ai-worker errors
- `m.ai_job` would fill with thousands of `failed` rows obscuring real signal

Two paths considered:

**Option A:** Land Stage 11 (full ai-worker refactor with LD18 idempotency + LD7 prompt caching + slot-driven shape) BEFORE Stage 10 (fill cron). Properly sequenced but inverts v4's order. Stage 11 is a substantial Edge Function deploy; one-shot bigger change.

**Option B:** Stage 10 includes a minimal ai-worker patch (skip `is_shadow=true` rows OR `job_type='slot_fill_synthesis_v1'`). Stage 11 then does full refactor (idempotency + caching + slot-driven processing) as a separate, focused stage.

### The decision

**Option B.**

### Why Option B over Option A

Three reasons:

1. **Smaller per-stage blast radius.** Stage 10's minimal patch is a one-line filter on the ai-worker's SELECT. Risk is confined to that filter. Stage 11's full refactor involves prompt caching changes, idempotency redesign, slot-driven payload shape — each higher-risk than the filter alone. Sequencing them as separate stages matches Phase A's pattern of small, verifiable increments.

2. **Preserves observation signal.** With Option B in place during Gate B, shadow ai_jobs accumulate as `status=queued` (untouched by ai-worker filter). Operators can directly observe the *fill function's decision quality* without conflating it with ai-worker behaviour. With Option A, the full ai-worker refactor would change two variables at once.

3. **Defers EF deploy complexity.** Option B keeps Stage 10 as a SQL-only stage (registering crons + minimal SQL change to ai-worker — actually the patch is in the EF code, but the change is small enough to deploy on a focused day). Stage 11 becomes the first dedicated EF refactor of Phase B with its own pre-flight, deploy verification, and rollback plan.

### What Option B requires

Stage 10 brief includes:
- Cron registrations for fill, recovery, breaking, critical-scan (4 new crons)
- Minimal ai-worker code patch: `WHERE NOT (is_shadow = true)` added to the queued-job SELECT
- Verification that R6 ai-worker still processes R6 jobs correctly (regression check)
- Verification that shadow ai_jobs accumulate with `status=queued` and are NOT touched

Stage 11 brief (separate, later) includes:
- LD18 DB-enforced idempotency (UPSERT pattern on ai_job processing)
- LD7 prompt caching adoption (60–80% cost savings on repeat synthesis patterns)
- Slot-driven payload handling (read from `input_payload->'canonical_ids'`, etc.)
- UPDATE auto-created post_visual_spec rather than INSERT (the trigger on m.post_draft INSERT handles this)
- Removal of the temporary `is_shadow` filter (now handled correctly by full processor)

### What this does NOT decide

- Doesn't dictate Stage 11's exact deploy mechanism (Windows MCP times out on `supabase functions deploy`; Stage 11 likely runs from PowerShell per the standing pattern)
- Doesn't pre-commit to any specific Gate B observation duration; 5–7 days is the planning window but actual go/no-go depends on what Gate B reveals

### Related decisions

- **D170** — MCP-applied migrations (Stage 10 SQL portion follows this; Stage 11 EF deploy is the first PowerShell-via-CLI deploy of Phase B)
- **Stage 8 V2 test finding** — the empirical surface that triggered this decision

---

## Decisions Pending

| Decision | Status | Gate |
|---|---|---|
| D143 — Signal content type classifier | 🔲 Gated | D142 stable + 60 days data |
| D144 — Signal router (platform × format) | 🟡 Superseded by slot-driven build (D170+); shadow infrastructure shipped via D167 retained as historical context | Slot-driven Phase D Stage 19 decommissions D144 router |
| D145 — Benchmark table | 🟡 Mix defaults shipped via D167 22 Apr; content_type × format benchmark still gated | D143 |
| D146 — Feed pipeline score + retirement | 🔲 Gated | Phase 2.1 + 60 days data |
| D140 — Digest item scoring | 🔲 Phase 3 | After CFW stable + auto-approver healthy |
| D149 — Advisor Layer MVP (Sales Advisor Project) | 🔲 Deferred post-sprint | Same rationale as D162 |
| D151 — Table purpose backlog sweep (22 rows) | 🔲 Post-pre-sales | Batch job later |
| D153 — Token-health live /debug_token cron | 🔲 Spec this week, build after | None — high priority |
| D156 Stage 2 — Meta reconciliation | 🔲 Post-sprint | Stage 1 verified earning its keep after reactivation |
| D157 — Cost guardrails Stop 2 infrastructure | 🔲 Post-sprint | ai-worker fix verified ✅ + sprint complete |
| D157 — Raise Anthropic cap to calibrated Stop 1 | 🔲 Week of 5 May | 7 days post-fix clean data + weekly calibration |
| D164 — Per-client canonical dedup window column | 🔲 When trigger fires | Vertical/cadence mismatch OR client request OR operator-suppression complaint |
| **D165 — M12 IG publisher platform-filter** | 🟡 Superseded by slot-driven Phase B (Stage 11 ai-worker refactor handles platform discipline at synthesis layer) | Slot-driven Phase C cutover phases out the legacy IG publisher path |
| **D165 — Cron failure-rate monitoring** | 🔲 Sprint item TBD | 2,258 silent failures over 8 days must not recur |
| **D166 — Router sequencing reversal** | ✅ APPLIED 22 Apr evening — superseded by slot-driven build (D170+) | — |
| **D167 — Router MVP shadow infrastructure** | ✅ APPLIED 22 Apr evening — preserved as shadow infrastructure; slot-driven Phase D decommissions | Phase D Stage 19 |
| **D168 — ID004 sentinel** | 🔲 Backlog A-item | Spec defined; implementation deferred |
| **D170 — MCP-applied migrations pattern** | ✅ LOCKED through Phase A+B7-9; applies for all 19 stages | — |
| **D171 — Pre-flight schema verification per stage** | ✅ LOCKED; sharpened by Lesson #32 (query every directly-touched table) | — |
| **D172 — Architectural revision authority** | ✅ LOCKED; R-A through R-E applied in Phase A | — |
| **D173 — Two-trigger chain pattern** | ✅ APPLIED Stage 3 | — |
| **D174 — Invegent thin-pool operational signal** | ✅ Observed; informs Phase E priority | Phase E content work |
| **D175 — Versioned reference table pattern** | ✅ APPLIED Stage 2.009 | Apply to future lookup tables referencing versioned sources |
| **D176 — State-change rollback discipline** | ✅ APPLIED Stage 5 | Build-stage pattern |
| **D177 — fitness_score_max scale 0..100** | ✅ APPLIED Stage 7.032 | Apply at every fitness consumer |
| **D178 — ai_job.slot_id FK = ON DELETE CASCADE** | ✅ APPLIED Stage 9.039 | — |
| **D179 — Stage 10/11 ordering: Option B** | ✅ LOCKED for Stage 10 brief | Stage 10 next session |
| **Slot-driven Phase A** | ✅ COMPLETE 26 Apr morning | — |
| **Slot-driven Phase B Stages 7-9** | ✅ COMPLETE 26 Apr afternoon–evening | — |
| **Slot-driven Phase B Stages 10-11 + Gate B** | 🔲 NEXT | Stage 10 brief next session (D179 Option B) |
| **Slot-driven Phase C — Cutover (Stages 12-18)** | 🔲 After Gate B | 5-7 days shadow observation post-Phase B |
| **Slot-driven Phase D Stage 19 decommission R6** | 🔲 After Phase C | All client-platforms cut over |
| **Slot-driven Phase E — Evergreen seeding** | 🔲 Parallel | Prioritise Invegent verticals per D174 |
| Inbox anomaly monitor | 🔲 Post-sprint | Separate brief TBW |
| Phase 2.1 — Insights-worker | 🔲 Next major build | Meta Standard Access |
| Phase 2.6 — Proof dashboard | 🔲 After Phase 2.1 | Engagement data |
| Solicitor engagement | 🔲 Parked per D147 + D156 refinement | First pilot revenue OR second pilot signed |
| Meta App Review | ⏳ In Review | Contact dev support if stuck after 27 Apr |
| CFW + Invegent content prompts | 🔲 A11b pre-sales | PK prompt-writing session Fri 24 Apr |
| TBC subscription costs | 🔲 A6 pre-sales | Invoice check |
| CFW profession fix | 🔲 Immediate | Change in Profile |
| Auto-approver target pass rate | 🔲 C1 | Single PK decision |
| Monitoring items A20–A22 (D155 follow-on) | 🔲 Sprint items | Sprint priority per D162 |
| Professional indemnity insurance | 🔲 Pre-pilot | Underwriting forces clarification |
| A27 — LLM-caller Edge Function audit (ID003 follow-on) | 🔲 After ai-worker fix establishes pattern | Pattern proven |
| **Reviewer role-library rebuild (post-D160)** | 🔲 Captured as brief with consumption-model addendum; execute when evidence justifies | 2+ weekly digests post-sprint + concrete use case for a role not in current library |
| **External reviewer resume** | 🔲 Paused per D162 | ~18-19 of 28 Section A items closed |
| **Per-commit reviewer iteration bug** | 🔲 Before reviewer resume | Add filter for per_commit_enabled or explicit reviewer_key IN list |
| **Phase 1.7 DLQ continuation — `m.post_publish_queue` CHECK** | 🔲 Backlog per D163 | Dedicated Phase 1.7 full-sprint session |
| **TPM saturation on concurrent rewrites** | 🔲 Brief parked per D163 | Pipeline resumes from drain + fresh digest fires through rewrite |
| **M8 Gate 4 — 24h regression check** | 🔲 23 Apr | Re-run regression query against runs > M8 merge timestamp |
| **Bundler dedup weekly regression check** | 🔲 Ongoing | Weekly Mon — query in D164 |
| **`instagram-publisher` exec_sql + raw interpolation** | 🔲 Folds into slot-driven Phase B Stage 11 ai-worker refactor | Stage 11 |
| **PP Schedule Facebook 6/5 over-tier-limit** | 🔲 Sprint item TBD | Surfaced in M5 verification — investigate save-side validation |
| **Stage 12+ refinement: try_urgent_breaking_fills per-platform variance** | 🔲 After Gate B | Currently picks same top breaking item across all platforms for a client; fill function's LD15 dedup masks it. Refine to pick different item per platform within client. |
