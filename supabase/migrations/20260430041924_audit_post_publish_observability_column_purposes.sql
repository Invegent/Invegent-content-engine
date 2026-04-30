-- Audit: post-publish observability column purposes — m.post_format_performance_per_publish,
--        m.post_performance, m.post_publish_queue
-- Brief: docs/briefs/post-publish-observability-column-purposes.md
-- Pre-flight: 64 undocumented column rows total (26 + 18 + 20). Confidence
--             classification per the brief's strict-JSONB rule:
--   * 26/26 HIGH on m.post_format_performance_per_publish — full CREATE TABLE
--     spec in docs/briefs/2026-04-24-r5-matching-layer-spec.md (lines 187-218),
--     rename context in r5-impl-retrospective.md.
--   * 18/18 HIGH on m.post_performance — supabase/functions/insights-worker/
--     index.ts:221-247 constructs the entire row including raw_payload JSONB
--     shape (keys: metric_names_used, failed_metrics, source_note, version).
--   * 17/20 HIGH on m.post_publish_queue — supabase/functions/publisher/index.ts
--     drives the status state machine + error/timestamp/lock columns; the
--     2026-04-02 profession-compliance-wire brief explicitly documents the
--     acknowledged_at / acknowledged_by extension.
--   * 3/20 LOW on m.post_publish_queue — last_error_code, last_error_subcode,
--     err_368_streak. Facebook Graph error code/subcode/spam-streak tracking
--     with no producer code path and no markdown documentation. Escalated to
--     docs/audit/decisions/post_publish_observability_low_confidence_followup.md.
--
-- Total: 61 HIGH (this migration) + 3 LOW (followup file). expected_delta = 61
-- (= 64 - 3 LOW).
--
-- Verification (Lesson #38): single atomic DO block captures pre_count of
-- NULL/empty/PENDING/TODO column_purpose rows for the three tables, runs 61
-- UPDATEs, captures post_count, asserts pre_count - post_count = 61.

DO $audit_post_publish_obs$
DECLARE
  expected_delta CONSTANT integer := 61;
  pre_count integer;
  post_count integer;
BEGIN

SELECT COUNT(*)::int INTO pre_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name = 'm'
  AND tr.table_name IN ('post_format_performance_per_publish', 'post_performance', 'post_publish_queue')
  AND (cr.column_purpose IS NULL
       OR cr.column_purpose = ''
       OR cr.column_purpose = 'PENDING_DOCUMENTATION'
       OR cr.column_purpose ILIKE 'TODO%');

-- ── m.post_format_performance_per_publish (26 HIGH) ──────────────────────────────
-- Documented in docs/briefs/2026-04-24-r5-matching-layer-spec.md §"Table 5"
-- (originally m.post_format_performance, renamed per r5-impl-retrospective.md).
-- Empty table; populated by future insights-worker pass per R5 design.
UPDATE k.column_registry SET column_purpose = $cp$Surrogate UUID primary key for the per-publish format performance row.$cp$, updated_at = NOW() WHERE column_id = 3144096;
UPDATE k.column_registry SET column_purpose = $cp$Publish event this row measures (FK m.post_publish.post_publish_id, ON DELETE CASCADE per R5 spec).$cp$, updated_at = NOW() WHERE column_id = 3144095;
UPDATE k.column_registry SET column_purpose = $cp$Owning client (FK c.client.client_id). Carried alongside post_publish_id so R7 tuning can group by client without joining.$cp$, updated_at = NOW() WHERE column_id = 3144094;
UPDATE k.column_registry SET column_purpose = $cp$Target social platform code (FK t.5.0_social_platform.platform_code). Captured at publish time so R7 can compare per-platform fitness independently.$cp$, updated_at = NOW() WHERE column_id = 3144093;
UPDATE k.column_registry SET column_purpose = $cp$Format the post was published as (FK t.5.3_content_format.ice_format_key). Pairs with content_class as the (class, format) key R7 tunes against.$cp$, updated_at = NOW() WHERE column_id = 3144092;
UPDATE k.column_registry SET column_purpose = $cp$Content class taxonomy code captured at publish time (matches m.signal_pool.content_class vocabulary, e.g. timely_breaking, stat_heavy). Pairs with ice_format_key as the (class, format) key R7 tunes against.$cp$, updated_at = NOW() WHERE column_id = 3144091;
UPDATE k.column_registry SET column_purpose = $cp$Fitness score recorded at publish time on the 0..100 scale used by m.compute_slot_confidence and the matching layer. Frozen here so R7 can correlate publish-time fitness with downstream engagement.$cp$, updated_at = NOW() WHERE column_id = 3144090;
UPDATE k.column_registry SET column_purpose = $cp$Quality score recorded at publish time, drawn from t.format_quality_policy at the moment of fill. Frozen here so R7 can correlate publish-time quality with downstream engagement.$cp$, updated_at = NOW() WHERE column_id = 3144089;
UPDATE k.column_registry SET column_purpose = $cp$Recency score recorded at publish time, computed from canonical first_seen_at against t.class_freshness_rule.freshness_window_hours at the moment of fill. Frozen here for R7 correlation.$cp$, updated_at = NOW() WHERE column_id = 3144088;
UPDATE k.column_registry SET column_purpose = $cp$Final composite match score recorded at publish time (per R5/R6 weight mix; see seed_payload.match_metadata.final_match_score in r6-impl-spec). Frozen here for R7 correlation.$cp$, updated_at = NOW() WHERE column_id = 3144087;
UPDATE k.column_registry SET column_purpose = $cp$Identifier of the match-weights profile in effect at publish time (see c.client_match_weights / global_default_40_30_30). Frozen so R7 can do apples-to-apples comparisons as the weight vocabulary evolves.$cp$, updated_at = NOW() WHERE column_id = 3144086;
UPDATE k.column_registry SET column_purpose = $cp$Identifier of the fitness-scoring algorithm version in effect at publish time (e.g. v1). Frozen per R5 versioning rationale.$cp$, updated_at = NOW() WHERE column_id = 3144085;
UPDATE k.column_registry SET column_purpose = $cp$Classifier version in effect when the canonical was classified (per D143 classifier spec). Frozen per R5 versioning rationale.$cp$, updated_at = NOW() WHERE column_id = 3144084;
UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time the post was actually published. Distinct from measured_at, which is when engagement was sampled.$cp$, updated_at = NOW() WHERE column_id = 3144083;
UPDATE k.column_registry SET column_purpose = $cp$Reach metric for the published post (unique users who saw the content), as reported by the platform analytics API.$cp$, updated_at = NOW() WHERE column_id = 3144082;
UPDATE k.column_registry SET column_purpose = $cp$Impressions for the published post (total times the content was displayed, including repeats), as reported by the platform analytics API.$cp$, updated_at = NOW() WHERE column_id = 3144081;
UPDATE k.column_registry SET column_purpose = $cp$Total engagement event count for the published post (sum of reactions + comments + shares-class events). Per R5 spec; distinct from m.post_performance.engaged_users (unique users).$cp$, updated_at = NOW() WHERE column_id = 3144080;
UPDATE k.column_registry SET column_purpose = $cp$Engagement rate for the published post (engagement_count / reach), stored as a fraction.$cp$, updated_at = NOW() WHERE column_id = 3144079;
UPDATE k.column_registry SET column_purpose = $cp$Click-through rate for the published post (clicks / impressions), stored as a fraction.$cp$, updated_at = NOW() WHERE column_id = 3144078;
UPDATE k.column_registry SET column_purpose = $cp$Click count for the published post (link clicks / outbound clicks per platform definition).$cp$, updated_at = NOW() WHERE column_id = 3144077;
UPDATE k.column_registry SET column_purpose = $cp$Share count for the published post (shares / reposts per platform definition).$cp$, updated_at = NOW() WHERE column_id = 3144076;
UPDATE k.column_registry SET column_purpose = $cp$Save / bookmark count for the published post (Instagram saves and equivalents). NULL on platforms that do not expose a save metric.$cp$, updated_at = NOW() WHERE column_id = 3144075;
UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time the engagement metrics on this row were sampled from the platform API. Default now() at insert; multiple rows per post_publish_id are distinguished by measurement_window_hours.$cp$, updated_at = NOW() WHERE column_id = 3144074;
UPDATE k.column_registry SET column_purpose = $cp$Hours of engagement accumulation captured by this row (e.g. 24, 168). Pairs with post_publish_id as a UNIQUE key per R5 spec so the same publish can have multiple snapshots at different windows.$cp$, updated_at = NOW() WHERE column_id = 3144073;
UPDATE k.column_registry SET column_purpose = $cp$Row creation timestamp (default now()).$cp$, updated_at = NOW() WHERE column_id = 3144072;
UPDATE k.column_registry SET column_purpose = $cp$Last-modified timestamp; advanced on each UPDATE to the row.$cp$, updated_at = NOW() WHERE column_id = 3144071;

-- ── m.post_performance (18 HIGH) ─────────────────────────────────────────────────
-- Producer cited: supabase/functions/insights-worker/index.ts:221-247 (Facebook
-- Graph insights). Upsert keyed on (platform_post_id, insights_period). Currently
-- only facebook rows observed (157 total).
UPDATE k.column_registry SET column_purpose = $cp$Surrogate UUID primary key for the post-performance snapshot row.$cp$, updated_at = NOW() WHERE column_id = 299207;
UPDATE k.column_registry SET column_purpose = $cp$Publish event this row measures (FK m.post_publish.post_publish_id). Set by insights-worker when it persists fetched metrics.$cp$, updated_at = NOW() WHERE column_id = 299206;
UPDATE k.column_registry SET column_purpose = $cp$Owning client. Carried alongside post_publish_id so dashboards can scope by client without joining.$cp$, updated_at = NOW() WHERE column_id = 299205;
UPDATE k.column_registry SET column_purpose = $cp$Source platform for the metrics (FK t.5.0_social_platform.platform_code). insights-worker currently writes only 'facebook'; default 'facebook'.$cp$, updated_at = NOW() WHERE column_id = 299204;
UPDATE k.column_registry SET column_purpose = $cp$Platform-side post identifier (Facebook Graph post id), used as part of the upsert key with insights_period so re-fetches update the same snapshot row.$cp$, updated_at = NOW() WHERE column_id = 299203;
UPDATE k.column_registry SET column_purpose = $cp$Reach metric reported by the platform API (unique users who saw the post).$cp$, updated_at = NOW() WHERE column_id = 299202;
UPDATE k.column_registry SET column_purpose = $cp$Impressions reported by the platform API. NULL when the platform-version metric mapping does not return impressions for this post (insights-worker logs the failed metric in raw_payload.failed_metrics).$cp$, updated_at = NOW() WHERE column_id = 299201;
UPDATE k.column_registry SET column_purpose = $cp$Unique users who engaged with the post. Per insights-worker, falls back to reactions + comments + shares when post_engaged_users is unavailable from the Graph API; that fallback is recorded in raw_payload.source_note.$cp$, updated_at = NOW() WHERE column_id = 299200;
UPDATE k.column_registry SET column_purpose = $cp$Reaction count reported by the platform API.$cp$, updated_at = NOW() WHERE column_id = 299199;
UPDATE k.column_registry SET column_purpose = $cp$Comment count reported by the platform API.$cp$, updated_at = NOW() WHERE column_id = 299198;
UPDATE k.column_registry SET column_purpose = $cp$Share count reported by the platform API.$cp$, updated_at = NOW() WHERE column_id = 299197;
UPDATE k.column_registry SET column_purpose = $cp$Click count reported by the platform API. insights-worker currently writes NULL pending Graph API click-metric resolution.$cp$, updated_at = NOW() WHERE column_id = 299196;
UPDATE k.column_registry SET column_purpose = $cp$Engagement rate as engaged_users / reach when reach > 0; NULL when reach is 0 or unavailable. Computed by insights-worker before write.$cp$, updated_at = NOW() WHERE column_id = 299195;
UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time insights-worker fetched the metrics from the platform API. Default now() at insert.$cp$, updated_at = NOW() WHERE column_id = 299194;
UPDATE k.column_registry SET column_purpose = $cp$Insights aggregation window (default 'lifetime'; observed value: lifetime). Part of the (platform_post_id, insights_period) upsert key, allowing multiple windowed snapshots per post if non-lifetime periods are added later.$cp$, updated_at = NOW() WHERE column_id = 299193;
UPDATE k.column_registry SET column_purpose = $cp$Raw debugging payload from insights-worker. JSONB object with observed keys metric_names_used (object mapping our metric name to the actual Graph metric returned, e.g. reach -> post_impressions_unique), failed_metrics (array of metric names the Graph API did not return for this post), source_note (free-text note about derivations), and version (insights-worker version string when present, e.g. insights-worker-v14.0.0).$cp$, updated_at = NOW() WHERE column_id = 299192;
UPDATE k.column_registry SET column_purpose = $cp$Row creation timestamp (default now()).$cp$, updated_at = NOW() WHERE column_id = 299191;
UPDATE k.column_registry SET column_purpose = $cp$Last-modified timestamp; advanced on each UPDATE to the row (re-fetches reuse the upsert key).$cp$, updated_at = NOW() WHERE column_id = 299190;

-- ── m.post_publish_queue (17 HIGH; 3 LOW deferred to followup) ───────────────────
-- Producer cited: supabase/functions/publisher/index.ts drives the status
-- state machine and error/lock fields. acknowledged_at/by extension documented
-- in docs/briefs/2026-04-02-profession-compliance-wire.md (table_purpose
-- itself) — dead items are never deleted; acknowledged_at marks them reviewed
-- so doctor alerting can exclude them.
UPDATE k.column_registry SET column_purpose = $cp$Surrogate UUID primary key for the queue row.$cp$, updated_at = NOW() WHERE column_id = 129210;
UPDATE k.column_registry SET column_purpose = $cp$AI generation job that produced the draft (m.ai_job.ai_job_id). No DB-level FK declared but the linkage is read by publisher and dashboard queries.$cp$, updated_at = NOW() WHERE column_id = 130116;
UPDATE k.column_registry SET column_purpose = $cp$Approved post draft to publish (m.post_draft.post_draft_id). No DB-level FK declared but the linkage is required — publisher loads the draft row by this id (publisher Edge Function: post_draft_id used to load draft, image, schedule, and on success update approval_status='published').$cp$, updated_at = NOW() WHERE column_id = 131023;
UPDATE k.column_registry SET column_purpose = $cp$Owning client. Used by publisher to resolve the per-client publish profile and Facebook page token.$cp$, updated_at = NOW() WHERE column_id = 131931;
UPDATE k.column_registry SET column_purpose = $cp$Target social platform (FK t.5.0_social_platform.platform_code). Observed values: facebook (135), instagram (104), linkedin (43), youtube (2).$cp$, updated_at = NOW() WHERE column_id = 132840;
UPDATE k.column_registry SET column_purpose = $cp$Queue-row state managed by the publisher Edge Function. Observed values: queued (default — eligible for next poll), published (terminal success), dead (terminal failure after retries), skipped (publish_disabled or similar admin gate). Code also writes throttled and held during processing flow.$cp$, updated_at = NOW() WHERE column_id = 133750;
UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time the queue row is eligible for the next publish attempt. publisher polls for status='queued' AND scheduled_for <= NOW(); throttling and back-off paths in publisher push this forward (e.g. min_gap, max_per_day, image-pending hold, error backoff).$cp$, updated_at = NOW() WHERE column_id = 134661;
UPDATE k.column_registry SET column_purpose = $cp$Number of publish attempts made for this row. Used by the retry-exhaustion path that transitions status to dead.$cp$, updated_at = NOW() WHERE column_id = 135573;
UPDATE k.column_registry SET column_purpose = $cp$Free-text last-error message captured by publisher. Includes structured prefixes such as 'throttled:max_per_day:N', 'throttled:min_gap:Nm', 'invalid_facebook_token', 'carousel_waiting_for_image_worker:Nm_elapsed:status=...', 'image_pending:Nm', 'dry_run_ok', or the underlying exception message truncated to 4000 chars.$cp$, updated_at = NOW() WHERE column_id = 136486;
UPDATE k.column_registry SET column_purpose = $cp$Optimistic-lock acquire timestamp set by the publisher when it claims the row, cleared on terminal/throttled/error transitions. NULL when unclaimed.$cp$, updated_at = NOW() WHERE column_id = 137400;
UPDATE k.column_registry SET column_purpose = $cp$Worker-instance identifier holding the optimistic lock alongside locked_at. Currently NULL on all rows in observed traffic; publisher writes locked_by=null on every status update path.$cp$, updated_at = NOW() WHERE column_id = 138315;
UPDATE k.column_registry SET column_purpose = $cp$Row creation timestamp (default now()).$cp$, updated_at = NOW() WHERE column_id = 139231;
UPDATE k.column_registry SET column_purpose = $cp$Last-modified timestamp; advanced on each UPDATE to the row (status transitions, lock acquire/release, throttle, error backoff).$cp$, updated_at = NOW() WHERE column_id = 140148;
UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time of the most recent error event recorded in last_error. NULL until the first error.$cp$, updated_at = NOW() WHERE column_id = 187608;
UPDATE k.column_registry SET column_purpose = $cp$Reason the queue row entered status=dead. Observed values: m8_m11_bloat_window_2026-04-17 (39 rows — bloat window for digest items in M8/M11 batch), pre_m8_stale_2026-04-09 (2 rows — pre-M8 items left stale at cutover), and free-text manual notes for orphaned items resolved by hand. NULL on non-dead rows.$cp$, updated_at = NOW() WHERE column_id = 244989;
UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time an operator marked a dead queue row as reviewed and excluded from doctor alerting (the 2 Apr 2026 extension documented in the table purpose). Dead rows are never deleted — acknowledged_at flags them as formally closed without removing the audit trail.$cp$, updated_at = NOW() WHERE column_id = 1025224;
UPDATE k.column_registry SET column_purpose = $cp$Free-text identifier of who acknowledged the dead row (operator name or short note describing the manual resolution). Pairs with acknowledged_at; NULL on non-acknowledged rows.$cp$, updated_at = NOW() WHERE column_id = 1025223;

-- ── Atomic count-delta verification (Lesson #38) ─────────────────────────────────
SELECT COUNT(*)::int INTO post_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name = 'm'
  AND tr.table_name IN ('post_format_performance_per_publish', 'post_performance', 'post_publish_queue')
  AND (cr.column_purpose IS NULL
       OR cr.column_purpose = ''
       OR cr.column_purpose = 'PENDING_DOCUMENTATION'
       OR cr.column_purpose ILIKE 'TODO%');

IF pre_count - post_count <> expected_delta THEN
  RAISE EXCEPTION 'post-publish observability column-purpose verification failed: expected delta %, got % (pre=%, post=%). Expected post=3 (3 LOW-confidence rows escalated to followup file).',
    expected_delta, pre_count - post_count, pre_count, post_count;
END IF;

RAISE NOTICE 'post-publish observability column-purpose verification passed: delta % (pre=%, post=%, 3 LOW-confidence rows correctly retained as undocumented for joint operator+chat session).',
  pre_count - post_count, pre_count, post_count;

END;
$audit_post_publish_obs$;
