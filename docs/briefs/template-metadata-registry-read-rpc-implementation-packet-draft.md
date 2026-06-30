# TMR — Read RPC Implementation Packet DRAFT (design only)

> ## ⛔ DESIGN-ONLY PACKET — NOTHING IS CREATED OR APPLIED
> This drafts the **exact candidate SQL** for the future TMR read RPCs for review. **No migration file
> is created. No RPC is created. No SQL is executed. No DB mutation occurs.** Every SQL block is
> labelled `DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY` and is **not** under
> `supabase/migrations/`. It must pass **db-rls-auditor → security-auditor → external review → PK
> approval** before any migration is created or applied.
> **Produced:** 2026-06-30 (CE session). **CE state:** `main == origin/main == df319db5bfb335c07794dc0122c1a8fda06d247e`;
> register **v4.41**. CCF-01 Phase 1 guards remain dry-run / log-only — not modified.

---

## A. Packet status

- This is the **TMR read RPC implementation packet DRAFT** — exact proposed SQL for future review.
- **No migration file created · no RPC created · no SQL executed · no DB mutation · no dashboard/
  server-action/runtime implementation · no seed · no template bound/enabled/rendered/published/proven.**
- **Verdict (see §P): `CLEAN FOR DB-RLS AUDITOR REVIEW`.**

---

## B. Source documents reviewed

| Doc | Role |
|---|---|
| `template-metadata-registry-v1-design.md` | TMR-1 object model |
| `template-metadata-registry-read-contract-rpc-design-packet.md` (v4.41) | the read architecture/DTOs/rollup this packet serialises |
| `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql` (hash `f6733fa7…`) | the live applied schema (8 `c.creative_template_*` tables) |
| `tmr-dashboard-readonly-view-design-brief.md` / `creative-intake-template-wizard-flow-v2.md` (v4.33) | the read needs (list/detail/filters/lookup) |
| `template-metadata-registry-tmr3-apply-result.md` (v4.40) | applied state + the c-exposure carry |
| **Proven RPC convention** (read-only, not modified): `20260630000000_gfcp_slice1a_…_rpc.sql`, `20260629120000_ppp_slice1a_…_rpc.sql` | the SECURITY DEFINER posture this packet mirrors |
| register **v4.41** context | CLEAN-for-review-packet verdict |

**Proven RPC convention extracted (mirrored exactly):** `CREATE OR REPLACE FUNCTION public.<name>(…)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public, pg_temp'`, owner
`postgres`, schema-qualified refs, no dynamic SQL, returns sanitized `jsonb`, and
`REVOKE EXECUTE … FROM PUBLIC, anon, authenticated; GRANT EXECUTE … TO service_role`. **No existing RPC
or migration is modified by this packet.** No convention conflict found — TMR `c.*` is non-exposed +
service-role-only, exactly the case the proven RPCs solve.

---

## C. Proposed migration identity (illustrative — NOT created)

- **Suggested logical name:** `tmr_read_rpc_v1`.
- **Example filename:** `supabase/migrations/<FUTURE_TIMESTAMP>_tmr_read_rpc_v1.sql`.
- The name is **illustrative**; **the migration file is NOT created in this task**; the timestamp must be
  **re-stamped** in the implementation/apply lane (forward of the latest applied; migration name =
  permanent identity).

---

## D. Proposed RPC surfaces

### 1. `public.get_tmr_template_list()` — first implementation
- **Purpose:** one sanitized row (in a jsonb array) per provider template — family, output contract,
  lifecycle rollup, strongest variant candidate, variant count, platform summary, client-assignment
  summary, blocker summary, proof summary, audit/updated timestamps.
- **Inputs:** none in v1 (filtering done in the server action / or a later parameterised overload).
- **Return:** `jsonb` (`{ contract_version, generated_at, rows: TemplateListItem[] }`).
- **Source tables:** `c.creative_provider_template` (spine) + LATERAL aggregates over `…_template_family`,
  `…_provider_template_field`, `…_template_platform_suitability`, `…_template_variant_candidate`,
  `…_template_client_assignment`, `…_template_proof_event`, `…_template_inventory_audit`.
- **Lifecycle rollup:** §H (conservative floor).
- **Proof/provenance:** counts by `proof_type`/`proof_status` only (no payload).
- **Empty-state:** `rows: []`.
- **Security:** SECURITY DEFINER, pinned search_path, STABLE, EXECUTE service-role-only.
- **Excluded:** secrets, raw payloads, unbounded jsonb (jsonb cols → counts/labels), `SELECT *`.
- **First implementation:** **YES.**

### 2. `public.get_tmr_template_detail(p_provider_template_id uuid)` — first implementation
- **Purpose:** full detail for one template — identity, family, output contract, field-inventory summary,
  platform-suitability rows, variant-candidate rows, client-assignment rows, proof summaries, audit
  summary, blockers.
