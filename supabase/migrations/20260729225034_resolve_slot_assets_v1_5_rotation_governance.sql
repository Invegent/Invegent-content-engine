-- =====================================================================================
-- ICE — Governed Creatomate B-roll: ROTATION GOVERNANCE v1
-- Artifact: apply migration (AUTHORED, NOT APPLIED — stops at the PK apply gate)
-- Lane tier: T3 (production-touching resolver)
-- Target: public.resolve_slot_assets  v1.4 -> v1.5
--
-- WHAT THIS DOES
--   1. Adds canonical B-roll geography classes (c.geo_class) as a containment tree.
--   2. Adds a GOVERNED copy-geography declaration (c.client_format_copy_geography).
--   3. Adds public.geo_relation() — structured containment, never filename inference.
--   4. Replaces resolve_slot_assets with v1.5: recent-use avoidance + geography
--      compatibility + selection visibility.
--
-- WHAT THIS DELIBERATELY DOES NOT DO
--   * No signature change. CREATE OR REPLACE ONLY.
--     REASON (hard): the live ACL is `postgres=X/postgres | service_role=X/postgres`.
--     DROP+CREATE resets a public function to the default ACL, which grants EXECUTE to
--     anon + authenticated (standing ICE trap). CREATE OR REPLACE preserves the ACL.
--     This also means select_template needs NO change and NO edge function is deployed.
--   * No change to the production template winner (46c5c4ac / dd5fd75e).
--   * No change to the 1080x1920 / 12s parity overlay (video-worker v3.15.0, untouched).
--   * No clip sourced, promoted, un-fenced, relabelled, or mutated. Zero DML on
--     c.client_brand_asset.
--   * No voice / music / logo binding touched.
--   * No client-specific hardcoding — every rule is data-driven off the two new tables.
--
-- SCOPE FENCE (the single most important safety property of this migration):
--   ALL new selection logic is gated on `v_bg_is_video`. A template whose Background
--   field is an IMAGE takes the v1.4 code path with byte-identical behaviour. Only the
--   video B-roll path is governed by the new rules.
--
-- ⚠ APPLY CHANNEL + TRANSACTION — RESOLVED, and the two reviewers DISAGREED here.
--   `db-rls-auditor` (must-fix 3) argued for stripping BEGIN;/COMMIT; and letting
--   `apply_migration` supply the transaction, because an inner COMMIT can terminate a
--   wrapping transaction early. External review rev-2 pushed back the other way: relying
--   on an implicit, channel-dependent transaction is the weaker guarantee in production.
--
--   RESOLVED IN FAVOUR OF THE EXPLICIT TRANSACTION (kept below), on repo evidence rather
--   than argument: 31 of 193 migrations in supabase/migrations carry a top-level `BEGIN;`,
--   and ALL FOUR most recent ones do — the S9 publisher-enforcement migration + rollback
--   pair (20260729173000 / 20260729183000), which are applied and live. Explicit
--   BEGIN;/COMMIT; is the house pattern on this apply path, and it makes atomicity a
--   property of THIS FILE rather than of whichever channel runs it.
--
--   RESIDUAL HAZARD, NAMED, NOT DISMISSED: if a channel independently wraps this file in
--   its own transaction, the inner COMMIT commits the outer one. Because the COMMIT is the
--   LAST statement in the file, that is harmless here — nothing follows it to be orphaned.
--   Do NOT append statements after the COMMIT. `apply_migration` mints its own version
--   number; this file name is not the migration identity.
-- =====================================================================================

BEGIN;

-- -------------------------------------------------------------------------------------
-- 1. CANONICAL GEOGRAPHY CLASSES
--    A containment tree. Levels: generic | national | state | metro.
--    'generic' is a ROOT OF ITS OWN — it is deliberately NOT a child of 'au', so it can
--    never be used to smuggle a locality claim, and no specific footage is ever
--    reclassified as generic to widen eligibility.
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS c.geo_class (
  geo_key     text PRIMARY KEY,
  geo_level   text NOT NULL CHECK (geo_level IN ('generic','national','state','metro')),
  parent_key  text NULL REFERENCES c.geo_class(geo_key),
  label       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- a generic class can never have a parent; every non-national specific class must.
  CONSTRAINT geo_class_generic_is_root CHECK (geo_level <> 'generic' OR parent_key IS NULL),
  CONSTRAINT geo_class_national_is_root CHECK (geo_level <> 'national' OR parent_key IS NULL),
  CONSTRAINT geo_class_specific_has_parent CHECK (geo_level NOT IN ('state','metro') OR parent_key IS NOT NULL),
  -- Cycle guard (db-rls-auditor should-fix). geo_relation() walks parent_key upward inside
  -- a function on the render path; a self-parenting row would make that walk non-terminating.
  -- Paired with UNION (not UNION ALL) in geo_relation, which dedups and so terminates on any
  -- longer cycle too.
  CONSTRAINT geo_class_no_self_parent CHECK (parent_key IS DISTINCT FROM geo_key)
);

-- Exposure fence. Schema `c` grants USAGE to anon + authenticated, so it is reachable in
-- principle; REVOKE explicitly (naming PUBLIC alone is insufficient) and enable RLS.
--   ⚠ CORRECTED (db-rls-auditor must-fix 2): an earlier draft of this comment claimed FORCE
--   would block the SECURITY DEFINER owner. That is FALSE — `postgres` has
--   rolbypassrls = TRUE (verified live), and BYPASSRLS bypasses row security
--   unconditionally, FORCE included. ENABLE and FORCE are behaviourally IDENTICAL for every
--   principal that exists here. ENABLE is kept because it matches the 22 schema-`c` tables
--   already carrying rls_enabled_no_policy, not because FORCE would break anything. The
--   standing ICE note "RLS needs FORCE" is imprecise for the same reason.
--   Note also: the "new tables are born anon-writable" trap is specific to schema `public`.
--   pg_default_acl for schema `c` is {service_role=r, inspector_ro=r} — not anon/authenticated.
REVOKE ALL ON c.geo_class FROM PUBLIC, anon, authenticated;
ALTER TABLE c.geo_class ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE c.geo_class IS
  'Canonical B-roll geography containment tree. Service-role-only; RLS enabled with ZERO policies = deliberate deny-all for non-BYPASSRLS roles (inspector_ro therefore sees an empty table, not an error). All production reads go through postgres-owned SECURITY DEFINER public.resolve_slot_assets. Writes are postgres-only.';

