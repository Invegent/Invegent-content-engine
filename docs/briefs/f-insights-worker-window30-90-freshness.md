# Brief — F-INSIGHTS-WORKER-WINDOW30-90-FRESHNESS (Recovery, broadened)

**Created:** 2026-06-19 Sydney
**Author:** chat (orchestrator)
**Executor:** ef-builder (local-only) → PK (deploy gate)
**Status:** AT DEPLOY GATE 2026-06-19 — v14.4.0 built (deno check exit 0), branch-warden SAFE, **external review on final diff CLEAN** (`53724307`, agree/proceed). Awaiting PK deploy authorization. Worktree `insights-worker-window-freshness`, branch `f-insights-worker-window3090-freshness` (uncommitted). — Earlier: APPROVED at Gate-0 by PK. Decisions: **D-A2** (aggregation-only fallback on missing/invalid body; manual all-clients = explicit `{"all_clients":true}`), **D-B** keep global aggregation every run (default). External design review `6754590e` (partial/escalated → resolved by PK). (Supersedes the narrow v14.3.0-only draft; that aggregation-first change is folded in below as part #1.)
**Result file:** `docs/briefs/results/f-insights-worker-window30-90-freshness.md` (on completion)
**Class:** `code_change` — single Edge Function (`insights-worker`) redeploy. **No DB / no migration / no cron edit / no grant change.**

---

## Objective

Complete recovery of the insights-worker so that (a) `m.post_format_performance` windows 30/90 are
fresh again, AND (b) the EF stops being killed by the ~150 s wall-clock limit (HTTP 504/546) on every
run, AND (c) per-client collection coverage advances (drain the NDIS-Yarns/CFW 7-11-day stale backlog
and the 10 never-collected posts).

## Proven root cause (read-only investigation 2026-06-19)

1. **Tail-starvation:** the handler runs `processClient` **sequentially for ALL 4 FB clients** on every
   invocation; that sequential Graph I/O (≈4 clients × ≤50 posts × ~4 calls) consumes the entire ~150 s
   budget. `computeFormatPerformance` (sole writer of windows 30/90 since Fix-2 narrowed the cron to
   `{7,0}`) is the **last statement** → never commits → windows 30/90 frozen since 2026-06-12.
   (HTTP 504/546 at `execution_time_ms` ≈ 150,5xx; not a 500 app error. Collection upserts
   `post_performance` incrementally so collection *looks* fresh, masking the freeze.)
2. **The crons already pass a per-client selector that the EF ignores.** cron jobid 87/88/89/90 each
   POST `/functions/v1/insights-worker` with body `{"client_publish_profile_id":"<uuid>"}` (NDIS-Yarns
   / Care-For-Welfare / Property-Pulse / Invegent), staggered 03:00/05/10/15, `timeout 120000`. The EF
   **never reads the request body** — it loads all active profiles and sweeps every client each run.
   So every cron does a full 4-client sweep (4× redundant) and each blows the budget.
3. Sizing (2026-06-19): eligible/collected/never-collected/stalest-age — **NDIS-Yarns 253 / 245 / 8 /
   ~265 h**; CFW 21 / 19 / 2 / ~169 h; Property-Pulse 240 / 240 / 0 / ~145 h; Invegent 36 / 36 / 0 /
   fresh. NDIS-Yarns + CFW froze on 06-12 (sweep died before reaching them); PP/Invegent kept partial
   progress. `MAX_POSTS_PER_CLIENT=50`.

## Design (smallest safe — code-only, single file, backward-compatible)

**#1 — Aggregation-first (keep the v14.3.0 reorder).** Run `computeFormatPerformance(allActiveClientIds)`
**before** the collection loop. It reads only already-persisted `post_performance` rows and is cheap
(~2 queries + ≤50 idempotent RPC upserts, a few seconds), so it always commits within budget regardless
of collection cost. Defence in depth: even if collection ever overruns again, windows 30/90 stay fresh.
Aggregation stays **global** (all active clients) on every run — running it 4×/day is idempotent and
harmless (refresh cron owns {7,0}; worker owns {30,90}; no dual-writer conflict).

**#2 — Honor the existing cron selector (the timeout fix).** Parse the POST body; if it carries
`client_publish_profile_id`, **scope the collection loop to that single profile**; if the body is
absent/empty/invalid (manual/GET/debug calls), **fall back to all active profiles** (today's behaviour —
backward-compatible). Effect: each production cron run collects **1 client** (≤50 posts × ~4 calls
≈ 35-45 s) → comfortably under 150 s → returns **200, not 504/546**. Also gives true per-client
isolation: one client's slowness no longer starves the others or the aggregation (the exact current bug).

**#3 — Coverage.** With per-client scoping + the existing never-collected-first / stalest-collected_at
ordering, each client's dedicated daily run drains its backlog at ≤50/run. NDIS-Yarns (253) fully cycles
in ~5 days, the 8 never-collected drain first; PP (240) similarly; CFW/Invegent are near-complete already.
`MAX_POSTS_PER_CLIENT` stays **50** (no coverage regression). If PK later wants faster full-cycle cadence,
raising the cap is now safe (per-run is 1 client) — deferred, not in this lane.

**Unchanged (byte-identical):** `computeFormatPerformance`, `fetchPostInsights`, `fetchSingleMetric`,
`processClient` body, `METRICS_TO_TRY`, engagement-basis / NULL semantics, token handling, `raw_payload`,
the response JSON shape. The only new logic is body-parsing + a profile filter at the handler level.

## Options evaluated (per PK ask #3)

| Option | Fixes timeout? | Cost / risk | Verdict |
|---|---|---|---|
| **Honor existing cron selector (chosen, #2)** | Yes — 4×→1× work/run (~40 s) | Code-only, single file, **no DB/cron change**, engagement-fetch code untouched | **SMALLEST SAFE — recommended** |
| Bounded/parallel Graph fetches (Promise.all per post, or N-post pool) | Yes — but only needed if a *single* client's run overran (it won't at ~40 s) | Touches the engagement-sensitive fetch path; adds Graph rate-limit surface | **Rejected for this lane** — unnecessary given #2; note as a future lever only if one client's inventory can't be covered at acceptable cadence |
| Split collection into a separate cron / request-mode | Yes | The split **already exists at the cron layer** (per-client jobs + selector). Adding/altering crons is a **gated DB mutation** (`cron.alter_job`; postgres has no direct `cron.job` write, non-superuser) → structural escalation | **Unnecessary** — #2 realises the split's benefit with zero cron edits |
| Reduce `MAX_POSTS_PER_CLIENT` only | Partially | One-constant change but degrades coverage cadence and doesn't give per-client isolation | **Rejected** — #2 is strictly better |

## Scope

**In scope:** one-file edit to `supabase/functions/insights-worker/index.ts` (#1 aggregation-first +
#2 honor `client_publish_profile_id` body selector with all-profiles fallback); `deno check`; version
bump to **v14.4.0**; deploy `insights-worker --no-verify-jwt` (PK gate); post-deploy verification.
**Out of scope:** any cron edit (`cron.alter_job`/schedule); any DB/migration/grant change; raising
`MAX_POSTS_PER_CLIENT`; Graph-fetch parallelization; the `upsert_format_performance` no-prune-stale-combos
hazard; ai-worker/Advisor logic; `refresh_post_format_performance`; any other EF; the Meta #10 fields
permission (auto-heals separately).

## Implementation preconditions (for ef-builder + a quick db-rls confirm)

- Confirm the **exact primary-key column name** of `c.client_publish_profile` that equals the cron body's
  `client_publish_profile_id` (the EF currently selects `client_id, destination_id, credential_env_key,
  page_access_token` — add that PK column to the SELECT and filter on it). Do NOT assume the name.
- Body parse must be defensive: wrap `await req.json()` in try/catch; missing/!json → all-profiles fallback.

## Success criteria

- Diff = #1 reorder + #2 body-scoping only; the five functions/metric-set/response-shape byte-identical.
- `deno check` exit 0. External review (`plan_review` now on the design; `ef_deploy` later on the final diff) handled per contract.
- **Post-deploy (PK gate):** each per-client cron run returns **200** (execution < ~60 s, no 504/546);
  `m.post_format_performance` windows 30 & 90 carry fresh worker `computed_at`; over the following days
  NDIS-Yarns/CFW stalest `collected_at` advances and never_collected → 0; windows 0/7 unaffected;
  manual all-client (no-body) invocation still works; `verify_jwt=false` preserved.

## Rollback

Single-step: redeploy the prior EF (`insights-worker` v14.2.0) with `--no-verify-jwt`. No DB/data change
to revert. The aggregation-first + selector changes are pure EF logic.

## Open design decisions for PK (surfaced by external design review `6754590e`)

- **D-A — Missing/invalid body fallback (the review's flagged point).**
  - **D-A2 (recommended, safer):** missing/unparseable body → run the global aggregation only, collect
    **no** client that run, return an explicit `no_client_scope` marker. A malformed cron body can then
    never silently re-trigger the full-sweep timeout. Manual "run all clients" becomes an explicit opt-in
    (e.g. body `{"all_clients": true}`).
  - **D-A1 (backward-compatible):** missing body → all profiles (today's behaviour). Simpler, but a
    broken cron body falls back to the timing-out full sweep (aggregation-first still keeps 30/90 fresh).
- **D-B — Global aggregation cadence.** Keep it on **every** per-client run (4×/day; idempotent, ~5 s,
  maximally fresh — **recommended**) vs gate it to once/day on a designated cron (saves redundant work,
  adds a branch). Low stakes either way.

## Stop condition

**GATE-0: return this brief to PK for approval BEFORE any implementation.** On PK approval: ef-builder
implements in the isolated worktree → branch-warden → external review on the **final diff** → PK
**deploy hard stop**. Deploy is PK-run.

---

## Notes

- Why a wall-clock kill can't be caught: it's a hard kill, not an exception → `try/finally` can't
  guarantee the tail runs. #1 (run the cheap aggregation first) is the only structurally-reliable
  freshness guarantee; #2 removes the overrun itself.
- Standing gotcha: deploy MUST pass `--no-verify-jwt` (config.toml pins `verify_jwt=false`; a default
  deploy flips it true → 401/502 the cron callers).
- Minor future option (not this lane): gate the global aggregation to once/day instead of 4× to shave
  redundant work; harmless either way.
