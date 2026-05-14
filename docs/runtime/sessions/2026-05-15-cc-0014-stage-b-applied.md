# Session — 2026-05-15 Sydney — cc-0014 STAGE B APPLIED (v2.73)

**Slug:** `cc-0014-stage-b-applied`

**Outcome:** **STAGE B APPLIED.** Reconciliation emitter trigger live on `r.cadence_drift_log`. Function `friction.fn_emit_reconciliation_event()` deployed as SECURITY DEFINER. All 5 V-checks PASS. Zero residual test rows. **0 D-01 fires this session per brief §13** (Stage B execution did not diverge from v1.1 brief). 14-day experiment window still NOT started — begins at end of Stage E.

---

## Migration applied

`cc_0014_b_reconciliation_emitter` — applied via `apply_migration` MCP on 2026-05-15.

## Function deployed

`friction.fn_emit_reconciliation_event()`:
- `LANGUAGE plpgsql`
- `SECURITY DEFINER`
- `SET search_path = friction, r, c, public`
- Owner: `postgres`
- `REVOKE EXECUTE FROM PUBLIC` + `GRANT EXECUTE TO postgres`
- Translates `r.cadence_drift_log` row → `friction.event` row with `category='client_commitment'`, `category_source='emitter_default'`, `reported_by='system'`
- Severity mapping: COALESCE(drift_severity, 'info') with validation fallback to 'info' if not in {info, warn, critical}
- Client name lookup: `c.client.client_name` via `client_id`, with `unknown_client` fallback
- Dedupe fingerprint: md5 of (`'reconciliation' | problem_key | client_id::text | platform | 'client_commitment'`) — no day component, recurrence handled via 7-day case lookup downstream
- **Defensive exception handler**: any INSERT failure into `friction.event` logs to `friction.emit_error` with SQLERRM + SQLSTATE + `row_to_json(NEW)::jsonb` + `emitter_version='cc-0014-v1.0'`. Source workflow (the `r.cadence_drift_log` INSERT itself) is **never** affected.

## Trigger deployed

`friction_emit_reconciliation`:
- `AFTER INSERT ON r.cadence_drift_log`
- `FOR EACH ROW`
- `EXECUTE FUNCTION friction.fn_emit_reconciliation_event()`

## `r.cadence_drift_log` trigger state after Stage B

2 triggers, orthogonal:

| Trigger | Timing | Event | Origin |
|---|---|---|---|
| `set_updated_at` | BEFORE | UPDATE | cc-0010A (pre-existing) |
| `friction_emit_reconciliation` | AFTER | INSERT | this session |

## Pre-flight verification (L44 + L53 + L55 discipline)

5 pre-flight probes, all green before apply:

