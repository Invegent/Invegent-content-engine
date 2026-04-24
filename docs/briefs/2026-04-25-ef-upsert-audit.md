# Edge Function `.upsert()` / `onConflict:` Audit

**Session:** 25 April 2026 (CC-TASK-02 via Claude Code).
**Status:** Audit complete. **No remediation applied** (audit-only per brief). 1 HIGH-severity dormant bug surfaced — fix is a separate sprint item.
**Parent context:** L6 / A21 — Trigger ON CONFLICT audit (24 April 2026, brief at `docs/briefs/2026-04-24-a21-on-conflict-audit.md`). That audit closed the DB-layer (SQL `ON CONFLICT`); this audit closes the application-layer (`supabase.from(...).upsert(...)`). Same bug class, different surface.

## Why this audit existed

The A21 audit found 1 real dormant bug among 25 DB-layer `ON CONFLICT` clauses: orphaned v1 seed functions (`m.seed_ndis_bundles_to_ai_v1` + `m.seed_property_bundles_to_ai_v1`) referenced `ON CONFLICT ON CONSTRAINT post_seed_uniq_run_item` when the actual constraint name is `post_seed_uniq_run_item_platform`. Dormant because no callers — but the pattern (SQL pointing at a constraint name that no longer matches DB state) is real.

Most Edge Functions reach Postgres via `supabase.from(table).upsert(data, { onConflict: 'col1,col2' })` rather than raw SQL. **Same bug class is possible** at this layer: if the `onConflict` column list doesn't match a unique constraint or partial unique index (with proper predicate handling), Supabase returns a runtime error.

A21 explicitly scoped this layer as a separate MEDIUM-priority follow-up. CC-TASK-02 closes that follow-up.

## Methodology

### Layer scope

| Layer | Coverage | Method |
|---|---|---|
| 1 — SQL functions | 21 functions, 25 `ON CONFLICT` clauses | A21 (24 Apr) |
| 2 — Direct cron commands | 1 cron, 1 clause | A21 (24 Apr) |
| 3 — **Edge Function `.upsert()` calls** | **2 call sites** | **This audit** |

### Discovery

```bash
# Initial strict pattern
grep -rn --include='*.ts' '\.upsert(' supabase/functions/

# Expanded (case-insensitive, all "upsert" hits)
grep -rn --include='*.ts' -i 'upsert' supabase/functions/
```

26 total occurrences across 6 files. Filtered to actual JS-client `.upsert(` calls: **2 sites.**

The other 24 occurrences are:
- **Storage API** — `.upload(path, bytes, { upsert: true })` × 4 (brand-scanner, heygen-worker, image-worker — different concern, not constraint-bound)
- **RPC dispatches** — `.rpc('content_fetch_upsert_body', ...)` × 7 in content_fetch, `.rpc('upsert_carousel_slide', ...)` × 3 in image-worker — already covered by A21 at the SQL side
- **Variable / error-message names** — `upsertErr`, `upsert_failed:` strings × 10

### Cross-reference

For each (schema, table, onConflict-cols) triple, queried via Supabase MCP (project_id `mbkmaxqhsohbtwsqolns`):

```sql
-- Unique constraints
SELECT conname, contype, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE con.contype IN ('p','u') AND n.nspname = '<schema>' AND c.relname = '<table>';

-- Unique indexes (including PARTIAL, which back ON CONFLICT only with predicate echo)
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = '<schema>' AND tablename = '<table>'
  AND indexdef ILIKE '%UNIQUE%';
```

For Site 1, the result was inconclusive on documentation alone (partial unique index existed but ON CONFLICT inference rules around partial indexes are subtle). **Verified via live `EXPLAIN` against the actual table** — no rows inserted, planner-only invocation.

## Summary

| Severity | Count | Notes |
|---|---|---|
| 🔴 HIGH | **1** | Same dormant-bug class as A21 Finding 1 — current empty table makes the bug invisible; first real recommendation triggers runtime error |
| 🟡 MEDIUM | 0 | — |
| 🟢 LOW | 1 | Correct match against full unique constraint |

**Hit rate vs A21:** A21 found 1 real bug in 25 DB clauses (4%). This audit found 1 real bug in 2 EF clauses (50%). Surface size very different; absolute count nearly identical.

## Full audit matrix

