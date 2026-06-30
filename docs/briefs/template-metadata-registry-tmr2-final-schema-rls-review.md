# TMR-2 — Final Schema / RLS Design Review (docs/design review only)

> **Status:** final schema/RLS **design review only**. **This is NOT a migration.** No Supabase table,
> migration, `execute_sql`, `apply_migration`, DDL/DML, RLS/grant mutation, SECURITY DEFINER RPC, read
> RPC, runtime/edge/dashboard/CCF code, provider API call, render, publish, template binding, client/
> template/variant/platform enablement, or deploy is authorised by this document. No `property-pulse.json`/
> `creative_contract.ts`/`registry-schema-v2.md`/schema change. No secrets in docs.
> **Produced:** 2026-06-30 (CE session). **Type:** docs/design review (+ register record).
> **CE state at write time:** `main == origin/main == 497e8244ecb3a686152fde0f3d7a9cf4c544722b`;
> register **v4.33**. CCF-01 Phase 1 guards remain dry-run / log-only — not modified.
> **Truthfulness note:** this review reasons over the **design docs only** — it requires **no live DB
> inspection** to be truthful (it ratifies a *proposed* model against proven ICE patterns, it does not
> assert live schema state).

---

## A. Review status

- **Reconciled against TMR-1 v4.32 and the v4.33 follow-on design pack.** The schema serialises the
  **final** TMR-1 object model (`template-metadata-registry-v1-design.md` §0/§2–§11).
- This is a **final schema/RLS design review** — it resolves or explicitly defers the open decisions and
  produces a **migration-planning-ready** design position.
- **This is not a migration.** It does **not** authorise DB mutation, table/schema creation, RLS/grant
  change, RPC implementation, or any runtime/dashboard/provider/render/publish/binding/enablement/deploy
  work.

---

## B. Source documents reviewed

| Doc | Role |
|---|---|
| `docs/briefs/template-metadata-registry-v1-design.md` | TMR-1 canonical object model (authoritative) |
| `docs/briefs/template-metadata-registry-tmr2-schema-rls-proposal.md` | TMR-2 proposal (8 tables, posture, OD-1…OD-7) |
| `docs/briefs/tmr-dashboard-readonly-view-design-brief.md` | read-only `/create/templates` view (read contract consumer) |
| `docs/briefs/creative-intake-template-wizard-flow-v2.md` | template-led wizard flow (write/capture consumer) |
| register **v4.33** context | the consolidated follow-on pack + TMR-2 reconciliation |

**TMR-1 object model extracted (authoritative spine):** template family · provider template · provider-
template field inventory · output contract · platform suitability (first-class, per-platform) · variant
candidate mapping · client/brand assignment · governance/proof lifecycle · audit/change tracking · future
Supabase direction (8 named tables). **TMR-2 proposal extracted:** the 8 `c.creative_template_*` tables ·
`text + CHECK` status vocabularies · schema placement (Option A `c.*` non-REST-exposed) · RLS/grant
posture (Option A RLS-off service-role-only vs Option B deny-all) · read via SECURITY DEFINER RPC ·
no-secrets attestations · OD-1…OD-7 · strawman DDL marked `DESIGN ONLY — not executed`.

**Consumer-fit confirmation (follow-on docs):** the model **supports** the read-only `/create/templates`
view (one row per provider template + per-platform suitability + variant-candidate + assignment +
lifecycle/proof — all from these tables, no synthesised data), the **template-led wizard** (each step
populates one table: provider-template → field → family → suitability → variant-candidate → assignment →
audit → proof-event), **no optimistic seeded data** (empty registry = honest empty state; partial =
explicit `unknown`/`missing`), the **capture/proposal-before-proof** flow (lifecycle states gate proof),
the **dashboard read contract later** (SECURITY DEFINER read RPC / server-action), and the **governance
proof chain later** (`creative_template_proof_event` separates proof from capability).

---

## C. Final table model recommendation (the 8 tables)

All 8 are **confirmed** (no table added/removed vs the proposal). All in schema `c.` (§D). PK strategy:
**surrogate `id uuid primary key default gen_random_uuid()`** (PG13+ core built-in; no `pgcrypto`) for
every table — stable identity independent of provider/natural keys. `created_at/updated_at timestamptz
not null default now()`. All status fields `text + CHECK` (§G/OD-3).

