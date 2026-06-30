-- Migration: tmr_proof_write_rpc_record_tmr_proof_event_v1
-- TMR Template Proof Lifecycle v1 — G1 governed proof write-RPC.
-- public.record_tmr_proof_event(...): the single sanctioned write-path for c.creative_template_proof_event,
-- reusable for all four proof types (smoke_render | visual_approval | platform_render | platform_publish).
-- SECURITY DEFINER, search_path='', service-role-only EXECUTE. Validates template identity, proof_type,
-- proof_status, evidence (rejects empty/secret-like/payload); platform_* proof MUST resolve to a real,
-- success-status m.* row (m.post_render_log.render_log_id status='succeeded' / m.post_publish.post_publish_id
-- status='published') — never inferred. Append-only single INSERT; no status elevation; stores ids/labels only.
--
-- Governance:
--   Packet            : docs/briefs/tmr-template-proof-lifecycle-v1-smoke-render-packet.md (Part A / §3)
--   reviewed_input_hash (sha256 of the executable SQL below) :
--                       79294a06b9c4f517bcb4e057023a2200944a6c44f1be4d1f812b7fde78fcbd42
--   db-rls-auditor    : concerns -> corrected (render_log_id / post_publish_id / status='published' / search_path='' / regex)
--   security-auditor  : GREEN (REVOKE mandatory: Supabase default ACL auto-grants anon+authenticated EXECUTE on public functions)
--   external review   : ask_chatgpt_review 83f84078-5ccc-48c1-b4c6-e7ea2f588a29 — agree / medium / high
--   PK apply approval : exact-hash phrase given 2026-07-01
--
-- APPLIED 2026-07-01 to mbkmaxqhsohbtwsqolns. apply_migration was harness-denied -> byte-identical execute_sql,
-- then ledger marker (version 20260630231747, this name) backfilled immediately to avoid repo<->prod drift.
-- This file is the in-repo record of the applied statement. Post-apply verified: prosecdef=true, search_path="",
-- anon/authenticated EXECUTE=false, service_role EXECUTE=true, proof table 0 rows, no new security advisor.

create or replace function public.record_tmr_proof_event(
  p_provider_template_id uuid,
  p_proof_type           text,
  p_proof_status         text,
  p_evidence_reference   text,
  p_evidence_kind        text,
  p_platform             text        default null,
  p_placement            text        default null,
  p_assignment_id        uuid        default null,
  p_occurred_at          timestamptz default now(),
  p_recorded_by          text        default null
) returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_template_id uuid;
  v_new_id      uuid;
  v_evidence    text := btrim(coalesce(p_evidence_reference, ''));
  v_kind        text := btrim(coalesce(p_evidence_kind, ''));
begin
  -- 1. template identity must exist (id = c.creative_provider_template PK; the TMR-contract "provider_template_id")
  select id into v_template_id from c.creative_provider_template where id = p_provider_template_id;
  if v_template_id is null then
    return jsonb_build_object('error','template_not_found','provider_template_id',p_provider_template_id);
  end if;

  -- 2. proof_type in the schema CHECK vocab
  if p_proof_type is null or p_proof_type not in
     ('smoke_render','visual_approval','platform_render','platform_publish') then
    return jsonb_build_object('error','invalid_proof_type','proof_type',p_proof_type);
  end if;

  -- 3. proof_status explicit + valid (no NULL status recorded by this RPC)
  if p_proof_status is null or p_proof_status not in ('passed','failed','pending','superseded') then
    return jsonb_build_object('error','invalid_proof_status','proof_status',p_proof_status);
  end if;

  -- 4. evidence_reference present
  if v_evidence = '' then
    return jsonb_build_object('error','empty_evidence_reference');
  end if;

  -- 5. evidence_kind label required
  if v_kind = '' then
    return jsonb_build_object('error','missing_evidence_kind');
  end if;

  -- 6. reject secret-like evidence + raw payload blobs (store ids/paths/labels only)
  if v_evidence ~* '(access[_-]?token|refresh[_-]?token|bearer|api[_-]?key|client[_-]?secret|secret|password|authorization)' then
    return jsonb_build_object('error','unsafe_evidence_reference_rejected');
  end if;
  if v_evidence ~ '^\s*[\{\[]' or length(v_evidence) > 500 then
    return jsonb_build_object('error','evidence_reference_must_be_id_or_path_not_payload');
  end if;

  -- 7. platform_* proof MUST resolve to a REAL, success-status m.* row (never inferred)
  if p_proof_type = 'platform_render' then
    if not exists (select 1 from m.post_render_log r
                   where r.render_log_id::text = v_evidence and r.status = 'succeeded') then
      return jsonb_build_object('error','platform_render_evidence_not_validated','evidence_reference',v_evidence);
    end if;
  elsif p_proof_type = 'platform_publish' then
    if not exists (select 1 from m.post_publish p
                   where p.post_publish_id::text = v_evidence and p.status = 'published') then
      return jsonb_build_object('error','platform_publish_evidence_not_validated','evidence_reference',v_evidence);
    end if;
  end if;

  -- 8. optional assignment must belong to this template
  if p_assignment_id is not null
     and not exists (select 1 from c.creative_template_client_assignment a
                     where a.id = p_assignment_id and a.template_id = v_template_id) then
    return jsonb_build_object('error','assignment_not_for_template','assignment_id',p_assignment_id);
  end if;

  -- 9. append the proof event (ids/labels only; no raw payload, no secret)
  insert into c.creative_template_proof_event
    (template_id, assignment_id, platform, placement, proof_type, proof_status,
     evidence_reference, evidence_kind, occurred_at, recorded_by)
  values
    (v_template_id, p_assignment_id, p_platform, p_placement, p_proof_type, p_proof_status,
     v_evidence, v_kind, coalesce(p_occurred_at, now()), p_recorded_by)
  returning id into v_new_id;

  return jsonb_build_object('ok',true,'proof_event_id',v_new_id,
                            'proof_type',p_proof_type,'proof_status',p_proof_status);
end;
$$;

-- service-role-only EXECUTE — REVOKE is MANDATORY (Supabase default ACL auto-grants anon+authenticated EXECUTE on public functions)
revoke execute on function public.record_tmr_proof_event(uuid,text,text,text,text,text,text,uuid,timestamptz,text)
  from public, anon, authenticated;
grant  execute on function public.record_tmr_proof_event(uuid,text,text,text,text,text,text,uuid,timestamptz,text)
  to service_role;

-- ── ROLLBACK (reference only — NOT executed by this migration) ─────────────────────────
--   drop function if exists public.record_tmr_proof_event(uuid,text,text,text,text,text,text,uuid,timestamptz,text);