| # | File:Line | Schema.Table | onConflict cols | Constraint match? | Severity |
|---|---|---|---|---|---|
| 1 | `supabase/functions/feed-intelligence/index.ts:106-127` | `m.agent_recommendations` | `source_id, recommendation_type` | 🔴 **NO** — only PK exists; matching cols backed by partial unique index `uq_agent_rec_pending` whose predicate (`WHERE status = 'pending'`) is NOT echoed in the `.upsert()` call | **HIGH** |
| 2 | `supabase/functions/insights-worker/index.ts:221-247` | `m.post_performance` | `platform_post_id, insights_period` | ✅ Matches full unique constraint `post_performance_platform_post_id_insights_period_key` exactly | LOW |

---

## Finding 1 — `feed-intelligence` upsert into `m.agent_recommendations` 🔴 HIGH

### Current code

`supabase/functions/feed-intelligence/index.ts:106-127`:

```ts
const { error: upsertErr } = await supabase
  .schema("m")
  .from("agent_recommendations")
  .upsert(
    {
      agent: "feed-intelligence",
      source_id: source.source_id,
      recommendation_type: recType,
      reason,
      stats: { /* ... */ },
      status: "pending",
    },
    { onConflict: "source_id,recommendation_type", ignoreDuplicates: false }
  );
```

### Constraint state on `m.agent_recommendations`

| Object | Type | Definition |
|---|---|---|
| `agent_recommendations_pkey` | PRIMARY KEY | `(recommendation_id)` |
| `uq_agent_rec_pending` | **PARTIAL UNIQUE INDEX** | `(source_id, recommendation_type) WHERE (status = 'pending')` |

There is **no full (non-partial) unique constraint or index on `(source_id, recommendation_type)`**. The only object with those columns is the partial index.

### The bug — partial-unique-index inference rule

PostgreSQL's `INSERT ... ON CONFLICT (col_list) DO ...` performs *index inference* to choose an arbiter. From [Postgres docs](https://www.postgresql.org/docs/current/sql-insert.html):

> If a partial unique index is required for inference, the predicate of the partial unique index must be specified by repeating it in the index_predicate clause; otherwise the inference will fail.

Supabase's JS-client `.upsert(data, { onConflict: 'cols' })` emits `ON CONFLICT (cols)` only — it does **not** expose a way to repeat the partial index's `WHERE` predicate. So the planner cannot infer `uq_agent_rec_pending`.

### Verified live

Test 1 — exactly what the EF emits at runtime:

```sql
EXPLAIN INSERT INTO m.agent_recommendations (recommendation_id, agent, source_id, recommendation_type, status)
VALUES (gen_random_uuid(), 'test', '00000000-0000-0000-0000-000000000000', 'watch', 'pending')
ON CONFLICT (source_id, recommendation_type) DO NOTHING;
```

Result:

```
ERROR:  42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

Test 2 — same INSERT but with the partial-index predicate echoed:

```sql
EXPLAIN INSERT INTO m.agent_recommendations (recommendation_id, agent, source_id, recommendation_type, status)
VALUES (gen_random_uuid(), 'test', '00000000-0000-0000-0000-000000000000', 'watch', 'pending')
ON CONFLICT (source_id, recommendation_type) WHERE status = 'pending' DO NOTHING;
```

Result:

```
QUERY PLAN
Insert on agent_recommendations
  Conflict Resolution: NOTHING
  Conflict Arbiter Indexes: uq_agent_rec_pending
  ->  Result
```

Test 1 confirms the bug. Test 2 confirms the partial index IS the right arbiter when its predicate is echoed.

### Why dormant today

`SELECT COUNT(*) FROM m.agent_recommendations` returns **0 rows**. Verified: zero historical writes ever, zero pending. The EF cron `feed-intelligence-weekly` (jobid 57) most recently ran 2026-04-19 02:00 UTC with `status='succeeded'` — but pg_cron `succeeded` measures `net.http_post` scheduling, not the EF's actual outcome (same lesson as ID004; D168 Layer 2 sentinel still pending). The `.upsert()` is reached only when a feed source actually meets one of three conditions in the surrounding code: `deprecate` (high give-up rate), `review` (zero successes despite ingest), or `watch` (elevated give-up rate). All current 60 active feeds appear to fall through to `summary.healthy++; continue;` (line 102), so the upsert path is never exercised.

### Why a real bug, not a benign curiosity

The first time a source crosses any of the three thresholds, the EF will hit the `42P10` error and:

```ts
if (upsertErr && !upsertErr.message.includes("duplicate")) {
  summary.errors.push(`${source.source_name}: upsert_failed: ${upsertErr.message}`);
  continue;
}
```

The error string `"there is no unique or exclusion constraint..."` does NOT contain `"duplicate"`, so the EF logs the error to its summary array and continues — the recommendation row is silently lost. Same pattern as M11 / A21 Finding 1: the failure is reported (error string in the EF response body) but no observer is reading it. Cron status will keep showing `succeeded` because the EF returns 200 even when individual recommendations fail.

This is exactly the failure class L1 cron monitoring (shipped 24 Apr) does NOT catch and L2 sentinel (D168, scope-defined, deferred) is intended to catch. Recommendation: **do not wait for L2 to ship; fix the upsert directly.**

### Recommended fix (NOT applied — separate sprint item)

Two equivalent options:

**Option A (preferred) — explicit unique constraint**

Add a non-partial UNIQUE constraint on `(source_id, recommendation_type)`. Requires deciding whether duplicate (source, type) rows in non-pending statuses are acceptable. If yes, this option doesn't apply. If no:

```sql
ALTER TABLE m.agent_recommendations
  ADD CONSTRAINT agent_recommendations_source_type_unique
  UNIQUE (source_id, recommendation_type);

