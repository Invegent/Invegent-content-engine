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

---

## D170 — Slot-Driven Architecture v4 Build Plan: Stage-Gated Migrations Applied via Supabase MCP, Not CLI
**Date:** 26 April 2026 morning | **Status:** ✅ APPLIED through Phase A (Stages 1–6 deployed; pattern locked for Phase B)

### The problem this decides

V4 build plan (commit `26d88b8`) committed Saturday evening defaulted to `supabase db push` for migration application. The first attempt at Stage 1 surfaced two CLI-shaped blockers:

1. CLI not linked to project — fixed by `supabase link`.
2. After link, `supabase db push` failed at history reconciliation pre-check: ~280 remote migrations in `supabase_migrations.schema_migrations` don't exist as files in `supabase/migrations/` locally. CLI refused to push until reconciled.

The ~280 migrations are the standing pattern of this repo: changes applied via Supabase SQL editor, MCP `apply_migration`, or direct SQL since project inception. Reconciling means either `migration repair --status reverted <280 IDs>` (papers over the gap, recurring problem on every future stage as new MCP migrations land) or `supabase db pull` (pollutes the diff with 280 files).

### The decision

**Migrations applied via Supabase MCP `apply_migration`, NOT via Supabase CLI `db push`.** Source-of-truth files live in `supabase/migrations/` in the repo (committed by Claude Code on the feature branch). Application happens via Supabase MCP from chat. Pattern locked for all 19 stages of the slot-driven build.

### What this means in practice

Per-stage workflow:

1. Claude (chat) writes Stage N brief at `docs/briefs/cc-stage-NN.md` with full SQL for each migration file
2. PK runs Claude Code (CC) against the brief
3. CC creates source-of-truth files in `supabase/migrations/20260426_NNN_*.sql`, commits on `feature/slot-driven-v3-build`, pushes
4. CC reports commit SHA back to chat
5. Claude (chat) applies each migration via Supabase MCP `apply_migration` using exact SQL from the file
6. Claude (chat) runs verification queries (V1–VN per stage)
7. PK approves → next stage

CC never runs SQL. Claude (chat) never edits files. Each session of work has one role per turn — clean responsibility boundaries.

### Why MCP over CLI repair

Three reasons:

1. **Whack-a-mole avoidance.** Every future MCP migration applied between stages would force another `migration repair` to land the next stage's CLI push. The MCP-only pattern eliminates the loop.
2. **Standing pattern continuity.** This is how every other migration in the repo got applied. Switching to CLI mid-project would have created two divergent patterns.
3. **Idempotent workflow.** MCP `apply_migration` registers a row in `supabase_migrations.schema_migrations` exactly like CLI push would. End-state in production is identical.

CLI link remains useful for `supabase functions deploy` (Stage 11 onward, when ai-worker refactor needs deployment).

### What this does NOT change

- Files in `supabase/migrations/` remain source of truth. PRs review them.
- The `feature/slot-driven-v3-build` branch strategy is preserved (per v4 §5 default).
- CC's role of creating files + committing + pushing is unchanged.
- Direct push to `main` for non-build work continues per D165.

### Related decisions

- **D165** — Dev workflow rule (default direct-push to main, deviate for multi-repo coordinated risk). D170 extends: feature branches are appropriate for the 28-migration coordinated change of Phase A; main remains the default for everything else.
- **v4 build plan** (commit `26d88b8`) — original specified `supabase db push`. D170 supersedes that specifically.

---

## D171 — Pre-Flight Schema Verification as a Per-Stage Gate
**Date:** 26 April 2026 morning | **Status:** ✅ APPLIED for all 6 Phase A stages, locked for Phase B

### The problem this decides

V4 SQL was written from architectural intent, not from production schema introspection. Stage 1 pre-flight queries surfaced 5 mismatches between v4's assumed shape and actual production:

