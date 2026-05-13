# cc-0012 — platform-reconciliation-view (PRV)

**Status:** v1 (authored 2026-05-13 Sydney; first operator-facing reconciliation visibility layer; awaiting CCD Stage A D-01).
**Parent:** cc-0010 (Phase D — Reconciliation surface) — natural successor to cc-0011 closure.
**Depends on:** cc-0010A v1.5 (r.* schema foundation), cc-0010B v2 (`r.ice_publication_evidence` populating every 30 min), cc-0010C v1 (`r.reconciliation_match` populating every :15/:45), cc-0011 v1.2 (`r.cadence_drift_log` + `r.mv_reconciliation_daily_matrix` + `r.mv_observer_freshness_summary` populating weekly + `r.refresh_cc_0011_views()` refresh helper).
**Blocks:** PRV-1 close criterion 7 (operator-facing visibility surface). Dashboard Phase 0 consumes these views downstream (cc-0001 / future).
**Unblocks at close:** First-class operator triage of reconciliation health without direct r.* access; future Dashboard work has a stable schema contract (`op.*`) to read from; PRV-5 Triage Inbox future consumer.

## 1. Identity

### 1.1 Name + slug
- **Project slug:** `cc-0012`
- **Surface kind:** SQL views in a **new** dedicated schema `op` (operator surfaces).
- **No EF.** No cron job. No HTTP surface. DDL-only build.
- **Migration name:** `cc_0012_op_platform_reconciliation_view` (Stage A; single migration covers schema creation, role creation, view DDL, GRANTs).
- **Expected stage shape:** Stage A (migration apply) + Stage B (post-apply validation contract V1–V10). No Stage C (no EF), no Stage D (no cron), no Stage E (no runtime invocation; views are computed at SELECT time).

### 1.2 In scope
- Create new schema `op` (operator-only).
- Create new role `op_reader` (read-only operator role; CREATE ROLE NOLOGIN).
- Create five views in `op`:
  1. `op.v_reconciliation_summary` — single-row top-level KPI rollup (trailing 7-day window).
  2. `op.v_per_client_rollup` — one row per client_id; trailing 7-day metrics + attention flag.
  3. `op.v_per_platform_rollup` — one row per platform (cross-client); trailing 7-day metrics + attention flag.
  4. `op.v_drift_rollup` — per-row drift findings with client_slug + recency flag; pass-through with context join.
  5. `op.v_freshness_rollup` — per (client_id, platform) tuple: freshness MV + observer health joined.
- GRANT USAGE on `op` schema + SELECT on each `op.*` view to `op_reader` and `service_role`.
- Explicitly **revoke** any default `public` schema-USAGE on `op` (defensive — no anon, no authenticated by default).
- No new MVs (the 5 views are plain `VIEW`s); refresh discipline inherits from cc-0011's existing `r.mv_*` refresh path (cron 85 + on-demand `r.refresh_cc_0011_views()`).
- No new functions (views compose existing MV columns; no SECURITY DEFINER helpers needed for v1).
- No writes to any r.* table. No INSERT/UPDATE/DELETE statements anywhere in the migration.

### 1.3 Out of scope (carry / next briefs)
- **Dashboard UI code** — cc-0012 is the SQL contract only; the UI (cc-0001 Dashboard Phase 0 successor or PRV-5 Triage Inbox) consumes `op.*` views but lives in a separate brief.
- **Authentication wiring for `op_reader` outside DB** — connection string / pgbouncer / Supabase Studio role binding is out-of-scope; the v1 role is DB-level only. PK provisions sessions via `SET ROLE op_reader` from postgres-owner connection or via psql with the role's password (set post-Stage-A by operator).
- **RLS row-level policies** — operator persona sees ALL data (system-wide ops view). No per-tenant row filtering at v1. If multi-tenant operator personas emerge, that lands in cc-NNNN amendment.
- **Per-client / per-platform `r.matcher_config` exposure** — `mc.minutes_late_tolerance` is an internal matcher knob, not an operator KPI; not surfaced in v1.
- **`r.platform_observation` + `r.platform_manual_observation`** — those tables remain empty until PRV-2/3/4 land; cc-0012 references `platform_observer_health` only (which IS populated indirectly by cc-0010C + cc-0011).
- **cc-0011 amendments** (E1 + Var-A + Var-B + Var-C + Var-E carry items) — those land in v1.3 cc-0011 minor doc patch per v2.70 Today/Next 5 rank 3. cc-0012 does not edit any cc-0011 surface.
- **Writes to `r.expected_publication` / `r.ice_publication_evidence` / `r.reconciliation_match` / `r.cadence_drift_log` / any `r.mv_*`** — cc-0012 is strict-read-only against these surfaces.
- **External observer API calls** — Instagram Graph API, YouTube Data API, LinkedIn API, etc. — entirely PRV-2/3/4 territory; cc-0012 has no network surface.
## 2. Read-only inputs (contract)

cc-0012 reads from exactly seven r.* surfaces. The migration body must be byte-for-byte free of any `INSERT INTO r.*`, `UPDATE r.*`, `DELETE FROM r.*`, or `REFRESH MATERIALIZED VIEW r.*` statement. Read-only is verified at Stage B by `pg_stat_user_tables` n_tup_ins/upd/del/hot_upd deltas all = 0 for r.* tables across the migration apply window.

### 2.1 r.expected_publication (cc-0010A)
Columns relied upon: `expected_publication_id (uuid)`, `client_id (uuid)`, `platform (text)`, `cadence_rule_id (uuid)`, `expected_local_date (date)`, `expected_window_start (timestamptz)`, `expected_window_end (timestamptz)`, `expected_format (text)`, `expected_status (text)`, `matched_match_id (uuid)`, `matched_at (timestamptz)`.

cc-0012 reads `expected_status` for status-distribution counts but **does not write** any status transition. The `expected → late` transition deferral from cc-0010C §13 #3 (Var-A in cc-0011) is observed via `op.v_drift_rollup` reading `r.cadence_drift_log.drift_type='late'` rows; the underlying ep row's `expected_status` may remain `'expected'` after a `late` drift finding (Var-A invariance from cc-0011 v1).

### 2.2 r.ice_publication_evidence (cc-0010B)
Columns relied upon: `ice_publication_evidence_id (uuid)`, `expected_publication_id (uuid)`, `pipeline_state (text)`, `published_at (timestamptz)`, `created_at (timestamptz)`.

cc-0012 does NOT directly read `ipe.*` in v1 — all evidence aggregation is consumed via `r.mv_observer_freshness_summary` (which already aggregates `last_evidence_at` and `evidence_count_7d`). Listed in inputs for completeness and Stage B read-trace audit; v1 views do not name `r.ice_publication_evidence` in any FROM clause.

