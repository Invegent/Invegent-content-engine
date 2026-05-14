# cc-0014 — Friction Register Capture Experiment

**Status:** Stage A applied in production. Brief content pending manual commit by PK from local git.

**Brief ID:** cc-0014
**Version:** v1.1
**Schema:** `friction.*` in Supabase `mbkmaxqhsohbtwsqolns` (deployed 2026-05-14)
**Strategic anchor:** `docs/strategy/IOL_friction_register_v0.4.md`

This file is a placeholder. The full 1450-line brief content failed to commit cleanly via the MCP `create_or_update_file` tool (payload size or escaping issue). PK is committing the full content manually from a local git clone in a follow-up commit.

## What is applied in production

Stage A migration `cc_0014_a_friction_schema` is applied. The `friction.*` schema contains:

- `friction.category` — 6 seeded categories plus `unclassified` placeholder (`counts_for_success=false`)
- `friction.event` — immutable append-only events table
- `friction.case` — triage layer with 4 CHECK constraints
- `friction.emit_error` — emitter error sink
- `friction.experiment_run` — experiment boundary with `criteria_snapshot` jsonb

Two triggers from the v1.1 patch:
- `fn_prevent_delete_during_run` — blocks DELETE on `friction.event` and `friction.case` while any `experiment_run.status='running'`
- `fn_lock_criteria_snapshot` — blocks UPDATE on `criteria_snapshot` while status=running

All 11 V-checks (V-A1 through V-A11) passed. Zero residual test rows. No `experiment_run` row with `status='running'` exists yet — the 14-day window has NOT started.

## What is pending

- Stage B: reconciliation emitter (SQL trigger on `r.cadence_drift_log`)
- Stage C: health check dual-write emitter (Cowork brief modification + pg_cron verification) — **hard-stop if this stage fails**
- Stage D: manual capture form in invegent-dashboard
- Stage E: read surface + experiment_run creation (this is when the 14-day window starts)

## Next action

PK pushes the full brief content from local git. This placeholder will be overwritten.
