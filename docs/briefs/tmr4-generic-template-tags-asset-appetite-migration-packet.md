# TMR-4 — Generic Template Library: Tags + Asset-Appetite Migration Packet

**Created:** 2026-07-11 Sydney · **Author:** chat (orchestrator) · **Status:** ✅ **APPLIED 2026-07-11** (version `20260711065353`, execute_sql fallback) — result: `docs/briefs/tmr4-generic-template-tags-asset-appetite-apply-result.md`
**Lane class:** SIDE_PROVING · **Tier:** T2 (additive, **dark** DDL — new tables + nullable columns; no browser exposure, no runtime read, no deploy, no production behaviour change)
**Predecessor:** `docs/briefs/tmr-generic-template-library-foundation-v1.md` (**Gate 1 approved 2026-07-11**, with 4 rulings applied below)
**Target project:** `mbkmaxqhsohbtwsqolns` · schema `c` (non-REST-exposed, service-role-only, deny-all RLS) · registry is **LIVE and populated** (17 `creative_template_family` + 19 `creative_provider_template` rows; read by 7 production RPCs — see §A.1). The two **new tag tables** ship empty; the four **new columns** are nullable and unread by current RPCs.

**Boundaries (this lane):** ⛔ no migration apply · ⛔ no DB write · ⛔ no Creatomate re-skin · ⛔ no template intake · ⛔ no smoke render · ⛔ no selection RPC build · ⛔ no production behaviour change. This packet **prepares** the migration and carries it through db-rls-auditor + external review to an explicit PK apply gate — nothing is executed.

---

## A.1 Live-registry correction (db-rls-auditor finding, applied)

The Foundation v1 doc and the first draft of this packet stated the registry was "empty (0 rows)" — carried forward from the TMR-3 apply result (accurate on 2026-06-30). **db-rls-auditor verified against the live DB that this is no longer true:** `c.creative_template_family` = **17 rows**, `c.creative_provider_template` = **19 rows**, and both are **read by 7 live production RPCs** (`select_template`, `resolve_slot_assets`, `get_tmr_template_list`, `get_tmr_template_detail`, `get_tmr_template_filters`, `record_tmr_proof_event`, `stamp_tmr_shadow_forward`). The generic-library work therefore **extends a live, in-production registry**, not a greenfield one.

**Impact on this migration: none to safety, corrected in rationale.** The DDL remains additive-safe because (a) the 4 new columns are **nullable** → NULL on all 19 existing rows, no default backfill, no rewrite; (b) all 7 readers return **`jsonb` with explicit column lists** (no `SELECT *`, no `SETOF <table>` rowtype) → new columns are invisible to them, **zero reader breakage**; (c) the 2 new tag tables are genuinely empty. The "empty/unread" wording has been corrected throughout (header, §D, §H). Post-apply verification adds a reader-integrity check (§H.8).

---

## A. Purpose & the four Gate-1 rulings applied

The Foundation v1 doc (Gate 1) found the empty TMR registry cannot yet express the generic, tag-driven, multi-media selection model. This migration adds — **additively, dark** — exactly what §7 of that doc named. PK's four rulings are baked in:

1. **Length-class thresholds (v1):** the `length_class` tag vocabulary is fixed to `static` · `short_video` (6–30s) · `standard_short_video` (31–60s) · `long_video` (61–180s). >180s is out of v1 (no bucket). Enforced by a CHECK on the tag `value` when `namespace='length_class'`. Thresholds themselves are a **read/classification concern** (derived from `duration_seconds`) — the DB stores the bucket label, not the threshold logic, so revising thresholds later needs no schema change.
2. **Tags at two levels:** **family-level default tags** (broad intent) + **template-level override tags** (specific fit) → two junction tables (§B.2, §B.3). Resolution (family defaults ∪ template overrides, template wins within a namespace) is a **read-side invariant** (§E), not DDL.
3. **Agent/contact-card archetype PARKED:** no host/persona/identity columns or tables in this migration. The `signoff_outro` slots stay out of scope.
4. **Template #3 (4×5 banner) is static:** no special handling needed — `output_type='static_image'` + `duration_seconds=null` already express it; the asset-appetite columns apply to static and video alike.

---

## B. Exact additive changes (the migration — "up")

> Wrapped in a single transaction so RLS + revokes land atomically with table creation (no committed window where a new table is visible to browser roles). `gen_random_uuid()` is a PG13+ core built-in (no pgcrypto). **Once-only apply** (ledger-guarded); `ADD CONSTRAINT` is not `IF NOT EXISTS`-guarded by design.

```sql
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
```

