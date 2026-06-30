-- Migration: tmr_read_rpc_v1
-- TMR Read RPCs v1 — three read-only SECURITY DEFINER functions over the non-REST-exposed,
-- service-role-only schema `c` (the TMR registry created by 20260630042316_tmr3_template_metadata_registry):
--   1. public.get_tmr_template_list()
--   2. public.get_tmr_template_detail(p_provider_template_id uuid)
--   3. public.get_tmr_template_filters()
--
-- Read-only: SELECT-only, no data-modifying statements, no DDL beyond these three CREATE OR REPLACE
-- FUNCTION definitions + their EXECUTE revokes/grants + function comments. No helper function. No dynamic
-- SQL. No provider calls. No secrets / no raw payloads (jsonb cols surfaced as counts/labels/booleans only).
-- lifecycle_rollup and blocker_summary are INLINE CASE/jsonb expressions (no rollup/blocker helper
-- function). production_proven is encoded ONLY via a real platform_publish proof_event with proof_status =
-- 'passed'. Mirrors the proven GFCP/PPP Slice-1A SECURITY DEFINER posture.
--
-- Prepared by the TMR Read RPC apply hard-stop packet (register v4.48) AFTER the full gate chain passed:
--   db-rls-auditor (v4.43, 05d0631b…) + security-auditor (v4.44, 18815ae8…) CLEAN; external review v1
--   (v4.45) PARTIAL → packet revised to inline CASE (v4.46) → external review v2 (v4.47) CLEAN.
-- Reviewed v2 packet hash : 64b4a55a460cc6732e0df5b91918bda8f72dd83ddde6ae60143920b90275b5e3
-- v2 external review id    : 8e4e531e-8621-4ab3-99c8-57ffee21af76
-- Schema source of truth   : 20260630042316_tmr3_template_metadata_registry.sql (f6733fa7…)
--
-- ⛔ APPLY IS PK-GATED. This file is PREPARED, NOT APPLIED in this lane. Do not run it without explicit PK
--    apply approval (apply_migration, or execute_sql fallback + ledger backfill if harness-denied).

-- ── 1. public.get_tmr_template_list() ─────────────────────────────────────────────────
create or replace function public.get_tmr_template_list()
  returns jsonb
  language sql
  stable
  security definer
  set search_path to 'public, pg_temp'