DROP INDEX m.uq_agent_rec_pending;
```

Cleanest from an inference perspective. Lets the EF's existing `.upsert({onConflict:'source_id,recommendation_type'})` "just work."

**Option B — bypass `.upsert()`, use a SECURITY DEFINER RPC**

Build `m.upsert_agent_recommendation_pending(...)` that wraps the SQL with the proper `WHERE status = 'pending'` clause server-side. EF calls `.rpc(...)` instead of `.upsert(...)`. Preserves the partial-index design choice (which suggests deliberate "only one pending recommendation per source per type" semantics).

Either fix verifies under the same EXPLAIN test above.

### Severity rationale

- **Dormant today** (zero rows = zero impact today)
- **Will fire on first real recommendation** (any source crossing threshold)
- **Fails silently** (error logged in EF summary array, not surfaced to cron status, not currently caught by L1 monitoring)
- **Fits the M11 / ID004 / A21 Finding 1 family** of "Postgres knows but no one is looking"

→ HIGH per the brief's classification table (`onConflict columns don't match ANY unique constraint or partial unique index` — partial index does not count as matching when predicate isn't echoed).

---

## Finding 2 — `insights-worker` upsert into `m.post_performance` 🟢 LOW

### Current code

`supabase/functions/insights-worker/index.ts:221-247`:

```ts
const { error: upsertErr } = await supabase
  .schema("m")
  .from("post_performance")
  .upsert(
    {
      post_publish_id: post.post_publish_id,
      client_id: post.client_id,
      platform: "facebook",
      platform_post_id: post.platform_post_id,
      reach: metrics.reach,
      /* ... */
      collected_at: nowIso(),
      insights_period: INSIGHTS_PERIOD,
      raw_payload: { /* ... */ },
    },
    { onConflict: "platform_post_id,insights_period" }
  );
```

### Constraint state on `m.post_performance`

| Object | Type | Definition |
|---|---|---|
| `post_performance_pkey` | PRIMARY KEY | `(performance_id)` |
| `post_performance_platform_post_id_insights_period_key` | **UNIQUE** | `(platform_post_id, insights_period)` |

### Match

Exact column-set match against a full (non-partial) unique constraint. Constraint inference works without further input. Upsert is correct.

### No action required

Listed for completeness of the audit matrix. No follow-up.

---

## Things that are NOT bugs but worth noting

### 1. Storage API `upload({upsert: true})` calls

`brand-scanner`, `heygen-worker`, `image-worker` use `supabase.storage.from(bucket).upload(path, bytes, { upsert: true })`. This is Supabase Storage's "overwrite if path exists" flag, not the SQL ON CONFLICT mechanism. Different system, no constraint inference involved. Out of scope for this audit class.

### 2. RPC dispatches

`content_fetch/index.ts` defines a local helper `upsertBody(...)` that wraps `.rpc('content_fetch_upsert_body', ...)`. `image-worker` calls `.rpc('upsert_carousel_slide', ...)` three times. The SQL inside both RPCs was already audited under A21 (`public.content_fetch_upsert_body` and `public.upsert_carousel_slide` both appear in A21's matrix as ✅ correctly matching their unique constraints). Calling them via `.rpc(...)` shifts the constraint matching to the SQL function body — which A21 already verified.

### 3. The `ignoreDuplicates: false` flag

In Supabase JS, `ignoreDuplicates: false` (Site 1) means "DO UPDATE on conflict" rather than "DO NOTHING." Site 2 omits the flag (default `false`, also DO UPDATE). Neither setting affects the index-inference question. Both sites would behave identically with `ignoreDuplicates: true` — the `42P10` error fires at planning, before duplicate handling enters the picture.

---

## Methodology notes — for next audit

### What worked

- **Quick discovery via grep + filter pass.** The initial strict regex `\.upsert\(` returned only 2 hits, which seemed implausibly low against the brief's "expected 15-40." Re-running with case-insensitive `upsert` returned 26 occurrences, then filtering by hand surfaced the truth: most "upsert" mentions are Storage API, RPC dispatch, or variable naming.
- **EXPLAIN as ground-truth check.** Documentation said partial-index inference requires predicate echo, but I wanted live evidence. EXPLAIN INSERT (no actual write) compiles and plans the statement; if inference fails, you get the error at planning time. Cleaner than reading docs alone.
- **Cross-reference with both `pg_constraint` AND `pg_indexes`.** Constraints don't include partial indexes (they're indexes-only, not constraint-backed). Without checking `pg_indexes`, I'd have classified Site 1 as "no matching unique anything" and missed the partial index entirely — leading to a worse fix recommendation.

