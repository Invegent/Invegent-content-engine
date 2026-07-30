-- =====================================================================================
-- asset-graduation-candidates-v1.sql
-- Asset Graduation Slice 1 — hash-pinned READ PACK (static background images)
--
-- PURPOSE
--   Produce, in ONE call, the JSON payload consumed by
--   .claude/helpers/asset-graduation-check.mjs. That evaluator performs no DB and
--   no network reads of its own; this file is its only data source.
--
-- POSTURE — READ-ONLY, ZERO AUTHORITY
--   SELECT statements only. No INSERT/UPDATE/DELETE/MERGE, no DDL, no GRANT/REVOKE,
--   no function creation, no transaction, no temp object. Running this file cannot
--   change any asset state, fence, pool, or eligibility. It is safe to run at any
--   time, including mid-lane.
--
-- CHANNEL (PK ruling 4, 2026-07-30)
--   ONE prompted `execute_sql` call per batch — NOT per asset. General SQL access is
--   NOT widened. `scripts/db-read.py` cannot serve this: the R0 view set has no asset
--   view (verified 2026-07-30 — `ice_ro.asset_governance_status` is format-contract
--   shaped: id, client_id, format, contract_ref, declarative_registry_ref,
--   render_label, enabled, created_at, updated_at — it exposes no asset row, fence,
--   or pool data). Closing that gap is the named follow-on lane:
--     >>> Asset Graduation Read Model v1 <<<
--   exposing ONLY the asset, fence, pool-policy and resolver-reachability fields this
--   contract needs, through a dedicated secret-free read-only view or RPC.
--   The missing view does NOT block the shadow evaluator. It DOES block any future
--   unattended production graduation.
--
-- PARAMETERS — replace before running. No defaults, deliberately: a graduation read
--   should never silently target the wrong client.
--     :client_slug     e.g. 'property-pulse'
--     :batch_id        free text, recorded in the payload for the audit record
--     :target_width    e.g. 1080
--     :target_height   e.g. 1080
--     :target_platforms e.g. ARRAY['facebook','instagram']
--
-- COLUMN PROVENANCE — VERIFIED LIVE 2026-07-30 (db-rls-auditor, pg_catalog on
--   mbkmaxqhsohbtwsqolns, plus pg_get_functiondef of the LIVE deployed
--   public.resolve_slot_assets — NOT the base migration file, which has already
--   diverged from what is deployed at least twice in ICE history). Corrections
--   made from that pass are marked ⚠ CORRECTED inline at each site below.
--
--   c.client_brand_asset — `is_active`, `platform_scope`, `asset_url`, `asset_id`,
--     `client_id`, `created_at` are COLUMNS (is_active DEFAULTS TRUE — the OPEN-
--     by-default trap); `asset_meta` is jsonb NULLABLE. `asset_key`, `usage`,
--     `approved`, `license_type`, `license`, `license_expires_at`, `bucket`,
--     `safe_for_text_overlay`, `mime` are ALL `asset_meta` JSON KEYS — there is NO
--     `asset_kind` column on this table at all (asset_kind is DERIVED, see below).
--     Live usage census: 'background' (57) · 'logo' (36) · 'logo_vector_source'
--     (34) · 'broll_background' (7, all mime='video/mp4'). No absent-usage rows.
--   c.shared_creative_asset — `id` (PK) · `asset_kind` CHECK IN
--     ('static_background','logo','image','video_broll') · `asset_url` ·
--     `governance_scope` CHECK IN ('global_generic','vertical_shared',
--     'purpose_bound') · `is_active`/`production_use_allowed` DEFAULT false
--     (fenced-first, unlike client_brand_asset) · `approval_status` DEFAULT
--     'intake_candidate' · `sensitivity_class` CHECK IN ('person_free',
--     'contains_people','unknown') DEFAULT 'unknown' · `licence_allows_multi_
--     entity_use` (BRITISH spelling — confirmed, no license_... variant exists) ·
--     `platform_scope` text[] NULL · `subject_tags` text[] DEFAULT '{}' ·
--     `asset_meta` jsonb DEFAULT '{}'. **All 14 live rows are asset_kind=
--     'static_background'** — a filter of `='image'` returns ZERO rows with no
--     error (⚠ CORRECTED — this was the pack's original, wrong filter).
--   c.client_asset_pool_policy — `client_id` (PK) · `pool_policy` CHECK IN
--     ('client_only','client_preferred','best_fit') DEFAULT 'client_only' ·
--     `allow_vertical_shared` boolean DEFAULT false · `allow_global_shared`
--     boolean DEFAULT false · `client_asset_score_bias` · `minimum_fit_score` ·
--     `policy_version` · `updated_at`. **There is NO `permitted_scopes` array —
--     reachability is these TWO BOOLEANS**, matched against `governance_scope`
--     (⚠ CORRECTED — the pack's original design assumed a `permitted_scopes`
--     array that does not exist; see the evaluator's classifyOwnership doc
--     comment for the exact live derivation, confirmed against the deployed
--     function body). `governance_scope='purpose_bound'` is NEVER added to the
--     live function's permitted set under ANY policy — structurally excluded.
--   c.geo_class — `geo_key` (PK) · `geo_level` CHECK IN ('generic','national',
--     'state','metro') · `parent_key` (self-FK) · `label` · `created_at`.
--   c.client — PK is `client_id` (NOT `id`); unique slug column is `client_slug`.
--
--   NAMED GAP, NOT MODELED IN SLICE 1 (disclosed, not silently assumed clear):
--   the live function's shared-asset loop ALSO checks a per-row BOOLEAN
--   `purpose_bound` column (defense-in-depth even for global_generic/
--   vertical_shared rows), `vertical_key` match, and `allowed_clients`/
--   `excluded_clients` membership. This pack does not select those columns and
--   the evaluator's SHARED_POOLED classification does not verify them — see
--   the evaluator's POSTURE array for the exact disclosure. A future read-pack
--   revision should add them once the shared-asset lane sees real promotion
--   traffic, not before it is needed.
--
-- WHAT THIS PACK DELIBERATELY DOES NOT SUPPLY
--   · hash_observations / url_observations — byte and HTTP truth. The evaluator marks
--     the corresponding checks `not_run`, never `pass`, when they are absent. Supply
--     them out of band and merge into the payload if C1/C2 are wanted.
--   · rejected_fingerprints — no such store exists yet (grep-confirmed at the
--     Automated Image Intake v1 Gate 1). NULL is emitted, and the evaluator reports
--     C10 as `not_run` rather than assuming an empty store means "never rejected".
--   · declared-vs-resolver-reachable (C12) and pool neutrality (C13) — NOT part of
--     Slice 1 at all. C12 remains guard G5 inside the T3 promotion apply.
-- =====================================================================================

WITH params AS (
  SELECT
    :'client_slug'::text                         AS client_slug,
    :'batch_id'::text                            AS batch_id,
    :target_width::int                           AS target_width,
    :target_height::int                          AS target_height,
    :target_platforms::text[]                    AS target_platforms
),
target_client AS (
  -- c.client's primary key is `client_id`, NOT `id` — resolving by `id` fails 42703.
  SELECT c.client_id
  FROM c.client c, params p
  WHERE c.client_slug = p.client_slug
),

-- ── Known geography classes (C5). Absent here ⇒ the evaluator reports C5 not_run
-- ── rather than silently accepting an unclassifiable label as generic.
geo_classes AS (
  SELECT COALESCE(jsonb_agg(DISTINCT g.geo_key ORDER BY g.geo_key), '[]'::jsonb) AS classes
  FROM c.geo_class g
),

-- ── The client's pool policy (C7 / PK ruling 5). An ABSENT ROW is meaningful:
-- ── it means client_only, which makes every shared asset structurally unreachable.
-- ── Emitted as JSON null (looked, found nothing) so the evaluator can distinguish
-- ── it from "never looked" (key absent ⇒ ownership indeterminate).
pool_policy AS (
  SELECT to_jsonb(pp.*) AS policy
  FROM c.client_asset_pool_policy pp, target_client tc
  WHERE pp.client_id = tc.client_id
),

-- ── Every sha256 already in the ELIGIBLE pool (C9 exact-duplicate).
-- ──
-- ── ⚠ SELF-MATCH BUG, FIXED HERE. An earlier draft collected hashes from ALL rows,
-- ── including the candidate rows themselves. Because a candidate already exists as a
-- ── DB row, its own sha256 was in the comparison set — so EVERY candidate would have
-- ── been reported `duplicate_exact` against itself, and the whole batch would have
-- ── been uniform false failures. The comparison set must be the ALREADY-ELIGIBLE
-- ── pool only: "is this a duplicate of something already in production?" is the
-- ── question C9 actually asks. The eligibility predicates below are the INVERSE of
-- ── the candidate predicates used further down, so the two sets cannot overlap.
existing_hashes AS (
  SELECT COALESCE(jsonb_agg(DISTINCT h ORDER BY h), '[]'::jsonb) AS hashes
  FROM (
    SELECT lower(cba.asset_meta->>'sha256') AS h
    FROM c.client_brand_asset cba, target_client tc
    WHERE cba.client_id = tc.client_id
      AND cba.asset_meta->>'sha256' IS NOT NULL
      AND cba.is_active IS TRUE
      AND (cba.asset_meta->>'approved')::boolean IS TRUE
    UNION
    SELECT lower(sca.asset_meta->>'sha256')
    FROM c.shared_creative_asset sca
    WHERE sca.asset_meta->>'sha256' IS NOT NULL
      AND sca.is_active IS TRUE
      AND sca.production_use_allowed IS TRUE
  ) s
  WHERE h IS NOT NULL
),

-- ── Candidate rows: per-client background assets that are NOT yet eligible.
-- ── `usage` lives in asset_meta (verified); `is_active`/`platform_scope` are columns.
-- ──
-- ── ⚠ TWO CORRECTIONS MADE HERE from live ground truth (2026-07-30), not the
-- ── original Gate-1 design:
-- ── (1) `asset_kind` is no longer hardcoded 'image'. c.client_brand_asset has NO
-- ──     asset_kind COLUMN at all — it is DERIVED from `asset_meta->>'mime'`
-- ──     (confirmed present on all 7 live property-pulse broll_% rows and on
-- ──     40/57 background rows), with the `usage` tag as a corroborating
-- ──     fallback only when mime is absent. An asset_kind of NULL (neither mime
-- ──     nor usage gives an answer) is intentional — the evaluator reports that
-- ──     as a gap (INCOMPLETE), never a silent 'image' pass.
-- ── (2) The usage filter is WIDENED to admit 'broll_background' rows too, not
-- ──     because Slice 1 evaluates video (it does not — see asset_kind above),
-- ──     but so a real B-roll candidate PARSES and is correctly REJECTED as
-- ──     out-of-scope (slot_contract_mismatch) rather than silently absent from
-- ──     the batch. An absent row proves nothing; a present-and-correctly-
-- ──     rejected row proves the pipeline actually looked.
client_candidates AS (
  SELECT
    jsonb_build_object(
      'asset_id',            cba.asset_id,
      'asset_key',           COALESCE(cba.asset_meta->>'asset_key', cba.asset_id::text),
      'client_id',           cba.client_id,
      'source_table',        'c.client_brand_asset',
      'asset_kind', CASE
        WHEN cba.asset_meta->>'mime' LIKE 'video/%' THEN 'video'
        WHEN cba.asset_meta->>'mime' LIKE 'image/%' THEN 'image'
        WHEN cba.asset_meta->>'mime' IS NOT NULL     THEN NULL  -- an unrecognised mime is a gap, not a guess
        WHEN cba.asset_meta->>'usage' = 'background'       THEN 'image'  -- fallback only when mime absent
        WHEN cba.asset_meta->>'usage' = 'broll_background' THEN 'video'  -- fallback only when mime absent
        ELSE NULL
      END,
      'target_slot',         'background',
      -- asset_meta.usage is what ADMITS the row to the resolver's candidate loop
      -- (conditionally, per the target template's Background field type — see
      -- the evaluator's USAGE_LITERALS comment). A wrong/absent value makes the
      -- row INVISIBLE under every target, not merely rejected.
      'asset_meta_usage',    cba.asset_meta->>'usage',
      'is_active',           cba.is_active,
      'asset_meta_approved', cba.asset_meta->>'approved',
      'asset_meta_sha256',   cba.asset_meta->>'sha256',
      'asset_meta_bucket',   cba.asset_meta->>'bucket',
      'asset_url',           cba.asset_url,
      'platform_scope',      cba.platform_scope,
      'safe_for_text_overlay', cba.asset_meta->>'safe_for_text_overlay',
      'geo_scope',           cba.asset_meta->>'geo_scope',
      'geo_basis',           cba.asset_meta->>'geo_basis',
      'subject_tags',        cba.asset_meta->'subject_tags',
      'source_width',        (cba.asset_meta->>'width')::int,
      'source_height',       (cba.asset_meta->>'height')::int,
      'crop_geometry_key',   cba.asset_meta->>'crop_geometry_key',
      'identifiable_person', cba.asset_meta->>'identifiable_person',
      'cultural_element',    cba.asset_meta->>'cultural_element',
      'legible_signage',     cba.asset_meta->>'legible_signage',
      'ndis_phase',          cba.asset_meta->>'ndis_phase',
      'reviewer_verdict',    cba.asset_meta->>'reviewer_verdict',
      -- Provenance keys RE-POINTED 2026-07-30 (db-rls-auditor live census) to the
      -- keys actually populated on real rows; the originally-assumed generic
      -- names are kept as a fallback in case future intake populates them too.
      'provenance', jsonb_build_object(
        'source_url',               cba.asset_meta->>'source_url',
        'provider',                 COALESCE(cba.asset_meta->>'provider', cba.asset_meta->>'source_platform', cba.asset_meta->>'source_site'),
        'provider_asset_id',        COALESCE(cba.asset_meta->>'provider_asset_id', cba.asset_meta->>'source_pexels_id'),
        'author',                   COALESCE(cba.asset_meta->>'author', cba.asset_meta->>'photographer', cba.asset_meta->>'creator'),
        'licence_name',             COALESCE(cba.asset_meta->>'license_type', cba.asset_meta->>'license'),
        'licence_url',              cba.asset_meta->>'license_url',
        'licence_expires_at',       cba.asset_meta->>'license_expires_at',
        'commercial_use_permitted', cba.asset_meta->>'commercial_use_permitted',
        'pk_exception',             COALESCE(cba.asset_meta->>'pk_exception', cba.asset_meta->>'pk_decision', cba.asset_meta->>'pk_design_approval')
      )
    ) AS asset
  FROM c.client_brand_asset cba, target_client tc
  WHERE cba.client_id = tc.client_id
    AND cba.asset_meta->>'usage' IN ('background', 'broll_background')
    -- Candidates only: a row already eligible is not a graduation candidate.
    AND (cba.is_active IS NOT TRUE OR (cba.asset_meta->>'approved')::boolean IS NOT TRUE)
),

-- ── Shared-pool candidates (PK ruling 5: in scope from day one).
-- ── ⚠ CORRECTED 2026-07-30: the CHECK constraint on asset_kind is
-- ── ('static_background','logo','image','video_broll'), and ALL 14 live rows
-- ── are 'static_background' — the original 'image' filter returned ZERO
-- ── shared candidates with no error (a silent-empty-result defect, caught by
-- ── db-rls-auditor before this pack's first live run). governance_scope's real
-- ── CHECK is ('global_generic','vertical_shared','purpose_bound').
shared_candidates AS (
  SELECT
    jsonb_build_object(
      'asset_id',            sca.id,
      'asset_key',           COALESCE(sca.asset_meta->>'asset_key', sca.id::text),
      'client_id',           tc.client_id,
      'source_table',        'c.shared_creative_asset',
      'asset_kind',          sca.asset_kind,
      'target_slot',         'background',
      'governance_scope',    sca.governance_scope,
      'is_active',           sca.is_active,
      'production_use_allowed', sca.production_use_allowed,
      'approval_status',     sca.approval_status,
      'sensitivity_class',   sca.sensitivity_class,
      'licence_allows_multi_entity_use', sca.licence_allows_multi_entity_use,
      'asset_meta_approved', sca.asset_meta->>'approved',
      'asset_meta_sha256',   sca.asset_meta->>'sha256',
      'asset_meta_bucket',   COALESCE(sca.asset_meta->>'bucket', 'brand-assets'),
      'asset_meta_usage',    'background',
      'asset_url',           sca.asset_url,
      'platform_scope',      sca.platform_scope,
      'safe_for_text_overlay', sca.asset_meta->>'safe_for_text_overlay',
      'geo_scope',           sca.asset_meta->>'geo_scope',
      'geo_basis',           sca.asset_meta->>'geo_basis',
      'subject_tags',        to_jsonb(sca.subject_tags),
      'source_width',        (sca.asset_meta->>'width')::int,
      'source_height',       (sca.asset_meta->>'height')::int,
      'crop_geometry_key',   sca.asset_meta->>'crop_geometry_key',
      'identifiable_person', sca.asset_meta->>'identifiable_person',
      'cultural_element',    sca.asset_meta->>'cultural_element',
      'legible_signage',     sca.asset_meta->>'legible_signage',
      'ndis_phase',          sca.asset_meta->>'ndis_phase',
      'reviewer_verdict',    sca.asset_meta->>'reviewer_verdict',
      'provenance', jsonb_build_object(
        'source_url',               sca.asset_meta->>'source_url',
        'provider',                 COALESCE(sca.asset_meta->>'provider', sca.asset_meta->>'source_platform', sca.asset_meta->>'source_site'),
        'provider_asset_id',        COALESCE(sca.asset_meta->>'provider_asset_id', sca.asset_meta->>'source_pexels_id'),
        'author',                   COALESCE(sca.asset_meta->>'author', sca.asset_meta->>'photographer', sca.asset_meta->>'creator'),
        'licence_name',             COALESCE(sca.asset_meta->>'license_type', sca.asset_meta->>'license'),
        'licence_url',              sca.asset_meta->>'license_url',
        'licence_expires_at',       sca.asset_meta->>'license_expires_at',
        'commercial_use_permitted', sca.asset_meta->>'commercial_use_permitted',
        'pk_exception',             COALESCE(sca.asset_meta->>'pk_exception', sca.asset_meta->>'pk_decision', sca.asset_meta->>'pk_design_approval')
      )
    ) AS asset
  FROM c.shared_creative_asset sca, target_client tc
  WHERE sca.asset_kind = 'static_background'
    AND (sca.is_active IS NOT TRUE OR sca.production_use_allowed IS NOT TRUE)
),

all_candidates AS (
  SELECT asset FROM client_candidates
  UNION ALL
  SELECT asset FROM shared_candidates
)

-- ── The payload. Batch-level facts are merged into EVERY asset so the evaluator
-- ── stays a pure function of its per-asset input.
SELECT jsonb_pretty(jsonb_build_object(
  'batch_id',       (SELECT batch_id FROM params),
  'client_slug',    (SELECT client_slug FROM params),
  'read_pack',      'asset-graduation-candidates-v1',
  'assets', COALESCE((
    SELECT jsonb_agg(
      a.asset
      || jsonb_build_object(
           'target_width',          (SELECT target_width  FROM params),
           'target_height',         (SELECT target_height FROM params),
           'target_platforms',      to_jsonb((SELECT target_platforms FROM params)),
           'known_geo_classes',     (SELECT classes FROM geo_classes),
           'existing_pool_sha256',  (SELECT hashes  FROM existing_hashes),
           -- JSON null = looked, no policy row ⇒ client_only ⇒ shared unreachable.
           -- Key ABSENT would mean "never looked" ⇒ ownership indeterminate. The
           -- difference is load-bearing; do not collapse it.
           'client_asset_pool_policy', COALESCE((SELECT policy FROM pool_policy), 'null'::jsonb),
           -- Deliberately NULL: no rejected-fingerprint store exists yet, and an
           -- empty array would be read as "checked, never rejected".
           'rejected_fingerprints', 'null'::jsonb
         )
    )
    FROM all_candidates a
  ), '[]'::jsonb)
)) AS payload;

-- =====================================================================================
-- USAGE
--   1. Run this file as ONE `execute_sql` call with the five parameters substituted.
--   2. Save the returned `payload` value to a file, e.g.
--        <scratchpad>/asset-graduation-batch-<batch_id>.json
--   3. Evaluate (no network, no DB, no writes):
--        node .claude/helpers/asset-graduation-check.mjs --input <that file>
--        node .claude/helpers/asset-graduation-check.mjs --input <that file> --json
--   4. Exit codes: 0 READY_FOR_PK_REVIEW · 2 INCOMPLETE · 3 FAILED.
--
-- READING THE RESULT
--   READY_FOR_PK_REVIEW means the MECHANICAL questions are answered. It is NOT an
--   approval, it clears NO gate, and PK's visual verdict remains the only deciding
--   act. C12 (declared == resolver-reachable) and C13 (pool neutrality) are NOT
--   evaluated anywhere in Slice 1 — a clean sheet must never be read as implying them.
--
-- ROLLBACK
--   Deleting the three Slice-1 files. There is no DB object and no production surface.
-- =====================================================================================