### 2.3 r.reconciliation_match (cc-0010C)
Columns relied upon: `reconciliation_match_id (uuid)`, `expected_publication_id (uuid)`, `matched_match_tier (integer)`, `matched_confidence (numeric)`, `delta_minutes_late (integer)`, `override_by (text)`, `override_reason (text)`, `created_at (timestamptz)`.

Like §2.2, the match metrics are consumed via the cc-0011 daily-matrix MV (`mv_reconciliation_daily_matrix.count_matched`, `count_late`). v1 views do not name `r.reconciliation_match` in any FROM clause directly; listed for completeness and to make the read-only contract explicit.

### 2.4 r.cadence_drift_log (cc-0011)
Columns relied upon: ALL columns. Specifically: `cadence_drift_log_id (uuid)`, `drift_check_run_id (uuid)`, `client_id (uuid)`, `platform (text)`, `drift_type (text)`, `drift_severity (text)`, `observation_window_start (date)`, `observation_window_end (date)`, `expected_publication_id (uuid, NULL for aggregate types)`, `observed_count (integer)`, `expected_count (integer)`, `drift_details (jsonb)`, `created_at (timestamptz)`.

Primary surface for `op.v_drift_rollup`. Also feeds the `drift_warn_critical_count_7d` aggregate in summary + per-client + per-platform rollups.

### 2.5 r.mv_reconciliation_daily_matrix (cc-0011)
Columns relied upon: ALL columns. Specifically: `client_id (uuid)`, `platform (text)`, `client_slug (text)`, `expected_local_date (date)`, `count_expected (bigint)`, `count_matched (bigint)`, `count_late (bigint)`, `count_suppressed (bigint)`, `count_cancelled (bigint)`, `count_total (bigint)`, `on_time_rate (numeric)`, `late_rate (numeric)`, `refreshed_at (timestamptz)`.

Primary source for trailing-7-day rollups across summary + per-client + per-platform views. Already populated with 112 rows at cc-0011 close; refreshed by cron 85 weekly + by EF runtime path inside `cadence-drift-checker`.

### 2.6 r.mv_observer_freshness_summary (cc-0011)
Columns relied upon: ALL columns. Specifically: `client_id (uuid)`, `platform (text)`, `client_slug (text)`, `last_evidence_at (timestamptz)`, `last_match_at (timestamptz)`, `last_drift_log_at (timestamptz)`, `evidence_count_7d (bigint)`, `match_count_7d (bigint)`, `drift_warn_critical_count_7d (bigint)`, `freshness_status (text)`, `refreshed_at (timestamptz)`.

Primary source for `op.v_freshness_rollup` and for the `observer_stale_count`/`observer_warn_count` aggregates in summary view + per-client/per-platform rollups.

### 2.7 r.platform_observer_health (cc-0010A; empty until PRV-2/3/4)
Columns relied upon: `client_id (uuid)`, `platform (text)`, `last_observed_at (timestamptz)`, `consecutive_failure_count (integer)`, `is_healthy (boolean)`, `last_failure_reason (text)`, `updated_at (timestamptz)`.

LEFT JOINed into `op.v_freshness_rollup` so the view degrades gracefully while the table is empty (all observer columns return NULL pre-PRV-2/3/4). Once PRV-2/3/4 lands, the same view becomes a richer health surface without DDL change.

### 2.8 Auxiliary cross-schema read (NOT in directive-named seven; flagged for transparency)
- `c.client` (`client_id`, `client_slug`) — used only to populate `client_slug` columns in `op.v_per_client_rollup` and `op.v_drift_rollup`. Already consumed transitively via `r.mv_*` (both MVs already have `client_slug` denormalised). **v1 design preference**: rely on the MV-denormalised `client_slug`; do NOT JOIN c.client directly to keep the read surface minimal. Trade-off: views inherit cc-0011 MV staleness for client_slug renames — acceptable because client renames are rare and the staleness window is bounded by cron 85 refresh cadence (7 days max) plus any on-demand refresh path. If staleness becomes a problem, v2 can switch to a live JOIN against c.client.
## 3. Operator views (output contract)

All five views live in the `op` schema. All are plain `CREATE VIEW` (NOT materialised) unless flagged otherwise. All view bodies are pure SELECT with no side effects.

### 3.1 op.v_reconciliation_summary
**Cardinality:** exactly 1 row.

**Purpose:** One-screen-glance KPI panel; trailing 7-day window from current Sydney-local date.

**Columns:**
| Column | Type | Source | Definition |
|---|---|---|---|
| `as_of_at` | timestamptz | Computed | `GREATEST(MAX(m.refreshed_at), MAX(f.refreshed_at))` across both source MVs. Tells operator how stale the figures are. |
| `window_start` | date | Computed | `(now() AT TIME ZONE 'Australia/Sydney')::date - INTERVAL '7 days'` |
| `window_end` | date | Computed | `(now() AT TIME ZONE 'Australia/Sydney')::date` |
| `total_expected_7d` | bigint | r.mv_reconciliation_daily_matrix | `SUM(count_expected) WHERE expected_local_date BETWEEN window_start AND window_end` |
| `total_matched_7d` | bigint | same | `SUM(count_matched)` over same window |
| `total_late_7d` | bigint | same | `SUM(count_late)` over same window |
| `total_suppressed_7d` | bigint | same | `SUM(count_suppressed)` over same window |
| `total_cancelled_7d` | bigint | same | `SUM(count_cancelled)` over same window |
| `on_time_rate_7d` | numeric(5,4) | Computed | `CASE WHEN total_expected_7d > 0 THEN total_matched_7d::numeric / total_expected_7d ELSE NULL END` |
| `late_rate_7d` | numeric(5,4) | Computed | `CASE WHEN total_expected_7d > 0 THEN total_late_7d::numeric / total_expected_7d ELSE NULL END` |
| `drift_info_count_7d` | bigint | r.cadence_drift_log | `COUNT(*) FILTER (WHERE drift_severity='info' AND created_at >= now() - INTERVAL '7 days')` |
| `drift_warn_count_7d` | bigint | same | analogous for `'warn'` |
| `drift_critical_count_7d` | bigint | same | analogous for `'critical'` |
| `observer_stale_client_platform_count` | bigint | r.mv_observer_freshness_summary | `COUNT(*) FILTER (WHERE freshness_status IN ('stale', 'no_evidence_ever'))` |
| `attention_needed` | boolean | Computed | `(drift_warn_count_7d + drift_critical_count_7d + observer_stale_client_platform_count) > 0` |

**Notes:** Single-row view; uses scalar subqueries or a constant-folded CTE. No GROUP BY (or `GROUP BY ()` for clarity).

