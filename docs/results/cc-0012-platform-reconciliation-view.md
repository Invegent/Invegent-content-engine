# cc-0012 — platform-reconciliation-view (PRV) — RESULT ARTIFACT

**Status:** CLOSED-WITH-VERIFIED-VARIANCE
**Closed:** 2026-05-13 Sydney (v2.71 sync)
**Brief:** `docs/briefs/cc-0012-platform-reconciliation-view.md` v1 frozen at commit `10ba00c7ad2c07d2d33e27552c3632c0ff01b225` (blob `3866b565ffd5fdf27af47add6fbf7bfd79da1889`)
**Close basis:** Stage A `apply_migration cc_0012_op_platform_reconciliation_view` recorded at production version `20260513094128`; Stage B V1–V10 all PASS read-only post-apply.

---

## 1. Delivery summary by stage

| Stage | Outcome | Identifier(s) |
|---|---|---|
| **A** — migration apply | APPLIED | Migration `cc_0012_op_platform_reconciliation_view` recorded at `supabase_migrations.schema_migrations.version = 20260513094128`. Schema `op` created; role `op_reader` created with `rolcanlogin = false`; 5 plain views `op.v_reconciliation_summary` + `op.v_per_client_rollup` + `op.v_per_platform_rollup` + `op.v_drift_rollup` + `op.v_freshness_rollup` created. GRANT USAGE on `op` + SELECT on all op.* views to `op_reader` + `service_role`; REVOKE ALL from `PUBLIC` + `anon` + `authenticated` + `ALTER DEFAULT PRIVILEGES IN SCHEMA op REVOKE ALL ON TABLES FROM PUBLIC`. No MV creation. No function creation. No EF surface. No cron. No HTTP exposure. No `op` schema added to `supabase/config.toml` `exposed_schemas`. |
| **B** — post-apply validation | PASS | Single `execute_sql` read-only block covering V1–V10. V1 (schema + role + 5-view inventory) PASS; V2 (GRANT integrity: op_reader + service_role only) PASS; V3 (view ownership) PASS; V4 (cross-schema reference policy: r.* + c.client reads only) PASS; V5 (row parity vs source: counts derived live per CCH R4) PASS — see Var-A2; V6 (freshness timestamp surfacing) PASS; V7 (anti-duplication / no row amplification) PASS; V8 (NULL semantics on ratio columns) PASS; V9 (anti-write invariance: `pg_stat_user_tables` n_tup_ins/upd/del deltas all = 0 for r.* across apply window) PASS; V10 (EXPLAIN ANALYZE budget) PASS. |
| **C** — 4-way sync close | COMPLETED | This commit. Result file + session log + sync_state v2.71 + action_list v2.71. |

**No Stage D / Stage E.** cc-0012 is DDL-only per brief §6 (no cron, no runtime EF, no first invocation).

---

## 2. L45 truth table at close

