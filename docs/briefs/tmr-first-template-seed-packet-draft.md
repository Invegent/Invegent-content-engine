# TMR First Template Seed Packet — DRAFT

## A. Packet status

- This is the **first-template seed packet DRAFT** for the TMR registry.
- **Docs-only.** **No migration file is created.** **No SQL is executed.** **No DB mutation occurs.**
  **No template is inserted yet.** **No proof / render / publish / enablement occurs.**
- Governance tier: **MEDIUM / data-write preparation** — this lane *drafts* the exact future seed;
  it stops **before** migration creation or DB mutation. Apply is a separate, later, PK-gated lane.
- **CE state at write time:** `main == origin/main == 75d789f`; register **v4.50 → v4.51** with this
  packet. Single authoritative session; not run in parallel with another TMR lane.

## B. Source evidence

- **Dashboard visual smoke PASSED in PK's browser** (recorded ground truth): `/create/templates`
  loads, Template Registry nav active, **empty state visible**, summary cards 0 / neutral, **no fake
  template row, no fake Property Pulse / `490ad9ea…` row**. Registry is still empty; nothing inserted.
- **Session 3 intake mapping** (read-only planning) used as planning input — the candidate identity,
  family classification, field list, platform/variant assessments, and proof plan originate there.
- **Schema source of truth:** `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`
  (sha256 `f6733fa73ef6246b030bbcbbb1165086d41b578aab4adb66323eb459eca54f56`, verified this lane).
- **Read surfacing source of truth:** `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql`
  (sha256 `88efec0c5903ad84e0a88304e36d01f52904a4247b40a0abf4e81857ebdaa55f`, verified this lane) —
  used to predict how the seeded row will appear in `/create/templates` (§N).
- **Dashboard read-path:** `docs/briefs/tmr-read-rpc-server-action-path-packet.md` — confirms the
  `/create/templates` page consumes the 3 live `public.*` service-role RPCs via the separate
  `invegent-dashboard` repo's `actions/tmr-templates.ts` + `createServiceClient` (browser never calls
  the RPC). **No live DB / no provider read performed in this lane.**

## C. Candidate identity

| Attribute | Value |
|---|---|
| provider | `creatomate` |
| provider_template_name | `news_quote_insight_1x1_v1` |
| provider_template_id | `490ad9ea-7473-49e4-9d3c-e1ae8a12d790` |
| output_type | `static_image` |
| dimensions | 1080 × 1080 |
| aspect_ratio | `1:1` |
| **status** | **inventory candidate only** — not verified, not proven, not enabled |

## D. Proposed row plan (exact column names from the schema migration)

Seven tables receive rows; **`c.creative_template_proof_event` receives ZERO rows** (§L).

| # | Table | Rows | Note |
|---|---|---|---|
| 1 | `c.creative_template_family` | 1 | the reusable pattern (§E) |
| 2 | `c.creative_provider_template` | 1 | the exact external asset (§F) |
| 3 | `c.creative_provider_template_field` | 9 | field inventory (§G) |
| 4 | `c.creative_template_platform_suitability` | 5 | per-platform candidates (§H) |
| 5 | `c.creative_template_variant_candidate` | 2 | market_update strong, quote_card needs-edit (§I) |
| 6 | `c.creative_template_client_assignment` | 1 | PP pilot **proposed** (§J) — client_id RESOLVE_AT_APPLY |
| 7 | `c.creative_template_inventory_audit` | 1 | append-only capture attestation (§K) |
| — | `c.creative_template_proof_event` | **0** | **forbidden in first seed** (§L) |

**Important:** no proof exists yet; no platform-publish proof exists; **no `production_proven` is
allowed anywhere** (not on the template `status`, not on suitability, not on assignment).

## E. Family row → `c.creative_template_family`

