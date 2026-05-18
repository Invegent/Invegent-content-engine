# cc-0017a — Friction Register Foundational Schema (Wave 0a)

**Brief ID:** cc-0017a
**Version:** v1.0
**Status:** Authored, awaiting D-01 review (execution gate open v2.79)
**Wave:** 0a of 10 (Friction Register Consolidation Plan)
**Authored:** 2026-05-18 Sydney evening
**Author:** Chat-side Claude on PK directive
**Strategic anchor:**
  - `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`)
  - `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` (signed v2.79)
**Depends on:** cc-0014 (the `friction.*` schema currently live: `event`, `case`, `category`, `emit_error`, `experiment_run`)
**Supersedes:** Wave 0 from the v1 plan (now split into 0a / 0b / 0c per Amendment A)
**Schema:** extends `friction.*` schema in Supabase `mbkmaxqhsohbtwsqolns`

---

## 1. Strategic anchor

This brief implements **Wave 0a — the foundational schema layer** — of the Friction Register Consolidation Plan v1 + amendments + §5.5 (signed 2026-05-18 Sydney evening).

Wave 0a is **purely additive and observational**: it adds tables, columns, seed rows, a function (formula-only, no caller wiring), a backfill, and a unique index. **It introduces NO behavioural change to existing pipelines.** All current emission paths (the 3 existing `emit_*` functions, the `fn_promote_event_to_case` BEFORE INSERT trigger on `friction.event`, every cron job, every Edge Function) continue to run unchanged after this migration applies.

The brief enacts these locked decisions:

| Source | Locked content used in this brief |
|---|---|
| v1 plan §5 Decisions 1–25 | Architecture invariants; 4-layer model; events-are-facts/cases-are-decisions; central emit_event as future entrypoint |
| v1 plan §6 (schema sketch) | Sources of truth for the 4 new tables' columns (subject to amendments below) |
| Amendment A | Wave split 0a/0b/0c — this is 0a only; 0b + 0c explicitly deferred |
| Amendment B | Canonical `dedupe_fingerprint = sha256(source ‖ ':' ‖ problem_key ‖ ':' ‖ related_object_canonical_json)`; `dedupe_fingerprint` column added to `friction.case`; partial unique index on open cases |
| Amendment C | `first_viewed_at`, `triaged_at`, `triaged_by` columns on `friction.case` |
| Amendment E (reference only) | The `p_severity_override` parameter is on the future `emit_event` function — Wave 0b, NOT 0a |
| Amendment F (reference only) | `REVOKE` lockdown is Wave 0c |
| Amendment G | `resolution_kind`, `reopen_count`, `predecessor_case_id` columns; "case open iff `resolved_at IS NULL`" |
| §5.5 Clarification 1 (reference only) | Reopen window N = 14 days — lives in Wave 0b `emit_event` function body, NOT 0a schema |
| §5.5 Clarification 2 | Triage time metric is phase-based; the columns in 0a (`first_viewed_at` + `created_at` + `triaged_at`) enable both Waves 1–6 formula (`triaged_at - created_at`) and Wave 7+ formula (`triaged_at - first_viewed_at`) |
| §6 Acknowledged future gaps | Per-source tunable reopen window is v2; cross-source dedupe is v2; SLA auto-expiry is v2 — none enter Wave 0a |

This brief does not re-litigate the architecture. The v1 plan + amendments + §5.5 are assumed read.

---

## 2. Scope summary

### In scope (Wave 0a)

**4 new tables:**
1. `friction.source` — source registry. FK target for the future `friction.emission_rule.source` and (in Wave 0c) `friction.event.source`. Replaces the convention-only `event_source_check` CHECK constraint as the source-of-truth list. Seeded with the 3 currently-emitting sources.
2. `friction.emission_rule` — per-(source, condition_key) rule defining default severity, default category, dedupe scope, case-creation policy, and `problem_key_formula` documentation. **DDL only in 0a — no rows seeded.** Rules are added per emitter during their respective waves (compliance W1, sentinel W4, etc.).
3. `friction.emission_rule_history` — append-only audit of rule changes. DDL only in 0a.
4. `friction.notification_policy` — Telegram routing rules keyed on (category, severity, case_state). DDL only in 0a. Rows added in Wave 2 (cc-0023) when Telegram lifecycle trigger lands.

**9 new columns on `friction.case`:**

| Column | Type | Source | Purpose |
|---|---|---|---|
| `resolved_at` | `timestamptz` (nullable) | Amendment A scope + G semantics | Case open iff NULL. Resolution-time anchor for stale-open queries + 14-day reopen window (Wave 0b). |
| `effort_level` | `text` CHECK (NULL or 'quick'/'moderate'/'deep') | Amendment A scope | Operator triage signal for backlog prioritisation (used by Wave 7 pool view). |
| `triaged_at` | `timestamptz` (nullable) | Amendment C | First non-NULL `action_decision` time. Triage metric numerator. |
| `triaged_by` | `text` (nullable) | Amendment C | Operator identity. PK now, multi-user future. |
| `first_viewed_at` | `timestamptz` (nullable) | Amendment C + §5.5 Clarification 2 | First GET of case from `/operations` UI (UI instrumentation lands in Wave 7). Pre-Wave-7 stays NULL; that's the design. |
| `resolution_kind` | `text` CHECK (NULL or one of 7 values) | Amendment G | Disambiguates `resolved_at` between `acted_on`/`tracked_done`/`deferred_done`/`suppressed`/`ignored`/`duplicate`/`reopened`. Enables recurrence analysis. |
| `reopen_count` | `integer` NOT NULL DEFAULT 0 | Amendment G | Increments when Wave 0b's emit_event reopens a case closed < 14 days ago. |
| `predecessor_case_id` | `uuid` (nullable) REFERENCES `friction.case(case_id)` | Amendment G | When a recurrence happens > 14 days after closure, a new case links back to the predecessor for audit. |
| `dedupe_fingerprint` | `text` (nullable in 0a) | Amendment B | Canonical sha256 fingerprint of `source ‖ ':' ‖ problem_key ‖ ':' ‖ related_object_canonical_json`. NOT NULL is deferred to Wave 0c after `emit_event` becomes the sole writer. |

**1 new function (formula only — not wired into any trigger or caller in 0a):**

- `friction.fn_compute_dedupe_fingerprint_v1(p_source text, p_problem_key text, p_related_object jsonb)` returns `text` — deterministic sha256 hex of the canonical concatenation. Created in 0a so the backfill query can call it. Wave 0b's `emit_event` will call the same function — locking the formula in one place avoids the divergence risk Review 3 flagged.

**1 backfill:**

- `friction.case.dedupe_fingerprint` filled for all existing rows (22 cases as of v2.79 schema state) by computing the canonical fingerprint from each case's *latest linked event* (`source`, `problem_key`, `related_object`). Currently 1:1 (broken dedupe), so "latest" = "only". Defensive `row_number()` partition handles any multi-event cases that may exist by apply time.

**1 partial unique index:**

```sql
CREATE UNIQUE INDEX case_open_dedupe_uniq
  ON friction.case (dedupe_fingerprint)
  WHERE resolved_at IS NULL;
```

Verbatim from Amendment B. Existing 22 cases all have `resolved_at IS NULL` (column is new with NULL default) and distinct backfilled fingerprints (proven by V-A11 before index CREATE), so index creation succeeds without conflict. NULLs are treated as distinct under PostgreSQL `UNIQUE`, so any cases created by the existing `fn_promote_event_to_case` trigger between 0a apply and 0b apply (which will lack `dedupe_fingerprint`) do not violate the index.

**3 seed rows in `friction.source`:**

```sql
('reconciliation', 'Reconciliation drift', 'system', 'warn', 'client_commitment', true, NULL)
('health_check',   'Night health check',   'system', 'warn', 'pipeline_integrity', true, NULL)
('manual',         'Manual FAB',           'pk',     'info', 'unclassified', true, NULL)
```

Preserves continuity with cc-0014's `event.source` CHECK constraint values. Wave 0c will drop the CHECK and add an FK from `event.source` to `source.source_code`; the seeds are pre-positioned to make that FK pass.

