# Result — cc-0010A v1.5 r.* DDL foundation

**Brief:** `docs/briefs/cc-0010A-r-reconciliation-ddl-foundation.md` at commit `3db84322951e2404b26589e49bb43d5c40cf0db5` (v1.5 blob `380fe8de`, 107,109 bytes).
**Apply commit:** apply_migration `cc_0010a_r_evidence_matcher_schema_foundation` 2026-05-12 ~09:31 UTC.
**Status:** **CLOSED.** Stage A delivered. cc-0010B + cc-0010C unblocked.

---

## 1. Outcome

cc-0010A v1.5 applied successfully via Supabase MCP single-transaction `apply_migration`. 6 new tables created in schema `r`; 1 helper function; 1 FK constraint; 1 matcher_config global default row; 6 k.table_registry UPSERTs; 86 k.column_registry rows hydrated via v1.4 Fix A pattern; 1 k.column_registry FK-flag UPDATE; pg_trgm v1.6 confirmed installed. Migration recorded in `supabase_migrations.schema_migrations`. **L38 candidate empirically vindicated.**

## 2. Lineage

- **v1** (2026-05-12): initial draft after L48 Atomicity Gate split of cc-0010 parent brief
- **v1.1**: CCD corrections (no `is_stale`; `UNIQUE NULLS NOT DISTINCT`; PG15 probe; cross-schema FK probe)
- **v1.2**: arithmetic cleanup; CCD-strengthened §1.9 via `pg_constraint`
- **v1.3**: L44 live pre-flight caught `m.post_publish_queue.queue_id` PK-name asymmetry → FK target corrected at 5 loci
- **v1.3 apply attempt 2026-05-12 08:15:13 UTC**: FAILED atomically with PG error 23502 on `k.column_registry.ordinal_position` NOT NULL. Zero persistent effect. Migration NOT recorded. D-01 row `8a4b93fb-54f4-4cd9-b167-a522ef74ace2` remained `status='escalated'`.
- **v1.4**: Fix A pattern (86-row `purposes` CTE joined to `information_schema.columns` hydrates live NOT NULL columns); §1.7b NEW probe enumerates k.column_registry NOT NULL columns; §1.6 k.table_registry §3.6 UPSERT body fully inlined; HALT codes H7b + H10; risk catalog #12 F-CC-0010A-K-COLUMN-REGISTRY-NOT-NULL-OMISSION caught + resolved
- **v1.5**: CCD narrow review accepted v1.4 at commit `2035a3a8` (verdict=agree-with-corrections, risk=low, no blocking corrections); v1.5 tightened V6c row-count `>= 86` → `= 86` per non-blocking suggestion; single-line semantic change
- **v1.5 D-01 fire**: review_id `752dfec6-6f9a-4956-b7d7-a4112009b93c`, verdict=agree, risk=medium, confidence=high, **zero pushback** (first cc-0010A D-01 to do so)
- **v1.5 apply succeeded** ✓

## 3. Production state changes

| Mechanism | Count | Detail |
|---|---:|---|
| `apply_migration` (success) | 1 | `cc_0010a_r_evidence_matcher_schema_foundation` recorded in supabase_migrations.schema_migrations |
| `apply_migration` (atomic rollback prior) | 1 | v1.3 attempt at 08:15:13 UTC — zero persistent effect |
| New `r.*` tables | 6 | ice_publication_evidence (17 cols), platform_observation (16 cols), platform_manual_observation (17 cols), reconciliation_match (16 cols), platform_observer_health (10 cols), matcher_config (10 cols) |
| New `r.*` functions | 1 | `r.compact_raw_json(jsonb) RETURNS jsonb` IMMUTABLE, INVOKER, plpgsql |
| New FK constraints | 1 | `expected_publication_matched_match_id_fkey` → `r.reconciliation_match(reconciliation_match_id) ON DELETE SET NULL` |
| New `r.*` data rows | 1 | `r.matcher_config` global default (NULL client_id, NULL platform, defaults per PRV-0 §6.3) |
| `k.table_registry` UPSERTs | 6 | r.* schema, all status=active, all refresh_method=manual_upsert |
| `k.column_registry` rows | 86 | via Fix A pattern; all NOT NULL columns hydrated from `information_schema.columns` |
| `k.column_registry` UPDATE | 1 | matched_match_id FK flag flipped (substantive fields correct; purpose marker REPLACE no-op — accept-with-variance) |
| `pg_extension pg_trgm` | unchanged | already installed v1.6 |
| `m.chatgpt_review` UPDATEs (close-the-loop) | 2 | v1.3 D-01 row `8a4b93fb` (escalated→resolved) + v1.5 D-01 row `752dfec6` (completed→resolved) — single 2-row UPDATE |
| GitHub commits | 6 prior + 1 close | v1, v1.1, v1.2, v1.3, v1.4 (2035a3a8), v1.5 (3db84322) docs; this commit is the 4-way sync close |

