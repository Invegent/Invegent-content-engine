# TMR Read RPC — Server-Action / Backend Read-Path Implementation Packet

> **Type:** implementation packet (**fallback outcome** of the v4.50 server-action lane). **No code
> written in CE.** This packet specifies the exact server-side read path; it builds nothing.
> **Produced:** 2026-06-30 (CE session, Session 1 — authoritative writer for the TMR lane).
> **CE state at write time:** `main == origin/main == abe25596`; register **v4.49** (→ v4.50 with this
> packet). TMR read RPCs live + verified (apply-result
> `docs/briefs/template-metadata-registry-read-rpc-apply-result.md`).
> **Backend RPCs (already live, service-role-only):** `public.get_tmr_template_list()` ·
> `public.get_tmr_template_detail(uuid)` · `public.get_tmr_template_filters()`.

---

## 0. Why packet, not code (the blocker)

The lane's **preferred** outcome was to implement the server-side read path **using an existing safe
service-role/server-action pattern**. Discovery established that **no such pattern exists inside the
authorized CE scope**, so per the directive's explicit rule — *"If no safe service-role/server-action
pattern is found, do not improvise. Produce an implementation packet only"* — this is the fallback.

Evidence (read-only discovery, this repo):

1. **CE root `app/`** contains only `app/(dashboard)/roadmap` — no `actions/`, no `.rpc()` usage, no
   service-role client, no `/create` route. Building a server-action stack here from scratch =
   **improvising a new pattern** (forbidden).
2. **CE `dashboard/`** is the **cc-0013 internal ops dashboard** (clients/drift/freshness/platforms).
   Its **only** service-role client, `dashboard/lib/supabase/server.ts → createOpClient()`, is
   **deliberately schema-locked to `op`** (`db: { schema: 'op' }`) and its pinned cc-0013 Phase-0 §9/V4
   contract **forbids `public` / `c.*` cross-schema access** (`.schema('public')` is disallowed). The
   TMR RPCs are `public.*`. Using this client would **violate the cc-0013 contract**; adding a second
   client = **improvising**. The cc-0013 dashboard also has **no `/create/templates` route** and no
   `actions/` pattern.
3. **The proven server-action read-path pattern** (and the `/create/templates` page that consumes it)
   lives in the **SEPARATE `invegent-dashboard` repo** (`dashboard.invegent.com`) — e.g.
   `actions/global-format-capability.ts`, `actions/publishing-plan-pyramid.ts`, with the service-role
   client at `lib/supabase/service.ts → createServiceClient()`. That repo is a **different git repo
   with its own `main`**, outside this CE-scoped lane's "push to main," and overlaps the explicitly
   **deferred next lane** ("/create/templates dashboard wiring").

**Conclusion:** the correct home for the TMR server action is the separate `invegent-dashboard` repo,
following the proven GFCP/PPP pattern — not CE. This packet specifies exactly that build so the next
lane can execute it without re-discovery. (This matches the apply-result §I carry, which anticipated a
"later packet [for] the dashboard server-side route".)

---

## 1. Target (where the next lane builds it)

- **Repo:** `invegent-dashboard` (separate; `dashboard.invegent.com`).
- **New file:** `actions/tmr-templates.ts` (mirrors `actions/global-format-capability.ts`).
- **Service-role client:** reuse `createServiceClient` from `@/lib/supabase/service` (the proven
  `import 'server-only'` service-role pattern — the GFCP/PPP loaders use it). **Do NOT** reuse CE's
  `op`-locked `createOpClient`.
- **Consumed by (next-next lane):** the `/create/templates` read-only page (design:
  `docs/briefs/tmr-dashboard-readonly-view-design-brief.md`).

---

## 2. Exact function intent (3 server actions)

All three are **`'use server'`**, server-only, read-only passthroughs of the already-sanitised RPC
payloads. Names may follow repo convention; intent is fixed:

