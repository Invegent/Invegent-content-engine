# Template Proof Lifecycle v1 — Smoke Render Packet (Design)

> **Lane:** Step 3 of the PK-ratified TMR Template Proof Lifecycle v1 sequence.
> **Status:** 📝 **DESIGN / PACKET ONLY — NOTHING APPLIED, NOTHING RENDERED.** All SQL below is DESIGN ONLY (not executed). No render, no proof event, no publish, no enablement, no binding, no production_proven claim — none without a NEW exact PK approval gate.
> **Owner:** PK · **Date context:** 2026-07-01 Sydney · **Repo HEAD at authoring:** `f0d54bd` (== origin/main, 0/0) · **Registers:** v4.61 · **Project:** `mbkmaxqhsohbtwsqolns`
> **PK decisions seeding this packet (2026-07-01):** (1) proof write-path = **governed write-RPC** (not controlled insert); (2) packet scope = **smoke render + visual approval together**.

---

## 0. Preflight Result

Fresh Step 3 preflight: branch `main`; `HEAD == origin/main == f0d54bd`; ahead/behind `0/0`; working tree clean except the known untracked scrap; registers read **v4.61**. PASS.

## 1. Purpose & scope

Design — for later PK-gated execution — the safest path to move the seeded template `news_quote_insight_1x1_v1` (`8a6fd92e-…` / provider `490ad9ea-…`, 1080×1080 1:1) from **inventory/`platform_candidate`** to **render-proven candidate (+ PK-visually-approved)**, without enabling production use.

In scope (design only): the governed proof **write-RPC**, the safe `_smoke/` render spec, the `smoke_render` evidence model, the PK visual-approval model, and the `smoke_render → visual_approval` insert sequencing.

Out of scope (explicitly): platform_render / platform_publish, Format Mix binding, client enablement, `production_proven`, any publish. Those remain separate, later, gated lanes.

## 2. Hard boundaries

No render · no proof event insert · no publish · no enablement · no Format Mix binding · no provider-template field additions · no dashboard code · no production_proven / platform_safe claim — **none without a new exact PK approval gate.** This packet writes only a design document. The write-RPC SQL (§3) is DESIGN ONLY and is NOT executed in this lane.

---

## 3. Part A — Governed proof write-RPC `public.record_tmr_proof_event(...)` (DESIGN ONLY)

The single sanctioned write path for proof events — reusable for **all four** proof types (`smoke_render`, `visual_approval`, `platform_render`, `platform_publish`). Per the schema comment, proof must be created by this RPC, **never by raw insert / inference**.

**PK-required properties (all baked in below):** `SECURITY DEFINER` · service-role-only EXECUTE · validates template identity · validates `proof_type` · validates `evidence_reference` · rejects empty/unsafe evidence · stores no raw provider payloads / secrets · reusable for all four proof types. Review chain: db-rls-auditor → security-auditor → external → PK exact apply.

