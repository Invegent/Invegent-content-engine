# F-002 Column Proposals — P2 Threshold / Limit / Count / Score / Weight / Priority

**Generated:** 2026-04-28 by Claude Code (Opus 4.7)
**Phase:** B (P2 — numeric threshold/limit/count/score/weight/priority columns)
**Total columns inventoried:** 31 (24 in `c`, 7 in `f`)
**Confidence distribution:** HIGH 22 (71%) · MEDIUM 8 (26%) · LOW 1 (3%) — under the >80% HIGH ceiling per brief V5
**Schema-verified columns:** 31 (100%) — populated count + MIN/MAX queried for every column
**Migration target:** `supabase/migrations/{timestamp}_audit_f002_p2_column_purposes.sql` (DRAFT — chat reviews and applies a corrected version via Supabase MCP per D170)

**New discipline applied (Phase B+):** LOW-confidence rows are listed in a separate "Deferred" section at the bottom of this file and are NOT carried into the draft migration. The 1 LOW row will land in a follow-up decision file alongside the Phase A LOW deferrals.

---

## c.client_audience_policy.min_boost_audience_size
- **Type:** integer · **Nullable:** false · **FK:** none
- **Populated:** 2 rows · **Min:** 500 · **Max:** 500
- **Table purpose:** Per-client audience building configuration governing what audiences ICE builds per platform and when IAE can activate boost campaigns.
- **Proposed column_purpose:** "Minimum audience size (unique users) before IAE will activate a boost campaign for this client. Unit: count of unique users. Currently observed at 500 across populated rows; Meta Ads platform floor is 1000, so values below 1000 mean ICE will gate before Meta does."
- **Confidence:** HIGH

## c.client_brand_profile.max_output_tokens
- **Type:** integer · **Nullable:** true · **FK:** none
- **Populated:** 4 rows · **Min:** 900 · **Max:** 1200
- **Proposed column_purpose:** "Per-client cap on completion tokens for ai-worker LLM calls. Unit: tokens (Anthropic/OpenAI tokenisation). Observed range 900-1200; the field is read in assemblePrompts() to set the per-call max_tokens limit."
- **Confidence:** HIGH

## c.client_channel_allocation.posts_per_week
- **Type:** integer · **Nullable:** false · **FK:** none
- **Populated:** 0 rows
- **Proposed column_purpose:** "Posts-per-week target for this client x platform allocation. Unit: count of posts per ISO week. No populated rows yet — c.platform_channel.posts_per_week is the catalogue default; this column appears to be the per-allocation override slot but has not been exercised."
- **Confidence:** MEDIUM
- **Reasoning:** Name semantics clear, but no populated data + overlap with platform_channel.posts_per_week creates ambiguity about which is the active source of truth.

## c.client_class_fitness_override.override_score
- **Type:** numeric · **Nullable:** false · **FK:** none
- **Populated:** 0 rows
- **Table purpose:** Per-client overrides to t.class_format_fitness (e.g. NDIS Yarns may prefer educational over breaking).
- **Proposed column_purpose:** "Per-client override score that replaces the default t.class_format_fitness row for the same (class, format) pair. Scale follows the D177 0-100 fitness convention. No populated rows yet."
- **Confidence:** MEDIUM
- **Reasoning:** Scale inferred from D177; column itself unexercised.

## c.client_content_scope.weight
- **Type:** numeric · **Nullable:** true · **FK:** none
- **Populated:** 10 rows · **Min:** 1.00 · **Max:** 1.00
- **Proposed column_purpose:** "Bundler weighting factor for this client's vertical scope row. Unit: dimensionless multiplier applied to per-vertical signal scores when ranking. Observed at the default 1.00 across populated rows; differential weighting is supported in design but not currently exercised."
- **Confidence:** HIGH

## c.client_dedup_policy.min_cross_platform_gap_hours
- **Type:** integer · **Nullable:** false · **FK:** none
- **Populated:** 4 rows · **Min:** 24 · **Max:** 24
- **Table purpose:** Per-client overrides to t.dedup_policy.
- **Proposed column_purpose:** "Minimum hours between publishing the same canonical content item on different platforms for this client. Unit: hours. Observed at 24 across populated rows."
- **Confidence:** HIGH

## c.client_digest_policy.min_items
- **Type:** integer · **Nullable:** false · **FK:** none
- **Populated:** 4 rows · **Min:** 1 · **Max:** 3
- **Proposed column_purpose:** "Minimum count of items the bundler must include per digest bundle. Unit: count of items. Observed range 1-3."
- **Confidence:** HIGH