| # | Table | Purpose | Key natural-uniqueness | TMR-1 obj | First migration? | Security |
|---|---|---|---|---|---|---|
| 1 | `c.creative_template_family` | reusable creative pattern | unique `family_key` | §2 | **yes** (parent) | service-role-only |
| 2 | `c.creative_provider_template` | exact external asset (inventory object first) | unique `(provider, provider_template_id)` | §3 | **yes** (core) | service-role-only; **no secrets** |
| 3 | `c.creative_provider_template_field` | per-element field inventory | unique `(template_id, element_name)` | §4 | **yes** | service-role-only; sanitized only |
| 4 | `c.creative_template_platform_suitability` | first-class per-platform fit | unique `(template_id, platform, placement)` | §6 | **yes** | service-role-only |
| 5 | `c.creative_template_variant_candidate` | candidate variant mapping (NOT binding) | unique `(template_id, variant_key)` | §7 | **yes** | service-role-only |
| 6 | `c.creative_template_client_assignment` | scoped client/brand permission | partial-unique `(template_id, client_id)` | §8 | **yes** | service-role-only |
| 7 | `c.creative_template_inventory_audit` | append-only capture/change audit | — (append-only) | §10 | **yes** | INSERT+SELECT only, no UPDATE/DELETE |
| 8 | `c.creative_template_proof_event` | platform/render/publish proof (separate from capability) | — | §9 | **yes** | service-role-only |

**First-migration scope decision:** **all 8 in one reviewable migration.** Rationale: the FK graph
(family → provider_template → {field, suitability, variant_candidate, assignment, proof_event}; audit
soft-linked) is cohesive; splitting it adds migration-ordering risk for no benefit. **None is deferred.**
(If PK prefers a thinner first cut, the minimum coherent core is tables 1–4 + 7; but the recommendation
is all 8.)

**Essential columns** are as enumerated in the TMR-2 proposal §3.1–§3.8 and map 1:1 to TMR-1 fields;
this review changes **no column set** beyond the OD resolutions below (§G–§J).

---

## OD reconciliation (two numbering schemes)

The directive's section→OD map differs from the TMR-2 proposal's own OD numbering. Both are resolved
here; this table is the authoritative cross-walk so nothing is ambiguous:

| Topic | Proposal OD | Directive § | Resolution (this review) |
|---|---|---|---|
| Schema placement | OD-1 | D | **`c.*` non-REST-exposed (Option A)** — recommended; PK/security ratifies |
| RLS / grants posture | OD-2 | E | **service-role-only; RLS-off non-exposed (Option A), deny-all RLS optional hardening** |
| Read-access model | (RPC in §4) | F | **SECURITY DEFINER read RPC / server-action; server-side only; sanitized** |
| Enum / status strategy | OD-3 | G (vocab) | **`text + CHECK`** (evolvable) — confirmed |
| Family linkage | OD-4 | (C/H) | **surrogate `family_id` + unique `family_key`** — confirmed |
| Field inventory model | (§3.3) | H | **confirmed** (per-element rows, sanitized; §H) |
| Cross-schema integrity | OD-5 | J | **soft refs first** (no FK into `c.client`/`m.*`) |
| Audit immutability | OD-6 | (E) | **grant-only append-only (v0)** |
| Proof modelling | OD-7 | I | **separate `creative_template_proof_event` table** |

> Every open decision is resolved to a recommended position below. The security-sensitive ones (schema
> placement, RLS hard/soft) are recommended here and **ratified at the db-rls-auditor / security-auditor
> review** before any migration — that review is part of migration-packet planning, not a blocker on it.

---

## D. Schema placement (resolves OD-1)

**Final recommendation: place all 8 as `c.creative_template_*` in the existing non-REST-exposed `c.`
schema.** Do **not** create a new exposed schema; do **not** expose via public REST.

- **Rationale:** mirrors the proven `c.*` service-role-only, non-REST-exposed posture
  (`c.client_control_tower_enrollment` / `c.client_format_mix_audit`, register v4.13) — lowest novelty,
  one proven pattern, advisors stay quiet. TMR is governance/operator-written metadata, not high-
  frequency runtime.
- **Tradeoffs:** a non-REST-exposed schema means a direct PostgREST read returns **PGRST106** — so
  dashboard reads must go through a **SECURITY DEFINER read RPC** or a service-role server-action (§F),
  never a browser-direct table read. (A dedicated `creative_template`/`tmr` schema would give a cleaner
  namespace but introduces a new REST-exposure decision + new advisor surface — deferred unless PK wants
  the separation.)
- **Security review must confirm later:** the schema is genuinely non-exposed; no `anon`/`authenticated`
  reach; advisors clean after creation.

---

## E. RLS / grants posture (resolves OD-2 + audit immutability OD-6)