### What might bite next time

- **Brief expectations vs codebase reality.** The brief expected 15-40 sites; reality was 2. Estimation was based on "40+ Edge Functions with typical write patterns" but in this codebase most writes go through SECURITY DEFINER RPCs (D156-era discipline), so direct `.upsert(...)` is rare. Future audit briefs in this codebase should anchor expectations against the actual write-pattern distribution, not generic Supabase apps.
- **`ignoreDuplicates: false` is misleading.** In English, it sounds like "don't ignore duplicates → bubble the error up." In Supabase JS it actually means "DO UPDATE." Easy to misread; worth a comment in code or a wrapper helper.
- **Partial unique indexes are a hidden trap.** They look correct in `pg_indexes` ("yes, there's a unique index on those columns") but ON CONFLICT inference treats them as second-class without the predicate echo. Any future audit of upsert-style code should explicitly check for `WHERE` clauses on indexes that match the inference column list.

## Sprint board impact

- **CC-TASK-02 — EF `.upsert()` audit** — **CLOSED 25 Apr** (this brief).
- **New backlog item: Fix `feed-intelligence` upsert to `m.agent_recommendations`** — HIGH priority. Recommended approach: Option A (add full UNIQUE constraint, drop partial index) UNLESS the partial-index design is deliberately preserving "only one pending per source-type" semantics, in which case Option B (RPC wrapper). PK to decide.
- **No further EF .upsert() audit needed** in this codebase — only 2 sites, both now classified.

## Related

- **A21** — `docs/briefs/2026-04-24-a21-on-conflict-audit.md` — DB-layer parent
- **M11** — commit `583cf17`, content-engine PR #2 — original incident (8-day silent enqueue cron failure from same constraint-mismatch class)
- **ID004** — `docs/incidents/2026-04-23-content-fetch-casing-drift.md` — different mechanism (vault casing) but same observability gap (pg_cron `succeeded` masking real failure)
- **D168** — `docs/06_decisions.md` and `docs/briefs/2026-04-24-d168-layer-2-response-sentinel-spec.md` — Layer 2 sentinel that would catch this class of EF-side silent failure when shipped
- **Cron health Layer 1** — `docs/briefs/2026-04-24-cron-health-monitoring-layer-1.md` — Layer 1 (DB `cron.job_run_details.status='failed'`) does NOT catch this case because the EF returns 200 even when its internal upsert fails

## Verification queries (for any future re-check)

```sql
-- Does Site 1 still have the issue? (re-check after fix)
EXPLAIN INSERT INTO m.agent_recommendations (recommendation_id, agent, source_id, recommendation_type, status)
VALUES (gen_random_uuid(), 'verify', '00000000-0000-0000-0000-000000000000', 'watch', 'pending')
ON CONFLICT (source_id, recommendation_type) DO NOTHING;
-- Currently: ERROR 42P10
-- Post-fix (Option A): plan with Conflict Arbiter Indexes pointing at the new full unique constraint

-- Does Site 2 still match? (re-check after any constraint changes)
EXPLAIN INSERT INTO m.post_performance (performance_id, post_publish_id, client_id, platform, platform_post_id, insights_period)
VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'facebook', 'test_pid', 'lifetime')
ON CONFLICT (platform_post_id, insights_period) DO NOTHING;
-- Currently: plan with Conflict Arbiter Indexes pointing at post_performance_platform_post_id_insights_period_key

-- Re-discover all .upsert() sites (in case codebase changes)
SELECT 'grep -rn --include=*.ts -i upsert supabase/functions/' AS shell_command;
-- Filter results to actual JS-client `.upsert(` calls (drop Storage API .upload({upsert:true}) and .rpc('upsert_X') calls)
```
