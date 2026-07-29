-- =====================================================================
-- Creative Template Portfolio — read-only RPC pair for the invegent-dashboard
-- "Creative Templates" tab (a separate, NOT-YET-BUILT dashboard change).
--
-- Adds exactly TWO new, additive-only, read-only SECURITY DEFINER functions
-- to schema `public`:
--   (1) public.get_creative_template_portfolio(text)         — per-template rows
--   (2) public.get_creative_template_portfolio_summary(text) — per-format rollup + B-roll status
--
-- NOTHING ELSE IN THE DATABASE CHANGES. No existing function/table/grant/index/
-- policy is touched, altered, or replaced. This migration creates two brand-new
-- functions only (bare CREATE FUNCTION, not CREATE OR REPLACE, so a pre-existing
-- object of either name aborts this migration fail-closed rather than silently
-- overwriting something).
--
-- SECURITY POSTURE — mirrors 20260729150000_cc0086_voice_config_write_rpc_v1.sql
-- and 20260719012947_create_get_client_creative_governance_rpc_v1.sql:
--   Schema `c` IS PostgREST-exposed, but every table read by these functions
--   (c.creative_provider_template, c.creative_provider_template_field,
--   c.creative_template_platform_suitability, c.creative_template_variant_candidate,
--   c.creative_template_client_assignment, c.creative_template_family,
--   c.creative_provider_template_tag, c.client_brand_asset, c.client) denies all
--   access to anon/authenticated at the row/grant level individually — these two
--   SECURITY DEFINER RPCs (running as owner postgres, SET search_path = '') are
--   the ONLY read path a dashboard service-role caller uses to assemble this view.
--   `m.post_render_log` / `m.post_draft` / `m.post_publish` are schema `m`, never
--   REST-exposed at all. EXECUTE is granted to service_role ONLY — never PUBLIC,
--   anon, or authenticated. Consumed exclusively via invegent-dashboard's
--   service-role server client; the browser's anon/authenticated client never
--   calls either function.
--
-- OUT OF SCOPE for this migration (explicitly not attempted here):
--   * No new table, column, index, trigger, or RLS policy.
--   * No change to c.creative_provider_template, c.creative_template_family, or
--     any of the other source tables listed above.
--   * No write path — both functions are pure reads (STABLE, no INSERT/UPDATE/DELETE).
--   * No dashboard UI — that is a separate, not-yet-built invegent-dashboard change
--     ("Creative Templates" tab) that will consume these two RPCs.
--   * No fix for the "nested background asset" render-proof gap (see function 1's
--     header comment) — documented as a known, accepted limitation, not solved here.
--
-- Bare CREATE FUNCTION (not CREATE OR REPLACE): a pre-existing object of either
-- name aborts this migration instead of silently replacing it.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- (1) public.get_creative_template_portfolio(p_client_slug text)
--
-- One jsonb array element per Creatomate template row relevant to a client:
--   * every scope='generic' template (regardless of assignment — unassigned
--     candidates are visible so operators can see the full pool), PLUS
--   * every scope IN ('client','brand') row whose client_id matches the
--     resolved client.
--
-- CLIENT ISOLATION IS THE SINGLE MOST IMPORTANT PROPERTY OF THIS FUNCTION:
-- a client/brand-scoped row belonging to a DIFFERENT client must never appear
-- in the output. The WHERE clause below enforces this directly (scope='generic'
-- OR (scope IN ('client','brand') AND client_id = v_client_id)) — no row from
-- another client's scope='client'/'brand' rows can pass this filter.
--
-- Fails loud on bad input (matches get_voice_config's own pattern): null/empty
-- p_client_slug -> ERRCODE 22004; unknown slug -> ERRCODE 23503. Never silently
-- returns an empty array for a typo'd slug.
--
-- KNOWN, ACCEPTED LIMITATION (documented, not fixed here): a template consumed
-- only as a *nested* background asset inside another template's render (e.g.
-- B-roll clip templates) shows zero direct proof in this function's
-- render/draft/publish counts, because only the *outer* template's id is
-- stamped at render_spec.template.provider_template_id — there is no column
-- or FK linking a render row to a *nested* template id. This exact limitation
-- is already documented in
-- docs/briefs/results/creatomate-template-graduation-matrix-v1.md §2.8 (row 27)
-- and its item 3 (line 274). Not attempted to be solved in this migration.
-- ---------------------------------------------------------------------
CREATE FUNCTION public.get_creative_template_portfolio(p_client_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
STABLE
AS $function$
DECLARE
  v_client_id   uuid;
  v_result      jsonb;
BEGIN
  -- ---- Validation (fail-closed, matches get_voice_config's pattern) ----
  IF p_client_slug IS NULL OR btrim(p_client_slug) = '' THEN
    RAISE EXCEPTION 'p_client_slug must not be null or blank'
      USING ERRCODE = '22004';
  END IF;

  SELECT cl.client_id INTO v_client_id
    FROM c.client AS cl
   WHERE cl.client_slug = p_client_slug;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'unknown client_slug % (no matching c.client row)', p_client_slug
      USING ERRCODE = '23503';
  END IF;

  WITH
  -- Hardcoded, cited provider-existence contradiction. NOT a table — a single
  -- known row, per docs/briefs/results/creatomate-template-graduation-matrix-v1.md
  -- row 17. provider_template_id is TEXT on c.creative_provider_template (not
  -- uuid), so this literal and every comparison against it stays text, no cast.
  known_provider_issues (provider_template_id, issue_type, note, source_reference) AS (
    VALUES (
      'fb9820f8-3fee-4448-b324-3d500fa74b40'::text, 'provider_verified_deleted',
      'Creatomate provider template deleted upstream. Registry status has since been corrected to ''deprecated'' (was ''production_proven'' with real historical proof when the graduation matrix was written 2026-07-29 — docs/briefs/results/creatomate-template-graduation-matrix-v1.md row 17). This override still adds value beyond the status field alone: it names the specific reason (provider deletion, not just an unspecified ''deprecated'') so runtime_state can report the more precise provider_missing instead of falling through to governance_blocked. Confirmed via property-pulse.json provider_status=retired_provider_deleted and image-worker/index.ts:931-932.',
      'docs/briefs/results/creatomate-template-graduation-matrix-v1.md row 17'
    )
  ),

  -- Base row set: every generic template + every client/brand row scoped to
  -- THIS client. This WHERE clause is the client-isolation boundary.
  base_templates AS (
    SELECT t.*
      FROM c.creative_provider_template AS t
     WHERE t.scope = 'generic'
        OR (t.scope IN ('client', 'brand') AND t.client_id = v_client_id)
  ),

  -- Field-derived slot flags per template.
  field_flags AS (
    SELECT
      f.template_id,
      bool_or(f.field_kind IN ('image', 'background') AND f.element_type IS DISTINCT FROM 'video')
        AS has_image_asset_slot,
      bool_or(f.field_kind = 'background' AND f.element_type = 'video')
        AS has_video_background_slot,
      bool_or(f.field_kind = 'audio' AND f.element_name = 'VoiceAudio')
        AS has_voice_slot,
      bool_or(f.field_kind = 'audio' AND f.element_name = 'MusicBed')
        AS has_music_slot
    FROM c.creative_provider_template_field AS f
    JOIN base_templates AS bt ON bt.id = f.template_id
    GROUP BY f.template_id
  ),

  -- Field contract array (per template, full row detail — dashboard renders this raw).
  field_contract AS (
    SELECT
      f.template_id,
      jsonb_agg(
        jsonb_build_object(
          'element_id',            f.element_id,
          'element_name',          f.element_name,
          'element_type',          f.element_type,
          'track',                 f.track,
          'dynamic',               f.dynamic,
          'field_kind',            f.field_kind,
          'default_value_safe',    f.default_value_safe,
          'style_summary',         f.style_summary,
          'constraints',           f.constraints,
          'required_for_render',   f.required_for_render
        )
        ORDER BY f.element_id
      ) AS field_contract
    FROM c.creative_provider_template_field AS f
    JOIN base_templates AS bt ON bt.id = f.template_id
    GROUP BY f.template_id
  ),

  -- Platform suitability array (per template).
  platforms AS (
    SELECT
      s.template_id,
      jsonb_agg(
        jsonb_build_object(
          'platform',            s.platform,
          'placement',           s.placement,
          'suitability_status',  s.suitability_status,
          'reason',              s.reason,
          'constraints',         s.constraints,
          'proof_reference',     s.proof_reference,
          'last_reviewed_at',    s.last_reviewed_at
        )
        ORDER BY s.platform, s.placement
      ) AS platforms
    FROM c.creative_template_platform_suitability AS s
    JOIN base_templates AS bt ON bt.id = s.template_id
    GROUP BY s.template_id
  ),

  -- Variant candidates array + reachability flags (per template). Zero rows
  -- at all is distinct from "rows exist but none reachable" — both fold to
  -- has_reachable_candidate=false, but has_any_variant_row is tracked
  -- separately so current_blocker text can name the "explicit governance
  -- fence, zero variant rows" case distinctly from "reviewed and rejected".
  variant_candidates AS (
    SELECT
      v.template_id,
      jsonb_agg(
        jsonb_build_object(
          'format_key',                        v.format_key,
          'variant_key',                        v.variant_key,
          'fit_status',                         v.fit_status,
          'fit_reason',                         v.fit_reason,
          'required_field_mapping_status',      v.required_field_mapping_status,
          'missing_fields',                     v.missing_fields,
          'reviewed_by',                        v.reviewed_by,
          'reviewed_at',                        v.reviewed_at
        )
        ORDER BY v.format_key, v.variant_key
      ) AS variant_candidates,
      bool_or(v.fit_status IN ('candidate', 'strong_candidate')) AS has_reachable_candidate,
      true AS has_any_variant_row
    FROM c.creative_template_variant_candidate AS v
    JOIN base_templates AS bt ON bt.id = v.template_id
    GROUP BY v.template_id
  ),

  -- This client's own assignment status for each template (if any).
  client_assignment AS (
    SELECT
      a.template_id,
      a.assignment_status
    FROM c.creative_template_client_assignment AS a
    JOIN base_templates AS bt ON bt.id = a.template_id
    WHERE a.client_id = v_client_id
  ),

  -- Layout-family vertical tags.
  vertical_tags AS (
    SELECT
      tg.template_id,
      jsonb_agg(tg.value ORDER BY tg.value) AS layout_family_tags
    FROM c.creative_provider_template_tag AS tg
    JOIN base_templates AS bt ON bt.id = tg.template_id
    WHERE tg.namespace = 'vertical'
    GROUP BY tg.template_id
  ),

  -- Family lookup.
  family AS (
    SELECT
      fam.id,
      fam.family_key,
      fam.family_name
    FROM c.creative_template_family AS fam
  ),

  -- Proof join: only link from a render row to a template is the JSONB path
  -- render_spec -> 'template' ->> 'provider_template_id' (no FK, no dedicated
  -- column). status='succeeded' = real completed render; any other status is
  -- an attempt, not proof. pp.status='published' = real publish.
  render_proof AS (
    SELECT
      bt.id AS template_id,
      count(*) FILTER (WHERE rl.status = 'succeeded')                          AS render_succeeded_count,
      count(*) FILTER (WHERE rl.status IS DISTINCT FROM 'succeeded')           AS render_other_count,
      max(rl.created_at) FILTER (WHERE rl.status = 'succeeded')                AS last_render_at,
      count(DISTINCT pd.post_draft_id) FILTER (WHERE rl.status = 'succeeded')  AS draft_count,
      max(pd.created_at) FILTER (WHERE rl.status = 'succeeded')                AS last_draft_at,
      count(DISTINCT pp.post_publish_id) FILTER (WHERE pp.status = 'published') AS publish_count,
      max(pp.published_at) FILTER (WHERE pp.status = 'published')              AS last_publish_at
    FROM base_templates AS bt
    LEFT JOIN m.post_render_log AS rl
      ON rl.render_spec -> 'template' ->> 'provider_template_id' = bt.provider_template_id
    LEFT JOIN m.post_draft AS pd
      ON pd.post_draft_id = rl.post_draft_id
    LEFT JOIN m.post_publish AS pp
      ON pp.post_draft_id = pd.post_draft_id
    GROUP BY bt.id
  ),

  -- B-roll eligible pool count for this client. Approximates
  -- resolve_slot_assets() v1.4's eligibility criteria per
  -- docs/briefs/results/broll-rotation-readiness-handoff-v1.md §4.4 — NOT a
  -- live resolve_slot_assets() call, so treat as an estimate, not a
  -- resolver-verified count.
  broll_pool AS (
    SELECT count(*) AS broll_eligible_pool_count
      FROM c.client_brand_asset AS a
     WHERE a.client_id = v_client_id
       AND a.asset_meta ->> 'usage' = 'broll_background'
       AND a.is_active = true
       AND (a.asset_meta ->> 'approved') = 'true'
       AND a.asset_meta ->> 'safe_for_text_overlay' IN ('true', 'needs_scrim')
       AND a.asset_meta ->> 'bucket' = 'brand-assets'
       AND (a.asset_meta ->> 'license_type' IS NOT NULL OR a.asset_meta ->> 'license' IS NOT NULL)
       AND (
             a.asset_meta ->> 'license_expires_at' IS NULL
          OR (a.asset_meta ->> 'license_expires_at')::timestamptz > now()
           )
  ),

  -- Assemble every intermediate column needed to derive the four
  -- classification fields in one consistent pass (so lifecycle / runtime_state
  -- / current_blocker / next_required_gate always agree with each other).
  assembled AS (
    SELECT
      bt.*,
      COALESCE(ff.has_image_asset_slot, false)        AS has_image_asset_slot,
      COALESCE(ff.has_video_background_slot, false)   AS has_video_background_slot,
      COALESCE(ff.has_voice_slot, false)               AS has_voice_slot,
      COALESCE(ff.has_music_slot, false)               AS has_music_slot,
      fc.field_contract,
      plt.platforms,
      vc.variant_candidates,
      COALESCE(vc.has_reachable_candidate, false)      AS has_reachable_candidate,
      COALESCE(vc.has_any_variant_row, false)           AS has_any_variant_row,
      ca.assignment_status                              AS this_client_assignment_status,
      vt.layout_family_tags,
      fam.family_key,
      fam.family_name,
      rp.render_succeeded_count,
      rp.render_other_count,
      rp.last_render_at,
      rp.draft_count,
      rp.last_draft_at,
      rp.publish_count,
      rp.last_publish_at,
      kpi.issue_type   AS provider_issue_type,
      kpi.note         AS provider_issue_note,
      kpi.source_reference AS provider_issue_source,
      bp.broll_eligible_pool_count,
      -- proof_level: highest tier of real evidence, else NULL.
      CASE
        WHEN COALESCE(rp.publish_count, 0) > 0 THEN 'publish_proven'
        WHEN COALESCE(rp.draft_count, 0) > 0 THEN 'real_draft_proven'
        WHEN COALESCE(rp.render_succeeded_count, 0) > 0 THEN 'render_proven'
        ELSE NULL
      END AS proof_level,
      -- label_claims_production: the template's own status OR this client's
      -- own assignment_status claims production_proven.
      (bt.status = 'production_proven' OR ca.assignment_status = 'production_proven')
        AS label_claims_production
    FROM base_templates AS bt
    LEFT JOIN field_flags        AS ff  ON ff.template_id = bt.id
    LEFT JOIN field_contract     AS fc  ON fc.template_id = bt.id
    LEFT JOIN platforms          AS plt ON plt.template_id = bt.id
    LEFT JOIN variant_candidates AS vc  ON vc.template_id = bt.id
    LEFT JOIN client_assignment  AS ca  ON ca.template_id = bt.id
    LEFT JOIN vertical_tags      AS vt  ON vt.template_id = bt.id
    LEFT JOIN family             AS fam ON fam.id = bt.family_id
    LEFT JOIN render_proof       AS rp  ON rp.template_id = bt.id
    LEFT JOIN known_provider_issues AS kpi ON kpi.provider_template_id = bt.provider_template_id
    CROSS JOIN broll_pool AS bp
  ),

  -- Derive the four classification fields, precedence-ordered per the brief.
  classified AS (
    SELECT
      a.*,
      -- lifecycle
      CASE
        WHEN a.provider_issue_type IS NOT NULL THEN 'retired'
        WHEN a.status = 'deprecated' THEN 'retired'
        WHEN a.status = 'blocked' THEN 'blocked'
        WHEN a.proof_level = 'publish_proven' AND a.label_claims_production THEN 'production_proven'
        WHEN a.proof_level IS NOT NULL THEN a.proof_level
        WHEN NOT a.has_reachable_candidate THEN 'blocked'
        WHEN a.status IN ('smoke_rendered', 'visually_approved', 'platform_safe', 'client_enabled', 'production_proven')
          THEN 'ready_for_proof'
        ELSE 'candidate'
      END AS lifecycle
    FROM assembled AS a
  ),

  final_rows AS (
    SELECT
      c2.*,
      -- label_contradicts_evidence: always returned. True whenever the label
      -- claims production but the derived lifecycle disagrees (including the
      -- proof_level branch above, where label_claims_production can still be
      -- true while lifecycle stayed at the honest proof_level instead of
      -- being upgraded to production_proven — e.g. publish_proven WITHOUT the
      -- label matching precedence 4 exactly, or draft/render-only proof with
      -- a stale production_proven label).
      (c2.label_claims_production AND c2.lifecycle NOT IN ('production_proven'))
        AS label_contradicts_evidence,
      -- runtime_state, precedence-ordered per the brief.
      CASE
        WHEN c2.provider_issue_type IS NOT NULL THEN 'provider_missing'
        WHEN NOT c2.has_reachable_candidate THEN 'governance_blocked'
        WHEN c2.has_video_background_slot AND COALESCE(c2.broll_eligible_pool_count, 0) = 0 THEN 'asset_blocked'
        WHEN c2.output_type = 'video' AND COALESCE(c2.family_key, '') NOT ILIKE '%stat_hero_card%' THEN 'worker_unsupported'
        WHEN c2.label_claims_production AND c2.proof_level = 'publish_proven' THEN 'production_winner'
        WHEN c2.has_reachable_candidate THEN 'eligible_alternate'
        ELSE 'ineligible'
      END AS runtime_state,
      -- current_blocker, same precedence, literal strings only.
      CASE
        WHEN c2.provider_issue_type IS NOT NULL THEN 'Provider template deleted upstream — registry status is stale'
        WHEN c2.status = 'deprecated' THEN 'Registry marks this template deprecated'
        WHEN c2.status = 'blocked' THEN 'Registry marks this template blocked'
        WHEN c2.proof_level = 'publish_proven' AND c2.label_claims_production THEN NULL
        WHEN c2.proof_level = 'publish_proven' THEN 'Publish proof exists but production label is not yet set'
        WHEN c2.proof_level = 'real_draft_proven' THEN 'Render proof exists but zero drafts/publishes followed'
        WHEN c2.proof_level = 'render_proven' THEN 'Render proof exists but zero drafts/publishes followed'
        WHEN NOT c2.has_any_variant_row THEN 'Governance fence — no variant_candidate row (deliberate, by design)'
        WHEN NOT c2.has_reachable_candidate THEN 'Governance fence — variant_candidate row(s) exist but none reached candidate/strong_candidate'
        WHEN c2.output_type = 'video' AND COALESCE(c2.family_key, '') NOT ILIKE '%stat_hero_card%'
          THEN 'No worker code exists for this video family — needs new render function, not just data'
        WHEN c2.has_video_background_slot AND COALESCE(c2.broll_eligible_pool_count, 0) = 0
          THEN 'B-roll-capable but zero eligible background clips for this client'
        WHEN c2.has_reachable_candidate AND c2.proof_level IS NULL
          THEN 'Zero render proof — never exercised against the live Creatomate API'
        ELSE NULL
      END AS current_blocker,
      -- next_required_gate, same precedence, literal strings only.
      CASE
        WHEN c2.provider_issue_type IS NOT NULL THEN 'Correct registry status to retired (data-only)'
        WHEN c2.status = 'deprecated' THEN NULL
        WHEN c2.status = 'blocked' THEN 'PK decision required to un-block'
        WHEN c2.proof_level = 'publish_proven' AND c2.label_claims_production THEN NULL
        WHEN c2.proof_level = 'publish_proven' THEN 'Data-only status correction — proof already exists'
        WHEN c2.proof_level IN ('real_draft_proven', 'render_proven')
          THEN 'Real render->draft->publish smoke run required (T2 lane)'
        WHEN NOT c2.has_reachable_candidate THEN 'PK decision + one real render proof'
        WHEN c2.output_type = 'video' AND COALESCE(c2.family_key, '') NOT ILIKE '%stat_hero_card%'
          THEN 'New worker render function required before un-fencing means anything'
        WHEN c2.has_video_background_slot AND COALESCE(c2.broll_eligible_pool_count, 0) = 0
          THEN 'Source additional eligible B-roll clips for this client (Asset Gap lane)'
        WHEN c2.has_reachable_candidate AND c2.proof_level IS NULL
          THEN 'Real render->draft->publish smoke run required (T2 lane)'
        ELSE NULL
      END AS next_required_gate
    FROM classified AS c2
  )

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',                            f.id,
        'provider_template_id',          f.provider_template_id,
        'provider_template_name',        f.provider_template_name,
        'scope',                         f.scope,
        'client_id',                     f.client_id,
        'brand_key',                     f.brand_key,
        'family_key',                    f.family_key,
        'family_name',                   f.family_name,
        'layout_family_tags',            COALESCE(f.layout_family_tags, '[]'::jsonb),
        'output_type',                   f.output_type,
        'width',                         f.width,
        'height',                        f.height,
        'duration_seconds',              f.duration_seconds,
        'inventory_status',              f.inventory_status,
        'registry_status',               f.status,
        'provider_issue',                CASE WHEN f.provider_issue_type IS NULL THEN NULL
                                               ELSE jsonb_build_object(
                                                 'issue_type',        f.provider_issue_type,
                                                 'note',               f.provider_issue_note,
                                                 'source_reference',   f.provider_issue_source
                                               )
                                          END,
        'field_contract',                COALESCE(f.field_contract, '[]'::jsonb),
        'has_image_asset_slot',          f.has_image_asset_slot,
        'has_video_background_slot',     f.has_video_background_slot,
        'has_voice_slot',                f.has_voice_slot,
        'has_music_slot',                f.has_music_slot,
        'platforms',                     COALESCE(f.platforms, '[]'::jsonb),
        'variant_candidates',            COALESCE(f.variant_candidates, '[]'::jsonb),
        'has_reachable_candidate',       f.has_reachable_candidate,
        'this_client_assignment_status', f.this_client_assignment_status,
        'broll_eligible_pool_count',     CASE WHEN f.has_video_background_slot THEN f.broll_eligible_pool_count ELSE NULL END,
        'render_succeeded_count',        COALESCE(f.render_succeeded_count, 0),
        'render_other_count',            COALESCE(f.render_other_count, 0),
        'last_render_at',                f.last_render_at,
        'draft_count',                   COALESCE(f.draft_count, 0),
        'last_draft_at',                 f.last_draft_at,
        'publish_count',                 COALESCE(f.publish_count, 0),
        'last_publish_at',               f.last_publish_at,
        'most_recent_use_at',            GREATEST(f.last_render_at, f.last_draft_at, f.last_publish_at),
        'lifecycle',                     f.lifecycle,
        'label_contradicts_evidence',    f.label_contradicts_evidence,
        'runtime_state',                 f.runtime_state,
        'current_blocker',               f.current_blocker,
        'next_required_gate',            f.next_required_gate
      )
      ORDER BY f.provider_template_name
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM final_rows AS f;

  RETURN v_result;
END;
$function$;

COMMENT ON FUNCTION public.get_creative_template_portfolio(text) IS
  'READ-ONLY: returns one jsonb array element per Creatomate template row relevant to a client '
  '(every scope=generic template, plus scope IN (client,brand) rows for the resolved client only '
  '— client isolation enforced in the WHERE clause). Each element carries field contract, platform '
  'suitability, variant candidates, render/draft/publish proof counts, and derived lifecycle / '
  'label_contradicts_evidence / runtime_state / current_blocker / next_required_gate fields. Unknown '
  'or blank p_client_slug RAISES rather than returning empty. Known limitation: nested background-'
  'asset template usage (e.g. B-roll clips rendered inside another template) is not visible in the '
  'proof counts — see docs/briefs/results/creatomate-template-graduation-matrix-v1.md §2.8. '
  'Service-role only. Consumed by the invegent-dashboard Creative Templates tab (not yet built) via '
  'its service-role server client — never the browser anon/authenticated client. Added by '
  '20260729160000_creative_template_portfolio_read_rpc_v1.sql.';

-- ---------------------------------------------------------------------
-- (2) public.get_creative_template_portfolio_summary(p_client_slug text)
--
-- Per-format rollup (production winner + eligible-alternate count + recent
-- uses + variety signal) plus a fixed B-roll status snapshot. Duplicates the
-- client-resolution block from function 1 rather than factoring into a shared
-- helper, per house convention (keep both functions independently readable).
-- ---------------------------------------------------------------------
CREATE FUNCTION public.get_creative_template_portfolio_summary(p_client_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
STABLE
AS $function$
DECLARE
  v_client_id     uuid;
  v_by_format     jsonb;
  v_broll_status  jsonb;
  v_broll_pool    integer;
BEGIN
  -- ---- Validation (identical to function 1 — duplicated deliberately) ----
  IF p_client_slug IS NULL OR btrim(p_client_slug) = '' THEN
    RAISE EXCEPTION 'p_client_slug must not be null or blank'
      USING ERRCODE = '22004';
  END IF;

  SELECT cl.client_id INTO v_client_id
    FROM c.client AS cl
   WHERE cl.client_slug = p_client_slug;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'unknown client_slug % (no matching c.client row)', p_client_slug
      USING ERRCODE = '23503';
  END IF;

  WITH
  base_templates AS (
    SELECT t.*
      FROM c.creative_provider_template AS t
     WHERE t.scope = 'generic'
        OR (t.scope IN ('client', 'brand') AND t.client_id = v_client_id)
  ),

  family AS (
    SELECT fam.id, fam.family_key, fam.default_format_candidate
      FROM c.creative_template_family AS fam
  ),

  -- format_key resolution per template: family's default_format_candidate,
  -- falling back to the template's own variant_candidate.format_key when the
  -- family value is null.
  template_format AS (
    SELECT
      bt.id AS template_id,
      COALESCE(
        fam.default_format_candidate,
        (SELECT vc.format_key
           FROM c.creative_template_variant_candidate AS vc
          WHERE vc.template_id = bt.id
          ORDER BY vc.created_at
          LIMIT 1)
      ) AS format_key
    FROM base_templates AS bt
    LEFT JOIN family AS fam ON fam.id = bt.family_id
  ),

  -- Platform rows seen per template (may be zero for a template — that
  -- absence is itself informative and generates a platform:null group).
  template_platforms AS (
    SELECT
      bt.id AS template_id,
      s.platform,
      (SELECT count(*) FROM c.creative_template_platform_suitability AS s2 WHERE s2.template_id = bt.id) AS suitability_row_count
    FROM base_templates AS bt
    LEFT JOIN c.creative_template_platform_suitability AS s ON s.template_id = bt.id
  ),

  -- One (format_key, platform) group per template: platform seen when
  -- suitability rows exist (one row per distinct platform), PLUS a
  -- platform:null row whenever the template has ZERO suitability rows at all
  -- (mirrors video_short_stat's platform-agnostic production path, per the
  -- graduation matrix — this is a deliberate, commented judgment call, not an
  -- attempt to model every edge case).
  format_platform_groups AS (
    SELECT DISTINCT
      tf.format_key,
      tp.platform
    FROM template_format AS tf
    JOIN template_platforms AS tp ON tp.template_id = tf.template_id
    WHERE tp.platform IS NOT NULL
    UNION
    SELECT DISTINCT
      tf.format_key,
      NULL::text AS platform
    FROM template_format AS tf
    JOIN template_platforms AS tp ON tp.template_id = tf.template_id
    WHERE tp.suitability_row_count = 0
  ),

  -- Reachability + label + proof, per template (mirrors function 1's logic,
  -- kept local/independent per house convention rather than shared).
  variant_reach AS (
    SELECT
      v.template_id,
      bool_or(v.fit_status IN ('candidate', 'strong_candidate')) AS has_reachable_candidate
    FROM c.creative_template_variant_candidate AS v
    JOIN base_templates AS bt ON bt.id = v.template_id
    GROUP BY v.template_id
  ),

  client_assignment AS (
    SELECT a.template_id, a.assignment_status
      FROM c.creative_template_client_assignment AS a
      JOIN base_templates AS bt ON bt.id = a.template_id
     WHERE a.client_id = v_client_id
  ),

  known_provider_issues (provider_template_id) AS (
    VALUES ('fb9820f8-3fee-4448-b324-3d500fa74b40'::text)
  ),

  render_proof AS (
    SELECT
      bt.id AS template_id,
      count(*) FILTER (WHERE rl.status = 'succeeded') AS render_succeeded_count,
      count(DISTINCT pp.post_publish_id) FILTER (WHERE pp.status = 'published') AS publish_count
    FROM base_templates AS bt
    LEFT JOIN m.post_render_log AS rl
      ON rl.render_spec -> 'template' ->> 'provider_template_id' = bt.provider_template_id
    LEFT JOIN m.post_draft AS pd ON pd.post_draft_id = rl.post_draft_id
    LEFT JOIN m.post_publish AS pp ON pp.post_draft_id = pd.post_draft_id
    GROUP BY bt.id
  ),

  template_runtime AS (
    SELECT
      bt.id AS template_id,
      bt.provider_template_id,
      bt.provider_template_name,
      -- production_winner mirrors function 1's runtime_state precedence,
      -- collapsed to just the winner/eligible signal needed for this rollup.
      CASE
        WHEN kpi.provider_template_id IS NOT NULL THEN false
        WHEN NOT COALESCE(vr.has_reachable_candidate, false) THEN false
        WHEN (bt.status = 'production_proven' OR ca.assignment_status = 'production_proven')
             AND COALESCE(rp.publish_count, 0) > 0 THEN true
        ELSE false
      END AS is_production_winner,
      CASE
        WHEN kpi.provider_template_id IS NOT NULL THEN false
        ELSE COALESCE(vr.has_reachable_candidate, false)
      END AS is_eligible_alternate
    FROM base_templates AS bt
    LEFT JOIN variant_reach AS vr ON vr.template_id = bt.id
    LEFT JOIN client_assignment AS ca ON ca.template_id = bt.id
    LEFT JOIN render_proof AS rp ON rp.template_id = bt.id
    LEFT JOIN known_provider_issues AS kpi ON kpi.provider_template_id = bt.provider_template_id
  ),

  -- Recent uses per format (last 10 successful renders for this client's
  -- templates in that format, newest first). Pulled directly per row (not
  -- aggregated) — same join path as function 1's proof join, selecting the
  -- two JSONB fields directly.
  recent_uses_raw AS (
    SELECT
      tf.format_key,
      rl.render_log_id,
      rl.render_spec -> 'template' ->> 'provider_template_id' AS provider_template_id,
      rl.created_at,
      rl.render_spec ->> 'background_key' AS background_key,
      row_number() OVER (PARTITION BY tf.format_key ORDER BY rl.created_at DESC) AS rn
    FROM base_templates AS bt
    JOIN template_format AS tf ON tf.template_id = bt.id
    JOIN m.post_render_log AS rl
      ON rl.render_spec -> 'template' ->> 'provider_template_id' = bt.provider_template_id
     -- KNOWN LIMITATION (non-blocking, confirmed live by db-rls-auditor): filtering on
     -- rl.client_id directly (not via post_draft.client_id) means renders where
     -- post_render_log.client_id is null but the linked draft's client_id correctly
     -- identifies this client are silently excluded from recent_uses — under-reports
     -- only, never leaks another client's data. Not fixed here. Live example: property-
     -- pulse render_log rows with client_id IS NULL despite a correctly-client-scoped
     -- linked post_draft (855236fe…/f5ac7324…/b65e9e31…).
     AND rl.client_id = v_client_id
     AND rl.status = 'succeeded'
  ),

  recent_uses_by_format AS (
    SELECT
      format_key,
      jsonb_agg(
        jsonb_build_object(
          'provider_template_id', provider_template_id,
          'render_log_id',        render_log_id,
          'created_at',           created_at,
          'background_key',       background_key
        )
        ORDER BY created_at DESC
      ) AS recent_uses,
      count(DISTINCT provider_template_id) AS distinct_template_count,
      count(DISTINCT background_key) FILTER (WHERE background_key IS NOT NULL) AS distinct_background_count,
      count(*) AS total_uses
    FROM recent_uses_raw
    WHERE rn <= 10
    GROUP BY format_key
  ),

  format_rollup AS (
    SELECT
      fpg.format_key,
      fpg.platform,
      (SELECT tr.provider_template_id
         FROM template_runtime AS tr
         JOIN template_format AS tf2 ON tf2.template_id = tr.template_id
        WHERE tf2.format_key = fpg.format_key
          AND tr.is_production_winner
        LIMIT 1) AS production_winner_provider_template_id,
      (SELECT tr.provider_template_name
         FROM template_runtime AS tr
         JOIN template_format AS tf2 ON tf2.template_id = tr.template_id
        WHERE tf2.format_key = fpg.format_key
          AND tr.is_production_winner
        LIMIT 1) AS production_winner_name,
      (SELECT count(*)
         FROM template_runtime AS tr
         JOIN template_format AS tf2 ON tf2.template_id = tr.template_id
        WHERE tf2.format_key = fpg.format_key
          AND tr.is_eligible_alternate) AS eligible_alternate_count,
      COALESCE(ru.recent_uses, '[]'::jsonb) AS recent_uses,
      (COALESCE(ru.distinct_template_count, 0) = 1) AS repeats_single_template,
      CASE
        WHEN COALESCE(ru.total_uses, 0) <= 1 THEN 'none'
        WHEN COALESCE(ru.distinct_template_count, 0) > 1 THEN 'template_variety'
        WHEN ru.distinct_template_count = 1 AND COALESCE(ru.distinct_background_count, 0) > 1 THEN 'background_rotation_only'
        ELSE 'none'
      END AS variety_source
    FROM format_platform_groups AS fpg
    LEFT JOIN recent_uses_by_format AS ru ON ru.format_key = fpg.format_key
  )

  SELECT jsonb_agg(
           jsonb_build_object(
             'format_key',                              fr.format_key,
             'platform',                                 fr.platform,
             'production_winner_provider_template_id',   fr.production_winner_provider_template_id,
             'production_winner_name',                   fr.production_winner_name,
             'eligible_alternate_count',                  fr.eligible_alternate_count,
             'recent_uses',                               fr.recent_uses,
             'repeats_single_template',                   fr.repeats_single_template,
             'variety_source',                            fr.variety_source
           )
           ORDER BY fr.format_key, fr.platform NULLS FIRST
         )
    INTO v_by_format
    FROM format_rollup AS fr;

  v_by_format := COALESCE(v_by_format, '[]'::jsonb);

  -- B-roll eligible pool count for this client — same approximation as
  -- function 1, per docs/briefs/results/broll-rotation-readiness-handoff-v1.md
  -- §4.4 (NOT a live resolve_slot_assets() call — an estimate).
  SELECT count(*) INTO v_broll_pool
    FROM c.client_brand_asset AS a
   WHERE a.client_id = v_client_id
     AND a.asset_meta ->> 'usage' = 'broll_background'
     AND a.is_active = true
     AND (a.asset_meta ->> 'approved') = 'true'
     AND a.asset_meta ->> 'safe_for_text_overlay' IN ('true', 'needs_scrim')
     AND a.asset_meta ->> 'bucket' = 'brand-assets'
     AND (a.asset_meta ->> 'license_type' IS NOT NULL OR a.asset_meta ->> 'license' IS NOT NULL)
     AND (
           a.asset_meta ->> 'license_expires_at' IS NULL
        OR (a.asset_meta ->> 'license_expires_at')::timestamptz > now()
         );

  -- FIXED LITERALS below (not queried) — hardcoded per the brief. These
  -- describe the video-worker's render-time output-parity overlay, a
  -- TypeScript constant with no DB-queryable source. Source:
  -- docs/briefs/results/broll-rotation-readiness-handoff-v1.md and
  -- video-worker/b1_video_stat.ts:130,146-159
  -- (B1_VIDEO_GOVERNED_OUTPUT_SPEC / B1_VIDEO_TEMPLATE_OUTPUT_PARITY).
  -- Point-in-time snapshot — the dashboard/migration owner must refresh this
  -- literal if the worker's parity overlay ever changes; there is no
  -- DB-queryable source for a TypeScript constant, so this is intentionally
  -- NOT made dynamic.
  --
  -- NOTE: production_winner_*/saved_provider_spec/effective_output_spec below are GLOBAL
  -- constants (same for every client — the underlying template is scope='generic',
  -- client_id=NULL), NOT a per-client-verified claim. Only eligible_pool_count is
  -- genuinely scoped to this client (via c.client_brand_asset). Do not read this whole
  -- object as "this client's active B-roll setup" — it names the system's one governed
  -- B-roll template plus this client's own eligible pool against it.
  v_broll_status := jsonb_build_object(
    'production_winner_provider_template_id', '46c5c4ac-4d35-488c-b57c-44e05d790fb9',
    'production_winner_registry_id',           'dd5fd75e-982d-4c3d-89cd-7ce0936076b2',
    'saved_provider_spec',                     jsonb_build_object('width', 720, 'height', 1280, 'duration_seconds', 8),
    'effective_output_spec',                   jsonb_build_object('width', 1080, 'height', 1920, 'duration_seconds', 12),
    'effective_spec_source',                   'video-worker/b1_video_stat.ts:130,146-159 (B1_VIDEO_GOVERNED_OUTPUT_SPEC / B1_VIDEO_TEMPLATE_OUTPUT_PARITY) — documented snapshot per TPR-1 Addendum v1, not read live from the deployed worker; refresh this literal if the worker''s overlay ever changes',
    'eligible_pool_count',                     v_broll_pool,
    'pool_floor_minimum',                      4,
    'pool_floor_target',                       6,
    'below_floor',                             (v_broll_pool < 4),
    'single_clip_warning',                     (v_broll_pool = 1)
  );

  RETURN jsonb_build_object(
    'by_format',     v_by_format,
    'broll_status',  v_broll_status
  );
END;
$function$;

COMMENT ON FUNCTION public.get_creative_template_portfolio_summary(text) IS
  'READ-ONLY: per-(format_key,platform) rollup for a client — production winner, eligible-alternate '
  'count, last 10 successful-render recent_uses, repeats_single_template, variety_source '
  '(background_rotation_only / template_variety / none) — plus a fixed-literal broll_status snapshot '
  '(video-worker render-time output-parity overlay values, refreshed by hand if the worker constant '
  'changes; eligible_pool_count IS queried live, an estimate of resolve_slot_assets() v1.4 eligibility '
  'per docs/briefs/results/broll-rotation-readiness-handoff-v1.md §4.4). Unknown or blank '
  'p_client_slug RAISES. Service-role only. Consumed by the invegent-dashboard Creative Templates tab '
  '(not yet built) via its service-role server client — never the browser anon/authenticated client. '
  'Added by 20260729160000_creative_template_portfolio_read_rpc_v1.sql.';

-- ---------------------------------------------------------------------
-- (3) Grants — both functions: service_role-only, owner postgres.
-- Named REVOKE for PUBLIC/anon/authenticated (revoking PUBLIC alone is
-- insufficient — new public functions are born anon/authenticated-executable
-- via pg_default_acl), a defensive re-revoke of service_role before granting
-- (matches 20260729150000's own pattern), then GRANT EXECUTE to service_role
-- only, and explicit OWNER TO postgres.
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_creative_template_portfolio(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_creative_template_portfolio(text) FROM service_role;  -- defensive re-revoke before granting
GRANT EXECUTE ON FUNCTION public.get_creative_template_portfolio(text) TO service_role;
ALTER FUNCTION public.get_creative_template_portfolio(text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_creative_template_portfolio_summary(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_creative_template_portfolio_summary(text) FROM service_role;  -- defensive re-revoke before granting
GRANT EXECUTE ON FUNCTION public.get_creative_template_portfolio_summary(text) TO service_role;
ALTER FUNCTION public.get_creative_template_portfolio_summary(text) OWNER TO postgres;

COMMIT;

-- =====================================================================
-- ROLLBACK (reference only — NOT executed by this migration; see the paired
-- file ROLLBACK_20260729160000_creative_template_portfolio_read_rpc_v1.sql):
--   DROP FUNCTION IF EXISTS public.get_creative_template_portfolio_summary(text);
--   DROP FUNCTION IF EXISTS public.get_creative_template_portfolio(text);
-- Nothing else was created by this migration — no table, no column, no index.
-- =====================================================================