```ts
'use server';
import { createServiceClient } from '@/lib/supabase/service';

const TMR_CONTRACT_VERSION = 'tmr_read_v1';

// 1) list
export async function getTmrTemplateList(): Promise<TmrTemplateList> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('get_tmr_template_list');
  if (error) throw new Error(`TMR list read failed: ${error.message}`);
  // empty registry ⇒ { contract_version, generated_at, rows: [] } — pass through as-is
  return (data ?? { contract_version: TMR_CONTRACT_VERSION, generated_at: null, rows: [] }) as TmrTemplateList;
}

// 2) detail (unknown uuid ⇒ { not_found: true })
export async function getTmrTemplateDetail(providerTemplateId: string): Promise<TmrTemplateDetail | TmrNotFound> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('get_tmr_template_detail', { p_provider_template_id: providerTemplateId });
  if (error) throw new Error(`TMR detail read failed: ${error.message}`);
  return (data ?? { not_found: true }) as TmrTemplateDetail | TmrNotFound;
}

// 3) filters (empty registry ⇒ empty distinct arrays + static vocab)
export async function getTmrTemplateFilters(): Promise<TmrTemplateFilters> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('get_tmr_template_filters');
  if (error) throw new Error(`TMR filters read failed: ${error.message}`);
  return data as TmrTemplateFilters;
}
```

**Param name is load-bearing:** the detail RPC parameter is **`p_provider_template_id uuid`** — pass
`{ p_provider_template_id: providerTemplateId }`. Validate/normalise the UUID server-side before the
call; an unknown-but-valid UUID safely returns `{ not_found: true }` (verified in apply-result §G).

---

## 3. DTO type contracts (verbatim from the live RPC SQL — do not drift)

These mirror the RPC `jsonb_build_object` shapes exactly (migration `20260630050000`, hash
`88efec0c…`). The RPCs are **already sanitised** — provenance **ids/hashes only, no raw payloads, no
secrets** — so the actions pass them through and derive nothing secret client-side.

```ts
// ── list ──────────────────────────────────────────────────────────────────
export type TmrLifecycleRollup =
  | 'blocked' | 'inventory_missing' | 'inventory_incomplete' | 'needs_template_edit'
  | 'platform_unknown' | 'platform_candidate' | 'unassigned' | 'assigned_candidate'
  | 'platform_safe' | 'production_proven';

export type TmrTemplateListRow = {
  provider_template_id: string;
  provider: string;
  provider_template_name: string;        // may be MISLEADING — UI shows classified purpose primary
  family_key: string | null;
  family_label: string | null;
  output_type: string;
  aspect_ratio: string;
  width: number;
  height: number;
  inventory_status: string;
  lifecycle_rollup: TmrLifecycleRollup;  // conservative weakest-gate floor; never over-claims
  strongest_variant_candidate: { variant_key: string; fit_status: string } | null;
  variant_candidate_count: number;
  platform_candidate_summary: Array<{ platform: string; placement: string | null; suitability_status: string }>;
  client_assignment_summary: Array<{ client_id: string; assignment_scope: string; assignment_status: string }>;
  blocker_summary: string[];             // labels: inventory_missing | fields_unmapped | needs_template_edit | platform_not_suitable | no_render_proof | no_publish_proof | unassigned | blocked
  proof_summary: Array<{ proof_type: string; proof_status: string; n: number }>;
  last_audit_at: string | null;
  updated_at: string;
};
export type TmrTemplateList = { contract_version: 'tmr_read_v1'; generated_at: string | null; rows: TmrTemplateListRow[] };

// ── detail ────────────────────────────────────────────────────────────────
export type TmrNotFound = { not_found: true };
export type TmrTemplateDetail = {
  contract_version: 'tmr_read_v1';
  identity: { provider_template_id: string; provider: string; provider_template_name: string;
              output_type: string; aspect_ratio: string; width: number; height: number;
              inventory_status: string; status: string };
  family: { family_key: string; family_name: string; scope: string; creative_purpose: string } | null;
  output_contract: { output_type: string; aspect_ratio: string; width: number; height: number;
                     duration_seconds: number | null; file_type_candidate: string | null };
  field_inventory: Array<{ element_name: string; field_kind: string; dynamic: boolean;
                           required_for_render: boolean | null; has_default: boolean }> | null;
  platform_suitability: Array<{ platform: string; placement: string | null; suitability_status: string;
                                reason: string | null; last_reviewed_at: string | null }> | null;
  variant_candidates: Array<{ variant_key: string; fit_status: string;
                              required_field_mapping_status: string | null; missing_field_count: number }> | null;
  client_assignments: Array<{ client_id: string; assignment_scope: string; assignment_status: string;
                              style_guide_reference: string | null; approved_at: string | null }> | null;
  proof_events: Array<{ proof_type: string; proof_status: string;
                        evidence_reference_type: string | null; evidence_reference_id: string | null;
                        occurred_at: string | null }> | null;     // reference IDs only — no payload bodies
  audit: Array<{ capture_method: string; captured_at: string; inventory_hash: string | null;
                 no_secret_assertion: boolean | null; no_mutation_assertion: boolean | null }> | null;
};

// ── filters ───────────────────────────────────────────────────────────────
export type TmrTemplateFilters = {
  providers: string[];            // distinct existing (empty when registry empty)
  families: string[];             // distinct existing
  platforms: string[];            // distinct existing
  output_types: string[];         // static: static_image | animated_image | video | audio | unknown
  suitability_statuses: string[]; // static vocab
  variant_statuses: string[];     // static vocab
  client_scope_types: string[];   // static vocab
  lifecycle_statuses: string[];   // static vocab (discovered … production_proven | deprecated | blocked)
};
```

