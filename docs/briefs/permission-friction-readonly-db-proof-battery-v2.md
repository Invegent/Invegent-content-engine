# Proof battery v2 — `ice_readonly` write-impossibility + confidentiality (run BEFORE allowlisting)

**For:** `db-rls-auditor` + `security-auditor`, run **after** migration `20260719150000_ice_ro_r0_views_and_confined_role.sql` is applied **and** the credential is wired, **before** any allowlist edit. Every part must pass. Any deviation → `ALTER ROLE ice_readonly NOLOGIN`, do not ship.

**v2 vs v1:** v1's safety was conditional (wrapper read-only + credential confinement). v2's primary control is **schema-USAGE confinement**: `ice_readonly` has USAGE on `ice_ro` ONLY. Because reaching any object needs USAGE on its schema regardless of PUBLIC EXECUTE, the writer SECURITY DEFINER surface in `m`/`c` is **unreachable even with the raw credential in a read-write session** — proven in Part 3 without the wrapper. Both **integrity AND confidentiality** must pass (PK req #7).

## Part 1 — Catalog proof (DB-enforced confinement)
```sql
-- 1a. Role has NO usage on m/c. EXPECT both f.
SELECT has_schema_privilege('ice_readonly','m','USAGE') AS m_usage,
       has_schema_privilege('ice_readonly','c','USAGE') AS c_usage,
       has_schema_privilege('ice_readonly','ice_ro','USAGE') AS icero_usage;   -- expect f,f,t
-- 1b. Zero write-class privileges anywhere. EXPECT 0 rows.
SELECT table_schema, table_name, privilege_type FROM information_schema.role_table_grants
 WHERE grantee='ice_readonly' AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER');
-- 1c. SELECT grants are EXACTLY the 10 ice_ro views, nothing else. EXPECT 10 rows, all schema ice_ro.
SELECT table_schema, table_name FROM information_schema.role_table_grants
 WHERE grantee='ice_readonly' AND privilege_type='SELECT' ORDER BY 1,2;
-- 1d. Role shape + no memberships + no vault/cron usage.
SELECT rolsuper, rolbypassrls, rolcanlogin, rolcreatedb, rolcreaterole, rolreplication FROM pg_roles WHERE rolname='ice_readonly';
SELECT count(*) AS memberships FROM pg_auth_members am JOIN pg_roles r ON r.oid=am.member WHERE r.rolname='ice_readonly';  -- 0
SELECT has_schema_privilege('ice_readonly','vault','USAGE'), has_schema_privilege('ice_readonly','cron','USAGE');  -- f,f
```

## Part 2 — View sanity (owner-run, not invoker-run; all rows via owner RLS-bypass)
```sql
-- 2a. All 10 views are NOT security_invoker (run with owner rights; a security_invoker
--     view would run as ice_readonly and lose base access). EXPECT security_invoker null/false for all.
SELECT c.relname, r.rolname AS owner,
       (SELECT option_value FROM pg_options_to_table(c.reloptions) WHERE option_name='security_invoker') AS security_invoker
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner
WHERE n.nspname='ice_ro' AND c.relkind='v' ORDER BY 1;
-- 2b. Confidentiality is governed by the view DEFINITIONS, not the owner. Owner (postgres)
--     owns the base tables with force_rls=false, so views return all rows (cross-client
--     monitoring) with no per-table policies. `security-auditor` confirms every view SELECT
--     lists only SAFE+IDENTIFIER columns (Part 4). The security-critical control is that
--     ice_readonly cannot reach the base tables at all (Parts 1 + 3).
```

## Part 3 — Direct-credential write/reachability battery (NO WRAPPER — the C2 fix)
Connect **as `ice_readonly` with the wired credential, raw psql**, and try to escape. Every one must fail.
```sql
SET default_transaction_read_only = off;                 -- deliberately drop read-only
-- 3a. Base tables + their functions are UNREACHABLE (no schema USAGE). EXPECT: permission denied for schema m / c.
SELECT * FROM m.slot LIMIT 1;                             -- EXPECT permission denied for schema m
SELECT m.dead_letter_sweep();                             -- EXPECT permission denied for schema m (writer unreachable)
SELECT c.handle_schedule_rule_change();                  -- EXPECT permission denied for schema c
-- 3b. Cannot write the views or create objects. EXPECT permission denied.
INSERT INTO ice_ro.slot_status VALUES (DEFAULT);         -- EXPECT permission denied / cannot insert into view
CREATE TABLE public.ice_probe(x int);                    -- EXPECT permission denied for schema public
CREATE TABLE ice_ro.ice_probe(x int);                    -- EXPECT permission denied (no CREATE on ice_ro)
```
`security-auditor`: confirm **no error is "read-only transaction"** here — the point is the writes fail on *privilege/reachability*, so safety does NOT depend on read-only mode. (The wrapper's read-only is defence-in-depth, Part 5.)

## Part 4 — Confidentiality: no view leaks a withheld column
```sql
-- 4a. Dump each view's column set; compare against the withhold list in the migration header.
SELECT table_name, string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
FROM information_schema.columns WHERE table_schema='ice_ro' GROUP BY table_name ORDER BY 1;
```
`security-auditor` asserts NONE of these appears in any view: any `*_url`, `*_body`, `*_title`, `draft_format`, `render_spec`, `request_payload`, `response_payload`, `context`, `asset_meta`, `auto_approval_scores`, `compliance_flags`, `brand_constraints`, `constraints`, `missing_fields`, `storage_path`, `*_reason`, `dead_reason`, `skip_reason`, `error*`, `last_error*` (text), `notes`, `description`, `source_material`, `image_headline`, or any `*_by` actor column. (Note: `last_error_code`/`_subcode` integers ARE allowed; the free-text `last_error` is NOT.) Any hit → FAIL.
- 4b. Confirm the role cannot reach base tables to bypass the views (already Part 3a) — restated as the confidentiality guarantee: the ONLY data path is the 10 curated views.

## Part 5 — Wrapper defence-in-depth (gate + caps + audit)
```bash
python scripts/db-read.py "SELECT 1; UPDATE ice_ro.slot_status SET status='x'"   # REJECTED multiple
python scripts/db-read.py "SET transaction_read_only=off; SELECT 1"              # REJECTED forbidden/multiple
python scripts/db-read.py "SELECT * FROM ice_ro.slot_status"                     # OK, capped at ROW_CAP; audit line written
```
Confirm: row cap applied (≤ ICE_READONLY_ROW_CAP), an audit line appended per call, DSN never printed.

## Pass condition
Parts 1, 2, 3, 4, 5 all as expected → `scripts/db-read.py` is eligible for the `.claude/settings.json` allowlist (PK gate). Integrity (Part 3) AND confidentiality (Part 4) are both mandatory. Any deviation → `ALTER ROLE ice_readonly NOLOGIN` and re-scope.
