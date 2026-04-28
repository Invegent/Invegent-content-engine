-- F-002 LOW-confidence joint resolution
-- Resolves the 6 LOW-confidence rows deferred during F-002 Phase A/B/C (28 Apr 2026)
-- via joint operator + chat session, 28 Apr 2026 evening (4th shift).
--
-- See followup files (kept as historical record):
--   docs/audit/decisions/f002_p1_low_confidence_followup.md (Rows 1-4)
--   docs/audit/decisions/f002_p2_low_confidence_followup.md (Row 5)
--   docs/audit/decisions/f002_p3_low_confidence_followup.md (Row 6)
--
-- Decisions:
--   Row 1 (c.brand_avatar.avatar_gen_status): A - reserved-infra (HeyGen)
--   Row 2 (c.client_avatar_profile.avatar_status): B - DEFERRED 2026-10-31
--   Row 3 (c.client_brand_asset.asset_type): A - reserved-infra (asset-mgmt UI)
--   Row 4 (f.raw_metric_point.entity_type): A - reserved-infra (Phase 2.1)
--   Row 5 (c.client_match_weights): B - quality is separate dimension; correct
--          table_purpose to fitness/quality/recency; tighten fitness_weight +
--          recency_weight purposes for consistency.
--   Row 6 (3 payload_hash columns): SPLIT -
--          f.raw_content_item.payload_hash: DEPRECATED (DEFERRED 2027-04-30)
--          f.raw_metric_point.payload_hash: KEEP designed-but-unimplemented
--          f.raw_timeseries_point.payload_hash: KEEP designed-but-unimplemented
--
-- Coverage delta: c+f schemas 20.2% -> 21.1% (136/674 -> 142/674)
-- Per-schema: c 22.3% -> 23.2%; f 14.9% -> 15.9%

-- Row 1: c.brand_avatar.avatar_gen_status
UPDATE k.column_registry cr
SET column_purpose = 'Lifecycle status of the HeyGen avatar generation job. All rows currently hold ''empty'' (never-generated state); the full enum is reserved for when the video pipeline activates and the HeyGen worker writes ''pending'' / ''generating'' / ''ready'' / ''failed'' transitions. Confirm enum against worker code at first activation.',
    updated_at = NOW()
FROM k.table_registry tr
WHERE cr.table_id = tr.table_id
  AND tr.schema_name = 'c'
  AND tr.table_name = 'brand_avatar'
  AND cr.column_name = 'avatar_gen_status';

-- Row 2: c.client_avatar_profile.avatar_status
UPDATE k.column_registry cr
SET column_purpose = 'DEFERRED until 2026-10-31: state machine for production avatar+voice profile not finalised until first video-content client onboarded. Likely ''pending'' / ''consent_signed'' / ''active'' but consent flow and full enum unknown.',
    updated_at = NOW()
FROM k.table_registry tr
WHERE cr.table_id = tr.table_id
  AND tr.schema_name = 'c'
  AND tr.table_name = 'client_avatar_profile'
  AND cr.column_name = 'avatar_status';

-- Row 3: c.client_brand_asset.asset_type
UPDATE k.column_registry cr
SET column_purpose = 'Asset classification (''logo'' / ''banner'' / ''avatar'') for client brand assets. Reserved infrastructure for the planned asset-management UI; populate when asset-management UI ships. Not currently the source of truth for image-worker''s Creatomate render slots.',
    updated_at = NOW()
FROM k.table_registry tr
WHERE cr.table_id = tr.table_id
  AND tr.schema_name = 'c'
  AND tr.table_name = 'client_brand_asset'
  AND cr.column_name = 'asset_type';

-- Row 4: f.raw_metric_point.entity_type
UPDATE k.column_registry cr
SET column_purpose = 'Type of entity a metric describes (''page'' / ''post'' / ''account'' / ''video''); combined with entity_key to identify the metric subject. Reserved column - populated once Phase 2.1 (Facebook Insights back-feed via insights-worker) activates. Enum confirmed at first row insert.',
    updated_at = NOW()
FROM k.table_registry tr
WHERE cr.table_id = tr.table_id
  AND tr.schema_name = 'f'
  AND tr.table_name = 'raw_metric_point'
  AND cr.column_name = 'entity_type';

