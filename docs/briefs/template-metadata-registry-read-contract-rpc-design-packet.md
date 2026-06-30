# TMR — Read Contract / Read RPC Design Packet (design only)

## A. Packet status

- This is a **design packet** for the TMR **read contract / future read RPC** — for `/create/templates`
  and Creative Intake lookup flows.
- **TMR backend tables are LIVE and EMPTY** as of register v4.40 (8 `c.creative_template_*` tables,
  deny-all RLS, service-role-only, 0 rows, ledger version `20260630042316`).
- This packet **does NOT**: implement RPCs · implement dashboard/server-action/runtime code · execute
  SQL · mutate the DB · expose browser-direct table access · bind / enable / render / publish / prove any
  template · seed any data.
- **Verdict (see §O): `CLEAN FOR READ RPC REVIEW PACKET`.**
- **Produced:** 2026-06-30 (CE session). **CE state:** `main == origin/main == 8fddc394bd7970fbf9ef0666491e1f49e6169d15`;
  register **v4.40**. CCF-01 Phase 1 guards remain dry-run / log-only — not modified.

---

## B. Source documents reviewed

| Doc | Role |
|---|---|
| `template-metadata-registry-v1-design.md` | TMR-1 canonical object model |
| `tmr-dashboard-readonly-view-design-brief.md` | `/create/templates` read needs (7 operator questions) |
| `creative-intake-template-wizard-flow-v2.md` | template-led wizard lookup/read steps |
| `template-metadata-registry-tmr2-final-schema-rls-review.md` | final schema/RLS + read-RPC posture |
| `…-tmr3-migration-packet-draft.md` / `…-db-rls-auditor-review.md` / `…-security-auditor-review.md` / `…-external-review.md` | the 3 review gates + carries |
| `…-tmr3-apply-result.md` | applied state (8 empty tables, deny-all RLS, carry G) |
| `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql` (hash `f6733fa7…`) | the live schema |
| register **v4.40** context | TMR-3 applied — verified with carry |

**Live schema (from the applied migration):** `c.creative_template_family` (family_key, scope, status…) ·
`c.creative_provider_template` (provider, provider_template_id, family_id, dimensions, output_type,
inventory_status, status, inventory_hash…) · `c.creative_provider_template_field` (element_name,
field_kind, dynamic…) · `c.creative_template_platform_suitability` (platform, placement,
suitability_status, proof_reference…) · `c.creative_template_variant_candidate` (variant_key, fit_status,
missing_fields…) · `c.creative_template_client_assignment` (client_id, assignment_scope,
assignment_status…) · `c.creative_template_inventory_audit` (append-only, capture_method, no_secret/
no_mutation assertions…) · `c.creative_template_proof_event` (proof_type, proof_status CHECK
passed/failed/pending/superseded, evidence_reference, evidence_kind…). Hard in-registry FKs; soft
cross-schema refs; deny-all RLS; service-role-only grants.

---

## C. Read contract goals

- Support the **`/create/templates` read-only operator page** (list + detail).
- Support **Creative Intake template lookup/read** steps.
- Expose **safe sanitized summaries only** (no secrets, no raw payloads).
- Show **incomplete / unknown / blocked** states honestly (no optimism).
- **Prevent candidate ↔ proof ↔ enablement confusion** (the TMR separation).
- Preserve **proof/provenance** by id/hash, never raw payload.
- Remain **server-mediated** — the browser never reads `c.*` directly.

---

## D. Non-goals

No write path · no inventory capture · no provider API call · no proof insertion · no assignment
mutation · no template binding · no production enablement · no dashboard implementation · no runtime
implementation · no seed data. (All write/capture/enable concerns belong to the later, separately-
reviewed write-RPC/wizard lane — §M.)

---

## E. Recommended read architecture

**Recommended (3 layers):**

1. **DB layer — SECURITY DEFINER read RPC(s)** in the `public` RPC surface (so PostgREST/server can call
   them) reading from the non-exposed `c.*` tables: owner `postgres`, **pinned `search_path = public,
   pg_temp`**, schema-qualified, **read-only (`STABLE`)**, **no dynamic SQL**, **explicit column
   projection (no `SELECT *`)**, **whitelisted sanitized outputs**, **no raw payloads/secrets**, **no
   mutation**. EXECUTE revoked from PUBLIC/anon/authenticated, **granted only to `service_role`**.
2. **App layer — server action / backend route** (dashboard server-side) calls the RPC via the
   service-role client. **The browser never reads `c.*` tables directly** and never calls the RPC
   directly; it receives **sanitized DTOs** only.
