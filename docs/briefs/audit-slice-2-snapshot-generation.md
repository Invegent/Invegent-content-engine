---
brief_id: audit-slice-2-snapshot-generation
status: ready
risk_tier: 0
owner: cowork
created_by: PK
default_action: auto_commit
allowed_paths:
  - docs/audit/snapshots/**
  - docs/runtime/runs/**
  - docs/runtime/claude_questions.md
  - docs/briefs/queue.md
forbidden_actions:
  - apply_migration
  - update_production_data
  - any DML
  - any DDL
  - close_audit_finding
  - write_findings
idempotency_check: snapshot_file_absent
idempotency_pattern: "docs/audit/snapshots/{YYYY-MM-DD}.md (today's UTC date)"
success_output:
  - docs/audit/snapshots/{YYYY-MM-DD}.md
  - docs/runtime/runs/audit-slice-2-snapshot-generation-{YYYY-MM-DDTHHMMSSZ}.md
expected_questions: 0-3
---

# Brief — Audit Slice 2: snapshot generation

## Goal

Mechanically generate today's audit snapshot at `docs/audit/snapshots/{YYYY-MM-DD}.md`,
matching the structure of the cycle 1 manual snapshot at
`docs/audit/snapshots/2026-04-28.md`.

The output is **input material for the auditor pass** (manual ChatGPT in
cycle 2 per D181), not findings or judgments. Cowork executes 16
read-only SQL queries + 1 git operation, formats each result into the
specified JSON shape, and writes one markdown file.

**Tier 0 (per D184 + automation_v1_spec § Risk tier system):** safe
auto-commit. Markdown only. No production writes. No SQL DML or DDL.

## Why now

This is the **second-shape D182 durability test**. The first four
Cowork-style runs today (Phase D ARRAY mop-up + slot-core + post-publish
obs + pipeline-health pair) were all migration-drafting Tier 1 briefs.
This brief is markdown-generation Tier 0 — different shape. If Cowork
hits 5/5 thresholds again on this shape, the D182 system is validated
across two distinct brief shapes.

**Update post first run (30 Apr 2026):** First run succeeded (5/5
thresholds). D182 v1 now validated across two brief shapes. This brief
is preserved as the canonical daily-snapshot brief — re-run any future
day without modification.

Strategic value:

- Closes the build path step 6 from `docs/runtime/automation_v1_spec.md`
  (the only v1 build step remaining; step 7 is deferred per D184).
- Produces today's snapshot as input for cycle 2 of the D181 manual
  audit loop (R03 in the action list — runs *after* this snapshot lands).
- Establishes the daily snapshot cadence — once Slice 2 lands, the
  brief can be re-run any future day by changing only the date stamp.
- Enables reasoning about D182 generalisability: does the system work
  for non-migration shapes?

## Idempotency check (FIRST STEP — before doing any work)

1. Determine today's UTC date: `SELECT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');`
2. Check whether `docs/audit/snapshots/{that-date}.md` already exists in the repo.
3. If it exists, write `already_applied` to the run state file and STOP.
4. If it does not exist, proceed.

**Do NOT overwrite an existing snapshot file.** If today's snapshot was
already generated (e.g. by an earlier run today), the work is already
done.

## Pre-flight verification

Before drafting any output, verify these schemas exist and are queryable:

```sql
SELECT schema_name FROM information_schema.schemata
WHERE schema_name IN ('a', 'c', 'f', 'k', 'm', 'r', 't', 'public', 'cron')
ORDER BY schema_name;
```

Expected: 9 rows. If any of `a`, `c`, `f`, `k`, `m`, `r`, `t` is missing,
**STOP and escalate** (Tier 0 should never see a schema disappear; that
implies environment misconfiguration).

## Output structure — 17 sections + footer

The output file must follow the cycle 1 snapshot structure exactly:

- Header (title, generation timestamp, mechanism note, auditor target, snapshot SHA placeholder)
- Sections 1 through 17 (mechanical query results + snapshot notes)
- Section 19 (footer with auditor handoff pointer)

**Section 18 (pre-flagged observations) is intentionally omitted** in v1.
Section 18 is author-judgment work; producing it mechanically risks
poisoning the auditor's findings. Cycle 2 auditor produces equivalent
observations independently.

### Header (verbatim template, fill in date and timestamp)

```markdown
# Audit Snapshot — {YYYY-MM-DD}

**Generated:** {YYYY-MM-DD} {HH:MM} UTC ({HH:MM} Sydney) — automated via D182 Slice 2
**Mechanism:** Cowork via D182 v1 (Tier 0 brief: `audit-slice-2-snapshot-generation`)
**Auditor target:** Data / Supabase Model Auditor (Role 1)
**Snapshot SHA:** see this commit

> **Read this snapshot section by section.** Apply the role's scope checklist (`docs/audit/roles/data_auditor.md`) to each section. Produce findings in the run file.

> **Out of scope reminders:** No content. No vault secrets. No OAuth tokens. No PII enumeration. Other roles cover RLS, cron health, cost, compliance.

---
```

## Section-by-section queries (verbatim — copy and execute)

For each section, run the SQL **exactly as given**, format the result as
JSON (or table where specified), and write a "Snapshot note" line below
the data only if the cycle 1 snapshot had one for the same section.
Snapshot notes should be **factual observations only** — no
interpretation. Skip the snapshot note if nothing factual stands out.

### Section 1 — Summary

```sql
WITH
  ice_schemas AS (SELECT unnest(ARRAY['a','c','f','k','m','r','t'])::text AS schema_name),
  table_count AS (
    SELECT COUNT(*)::int AS n
    FROM information_schema.tables t
    JOIN ice_schemas i ON i.schema_name = t.table_schema
    WHERE t.table_type = 'BASE TABLE'
  ),
  column_count AS (
    SELECT COUNT(*)::int AS n
    FROM information_schema.columns c
    JOIN ice_schemas i ON i.schema_name = c.table_schema
  ),
  table_purpose_pct AS (
    SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE tr.purpose IS NOT NULL AND btrim(tr.purpose) <> '') / NULLIF(COUNT(*), 0), 1) AS pct
    FROM k.table_registry tr WHERE tr.schema_name IN ('a','c','f','k','m','r','t')
  ),
  column_purpose_pct AS (
    SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE cr.column_purpose IS NOT NULL AND btrim(cr.column_purpose) <> '' AND upper(btrim(cr.column_purpose)) NOT IN ('PENDING','TODO','PENDING_DOCUMENTATION')) / NULLIF(COUNT(*), 0), 1) AS pct
    FROM k.column_registry cr
    JOIN k.table_registry tr ON tr.table_id = cr.table_id
    WHERE tr.schema_name IN ('a','c','f','k','m','r','t')
  ),
  active_clients AS (SELECT COUNT(*)::int AS n FROM c.client WHERE status='active'),
  active_feeds AS (SELECT COUNT(*)::int AS n FROM f.feed_source WHERE status='active'),
  cron_count AS (SELECT COUNT(*)::int AS n FROM cron.job),
  rls_count AS (
    SELECT COUNT(*)::int AS n FROM pg_policies WHERE schemaname IN ('a','c','f','k','m','r','t')
  ),
  migrations_count AS (SELECT COUNT(*)::int AS n FROM supabase_migrations.schema_migrations),
  last_migration AS (
    SELECT version || '_' || COALESCE(name,'') AS label
    FROM supabase_migrations.schema_migrations
    ORDER BY version DESC LIMIT 1
  )
SELECT json_build_object(
  'ice_owned_schemas', ARRAY['a','c','f','k','m','r','t'],
  'ice_excluded_schemas', ARRAY['auth','storage','cron','vault','realtime','extensions','supabase_migrations'],
  'public_schema', 'special-case-exception-managed',
  'total_ice_tables', (SELECT n FROM table_count),
  'total_ice_columns', (SELECT n FROM column_count),
  'table_purpose_coverage_pct', (SELECT pct FROM table_purpose_pct),
  'column_purpose_coverage_pct', (SELECT pct FROM column_purpose_pct),
  'active_clients', (SELECT n FROM active_clients),
  'active_feeds', (SELECT n FROM active_feeds),
  'registered_crons', (SELECT n FROM cron_count),
  'rls_policies_on_ice_schemas', (SELECT n FROM rls_count),
  'total_migrations_applied', (SELECT n FROM migrations_count),
  'last_migration_applied', (SELECT label FROM last_migration)
) AS section_1;
```

Format the JSON with 2-space indent, one key per line.

### Section 2 — k Schema Registry

```sql
SELECT json_agg(
  json_build_object(
    'schema_name', schema_name,
    'category', category,
    'status', status,
    'purpose', purpose
  ) ORDER BY schema_name
) AS section_2
FROM k.schema_registry;
```

### Section 3 — Table Registry Coverage

```sql
WITH per_schema AS (
  SELECT
    tr.schema_name,
    COUNT(*)::int AS total_tables,
    COUNT(*) FILTER (WHERE tr.purpose IS NOT NULL AND btrim(tr.purpose) <> '')::int AS with_purpose,
    COUNT(*) FILTER (WHERE tr.purpose IS NULL OR btrim(tr.purpose) = '')::int AS missing_purpose
  FROM k.table_registry tr
  WHERE tr.schema_name IN ('a','c','f','k','m','r','t')
  GROUP BY tr.schema_name
),
totals AS (
  SELECT
    'TOTAL'::text AS schema_name,
    SUM(total_tables)::int AS total_tables,
    SUM(with_purpose)::int AS with_purpose,
    SUM(missing_purpose)::int AS missing_purpose
  FROM per_schema
)
SELECT json_agg(
  json_build_object(
    'schema_name', schema_name,
    'total_tables', total_tables,
    'with_purpose', with_purpose,
    'missing_purpose', missing_purpose,
    'pct_documented', ROUND(100.0 * with_purpose / NULLIF(total_tables, 0), 1)
  )
  ORDER BY CASE WHEN schema_name='TOTAL' THEN 1 ELSE 0 END, schema_name
) AS section_3
FROM (SELECT * FROM per_schema UNION ALL SELECT * FROM totals) combined;
```

### Section 3.1 — Top 30 tables missing purpose

```sql
SELECT json_agg(
  json_build_object(
    'schema', schema_name,
    'table', table_name,
    'kind', table_kind,
    'created_on', to_char(created_at, 'YYYY-MM-DD'),
    'state', 'TODO'
  )
  ORDER BY created_at DESC NULLS LAST, schema_name, table_name
) AS section_3_1
FROM (
  SELECT *
  FROM k.table_registry
  WHERE schema_name IN ('a','c','f','k','m','r','t')
    AND (purpose IS NULL OR btrim(purpose) = '')
  ORDER BY created_at DESC NULLS LAST
  LIMIT 30
) ranked;
```

### Section 4 — Column Registry Coverage

```sql
WITH per_schema AS (
  SELECT
    tr.schema_name,
    COUNT(*)::int AS total_columns,
    COUNT(*) FILTER (
      WHERE cr.column_purpose IS NOT NULL
        AND btrim(cr.column_purpose) <> ''
        AND upper(btrim(cr.column_purpose)) NOT IN ('PENDING','TODO','PENDING_DOCUMENTATION')
    )::int AS with_purpose,
    COUNT(*) FILTER (
      WHERE cr.column_purpose IS NULL
         OR btrim(cr.column_purpose) = ''
         OR upper(btrim(cr.column_purpose)) IN ('PENDING','TODO','PENDING_DOCUMENTATION')
    )::int AS missing_purpose
  FROM k.column_registry cr
  JOIN k.table_registry tr ON tr.table_id = cr.table_id
  WHERE tr.schema_name IN ('a','c','f','k','m','r','t')
  GROUP BY tr.schema_name
),
totals AS (
  SELECT
    'TOTAL'::text AS schema_name,
    SUM(total_columns)::int AS total_columns,
    SUM(with_purpose)::int AS with_purpose,
    SUM(missing_purpose)::int AS missing_purpose
  FROM per_schema
)
SELECT json_agg(
  json_build_object(
    'schema_name', schema_name,
    'total_columns', total_columns,
    'with_purpose', with_purpose,
    'missing_purpose', missing_purpose,
    'pct_documented', ROUND(100.0 * with_purpose / NULLIF(total_columns, 0), 1)
  )
  ORDER BY CASE WHEN schema_name='TOTAL' THEN 1 ELSE 0 END, schema_name
) AS section_4
FROM (SELECT * FROM per_schema UNION ALL SELECT * FROM totals) combined;
```

### Section 5 — Migration History (last 15)

```sql
SELECT json_agg(
  json_build_object(
    'version', version,
    'name', COALESCE(name, '(unnamed)')
  )
  ORDER BY version DESC
) AS section_5_recent,
(SELECT COUNT(*)::int FROM supabase_migrations.schema_migrations) AS total_applied
FROM (
  SELECT version, name
  FROM supabase_migrations.schema_migrations
  ORDER BY version DESC
  LIMIT 15
) m;
```

Format header line: `**Total applied migrations:** {total_applied}` then the JSON array.

### Section 6 — Cron Job Inventory

```sql
SELECT json_agg(
  json_build_object(
    'jobid', jobid,
    'jobname', jobname,
    'schedule', schedule,
    'active', active
  )
  ORDER BY jobid
) AS section_6
FROM cron.job;
```

Format header line: `**Total registered:** {COUNT(*)}. Active flag and target shown; full command bodies redacted per snapshot scope.` then the JSON array.

Do NOT add `note` fields to individual rows in v1 — those were author
annotations in cycle 1 (e.g. "R6 paused", "Meta restriction clear pending").
Cycle 2 omits notes; the auditor adds context from sync_state if needed.

### Section 7 — Slot Status (last 7 days, scheduled or filled)

```sql
SELECT json_agg(
  json_build_object(
    'client', client_name,
    'platform', platform,
    'status', status,
    'slots', slots
  )
  ORDER BY client_name, platform, status
) AS section_7
FROM (
  SELECT c.client_name, s.platform, s.status, COUNT(*)::int AS slots
  FROM m.slot s
  JOIN c.client c ON c.client_id = s.client_id
  WHERE s.scheduled_publish_at >= NOW() - INTERVAL '7 days'
     OR s.scheduled_publish_at >= NOW()
  GROUP BY c.client_name, s.platform, s.status
) g;
```

### Section 8 — ai_job last 7 days

```sql
SELECT json_agg(
  json_build_object(
    'job_type', job_type,
    'is_shadow', is_shadow,
    'status', status,
    'jobs', jobs,
    'first_seen', first_seen,
    'last_seen', last_seen
  )
  ORDER BY job_type, is_shadow, status
) AS section_8
FROM (
  SELECT
    job_type,
    is_shadow,
    status,
    COUNT(*)::int AS jobs,
    to_char(MIN(created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS first_seen,
    to_char(MAX(created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS last_seen
  FROM m.ai_job
  WHERE created_at >= NOW() - INTERVAL '7 days'
  GROUP BY job_type, is_shadow, status
) g;
```

### Section 9 — m.signal_pool aggregated by vertical

```sql
SELECT json_agg(
  json_build_object(
    'vertical_slug', vertical_slug,
    'active_pool', active_pool,
    'avg_fitness', avg_fitness,
    'never_used', never_used,
    'reused', reused
  )
  ORDER BY active_pool DESC, vertical_slug
) AS section_9
FROM (
  SELECT
    v.vertical_slug,
    COUNT(*) FILTER (WHERE sp.is_active)::int AS active_pool,
    ROUND(AVG(sp.fitness_score_max) FILTER (WHERE sp.is_active), 1) AS avg_fitness,
    COUNT(*) FILTER (WHERE sp.is_active AND sp.reuse_count = 0)::int AS never_used,
    COUNT(*) FILTER (WHERE sp.is_active AND sp.reuse_count > 0)::int AS reused
  FROM m.signal_pool sp
  JOIN t.content_vertical v ON v.vertical_id = sp.vertical_id
  GROUP BY v.vertical_slug
  HAVING COUNT(*) FILTER (WHERE sp.is_active) > 0
) g;
```

### Section 10 — Slot Alerts unacknowledged last 7d

```sql
SELECT json_agg(
  json_build_object(
    'alert_kind', alert_kind,
    'severity', severity,
    'open_alerts', open_alerts,
    'oldest_open', oldest_open
  )
  ORDER BY alert_kind, severity
) AS section_10
FROM (
  SELECT
    alert_kind,
    severity,
    COUNT(*)::int AS open_alerts,
    to_char(MIN(created_at) AT TIME ZONE 'Australia/Sydney', 'YYYY-MM-DD HH24:MI') || ' Sydney' AS oldest_open
  FROM m.slot_alerts
  WHERE acknowledged_at IS NULL
    AND created_at >= NOW() - INTERVAL '7 days'
  GROUP BY alert_kind, severity
) g;
```

### Section 11 — Recent publishing (last 7 days)

**Primary query** (refreshed 30 Apr — `m.post_draft.client_id` exists
directly; cycle 1's `post_seed` indirection was incorrect):

```sql
SELECT json_agg(
  json_build_object(
    'client', client_name,
    'platform', platform,
    'status', status,
    'posts', posts,
    'first', first_seen,
    'last', last_seen
  )
  ORDER BY client_name, platform, status
) AS section_11
FROM (
  SELECT
    c.client_name,
    pp.platform,
    pp.status,
    COUNT(*)::int AS posts,
    to_char(MIN(pp.created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS first_seen,
    to_char(MAX(pp.created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS last_seen
  FROM m.post_publish pp
  JOIN m.post_publish_queue pq ON pq.queue_id = pp.queue_id
  JOIN m.post_draft pd ON pd.post_draft_id = pq.post_draft_id
  JOIN c.client c ON c.client_id = pd.client_id
  WHERE pp.created_at >= NOW() - INTERVAL '7 days'
  GROUP BY c.client_name, pp.platform, pp.status
) g;
```

**Defensive fallback** (use only if the primary join chain fails on
future schema drift):

```sql
SELECT json_agg(
  json_build_object('platform', platform, 'status', status, 'posts', posts)
  ORDER BY platform, status
) AS section_11_fallback
FROM (
  SELECT platform, status, COUNT(*)::int AS posts
  FROM m.post_publish
  WHERE created_at >= NOW() - INTERVAL '7 days'
  GROUP BY platform, status
) g;
```

If the fallback fires, write a snapshot note: *"Section 11 used the
fallback query — client-level join chain unavailable. Auditor should
correlate with section 7 slot status if needed."*

### Section 12 — RLS Policy Summary

```sql
SELECT json_agg(
  json_build_object(
    'schema', schemaname,
    'tables_with_policies', tables_with_policies,
    'total_policies', total_policies
  )
  ORDER BY schemaname
) AS section_12
FROM (
  SELECT
    schemaname,
    COUNT(DISTINCT tablename)::int AS tables_with_policies,
    COUNT(*)::int AS total_policies
  FROM pg_policies
  WHERE schemaname IN ('a','c','f','k','m','r','t','public')
  GROUP BY schemaname
) g;
```

Snapshot note: *"Out of scope for Data Auditor — flag concerns to Security Auditor via `(out-of-scope-suggest-security)`."*

### Section 13 — Public Schema Inventory

```sql
SELECT json_build_object(
  'tables', (
    SELECT COALESCE(json_agg(table_name ORDER BY table_name), '[]'::json)
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ),
  'views', (
    SELECT COALESCE(json_agg(table_name ORDER BY table_name), '[]'::json)
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'VIEW'
  ),
  'function_count', (
    SELECT COUNT(*)::int
    FROM information_schema.routines
    WHERE specific_schema = 'public' AND routine_type = 'FUNCTION'
  )
) AS section_13;
```

Format header: `**Tables in public:** {count}\n**Views in public:** {count}\n**Functions in public:** {function_count}` then the JSON.

### Section 14 — Trigger Counts on ICE Schemas

```sql
SELECT json_agg(
  json_build_object('schema', schema_name, 'trigger_count', trigger_count)
  ORDER BY schema_name
) AS section_14
FROM (
  SELECT
    n.nspname AS schema_name,
    COUNT(*)::int AS trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('a','c','f','k','m','r','t')
    AND NOT t.tgisinternal
  GROUP BY n.nspname
) g;
```

### Section 15 — Index Coverage on Hot Tables

For each of these four tables, list its indexes verbatim:
- `m.slot`
- `m.ai_job`
- `m.signal_pool`
- `m.post_publish_queue`

```sql
SELECT
  pi.schemaname || '.' || pi.tablename AS qual_name,
  pi.indexname,
  pg_get_indexdef(c.oid) AS indexdef
FROM pg_indexes pi
JOIN pg_class c ON c.relname = pi.indexname
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = pi.schemaname
WHERE pi.schemaname = 'm'
  AND pi.tablename IN ('slot','ai_job','signal_pool','post_publish_queue')
ORDER BY pi.tablename, pi.indexname;
```

Format under each table heading (`### m.slot`, `### m.ai_job`, etc.) as
a JSON array of strings. Each string is a compact form of the index
definition: `"{indexname} ({columns or condition})"`. Cycle 1
showed e.g. `"idx_slot_pending_fill (fill_window_opens_at, scheduled_publish_at) WHERE status='pending_fill'"`.

If the compact form is hard to derive mechanically, use the full
`pg_get_indexdef` output as the string — auditor can read either.

### Section 16 — Token Expiry Status

```sql
SELECT json_agg(
  json_build_object(
    'client', client_name,
    'platform', platform,
    'expires_on', expires_on
  )
  ORDER BY client_name, platform
) AS section_16
FROM (
  SELECT
    c.client_name,
    cpp.platform,
    to_char(cpp.token_expires_at, 'YYYY-MM-DD') AS expires_on
  FROM c.client_publish_profile cpp
  JOIN c.client c ON c.client_id = cpp.client_id
  WHERE c.status = 'active'
) g;
```

Snapshot note: *"Out of scope for Data Auditor — flag any concerns to Security or Ops Auditor."*

### Section 17 — Decision Context Pointers

This one uses git, not SQL. Run from the repo root:

```bash
git log -1 --format='%H' -- docs/00_sync_state.md
git log -1 --format='%H' -- docs/06_decisions.md
git log -1 --format='%H' -- docs/audit/00_audit_loop_design.md
git log -1 --format='%H' -- docs/audit/roles/data_auditor.md
```

Format as:

```json
{
  "sync_state": "docs/00_sync_state.md @ commit {first 7 chars of sha}",
  "decisions": "docs/06_decisions.md @ commit {first 7 chars of sha}",
  "audit_loop_design": "docs/audit/00_audit_loop_design.md @ commit {first 7 chars of sha}",
  "data_auditor_role": "docs/audit/roles/data_auditor.md @ commit {first 7 chars of sha}"
}
```

If `docs/audit/roles/data_auditor.md` does not exist, use commit
`unknown` for that key and write a snapshot note: *"data_auditor_role
file not found — auditor should use latest available role file in
`docs/audit/roles/`."*

### Section 18 — DELIBERATELY OMITTED in v1

Cycle 1 included a "Pre-flagged observations" section authored by the
human snapshot generator. v1 Slice 2 omits this section by design:

- Mechanical generation cannot produce author judgment without risking
  poisoning the auditor's findings.
- The auditor (manual ChatGPT in cycle 2 per D181) produces equivalent
  observations independently as part of their findings pass.
- Future Slice 3 (auto-auditor, deferred per D184 + D181 cycle 5+ rule)
  will subsume any need for Section 18.

**Do NOT generate Section 18.** Skip from Section 17 directly to Section 19.

### Section 19 — End of snapshot (verbatim footer template)

```markdown
## 19. End of snapshot

Auditor: please write findings to `docs/audit/runs/{YYYY-MM-DD}-data.md` in the format specified in `docs/audit/roles/data_auditor.md` Section 4.

Operator: review findings in chat with Claude. Closures get committed to `docs/audit/open_findings.md`.
```

Substitute today's date in the auditor pointer.

## Likely questions and defaults

Per D182 v1 § "Answer-key pattern" — Cowork pre-answers these without asking:

| Question Cowork might raise | Default | Reasoning |
|---|---|---|
| What date format for the filename? | UTC date `YYYY-MM-DD` (today, computed once at start) | Cycle 1 used UTC; YYYY-MM-DD is filesystem-safe |
| What if today's snapshot already exists? | Write `already_applied`, STOP | Idempotency rule |
| What if a section's query returns no rows? | Output `[]` or `{}` empty — write a snapshot note "no data returned in query window" | Empty is the answer; an exception is not |
| What if a query's column has been renamed since the brief was authored? | Substitute the closest-match column from current schema and write a snapshot note documenting the substitution. Document the substitution in the run state's "Corrections applied" section. The first run (30 Apr) hit 6 such drifts; all 6 were resolved by direct substitution and the brief was refreshed. Future drift is expected to be rarer but should still be handled gracefully. | Schema drift is a fact of life; halting on it would be brittle |
| What if a query errors structurally (e.g. references a column the view doesn't expose, like `pg_get_indexdef(indexrelid)` on `pg_indexes`)? | Substitute the structurally-correct equivalent (e.g. join `pg_class` to expose `oid`) and add a snapshot note describing the fix | Fixed in 30 Apr brief refresh; this rule is residual safety |
| What if a section's query errors otherwise? | Write the error message in the section body and a snapshot note "section query failed: {error}; auditor please confirm" | Don't crash the entire run for one section |
| Should I include the cycle 1 snapshot's "snapshot notes" verbatim? | NO. Re-evaluate freshly — only include a note if the current data shows something factual. Don't copy notes from cycle 1. | Cycle 2 must produce its own observations or none |
| Should I add a Section 18? | NO. See Section 18 instructions above. | Explicitly out of scope in v1 |
| Should I add new sections beyond cycle 1's? | NO. v1 mirrors cycle 1's 17 mechanical sections + 19. No additions. | Scope discipline |

## Acceptance criteria

- File created at `docs/audit/snapshots/{YYYY-MM-DD}.md` (today's UTC date) — file did NOT exist before this run.
- All 17 mechanical sections populated (1, 2, 3, 3.1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17) plus the footer (Section 19).
- Section 18 NOT present.
- All JSON in each section is syntactically valid (parseable as JSON).
- File starts with the header template (with today's date substituted).
- File ends with the Section 19 footer (with today's date substituted into the auditor pointer).
- Run state file written at `docs/runtime/runs/audit-slice-2-snapshot-generation-{ISO timestamp}.md` per `state_file_template.md`.
- Queue.md row updated: ready → running (during run) → review_required (when snapshot file written).
- Zero `apply_migration` calls. Zero DML. Zero DDL. (Tier 0 forbids all of these.)
- Zero questions written to `claude_questions.md` (target — per D182 first-run benchmark of 0/10; note: 30 Apr first run wrote 1 question due to schema drift, all defaults were correct).

## Stop conditions

Cowork halts and writes `ESCALATION_REQUIRED` if:

- Pre-flight: any of `a`, `c`, `f`, `k`, `m`, `r`, `t` schemas missing.
- Idempotency: today's snapshot file exists but contains corrupt content (truncated, unparseable). Write `already_applied_but_corrupt` and let PK decide.
- More than 4 of the 17 sections fail their queries — implies systemic schema drift, not isolated drift. Halt and surface for PK.
- Any query attempts a write (UPDATE/INSERT/DELETE) — Cowork must reject and halt.
- Section 18 generation is attempted (this should not happen — instructions explicit — but a safety net).

## Out of scope

- **Findings.** This brief produces input material for the auditor.
  Cycle 2 manual run by ChatGPT (R03 in action list) produces findings.
  Slice 3 (deferred per D184 + D181 cycle 5+ rule) eventually produces
  auto-findings.
- **Closing open findings.** Belongs in `docs/audit/open_findings.md`,
  not this brief.
- **Section 18 (pre-flagged observations).** Explicit out of scope.
- **Snapshot notes that interpret rather than describe.** Cycle 1's
  interpretive notes (e.g. "may be intentional, possibly a discipline gap")
  are out of scope. Use only factual descriptive notes ("two rows have
  similar names — auditor please confirm").
- **Backfilling missing previous days.** Today's snapshot only.
- **Updating any registry table** (`k.table_registry`, `k.column_registry`).
  Read-only.
- **Modifying the cycle 1 snapshot** at `docs/audit/snapshots/2026-04-28.md`.
  That file is the cycle 1 baseline and must remain untouched.

## Brief authorship context

Authored 2026-04-30 ~16:30 Sydney / 06:30Z by chat. **Refreshed 2026-04-30
~17:35 Sydney / 07:35Z** after the first run (Cowork) hit 6 schema-drift
fallbacks. The refresh fixed all 6 query bugs:

1. Section 1 / `f.feed_source.active` → `status='active'`
2. Section 3.1 / `k.table_registry.object_kind` → `table_kind`
3. Sections 7, 11, 16 / `c.client.name` → `client_name`
4. Section 9 / `t.content_vertical.slug` → `vertical_slug`
5. Section 9 / `m.signal_pool.use_count` → `reuse_count`
6. Section 11 / removed `post_seed` indirection (`m.post_draft.client_id`
   exists directly)
7. Section 15 / `pg_get_indexdef(indexrelid)` against `pg_indexes` →
   join `pg_class` properly, pass `c.oid`
8. Section 16 / removed `cpp.enabled = true` filter (column doesn't exist)

Full schema verification of all substitutions documented in
`docs/runtime/runs/audit-slice-2-snapshot-generation-2026-04-30T071532Z.md`.
Root cause: brief was authored from memory of cycle 1's data shape
rather than from cycle 1's actual SQL. Lesson for future briefs: when a
brief specifies verbatim queries against schemas the brief author
doesn't own, run each query against current schema before the brief
lands.

**First run results (30 Apr 2026):**

| Threshold | Target | Actual |
|---|---|---|
| Questions asked | ≤ 10 | 1 |
| Defaults overridden | ≤ 20% | 0 |
| Run completes | yes | yes |
| Production writes | 0 (mandatory) | 0 |
| PK approval time | ≤ 10 min | yes |

**5/5 thresholds hit.** D182 v1 now validated across two distinct brief
shapes (Tier 1 migration drafting + Tier 0 markdown generation). This
feeds into the D182 sunset review (12 May 2026).

Cowork can run this brief any future day by re-reading the YAML
frontmatter — the date stamp is computed at execution time, so the
brief is intrinsically date-agnostic.