## c.client_digest_policy.max_items
- **Type:** integer · **Nullable:** false · **FK:** none
- **Populated:** 4 rows · **Min:** 12 · **Max:** 12
- **Proposed column_purpose:** "Maximum count of items the bundler may include per digest bundle. Unit: count of items. Observed at 12 across populated rows."
- **Confidence:** HIGH

## c.client_format_config.max_per_week
- **Type:** integer · **Nullable:** true · **FK:** none
- **Populated:** 0 rows
- **Table purpose:** Per-client enable/disable overrides for content formats; max_per_week and service_tier can throttle format usage.
- **Proposed column_purpose:** "Per-client cap on how many drafts of this ice_format_key may be produced per ISO week on the named platform. Unit: count of drafts per week. NULL = no per-format throttle applied."
- **Confidence:** MEDIUM
- **Reasoning:** Table_purpose explicitly names this as a throttle; column unexercised but semantics direct.

## c.client_match_weights.fitness_weight
- **Type:** numeric · **Nullable:** false · **FK:** none
- **Populated:** 0 rows
- **Table purpose:** Per-client weights applied to signal scoring (vertical fit vs recency vs freshness).
- **Proposed column_purpose:** "Weight applied to the vertical-fit component of bundler signal scoring for this client. Unit: dimensionless multiplier (typical sum of weights = 1.0). No populated rows; defaults from t-schema apply when no client row exists."
- **Confidence:** MEDIUM
- **Reasoning:** Table_purpose lists "vertical fit" as a factor; "fitness" is plausibly the same semantic. Operator confirmation would lift to HIGH.

## c.client_match_weights.recency_weight
- **Type:** numeric · **Nullable:** false · **FK:** none
- **Populated:** 0 rows
- **Proposed column_purpose:** "Weight applied to the recency component of bundler signal scoring (how recently the source item was published). Unit: dimensionless multiplier. No populated rows."
- **Confidence:** MEDIUM
- **Reasoning:** Direct match to table_purpose factor name; unexercised data.

## c.client_platform_profile.max_chars
- **Type:** integer · **Nullable:** true · **FK:** none
- **Populated:** 14 rows · **Min:** 300 · **Max:** 8000
- **Table purpose:** Platform-specific voice and formatting rules per client.
- **Proposed column_purpose:** "Maximum character count for drafts generated for this client x platform. Unit: characters. Observed range 300-8000 reflecting platform conventions (Instagram caption < LinkedIn post < blog-style platforms). Read by ai-worker to constrain output length."
- **Confidence:** HIGH

## c.client_platform_profile.min_chars
- **Type:** integer · **Nullable:** true · **FK:** none
- **Populated:** 14 rows · **Min:** 60 · **Max:** 600
- **Proposed column_purpose:** "Minimum character count for drafts generated for this client x platform. Unit: characters. Observed range 60-600. Read by ai-worker to enforce a content-substance floor."
- **Confidence:** HIGH

## c.client_platform_profile.hashtag_count
- **Type:** integer · **Nullable:** true · **FK:** none
- **Populated:** 0 rows
- **Proposed column_purpose:** "Target count of hashtags ai-worker should include per draft for this client x platform when use_hashtags=true. Unit: count of hashtags."
- **Confidence:** MEDIUM
- **Reasoning:** Name semantics clear; column not yet populated for any client.

## c.client_publish_profile.max_per_day
- **Type:** integer · **Nullable:** true · **FK:** none
- **Populated:** 14 rows · **Min:** 2 · **Max:** 2
- **Table purpose:** Publishing configuration per client per platform.
- **Proposed column_purpose:** "Daily cap on posts the publisher will release for this client x platform. Unit: count of posts per UTC day. Observed at 2 across all populated rows."
- **Confidence:** HIGH

## c.client_publish_profile.min_gap_minutes
- **Type:** integer · **Nullable:** true · **FK:** none
- **Populated:** 14 rows · **Min:** 240 · **Max:** 360
- **Proposed column_purpose:** "Minimum gap the publisher enforces between consecutive posts on this client x platform. Unit: minutes. Observed range 240-360 (4-6 hours). Pairs with min_post_gap_minutes_override which takes precedence when set."
- **Confidence:** HIGH

## c.client_publish_profile.max_queued_per_platform
- **Type:** integer · **Nullable:** false · **FK:** none
- **Populated:** 14 rows · **Min:** 6 · **Max:** 20
- **Proposed column_purpose:** "Cap on the number of items that may sit in the publish queue for this client x platform at once. Unit: count of queued items. Observed range 6-20. When the cap is hit, ai-worker pauses producing new drafts for this client x platform."
- **Confidence:** HIGH

