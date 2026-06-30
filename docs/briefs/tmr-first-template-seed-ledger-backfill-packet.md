# TMR First Template Seed — LEDGER BACKFILL PACKET (prepared, not executed)

## A. Packet status

- **Ledger-backfill packet ONLY.** **No ledger mutation executed.** No insert into
  `supabase_migrations.schema_migrations` performed in this lane.
- **The seed is already applied** (v4.57 apply result) — this packet does **not** re-run the seed.
- **Why the ledger is missing:** `apply_migration` was harness-denied, so the seed landed via the
  documented `execute_sql` fallback, which does **not** write the migration ledger.
- **Purpose:** reconcile the migration ledger truth-of-record by recording a single marker for the
  corrected migration identity (same pattern as prior `execute_sql`-applied ICE migrations).
- **CE state:** `main == origin/main == c1974fc`; register v4.57.

## B. Ledger evidence (read-only)

- **Ledger table:** `supabase_migrations.schema_migrations`.
- **Columns:** `version text` · `statements ARRAY` · `name text` · `created_by text` ·
  `idempotency_key text` · `rollback ARRAY`.
- **Marker row currently present for this seed:** **`<none>`** (no row matching
  `tmr_first_template_seed%` / `clientid_fix` / `news_quote_insight%`).
- **Version convention (observed):** 14-digit timestamp strings; current highest =
  `20260630050000` (`tmr_read_rpc_v1`), preceded by `20260630042316` (`tmr3_template_metadata_registry`).
- **Corrected packet hash (SQL-of-record):** `e54d32a7f82ec1dfd46be108731e10f2aa1f8eca54b054c31cd76dea654c9915`.
- **Apply result reference:** `docs/briefs/tmr-first-template-seed-apply-result.md`.

## C. Proposed ledger identity

- **name:** `tmr_first_template_seed_news_quote_insight_1x1_v1_clientid_fix` (the corrected migration
  identity that was actually applied).
- **version:** a 14-digit timestamp **sorting after `20260630050000`**. Proposed default
  **`20260630060000`** — **IMPLEMENTATION-LANE VERIFY**: the apply lane should set the **actual
  apply-time UTC timestamp** (any unique value ordering after the read-RPC migration is valid; the
  exact value is a convention detail, not a correctness one). If PK prefers a different version
  scheme, that is a **PK DECISION** — do not fabricate a misleading timestamp.
- **statements / rollback:** optional. The seed SQL has **no `supabase/migrations/` file** (it lived in
  the corrected packet, applied via `execute_sql`), so the ledger marker references the corrected
  packet (`e54d32a7…`) as SQL-of-record. The apply lane *may* populate `statements` with the corrected
  `DO` block and `rollback` with the corrected-packet §6 scoped DELETEs for completeness, or leave them
  NULL (marker-only). Either is acceptable; marker-only is the minimal, lowest-risk choice.

## D. Proposed ledger SQL

> **DESIGN ONLY — NOT EXECUTED — REQUIRES PK AUTHORIZATION.** Inserts only into the migration ledger
> table; touches **no** TMR content table; does **not** re-run the seed; creates **no** proof; does
> **not** enable / bind / render / publish. Idempotent.

```sql
-- DESIGN ONLY — NOT EXECUTED — REQUIRES PK AUTHORIZATION
-- Marker-only ledger backfill for the execute_sql-applied corrected seed.
-- version: apply lane sets the real apply-time UTC 14-digit timestamp (>'20260630050000').
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260630060000', 'tmr_first_template_seed_news_quote_insight_1x1_v1_clientid_fix')
ON CONFLICT (version) DO NOTHING;
```

- **Idempotency:** `ON CONFLICT (version) DO NOTHING` (version is the ledger PK — apply lane to
  confirm the exact constraint/PK before run; if the PK/unique differs, adjust the conflict target).
- **No content mutation:** the statement writes one ledger row and nothing else.
- **Optional richer form** (if PK wants statements/rollback populated): add
  `, statements => ARRAY[<corrected DO block>], rollback => ARRAY[<§6 scoped DELETEs>]` — design-only,
  same `ON CONFLICT` guard.

## E. Verification plan (after a future authorized ledger backfill)

- **Ledger row exists:** one row for `tmr_first_template_seed_news_quote_insight_1x1_v1_clientid_fix`.
- **TMR row counts UNCHANGED:** family 1 · provider_template 1 · field 9 · suitability 5 · variant 2 ·
  assignment 1 · audit 1 · **proof_event 0**.
- **`proof_event` remains 0**; no `production_proven`; no enablement.
- **Dashboard state unchanged** (`needs_template_edit`, blockers, empty proof_summary).
- **No content mutation** — only the single ledger row was added.

## F. Packet verdict

**READY FOR LEDGER BACKFILL REVIEW.**

The ledger table/columns are confirmed, the marker is absent (backfill genuinely needed), the proposed
marker is grounded in live convention, and the design-only SQL is minimal, idempotent, and
content-safe. The **only** open item is the **version string** (IMPLEMENTATION-LANE VERIFY — apply lane
sets the real apply-time timestamp) and the optional `statements`/`rollback` population (PK DECISION,
defaults to marker-only). Neither blocks review.

**Next lane:** Ledger Backfill Review → PK-authorized ledger backfill apply (marker-only) → §E
verification. The seed itself is already live and verified; this only reconciles the ledger.

## G. Explicit non-claims / scope

Docs/register only. **No** ledger mutation · no `supabase_migrations` insert · no `apply_migration` ·
no `execute_sql` mutation · no `supabase/migrations/` file · no TMR content insert/update/delete · no
proof event · no enable / bind / render / publish / deploy · no dashboard / runtime / CCF / `.claude` /
`_harness` edit · no secret. The applied seed and the corrected packet (`e54d32a7…`) are unmodified.

## Cross-references
- Apply result: `docs/briefs/tmr-first-template-seed-apply-result.md` (v4.57).
- Corrected apply packet (applied, SQL-of-record): `docs/briefs/tmr-first-template-seed-apply-hard-stop-packet-correction.md` (`e54d32a7…`).
- Register: v4.57 (this packet recorded alongside the apply result).