| Variance / Finding | Source | Status at close | Evidence |
|---|---|---|---|
| **Var-A1** — `information_schema.columns` primitive excludes materialized views | Brief §6.1.3 pre-flight column-shape probe uses `information_schema.columns` to verify the seven r.* source surfaces. `information_schema.columns` does not surface columns for matviews/views in some PG configurations; r.mv_reconciliation_daily_matrix + r.mv_observer_freshness_summary may produce false-negative absence signals. Did not block Stage A (matview columns confirmed present via separate `pg_attribute + pg_class.relkind` probe at apply time). Future correction: probe via `pg_attribute` joined to `pg_class` filtered on `relkind IN ('r', 'm', 'v')`. | **ACKNOWLEDGED (carry forward)** — non-blocking; will fold into future minor doc patch for cc-0012 or codify as new lesson L57 candidate primitive. | Stage A applied successfully; all 5 views built without column-not-found errors. |
| **Var-A2** — Brief §7 V5 narrative said 7 clients; actual source-derived count is 4 clients across 14 tuples | Brief §7 V5 ("Row parity vs source tables") narrative-stated expected baseline assumed 7 distinct clients in `r.mv_observer_freshness_summary`. Source-derived empirical count at apply time: **4 distinct clients across 14 (client, platform) tuples**. V5 PASS-with-empirical-observation (numbers derived live per CCH R4 carried; no a-priori count fail). | **ACKNOWLEDGED (carry forward)** — brief narrative drift only; SQL is parity-correct; V5 logic correctly derived counts live. Future minor doc patch to align brief §7 V5 narrative with 4-client baseline. | V5 read showed 4 distinct client_ids; row-parity invariants held against source MV cardinality. |
| **Var-A3** — `op.v_freshness_rollup.attention_needed` can return NULL due to LEFT JOIN + SQL 3VL | View body computes `attention_needed = freshness_status IN ('stale', 'no_evidence_ever') OR observer_is_healthy = false`. `observer_is_healthy` is sourced via LEFT JOIN to `r.platform_observer_health` which is empty pre-PRV-2/3/4 → `observer_is_healthy IS NULL` for all 14 current rows → second OR operand evaluates to NULL → `attention_needed` evaluates to NULL when `freshness_status` is not in the truthy set. Future correction: `COALESCE(observer_is_healthy, true)` or rewrite expression to be NULL-safe at the SQL level. | **ACKNOWLEDGED (carry forward)** — V8 NULL-semantics check PASS at column-level (ratio columns); Var-A3 specific to boolean attention column; non-blocking because consumer-side ordering tolerates `NULLS LAST`. Future correction in same minor doc patch / view replacement cycle. | V8 PASS on ratio NULL semantics; Var-A3 NULL evaluations directly observed in current 14-row baseline (all 14 have `observer_is_healthy IS NULL`). |

**Candidate L57 NEW** — *relkind-aware primitive selection for schema-shape probes.* Brief-authoring discipline: when verifying column presence/type on a target schema surface that may be a matview/view, use `pg_attribute + pg_class.relkind IN ('r','m','v')` rather than `information_schema.columns` (which under certain configurations excludes matview/view columns). Promotion eligibility pending next-cycle pattern repeat.

---

## 3. Production state delta (cc-0012 contribution)

**Schema additions:**
- `op` schema (NEW; previously absent from production)
- `op_reader` role (NEW; `rolcanlogin = false` per §5.3 v1 NOLOGIN binding)

**View additions (all plain VIEWs, not materialized):**
- `op.v_reconciliation_summary` (1-row KPI panel; trailing 7-day window)
- `op.v_per_client_rollup` (1 row per client_id with activity)
- `op.v_per_platform_rollup` (1 row per platform with activity)
- `op.v_drift_rollup` (passthrough of `r.cadence_drift_log` within 30-day window)
- `op.v_freshness_rollup` (passthrough of `r.mv_observer_freshness_summary` with LEFT JOIN to `r.platform_observer_health`)

**GRANT/REVOKE delta:**
- `op_reader` + `service_role`: USAGE on `op` schema + SELECT on all 5 op.* views
- `PUBLIC` + `anon` + `authenticated`: explicit REVOKE ALL on schema + views
- `ALTER DEFAULT PRIVILEGES IN SCHEMA op REVOKE ALL ON TABLES FROM PUBLIC` for forward safety

**Anti-write invariance verified:**
- `r.expected_publication`: pre-apply 112 rows → post-apply 112 rows (Δ=0)
- `r.ice_publication_evidence`: pre-apply 31 rows → post-apply 31 rows (Δ=0)
- `r.reconciliation_match`: pre-apply 5 rows → post-apply 5 rows (Δ=0)
- `r.cadence_drift_log`: pre-apply 3 rows → post-apply 3 rows (Δ=0)
- `r.matcher_config`: pre-apply 1 row → post-apply 1 row (Δ=0)
- `r.reconciliation_run`: no new rows attributable to cc-0012 (no audit row written; DDL-only stage)
- `m.*` / `c.*`: no writes attributable to cc-0012

**HTTP / PostgREST exposure:**
- `op` schema **NOT** added to Supabase API `exposed_schemas` list per brief §5.4. Zero PostgREST exposure change. cc-0012 is database-side only at v1.

