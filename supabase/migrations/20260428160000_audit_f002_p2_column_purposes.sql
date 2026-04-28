-- Audit closure: F-2026-04-28-D-002 — P2 column purposes (threshold/limit/count/score/weight)
-- Source: docs/audit/snapshots/columns/2026-04-28-p2-proposals.md
-- Total UPDATEs: 30 (HIGH 22 + MEDIUM 8)
-- DEFERRED (LOW, NOT in this migration): 1 — c.client_match_weights.quality_weight
--   See proposals file Deferred section + (forthcoming) f002_p2_low_confidence_followup decision file.
--
-- DRAFT — DO NOT APPLY DIRECTLY.
-- Per the Phase A precedent (commit 47c63d7 → corrected at 20260428055331), this file is CC's
-- proposal. Operator + ChatGPT review the proposals; the corrected version is applied via
-- Supabase MCP per D170 with a "_corrected" suffix and a fresh timestamp.
--
-- Idempotent: each UPDATE matches by (table_id, column_name).

-- ── c.client_audience_policy ─────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Minimum audience size (unique users) before IAE will activate a boost campaign for this client. Unit: count of unique users. Currently observed at 500 across populated rows; Meta Ads platform floor is 1000, so values below 1000 mean ICE will gate before Meta does.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_audience_policy') AND column_name = 'min_boost_audience_size';

-- ── c.client_brand_profile ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Per-client cap on completion tokens for ai-worker LLM calls. Unit: tokens (Anthropic/OpenAI tokenisation). Observed range 900-1200; the field is read in assemblePrompts() to set the per-call max_tokens limit.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_brand_profile') AND column_name = 'max_output_tokens';

-- ── c.client_channel_allocation ──────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Posts-per-week target for this client x platform allocation. Unit: count of posts per ISO week. No populated rows yet — c.platform_channel.posts_per_week is the catalogue default; this column appears to be the per-allocation override slot but has not been exercised.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_channel_allocation') AND column_name = 'posts_per_week';

-- ── c.client_class_fitness_override ──────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Per-client override score that replaces the default t.class_format_fitness row for the same (class, format) pair. Scale follows the D177 0-100 fitness convention. No populated rows yet.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_class_fitness_override') AND column_name = 'override_score';

-- ── c.client_content_scope ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Bundler weighting factor for this client's vertical scope row. Unit: dimensionless multiplier applied to per-vertical signal scores when ranking. Observed at the default 1.00 across populated rows; differential weighting is supported in design but not currently exercised.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_content_scope') AND column_name = 'weight';

-- ── c.client_dedup_policy ────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Minimum hours between publishing the same canonical content item on different platforms for this client. Unit: hours. Observed at 24 across populated rows.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_dedup_policy') AND column_name = 'min_cross_platform_gap_hours';

-- ── c.client_digest_policy ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Minimum count of items the bundler must include per digest bundle. Unit: count of items. Observed range 1-3.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_digest_policy') AND column_name = 'min_items';

UPDATE k.column_registry SET column_purpose = $cp$Maximum count of items the bundler may include per digest bundle. Unit: count of items. Observed at 12 across populated rows.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_digest_policy') AND column_name = 'max_items';

-- ── c.client_format_config ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Per-client cap on how many drafts of this ice_format_key may be produced per ISO week on the named platform. Unit: count of drafts per week. NULL = no per-format throttle applied.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_format_config') AND column_name = 'max_per_week';

-- ── c.client_match_weights ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Weight applied to the vertical-fit component of bundler signal scoring for this client. Unit: dimensionless multiplier (typical sum of weights = 1.0). No populated rows; defaults from t-schema apply when no client row exists.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_match_weights') AND column_name = 'fitness_weight';

UPDATE k.column_registry SET column_purpose = $cp$Weight applied to the recency component of bundler signal scoring (how recently the source item was published). Unit: dimensionless multiplier. No populated rows.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_match_weights') AND column_name = 'recency_weight';

-- NOTE: c.client_match_weights.quality_weight is DEFERRED (LOW confidence) — see proposals file.

-- ── c.client_platform_profile ────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Maximum character count for drafts generated for this client x platform. Unit: characters. Observed range 300-8000 reflecting platform conventions (Instagram caption < LinkedIn post < blog-style platforms). Read by ai-worker to constrain output length.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_platform_profile') AND column_name = 'max_chars';

UPDATE k.column_registry SET column_purpose = $cp$Minimum character count for drafts generated for this client x platform. Unit: characters. Observed range 60-600. Read by ai-worker to enforce a content-substance floor.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_platform_profile') AND column_name = 'min_chars';

