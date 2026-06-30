# TMR First Template Seed — Ledger Backfill APPLY RESULT

> **Truth-of-record:** the marker-only migration ledger backfill is **applied and verified**. The
> ledger carry from v4.57/v4.58 is **CLOSED**.
> **Type:** docs/register record. **No DB mutation in this recording lane** (read-only re-checks only).
> **No proof / render / publish / enablement.**
> **CE state:** `main == origin/main == 51d4217`; register **v4.58 → v4.59** with this record.
> **DB:** prod `mbkmaxqhsohbtwsqolns`.

## A. Apply status

- **Marker-only ledger backfill APPLIED SUCCESSFULLY.**
- **version** = `20260630112110` · **name** = `tmr_first_template_seed_news_quote_insight_1x1_v1_clientid_fix`.
- **Applied via `execute_sql`** (single ledger DML INSERT). **`apply_migration` was NOT used** — that
  tool records its own ledger entry; a manual marker backfill is the correct mechanism here.
- **Touched only `supabase_migrations.schema_migrations`** — one row inserted.
- **No TMR content mutation.** **No proof / render / publish / enablement / binding.**

## B. Authorization

- **PK authorized** the marker-only ledger backfill (fresh, explicit).
- **version** used a **real apply-time UTC 14-digit timestamp** (`20260630112110` = 2026-06-30
  11:21:10 UTC), **greater than `20260630050000`** (the prior max / read-RPC migration version).
- **`statements` / `rollback` left NULL** (marker-only default; the live ledger schema does not require
  them). Provenance is carried by the docs — the corrected packet
  (`e54d32a7f82ec1dfd46be108731e10f2aa1f8eca54b054c31cd76dea654c9915`) is the SQL-of-record.
- **Idempotency:** `ON CONFLICT (version) DO NOTHING` (`version` is the confirmed PK).

## C. Verification (read-only, reconfirmed this lane)

| Check | Expected | Actual |
|---|---|---|
| ledger marker row (by name) | exactly 1 | **1** |
| marker version | `20260630112110` (> `20260630050000`) | **`20260630112110`**, gt-floor **true** |
| marker `statements` / `rollback` | NULL / NULL | **NULL / NULL** |
| `creative_template_family` | 1 | **1** |
| `creative_provider_template` | 1 | **1** |
| `creative_provider_template_field` | 9 | **9** |
| `creative_template_platform_suitability` | 5 | **5** |
| `creative_template_variant_candidate` | 2 | **2** |
| `creative_template_client_assignment` | 1 | **1** |
| `creative_template_inventory_audit` | 1 | **1** |
| `creative_template_proof_event` | 0 | **0** |
| any `production_proven` | 0 | **0** |
| any `platform_safe` | 0 | **0** |
| read RPC list rows | 1 | **1** |
| `lifecycle_rollup` | needs_template_edit | **needs_template_edit** |
| `blocker_summary` | [needs_template_edit, no_render_proof, no_publish_proof] | **match** |
| `proof_summary` | empty | **empty (len 0)** |

## D. Safety confirmation

- **Seed was NOT rerun** — no TMR content INSERT/UPDATE/DELETE; counts unchanged.
- **`c.creative_*` tables NOT touched** — the backfill wrote only `supabase_migrations.schema_migrations`.
- **No proof events.** **No `production_proven`.** **No `platform_safe`.**
- **No enablement, no binding.** **No render. No publish.** No deploy.

## E. Final status

- **Ledger carry from v4.57/v4.58 is CLOSED** — `supabase_migrations.schema_migrations` now records the
  applied corrected seed exactly once.
- **The TMR first-template seed chain is end-to-end reconciled in production:** schema (TMR-3) → read
  RPCs → dashboard → seed (draft → combined review → external review → DB/RLS audit → failed
  fail-closed → correction → re-review → applied → verified) → ledger backfill (review → applied →
  verified). Zero proof / production_proven / enablement throughout.
- **Remaining next step:** TMR sprint **closeout / handover**.
- **Later render / proof workflow remains separate** — promoting the template beyond
  `inventory_captured` (smoke → render → visual approval → platform-safe → client-enabled →
  production-proven) requires real evidence via a future, separately-gated proof lane; **no Format Mix
  eligibility** until that exists.

## Cross-references
- Ledger backfill review: `docs/briefs/tmr-first-template-seed-ledger-backfill-review.md` (v4.58, `bb678411…`).
- Ledger backfill packet: `docs/briefs/tmr-first-template-seed-ledger-backfill-packet.md` (`df3742ea…`).
- Seed apply result: `docs/briefs/tmr-first-template-seed-apply-result.md` (v4.57).
- Corrected apply packet (SQL-of-record): `docs/briefs/tmr-first-template-seed-apply-hard-stop-packet-correction.md` (`e54d32a7…`).
- Schema / read RPC: `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql`,
  `supabase/migrations/20260630050000_tmr_read_rpc_v1.sql`.
- Register: v4.59 (this record).
