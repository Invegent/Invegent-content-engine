# TMR First Template Seed Packet — Combined Review (data-shape + security)

## A. Review status

- **reviewed_seed_packet_hash:** `661b3d798603fcd63de6fc3e9e67a5c81fc2fb630b4725b0b908dfa35a1f99c4`
  (`docs/briefs/tmr-first-template-seed-packet-draft.md`, v4.51 — unmodified by this review).
- **schema migration hash:** `f6733fa73ef6246b030bbcbbb1165086d41b578aab4adb66323eb459eca54f56`
  (`supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`) — verified MATCH.
- **read RPC migration hash:** `88efec0c5903ad84e0a88304e36d01f52904a4247b40a0abf4e81857ebdaa55f`
  (`supabase/migrations/20260630050000_tmr_read_rpc_v1.sql`) — verified MATCH.
- **Review type:** combined **data-shape + security** review (static, repo-only).
- **No migration created. No SQL executed. No DB mutation. No provider call. No live DB inspected.**
- **CE state:** `main == origin/main == 89a6bb4`; register **v4.51 → v4.52** with this review.

## B. Source documents reviewed

- `docs/briefs/tmr-first-template-seed-packet-draft.md` (the v4.51 packet under review).
- `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql` (schema source of truth).
- `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql` (read-RPC surfacing logic).
- `docs/briefs/template-metadata-registry-read-rpc-apply-result.md`,
  `docs/briefs/tmr-read-rpc-server-action-path-packet.md` (read-path / apply context).

## C. Data-shape review

Every proposed column was checked against the migration DDL.

| # | Table | Columns used | Verdict |
|---|---|---|---|
| 1 | `c.creative_template_family` | family_key, family_name, creative_purpose, default_format_candidate, default_variant_candidate, scope, industry_vertical, description, status | **PASS** — all exist; `default_format_candidate`/`default_variant_candidate` correctly left as candidate (NOT FK) |
| 2 | `c.creative_provider_template` | provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, file_type_candidate, duration_seconds, inventory_status, inventory_source, captured_by, captured_at, status | **PASS** — all exist; `family_id` FK threaded from CTE; `client_id`/`brand_key` left NULL (generic) |
| 3 | `c.creative_provider_template_field` | template_id, element_name, element_type, field_kind, dynamic, required_for_render, style_summary | **PASS** — all exist; 9 distinct `element_name` → satisfies `unique(template_id, element_name)` |
| 4 | `c.creative_template_platform_suitability` | template_id, platform, placement, suitability_status, reason | **PASS** — all exist; 5 distinct platforms @ `placement='default'` → satisfies `unique(template_id, platform, placement)` |
| 5 | `c.creative_template_variant_candidate` | template_id, format_key, variant_key, fit_status, required_field_mapping_status, missing_fields, fit_reason | **PASS** — all exist; 2 distinct `variant_key` → satisfies `unique(template_id, variant_key)`; `missing_fields` is a JSONB array |
| 6 | `c.creative_template_client_assignment` | template_id, client_id, assignment_scope, assignment_status, style_guide_reference | **PASS** — all exist; `client_id` soft-resolved (§F) |
| 7 | `c.creative_template_inventory_audit` | template_id, captured_by, capture_method, source_reference, inventory_hash, changed_fields, no_secret_assertion, no_mutation_assertion | **PASS** — all exist; NOT-NULL `captured_by` + both assertions provided; `captured_at` uses `default now()` |

- **Insert order respects FKs:** `family → provider_template → (fields, platforms, variants, assignment, audit)`. CTE chain `fam → tmpl → fld/plat/vc/ca/au` is FK-correct. **PASS.**
- **Generated IDs not hardcoded:** all PK `id`s use `gen_random_uuid()` defaults. `provider_template_id` is the **external Creatomate id** (correctly a literal — it is data, not a generated PK). The `'000…000'` in the assignment `ON CONFLICT` is the index sentinel, **not** a faked `client_id`. **PASS.**
- **No proof_event rows proposed.** **PASS** (§I).
- **No unrelated tables touched.** Only the 7 TMR tables. **PASS.**

## D. Enum / status review

All values checked against the migration CHECK constraints.