UPDATE k.column_registry SET column_purpose = $cp$Target count of hashtags ai-worker should include per draft for this client x platform when use_hashtags=true. Unit: count of hashtags.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_platform_profile') AND column_name = 'hashtag_count';

-- ── c.client_publish_profile ─────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Daily cap on posts the publisher will release for this client x platform. Unit: count of posts per UTC day. Observed at 2 across all populated rows.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'max_per_day';

UPDATE k.column_registry SET column_purpose = $cp$Minimum gap the publisher enforces between consecutive posts on this client x platform. Unit: minutes. Observed range 240-360 (4-6 hours). Pairs with min_post_gap_minutes_override which takes precedence when set.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'min_gap_minutes';

UPDATE k.column_registry SET column_purpose = $cp$Cap on the number of items that may sit in the publish queue for this client x platform at once. Unit: count of queued items. Observed range 6-20. When the cap is hit, ai-worker pauses producing new drafts for this client x platform.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'max_queued_per_platform';

UPDATE k.column_registry SET column_purpose = $cp$Per-row override of the publisher's min-gap-minutes value (overrides min_gap_minutes when set). Unit: minutes. NULL = use min_gap_minutes; non-NULL = use this value. Observed range 90-360 (1.5-6 hours).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'min_post_gap_minutes_override';

-- ── c.client_source ──────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Bundler scoring weight applied to items from this feed source for this client. Unit: dimensionless multiplier. Observed at the default 1 across all populated rows; differential per-source weighting is supported but not currently exercised.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_source') AND column_name = 'weight';

-- ── c.content_series ─────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Planned number of episodes in the series. Unit: count of episodes. Observed range 3-5.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'content_series') AND column_name = 'episode_count';

-- ── c.onboarding_submission ──────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Number of times the operator has come back to the client requesting more information during onboarding review. Unit: count of request cycles. Used as a friction metric on long-running onboardings.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'onboarding_submission') AND column_name = 'info_request_count';

-- ── c.platform_channel ───────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Default posts-per-week ICE produces for this channel offering. Unit: count of posts per ISO week. Observed range 1-5 across the channel catalogue. May be overridden per package via c.service_package_channel.posts_per_week_override.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'platform_channel') AND column_name = 'posts_per_week';

-- ── c.service_package_channel ────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Per-package override of c.platform_channel.posts_per_week for this channel within this service tier. Unit: count of posts per ISO week. NULL = use the catalogue default; non-NULL takes precedence.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'service_package_channel') AND column_name = 'posts_per_week_override';

-- ── f.canonical_content_body ─────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Word count of the extracted body text. Unit: words. Observed range 50-6881. Used by bundler scoring (longer bodies generally score higher for substance) and by client_digest_policy.allow_missing_body.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'canonical_content_body') AND column_name = 'word_count';

-- ── f.ingest_run ─────────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Total items the ingest-worker fetched from the source during this run. Unit: count of items. Equal to inserted_count + updated_count + skipped_count + (items lost to errors). Observed range 0-50.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'ingest_run') AND column_name = 'fetched_count';

UPDATE k.column_registry SET column_purpose = $cp$Items the ingest-worker inserted as new f.raw_content_item rows during this run. Unit: count of items. Observed range 0-50.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'ingest_run') AND column_name = 'inserted_count';

UPDATE k.column_registry SET column_purpose = $cp$Items the ingest-worker updated (existing f.raw_content_item rows) during this run. Unit: count of items. Observed at 0 across all 8564 historical rows — ingest is currently insert-only; updates have not been exercised in production.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'ingest_run') AND column_name = 'updated_count';

UPDATE k.column_registry SET column_purpose = $cp$Items the ingest-worker fetched but skipped (e.g. duplicate of an existing item by content hash, or filtered by source rules) during this run. Unit: count of items. Observed range 0-50.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'ingest_run') AND column_name = 'skipped_count';

UPDATE k.column_registry SET column_purpose = $cp$Number of per-item errors during this run that did not abort the whole run. Unit: count of errors. Observed at 0 across all rows; per-item failure has not surfaced in production data, suggesting transient errors are either retried inline or set the run-level status rather than incrementing this counter.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'ingest_run') AND column_name = 'error_count';

-- ── f.video_analysis ─────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Snapshot of the source video's view count at the time of analysis. Unit: views. Observed range 233-53367. Used as a popularity signal during video-format synthesis.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'video_analysis') AND column_name = 'view_count';
