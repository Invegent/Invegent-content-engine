# F-002 Column Proposals — P3 Structured Config (JSONB / payload-named)

**Generated:** 2026-04-28 by Claude Code (Opus 4.7)
**Phase:** C (P3 — JSONB columns + columns named payload/config/settings/metadata/options/targeting/filter)
**Total columns inventoried:** 29 — **28 effective** (1 excluded: see below)
**Confidence distribution:** HIGH 15 (54%) · MEDIUM 12 (43%) · LOW 1 (4%) — well under the >80% HIGH ceiling
**Schema-verified columns:** 28 of 28 (100%) — top-level shape captured (top_type + key→value-type map for objects; length for arrays; populated count) without dumping any payload content
**Migration target:** `supabase/migrations/{timestamp}_audit_f002_p3_column_purposes.sql` (DRAFT — chat reviews + applies a corrected version per D170)

**Forward discipline applied (Phase B+ lessons):** no code-path references ("ai-worker reads X"), no external thresholds, no arithmetic invariants, no interpretation of why a counter is 0. Shape descriptions list observed top-level keys + value types only — no payload content.

---

## Excluded from this phase

**`c.client_format_config.config_id` — uuid surrogate key.** Caught by the P3 name regex because the table_name contains "config", but it is a UUID primary key (P6 — surrogate keys, deferred per brief Section 2.2). Not in proposals or migration; flagged here so its absence isn't a mystery to a future reader of the inventory diff.

---

## Group A — Brand / persona configuration

## c.brand_avatar.image_url_list
- **Type:** jsonb · **Nullable:** true · **FK:** none
- **Populated:** 0 rows (out of 28 in the table)
- **Observed shape:** none (no rows)
- **Proposed column_purpose:** "List of image URLs for the synthetic avatar (one entry per generated still or pose). JSONB array of strings is the expected shape; no rows have been populated yet."
- **Confidence:** MEDIUM
- **Reasoning:** Name unambiguous + table_purpose mentions "image set"; shape inferred but not observed.

## c.brand_stakeholder.character_brief
- **Type:** jsonb · **Nullable:** true · **FK:** none
- **Populated:** 7 rows · **Top type:** object
- **Observed top-level keys:** `age` (string), `name` (string), `pose` (string), `style` (string), `gender` (string), `ethnicity` (string), `appearance` (string), `orientation` (string)
- **Proposed column_purpose:** "Persona description fields used as the brief for synthetic avatar generation. JSONB object with observed keys age, name, pose, style, gender, ethnicity, appearance, orientation — each a string. Iteratively refined via brief_version on the same row."
- **Confidence:** HIGH

## c.client_ai_profile.persona
- **Type:** jsonb · **Nullable:** false · **FK:** none
- **Populated:** 4 rows · **Top type:** object
- **Observed top-level keys:** `tone` (string), `style_notes` (array), `presenter_name` (string)
- **Proposed column_purpose:** "Per-client persona description for legacy AI generation. JSONB object with observed keys tone (string), style_notes (array of strings), presenter_name (string). Legacy table; superseded by c.client_brand_profile."
- **Confidence:** HIGH

## c.client_ai_profile.guidelines
- **Type:** jsonb · **Nullable:** false · **FK:** none
- **Populated:** 4 rows · **Top type:** object
- **Observed top-level keys:** `must` (array), `must_not` (array), `disclaimer_rules` (object)
- **Proposed column_purpose:** "Content rules for legacy AI generation. JSONB object with observed keys must (array of required behaviours), must_not (array of forbidden patterns), disclaimer_rules (object describing when and what disclaimers to attach). Legacy table; superseded by c.client_brand_profile."
- **Confidence:** HIGH

## c.client_ai_profile.platform_rules
- **Type:** jsonb · **Nullable:** false · **FK:** none
- **Populated:** 4 rows · **Top type:** object
- **Observed top-level keys:** `youtube` (object), `facebook` (object) — keyed by platform code
- **Proposed column_purpose:** "Per-platform rule overrides for legacy AI generation. JSONB object keyed by platform code (observed: youtube, facebook), each value an object holding platform-specific output constraints. Legacy table; superseded by c.client_platform_profile."
- **Confidence:** HIGH

