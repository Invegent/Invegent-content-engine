-- ============================================================================
-- cc-0042 — Asset appetite/inventory read-path — CANDIDATE SQL v1
-- ⛔ PREPARED — NOT APPLIED.  Apply is a PK-gated stop (T2). Ships DARK.
-- ============================================================================
-- Brief:  docs/briefs/cc-0042-appetite-inventory-read-path-brief.md
-- Builds the read-only "brain" cc-0041 designed. THREE functions, NO writes,
-- NO cron, NO production consumer. Posture (all): SECURITY DEFINER · STABLE ·
-- SET search_path='' · schema-qualified · EXECUTE revoked from PUBLIC/anon/
-- authenticated, granted to service_role only. Fail-closed (structured returns).
--
-- Verified schema (project mbkmaxqhsohbtwsqolns, read-only):
--   c.creative_provider_template(id, family_id, aspect_ratio, status, scope,
--     image_slot_min, image_slot_max, needs_governed_background, text_overlay_safe_required)
--   c.creative_template_variant_candidate(template_id, format_key, variant_key, fit_status)
--   c.creative_template_family_tag(family_id, namespace, value) [DEFAULT]
--   c.creative_provider_template_tag(template_id, namespace, value) [OVERRIDE within namespace]
--   c.shared_creative_asset / c.client_asset_pool_policy (cc-0041, 20260719160000)
--   public.resolve_slot_assets(p_client_slug, p_platform, p_format, p_template_id, p_seed)
--   pgcrypto present → digest() for appetite_signature.
--
-- Version minted at apply. ROLLBACK (reference only):
--   DROP FUNCTION IF EXISTS public.analyze_asset_gap(text,text,text,text);
--   DROP FUNCTION IF EXISTS public.resolve_shared_pool_assets(text,text,text,text,text[],text);
--   DROP FUNCTION IF EXISTS public.derive_asset_appetite(text,text,text,text);
-- ============================================================================

begin;

