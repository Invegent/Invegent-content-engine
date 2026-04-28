-- Audit closure: F-2026-04-28-D-002 — P3 column purposes (JSONB / payload-named)
-- Source: docs/audit/snapshots/columns/2026-04-28-p3-proposals.md
-- Corrections per chat sanity-check + ChatGPT review of CC's Phase C draft (commit 609ad5c):
--   * 9 row wordings edited; verification uses count delta (Lesson #38).
-- Applied: 2026-04-28 evening via Supabase MCP (per D170).
-- Supersedes CC draft at supabase/migrations/20260428180000_audit_f002_p3_column_purposes.sql.
--
-- Edits made:
--   * c.client_channel.config: rewrite (HIGH→MEDIUM); chat sanity-check found YouTube OAuth credential
--     storage in 2 of 4 rows, not "designed slot" as CC claimed
--   * c.client.profile: rewrite (MEDIUM); chat sanity-check found WordPress publish credentials, not
--     just `{ ai: ... }` as CC claimed
--   * f.video_analysis.raw_metadata: rewrite (MEDIUM); chat sanity-check found 2 keys (hasDataApi,
--     thumbnailUrl) — sparse, NOT "raw upstream metadata / key set tracks upstream API response"
--   * c.client_publish_profile_audit.old_value/new_value: JSONB scalars (boolean/string/null) per
--     observed distribution, not just "string"
--   * f.feed_source.config: removed "Polled by ingest-worker per row" code-path claim
--   * f.raw_content_item.payload: removed "Append-only — never updated after insert" assertion
--     (unverified by constraint)
--   * c.content_series.outline_json: softened element-shape claim (HIGH→MEDIUM); element-level shape
--     was not actually sampled
--   * c.client_platform_profile.output_fields: softened "alt-text or hashtag slots" inferred meta shape
--
-- Coverage delta: c+f schemas 109 → 136 documented (16.2% → 20.2%).
-- F-002 transitions to closed-action-taken on this apply.

DO $audit_phase_c$
DECLARE
  expected_delta CONSTANT integer := 27;
  before_count integer;
  after_count integer;
BEGIN

SELECT COUNT(*)::int INTO before_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name IN ('c','f')
  AND cr.column_purpose IS NOT NULL
  AND cr.column_purpose <> ''
  AND cr.column_purpose <> 'PENDING_DOCUMENTATION'
  AND cr.column_purpose NOT ILIKE 'TODO%';

-- ── Group A — Brand / persona configuration ────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$List of image URLs for the synthetic avatar (one entry per generated still or pose). JSONB array of strings is the expected shape; no rows have been populated yet.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'brand_avatar') AND column_name = 'image_url_list';

UPDATE k.column_registry SET column_purpose = $cp$Persona description fields used as the brief for synthetic avatar generation. JSONB object with observed keys age, name, pose, style, gender, ethnicity, appearance, orientation — each a string. Iteratively refined via brief_version on the same row.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'brand_stakeholder') AND column_name = 'character_brief';

UPDATE k.column_registry SET column_purpose = $cp$Per-client persona description for legacy AI generation. JSONB object with observed keys tone (string), style_notes (array of strings), presenter_name (string). Legacy table; superseded by c.client_brand_profile.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_ai_profile') AND column_name = 'persona';

UPDATE k.column_registry SET column_purpose = $cp$Content rules for legacy AI generation. JSONB object with observed keys must (array of required behaviours), must_not (array of forbidden patterns), disclaimer_rules (object describing when and what disclaimers to attach). Legacy table; superseded by c.client_brand_profile.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_ai_profile') AND column_name = 'guidelines';

UPDATE k.column_registry SET column_purpose = $cp$Per-platform rule overrides for legacy AI generation. JSONB object keyed by platform code (observed: youtube, facebook), each value an object holding platform-specific output constraints. Legacy table; superseded by c.client_platform_profile.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_ai_profile') AND column_name = 'platform_rules';

UPDATE k.column_registry SET column_purpose = $cp$Tool-availability policy for legacy AI generation. JSONB object with observed keys browsing (boolean), allowed_tools (array of tool names), media_generation (object with sub-policies). Legacy table; superseded by per-feature flags on c.client_brand_profile.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_ai_profile') AND column_name = 'tool_policy';

UPDATE k.column_registry SET column_purpose = $cp$Sampling parameters for legacy AI generation. JSONB object with observed keys temperature (number, sampling temperature) and max_output_tokens (number, completion-token cap). Legacy table; superseded by typed columns on c.client_brand_profile.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_ai_profile') AND column_name = 'generation';

UPDATE k.column_registry SET column_purpose = $cp$Metadata for the brand asset (e.g. dimensions, file format, source provenance). JSONB object expected; no rows populated yet.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_brand_asset') AND column_name = 'asset_meta';

-- ── Group B — Per-table config slots ────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Catchall extended-settings JSONB on the master client record. Observed shape includes AI profile configuration under ai plus WordPress publishing settings/credentials such as wp_* keys and website_publish_enabled. Used for client-level settings that have not yet been normalised into typed columns.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client') AND column_name = 'profile';

UPDATE k.column_registry SET column_purpose = $cp$Platform-specific connection configuration for the client channel. Observed shapes vary by platform: YouTube rows may carry OAuth/channel connection fields such as channel ID and refresh-token material, while Facebook, Instagram, and LinkedIn rows may hold an empty object because their auth/config lives elsewhere. JSONB object; key set varies by platform.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_channel') AND column_name = 'config';

