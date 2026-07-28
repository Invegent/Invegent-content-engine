-- PROOF_classify_format_capability_live_validation.sql
-- =====================================================================
-- READ-ONLY post-apply proof for public.classify_format_capability(text,text,text).
-- Run ONLY after the PK T3 apply gate, against the live project (service_role).
-- This script performs NO writes and NO DDL. It classifies the db-rls-auditor live
-- validation set and prints the result next to the expected status for each cell.
--
-- Brief: docs/briefs/shared-capability-contract-classifier-gate1-v1.md (§Proof approach).
--
-- PRE-CHECK 0 — confirm the client slug is exactly 'ndis-yarns'. If this returns 0 rows,
--   STOP: the validation set below is aimed at the wrong slug (adjust to the real slug and
--   note it). A wrong slug makes select_template return client_not_found → classifier 'unknown'.
SELECT 'client_slug_check' AS check,
       cl.client_slug,
       cl.client_id
FROM c.client cl
WHERE cl.client_slug = 'ndis-yarns';

-- ── Validation set — one row per (client, platform, format) with the expected status ──────
-- Expected (VERIFIED at the 2026-07-28 post-apply proof run; brief §Live-grounding findings):
--   ('ndis-yarns','facebook', 'image_quote')        → ready
--   ('ndis-yarns','instagram','image_quote')        → ready
--   ('ndis-yarns','linkedin', 'image_quote')        → ready
--   ('ndis-yarns','instagram','carousel')           → unsupported_silent_degrade
--                                                      (blocker no_selectable_template preserved; 3 IG carousel
--                                                       publishes within 90d → precedence overlay wins — grounded)
--   ('ndis-yarns','youtube',  'video_short_avatar') → unsupported_silent_degrade
--                                                      (blocker format_unmapped; 54 live YT publishes in 90d)
--   ('ndis-yarns','youtube',  'video_short_stat')   → unsupported_silent_degrade
--                                                      (blocker no_selectable_template preserved; 3 publishes within
--                                                       90d → precedence overlay wins — grounded)
-- NOTE: carousel + video_short_stat were pre-run expected as governance_unproven / template_missing,
--   but BOTH are live-auto-publishing within the window, so the ratified silent-degrade PRECEDENCE
--   correctly overrides the underlying blocker (preserved in reason_code). Not a defect — the safety
--   feature surfacing additional silently-auto-publishing formats.
WITH cases(client_slug, platform, format, expected_status, expected_reason) AS (
  VALUES
    ('ndis-yarns','facebook', 'image_quote',        'ready',                      'selectable'),
    ('ndis-yarns','instagram','image_quote',        'ready',                      'selectable'),
    ('ndis-yarns','linkedin', 'image_quote',        'ready',                      'selectable'),
    ('ndis-yarns','instagram','carousel',           'unsupported_silent_degrade', 'no_selectable_template'),
    ('ndis-yarns','youtube',  'video_short_avatar', 'unsupported_silent_degrade', 'format_unmapped'),
    ('ndis-yarns','youtube',  'video_short_stat',   'unsupported_silent_degrade', 'no_selectable_template')
),
results AS (
  SELECT
    c.client_slug,
    c.platform,
    c.format,
    c.expected_status,
    c.expected_reason,
    public.classify_format_capability(c.client_slug, c.platform, c.format) AS r
  FROM cases c
)
SELECT
  r.client_slug,
  r.platform,
  r.format,
  r.expected_status,
  (r.r->>'status')              AS actual_status,
  r.expected_reason,
  (r.r->>'reason_code')         AS actual_reason_code,
  (r.r->>'routed_lane')         AS routed_lane,
  CASE WHEN (r.r->>'status') = r.expected_status THEN 'PASS' ELSE 'MISMATCH' END AS status_match,
  r.r->'evidence'               AS evidence
FROM results r
ORDER BY r.platform, r.format;

-- ── Aggregate verdict ────────────────────────────────────────────────────────────────────
WITH cases(client_slug, platform, format, expected_status) AS (
  VALUES
    ('ndis-yarns','facebook', 'image_quote',        'ready'),
    ('ndis-yarns','instagram','image_quote',        'ready'),
    ('ndis-yarns','linkedin', 'image_quote',        'ready'),
    ('ndis-yarns','instagram','carousel',           'unsupported_silent_degrade'),
    ('ndis-yarns','youtube',  'video_short_avatar', 'unsupported_silent_degrade'),
    ('ndis-yarns','youtube',  'video_short_stat',   'unsupported_silent_degrade')
)
SELECT
  count(*)                                                                              AS total,
  count(*) FILTER (
    WHERE (public.classify_format_capability(client_slug, platform, format)->>'status')
        = expected_status)                                                              AS passed,
  count(*) FILTER (
    WHERE (public.classify_format_capability(client_slug, platform, format)->>'status')
       <> expected_status)                                                              AS mismatched
FROM cases;