-- Row 5a: c.client_match_weights table_purpose (correct factor set per R5 matching spec)
UPDATE k.table_registry
SET purpose = 'Per-client weights applied to signal scoring in the R5 matching layer (fitness / quality / recency). Default scoring uses non-client-specific configuration when no override row exists.',
    updated_at = NOW()
WHERE schema_name = 'c'
  AND table_name = 'client_match_weights';

-- Row 5b: c.client_match_weights.fitness_weight (remove vertical-fit conflation)
UPDATE k.column_registry cr
SET column_purpose = 'Weight applied to the fitness scoring factor in the R5 matching layer. Unit: dimensionless multiplier. No populated rows; default scoring applies when no client-specific override exists.',
    updated_at = NOW()
FROM k.table_registry tr
WHERE cr.table_id = tr.table_id
  AND tr.schema_name = 'c'
  AND tr.table_name = 'client_match_weights'
  AND cr.column_name = 'fitness_weight';

-- Row 5c: c.client_match_weights.quality_weight (NEW - was NULL)
UPDATE k.column_registry cr
SET column_purpose = 'Weight applied to the quality scoring factor in the R5 matching layer. Unit: dimensionless multiplier. Quality is a separate dimension from fitness and recency. No populated rows; default scoring applies when no client-specific override exists.',
    updated_at = NOW()
FROM k.table_registry tr
WHERE cr.table_id = tr.table_id
  AND tr.schema_name = 'c'
  AND tr.table_name = 'client_match_weights'
  AND cr.column_name = 'quality_weight';

-- Row 5d: c.client_match_weights.recency_weight (replace bundler with R5)
UPDATE k.column_registry cr
SET column_purpose = 'Weight applied to the recency scoring factor in the R5 matching layer (how recently the source item was published). Unit: dimensionless multiplier. No populated rows; default scoring applies when no client-specific override exists.',
    updated_at = NOW()
FROM k.table_registry tr
WHERE cr.table_id = tr.table_id
  AND tr.schema_name = 'c'
  AND tr.table_name = 'client_match_weights'
  AND cr.column_name = 'recency_weight';

-- Row 6a: f.raw_content_item.payload_hash (DEPRECATED - schedule drop)
UPDATE k.column_registry cr
SET column_purpose = 'DEFERRED until 2027-04-30: deprecated. Designed as a payload-content dedup key alongside url_hash, but ingest-worker never implemented payload-hash dedup. 0 of 2,124+ rows populated; deduplication is achieved via url_hash and downstream content_hash on f.canonical_content_body. Schedule column-drop in future schema cleanup pass.',
    updated_at = NOW()
FROM k.table_registry tr
WHERE cr.table_id = tr.table_id
  AND tr.schema_name = 'f'
  AND tr.table_name = 'raw_content_item'
  AND cr.column_name = 'payload_hash';

-- Row 6b: f.raw_metric_point.payload_hash (KEEP - tighten with currently unwritten)
UPDATE k.column_registry cr
SET column_purpose = 'Hash digest of f.raw_metric_point.payload, designed as a deduplication key for re-ingest. Currently unwritten - designed but not implemented; reassess when analytics ingestion activates and Phase 2.1 insights-worker begins populating raw_metric_point.',
    updated_at = NOW()
FROM k.table_registry tr
WHERE cr.table_id = tr.table_id
  AND tr.schema_name = 'f'
  AND tr.table_name = 'raw_metric_point'
  AND cr.column_name = 'payload_hash';

-- Row 6c: f.raw_timeseries_point.payload_hash (KEEP - tighten with currently unwritten)
UPDATE k.column_registry cr
SET column_purpose = 'Hash digest of f.raw_timeseries_point.payload, designed as a deduplication key for re-ingest. Currently unwritten - designed but not implemented; reassess when analytics ingestion activates and time-series infrastructure begins populating raw_timeseries_point.',
    updated_at = NOW()
FROM k.table_registry tr
WHERE cr.table_id = tr.table_id
  AND tr.schema_name = 'f'
  AND tr.table_name = 'raw_timeseries_point'
  AND cr.column_name = 'payload_hash';
