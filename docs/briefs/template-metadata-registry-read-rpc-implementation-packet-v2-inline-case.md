# TMR — Read RPC Implementation Packet **v2 (inline CASE)** — design only

> ## ⛔ DESIGN-ONLY PACKET — NOTHING IS CREATED OR APPLIED
> This is **v2** of the TMR read-RPC implementation packet. It exists to give external review **concrete,
> reviewable final SQL** — every placeholder helper call from v1 is replaced by **explicit inline `CASE` /
> `jsonb` logic**. **No migration file is created. No RPC is created. No SQL is executed. No DB mutation
> occurs. No DB inspection occurs** (schema read from the applied migration file only). Every SQL block is
> labelled `DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY` and is **not** under
> `supabase/migrations/`.
> **Produced:** 2026-06-30 (CE session). **CE state:** `main == origin/main == 95f27f4a72f71b265a4711e364bea48c44020202`;
> register **v4.45**. CCF-01 Phase 1 guards remain dry-run / log-only — not modified.

---

## A. Packet status

- This is **v2 of the TMR Read RPC implementation packet**. It **supersedes the v4.42 draft packet for
  future external review and apply preparation** (the v4.42 draft remains an immutable historical reviewed
  input; its hash is preserved).
- It responds to external review id **`4f14055d-3195-4467-9b9c-411f94f70bc1`** (verdict
  `PARTIAL — NEEDS PACKET REVISION`): the final inlined SQL did not exist to be SQL-correctness-reviewed.
- **No migration file created · no RPC created · no SQL executed · no DB mutation · no DB inspection · no
  dashboard/server-action/runtime implementation · no seed · no template bound/enabled/rendered/published/
  proven · no secrets.**
- **Verdict (see §M): `READY FOR EXTERNAL REVIEW`.**

