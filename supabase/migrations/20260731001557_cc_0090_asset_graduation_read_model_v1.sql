-- cc-0090 — Asset Graduation Read Model v1 (O-4 follow-on)
-- docs/briefs/asset-graduation-contract-v1.md:448 (§13 O-4) ·
-- docs/briefs/cc-0090-asset-graduation-read-model-v1-brief.md (PK gate-1 approved 2026-07-30) ·
-- docs/briefs/results/cc-0090-asset-graduation-read-model-v1-result.md
--
-- Promotes docs/briefs/artifacts/cc-0090-asset-graduation-read-model-v1.sql
-- (sha256 07fb1f171a548937c7430c5fa3511ece7d632a2bcfedd9b69f6f9e5489ac7ef2 at review time,
-- since amended twice for db-rls-auditor should-fix items — grant-total assertion,
-- subject_tags jsonb normalisation — and re-verified live after each) into a real
-- migration. DDL below is BYTE-IDENTICAL to that reviewed artifact's Sections A/B/C —
-- only this header is new. PK authorised the apply 2026-07-30 after: db-rls-auditor
-- (concerns → both should-fix items applied and re-verified live), branch-warden
-- (safe), and ask_chatgpt_review (agree / low / high confidence / no escalation,
-- review_id 7f172e81-ed5f-4e11-a59f-079e1fa4a4fa).
--
-- Extends the existing G-RO v2 confined-read-role pattern
-- (20260719150000_ice_ro_r0_views_and_confined_role.sql) with 4 new secret-free
-- read-only views. Adds ZERO production authority: no table, no DML, no write
-- function, no change to any existing view/function/worker/template.
--
-- Rollback: docs/briefs/artifacts/cc-0090-asset-graduation-read-model-v1-rollback.sql
-- (DROP VIEW × 4 + a post-rollback assertion restoring the ice_readonly grant total
-- to exactly 10).

-- ============================ Section A: the four new views =========================
-- All owned by the executor (same non-security_invoker pattern as the ten existing R0
-- views) so they run with owner rights and return all rows for graduation review,
-- exactly like the existing ice_ro views already do for cross-client operator monitoring.