**Final recommendation (service-role-only):**
- For every table: `REVOKE ALL ON … FROM PUBLIC, anon, authenticated;` then `GRANT … TO service_role;`
  — **revoking from `PUBLIC` alone is insufficient; `anon, authenticated` must be named** (standing ICE
  gotcha). No direct `anon`/`authenticated` table access anywhere.
- **RLS choice — Option A (recommended):** **RLS OFF** on the non-REST-exposed `c.` schema with grants
  locked to `service_role` (which bypasses RLS regardless). This is the proven minimal-surface posture.
  **Option B (optional hardening):** **RLS ON, deny-all (no permissive policies)** as belt-and-braces if
  project convention prefers it / if any table ever risks REST exposure. **Recommendation: A, with the
  door open to B at the security review.**
- **Audit table immutability (OD-6):** `c.creative_template_inventory_audit` gets **INSERT + SELECT** to
  the writer role, **no UPDATE/DELETE grant** — append-only by grant in v0 (a revoke/trigger hardening is
  a later option, not v0).
- **Browser access:** only via a reviewed read RPC / server-action (§F) — never direct.

- **Why it fits ICE security posture:** identical to the shipped PPP/GFCP/Control-Tower service-role-only,
  non-exposed model; no new privilege surface; no grant widening.
- **What db-rls-auditor must review before migration:** the exact REVOKE/GRANT set on all 8 tables; that
  no table is REST-reachable; the audit-table append-only grant shape; RLS on/off decision; advisor output
  post-design; and that the (later) read RPC is `SECURITY DEFINER` + `STABLE` + pinned `search_path` +
  EXECUTE service-role-only + whitelist-output (no secrets/raw payloads).

---

## F. Read-access model (resolves OD-3 / directive F)

**Future read model (no implementation here):**
- **No direct browser table reads** (PGRST106 + secret-surface). All reads server-side.
- The read-only **`/create/templates`** page consumes a **SECURITY DEFINER read RPC**
  (e.g. `public.get_template_metadata_registry(...)`) **or** a service-role server-action assembly —
  proven PPP/GFCP Slice-1A pattern: owner `postgres`, `STABLE`, pinned `search_path = public, pg_temp`,
  schema-qualified, no dynamic SQL, EXECUTE revoked from PUBLIC/anon/authenticated and granted only to
  `service_role`, **server-side only**.
- The **Creative Intake wizard** lookup/read steps use the same server-side read path (and a service-role
  write RPC / server-action for drafts — out of scope here).
- **Returns safe summaries only:** whitelisted field set; **evidence IDs / `inventory_hash` allowed**;
  **no provider secrets, no raw provider payloads, no tokens, no raw `render_spec` dumps.** Raw inventory
  payloads are avoided unless explicitly sanitized and justified at the read-RPC security review.
- The read RPC / server-action is a **later TMR-3+ implementation artifact** — named here for completeness,
  not designed in detail, not built.

---

## G. Status and lifecycle vocabularies (resolves OD-4 enum strategy / directive G)

**Strategy: `text + CHECK` for every status field** (cheap to evolve via a later migration vs a hard PG
`enum` type that TMR churn would make painful). Confirmed vocabularies (from TMR-1 + proposal):

- **template family status:** `draft` / `active` / `deprecated` / `blocked`.
- **provider template inventory_status (CI-3):** `missing` / `requested` / `captured_from_docs` /
  `captured_from_provider_read` / `captured_from_manual_entry` / `captured_from_render_probe` / `verified`
  / `stale` / `blocked`.
- **provider template lifecycle status (TMR-1 §9):** `discovered` / `inventory_requested` /
  `inventory_captured` / `inventory_verified` / `classified` / `field_mapped` / `governance_reviewed` /
  `smoke_rendered` / `visually_approved` / `platform_safe` / `client_enabled` / `production_proven` /
  `deprecated` / `blocked`.
- **field_kind:** `text` / `image` / `logo` / `background` / `shape` / `audio` / `video` / `unknown`
  (+ booleans `dynamic`, `required_for_render`).
- **platform suitability_status:** `unknown` / `candidate` / `not_suitable` / `needs_review` /
  `platform_safe` / `production_proven` / `blocked`.
- **variant candidate fit_status:** `unknown` / `candidate` / `strong_candidate` / `weak_candidate` /
  `needs_template_edit` / `unsuitable` / `blocked`.
- **client assignment_scope:** `generic_allowed` / `brand_allowed` / `client_allowed` / `client_blocked`
  / `pilot_only`. **assignment_status:** `proposed` / `approved` / `visually_approved` / `client_enabled`
  / `production_proven` / `deprecated` / `blocked`.
