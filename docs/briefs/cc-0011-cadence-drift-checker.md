# cc-0011 — cadence-drift-checker

**Status:** v1.1 (v1 authored 2026-05-13 Sydney; v1.1 docs-only patch 2026-05-13 Sydney per PK directive after D-01 accept; awaiting re-fired D-01).
**Parent:** cc-0010 (Phase D — Reconciliation surface).
**Depends on:** cc-0010A v1.5 (r.* schema foundation), cc-0010B v2 (`ice-evidence-materialiser` populating `r.ice_publication_evidence`), cc-0010C v1 (`reconciliation-matcher` populating `r.reconciliation_match` + transitioning `r.expected_publication.expected_status` to `matched`).
**Blocks:** PRV-1 close declaration (criterion 5: cadence-drift-checker weekly; criterion 6: dashboard daily matrix view backed by `r.mv_reconciliation_daily_matrix`).
**Unblocks at close:** `r.mv_reconciliation_daily_matrix` + `r.mv_observer_freshness_summary` are queryable surfaces for Platform Reconciliation View brief authoring; PRV-1 close criteria 5–6 satisfied.

## 1. Identity

### 1.1 Name + slug
- **Project slug:** `cc-0011`
- **EF slug:** `cadence-drift-checker`
- **Cron jobname:** `cadence_drift_checker_weekly`
- **Migration name:** `cc_0011_r_cadence_drift_log_and_views_foundation` (Stage A); `cc_0011_pg_cron_cadence_drift_checker` (Stage D).
- **Expected cron jobid:** 85 (next after cron 84 from cc-0010C).
- **Expected EF UUID:** assigned at Stage C deploy time.

### 1.2 In scope
- Weekly drift-detection sweep over `r.expected_publication` × `r.ice_publication_evidence` × `r.reconciliation_match`.
- Drift findings written to **new** `r.cadence_drift_log` table.
- Two **new** materialised views: `r.mv_reconciliation_daily_matrix` + `r.mv_observer_freshness_summary`; both refreshed CONCURRENTLY at end of each EF run.
- **Deferred from cc-0010C §13 #3:** `r.expected_publication.expected_status` transition `expected → late` when the row is past its tolerance window with either no evidence or evidence beyond tolerance. Folded into this EF's weekly sweep.
- Run audit row written to existing `r.reconciliation_run` table with `run_type='cadence_drift_check'` (NEW value; Stage A migration extends the constraint).
- Vault-backed CRON_SECRET sourcing per L42 (reuse existing vault row `0fede5c3-f92c-4bd6-8837-c0e304dfca4c` named `CRON_SECRET`).
- Stage E acceptance via L43 cron-fire-equivalent variance pathway permitted at PK direction (same precedent as cc-0010B v2.68 + cc-0010C v2.69).

### 1.3 Out of scope (carry / next briefs)
- Per-client / per-(client, platform) `r.matcher_config` overrides — still cc-NNNN territory; cc-0011 uses cc-0010A global default for `late_tolerance_minutes` only.
- Tier 2–5 reconciliation (per-platform observer evidence). cc-0011 reads `r.ice_publication_evidence` for the `late` and `missing` classifications but does NOT consume `r.platform_observation` / `r.platform_manual_observation` (those tables remain empty until PRV-2/3/4).
- Drift severity alerting / notification (Slack, email). Severity is computed and persisted in `r.cadence_drift_log.drift_severity`; downstream alerting is PRV-5 Triage Inbox territory.
- Real-time per-fire late-transition. v1 transitions late-status only at weekly cadence — a row may sit at `expected_status='expected'` for up to 7 days after its tolerance window before transitioning. Out-of-band higher-frequency late transition is a v2 amendment candidate.
- Backfill / historical re-classification of `r.expected_publication` rows prior to v2.69 close. v1 operates strictly on a forward horizon (today + N days back where N is the drift observation window, default 14 days).
- Cadence-rule consistency drift (e.g. detecting that a `c.cadence_rule` was changed mid-week and the historical `r.expected_publication` rows are now misaligned). v1 classifies row-level outcomes, not rule-level drift; rule-level drift is cc-NNNN future work.

### 1.4 Stage gates
| Stage | Action | D-01 fire | Expected outcome |
|---|---|---|---|
| A | Schema migration: NEW `r.cadence_drift_log` + 2 MV + ALTER `r.reconciliation_run` CHECK to include `'cadence_drift_check'` | 1 D-01 (`sql_destructive`) | Migration `cc_0011_r_cadence_drift_log_and_views_foundation` applied; FK targets resolvable; views populated (initial materialisation reads 0 rows over future-only horizon) |
| B | EF source authoring on `feat/cc-0011-cadence-drift-checker` branch; FF-merge to main per CCH R11 | 1 D-01 (`plan_review` covering both authoring + merge) | EF source `supabase/functions/cadence-drift-checker/` (index.ts + lib/drift.ts + lib/db.ts + deno.json) + `supabase/config.toml` entry on main |
| C | CLI deploy per L52 (`supabase functions deploy cadence-drift-checker --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns`) | 1 D-01 (`ef_deploy`) | EF version 1 ACTIVE; verify_jwt=false; unauth POST probe → 401 |
| D | `apply_migration cc_0011_pg_cron_cadence_drift_checker` | 1 D-01 (`sql_destructive`) | Cron jobid 85 `cadence_drift_checker_weekly` ACTIVE at `30 17 * * 0` UTC (Sundays 17:30 UTC = Mondays 03:30 Sydney AEST); vault-backed |
| E | Manual `triggered_by='cc-0011-stage-e-first'` invocation via `execute_sql net.http_post` (preferred) OR first natural cron 85 fire (L43 acceptable per PK direction) | 1 D-01 (`sql_destructive` if manual; none if cron-fire-equivalent acceptance per directive) | `r.reconciliation_run.status='succeeded'`; drift_log rows populated; MV refresh confirmed; `r.expected_publication.expected_status` transitions verified |
## 2. Data dependencies

### 2.1 Reads (no writes by cc-0011 to these surfaces)
- **`r.expected_publication`** — full row read, columns of interest: `expected_publication_id`, `client_id`, `platform`, `expected_local_date`, `expected_window_start`, `expected_window_end`, `expected_status`, `matched_match_id`, `matched_at`, `created_at`.
- **`r.ice_publication_evidence`** — full row read, columns of interest: `ice_publication_evidence_id`, `expected_publication_id` (FK), `pipeline_state`, `published_at`, `evidence_at`, `created_at`.
- **`r.reconciliation_match`** — full row read, columns of interest: `reconciliation_match_id`, `expected_publication_id`, `matched_evidence_id`, `matched_match_tier`, `matched_match_kind`, `matched_confidence`, `delta_minutes_late`, `override_by`, `created_at`.
- **`r.matcher_config`** — reads global default row only (`client_id IS NULL AND platform IS NULL`) for `late_tolerance_minutes`; same lookup pattern as cc-0010C `resolveLateTolerance` reduced to global default.
- **`c.client`** — joined for client_slug labelling in drift_log + views (read-only).
- **`c.cadence_rule`** — joined for cadence count expectations in `mv_reconciliation_daily_matrix` (read-only; per parent cc-0009 outputs).

### 2.2 Writes (cc-0011 owns these surfaces)
- **`r.cadence_drift_log`** (NEW; Stage A migration) — one row per drift finding per (client, platform, observation window). Multiple findings per run possible.
- **`r.expected_publication.expected_status`** — UPDATE `expected → late` on rows past tolerance with no/late evidence; no UPDATE on rows already in terminal states (matched/missed/suppressed/cancelled). Sole writer outside cc-0009 + cc-0010C.
- **`r.reconciliation_run`** — one audit row per EF run; `run_type='cadence_drift_check'`.

