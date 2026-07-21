-- cc-0046 ROLLBACK for Artifact 2 — byte-exact prior function bodies (restore on rollback).
-- resolve_slot_assets from 20260720150000; analyze_asset_gap from 20260720160000; run_asset_gap_analysis from 20260720190000.

CREATE OR REPLACE FUNCTION public.resolve_slot_assets(p_client_slug text, p_platform text, p_format text, p_template_id uuid, p_seed text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  -- Scrim opacity constants — PK-CALIBRATED 2026-07-03 (proof-wall A/B, registers v4.78):
  -- 48 preferred default; 64 acceptable ONLY for busy backgrounds/dense text (mechanized as
  -- the per-asset governed override below, NOT as a constant); 80 explicitly excluded.
  -- No longer to_be_calibrated (v1 provisional values superseded).
  c_scrim_opacity_needs_scrim CONSTANT numeric := 48;  -- selected background safe_for_text_overlay = 'needs_scrim'
  c_scrim_opacity_text_safe   CONSTANT numeric := 40;  -- selected background safe_for_text_overlay = 'true' (unchanged)

  v_context   jsonb;
  v_client_id uuid;

  v_has_background boolean := false;
  v_has_logo       boolean := false;
  v_has_scrim      boolean := false;
  v_image_slots    text[]  := '{}';   -- dynamic field_kind='image' slots (e.g. FaceObject) — optional, never fail

  v_selected  jsonb := '[]'::jsonb;
  v_rejected  jsonb := '[]'::jsonb;
  v_warnings  jsonb := '[]'::jsonb;
  v_mods      jsonb := '{}'::jsonb;
  v_platform_scope_warned boolean := false;

  -- Eligible backgrounds, split by text-safe class. The candidate loop scans in
  -- (created_at ASC, asset_id ASC) order, so each class list is ALREADY in tiebreak order;
  -- ranked list = 'true' class first, then 'needs_scrim' class (v0 §5 rank step).
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

  -- v1.1: governed per-asset scrim override plumbing
  v_bg_reasons         jsonb;
  v_scrim_override_txt text;
  v_scrim_opacity      numeric;

  -- v1.2: pool-policy-governed shared-pool fallback plumbing (DARK until a policy row + shared pool exist)
  v_pool_policy text := 'client_only';
  v_policy      record;
  v_permitted   text[] := '{}';   -- permitted shared governance_scopes derived from the policy
  v_vertical    text;             -- template vertical (only derived when 'vertical_shared' is permitted)
  v_family_id   uuid;             -- template family (for vertical-tag fallback), captured at §1
BEGIN
  v_context := jsonb_build_object(
    'client_slug', p_client_slug,
    'platform',    p_platform,
    -- p_format accepted but UNUSED in v1: format→template mapping belongs to Template Selection v0.
    'format',      p_format,
    'template_id', p_template_id,
    'seed',        p_seed,
    'format_used', false
  );

  -- ── 1. Template lookup ────────────────────────────────────────────────────────────────
  -- v1.2: capture family_id (used only by the shared-pool vertical fallback); FOUND semantics
  -- and the template_not_found fail-closed are unchanged from the PERFORM form.
  SELECT t.family_id INTO v_family_id
  FROM c.creative_provider_template t
  WHERE t.id = p_template_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'fail_closed', 'modifications', '{}'::jsonb, 'selected', '[]'::jsonb,
      'rejected', '[]'::jsonb, 'warnings', '[]'::jsonb,
      'fail_reason', 'template_not_found', 'context', v_context);
  END IF;

  -- ── 2. Dynamic slot inventory (Background / Logo / image slots) + Scrim element ───────
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
  -- (required_for_render is deliberately NOT consulted for Logo: brand-required per PK decision 3.)

  -- v1.1 EXPLICIT NON-CHANGE: no dynamic filter here — the generic templates' Scrim rows
  -- are registered dynamic=false yet DO accept opacity modifications (Lane-0 carry).
  SELECT EXISTS (
    SELECT 1 FROM c.creative_provider_template_field f
    WHERE f.template_id = p_template_id AND f.element_name = 'Scrim'
  ) INTO v_has_scrim;

  -- ── 3. Client lookup (c.client PK column is client_id) ────────────────────────────────
  SELECT cl.client_id INTO v_client_id
  FROM c.client cl
  WHERE cl.client_slug = p_client_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'fail_closed', 'modifications', '{}'::jsonb, 'selected', '[]'::jsonb,
      'rejected', '[]'::jsonb, 'warnings', '[]'::jsonb,
      'fail_reason', 'client_not_found', 'context', v_context);
  END IF;

  -- ── 3b. v1.2 pool policy (no row ⇒ client_only). Mirrors analyze_asset_gap's scope mapping
  -- EXACTLY so the resolver and the analyzer agree on which shared scopes are permitted.
  SELECT * INTO v_policy FROM c.client_asset_pool_policy WHERE client_id = v_client_id;
  IF FOUND THEN
    v_pool_policy := v_policy.pool_policy;
    IF v_pool_policy IN ('client_preferred', 'best_fit') THEN
      -- NB: explicit ::text so `text[] || unknown-literal` resolves as element-append, not
      -- array-concat (bare-literal form raises 22P02 malformed array literal — caught by the
      -- v1.2 fixture proof; the live analyze_asset_gap carries the same latent form → carry filed).
      IF v_policy.allow_vertical_shared THEN v_permitted := v_permitted || 'vertical_shared'::text; END IF;
      IF v_policy.allow_global_shared   THEN v_permitted := v_permitted || 'global_generic'::text;  END IF;
    END IF;
  END IF;

  -- NULL p_platform: the platform fence cannot be evaluated. Assets still PASS the platform
  -- filter (permissive), but NEVER silently — visible warning once per call (db-rls-auditor
  -- find 2026-07-03; PK decision 4 spirit: permissive is fine, silent is not).
  IF p_platform IS NULL THEN
    v_warnings := v_warnings || to_jsonb('platform_input_missing'::text);
  END IF;

  -- ── 4. Candidate filter chain (v0 §5 order; FIRST failing filter = the reason_code) ───
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
      -- v1.1: governed per-asset scrim override (PK-set at intake/promotion; backgrounds only)
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
      -- output-as-input guard: only the brand-assets bucket is an acceptable SOURCE;
      -- never feed a rendered/published output back in as a source (v0 §6).
      v_reason := 'output_as_input_risk';
    ELSIF r.platform_scope IS NOT NULL AND p_platform IS NOT NULL
      AND p_platform <> ALL (r.platform_scope) THEN
      -- exclusion requires a KNOWN caller platform; a NULL p_platform passes permissively
      -- but visibly ('platform_input_missing' warning emitted once, after client lookup).
      v_reason := 'platform_excluded';
    ELSE
      -- platform_scope NULL = permissive-until-backfilled (PK decision 4): pass + visible warning ONCE.
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
          -- unrecognised safety tag = unknown safety (fail-closed-safe interpretation).
          v_reason := 'text_safety_unknown';
        END IF;
      END IF;
    END IF;

    IF v_reason IS NOT NULL THEN
      v_rejected := v_rejected || jsonb_build_object(
        'slot', v_slot, 'asset_key', r.asset_key, 'reason_code', v_reason);
    ELSIF r.asset_usage = 'background' THEN
      -- v1.1: carry scrim_override through the eligible-background entry (JSON null when absent)
      -- v1.2: carry _ord (created_at) + _origin='client' for the best_fit cross-origin rank.
      --       These are internal ranking keys ONLY — selection/output read named keys, so
      --       client_only output is unchanged by their presence.
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
      -- (logos deliberately do NOT carry scrim_override — only backgrounds consult it)
      v_elig_logo := v_elig_logo || jsonb_build_object(
        'asset_id', r.asset_id, 'asset_key', r.asset_key, 'asset_url', r.asset_url);
    END IF;
  END LOOP;

  -- ── 4b. v1.2 shared-pool background fallback (DARK for client_only; skipped entirely there).
  -- Runs only for client_preferred/best_fit with at least one permitted shared scope. Applies the
  -- canonical shared fence chain (mirror of resolve_shared_pool_assets) THEN the resolver's own
  -- background text-safety classification, appending survivors into the SAME v_bg_true/v_bg_needs
  -- class lists (so scrim + text-safety guarantees are identical to client backgrounds).
  IF v_has_background
     AND v_pool_policy <> 'client_only'
     AND array_length(v_permitted, 1) IS NOT NULL
     AND (
       v_pool_policy = 'best_fit'
       OR (v_pool_policy = 'client_preferred'
           AND jsonb_array_length(v_bg_true)  = 0
           AND jsonb_array_length(v_bg_needs) = 0)
     ) THEN

    -- Derive the template vertical ONLY when a vertical_shared scope is in play (template tag →
    -- family tag fallback, first alphabetical) — mirrors derive_asset_appetite's vertical rule.
    IF 'vertical_shared' = ANY (v_permitted) THEN
      SELECT COALESCE(
        (SELECT (array_agg(DISTINCT tt.value ORDER BY tt.value))[1]
           FROM c.creative_provider_template_tag tt
           WHERE tt.template_id = p_template_id AND tt.namespace = 'vertical'),
        (SELECT (array_agg(DISTINCT ft.value ORDER BY ft.value))[1]
           FROM c.creative_template_family_tag ft
           WHERE ft.family_id = v_family_id AND ft.namespace = 'vertical')
      ) INTO v_vertical;
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
      -- canonical shared fence chain (mirror of resolve_shared_pool_assets)
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
      -- then the resolver's own background text-safety classification (identical to §4)
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

  -- ── 5.–6. Background rank + selection ─────────────────────────────────────────────────
  -- client_only / client_preferred: 'true' class first then 'needs_scrim', each already in
  --   (created_at, asset_id) insertion order (client-only path is byte-identical to v1.1).
  -- best_fit: ONE normalized set ranked by text-safety class, then (created_at, asset_id),
  --   with ORIGIN as the FINAL tie-breaker only (client < shared).
  IF v_pool_policy = 'best_fit' THEN
    SELECT COALESCE(
      jsonb_agg(e ORDER BY
        ((e->>'sfto') IS DISTINCT FROM 'true'),   -- false(0)='true' class first, true(1)='needs_scrim'
        (e->>'_ord')::timestamptz ASC,
        (e->>'asset_id')::uuid ASC,
        (e->>'_origin') ASC                        -- 'client' < 'shared' — final tie-break only
      ), '[]'::jsonb)
    INTO v_ranked_bg
    FROM jsonb_array_elements(v_bg_true || v_bg_needs) AS e;
  ELSE
    v_ranked_bg := v_bg_true || v_bg_needs;   -- 'true' class outranks 'needs_scrim'; each in (created_at, asset_id) order
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
      -- FNV-1a 32-bit over the UTF-8 bytes of p_seed (B1-v2 precedent): deterministic rotation.
      v_hash  := 2166136261;
      v_bytes := convert_to(p_seed, 'UTF8');
      FOR i IN 0 .. octet_length(v_bytes) - 1 LOOP
        v_hash := v_hash # get_byte(v_bytes, i)::bigint;          -- xor
        v_hash := (v_hash * 16777619) % 4294967296;               -- * FNV prime, mod 2^32
      END LOOP;
      v_idx := (v_hash % v_bg_count)::int;
    ELSE
      v_idx := 0;   -- no seed → top-ranked
    END IF;

    v_pick := v_ranked_bg -> v_idx;
    v_mods := v_mods || jsonb_build_object('Background.source', v_pick->>'asset_url');

    -- reasons for the selected background (v1 shape; v1.1 may append 'scrim_override_applied')
    v_bg_reasons := jsonb_build_array(
      'governed', 'license_ok',
      CASE WHEN v_pick->>'sfto' = 'true' THEN 'text_safe_true' ELSE 'text_safe_needs_scrim' END,
      'client_match');

    -- Scrim.opacity ONLY when the template actually has a Scrim element.
    IF v_has_scrim THEN
      -- class constant default (48 needs_scrim / 40 'true')
      v_scrim_opacity := CASE WHEN v_pick->>'sfto' = 'needs_scrim'
                              THEN c_scrim_opacity_needs_scrim
                              ELSE c_scrim_opacity_text_safe END;
      -- v1.1: governed per-asset override on the SELECTED background (fail-safe, never raises)
      v_scrim_override_txt := v_pick->>'scrim_override';
      IF v_scrim_override_txt IS NOT NULL THEN
        IF v_scrim_override_txt ~ '^\s*[+-]?([0-9]+(\.[0-9]+)?|\.[0-9]+)\s*$' THEN
          v_scrim_opacity := LEAST(GREATEST((v_scrim_override_txt)::numeric, 0), 100);
          -- provenance, not a warning: record on the selected Background entry's reasons[]
          v_bg_reasons := v_bg_reasons || to_jsonb('scrim_override_applied'::text);
        ELSE
          -- non-numeric override: IGNORED with a visible warning; class constant stands
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

  -- ── 7. Logo selection — brand-required regardless of required_for_render (PK decision 3)
  IF v_has_logo THEN
    IF jsonb_array_length(v_elig_logo) = 0 THEN
      RETURN jsonb_build_object(
        'status', 'fail_closed', 'modifications', '{}'::jsonb, 'selected', v_selected,
        'rejected', v_rejected, 'warnings', v_warnings,
        'fail_reason', 'missing_required_logo', 'context', v_context);
    END IF;
    v_pick := v_elig_logo -> 0;   -- deterministic: first by (created_at ASC, asset_id ASC)
    v_mods := v_mods || jsonb_build_object('Logo.source', v_pick->>'asset_url');
    v_selected := v_selected || jsonb_build_object(
      'slot', 'Logo',
      'asset_key', v_pick->>'asset_key',
      'asset_id',  v_pick->>'asset_id',
      'asset_url', v_pick->>'asset_url',
      'reasons', jsonb_build_array('governed', 'license_ok', 'client_match'));
  END IF;

  -- ── 8. Optional image slots (e.g. FaceObject, required_for_render=false): never fail ──
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