```sql
-- DESIGN ONLY — NOT EXECUTED in this lane. Candidate write-RPC for the proof write-path.
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
  volatile                 -- this is a WRITE (INSERT), not STABLE
  security definer
  set search_path = ''     -- hardened (db-rls-auditor): empty search_path; every ref below is fully schema-qualified; pg_catalog is implicit. (The quoted 'public, pg_temp' form collapses to one nonexistent schema.)
as $$
declare
  v_template_id uuid;
  v_new_id      uuid;
  v_evidence    text := btrim(coalesce(p_evidence_reference, ''));
  v_kind        text := btrim(coalesce(p_evidence_kind, ''));
begin
  -- 1. template identity must exist
  select id into v_template_id from c.creative_provider_template where id = p_provider_template_id;
  if v_template_id is null then
    return jsonb_build_object('error','template_not_found','provider_template_id',p_provider_template_id);
  end if;

  -- 2. proof_type must be in the schema CHECK vocab
  if p_proof_type is null or p_proof_type not in
     ('smoke_render','visual_approval','platform_render','platform_publish') then
    return jsonb_build_object('error','invalid_proof_type','proof_type',p_proof_type);
  end if;

  -- 3. proof_status must be explicit + valid (this RPC does NOT record NULL status)
  if p_proof_status is null or p_proof_status not in ('passed','failed','pending','superseded') then
    return jsonb_build_object('error','invalid_proof_status','proof_status',p_proof_status);
  end if;

  -- 4. evidence_reference must be present (no empty/whitespace)
  if v_evidence = '' then
    return jsonb_build_object('error','empty_evidence_reference');
  end if;

  -- 5. evidence_kind label required
  if v_kind = '' then
    return jsonb_build_object('error','missing_evidence_kind');
  end if;

  -- 6. reject unsafe / secret-like evidence + raw payload blobs (store ids/paths/labels only)
  if v_evidence ~* '(access[_-]?token|refresh[_-]?token|bearer|api[_-]?key|client[_-]?secret|secret|password|authorization)' then  -- db-rls-auditor: dropped 'destination_id' (a real m.post_publish column name → false-positive risk)
    return jsonb_build_object('error','unsafe_evidence_reference_rejected');
  end if;
  if v_evidence ~ '^\s*[\{\[]' or length(v_evidence) > 500 then
    return jsonb_build_object('error','evidence_reference_must_be_id_or_path_not_payload');
  end if;

  -- 7. platform_* proof types MUST resolve to a REAL m.* evidence row (validated, never inferred).
  --    smoke_render / visual_approval evidence is a _smoke/ storage object path or approval ref —
  --    shape-validated above, intentionally NOT coupled to production m.* rows.
  if p_proof_type = 'platform_render' then
    if not exists (select 1 from m.post_render_log r
                   where r.render_log_id::text = v_evidence and r.status = 'succeeded') then  -- db-rls-auditor V-1: PK is render_log_id (not id); success = status 'succeeded'
      return jsonb_build_object('error','platform_render_evidence_not_validated','evidence_reference',v_evidence);
    end if;
  elsif p_proof_type = 'platform_publish' then
    if not exists (select 1 from m.post_publish p
                   where p.post_publish_id::text = v_evidence and p.status = 'published') then  -- db-rls-auditor V-2: PK is post_publish_id (not id); gate on status 'published' (existence-only would pass a failed publish)
      return jsonb_build_object('error','platform_publish_evidence_not_validated','evidence_reference',v_evidence);
    end if;
  end if;

  -- 8. optional assignment must belong to this template
  if p_assignment_id is not null
     and not exists (select 1 from c.creative_template_client_assignment a
                     where a.id = p_assignment_id and a.template_id = v_template_id) then
    return jsonb_build_object('error','assignment_not_for_template','assignment_id',p_assignment_id);
  end if;

  -- 9. insert (ids/labels only; no raw payload, no secret)
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

revoke execute on function public.record_tmr_proof_event(uuid,text,text,text,text,text,text,uuid,timestamptz,text)
  from public, anon, authenticated;
grant  execute on function public.record_tmr_proof_event(uuid,text,text,text,text,text,text,uuid,timestamptz,text)
  to service_role;
```

**Design notes / V-items — RESOLVED by db-rls-auditor (read-only, live `mbkmaxqhsohbtwsqolns`, 2026-07-01; verdict `concerns` → corrected above):**
- **V-1 — `m.post_render_log` ✅ RESOLVED + CORRECTED:** live PK is **`render_log_id`** (NOT `id`; no `id` column) — defect fixed above (`r.render_log_id::text`). Success predicate `status='succeeded'` CONFIRMED (live: succeeded/failed/timeout).
- **V-2 — `m.post_publish` ✅ RESOLVED + CORRECTED:** live PK is **`post_publish_id`** (NOT `id`) — defect fixed above; a NOT-NULL `status` column exists (live: published/failed) → success predicate **`status='published'`** ADDED (existence-only would have falsely validated a *failed* publish).
- **V-3 — owner/rights ✅ CONFIRMED:** `c.creative_template_proof_event` owner = `postgres` (holds INSERT); service_role also holds INSERT. SECURITY DEFINER (owner postgres) bypasses RLS and inserts successfully.
- **V-4 — no status elevation ✅ CONFIRMED:** body only INSERTs one proof_event row; no UPDATE to `creative_provider_template.status` / suitability / assignment. `production_proven` stays a read-RPC projection.
- **V-5 — append-only ✅ CONFIRMED acceptable for v1:** no UPDATE of prior events; `proof_status='superseded'` is in the live CHECK vocab for later explicit supersede.
- **Also CONFIRMED live:** proof_type / proof_status CHECK vocab match the RPC exactly; `c.creative_provider_template.id` is the correct identity column; no `public.record_tmr_proof_event` name collision; service-role-only grant model correct + complete; schema `c`/`m` not anon/authenticated-reachable for this path.
- **Corrected (db-rls-auditor minors):** `search_path` hardened to `''`; `destination_id` dropped from the secret regex; §5/§6 example arg fixed to the internal `id`.

## 4. Part B — Safe `_smoke/` render spec (DESIGN ONLY; render is a future PK gate)

