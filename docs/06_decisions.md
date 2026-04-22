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

## D164 — Bundler Per-Client Canonical Dedup Window: 7 Days, Hardcoded
**Date:** 22 April 2026 morning | **Status:** ✅ IMPLEMENTED (migration `20260422_m8_populate_digest_items_v1_dedup_per_client_7d`, M8 PR `ffc767d`)

### The problem this decides

The M8 fix to `m.populate_digest_items_v1` adds a `NOT EXISTS` guard preventing the same `canonical_id` from being re-bundled for the same client within a time window. The window length is the load-bearing parameter — too short and the bundler keeps multiplying drafts (the failure mode that produced 18 visually identical Instagram posts on NDIS Yarns); too long and legitimately recurring news stories get suppressed when they shouldn't.

### The decision

**Window: 7 days. Hardcoded in the SQL function. Same value for every client.**

### Backing — why 7 days, why hardcoded for now

**The candidate windows weighed:**

| Window | What this means in practice | Verdict |
|---|---|---|
| **24 hours** | Same canonical can be re-bundled into a fresh digest_item every day. Hourly cron firings would still produce ~24 digest_items per canonical per day until the canonical drops out of the freshness window. | ❌ Reproduces the IG bloat at lower magnitude. Doesn't actually solve the multiplication. |
| **3 days** | Cuts most of the bloat. Allows a real story re-coverage at day 4. Mid-week-news → end-of-week recap pattern works. | ⚠️ Defensible alternative. Slightly tighter than NDIS news cycle observation suggests is needed. |
| **7 days** | One canonical → one digest_item per client per week. Aligns with the actual NDIS news cadence (most stories have a weekly attention cycle: Mon/Tue announcement → Wed/Thu analysis → Fri/Sat reaction). | ✅ Chosen. |
| **14 days** | Aligns with longer NDIS reform cycles (consultation announcement → submission window → response). | ⚠️ Acceptable but suppresses the "follow-up post a week later" pattern that PK uses for engagement. |
| **30 days** | A real story like an NDIS pricing announcement at week 1, then a peak-body response at week 3, would be deduped out. Bad for the product — peak-body responses are some of the most engageable content. | ❌ Over-suppresses. |

7 days is the sweet spot **for NDIS-vertical news cadence specifically**. It works for property too based on observation but is not specifically tuned to it.

**Why hardcoded (not configurable per client) for now:**

1. **All four current clients are in NDIS or Australian property verticals** with similar news cadences. There is no observable demand right now for per-client tuning.
2. **The configurable version is more code, not less.** A `c.client_digest_policy.canonical_dedup_window_days` column needs the column added, the function signature changed, the seeder/policy resolver updated, and a default behaviour for unset values. That's worth building when there's a use case, not as speculative flexibility.
3. **The 7-day choice is provably better than the status quo (no dedup at all).** Any reasonable value is a strict improvement. Starting hardcoded gets the structural protection in place fast; tunability can follow when a client's pattern actually conflicts with the default.
4. **Changing a hardcoded value later is cheap.** It's a one-line migration. Treating this as "fixed forever" would be wrong, but treating it as "fixed until evidence demands otherwise" is correct discipline.

### When to revisit

Revisit if **any** of these signals appear:

- A client's vertical demonstrably has a different news cadence (e.g. weekly aged-care policy bulletins vs daily property pricing data) and content is being suppressed inappropriately.
- A client requests posts on the same canonical at sub-7-day intervals (e.g. a daily news briefing service) and the suppression actively prevents the product they're paying for.
- Two or more clients want different windows and the simplest fix becomes adding the column.
- A regression query (below) shows the dedup is suppressing content that the operator manually wants to see published.

### Future enhancement — per-client tunability spec

When the trigger fires, the work to make the window per-client:

1. Add `c.client_digest_policy.canonical_dedup_window_days INT NOT NULL DEFAULT 7` (one migration).
2. Update `m.populate_digest_items_v1` to read the value from the policy row (already loaded in the function) and use `INTERVAL '%s days' % v_dedup_window_days` instead of the hardcoded `INTERVAL '7 days'`.
3. Surface the value in the dashboard Digest Policy tab so operator can see + edit per client.
4. No data migration needed — the DEFAULT 7 preserves current behaviour for every existing client.

