# Brief cc-0010A — `r.*` second-wave DDL foundation + `r.compact_raw_json` helper + `r.expected_publication.matched_match_id` FK re-add + `r.matcher_config` global default + `k.*` catalog UPSERTs

**Created:** 2026-05-12 Sydney
**Last patched:** 2026-05-12 Sydney (v1.2 — CCD corrections + arithmetic cleanup + strengthened cross-schema PK-column probe)
**Author:** chat (Claude)
**Executor:** chat (ChatGPT-operated) — Supabase MCP `apply_migration`
**Parent brief:** `docs/briefs/cc-0010-r-reconciliation-evidence-and-matcher.md` commit `cfee0814` (split via L48 Atomicity Gate 2026-05-12)
**Sibling sub-briefs:** cc-0010B (`ice-evidence-materialiser` end-to-end), cc-0010C (`reconciliation-matcher` end-to-end)

**Stage count:** 1 (Stage A only — DDL foundation). No Stages B–E.

**Status:** drafted v1.2 — **planning + documentation only.** No `apply_migration`, no D-01 fire, no production mutation until the stage's gate cycle clears (pre-flight re-verify → D-01 → PK approval phrase → apply → V-checks → close-the-loop).

**Authority:** PRV-0 design lock v2 — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `6e989517ceaf600e1373f7f319ab5b7d5c2c7147` blob `3b5f382096abfa7ac5e0aff4bc4bdd327e95d6f7`.
**Source design sections:** PRV-0 v2 §3.4 (r.ice_publication_evidence), §3.5 (r.platform_observation), §3.6 (r.platform_manual_observation), §3.7 (r.reconciliation_match), §3.9 (r.platform_observer_health), §4.3 (r.compact_raw_json), §6.3 (r.matcher_config), §8.3 (cc-0010 scope contract).
**Lineage:** cc-0010 v1 parent brief at `cfee0814` — split decision recorded at parent-brief top. Inherits cc-0009 v2.1 outputs (commit `ae301a92`, result `0f6873f8`): `r.*` schema live; `r.expected_publication` 84 rows; `r.reconciliation_run` 4+ rows; `r.normalise_text` + `r.to_sydney_local_date` helpers in place; `cron job 82 cadence_rule_generator_daily` firing.

---

## Patch history

- **2026-05-12 Sydney — v1** (initial draft; planning only). Authored after PK split-approval of cc-0010 v1 via L48 Atomicity Gate. Scope = pure DDL foundation. Stages B–E live in cc-0010B and cc-0010C as separate sub-briefs.
- **2026-05-12 Sydney — v1.1 — CCD corrections** (planning only). CCD review surfaced 2 hard defects + chat-added 1 secondary correction:
  1. Removed invalid `r.platform_observation.is_stale` STORED GENERATED column using `now()` (immutability violation). Replaced partial-WHERE-`is_stale=false` index with plain `platform_obs_recent` index on `(client_id, platform, observed_at DESC)`. Freshness is now a query-time consumer-side predicate.
  2. Replaced `r.matcher_config UNIQUE (client_id, platform)` with PG15+ `UNIQUE NULLS NOT DISTINCT (client_id, platform)`. Default Postgres NULL-distinct semantics would have allowed duplicate `(NULL, NULL)` global rows.
  3. (chat-added) Partial-index alternative using `WHERE observed_at >= now() - interval '24 hours'` was also rejected for the same volatility reason as #1; plain timestamp index is correct.
  4. Added §1.10 PG15 version probe (NULLS NOT DISTINCT requires PG15+).
  5. Added §1.9 cross-schema FK target probe (verifies 7 FK target tables exist before Stage A apply).
  6. Strengthened V1 (6 explicit assertions) + V6 (`column_purpose ILIKE '%L38 candidate empirically vindicated%'` hard-fail clause).
  7. Updated column counts: `r.platform_observation` 17 → 16 (no `is_stale`); total `k.column_registry` rows = **86** (17+16+17+16+10+10).
- **2026-05-12 Sydney — v1.2 — arithmetic cleanup + strengthened PK-column probe** (planning only). v1.1 briefly questioned the +86 total after removing `is_stale`; re-audit confirms +86 because `r.ice_publication_evidence` remains 17 columns and `r.platform_observation` is now 16 columns. v1.2 also strengthens §1.9 cross-schema probe to verify actual PRIMARY KEY columns via `pg_constraint` (CCD-provided shape) rather than just column existence in `information_schema.columns`.

---

## Investigation record

**Trigger:** cc-0010 v1 brief failed L48 Atomicity Gate (2 of 3 questions indicated split). PK approved 3-way split into A/B/C 2026-05-12. cc-0010A is the foundation that cc-0010B and cc-0010C build on: without the 6 new tables + FK + helper + default config row, neither EF can be authored or run.

**Why now:** cc-0010B + cc-0010C cannot begin authoring until the schema they read/write exists. cc-0010A is the unblocking step. cc-0010A is also the smallest possible incremental change — single migration, chat-only actor, no EF / cron / invocation surface — making it the cleanest first live test of the v2.66 process upgrades (L44 Runtime Proof Pre-flight + L45 Post-mutation truth check + L48 Atomicity Gate result).

**Delivers (when Stage A completes):**

1. 6 new tables in schema `r`:
   - `r.ice_publication_evidence` (PRV-0 §3.4) — empty (17 cols)
   - `r.platform_observation` (PRV-0 §3.5) — empty (16 cols; **no `is_stale` per CCD correction v1.1**)
   - `r.platform_manual_observation` (PRV-0 §3.6) — empty (17 cols)
   - `r.reconciliation_match` (PRV-0 §3.7) — empty (16 cols)
   - `r.platform_observer_health` (PRV-0 §3.9) — empty (10 cols; `is_healthy` GENERATED with immutable `=0` expression — retained)
   - `r.matcher_config` (PRV-0 §6.3) — 1 row (global default) (10 cols; **UNIQUE NULLS NOT DISTINCT per CCD correction v1.1**)
2. 1 new helper function: `r.compact_raw_json(jsonb) RETURNS jsonb`, IMMUTABLE.
3. 1 ALTER TABLE re-adding deferred FK: `r.expected_publication.matched_match_id REFERENCES r.reconciliation_match(reconciliation_match_id) ON DELETE SET NULL` (L38 candidate → empirical vindication).
4. 1 UPDATE on `k.column_registry` flipping `is_foreign_key=true` for `r.expected_publication.matched_match_id` post FK ALTER.
5. Doc-catalog rows in `k.table_registry` (6 UPSERTs) + `k.column_registry` (UPSERTs across all 6 tables totalling **86 rows**, trigger-aware ON CONFLICT per L35).
6. `r.matcher_config` 1 global default row (NULL client_id, NULL platform, `minutes_late_tolerance=60`, `caption_prefix_length=60`, `same_day_window_hours=24`, `fuzzy_levenshtein_threshold=0.850`).
7. `pg_trgm` extension installed if missing (required by `gin_trgm_ops` indexes on `r.platform_observation` and `r.platform_manual_observation`).

**Does NOT deliver (carried to cc-0010B and cc-0010C; out of cc-0010A scope):**

- `ice-evidence-materialiser` Edge Function source, deploy, cron, or invocation → cc-0010B.
- `reconciliation-matcher` Edge Function source, deploy, cron, or invocation → cc-0010C.
- Tier 1–5 matching logic → cc-0010C (Tier 1 only).
- Any write to `r.ice_publication_evidence`, `r.platform_observation`, `r.platform_manual_observation`, `r.reconciliation_match`, or `r.platform_observer_health` beyond table creation → cc-0010B/C.
- Any cron schedule beyond cc-0009 cron job 82.
- Wiring of `r.matcher_config` into `cadence-rule-generator` EF (see Critical clarification below).
- `audit.session_lock` table or any L47 Path B work (separate brief).

**Critical clarification — `r.matcher_config` is forward-looking only:**

Creating `r.matcher_config` does **NOT** wire the existing cc-0009 `cadence-rule-generator` EF to read it. That EF currently remains on its deployed/hardcoded tolerance behaviour (no `r.matcher_config` read in source code at commit `cfee0814`-era pipeline). Wiring `cadence-rule-generator` to read `r.matcher_config` is a future cc-NNNN brief (likely cc-0011 or later), **not cc-0010A**. cc-0010C (matcher) will be the first consumer of `r.matcher_config` via its Tier 1 `minutes_late_tolerance` lookup.

