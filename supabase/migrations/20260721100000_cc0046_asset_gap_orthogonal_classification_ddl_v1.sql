-- cc-0046 — Orthogonal Gap Classification & Routing Precision — ARTIFACT 1 (DDL + helpers)
-- =============================================================================================
-- ⛔ DESIGN — NOT APPLIED. T3 PK apply gate (gate #1 of 3). Additive + DARK; zero legacy-column change.
-- Brief: docs/briefs/cc-0046-orthogonal-gap-classification-brief.md (rev-3, Gate-1 APPROVED d1ca6de)
--
-- CONTENTS (dependency order):
--   1. m.asset_gap_suggestion  — 6 additive/dark columns + 3 CHECKs + the sole-sourcing CHECK (#5)
--   2. public.asset_gap_route(subject, state)       — IMMUTABLE pair→route map (single source of truth)
--   3. public.asset_gap_automation(subject, state)  — IMMUTABLE pair→automation map
--   4. public.diagnose_gap(st, derive, probe, slot) — PURE (IMMUTABLE) decision matrix (D2/D2.1/D2.3)
--   5. public.probe_asset_inventory(client, vertical, slot) — read-only complete-inventory probe (D2.1/D2.2)
--   6. pair index (subject_kind, failure_state); grants (service-role-only)
--
-- POSTURE: pure fns IMMUTABLE; probe STABLE SECURITY DEFINER search_path=''; all revoke public/anon/
--   authenticated + grant execute to service_role (mirrors analyze_asset_gap / resolve_slot_assets).
-- Rollback: _harness/cc0046_ddl/rollback.sql
-- NOTE: applied via execute_sql at the T3 gate (apply_migration deny-listed); ledger backfilled with
--   THIS filename's fixed identity (no apply-time mint — Gate-1 #7).
-- =============================================================================================
begin;

-- ── 1. additive/dark columns + mechanical sole-sourcing protection (#5) ──────────────────────
alter table m.asset_gap_suggestion
  add column subject_kind        text
    check (subject_kind is null or subject_kind in
      ('static_background','logo','image','video_broll','template','assignment','platform_config','appetite','none')),
  add column failure_state       text
    check (failure_state is null or failure_state in
      ('absent','unassigned','unapproved','unproven','blocked','misconfigured','negative',
       'unsupported','ambiguous','unresolved','none')),
  add column classifier_version  text,
  add column diagnostic_evidence jsonb,
  add column diagnosed_at        timestamptz,
  add column evidence_confidence text
    check (evidence_confidence is null or evidence_confidence in ('conclusive','insufficient')),
  -- #5: the sole-sourcing pair (static_background, absent) can NEVER persist without conclusive evidence.
  add constraint gap_absent_static_bg_requires_conclusive
    check ( subject_kind  is distinct from 'static_background'
         or failure_state is distinct from 'absent'
         or evidence_confidence is not distinct from 'conclusive' );

comment on column m.asset_gap_suggestion.subject_kind is
  'cc-0046 orthogonal axis: WHAT the demand is about. Subject-free failure_state is the WHY. Route/automation derive from the (subject_kind, failure_state) pair via asset_gap_route/asset_gap_automation.';

-- ── 2. pair → remediation_route (IMMUTABLE single source; cannot drift) ──────────────────────
create or replace function public.asset_gap_route(p_subject text, p_state text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_subject is null or p_state is null then null
    when p_state = 'none' then null
    -- static_background: ONLY 'absent' is sourcing
    when p_subject='static_background' and p_state='absent'                           then 'governed_sourcing'
    when p_subject='static_background' and p_state in ('unapproved','unproven')        then 'operator_approval'
    when p_subject='static_background' and p_state in ('unassigned','misconfigured')   then 'config_repair'
    when p_subject='static_background'                                                then 'manual_triage'   -- blocked/unresolved/negative
    -- logo: never sourcing
    when p_subject='logo' and p_state in ('absent','unapproved','unproven')            then 'operator_approval'
    when p_subject='logo'                                                             then 'manual_triage'
    -- image / video_broll: out-of-scope subjects (never sourcing this lane)
    when p_subject in ('image','video_broll') and p_state='absent'                     then 'capability_backlog'
    when p_subject in ('image','video_broll') and p_state in ('unapproved','unproven')  then 'operator_approval'
    when p_subject in ('image','video_broll')                                         then 'manual_triage'
    -- template
    when p_subject='template' and p_state='unsupported'                               then 'capability_backlog'
    when p_subject='template' and p_state='absent'                                    then 'operator_template_build'
    when p_subject='template' and p_state='unproven'                                  then 'operator_approval'
    when p_subject='template' and p_state='misconfigured'                             then 'config_repair'
    when p_subject='template'                                                         then 'manual_triage'
    -- assignment
    when p_subject='assignment' and p_state='unassigned'                              then 'config_repair'
    when p_subject='assignment' and p_state in ('unapproved','unproven')               then 'operator_approval'
    when p_subject='assignment'                                                       then 'manual_triage'    -- blocked
    -- platform_config
    when p_subject='platform_config' and p_state='misconfigured'                      then 'config_repair'
    when p_subject='platform_config'                                                  then 'manual_triage'    -- negative
    -- appetite / none / anything else
    else 'manual_triage'
  end;
$$;

-- ── 3. pair → automation_class (IMMUTABLE; governed_auto_sourcing ONLY for (static_background,absent)) ──
create or replace function public.asset_gap_automation(p_subject text, p_state text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_subject is null or p_state is null                              then null
    when public.asset_gap_route(p_subject,p_state) is null                 then null
    when p_subject='static_background' and p_state='absent'                then 'governed_auto_sourcing'
    when public.asset_gap_route(p_subject,p_state) = 'capability_backlog'  then 'backlog'
    when public.asset_gap_route(p_subject,p_state) = 'manual_triage'       then 'no_automation'
    else 'operator_manual'
  end;
$$;

-- ── 4. PURE decision matrix (D2 least-blocked layer · D2.3 deterministic ties · D2.1 asset proof) ──
-- Inputs are the raw results of the evidence-gathering functions, so the ENTIRE decision matrix is
-- hermetically testable with synthetic jsonb (no schema needed). Returns:
--   { subject_kind, failure_state, evidence_confidence, diagnostic_evidence }
-- p_probe (probe_asset_inventory result) is consulted ONLY when the deepest layer is the asset layer.
create or replace function public.diagnose_gap(p_st jsonb, p_derive jsonb, p_probe jsonb, p_slot_kind text)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  v_fail        text := p_st->>'fail_reason';
  r             jsonb;
  v_code        text;
  v_detail      text;
  v_layer       int;
  v_max_layer   int := 0;
  v_subj        text;
  v_state       text;
  v_deep_pairs  jsonb := '[]'::jsonb;   -- distinct (subject|state) seen at the deepest NON-asset layer
  v_asset_subj  text;
  v_n_total     int;
  v_n_near      int;
  v_n_ungov     int;
  v_conc        boolean;
  v_evi         jsonb;
  v_pair        text;
begin
  -- 0. selectable ⇒ no gap
  if (p_st->>'status') = 'ok' then
    return jsonb_build_object('subject_kind','none','failure_state','none',
      'evidence_confidence','conclusive','diagnostic_evidence', jsonb_build_object('reason','select_template_ok'));
  end if;

  -- 1. top-level fail_reasons
  if v_fail = 'client_not_found' then
    return jsonb_build_object('subject_kind','none','failure_state','unresolved',
      'evidence_confidence','insufficient','diagnostic_evidence', jsonb_build_object('fail_reason',v_fail));
  elsif v_fail = 'format_unmapped' then
    -- Gate-1 #5: no known-formats registry ⇒ default UNSUPPORTED (never assume a build)
    return jsonb_build_object('subject_kind','template','failure_state','unsupported',
      'evidence_confidence','conclusive','diagnostic_evidence', jsonb_build_object('fail_reason',v_fail));
  end if;

  -- 2. no_selectable_template ⇒ diagnose from the DEEPEST candidate layer (D2)
  for r in select * from jsonb_array_elements(coalesce(p_st->'rejected','[]'::jsonb)) loop
    v_code := r->>'reason_code'; v_detail := r->>'detail'; v_subj := null; v_state := null;
    if v_code like 'assets_fail_closed%' then
      v_layer := 6;
    elsif v_code = 'not_visually_proven' then
      v_layer := 5; v_subj := 'assignment'; v_state := 'unproven';
    elsif v_code = 'no_assignment' then
      v_layer := 4; v_subj := 'assignment'; v_state := 'unassigned';
    elsif v_code = 'assignment_not_approved' then
      v_layer := 4; v_subj := 'assignment'; v_state := 'unapproved';
    elsif v_code = 'assignment_blocked' then
      v_layer := 4; v_subj := 'assignment'; v_state := 'blocked';
    elsif v_code = 'platform_unsuitable' then
      v_layer := 3; v_subj := 'platform_config';
      v_state := case when v_detail = 'suitability_status_negative' then 'negative' else 'misconfigured' end;
    elsif v_code = 'status_below_smoke' then
      v_layer := 2; v_subj := 'template'; v_state := 'unproven';
    elsif v_code = 'wrong_scope' then
      v_layer := 1; v_subj := 'template'; v_state := 'misconfigured';
    else
      v_layer := 0; v_subj := 'none'; v_state := 'unresolved';   -- unknown code (defensive)
    end if;

    if v_layer > v_max_layer then
      v_max_layer := v_layer;
      v_deep_pairs := case when v_layer = 6 then '[]'::jsonb
                           else jsonb_build_array(coalesce(v_subj,'?')||'|'||coalesce(v_state,'?')) end;
      -- track the asset-subject implied by the reject detail for layer 6
      if v_layer = 6 then
        v_asset_subj := case
          when v_code like '%missing_required_logo%' then 'logo'
          when v_code like '%no_governed_background%' then 'static_background'
          else coalesce(p_slot_kind,'static_background') end;
      end if;
    elsif v_layer = v_max_layer then
      if v_layer = 6 then
        v_pair := case
          when v_code like '%missing_required_logo%' then 'logo'
          when v_code like '%no_governed_background%' then 'static_background'
          else coalesce(p_slot_kind,'static_background') end;
        if v_pair is distinct from v_asset_subj then v_asset_subj := '__DIVERGENT__'; end if;
      else
        v_pair := coalesce(v_subj,'?')||'|'||coalesce(v_state,'?');
        if not (v_deep_pairs @> to_jsonb(v_pair)) then
          v_deep_pairs := v_deep_pairs || to_jsonb(v_pair);
        end if;
      end if;
    end if;
  end loop;

  v_evi := jsonb_build_object('fail_reason', v_fail, 'deepest_layer', v_max_layer,
             'deep_pairs', v_deep_pairs, 'asset_subject', v_asset_subj,
             'derive_status', p_derive->>'status', 'probe', p_probe);

  -- 2a. empty / unknown reject set ⇒ never guess
  if v_max_layer = 0 then
    return jsonb_build_object('subject_kind','none','failure_state','unresolved',
      'evidence_confidence','insufficient','diagnostic_evidence', v_evi);
  end if;

  -- 2b. NON-asset deepest layer: unanimity required (D2.3). Divergence ⇒ deterministic tie.
  if v_max_layer < 6 then
    if jsonb_array_length(v_deep_pairs) <> 1 then
      return jsonb_build_object('subject_kind','none','failure_state','unresolved',
        'evidence_confidence','insufficient','diagnostic_evidence', v_evi);
    end if;
    v_subj  := split_part(v_deep_pairs->>0,'|',1);
    v_state := split_part(v_deep_pairs->>0,'|',2);
    return jsonb_build_object('subject_kind',v_subj,'failure_state',v_state,
      'evidence_confidence','conclusive','diagnostic_evidence', v_evi);
  end if;

  -- 2c. ASSET deepest layer (D2.1). Appetite ambiguity is subordinate but blocks sourcing.
  if v_asset_subj = '__DIVERGENT__' then
    return jsonb_build_object('subject_kind','none','failure_state','unresolved',
      'evidence_confidence','insufficient','diagnostic_evidence', v_evi);
  end if;

  if (p_derive->>'status') = 'ambiguous' then
    return jsonb_build_object('subject_kind','appetite','failure_state','ambiguous',
      'evidence_confidence','conclusive','diagnostic_evidence', v_evi);
  elsif (p_derive->>'status') = 'fail_closed' then
    return jsonb_build_object('subject_kind','appetite','failure_state','unresolved',
      'evidence_confidence','insufficient','diagnostic_evidence', v_evi);
  end if;

  -- logo asset gap: NEVER sourcing; absent-vs-ungoverned indistinguishable ⇒ unresolved (#3)
  if v_asset_subj = 'logo' then
    if p_probe is null or (p_probe->>'coverage_conclusive')::boolean is not true then
      return jsonb_build_object('subject_kind','logo','failure_state','unresolved',
        'evidence_confidence','insufficient','diagnostic_evidence', v_evi);
    end if;
    v_n_total := coalesce((p_probe->>'n_inventory_total')::int, 0);
    v_n_near  := coalesce((p_probe->>'n_near_match')::int, 0);
    v_n_ungov := coalesce((p_probe->>'n_existing_ungoverned')::int, 0);
    if v_n_total = 0 then
      return jsonb_build_object('subject_kind','logo','failure_state','absent',
        'evidence_confidence','conclusive','diagnostic_evidence', v_evi);
    elsif v_n_ungov > 0 then
      return jsonb_build_object('subject_kind','logo','failure_state','unapproved',
        'evidence_confidence','conclusive','diagnostic_evidence', v_evi);
    else
      return jsonb_build_object('subject_kind','logo','failure_state','unresolved',
        'evidence_confidence','insufficient','diagnostic_evidence', v_evi);
    end if;
  end if;

  -- image / video_broll subjects (out of scope for sourcing)
  if v_asset_subj in ('image','video_broll') then
    return jsonb_build_object('subject_kind', v_asset_subj, 'failure_state','absent',
      'evidence_confidence','conclusive','diagnostic_evidence', v_evi);
  end if;

  -- static_background asset gap — the ONLY path that may yield 'absent' (#1/#2/#8)
  if p_probe is null or (p_probe->>'coverage_conclusive')::boolean is not true then
    return jsonb_build_object('subject_kind','static_background','failure_state','unresolved',
      'evidence_confidence','insufficient','diagnostic_evidence', v_evi);   -- never source on incomplete coverage
  end if;
  v_n_total := coalesce((p_probe->>'n_inventory_total')::int, 0);
  v_n_near  := coalesce((p_probe->>'n_near_match')::int, 0);
  v_n_ungov := coalesce((p_probe->>'n_existing_ungoverned')::int, 0);

  if v_n_total = 0 then
    -- genuine absence: complete universe empty AND coverage conclusive
    return jsonb_build_object('subject_kind','static_background','failure_state','absent',
      'evidence_confidence','conclusive','diagnostic_evidence', v_evi);
  elsif v_n_near > 0 then
    -- governed asset exists but a CONFIGURABLE fence blocks it here ⇒ config repair (not sourcing)
    return jsonb_build_object('subject_kind','static_background','failure_state','misconfigured',
      'evidence_confidence','conclusive','diagnostic_evidence', v_evi);
  elsif v_n_ungov > 0 then
    -- exists but fails a GOVERNANCE fence: classify by the dominant ungoverned reason
    v_state := coalesce(p_probe->>'dominant_ungoverned_state','unapproved');
    return jsonb_build_object('subject_kind','static_background','failure_state', v_state,
      'evidence_confidence','conclusive','diagnostic_evidence', v_evi);
  else
    -- exists, none classifiable as near/ungoverned (e.g. pool-policy-excluded eligible) ⇒ do not guess
    return jsonb_build_object('subject_kind','static_background','failure_state','unresolved',
      'evidence_confidence','insufficient','diagnostic_evidence', v_evi);
  end if;
end;
$$;

-- ── 5. read-only COMPLETE-inventory probe (D2.1/D2.2). Mirrors resolve_slot_assets' candidate
-- predicates but does NOT filter near-matches out — every relevant item is retained + classified.
-- coverage_conclusive is set false only when the slot kind is not inventory-probable here.
create or replace function public.probe_asset_inventory(p_client_slug text, p_vertical_key text, p_slot_kind text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_client_id   uuid;
  v_usage       text;            -- client_brand_asset.asset_meta->>'usage' for this slot
  v_pool_policy text := 'client_only';
  v_permitted   text[] := '{}';
  v_policy      record;
  v_n_total     int := 0;
  v_n_elig      int := 0;
  v_n_select    int := 0;
  v_n_near      int := 0;
  v_n_ungov     int := 0;
  v_breakdown   jsonb := '[]'::jsonb;
  v_dom_ungov   text := null;
  v_conc        boolean := true;
  r             record;
  v_gov_ok      boolean;
  v_reason      text;
  v_is_near     boolean;
begin
  select cl.client_id into v_client_id from c.client cl where cl.client_slug = p_client_slug;
  if not found then
    return jsonb_build_object('coverage_conclusive', false, 'reason','client_not_found');
  end if;

  -- only static_background and logo are inventory-probable in this lane
  v_usage := case p_slot_kind when 'static_background' then 'background' when 'logo' then 'logo' else null end;
  if v_usage is null then
    return jsonb_build_object('coverage_conclusive', false, 'reason','slot_kind_not_probable',
      'n_inventory_total', 0);
  end if;

  select * into v_policy from c.client_asset_pool_policy where client_id = v_client_id;
  if found then
    v_pool_policy := v_policy.pool_policy;
    if v_pool_policy in ('client_preferred','best_fit') then
      if v_policy.allow_vertical_shared then v_permitted := v_permitted || 'vertical_shared'::text; end if;
      if v_policy.allow_global_shared   then v_permitted := v_permitted || 'global_generic'::text;  end if;
    end if;
  end if;

  -- ── client_brand_asset candidates (mirror resolve_slot_assets §4 predicate) ──
  for r in
    select cba.asset_id, cba.is_active, cba.platform_scope,
           (cba.asset_meta->>'approved')          as approved_txt,
           cba.asset_meta->>'license_type'         as license_type,
           cba.asset_meta->>'license'              as license,
           cba.asset_meta->>'license_expires_at'   as license_expires_at,
           coalesce(cba.asset_meta->>'bucket','')  as bucket,
           cba.asset_meta->>'safe_for_text_overlay' as sfto
    from c.client_brand_asset cba
    where cba.client_id = v_client_id
      and cba.asset_meta->>'usage' = v_usage
  loop
    v_n_total := v_n_total + 1;
    v_gov_ok := true; v_reason := null; v_is_near := false;
    -- governance fences (intake/promotion state)
    if r.is_active is not true then v_gov_ok := false; v_reason := 'inactive';
    elsif (r.approved_txt)::boolean is not true then v_gov_ok := false; v_reason := 'not_approved';
    elsif r.license_type is null and r.license is null then v_gov_ok := false; v_reason := 'license_missing';
    elsif r.license_expires_at is not null and (r.license_expires_at)::timestamptz < now() then
      v_gov_ok := false; v_reason := 'license_expired';
    elsif r.bucket <> 'brand-assets' then v_gov_ok := false; v_reason := 'output_as_input_risk';
    elsif p_slot_kind = 'static_background' and (r.sfto is null or r.sfto = 'false' or r.sfto not in ('true','needs_scrim')) then
      v_gov_ok := false; v_reason := 'text_safety';
    end if;
    if v_gov_ok then
      v_n_elig := v_n_elig + 1; v_n_select := v_n_select + 1;   -- client assets are always in-scope (no pool gate)
    else
      -- client-owned: a governance fence ⇒ ungoverned. (platform_scope is not evaluated as a hard fence here.)
      v_n_ungov := v_n_ungov + 1;
      v_dom_ungov := coalesce(v_dom_ungov, case when v_reason in ('inactive','not_approved') then 'unapproved'
                                                when v_reason = 'text_safety' then 'unproven' else 'unapproved' end);
      v_breakdown := v_breakdown || jsonb_build_object('origin','client','fence','governance','reason',v_reason);
    end if;
  end loop;

  -- ── shared_creative_asset relevant universe (all states; near-matches retained) ──
  -- relevance = asset_kind matches slot AND (global_generic OR vertical_shared∩vertical). purpose_bound
  -- is retained (classified 'blocked'); excluded/allow-list/pool-policy/platform failures are near-matches.
  for r in
    select sa.id, sa.governance_scope, sa.vertical_key, sa.platform_scope,
           sa.is_active, sa.production_use_allowed, sa.purpose_bound,
           sa.licence_allows_multi_entity_use, sa.allowed_clients, sa.excluded_clients,
           sa.asset_meta->>'safe_for_text_overlay' as sfto
    from c.shared_creative_asset sa
    where sa.asset_kind = p_slot_kind
      and ( sa.governance_scope = 'global_generic'
            or (sa.governance_scope = 'vertical_shared' and sa.vertical_key is not distinct from p_vertical_key) )
  loop
    v_n_total := v_n_total + 1;
    v_reason := null; v_is_near := false; v_gov_ok := true;
    -- governance fences first (intake/promotion state)
    if r.is_active is not true then v_gov_ok := false; v_reason := 'inactive';
    elsif r.production_use_allowed is not true then v_gov_ok := false; v_reason := 'production_use_not_allowed';
    elsif r.purpose_bound is true then v_gov_ok := false; v_reason := 'purpose_bound';
    elsif r.licence_allows_multi_entity_use is not true then v_gov_ok := false; v_reason := 'licence_not_multi_entity';
    elsif p_slot_kind = 'static_background' and (r.sfto is null or r.sfto = 'false' or r.sfto not in ('true','needs_scrim')) then
      v_gov_ok := false; v_reason := 'text_safety';
    end if;

    if v_gov_ok then
      v_n_elig := v_n_elig + 1;
      -- configurable fences (near-match): excluded / not-allowlisted / pool-policy / platform
      if v_client_id = any(r.excluded_clients) then v_is_near := true; v_reason := 'client_excluded';
      elsif array_length(r.allowed_clients,1) is not null and v_client_id <> all(r.allowed_clients) then
        v_is_near := true; v_reason := 'not_in_allowlist';
      elsif r.governance_scope <> all(v_permitted) then
        v_is_near := true; v_reason := 'pool_policy_not_permitted';
      else
        v_n_select := v_n_select + 1;   -- resolve would actually reach it
      end if;
      if v_is_near then
        v_n_near := v_n_near + 1;
        v_breakdown := v_breakdown || jsonb_build_object('origin','shared','fence','configurable','reason',v_reason);
      end if;
    else
      v_n_ungov := v_n_ungov + 1;
      v_dom_ungov := coalesce(v_dom_ungov, case when r.purpose_bound then 'blocked'
                                                when v_reason in ('inactive','production_use_not_allowed') then 'unapproved'
                                                when v_reason = 'text_safety' then 'unproven' else 'unapproved' end);
      v_breakdown := v_breakdown || jsonb_build_object('origin','shared','fence','governance','reason',v_reason);
    end if;
  end loop;

  return jsonb_build_object(
    'coverage_conclusive', v_conc,
    'n_inventory_total', v_n_total,
    'n_currently_eligible', v_n_elig,
    'n_governed_selectable', v_n_select,
    'n_near_match', v_n_near,
    'n_existing_ungoverned', v_n_ungov,
    'dominant_ungoverned_state', v_dom_ungov,
    'near_match_breakdown', v_breakdown,
    'pool_policy', v_pool_policy,
    'vertical_key', p_vertical_key);
end;
$$;

-- ── 6. pair index + grants ───────────────────────────────────────────────────────────────────
create index asset_gap_suggestion_diag_pair_idx
  on m.asset_gap_suggestion (subject_kind, failure_state);

revoke all on function public.asset_gap_route(text,text)              from public, anon, authenticated;
revoke all on function public.asset_gap_automation(text,text)         from public, anon, authenticated;
revoke all on function public.diagnose_gap(jsonb,jsonb,jsonb,text)    from public, anon, authenticated;
revoke all on function public.probe_asset_inventory(text,text,text)   from public, anon, authenticated;
grant execute on function public.asset_gap_route(text,text)            to service_role;
grant execute on function public.asset_gap_automation(text,text)       to service_role;
grant execute on function public.diagnose_gap(jsonb,jsonb,jsonb,text)  to service_role;
grant execute on function public.probe_asset_inventory(text,text,text) to service_role;

commit;
