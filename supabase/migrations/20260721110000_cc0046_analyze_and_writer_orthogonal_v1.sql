-- cc-0046 — Orthogonal Gap Classification & Routing Precision — ARTIFACT 2 (function replacement)
-- =============================================================================================
-- ⛔ DESIGN — NOT APPLIED. T3 PK apply gate (gate #2 of 3). Depends on Artifact 1 (helpers + columns).
-- Brief: docs/briefs/cc-0046-orthogonal-gap-classification-brief.md (rev-3, Gate-1 APPROVED d1ca6de)
--
-- ADDITIVE-ONLY to analyze_asset_gap: every LEGACY output key keeps its exact expression; the change
--   adds new declares (v_probe/v_diag) + appends the orthogonal classification keys to each RETURN +
--   computes probe_asset_inventory on the asset-fail path. Proven additive by the old↔new body diff
--   (_harness/cc0046_hermetic/analyze_body.diff — purely + lines).
-- run_asset_gap_analysis: persists the 6 new columns on INSERT + ON CONFLICT UPDATE. Fail-closed
--   validation UNCHANGED (no new key can reject a today-valid row).
-- Rollback: _harness/cc0046_ddl/rollback_functions.sql (byte-exact prior bodies, captured from
--   migrations 20260720160000 [analyze] + 20260720190000 [writer]).
-- NOTE: applied via execute_sql at the T3 gate; ledger backfilled with this filename's fixed identity.
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
  -- cc-0046 additive-only: orthogonal classification (all legacy declares above are unchanged)
  v_probe      jsonb;
  v_diag       jsonb;
begin
  v_context := jsonb_build_object('client_slug',p_client_slug,'platform',p_platform,
    'format',p_format,'seed',p_seed,'appetite_policy_version','v2');

  select cl.client_id into v_client_id from c.client cl where cl.client_slug = p_client_slug;
  if not found then
    v_diag := public.diagnose_gap(null::jsonb, null::jsonb, null::jsonb, null::text);
    return jsonb_build_object('status','ok','primary_route','system_error','asset_gap_detected',false,
      'asset_gap_drainability','triage_only','why_needed','client_not_found','context',v_context,
      'subject_kind', v_diag->>'subject_kind', 'failure_state', v_diag->>'failure_state',
      'remediation_route', public.asset_gap_route(v_diag->>'subject_kind', v_diag->>'failure_state'),
      'automation_class', public.asset_gap_automation(v_diag->>'subject_kind', v_diag->>'failure_state'),
      'evidence_confidence', v_diag->>'evidence_confidence',
      'candidate_governance_posture', 'not_applicable',
      'diagnostic_evidence', v_diag->'diagnostic_evidence');
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
    v_diag := public.diagnose_gap(v_st, null::jsonb, null::jsonb, null::text);
    return jsonb_build_object('status','ok','primary_route','none','asset_gap_detected',false,
      'asset_gap_drainability','triage_only','why_needed',null,
      'select_template_status','ok','context',v_context,
      'subject_kind', v_diag->>'subject_kind', 'failure_state', v_diag->>'failure_state',
      'remediation_route', public.asset_gap_route(v_diag->>'subject_kind', v_diag->>'failure_state'),
      'automation_class', public.asset_gap_automation(v_diag->>'subject_kind', v_diag->>'failure_state'),
      'evidence_confidence', v_diag->>'evidence_confidence',
      'candidate_governance_posture', 'not_applicable',
      'diagnostic_evidence', v_diag->'diagnostic_evidence');
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
    v_diag := public.diagnose_gap(v_st, v_derive, null::jsonb, null::text);
    return jsonb_build_object('status','ok','primary_route','template_gap','asset_gap_detected',false,
      'asset_gap_drainability','blocked_by_template','why_needed', v_derive->>'fail_reason',
      'appetite_descriptor', v_derive, 'client_pool_policy', v_pool_policy, 'slot_kind','none','context',v_context,
      'subject_kind', v_diag->>'subject_kind', 'failure_state', v_diag->>'failure_state',
      'remediation_route', public.asset_gap_route(v_diag->>'subject_kind', v_diag->>'failure_state'),
      'automation_class', public.asset_gap_automation(v_diag->>'subject_kind', v_diag->>'failure_state'),
      'evidence_confidence', v_diag->>'evidence_confidence',
      'candidate_governance_posture', 'not_applicable',
      'diagnostic_evidence', v_diag->'diagnostic_evidence');
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

  -- cc-0046 additive: run the complete-inventory probe ONLY on the asset-fail path (D2.1/D2.2),
  -- then the pure orthogonal diagnosis. Legacy keys below are unchanged.
  v_probe := case when v_client_short and v_slot_kind in ('static_background','logo')
                  then public.probe_asset_inventory(p_client_slug, v_vertical, v_slot_kind)
                  else null end;
  v_diag  := public.diagnose_gap(v_st, v_derive, v_probe, v_slot_kind);

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
    'context', v_context,
    -- cc-0046 additive orthogonal classification keys (legacy keys above unchanged) --
    'subject_kind', v_diag->>'subject_kind',
    'failure_state', v_diag->>'failure_state',
    'remediation_route', public.asset_gap_route(v_diag->>'subject_kind', v_diag->>'failure_state'),
    'automation_class', public.asset_gap_automation(v_diag->>'subject_kind', v_diag->>'failure_state'),
    'evidence_confidence', v_diag->>'evidence_confidence',
    'candidate_governance_posture',
      case when public.asset_gap_route(v_diag->>'subject_kind', v_diag->>'failure_state') = 'governed_sourcing'
           then 'fenced_until_approved' else 'not_applicable' end,
    'diagnostic_evidence', v_diag->'diagnostic_evidence');
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
              analyzer_version, inventory_policy_version,
              subject_kind, failure_state, classifier_version, diagnostic_evidence, diagnosed_at, evidence_confidence
            ) values (
              v_sig, v_client, v_g->>'client_pool_policy',
              (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(coalesce(v_g->'permitted_governance_scopes','[]'::jsonb)) x),
              (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(coalesce(v_g->'preferred_scope_order','[]'::jsonb)) x),
              v_g->>'sourcing_target_scope',
              v_g->>'vertical_key', r.platform, r.recommended_format, v_slot,
              v_g->'appetite_descriptor', v_g->>'why_needed',
              v_route, true, v_drain, 'open',
              now(), now(), r.post_draft_id, v_run_id,
              c_analyzer_version, coalesce(v_g#>>'{context,appetite_policy_version}', 'v2'),
              v_g->>'subject_kind', v_g->>'failure_state', 'cc0046-classifier-v1',
              v_g->'diagnostic_evidence', now(), v_g->>'evidence_confidence'
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
              source_of_demand      = excluded.source_of_demand,
              subject_kind          = excluded.subject_kind,
              failure_state         = excluded.failure_state,
              classifier_version    = excluded.classifier_version,
              diagnostic_evidence   = excluded.diagnostic_evidence,
              diagnosed_at          = excluded.diagnosed_at,
              evidence_confidence   = excluded.evidence_confidence
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
