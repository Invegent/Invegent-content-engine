-- Audit recurrence prevention — Slice 1 (lightweight)
-- Source: chat session 2026-04-28, post F-001/F-002/F-003 closures.
-- Goal: prevent the audit loop rediscovering the same documentation gap each cycle.
--
-- Three changes:
--   1. k.refresh_table_registry — uses 'PENDING_DOCUMENTATION' sentinel (was 'TODO: document purpose for X')
--   2. k.refresh_column_registry — writes 'PENDING_DOCUMENTATION' to column_purpose on INSERT (was NULL)
--   3. New function k.fn_check_migration_naming_discipline() — detects same-name-different-hash migrations (F-003 detector)
--
-- Existing rows are untouched: both refresh functions preserve column_purpose / purpose values
-- via ON CONFLICT DO UPDATE that omits those fields.
--
-- New rows (auto-registered tables/columns) will carry 'PENDING_DOCUMENTATION' as a distinguishable
-- sentinel that audit roles can match against the 14-day rule (see data_auditor.md update).
--
-- Verification post-apply: ran refresh_table_registry and refresh_column_registry — coverage held at
-- 200/200 documented, zero drift. fn_check_migration_naming_discipline correctly returned the known
-- F-003 violation (stage_12_053_fill_pending_slots_ai_job_upsert applied twice with different SQL).

-- ============================================================
-- 1. Updated refresh_table_registry — sentinel change only
-- ============================================================
CREATE OR REPLACE FUNCTION k.refresh_table_registry()
RETURNS void
LANGUAGE plpgsql
AS $func$
begin
  insert into k.table_registry (
    schema_name, table_name, table_kind, status, owner,
    source_system, source_reference, refresh_method, refresh_cadence,
    allowed_ops, pii_risk, purpose, primary_use_cases, join_keys, rules_summary, advisory
  )
  select
    n.nspname,
    c.relname,
    case c.relkind when 'r' then 'table' when 'v' then 'view' when 'm' then 'materialized_view' else 'table' end,
    'active',
    null,
    case
      when n.nspname = 't'   then 'reference'
      when n.nspname = 'r'   then 'regional_reference'
      when n.nspname = 'a'   then 'enrichment_operational'
      when n.nspname = 'm'   then 'derived_cache'
      when n.nspname = 'stg' then 'staging_import'
      when n.nspname = 'k'   then 'data_catalog'
      when n.nspname = 'c'   then 'client_config'
      when n.nspname = 'f'   then 'feed_ingest'
      else 'unknown'
    end,
    null,
    case
      when c.relkind = 'm'   then 'refresh_materialized_view'
      when n.nspname = 'stg' then 'csv_import'
      when n.nspname = 'a'   then 'upsert_automation'
      else 'manual'
    end,
    case
      when n.nspname in ('t','r') then 'static'
      when n.nspname = 'a'        then 'ongoing'
      when n.nspname = 'm'        then 'scheduled_or_on_demand'
      when n.nspname = 'stg'      then 'truncate_frequently'
      when n.nspname = 'k'        then 'as_needed'
      when n.nspname = 'c'        then 'on_client_change'
      when n.nspname = 'f'        then 'on_ingest'
      else 'unknown'
    end,
    case
      when n.nspname in ('t','r') then 'read-only'
      when n.nspname = 'a'        then 'upsert'
      when n.nspname = 'm'        then 'derived-only'
      when n.nspname = 'stg'      then 'insert-only'
      when n.nspname = 'k'        then 'upsert'
      when n.nspname = 'c'        then 'upsert'
      when n.nspname = 'f'        then 'insert-only'
      else 'read-only'
    end,
    'none',
    'PENDING_DOCUMENTATION',  -- CHANGED 28 Apr 2026 audit slice 1: was 'TODO: document purpose for X'
    null, null, null, null
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('t','r','a','m','k','stg','c','f')
    and c.relkind in ('r','v','m')
    and not (n.nspname = 'k' and c.relname = 'table_registry')
  on conflict (schema_name, table_name) do update
  set
    table_kind = excluded.table_kind,
    status     = excluded.status,
    updated_at = now();
  -- Note: ON CONFLICT does NOT update purpose — preserves operator-written purposes on existing rows.

  -- Cleanup: remove catalog rows for objects that no longer exist
  delete from k.table_registry tr
  where (tr.schema_name, tr.table_name) not in (
    select n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('t','r','a','m','k','stg','c','f')
      and c.relkind in ('r','v','m')
      and not (n.nspname = 'k' and c.relname = 'table_registry')
  );
end;
$func$;

