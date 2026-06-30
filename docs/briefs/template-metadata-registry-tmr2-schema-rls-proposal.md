# Template Metadata Registry — TMR-2 Supabase Schema / RLS Proposal (DESIGN ONLY)

> **Status:** schema/RLS **design proposal only** (reconciled against final TMR-1 v4.32 / `f900eb8`; a
> **proposal for review, not a migration packet**). **No Supabase table, no
> migration, no `execute_sql`, no `apply_migration`, no DDL, no DML, no RLS change, no grant change,
> no deploy, no runtime/edge/dashboard/CCF code change, no provider API call.** This brief proposes
> SQL *shapes* in fenced blocks as design illustration; **none is executed.**
> **Produced:** 2026-06-30 (CE session — Session 2). **Type:** docs/design only.
> **Builds on:** `docs/briefs/template-metadata-registry-v1-design.md` (TMR-1 v1 design, register
> v4.32) — specifically TMR-1 §2–§10 (the object models) and §11 (the 8 named candidate tables).
> **CE state at write time:** `main == origin/main == 502b31c` (per session bootstrap; HEAD re-checked
> at write). CCF-01 Phase 1 guards remain dry-run / log-only — not modified.

---

## 0. RECONCILIATION GATE — RECONCILED AGAINST FINAL TMR-1 (v4.32 / f900eb8)

**Reconciled against TMR-1 v4.32 / f900eb8.** This remains a **design-only schema/RLS proposal.** **No
migration, table creation, grant/RLS mutation, read RPC implementation, dashboard implementation,
provider call, render, publish, binding, or production enablement is authorised by this document.**

TMR-1 is **complete** (`docs/briefs/template-metadata-registry-v1-design.md`, register **v4.32**, commit
`f900eb8`). The schema below serialises the **final** TMR-1 §2–§10 object models and §11's 8 named
candidate tables — it no longer waits on any further TMR-1 output. The remaining items are **design
decisions for PK / a TMR-2 security review** (not blockers on a finalisation); they are carried in §9
(OD-1…OD-7):

- the **enum/status value sets** for every lifecycle field (§9 lifecycle, inventory_status,
  suitability_status, fit_status, assignment_scope/status, capture_method) — kept as `text + CHECK` so
  they can evolve cheaply via a later migration;
- the **field inventory column set** (§4) and which fields are `required_for_render`;
- **family linkage** by surrogate `family_id` + a unique `family_key` (this proposal's choice; revisit
  at the security review);
- the **scope vocabulary** (`generic` / `brand` / `client`) and how brand is keyed (`brand_key` text
  vs a brand table);
- whether **proof events** are a separate table or folded into platform-suitability / assignment;
- the **schema placement** (§2) and REST-exposure posture (§4) — both are PK/security calls.

Treat the SQL below as a **structured strawman / proposal for review**, not a schema of record. The
TMR-2 migration packet is cut **only later, on PK approval**, through the standard gate trail (§8).

---

## 1. Scope and non-goals

**In scope (this brief):** propose the table shapes, keys, constraints, indexes, RLS/grant posture,
schema placement, REST-exposure stance, read-access pattern, and migration-naming discipline for the
8 TMR tables — as a **reviewable design**, so that when TMR-1 is final the TMR-2 migration packet can
be cut quickly through the normal gate trail.

**Hard non-goals:** no migration file, no DDL/DML execution, no `execute_sql`/`apply_migration`, no
RLS/grant mutation, no schema creation, no deploy, no provider call, no binding/render/publish, no
production enablement, no dashboard or CCF code, no `registry-schema-v2.md` change (that governs the
declarative Creative Library JSON — a separate concern, per TMR-1 §11).

---

## 2. Schema placement (decision — flagged for PK / security review)

The TMR tables are **operator-/governance-written metadata**, not high-frequency runtime, and must be
**service-role-only** (no anon/authenticated direct access). Two placements:

- **Option A (recommended) — existing `c.*` schema (creative/client, non-REST-exposed).** Mirrors the
  proven posture of `c.client_control_tower_enrollment` / `c.client_format_mix_audit` (register v4.13):
  non-REST-exposed, RLS off, service-role-only, advisors quiet. Lowest novelty; one proven pattern.
- **Option B — a new dedicated `creative_template` (or `tmr`) schema.** Cleaner namespace, but
  introduces a **new-schema REST-exposure decision** and new advisor surface. Defer unless PK wants
  the namespace separation.

**Recommendation:** **Option A** — place all 8 as `c.creative_template_*` to inherit the proven
non-REST-exposed service-role posture. (Table names below omit the schema prefix for readability; read
them as `c.creative_template_*`.) **Final placement is a PK/security decision, not locked here.**