Estimated work: 30-45 min when the trigger fires. Tracked in Decisions Pending below.

### Regression — re-runnable query for weekly check

Documented in the M8 PR body. Re-quoted here for the decision-log record (re-runnable weekly to confirm dedup is holding):

```sql
SELECT
  dr.client_id,
  di.canonical_id,
  COUNT(*) AS digest_item_count,
  COUNT(DISTINCT di.digest_run_id) AS distinct_runs,
  MIN(di.created_at) AS first_seen,
  MAX(di.created_at) AS last_seen
FROM m.digest_item di
JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
WHERE di.created_at > NOW() - INTERVAL '7 days'
GROUP BY dr.client_id, di.canonical_id
HAVING COUNT(*) > 1
ORDER BY digest_item_count DESC;
```

For runs created strictly AFTER the M8 deploy timestamp (variant for verifying the fix specifically):

```sql
SELECT dr.client_id, di.canonical_id, COUNT(*) AS cnt
FROM m.digest_item di
JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
WHERE di.created_at > '2026-04-22 00:00 UTC'   -- M8 merge timestamp
GROUP BY dr.client_id, di.canonical_id
HAVING COUNT(*) > 1;
-- Expected: zero rows.
```

PK to re-run on 23 Apr (24h post-deploy gate 4) and weekly thereafter.

### What this does NOT decide

- Does not address content-similarity dedup (two distinct canonicals with near-identical content). That's an embedding / classification problem for a future sprint, not a structural dedup problem.
- Does not address the FB-vs-IG publish disparity flagged during M8 diagnosis (FB got 0 of those drafts, IG got 18). Separate item.
- Does not address the existing bloat in the digest queue from before the fix — natural age-out within 7 days.

### Related decisions

- **D135** — pipeline block 14-17 Apr (the historical context that created the 1-hour publish burst on 17 Apr that produced the visible IG duplicates).
- **D142** — demand-aware seeder (caps drafts/week per client; correctly capped count, but couldn't prevent duplicate content from filling the cap — exactly the failure D164 fixes upstream).
- **M8 PR** — `ffc767d` — the implementation.

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
| D164 — Per-client canonical dedup window column | 🔲 When trigger fires | Vertical/cadence mismatch OR client request OR operator-suppression complaint |
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
| **Discovery pipeline ingest bug fix** | 🔲 Sprint item (Q2) | During sprint |
| **13 failed ai_jobs cleanup SQL** | ✅ Closed 21 Apr evening — see D163 | — |
| **A7 privacy policy update** | ✅ Closed 22 Apr morning — invegent.com/privacy-policy live + canonical | — |
| **External reviewer resume** | 🔲 Paused per D162 | ~18-19 of 28 Section A items closed |
| **Per-commit reviewer iteration bug** | 🔲 Before reviewer resume | Add filter for per_commit_enabled or explicit reviewer_key IN list |
| **Phase 1.7 DLQ continuation — `m.post_publish_queue` CHECK** | 🔲 Backlog per D163 | Dedicated Phase 1.7 full-sprint session |
| **TPM saturation on concurrent rewrites** | 🔲 Brief parked per D163 | Pipeline resumes from drain + fresh digest fires through rewrite |
| **M8 Gate 4 — 24h regression check** | 🔲 23 Apr | Re-run regression query against runs > M8 merge timestamp |
| **Bundler dedup weekly regression check** | 🔲 Ongoing | Weekly Mon — query in D164 |
| **FB-vs-IG publish disparity** | 🔲 Sprint item TBD | Surfaced during M8 diagnosis — why FB got 0 drafts when IG got 18 |
| **`instagram-publisher` exec_sql + raw interpolation** | 🔲 Sprint item TBD | Last known exec_sql + interpolation site after M9 |
| **PP Schedule Facebook 6/5 over-tier-limit** | 🔲 Sprint item TBD | Surfaced in M5 verification — investigate save-side validation |
