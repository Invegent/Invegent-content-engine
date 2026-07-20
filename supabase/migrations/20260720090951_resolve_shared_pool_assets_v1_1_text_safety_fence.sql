-- cc-0044 CARRY-1 — resolve_shared_pool_assets v1.1: add the text-safety fence (analyzer↔resolver parity)
-- =============================================================================================
-- WHAT: public.resolve_shared_pool_assets (called by public.analyze_asset_gap to set v_shared_hit)
--       ran the licence/scope fence chain but applied NO text-safety fence. resolve_slot_assets v1.2
--       (the render authority) rejects a shared static_background whose safe_for_text_overlay is
--       'false' / null / unrecognized. So the analyzer could count a non-text-safe shared bg as a
--       "shared hit" (→ "no gap") that the resolver then fails-closed at render.
--
-- FIX: append the resolver's EXACT text-safety classification after the existing chain
--      (is_active → production_use_allowed → purpose_bound → licence_allows_multi_entity_use →
--       excluded_clients → allowed_clients → vertical_mismatch → platform_excluded → TEXT-SAFETY),
--      so v_shared_hit == the resolver's actual resolvability. Reason codes mirror the resolver:
--        safe_for_text_overlay = 'false'                     → 'not_text_safe'
--        safe_for_text_overlay IS NULL                       → 'text_safety_unknown'
--        safe_for_text_overlay NOT IN ('true','needs_scrim') → 'text_safety_unknown'  (unrecognized = unknown)
--      Guarded to p_asset_kind='static_background' — the ONLY kind analyze_asset_gap requests and the
--      only kind the resolver text-safety-classifies; other asset kinds are unaffected.
--
-- BEHAVIOR-PRESERVING / DARK: All 8 live shared static_background rows carry safe_for_text_overlay='true'
--      → none is newly rejected (value-preserving today). c.client_asset_pool_policy has 0 rows, so
--      no client consults the shared pool and the sole caller (analyze_asset_gap) runs dark
--      (p_dry_run). Change bites only a future 'false'/null/unrecognized shared bg — fail-safe
--      (that path already fails-closed at render; this only aligns gap-detection to it).
--
-- BLAST RADIUS: sole runtime caller is public.analyze_asset_gap (always 'static_background');
--      resolve_slot_assets references the name in COMMENTS only (it inlines, does not call).
--      No TS/JS/EF caller. Verified by repo grep + pg_get_functiondef catalog scan (2026-07-20).
--
-- PRESERVED: SECURITY DEFINER, SET search_path='', STABLE, owner postgres, grants
--      {postgres=X, service_role=X} (CREATE OR REPLACE keeps them; re-asserted + post-asserted below).
--
-- PARITY NOTE (out of scope, named follow-up): a SECOND micro-divergence exists — empty-array
--      platform_scope '{}' is rejected by resolve_slot_assets but passed here (array_length('{}',1) IS
--      NULL). No live asset has '{}' (all NULL), so it is inert today. Deferred to a canonical-direction
--      PK decision; NOT changed by this migration.
--
-- Rollback: _harness/cc0044_carry1_textsafety/ROLLBACK_resolve_shared_pool_assets_live_captured.sql
--           (byte-exact prior body, restores md5 9791edd63ffcfb7973e1942b58025e0a).
-- =============================================================================================

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
           sa.licence_allows_multi_entity_use, sa.allowed_clients, sa.excluded_clients, sa.created_at,
           sa.asset_meta->>'safe_for_text_overlay' as sfto
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
    -- cc-0044 CARRY-1: text-safety fence — mirror resolve_slot_assets v1.2 EXACTLY so v_shared_hit
    -- == the resolver's actual resolvability. Guarded to static_background (the sole requested /
    -- text-safety-classified kind); null caught before the not-in so no null-propagation.
    elsif p_asset_kind = 'static_background' and r.sfto = 'false' then v_reason := 'not_text_safe';
    elsif p_asset_kind = 'static_background' and r.sfto is null then v_reason := 'text_safety_unknown';
    elsif p_asset_kind = 'static_background' and r.sfto not in ('true','needs_scrim') then v_reason := 'text_safety_unknown';
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

-- Posture re-assert (idempotent; CREATE OR REPLACE preserves grants, this is belt-and-suspenders):
revoke all    on function public.resolve_shared_pool_assets(text,text,text,text,text[],text) from public, anon, authenticated;
grant  execute on function public.resolve_shared_pool_assets(text,text,text,text,text[],text) to service_role;

-- Post-assert ACL fail-closed (the standing "public functions are born anon-executable" gotcha):
DO $assert$
BEGIN
  IF has_function_privilege('anon',          'public.resolve_shared_pool_assets(text,text,text,text,text[],text)', 'EXECUTE')
  OR has_function_privilege('authenticated', 'public.resolve_shared_pool_assets(text,text,text,text,text[],text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'CARRY-1 postcondition failed: anon/authenticated still hold EXECUTE on resolve_shared_pool_assets';
  END IF;
END
$assert$;