- **Inputs:** `p_provider_template_id uuid` (the surrogate id).
- **Return:** `jsonb` (`TemplateDetail`, or `{ not_found: true }` for an unknown id).
- **Source tables:** all 8, joined on the template id.
- **Lifecycle/proof:** same conservative rules; proof rows as **ProofSummary** (id/hash, no payload).
- **Empty-state:** unknown id → `{ not_found: true }`.
- **Security/excluded:** as #1.
- **First implementation:** **YES.**

### 3. `public.get_tmr_template_filters()` — first implementation
- **Purpose:** safe filter vocabulary — distinct existing values + the static CHECK enum sets.
- **Inputs:** none.
- **Return:** `jsonb` (`TemplateFilters`).
- **Source tables:** `distinct` over the relevant columns; static enum arrays inline.
- **Empty-state:** empty distinct arrays (+ static vocab).
- **Security/excluded:** as #1 (trivially safe — vocabulary only).
- **First implementation:** **YES.**

### 4. (Deferred) `public.get_tmr_wizard_template_lookup(p_provider text, p_provider_template_id text)`
- **Purpose:** wizard lookup of a provider's external template id → its registry state, once the **write
  flow exists**.
- **Status:** **DEFERRED** (not in first implementation; designed when the write lane lands).

---

## E. Candidate SQL — DESIGN ONLY

> **DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY.** Mirrors the proven GFCP/PPP Slice-1A RPC
> posture. Not placed in `supabase/migrations/`. Schema-qualified `c.*`; explicit projection (no
> `SELECT *`); read-only (no DML); no dynamic SQL; no secrets; jsonb cols surfaced only as
> counts/labels. Final SQL is refined at the review/implementation lane.

### E.1 `public.get_tmr_template_list()`

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
      'lifecycle_rollup', public_tmr_rollup(pt.id, pt.inventory_status),   -- see §H (inlined CASE at impl)
      'strongest_variant_candidate', vc.strongest,
      'variant_candidate_count', coalesce(vc.cnt, 0),
      'platform_candidate_summary', coalesce(ps.summary, '[]'::jsonb),
      'client_assignment_summary', coalesce(ca.summary, '[]'::jsonb),
      'blocker_summary', public_tmr_blockers(pt.id),                      -- see §H (inlined at impl)
      'proof_summary', coalesce(pe.summary, '[]'::jsonb),
      'last_audit_at', au.last_audit_at,
      'updated_at', pt.updated_at
    ) as row_obj
    from c.creative_provider_template pt
    left join c.creative_template_family f on f.id = pt.family_id
    -- strongest variant candidate (ranked, NOT proof) + count
    left join lateral (
      select count(*) as cnt,
             jsonb_build_object('variant_key', v.variant_key, 'fit_status', v.fit_status) as strongest
      from c.creative_template_variant_candidate v
      where v.template_id = pt.id
      order by case v.fit_status
                 when 'strong_candidate' then 1 when 'candidate' then 2
                 when 'weak_candidate' then 3 when 'needs_template_edit' then 4
                 when 'unsuitable' then 5 when 'blocked' then 6 else 7 end
      limit 1
    ) vc on true
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
    left join lateral (
      select max(captured_at) as last_audit_at
      from c.creative_template_inventory_audit where template_id = pt.id
    ) au on true
  ) s;
$$;
-- NOTE (impl): public_tmr_rollup / public_tmr_blockers are shown as helper placeholders for
-- readability; at implementation they are INLINED as explicit CASE expressions (§H) — NO separate
-- helper function is required, and NO dynamic SQL is used.
```

### E.2 `public.get_tmr_template_detail(p_provider_template_id uuid)`

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
                              'missing_field_count', coalesce(jsonb_array_length(v.missing_fields), 0)))
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

### E.3 `public.get_tmr_template_filters()`

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

### E.4 Grants (DESIGN ONLY) — for all three functions

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
-- REVOKE from PUBLIC alone is insufficient on Supabase — name anon/authenticated explicitly.
revoke execute on function public.get_tmr_template_list()                  from public, anon, authenticated;
revoke execute on function public.get_tmr_template_detail(uuid)            from public, anon, authenticated;
revoke execute on function public.get_tmr_template_filters()               from public, anon, authenticated;
grant  execute on function public.get_tmr_template_list()                  to service_role;
grant  execute on function public.get_tmr_template_detail(uuid)            to service_role;
grant  execute on function public.get_tmr_template_filters()               to service_role;
```

---

## F. Function security posture

- **Owner:** `postgres` (so the SECURITY DEFINER body can read the non-exposed `c.*`).
- **SECURITY DEFINER rationale:** `c.*` is non-REST-exposed + service-role-only; a SECURITY DEFINER
  function owned by `postgres` is the proven way (GFCP/PPP Slice-1A) to read it and return a sanitized
  `jsonb` payload without exposing the tables.
