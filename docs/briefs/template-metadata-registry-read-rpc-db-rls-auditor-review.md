# TMR Read RPC — db-rls-auditor Review (static / repository-only)

## A. Review status

- This is the **db-rls-auditor review** of the TMR Read RPC Implementation Packet Draft
  (`docs/briefs/template-metadata-registry-read-rpc-implementation-packet-draft.md`).
- **reviewed_input_hash = `6f961fdd67bba786de2641a33b680490b3657dbbb4b8b1ad600354dc935d0468`** (sha256 of the
  reviewed packet at review time). The packet is **not modified** by this review — the hash must stay stable.
- This review is **static / repository-only.** **No live DB inspection was performed.** **No migration
  was created. No RPC was created. No SQL was executed. No DB mutation was authorised.**
- **Verdict (see §O): `CLEAN FOR SECURITY-AUDITOR REVIEW`** — 0 DB/RLS blocker.
- **Produced:** 2026-06-30 (CE session). **CE state:** `main == origin/main == ca88568e22f3742fcd4a4e0d846645b7e61611c2`;
  register **v4.42**. CCF-01 Phase 1 guards remain dry-run / log-only — not modified.

---

## B. Source documents reviewed

| Doc | Role |
|---|---|
| `template-metadata-registry-v1-design.md` | TMR-1 object model |
| `template-metadata-registry-read-contract-rpc-design-packet.md` (v4.41) | read architecture/DTOs/rollup |
| `template-metadata-registry-read-rpc-implementation-packet-draft.md` | **the reviewed input** (`6f961fdd…`) |
| `template-metadata-registry-tmr3-apply-result.md` (v4.40) | applied schema state + c-exposure carry |
| `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql` (`f6733fa7…`) | the **live schema** the candidate SQL reads |
| `tmr-dashboard-readonly-view-design-brief.md` / `creative-intake-template-wizard-flow-v2.md` | read needs |
| Proven RPC convention (read-only, not modified): `…_gfcp_slice1a_…_rpc.sql`, `…_ppp_slice1a_…_rpc.sql` | SECURITY DEFINER posture mirrored |
| register **v4.42** context | CLEAN-for-db-rls-review verdict |

**Schema match confirmed:** the candidate SQL reads only columns present in the applied migration
(`f6733fa7…`) — `provider_template_id/provider/family_id/output_type/aspect_ratio/width/height/
inventory_status/status` on `creative_provider_template`; `family_key/family_name/scope/creative_purpose`
on `creative_template_family`; `element_name/field_kind/dynamic/required_for_render/default_value_safe` on
`…_field`; `platform/placement/suitability_status/reason/last_reviewed_at` on `…_platform_suitability`;
`variant_key/fit_status/required_field_mapping_status/missing_fields` on `…_variant_candidate`;
`client_id/assignment_scope/assignment_status/style_guide_reference/approved_at` on `…_client_assignment`;
`capture_method/captured_at/inventory_hash/no_secret_assertion/no_mutation_assertion` on `…_inventory_audit`;
`proof_type/proof_status/evidence_kind/evidence_reference/occurred_at` on `…_proof_event`. All present.

---

## C. Proposed RPC surface review

| RPC | Input | Return | Source tables | Read-only? | Safe as SECDEF? | Explicit projection? | No raw payload/secret? | → security-auditor? |
|---|---|---|---|---|---|---|---|---|
| `public.get_tmr_template_list()` | none | `jsonb {…, rows:[]}` | 8 TMR tables (spine + LATERAL aggregates) | **yes** | **yes** | **yes** (jsonb_build_object) | **yes** | **yes** |
| `public.get_tmr_template_detail(uuid)` | `p_provider_template_id uuid` | `jsonb` (detail or `{not_found:true}`) | 8 TMR tables joined on id | **yes** | **yes** | **yes** | **yes** | **yes** |
| `public.get_tmr_template_filters()` | none | `jsonb` (vocab) | distinct over 3 tables + static enums | **yes** | **yes** | **yes** | **yes** | **yes** |

- `public.get_tmr_wizard_template_lookup(...)` is **deferred** (not part of first implementation) — noted, not reviewed.
- **All three first-implementation surfaces proceed to security-auditor review.** (See §N TMR-READ-DBRLS-001 on the list-function rollup inlining.)

---

## D. SECURITY DEFINER review

