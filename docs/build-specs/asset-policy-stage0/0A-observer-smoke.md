# OBS Stage 0A — Manual Smoke Runbook (CCD only, terminal only)

This is a **CCD-only, terminal-only** runbook. Not executed by CCH and not by CI.
It performs the gated manual smoke of `obs-observer` against the **isolated OBS project only**.
No scheduler is started. Production is never mutated.

> **OBS project ref:** `cvprkjpmlfhlwflokzvv` (provided by PK for this runbook).
> Identifier, not a credential. (Recorded in-repo here + in the package README/comment.)

## Live OBS write model (target of this smoke)

ONE `0A` row per `(post_draft_id, observer_version)`:
`stage='0A'`, `population='slot_origin'`, `eligibility in {terminal,in_flight,indeterminate}`,
`policy_input_snapshot` (jsonb object), `value_cells` (jsonb array of
`{name,value,evidence_class,stage:'0A'}`). Top-level `evidence_class`/`source`/`run_id` are
NOT columns and are not inserted.

## Preconditions

0. **Reviews open:** `51752332`, `5fed9a06`, `c5a7cb3c` — do not close as part of smoke.
1. **Role posture re-verified** (read-only): `obs_readonly` `rolcanlogin=t`, `rolsuper=f`,
   `rolbypassrls=f`, `rolinherit=f`; session settings present; exactly 45 column SELECTs; no writes.
2. **RECONCILE-BEFORE-SMOKE:** confirm `contract.ts` `terminalStatuses` / `inFlightStatuses`
   against the live status vocabularies (m.slot.status, m.post_render_log.status,
   m.post_draft.image_status / video_status). Wrong sets silently mis-bucket `eligibility`
   (they do NOT fail-safe-reject), so this confirmation matters. `contract.ts` is the single
   edit point.
3. **`deno check` (with config):** `deno check --config supabase/functions/obs-observer/deno.json supabase/functions/obs-observer/index.ts` must pass. (CCH could not run deno locally; this is a required CCD pre-deploy gate.)
4. **Credential step** (PK/CCD, terminal — never via CCH):
   - `ALTER ROLE obs_readonly PASSWORD '<generated locally>'` on production (its own gate).
   - Build the DSN privately; never print/paste/commit it.
5. **Secrets set on the OBS project ONLY** (never production env/Vault):
   ```
   supabase secrets set OBS_PROD_READONLY_DSN='...' --project-ref cvprkjpmlfhlwflokzvv
   supabase secrets set OBS_WRITE_DSN='...'         --project-ref cvprkjpmlfhlwflokzvv
   supabase secrets set OBS_WORKER_KEY='...'        --project-ref cvprkjpmlfhlwflokzvv
   supabase secrets set MAX_ROWS_PER_RUN='50'       --project-ref cvprkjpmlfhlwflokzvv
   supabase secrets set OBS_OBSERVER_ENABLED='false' --project-ref cvprkjpmlfhlwflokzvv
   ```
   Verify presence WITHOUT printing values: `supabase secrets list --project-ref cvprkjpmlfhlwflokzvv`.

## Connection-mode validation

Before the full run, confirm `obs_readonly` connects over the chosen DSN host/port
(Supabase pooler vs direct). A one-row `SELECT 1` over the DSN is sufficient. If the pooler
rejects the custom role, switch the DSN to the direct connection host.

## Deploy (OBS only, terminal CLI only — never the MCP wrapper)

```
supabase functions deploy obs-observer --project-ref cvprkjpmlfhlwflokzvv
```

## Smoke run (single, gated, bounded; scheduler stays disabled)

1. Enable: `supabase secrets set OBS_OBSERVER_ENABLED='true' --project-ref cvprkjpmlfhlwflokzvv`.
2. Single manual invoke with the worker key header, `MAX_ROWS_PER_RUN=50`. Expect
   `{"ok":true, ... "inserted": N, "skipped_existing": 0}`.
3. **Disable immediately after:** `supabase secrets set OBS_OBSERVER_ENABLED='false' --project-ref cvprkjpmlfhlwflokzvv`.

## Verification checklist

- **OBS rows appear:** `SELECT count(*) FROM obs.observation;` on OBS — one row per observed draft.
- **Row shape:** `stage='0A'`, `population='slot_origin'`, `eligibility` in the 3-value set,
  `policy_input_snapshot` is a populated jsonb object, `value_cells` is a jsonb array whose
  cells each carry `name`, `value`, `evidence_class` (in the 3-value set), `stage='0A'`.
- **Idempotency on retry:** re-invoke -> `inserted: 0`, `skipped_existing` = candidate count;
  OBS row count unchanged; no duplicates on `(post_draft_id, observer_version, stage)`.
- **Production unchanged:** no `obs` schema on production; production row counts on the 4 lineage
  tables unchanged; no new production objects. (Read-only check.)
- **Secrets not leaked:** no DSN/password/key in function logs or repo; `supabase secrets list` name-only.
- **No 0B:** rows carry only raw cells + derived eligibility; no difference/inference fields.

## Schedule (ONLY after smoke passes — separate gate)

Do not start a scheduler here. After smoke acceptance, a separate gate proposes OBS-project
`pg_cron` at low cadence, disabled by default, with `OBS_OBSERVER_ENABLED` as the instant
kill-switch and unschedule + grant-revoke as rollback.

## Disable / rollback

`OBS_OBSERVER_ENABLED='false'` (instant, no redeploy) -> unschedule any cron ->
(nuclear) revoke `obs_readonly` grants / drop the role on production.