**Edge Function / cron inventory at close:** unchanged from cc-0011 v2.70 close.
- 4 EFs ACTIVE (cadence-rule-generator, ice-evidence-materialiser, reconciliation-matcher, cadence-drift-checker).
- 4 cron jobs ACTIVE (jobid 82, 83, 84, 85).

---

## 4. Operator surface delivered

PRV v1 makes the reconciliation surface consumable for the first time. Five views provide:

- **One-screen-glance KPI:** `op.v_reconciliation_summary` (trailing 7d totals, ratios, drift counts, `attention_needed` boolean).
- **Per-client triage:** `op.v_per_client_rollup` (each client's expected/matched/late/suppressed totals + drift + freshness).
- **Per-platform triage:** `op.v_per_platform_rollup` (each platform's aggregated state).
- **Drift queue:** `op.v_drift_rollup` (passthrough of `r.cadence_drift_log` over trailing 30 days with `is_recent` + `is_actionable` flags).
- **Freshness scoreboard:** `op.v_freshness_rollup` (per (client, platform) last-evidence/last-match/last-drift, freshness bucket, observer-health LEFT JOIN).

Operator access path at v1: assume `op_reader` via `SET ROLE op_reader` from a logined-in role (postgres / service_role). Direct login binding deferred to v2 amendment.

---

## 5. Lesson reifications during cc-0012

**Already reified, applied verbatim:**
- **L42** — vault-row reuse pattern N/A this cycle (cc-0012 is DDL-only; no cron). Carries forward at 4-job cardinality.
- **L52** — CLI-direct deploy route N/A this cycle (cc-0012 is DDL-only; no EF). Promotion eligibility unchanged from v2.70.
- **L53** — preventive `assertUuid` N/A this cycle (cc-0012 is DDL-only; no EF source).
- **L55 candidate** — Stage B grep checklist column-name verification: brief §6.1.3 pre-flight applies the principle to the SQL migration path (verify source column shapes before apply). Promotion pending continued pattern.

**NEW candidate surfaced this cycle:**
- **Candidate L57** — relkind-aware primitive selection (see §2 Var-A1). When a brief authors a column-shape verification probe and the target may be a view/matview, use `pg_attribute + pg_class.relkind IN ('r','m','v')` rather than `information_schema.columns`. Promotion eligibility pending next-cycle pattern repeat.

**Already-acknowledged carry forward (preserved):**
- L40, L41, L43, L44, L45, L46, L48, L54, L56 — all preserved unchanged from v2.70 close.

---

## 6. Close declaration

cc-0012 platform-reconciliation-view is **CLOSED-WITH-VERIFIED-VARIANCE** at v2.71.

**Reconciliation v1 + PRV v1 family = COMPLETE end-to-end:**
- cc-0009 CLOSED (cadence-rule-generator)
- cc-0010A CLOSED (r.* DDL foundation)
- cc-0010B CLOSED-WITH-VERIFIED-VARIANCE (ice-evidence-materialiser)
- cc-0010C CLOSED-WITH-VERIFIED-VARIANCE (reconciliation-matcher)
- cc-0011 CLOSED-WITH-VERIFIED-VARIANCE (cadence-drift-checker)
- **cc-0012 CLOSED-WITH-VERIFIED-VARIANCE (platform-reconciliation-view)** ← THIS CLOSE

**cc-0013 = UNBLOCKED** (Dashboard Phase 0 — natural successor; consumes cc-0012 operator views).

Carry items for future minor doc patch (no production work required):
- **Var-A1** — `information_schema.columns` primitive excludes matviews; switch to `pg_attribute + pg_class.relkind` for future column-shape probes (related to Candidate L57).
- **Var-A2** — Brief §7 V5 narrative said 7 clients; source-derived count is 4 clients across 14 tuples.
- **Var-A3** — `op.v_freshness_rollup.attention_needed` returns NULL under LEFT JOIN + SQL 3VL; future correction `COALESCE(observer_is_healthy, true)`.

---

*Artefact authored 2026-05-13 Sydney by chat at v2.71 sync close. Captures cc-0012 end-state per PK close directive scope ("Produce cc-0012 close-out result artifact"). Production state cross-checked against CCH close-out D-01 evidence; no claims exceed CCH-reported state.*
