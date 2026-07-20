-- BACKFILL RECORD — applied 2026-07-20 via execute_sql at a T3 PK gate (apply_migration is
-- harness-deny-listed); recorded post-hoc so the migration ledger carries the schema change.
-- Version > the already-applied 20260720160000 so the ledger stays monotonic; name is unique.
-- Idempotent CREATE OR REPLACE — safe to replay (redefines the function to the applied body).
-- Applied body sha256 = b38e36f3452752f3... (source _harness/cc0044_b2_shared_attr_fix_20260720/fix_apply.sql).
-- Rollback: _harness/cc0044_b2_shared_attr_fix_20260720/rollback_apply.sql (sha256 9c4c64ac60727532...).
--
-- cc-0044 Checkpoint D (INVEGENT) - Blocker B2 shared-attribution fix.
-- Migration identity: 20260720190000_cc0044_b2_run_asset_gap_analysis_shared_attribution_fix_v1
--
-- WHAT + WHY: the v6.00 auto-close pass (20260720120000_cc0044_asset_gap_analyzer_autoclose_v1)
--   flipped an open suggestion to 'resolved' and UNCONDITIONALLY attributed the selected asset to
--   resolved_client_asset_id. When the demand was satisfied from the shared inventory
--   (c.shared_creative_asset), that asset's id is NOT a c.client_brand_asset row, so the
--   resolved_client_asset_id FK raised 23503 at the FIRST live close.
--   Fix: detect whether the resolved asset lives in c.shared_creative_asset (v_is_shared) and route
--   it to resolved_shared_asset_id instead:
--       resolved_client_asset_id = case when v_is_shared then null else v_asset_id end,
--       resolved_shared_asset_id = case when v_is_shared then v_asset_id else null end
--   satisfying the gap_resolved_requires_one_asset XOR CHECK either way. Function-only; ZERO
--   table/index/grant/RLS DDL. 3 surgical edits (reverse == original, verified).
--   Live acceptance (p_dry_run=false): close pass resolved e2f70fcc (+ its IG/LI siblings),
--   attributing shared bg 0ba46053, errors:0.
--
-- WARNING: dry-run reconcile SKIPS the UPDATE - the FK/CHECK path is exercised ONLY at live
--   p_dry_run=false. Verify a real close (errors:0 + read-back status='resolved'), never the preview.
--
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
              analyzer_version, inventory_policy_version
            ) values (
              v_sig, v_client, v_g->>'client_pool_policy',
              (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(coalesce(v_g->'permitted_governance_scopes','[]'::jsonb)) x),
              (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(coalesce(v_g->'preferred_scope_order','[]'::jsonb)) x),
              v_g->>'sourcing_target_scope',
              v_g->>'vertical_key', r.platform, r.recommended_format, v_slot,
              v_g->'appetite_descriptor', v_g->>'why_needed',
              v_route, true, v_drain, 'open',
              now(), now(), r.post_draft_id, v_run_id,
              c_analyzer_version, coalesce(v_g#>>'{context,appetite_policy_version}', 'v2')
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
              source_of_demand      = excluded.source_of_demand
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
