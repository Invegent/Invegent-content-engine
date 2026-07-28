-- ROLLBACK for Migration A — re-apply the VERBATIM v1.2 resolve_slot_assets body (pre-broll).
-- Source lineage: supabase/migrations/20260720150000_resolve_slot_assets_v1_2_shared_pool_fallback.sql

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
               FILTER (WHERE f.field_kind = 'image'), '{}')
  INTO v_has_background, v_has_logo, v_image_slots
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
      cba.asset_meta->>'scrim_opacity_override'                  AS scrim_override
    FROM c.client_brand_asset cba
    WHERE cba.client_id = v_client_id
      AND cba.asset_meta->>'usage' IN ('background', 'logo')
    ORDER BY cba.created_at ASC, cba.asset_id ASC
  LOOP
    v_slot   := CASE r.asset_usage WHEN 'background' THEN 'Background' ELSE 'Logo' END;
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
      IF r.asset_usage = 'background' THEN
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
    ELSIF r.asset_usage = 'background' THEN
      v_entry := jsonb_build_object(
        'asset_id', r.asset_id, 'asset_key', r.asset_key,
        'asset_url', r.asset_url, 'sfto', r.sfto,
        'scrim_override', r.scrim_override,
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
  v_bg_count  := jsonb_array_length(v_ranked_bg);

  IF v_has_background THEN
    IF v_bg_count = 0 THEN
      RETURN jsonb_build_object(
        'status', 'fail_closed', 'modifications', '{}'::jsonb, 'selected', v_selected,
        'rejected', v_rejected, 'warnings', v_warnings,
        'fail_reason', 'no_governed_background', 'context', v_context);
    END IF;

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
    'context', v_context);
END;
$function$;