**Grants on the 4 new tables** consistent with cc-0014's role access matrix in Section 3 below.

### Explicitly out of scope (deferred to 0b / 0c / later waves)

- `friction.emit_event(...)` unified function — Wave 0b (cc-0017b)
- Replacement of `fn_promote_event_to_case` trigger with attach-or-create logic — Wave 0b
- Reopen window N = 14 days behaviour — Wave 0b, in the body of `emit_event`
- `p_severity_override` + `p_dynamic_context` parameters on `emit_event` — Wave 0b
- Migrating the 3 existing `emit_*` functions to thin wrappers over `emit_event` — Wave 0b
- Dropping `event_source_check` CHECK constraint — Wave 0c
- Adding FK from `friction.event.source` to `friction.source.source_code` — Wave 0c
- `REVOKE INSERT, UPDATE ON friction.event FROM PUBLIC, authenticated` — Wave 0c
- Same `REVOKE` on `friction.case` — Wave 0c
- Setting `friction.case.dedupe_fingerprint` to NOT NULL — Wave 0c (after Wave 0b proves sole-writer)
- Backfilling `resolved_at` on closed-state existing cases — Wave 0c (none currently in this state — all 22 cases are open by current `triage_state`; if any close between 0a and 0c, the auto-set logic introduced in Wave 0b's trigger handles them)
- Seeding `friction.emission_rule` rows — Wave 0b for `reconciliation` / `health_check` / `manual`; subsequent waves for each new emitter
- Seeding `friction.notification_policy` rows — Wave 2 (cc-0023), when Telegram lifecycle trigger lands

### Behavioural change scope

**NONE.** Wave 0a is observational. After this migration applies:

- The existing `fn_promote_event_to_case` BEFORE INSERT trigger on `friction.event` continues to run unchanged. It creates one case per event as before. New cases get `dedupe_fingerprint = NULL` (the column exists but no caller sets it yet). They are valid rows and do not violate the partial unique index (PostgreSQL treats NULLs as distinct).
- All 3 existing `emit_*` functions (`fn_emit_reconciliation_event`, `fn_emit_health_check_findings`, `fn_emit_manual_event`) continue to run unchanged. They write to `friction.event` directly — the new tables (`source`, `emission_rule`, etc.) are not in their call paths.
- The `friction-verification-daily` pg_cron job continues to run unchanged.
- The `cron 85` reconciliation daily fire continues to run unchanged.
- The Cowork `nightly-health-check-v1` v3.0 brief continues to call `friction.fn_emit_health_check_findings` unchanged.
- The invegent-dashboard FAB on `/operations` continues to call `friction.fn_emit_manual_event` unchanged.

If any V-check fails or D-01 returns escalate with substantive type-(b) findings, the migration is hard-stopped before apply.

### Rejected from scope considerations

- **Auto-setting `resolved_at = now()` when `action_decision IN ('suppress','ignore','duplicate')`.** Locked in Amendment G as Wave 0b behaviour. Implementing it in 0a would introduce a behavioural change (existing `friction.fn_triage_case` from cc-0014 doesn't set `resolved_at` — it only sets `triage_state` and similar). Pushing this into a trigger in 0a would conflict with Wave 0b's planned trigger replacement. **Deferred to 0b.**
- **Seeding `friction.emission_rule` with 3 rule rows (one per existing source).** Without the matching `emit_event` function, these rows would be inert. Deferring to 0b lets us seed alongside the function that consumes them, with full per-source `problem_key_formula` definitions defined per emitter's migration wave.
- **A CHECK constraint on `dedupe_fingerprint` format (e.g., `length = 64` hex).** The column is nullable in 0a. Format validation adds defensive value but risks blocking the transition window (new cases from the existing trigger have NULL). **Defer format CHECK to Wave 0c when NOT NULL applies.**
- **Adding `validate_dedupe_fingerprint_format` trigger.** Same reasoning — defer to 0c.

---

## 3. Cross-cutting: grants, RLS, and security

### Role access matrix for the 4 new tables

| Role | `friction.source` | `friction.emission_rule` | `friction.emission_rule_history` | `friction.notification_policy` |
|---|---|---|---|---|
| `service_role` | SELECT, INSERT, UPDATE | SELECT, INSERT, UPDATE | SELECT, INSERT | SELECT, INSERT, UPDATE |
| `authenticated` | SELECT | SELECT | SELECT | SELECT |
| `anon` | none | none | none | none |
| `postgres` (DDL/admin) | full | full | full | full |

**Schema usage:** existing `GRANT USAGE ON SCHEMA friction TO service_role, authenticated` from cc-0014 covers these new tables. No additional schema grant needed.

**`authenticated` write access** to any of the 4 new tables is via future `SECURITY DEFINER` functions only. No direct INSERT/UPDATE from `authenticated`.

**RLS:** not enabled on `friction.*` tables, consistent with cc-0014's experimental scope (single-operator). RLS becomes required if a customer-facing surface is ever built — out of scope here.

**Why allow `authenticated` SELECT on emission_rule/notification_policy:** the future `/operations` UI (Wave 7) needs to display per-case rules and notification routing for transparency. Wave 0a pre-positions this read access to avoid an additional grant in a future migration.

**Function execution grant in 0a:**

`friction.fn_compute_dedupe_fingerprint_v1` is `IMMUTABLE` `SECURITY INVOKER` and granted EXECUTE to `service_role, authenticated`. It does not access any tables and produces a deterministic hash — no security boundary considerations. The grant lets future code paths (Wave 0b's `emit_event`, backfills, ad-hoc audit queries) call it without elevation.

### Security V-checks (in Section 5)

Each new table receives at least one positive grant verification (the role that should have access does) and one negative grant verification (anon is denied). The function gets one positive grant verification (authenticated can EXECUTE) and one determinism verification.

---

## 4. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Backfill formula produces a different fingerprint per case than what Wave 0b's `emit_event` will compute for the same logical input. | The backfill calls `friction.fn_compute_dedupe_fingerprint_v1(source, problem_key, related_object)` — the same function Wave 0b's `emit_event` will call. One implementation, one formula. V-A9 verifies determinism. |
| Existing `friction.event.dedupe_fingerprint` (md5 format from cc-0014) differs from new `friction.case.dedupe_fingerprint` (sha256 format from this brief). | **By design.** Events are immutable facts — we do NOT modify their historical fingerprints. Cases store the canonical sha256 fingerprint. When Wave 0b's `emit_event` fires for a future event matching one of the 22 existing logical problems, the new event's sha256 fingerprint will match the case's backfilled sha256 fingerprint → dedupe attaches correctly. Old md5 fingerprints on existing events are forensic-only. Section 6 risk note documents this. |
| Partial unique index CREATE fails because backfill produced two identical fingerprints. | Vanishingly unlikely (sha256 collision). V-A11 explicitly counts distinct fingerprints across all 22 cases pre-index-create. If `count(distinct) < total`, hard-stop before index CREATE in the migration body. Migration ordering: ALTER first, backfill second, V-check + count third, CREATE INDEX last (within the same transaction). |
| Existing `fn_promote_event_to_case` trigger creates a case with `dedupe_fingerprint = NULL` between 0a apply and 0b apply, leaving an "orphan" outside the dedupe space. | NULLs are distinct under `UNIQUE` indexes in PostgreSQL — orphans don't violate the constraint. Wave 0b's brief includes a transition-step that backfills any NULL `dedupe_fingerprint` rows created between 0a and 0b before the trigger swap. Section 6 documents the expected count: probably 0–5 such rows given cron 85 emits ~16/day and 0b should land within days of 0a. |
| `resolution_kind` CHECK constraint conflicts with an existing pattern. | Column is new; CHECK is set at column definition; no existing constraints touch `resolution_kind`. Verified in pre-flight. |
| Self-FK `predecessor_case_id REFERENCES friction.case(case_id)` causes circular-reference issue during DDL. | PostgreSQL supports self-referencing FKs in `ALTER TABLE ADD COLUMN`. No `ON DELETE` cascade specified (default `NO ACTION`) — predecessor link is for audit, never automated. |
| Migration partial apply leaves the schema in an inconsistent state. | Single `apply_migration` runs in a transaction. All-or-nothing per PostgreSQL DDL semantics. Hard-stops in Section 5 are pre-apply (D-01 + pre-flight) or post-apply (V-checks within the migration's verify-only blocks). |
| The 4 new tables (especially `emission_rule_history`) waste space if Wave 0b is delayed beyond 4 weeks. | Empty tables cost negligible storage. Schema readiness > storage micro-optimisation. |
| 22 cases gets recomputed and one row throws a SQL error during backfill (e.g., NULL `related_object` triggers an unexpected coercion path). | Function uses `COALESCE(..., '')` on each input — NULL-tolerant. V-A8 explicitly tests the function on NULL `related_object` + NULL `problem_key` inputs. |
| The migration's V-check assertions (raise exceptions inline) cause the whole transaction to roll back, leaving operators uncertain whether the failure was a real problem or a transient one. | V-check assertions in Section 5 are written as `SELECT … FROM friction.case WHERE …; -- assertion` style read queries, not embedded RAISE EXCEPTION inside the migration. The migration applies the DDL + backfill + index. The V-checks are run *after* `apply_migration` returns, as separate `execute_sql` reads. This matches the cc-0014 v1.1 pattern. |

---

## 5. Stage A — Schema authoring (single stage)

### 5.1 Pre-flight verification (RUN BEFORE D-01 FIRE)

These queries are read-only and must be run via `execute_sql` against production immediately before D-01. If any fail, hard-stop and refresh the brief.

```sql
-- Pre-flight P1: confirm friction.* schema exists with the 5 cc-0014 tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'friction'
ORDER BY table_name;
-- Expected: case, category, emit_error, event, experiment_run (5 rows exactly)
```

```sql
-- Pre-flight P2: confirm no naming collision with the 4 new table names
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'friction'
  AND table_name IN ('source', 'emission_rule', 'emission_rule_history', 'notification_policy');
-- Expected: 0 rows
```

```sql
-- Pre-flight P3: confirm no naming collision with the 9 new column names on friction.case
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'friction'
  AND table_name = 'case'
  AND column_name IN (
    'resolved_at', 'effort_level', 'triaged_at', 'triaged_by', 'first_viewed_at',
    'resolution_kind', 'reopen_count', 'predecessor_case_id', 'dedupe_fingerprint'
  );
-- Expected: 0 rows
```

```sql
-- Pre-flight P4: confirm no naming collision with the new function name
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'friction'
  AND routine_name IN ('fn_compute_dedupe_fingerprint_v1');
-- Expected: 0 rows
```

```sql
-- Pre-flight P5: confirm no naming collision with the new index
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'friction'
  AND tablename = 'case'
  AND indexname = 'case_open_dedupe_uniq';
-- Expected: 0 rows
```

```sql
-- Pre-flight P6: count current friction.case rows (used to validate backfill scope)
SELECT count(*) AS current_case_count FROM friction.case;
-- Expected: ~22 (v2.79 baseline). Record actual value; backfill V-check uses this.
```

```sql
-- Pre-flight P7: count current friction.event rows with case_id (backfill source)
SELECT count(*) AS events_with_case_id FROM friction.event WHERE case_id IS NOT NULL;
-- Expected: matches P6 (1:1 dedupe-broken state). If significantly different, investigate before apply.
```

```sql
-- Pre-flight P8: verify the 3 source codes for seed match existing event.source distinct values
SELECT DISTINCT source FROM friction.event ORDER BY source;
-- Expected: reconciliation, health_check, manual (3 rows). Confirms seed completeness.
```

```sql
-- Pre-flight P9: confirm friction.category contains all 3 codes referenced by seed
SELECT category_code
FROM friction.category
WHERE category_code IN ('client_commitment', 'pipeline_integrity', 'unclassified');
-- Expected: 3 rows
```

```sql
-- Pre-flight P10: list current triggers on friction.event (will be unchanged by 0a)
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'friction'
  AND event_object_table = 'event'
ORDER BY trigger_name;
-- Expected: at least 'fn_promote_event_to_case' BEFORE INSERT and 'friction_event_no_delete_during_run' BEFORE DELETE from cc-0014.
-- Record list — Wave 0a leaves this list unchanged.
```

```sql
-- Pre-flight P11: list current functions in friction schema (will be added to by 0a — one new)
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'friction'
ORDER BY routine_name;
-- Expected: includes fn_emit_health_check_findings, fn_emit_manual_event, fn_emit_reconciliation_event,
-- fn_lock_criteria_snapshot, fn_prevent_delete_during_run, fn_promote_event_to_case, fn_recent_cases,
-- fn_triage_case, fn_verify_health_check_daily.
-- Wave 0a adds: fn_compute_dedupe_fingerprint_v1 (one new). Record current list.
```

```sql
-- Pre-flight P12: verify partial unique index name not used elsewhere
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE indexname = 'case_open_dedupe_uniq';
-- Expected: 0 rows
```

**Hard-stop:** if any of P1–P12 returns an unexpected result, do not fire D-01. Refresh the brief or investigate first.

### 5.2 Migration

**Migration name:** `cc_0017a_friction_foundational_schema`
**Apply via:** `apply_migration` MCP after D-01 approval.

```sql
--------------------------------------------------------------------------------
-- cc-0017a Wave 0a — Friction Register Foundational Schema
-- Observational only. NO behavioural change to existing pipelines.
--
-- Order of operations within the transaction:
--   1. New tables (source, emission_rule, emission_rule_history, notification_policy)
--   2. Seed friction.source with 3 rows
--   3. ALTER friction.case ADD 9 new columns
--   4. CREATE function friction.fn_compute_dedupe_fingerprint_v1
--   5. Backfill friction.case.dedupe_fingerprint via the function
--   6. CREATE partial unique index case_open_dedupe_uniq
--   7. GRANTs on the 4 new tables and the new function
--
-- All atomic. PostgreSQL DDL transactional. Either entire migration applies or none.
--------------------------------------------------------------------------------

-- ============================================================
-- Step 1: New tables
-- ============================================================

-- 1.1 friction.source — source registry
CREATE TABLE friction.source (
  source_code              text PRIMARY KEY,
  display_label            text NOT NULL,
  owner                    text NOT NULL,
  default_severity         text NOT NULL CHECK (default_severity IN ('info','warn','critical')),
  default_category_code    text NOT NULL REFERENCES friction.category(category_code),
  is_active                boolean NOT NULL DEFAULT true,
  deprecated_at            timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  notes                    text,
  CONSTRAINT source_deprecated_consistent CHECK (
    (deprecated_at IS NULL AND is_active = true) OR
    (deprecated_at IS NOT NULL AND is_active = false) OR
    (deprecated_at IS NULL AND is_active = false)
  )
);

CREATE INDEX friction_source_active_idx ON friction.source (is_active) WHERE is_active = true;

COMMENT ON TABLE friction.source IS
  'Source registry for friction.event.source values. Wave 0c will add FK from event.source to this table.';

-- 1.2 friction.emission_rule — per-(source, condition_key) emission policy
CREATE TABLE friction.emission_rule (
  rule_id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source                 text NOT NULL REFERENCES friction.source(source_code),
  condition_key          text NOT NULL,
  enabled                boolean NOT NULL DEFAULT true,
  default_severity       text CHECK (default_severity IS NULL OR default_severity IN ('info','warn','critical')),
  default_category_code  text REFERENCES friction.category(category_code),
  problem_key_formula    text NOT NULL,
  dedupe_scope           text NOT NULL DEFAULT 'open_cases'
                              CHECK (dedupe_scope IN ('open_cases','any_case','none')),
  case_policy            text NOT NULL DEFAULT 'auto_create'
                              CHECK (case_policy IN ('auto_create','manual_only','suppress')),
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, condition_key)
);

CREATE INDEX friction_emission_rule_source_idx ON friction.emission_rule (source) WHERE enabled = true;

COMMENT ON TABLE friction.emission_rule IS
  'Per-(source, condition_key) rules consumed by Wave 0b emit_event. DDL only in 0a — no rows seeded.';
COMMENT ON COLUMN friction.emission_rule.problem_key_formula IS
  'Documentation of per-source dedupe shape. Free text in v1; structured DSL is v2.';

-- 1.3 friction.emission_rule_history — append-only audit
CREATE TABLE friction.emission_rule_history (
  history_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id        uuid NOT NULL REFERENCES friction.emission_rule(rule_id),
  changed_at     timestamptz NOT NULL DEFAULT now(),
  changed_by     text NOT NULL,
  change_kind    text NOT NULL CHECK (change_kind IN ('insert','update','enable','disable','delete')),
  before_row     jsonb,
  after_row      jsonb
);

CREATE INDEX friction_emission_rule_history_rule_idx
  ON friction.emission_rule_history (rule_id, changed_at DESC);

COMMENT ON TABLE friction.emission_rule_history IS
  'Append-only audit of friction.emission_rule changes. Wave 0b adds a trigger that writes here.';

-- 1.4 friction.notification_policy — telegram routing rules
CREATE TABLE friction.notification_policy (
  policy_id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code              text REFERENCES friction.category(category_code),
  severity                   text NOT NULL CHECK (severity IN ('info','warn','critical')),
  case_state                 text NOT NULL CHECK (case_state IN ('new','re_escalated','stale_open','resolved')),
  notify_telegram            boolean NOT NULL DEFAULT false,
  notify_threshold_minutes   integer CHECK (notify_threshold_minutes IS NULL OR notify_threshold_minutes >= 0),
  enabled                    boolean NOT NULL DEFAULT true,
  notes                      text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_code, severity, case_state)
);

CREATE INDEX friction_notification_policy_lookup_idx
  ON friction.notification_policy (category_code, severity, case_state) WHERE enabled = true;

COMMENT ON TABLE friction.notification_policy IS
  'Notification routing rules consumed by Wave 2 (cc-0023) Telegram case-lifecycle trigger. DDL only in 0a.';

-- ============================================================
-- Step 2: Seed friction.source with 3 existing source codes
-- ============================================================

INSERT INTO friction.source (source_code, display_label, owner, default_severity, default_category_code, is_active, deprecated_at, notes) VALUES
  ('reconciliation', 'Reconciliation drift', 'system', 'warn', 'client_commitment',  true, NULL, 'r.cadence_drift_log AFTER INSERT trigger. Cron 85 daily.'),
  ('health_check',   'Night health check',   'system', 'warn', 'pipeline_integrity', true, NULL, 'Cowork brief nightly-health-check-v1 v3.0 calls fn_emit_health_check_findings.'),
  ('manual',         'Manual FAB',           'pk',     'info', 'unclassified',       true, NULL, 'invegent-dashboard FAB calls fn_emit_manual_event via RPC.');

-- ============================================================
-- Step 3: ALTER friction.case — add 9 new columns
-- ============================================================

ALTER TABLE friction.case
  ADD COLUMN resolved_at            timestamptz,
  ADD COLUMN effort_level           text CHECK (effort_level IS NULL OR effort_level IN ('quick','moderate','deep')),
  ADD COLUMN triaged_at             timestamptz,
  ADD COLUMN triaged_by             text,
  ADD COLUMN first_viewed_at        timestamptz,
  ADD COLUMN resolution_kind        text CHECK (
    resolution_kind IS NULL OR resolution_kind IN (
      'acted_on','tracked_done','deferred_done','suppressed','ignored','duplicate','reopened'
    )
  ),
  ADD COLUMN reopen_count           integer NOT NULL DEFAULT 0,
  ADD COLUMN predecessor_case_id    uuid REFERENCES friction.case(case_id),
  ADD COLUMN dedupe_fingerprint     text;

-- Helpful index for stale-open queries used by Wave 7 pool view (cheap to add now)
CREATE INDEX friction_case_open_idx ON friction.case (last_seen_at DESC) WHERE resolved_at IS NULL;

-- Helpful index for triaged_at metrics
CREATE INDEX friction_case_triaged_idx ON friction.case (triaged_at DESC) WHERE triaged_at IS NOT NULL;

-- Index for predecessor lookups (recurrence audit)
CREATE INDEX friction_case_predecessor_idx ON friction.case (predecessor_case_id) WHERE predecessor_case_id IS NOT NULL;

COMMENT ON COLUMN friction.case.resolved_at IS
  'Case is open iff resolved_at IS NULL. Auto-set logic lands in Wave 0b emit_event + trigger.';
COMMENT ON COLUMN friction.case.effort_level IS
  'Operator-assigned triage signal. Set during Wave 7 pool view interaction.';
COMMENT ON COLUMN friction.case.triaged_at IS
  'First non-NULL action_decision timestamp. Triage time numerator.';
COMMENT ON COLUMN friction.case.first_viewed_at IS
  'First GET from /operations UI. Wave 7 instrumentation. Pre-Wave-7 stays NULL.';
COMMENT ON COLUMN friction.case.resolution_kind IS
  'Disambiguates resolved_at. Required to be set when resolved_at is set (constraint added in Wave 0b alongside the auto-set trigger).';
COMMENT ON COLUMN friction.case.reopen_count IS
  'Incremented by Wave 0b emit_event when a case closed < 14 days ago receives a matching event.';
COMMENT ON COLUMN friction.case.predecessor_case_id IS
  'Set when a recurrence > 14 days after closure spawns a new case. Audit link, not cascade.';
COMMENT ON COLUMN friction.case.dedupe_fingerprint IS
  'Canonical sha256 fingerprint per Amendment B. NOT NULL deferred to Wave 0c.';

-- ============================================================
-- Step 4: Create the canonical fingerprint formula function
-- ============================================================

CREATE OR REPLACE FUNCTION friction.fn_compute_dedupe_fingerprint_v1(
  p_source           text,
  p_problem_key      text,
  p_related_object   jsonb
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = friction, public
AS $$
  SELECT encode(
    sha256(
      (
        COALESCE(p_source, '') || ':' ||
        COALESCE(p_problem_key, '') || ':' ||
        COALESCE(p_related_object::text, '')
      )::bytea
    ),
    'hex'
  );
$$;

COMMENT ON FUNCTION friction.fn_compute_dedupe_fingerprint_v1(text, text, jsonb) IS
  'Canonical dedupe fingerprint per Amendment B. IMMUTABLE — same inputs → same output. Used by cc-0017a backfill and cc-0017b emit_event.';

-- ============================================================
-- Step 5: Backfill friction.case.dedupe_fingerprint
-- ============================================================

-- Defensive: pick the latest event per case to source the canonical inputs.
-- Currently 1:1 (broken dedupe), so "latest" = "only" for almost all rows.
-- The row_number() partition handles any multi-event cases that may exist by apply time.

WITH ranked_events AS (
  SELECT
    case_id,
    source,
    problem_key,
    related_object,
    row_number() OVER (
      PARTITION BY case_id
      ORDER BY observed_at DESC, event_id DESC
    ) AS rn
  FROM friction.event
  WHERE case_id IS NOT NULL
)
UPDATE friction.case c
SET dedupe_fingerprint = friction.fn_compute_dedupe_fingerprint_v1(
  e.source,
  e.problem_key,
  e.related_object
)
FROM ranked_events e
WHERE e.case_id = c.case_id
  AND e.rn = 1;

-- Pre-index assertion: every case linked to at least one event should now have a non-NULL fingerprint.
-- Any case with case_id linked from event but NULL fingerprint here would block the index.
-- Cases with no linked event remain NULL (extremely unlikely given the schema, but possible).
DO $$
DECLARE
  v_total integer;
  v_null integer;
  v_distinct integer;
BEGIN
  SELECT count(*) INTO v_total FROM friction.case;
  SELECT count(*) INTO v_null FROM friction.case WHERE dedupe_fingerprint IS NULL;
  SELECT count(DISTINCT dedupe_fingerprint) INTO v_distinct
    FROM friction.case WHERE dedupe_fingerprint IS NOT NULL AND resolved_at IS NULL;

  RAISE NOTICE 'cc-0017a backfill: total cases=%, NULL fingerprint=%, distinct open fingerprints=%',
    v_total, v_null, v_distinct;

  -- Hard-stop conditions inside the migration transaction:
  -- 1. If any open case (resolved_at IS NULL) with a backfilled fingerprint shares a value with another open case → unique index will fail anyway, but raise here for clearer error
  IF v_distinct < (SELECT count(*) FROM friction.case WHERE dedupe_fingerprint IS NOT NULL AND resolved_at IS NULL) THEN
    RAISE EXCEPTION 'cc-0017a backfill produced duplicate dedupe_fingerprints among open cases. Migration aborted.'
      USING HINT = 'Investigate which cases share fingerprints — likely indicates a backfill formula bug.';
  END IF;
END $$;

-- ============================================================
-- Step 6: Create partial unique index per Amendment B
-- ============================================================

CREATE UNIQUE INDEX case_open_dedupe_uniq
  ON friction.case (dedupe_fingerprint)
  WHERE resolved_at IS NULL;

COMMENT ON INDEX friction.case_open_dedupe_uniq IS
  'Race-safe dedupe attach: Wave 0b emit_event uses ON CONFLICT against this index. NULLs treated as distinct (transition window cases between 0a and 0b).';

-- ============================================================
-- Step 7: Grants on the 4 new tables + new function
-- ============================================================

-- friction.source
GRANT SELECT, INSERT, UPDATE ON friction.source TO service_role;
GRANT SELECT ON friction.source TO authenticated;

-- friction.emission_rule
GRANT SELECT, INSERT, UPDATE ON friction.emission_rule TO service_role;
GRANT SELECT ON friction.emission_rule TO authenticated;

-- friction.emission_rule_history
GRANT SELECT, INSERT ON friction.emission_rule_history TO service_role;
GRANT SELECT ON friction.emission_rule_history TO authenticated;

-- friction.notification_policy
GRANT SELECT, INSERT, UPDATE ON friction.notification_policy TO service_role;
GRANT SELECT ON friction.notification_policy TO authenticated;

-- Function
REVOKE EXECUTE ON FUNCTION friction.fn_compute_dedupe_fingerprint_v1(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION friction.fn_compute_dedupe_fingerprint_v1(text, text, jsonb) TO service_role, authenticated;

-- ============================================================
-- End of cc_0017a_friction_foundational_schema
-- ============================================================
```

### 5.3 V-checks (run AFTER `apply_migration` returns success)

V-checks are run as separate read-only `execute_sql` calls. Each is independent; a failure in one does not block the others. If any required V-check fails, the migration must be rolled back per Section 5.5.

**V-A1 — 4 new tables exist:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'friction'
  AND table_name IN ('source', 'emission_rule', 'emission_rule_history', 'notification_policy')
ORDER BY table_name;
-- Expected: 4 rows (emission_rule, emission_rule_history, notification_policy, source)
```

**V-A2 — friction.source seeded with exactly 3 rows, correct content:**
```sql
SELECT source_code, display_label, owner, default_severity, default_category_code, is_active
FROM friction.source
ORDER BY source_code;
-- Expected 3 rows:
-- health_check   | Night health check   | system | warn | pipeline_integrity | true
-- manual         | Manual FAB           | pk     | info | unclassified       | true
-- reconciliation | Reconciliation drift | system | warn | client_commitment  | true
```

**V-A3 — 9 new columns on friction.case exist with correct types:**
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'friction'
  AND table_name = 'case'
  AND column_name IN (
    'resolved_at', 'effort_level', 'triaged_at', 'triaged_by', 'first_viewed_at',
    'resolution_kind', 'reopen_count', 'predecessor_case_id', 'dedupe_fingerprint'
  )
ORDER BY column_name;
-- Expected: 9 rows.
-- reopen_count: integer, NOT NULL, default '0'
-- predecessor_case_id: uuid, nullable, no default
-- others: nullable, no default; text/timestamptz types as defined
```

**V-A4 — resolution_kind CHECK constraint enforced (negative test, should FAIL):**
```sql
-- This must raise an error
INSERT INTO friction.case (case_id, case_title, first_seen_at, last_seen_at, severity, category, problem_key, resolution_kind)
VALUES (
  '00000000-0000-0000-0000-cc0017a01'::uuid,
  'cc-0017a-test/v-a4 resolution_kind CHECK',
  now(), now(), 'info', 'operator_friction', 'cc-0017a-test',
  'made_up_resolution_kind'
);
-- MUST raise: check constraint violation on resolution_kind
```

**V-A5 — effort_level CHECK constraint enforced (negative test, should FAIL):**
```sql
INSERT INTO friction.case (case_id, case_title, first_seen_at, last_seen_at, severity, category, problem_key, effort_level)
VALUES (
  '00000000-0000-0000-0000-cc0017a02'::uuid,
  'cc-0017a-test/v-a5 effort_level CHECK',
  now(), now(), 'info', 'operator_friction', 'cc-0017a-test',
  'enormous'
);
-- MUST raise: check constraint violation on effort_level
```

**V-A6 — predecessor_case_id self-FK enforced (negative test, should FAIL):**
```sql
INSERT INTO friction.case (case_id, case_title, first_seen_at, last_seen_at, severity, category, problem_key, predecessor_case_id)
VALUES (
  '00000000-0000-0000-0000-cc0017a03'::uuid,
  'cc-0017a-test/v-a6 predecessor FK',
  now(), now(), 'info', 'operator_friction', 'cc-0017a-test',
  'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid  -- nonexistent case_id
);
-- MUST raise: foreign key violation on predecessor_case_id
```

**V-A7 — friction.fn_compute_dedupe_fingerprint_v1 exists and returns 64-char hex:**
```sql
SELECT length(friction.fn_compute_dedupe_fingerprint_v1('test', 'cc-0017a-test', '{"a":1}'::jsonb)) AS hex_length;
-- Expected: 64 (sha256 hex)
```

**V-A8 — Function is deterministic (same inputs → same output, regardless of jsonb key order):**
```sql
SELECT
  friction.fn_compute_dedupe_fingerprint_v1('manual', 'cc-0017a-test', '{"a": 1, "b": 2}'::jsonb) AS forward,
  friction.fn_compute_dedupe_fingerprint_v1('manual', 'cc-0017a-test', '{"b": 2, "a": 1}'::jsonb) AS reverse,
  friction.fn_compute_dedupe_fingerprint_v1('manual', 'cc-0017a-test', '{"a": 1, "b": 2}'::jsonb) =
  friction.fn_compute_dedupe_fingerprint_v1('manual', 'cc-0017a-test', '{"b": 2, "a": 1}'::jsonb) AS keys_normalised,
  friction.fn_compute_dedupe_fingerprint_v1(NULL, NULL, NULL) AS handles_nulls;
-- Expected: forward = reverse; keys_normalised = true; handles_nulls = 64-char hex (sha256 of empty-canonicalised input)
```

**V-A9 — All existing cases have non-NULL dedupe_fingerprint after backfill:**
```sql
SELECT
  count(*) AS total_cases,
  count(*) FILTER (WHERE dedupe_fingerprint IS NULL) AS null_fingerprints,
  count(*) FILTER (WHERE dedupe_fingerprint IS NOT NULL AND length(dedupe_fingerprint) = 64) AS valid_64hex
FROM friction.case;
-- Expected: total = pre-flight P6 value (~22); null_fingerprints = 0; valid_64hex = total
```

**V-A10 — Backfilled fingerprints recompute identically (proves determinism on production data):**
```sql
WITH ranked_events AS (
  SELECT case_id, source, problem_key, related_object,
         row_number() OVER (PARTITION BY case_id ORDER BY observed_at DESC, event_id DESC) AS rn
  FROM friction.event WHERE case_id IS NOT NULL
)
SELECT count(*) FILTER (
  WHERE c.dedupe_fingerprint != friction.fn_compute_dedupe_fingerprint_v1(e.source, e.problem_key, e.related_object)
) AS mismatches
FROM friction.case c
JOIN ranked_events e ON e.case_id = c.case_id AND e.rn = 1
WHERE c.dedupe_fingerprint IS NOT NULL;
-- Expected: 0
```

**V-A11 — Backfilled fingerprints are all distinct among open cases (sanity check before/after index):**
```sql
SELECT
  count(*) AS open_cases_with_fingerprint,
  count(DISTINCT dedupe_fingerprint) AS distinct_fingerprints,
  count(*) = count(DISTINCT dedupe_fingerprint) AS all_distinct
FROM friction.case
WHERE resolved_at IS NULL AND dedupe_fingerprint IS NOT NULL;
-- Expected: all_distinct = true; count = (open cases with non-NULL fingerprint), typically ~22
```

**V-A12 — Partial unique index exists with correct definition:**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'friction'
  AND tablename = 'case'
  AND indexname = 'case_open_dedupe_uniq';
-- Expected: 1 row; indexdef contains 'UNIQUE' and 'WHERE (resolved_at IS NULL)'
```

**V-A13 — Partial unique index ENFORCES uniqueness on open cases (positive test, should FAIL):**
```sql
-- Pick any existing case's fingerprint
WITH target AS (
  SELECT dedupe_fingerprint FROM friction.case WHERE resolved_at IS NULL AND dedupe_fingerprint IS NOT NULL LIMIT 1
)
INSERT INTO friction.case (case_id, case_title, first_seen_at, last_seen_at, severity, category, problem_key, dedupe_fingerprint)
SELECT
  '00000000-0000-0000-0000-cc0017a13'::uuid,
  'cc-0017a-test/v-a13 unique index test',
  now(), now(), 'info', 'operator_friction', 'cc-0017a-test',
  dedupe_fingerprint
FROM target;
-- MUST raise: unique constraint violation on case_open_dedupe_uniq
```

**V-A14 — Partial unique index does NOT enforce when resolved_at IS NOT NULL (closed cases can share fingerprint):**
```sql
-- Insert a closed-state test case
INSERT INTO friction.case (case_id, case_title, first_seen_at, last_seen_at, severity, category, problem_key, dedupe_fingerprint, resolved_at, resolution_kind)
VALUES (
  '00000000-0000-0000-0000-cc0017a14a'::uuid,
  'cc-0017a-test/v-a14 closed test 1',
  now(), now(), 'info', 'operator_friction', 'cc-0017a-test',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  now(), 'tracked_done'
);
-- Insert a second closed-state test case with the SAME fingerprint — should succeed (index doesn't apply to closed)
INSERT INTO friction.case (case_id, case_title, first_seen_at, last_seen_at, severity, category, problem_key, dedupe_fingerprint, resolved_at, resolution_kind)
VALUES (
  '00000000-0000-0000-0000-cc0017a14b'::uuid,
  'cc-0017a-test/v-a14 closed test 2',
  now(), now(), 'info', 'operator_friction', 'cc-0017a-test',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  now(), 'tracked_done'
);
-- MUST succeed (both inserts)
-- Cleanup: see V-A20
```

**V-A15 — friction.emission_rule UNIQUE (source, condition_key) enforced (negative test):**
```sql
-- Need a valid source first — use the seeded 'manual'
INSERT INTO friction.emission_rule (source, condition_key, problem_key_formula)
VALUES ('manual', 'cc-0017a-test-key', 'cc-0017a-test formula');
-- Then try to insert a duplicate
INSERT INTO friction.emission_rule (source, condition_key, problem_key_formula)
VALUES ('manual', 'cc-0017a-test-key', 'cc-0017a-test formula 2');
-- Second insert MUST raise: unique constraint violation on (source, condition_key)
-- Cleanup in V-A20
```

**V-A16 — friction.notification_policy UNIQUE (category_code, severity, case_state) enforced (negative test):**
```sql
INSERT INTO friction.notification_policy (category_code, severity, case_state, notify_telegram)
VALUES ('operator_friction', 'critical', 'new', true);
INSERT INTO friction.notification_policy (category_code, severity, case_state, notify_telegram)
VALUES ('operator_friction', 'critical', 'new', false);
-- Second insert MUST raise: unique constraint violation
-- Cleanup in V-A20
```

**V-A17 — Grants: service_role can SELECT from new tables:**
```sql
SET ROLE service_role;
SELECT 'source' AS tbl, count(*) FROM friction.source
UNION ALL SELECT 'emission_rule', count(*) FROM friction.emission_rule
UNION ALL SELECT 'emission_rule_history', count(*) FROM friction.emission_rule_history
UNION ALL SELECT 'notification_policy', count(*) FROM friction.notification_policy;
RESET ROLE;
-- All 4 SELECTs must succeed
```

**V-A18 — Grants: anon CANNOT SELECT from new tables:**
```sql
SET ROLE anon;
SELECT count(*) FROM friction.source;
-- MUST raise: permission denied for table source
RESET ROLE;
-- (Optionally repeat for emission_rule, emission_rule_history, notification_policy — one is enough to prove the pattern)
```

**V-A19 — Observational invariant: existing fn_promote_event_to_case trigger unchanged.**

Verify by inserting a fresh test event and confirming it creates a case (existing behaviour) with `dedupe_fingerprint = NULL` (because the existing trigger doesn't set the new column):

```sql
-- Insert a test event via the manual emitter (existing function unchanged)
SELECT friction.fn_emit_manual_event(
  'cc-0017a-test/v-a19 observational invariant test',
  'info',
  'operator_friction',
  '/cc-0017a-test',
  NULL,
  'V-A19'
);
-- Returns a uuid. Find the resulting case:
SELECT c.case_id, c.case_title, c.dedupe_fingerprint, c.resolved_at, c.reopen_count, c.resolution_kind
FROM friction.case c
JOIN friction.event e ON e.case_id = c.case_id
WHERE e.observation_text = 'cc-0017a-test/v-a19 observational invariant test';
-- Expected: 1 row; dedupe_fingerprint IS NULL (existing trigger doesn't set it);
-- resolved_at IS NULL (default); reopen_count = 0 (default); resolution_kind IS NULL (default)
-- This proves: existing trigger creates a case as before, and new columns have appropriate defaults/NULL.
```

**V-A20 — Test row cleanup leaves zero test rows:**
```sql
-- Clean V-A4, V-A5, V-A6 attempted-but-rejected (already rolled back by failed INSERT, but defensive)
-- Clean V-A13 attempted (rolled back)
-- Clean V-A14 successful test inserts
DELETE FROM friction.case
WHERE case_id IN (
  '00000000-0000-0000-0000-cc0017a01'::uuid,
  '00000000-0000-0000-0000-cc0017a02'::uuid,
  '00000000-0000-0000-0000-cc0017a03'::uuid,
  '00000000-0000-0000-0000-cc0017a13'::uuid,
  '00000000-0000-0000-0000-cc0017a14a'::uuid,
  '00000000-0000-0000-0000-cc0017a14b'::uuid
);
-- Clean V-A15
DELETE FROM friction.emission_rule WHERE source = 'manual' AND condition_key = 'cc-0017a-test-key';
-- Clean V-A16
DELETE FROM friction.notification_policy
WHERE category_code = 'operator_friction' AND severity = 'critical' AND case_state = 'new'
  AND created_at > now() - INTERVAL '5 minutes';
-- Clean V-A19 (cascade via event then case)
DELETE FROM friction.event WHERE observation_text LIKE 'cc-0017a-test/%';
DELETE FROM friction.case WHERE case_title LIKE 'cc-0017a-test/%';
DELETE FROM friction.emit_error WHERE source_event_id LIKE 'cc-0017a-test/%';

-- Final verification: zero cc-0017a-test rows remain anywhere
SELECT
  (SELECT count(*) FROM friction.case  WHERE case_title LIKE 'cc-0017a-test/%') AS test_cases,
  (SELECT count(*) FROM friction.event WHERE observation_text LIKE 'cc-0017a-test/%') AS test_events,
  (SELECT count(*) FROM friction.emit_error WHERE source_event_id LIKE 'cc-0017a-test/%') AS test_errors,
  (SELECT count(*) FROM friction.emission_rule WHERE condition_key LIKE 'cc-0017a-test%') AS test_rules,
  (SELECT count(*) FROM friction.notification_policy WHERE notes LIKE 'cc-0017a-test%') AS test_policies;
-- Expected: all 5 counts = 0
```

### 5.4 Hard-stop conditions

The migration is considered FAILED if any of:

- `apply_migration` raises any error (DDL or runtime within the migration's DO blocks)
- The DO block inside Step 5 raises the explicit "duplicate dedupe_fingerprints among open cases" exception
- V-A1, V-A2, V-A3 return wrong row counts or wrong content
- V-A4, V-A5, V-A6 do NOT raise their expected CHECK/FK errors (constraint not enforced)
- V-A7 returns hex_length ≠ 64
- V-A8 returns `keys_normalised = false` or `handles_nulls` not a 64-char hex string
- V-A9 returns `null_fingerprints > 0` or `valid_64hex < total`
- V-A10 returns `mismatches > 0`
- V-A11 returns `all_distinct = false`
- V-A12 returns wrong index definition or 0 rows
- V-A13 does NOT raise its expected unique violation
- V-A14 raises an error on either of its two inserts (false positive: index incorrectly enforces on closed cases)
- V-A15, V-A16 do NOT raise their expected unique violations
- V-A17 fails (service_role write or read denied)
- V-A18 succeeds (anon can read — overpermission)
- V-A19 does not create a case via the existing emitter, OR the created case has non-NULL `dedupe_fingerprint` (would indicate the existing trigger has been silently modified)
- V-A20 finds any cc-0017a-test rows remaining

**On any hard-stop:** stop. Do not proceed to Wave 0b authoring. Roll back per Section 5.5 if the migration applied partially or wholly with subsequent V-check failure. Re-author this brief or amend, then re-fire D-01.

### 5.5 Rollback path

```sql
-- Order matters: drop dependent objects first.
-- Run as DDL/admin role.

-- 1. Drop the partial unique index
DROP INDEX IF EXISTS friction.case_open_dedupe_uniq;

-- 2. Drop the supporting indexes on friction.case
DROP INDEX IF EXISTS friction.friction_case_open_idx;
DROP INDEX IF EXISTS friction.friction_case_triaged_idx;
DROP INDEX IF EXISTS friction.friction_case_predecessor_idx;

-- 3. Drop the 9 new columns on friction.case
-- (column drop is destructive but acceptable — no other code reads these columns in 0a)
ALTER TABLE friction.case
  DROP COLUMN IF EXISTS dedupe_fingerprint,
  DROP COLUMN IF EXISTS predecessor_case_id,
  DROP COLUMN IF EXISTS reopen_count,
  DROP COLUMN IF EXISTS resolution_kind,
  DROP COLUMN IF EXISTS first_viewed_at,
  DROP COLUMN IF EXISTS triaged_by,
  DROP COLUMN IF EXISTS triaged_at,
  DROP COLUMN IF EXISTS effort_level,
  DROP COLUMN IF EXISTS resolved_at;

-- 4. Drop the formula function
DROP FUNCTION IF EXISTS friction.fn_compute_dedupe_fingerprint_v1(text, text, jsonb);

-- 5. Drop the 4 new tables (in dependency order: history first, then rule; policy; source)
DROP TABLE IF EXISTS friction.emission_rule_history;
DROP TABLE IF EXISTS friction.emission_rule;
DROP TABLE IF EXISTS friction.notification_policy;
DROP TABLE IF EXISTS friction.source;
```

After rollback:
- `friction.*` schema returns to the cc-0014 v1.1 state
- 22 existing cases + events untouched (`dedupe_fingerprint`, `resolved_at`, etc. dropped from the case table)
- Existing 3 emit_* functions, `fn_promote_event_to_case` trigger, `fn_triage_case`, `fn_recent_cases`, `fn_verify_health_check_daily`, and DELETE-protection triggers all unaffected (they were never modified)
- `cron 85` reconciliation daily fire continues normally
- `friction-verification-daily` cron continues normally

Rollback is clean and reversible. Apply rollback only if a post-apply V-check fails with no clear remediation.

---

## 6. D-01 framing

Before applying the migration, fire D-01 via `ask_chatgpt_review` with these fields:

**decision_under_review:**
> Apply cc-0017a Wave 0a foundational schema migration (`cc_0017a_friction_foundational_schema`) to the live `friction.*` schema in Supabase `mbkmaxqhsohbtwsqolns`. This is the first execution step of the Friction Register Consolidation Plan v1 + amendments + §5.5 signed by PK on 2026-05-18 Sydney evening. Migration is observational only — adds 4 new tables, 9 new columns to `friction.case`, 1 new function, backfills `dedupe_fingerprint` on ~22 existing cases, creates 1 partial unique index, applies grants. NO triggers added or modified, NO existing function paths changed, NO behavioural change to any pipeline.

**production_action_if_approved:**
> Run `apply_migration` MCP call with the SQL in Section 5.2 of `docs/briefs/cc-0017a-friction-register-foundational-schema.md`. After apply returns success, run the 20 V-checks (V-A1 through V-A20) sequentially via `execute_sql`. If all V-checks pass, close cc-0017a Wave 0a with a 4-way atomic sync (sync_state v2.80 + action_list v2.80 + per-session file + dashboard PHASES if reconciled). If any V-check fails, hard-stop and roll back per Section 5.5.

**consequence_if_delayed:**
> Wave 0b authoring (cc-0017b — unified `friction.emit_event` function + new attach-or-create trigger + reopen 14-day logic + migration of 3 existing emit_* functions to thin wrappers) cannot begin without 0a's schema. Friction Register Consolidation Plan execution slips. The empirically-confirmed dedupe gap (22 events / 22 cases / max events per case = 1.00) continues: each new emission spawns its own case, the spine continues to accumulate noise faster than the operator can triage. Operator backlog of 444 dead items + 116 past-due + 141 fixer escalations + 10 pending compliance + 6 unacknowledged slot_alerts + 7 open `m.pipeline_incident` remains invisible because the routing waves (1–6) all depend on 0b which depends on 0a. Standing reconciliation daily fire (16 events/day) continues filling friction.event with non-deduped cases.

**cost_of_waiting:**
> Per-day cost is low (no acute customer-facing pain). But every wave skipped extends the plan timeline ~3–5 days. The 10-wave plan was scoped for ~10 weeks of execution; Wave 0a is the unblocker. Delay beyond ~5 days warrants reconsidering whether the lock on N = 14 days (§5.5 Clarification 1) or other amendments need re-verification before proceeding.

**current_evidence:**
> 1. v1 plan committed at `afc9306` (28.8 KB; ASCII 4-layer architecture visual; 25 decisions). 2. Amendments doc committed and signed at sha `29f04be5049f8b7ce6b1fadfd29b3fcf89472c2e` after pre-signature §5.5 commit `aeaddb28` and 4-way sync close (32 decisions + 2 clarifications). 3. 3 independent LLM reviews on v1 + 4th pre-signature ChatGPT cross-check; 10 of 11 reviewer findings incorporated; 2 acknowledged v2 scope; 0 rejected. 4. PK explicit approval recorded in §9 of amendments doc 2026-05-18 Sydney evening. 5. Empirical state at v2.79: `friction.case` row count 22, all with `triage_state != 'duplicate'` and currently no `resolved_at` column (cases functionally open); `friction.event` rows 22, all attached to a case via case_id. 6. Amendment A explicitly locks 0a as "additive only, reversible by drop-if-exists" + "NO behavioural change". 7. The new function `fn_compute_dedupe_fingerprint_v1` is `IMMUTABLE` and has been spec'd matching Amendment B verbatim. 8. Backfill uses the same function — single source of truth across 0a and 0b. 9. Partial unique index per Amendment B verbatim. 10. Grants pattern matches cc-0014's role access matrix. 11. Pre-flight P1–P12 (Section 5.1) verifies no naming collisions and current state matches expectations. 12. Rollback is clean (Section 5.5: DROP COLUMN + DROP FUNCTION + DROP TABLE in dependency order).

**known_weak_evidence:**
> 1. Wave 0a has not been tested anywhere live except via these V-checks. Single-operator scope. 2. The 22 existing events have `dedupe_fingerprint` in md5 format (from cc-0014), but the canonical format going forward is sha256 (Amendment B). Backfilled case fingerprints are sha256-derived from canonical inputs. Event fingerprints remain md5 (immutable historical facts). When Wave 0b's `emit_event` fires for a future event matching one of the 22 logical problems, the new event's sha256 fingerprint will match the case's backfilled sha256 fingerprint and dedupe will attach correctly — but this is theoretical until 0b ships and is exercised in production. 3. The 4 new tables (especially `emission_rule_history`) sit empty until Wave 0b (rule rows) and Wave 2 (notification policy rows) populate them. Empty tables are not a defect, but they are a 0–4 week "dead schema" window. 4. The migration's inline DO-block hard-stop (Step 5) catches duplicate fingerprints among open cases before index CREATE, but if the backfill produces a single row with NULL fingerprint that the assertion doesn't catch, the index CREATE proceeds and works (NULLs are distinct). Acceptable behaviour — Wave 0b backfills any 0a→0b transition NULLs. 5. The `friction.case.dedupe_fingerprint` column is nullable in 0a; the NOT NULL constraint is deferred to Wave 0c. A misbehaved future caller could insert NULL between 0a and 0c — but only the existing `fn_promote_event_to_case` writes to `friction.case` today, and it does so with the new column as NULL (default). Wave 0b's brief will plan the NULL backfill explicitly. 6. The `friction-verification-daily` pg_cron job continues to run unchanged but might benefit from extending to verify the new tables' integrity over time. Out of scope here; Wave 0b can add it. 7. The new `friction.fn_compute_dedupe_fingerprint_v1` is granted EXECUTE to authenticated. Future client-side code could call it to test what fingerprint a hypothetical event would produce. This is intentional (transparency) but represents a small surface area increase. No information leak — the function takes inputs and produces a hash, no DB reads.

**default_action:**
> If D-01 returns `partial` with type-(b) substantive findings: address each in a v1.1 patch to this brief (modelled on cc-0014 v1.1 patch pattern), re-fire D-01. If D-01 returns `partial` with type-(c) generic consistency-bias only: proceed to apply per the satisfy-corrected-action path (Path A) with explicit rationale in the close-the-loop UPDATE. If D-01 returns `escalate=true` with material concerns: hard-stop, address, re-fire. If D-01 approval is delayed > 5 days from authoring: re-verify locked decisions (especially Amendment B canonical format + Amendment G column set) against any inter-session schema drift before proceeding.

---

## 7. Post-apply commitments

### Pass path (all 20 V-checks PASS)

- Close cc-0017a with 4-way atomic sync:
  - `docs/00_sync_state.md` v2.80: cc-0017a CLOSED-APPLIED; Wave 0b execution gate now open
  - `docs/00_action_list.md` v2.80: cc-0017a moved from Active P1 rank 1 to Closed; cc-0017b authoring promoted to P1 rank 1
  - `docs/runtime/sessions/YYYY-MM-DD-cc-0017a-applied.md`: per-session detail file
  - `app/(dashboard)/roadmap/page.tsx` in invegent-dashboard: PHASES + lastUpdated (or 33rd consecutive deferral if PK directs)
- Close-the-loop UPDATE on `m.chatgpt_review` for the D-01 fire (status='resolved', action_taken describes the satisfy-corrected-action or full-approval path)
- Update memory entry if any new lessons surface
- Wave 0b authoring may begin (cc-0017b brief)

### Fail path (any hard-stop)

- Run rollback SQL from Section 5.5
- Verify post-rollback state matches cc-0014 v1.1 baseline (re-run pre-flight P1–P12; should all return to pre-migration values)
- Author v1.1 patch to this brief addressing the specific failure
- Re-fire D-01

### What this brief does NOT unlock

- Wave 0b execution (requires cc-0017b authoring + D-01 + apply)
- Any new emitter (compliance, doctor, sentinel, slot_alerts, token) wiring — Waves 1–6
- Telegram lifecycle trigger — Wave 2 (cc-0023)
- Pool view — Wave 7 (cc-0015 re-scoped)
- Evidence/attachments — Wave 8 (cc-0016)
- ai_diagnostic investigation — Wave 9 (cc-0024)
- m.pipeline_incident historical mode — Wave 10 (cc-0025)

### What this brief enables

- Wave 0b authoring with foundational schema in place
- Future per-source emission_rule registration (no DDL needed; just `INSERT INTO friction.emission_rule`)
- Future notification policy seeding (no DDL needed)
- Future `emit_event` function calls against the canonical fingerprint formula
- Future operator UI columns (effort_level, first_viewed_at, triaged_at, triaged_by) ready for Wave 7 instrumentation

---

## 8. Open decisions deferred to Wave 0b / 0c

These are flagged here so they're not forgotten at execution; they do not affect 0a's apply.

1. **emit_event signature finalisation.** v1 plan §6.7 shows sketch with 8 parameters. Amendment E adds `p_severity_override` + `p_dynamic_context`. cc-0017b finalises the exact parameter set + return shape.
2. **emission_rule.problem_key_formula representation.** v1 plan §5 Decision 5 says "free text in v1; structured DSL is v2". Confirm in cc-0017b that 0b accepts the free-text formula as documentation only (computed by detector code, not evaluated by emit_event).
3. **Trigger replacement strategy.** cc-0017b decides whether to DROP `fn_promote_event_to_case` cleanly and CREATE the new trigger, or rename + create + verify + drop. v1 plan §4 implies clean replacement; concurrency tests in 0b verify no in-flight emit during the swap.
4. **NULL `dedupe_fingerprint` backfill on cases created 0a → 0b.** cc-0017b includes a backfill step at start of its migration: `UPDATE friction.case c SET dedupe_fingerprint = ... FROM friction.event e WHERE c.case_id = e.case_id AND c.dedupe_fingerprint IS NULL` analogous to Step 5 here. Expected row count: 0–5 depending on time gap between 0a and 0b apply dates.
5. **Wave 0c timing.** v1 plan implies 0a → 0b → 0c are tightly sequenced. cc-0017c may be batched with 0b if 0b has runway, or stand alone if 0c's REVOKE + CHECK drop + NOT NULL warrant their own D-01 review (recommend separate D-01 since 0c is constraint-class).

---

## 9. Lessons reference

This brief follows the established baseline:

- **L33** — Event trigger pre-flight survey mandatory. Section 5.1 P10 inventories existing triggers; migration adds no triggers.
- **L34** — Trigger filter audit. Not applicable in 0a (no triggers added).
- **L35** — `INSERT … ON CONFLICT DO UPDATE` for k.* registry rows. Not applicable in 0a (no k.* writes; future Wave 0b uses ON CONFLICT against `case_open_dedupe_uniq`).
- **L40** — TypeScript compile checks cannot validate Supabase `.select(...)` projections. Not applicable (no TS this brief).
- **L41** — Chat-side MCP commits can drift local deploy machine. Not applicable (no local deploy in 0a).
- **L46 (Evidence Gate)** — D-01 fields in Section 6 separate strong vs weak evidence, list known weak evidence explicitly.
- **L58 (baseline v2.76)** — Atomic `push_files` for 4-way sync close. Will apply at close-the-loop.
- **L62 (baseline-eligible v2.77)** — Type-(b) vs type-(c) pushback classification on D-01 partial. Default-action explicitly distinguishes them.
- **L-v2.78-a (watcher → promotion-eligible v2.79)** — Reviewer convergence is high-signal. Section 6 known_weak_evidence accepts that single-reviewer (1 of 3) findings have been pressure-tested and merit material weight only where confirmed.

---

## 10. Brief authoring metadata

- **Authored in chat session 2026-05-18 Sydney evening.** Single sitting; v1 plan + amendments + cc-0014 brief all read first.
- **Production mutations during authoring: 0.**
- **D-01 fires during authoring: 0** (authoring is pre-execution).
- **Commits this session containing this brief: 1.**
- **Subsequent expected sessions:** (a) D-01 fire + review + decision; (b) apply_migration + V-A1–V-A20 + 4-way sync close.
- **Estimated execution session length:** ~1.5–2 hours (pre-flight → D-01 → apply → 20 V-checks → cleanup → 4-way sync).

---

*Brief cc-0017a v1.0. Authored 2026-05-18 Sydney evening. Awaiting D-01 on Wave 0a foundational schema apply.*
