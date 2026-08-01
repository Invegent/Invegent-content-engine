-- Migration: tmr5_field_constraints_write_rpcs_and_intake_validator_v2
-- Version (minted by apply_migration at apply): 20260801043347
-- APPLIED 2026-08-01 to mbkmaxqhsohbtwsqolns via ONE apply_migration call, on explicit PK apply
-- authorisation against packet hash 7cc5636dad5a518fe53597cdde9aadbf644a3077e7e4cc47899182c786c81b49
-- (docs/briefs/ws5-constraints-shape-and-write-rpc-design-packet-v1.md §5, byte-faithful executable;
--  the trailing reference-only ROLLBACK comment of §5 is preserved below, non-executable).
-- Post-apply verified same day: 8 functions live; 5 public entry points prosecdef=true,
-- search_path=""; ACLs {postgres=X, service_role=X} on all 8 (anon/authenticated absent);
-- zero rows written (field 144/0, suitability 66/0 unchanged); advisors 251->251 (zero new,
-- zero naming the new functions); BEGIN..ROLLBACK smoke WS5_SMOKE_PASS (6 checks incl. the
-- live-proven modification-key prefix fail-close). Record:
-- docs/briefs/results/ws5-constraints-shape-design-lane-result-v1.md.

begin;

-- ── 0. Fail-closed precondition: nothing may pre-exist (fresh v1; a rerun fails loud) ──
do $do$
begin
  if to_regprocedure('c.tmr_validate_limit_triple(jsonb)') is not null
     or to_regprocedure('c.tmr_validate_field_constraints(text,text,jsonb)') is not null
     or to_regprocedure('c.tmr_validate_platform_constraints(jsonb)') is not null
     or to_regprocedure('public.record_tmr_template_field(uuid,text,text,text,boolean,jsonb,text,text,boolean,text,text,text)') is not null
     or to_regprocedure('public.set_tmr_field_constraints(uuid,text,jsonb,text,text,text)') is not null
     or to_regprocedure('public.record_tmr_platform_suitability(uuid,text,jsonb,text,text,text,text)') is not null
     or to_regprocedure('public.set_tmr_platform_constraints(uuid,text,text,jsonb,text,text)') is not null
     or to_regprocedure('public.validate_tmr_template_intake(uuid,jsonb)') is not null then
    raise exception 'tmr5_abort_function_already_exists';
  end if;
end
$do$;

