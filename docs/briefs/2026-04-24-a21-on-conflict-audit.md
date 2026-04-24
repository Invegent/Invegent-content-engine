# A21 — Trigger ON CONFLICT Audit

**Session:** 24 Apr 2026 afternoon (after cron-health Layer 1 ship + token-expiry fix).
**Status:** **Audit complete at DB layer. Remediation applied in same session.**
**Parent context:** M11 incident (14–22 Apr 2026) — `enqueue-publish-queue-every-5m` cron had `ON CONFLICT (post_draft_id)` but the actual unique index was `(post_draft_id, platform)`. Postgres raised the error on every invocation. 2,258 silent failures over 8 days.
**Board item:** A21 — Trigger ON CONFLICT audit (closed this session).

## Why this audit existed

M11 was one instance of a general class: `ON CONFLICT` target not matching any unique constraint on the target table. The M11 bug was found by accident — a human noticed IG publisher behaviour was off and traced backwards. An M11-class bug elsewhere would be equally silent. Goal of the audit: sweep all `ON CONFLICT` usage, cross-reference each against actual unique indexes/constraints, find sister bugs before they cause incidents.

## Methodology

Three layers to audit. This audit covered layers 1–2 at the DB level; layer 3 (Edge Function application code) is deferred.

| Layer | Coverage | Method |
|---|---|---|
| 1 — SQL functions | 21 functions with `ON CONFLICT` (25 clauses total) | `pg_proc.prosrc ILIKE '%on conflict%'` |
| 2 — Direct cron commands | 1 cron (`enqueue-publish-queue-every-5m`, jobid 48) | `cron.job.command ILIKE '%on conflict%'` |
| 3 — Edge Function `.upsert()` / `onConflict:` | **NOT YET AUDITED** | Repo search required |

For each clause: extract target table + ON CONFLICT target spec, cross-reference against `pg_index` (unique indexes) + `pg_constraint` (unique/primary key/named constraints), flag mismatches.

## Full audit matrix — all 25 ON CONFLICT clauses

### `f` schema — 1 clause

| Function | Target table | ON CONFLICT target | Matching constraint? |
|---|---|---|---|
| `f.trg_seed_canonical_body` | `f.canonical_content_body` | `(canonical_id)` | ✅ PK `canonical_content_body_pkey` |

### `k` schema — 2 clauses

| Function | Target table | ON CONFLICT target | Matching constraint? |
|---|---|---|---|
| `k.refresh_column_registry` | `k.column_registry` | `(table_id, column_name)` | ✅ `uq_table_column` |
| `k.refresh_table_registry` | `k.table_registry` | `(schema_name, table_name)` | ✅ `uq_schema_table` |

### `m` schema — 10 clauses

| Function | Target table | ON CONFLICT target | Matching constraint? |
|---|---|---|---|
| `m.enqueue_publish_from_ai_job_v1` | `m.post_publish_queue` | `(post_draft_id, platform)` | ✅ `uq_post_publish_queue_post_draft_platform` (D155 fix post-M11) |
| `m.populate_digest_items_v1` | `m.digest_item` | `(digest_run_id, canonical_id)` | ✅ `uq_digest_run_canonical` |
| `m.refresh_cron_health` (snapshot UPSERT) | `m.cron_health_snapshot` | `(jobid, window_hours)` | ✅ `cron_health_snapshot_jobid_window_hours_key` |
| `m.refresh_cron_health` (3× alert UPSERT) | `m.cron_health_alert` | `(jobid, alert_type) WHERE resolved_at IS NULL` | ✅ `idx_cron_health_alert_active_unique` (partial) |
| `m.seed_client_to_ai_v2` | `m.post_seed` | `ON CONSTRAINT post_seed_uniq_run_item_platform` | ✅ constraint exists |
| **`m.seed_ndis_bundles_to_ai_v1`** | **`m.post_seed`** | **`ON CONSTRAINT post_seed_uniq_run_item`** | **🔴 BUG — constraint does not exist (see Finding 1)** |
| **`m.seed_property_bundles_to_ai_v1`** | **`m.post_seed`** | **`ON CONSTRAINT post_seed_uniq_run_item`** | **🔴 BUG — constraint does not exist (see Finding 1)** |