- **Target:** Creatomate template `490ad9ea-…` (`news_quote_insight_1x1_v1`) + **safe synthetic modifications** — neutral placeholder copy filling the 9-element field inventory, sized to the `market_update.v1` strong-candidate shape (Headline/Subtitle/Location/Date/Footer/CategoryBadge). No real client content, no PII.
- **Mechanism:** reuse the **proven non-publishing governed-render mechanism** (Branch B Lane B-Proof / B0, `_smoke/` storage prefix, zero publish/zero mutation, proven live 2026-06-24/25). **Mechanism reconciliation needed (packet→execution lane):** the current `image-worker` builds Creatomate payloads inline and does **not** render from a stored Creatomate template-id; rendering this TMR template requires either a direct Creatomate `template_id` render call or an image-worker path that accepts a template-id. The exact call shape is specified + reviewed in the execution lane, not run here.
- **Output target:** a `_smoke/` storage object (non-publishing). **No `m.post_render_log` row** (it is production-coupled via FK `ice_format_key` → governed formats + `post_draft_id` → real drafts; writing one would force a Format Mix binding + a production draft — forbidden), **no draft, no publish, no Format Mix binding, no client enablement.**
- **Captured evidence:** `_smoke/` object path/URL · Creatomate render id · output dimensions (assert **1080×1080**) · status · render duration · content hash of the rendered bytes. All non-secret, all id/label/hash-grade.

## 5. Part C — `smoke_render` evidence model

- `proof_type='smoke_render'`, `proof_status='passed'` (only if dimensions verified 1080×1080 + asset retrievable), `p_provider_template_id='8a6fd92e-…'`, `p_evidence_reference` = the `_smoke/` storage object path, `p_evidence_kind='smoke_render_storage_object'`, `p_occurred_at`=render time, `p_recorded_by`=operator/session label.
- **Contract note (db-rls-auditor):** in the TMR read/write contract, `provider_template_id` = the **internal row id** `c.creative_provider_template.id` (= `8a6fd92e-ef27-433b-b49b-010a7844dca9`), mirroring `get_tmr_template_detail(p_provider_template_id uuid)` which resolves `WHERE pt.id = …`. The Creatomate **external** id `490ad9ea-…` is the render target in Part B, not the RPC arg.
- The RPC's §3 step-6 guard rejects secret-like or payload evidence; the `_smoke/` path passes (id/path-grade). **No raw Creatomate payload, no secret.**

## 6. Part D — PK visual approval model + sequencing

All steps are **separate PK gates**; nothing self-advances.

1. **(PK gate)** Run the safe `_smoke/` render → produce the asset.
2. **(PK gate)** `record_tmr_proof_event('8a6fd92e-…','smoke_render','passed', <_smoke/ path>, 'smoke_render_storage_object', …)` — machine evidence the template renders to a valid asset.
3. **PK visual review** — PK views the `_smoke/` asset and decides accept / reject.
4. **(PK gate)** `record_tmr_proof_event('8a6fd92e-…','visual_approval', <'passed'|'failed'>, <same asset path>, 'pk_visual_approval', …)` — human judgment recorded as its own event (a rejection is auditable as `visual_approval/failed`, not a silent deletion).

**Order rationale:** smoke_render (machine) **before** visual_approval (human) — the render produces and anchors the very artifact PK looks at; keeping them as separate proof events preserves the schema's "proof is separate from capability and from human judgment" intent.

## 7. Part E — Read-RPC projection after smoke + visual approval (honest, unchanged rollup)

- `proof_summary` gains `{smoke_render,passed,1}` and (after step 4) `{visual_approval,passed,1}`. `get_tmr_template_detail().proof_events` lists both with their `_smoke/` evidence ids.
- **`lifecycle_rollup` stays `platform_candidate`; `blocker_summary` stays `[no_render_proof, no_publish_proof]`.** The rollup's render/publish gates key on `platform_render`/`platform_publish` (not smoke/visual) — so "render-proven candidate, PK-approved" lives in `proof_summary`/`proof_events`, **not** the rollup. This is the truthful representation; it is not a defect.
- No dashboard change required at the contract level (the read RPCs already project proof). Whether the `/create/templates` drawer renders `proof_events` is a separate read-only dashboard check (no edit here).

## 8. Part F — Safety boundaries / non-claims

- This lane (the packet) mutates nothing: **0** DB · **0** render · **0** publish · **0** proof event · **0** migration applied · **0** dashboard · **0** runtime · **0** provider call.
- After the *future, separately-gated* smoke render + visual approval, the template is at most a **render-proven, PK-visually-approved candidate** — still **not** platform_safe, **not** production_proven, **not** enabled, **not** bound, **not** Format Mix eligible, **not** production usable. `platform_candidate` = physical candidate, not proof.

## 9. Part G — Gate sequence (each its own hard stop)

