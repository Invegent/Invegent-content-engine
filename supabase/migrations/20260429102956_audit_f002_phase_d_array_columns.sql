-- Audit closure: F-002 Phase D — ARRAY column purposes (text[] mop-up)
-- Brief: docs/briefs/phase-d-array-mop-up.md
-- Source: docs/audit/decisions/f002_phase_d_missing_array_columns.md
-- Run state: docs/runtime/runs/phase-d-array-mop-up-2026-04-29T102956Z.md
--
-- Covers 7 pure pg ARRAY (text[]) columns in c+f schemas that CC's P3 regex
-- missed during Phase C (it captured the 23 jsonb columns but skipped
-- enumerated string lists). All 7 rows confirmed by PK pre-flight to exist in
-- k.column_registry with column_purpose IS NULL, data_type = 'ARRAY',
-- udt_name = '_text'. Clean baseline; no overwrites expected.
--
-- Wordings authored per brief style guidance: 1-3 sentences, open with role,
-- state shape, cite observed range or representative sample, hedge
-- downstream-consumer claims when not verified in pre-flight (per P2
-- correction precedent — D170/D171). Each row ≤ 400 chars.
--
-- Coverage delta: c+f schemas 20.2% → ~21.2% documented (7 of 674 columns).
--
-- NOT covered (out of scope per brief):
--   * 6 LOW-confidence columns from P1+P2+P3 followups — separate joint-
--     resolution session.
--   * ARRAY columns in m, t, a, k, r schemas — F-002 brief is c+f only.
--   * f002_phase_d_missing_array_columns.md closure — PK does after apply.
--   * Any change to k.refresh_column_registry.
--
-- Verification uses count delta of documented c+f rows (Lesson #38 —
-- refresh_column_registry bumps updated_at on every row, so a time-window
-- check is unreliable). Migration RAISES EXCEPTION if delta != 7.
--
-- DO NOT APPLY. PK applies in morning review (D170: only PK applies).

DO $audit_phase_d$
DECLARE
  expected_delta CONSTANT integer := 7;
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

-- ── c.client_brand_asset ───────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$text[] of platform keys this brand asset applies to. No populated rows yet — table not yet exercised in production. Shape expected to mirror lowercase platform_key values used elsewhere in the c-schema, but no observed sample available to confirm.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_brand_asset') AND column_name = 'platform_scope';

-- ── c.client_brand_profile ─────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$Operator-curated list of brand-voice prohibitions for this client. text[] of free-prose rules (e.g. 'Never use markdown formatting...', 'Never be promotional...'). Observed: ~7 entries per row across the 4 populated rows. Intended for brand-voice prompt context; exact downstream consumer not verified in pre-flight.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_brand_profile') AND column_name = 'brand_never_do';

UPDATE k.column_registry SET column_purpose = $cp$Operator-curated list of brand-voice descriptors for this client. text[] of single-word or short-phrase tags (e.g. {warm, plain-English, grounded, honest, calm}). Observed: ~6 entries per row across the 4 populated rows. Intended for brand-voice prompt context; exact downstream consumer not verified in pre-flight.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_brand_profile') AND column_name = 'brand_voice_keywords';

-- ── c.content_series ───────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$text[] of lowercase platform_key values this series targets. Observed: single-element arrays (e.g. {facebook}, {youtube}); only 2 of 9 rows populated.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'content_series') AND column_name = 'platforms';

-- ── c.onboarding_submission ────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$text[] of free-prose content-topic strings captured via the public onboarding form. Observed sample: {"Occupational therapy under NDIS"}; only 1 row populated. Downstream normalisation path (e.g. into structured scope rows) not verified in pre-flight.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'onboarding_submission') AND column_name = 'content_topics';

UPDATE k.column_registry SET column_purpose = $cp$text[] of platform names captured via the public onboarding form. Free-text title-case entries (e.g. {Facebook,Instagram,LinkedIn}) — NOT canonical lowercase platform_keys; operator normalises to lowercase platform_keys during onboarding review. Only 1 row populated.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'onboarding_submission') AND column_name = 'desired_platforms';

-- ── f.video_analysis ───────────────────────────────────────────────────
UPDATE k.column_registry SET column_purpose = $cp$text[] of short-prose hooks the video-analysis worker extracted from the source video (or fallback strings when analysis was thin). Observed entries include {"Unable to identify hooks", "Missing video information", "No content to analyze"}, indicating frequent fallback paths in the current 9-row population.$cp$, updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'f' AND table_name = 'video_analysis') AND column_name = 'key_hooks';

-- Post-apply verification — count delta (immune to refresh_column_registry bumping updated_at — Lesson #38)
SELECT COUNT(*)::int INTO after_count
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name IN ('c','f')
  AND cr.column_purpose IS NOT NULL
  AND cr.column_purpose <> ''
  AND cr.column_purpose <> 'PENDING_DOCUMENTATION'
  AND cr.column_purpose NOT ILIKE 'TODO%';

IF after_count - before_count <> expected_delta THEN
  RAISE EXCEPTION 'F-002 Phase D verification failed: expected delta %, got % (before=%, after=%)',
    expected_delta, after_count - before_count, before_count, after_count;
END IF;

RAISE NOTICE 'F-002 Phase D verification passed: delta % (before=%, after=%)', after_count - before_count, before_count, after_count;

END;
$audit_phase_d$;
