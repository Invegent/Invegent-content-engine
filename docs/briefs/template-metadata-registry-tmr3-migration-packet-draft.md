# TMR-3 — Migration Packet DRAFT (docs/design — NOT an applied migration)

> ## ⛔ DESIGN-ONLY MIGRATION PACKET DRAFT — NOTHING IS APPLIED
> **This is a migration packet DRAFT, not an applied migration.** The SQL below is **DESIGN ONLY —
> NOT EXECUTED — NOT AUTHORISED FOR APPLY.** This document **does not** authorise DB mutation, table/
> schema creation, RLS/grant change, or RPC creation. It is **not** a file under `supabase/migrations/`.
> It must pass **db-rls-auditor → security-auditor → external review → explicit PK apply approval**
> before *any* migration is created or applied. No `execute_sql`, no `apply_migration`, no DB command is
> run by this task.
> **Produced:** 2026-06-30 (CE session). **Type:** docs/design (migration-packet draft) + register.
> **CE state at write time:** `main == origin/main == abddccf0eef853b0675f7cfca1c7a354ee9430fb`;
> register **v4.34**. CCF-01 Phase 1 guards remain dry-run / log-only — not modified.

---

## A. Packet status

- This is a **migration packet DRAFT**.
- This is **not** an applied migration.
- This is **not** executable-now SQL (every block is labelled `DESIGN ONLY — NOT EXECUTED — NOT
  AUTHORISED FOR APPLY`).
- This **does not** authorise DB mutation, table/schema creation, RLS/grant change, or RPC creation.
- It **must** go through **db-rls-auditor → security-auditor → external review → explicit PK apply
  approval** before any migration is created or applied.
- It preserves the **TMR principle** (TMR-1 §0): *template family ≠ provider template ≠ field inventory
  ≠ output contract ≠ platform suitability ≠ variant candidate ≠ client/brand assignment ≠ proof event
  ≠ production enablement*; and *`inventory_captured ≠ renderable ≠ platform_safe ≠ client_enabled ≠
  production_proven`* (enforced by separate tables + the proof-event table, never by inference).

---

## B. Source documents reviewed

| Doc | Role |
|---|---|
| `docs/briefs/template-metadata-registry-v1-design.md` | TMR-1 canonical object model |
| `docs/briefs/template-metadata-registry-tmr2-schema-rls-proposal.md` | TMR-2 proposal (strawman DDL, vocabularies) — historical |
| `docs/briefs/template-metadata-registry-tmr2-final-schema-rls-review.md` | **TMR-2 FINAL review — authoritative** over the earlier proposal |
| `docs/briefs/tmr-dashboard-readonly-view-design-brief.md` | read-only `/create/templates` consumer |
| `docs/briefs/creative-intake-template-wizard-flow-v2.md` | template-led wizard (write/capture) consumer |
| register **v4.34** context | the CLEAN-for-migration-packet verdict |

**Authoritative final decisions carried (TMR-2 final review §D–§J):** existing **non-REST-exposed `c.*`
schema** · **service-role-only** access · **`REVOKE … FROM PUBLIC, anon, authenticated`** · **no direct
browser table reads** · future dashboard reads via a **reviewed SECURITY DEFINER read RPC / server
action** (not in this packet) · **sanitized summaries only**, no raw provider payloads/secrets · **`text
+ CHECK`** vocabularies · **hard in-registry FKs**, **soft refs** to external operational tables first ·
**proof events separate from capability** · **no optimistic seeded data**.

---

## C. Proposed migration identity (PROPOSED — not created)

- **Proposed name:** `20260701000000_tmr3_template_metadata_registry.sql`
- **Repo convention (confirmed):** `supabase/migrations/` uses a **14-digit `YYYYMMDDHHMMSS` timestamp +
  `snake_case` name** (latest applied: `20260630000000_gfcp_slice1a_get_global_format_capability_pyramid_rpc.sql`,
  `20260629120000_ppp_slice1a_…`, `20260628120000_control_tower_p1_…`). The proposed name is **compliant**
  and its timestamp is a valid forward value (after `20260630000000`).
- **The migration file is NOT created in this task.** The name is **proposed only**.
- The **timestamp/name must be finalised at the actual migration drafting/apply lane** (re-stamp to the
  real apply date; **migration name = permanent identity** — a revision gets a NEW timestamp + distinct
  name, never the same name with different SQL).

