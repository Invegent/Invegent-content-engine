-- Migration: cc0043_asset_gap_analyzer_writer_v1
-- Lane: cc-0043 Asset-Gap Analyzer-Write (PRODUCT_PROOF · T3). Ships DARK (p_dry_run default true).
-- Brief: docs/briefs/cc-0043-asset-gap-analyzer-write-lane-brief.md
--
-- WHAT THIS ADDS (additive only; no change to cc-0041 tables or cc-0042 read-path fns)
--   1. UNIQUE INDEX m.asset_gap_observation (suggestion_id, source_post_id)   — observation idempotency.
--   2. public.run_asset_gap_analysis(int,int,boolean,text)                     — the dark writer (SECDEF).
--   3. public.preview_asset_gap_analysis(int,int)                              — read-only-by-construction dry-run wrapper.
--
-- CONTRACT (verified live 2026-07-19, project mbkmaxqhsohbtwsqolns — NOT inferred):
--   · analyze_asset_gap(text,text,text,text) STABLE/SECDEF returns the dual-axis verdict; `appetite_signature`
--     + the full field set appear ONLY on the full-verdict path, and EVERY detected=true row carries them
--     (all early returns hardcode asset_gap_detected=false). The writer relies on this invariant.
--   · Live partial-unique arbiter (the ONLY valid ON CONFLICT target):
--       m.asset_gap_suggestion (appetite_signature) WHERE status IN
--         ('open','queued','harvesting','candidates_ready','failed')   — excludes 'resolved'/'dismissed'.
--   · CHECK domains: primary_route/slot_kind/drainability/status/pool_policy/sourcing_target_scope +
--     gap_drainable_requires_static_bg + gap_resolved_requires_one_asset. `none` is NOT a legal route/slot.
--
-- SAFETY POSTURE
--   · SECURITY DEFINER · VOLATILE · SET search_path='' · all objects schema-qualified · no dynamic SQL.
--   · EXECUTE revoked from PUBLIC, anon, authenticated (revoking PUBLIC alone is insufficient) → service_role only;
--     ACL post-asserted in-txn (public functions are born anon-executable via pg_default_acl).
--   · Fail-closed verdict validation: writes NOTHING unless status=ok ∧ detected=true ∧ route∈{template/governance/asset_gap}
--     ∧ slot_kind legal ∧ drainability legal ∧ appetite_signature present ∧ client_id present ∧ (drainable ⇒ static_background).
--   · Per-draft subtransaction isolates a bad draft (error → counted, batch continues).
--   · Governed terminal rule: no live row + terminal 'dismissed' → SUPPRESS; + terminal 'resolved' → NO silent reopen
--     (recurrence observation only). 'failed' stays inside the live arbiter → retry-in-place.
--   · Concurrency: the two unique indexes are authoritative; pg_advisory_xact_lock(per-signature) serialises the
--     terminal-check + upsert (belt-and-suspenders) — live runs only.
--   · Does NOT mutate m.post_draft; never approves/promotes/intakes/changes eligibility; never drains/harvests.
--
-- ⛔ APPLY IS PK-GATED. Ships dark. Rollback at bottom (reference only — not executed here).
-- NB apply_migration mints its own version at apply; if applied via execute_sql+ledger-backfill the repo
--    filename version and the applied ledger version may diverge — reconcile at the recording gate.

begin;

-- ── 1. Observation idempotency index ────────────────────────────────────────
create unique index if not exists asset_gap_observation_suggestion_post_uidx
  on m.asset_gap_observation (suggestion_id, source_post_id);
comment on index m.asset_gap_observation_suggestion_post_uidx is
  'cc-0043: one observation per (suggestion, source post) — makes the analyzer observation write idempotent. NULL source_post_id rows remain distinct (analyzer observations always carry a post id).';

-- ── 2. The dark writer ──────────────────────────────────────────────────────
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
    'samples',           case when p_dry_run then v_samples else '[]'::jsonb end);
end;
$$;

comment on function public.run_asset_gap_analysis(int,int,boolean,text) is
'cc-0043 dark asset-gap analyzer-write: sweeps approved prepared drafts, calls analyze_asset_gap, fail-closed-validates, and persists ONLY detected=true demand into m.asset_gap_suggestion (+observation), aggregating via the live partial-unique signature. Preserves cc-0042 dual-axis verdict verbatim; governed terminal rule (no silent reopen); pg_advisory_xact_lock per signature. p_dry_run default true = writes nothing. service_role only. Never approves/promotes/harvests/mutates drafts.';

-- ── 3. Read-only-by-construction preview wrapper ────────────────────────────
create or replace function public.preview_asset_gap_analysis(
  p_lookback_days int default 7,
  p_limit         int default 500
) returns jsonb
language sql
volatile
security definer
set search_path = ''
as $$
  select public.run_asset_gap_analysis(p_lookback_days, p_limit, true, null);
$$;
comment on function public.preview_asset_gap_analysis(int,int) is
'cc-0043 dry-run preview: run_asset_gap_analysis(..., p_dry_run=>true). Writes nothing by construction; returns the would-write summary + per-draft samples. service_role only.';

-- ── 4. Grants (revoking PUBLIC alone is insufficient — name anon, authenticated) ──
revoke all on function public.run_asset_gap_analysis(int,int,boolean,text) from public, anon, authenticated;
revoke all on function public.preview_asset_gap_analysis(int,int)          from public, anon, authenticated;
grant execute on function public.run_asset_gap_analysis(int,int,boolean,text) to service_role;
grant execute on function public.preview_asset_gap_analysis(int,int)          to service_role;

-- ── 5. In-txn ACL post-assert (fail-closed: no anon/authenticated EXECUTE) ──
do $assert$
begin
  if has_function_privilege('anon',          'public.run_asset_gap_analysis(int,int,boolean,text)', 'EXECUTE')
  or has_function_privilege('authenticated', 'public.run_asset_gap_analysis(int,int,boolean,text)', 'EXECUTE')
  or has_function_privilege('anon',          'public.preview_asset_gap_analysis(int,int)', 'EXECUTE')
  or has_function_privilege('authenticated', 'public.preview_asset_gap_analysis(int,int)', 'EXECUTE') then
    raise exception 'cc-0043 ACL assertion failed: anon/authenticated retain EXECUTE on an analyzer function';
  end if;
  if not has_function_privilege('service_role', 'public.run_asset_gap_analysis(int,int,boolean,text)', 'EXECUTE') then
    raise exception 'cc-0043 ACL assertion failed: service_role missing EXECUTE on run_asset_gap_analysis';
  end if;
end
$assert$;

commit;

-- ── ROLLBACK (reference only — NOT executed by this migration) ──
--   DROP FUNCTION IF EXISTS public.preview_asset_gap_analysis(int,int);
--   DROP FUNCTION IF EXISTS public.run_asset_gap_analysis(int,int,boolean,text);
--   DROP INDEX IF EXISTS m.asset_gap_observation_suggestion_post_uidx;