### 2.3 Materialised views (cc-0011 owns; created in Stage A; refreshed in Stage E onwards)
- **`r.mv_reconciliation_daily_matrix`** — one row per (client_id, platform, expected_local_date) over the past 30 days (refresh window configurable; see §5.1.3).
- **`r.mv_observer_freshness_summary`** — one row per (client_id, platform); summarises last-evidence, last-match, last-drift-log entries.

### 2.4 Schema-side dependencies satisfied at v2.69 close
- cc-0010A v1.5 schema present (verified at cc-0010C Stage D pre-flight): `r.reconciliation_run`, `r.expected_publication`, `r.ice_publication_evidence`, `r.reconciliation_match`, `r.matcher_config` all extant.
- cc-0010A `r.compact_raw_json` function present (not consumed by cc-0011; flagged for completeness).
- cc-0010A `r.set_updated_at` trigger function present; will be bound to `r.cadence_drift_log` in Stage A migration.

### 2.5 Data-side dependencies satisfied at v2.69 close
- `r.ice_publication_evidence` populated (≥31 rows at close; growing every 30 min via cron 83). Empty-on-day-1 is acceptable for cc-0011 first fire — drift_log will show many `missing` findings, which is correct empirical drift signalling.
- `r.reconciliation_match` populated (≥5 rows at close; growing every 30 min via cron 84). Same empty-on-day-1 acceptability.
- `r.expected_publication` populated (≥112 rows at close; cron 82 adding 1/day). Distribution at close: `{matched:5, expected:91, suppressed:16}`.

## 3. Functional requirements

### 3.1 Drift classifications (drift_type)
Per row in `r.expected_publication` within observation window, cc-0011 classifies into one of:

| drift_type | Trigger condition | drift_severity (default) | Companion action |
|---|---|---|---|
| `late` | `expected_status='expected'` AND `expected_window_end + (late_tolerance_minutes minutes) < now()` AND (no evidence row OR all evidence rows have `published_at > expected_window_end + late_tolerance_minutes`) | `warn` | UPDATE `r.expected_publication.expected_status='late'` |
| `missing` | `expected_status='expected'` AND `expected_window_end + (24 hours) < now()` AND zero rows in `r.ice_publication_evidence` for this `expected_publication_id` | `critical` | UPDATE `r.expected_publication.expected_status='late'` (the `missing` finding is the drift signal; the row status reflects "past tolerance" — `missed` would require manual confirmation) |
| `cadence_anomaly` | Per (client, platform) over `mv_reconciliation_daily_matrix` past 7 days: matched_count < (cadence_rule_expected_count - 1) OR matched_count > (cadence_rule_expected_count + 1) | `info` (1-unit dev) / `warn` (2-3 unit) / `critical` (>3 unit) | None (informational; surfaced to PRV-5 Triage Inbox future) |
| `observer_stale` | Per (client, platform) `mv_observer_freshness_summary.last_evidence_at < now() - 48 hours` | `warn` | None (informational; downstream alerting territory) |

Note: `drift_type='late'` and `drift_type='missing'` may both fire for the same `r.expected_publication` row in different observation windows (e.g. a row becomes `late` at week 1 and becomes `missing` at week 2 if no evidence ever materialises). Each finding gets its own row in `r.cadence_drift_log`; the `r.expected_publication.expected_status` reflects only the latest transition.

### 3.2 Late-status transition rule (deferred from cc-0010C §13 #3)
For each `r.expected_publication` row matching the `late` or `missing` trigger conditions in §3.1:
1. UPDATE `r.expected_publication SET expected_status='late', matched_match_id=NULL, matched_at=NULL WHERE expected_publication_id=$1 AND expected_status='expected'` — atomic per-row UPDATE with status pre-filter to avoid overwriting a concurrent matcher write.
2. INSERT drift_log row capturing the transition.
3. Tally in `summary_json.late_transitions` counter.

**Race tolerance:** cc-0010C cron 84 fires at `:15`/`:45` UTC; cc-0011 cron 85 fires weekly at `30 17 * * 0` UTC. The week-long offset means cc-0010C will have run ~336 times between cc-0011 fires; any matching that was possible has already happened. Race window narrowed to "cron 84 fire that begins between cc-0011 SELECT and cc-0011 UPDATE" — the `WHERE expected_status='expected'` pre-filter prevents stomping. Empirical observation at Stage E will confirm.

### 3.3 Materialised view refresh ordering
End of each EF run, in this order:
1. INSERT drift_log rows (writes complete).
2. UPDATE late-transitions (writes complete).
3. `REFRESH MATERIALIZED VIEW CONCURRENTLY r.mv_reconciliation_daily_matrix;` (reads frozen-at-statement-start snapshot of `r.expected_publication` + `r.reconciliation_match`).
4. `REFRESH MATERIALIZED VIEW CONCURRENTLY r.mv_observer_freshness_summary;` (reads frozen-at-statement-start snapshot of `r.ice_publication_evidence` + `r.reconciliation_match` + `r.cadence_drift_log`).
5. Close `r.reconciliation_run` row with status=`succeeded` + `summary_json` populated.

CONCURRENTLY required: matrices may be queried by the dashboard during refresh; non-concurrent refresh takes an `AccessExclusiveLock` blocking reads. CONCURRENTLY requires a UNIQUE index on each MV, specified in §5.1.2 and §5.1.3.
## 4. Pre-flight gates

Each Stage has a single consolidated `execute_sql` read that asserts the gate set below. Pattern matches cc-0010C Stage D (single consolidated read per Stage rather than serial round-trips). All gates evaluated on production project `mbkmaxqhsohbtwsqolns`.

### 4.1 Stage A gates (run before `apply_migration`)
| Gate | Assertion | Read |
|---|---|---|
| 4.1.1 | cc-0010A v1.5 r.* schema present | `SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name IN ('reconciliation_run','expected_publication','ice_publication_evidence','reconciliation_match','matcher_config')) AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='r')>=6` |
| 4.1.2 | cc-0010C output is non-empty (sanity — drift checker meaningful only if matcher has produced anything) | `(SELECT COUNT(*) FROM r.reconciliation_match)>=1` *(acceptable if 0 at first fire, but flagged for variance — see §10.1)* |
| 4.1.3 | `r.cadence_drift_log` does not exist yet | `NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='cadence_drift_log')` |
| 4.1.4 | `r.mv_reconciliation_daily_matrix` does not exist yet | `NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='mv_reconciliation_daily_matrix') AND NOT EXISTS(SELECT 1 FROM pg_matviews WHERE schemaname='r' AND matviewname='mv_reconciliation_daily_matrix')` |
| 4.1.5 | `r.mv_observer_freshness_summary` does not exist yet | parallel to 4.1.4 |
| 4.1.6 | `r.reconciliation_run.run_type` constraint inspection | `SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='r' AND t.relname='reconciliation_run' AND c.contype='c'` — Stage A migration must inspect this and select one of Case A / Case B / Case C per §5.1.4. **HALT rule (v1.1):** if pre-flight shows `cadence_drift_check` already present in the live constraint AND the proposed Stage A migration body still attempts an ALTER on the constraint, HALT and route to PK before applying. The no-op Case C path is the only valid action when the value is already present. |
| 4.1.7 | Migration name uniqueness | `(SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE name='cc_0011_r_cadence_drift_log_and_views_foundation')=0` |

