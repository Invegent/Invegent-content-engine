# R6 implementation — Saturday 25 Apr cutover retrospective

**Status:** 🟢 R6 LIVE — `m.seed_and_enqueue_ai_jobs_v1` v1.0.1 + R5 v1.4 + trigger Finding 1 fix + schema + grade-gating
**Time:** 2026-04-25 Saturday 11:30am – ~12:45pm AEST (~75 min wall-clock)
**Spec:** `docs/briefs/2026-04-24-r6-impl-spec.md`

## Outcome

R6 is live. NY + PP now have R5-driven drafts being produced every 10 min with rich match metadata in seed_payload. Multi-platform spread (same canonical, different platforms) actually possible for the first time. CFW + Invegent gated off (r6_enabled=FALSE) per their adequacy grades.

## What was supposed to be a 6h job done in 75 min — and why

Spec said 5-6h, recommended split across 2 sessions. Actual: ~75 min interactively. Difference was:

- I was wrong about the Task F trigger rewrite being the riskiest part. It went smoothly because the backfill made it a pure code-shape change (column reads instead of cascade). Behaviour preserved exactly.
- The riskiest thing turned out to be **two latent schema/dedup issues neither yesterday's spec nor the implementation knew about.** Both surfaced via R6 smoke testing, both were correctly fixed, both were structural improvements not workarounds.

## What landed

| Step | Migration | What |
|---|---|---|
| 1 | `r6_step_1_pause_seed_crons_for_cutover_20260425` | Paused jobids 11/64/65 |
| 3 | `r6_step_3_schema_queue_caps_and_r6_gate_20260425` | 3 new columns on c.client_publish_profile, backfill |
| 4 | `r6_step_4_trigger_rewrite_finding_1_20260425` | Trigger reads columns instead of UUID cascade |
| 5 | `r6_step_5_seed_and_enqueue_rewrite_r5_driven_20260425` | Seeder consumes R5 output |
| 5b | `r6_step_5b_drop_redundant_post_seed_index_20260425` | Latent schema bug fix |
| 5c | `r6_step_5c_seed_enqueue_temp_table_safety_20260425` | DROP TABLE IF EXISTS for batched calls |
| 5d | `r5_v1_4_active_seed_canonical_dedup_20260425` | R5 dedup extended to canonical level |
| 8 | `r6_step_8_re_enable_seed_crons_20260425` | Re-enabled crons |

## Surprises along the way

### Surprise 1 — Latent schema bug from D118 era

`m.post_seed` had two unique indexes:
- `ux_post_seed_digest_item` on `(digest_item_id)` only — single-platform legacy
- `post_seed_uniq_run_item_platform` on `(digest_run_id, digest_item_id, platform)` — multi-platform

Inconsistent — the older one prevented a digest_item from ever being seeded on more than one platform. Multi-platform seeding had never happened in the entire system history (1,091 seeds, 1,091 distinct digest_items). The constraint had been silently dictating behaviour.