INSERT INTO c.geo_class (geo_key, geo_level, parent_key, label) VALUES
  ('generic',              'generic',  NULL,      'Generic — no identifiable locale'),
  ('au',                   'national', NULL,      'Australia (national)'),
  ('au_nsw',               'state',    'au',      'New South Wales'),
  ('au_wa',                'state',    'au',      'Western Australia'),
  ('au_vic',               'state',    'au',      'Victoria'),
  ('au_qld',               'state',    'au',      'Queensland'),
  ('au_sa',                'state',    'au',      'South Australia'),
  ('au_nsw_sydney_metro',  'metro',    'au_nsw',  'Sydney metro'),
  ('au_wa_perth',          'metro',    'au_wa',   'Perth metro'),
  ('au_vic_melbourne_metro','metro',   'au_vic',  'Melbourne metro'),
  ('au_qld_brisbane_metro','metro',    'au_qld',  'Brisbane metro'),
  ('au_sa_adelaide_metro', 'metro',    'au_sa',   'Adelaide metro')
ON CONFLICT (geo_key) DO NOTHING;

-- -------------------------------------------------------------------------------------
-- 2. GOVERNED COPY-GEOGRAPHY DECLARATION
--    ICE records NO copy geography anywhere: m.post_draft has no locality column, and 0
--    of 281 recent property-pulse drafts carry digest_item_id, so the
--    f.canonical_content_item.content_region_key lineage is absent (and that field is
--    national-granularity only: au / AU / unknown).
--    This table is therefore the ONLY structured copy-geography input. It is a DECLARED
--    fact set by a human, never an inference from copy text or filenames.
--    An ABSENT row means UNKNOWN and fails closed to generic/national-safe assets only.
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS c.client_format_copy_geography (
  client_id    uuid NOT NULL REFERENCES c.client(client_id),
  format_key   text NOT NULL,
  copy_geo_key text NOT NULL REFERENCES c.geo_class(geo_key),
  declared_by  text NOT NULL,
  declared_at  timestamptz NOT NULL DEFAULT now(),
  notes        text NULL,
  PRIMARY KEY (client_id, format_key)
);

-- Same posture and the same corrected rationale as c.geo_class above (ENABLE, not FORCE,
-- because they are equivalent here — NOT because FORCE would block the owner).
REVOKE ALL ON c.client_format_copy_geography FROM PUBLIC, anon, authenticated;
ALTER TABLE c.client_format_copy_geography ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE c.client_format_copy_geography IS
  'GOVERNED declaration of copy geography per (client, format). A DECLARED human fact, never inferred from copy text or filenames. AN ABSENT ROW MEANS UNKNOWN AND FAILS CLOSED to generic/national-safe assets only. Service-role-only; RLS enabled with ZERO policies = deny-all for non-BYPASSRLS roles. Reads go through SECURITY DEFINER public.resolve_slot_assets; WRITES ARE POSTGRES-ONLY (no service_role or dashboard write path exists) — changing copy_geo_key requires apply_migration/execute_sql.';

-- Seed: property-pulse / video_short_stat is declared NATIONAL AUSTRALIA.
-- EVIDENCE for the declaration (not an assumption): every live video_short_stat draft
-- body is national macro-economic content — RBA cash-rate decisions, Q2 CPI, national
-- jobs data, borrowing costs. No suburb, city or state appears in the copy.
-- CONSEQUENCE: national copy is BROADER than a Sydney- or Perth-specific clip, so under
-- the containment rule all six clips stay reachable, and the conflict rule stays live —
-- if this row is ever changed to e.g. 'au_wa_perth', the four Sydney clips are excluded
-- automatically with reason_code 'geo_conflict'.
INSERT INTO c.client_format_copy_geography (client_id, format_key, copy_geo_key, declared_by, notes)
SELECT cl.client_id, 'video_short_stat', 'au', 'PK',
       'Declared national: live video_short_stat copy is national macro-economic content (RBA/CPI/jobs). Locality copy would require changing this row.'
FROM c.client cl WHERE cl.client_slug = 'property-pulse'
ON CONFLICT (client_id, format_key) DO NOTHING;

-- ⚠ FAIL-CLOSED SEED ASSERTION (db-rls-auditor MUST-FIX 1 — the packet's only
-- declared-protection-without-executable-enforcement gap, now closed).
-- The INSERT above is SELECT-driven. If that SELECT returns ZERO rows (slug renamed,
-- typo, wrong environment) the INSERT is a silent no-op, the packet COMMITs successfully,
-- and the resolver then takes the copy-geography UNKNOWN branch — which admits only
-- geo_scope='generic' or geo_national_safe='true'. ALL SIX live B-roll clips have
-- geo_national_safe = NULL, so the eligible pool would collapse 6 -> 1 (generic only):
-- exactly the outcome this whole lane exists to prevent, arriving silently.
-- An unevaluated check is a failed check. This RAISEs and aborts the whole apply.
DO $seed_assert$
DECLARE
  v_client uuid;
  v_rows   int;