**Why each piece:**
- **B.1 columns** — the asset-appetite selection gate (image count, needs-bg, text-safe). Nullable so existing/future rows are unaffected until populated. CHECKs guard sanity (non-negative, ordered) only when values are present.
- **B.2 / B.3 tag tables** — the multi-tag dimension. `namespace` CHECK-bounded; `length_class` values further CHECK-bounded to PK's v1 vocabulary. `unique(owner, namespace, value)` prevents dup tags. `on delete cascade` keeps tags from orphaning.
- **B.4 indexes** — `(namespace, value)` for the selection filter; owner-id indexes for the join back to the template/family.
- **B.5 / B.6** — identical posture to the applied TMR-3 tables: deny-all RLS, browser roles revoked, service-role-only DML.

---

## C. What this migration deliberately does NOT do

- **No `length_class` column** on `creative_provider_template` — it is a *tag* derived from `duration_seconds` (the source of truth). Avoids over-engineering (Ruling 1).
- **No host/persona/agent identity** — parked (Ruling 3). `AgentName`/`AgentPhoto`/`Email`/`Phone` slots and `signoff_outro` are out of scope until a governed host-identity lane exists.
- **No RPC, no SECURITY DEFINER function, no view** — no read/write path is built here (registry stays non-browser-readable; the selector/read-RPC is a later, separately-gated lane).
- **No seed, no INSERT** — the tables ship empty (only the one migration-ledger row on apply).
- **No change to existing columns, rows, RLS policies, or grants** on the 8 existing tables (beyond the additive columns on `creative_provider_template` and the idempotent `grant usage`).
- **No runtime / dashboard / worker / Creatomate / deploy** side effects.

---

## D. Rollback plan ("down") — and why it is safe

Rollback is trivial and side-effect-free: although the registry is live/populated (§A.1), **nothing reads the new objects** — the 2 tag tables are empty, and the 4 new columns are nullable and unread by the 7 existing RPCs. Dropping them cannot affect any current reader or row.

```sql
begin;
drop table if exists c.creative_provider_template_tag;
drop table if exists c.creative_template_family_tag;
alter table c.creative_provider_template
  drop constraint if exists creative_provider_template_image_slot_order,
  drop constraint if exists creative_provider_template_image_slot_min_nonneg,
  drop column if exists text_overlay_safe_required,
  drop column if exists needs_governed_background,
  drop column if exists image_slot_max,
  drop column if exists image_slot_min;
commit;
```

- **Rollback impact:** none on production — no code reads the new objects; the registry is empty. Dropping the two tables and four nullable columns returns the schema to its exact pre-TMR-4 shape.
- **Rollback trigger:** any post-apply verification failure in §H, or a decision to revise the tag model before intake begins.
- **Validated-before-apply:** the down SQL is written here and must be dry-verified (objects exist → drop → objects gone) as part of the apply gate's success criteria.

---

## E. Tag resolution invariant (read-side — documented, NOT enforced by DDL)

For the future selector / read-RPC (not this migration):

> **Effective tags(template) = family_tags(template.family_id) ∪ template_tags(template.id).**
> Within a single `namespace`, a **template-level value takes precedence over** the family-level value(s) of that namespace (override semantics). Family tags are *defaults*; template tags are *overrides*.