| Column | Value |
|---|---|
| `family_key` | `generic.real_estate.market_insight_card` |
| `family_name` | `Real Estate Market Insight Card` |
| `creative_purpose` | Headline-led market/news insight card (suburb/timeframe + insight), brand-skinnable |
| `default_format_candidate` | `NULL` (candidate ice_format_key not confirmed; not a binding) |
| `default_variant_candidate` | `market_update.v1` (candidate, NOT binding) |
| `scope` | `generic` |
| `industry_vertical` | `real_estate` |
| `description` | First TMR family; classified by element truth, not provider name |
| `status` | `draft` *(conservative; enum: draft/active/deprecated/blocked)* |

**Classification rationale (element truth, not provider name):** the template's element set is
**Headline · Subtitle · CategoryBadge · Location · Date · Footer** over a scrim'd background — a
**market-insight / news headline card**. It is **not a true quote card**: there is **no `quote_text`
slot and no attribution/source slot**. The provider name `news_quote_insight_1x1_v1` is misleading
(exactly the TMR-1 §1 hazard); TMR classifies by what the asset *is*.

## F. Provider template row → `c.creative_provider_template`

| Column | Value | Confidence |
|---|---|---|
| `provider` | `creatomate` | known |
| `provider_template_id` | `490ad9ea-7473-49e4-9d3c-e1ae8a12d790` | known |
| `provider_template_name` | `news_quote_insight_1x1_v1` | known (misleading name) |
| `family_id` | → FK to the §E family row (threaded via CTE) | resolved at insert |
| `scope` | `generic` | proposed |
| `client_id` | `NULL` | known (generic; PP via assignment §J, not here) |
| `brand_key` | `NULL` | known |
| `width` / `height` | `1080` / `1080` | known |
| `aspect_ratio` | `1:1` | known |
| `output_type` | `static_image` | known *(enum-valid)* |
| `file_type_candidate` | `NULL` | **UNKNOWN** — not verified (no provider read; do not assume jpg) |
| `duration_seconds` | `NULL` | known (static) |
| `provider_project_reference` | `NULL` | **UNKNOWN** |
| `inventory_status` | `captured_from_docs` | conservative *(enum-valid)* — **not** `captured_from_provider_read`/`verified` |
| `inventory_source` | `manual_sanitized_export` | proposed |
| `captured_by` | seed-apply identity | set at apply |
| `captured_at` | apply time (`now()`) | set at apply |
| `inventory_hash` | RESOLVE_AT_APPLY (sha256 of sanitized capture) | computed by apply lane |
| `status` | `inventory_captured` | **capped conservative** *(enum-valid)* — do **not** advance to `inventory_verified`/`classified`/anything higher without a provider read + proof |

**Unknowns explicitly flagged:** element ids (need provider read) · `provider_project_reference` ·
exact `file_type_candidate` · required/optional field truth (§G). None is invented.

## G. Field inventory rows → `c.creative_provider_template_field` (9 rows)

`element_id` = **UNKNOWN** (needs provider read) for all rows. `required_for_render` left **`NULL`
(unknown)** for every row — conservative; required/optional truth needs a provider read / render
probe, not assertion. `unique(template_id, element_name)` holds. No raw provider payload stored.

| element_name | element_type | `field_kind` | `dynamic` | `required_for_render` | style_summary / notes |
|---|---|---|---|---|---|
| `Background` | image | `background` | `true` | `NULL` | full-bleed background image slot |
| `Scrim` | shape | `shape` | **`false`** | `NULL` | fixed overlay, **opacity 75%** (style_summary) — not an operator input |
| `CategoryBadge` | text | `text` | `true` | `NULL` | category/tag label |
| `Logo` | image | `logo` | `true` | `NULL` | brand logo slot (resolve via governed assets at render, never inline) |
| `Headline` | text | `text` | `true` | `NULL` | primary headline (likely-required, **unverified**) |
| `Subtitle` | text | `text` | `true` | `NULL` | secondary line |
| `Location` | text | `text` | `true` | `NULL` | suburb / area |
| `Date` | text | `text` | `true` | `NULL` | date / timeframe |
| `Footer` | text | `text` | `true` | `NULL` | footer / source context |

All `field_kind` values are enum-valid (`text/image/logo/background/shape/audio/video/unknown`).
`default_value_safe` = `NULL` (no provider read) → detail RPC surfaces `has_default:false`.