- **Justified:** `c.*` is **non-REST-exposed + service-role-only with deny-all RLS** (applied migration);
  a SECURITY DEFINER function owned by `postgres` is the **proven** way (GFCP/PPP Slice-1A) to read it and
  return a sanitized `jsonb` — exactly this case. **PASS.**
- **Owner expectation stated:** owner `postgres` (packet §F). **No mutation** (`STABLE`, SELECT-only);
  **no provider calls**; **no dynamic SQL** (except the placeholder-helper note — §N-001). **STABLE is
  appropriate** (read-only, no side effects). **Future implementation must verify** owner + SECURITY
  DEFINER + STABLE + grants at migration time (§M). **PASS.**

---

## E. search_path review

- `SET search_path TO 'public, pg_temp'` is present on **all 3** proposed functions (grep-confirmed: 3
  pins). **PASS.**
- `c.*` table references are **explicitly schema-qualified** (20 `c.creative_*` refs). Built-ins
  (`now()`, `jsonb_build_object`, `jsonb_agg`, `coalesce`, `jsonb_array_length`, `to_jsonb`) resolve via
  the pinned `public`. **No unqualified table object** reference creates risk. **PASS.**
- **One residual** (impl-lane): the **placeholder helper calls** `public_tmr_rollup(...)` /
  `public_tmr_blockers(...)` in the list function are *unqualified-by-design illustration* — they must be
  **inlined as explicit CASE** (no function, so no resolution risk) at implementation (§N-001).

---

## F. Mutation and dynamic SQL review