> **REST-exposure gotcha (carry):** a non-REST-exposed schema means a direct PostgREST read returns
> **PGRST106**. Dashboard reads must therefore go through a **SECURITY DEFINER read RPC** (the proven
> PPP/GFCP Slice-1A pattern) or service-role server-action assembly — see §4. No table here is browser-
> readable.

---

## 3. Proposed tables (strawman DDL — NOT executed)

Conventions: surrogate `id uuid primary key default gen_random_uuid()` (PG13+ core built-in — no
`pgcrypto` needed); `created_at/updated_at timestamptz not null default now()`; all status/enum fields
are `text` + `CHECK` (cheap to evolve via a later migration vs a hard PG enum type, which TMR-1 churn
would make painful); cross-schema references to `c.client` / `m.post_render_log` / `m.post_publish`
are kept as **soft references (uuid/text, no FK)** to avoid coupling governance metadata to operational
tables — flagged per table.

### 3.1 `creative_template_family` (TMR-1 §2)

```sql
-- DESIGN ONLY — not executed
create table c.creative_template_family (
  id                        uuid primary key default gen_random_uuid(),
  family_key                text not null unique,                 -- e.g. generic.real_estate.market_insight_card
  family_name               text not null,
  creative_purpose          text,
  default_format_candidate  text,                                  -- candidate ice_format_key (NOT FK — candidate ≠ binding)
  default_variant_candidate text,                                  -- candidate variant_key (NOT FK)
  scope                     text not null check (scope in ('generic','brand','client')),
  industry_vertical         text,
  description               text,
  brand_constraints         jsonb,                                 -- optional, only if brand-scoped
  status                    text not null default 'draft',         -- family lifecycle (enum set pending TMR-1 final)
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
```

### 3.2 `creative_provider_template` (TMR-1 §3)

```sql
-- DESIGN ONLY — not executed
create table c.creative_provider_template (
  id                         uuid primary key default gen_random_uuid(),
  provider                   text not null,                        -- creatomate | heygen | future (soft check, extensible)
  provider_template_id       text not null,                        -- external id, NOT a secret
  provider_template_name     text,                                 -- may be misleading (TMR-1 §1)
  family_id                  uuid references c.creative_template_family(id) on delete set null,
  scope                      text not null check (scope in ('generic','brand','client')),
  client_id                  uuid,                                 -- soft ref → c.client (no FK); only if client-scoped
  brand_key                  text,                                 -- only if brand-scoped
  width                      int,
  height                     int,
  aspect_ratio               text,
  output_type                text check (output_type in ('static_image','animated_image','video','audio','unknown')),
  file_type_candidate        text,
  duration_seconds           numeric,
  provider_project_reference text,                                 -- sanitized only (no secrets)
  inventory_status           text not null default 'missing',      -- CI-3 status set (pending TMR-1 final)
  inventory_source           text,                                 -- capture_method (TMR-1 §10)
  captured_by                text,
  captured_at                timestamptz,
  inventory_hash             text,                                 -- hash of sanitized capture (no raw payload stored)
  status                     text not null default 'discovered',   -- lifecycle (TMR-1 §9)
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  unique (provider, provider_template_id)
);
```

### 3.3 `creative_provider_template_field` (TMR-1 §4 — one row per element)

```sql
-- DESIGN ONLY — not executed
create table c.creative_provider_template_field (
  id                 uuid primary key default gen_random_uuid(),
  template_id        uuid not null references c.creative_provider_template(id) on delete cascade,
  element_id         text,                                         -- provider element id (if available)
  element_name       text not null,                                -- e.g. Headline
  element_type       text,                                         -- provider type
  track              text,
  dynamic            boolean,                                      -- modifiable vs fixed
  field_kind         text check (field_kind in ('text','image','logo','background','shape','audio','video','unknown')),
  default_value_safe text,                                         -- only if safe (no sensitive content)
  style_summary      text,                                         -- sanitized
  constraints        jsonb,
  required_for_render boolean,
  created_at         timestamptz not null default now(),
  unique (template_id, element_name)                               -- (or template_id, element_id — pending TMR-1)
);
```

### 3.4 `creative_template_platform_suitability` (TMR-1 §6 — first-class, per-platform)