## H. Platform suitability rows → `c.creative_template_platform_suitability` (5 rows, `placement='default'`)

Physical fit only — **never** production proof. All enum-valid (`candidate`/`not_suitable`).

| platform | `suitability_status` | `reason` |
|---|---|---|
| `facebook` | `candidate` | static 1:1 fits FB feed image |
| `instagram` | `candidate` | 1:1 is native IG feed |
| `linkedin` | `candidate` | 1:1 image valid in LI feed |
| `website` | `candidate` | 1:1 image embeddable |
| `youtube` | `not_suitable` | YT is a video surface; a static 1:1 image is not a YouTube video unless transformed into a video workflow (out of scope) |

**None is `platform_safe`. None is `production_proven`.** Promotion requires a real per-platform
proof event (§L), which the first seed does not create.

## I. Variant candidate rows → `c.creative_template_variant_candidate` (2 rows)

| `variant_key` | `format_key` | `fit_status` | `required_field_mapping_status` | `missing_fields` (jsonb) | `fit_reason` |
|---|---|---|---|---|---|
| `market_update.v1` | `NULL` *(candidate ice_format_key not confirmed)* | `strong_candidate` | `pending` | `NULL` | element set (Headline/Subtitle/Location/Date/Footer/CategoryBadge) is a market-insight layout — direct fit |
| `quote_card.v1` | `NULL` | `needs_template_edit` | `blocked_missing_fields` | `["quote_text","attribution_source"]` | no quote slot, no attribution/source slot — requires a template edit to add them |

`fit_status` values enum-valid (`strong_candidate`/`needs_template_edit`). `missing_fields` is a
guarded JSONB **array** (the detail RPC calls `jsonb_array_length` only when `jsonb_typeof = 'array'`).
**No unsupported third variant proposed.**

> **Rollup consequence (honest):** because `quote_card.v1` carries `needs_template_edit`, the read
> RPC's inline `lifecycle_rollup` resolves to **`needs_template_edit`** for this template (§N) — the
> correct, conservative "needs attention" surface.

## J. Client assignment row → `c.creative_template_client_assignment` (1 row, Property Pulse)

| Column | Value |
|---|---|
| `template_id` | → FK to the §F provider-template row (CTE) |
| `client_id` | **RESOLVE_AT_APPLY** — do **not** fake the UUID (see resolution note) |
| `brand_key` | `NULL` |
| `assignment_scope` | `pilot_only` *(enum-valid)* |
| `assignment_status` | `proposed` *(enum-valid)* |
| `style_guide_reference` | `docs/creative-library/property-pulse-styleguide-v1.md` |
| `approved_by` / `approved_at` | `NULL` |

**Candidate / proposed only — NOT approved, NOT `client_enabled`, NOT `production_proven`, NOT Format
Mix eligible.** Assignment is a scoped permission, never an enablement (TMR-1 §8; enforced by the
future write-RPC, not the DDL).

**`client_id` resolution (no DB call this lane):** `client_id` is a **soft ref** (no FK, nullable).
The apply lane resolves it **deterministically by slug**, not by a hardcoded UUID — recommended:
`(select id from c.client where client_slug = 'property-pulse')` with an apply-lane guard that it
returns **exactly one** row (else fail-closed). If the apply lane cannot confirm the `c.client`
slug column from authorized evidence, it must either (a) leave `client_id = NULL` and mark the
assignment `RESOLVE_AT_APPLY` / defer it, or (b) treat it as a PK/implementation decision. **This
packet does not fake a UUID and does not query the DB.**

## K. Inventory audit row → `c.creative_template_inventory_audit` (1 row, append-only)

| Column | Value |
|---|---|
| `template_id` | → FK to the §F row (CTE) |
| `captured_by` | seed-apply identity (NOT NULL) |
| `captured_at` | apply time (`now()`) |
| `capture_method` | `manual_sanitized_export` *(enum-valid)* |
| `source_reference` | `Session 3 intake mapping + schema migration (docs-derived)` |
| `inventory_hash` | RESOLVE_AT_APPLY (sha256 of the sanitized seed content) |
| `changed_fields` | sanitized summary jsonb (field-set captured) — **no raw payload** |
| `no_secret_assertion` | **`true`** (NOT NULL) |
| `no_mutation_assertion` | **`true`** (NOT NULL) |

