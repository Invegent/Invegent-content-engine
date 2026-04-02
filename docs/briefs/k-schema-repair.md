# Claude Code Brief — k Schema Repair

**Date:** 2 April 2026
**Status:** READY FOR EXECUTION
**Estimated duration:** 1-2 hours
**Depends on:** Nothing (standalone)

---

## CONTEXT

The k schema is ICE's governance catalog — PK built it so that AI sessions
don’t have to re-discover table structure from scratch every time.

It has a set of auto-sync functions, but three bugs and one missing feature
mean it’s partially broken and not fully trusted.

**Current state (2 Apr 2026):**
- 23 tables still have "TODO: document purpose..." entries
- 358 columns have no `column_purpose` documented
- `c` and `f` schemas missing from column auto-sync
- `sync_registries()` function errors on every call (wrong column name)
- No scheduled pg_cron job for periodic refresh
- Manually-coded purpose entries are preserved correctly on refresh (this is right)

---

## TASKS

### TASK 1 — Fix refresh_column_registry to include c and f schemas

**Current state check:**
```sql
SELECT DISTINCT table_schema
FROM information_schema.columns
WHERE table_schema IN ('c','f')
LIMIT 1;
```
If rows return, c and f schemas exist but are not in the sync function.

**Fix:** Replace the schema filter in `refresh_column_registry` from:
```sql
where c.table_schema in ('t','r','a','m','k','stg')
```
To:
```sql
where c.table_schema in ('t','r','a','m','k','stg','c','f')
```

Also update the CTE in that function. The full function needs to be replaced.
Read the current function definition first via:
```sql
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'refresh_column_registry';
```
Then apply the updated version with `c` and `f` added to the schema filter in both
the CTE and the DELETE cleanup clause.

**Verification:**
```sql
SELECT COUNT(*) FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name = 'c';
```
After running `SELECT k.refresh_column_registry()`, count should be > 0.

---

### TASK 2 — Fix sync_registries() column name bug

**The bug:** `sync_registries()` references `vw_db_objects.object_type` but the
view exposes `object_kind`. This causes an error on every call.

**Current state check:**
```sql
SELECT k.sync_registries();
```
If this errors with "column object_type does not exist", the bug is present.

**Fix:** Read the current function definition, replace `object_type` with `object_kind`.
The fix is a one-word change in the WHERE clause:
```sql
-- Change:
where o.object_type = 'table'
-- To:
where o.object_kind = 'table'
```
Apply via migration.

**Verification:**
```sql
SELECT k.sync_registries();
```
Should complete without error.

---

### TASK 3 — Add pg_cron job for periodic k schema refresh

**Current state check:**
```sql
SELECT jobname, schedule FROM cron.job WHERE jobname ILIKE '%catalog%' OR jobname ILIKE '%registry%';
```
If 0 rows, no scheduled refresh exists.

**Fix:** Schedule `refresh_catalog()` to run weekly on Sundays at 3am UTC
(after insights-worker and format-performance jobs complete):
```sql
SELECT cron.schedule(
  'k-schema-refresh-weekly',
  '0 3 * * 0',
  $$ SELECT k.refresh_catalog(); $$
);
```

**Verification:**
```sql
SELECT jobname, schedule FROM cron.job WHERE jobname = 'k-schema-refresh-weekly';
```
Should return 1 row.

---

### TASK 4 — Run refresh_catalog() to sync current state

After Tasks 1-3, run a full refresh to catch up on all schema changes
made since the last CREATE TABLE trigger:

```sql
SELECT k.refresh_catalog();
```

This will:
- Register any new tables not yet in k.table_registry
- Sync column structure for ALL schemas (including c and f after fix)
- Remove stale entries for dropped objects
- Preserve all manually-entered purpose/use_cases/join_keys/advisory fields

**Verification:**
```sql
SELECT schema_name, COUNT(*) AS tables, 
  SUM(CASE WHEN purpose LIKE 'TODO%' OR purpose LIKE 'auto-registered%' THEN 1 ELSE 0 END) AS undocumented
FROM k.table_registry
WHERE schema_name IN ('t','m','c','f','a')
GROUP BY schema_name
ORDER BY schema_name;
```
Undocumented count should be lower than before for c and f (newly synced).

---

### TASK 5 — AI-assisted purpose generation for TODO tables

**Context:** After the refresh, many tables will still have "TODO" purpose entries.
Instead of leaving them, use the Claude API to generate draft purposes by reading
the table structure and generating a description.

**Approach:**
1. Query all tables with TODO purpose in m, c, f schemas
2. For each, get columns list from k.column_registry
3. Get FK edges from k.vw_db_foreign_keys
4. Call Claude API: "Given this table in a content intelligence platform, write
   a 1-2 sentence purpose description"
5. UPDATE k.table_registry with the generated purpose
6. Mark generated entries with a note: "[AI draft — review]"

**Query to get tables needing AI documentation:**
```sql
SELECT 
  tr.schema_name,
  tr.table_name,
  string_agg(cr.column_name || ':' || cr.data_type, ', ' ORDER BY cr.ordinal_position) AS columns_list
FROM k.table_registry tr
JOIN k.column_registry cr ON cr.table_id = tr.table_id
WHERE tr.schema_name IN ('m','c','f')
  AND (tr.purpose LIKE 'TODO%' OR tr.purpose LIKE 'auto-registered%' OR tr.purpose IS NULL)
GROUP BY tr.schema_name, tr.table_name, tr.table_id
ORDER BY tr.schema_name, tr.table_name;
```

**For each table, call Anthropic API** with:
- System: "You are documenting a database for ICE, an AI-operated content publishing engine for Australian businesses. Write concise, accurate governance documentation."
- User: "Table: {schema}.{table_name}\nColumns: {columns_list}\nFK edges: {fk_edges}\n\nWrite a 1-2 sentence purpose description for k.table_registry.purpose. Be specific about what this table stores and why it exists. Include key lifecycle notes if evident from column names (e.g. status columns, timestamp columns)."

**Update with:**
```sql
UPDATE k.table_registry
SET purpose = '[AI draft - review] {generated_text}',
    updated_at = NOW()
WHERE schema_name = '{schema}' AND table_name = '{table_name}'
  AND (purpose LIKE 'TODO%' OR purpose LIKE 'auto-registered%');
```

**Verification:**
```sql
SELECT COUNT(*) FROM k.table_registry
WHERE (purpose LIKE 'TODO%' OR purpose LIKE 'auto-registered%')
  AND schema_name IN ('m','c','f');
```
Should be 0 or close to 0.

---

## COMPLETION PROTOCOL

After all tasks complete, write progress to `docs/briefs/k-schema-repair-progress.md`
with: tasks completed, tables newly documented, any errors encountered.

Do NOT update `docs/00_sync_state.md` — the Cowork nightly reconciler owns that file.

---

## IMPORTANT NOTES

- Manually-entered purpose/join_keys/advisory values are PRESERVED on refresh — do not worry about overwriting PK's work
- The ON CONFLICT in refresh_table_registry only updates table_kind/status — purpose is never overwritten by the auto-sync
- AI-generated purposes should be prefixed with "[AI draft - review]" so PK knows to validate them
- k schema DML works via execute_sql directly (no SECURITY DEFINER needed)
- Run Tasks 1-3 before Task 4 (refresh needs the fixes applied first)