### `public` schema — 12 clauses across 11 functions

| Function | Target table | ON CONFLICT target | Matching constraint? |
|---|---|---|---|
| `public.activate_client_from_submission` | `c.client_brand_profile` | `(client_id)` | ✅ `client_brand_profile_client_id_key` |
| `public.approve_onboarding` (brand scan) | `c.client_brand_profile` | `(client_id)` | ✅ same as above |
| `public.approve_onboarding` (AI profile) | `c.client_ai_profile` | `(client_id)` | ✅ `client_ai_profile_client_id_unique` |
| `public.content_fetch_upsert_body` | `f.canonical_content_body` | `(canonical_id)` | ✅ PK |
| `public.feed_assign_client` | `c.client_source` | `(client_id, source_id)` | ✅ PK |
| `public.recalculate_topic_weights` | `m.topic_score_weight` | `(client_id, topic_label)` | ✅ `topic_score_weight_client_id_topic_label_key` |
| `public.refresh_post_format_performance` | `m.post_format_performance` | `(client_id, ice_format_key, rolling_window_days)` | ✅ `uq_format_perf_client_format_window` (+ 2 duplicates — see Finding 3) |
| `public.store_platform_token` | `c.client_publish_profile` | `(client_id, platform)` | ✅ `client_publish_profile_client_platform_unique` |
| `public.upsert_carousel_slide` | `m.post_carousel_slide` | `(post_draft_id, slide_index)` | ✅ `post_carousel_slide_post_draft_id_slide_index_key` |
| `public.upsert_client_digest_policy` | `c.client_digest_policy` | `(client_id)` | ✅ PK |
| `public.upsert_format_performance` | `m.post_format_performance` | same as `refresh_post_format_performance` above | ✅ |
| `public.upsert_publish_profile` | `c.client_publish_profile` | same as `store_platform_token` above | ✅ |
| `public.write_visual_spec` | `m.post_visual_spec` | `(post_draft_id, ice_format_key)` | ✅ `post_visual_spec_post_draft_id_ice_format_key_key` |

### Direct cron commands — 1

| Cron jobid | Jobname | Target table | ON CONFLICT target | Matching constraint? |
|---|---|---|---|---|
| 48 | `enqueue-publish-queue-every-5m` | `m.post_publish_queue` | `(post_draft_id, platform)` | ✅ (post-M11 fix) — see Finding 2 for related concern |

---

## Finding 1 — Real dormant bug 🔴 CLOSED

**Functions:** `m.seed_ndis_bundles_to_ai_v1(text, integer)` + `m.seed_property_bundles_to_ai_v1(text, integer)`

**Bug:** Both reference `ON CONFLICT ON CONSTRAINT post_seed_uniq_run_item`. The actual constraint on `m.post_seed` is named `post_seed_uniq_run_item_platform`. If either function were invoked, Postgres would immediately raise `ERROR: constraint "post_seed_uniq_run_item" does not exist`.

**Severity — DORMANT.** Exhaustive dependency search confirmed zero callers:
- Zero references in `cron.job.command` across all 46 crons
- Zero references in any other `pg_proc.prosrc` in the database
- Zero `pg_depend` entries linking to these functions from views, triggers, rules, or other DB objects

