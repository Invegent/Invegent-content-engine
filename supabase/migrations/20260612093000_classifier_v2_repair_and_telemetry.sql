-- ============================================================================
-- Classifier v2 repair + explanation telemetry (Stage 1, bounded repair)
-- ============================================================================
-- Source: docs/runtime/sessions/2026-06-12-classifier-concentration-audit.md
-- Scope (approved, bounded — NOT a redesign):
--   1. Fix the three dead source-grounded rule groups (vocabulary mismatch).
--   2. Repair brittle regex / false-positive patterns the audit identified.
--   3. Isolate the recency defect: classify on immutable created_at, not the
--      drifting first_seen_at (93.9% of rows have first_seen_at advancing).
--   4. Add explanation telemetry so analytical-because-rule-matched is
--      distinguishable from analytical-because-nothing-matched. Outward label
--      (content_class) is UNCHANGED — additive metadata only.
--   5. Version bump v1 -> v2. New classifications only; existing rows are NOT
--      reprocessed (picker is NULL-only). Backfill is an explicit, bounded,
--      approval-gated op via m.reclassify_canonicals (NOT invoked here).
--
-- Out of scope / unchanged: Advisor logic, format policy, Option C / mix tables,
-- publisher/render behaviour, classify-after-fetch (D2), dedup leak, broad backfill.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- PART 1 — Explanation telemetry columns (additive; 1:1 with the existing
--          classification record on f.canonical_content_body)
-- ----------------------------------------------------------------------------
ALTER TABLE f.canonical_content_body
  ADD COLUMN IF NOT EXISTS classification_method  text,
  ADD COLUMN IF NOT EXISTS matched_rule_id        uuid,
  ADD COLUMN IF NOT EXISTS matched_rule_name      text,
  ADD COLUMN IF NOT EXISTS matched_rule_priority  integer,
  ADD COLUMN IF NOT EXISTS matched_signal         text,
  ADD COLUMN IF NOT EXISTS input_used             text[],
  ADD COLUMN IF NOT EXISTS body_available         boolean,
  ADD COLUMN IF NOT EXISTS defaulted              boolean,
  ADD COLUMN IF NOT EXISTS insufficient_content   boolean;

COMMENT ON COLUMN f.canonical_content_body.classification_method IS
  'How content_class was assigned: rule_matched | defaulted | insufficient_content (v2+).';
COMMENT ON COLUMN f.canonical_content_body.matched_rule_id IS
  'Representative t.content_class_rule.rule_id of the winning rule group (NULL when defaulted/insufficient).';
COMMENT ON COLUMN f.canonical_content_body.matched_rule_name IS
  'Human label of the winning rule group, e.g. "stat_heavy g3" (NULL when defaulted/insufficient).';
COMMENT ON COLUMN f.canonical_content_body.matched_rule_priority IS
  't.content_class.priority_rank of the winning class (NULL when defaulted/insufficient).';
COMMENT ON COLUMN f.canonical_content_body.matched_signal IS
  'class:group:rule_types that produced the match (NULL when defaulted/insufficient).';
COMMENT ON COLUMN f.canonical_content_body.input_used IS
  'Signals available at classification time: subset of {title,body,source}.';
COMMENT ON COLUMN f.canonical_content_body.body_available IS
  'TRUE when extracted body text was present at classification time.';
COMMENT ON COLUMN f.canonical_content_body.defaulted IS
  'TRUE when content_class came from the backstop, not a matched rule.';
COMMENT ON COLUMN f.canonical_content_body.insufficient_content IS
  'TRUE when there was too little signal (no body and title < 3 words) to classify.';

-- guarded CHECK (nullable: pre-v2 rows stay NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'canonical_content_body_classification_method_chk'
      AND conrelid = 'f.canonical_content_body'::regclass
  ) THEN
    ALTER TABLE f.canonical_content_body
      ADD CONSTRAINT canonical_content_body_classification_method_chk
      CHECK (classification_method IS NULL
             OR classification_method IN ('rule_matched','defaulted','insufficient_content'));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PART 2 — Rule repairs: three dead source-grounded groups (D3)