- **`SET search_path TO 'public, pg_temp'`** pinned; all refs schema-qualified (`c.*`, `public.*`).
- **No mutation** (`STABLE`, SELECT-only); **no dynamic SQL**; **no secret reads**; **no provider calls**;
  **no raw payload return** (jsonb cols surfaced only as counts/labels/booleans); **no `SELECT *`**
  (explicit projection).
- **No direct browser `c.*` table access** — the browser never calls these functions; a **server action /
  backend route** (dashboard server-side, service-role client) mediates.
- **EXECUTE** revoked from `PUBLIC, anon, authenticated`; granted **only** to `service_role`.

---

## G. Return DTO mapping

| DTO | jsonb keys (from §E) |
|---|---|
| **TemplateListItem** | provider_template_id · provider · provider_template_name · family_key · family_label · output_type · aspect_ratio · width · height · inventory_status · lifecycle_rollup · strongest_variant_candidate · variant_candidate_count · platform_candidate_summary · client_assignment_summary · blocker_summary · proof_summary · last_audit_at · updated_at |
| **TemplateDetail** | identity · family · output_contract · field_inventory · platform_suitability · variant_candidates · client_assignments · proof_events (ProofSummary[]) · audit · (blockers derived) |
| **TemplateFilters** | providers · families · output_types · platforms · suitability_statuses · variant_statuses · client_scope_types · lifecycle_statuses |
| **ProofSummary** | proof_type · proof_status · evidence_reference_type (evidence_kind) · evidence_reference_id · (evidence_hash if present) · occurred_at — **summary only, no payload** |

---

## H. Lifecycle rollup SQL rules (conservative — inlined CASE at implementation)

Implemented as an **explicit `CASE`** (no helper function, no dynamic SQL) returning the **weakest
unsatisfied gate** (a floor). Preserves `inventory_captured ≠ renderable ≠ platform_safe ≠ client_enabled
≠ production_proven`:

1. no `creative_provider_template` row → **not visible** (filtered out of the list).
2. `inventory_status in ('missing','requested','blocked')` or null → **`inventory_missing`**.
3. else no `creative_provider_template_field` rows → **`inventory_incomplete`**.
4. else strongest variant `fit_status='needs_template_edit'` → **`needs_template_edit`**.
5. else no platform-suitability `candidate`/`platform_safe` row → **`platform_unknown`**.
6. else platform suitability only `candidate` (no `platform_safe`/`production_proven`) → **`platform_candidate`**.
7. else no client assignment → **`unassigned`**.
8. else client assignment only `proposed` → **`assigned_candidate`**.
9. **`production_proven` ONLY IF** `EXISTS (proof_event WHERE proof_type='platform_publish' AND
   proof_status='passed')` for the template → **`production_proven`**.
10. else → the highest verified intermediate state (`field_mapped`/`governed`/`smoke_rendered`/
    `visually_approved`/`platform_safe`/`client_enabled`) **capped by the weakest gate above**.

- **Blockers cap the display** (`blocker_summary` chips: `inventory_missing`, `fields_unmapped`,
  `platform_not_suitable`, `needs_template_edit`, `no_render_proof`, `no_publish_proof`, `client_blocked`,
  `unassigned`). **Unknown beats optimism** — an uncaptured layer yields `unknown`/`not_captured`, never a pass.

---

## I. Proof / provenance exposure rules

- **Expose:** `proof_event_type` · `proof_status` · `evidence_reference_type` (evidence_kind) ·
  `evidence_reference_id` (the soft id, safe) · `evidence_hash` (if present) · `created_at`/`occurred_at`.
- **Never expose:** raw evidence payload · provider raw payload · render/publish raw response · secrets ·
  unbounded jsonb.
- **A proof event is NOT a production permission** — `production_proven` requires the explicit proof chain
  (§H rule 9: a real `platform_publish` proof_event with `proof_status='passed'`).

---

## J. Empty-state behaviour

- Empty registry → `get_tmr_template_list()` returns `rows: []`.
- `get_tmr_template_filters()` → empty distinct arrays + the static vocabularies (no invented values).
- `get_tmr_template_detail(<unknown uuid>)` → `{ not_found: true }`.
- **No fake `490ad9ea` row · no fake `quote_card.v1` availability · no fake `market_update.v1` proof.**

---

## K. Review checklist — db-rls-auditor

- SECURITY DEFINER posture (owner `postgres`); **`search_path` pinned**; STABLE/read-only.
- EXECUTE revoked from PUBLIC/anon/authenticated, granted only to `service_role`.
- Source-table access pattern (reads non-exposed `c.*`); **no direct browser table reads**.
- **No mutation**; **no dynamic SQL**; **no raw payload exposure**; **no `SELECT *`**.
- Lifecycle rollup correctness (the conservative CASE; floor of weakest gate).
- `c` schema exposure carry acknowledged (read path is server-mediated; functions service-role-only).

