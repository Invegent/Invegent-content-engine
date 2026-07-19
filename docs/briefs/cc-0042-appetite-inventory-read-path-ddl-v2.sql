-- ============================================================================
-- cc-0042 — Asset appetite/inventory read-path — CANDIDATE SQL v2 (fix-forward)
-- ⛔ PREPARED — NOT APPLIED.  Apply is a PK-gated stop (T2). Ships DARK.
-- ============================================================================
-- Supersedes v1 (applied 20260719170000) after its read-only smoke exposed 3 defects
-- on real data. CREATE OR REPLACE of derive_asset_appetite + analyze_asset_gap ONLY
-- (resolve_shared_pool_assets is unchanged — not re-emitted). Same security posture:
-- SECURITY DEFINER · STABLE · SET search_path='' · schema-qualified · service_role-only.
--
-- WHY v2 (smoke findings on v1):
--   [F1] The TMR-4 appetite COLUMNS (image_slot_min/max, needs_governed_background,
--        text_overlay_safe_required) are UNPOPULATED on live templates (all NULL) —
--        v1 read inert columns (declared-control-not-consulted). FIX: derive the real
--        appetite from the template's DYNAMIC SLOTS (c.creative_provider_template_field:
--        field_kind background/logo/image, dynamic=true) — the same source
--        resolve_slot_assets trusts. needs_governed_background := has a dynamic background slot.
--   [F2] aspect_ratio drove false ambiguity (1:1 vs 4:5 vs 1.91:1 are platform variants of
--        one card, not an appetite difference). FIX: drop aspect_ratio from material_key.
--   [F3] appetite-ambiguity PREEMPTED the no-gap determination — a producible post
--        (select_template=ok) was wrongly flagged template_gap. FIX: analyze_asset_gap now
--        checks select_template FIRST (no-gap short-circuit); appetite/ambiguity only matter
--        on the sourcing path. Ambiguity → asset_gap_drainability='blocked_by_template'
--        (don't source until template intent resolves) WITHOUT lying about primary_route
--        (which stays select_template's honest verdict: governance/template/asset).
--
-- Verified (project mbkmaxqhsohbtwsqolns, read-only): c.creative_provider_template_field
--   (template_id, field_kind ∈ background/logo/image/shape/text, dynamic bool, required_for_render).
--   PP image_quote: 12 candidates, 10 have a dynamic background slot, 2 do not.
--
-- ROLLBACK (reference only — reverts to v1 by re-applying v1, or drop):
--   DROP FUNCTION IF EXISTS public.analyze_asset_gap(text,text,text,text);
--   DROP FUNCTION IF EXISTS public.derive_asset_appetite(text,text,text,text);
-- ============================================================================

begin;

-- ────────────────────────────────────────────────────────────────────────────
-- 1 · public.derive_asset_appetite — v2: appetite from REAL dynamic slots
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
    'appetite_policy_version', 'v2', 'asset_kind_version', 'v1',
    'appetite_source', 'dynamic_slots');

  select cl.client_id into v_client_id from c.client cl where cl.client_slug = p_client_slug;
  if not found then
    return jsonb_build_object('status','fail_closed','fail_reason','client_not_found',
      'appetite',null,'candidate_template_id',null,'candidates','[]'::jsonb,'ambiguous',false,'context',v_context);
  end if;

  with cand as (
    select t.id as template_id, t.family_id, t.aspect_ratio, t.created_at, t.status,
           t.image_slot_min, t.image_slot_max, t.needs_governed_background as ngb_col, t.text_overlay_safe_required as tos_col,
           vc.variant_key, vc.fit_status,
           -- v2: REAL appetite from dynamic slots (same source as resolve_slot_assets)
           coalesce((select bool_or(f.field_kind='background' and f.dynamic)
                     from c.creative_provider_template_field f where f.template_id = t.id), false) as has_bg,
           coalesce((select bool_or(f.field_kind='logo' and f.dynamic)
                     from c.creative_provider_template_field f where f.template_id = t.id), false) as has_logo,
           coalesce((select count(*) from c.creative_provider_template_field f
                     where f.template_id = t.id and f.field_kind='image' and f.dynamic), 0)::int as n_image
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
      case when eff.length_class_tags && array['short_video','standard_short_video','long_video']
             then (case when eff.has_bg then 'video_broll' else 'none' end)
           when eff.has_bg then 'static_background'
           else 'none' end as slot_kind,
      -- material_key v2: real slots + slot_kind. NO aspect_ratio, NO inert TMR-4 columns.
      concat_ws('|', eff.has_bg::text, eff.has_logo::text, (eff.n_image > 0)::text,
        case when eff.length_class_tags && array['short_video','standard_short_video','long_video']
               then (case when eff.has_bg then 'video_broll' else 'none' end)
             when eff.has_bg then 'static_background' else 'none' end
      ) as material_key
    from eff
    where eff.fit_status is distinct from 'unsuitable' and eff.fit_status is distinct from 'blocked'
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'template_id', s.template_id, 'family_id', s.family_id, 'variant_key', s.variant_key,
      'fit_status', s.fit_status, 'material_key', s.material_key,
      'canonical_appetite', jsonb_build_object(
        'needs_governed_background', s.has_bg,          -- DERIVED from a real dynamic slot (v2)
        'needs_logo', s.has_logo,
        'n_image_slots', s.n_image,
        'slot_kind', s.slot_kind,
        'aspect_ratio', s.aspect_ratio,                  -- reference only (NOT in material_key)
        'vertical', case when array_length(s.vertical_tags,1) is null then null else s.vertical_tags[1] end,
        'use_case_tags', to_jsonb(s.use_case_tags), 'tone_tags', to_jsonb(s.tone_tags),
        'length_class', case when array_length(s.length_class_tags,1) is null then null else s.length_class_tags[1] end,
        'tmr4_columns', jsonb_build_object('image_slot_min', s.image_slot_min, 'image_slot_max', s.image_slot_max,
                          'needs_governed_background_col', s.ngb_col, 'text_overlay_safe_required_col', s.tos_col),
        'status', s.status)
      ) order by s.created_at asc, s.template_id asc, s.variant_key asc),'[]'::jsonb),
    count(distinct s.material_key)
  into v_candidates, v_distinct
  from shaped s;

  if jsonb_array_length(v_candidates) = 0 then
    return jsonb_build_object('status','fail_closed','fail_reason','format_unmapped',
      'appetite',null,'candidate_template_id',null,'candidates','[]'::jsonb,'ambiguous',false,'context',v_context);
  end if;

  -- v2: always expose a representative top candidate (deterministically ordered), even when ambiguous.
  v_top := v_candidates -> 0;
  if v_distinct > 1 then
    return jsonb_build_object('status','ambiguous','fail_reason','ambiguous_asset_appetite',
      'appetite', v_top->'canonical_appetite', 'candidate_template_id', v_top->>'template_id',
      'candidates', v_candidates, 'ambiguous', true, 'context', v_context);
  end if;
  return jsonb_build_object('status','ok','fail_reason',null,
    'appetite', v_top->'canonical_appetite', 'candidate_template_id', v_top->>'template_id',
    'candidates', v_candidates, 'ambiguous', false, 'context', v_context);
