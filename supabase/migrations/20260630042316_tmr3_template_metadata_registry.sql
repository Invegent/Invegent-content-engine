-- Migration: tmr3_template_metadata_registry
-- Template Metadata Registry (TMR) v1 — 8 governance/metadata tables in the existing,
-- non-REST-exposed, service-role-only schema `c`.
--
-- Prepared by the TMR-3 apply hard-stop packet (register v4.39) AFTER all three review
-- gates passed CLEAN: db-rls-auditor (v4.36), security-auditor (v4.37), external review
-- (v4.38, ask_chatgpt_review = agree/proceed). PK-ratified deltas vs the reviewed packet
-- (reviewed_packet_hash c125f06a52d90320b70b1f91e99eb97f49b6d1749d0536d40dcedacf74af1d0c):
--   (1) deny-all RLS adopted as the final posture (ENABLE RLS, no policies);
--   (2) proof_status CHECK vocabulary added (passed/failed/pending/superseded);
--   (3) GRANT USAGE ON SCHEMA c TO service_role included explicitly (idempotent).
-- NO seed data. NO RPC. NO runtime/dashboard change. Soft cross-schema refs (no FK to
-- c.client / m.*). Hard in-registry FKs. text + CHECK vocabularies. No secrets / no raw
-- provider payloads (inventory_hash + mandatory assertions only).
--
-- ⛔ APPLY IS PK-GATED. This file is PREPARED, NOT APPLIED. Do not run it without explicit
--    PK apply approval (apply_migration, or execute_sql fallback + ledger backfill if
--    harness-denied). gen_random_uuid() is a PG13+ core built-in (no pgcrypto).

-- ── Schema usage (idempotent; required for the table grants below to take effect) ──────
grant usage on schema c to service_role;