R5+R6 explicitly require multi-platform seeding (8 cross-platform canonicals in this morning's smoke test). Cleanup that should have happened during D118-D123 multi-platform rollout. Caught now because R5+R6 are the first code paths that exercise the contradiction.

**Lesson:** redundant unique indexes are not just dead weight. They can silently dictate model behaviour, and that behaviour can become "the model" until a new requirement surfaces the constraint.

### Surprise 2 — R5 dedup gap at canonical level

R5 v1.3 deduplicated on `digest_item_id` — same item couldn't be seeded twice for the same platform. But multiple `digest_item` rows can point to the same `canonical_id` across digest_runs. The same canonical was getting seeded multiple times for the same platform via different digest_items.

NY's facebook stream had ~25 different digest_items for one canonical accumulated since the bundler started. R5 walked them as if they were distinct content.

**Fix:** R5 v1.4 added an `active_seeds_per_canonical` CTE that excludes canonicals already in flight (seeded but not yet published) for the same client+platform.

**Lesson:** dedup logic needs to be expressed at the *content* level (canonical) not just the *workflow* level (digest_item). The bundler's job is to surface candidate items; the matcher's job is to pick the right *content*. Mixing those layers caused redundant work to silently accumulate.

### Surprise 3 — No skipped clients counter

The function returns `clients_skipped_gated` in its diagnostic JSON. For facebook, this returned `0` despite CFW+Invegent being gated. Reason: their `mode` is `null` for FB, so they're filtered out by mode check, not by r6_enabled. Counter only catches r6_enabled=FALSE rows that pass other filters.

Functional gate works correctly. Diagnostic counter is slightly less informative than ideal. Marked as v1.1 polish item, not blocking.

## Smoke test results

After cutover, fresh state:

| Metric | Value |
|---|---|
| Seeds in last 10m | 33 |
| Drafts in last 10m | 33 |
| Drafts with `recommended_format` | 33/33 |
| AI jobs queued | 28 (some already moved to `running`) |
| Distinct (canonical, platform, client) combos | 33 (zero dupes) |
| Cross-platform canonicals | 8 |
| Platforms covered | 3 |
| R6 crons active | 3/3 |

## What this means for the router track

✅ R1, R2, R3 — shadow infrastructure
✅ R4 — classifier
✅ R5 — matching layer (now v1.4 with canonical-level active-seed dedup)
✅ Pool-adequacy diagnostic
✅ **R6 — seed_and_enqueue rewrite (this work)**
🔲 R7 — ai-worker platform/format awareness (now unblocked — `recommended_format` and `match_metadata` waiting in seed_payload)
🔲 R8 — cron rework (low priority, current per-platform structure works)

The pipeline now flows: signal → classifier → demand grid → R5 match → R6 seed/draft/job → ai-worker → publish queue → publisher.

## CFW + Invegent path forward

Both currently gated off (r6_enabled=FALSE). Path to enabling:

**CFW (Grade B):**
1. Activate the 24 currently-disabled feeds (only 2 of 26 enabled)
2. Wait ~1 week for the multi_point + educational_evergreen pool to build
3. Re-run `m.summarise_match_pool_adequacy(<cfw_uuid>)` — confirm Grade A
4. Flip r6_enabled=TRUE per platform

**Invegent (Grade D):**
1. Discovery pipeline work to add feeds producing stat_heavy + timely_breaking content
2. Validate via diagnostic
3. Once Grade B+, flip r6_enabled=TRUE for LinkedIn + YouTube (FB+IG remain unconfigured per current strategy)

Neither blocks anything else — the pipeline is producing real content for NY+PP today.

## What I would do differently

- **Trust the spec less, test with real data first.** Three of yesterday's specs assumed contracts that were wrong (table name, column range, dedup algorithm). Today's R6 found two more (unique index conflict, canonical-vs-item dedup level). Pattern: written specs lag the actual evolved schema. **Going forward: always run an empirical sanity check on schema/data before writing the spec, not just before implementing.**

- **Plan for cleanup migrations.** R6 wasn't planned to drop an index or rewrite R5 — both were necessary structural improvements that emerged. Allow buffer time for these in future cutover specs.

## Sprint mode reactivation watch

Pre-sales gate count after R6:
- A10b (first IG post publishes) — **gated by R6 now landing**. Will close as soon as ai-worker processes the IG-format drafts and they hit publish queue. Likely within next few cron ticks.
- That puts gate at ~13 of 28 closed.

R7 + writing block (Option A from earlier) would push to ~18-19 closed = reviewer reactivation threshold.

## Files

**Migrations:** 8 (above table)
**Function bodies updated:**
- `m.seed_and_enqueue_ai_jobs_v1(text,int)` v1.0.1
- `m.enqueue_publish_from_ai_job_v1()` (R6 rewrite)
- `m.match_demand_to_canonicals(uuid,date,numeric,int)` v1.4

**Schema additions:**
- `c.client_publish_profile.max_queued_per_platform` (INT)
- `c.client_publish_profile.min_post_gap_minutes_override` (INT, nullable)
- `c.client_publish_profile.r6_enabled` (BOOLEAN, default FALSE)

**Schema removals:**
- `m.ux_post_seed_digest_item` (redundant unique index)

**Brief commit:** TODO sha after this commit lands
