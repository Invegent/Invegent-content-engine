# Result — F-INSIGHTS-WORKER-COLLECTION-RUNTIME (insights-worker v14.4.1 cap tuning)

**Brief file:** `docs/briefs/f-insights-worker-collection-runtime.md`
**Executed by:** Claude Code (orchestrator) — deploy PK-run
**Completed:** 2026-06-19 Sydney

---

## 1. Result status

`Complete` — cap lowered to 25, deployed, and empirically verified to bring the large-client collection phase well under budget.

## 2. Commit(s)

- `4077b02` — fix(insights-worker): v14.4.1 lower MAX_POSTS_PER_CLIENT 50→25 (ff-merged + pushed to `main`, origin 0/0).
- Docs (this result + register reconciliation) — commit pending PK gate.

## 3. Files changed

- `supabase/functions/insights-worker/index.ts` — modified (v14.4.0→v14.4.1; 1 file, 2 hunks: the constant + version/comment).
- `docs/briefs/f-insights-worker-collection-runtime.md` — created (brief).
- `docs/briefs/results/f-insights-worker-collection-runtime.md` — created (this result).
- Registers (`docs/00_sync_state.md`, `docs/00_action_list.md`) — reconciliation pending PK commit gate.

## 4. Actions taken

- **Scope:** per the PK directive (lower MAX_POSTS_PER_CLIENT to ~25-30) and this session's v14.4.0
  verification (~3 s/post; a 50-post client ≈ 150 s overran the EF wall-clock + 120 s cron timeout),
  chose **25** (≈75 s collection, ~45 s margin) — the smallest safe fix; parallelization rejected as
  bigger/less safe.
- **Implement:** one-constant change in a fresh isolated worktree off `aba712e` (after relocating an
  ef-builder edit that had landed on a stale branch). `deno check` exit 0; pure tuning — aggregation-first,
  the per-client selector + D-A2 fallback, and all collection/metric logic byte-identical.
- **Gates:** branch-warden `safe` (1-file change set, ff provable) → external review `8ee7b35c`
  (partial/escalated — generic-caution, no defect; freshness structurally protected; routed to PK)
  → **PK approved cap=25**.
- **Merge + deploy:** ff-merge to `main` (`4077b02`), pushed (origin 0/0); **PK deployed** v14.4.1
  (function version 68) with `--no-verify-jwt`.
- **Post-deploy verification:** `get_edge_function` → v14.4.1 / `verify_jwt=false` / `MAX_POSTS_PER_CLIENT=25`
  in source; header-less GET → 200 v14.4.1; **live large-client run (NDIS-Yarns, 253 eligible)** →
  HTTP 200 in **53.2 s**, `scope_mode=client_scoped`, **`total_processed=25`** (cap honored), 25/25
  succeeded / 0 failed, **`first_time=8`** (the 8 never-collected posts drained first — ordering intact),
  **`windows_computed=50`** (aggregation-first preserved, windows 30/90 fresh).

## 5. Constraints confirmed

- v14.4.0 aggregation-first behavior preserved — confirmed (windows_computed=50 on the verification run).
- Per-client cron selector preserved — confirmed (scope_mode=client_scoped, processed exactly its client).
- No DB / migration / cron change — confirmed (code-only constant).
- No parallelization in this lane — confirmed (fetchPostInsights byte-identical).
- `verify_jwt=false` preserved (deployed `--no-verify-jwt`) — confirmed.

## 6. Open issues

- None blocking. The empirical ~2.1 s/post (53 s for 25 posts) gives even more margin than the ~3 s/post
  estimate. Large clients (NDIS 253, Property-Pulse 240) now cycle their full inventory in ~10 days via
  the per-client daily crons — inside the 30-day window, so the 30/90 aggregation stays fully populated.

## 7. Next recommended step

None — lane complete. If faster full-refresh cadence for the 253/240-post clients is later wanted, the
documented options are raising the cap toward 30 (still in budget) or parallelizing per-post Graph
fetches (separate lane).

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**

- Output matched the brief: one constant, byte-identical logic, deployed + verified. ✓
- Constraints respected: aggregation-first + selector preserved; no DB/cron/parallelization. ✓
- No unexpected files changed (1 EF file in the commit; docs separate). ✓
- Success criteria met: large-client run 200 in 53 s, total_processed=25, windows fresh, verify_jwt=false. ✓
- New risk: none — the escalated "does it fit / will it regress freshness" concern is empirically resolved
  (53 s; windows_computed=50; freshness is structurally independent of the cap).
- Follow-up: none required.

## 9. Learning notes (chat fills this)

- **Verify the worktree base, not just the diff.** ef-builder produced the correct edit but on a stale
  already-merged branch; the diff-vs-main looked clean only because the file was byte-identical at both
  bases. Always confirm the branch base IS current main before relying on a ff-merge.
- **Empirical post-deploy beats calculation for an escalated runtime concern.** The 53 s live large-client
  run resolved the reviewer's "real-world variance" pushback far better than the sizing math alone.
- **Freshness vs collection are decoupled** (aggregation-first): a collection-throughput knob like the cap
  cannot regress the 30/90 windows — useful framing for future runtime tuning.
