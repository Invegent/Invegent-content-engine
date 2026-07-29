# cc-0086 apply packet — Brand Host Voice write RPCs

**Migration:** `supabase/migrations/20260729150000_cc0086_voice_config_write_rpc_v1.sql`
(built in isolated worktree `agent-a31a91cdb87d4fe1c`, branch `worktree-agent-a31a91cdb87d4fe1c`,
NOT yet applied/merged/pushed — pre-freeze static audit only)

**Brief:** `docs/briefs/cc-0086-brand-host-voice-config-brief-v1.md`

## Declared controls / assertions (author's claims — audit these against the executable SQL)

1. **Fail-closed on pre-existing objects.** Both `CREATE FUNCTION` statements are bare (not
   `CREATE OR REPLACE`), and `CREATE TABLE c.client_voice_config_change_log` is bare (not
   `IF NOT EXISTS`) — the declared intent is that if any of these three objects already exists,
   the whole migration aborts rather than silently overwriting. **Check:** is this actually
   atomic across all three creates, or could e.g. the table succeed and a function creation fail
   later, leaving a partial apply? The file has **no explicit `BEGIN;`/`COMMIT;` wrapper** (unlike
   the earlier `20260719180000_create_client_voice_config_v1.sql`, which does open with `BEGIN;`
   and close with `COMMIT;`). Determine whether the Supabase migration-apply channel (single
   `apply_migration` call / `supabase db push`) already gives this file transactional atomicity
   by default, or whether the missing explicit wrapper is a real gap vs. the declared "fail-closed,
   all-or-nothing" intent.
2. **Unknown `client_id` always raises, never a silent empty shape** (both RPCs) — verify every
   code path that reads/writes `c.client_voice_config` is preceded by the `c.client` existence
   check, with no bypass.
3. **`save_voice_config` fail-closed validation runs BEFORE any write** — verify no INSERT/UPDATE/
   audit-log write can execute before all three validations (null client_id, blank voice_id, null
   enabled) have passed.
4. **Audit table is append-only and grant-less** — verify the `REVOKE ALL` statements actually
   cover every role that would otherwise inherit access (schema-`c` default ACL auto-grants
   SELECT to `service_role`/`inspector_ro` on new tables per house convention — confirm the second
   `REVOKE ALL ... FROM service_role, inspector_ro` line actually neutralizes that default ACL and
   isn't redundant/misordered relative to when the default ACL would apply).
5. **`created_at` is never touched on the UPDATE path** — verify the `ON CONFLICT ... DO UPDATE SET`
   column list actually excludes `created_at` (it should only ever be set by the table's own
   `DEFAULT now()` at INSERT time).
6. **Apply/rollback identity** — the trailing rollback comment block lists 3 ordered `DROP`
   statements (both functions, then the table). Verify this rollback would in fact fully and
   exactly undo everything this migration's executable SQL creates — no orphaned object, no
   missing DROP, no extra object the rollback doesn't cover.
7. **Grants are `service_role`-only, no `PUBLIC`/`anon`/`authenticated`/`inspector_ro` EXECUTE on
   either function** — verify the `REVOKE`/`GRANT` statements for both functions.
8. **`SET search_path TO ''`** on both functions, with all object references schema-qualified
   (`c.client`, `c.client_voice_config`, `c.client_voice_config_change_log`) — verify no
   unqualified reference could resolve against an attacker-controlled search path.

## What NOT to do

Do not judge whether the RPC's business/product design is correct (upsert-vs-update-only choice,
JSON shape, etc.) — that is a design/product call already made in the approved brief, not this
audit's job. Do not verify live DB state (no pre-existing-object check against production — that
is `db-rls-auditor`'s job, already run separately). Static SQL-text audit only.