-- ============================================================
-- 2. Updated refresh_column_registry — adds column_purpose default
-- ============================================================
CREATE OR REPLACE FUNCTION k.refresh_column_registry()
RETURNS void
LANGUAGE plpgsql
AS $func$
BEGIN
  WITH fk_raw AS (
    SELECT
      src_nsp.nspname  AS table_schema,
      src_tbl.relname  AS table_name,
      src_col.attname  AS column_name,
      con.conname      AS constraint_name,
      ref_nsp.nspname  AS fk_ref_schema,
      ref_tbl.relname  AS fk_ref_table,
      ref_col.attname  AS fk_ref_column
    FROM pg_constraint con
    JOIN pg_class src_tbl       ON src_tbl.oid = con.conrelid
    JOIN pg_namespace src_nsp   ON src_nsp.oid = src_tbl.relnamespace
    JOIN pg_class ref_tbl       ON ref_tbl.oid = con.confrelid
    JOIN pg_namespace ref_nsp   ON ref_nsp.oid = ref_tbl.relnamespace
    JOIN LATERAL unnest(con.conkey)  WITH ORDINALITY AS k1(attnum, ord)  ON TRUE
    JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS k2(attnum, ord)  ON k2.ord = k1.ord
    JOIN pg_attribute src_col ON src_col.attrelid = src_tbl.oid AND src_col.attnum = k1.attnum
    JOIN pg_attribute ref_col ON ref_col.attrelid = ref_tbl.oid AND ref_col.attnum = k2.attnum
    WHERE con.contype = 'f'
  ),
  fk AS (
    -- ROBUSTNESS FIX 24-Apr-2026: when a column has 2+ FKs, pick the alphabetically-
    -- first constraint name. Prior version produced duplicate rows during INSERT
    -- and broke every DDL event trigger firing.
    SELECT DISTINCT ON (table_schema, table_name, column_name)
      table_schema, table_name, column_name,
      fk_ref_schema, fk_ref_table, fk_ref_column, constraint_name
    FROM fk_raw
    ORDER BY table_schema, table_name, column_name, constraint_name
  ),
  cols AS (
    SELECT
      tr.table_id,
      c.table_schema,
      c.table_name,
      c.column_name,
      c.ordinal_position,
      c.data_type,
      c.udt_name,
      (c.is_nullable = 'YES') AS is_nullable,
      c.column_default,
      (fk.column_name IS NOT NULL) AS is_foreign_key,
      fk.fk_ref_schema,
      fk.fk_ref_table,
      fk.fk_ref_column
    FROM information_schema.columns c
    JOIN k.table_registry tr
      ON tr.schema_name = c.table_schema
     AND tr.table_name  = c.table_name
    LEFT JOIN fk
      ON fk.table_schema = c.table_schema
     AND fk.table_name   = c.table_name
     AND fk.column_name  = c.column_name
    WHERE c.table_schema IN ('t','r','a','m','k','stg','c','f')
  )
  INSERT INTO k.column_registry (
    table_id, column_name, ordinal_position, data_type, udt_name,
    is_nullable, column_default,
    is_foreign_key, fk_ref_schema, fk_ref_table, fk_ref_column,
    column_purpose  -- ADDED 28 Apr 2026 audit slice 1
  )
  SELECT
    table_id, column_name, ordinal_position, data_type, udt_name,
    is_nullable, column_default,
    is_foreign_key, fk_ref_schema, fk_ref_table, fk_ref_column,
    'PENDING_DOCUMENTATION'  -- ADDED 28 Apr 2026 audit slice 1: was NULL on insert
  FROM cols
  ON CONFLICT (table_id, column_name) DO UPDATE
  SET
    ordinal_position = EXCLUDED.ordinal_position,
    data_type        = EXCLUDED.data_type,
    udt_name         = EXCLUDED.udt_name,
    is_nullable      = EXCLUDED.is_nullable,
    column_default   = EXCLUDED.column_default,
    is_foreign_key   = EXCLUDED.is_foreign_key,
    fk_ref_schema    = EXCLUDED.fk_ref_schema,
    fk_ref_table     = EXCLUDED.fk_ref_table,
    fk_ref_column    = EXCLUDED.fk_ref_column,
    updated_at       = NOW();
  -- Note: ON CONFLICT does NOT update column_purpose — preserves operator-written purposes on existing rows.

  -- Cleanup: remove catalog rows for columns that no longer exist
  DELETE FROM k.column_registry cr
  USING k.table_registry tr
  WHERE cr.table_id = tr.table_id
    AND tr.schema_name IN ('t','r','a','m','k','stg','c','f')
    AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = tr.schema_name
        AND c.table_name   = tr.table_name
        AND c.column_name  = cr.column_name
    );
END;
$func$;

-- ============================================================
-- 3. New function: migration naming discipline check
-- ============================================================
-- Returns rows where the same migration name was applied twice with different SQL.
-- Empty result = no discipline gaps. Non-empty = violations of Lesson #36.
-- Callable from anywhere (audit snapshot, audit role, ad-hoc).
CREATE OR REPLACE FUNCTION k.fn_check_migration_naming_discipline()
RETURNS TABLE(
  migration_name text,
  applied_count integer,
  distinct_sql_count integer,
  versions text[],
  sql_hashes text[]
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $func$
  SELECT
    name AS migration_name,
    COUNT(*)::integer AS applied_count,
    COUNT(DISTINCT md5(array_to_string(statements, ';')))::integer AS distinct_sql_count,
    array_agg(version ORDER BY version) AS versions,
    array_agg(DISTINCT md5(array_to_string(statements, ';'))) AS sql_hashes
  FROM supabase_migrations.schema_migrations
  GROUP BY name
  HAVING COUNT(*) > 1
     AND COUNT(DISTINCT md5(array_to_string(statements, ';'))) > 1;
$func$;

COMMENT ON FUNCTION k.fn_check_migration_naming_discipline() IS
  'Detects same-migration-name-different-SQL violations (Lesson #36). Returns empty when no gaps. Source: audit closure F-2026-04-28-D-003.';
