-- ============================================================================
-- RECONCILIATION BACKFILL (cc-0087, 2026-07-29): this file was NOT originally
-- committed to git under this name/version. It reproduces exact content that was
-- actually applied LIVE to project mbkmaxqhsohbtwsqolns, sourced from:
--   _harness/img_intake_v1_20260727/slice2_shortage_detector.sql (gitignored harness dir)
-- Any 'NOT APPLIED' / 'PREPARED' / 'DESIGN' framing below is the ORIGINAL packet's
-- pre-apply language, preserved for historical fidelity -- it is STALE; this
-- migration IS live (confirmed against the Supabase migration ledger and, where
-- checked, live pg_get_functiondef/information_schema state). See
-- docs/briefs/results/cc-0087-migration-ledger-reconciliation-result-v1.md.
-- ============================================================================

-- Automated Image Intake v1 — Slice 2: background shortage detector (read-only, NEW).
-- Tier T2. Applied via apply_migration at the PK gate. Additive only.
--
-- Design (evidence-grounded 2026-07-27):
--   * Existing gap/inventory fns do NOT expose eligible COUNT — analyze_asset_gap only flags
--     hard fail-closed (select_template_status<>ok), probe_asset_inventory returns
--     slot_kind_not_probable for Background. So supply is measured by the cc-0073-PROVEN
--     select_template distinct-background sweep (eligible-count == rotation depth), drift-free
--     because it uses the real resolver.
--   * Demand = enabled rows in c.client_publish_schedule (weekly cadence per client×platform).
--     (m.build_weekly_demand_grid avoided: p_week_start accepted-and-ignored + unreachable from
--     service_role per standing memory.)
--   * Gate-1 corrections: (2a) ≥4 floor is the v1 MINIMUM; (2b) shortages prioritised by demand;
--     (2c) category_spread surfaces the shared-pool subject-tag diversity so a satisfied COUNT
--     ("4 exist") cannot mask a monotonous pool. NOTE: c.client_brand_asset carries no tags, so
--     spread covers the shared-pool portion only (client assets count toward supply, not spread).
-- SECURITY INVOKER (least privilege): called by service_role, which can read c.* ; the eligibility
--   itself runs through public.select_template (SECURITY DEFINER), so no extra definer surface added.

CREATE OR REPLACE FUNCTION m.detect_background_shortage(
  p_floor     int    DEFAULT 4,
  p_platforms text[] DEFAULT ARRAY['facebook','instagram','linkedin'],
  p_seeds     int    DEFAULT 20,
  p_format    text   DEFAULT 'image_quote'
)
RETURNS TABLE (
  client_slug     text,
  platform        text,
  eligible_supply int,
  weekly_demand   int,
  is_shortage     boolean,
  shortfall       int,
  priority_rank   bigint,
  eligible_keys   text[],
  category_spread jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, m, c, pg_temp
AS $fn$
  WITH grid AS (
    SELECT cl.client_slug, cl.client_id, pl.platform
    FROM c.client cl
    CROSS JOIN unnest(p_platforms) AS pl(platform)
  ),
  supply AS (
    SELECT g.client_slug, g.platform,
           array_agg(DISTINCT probe.k) FILTER (WHERE probe.k IS NOT NULL) AS keys
    FROM grid g
    CROSS JOIN generate_series(1, p_seeds) AS s(n)
    CROSS JOIN LATERAL (
      SELECT (
        SELECT e->>'asset_key'
        FROM jsonb_array_elements(
               public.select_template(g.client_slug, g.platform, p_format, NULL, 'bgshort-'||s.n)
               -> 'slot_resolution' -> 'selected') AS e
        WHERE e->>'slot' = 'Background'
      ) AS k
    ) AS probe
    GROUP BY g.client_slug, g.platform
  ),
  demand AS (
    SELECT cl.client_slug, sch.platform,
           count(*) FILTER (WHERE sch.enabled) AS wk
    FROM c.client cl
    JOIN c.client_publish_schedule sch ON sch.client_id = cl.client_id
    GROUP BY cl.client_slug, sch.platform
  ),
  joined AS (
    SELECT g.client_slug, g.platform,
           coalesce(cardinality(sp.keys), 0) AS eligible_supply,
           coalesce(d.wk, 0)                 AS weekly_demand,
           sp.keys                           AS keys
    FROM grid g
    LEFT JOIN supply sp ON sp.client_slug = g.client_slug AND sp.platform = g.platform
    LEFT JOIN demand d  ON d.client_slug  = g.client_slug AND d.platform  = g.platform
  )
  SELECT
    j.client_slug,
    j.platform,
    j.eligible_supply,
    j.weekly_demand,
    (j.eligible_supply < p_floor)             AS is_shortage,
    greatest(p_floor - j.eligible_supply, 0)  AS shortfall,
    rank() OVER (ORDER BY (j.eligible_supply < p_floor) DESC,
                          j.weekly_demand DESC,
                          j.eligible_supply ASC) AS priority_rank,
    j.keys                                    AS eligible_keys,
    (
      SELECT jsonb_build_object(
        'distinct_subject_tags', coalesce(count(DISTINCT tag), 0),
        'subject_tags',          coalesce(jsonb_agg(DISTINCT tag) FILTER (WHERE tag IS NOT NULL), '[]'::jsonb),
        'tagged_shared_assets',  coalesce(count(DISTINCT sca.id), 0),
        'note',                  'shared-pool subject_tags only; client-asset tags not modelled (v1)'
      )
      FROM c.shared_creative_asset sca
      LEFT JOIN LATERAL unnest(sca.subject_tags) AS tag ON true
      WHERE j.keys IS NOT NULL
        AND (sca.asset_meta->>'asset_key') = ANY(j.keys)
    )                                         AS category_spread
  FROM joined j
  ORDER BY priority_rank, j.client_slug, j.platform;
$fn$;

COMMENT ON FUNCTION m.detect_background_shortage(int, text[], int, text) IS
  'Automated Image Intake v1 shortage detector (read-only). Supply = distinct backgrounds from a select_template seed sweep (rotation depth); demand = enabled c.client_publish_schedule rows; shortage = supply < floor (default 4); shortages ranked by demand; category_spread surfaces shared-pool subject-tag diversity so a satisfied count cannot mask a monotonous pool.';

REVOKE ALL ON FUNCTION m.detect_background_shortage(int, text[], int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION m.detect_background_shortage(int, text[], int, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION m.detect_background_shortage(int, text[], int, text) TO service_role;

-- MF-1 fix (db-rls-auditor BLOCK → PK ruling 2026-07-27: keep INVOKER + narrow grant).
-- SECURITY INVOKER means the demand CTE reads c.client_publish_schedule AS the caller
-- (service_role), which lacks SELECT on it. Grant the one narrow read (service_role already
-- reads sibling c.client + c.shared_creative_asset; publish schedule is non-sensitive).
GRANT SELECT ON c.client_publish_schedule TO service_role;

-- Call mechanism (SF-1): invoke via a DIRECT service-role SQL connection (the intake runbook /
--   execute_sql path), NOT PostgREST RPC — schema m is not REST-exposed (RPC would PGRST106).
-- Demand semantics (SF-2): demand is platform-level enabled-schedule cadence per Gate-1 wording
--   ("demand = enabled schedule rows"); format_override / p_format do not narrow it in v1.
-- Grid scope (SF-3): all c.client rows are included (no status filter); inactive clients simply
--   surface with demand 0 and rank low. Sweep cost ~= n_clients×n_platforms×p_seeds resolver calls
--   (default 240); acceptable for an on-demand detector.
