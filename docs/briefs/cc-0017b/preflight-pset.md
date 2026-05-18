# cc-0017b § 5.1 — Pre-flight verification (P-set)

**Part of:** [`cc-0017b-friction-register-unified-emit-event.md`](../cc-0017b-friction-register-unified-emit-event.md)
**Prev:** [`risks-and-grants.md`](risks-and-grants.md) **Next:** [`migration-sql-part-a.md`](migration-sql-part-a.md)

---

These queries are read-only and must be run via `execute_sql` against production immediately before D-01. If any fail, hard-stop and refresh the brief.

```sql
-- P1: cc-0017a Wave 0a state intact — 9 friction.* tables expected
SELECT count(*) AS friction_table_count,
       jsonb_agg(table_name ORDER BY table_name) AS tables
FROM information_schema.tables
WHERE table_schema = 'friction';
-- Expected: count = 9; tables = [case, category, emission_rule, emission_rule_history,
--                                  emit_error, event, experiment_run, notification_policy, source]
```

```sql
-- P2: existing emit_* + helper function signatures unchanged from authoring-time evidence (§1.1 Q1)
-- CRITICAL: capture this output to the apply session log — it is the rollback source for §5.5
SELECT p.proname,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS args,
       pg_catalog.pg_get_function_result(p.oid) AS returns,
       pg_catalog.pg_get_functiondef(p.oid) AS body  -- full body for rollback
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction'
  AND p.proname IN ('fn_emit_reconciliation_event', 'fn_emit_health_check_findings',
                    'fn_emit_manual_event', 'fn_promote_event_to_case',
                    'fn_compute_dedupe_fingerprint_v1')
ORDER BY p.proname;
-- Expected (args + returns columns):
--   fn_compute_dedupe_fingerprint_v1 | p_source text, p_problem_key text, p_related_object jsonb | text
--   fn_emit_health_check_findings    | p_run_id text, p_markdown_path text, p_findings jsonb     | jsonb
--   fn_emit_manual_event             | p_observation_text text, p_severity text, p_category text, p_current_route text, p_related_object jsonb, p_notes text | uuid
--   fn_emit_reconciliation_event     | (empty)                                                    | trigger
--   fn_promote_event_to_case         | (empty)                                                    | trigger
-- HARD-STOP if any signature mismatch.
```

```sql
-- P3: 4 expected triggers in place
SELECT t.tgname, c.relname AS table_name, n.nspname AS schema_name,
       t.tgenabled AS enabled_status
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal
  AND t.tgname IN ('friction_event_promote_to_case',
                   'friction_event_no_delete_during_run',
                   'friction_case_no_delete_during_run',
                   'friction_emit_reconciliation')
ORDER BY t.tgname;
-- Expected: 4 rows; all enabled_status = 'O' (origin = enabled)
```

```sql
-- P4: emission_rule has 0 rows (clean seed slate)
SELECT count(*) AS emission_rule_rows FROM friction.emission_rule;
-- Expected: 0
-- HARD-STOP if > 0 — would mean prior seed collision; refresh brief.
```

```sql
-- P5: notification_policy has 0 rows (Wave 2 will seed)
SELECT count(*) AS notification_policy_rows FROM friction.notification_policy;
-- Expected: 0
```

```sql
-- P6: event.category_source CHECK has exactly 3 expected values
SELECT pg_get_constraintdef(con.oid) AS def
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
JOIN pg_namespace n ON n.oid = cls.relnamespace
WHERE n.nspname = 'friction' AND cls.relname = 'event'
  AND con.conname = 'event_category_source_check';
-- Expected def: CHECK ((category_source = ANY (ARRAY['emitter_default'::text, 'manual_at_capture'::text, 'triage_override'::text])))
-- HARD-STOP if any other value present (would collide with our extension).
```

```sql
-- P7: event.reported_by CHECK has exactly 5 expected values
SELECT pg_get_constraintdef(con.oid) AS def
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
JOIN pg_namespace n ON n.oid = cls.relnamespace
WHERE n.nspname = 'friction' AND cls.relname = 'event'
  AND con.conname = 'event_reported_by_check';
-- Expected def: CHECK ((reported_by = ANY (ARRAY['system'::text, 'pk'::text, 'client'::text, 'vendor'::text, 'unknown'::text])))
```

```sql
-- P8: row counts; NULL fingerprint count on case
SELECT
  (SELECT count(*) FROM friction.event) AS event_total,
  (SELECT count(*) FROM friction.case)  AS case_total,
  (SELECT count(*) FROM friction.case WHERE dedupe_fingerprint IS NULL) AS case_null_fingerprint,
  (SELECT count(*) FROM friction.case c
     WHERE c.dedupe_fingerprint IS NULL
       AND EXISTS (SELECT 1 FROM friction.event e WHERE e.case_id = c.case_id)
  ) AS case_null_fp_with_events;
-- Expected at authoring: event_total=22, case_total=22, case_null_fingerprint=0, case_null_fp_with_events=0
-- At apply time these may be higher (cron 85 fired, FAB used, Cowork fired) — record actuals.
-- HARD-STOP if case_null_fp_with_events > 50 (suggests something pathological).
```

```sql
-- P9: UNIQUE (source, source_event_id) on friction.event still in place
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'friction' AND tablename = 'event'
  AND indexname = 'event_source_source_event_id_key';
-- Expected: 1 row; indexdef contains 'UNIQUE' and '(source, source_event_id)'
```

