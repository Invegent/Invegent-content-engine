-- cc-0044 Part-2 closeout — ledger-record backfill for the B2 shared-attribution fix.
-- ONE recording-only row into supabase_migrations.schema_migrations. NO functional/schema/data effect.
-- Pointer-row pattern (matches the existing 20260719210000 house convention): the FULL applied DDL
-- lives in the repo migration file supabase/migrations/20260720190000_*.sql; this row records that
-- the migration is applied so the ledger stays monotonic and CLI push won't re-run it.
-- Idempotent (WHERE NOT EXISTS) — safe to run twice.
-- Rollback: DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260720190000';

INSERT INTO supabase_migrations.schema_migrations
  (version, name, statements, rollback, created_by, idempotency_key)
SELECT
  '20260720190000',
  'cc0044_b2_run_asset_gap_analysis_shared_attribution_fix_v1',
  ARRAY[
    $stmt$-- cc-0044 Checkpoint D Blocker B2 shared-attribution fix -- CREATE OR REPLACE FUNCTION public.run_asset_gap_analysis(integer,integer,boolean,text): route a shared-inventory-resolved asset to resolved_shared_asset_id instead of the unconditional resolved_client_asset_id (which raised FK 23503 at the first live close). Function-only; ZERO table/index/grant/RLS DDL. Applied 2026-07-20 via execute_sql at a T3 PK gate (apply_migration deny-listed). Applied body sha256 = b38e36f3452752f3...; FULL DDL in repo migration supabase/migrations/20260720190000_cc0044_b2_run_asset_gap_analysis_shared_attribution_fix_v1.sql.$stmt$
  ],
  ARRAY[
    $rb$-- Rollback restores public.run_asset_gap_analysis to its prior (pre-B2) body from repo migration supabase/migrations/20260720120000_cc0044_asset_gap_analyzer_autoclose_v1.sql (B2 = 3 surgical edits, reverse == original).$rb$,
    $rb$-- Authoritative rollback source (retired ephemeral harness): _harness/cc0044_b2_shared_attr_fix_20260720/rollback_apply.sql sha256 9c4c64ac60727532...$rb$,
    $rb$-- Ledger-record removal: DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260720190000';$rb$
  ],
  'execute_sql ledger-backfill 2026-07-20 · cc-0044 Part-2 closeout (pointer backfill; full DDL body in repo file 20260720190000)',
  'cc0044_b2_run_asset_gap_analysis_shared_attribution_fix_v1_backfill'
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20260720190000'
);