## 4. V-check verdicts

| Check | Result | Notes |
|---|:---:|---|
| V1 (6 assertions: tables + helper + ext + FK + matcher_config rows) | ✓ PASS | 6/true/true/true/1/1 |
| V2 (per-table column counts 17/16/17/16/10/10 = 86) | ✓ PASS | exact match |
| V3 (3 IMMUTABLE r.* functions expected) | ✓ PASS with disclosure | 4 routines actually exist (`compact_raw_json`, `normalise_text`, `set_updated_at`, `to_sydney_local_date`); brief V3 underspecified — `set_updated_at` is cc-0009 carry-over |
| V4 (compact_raw_json 6-input shape test) | ✓ PASS | NULL/`null`/`[1,2,3]`/`{"keep":1}`/`{"a":1}`/`{"keep":1,"other":2}` all match expected — `result_jsonb` rename works identically to brief's `out` |
| V5 (matched_match_id FK def) | ✓ PASS | `FOREIGN KEY (matched_match_id) REFERENCES r.reconciliation_match(reconciliation_match_id) ON DELETE SET NULL` |
| V5b (post_publish_queue_id FK targets queue_id) | ✓ PASS | `FOREIGN KEY (post_publish_queue_id) REFERENCES m.post_publish_queue(queue_id) ON DELETE SET NULL` — v1.3 L44 correction empirically validated post-apply |
| V6 (matched_match_id k.column_registry FK fields + purpose marker) | ◐ PARTIAL → accept-with-variance | FK fields all correct; purpose marker absent (REPLACE no-op because cc-0009 live text didn't contain target substring; brief §3.8 footnote anticipated this) |
| V6b (post_publish_queue_id k.column_registry fk_ref_column='queue_id') | ✓ PASS | all 4 fields correct |
| V6c (v1.5 tightened: total_r_column_rows = 86 strict equality + 0 NULLs) | ✓ PASS | 86/0/0/0/0 — Fix A pattern populated every NOT NULL column |
| V7 (registry final state) | ✓ PASS | 6 new k.table_registry rows; 86 k.column_registry r.* rows from cc-0010A; 0 empty purpose; FK counts 5/1/1/2/3/2=14 |
| V8 (pg_trgm) | ✓ PASS | installed v1.6 |

**V-check totality:** 10 PASS + 1 accept-with-variance (V6 purpose marker). Stage A v1.5 substantive contract delivered.

## 5. L45 post-mutation truth check — count-delta table

| What | Pre | Post | Delta | Expected | Match? |
|---|---|---|---|---|---|
| r.ice_publication_evidence existence | not exists | exists (0 rows) | new | new | ✓ |
| r.platform_observation existence | not exists | exists (0 rows) | new | new | ✓ |
| r.platform_manual_observation existence | not exists | exists (0 rows) | new | new | ✓ |
| r.reconciliation_match existence | not exists | exists (0 rows) | new | new | ✓ |
| r.platform_observer_health existence | not exists | exists (0 rows) | new | new | ✓ |
| r.matcher_config rows | 0 | 1 | +1 | +1 | ✓ |
| r.matcher_config global default rows | 0 | 1 | +1 | +1 | ✓ |
| r.compact_raw_json function | not exists | exists | new | new | ✓ |
| matched_match_id FK | not exists | exists | new | new | ✓ |
| post_publish_queue_id FK target | not exists | m.post_publish_queue(queue_id) | new | queue_id | ✓ |
| r.expected_publication rows | 98 | 98 | 0 | 0 | ✓ |
| r.reconciliation_run rows | 5 | 5 | 0 | 0 | ✓ |
| ep with matched_match_id | 0 | 0 | 0 | 0 | ✓ |
| k.table_registry r.* rows | 5 (live, includes 3 geography rows) | 11 | +6 | +6 | ✓ delta correct |
| k.column_registry r.* rows total | 95 (live, includes 64 geography) | 181 | +86 | +86 | ✓ delta correct |
| k.column_registry.ordinal_position v1.3 failure-class | NULL → rollback | populated for all 86 | populated | populated | ✓ |
| pg_extension pg_trgm | installed v1.6 | installed v1.6 | no-op | installed | ✓ |
| Migration recorded | 0 rows | 1 row | +1 | +1 | ✓ |

## 6. L45 mismatch declaration

| # | What | Expected | Actual | Decision |
|---|---|---|---|---|
| 1 | §2.7 PL/pgSQL DECLARE variable name | `out` (brief verbatim from PRV-0 §4.3) | `result_jsonb` (renamed at apply construction) | **accept-with-variance** — `out` is PG reserved word; would fail `DECLARE` compile. Semantically identical: same return value, same volatility, V4 all 6 outputs match. Fix-forward: v1.6 doc patch + PRV-0 §4.3 update |
| 2 | V3 function count | 3 | 4 (incl. `r.set_updated_at` cc-0009 trigger helper) | **accept-with-variance** — brief V3 prose underspecified; `r.compact_raw_json` is correctly installed |
| 3 | V6 purpose marker on matched_match_id | `true` (ILIKE `%L38 candidate empirically vindicated%`) | `false` (REPLACE no-op) | **accept-with-variance** — substantive FK fields correct; cc-0009 live `column_purpose` starts with "PRV-0 §3.3 specifies FK..." not the REPLACE target. Brief §3.8 footnote anticipated this. Fix-forward: explicit `column_purpose = column_purpose || ' [cc-0010A: L38 vindicated]'` UPDATE in future patch |
| 4 | L45 k.table_registry r.* baseline | 2 (brief) | 5 (live: +3 geography) | **accept-with-variance** — F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION P3 finding predicted; delta +6 correct |
| 5 | L45 k.column_registry r.* baseline | ~17 implicit | 95 (live: +64 geography rows from 3 country* tables) | **accept-with-variance** — same root cause; delta +86 correct |

**Summary:** 5 mismatches, all accept-with-variance. Zero re-fire / rollback / escalate.

## 7. L45 sanity sample (5 shape-variant rows)

All 5 sample rows demonstrate `ordinal_position` populated (1, 5, 13, 7, 9) — Fix A pattern works for every shape:

1. **PK uuid NOT NULL no-default** (v1.3 failure class): `r.ice_publication_evidence.ice_publication_evidence_id` — `ordinal_position=1`, `data_type=uuid`, `is_nullable=false`, no FK ✓
2. **FK with naming-asymmetry**: `r.ice_publication_evidence.post_publish_queue_id` — `is_foreign_key=true`, `fk_ref=m.post_publish_queue.queue_id` ✓
3. **JSONB with default**: `r.ice_publication_evidence.raw_evidence` — `data_type=jsonb`, `is_nullable=true`, default `'{}'`
4. **numeric(4,3) NOT NULL with CHECK**: `r.matcher_config.fuzzy_levenshtein_threshold` — `data_type=numeric`, `is_nullable=false`, default `0.850`
5. **STORED GENERATED**: `r.platform_observer_health.is_healthy` — `data_type=boolean`, `is_nullable=true` (PG reports STORED GENERATED as nullable; brief anticipated)

## 8. L-series lesson outcomes

- **L37 candidate**: continued vindication through cc-0010A multi-stage authoring (v1 → v1.5)
- **L38 candidate**: **EMPIRICALLY VINDICATED** at cc-0010A Stage A close (cross-brief FK ALTER `r.expected_publication.matched_match_id` → `r.reconciliation_match(reconciliation_match_id)`). Recommend promotion to baseline
- **L44 (Runtime Proof Pre-flight)**: **3rd live exercise complete.** v1.3 pre-flight caught `queue_id` PK-name drift. v1.4 added §1.7b NOT NULL enumeration after v1.3 apply failure exposed L44's UNIQUE-only blind spot. v1.5 pre-flight all 12 probes clean. **Baseline-eligible.**
- **L45 (Post-mutation truth check)**: **first full live exercise complete.** Count-delta + 5-row sanity sample + 5-row mismatch declaration template all exercised. All 5 mismatches resolved accept-with-variance. **Baseline-eligible.**
- **L46 (Reviewer Evidence Gate)**: **3rd live application complete.** v1.3 D-01 returned 2 GNB pushbacks → PK Path B override → apply attempted → apply failed downstream. v1.5 D-01 returned **zero pushback** clean pass-through — no override needed, no GNB classification triggered. Demonstrates that improving the brief surface (Fix A + v1.5 V6c tightening) eliminates need for overrides. **Continues baseline.**
- **L48 (Atomicity Gate)**: split decision applied; cc-0010A delivered as atomic sub-build. **Vindicated.**
- **NEW lesson candidate (v1.5)**: "Brief authors reproducing design-lock SQL verbatim must check for PG reserved-word collisions in PL/pgSQL DECLARE — `out`, `result`, `record`, `row`, etc. — and substitute with safe variable names. PRV-0 §4.3 had `out` which would have caused syntax error if not caught at apply construction."

## 9. Pattern firsts

1. First L48 split outcome applied (cc-0010 → A/B/C)
2. First L44 + L45 + L46 + L48 first-live-exercise cycle complete
3. First single-stage sub-brief from split parent
4. First apply-time-driven correction (v1.4 from v1.3 atomic rollback)
5. First L46 clean pass-through D-01 (v1.5, zero pushback)
6. First CCD narrow re-review accepting prior commit (v1.4 → v1.5 V6c tightening)

## 10. Outputs of cc-0010A available for downstream consumption

- 6 r.* tables ready for cc-0010B (materialiser) + cc-0010C (matcher)
- `r.compact_raw_json` helper available
- `r.matcher_config` global default in place (cc-0010C is first consumer via Tier 1 minutes_late_tolerance lookup)
- `r.expected_publication.matched_match_id` FK live (cc-0010C reconciliation-matcher will populate)
- pg_trgm indexes ready for fuzzy caption matching (Tier 4/5 deferred to PRV-2/3/4)

## 11. Open follow-ups

- v1.6 doc-only patch (or fold into cc-0010B brief): document `result_jsonb` rename in brief §2.7 + update PRV-0 §4.3
- V6 purpose-marker fix-forward UPDATE (future k.* maintenance brief)
- F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION P3 brief (3 geography rows registered to schema `r`)
- L34 trigger filter audit (whether `evtrg_sync_registry_on_create_table` excludes schema `r` or fires after same-transaction DML — Fix A pattern is trigger-independent so non-blocking)
- F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY: folds into cc-0010B brief authoring (Option a)

## 12. Stop condition checklist

- [x] v1.5 migration applied successfully
- [x] V1–V8 + V5b + V6b + V6c PASS (V6 accept-with-variance per L45)
- [x] Close-the-loop on BOTH m.chatgpt_review rows (8a4b93fb + 752dfec6) resolved
- [x] Result file committed (this file)
- [x] Session file written (`docs/runtime/sessions/2026-05-12-cc-0010A-applied.md`)
- [x] 4-way sync close (sync_state + action_list + session file + this result file in single commit)
- [x] cc-0010B + cc-0010C unblocked notice logged in sync_state

**Stage A CLOSED. cc-0010A delivered.**

---

*Result file authored 2026-05-12 Sydney by chat (Claude). Brief lineage: v1 + v1.1 + v1.2 + v1.3 + v1.4 + v1.5. Apply: 1 successful (after 1 atomic-rollback prior attempt). D-01 fires: 2 (v1.3 GNB-override + v1.5 clean-agree). V-check totality: 10 PASS + 1 accept-with-variance. L45 mismatches: 5, all accept-with-variance. Pattern firsts: 6. cc-0010B + cc-0010C unblocked.*