-- ────────────────────────────────────────────────────────────────────────────
-- 1 · public.derive_asset_appetite — pre-governance appetite projection
--     Returns the deterministically-ranked candidate set + a canonical appetite,
--     or 'ambiguous_asset_appetite' when equally-plausible candidates disagree.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.derive_asset_appetite(
  p_client_slug text,
  p_platform    text,
  p_format      text,
  p_seed        text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_client_id  uuid;
  v_context    jsonb;
  v_candidates jsonb := '[]'::jsonb;
  v_distinct   int;
  v_top        jsonb;
begin
  v_context := jsonb_build_object(
    'client_slug', p_client_slug, 'platform', p_platform,
    'format', p_format, 'seed', p_seed,
    'appetite_policy_version', 'v1', 'asset_kind_version', 'v1');

  -- 0. client lookup (c.client PK is client_id)
  select cl.client_id into v_client_id from c.client cl where cl.client_slug = p_client_slug;
  if not found then
    return jsonb_build_object('status','fail_closed','fail_reason','client_not_found',
      'appetite',null,'candidates','[]'::jsonb,'ambiguous',false,'context',v_context);
  end if;

  -- 1. pre-governance candidate set (reuse select_template's candidate query, minus a–e).
  --    effective tags: template OVERRIDES family within a namespace (COALESCE array_agg).
  with cand as (
    select t.id as template_id, t.family_id, t.aspect_ratio, t.created_at, t.status,
           t.image_slot_min, t.image_slot_max, t.needs_governed_background, t.text_overlay_safe_required,
           vc.variant_key, vc.fit_status
    from c.creative_template_variant_candidate vc
    join c.creative_provider_template t on t.id = vc.template_id
    where vc.format_key = p_format
  ),
  eff as (
    select cand.*,
      coalesce((select array_agg(distinct tt.value order by tt.value) from c.creative_provider_template_tag tt
                where tt.template_id = cand.template_id and tt.namespace = 'length_class'),
               (select array_agg(distinct ft.value order by ft.value) from c.creative_template_family_tag ft
                where ft.family_id = cand.family_id and ft.namespace = 'length_class'), '{}') as length_class_tags,
      coalesce((select array_agg(distinct tt.value order by tt.value) from c.creative_provider_template_tag tt
                where tt.template_id = cand.template_id and tt.namespace = 'vertical'),
               (select array_agg(distinct ft.value order by ft.value) from c.creative_template_family_tag ft
                where ft.family_id = cand.family_id and ft.namespace = 'vertical'), '{}') as vertical_tags,
      coalesce((select array_agg(distinct tt.value order by tt.value) from c.creative_provider_template_tag tt
                where tt.template_id = cand.template_id and tt.namespace = 'use_case'),
               (select array_agg(distinct ft.value order by ft.value) from c.creative_template_family_tag ft
                where ft.family_id = cand.family_id and ft.namespace = 'use_case'), '{}') as use_case_tags,
      coalesce((select array_agg(distinct tt.value order by tt.value) from c.creative_provider_template_tag tt
                where tt.template_id = cand.template_id and tt.namespace = 'tone'),
               (select array_agg(distinct ft.value order by ft.value) from c.creative_template_family_tag ft
                where ft.family_id = cand.family_id and ft.namespace = 'tone'), '{}') as tone_tags
    from cand
  ),
  shaped as (
    select eff.*,
      -- slot_kind from length_class: any video class → video_broll; else static_background
      case when eff.length_class_tags && array['short_video','standard_short_video','long_video']
             then 'video_broll'
           when 'static' = any(eff.length_class_tags) or eff.needs_governed_background is true
             then 'static_background'
           else 'none' end as slot_kind,
      -- material-difference key: appetite fields that, if they differ, forbid collapse
      concat_ws('|',
        coalesce(eff.image_slot_min::text,'-'), coalesce(eff.image_slot_max::text,'-'),
        coalesce(eff.needs_governed_background::text,'-'), coalesce(eff.text_overlay_safe_required::text,'-'),
        coalesce(eff.aspect_ratio,'-'),
        case when eff.length_class_tags && array['short_video','standard_short_video','long_video'] then 'video_broll'
             when 'static' = any(eff.length_class_tags) or eff.needs_governed_background is true then 'static_background'
             else 'none' end
      ) as material_key
    from eff
    -- exclude nonviable candidates (fit_status unsuitable/blocked) from the viable set AND the ambiguity test
    where eff.fit_status is distinct from 'unsuitable' and eff.fit_status is distinct from 'blocked'
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'template_id', s.template_id, 'family_id', s.family_id, 'variant_key', s.variant_key,
      'fit_status', s.fit_status, 'material_key', s.material_key,
      'canonical_appetite', jsonb_build_object(
        'image_slot_min', s.image_slot_min, 'image_slot_max', s.image_slot_max,
        'needs_governed_background', s.needs_governed_background,
        'text_overlay_safe_required', s.text_overlay_safe_required,
        'aspect_ratio', s.aspect_ratio, 'slot_kind', s.slot_kind,
        'vertical', case when array_length(s.vertical_tags,1) is null then null else s.vertical_tags[1] end,
        'use_case_tags', to_jsonb(s.use_case_tags), 'tone_tags', to_jsonb(s.tone_tags),
        'status', s.status)
      ) order by s.created_at asc, s.template_id asc, s.variant_key asc),'[]'::jsonb),
    count(distinct s.material_key)
  into v_candidates, v_distinct
  from shaped s;

  -- 2. no candidate for the format → template gap (format_unmapped)
  if jsonb_array_length(v_candidates) = 0 then
    return jsonb_build_object('status','fail_closed','fail_reason','format_unmapped',
      'appetite',null,'candidates','[]'::jsonb,'ambiguous',false,'context',v_context);
  end if;

  -- 3. deterministic-candidate rule: collapse iff all viable candidates share one material_key.
  if v_distinct > 1 then
    return jsonb_build_object('status','ambiguous','fail_reason','ambiguous_asset_appetite',
      'appetite',null,'candidates',v_candidates,'ambiguous',true,'context',v_context);
  end if;

  -- unambiguous: the top (already deterministically ordered) candidate's appetite governs.
  v_top := v_candidates -> 0;
  return jsonb_build_object('status','ok','fail_reason',null,
    'appetite', v_top->'canonical_appetite',
    'candidate_template_id', v_top->>'template_id',
    'candidates', v_candidates, 'ambiguous', false, 'context', v_context);