## c.client_ai_profile.tool_policy
- **Type:** jsonb · **Nullable:** false · **FK:** none
- **Populated:** 4 rows · **Top type:** object
- **Observed top-level keys:** `browsing` (boolean), `allowed_tools` (array), `media_generation` (object)
- **Proposed column_purpose:** "Tool-availability policy for legacy AI generation. JSONB object with observed keys browsing (boolean), allowed_tools (array of tool names), media_generation (object with sub-policies). Legacy table; superseded by per-feature flags on c.client_brand_profile."
- **Confidence:** HIGH

## c.client_ai_profile.generation
- **Type:** jsonb · **Nullable:** false · **FK:** none
- **Populated:** 4 rows · **Top type:** object
- **Observed top-level keys:** `temperature` (number), `max_output_tokens` (number)
- **Proposed column_purpose:** "Sampling parameters for legacy AI generation. JSONB object with observed keys temperature (number, sampling temperature) and max_output_tokens (number, completion-token cap). Legacy table; superseded by typed columns on c.client_brand_profile."
- **Confidence:** HIGH

## c.client_brand_asset.asset_meta
- **Type:** jsonb · **Nullable:** true · **FK:** none
- **Populated:** 0 rows (table empty)
- **Proposed column_purpose:** "Metadata for the brand asset (e.g. dimensions, file format, source provenance). JSONB object expected; no rows populated yet."
- **Confidence:** MEDIUM
- **Reasoning:** Name + table_purpose imply object-shaped metadata, but no shape observed.

---

## Group B — Per-table config slots

## c.client.profile
- **Type:** jsonb · **Nullable:** false · **FK:** none
- **Populated:** 4 rows · **Top type:** object
- **Observed top-level keys:** `ai` (object) — single key in the sample row
- **Proposed column_purpose:** "Catchall extended-settings JSONB on the master client record. Observed top-level key in current data: ai (object). Used to carry settings that haven't earned their own typed column yet."
- **Confidence:** MEDIUM
- **Reasoning:** Single key observed in 4 rows; full structure may broaden over time. Catchall semantic is the honest description.

## c.client_channel.config
- **Type:** jsonb · **Nullable:** false · **FK:** none
- **Populated:** 4 rows · **Top type:** object
- **Observed top-level keys:** none (empty object across sampled rows)
- **Proposed column_purpose:** "Per-platform config slot on the client_channel row. JSONB object expected for platform-specific settings; sampled rows hold an empty object, suggesting platform-specific keys are added when needed but no client currently has any."
- **Confidence:** MEDIUM
- **Reasoning:** Observed empty object; semantics from name + table_purpose only.

## c.client_digest_policy.scope
- **Type:** jsonb · **Nullable:** false · **FK:** none
- **Populated:** 4 rows · **Top type:** object
- **Observed top-level keys:** `fallback_post_type` (string), `fallback_when_body_missing` (boolean)
- **Proposed column_purpose:** "Bundler scope-level settings for this client's digest policy. JSONB object with observed keys fallback_post_type (string — post type to use when no items qualify for the bundle) and fallback_when_body_missing (boolean — whether the fallback applies to body-missing items)."
- **Confidence:** HIGH

## c.client_platform_profile.output_fields
- **Type:** jsonb · **Nullable:** true · **FK:** none
- **Populated:** 14 rows · **Top type:** object
- **Observed top-level keys:** `body` (string), `meta` (object), `title` (string)
- **Proposed column_purpose:** "Output field schema for AI-generated drafts on this client x platform. JSONB object with observed keys body, title (each a string typically holding the canonical field name), and meta (object with platform-specific extras such as alt-text or hashtag slots)."
- **Confidence:** HIGH

## f.feed_source.config
- **Type:** jsonb · **Nullable:** false · **FK:** none
- **Populated:** 68 rows · **Top type:** object
- **Observed top-level keys:** `feed_url` (string) in sampled rss_app row; key set varies by source_type_code
- **Proposed column_purpose:** "Source-type-specific configuration. JSONB object whose key set varies by source_type_code (rss_app/rss_native sources hold feed_url; email_newsletter holds Gmail label settings; youtube_channel holds handle/credential references). Polled by ingest-worker per row."
- **Confidence:** HIGH

---

## Group C — Onboarding form

## c.onboarding_submission.form_data
- **Type:** jsonb · **Nullable:** true · **FK:** none
- **Populated:** 1 row · **Top type:** object
- **Observed top-level keys:** `brand_scan_result` (object), `ai_profile_scan_result` (object)
- **Proposed column_purpose:** "Captured submission body from the onboarding form. JSONB object whose top-level keys reflect the form sections submitted; observed keys in the one populated row are brand_scan_result and ai_profile_scan_result (each an object holding scan output). Shape may broaden as the onboarding form evolves."
- **Confidence:** MEDIUM