end;
$$;

comment on function public.derive_asset_appetite(text,text,text,text) is
'cc-0042 v2: read-only pre-governance asset-appetite projection. Derives the REAL appetite from the template''s DYNAMIC SLOTS (c.creative_provider_template_field: background/logo/image) — NOT the unpopulated TMR-4 appetite columns — plus effective TMR-4 tags (template overrides family). material_key = has_bg/has_logo/has_image/slot_kind (aspect_ratio & inert columns excluded). Collapses to one canonical appetite iff all viable candidates agree; else status=ambiguous (still returns a representative top candidate). No writes. Ships dark.';

-- ────────────────────────────────────────────────────────────────────────────
-- 3 · public.analyze_asset_gap — v2: select_template FIRST (no-gap), then appetite
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
      if v_policy.allow_vertical_shared then v_permitted := v_permitted || 'vertical_shared'; end if;
      if v_policy.allow_global_shared   then v_permitted := v_permitted || 'global_generic'; end if;
    end if;
  end if;
  v_pref_order := (array['client_scoped'] || v_permitted);
  v_target := 'client_scoped';

  -- 1. select_template FIRST (F3 fix): a producible post has no gap, regardless of appetite.
  v_st := public.select_template(p_client_slug, p_platform, p_format, null, p_seed);
  if (v_st->>'status') = 'ok' then
    return jsonb_build_object('status','ok','primary_route','none','asset_gap_detected',false,
      'asset_gap_drainability','triage_only','why_needed',null,
      'select_template_status','ok','context',v_context);
  end if;

  -- 2. classify the honest remediation route from select_template's failure (FIRST blocking gate).
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
  elsif v_has_gov_reject then v_route := 'governance_gap';       -- governance masks assets: precedence over asset
  elsif v_has_tmpl_reject then v_route := 'template_gap';
  elsif v_has_asset_reject or (v_st->>'fail_reason') like 'assets_fail_closed%' then v_route := 'asset_gap';
  else v_route := 'template_gap';
  end if;

  -- 3. appetite (for the sourcing descriptor + candidate + slot_kind + ambiguity flag).
  v_derive := public.derive_asset_appetite(p_client_slug, p_platform, p_format, p_seed);
  if (v_derive->>'status') = 'fail_closed' then
    -- no viable candidate for the format → template gap; cannot source.
    return jsonb_build_object('status','ok','primary_route','template_gap','asset_gap_detected',false,
      'asset_gap_drainability','blocked_by_template','why_needed', v_derive->>'fail_reason',
      'appetite_descriptor', v_derive, 'client_pool_policy', v_pool_policy, 'slot_kind','none','context',v_context);
  end if;
  v_appetite  := v_derive->'appetite';
  v_cand_tid  := (v_derive->>'candidate_template_id')::uuid;
  v_slot_kind := coalesce(v_appetite->>'slot_kind','static_background');
  v_vertical  := v_appetite->>'vertical';
  v_ambiguous := (v_derive->>'status') = 'ambiguous';

  -- 4. INDEPENDENT asset check on the representative candidate (defeats governance masking).
  v_asset := public.resolve_slot_assets(p_client_slug, p_platform, p_format, v_cand_tid, p_seed);
  if (v_asset->>'status') = 'fail_closed'
     and (v_asset->>'fail_reason') in ('no_governed_background','missing_required_logo') then
    v_client_short := true;
    v_why := v_asset->>'fail_reason';
    if v_why = 'missing_required_logo' then v_slot_kind := 'logo'; end if;
  end if;

  -- 5. shared pool (only if the client pool missed a BACKGROUND and policy permits shared).
  if v_client_short and v_why = 'no_governed_background'
     and v_slot_kind = 'static_background' and array_length(v_permitted,1) is not null then
    v_shared := public.resolve_shared_pool_assets(p_client_slug, p_platform, 'static_background', v_vertical, v_permitted, p_seed);
    v_shared_hit := ((v_shared->>'status') = 'ok');
  end if;

  v_detected := v_client_short and not v_shared_hit;

  -- 6. drainability (option (a)). primary_route stays select_template's honest verdict;
  --    ambiguity only blocks SOURCING (blocked_by_template), it does not rewrite the route.
  if not v_detected then
    v_drain := 'triage_only';
  elsif v_ambiguous then
    v_drain := 'blocked_by_template';                  -- can't source precisely until template intent resolves
  elsif v_route = 'governance_gap' then
    v_drain := 'blocked_by_governance';
  elsif v_route = 'template_gap' then
    v_drain := 'blocked_by_template';
  elsif v_route = 'asset_gap' and v_slot_kind = 'static_background' then
    v_drain := 'drainable';
  else
    v_drain := 'triage_only';                          -- logo / video_broll not drained by the bg harvester
  end if;

  -- 7. client-specific appetite signature (Artifact B; v2 fields).
  v_sig_text := concat_ws('|', v_client_id::text, v_pool_policy, v_target, coalesce(v_vertical,'-'),
    coalesce(p_platform,'-'), p_format, v_slot_kind,
    coalesce(v_appetite->>'needs_governed_background','-'), coalesce(v_appetite->>'needs_logo','-'),
    coalesce(v_appetite->>'n_image_slots','-'),
    coalesce(v_appetite->>'use_case_tags','[]'), coalesce(v_appetite->>'tone_tags','[]'),
    'v1', 'v2');  -- asset_kind_version | appetite_policy_version
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
$$;