-- ----------------------------------------------------------------------------
-- D3a timely_breaking g1 source leg: dead source_type codes
--     (rss_news/news_api/policy_rss/gov_rss never exist). The feed has no
--     news-specific source_type (rss_app/rss_native carry everything), so the
--     faithful, SELECTIVE repair is a gov/news source_NAME signal that does NOT
--     overlap the statistical-agency sources stat_heavy depends on.
UPDATE t.content_class_rule
SET rule_type = 'source_name_match',
    rule_config = '{"names":["Google News","Disability Gateway","NDIS.gov","NDIS Commission","DSS -","Dept of Health","Ministers"],"match_type":"substring"}'::jsonb,
    notes = 'Recent + gov/news source AND pair — group 1.2 of 2 (v2: source_name substring; dead source_type codes retired)',
    updated_at = now()
WHERE rule_id = '40b7b3b0-1973-4bc3-aab9-5f51de312854';

-- D3b stat_heavy g3 source leg: match_type exact never matches
--     "RBA - Media Releases" against "RBA". Switch to substring.
UPDATE t.content_class_rule
SET rule_config = '{"names":["ABS","AIHW","RBA","CoreLogic","PropTrack","REIA"],"match_type":"substring"}'::jsonb,
    notes = 'Known data source feed — standalone group (v2: substring match)',
    updated_at = now()
WHERE rule_id = '6fa82cb8-7316-4f47-9151-9b7f995b76da';

-- D3c analytical g3 source leg: dead source_type codes
--     (opinion_rss/editorial_rss/newsletter never exist). The only live
--     editorial-class source_type is email_newsletter. analytical is the
--     backstop class, so impact is correctness-only.
UPDATE t.content_class_rule
SET rule_config = '{"codes":["email_newsletter"]}'::jsonb,
    notes = 'Editorial-class source feeds (v2: mapped to live email_newsletter)',
    updated_at = now()
WHERE rule_id = 'd69f40eb-8746-439b-95dc-9ac9bcfdc153';

-- ----------------------------------------------------------------------------
-- PART 3 — Rule repairs: brittle regex (D4) + false positives (D5)
-- ----------------------------------------------------------------------------
-- D5 educational g1: bare ^why over-triggers on news commentary
--    ("Why These ASX Real Estate Stocks..."). Require a question/explainer shape.
UPDATE t.content_class_rule
SET rule_config = jsonb_set(rule_config, '{pattern}',
      '"^(how to|what is|what are|why\\s+(is|are|do|does|did|should|can|will|would|to|you|your|we|the|a|an)\\y|when|where|the complete guide|a guide to|beginner|beginners?|introduction to|understanding|explained)"'::jsonb),
    notes = 'Explainer framing at title start (v2: ^why tightened to question shape)',
    updated_at = now()
WHERE rule_id = 'd68f0a12-cb2d-4fa0-94b0-cb6b05355a8a';

-- D4 educational g2: trailing (\s|$) misses "explained:" (colon). Use word
--    boundary \M; allow start-of-title via (^|\s).
UPDATE t.content_class_rule
SET rule_config = jsonb_set(rule_config, '{pattern}',
      '"(^|\\s)(explained|guide|guide to|learn|primer|101|fundamentals?|basics?)\\M"'::jsonb),
    notes = 'Guide/primer markers anywhere in title (v2: word-boundary trailing, fixes "explained:")',
    updated_at = now()
WHERE rule_id = 'a376e20a-fd6d-40e0-82ca-592e255e55c1';

-- D4 multi_point g1: digit must be directly adjacent to the keyword, so
--    "10 Money Lessons" misses. Allow up to 2 intervening words.
UPDATE t.content_class_rule
SET rule_config = jsonb_set(rule_config, '{pattern}',
      '"(^|\\s)(\\d+)\\s+(\\S+\\s+){0,2}(ways?|things?|reasons?|tips?|steps?|signs?|mistakes?|lessons?|rules?|questions?|facts?|myths?|benefits?|strategies|tactics)(\\s|$)"'::jsonb),
    notes = 'Numbered list markers in title (v2: allow <=2 intervening words, fixes "10 Money Lessons")',
    updated_at = now()
WHERE rule_id = 'aac1c62e-4366-460c-bd75-dadfd731b7e0';