### 3.2 op.v_per_client_rollup
**Cardinality:** one row per distinct `client_id` that has activity in the trailing 7-day matrix OR appears in `mv_observer_freshness_summary`.

**Purpose:** Operator scans clients top-to-bottom; flags any client needing attention.

**Columns:**
| Column | Type | Source | Notes |
|---|---|---|---|
| `client_id` | uuid | aggregate key | |
| `client_slug` | text | MV-denormalised | |
| `platform_count` | integer | r.mv_observer_freshness_summary | `COUNT(DISTINCT platform)` |
| `total_expected_7d` | bigint | r.mv_reconciliation_daily_matrix | sum over client × all platforms × window |
| `total_matched_7d` | bigint | same | |
| `total_late_7d` | bigint | same | |
| `total_suppressed_7d` | bigint | same | |
| `on_time_rate_7d` | numeric(5,4) | Computed | NULL-safe ratio |
| `late_rate_7d` | numeric(5,4) | Computed | NULL-safe ratio |
| `drift_warn_critical_count_7d` | bigint | r.cadence_drift_log | aggregate by client over 7d |
| `observer_stale_platform_count` | bigint | r.mv_observer_freshness_summary | platforms in stale or no_evidence_ever state |
| `last_evidence_at` | timestamptz | r.mv_observer_freshness_summary | MAX(last_evidence_at) over client × all platforms |
| `attention_needed` | boolean | Computed | `(drift_warn_critical_count_7d + observer_stale_platform_count) > 0` |
| `as_of_at` | timestamptz | Computed | passthrough of source MV `refreshed_at` (use MV with later refreshed_at) |

**Ordering:** view is unordered; the consumer (UI / psql session) applies `ORDER BY attention_needed DESC, late_rate_7d DESC NULLS LAST, client_slug` at query time.

### 3.3 op.v_per_platform_rollup
**Cardinality:** one row per distinct `platform` that has activity in the trailing 7-day matrix OR appears in `mv_observer_freshness_summary`.

**Purpose:** Operator scans platforms top-to-bottom; flags any platform unhealthy across the client base.

**Columns:**
| Column | Type | Source | Notes |
|---|---|---|---|
| `platform` | text | aggregate key | |
| `client_count` | integer | r.mv_observer_freshness_summary | distinct clients with rules on this platform |
| `total_expected_7d` | bigint | r.mv_reconciliation_daily_matrix | sum over platform × all clients × window |
| `total_matched_7d` | bigint | same | |
| `total_late_7d` | bigint | same | |
| `total_suppressed_7d` | bigint | same | |
| `on_time_rate_7d` | numeric(5,4) | Computed | NULL-safe ratio |
| `late_rate_7d` | numeric(5,4) | Computed | NULL-safe ratio |
| `drift_warn_critical_count_7d` | bigint | r.cadence_drift_log | aggregate by platform over 7d |
| `observer_stale_client_count` | bigint | r.mv_observer_freshness_summary | clients in stale or no_evidence_ever state on this platform |
| `last_evidence_at` | timestamptz | r.mv_observer_freshness_summary | MAX over platform × all clients |
| `attention_needed` | boolean | Computed | `(drift_warn_critical_count_7d + observer_stale_client_count) > 0` |
| `as_of_at` | timestamptz | Computed | as in §3.2 |

**Ordering:** unordered at view level; consumer applies `ORDER BY attention_needed DESC, late_rate_7d DESC NULLS LAST, platform`.

### 3.4 op.v_drift_rollup
**Cardinality:** one row per `r.cadence_drift_log` row in the trailing 30-day window. **Pass-through-with-context** — not aggregated.

**Purpose:** Operator triage queue. Each row is an actionable drift finding.

**Columns:**
| Column | Type | Source | Notes |
|---|---|---|---|
| `cadence_drift_log_id` | uuid | r.cadence_drift_log | passthrough |
| `drift_check_run_id` | uuid | r.cadence_drift_log | passthrough; FK to `r.reconciliation_run` |
| `run_started_at` | timestamptz | r.reconciliation_run (JOIN) | when the drift run that produced this row began |
| `client_id` | uuid | r.cadence_drift_log | passthrough |
| `client_slug` | text | r.mv_observer_freshness_summary (or c.client) | denormalised lookup; see §2.8 |
| `platform` | text | r.cadence_drift_log | passthrough |
| `drift_type` | text | r.cadence_drift_log | passthrough; one of {late, missing, cadence_anomaly, observer_stale} |
| `drift_severity` | text | r.cadence_drift_log | passthrough; one of {info, warn, critical} |
| `expected_publication_id` | uuid | r.cadence_drift_log | NULL for aggregate types per cc-0011 R2 |
| `observation_window_start` | date | r.cadence_drift_log | passthrough |
| `observation_window_end` | date | r.cadence_drift_log | passthrough |
| `observed_count` | integer | r.cadence_drift_log | passthrough; NULL for per-row types |
| `expected_count` | integer | r.cadence_drift_log | passthrough; NULL for per-row types |
| `drift_details` | jsonb | r.cadence_drift_log | passthrough |
| `created_at` | timestamptz | r.cadence_drift_log | when the drift_log row was written |
| `is_recent` | boolean | Computed | `created_at >= now() - INTERVAL '7 days'` |
| `is_actionable` | boolean | Computed | `drift_severity IN ('warn', 'critical')` |

**Filter:** view body restricts to `created_at >= now() - INTERVAL '30 days'` to cap the operator triage queue size. Older history accessible via direct `r.cadence_drift_log` query by service_role only.

**Ordering:** unordered; consumer applies `ORDER BY is_actionable DESC, drift_severity DESC, created_at DESC`.

### 3.5 op.v_freshness_rollup
**Cardinality:** one row per `(client_id, platform)` tuple in `r.mv_observer_freshness_summary` (currently 14 rows; grows as new (client, platform) cadence-rule tuples are added).

**Purpose:** "Is the system seeing recent activity from every observed surface?" panel.