as $$
  select jsonb_build_object(
    'contract_version', 'tmr_read_v1',
    'generated_at', now(),
    'rows', coalesce(jsonb_agg(row_obj order by (row_obj->>'provider_template_name')), '[]'::jsonb)
  )
  from (
    select jsonb_build_object(
      'provider_template_id', pt.id,
      'provider', pt.provider,
      'provider_template_name', pt.provider_template_name,
      'family_key', f.family_key,
      'family_label', f.family_name,
      'output_type', pt.output_type,
      'aspect_ratio', pt.aspect_ratio,
      'width', pt.width,
      'height', pt.height,
      'inventory_status', pt.inventory_status,

      -- ── INLINE lifecycle rollup (no helper) — conservative weakest-gate floor ──
      'lifecycle_rollup',
        case
          when roll.is_blocked              then 'blocked'
          when not roll.inv_captured        then 'inventory_missing'
          when not roll.has_fields          then 'inventory_incomplete'
          when roll.has_needs_edit          then 'needs_template_edit'
          when not roll.has_platform_any    then 'platform_unknown'
          when not roll.has_platform_safe   then 'platform_candidate'
          when not roll.has_assignment      then 'unassigned'
          when not roll.has_assignment_appr then 'assigned_candidate'
          when roll.has_publish_proof       then 'production_proven'
          else 'platform_safe'   -- highest VERIFIED intermediate; publish-proof absent ⇒ never 'production_proven'
        end,

      'strongest_variant_candidate',
        case when vc.variant_key is not null
             then jsonb_build_object('variant_key', vc.variant_key, 'fit_status', vc.fit_status)
             else null end,
      'variant_candidate_count', coalesce(vcc.cnt, 0),
      'platform_candidate_summary', coalesce(ps.summary, '[]'::jsonb),
      'client_assignment_summary', coalesce(ca.summary, '[]'::jsonb),

      -- ── INLINE blocker summary (no helper) — labels only ──
      'blocker_summary',
        coalesce((
          select jsonb_agg(b)
          from unnest(array[
            case when roll.is_blocked                              then 'blocked'                end,
            case when not roll.inv_captured                        then 'inventory_missing'      end,
            case when roll.inv_captured and not roll.has_fields    then 'fields_unmapped'         end,
            case when roll.has_needs_edit                          then 'needs_template_edit'    end,
            case when not roll.has_platform_any                    then 'platform_not_suitable'  end,
            case when not roll.has_render_proof                    then 'no_render_proof'         end,
            case when not roll.has_publish_proof                   then 'no_publish_proof'        end,
            case when not roll.has_assignment                      then 'unassigned'             end
          ]::text[]) as b
          where b is not null
        ), '[]'::jsonb),

      'proof_summary', coalesce(pe.summary, '[]'::jsonb),
      'last_audit_at', au.last_audit_at,
      'updated_at', pt.updated_at
    ) as row_obj
    from c.creative_provider_template pt
    left join c.creative_template_family f on f.id = pt.family_id

    -- strongest variant candidate (ranked, NOT proof) — single row
    left join lateral (
      select v.variant_key, v.fit_status
      from c.creative_template_variant_candidate v
      where v.template_id = pt.id
      order by case v.fit_status
                 when 'strong_candidate' then 1 when 'candidate' then 2
                 when 'weak_candidate' then 3 when 'needs_template_edit' then 4
                 when 'unsuitable' then 5 when 'blocked' then 6 else 7 end
      limit 1
    ) vc on true
    -- variant count (separate aggregate — avoids mixing aggregate + limit)
    left join lateral (
      select count(*) as cnt
      from c.creative_template_variant_candidate v2 where v2.template_id = pt.id
    ) vcc on true
    -- platform suitability summary (status per platform; NOT proof)
    left join lateral (
      select jsonb_agg(jsonb_build_object('platform', s.platform, 'placement', s.placement,
                                          'suitability_status', s.suitability_status)) as summary
      from c.creative_template_platform_suitability s where s.template_id = pt.id
    ) ps on true
    -- client assignment summary (scope+status; NOT enablement)
    left join lateral (
      select jsonb_agg(jsonb_build_object('client_id', a.client_id, 'assignment_scope', a.assignment_scope,
                                          'assignment_status', a.assignment_status)) as summary
      from c.creative_template_client_assignment a where a.template_id = pt.id
    ) ca on true
    -- proof summary: counts by type/status ONLY (no payload, no evidence body)
    left join lateral (
      select jsonb_agg(jsonb_build_object('proof_type', pe2.proof_type, 'proof_status', pe2.proof_status,
                                          'n', pe2.n)) as summary
      from (
        select proof_type, proof_status, count(*) as n
        from c.creative_template_proof_event where template_id = pt.id
        group by proof_type, proof_status
      ) pe2
    ) pe on true
    -- last audit timestamp
    left join lateral (
      select max(captured_at) as last_audit_at
      from c.creative_template_inventory_audit where template_id = pt.id
    ) au on true

    -- ── INLINE rollup/blocker signal set (read-only EXISTS; no helper fn, no dynamic SQL) ──
    left join lateral (
      select
        (pt.inventory_status in ('captured_from_docs','captured_from_provider_read',
                                 'captured_from_manual_entry','captured_from_render_probe','verified'))
                                                                                    as inv_captured,
        (pt.status = 'blocked' or pt.inventory_status = 'blocked')                  as is_blocked,
        exists(select 1 from c.creative_provider_template_field fld
                 where fld.template_id = pt.id)                                     as has_fields,
        exists(select 1 from c.creative_template_variant_candidate vn
                 where vn.template_id = pt.id and vn.fit_status = 'needs_template_edit')
                                                                                    as has_needs_edit,
        exists(select 1 from c.creative_template_platform_suitability sp
                 where sp.template_id = pt.id
                   and sp.suitability_status in ('candidate','needs_review','platform_safe','production_proven'))
                                                                                    as has_platform_any,
        exists(select 1 from c.creative_template_platform_suitability sq
                 where sq.template_id = pt.id
                   and sq.suitability_status in ('platform_safe','production_proven'))
                                                                                    as has_platform_safe,
        exists(select 1 from c.creative_template_client_assignment ag
                 where ag.template_id = pt.id
                   and ag.assignment_status <> 'blocked'
                   and ag.assignment_scope <> 'client_blocked')                     as has_assignment,
        exists(select 1 from c.creative_template_client_assignment ah
                 where ah.template_id = pt.id
                   and ah.assignment_status in ('approved','visually_approved','client_enabled','production_proven'))
                                                                                    as has_assignment_appr,
        exists(select 1 from c.creative_template_proof_event pr
                 where pr.template_id = pt.id
                   and pr.proof_type = 'platform_render' and pr.proof_status = 'passed')
                                                                                    as has_render_proof,
        exists(select 1 from c.creative_template_proof_event pp
                 where pp.template_id = pt.id
                   and pp.proof_type = 'platform_publish' and pp.proof_status = 'passed')
                                                                                    as has_publish_proof
    ) roll on true
  ) s;