The candidate SQL contains: **no INSERT · no UPDATE · no DELETE · no DDL · no `EXECUTE` dynamic SQL · no
provider calls · no RPC side effects · no proof/event insertion · no assignment/binding mutation**
(grep-confirmed: 0 `insert into`, 0 `update c./public.`, 0 `delete from`). **PASS.**
- **Suspicious expression flagged:** the list function references **`public_tmr_rollup` /
  `public_tmr_blockers`** — these are **placeholder helper-function calls** (packet NOTE line 187: "inlined
  as explicit CASE at implementation … NO separate helper function is required, and NO dynamic SQL is
  used"). As literally written the list SQL would not execute (undefined functions); the design intent is
  an **inlined CASE**. → **§N-001 (WARNING + IMPL-VERIFY)**, not a mutation/dynamic-SQL risk.

---

## G. Projection and payload review

- **No `SELECT *`** (grep-confirmed: 0 lowercase `select *`; the 2 textual hits are the prohibition
  "no `SELECT *`"). Explicit `jsonb_build_object` projections throughout. **PASS.**
- **jsonb return sanitized:** jsonb **source** columns are surfaced **only as counts/labels/booleans** —
  e.g. `'has_default', (default_value_safe is not null)`, `'missing_field_count',
  coalesce(jsonb_array_length(missing_fields),0)`, proof/platform/client as small object summaries, audit
  with `no_secret_assertion`/`no_mutation_assertion` booleans + `inventory_hash`. **No raw provider/render/
  publish payloads, no secrets, no unbounded jsonb.** **PASS.**
- Evidence/proof outputs are **ids/kinds/hashes/summaries only** (`evidence_reference_id`, `evidence_kind`,
  `proof_type`, `proof_status`, `occurred_at`) — **no payload.** **PASS** (see §N-013 note on exposing the
  soft evidence id — a non-secret internal id; security-auditor confirms acceptability).

---

## H. Grants / EXECUTE posture review

- Candidate grant block: `REVOKE EXECUTE ON FUNCTION … FROM public, anon, authenticated;` (names all
  three — the standing gotcha honoured) + `GRANT EXECUTE ON FUNCTION … TO service_role;` for each of the 3
  functions (grep-confirmed: 3 revoke + 3 grant lines). **PASS.**
- **No direct browser-role EXECUTE** (no anon/authenticated grant). Server-action/backend mediation
  expected (browser never calls the function). **The functions should be callable only by `service_role`
  initially** — confirmed by the grant block. **PASS.**

---

## I. Source table access review

- The candidate SQL reads **only** the 8 intended TMR tables (grep-confirmed: 20 `c.creative_*` refs; **0**
  `from m.` / `join m.` / `from c.client` / `from t.`):
  `creative_template_family · creative_provider_template · creative_provider_template_field ·
  creative_template_platform_suitability · creative_template_variant_candidate ·
  creative_template_client_assignment · creative_template_inventory_audit · creative_template_proof_event`.
- **No access to:** provider credentials · raw provider data · unrelated operational tables · `m.*`
  render/publish tables (the `evidence_reference` is a **text column**, not a join to `m.*`) · `c.client`
  directly · any secret-bearing table. **PASS.**

---

## J. Lifecycle rollup review

- The packet's §H rollup **spec** is **conservative** and preserves `inventory_captured ≠ renderable ≠
  platform_safe ≠ client_enabled ≠ production_proven`:
  - unknown/not_captured are **not** optimistic (uncaptured → `inventory_missing`/`unknown`);
  - **blockers cap** the displayed lifecycle;
  - `needs_template_edit` caps renderability;
  - `platform_candidate` does **not** become `platform_safe`;
  - assignment does **not** become enablement (`unassigned`/`assigned_candidate` floors);
  - **`production_proven` ONLY** with a real `platform_publish` proof_event where `proof_status='passed'`
    (packet §H rule 9; grep-confirmed line 335);
  - **no proof event is treated as publish permission** (§I). **PASS (spec).**
- **Executable caveat:** the conservative rollup is currently expressed as **§H prose + placeholder helper
  calls** in the list function, not yet as the final inlined CASE. The **implementation must encode §H
  exactly as an inlined CASE** and **external review must confirm SQL correctness** of that CASE
  (especially the `production_proven` EXISTS-check). → **§N-001 / §N-008 (IMPL-VERIFY).**

---

## K. Empty-state review

- Empty registry → `get_tmr_template_list()` returns `rows: []` (`coalesce(jsonb_agg(...), '[]')`).
- `get_tmr_template_filters()` → empty distinct arrays (`coalesce(..., '[]')`) + static vocabularies.
- `get_tmr_template_detail(<unknown uuid>)` → `{ not_found: true }` (`coalesce(... , jsonb_build_object('not_found', true))`).
- **No fake `490ad9ea` row · no fake `quote_card.v1` availability · no fake `market_update.v1` proof.** **PASS.**

---

## L. `c` schema exposure carry

- v4.40 could **not SQL-prove** the literal PostgREST exposed-schema config (`pgrst.db_schemas` null);
  browser roles have **zero table privileges + deny-all RLS** on the TMR tables (verified at apply).
- The read RPC **does not rely on browser-direct `c.*` access** (functions are service-role-only EXECUTE;
  server-action-mediated). **This carry does NOT block the read RPC packet.**
- Future implementation **should verify the exposed-schema config or demonstrate PGRST106** if possible
  (§N-010, IMPL-VERIFY).

---

## M. Future implementation verification (at migration create/apply — NOT now)

- Functions created with intended **owner `postgres`**; **SECURITY DEFINER** present; **`search_path`
  pinned** `'public, pg_temp'`; **volatility STABLE**.
- **EXECUTE** revoked from PUBLIC/anon/authenticated; granted to `service_role` only.
- Functions **return empty-state safely** on the empty registry (list `[]`, detail `not_found`).
- **No table privileges added for browser roles**; no RLS/grant change to the base tables.
- The list-function rollup/blocker logic is **inlined as explicit CASE** (no helper function, no dynamic
  SQL) and encodes §H exactly (§N-001).
- **No runtime/dashboard code** created unless separately approved.

---

## N. Findings

| ID | Severity | Location | Description | Required action | Blocks security-auditor? |
|---|---|---|---|---|---|
| **TMR-READ-DBRLS-001** | WARNING + IMPL-VERIFY | §E.1 list fn (lines 135/140/187) | List SQL references placeholder helpers `public_tmr_rollup`/`public_tmr_blockers`; packet NOTE says inline as CASE at impl (no helper, no dynamic SQL) | The final migration SQL MUST inline the §H rollup + blocker logic as an explicit CASE; external review confirms SQL correctness | **No** (design/posture sound; inlining is an impl + external-review task) |
| **TMR-READ-DBRLS-002** | PASS | §D | SECURITY DEFINER justified (c.* non-exposed/service-role-only); STABLE; owner postgres; no mutation/provider/dynamic SQL | None | No |
| **TMR-READ-DBRLS-003** | PASS | §E | `search_path` pinned on all 3 fns; c.* schema-qualified; built-ins via public | None | No |
| **TMR-READ-DBRLS-004** | PASS | §F | Read-only — 0 INSERT/UPDATE/DELETE/DDL/dynamic-SQL/provider call | None | No |
| **TMR-READ-DBRLS-005** | PASS | §G | No `SELECT *`; explicit jsonb projection; jsonb cols summarized; no raw payload/secret | None | No |
| **TMR-READ-DBRLS-006** | PASS | §H | REVOKE EXECUTE FROM public/anon/authenticated + GRANT EXECUTE TO service_role only | None | No |
| **TMR-READ-DBRLS-007** | PASS | §I | Reads only the 8 TMR tables; no m.*/c.client/secret-bearing access | None | No |
| **TMR-READ-DBRLS-008** | IMPL-VERIFY | §J | Conservative rollup spec correct; executable inlined CASE must match §H (tied to 001) | Confirm at impl + external review | No |
| **TMR-READ-DBRLS-009** | PASS | §K | Empty-state safe (list `[]`, filters `[]`+vocab, detail `not_found`); no fake rows/proof | None | No |
| **TMR-READ-DBRLS-010** | IMPL-VERIFY | §L | c PostgREST exposed-schema not SQL-provable (carry) | Verify config / PGRST106 at apply; read path already server-mediated | No |
| **TMR-READ-DBRLS-011** | IMPL-VERIFY | §G | `jsonb_array_length(missing_fields)` errors if `missing_fields` is non-array jsonb | Guard with `jsonb_typeof(...)='array'` (or ensure write-path always stores an array) | No |
| **TMR-READ-DBRLS-012** | IMPL-VERIFY | §M | At migration create/apply: confirm owner/SECDEF/search_path/STABLE/grants/empty-state | Apply-lane verification | No |
| **TMR-READ-DBRLS-013** | PASS (note) | §G | DTO exposes `evidence_reference_id` (a soft internal id, not a secret/payload) | security-auditor confirms acceptability for operator provenance | No |

**Totals:** 0 BLOCKER · 1 WARNING (001) · 4 IMPLEMENTATION-LANE VERIFY (008, 010, 011, 012) · 8 PASS.

---

## O. Final verdict

**✅ 1. CLEAN FOR SECURITY-AUDITOR REVIEW.**

No DB/RLS **blocker** was found. The proposed read RPCs are **read-only, SECURITY DEFINER-justified,
`search_path`-pinned, schema-qualified, `SELECT *`-free, service-role-only-EXECUTE, payload/secret-free,
and limited to the 8 TMR tables**, with a **conservative lifecycle rollup spec** (production_proven only
from a real `platform_publish`/`passed` proof_event) and safe empty-state. The one WARNING
(TMR-READ-DBRLS-001) is that the list function's rollup/blocker logic is shown as **placeholder helper
calls** that the packet itself flags for **inlining as an explicit CASE at implementation** — a known
design device, resolved at the implementation + external-review SQL-correctness step, **not** a blocker to
security-auditor review. The IMPL-VERIFY items are confirmations the implementation/apply lane performs.

**Recommended next lane: TMR Read RPC security-auditor Review** (carry TMR-READ-DBRLS-001…013; the
security-auditor focuses on secrets/payload minimisation, candidate-vs-proven separation, the
`production_proven` proof-chain + anti-fabrication implication, and the `evidence_reference_id` exposure).

---

## Explicit non-claims / scope
- **Docs/register only** — no migration file, no RPC created, no `execute_sql`/`apply_migration`/DB
  command, **no live DB inspection/mutation**, no dashboard/server-action/runtime code, no
  `supabase/migrations/` edit, no provider API call, no render/publish/binding/enablement/deploy, no seed,
  **no secrets.**
- The reviewed **packet** (`6f961fdd…`) and the **migration file** (`f6733fa7…`) were **not modified** —
  their hashes are stable.
- Items needing live truth are explicitly **IMPLEMENTATION-LANE VERIFY** — no live DB inspection done or implied.
- The registry is live but **empty**; **no template is bound/enabled/proven**. `quote_card.v1` stays
  `needs_template_edit`/blocked; `market_update.v1` a strong candidate but defined/unwired; `news_card.v1`
  production-proven PP × facebook+instagram only.

## Cross-references
- Reviewed packet: `…-read-rpc-implementation-packet-draft.md` (v4.42, `6f961fdd…`).
- Read contract design: `…-read-contract-rpc-design-packet.md` (v4.41).
- Applied schema: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql` (v4.40, `f6733fa7…`).
- Proven RPC convention: `…_gfcp_slice1a_…_rpc.sql`, `…_ppp_slice1a_…_rpc.sql`.
- Register: v4.43 (this review).