Table is append-only by grant (INSERT+SELECT; no UPDATE/DELETE). No raw secrets / no raw provider
payload — sanitized assertions + hash only.

## L. Proof events — explicitly forbidden in the first seed

The first seed **MUST create ZERO rows** in `c.creative_template_proof_event`.

Forbidden in this (and any seed without real evidence):
- `smoke_rendered` template status **without a real smoke render**;
- `visually_approved` **without PK visual approval of a real render**;
- `platform_safe` suitability **without a passing `platform_render` proof event**;
- `production_proven` **anywhere without a passing `platform_publish` proof event** whose
  `evidence_reference` validates against real `m.*` evidence.

Proof is captured later, per real evidence, by a separate proof lane — never seeded, never inferred.

## M. Candidate SQL — DESIGN ONLY

> **DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY.** This is illustrative future seed SQL for
> the apply lane's review. It is **not** a migration, is **not** run here, and creates **no** file in
> `supabase/migrations/`. PK + the full review chain (§O) gate any apply.

```sql
-- DESIGN ONLY — NOT EXECUTED — NOT AUTHORISED FOR APPLY
-- First TMR template seed: Creatomate news_quote_insight_1x1_v1 (490ad9ea…).
-- Insert order (FK-safe): family → provider_template → fields/platforms/variants/assignment/audit.
-- ZERO proof events. PKs default via gen_random_uuid() (no hardcoded UUIDs). Idempotent where the
-- schema's unique keys allow. client_id resolved by slug (no hardcoded UUID); guard = exactly one row.
with fam as (
  insert into c.creative_template_family
    (family_key, family_name, creative_purpose, default_format_candidate, default_variant_candidate,
     scope, industry_vertical, description, status)
  values
    ('generic.real_estate.market_insight_card', 'Real Estate Market Insight Card',
     'Headline-led market/news insight card; brand-skinnable', null, 'market_update.v1',
     'generic', 'real_estate', 'First TMR family; classified by element truth, not provider name',
     'draft')
  on conflict (family_key) do update set updated_at = now()   -- idempotent; returns id on re-run
  returning id
),
tmpl as (
  insert into c.creative_provider_template
    (provider, provider_template_id, provider_template_name, family_id, scope,
     width, height, aspect_ratio, output_type, file_type_candidate, duration_seconds,
     inventory_status, inventory_source, captured_by, captured_at, status)
  select 'creatomate', '490ad9ea-7473-49e4-9d3c-e1ae8a12d790', 'news_quote_insight_1x1_v1',
         fam.id, 'generic', 1080, 1080, '1:1', 'static_image', null, null,
         'captured_from_docs', 'manual_sanitized_export', 'tmr-seed-apply', now(),
         'inventory_captured'
  from fam
  on conflict (provider, provider_template_id) do update set updated_at = now()
  returning id
),
fld as (
  insert into c.creative_provider_template_field
    (template_id, element_name, element_type, field_kind, dynamic, required_for_render, style_summary)
  select t.id, v.element_name, v.element_type, v.field_kind, v.dynamic, null::boolean, v.style_summary
  from tmpl t
  cross join (values
    ('Background',    'image', 'background', true,  null),
    ('Scrim',         'shape', 'shape',      false, 'fixed overlay, opacity 75%'),
    ('CategoryBadge', 'text',  'text',       true,  null),
    ('Logo',          'image', 'logo',       true,  null),
    ('Headline',      'text',  'text',       true,  null),
    ('Subtitle',      'text',  'text',       true,  null),
    ('Location',      'text',  'text',       true,  null),
    ('Date',          'text',  'text',       true,  null),
    ('Footer',        'text',  'text',       true,  null)
  ) as v(element_name, element_type, field_kind, dynamic, style_summary)
  on conflict (template_id, element_name) do nothing
  returning 1
),
plat as (
  insert into c.creative_template_platform_suitability
    (template_id, platform, placement, suitability_status, reason)
  select t.id, v.platform, 'default', v.status, v.reason
  from tmpl t
  cross join (values
    ('facebook',  'candidate',     'static 1:1 fits FB feed image'),
    ('instagram', 'candidate',     '1:1 native IG feed'),
    ('linkedin',  'candidate',     '1:1 image valid in LI feed'),
    ('website',   'candidate',     '1:1 image embeddable'),
    ('youtube',   'not_suitable',  'video surface; static 1:1 not a YT video unless transformed')
  ) as v(platform, status, reason)
  on conflict (template_id, platform, placement) do nothing
  returning 1
),
vc as (
  insert into c.creative_template_variant_candidate
    (template_id, format_key, variant_key, fit_status, required_field_mapping_status,
     missing_fields, fit_reason)
  select t.id, null, v.variant_key, v.fit_status, v.mapping_status, v.missing_fields, v.fit_reason
  from tmpl t
  cross join (values
    ('market_update.v1', 'strong_candidate',    'pending',
       null::jsonb,
       'Headline/Subtitle/Location/Date/Footer/CategoryBadge fits market insight card'),
    ('quote_card.v1',    'needs_template_edit', 'blocked_missing_fields',
       '["quote_text","attribution_source"]'::jsonb,
       'no quote slot, no attribution/source slot — requires template edit')
  ) as v(variant_key, fit_status, mapping_status, missing_fields, fit_reason)
  on conflict (template_id, variant_key) do nothing
  returning 1
),
ca as (
  insert into c.creative_template_client_assignment
    (template_id, client_id, assignment_scope, assignment_status, style_guide_reference)
  select t.id,
         (select id from c.client where client_slug = 'property-pulse'),   -- RESOLVE_AT_APPLY (guard: exactly one)
         'pilot_only', 'proposed',
         'docs/creative-library/property-pulse-styleguide-v1.md'
  from tmpl t
  on conflict (template_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid)) do nothing
  returning 1
),
au as (
  insert into c.creative_template_inventory_audit
    (template_id, captured_by, capture_method, source_reference, inventory_hash,
     changed_fields, no_secret_assertion, no_mutation_assertion)
  select t.id, 'tmr-seed-apply', 'manual_sanitized_export',
         'Session 3 intake mapping + schema migration (docs-derived)',
         null,                                  -- inventory_hash RESOLVE_AT_APPLY (sha256 of sanitized capture)
         '{"captured":"family,template,9 fields,5 platforms,2 variants,1 assignment"}'::jsonb,
         true, true
  from tmpl t
  returning 1
)
select 'DESIGN ONLY — seed shape'      as note,
       (select count(*) from fld)      as fields_rows,
       (select count(*) from plat)     as platform_rows,
       (select count(*) from vc)       as variant_rows,
       (select count(*) from ca)       as assignment_rows,
       (select count(*) from au)       as audit_rows;
-- ZERO inserts into c.creative_template_proof_event by construction.
```