## c.onboarding_submission.missing_fields
- **Type:** jsonb · **Nullable:** true · **FK:** none
- **Populated:** 0 rows
- **Proposed column_purpose:** "Submission-time record of fields the operator flagged as missing or incomplete. JSONB array of field names is the expected shape (matches the onboarding back-and-forth pattern); no rows populated yet."
- **Confidence:** MEDIUM

---

## Group D — Series content

## c.content_series.outline_json
- **Type:** jsonb · **Nullable:** true · **FK:** none
- **Populated:** 9 rows · **Top type:** array · **Length in sample row:** 5
- **Proposed column_purpose:** "Approved series outline as a JSONB array (one element per planned episode). Length aligns with c.content_series.episode_count (observed 3-5). Each element is an object describing the episode's angle, hook, and recommended format — element-level shape not captured here as it is rendered via c.content_series_episode rows."
- **Confidence:** HIGH

## c.content_series_episode.platform_drafts
- **Type:** jsonb · **Nullable:** true · **FK:** none
- **Populated:** 35 rows · **Top type:** object
- **Observed top-level keys (sample row):** `facebook` (string) — keys vary per row by platform set
- **Proposed column_purpose:** "Per-platform draft variations for this episode. JSONB object keyed by platform code (observed key: facebook; other platforms appear when the episode targets them), each value typically holding draft body text. Distinct from the canonical post_draft_id which links to a single approved draft."
- **Confidence:** HIGH

---

## Group E — Audit / log payloads

## c.client_publish_profile_audit.old_value
- **Type:** jsonb · **Nullable:** true · **FK:** none
- **Populated:** 7 rows · **Top type:** string (JSONB scalar)
- **Proposed column_purpose:** "Pre-change value of the toggled field, captured as JSONB. Stage 2.1 RPC writes scalars (text mode values, booleans) so the top-level type is typically 'string', 'boolean', or 'null' rather than an object — the JSONB type widens this column to accept any future field type."
- **Confidence:** HIGH

## c.client_publish_profile_audit.new_value
- **Type:** jsonb · **Nullable:** true · **FK:** none
- **Populated:** 12 rows · **Top type:** string (JSONB scalar)
- **Proposed column_purpose:** "Post-change value of the toggled field, captured as JSONB. Stage 2.1 RPC writes scalars (text mode values, booleans) so the top-level type is typically 'string', 'boolean', or 'null' rather than an object — the JSONB type widens this column to accept any future field type."
- **Confidence:** HIGH

## f.ingest_error_log.error_detail
- **Type:** jsonb · **Nullable:** true · **FK:** none
- **Populated:** 1 row · **Top type:** object
- **Observed top-level keys:** `code` (string), `hint` (null), `details` (string), `message` (string)
- **Proposed column_purpose:** "Structured error payload captured when an ingest item fails. JSONB object; observed keys (code, message, details, hint) match the PostgrestError shape — keys differ when the error originates outside Postgres-RPC sources."
- **Confidence:** HIGH

---

## Group F — Raw payload dumps

## f.raw_content_item.payload
- **Type:** jsonb · **Nullable:** false · **FK:** none
- **Populated:** 2123 rows · **Top type:** object
- **Observed top-level keys (sample row):** `guid` (string), `link` (string), `title` (string), `published_at` (string)
- **Proposed column_purpose:** "Full raw API or RSS response for the ingested item, captured before normalisation. JSONB object whose key set varies by source. Observed keys in a sampled rss row include guid, link, title, published_at; other source types may surface different keys. Append-only — never updated after insert."
- **Confidence:** HIGH

## f.raw_metric_point.payload
- **Type:** jsonb · **Nullable:** true · **FK:** none
- **Populated:** 0 rows (table empty)
- **Proposed column_purpose:** "Raw analytics-source response for the metric data point. JSONB object expected, structure varies by source. No rows populated yet — analytics ingestion is reserved for future activation."
- **Confidence:** MEDIUM

## f.raw_metric_point.payload_hash
- **Type:** text · **Nullable:** true · **FK:** none
- **Populated:** 0 rows (table empty)
- **Proposed column_purpose:** "Hash of f.raw_metric_point.payload for deduplication on re-ingest. Unit: hash digest as text. No rows populated yet."
- **Confidence:** MEDIUM

