# R5 implementation retrospective — spec-vs-live reconciliations

**Date:** 24 Apr 2026 late evening (Friday) — Session 2 of 24 Apr
**Status:** 🟢 R5 LIVE — `m.match_demand_to_canonicals()` shipped v1.3, greedy dedup working, all 4 clients verified
**Related:** `docs/briefs/2026-04-24-r5-matching-layer-spec.md` (v2 spec)

---

## Purpose

This brief captures three spec-vs-live-schema reconciliations made during R5 Step 3
implementation. Each was a point where the written spec assumed one thing and the
live database was different. Documenting these so future spec authors (including
future me) check these specific patterns during spec review, not mid-implementation.

---

## Reconciliation 1 — `m.post_format_performance` name collision

**Spec called for:** new table `m.post_format_performance` with one row per
(post_publish × measurement_window), R7 learning substrate, populated by insights-worker.

**Live DB had:** table `m.post_format_performance` already existed — 33 rows, aggregate
grain (one row per client × format × rolling_window), read by ai-worker's
`fetchFormatContext()` for format advisor prompts. Written by
`public.refresh_post_format_performance()` daily.

**Resolution (PK decision):** rename R5's new table to
`m.post_format_performance_per_publish`. Added `COMMENT ON TABLE` to the existing
aggregate documenting the two tables' distinct purposes.

**Lesson:** check `k.vw_table_summary` against every new table name in a schema spec
BEFORE the spec is finalised. Spec review should include a "does this name already
exist" grep.

---

## Reconciliation 2 — `m.digest_item.final_score` range

**Spec assumed:** `final_score` was 0-1 (probability-like). Algorithm: `quality_score =
COALESCE(di.final_score, 0.5) * 100`.

**Live DB actual:** `final_score` is 0-12 (bundler's native scoring scale — observed:
min=0, max=12, p50=9, p95=11, avg=8.8). Applying `* 100` naively gave quality scores
of 1000-1200, breaking weighted final scores entirely.

**Resolution (v1.1 function patch):** introduced `c_bundler_score_max CONSTANT 12.0`
and normalise via `LEAST(COALESCE(di.final_score, c_bundler_score_max / 2) /
c_bundler_score_max, 1.0) * 100`. LEAST clamps defensively against future bundler
tuning that might exceed 12. Constant is documented in the function body.

**Lesson:** spec review should verify the actual data range of any column the spec
does arithmetic on. A one-line MIN/MAX/AVG query per column would have caught this
before coding. Adding to spec-review checklist.

---

## Reconciliation 3 — Within-run dedup algorithm gap

**Spec § Step 4 said:** "If same canonical_id ranked highest for multiple (platform,
format) matches THIS run, keep it for the slot with highest final_match_score. The
lower-scored platforms fall to second-best candidate."

**My v1.2 attempt:** used `ROW_NUMBER() OVER (PARTITION BY canonical)` = 1 to pick
each canonical's best slot. Correct for the winners — but orphaned slots (whose rn=1
candidate lost the canonical) got nothing. Result: NY dropped from 20 slots to 9.

**Root cause:** spec says "fall to second-best candidate" but didn't specify
algorithm. Naive "each canonical wins its best slot" is NOT greedy-optimal by total
score — it leaves slots empty.

**Resolution (v1.3 function):** PL/pgSQL loop walking the candidate pool in global
`final_score DESC` order. For each candidate, accept if neither canonical nor slot
(below `p_max_per_slot`) is claimed. Two-pass: (1) loop builds an array of accepted
`pool_rn` values, (2) second query returns only those rows.

**Trade-off made:** this is greedy-optimal by score, not globally optimal (Hungarian
algorithm would be). For ~40-60 candidates per client per week, greedy is
indistinguishable from optimal in practice. Documented in function comment.

**Result:** NY 20/20 slots, PP 20/20, CFW 8/8, Invegent 10/10. Zero dupes across
all 4 clients.

**Lesson:** spec algorithms that say "fall through" need to specify HOW. Future
specs should say either "greedy by score" or "orphan slots stay empty" explicitly.