**Idempotency notes (honest bounds):** family / provider_template use `ON CONFLICT … DO UPDATE
… RETURNING` so the CTE yields its id on re-run; fields / platforms / variants / assignment use
`ON CONFLICT … DO NOTHING` against their real unique keys (the assignment matches the expression
unique index). The **audit table is append-only with no unique key** — a re-run would append a second
audit row; the apply lane therefore runs the seed **once** (a not-exists guard can be added at apply
time if desired). The slug subquery for `client_id` must be guarded to resolve to exactly one row.

## N. Dashboard expected result after a future apply

After the seed applies, `/create/templates` (consuming `get_tmr_template_list` / `_detail`) shows:

- **Exactly one template row** — `news_quote_insight_1x1_v1` (Creatomate, `static_image`, `1:1`,
  1080×1080), family label **Real Estate Market Insight Card**, `inventory_status: captured_from_docs`.
- **`lifecycle_rollup = needs_template_edit`** — the inline weakest-gate floor. With this seed:
  `inv_captured=true`, `has_fields=true`, `is_blocked=false`, **`has_needs_edit=true`** (from
  `quote_card.v1`) → rollup short-circuits to `needs_template_edit`. It is **not** `production_proven`
  (no `platform_publish` proof) — by construction it never can be from a seed.