CREATE OR REPLACE FUNCTION public.analyze_asset_gap(p_client_slug text, p_platform text, p_format text, p_seed text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client_id  uuid;
  v_context    jsonb;
  v_derive     jsonb;
  v_appetite   jsonb;
  v_cand_tid   uuid;
  v_st         jsonb;
  v_asset      jsonb;
  v_shared     jsonb;
  v_policy     record;
  v_pool_policy text := 'client_only';
  v_permitted  text[] := '{}';
  v_pref_order text[] := '{}';
  v_target     text;
  v_route      text;
  v_detected   boolean := false;
  v_drain      text;
  v_slot_kind  text;
  v_why        text;
  v_vertical   text;
  v_reject     jsonb;
  v_has_gov_reject boolean := false;
  v_has_tmpl_reject boolean := false;
  v_has_asset_reject boolean := false;
  v_client_short boolean := false;
  v_shared_hit boolean := false;
  v_ambiguous  boolean := false;
  v_sig_text   text;
  v_sig        text;
begin
  v_context := jsonb_build_object('client_slug',p_client_slug,'platform',p_platform,
    'format',p_format,'seed',p_seed,'appetite_policy_version','v2');

  select cl.client_id into v_client_id from c.client cl where cl.client_slug = p_client_slug;
  if not found then
    return jsonb_build_object('status','ok','primary_route','system_error','asset_gap_detected',false,
      'asset_gap_drainability','triage_only','why_needed','client_not_found','context',v_context);
  end if;

  select * into v_policy from c.client_asset_pool_policy where client_id = v_client_id;
  if found then
    v_pool_policy := v_policy.pool_policy;
    if v_policy.pool_policy in ('client_preferred','best_fit') then
      -- CARRY-2 FIX: explicit ::text so `text[] || unknown-literal` resolves as element-append,
      -- not array-concat (bare-literal form raised 22P02 malformed array literal). Value-identical.
      if v_policy.allow_vertical_shared then v_permitted := v_permitted || 'vertical_shared'::text; end if;
      if v_policy.allow_global_shared   then v_permitted := v_permitted || 'global_generic'::text; end if;
    end if;
  end if;
  v_pref_order := (array['client_scoped'] || v_permitted);
  v_target := 'client_scoped';

  v_st := public.select_template(p_client_slug, p_platform, p_format, null, p_seed);
  if (v_st->>'status') = 'ok' then
    return jsonb_build_object('status','ok','primary_route','none','asset_gap_detected',false,
      'asset_gap_drainability','triage_only','why_needed',null,
      'select_template_status','ok','context',v_context);
  end if;

  for v_reject in select * from jsonb_array_elements(coalesce(v_st->'rejected','[]'::jsonb)) loop
    if (v_reject->>'reason_code') in ('no_assignment','assignment_not_approved','assignment_blocked','not_visually_proven')
      then v_has_gov_reject := true;
    elsif (v_reject->>'reason_code') in ('wrong_scope','status_below_smoke','platform_unsuitable')
      then v_has_tmpl_reject := true;
    elsif (v_reject->>'reason_code') like 'assets_fail_closed%'
      then v_has_asset_reject := true;
    end if;
  end loop;
  if (v_st->>'fail_reason') = 'client_not_found' then v_route := 'system_error';
  elsif (v_st->>'fail_reason') = 'format_unmapped' then v_route := 'template_gap';
  elsif v_has_gov_reject then v_route := 'governance_gap';
  elsif v_has_tmpl_reject then v_route := 'template_gap';
  elsif v_has_asset_reject or (v_st->>'fail_reason') like 'assets_fail_closed%' then v_route := 'asset_gap';
  else v_route := 'template_gap';
  end if;

  v_derive := public.derive_asset_appetite(p_client_slug, p_platform, p_format, p_seed);
  if (v_derive->>'status') = 'fail_closed' then
    return jsonb_build_object('status','ok','primary_route','template_gap','asset_gap_detected',false,
      'asset_gap_drainability','blocked_by_template','why_needed', v_derive->>'fail_reason',
      'appetite_descriptor', v_derive, 'client_pool_policy', v_pool_policy, 'slot_kind','none','context',v_context);
  end if;
  v_appetite  := v_derive->'appetite';
  v_cand_tid  := (v_derive->>'candidate_template_id')::uuid;
  v_slot_kind := coalesce(v_appetite->>'slot_kind','static_background');
  v_vertical  := v_appetite->>'vertical';
  v_ambiguous := (v_derive->>'status') = 'ambiguous';

  v_asset := public.resolve_slot_assets(p_client_slug, p_platform, p_format, v_cand_tid, p_seed);
  if (v_asset->>'status') = 'fail_closed'
     and (v_asset->>'fail_reason') in ('no_governed_background','missing_required_logo') then
    v_client_short := true;
    v_why := v_asset->>'fail_reason';
    if v_why = 'missing_required_logo' then v_slot_kind := 'logo'; end if;
  end if;

  if v_client_short and v_why = 'no_governed_background'
     and v_slot_kind = 'static_background' and array_length(v_permitted,1) is not null then
    v_shared := public.resolve_shared_pool_assets(p_client_slug, p_platform, 'static_background', v_vertical, v_permitted, p_seed);
    v_shared_hit := ((v_shared->>'status') = 'ok');
  end if;

  v_detected := v_client_short and not v_shared_hit;

  if not v_detected then
    v_drain := 'triage_only';
  elsif v_ambiguous then
    v_drain := 'blocked_by_template';
  elsif v_route = 'governance_gap' then
    v_drain := 'blocked_by_governance';
  elsif v_route = 'template_gap' then
    v_drain := 'blocked_by_template';
  elsif v_route = 'asset_gap' and v_slot_kind = 'static_background' then
    v_drain := 'drainable';
  else
    v_drain := 'triage_only';
  end if;

  v_sig_text := concat_ws('|', v_client_id::text, v_pool_policy, v_target, coalesce(v_vertical,'-'),
    coalesce(p_platform,'-'), p_format, v_slot_kind,
    coalesce(v_appetite->>'needs_governed_background','-'), coalesce(v_appetite->>'needs_logo','-'),
    coalesce(v_appetite->>'n_image_slots','-'),
    coalesce(v_appetite->>'use_case_tags','[]'), coalesce(v_appetite->>'tone_tags','[]'),
    'v1', 'v2');
  v_sig := encode(extensions.digest(v_sig_text, 'sha256'), 'hex');

  return jsonb_build_object(
    'status','ok',
    'primary_route', v_route,
    'asset_gap_detected', v_detected,
    'asset_gap_drainability', v_drain,
    'slot_kind', v_slot_kind,
    'ambiguous_appetite', v_ambiguous,
    'why_needed', case when v_ambiguous and v_detected then 'ambiguous_asset_appetite' else coalesce(v_why, v_route) end,
    'appetite_descriptor', v_appetite,
    'appetite_signature', v_sig,
    'client_id', v_client_id,
    'client_pool_policy', v_pool_policy,
    'permitted_governance_scopes', to_jsonb(v_permitted),
    'preferred_scope_order', to_jsonb(v_pref_order),
    'sourcing_target_scope', v_target,
    'vertical_key', v_vertical,
    'candidate_template_id', v_cand_tid,
    'select_template_status', v_st->>'status',
    'context', v_context);
end;
$function$;

CREATE OR REPLACE FUNCTION public.run_asset_gap_analysis(p_lookback_days integer DEFAULT 7, p_limit integer DEFAULT 500, p_dry_run boolean DEFAULT true, p_run_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c_analyzer_version constant text := 'cc0043-writer-v1';
  v_run_id text := coalesce(
    p_run_id,
    'agr_' || encode(extensions.digest(clock_timestamp()::text || p_lookback_days::text || p_limit::text, 'sha256'), 'hex'));
  r          record;
  v_g        jsonb;
  v_sig      text;
  v_client   uuid;
  v_slot     text;
  v_route    text;
  v_drain    text;
  v_terminal text;
  v_live     boolean;
  v_sid      uuid;
  v_action   text;
  -- counters
  n_scanned  int := 0;
  n_insert   int := 0;
  n_update   int := 0;
  n_sup_dis  int := 0;
  n_sup_res  int := 0;
  n_notdet   int := 0;
  n_route    int := 0;
  n_malform  int := 0;
  n_error    int := 0;
  v_samples  jsonb := '[]'::jsonb;
  -- ── reconcile close-pass state (cc-0044 autoclose; additive) ──
  rc            record;
  v_st          jsonb;
  v_slot_name   text;
  v_asset_id    uuid;
  v_is_shared   boolean;
  v_rec_act     text;
  n_rec_scan    int := 0;
  n_rec_res     int := 0;
  n_rec_open    int := 0;
  n_rec_err     int := 0;
  v_rec_samples jsonb := '[]'::jsonb;
begin
  for r in
    select pd.post_draft_id, pd.platform, pd.recommended_format, cl.client_slug
    from m.post_draft pd
    join c.client cl on cl.client_id = pd.client_id
    where pd.approval_status = 'approved'
      and pd.recommended_format is not null
      and pd.created_at > now() - make_interval(days => greatest(p_lookback_days, 0))
    order by pd.created_at asc, pd.post_draft_id asc
    limit greatest(p_limit, 0)
  loop
    n_scanned := n_scanned + 1;
    v_action := null; v_g := null; v_sig := null;

    -- per-draft subtransaction: any error on one draft must not abort the batch
    begin
      v_g := public.analyze_asset_gap(r.client_slug, r.platform, r.recommended_format, r.post_draft_id::text);

      -- ── fail-closed verdict validation (write NOTHING unless ALL hold) ──
      if v_g is null or (v_g->>'status') is distinct from 'ok' then
        n_malform := n_malform + 1; v_action := 'skip_malformed';
      elsif coalesce((v_g->>'asset_gap_detected')::boolean, false) is not true then
        n_notdet := n_notdet + 1; v_action := 'skip_not_detected';
      elsif (v_g->>'primary_route') not in ('template_gap','governance_gap','asset_gap') then
        n_route := n_route + 1; v_action := 'skip_route';
      elsif (v_g->>'slot_kind') not in ('static_background','logo','image','video_broll')
         or (v_g->>'asset_gap_drainability') not in ('drainable','blocked_by_template','blocked_by_governance','triage_only')
         or coalesce(v_g->>'appetite_signature','') = ''
         or coalesce(v_g->>'client_id','') = ''
         or (v_g->>'client_pool_policy') not in ('client_only','client_preferred','best_fit')
         or (v_g->>'sourcing_target_scope') not in ('global_generic','vertical_shared','client_scoped','purpose_bound')
         or (v_g->'appetite_descriptor') is null
         or coalesce(v_g->>'why_needed','') = ''
         or ((v_g->>'asset_gap_drainability') = 'drainable' and (v_g->>'slot_kind') <> 'static_background') then
        n_malform := n_malform + 1; v_action := 'skip_malformed';
      else
        -- ── qualifying verdict ──
        v_sig    := v_g->>'appetite_signature';
        v_client := (v_g->>'client_id')::uuid;
        v_slot   := v_g->>'slot_kind';
        v_route  := v_g->>'primary_route';
        v_drain  := v_g->>'asset_gap_drainability';

        -- serialise per signature (live only) — belt-and-suspenders over the unique arbiter
        if not p_dry_run then
          perform pg_advisory_xact_lock(hashtext('agap:' || v_sig)::bigint);
        end if;

        -- live row present?
        select exists(
          select 1 from m.asset_gap_suggestion
          where appetite_signature = v_sig
            and status in ('open','queued','harvesting','candidates_ready','failed')
        ) into v_live;

        -- terminal row present (only decisive when no live row)?
        select status into v_terminal
        from m.asset_gap_suggestion
        where appetite_signature = v_sig and status in ('resolved','dismissed')
        order by (status = 'dismissed') desc, updated_at desc
        limit 1;

        if v_live then
          v_action := 'update';
        elsif v_terminal = 'dismissed' then
          v_action := 'suppress_dismissed';
        elsif v_terminal = 'resolved' then
          v_action := 'suppress_resolved';
        else
          v_action := 'insert';
        end if;

        if not p_dry_run then
          if v_action in ('insert','update') then
            insert into m.asset_gap_suggestion (
              appetite_signature, client_id, client_pool_policy,
              permitted_governance_scopes, preferred_scope_order, sourcing_target_scope,
              vertical_key, platform, format, slot_kind, appetite_descriptor, why_needed,
              primary_route, asset_gap_detected, asset_gap_drainability, status,
              first_seen_at, last_seen_at, latest_source_post_id, source_of_demand,
              analyzer_version, inventory_policy_version
            ) values (
              v_sig, v_client, v_g->>'client_pool_policy',
              (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(coalesce(v_g->'permitted_governance_scopes','[]'::jsonb)) x),
              (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(coalesce(v_g->'preferred_scope_order','[]'::jsonb)) x),
              v_g->>'sourcing_target_scope',
              v_g->>'vertical_key', r.platform, r.recommended_format, v_slot,
              v_g->'appetite_descriptor', v_g->>'why_needed',
              v_route, true, v_drain, 'open',
              now(), now(), r.post_draft_id, v_run_id,
              c_analyzer_version, coalesce(v_g#>>'{context,appetite_policy_version}', 'v2')
            )
            on conflict (appetite_signature) where status in ('open','queued','harvesting','candidates_ready','failed')
            do update set
              last_seen_at          = now(),
              updated_at            = now(),
              latest_source_post_id = excluded.latest_source_post_id,
              primary_route         = excluded.primary_route,
              asset_gap_drainability= excluded.asset_gap_drainability,
              appetite_descriptor   = excluded.appetite_descriptor,
              why_needed            = excluded.why_needed,
              source_of_demand      = excluded.source_of_demand
            returning id into v_sid;

            -- observation (idempotent per post per suggestion)
            insert into m.asset_gap_observation (suggestion_id, source_post_id, analyzer_run, evidence_codes)
            values (v_sid, r.post_draft_id, v_run_id, array[v_g->>'why_needed', v_route, v_drain])
            on conflict (suggestion_id, source_post_id) do nothing;

            -- demand_count = distinct observed posts on this suggestion
            update m.asset_gap_suggestion s
              set demand_count = (select count(*) from m.asset_gap_observation o
                                  where o.suggestion_id = s.id and o.source_post_id is not null)
            where s.id = v_sid;

          elsif v_action = 'suppress_resolved' then
            -- NO silent reopen: record the recurrence as evidence against the resolved row.
            insert into m.asset_gap_observation (suggestion_id, source_post_id, analyzer_run, evidence_codes)
            select s.id, r.post_draft_id, v_run_id, array['recurred_after_resolved', v_route]
            from m.asset_gap_suggestion s
            where s.appetite_signature = v_sig and s.status = 'resolved'
            order by s.updated_at desc
            limit 1
            on conflict (suggestion_id, source_post_id) do nothing;
          -- suppress_dismissed: write nothing (human declined; the analyzer never nags).
          end if;
        end if;

        -- counters (both modes; dry-run counts the would-action)
        if    v_action = 'insert'             then n_insert  := n_insert  + 1;
        elsif v_action = 'update'             then n_update  := n_update  + 1;
        elsif v_action = 'suppress_dismissed' then n_sup_dis := n_sup_dis + 1;
        elsif v_action = 'suppress_resolved'  then n_sup_res := n_sup_res + 1;
        end if;
      end if;

    exception when others then
      n_error := n_error + 1;
      v_action := 'error';
    end;

    if p_dry_run then
      v_samples := v_samples || jsonb_build_object(
        'post',   r.post_draft_id,
        'client', r.client_slug,
        'format', r.recommended_format,
        'sig',    left(coalesce(v_sig, ''), 12),
        'route',  v_g->>'primary_route',
        'drain',  v_g->>'asset_gap_drainability',
        'slot',   v_g->>'slot_kind',
        'action', v_action);
    end if;
  end loop;

  -- ══ RECONCILE CLOSE-PASS (cc-0044 B2) ═══════════════════════════════════════
  -- Flip status='open' suggestions to 'resolved' when the gap no longer reproduces.
  -- Oracle: select_template='ok' AND a selected asset for the demand's slot_kind (the honest fill).
  -- Scope status='open' ONLY → never reopens dismissed/resolved and never disturbs in-flight states.
  for rc in
    select s.id, s.appetite_signature, s.slot_kind, s.primary_route,
           cl.client_slug, s.platform, s.format, s.latest_source_post_id
    from m.asset_gap_suggestion s
    join c.client cl on cl.client_id = s.client_id
    where s.status = 'open'
    order by s.first_seen_at asc, s.id asc
  loop
    n_rec_scan := n_rec_scan + 1;
    v_rec_act := null; v_st := null; v_asset_id := null;

    begin
      -- serialise per signature (live only), consistent with the detect-side lock
      if not p_dry_run then
        perform pg_advisory_xact_lock(hashtext('agap:' || rc.appetite_signature)::bigint);
      end if;

      -- re-probe producibility (seed = the demand's latest source post, else the signature — both
      -- ok/fail-invariant; the seed only rotates the background PICK, never ok vs fail_closed)
      v_st := public.select_template(rc.client_slug, rc.platform, rc.format, null,
                coalesce(rc.latest_source_post_id::text, rc.appetite_signature));

      v_slot_name := case rc.slot_kind
                       when 'static_background' then 'Background'
                       when 'logo'              then 'Logo'
                       else null end;

      if (v_st->>'status') = 'ok' and v_slot_name is not null then
        select (e->>'asset_id')::uuid
        into v_asset_id
        from jsonb_array_elements(v_st#>'{slot_resolution,selected}') e
        where e->>'slot' = v_slot_name
        limit 1;
      end if;

      if (v_st->>'status') = 'ok' and v_asset_id is not null then
        -- affirmative, asset-bearing closure → resolve (attribute the now-satisfying client asset)
        -- cc-0044 B2 shared-attribution fix: a shared-inventory-resolved asset lives in
        -- c.shared_creative_asset (its FK is resolved_shared_asset_id), NOT client_brand_asset.
        v_is_shared := exists(select 1 from c.shared_creative_asset sca where sca.id = v_asset_id);
        if not p_dry_run then
          update m.asset_gap_suggestion
            set status                   = 'resolved',
                resolved_client_asset_id = case when v_is_shared then null else v_asset_id end,
                resolved_shared_asset_id = case when v_is_shared then v_asset_id else null end,
                last_seen_at             = now(),
                updated_at               = now()
          where id = rc.id and status = 'open';   -- re-check: concurrency guard (never touch a moved row)

          if found then
            -- cc-0045: source_post_id = NULL (NULLs distinct -> never collides with the detect-side
            -- observation on the same latest post); resolving post preserved in evidence_codes for provenance.
            -- NULL-post rows are excluded from demand_count (WHERE source_post_id IS NOT NULL), so counts are unaffected.
            insert into m.asset_gap_observation (suggestion_id, source_post_id, analyzer_run, evidence_codes)
            values (rc.id, null, v_run_id,
                    array['auto_resolved_gap_absent', rc.primary_route, v_asset_id::text,
                          'resolving_post:' || coalesce(rc.latest_source_post_id::text, 'none')]);
          end if;
        end if;
        n_rec_res := n_rec_res + 1; v_rec_act := 'resolve';
      else
        -- gap still reproduces (not producible) or no attributable asset → leave open (fail-safe)
        n_rec_open := n_rec_open + 1; v_rec_act := 'leave_open';
      end if;

    exception when others then
      n_rec_err := n_rec_err + 1; v_rec_act := 'error';
    end;

    if p_dry_run then
      v_rec_samples := v_rec_samples || jsonb_build_object(
        'id',       rc.id,
        'client',   rc.client_slug,
        'platform', rc.platform,
        'format',   rc.format,
        'slot',     rc.slot_kind,
        'st',       v_st->>'status',
        'asset',    v_asset_id,
        'action',   v_rec_act);
    end if;
  end loop;

  return jsonb_build_object(
    'run_id',            v_run_id,
    'dry_run',           p_dry_run,
    'analyzer_version',  c_analyzer_version,
    'lookback_days',     p_lookback_days,
    'limit',             p_limit,
    'scanned',           n_scanned,
    'inserted',          n_insert,
    'updated',           n_update,
    'suppressed',        jsonb_build_object('dismissed', n_sup_dis, 'resolved_recurred', n_sup_res),
    'rejected',          jsonb_build_object('not_detected', n_notdet, 'route', n_route, 'malformed', n_malform, 'errors', n_error),
    'reconciled',        jsonb_build_object(
                           'open_scanned', n_rec_scan,
                           'resolved',     n_rec_res,
                           'left_open',    n_rec_open,
                           'errors',       n_rec_err,
                           'samples',      case when p_dry_run then v_rec_samples else '[]'::jsonb end),
    'samples',           case when p_dry_run then v_samples else '[]'::jsonb end);
end;
$function$;