### 4.2 Stage B gates (run before merge)
| Gate | Assertion |
|---|---|
| 4.2.1 | Stage A migration is applied | parallel to 4.1.7 inverted: `=1` |
| 4.2.2 | `r.cadence_drift_log` exists with correct shape | column inventory matches §5.1.1 spec |
| 4.2.3 | Two MVs exist + UNIQUE index present per CONCURRENT-refresh requirement | `(SELECT COUNT(*) FROM pg_matviews WHERE schemaname='r' AND matviewname IN ('mv_reconciliation_daily_matrix','mv_observer_freshness_summary'))=2 AND (SELECT COUNT(*) FROM pg_indexes WHERE schemaname='r' AND indexname IN ('uq_mv_reconciliation_daily_matrix','uq_mv_observer_freshness_summary'))=2` |
| 4.2.4 | EF source pre-merge grep checklist (see §7) PASS |

### 4.3 Stage C gates (run before CLI deploy)
| Gate | Assertion |
|---|---|
| 4.3.1 | Local `HEAD` == `origin/main` == post-Stage-B merge SHA |
| 4.3.2 | Working tree clean for `supabase/functions/cadence-drift-checker/` + `supabase/config.toml` |
| 4.3.3 | `[functions.cadence-drift-checker] verify_jwt = false` present in `supabase/config.toml` |
| 4.3.4 | Supabase CLI present + authenticated for the project |

### 4.4 Stage D gates (run before `apply_migration cc_0011_pg_cron_cadence_drift_checker`)
| Gate | Assertion |
|---|---|
| 4.4.1 | EF `cadence-drift-checker` v1 ACTIVE on production (`supabase functions list` shows the row) |
| 4.4.2 | `verify_jwt=false` declared (config.toml + CLI flag both already applied at Stage C) |
| 4.4.3 | Migration name uniqueness: `(SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE name='cc_0011_pg_cron_cadence_drift_checker')=0` |
| 4.4.4 | Vault row resolvable: `(SELECT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='CRON_SECRET'))` AND `(SELECT length(decrypted_secret) FROM vault.decrypted_secrets WHERE name='CRON_SECRET' LIMIT 1)>0` — never log the secret itself, only the length flag (L42 + length-only pattern preserved) |
| 4.4.5 | Cron jobname uniqueness: `(SELECT COUNT(*) FROM cron.job WHERE jobname='cadence_drift_checker_weekly')=0` |
| 4.4.6 | Schedule conflict check: `(SELECT COUNT(*) FROM cron.job WHERE schedule='30 17 * * 0')` — informational; weekly slots are sparse but flag any collision |

### 4.5 Stage E gates (read-only pre-fire snapshot; baseline for L45 post-mutation truth check)
| Gate | Assertion / capture |
|---|---|
| 4.5.1 | Baseline `r.cadence_drift_log` count | expected 0 (table just created) |
| 4.5.2 | Baseline `r.reconciliation_run` count where `run_type='cadence_drift_check'` | expected 0 |
| 4.5.3 | Baseline `r.expected_publication.expected_status` distribution | capture full histogram for L45 post-fire delta |
| 4.5.4 | Baseline MV row counts | capture for L45 post-fire delta |
| 4.5.5 | Identify candidate late-transition rows (read-only preview) | `SELECT COUNT(*) FROM r.expected_publication WHERE expected_status='expected' AND expected_window_end + (60 * interval '1 minute') < now()` — gives empirical expectation for `late_transitions` counter |
## 5. Implementation spec

### 5.1 Stage A schema migration

#### 5.1.1 `r.cadence_drift_log` table DDL
```sql
CREATE TABLE r.cadence_drift_log (
    cadence_drift_log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    drift_check_run_id uuid NOT NULL REFERENCES r.reconciliation_run(reconciliation_run_id),
    client_id uuid NOT NULL REFERENCES c.client(client_id),
    platform text NOT NULL,
    drift_type text NOT NULL CHECK (drift_type IN ('late','missing','cadence_anomaly','observer_stale')),
    drift_severity text NOT NULL CHECK (drift_severity IN ('info','warn','critical')),
    observation_window_start date NOT NULL,
    observation_window_end date NOT NULL,
    expected_publication_id uuid REFERENCES r.expected_publication(expected_publication_id),
    observed_count integer,
    expected_count integer,
    drift_details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_run_id uuid NOT NULL REFERENCES r.reconciliation_run(reconciliation_run_id),
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_run_id uuid NOT NULL REFERENCES r.reconciliation_run(reconciliation_run_id),
    CONSTRAINT cadence_drift_log_obs_window_ordered CHECK (observation_window_start <= observation_window_end),
    CONSTRAINT cadence_drift_log_per_row_drift_has_ep CHECK (
        (drift_type IN ('late','missing') AND expected_publication_id IS NOT NULL)
        OR (drift_type IN ('cadence_anomaly','observer_stale') AND expected_publication_id IS NULL)
    )
);

CREATE INDEX ix_cadence_drift_log_run ON r.cadence_drift_log(drift_check_run_id);
CREATE INDEX ix_cadence_drift_log_client_platform ON r.cadence_drift_log(client_id, platform);
CREATE INDEX ix_cadence_drift_log_type_severity ON r.cadence_drift_log(drift_type, drift_severity);
CREATE INDEX ix_cadence_drift_log_ep ON r.cadence_drift_log(expected_publication_id)
    WHERE expected_publication_id IS NOT NULL;
CREATE INDEX ix_cadence_drift_log_created_at ON r.cadence_drift_log(created_at DESC);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON r.cadence_drift_log
    FOR EACH ROW EXECUTE FUNCTION r.set_updated_at();

COMMENT ON TABLE r.cadence_drift_log IS 'cc-0011 — drift findings per (client, platform, observation window). Multiple findings per run allowed; one row per (drift_type, expected_publication_id-or-null) per run.';
```

**Notes:**
- `created_by_run_id` + `updated_by_run_id` follow cc-0010A R2 stamping pattern. For Stage E first fire all three columns (`drift_check_run_id`, `created_by_run_id`, `updated_by_run_id`) will equal the run UUID.
- `expected_publication_id` is nullable because `cadence_anomaly` and `observer_stale` findings are scoped to (client, platform) not to a single row.
- CHECK `cadence_drift_log_per_row_drift_has_ep` enforces the symmetry: row-level drifts must reference an expected_publication; aggregate-level drifts must not.
- Partial index on `expected_publication_id IS NOT NULL` covers the row-level FK lookups efficiently.

#### 5.1.2 `r.mv_observer_freshness_summary` definition
```sql
CREATE MATERIALIZED VIEW r.mv_observer_freshness_summary AS
SELECT
    ep.client_id,
    ep.platform,
    cli.client_slug,
    MAX(ipe.evidence_at) AS last_evidence_at,
    MAX(rm.created_at) AS last_match_at,
    MAX(cdl.created_at) AS last_drift_log_at,
    COUNT(DISTINCT ipe.ice_publication_evidence_id) FILTER (
        WHERE ipe.evidence_at >= now() - interval '7 days'
    ) AS evidence_count_7d,
    COUNT(DISTINCT rm.reconciliation_match_id) FILTER (
        WHERE rm.created_at >= now() - interval '7 days'
    ) AS match_count_7d,
    COUNT(DISTINCT cdl.cadence_drift_log_id) FILTER (
        WHERE cdl.created_at >= now() - interval '7 days' AND cdl.drift_severity IN ('warn','critical')
    ) AS drift_warn_critical_count_7d,
    CASE
        WHEN MAX(ipe.evidence_at) IS NULL THEN 'no_evidence_ever'
        WHEN MAX(ipe.evidence_at) >= now() - interval '24 hours' THEN 'fresh'
        WHEN MAX(ipe.evidence_at) >= now() - interval '48 hours' THEN 'aging'
        ELSE 'stale'
    END AS freshness_status,
    now() AS refreshed_at
FROM r.expected_publication ep
JOIN c.client cli ON cli.client_id = ep.client_id
LEFT JOIN r.ice_publication_evidence ipe ON ipe.expected_publication_id = ep.expected_publication_id
LEFT JOIN r.reconciliation_match rm ON rm.expected_publication_id = ep.expected_publication_id
LEFT JOIN r.cadence_drift_log cdl ON cdl.client_id = ep.client_id AND cdl.platform = ep.platform
GROUP BY ep.client_id, ep.platform, cli.client_slug;

CREATE UNIQUE INDEX uq_mv_observer_freshness_summary
    ON r.mv_observer_freshness_summary(client_id, platform);

COMMENT ON MATERIALIZED VIEW r.mv_observer_freshness_summary IS
    'cc-0011 — one row per (client, platform). 7-day evidence/match/drift counts + freshness_status bucketed at 24h/48h thresholds. Refreshed CONCURRENTLY at end of each cadence-drift-checker EF run.';
```

