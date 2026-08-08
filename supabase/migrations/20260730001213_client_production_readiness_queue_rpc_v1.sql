-- =====================================================================
-- Client Production Readiness Queue — one new, read-only, additive
-- SECURITY DEFINER RPC: public.get_client_production_readiness_queue(p_client_slug text)
--
-- Brief: docs/briefs/cc-0088-client-production-readiness-queue-brief-v1.md
--   (GATE 1 APPROVED 2026-07-30 — T2 · host shape = extend/compose via the
--   existing proven RPC family · overall_state = coarse triage column
--   alongside full per-field detail, never replacing it).
--
-- WHAT THIS DOES
--   Given a client slug, returns ONE jsonb array — one element per relevant
--   (platform, format) cell for that client, at the four named platforms
--   (facebook, instagram, linkedin, youtube; matches the standing S9
--   four-named-platforms fence). It is a pure READ-ONLY COMPOSITION of five
--   already-live, already-governed sources — it invents no new decision
--   logic, only assembles their outputs into one dashboard-facing row shape:
--     * public.classify_format_capability  — capability status/reason/routed_lane
--         (called EXACTLY as-is, unmodified, one call per cell)
--     * public.get_creative_template_portfolio_summary — production winner +
--         eligible-alternate count per (format,platform) (called ONCE per
--         client, decomposed per cell — not re-derived)
--     * t."5.3_content_format".platform_support × c.client_format_config —
--         runtime_reachable, an INDEPENDENTLY-COMPUTED boolean composing
--         global per-platform-per-format platform_support with per-client
--         format enablement. PROVENANCE CORRECTION (db-rls-auditor live
--         BEGIN...ROLLBACK pass, 2026-07-30): this is NOT a reuse of a
--         predicate proven live-enforced elsewhere. Only the
--         client_format_config half is byte-identical to
--         m.build_weekly_demand_grid's enabled_set CTE; the
--         platform_support check does not appear in either
--         m.build_weekly_demand_grid or m.materialise_slots at all — it
--         only exists in the shadow/unenforced m.resolve_final_format and
--         in dashboard-facing summary/read functions, never in a live
--         enforcement path. The actual proven per-slot production
--         capability gate is classify_format_capability (delegated to by
--         m.fill_pending_slots' S9 Layer 1 block), which this function
--         already captures separately as capability_status.
--         runtime_reachable is correctly computed and a genuinely useful,
--         ORTHOGONAL signal, but runtime_reachable=true does NOT by itself
--         guarantee a slot would fill in production — only
--         capability_status is proven to gate that.
--     * c.client_publish_profile / c.client_publish_schedule — publisher
--         readiness + pause state + recurring-schedule projection
--     * m.slot — actually-materialised next occurrence (when one exists)
--     * c.client_brand_asset — declared vs resolver-reachable asset-pool
--         counts, reusing the EXACT filter shape already shipped in
--         get_creative_template_portfolio_summary's broll_pool CTE
--         (generalised by usage key: broll_background / background / logo —
--         see JUDGMENT CALLS below)
--
-- CANDIDATE-CELL ENUMERATION (a client-scoped set, not a full 4-platform ×
-- all-formats cross product):
--   UNION of (platform, format) pairs drawn from:
--     (a) c.client_format_config (is_enabled=true; platform-specific rows,
--         plus NULL-platform rows expanded to all 4 named platforms),
--     (b) c.client_publish_schedule.format_override (enabled=true, override
--         IS NOT NULL — an explicit per-slot format pin),
--     (c) already-materialised m.slot rows (format_chosen, else
--         format_preference[1]).
--   Any of the 4 named platforms with ZERO cell from (a)/(b)/(c) gets exactly
--   ONE synthetic PROBE cell at a fixed, real, non-NULL format ('image_quote')
--   — mirrors the client-platform-readiness-summary precedent's own probe
--   convention (docs/briefs/client-platform-readiness-summary-gate1-v1.md §3)
--   so an unconfigured platform still SURFACES (proof case 5: care-for-
--   welfare-pty-ltd × youtube must appear with publisher_path_missing, not be
--   silently absent from the result set). Probe cells carry
--   scheduled_demand=false and is_probe_cell=true so they are never
--   mistaken for real requested demand.
--
-- CLASSIFICATION LOGIC NOT REPRODUCED HERE — every capability verdict is
-- the classifier's own untouched return value (classify_format_capability,
-- called exactly as-is). runtime_reachable is a SEPARATE,
-- independently-computed signal (platform_support × client_format_config —
-- see the provenance correction above); it is not a copy of, and is not a
-- substitute for, the classifier's proven production capability gate.
--
-- responsible_lane MECHANICAL MAPPING (off classify_format_capability's own
-- status + this function's own paused/schedule/config signals — never a
-- default-to-asset_gap fallback; asset_gap ONLY fires on status=asset_shortage):
--   publisher_path_missing        -> publisher_onboarding
--   (platform currently paused)   -> capability_enforcement   [PRECEDENCE: after
--                                     publisher_path_missing, before every other
--                                     capability_status branch — a paused platform
--                                     is a deliberate containment hold regardless
--                                     of what the classifier would otherwise say]
--   template_missing              -> creatomate_global
--   pipeline_missing              -> worker_lane
--   governance_unproven           -> graduation_governance
--   unsupported_silent_degrade    -> capability_template_remediation
--   asset_shortage                -> asset_gap
--   ready, but cell is a probe / has no real schedule|config demand
--                                  -> dashboard_onboarding
--   unknown                       -> NULL (never fabricate a lane; reason
--                                     surfaced in missing_proof_or_gate instead)
--   ready, real demand, reachable -> NULL (nothing to route — production ready)
--
-- overall_state (coarse triage, ALWAYS rendered alongside every granular
-- field above, never replacing them — PK's explicit Gate-1 ruling) is a
-- single legible CASE off the columns already computed, in this order:
--   1. publisher_path_missing OR probe/no-demand cell        -> not_configured
--   2. platform currently paused (containment hold)          -> blocked
--   3. template_missing / pipeline_missing /
--      unsupported_silent_degrade / asset_shortage / unknown -> blocked
--   4. governance_unproven                                   -> waiting_for_proof
--   5. capability ready AND runtime_reachable = false         -> blocked
--        (the proven "ready ≠ reachable" contradiction —
--        docs/briefs/results/s9-facebook-containment-release-result-v1.md §7)
--   6. capability ready AND runtime_reachable = true           -> ready
--   7. fallback (should be unreachable)                        -> blocked
--        (fail-closed default — never silently reports ready)
--
-- JUDGMENT CALLS MADE BY THIS MIGRATION (not fully specified by the brief —
-- flagged here AND in the handback summary, not silently decided):
--   J1. Asset-pool fields (required_asset_slots / declared_asset_pool_count /
--       resolver_reachable_asset_count / minimum_required_pool) are computed
--       against the SINGLE most-constraining governed asset role the resolved
--       template needs — a video/image Background slot is reported ahead of a
--       Logo slot when a template needs both (Background is the role with the
--       proven historical shortage incident — G4 guard,
--       docs/briefs/results/broll-promotion-batch1-result.md §11 — Logo
--       shortages are not evidenced the same way). If BOTH are required this
--       is noted in missing_proof_or_gate, not silently dropped. This is a
--       narrower scope than "every asset role", flagged for design-gate
--       confirmation.
--   J2. minimum_required_pool = 4 for the broll_background role (the one
--       PK-ratified floor — governed-broll-consumption-v1) and 1 for every
--       other role (no ratified floor exists beyond "need at least one to
--       render" — flagged, not a PK-ratified number).
--   J3. resolver_reachable_asset_count reuses the EXACT filter shape of
--       get_creative_template_portfolio_summary's broll_pool CTE (itself
--       already documented there as "NOT a live resolve_slot_assets() call —
--       an estimate"), generalised by usage key. It does not add a
--       platform_scope check that resolve_slot_assets itself DOES apply
--       (the shipped broll_pool CTE doesn't either) — same known,
--       already-accepted approximation, not a new gap introduced here.
--   J4. next_occurrence_source = 'projected_schedule' ONLY fires when a
--       c.client_publish_schedule row has format_override EXACTLY matching
--       this cell's format. Allocator-driven (non-override-pinned) cadence
--       is NOT projected here — that requires running the weekly demand-grid
--       + allocate_week_formats logic (a duplication of governed decision
--       logic this migration deliberately does not reproduce). A schedule
--       that exists but isn't format-pinned reports next_occurrence_source
--       = 'none' with scheduled_demand still reflecting the config/override/
--       slot union above — never a guessed timestamp.
--   J5. template_id resolution reads
--       COALESCE(evidence.selected.template_id, evidence.template_id) off
--       classify_format_capability's own returned evidence — present on the
--       ready path (selected.template_id) and on every fail-closed branch
--       that named a candidate template (asset_shortage / pipeline_missing /
--       governance_unproven / the structural template_missing branch).
--       format_unmapped template_missing (zero candidates at all) and
--       publisher_path_missing / unknown carry no template_id — every
--       asset-pool field is NULL (never 0) in that case, distinct from a
--       genuinely empty pool.
--   J6. "16 required fields" (brief success-criteria wording) vs the 20
--       named columns in the build-spec message — implemented ALL 20 named
--       columns; the count mismatch is a wording discrepancy in the source
--       material, not resolved by this migration (flagged for PK).
--
-- SECURITY POSTURE — mirrors public.classify_format_capability /
--   public.get_creative_template_portfolio_summary: SECURITY DEFINER, owner
--   postgres, STABLE, SET search_path = '' with every reference schema-
--   qualified, no dynamic SQL. EXECUTE revoked from PUBLIC, anon,
--   authenticated (Supabase public functions are born anon/authenticated-
--   executable via pg_default_acl — the named REVOKE is mandatory, not
--   optional) and granted to service_role ONLY. Ships DARK: no dashboard
--   consumer wired in this migration. SELF-DOCUMENTING NOTE (security-auditor
--   F1, GREEN/non-blocking): this function is the first path giving
--   service_role aggregated, read-only, jsonb-composed access to
--   c.client_format_config and t."5.3_content_format".platform_support
--   together in one result shape — low-sensitivity operational config, not
--   credentials/PII, same trust model as its sibling functions, but a new
--   composition distinct from what classify_format_capability and
--   get_creative_template_portfolio_summary individually expose.
--
-- FORBIDDEN / OUT OF SCOPE (repeated from the brief, none of it done here):
--   * classify_format_capability, select_template, resolve_slot_assets,
--     get_creative_template_portfolio(_summary) are called, never modified.
--   * No anon/authenticated grant.
--   * No DML on client_publish_profile / client_publish_schedule / any
--     asset/template table — SELECT-composition only.
--   * No deploy, apply, or push performed by this migration file's authoring.
--   * No non-asset-shortage cause is ever mapped to responsible_lane =
--     'asset_gap'.
--
-- Bare CREATE FUNCTION (not CREATE OR REPLACE) — a pre-existing object of
-- this name aborts the migration fail-closed instead of silently replacing
-- something, matching 20260729160000's own convention.
--
-- (R) ROLLBACK (reference only — see the paired
--   ROLLBACK_20260730120000_client_production_readiness_queue_rpc_v1.sql):
--   DROP FUNCTION IF EXISTS public.get_client_production_readiness_queue(text);
-- =====================================================================

BEGIN;

CREATE FUNCTION public.get_client_production_readiness_queue(p_client_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
STABLE
AS $function$
DECLARE
  v_client_id uuid;
  v_timezone  text;
  v_result    jsonb;
BEGIN
  -- ---- Validation (identical convention to get_creative_template_portfolio / _summary) ----
  IF p_client_slug IS NULL OR btrim(p_client_slug) = '' THEN
    RAISE EXCEPTION 'p_client_slug must not be null or blank'
      USING ERRCODE = '22004';
  END IF;

  SELECT cl.client_id, cl.timezone INTO v_client_id, v_timezone
    FROM c.client AS cl
   WHERE cl.client_slug = p_client_slug;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'unknown client_slug % (no matching c.client row)', p_client_slug
      USING ERRCODE = '23503';
  END IF;

  v_timezone := COALESCE(v_timezone, 'UTC');

  WITH
  platforms(platform) AS (
    VALUES ('facebook'), ('instagram'), ('linkedin'), ('youtube')
  ),

  -- ---- (a) formats requested via c.client_format_config ----
  cfg_cells AS (
    SELECT DISTINCT p.platform, cfg.ice_format_key AS format
    FROM c.client_format_config AS cfg
    CROSS JOIN platforms AS p
    WHERE cfg.client_id = v_client_id
      AND cfg.is_enabled = true
      AND (cfg.platform = p.platform OR cfg.platform IS NULL)
  ),

  -- ---- (b) formats explicitly pinned via c.client_publish_schedule.format_override ----
  sched_cells AS (
    SELECT DISTINCT cps.platform, cps.format_override AS format
    FROM c.client_publish_schedule AS cps
    WHERE cps.client_id = v_client_id
      AND cps.enabled = true
      AND cps.format_override IS NOT NULL
  ),

  -- ---- (c) formats seen in already-materialised, not-yet-resolved slots ----
  slot_cells AS (
    SELECT DISTINCT s.platform, COALESCE(s.format_chosen, s.format_preference[1]) AS format
    FROM m.slot AS s
    WHERE s.client_id = v_client_id
      AND COALESCE(s.format_chosen, s.format_preference[1]) IS NOT NULL
  ),

  requested_cells AS (
    SELECT platform, format, false AS is_probe_cell FROM cfg_cells
    UNION
    SELECT platform, format, false AS is_probe_cell FROM sched_cells
    UNION
    SELECT platform, format, false AS is_probe_cell FROM slot_cells
  ),

  -- ---- platforms with zero requested cell -> one honest probe cell so the
  -- ---- platform still surfaces (never silently dropped from the result set) ----
  probe_cells AS (
    SELECT p.platform, 'image_quote'::text AS format, true AS is_probe_cell
    FROM platforms AS p
    WHERE NOT EXISTS (SELECT 1 FROM requested_cells AS rc WHERE rc.platform = p.platform)
  ),

  all_cells AS (
    SELECT platform, format, is_probe_cell FROM requested_cells
    UNION
    SELECT platform, format, is_probe_cell FROM probe_cells
  ),

  -- ---- publisher profile rows (pause state, publish_enabled) ----
  profile_rows AS (
    SELECT cpp.platform, cpp.status, cpp.publish_enabled,
           cpp.paused_until, cpp.paused_reason, cpp.paused_at
    FROM c.client_publish_profile AS cpp
    WHERE cpp.client_id = v_client_id
  ),

  -- ---- schedule existence per platform (any format) + enabled row count ----
  schedule_platform_rows AS (
    SELECT cps.platform, count(*) AS enabled_schedule_row_count
    FROM c.client_publish_schedule AS cps
    WHERE cps.client_id = v_client_id
      AND cps.enabled = true
    GROUP BY cps.platform
  ),

  -- ---- one call to the portfolio summary RPC per client (not per cell) ----
  portfolio_summary AS (
    SELECT public.get_creative_template_portfolio_summary(p_client_slug) AS psum
  ),
  by_format_rows AS (
    SELECT
      elem->>'format_key'                              AS format_key,
      elem->>'platform'                                 AS platform,
      elem->>'production_winner_provider_template_id'   AS production_winner_provider_template_id,
      elem->>'production_winner_name'                   AS production_winner_name,
      NULLIF(elem->>'eligible_alternate_count','')::int  AS eligible_alternate_count
    FROM portfolio_summary AS ps
    CROSS JOIN LATERAL jsonb_array_elements(ps.psum->'by_format') AS elem
  ),

  -- ---- per-cell composition: classifier call + runtime reachability + template/asset joins ----
  cells_computed AS (
    SELECT
      ac.platform,
      ac.format,
      ac.is_probe_cell,

      -- scheduled_demand: real config/override/slot demand, never true for a probe cell
      NOT ac.is_probe_cell AS scheduled_demand,

      -- ---- next occurrence: materialised slot first, else format-override-pinned projection ----
      (SELECT s.scheduled_publish_at
         FROM m.slot AS s
        WHERE s.client_id = v_client_id
          AND s.platform  = ac.platform
          AND (s.format_chosen = ac.format
               OR (s.format_chosen IS NULL AND ac.format = ANY (s.format_preference)))
          AND s.scheduled_publish_at > now()
          AND s.filled_at IS NULL
        ORDER BY s.scheduled_publish_at ASC
        LIMIT 1) AS next_slot_occurrence,

      (SELECT min(occ.ts)
         FROM c.client_publish_schedule AS cps
         CROSS JOIN LATERAL (
           SELECT (d::date + cps.publish_time)::timestamp AT TIME ZONE v_timezone AS ts
           FROM generate_series(CURRENT_DATE, CURRENT_DATE + 13, interval '1 day') AS d
           WHERE EXTRACT(dow FROM d)::integer = cps.day_of_week
         ) AS occ
        WHERE cps.client_id = v_client_id
          AND cps.platform  = ac.platform
          AND cps.enabled   = true
          AND cps.format_override = ac.format
          AND occ.ts > now()) AS next_projected_occurrence,

      -- ---- publisher profile / pause state ----
      pr.status          AS profile_status,
      pr.publish_enabled AS profile_publish_enabled,
      pr.paused_until    AS profile_paused_until,
      pr.paused_reason   AS profile_paused_reason,
      pr.paused_at       AS profile_paused_at,
      (pr.platform IS NOT NULL) AS has_profile_row,
      (spr.platform IS NOT NULL AND spr.enabled_schedule_row_count > 0) AS has_schedule_row,

      -- ---- capability classification (untouched call, one per cell) ----
      public.classify_format_capability(p_client_slug, ac.platform, ac.format) AS cap,

      -- ---- runtime_reachable: independently-computed boolean composing
      -- ---- global platform_support (t."5.3_content_format") with
      -- ---- per-client c.client_format_config enablement, for this one
      -- ---- (client, platform, format) cell. NOT a reuse of a predicate
      -- ---- proven live-enforced elsewhere (see header provenance
      -- ---- correction) — only the client_format_config half matches
      -- ---- m.build_weekly_demand_grid's enabled_set CTE byte-for-byte;
      -- ---- the platform_support half does not appear in that function or
      -- ---- in m.materialise_slots at all. Correctly computed and
      -- ---- genuinely useful, but orthogonal to — and not a substitute
      -- ---- for — capability_status, the actual proven production-fill
      -- ---- gate. ----
      (
        EXISTS (
          SELECT 1 FROM t."5.3_content_format" AS cf
           WHERE cf.ice_format_key = ac.format
             AND cf.is_active = true
             AND COALESCE((cf.platform_support ->> ac.platform)::boolean, false)
        )
        AND EXISTS (
          SELECT 1 FROM c.client_format_config AS cfg
           WHERE cfg.client_id = v_client_id
             AND cfg.ice_format_key = ac.format
             AND cfg.is_enabled = true
             AND (
               cfg.platform = ac.platform
               OR (
                 cfg.platform IS NULL
                 AND NOT EXISTS (
                   SELECT 1 FROM c.client_format_config AS cfg2
                    WHERE cfg2.client_id = v_client_id
                      AND cfg2.ice_format_key = ac.format
                      AND cfg2.platform = ac.platform
                 )
               )
             )
        )
      ) AS runtime_reachable,

      -- ---- template winner / eligible count (prefer exact platform match, else NULL-platform fallback) ----
      (SELECT bf.production_winner_provider_template_id
         FROM by_format_rows AS bf
        WHERE bf.format_key = ac.format
          AND (bf.platform = ac.platform OR bf.platform IS NULL)
        ORDER BY (bf.platform IS NOT NULL) DESC
        LIMIT 1) AS template_winner_id,
      (SELECT bf.production_winner_name
         FROM by_format_rows AS bf
        WHERE bf.format_key = ac.format
          AND (bf.platform = ac.platform OR bf.platform IS NULL)
        ORDER BY (bf.platform IS NOT NULL) DESC
        LIMIT 1) AS template_winner_name,
      (SELECT bf.eligible_alternate_count
         FROM by_format_rows AS bf
        WHERE bf.format_key = ac.format
          AND (bf.platform = ac.platform OR bf.platform IS NULL)
        ORDER BY (bf.platform IS NOT NULL) DESC
        LIMIT 1) AS eligible_template_count

    FROM all_cells AS ac
    LEFT JOIN profile_rows AS pr ON pr.platform = ac.platform
    LEFT JOIN schedule_platform_rows AS spr ON spr.platform = ac.platform
  ),

  -- ---- template_id resolution + asset-slot flags off the resolved template (J5) ----
  cells_with_template AS (
    SELECT
      cc.*,
      COALESCE(
        NULLIF(cc.cap #>> '{evidence,selected,template_id}', ''),
        NULLIF(cc.cap #>> '{evidence,template_id}', '')
      )::uuid AS resolved_template_id,
      (cc.profile_paused_until IS NOT NULL AND cc.profile_paused_until > now()) AS is_currently_paused
    FROM cells_computed AS cc
  ),

  cells_with_slots AS (
    SELECT
      ct.*,
      tf.has_video_bg,
      tf.has_image_bg,
      tf.has_logo,
      CASE
        WHEN tf.has_video_bg THEN 'broll_background'
        WHEN tf.has_image_bg THEN 'background'
        ELSE NULL
      END AS required_usage_key
    FROM cells_with_template AS ct
    LEFT JOIN LATERAL (
      SELECT
        bool_or(f.field_kind = 'background' AND f.element_type = 'video')                          AS has_video_bg,
        bool_or(f.field_kind = 'background' AND f.element_type IS DISTINCT FROM 'video')            AS has_image_bg,
        bool_or(f.field_kind = 'logo')                                                               AS has_logo
      FROM c.creative_provider_template_field AS f
      WHERE f.template_id = ct.resolved_template_id
        AND f.dynamic = true
        AND f.field_kind IN ('background', 'logo', 'image')
    ) AS tf ON ct.resolved_template_id IS NOT NULL
  ),

  -- ---- declared vs resolver-reachable asset-pool counts (J1/J3), reusing the
  -- ---- exact broll_pool CTE filter shape from get_creative_template_portfolio_summary,
  -- ---- generalised by usage key ----
  cells_with_pool AS (
    SELECT
      cs.*,
      CASE WHEN cs.required_usage_key IS NULL THEN NULL ELSE
        (SELECT count(*)
           FROM c.client_brand_asset AS a
          WHERE a.client_id = v_client_id
            AND a.asset_meta ->> 'usage' = cs.required_usage_key
            AND a.is_active = true
            AND (a.asset_meta ->> 'approved') = 'true')
      END AS declared_asset_pool_count,
      CASE WHEN cs.required_usage_key IS NULL THEN NULL ELSE
        (SELECT count(*)
           FROM c.client_brand_asset AS a
          WHERE a.client_id = v_client_id
            AND a.asset_meta ->> 'usage' = cs.required_usage_key
            AND a.is_active = true
            AND (a.asset_meta ->> 'approved') = 'true'
            AND a.asset_meta ->> 'bucket' = 'brand-assets'
            AND (a.asset_meta ->> 'license_type' IS NOT NULL OR a.asset_meta ->> 'license' IS NOT NULL)
            AND (
                  a.asset_meta ->> 'license_expires_at' IS NULL
               OR (a.asset_meta ->> 'license_expires_at')::timestamptz > now()
                )
            AND (
                  cs.required_usage_key = 'logo'
               OR a.asset_meta ->> 'safe_for_text_overlay' IN ('true', 'needs_scrim')
                ))
      END AS resolver_reachable_asset_count,
      CASE
        WHEN cs.required_usage_key = 'broll_background' THEN 4
        WHEN cs.required_usage_key IS NOT NULL THEN 1
        ELSE NULL
      END AS minimum_required_pool
    FROM cells_with_slots AS cs
  ),

  -- ---- final field derivation: capability_status/reason, responsible_lane, overall_state ----
  final_rows AS (
    SELECT
      cp.*,
      cp.cap->>'status'      AS capability_status,
      cp.cap->>'reason_code' AS capability_reason,

      COALESCE(cp.next_slot_occurrence, cp.next_projected_occurrence) AS next_scheduled_occurrence,
      CASE
        WHEN cp.next_slot_occurrence IS NOT NULL THEN 'materialised_slot'
        WHEN cp.next_projected_occurrence IS NOT NULL THEN 'projected_schedule'
        ELSE 'none'
      END AS next_occurrence_source,

      (cp.has_profile_row AND cp.has_schedule_row) AS publisher_readiness,
      CASE
        WHEN cp.has_profile_row AND cp.has_schedule_row THEN 'both_present'
        WHEN cp.has_profile_row AND NOT cp.has_schedule_row THEN 'schedule_missing'
        WHEN NOT cp.has_profile_row AND cp.has_schedule_row THEN 'profile_missing'
        ELSE 'both_missing'
      END AS publisher_readiness_reason

    FROM cells_with_pool AS cp
  ),

  routed_rows AS (
    SELECT
      fr.*,
      -- responsible_lane: mechanical mapping, precedence-ordered per the
      -- header comment. asset_gap ONLY ever fires from asset_shortage.
      CASE
        WHEN fr.capability_status = 'publisher_path_missing' THEN 'publisher_onboarding'
        WHEN fr.is_currently_paused THEN 'capability_enforcement'
        WHEN fr.capability_status = 'template_missing' THEN 'creatomate_global'
        WHEN fr.capability_status = 'pipeline_missing' THEN 'worker_lane'
        WHEN fr.capability_status = 'governance_unproven' THEN 'graduation_governance'
        WHEN fr.capability_status = 'unsupported_silent_degrade' THEN 'capability_template_remediation'
        WHEN fr.capability_status = 'asset_shortage' THEN 'asset_gap'
        WHEN fr.capability_status = 'ready' AND NOT fr.scheduled_demand THEN 'dashboard_onboarding'
        WHEN fr.capability_status = 'ready' AND fr.scheduled_demand AND NOT fr.runtime_reachable THEN 'capability_template_remediation'
        WHEN fr.capability_status = 'unknown' THEN NULL
        ELSE NULL
      END AS responsible_lane,

      CASE
        WHEN fr.capability_status = 'publisher_path_missing' THEN 'Create publisher profile + schedule row (publisher onboarding)'
        WHEN fr.is_currently_paused THEN 'Awaiting PK-directed platform release (capability enforcement containment hold)'
        WHEN fr.capability_status = 'template_missing' THEN 'Register/build a selectable template for this format (Creatomate Global)'
        WHEN fr.capability_status = 'pipeline_missing' THEN 'Engineering fix — structural resolver gap (e.g. missing required logo slot)'
        WHEN fr.capability_status = 'governance_unproven' THEN 'Complete governance/proof step on the candidate template'
        WHEN fr.capability_status = 'unsupported_silent_degrade' THEN 'Apply capability enforcement (R3) — live publishing on an ungoverned path with no currently selectable template'
        WHEN fr.capability_status = 'asset_shortage' THEN 'Source/approve additional governed assets for the required slot (Asset Gap)'
        WHEN fr.capability_status = 'ready' AND NOT fr.scheduled_demand THEN 'Configure client_format_config / schedule row to activate this cell (dashboard onboarding)'
        WHEN fr.capability_status = 'ready' AND fr.scheduled_demand AND NOT fr.runtime_reachable THEN 'Reconcile platform_support/client_format_config — classifier says ready but this format is not runtime-reachable on this platform'
        WHEN fr.capability_status = 'unknown' THEN 'Investigate — classifier returned an ungrounded status (reason_code: ' || COALESCE(fr.capability_reason, 'none') || ')'
        WHEN fr.capability_status = 'ready' AND fr.scheduled_demand AND fr.runtime_reachable THEN 'None — cell is production ready'
        ELSE 'Investigate — unclassified cell state'
      END AS next_required_outcome,

      CASE
        WHEN fr.capability_status = 'ready' THEN NULL
        WHEN fr.capability_status = 'publisher_path_missing' THEN 'No c.client_publish_profile row exists for this platform'
        WHEN fr.capability_status = 'template_missing' THEN 'No selectable template registered for this format/platform (reason_code: ' || COALESCE(fr.capability_reason, 'unknown') || ')'
        WHEN fr.capability_status = 'governance_unproven' THEN 'Governance/proof gate unmet on candidate template (reason_code: ' || COALESCE(fr.capability_reason, 'unknown') || ')'
        WHEN fr.capability_status = 'pipeline_missing' THEN 'Structural resolver gap (reason_code: ' || COALESCE(fr.capability_reason, 'unknown') || ')'
        WHEN fr.capability_status = 'asset_shortage' THEN 'Insufficient declared/resolver-reachable assets for the required slot (reason_code: ' || COALESCE(fr.capability_reason, 'unknown') || ')'
        WHEN fr.capability_status = 'unsupported_silent_degrade' THEN 'Live publishing on an ungoverned/legacy path — no currently selectable template, enforcement not yet applied (blocker: ' || COALESCE(fr.capability_reason, 'unknown') || ')'
        WHEN fr.capability_status = 'unknown' THEN 'Classifier could not ground a status — reason_code: ' || COALESCE(fr.capability_reason, 'ungrounded')
        ELSE NULL
      END AS missing_proof_or_gate,

      -- overall_state: coarse triage, precedence-ordered per the header comment.
      CASE
        WHEN fr.capability_status = 'publisher_path_missing' THEN 'not_configured'
        WHEN fr.is_probe_cell THEN 'not_configured'
        WHEN fr.is_currently_paused THEN 'blocked'
        WHEN fr.capability_status IN ('template_missing','pipeline_missing','unsupported_silent_degrade','asset_shortage','unknown') THEN 'blocked'
        WHEN fr.capability_status = 'governance_unproven' THEN 'waiting_for_proof'
        WHEN fr.capability_status = 'ready' AND NOT fr.runtime_reachable THEN 'blocked'
        WHEN fr.capability_status = 'ready' AND fr.runtime_reachable THEN 'ready'
        ELSE 'blocked'
      END AS overall_state

    FROM final_rows AS fr
  )

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'platform',                     r.platform,
        'format',                       r.format,
        'is_probe_cell',                r.is_probe_cell,
        'scheduled_demand',             r.scheduled_demand,
        'next_scheduled_occurrence',    r.next_scheduled_occurrence,
        'next_occurrence_source',       r.next_occurrence_source,
        'platform_pause_state', jsonb_build_object(
          'has_profile_row', r.has_profile_row,
          'state',           CASE
                                WHEN NOT r.has_profile_row THEN 'no_profile_row'
                                WHEN r.is_currently_paused THEN 'paused'
                                ELSE 'active'
                              END,
          'publish_enabled', r.profile_publish_enabled,
          'paused_until',    r.profile_paused_until,
          'paused_reason',   r.profile_paused_reason,
          'paused_at',       r.profile_paused_at
        ),
        'publisher_readiness',          r.publisher_readiness,
        'publisher_readiness_reason',   r.publisher_readiness_reason,
        'capability_status',            r.capability_status,
        'capability_reason',            r.capability_reason,
        'capability_routed_lane_raw',   r.cap->>'routed_lane',
        'runtime_reachable',            r.runtime_reachable,
        'template_winner', jsonb_build_object(
          'provider_template_id', r.template_winner_id,
          'name',                 r.template_winner_name
        ),
        'eligible_template_count',      r.eligible_template_count,
        'required_asset_slots',         CASE WHEN r.required_usage_key IS NULL THEN NULL
                                              ELSE jsonb_build_array(r.required_usage_key)
                                                     || CASE WHEN r.has_logo AND r.required_usage_key <> 'logo'
                                                             THEN jsonb_build_array('logo (secondary, not counted below — see missing_proof_or_gate)')
                                                             ELSE '[]'::jsonb END
                                         END,
        'declared_asset_pool_count',    r.declared_asset_pool_count,
        'resolver_reachable_asset_count', r.resolver_reachable_asset_count,
        'minimum_required_pool',        r.minimum_required_pool,
        'missing_proof_or_gate',        r.missing_proof_or_gate,
        'responsible_lane',             r.responsible_lane,
        'next_required_outcome',        r.next_required_outcome,
        'overall_state',                r.overall_state
      )
      ORDER BY r.platform, r.format
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM routed_rows AS r;

  RETURN v_result;
END;
$function$;

COMMENT ON FUNCTION public.get_client_production_readiness_queue(text) IS
  'READ-ONLY: Client Production Readiness Queue. One jsonb array element per relevant '
  '(platform, format) cell for a client (4 named platforms: facebook/instagram/linkedin/youtube). '
  'Pure composition of classify_format_capability, get_creative_template_portfolio_summary, '
  'platform_support x client_format_config (runtime_reachable — an independently-computed, '
  'orthogonal signal, NOT a reuse of a predicate proven live-enforced elsewhere; '
  'capability_status remains the actual proven production-fill gate), '
  'client_publish_profile/schedule, m.slot, and client_brand_asset declared-vs-resolver-reachable '
  'counts. No decision logic is reimplemented — every capability verdict is the classifier''s own '
  'untouched return value. overall_state is a coarse triage column that always renders ALONGSIDE, '
  'never in place of, the full per-field detail. Unknown/blank p_client_slug RAISES. Service-role '
  'only. Ships dark (no dashboard consumer wired in this migration). '
  'Brief: cc-0088-client-production-readiness-queue-brief-v1.md. Added by '
  '20260730120000_client_production_readiness_queue_rpc_v1.sql.';

-- ---------------------------------------------------------------------
-- Grants — service_role-only, owner postgres. Named REVOKE for
-- PUBLIC/anon/authenticated (revoking PUBLIC alone is insufficient — new
-- public functions are born anon/authenticated-executable via
-- pg_default_acl), a defensive re-revoke of service_role before granting,
-- then GRANT EXECUTE to service_role only, and explicit OWNER TO postgres.
-- Matches the exact pattern in 20260729160000_creative_template_portfolio_read_rpc_v1.sql.
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_client_production_readiness_queue(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_client_production_readiness_queue(text) FROM service_role;  -- defensive re-revoke before granting
GRANT EXECUTE ON FUNCTION public.get_client_production_readiness_queue(text) TO service_role;
ALTER FUNCTION public.get_client_production_readiness_queue(text) OWNER TO postgres;

COMMIT;

-- =====================================================================
-- ROLLBACK (reference only — NOT executed by this migration; see the paired
-- file ROLLBACK_20260730120000_client_production_readiness_queue_rpc_v1.sql):
--   DROP FUNCTION IF EXISTS public.get_client_production_readiness_queue(text);
-- Nothing else was created by this migration — no table, no column, no index.
-- =====================================================================