Example (PK's): family `market_update` carries `vertical:finance`, `tone:professional`, `use_case:stat_reveal`; template overrides with `motion_treatment:kinetic_stat`, `aspect_fit:9x16`, `length_class:short_video`, `tone:premium` → effective `tone` = `premium` (template wins). This migration only **stores** both levels; it does not resolve them.

---

## F. Safety posture (mirrors applied TMR-3)

- **RLS deny-all** on both new tables (ENABLE, no policies) — matches the 8 existing TMR tables.
- **Browser roles** (`anon`/`authenticated`/`PUBLIC`) explicitly revoked → zero table privileges. Even if schema `c` were REST-exposed, browser roles read nothing.
- **service_role** full DML on the two mutable tag tables (tags are correctable — unlike the append-only audit table).
- **New columns** inherit the existing table-level grants on `creative_provider_template` (no new column-level grant needed).
- **No secrets** — tags and asset-appetite are non-sensitive metadata only.
- **`c` PostgREST exposure** — not SQL-provable here (standing carry from TMR-3, §G of that result); mitigated identically by verified zero browser grants + deny-all RLS.

---

## G. Migration identity

- **Intended filename:** `supabase/migrations/<version>_tmr4_generic_template_tags_and_asset_appetite.sql`
- **Name (identity):** `tmr4_generic_template_tags_and_asset_appetite` — **new number, distinct name** (never reuse a prior name).
- **Version note:** `apply_migration` mints its own wall-clock version at apply; the repo filename version and the applied ledger version may diverge (known gotcha) — reconcile the filename or record the divergence at the commit gate.

---

## H. Post-apply verification plan (for the FUTURE apply lane — not run now)

Read-only checks to confirm a clean apply when PK authorizes it:
1. **Ledger:** exactly one `supabase_migrations.schema_migrations` row for the TMR-4 name.
2. **Tables exist:** `c.creative_template_family_tag`, `c.creative_provider_template_tag` present; both `relrowsecurity=true`, 0 policies.
3. **Columns exist:** the 4 new columns on `creative_provider_template`, all nullable; the 2 CHECK constraints present.
4. **Grants:** browser roles have 0 privileges on both new tables; `service_role` has `SELECT,INSERT,UPDATE,DELETE`.
5. **Empty:** `count(*)=0` on both tag tables; no rows written to any existing table.
6. **Advisors:** `get_advisors(security)` shows only the intended `rls_enabled_no_policy` INFO on the 2 new tables; no new ERROR/WARN.
7. **CHECK behaviour (transactional probe, rolled back):** a `length_class` tag with an out-of-vocab value is rejected; a valid one is accepted.
8. **Reader integrity (§A.1):** the 7 existing RPCs (`select_template`, `resolve_slot_assets`, `get_tmr_template_list/detail/filters`, `record_tmr_proof_event`, `stamp_tmr_shadow_forward`) still execute and return their expected shape against the 19 existing rows — confirming the additive nullable columns did not perturb any live reader.

---

## I. Review status

- **db-rls-auditor:** **CONCERNS → RESOLVED** (reviewed draft hash `8f098c70…`). Two should-fix items, both applied: (1) the "empty registry" premise was factually wrong — the registry is live (17 families / 19 templates, 7 reader RPCs); corrected in §A.1, header, §D, §H.8; the DDL was confirmed additive-safe (nullable columns, jsonb readers, empty tag tables — **no reader breakage**). (2) two owner-id-only indexes were redundant with the unique-constraint leading columns → dropped (§B.4). FK correctness PASS · CHECK correctness PASS · RLS/grant posture PASS (mirrors TMR-3, no browser leakage, `pg_default_acl` gotcha confirmed N/A for schema-`c` tables) · rollback PASS · naming PASS. Verdict after fixes: **clean**.
- **external review (`ask_chatgpt_review`):** run on the **corrected** packet — `reviewed_input_hash` recorded at §I-ext below.

> **§I-ext — external review result:** **CLEAN — agree / proceed** (`ask_chatgpt_review`, review_id `79d3dd85-dc7e-4bb6-bff4-6692b0e6b977`, risk_level **low**, confidence **high**, no pushback points, no PK escalation). **`reviewed_input_hash` = `5dd36d14cf7efef0e2e4fc2017880e99300c86025ed69fbe080757cfe103355a`** (the corrected packet). Per contract rule 4: this review is valid ONLY for this hash — any further packet edit voids it and requires re-review before apply.

---

## J. PK apply gate (HARD STOP — prepared, not executed)

When PK authorizes apply (a **separate** gate, not this lane), the exact steps will be:

1. **Preconditions:** both reviews CLEAN and pinned to the final packet hash; `apply_migration` deny-list temporarily lifted by PK (or the PK-authorized `execute_sql` fallback + ledger backfill, per the TMR-3 precedent); local HEAD re-verified; branch-warden `safe`.
2. **Apply:** run the §B transaction (once).
3. **Verify:** the §H checklist.
4. **Rollback path:** the §D "down" SQL, validated-ready.
5. **STOP conditions (any → void the apply, surface to PK):** packet-hash mismatch · non-clean review · unexpected origin movement · any §H check fails · any row written to an existing table · advisors show a new ERROR/WARN.

**Until that gate: nothing is applied.** This packet is the reviewed artifact only.

---

## Non-claims / scope
- No SQL executed; no DB mutation; no seed; no RPC/function/view; no runtime/dashboard/worker/Creatomate/deploy change.
- Additive only: 2 new tables + 4 new nullable columns + 2 CHECKs + 4 indexes + deny-all RLS + service-role grants. No change to existing rows, columns, policies, or grants on the 8 existing tables.
- No secrets stored. No template re-skinned, intaken, rendered, or proven. No selection behaviour built.

## Cross-references
- Foundation (Gate 1): `docs/briefs/tmr-generic-template-library-foundation-v1.md`
- Registry DDL (applied): `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`
- TMR-3 apply result (posture precedent): `docs/briefs/template-metadata-registry-tmr3-apply-result.md`