$$;
comment on function public.get_tmr_template_list() is 'TMR read RPC: one sanitized row per provider template (inline lifecycle_rollup/blocker_summary; counts/labels only; no payloads). SECURITY DEFINER, service-role-only EXECUTE.';

-- ── 2. public.get_tmr_template_detail(p_provider_template_id uuid) ─────────────────────
create or replace function public.get_tmr_template_detail(p_provider_template_id uuid)
  returns jsonb
  language sql
  stable
  security definer
  set search_path to 'public, pg_temp'
as $$
  select coalesce(
    (select jsonb_build_object(
       'contract_version', 'tmr_read_v1',
       'identity', jsonb_build_object('provider_template_id', pt.id, 'provider', pt.provider,
                                      'provider_template_name', pt.provider_template_name,
                                      'output_type', pt.output_type, 'aspect_ratio', pt.aspect_ratio,
                                      'width', pt.width, 'height', pt.height,
                                      'inventory_status', pt.inventory_status, 'status', pt.status),
       'family', (select jsonb_build_object('family_key', f.family_key, 'family_name', f.family_name,
                                            'scope', f.scope, 'creative_purpose', f.creative_purpose)
                  from c.creative_template_family f where f.id = pt.family_id),
       'output_contract', jsonb_build_object('output_type', pt.output_type, 'aspect_ratio', pt.aspect_ratio,
                                             'width', pt.width, 'height', pt.height,
                                             'duration_seconds', pt.duration_seconds,
                                             'file_type_candidate', pt.file_type_candidate),
       'field_inventory', (select jsonb_agg(jsonb_build_object('element_name', x.element_name,
                              'field_kind', x.field_kind, 'dynamic', x.dynamic,
                              'required_for_render', x.required_for_render,
                              'has_default', (x.default_value_safe is not null))
                              order by x.element_name)
                           from c.creative_provider_template_field x where x.template_id = pt.id),
       'platform_suitability', (select jsonb_agg(jsonb_build_object('platform', s.platform,
                              'placement', s.placement, 'suitability_status', s.suitability_status,
                              'reason', s.reason, 'last_reviewed_at', s.last_reviewed_at))
                           from c.creative_template_platform_suitability s where s.template_id = pt.id),
       'variant_candidates', (select jsonb_agg(jsonb_build_object('variant_key', v.variant_key,
                              'fit_status', v.fit_status,
                              'required_field_mapping_status', v.required_field_mapping_status,
                              -- JSONB GUARD: only call jsonb_array_length when it is actually an array
                              'missing_field_count',
                                case when jsonb_typeof(v.missing_fields) = 'array'
                                     then jsonb_array_length(v.missing_fields) else 0 end))
                           from c.creative_template_variant_candidate v where v.template_id = pt.id),
       'client_assignments', (select jsonb_agg(jsonb_build_object('client_id', a.client_id,
                              'assignment_scope', a.assignment_scope, 'assignment_status', a.assignment_status,
                              'style_guide_reference', a.style_guide_reference, 'approved_at', a.approved_at))
                           from c.creative_template_client_assignment a where a.template_id = pt.id),
       'proof_events', (select jsonb_agg(jsonb_build_object('proof_type', e.proof_type,
                              'proof_status', e.proof_status, 'evidence_reference_type', e.evidence_kind,
                              'evidence_reference_id', e.evidence_reference, 'occurred_at', e.occurred_at))
                           from c.creative_template_proof_event e where e.template_id = pt.id),
       'audit', (select jsonb_agg(jsonb_build_object('capture_method', au.capture_method,
                              'captured_at', au.captured_at, 'inventory_hash', au.inventory_hash,
                              'no_secret_assertion', au.no_secret_assertion,
                              'no_mutation_assertion', au.no_mutation_assertion)
                              order by au.captured_at desc)
                           from c.creative_template_inventory_audit au where au.template_id = pt.id)
     )
     from c.creative_provider_template pt where pt.id = p_provider_template_id),
    jsonb_build_object('not_found', true)
  );