BEGIN
  SELECT cl.client_id INTO v_client FROM c.client cl WHERE cl.client_slug = 'property-pulse';
  IF v_client IS NULL THEN
    RAISE EXCEPTION 'APPLY ABORTED: client_slug=''property-pulse'' not found — the copy-geography seed could not be written. Applying without it would collapse the eligible B-roll pool from 6 to 1 (UNKNOWN branch; all six clips have geo_national_safe = NULL).';
  END IF;
  SELECT count(*) INTO v_rows
  FROM c.client_format_copy_geography g
  WHERE g.client_id = v_client AND g.format_key = 'video_short_stat';
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'APPLY ABORTED: expected exactly 1 copy-geography declaration for property-pulse/video_short_stat, found %. Without it the resolver takes the UNKNOWN branch and the eligible B-roll pool collapses 6 -> 1.', v_rows;
  END IF;
END
$seed_assert$;

-- -------------------------------------------------------------------------------------
-- 3. STRUCTURED GEOGRAPHY RELATION
--    Returns the containment relationship between two geography classes.
--    'same' | 'a_contains_b' | 'b_contains_a' | 'disjoint' | 'unclassified'
--    Compatibility = the two lie on one root-to-node path. Two classes in DIFFERENT
--    branches (Sydney vs Perth) are 'disjoint' = a contradiction.
--    Never reads filenames, asset_name or asset_key.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.geo_relation(p_a text, p_b text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_hit boolean;
BEGIN
  IF p_a IS NULL OR p_b IS NULL THEN RETURN 'unclassified'; END IF;
  IF NOT EXISTS (SELECT 1 FROM c.geo_class WHERE geo_key = p_a) THEN RETURN 'unclassified'; END IF;
  IF NOT EXISTS (SELECT 1 FROM c.geo_class WHERE geo_key = p_b) THEN RETURN 'unclassified'; END IF;
  IF p_a = p_b THEN RETURN 'same'; END IF;

  -- is p_a an ancestor of p_b?  (walk p_b upward)
  WITH RECURSIVE up AS (
    SELECT g.geo_key, g.parent_key FROM c.geo_class g WHERE g.geo_key = p_b
    UNION            -- UNION, not UNION ALL: dedups, so any cycle terminates (see geo_class_no_self_parent)
    SELECT g.geo_key, g.parent_key FROM c.geo_class g JOIN up ON g.geo_key = up.parent_key
  )
  SELECT EXISTS (SELECT 1 FROM up WHERE up.geo_key = p_a) INTO v_hit;
  IF v_hit THEN RETURN 'a_contains_b'; END IF;

  -- is p_b an ancestor of p_a?  (walk p_a upward)
  WITH RECURSIVE up AS (
    SELECT g.geo_key, g.parent_key FROM c.geo_class g WHERE g.geo_key = p_a
    UNION            -- UNION, not UNION ALL: dedups, so any cycle terminates (see geo_class_no_self_parent)
    SELECT g.geo_key, g.parent_key FROM c.geo_class g JOIN up ON g.geo_key = up.parent_key
  )
  SELECT EXISTS (SELECT 1 FROM up WHERE up.geo_key = p_b) INTO v_hit;
  IF v_hit THEN RETURN 'b_contains_a'; END IF;

  RETURN 'disjoint';
END;
$function$;

-- New function => default ACL grants EXECUTE to anon + authenticated. Match the
-- resolver's own tight ACL instead.
REVOKE ALL ON FUNCTION public.geo_relation(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.geo_relation(text, text) TO service_role;

-- -------------------------------------------------------------------------------------
-- 4. RESOLVER v1.5
--    v1.4 body preserved verbatim except for the clearly-marked v1.5 ANCHORS.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_slot_assets(p_client_slug text, p_platform text, p_format text, p_template_id uuid, p_seed text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  c_scrim_opacity_needs_scrim CONSTANT numeric := 48;
  c_scrim_opacity_text_safe   CONSTANT numeric := 40;

  v_context   jsonb;
  v_client_id uuid;

  v_has_background boolean := false;
  v_bg_is_video    boolean := false;   -- video-typed Background field present?
  v_has_logo       boolean := false;
  v_has_scrim      boolean := false;
  v_image_slots    text[]  := '{}';

  v_selected  jsonb := '[]'::jsonb;
  v_rejected  jsonb := '[]'::jsonb;
  v_warnings  jsonb := '[]'::jsonb;
  v_mods      jsonb := '{}'::jsonb;
  v_platform_scope_warned boolean := false;

  v_bg_true   jsonb := '[]'::jsonb;
  v_bg_needs  jsonb := '[]'::jsonb;
  v_ranked_bg jsonb;
  v_elig_logo jsonb := '[]'::jsonb;

  r           record;
  v_slot      text;
  v_reason    text;
  v_entry     jsonb;
  v_bg_count  int;
  v_idx       int;
  v_pick      jsonb;
  v_hash      bigint;
  v_bytes     bytea;
  v_slot_name text;

  v_bg_reasons         jsonb;
  v_scrim_override_txt text;
  v_scrim_opacity      numeric;

  v_pool_policy text := 'client_only';
  v_policy      record;
  v_permitted   text[] := '{}';
  v_vertical    text;
  v_family_id   uuid;

  -- ===== v1.5 ADDITIONS =====
  v_copy_geo        text := NULL;       -- declared copy geography (NULL = unknown)
  v_geo_declared    boolean := false;
  v_asset_geo       text;
  v_geo_rel         text;
  v_geo_ok          jsonb := '[]'::jsonb;
  v_geo_compat      text;
  v_e               jsonb;
  v_recent_keys     text[] := '{}';
  v_excl_1          text := NULL;
  v_excl_2          text := NULL;
  v_after_recent    jsonb := '[]'::jsonb;
  v_recent_level    text := 'none';     -- none | excluded_2 | excluded_1 | full_pool_fallback
  v_n_eligible      int := 0;           -- pool BEFORE geography filtering
  v_n_after_geo     int := 0;
  v_n_after_recent  int := 0;
  v_fallback_reason text := NULL;
  v_pick_geo        text := NULL;
  v_pick_compat     text := NULL;
  v_broll_evidence  jsonb := NULL;
BEGIN
  v_context := jsonb_build_object(
    'client_slug', p_client_slug,
    'platform',    p_platform,
    'format',      p_format,
    'template_id', p_template_id,
    'seed',        p_seed,
    'format_used', false
  );

  SELECT t.family_id INTO v_family_id
  FROM c.creative_provider_template t
  WHERE t.id = p_template_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'fail_closed', 'modifications', '{}'::jsonb, 'selected', '[]'::jsonb,
      'rejected', '[]'::jsonb, 'warnings', '[]'::jsonb,
      'fail_reason', 'template_not_found', 'context', v_context);
  END IF;

  SELECT
    COALESCE(bool_or(f.field_kind = 'background'), false),
    COALESCE(bool_or(f.field_kind = 'logo'), false),
    COALESCE(array_agg(f.element_name ORDER BY f.element_name)
               FILTER (WHERE f.field_kind = 'image'), '{}'),
    COALESCE(bool_or(f.field_kind = 'background' AND f.element_type = 'video'), false)
  INTO v_has_background, v_has_logo, v_image_slots, v_bg_is_video
  FROM c.creative_provider_template_field f
  WHERE f.template_id = p_template_id
    AND f.dynamic = true
    AND f.field_kind IN ('background', 'logo', 'image');

  SELECT EXISTS (
    SELECT 1 FROM c.creative_provider_template_field f
    WHERE f.template_id = p_template_id AND f.element_name = 'Scrim'
  ) INTO v_has_scrim;

  SELECT cl.client_id INTO v_client_id
  FROM c.client cl
  WHERE cl.client_slug = p_client_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'fail_closed', 'modifications', '{}'::jsonb, 'selected', '[]'::jsonb,
      'rejected', '[]'::jsonb, 'warnings', '[]'::jsonb,
      'fail_reason', 'client_not_found', 'context', v_context);
  END IF;

  SELECT * INTO v_policy FROM c.client_asset_pool_policy WHERE client_id = v_client_id;
  IF FOUND THEN
    v_pool_policy := v_policy.pool_policy;
    IF v_pool_policy IN ('client_preferred', 'best_fit') THEN
      IF v_policy.allow_vertical_shared THEN v_permitted := v_permitted || 'vertical_shared'::text; END IF;
      IF v_policy.allow_global_shared   THEN v_permitted := v_permitted || 'global_generic'::text;  END IF;
    END IF;
  END IF;

  IF p_platform IS NULL THEN
    v_warnings := v_warnings || to_jsonb('platform_input_missing'::text);
  END IF;

  FOR r IN
    SELECT
      cba.asset_id,
      cba.asset_url,
      cba.is_active,
      cba.platform_scope,
      cba.created_at,
      COALESCE(cba.asset_meta->>'asset_key', cba.asset_id::text) AS asset_key,
      cba.asset_meta->>'usage'                                   AS asset_usage,
      cba.asset_meta->>'approved'                                AS approved_txt,
      cba.asset_meta->>'license_type'                            AS license_type,
      cba.asset_meta->>'license'                                 AS license,
      cba.asset_meta->>'license_expires_at'                      AS license_expires_at,
      COALESCE(cba.asset_meta->>'bucket', '')                    AS bucket,
      cba.asset_meta->>'safe_for_text_overlay'                   AS sfto,
      cba.asset_meta->>'scrim_opacity_override'                  AS scrim_override,
      -- v1.5 ANCHOR G1: structured geography metadata. Read from asset_meta ONLY —
      -- geo_scope is NOT a column on c.client_brand_asset. Never derived from
      -- asset_name/asset_key/filename.
      cba.asset_meta->>'geo_scope'                               AS geo_scope,
      cba.asset_meta->>'geo_national_safe'                       AS geo_national_safe
    FROM c.client_brand_asset cba
    WHERE cba.client_id = v_client_id
      -- ANCHOR 2 (v1.4): Background is EXCLUSIVE by element type.
      AND (cba.asset_meta->>'usage' = 'logo'
           OR (v_bg_is_video AND cba.asset_meta->>'usage' = 'broll_background')
           OR (NOT v_bg_is_video AND cba.asset_meta->>'usage' = 'background'))
    ORDER BY cba.created_at ASC, cba.asset_id ASC
  LOOP
    v_slot   := CASE WHEN r.asset_usage IN ('background', 'broll_background') THEN 'Background' ELSE 'Logo' END;
    v_reason := NULL;

    IF r.is_active IS NOT TRUE THEN
      v_reason := 'inactive';
    ELSIF (r.approved_txt)::boolean IS NOT TRUE THEN
      v_reason := 'not_approved';
    ELSIF r.license_type IS NULL AND r.license IS NULL THEN
      v_reason := 'license_missing';
    ELSIF r.license_expires_at IS NOT NULL
      AND (r.license_expires_at)::timestamptz < now() THEN
      v_reason := 'license_expired';
    ELSIF r.bucket <> 'brand-assets' THEN
      v_reason := 'output_as_input_risk';
    ELSIF r.platform_scope IS NOT NULL AND p_platform IS NOT NULL
      AND p_platform <> ALL (r.platform_scope) THEN
      v_reason := 'platform_excluded';
    ELSE
      IF r.platform_scope IS NULL AND NOT v_platform_scope_warned THEN
        v_warnings := v_warnings || to_jsonb('platform_scope_unbacked'::text);
        v_platform_scope_warned := true;
      END IF;
      IF r.asset_usage IN ('background', 'broll_background') THEN
        IF r.sfto = 'false' THEN
          v_reason := 'not_text_safe';
        ELSIF r.sfto IS NULL THEN
          v_reason := 'text_safety_unknown';
        ELSIF r.sfto NOT IN ('true', 'needs_scrim') THEN
          v_reason := 'text_safety_unknown';
        END IF;
      END IF;
    END IF;

    IF v_reason IS NOT NULL THEN
      v_rejected := v_rejected || jsonb_build_object(
        'slot', v_slot, 'asset_key', r.asset_key, 'reason_code', v_reason);
    ELSIF r.asset_usage IN ('background', 'broll_background') THEN
      v_entry := jsonb_build_object(
        'asset_id', r.asset_id, 'asset_key', r.asset_key,
        'asset_url', r.asset_url, 'sfto', r.sfto,
        'scrim_override', r.scrim_override,
        -- v1.5 ANCHOR G2: carry geography forward on the candidate entry.
        'geo_scope', r.geo_scope,
        'geo_national_safe', r.geo_national_safe,
        '_ord', r.created_at, '_origin', 'client');
      IF r.sfto = 'true' THEN
        v_bg_true := v_bg_true || v_entry;
      ELSE
        v_bg_needs := v_bg_needs || v_entry;
      END IF;
    ELSE
      v_elig_logo := v_elig_logo || jsonb_build_object(
        'asset_id', r.asset_id, 'asset_key', r.asset_key, 'asset_url', r.asset_url);
    END IF;
  END LOOP;

  IF v_has_background
     AND NOT v_bg_is_video
     AND v_pool_policy <> 'client_only'
     AND array_length(v_permitted, 1) IS NOT NULL
     AND (
       v_pool_policy = 'best_fit'
       OR (v_pool_policy = 'client_preferred'
           AND jsonb_array_length(v_bg_true)  = 0
           AND jsonb_array_length(v_bg_needs) = 0)
     ) THEN

    IF 'vertical_shared' = ANY (v_permitted) THEN
      v_vertical := public.derive_template_vertical(p_template_id)->>'vertical_key';
    END IF;

    FOR r IN
      SELECT
        sa.id                                              AS asset_id,
        sa.asset_url,
        sa.created_at,
        COALESCE(sa.asset_meta->>'asset_key', sa.id::text) AS asset_key,
        sa.asset_meta->>'safe_for_text_overlay'            AS sfto,
        sa.asset_meta->>'scrim_opacity_override'           AS scrim_override,
        sa.governance_scope,
        sa.vertical_key,
        sa.platform_scope,
        sa.is_active,
        sa.production_use_allowed,
        sa.purpose_bound,
        sa.licence_allows_multi_entity_use,
        sa.allowed_clients,
        sa.excluded_clients
      FROM c.shared_creative_asset sa
      WHERE sa.asset_kind = 'static_background'
        AND sa.governance_scope = ANY (v_permitted)
      ORDER BY sa.created_at ASC, sa.id ASC
    LOOP
      v_reason := NULL;
      IF r.is_active IS NOT TRUE THEN
        v_reason := 'inactive';
      ELSIF r.production_use_allowed IS NOT TRUE THEN
        v_reason := 'production_use_not_allowed';
      ELSIF r.purpose_bound IS TRUE THEN
        v_reason := 'purpose_bound';
      ELSIF r.licence_allows_multi_entity_use IS NOT TRUE THEN
        v_reason := 'licence_not_multi_entity';
      ELSIF v_client_id = ANY (r.excluded_clients) THEN
        v_reason := 'client_excluded';
      ELSIF array_length(r.allowed_clients, 1) IS NOT NULL
        AND v_client_id <> ALL (r.allowed_clients) THEN
        v_reason := 'not_in_allowlist';
      ELSIF r.governance_scope = 'vertical_shared'
        AND r.vertical_key IS DISTINCT FROM v_vertical THEN
        v_reason := 'vertical_mismatch';
      ELSIF r.platform_scope IS NOT NULL AND p_platform IS NOT NULL
        AND p_platform <> ALL (r.platform_scope) THEN
        v_reason := 'platform_excluded';
      ELSIF r.sfto = 'false' THEN
        v_reason := 'not_text_safe';
      ELSIF r.sfto IS NULL THEN
        v_reason := 'text_safety_unknown';
      ELSIF r.sfto NOT IN ('true', 'needs_scrim') THEN
        v_reason := 'text_safety_unknown';
      END IF;

      IF v_reason IS NOT NULL THEN
        v_rejected := v_rejected || jsonb_build_object(
          'slot', 'Background', 'asset_key', r.asset_key, 'reason_code', v_reason);
      ELSE
        v_entry := jsonb_build_object(
          'asset_id', r.asset_id, 'asset_key', r.asset_key,
          'asset_url', r.asset_url, 'sfto', r.sfto,
          'scrim_override', r.scrim_override,
          '_ord', r.created_at, '_origin', 'shared');
        IF r.sfto = 'true' THEN
          v_bg_true := v_bg_true || v_entry;
        ELSE
          v_bg_needs := v_bg_needs || v_entry;
        END IF;
      END IF;
    END LOOP;
  END IF;

  IF v_pool_policy = 'best_fit' THEN
    SELECT COALESCE(
      jsonb_agg(e ORDER BY
        ((e->>'sfto') IS DISTINCT FROM 'true'),
        (e->>'_ord')::timestamptz ASC,
        (e->>'asset_id')::uuid ASC,
        (e->>'_origin') ASC
      ), '[]'::jsonb)
    INTO v_ranked_bg
    FROM jsonb_array_elements(v_bg_true || v_bg_needs) AS e;
  ELSE
    v_ranked_bg := v_bg_true || v_bg_needs;
  END IF;
  v_bg_count   := jsonb_array_length(v_ranked_bg);
  v_n_eligible := v_bg_count;

  -- ===================================================================================
  -- v1.5 ANCHOR G3 — B-ROLL ROTATION GOVERNANCE.
  -- GATED ON v_bg_is_video: an IMAGE Background takes the v1.4 path untouched.
  -- Order is deliberate: geography FIRST (a contradiction is never acceptable), then
  -- recent-use (a repeat is merely undesirable). Recent-use can therefore never
  -- reintroduce a geographically contradictory clip.
  -- ===================================================================================
  IF v_bg_is_video AND v_has_background AND v_bg_count > 0 THEN

    ---------------------------------------------------------------------------------
    -- G3.a  Resolve the DECLARED copy geography. Absent row = UNKNOWN (fail closed).
    ---------------------------------------------------------------------------------
    SELECT g.copy_geo_key INTO v_copy_geo
    FROM c.client_format_copy_geography g
    WHERE g.client_id = v_client_id AND g.format_key = p_format;
    v_geo_declared := FOUND;
    IF NOT v_geo_declared THEN
      v_copy_geo := NULL;
      v_warnings := v_warnings || to_jsonb('copy_geography_undeclared'::text);
    END IF;

    ---------------------------------------------------------------------------------
    -- G3.b  GEOGRAPHY COMPATIBILITY FILTER.
    --   generic asset            -> always compatible
    --   copy geography KNOWN     -> compatible iff asset and copy lie on ONE
    --                               root-to-node path (same / either contains the
    --                               other). Different branches = 'geo_conflict'
    --                               (a Sydney clip against Perth copy).
    --   copy geography UNKNOWN   -> generic or EXPLICITLY national-safe assets only.
    --   asset geography missing
    --   or not a known class     -> 'geo_unclassified' REJECT. Never silently treated
    --                               as generic — that is exactly the relabelling this
    --                               lane forbids.
    ---------------------------------------------------------------------------------
    -- WITH ORDINALITY + ORDER BY: candidate order is indexed POSITIONALLY by the seeded
    -- index below, so ordering must be a contractual property of this code, not an
    -- incidental property of the FunctionScan (db-rls-auditor should-fix).
    FOR v_e IN SELECT t.e FROM jsonb_array_elements(v_ranked_bg) WITH ORDINALITY AS t(e, ord)
               ORDER BY t.ord LOOP
      v_asset_geo  := v_e->>'geo_scope';
      v_geo_compat := NULL;
      v_reason     := NULL;

      IF v_asset_geo IS NULL
         OR NOT EXISTS (SELECT 1 FROM c.geo_class WHERE geo_key = v_asset_geo) THEN
        v_reason := 'geo_unclassified';
      ELSIF v_asset_geo = 'generic' THEN
        v_geo_compat := 'generic_asset';
      ELSIF v_copy_geo IS NULL THEN
        IF (v_e->>'geo_national_safe') = 'true' THEN
          v_geo_compat := 'national_safe_under_unknown_copy';
        ELSE
          v_reason := 'geo_copy_unknown_specific_asset';
        END IF;
      ELSE
        v_geo_rel := public.geo_relation(v_asset_geo, v_copy_geo);
        IF v_geo_rel = 'same' THEN
          v_geo_compat := 'exact_match';
        ELSIF v_geo_rel = 'b_contains_a' THEN
          v_geo_compat := 'asset_narrower_than_copy';   -- Sydney clip, national copy
        ELSIF v_geo_rel = 'a_contains_b' THEN
          v_geo_compat := 'asset_broader_than_copy';    -- national clip, Sydney copy
        ELSE
          v_reason := 'geo_conflict';                   -- Sydney clip, Perth copy
        END IF;
      END IF;

      IF v_reason IS NOT NULL THEN
        v_rejected := v_rejected || jsonb_build_object(
          'slot', 'Background', 'asset_key', v_e->>'asset_key',
          'reason_code', v_reason,
          'asset_geo', v_asset_geo, 'copy_geo', v_copy_geo);
      ELSE
        v_geo_ok := v_geo_ok || (v_e || jsonb_build_object('geo_compat', v_geo_compat));
      END IF;
    END LOOP;

    v_n_after_geo := jsonb_array_length(v_geo_ok);

    ---------------------------------------------------------------------------------
    -- G3.c  ASSET-SHORTAGE FAIL-CLOSED.
    -- No compatible clip (not even a generic one) => fail closed with an explicit
    -- asset-shortage reason. The requested format is NEVER silently substituted and no
    -- contradictory footage is ever used.
    ---------------------------------------------------------------------------------
    IF v_n_after_geo = 0 THEN
      RETURN jsonb_build_object(
        'status', 'fail_closed', 'modifications', '{}'::jsonb, 'selected', v_selected,
        'rejected', v_rejected, 'warnings', v_warnings,
        'fail_reason', 'no_geo_compatible_background',
        'broll_selection', jsonb_build_object(
          'copy_geo', v_copy_geo,
          'copy_geo_declared', v_geo_declared,
          'pool_eligible', v_n_eligible,
          'pool_after_geo', 0,
          'pool_after_recent_use', 0,
          'recent_use_level', 'not_reached',
          'fallback_reason', 'asset_shortage_no_geo_compatible_clip'),
        'context', v_context);
    END IF;

    ---------------------------------------------------------------------------------
    -- G3.d  RECENT-USE AVOIDANCE.
    -- History source: m.post_render_log render_spec.template.tmr.slot_reasons[] where
    -- slot='Background' — the asset_key the worker already stamps per render.
    -- status='succeeded' only: a clip nobody ever saw was not "used".
    -- STICKY ON RETRY: rows whose post_draft_id matches p_seed are excluded from the
    -- history. In production select_template passes p_seed = post_draft_id verbatim, so
    -- re-rendering the SAME draft reproduces the SAME clip (idempotent evidence, and a
    -- retry storm cannot walk the pool). If p_seed is not a draft id (tests), no row
    -- matches and the behaviour degrades safely to "exclude over all history".
    ---------------------------------------------------------------------------------
    -- Make the D2 caller convention VISIBLE instead of silently assumed (external review
    -- pushback 1). Production passes p_seed = post_draft_id, but the function cannot
    -- enforce that. A non-UUID seed simply matches no row, so stickiness degrades safely
    -- to "exclude over all history" — which is correct, but must not be silent.
    IF p_seed IS NOT NULL
       AND p_seed !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      v_warnings := v_warnings || to_jsonb('recent_use_seed_not_draft_id'::text);
    END IF;

    -- NOTE (recorded, not a defect): `prl.client_id = v_client_id` also excludes SMOKE
    -- renders, which the video-worker logs with client_id = NULL. That is the intended
    -- semantics — a smoke render must not consume a rotation slot — and is stated here so
    -- it is a design decision rather than a side effect.
    SELECT COALESCE(array_agg(x.bg_key ORDER BY x.last_used DESC), '{}')
    INTO v_recent_keys
    FROM (
      SELECT
        jsonb_path_query_first(
          prl.render_spec,
          '$.template.tmr.slot_reasons[*] ? (@.slot == "Background")'
        )->>'asset_key' AS bg_key,
        max(prl.created_at) AS last_used
      FROM m.post_render_log prl
      WHERE prl.client_id     = v_client_id
        AND prl.ice_format_key = p_format
        AND prl.status         = 'succeeded'
        -- Bounded window: only the two most recent keys are ever consumed, so a bound costs
        -- nothing behaviourally and stops this aggregating an unbounded, monotonically
        -- growing history forever (db-rls-auditor should-fix).
        AND prl.created_at     > now() - interval '90 days'
        AND (p_seed IS NULL OR prl.post_draft_id::text IS DISTINCT FROM p_seed)
      GROUP BY 1
    ) x
    WHERE x.bg_key IS NOT NULL;

    v_excl_1 := v_recent_keys[1];   -- immediately previous
    v_excl_2 := v_recent_keys[2];   -- one before that

    -- Tier 1: exclude the two most recent (preferred).
    -- ORDER BY ord is load-bearing: the surviving array is indexed positionally below.
    SELECT COALESCE(jsonb_agg(t.e ORDER BY t.ord), '[]'::jsonb) INTO v_after_recent
    FROM jsonb_array_elements(v_geo_ok) WITH ORDINALITY AS t(e, ord)
    WHERE (t.e->>'asset_key') IS DISTINCT FROM v_excl_1
      AND (t.e->>'asset_key') IS DISTINCT FROM v_excl_2;
    v_recent_level := 'excluded_2';

    -- Tier 2: not enough alternatives -> exclude only the immediately previous.
    -- This tier is the HARD requirement; tier 1 is the preference.
    IF jsonb_array_length(v_after_recent) = 0 THEN
      SELECT COALESCE(jsonb_agg(t.e ORDER BY t.ord), '[]'::jsonb) INTO v_after_recent
      FROM jsonb_array_elements(v_geo_ok) WITH ORDINALITY AS t(e, ord)
      WHERE (t.e->>'asset_key') IS DISTINCT FROM v_excl_1;
      v_recent_level    := 'excluded_1';
      v_fallback_reason := 'insufficient_alternatives_for_two_exclusions';
    END IF;

    -- Tier 3: a single compatible clip -> fail SAFELY back to the full compatible pool
    -- rather than fail closed. A repeat is acceptable; an empty candidate set is not.
    IF jsonb_array_length(v_after_recent) = 0 THEN
      v_after_recent    := v_geo_ok;
      v_recent_level    := 'full_pool_fallback';
      v_fallback_reason := 'single_compatible_clip_repeat_unavoidable';
      v_warnings := v_warnings || to_jsonb('recent_use_fallback_full_pool'::text);
    END IF;

    IF NOT v_geo_declared THEN
      v_fallback_reason := COALESCE(v_fallback_reason, 'copy_geography_undeclared_generic_only');
    END IF;

    v_ranked_bg      := v_after_recent;
    v_bg_count       := jsonb_array_length(v_ranked_bg);
    v_n_after_recent := v_bg_count;
  END IF;
  -- =================================== end ANCHOR G3 =================================

  IF v_has_background THEN
    IF v_bg_count = 0 THEN
      RETURN jsonb_build_object(
        'status', 'fail_closed', 'modifications', '{}'::jsonb, 'selected', v_selected,
        'rejected', v_rejected, 'warnings', v_warnings,
        'fail_reason', 'no_governed_background', 'context', v_context);
    END IF;

    -- Seeded index UNCHANGED (FNV-1a). Determinism is preserved: given the same pool,
    -- the same history and the same seed, the pick is identical.
    IF p_seed IS NOT NULL THEN
      v_hash  := 2166136261;
      v_bytes := convert_to(p_seed, 'UTF8');
      FOR i IN 0 .. octet_length(v_bytes) - 1 LOOP
        v_hash := v_hash # get_byte(v_bytes, i)::bigint;
        v_hash := (v_hash * 16777619) % 4294967296;
      END LOOP;
      v_idx := (v_hash % v_bg_count)::int;
    ELSE
      v_idx := 0;
    END IF;

    v_pick := v_ranked_bg -> v_idx;
    v_mods := v_mods || jsonb_build_object('Background.source', v_pick->>'asset_url');

    v_bg_reasons := jsonb_build_array(
      'governed', 'license_ok',
      CASE WHEN v_pick->>'sfto' = 'true' THEN 'text_safe_true' ELSE 'text_safe_needs_scrim' END,
      'client_match');

    -- v1.5 ANCHOR G4: VISIBILITY. These strings ride the EXISTING evidence channel —
    -- the worker already copies selected[].reasons into
    -- render_spec.template.tmr.slot_reasons[].reasons verbatim, so every field below is
    -- durably recorded per render with NO worker change and NO edge-function deploy.
    IF v_bg_is_video THEN
      v_pick_geo    := v_pick->>'geo_scope';
      v_pick_compat := v_pick->>'geo_compat';
      v_bg_reasons := v_bg_reasons
        || to_jsonb(('geo_class:'        || COALESCE(v_pick_geo, 'unclassified'))::text)
        || to_jsonb(('geo_copy:'         || COALESCE(v_copy_geo, 'unknown'))::text)
        || to_jsonb(('geo_compat:'       || COALESCE(v_pick_compat, 'none'))::text)
        || to_jsonb(('recent_use:'       || v_recent_level)::text)
        || to_jsonb(('pool_eligible:'    || v_n_eligible)::text)
        || to_jsonb(('pool_after_geo:'   || v_n_after_geo)::text)
        || to_jsonb(('pool_after_recent:'|| v_n_after_recent)::text);
      IF v_fallback_reason IS NOT NULL THEN
        v_bg_reasons := v_bg_reasons || to_jsonb(('fallback:' || v_fallback_reason)::text);
      END IF;

      v_broll_evidence := jsonb_build_object(
        'selected_asset_key',    v_pick->>'asset_key',
        'selected_asset_id',     v_pick->>'asset_id',
        'geo_class',             v_pick_geo,
        'geo_compat',            v_pick_compat,
        'copy_geo',              v_copy_geo,
        'copy_geo_declared',     v_geo_declared,
        'recent_use_level',      v_recent_level,
        'recent_use_excluded',   (SELECT COALESCE(jsonb_agg(k), '[]'::jsonb)
                                    FROM unnest(ARRAY[v_excl_1, v_excl_2]) AS k
                                   WHERE k IS NOT NULL),
        'pool_eligible',         v_n_eligible,
        'pool_after_geo',        v_n_after_geo,
        'pool_after_recent_use', v_n_after_recent,
        'fallback_reason',       v_fallback_reason);
    END IF;

    IF v_has_scrim THEN
      v_scrim_opacity := CASE WHEN v_pick->>'sfto' = 'needs_scrim'
                              THEN c_scrim_opacity_needs_scrim
                              ELSE c_scrim_opacity_text_safe END;
      v_scrim_override_txt := v_pick->>'scrim_override';
      IF v_scrim_override_txt IS NOT NULL THEN
        IF v_scrim_override_txt ~ '^\s*[+-]?([0-9]+(\.[0-9]+)?|\.[0-9]+)\s*$' THEN
          v_scrim_opacity := LEAST(GREATEST((v_scrim_override_txt)::numeric, 0), 100);
          v_bg_reasons := v_bg_reasons || to_jsonb('scrim_override_applied'::text);
        ELSE
          v_warnings := v_warnings || to_jsonb('scrim_override_invalid'::text);
        END IF;
      END IF;
      v_mods := v_mods || jsonb_build_object('Scrim.opacity', v_scrim_opacity);
    END IF;

    v_selected := v_selected || jsonb_build_object(
      'slot', 'Background',
      'asset_key', v_pick->>'asset_key',
      'asset_id',  v_pick->>'asset_id',
      'asset_url', v_pick->>'asset_url',
      'reasons', v_bg_reasons);
  END IF;

  IF v_has_logo THEN
    IF jsonb_array_length(v_elig_logo) = 0 THEN
      RETURN jsonb_build_object(
        'status', 'fail_closed', 'modifications', '{}'::jsonb, 'selected', v_selected,
        'rejected', v_rejected, 'warnings', v_warnings,
        'fail_reason', 'missing_required_logo', 'context', v_context);
    END IF;
    v_pick := v_elig_logo -> 0;
    v_mods := v_mods || jsonb_build_object('Logo.source', v_pick->>'asset_url');
    v_selected := v_selected || jsonb_build_object(
      'slot', 'Logo',
      'asset_key', v_pick->>'asset_key',
      'asset_id',  v_pick->>'asset_id',
      'asset_url', v_pick->>'asset_url',
      'reasons', jsonb_build_array('governed', 'license_ok', 'client_match'));
  END IF;

  FOREACH v_slot_name IN ARRAY v_image_slots LOOP
    v_warnings := v_warnings || to_jsonb('optional_slot_unfilled:' || v_slot_name);
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'ok',
    'modifications', v_mods,
    'selected', v_selected,
    'rejected', v_rejected,
    'warnings', v_warnings,
    'fail_reason', NULL,
    -- v1.5: additive top-level evidence block. NULL for every non-B-roll resolution, so
    -- the image path's response shape gains one always-null key and nothing else.
    'broll_selection', v_broll_evidence,
    'context', v_context);
END;
$function$;

-- ACL note: CREATE OR REPLACE PRESERVES the existing ACL
-- (postgres=X/postgres | service_role=X/postgres). Re-asserted defensively below so the
-- packet is safe even if replayed after an accidental DROP+CREATE.
REVOKE ALL ON FUNCTION public.resolve_slot_assets(text, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_slot_assets(text, text, text, uuid, text) TO service_role;

-- Explicit COMMIT — see the APPLY CHANNEL note in the header. This is the LAST statement in
-- the file; nothing may be appended after it.
COMMIT;