---

## L. Review checklist — security-auditor

- No secrets / no raw payloads (jsonb cols surfaced as counts/labels/booleans only).
- No provider calls · no mutation.
- **No candidate-as-proven confusion** (lifecycle floor; suitability ≠ proof; assignment ≠ enablement).
- `production_proven` proof-chain rule enforced (rule 9) — and the **anti-fabrication implication**: the
  read RPC only *reports* proof_events; the future **write-RPC** must validate `evidence_reference`
  against real `m.*` evidence before any `production_proven` is recorded.
- DTO minimisation; browser-safe summaries only.
- Future write-path obligations recorded (JSONB sanitisation, evidence validation, lifecycle transitions).

---

## M. External review checklist

- SQL correctness (LATERAL aggregates, `jsonb_agg` ordering, null-handling/`coalesce`).
- Function return types (`jsonb`) + the `not_found` shape.
- Aggregation correctness (counts/summaries per template).
- Lifecycle rollup correctness (the CASE order = weakest gate first).
- `search_path` safety + schema qualification.
- Grant/revoke posture (service-role-only EXECUTE).
- Whether any SQL should be simplified before apply (e.g. inline the rollup CASE; confirm `missing_fields`
  is a jsonb array for `jsonb_array_length`).

---

## N. Implementation / apply gate (future sequence — NOT now)

1. **db-rls-auditor** review of this packet.
2. **security-auditor** review.
3. **external review** on the final SQL (record `reviewed_input_hash`).
4. **PK approval.**
5. **Create the migration file** (`<re-stamped>_tmr_read_rpc_v1.sql`).
6. **Apply** the migration (`apply_migration`, or `execute_sql` fallback + ledger backfill if harness-denied).
7. **Verify** the functions exist and are read-only (STABLE, SECURITY DEFINER, search_path pinned,
   service-role-only EXECUTE).
8. **Server action / backend route** packet (dashboard server-side calls the RPC, returns DTOs).
9. **Dashboard wiring** later (`/create/templates` consumes DTOs — the v4.33 read-only view).

---

## O. Non-goals and hard stops (repeat)

**No** migration file · `supabase/migrations/` edit · RPC creation · `execute_sql` · `apply_migration` ·
DB command/mutation · seed · provider call · render/publish · binding/enablement · deploy · dashboard/
server-action/runtime code · CCF / `.claude//_harness/` change · `property-pulse.json`/`creative_contract.ts`/
`registry-schema-v2.md` change · secrets. The candidate SQL is **DESIGN ONLY — NOT EXECUTED — NOT
AUTHORISED FOR APPLY** and is **not** under `supabase/migrations/`.

---

## P. Final packet verdict

**✅ 1. CLEAN FOR DB-RLS AUDITOR REVIEW.**

The candidate read-RPC SQL (list / detail / filters), the SECURITY DEFINER posture (mirroring the proven
GFCP/PPP Slice-1A pattern), the DTO mappings, the conservative lifecycle-rollup rules, the
proof/provenance exposure rules, and the review checklists are **complete, internally consistent with the
live schema, and review-ready**. Nothing is implemented or applied.

> Not PARTIAL — no read-RPC design issue requires a PK decision before db-rls review (the RPC-vs-server-
> action choice was settled as RPC in the design packet; the c-exposure confirmation is an apply-lane
> verify). Not BLOCKED — the safe RPC packet is fully draftable from the live schema + design packet
> without any DB mutation or provider access.

**Recommended next lane: TMR Read RPC db-rls-auditor Review.**

---

## Explicit non-claims / scope
- **Docs/register only** — no migration file, no RPC created, no `execute_sql`/`apply_migration`/DB
  command, no DB mutation/inspection (the schema was read from the repo migration file), no dashboard/
  server-action/runtime code, no `supabase/migrations/` edit, no provider API call, no render/publish/
  binding/enablement/deploy, no seed, **no secrets.**
- Every SQL block is **DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY**, outside `supabase/migrations/`.
- The applied migration file (`f6733fa7…`) was **not modified**; no existing RPC/migration was modified.
- The registry is live but **empty**; **no template is bound/enabled/proven**. `quote_card.v1` stays
  `needs_template_edit`/blocked; `market_update.v1` a strong candidate but defined/unwired; `news_card.v1`
  production-proven PP × facebook+instagram only.

## Cross-references
- Read contract design packet (this serialises): `…-read-contract-rpc-design-packet.md` (v4.41).
- Applied schema: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql` (v4.40).
- Proven RPC convention (mirrored, not modified): `…_gfcp_slice1a_…_rpc.sql`, `…_ppp_slice1a_…_rpc.sql`.
- Register: v4.42 (this packet).
