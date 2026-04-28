# Brief — Phase B Migration Filename Hygiene

> **Owner:** Claude Code
> **Reviewer:** PK (commits the result)
> **Output:** Single rename commit
> **Estimated CC time:** 5 minutes

## Why

Lesson #36 says migration filenames are permanent audit artefacts and must match the DB version they applied. The Phase B applied migration is `schema_migrations.version = 20260428064115` (UTC, the actual apply time via Supabase MCP). The GitHub file is named `supabase/migrations/20260428163000_audit_f002_p2_column_purposes_corrected.sql` (16:30 was AEST framing during apply). Cosmetic only — Supabase MCP doesn't read filenames — but the audit trail will be inspected later and the mismatch is the kind of thing F-003's detector flags. Phase A and Phase C filenames already match their DB versions correctly; only Phase B is misnamed.

## Action

In the `Invegent-content-engine` repo, on `main`:

1. `git mv supabase/migrations/20260428163000_audit_f002_p2_column_purposes_corrected.sql supabase/migrations/20260428064115_audit_f002_p2_column_purposes_corrected.sql`
2. Verify the file content is unchanged — only the filename moved
3. Commit with message: `chore(migrations): rename Phase B migration filename to match DB version 20260428064115`
4. Push to `main` directly (per direct-push default for dev work)

## Why git mv (not GitHub MCP)

`git mv` records this as a true rename in git history. The GitHub MCP add-then-delete approach loses the rename relationship and shows up as two separate file events in `git log --follow`. Permanent artefact — keep the rename clean.

## Verification before commit

- `git status` should show exactly one renamed file, no other changes
- `git diff --staged` should show R100 (100% similarity) for the rename, no content edit
- The `_corrected` suffix is preserved (Lesson #36 enforcement)

## Reference for verification

If CC needs to confirm the DB version, query Supabase via MCP:
```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE name LIKE 'audit_f002_p2%'
ORDER BY version;
```
The version should be `20260428064115`. The corresponding file on disk should match.

## Out of scope

- Editing migration content — content is authoritative as applied, do not touch
- Renaming Phase A or Phase C migrations — they already match their DB versions
- Adding any documentation explaining the rename — the commit message is the artefact
