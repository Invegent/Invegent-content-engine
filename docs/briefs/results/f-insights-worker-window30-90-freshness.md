# Result — F-INSIGHTS-WORKER-WINDOW30-90-FRESHNESS (insights-worker v14.4.0 recovery)

**Brief file:** `docs/briefs/f-insights-worker-window30-90-freshness.md`
**Executed by:** Claude Code (orchestrator) — code by ef-builder; deploy PK-run
**Completed:** 2026-06-19 Sydney

---

## 1. Result status

`Complete` — primary objective (windows 30/90 freshness) met and verified live. One mitigated
collection-runtime residual carried as a follow-up (see §6/§7).

## 2. Commit(s)

- `e0fc5e4` — fix(insights-worker): v14.4.0 per-client cron scope + aggregation-first (merged + pushed to `main`, origin 0/0).

## 3. Files changed

- `supabase/functions/insights-worker/index.ts` — modified (v14.2.0 → v14.4.0; +72/−7, single file).
- `docs/briefs/f-insights-worker-window30-90-freshness.md` — created (brief).
- `docs/briefs/results/f-insights-worker-window30-90-freshness.md` — created (this result).
- Registers (`docs/00_sync_state.md`, `docs/00_action_list.md`) — reconciliation pending PK commit gate.

## 4. Actions taken

- **Root cause proven (read-only):** insights-worker killed by ~150 s wall-clock (504/546) every run;
  it swept ALL 4 FB clients sequentially while ignoring the per-client cron body selector, so the tail
  `computeFormatPerformance` (sole writer of windows 30/90 since Fix-2 narrowed the refresh cron to
  `{7,0}`) never committed → windows frozen since 2026-06-12/06-13. Confirmed via EF logs (150.5 s 504s),
  `post_format_performance` freshness, `post_performance` (collection fresh, masking it), and the worker
  read-query (367 rows/25 groups today — not a data problem).
- **Fix (v14.4.0, single file):** (#1) aggregation-first — `computeFormatPerformance(allClientIds)` runs
  BEFORE collection, global, always; (#2) honor the existing cron body `client_publish_profile_id`,
  scoping collection to one client/run; D-A2 safe default — missing/invalid body → aggregation-only,
  collect nothing (`no_client_scope`), never the full sweep; additive `scope_mode` response field.
  Collection/metric/engagement/token/raw_payload logic byte-identical.
- **Gates:** ef-builder (isolated worktree, deno check exit 0) → branch-warden `safe` → external design
  review `6754590e` (escalated → PK resolved, decisions D-A2 + keep-global-aggregation) → external
  final-diff review `53724307` (`agree`/proceed) → PK deploy authorization → merge+push (orchestrator)
  → PK-run deploy (`--no-verify-jwt`) → live verification.
- **Live verification (post-deploy):** deployed version 67 = v14.4.0, `verify_jwt=false`; header-less GET
  200; bodyless POST → `no_client_scope`, processed 0, `windows_computed=50`, 3.8 s; client-scoped POST
  (Invegent) → `client_scoped`, 36/36 collected, 200; DB confirms windows 30 & 90 now `computed_at`
  ≈ 2026-06-19 04:42 UTC (50 distinct per-row worker timestamps), windows 0/7 unaffected.

## 5. Constraints confirmed

- No DB / migration / cron / grant change — confirmed (code-only EF change).
- No cron edit (the per-client selector already existed at the cron layer) — confirmed.
- `MAX_POSTS_PER_CLIENT` unchanged (50); Graph-fetch parallelization NOT done — confirmed.
- `computeFormatPerformance` / `fetchPostInsights` / `fetchSingleMetric` / `processClient` /
  `METRICS_TO_TRY` / engagement-basis / NULL semantics / token handling / `raw_payload` byte-identical —
  confirmed (absent from diff hunks).
- `verify_jwt=false` preserved (deployed via `--no-verify-jwt`) — confirmed.

## 6. Open issues

- **Collection-runtime residual (mitigated, not eliminated):** observed ~3 s/post (Invegent 36 posts =
  ~110 s). The two large clients — **NDIS-Yarns (253 eligible)** and **Property-Pulse (240 eligible)** —
  cap at `MAX_POSTS_PER_CLIENT=50`, so their *collection* phase runs ~150 s and may still hit the
  504/546 wall-clock. **This does NOT re-break freshness:** aggregation-first commits all 50 window rows
  in ~3.8 s before any collection (proven), and per-post upserts make incremental progress even if the
  large-client run is later killed. Windows 30/90 stay fresh daily regardless.

## 7. Next recommended step

Open a small follow-up carry **F-INSIGHTS-WORKER-COLLECTION-RUNTIME** (P3/P4): bring the large-client
collection fully under budget — lower `MAX_POSTS_PER_CLIENT` to ~25-30 (the never-collected-first
ordering still drains the backlog over runs) and/or parallelize the per-post Graph fetches
(Promise.all of the 3 metrics + fields, or a small post-level concurrency pool). Separate code lane;
not freshness-blocking.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass with notes`

**Notes:**

- Output matched the brief: aggregation-first + cron-selector scoping + D-A2 fallback, single file,
  byte-identical hot path. ✓
- Constraints respected: no DB/cron/migration change; verify_jwt preserved. ✓
- No unexpected files changed (one EF file in the commit; brief/result/registers are docs). ✓
- Success criteria met: windows 30/90 fresh (live-confirmed), `scope_mode` behaves per design,
  windows_computed>0, 0/7 unaffected. ✓
- New risk: large-client collection runtime (§6) — mitigated by aggregation-first; follow-up named.
- Follow-up: F-INSIGHTS-WORKER-COLLECTION-RUNTIME (§7).

## 9. Learning notes (chat fills this)

- **The infra already supported the fix.** The four crons were purpose-built per-client (selector in the
  body) but the EF ignored it — the "split collection" the broadened scope asked for was a code-only
  honor-the-existing-selector change, NOT a gated cron mutation. Always inspect the actual cron command
  before assuming a split needs DB work.
- **Aggregation-first is the durable freshness guarantee.** A wall-clock kill is uncatchable; running the
  cheap tail FIRST is what makes freshness robust to any collection overrun.
- **Cron green ≠ EF success:** `net.http_post` is fire-and-forget; `cron.job_run_details` "succeeded/1 row"
  records the enqueue, not the EF's 504. Don't trust cron status as EF health.