1. `f.canonical_vertical_map` did not exist (v4 §A.5 trigger was specced to fire on it)
2. `vertical_id` is integer, not uuid (v4 query Q1 used `content_vertical_id uuid`)
3. `canonical_title` not `title` on `f.canonical_content_item` (v4 Stage 2 trigram index targeted wrong column)
4. `ai_job_id` not `id` on `m.ai_job` (v4 §11 referenced wrong PK column)
5. `t.content_class.class_code` is not globally unique (versioned table; partial-unique can't FK)

Caught in 30 minutes of pre-flight before any SQL was written. Each would have cost hours mid-stage if discovered at apply time.

### The decision

**Every stage brief begins with pre-flight schema verification queries against the live production database.** Mismatches are folded into the brief's SQL before CC sees it.

Pre-flight covers:
- Column names + data types for every table referenced
- FK target uniqueness (especially against versioned tables)
- Existence of any referenced view, function, or extension
- Sample data shape (e.g. how many rows in t.content_class, what class_codes exist)
- Recent operational state (e.g. cron states, queue depths, R6 paused)

The brief's SQL is written against verified shape, not against v4's theoretical specs.

### Why this earns its keep

Each Phase A stage had pre-flight findings that changed the SQL:

- Stage 1: 5 mismatches above; added Migration 008 (`f.canonical_vertical_map`)
- Stage 2: 10 ice_format_keys in production (not 6 v4 specced); seed expanded
- Stage 3: classifier writes to `f.canonical_content_body.content_class`, not a separate table; trigger architecture revised
- Stage 4: 1,804 classified canonicals total, 647 in last 7 days; backfill batch sizing confirmed
- Stage 5: client timezone all `Australia/Sydney`, schedule columns `enabled`/`schedule_id`/`day_of_week`/`publish_time`; materialiser SQL written against actual shape
- Stage 6: pg_cron extension confirmed available, existing cron command patterns inspected to match

Without pre-flight, each stage would have shipped broken SQL and required mid-stage diagnostics + fix-up commits.

### What this requires

A fast feedback loop between chat and live DB. Supabase MCP `execute_sql` provides this. Pre-flight queries are typically:

- `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema=X AND table_name=Y`
- `SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE ...`
- `SELECT * FROM <table> WHERE <relevant filter> LIMIT 5` (sample data)
- `SELECT proname, pg_get_function_arguments(oid) FROM pg_proc WHERE ...` (existing functions)

Run before SQL is written. Folded into brief as "Pre-flight findings" section so CC + future readers see what changed and why.

### What this does NOT decide

- Doesn't dictate which queries — those are stage-specific
- Doesn't formalise as a SOP document; the rhythm is captured here as the precedent
- Doesn't apply to non-build sessions; pre-flight is a build-stage discipline, not a general session protocol

### Related decisions

- **D161** — authority hierarchy: live DB > older doc specs. D171 operationalises this for build stages: pre-flight is the act of consulting the live DB authority before writing the spec.
- **D170** — MCP-applied migrations. D171 leverages the same MCP path for read-side verification before write-side application.

---

## D172 — Architectural Revision Authority: Chat Can Revise v4 Specs During Build, Captures in Sync_State + Decision Log
**Date:** 26 April 2026 morning | **Status:** ✅ APPLIED via R-A through R-E in Phase A

### The problem this decides

Pre-flight findings forced 5 architectural revisions to v4 that couldn't be deferred:

| Revision | Original v4 spec | Revised in production |
|---|---|---|
| R-A | Trigger fires on assumed-existing `f.canonical_vertical_map` | Table added as Stage 1 Migration 008; trigger re-architected |
| R-B | Single trigger on canonical_vertical_map | Two-trigger chain (classifier→vertical_map→pool) |
| R-C | `supabase db push` for migration application | Supabase MCP `apply_migration` (D170) |
| R-D | `class_code REFERENCES t.content_class(class_code)` FK | FK dropped + orphan-check DO block |
| R-E | 6 ice_format_keys in `format_synthesis_policy` and `format_quality_policy` | 10 (matches production) |

These weren't optional polish — without them, Stage 1+ couldn't apply cleanly.

### The decision

**Claude (chat) has authority to revise v4 specs mid-build when pre-flight or apply-time findings demand it.** Revisions are captured in two places:

1. **`docs/00_sync_state.md`** — under an "Architectural Revisions vs v4" section, dated and listed by revision letter (R-A, R-B, etc.)
2. **`docs/06_decisions.md`** — as a D-series entry summarising the revisions with rationale

PK approval is not required for revisions that:
- Resolve a pre-flight mismatch with production schema
- Make v4's intent applicable when the literal v4 SQL would fail
- Maintain v4's architectural goals while adapting to production reality

PK approval IS required for revisions that:
- Change the architectural goals of v4 (e.g. moving from vertical-scoped to client-scoped pool)
- Skip v4-locked decisions (LD1–LD20)
- Defer scope to a later phase that v4 placed in current phase

### Why this works

V4 was a build plan written from architectural intent. Live production has details v4 couldn't anticipate (versioned tables, exact column names, existing data shapes, CLI compatibility). The 5 Phase A revisions all preserved v4's architectural goals while adapting to production reality.

R-A example: v4's intent was a vertical-scoped pool fed by classifier output. The literal v4 trigger spec assumed a mapping table that didn't exist. R-A added the mapping table — preserving the intent while making the trigger applicable. PK approval would have been a delay with no upside; the revision was a correctness fix, not a design change.

### What this does NOT decide

- Doesn't extend revision authority to architectural goal changes — those still need PK in the loop
- Doesn't bypass the decision-log requirement — revisions must be captured in writing for future sessions
- Doesn't apply to non-build sessions or non-v4 work

### Related decisions

- **D161** — authority hierarchy. D172 extends: when live-DB authority forces a v4 spec change, chat acts and documents.
- **D170** — MCP-applied migrations (R-C codified). 
- **D171** — pre-flight as a per-stage gate (the discipline that surfaces revision-worthy findings).

---

## D173 — Two-Trigger Chain Pattern for Classifier-Driven Pool Population
**Date:** 26 April 2026 morning | **Status:** ✅ APPLIED in Stage 3 production

### The problem this decides

V4 §A.5 specified a single trigger on `f.canonical_vertical_map` (which didn't exist). Pre-flight found classifier output lands in `f.canonical_content_body.content_class`, with no canonical→vertical mapping anywhere.

Two paths to wire pool population:

**Option A — single trigger** on `f.canonical_content_body` AFTER UPDATE OF content_class. Inline the vertical resolution + pool population in one trigger function. Functional but bloats the function.

**Option B — two-trigger chain.** Trigger 1 on `f.canonical_content_body` resolves verticals + INSERTs canonical_vertical_map rows. Trigger 2 on `f.canonical_vertical_map` AFTER INSERT calls pool refresh per row.

### The decision

**Option B — two-trigger chain.**

### Why two triggers, not one

Three reasons:

1. **Independent testability.** Trigger 1 can be debugged via direct INSERT/UPDATE on `f.canonical_content_body`. Trigger 2 can be debugged via direct INSERT on `f.canonical_vertical_map`. Stage 4 backfill exploits this — it INSERTs vertical_map rows directly, which fires Trigger 2 organically without needing to touch the classifier path.

2. **Audit trail.** `f.canonical_vertical_map.mapping_source` distinguishes `classifier_auto` (Trigger 1) from `backfill` (Stage 4 direct insert) from future `manual` overrides. Single-trigger version would have no equivalent audit surface.

3. **Reclassification handling without complexity.** When classifier reclassifies an existing canonical, ON CONFLICT DO NOTHING on the vertical_map insert means Trigger 2 doesn't fire (no new row). Trigger 1 explicitly handles this with a separate `PERFORM m.refresh_signal_pool_for_pair(...)` loop over existing mappings. This is clearer than threading reclassification logic through a single trigger.

### When NOT to use this pattern

Two-trigger chains are over-engineering when:

- Both layers always fire together (no independent invocation path)
- No audit-trail value in distinguishing the layers
- The single-trigger version is short enough to read in one screen

This pattern earns its keep when at least one of: independent invocation matters (Stage 4 backfill), audit trail is operationally valuable, or the single-trigger version exceeds ~80 lines.

### Related decisions

- **D172** — architectural revision authority (D173 is the R-B revision in concrete terms)
- **v4 §A.5** — original single-trigger spec (superseded for this implementation)

---

## D174 — Vertical-Scoped Pool Produces Per-Client Asymmetry; Operational Implication for Phase E Evergreen Seeding
**Date:** 26 April 2026 afternoon | **Status:** Empirical observation; no action required Phase A; informs Phase E priority

### The observation

After Stage 4 backfill, `m.signal_pool` per-vertical depth:

| Vertical | Pool size | Active for clients |
|---|---|---|
| 11 NDIS | 279 | NY + CFW |
| 12 AU Disability Policy | 279 | NY + CFW |
| 7 AU Residential Property | 271 | PP |
| 9 AU Property Investment | 271 | PP |
| 10 AU Mortgage & Lending | 271 | PP |
| 17 Content Marketing | 99 | Invegent |
| 16 Social Media Strategy | 99 | Invegent |
| 15 AI & Automation | 99 | Invegent |

Invegent's pool is approximately **3× thinner** than NY/PP across its three verticals.

### Why the asymmetry exists

Pool population goes through `m.resolve_canonical_verticals(canonical_id)` which joins canonical → content_item → c.client_source (where `is_enabled=TRUE`) → c.client_content_scope. The constraint is enabled-source breadth per vertical:

- **NY + CFW (NDIS, ADP):** 14+ active enabled feed sources between them (DSS, OT Australia, Inclusion Australia, NDIS Quality and Safeguards Commission, etc.)
- **PP (Residential Property, Investment, Mortgage):** Similarly 14+ sources (CoreLogic, RBA, REIA, PropTrack, etc.)
- **Invegent (AI, Social, Content):** 2 enabled sources (Social Media Examiner, plus one other)

Pool depth scales with enabled-source breadth. Vertical-scoped design is correct (avoids duplicate entries for clients sharing verticals — NY+CFW share entries; PP gets all property entries) but exposes any client with a thin source list to thin-pool conditions.

### The operational implication

Per LD3, the slot-driven architecture has an evergreen-library fallback for thin-pool moments. Phase E is the parallel content work that hand-curates ~50 evergreen items.

**Phase E priority should weight Invegent's verticals (AI/Social/Content) higher than NY/PP verticals (NDIS/ADP/Property).** Without this weighting, Invegent will hit thin-pool conditions far more often than NY or PP and over-rely on evergreen fallback — degrading content variety for that client specifically.

Not a build problem. Not an emergency. Just a heads-up that Phase E's ~50-item budget should not split evenly across 8 verticals (12% each = 6 items per vertical). Better split is something like 30% to Invegent's three verticals (15 items, ~5 per vertical) and 70% to NY+PP (~5 verticals at ~7 items each).

### What this does NOT decide

- Specific evergreen item counts per vertical — that's Phase E's planning work
- Whether to add more sources to Invegent — could rebalance the pool but adds source-management overhead; decision deferred until Invegent's actual content needs are clearer
- Whether other clients should add evergreens too — yes, but proportionally lower

### Related decisions

- **LD3** — evergreen library as fallback (the architectural commitment Phase E delivers on)
- **v4 Phase E** — evergreen seeding (parallel content work, 3-4 hours, ~50 items)

---

## D175 — `t.content_class` Versioning Pattern: Drop FK, Use PK + Application-Layer Validation
**Date:** 26 April 2026 morning | **Status:** ✅ APPLIED in Stage 2.009 (production, commit `130a559`)

### The problem this decides

`t.class_freshness_rule` was specified with `class_code text REFERENCES t.content_class(class_code)`. Apply-time error:

> ERROR: 42830: there is no unique constraint matching given keys for referenced table "content_class"

Investigation: `t.content_class` is a versioned table. `class_code` is unique only per `(class_code, version)` (composite PK) and via partial-unique index `WHERE is_current=true`. PostgreSQL won't accept a partial unique as an FK target.

This is a structural property of versioned reference tables, not a one-off schema oddity.

### The decision

**For lookup tables that reference a versioned source table, drop the FK and use PK + application-layer validation.** Pattern:

```sql
CREATE TABLE t.lookup_table (
  class_code text PRIMARY KEY,           -- no FK
  ...
);

-- Seed with values verified against current+active source rows
INSERT INTO t.lookup_table (class_code, ...) VALUES (...);

-- Validate: every seed value exists as a current+active row in source
DO $$
DECLARE v_orphans integer;
BEGIN
  SELECT COUNT(*) INTO v_orphans
  FROM t.lookup_table cfr
  WHERE NOT EXISTS (
    SELECT 1 FROM t.<source_versioned_table> cc
    WHERE cc.class_code = cfr.class_code 
      AND cc.is_current = true 
      AND cc.is_active = true
  );
  IF v_orphans > 0 THEN
    RAISE EXCEPTION '<table> has % orphan class_codes', v_orphans;
  END IF;
END $$;
```

### Why drop the FK is correct, not a workaround

Three reasons:

1. **Postgres semantics.** Partial unique indexes (`WHERE is_current=true`) intentionally don't satisfy FK constraints because the uniqueness depends on a predicate that the FK enforcement engine doesn't evaluate. This is by design.
2. **Versioning intent.** A versioned source table preserves history. An FK to it would prevent rotating versions (you couldn't supersede a `is_current=false` row that the lookup table references). The lookup table only cares about *currently active* values.
3. **Application-layer validation is sufficient.** Seed inserts are admin-controlled. Application reads (e.g. trigger functions) join against `is_current=true AND is_active=true` filters. The "missing" FK enforcement happens at write time (DO block check) and read time (filter clause), where it actually matters.

### When this pattern applies

Whenever a new lookup/config/policy table needs to reference a versioned table:

- `t.content_class` (this case)
- `t.content_vertical` (versioned via `is_global` + jurisdiction-specific rows)
- `t.5.6_brand_voice` (versioned)
- `t.5.7_compliance_rule` (versioned)

For any of these, default to PK + DO-block validation, not FK.

### What this does NOT decide

- Doesn't change the FK semantics of any existing table — only the pattern for new lookup tables
- Doesn't migrate existing FKs that may exist incorrectly elsewhere — that's a separate audit
- Doesn't override FK use against non-versioned tables — those stay normal FKs

### Related decisions

- **D161** — authority hierarchy (live DB > older doc specs). D175 operationalises: when source table has versioning semantics that conflict with FK, trust the live DB shape.
- **D172** — architectural revision authority. D175 is R-D in concrete terms.

---

## D176 — F8 Buffer (10-Min Lookahead) and Manual State-Change Function Hygiene
**Date:** 26 April 2026 afternoon | **Status:** Operational pattern locked

### The problem this decides

`m.promote_slots_to_pending()` (Stage 5.028) uses an F8 buffer:

```sql
WHERE status = 'future'
  AND fill_window_opens_at <= now() + interval '10 minutes'
```

The +10 minutes is intentional — once Stage 6's cron fires every 5 minutes, this lookahead means slots transition to `pending_fill` slightly before their fill window opens, so the fill cron can pick them up on its very next tick.

During Stage 5 verification (manual function call before Stage 6 cron existed), the function correctly promoted 12 slots — but these slots had no consumer (Stage 8 fill function not yet built). Left untouched, they would have sat in `pending_fill` for days/weeks until Stage 8 shipped.

### The decision

**State-changing functions tested manually during incremental builds must be rolled back to clean state if their consumer doesn't exist yet.**

Concretely for promote_slots_to_pending: after manual verification confirmed it worked, ran:

```sql
UPDATE m.slot SET status = 'future', updated_at = now() 
WHERE status = 'pending_fill';
```

When Stage 6 cron started firing 06:10 UTC, the same 12 slots re-promoted naturally. They'll sit in pending_fill harmlessly until Stage 10 wires the fill cron — at which point they become the first input the fill function processes.

### Why this matters

Three failure modes prevented:

1. **Stranded state.** Slots in pending_fill with no consumer accumulate forever. If Stage 8 takes a week to ship, those slots are a week stale by the time anything reads them.
2. **Test signal pollution.** The 12 stranded slots would skew Stage 6's first-tick verification (cron promotes 0, not 12, because they were already promoted manually).
3. **Recovery cron triggering on test data.** Stage 9's `recover_stuck_slots` will eventually classify >1h pending_fill as stuck and try to recover. Test data triggering recovery logic is noise, not signal.

### Pattern for future stages

Before manually invoking a state-changing function during build verification:

1. Note the pre-state (count of rows in each relevant status)
2. Invoke the function and verify the state transition worked
3. **If the consumer of the new state doesn't yet exist, roll back to pre-state**
4. Document in stage report what was rolled back and why

This applies to any function that writes status/lifecycle columns where downstream automation isn't yet wired.

### What this does NOT decide

- Doesn't apply to read-only functions (verify-and-leave is fine)
- Doesn't apply to functions whose consumers DO exist (just let the state propagate)
- Doesn't apply to test data that's distinguishable from prod (e.g. a `test_synthetic_jobname` heartbeat row — those self-clean via test cleanup)

### Related decisions

- None directly. This is a build-discipline pattern surfaced by Phase A's incremental nature.

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
| **D170 — MCP-applied migrations pattern** | ✅ LOCKED through Phase A; applies for all 19 stages | — |
| **D171 — Pre-flight schema verification per stage** | ✅ LOCKED through Phase A; applies for all 19 stages | — |
| **D172 — Architectural revision authority** | ✅ LOCKED; R-A through R-E applied in Phase A | — |
| **D173 — Two-trigger chain pattern** | ✅ APPLIED Stage 3 | — |
| **D174 — Invegent thin-pool operational signal** | ✅ Observed; informs Phase E priority | Phase E content work |
| **D175 — Versioned reference table pattern** | ✅ APPLIED Stage 2.009 | Apply to future lookup tables referencing versioned sources |
| **D176 — State-change rollback discipline** | ✅ APPLIED Stage 5 | Build-stage pattern |
| **Slot-driven Phase A — Gate A passed** | ✅ COMPLETE 26 Apr | Phase B begins next session |
| **Slot-driven Phase B — Stages 7-11 + Gate B** | 🔲 NEXT | Stage 7 brief next session |
| **Slot-driven Phase C — Cutover (Stages 12-18)** | 🔲 After Gate B | 5-7 days shadow observation post-Phase B |
| **Slot-driven Phase D — Stage 19 decommission R6** | 🔲 After Phase C | All client-platforms cut over |
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
| **CFW schedule save bug investigation** | ✅ Closed M2 PR #2 commit `a1d7dc01` | — |
| **getPublishSchedule exec_sql + silent-swallow** | ✅ Closed M5 PR #3 commit `737d150` | — |
| **M6 portal exec_sql eradication** | ✅ Closed M6 PR #1 commit `9c00b5a` | — |
| **M7 dashboard feeds/create exec_sql** | ✅ Closed M7 PR #5 commit `eda95ce` | — |
| **M9 ScheduleTab + FeedsClient client-switch staleness + Schedule platform display** | ✅ Closed M9 PR #4 commit `293f876` | — |
| **Discovery pipeline ingest bug fix** | ✅ Closed Q2 | — |
| **13 failed ai_jobs cleanup SQL** | ✅ Closed 21 Apr evening — see D163 | — |
| **A7 privacy policy update** | ✅ Closed 22 Apr morning — invegent.com/privacy-policy live + canonical | — |
| **External reviewer resume** | 🔲 Paused per D162 | ~18-19 of 28 Section A items closed |
| **Per-commit reviewer iteration bug** | 🔲 Before reviewer resume | Add filter for per_commit_enabled or explicit reviewer_key IN list |
| **Phase 1.7 DLQ continuation — `m.post_publish_queue` CHECK** | 🔲 Backlog per D163 | Dedicated Phase 1.7 full-sprint session |
| **TPM saturation on concurrent rewrites** | 🔲 Brief parked per D163 | Pipeline resumes from drain + fresh digest fires through rewrite |
| **M8 Gate 4 — 24h regression check** | 🔲 23 Apr | Re-run regression query against runs > M8 merge timestamp |
| **Bundler dedup weekly regression check** | 🔲 Ongoing | Weekly Mon — query in D164 |
| **FB-vs-IG publish disparity** | ✅ Closed M11 PR #2 commit `583cf17` — root cause 8-day silent cron outage; bloat cleanup applied per D165 | — |
| **`instagram-publisher` platform filter (ex-M12)** | 🟡 Superseded by slot-driven build | Phase C cutover phases out legacy publishers; Phase D decommissions |
| **`instagram-publisher` exec_sql + raw interpolation** | 🔲 Folds into slot-driven Phase B Stage 11 ai-worker refactor | Stage 11 |
| **PP Schedule Facebook 6/5 over-tier-limit** | 🔲 Sprint item TBD | Surfaced in M5 verification — investigate save-side validation |
