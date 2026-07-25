# R3a — apply + deploy runbook (PK-gated) · with EXECUTABLE ordering guard

**STOP: apply/deploy is PK's hard stop.** This runbook makes the "migration-before-worker" ordering an
**executable named pre-check**, not prose (apply-harness check-1 fix). Two artifacts, fixed order.

| # | Artifact | sha256 | Applies as |
|---|---|---|---|
| 1 | `r3a-resolver-shadow-migration-v4.sql` | `07313a891e27b557eb91e2285db94938347655ffdb0c4dc961cc0917d08f080c` | migration (columns + resolver) |
| 2 | `r3a-ai-worker-shadow-v2.diff` | `c578f98dd0b988a7436d0dc8aabe5fd0d97f763abbc6ca1bdaeaf49e420c39f5` | ai-worker deploy v2.21.0 |

## STEP 0 — re-gate
Stale-ref CE (`HEAD == origin/main`, parity 0/0); artifact hashes intact; worktree 0-ahead.

## STEP 1 — APPLY ARTIFACT 1 (migration) FIRST · PK-run
Apply `r3a-resolver-shadow-migration-v4.sql`. It self-guards: a **named pre-assertion** aborts the whole
migration if any of the nine shadow columns **OR** the 5-arg resolver function already exist — so apply
authoritatively owns creation of **every** object (columns + function), symmetric with rollback.

**Post-apply proof (read-only):**
```sql
-- (a) all nine columns present
SELECT count(*) AS shadow_cols_present
FROM information_schema.columns
WHERE table_schema='m' AND table_name='post_draft'
  AND column_name IN ('advisor_format','requested_format','format_mode','shadow_resolved_format',
      'final_format_authority','final_format_reason','format_policy_version','format_resolved_at','resolver_evidence');
-- EXPECT 9

-- (b) resolver present + grant-disciplined
SELECT p.prosecdef, array_to_string(p.proacl,' | ') AS acl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='m' AND p.proname='resolve_final_format';
-- EXPECT prosecdef=true, acl = postgres=X/postgres | service_role=X/postgres  (no anon/authenticated)

-- (c) role probe: anon/authenticated DENIED 42501, service_role OK (DO block, as in the Slice A P1)
-- (d) smoke: SELECT m.resolve_final_format(<pp client>,'linkedin',NULL,'legacy','carousel')
--     EXPECT effective_format='text', authority='resolver_fallback', reason='legacy_advisor_ineligible:carousel'
```
Any miss → STOP; roll back artifact 1 (see below); do NOT proceed to STEP 2.

## STEP 2 — ORDERING GATE (mandatory operator-read DECISION query) · before deploy
**The shadow columns are written unconditionally by the worker.** Deploying artifact 2 before artifact 1
is live breaks every draft write. Because the worker deploy is an **external CLI step outside any
transaction**, a SQL statement cannot auto-abort it — so this is a **PK-gate decision query the operator
MUST read and confirm `true` before running the deploy** (it is not, and cannot be, a self-enforcing
transactional STOP):

```sql
-- ORDERING DECISION QUERY — the operator MUST read this and see BOTH true before deploying.
SELECT
  (SELECT count(*) = 9 FROM information_schema.columns
     WHERE table_schema='m' AND table_name='post_draft'
       AND column_name IN ('advisor_format','requested_format','format_mode','shadow_resolved_format',
           'final_format_authority','final_format_reason','format_policy_version','format_resolved_at','resolver_evidence'))
    AS columns_present,
  (to_regprocedure('m.resolve_final_format(uuid, text, text, text, text)') IS NOT NULL)
    AS resolver_present;
```
**If either column is not `true` ⇒ DO NOT deploy the worker.** Optional hardening: have
`scripts/safe-deploy.sh ai-worker` refuse to deploy unless this query returns both true, converting the
operator-read gate into an automated coupling.

## STEP 3 — DEPLOY ARTIFACT 2 (ai-worker v2.21.0) · PK-run, only after STEP 2 passes
- Deploy with **`--no-verify-jwt`** (x-ai-worker-key caller; CLI default flips it → 401→502). Prefer
  `scripts/safe-deploy.sh ai-worker --allow-warn`.
- Bundle from the worktree `C:\Users\parve\ce-wt-r3a-shadow` (Supabase bundles from CWD) — or merge to
  main first. Grep the deployed bundle for `ai-worker-v2.21.0`.
- After deploy: refresh `drift-check?write=true&slug=ai-worker`; run `deploy-verifier`
  (VERSION==repo v2.21.0 · marker-in-bundle · verify_jwt=false).
- Shadow verify: after the next fill cycle, confirm `m.post_draft` rows carry non-null
  `shadow_resolved_format`/`final_format_authority`, and `recommended_format` is unchanged in behaviour.

## ROLLBACK (additive-only, zero data)
- Artifact 2: redeploy ai-worker v2.20.0.
- Artifact 1 (idempotent, v2):
```sql
DROP FUNCTION IF EXISTS m.resolve_final_format(uuid, text, text, text, text);
ALTER TABLE m.post_draft
  DROP COLUMN IF EXISTS advisor_format, DROP COLUMN IF EXISTS requested_format,
  DROP COLUMN IF EXISTS format_mode, DROP COLUMN IF EXISTS shadow_resolved_format,
  DROP COLUMN IF EXISTS final_format_authority, DROP COLUMN IF EXISTS final_format_reason,
  DROP COLUMN IF EXISTS format_policy_version, DROP COLUMN IF EXISTS format_resolved_at,
  DROP COLUMN IF EXISTS resolver_evidence;
```
The Part-1 pre-assertion proved apply created all nine columns **and** the function (none pre-existed),
so rollback drops only migration-owned objects and never operator data/definitions. IF EXISTS makes
rollback re-runnable.