| Gate | Action | Review before PK gate |
|---|---|---|
| G1 | Apply write-RPC `record_tmr_proof_event` | db-rls-auditor → security-auditor → external review → PK exact apply |
| G2 | Run safe `_smoke/` render of `490ad9ea-…` | render spec + Creatomate call reviewed → PK exact approval (render is irreversible/external) |
| G3 | Record `smoke_render`/`passed` via the RPC | evidence verified (1080×1080, retrievable) → PK exact approval |
| G4 | PK visual review of the `_smoke/` asset | — (human gate) |
| G5 | Record `visual_approval`/`passed`\|`failed` via the RPC | → PK exact approval |

No gate auto-advances; the orchestrator stops at each for PK. External review (`ask_chatgpt_review`) fires on the final write-RPC SQL (G1) and on the render plan (G2) per CLAUDE.md.

## 10. G1 review chain — RESULTS (all clean) + apply gate

**Canonical G1 apply SQL = the exact bytes of §3 (corrected).** `reviewed_input_hash` (sha256) = **`79294a06b9c4f517bcb4e057023a2200944a6c44f1be4d1f812b7fde78fcbd42`**.

| Gate review | Verdict | Notes |
|---|---|---|
| **db-rls-auditor** | `concerns` → **corrected** | V-1 `render_log_id`, V-2 `post_publish_id` + `status='published'` gate, `search_path=''`, regex `destination_id` dropped, §5/§6 example id — all fixed; V-1…V-5 resolved; identity column / CHECK vocab / grants / no-collision confirmed live. |
| **security-auditor** | **GREEN** (conditional on apply-gate items) | service-role-only EXECUTE correct + REVOKE mandatory; SECURITY DEFINER hardened (`search_path=''`, fully-qualified, no dynamic SQL) — no escalation/injection; append-only, no status elevation, no secret read; inference prevention proven (status-gated `m.*`); residuals R1/R2/R3 accepted (non-blocking). |
| **external review** | **agree** / medium / high / no-escalate | `ask_chatgpt_review` `83f84078-5ccc-48c1-b4c6-e7ea2f588a29`, reviewed against hash `79294a06…`, zero pushback. |

**Load-bearing apply-gate items (security-auditor; must hold at apply):**
1. The `REVOKE EXECUTE FROM public, anon, authenticated` block **must ship in the same migration as the CREATE** — mandatory (Supabase default ACL auto-grants anon+authenticated EXECUTE on `public.` functions), not cosmetic.
2. The 10-arg signature in REVOKE/GRANT must byte-match the CREATE signature: `(uuid,text,text,text,text,text,text,uuid,timestamptz,text)`.
3. Apply only the exact SQL of hash `79294a06…`; any change re-triggers external review (`reviewed_input_hash` staleness).

**Post-apply verification (run after a PK-approved G1 apply):**
- `prosecdef=true`; `proconfig` shows `search_path=` (empty); `provolatile='v'`; 1 overload; owner postgres.
- `has_function_privilege('anon', …, 'EXECUTE')` = **false** AND `authenticated` = **false** AND `service_role` = **true** (load-bearing — proves the REVOKE took).
- `get_advisors(security)` → no new SECURITY DEFINER / search_path regression.
- `c.creative_template_proof_event` still **0 rows** (the create writes none).

**Apply mechanism (at the PK-approved G1 apply step, NOT now):** primary `apply_migration` (identity e.g. `tmr_proof_write_rpc_record_tmr_proof_event_v1`); if harness-denied → byte-identical `execute_sql` fallback + ledger backfill marker. **Rollback:** single `DROP FUNCTION public.record_tmr_proof_event(uuid,text,text,text,text,text,text,uuid,timestamptz,text);` (reversible; mutates nothing else).

**Residual risks (security-auditor §8 — recorded for PK, non-blocking):** R1 direct `service_role` INSERT remains physically open (RPC is the sanctioned, not the exclusive, writer — v1-accepted defense-in-depth; exclusivity = future trigger/grant lane); R2 label-based secret filter isn't entropy-based (accepted — service-role-only writer); R3 schema `c` USAGE is open to anon/authenticated (harmless — object grants + REVOKE gate exposure; each future `c.` object must carry its own grant discipline).

## 11. Verdict

```
G1 — READY FOR PK APPLY GATE  (all three reviews CLEAN)
  · db-rls-auditor   : concerns → corrected
  · security-auditor : GREEN (conditional on apply-gate items §10)
  · external review  : agree / medium / high / no-escalate (83f84078)
reviewed_input_hash : 79294a06b9c4f517bcb4e057023a2200944a6c44f1be4d1f812b7fde78fcbd42
```

⛔ **HARD STOP — nothing applied, rendered, or inserted.** G1 (write-RPC apply) is PK-gated on the exact SQL/hash above. G2 (render) · G3 (`smoke_render` proof) · G4 (PK visual review) · G5 (`visual_approval` proof) remain separate PK gates after G1 is live.