3. **Dashboard — `/create/templates`** consumes the DTOs (the v4.33 read-only view design). **No
   optimistic seeded data; no client-side direct Supabase table access.**

**Why:** mirrors the proven PPP/GFCP Slice-1A posture (server-side SECURITY DEFINER read RPC over a
non-exposed schema, browser gets sanitized data only). It is robust to the c-exposure carry (§K): even if
`c` were exposed, deny-all RLS + zero browser grants keep the tables unreadable; the RPC is the only read
path. **Alternative considered:** a pure service-role server-action assembly (no RPC) — also viable, but a
single reviewed SECURITY DEFINER RPC centralises the projection/whitelist in one auditable object. The RPC
is **recommended**; the final choice (RPC vs server-action) is a db-rls/security review call.

---

## F. Proposed RPC / read surfaces (candidate names — NOT created)

### 1. `public.get_tmr_template_list()`
- **Purpose:** one row per provider template with family, output contract, lifecycle rollup, strongest
  variant candidate, platform summary, client-assignment summary, blocker summary, proof summary.
- **Inputs:** optional filters (provider, family_key, output_type, scope, lifecycle status, platform,
  needs_attention bool) — all server-supplied, validated against §F.3 filter values.
- **Output shape:** array of **TemplateListItem** (§G).
- **Source tables:** `creative_provider_template` (spine) + aggregates over `…_field`, `…_platform_suitability`,
  `…_variant_candidate`, `…_client_assignment`, `…_proof_event`, `…_inventory_audit`.
- **Security posture:** SECURITY DEFINER, pinned search_path, STABLE, explicit projection, service-role-only EXECUTE.
- **Why safe:** returns only sanitized summary fields; no raw payloads, no secrets, no full jsonb.
- **Must NOT expose:** secrets, raw provider/render/publish payloads, unbounded jsonb, internal-only columns.
- **Gate before build:** db-rls-auditor + security-auditor review of the exact RPC SQL.

### 2. `public.get_tmr_template_detail(p_provider_template_id uuid)`
- **Purpose:** full detail for one provider template — identity, family, output contract, field-inventory
  summary, platform-suitability rows, variant-candidate rows, client-assignment rows, proof/provenance
  summaries, audit summary, blocker/missing-state summary.
- **Inputs:** `p_provider_template_id uuid` (the surrogate id).
- **Output shape:** **TemplateDetail** (§G).
- **Source tables:** all 8, joined on the template id.
- **Security posture:** same as #1; single-row by id; same projection/whitelist.
- **Why safe:** sanitized rows only; proof shown as **ProofSummary** (id/hash, no raw payload).
- **Must NOT expose:** raw evidence payloads, secrets, full jsonb, service-role-only attestation internals beyond a boolean summary.
- **Gate before build:** db-rls + security review.

### 3. `public.get_tmr_template_filters()`
- **Purpose:** safe, known filter values (provider, family, output_type, platform, suitability_status,
  fit_status, assignment_scope, lifecycle status) for the UI — distinct existing values + the static
  CHECK vocabularies.
- **Inputs:** none.
- **Output shape:** a small object of string arrays.
- **Source tables:** `distinct` over the relevant columns (+ the static CHECK enum sets).
- **Security posture:** same; trivially safe (vocabulary only).
- **Must NOT expose:** anything beyond filter labels/values.
- **Gate before build:** db-rls + security review.