-- ── 1. creative_template_family (TMR-1 §2) ────────────────────────────────────────────
create table c.creative_template_family (
  id                        uuid primary key default gen_random_uuid(),
  family_key                text not null unique,                 -- e.g. generic.real_estate.market_insight_card
  family_name               text not null,
  creative_purpose          text,
  default_format_candidate  text,                                  -- candidate ice_format_key (NOT FK — candidate != binding)
  default_variant_candidate text,                                  -- candidate variant_key (NOT FK)
  scope                     text not null check (scope in ('generic','brand','client')),
  industry_vertical         text,
  description               text,
  brand_constraints         jsonb,                                 -- sanitized only (write-RPC bounds/sanitizes)
  status                    text not null default 'draft'
                              check (status in ('draft','active','deprecated','blocked')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
comment on table  c.creative_template_family is 'TMR family: reusable creative pattern above provider templates (TMR-1 §2). Service-role-only, non-REST-exposed.';
comment on column c.creative_template_family.default_format_candidate is 'Candidate ice_format_key only — NOT a binding.';

-- ── 2. creative_provider_template (TMR-1 §3) ──────────────────────────────────────────
create table c.creative_provider_template (
  id                         uuid primary key default gen_random_uuid(),
  provider                   text not null,                        -- creatomate | heygen | future
  provider_template_id       text not null,                        -- external id, NOT a secret
  provider_template_name     text,                                 -- may mislead (TMR-1 §1)
  family_id                  uuid references c.creative_template_family(id) on delete set null,
  scope                      text not null check (scope in ('generic','brand','client')),
  client_id                  uuid,                                 -- soft ref -> c.client (no FK)
  brand_key                  text,
  width                      int,
  height                     int,
  aspect_ratio               text,
  output_type                text check (output_type in ('static_image','animated_image','video','audio','unknown')),
  file_type_candidate        text,
  duration_seconds           numeric,
  provider_project_reference text,                                 -- sanitized only (no secrets)
  inventory_status           text not null default 'missing'
                               check (inventory_status in
                               ('missing','requested','captured_from_docs','captured_from_provider_read',
                                'captured_from_manual_entry','captured_from_render_probe','verified','stale','blocked')),
  inventory_source           text,                                 -- capture_method (TMR-1 §10)
  captured_by                text,
  captured_at                timestamptz,
  inventory_hash             text,                                 -- hash of sanitized capture; no raw payload stored
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
comment on column c.creative_provider_template.inventory_hash is 'Hash of the sanitized captured inventory — references a capture without storing the raw payload.';
comment on column c.creative_provider_template.status is 'Lifecycle (TMR-1 §9). production_proven requires a real platform_publish proof_event — enforced by the future write-RPC, not by this DDL.';

-- ── 3. creative_provider_template_field (TMR-1 §4 — one row per element) ───────────────
create table c.creative_provider_template_field (
  id                  uuid primary key default gen_random_uuid(),
  template_id         uuid not null references c.creative_provider_template(id) on delete cascade,
  element_id          text,
  element_name        text not null,
  element_type        text,
  track               text,
  dynamic             boolean,
  field_kind          text check (field_kind in ('text','image','logo','background','shape','audio','video','unknown')),
  default_value_safe  text,                                        -- only if non-sensitive
  style_summary       text,                                        -- sanitized
  constraints         jsonb,                                       -- sanitized only (write-RPC bounds/sanitizes)
  required_for_render boolean,
  created_at          timestamptz not null default now(),
  unique (template_id, element_name)
);
comment on table c.creative_provider_template_field is 'TMR field inventory: one row per provider element (TMR-1 §4). Sanitized metadata only — never raw sensitive values or secrets.';

-- ── 4. creative_template_platform_suitability (TMR-1 §6 — first-class, per-platform) ───
create table c.creative_template_platform_suitability (
  id                 uuid primary key default gen_random_uuid(),
  template_id        uuid not null references c.creative_provider_template(id) on delete cascade,
  platform           text not null,
  placement          text not null default 'default',             -- avoids null in the unique key
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
comment on table c.creative_template_platform_suitability is 'TMR per-platform suitability (TMR-1 §6). suitability_status is physical fit, NOT production proof (production_proven requires a real proof_event; enforced by the future write-RPC).';

-- ── 5. creative_template_variant_candidate (TMR-1 §7 — candidate, NOT binding) ─────────
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
  missing_fields                jsonb,                             -- sanitized only
  reviewed_by                   text,
  reviewed_at                   timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  unique (template_id, variant_key)
);
comment on table c.creative_template_variant_candidate is 'TMR variant candidate mapping (TMR-1 §7). Candidate analysis ONLY — not a governed binding, not render proof, not production enablement.';

-- ── 6. creative_template_client_assignment (TMR-1 §8 — scoped permission, separate) ────
create table c.creative_template_client_assignment (
  id                    uuid primary key default gen_random_uuid(),
  template_id           uuid not null references c.creative_provider_template(id) on delete cascade,
  client_id             uuid,                                      -- soft ref -> c.client (no FK)
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
-- Nullable client_id ⇒ partial/expression unique index (not a table-level UNIQUE):
create unique index creative_template_client_assignment_uq
  on c.creative_template_client_assignment (template_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid));
comment on table c.creative_template_client_assignment is 'TMR client/brand assignment (TMR-1 §8): a scoped permission — assigning a client does NOT enable it (client enablement is a downstream proof gate). Where brand logo/colours/style/governance apply.';

-- ── 7. creative_template_inventory_audit (TMR-1 §10 — append-only) ─────────────────────
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
  changed_fields        jsonb,                                     -- sanitized only
  reviewed_by           text,
  reviewed_at           timestamptz,
  decision              text,
  decision_reason       text,
  no_secret_assertion   boolean not null,                         -- mandatory per-capture attestation
  no_mutation_assertion boolean not null,
  created_at            timestamptz not null default now()
);
comment on table c.creative_template_inventory_audit is 'TMR append-only audit (TMR-1 §10). Immutable by grant (INSERT+SELECT only; NO UPDATE/DELETE). no_secret_assertion/no_mutation_assertion mandatory; never store raw secrets/payloads.';

-- ── 8. creative_template_proof_event (TMR-1 §9 — proof separate from capability) ───────
create table c.creative_template_proof_event (
  id                 uuid primary key default gen_random_uuid(),
  template_id        uuid not null references c.creative_provider_template(id) on delete cascade,
  assignment_id      uuid references c.creative_template_client_assignment(id) on delete set null,
  platform           text,
  placement          text,
  proof_type         text not null
                       check (proof_type in ('smoke_render','visual_approval','platform_render','platform_publish')),
  proof_status       text check (proof_status in ('passed','failed','pending','superseded')),  -- PK-ratified CHECK vocab (delta #2); NULL allowed
  evidence_reference text,                                         -- soft ref -> m.post_render_log / m.post_publish id (no FK)
  evidence_kind      text,
  occurred_at        timestamptz,
  recorded_by        text,
  created_at         timestamptz not null default now()
);
comment on table c.creative_template_proof_event is 'TMR proof event (TMR-1 §9): platform proof is SEPARATE from template capability and client assignment. production_proven anywhere requires a real platform_publish proof_event whose evidence_reference is validated against real m.* evidence — enforced by the future write-RPC, never inference.';

-- ── Indexes (roll-ups + proof/audit lookups; business-key UNIQUEs are inline above) ────
create index cpt_family_idx         on c.creative_provider_template (family_id);
create index cpt_scope_idx          on c.creative_provider_template (scope);
create index cpt_status_idx         on c.creative_provider_template (status);
create index cpt_client_idx         on c.creative_provider_template (client_id);
create index cptf_template_idx      on c.creative_provider_template_field (template_id);
create index ctps_platform_idx      on c.creative_template_platform_suitability (platform, suitability_status);
create index ctvc_variant_idx       on c.creative_template_variant_candidate (variant_key, fit_status);
create index ctca_template_idx      on c.creative_template_client_assignment (template_id);
create index ctca_client_idx        on c.creative_template_client_assignment (client_id);
create index ctca_status_idx        on c.creative_template_client_assignment (assignment_status);
create index ctia_template_time_idx on c.creative_template_inventory_audit (template_id, captured_at desc);
create index ctpe_template_time_idx on c.creative_template_proof_event (template_id, occurred_at desc);
create index ctpe_assignment_idx    on c.creative_template_proof_event (assignment_id);
create index ctpe_platform_idx      on c.creative_template_proof_event (platform, proof_type);

-- ── Grants: service-role-only, non-browser-readable ───────────────────────────────────
-- Revoking from PUBLIC alone is insufficient — name anon, authenticated explicitly.
revoke all on c.creative_template_family               from public, anon, authenticated;
revoke all on c.creative_provider_template             from public, anon, authenticated;
revoke all on c.creative_provider_template_field       from public, anon, authenticated;
revoke all on c.creative_template_platform_suitability from public, anon, authenticated;
revoke all on c.creative_template_variant_candidate    from public, anon, authenticated;
revoke all on c.creative_template_client_assignment    from public, anon, authenticated;
revoke all on c.creative_template_inventory_audit      from public, anon, authenticated;
revoke all on c.creative_template_proof_event          from public, anon, authenticated;

-- Service role: full DML on the 7 mutable tables…
grant select, insert, update, delete on
  c.creative_template_family, c.creative_provider_template, c.creative_provider_template_field,
  c.creative_template_platform_suitability, c.creative_template_variant_candidate,
  c.creative_template_client_assignment, c.creative_template_proof_event
  to service_role;

-- …and the AUDIT table is append-only: INSERT + SELECT only, NO update/delete grant.
grant select, insert on c.creative_template_inventory_audit to service_role;

-- ── RLS: deny-all hardening (PK-ratified final posture, delta #1) ──────────────────────
-- ENABLE RLS with NO permissive policies ⇒ deny-by-default for anon/authenticated;
-- service_role bypasses RLS. Belt-and-braces on top of the non-exposed schema + revokes.
alter table c.creative_template_family               enable row level security;
alter table c.creative_provider_template             enable row level security;
alter table c.creative_provider_template_field       enable row level security;
alter table c.creative_template_platform_suitability enable row level security;
alter table c.creative_template_variant_candidate    enable row level security;
alter table c.creative_template_client_assignment    enable row level security;
alter table c.creative_template_inventory_audit      enable row level security;
alter table c.creative_template_proof_event          enable row level security;

-- ── ROLLBACK (reference only — NOT executed by this migration) ─────────────────────────
-- Reverse dependency order; drops indexes + grants + RLS with their tables; touches no
-- external/operational table; deletes no provider data outside TMR. Review before any
-- production rollback.
--   drop table if exists c.creative_template_proof_event;
--   drop table if exists c.creative_template_inventory_audit;
--   drop table if exists c.creative_template_client_assignment;
--   drop table if exists c.creative_template_variant_candidate;
--   drop table if exists c.creative_template_platform_suitability;
--   drop table if exists c.creative_provider_template_field;
--   drop table if exists c.creative_provider_template;
--   drop table if exists c.creative_template_family;