**Columns:**
| Column | Type | Source | Notes |
|---|---|---|---|
| `client_id` | uuid | r.mv_observer_freshness_summary | passthrough |
| `client_slug` | text | r.mv_observer_freshness_summary | MV-denormalised |
| `platform` | text | r.mv_observer_freshness_summary | passthrough |
| `last_evidence_at` | timestamptz | r.mv_observer_freshness_summary | passthrough; NULL if no_evidence_ever |
| `last_match_at` | timestamptz | r.mv_observer_freshness_summary | passthrough |
| `last_drift_log_at` | timestamptz | r.mv_observer_freshness_summary | passthrough |
| `evidence_count_7d` | bigint | r.mv_observer_freshness_summary | passthrough |
| `match_count_7d` | bigint | r.mv_observer_freshness_summary | passthrough |
| `drift_warn_critical_count_7d` | bigint | r.mv_observer_freshness_summary | passthrough |
| `freshness_status` | text | r.mv_observer_freshness_summary | passthrough; one of cc-0011's MV-computed status values |
| `minutes_since_last_evidence` | integer | Computed | `EXTRACT(EPOCH FROM (now() - last_evidence_at)) / 60`; NULL if last_evidence_at is NULL |
| `observer_is_healthy` | boolean | r.platform_observer_health (LEFT JOIN) | NULL until PRV-2/3/4 populates the table |
| `observer_consecutive_failure_count` | integer | r.platform_observer_health (LEFT JOIN) | NULL pre-PRV-2/3/4 |
| `observer_last_failure_reason` | text | r.platform_observer_health (LEFT JOIN) | NULL pre-PRV-2/3/4 |
| `observer_last_observed_at` | timestamptz | r.platform_observer_health (LEFT JOIN) | NULL pre-PRV-2/3/4 |
| `attention_needed` | boolean | Computed | `freshness_status IN ('stale', 'no_evidence_ever') OR observer_is_healthy = false` |
| `as_of_at` | timestamptz | r.mv_observer_freshness_summary | passthrough of `refreshed_at` |

**Ordering:** unordered; consumer applies `ORDER BY attention_needed DESC, last_evidence_at ASC NULLS FIRST, client_slug, platform`.
## 4. SQL design

### 4.1 View vs MV decision
**All five v1 surfaces are plain VIEWs.** Justification:
- The two heavy aggregation steps (daily-matrix grouping + per-(client, platform) freshness rollup) already happen inside the cc-0011 MVs. Operator views compose those MVs cheaply; live-compute cost is bounded by the MV cardinality (`mv_reconciliation_daily_matrix` ≈ 14 client-platform × N-day = O(hundreds); `mv_observer_freshness_summary` = O(client × platform) ≈ 14 rows today).
- Plain VIEWs avoid a second refresh discipline. Operators see numbers as fresh as the source MV refresh cadence (cron 85 weekly + on-demand inside `cadence-drift-checker` runs).
- The `op.v_drift_rollup` body reads `r.cadence_drift_log` directly (not via an MV) but is bounded by the 30-day filter to keep result size capped; current cdl row count is 3.
- **Promotion path:** if any v1 VIEW shows live-compute latency above operator UX threshold (~250ms typical, ~1s tolerable), promote to MV in v2 amendment. Initial deployment monitors `EXPLAIN ANALYZE` against each view at Stage B validation; if any returns > 500ms baseline cost, flag as v2 candidate.

### 4.2 Refresh discipline
**No new refresh discipline.** cc-0012 introduces zero materialised views; refresh is entirely inherited from cc-0011's `r.refresh_cc_0011_views()` helper (which refreshes both `r.mv_reconciliation_daily_matrix` and `r.mv_observer_freshness_summary` CONCURRENTLY at the start of each `cadence-drift-checker` EF run + at the cron 85 weekly fire).

**Operator-side fresh-data path:** if an operator needs more-current data than the most-recent cron 85 fire, they must trigger `cadence-drift-checker` manually (e.g. via a PK-direct `net.http_post` to `https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/cadence-drift-checker`). cc-0012 does NOT expose any operator-callable refresh function in v1. Adding `op.refresh_views()` as a SECURITY DEFINER wrapper around `r.refresh_cc_0011_views()` is a deferred v2 enhancement (would require operator-callable function semantics + audit-row writes; out-of-scope v1 because it crosses the "no writes" boundary at the function level).

### 4.3 Indexes
**Zero new indexes required.** All five views project from MVs and tables that already have appropriate indexes from cc-0010A + cc-0011 Stage A:
- `r.mv_reconciliation_daily_matrix`: unique index on (`client_id`, `platform`, `expected_local_date`) per cc-0011 §5.1.2 (required for CONCURRENTLY refresh).
- `r.mv_observer_freshness_summary`: unique index on (`client_id`, `platform`) per cc-0011 §5.1.2 (required for CONCURRENTLY refresh).
- `r.cadence_drift_log`: indexes on (`drift_check_run_id`), (`client_id`, `platform`), (`drift_type`, `drift_severity`), (`created_at` DESC) per cc-0011 §5.1.1.
- `r.reconciliation_run`: PK on `reconciliation_run_id` (cc-0010A) — sufficient for the `op.v_drift_rollup` JOIN.
- `r.platform_observer_health`: PK + (`client_id`, `platform`) unique index per cc-0010A — sufficient for `op.v_freshness_rollup` LEFT JOIN.

If Stage B validation reveals a missing index supporting a hot path, the v2 amendment may add it; v1 ships with zero new index DDL.

### 4.4 Ownership
**View owner:** `postgres` (the migration-runner role; default for `apply_migration` via Supabase MCP).

**Rationale:** Postgres views inherit the owner's privileges at SELECT time (Postgres views are effectively SECURITY DEFINER by virtue of being owned objects). The view owner needs SELECT on all underlying r.* tables and MVs; `postgres` already has full privileges on all schemas. This is the simplest secure ownership model — no explicit GRANTs need to chain from `service_role` to the view to r.* tables.

**Alternative considered + rejected:** owning views as `service_role` would require the same GRANTs but adds no value (service_role can already SELECT everywhere); owning as a dedicated `op_owner` role would require a role-creation DDL + explicit GRANTs from `op_owner` to r.* — more complexity, no incremental safety. Postgres ownership is canonical for migration-installed objects.

### 4.5 SECURITY DEFINER usage rules
**Zero SECURITY DEFINER functions in v1.** All operator surfaces are views, which in PostgreSQL execute with the view owner's privileges automatically — no `SECURITY DEFINER` attribute needed at the view layer.

**v2 candidate (deferred):** `op.refresh_views()` as a SECURITY DEFINER function wrapping `r.refresh_cc_0011_views()` for operator-triggered refresh. Would require:
- `proconfig=["search_path=\"\""]` (per cc-0011 §5.1.3 + L40 pattern)
- explicit `EXECUTE` GRANT to `op_reader` (not `PUBLIC`)
- audit-row write (would cross the v1 "no writes to r.* surfaces" boundary; v1 holds the line).

### 4.6 Cross-schema reference policy
- Views in `op.*` may reference `r.*` and (potentially) `c.*` schemas.
- Views must NOT reference `m.*`, `a.*`, `audit.*`, `f.*`, `k.*`, `t.*` schemas — those are out-of-scope for the operator persona.
- Stage B grep-checklist V11 enforces this — `pg_get_viewdef(...)` for each `op.*` view must contain only `r.` and (optionally) `c.` schema-qualified references.