comment on function public.analyze_asset_gap(text,text,text,text) is
'cc-0042 v2: read-only dual-axis asset-gap verdict. select_template FIRST (producible post ⇒ primary_route=none, no gap); on failure, classify the honest route (governance/template/asset) then derive appetite (from real dynamic slots) + run the INDEPENDENT two-source asset check (resolve_slot_assets + resolve_shared_pool_assets per policy). Ambiguous appetite blocks SOURCING (drainability=blocked_by_template) without rewriting primary_route. Returns the m.asset_gap_suggestion contract shape — RETURNED, NOT WRITTEN. Ships dark.';

-- ── Grants re-asserted (CREATE OR REPLACE preserves ACL; belt-and-suspenders for the SECDEF trap) ──
revoke all on function public.derive_asset_appetite(text,text,text,text) from public, anon, authenticated;
revoke all on function public.analyze_asset_gap(text,text,text,text)     from public, anon, authenticated;
grant execute on function public.derive_asset_appetite(text,text,text,text) to service_role;
grant execute on function public.analyze_asset_gap(text,text,text,text)     to service_role;

commit;

-- ============================================================================
-- ROLLBACK (reference only): re-apply v1, or
--   DROP FUNCTION IF EXISTS public.analyze_asset_gap(text,text,text,text);
--   DROP FUNCTION IF EXISTS public.derive_asset_appetite(text,text,text,text);
-- ============================================================================