---

## D. Table creation order (dependency-ordered)

Parent → child so every FK target exists first:

| Order | Table | Purpose | PK | Unique | Status CHECK | Security |
|---|---|---|---|---|---|---|
| 1 | `c.creative_template_family` | reusable creative pattern (umbrella) | `id uuid` | `family_key` | `status` | service-role-only |
| 2 | `c.creative_provider_template` | exact external asset (inventory object first) | `id uuid` | `(provider, provider_template_id)` | `inventory_status`, `status`, `output_type` | service-role-only; **no secrets** |
| 3 | `c.creative_provider_template_field` | per-element field inventory | `id uuid` | `(template_id, element_name)` | `field_kind` | sanitized only |
| 4 | `c.creative_template_platform_suitability` | first-class per-platform fit | `id uuid` | `(template_id, platform, placement)` | `suitability_status` | service-role-only |
| 5 | `c.creative_template_variant_candidate` | candidate variant mapping (NOT binding) | `id uuid` | `(template_id, variant_key)` | `fit_status` | service-role-only |
| 6 | `c.creative_template_client_assignment` | scoped client/brand permission | `id uuid` | partial `(template_id, client_id)` | `assignment_scope`, `assignment_status` | service-role-only |
| 7 | `c.creative_template_inventory_audit` | append-only capture/change audit | `id uuid` | — | `capture_method` | INSERT+SELECT only |
| 8 | `c.creative_template_proof_event` | platform/render/publish proof (separate) | `id uuid` | — | `proof_type` | service-role-only |

Timestamps `created_at/updated_at timestamptz not null default now()` on all; `captured_by`/`captured_at`/
`inventory_source`/`inventory_hash` on table 2; `recorded_by`/`occurred_at` on table 8; full
`captured_by/at` + assertions on the audit table.

---

## E. Candidate SQL — DESIGN ONLY

> **DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY.** The following is the *candidate* DDL for
> review. It is **not** placed in `supabase/migrations/`, **not** run, and contains **no secrets / no
> real sensitive values**. Schema-qualified to `c.`; `gen_random_uuid()` is a PG13+ core built-in (no
> `pgcrypto`). All enums are `text + CHECK` (evolvable). Final values are ratified at the security review.