-- D5 timely g2: bare "breaking" fires on the ordinary verb
--    ("Breaking cycles of disadvantage"). Require the news sense.
UPDATE t.content_class_rule
SET rule_config = jsonb_set(rule_config, '{pattern}',
      '"(^|\\s)(breaking news\\y|breaking:|just announced\\y|announced today\\y|just in\\y|urgent\\y|update:|this morning\\y|this afternoon\\y|today:|just released\\y)"'::jsonb),
    notes = 'Urgency markers in title — standalone group (v2: "breaking" tightened to news sense; per-alternative word boundaries)',
    updated_at = now()
WHERE rule_id = '5287ec78-2168-4838-a951-9a5ca0fda69a';

-- D5 human_story g2: mid-title "meet" false-positive ("...Meet New Mandates").
--    Anchor "meet" to title start; how/why framing unchanged.
UPDATE t.content_class_rule
SET rule_config = jsonb_set(rule_config, '{pattern}',
      '"((^|\\s)(how i|how we|why i|why we)(\\s|$))|(^meet\\y)"'::jsonb),
    notes = 'First-person framing in title (v2: "meet" anchored to title start)',
    updated_at = now()
WHERE rule_id = '80853afd-3f58-4f58-9c2b-0b936b2d4311';

-- ----------------------------------------------------------------------------
-- PART 4 — Version bump v1 -> v2 (marks the repaired ruleset)
-- ----------------------------------------------------------------------------
UPDATE t.content_class
SET version = 'v2', updated_at = now()
WHERE is_current = TRUE;

-- ----------------------------------------------------------------------------
-- PART 5 — classify_canonical: recency on created_at (D6) + telemetry emit (D1)
--          (return type changes -> DROP + CREATE)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS m.classify_canonical(uuid);