### 4. (Optional future) `public.get_tmr_wizard_template_lookup(...)`
- **Purpose:** wizard-specific lookup once the **write flow exists** (e.g. resolve a `provider_template_id`
  the operator entered, return its current registry state for the wizard's read step).
- **Inputs:** provider + provider_template_id (external id) → registry row if present.
- **Status:** **deferred** — only meaningful once the write/capture path exists; designed later.
- **Gate before build:** db-rls + security review; depends on the write lane.

---

## G. Output DTO model (browser-safe)

**TemplateListItem:** `provider_template_id` · `provider` · `provider_template_name` · `family_key` ·
`family_label` · `output_type` · `aspect_ratio` · `width` · `height` · `inventory_status` ·
`lifecycle_rollup` (§H) · `strongest_variant_candidate` (variant_key + fit_status) ·
`variant_candidate_count` · `platform_candidate_summary` (per-platform suitability_status counts/labels) ·
`client_assignment_summary` (scope + status counts) · `blocker_summary` (scoped reason chips) ·
`proof_summary` (counts by proof_type/status, **no payload**) · `last_audit_at` · `updated_at`.

**TemplateDetail:** template identity (id, provider, name, classified purpose) · family (key/label/scope/
purpose) · output contract (dims/aspect/output_type/duration) · **field inventory summary** (element_name
· field_kind · dynamic/fixed · role — **no raw values**, only `default_value_safe`/sanitized) · platform
suitability rows (platform · placement · suitability_status · reason · last_reviewed_at) · variant
candidate rows (variant_key · fit_status · required_field_mapping_status · missing_fields **as a count/
label, not raw jsonb**) · client assignment rows (scope · status · style_guide_reference · approved_at) ·
**proof event summaries** (ProofSummary[]) · audit summaries (capture_method · captured_at ·
no_secret_assertion/no_mutation_assertion booleans · inventory_hash — **no raw changed_fields payload**) ·
blocker/missing-state summary.

**ProofSummary:** `proof_event_type` · `proof_status` · `evidence_reference_type` (evidence_kind) ·
`evidence_reference_id` (the soft id) · `evidence_hash` (if present) · `created_at` — **summary only, no
raw payload.**

**Do NOT include (any DTO):** provider credentials · raw provider payloads · raw render payloads · raw
publish payloads · secret values · unbounded JSON blobs (jsonb returned only as counts/labels/booleans) ·
internal service-role-only fields not needed by operators.

---

## H. Lifecycle rollup rules (derived, conservative — never stored)

The `lifecycle_rollup` is **derived in the RPC/DTO**, capped by the **weakest proven layer**. It MUST
preserve `inventory_captured ≠ renderable ≠ platform_safe ≠ client_enabled ≠ production_proven`:

- If **inventory is missing** (`inventory_status in (missing, requested, blocked)`) → rollup cannot exceed
  `inventory_missing` / `not_captured`.
- If **platform suitability is candidate-only** (no `platform_safe`/`production_proven` row) → rollup
  cannot be `platform_safe`.
- If **the strongest variant candidate is `needs_template_edit`/`unsuitable`** → rollup cannot be
  `renderable`.
- If **no client assignment exists** (or scope is `client_blocked`) → rollup cannot be `client_enabled`.
- **`production_proven` only** if a proof summary includes the **required production/platform proof event**
  (a `platform_publish` proof_event with `proof_status='passed'` for the relevant scope) — never inferred
  from a status text alone.
- **Unknown beats optimistic assumptions** — when a layer is uncaptured, show `unknown`/`not_captured`,
  never assume pass.
- **Blockers cap the displayed lifecycle** — any open blocker (missing inventory / unmapped fields /
  not_suitable / needs_template_edit / no render proof / no publish proof / client_blocked / unassigned)
  caps the rollup and surfaces a `blocker_summary` chip.

> This makes the rollup a **floor of the weakest verified layer**, so the UI can never show a template as
> more proven than its real evidence.

---

## I. Proof / provenance exposure rules

- **Allowed:** evidence IDs (`evidence_reference`), evidence kind, evidence hash; proof_event **summaries**
  (type/status/timestamps); `inventory_hash`.
- **Forbidden:** raw evidence payloads · provider payloads · raw render/publish responses · secrets ·
  unbounded jsonb.
- **`proof_status` must NOT be used as production enablement by itself** — it is a status label on an
  evidence record; `production_proven` requires the **explicit proof chain** (§H), validated against a real
  `platform_publish` proof_event.
- Proof/capability/enablement separation is preserved end-to-end (the DTOs keep them in distinct sub-objects).

---

## J. Security requirements for the future RPC implementation (hard requirements)

- **SECURITY DEFINER only if needed** (to read the non-exposed `c.*` from a callable surface); **owner
  reviewed** (`postgres`).
- **Pinned `search_path = public, pg_temp`**; **STABLE / read-only** semantics; **no dynamic SQL** unless
  justified + reviewed.
- **No mutation; no provider calls; no secret reads; no raw payload return.**
- **No broad `SELECT *` — explicit column projection** on every query; jsonb returned only as
  counts/labels/booleans.
- **No direct browser `c.*` table access** — the browser calls the server action, not the RPC, not the
  tables.
- **EXECUTE grants only to the intended caller** (`service_role`/the server path); revoked from
  PUBLIC/anon/authenticated.
- **db-rls-auditor review** + **security-auditor review** of the exact RPC SQL **before implementation**;
  then external review + PK apply gate (the same trail as TMR-3).

---

## K. `c` schema exposure carry

- v4.40 could **not SQL-prove** the literal PostgREST exposed-schema config (`pgrst.db_schemas` null);
  browser roles had **zero table privileges** + **deny-all RLS** (verified) → tables not browser-readable
  regardless.
- The **read contract MUST NOT rely on browser table access** (it doesn't — server-mediated RPC only).
- The future implementation should **verify the exposed-schema config or demonstrate PGRST106** if
  possible, and **any RPC exposed to the browser must be reviewed separately** (the recommendation keeps
  the RPC server-side / service-role-only, so no browser-facing RPC is proposed).

---

## L. Empty-state behaviour

- The registry is **live but empty** (0 rows). The list RPC returns `[]`; the UI shows **"No templates
  captured yet"** — **no seeded optimistic data**, no fake rows.
- Filters (`get_tmr_template_filters`) return **empty distinct sets** (plus the static CHECK vocabularies)
  — no invented values.
- **No fake `490ad9ea` row**, **no fake `market_update.v1` proof**, **no fake `quote_card.v1`
  availability**. The real `490ad9ea` row appears only after it is captured via the (future) write path.

---

## M. Relationship to the future write path

- This read contract **creates no inventory** and displays **only data that already exists**.
- The future **write-RPC / wizard** must **separately enforce** (carried from the TMR-3 reviews):
  **JSONB sanitisation** · **`evidence_reference` validation** against real `m.*` evidence ·
  **`production_proven` proof-chain validation** (requires a real `platform_publish` proof_event) ·
  **no raw payload/secret storage** · **lifecycle transition controls**.
- The read contract may **display write-created data only after it exists** — and always through the
  conservative rollup (§H), so a freshly-written candidate never reads as proven.

---

## N. Implementation gate recommendation (sequence — NOT implemented now)

1. **Read contract design packet** — *this task*.
2. **db-rls-auditor review** of the proposed read RPCs.
3. **security-auditor review** of the proposed read RPCs.
4. **Implementation migration / server-action packet** (the exact RPC SQL + server action).
5. **External review + PK apply approval.**
6. **Implement** the read RPC / server action (gated apply lane).
7. **Dashboard UI wiring** (`/create/templates` consumes the DTOs — the v4.33 read-only view).

> No step is performed here. The next lane is step 2/3 (review of the proposed read RPCs) or a combined
> Read-RPC Review/Implementation packet.

---

## O. Final packet verdict

**✅ 1. CLEAN FOR READ RPC REVIEW PACKET.**

The read architecture (server-mediated SECURITY DEFINER read RPC → server action → sanitized DTOs), the
minimal read surfaces (list / detail / filters, + a deferred wizard lookup), the browser-safe DTOs, the
conservative lifecycle rollup, the proof/provenance exposure rules, the future-RPC security requirements,
the c-exposure carry, the empty-state behaviour, and the write-path relationship are **complete and
internally consistent** with the live schema and the prior gates. The design is **ready for the next
review/implementation packet**; nothing is implemented.

> Not PARTIAL — no read-surface or exposure question requires a PK decision before the review packet (the
> RPC-vs-server-action final choice and the c-exposure confirmation are both routed to the db-rls/security
> review). Not BLOCKED — the safe read model is fully designable from the live schema + source docs without
> any DB mutation or provider access.

**Recommended next lane: TMR Read RPC Review / Implementation Packet** (db-rls-auditor → security-auditor
review of the exact proposed read RPC SQL → external review → PK apply gate → implement → dashboard wiring).

---

## Explicit non-claims / scope
- **Docs/register only** — no RPC created, no SQL executed, no DB mutation/inspection (preflight read the
  schema from the repo migration file, not the live DB), no dashboard/server-action/runtime implementation,
  no seed, no `supabase/migrations/` edit, no runtime/edge/CCF code change, no
  `property-pulse.json`/`creative_contract.ts`/`registry-schema-v2.md` change, no provider API call, no
  render/publish/binding/enablement/deploy, **no secrets.**
- The migration file (`f6733fa7…`) was **not modified**.
- All RPC/DTO names are **candidate design** — nothing is built; live-truth items are **implementation-lane
  verification**.
- The registry is live but **empty**; **no template is bound/enabled/proven**. `quote_card.v1` remains
  `needs_template_edit`/blocked; `market_update.v1` a strong candidate but defined/unwired; `news_card.v1`
  production-proven PP × facebook+instagram only.

## Cross-references
- Applied schema: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql` (v4.39/v4.40).
- Read-only view: `tmr-dashboard-readonly-view-design-brief.md` (v4.33). Wizard: `creative-intake-template-wizard-flow-v2.md` (v4.33).
- TMR-2 final review (read-RPC posture): `…-tmr2-final-schema-rls-review.md` (v4.34). Reviews: v4.36/4.37/4.38. Apply: v4.40.
- Proven read-RPC posture (SECURITY DEFINER, pinned search_path, sanitized): PPP/GFCP Slice-1A.
- Register: v4.41 (this packet).