-- 1. asset_graduation_client_owned ← c.client_brand_asset (background + broll_background
--    usage only — the two in-scope classes per contract §1; logo/logo_vector_source
--    stay excluded, unchanged from the Slice-1 read pack's own filter).
--    Ownership is unconditionally 'client_owned' for every row in this table
--    (classifyOwnership():377 — table === 'c.client_brand_asset' ⇒ CLIENT_OWNED,
--    no policy lookup needed).
CREATE VIEW ice_ro.asset_graduation_client_owned AS
SELECT
  cba.asset_id,
  cba.client_id,
  cl.client_slug,
  'c.client_brand_asset'::text                         AS source_table,
  'client_owned'::text                                 AS ownership_model,
  COALESCE(cba.asset_meta->>'asset_key', cba.asset_id::text) AS asset_key,
  cba.asset_meta->>'usage'                              AS usage,
  cba.is_active,
  (cba.asset_meta->>'approved')::boolean                AS meta_approved,
  -- asset_kind is DERIVED — this table has no such column. mime is authoritative;
  -- usage is a corroborating fallback ONLY when mime is absent. An unrecognised
  -- mime is a gap (NULL), never guessed as 'image' (Slice-1 correction, preserved).
  CASE
    WHEN cba.asset_meta->>'mime' LIKE 'video/%' THEN 'video'
    WHEN cba.asset_meta->>'mime' LIKE 'image/%' THEN 'image'
    WHEN cba.asset_meta->>'mime' IS NOT NULL     THEN NULL
    WHEN cba.asset_meta->>'usage' = 'background'       THEN 'image'
    WHEN cba.asset_meta->>'usage' = 'broll_background' THEN 'video'
    ELSE NULL
  END                                                    AS asset_kind,
  cba.asset_meta->>'mime'                               AS mime,
  (cba.asset_meta->>'width')::int                        AS source_width,
  (cba.asset_meta->>'height')::int                       AS source_height,
  -- Not confirmed present on any live row this session (Slice-1 census named only
  -- mime); surfaced for §5 D5 completeness. NULL when absent — not asserted present.
  (cba.asset_meta->>'duration_seconds')::numeric         AS duration_seconds,
  cba.asset_url,
  cba.asset_meta->>'bucket'                              AS bucket,
  cba.asset_meta->>'sha256'                              AS sha256,
  cba.platform_scope,
  cba.asset_meta->>'safe_for_text_overlay'               AS safe_for_text_overlay,
  cba.asset_meta->>'crop_geometry_key'                   AS crop_geometry_key,
  cba.asset_meta->>'geo_scope'                           AS geo_scope,
  cba.asset_meta->>'geo_basis'                           AS geo_basis,
  cba.asset_meta->'subject_tags'                         AS subject_tags,
  cba.asset_meta->>'identifiable_person'                 AS identifiable_person,
  cba.asset_meta->>'cultural_element'                    AS cultural_element,
  cba.asset_meta->>'legible_signage'                     AS legible_signage,
  cba.asset_meta->>'ndis_phase'                          AS ndis_phase,
  cba.asset_meta->>'reviewer_verdict'                    AS reviewer_verdict,
  -- Provenance — same re-pointed keys as the Slice-1 read pack, dedicated key first,
  -- populated fallback second; NEVER a secret (source URL / licence text / author name).
  cba.asset_meta->>'source_url'                          AS provenance_source_url,
  COALESCE(cba.asset_meta->>'provider', cba.asset_meta->>'source_platform', cba.asset_meta->>'source_site') AS provenance_provider,
  COALESCE(cba.asset_meta->>'provider_asset_id', cba.asset_meta->>'source_pexels_id')                        AS provenance_provider_asset_id,
  COALESCE(cba.asset_meta->>'author', cba.asset_meta->>'photographer', cba.asset_meta->>'creator')            AS provenance_author,
  COALESCE(cba.asset_meta->>'license_type', cba.asset_meta->>'license')                                       AS provenance_licence_name,
  cba.asset_meta->>'license_url'                         AS provenance_licence_url,
  cba.asset_meta->>'license_expires_at'                  AS provenance_licence_expires_at,
  cba.asset_meta->>'commercial_use_permitted'             AS provenance_commercial_use_permitted,
  COALESCE(cba.asset_meta->>'pk_exception', cba.asset_meta->>'pk_decision', cba.asset_meta->>'pk_design_approval') AS provenance_pk_exception,
  cba.created_at
FROM c.client_brand_asset cba
JOIN c.client cl ON cl.client_id = cba.client_id
WHERE cba.asset_meta->>'usage' IN ('background', 'broll_background');

-- 2. asset_graduation_shared_reachability ← c.shared_creative_asset CROSS JOIN c.client,
--    LEFT JOIN c.client_asset_pool_policy — one row per (shared asset × every client),
--    because shared-asset reachability is inherently relative to the viewing client
--    (PK ruling O-5). Callers filter WHERE viewing_client_slug = '<slug>'. This mirrors
--    the existing R0 views' cross-client operator-monitoring model (e.g. slot_status
--    already returns every client's rows in one view) — not a new exposure pattern.
--    No client-OWNED private data crosses client lines here: only a SHARED asset's
--    policy-derived reachability per viewing client, which is what §7.5 and §13 O-5 of
--    the contract require made visible.
CREATE VIEW ice_ro.asset_graduation_shared_reachability AS
SELECT
  sca.id                                                 AS asset_id,
  cl.client_id                                           AS viewing_client_id,
  cl.client_slug                                         AS viewing_client_slug,
  'c.shared_creative_asset'::text                        AS source_table,
  COALESCE(sca.asset_meta->>'asset_key', sca.id::text)   AS asset_key,
  sca.asset_kind,
  sca.governance_scope,
  sca.is_active,
  sca.production_use_allowed,
  sca.approval_status,
  sca.sensitivity_class,
  sca.licence_allows_multi_entity_use,
  (sca.asset_meta->>'approved')::boolean                 AS meta_approved,
  pp.pool_policy,
  pp.allow_vertical_shared,
  pp.allow_global_shared,
  -- Ownership classification — SQL translation of classifyOwnership()'s shared branch
  -- (asset-graduation-check.mjs:380-405). NULL policy row (no LEFT JOIN match) means
  -- "we looked; no row ⇒ client_only ⇒ unreachable", distinct from the JSON-null vs
  -- absent-key distinction the read pack's payload preserves for its own C7 handling.
  CASE
    WHEN pp.client_id IS NULL THEN 'shared_unreachable'
    WHEN pp.pool_policy = 'client_only' THEN 'shared_unreachable'
    WHEN pp.pool_policy NOT IN ('client_preferred', 'best_fit') THEN 'ownership_indeterminate'
    WHEN sca.governance_scope = 'purpose_bound' THEN 'shared_unreachable'
    WHEN sca.governance_scope = 'global_generic' THEN
      CASE WHEN pp.allow_global_shared IS TRUE THEN 'shared_pooled' ELSE 'shared_unreachable' END
    WHEN sca.governance_scope = 'vertical_shared' THEN
      CASE WHEN pp.allow_vertical_shared IS TRUE THEN 'shared_pooled' ELSE 'shared_unreachable' END
    ELSE 'ownership_indeterminate'
  END                                                     AS ownership_model,
  sca.asset_url,
  sca.asset_meta->>'bucket'                              AS bucket,
  sca.asset_meta->>'sha256'                              AS sha256,
  (sca.asset_meta->>'width')::int                        AS source_width,
  (sca.asset_meta->>'height')::int                       AS source_height,
  (sca.asset_meta->>'duration_seconds')::numeric         AS duration_seconds,
  sca.platform_scope,
  sca.asset_meta->>'safe_for_text_overlay'               AS safe_for_text_overlay,
  sca.asset_meta->>'crop_geometry_key'                   AS crop_geometry_key,
  sca.asset_meta->>'geo_scope'                           AS geo_scope,
  sca.asset_meta->>'geo_basis'                           AS geo_basis,
  -- normalised to jsonb (db-rls-auditor should-fix, 2026-07-30): the client-owned
  -- view's subject_tags is jsonb (sourced from a jsonb column) — cast this one to
  -- match, so a consumer handles one shape across both views, not two.
  to_jsonb(sca.subject_tags)                             AS subject_tags,
  sca.asset_meta->>'identifiable_person'                 AS identifiable_person,
  sca.asset_meta->>'cultural_element'                    AS cultural_element,
  sca.asset_meta->>'legible_signage'                     AS legible_signage,
  sca.asset_meta->>'ndis_phase'                          AS ndis_phase,
  sca.asset_meta->>'reviewer_verdict'                    AS reviewer_verdict,
  sca.asset_meta->>'source_url'                          AS provenance_source_url,
  COALESCE(sca.asset_meta->>'provider', sca.asset_meta->>'source_platform', sca.asset_meta->>'source_site') AS provenance_provider,
  COALESCE(sca.asset_meta->>'provider_asset_id', sca.asset_meta->>'source_pexels_id')                        AS provenance_provider_asset_id,
  COALESCE(sca.asset_meta->>'author', sca.asset_meta->>'photographer', sca.asset_meta->>'creator')            AS provenance_author,
  COALESCE(sca.asset_meta->>'license_type', sca.asset_meta->>'license')                                       AS provenance_licence_name,
  sca.asset_meta->>'license_url'                         AS provenance_licence_url,
  sca.asset_meta->>'license_expires_at'                  AS provenance_licence_expires_at,
  sca.asset_meta->>'commercial_use_permitted'             AS provenance_commercial_use_permitted,
  COALESCE(sca.asset_meta->>'pk_exception', sca.asset_meta->>'pk_decision', sca.asset_meta->>'pk_design_approval') AS provenance_pk_exception
FROM c.shared_creative_asset sca
CROSS JOIN c.client cl
LEFT JOIN c.client_asset_pool_policy pp ON pp.client_id = cl.client_id
WHERE sca.asset_kind = 'static_background';

-- 3. asset_graduation_client_pool_policy ← c.client_asset_pool_policy, one row per
--    client, RIGHT JOINed against c.client so a client with NO policy row still
--    appears (client_only by structural absence — the same fact #2 encodes, exposed
--    here directly for a cheap one-row-per-client audit read without needing a
--    shared asset to exist first).
CREATE VIEW ice_ro.asset_graduation_client_pool_policy AS
SELECT
  cl.client_id,
  cl.client_slug,
  pp.pool_policy,
  pp.allow_vertical_shared,
  pp.allow_global_shared,
  pp.client_asset_score_bias,
  pp.minimum_fit_score,
  pp.policy_version,
  pp.updated_at,
  (pp.client_id IS NULL)                                 AS policy_row_absent
FROM c.client cl
LEFT JOIN c.client_asset_pool_policy pp ON pp.client_id = cl.client_id;

-- 4. asset_graduation_geo_classes ← c.geo_class (all columns SAFE — enum-shaped,
--    no secret, matches the R0 exposure rule already applied to the ten existing views).
CREATE VIEW ice_ro.asset_graduation_geo_classes AS
SELECT geo_key, geo_level, parent_key, label, created_at
FROM c.geo_class;

-- ============================ Section B: grants =======================================
-- Explicit per-view grant (belt) + the same catch-all re-issued from the original G-RO v2
-- migration (suspenders) — `GRANT SELECT ON ALL TABLES IN SCHEMA` is evaluated at
-- execution time, so it must be re-run here for these four NEW views to become
-- reachable; it does not retroactively apply from the original migration.
GRANT SELECT ON
  ice_ro.asset_graduation_client_owned,
  ice_ro.asset_graduation_shared_reachability,
  ice_ro.asset_graduation_client_pool_policy,
  ice_ro.asset_graduation_geo_classes
TO ice_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA ice_ro TO ice_readonly;

-- Defensive, explicit (views carry no default PUBLIC/anon/authenticated grant in
-- Postgres — unlike functions — but this states the intent rather than relying on
-- the absence of a default): confirm no PostgREST-reachable role can touch these.
REVOKE ALL ON
  ice_ro.asset_graduation_client_owned,
  ice_ro.asset_graduation_shared_reachability,
  ice_ro.asset_graduation_client_pool_policy,
  ice_ro.asset_graduation_geo_classes
FROM PUBLIC, anon, authenticated;

-- ============================ Section C: fail-closed assertions ========================
DO $assert$
DECLARE n int;
BEGIN
  -- The four new views must exist, be owned normally (non-security_invoker — same
  -- rule as the G-RO v2 assert block), and grant ONLY ice_readonly SELECT, nothing else.
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'ice_ro' AND c.relkind = 'v'
      AND c.relname IN ('asset_graduation_client_owned', 'asset_graduation_shared_reachability',
                         'asset_graduation_client_pool_policy', 'asset_graduation_geo_classes');
  IF n <> 4 THEN RAISE EXCEPTION 'cc-0090 assert: expected 4 new ice_ro views, found %', n; END IF;

  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'ice_ro' AND c.relkind = 'v'
      AND c.relname IN ('asset_graduation_client_owned', 'asset_graduation_shared_reachability',
                         'asset_graduation_client_pool_policy', 'asset_graduation_geo_classes')
      AND (SELECT option_value FROM pg_options_to_table(c.reloptions)
           WHERE option_name = 'security_invoker') = 'true';
  IF n <> 0 THEN RAISE EXCEPTION 'cc-0090 assert: % new view(s) are security_invoker', n; END IF;

  SELECT count(*) INTO n FROM information_schema.role_table_grants
    WHERE table_schema = 'ice_ro'
      AND table_name IN ('asset_graduation_client_owned', 'asset_graduation_shared_reachability',
                          'asset_graduation_client_pool_policy', 'asset_graduation_geo_classes')
      AND grantee IN ('PUBLIC', 'anon', 'authenticated');
  IF n <> 0 THEN RAISE EXCEPTION 'cc-0090 assert: % PUBLIC/anon/authenticated grant(s) found on the new views', n; END IF;

  SELECT count(*) INTO n FROM information_schema.role_table_grants
    WHERE table_schema = 'ice_ro'
      AND table_name IN ('asset_graduation_client_owned', 'asset_graduation_shared_reachability',
                          'asset_graduation_client_pool_policy', 'asset_graduation_geo_classes')
      AND grantee = 'ice_readonly' AND privilege_type = 'SELECT';
  IF n <> 4 THEN RAISE EXCEPTION 'cc-0090 assert: expected 4 ice_readonly SELECT grants (one per view), got %', n; END IF;

  -- Schema-WIDE total (db-rls-auditor should-fix, 2026-07-30): the per-view check
  -- above only counts these 4 named views. This checks the AGGREGATE across all of
  -- ice_ro (10 original + 4 new = 14), so the catch-all `GRANT SELECT ON ALL TABLES
  -- IN SCHEMA ice_ro` a few lines up cannot silently over-grant ice_readonly if an
  -- unrelated 15th relation lands in ice_ro between authoring and apply. Symmetric
  -- with the rollback file's own total=10 post-rollback assertion.
  SELECT count(*) INTO n FROM information_schema.role_table_grants
    WHERE table_schema = 'ice_ro' AND grantee = 'ice_readonly' AND privilege_type = 'SELECT';
  IF n <> 14 THEN RAISE EXCEPTION 'cc-0090 assert: expected ice_readonly at exactly 14 ice_ro SELECT grants (10 original + 4 new), got %', n; END IF;

  RAISE NOTICE 'cc-0090 ok: 4 new ice_ro views, non-security_invoker, ice_readonly-only SELECT, zero PUBLIC/anon/authenticated exposure, schema total 14.';
END $assert$;