- **`blocker_summary = ["needs_template_edit", "no_render_proof", "no_publish_proof"]`** (with the PP
  assignment present, `unassigned` does **not** appear; if the apply lane **defers** the assignment,
  `blocker_summary` also includes `"unassigned"` — rollup stays `needs_template_edit` either way).
- **`strongest_variant_candidate = {market_update.v1, strong_candidate}`**, `variant_candidate_count: 2`.
- **`platform_candidate_summary`** = 4 `candidate` (fb/ig/li/website) + 1 `not_suitable` (youtube);
  **none `platform_safe` / `production_proven`**.
- **`proof_summary = []`** (zero proof events) · `last_audit_at` = the audit row's `captured_at`.
- **Detail drawer** (`get_tmr_template_detail`) shows: identity, family, output contract (with
  `file_type_candidate:null`), 9 field-inventory rows (`has_default:false` each), 5 platform rows,
  2 variant candidates (quote_card `missing_field_count:2`), 1 client assignment (PP `pilot_only` /
  `proposed`), 1 audit row (`no_secret_assertion:true`, `no_mutation_assertion:true`), **`proof_events: []`**.
- **Summary cards** move from 0 → reflecting **one unproven, needs-attention** template. **No
  `production_proven`, no enablement, no proof.**

## O. Future review / apply chain (recommended next lanes)

1. **DB / data-shape review** of this seed packet (db-rls-auditor) — column/enum/FK/idempotency correctness.
2. **Security review** (security-auditor) — focused on **no fake proof, no enablement, no raw provider
   payload, no secrets, client_id resolved by slug not faked**.
3. **External review** (`ask_chatgpt_review`) on the final seed SQL — record `reviewed_input_hash`.
4. **PK apply hard-stop packet** — exact migration name + apply command + preconditions; PK gate.
5. **Apply the exact seed migration** (PK-run; `apply_migration`, or `execute_sql` fallback + ledger
   backfill if harness-denied).
6. **Verify** `/create/templates` shows **one candidate row** in the expected `needs_template_edit`
   state (§N), zero proof events.

## P. Final packet verdict

**READY FOR SEED PACKET REVIEW.**

All seven row sets map to exact schema columns with enum-valid, conservative values; proof events are
zero; no `production_proven`/`platform_safe`/`verified`/enablement anywhere; the only deferred item —
the PP `client_id` — is a **soft ref resolvable deterministically by slug at apply time** (not a PK
blocker, not a faked UUID). No PK/schema decision is *required* to proceed to review; the apply lane
must (a) confirm the `c.client` slug resolution and (b) compute the two `RESOLVE_AT_APPLY` hashes.

## Q. Explicit non-claims / scope

Docs-only. **No** migration file created · **no** `supabase/migrations/` change · **no** `execute_sql`
· **no** `apply_migration` · **no** DB query / DB mutation · **no** row inserted · **no** seed · **no**
proof event · **nothing** verified / `platform_safe` / `production_proven` / enabled / bound · **no**
Creatomate / provider call · **no** render / publish / deploy · **no** `invegent-dashboard` edit · **no**
runtime / server-action / dashboard / CCF / `.claude` / `_harness` edit · **no** secrets / keys / tokens
added. TMR schema + read RPCs unchanged (live, verified, registry empty until a future apply).

## Cross-references
- Schema source of truth: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`.
- Read RPCs (surfacing): `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql`.
- Read-path packet: `docs/briefs/tmr-read-rpc-server-action-path-packet.md`.
- TMR design: `docs/briefs/template-metadata-registry-v1-design.md`.
- Intake wizard flow: `docs/briefs/creative-intake-template-wizard-flow-v2.md`.
- TMR read-only view design: `docs/briefs/tmr-dashboard-readonly-view-design-brief.md`.
- Apply results: `docs/briefs/template-metadata-registry-tmr3-apply-result.md`,
  `docs/briefs/template-metadata-registry-read-rpc-apply-result.md`.
- Register: v4.51 (this packet).
