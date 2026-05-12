# Brief cc-0010A — `r.*` second-wave DDL foundation + `r.compact_raw_json` helper + `r.expected_publication.matched_match_id` FK re-add + `r.matcher_config` global default + `k.*` catalog UPSERTs

**Created:** 2026-05-12 Sydney
**Last patched:** 2026-05-12 Sydney (v1.4 — k.column_registry NOT NULL omission fix from apply-time failure)
**Author:** chat (Claude)
**Executor:** chat (ChatGPT-operated) — Supabase MCP `apply_migration`
**Parent brief:** `docs/briefs/cc-0010-r-reconciliation-evidence-and-matcher.md` commit `cfee0814` (split via L48 Atomicity Gate 2026-05-12)
**Sibling sub-briefs:** cc-0010B (`ice-evidence-materialiser` end-to-end), cc-0010C (`reconciliation-matcher` end-to-end)

**Stage count:** 1 (Stage A only — DDL foundation). No Stages B–E.

**Status:** drafted v1.4 — **planning + documentation only.** No `apply_migration`, no D-01 fire, no production mutation until the stage's gate cycle clears (pre-flight re-verify → D-01 → PK approval phrase → apply → V-checks → close-the-loop). v1.4 supersedes v1.3 for §3.7 `k.column_registry` UPSERT SQL — the v1.3 §3.7 body relied on a CTE pattern that omitted live NOT NULL columns (`ordinal_position`, `data_type`, `is_nullable`); apply attempt at 2026-05-12 08:15 UTC failed atomically with PostgreSQL error 23502 on `k.column_registry.ordinal_position`. v1.4 replaces §3.7 with the Fix A pattern — a `purposes` CTE carrying only semantic metadata, joined to `information_schema.columns` at INSERT time to populate live-schema NOT NULL columns automatically. Re-run live pre-flight before D-01 fire.

**Authority:** PRV-0 design lock v2 — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `6e989517ceaf600e1373f7f319ab5b7d5c2c7147` blob `3b5f382096abfa7ac5e0aff4bc4bdd327e95d6f7`.
**Source design sections:** PRV-0 v2 §3.4 (r.ice_publication_evidence), §3.5 (r.platform_observation), §3.6 (r.platform_manual_observation), §3.7 (r.reconciliation_match), §3.9 (r.platform_observer_health), §4.3 (r.compact_raw_json), §6.3 (r.matcher_config), §8.3 (cc-0010 scope contract).
**Lineage:** cc-0010 v1 parent brief at `cfee0814` — split decision recorded at parent-brief top. Inherits cc-0009 v2.1 outputs (commit `ae301a92`, result `0f6873f8`): `r.*` schema live; `r.expected_publication` 84+ rows (currently 98 with cron-driven forward emission); `r.reconciliation_run` 4+ rows; `r.normalise_text` + `r.to_sydney_local_date` helpers in place; `cron job 82 cadence_rule_generator_daily` firing.

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
- **2026-05-12 Sydney — v1.3 — FK target correction from L44 live pre-flight.** Probe 1.9 found live `m.post_publish_queue` primary key is `queue_id`, not `post_publish_queue_id`. Updated `r.ice_publication_evidence.post_publish_queue_id` FK target to `REFERENCES m.post_publish_queue(queue_id)`. Local column name preserved (`r.ice_publication_evidence.post_publish_queue_id` stays); only the FK target column changes. §1.9 expected-row list updated to `m.post_publish_queue.queue_id`. §3.7 column-purpose qualifier added for explicitness. New risk-catalog entry F-CC-0010A-FK-PK-COLUMN-DRIFT logged as caught-and-resolved. No production mutation during this patch — doc-only. L44 Runtime Proof Pre-flight worked exactly as designed: empirical probe caught a documentation-vs-DB drift before the apply gate, eliminating a guaranteed `there is no unique constraint matching given keys for referenced table "m.post_publish_queue"` failure at migration time.
- **2026-05-12 Sydney — v1.4 — k.column_registry NOT NULL omission fix from apply-time failure.** cc-0010A v1.3 was approved for apply via PK L46 GNB override on D-01 review_id `8a4b93fb-54f4-4cd9-b167-a522ef74ace2`. Final drift check passed; `apply_migration cc_0010a_r_evidence_matcher_schema_foundation` was invoked at 2026-05-12 08:15:13 UTC and **failed** with PostgreSQL error 23502: `null value in column "ordinal_position" of relation "column_registry" violates not-null constraint`. Single-transaction atomicity rolled the entire migration back; zero persistent effect; D-01 row 8a4b93fb correctly remains `status='escalated'`. Root cause: v1.3 §3.7 deferred the actual `k.column_registry` UPSERT SQL to "the migration" rather than inlining literal SQL, and chat's apply-time SQL rendering omitted the three NOT NULL columns the live schema requires: `ordinal_position` (int, no default), `data_type` (text, no default), `is_nullable` (boolean, no default). `pii_risk` (text) is also NOT NULL but has default `'none'`, so was implicitly satisfied. v1.4 corrects §3.7 by inlining a complete `purposes` CTE carrying semantic metadata only (column_name + column_purpose + FK refs + pii_risk), joined to `information_schema.columns` after the CREATE TABLE statements have run. The join pulls `ordinal_position`, `data_type`, `udt_name`, `is_nullable`, `column_default` from `information_schema` automatically — eliminating drift between manually-transcribed values and live schema. This is the same pattern cc-0009 used in its `cc_0009_r_schema_and_helpers` migration §3.6 (verified verbatim from `supabase_migrations.schema_migrations`). v1.4 also inlines §3.6 `k.table_registry` UPSERT body in full to remove the same class of deferred-to-migration rendering risk. New risk-catalog entry F-CC-0010A-K-COLUMN-REGISTRY-NOT-NULL-OMISSION logged at #12. New lesson candidate: "Briefs must inline literal SQL for any `k.*` registry writes; prose deferral to 'the migration' enables rendering omissions of live NOT NULL columns invisible to L44 probes." Probe 1.7 strengthening to enumerate `k.column_registry` NOT NULL columns added as §1.7b. No production mutation during this patch — doc-only.

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
5. **k.* registry pattern** (L34 + L35 from cc-0009): trigger `trg_k_registry_sync_on_create_table` fires on each CREATE TABLE, auto-inserting stub rows; brief UPSERTs upgrade in-place via `INSERT ... ON CONFLICT DO UPDATE`. **v1.4 empirical observation:** the 2026-05-12 08:15 UTC apply failure showed the trigger DID NOT pre-insert stub rows for the new `r.*` tables — explicit INSERT got a fresh sequence value (`column_id=5929523`) rather than hitting ON CONFLICT. Either the trigger function's filter excludes schema `r`, or the trigger fires AFTER the same-transaction DML in `apply_migration`. Either way, the v1.4 §3.7 SQL must supply ALL NOT NULL columns directly; cannot rely on trigger pre-insert.
6. **Frozen briefs**: cc-0009 v2.1 brief at commit `ae301a92` remains FROZEN (ICE-PROC-001 §9.1). cc-0010A does not mutate any prior brief. Parent brief cc-0010 v1 at `cfee0814` marked SUPERSEDED-BY but body preserved.

---

## Blast radius

**Direct write surface:**

- 6 new tables in schema `r`: all created with 0 rows except `r.matcher_config` (1 INSERT).
- 1 new helper function in `r`: `r.compact_raw_json` (idempotent CREATE OR REPLACE).
- ALTER on `r.expected_publication` ADDing FK constraint for `matched_match_id`; no row data changes.
- 1 UPDATE on `k.column_registry` flipping `is_foreign_key=true` for `r.expected_publication.matched_match_id`.
- 6 UPSERTs into `k.table_registry`.
- 86 UPSERTs into `k.column_registry` across all 6 new tables (live schema metadata pulled from `information_schema.columns` at INSERT time via the v1.4 Fix A pattern).
- `CREATE EXTENSION IF NOT EXISTS pg_trgm` if not already present.

**Read-only surface** (pre-flight only):

- `information_schema.schemata` / `tables` / `routines` / `columns`.
- `pg_constraint`, `pg_event_trigger`, `pg_proc`, `pg_namespace`, `pg_class`, `pg_extension`, `pg_attribute`.
- `r.expected_publication` (count + matched_match_id null-check).
- `r.reconciliation_run` (count).
- `k.table_registry` + `k.column_registry`.
- `supabase_migrations.schema_migrations`.

**No read or write to** `c.*`, `f.*`, `t.*`, `a.*`, `m.*` schemas (writes). No `vault.*` access. No `cron.*` access.