-- ── 1. c.tmr_validate_limit_triple — the calibration-triple rule (§2) ──────────────────
create function c.tmr_validate_limit_triple(p jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare k text;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return 'limit_not_object'; end if;
  for k in select jsonb_object_keys(p) loop
    if k not in ('value','basis','source','evidence_reference') then
      return 'limit_unknown_key:' || k;
    end if;
  end loop;
  if not (p ? 'value') or not (p ? 'basis') then return 'limit_missing_value_or_basis'; end if;
  if jsonb_typeof(p->'basis') <> 'string'
     or p->>'basis' not in ('declared_from_source','probe_calibrated','to_be_calibrated') then
    return 'limit_invalid_basis';
  end if;
  if p->>'basis' = 'to_be_calibrated' then
    if jsonb_typeof(p->'value') <> 'null' then return 'limit_tbc_must_have_null_value'; end if;
  else
    if jsonb_typeof(p->'value') <> 'number' then return 'limit_value_must_be_number'; end if;
    if (p->>'value')::numeric <= 0 then return 'limit_value_must_be_positive'; end if;
  end if;
  if p->>'basis' = 'probe_calibrated'
     and (jsonb_typeof(p->'evidence_reference') is distinct from 'string'
          or btrim(coalesce(p->>'evidence_reference','')) = '') then
    return 'limit_probe_calibrated_requires_evidence';
  end if;
  if p->>'basis' = 'declared_from_source'
     and (jsonb_typeof(p->'source') is distinct from 'string'
          or btrim(coalesce(p->>'source','')) = '') then
    return 'limit_declared_requires_source_citation';
  end if;
  return null;
end $$;

-- ── 2. c.tmr_validate_field_constraints — the §2 shape, fail-closed ────────────────────
create function c.tmr_validate_field_constraints(
  p_element_name text, p_field_kind text, p jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare
  k text; mk text; err text; v_act text; v_src text; n int;
begin
  -- element name gate FIRST (it is interpolated into a regex below; alnum+underscore only)
  if p_element_name is null or p_element_name !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$' then
    return 'invalid_element_name';
  end if;
  if p is null or jsonb_typeof(p) <> 'object' then return 'constraints_not_object'; end if;
  if length(p::text) > 8192 then return 'constraints_too_large'; end if;
  if p::text ~* '(access[_-]?token|refresh[_-]?token|bearer|api[_-]?key|client[_-]?secret|password|authorization)' then
    return 'constraints_secret_like_content_rejected';
  end if;
  if p->>'schema_version' is distinct from 'tmr_field_constraints_v1' then
    return 'constraints_wrong_schema_version';
  end if;
  for k in select jsonb_object_keys(p) loop
    if k not in ('schema_version','modification_keys','slot','content_source','empty_ok',
                 'text_limits','overflow_risk','container','collapse','asset','baked','notes') then
      return 'constraints_unknown_key:' || k;
    end if;
  end loop;

  -- modification_keys: required array of unique, prefixed, suffix-vocab keys
  if jsonb_typeof(p->'modification_keys') is distinct from 'array' then
    return 'modification_keys_required_array';
  end if;
  for mk in select jsonb_array_elements_text(p->'modification_keys') loop
    if mk !~ ('^' || p_element_name || '\.(text|source|fill_color|time|duration|width|height)$') then
      return 'modification_key_invalid:' || mk;
    end if;
  end loop;
  select count(*) - count(distinct x) into n
    from jsonb_array_elements_text(p->'modification_keys') t(x);
  if n > 0 then return 'modification_keys_duplicate'; end if;

  -- slot
  if jsonb_typeof(p->'slot') is distinct from 'object' then return 'slot_required_object'; end if;
  for k in select jsonb_object_keys(p->'slot') loop
    if k not in ('slot_key','activation') then return 'slot_unknown_key:' || k; end if;
  end loop;
  if (p->'slot'->>'slot_key') is null or (p->'slot'->>'slot_key') !~ '^[a-z][a-z0-9_]{0,31}$' then
    return 'slot_key_invalid';
  end if;
  v_act := p->'slot'->>'activation';
  if v_act is null or v_act not in ('persistent','always','conditional') then
    return 'slot_activation_invalid';
  end if;
  if v_act = 'persistent' then
    if exists (select 1 from jsonb_array_elements_text(p->'modification_keys') t(x)
               where x ~ '\.(time|duration)$') then
      return 'persistent_element_must_not_carry_timing_keys';
    end if;
  else
    if not (p->'modification_keys' ? (p_element_name || '.time'))
       or not (p->'modification_keys' ? (p_element_name || '.duration')) then
      return 'scene_element_missing_timing_keys';
    end if;
  end if;

  -- content_source + empty_ok
  v_src := p->>'content_source';
  if v_src is null or v_src not in
     ('ai_authored','worker_computed','template_fixed','governed_asset','brand_profile_colour','render_binding') then
    return 'content_source_invalid';
  end if;
  if jsonb_typeof(p->'empty_ok') is distinct from 'boolean' then return 'empty_ok_required_boolean'; end if;
  if v_src = 'render_binding' and not (p->'empty_ok')::boolean then
    return 'render_binding_requires_empty_ok';
  end if;

  -- text_limits / overflow_risk (kind- and source-conditional)
  if p_field_kind = 'text' then
    if v_src in ('ai_authored','worker_computed') and jsonb_typeof(p->'text_limits') is distinct from 'object' then
      return 'text_limits_required_for_authored_text';
    end if;
  else
    if p ? 'text_limits' then return 'text_limits_only_for_text'; end if;
    if p ? 'overflow_risk' then return 'overflow_risk_only_for_text'; end if;
    if p ? 'container' then return 'container_only_for_text'; end if;
  end if;
  if p ? 'text_limits' then
    if jsonb_typeof(p->'text_limits') <> 'object' then return 'text_limits_not_object'; end if;
    for k in select jsonb_object_keys(p->'text_limits') loop
      if k not in ('max_chars','max_lines','min_font_px') then
        return 'text_limits_unknown_key:' || k;
      end if;
      err := c.tmr_validate_limit_triple(p->'text_limits'->k);
      if err is not null then return 'text_limits.' || k || ':' || err; end if;
    end loop;
    if not (p->'text_limits' ? 'max_chars') then return 'text_limits_max_chars_required'; end if;
    if p->>'overflow_risk' is null or p->>'overflow_risk' not in ('low','medium','high') then
      return 'overflow_risk_required_with_text_limits';
    end if;
  elsif p ? 'overflow_risk' then
    return 'overflow_risk_requires_text_limits';
  end if;

  -- container (optional, text only — non-text rejected above)
  if p ? 'container' then
    if jsonb_typeof(p->'container') <> 'object' then return 'container_not_object'; end if;
    for k in select jsonb_object_keys(p->'container') loop
      if k not in ('summary','shared_with') then return 'container_unknown_key:' || k; end if;
    end loop;
    if jsonb_typeof(p->'container'->'summary') is distinct from 'string'
       or btrim(coalesce(p->'container'->>'summary','')) = ''
       or length(p->'container'->>'summary') > 200 then
      return 'container_summary_invalid';
    end if;
    if p->'container' ? 'shared_with' then
      if jsonb_typeof(p->'container'->'shared_with') <> 'array' then return 'shared_with_not_array'; end if;
      for mk in select jsonb_array_elements_text(p->'container'->'shared_with') loop
        if mk !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$' then return 'shared_with_invalid_name:' || mk; end if;
      end loop;
    end if;
  end if;

  -- collapse (required; conditional ⇒ collapsible + mechanisms)
  if jsonb_typeof(p->'collapse') is distinct from 'object' then return 'collapse_required_object'; end if;
  for k in select jsonb_object_keys(p->'collapse') loop
    if k not in ('collapsible','mechanism') then return 'collapse_unknown_key:' || k; end if;
  end loop;
  if jsonb_typeof(p->'collapse'->'collapsible') is distinct from 'boolean' then
    return 'collapsible_required_boolean';
  end if;
  if v_act = 'conditional' then
    if not (p->'collapse'->'collapsible')::boolean then return 'conditional_slot_must_be_collapsible'; end if;
    if jsonb_typeof(p->'collapse'->'mechanism') is distinct from 'array'
       or jsonb_array_length(p->'collapse'->'mechanism') = 0 then
      return 'conditional_slot_requires_collapse_mechanism';
    end if;
    for mk in select jsonb_array_elements_text(p->'collapse'->'mechanism') loop
      if mk not in ('near_zero_duration','empty_text','off_canvas') then
        return 'collapse_mechanism_invalid:' || mk;
      end if;
    end loop;
    if p_field_kind = 'text' and not (p->'empty_ok')::boolean then
      return 'conditional_text_must_be_empty_ok';
    end if;
  else
    if (p->'collapse'->'collapsible')::boolean then return 'non_conditional_slot_must_not_be_collapsible'; end if;
    if p->'collapse' ? 'mechanism' then return 'collapse_mechanism_only_for_conditional'; end if;
  end if;

  -- asset (required iff governed_asset / brand_profile_colour; forbidden otherwise)
  if v_src in ('governed_asset','brand_profile_colour') then
    if jsonb_typeof(p->'asset') is distinct from 'object' then return 'asset_required_object'; end if;
    if v_src = 'governed_asset' then
      for k in select jsonb_object_keys(p->'asset') loop
        if k not in ('resolver','missing_behaviour','asset_kind') then return 'asset_unknown_key:' || k; end if;
      end loop;
      if p->'asset'->>'resolver' is distinct from 'resolve_brand_assets' then return 'asset_resolver_invalid'; end if;
      if p->'asset'->>'missing_behaviour' is distinct from 'fail_loud' then return 'asset_missing_behaviour_must_be_fail_loud'; end if;
      if (p->'asset' ? 'asset_kind') and (p->'asset'->>'asset_kind') !~ '^[a-z][a-z0-9_]{0,31}$' then
        return 'asset_kind_invalid';
      end if;
    else
      for k in select jsonb_object_keys(p->'asset') loop
        if k not in ('profile_column','fallback_hex') then return 'asset_unknown_key:' || k; end if;
      end loop;
      if p->'asset'->>'profile_column' is null
         or p->'asset'->>'profile_column' not in ('brand_colour_primary','brand_colour_secondary') then
        return 'asset_profile_column_invalid';
      end if;
      if (p->'asset' ? 'fallback_hex') and (p->'asset'->>'fallback_hex') !~ '^#[0-9A-Fa-f]{6}$' then
        return 'asset_fallback_hex_invalid';
      end if;
    end if;
  else
    if p ? 'asset' then return 'asset_only_for_asset_sources'; end if;
  end if;

  -- baked (optional; bounded scalar map)
  if p ? 'baked' then
    if jsonb_typeof(p->'baked') <> 'object' then return 'baked_not_object'; end if;
    select count(*) into n from jsonb_object_keys(p->'baked');
    if n > 10 then return 'baked_too_many_keys'; end if;
    for k in select jsonb_object_keys(p->'baked') loop
      if k !~ '^[a-z][a-z0-9_]{0,31}$' then return 'baked_key_invalid:' || k; end if;
      if jsonb_typeof(p->'baked'->k) not in ('string','number','boolean') then
        return 'baked_value_must_be_scalar:' || k;
      end if;
      if jsonb_typeof(p->'baked'->k) = 'string' and length(p->'baked'->>k) > 64 then
        return 'baked_value_too_long:' || k;
      end if;
    end loop;
  end if;

  -- notes (optional; display-only)
  if p ? 'notes' then
    if jsonb_typeof(p->'notes') <> 'string' or length(p->>'notes') > 500 then
      return 'notes_invalid';
    end if;
  end if;

  return null;
end $$;

-- ── 3. c.tmr_validate_platform_constraints — the §2a shape, fail-closed ────────────────
create function c.tmr_validate_platform_constraints(p jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare k text; k2 text; mk text; err text; n int; v_min int; v_max int;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return 'constraints_not_object'; end if;
  if length(p::text) > 8192 then return 'constraints_too_large'; end if;
  if p::text ~* '(access[_-]?token|refresh[_-]?token|bearer|api[_-]?key|client[_-]?secret|password|authorization)' then
    return 'constraints_secret_like_content_rejected';
  end if;
  if p->>'schema_version' is distinct from 'tmr_platform_constraints_v1' then
    return 'constraints_wrong_schema_version';
  end if;
  for k in select jsonb_object_keys(p) loop
    if k not in ('schema_version','aspect','safe_zones','scene_contract','duration_bounds_s','notes') then
      return 'constraints_unknown_key:' || k;
    end if;
  end loop;

  -- aspect (required)
  if jsonb_typeof(p->'aspect') is distinct from 'object' then return 'aspect_required_object'; end if;
  for k in select jsonb_object_keys(p->'aspect') loop
    if k not in ('canvas_width','canvas_height','ratio') then return 'aspect_unknown_key:' || k; end if;
  end loop;
  if jsonb_typeof(p->'aspect'->'canvas_width') is distinct from 'number'
     or jsonb_typeof(p->'aspect'->'canvas_height') is distinct from 'number'
     or (p->'aspect'->>'canvas_width')::numeric <= 0
     or (p->'aspect'->>'canvas_height')::numeric <= 0 then
    return 'aspect_canvas_invalid';
  end if;
  if (p->'aspect'->>'ratio') is null or (p->'aspect'->>'ratio') !~ '^\d+:\d+$' then
    return 'aspect_ratio_invalid';
  end if;

  -- safe_zones (optional)
  if p ? 'safe_zones' then
    if jsonb_typeof(p->'safe_zones') <> 'array' then return 'safe_zones_not_array'; end if;
    for n in 0 .. jsonb_array_length(p->'safe_zones') - 1 loop
      if jsonb_typeof(p->'safe_zones'->n) <> 'object' then return 'safe_zone_not_object'; end if;
      for k in select jsonb_object_keys(p->'safe_zones'->n) loop
        if k not in ('zone_key','summary','keep_clear','source') then
          return 'safe_zone_unknown_key:' || k;
        end if;
      end loop;
      if (p->'safe_zones'->n->>'zone_key') is null
         or (p->'safe_zones'->n->>'zone_key') !~ '^[a-z][a-z0-9_]{0,31}$' then
        return 'safe_zone_key_invalid';
      end if;
      if jsonb_typeof(p->'safe_zones'->n->'summary') is distinct from 'string'
         or btrim(coalesce(p->'safe_zones'->n->>'summary','')) = ''
         or length(p->'safe_zones'->n->>'summary') > 200 then
        return 'safe_zone_summary_invalid';
      end if;
      if jsonb_typeof(p->'safe_zones'->n->'keep_clear') is distinct from 'boolean' then
        return 'safe_zone_keep_clear_required_boolean';
      end if;
    end loop;
  end if;

  -- scene_contract (optional at shape level; C8 requires it for video templates)
  if p ? 'scene_contract' then
    if jsonb_typeof(p->'scene_contract') <> 'object' then return 'scene_contract_not_object'; end if;
    for k in select jsonb_object_keys(p->'scene_contract') loop
      if k not in ('slots','min_active_scenes','max_active_scenes','collapse_mechanisms','source') then
        return 'scene_contract_unknown_key:' || k;
      end if;
    end loop;
    if jsonb_typeof(p->'scene_contract'->'slots') is distinct from 'array'
       or jsonb_array_length(p->'scene_contract'->'slots') = 0 then
      return 'scene_contract_slots_required';
    end if;
    for mk in select jsonb_array_elements_text(p->'scene_contract'->'slots') loop
      if mk !~ '^[a-z][a-z0-9_]{0,31}$' then return 'scene_contract_slot_invalid:' || mk; end if;
    end loop;
    if jsonb_typeof(p->'scene_contract'->'min_active_scenes') is distinct from 'number'
       or jsonb_typeof(p->'scene_contract'->'max_active_scenes') is distinct from 'number' then
      return 'scene_contract_range_required';
    end if;
    v_min := (p->'scene_contract'->>'min_active_scenes')::int;
    v_max := (p->'scene_contract'->>'max_active_scenes')::int;
    if v_min < 1 or v_max < v_min or v_max > 10 then return 'scene_contract_range_invalid'; end if;
    if p->'scene_contract' ? 'collapse_mechanisms' then
      if jsonb_typeof(p->'scene_contract'->'collapse_mechanisms') <> 'array' then
        return 'scene_contract_mechanisms_not_array';
      end if;
      for mk in select jsonb_array_elements_text(p->'scene_contract'->'collapse_mechanisms') loop
        if mk not in ('near_zero_duration','empty_text','off_canvas') then
          return 'scene_contract_mechanism_invalid:' || mk;
        end if;
      end loop;
    end if;
  end if;

  -- duration_bounds_s (optional)
  if p ? 'duration_bounds_s' then
    if jsonb_typeof(p->'duration_bounds_s') <> 'object' then return 'duration_bounds_not_object'; end if;
    for k in select jsonb_object_keys(p->'duration_bounds_s') loop
      if k not in ('total_min','total_max','per_slot') then return 'duration_bounds_unknown_key:' || k; end if;
      if k in ('total_min','total_max') then
        err := c.tmr_validate_limit_triple(p->'duration_bounds_s'->k);
        if err is not null then return 'duration_bounds.' || k || ':' || err; end if;
      end if;
    end loop;
    if p->'duration_bounds_s' ? 'per_slot' then
      if jsonb_typeof(p->'duration_bounds_s'->'per_slot') <> 'object' then
        return 'per_slot_not_object';
      end if;
      for k in select jsonb_object_keys(p->'duration_bounds_s'->'per_slot') loop
        if k !~ '^[a-z][a-z0-9_]{0,31}$' then return 'per_slot_key_invalid:' || k; end if;
        if jsonb_typeof(p->'duration_bounds_s'->'per_slot'->k) <> 'object' then
          return 'per_slot_entry_not_object:' || k;
        end if;
        for k2 in select jsonb_object_keys(p->'duration_bounds_s'->'per_slot'->k) loop
          if k2 not in ('min','max') then return 'per_slot_entry_unknown_key:' || k2; end if;
          err := c.tmr_validate_limit_triple(p->'duration_bounds_s'->'per_slot'->k->k2);
          if err is not null then return 'per_slot.' || k || '.' || k2 || ':' || err; end if;
        end loop;
      end loop;
    end if;
  end if;

  -- notes
  if p ? 'notes' then
    if jsonb_typeof(p->'notes') <> 'string' or length(p->>'notes') > 500 then
      return 'notes_invalid';
    end if;
  end if;

  return null;
end $$;

-- ── 4. public.record_tmr_template_field — governed INSERT-ONLY field capture ───────────
create function public.record_tmr_template_field(
  p_template_id         uuid,
  p_element_name        text,
  p_element_type        text,
  p_field_kind          text,
  p_required_for_render boolean,
  p_constraints         jsonb,
  p_element_id          text default null,
  p_track               text default null,
  p_dynamic             boolean default true,
  p_default_value_safe  text default null,
  p_style_summary       text default null,
  p_recorded_by         text default null
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_tid uuid; v_err text; v_new uuid;
begin
  select id into v_tid from c.creative_provider_template where id = p_template_id;
  if v_tid is null then
    return jsonb_build_object('error','template_not_found','template_id',p_template_id);
  end if;
  if p_element_name is null or p_element_name !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$' then
    return jsonb_build_object('error','invalid_element_name','element_name',p_element_name);
  end if;
  if p_field_kind is null or p_field_kind not in
     ('text','image','logo','background','shape','audio','video') then
    return jsonb_build_object('error','invalid_field_kind','field_kind',p_field_kind);
    -- 'unknown' is in the column CHECK but deliberately NOT capturable through this RPC:
    -- a governed capture must know what it is capturing.
  end if;
  if p_required_for_render is null then
    return jsonb_build_object('error','required_for_render_must_be_explicit');
  end if;
  -- free-text params: bounded + secret-scanned (record_tmr_proof_event sanitization precedent)
  if length(coalesce(p_element_type,'')) > 64 or length(coalesce(p_element_id,'')) > 128
     or length(coalesce(p_track,'')) > 64 or length(coalesce(p_default_value_safe,'')) > 500
     or length(coalesce(p_style_summary,'')) > 500 or length(coalesce(p_recorded_by,'')) > 128 then
    return jsonb_build_object('error','free_text_param_too_long');
  end if;
  if (coalesce(p_default_value_safe,'') || ' ' || coalesce(p_style_summary,''))
     ~* '(access[_-]?token|refresh[_-]?token|bearer|api[_-]?key|client[_-]?secret|password|authorization)' then
    return jsonb_build_object('error','secret_like_param_rejected');
  end if;
  if p_constraints is null then
    return jsonb_build_object('error','constraints_required');
  end if;
  v_err := c.tmr_validate_field_constraints(p_element_name, p_field_kind, p_constraints);
  if v_err is not null then
    return jsonb_build_object('error','constraints_invalid','detail',v_err);
  end if;
  begin
    insert into c.creative_provider_template_field
      (template_id, element_id, element_name, element_type, track, dynamic, field_kind,
       default_value_safe, style_summary, constraints, required_for_render)
    values
      (v_tid, p_element_id, p_element_name, p_element_type, p_track, p_dynamic, p_field_kind,
       p_default_value_safe, p_style_summary, p_constraints, p_required_for_render)
    returning id into v_new;
  exception when unique_violation then
    return jsonb_build_object('error','field_already_exists','element_name',p_element_name);
  end;
  return jsonb_build_object('ok',true,'field_id',v_new,'element_name',p_element_name,
                            'constraints_md5',md5(p_constraints::text),'recorded_by',p_recorded_by);
end $$;

-- ── 5. public.set_tmr_field_constraints — CAS UPDATE (legacy-row population + probe calibration) ──
create function public.set_tmr_field_constraints(
  p_template_id          uuid,
  p_element_name         text,
  p_constraints          jsonb,
  p_expected_current_md5 text default null,   -- null ⇒ current constraints MUST be NULL (first write)
  p_field_kind           text default null,   -- optional backfill when the legacy row's kind is NULL
  p_recorded_by          text default null
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_row record; v_err text; v_cur_md5 text; v_kind text;
begin
  select f.id, f.field_kind, f.constraints into v_row
    from c.creative_provider_template_field f
   where f.template_id = p_template_id and f.element_name = p_element_name
   for update;
  if not found then
    return jsonb_build_object('error','field_not_found','element_name',p_element_name);
  end if;
  if length(coalesce(p_recorded_by,'')) > 128 then
    return jsonb_build_object('error','free_text_param_too_long');
  end if;
  if p_constraints is null then
    return jsonb_build_object('error','constraints_required');
  end if;
  -- field_kind resolution: never silently retype
  if v_row.field_kind is null then
    if p_field_kind is null then
      return jsonb_build_object('error','field_kind_missing_supply_p_field_kind');
    end if;
    if p_field_kind not in ('text','image','logo','background','shape','audio','video') then
      return jsonb_build_object('error','invalid_field_kind','field_kind',p_field_kind);
    end if;
    v_kind := p_field_kind;
  else
    if p_field_kind is not null and p_field_kind is distinct from v_row.field_kind then
      return jsonb_build_object('error','field_kind_mismatch','current',v_row.field_kind,'supplied',p_field_kind);
    end if;
    v_kind := v_row.field_kind;
  end if;
  v_err := c.tmr_validate_field_constraints(p_element_name, v_kind, p_constraints);
  if v_err is not null then
    return jsonb_build_object('error','constraints_invalid','detail',v_err);
  end if;
  -- CAS, fail-closed
  if v_row.constraints is null then
    if p_expected_current_md5 is not null then
      return jsonb_build_object('error','cas_expected_value_but_current_null');
    end if;
  else
    v_cur_md5 := md5(v_row.constraints::text);
    if p_expected_current_md5 is null or p_expected_current_md5 <> v_cur_md5 then
      return jsonb_build_object('error','cas_mismatch','current_md5',v_cur_md5);
    end if;
  end if;
  update c.creative_provider_template_field
     set constraints = p_constraints,
         field_kind  = v_kind
   where id = v_row.id;
  return jsonb_build_object('ok',true,'field_id',v_row.id,
                            'previous_md5',v_cur_md5,'new_md5',md5(p_constraints::text),
                            'recorded_by',p_recorded_by);
end $$;

-- ── 6. public.record_tmr_platform_suitability — governed INSERT-ONLY, no status elevation ──
create function public.record_tmr_platform_suitability(
  p_template_id        uuid,
  p_platform           text,
  p_constraints        jsonb,
  p_placement          text default 'default',
  p_suitability_status text default 'candidate',
  p_reason             text default null,
  p_recorded_by        text default null
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_tid uuid; v_err text; v_new uuid;
begin
  select id into v_tid from c.creative_provider_template where id = p_template_id;
  if v_tid is null then
    return jsonb_build_object('error','template_not_found','template_id',p_template_id);
  end if;
  if p_platform is null or p_platform not in
     ('facebook','instagram','linkedin','youtube','wordpress') then
    return jsonb_build_object('error','invalid_platform','platform',p_platform);
  end if;
  if p_placement is null or p_placement !~ '^[a-z][a-z0-9_]{0,31}$' then
    return jsonb_build_object('error','invalid_placement','placement',p_placement);
  end if;
  -- proof-adjacent statuses (platform_safe / production_proven / blocked) are NOT writable here:
  -- suitability elevation is a separate governed act, mirroring record_tmr_proof_event's
  -- "no status elevation" rule.
  if p_suitability_status is null or p_suitability_status not in
     ('unknown','candidate','not_suitable','needs_review') then
    return jsonb_build_object('error','suitability_status_not_writable','status',p_suitability_status);
  end if;
  if length(coalesce(p_reason,'')) > 500 or length(coalesce(p_recorded_by,'')) > 128 then
    return jsonb_build_object('error','free_text_param_too_long');
  end if;
  if coalesce(p_reason,'')
     ~* '(access[_-]?token|refresh[_-]?token|bearer|api[_-]?key|client[_-]?secret|password|authorization)' then
    return jsonb_build_object('error','secret_like_param_rejected');
  end if;
  if p_constraints is null then
    return jsonb_build_object('error','constraints_required');
  end if;
  v_err := c.tmr_validate_platform_constraints(p_constraints);
  if v_err is not null then
    return jsonb_build_object('error','constraints_invalid','detail',v_err);
  end if;
  begin
    insert into c.creative_template_platform_suitability
      (template_id, platform, placement, suitability_status, reason, constraints, last_reviewed_at)
    values
      (v_tid, p_platform, p_placement, p_suitability_status, p_reason, p_constraints, now())
    returning id into v_new;
  exception when unique_violation then
    return jsonb_build_object('error','suitability_row_already_exists',
                              'platform',p_platform,'placement',p_placement);
  end;
  return jsonb_build_object('ok',true,'suitability_id',v_new,'platform',p_platform,
                            'constraints_md5',md5(p_constraints::text),'recorded_by',p_recorded_by);
end $$;

-- ── 7. public.set_tmr_platform_constraints — CAS UPDATE (probe calibration of duration bounds) ──
create function public.set_tmr_platform_constraints(
  p_template_id          uuid,
  p_platform             text,
  p_placement            text,
  p_constraints          jsonb,
  p_expected_current_md5 text default null,
  p_recorded_by          text default null
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_row record; v_err text; v_cur_md5 text;
begin
  select s.id, s.constraints into v_row
    from c.creative_template_platform_suitability s
   where s.template_id = p_template_id and s.platform = p_platform and s.placement = p_placement
   for update;
  if not found then
    return jsonb_build_object('error','suitability_row_not_found','platform',p_platform,'placement',p_placement);
  end if;
  if length(coalesce(p_recorded_by,'')) > 128 then
    return jsonb_build_object('error','free_text_param_too_long');
  end if;
  if p_constraints is null then
    return jsonb_build_object('error','constraints_required');
  end if;
  v_err := c.tmr_validate_platform_constraints(p_constraints);
  if v_err is not null then
    return jsonb_build_object('error','constraints_invalid','detail',v_err);
  end if;
  if v_row.constraints is null then
    if p_expected_current_md5 is not null then
      return jsonb_build_object('error','cas_expected_value_but_current_null');
    end if;
  else
    v_cur_md5 := md5(v_row.constraints::text);
    if p_expected_current_md5 is null or p_expected_current_md5 <> v_cur_md5 then
      return jsonb_build_object('error','cas_mismatch','current_md5',v_cur_md5);
    end if;
  end if;
  update c.creative_template_platform_suitability
     set constraints = p_constraints, updated_at = now(), last_reviewed_at = now()
   where id = v_row.id;
  return jsonb_build_object('ok',true,'suitability_id',v_row.id,
                            'previous_md5',v_cur_md5,'new_md5',md5(p_constraints::text),
                            'recorded_by',p_recorded_by);
end $$;

-- ── 8. public.validate_tmr_template_intake — the P-7 FIRST CONSUMER (read-only) ────────
create function public.validate_tmr_template_intake(
  p_template_id       uuid,     -- null ⇒ declared-only mode
  p_declared_contract jsonb
) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
declare
  v_mode text := case when p_template_id is null then 'declared_only' else 'capture_check' end;
  v_t record;
  findings jsonb := '[]'::jsonb;
  warnings jsonb := '[]'::jsonb;
  calibration_required jsonb := '[]'::jsonb;
  required_assets jsonb := '[]'::jsonb;
  optional_bindings jsonb := '[]'::jsonb;
  probe_checklist jsonb := '[]'::jsonb;
  hard int := 0;
  el jsonb; k text; mk text; err text; n int;
  v_name text; v_kind text; v_req boolean; v_dc jsonb;
  v_captured record;
  v_plat jsonb; v_prow record;
  seen_names text[] := '{}';
  all_mod_keys text[] := '{}';
  tbc jsonb;
begin
  -- declared contract envelope, fail-closed
  if p_declared_contract is null or jsonb_typeof(p_declared_contract) <> 'object'
     or p_declared_contract->>'contract_version' is distinct from 'tmr_intake_declared_contract_v1' then
    return jsonb_build_object('verdict','fail','mode',v_mode,'hard_failure_count',1,
      'findings',jsonb_build_array(jsonb_build_object('code','declared_contract_invalid_envelope')));
  end if;
  for k in select jsonb_object_keys(p_declared_contract) loop
    if k not in ('contract_version','template','platforms','elements') then
      return jsonb_build_object('verdict','fail','mode',v_mode,'hard_failure_count',1,
        'findings',jsonb_build_array(jsonb_build_object('code','declared_contract_unknown_key','key',k)));
    end if;
  end loop;
  if jsonb_typeof(p_declared_contract->'template') is distinct from 'object'
     or jsonb_typeof(p_declared_contract->'platforms') is distinct from 'array'
     or jsonb_typeof(p_declared_contract->'elements') is distinct from 'array'
     or jsonb_array_length(p_declared_contract->'elements') = 0 then
    return jsonb_build_object('verdict','fail','mode',v_mode,'hard_failure_count',1,
      'findings',jsonb_build_array(jsonb_build_object('code','declared_contract_sections_invalid')));
  end if;
  -- template section: fail-closed key set + types BEFORE any cast (no raw 22P02 on bad input)
  if exists (select 1 from jsonb_object_keys(p_declared_contract->'template') t(k2)
             where k2 not in ('provider','scope','output_type','width','height'))
     or jsonb_typeof(p_declared_contract->'template'->'provider') is distinct from 'string'
     or jsonb_typeof(p_declared_contract->'template'->'scope') is distinct from 'string'
     or jsonb_typeof(p_declared_contract->'template'->'output_type') is distinct from 'string'
     or jsonb_typeof(p_declared_contract->'template'->'width') is distinct from 'number'
     or jsonb_typeof(p_declared_contract->'template'->'height') is distinct from 'number' then
    return jsonb_build_object('verdict','fail','mode',v_mode,'hard_failure_count',1,
      'findings',jsonb_build_array(jsonb_build_object('code','declared_template_section_invalid')));
  end if;

  -- C1: template row (capture mode only)
  if v_mode = 'capture_check' then
    select id, provider, scope, output_type, width, height
      into v_t from c.creative_provider_template where id = p_template_id;
    if v_t.id is null then
      return jsonb_build_object('verdict','fail','mode',v_mode,'hard_failure_count',1,
        'findings',jsonb_build_array(jsonb_build_object('code','template_not_found')));
    end if;
    if v_t.scope <> 'generic' then
      findings := findings || jsonb_build_object('code','scope_not_generic_selector_invisible',
        'scope',v_t.scope,
        'detail','live select_template admits only scope=''generic'' (cc-0089); a non-generic (client OR brand) row is silently never selectable');
      hard := hard + 1;
    end if;
    for k in select unnest(array['provider','scope','output_type']) loop
      if (p_declared_contract->'template'->>k) is distinct from
         (case k when 'provider' then v_t.provider when 'scope' then v_t.scope else v_t.output_type end) then
        findings := findings || jsonb_build_object('code','template_attr_mismatch','attr',k,
          'declared',p_declared_contract->'template'->>k,
          'captured',case k when 'provider' then v_t.provider when 'scope' then v_t.scope else v_t.output_type end);
        hard := hard + 1;
      end if;
    end loop;
    if (p_declared_contract->'template'->>'width')::numeric is distinct from v_t.width::numeric
       or (p_declared_contract->'template'->>'height')::numeric is distinct from v_t.height::numeric then
      findings := findings || jsonb_build_object('code','template_canvas_mismatch',
        'declared',(p_declared_contract->'template'->>'width') || 'x' || (p_declared_contract->'template'->>'height'),
        'captured',coalesce(v_t.width::text,'∅') || 'x' || coalesce(v_t.height::text,'∅'));
      hard := hard + 1;
    end if;
  end if;

  -- per-declared-element pass (C3 declared-side shape, C4, C5, C6, C9; accumulate names/keys)
  for el in select jsonb_array_elements(p_declared_contract->'elements') loop
    -- fail-closed element envelope: object, known keys, typed fields — BEFORE any cast
    if jsonb_typeof(el) <> 'object' then
      findings := findings || jsonb_build_object('code','declared_element_not_object');
      hard := hard + 1; continue;
    end if;
    if exists (select 1 from jsonb_object_keys(el) t(k2)
               where k2 not in ('element_name','field_kind','required_for_render','constraints')) then
      findings := findings || jsonb_build_object('code','declared_element_unknown_key',
        'element',coalesce(el->>'element_name','∅'));
      hard := hard + 1; continue;
    end if;
    if jsonb_typeof(el->'required_for_render') is distinct from 'boolean'
       or jsonb_typeof(el->'field_kind') is distinct from 'string' then
      findings := findings || jsonb_build_object('code','declared_element_types_invalid',
        'element',coalesce(el->>'element_name','∅'));
      hard := hard + 1; continue;
    end if;
    v_name := el->>'element_name';
    v_kind := el->>'field_kind';
    v_req  := (el->>'required_for_render')::boolean;
    v_dc   := el->'constraints';
    if v_name is null or v_name !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$' then
      findings := findings || jsonb_build_object('code','declared_element_name_invalid','element',coalesce(v_name,'∅'));
      hard := hard + 1; continue;
    end if;
    if v_name = any(seen_names) then
      findings := findings || jsonb_build_object('code','declared_element_duplicate','element',v_name);
      hard := hard + 1; continue;
    end if;
    seen_names := seen_names || v_name;
    err := c.tmr_validate_field_constraints(v_name, coalesce(v_kind,'unknown'), v_dc);
    if err is not null then
      findings := findings || jsonb_build_object('code','declared_constraints_invalid','element',v_name,'detail',err);
      hard := hard + 1; continue;
    end if;
    -- C7 accumulation
    select all_mod_keys || coalesce(array_agg(x), array[]::text[]) into all_mod_keys
      from jsonb_array_elements_text(v_dc->'modification_keys') t(x);
    -- C4: calibration ledger
    if v_dc ? 'text_limits' then
      for k in select jsonb_object_keys(v_dc->'text_limits') loop
        if v_dc->'text_limits'->k->>'basis' = 'to_be_calibrated' then
          calibration_required := calibration_required ||
            jsonb_build_object('element',v_name,'limit',k);
        end if;
      end loop;
    end if;
    -- C5: asset routing
    if v_dc->>'content_source' = 'governed_asset' then
      required_assets := required_assets || jsonb_build_object('element',v_name,
        'resolver',v_dc->'asset'->>'resolver','asset_kind',v_dc->'asset'->>'asset_kind');
    elsif v_dc->>'content_source' = 'brand_profile_colour' then
      required_assets := required_assets || jsonb_build_object('element',v_name,
        'profile_column',v_dc->'asset'->>'profile_column');
    elsif v_dc->>'content_source' = 'render_binding' then
      optional_bindings := optional_bindings || jsonb_build_object('element',v_name);
    end if;
    -- C6: collapse depth advisory
    if v_dc->'slot'->>'activation' = 'conditional'
       and jsonb_array_length(v_dc->'collapse'->'mechanism') < 3 then
      warnings := warnings || jsonb_build_object('code','collapse_mechanisms_below_recommended',
        'element',v_name,'count',jsonb_array_length(v_dc->'collapse'->'mechanism'));
    end if;
    -- C9: probe checklist
    tbc := '[]'::jsonb;
    if v_dc ? 'text_limits' then
      for k in select jsonb_object_keys(v_dc->'text_limits') loop
        if v_dc->'text_limits'->k->>'basis' = 'to_be_calibrated' then tbc := tbc || to_jsonb(k); end if;
      end loop;
    end if;
    if v_dc->>'overflow_risk' = 'high' or jsonb_array_length(tbc) > 0 then
      probe_checklist := probe_checklist || jsonb_build_object('element',v_name,
        'container',v_dc->'container'->>'summary','limits_tbc',tbc,
        'baked',coalesce(v_dc->'baked','{}'::jsonb),'notes',v_dc->>'notes');
    end if;
    -- C3: capture comparison
    if v_mode = 'capture_check' then
      select f.field_kind, f.required_for_render, f.constraints into v_captured
        from c.creative_provider_template_field f
       where f.template_id = p_template_id and f.element_name = v_name;
      if not found then
        findings := findings || jsonb_build_object('code','element_missing_from_capture','element',v_name);
        hard := hard + 1;
      else
        if v_captured.field_kind is distinct from v_kind then
          findings := findings || jsonb_build_object('code','field_kind_mismatch','element',v_name,
            'declared',v_kind,'captured',v_captured.field_kind);
          hard := hard + 1;
        end if;
        if v_captured.required_for_render is distinct from v_req then
          findings := findings || jsonb_build_object('code','required_for_render_mismatch','element',v_name,
            'declared',v_req,'captured',v_captured.required_for_render);
          hard := hard + 1;
        end if;
        if v_captured.constraints is null then
          findings := findings || jsonb_build_object('code','captured_constraints_missing','element',v_name);
          hard := hard + 1;
        elsif v_captured.constraints <> v_dc then
          findings := findings || jsonb_build_object('code','constraints_diverge_from_declared','element',v_name,
            'declared_md5',md5(v_dc::text),'captured_md5',md5(v_captured.constraints::text));
          hard := hard + 1;
        end if;
      end if;
    end if;
  end loop;

  -- C10: shared_with resolution (against the declared element set)
  for el in select jsonb_array_elements(p_declared_contract->'elements') loop
    v_dc := el->'constraints';
    if v_dc ? 'container' and v_dc->'container' ? 'shared_with' then
      for mk in select jsonb_array_elements_text(v_dc->'container'->'shared_with') loop
        if not (mk = any(seen_names)) then
          findings := findings || jsonb_build_object('code','shared_with_unresolved',
            'element',el->>'element_name','references',mk);
          hard := hard + 1;
        end if;
      end loop;
    end if;
  end loop;

  -- C2: unexpected captured rows (reverse direction)
  if v_mode = 'capture_check' then
    for v_name in
      select f.element_name from c.creative_provider_template_field f
       where f.template_id = p_template_id and not (f.element_name = any(seen_names))
    loop
      findings := findings || jsonb_build_object('code','unexpected_captured_element','element',v_name);
      hard := hard + 1;
    end loop;
  end if;

  -- C7: cross-element modification-key uniqueness
  select count(*) - count(distinct x) into n from unnest(all_mod_keys) t(x);
  if n > 0 then
    findings := findings || jsonb_build_object('code','modification_keys_duplicate_across_elements','duplicates',n);
    hard := hard + 1;
  end if;

  -- C8: platforms
  for v_plat in select jsonb_array_elements(p_declared_contract->'platforms') loop
    if jsonb_typeof(v_plat) <> 'object' or (v_plat->>'platform') is null then
      findings := findings || jsonb_build_object('code','declared_platform_invalid');
      hard := hard + 1; continue;
    end if;
    if v_mode = 'capture_check' then
      select s.constraints into v_prow
        from c.creative_template_platform_suitability s
       where s.template_id = p_template_id
         and s.platform = v_plat->>'platform'
         and s.placement = coalesce(v_plat->>'placement','default');
      if not found then
        findings := findings || jsonb_build_object('code','platform_suitability_row_missing',
          'platform',v_plat->>'platform','placement',coalesce(v_plat->>'placement','default'));
        hard := hard + 1;
      elsif v_prow.constraints is null then
        findings := findings || jsonb_build_object('code','platform_constraints_missing',
          'platform',v_plat->>'platform');
        hard := hard + 1;
      else
        err := c.tmr_validate_platform_constraints(v_prow.constraints);
        if err is not null then
          findings := findings || jsonb_build_object('code','platform_constraints_invalid',
            'platform',v_plat->>'platform','detail',err);
          hard := hard + 1;
        else
          if (v_prow.constraints->'aspect'->>'canvas_width')::numeric is distinct from v_t.width::numeric
             or (v_prow.constraints->'aspect'->>'canvas_height')::numeric is distinct from v_t.height::numeric then
            findings := findings || jsonb_build_object('code','platform_aspect_disagrees_with_template',
              'platform',v_plat->>'platform');
            hard := hard + 1;
          end if;
          if v_t.output_type = 'video'
             and (not (v_prow.constraints ? 'scene_contract')
                  or not (v_prow.constraints ? 'duration_bounds_s')) then
            findings := findings || jsonb_build_object('code','video_platform_constraints_incomplete',
              'platform',v_plat->>'platform',
              'detail','scene_contract and duration_bounds_s required for output_type=video');
            hard := hard + 1;
          end if;
        end if;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'verdict', case when hard = 0 then 'pass' else 'fail' end,
    'mode', v_mode,
    'hard_failure_count', hard,
    'findings', findings,
    'warnings', warnings,
    'calibration_required', calibration_required,
    'required_assets', required_assets,
    'optional_bindings', optional_bindings,
    'probe_checklist', probe_checklist);
end $$;

-- ── 9. Grants: service-role-only; REVOKE mandatory (default ACL grants EXECUTE to PUBLIC) ──
revoke execute on function c.tmr_validate_limit_triple(jsonb) from public, anon, authenticated;
revoke execute on function c.tmr_validate_field_constraints(text,text,jsonb) from public, anon, authenticated;
revoke execute on function c.tmr_validate_platform_constraints(jsonb) from public, anon, authenticated;
revoke execute on function public.record_tmr_template_field(uuid,text,text,text,boolean,jsonb,text,text,boolean,text,text,text) from public, anon, authenticated;
revoke execute on function public.set_tmr_field_constraints(uuid,text,jsonb,text,text,text) from public, anon, authenticated;
revoke execute on function public.record_tmr_platform_suitability(uuid,text,jsonb,text,text,text,text) from public, anon, authenticated;
revoke execute on function public.set_tmr_platform_constraints(uuid,text,text,jsonb,text,text) from public, anon, authenticated;
revoke execute on function public.validate_tmr_template_intake(uuid,jsonb) from public, anon, authenticated;

grant execute on function c.tmr_validate_limit_triple(jsonb) to service_role;
grant execute on function c.tmr_validate_field_constraints(text,text,jsonb) to service_role;
grant execute on function c.tmr_validate_platform_constraints(jsonb) to service_role;
grant execute on function public.record_tmr_template_field(uuid,text,text,text,boolean,jsonb,text,text,boolean,text,text,text) to service_role;
grant execute on function public.set_tmr_field_constraints(uuid,text,jsonb,text,text,text) to service_role;
grant execute on function public.record_tmr_platform_suitability(uuid,text,jsonb,text,text,text,text) to service_role;
grant execute on function public.set_tmr_platform_constraints(uuid,text,text,jsonb,text,text) to service_role;
grant execute on function public.validate_tmr_template_intake(uuid,jsonb) to service_role;

commit;

-- ── ROLLBACK (reference only — NOT executed; byte-exact reverse of every object created) ──
--   drop function if exists public.validate_tmr_template_intake(uuid,jsonb);
--   drop function if exists public.set_tmr_platform_constraints(uuid,text,text,jsonb,text,text);
--   drop function if exists public.record_tmr_platform_suitability(uuid,text,jsonb,text,text,text,text);
--   drop function if exists public.set_tmr_field_constraints(uuid,text,jsonb,text,text,text);
--   drop function if exists public.record_tmr_template_field(uuid,text,text,text,boolean,jsonb,text,text,boolean,text,text,text);
--   drop function if exists c.tmr_validate_platform_constraints(jsonb);
--   drop function if exists c.tmr_validate_field_constraints(text,text,jsonb);
--   drop function if exists c.tmr_validate_limit_triple(jsonb);
