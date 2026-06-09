# OBS Stage 0A — Manual Smoke Runbook (CCD only, terminal only)

This is a **CCD-only, terminal-only** runbook. It is not executed by CCH and not by CI.
It performs the gated manual smoke of `obs-observer` against the **isolated OBS project only**.
No scheduler is started. Production is never mutated.

> **OBS project ref:** `cvprkjpmlfhlwflokzvv` (provided by PK for this runbook).
> Note: this records the OBS ref in-repo for the first time — earlier the ref was kept out of
> the repo. It is an identifier, not a credential. Confirm this is intended.

## Preconditions

0. **Reviews open:** `51752332`, `5fed9a06`, `c5a7cb3c` — do not close as part of smoke.
1. **Role posture re-verified** (read-only): `obs_readonly` `rolcanlogin=t`, `rolsuper=f`,
   `rolbypassrls=f`, `rolinherit=f`; session settings present; exactly 45 column SELECTs; no writes.
2. **RECONCILE-BEFORE-SMOKE done:** confirm `OBS_CONTRACT` labels + `obs.observation` columns
   against the live OBS project; correct `contract.ts` if needed.
3. **Credential step done** (PK/CCD, terminal — never via CCH):
   - `ALTER ROLE obs_readonly PASSWORD '<generated locally>'` on production (its own gate).
   - Build the DSN privately; never print/paste/commit it.
4. **Secrets set on the OBS project ONLY** (never production env/Vault):
   ```
   supabase secrets set OBS_PROD_READONLY_DSN='...' --project-ref cvprkjpmlfhlwflokzvv
   supabase secrets set OBS_WRITE_DSN='...'         --project-ref cvprkjpmlfhlwflokzvv
   supabase secrets set OBS_WORKER_KEY='...'        --project-ref cvprkjpmlfhlwflokzvv
   supabase secrets set MAX_ROWS_PER_RUN='50'       --project-ref cvprkjpmlfhlwflokzvv
   supabase secrets set OBS_OBSERVER_ENABLED='false' --project-ref cvprkjpmlfhlwflokzvv
   ```
   Verify presence WITHOUT printing values: `supabase secrets list --project-ref cvprkjpmlfhlwflokzvv`.

## Connection-mode validation (correction C)

Before the full run, confirm `obs_readonly` connects over the chosen DSN host/port
(Supabase pooler vs direct). A one-row `SELECT 1` over the DSN is sufficient. If the pooler
rejects the custom role, switch the DSN to the direct connection host.

## Deploy (OBS only, terminal CLI only — never the MCP wrapper)

```
supabase functions deploy obs-observer --project-ref cvprkjpmlfhlwflokzvv
```

## Smoke run (single, gated, bounded; scheduler stays disabled)

1. Enable for the smoke window: `supabase secrets set OBS_OBSERVER_ENABLED='true' --project-ref cvprkjpmlfhlwflokzvv`.
2. Single manual invoke with the worker key header, `MAX_ROWS_PER_RUN=50`. Expect
   `{"ok":true, ... "inserted": N, "skipped_existing": 0}`.
3. **Disable immediately after:** `supabase secrets set OBS_OBSERVER_ENABLED='false' --project-ref cvprkjpmlfhlwflokzvv`.

## Verification checklist

- **OBS rows appear:** `SELECT count(*), min(observed_at), max(observed_at) FROM obs.observation;` on OBS.
- **Provenance populated:** `evidence_class`, `stage`, `population`, `eligibility`, `source`, `observed_at`, `run_id` all non-null; per-cell `evidence_class`+`stage` present.
- **Idempotency on retry:** re-invoke (same enable window) -> `inserted: 0`, `skipped_existing` = candidate count; OBS row count unchanged; no duplicates on `(post_draft_id, observer_version, stage)`.
- **Production unchanged:** no `obs` schema on production; production row counts on the 4 lineage tables unchanged; no new production objects. (Read-only check; CCH can run this leg.)
- **Secrets not leaked:** no DSN/password/key in function logs or repo; `supabase secrets list` name-only.
- **No 0B:** `obs.observation` contains only raw cells; no difference/inference fields written.

## Schedule (ONLY after smoke passes — separate gate)

Do not start a scheduler in this runbook. After smoke acceptance, a separate gate proposes
OBS-project `pg_cron` at low cadence, disabled by default, with `OBS_OBSERVER_ENABLED` as the
instant kill-switch and unschedule + grant-revoke as rollback.

## Disable / rollback

`OBS_OBSERVER_ENABLED='false'` (instant, no redeploy) -> unschedule any cron ->
(nuclear) revoke `obs_readonly` grants / drop the role on production.
