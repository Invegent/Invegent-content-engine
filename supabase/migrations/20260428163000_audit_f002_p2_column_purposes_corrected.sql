-- Audit closure: F-2026-04-28-D-002 — P2 column purposes (threshold/limit/count/score/weight)
-- Source: docs/audit/snapshots/columns/2026-04-28-p2-proposals.md
-- Corrections per ChatGPT review of CC's Phase B draft (commit c670b38):
--   * 14 row wordings edited for safety/clarity:
--     - min_boost_audience_size: removed Meta Ads platform floor claim
--     - max_per_day: removed UTC claim (publisher scheduling not verified UTC)
--     - min_gap_minutes / min_post_gap_minutes_override: softened precedence assertions
--     - word_count: removed allow_missing_body claim
--     - fetched_count: removed arithmetic invariant claim
--     - error_count: removed speculation about why it's 0
--     - max_output_tokens: removed assemblePrompts() function reference
--     - max_chars / min_chars / max_queued_per_platform / view_count: softened "read by ai-worker"
--     - fitness_weight: softened "defaults from t-schema"
--     - info_request_count: removed "friction metric" interpretation
--   * Verification uses count delta (refresh_column_registry bumps updated_at on every row, so time-window comparison is unreliable — lesson learned during first apply attempt)
-- Applied: 2026-04-28 evening via Supabase MCP (per D170).
-- Supersedes CC draft at supabase/migrations/20260428160000_audit_f002_p2_column_purposes.sql.
--
-- Coverage delta: c+f schemas 79 → 109 documented (11.7% → 16.2%).
-- Phase A + B combined: 109 of 674 c+f columns now have operator-written column_purpose.
-- Phase C (P3 — JSONB configs) pending.

DO $audit_phase_b$
DECLARE
  expected_delta CONSTANT integer := 30;
  before_count integer;
  after_count integer;
BEGIN

-- Capture pre-update count of documented rows in c+f
SELECT COUNT(*)::int INTO before_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name IN ('c','f')
  AND cr.column_purpose IS NOT NULL
  AND cr.column_purpose <> ''
  AND cr.column_purpose <> 'PENDING_DOCUMENTATION'
  AND cr.column_purpose NOT ILIKE 'TODO%';

-- ── c.client_audience_policy ───────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Minimum audience size before ICE considers a boost campaign eligible for this client. Unit: count of unique users. Observed at 500 across populated rows; downstream ad platforms may impose separate activation thresholds.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_audience_policy') AND column_name = 'min_boost_audience_size';

-- ── c.client_brand_profile ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Per-client cap on LLM output tokens for generation calls. Unit: tokens (Anthropic/OpenAI tokenisation). Observed range 900-1200.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_brand_profile') AND column_name = 'max_output_tokens';

-- ── c.client_channel_allocation ───────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Posts-per-week target for this client x platform allocation. Unit: count of posts per ISO week. No populated rows yet — c.platform_channel.posts_per_week is the catalogue default; this column appears to be the per-allocation override slot but has not been exercised.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_channel_allocation') AND column_name = 'posts_per_week';

-- ── c.client_class_fitness_override ───────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Per-client override score that replaces the default t.class_format_fitness row for the same (class, format) pair. Scale follows the D177 0-100 fitness convention. No populated rows yet.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_class_fitness_override') AND column_name = 'override_score';

-- ── c.client_content_scope ─────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Bundler weighting factor for this client's vertical scope row. Unit: dimensionless multiplier applied to per-vertical signal scores when ranking. Observed at the default 1.00 across populated rows; differential weighting is supported in design but not currently exercised.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_content_scope') AND column_name = 'weight';

-- ── c.client_dedup_policy ───────────────────────────────────────────────
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
UPDATE k.column_registry SET column_purpose = $cp$Weight applied to the fitness/vertical-fit component of client-specific signal scoring. Unit: dimensionless multiplier. No populated rows; default scoring appears to come from the non-client-specific configuration when no override row exists.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_match_weights') AND column_name = 'fitness_weight';

UPDATE k.column_registry SET column_purpose = $cp$Weight applied to the recency component of bundler signal scoring (how recently the source item was published). Unit: dimensionless multiplier. No populated rows.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_match_weights') AND column_name = 'recency_weight';

-- NOTE: c.client_match_weights.quality_weight DEFERRED (LOW confidence) — see proposals file.

-- ── c.client_platform_profile ───────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Maximum character count for drafts generated for this client x platform. Unit: characters. Observed range 300-8000 reflecting platform conventions (Instagram caption < LinkedIn post < blog-style platforms).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_platform_profile') AND column_name = 'max_chars';

UPDATE k.column_registry SET column_purpose = $cp$Minimum character count for drafts generated for this client x platform. Unit: characters. Observed range 60-600.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_platform_profile') AND column_name = 'min_chars';