- **proof event proof_type:** `smoke_render` / `visual_approval` / `platform_render` / `platform_publish`
  (+ `capture_method` on audit: `manual_sanitized_export` / `provider_read_endpoint` / `connector_read`
  / `render_probe` / `unknown`).
- **lifecycle rollup (UI, derived — not stored):** capped by the weakest proven layer.

**TMR principle preserved (binding):** `inventory_captured ≠ renderable ≠ platform_safe ≠ client_enabled
≠ production_proven`. The vocabularies + the separate proof table (§I) enforce that no state implies a
later one; `production_proven` anywhere requires a real `proof_event`, never inference.

---

## H. Field inventory model (resolves directive H / family-linkage OD-4-proposal)

**Confirmed:** one row per element in `c.creative_provider_template_field`, adapter-shaped (Creatomate
first; HeyGen/future via the same table with provider-appropriate values):
- `element_name` / `element_id` (provider key) · `element_type` (provider) · `track` · `dynamic`
  (bool) · `required_for_render` (bool) · `field_kind` (semantic role) · `default_value_safe`
  (only if non-sensitive) · `style_summary` (sanitized) · `constraints` (jsonb).
- **Sensitive/raw-value handling:** never store secrets or raw sensitive content; `default_value_safe`
  and `style_summary` are sanitized-only; **raw provider payloads are not stored** — the
  `inventory_hash` + `inventory_source`/`captured_*` on the parent template (and the audit table)
  reference a capture without storing its raw payload.
- **Family linkage (proposal OD-4):** **surrogate `family_id` FK + a unique `family_key`** on the family
  table — confirmed (stable id, human-readable natural key both available).
- **Change tracking:** field-level edits are recorded via `c.creative_template_inventory_audit`
  (`changed_fields jsonb`), not via per-row history columns in v0.

> Sample (illustrative, from `490ad9ea…`): Background(image/background/dynamic), CategoryBadge(text/label/
> dynamic), Logo(image/logo/dynamic), Headline/Subtitle/Location/Date/Footer(text/dynamic), Scrim(shape/
> **fixed**). No raw values stored — names/kinds/flags only.

---

## I. Proof and evidence model (resolves OD-7-proposal / directive I)

**Confirmed: a separate `c.creative_template_proof_event` table** (proof is first-class and separate from
capability — **not** folded into suitability/assignment). It represents proof for:
- **inventory capture** + **sanitized manual capture** → recorded on `c.creative_template_inventory_audit`
  (`capture_method = manual_sanitized_export` / `provider_read_endpoint` / `connector_read`), **not** a
  proof_event (capture is not proof);
- **render proof** → `proof_type = smoke_render` / `platform_render`;
- **visual approval** → `proof_type = visual_approval`;
- **platform proof** → `proof_type = platform_render` / `platform_publish` (per-platform);
- **client assignment proof** → linked via `assignment_id`;
- **production proof** → requires a real `platform_publish` proof_event for `client × platform × variant`.

`evidence_reference` (soft ref → `m.post_render_log` / `m.post_publish` id) + `evidence_kind` capture the
operational evidence **by id/hash, without raw payload exposure**.

**Stated clearly (binding):** proof is **separate from capability**; **platform suitability is not
production proof**; a **candidate variant is not governed/usable until the proof chain exists**; evidence
references IDs/hashes, **never raw payloads or secrets**.

---

## J. Cross-schema relationship strategy (resolves OD-5-proposal / directive J / OD-7-directive)

**Final recommendation: soft references first (hybrid leaning soft).**
- **In-registry FKs are real** (family → provider_template → field/suitability/variant/assignment/proof),
  `on delete cascade` for child inventory, `set null` where a parent is optional. These are stable,
  same-schema, low-churn — keep them hard.
- **Cross-schema references are soft (no FK):** `client_id → c.client`, `evidence_reference →
  m.post_render_log / m.post_publish`, `proof_reference`. **Rationale:** governance metadata must not
  hard-couple to (or block writes against) evolving operational tables; `m.*` is service-role-only with
  its own lifecycle. **Keep the evidence-reference fields explicit and typed** (uuid/text + an
  `evidence_kind` discriminator); integrity asserted at write time by the wizard/RPC, not a DB FK.
- **Revisit** hard FKs (e.g. `client_id → c.client`) **after stable use**, if churn proves low.

---

## K. Migration packet readiness (what a future TMR-3 packet needs — NOT built here)