**Class:** Build-class brief, single-stage, single-actor.

---

## Lineage (PK directive 2026-05-12)

This brief inherits directly from cc-0010 v1 parent brief at `cfee0814` and transitively from cc-0009 v2.1.

1. **`r.*` schema is live**: cc-0009 Stage A applied `cc_0009_r_schema_and_helpers`. cc-0010A references; does NOT re-create.
2. **2 existing r.* tables** (cc-0009): `r.reconciliation_run` and `r.expected_publication`.
3. **2 existing r.* helpers** (cc-0009): `r.normalise_text` (R7 narrowed contract; no expansion in cc-0010A) and `r.to_sydney_local_date`.
4. **Existing FK pattern**: `r.expected_publication.matched_match_id` declared as bare `uuid` in cc-0009 per CCH R10 cross-brief FK deferral (L38 candidate). cc-0010A Stage A re-adds the FK after `r.reconciliation_match` is created in the same transactional unit. **L38 candidate empirical vindication occurs at cc-0010A Stage A close.**
5. **k.* registry pattern** (L34 + L35 from cc-0009): trigger `trg_k_registry_sync_on_create_table` fires on each CREATE TABLE, auto-inserting stub rows; brief UPSERTs upgrade in-place via `INSERT ... ON CONFLICT DO UPDATE`.
6. **Frozen briefs**: cc-0009 v2.1 brief at commit `ae301a92` remains FROZEN (ICE-PROC-001 §9.1). cc-0010A does not mutate any prior brief. Parent brief cc-0010 v1 at `cfee0814` marked SUPERSEDED-BY but body preserved.

---

## Blast radius

**Direct write surface:**

- 6 new tables in schema `r`: all created with 0 rows except `r.matcher_config` (1 INSERT).
- 1 new helper function in `r`: `r.compact_raw_json` (idempotent CREATE OR REPLACE).
- ALTER on `r.expected_publication` ADDing FK constraint for `matched_match_id`; no row data changes.
- 1 UPDATE on `k.column_registry` flipping `is_foreign_key=true` for `r.expected_publication.matched_match_id`.
- 6 UPSERTs into `k.table_registry`.
- 86 UPSERTs into `k.column_registry` across all 6 new tables (trigger pre-inserts stubs; brief upgrades in-place per L35).
- `CREATE EXTENSION IF NOT EXISTS pg_trgm` if not already present.

**Read-only surface** (pre-flight only):

- `information_schema.schemata` / `tables` / `routines` / `columns`.
- `pg_constraint`, `pg_event_trigger`, `pg_proc`, `pg_namespace`, `pg_class`, `pg_extension`, `pg_attribute`.
- `r.expected_publication` (count + matched_match_id null-check).
- `r.reconciliation_run` (count).
- `k.table_registry` + `k.column_registry`.
- `supabase_migrations.schema_migrations`.

**No read or write to** `c.*`, `f.*`, `t.*`, `a.*`, `m.*` schemas (writes). No `vault.*` access. No `cron.*` access.

**Indirect risk catalog (10 items):**

1. **FK ALTER fails on existing rows with non-null `matched_match_id`** — verified at §1.1 pre-flight (`ep_rows_with_match_id = 0`). cc-0009 Stage E produced 0 matched rows. Risk: drift between pre-flight and apply (~60s window). Mitigation: pre-flight re-run immediately before apply.
2. **k.column_registry UPDATE race with trigger auto-insert** — trigger fires on CREATE TABLE only, not ALTER TABLE. UPDATE on pre-existing row from cc-0009 §3.6 is plain UPDATE. No race.
3. **`r.compact_raw_json` IMMUTABLE assertion fails** — PL/pgSQL body uses `FOREACH ... LOOP` over a hardcoded text array. No side effects, no time-dependent functions, no random functions. PostgreSQL accepts. Mitigation: V3 explicitly tests volatility.
4. **`pg_trgm` extension missing on the target database** — required by GIN indexes on `caption_normalised` in `r.platform_observation` + `r.platform_manual_observation`. Mitigation: migration includes `CREATE EXTENSION IF NOT EXISTS pg_trgm` as **first statement** in transaction. Idempotent.
5. **k.* registry UPSERT conflicts** — trigger pre-inserts 6 stub rows in `k.table_registry` + per-column stubs in `k.column_registry`; brief UPSERTs upgrade in-place via ON CONFLICT DO UPDATE (L35 pattern proven across cc-0008/cc-0009). Mitigation: explicit ON CONFLICT clauses.
6. **`r.matcher_config` global default INSERT conflicts on re-apply** — uses `ON CONFLICT (client_id, platform) DO NOTHING` against `UNIQUE NULLS NOT DISTINCT` constraint. Re-apply: 0 rows inserted (correct). Without NULLS NOT DISTINCT (v1 defect), re-apply would have inserted a duplicate `(NULL, NULL)` row. **CCD correction v1.1 prevents silent duplicate-global-default state.** Mitigation: PG15 version probe §1.10 + V1 row-count assertion.
7. **PRV-0 §3.6 inline partial UNIQUE constraint** — PostgreSQL does NOT support inline `UNIQUE (...) WHERE ...` for table constraints; must use `CREATE UNIQUE INDEX ... WHERE ...` instead (semantically equivalent). Reflected in §2.3 below.
8. **Single-transaction migration size** — Stage A migration body is ~600 lines of SQL. PostgreSQL has no hard line limit. Migration is one logical unit; splitting would create intermediate states.
9. **Cross-schema FK targets missing** — if any of `m.post_draft`, `m.post_publish_queue`, `m.post_publish`, `m.slot`, `c.client`, `r.expected_publication`, `r.reconciliation_run` is missing or lacks its expected PK column, Stage A fails with cryptic error. Mitigation: §1.9 PK-column probe halts before apply.
10. **Stored generated column volatility** (CCD-caught defect v1.1) — `STORED GENERATED with now()` rejected by Postgres at table creation. cc-0010A v1.1 removed `is_stale` entirely; freshness is query-time predicate. Partial-index-with-`now()` rejected for same reason. Plain index `platform_obs_recent (client_id, platform, observed_at DESC)` supports the dominant query pattern.

**Cost-of-waiting:** Low. cc-0010B + cc-0010C are blocked on cc-0010A completion. Each day cc-0010A is delayed = +1 day to cc-0010C close = +1 day to PRV-1 close gate evaluation. No external client impact.

---

## Source context

- **PRV-0 v2 design lock** — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `6e989517` blob `3b5f3820`.
- **cc-0010 v1 parent brief** — `docs/briefs/cc-0010-r-reconciliation-evidence-and-matcher.md` commit `cfee0814`. Split decision note section at top.
- **cc-0009 v2.1 brief** — `docs/briefs/cc-0009-r-schema-and-cadence-rule-generator.md` commit `ae301a92`.
- **cc-0009 result file** — `docs/briefs/results/cc-0009-r-schema-and-cadence-rule-generator.md` SHA `0f6873f8`.
- **`r.expected_publication`** — 84 rows post-cc-0009 Stage E.
- **`r.reconciliation_run`** — 4+ rows post-cc-0009 Stage E.
- **`k.table_registry` + `k.column_registry`** — doc-catalog targets per L34.
- **`m.chatgpt_review`** — D-01 audit trail (1 D-01 fire expected for cc-0010A).
- **L33+L34+L35+L36+L37+L38+L41** — cc-0008+cc-0009 reified lessons; carry forward.
- **L42+L43** — cc-0009 NEW candidates; not exercised in cc-0010A (no cron, no EF invocation).
- **L44+L45+L48** — v2.66 baselines; cc-0010A is the first live exercise of each.
- **L46** — v2.66 baseline; will activate if D-01 returns `escalate=true`.
- **L62** — wording unchanged at pre-cc-0010A gating.
- **`docs/runtime/cc_stage_template.md` sha `5657b69e`** — stage template baseline.
- **`docs/runtime/mcp_review_protocol.md` sha `9bd5d3fa`** — Evidence Gate (L46).