CREATE FUNCTION m.classify_canonical(p_canonical_id uuid)
 RETURNS TABLE(
   canonical_id           uuid,
   content_class          text,
   classified_at          timestamptz,
   classifier_version     text,
   classification_method  text,
   matched_rule_id        uuid,
   matched_rule_name      text,
   matched_rule_priority  integer,
   matched_signal         text,
   input_used             text[],
   body_available         boolean,
   defaulted              boolean,
   insufficient_content   boolean
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_title        TEXT;
  v_body         TEXT;
  v_word_count   INT;
  v_recency_ts   TIMESTAMPTZ;   -- v2: immutable created_at (NOT drifting first_seen_at)
  v_source_types TEXT[];
  v_source_names TEXT[];
  v_version      TEXT;
  v_class        RECORD;
  v_group_rec    RECORD;
  v_rule         RECORD;
  v_all_match    BOOLEAN;
  v_rule_count   INT;
  v_body_avail   BOOLEAN;
  v_input_used   TEXT[];
  v_title_words  INT;
  v_m_rule_id    UUID;
  v_m_signal     TEXT;
BEGIN
  -- 1. Load canonical facts. v2: recency uses cci.created_at (immutable first
  --    ingest). first_seen_at advances like last_seen (93.9% drift) and would
  --    silently distort the 48h recency rule.
  SELECT cci.canonical_title, ccb.extracted_text, ccb.word_count, cci.created_at
  INTO v_title, v_body, v_word_count, v_recency_ts
  FROM f.canonical_content_item cci
  LEFT JOIN f.canonical_content_body ccb ON ccb.canonical_id = cci.canonical_id
  WHERE cci.canonical_id = p_canonical_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'm.classify_canonical: canonical_id % not found', p_canonical_id;
  END IF;

  -- 2. Source arrays
  SELECT
    array_agg(DISTINCT fs.source_type_code) FILTER (WHERE fs.source_type_code IS NOT NULL),
    array_agg(DISTINCT fs.source_name)      FILTER (WHERE fs.source_name IS NOT NULL)
  INTO v_source_types, v_source_names
  FROM f.content_item_canonical_map map
  JOIN f.content_item ci ON ci.content_item_id = map.content_item_id
  JOIN f.feed_source  fs ON fs.source_id = ci.source_id
  WHERE map.canonical_id = p_canonical_id;

  -- telemetry: body availability + inputs available
  v_body_avail := (v_body IS NOT NULL AND length(btrim(v_body)) > 0);
  v_input_used := ARRAY[]::text[];
  IF v_title IS NOT NULL AND length(btrim(v_title)) > 0 THEN
    v_input_used := v_input_used || 'title';
  END IF;
  IF v_body_avail THEN
    v_input_used := v_input_used || 'body';
  END IF;
  IF v_source_types IS NOT NULL OR v_source_names IS NOT NULL THEN
    v_input_used := v_input_used || 'source';
  END IF;

  -- 3. Current classifier version
  SELECT MIN(version) INTO v_version FROM t.content_class WHERE is_current = TRUE;
  IF v_version IS NULL THEN
    RAISE EXCEPTION 'm.classify_canonical: no active classifier version in t.content_class';
  END IF;

  -- 4. Iterate classes in priority order
  FOR v_class IN
    SELECT content_class_id, class_code, priority_rank
    FROM t.content_class
    WHERE is_current = TRUE AND is_active = TRUE
    ORDER BY priority_rank ASC
  LOOP
    SELECT COUNT(*) INTO v_rule_count
    FROM t.content_class_rule
    WHERE content_class_id = v_class.content_class_id AND is_active = TRUE;

    -- zero-rule class matches unconditionally
    IF v_rule_count = 0 THEN
      RETURN QUERY SELECT p_canonical_id, v_class.class_code, NOW(), v_version,
        'rule_matched'::text, NULL::uuid,
        (v_class.class_code || ' (zero-rule unconditional)')::text, v_class.priority_rank,
        'zero_rule_class'::text, v_input_used, v_body_avail, FALSE, FALSE;
      RETURN;
    END IF;

    FOR v_group_rec IN
      SELECT DISTINCT rule_group
      FROM t.content_class_rule
      WHERE content_class_id = v_class.content_class_id AND is_active = TRUE
      ORDER BY rule_group
    LOOP
      v_all_match := TRUE;

      FOR v_rule IN
        SELECT rule_type, rule_config
        FROM t.content_class_rule
        WHERE content_class_id = v_class.content_class_id
          AND rule_group = v_group_rec.rule_group
          AND is_active = TRUE
      LOOP
        IF NOT m.evaluate_rule(
          v_rule.rule_type, v_rule.rule_config,
          v_title, v_body, v_word_count, v_recency_ts,
          v_source_types, v_source_names
        ) THEN
          v_all_match := FALSE;
          EXIT;
        END IF;
      END LOOP;

      IF v_all_match THEN
        -- telemetry: representative rule + signal for the winning group
        SELECT MIN(rule_id), string_agg(rule_type, '+' ORDER BY rule_type)
        INTO v_m_rule_id, v_m_signal
        FROM t.content_class_rule
        WHERE content_class_id = v_class.content_class_id
          AND rule_group = v_group_rec.rule_group
          AND is_active = TRUE;

        RETURN QUERY SELECT p_canonical_id, v_class.class_code, NOW(), v_version,
          'rule_matched'::text, v_m_rule_id,
          (v_class.class_code || ' g' || v_group_rec.rule_group)::text, v_class.priority_rank,
          (v_class.class_code || ':g' || v_group_rec.rule_group || ':' || v_m_signal)::text,
          v_input_used, v_body_avail, FALSE, FALSE;
        RETURN;
      END IF;
    END LOOP;
  END LOOP;

  -- 5. Backstop: nothing matched -> 'analytical' (outward label STABLE).
  --    Telemetry distinguishes defaulted vs insufficient_content.
  v_title_words := COALESCE(
    array_length(regexp_split_to_array(btrim(COALESCE(v_title, '')), '\s+'), 1), 0);

  IF NOT v_body_avail AND (v_title IS NULL OR length(btrim(COALESCE(v_title,''))) = 0 OR v_title_words < 3) THEN
    RETURN QUERY SELECT p_canonical_id, 'analytical'::text, NOW(), v_version,
      'insufficient_content'::text, NULL::uuid, NULL::text, NULL::int, NULL::text,
      v_input_used, v_body_avail, TRUE, TRUE;
  ELSE
    RETURN QUERY SELECT p_canonical_id, 'analytical'::text, NOW(), v_version,
      'defaulted'::text, NULL::uuid, NULL::text, NULL::int, NULL::text,
      v_input_used, v_body_avail, TRUE, FALSE;
  END IF;
END;
$function$;

-- ----------------------------------------------------------------------------
-- PART 6 — classify_canonicals_unclassified: write telemetry; NULL-only picker
--          (version-drift reprocessing is intentionally NOT automatic)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION m.classify_canonicals_unclassified(p_batch_size integer DEFAULT 100)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_row     RECORD;
  v_result  RECORD;
  v_count   INT := 0;
  v_version TEXT;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('m.classify_canonicals_unclassified')) THEN
    RAISE NOTICE 'classify_canonicals_unclassified: another instance is running, exiting';
    RETURN 0;
  END IF;

  SELECT MIN(version) INTO v_version FROM t.content_class WHERE is_current = TRUE;

  -- v2: process only UNCLASSIFIED rows. Reprocessing of already-classified
  -- rows on a version bump is intentionally NOT automatic; backfill is the
  -- explicit, bounded, approval-gated m.reclassify_canonicals.
  FOR v_row IN
    SELECT cb.canonical_id
    FROM f.canonical_content_body cb
    WHERE cb.content_class IS NULL
      AND cb.fetch_status IS NOT NULL
    ORDER BY cb.updated_at ASC
    LIMIT p_batch_size
  LOOP
    BEGIN
      SELECT * INTO v_result FROM m.classify_canonical(v_row.canonical_id);

      UPDATE f.canonical_content_body
      SET content_class          = v_result.content_class,
          classified_at          = v_result.classified_at,
          classifier_version     = v_result.classifier_version,
          classification_method  = v_result.classification_method,
          matched_rule_id        = v_result.matched_rule_id,
          matched_rule_name      = v_result.matched_rule_name,
          matched_rule_priority  = v_result.matched_rule_priority,
          matched_signal         = v_result.matched_signal,
          input_used             = v_result.input_used,
          body_available         = v_result.body_available,
          defaulted              = v_result.defaulted,
          insufficient_content   = v_result.insufficient_content,
          updated_at             = NOW()
      WHERE canonical_id = v_row.canonical_id;

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'classify_canonicals_unclassified: canonical % failed: %', v_row.canonical_id, SQLERRM;
    END;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- ----------------------------------------------------------------------------