```sql
-- DESIGN ONLY — not executed
create table c.creative_template_platform_suitability (
  id                 uuid primary key default gen_random_uuid(),
  template_id        uuid not null references c.creative_provider_template(id) on delete cascade,
  platform           text not null,                                -- facebook | instagram | linkedin | youtube | …
  placement          text not null default 'default',             -- feed | reel | story | … (default avoids null in unique)
  suitability_status text not null default 'unknown'
                       check (suitability_status in
                       ('unknown','candidate','not_suitable','needs_review','platform_safe','production_proven','blocked')),
  reason             text,
  constraints        jsonb,
  proof_reference    text,                                         -- soft ref to render/publish evidence id
  last_reviewed_at   timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (template_id, platform, placement)
);
```

### 3.5 `creative_template_variant_candidate` (TMR-1 §7 — candidate, NOT binding)

```sql
-- DESIGN ONLY — not executed
create table c.creative_template_variant_candidate (
  id                            uuid primary key default gen_random_uuid(),
  template_id                   uuid not null references c.creative_provider_template(id) on delete cascade,
  format_key                    text,                              -- candidate ice_format_key
  variant_key                   text not null,                     -- candidate variant_key
  fit_status                    text not null default 'unknown'
                                  check (fit_status in
                                  ('unknown','candidate','strong_candidate','weak_candidate','needs_template_edit','unsuitable','blocked')),
  fit_reason                    text,
  required_field_mapping_status text,
  missing_fields                jsonb,                             -- list of unmapped required fields
  reviewed_by                   text,
  reviewed_at                   timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  unique (template_id, variant_key)
);
```

> **Anti-overclaim (TMR-1 §7):** a row here is candidate analysis only — it is **not** a governed
> variant binding, **not** render proof, **not** production enablement.

### 3.6 `creative_template_client_assignment` (TMR-1 §8 — scoped permission, modelled separately)

```sql
-- DESIGN ONLY — not executed
create table c.creative_template_client_assignment (
  id                   uuid primary key default gen_random_uuid(),
  template_id          uuid not null references c.creative_provider_template(id) on delete cascade,
  client_id            uuid,                                       -- soft ref → c.client (no FK)
  brand_key            text,
  assignment_scope     text not null
                         check (assignment_scope in
                         ('generic_allowed','brand_allowed','client_allowed','client_blocked','pilot_only')),
  assignment_status    text not null default 'proposed'
                         check (assignment_status in
                         ('proposed','approved','visually_approved','client_enabled','production_proven','deprecated','blocked')),
  style_guide_reference text,                                      -- the brand style guide governing this assignment
  approved_by          text,
  approved_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
-- uniqueness for (template_id, client_id) needs a partial/expression index because client_id is nullable:
-- create unique index … on c.creative_template_client_assignment (template_id, coalesce(client_id,'00000000-…'::uuid));  -- pending TMR-1
```

### 3.7 `creative_template_inventory_audit` (TMR-1 §10 — append-only audit trail)

```sql
-- DESIGN ONLY — not executed
create table c.creative_template_inventory_audit (
  id                   uuid primary key default gen_random_uuid(),
  template_id          uuid references c.creative_provider_template(id) on delete set null,  -- nullable: family-level captures allowed
  captured_by          text not null,
  captured_at          timestamptz not null default now(),
  capture_method       text not null
                         check (capture_method in
                         ('manual_sanitized_export','provider_read_endpoint','connector_read','render_probe','unknown')),
  source_reference     text,
  inventory_hash       text,
  changed_fields       jsonb,
  reviewed_by          text,
  reviewed_at          timestamptz,
  decision             text,
  decision_reason      text,
  no_secret_assertion  boolean not null,                          -- explicit per-capture attestation (TMR-1 §10 / CI-4B §10)
  no_mutation_assertion boolean not null,
  created_at           timestamptz not null default now()
);
-- Append-only intent: grant INSERT/SELECT to service_role; NO update/delete grant (enforced by grants, not a trigger, in v0).
```

### 3.8 `creative_template_proof_event` (TMR-1 §9 — platform proof, separate from capability)

```sql
-- DESIGN ONLY — not executed
create table c.creative_template_proof_event (
  id                  uuid primary key default gen_random_uuid(),
  template_id         uuid not null references c.creative_provider_template(id) on delete cascade,
  assignment_id       uuid references c.creative_template_client_assignment(id) on delete set null,
  platform            text,
  placement           text,
  proof_type          text not null
                        check (proof_type in ('smoke_render','visual_approval','platform_render','platform_publish')),
  proof_status        text,
  evidence_reference  text,                                        -- soft ref → m.post_render_log / m.post_publish id (no FK)
  evidence_kind       text,                                        -- which operational source the evidence came from
  occurred_at         timestamptz,
  recorded_by         text,
  created_at          timestamptz not null default now()
);
```