### 4.7 NULL handling + division-by-zero
All ratio columns (`on_time_rate_*`, `late_rate_*`) use the pattern:
```sql
CASE WHEN <denominator> > 0 THEN <numerator>::numeric / <denominator> ELSE NULL END
```
Operator UI should render `NULL` ratios as "—" or "n/a", NOT as 0%. Treating NULL as 0% would falsely show "0% on-time" for a (client, platform) tuple that has no expected publications in the window.

### 4.8 Timestamp semantics
- `as_of_at` columns expose the source MV's `refreshed_at` timestamp (UTC).
- Date-window columns (`window_start`, `window_end`, `observation_window_start/end`) are stored as `date` type and computed in Sydney-local time (`AT TIME ZONE 'Australia/Sydney'`) consistent with cc-0011's `computeDriftWindow` helper.
- `minutes_since_last_evidence` is computed at SELECT time (live; not MV-derived) so it always reflects current wall-clock staleness regardless of MV refresh lag.
## 5. Auth / access

### 5.1 RLS boundaries
- **No RLS at the row level on `op.*` views.** PostgreSQL view-level RLS support is limited; the operator persona at v1 is system-wide (sees all clients, all platforms). Multi-tenant operator filtering is a v2 enhancement deferred to a future brief.
- **RLS on underlying r.* tables remains as-is** (cc-0010A set RLS to disabled on the r.* schema; cc-0012 does NOT modify that state). r.* tables remain inaccessible to `anon` and `authenticated` Supabase roles because no GRANTs flow to those roles — schema-level access boundary, not row-level.

### 5.2 Operator-only exposure
- **Schema `op`:** GRANT USAGE on `op` TO `op_reader`, `service_role`. REVOKE USAGE from `PUBLIC` (defensive; `PUBLIC` does not get USAGE on `op` at create time anyway, but the migration includes an explicit `REVOKE ALL ON SCHEMA op FROM PUBLIC` for belt-and-braces).
- **Views in op.*:** GRANT SELECT ON ALL VIEWS IN SCHEMA op TO `op_reader`, `service_role`. REVOKE SELECT FROM `anon`, `authenticated`, `PUBLIC` (explicit; again defensive).
- **Default privileges:** `ALTER DEFAULT PRIVILEGES IN SCHEMA op REVOKE ALL ON TABLES FROM PUBLIC` ensures any future view added to `op` does not accidentally leak to `PUBLIC`.

### 5.3 op_reader role definition
- `CREATE ROLE op_reader WITH NOLOGIN INHERIT;` — the role exists for GRANT targets but is not directly loginable. Operators connect as `postgres` or `service_role` and `SET ROLE op_reader;` to assume the read-only persona, or PK provisions a separate login role that inherits `op_reader`.
- `GRANT USAGE ON SCHEMA op TO op_reader;`
- `GRANT SELECT ON ALL VIEWS IN SCHEMA op TO op_reader;` (note: applies to v_reconciliation_summary, v_per_client_rollup, v_per_platform_rollup, v_drift_rollup, v_freshness_rollup at apply time)
- **No** GRANTs on r.* tables to `op_reader` directly — operator role can read only via the op.* views (defence in depth; even if a view leaks raw row references via a planner shortcut, op_reader cannot SELECT from r.* directly).

### 5.4 No public surfaces
- Zero PostgREST exposure expected at v1. The `op` schema is **not** added to the Supabase API exposure list (`exposed_schemas` in `supabase/config.toml` is left unchanged; current value should exclude `op`).
- If a Dashboard UI (future) needs HTTP access, that lands in a separate brief that explicitly adds `op` to the exposed-schemas list with a documented RLS strategy at that time.
- The migration body explicitly states (in a comment) that PostgREST exposure is intentionally not configured at v1.

### 5.5 Service-role access preserved
- `service_role` retains full SELECT on `op.*` (granted explicitly per §5.2). This means existing EFs (`cadence-drift-checker`, `reconciliation-matcher`, etc.) could read from `op.*` if needed — though no v1 EF does so, this keeps the option open for the cron-tied tooling.

### 5.6 Anon + authenticated explicit revoke
- `REVOKE ALL ON SCHEMA op FROM anon, authenticated;` — explicit (even though these roles do not get USAGE by default at CREATE SCHEMA). Belt-and-braces against future Supabase default-privilege changes.
- `REVOKE ALL ON ALL VIEWS IN SCHEMA op FROM anon, authenticated;` — same logic.

## 6. Stage breakdown

### Stage A — migration apply
**Migration name:** `cc_0012_op_platform_reconciliation_view`

**Apply mechanism:** Supabase MCP `apply_migration` (canonical for DDL per cc-0010A/B/cc-0011 Stage A precedent).

**Body shape (high level):**
1. `CREATE SCHEMA IF NOT EXISTS op;` (idempotent; defensive)
2. `REVOKE ALL ON SCHEMA op FROM PUBLIC, anon, authenticated;`
3. `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'op_reader') THEN CREATE ROLE op_reader WITH NOLOGIN INHERIT; END IF; END $$;` (idempotent role creation)
4. `GRANT USAGE ON SCHEMA op TO op_reader, service_role;`
5. `CREATE OR REPLACE VIEW op.v_reconciliation_summary AS ...` (full body per §3.1)
6. `CREATE OR REPLACE VIEW op.v_per_client_rollup AS ...` (full body per §3.2)
7. `CREATE OR REPLACE VIEW op.v_per_platform_rollup AS ...` (full body per §3.3)
8. `CREATE OR REPLACE VIEW op.v_drift_rollup AS ...` (full body per §3.4)
9. `CREATE OR REPLACE VIEW op.v_freshness_rollup AS ...` (full body per §3.5)
10. `GRANT SELECT ON ALL TABLES IN SCHEMA op TO op_reader, service_role;` (views included)
11. `ALTER DEFAULT PRIVILEGES IN SCHEMA op REVOKE ALL ON TABLES FROM PUBLIC;`
12. `ALTER DEFAULT PRIVILEGES IN SCHEMA op REVOKE ALL ON TABLES FROM anon, authenticated;`
13. `REVOKE ALL ON ALL TABLES IN SCHEMA op FROM PUBLIC, anon, authenticated;` (defensive)

