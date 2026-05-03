# B-AUDIT-V4-PEERS — Read-only audit pass on slot-driven v4 SQL contract peers

> **Date:** 2026-05-03 evening Sydney
> **Trigger:** F-AAP-001 root cause confirmed v2.27 (auto-approver SQL fetcher INNER JOIN through digest_item incompatible with slot-driven v4 NULL-digest_item_id drafts). Hypothesis: F-AAP-001 may have peers — other SQL objects authored against the legacy digest-flow contract that need v4 updates.
> **Method:** Read-only. Supabase MCP `execute_sql`. No DML, no DDL, no production state changes.
> **Closure budget:** ~0.6h (within bounds; entered as pre-flight against T05 audit-gating per stance retirement).
> **Outcome:** 6 new findings logged. T05 gate-clear path identified.

---

## Scope

- **In scope:** All SQL functions, views, materialised views, and triggers in schemas `c`, `m`, `f`, `t`, `a`, `k` that reference `m.digest_item` or `m.digest_run`.
- **Out of scope:** Edge Function source (TypeScript) — RPC callers of the audit-target functions need a separate read pass. Public-schema functions are partially in scope (caller-resolution only). Dashboard / portal queries not audited.
- **Audit pattern:** Match against F-AAP-001's confirmed mechanism — INNER JOIN through `digest_item` / `digest_run` in code paths that should accept v4 (NULL-digest_item_id) drafts; reads of identity fields (e.g. `client_id`) from `digest_run` that should come from `post_draft` directly; LEFT-JOIN-with-wrong-gate-logic (e.g. treating `digest_item IS NULL` as orphaned data when v4 says it's normal).

## Method

1. Enumerate all functions/views/triggers in target schemas referencing `digest_item` or `digest_run` via `pg_get_functiondef` / `pg_get_viewdef` / `pg_get_triggerdef` ILIKE match. Yield: 27 functions, 1 view, 2 triggers.
2. Identify which are in the active code path (called by active cron, called by EF, called transitively by any of the above) by:
   - Cross-referencing `cron.job` active commands.
   - Cross-referencing function-to-function calls via ILIKE on `pg_get_functiondef`.
3. For active-path matches: pull full source. Inspect for F-AAP-001 break patterns.
4. For dormant matches: pull source for those with high OIDs (likely v4-era, possibly intended for v4) or those with names suggesting active concern. Note pattern presence even if not currently executed — dormant code that's pattern-broken becomes a peer the moment the cron is resumed.
5. Categorise into Confirmed-broken (active), Confirmed-broken (dormant), Confirmed-safe, or Inconclusive (out-of-scope caller surface).

## Cron-active paths (mapping established before source review)

| jobid | Schedule | Active | Calls audit-target SQL? |
|---|---|---|---|
| 12 (`planner-hourly`) | hourly | YES | `m.create_digest_run_for_client` + `m.populate_digest_items_v1` |
| 43 (`ice-system-audit-weekly`) | weekly Sun 13:00 UTC | YES | `m.run_system_audit` |
| 58 (`auto-approver-sweep`) | every 10m | YES (via EF) | `m.auto_approver_fetch_drafts` |
| 75 (`fill-pending-slots-every-10m`) | every 10m | YES | `m.fill_pending_slots` |
| 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) | every 10m | **PAUSED** | `m.seed_and_enqueue_ai_jobs_v1` (→ `match_demand_to_canonicals`) |
| 53 (`instagram-publisher-every-15m`) | every 15m | **PAUSED** | None in audit set |

## Findings

### Active-path findings

#### F-AAP-001 — KNOWN — `m.auto_approver_fetch_drafts`

Documented in `docs/runtime/sessions/2026-05-03-faap001-rootcause.md`. Fix brief at `docs/briefs/2026-05-03-faap001-fix.md`. Severity P1. Path 1 fix in flight.

#### F-AAP-002 (NEW) — `m.run_system_audit` Check 7 "orphaned_active_post_drafts"

**Pattern:** Different shape from F-AAP-001. Uses LEFT JOIN — not INNER — but the gate logic is wrong for v4.