---

## Other notes

### Client slug drift

Initial Step 2 seed used `care-for-welfare` as a slug guess. Live DB slug:
`care-for-welfare-pty-ltd`. Fixed by changing the seed INSERT to `WHERE status =
'active'` instead of slug list — future-proof and doesn't require knowing exact
slugs.

### `classifier_version` type

Spec's output schema had `classifier_version INT`. Live DB has it as `text` on
`f.canonical_content_body`. Dropped the column from v1 function output entirely
(not used in algorithm). No version-tracking on matching output until R7 needs it.

### `m.post_publish` has no `canonical_id`

Spec's dedup lookback assumed `pp.canonical_id` was a direct column. Live DB:
canonical_id reached via `post_publish → post_draft → digest_item`. Three-way join
in `publish_history` CTE.

---

## Files changed

**Migrations (all atomic):**
- `r5_matching_layer_step1_schema_20260424` — 5 tables + 1 view
- `r5_matching_layer_step2_seed_20260424` — 60 fitness rows + 4 dedup policies
- `r5_matching_layer_step3_function_20260424` — v1 initial function
- `r5_matching_layer_step3_function_v1_1_fix_quality_scale_20260424` — quality fix
- `r5_matching_layer_step3_function_v1_2_within_run_dedup_20260424` — bugged dedup
- `r5_matching_layer_step3_function_v1_3_greedy_plpgsql_20260424` — final greedy

**Live objects:**
- `t.class_format_fitness` (60 rows, 6 classes × 10 formats)
- `c.client_class_fitness_override` (empty — v1 launch state)
- `c.client_match_weights` (empty — global default 40/30/30)
- `m.post_format_performance_per_publish` (empty — populated by future insights-worker)
- `c.client_dedup_policy` (4 rows — all active clients, defaults 24h/7d)
- `t.vw_effective_class_format_fitness` (view)
- `m.match_demand_to_canonicals(UUID, DATE, NUMERIC, INT)` (STABLE, v1.3)

---

## Smoke test results (v1.3)

| Client | Slots matched | Distinct canonicals | Dupes | Avg score | Score range |
|---|---|---|---|---|---|
| NDIS-Yarns | 20/20 | 20 | 0 | 73.5 | 53.0–87.3 |
| Property Pulse | 20/20 | 20 | 0 | 70.9 | 50.0–89.8 |
| CFW | 8/8 | 8 | 0 | 53.5 | 48.2–59.0 |
| Invegent | 10/10 | 10 | 0 | 48.8 | 37.0–56.2 |

Routing decisions align with spec rationale — e.g. NY's IG × animated_data goes to
stat_heavy canonical (fitness 97), IG × carousel to multi_point (98), YT ×
video_short_avatar to human_story (92). FB × carousel demoted to analytical (75)
because multi_point winners went to IG/LI carousel first — correct greedy behaviour.

---

## Unblocks

**R6 impl** is next. R6 consumes `m.match_demand_to_canonicals()` output into
`m.post_seed` + `m.post_draft` + `m.ai_job` rows. Per spec § "What R6 consumes",
each output row becomes a seed with `seed_payload` containing match_metadata for
audit trail.

R6 includes bundled work:
- Router audit Finding 1 (hardcoded client UUIDs in `m.enqueue_publish_from_ai_job_v1`)
- Router audit Finding 4 (seed_and_enqueue demand formula hardcoded)
- Router audit Finding 6 (`NOT IN ('youtube')` exclusion)

Estimated effort: 3-4h for R6 end-to-end.

---

## Open questions deferred

- **Q1a (R5 spec):** when to revisit 40/30/30 default weights? Answer: after 4 weeks
  of data in `m.post_format_performance_per_publish`.
- **Q7a (R5 spec):** when to move from manual to data-driven tuning? Answer: when
  per-publish table has 200+ rows per client with engagement data (~2 months post
  insights-worker shipping).

Neither blocks R6 or downstream work.