---

## 4. Safety controls the next lane MUST preserve

- **Server-only execution** — file begins `'use server'`; the service-role client is `import
  'server-only'`. The browser **never** receives the service-role key and **never** calls the RPCs
  directly (EXECUTE is service_role-only; an anon/authenticated call 403s regardless — apply-result §E).
- **RPC-only access** — call only the three `public.get_tmr_*` RPCs. **No direct `c.*` table reads**
  (the 8 `c.creative_*template*` tables are RLS deny-all with 0 policies — apply-result §F).
- **Sanitised DTO passthrough** — return the RPC payload as-is; do not enrich with secrets, raw
  payloads, tokens, or `m.*` evidence bodies. `evidence_reference_id` and `inventory_hash` are
  references/hashes only — safe.
- **Empty-registry safety** — `list ⇒ {rows:[]}`, `filters ⇒ empty distinct + static vocab`, `detail
  (unknown uuid) ⇒ {not_found:true}`. The UI renders an explicit "registry not yet populated" empty
  state (design brief §6), never seeded/fake data.
- **Read-only** — no writes, no mutation, no provider calls, no render/publish, no template/proof/
  assignment creation.
- **No overclaim** — `lifecycle_rollup` is a conservative weakest-gate floor; `production_proven`
  requires real publish proof and can never be fabricated by the read path.

---

## 5. Review gates for the next (build) lane

Mirrors the GFCP/PPP Slice-1B lane:

1. `tsc --noEmit` + `next build` green in the dashboard repo.
2. Type review: DTOs match the live RPC shapes (§3) — no drift.
3. External review (`ask_chatgpt_review`) on the final loader diff (record `reviewed_input_hash`).
4. Preview visual smoke (empty-registry state) → PK push/deploy gate (separate repo's main).
5. Confirm: browser bundle contains **no** service-role key, **no** direct `c.*` read, **no** RPC call
   from a Client Component.

---

## 6. Non-goals honored by THIS packet

No migration created/edited · no DB apply · no `execute_sql`/`apply_migration` · no DB mutation · no
seed/insert · no binding/assignment/proof-event · no RLS/grant change · no dashboard UI page built · no
provider call · no render/publish · no deploy · no CCF/`.claude`/`_harness` edit · no secrets/tokens.
**CE code unchanged** — this packet is docs-only (packet + concise register).

---

## 7. Next lane recommendation

**TMR server-action read path build** in the **separate `invegent-dashboard` repo**: create
`actions/tmr-templates.ts` per §2–§4 using `createServiceClient` (the proven GFCP/PPP pattern), then
proceed to **`/create/templates` dashboard wiring** (design brief
`docs/briefs/tmr-dashboard-readonly-view-design-brief.md`). That work is in a different repo/main and
is outside this CE lane — it is the explicitly-deferred next lane.

---

## Cross-references

- Apply result (RPCs live + verified): `docs/briefs/template-metadata-registry-read-rpc-apply-result.md`.
- TMR model: `docs/briefs/template-metadata-registry-v1-design.md` (TMR-1).
- Read-only view design: `docs/briefs/tmr-dashboard-readonly-view-design-brief.md`.
- Proven server-action pattern (separate repo): `invegent-dashboard` `actions/global-format-capability.ts`,
  `actions/publishing-plan-pyramid.ts`, `lib/supabase/service.ts`.
- Migration of record (read-only): `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql` (hash `88efec0c…`).