UPDATE k.column_registry SET column_purpose = $cp$Target count of hashtags ai-worker should include per draft for this client x platform when use_hashtags=true. Unit: count of hashtags.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_platform_profile') AND column_name = 'hashtag_count';

-- ── c.client_publish_profile ────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Daily cap on posts the publisher will release for this client x platform. Unit: count of posts per publisher scheduling day/window. Observed at 2 across populated rows.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'max_per_day';

UPDATE k.column_registry SET column_purpose = $cp$Base minimum gap between consecutive posts for this client x platform. Unit: minutes. Observed range 240-360. May be superseded by min_post_gap_minutes_override when that override is configured.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'min_gap_minutes';

UPDATE k.column_registry SET column_purpose = $cp$Cap on the number of items that may sit in the publish queue for this client x platform at once. Unit: count of queued items. Observed range 6-20.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'max_queued_per_platform';

UPDATE k.column_registry SET column_purpose = $cp$Optional override for the base minimum post gap on this client x platform. Unit: minutes. NULL = no override configured; non-NULL provides an alternate gap value for downstream publisher logic. Observed range 90-360 (1.5-6 hours).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile') AND column_name = 'min_post_gap_minutes_override';

-- ── c.client_source ────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Bundler scoring weight applied to items from this feed source for this client. Unit: dimensionless multiplier. Observed at the default 1 across all populated rows; differential per-source weighting is supported but not currently exercised.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_source') AND column_name = 'weight';

-- ── c.content_series ────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Planned number of episodes in the series. Unit: count of episodes. Observed range 3-5.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'content_series') AND column_name = 'episode_count';

-- ── c.onboarding_submission ─────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Number of times additional information has been requested from the client during onboarding review. Unit: count of request cycles.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'onboarding_submission') AND column_name = 'info_request_count';

-- ── c.platform_channel ──────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Default posts-per-week ICE produces for this channel offering. Unit: count of posts per ISO week. Observed range 1-5 across the channel catalogue. May be overridden per package via c.service_package_channel.posts_per_week_override.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'platform_channel') AND column_name = 'posts_per_week';

-- ── c.service_package_channel ──────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Per-package override of c.platform_channel.posts_per_week for this channel within this service tier. Unit: count of posts per ISO week. NULL = use the catalogue default; non-NULL takes precedence.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'service_package_channel') AND column_name = 'posts_per_week_override';

-- ── f.canonical_content_body ────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Word count of the extracted body text. Unit: words. Observed range 50-6881. Available to downstream quality, scoring, or filtering logic that needs to distinguish thin from substantive source bodies.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'canonical_content_body') AND column_name = 'word_count';

-- ── f.ingest_run ───────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Total items fetched from the source during this ingest run before insert/update/skip classification. Unit: count of items. Observed range 0-50.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'ingest_run') AND column_name = 'fetched_count';

UPDATE k.column_registry SET column_purpose = $cp$Items the ingest-worker inserted as new f.raw_content_item rows during this run. Unit: count of items. Observed range 0-50.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'ingest_run') AND column_name = 'inserted_count';

UPDATE k.column_registry SET column_purpose = $cp$Items the ingest-worker updated (existing f.raw_content_item rows) during this run. Unit: count of items. Observed at 0 across all 8564 historical rows — ingest is currently insert-only; updates have not been exercised in production.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'ingest_run') AND column_name = 'updated_count';

UPDATE k.column_registry SET column_purpose = $cp$Items the ingest-worker fetched but skipped (e.g. duplicate of an existing item by content hash, or filtered by source rules) during this run. Unit: count of items. Observed range 0-50.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'ingest_run') AND column_name = 'skipped_count';

UPDATE k.column_registry SET column_purpose = $cp$Number of item-level errors recorded during this ingest run that did not abort the whole run. Unit: count of errors. Observed at 0 across historical rows.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'ingest_run') AND column_name = 'error_count';

-- ── f.video_analysis ────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Snapshot of the source video's view count at the time of analysis. Unit: views. Observed range 233-53367.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'video_analysis') AND column_name = 'view_count';

-- Post-apply verification — count delta (immune to refresh_column_registry bumping updated_at)
SELECT COUNT(*)::int INTO after_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name IN ('c','f')
  AND cr.column_purpose IS NOT NULL
  AND cr.column_purpose <> ''
  AND cr.column_purpose <> 'PENDING_DOCUMENTATION'
  AND cr.column_purpose NOT ILIKE 'TODO%';

IF after_count - before_count <> expected_delta THEN
  RAISE EXCEPTION 'F-002 P2 verification failed: expected delta %, got % (before=%, after=%)',
    expected_delta, after_count - before_count, before_count, after_count;
END IF;

RAISE NOTICE 'F-002 P2 verification passed: delta % (before=%, after=%)', after_count - before_count, before_count, after_count;

END;
$audit_phase_b$;