---

## Scope

**In scope:**

| Component | Type | Apply method |
|---|---|---|
| `CREATE EXTENSION IF NOT EXISTS pg_trgm` | DDL | `apply_migration cc_0010a_r_evidence_matcher_schema_foundation` (single transactional unit). First statement. |
| 6 `CREATE TABLE r.*` statements | DDL | same migration |
| 1 `CREATE OR REPLACE FUNCTION r.compact_raw_json` | DDL | same migration |
| 1 `ALTER TABLE r.expected_publication ADD CONSTRAINT ... FK` | DDL | same migration |
| 1 `INSERT INTO r.matcher_config` (global default) | DML | same migration |
| 6 `INSERT INTO k.table_registry ... ON CONFLICT DO UPDATE` | DML | same migration |
| 86 `INSERT INTO k.column_registry ... ON CONFLICT DO UPDATE` | DML | same migration |
| 1 `UPDATE k.column_registry SET is_foreign_key=true` | DML | same migration |

**Out of scope (deferred per PRV-0 §8.3 + parent-brief split):**

- `ice-evidence-materialiser` EF source, deploy, cron, invocation → cc-0010B.
- `reconciliation-matcher` EF source, deploy, cron, invocation → cc-0010C.
- Tier 2–5 matcher logic.
- `cadence-rule-generator` EF source modification.
- `r.matcher_config` wiring into `cadence-rule-generator` EF.
- `audit.session_lock` table or any L47 Path B work.
- Manual observation CSV import.
- `r.cadence_drift_log`, `cadence-drift-checker`, materialised views (cc-0011).
- Per-platform observer EFs (PRV-2/3/4).
- Dashboard surfaces.
- `r.normalise_text` expansion (cc-0009 R7 lock).
- 5-row close-the-loop batch (UNBLOCKED v2.61; still 8 sessions overdue; PK directive: clear pre-cc-0010A apply).
- F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY (separate; folded into cc-0010B/C).
- Dashboard PHASES reconciliation (22nd consecutive deferral).
- F-CRON-AUTO-APPROVER-SECRET-INLINE.

---

## Allowed actions

- Read-only `SELECT` against `c.*`, `r.*`, `m.*`, `k.*`, `pg_*`, `information_schema.*`, `supabase_migrations.schema_migrations` for pre-flight + verification.
- 1 `ask_chatgpt_review` D-01 fire (action_type=sql_destructive likely; plan_review fallback per cc-0009 KOI-02 if MCP routing requires).
- 1 `apply_migration` named `cc_0010a_r_evidence_matcher_schema_foundation` containing the full Stage A body in a single transactional unit per memory standing rule.
- Up to 3 retry attempts on each V-check (network/timeout only).
- 1 `m.chatgpt_review` UPDATE post-apply (close-the-loop, status='resolved' per L36). **Per R5 carried from cc-0009, this is the ONLY permitted `m.*` write in cc-0010A.**
- 1 commit creating `docs/briefs/results/cc-0010A-r-reconciliation-ddl-foundation.md` at Stage A close.
- 1 commit per 4-way sync close.

## Forbidden actions

