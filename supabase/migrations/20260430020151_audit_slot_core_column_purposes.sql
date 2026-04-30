-- Audit: slot-driven core column purposes — m.slot, m.slot_fill_attempt, m.ai_job
-- Brief: queued at docs/briefs/queue.md (slot-driven core column purpose population).
-- Pre-flight: 56 undocumented column rows across the three target tables (matches expected_delta=56).
-- All 56 inferences are HIGH confidence per brief gate (table_purpose, FKs, sample
-- data from 159 slot / 179 slot_fill_attempt / 1686 ai_job rows, and the
-- m.check_pool_health() function body for pool_health_at_attempt's JSONB shape).
-- No LOW-confidence escalations.
--
-- Verification (Lesson #38, atomic per brief clarification): single DO block
-- captures pre_count of NULL/empty/PENDING/TODO column_purpose rows for the three
-- tables, runs the UPDATEs, captures post_count, asserts pre_count - post_count = 56.

DO $audit_slot_core$
DECLARE
  expected_delta CONSTANT integer := 56;
  pre_count integer;
  post_count integer;
BEGIN

SELECT COUNT(*)::int INTO pre_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name = 'm'
  AND tr.table_name IN ('slot', 'slot_fill_attempt', 'ai_job')
  AND (cr.column_purpose IS NULL
       OR cr.column_purpose = ''
       OR cr.column_purpose = 'PENDING_DOCUMENTATION'
       OR cr.column_purpose ILIKE 'TODO%');

-- ── m.slot (20 columns) ──────────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Surrogate UUID primary key for the slot row.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='slot_id';

UPDATE k.column_registry SET column_purpose = $cp$Owning client (FK c.client.client_id). One forward-scheduled slot belongs to exactly one client.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='client_id';

UPDATE k.column_registry SET column_purpose = $cp$Target social platform code for this slot. Observed values: facebook, instagram, linkedin, youtube. Aligned with t.5.0_social_platform.platform_code (no FK declared on this column).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='platform';

UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time the produced post is scheduled to publish. Drives the 70-forward materialised horizon and downstream publish queue ordering.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='scheduled_publish_at';

UPDATE k.column_registry SET column_purpose = $cp$Ordered preference list of post-format codes for this slot, populated from the publish-schedule rule that generated the slot. Observed values: image_quote, video_short_avatar; empty array means no preference (any qualifying format may fill).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='format_preference';

UPDATE k.column_registry SET column_purpose = $cp$Format actually selected at fill time, drawn from format_preference subject to format-quality and pool-health gates. NULL until the slot is filled.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='format_chosen';

UPDATE k.column_registry SET column_purpose = $cp$Earliest wall-clock time the slot is eligible to be filled. Computed as scheduled_publish_at - fill_lead_time_minutes; the fill worker ignores slots whose window has not yet opened.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='fill_window_opens_at';

UPDATE k.column_registry SET column_purpose = $cp$Lead time in minutes between fill_window_opens_at and scheduled_publish_at. Default 1440 (24 hours).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='fill_lead_time_minutes';

UPDATE k.column_registry SET column_purpose = $cp$Slot lifecycle state. Canonical transitions per table_purpose: future -> pending_fill -> fill_in_progress -> filled -> published. Observed terminal failure value: failed (set when recovery attempts are exhausted). Default 'future'.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='status';

UPDATE k.column_registry SET column_purpose = $cp$Reason the slot was abandoned or terminally failed, captured when status transitions to failed (or future skip states). Observed value: exceeded_recovery_attempts. NULL on slots that have not been skipped.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='skip_reason';

UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time the slot reached the filled state. NULL while status is future / pending_fill / fill_in_progress / failed.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='filled_at';

UPDATE k.column_registry SET column_purpose = $cp$Draft produced for this slot (FK m.post_draft.post_draft_id). Set when the slot is filled; NULL otherwise.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='filled_draft_id';

UPDATE k.column_registry SET column_purpose = $cp$Pool item IDs (m.signal_pool / canonical content) selected for this slot's fill. Empty array on unfilled slots and on slots that fill from the evergreen library (see is_evergreen, evergreen_id).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='canonical_ids';

UPDATE k.column_registry SET column_purpose = $cp$True when the slot was filled from the evergreen library rather than the canonical signal pool. False (default) for pool-driven fills and for slots not yet filled.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='is_evergreen';

UPDATE k.column_registry SET column_purpose = $cp$Selected evergreen library entry (FK t.evergreen_library.evergreen_id) when the slot is filled from evergreens. NULL otherwise.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='evergreen_id';

UPDATE k.column_registry SET column_purpose = $cp$Composite confidence score for the slot's fill, computed by m.compute_slot_confidence(fitness, distinct_sources, evergreen_ratio, pool_size). Numeric 0..1 (per docs/06_decisions.md). NULL for slots not yet scored.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='slot_confidence';

UPDATE k.column_registry SET column_purpose = $cp$Origin of the slot. Observed values: scheduled (materialised from a client_publish_schedule rule; default) and breaking (urgent fill spawned outside the regular cadence by m.try_urgent_breaking_fills).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='source_kind';

UPDATE k.column_registry SET column_purpose = $cp$Publish-schedule rule that generated the slot (FK c.client_publish_schedule.schedule_id). NULL for slots whose source_kind is breaking or otherwise not derived from a recurring schedule rule.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='schedule_id';

UPDATE k.column_registry SET column_purpose = $cp$Row creation timestamp (default now()).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='created_at';

UPDATE k.column_registry SET column_purpose = $cp$Last-modified timestamp; advanced on each UPDATE to the row.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot') AND column_name='updated_at';

-- ── m.slot_fill_attempt (16 columns) ─────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Surrogate UUID primary key for the fill-attempt audit row.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='attempt_id';

UPDATE k.column_registry SET column_purpose = $cp$Slot the attempt acted on (FK m.slot.slot_id). One slot can accumulate many attempts across recovery cycles.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='slot_id';

UPDATE k.column_registry SET column_purpose = $cp$Wall-clock time the fill attempt started. Default now() at insert.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='attempted_at';

UPDATE k.column_registry SET column_purpose = $cp$Number of pool items in scope for this attempt (the count fed into the scoring step). Always populated.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='pool_size_at_attempt';

UPDATE k.column_registry SET column_purpose = $cp$Snapshot of the scoring pool at attempt time. Observed JSONB object with keys: total_in_scope (integer, items considered), qualifying_count (integer, items above min_fitness), min_fitness (numeric, threshold applied this attempt), top_items (array of the highest-scoring pool entries with their fitness scores).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='pool_snapshot';

UPDATE k.column_registry SET column_purpose = $cp$Attempt outcome. Observed values: filled (slot moved to filled), recovered_to_pending (stuck-in-progress slot returned to pending_fill for retry), marked_failed (recovery attempts exhausted, slot terminally failed).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='decision';

UPDATE k.column_registry SET column_purpose = $cp$Reason the attempt did not fill the slot. Observed values: stuck_in_fill_in_progress_for_30_minutes_or_more (paired with decision=recovered_to_pending), exceeded_recovery_attempts (paired with decision=marked_failed). NULL when decision=filled.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='skip_reason';

UPDATE k.column_registry SET column_purpose = $cp$Pool items chosen by the attempt (subset of the pool considered). Empty array when the attempt selected an evergreen entry instead, or when the attempt did not fill.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='selected_canonical_ids';

UPDATE k.column_registry SET column_purpose = $cp$Evergreen library entry chosen for this attempt (FK t.evergreen_library.evergreen_id). NULL when the attempt selected canonical pool items or did not fill.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='selected_evergreen_id';

UPDATE k.column_registry SET column_purpose = $cp$Format chosen by the attempt, drawn from slot.format_preference and gated by format-quality thresholds. Observed values match slot.format_chosen. NULL when the attempt did not fill.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='chosen_format';

UPDATE k.column_registry SET column_purpose = $cp$True if the attempt loosened the pool-health or evergreen-ratio thresholds to make the fill possible (per cc-stage-01 design). Default false.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='threshold_relaxed';

UPDATE k.column_registry SET column_purpose = $cp$Snapshot of pool-health at attempt time, captured from m.check_pool_health(). Designed JSONB shape per the function body: keys vertical_id, total, active, high_fitness, distinct_sources, distinct_classes, fresh_48h, max_fitness, avg_fitness, health (green/yellow/red), checked_at. Currently NULL on all rows; populated once the attempt path is wired to call check_pool_health.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='pool_health_at_attempt';

UPDATE k.column_registry SET column_purpose = $cp$Client's 7-day rolling evergreen-fill ratio at attempt time, used to gate evergreen selection (per docs/briefs/2026-04-25-slot-driven-architecture-build-plan-v4.md, migration 20260426_035). Currently NULL on all rows; populated once the attempt path is wired to read the ratio.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='evergreen_ratio_at_attempt';

UPDATE k.column_registry SET column_purpose = $cp$AI synthesis job spawned by this attempt (FK m.ai_job.ai_job_id), typically a slot_fill_synthesis_v1 job that produces the draft from the selected canonical / evergreen items. NULL when the attempt did not fill.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='ai_job_id';

UPDATE k.column_registry SET column_purpose = $cp$Free-text error message captured when the attempt errored before reaching a clean decision. NULL on successful or cleanly-skipped attempts.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='error_message';

UPDATE k.column_registry SET column_purpose = $cp$Row creation timestamp (default now()). For this audit table created_at and attempted_at are equivalent in practice.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='slot_fill_attempt') AND column_name='created_at';

-- ── m.ai_job (20 columns) ────────────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Surrogate UUID primary key for the AI generation job.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='ai_job_id';

UPDATE k.column_registry SET column_purpose = $cp$Owning client. Always populated; carried alongside post_draft_id so workers can scope-check without joining.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='client_id';

UPDATE k.column_registry SET column_purpose = $cp$Originating digest run for rewrite_v1 / synth_bundle_v1 jobs (links back to the digest pipeline that selected the seed). NULL for slot_fill_synthesis_v1 jobs, which originate from a slot_fill_attempt rather than a digest run.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='digest_run_id';

UPDATE k.column_registry SET column_purpose = $cp$Originating post seed for rewrite_v1 jobs (the seed item the rewrite is built from). NULL for synthesis job types where the input is built from canonical / evergreen items rather than a single seed.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='post_seed_id';

UPDATE k.column_registry SET column_purpose = $cp$Draft produced (or to be produced) by the job. Always populated; the (post_draft_id, job_type) pair is the unique key.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='post_draft_id';

UPDATE k.column_registry SET column_purpose = $cp$Target social platform code (FK t.5.0_social_platform.platform_code). Observed values: facebook, instagram, linkedin, youtube.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='platform';

UPDATE k.column_registry SET column_purpose = $cp$Job kind. Determines how input_payload is unpacked and which prompt path the ai-worker takes. Observed values: rewrite_v1 (seed-driven rewrite of a digest item, default), synth_bundle_v1 (multi-item bundle synthesis), slot_fill_synthesis_v1 (slot-driven synthesis from canonical / evergreen items).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='job_type';

UPDATE k.column_registry SET column_purpose = $cp$Job lifecycle state. Default 'queued'. Canonical path: queued -> running -> succeeded | failed | dead. Observed terminal values: succeeded, failed, dead.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='status';

UPDATE k.column_registry SET column_purpose = $cp$Dispatch ordering for the ai-worker queue (index ix_ai_job_queue on (status, priority, created_at)). Default 100; observed values 50, 60, 100, 120 — synth_bundle_v1 is enqueued at 120, rewrite_v1 at 100; lower values are reserved for manual / urgent overrides.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='priority';

UPDATE k.column_registry SET column_purpose = $cp$Job input as JSONB; key set varies by job_type. rewrite_v1 carries digest_item, platform, match_metadata (and optionally draft / seed / title / body for partial overrides). synth_bundle_v1 carries items, bundle_group_id, seed_type, platform (and prior_seed_type when applicable). slot_fill_synthesis_v1 carries slot_id, attempt_id, canonical_ids, evergreen_id, is_evergreen, format, synthesis_mode, recency_score, fitness_score, slot_confidence, is_shadow, enqueued_at.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='input_payload';

UPDATE k.column_registry SET column_purpose = $cp$Job output as JSONB. On success the worker writes title (string), body (string), and meta (object with platform-specific extras). Empty object until the job completes; on failure may remain empty with the error captured in the error column.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='output_payload';

UPDATE k.column_registry SET column_purpose = $cp$Free-text error captured when status transitions to failed or dead. NULL on succeeded or in-flight jobs.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='error';

UPDATE k.column_registry SET column_purpose = $cp$Optimistic-lock timestamp set by the ai-worker when it claims the row, cleared on completion. Pairs with locked_by. NULL when the row is unclaimed.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='locked_at';

UPDATE k.column_registry SET column_purpose = $cp$Worker-instance identifier holding the optimistic lock (set alongside locked_at). NULL on all rows in current observed traffic — workers either complete inside the lock window without persistent locked_by writes, or the column is reserved for future multi-worker coordination.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='locked_by';

UPDATE k.column_registry SET column_purpose = $cp$Row creation timestamp (default now()). Used as the third sort key on ix_ai_job_queue so older queued jobs win ties.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='created_at';

UPDATE k.column_registry SET column_purpose = $cp$Last-modified timestamp; advanced on each UPDATE to the row (status transitions, lock acquire/release, retries).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='updated_at';

UPDATE k.column_registry SET column_purpose = $cp$Reason the job moved to status=dead (terminal failure beyond retries). Free text recorded by the worker. Observed value: openai_tpm_rate_limit_2026-04-18 (the 2026-04-18 OpenAI TPM saturation cluster). NULL on non-dead jobs.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='dead_reason';

UPDATE k.column_registry SET column_purpose = $cp$Number of times the worker has tried to run the job. Default 0; incremented on each attempt. The dead transition is keyed off this count exceeding the retry budget.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='attempts';

UPDATE k.column_registry SET column_purpose = $cp$Slot that spawned this job (FK m.slot.slot_id), for slot_fill_synthesis_v1 jobs and any future slot-driven synthesis job types. NULL for rewrite_v1 / synth_bundle_v1 jobs, which originate from the digest pipeline rather than a slot.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='slot_id';

UPDATE k.column_registry SET column_purpose = $cp$Shadow-mode flag: true means the job runs end-to-end but its output is not promoted to a published draft (used to canary a new job_type alongside the live path). Default false. Observed true on every slot_fill_synthesis_v1 row to date.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='m' AND table_name='ai_job') AND column_name='is_shadow';

-- ── Atomic count-delta verification (Lesson #38, brief clarification) ──────────────
SELECT COUNT(*)::int INTO post_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name = 'm'
  AND tr.table_name IN ('slot', 'slot_fill_attempt', 'ai_job')
  AND (cr.column_purpose IS NULL
       OR cr.column_purpose = ''
       OR cr.column_purpose = 'PENDING_DOCUMENTATION'
       OR cr.column_purpose ILIKE 'TODO%');

IF pre_count - post_count <> expected_delta THEN
  RAISE EXCEPTION 'slot-core column purpose verification failed: expected delta %, got % (pre=%, post=%)',
    expected_delta, pre_count - post_count, pre_count, post_count;
END IF;

RAISE NOTICE 'slot-core column purpose verification passed: delta % (pre=%, post=%)', pre_count - post_count, pre_count, post_count;

END;
$audit_slot_core$;