### E.1 `c.creative_template_family` (table 1)

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
create table c.creative_template_family (
  id                        uuid primary key default gen_random_uuid(),
  family_key                text not null unique,
  family_name               text not null,
  creative_purpose          text,
  default_format_candidate  text,            -- candidate ice_format_key (NOT FK — candidate ≠ binding)
  default_variant_candidate text,            -- candidate variant_key (NOT FK)
  scope                     text not null check (scope in ('generic','brand','client')),
  industry_vertical         text,
  description               text,
  brand_constraints         jsonb,
  status                    text not null default 'draft'
                              check (status in ('draft','active','deprecated','blocked')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
comment on table  c.creative_template_family is 'TMR family: reusable creative pattern above provider templates (TMR-1 §2). Service-role-only, non-REST-exposed.';
comment on column c.creative_template_family.default_format_candidate is 'Candidate ice_format_key only — NOT a binding.';
```

### E.2 `c.creative_provider_template` (table 2)

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
create table c.creative_provider_template (
  id                         uuid primary key default gen_random_uuid(),
  provider                   text not null,                 -- creatomate | heygen | future (soft check)
  provider_template_id       text not null,                 -- external id, NOT a secret
  provider_template_name     text,                          -- may mislead (TMR-1 §1)
  family_id                  uuid references c.creative_template_family(id) on delete set null,
  scope                      text not null check (scope in ('generic','brand','client')),
  client_id                  uuid,                           -- soft ref → c.client (no FK)
  brand_key                  text,
  width                      int,
  height                     int,
  aspect_ratio               text,
  output_type                text check (output_type in ('static_image','animated_image','video','audio','unknown')),
  file_type_candidate        text,
  duration_seconds           numeric,
  provider_project_reference text,                           -- sanitized only (no secrets)
  inventory_status           text not null default 'missing'
                               check (inventory_status in
                               ('missing','requested','captured_from_docs','captured_from_provider_read',
                                'captured_from_manual_entry','captured_from_render_probe','verified','stale','blocked')),
  inventory_source           text,                           -- capture_method (TMR-1 §10)
  captured_by                text,
  captured_at                timestamptz,
  inventory_hash             text,                           -- hash of sanitized capture; no raw payload stored
  status                     text not null default 'discovered'
                               check (status in
                               ('discovered','inventory_requested','inventory_captured','inventory_verified',
                                'classified','field_mapped','governance_reviewed','smoke_rendered',
                                'visually_approved','platform_safe','client_enabled','production_proven',
                                'deprecated','blocked')),
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  unique (provider, provider_template_id)
);
comment on table  c.creative_provider_template is 'TMR provider template: the exact external asset, an inventory object first (TMR-1 §3). NEVER store secrets/keys/billing; provider_template_id + provider_project_reference are safe identifiers only.';
comment on column c.creative_provider_template.inventory_hash is 'Hash of the sanitized captured inventory — lets a capture be referenced without storing the raw payload.';
```

### E.3 `c.creative_provider_template_field` (table 3)

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
create table c.creative_provider_template_field (
  id                  uuid primary key default gen_random_uuid(),
  template_id         uuid not null references c.creative_provider_template(id) on delete cascade,
  element_id          text,
  element_name        text not null,
  element_type        text,
  track               text,
  dynamic             boolean,
  field_kind          text check (field_kind in ('text','image','logo','background','shape','audio','video','unknown')),
  default_value_safe  text,                                  -- only if non-sensitive
  style_summary       text,                                  -- sanitized
  constraints         jsonb,
  required_for_render boolean,
  created_at          timestamptz not null default now(),
  unique (template_id, element_name)
);
comment on table c.creative_provider_template_field is 'TMR field inventory: one row per provider element (TMR-1 §4). Sanitized metadata only — never raw sensitive values or secrets.';
```

### E.4 `c.creative_template_platform_suitability` (table 4)

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
create table c.creative_template_platform_suitability (
  id                 uuid primary key default gen_random_uuid(),
  template_id        uuid not null references c.creative_provider_template(id) on delete cascade,
  platform           text not null,
  placement          text not null default 'default',       -- avoids null in the unique key
  suitability_status text not null default 'unknown'
                       check (suitability_status in
                       ('unknown','candidate','not_suitable','needs_review','platform_safe','production_proven','blocked')),
  reason             text,
  constraints        jsonb,
  proof_reference    text,                                   -- soft ref to render/publish evidence id
  last_reviewed_at   timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (template_id, platform, placement)
);
comment on table c.creative_template_platform_suitability is 'TMR per-platform suitability (TMR-1 §6). suitability_status is physical fit, NOT production proof (production_proven requires a real proof_event).';
```

### E.5 `c.creative_template_variant_candidate` (table 5)

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
create table c.creative_template_variant_candidate (
  id                            uuid primary key default gen_random_uuid(),
  template_id                   uuid not null references c.creative_provider_template(id) on delete cascade,
  format_key                    text,                        -- candidate ice_format_key
  variant_key                   text not null,               -- candidate variant_key
  fit_status                    text not null default 'unknown'
                                  check (fit_status in
                                  ('unknown','candidate','strong_candidate','weak_candidate','needs_template_edit','unsuitable','blocked')),
  fit_reason                    text,
  required_field_mapping_status text,
  missing_fields                jsonb,
  reviewed_by                   text,
  reviewed_at                   timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  unique (template_id, variant_key)
);
comment on table c.creative_template_variant_candidate is 'TMR variant candidate mapping (TMR-1 §7). Candidate analysis ONLY — not a governed binding, not render proof, not production enablement.';
```

### E.6 `c.creative_template_client_assignment` (table 6)

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
create table c.creative_template_client_assignment (
  id                    uuid primary key default gen_random_uuid(),
  template_id           uuid not null references c.creative_provider_template(id) on delete cascade,
  client_id             uuid,                                -- soft ref → c.client (no FK)
  brand_key             text,
  assignment_scope      text not null
                          check (assignment_scope in
                          ('generic_allowed','brand_allowed','client_allowed','client_blocked','pilot_only')),
  assignment_status     text not null default 'proposed'
                          check (assignment_status in
                          ('proposed','approved','visually_approved','client_enabled','production_proven','deprecated','blocked')),
  style_guide_reference text,
  approved_by           text,
  approved_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
-- Nullable client_id ⇒ partial/expression unique index (NOT a table-level UNIQUE):
create unique index creative_template_client_assignment_uq
  on c.creative_template_client_assignment (template_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid));
comment on table c.creative_template_client_assignment is 'TMR client/brand assignment (TMR-1 §8): a scoped permission — assigning a client does NOT enable it (client enablement is a downstream proof gate). Where brand logo/colours/style/governance apply.';
```

### E.7 `c.creative_template_inventory_audit` (table 7 — append-only)

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
create table c.creative_template_inventory_audit (
  id                    uuid primary key default gen_random_uuid(),
  template_id           uuid references c.creative_provider_template(id) on delete set null,  -- nullable: family-level captures allowed
  captured_by           text not null,
  captured_at           timestamptz not null default now(),
  capture_method        text not null
                          check (capture_method in
                          ('manual_sanitized_export','provider_read_endpoint','connector_read','render_probe','unknown')),
  source_reference      text,
  inventory_hash        text,
  changed_fields        jsonb,
  reviewed_by           text,
  reviewed_at           timestamptz,
  decision              text,
  decision_reason       text,
  no_secret_assertion   boolean not null,                    -- mandatory per-capture attestation (TMR-1 §10 / CI-4B §10)
  no_mutation_assertion boolean not null,
  created_at            timestamptz not null default now()
);
comment on table c.creative_template_inventory_audit is 'TMR append-only audit (TMR-1 §10). Immutable by grant in v0 (INSERT+SELECT only, NO UPDATE/DELETE). no_secret_assertion/no_mutation_assertion mandatory; never store raw secrets/payloads.';
```

### E.8 `c.creative_template_proof_event` (table 8 — proof separate from capability)

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
create table c.creative_template_proof_event (
  id                 uuid primary key default gen_random_uuid(),
  template_id        uuid not null references c.creative_provider_template(id) on delete cascade,
  assignment_id      uuid references c.creative_template_client_assignment(id) on delete set null,
  platform           text,
  placement          text,
  proof_type         text not null
                       check (proof_type in ('smoke_render','visual_approval','platform_render','platform_publish')),
  proof_status       text,
  evidence_reference text,                                   -- soft ref → m.post_render_log / m.post_publish id (no FK)
  evidence_kind      text,
  occurred_at        timestamptz,
  recorded_by        text,
  created_at         timestamptz not null default now()
);
comment on table c.creative_template_proof_event is 'TMR proof event (TMR-1 §9): platform proof is a SEPARATE object from template capability and client assignment. production_proven anywhere requires a real platform_publish proof_event — never inference. Evidence by id/hash; no raw payload.';
```

---

## F. Grants and access posture (candidate — DESIGN ONLY)

Tables live in the existing **`c.`** schema. **No direct `anon`/`authenticated` table access.** Browser/
dashboard access is later, **only** through a reviewed SECURITY DEFINER read RPC / server action (**no
read RPC is created in this packet**).

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
-- Per table (all 8): lock to service_role; revoking from PUBLIC alone is insufficient — name anon/authenticated.
revoke all on c.creative_template_family            from public, anon, authenticated;
revoke all on c.creative_provider_template          from public, anon, authenticated;
revoke all on c.creative_provider_template_field    from public, anon, authenticated;
revoke all on c.creative_template_platform_suitability from public, anon, authenticated;
revoke all on c.creative_template_variant_candidate from public, anon, authenticated;
revoke all on c.creative_template_client_assignment from public, anon, authenticated;
revoke all on c.creative_template_inventory_audit   from public, anon, authenticated;
revoke all on c.creative_template_proof_event       from public, anon, authenticated;

-- Service role retains full access on the seven mutable tables…
grant select, insert, update, delete on
  c.creative_template_family, c.creative_provider_template, c.creative_provider_template_field,
  c.creative_template_platform_suitability, c.creative_template_variant_candidate,
  c.creative_template_client_assignment, c.creative_template_proof_event
  to service_role;

-- …but the AUDIT table is append-only: INSERT + SELECT only, NO update/delete grant.
grant select, insert on c.creative_template_inventory_audit to service_role;
```

> `service_role` bypasses RLS; on a non-REST-exposed schema this grant set is the proven minimal-surface
> posture (mirrors `c.client_control_tower_enrollment` / `c.client_format_mix_audit`, register v4.13).

---

## G. RLS posture (candidate — DESIGN ONLY)

Per the TMR-2 final review (§E):
- **Baseline (recommended): RLS-OFF** in the non-REST-exposed `c.` schema with grants locked down (§F) —
  the proven minimal-surface posture (advisors quiet; `service_role` bypasses RLS anyway).
- **Optional hardening: deny-all RLS** (RLS ON, **no permissive policies**) for belt-and-braces if the
  project convention / security review chooses it:

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY — OPTIONAL HARDENING (Option B)
-- Enable RLS with NO permissive policies ⇒ deny-by-default for anon/authenticated; service_role still bypasses.
alter table c.creative_template_family               enable row level security;
alter table c.creative_provider_template             enable row level security;
alter table c.creative_provider_template_field       enable row level security;
alter table c.creative_template_platform_suitability enable row level security;
alter table c.creative_template_variant_candidate    enable row level security;
alter table c.creative_template_client_assignment    enable row level security;
alter table c.creative_template_inventory_audit      enable row level security;
alter table c.creative_template_proof_event          enable row level security;
-- (no CREATE POLICY statements: deny-all by default)
```

> **The final RLS choice (off-baseline vs deny-all) MUST be reviewed by db-rls-auditor and
> security-auditor before apply.** This packet recommends the baseline and presents the hardening as an
> option; it decides neither for apply.

---

## H. Indexes (candidate — DESIGN ONLY)

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
create index cpt_family_idx        on c.creative_provider_template (family_id);
create index cpt_scope_idx         on c.creative_provider_template (scope);
create index cpt_status_idx        on c.creative_provider_template (status);
create index cpt_client_idx        on c.creative_provider_template (client_id);
create index cptf_template_idx     on c.creative_provider_template_field (template_id);
create index ctps_platform_idx     on c.creative_template_platform_suitability (platform, suitability_status);
create index ctvc_variant_idx      on c.creative_template_variant_candidate (variant_key, fit_status);
create index ctca_template_idx     on c.creative_template_client_assignment (template_id);
create index ctca_client_idx       on c.creative_template_client_assignment (client_id);
create index ctca_status_idx       on c.creative_template_client_assignment (assignment_status);
create index ctia_template_time_idx on c.creative_template_inventory_audit (template_id, captured_at desc);
create index ctpe_template_time_idx on c.creative_template_proof_event (template_id, occurred_at desc);
create index ctpe_assignment_idx   on c.creative_template_proof_event (assignment_id);
create index ctpe_platform_idx     on c.creative_template_proof_event (platform, proof_type);
-- (business-key UNIQUEs are defined inline in §E; the assignment partial-unique is the expression index in §E.6.)
```

Index set is provisional — tune to the actual read-RPC / dashboard query shapes when those are designed.

---

## I. Audit insert path (design)

- The **writer** (the future Creative Intake wizard / a service-role write RPC) inserts one
  `c.creative_template_inventory_audit` row per capture/change, with `no_secret_assertion = true` and
  `no_mutation_assertion = true` set explicitly, plus `capture_method`, `inventory_hash`, and
  `changed_fields`.
- **Immutability:** enforced by **grant** in v0 (no UPDATE/DELETE grant — §F). A trigger-enforced
  append-only is a later hardening, not v0.
- **No raw payloads** are written — only sanitized metadata + the `inventory_hash` reference.
- The write path itself (RPC / server action) is **out of this packet** — drafted later, gated.

---

## J. Seed policy

- **No seed data.** The migration creates **empty** tables. The registry starts empty so the read-only
  `/create/templates` view degrades honestly (explicit "not yet populated" empty state — no optimistic/
  fake rows).
- The single known `490ad9ea…` row (the misleadingly-named market-insight card) may be inserted **later,
  as real captured data** through the normal write path — **never** as a seed baked into the migration.

---

## K. Rollback posture

- The migration is a **single reviewable object** creating all 8 tables + indexes + grants + (optional)
  RLS. At creation there is **no data dependence**, so rollback is a clean **drop of the 8 tables in
  reverse dependency order**:

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY — ROLLBACK (reverse dependency order)
drop table if exists c.creative_template_proof_event;
drop table if exists c.creative_template_inventory_audit;
drop table if exists c.creative_template_client_assignment;
drop table if exists c.creative_template_variant_candidate;
drop table if exists c.creative_template_platform_suitability;
drop table if exists c.creative_provider_template_field;
drop table if exists c.creative_provider_template;
drop table if exists c.creative_template_family;
```

- **Migration name = permanent identity.** Any revision after review gets a **new** timestamp + distinct
  name — never the same name with different SQL. If `apply_migration` is harness-denied, the proven
  `execute_sql` fallback applies the **exact reviewed SQL**, followed by the **ledger backfill**
  (`supabase_migrations.schema_migrations`) carry — recorded, not done here.

---

## L. Review checklist + apply hard-stop (the gate trail)

Before **any** migration is created or applied, in order:

1. **db-rls-auditor** — verify: all 8 tables non-REST-reachable; `REVOKE … FROM PUBLIC, anon,
   authenticated` complete; service-role-only grants; audit append-only (no UPDATE/DELETE grant); RLS
   choice (off-baseline vs deny-all); FK graph + the partial-unique expression index; `gen_random_uuid()`
   availability; advisor output clean; **no REST exposure (PGRST106 expected on direct read)**.
2. **security-auditor** — verify: **no secrets / keys / tokens / billing / raw payload** columns; the
   no-secret/no-mutation attestations are mandatory; `provider_template_id` / `provider_project_reference`
   are safe identifiers; the (future) read RPC whitelist plan; blast-radius = new metadata tables only,
   no existing-object grant widened.
3. **external review** (`ask_chatgpt_review`) on the **final SQL** — record `reviewed_input_hash`; any
   non-clean verdict → triage → fix → re-review (re-hash).
4. **PK apply HARD STOP** — PK runs or authorises `apply_migration` (or the `execute_sql` fallback +
   ledger backfill if harness-denied). **Deploy/migrate is where past incidents happened; it stays
   manual.**

**None of steps 1–4 is performed in this task.** This packet is the input to step 1.

---

## M. Non-goals and hard stops (repeat)

**No** actual migration file · `supabase/migrations/` edit · `execute_sql` · `apply_migration` · any DB
command · table/schema creation · RLS/grant change · SECURITY DEFINER/read RPC · runtime/edge/dashboard/
app code · provider integration · Creatomate/HeyGen/provider API call · render · publish · template
binding · client/template/variant/platform enablement · deploy · CCF / `.claude//_harness/` change ·
`property-pulse.json`/`creative_contract.ts`/`registry-schema-v2.md`/schema change · secrets. The candidate
SQL is **DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY** and is **not** in `supabase/migrations/`.

---

## N. Packet readiness

**Status: DRAFTED — READY FOR THE TMR-3 REVIEW GATE (db-rls-auditor → security-auditor → external review
→ PK apply).** The packet is internally complete (8 tables, vocabularies, grants, RLS options, indexes,
audit path, no-seed, rollback, gate trail) and faithful to the TMR-2 final review. **No DB change is
authorised; nothing is applied.**

## Explicit non-claims / scope
- **Docs/design (migration-packet draft) only** — no migration created/applied, no `supabase/migrations/`
  edit, no `execute_sql`/`apply_migration`/DB command, no table/schema/RLS/grant/RPC, no runtime/edge/
  dashboard/CCF code, no provider API call, no render/publish/binding/enablement/deploy, no
  `property-pulse.json`/`creative_contract.ts`/`registry-schema-v2.md`/schema change, **no secrets.**
- Every SQL block is **DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY**, outside `supabase/migrations/`.
- `quote_card.v1` remains `needs_template_edit`/blocked; `market_update.v1` a strong candidate but
  defined/unwired; `news_card.v1` production-proven PP × facebook+instagram only. No proof borrowed.

## Cross-references
- TMR-2 final review (authoritative): `docs/briefs/template-metadata-registry-tmr2-final-schema-rls-review.md` (v4.34).
- TMR-2 proposal (historical): `docs/briefs/template-metadata-registry-tmr2-schema-rls-proposal.md` (v4.33).
- TMR-1 canonical model: `docs/briefs/template-metadata-registry-v1-design.md` (v4.32).
- Consumers: `docs/briefs/tmr-dashboard-readonly-view-design-brief.md`, `docs/briefs/creative-intake-template-wizard-flow-v2.md`.
- Proven apply lane + gotchas: GFCP Slice 1A (register v4.19, execute_sql fallback + ledger backfill); CLAUDE.md "Standing ICE deploy/DB gotchas".
- Register: v4.35 (this packet draft).