> **TMR-1 rule preserved:** platform proof is a **separate object** from template capability and from
> client assignment — `production_proven` anywhere requires a real proof_event, never inference.

---

## 4. RLS / grants / read-access posture (proposed)

**Posture (mirrors the proven `c.*` non-REST-exposed sibling pattern, register v4.13):**

- **Service-role-only.** For every table: `REVOKE ALL ON … FROM PUBLIC, anon, authenticated;`
  `GRANT … TO service_role;` (write privileges only where the writer needs them — see audit-table
  note). **Revoking from `PUBLIC` alone is insufficient — `anon, authenticated` must be named** (ICE
  standing gotcha).
- **RLS:** two options —
  - **Option A (recommended, matches proven sibling):** **RLS OFF**, non-REST-exposed `c.*` schema,
    service-role-only grants. `service_role` bypasses RLS anyway, so on a non-exposed schema this is
    the proven minimal-surface posture and keeps advisors quiet.
  - **Option B (defense-in-depth):** **RLS ON with no permissive policies** (deny-by-default for
    anon/authenticated). Adds belt-and-braces if any table ever risks REST exposure. Heavier; only if
    PK/security prefers it.
  - **Recommendation:** A for consistency, with the option to harden to B at the security review.
- **Append-only audit table** (`creative_template_inventory_audit`): grant **INSERT + SELECT** to the
  writer role, **no UPDATE/DELETE** — immutability by grant in v0 (a revoke-update trigger is a
  possible later hardening, not v0).
- **Read access for the dashboard:** because the schema is **non-REST-exposed (PGRST106 trap)**, the
  dashboard reads via a **SECURITY DEFINER read RPC** (`public.get_template_metadata_registry(...)`
  or similar) — proven PPP/GFCP Slice-1A pattern: owner `postgres`, `STABLE`, pinned
  `search_path = public, pg_temp`, schema-qualified, no dynamic SQL, EXECUTE revoked from
  PUBLIC/anon/authenticated and granted only to `service_role`, server-side only, **no secrets / no
  raw provider payloads returned**. (The read RPC is a **later TMR-2 implementation artifact**, named
  here only for completeness — not designed in detail in this brief.)
- **Writes** (the Creative Intake wizard / operator flow, TMR-1 §12) go through a service-role
  server-action or a SECURITY DEFINER write RPC under the normal gate — **not** in scope here.

---

## 5. Security binding (no-secrets — load-bearing)

Carry TMR-1 §3/§10 verbatim into the schema:

- **Never store** API keys, bearer tokens, raw provider credentials, billing/account data, or unsafe
  account metadata. Columns hold **only** safe ids / names / sanitized field metadata.
- `provider_template_id`, `provider_project_reference` are **safe identifiers / sanitized references**,
  not secrets.
- `inventory_hash` lets a capture be referenced **without** storing the raw payload.
- `no_secret_assertion` / `no_mutation_assertion` are **mandatory** per audit row.
- The read RPC (when built) returns a **whitelisted** field set only — no raw `render_spec` dumps, no
  secrets, no tokens, no raw prompts.
- The security review at TMR-2 implementation time must re-run the secret/whitelist check on the
  **actual** field set, not assume it from this draft (the registry reads/holds more provider metadata
  than the PPP/GFCP contracts did).

---

## 6. Indexes (proposed, minimal)

- `creative_provider_template`: unique `(provider, provider_template_id)`; btree `(family_id)`,
  `(scope)`, `(status)`, `(client_id)` for the dashboard roll-ups.
- `creative_provider_template_field`: `(template_id)`; unique `(template_id, element_name)`.
- `creative_template_platform_suitability`: unique `(template_id, platform, placement)`;
  `(platform, suitability_status)` for platform roll-ups.
- `creative_template_variant_candidate`: unique `(template_id, variant_key)`;
  `(variant_key, fit_status)`.
- `creative_template_client_assignment`: `(template_id)`, `(client_id)`,
  `(assignment_status)`; partial-unique on `(template_id, client_id)` (expression index for nullable
  client_id — §3.6 note).
- `creative_template_inventory_audit`: `(template_id, captured_at desc)`.
- `creative_template_proof_event`: `(template_id, occurred_at desc)`, `(assignment_id)`,
  `(platform, proof_type)`.

Index set is provisional — tune against the actual dashboard/governance query shapes once TMR-1 is
final and the read RPC is designed.

---

## 7. Referential-integrity stance (deliberate)

- **In-registry FKs are real** (family → provider template → field / suitability / variant / assignment
  / proof), with `on delete cascade` for child inventory and `set null` where a parent is optional.