These are v1 predecessors of `m.seed_client_to_ai_v2` — the **universal** seed function that took over when ICE consolidated from per-client branches to a single robust pipeline. The v1 functions were orphaned when v2 shipped; the constraint got renamed at some point after that (likely when platform awareness was added to post_seed's unique key); the v1 functions' references became stale. Classic dead-code-rots-in-silence pattern.

**Remediation applied this session — dropped both functions.**

Migration: `a21_drop_orphaned_v1_seed_functions_correct_signatures_20260424` (after an initial `()` signature mis-match that silently no-op'd; corrected to `(text, integer)`).

**Principle confirmed with PK:** ICE is a single robust pipeline for all clients. Per-client or per-brand functions create divergence surface area and compound into silent drift. Dropping the v1s (rather than patching them to match the new constraint name) aligns the codebase with the principle.

## Finding 2 — Architectural inconsistency 🟡 FLAGGED (not a bug today)

**Cron:** `enqueue-publish-queue-every-5m` (jobid 48)

**What I noticed:** The cron has:
- `INSERT INTO m.post_publish_queue ... ON CONFLICT (post_draft_id, platform) DO NOTHING` ✅ correct after M11 fix
- But the SELECT's `NOT EXISTS` subquery filters on `(post_draft_id)` only — ignoring platform

```sql
AND NOT EXISTS (
  SELECT 1 FROM m.post_publish_queue q
  WHERE q.post_draft_id = j2.post_draft_id  -- platform NOT checked
)
```

**Why it's not a bug today:** Current data model has one draft per platform (`m.post_draft.platform` is set when the draft is created by `seed_and_enqueue_ai_jobs_v1`). So "draft already queued anywhere" ≈ "draft already queued for this platform". The NOT EXISTS filter is more restrictive than the unique constraint, but in practice nothing falls through.

**Why it's a risk tomorrow:** Under the router model (D144 onward, R6 rewrite), drafts may become platform-agnostic with routing decided downstream. At that point, the same draft could legitimately queue for FB AND LinkedIn AND IG — but the NOT EXISTS filter would block the second and third platforms silently. The unique constraint would correctly allow them; the filter would prevent them from ever being inserted.

**Recommendation:** When R6 ships (`m.seed_and_enqueue_ai_jobs_v1` rewrite), update the NOT EXISTS filter on cron 48 to include `AND q.platform = j2.platform`. Note added to the R6 backlog.

## Finding 3 — Index redundancy 🟢 CLEANED

Six tables had duplicate unique indexes or constraints on the same column sets — schema drift from multiple migrations independently adding the same guarantee. Not bugs (ON CONFLICT picks any matching unique) but redundant indexes:
- Slow writes (every INSERT/UPDATE maintains all duplicate indexes)
- Waste disk
- Confuse audits (which index is "the real" one?)
- Create risk when someone later tries to change one without realising there's a shadow copy

**Cleanup applied this session** — 4 redundant UNIQUE constraints dropped + 3 redundant pure indexes dropped:

| Schema | Table | Dropped | Kept (canonical) |
|---|---|---|---|
| `c` | `client_digest_policy` | CONSTRAINT `client_digest_policy_client_uniq` | PK `client_digest_policy_pkey` |
| `c` | `client_source` | CONSTRAINT `client_source_client_source_uniq` | PK `client_source_pkey` |
| `m` | `post_format_performance` | CONSTRAINT `post_format_performance_client_id_ice_format_key_rolling_wi_key` | CONSTRAINT `uq_format_perf_client_format_window` |
| `m` | `post_format_performance` | CONSTRAINT `post_format_performance_unique_key` | (same as above) |
| `m` | `digest_item` | INDEX `ux_m_digest_item_run_canonical` | INDEX `uq_digest_run_canonical` |
| `c` | `client_ai_profile` | INDEX `ux_client_ai_profile_default` | INDEX `ux_client_ai_profile_one_default_per_client` |
| `f` | `canonical_content_body` | INDEX `uq_canonical_content_body_canonical_id` | PK `canonical_content_body_pkey` |

Migration: `a21_drop_orphaned_v1_seed_functions_and_redundant_indexes_20260424_v2` (the v2 retry after v1 failed — v1 tried `DROP INDEX` on items that were actually backing UNIQUE constraints; v2 uses `ALTER TABLE DROP CONSTRAINT` for those).

Disk / write-performance improvement not measured. Should be noticeable on `m.post_format_performance` (went from 4 unique indexes to 2 — PK + kept UNIQUE) but the table is small enough that the practical impact is negligible. Value is in the audit clarity, not the performance.

## What was NOT audited

### Edge Function `.upsert()` calls with `onConflict:` parameter

Most Edge Functions use `supabase.from(table).upsert(data, { onConflict: 'col1,col2' })` rather than raw `ON CONFLICT` SQL. Same bug class is possible — if the `onConflict` column list doesn't match a unique constraint, Supabase will return an error at call time.

**Why deferred:** The GitHub MCP available in this session doesn't have a code-search tool. Scanning 40+ Edge Functions one-by-one would take another hour. Scoped as separate follow-up: sweep all `.upsert(` calls in the `supabase/functions/` directory, validate each `onConflict:` parameter against the target table's unique constraints.

**Priority — MEDIUM.** Similar likelihood of finding a dormant bug as the DB-layer sweep (which found 1). Not urgent because:
- Edge Functions are actively invoked; silent-outage bugs are more likely to surface than DB-layer dead code
- The cron health Layer 1 monitor now catches the class at runtime for functions invoked via cron
- Live Edge Functions throwing errors would surface in Vercel logs or Supabase logs

### App-layer direct SQL

`invegent-dashboard` and `invegent-portal` code contains mostly `.upsert()` calls via the Supabase JS client (audited as part of the Edge Function sweep above) plus `exec_sql` RPC calls (different failure mode — not applicable to this audit class). No dedicated separate sweep needed.

## Methodology notes — for next audit

Things that worked:
- Starting with `pg_proc.prosrc ILIKE '%on conflict%'` to scope — 21 functions is tractable to eyeball
- Extracting 12 lines of context around each `ON CONFLICT` line (shows the `INSERT INTO` target clearly)
- Cross-referencing against `pg_index` + `pg_constraint` separately — some items are in one but not the other

Things that bit me:
- My initial `DROP FUNCTION m.seed_ndis_bundles_to_ai_v1();` silently no-op'd because the functions take `(text, integer)` args. `IF EXISTS` masks this failure. **Always verify drops by re-querying `pg_proc` afterwards.**
- Initial `DROP INDEX` for items that were actually backing UNIQUE constraints failed cleanly (good) but required a retry migration. **Check `pg_constraint.conindid` before choosing `DROP INDEX` vs `ALTER TABLE DROP CONSTRAINT`.**
- Postgres regex POSIX engine doesn't support `{n,m}?` (lazy quantifier with upper bound). Line-based extraction via `unnest(string_to_array(definition, E'\n'))` is more reliable for SQL text analysis.

## Sprint board impact

- **A21 — Trigger ON CONFLICT audit** — **CLOSED 24 Apr afternoon** (for DB layer)
- **New backlog item:** Edge Function `.upsert()` / `onConflict:` audit (medium priority, follow-up)
- **R6 migration note:** when `m.seed_and_enqueue_ai_jobs_v1` is rewritten for router, also update cron 48's NOT EXISTS filter to include `AND q.platform = j2.platform`

## Migrations applied in this session

1. `a21_drop_orphaned_v1_seed_functions_and_redundant_indexes_20260424` — first attempt, succeeded partially (index/constraint drops applied) but silently failed on function drops due to missing arg signatures
2. `a21_drop_orphaned_v1_seed_functions_and_redundant_indexes_20260424_v2` — retry with correct `ALTER TABLE DROP CONSTRAINT` for items backing constraints (rather than `DROP INDEX` for those)
3. `a21_drop_orphaned_v1_seed_functions_correct_signatures_20260424` — drops functions with correct `(text, integer)` signatures

## Verification queries (for future audits)

```sql
-- Full ON CONFLICT inventory across all app schemas
SELECT n.nspname || '.' || p.proname, pg_get_functiondef(p.oid)
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('f','m','c','k','public','a','r','t','stg')
  AND p.prosrc ILIKE '%on conflict%';

-- Unique indexes on a specific table
SELECT i.relname AS index_name,
       CASE WHEN x.indisprimary THEN 'PK' WHEN x.indisunique THEN 'UNIQUE' END AS kind,
       pg_get_indexdef(x.indexrelid) AS def,
       pg_get_expr(x.indpred, x.indrelid) AS partial_predicate
FROM pg_index x
JOIN pg_class c ON c.oid = x.indrelid
JOIN pg_class i ON i.oid = x.indexrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'SCHEMA' AND c.relname = 'TABLE'
  AND (x.indisunique OR x.indisprimary);

-- Named UNIQUE constraints vs pure indexes distinction
SELECT con.conname, idx.relname AS backing_index
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_class idx ON idx.oid = con.conindid
WHERE con.contype IN ('u','p') AND c.relname = 'TABLE';
```
