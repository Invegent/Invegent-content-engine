-- ============================================================================
-- Classifier v2 repair — smoke / verification suite (READ-ONLY; no mutation)
-- ============================================================================
-- Run AFTER applying 20260612093000_classifier_v2_repair_and_telemetry.sql.
-- Every query is read-only. Each returns explicit pass/expected columns so the
-- repair stays auditable. Source: 2026-06-12 classifier concentration audit.
--
-- Usage: run each block; confirm the documented expected result.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. RULE REPAIR VALIDATION — the previously dead source groups can now fire,
--    evaluated through the LIVE deployed rule_config (not literals).
-- ----------------------------------------------------------------------------
-- A1 timely_breaking source leg (rule 40b7b3b0): fires on gov/news, quiet on property
SELECT
  m.evaluate_rule('source_name_match',
    (SELECT rule_config FROM t.content_class_rule WHERE rule_id='40b7b3b0-1973-4bc3-aab9-5f51de312854'),
    NULL,NULL,NULL,NULL,NULL, ARRAY['NDIS Commission - Provider News'])  AS expect_true_govnews,
  m.evaluate_rule('source_name_match',
    (SELECT rule_config FROM t.content_class_rule WHERE rule_id='40b7b3b0-1973-4bc3-aab9-5f51de312854'),
    NULL,NULL,NULL,NULL,NULL, ARRAY['Smart Property Investment'])        AS expect_false_property;
-- expected: true, false

-- A2 analytical opinion/editorial source leg (rule d69f40eb): fires on email_newsletter
SELECT
  m.evaluate_rule('source_type_match',
    (SELECT rule_config FROM t.content_class_rule WHERE rule_id='d69f40eb-8746-439b-95dc-9ac9bcfdc153'),
    NULL,NULL,NULL,NULL, ARRAY['email_newsletter'], NULL)                AS expect_true_newsletter;
-- expected: true

-- A3 stat_heavy source-name leg (rule 6fa82cb8): substring now matches "RBA - Media Releases"
SELECT
  m.evaluate_rule('source_name_match',
    (SELECT rule_config FROM t.content_class_rule WHERE rule_id='6fa82cb8-7316-4f47-9151-9b7f995b76da'),
    NULL,NULL,NULL,NULL,NULL, ARRAY['RBA - Media Releases'])             AS expect_true_rba;
-- expected: true   (was false under the old exact match)

-- A4 brittle-regex / false-positive repairs (title_regex rules), via live configs
SELECT
  m.evaluate_rule('title_regex',(SELECT rule_config FROM t.content_class_rule WHERE rule_id='d68f0a12-cb2d-4fa0-94b0-cb6b05355a8a'),
    'Why These ASX Real Estate Stocks Are Back In Focus',NULL,NULL,NULL,NULL,NULL) AS edu_why_expect_false,
  m.evaluate_rule('title_regex',(SELECT rule_config FROM t.content_class_rule WHERE rule_id='d68f0a12-cb2d-4fa0-94b0-cb6b05355a8a'),
    'Why is the RBA cutting interest rates',NULL,NULL,NULL,NULL,NULL)              AS edu_why_expect_true,
  m.evaluate_rule('title_regex',(SELECT rule_config FROM t.content_class_rule WHERE rule_id='a376e20a-fd6d-40e0-82ca-592e255e55c1'),
    'SA State Budget explained:',NULL,NULL,NULL,NULL,NULL)                         AS edu_explained_colon_expect_true,
  m.evaluate_rule('title_regex',(SELECT rule_config FROM t.content_class_rule WHERE rule_id='aac1c62e-4366-460c-bd75-dadfd731b7e0'),
    '10 Money Lessons Nobody Told Me',NULL,NULL,NULL,NULL,NULL)                    AS mp_intervening_expect_true,
  m.evaluate_rule('title_regex',(SELECT rule_config FROM t.content_class_rule WHERE rule_id='5287ec78-2168-4838-a951-9a5ca0fda69a'),
    'Breaking cycles of disadvantage in the community',NULL,NULL,NULL,NULL,NULL)   AS timely_verb_expect_false,
  m.evaluate_rule('title_regex',(SELECT rule_config FROM t.content_class_rule WHERE rule_id='5287ec78-2168-4838-a951-9a5ca0fda69a'),
    'Breaking news: RBA lifts cash rate',NULL,NULL,NULL,NULL,NULL)                 AS timely_news_expect_true,
  m.evaluate_rule('title_regex',(SELECT rule_config FROM t.content_class_rule WHERE rule_id='80853afd-3f58-4f58-9c2b-0b936b2d4311'),
    'NDIS Providers Scramble to Meet New Mandates',NULL,NULL,NULL,NULL,NULL)       AS hs_meet_expect_false,
  m.evaluate_rule('title_regex',(SELECT rule_config FROM t.content_class_rule WHERE rule_id='80853afd-3f58-4f58-9c2b-0b936b2d4311'),
    'Meet Sarah, the OT changing lives',NULL,NULL,NULL,NULL,NULL)                  AS hs_meet_expect_true;
-- expected: false,true,true,true,false,true,false,true

-- ----------------------------------------------------------------------------
-- B. DEFAULT VISIBILITY VALIDATION — defaulted analytical is now distinguishable
--    from rule-matched analytical (run after some v2 rows have accrued).
-- ----------------------------------------------------------------------------
SELECT classifier_version, content_class, classification_method, count(*) n
FROM f.canonical_content_body
WHERE classifier_version = 'v2'
GROUP BY 1,2,3
ORDER BY 1,2,3;
-- expected (once v2 rows exist): for content_class='analytical', rows split across
-- method IN ('rule_matched','defaulted','insufficient_content') — NOT all one bucket.

-- ----------------------------------------------------------------------------
-- C. EXPLANATION TELEMETRY VALIDATION — sample rows showing the full evidence set
-- ----------------------------------------------------------------------------
SELECT canonical_id, content_class AS label, classification_method AS method,
       matched_rule_name, matched_rule_priority, matched_signal,
       input_used, body_available, defaulted, insufficient_content,
       classifier_version, classified_at
FROM f.canonical_content_body
WHERE classifier_version = 'v2'
ORDER BY classified_at DESC
LIMIT 20;
-- expected: rule_matched rows carry matched_rule_name/priority/signal;
-- defaulted/insufficient rows carry NULL rule fields + defaulted=true.

-- ----------------------------------------------------------------------------
-- D. DISTRIBUTION COMPARISON (sanity check only — do NOT claim success from this)
-- ----------------------------------------------------------------------------
-- D1 current stored distribution, 30-day window (the "before")
SELECT content_class, count(*) n, round(100.0*count(*)/sum(count(*)) over(),1) pct
FROM f.canonical_content_body
WHERE classified_at >= now() - interval '30 days'
GROUP BY 1 ORDER BY n DESC;

-- D2 v2-only distribution + method split (the "after", as v2 rows accrue / after a bounded backfill)
SELECT content_class, classification_method, count(*) n
FROM f.canonical_content_body
WHERE classifier_version = 'v2'
GROUP BY 1,2 ORDER BY 1, n DESC;

-- ----------------------------------------------------------------------------
-- E. BOUNDED BACKFILL (opt-in; PK-gated — run ONLY under approval)
-- ----------------------------------------------------------------------------
--   SELECT m.reclassify_canonicals(p_batch_size => 100, p_max_total => 100);
-- Re-run D1/D2 afterwards to compare before/after on the backfilled sample.