$$;
comment on function public.get_tmr_template_detail(uuid) is 'TMR read RPC: full sanitized detail for one provider template by id (provenance ids only; no raw payloads). Unknown id ⇒ {not_found:true}. SECURITY DEFINER, service-role-only EXECUTE.';

-- ── 3. public.get_tmr_template_filters() ──────────────────────────────────────────────
create or replace function public.get_tmr_template_filters()
  returns jsonb
  language sql
  stable
  security definer
  set search_path to 'public, pg_temp'
as $$
  select jsonb_build_object(
    'providers',  (select coalesce(jsonb_agg(distinct provider), '[]'::jsonb) from c.creative_provider_template),
    'families',   (select coalesce(jsonb_agg(distinct family_key), '[]'::jsonb) from c.creative_template_family),
    'output_types', to_jsonb(array['static_image','animated_image','video','audio','unknown']),
    'platforms',  (select coalesce(jsonb_agg(distinct platform), '[]'::jsonb) from c.creative_template_platform_suitability),
    'suitability_statuses', to_jsonb(array['unknown','candidate','not_suitable','needs_review','platform_safe','production_proven','blocked']),
    'variant_statuses', to_jsonb(array['unknown','candidate','strong_candidate','weak_candidate','needs_template_edit','unsuitable','blocked']),
    'client_scope_types', to_jsonb(array['generic_allowed','brand_allowed','client_allowed','client_blocked','pilot_only']),
    'lifecycle_statuses', to_jsonb(array['discovered','inventory_requested','inventory_captured','inventory_verified','classified','field_mapped','governance_reviewed','smoke_rendered','visually_approved','platform_safe','client_enabled','production_proven','deprecated','blocked'])
  );
$$;
comment on function public.get_tmr_template_filters() is 'TMR read RPC: safe filter vocabulary (distinct existing values + static CHECK enum sets). Empty registry ⇒ empty distinct arrays + static vocab. SECURITY DEFINER, service-role-only EXECUTE.';

-- ── Grants: service-role-only EXECUTE ─────────────────────────────────────────────────
-- Revoking from PUBLIC alone is insufficient on Supabase — name anon, authenticated explicitly.
revoke execute on function public.get_tmr_template_list()       from public, anon, authenticated;
revoke execute on function public.get_tmr_template_detail(uuid) from public, anon, authenticated;
revoke execute on function public.get_tmr_template_filters()    from public, anon, authenticated;
grant  execute on function public.get_tmr_template_list()       to service_role;
grant  execute on function public.get_tmr_template_detail(uuid) to service_role;
grant  execute on function public.get_tmr_template_filters()    to service_role;

-- ── ROLLBACK (reference only — NOT executed by this migration) ─────────────────────────
--   drop function if exists public.get_tmr_template_list();
--   drop function if exists public.get_tmr_template_detail(uuid);
--   drop function if exists public.get_tmr_template_filters();