1. **`r.cadence_drift_log` column shape** — 16 cols match brief §7 spec exactly. `client_id` uuid NOT NULL ✓; `drift_type`/`drift_severity` text NOT NULL ✓; `created_at` timestamptz with default `now()` ✓; `observed_count`/`expected_count` integer NULLable (function's `COALESCE→'n/a'` handles).
2. **Existing triggers on `r.cadence_drift_log`** — only `set_updated_at` BEFORE UPDATE (orthogonal event + timing); no `friction_emit_reconciliation` already exists. Safe to add.
3. **`friction.event` + `friction.emit_error` column shape** — match Stage A spec; all NOT NULL columns are populated by the Stage B function's INSERTs (no missing column in fixture).
4. **`friction.category` 'client_commitment'** — present, `is_active=true`, `counts_for_success=true`.
5. **`c.client` lookup columns** — `client_id` uuid NOT NULL + `client_name` text NOT NULL. Empirical row-value check: NDIS-Yarns stored as `"NDIS-Yarns"` (hyphenated, not space-separated) — brief V-B1's `WHERE client_name = 'NDIS-Yarns'` is correct.

**L33 pre-flight** — 8 event triggers active database-wide. None destructive on `CREATE FUNCTION` + `CREATE TRIGGER`. `trg_k_registry_sync_on_create_table` is no-op (no CREATE TABLE in Stage B). `trg_k_refresh_catalog` fires on `ddl_command_end` but is benign for this DDL class.

## V-checks — 5/5 PASS

| V-check | Scope | Result |
|---|---|---|
| V-B1 | Trigger fires on `r.cadence_drift_log` INSERT → 1 `friction.event` row materialised | PASS |
| V-B2 | Translation fields correct (problem_key=`observer_stale`, category=`client_commitment`, reported_by=`system`, category_source=`emitter_default`, severity=`info`, observation_text formatted, related_object built, dedupe_fingerprint deterministic md5, observed_at = `NEW.created_at`) | PASS |
| V-B3 | Defensive handler: temp CHECK rejects friction.event INSERT → source row exists in r.cadence_drift_log + event row blocked in friction.event + emit_error logged with SQLSTATE 23514 + emitter_version `cc-0014-v1.0` + SQLERRM captured | PASS |
| V-B4 | `anon` INSERT to `r.cadence_drift_log` denied at GRANT layer with SQLSTATE 42501 (trigger never reached) | PASS |
| V-B5 | Zero residual test rows across `friction.event` + `friction.emit_error` + `r.cadence_drift_log` | PASS |

## Brief defects caught pre-execution (3 independent V-B1 defects)

All 3 defects discoverable at brief-authoring time. None discovered at execution-time failure — caught at pre-flight before V-B1 was attempted.

| # | Defect in brief V-B1 | Discovery mechanism | Variance applied |
|---|---|---|---|
| 1 | UUID literal `cc0014test01` contains non-hex chars `t`, `s` — PostgreSQL UUID parser rejects | Manual hex-validity inspection of UUID literal (same class as v2.72 V-A10 `cc0014va10` and V-A11 `cc00014va11a`) | Substituted `00cc0014b001` (12 hex chars, valid segment length) |
| 2 | `drift_check_run_id` + `created_by_run_id` both FK to `r.reconciliation_run(reconciliation_run_id)`; fabricated UUIDs would violate FK | FK pre-flight via `information_schema.referential_constraints` revealed 4 FKs (3 ...run_id columns + expected_publication_id) | Used real succeeded run_id `8b4453b0-06c5-463b-ad5d-77d9b3faf0f4` for all FK fields |
| 3 | `updated_by_run_id` NOT NULL with no default — omitted from brief V-B1 INSERT column list | Column-default pre-flight via `information_schema.columns` revealed NOT NULL + no default + not in INSERT cols | Supplied same `8b4453b0-...` run_id |

## Lessons reified / candidates strengthened

- **L53 (FK source-column-type asymmetry at brief authoring)** — reactive catch at Stage B pre-flight. 3 FK source columns enumerated via `information_schema.referential_constraints`; brief's fabricated UUIDs would have violated all 3. Promotion eligibility strengthened: cc-0010B reactive + cc-0010C preventive + cc-0011 preventive + cc-0014 Stage B reactive = **4 cycles**.
- **L55 (column-name verification at brief authoring)** — extends naturally to **column-value validity in fabricated test fixtures**. Stage B V-B1 caught UUID hex error (recurrence of v2.72 V-A10 defect) AND missing NOT NULL column. Promotion eligibility strengthened: cc-0011 reified + cc-0014 Stage A reactive + cc-0014 Stage B reactive = **3 cycles**.
- **L60 NEW candidate v2.73** — Fabricated test-fixture validity must be checked at brief-authoring time across three independent properties:
  - **(a) UUID hex-validity** — every fabricated UUID literal in a V-check INSERT contains only `0-9a-f` digits with correct segment lengths (8-4-4-4-12)
  - **(b) FK target row existence** — every FK column in a fabricated INSERT references a row that either (i) is seeded earlier in the same migration, or (ii) is queried from production state at V-check execution time
  - **(c) NOT NULL completeness** — every NOT NULL column without a default appears in the INSERT column list

  L60 composes with but does not subsume L53 (FK source-column-type) or L55 (column-name verification). It is the test-fixture-author counterpart. Empirically recurred **6 times** across cc-0014: V-A10 (a), V-A11 (a), V-B1 ×3 defects covering all of (a)/(b)/(c). Promotion pending one more independent brief that exhibits any of (a)/(b)/(c).
- **L62**: not applicable this session (no D-01 fired per brief §13 governance gate).
- **L58**: not exercised on Supabase mutations this session (0 EF deploys). Applied to docs sync at v2.73 close via Path C (CC/local git workflow) per PK directive.

## Production state at close of Stage B

- `friction.fn_emit_reconciliation_event()` live; owner `postgres`; restrictive grants
- `friction_emit_reconciliation` trigger live on `r.cadence_drift_log` AFTER INSERT
- `friction.event` empty (V-B5 cleaned all test rows)
- `friction.emit_error` empty (V-B5 cleaned all test rows)
- `friction.experiment_run` empty (`status='running'` row not yet created)
- **Next natural production fire**: cron 85 `cadence_drift_checker_weekly` Sun 18 May 2026 17:30 UTC. Any drift events produced will materialise as `friction.event` rows with `source='reconciliation'`. These rows accumulate BUT do not contaminate Day-19 verdict because §11 scoring queries window on `experiment_run.starts_at..ends_at` — pre-Stage-E rows fall outside the window.
- The DELETE-protection trigger from Stage A v1.1 patch is **dormant** (no `experiment_run.status='running'` row exists). It activates only when Stage E creates the run row.

## Governance state

- D-01 fires this session: **0** (per brief §13 — Stage B execution does not diverge from v1.1 brief)
- T-MCP-02 cumulative: **66** (unchanged from v2.72)
- State-capture exceptions: **1 cumulative** (unchanged from v2.72 baseline; v1.1 override only)
- L46 baseline shape: not exercised this session (no D-01 fired); v2.72 left at 0 clean pass-through — unchanged

## Production mutations this session

- 1 `apply_migration` (`cc_0014_b_reconciliation_emitter`) — DDL only: CREATE FUNCTION + CREATE TRIGGER + REVOKE/GRANT
- 5 `execute_sql` calls for V-checks (V-B1 INSERT + V-B2 SELECT + V-B3 ADD CHECK + V-B3 INSERT + V-B3 verify + V-B3 DROP CHECK + V-B4 anon block + V-B5 cleanup) — all test data, all cleaned
- 0 EF deploys
- 0 cron mutations
- 0 vault writes
- 0 D-01 fires
- 0 GitHub commits (this session) — single v2.73 4-file sync commit per directive at session close

## Open follow-ups → Stage C onward

- **Stage C** (rank 1 v2.73, **HARD-STOP if fails**) — Cowork brief `nightly-health-check-v1` v2.1 → v3.0 (add stable `finding_id` per priority finding, dual-write via `friction.fn_emit_health_check_findings`) + Supabase migration `cc_0014_c_health_check_emitter` + pg_cron `friction-verification-daily` at `15 1 * * *` UTC
- **Stage D** (rank 2 v2.73) — Manual capture FAB in invegent-dashboard + backend `friction.fn_emit_manual_event` migration `cc_0014_d_manual_emit_function`
- **Stage E** (rank 3 v2.73) — `/operations` read surface + `friction.fn_recent_cases` + `friction.fn_triage_case` + pre-experiment cleanup + `experiment_run` INSERT (this is when the 14-day window starts)
- **Brief v1.2 doc patch** (rank 4 v2.73, P3 carry) — combine 3 V-A10/V-A11 UUID defects (v2.72) + 3 V-B1 defects (this session) + L60 framing into a single doc patch. Authored when PK directs.

---

*Session file written 2026-05-15 as part of v2.73 sync catch-up commit (Path C / CC local git per L58 compliance). Stage B applied + verified. Next directive determines Stage C path.*