```sql
WITH orphaned AS (
  SELECT COUNT(*) as cnt FROM m.post_draft pd
  LEFT JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
  WHERE di.digest_item_id IS NULL
    AND pd.approval_status IN ('needs_review', 'approved')
)
```

Under v4, `pd.digest_item_id IS NULL` is normal (slot-driven drafts have no digest_item by design). Audit will report all v4 needs_review/approved drafts as data integrity warnings.

**Currently silent** because (a) audit only runs weekly (next fire: Sunday 13:00 UTC), (b) v4 drafts can't approve until F-AAP-001 fixes (so 0 currently). Once F-AAP-001 fix lands, count grows from 0 to ~100+ rapidly.

**Fix:** add `AND pd.slot_id IS NULL` to the WHERE clause — only legacy-path drafts (slot_id NULL) without digest_item are true orphans. v4 drafts have `slot_id IS NOT NULL` and are expected to have NULL digest_item_id.

**Severity:** P2 (audit produces wrong verdicts; doesn't break pipeline; not user-visible). Fix is ~3 lines of SQL; pairs naturally with F-AAP-001 fix as a one-migration follow-up.

**Active path:** jobid 43 weekly Sunday 13:00 UTC. Next misfire: 2026-05-10.

#### F-AAP-003 (NEW) — `m.vw_ops_pipeline_health`

**Pattern:** View reports `latest_digest_run` and `latest_digest_item` as MAX timestamps. These keep ticking from jobid 12's hourly orphan production while not surfacing v4 slot/draft activity at all.

```sql
( SELECT max(digest_run.created_at) ... ) AS latest_digest_run,
( SELECT max(digest_item.created_at) ... ) AS latest_digest_item,
```

Anyone reading the view for pipeline health gets a false-green signal: "digest_item touched 30min ago → pipeline healthy" while the actual v4 pipeline is producing drafts via slot mechanism the view doesn't see.

**Severity:** P3 misleading-metric. No SQL break; doesn't propagate wrong values into mutations. Symptomatic of B-CRON-V3-ORPHAN, not independent.

**Fix candidate:** rewrite to surface v4 metrics: `latest_slot_filled`, `latest_post_draft_v4`, `latest_signal_pool_classify`. Or deprecate the view and replace with a v4-aware health view. Defer until B-CRON-V3-ORPHAN is decided — if jobid 12 is paused, latest_digest_item stops moving and the misleading-metric becomes obvious; if jobid 12 is left active, rewrite is necessary.

#### B-CRON-V3-ORPHAN (NEW) — jobid 12 `planner-hourly` orphan production

**Pattern:** jobid 12 runs hourly and calls `m.create_digest_run_for_client` + `m.populate_digest_items_v1` for every active client. Both functions insert rows into `m.digest_run` and `m.digest_item`. Under v4, **nothing in the active path reads these rows** — v4 uses `m.signal_pool` for canonical selection, not digest_item.

Result: ~24 digest_runs/day per client and N digest_items/digest_run produced as orphan data. Costs DB writes, pollutes audit views (F-AAP-002 + F-AAP-003 both read these), may confuse future debugging.

**Severity:** P3 cleanup candidate. Not a break — the functions work correctly given their inputs. Wrong question: why are we still calling them?

**Decision needed:** pause jobid 12 OR confirm there's something downstream still reading from digest_item population (e.g. dashboard, EF, manual queries). Pausing is reversible but not zero-risk — if anything we don't know about depends on the legacy stream, it stops working.

**Recommendation:** chat does a follow-up read pass to identify all readers of `m.digest_item` / `m.digest_run` (queries from EFs, dashboards, ad-hoc reports). If clean, pause jobid 12. If not clean, the readers are the next audit cycle.

### Dormant-path findings

The following objects exhibit the F-AAP-001 break pattern but are reachable only via paused crons or have no SQL-level caller. They don't pose execution risk in current state but become active risks the moment the relevant cron is resumed, the relevant EF is wired up, or someone calls them ad-hoc. Tagged with the resumption gate.

#### F-AAP-004 (NEW, dormant) — `m.match_demand_to_canonicals`

**Caller chain:** `seed_and_enqueue_ai_jobs_v1` → calls this function. `seed_and_enqueue_ai_jobs_v1` is called only by jobids 11/64/65 (all paused per v4 migration).

**Pattern:** Two F-AAP-001 break sites:

1. **Candidate pool**: reads from `m.digest_item JOIN m.digest_run ... WHERE dr.client_id = p_client_id AND di.selection_state = 'selected' AND di.bundled = TRUE`. Under v4, canonicals live in `m.signal_pool`, not in selected/bundled digest_items. Function would either return empty (if jobid 12 paused) or return stale orphan canonicals (if jobid 12 still running).

2. **Publish history dedup**: INNER JOIN `m.post_publish JOIN m.post_draft JOIN m.digest_item ON pd.digest_item_id = di.digest_item_id`. Direct F-AAP-001 break — v4 published drafts have NULL digest_item_id and are invisible to the dedup. Same canonical can be re-matched.

**Severity:** P3-dormant. No execution today. Gate to resumption of jobids 11/64/65 must include either fixing this function or replacing the seed-and-enqueue path with a v4-native equivalent.

**Note:** This function is potentially the most architecturally significant one outside F-AAP-001 itself — its job (matching weekly demand to canonicals) is core slot-fill logic, but the v4 path implements that logic differently in `m.fill_pending_slots`. Cleanest path forward may be to deprecate `match_demand_to_canonicals` rather than fix it, once it's clear the v4 path covers all cases.

#### F-AAP-005 (NEW, dormant) — `m.diagnose_match_pool_adequacy` + `m.summarise_match_pool_adequacy`

**Caller chain:** `summarise_match_pool_adequacy` calls `diagnose_match_pool_adequacy`. Neither has any SQL-level caller.

**Pattern:** Both functions build their pool from `m.digest_run JOIN m.digest_item` looking for `selection_state='selected' AND bundled=TRUE`. Under v4, this misses signal_pool entirely — the adequacy verdict reflects legacy v3 stream rather than v4 readiness.

**Severity:** P3-dormant + EF-audit-pending. EF or dashboard callers not yet verified — if a weekly-report EF or the dashboard's pool-adequacy display calls these via RPC, severity escalates to P2.

**Follow-up:** EF-side caller audit (separate work item, see Out-of-scope below).

#### F-AAP-006 (NEW, dormant) — `m.cluster_digest_items_v1`

**Caller chain:** `m.run_pipeline_for_client` calls this. `run_pipeline_for_client` has no SQL-level caller.

**Pattern:** Operates only on `m.digest_item` rows (clusters them via title similarity). Doesn't touch `post_draft`. Less concerning than F-AAP-004/005 — if dormant, it's just unused; if reactivated, it operates on whatever digest_items are present (currently the orphans from jobid 12) without breaking anything downstream.

**Severity:** P4-dormant. Cleanup candidate, not a peer in the strict F-AAP-001 sense.

### Confirmed-safe (no action)

- **`m.fill_pending_slots`** — the v4 slot-fill mechanism itself. Inserts NULL into `digest_run_id` on `m.ai_job` (explicit) and never touches `digest_item_id`. Reads `pd.client_id` from `v_slot.client_id` directly. **Validates F-AAP-001 fix pre-flight #5**: `pd.client_id` is populated for v4 drafts.
- **`m.create_digest_run_for_client`** — simple insert into digest_run. Working correctly. The issue is upstream ("why is jobid 12 still calling it?"), not the function. See B-CRON-V3-ORPHAN.
- **`m.populate_digest_items_v1`** — same as above. Has internal self-dedup against its own digest_item history but doesn't INNER JOIN against post_draft. Working correctly given its inputs.
- **`trg_digest_item_updated_at`** + **`trg_digest_run_updated_at`** — trivial `BEFORE UPDATE` triggers setting `updated_at = NOW()`. No contract dependency.
- **All `bundle_*`, `select_*`, `score_*`, `create_post_drafts_v1`, `seed_client_to_ai_v2`, `run_pipeline_for_client`, `seed_and_enqueue_ai_jobs_v1`** — part of the dormant v3 pipeline tree. None have SQL-level callers in the active path. They will need fixing or deprecation before any of the paused crons (11/64/65) are resumed, but pose no current execution risk.

## T05 gate-clear path

**Original audit-gating logic (per stance retirement):** T05 unblocks when B-AUDIT-V4-PEERS comes back without active peer findings.

**Verdict:** Two new active-path findings (F-AAP-002, F-AAP-003) plus one orphan-production observation (B-CRON-V3-ORPHAN). None block external commitments — F-AAP-002 misfires once weekly into an audit log, F-AAP-003 misleads only those who interpret it manually, B-CRON-V3-ORPHAN wastes DB writes but doesn't break anything.

**T05 gate verdict: CLEAR.** T05 returns to P1-urgent in the next action_list bump. F-AAP-002 should be queued as a P2 follow-up to F-AAP-001 (small migration, same closure window). F-AAP-003 + B-CRON-V3-ORPHAN go to backlog. F-AAP-004/005/006 go to backlog tagged against the resumption gate for jobids 11/64/65.

## Out of scope / follow-up work items

1. **EF-side caller audit (B-AUDIT-V4-PEERS-EF, NEW).** TypeScript Edge Functions may call `match_demand_to_canonicals`, `diagnose_match_pool_adequacy`, `summarise_match_pool_adequacy` via Supabase RPC. None of these were verified in this pass. Severity of F-AAP-005 in particular hinges on this. **Method:** scan EF source under `supabase/functions/` for `.rpc('match_demand_to_canonicals'`, similar for other names. CC-suitable read pass.

2. **Reader-side audit on `m.digest_item` / `m.digest_run`.** Before pausing jobid 12 (resolving B-CRON-V3-ORPHAN), enumerate all readers — EFs, dashboards, ad-hoc queries — to confirm nothing depends on the legacy stream. If clean, jobid 12 pauses. If not clean, the readers are the next audit cycle.

3. **Resumption-gate documentation for jobids 11/64/65.** Before any of those crons is reactivated, `seed_and_enqueue_ai_jobs_v1` and its call chain (most critically `match_demand_to_canonicals`) must be either fixed for v4 or replaced. Add to the resumption checklist.

4. **Dashboard / portal query audit.** Both Next.js apps query Supabase directly. Any query reading `m.digest_item` for current state will be misleading under v4. Lower priority than EF audit — these are display-side, not control-flow.

## Closure log

- Audit time: ~0.6h (enumeration + cron mapping + Tier 1 source + Tier 2 source + caller chain + writeup).
- SQL operations: 4 read queries. 0 DML. 0 DDL. 0 EF deploys.
- Standing rules honoured: D-186 (closure budget; 0.6h is above 0.25h granularity, increments trailing-14-day). Lesson #32 (pre-flight via enumeration before deep source pulls). Lesson #51 (pre-flight discipline applied).
- MCP review: not fired. This was a read-only investigation pass; no proposed action subject to D-01 standing rule until F-AAP-002 fix is drafted (then it fires on `sql_destructive` per D-01).

## Action items for action_list v2.28 bump

1. **Stance retired** (criterion #1 fired v2.27, retired this session per PK explicit decision).
2. **T05 returns to P1-urgent** (audit-gate cleared this session).
3. **F-AAP-002** added to Active list. Queue as P2 follow-up to F-AAP-001 fix.
4. **F-AAP-003**, **B-CRON-V3-ORPHAN** added to Backlog as P3 cleanup.
5. **F-AAP-004**, **F-AAP-005**, **F-AAP-006** added to Backlog as P3-dormant tagged against resumption-gate for jobids 11/64/65.
6. **B-AUDIT-V4-PEERS-EF** added to Backlog as next read-only investigation pass (CC-suitable).

---

*End of audit run.*
