-- Migration: tmr4_generic_template_tags_and_asset_appetite
-- Version (execute_sql fallback, minted at apply): 20260711065353
-- Additive, DARK. Generic Template Library (Foundation v1, Gate 1 2026-07-11).
-- Reviews: db-rls-auditor CLEAN (after fixes) + external CLEAN (review 79d3dd85, hash 5dd36d14).
-- Applied via PK-authorized execute_sql fallback + ledger backfill (TMR-3 precedent).

begin;

-- ── schema usage (idempotent) ──────────────────────────────────────────────
grant usage on schema c to service_role;

-- ── B.1  Asset-appetite columns on creative_provider_template (additive, NULLABLE) ──
alter table c.creative_provider_template
  add column if not exists image_slot_min            int,
  add column if not exists image_slot_max            int,
  add column if not exists needs_governed_background  boolean,
  add column if not exists text_overlay_safe_required boolean;

alter table c.creative_provider_template
  add constraint creative_provider_template_image_slot_min_nonneg
    check (image_slot_min is null or image_slot_min >= 0),
  add constraint creative_provider_template_image_slot_order
    check (image_slot_max is null or image_slot_min is null or image_slot_max >= image_slot_min);

comment on column c.creative_provider_template.image_slot_min is
  'Asset-appetite: min images this template consumes (selection gate). Null = unknown.';
comment on column c.creative_provider_template.image_slot_max is
  'Asset-appetite: max images this template consumes. Null = unknown.';
comment on column c.creative_provider_template.needs_governed_background is
  'True if the template requires a governed background / b-roll asset.';
comment on column c.creative_provider_template.text_overlay_safe_required is
  'True if a text-overlay-safe (legible) background is required.';

-- ── B.2  Family-level DEFAULT tags ─────────────────────────────────────────
create table c.creative_template_family_tag (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references c.creative_template_family(id) on delete cascade,
  namespace   text not null
                check (namespace in ('vertical','use_case','tone','motion_treatment','length_class','aspect_fit')),
  value       text not null,
  created_at  timestamptz not null default now(),
  unique (family_id, namespace, value),
  constraint family_tag_length_class_vocab
    check (namespace <> 'length_class'
           or value in ('static','short_video','standard_short_video','long_video'))
);
comment on table c.creative_template_family_tag is
  'TMR family-level DEFAULT tags (broad intent). Template-level tags override within a namespace at read time (see selector invariant). Service-role-only, non-REST-exposed.';

-- ── B.3  Template-level OVERRIDE tags ──────────────────────────────────────
create table c.creative_provider_template_tag (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references c.creative_provider_template(id) on delete cascade,
  namespace    text not null
                 check (namespace in ('vertical','use_case','tone','motion_treatment','length_class','aspect_fit')),
  value        text not null,
  created_at   timestamptz not null default now(),
  unique (template_id, namespace, value),
  constraint template_tag_length_class_vocab
    check (namespace <> 'length_class'
           or value in ('static','short_video','standard_short_video','long_video'))
);
comment on table c.creative_provider_template_tag is
  'TMR template-level OVERRIDE tags (specific fit). Overrides family defaults within a namespace at read/selection time. Service-role-only, non-REST-exposed.';

-- ── B.4  Indexes (selection support) ───────────────────────────────────────
-- Only the (namespace, value) filter indexes are created. Owner-id lookups are
-- already served by the leading column of each unique(owner_id, namespace, value)
-- constraint index, so separate (family_id)/(template_id) indexes are redundant
-- (dropped per db-rls-auditor — avoids needless write amplification).
create index creative_template_family_tag_ns_val_idx     on c.creative_template_family_tag (namespace, value);
create index creative_provider_template_tag_ns_val_idx    on c.creative_provider_template_tag (namespace, value);

-- ── B.5  RLS: deny-all (mirror the TMR-3 posture) ──────────────────────────
alter table c.creative_template_family_tag    enable row level security;
alter table c.creative_provider_template_tag  enable row level security;

-- ── B.6  Grants: revoke browser roles, service-role-only DML ───────────────
revoke all on c.creative_template_family_tag    from public, anon, authenticated;
revoke all on c.creative_provider_template_tag  from public, anon, authenticated;
grant select, insert, update, delete on c.creative_template_family_tag    to service_role;
grant select, insert, update, delete on c.creative_provider_template_tag  to service_role;

commit;