| Field | Value(s) | CHECK domain | Verdict |
|---|---|---|---|
| `provider` | `creatomate` | free text (no CHECK) | PASS |
| `output_type` | `static_image` | static_image/animated_image/video/audio/unknown | PASS |
| family `scope` | `generic` | generic/brand/client | PASS |
| family `status` | `draft` | draft/active/deprecated/blocked | PASS |
| provider_template `scope` | `generic` | generic/brand/client | PASS |
| `inventory_status` | `captured_from_docs` | missing/requested/captured_from_docs/… | PASS |
| provider_template `status` | `inventory_captured` | discovered/…/inventory_captured/…/production_proven/… | PASS (conservative — mid-low lifecycle) |
| field `field_kind` | background, shape, text, logo | text/image/logo/background/shape/audio/video/unknown | PASS |
| suitability `suitability_status` | candidate, not_suitable | unknown/candidate/not_suitable/needs_review/platform_safe/production_proven/blocked | PASS |
| variant `fit_status` | strong_candidate, needs_template_edit | unknown/candidate/strong_candidate/weak_candidate/needs_template_edit/unsuitable/blocked | PASS |
| variant `required_field_mapping_status` | pending, blocked_missing_fields | free text (no CHECK) | PASS |
| assignment `assignment_scope` | pilot_only | generic_allowed/brand_allowed/client_allowed/client_blocked/pilot_only | PASS |
| assignment `assignment_status` | proposed | proposed/approved/visually_approved/client_enabled/production_proven/deprecated/blocked | PASS |
| audit `capture_method` | manual_sanitized_export | manual_sanitized_export/provider_read_endpoint/connector_read/render_probe/unknown | PASS |
| audit `no_secret_assertion`/`no_mutation_assertion` | true / true | NOT NULL boolean | PASS |

**No invalid value found.** **Verdict: PASS.**

## E. Conservatism review

- `inventory_status = captured_from_docs`, provider_template `status = inventory_captured` — inventory/candidate only. **PASS.**
- **No `verified`** (inventory_status not `verified`; status not `inventory_verified`). **PASS.**
- **No `platform_safe`** (all suitability `candidate`/`not_suitable`). **PASS.**
- **No `production_proven`** anywhere (template status, suitability, assignment). **PASS.**
- **No `client_enabled` / no enablement** (assignment `proposed`). **PASS.**
- **No binding** (variant rows are candidates; `format_key`/`default_*_candidate` NULL). **PASS.**
- **No real proof** (zero proof events). **PASS.**
- **No Format Mix eligibility** asserted. **PASS.**

**Verdict: PASS — packet is uniformly conservative.**

## F. Property Pulse client_id resolution review

The packet sets `client_id` = **RESOLVE_AT_APPLY** and proposes the apply-lane resolution
`(select id from c.client where client_slug = 'property-pulse')`. Review position:

- **Resolve by `client_slug = 'property-pulse'` — endorsed.** Correct approach: deterministic, not a
  hardcoded/faked UUID.
- **Guard exactly one row — required.** The apply SQL must **fail/abort** if the subquery returns
  **zero or multiple** rows (a bare subquery returning 0 rows would silently insert `client_id=NULL`,
  which is wrong-but-not-fatal; >1 row errors). The apply lane must wrap it in an explicit
  single-row guard (e.g. `INTO STRICT` in a DO block, or a `HAVING count(*)=1` precheck).
- **No hardcoded UUID, no faked client_id — confirmed** in the packet.
- **Cannot be fully verified from repo evidence in this lane:** `c.client` is a soft reference (no FK
  in the TMR schema), and DB inspection is forbidden here, so the existence of the `client_slug`
  column and the exact `'property-pulse'` slug **cannot be proven from the read-only repo set alone**.
  → **IMPLEMENTATION-LANE VERIFY** (TMR-SEED-REV-004): the apply lane confirms the column + slug and
  enforces the single-row guard, fail-closed. **No UUID invented here.**

## G. Idempotency / duplicate-safety review