- **No `apply_migration` before D-01 returns clean `agree` + PK explicit approval phrase.**
- **No `execute_sql` for any DDL** (memory standing rule).
- **No plain `INSERT INTO k.table_registry` or `INSERT INTO k.column_registry`** (L35). All k.* writes via `INSERT ... ON CONFLICT DO UPDATE`, except the one UPDATE for `matched_match_id` FK flag which is plain UPDATE on a pre-existing row from cc-0009 §3.6.
- **No EF deploy** — out of cc-0010A scope.
- **No EF source authoring** — out of cc-0010A scope.
- **No cron schedule creation or modification** — out of cc-0010A scope.
- **No invocation of any EF** — out of cc-0010A scope.
- **No materialiser logic** anywhere in cc-0010A.
- **No matcher logic** anywhere in cc-0010A.
- **No modification of `cadence-rule-generator` EF source.**
- **No mutation of cc-0009 brief** (frozen at `ae301a92`).
- **No production DB write during authoring** (this session and any session that does not have explicit PK approval-to-apply).
- **No `audit.session_lock` table creation** — L47 Path B is a separate brief.
- **No write to `c.*`, `f.*`, `t.*`, `a.*`, `m.*` (beyond R5 close-the-loop)**.
- **No `r.*` table creation beyond the 6 specified.**
- **No `r.*` function creation beyond `r.compact_raw_json`.**
- **No DDL deviation from PRV-0 v2 §3.4/§3.5/§3.6/§3.7/§3.9/§4.3/§6.3** unless §1 pre-flight surfaces a genuine blocker. **Exception: CCD-corrected divergences from PRV-0 v1 text** — no `is_stale` STORED column (immutability requirement of `now()`), `UNIQUE NULLS NOT DISTINCT` instead of plain UNIQUE on `r.matcher_config` — both documented in §2.
- **No proceeding past D-01 if verdict != `agree`** with `proceed` (or PK explicit Lesson #62 type-(c) state-capture override; classified per L46).
- **No `m.*` writes beyond the single close-the-loop UPDATE.**
- **No direct push to `main` for any cc-0010A doc commit** unless PK separately approves (per CCH directive 2026-05-12: direct-to-main doc commit accepted for v1.2).
- **No D-01 fire until cc-0010A v1.2 is PK-approved-for-D-01** (per CCH directive 2026-05-12 commit-only-approval).

---

## §1. Pre-flight verification (read-only) — TO RUN BEFORE APPLY

All §1.x sub-checks are read-only against production via Supabase MCP `execute_sql`. **Re-run immediately preceding apply (~60s window)** to confirm no drift (P1–P5 discipline per Lesson #61 / L44 baseline).

### 1.1 — cc-0009 outputs still in place (cross-brief verification)

```sql
SELECT
  EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name='r') AS schema_r_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='reconciliation_run') AS rr_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='expected_publication') AS ep_exists,
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='r' AND routine_name='normalise_text') AS fn_normalise_exists,
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='r' AND routine_name='to_sydney_local_date') AS fn_to_syd_exists,
  (SELECT COUNT(*) FROM r.expected_publication) AS ep_row_count,
  (SELECT COUNT(*) FROM r.reconciliation_run) AS rr_row_count,
  (SELECT COUNT(*) FROM r.expected_publication WHERE matched_match_id IS NOT NULL) AS ep_rows_with_match_id;
```

**Decision rule:** All booleans true; `ep_row_count >= 84`; `rr_row_count >= 4`; **`ep_rows_with_match_id = 0` (critical — FK ALTER would fail otherwise).**

### 1.2 — r.* table absence (cc-0010A targets must not pre-exist)

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'r'
  AND table_name IN (
    'ice_publication_evidence', 'platform_observation', 'platform_manual_observation',
    'reconciliation_match', 'platform_observer_health', 'matcher_config'
  );
```

**Decision rule:** 0 rows → PASS. Any row → HALT (prior partial apply).

### 1.3 — r.compact_raw_json absence

```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_schema='r' AND routine_name='compact_raw_json'
) AS fn_exists;
```

**Decision rule:** false → PASS. true → SURFACE for PK (CREATE OR REPLACE idempotent but pre-existence indicates external drift).

### 1.4 — Existing FK status on r.expected_publication.matched_match_id

```sql
SELECT con.conname, pg_get_constraintdef(con.oid) AS def
FROM pg_constraint con
JOIN pg_class t ON t.oid = con.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='r' AND t.relname='expected_publication'
  AND con.contype = 'f'
  AND pg_get_constraintdef(con.oid) LIKE '%matched_match_id%';
```

**Decision rule:** 0 rows → PASS. Any row → HALT (FK already added externally).

### 1.5 — Migration name uniqueness

```sql
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE name = 'cc_0010a_r_evidence_matcher_schema_foundation';
```

**Decision rule:** 0 rows → PASS. Any row → HALT (migration name collision).

### 1.6 — Event-trigger survey on `k.*` (L33+L34 carry from cc-0009 §1.6)

```sql
SELECT evtname, evtevent, evtenabled, pg_proc.proname AS function_name
FROM pg_event_trigger
JOIN pg_proc ON pg_proc.oid = pg_event_trigger.evtfoid
JOIN pg_namespace ns ON ns.oid = pg_proc.pronamespace
WHERE ns.nspname = 'k' AND pg_event_trigger.evtenabled IN ('O', 'R', 'A')
ORDER BY evtname;
```

**Decision rule:** Expect `trg_k_refresh_catalog` + `trg_k_registry_sync_on_create_table`; both `evtenabled` IN ('O','R','A'). Drift → HALT.

### 1.7 — `k.*` UNIQUE constraints (L34 carry from cc-0009 §1.7)

```sql
SELECT t.relname, c.conname, c.contype, pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='k' AND t.relname IN ('table_registry', 'column_registry')
  AND c.contype IN ('p','u','f')
ORDER BY t.relname, c.conname;
```

**Decision rule:** `uq_schema_table` UNIQUE `(schema_name, table_name)` on `k.table_registry`; `uq_table_column` UNIQUE `(table_id, column_name)` on `k.column_registry`; FK CASCADE. Drift → HALT.

### 1.8 — `pg_trgm` extension status

```sql
SELECT
  EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') AS pg_trgm_installed,
  (SELECT extversion FROM pg_extension WHERE extname = 'pg_trgm') AS pg_trgm_version;
```

**Decision rule (v1.1):**
- `pg_trgm_installed = true` → migration's `CREATE EXTENSION IF NOT EXISTS pg_trgm` is no-op. PASS.
- `pg_trgm_installed = false` → migration's first statement installs the extension. Apply continues. PASS.

Neither outcome blocks. Informational + execution-path-determining only.

### 1.9 — Cross-schema FK target PK-column probe (CCD-strengthened v1.2)

```sql
SELECT n.nspname || '.' || c.relname || '.' || a.attname AS pk_col
FROM pg_constraint con
JOIN pg_class c       ON c.oid = con.conrelid
JOIN pg_namespace n   ON n.oid = c.relnamespace
JOIN pg_attribute a   ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
WHERE con.contype = 'p'
  AND (n.nspname, c.relname) IN
      (('m','post_draft'),('m','post_publish_queue'),('m','post_publish'),
       ('m','slot'),('c','client'),('r','expected_publication'),
       ('r','reconciliation_run'))
ORDER BY pk_col;
```

**Expected exactly 7 rows:**

- `c.client.client_id`
- `m.post_draft.post_draft_id`
- `m.post_publish.post_publish_id`
- `m.post_publish_queue.post_publish_queue_id`
- `m.slot.slot_id`
- `r.expected_publication.expected_publication_id`
- `r.reconciliation_run.reconciliation_run_id`

**Decision rule (CCD-strengthened v1.2):** all 7 rows present with exact PK-column names matching. Any missing row OR any unexpected PK-column-name → **HALT** (FK target's actual PRIMARY KEY differs from cc-0010A FK reference; Stage A would fail with `constraint ... does not match column type` or `there is no unique constraint matching given keys`). This probe verifies *PRIMARY KEY-ness* via `pg_constraint.contype='p'`, not just column existence — stronger than v1.1's `information_schema.columns` shape.

### 1.10 — Postgres version probe (for NULLS NOT DISTINCT)

```sql
SELECT
  current_setting('server_version_num')::int AS server_version_num,
  current_setting('server_version') AS server_version;
```

**Decision rule:** `server_version_num >= 150000` (PG15+). If `< 150000` → **HALT** (NULLS NOT DISTINCT not supported; PK must scope a separate fallback brief — partial UNIQUE index with COALESCE sentinel or pre-INSERT trigger check). Supabase production runs PG15+; probe is a guard.

---

## §2. Proposed DDL — Stage A (single `apply_migration cc_0010a_r_evidence_matcher_schema_foundation`)

All DDL + helper function + ALTER FK + k.* registry UPSERTs + matcher_config default INSERT in ONE transactional unit per memory standing rule. Trigger fires at `ddl_command_end` of each `CREATE TABLE`, auto-inserting stub k.* rows; §3.6+§3.7 UPSERTs enrich in-place (L35).

### 2.0 `CREATE EXTENSION IF NOT EXISTS pg_trgm` (FIRST statement)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

Idempotent. Required by GIN indexes in §2.2 + §2.3. **Must be the FIRST statement of the migration body, before all CREATE TABLE statements.**

### 2.1 `r.ice_publication_evidence` (PRV-0 §3.4 verbatim) — 17 cols

```sql
CREATE TABLE IF NOT EXISTS r.ice_publication_evidence (
    ice_publication_evidence_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expected_publication_id      uuid NOT NULL REFERENCES r.expected_publication(expected_publication_id) ON DELETE CASCADE,
    pipeline_state               text NOT NULL CHECK (pipeline_state IN ('drafted','queued','attempted','published','failed')),
    post_draft_id                uuid REFERENCES m.post_draft(post_draft_id) ON DELETE SET NULL,
    post_publish_queue_id        uuid REFERENCES m.post_publish_queue(post_publish_queue_id) ON DELETE SET NULL,
    post_publish_id              uuid REFERENCES m.post_publish(post_publish_id) ON DELETE SET NULL,
    slot_id                      uuid REFERENCES m.slot(slot_id) ON DELETE SET NULL,
    platform_post_id             text,
    published_url                text,
    scheduled_for                timestamptz,
    published_at                 timestamptz,
    failure_reason               text,
    raw_evidence                 jsonb DEFAULT '{}',
    created_at                   timestamptz NOT NULL DEFAULT now(),
    updated_at                   timestamptz NOT NULL DEFAULT now(),
    created_by_run_id            uuid,
    updated_by_run_id            uuid,
    UNIQUE (expected_publication_id)
);

CREATE INDEX IF NOT EXISTS ice_evidence_state_recent
    ON r.ice_publication_evidence (pipeline_state, updated_at DESC);

CREATE INDEX IF NOT EXISTS ice_evidence_platform_post
    ON r.ice_publication_evidence (platform_post_id)
    WHERE platform_post_id IS NOT NULL;

COMMENT ON TABLE r.ice_publication_evidence IS 'cc-0010A: Authoritative evidence from ICE pipeline state. Empty at cc-0010A close; populated by ice-evidence-materialiser EF (cc-0010B). UNIQUE (expected_publication_id) means ICE evidence is exclusive per expected row.';
```

### 2.2 `r.platform_observation` (PRV-0 §3.5, CCD-corrected v1.1 — no `is_stale`) — 16 cols

```sql
CREATE TABLE IF NOT EXISTS r.platform_observation (
    platform_observation_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                 text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    platform_post_id         text NOT NULL,
    observed_at              timestamptz NOT NULL,
    published_at_observed    timestamptz,
    observed_local_date      date NOT NULL,
    caption_text             text,
    caption_normalised       text,
    media_count              int CHECK (media_count IS NULL OR media_count >= 0),
    has_video                boolean,
    permalink_url            text,
    raw_payload              jsonb DEFAULT '{}',
    fetch_run_id             uuid REFERENCES r.reconciliation_run(reconciliation_run_id) ON DELETE SET NULL,
    notes                    text,
    created_at               timestamptz NOT NULL DEFAULT now(),
    UNIQUE (platform, platform_post_id),
    CONSTRAINT platform_obs_observed_dates_consistent CHECK (
        published_at_observed IS NULL
        OR observed_at >= published_at_observed
    )
);

CREATE INDEX IF NOT EXISTS platform_obs_client_platform_date
    ON r.platform_observation (client_id, platform, observed_local_date);

CREATE INDEX IF NOT EXISTS platform_obs_caption_normalised
    ON r.platform_observation USING gin (caption_normalised gin_trgm_ops)
    WHERE caption_normalised IS NOT NULL;

CREATE INDEX IF NOT EXISTS platform_obs_recent
    ON r.platform_observation (client_id, platform, observed_at DESC);

COMMENT ON TABLE r.platform_observation IS 'cc-0010A: Observations from platform APIs. Empty at cc-0010A close; populated by PRV-2/3/4 observer EFs (not in cc-0010 scope). NOTE: no stored is_stale column — staleness is a consumer-side query-time predicate using observed_at < now() - interval ''24 hours''. STORED GENERATED with now() rejected at CCD review v1.1 (now() not immutable). Partial-index variants using now() in predicate also rejected for the same volatility reason. platform_obs_recent supports descending observed_at queries efficiently; consumers apply freshness filters at query time.';
```

### 2.3 `r.platform_manual_observation` (PRV-0 §3.6, partial UNIQUE via CREATE UNIQUE INDEX) — 17 cols

```sql
CREATE TABLE IF NOT EXISTS r.platform_manual_observation (
    platform_manual_observation_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                       uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                        text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    platform_post_id                text,
    permalink_url                   text,
    observed_local_date             date NOT NULL,
    published_at_observed           timestamptz,
    caption_text                    text,
    caption_normalised              text,
    media_count                     int CHECK (media_count IS NULL OR media_count >= 0),
    has_video                       boolean,
    raw_evidence_url                text,
    observation_method              text CHECK (observation_method IN ('csv_import','manual_form','screenshot','email_forward','phone_report')),
    confidence                      text CHECK (confidence IN ('high','medium','low')),
    notes                           text,
    submitted_by                    text NOT NULL,
    submitted_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_manual_obs_post_id_uniq
    ON r.platform_manual_observation (platform, platform_post_id)
    WHERE platform_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS platform_manual_obs_client_platform_date
    ON r.platform_manual_observation (client_id, platform, observed_local_date);

CREATE INDEX IF NOT EXISTS platform_manual_obs_caption_normalised
    ON r.platform_manual_observation USING gin (caption_normalised gin_trgm_ops)
    WHERE caption_normalised IS NOT NULL;

CREATE INDEX IF NOT EXISTS platform_manual_obs_recent
    ON r.platform_manual_observation (client_id, platform, submitted_at DESC);

COMMENT ON TABLE r.platform_manual_observation IS 'cc-0010A: Human-submitted observations. Empty at cc-0010A close; populated via PRV-2 brief (CSV import / manual form). PostgreSQL inline partial UNIQUE not supported; uses CREATE UNIQUE INDEX ... WHERE.';
```

### 2.4 `r.reconciliation_match` (PRV-0 §3.7 verbatim) — 16 cols

```sql
CREATE TABLE IF NOT EXISTS r.reconciliation_match (
    reconciliation_match_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expected_publication_id   uuid NOT NULL REFERENCES r.expected_publication(expected_publication_id) ON DELETE CASCADE,
    matched_evidence_kind     text NOT NULL CHECK (matched_evidence_kind IN ('ice','platform','manual','fuzzy_platform','fuzzy_manual','none')),
    matched_evidence_id       uuid,
    matched_match_tier        int NOT NULL CHECK (matched_match_tier BETWEEN 1 AND 5),
    matched_confidence        numeric(4,3) NOT NULL CHECK (matched_confidence BETWEEN 0.000 AND 1.000),
    delta_minutes_late        int,
    delta_caption_similarity  numeric(4,3),
    override_by               text,
    override_at               timestamptz,
    override_reason           text,
    matcher_run_id            uuid REFERENCES r.reconciliation_run(reconciliation_run_id) ON DELETE SET NULL,
    created_at                timestamptz NOT NULL DEFAULT now(),
    created_by_run_id         uuid,
    updated_at                timestamptz NOT NULL DEFAULT now(),
    updated_by_run_id         uuid,
    UNIQUE (expected_publication_id),
    CONSTRAINT reconcile_match_override_pair CHECK (
        (override_by IS NULL AND override_at IS NULL)
        OR (override_by IS NOT NULL AND override_at IS NOT NULL)
    ),
    CONSTRAINT reconcile_match_evidence_required_for_non_none CHECK (
        (matched_evidence_kind = 'none' AND matched_evidence_id IS NULL)
        OR (matched_evidence_kind <> 'none' AND matched_evidence_id IS NOT NULL)
    ),
    CONSTRAINT reconcile_match_tier_consistency CHECK (
        (matched_evidence_kind = 'ice'              AND matched_match_tier = 1)
        OR (matched_evidence_kind = 'platform'      AND matched_match_tier = 2)
        OR (matched_evidence_kind = 'manual'        AND matched_match_tier = 3)
        OR (matched_evidence_kind = 'fuzzy_platform' AND matched_match_tier = 4)
        OR (matched_evidence_kind = 'fuzzy_manual'  AND matched_match_tier = 5)
        OR (matched_evidence_kind = 'none')
    )
);

CREATE INDEX IF NOT EXISTS reconcile_match_evidence
    ON r.reconciliation_match (matched_evidence_kind, matched_evidence_id)
    WHERE matched_evidence_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS reconcile_match_override_audit
    ON r.reconciliation_match (override_at DESC)
    WHERE override_by IS NOT NULL;

COMMENT ON TABLE r.reconciliation_match IS 'cc-0010A: One row per expected_publication describing how it matched. Empty at cc-0010A close; populated by reconciliation-matcher EF (cc-0010C) Tier 1 only. Tiers 2-5 deferred to PRV-2/3/4. Manual override D-21 hard lock enforced at matcher level.';
```

### 2.5 `r.platform_observer_health` (PRV-0 §3.9, `is_healthy` GENERATED retained — immutable expression) — 10 cols

```sql
CREATE TABLE IF NOT EXISTS r.platform_observer_health (
    platform_observer_health_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                    uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                     text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    last_observed_at             timestamptz,
    last_successful_run_id       uuid REFERENCES r.reconciliation_run(reconciliation_run_id) ON DELETE SET NULL,
    last_failure_run_id          uuid REFERENCES r.reconciliation_run(reconciliation_run_id) ON DELETE SET NULL,
    last_failure_reason          text,
    consecutive_failure_count    int NOT NULL DEFAULT 0 CHECK (consecutive_failure_count >= 0),
    is_healthy                   boolean GENERATED ALWAYS AS (consecutive_failure_count = 0) STORED,
    updated_at                   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (client_id, platform)
);

CREATE INDEX IF NOT EXISTS platform_observer_health_unhealthy
    ON r.platform_observer_health (platform, consecutive_failure_count DESC)
    WHERE consecutive_failure_count > 0;

COMMENT ON TABLE r.platform_observer_health IS 'cc-0010A: Per-(client, platform) observer health summary. Empty at cc-0010A close; populated by PRV-2/3/4 observer EFs. is_healthy is STORED GENERATED with immutable expression (= 0); contrast with r.platform_observation which had a now()-based STORED GENERATED proposal that was rejected at CCD review v1.1.';
```

### 2.6 `r.matcher_config` (PRV-0 §6.3, CCD-corrected v1.1 — UNIQUE NULLS NOT DISTINCT) + 1 global default row INSERT — 10 cols

```sql
CREATE TABLE IF NOT EXISTS r.matcher_config (
    matcher_config_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                    uuid REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                     text CHECK (platform IS NULL OR platform IN ('facebook','instagram','linkedin','youtube')),
    minutes_late_tolerance       int NOT NULL DEFAULT 60 CHECK (minutes_late_tolerance >= 0),
    caption_prefix_length        int NOT NULL DEFAULT 60 CHECK (caption_prefix_length >= 10),
    same_day_window_hours        int NOT NULL DEFAULT 24 CHECK (same_day_window_hours >= 1),
    fuzzy_levenshtein_threshold  numeric(4,3) NOT NULL DEFAULT 0.850 CHECK (fuzzy_levenshtein_threshold BETWEEN 0.500 AND 1.000),
    notes                        text,
    created_at                   timestamptz NOT NULL DEFAULT now(),
    updated_at                   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT matcher_config_client_platform_key
        UNIQUE NULLS NOT DISTINCT (client_id, platform)
);

-- Global default row (PRV-0 §6.3 mandates 1 row at table creation)
INSERT INTO r.matcher_config (client_id, platform, notes)
VALUES (
    NULL,
    NULL,
    'cc-0010A global default — PRV-0 §6.3 verbatim defaults: minutes_late_tolerance=60, caption_prefix_length=60, same_day_window_hours=24, fuzzy_levenshtein_threshold=0.850. Forward-looking; not wired into cadence-rule-generator EF; cc-0010C reconciliation-matcher will be the first consumer via Tier 1 minutes_late_tolerance lookup.'
)
ON CONFLICT (client_id, platform) DO NOTHING;

COMMENT ON TABLE r.matcher_config IS 'cc-0010A: Tolerance defaults for reconciliation matcher. Lookup order: (client, platform) → (client, NULL) → (NULL, NULL). 1 global default row inserted at cc-0010A close. UNIQUE NULLS NOT DISTINCT (PG15+) enforces single (NULL, NULL) row — CCD correction v1.1 over default PG NULL-distinct semantics that would have allowed duplicate global rows. NOT wired into cadence-rule-generator EF — that wiring is a future cc-NNNN. cc-0010C matcher is the first consumer.';
```

### 2.7 `r.compact_raw_json` helper (PRV-0 §4.3 verbatim)

```sql
CREATE OR REPLACE FUNCTION r.compact_raw_json(j jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    keys_to_drop text[] := ARRAY['__internal_debug','request_headers','response_headers','full_html'];
    out jsonb := j;
    k text;
BEGIN
    IF j IS NULL OR jsonb_typeof(j) != 'object' THEN RETURN j; END IF;
    FOREACH k IN ARRAY keys_to_drop LOOP
        out := out - k;
    END LOOP;
    RETURN out;
END;
$$;

COMMENT ON FUNCTION r.compact_raw_json IS 'cc-0010A: PRV-0 §4.3 verbatim. Strips known-bulky internal-only keys from raw API payloads. Used by PRV-2/3/4 observer EFs when populating r.platform_observation.raw_payload. keys_to_drop list hardcoded; expansion in future revision when actual platform payloads inform real bulky keys.';
```

### 2.8 ALTER TABLE re-adding `r.expected_publication.matched_match_id` FK (L38 candidate empirical vindication)

```sql
ALTER TABLE r.expected_publication
    ADD CONSTRAINT expected_publication_matched_match_id_fkey
    FOREIGN KEY (matched_match_id)
    REFERENCES r.reconciliation_match(reconciliation_match_id)
    ON DELETE SET NULL;

COMMENT ON CONSTRAINT expected_publication_matched_match_id_fkey ON r.expected_publication IS 'cc-0010A Stage A re-adds FK deferred from cc-0009 §2.3 per L38 candidate cross-brief FK deferral pattern. Reference target r.reconciliation_match created in cc-0010A §2.4 (same Stage A migration transactional unit). ON DELETE SET NULL preserves expected_publication row when match record is deleted. L38 candidate → empirical vindication at cc-0010A Stage A close.';
```

**Dependency ordering within the single transactional Stage A migration:**

§2.0 (extension) → §2.1 → §2.2 → §2.3 → §2.4 (`r.reconciliation_match`, FK target) → §2.5 → §2.6 (table + INSERT default row) → §2.7 (helper function) → §2.8 (ALTER FK, references §2.4) → §3 (k.* UPSERTs + k.column_registry UPDATE).

The ALTER FK at §2.8 succeeds because §2.4 created the target table earlier in the same transaction.

---

## §3. Proposed DML — k.* registry UPSERTs + matched_match_id FK flag UPDATE

When Stage A `apply_migration` runs, 6 `CREATE TABLE r.*` statements each fire `trg_k_registry_sync_on_create_table` at `ddl_command_end`. The trigger inserts 6 stub `k.table_registry` rows + per-column stubs into `k.column_registry`. §3.6+§3.7 UPSERTs upgrade in-place (L35).

**§3.5 trigger interaction note:** Same as cc-0009 §3.1 + cc-0010 v1 §3.5 — trigger fires on each CREATE TABLE; UPSERT upgrades stub rows; `r.matcher_config` default INSERT is plain INSERT (not k.* table; not subject to trigger).

### 3.6 `k.table_registry` — 6 UPSERTs for the 6 new tables

Full UPSERT body in migration (carried from cc-0010 v1 §3.6 with the following CCD-corrected row updates):

- **r.platform_observation `rules_summary` field**: `'cc-0010A creates empty table. UNIQUE constraint = (platform, platform_post_id). No stored is_stale column (CCD correction v1.1 — now() not immutable for STORED GENERATED or partial-index predicates). Staleness is a consumer-side query-time predicate: observed_at < now() - interval ''24 hours''. Caption similarity uses gin_trgm_ops index. Stale rows do not match per D-12.'`
- **r.matcher_config `advisory` field**: `'cc-0010A introduces this table + 1 global default row enforced via UNIQUE NULLS NOT DISTINCT (PG15+ syntax — CCD correction v1.1 over default PG NULL-distinct semantics). Per-client overrides via future config admin paths.'`

All other rows verbatim from cc-0010 v1 §3.6.

### 3.7 `k.column_registry` — UPSERTs for all 6 new tables

CTE-driven pattern from cc-0009 §3.6 / cc-0010 v1 §3.7. Six CTE blocks (one per new table) + combined `INSERT...ON CONFLICT DO UPDATE`. Full CTE structure follows cc-0009 §3.6 verbatim shape; column purposes per column per table land in the migration body.

**Expected k.column_registry row counts at Stage A close:**

| Table | Columns |
|---|---:|
| r.ice_publication_evidence | 17 |
| r.platform_observation | 16 |
| r.platform_manual_observation | 17 |
| r.reconciliation_match | 16 |
| r.platform_observer_health | 10 |
| r.matcher_config | 10 |
| **TOTAL** | **86** |

**Re-audit note (v1.2):** v1.1 briefly questioned the total after removing `is_stale`; re-audit confirms +86 because `r.ice_publication_evidence` remains 17 columns and `r.platform_observation` is now 16 columns.

### 3.8 `k.column_registry` UPDATE for matched_match_id FK flag (post FK ALTER)

```sql
UPDATE k.column_registry
SET is_foreign_key = true,
    fk_ref_schema = 'r',
    fk_ref_table = 'reconciliation_match',
    fk_ref_column = 'reconciliation_match_id',
    column_purpose = REPLACE(column_purpose, 'FK deferred to cc-0010 ALTER TABLE (L38 candidate per R10)', 'FK added in cc-0010A Stage A ALTER TABLE (L38 candidate empirically vindicated)'),
    updated_at = now()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='r' AND table_name='expected_publication')
  AND column_name = 'matched_match_id';
```

**REPLACE pattern note:** If `column_purpose` text differs from cc-0009's exact phrasing, the REPLACE is a no-op on that fragment but still sets `is_foreign_key=true` + `fk_ref_*` fields. V6 enforces the post-UPDATE marker via ILIKE.

---

## §4. V-checks (pre-mutation expectation)

All V-checks run via Supabase MCP `execute_sql` (read-only) within ~60s of apply completion.

### V1 — Strengthened (6 explicit assertions)

```sql
SELECT
  -- Tables
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='r' AND table_name IN ('ice_publication_evidence','platform_observation','platform_manual_observation','reconciliation_match','platform_observer_health','matcher_config')) AS r_tables_count,
  -- Helper
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='r' AND routine_name='compact_raw_json') AS fn_compact_raw_json_present,
  -- Extension
  EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_trgm') AS pg_trgm_installed,
  -- FK on matched_match_id
  EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class t ON t.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='r' AND t.relname='expected_publication'
      AND con.contype='f'
      AND pg_get_constraintdef(con.oid) LIKE '%matched_match_id%REFERENCES r.reconciliation_match%'
  ) AS matched_match_id_fk_present,
  -- matcher_config total + global default
  (SELECT COUNT(*) FROM r.matcher_config) AS matcher_config_total_rows,
  (SELECT COUNT(*) FROM r.matcher_config WHERE client_id IS NULL AND platform IS NULL) AS matcher_config_global_default_rows;
