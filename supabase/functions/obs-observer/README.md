# obs-observer — OBS Stage 0A evidence-recording observer

Records **raw 0A observations** of ICE asset-production-policy / provider-routing lineage into
the **isolated OBS project**. 0A only — raw observed facts + a derived lifecycle eligibility.
No 0A->0B difference logic, no inference verdicts, no provider/API calls, no publisher/render
side effects.

## Live OBS write model (CCD-reconciled)

ONE row per `(post_draft_id, observer_version)` into `obs.observation`:

| Column | Value |
|---|---|
| `post_draft_id` | the draft |
| `observer_version` | `obs-observer-0A-v0.2.0` |
| `stage` | `0A` |
| `population` | `slot_origin` |
| `eligibility` | derived: `terminal` \| `in_flight` \| `indeterminate` |
| `policy_input_snapshot` | jsonb object of the raw policy inputs |
| `value_cells` | jsonb array of cells: `{ name, value, evidence_class, stage:'0A' }` |

Per-cell `evidence_class` is one of `observed_fact` \| `reconstructed_fact` \|
`unknown_unavailable` (`unknown_unavailable` for null/unavailable values). Idempotency key
`(post_draft_id, observer_version, stage)` -> `ON CONFLICT DO NOTHING`.
**Not** top-level columns (never inserted): `evidence_class`, `source`, `run_id`.

## Hard invariants

- **Runtime = the isolated OBS project ONLY** (`--project-ref cvprkjpmlfhlwflokzvv`). Never deployed to production.
- **Reads production ONLY** through the least-privilege `obs_readonly` role (column-level SELECT on the 45 approved columns; read-only; 5s timeouts), via `OBS_PROD_READONLY_DSN`. No production writes.
- **Writes ONLY** to `obs.observation` via `OBS_WRITE_DSN`, append-only.
- **Disabled by default.** `OBS_OBSERVER_ENABLED` must be `true` and a valid `OBS_WORKER_KEY` header supplied. No scheduler is created by this package.
- Dedicated DB clients only — no shared publisher/ai-worker DB client imports.
- Secrets referenced by env-var **name** only; no DSN/key/password value in this repo.

## Files

| File | Role |
|---|---|
| `index.ts` | Entry: kill-switch + gated invoke + read -> build -> write; ONE record per draft. |
| `read_client.ts` | Dedicated production read (obs_readonly DSN; read-only; column-scoped; bounded). |
| `raw_observation_0a.ts` | The 0A-only builder (`buildRaw0AObservation`): prod row -> one raw 0A record. |
| `write_client.ts` | Dedicated OBS append-only write into `obs.observation` (live column set). |
| `contract.ts` | 0A types + single-source label/enum constants. |
| `deno.json` | Import map (postgres client). |

_(The name `stage0_transform` remains reserved by F-precondition 3 for the future 0A→0B difference transform; no such file exists in the 0A package.)_

## Environment (set as OBS-project secrets only — never in production)

| Var | Meaning |
|---|---|
| `OBS_OBSERVER_ENABLED` | `false` by default; `true` enables a run. |
| `OBS_WORKER_KEY` | Shared secret required in the `x-worker-key` header for a gated invoke. |
| `OBS_PROD_READONLY_DSN` | obs_readonly production read DSN. |
| `OBS_WRITE_DSN` | OBS-project write DSN. |
| `MAX_ROWS_PER_RUN` | Bounded rows per run (default 200; 50 for smoke). |

## RECONCILE-BEFORE-SMOKE (CCD, OBS-side)

The row/column/enum shape is now CCD-reconciled against live OBS. The **only** remaining
unverified piece is the **eligibility status vocabularies** in `contract.ts`
(`terminalStatuses` / `inFlightStatuses`). A wrong set does **not** fail-safe-reject (the value
is still a valid enum) — it **silently mis-buckets**. CCD must confirm these against the live
status vocabularies before smoke; unknown statuses default to `indeterminate`.

## CI gates

`bash scripts/obs/ci/run_obs_gates.sh` — 8 gates + Gate #9 (import / forbidden-term /
migration-target / RPC-cron / egress / secret / no-0B / deno check [`--config`] / egress+secret
boundary). Manual smoke: see `docs/build-specs/asset-policy-stage0/0A-observer-smoke.md`.