#### 5.1.3 `r.mv_reconciliation_daily_matrix` definition
```sql
CREATE MATERIALIZED VIEW r.mv_reconciliation_daily_matrix AS
WITH ep_per_day AS (
    SELECT
        ep.client_id,
        ep.platform,
        ep.expected_local_date,
        ep.expected_status,
        ep.expected_publication_id
    FROM r.expected_publication ep
    WHERE ep.expected_local_date >= (now() AT TIME ZONE 'Australia/Sydney')::date - interval '30 days'
),
agg AS (
    SELECT
        client_id,
        platform,
        expected_local_date,
        COUNT(*) FILTER (WHERE expected_status='expected') AS count_expected,
        COUNT(*) FILTER (WHERE expected_status='matched') AS count_matched,
        COUNT(*) FILTER (WHERE expected_status='late') AS count_late,
        COUNT(*) FILTER (WHERE expected_status='suppressed') AS count_suppressed,
        COUNT(*) FILTER (WHERE expected_status='cancelled') AS count_cancelled,
        COUNT(*) AS count_total
    FROM ep_per_day
    GROUP BY client_id, platform, expected_local_date
)
SELECT
    agg.client_id,
    agg.platform,
    cli.client_slug,
    agg.expected_local_date,
    agg.count_expected,
    agg.count_matched,
    agg.count_late,
    agg.count_suppressed,
    agg.count_cancelled,
    agg.count_total,
    CASE WHEN agg.count_total = 0 THEN NULL
         ELSE (agg.count_matched::numeric / agg.count_total::numeric) END AS on_time_rate,
    CASE WHEN agg.count_total = 0 THEN NULL
         ELSE (agg.count_late::numeric / agg.count_total::numeric) END AS late_rate,
    now() AS refreshed_at
FROM agg
JOIN c.client cli ON cli.client_id = agg.client_id;

CREATE UNIQUE INDEX uq_mv_reconciliation_daily_matrix
    ON r.mv_reconciliation_daily_matrix(client_id, platform, expected_local_date);

COMMENT ON MATERIALIZED VIEW r.mv_reconciliation_daily_matrix IS
    'cc-0011 — one row per (client, platform, expected_local_date) over past 30 days. Status histogram + on_time_rate + late_rate. Refreshed CONCURRENTLY at end of each cadence-drift-checker EF run.';
```

#### 5.1.4 `r.reconciliation_run.run_type` constraint extension
**Pre-flight 4.1.6 must determine exact form.** Three plausible cases, in priority order:

- **Case C — value already present (no-op; v1.1 ADDED):** If pre-flight §4.1.6 confirms that `'cadence_drift_check'` already exists in the live `run_type` constraint (whether the constraint is a CHECK-with-literal-IN form OR an ENUM type), NO ALTER is required. The migration body for the run_type extension reduces to a comment-only no-op:
  ```sql
  -- cadence_drift_check already present in live constraint; no ALTER required
  ```
  Case C takes precedence over Case A and Case B and MUST be chosen whenever pre-flight detects the value already present. The HALT rule in §4.1.6 enforces this.

- **Case A — CHECK with literal IN (value not yet present):** Stage A migration appends, with the existing constraint name + the exact existing value list both empirically captured at pre-flight §4.1.6 (do NOT hard-code from brief authoring assumptions):
  ```sql
  ALTER TABLE r.reconciliation_run DROP CONSTRAINT {discovered_constraint_name};
  ALTER TABLE r.reconciliation_run ADD CONSTRAINT {discovered_constraint_name}
      CHECK (run_type IN ({discovered live values} ∪ {'cadence_drift_check'}));
  ```
  **Invariant:** every value present in the live constraint at pre-flight time MUST appear in the new constraint. Dropping any existing value would break in-flight or audit rows; the migration body must explicitly preserve all live values. Stage A D-01 proposal MUST inline the discovered value list verbatim for narrow review, not the placeholder. No literal example is shown in this brief intentionally — the proposal must reflect empirically-captured production state.

- **Case B — ENUM type (value not yet present):** Stage A migration appends:
  ```sql
  ALTER TYPE r.run_type ADD VALUE IF NOT EXISTS 'cadence_drift_check';
  ```
  `IF NOT EXISTS` is idempotent — a re-run after partial Stage A failure does not raise. Note that `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block in older PostgreSQL versions; supabase_migrations.schema_migrations is a single-transaction wrapper, but recent Postgres (≥12) permits this inside transactions if the new value isn't used in the same transaction. Stage A pre-flight §4.1.6 must verify PG version + transaction-permissibility before D-01.

Stage A D-01 proposal must include the discovered constraint form, the case selection (A / B / C), and the full empirical value list if Case A applies. Stage A pre-flight gate 4.1.6 captures the empirical form + value list + Case-selection; brief authoring cannot pre-determine. The §4.1.6 HALT rule prevents redundant ALTERs from being applied when Case C is the correct path.
### 5.2 Stage B EF source

#### 5.2.1 File layout (mirrors cc-0010C)
```
supabase/functions/cadence-drift-checker/
    deno.json
    index.ts
    lib/
        drift.ts        # pure functions: classify*, computeDrift*, planLateTransitions, assertUuid (L53)
        db.ts           # service-role helpers: fetchEp + fetchIpe + fetchRm + fetchMatcherConfigGlobal + insertDriftLog + updateExpectedLate + refreshMaterializedViews