```

**Pass rule (all must hold):**

- `r_tables_count = 6`
- `fn_compact_raw_json_present = true`
- `pg_trgm_installed = true`
- `matched_match_id_fk_present = true`
- `matcher_config_total_rows = 1`
- `matcher_config_global_default_rows = 1`

### V2 — Per-table column counts

| Table | Expected columns |
|---|---:|
| r.ice_publication_evidence | 17 |
| r.platform_observation | 16 *(no is_stale; CCD correction v1.1)* |
| r.platform_manual_observation | 17 |
| r.reconciliation_match | 16 |
| r.platform_observer_health | 10 *(is_healthy uses immutable `=0` expression — kept)* |
| r.matcher_config | 10 |

### V3 — Helper function signatures

```sql
SELECT routine_schema, routine_name, data_type AS return_type, security_type, is_deterministic
FROM information_schema.routines
WHERE routine_schema='r';
```

**Pass:** 3 functions in `r` schema (existing `r.normalise_text` + `r.to_sydney_local_date` from cc-0009; new `r.compact_raw_json`). All IMMUTABLE.

### V4 — r.compact_raw_json empirical correctness

```sql
SELECT
  r.compact_raw_json(NULL)::text                                                AS test_null,
  r.compact_raw_json('null'::jsonb)::text                                       AS test_jsonb_null,
  r.compact_raw_json('[1,2,3]'::jsonb)::text                                    AS test_array,
  r.compact_raw_json('{"keep": 1, "__internal_debug": "x"}'::jsonb)::text       AS test_strip_one,
  r.compact_raw_json('{"a": 1, "request_headers": {"x": 1}, "response_headers": [], "full_html": "<html>"}'::jsonb)::text AS test_strip_multiple,
  r.compact_raw_json('{"keep": 1, "other": 2}'::jsonb)::text                    AS test_no_strip;
