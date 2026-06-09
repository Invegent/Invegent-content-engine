# obs-observer — OBS Stage 0A evidence-recording observer

Records **raw 0A observations** of ICE asset-production-policy / provider-routing lineage into
the **isolated OBS project**. This is 0A only — raw observation cells. No 0B comparison, no
inference, no counterfactual, no provider/API calls, no publisher/render side effects.

## Hard invariants

- **Runtime = the isolated OBS project ONLY** (`--project-ref cvprkjpmlfhlwflokzvv`). Never deployed to production.
- **Reads production ONLY** through the least-privilege `obs_readonly` role (column-level SELECT on the 45 approved columns; read-only; 5s timeouts), via the `OBS_PROD_READONLY_DSN` secret. No production writes.
- **Writes ONLY** to `obs.observation` in the OBS project, append-only (`ON CONFLICT (post_draft_id, observer_version, stage) DO NOTHING`), via `OBS_WRITE_DSN`.
- **Disabled by default.** `OBS_OBSERVER_ENABLED` must be explicitly `true` and a valid `OBS_WORKER_KEY` header supplied. No scheduler is created by this package.
- Dedicated DB clients only — no shared publisher/ai-worker DB client imports.
- Secrets are referenced by env-var **name** only; no DSN/key/password value lives in this repo.

## Files

| File | Role |
|---|---|
| `index.ts` | Entry: kill-switch + gated invoke + read -> transform -> write orchestration. |
| `read_client.ts` | Dedicated production read (obs_readonly DSN; read-only; column-scoped; bounded). |
| `stage0_transform.ts` | The single named transform: production rows -> raw 0A cells. |
| `write_client.ts` | Dedicated OBS append-only write into `obs.observation`. |
| `contract.ts` | 0A types + the single source-of-truth label constants. |
| `deno.json` | Import map (postgres client). |

## Environment (set as OBS-project secrets only — never in production)

| Var | Meaning |
|---|---|
| `OBS_OBSERVER_ENABLED` | `false` by default; `true` enables a run. |
| `OBS_WORKER_KEY` | Shared secret required in the `x-worker-key` header for a gated invoke. |
| `OBS_PROD_READONLY_DSN` | obs_readonly production read DSN. |
| `OBS_WRITE_DSN` | OBS-project write DSN. |
| `MAX_ROWS_PER_RUN` | Bounded rows per run (default 200; 50 for smoke). |

## RECONCILE-BEFORE-SMOKE (CCD, OBS-side)

`contract.ts` `OBS_CONTRACT` label strings and the `obs.observation` column list in
`write_client.ts` are authored from the OBS foundation design and are **not live-verified** —
the authoring agent cannot touch OBS. Before smoke, confirm them against the live OBS enums +
table. A wrong label/column makes the insert **fail safe** (rejected; no bad rows). Correct
`contract.ts` (the single edit point) and re-run.

## CI gates

`bash scripts/obs/ci/run_obs_gates.sh` — 8 gates + Gate #9 (import / forbidden-term /
migration-target / RPC-cron / egress / secret / no-0B / deno check / egress+secret boundary).
Wired in `.github/workflows/obs-observer-ci.yml`. Manual smoke: see
`docs/build-specs/asset-policy-stage0/0A-observer-smoke.md`.