-- PART 7 — m.reclassify_canonicals: explicit, bounded, opt-in backfill
--          (NOT invoked here, NOT scheduled; PK-gated when run)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION m.reclassify_canonicals(p_batch_size integer DEFAULT 100, p_max_total integer DEFAULT 500)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_row     RECORD;
  v_result  RECORD;
  v_count   INT := 0;
  v_version TEXT;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('m.reclassify_canonicals')) THEN
    RAISE NOTICE 'reclassify_canonicals: another instance is running, exiting';
    RETURN 0;
  END IF;

  SELECT MIN(version) INTO v_version FROM t.content_class WHERE is_current = TRUE;

  -- Bounded backfill: re-classify already-classified rows behind the current
  -- version. Caller controls blast radius via p_max_total (hard ceiling).
  FOR v_row IN
    SELECT cb.canonical_id
    FROM f.canonical_content_body cb
    WHERE cb.classifier_version IS DISTINCT FROM v_version
      AND cb.content_class IS NOT NULL
      AND cb.fetch_status IS NOT NULL
    ORDER BY cb.classified_at ASC NULLS FIRST
    LIMIT LEAST(p_batch_size, p_max_total)
  LOOP
    EXIT WHEN v_count >= p_max_total;
    BEGIN
      SELECT * INTO v_result FROM m.classify_canonical(v_row.canonical_id);

      UPDATE f.canonical_content_body
      SET content_class          = v_result.content_class,
          classified_at          = v_result.classified_at,
          classifier_version     = v_result.classifier_version,
          classification_method  = v_result.classification_method,
          matched_rule_id        = v_result.matched_rule_id,
          matched_rule_name      = v_result.matched_rule_name,
          matched_rule_priority  = v_result.matched_rule_priority,
          matched_signal         = v_result.matched_signal,
          input_used             = v_result.input_used,
          body_available         = v_result.body_available,
          defaulted              = v_result.defaulted,
          insufficient_content   = v_result.insufficient_content,
          updated_at             = NOW()
      WHERE canonical_id = v_row.canonical_id;

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'reclassify_canonicals: canonical % failed: %', v_row.canonical_id, SQLERRM;
    END;
  END LOOP;

  RETURN v_count;
END;
$function$;

COMMIT;
