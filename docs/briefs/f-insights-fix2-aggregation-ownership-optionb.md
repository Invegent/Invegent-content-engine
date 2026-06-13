# f-insights-fix2-aggregation-ownership — Option B (refresh window-scoping)

**Brief ID:** `f-insights-fix2-aggregation-ownership-optionb`
**Parent carry:** F-INSIGHTS-FIX2-AGGREGATION-OWNERSHIP (D2 of F-OPTIONC-ENGAGEMENT-EVIDENCE-NULL). Audit lane 2026-06-13 (read-only) confirmed the dual-writer overlap.
**Decision (PK, 2026-06-13):** **Option B** — scope `refresh_post_format_performance()` to its exclusive windows {7, 0}; the worker (`computeFormatPerformance`) owns window-30 (and 90). Minimal-change, lowest-risk; no EF redeploy, no cron schedule change.
**Status:** BRIEF ONLY — NOT IMPLEMENTED. Gates remaining: D-01 `ask_chatgpt_review` → PK exact approval phrase → `apply_migration` → V-checks → close-out.
**Class:** `sql_destructive` (SECURITY DEFINER function redefinition via `apply_migration`).
**Authority impact:** none (this brief is docs-only; no production change occurs on its commit).

---

## 1. Problem (audit-confirmed)

`m.post_format_performance` has two writers on the same unique key `(client_id, ice_format_key, rolling_window_days)`:
- **insights-worker `computeFormatPerformance`** — windows **{30, 90}**, all-platform (incl. YouTube), per-client ~03:01–03:16 UTC, via `upsert_format_performance`.
- **`refresh_post_format_performance()`** — cron `refresh-format-performance-daily` **03:15 UTC**, windows **{7, 30, 0}**, FB-dominant (filter `reach IS NOT NULL`), full `ON CONFLICT DO UPDATE`.

**Overlap = window-30 only.** Refresh runs at/after the worker and wins the daily race, so every window-30 row is refresh-owned (stamped 03:15:00). The Advisor reads window-30. As post-Fix-1 rows accumulate over the next ~30 days, the worker's richer (YT-inclusive, Fix-1-engagement) window-30 aggregate will diverge from refresh's FB-only one — and refresh will clobber it nightly. (Today the clobber is *time-masked*: the 30-day window is still 85% pre-Fix-1 NULL-engagement rows — 447 pre vs 79 post — so both writers compute ~NULL/0 regardless. Fixing ownership now prevents the divergence surfacing as the window fills.)

## 2. Change (surgical, one line)

In `public.refresh_post_format_performance()`, the windows CTE:
```
-- BEFORE
SELECT unnest(ARRAY[7, 30, 0]) AS window_days
-- AFTER
SELECT unnest(ARRAY[7, 0]) AS window_days
```
Everything else in the function stays **byte-identical** (same source CTE, same reach filter, same aggregation, same upsert, same return shape). Applied via `apply_migration` (DDL — `CREATE OR REPLACE FUNCTION`), not `execute_sql`.

**Result:** refresh writes only its exclusive windows 7 and 0; the worker becomes the sole window-30 writer. Writers are disjoint by window → no overlap → no clobber. Window-90 already worker-exclusive; windows 7/0 already refresh-exclusive.

## 3. Known consideration — stale window-30 rows (for D-01 + CCD)

Existing window-30 rows last written by refresh will, after this change, only update when the worker next writes that `(client, format, 30)` combo. The worker is the all-platform superset, so it should cover every combo refresh did **plus** YT — but any combo refresh wrote that the worker does *not* compute would freeze at its last refresh value. **Pre-apply verification (CCD/CCH, read-only):** confirm the worker's next-run window-30 combo set ⊇ the current refresh-written window-30 combo set. If a gap exists, options are (a) accept (stale row ages out as the worker's coverage stabilises), or (b) a one-time no-op trigger of the worker post-deploy (separate, gated). Expectation from the audit: the worker is the superset; no gap. To be confirmed, not assumed.

## 4. Test plan / V-checks (post-apply, read-only)

- **V1** function source shows `ARRAY[7, 0]`; `pg_get_functiondef` diff vs prior = only the window array changed.
- **V2** after the next 03:15 cron run: no new window-30 rows carry `computed_at` = that run's 03:15 (refresh no longer writes 30); windows 7 and 0 still refreshed at 03:15 as before.
- **V3** after the next worker run (~03:01–03:16): window-30 rows carry the worker's `computed_at` (per-client minutes), not 03:15.
- **V4** window-7 and window-0 row counts unchanged in structure (refresh still produces them); no regression to those consumers.
- **V5** no orphan/stale window-30 combo: every window-30 combo present has `computed_at` from a worker run after this deploy (confirms §3 superset holds in practice).
- **V6** migration recorded; function search_path/security unchanged (`SECURITY DEFINER`, `search_path pg_catalog, public, m`).

## 5. Rollback

Single-step: re-apply the prior function definition (re-add `30` → `ARRAY[7, 30, 0]`) via `apply_migration`. No data migration; rows re-converge on the next refresh run. Prior definition captured in this brief's §2 BEFORE line and in migration history.

## 6. D-01 risk packet outline

(a) **production function redefinition** — mitigated: one-line array change, rest byte-identical, full prior text retained for rollback; (b) **Advisor read impact** — *positive*: window-30 becomes worker-owned (YT-inclusive, Fix-1 engagement), no behavioural change to Advisor read logic itself (that's Fix 4, out of scope); (c) **stale window-30 rows** — §3 verification gates the apply; (d) **windows 7/0 consumers** — untouched, refresh still writes them; (e) **no effect on Fix 1 acquisition, YT reach (Fix 3), Option C, or the schema/unique key**; (f) **cron unchanged** — same job, same 03:15 schedule, only the function body narrows. `known_weak_evidence`: clobber is currently time-masked, so the fix's benefit is preventative (manifests as the 30-day window fills) rather than immediately visible — acceptable; the audit evidence (447 pre / 79 post split, refresh-owned 03:15 window-30 rows) is in hand.

## 7. Explicitly out of scope

Fix 1 (closed), Fix 3 YT reach mapping (refresh keeps its `reach IS NOT NULL` filter — YT still excluded from refresh, unchanged here), Fix 4 Advisor bad-evidence shielding, Option C, the worker's window set (NOT expanded — that's Option A; B leaves the worker as-is), any schema/unique-key change, dashboard, register reconciliation (held).

## 8. What CCD/CCH may do after PK approval

On PK exact phrase following D-01: apply the one-line migration (`refresh_post_format_performance` window array `{7,30,0}` → `{7,0}`) via `apply_migration`; run §3 pre-apply superset check and §4 V-checks (read-only). Nothing before D-01 + PK phrase.