## c.client_publish_profile.min_post_gap_minutes_override
- **Type:** integer · **Nullable:** true · **FK:** none
- **Populated:** 6 rows · **Min:** 90 · **Max:** 360
- **Proposed column_purpose:** "Per-row override of the publisher's min-gap-minutes value (overrides min_gap_minutes when set). Unit: minutes. NULL = use min_gap_minutes; non-NULL = use this value. Observed range 90-360 (1.5-6 hours)."
- **Confidence:** HIGH
- **Reasoning:** Worth flagging for operator: two min-gap columns on the same table is a precedence pattern. The override having a smaller observed minimum (90 vs 240) suggests it is genuinely used to relax the base gap for some rows.

## c.client_source.weight
- **Type:** numeric · **Nullable:** true · **FK:** none
- **Populated:** 94 rows · **Min:** 1 · **Max:** 1
- **Table purpose:** Junction table linking clients to feed sources with weight.
- **Proposed column_purpose:** "Bundler scoring weight applied to items from this feed source for this client. Unit: dimensionless multiplier. Observed at the default 1 across all populated rows; differential per-source weighting is supported but not currently exercised."
- **Confidence:** HIGH

## c.content_series.episode_count
- **Type:** integer · **Nullable:** false · **FK:** none
- **Populated:** 9 rows · **Min:** 3 · **Max:** 5
- **Proposed column_purpose:** "Planned number of episodes in the series. Unit: count of episodes. Observed range 3-5."
- **Confidence:** HIGH

## c.onboarding_submission.info_request_count
- **Type:** integer · **Nullable:** false · **FK:** none
- **Populated:** 1 row · **Min:** 1 · **Max:** 1
- **Table purpose:** Submissions to the client onboarding flow.
- **Proposed column_purpose:** "Number of times the operator has come back to the client requesting more information during onboarding review. Unit: count of request cycles. Used as a friction metric on long-running onboardings."
- **Confidence:** MEDIUM
- **Reasoning:** Name strongly suggests this semantic but only one row exists; operator confirmation that this is a counter (not a flag) would lift to HIGH.

## c.platform_channel.posts_per_week
- **Type:** integer · **Nullable:** false · **FK:** none
- **Populated:** 8 rows · **Min:** 1 · **Max:** 5
- **Table purpose:** Catalogue of channel offerings.
- **Proposed column_purpose:** "Default posts-per-week ICE produces for this channel offering. Unit: count of posts per ISO week. Observed range 1-5 across the channel catalogue. May be overridden per package via c.service_package_channel.posts_per_week_override."
- **Confidence:** HIGH

## c.service_package_channel.posts_per_week_override
- **Type:** integer · **Nullable:** true · **FK:** none
- **Populated:** 0 rows
- **Table purpose:** Many-to-many mapping of service packages to platform channels.
- **Proposed column_purpose:** "Per-package override of c.platform_channel.posts_per_week for this channel within this service tier. Unit: count of posts per ISO week. NULL = use the catalogue default; non-NULL takes precedence."
- **Confidence:** MEDIUM
- **Reasoning:** Override semantic clear from name; not yet exercised.

## f.canonical_content_body.word_count
- **Type:** integer · **Nullable:** true · **FK:** none
- **Populated:** 506 rows · **Min:** 50 · **Max:** 6881
- **Proposed column_purpose:** "Word count of the extracted body text. Unit: words. Observed range 50-6881. Used by bundler scoring (longer bodies generally score higher for substance) and by client_digest_policy.allow_missing_body."
- **Confidence:** HIGH

## f.ingest_run.fetched_count
- **Type:** integer · **Nullable:** false · **FK:** none
- **Populated:** 8564 rows · **Min:** 0 · **Max:** 50
- **Table purpose:** Run-level audit log for each feed ingestion cycle.
- **Proposed column_purpose:** "Total items the ingest-worker fetched from the source during this run. Unit: count of items. Equal to inserted_count + updated_count + skipped_count + (items lost to errors). Observed range 0-50."
- **Confidence:** HIGH

## f.ingest_run.inserted_count
- **Type:** integer · **Nullable:** false · **FK:** none
- **Populated:** 8564 rows · **Min:** 0 · **Max:** 50
- **Proposed column_purpose:** "Items the ingest-worker inserted as new f.raw_content_item rows during this run. Unit: count of items. Observed range 0-50."
- **Confidence:** HIGH

