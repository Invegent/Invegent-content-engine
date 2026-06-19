# Brief — F-INSIGHTS-WORKER-COLLECTION-RUNTIME

**Created:** 2026-06-19 Sydney
**Author:** chat (orchestrator)
**Executor:** ef-builder (local-only) → PK (deploy gate)
**Status:** approved-direction (PK directive 2026-06-19: lower MAX_POSTS_PER_CLIENT to ~25-30) → implementing
**Result file:** `docs/briefs/results/f-insights-worker-collection-runtime.md` (on completion)
**Class:** `code_change` — single-constant tuning in `insights-worker`. No DB / no migration / no cron / no grant change.

## Task

Bring the per-client collection phase of `insights-worker` fully under the runtime budget so the EF
stops returning 504/546 on the two large clients. **Lower `MAX_POSTS_PER_CLIENT` 50 → 25** (one constant).

## Root-cause recap (this session's F-INSIGHTS-WORKER-WINDOW30-90-FRESHNESS verification)

v14.4.0 scoped collection to ONE client per cron (per-client selector), which fixed the freshness
freeze. But verification showed **~3 s/post** (Invegent 36 posts ≈ 110 s incl. ~4 s aggregation-first +
overhead). A client capped at 50 posts (NDIS-Yarns 253 eligible, Property-Pulse 240) therefore runs
~150 s — still exceeding the ~150 s EF wall-clock and the cron's 120 s `net.http_post` timeout. Freshness
is NOT at risk (aggregation-first commits 30/90 in ~3.8 s before collection), but the large-client
*collection* phase is still killed.

## Why 25 (sizing)

- 25 posts × ~3 s ≈ **75 s** collection + ~6 s (aggregation-first + profile load + crosspost RPC) ≈ **81 s**
  — **45 s margin under the 120 s cron timeout**, robust to Graph latency spikes / the always-failing #10
  fields call.
- 30 would be ~90 s (30 s margin) — acceptable but tighter; chosen 25 for the larger margin (the lane's
  purpose is robust timeout elimination). 30 is the fallback if faster coverage cadence is later wanted.
- **Coverage stays healthy:** with per-client daily crons + the existing never-collected-first /
  stalest-`collected_at`-first ordering, NDIS-Yarns (253) fully cycles in ⌈253/25⌉ ≈ 10 days,
  Property-Pulse (240) ≈ 10 days — every post refreshed well inside the 30-day window, so the worker's
  30/90 `post_format_performance` aggregation stays fully populated. Smaller clients (Invegent 36, CFW 21)
  still complete per run (≤25 covers most; the tail cycles within ~2 days).

## Change (surgical)

`supabase/functions/insights-worker/index.ts`:
- `const MAX_POSTS_PER_CLIENT = 50;` → `= 25;` (line 67). Add a one-line comment citing the ~3 s/post
  budget and this lane.
- Bump `VERSION` `insights-worker-v14.4.0` → `v14.4.1`; prepend a one-line history entry.
- Nothing else changes — `computeFormatPerformance` (aggregation-first), the per-client body selector
  + D-A2 fallback, `processClient`, `fetchPostInsights`, metric set, token handling, response shape:
  **byte-identical**.

## Scope

**In scope:** the one-constant change + version bump; `deno check`; deploy `insights-worker` v14.4.1
via `--no-verify-jwt` (PK gate); post-deploy verification.
**Out of scope (per directive):** any DB/migration/cron change; per-post Graph-fetch parallelization
(bigger, touches engagement-sensitive code); raising the cap; the upsert no-prune-stale-combos hazard;
any other EF.

## Validation

- `deno check supabase/functions/insights-worker/index.ts` exit 0.
- branch-warden `safe` (change set == the one file).
- External review on the final diff (required before deploy).
- **Post-deploy (PK gate):** a client-scoped run for a large client (NDIS-Yarns or Property-Pulse)
  returns **200 within budget** (≤ ~90 s, no 504/546), `total_processed ≤ 25`; windows 30/90 still
  fresh (aggregation-first); `verify_jwt=false` preserved.

## Rollback

Single-step: redeploy v14.4.0 (restore `= 50`) via `--no-verify-jwt`. No DB/data to revert.

## Stop condition

ef-builder reports diff + deploy plan → branch-warden → external review → **HARD STOP at the PK deploy
gate** (no deploy without PK approval). Deploy is PK-run/authorized.
