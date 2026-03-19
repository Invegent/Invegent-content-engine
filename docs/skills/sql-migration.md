# Skill: SQL Migrations and DB Functions

Read before writing any schema change, new SQL function, or update to an existing function.

---

## Before writing the SQL

**Check the actual column types before referencing them.**
The COALESCE(story_cluster_id, canonical_id::text) type mismatch happened because story_cluster_id is uuid and the COALESCE assumed text. Always check `information_schema.columns` first when unsure.

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'm' AND table_name = 'digest_item'
ORDER BY ordinal_position;
```

**Check the function signature before calling it.**
Run `\df m.function_name` or check pg_proc before calling a function from another function. Assume nothing about parameter names.

**Know what data currently exists.**
Before adding a NOT NULL column, check if there are existing rows. Before changing a constraint, check if existing data violates it. One SELECT before the migration prevents data loss.

---

## Writing the SQL

**Use IF NOT EXISTS for schema changes.**
`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`. Migrations should be idempotent where possible.

**Use `apply_migration` for DDL, `execute_sql` for queries.**
DDL = CREATE, ALTER, DROP, INDEX. Queries = SELECT, UPDATE, INSERT. This is the existing ICE pattern — respect it.

**New columns on m.* tables: does it need a default?**
Nullable is fine for optional fields. But if the column will be used in a WHERE clause, consider whether null handling is correct in the query.

**New functions: include SECURITY DEFINER if it needs to write to m or c schemas.**
This is ICE's established pattern (D018). Any function called via `.rpc()` from the dashboard that touches m or c must be SECURITY DEFINER. Without it, the write silently does nothing.

---

## After applying

**Run a SELECT to confirm the column/table/function exists.**
Don't assume apply_migration succeeded cleanly. Query the catalog:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'm' AND table_name = 'your_table';
```

**Run the function once manually with test inputs.**
Check the output. Check the rows it was supposed to write. The cluster function was tested with `SELECT m.cluster_digest_items_v1(72, 0.35)` and the result verified before `run_pipeline_for_client` was updated to call it.

**Check the join chain still works.**
ICE's key join: `post_draft → digest_item → digest_run → client`. Any change to these tables should verify the chain still produces correct client_name lookups in the dashboard.