```

Expected outputs:

| Column | Expected |
|---|---|
| test_null | NULL |
| test_jsonb_null | `null` |
| test_array | `[1,2,3]` |
| test_strip_one | `{"keep": 1}` |
| test_strip_multiple | `{"a": 1}` |
| test_no_strip | `{"keep": 1, "other": 2}` |

### V5 — ALTER FK on r.expected_publication.matched_match_id

```sql
SELECT con.conname, pg_get_constraintdef(con.oid) AS def
FROM pg_constraint con
JOIN pg_class t ON t.oid = con.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='r' AND t.relname='expected_publication'
  AND con.contype = 'f'
  AND pg_get_constraintdef(con.oid) LIKE '%matched_match_id%';
```

**Pass:** 1 row, def matches `FOREIGN KEY (matched_match_id) REFERENCES r.reconciliation_match(reconciliation_match_id) ON DELETE SET NULL`.

### V6 — Strengthened k.column_registry matched_match_id FK flag

```sql
SELECT cr.column_name, cr.is_foreign_key, cr.fk_ref_schema, cr.fk_ref_table, cr.fk_ref_column,
       cr.column_purpose ILIKE '%L38 candidate empirically vindicated%' AS purpose_marker_present,
       LEFT(cr.column_purpose, 200) AS purpose_preview
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name='r' AND tr.table_name='expected_publication'
  AND cr.column_name = 'matched_match_id';
