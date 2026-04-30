# Run State: post-publish-observability-column-purposes

Status: done
Risk tier: 1
Started: 2026-04-30T04:19:24Z
Finished: 2026-04-30T04:31:00Z (migration applied via Supabase MCP per D170)

## Work completed

- Read brief in full at `docs/briefs/post-publish-observability-column-purposes.md`.
- Pre-flight (Lesson #32): joined `k.column_registry` × `k.table_registry`. Confirmed **64 undocumented columns** exactly (26 + 18 + 20) — matches `expected_delta = 64`. Captured row counts: `post_format_performance_per_publish` 0 rows, `post_performance` 157 rows, `post_publish_queue` 284 rows.
- For each populated table, sampled enum / state vocab and JSONB key sets directly from production data. For the 0-row table, leaned on the markdown CREATE TABLE spec (R5 matching-layer-spec) per the brief's strict rule.
- Code reference grep across `supabase/functions/`, migration bodies, and `docs/` for every JSONB column and every column on the empty table:
  - `m.post_format_performance_per_publish` — full schema in `docs/briefs/2026-04-24-r5-matching-layer-spec.md` lines 187-218 (rename context in `r5-impl-retrospective.md`).
  - `m.post_performance.raw_payload` — constructed at `supabase/functions/insights-worker/index.ts:240-244` with keys `metric_names_used`, `failed_metrics`, `source_note`, plus `version` observed in 1 sampled row.
  - `m.post_publish_queue.status / scheduled_for / last_error / locked_at / locked_by` — extensive producer paths in `supabase/functions/publisher/index.ts`.
  - `m.post_publish_queue.acknowledged_at / acknowledged_by` — explicit table-purpose extension documented in `docs/briefs/2026-04-02-profession-compliance-wire.md`.
- Confidence classification:
  - **`m.post_format_performance_per_publish`: 26 HIGH / 0 LOW.** R5 markdown spec covers every column.
  - **`m.post_performance`: 18 HIGH / 0 LOW.** insights-worker code constructs the entire row.
  - **`m.post_publish_queue`: 17 HIGH / 3 LOW.** Publisher + table_purpose cover the state machine, locks, errors, and acknowledgement extension. The 3 LOW rows — `last_error_code`, `last_error_subcode`, `err_368_streak` — have no producer code, no markdown doc, and platform-API-specific semantics; per the brief's "domain-specific platform-API knowledge required" trigger, they are escalated rather than guessed.
- Total: **61 HIGH** (this migration) + **3 LOW** (followup file). 3 LOW is well within the brief's expected 0-10 range; no STOP triggered.
- Drafted `supabase/migrations/20260430041924_audit_post_publish_observability_column_purposes.sql`: single atomic `DO $audit_post_publish_obs$` block — captures `pre_count` of NULL/empty/PENDING/TODO rows for the three tables, runs 61 `UPDATE k.column_registry SET column_purpose = ... WHERE column_id = ...` statements, captures `post_count`, asserts `pre_count - post_count = 61`. Per Lesson #36 no `_corrected` suffix is needed (no prior migration with this logical name).
- Wrote `docs/audit/decisions/post_publish_observability_low_confidence_followup.md` with the 3 LOW rows, each with the same structure used in the existing `f002_p[1-3]_low_confidence_followup.md` files: schema.table.column, why low-confidence, suggested next steps, suggested questions for PK.
- Updated `docs/briefs/queue.md` — moved `post-publish-observability-column-purposes` from `ready` to `review_required` with run timestamp `2026-04-30T041924Z`.
- **Migration applied 2026-04-30T04:30:55Z** via Supabase MCP `apply_migration` (chat). DO block ran without RAISE EXCEPTION — atomic count-delta self-verification passed.
- **Post-apply verification (chat)**:
  - `m.post_format_performance_per_publish` 0/26 → 26/26 documented (100%)
  - `m.post_performance` 0/18 → 18/18 documented (100%)
  - `m.post_publish_queue` 0/20 → 17/20 documented (85% — 3 LOW retained for followup as designed)
  - m schema coverage moved from 17.3% (119/686) to **26.2% (180/686)** — exactly +61 columns; no collateral damage to other m tables' rows.
- Updated `docs/briefs/queue.md` — moved post-publish-observability-column-purposes from Active queue to Recently completed.

## Questions asked

- *(none — pre-flight clean, code grep produced citations or unambiguous gaps)*

## Answers received

- *(none — operator's pre-step precision points received before sample/grep: lean LOW for ambiguous cases on the 0-row table, do thorough code grep, JSONB needs a code or doc citation not just a clean sample)*

## Corrections applied

- *(none — initial classification stood through review)*

## Validation results

- Pre-flight count check: 26 + 18 + 20 = 64 = `expected_delta`.
- Confidence classification: 61 HIGH + 3 LOW. 3 LOW is within the brief's expected 0-10 range; no STOP triggered.
- JSONB strict rule honoured: `m.post_performance.raw_payload` (the only JSONB column in the trio) is HIGH because its construction is cited in `insights-worker/index.ts:240-244`.
- 0-row-table strict rule honoured: every column purpose for `m.post_format_performance_per_publish` cites the R5 matching-layer-spec markdown doc rather than reaching from the column name alone.
- Migration syntactic structure matches the F-002 P1/P2/P3/Phase-D and slot-core precedents: single `DO` block, dollar-quoted column purposes, `WHERE column_id = N` per the brief's preferred form, `RAISE EXCEPTION` on delta mismatch.
- LOW-confidence followup file format mirrors `docs/audit/decisions/f002_p[1-3]_low_confidence_followup.md` (Status header, originating context, per-column section with current state / likely meaning / why LOW / next steps / suggested PK questions, related rows, closure protocol).
- **Apply-time count-delta** (DO block, in-transaction): pre_count - post_count = 61 ✅
- **Post-apply independent verification** (chat): per-table coverage 26/26, 18/18, 17/20; schema-wide m delta exactly +61 (119 → 180).

## Stop conditions

- *(none — pre-flight matched expected_delta exactly; LOW count stayed at 3, well below the 10-row STOP threshold)*

## Apply summary

- Migration `20260430041924_audit_post_publish_observability_column_purposes` applied via Supabase MCP per D170 at 2026-04-30T04:30:55Z.
- Atomic DO block self-verified delta = 61; chat re-verified independently post-apply.
- m schema coverage: 17.3% (119/686) → **26.2% (180/686)**.
- 3 LOW columns (`last_error_code`, `last_error_subcode`, `err_368_streak` on `m.post_publish_queue`) retained as undocumented per design — captured in `docs/audit/decisions/post_publish_observability_low_confidence_followup.md` for joint operator+chat session.
- `docs/briefs/queue.md` row moved to Recently completed.
- Run-state status closed to `done`.

## Token usage (optional)

- *(not tracked)*

## Issues encountered

- `m.post_format_performance_per_publish` is empty — initially the riskiest table for HIGH confidence under the strict rule. Resolved by finding the full CREATE TABLE spec in `docs/briefs/2026-04-24-r5-matching-layer-spec.md` (lines 187-218) plus the rename context in `r5-impl-retrospective.md`. That markdown reference is exactly the kind of source the brief's strict rule asks for, so all 26 columns can be documented from the R5 spec without reaching from column names alone.
- `m.post_publish_queue` carries three FB-Graph-error tracking columns (`last_error_code`, `last_error_subcode`, `err_368_streak`) that are designed-but-unwired. No producer code, no markdown doc, all NULL/zero. Escalated to followup file rather than written with platform-API guesses.

## Follow-up candidates (for separate briefs)

Per the brief's "Out of scope" section, the next slice candidates are other m.* tables still at low documentation:
- `pipeline_health_log` (21 cols)
- `external_review_queue` (21 cols)
- `compliance_review_queue` (19 cols)
- `external_review_digest` (17 cols)
- `cron_health_snapshot` (16 cols)
- `post_render_log` (16 cols)

The 3 LOW rows in `post_publish_observability_low_confidence_followup.md` are also a candidate for resolution in the next joint operator+chat session — pairs naturally with re-examining `m.post_publish_queue.locked_by` (also designed-but-unwired but classified HIGH because it is well-named and the table_purpose explicitly mentions optimistic locking).