| Table | Uniqueness handling | Verdict |
|---|---|---|
| family | `ON CONFLICT (family_key) DO UPDATE SET updated_at=now() RETURNING id` | PASS — idempotent; yields id on re-run |
| provider_template | `ON CONFLICT (provider, provider_template_id) DO UPDATE … RETURNING id` | PASS — matches `unique(provider, provider_template_id)` |
| fields | `ON CONFLICT (template_id, element_name) DO NOTHING` | PASS — matches inline UNIQUE |
| platform_suitability | `ON CONFLICT (template_id, platform, placement) DO NOTHING` | PASS — matches inline UNIQUE |
| variant_candidate | `ON CONFLICT (template_id, variant_key) DO NOTHING` | PASS — matches inline UNIQUE |
| assignment | `ON CONFLICT (template_id, coalesce(client_id,'000…'::uuid)) DO NOTHING` | **IMPLEMENTATION-LANE VERIFY** (TMR-SEED-REV-005) — target must match the **expression** unique index `creative_template_client_assignment_uq` for inference; apply lane confirms inference, else use `WHERE NOT EXISTS` |
| inventory_audit | append-only, no unique key | **WARNING** (TMR-SEED-REV-006) — a re-run **appends a second audit row**; apply lane must run once or add a `WHERE NOT EXISTS` guard on (template_id, capture_method, source_reference)/hash |

**Verdict: PASS with two implementation-lane carries** (assignment expression-index inference; audit
append-only run-once). Neither blocks external review.

## H. Security / no-secret review

- **No raw provider payload** — fields carry sanitized metadata (element_name/kind/dynamic/style); no
  Creatomate JSON dump. **PASS.**
- **No API key / token / bearer / secret** anywhere in the packet. **PASS.**
- **No provider credentials.** `provider_template_id` is an **external identifier** (schema comment:
  "external id, NOT a secret"); `provider_project_reference` left NULL. **PASS.**
- **No raw render/publish payload.** **PASS.**
- **No browser role access** — schema `c` is non-REST-exposed, deny-all RLS, service_role-bypass;
  future insert is **service-role-only**. **PASS.**
- **No CCF / `.claude` / `_harness` change.** **PASS.**
- **`captured_by` = `'tmr-seed-apply'`** is a label, not a secret. **PASS.**

**Verdict: PASS.**

## I. No-fake-proof review

- **Zero `c.creative_template_proof_event` rows** in the seed — confirmed by construction. **PASS.**
- No `smoke_render`, no `visual_approval`, no `platform_render`, no `platform_publish` proof. **PASS.**
- **No `production_proven`** (requires a passing `platform_publish` proof — absent). **PASS.**
- **No fabricated `evidence_reference`** (no proof rows ⇒ none). **PASS.**
- **Future write/proof path must validate `evidence_reference`** against real `m.*` evidence — carried
  forward as the standing rule (the read RPC encodes `production_proven` ONLY via a real
  `platform_publish` + `proof_status='passed'`). **PASS (carry recorded).**

**Verdict: PASS.**

## J. Dashboard expected result review (re-derived from the read RPC)

Re-computed `get_tmr_template_list` signals for the seeded row:
`inv_captured=true` (captured_from_docs ∈ set) · `has_fields=true` (9 rows) · `is_blocked=false` ·
**`has_needs_edit=true`** (quote_card.v1) · `has_platform_any=true` (4 candidate) ·
`has_platform_safe=false` · `has_assignment=true` (proposed/pilot_only) · `has_render_proof=false` ·
`has_publish_proof=false`.

- **One row** appears. **CONFIRMED.**
- **Not `production_proven`** (no `platform_publish` proof). **CONFIRMED.**
- **`proof_summary = []`.** **CONFIRMED.**
- **`lifecycle_rollup = needs_template_edit`** — the CASE short-circuits at `has_needs_edit` (after
  passing blocked/inventory/fields checks). **CONFIRMED** — matches the packet; the reviewer
  independently re-derived it from the read-RPC CASE order and finds no different conservative state.
- **`blocker_summary = ["needs_template_edit", "no_render_proof", "no_publish_proof"]`** (with the PP
  assignment present, `unassigned` absent; if assignment deferred, `+"unassigned"`, rollup unchanged).
  **CONFIRMED.**
- **Detail drawer** shows fields (9) / platforms (5) / variants (2) / assignment (1) / audit (1) and
  **`proof_events: []`**. **CONFIRMED.**

**Verdict: PASS — dashboard expectation is accurate and independently verified.**

## K. Findings