```

#### 5.2.2 EF flow (`index.ts`)
1. Parse + validate body. Schema:
   ```ts
   {
     observation_window_days?: number;   // default 14
     mv_refresh_window_days?: number;    // default 30 (passed to MV definitions; informational only since MV is built from definition not from runtime arg)
     dry_run?: boolean;                  // default false; if true, skip all writes + skip MV refresh
     run_mode?: 'manual' | 'scheduled' | 'backfill';   // default 'manual'; L2 carry-forward note from cc-0010C — cron body lacks this field, so 'manual' is the cron-fire trigger value
     triggered_by: string;               // required; e.g. 'cc-0011-stage-e-first' or 'pg_cron_cadence_drift_checker_weekly'
   }
   ```
2. Auth: call `ensureCronSecret` (port from cc-0010C `lib/db.ts:43`). Reject HTTP 401 if `x-cron-secret` header missing or mismatched.
3. Open `r.reconciliation_run` audit row: `run_type='cadence_drift_check'`, `status='running'`, `started_at=now()`, `trigger=run_mode`, `triggered_by=body.triggered_by`. Capture returned `reconciliation_run_id` (assertUuid L53).
4. Fetch global default `r.matcher_config` row for `late_tolerance_minutes` (mirror cc-0010C `resolveLateTolerance` reduced to global-only).
5. Fetch in-window `r.expected_publication` rows (observation_window_days back from today Sydney-local).
6. Fetch `r.ice_publication_evidence` rows for the same expected_publication_id set (batched IN).
7. Fetch `r.reconciliation_match` rows for the same expected_publication_id set (batched IN).
8. **Drift pass per row:** for each EP row in window:
   - If `expected_status` already in `('matched','suppressed','cancelled')` — skip (terminal states).
   - If `expected_status='expected'`:
     - Determine if past tolerance window: `expected_window_end + (late_tolerance_minutes * 60 seconds) < now()`.
     - Determine if has evidence: count of IPE rows with `expected_publication_id == ep.id`.
     - Determine if has within-tolerance evidence: count of IPE rows with `pipeline_state='published' AND published_at <= expected_window_end + (late_tolerance_minutes * 60 seconds)`.
     - Classify:
       - Past tolerance, no IPE rows at all, past 24h after window end → `drift_type='missing'`, severity=`critical`, queue late transition.
       - Past tolerance, has IPE rows but none within tolerance → `drift_type='late'`, severity=`warn`, queue late transition.
       - Within tolerance still — no drift, no log entry.
     - If status is `late` already (rare — cc-0009 set it directly) — skip log re-write; row already in target state.
9. **Aggregate pass per (client, platform):** read from `r.mv_reconciliation_daily_matrix` (pre-refresh stale view is acceptable; first-fire MV is empty so this pass is vacuously empty on day 1):
   - Compare 7-day matched count to expected count from `c.cadence_rule` (joined via shared `client_id`+`platform`).
   - If deviation ≥ 1 unit → `drift_type='cadence_anomaly'`, severity computed per §3.1 table.
10. **Aggregate pass per (client, platform):** read from `r.mv_observer_freshness_summary` (same staleness note):
    - If `last_evidence_at < now() - 48 hours` → `drift_type='observer_stale'`, severity=`warn`.
11. Batch INSERT all drift_log rows in single PostgREST upsert (`onConflict` not applicable — pure insert).
12. Per-row UPDATE late-transitions on `r.expected_publication` (mirror cc-0010C `updateExpectedToMatched` per-row loop). Pre-filter `WHERE expected_status='expected'` on each UPDATE.
13. `REFRESH MATERIALIZED VIEW CONCURRENTLY r.mv_reconciliation_daily_matrix;` then `REFRESH MATERIALIZED VIEW CONCURRENTLY r.mv_observer_freshness_summary;` via a single `execute_sql`-equivalent service-role RPC. **Note:** PostgREST does not natively support REFRESH MATERIALIZED VIEW; an `rpc()` call to a dedicated `r.refresh_cc_0011_views()` function is required. See §5.2.4.
14. Close `r.reconciliation_run` audit row with `status='succeeded'`, `finished_at=now()`, `rows_processed`, `rows_inserted` (drift_log), `rows_updated` (late transitions), `rows_skipped`, `summary_json` populated.
15. Return HTTP 200 with response shape per §5.3.

#### 5.2.3 L54 carry-forward at brief authoring
**Per directive's mandatory lesson L54:** V-checks at Stage E (see §6) must derive `duration_ms` from `(finished_at - started_at)` extracted at query time. The EF response shape may include a `duration_ms` field for API consumers; the `r.reconciliation_run` audit row does NOT have a `duration_ms` column. Authoring discipline: every Stage-E verification SQL touching duration must use the EXTRACT form, not assume a column.

#### 5.2.4 `r.refresh_cc_0011_views()` helper function (Stage A migration also defines this)
```sql
CREATE OR REPLACE FUNCTION r.refresh_cc_0011_views() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY r.mv_reconciliation_daily_matrix;
    REFRESH MATERIALIZED VIEW CONCURRENTLY r.mv_observer_freshness_summary;
END;
$$;

REVOKE ALL ON FUNCTION r.refresh_cc_0011_views() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION r.refresh_cc_0011_views() TO service_role;

COMMENT ON FUNCTION r.refresh_cc_0011_views() IS
    'cc-0011 — refreshes both materialised views CONCURRENTLY. Called by cadence-drift-checker EF via PostgREST .rpc(). SECURITY DEFINER required because REFRESH MATERIALIZED VIEW needs table-owner privileges that service_role does not have directly.';
