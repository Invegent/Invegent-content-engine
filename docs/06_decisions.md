# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D100 — See earlier commits

## D101–D125 — See 16 Apr 2026 commits

## D126–D141 — See 17 Apr 2026 commits (pipeline analysis, synthesis decision, demand-aware seeding direction)

## D142–D146 — See 17 Apr 2026 evening commits (demand-aware seeder, classifier, router, benchmark, feed score — all but D142 gated on 60d data)

## D147–D151 — See 18 Apr 2026 afternoon commit (pilot structure, buyer-risk form, advisor layer, session-close SOP, table-purpose rule)

## D152–D155 — See 18 Apr 2026 evening commit (seeder client_id fix, token-health live direction, native LinkedIn flow, ON CONFLICT root-cause fix)

## D156–D162 — See 21 Apr 2026 commits (external reviewer layer shipped + paused, cost guardrails architecture, reviewer implementation details)

---

## D163 — Phase 1.7 Dead Letter Queue Foundation: `m.ai_job` Only, Scoped by Inspection
**Date:** 21 April 2026 evening | **Status:** ✅ IMPLEMENTED (migration `phase_1_7_ai_job_add_dead_status` + Q1 data cleanup applied same session)

### The problem this decides

Sprint item Q1 required updating 13 failed ai_jobs from the ID003 window to a terminal "dead" state so they stopped being flagged by `system_auditor`. The pre-approved SQL in sync_state was `UPDATE m.ai_job SET status='dead', dead_reason='id003_cleanup_2026-04-21' WHERE status='failed' AND created_at < '2026-04-15'`. On execution, two errors surfaced:

1. The `m.ai_job.status` CHECK constraint rejected `'dead'`. The allowed set was `{queued, running, succeeded, failed, cancelled}`. The pre-approved UPDATE was untested.
2. The date cutoff `< 2026-04-15` missed all the target rows — the failures were from 18 Apr within the ID003 window (15–19 Apr), not before it.

This surfaced a broader question: `docs/04_phases.md` Phase 1.7 (Dead Letter Queue) prescribes adding `status='dead'` across four pipeline tables — `m.ai_job`, `m.post_draft`, `m.post_publish_queue`, `f.canonical_content_body`. Should Q1 be handled as an isolated one-off CHECK widen, or should the full Phase 1.7 foundation sweep happen today?

### The decision

**Scope today: `m.ai_job` only.** Widen its CHECK constraint to include `'dead'`. Run the cleanup UPDATE on the 13 rows with a corrected `dead_reason`. Defer the other three tables to a dedicated Phase 1.7 sprint session, with explicit handling for each.

### What inspection found that changed the framing

Before committing to a four-table sweep, a 5-minute inspection of all four current CHECK constraints revealed that the `04_phases.md` Phase 1.7 spec doesn't match current reality uniformly:

| Table | Column | Current CHECK vocabulary | Verdict |
|---|---|---|---|
| `m.ai_job` | `status` | `queued / running / succeeded / failed / cancelled` | Widen to add `'dead'` ✅ applied |
| `m.post_draft` | `approval_status` | Already includes `'dead'` in the ANY array | **Done already — no change needed** |
| `m.post_publish_queue` | `status` | **NO CHECK constraint at all** — any string accepted. Current values in use: `published` (91 rows) / `queued` (12) / `pending` (2) / `dead` (1). One row already using `'dead'` without a constraint protecting it. | Add a NEW CHECK constraint — different work from widening an existing one; needs deliberate vocabulary design |
| `f.canonical_content_body` | `resolution_status` | `active / success / give_up_paywalled / give_up_blocked / give_up_timeout / give_up_error` | **Leave alone** — `give_up_*` IS the dead-letter semantics for this table. Adding generic `'dead'` duplicates vocabulary |

The Phase 1.7 spec was written before these actual semantics were visible. Per D161's authority hierarchy rule — trust the live DB over older doc specs when they conflict — the decision follows what the DB shows, not what the spec says.

### Why not do the full sweep today

Three reasons:

1. **`m.post_draft` is already done.** No work needed. The Phase 1.7 spec overstated the scope.
2. **`f.canonical_content_body` should NOT be changed.** Adding `'dead'` alongside the existing `give_up_*` states creates two ways to say the same thing, actively muddying pipeline semantics. Future writers would have to decide "do I mark this give_up_paywalled or dead?" — that's a worse place to land than just having one vocabulary.
3. **`m.post_publish_queue` needs a CHECK constraint designed from scratch** (currently absent), with a considered vocabulary covering current use (`queued, pending, published, dead`) plus likely-future values (`failed, cancelled`). That's a deliberate design exercise, not a quick-win bolt-on — and sprint discipline favours closing the Q1 scope and moving on rather than expanding.