| ID | Severity | Location | Description | Required action | Blocks external review? |
|---|---|---|---|---|---|
| TMR-SEED-REV-001 | **PASS** | §C / packet D–K | Data shape: all 7 tables column-exact, FK order correct, zero proof events, no unrelated tables | none | No |
| TMR-SEED-REV-002 | **PASS** | §D / packet E–K | Enum/status: every value valid against schema CHECKs | none | No |
| TMR-SEED-REV-003 | **PASS** | §E | Conservatism: nothing verified/platform_safe/production_proven/enabled/bound/proven | none | No |
| TMR-SEED-REV-004 | **IMPLEMENTATION-LANE VERIFY** | §F / packet J,M | PP `client_id` resolved by `client_slug='property-pulse'`; `c.client` slug not provable from repo (no DB this lane) | apply lane: confirm column+slug, enforce single-row guard (fail-closed), no faked UUID | No |
| TMR-SEED-REV-005 | **IMPLEMENTATION-LANE VERIFY** | §G / packet M (`ca` CTE) | Assignment `ON CONFLICT` targets an **expression** unique index; inference may be finicky | apply lane: confirm inference matches `creative_template_client_assignment_uq`, else use `WHERE NOT EXISTS` | No |
| TMR-SEED-REV-006 | **WARNING** | §G / packet K,M (`au` CTE) | Audit table is append-only (no unique key) — re-run duplicates the audit row | apply lane: run once, or add `WHERE NOT EXISTS` guard | No |
| TMR-SEED-REV-007 | **IMPLEMENTATION-LANE VERIFY** | packet F,K | Two `RESOLVE_AT_APPLY` `inventory_hash` values | apply lane: compute deterministic sha256 of the sanitized capture | No |
| TMR-SEED-REV-008 | **PASS** | §H | Security/no-secret: no raw payloads/tokens; service-role-only; external id ≠ secret | none | No |
| TMR-SEED-REV-009 | **PASS** | §I | No fake proof: zero proof_event rows; future proof path must validate evidence_reference | none (carry recorded) | No |
| TMR-SEED-REV-010 | **PASS** | §J | Dashboard result independently re-derived from read RPC; matches packet | none | No |
| TMR-SEED-REV-011 | **IMPLEMENTATION-LANE VERIFY** | packet E,I | `default_format_candidate`/variant `format_key` left NULL — canonical `market_update` ice_format_key unconfirmed | confirm canonical key **before any future binding** (not this seed) | No |

**No BLOCKER. No PK DECISION required.** All non-PASS items are apply-time verifications or a minor
append-only-idempotency warning — none gates external review.

## L. Final verdict

**CLEAN FOR EXTERNAL REVIEW.**

The seed packet is data-shape correct, enum-valid, FK-ordered, uniformly conservative (no
verified/platform_safe/production_proven/enablement/binding/proof), free of secrets and raw provider
payloads, proposes zero proof events, and its predicted dashboard result was independently re-derived
from the read RPC and matches. The only open items (TMR-SEED-REV-004/005/006/007/011) are
**implementation-lane verifications** for the future apply lane — they do not require packet revision
and do not block external review.

**Recommended next lane:** **TMR First Template Seed Packet External Review** (`ask_chatgpt_review` on
the final seed SQL; record `reviewed_input_hash`) → then the PK apply hard-stop packet.

## M. Explicit non-claims / scope

Docs/register only. **No** migration file · **no** `supabase/migrations/` change · **no**
`execute_sql` / `apply_migration` / DB query / DB mutation · **no** seed / row insert · **no** proof
event · **nothing** verified / `platform_safe` / `production_proven` / enabled / bound · **no**
provider / Creatomate call · **no** render / publish / deploy · **no** `invegent-dashboard` / runtime /
server-action / dashboard / CCF / `.claude` / `_harness` edit · **no** secret added. The reviewed
packet was **not modified** (hash `661b3d79…` unchanged).

## Cross-references
- Reviewed packet: `docs/briefs/tmr-first-template-seed-packet-draft.md` (v4.51).
- Schema source of truth: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`.
- Read RPCs (surfacing): `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql`.
- Read-path packet: `docs/briefs/tmr-read-rpc-server-action-path-packet.md`.
- Register: v4.52 (this review).
