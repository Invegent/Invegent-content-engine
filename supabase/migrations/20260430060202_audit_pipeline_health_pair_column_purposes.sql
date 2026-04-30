-- Audit: pipeline-health pair column purposes — m.pipeline_health_log,
--        m.cron_health_snapshot
-- Brief: docs/briefs/pipeline-health-pair-column-purposes.md
-- Pre-flight: 37 undocumented column rows total (21 + 16). Confidence per the
--             brief's HIGH/LOW gate, with each column traced to a producer:
--   * 21/21 HIGH on m.pipeline_health_log — m.take_pipeline_health_snapshot()
--     constructs every column. Time-window TZ confirmed AEST
--     (date_trunc('day', now() AT TIME ZONE 'Australia/Sydney')); pub_held vs
--     pub_throttled distinguished by source signal in code (image_pending
--     error vs throttled error); has_stuck_items and has_failed_images
--     derivations cited from the function body; ndis_/pp_published_today
--     are hardcoded client_id filters, called out as two-client-era vestiges.
--   * 16/16 HIGH on m.cron_health_snapshot — m.refresh_cron_health()
--     constructs every column, fully spec'd in
--     docs/briefs/2026-04-24-cron-health-monitoring-layer-1.md. failure_rate
--     unit confirmed 0..1 ratio (failed_runs::NUMERIC / total_runs).
--     latest_run_status filtered to ('succeeded','failed') in the source
--     query so observed enum is succeeded | failed (NULL when no runs).
--
-- Total: 37 HIGH (this migration) + 0 LOW. expected_delta = 37 (= 37 - 0).
--
-- Verification (Lesson #38): single atomic DO block captures pre_count of
-- NULL/empty/PENDING/TODO column_purpose rows for the two tables, runs 37
-- UPDATEs, captures post_count, asserts pre_count - post_count = 37.

DO $audit_pipeline_health_pair$
DECLARE
  expected_delta CONSTANT integer := 37;
  pre_count integer;
  post_count integer;
BEGIN

SELECT COUNT(*)::int INTO pre_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name = 'm'
  AND tr.table_name IN ('pipeline_health_log', 'cron_health_snapshot')
  AND (cr.column_purpose IS NULL
       OR cr.column_purpose = ''
       OR cr.column_purpose = 'PENDING_DOCUMENTATION'
       OR cr.column_purpose ILIKE 'TODO%');

-- ── m.pipeline_health_log (21 HIGH) ───────────────────────────────────────────────
-- Producer cited: m.take_pipeline_health_snapshot() — every column constructed
-- there. Snapshot cadence: every 30 minutes (observed snapshot_at at :00/:30
-- across 1006 distinct hours).
UPDATE k.column_registry SET column_purpose = $cp$Surrogate UUID primary key for the pipeline-health snapshot row.$cp$, updated_at = NOW() WHERE column_id = 677119;
UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time the snapshot was taken (default now() at insert; m.take_pipeline_health_snapshot is invoked on a 30-minute schedule).$cp$, updated_at = NOW() WHERE column_id = 677118;
UPDATE k.column_registry SET column_purpose = $cp$Total rows in m.post_publish_queue at snapshot_at (no status filter).$cp$, updated_at = NOW() WHERE column_id = 677117;
UPDATE k.column_registry SET column_purpose = $cp$Count of m.post_publish_queue rows with status='queued' at snapshot_at.$cp$, updated_at = NOW() WHERE column_id = 677116;
UPDATE k.column_registry SET column_purpose = $cp$Count of m.post_publish_queue rows with status='running' at snapshot_at.$cp$, updated_at = NOW() WHERE column_id = 677115;
UPDATE k.column_registry SET column_purpose = $cp$Count of m.post_publish rows with status='published' created in the 1 hour leading up to snapshot_at. Sourced from m.post_publish (the publish-attempt audit trail), not m.post_publish_queue.$cp$, updated_at = NOW() WHERE column_id = 677114;
UPDATE k.column_registry SET column_purpose = $cp$Count of m.post_publish_queue rows with status='failed' at snapshot_at.$cp$, updated_at = NOW() WHERE column_id = 677113;
UPDATE k.column_registry SET column_purpose = $cp$Count of m.post_draft rows with approval_status='needs_review' at snapshot_at. Restricted to drafts in needs_review/approved by the snapshot function so deleted/dead drafts are excluded.$cp$, updated_at = NOW() WHERE column_id = 677112;
UPDATE k.column_registry SET column_purpose = $cp$Count of m.post_draft rows with approval_status='approved' at snapshot_at.$cp$, updated_at = NOW() WHERE column_id = 677111;
UPDATE k.column_registry SET column_purpose = $cp$Count of m.post_draft rows with image_status='pending' at snapshot_at, scoped to drafts whose approval_status is approved or needs_review.$cp$, updated_at = NOW() WHERE column_id = 677110;
UPDATE k.column_registry SET column_purpose = $cp$Count of m.post_draft rows with image_status='generated' at snapshot_at, scoped to drafts whose approval_status is approved or needs_review.$cp$, updated_at = NOW() WHERE column_id = 677109;
UPDATE k.column_registry SET column_purpose = $cp$Count of m.post_draft rows with image_status='failed' at snapshot_at, scoped to drafts whose approval_status is approved or needs_review. Drives the has_failed_images flag on this same row.$cp$, updated_at = NOW() WHERE column_id = 677108;
UPDATE k.column_registry SET column_purpose = $cp$Image-worker activity counter — drafts whose updated_at fell inside the 30-minute rolling window before snapshot_at AND whose current image_status is 'generated'. Approximation: counts drafts updated in the window that ended up generated, not strictly status transitions inside the window.$cp$, updated_at = NOW() WHERE column_id = 677107;
UPDATE k.column_registry SET column_purpose = $cp$Image-worker failure counter — drafts whose updated_at fell inside the 30-minute rolling window before snapshot_at AND whose current image_status is 'failed'. Same approximation caveat as iw_generated_30m.$cp$, updated_at = NOW() WHERE column_id = 677106;
UPDATE k.column_registry SET column_purpose = $cp$Publisher success counter — m.post_publish rows with status='published' created in the 30-minute rolling window before snapshot_at.$cp$, updated_at = NOW() WHERE column_id = 677105;
UPDATE k.column_registry SET column_purpose = $cp$Publisher held counter — m.post_publish rows in the 30-minute rolling window before snapshot_at whose error message contains 'image_pending' (publish path held waiting for image-worker output). Distinct from pub_throttled_30m (rate-limit path).$cp$, updated_at = NOW() WHERE column_id = 677104;
UPDATE k.column_registry SET column_purpose = $cp$Publisher throttled counter — m.post_publish rows in the 30-minute rolling window before snapshot_at whose error message contains 'throttled' (max_per_day or min_gap throttling in the publisher Edge Function). Distinct from pub_held_30m (image-pending path).$cp$, updated_at = NOW() WHERE column_id = 677103;
UPDATE k.column_registry SET column_purpose = $cp$Posts published today (since AEST midnight) for client NDIS-Yarns (hardcoded client_id 'fb98a472-ae4d-432d-8738-2273231c1ef4'). Hardcoded per-client counter from the two-client era of ICE; will need refactoring to a generic per-client structure before adding external clients.$cp$, updated_at = NOW() WHERE column_id = 677102;
UPDATE k.column_registry SET column_purpose = $cp$Posts published today (since AEST midnight) for client Property Pulse (hardcoded client_id '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'). Hardcoded per-client counter from the two-client era of ICE; will need refactoring to a generic per-client structure before adding external clients.$cp$, updated_at = NOW() WHERE column_id = 677101;
UPDATE k.column_registry SET column_purpose = $cp$Boolean flag set when any m.post_publish_queue row has status='queued' AND scheduled_for IS NOT NULL AND scheduled_for < now() - 1 hour at snapshot time — i.e. there is at least one queued item more than 1 hour overdue.$cp$, updated_at = NOW() WHERE column_id = 677100;
UPDATE k.column_registry SET column_purpose = $cp$Boolean flag — true iff images_failed > 0 at snapshot time (any draft in approved/needs_review with image_status='failed').$cp$, updated_at = NOW() WHERE column_id = 677099;

-- ── m.cron_health_snapshot (16 HIGH) ──────────────────────────────────────────────
-- Producer cited: m.refresh_cron_health() upserts every column. Full schema
-- doc in docs/briefs/2026-04-24-cron-health-monitoring-layer-1.md. UPSERT
-- key is (jobid, window_hours); two rows per cron job (window_hours = 1 and
-- window_hours = 24). Current row count: 116 ~= 58 jobs × 2 windows.
UPDATE k.column_registry SET column_purpose = $cp$Surrogate UUID primary key for the cron-health snapshot row.$cp$, updated_at = NOW() WHERE column_id = 2813608;
UPDATE k.column_registry SET column_purpose = $cp$pg_cron job identifier (cron.job.jobid). Pairs with window_hours as the UPSERT key, so each job has one row per window.$cp$, updated_at = NOW() WHERE column_id = 2813607;
UPDATE k.column_registry SET column_purpose = $cp$pg_cron job name (cron.job.jobname). Refreshed on every snapshot from the live cron.job row.$cp$, updated_at = NOW() WHERE column_id = 2813606;
UPDATE k.column_registry SET column_purpose = $cp$Cron schedule expression for the job (cron.job.schedule, e.g. '*/5 * * * *', '5 22 * * *'). Refreshed on every snapshot.$cp$, updated_at = NOW() WHERE column_id = 2813605;
UPDATE k.column_registry SET column_purpose = $cp$Whether the pg_cron job is currently active (cron.job.active). Inactive jobs are still snapshotted but are excluded from alert raise candidates by m.refresh_cron_health.$cp$, updated_at = NOW() WHERE column_id = 2813604;
UPDATE k.column_registry SET column_purpose = $cp$Aggregation window in hours for the run-counters on this row. CHECK constraint allows 1 or 24; m.refresh_cron_health writes one row per (jobid, window_hours) pair via CROSS JOIN VALUES (1), (24).$cp$, updated_at = NOW() WHERE column_id = 2813603;
UPDATE k.column_registry SET column_purpose = $cp$Total cron.job_run_details rows for this job within the last window_hours hours, restricted to status IN ('succeeded','failed') (status='running' is excluded).$cp$, updated_at = NOW() WHERE column_id = 2813602;
UPDATE k.column_registry SET column_purpose = $cp$Count of cron.job_run_details rows with status='succeeded' for this job within the last window_hours hours.$cp$, updated_at = NOW() WHERE column_id = 2813601;
UPDATE k.column_registry SET column_purpose = $cp$Count of cron.job_run_details rows with status='failed' for this job within the last window_hours hours. Drives both failure_rate and the failure_rate_high alert raise candidate.$cp$, updated_at = NOW() WHERE column_id = 2813600;
UPDATE k.column_registry SET column_purpose = $cp$Failure rate for the window: failed_runs / total_runs as a 0..1 ratio (NUMERIC(5,4)), or 0 when total_runs = 0. NOT a percentage. The failure_rate_high alert threshold is 0.20 (20%).$cp$, updated_at = NOW() WHERE column_id = 2813599;
UPDATE k.column_registry SET column_purpose = $cp$Count of consecutive failed runs at the end of the job's run history — that is, failed runs whose start_time is later than the job's most recent succeeded run (or all failed runs if the job has never succeeded). Drives the consecutive_failures alert raise candidate (threshold: 3).$cp$, updated_at = NOW() WHERE column_id = 2813598;
UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time of the job's most recent run with status IN ('succeeded','failed'). NULL if the job has never run.$cp$, updated_at = NOW() WHERE column_id = 2813597;
UPDATE k.column_registry SET column_purpose = $cp$Status of the most recent run captured by latest_run_at. Sourced from cron.job_run_details.status filtered to ('succeeded','failed'); 'running' is excluded by the snapshot query. Observed value in current production: succeeded; NULL if the job has never run.$cp$, updated_at = NOW() WHERE column_id = 2813596;
UPDATE k.column_registry SET column_purpose = $cp$Most recent return_message captured against this job from a run with status='failed' (cron.job_run_details.return_message). NULL if the job has never had a recorded failure with a non-null return_message.$cp$, updated_at = NOW() WHERE column_id = 2813595;
UPDATE k.column_registry SET column_purpose = $cp$Wall-clock start_time of the run that produced latest_error. NULL when latest_error is NULL.$cp$, updated_at = NOW() WHERE column_id = 2813610;
UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time the snapshot row was last UPSERTed by m.refresh_cron_health (default now() at insert, advanced on each refresh tick — every 15 minutes per cron schedule cron-health-every-15m).$cp$, updated_at = NOW() WHERE column_id = 2813609;

-- ── Atomic count-delta verification (Lesson #38) ─────────────────────────────────
SELECT COUNT(*)::int INTO post_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name = 'm'
  AND tr.table_name IN ('pipeline_health_log', 'cron_health_snapshot')
  AND (cr.column_purpose IS NULL
       OR cr.column_purpose = ''
       OR cr.column_purpose = 'PENDING_DOCUMENTATION'
       OR cr.column_purpose ILIKE 'TODO%');

IF pre_count - post_count <> expected_delta THEN
  RAISE EXCEPTION 'pipeline-health pair column-purpose verification failed: expected delta %, got % (pre=%, post=%). Expected post=0 (zero LOW-confidence rows escalated).',
    expected_delta, pre_count - post_count, pre_count, post_count;
END IF;

RAISE NOTICE 'pipeline-health pair column-purpose verification passed: delta % (pre=%, post=%, 0 LOW-confidence rows — all 37 documented from producer code).',
  pre_count - post_count, pre_count, post_count;

END;
$audit_pipeline_health_pair$;
