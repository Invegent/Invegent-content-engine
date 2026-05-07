# scripts/

## `safe-deploy.sh` — pre-deploy drift gate

Wraps `supabase functions deploy <ef_name>` with a hard gate driven by
`m.vw_ef_drift_current` (the cron-maintained drift advisory log produced
by Stage 2a). Hard-blocks the standing don't-redeploy three
(`draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller`),
blocks Class `A`/`A-LE` (in-spec — redeploy unnecessary), blocks Class
`B-FD`/`B-RR` unless `--allow-warn`, passes Classes `C`/`D`/`repo-only`
and rows absent from the advisory log.

```
./scripts/safe-deploy.sh <ef_name> [--check-only] [--allow-warn]
```

| Exit | Meaning |
|---|---|
| 0 | PASS (deploy invoked unless `--check-only`) |
| 1 | BLOCK (Class A or unwarranted B; or usage error) |
| 2 | BLOCK (standing-three) |
| 3 | ABORT (pre-flight: connection or schema) |

**Required env:** `SUPABASE_SERVICE_ROLE_KEY`.
**Optional env:** `SUPABASE_PROJECT_REF` (defaults to `mbkmaxqhsohbtwsqolns`).

The script is **read-only against Supabase** (single `SELECT` via the
`exec_sql` RPC) — it never mutates the database. The deploy itself is
performed by the standard `supabase functions deploy` CLI on the PASS
path; the script `exec`s into the CLI and inherits its exit code.

**Contract assumption:** `m.vw_ef_drift_current` is treated as advisory
drift log, not full inventory. An absent row for `<ef_name>` = PASS.
Updating the standing-three list requires updating `docs/00_sync_state.md`
and `docs/00_action_list.md` first; the array in the script is the
mechanical encoding of those docs.

Brief: `docs/briefs/cc-stage-3-safe-deploy.md` (v1.1).