UPDATE k.column_registry SET column_purpose = $cp$Bundler scope-level settings for this client's digest policy. JSONB object with observed keys fallback_post_type (string — post type to use when no items qualify for the bundle) and fallback_when_body_missing (boolean — whether the fallback applies to body-missing items).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_digest_policy') AND column_name = 'scope';

UPDATE k.column_registry SET column_purpose = $cp$Output field schema for generated drafts on this client x platform. JSONB object with observed keys body, title, and meta; body/title identify draft text fields while meta carries platform-specific extra fields.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_platform_profile') AND column_name = 'output_fields';

UPDATE k.column_registry SET column_purpose = $cp$Source-type-specific configuration. JSONB object whose key set varies by source_type_code; RSS sources hold feed URL fields, email newsletter sources hold mail-label settings, and YouTube sources hold channel/handle or credential-reference settings. Used by downstream ingestion/discovery logic to interpret the source row.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'feed_source') AND column_name = 'config';

-- ── Group C — Onboarding form ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Captured submission body from the onboarding form. JSONB object whose top-level keys reflect the form sections submitted; observed keys in the one populated row are brand_scan_result and ai_profile_scan_result (each an object holding scan output). Shape may broaden as the onboarding form evolves.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'onboarding_submission') AND column_name = 'form_data';

UPDATE k.column_registry SET column_purpose = $cp$Submission-time record of fields the operator flagged as missing or incomplete. JSONB array of field names is the expected shape (matches the onboarding back-and-forth pattern); no rows populated yet.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'onboarding_submission') AND column_name = 'missing_fields';

-- ── Group D — Series content ──────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Approved series outline as a JSONB array, typically one element per planned episode. Length aligns with c.content_series.episode_count (observed 3-5). Element-level shape should be read from current series-generation output before documenting specific keys.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'content_series') AND column_name = 'outline_json';

UPDATE k.column_registry SET column_purpose = $cp$Per-platform draft variations for this episode. JSONB object keyed by platform code (observed key: facebook; other platforms appear when the episode targets them), each value typically holding draft body text. Distinct from the canonical post_draft_id which links to a single approved draft.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'content_series_episode') AND column_name = 'platform_drafts';

-- ── Group E — Audit / log payloads ──────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Pre-change value of the toggled field, captured as a JSONB scalar. Observed/expected scalar shapes include string, boolean, and null depending on the changed field; the JSONB type allows future audited fields with non-scalar values.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile_audit') AND column_name = 'old_value';

UPDATE k.column_registry SET column_purpose = $cp$Post-change value of the toggled field, captured as a JSONB scalar. Observed/expected scalar shapes include string, boolean, and null depending on the changed field; the JSONB type allows future audited fields with non-scalar values.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile_audit') AND column_name = 'new_value';

UPDATE k.column_registry SET column_purpose = $cp$Structured error payload captured when an ingest item fails. JSONB object; observed keys (code, message, details, hint) match the PostgrestError shape — keys differ when the error originates outside Postgres-RPC sources.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'ingest_error_log') AND column_name = 'error_detail';

-- ── Group F — Raw payload dumps ────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Raw API or RSS item payload captured before normalisation. JSONB object whose key set varies by source type; sampled RSS rows include fields such as guid, link, title, and published_at.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'raw_content_item') AND column_name = 'payload';

-- NOTE: f.raw_content_item.payload_hash is DEFERRED (LOW confidence) — see proposals file.

UPDATE k.column_registry SET column_purpose = $cp$Raw analytics-source response for the metric data point. JSONB object expected, structure varies by source. No rows populated yet — analytics ingestion is reserved for future activation.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'raw_metric_point') AND column_name = 'payload';

UPDATE k.column_registry SET column_purpose = $cp$Hash of f.raw_metric_point.payload for deduplication on re-ingest. Unit: hash digest as text. No rows populated yet.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'raw_metric_point') AND column_name = 'payload_hash';

UPDATE k.column_registry SET column_purpose = $cp$Raw trend-source response for the time-series data point (e.g. Google Trends API response). JSONB object expected. No rows populated yet — time-series ingestion is reserved for future activation.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'raw_timeseries_point') AND column_name = 'payload';

UPDATE k.column_registry SET column_purpose = $cp$Hash of f.raw_timeseries_point.payload for deduplication on re-ingest. Unit: hash digest as text. No rows populated yet.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'raw_timeseries_point') AND column_name = 'payload_hash';

UPDATE k.column_registry SET column_purpose = $cp$Structural breakdown of the analysed video as a JSONB array (typically one element per scene or beat). Element-level shape not sampled here — operator confirmation would lift this to HIGH.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'video_analysis') AND column_name = 'content_structure';

UPDATE k.column_registry SET column_purpose = $cp$Selected raw metadata retained for the analysed video. Observed JSONB object shape includes hasDataApi and thumbnailUrl. This is not a full upstream YouTube API response; the sparse shape suggests the analyser persists only the metadata needed for downstream video classification or display.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'video_analysis') AND column_name = 'raw_metadata';

-- Post-apply verification — count delta (Lesson #38)
SELECT COUNT(*)::int INTO after_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name IN ('c','f')
  AND cr.column_purpose IS NOT NULL
  AND cr.column_purpose <> ''
  AND cr.column_purpose <> 'PENDING_DOCUMENTATION'
  AND cr.column_purpose NOT ILIKE 'TODO%';

IF after_count - before_count <> expected_delta THEN
  RAISE EXCEPTION 'F-002 P3 verification failed: expected delta %, got % (before=%, after=%)',
    expected_delta, after_count - before_count, before_count, after_count;
END IF;

RAISE NOTICE 'F-002 P3 verification passed: delta % (before=%, after=%)', after_count - before_count, before_count, after_count;

END;
$audit_phase_c$;