**Pre-flight gates (§6.1):**
- §6.1.1 — schema `op` MUST NOT already exist (or, if it exists, MUST be empty); HALT if it has any objects not created by cc-0012.
- §6.1.2 — role `op_reader` MUST NOT already exist (or, if it exists, MUST have rolcanlogin=false + zero existing object grants); HALT if state is inconsistent.
- §6.1.3 — all seven r.* source surfaces MUST exist with the column shapes named in §2 (verified via `information_schema.columns` probe; HALT on any column-name mismatch — applies L55 candidate preventive pattern explicitly).
- §6.1.4 — `r.mv_reconciliation_daily_matrix` MUST have a unique index on (`client_id`, `platform`, `expected_local_date`) [required for downstream CONCURRENTLY refresh, not strictly required for cc-0012 but a sanity check]; HALT if missing.
- §6.1.5 — `r.mv_observer_freshness_summary` MUST have a unique index on (`client_id`, `platform`); HALT if missing.
- §6.1.6 — Supabase MCP `apply_migration` access available; HALT if not.

**Atomicity:** All Stage A DDL runs inside the `apply_migration` transaction wrapper. Failure at any step → clean rollback → zero state mutation.

**Stage A success criteria:**
- migration name `cc_0012_op_platform_reconciliation_view` recorded in `supabase_migrations.schema_migrations`.
- 1 schema (`op`) + 1 role (`op_reader`) + 5 views in `op.*` + correct GRANTs.
- `SELECT count(*) FROM op.v_reconciliation_summary` returns 1 row.
- `SELECT count(*) FROM op.v_per_client_rollup` returns ≥ 1 row.
- `SELECT count(*) FROM op.v_per_platform_rollup` returns ≥ 1 row.
- `SELECT count(*) FROM op.v_drift_rollup` returns ≥ 0 rows (3 expected at cc-0011 close).
- `SELECT count(*) FROM op.v_freshness_rollup` returns 14 rows (matches cc-0011 freshness MV row count at cc-0011 close).

### Stage B — post-apply validation
Read-only verification only. No new DDL. Single `execute_sql` call covers all V-checks. Validation contract per §7.

### Stage C — close
PK-directive close-out per cc-0011 precedent. 4-way sync commit: result artifact + session log + sync_state row + action_list ADDITIONS / version bump. If all V-checks pass: CLOSED. If any V-check fails: HALT for v2 patch cycle.

**No Stage D (no cron). No Stage E (no runtime EF). cc-0012 is DDL-only.**
## 7. Validation contract (V1–V10)

All checks are read-only. Run as a single `execute_sql` block at Stage B. All must PASS; any FAIL → HALT and surface as Stage B variance for PK decision (v2 patch vs accept-as-carry).

### V1 — Schema + role + view inventory (existence)
- `op` schema exists.
- `op_reader` role exists with rolcanlogin=false.
- Exactly 5 views in `op` schema named `v_reconciliation_summary`, `v_per_client_rollup`, `v_per_platform_rollup`, `v_drift_rollup`, `v_freshness_rollup`.

### V2 — GRANT integrity
- `op_reader` has `USAGE` on schema `op`.
- `op_reader` has `SELECT` on each of the 5 views.
- `service_role` has `USAGE` on `op` + `SELECT` on each view.
- `anon` has NO USAGE on `op`, NO SELECT on any `op.*` view.
- `authenticated` has NO USAGE on `op`, NO SELECT on any `op.*` view.
- `PUBLIC` has NO USAGE on `op`, NO SELECT on any `op.*` view.

### V3 — View ownership
- All 5 views owned by `postgres`.

### V4 — Cross-schema reference policy
- For each view, `pg_get_viewdef(...)` body contains ONLY references to `r.*` and (optionally) `c.*` schemas.
- No view body references `m.*`, `a.*`, `audit.*`, `f.*`, `k.*`, `t.*`, `vault.*`, `auth.*`, `storage.*`, `net.*`, `cron.*`.

### V5 — Row parity vs source tables
- `op.v_reconciliation_summary`: returns exactly 1 row.
- `op.v_per_client_rollup`: row count equals `COUNT(DISTINCT client_id) FROM r.mv_observer_freshness_summary` (currently 7 unique clients across 14 rows at cc-0011 close).
- `op.v_per_platform_rollup`: row count equals `COUNT(DISTINCT platform) FROM r.mv_observer_freshness_summary` (currently 4 platforms: facebook, instagram, linkedin, youtube).
- `op.v_drift_rollup`: row count equals `COUNT(*) FROM r.cadence_drift_log WHERE created_at >= now() - INTERVAL '30 days'` (currently 3 at cc-0011 close, all within window).
- `op.v_freshness_rollup`: row count equals `COUNT(*) FROM r.mv_observer_freshness_summary` (currently 14).

### V6 — Freshness timestamp surfacing
- `op.v_reconciliation_summary.as_of_at` is non-NULL and equals `GREATEST(MAX(m.refreshed_at), MAX(f.refreshed_at))` across both cc-0011 MVs.
- `op.v_per_client_rollup.as_of_at` is non-NULL for every row.
- `op.v_per_platform_rollup.as_of_at` is non-NULL for every row.
- `op.v_freshness_rollup.as_of_at` is non-NULL for every row.
- `op.v_drift_rollup` does not have `as_of_at` (it is a pass-through view with per-row `created_at`); V6 does not apply to it.

### V7 — Anti-duplication checks
- `op.v_per_client_rollup`: no `client_id` appears more than once. Verified by `SELECT client_id, COUNT(*) FROM op.v_per_client_rollup GROUP BY client_id HAVING COUNT(*) > 1` returning 0 rows.
- `op.v_per_platform_rollup`: no `platform` appears more than once. Same pattern.
- `op.v_freshness_rollup`: no `(client_id, platform)` tuple appears more than once. Same pattern over `(client_id, platform)`.
- `op.v_drift_rollup`: no `cadence_drift_log_id` appears more than once. Verified by analogous query — passthrough should preserve PK uniqueness.

### V8 — NULL semantics on ratio columns
- For every row in `op.v_per_client_rollup` where `total_expected_7d > 0`, `on_time_rate_7d IS NOT NULL` and `late_rate_7d IS NOT NULL`.
- For every row where `total_expected_7d = 0`, `on_time_rate_7d IS NULL` AND `late_rate_7d IS NULL` (no div-by-zero; no false-0%).
- Same checks for `op.v_per_platform_rollup`.

### V9 — Anti-write invariance
- Before Stage B: capture `pg_stat_user_tables` n_tup_ins/upd/del for the seven r.* read-input tables.
- After Stage B SELECT-only suite: capture same.
- Deltas must all be zero for `r.expected_publication`, `r.ice_publication_evidence`, `r.reconciliation_match`, `r.cadence_drift_log`, `r.mv_reconciliation_daily_matrix`, `r.mv_observer_freshness_summary`, `r.platform_observer_health`.