**Indirect risk catalog (12 items — v1.4 adds F-CC-0010A-K-COLUMN-REGISTRY-NOT-NULL-OMISSION at #12):**

1. **FK ALTER fails on existing rows with non-null `matched_match_id`** — verified at §1.1 pre-flight (`ep_rows_with_match_id = 0`). cc-0009 Stage E produced 0 matched rows. Risk: drift between pre-flight and apply (~60s window). Mitigation: pre-flight re-run immediately before apply.
2. **k.column_registry UPDATE race with trigger auto-insert** — trigger fires on CREATE TABLE only, not ALTER TABLE. UPDATE on pre-existing row from cc-0009 §3.6 is plain UPDATE. No race. **v1.4 update:** the 2026-05-12 apply failure showed the trigger may not be pre-inserting for `r.*` tables at all; §3.8 UPDATE on `matched_match_id` row from cc-0009 is unaffected (that row predates and persists), but new-table column rows in §3.7 must be fully INSERTed not UPDATEd. The Fix A pattern handles this correctly by sourcing column shape from `information_schema.columns` directly.
3. **`r.compact_raw_json` IMMUTABLE assertion fails** — PL/pgSQL body uses `FOREACH ... LOOP` over a hardcoded text array. No side effects, no time-dependent functions, no random functions. PostgreSQL accepts. Mitigation: V3 explicitly tests volatility.
4. **`pg_trgm` extension missing on the target database** — required by GIN indexes on `caption_normalised` in `r.platform_observation` + `r.platform_manual_observation`. Mitigation: migration includes `CREATE EXTENSION IF NOT EXISTS pg_trgm` as **first statement** in transaction. Idempotent.
5. **k.* registry UPSERT conflicts** — brief UPSERTs use `INSERT ... ON CONFLICT (table_id, column_name) DO UPDATE` on the UNIQUE constraint `uq_table_column`. If trigger pre-inserts stubs (per L34 baseline), UPSERTs upgrade them in place; if trigger does not fire for `r.*` (v1.4 empirical observation), explicit INSERT supplies all NOT NULL columns from `information_schema`. Either path succeeds with the Fix A pattern.
6. **`r.matcher_config` global default INSERT conflicts on re-apply** — uses `ON CONFLICT (client_id, platform) DO NOTHING` against `UNIQUE NULLS NOT DISTINCT` constraint. Re-apply: 0 rows inserted (correct). Without NULLS NOT DISTINCT (v1 defect), re-apply would have inserted a duplicate `(NULL, NULL)` row. **CCD correction v1.1 prevents silent duplicate-global-default state.** Mitigation: PG15 version probe §1.10 + V1 row-count assertion.
7. **PRV-0 §3.6 inline partial UNIQUE constraint** — PostgreSQL does NOT support inline `UNIQUE (...) WHERE ...` for table constraints; must use `CREATE UNIQUE INDEX ... WHERE ...` instead (semantically equivalent). Reflected in §2.3 below.
8. **Single-transaction migration size** — Stage A migration body is ~700 lines of SQL (v1.4 added ~150 lines of inline `purposes` CTE rows). PostgreSQL has no hard line limit. Migration is one logical unit; splitting would create intermediate states.
9. **Cross-schema FK targets missing** — if any of `m.post_draft`, `m.post_publish_queue`, `m.post_publish`, `m.slot`, `c.client`, `r.expected_publication`, `r.reconciliation_run` is missing or lacks its expected PK column, Stage A fails with cryptic error. Mitigation: §1.9 PK-column probe halts before apply.
10. **Stored generated column volatility** (CCD-caught defect v1.1) — `STORED GENERATED with now()` rejected by Postgres at table creation. cc-0010A v1.1 removed `is_stale` entirely; freshness is query-time predicate. Partial-index-with-`now()` rejected for same reason. Plain index `platform_obs_recent (client_id, platform, observed_at DESC)` supports the dominant query pattern.
11. **F-CC-0010A-FK-PK-COLUMN-DRIFT** (v1.3 entry — **caught and resolved by L44 Runtime Proof Pre-flight before D-01**). cc-0010A v1.2 §2.1 declared `post_publish_queue_id uuid REFERENCES m.post_publish_queue(post_publish_queue_id)` assuming the PRV-0 design lock's `<table>_id` PK-naming convention applied to `m.post_publish_queue`. Live database has `m.post_publish_queue.queue_id` as the actual PK (deviates from convention). Probe 1.9 returned `m.post_publish_queue.queue_id`, mismatching the v1.2 expected row `m.post_publish_queue.post_publish_queue_id`. Migration would have failed at FK constraint resolution with `there is no unique constraint matching given keys for referenced table "m.post_publish_queue"`. v1.3 corrects the FK target to `REFERENCES m.post_publish_queue(queue_id)` and updates the §1.9 expected-row list. Local column name `r.ice_publication_evidence.post_publish_queue_id` preserved (internal naming choice; only the cross-schema target reference changes). **Lesson candidate:** PK-naming-convention assumptions from design-lock documents must be probe-verified against the live schema before brief authoring is locked. Future cc-NNNN briefs that reference any `m.*` table PK column should run §1.9-style probes during authoring, not just at apply gate.
12. **F-CC-0010A-K-COLUMN-REGISTRY-NOT-NULL-OMISSION** (v1.4 entry — **caught by apply-time failure at 2026-05-12 08:15:13 UTC; resolved by v1.4 Fix A pattern**). cc-0010A v1.3 §3.7 deferred the actual `k.column_registry` UPSERT SQL to "the migration" rather than inlining literal SQL. Chat's apply-time SQL rendering supplied only `table_id, column_name, is_foreign_key, fk_ref_schema, fk_ref_table, fk_ref_column, column_purpose, updated_at` — omitting the three NOT NULL columns the live `k.column_registry` schema requires: `ordinal_position` (int, no default), `data_type` (text, no default), `is_nullable` (boolean, no default). The first INSERT row (`ice_publication_evidence_id` column entry) tripped NOT NULL on `ordinal_position` and PostgreSQL rolled the entire transaction back via single-statement atomicity. Migration not recorded; zero persistent effect. v1.4 §3.7 replaces the deferred-prose approach with an inline Fix A pattern: a `purposes` CTE carrying only semantic metadata (table_schema, table_name, column_name, column_purpose, is_foreign_key, fk_ref_*, pii_risk), joined to `information_schema.columns` at INSERT time to pull live `ordinal_position`, `data_type`, `udt_name`, `is_nullable`, `column_default` automatically. The join requires that the 6 `CREATE TABLE` statements in §2.1–§2.6 have already executed (which they have within the same transactional unit — `information_schema.columns` reflects in-transaction DDL). **Lesson candidate:** "Briefs must inline literal SQL for any `k.*` registry writes; prose deferral to 'the migration' enables rendering omissions of live NOT NULL columns invisible to L44 probes." Probe 1.7 strengthening to enumerate `k.column_registry` NOT NULL columns added as §1.7b. Likely to apply to cc-0010B/C if either writes to `k.*`.

**Cost-of-waiting:** Low. cc-0010B + cc-0010C are blocked on cc-0010A completion. Each day cc-0010A is delayed = +1 day to cc-0010C close = +1 day to PRV-1 close gate evaluation. No external client impact.

---

## Source context

- **PRV-0 v2 design lock** — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `6e989517` blob `3b5f3820`.
- **cc-0010 v1 parent brief** — `docs/briefs/cc-0010-r-reconciliation-evidence-and-matcher.md` commit `cfee0814`. Split decision note section at top.
- **cc-0009 v2.1 brief** — `docs/briefs/cc-0009-r-schema-and-cadence-rule-generator.md` commit `ae301a92`.
- **cc-0009 result file** — `docs/briefs/results/cc-0009-r-schema-and-cadence-rule-generator.md` SHA `0f6873f8`.
- **cc-0009 migration source** — `20260511013636_cc_0009_r_schema_and_helpers` in `supabase_migrations.schema_migrations` — **v1.4 reference pattern** for the `purposes` CTE + `information_schema.columns` join used in §3.7. cc-0009 §3.6 successfully UPSERTed into `k.column_registry` using this exact pattern (`cols_<table>` CTEs pulling `ordinal_position`, `data_type`, `udt_name`, `is_nullable`, `column_default` from `information_schema.columns` joined to per-column `purposes_<table>` VALUES list). cc-0010A v1.3 prose summary claimed *"Full CTE structure follows cc-0009 §3.6 verbatim shape"* but the SQL chat rendered at apply time did NOT replicate this — that was the v1.3 §3.7 defect. v1.4 §3.7 inlines the verbatim shape.
- **`r.expected_publication`** — 84+ rows post-cc-0009 Stage E (currently 98 from cron-driven forward emission).
- **`r.reconciliation_run`** — 4+ rows post-cc-0009 Stage E (currently 5).
- **`k.table_registry` + `k.column_registry`** — doc-catalog targets per L34.
- **`m.chatgpt_review`** — D-01 audit trail (1 D-01 fire expected for cc-0010A v1.4 re-fire; v1.3 D-01 row `8a4b93fb-54f4-4cd9-b167-a522ef74ace2` remains `status='escalated'` because apply failed — to be closed only after a successful v1.4 apply per L36).
- **L33+L34+L35+L36+L37+L38+L41** — cc-0008+cc-0009 reified lessons; carry forward.
- **L42+L43** — cc-0009 NEW candidates; not exercised in cc-0010A (no cron, no EF invocation).
- **L44+L45+L48** — v2.66 baselines. **L44 already partially-vindicated in v1.3 pre-flight** (Probe 1.9 caught F-CC-0010A-FK-PK-COLUMN-DRIFT before D-01 fire) — but the v1.3 apply failure exposed L44's blind spot: pre-flight probes verified UNIQUE constraints (Probe 1.7) but did not enumerate NOT NULL columns on write targets. v1.4 §1.7b strengthens L44 to close this gap.
- **L46** — v2.66 baseline; first live application during the prior pre-cc-0010A M4 close-the-loop sequence (3 D-01 fires → PK GNB override threshold reached → override invoked → UPDATE applied successfully). Second live application: cc-0010A v1.3 D-01 fire (`8a4b93fb`, 2 GNB pushbacks classified, PK Path B GNB override approved, apply attempted, apply failed pre-validation-gate). cc-0010A v1.4 D-01 will be the third live L46 exercise.
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
| 6 `INSERT INTO k.table_registry ... ON CONFLICT DO UPDATE` | DML | same migration (v1.4: inlined verbatim) |
| 86 `INSERT INTO k.column_registry ... ON CONFLICT DO UPDATE` | DML | same migration (v1.4: Fix A pattern — `purposes` CTE joined to `information_schema.columns`) |
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
- 5-row close-the-loop batch (CLOSED 2026-05-12: M4 2-row remediation + 3 D-01 review rows resolved via L46 GNB override).
- F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY (separate; folded into cc-0010B/C).
- Dashboard PHASES reconciliation (22nd consecutive deferral).
- F-CRON-AUTO-APPROVER-SECRET-INLINE.
- F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION (P3 — v1.3 pre-flight surfaced this; `k.schema_registry.r` row's `category`/`purpose`/`typical_contents` describe geography reference data but the schema is the reconciliation surface. Non-blocking; future P3 cleanup brief).
- L34 trigger filter audit (v1.4 surfaced: trigger may not fire for `r.*` schema). Non-blocking for v1.4 (Fix A pattern works regardless of trigger behaviour). Future P3 brief to investigate `evtrg_sync_registry_on_create_table` filter logic.

---

## Allowed actions

- Read-only `SELECT` against `c.*`, `r.*`, `m.*`, `k.*`, `pg_*`, `information_schema.*`, `supabase_migrations.schema_migrations` for pre-flight + verification.
- 1 `ask_chatgpt_review` D-01 fire (action_type=sql_destructive likely; plan_review fallback per cc-0009 KOI-02 if MCP routing requires).
- 1 `apply_migration` named `cc_0010a_r_evidence_matcher_schema_foundation` containing the full Stage A body in a single transactional unit per memory standing rule. **v1.4 note:** migration name is still available — v1.3 apply attempt failed atomically and was NOT recorded in `supabase_migrations.schema_migrations`. Verified via post-failure read.
- Up to 3 retry attempts on each V-check (network/timeout only).
- 2 `m.chatgpt_review` UPDATEs post-apply: (a) close-the-loop on v1.3 D-01 row `8a4b93fb` (referencing v1.4 successful apply); (b) close-the-loop on v1.4 D-01 row TBD. Per R5 carried from cc-0009, these are the ONLY permitted `m.*` writes in cc-0010A.
- 1 commit creating `docs/briefs/results/cc-0010A-r-reconciliation-ddl-foundation.md` at Stage A close.
- 1 commit per 4-way sync close.

## Forbidden actions

- **No `apply_migration` before D-01 returns clean `agree` + PK explicit approval phrase** (v1.4 re-fire).
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
- **No DDL deviation from PRV-0 v2 §3.4/§3.5/§3.6/§3.7/§3.9/§4.3/§6.3** unless §1 pre-flight surfaces a genuine blocker. **Exceptions: CCD-corrected divergences from PRV-0 v1 text (v1.1)** — no `is_stale` STORED column, `UNIQUE NULLS NOT DISTINCT` on `r.matcher_config`. **L44-corrected divergence (v1.3)** — `r.ice_publication_evidence.post_publish_queue_id` FK references `m.post_publish_queue(queue_id)`. **Apply-time-corrected pattern (v1.4)** — §3.7 uses Fix A `purposes` CTE + `information_schema.columns` join instead of hand-supplied column list. All four documented in §2/§3.
- **No proceeding past D-01 if verdict != `agree`** with `proceed` (or PK explicit Lesson #62 type-(c) state-capture override OR L46 GNB override; classified per L46).
- **No `m.*` writes beyond the close-the-loop UPDATEs (2 expected for v1.4: close v1.3 D-01 + close v1.4 D-01)**.
- **No direct push to `main` for any cc-0010A doc commit** unless PK separately approves (per CCH directive 2026-05-12: direct-to-main doc commit accepted for v1.2, v1.3, and v1.4).
- **No k.schema_registry cleanup in this brief** — F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION is a separate P3 brief.
- **No L34 trigger filter investigation in this brief** — separate P3 follow-up.

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

**Decision rule:** 0 rows → PASS. Any row → HALT (migration name collision). **v1.4 historical note:** v1.3 apply failed atomically before the migration was recorded; this name is still available. Confirmed post-failure 2026-05-12 via direct query.

### 1.6 — Event-trigger survey on `k.*` (L33+L34 carry from cc-0009 §1.6)

```sql
SELECT evtname, evtevent, evtenabled, pg_proc.proname AS function_name
FROM pg_event_trigger
JOIN pg_proc ON pg_proc.oid = pg_event_trigger.evtfoid
JOIN pg_namespace ns ON ns.oid = pg_proc.pronamespace
WHERE ns.nspname = 'k' AND pg_event_trigger.evtenabled IN ('O', 'R', 'A')
ORDER BY evtname;
```

**Decision rule:** Expect `trg_k_refresh_catalog` + `trg_k_registry_sync_on_create_table`; both `evtenabled` IN ('O','R','A'). Drift → HALT. **v1.4 informational note:** the v1.3 apply failure provided empirical evidence that `trg_k_registry_sync_on_create_table` may not pre-insert stubs for `r.*` tables (apply hit fresh-INSERT path, not ON CONFLICT path). Trigger enabled state is still required, but the Fix A pattern no longer depends on trigger-driven pre-insert — explicit INSERT supplies all NOT NULL columns from `information_schema.columns`. Trigger filter audit is a separate P3 follow-up.

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

### 1.7b — (v1.4 NEW) `k.column_registry` NOT NULL column enumeration

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='k' AND table_name='column_registry'
  AND is_nullable='NO'
ORDER BY ordinal_position;
```

**Expected rows (live schema as of 2026-05-12):**

- `column_id` bigint (no default — PK, sequence-driven)
- `table_id` bigint (no default)
- `column_name` text (no default)
- `ordinal_position` integer (no default)
- `data_type` text (no default)
- `is_nullable` boolean (no default)
- `is_foreign_key` boolean (default `false`)
- `pii_risk` text (default `'none'`)
- `created_at` timestamptz (default `now()`)
- `updated_at` timestamptz (default `now()`)

**Decision rule:** The §3.7 INSERT statement MUST explicitly supply values for every NOT NULL column that lacks a default. Three NOT NULL columns without default — `ordinal_position`, `data_type`, `is_nullable` — must come from `information_schema.columns` via the Fix A join (v1.4 §3.7 pattern). The 7 NOT NULL columns with a default or sequence (`column_id`, `is_foreign_key`, `pii_risk`, `created_at`, `updated_at`) can be omitted from the INSERT column list (default fills them) but v1.4 §3.7 supplies `pii_risk='none'` and `updated_at=now()` explicitly for clarity. `column_id` is sequence-driven so always omitted. `table_id` + `column_name` are foreign keys / lookups and are always supplied.

**HALT trigger:** If this probe returns ANY NOT NULL column that the §3.7 INSERT body does not supply directly OR via the `information_schema.columns` join, HALT. **v1.4 historical note:** the v1.3 apply failure was caused by exactly this gap — `ordinal_position` was NOT NULL with no default, the v1.3-rendered INSERT omitted it, PostgreSQL rejected the row. v1.4 §3.7 supplies all three NOT NULL columns via the Fix A join.

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

### 1.9 — Cross-schema FK target PK-column probe (CCD-strengthened v1.2; expected-row list corrected v1.3)

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

**Expected exactly 7 rows (v1.3 — `m.post_publish_queue.queue_id` corrected from v1.2's incorrect `post_publish_queue_id`):**

- `c.client.client_id`
- `m.post_draft.post_draft_id`
- `m.post_publish.post_publish_id`
- `m.post_publish_queue.queue_id` *(v1.3 — was `post_publish_queue_id` in v1.2; corrected after L44 live pre-flight returned `queue_id` from `pg_constraint` against the live DB)*
- `m.slot.slot_id`
- `r.expected_publication.expected_publication_id`
- `r.reconciliation_run.reconciliation_run_id`

**Decision rule:** all 7 rows present with exact PK-column names matching. Any missing row OR any unexpected PK-column-name → **HALT**. **v1.4 historical note:** verified PASS at v1.3 pre-flight 2026-05-12; same expected list applies for v1.4.

### 1.10 — Postgres version probe (for NULLS NOT DISTINCT)

```sql
SELECT
  current_setting('server_version_num')::int AS server_version_num,
  current_setting('server_version') AS server_version;
```

**Decision rule:** `server_version_num >= 150000` (PG15+). If `< 150000` → **HALT**. Supabase production runs PG15+; probe is a guard. **v1.4 historical note:** live pre-flight returned `server_version_num = 170006` (PG 17.6).

---

## §2. Proposed DDL — Stage A (single `apply_migration cc_0010a_r_evidence_matcher_schema_foundation`)

All DDL + helper function + ALTER FK + k.* registry UPSERTs + matcher_config default INSERT in ONE transactional unit per memory standing rule. The 6 CREATE TABLE statements in §2.1–§2.6 must run BEFORE §3.7's INSERT into `k.column_registry` because §3.7 joins to `information_schema.columns` for the newly-created tables (within the same transaction; PostgreSQL `information_schema` reflects in-transaction DDL).

### 2.0 `CREATE EXTENSION IF NOT EXISTS pg_trgm` (FIRST statement)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

Idempotent. Required by GIN indexes in §2.2 + §2.3. **Must be the FIRST statement of the migration body, before all CREATE TABLE statements.**

### 2.1 `r.ice_publication_evidence` (PRV-0 §3.4 verbatim; v1.3 FK target correction on `post_publish_queue_id`) — 17 cols

```sql
CREATE TABLE IF NOT EXISTS r.ice_publication_evidence (
    ice_publication_evidence_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expected_publication_id      uuid NOT NULL REFERENCES r.expected_publication(expected_publication_id) ON DELETE CASCADE,
    pipeline_state               text NOT NULL CHECK (pipeline_state IN ('drafted','queued','attempted','published','failed')),
    post_draft_id                uuid REFERENCES m.post_draft(post_draft_id) ON DELETE SET NULL,
    post_publish_queue_id        uuid REFERENCES m.post_publish_queue(queue_id) ON DELETE SET NULL,
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

COMMENT ON TABLE r.ice_publication_evidence IS 'cc-0010A: Authoritative evidence from ICE pipeline state. Empty at cc-0010A close; populated by ice-evidence-materialiser EF (cc-0010B). UNIQUE (expected_publication_id) means ICE evidence is exclusive per expected row. Local column post_publish_queue_id references m.post_publish_queue(queue_id) — note that the target PK column is named queue_id, not post_publish_queue_id, despite the local column naming convention (v1.3 L44 correction).';
```

**v1.3 FK target note (unchanged in v1.4):** The local column `r.ice_publication_evidence.post_publish_queue_id` retains its name. The FK *target* column is `queue_id` because that is the actual PK column name on `m.post_publish_queue` in the live DB.

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

§2.0 (extension) → §2.1 → §2.2 → §2.3 → §2.4 (`r.reconciliation_match`, FK target) → §2.5 → §2.6 (table + INSERT default row) → §2.7 (helper function) → §2.8 (ALTER FK, references §2.4) → §3.6 (k.table_registry UPSERTs) → §3.7 (k.column_registry UPSERTs via Fix A pattern, requires §2.1–§2.6 tables in place) → §3.8 (matched_match_id FK flag UPDATE).

The ALTER FK at §2.8 succeeds because §2.4 created the target table earlier in the same transaction. The Fix A pattern at §3.7 succeeds because §2.1–§2.6 created all 6 tables earlier in the same transaction; `information_schema.columns` reflects in-transaction DDL.

---

## §3. Proposed DML — k.* registry UPSERTs + matched_match_id FK flag UPDATE

When Stage A `apply_migration` runs, the 6 `CREATE TABLE r.*` statements each fire `trg_k_registry_sync_on_create_table` at `ddl_command_end`. **v1.4 empirical observation:** the trigger may not pre-insert stub `k.column_registry` rows for `r.*` schema (apply attempt at 2026-05-12 08:15 UTC hit fresh INSERT, not ON CONFLICT). v1.4 §3.7 Fix A pattern does not depend on trigger pre-insert — it supplies all NOT NULL columns directly via the `information_schema.columns` join.

**§3.5 trigger interaction note:** Trigger fires on each CREATE TABLE; the §3.6+§3.7 UPSERTs use ON CONFLICT (table_id, column_name) DO UPDATE pattern that succeeds whether trigger pre-inserted (UPDATE path) or did not (INSERT path). `r.matcher_config` default INSERT is plain INSERT (not k.* table; not subject to trigger).

### 3.6 `k.table_registry` — 6 UPSERTs for the 6 new tables (v1.4: full SQL inlined)

```sql
INSERT INTO k.table_registry (
    schema_name, table_name, table_kind, status, owner,
    source_system, source_reference, refresh_method, refresh_cadence,
    allowed_ops, pii_risk, purpose,
    primary_use_cases, join_keys, rules_summary, advisory
) VALUES
('r', 'ice_publication_evidence', 'table', 'active', 'invegent',
 'manual', 'docs/dashboard-review-2026-05/prv-0-design-lock.md#section-3.4', 'manual_upsert', 'on_change',
 'upsert', 'none',
 'Authoritative evidence from ICE pipeline state. Populated by ice-evidence-materialiser EF (cc-0010B). UNIQUE (expected_publication_id) collapses multiple pipeline rows per expected slot to latest evidence.',
 'Tier 1 matcher input; ICE pipeline state truth surface; published_at/scheduled_for evidence for matcher delta classification.',
 'expected_publication_id -> r.expected_publication; post_publish_id -> m.post_publish; post_publish_queue_id -> m.post_publish_queue(queue_id); post_draft_id -> m.post_draft; slot_id -> m.slot.',
 'cc-0010A creates empty table. UNIQUE (expected_publication_id) is the materialiser idempotency key. v1.3: local column post_publish_queue_id references m.post_publish_queue(queue_id) -- target PK column is queue_id, NOT post_publish_queue_id, despite local column naming convention. L44 Probe 1.9 caught this asymmetry at apply gate.',
 'cc-0010A introduces this table. Tier 1 matcher (cc-0010C) reads. PRV-7+ may add webhook-driven incremental updates.'),
('r', 'platform_observation', 'table', 'active', 'invegent',
 'manual', 'docs/dashboard-review-2026-05/prv-0-design-lock.md#section-3.5', 'manual_upsert', 'on_change',
 'upsert', 'none',
 'Observations fetched from platform APIs by per-platform observer EFs (PRV-2/3/4). UNIQUE (platform, platform_post_id) enforces each post observed once.',
 'Tier 2/4/5 matcher inputs (PRV-2/3/4); platform-side truth surface; staleness detection.',
 'client_id -> c.client; fetch_run_id -> r.reconciliation_run.',
 'cc-0010A creates empty table. UNIQUE constraint = (platform, platform_post_id). No stored is_stale column (CCD correction v1.1 -- now() not immutable for STORED GENERATED or partial-index predicates). Staleness is a consumer-side query-time predicate: observed_at < now() - interval ''24 hours''. Caption similarity uses gin_trgm_ops index. Stale rows do not match per D-12.',
 'cc-0010A creates empty; populated by PRV-2/3/4 observer EFs. Tier 4/5 fuzzy match against caption_normalised (depends on r.normalise_text expansion -- deferred per cc-0009 R7 lock).'),
('r', 'platform_manual_observation', 'table', 'active', 'invegent',
 'manual', 'docs/dashboard-review-2026-05/prv-0-design-lock.md#section-3.6', 'manual_upsert', 'on_change',
 'upsert', 'none',
 'Human-submitted observations. Lives alongside r.platform_observation. Tier 3 / Tier 5 fuzzy matcher inputs (PRV-2+). cc-0010A creates empty table.',
 'Tier 3 matcher input (PRV-2+); CSV import target (PRV-2 brief); manual override evidence trail.',
 'client_id -> c.client. UNIQUE constraint partial on (platform, platform_post_id) WHERE platform_post_id IS NOT NULL.',
 'observation_method enum: csv_import / manual_form / screenshot / email_forward / phone_report. confidence enum: high/medium/low. URL-only entries tolerate duplicate (no platform_post_id required).',
 'cc-0010A creates empty. PRV-2 brief adds full manual entry UI + CSV import pipeline.'),
('r', 'reconciliation_match', 'table', 'active', 'invegent',
 'manual', 'docs/dashboard-review-2026-05/prv-0-design-lock.md#section-3.7', 'manual_upsert', 'on_change',
 'upsert', 'none',
 'One row per expected_publication describing how it matched. UNIQUE on expected_publication_id means matcher upserts in place. Manual override sticky (D-21).',
 'Match record output; expected_status transitions; manual override audit; tier diagnostics.',
 'expected_publication_id -> r.expected_publication; matched_evidence_id is logical FK (no DB constraint -- schema differs across kinds).',
 'Tier consistency CHECK pairs matched_evidence_kind with matched_match_tier. matcher cron MUST include WHERE override_by IS NULL clause (D-21 hard lock). matched_confidence in [0.000, 1.000].',
 'cc-0010A ships Tier 1 only. cc-0010C reconciliation-matcher EF populates. Tier 2-5 deferred to PRV-2/3/4.'),
('r', 'platform_observer_health', 'table', 'active', 'invegent',
 'manual', 'docs/dashboard-review-2026-05/prv-0-design-lock.md#section-3.9', 'manual_upsert', 'on_change',
 'upsert', 'none',
 'Lightweight health summary per (client, platform) observer. Updated by per-platform observer EFs (PRV-2/3/4). cc-0010A creates empty.',
 'Observer health dashboard surface; alert input when consecutive_failure_count >= 3.',
 'client_id -> c.client; last_successful_run_id -> r.reconciliation_run; last_failure_run_id -> r.reconciliation_run.',
 'UNIQUE (client_id, platform). is_healthy auto-computed via STORED GENERATED column from consecutive_failure_count (immutable expression = 0).',
 'cc-0010A creates empty. PRV-2/3/4 observer EFs populate after each run.'),
('r', 'matcher_config', 'table', 'active', 'invegent',
 'manual', 'docs/dashboard-review-2026-05/prv-0-design-lock.md#section-6.3', 'manual_upsert', 'on_change',
 'upsert', 'none',
 'Matcher tolerance defaults. Lookup order: (client, platform) -> (client, NULL) -> (NULL, NULL). cc-0010A inserts 1 global default row.',
 'Matcher Tier 1 delta classification (minutes_late_tolerance); future Tier 4/5 thresholds (caption_prefix_length, fuzzy_levenshtein_threshold).',
 'client_id -> c.client (NULL for global).',
 'UNIQUE NULLS NOT DISTINCT (client_id, platform). Global default row: client_id=NULL, platform=NULL, defaults per PRV-0 section 6.3 (60 min late, 60 char prefix, 24h window, 0.850 fuzzy threshold).',
 'cc-0010A introduces this table + 1 global default row enforced via UNIQUE NULLS NOT DISTINCT (PG15+ syntax -- CCD correction v1.1 over default PG NULL-distinct semantics). Per-client overrides via future config admin paths.')
ON CONFLICT (schema_name, table_name) DO UPDATE SET
    table_kind        = EXCLUDED.table_kind,
    status            = EXCLUDED.status,
    owner             = EXCLUDED.owner,
    source_system     = EXCLUDED.source_system,
    source_reference  = EXCLUDED.source_reference,
    refresh_method    = EXCLUDED.refresh_method,
    refresh_cadence   = EXCLUDED.refresh_cadence,
    allowed_ops       = EXCLUDED.allowed_ops,
    pii_risk          = EXCLUDED.pii_risk,
    purpose           = EXCLUDED.purpose,
    primary_use_cases = EXCLUDED.primary_use_cases,
    join_keys         = EXCLUDED.join_keys,
    rules_summary     = EXCLUDED.rules_summary,
    advisory          = EXCLUDED.advisory,
    updated_at        = now();
```

### 3.7 `k.column_registry` — Fix A pattern: `purposes` CTE joined to `information_schema.columns` (v1.4 — fully inlined SQL)

**Critical change from v1.3:** v1.3 deferred this SQL to "the migration" and the apply-time rendering omitted three NOT NULL columns (`ordinal_position`, `data_type`, `is_nullable`). v1.4 inlines the literal SQL using the Fix A pattern: a `purposes` CTE carries only semantic metadata (table_schema, table_name, column_name, column_purpose, FK flags, pii_risk); this CTE is joined to `information_schema.columns` at INSERT time to pull live `ordinal_position`, `data_type`, `udt_name`, `is_nullable`, `column_default`. The join requires §2.1–§2.6 to have run earlier in the same transaction — which they do per the §2 dependency ordering.

**Live NOT NULL columns supplied (per §1.7b probe):**

- `table_id` — supplied via JOIN to `k.table_registry`
- `column_name` — supplied from `purposes` + verified against `information_schema.columns`
- `ordinal_position` — supplied from `information_schema.columns.ordinal_position`
- `data_type` — supplied from `information_schema.columns.data_type`
- `is_nullable` — supplied from `information_schema.columns.is_nullable` cast to boolean
- `is_foreign_key` — supplied from `purposes` (boolean, no default reliance — explicit)
- `pii_risk` — supplied from `purposes` with COALESCE to `'none'`
- `column_id` — sequence-driven default (omitted from INSERT column list)
- `created_at`, `updated_at` — `created_at` defaults via column default; `updated_at` supplied as `now()`

```sql
WITH purposes (
    table_schema, table_name, column_name, column_purpose,
    is_foreign_key, fk_ref_schema, fk_ref_table, fk_ref_column, pii_risk
) AS (
    VALUES
    -- r.ice_publication_evidence (17 rows)
    ('r', 'ice_publication_evidence', 'ice_publication_evidence_id', 'Primary key. uuid generated via gen_random_uuid().',
     false, NULL::text, NULL::text, NULL::text, 'none'::text),
    ('r', 'ice_publication_evidence', 'expected_publication_id', 'FK to r.expected_publication. NOT NULL. ON DELETE CASCADE. UNIQUE -- one evidence row per expected slot (latest wins).',
     true, 'r', 'expected_publication', 'expected_publication_id', 'none'),
    ('r', 'ice_publication_evidence', 'pipeline_state', 'CHECK enum: drafted, queued, attempted, published, failed. Reflects current ICE pipeline state for the expected slot.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'ice_publication_evidence', 'post_draft_id', 'FK to m.post_draft. ON DELETE SET NULL.',
     true, 'm', 'post_draft', 'post_draft_id', 'none'),
    ('r', 'ice_publication_evidence', 'post_publish_queue_id', 'FK to m.post_publish_queue. Local column r.ice_publication_evidence.post_publish_queue_id references m.post_publish_queue(queue_id); the FK target PK column on m.post_publish_queue is named queue_id, not post_publish_queue_id, despite the local column naming convention used in cc-0010A; this asymmetry is documented in the table COMMENT and in v1.3 patch history; L44 caught the prior v1.2 typo before apply. ON DELETE SET NULL.',
     true, 'm', 'post_publish_queue', 'queue_id', 'none'),
    ('r', 'ice_publication_evidence', 'post_publish_id', 'FK to m.post_publish. ON DELETE SET NULL.',
     true, 'm', 'post_publish', 'post_publish_id', 'none'),
    ('r', 'ice_publication_evidence', 'slot_id', 'FK to m.slot. ON DELETE SET NULL.',
     true, 'm', 'slot', 'slot_id', 'none'),
    ('r', 'ice_publication_evidence', 'platform_post_id', 'Platform-side post identifier (FB/IG/LinkedIn). Populated when published. Indexed (partial WHERE NOT NULL).',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'ice_publication_evidence', 'published_url', 'Public permalink URL for the published post.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'ice_publication_evidence', 'scheduled_for', 'When the post was scheduled to publish (from m.post_publish_queue or m.slot).',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'ice_publication_evidence', 'published_at', 'When the post actually published (from m.post_publish).',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'ice_publication_evidence', 'failure_reason', 'Failure mode if pipeline_state=failed.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'ice_publication_evidence', 'raw_evidence', 'jsonb. Compacted source row via r.compact_raw_json. Default empty object.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'ice_publication_evidence', 'created_at', 'Row creation timestamp. NOT NULL DEFAULT now().',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'ice_publication_evidence', 'updated_at', 'Row update timestamp. NOT NULL DEFAULT now(). Materialiser updates on re-upsert.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'ice_publication_evidence', 'created_by_run_id', 'r.reconciliation_run that created this row (logical reference; no DB FK to preserve historical lineage even if run is deleted).',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'ice_publication_evidence', 'updated_by_run_id', 'r.reconciliation_run that last updated this row (logical reference).',
     false, NULL, NULL, NULL, 'none'),

    -- r.platform_observation (16 rows)
    ('r', 'platform_observation', 'platform_observation_id', 'Primary key. uuid generated via gen_random_uuid().',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observation', 'client_id', 'FK to c.client. NOT NULL. ON DELETE CASCADE.',
     true, 'c', 'client', 'client_id', 'none'),
    ('r', 'platform_observation', 'platform', 'CHECK enum: facebook, instagram, linkedin, youtube. NOT NULL.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observation', 'platform_post_id', 'Platform-side post identifier. NOT NULL. UNIQUE with platform.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observation', 'observed_at', 'When this observation was captured. NOT NULL.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observation', 'published_at_observed', 'When the post was published according to platform API (may differ from local pipeline scheduled_for).',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observation', 'observed_local_date', 'Sydney-local date when observation was captured. NOT NULL. Indexed with client_id + platform.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observation', 'caption_text', 'Full caption text from platform.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observation', 'caption_normalised', 'r.normalise_text output for fuzzy caption matching. GIN gin_trgm_ops indexed (partial WHERE NOT NULL).',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observation', 'media_count', 'Number of media attachments. CHECK >= 0.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observation', 'has_video', 'Boolean: true if post contains video.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observation', 'permalink_url', 'Public permalink URL.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observation', 'raw_payload', 'jsonb. Compacted raw API payload via r.compact_raw_json. Default empty object.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observation', 'fetch_run_id', 'FK to r.reconciliation_run. ON DELETE SET NULL. Tracks which observer run captured this row.',
     true, 'r', 'reconciliation_run', 'reconciliation_run_id', 'none'),
    ('r', 'platform_observation', 'notes', 'Operator notes / annotations.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observation', 'created_at', 'Row creation timestamp. NOT NULL DEFAULT now().',
     false, NULL, NULL, NULL, 'none'),

    -- r.platform_manual_observation (17 rows)
    ('r', 'platform_manual_observation', 'platform_manual_observation_id', 'Primary key. uuid generated via gen_random_uuid().',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_manual_observation', 'client_id', 'FK to c.client. NOT NULL. ON DELETE CASCADE.',
     true, 'c', 'client', 'client_id', 'none'),
    ('r', 'platform_manual_observation', 'platform', 'CHECK enum: facebook, instagram, linkedin, youtube. NOT NULL.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_manual_observation', 'platform_post_id', 'Platform-side post identifier. Nullable (URL-only entries permitted). Partial UNIQUE INDEX with platform WHERE NOT NULL.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_manual_observation', 'permalink_url', 'Public permalink URL.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_manual_observation', 'observed_local_date', 'Sydney-local date claimed by submitter. NOT NULL.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_manual_observation', 'published_at_observed', 'When the submitter claims the post was published.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_manual_observation', 'caption_text', 'Caption text as transcribed by submitter.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_manual_observation', 'caption_normalised', 'r.normalise_text output. GIN gin_trgm_ops indexed.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_manual_observation', 'media_count', 'Number of media attachments per submitter. CHECK >= 0.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_manual_observation', 'has_video', 'Submitter claim: video present.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_manual_observation', 'raw_evidence_url', 'Screenshot URL or similar raw evidence link.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_manual_observation', 'observation_method', 'CHECK enum: csv_import, manual_form, screenshot, email_forward, phone_report.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_manual_observation', 'confidence', 'CHECK enum: high, medium, low. Submitter or admin self-rating.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_manual_observation', 'notes', 'Free-form notes / context.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_manual_observation', 'submitted_by', 'Email or identifier of the submitter. NOT NULL.',
     false, NULL, NULL, NULL, 'low'),
    ('r', 'platform_manual_observation', 'submitted_at', 'When the submission was recorded. NOT NULL DEFAULT now().',
     false, NULL, NULL, NULL, 'none'),

    -- r.reconciliation_match (16 rows)
    ('r', 'reconciliation_match', 'reconciliation_match_id', 'Primary key. uuid generated via gen_random_uuid().',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'reconciliation_match', 'expected_publication_id', 'FK to r.expected_publication. NOT NULL. ON DELETE CASCADE. UNIQUE -- matcher upserts in place.',
     true, 'r', 'expected_publication', 'expected_publication_id', 'none'),
    ('r', 'reconciliation_match', 'matched_evidence_kind', 'CHECK enum: ice, platform, manual, fuzzy_platform, fuzzy_manual, none. Tier consistency with matched_match_tier.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'reconciliation_match', 'matched_evidence_id', 'Logical FK to evidence row (kind-dependent target table). No DB FK constraint.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'reconciliation_match', 'matched_match_tier', 'CHECK 1-5. Tier consistency with matched_evidence_kind. cc-0010A ships Tier 1 only.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'reconciliation_match', 'matched_confidence', 'numeric(4,3). CHECK 0.000-1.000. Tier 1 (ICE) = 1.000.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'reconciliation_match', 'delta_minutes_late', 'Late delta in minutes. Computed from observed published_at vs expected_window_end.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'reconciliation_match', 'delta_caption_similarity', 'numeric(4,3). Caption similarity score for Tier 4/5. NULL for Tier 1/2/3.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'reconciliation_match', 'override_by', 'Operator who manually overrode this match. NULL if not overridden. D-21 hard lock: matcher cron MUST include WHERE override_by IS NULL.',
     false, NULL, NULL, NULL, 'low'),
    ('r', 'reconciliation_match', 'override_at', 'When override was applied. Paired with override_by via CHECK reconcile_match_override_pair.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'reconciliation_match', 'override_reason', 'Free-form override rationale.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'reconciliation_match', 'matcher_run_id', 'FK to r.reconciliation_run. ON DELETE SET NULL. Tracks which matcher run upserted this row.',
     true, 'r', 'reconciliation_run', 'reconciliation_run_id', 'none'),
    ('r', 'reconciliation_match', 'created_at', 'Row creation timestamp. NOT NULL DEFAULT now().',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'reconciliation_match', 'created_by_run_id', 'Logical reference to creating run.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'reconciliation_match', 'updated_at', 'Row update timestamp. NOT NULL DEFAULT now().',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'reconciliation_match', 'updated_by_run_id', 'Logical reference to last-updating run.',
     false, NULL, NULL, NULL, 'none'),

    -- r.platform_observer_health (10 rows)
    ('r', 'platform_observer_health', 'platform_observer_health_id', 'Primary key. uuid generated via gen_random_uuid().',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observer_health', 'client_id', 'FK to c.client. NOT NULL. ON DELETE CASCADE. UNIQUE with platform.',
     true, 'c', 'client', 'client_id', 'none'),
    ('r', 'platform_observer_health', 'platform', 'CHECK enum: facebook, instagram, linkedin, youtube. NOT NULL.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observer_health', 'last_observed_at', 'When this observer last produced an observation row.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observer_health', 'last_successful_run_id', 'FK to r.reconciliation_run. ON DELETE SET NULL.',
     true, 'r', 'reconciliation_run', 'reconciliation_run_id', 'none'),
    ('r', 'platform_observer_health', 'last_failure_run_id', 'FK to r.reconciliation_run. ON DELETE SET NULL.',
     true, 'r', 'reconciliation_run', 'reconciliation_run_id', 'none'),
    ('r', 'platform_observer_health', 'last_failure_reason', 'Failure mode text for most recent failure.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observer_health', 'consecutive_failure_count', 'Int >= 0. Resets to 0 on next successful run. Alert threshold >= 3.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observer_health', 'is_healthy', 'boolean GENERATED ALWAYS AS (consecutive_failure_count = 0) STORED. Immutable expression. Updated automatically.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'platform_observer_health', 'updated_at', 'Row update timestamp. NOT NULL DEFAULT now().',
     false, NULL, NULL, NULL, 'none'),

    -- r.matcher_config (10 rows)
    ('r', 'matcher_config', 'matcher_config_id', 'Primary key. uuid generated via gen_random_uuid().',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'matcher_config', 'client_id', 'FK to c.client. Nullable for global default. ON DELETE CASCADE.',
     true, 'c', 'client', 'client_id', 'none'),
    ('r', 'matcher_config', 'platform', 'CHECK enum (nullable): facebook, instagram, linkedin, youtube. Nullable for global default.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'matcher_config', 'minutes_late_tolerance', 'Int >= 0. Default 60. Matcher Tier 1 delta classification threshold.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'matcher_config', 'caption_prefix_length', 'Int >= 10. Default 60. Future Tier 4/5 fuzzy match prefix.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'matcher_config', 'same_day_window_hours', 'Int >= 1. Default 24. Future Tier 4/5 same-day join window.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'matcher_config', 'fuzzy_levenshtein_threshold', 'numeric(4,3). 0.500-1.000. Default 0.850. Future Tier 4/5 similarity threshold.',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'matcher_config', 'notes', 'Free-form notes (e.g., why this client+platform pair has specific tolerance).',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'matcher_config', 'created_at', 'Row creation timestamp. NOT NULL DEFAULT now().',
     false, NULL, NULL, NULL, 'none'),
    ('r', 'matcher_config', 'updated_at', 'Row update timestamp. NOT NULL DEFAULT now().',
     false, NULL, NULL, NULL, 'none')
),
purpose_rows AS (
    SELECT
        p.table_schema,
        p.table_name,
        p.column_name,
        p.column_purpose,
        p.is_foreign_key,
        p.fk_ref_schema,
        p.fk_ref_table,
        p.fk_ref_column,
        COALESCE(p.pii_risk, 'none') AS pii_risk
    FROM purposes p
)
INSERT INTO k.column_registry (
    table_id,
    column_name,
    ordinal_position,
    data_type,
    udt_name,
    is_nullable,
    column_default,
    is_foreign_key,
    fk_ref_schema,
    fk_ref_table,
    fk_ref_column,
    column_purpose,
    pii_risk,
    updated_at
)
SELECT
    tr.table_id,
    isc.column_name,
    isc.ordinal_position,
    isc.data_type,
    isc.udt_name,
    (isc.is_nullable = 'YES') AS is_nullable,
    isc.column_default,
    pr.is_foreign_key,
    pr.fk_ref_schema,
    pr.fk_ref_table,
    pr.fk_ref_column,
    pr.column_purpose,
    pr.pii_risk,
    now()
FROM purpose_rows pr
JOIN information_schema.columns isc
  ON isc.table_schema = pr.table_schema
 AND isc.table_name = pr.table_name
 AND isc.column_name = pr.column_name
JOIN k.table_registry tr
  ON tr.schema_name = pr.table_schema
 AND tr.table_name = pr.table_name
ON CONFLICT (table_id, column_name) DO UPDATE SET
    ordinal_position = EXCLUDED.ordinal_position,
    data_type        = EXCLUDED.data_type,
    udt_name         = EXCLUDED.udt_name,
    is_nullable      = EXCLUDED.is_nullable,
    column_default   = EXCLUDED.column_default,
    is_foreign_key   = EXCLUDED.is_foreign_key,
    fk_ref_schema    = EXCLUDED.fk_ref_schema,
    fk_ref_table     = EXCLUDED.fk_ref_table,
    fk_ref_column    = EXCLUDED.fk_ref_column,
    column_purpose   = EXCLUDED.column_purpose,
    pii_risk         = EXCLUDED.pii_risk,
    updated_at       = now();
```

**Row-count contract:** the `purposes` CTE contains exactly **86 rows** (17 + 16 + 17 + 16 + 10 + 10). The INNER JOIN to `information_schema.columns` should produce exactly **86 rows** post-§2.6 if every `purposes` row's `(table_schema, table_name, column_name)` triple is present in the live schema. V7 asserts this count.

**Side-effect of `is_healthy` GENERATED column:** `r.platform_observer_health.is_healthy` is a STORED GENERATED column. PostgreSQL emits it in `information_schema.columns` as a regular column row (with `column_default IS NULL` and `is_nullable='YES'` because GENERATED columns are reported with no default and nullable per the generation expression). The `purposes` row for `is_healthy` documents this; the join still works.

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

### V5b — (v1.3 NEW) FK on r.ice_publication_evidence.post_publish_queue_id targets queue_id

```sql
SELECT con.conname, pg_get_constraintdef(con.oid) AS def
FROM pg_constraint con
JOIN pg_class t ON t.oid = con.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='r' AND t.relname='ice_publication_evidence'
  AND con.contype = 'f'
  AND pg_get_constraintdef(con.oid) LIKE '%post_publish_queue_id%';
```

**Pass:** 1 row, def matches `FOREIGN KEY (post_publish_queue_id) REFERENCES m.post_publish_queue(queue_id) ON DELETE SET NULL`.

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
- `purpose_marker_present = true`

### V6b — (v1.3 NEW) k.column_registry FK metadata for r.ice_publication_evidence.post_publish_queue_id

```sql
SELECT cr.column_name, cr.is_foreign_key, cr.fk_ref_schema, cr.fk_ref_table, cr.fk_ref_column,
       LEFT(cr.column_purpose, 200) AS purpose_preview
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name='r' AND tr.table_name='ice_publication_evidence'
  AND cr.column_name = 'post_publish_queue_id';
```

**Pass rule (ALL must hold):**

- `is_foreign_key = true`
- `fk_ref_schema = 'm'`
- `fk_ref_table = 'post_publish_queue'`
- `fk_ref_column = 'queue_id'`

### V6c — (v1.4 NEW) k.column_registry NOT NULL columns populated for all 86 new rows

```sql
SELECT
  COUNT(*) AS total_r_column_rows,
  COUNT(*) FILTER (WHERE ordinal_position IS NULL) AS rows_with_null_ordinal_position,
  COUNT(*) FILTER (WHERE data_type IS NULL OR data_type = '') AS rows_with_empty_data_type,
  COUNT(*) FILTER (WHERE is_nullable IS NULL) AS rows_with_null_is_nullable,
  COUNT(*) FILTER (WHERE pii_risk IS NULL OR pii_risk = '') AS rows_with_empty_pii_risk
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name = 'r'
  AND tr.table_name IN (
    'ice_publication_evidence','platform_observation','platform_manual_observation',
    'reconciliation_match','platform_observer_health','matcher_config'
  );
```

**Pass rule (ALL must hold):**

- `total_r_column_rows >= 86` (may exceed if existing cc-0009 r.* rows happen to fall in this filter — but the 6 cc-0010A tables are distinct from the 2 cc-0009 tables, so we expect exactly 86)
- `rows_with_null_ordinal_position = 0` ← **CRITICAL v1.4 assertion** (proves Fix A pattern populated this NOT NULL column for every row)
- `rows_with_empty_data_type = 0`
- `rows_with_null_is_nullable = 0`
- `rows_with_empty_pii_risk = 0`

### V7 — k.table_registry + k.column_registry final state

Verify: 6 new k.table_registry rows; **86** k.column_registry rows; all `purpose` populated; all `is_foreign_key` flags correct per column type.

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
| `r.ice_publication_evidence.post_publish_queue_id` FK target | not exists | `m.post_publish_queue(queue_id)` | new | `(queue_id)` | TBD |
| `r.expected_publication` row count | 84+ | 84+ | 0 | 0 | TBD |
| `k.table_registry` r.* row count | 2 (from cc-0009) | 8 (2 + 6) | +6 | +6 | TBD |
| **`k.column_registry` r.* row count** | (cc-0009 baseline) | **baseline + 86** | **+86** | **+86** | TBD |
| `k.column_registry.is_foreign_key` for matched_match_id | false | true | flipped | flipped | TBD |
| `k.column_registry.fk_ref_column` for r.ice_publication_evidence.post_publish_queue_id | unset | `queue_id` | set | `queue_id` | TBD |
| **`k.column_registry.ordinal_position`** for any new cc-0010A row | NULL (per v1.3 failure mode) | non-NULL integer | populated | populated | TBD |
| `pg_extension` pg_trgm | (pre-flight state) | true | no-op or installed | installed | TBD |

### Sanity sample (≥3 rows; shape-variant)

To capture verbatim at apply: 1 row from `r.matcher_config`; 3 rows from `k.table_registry` covering different `purpose` shapes; 3 rows from `k.column_registry` covering FK-true vs FK-false vs JSONB column; explicit row for `r.ice_publication_evidence.post_publish_queue_id` confirming `fk_ref_column='queue_id'`; explicit row showing `ordinal_position` populated.

### Mismatch declaration template (L45)

| What | Expected | Actual | Decision |
|---|---|---|---|
| {populate on apply} | | | accept-with-variance / re-fire / rollback / escalate |

Empty at brief authoring; populated only if mismatch surfaces at apply.

---

## §6. D-01 packet (1 fire expected; PENDING for v1.4)

Per `docs/runtime/mcp_review_protocol.md` sha `9bd5d3fa`:

- **action_type:** `sql_destructive`
- **decision_under_review:** Apply migration `cc_0010a_r_evidence_matcher_schema_foundation` (v1.4) containing all DDL + DML enumerated in §2 + §3 in a single transactional unit.
- **production_action_if_approved:** Single `apply_migration` call via Supabase MCP. 6 new tables created in schema r; 1 helper function; 1 FK constraint (matched_match_id); 1 row inserted into r.matcher_config; 6 rows upserted into k.table_registry; **86 rows inserted into k.column_registry via the v1.4 Fix A pattern (purposes CTE joined to information_schema.columns)**; 1 row updated in k.column_registry; CREATE EXTENSION IF NOT EXISTS pg_trgm idempotent.
- **consequence_if_delayed:** cc-0010B and cc-0010C cannot begin authoring/apply; PRV-1 close gate evaluation deferred.
- **cost_of_waiting:** Low.
- **current_evidence:** §1 pre-flight probe outputs verbatim (including §1.7b NOT NULL enumeration — new in v1.4). v1.4 must explicitly show §1.7b returns expected NOT NULL column set.
- **known_weak_evidence:** v1.3 apply at 2026-05-12 08:15 UTC failed with NOT NULL violation; v1.4 corrects via Fix A. The v1.3 → v1.4 transition is itself evidence the discipline is working. **D-01 row `8a4b93fb-54f4-4cd9-b167-a522ef74ace2` from v1.3 remains `status='escalated'`** pending successful v1.4 apply; close-the-loop on `8a4b93fb` should be paired with the v1.4 D-01 close-the-loop in a single 2-row UPDATE.
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
| H6 | §1.6 returns trigger drift | Stop. k.* trigger missing or disabled. v1.4 Fix A pattern is trigger-independent but trigger absence still warrants PK escalation. |
| H7 | §1.7 returns UNIQUE constraint drift on k.* | Stop. UPSERT pattern would fail. PK escalation. |
| H7b | **(v1.4 NEW)** §1.7b returns any NOT NULL column on `k.column_registry` that is not supplied by §3.7 INSERT (directly or via `information_schema.columns` join) | Stop. PK escalation. **Historical:** §1.7b was added in v1.4 specifically because v1.3 apply hit this class of failure. |
| H8 | §1.9 returns < 7 PK-column rows OR unexpected PK names | Stop. Cross-schema FK target broken. PK escalation. |
| H9 | §1.10 returns `server_version_num < 150000` | Stop. NULLS NOT DISTINCT unsupported. PK to scope fallback brief. |
| H10 | **(v1.4 NEW)** apply_migration returns 23502 NOT NULL violation on any `k.*` row | Atomic rollback by PostgreSQL. Surface failing row + column to PK. v1.4 §3.7 supplies all NOT NULL columns; should not fire if §1.7b passed. If it fires anyway, indicates §3.7 has another omission — re-audit `k.column_registry` schema against §3.7 column list. |

**ROLLBACK:** PostgreSQL single-transaction atomicity. If migration body fails at any point, entire migration rolls back. No partial state. No manual rollback steps required. **v1.4 historical confirmation:** the 2026-05-12 08:15 UTC apply failure rolled back atomically — zero target tables persisted, no helper function, no FK, migration not recorded.

**NO-OP:** If migration name already present in `supabase_migrations.schema_migrations` (H5), `apply_migration` itself is no-op.

---

## §8. Result-file convention

Single result file at `docs/briefs/results/cc-0010A-r-reconciliation-ddl-foundation.md` committed at Stage A close (single commit, paired with session file + sync_state + action_list update for v2.66 4-way sync). Standard 12-section result-file template from cc-0009. **v1.4 note:** result file must document both v1.3 apply attempt (failed) and v1.4 apply attempt (expected success) for the audit trail.

---

## §9. Stop condition

Stage A closed when:

- v1.4 migration applied successfully.
- V1–V8 PASS including V5b + V6b + V6c (v1.3 + v1.4 additions enforcing FK target + NOT NULL column population).
- Close-the-loop UPDATEs on BOTH `m.chatgpt_review` rows resolved: v1.3 D-01 row `8a4b93fb-54f4-4cd9-b167-a522ef74ace2` AND the v1.4 D-01 row TBD.
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
    resource         text NOT NULL,
    owner            text NOT NULL,
    acquired_at      timestamptz NOT NULL DEFAULT now(),
    expires_at       timestamptz NOT NULL,
    released_at      timestamptz,
    UNIQUE (resource) WHERE released_at IS NULL
);
```

**Acquisition rule:** caller attempts `INSERT ... ON CONFLICT (resource) DO NOTHING WHERE released_at IS NULL`. **Reclaim rule:** if `now() > expires_at`, lock is reclaimable. **Hard requirement: TTL-driven reclaim avoids permanent deadlocks.**

L47 Path B does not block cc-0010A authoring/apply. **Must be revisited before cc-0010B/C shared-write stages.**

---

## §11. L62 carry note (forward-looking)

- L62 wording **unchanged**.
- L46 Evidence Gate first live application: M4 close-the-loop sequence 2026-05-12 (3 D-01 fires → 5 GNB classifications → PK override → UPDATE applied + closed).
- L46 Evidence Gate second live application: cc-0010A v1.3 D-01 (`8a4b93fb`) → 2 GNB pushbacks → PK Path B GNB override → apply attempted → apply failed pre-validation-gate (NOT NULL violation, atomic rollback). **The L46 override mechanism worked correctly; the failure was an SQL rendering defect downstream of D-01, not an L46 protocol issue.**
- L46 Evidence Gate active for cc-0010A v1.4 D-01 fire; third live application.

---

## §12. Notes

This is the **eleventh cc-NNNN brief** and the **first single-stage sub-brief from a split parent**. Pattern firsts:

1. **First L48 split outcome applied.**
2. **First live exercise of L44.** Probe 1.9 caught F-CC-0010A-FK-PK-COLUMN-DRIFT in v1.3 pre-flight. v1.4 adds Probe 1.7b to close the NOT NULL enumeration gap.
3. **First live exercise of L45.** §5 count-delta + sanity sample baked in.
4. **First sub-brief where Stages B–N do not exist by construction.**
5. **L38 candidate empirical vindication at Stage A close.**
6. **First brief explicitly noting forward-looking-only matcher_config.**
7. **First brief noting L47 Path B dependency** without building it.
8. **First CCD-driven correction landing pre-D-01** (v1.1).
9. **First L44-driven correction landing pre-D-01** (v1.3). Probe 1.9 caught FK target drift before D-01 fire.
10. **First apply-time-driven correction (v1.4).** v1.3 apply failed atomically on NOT NULL violation; v1.4 corrects via Fix A pattern + new §1.7b probe. Lesson: briefs must inline literal SQL for k.* registry writes; prose deferral to "the migration" enables rendering omissions invisible to pre-flight probes.

### Lesson candidate notes

- **L37 candidate** continues vindication.
- **L38 candidate** → empirical vindication at Stage A close (cross-brief FK ALTER).
- **L44** → first live exercise complete (v1.3 pre-flight); strengthened in v1.4 with §1.7b NOT NULL enumeration. Baseline-eligible after v1.4 successful apply.
- **L45+L48** → first live exercises in progress; baseline candidates pending Stage A close.
- **L46** → baselined-after-empirical-confirmation (M4 sequence); third live application pending in v1.4 D-01.
- **New lesson candidate from v1.3 (carry from v1.3):** "Design-lock PK-naming conventions must be probe-verified before brief authoring is locked."
- **New lesson candidate from v1.4:** "Briefs that write to `k.*` registry tables must inline literal SQL for those writes — prose deferral to 'the migration' enables rendering omissions invisible to L44 probes. Pre-flight must enumerate NOT NULL columns on every write target via `information_schema.columns WHERE is_nullable='NO'` (§1.7b pattern), not only UNIQUE/PK constraints. Promotion candidate at cc-0010C close if cc-0010C surfaces similar `k.*` schema-drift issues."

### Open dependencies for apply session

1. PK approval-to-apply phrase received for v1.4.
2. Supabase MCP `apply_migration` available.
3. `pg_trgm` extension installable (confirmed installed 2026-05-12: version 1.6).
4. No drift on §1 probes (including new §1.7b) within ~60s of apply.
5. ChatGPT Review MCP available for D-01 fire.
6. 5-row close-the-loop batch cleared (DONE 2026-05-12).
7. v1.3 D-01 row `8a4b93fb` remains escalated (correct — pending successful v1.4 apply).

---

## Ready for D-01 review?

**Brief status: DRAFTED v1.4, repo-committed (pending push), ready for live pre-flight RE-RUN (including new §1.7b) + D-01 fire pending PK approval-to-apply.**

**Recommended sequencing:**

1. PK gives go-ahead for cc-0010A v1.4 apply pipeline.
2. Chat fires §1 pre-flight probes (1.1 through 1.10 INCLUDING the new §1.7b).
3. Chat fires D-01 (`ask_chatgpt_review` action_type=sql_destructive).
4. PK gives explicit approval phrase if D-01 returns clean agree (or invokes L46 GNB override).
5. Chat applies `cc_0010a_r_evidence_matcher_schema_foundation` (v1.4 SQL body).
6. Chat captures L45 truth check verbatim.
7. Chat verifies V1–V8 + V5b + V6b + V6c PASS.
8. Chat fires close-the-loop UPDATEs on BOTH `m.chatgpt_review` rows (v1.3 D-01 + v1.4 D-01) in a single statement.
9. Chat writes result file + session file + sync_state + action_list (4-way sync).
10. cc-0010B and cc-0010C unblocked.

---

*Brief authored 2026-05-12 Sydney by chat (Claude). v1 + v1.1 (CCD corrections) + v1.2 (arithmetic cleanup + strengthened cross-schema PK-column probe) + v1.3 (FK target correction from L44 live pre-flight — `m.post_publish_queue(queue_id)`) + v1.4 (k.column_registry NOT NULL omission fix from apply-time failure 2026-05-12 08:15 UTC — §3.7 Fix A pattern with inlined `purposes` CTE joined to `information_schema.columns` for live schema metadata; §1.7b NOT NULL enumeration probe added). Inputs: cc-0010 v1 parent brief at commit `cfee0814`; PRV-0 v2 §3.4–§3.7 + §3.9 + §4.3 + §6.3 verbatim; cc-0009 v2.1 brief structure + result file SHA `0f6873f8`; CCD review v1.1 → v1.2; L44 live pre-flight v1.2 → v1.3; live apply failure v1.3 → v1.4 (cc-0009 migration source verbatim from `supabase_migrations.schema_migrations` as Fix A reference pattern); L33+L34+L35+L36+L37+L38+L41 lessons; v2.66 L44+L45+L46+L48 first live exercises; v2.66 `cc_stage_template.md` sha `5657b69e`; v2.66 `mcp_review_protocol.md` sha `9bd5d3fa`. Output: single-stage DDL/schema/catalog/FK/helper/default-config brief; 1 migration; 1 D-01 fire (v1.4 re-fire); 11 V-checks (V1–V8 + V5b + V6b + V6c); 2 close-the-loop UPDATEs (close v1.3 D-01 + close v1.4 D-01). NO production mutation during authoring; doc-only commit per CCH directive 2026-05-12.*
