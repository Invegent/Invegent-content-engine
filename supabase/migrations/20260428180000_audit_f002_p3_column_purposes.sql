-- Audit closure: F-2026-04-28-D-002 — P3 column purposes (JSONB / payload-named)
-- Source: docs/audit/snapshots/columns/2026-04-28-p3-proposals.md
-- Total UPDATEs: 27 (HIGH 15 + MEDIUM 12)
-- DEFERRED (LOW, NOT in this migration): 1 — f.raw_content_item.payload_hash
--   (designed-but-unimplemented; 2123 payload rows, 0 hash rows. Operator decision needed.)
-- EXCLUDED from inventory: c.client_format_config.config_id (UUID surrogate key, P6).
--
-- DRAFT — DO NOT APPLY DIRECTLY.
-- Per Phase A and B precedent, chat reviews and applies a corrected version
-- via Supabase MCP per D170 with a "_corrected" suffix and fresh timestamp.
--
-- Idempotent: each UPDATE matches by (table_id, column_name).

-- ── Group A — Brand / persona configuration ──────────────────────────────
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

-- ── Group B — Per-table config slots ─────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Catchall extended-settings JSONB on the master client record. Observed top-level key in current data: ai (object). Used to carry settings that haven't earned their own typed column yet.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client') AND column_name = 'profile';

UPDATE k.column_registry SET column_purpose = $cp$Per-platform config slot on the client_channel row. JSONB object expected for platform-specific settings; sampled rows hold an empty object, suggesting platform-specific keys are added when needed but no client currently has any.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_channel') AND column_name = 'config';

UPDATE k.column_registry SET column_purpose = $cp$Bundler scope-level settings for this client's digest policy. JSONB object with observed keys fallback_post_type (string — post type to use when no items qualify for the bundle) and fallback_when_body_missing (boolean — whether the fallback applies to body-missing items).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_digest_policy') AND column_name = 'scope';

UPDATE k.column_registry SET column_purpose = $cp$Output field schema for AI-generated drafts on this client x platform. JSONB object with observed keys body, title (each a string typically holding the canonical field name), and meta (object with platform-specific extras such as alt-text or hashtag slots).$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_platform_profile') AND column_name = 'output_fields';

UPDATE k.column_registry SET column_purpose = $cp$Source-type-specific configuration. JSONB object whose key set varies by source_type_code (rss_app/rss_native sources hold feed_url; email_newsletter holds Gmail label settings; youtube_channel holds handle/credential references). Polled by ingest-worker per row.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'feed_source') AND column_name = 'config';

-- ── Group C — Onboarding form ────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Captured submission body from the onboarding form. JSONB object whose top-level keys reflect the form sections submitted; observed keys in the one populated row are brand_scan_result and ai_profile_scan_result (each an object holding scan output). Shape may broaden as the onboarding form evolves.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'onboarding_submission') AND column_name = 'form_data';

UPDATE k.column_registry SET column_purpose = $cp$Submission-time record of fields the operator flagged as missing or incomplete. JSONB array of field names is the expected shape (matches the onboarding back-and-forth pattern); no rows populated yet.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'onboarding_submission') AND column_name = 'missing_fields';

-- ── Group D — Series content ─────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Approved series outline as a JSONB array (one element per planned episode). Length aligns with c.content_series.episode_count (observed 3-5). Each element is an object describing the episode's angle, hook, and recommended format — element-level shape not captured here as it is rendered via c.content_series_episode rows.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'content_series') AND column_name = 'outline_json';

UPDATE k.column_registry SET column_purpose = $cp$Per-platform draft variations for this episode. JSONB object keyed by platform code (observed key: facebook; other platforms appear when the episode targets them), each value typically holding draft body text. Distinct from the canonical post_draft_id which links to a single approved draft.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'content_series_episode') AND column_name = 'platform_drafts';

-- ── Group E — Audit / log payloads ───────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Pre-change value of the toggled field, captured as JSONB. Stage 2.1 RPC writes scalars (text mode values, booleans) so the top-level type is typically 'string', 'boolean', or 'null' rather than an object — the JSONB type widens this column to accept any future field type.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile_audit') AND column_name = 'old_value';

UPDATE k.column_registry SET column_purpose = $cp$Post-change value of the toggled field, captured as JSONB. Stage 2.1 RPC writes scalars (text mode values, booleans) so the top-level type is typically 'string', 'boolean', or 'null' rather than an object — the JSONB type widens this column to accept any future field type.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile_audit') AND column_name = 'new_value';

UPDATE k.column_registry SET column_purpose = $cp$Structured error payload captured when an ingest item fails. JSONB object; observed keys (code, message, details, hint) match the PostgrestError shape — keys differ when the error originates outside Postgres-RPC sources.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'ingest_error_log') AND column_name = 'error_detail';

-- ── Group F — Raw payload dumps ──────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Full raw API or RSS response for the ingested item, captured before normalisation. JSONB object whose key set varies by source. Observed keys in a sampled rss row include guid, link, title, published_at; other source types may surface different keys. Append-only — never updated after insert.$cp$, updated_at = NOW()
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

UPDATE k.column_registry SET column_purpose = $cp$Raw upstream metadata for the analysed video (e.g. YouTube API video response). JSONB object whose key set tracks the upstream API response.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'video_analysis') AND column_name = 'raw_metadata';
