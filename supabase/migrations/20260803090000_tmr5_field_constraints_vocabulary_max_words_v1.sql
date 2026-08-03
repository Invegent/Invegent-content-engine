-- tmr5_field_constraints_vocabulary_max_words_v1
-- Lane A ws5-production-envelope-enforcement-foundation, P3 (2026-08-03).
-- ONE-KEY vocabulary extension to the tmr_field_constraints_v1 shape validator:
-- text_limits gains an OPTIONAL 'max_words' limit-triple ({value,basis,source,evidence_reference},
-- same c.tmr_validate_limit_triple validation as max_chars/max_lines/min_font_px).
-- WHY: the NDIS video_stat_reveal_9x16_v2 incident (oCrtq6R9VFQ) was a WORD-count geometry
-- failure ("2 people", 8 chars, 2 words -> line-wrap into the eyebrow) that char bounds cannot
-- express; PK Gate-1 D-1/D-2 (2026-08-03) require a numeric/content envelope with word/line
-- rules for StatValue. ai-worker v2.26.0's stat_envelope consumer already honors max_words
-- when present (deployed 2026-08-03); this migration makes the key PERSISTABLE.
-- CREATE OR REPLACE preserves the existing ACL (service-role-only; REVOKEs re-asserted below
-- belt-and-braces). Function body is otherwise BYTE-IDENTICAL to
-- 20260801043347_tmr5_field_constraints_write_rpcs_and_intake_validator_v2.sql section 2,
-- except: the text_limits allowed-key list adds 'max_words'.

create or replace function c.tmr_validate_field_constraints(
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
      if k not in ('max_chars','max_lines','min_font_px','max_words') then
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


-- ACL re-assertion (CREATE OR REPLACE preserves grants; explicit for the record):
revoke execute on function c.tmr_validate_field_constraints(text,text,jsonb) from public, anon, authenticated;
grant execute on function c.tmr_validate_field_constraints(text,text,jsonb) to service_role;