A future **TMR-3 migration packet** (separate, gated) must contain:
- **Exact table list:** the 8 `c.creative_template_*` tables (§C).
- **Enum/CHECK definitions:** every `text + CHECK` vocabulary in §G.
- **Indexes:** per proposal §6 (unique business keys + the dashboard/roll-up btrees).
- **Unique constraints:** `(provider, provider_template_id)`; `(template_id, element_name)`;
  `(template_id, platform, placement)`; `(template_id, variant_key)`; partial-unique
  `(template_id, client_id)`.
- **Grants:** `REVOKE … FROM PUBLIC, anon, authenticated` + `GRANT … TO service_role` (audit = INSERT+SELECT only).
- **RLS choice:** Option A (off, non-exposed) or B (deny-all) — ratified at security review.
- **Audit insert path:** the writer (wizard/RPC) writes audit rows with `no_secret_assertion` /
  `no_mutation_assertion` set; append-only.
- **Seed policy:** **no seed data** (no optimistic rows; the registry starts empty — the dashboard
  degrades honestly). At most, the single known `490ad9ea…` row could be inserted later **as real
  captured data**, never as a seed in the migration.
- **Rollback posture:** a single migration creating all 8 tables; rollback = drop the 8 tables (no data
  dependence at creation). Migration name = permanent identity; a revision gets a new timestamp + name.
- **Gate trail (mandatory, in order):** **db-rls-auditor** → **security-auditor** → **external review on
  the final SQL** → **PK apply HARD STOP** (`apply_migration`; `execute_sql` fallback only if
  harness-denied, with the ledger-backfill carry). **None of this is authorised now.**

---

## L. Non-goals and hard stops (repeat)

**No** migration · `execute_sql` · `apply_migration` · DB mutation · table/schema creation · RLS/grant
change · SECURITY DEFINER/read RPC implementation · runtime code · edge function · dashboard/app code ·
provider call (Creatomate/HeyGen) · render · publish · template binding · client/template/variant/platform
enablement · deploy · CCF change · `.claude//_harness/` change · `property-pulse.json`/`creative_contract.ts`/
`registry-schema-v2.md`/schema change · secrets in docs. The TMR-2 strawman DDL remains **illustrative /
proposal-only — not executable-now, not authorised for migration, not applied.**

---

## M. Final recommendation

**✅ CLEAN FOR MIGRATION PACKET PLANNING.**

The TMR-2 schema/RLS design is **internally complete and consistent with TMR-1 and the v4.33 follow-on
pack**; all open decisions are resolved to recommended positions (§D–§J / the OD cross-walk); the model
**supports** the read-only view and the template-led wizard without optimistic data; and the path to a
migration is the standard gated trail (§K). **The design is ready to be converted into a separate TMR-3
migration packet — but no DB change is authorised yet.** The security-sensitive defaults (schema
placement, RLS hard/soft) are recommended here and **ratified at the db-rls-auditor / security-auditor
review**, which is part of migration-packet planning, not a blocker on it.

> No item rises to PARTIAL (no decision blocks *drafting* a packet) or BLOCKED (no missing source / model
> conflict; no live DB inspection required). The one judgement PK may still wish to make explicitly —
> `c.*` vs a dedicated schema, and RLS-off vs deny-all — has a clear recommended default and a named
> security-review gate, so it does not block packet drafting.

---

## Explicit non-claims / scope
- **Docs/design review only** — no DB/migration/`execute_sql`/`apply_migration`/RLS/grant/RPC, no
  runtime/edge/dashboard/CCF code, no provider API call, no render/publish/binding/enablement/deploy, no
  `property-pulse.json`/`creative_contract.ts`/`registry-schema-v2.md`/schema change, **no secrets.**
- TMR-2 strawman DDL stays illustrative/proposal-only; this review authorises **no** SQL execution.
- `quote_card.v1` remains `needs_template_edit`/blocked; `market_update.v1` a strong candidate but
  defined/unwired; `news_card.v1` production-proven PP × facebook+instagram only. No proof borrowed.

## Cross-references
- TMR-1 canonical model: `docs/briefs/template-metadata-registry-v1-design.md` (v4.32).
- TMR-2 proposal (this review supersedes its OD set): `docs/briefs/template-metadata-registry-tmr2-schema-rls-proposal.md` (v4.33).
- Read-only view: `docs/briefs/tmr-dashboard-readonly-view-design-brief.md` (v4.33).
- Template-led wizard: `docs/briefs/creative-intake-template-wizard-flow-v2.md` (v4.33).
- Proven service-role non-exposed posture: Control Tower P1 (register v4.13); read-RPC posture: PPP/GFCP Slice-1A.
- Register: v4.34 (this review).
