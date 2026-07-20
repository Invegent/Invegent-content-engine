-- ROLLBACK — public.resolve_shared_pool_assets — byte-exact live body captured 2026-07-20
-- Pre-change live identity: md5(pg_get_functiondef)=9791edd63ffcfb7973e1942b58025e0a, len=3317,
--   SECURITY DEFINER, STABLE, search_path='', owner=postgres, grants {postgres=X, service_role=X}.
-- Re-applying this restores the exact prior body (grants preserved by CREATE OR REPLACE).
-- Source: pg_get_functiondef on live oid, project mbkmaxqhsohbtwsqolns.

CREATE OR REPLACE FUNCTION public.resolve_shared_pool_assets(p_client_slug text, p_platform text, p_asset_kind text, p_vertical_key text, p_permitted_scopes text[], p_seed text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client_id uuid;
  v_context   jsonb;
  v_eligible  jsonb := '[]'::jsonb;
  v_rejected  jsonb := '[]'::jsonb;
  v_scanned   int := 0;
  r           record;
  v_reason    text;
begin
  v_context := jsonb_build_object('client_slug',p_client_slug,'platform',p_platform,
    'asset_kind',p_asset_kind,'vertical_key',p_vertical_key,'permitted_scopes',to_jsonb(p_permitted_scopes),'seed',p_seed);

  select cl.client_id into v_client_id from c.client cl where cl.client_slug = p_client_slug;
  if not found then
    return jsonb_build_object('status','fail_closed','fail_reason','client_not_found',
      'selected',null,'rejected','[]'::jsonb,'context',v_context);
  end if;

  if p_permitted_scopes is null or array_length(p_permitted_scopes,1) is null then
    return jsonb_build_object('status','fail_closed','fail_reason','no_permitted_shared_scope',
      'selected',null,'rejected','[]'::jsonb,'context',v_context);
  end if;

  for r in
    select sa.id, sa.asset_url, sa.governance_scope, sa.vertical_key, sa.platform_scope,
           sa.is_active, sa.production_use_allowed, sa.purpose_bound,
           sa.licence_allows_multi_entity_use, sa.allowed_clients, sa.excluded_clients, sa.created_at
    from c.shared_creative_asset sa
    where sa.asset_kind = p_asset_kind
      and sa.governance_scope = any(p_permitted_scopes)
    order by sa.created_at asc, sa.id asc
  loop
    v_scanned := v_scanned + 1;
    v_reason := null;
    if r.is_active is not true then v_reason := 'inactive';
    elsif r.production_use_allowed is not true then v_reason := 'production_use_not_allowed';
    elsif r.purpose_bound is true then v_reason := 'purpose_bound';
    elsif r.licence_allows_multi_entity_use is not true then v_reason := 'licence_not_multi_entity';
    elsif v_client_id = any(r.excluded_clients) then v_reason := 'client_excluded';
    elsif array_length(r.allowed_clients,1) is not null and v_client_id <> all(r.allowed_clients) then v_reason := 'not_in_allowlist';
    elsif r.governance_scope = 'vertical_shared' and r.vertical_key is distinct from p_vertical_key then v_reason := 'vertical_mismatch';
    elsif array_length(r.platform_scope,1) is not null and p_platform is not null and p_platform <> all(r.platform_scope) then v_reason := 'platform_excluded';
    end if;

    if v_reason is not null then
      v_rejected := v_rejected || jsonb_build_object('asset_id', r.id, 'reason_code', v_reason);
    else
      v_eligible := v_eligible || jsonb_build_object('asset_id', r.id, 'asset_url', r.asset_url, 'scope', r.governance_scope);
    end if;
  end loop;

  if jsonb_array_length(v_eligible) = 0 then
    return jsonb_build_object('status','fail_closed',
      'fail_reason', case when v_scanned = 0 then 'shared_pool_empty' else 'no_shared_candidate' end,
      'selected',null,'rejected',v_rejected,'context',v_context);
  end if;

  return jsonb_build_object('status','ok','fail_reason',null,
    'selected', v_eligible -> 0, 'rejected', v_rejected, 'context', v_context);
end;
$function$;

-- Posture re-assert (idempotent; matches cc-0042 ddl-v1 grants):
revoke all    on function public.resolve_shared_pool_assets(text,text,text,text,text[],text) from public, anon, authenticated;
grant  execute on function public.resolve_shared_pool_assets(text,text,text,text,text[],text) to service_role;