## f.ingest_run.updated_count
- **Type:** integer · **Nullable:** false · **FK:** none
- **Populated:** 8564 rows · **Min:** 0 · **Max:** 0
- **Proposed column_purpose:** "Items the ingest-worker updated (existing f.raw_content_item rows) during this run. Unit: count of items. Observed at 0 across all 8564 historical rows — ingest is currently insert-only; updates have not been exercised in production."
- **Confidence:** HIGH

## f.ingest_run.skipped_count
- **Type:** integer · **Nullable:** false · **FK:** none
- **Populated:** 8564 rows · **Min:** 0 · **Max:** 50
- **Proposed column_purpose:** "Items the ingest-worker fetched but skipped (e.g. duplicate of an existing item by content hash, or filtered by source rules) during this run. Unit: count of items. Observed range 0-50."
- **Confidence:** HIGH

## f.ingest_run.error_count
- **Type:** integer · **Nullable:** false · **FK:** none
- **Populated:** 8564 rows · **Min:** 0 · **Max:** 0
- **Proposed column_purpose:** "Number of per-item errors during this run that did not abort the whole run. Unit: count of errors. Observed at 0 across all rows; per-item failure has not surfaced in production data, suggesting transient errors are either retried inline or set the run-level status rather than incrementing this counter."
- **Confidence:** HIGH

## f.video_analysis.view_count
- **Type:** bigint · **Nullable:** true · **FK:** none
- **Populated:** 4 rows · **Min:** 233 · **Max:** 53367
- **Proposed column_purpose:** "Snapshot of the source video's view count at the time of analysis. Unit: views. Observed range 233-53367. Used as a popularity signal during video-format synthesis."
- **Confidence:** HIGH

---

## Deferred (LOW confidence) — NOT included in the draft migration

These rows are flagged for operator decision rather than auto-applied. Capturing them here following the Phase A precedent (`docs/audit/decisions/f002_p1_low_confidence_followup.md`).

### c.client_match_weights.quality_weight
- **Type:** numeric · **Nullable:** false · **FK:** none
- **Populated:** 0 rows
- **Table purpose:** Per-client weights applied to signal scoring (vertical fit vs recency vs freshness).
- **Concern:** The column is named `quality_weight` but the table_purpose names "vertical fit / recency / freshness" as the three factors. The other two columns (fitness_weight ≈ vertical fit, recency_weight ≈ recency) map cleanly; `quality_weight` either represents "freshness" under a different name or represents a fourth factor not described in the table_purpose. Unpopulated data prevents validation.
- **Suggested next step:** Either (a) confirm `quality_weight` = freshness and update the column purpose accordingly, (b) confirm it represents a separate quality dimension and update the table_purpose to enumerate the full factor set, or (c) deprecate if quality is not actually used.

---

## Summary

- **Total inventoried:** 31
- **Migration draft includes:** 30 (HIGH 22 + MEDIUM 8)
- **Deferred (LOW):** 1 → flagged for operator decision
- **Confidence distribution:** HIGH 22 (71%) · MEDIUM 8 (26%) · LOW 1 (3%)
- **Schema verification rate:** 100% — populated count and MIN/MAX queried for every column

**Notable findings for operator:**
- **Two min-gap columns on `c.client_publish_profile`** (`min_gap_minutes` and `min_post_gap_minutes_override`) — both populated, the override has a tighter floor (90 min) than the base (240 min). Worth a docs note on which one wins where.
- **Three "posts_per_week" columns** form a precedence chain: `c.platform_channel.posts_per_week` (catalogue default, populated 1-5) → `c.service_package_channel.posts_per_week_override` (per-tier override, 0 populated) → `c.client_channel_allocation.posts_per_week` (per-allocation, 0 populated). Worth a docs note on the resolution order.
- **`f.ingest_run.updated_count` and `error_count`** are populated at 0 across all 8564 rows — neither has ever been incremented. Either ingest is genuinely insert-only / never errors at item level, or these counters are written elsewhere and not back into the run row.
- **`c.client_content_scope.weight` and `c.client_source.weight`** both populated at the default 1, suggesting differential per-vertical and per-source weighting is supported in design but not currently exercised — the bundler effectively treats all verticals/sources equally.

**Operator review checklist:**
- [ ] Spot-check 5 HIGH proposals — confirm units stated correctly
- [ ] Read every MEDIUM proposal — particularly the unpopulated ones (override_score scale, max_per_week semantics, fitness_weight ↔ "vertical fit" mapping, info_request_count semantic)
- [ ] Decide on the LOW row (quality_weight) — operator-written purpose, deprecation, or table_purpose update
- [ ] Approve to apply migration after corrections (chat applies via Supabase MCP per D170)