- **Cross-schema references are soft (no FK):** `client_id → c.client`,
  `evidence_reference → m.post_render_log / m.post_publish`, `proof_reference`. Rationale: TMR is
  governance metadata that must not hard-couple to (or block) operational tables, and `m.*` is
  service-role-only with its own lifecycle. Integrity for soft refs is asserted at write time by the
  wizard/RPC, not by a DB FK. **(Revisit if TMR-1 final mandates hard FKs.)**

---

## 8. Migration-naming discipline (when TMR-2 is later cut — NOT now)

- A **single** migration creates the 8 tables + grants + (optional) RLS in one reviewable object:
  e.g. `YYYYMMDDHHMMSS_tmr2_creative_template_registry.sql`.
- **Migration name = permanent identity.** A later revision gets a **new** timestamp + distinct name,
  never the same name with different SQL.
- Apply path follows the proven ICE gate: design packet (this brief, finalised post-Session-4) →
  db-rls-auditor → security-auditor → external review on the final SQL → **PK apply hard-stop**
  (`apply_migration`, or `execute_sql` fallback only if harness-denied, with the ledger-backfill carry
  that fallback implies).
- **None of this happens in this brief.**

---

## 9. Open decisions (for PK / Session-4 reconciliation)

- **OD-1 — Schema placement:** `c.*` (recommended, proven) vs a new `creative_template`/`tmr` schema. (§2)
- **OD-2 — RLS posture:** Option A (RLS off, non-exposed, service-role-only — proven) vs Option B
  (RLS on, deny-all). (§4)
- **OD-3 — Enum strategy:** `text + CHECK` (recommended, evolvable) vs hard PG `enum` types. (§3)
- **OD-4 — Family linkage:** surrogate `family_id` (this draft) vs natural `family_key` FK. (§0/§3.1)
- **OD-5 — Cross-schema integrity:** soft refs (recommended) vs hard FKs to `c.client` / `m.*`. (§7)
- **OD-6 — Audit immutability:** grant-only (v0) vs trigger-enforced append-only. (§4)
- **OD-7 — Proof modelling:** separate `creative_template_proof_event` table (this draft) vs folding
  proof into suitability/assignment. (§0/§3.8)
- **All OD-* remain OPEN; none is decided here.** They are **PK / TMR-2-security-review decisions**
  (reconciled against the final TMR-1 v4.32 — no longer pending any further TMR-1 output).

---

## Validation (this design pass)

- ✅ **No migration created or applied** — no `apply_migration`, no `execute_sql`, no DDL/DML executed.
- ✅ **No Supabase table / RLS / grant mutation** — SQL shown is strawman illustration only.
- ✅ **No schema created, no deploy, no provider API call, no render/publish/binding/enablement.**
- ✅ **No runtime / edge-function / dashboard / CCF / `registry-schema-v2.md` / `property-pulse.json` /
  `creative_contract.ts` change.**
- ✅ **No secrets in this doc.**
- ✅ CCF-01 Phase 1 guards untouched (dry-run / log-only).

---

## Hard stop

**Stop after this proposal.** This brief is a **design-only schema/RLS proposal**, reconciled against
the final TMR-1 (v4.32 / `f900eb8`). **No migration, table creation, grant/RLS mutation, read RPC
implementation, dashboard implementation, provider call, render, publish, binding, or production
enablement is authorised by this document.** Advancing to a TMR-2 migration packet happens **only later,
on PK approval**, through the standard gate trail (§8): design packet → db-rls-auditor → security-auditor
→ external review on the final SQL → **PK apply hard-stop** (with the OD-* decisions resolved at that
review).

---

## Cross-references

- TMR-1 v1 design (the object models this schema serialises): `docs/briefs/template-metadata-registry-v1-design.md` (register v4.32).
- Proven non-REST-exposed `c.*` service-role posture: Control Tower P1 (`c.client_control_tower_enrollment` / `c.client_format_mix_audit`), register v4.13.
- Proven read-RPC security posture (SECURITY DEFINER, whitelist, no secrets): `docs/briefs/ppp-slice1a-data-contract-validation.md`; GFCP Slice 0 §9.
- Provider-inventory source / no-secret capture: `docs/briefs/provider-inventory-read-access-pattern-v1.md` (CI-4B, v4.31); `docs/briefs/creative-intake-provider-inventory-capture-model-v1.md` (CI-3, v4.29).
- Standing DB gotchas applied: REST exposure (PGRST106), revoke-from-anon/authenticated, migration-name identity (CLAUDE.md "Standing ICE deploy/DB gotchas").