```

**Security note:** `SECURITY DEFINER SET search_path = ''` is the minimum-privilege idiom. The function is grant-restricted to `service_role` only. cc-0011 EF uses the same `SUPABASE_SERVICE_ROLE_KEY` env var as cc-0010B/C.
### 5.3 EF response shape (HTTP 200)
```json
{
    "reconciliation_run_id": "<uuid>",
    "status": "succeeded",
    "started_at": "<iso>",
    "finished_at": "<iso>",
    "duration_ms": <number>,
    "horizon": {
        "today_local": "<date>",
        "observation_window_start": "<date>",
        "observation_window_end": "<date>",
        "observation_window_days": 14
    },
    "rows_processed": <number>,
    "rows_inserted": <number>,
    "rows_updated": <number>,
    "rows_skipped": <number>,
    "summary_json": {
        "expected_publication_rows_fetched": <number>,
        "evidence_rows_fetched": <number>,
        "match_rows_fetched": <number>,
        "matcher_config_rows_fetched": <number>,
        "drift_findings": {
            "late": <number>,
            "missing": <number>,
            "cadence_anomaly": <number>,
            "observer_stale": <number>
        },
        "drift_severity_distribution": {
            "info": <number>,
            "warn": <number>,
            "critical": <number>
        },
        "late_transitions": <number>,
        "mv_refresh": {
            "mv_reconciliation_daily_matrix_refreshed_at": "<iso>",
            "mv_observer_freshness_summary_refreshed_at": "<iso>"
        },
        "dry_run": <boolean>
    },
    "error_summary": null
}
```

### 5.4 Partial-success semantics (per L40 + cc-0010B §10.2.p precedent)
- If a single late-transition UPDATE fails (FK / CHECK / race-window stomp by concurrent matcher): per-row catch; tally in `summary_json.partial_failures.late_transitions_failed`; do NOT fail the whole run.
- If MV refresh fails (lock contention, materialised view definition error): status=`partial`, error_summary populated with the failure detail, drift_log rows still committed.
- If drift_log INSERT batch fails (FK violation on `client_id` — unlikely since cc-0010A FK is intact): status=`failed`, audit row captures error_summary, MV refresh skipped.

### 5.5 Stage D cron schedule + body

**Schedule:** `30 17 * * 0` UTC (every Sunday at 17:30 UTC = Monday 03:30 Sydney AEST).
- Sunday weekly chosen so the matrix view captures a full week's data including the just-completed Saturday Sydney-local day.
- 17:30 UTC chosen to be after cron 82 (16:05 UTC daily cadence-rule-generator) has had a full day to settle and well before the next cron 82 fire. 12.5 hours of clearance on each side.
- PK may override schedule at Stage D directive — alternatives include `0 4 * * 0` UTC (Sunday 04:00 UTC = Sunday 14:00 Sydney) for a Sunday afternoon Sydney-local refresh.

**Cron body shape (3 fields per CCH R14):**
```json
{
    "observation_window_days": 14,
    "mv_refresh_window_days": 30,
    "triggered_by": "pg_cron_cadence_drift_checker_weekly"
}
```

**Note (L2 carry-forward from cc-0010C v2.69):** the 3-field body omits `run_mode`, so the EF will record `r.reconciliation_run.trigger='manual'` (EF default) despite the cron fire. Authoritative provenance signal is `triggered_by` field. Same pattern as cron 83 + cron 84.

### 5.6 Stage D migration SQL (literal)
```sql
SELECT cron.schedule(
    'cadence_drift_checker_weekly',
    '30 17 * * 0',
    $$
    SELECT net.http_post(
        url := 'https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/cadence-drift-checker',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
        ),
        body := jsonb_build_object(
            'observation_window_days', 14,
            'mv_refresh_window_days', 30,
            'triggered_by', 'pg_cron_cadence_drift_checker_weekly'
        ),
        timeout_milliseconds := 60000
    );
    $$
);
```

**Timeout = 60000 ms (60 sec).** Higher than cron 83/84's 30s timeout because cc-0011 also does MV refreshes which can be slower than a per-row EF pass. Empirical sizing at Stage E first fire will validate. Future tuning is brief-amendment territory.

### 5.7 Stage E manual fire shape (preferred path)
```sql
SELECT net.http_post(
    url := 'https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/cadence-drift-checker',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := jsonb_build_object(
        'observation_window_days', 14,
        'mv_refresh_window_days', 30,
        'triggered_by', 'cc-0011-stage-e-first'
    ),
    timeout_milliseconds := 60000
);
```

**L43 cron-fire-equivalent acceptance path:** PK may at Stage E direct that the first natural cron 85 fire be accepted as Stage E truth proof in place of the manual fire above. Same pattern proven across cc-0010B v2.68 + cc-0010C v2.69. The directive at Stage E will choose between the two paths.
## 6. V-checks

### 6.1 V8 — EF deploy verification (Stage C)
- `supabase functions list` shows `cadence-drift-checker` row with STATUS=ACTIVE, VERSION=1.
- `verify_jwt=false` declared in supabase/config.toml AND `--no-verify-jwt` flag passed at deploy.
- Two unauth POST probes (no `x-cron-secret` + empty `x-cron-secret`) both return HTTP 401 `{"error":"unauthorized"}`.
- Local HEAD == origin main == post-Stage-B merge SHA (pre-flight L41).

### 6.2 V9 — Cron job created (Stage D)
- `cron.job` row exists with `jobname='cadence_drift_checker_weekly'`, `schedule='30 17 * * 0'`, `active=true`.
- Command targets `/functions/v1/cadence-drift-checker`.
- Command uses `vault.decrypted_secrets`.
- Command does NOT contain the literal decrypted secret (POSITION check returns 0).
- Migration recorded in `supabase_migrations.schema_migrations`.

### 6.3 V10 — Run record sanity (Stage E)
- New `r.reconciliation_run` row with `run_type='cadence_drift_check'`, `status='succeeded'`, `started_at < finished_at`, `summary_json` carries all 4 drift-finding counters + late_transitions counter + mv_refresh timestamps.
- **L54 derived duration**: `EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000` — never `duration_ms` column reference (which does not exist on the audit row).

### 6.4 V11 — L45 post-mutation truth check (Stage E)
- `r.cadence_drift_log` count delta = `rows_inserted` from EF response.
- `r.expected_publication.expected_status` distribution: `count_late` delta = `summary_json.late_transitions`.
- `r.reconciliation_run` row count where `run_type='cadence_drift_check'` increments by 1.
- Both MVs have `refreshed_at` column updated to within 5 sec of `finished_at`.

### 6.5 V12 — Drift-log hygiene (Stage E)
For every row inserted in this run:
- `drift_check_run_id = created_by_run_id = updated_by_run_id = <run_id>` (R2 stamping).
- `drift_type` and `drift_severity` both pass CHECK constraints.
- CHECK `cadence_drift_log_per_row_drift_has_ep` satisfied: row-level drifts have `expected_publication_id NOT NULL`; aggregate-level drifts have `expected_publication_id IS NULL`.
- `observation_window_start <= observation_window_end`.

### 6.6 V13 — Late-transition correctness + CHECK pair (Stage E)
- For every row UPDATEd `expected → late`: `r.expected_publication.matched_match_id IS NULL` AND `matched_at IS NULL` post-transition.
- CHECK `expected_status_match_pair` (from cc-0010A v1.5) satisfied throughout.
- Cross-check: every `r.expected_publication` row at `expected_status='late'` has a corresponding row in `r.cadence_drift_log` with `drift_type IN ('late','missing')` and `expected_publication_id = ep.id` for this run.

### 6.7 V14 — 5-row sanity sample (Stage E)
For 5 sampled `r.cadence_drift_log` rows (or all if fewer than 5 inserted):
- `created_by_run_id` resolves to current run.
- `client_id` FK round-trips to `c.client.client_id`.
- For `drift_type IN ('late','missing')`: `expected_publication_id` FK round-trips to `r.expected_publication.expected_publication_id`.
- `drift_details` jsonb is well-formed and non-empty.
- Cross-client coverage: drift_log rows span multiple distinct (client, platform) pairs (if input data allows).

### 6.8 V15 — MV row counts + freshness (Stage E)
- `r.mv_reconciliation_daily_matrix`: row count > 0 if any `r.expected_publication` rows exist in past-30-days window.
- `r.mv_observer_freshness_summary`: row count == COUNT(DISTINCT (client_id, platform)) FROM `r.expected_publication`.
- `refreshed_at` on both views within 5 sec of EF `finished_at`.
- Pick 1 (client, platform) row from each view: arithmetic spot-check (count_total = count_expected + count_matched + count_late + count_suppressed + count_cancelled).

## 7. Stage B D-01 narrow-review checklist (grep PASS criteria)

Run as the final pre-commit gate on feat branch before Stage B D-01 fire:
- Zero references to `r.platform_observation` or `r.platform_manual_observation` (Tier 1 scope lock — these are PRV-2/3/4 territory).
- 4× `drift_type: "late"` / `"missing"` / `"cadence_anomaly"` / `"observer_stale"` class strings present in `lib/drift.ts`.
- 3× `drift_severity: "info"` / `"warn"` / `"critical"` strings present.
- L53 `assertUuid` defined in `lib/drift.ts` and called at every `r.reconciliation_run_id` + `expected_publication_id` row-construction site (≥3 call sites expected).
- Late-transition pre-filter: every `updateExpectedLate` invocation includes `WHERE expected_status='expected'` clause to prevent stomping concurrent matcher writes (D-21 race-window precedent from cc-0010C).
- `.rpc('refresh_cc_0011_views')` called exactly once in `index.ts`, after all writes complete, gated by `!dry_run`.
- R2 stamping: every drift_log INSERT writes all three `drift_check_run_id` + `created_by_run_id` + `updated_by_run_id` columns to the same run UUID.
- L54 V-check authoring discipline: any inline V-check SQL in result-file template uses `EXTRACT(EPOCH FROM (finished_at - started_at))` form rather than `duration_ms` column reference.

## 8. Stage gates + D-01 fire mapping

| Stage | D-01 action_type | Proposal scope | Approval criteria |
|---|---|---|---|
| A | `sql_destructive` | Stage A migration SQL literal (table + 2 MVs + helper function + run_type CHECK ALTER). Body includes empirical constraint form from pre-flight 4.1.6. | Verdict=`agree`, requires_pk_escalation=false. If `partial` or `disagree`, route to PK. |
| B | `plan_review` | Stage B authoring + grep checklist PASS + FF-merge proposal. Body includes commit SHA + blob SHAs + grep result counts. | Verdict=`agree`, requires_pk_escalation=false. |
| C | `ef_deploy` | CLI deploy of `cadence-drift-checker` v1. Body includes source ref `main@<sha>` + approved CLI command. **L52: route to CLI directly; do NOT attempt Supabase MCP `deploy_edge_function` first.** | Verdict=`agree`. |
| D | `sql_destructive` | Stage D `apply_migration cc_0011_pg_cron_cadence_drift_checker`. Body includes literal SQL per §5.6 + vault-row continuity assertion. | Verdict=`agree`. |
| E | `sql_destructive` (if manual fire) OR none (if PK directs L43 acceptance) | Manual `net.http_post` per §5.7 OR cron-fire acceptance directive. | Verdict=`agree` for manual; n/a for L43. |

**L46 baseline target: 5 consecutive clean-agree D-01 pass-throughs across Stages A → E.** Strongest L46 streak target since cc-0010B v2.68's 4-fire streak.
## 9. Acceptance criteria (close gate)

cc-0011 may close (CLOSED or CLOSED-WITH-VERIFIED-VARIANCE) when ALL of:
1. Stage A migration applied; FK targets resolvable; 2 MV definitions return 0+ rows on initial materialisation; `r.refresh_cc_0011_views()` function executable by service_role.
2. Stage B EF source on main; grep checklist all PASS; no override pathways triggered.
3. Stage C EF v1 ACTIVE; verify_jwt=false; both unauth probes return HTTP 401.
4. Stage D cron 85 ACTIVE; vault-backed; no literal secret inlined.
5. Stage E truth proof: either manual fire OR L43 cron-fire-equivalent acceptance, with `r.reconciliation_run` row `status='succeeded'` (or `status='partial'` with PK acceptance per §5.4 partial-success semantics).
6. All 8 V-checks (V8–V15) PASS at Stage E.
7. cc-0010A + cc-0010B + cc-0010C brief + result blobs unchanged on origin (strict carry-forward limit).

## 10. Edge cases / fail paths

### 10.1 Empty `r.reconciliation_match` at first cc-0011 fire (acceptable variance)
First cc-0011 fire may run when only 5 match rows exist (cc-0010C close-state). The drift_log will show many `missing` findings for older `r.expected_publication` rows that pre-date cc-0010B + cc-0010C; this is empirically correct drift signalling — those rows ARE missing evidence. Stage A pre-flight 4.1.2 flags `(rm count) >= 1`; if 0, this is a hard pre-condition failure and Stage A halts. If ≥1 but < some threshold (e.g. 10), variance is logged in result file but does not block close.

### 10.2 MV refresh under concurrent matcher write (cron 84 vs cron 85)
cron 85 fires Sundays 17:30 UTC. cron 84 fires at every :15 and :45 UTC including 17:15 (15 min before cron 85) and 17:45 (15 min after cron 85). Window collision possible if cron 84 fire from 17:15 is still mid-write at 17:30. Per cc-0010C empirical observation, cron 84 typical EF duration is <1 sec; race window is on the order of seconds at most. CONCURRENTLY refresh is the primary mitigation — `REFRESH MATERIALIZED VIEW CONCURRENTLY` reads a frozen snapshot and the matcher's late writes will appear at NEXT refresh, not THIS one. Document the race-window narrowness; no Stage A blocker.

### 10.3 Late-transition stomping concurrent matcher write
cc-0010C matcher fires 30 min before cc-0011 (cron 84 at 17:15 UTC; cron 85 at 17:30 UTC). If cron 84 transitions `expected → matched` between the cc-0011 SELECT and cc-0011 UPDATE, cc-0011's UPDATE would attempt `expected → late` on an already-matched row. The `WHERE expected_status='expected'` pre-filter on each UPDATE prevents this. Per-row failures (filtered by pre-filter) are silently accepted; not counted as `late_transitions`; not surfaced as `partial_failures`. Empirical observation at Stage E will confirm pre-filter behaviour.

### 10.4 MV CONCURRENTLY refresh fails due to no UNIQUE index
`REFRESH MATERIALIZED VIEW CONCURRENTLY` requires a UNIQUE index. Stage A migration creates `uq_mv_reconciliation_daily_matrix` and `uq_mv_observer_freshness_summary` exactly for this purpose. Stage B pre-flight 4.2.3 asserts both indexes present before merge.

### 10.5 SECURITY DEFINER function privilege misalignment
`r.refresh_cc_0011_views()` is declared `SECURITY DEFINER` so it runs with the owner's privileges (table owner, not service_role). Stage A migration owner is whichever role applies the migration (typically `postgres`). If migration applied by a non-owner of the underlying tables, REFRESH will fail with insufficient privilege. Stage A pre-flight should verify migration role has owner privileges or grant them.

### 10.6 Cron 85 first fire vs `r.cadence_drift_log` newly created
First cron 85 fire happens 6 days after Stage D install at earliest (Sundays only). If Stage E acceptance path is "manual fire" (preferred), the manual fire writes to a brand-new empty `r.cadence_drift_log` and confirms end-to-end. If Stage E acceptance path is L43 cron-fire-equivalent, there may be a multi-day wait between Stage D close and first natural cron 85 fire. PK direction at Stage E determines.

## 11. Result file template (12-section, mirrors cc-0010A/B/C)

Path: `docs/briefs/results/cc-0011-cadence-drift-checker.md`.

1. Outcome (one paragraph; capture run_id + drift_log row count + late_transitions count + MV refresh confirmation).
2. Lineage (Stages A through E with commit SHAs + EF UUID + cron jobid).
3. Variance disclosed (if Stage E was L43 cron-fire-equivalent, narrate same as cc-0010B §3 + cc-0010C §3).
4. Production state changes (counts of `apply_migration`, deploy, cron install, `r.cadence_drift_log` row inserts, `r.expected_publication` late-transitions, MV refresh count).
5. L45 declaration table (all accepted variances from Stage A through E).
6. D-01 fires (table of review_ids + Stages + verdicts; target L46 streak ≥5).
7. Empirical proof — Stage E first-fire metrics.
8. V-check verdicts (V8–V15).
9. Cross-brief checkpoints (PRV-1 close gate criteria 5 + 6 status; L43 cycle 3; L42 cron 85 reification; L52 + L53 + L54 promotion eligibility).
10. Forward signals / unblocked items (PRV-2/3/4 not yet unblocked by cc-0011; PRV-1 close declaration eligibility delta).
11. Files touched.
12. Final state declaration.

## 12. Lessons to apply (mandatory per directive)

| Lesson | Application in cc-0011 | Where |
|---|---|---|
| **L42 vault-backed cron pattern** | Reuse vault row `0fede5c3-f92c-4bd6-8837-c0e304dfca4c` named `CRON_SECRET` via `vault.decrypted_secrets` inline subquery in cron 85 command. Length-only flag in verification reads (never log the secret). Same idiom as cron 82 + 83 + 84 — cron 85 will be the FOURTH job sharing the row, fully reifying L42 across 4 jobs. | §5.5 cron schedule + §5.6 migration SQL + §4.4.4 pre-flight |
| **L43 cron-fire-equivalent variance** | Stage E acceptance path may be either manual fire (preferred) or first natural cron 85 fire (L43 equivalent). Same pattern proven across cc-0010B v2.68 + cc-0010C v2.69; cc-0011 would be the third consecutive close exercising L43 if PK directs that path. **Promotion to baseline eligible at cc-0011 close** (3-cycle threshold). | §1.4 stage table + §5.7 manual fire shape + §10.6 cron 85 wait window |
| **L46 clean D-01 baseline** | Brief authoring proactively surfaces every Stage A constraint inspection point (4.1.6), every Stage B grep checklist line (§7), every Stage D vault + jobname uniqueness gate (§4.4), and every Stage E V-check derivation form (§6) — designed to maximise clean-agree pass-through across all 4–5 D-01 fires this cycle. Target: 5 consecutive clean-agree fires (strongest L46 streak to date). | §7 grep checklist + §8 stage gates + L54 derivation discipline noted in §5.2.3 and §6.3 |
| **L52 CLI deploy preference** | Stage C explicitly routes via Supabase CLI (`supabase functions deploy ...`); no Supabase MCP `deploy_edge_function` attempt. Same pattern as cc-0010C Stage C v2.69. **Promotion to baseline eligible at cc-0011 close** (3-cycle threshold across cc-0010B v2 redeploy + cc-0010C deploy + cc-0011 deploy). | §1.4 Stage C row + §8 Stage C D-01 row note |
| **L53 FK source-column integrity** | `assertUuid` fail-fast at every row-construction site that writes a UUID FK column. Required call sites: `drift_check_run_id`, `created_by_run_id`, `updated_by_run_id`, `expected_publication_id`, `client_id` — minimum 3 distinct row-construction paths. **Promotion to baseline eligible at cc-0011 close** (3-cycle threshold across cc-0010B F4 reactive + cc-0010C Stage B preventive + cc-0011 Stage B preventive). | §5.2.1 layout (lib/drift.ts) + §7 grep checklist |
| **L54 audit-query-vs-runtime-shape separation** | Every Stage E V-check authoring uses `EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000` form for duration. EF response shape `duration_ms` is computed at runtime in index.ts and lives in API response only. The result-file V-check templates (§6) all use the derived form. **Promotion to baseline eligible at cc-0011 close** (2-cycle threshold: cc-0010C E1 reactive + cc-0011 V-check preventive). | §5.2.3 authoring discipline note + §6.3 V10 derivation |
## 13. Out-of-scope deferrals

1. **Real-time per-fire late transition** — v1 transitions late-status only at weekly cadence. A row may sit at `expected_status='expected'` for up to 7 days after its tolerance window before transitioning. v2 amendment candidate: separate higher-frequency cron OR fold into cc-0010C v2 matcher.
2. **Drift severity alerting / notification** — `r.cadence_drift_log.drift_severity` is computed and persisted. Downstream notification (Slack / email / dashboard badge) is PRV-5 Triage Inbox territory.
3. **Backfill / historical re-classification** — v1 operates strictly on forward horizon (today + N days back). Pre-v2.69-close `r.expected_publication` rows that should retroactively be `missed` (not `late`) are not touched.
4. **Cadence-rule consistency drift** — detecting that a `c.cadence_rule` change mid-week leaves historical `r.expected_publication` rows misaligned with new rule. Rule-level drift detection is cc-NNNN future work.
5. **Per-client / per-(client, platform) `r.matcher_config` overrides** — v1 reads global default only for `late_tolerance_minutes`. Per-client override consumption is cc-NNNN future work (cc-0010C source already has the chain-lookup helper; cc-0011 reduces to global-default for simplicity).
6. **Tier 2–5 reconciliation observer evidence** — cc-0011 does NOT consume `r.platform_observation` / `r.platform_manual_observation` / `r.platform_observer_health`. Those surfaces are PRV-2/3/4 territory.
7. **`missed` vs `late` distinction in `r.expected_publication.expected_status`** — v1 transitions only to `late`. The `missed` terminal status (per cc-0010A v1.5 enum) requires manual confirmation; cc-0011 surfaces `drift_type='missing'` finding but does not auto-confirm `missed`.
8. **MV refresh frequency increase** — v1 refreshes MVs weekly only (at end of each cc-0011 EF run). Daily dashboard refresh is a v2 amendment candidate; can be done with a separate cron 86 calling `r.refresh_cc_0011_views()` directly without firing the full cc-0011 EF.

## 14. Open questions / decisions awaiting PK

1. **Schedule choice** — proposed `30 17 * * 0` UTC (Sunday 17:30 UTC). Alternatives: `0 4 * * 0` UTC (Sunday 04:00 UTC = Sunday 14:00 Sydney) for Sunday afternoon Sydney-local refresh; or `30 17 * * 1` UTC (Mondays) for a Monday-morning Sydney-local refresh. PK confirm at Stage D directive.
2. **Stage E acceptance path** — manual fire (preferred for fastest close) OR L43 cron-fire-equivalent (multi-day wait for natural Sunday fire). PK direct at Stage E directive.
3. **Run_type CHECK constraint extension form** — depends on Stage A pre-flight 4.1.6 result. Migration body must include the discovered form + chosen ALTER path; D-01 proposal must surface both for narrow review.
4. **EF response shape `duration_ms` vs `derived_duration_ms` naming** — v1 brief uses `duration_ms` in §5.3 response shape per cc-0010A/B/C precedent; the column does not exist on `r.reconciliation_run`. Authoring discipline (L54) keeps the audit-row query form derived. Confirm naming is acceptable.
5. **`missing` 24-hour threshold** — §3.1 hard-codes the `missing` classification as "past 24h after window end with zero IPE rows". PK may direct configurable threshold (e.g. add `r.matcher_config.missing_threshold_hours` column in a follow-up brief), but v1 keeps 24h hard-coded for simplicity.
6. **First-fire empirical drift_log count expectation** — Stage E first fire is likely to produce many drift_log rows (most cc-0010B-materialised rows fall outside cc-0010C 60-min tolerance). The result file should record this as expected baseline rather than alert-worthy variance. PK confirm at Stage E result review.

## 15. Authoring metadata + freeze terms

- **Authored:** 2026-05-13 Sydney (this session, post-v2.69 close).
- **v1.1 patch:** 2026-05-13 Sydney by chat (Claude) under PK directive after D-01 acceptance. Scope: §5.1.4 Case A/B/C re-shape (Case A placeholder-only with explicit live-value preservation invariant; Case B `IF NOT EXISTS` idempotency; Case C no-op no-ALTER path); §4.1.6 HALT rule extension; version metadata bump v1 → v1.1. No design-scope changes; no V-check changes; no schedule changes; cc-0010A/B/C invariants untouched.
- **Author:** chat (Claude) under PK directive.
- **Authoring strict-limits compliance:** docs-only this turn — no schema changes, no EF source, no deploy, no cron, no SQL writes, no review-row writes, no sync_state/action_list edits, no PRV work.
- **Lessons applied at authoring time:** L42 + L43 + L46 + L52 + L53 + L54 all explicitly referenced in §1.2 + §5 + §6 + §7 + §8 + §12 (per directive).
- **Brief blob freeze policy:** brief becomes frozen-by-reference at Stage A D-01 acceptance + Stage A migration commit. Future amendments (v1.1, v2) require new D-01 + explicit version bump.
- **Carry-forward at brief authoring time:**
  - cc-0010A v1.5 schema + cc-0010B v2 + cc-0010C v1 all closed on main at v2.69.
  - main HEAD at authoring start: `a3203ddb8e12b90615b433a299117e71576d5fc2`.
  - 24 historical escalated `m.chatgpt_review` rows still untouched (CCH directive carry).
  - v1.6 cc-0010A doc patch (3 items) still pending — does not block cc-0011 Stage A.
  - 5-row close-the-loop batch still pending — does not block cc-0011 Stage A.

---

*Brief authored 2026-05-13 Sydney by chat (Claude) at v2.69 sync close; v1.1 docs-only patch 2026-05-13 Sydney after PK D-01 accept. Mirrors cc-0010C 12-section shape with cc-0011-specific drift-detection scope. §5.1.4 now offers 3 cases (A/B/C) with Case C taking precedence when value already present; §4.1.6 HALT rule prevents redundant ALTER. Awaiting re-fired Stage A D-01 under PK direction. cc-0010A/B/C all unchanged; this is purely additive cc-0011 design surface.*