```

**Pass rule (ALL must hold):**

- `is_foreign_key = true`
- `fk_ref_schema = 'r'`
- `fk_ref_table = 'reconciliation_match'`
- `fk_ref_column = 'reconciliation_match_id'`
- `purpose_marker_present = true` ← **NEW v1.1 hard-fail clause; silent text drift now fails loudly**

### V7 — k.table_registry + k.column_registry final state

Verify: 6 new k.table_registry rows; **86** k.column_registry rows; all `purpose` populated (no `auto-registered` stub remnants); all `is_foreign_key` flags correct per column type.

### V8 — `pg_trgm` extension installed

```sql
SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_trgm') AS pg_trgm_installed;
```

**Pass:** `pg_trgm_installed = true`.

---

## §5. Post-mutation truth check (L45) — required pattern

After apply, capture verbatim:

### Count-delta

| Table | Pre-mutation | Post-mutation | Delta | Expected | Match? |
|---|---|---|---|---|---|
| `r.ice_publication_evidence` (existence) | not exists | exists | new | new | TBD |
| `r.platform_observation` (existence) | not exists | exists | new | new | TBD |
| `r.platform_manual_observation` (existence) | not exists | exists | new | new | TBD |
| `r.reconciliation_match` (existence) | not exists | exists | new | new | TBD |
| `r.platform_observer_health` (existence) | not exists | exists | new | new | TBD |
| `r.matcher_config` row count | 0 | 1 | +1 | +1 | TBD |
| `r.matcher_config` global default rows (`client_id IS NULL AND platform IS NULL`) | 0 | 1 | +1 | +1 | TBD |
| `r.compact_raw_json` function | not exists | exists | new | new | TBD |
| `r.expected_publication.matched_match_id` FK | not exists | exists | new | new | TBD |
| `r.expected_publication` row count | 84+ | 84+ | 0 | 0 | TBD |
| `k.table_registry` r.* row count | 2 (from cc-0009) | 8 (2 + 6) | +6 | +6 | TBD |
| **`k.column_registry` r.* row count** | (cc-0009 baseline) | **baseline + 86** | **+86** | **+86** | TBD |
| `k.column_registry.is_foreign_key` for matched_match_id | false | true | flipped | flipped | TBD |
| `pg_extension` pg_trgm | (pre-flight state) | true | no-op or installed | installed | TBD |

### Sanity sample (≥3 rows; shape-variant)

To capture verbatim at apply: 1 row from `r.matcher_config` (only populated table); 3 rows from `k.table_registry` covering different `purpose` shapes; 3 rows from `k.column_registry` covering FK-true vs FK-false vs JSONB column.

### Mismatch declaration template (L45)

| What | Expected | Actual | Decision |
|---|---|---|---|
| {populate on apply} | | | accept-with-variance / re-fire / rollback / escalate |

Empty at brief authoring; populated only if mismatch surfaces at apply.

---

## §6. D-01 packet (1 fire expected; PENDING)

Per `docs/runtime/mcp_review_protocol.md` sha `9bd5d3fa`:

- **action_type:** `sql_destructive` (or `plan_review` fallback per cc-0009 KOI-02 if MCP routing requires)
- **decision_under_review:** Apply migration `cc_0010a_r_evidence_matcher_schema_foundation` containing all DDL + DML enumerated in §2 + §3 in a single transactional unit.
- **production_action_if_approved:** Single `apply_migration` call via Supabase MCP. 6 new tables created in schema r; 1 helper function; 1 FK constraint; 1 row inserted into r.matcher_config; 6 rows upserted into k.table_registry; 86 rows upserted into k.column_registry; 1 row updated in k.column_registry; CREATE EXTENSION IF NOT EXISTS pg_trgm idempotent.
- **consequence_if_delayed:** cc-0010B and cc-0010C cannot begin authoring/apply; PRV-1 close gate evaluation deferred. No external client impact.
- **cost_of_waiting:** Low. Days-scale lag only.
- **current_evidence:** §1 pre-flight probe outputs verbatim (run within ~60s of D-01 fire per L44 baseline).
- **known_weak_evidence:** None at brief authoring; populate at apply if any §1 probe returns FLAGGED.
- **default_action:** Hold migration; PK chooses to re-fire after addressing or to override per L46 GNB classification.

**L46 response classification (to be filled at D-01 return):** INFORMATIVE-BLOCKING / GENERIC-NON-BLOCKING with 3-field analysis recorded.

---

## §7. Rollback / no-op / halt logic

**HALT codes:**

| Code | Trigger | Path |
|---|---|---|
| H1 | §1.1 fails (cc-0009 outputs missing) | Stop. PK escalation. cc-0009 lineage broken. |
| H2 | §1.1 `ep_rows_with_match_id > 0` | Stop. FK ALTER would fail. Audit how non-null values landed. PK escalation. |
| H3 | §1.2 returns any row (table pre-exists) | Stop. Prior partial apply. PK escalation. |
| H4 | §1.4 returns any row (FK pre-exists) | Stop. External FK addition. PK escalation. |
| H5 | §1.5 returns any row (migration name collision) | Stop. PK chooses different migration name OR investigates prior apply attempt. |
| H6 | §1.6 returns trigger drift | Stop. k.* trigger missing or disabled. Rebuild path required before cc-0010A can proceed. |
| H7 | §1.7 returns UNIQUE constraint drift on k.* | Stop. UPSERT pattern would fail. PK escalation. |
| H8 | §1.9 returns < 7 PK-column rows OR unexpected PK names | Stop. Cross-schema FK target broken. PK escalation. |
| H9 | §1.10 returns `server_version_num < 150000` | Stop. NULLS NOT DISTINCT unsupported. PK to scope fallback brief or accept halt. |

**ROLLBACK:** PostgreSQL single-transaction atomicity. If migration body fails at any point, entire migration rolls back. No partial state. No manual rollback steps required.

**NO-OP:** If migration name already present in `supabase_migrations.schema_migrations` (H5), `apply_migration` itself is no-op.

---

## §8. Result-file convention

Single result file at `docs/briefs/results/cc-0010A-r-reconciliation-ddl-foundation.md` committed at Stage A close (single commit, paired with session file + sync_state + action_list update for v2.66 4-way sync). Standard 12-section result-file template from cc-0009.

---

## §9. Stop condition

Stage A closed when:

- Migration applied successfully.
- V1–V8 PASS (or mismatch declared per L45 with PK accept-with-variance / re-fire / rollback / escalate decision per row).
- Close-the-loop UPDATE on `m.chatgpt_review` row resolved.
- Result file committed.
- Session file written at `docs/runtime/sessions/YYYY-MM-DD-cc-0010A-applied.md`.
- 4-way sync close (sync_state + action_list + session file + memory edit if applicable).
- cc-0010B + cc-0010C unblocked notice logged in sync_state.

---

## §10. L47 dependency note (forward-looking)

cc-0010A does NOT build `audit.session_lock`. The L47 Path B brief that does is a separate cc-NNNN. **Per PK directive 2026-05-12, any future L47 Path B brief must include at minimum:**

```sql
CREATE TABLE audit.session_lock (
    session_lock_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resource         text NOT NULL,                              -- e.g. 'm.chatgpt_review.<row_id>' or 'docs/briefs/results/cc-NNNN-...md'
    owner            text NOT NULL,                              -- session identifier
    acquired_at      timestamptz NOT NULL DEFAULT now(),
    expires_at       timestamptz NOT NULL,                       -- TTL — beyond this, lock is reclaimable
    released_at      timestamptz,                                -- NULL until explicitly released
    -- additional bookkeeping as needed
    UNIQUE (resource) WHERE released_at IS NULL                  -- active-resource UNIQUE; semantically "one live lock per resource"
);
```

**Acquisition rule:** caller attempts `INSERT ... ON CONFLICT (resource) DO NOTHING WHERE released_at IS NULL`; if 0 rows inserted, lock not acquired. **Reclaim rule:** if `now() > expires_at` on a row where `released_at IS NULL`, that lock is reclaimable — caller can `UPDATE ... SET released_at = now() WHERE resource = ... AND expires_at < now() AND released_at IS NULL` then retry INSERT. **Hard requirement: TTL-driven reclaim avoids permanent deadlocks when a session crashes without releasing.**

L47 Path B does not block cc-0010A authoring/apply (chat-only single-actor stage). **Must be revisited before cc-0010B/C shared-write stages** per CCH directive 2026-05-12.

Secondary observation from cc-0009 Stage E close: parallel writer touched both `m.chatgpt_review` row AND result file. Future L47 Path B brief should consider whether filesystem races (result files) also need a lock surface, or whether a separate sentinel-file pattern suffices. **Flag as secondary L47 follow-up.**

---

## §11. L62 carry note (forward-looking)

Per pre-cc-0010A gating evidence pack:

- L62 wording **unchanged**.
- CCD-output review (PK direct) found no generic CCD-origin pushback.
- `m.chatgpt_review` samples only ChatGPT MCP reviews by table construction; CCD-side reviews are not logged in this table. Attribution work for CCD origin requires separate CCD-output log inspection — out of `m.chatgpt_review`-only scope.
- Single GNB episode `bea1bca4` (cc-0009 Stage C D-01) classified per L46 as 2-of-3 fields missing → GENERIC-NON-BLOCKING. Treated as non-blocking corrective advisory. No PK escalation required for this row in retrospect; no protocol rewrite in cc-0010A.
- L46 Evidence Gate is active for cc-0010A D-01 fire; first live application.

---

## §12. Notes

This is the **eleventh cc-NNNN brief** and the **first single-stage sub-brief from a split parent**. Pattern firsts:

1. **First L48 split outcome applied.** cc-0010 v1 → cc-0010A + cc-0010B + cc-0010C decomposition.
2. **First live exercise of L44 (Runtime Proof Pre-flight).** §1 probes captured verbatim at apply time.
3. **First live exercise of L45 (Post-mutation truth check).** §5 count-delta + sanity sample baked in.
4. **First sub-brief where Stages B–N do not exist by construction.** cc-0010A is single-stage by scope.
5. **L38 candidate empirical vindication at Stage A close** (cross-brief FK re-add via downstream-sub-brief ALTER).
6. **First brief explicitly noting forward-looking-only matcher_config** (does NOT wire into cadence-rule-generator EF; cc-0010C is first consumer).
7. **First brief noting L47 Path B dependency** without building it. Future Path B brief specification included in §10.
8. **First CCD-driven correction landing pre-D-01.** CCD review of cc-0010A v1 surfaced two hard defects (stored-generated `now()` + `UNIQUE` NULL semantics) and one secondary concern (partial-index-with-`now()` also unsafe — chat-added). v1.1 incorporated all three. v1.2 strengthens §1.9 cross-schema probe to verify actual PRIMARY KEY columns via `pg_constraint` (CCD-provided shape) rather than just column existence. Pattern likely repeats for cc-0010B/C DDL changes.

### Lesson candidate notes

- **L37 candidate** continues vindication through split-brief execution pattern.
- **L38 candidate** → empirical vindication at Stage A close (cross-brief FK ALTER).
- **L44+L45+L48** → first live exercises; status candidate→baselined-after-empirical-confirmation.
- **L46** → activates if D-01 returns `escalate=true`.

### Open dependencies for apply session

1. PK approval-to-apply phrase received.
2. Supabase MCP `apply_migration` available.
3. `pg_trgm` extension installable (or already installed; §1.8 determines).
4. No drift on §1 probes within ~60s of apply.
5. ChatGPT Review MCP available for D-01 fire.
6. 5-row close-the-loop batch cleared (per PK directive 2026-05-12: clear pre-cc-0010A apply).

---

## Ready for D-01 review?

**Brief status: DRAFTED v1.2, repo-committed, ready for D-01 fire pending PK approval-to-apply.**

**Recommended sequencing:**

1. PK clears 5-row close-the-loop batch (~10 min).
2. PK gives go-ahead for cc-0010A apply.
3. Chat fires §1 pre-flight probes within ~60s of intended apply window (L44 discipline).
4. Chat fires D-01 (`ask_chatgpt_review` action_type=sql_destructive | plan_review fallback).
5. PK gives explicit approval phrase if D-01 returns clean agree (or PK GNB override per L46 if generic pushback).
6. Chat applies `cc_0010a_r_evidence_matcher_schema_foundation`.
7. Chat captures L45 truth check verbatim.
8. Chat verifies V1–V8 PASS (or declares mismatch per L45).
9. Chat fires close-the-loop UPDATE on m.chatgpt_review.
10. Chat writes result file + session file + sync_state + action_list (4-way sync).
11. cc-0010B and cc-0010C unblocked.

---

*Brief authored 2026-05-12 Sydney by chat (Claude). v1 + v1.1 (CCD corrections) + v1.2 (arithmetic cleanup + strengthened cross-schema PK-column probe). Inputs: cc-0010 v1 parent brief at commit `cfee0814` (split decision recorded at parent-brief top); PRV-0 v2 §3.4–§3.7 + §3.9 + §4.3 + §6.3 verbatim; cc-0009 v2.1 brief structure + result file SHA `0f6873f8`; CCD review v1.1 → v1.2; L33+L34+L35+L36+L37+L38+L41 lessons; v2.66 L44+L45+L46+L48 first live exercise; v2.66 `cc_stage_template.md` sha `5657b69e`; v2.66 `mcp_review_protocol.md` sha `9bd5d3fa`. Output: single-stage DDL/schema/catalog/FK/helper/default-config brief; 1 migration; 1 D-01 fire; 8 V-checks; 1 close-the-loop. NO production mutation during authoring; doc-only commit per CCH directive 2026-05-12.*
