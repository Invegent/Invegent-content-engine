# Session — 2026-05-13 Sydney — cc-0012 CLOSED-WITH-VERIFIED-VARIANCE (v2.71)

## Outcome

cc-0012 platform-reconciliation-view (PRV) **CLOSED-WITH-VERIFIED-VARIANCE** at v2.71. PRV v1 operator-facing visibility layer delivered as DDL-only (1 schema + 1 role + 5 plain views + GRANT/REVOKE discipline). Reconciliation v1 + PRV v1 family now complete end-to-end (cc-0009 + cc-0010A + cc-0010B + cc-0010C + cc-0011 + cc-0012). cc-0013 (Dashboard Phase 0) UNBLOCKED as the next major item.

## Brief + commit anchors

- **Brief:** `docs/briefs/cc-0012-platform-reconciliation-view.md` v1 (commit `10ba00c7ad2c07d2d33e27552c3632c0ff01b225`; blob `3866b565ffd5fdf27af47add6fbf7bfd79da1889`).
- **Stage A migration:** `cc_0012_op_platform_reconciliation_view` recorded at `supabase_migrations.schema_migrations.version = 20260513094128`.
- **Result file:** `docs/results/cc-0012-platform-reconciliation-view.md`.

## Stage delivery

| Stage | Outcome | Notes |
|---|---|---|
| A — DDL migration apply | APPLIED | `op` schema + `op_reader` role (NOLOGIN) + 5 op.* views + GRANT/REVOKE discipline. No MV / function / EF / cron / HTTP surface. |
| B — Post-apply validation | V1–V10 PASS | Single read-only `execute_sql` block. V5 row-parity counts derived live per CCH R4. V9 anti-write invariance verified via `pg_stat_user_tables` deltas all zero on r.* across apply window. |
| C — 4-way sync close | DONE | Result file + this session log + sync_state v2.71 + action_list v2.71. |

No Stage D (no cron). No Stage E (no runtime EF). DDL-only build.

## L45 truth table at close

- **Var-A1** — `information_schema.columns` primitive in brief §6.1.3 pre-flight excludes matviews under some PG configurations. Did not block Stage A (matview columns separately verified). Future correction: `pg_attribute + pg_class.relkind IN ('r','m','v')`. **Carry only; do not silently resolve.**
- **Var-A2** — Brief §7 V5 narrative said 7 clients; source-derived count is 4 clients across 14 (client, platform) tuples. V5 PASS-with-empirical-observation (numbers derived live per CCH R4 carried). Future minor doc patch to align brief §7 V5 narrative. **Carry only.**
- **Var-A3** — `op.v_freshness_rollup.attention_needed` evaluates to NULL under LEFT JOIN + SQL 3VL when `r.platform_observer_health` is empty (current state pre-PRV-2/3/4). Future correction `COALESCE(observer_is_healthy, true)`. Non-blocking — consumer-side ordering tolerates `NULLS LAST`. **Carry only.**

## Candidate L57 NEW — relkind-aware primitive selection

When a brief authors a column-shape verification probe and the target may be a view/matview, use `pg_attribute + pg_class.relkind IN ('r','m','v')` rather than `information_schema.columns` (which under some PG configurations excludes view/matview columns). Promotion eligibility pending next-cycle pattern repeat. Companion to L55 (Stage B grep checklist column-name verification) and L56 (PostgREST timestamptz vs date assumption).

## Operator surface delivered (v1 first observable use)

PRV v1 makes the reconciliation surface consumable for the first time:
- `op.v_reconciliation_summary` — 1-row KPI panel.
- `op.v_per_client_rollup` — 1 row per client (4 rows at close).
- `op.v_per_platform_rollup` — 1 row per platform.
- `op.v_drift_rollup` — 30-day drift queue (3 rows at close, all observer_stale/info from cc-0011 Stage E v2).
- `op.v_freshness_rollup` — 14 rows (matches `r.mv_observer_freshness_summary` cardinality).

Operator access path at v1: `SET ROLE op_reader` from postgres or service_role. Direct login binding deferred to v2.

## Anti-write invariance

CCH evidence confirmed zero cc-0012-attributable writes to `r.*`, `m.*`, `c.*`. `r.expected_publication` 112 → 112, `r.ice_publication_evidence` 31 → 31, `r.reconciliation_match` 5 → 5, `r.cadence_drift_log` 3 → 3, `r.matcher_config` 1 → 1. No new `r.reconciliation_run` rows attributable to cc-0012 (DDL-only stage).

## Production state at close

- 1 new schema (`op`), 1 new role (`op_reader` NOLOGIN), 5 new views (`op.*`).
- 0 new EFs, 0 new cron jobs, 0 new vault rows, 0 new HTTP surfaces.
- main HEAD = `10ba00c7ad2c07d2d33e27552c3632c0ff01b225` + this 4-way sync close commit.
- `supabase_migrations.schema_migrations`: cc_0012_op_platform_reconciliation_view recorded at version 20260513094128.

## Production mutations this session

- 1 Supabase MCP `apply_migration` (Stage A; the only production write).
- 1 read-only `execute_sql` block (Stage B V1–V10).
- 1 GitHub commit (this 4-way sync close).
- 0 EF deploys.
- 0 cron mutations.
- 0 `m.*` / `c.*` / `k.*` writes.
- 0 vault writes.

## Reconciliation v1 + PRV v1 family — complete

| Brief | Status | Surface delivered |
|---|---|---|
| cc-0009 | CLOSED | `cadence-rule-generator` EF + cron 82 (daily 16:05 UTC); `r.expected_publication` populator |
| cc-0010A | CLOSED | r.* DDL foundation (6 tables + FK + helper + default config + k.* registry) |
| cc-0010B | CLOSED-WITH-VERIFIED-VARIANCE | `ice-evidence-materialiser` EF v2 + cron 83 (every 30 min UTC); `r.ice_publication_evidence` populator |
| cc-0010C | CLOSED-WITH-VERIFIED-VARIANCE | `reconciliation-matcher` EF v1 + cron 84 (15-59/30 UTC); `r.reconciliation_match` + `expected → matched` transitions |
| cc-0011 | CLOSED-WITH-VERIFIED-VARIANCE | `cadence-drift-checker` EF v2 + cron 85 (Sundays 17:30 UTC); `r.cadence_drift_log` + 2 MVs + `r.refresh_cc_0011_views()` |
| **cc-0012** | **CLOSED-WITH-VERIFIED-VARIANCE** | **`op` schema + `op_reader` role + 5 op.* views (PRV operator visibility layer)** |

## Open follow-ups (carries into next sessions)

- **Var-A1** (cc-0012) — `information_schema.columns` matview exclusion → `pg_attribute + pg_class.relkind` correction.
- **Var-A2** (cc-0012) — brief §7 V5 narrative 7-client → 4-client correction.
- **Var-A3** (cc-0012) — `op.v_freshness_rollup.attention_needed` NULL semantics correction.
- **Candidate L57 NEW** — relkind-aware primitive selection promotion eligibility.
- All cc-0010/cc-0011 carry items unchanged (v1.6 cc-0010A doc patch; v1.3 cc-0011 minor doc patch; close-the-loop batches; F-K-SCHEMA + L34 audit).

## Next major

**cc-0013 Dashboard Phase 0** — natural successor; consumes cc-0012 operator views. Scope-definition D-01 to fire next.

---

*Session closed 2026-05-13 Sydney by chat at v2.71 4-way sync. PK directive scope: cc-0012 close-out 4-way sync only. No production mutation beyond the docs-only commit. No Var-A1/A2/A3 silent resolution. No cc-0013 implementation start.*