**Hashes (this packet's reviewed inputs):**

| Artifact | SHA-256 |
|---|---|
| `prior_packet_hash` (v4.42 draft) | `6f961fdd67bba786de2641a33b680490b3657dbbb4b8b1ad600354dc935d0468` |
| `prior_db_rls_review_hash` (v4.43) | `05d0631b05ee84f1bad585e3438167a176cddec86a5501c5434e65077751372d` |
| `prior_security_review_hash` (v4.44) | `18815ae8a6ab2f85ed36b304cb89c6fa2794167f7dbdf670815c1d5acd06a0b6` |
| `prior_external_review_hash` (v4.45) | `3649a882ace49310721a08281891abc00a34392846952318e1c38b93f610c71a` |
| `migration_artifact_hash` (applied schema) | `f6733fa73ef6246b030bbcbbb1165086d41b578aab4adb66323eb459eca54f56` |

> Schema source of truth for this packet = the applied migration file
> `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql` (`f6733fa7…`). No live DB was
> read. The column names / CHECK vocabularies below are quoted from that file.

---

## B. Revision summary (narrow)

- **Why v2:** external review (v4.45) was `PARTIAL` **only** because the v1 packet carried placeholder
  helper references `public_tmr_rollup(...)` / `public_tmr_blockers(...)` in the list SQL, so the final
  rollup/blocker logic could not be reviewed for SQL correctness.
- **What changed:** the placeholders are **replaced by explicit inline `CASE` / `jsonb` expressions**
  computed from a single read-only `roll` LATERAL of `EXISTS(...)` signals (§E.1, §E.5, §E.6). **No helper
  function is created. No dynamic SQL is used.**
- **Added safety:** an explicit **`jsonb_typeof(missing_fields) = 'array'` guard** around every
  `jsonb_array_length(missing_fields)` call (§G).
- **Latent-bug fix (correctness only, no DTO change):** the v1 strongest-variant LATERAL mixed an
  aggregate (`count(*)`) with a non-aggregate `jsonb_build_object` + `order by`/`limit` in one SELECT
  (invalid SQL). v2 splits it into a `limit 1` strongest-row LATERAL + a separate `count(*)` LATERAL. Same
  output keys (`strongest_variant_candidate`, `variant_candidate_count`).
- **What did NOT change (intentionally):** security posture (SECURITY DEFINER, pinned `search_path`,
  `STABLE`, owner `postgres`), grants (service-role-only EXECUTE), table access set (the same 8 `c.*`
  tables), function signatures, DTO exposure (`TemplateListItem` / `TemplateDetail` / `TemplateFilters` /
  `ProofSummary` keys), and the conservative lifecycle/proof rules. Only the **SQL expression detail** for
  `lifecycle_rollup` / `blocker_summary` / the jsonb guard is made concrete.

---

## C. Proposed RPC surfaces (unchanged from v1)

First-implementation surfaces (unchanged):
1. `public.get_tmr_template_list()`
2. `public.get_tmr_template_detail(p_provider_template_id uuid)`
3. `public.get_tmr_template_filters()`

Deferred (unchanged): `public.get_tmr_wizard_template_lookup(p_provider text, p_provider_template_id text)`
— designed when the **write** flow lands.

---

## D. Candidate SQL — DESIGN ONLY

> **DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY.** Mirrors the proven GFCP/PPP Slice-1A RPC
> posture: `language sql stable security definer set search_path to 'public, pg_temp'`, owner `postgres`,
> schema-qualified `c.*`, explicit projection (no `SELECT *`), read-only (no INSERT/UPDATE/DELETE/DDL), no
> dynamic SQL, no provider calls, no secret reads, jsonb cols surfaced only as counts/labels/booleans.

### E.1 `public.get_tmr_template_list()` — with INLINE rollup + blocker CASE

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
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

      -- ── INLINE lifecycle rollup (was public_tmr_rollup) — conservative floor, §E.5 ──
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

      -- ── INLINE blocker summary (was public_tmr_blockers) — labels only, §E.6 ──
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
```

### E.2 `public.get_tmr_template_detail(p_provider_template_id uuid)` — with jsonb guard

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
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
```

### E.3 `public.get_tmr_template_filters()` (unchanged — vocabulary only)

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
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
```

### E.4 Grants (DESIGN ONLY) — unchanged, all three functions

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
-- REVOKE from PUBLIC alone is insufficient on Supabase — name anon/authenticated explicitly.
revoke execute on function public.get_tmr_template_list()       from public, anon, authenticated;
revoke execute on function public.get_tmr_template_detail(uuid) from public, anon, authenticated;
revoke execute on function public.get_tmr_template_filters()    from public, anon, authenticated;
grant  execute on function public.get_tmr_template_list()       to service_role;
grant  execute on function public.get_tmr_template_detail(uuid) to service_role;
grant  execute on function public.get_tmr_template_filters()    to service_role;
```

---

## E.5 Inline `lifecycle_rollup` logic (the concrete CASE)

The `roll` LATERAL computes read-only `EXISTS(...)` booleans; the `CASE` returns the **weakest unsatisfied
gate** (a floor). It preserves `inventory_captured ≠ renderable ≠ platform_safe ≠ client_enabled ≠
production_proven`. Evaluated **in order** (first match wins):

| # | Condition (against the live CHECK vocab) | Rollup label |
|---|---|---|
| 1 | `pt.status = 'blocked'` **or** `inventory_status = 'blocked'` | `blocked` |
| 2 | `inventory_status` **not** in the captured set (`captured_from_docs/_provider_read/_manual_entry/_render_probe`, `verified`) — i.e. `missing`/`requested`/`stale`/null | `inventory_missing` |
| 3 | else **no** `creative_provider_template_field` rows | `inventory_incomplete` |
| 4 | else a variant `fit_status = 'needs_template_edit'` exists | `needs_template_edit` |
| 5 | else **no** platform-suitability row in (`candidate`,`needs_review`,`platform_safe`,`production_proven`) | `platform_unknown` |
| 6 | else **no** platform-suitability row in (`platform_safe`,`production_proven`) | `platform_candidate` |
| 7 | else **no** non-blocked client assignment | `unassigned` |
| 8 | else **no** assignment in (`approved`,`visually_approved`,`client_enabled`,`production_proven`) | `assigned_candidate` |
| 9 | else `EXISTS(proof_event WHERE proof_type='platform_publish' AND proof_status='passed')` | `production_proven` |
| 10 | else (all earlier gates satisfied incl. verified `platform_safe`, but **no** publish proof) | `platform_safe` |

**`production_proven` is NEVER inferred from `status`/`assignment_status` text** — only from a real
`platform_publish` proof_event with `proof_status='passed'` (row 9). The terminal `else` (row 10) returns
the **highest verified intermediate** (`platform_safe`, which row 6 already confirmed), capped below proven.
**Unknown beats optimism** — an uncaptured/unmapped layer floors the label, never a pass.

## E.6 Inline `blocker_summary` logic (the concrete jsonb)

`blocker_summary` is a `jsonb` **array of short labels** (empty `[]` when clean), built inline from the same
`roll` signals via `jsonb_agg` over a null-filtered `unnest(array[...])` — **no helper function**. Labels:

- `blocked` — template/inventory blocked
- `inventory_missing` — inventory not captured
- `fields_unmapped` — inventory captured but **no** field rows
- `needs_template_edit` — a variant needs template edits
- `platform_not_suitable` — no candidate/safe platform-suitability row
- `no_render_proof` — no `platform_render` + `passed` proof
- `no_publish_proof` — no `platform_publish` + `passed` proof
- `unassigned` — no non-blocked client assignment

No raw payloads are exposed — labels only.

---

## F. (reserved — merged into E.5/E.6)

---

## G. JSONB safety

- **Guard:** every `jsonb_array_length(v.missing_fields)` is wrapped in
  `case when jsonb_typeof(v.missing_fields) = 'array' then jsonb_array_length(v.missing_fields) else 0 end`
  (§E.2). `jsonb_typeof(NULL)` returns `NULL` → falls to the `else 0` branch, so **null or non-array
  `missing_fields` is treated as an empty/`0` count** (controlled), never an error.
- `missing_fields` is **never returned raw** — only the **count** is surfaced (`missing_field_count`).
- All other jsonb columns (`brand_constraints`, `constraints`, `changed_fields`) are **not** surfaced by
  these read RPCs at all.

---

## H. `production_proven` proof-chain

- `production_proven` (lifecycle rollup row 9, and the `suitability_status`/`assignment_status` value of the
  same name) requires a **real `platform_publish` proof_event with `proof_status='passed'`** — never
  inferred from any status text.
- A **proof event does not grant publishing permission** and **does not create client enablement** — those
  are separate gates (`client_assignment` = scoped permission; enablement is a downstream proof gate).
- **Anti-fabrication obligation (future write-RPC, not this read path):** the read RPC only **reports**
  existing proof_events. The future **write**-RPC must **validate `evidence_reference` against real `m.*`
  evidence** (e.g. `m.post_render_log` / publish id) before recording any `platform_publish`/`passed`
  proof — so a `production_proven` rollup can never be fabricated by inserting a bare proof row.

---

## I. DTO mapping (unchanged from v1)

| DTO | jsonb keys |
|---|---|
| **TemplateListItem** | provider_template_id · provider · provider_template_name · family_key · family_label · output_type · aspect_ratio · width · height · inventory_status · lifecycle_rollup · strongest_variant_candidate · variant_candidate_count · platform_candidate_summary · client_assignment_summary · blocker_summary · proof_summary · last_audit_at · updated_at |
| **TemplateDetail** | identity · family · output_contract · field_inventory · platform_suitability · variant_candidates · client_assignments · proof_events (ProofSummary[]) · audit |
| **TemplateFilters** | providers · families · output_types · platforms · suitability_statuses · variant_statuses · client_scope_types · lifecycle_statuses |
| **ProofSummary** | proof_type · proof_status · evidence_reference_type (`evidence_kind`) · evidence_reference_id (`evidence_reference`, soft id) · occurred_at — **summary only, no payload** |

**No DTO field is added, removed, or re-typed vs the v4.42 packet.** `lifecycle_rollup` and `blocker_summary`
remain the same keys with the same value domains; only their **computation** is now inline. Therefore **no
db-rls / security re-review of DTO exposure is required.**

---

## J. Security posture (unchanged — confirmed)

- `SECURITY DEFINER`, owner `postgres`; `SET search_path TO 'public, pg_temp'` pinned; `STABLE`/read-only.
- Service-role-only EXECUTE (`REVOKE … FROM public, anon, authenticated; GRANT … TO service_role`).
- No browser-direct `c.*` access — a server action / backend route (service-role client) mediates later.
- No direct table grants to browser roles; no provider calls; no mutation; no dynamic SQL; no raw payload
  output; no secrets.

---

## K. Review impact assessment

- DB/RLS/security **posture is unchanged** from the already-reviewed v4.42 packet: same SECURITY DEFINER
  shape, same pinned `search_path`, same `STABLE`/read-only, same service-role-only EXECUTE.
- **Table access is unchanged** (the same 8 `c.*` tables, SELECT-only via `EXISTS`/LATERAL).
- **Grants are unchanged.**
- **DTO exposure is unchanged** (§I).
- The revision is **limited to making the final SQL concrete** (inline rollup/blocker + jsonb guard) plus a
  latent-bug fix in the strongest-variant LATERAL.
- **Therefore the next required gate is EXTERNAL REVIEW only** — db-rls + security verdicts (v4.43/v4.44)
  already cover the unchanged posture/grants/tables. A *light* re-confirmation of the new `CASE` by
  db-rls/security is **optional**, not a full chain rerun, **unless** the external reviewer identifies a new
  DB/security concern in the concrete SQL.

---

## L. Apply-lane verification checklist (carried forward)

- Final migration SQL contains **no `public_tmr_rollup` / `public_tmr_blockers`** and creates **no helper
  function**.
- Inlined lifecycle `CASE` matches §E.5; `production_proven` uses **`platform_publish` + `passed`** EXISTS.
- `jsonb_array_length(missing_fields)` guarded by `jsonb_typeof(...) = 'array'`.
- Functions owner `postgres`; `SECURITY DEFINER`; `search_path` pinned; `STABLE`.
- EXECUTE revoked from PUBLIC/anon/authenticated; granted `service_role` only; no browser table privileges.
- Empty registry returns safe empty DTOs (`rows: []`, empty distinct arrays, `{ not_found: true }`).
- Final SQL hash recorded before apply; migration timestamp re-stamped forward of the latest applied;
  migration name = permanent identity.

---

## M. Final packet verdict

**✅ 1. READY FOR EXTERNAL REVIEW.**

The v2 packet now contains **concrete final SQL** for all three first-implementation RPCs: the
`lifecycle_rollup` and `blocker_summary` are **explicit inline `CASE` / `jsonb` expressions** (no helper
function, no dynamic SQL), `production_proven` is encoded as `EXISTS(platform_publish, passed)`, and every
`jsonb_array_length` is guarded by `jsonb_typeof = 'array'`. Security posture, grants, table access,
function signatures, and DTO exposure are unchanged. The exact gap the external reviewer flagged (final
inlined SQL absent) is closed.

> Not PARTIAL — no new PK *design* decision is introduced (the rollup rules were already ratified; this was
> mechanical inlining). Not BLOCKED — the concrete SQL is fully derivable from the applied schema
> (`f6733fa7…`) with no DB mutation/inspection.

**Recommended next lane:** **TMR Read RPC external review only**, on this v2 inline-CASE packet. (db-rls +
security verdicts v4.43/v4.44 carry; a light re-confirm of the new `CASE` is optional, not a full chain.)

---

## Explicit non-claims / scope

- **Docs/register only** — no migration file, no RPC created, no `execute_sql`/`apply_migration`/DB command,
  no DB mutation, **no DB inspection** (schema read from the repo migration file `f6733fa7…`), no dashboard/
  server-action/runtime code, no `supabase/migrations/` edit, no provider API call, no render/publish/
  binding/enablement/deploy, no seed, **no secrets.**
- Every SQL block is **DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY**, outside `supabase/migrations/`.
- The applied migration file (`f6733fa7…`) and the three prior reviewed inputs
  (`6f961fdd…`/`05d0631b…`/`18815ae8…`) and the external review (`3649a882…`) were **not modified**.
- The registry is live but **empty**; **no template is bound/enabled/proven**. `quote_card.v1` stays
  `needs_template_edit`/blocked; `market_update.v1` a strong candidate but defined/unwired; `news_card.v1`
  production-proven PP × facebook+instagram only.

## Cross-references

- Supersedes for review: read-RPC implementation packet **v1 draft** (`6f961fdd…`, v4.42).
- db-rls-auditor review (v4.43, `05d0631b…`) · security-auditor review (v4.44, `18815ae8…`) · external
  review (v4.45, `3649a882…`, review_id `4f14055d-3195-4467-9b9c-411f94f70bc1`).
- Applied schema: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql` (`f6733fa7…`).
- Proven RPC convention (mirrored, not modified): `…_gfcp_slice1a_…_rpc.sql`, `…_ppp_slice1a_…_rpc.sql`.
- Register: v4.46 (this v2 packet).
