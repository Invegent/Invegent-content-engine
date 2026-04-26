-- Stage 7.034 — 7-day rolling evergreen ratio per client (D.7)
--
-- Counts slots filled in last 7 days (status IN filled/approved/published)
-- and splits the ratio by shadow vs live drafts via m.post_draft.is_shadow.
--
-- During Phase B (shadow only): live_* columns will be 0/NULL; shadow_*
-- shows the developing pattern.
-- During Phase C cutover: both live_* and shadow_* populated.
-- Post-Phase D: only live_* meaningful.
--
-- The check_evergreen_threshold function (035) picks the relevant ratio
-- (live preferred when sample exists) for alert decisions.

CREATE OR REPLACE VIEW m.evergreen_ratio_7d AS
WITH filled_with_shadow AS (
  SELECT
    s.client_id,
    s.is_evergreen,
    COALESCE(pd.is_shadow, false) AS is_shadow
  FROM m.slot s
  LEFT JOIN m.post_draft pd ON pd.post_draft_id = s.filled_draft_id
  WHERE s.filled_at IS NOT NULL
    AND s.filled_at > NOW() - interval '7 days'
    AND s.status IN ('filled', 'approved', 'published')
)
SELECT
  c.client_id,
  c.client_name,

  -- Live (production) drafts
  COUNT(*) FILTER (WHERE NOT fws.is_shadow) AS live_filled_total,
  COUNT(*) FILTER (WHERE NOT fws.is_shadow AND fws.is_evergreen) AS live_evergreen_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE NOT fws.is_shadow) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE NOT fws.is_shadow AND fws.is_evergreen)::numeric
        / COUNT(*) FILTER (WHERE NOT fws.is_shadow)::numeric,
        4
      )
    ELSE NULL
  END AS live_evergreen_ratio,

  -- Shadow drafts (Phase B observation)
  COUNT(*) FILTER (WHERE fws.is_shadow) AS shadow_filled_total,
  COUNT(*) FILTER (WHERE fws.is_shadow AND fws.is_evergreen) AS shadow_evergreen_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE fws.is_shadow) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE fws.is_shadow AND fws.is_evergreen)::numeric
        / COUNT(*) FILTER (WHERE fws.is_shadow)::numeric,
        4
      )
    ELSE NULL
  END AS shadow_evergreen_ratio,

  NOW() AS computed_at

FROM c.client c
LEFT JOIN filled_with_shadow fws ON fws.client_id = c.client_id
WHERE c.status = 'active'
GROUP BY c.client_id, c.client_name
ORDER BY c.client_name;

COMMENT ON VIEW m.evergreen_ratio_7d IS
  'D.7 per-client 7d rolling evergreen ratio. Splits live (post_draft.is_shadow=false) vs shadow (true). Window = NOW() - 7d. Counts filled/approved/published slots only. NULL ratio when sample size is 0. Stage 7.034.';
