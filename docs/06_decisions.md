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

## D180 — Discovery Decides Assignment, Intelligence Decides Retention
**Date:** 28 April 2026 morning | **Status:** ✅ APPLIED via migration `006`, trigger `tg_auto_link_seed_to_client` (production)

### The problem this decides

Migration `005` (this morning's hotfix to the 5-param `create_feed_source_rss` overload) unblocked the feed-discovery EF, but PK noticed a follow-on gap: when a client-scoped seed (e.g. a CFW keyword "paediatric occupational therapy") was provisioned into `f.feed_source`, the EF did NOT create a corresponding row in `c.client_source` linking the new feed to the client that asked for it.

Result: 8 newly-discovered CFW feeds existed but were not surfaced to CFW. They sat in the dashboard's "Unassigned — N feeds" bucket, requiring manual operator review and a click-through "Assign" action per feed before content from those feeds would surface in CFW drafts.

Two architectures considered:

**Option A — Quarantine-and-review (status quo before migration 006):** Every newly-discovered feed lands in the unassigned bucket. Operator reviews each one (URL, sample content) and clicks Assign to link it to the originally-requesting client. The unassigned bucket is the quality gate.

**Option B — Auto-link-on-provisioning:** When a `f.feed_discovery_seed` row transitions to `status='provisioned'` and `client_id` is non-null, automatically insert into `c.client_source` linking the feed to the client. Quality control happens downstream via `feed-intelligence` (deployed v1.0.0) which scores all active feeds weekly and writes recommendations to `m.agent_recommendations` (`type='deprecate'/'review'/'watch'`).

### The decision

**Option B.** A trigger `tg_auto_link_seed_to_client` on `f.feed_discovery_seed` AFTER UPDATE OF status, feed_source_id auto-links when:
- New status = 'provisioned'
- `client_id IS NOT NULL` (operator-exploration seeds with NULL client_id are NOT auto-linked — they continue to land in the unassigned bucket as before)
- `feed_source_id IS NOT NULL`

Idempotent via `ON CONFLICT (client_id, source_id) DO NOTHING`. Backfill applied to the 8 existing CFW provisioned seeds; CFW pool went from 2 → 10 active feeds.

### Why Option B over Option A

Three reasons, articulated by PK in the design call:

1. **The keyword belongs to the client. The feed belongs to the client.** When PK enters "paediatric occupational therapy" via the per-client onboarding form (Stage 1.1), the intent is unambiguous: I want this content on CFW. Forcing manual re-confirmation of that intent at the assignment step is friction without value.

2. **Quality control already has a dedicated layer.** `feed-intelligence` is the function for "is this feed producing rubbish or not". It runs weekly, applies precise rules (≥70% give-up over 14d → deprecate; zero-successes over 30d → review; ≥50% give-up → watch), and writes recommendations the operator can act on. Putting a manual review gate in front of the assignment step is duplicating work the intelligence layer is built to do better.

3. **The unassigned bucket retains a real purpose.** It's NOT becoming dead UI. It now surfaces only:
   - Operator-exploration seeds (`client_id IS NULL` — for vertical research without a specific client in mind)
   - Orphaned feeds (where an operator removed all client assignments but the underlying `f.feed_source` row stays alive — these need attention because ingest continues, content piles up unused, and RSS.app quota is consumed)
   - Operator-added feeds via the global "Add feed" modal that haven't been assigned yet

The bucket is valuable specifically as an audit view of "what's running but unused", not as a pre-assignment quality gate.

### What this requires

- Trigger fires on `f.feed_discovery_seed` AFTER UPDATE OF status, feed_source_id
- Trigger function uses `SECURITY DEFINER` (writes to `c.client_source`)
- Default values for new links: `is_enabled=TRUE`, `weight=1.0`, `notes='auto-linked by feed-discovery'`
- `ON CONFLICT (client_id, source_id) DO NOTHING` — idempotent on re-processing

### What this does NOT change

- `f.feed_discovery_seed` rows with `client_id IS NULL` (operator-exploration) are NOT auto-linked. They still go through the manual Assign flow. Brief A's Feeds-tab UX upgrade (commits `27e83f3` / `f9aac5e` / `a3f392b`) makes that flow easier by surfacing the seed_value, the URL, and an "Auto-discovered" badge per row.
- `feed-intelligence` retention logic is unchanged. It already operates on every active feed regardless of how it was added.
- The legacy "Add feed" modal (operator-added feeds) is untouched. Operator-added feeds still go through the existing "pick clients to assign to" step in that modal.

### Related decisions

- **D170** — MCP-applied migrations (D180 migration 006 follows this pattern; chat applied via Supabase MCP `apply_migration`, then committed file to GitHub)
- **D171** — Pre-flight as gate. Migration 006 pre-flight queries verified the existing `c.client_source` weight/is_enabled defaults and the trigger filter conditions before authoring the SQL.
- **Brief A (commit `5c302f5`)** — Feeds-tab UX upgrade. Made the unassigned bucket genuinely useful by surfacing seed_value, URL, and origin badges. Brief A and D180 are complementary: D180 reduces what lands in the unassigned bucket; Brief A makes what does land there easier to triage.
- **D175** — Versioned reference table pattern. D180's trigger on `f.feed_discovery_seed` does not touch versioned ref data, but uses the same MCP-apply migrations pattern.

### Latent bugs uncovered en route to D180

Migration 005 + 006 + 007 + 008 work this morning surfaced three side findings, captured here for future cleanup but not blocking:

1. **Overload B of `create_feed_source_rss`** (6-param) has a latent NOT NULL bug — its INSERT omits `output_kind` and `refresh_cadence` (both NOT NULL columns with no defaults). It has never executed successfully against PostgREST because the schema-cache miss prevented any call from reaching it. Recommend dropping or fixing in a follow-up. Migration 005 deliberately did NOT touch it (additive-only, lowest-risk hotfix).

2. **GitHub source vs deployed EF drift** — `feed-discovery/index.ts` on `main` built config jsonb with key `url:`, but the deployed EF v1.1.0 actually wrote `feed_url:` (the convention used by every other `rss_app` row in `f.feed_source`, and the key the ingest pipeline reads). If anyone had run `supabase functions deploy feed-discovery` from main without realising, the EF would have started writing `url:` and silently broken ingest. Source aligned in commit `d1b6469` (v1.2.0). Deployed EF unchanged — already correct.

3. **Migration 005's wrapper dedupe also read the wrong key** — fixed in migration 008 (`2f261a4`) by COALESCE on both `feed_url` and `url` at both input and lookup.

---

## D181 — Audit Loop as Three-Layer Architecture
**Date:** 28 April 2026 afternoon | **Status:** ✅ BUILT — first cycle complete same day, three findings closed

### The problem this decides

ICE has reached a complexity (200 tables, 674 columns in c+f alone, ~80 Edge Functions, ~40 crons, multiple shipping pipelines) where periodic external audit is more valuable than continued visual review. The question: how to structure that audit loop such that it (a) operates on real production state without requiring DB write access for the auditor, (b) produces findings the operator can review and close in batch, (c) protects against the auditor missing things or rediscovering already-fixed gaps each cycle, and (d) extends to multiple audit roles (data, security, operations, financial, compliance) without bloating each role.

### The decision

**Three-layer architecture, with ChatGPT as the read-only auditor and operator + Claude as the closure team.**

**Layer 1 — `k.*` registry (already exists).** Structured catalogue of tables, columns, edge functions, crons, decisions. Ongoing curation by Claude. Source of truth for what *should* exist.

**Layer 2 — GitHub snapshots.** Markdown documents committed to `docs/audit/snapshots/{date}.md`. Generated from production via SQL queries against `k.*` plus targeted `f.*` and `m.*` extracts. Currently run manually; Cowork automation deferred until format stabilises. Excludes content bodies (no canonical text), secrets (no tokens), full DB dumps. Sized to fit a ChatGPT context window (~30k chars).

**Layer 3 — Markdown findings.** ChatGPT auditor reads the latest snapshot + `open_findings.md` (history) and produces `docs/audit/runs/YYYY-MM-DD-{role}.md`. Each finding follows a fixed format (issue / evidence / recommended action / resolution placeholder). Operator + Claude process closures in chat, commit closure notes back to the run file. Closures are explicit and batched at end of session.

### What gets locked alongside the architecture

Eight sub-decisions that came up during the design call:

1. **5-tier severity:** Critical / High / Medium / Low / Info. Inflation is a known failure mode; the role definition reminds the auditor to be honest about severity.
2. **Snapshot scope:** structured queries over `k.*` and a few targeted `f.*`/`m.*` tables; no content bodies, no secrets, no full DB dumps. Size-bounded to one ChatGPT context.
3. **Snapshot format:** markdown wrapper with JSON blocks for tabular sections. Preserves both readability and machinability.
4. **Cowork automation deferred:** for V1, snapshots are generated manually via a chat session. Cowork can later run the snapshot SQL on a schedule once the format is stable.
5. **ChatGPT mechanism:** project paste, not connector. ChatGPT reads the snapshot from a project file, produces the run file as text, operator commits.
6. **Role 1 = Data Auditor only.** Other roles (Security, Operations, Financial, Compliance) come later. Don't generalise the role contract until at least one role has run for 5 cycles.
7. **Closure flow:** operator + Claude work through findings in chat at the end of a session. Closures are explicit and batched. No per-finding commits.
8. **Finding ID format:** `F-YYYY-MM-DD-{role-letter}-NNN`. Role letter is `D` for Data, `S` for Security, etc. Numbering resets per day per role.

### Why this architecture over alternatives

Three alternatives were considered:

**Alternative A — Continued visual review by operator.** Worked at 30 tables and ~20 EFs. At current scale (200/80/40), the operator cannot reliably notice every drift. Manual review's failure mode is not "wrong findings" but "missed findings."

**Alternative B — Build a custom audit dashboard in Next.js.** Would surface coverage stats, missing FKs, etc. Costs ~3–5 days of build work. Doesn't actually audit; just displays. Decided against — the auditing intelligence (ChatGPT reading and applying judgement to a snapshot) is the value, not the visualisation.

**Alternative C — Real-time integration: ChatGPT connected directly to Supabase via MCP.** Theoretically possible. Rejected for two reasons: (a) gives an external service production read access, (b) makes findings ephemeral. The snapshot approach keeps state versioned in git.

The three-layer architecture chosen because it: keeps production read-only from ChatGPT's perspective; produces durable, version-controlled findings; scales to multiple roles by adding role definition files without touching infrastructure; and the snapshot approach defers automation to when it's worth doing.

### What this requires

- `docs/audit/00_audit_loop_design.md` — full design document (committed `e6f40ee`)
- `docs/audit/open_findings.md` — register tracking open + closed findings (committed `bd0b241`)
- `docs/audit/roles/data_auditor.md` — Data role definition (committed `2678a08`, updated `27ff3b3` for slice 1)
- `docs/audit/snapshots/YYYY-MM-DD.md` — daily snapshot artifact
- `docs/audit/runs/YYYY-MM-DD-{role}.md` — per-cycle finding artifact
- `docs/audit/decisions/*.md` — locked-during-closure documentation rules

### What this does NOT decide

- The cadence (daily? weekly? Tuesday-only? per-cycle?). Default Tuesday rotation. Refine with experience.
- Other roles. They follow when Data Auditor has run for 5+ cycles successfully.
- Snapshot automation. Stays manual until format is stable; Cowork is the natural automation venue when it is.

### First-cycle validation (same day)

The architecture was tested end-to-end the same afternoon:

- Snapshot generated: `docs/audit/snapshots/2026-04-28.md` (33k chars, 19 sections, 8 pre-flagged observations)
- ChatGPT read the snapshot + role definition and raised 3 findings: F-2026-04-28-D-001 (HIGH, 31 Phase B tables undocumented), F-2026-04-28-D-002 (MEDIUM, 0% column coverage in c+f), F-2026-04-28-D-003 (MEDIUM, same-name-different-SQL migration violation)
- All 3 findings closed same session: F-001 closed-action-taken (extended scope to 56 tables, registry now 100%), F-003 closed-action-taken (forward discipline locked, automated detector built), F-002 closed-action-pending then Phase A applied via P1–P3 plan
- Loop produced three new lessons: #35 (document at creation, not retroactively), #36 (migration name permanent once applied), #37 (ChatGPT review of CC proposals before apply)

### Slice 1 — Audit recurrence prevention (committed same day)

A structural addition that protects the loop against rediscovering the same gap each cycle:

- `k.refresh_table_registry` and `k.refresh_column_registry` now write `'PENDING_DOCUMENTATION'` sentinel for new objects (was `'TODO: ...'` for tables and NULL for columns).
- `k.fn_check_migration_naming_discipline()` returns same-name-different-SQL violations on demand. Currently returns 1 row (the historical F-003 violation) — accepted as historical, closed-redundant in future cycles.
- Data Auditor role definition updated with the 14-day grace window for PENDING_DOCUMENTATION items (younger than 14d = not a finding) and the DEFERRED escape hatch (`purpose = 'DEFERRED until YYYY-MM-DD: reason'` recognises operator-acknowledged gaps with deadlines).

Migration committed at `supabase/migrations/20260428054222_audit_slice1_pending_documentation_sentinel.sql` (commit `27ff3b3`).

### Related decisions

- **D170** — MCP-applied migrations. Closure migrations follow this pattern.
- **D175** — Versioned reference table FK pattern. Detected and validated in audit context.
- **D177** — fitness_score_max scale. Pre-flight discipline that Lesson #32 sharpened, audit cycle now reinforces.

---

## D182 — Non-Blocking Execution Model (Five-Rule System)
**Date:** 28 April 2026 evening | **Status:** ✅ LOCKED — v1 spec committed at `docs/runtime/automation_v1_spec.md`. Phase 1+2 (files + decision + memory) complete this commit. Phase 3+ (first brief, Cowork scheduled task, GitHub Actions validation, first overnight test) sequenced for next sessions.

### The problem this decides

PK is the bottleneck in three-way decision flow between Claude Chat, Claude Code, and ChatGPT. Today's audit cycle 1 closure made the pattern explicit: PK relays every question, every clarification, every correction. Five to ten cycles per session. Real velocity loss.

Worse, ICE has reached a stage where **the operator's working hours are the binding constraint on system progress.** PK has to be awake and attentive for the system to make progress. Phase D ARRAY mop-up sits in the backlog because PK doesn't have a clean 60-minute slot to walk Claude through 7 mechanical column purposes. LOW-row resolution sits because it needs PK's domain knowledge in real time. Audit cycle 2 won't start until PK has time to sit through it.

The question: how to structure execution such that PK becomes scheduler + reviewer instead of synchronous executor — without introducing production risk.

### The decision

**A five-rule non-blocking execution system, with phased build sequence over 4-6 sessions.**

The system has five rules that work together. Each rule individually is small; the combination is what makes velocity unlock without losing safety:

#### Rule 1 — Default-and-continue

Claude NEVER blocks on questions. When Claude hits a decision point during brief execution:
1. Writes structured question to `docs/runtime/claude_questions.md`
2. Proceeds with the documented default immediately
3. Later checks `docs/runtime/claude_answers.md` for response
4. If answer differs from default, applies correction per the correction-handling rules below

The win is not the question file. The win is that Claude doesn't sit waiting for PK. Work continues; the answer arrives async; corrections are small.

#### Rule 2 — Answer-key pattern

Every brief MUST include a "Likely questions and defaults" section that pre-answers the most predictable decisions. Format:

```
Q: <expected question>
Default: <what Claude proceeds with>
Escalate if: <condition under which the default is wrong>
```

This is the **real** velocity lever. Without answer-keys, Claude writes too many questions because it has nowhere to encode operator judgment upfront. With answer-keys, 60% of questions are pre-answered and don't even need to be written. The Q&A inbox handles only the genuinely novel remaining 40%.

#### Rule 3 — One AI per question

Decisions go to one AI, not three. If Claude Code is executing the brief, Claude Code makes the call (with the answer-key as guidance). If Claude Chat is executing, Claude Chat makes the call. ChatGPT (via OpenAI API) becomes the answer source for the Q&A inbox — not a parallel reviewer of every decision Claude already made.

This eliminates the failure mode where today's session had CC + chat + ChatGPT all reasoning about the same JSONB shapes (P3 phase). Each had different blind spots; the safety net was real but the duplication was wasteful. Going forward: one AI executes; one AI answers async; PK adjudicates judgment.

#### Rule 4 — Escalation rules

The OpenAI API (or whoever answers questions in the inbox) MUST escalate (not auto-decide) when the question involves:

- Brand voice or public wording
- Client-facing content
- Legal/compliance implications
- Migrations or production writes
- Secrets/tokens
- High-impact ambiguity (multiple valid options + irreversible consequences)
- Low confidence with high impact

Response format: `Correction needed: stop and ask PK`. Claude reads this and pauses only that scope, documenting the escalation in the state file.

#### Rule 5 — No production writes from automation

Scripts and scheduled tasks may read files and write markdown. They MUST NOT:
- Apply migrations to Supabase
- Update production data
- Delete branches
- Auto-close audit findings
- Merge PRs
- Change live system state without explicit PK approval

Production writes are PK's gate. Automation produces ready-to-approve artifacts; PK reviews and applies in the morning.

### v1 architecture (compressed pipeline)

```
Daytime  — PK writes brief with frontmatter, marks status: ready
10pm-1am — Cowork executes one brief, asks questions, applies corrections
1am-2am  — OpenAI API answers questions (cloud-side, laptop-independent)
2am-3am  — GitHub Actions validates outputs (cloud-side, laptop-independent)
Morning  — PK reviews report, approves or requests changes
```

Compressed from ChatGPT's original 8-hour spec (three Cowork sessions per night). Cost discipline + lower laptop-awake burden. One Cowork window only.

### Risk-tier system (4 tiers)

Every brief carries a `risk_tier` in frontmatter:

- **Tier 0** — docs/reports → safe auto-commit. Narrowly defined: observation reports, sync summaries, audit run drafts, reconciliation logs, non-decision status files. Default if uncertain: Tier 1.
- **Tier 1** — drafts (code/migration) → PR only. Output goes through PK morning review before any apply.
- **Tier 2** — production-affecting → STOP for PK. Cowork writes `ESCALATION_REQUIRED` in state file and halts that scope.
- **Tier 3** — judgment-heavy → escalate immediately. Brand voice, client-facing wording, legal/compliance, secrets/tokens. Same halt as Tier 2 but flagged as "judgment escalation" in morning report.

### Default-and-continue correction handling

When API answer arrives AFTER Claude has proceeded:

| Scenario | Behaviour |
|---|---|
| Before commit | Revise inline, no extra commit |
| After commit but before apply | Amend in single follow-up commit |
| After apply (live change) | Do NOT auto-revert. Log divergence. Flag for PK decision. |
| Multiple corrections | Apply in dependency order, group into minimal commits |
| Stop condition mid-flight | Pause only affected scope, document state, escalate to PK |

### Status flow

```
ready → running → questions_pending → validation_pending → review_required → done | failed | blocked
```

Failed briefs do NOT auto-retry. PK manually resets to `ready` if appropriate.

### Why this architecture over alternatives

**Alternative A — GitHub Actions cron + Node.js script + Supabase MCP credentials in GitHub secrets.** This was the v3 plan. ChatGPT's deep-research pivot identified a better tool: Cowork. Already paid for in PK's Max 5x subscription. Full MCP access already configured. Scheduled tab already exists. Built-in safety scaffolding (Anthropic-managed runtime, not custom script). GitHub Actions retained as the cloud-side validation layer (laptop-independent) but no longer the orchestrator.

**Alternative B — Continue PK-as-relay forever.** Doesn't scale. Already at 5-10 cycles per session as the binding constraint. Adding more sessions/clients/briefs makes it worse, not better.

**Alternative C — Build a custom orchestration agent (LangChain, CrewAI, etc).** Rejected. Adds infrastructure complexity for a problem that doesn't need it. The five rules above + Cowork scheduling + GitHub Actions validation cover the real workflow.

### What this requires (Phase 1+2, this commit)

- `docs/runtime/automation_v1_spec.md` — full v1 spec with all rules, frontmatter, status flow, correction handling, success thresholds
- `docs/runtime/claude_questions.md` — empty Q inbox with format reference
- `docs/runtime/claude_answers.md` — empty A outbox with format reference
- `docs/runtime/state_file_template.md` — per-run state file template
- `docs/runtime/runs/.gitkeep` — placeholder for state files
- `docs/runtime/README.md` — directory orientation

### What this requires (Phase 3+, next sessions)

- Phase 3: First brief authored in v1 frontmatter format. Recommended first test: Phase D ARRAY mop-up. Tier 1, draft-only, mechanical, finite scope.
- Phase 4: Cowork scheduled task configured via `/schedule`. GitHub Actions validation workflow built (lint + diff + filename check).
- Phase 5: First overnight test. Observe against success thresholds. Iterate.

### Success thresholds (first test = Phase D ARRAY mop-up)

| Metric | Good | Re-evaluate |
|---|---|---|
| Questions asked | ≤ 10 | > 20 |
| Defaults overridden | ≤ 20% | > 50% |
| Cowork run completes | yes | no |
| GitHub Actions validation passes | yes | no |
| Production writes | 0 (mandatory) | any > 0 |
| PK morning approval time | ≤ 10 min | > 30 min |

If 5+ thresholds in "Good" column: scale up (add more briefs).
If 2+ thresholds in "Re-evaluate" column: redesign before next run.

### Constraints accepted

1. **Cowork desktop-must-be-awake.** Same constraint as `openclaw tui`. PK accepts: skip nights laptop is off. v2 considers always-on workstation.
2. **Usage limits, not dollar costs.** Cowork on Max 5x bundled in subscription. Real constraint is Max plan usage, not API spend. Daily Cowork run = within budget. Hourly = potentially hits usage limits.
3. **No human-in-the-loop for scheduled tasks.** Mitigated by Tier 2/3 escalation, scoped permissions, idempotency checks.

### What this does NOT decide

- The exact Cowork scheduled-task prompt (locked in Phase 4 brief)
- The GitHub Actions validation workflow contents (locked in Phase 4 brief)
- Cadence beyond v1 (daily, weekly, weekday-only — TBD after first 5 runs)
- Whether to build the `ice-brief-runner` plugin per ChatGPT's suggestion (deferred until v1 proves valuable)
- Audit loop automation (D181 slice 2 + 3 — deferred until snapshot format stable)

### Sunset clause

Review effectiveness after 2 weeks (by 12 May 2026). If question count is not declining or correction commits are not minimal, re-evaluate the model tiering, brief template, or whole approach. The five-rule system stays only if it's measurably better than the relay model.

### Related decisions

- **D170** — MCP-applied migrations. The discipline of pre-flight + apply via MCP applies inside scheduled tasks too — Cowork would invoke the same Supabase MCP path.
- **D171** — Pre-flight as gate. Briefs that involve schema changes still pre-flight; the difference is Cowork executes the pre-flight, not Claude Chat.
- **D175** — Versioned reference table FK pattern. Future scheduled briefs touching versioned data must include this discipline in the answer-key.
- **D181** — Audit loop architecture. D181 is the predecessor in the "reduce PK as bottleneck" line. D181 made the audit produce findings async; D182 makes brief execution async. Different parts of the same shift.
- **Lesson #32** — Pre-flight every directly-touched table. Reinforced in Cowork briefs (the answer-key should include "use Supabase MCP to verify schema before writing SQL").
- **Lesson #36** — Migration names are permanent. Brief idempotency check `migration_file_absent` directly applies this lesson.
- **Lesson #38** — Count-delta verification beats time-window. GitHub Actions validation must follow this for any verification step.
- **Lesson #39** — JSONB shape verification samples across rows. If a future brief touches JSONB, the answer-key includes this rule.

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
| D151 — Table purpose backlog sweep (22 rows) | ✅ SUPERSEDED — closed via F-2026-04-28-D-001 (registry now 100%) | — |
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
| **D170 — MCP-applied migrations pattern** | ✅ LOCKED through Phase A+B7-9 + concrete-pipeline track; applies for all 19 stages | — |
| **D171 — Pre-flight schema verification per stage** | ✅ LOCKED; sharpened by Lesson #32 (query every directly-touched table) | — |
| **D172 — Architectural revision authority** | ✅ LOCKED; R-A through R-E applied in Phase A | — |
| **D173 — Two-trigger chain pattern** | ✅ APPLIED Stage 3 | — |
| **D174 — Invegent thin-pool operational signal** | ✅ Observed; informs Phase E priority | Phase E content work |
| **D175 — Versioned reference table pattern** | ✅ APPLIED Stage 2.009 | Apply to future lookup tables referencing versioned sources |
| **D176 — State-change rollback discipline** | ✅ APPLIED Stage 5 | Build-stage pattern |
| **D177 — fitness_score_max scale 0..100** | ✅ APPLIED Stage 7.032 | Apply at every fitness consumer |
| **D178 — ai_job.slot_id FK = ON DELETE CASCADE** | ✅ APPLIED Stage 9.039 | — |
| **D179 — Stage 10/11 ordering: Option B** | ✅ LOCKED for Stage 10 brief | Stage 10 next session |
| **D180 — Discovery decides assignment, intelligence decides retention** | ✅ APPLIED via migration 006 trigger; backfill ran for 8 CFW seeds | Apply to any future discovery channel (YouTube channel discovery, email-newsletter discovery, etc.) |
| **D181 — Audit loop as three-layer architecture** | ✅ BUILT — first cycle complete same day; slice 1 prevention live | Apply to future audit roles (Security, Operations, Financial, Compliance) when added |
| **D182 — Non-blocking execution model (five-rule system)** | ✅ LOCKED — v1 spec committed at `docs/runtime/automation_v1_spec.md`; Phase 1+2 done; Phase 3-5 sequenced for next sessions; sunset review 12 May 2026 | — |
| **Slot-driven Phase A** | ✅ COMPLETE 26 Apr morning | — |
| **Slot-driven Phase B Stages 7-9** | ✅ COMPLETE 26 Apr afternoon–evening | — |
| **Slot-driven Phase B Stages 10-12** | ✅ COMPLETE 27 Apr | — |
| **Gate B observation** | 🔄 IN PROGRESS — Day 1 healthy. Earliest exit Sat 2 May | 5-7 days post-Stage 12 |
| **Concrete-pipeline track** | 🔄 IN PROGRESS — Discovery Stage 1.1 ✅, Publisher Stage 2.1 ✅, Brief A ✅, Brief 2 ✅. Stages 1.2-1.5 + 2.2-2.5 pending | Parallel to Gate B |
| **F-002 closure** | ✅ CLOSED-ACTION-TAKEN — P1 + P2 + P3 all applied 28 Apr same day. c+f coverage 0% → 20.2% (136/674). 6 LOW rows + 7 ARRAY columns deferred to followups. | — |
| **Phase D ARRAY mop-up (first test for D182 system)** | 🔲 Next session | First brief in v1 frontmatter format |
| **6 LOW-row joint resolution session** | 🔲 Backlog | PK + chat session, ~30 min |
| **Audit loop slice 2 (snapshot automation)** | 🔲 Deferred | Format stable for 5+ cycles |
| **Audit loop slice 3 (API auditor pass via Cowork+OpenAI)** | 🔲 Deferred | Slice 2 first |
| **Slot-driven Phase C — Cutover (Stages 12-18)** | 🔲 After Gate B exit | Gate B exit |
| **Slot-driven Phase D Stage 19 decommission R6** | 🔲 After Phase C | All client-platforms cut over |
| **Slot-driven Phase E — Evergreen seeding** | 🔲 Parallel | Prioritise Invegent verticals per D174 |
| **Overload B of `create_feed_source_rss` cleanup** | 🔲 Backlog | Drop or fix in follow-up; latent NOT NULL bug uncovered by D180 work |
| **Feeds-tab URL clickability follow-up** | ✅ SHIPPED 28 Apr afternoon (Brief 2) | — |
| Inbox anomaly monitor | 🔲 Post-sprint | Separate brief TBW |
| Phase 2.1 — Insights-worker | 🔲 Next major build | Meta Standard Access |
| Phase 2.6 — Proof dashboard | 🔲 After Phase 2.1 | Engagement data |
| Solicitor engagement | 🔲 Parked per D147 + D156 refinement | First pilot revenue OR second pilot signed |
| Meta App Review | ⏳ In Review | Contact dev support if stuck after 27 Apr |
| CFW + Invegent content prompts | 🔲 A11b pre-sales | PK prompt-writing session Fri 24 Apr |
| TBC subscription costs | 🔲 A6 pre-sales | PK said 28 Apr morning: deferred until product evaluation + outside conversations complete |
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
| **Branch sweep — invegent-content-engine + invegent-dashboard + invegent-portal (12 stale branches)** | 🔲 Next session | content-engine 5, dashboard 6, portal 1; cleanup with `git push origin --delete` |
| **Phase B filename hygiene** | 🔲 Next session | Rename `supabase/migrations/20260428163000_audit_f002_p2_column_purposes_corrected.sql` to match DB version `20260428064115` per Lesson #36 |