## f.raw_timeseries_point.payload
- **Type:** jsonb · **Nullable:** true · **FK:** none
- **Populated:** 0 rows (table empty)
- **Proposed column_purpose:** "Raw trend-source response for the time-series data point (e.g. Google Trends API response). JSONB object expected. No rows populated yet — time-series ingestion is reserved for future activation."
- **Confidence:** MEDIUM

## f.raw_timeseries_point.payload_hash
- **Type:** text · **Nullable:** true · **FK:** none
- **Populated:** 0 rows (table empty)
- **Proposed column_purpose:** "Hash of f.raw_timeseries_point.payload for deduplication on re-ingest. Unit: hash digest as text. No rows populated yet."
- **Confidence:** MEDIUM

## f.video_analysis.content_structure
- **Type:** jsonb · **Nullable:** true · **FK:** none
- **Populated:** 9 rows · **Top type:** array · **Length in sample row:** 1
- **Proposed column_purpose:** "Structural breakdown of the analysed video as a JSONB array (typically one element per scene or beat). Element-level shape not sampled here — operator confirmation would lift this to HIGH."
- **Confidence:** MEDIUM

## f.video_analysis.raw_metadata
- **Type:** jsonb · **Nullable:** true · **FK:** none
- **Populated:** 9 rows · **Top type:** object
- **Observed top-level keys (sample row):** `thumbnailUrl` (null) — only one key surfaced; full metadata shape not exposed by single-row sample
- **Proposed column_purpose:** "Raw upstream metadata for the analysed video (e.g. YouTube API video response). JSONB object whose key set tracks the upstream API response."
- **Confidence:** MEDIUM

---

## Deferred (LOW confidence) — NOT included in the draft migration

### f.raw_content_item.payload_hash
- **Type:** text · **Nullable:** true · **FK:** none
- **Populated:** 0 rows out of 2123 in the table
- **Concern:** The table_purpose lists `payload_hash` alongside `url_hash` as dedup keys. `url_hash` is presumably populated; `payload_hash` is null on every row. This isn't an empty table — it's a designed feature that ingest-worker never writes. Either the column is supposed to be populated and there's a bug, or the dedup-on-payload mechanism was never implemented and this column should be deprecated.
- **Suggested next step:** Operator confirms whether ingest should be writing payload_hash (then bug fix) or whether the column is genuinely unused (then deprecate). In either case the column purpose can be re-drafted with confidence after that decision.

---

## Summary

- **Total inventoried:** 29 (1 excluded — config_id surrogate key)
- **Effective P3 set:** 28
- **Migration draft includes:** 27 (HIGH 15 + MEDIUM 12)
- **Deferred (LOW):** 1 → flagged for operator decision (`f.raw_content_item.payload_hash`)
- **Confidence distribution:** HIGH 15 (54%) · MEDIUM 12 (43%) · LOW 1 (4%)
- **Schema verification rate:** 100% — top-level shape captured for every column without dumping content

**Notable findings for operator review:**
- **`c.client_channel.config` is an empty object across all 4 populated rows** — column is being written but never with any keys. Either platform-specific config has not been needed yet, or the column is mis-used and config lives elsewhere.
- **`c.client.profile` carries only `{ ai: {...} }` in current data** — catchall description is honest; if this column should hold richer settings, current data does not show it.
- **`f.video_analysis.raw_metadata` sampled row only surfaces `thumbnailUrl` (null)** — the upstream YouTube API metadata is much richer than this. Either video-analysis is only persisting one field, or the sampled row is an incomplete instance.
- **`c.client_publish_profile_audit.old_value` / `new_value` top type is "string"**, not "object" — Stage 2.1's RPC stores JSONB scalars (e.g. `'"auto"'::jsonb`), so the column type is technically jsonb but values are typically scalar. Documented honestly.
- **The 1 LOW row (`f.raw_content_item.payload_hash`)** is the most operationally interesting finding: 2123 payload rows, 0 hash rows. Designed-but-unimplemented dedup mechanism, or column to be deprecated. Worth a separate look.

**Operator review checklist:**
- [ ] Spot-check 5 HIGH proposals — confirm shape descriptions match expectations
- [ ] Read every MEDIUM proposal — particularly the 0-row ones (image_url_list, asset_meta, missing_fields, raw_metric_point.payload + hash, raw_timeseries_point.payload + hash) where shape is inferred not observed
- [ ] Decide on the LOW row (`f.raw_content_item.payload_hash`): designed-but-unimplemented (then bug) or deprecate
- [ ] Approve to apply migration after corrections (chat applies via Supabase MCP per D170)