### What stays open after this decision

A new backlog item (tracked in sync_state Backlog): add a CHECK constraint to `m.post_publish_queue.status` covering the full intended vocabulary. Not an A-item; prerequisite for a proper Phase 1.7 full DLQ sprint that also adds the pg_cron sweep + dashboard Failures panel + requeue action from `04_phases.md` 1.7 deliverable list.

### Real operational finding preserved (separate from this decision)

The 13 failed ai_jobs weren't ID003 timeout-loop failures as the sync_state framing implied. They were **gpt-4o TPM saturation events on 18 Apr 07:20 UTC** — a single digest burst on NDIS Yarns fired 13 concurrent `rewrite_v1` jobs (6 LinkedIn + 7 Instagram) against gpt-4o, saturating the 30k TPM ceiling within one minute. All returned `openai_http_429`. `attempts=0` on all 13 because the D157 retry-cap `attempts` column was added today, after these failures occurred.

`dead_reason` labelled accurately as `'openai_tpm_rate_limit_2026-04-18'`, not the originally-proposed `'id003_cleanup_2026-04-21'` which would have misrepresented the failure mode.

Separate brief at `docs/briefs/2026-04-21-tpm-saturation-staggered-rewrite.md` captures the concurrency design issue for pick-up when the pipeline resumes from drain — this is a latent bug that will recur on first burst.

### What this does NOT decide

- Does not resolve the TPM saturation pattern. That's design work deferred to the brief; this decision is just the DLQ scoping.
- Does not commit to a timeline for `m.post_publish_queue` CHECK. Backlog item, no trigger yet.
- Does not retroactively "fix" the pre-approved SQL process — that's a separate improvement opportunity (probably: test pre-approved SQL before approving it, or flag as untested in sync_state when it's structural DDL).

### Related decisions

- **D157** — added the `dead_reason` column to `m.ai_job` in migration `d157_id003_ai_job_retry_cap`. D163 adds `'dead'` to the status vocabulary so the column has something to pair with semantically.
- **D161** — the authority hierarchy (live DB > older doc specs) applied to resolve the `04_phases.md` spec mismatch.
- **Phase 1.7** (`docs/04_phases.md`) — partially implemented now; remaining tables tracked as future sprint work.
- **Q1 (sprint item)** — the proximate cause of this inspection. Closed in this same session.

---

## Decisions Pending

| Decision | Status | Gate |
|---|---|---|
| D143 — Signal content type classifier | 🔲 Gated | D142 stable + 60 days data |
| D144 — Signal router (platform × format) | 🔲 Gated | D143 + D140 + D145 + 60 days data |
| D145 — Benchmark table | 🔲 Research now, build with D144 | Research immediate |
| D146 — Feed pipeline score + retirement | 🔲 Gated | Phase 2.1 + 60 days data |
| D140 — Digest item scoring | 🔲 Phase 3 | After CFW stable + auto-approver healthy |
| D149 — Advisor Layer MVP (Sales Advisor Project) | 🔲 Deferred post-sprint | Same rationale as D162 |
| D151 — Table purpose backlog sweep (22 rows) | 🔲 Post-pre-sales | Batch job later |
| D153 — Token-health live /debug_token cron | 🔲 Spec this week, build after | None — high priority |
| D156 Stage 2 — Meta reconciliation | 🔲 Post-sprint | Stage 1 verified earning its keep after reactivation |
| D157 — Cost guardrails Stop 2 infrastructure | 🔲 Post-sprint | ai-worker fix verified ✅ + sprint complete |
| D157 — Raise Anthropic cap to calibrated Stop 1 | 🔲 Week of 5 May | 7 days post-fix clean data + weekly calibration |
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
| **CFW schedule save bug investigation** | 🔲 Sprint item (M2) — dispatched to Claude Code 21 Apr evening | During sprint |
| **Discovery pipeline ingest bug fix** | 🔲 Sprint item (Q2) | During sprint |
| **13 failed ai_jobs cleanup SQL** | ✅ Closed 21 Apr evening — see D163 | — |
| **A7 privacy policy update** | 🔲 Sprint item (Q4) | During sprint |
| **External reviewer resume** | 🔲 Paused per D162 | ~18-19 of 28 Section A items closed |
| **Per-commit reviewer iteration bug** | 🔲 Before reviewer resume | Add filter for per_commit_enabled or explicit reviewer_key IN list |
| **Phase 1.7 DLQ continuation — `m.post_publish_queue` CHECK** | 🔲 Backlog per D163 | Dedicated Phase 1.7 full-sprint session |
| **TPM saturation on concurrent rewrites** | 🔲 Brief parked per D163 | Pipeline resumes from drain + fresh digest fires through rewrite |
