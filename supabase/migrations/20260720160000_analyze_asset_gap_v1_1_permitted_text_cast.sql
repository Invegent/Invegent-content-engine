-- cc-0044 CARRY-2 — analyze_asset_gap v1.1: fix latent 22P02 on permitted-scope array append
-- =============================================================================================
-- WHAT: public.analyze_asset_gap builds v_permitted (text[]) with bare-literal appends
--       (v_permitted || 'vertical_shared' / || 'global_generic'). With an untyped literal,
--       Postgres resolves `text[] || unknown` as array-concat and tries to cast the string to
--       text[] → ERROR 22P02 malformed array literal. Fix: add an explicit ::text so it resolves
--       as element-append. VALUE-IDENTICAL result array.
--
-- WHY IT MATTERS: the buggy branch runs only when a client has a c.client_asset_pool_policy row
--       with pool_policy client_preferred/best_fit AND an allow_* flag true — i.e. the FIRST
--       shared-pool activation. There are 0 such rows today, so the bug has never fired; this fix
--       must land BEFORE / WITH the first pool-policy activation (cc-0044 CARRY-2). The resolver
--       (resolve_slot_assets v1.2) already uses the safe ::text form; this aligns the analyzer.
--
-- BEHAVIOUR-PRESERVING: for every currently-reachable input the changed lines are unreachable
--       (0 pool-policy rows ⇒ `if found` is false ⇒ the block is skipped), so live behaviour is
--       unchanged. When a policy row later exists, the fixed lines produce the SAME v_permitted
--       the buggy form intended, without raising 22P02.
--
-- SCOPE: ONLY the two append lines change. The rest of the body is byte-identical. Preserved:
--       SECURITY DEFINER, SET search_path='', STABLE, owner postgres, ACL {postgres=X,
--       service_role=X} (service_role EXECUTE only; no anon/authenticated). No GRANT/REVOKE, no
--       DDL beyond CREATE OR REPLACE, no writes (STABLE read-only analyzer).
--
-- Rollback: _harness/cc0044_agp_textcast/ROLLBACK_analyze_asset_gap_live_captured.sql
--       (byte-exact live pre-fix body; prosrc md5 d3578bd0e4498c31b2ea6ebf1c13538b, len 6276).
-- NOTE: applied via execute_sql (apply_migration deny-listed); ledger version minted at apply —
--       backfill this filename's identity into supabase_migrations.schema_migrations post-apply.
-- =============================================================================================
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
