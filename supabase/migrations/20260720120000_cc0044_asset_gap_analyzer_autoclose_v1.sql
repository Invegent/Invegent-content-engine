-- Migration: cc0044_asset_gap_analyzer_autoclose_v1
-- Lane: cc-0044 Checkpoint D Blocker B2 — writer auto-close reconciliation pass (PRODUCT_PROOF · T3).
-- Depends on: cc0043_asset_gap_analyzer_writer_v1 (must already be live). Ships DARK (p_dry_run default true).
-- Predecessor record: _harness/cc0044_cpd_closure/CPD_SCOPING_REPORT.md (B2), _harness/cc0044_cpc_writer_resume/CPC_GATE1_HANDBACK.md
--
-- WHAT THIS ADDS (additive to the function body only; ZERO schema/table/index/grant change)
--   Appends a RECONCILE CLOSE-PASS to public.run_asset_gap_analysis: after the draft-detect loop, it scans
--   status='open' suggestions and flips a row to status='resolved' WHEN its gap no longer reproduces.
--   Nothing else in the function changes (draft-detect loop, grants, ACL post-assert, preview wrapper untouched).
--
-- CLOSURE ORACLE (why select_template='ok', not merely analyze_asset_gap detected=false)
--   · analyze_asset_gap sets asset_gap_detected=true ONLY when v_client_short — i.e. resolve_slot_assets
--     fail-closed on a MISSING client asset (no_governed_background / missing_required_logo). So EVERY
--     persisted suggestion had a missing client asset at detect time.
--   · select_template(client,platform,format,null,seed)='ok' is STRICTLY STRONGER than "analyze finds no gap"
--     (select_template='ok' ⇒ analyze early-returns detected=false route=none): it means the format is FULLY
--     producible now, and its slot_resolution.selected carries the concrete c.client_brand_asset.asset_id that
--     now fills the demanded slot. That asset is the HONEST fill of the gap that was detected, and it satisfies
--     the gap_resolved_requires_one_asset CHECK (exactly one of resolved_client_asset_id/resolved_shared_asset_id).
--   · Gating on select_template='ok' (not the weaker detected=false) means a row where the asset was added but
--     production is still blocked (e.g. governance still missing) stays OPEN — a still-needed-for-production
--     signal — rather than being falsely closed.
--
-- GOVERNED TERMINAL RULE (preserved, unchanged)
--   · The pass reads status='open' rows ONLY. It never touches queued/harvesting/candidates_ready/failed
--     (in-flight work) and never touches terminal resolved/dismissed — so it can NEVER silently reopen a
--     dismissed or resolved row. The detect-side suppress_resolved / suppress_dismissed logic is unchanged.
--
-- FAIL-SAFE POSTURE
--   · Resolves ONLY on an affirmative, asset-bearing closure: select_template='ok' AND a selected asset for the
--     demand's slot_kind (static_background→Background, logo→Logo). Any error, any missing matching-slot asset,
--     or any non-ok verdict → LEAVE OPEN (never resolve on uncertainty). Per-row subtransaction isolates errors.
--   · Idempotent by construction: a resolved row leaves the status='open' scan set, so re-runs never re-touch it
--     (status stays resolved, resolved_client_asset_id unchanged, no duplicate observation).
--   · Concurrency: per-signature pg_advisory_xact_lock (live only) + a status='open' re-check in the UPDATE WHERE.
--   · Dry-run (p_dry_run=true, the default, and the preview wrapper) writes NOTHING and reports would-resolve.
--
-- ⛔ APPLY IS PK-GATED. Ships dark. Rollback at bottom restores cc0043 writer v1 verbatim (reference only).

begin;

create or replace function public.run_asset_gap_analysis(
  p_lookback_days int     default 7,
  p_limit         int     default 500,
  p_dry_run       boolean default true,
  p_run_id        text    default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
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
        if not p_dry_run then
          update m.asset_gap_suggestion
            set status                   = 'resolved',
                resolved_client_asset_id = v_asset_id,
                resolved_shared_asset_id = null,
                last_seen_at             = now(),
                updated_at               = now()
          where id = rc.id and status = 'open';   -- re-check: concurrency guard (never touch a moved row)

          if found then
            insert into m.asset_gap_observation (suggestion_id, source_post_id, analyzer_run, evidence_codes)
            values (rc.id, rc.latest_source_post_id, v_run_id,
                    array['auto_resolved_gap_absent', rc.primary_route, v_asset_id::text])
            on conflict (suggestion_id, source_post_id) do nothing;
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
$$;

comment on function public.run_asset_gap_analysis(int,int,boolean,text) is
'cc-0043 dark asset-gap analyzer-write + cc-0044 reconcile close-pass: sweeps approved prepared drafts, calls analyze_asset_gap, fail-closed-validates, and persists ONLY detected=true demand into m.asset_gap_suggestion (+observation) via the live partial-unique signature; THEN reconciles status=open suggestions, flipping a row to resolved (attributing the now-satisfying c.client_brand_asset) when select_template=ok yields a selected asset for the demand slot. Governed terminal rule preserved (open-only scan; no silent reopen of resolved/dismissed). Idempotent (resolved rows leave the scan set). pg_advisory_xact_lock per signature. p_dry_run default true = writes nothing. service_role only. Never approves/promotes/harvests/mutates drafts.';

-- ── ACL post-assert (unchanged from cc0043; CREATE OR REPLACE preserves the existing ACL, re-assert fail-closed) ──
do $assert$
begin
  if has_function_privilege('anon',          'public.run_asset_gap_analysis(int,int,boolean,text)', 'EXECUTE')
  or has_function_privilege('authenticated', 'public.run_asset_gap_analysis(int,int,boolean,text)', 'EXECUTE') then
    raise exception 'cc-0044 ACL assertion failed: anon/authenticated retain EXECUTE on run_asset_gap_analysis';
  end if;
  if not has_function_privilege('service_role', 'public.run_asset_gap_analysis(int,int,boolean,text)', 'EXECUTE') then
    raise exception 'cc-0044 ACL assertion failed: service_role missing EXECUTE on run_asset_gap_analysis';
  end if;
end
$assert$;

commit;

-- ── ROLLBACK (reference only — NOT executed by this migration) ──
-- Restore the cc0043 writer v1 body verbatim by re-applying
--   supabase/migrations/20260719210000_cc0043_asset_gap_analyzer_writer_v1.sql
-- (a CREATE OR REPLACE of the same signature). No schema/table/index/grant is touched by this migration,
-- so reverting the function body is a complete rollback. Auto-resolved rows (if GATE 2 was run live) are
-- reverted separately if desired:
--   update m.asset_gap_suggestion set status='open', resolved_client_asset_id=null
--     where status='resolved' and source_of_demand is not null
--       and id in (select suggestion_id from m.asset_gap_observation where 'auto_resolved_gap_absent' = any(evidence_codes));