### V10 — EXPLAIN ANALYZE budget
- `EXPLAIN ANALYZE SELECT * FROM op.v_reconciliation_summary` returns in < 500ms (cold) and < 100ms (warm).
- Same for each of the other 4 views.
- Any view exceeding 500ms cold flagged as MV-promotion candidate for v2 amendment; not a Stage B blocker but a v2-trigger recorded in result artifact.

### Optional V11 — operator-shape smoke test
- `SET ROLE op_reader; SELECT count(*) FROM op.v_reconciliation_summary; RESET ROLE;` succeeds (1 row).
- `SET ROLE op_reader; SELECT count(*) FROM r.expected_publication; RESET ROLE;` FAILS with `permission denied for schema r` (proves operator persona cannot reach underlying data).
- This V11 is operator-level smoke proof and is the single check that requires temporary role assumption; it's marked optional because PK may elect to defer role-binding rehearsal to Stage C close-out.

## 8. Out-of-scope forbidden actions (explicit)

cc-0012 v1 is **strict-DDL-and-GRANT-only**. The following are explicitly forbidden across the entire build:

1. **Writes to any reconciliation table.** No `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `UPSERT`, or `TRUNCATE` against `r.cadence_drift_log`, `r.reconciliation_match`, `r.reconciliation_run`, or any other r.* table.
2. **Writes to expected/evidence/match/drift surfaces.** Same as 1; restated for emphasis. No row-level mutation of `r.expected_publication`, `r.ice_publication_evidence`, `r.reconciliation_match`, `r.cadence_drift_log`.
3. **Writes to materialised views.** No `REFRESH MATERIALIZED VIEW` statement in the cc-0012 migration body or in any cc-0012 view definition. (MV refresh remains entirely under cc-0011's `r.refresh_cc_0011_views()` ownership.)
4. **Observer API calls.** No outbound HTTP. No `net.http_post`, `net.http_get`, or any `extensions.http*` invocation. cc-0012 has zero network surface.
5. **Dashboard UI code.** No frontend / Vercel / React work. cc-0012 is the SQL contract only; UI consumption lives in a separate brief.
6. **cc-0011 amendment work.** No edits to `docs/briefs/cc-0011-cadence-drift-checker.md`. No changes to cc-0011 EF source. No changes to cron 85. Var-A / Var-B / Var-C / Var-E / E1 carry items remain explicitly out-of-scope for cc-0012 (they land in v1.3 cc-0011 minor doc patch per v2.70 Today/Next 5 rank 3).
7. **Schema additions outside `op`.** No new tables, no new functions, no new types, no new triggers outside the `op` schema. The only cross-schema artifact is the `op_reader` role (which is global; CREATE ROLE has no schema scope).
8. **Modifications to existing roles.** No ALTER ROLE on `anon`, `authenticated`, `service_role`, `postgres`. No changes to existing role memberships.
9. **PostgREST exposure changes.** `supabase/config.toml` is not edited; `op` schema is intentionally NOT added to the API exposure list at v1.
10. **Foreign data wrappers / extensions.** No `CREATE EXTENSION`. No FDW. cc-0012 uses only the existing stack.
11. **Index changes on r.* surfaces.** No new indexes; cc-0011 + cc-0010A indexes are deemed sufficient.
12. **MV creation.** All five v1 outputs are plain VIEW, not MATERIALIZED VIEW. MV promotion is a v2 amendment decision.
## 9. Carry-forward lessons encoded

### L42 — vault row reuse pattern (4-job reification continues)
- **Status:** No new vault usage in cc-0012 (DDL-only, no EF, no cron). L42 is referenced here only to acknowledge the precedent: ANY future cc-NNNN that adds a cron-tied EF MUST source `CRON_SECRET` from the existing vault row `0fede5c3-f92c-4bd6-8837-c0e304dfca4c`. cc-0012 does not create a new vault row.
- **Brief application:** §4.5 SECURITY DEFINER deferred for any `op.refresh_views()` v2 candidate; if that lands, the function MUST NOT introduce any new vault row; auth flows through existing roles only.

### L52 — CLI-direct deploy route
- **Status:** Not directly applicable to cc-0012 (no EF deploy step). Acknowledged here so v2 amendment that adds operator-callable refresh function follows the canonical CLI-direct pattern if any deploy step is introduced.
- **Brief application:** if v2 introduces a SECURITY DEFINER function with a deploy-like installation step (Supabase MCP `apply_migration` is the canonical path for functions per cc-0011 §5.1.3), do NOT detour via `deploy_edge_function` MCP — same anti-pattern carry from L52.

### L53 — preventive `assertUuid` pattern
- **Status:** Not directly applicable (no EF source, no TypeScript). Acknowledged here as a brief-authoring discipline marker.
- **Brief application:** §3.4 `op.v_drift_rollup` JOINs `r.reconciliation_run` ON `drift_check_run_id`; the underlying FK is enforced by cc-0010A schema (no JS-level assertion needed). For any future SECURITY DEFINER function added to `op.*`, parameter validation should mirror L53 preventive style (assert uuid shape at function entry).

### L55 candidate — Stage B grep checklist column-name verification
- **Status:** APPLIED at brief-authoring time. §2 read-only inputs contract enumerates every column the views reference, mapped to source-table column-name strings. §6.1.3 pre-flight gate explicitly probes `information_schema.columns` for each named column on each named table BEFORE attempting the migration. This is the L55 preventive pattern reified at the brief level (companion to cc-0011 Stage B grep checklist).
- **Brief application:** §6.1.3 MUST be re-verified at Stage A apply time. If any column-name mismatch is detected (PK selects v1.1 patch path) the migration HALTS without state mutation, identical to cc-0011 Stage A v1→v1.2 cycle.

### L56 candidate — PostgREST timestamptz vs date assumption
- **Status:** Not directly exercised (no JS / TypeScript / PostgREST consumer in cc-0012). Acknowledged here for completeness.
- **Brief application:** all timestamp columns in op.* views are returned as native PostgreSQL timestamptz; any future operator UI consuming via PostgREST should pre-validate that it accepts ISO-8601 timestamp shapes (companion to cc-0011 Var-E candidate root cause).

### Additional carries (cc-0011 close-derived)
- **L40** — TypeScript-compile-vs-runtime gap not applicable (no TS); brief acknowledges the discipline marker.
- **L41** — local-HEAD == origin-main invariant at apply time: cc-0012 will apply migration only after verifying `git status` clean + local HEAD == origin/main HEAD.
- **L43** — runtime-equivalent stage variance: not applicable (DDL-only; no cron-fire-equivalent path; Stage B is pure SELECT verification).
- **L46** — clean D-01 pass-through cadence preserved: cc-0012 v1 expected to fire 1 D-01 (Stage A apply) under PK-direct directive cadence; 0 chat-fired ask_chatgpt_review expected this cycle (same operational mode as cc-0010C v2.69 + cc-0011 v2.70).
- **L62 type-(c)** — predictable-failure-at-pre-flight pattern: §6.1.3 implements this preventively for column-name mismatches.

## 10. Risk register

### R1 — Operator persona binding (medium; deferred to v2)
The `op_reader` role exists as a target for GRANTs but has no login binding at v1. Operator usage requires either:
- PK assumes `op_reader` from a privileged connection via `SET ROLE op_reader;` (mostly diagnostic)
- A separate login role is created post-Stage-A that inherits `op_reader` (operationally for future ops staff)

This is a known v1 limitation. Mitigation: Stage A success still leaves the schema queryable by `service_role`, which is the path Supabase Studio + EFs already use. Operator-flow rehearsal can happen in cc-0013 or via PK-direct psql.

### R2 — MV staleness propagation (low; acceptable)
cc-0012 inherits cc-0011's MV refresh cadence (cron 85 weekly). Between fires, `as_of_at` in operator views reflects the last refresh, which can be up to 7 days stale. Acceptable for v1 because:
- Operators have `created_at`-based per-row freshness on `op.v_drift_rollup` and `op.v_freshness_rollup.minutes_since_last_evidence` (live).
- Manual refresh path exists (PK fires `cadence-drift-checker` via `net.http_post` when fresh data needed).
- v2 SECURITY DEFINER wrapper for `op.refresh_views()` is the canonical operator-driven refresh enhancement.

### R3 — View planner cost on aggregations (low)
The 7-day window aggregations over `r.mv_reconciliation_daily_matrix` (≈ hundreds of rows) and per-row `r.cadence_drift_log` reads (3 rows today, expected to grow over weeks/months) are cheap at current data volume. V10 EXPLAIN ANALYZE budget (500ms cold / 100ms warm) catches any planner regression. If the budget is breached, MV promotion is the v2 mitigation.

### R4 — Schema-rename + role-rename brittleness (low)
View bodies reference `r.*` schema-qualified table/MV names. If cc-0010A schema is ever renamed (highly unlikely; would be a v2-level project), op.* views break. Same applies to `op_reader` role if renamed. Acceptable v1 brittleness because these names are stable contracts established across cc-0009 → cc-0011.

### R5 — Multi-tenant operator filtering not present (medium; deferred)
v1 operator persona sees ALL clients. If a future scenario requires per-client operator filtering (e.g. client A's ops team sees only client A's surfaces), that requires RLS policies on the views OR per-tenant view variants. Out-of-scope v1; flagged for cc-NNNN amendment.

### R6 — Stage A migration column-name preventive (NEW v2.70 lesson L55 candidate APPLIED)
Same defect class as cc-0011 Stage A HALT (`evidence_at` non-existent column) + cc-0011 Stage E Var-D (`late_tolerance_minutes` non-existent column). Mitigation: §6.1.3 pre-flight gate explicitly probes `information_schema.columns` for all 36+ source columns referenced across the 5 views. HALT on first mismatch. Same preventive pattern as cc-0011 v1.2 §4.1.8.

### R7 — `op.v_drift_rollup` cardinality growth (low)
Currently 3 rows in `r.cadence_drift_log`; weekly cron 85 expected to add O(10–50) rows per fire. 30-day window filter caps the view at ~200 rows in steady state — well within UI-friendly bounds. If growth outpaces expectations, the 30-day filter can be narrowed (e.g. 14-day) in v2.

## 11. Close criteria

cc-0012 v1 is **CLOSED** when:

1. Stage A migration `cc_0012_op_platform_reconciliation_view` recorded in `supabase_migrations.schema_migrations`.
2. Schema `op` exists; role `op_reader` exists with rolcanlogin=false.
3. Five views in `op` schema exist, owned by `postgres`, with row counts matching V5 expectations at apply time.
4. All 10 (or 11 with optional V11) V-checks PASS.
5. Anti-write invariance (V9) confirms zero r.* mutations during the build.
6. EXPLAIN ANALYZE budget (V10) met for all 5 views, OR any breach explicitly documented in result artifact as v2 MV-promotion candidate.
7. 4-way sync committed: result artifact + session log + sync_state row + action_list ADDITIONS.
8. cc-0012 brief and migration blob SHAs recorded for future reference.

**If any V-check fails:** stage breaks; PK decides between v1.x patch (rare; column-name fixes), partial-accept variance (e.g. V10 latency carry), or revert. Same decision tree as cc-0011 Stage A v1→v1.2 cycle.

**If Stage A apply HALTs at pre-flight (L55 preventive):** brief v1 patches to v1.1 with corrected column-name shorthand; cycle repeats. Identical pattern to cc-0011 Stage A v1.1→v1.2 (Option C COALESCE substitution).

**Promotion-eligibility at close:**
- L42 5-job potential reification (if v2 adds operator-callable refresh function inheriting vault row).
- L52 — no new CLI deploy; status unchanged from v2.70.
- L53 — no new EF; status unchanged from v2.70.
- L55 candidate — **promoted to baseline** if Stage A pre-flight gate (§6.1.3) catches a defect at brief-time before apply, OR if it cleanly passes (validating that the pattern is non-burdensome).
- L56 candidate — status unchanged (not exercised; PostgREST consumption deferred to UI brief).

## 12. Out-of-scope (carry list for v2 or successor briefs)

- `op.refresh_views()` SECURITY DEFINER wrapper for operator-triggered MV refresh.
- Multi-tenant operator RLS policies.
- PostgREST exposure of `op` schema (with explicit RLS coverage).
- MV promotion for any view that breaches V10 EXPLAIN ANALYZE budget.
- Login role binding for `op_reader` (or a separate login role inheriting `op_reader`).
- Operator UI / dashboard consumption (separate brief; cc-0001 Dashboard Phase 0 or PRV-5 Triage Inbox).
- Surfacing `r.matcher_config` config knobs in `op.*` (currently treated as internal; v2 if operator surface needs visibility into late-tolerance settings per (client, platform)).
- Cross-window comparison surfaces (e.g. `op.v_period_compare` for week-over-week trend) — v2 enhancement.
- Export hooks (CSV / NDJSON for operator offline analysis) — out-of-scope v1; consider for cc-NNNN.

---

*Brief authored 2026-05-13 Sydney by chat (Claude) at v2.70+ pre-CCD-Stage-A-D-01. Mirrors cc-0011 structural template adapted for DDL-only build (no Stage C/D/E). Encodes L42 + L52 + L53 + L55 + L56 carry-forwards per PK directive. cc-0012 v1 is the first operator-facing reconciliation visibility layer; PRV-1 close criterion 7 unblocked at cc-0012 close.*