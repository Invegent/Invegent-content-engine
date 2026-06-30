# TMR First Template Seed — APPLY RESULT (applied & verified)

> **Truth-of-record:** the first TMR provider template was **seeded into production and verified**.
> **Type:** docs/register record. **No new DB mutation in this recording lane** (read-only re-checks
> only). **No proof / render / publish / enablement.**
> **CE state:** `main == origin/main == c1974fc`; register **v4.56 → v4.57** with this record.
> **DB:** prod `mbkmaxqhsohbtwsqolns`.

## A. Apply status

- **Corrected seed APPLIED SUCCESSFULLY.**
- `mcp__supabase__apply_migration` — **harness-denied** → fell back to the documented `execute_sql`
  path with the **identical corrected SQL** (resolver uses `c.client.client_id`).
- **Corrected packet hash:** `e54d32a7f82ec1dfd46be108731e10f2aa1f8eca54b054c31cd76dea654c9915`
  (re-verified immediately before apply).
- **PK authorization:** fresh authorization received for the corrected packet hash (the old
  `25624600…` authorization was explicitly retired).
- **Result:** the corrected `DO` block returned `[]` with **no error**.
- **No git change during the apply turn** (DB-only).
- **No proof / render / publish / enablement / binding** performed.

## B. Failed previous attempt (record)

- Old hard-stop packet hash `25624600c450bbf09166faae12bb7628d3c855e1912a646c53053b4eafb4429a`
  was **stale / defective for apply**.
- The first attempt **failed fail-closed**: `ERROR 42703: column "id" does not exist` on
  `SELECT id FROM c.client WHERE client_slug='property-pulse'`.
- **Zero mutation** — the single transactional `DO` block aborted on statement 1 → full rollback.
- **Root cause:** `c.client` PK is `client_id`, not `id`. The correction changed exactly one line
  (`SELECT id` → `SELECT client_id`); all other safety properties were byte-preserved.

## C. Post-apply verification (read-only, reconfirmed this lane)

| Check | Expected | Actual |
|---|---|---|
| `creative_template_family` | 1 | **1** |
| `creative_provider_template` | 1 | **1** |
| `creative_provider_template_field` | 9 | **9** |
| `creative_template_platform_suitability` | 5 | **5** |
| `creative_template_variant_candidate` | 2 | **2** |
| `creative_template_client_assignment` | 1 | **1** |
| `creative_template_inventory_audit` | 1 | **1** |
| `creative_template_proof_event` | 0 | **0** |
| provider identity | creatomate / news_quote_insight_1x1_v1 / static_image / 1080×1080 / 1:1 | **match** |
| template status / inventory_status / hash | inventory_captured / captured_from_docs / present | **match** |
| `market_update.v1` `format_key` | NULL (no binding) | **NULL** |
| suitability platform_safe/production_proven | 0 | **0** |
| any provider_template `production_proven` | 0 | **0** |
| assignment state | proposed / pilot_only | **proposed/pilot_only** |
| assignment client == Property Pulse | true | **true** |
| audit `no_secret_assertion` ∧ `no_mutation_assertion` | true | **true** |

## D. Dashboard / read-RPC state

Via `public.get_tmr_template_list()` / `get_tmr_template_detail(uuid)` (service-role):
- `/create/templates` now shows **one row** — `news_quote_insight_1x1_v1`.
- The row is **unproven**: `lifecycle_rollup = needs_template_edit` (short-circuits at `has_needs_edit`
  via `quote_card.v1`).
- `blocker_summary = [needs_template_edit, no_render_proof, no_publish_proof]`.
- `proof_summary = []`. `production_proven = false`.
- Detail drawer: 9 fields, 5 platform-suitability, 2 variant candidates, 1 assignment, 1 audit,
  **empty proof_events**.

## E. Safety confirmation

- **Zero `proof_event` rows.** No `platform_safe`. No `production_proven`. No `verified`.
- **No enablement, no binding** (assignment `proposed/pilot_only`; `format_key` NULL).
- **No render, no publish.**
- **No raw provider payload / no secrets.** Secret scan of the live detail payload is **CLEAN** — the
  only "secret" substring is the benign audit **key name** `no_secret_assertion`; zero
  `access_token` / `credential_env_key` / `page_access_token` / `destination_id` / bearer / api_key /
  password markers.

## F. Carries

- **Migration ledger backfill REQUIRED** — `execute_sql` fallback bypassed `apply_migration`, so
  `supabase_migrations.schema_migrations` has **no marker** for the seed. Prepared (not executed):
  `docs/briefs/tmr-first-template-seed-ledger-backfill-packet.md`.
- **PK visual smoke** of the `/create/templates` one-row `needs_template_edit` state (production is
  login-gated; headless visual not possible).
- **Render / proof workflow remains separate** — no smoke/render/visual/platform/publish proof exists
  or is implied; promoting beyond `inventory_captured` requires real evidence via a future proof lane.
- **No Format Mix eligibility** until a proof + enablement workflow exists (the template is a candidate
  inventory record only).
- **No `supabase/migrations/` file** for this seed (the SQL lived in the corrected packet, applied via
  `execute_sql`); the corrected packet (`e54d32a7…`) is the SQL-of-record — a known repo↔ledger
  divergence the backfill packet documents.

## Cross-references
- Corrected apply packet (applied): `docs/briefs/tmr-first-template-seed-apply-hard-stop-packet-correction.md` (`e54d32a7…`).
- Ledger backfill packet (prepared): `docs/briefs/tmr-first-template-seed-ledger-backfill-packet.md`.
- DB/RLS audit: `docs/briefs/tmr-first-template-seed-db-rls-audit.md`.
- External re-review (corrected SQL): `ask_chatgpt_review` `a8948273-3d30-4c80-8468-eb5cf4de0269` (agree).
- Schema / read RPC: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`,
  `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql`.
- Register: v4.57 (this record).
