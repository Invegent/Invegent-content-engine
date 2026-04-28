-- Audit closure: F-2026-04-28-D-001 (HIGH)
-- Backfill table-level purposes for 31 Phase B / slot-driven tables created 22-27 Apr 2026.
-- Source: chat closure session, operator-approved.
-- Coverage: 72.0% -> 87.5% overall after this migration.

-- Slot-driven core
UPDATE k.table_registry SET purpose = 'Forward-scheduled publish slots per client x platform; the unit of work driving the 70-forward materialised horizon. Status transitions: future -> pending_fill -> fill_in_progress -> filled -> published.', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'slot';

UPDATE k.table_registry SET purpose = 'Per-vertical pool of canonical content eligible for slot fill, with fitness scores, dedup tracking, and reuse counts. The pool the slot-fill function selects from.', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'signal_pool';

UPDATE k.table_registry SET purpose = 'Audit trail of every slot fill attempt, capturing signals considered, scoring path, and outcome (success / threshold-relaxed / recovery-exhausted).', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'slot_fill_attempt';

UPDATE k.table_registry SET purpose = 'Operator alerts from the slot-driven system (cron heartbeat missing, slot recovery exhausted, critical window breach). Acknowledged via dashboard or chat.', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'slot_alerts';

UPDATE k.table_registry SET purpose = 'Audit trail of changes to c.client_publish_profile (mode, r6_enabled, publish_enabled toggles per client x platform). Captures actor + before/after state.', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'client_publish_profile_audit';

-- Pool & slot health views
UPDATE k.table_registry SET purpose = 'View surfacing breaking-news signals eligible for urgent slot fills outside the normal scheduled fill cadence.', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'hot_breaking_pool';

UPDATE k.table_registry SET purpose = 'View of slots inside the critical fill window (close to scheduled_publish_at without a successful fill).', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'slots_in_critical_window';

UPDATE k.table_registry SET purpose = 'View of evergreen vs reactive content mix per client x platform over a rolling 7-day window.', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'evergreen_ratio_7d';

UPDATE k.table_registry SET purpose = 'View of pool depth vs slot horizon demand per client x vertical, used to flag thin-pool risks.', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'vw_match_pool_adequacy';

-- Cron health observability
UPDATE k.table_registry SET purpose = 'Heartbeat record per cron job execution (jobid, ran_at, duration, outcome).', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'cron_health_check';

UPDATE k.table_registry SET purpose = 'Periodic snapshot of cron job state (active, last_run, failure_count) for observability.', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'cron_health_snapshot';

UPDATE k.table_registry SET purpose = 'Alerts raised from cron health checks (heartbeat missed, repeated failures).', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'cron_health_alert';

UPDATE k.table_registry SET purpose = 'View summarising current cron health across all jobs.', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'cron_health_status';

-- Content classification & decision policies
UPDATE k.table_registry SET purpose = 'Versioned classification taxonomy for canonical content (breaking / evergreen / deep-dive / etc.). Per D175 versioned ref pattern.', updated_at = NOW()
WHERE schema_name = 't' AND table_name = 'content_class';

UPDATE k.table_registry SET purpose = 'Rule definitions assigning content classes to canonicals based on signal patterns.', updated_at = NOW()
WHERE schema_name = 't' AND table_name = 'content_class_rule';

UPDATE k.table_registry SET purpose = 'Versioned fitness scores per (content_class x platform x format) on the 0..100 scale per D177.', updated_at = NOW()
WHERE schema_name = 't' AND table_name = 'class_format_fitness';

UPDATE k.table_registry SET purpose = 'View resolving effective fitness after applying client-level overrides from c.client_class_fitness_override.', updated_at = NOW()
WHERE schema_name = 't' AND table_name = 'vw_effective_class_format_fitness';

UPDATE k.table_registry SET purpose = 'Per-class rules defining how fast content of that class loses freshness (breaking decays in hours; evergreen barely decays).', updated_at = NOW()
WHERE schema_name = 't' AND table_name = 'class_freshness_rule';

UPDATE k.table_registry SET purpose = 'System-default deduplication policy: what counts as a duplicate canonical (URL match, title similarity, source overlap).', updated_at = NOW()
WHERE schema_name = 't' AND table_name = 'dedup_policy';

UPDATE k.table_registry SET purpose = 'Fitness penalty curve applied as content gets reused, preventing the same signal being slotted repeatedly.', updated_at = NOW()
WHERE schema_name = 't' AND table_name = 'reuse_penalty_curve';

UPDATE k.table_registry SET purpose = 'Per-format minimum quality thresholds (e.g. video must have asset; carousel must have 3+ images).', updated_at = NOW()
WHERE schema_name = 't' AND table_name = 'format_quality_policy';

UPDATE k.table_registry SET purpose = 'Per-format synthesis behaviour (single-signal vs multi-signal, max source count).', updated_at = NOW()
WHERE schema_name = 't' AND table_name = 'format_synthesis_policy';

UPDATE k.table_registry SET purpose = 'Library of evergreen content templates available for slot fills when the reactive pool is thin.', updated_at = NOW()
WHERE schema_name = 't' AND table_name = 'evergreen_library';

UPDATE k.table_registry SET purpose = 'System-default format mix per platform (% video / carousel / single-image / text).', updated_at = NOW()
WHERE schema_name = 't' AND table_name = 'platform_format_mix_default';

UPDATE k.table_registry SET purpose = 'View validating that platform_format_mix_default rows sum to 100 percent per platform.', updated_at = NOW()
WHERE schema_name = 't' AND table_name = 'platform_format_mix_default_check';

-- Per-client policy overrides
UPDATE k.table_registry SET purpose = 'Per-client overrides to t.class_format_fitness (e.g. NDIS Yarns may prefer educational over breaking).', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'client_class_fitness_override';

UPDATE k.table_registry SET purpose = 'Per-client overrides to t.dedup_policy for clients with stricter dedup requirements.', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'client_dedup_policy';

UPDATE k.table_registry SET purpose = 'Per-client weights applied to signal scoring (vertical fit vs recency vs freshness).', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'client_match_weights';

UPDATE k.table_registry SET purpose = 'Per-client overrides to t.platform_format_mix_default.', updated_at = NOW()
WHERE schema_name = 'c' AND table_name = 'client_format_mix_override';

-- Performance feedback & mapping
UPDATE k.table_registry SET purpose = 'Per-publish format performance record (engagement vs format), feeding back into format quality scoring.', updated_at = NOW()
WHERE schema_name = 'm' AND table_name = 'post_format_performance_per_publish';

UPDATE k.table_registry SET purpose = 'Per-canonical many-to-many vertical assignments resolved by ingest classification (one canonical can map to NDIS + au-disability-policy simultaneously).', updated_at = NOW()
WHERE schema_name = 'f' AND table_name = 'canonical_vertical_map';