end;
$$;

comment on function public.derive_asset_appetite(text,text,text,text) is
'cc-0042: read-only pre-governance asset-appetite projection. Reuses select_template''s candidate query (format_key match) MINUS governance filters, resolves effective TMR-4 tags (template overrides family within a namespace) + appetite columns, and collapses to ONE canonical appetite iff all viable candidates agree — else status=ambiguous / ambiguous_asset_appetite (do not source). No writes. Ships dark.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2 · public.resolve_shared_pool_assets — read-only shared-pool eligibility
--     Mirrors resolve_slot_assets posture over c.shared_creative_asset.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.resolve_shared_pool_assets(
  p_client_slug     text,
  p_platform        text,
  p_asset_kind      text,
  p_vertical_key    text,
  p_permitted_scopes text[],
  p_seed            text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
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

  -- No permitted scopes (e.g. client_only) → the shared pool is not consulted at all.
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
    -- (empty platform_scope '{}' = no restriction, mirrors the allowed_clients guard above)
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

  -- deterministic pick (rank #0; seed rotation deferred — richer scoring is a later tuning pass)
  return jsonb_build_object('status','ok','fail_reason',null,
    'selected', v_eligible -> 0, 'rejected', v_rejected, 'context', v_context);
end;
$$;

comment on function public.resolve_shared_pool_assets(text,text,text,text,text[],text) is
'cc-0042: read-only shared-pool eligibility evaluator over c.shared_creative_asset (mirrors resolve_slot_assets). Eligible iff is_active ∧ production_use_allowed ∧ scope∈permitted ∧ not purpose_bound ∧ multi-entity licence ∧ allow/exclude-client ∧ vertical match ∧ platform. Fail-closed with per-asset reason codes. No writes. Ships dark.';

-- ────────────────────────────────────────────────────────────────────────────
-- 3 · public.analyze_asset_gap — dual-axis verdict (the m.asset_gap_suggestion
--     contract shape, RETURNED not written). Composes derive + select_template
--     (routing) + independent two-source asset check (defeats governance masking).
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.analyze_asset_gap(
  p_client_slug text,
  p_platform    text,
  p_format      text,
  p_seed        text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_client_id  uuid;
  v_context    jsonb;
  v_derive     jsonb;
  v_appetite   jsonb;
  v_cand_tid   uuid;
  v_st         jsonb;              -- select_template routing verdict
  v_asset      jsonb;             -- independent resolve_slot_assets on the candidate
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
  v_sig_text   text;
  v_sig        text;
begin
  v_context := jsonb_build_object('client_slug',p_client_slug,'platform',p_platform,
    'format',p_format,'seed',p_seed,'appetite_policy_version','v1');

  select cl.client_id into v_client_id from c.client cl where cl.client_slug = p_client_slug;
  if not found then
    return jsonb_build_object('status','ok','primary_route','system_error','asset_gap_detected',false,
      'asset_gap_drainability','triage_only','why_needed','client_not_found','context',v_context);
  end if;

  -- pool policy (no row ⇒ client_only, fail-safe)
  select * into v_policy from c.client_asset_pool_policy where client_id = v_client_id;
  if found then
    v_pool_policy := v_policy.pool_policy;
    if v_policy.pool_policy in ('client_preferred','best_fit') then
      if v_policy.allow_vertical_shared then v_permitted := v_permitted || 'vertical_shared'; end if;
      if v_policy.allow_global_shared   then v_permitted := v_permitted || 'global_generic'; end if;
    end if;
  end if;
  v_pref_order := (array['client_scoped'] || v_permitted);       -- client-owned always preferred first
  -- sourcing_target_scope = what the harvester should SEEK for a MISS. v1: always source a CLIENT-scoped
  -- asset (directly resolves THIS client's gap, always usable, no multi-entity-rights burden). Targeting a
  -- shared scope is a later enhancement (needs the broader-rights decision); permitted/pref_order still
  -- record where we LOOKED across pools.
  v_target := 'client_scoped';

  -- 1. appetite (pre-governance, deterministic)
  v_derive := public.derive_asset_appetite(p_client_slug, p_platform, p_format, p_seed);

  -- ambiguous or missing appetite → template_gap (do not source)
  if (v_derive->>'status') = 'ambiguous' then
    v_sig := encode(extensions.digest(concat_ws('|', v_client_id::text, v_pool_policy, p_platform, p_format,
                    'ambiguous', (v_derive->'candidates')::text), 'sha256'),'hex');
    return jsonb_build_object('status','ok','primary_route','template_gap','asset_gap_detected',false,
      'asset_gap_drainability','blocked_by_template','why_needed','ambiguous_asset_appetite',
      'appetite_descriptor', v_derive, 'appetite_signature', v_sig,
      'client_pool_policy', v_pool_policy, 'permitted_governance_scopes', to_jsonb(v_permitted),
      'preferred_scope_order', to_jsonb(v_pref_order), 'sourcing_target_scope', v_target,
      'slot_kind','none', 'context', v_context);
  elsif (v_derive->>'status') = 'fail_closed' and (v_derive->>'fail_reason') = 'format_unmapped' then
    return jsonb_build_object('status','ok','primary_route','template_gap','asset_gap_detected',false,
      'asset_gap_drainability','blocked_by_template','why_needed','format_unmapped',
      'appetite_descriptor', v_derive, 'client_pool_policy', v_pool_policy, 'slot_kind','none','context',v_context);
  elsif (v_derive->>'status') = 'fail_closed' then
    return jsonb_build_object('status','ok','primary_route','system_error','asset_gap_detected',false,
      'asset_gap_drainability','triage_only','why_needed', v_derive->>'fail_reason','context',v_context);
  end if;

  -- ok: appetite resolved
  v_appetite := v_derive->'appetite';
  v_cand_tid := (v_derive->>'candidate_template_id')::uuid;
  v_slot_kind := coalesce(v_appetite->>'slot_kind','static_background');
  v_vertical  := v_appetite->>'vertical';

  -- 2. governance/template routing verdict from select_template (no writes)
  v_st := public.select_template(p_client_slug, p_platform, p_format, null, p_seed);
  if (v_st->>'status') = 'ok' then
    v_route := 'none';   -- template resolves WITH assets → no gap
  else
    -- classify select_template's failure: FIRST blocking gate wins the route
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
    elsif v_has_tmpl_reject and not v_has_gov_reject then v_route := 'template_gap';
    elsif v_has_gov_reject then v_route := 'governance_gap';
    elsif v_has_asset_reject or (v_st->>'fail_reason') like 'assets_fail_closed%' then v_route := 'asset_gap';
    else v_route := 'template_gap';
    end if;
  end if;

  -- select_template resolved WITH assets → the post is producible → no gap. The independent
  -- check below exists ONLY to defeat governance/template MASKING, so it runs only on failure.
  if v_route = 'none' then
    return jsonb_build_object('status','ok','primary_route','none','asset_gap_detected',false,
      'asset_gap_drainability','triage_only','why_needed',null,
      'appetite_descriptor', v_appetite, 'select_template_status','ok', 'context', v_context);
  end if;

  -- 3. INDEPENDENT asset check on the appetite's candidate (defeats governance masking)
  v_asset := public.resolve_slot_assets(p_client_slug, p_platform, p_format, v_cand_tid, p_seed);
  if (v_asset->>'status') = 'fail_closed'
     and (v_asset->>'fail_reason') in ('no_governed_background','missing_required_logo') then
    v_client_short := true;
    v_why := v_asset->>'fail_reason';
    if v_why = 'missing_required_logo' then v_slot_kind := 'logo'; end if;
  end if;

  -- 4. shared pool (only if the client pool missed a background AND policy permits shared)
  if v_client_short and v_why = 'no_governed_background'
     and v_slot_kind = 'static_background' and array_length(v_permitted,1) is not null then
    v_shared := public.resolve_shared_pool_assets(p_client_slug, p_platform, 'static_background', v_vertical, v_permitted, p_seed);
    v_shared_hit := ((v_shared->>'status') = 'ok');
  end if;

  v_detected := v_client_short and not v_shared_hit;

  -- 5. drainability (option (a): masked gaps recorded, not drained)
  if not v_detected then
    v_drain := 'triage_only';
  elsif v_route = 'governance_gap' then
    v_drain := 'blocked_by_governance';
  elsif v_route = 'template_gap' then
    v_drain := 'blocked_by_template';
  elsif v_route = 'asset_gap' and v_slot_kind = 'static_background' then
    v_drain := 'drainable';   -- assets short, governance ok → pure drainable asset gap
  else
    v_drain := 'triage_only';   -- logo / video_broll not drained by the background harvester
  end if;

  -- 6. client-specific appetite signature (Artifact B)
  v_sig_text := concat_ws('|', v_client_id::text, v_pool_policy, v_target, coalesce(v_vertical,'-'),
    coalesce(p_platform,'-'), p_format, v_slot_kind,
    coalesce(v_appetite->>'image_slot_min','-'), coalesce(v_appetite->>'image_slot_max','-'),
    coalesce(v_appetite->>'needs_governed_background','-'), coalesce(v_appetite->>'text_overlay_safe_required','-'),
    coalesce(v_appetite->>'aspect_ratio','-'),
    coalesce(v_appetite->>'use_case_tags','[]'), coalesce(v_appetite->>'tone_tags','[]'),
    'v1', 'v1');  -- asset_kind_version | appetite_policy_version
  v_sig := encode(extensions.digest(v_sig_text, 'sha256'), 'hex');

  return jsonb_build_object(
    'status','ok',
    'primary_route', v_route,
    'asset_gap_detected', v_detected,
    'asset_gap_drainability', v_drain,
    'slot_kind', v_slot_kind,
    'why_needed', coalesce(v_why, v_route),
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
$$;

comment on function public.analyze_asset_gap(text,text,text,text) is
'cc-0042: read-only dual-axis asset-gap verdict for a prepared post. Composes derive_asset_appetite (pre-governance appetite) + select_template (governance/template routing) + an INDEPENDENT two-source asset check (resolve_slot_assets over client assets + resolve_shared_pool_assets over the permitted shared pools per c.client_asset_pool_policy). Returns primary_route × asset_gap_detected/drainability + the m.asset_gap_suggestion contract shape — RETURNED, NOT WRITTEN. Masked gaps recorded (blocked_by_*), never drained. Ships dark.';

-- ── Grants: service-role-only; REVOKE from PUBLIC/anon/authenticated (ICE SECDEF trap) ──
revoke all on function public.derive_asset_appetite(text,text,text,text)                    from public, anon, authenticated;
revoke all on function public.resolve_shared_pool_assets(text,text,text,text,text[],text)   from public, anon, authenticated;
revoke all on function public.analyze_asset_gap(text,text,text,text)                        from public, anon, authenticated;
grant execute on function public.derive_asset_appetite(text,text,text,text)                 to service_role;
grant execute on function public.resolve_shared_pool_assets(text,text,text,text,text[],text) to service_role;
grant execute on function public.analyze_asset_gap(text,text,text,text)                     to service_role;

commit;

-- ============================================================================
-- ROLLBACK (reference only — NOT executed here):
--   DROP FUNCTION IF EXISTS public.analyze_asset_gap(text,text,text,text);
--   DROP FUNCTION IF EXISTS public.resolve_shared_pool_assets(text,text,text,text,text[],text);
--   DROP FUNCTION IF EXISTS public.derive_asset_appetite(text,text,text,text);
-- ============================================================================