```sql
-- P10: case_open_dedupe_uniq partial unique index still in place
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'friction' AND tablename = 'case'
  AND indexname = 'case_open_dedupe_uniq';
-- Expected: 1 row; indexdef contains 'UNIQUE' and 'WHERE (resolved_at IS NULL)'
```

```sql
-- P11: friction.fn_compute_dedupe_fingerprint_v1 exists, IMMUTABLE, SECURITY INVOKER
SELECT p.proname, l.lanname,
       CASE p.provolatile
         WHEN 'i' THEN 'IMMUTABLE'
         WHEN 's' THEN 'STABLE'
         WHEN 'v' THEN 'VOLATILE'
       END AS volatility,
       p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'friction' AND p.proname = 'fn_compute_dedupe_fingerprint_v1';
-- Expected: 1 row; volatility=IMMUTABLE; security_definer=false (SECURITY INVOKER)
```

```sql
-- P12: distinct drift_type values in r.cadence_drift_log
SELECT jsonb_agg(DISTINCT drift_type ORDER BY drift_type) AS distinct_drift_types,
       count(*) AS total_rows
FROM r.cadence_drift_log;
-- Expected at authoring: ['observer_stale'], 12 rows
-- HARD-STOP if any value other than 'observer_stale' appears — emission_rule seed list
-- needs amendment first (add INSERT for each new drift_type).
```

```sql
-- P13: distinct problem_key values for source='health_check' (validate true-stuck-* fallback covers all)
SELECT jsonb_agg(DISTINCT problem_key ORDER BY problem_key) AS health_check_problem_keys,
       count(*) FILTER (WHERE problem_key LIKE 'true-stuck-%') AS matches_fallback,
       count(*) AS total_rows
FROM friction.event
WHERE source = 'health_check';
-- Expected at authoring: all 5 keys match 'true-stuck-*'; matches_fallback = total_rows
-- WARN (not hard-stop) if matches_fallback < total_rows — those findings will hit tier-3
-- emit_error skip under the new wrapper; expected behaviour but flag in apply notes.
```

```sql
-- P14: required friction.category codes present and active
SELECT category_code, is_active
FROM friction.category
WHERE category_code IN ('client_commitment', 'pipeline_integrity', 'unclassified', 'operator_friction')
ORDER BY category_code;
-- Expected: 4 rows, all is_active = true.
--   client_commitment  → reconciliation seed default
--   pipeline_integrity → health_check seed default
--   unclassified       → manual seed default
--   operator_friction  → V-B test inserts use this
-- HARD-STOP if any missing or is_active=false.
```

```sql
-- P15: events emitted since cc-0017a apply 06:56:10 UTC (calibrate transition NULL backfill expectations)
SELECT count(*) AS events_since_0a,
       jsonb_agg(DISTINCT source) AS sources_seen
FROM friction.event
WHERE emitted_at > '2026-05-18 06:56:10+00';
-- Expected: small (0-N depending on apply timing). Record actual.
-- Cross-check with P8.case_null_fp_with_events — these are roughly the same population.
-- No hard-stop here — informational only.
```

```sql
-- P16: confirm GUC namespace 'friction.emit_event_active' is currently unset
-- (no leftover from prior testing).
--
-- NOTE (v1.1 patch — defect 2): current_setting(name, missing_ok := true) returns NULL
-- (NOT empty string '') when the GUC has never been set in the current session. The v1.0
-- literal `= ''` check therefore FAILED on a clean session (NULL = '' yields NULL, not true).
-- The fix accepts either NULL or empty string as the "unset" state via COALESCE.
SELECT
  current_setting('friction.emit_event_active', true) AS guc_value,
  COALESCE(current_setting('friction.emit_event_active', true), '') = '' AS guc_is_unset;
-- Expected: guc_value is NULL or '' (empty string); guc_is_unset = true
-- HARD-STOP if guc_is_unset = false — clear before apply via:
--   SELECT set_config('friction.emit_event_active', NULL, false);
```

---

## P-set hard-stop summary

The migration is BLOCKED FROM APPLY if any of:

- **P1** returns count ≠ 9 OR tables list missing any of the 9 expected.
- **P2** returns any signature mismatch with authoring-time evidence (§1.1 Q1) OR the captured body output is missing (rollback path 5c/5d depends on it).
- **P3** returns count < 4 OR any trigger missing OR any `enabled_status ≠ 'O'`.
- **P4** / **P5** return non-zero (would mean prior seed collision; refresh brief to handle).
- **P6** returns a constraint definition that doesn't match the literal 3-value list (someone extended it; would collide with our extension).
- **P7** returns a constraint definition that doesn't match the literal 5-value list.
- **P8** returns `case_null_fp_with_events > 50` (suggests something pathological since cc-0017a apply).
- **P9** / **P10** / **P11** return 0 rows (schema drift since cc-0017a).
- **P12** returns any drift_type value outside `['observer_stale']` — emission_rule seed incomplete; amend seed list and re-fire D-01.
- **P14** returns < 4 rows or any `is_active = false`.
- **P16** returns `guc_is_unset = false` (leftover GUC value from prior testing; clear before apply).

**P13** and **P15** have NO hard-stop — informational only.

---

**Next:** [`migration-sql-part-a.md`](migration-sql-part-a.md) — Migration SQL Steps 1–6 (backfill, schema extensions, helpers, GUC-aware trigger, canonical emit_event).
