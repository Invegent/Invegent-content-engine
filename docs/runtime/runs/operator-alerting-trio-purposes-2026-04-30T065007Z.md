# Run State: operator-alerting-trio-column-purposes

Status: done
Risk tier: 1
Started: 2026-04-30T06:50:07Z
Finished: 2026-04-30T06:50:07Z (CC drafted)
Applied: 2026-04-30T07:08:00Z (chat applied via Supabase MCP per D170)

## Work completed

- Read brief in full at `docs/briefs/operator-alerting-trio-column-purposes.md`.
- Pre-flight (Lesson #32): joined `k.column_registry` to `k.table_registry` via `table_id` for the three target tables. Confirmed **57 undocumented columns exactly** (21 + 19 + 17). All three tables have `table_purpose` set; `external_review_queue` and `external_review_digest` already carry "Paused per D162" in their table-level purpose, so column purposes do NOT repeat that (per brief).
- Captured row counts: `external_review_queue` 26 rows (paused but with audit data), `compliance_review_queue` 5 rows (active), `external_review_digest` 3 rows (paused).
- Located producer code paths and read them:
  - `m.compliance_review_queue` ← `compliance-monitor` populates the queue; `compliance-reviewer` Edge Function (`supabase/functions/compliance-reviewer/index.ts:200-244`) reads pending rows, calls `analyseWithClaude()`, writes back via the `public.store_compliance_ai_analysis(p_review_id, p_ai_analysis, p_ai_confidence, p_ai_error)` RPC. RPC body confirmed: UPDATEs `ai_analysis`, `ai_confidence`, `ai_reviewed_at = NOW()`, `ai_error`.
  - `m.external_review_queue` and `m.external_review_digest` ← `supabase/migrations/20260421_d156_external_reviewer_layer.sql` (D156). Migration carries full CREATE TABLE statements, table-level COMMENTs that enumerate the severity vocabulary (info | warn | critical) and digest lifecycle (running | succeeded | failed; trigger_type weekly_cron | on_demand), and the seeded reviewer rows whose system_prompts pin the output JSON schema (overall_severity, summary, detail, referenced_rules, referenced_artifacts) that maps directly into row columns.
- Sampled JSONB and enum vocab:
  - `compliance_review_queue.ai_analysis` (3 of 5 rows populated) — observed key set matches the schema constructed at `compliance-reviewer/index.ts:205`: `summary`, `relevance`, `confidence`, `confidence_reason`, `key_changes`, `affected_rules` (objects with `rule_key`, `rule_name`, `action`, `impact`, `suggested_update`), `new_rules_suggested` (objects with `rule_name`, `rule_text`, `rationale`, `risk_level`, `enforcement`), `human_action_required`. Strict JSONB rule satisfied: producer code constructs the schema; the column purpose cites it.
  - `compliance_review_queue.ai_confidence` observed values: high, medium, low — matches the JSONB's `confidence` field, promoted to a top-level indexable text column.
  - `compliance_review_queue.status` observed: pending (default), reviewed — matches table_purpose lifecycle (pending -> reviewed | dismissed; dismissed not yet observed but documented in source).
  - `external_review_queue.severity` observed: info(18), warn(7), critical(1) — matches D156 COMMENT.
  - `external_review_queue.reviewer_key` observed: strategist, system_auditor, risk — `c.external_reviewer.reviewer_key` is the FK target; D156 seeds (strategist, engineer, risk) plus `engineer` since renamed/superseded by `system_auditor` are the canonical set.
  - `external_review_digest.trigger_type` observed: on_demand, weekly_cron — matches D156 COMMENT exactly.
  - `external_review_digest.status` observed: succeeded (only value across 3 rows). Default is `running`. Borderline by the brief's "only one observed value" trigger, but resolved HIGH because the D156 COMMENT explicitly enumerates the full set (running | succeeded | failed). Documented column purpose names all three states and notes that only `succeeded` has been seen on the small paused population.
- Confidence classification:
  - **`m.compliance_review_queue`: 19 HIGH / 0 LOW.** JSONB schema cited in EF; lifecycle and AI-pipeline columns cited in EF + RPC + table_purpose.
  - **`m.external_review_queue`: 21 HIGH / 0 LOW.** D156 CREATE TABLE + COMMENT + system_prompts cover the column intent including the severity / referenced_rules / referenced_artifacts mappings. `action_taken` is 100% NULL but the column-name semantic is unambiguous and the brief explicitly told CC not to reach for "paused" qualifiers — column purpose describes the intended semantic.
  - **`m.external_review_digest`: 17 HIGH / 0 LOW.** D156 CREATE TABLE + COMMENT enumerate trigger_type and status fully; remaining columns are window/counter/email-send/error fields whose semantics are unambiguous from name + table_purpose.
  - Total: **57 HIGH, 0 LOW.** No followup file needed; matches slot-core (clean) and pipeline-health-pair (clean) outcomes; one better than post-publish-obs (3 LOW).
- Drafted `supabase/migrations/20260430065007_audit_operator_alerting_trio_column_purposes.sql`: single atomic `DO $audit_operator_alerting_trio$` block — captures `pre_count` of NULL/empty/PENDING/TODO rows, runs 57 `UPDATE k.column_registry SET column_purpose = ... WHERE column_id = ...` statements, captures `post_count`, asserts `pre_count - post_count = 57`. NO embedded `BEGIN; ... COMMIT;` (Supabase MCP `apply_migration` provides its own transaction wrapper). Per Lesson #36 no `_corrected` suffix needed.
- Updated `docs/briefs/queue.md` — moved `operator-alerting-trio-column-purposes` row from `ready` to `review_required` with run timestamp `2026-04-30T065007Z`.

## Questions asked

- *(none — pre-flight clean, producer code located for compliance-reviewer (EF + RPC), D156 migration covers both external-review tables, every brief-flagged risk item resolved)*

## Answers received

- *(none — operator's pre-step instructions in the brief were followed verbatim: strict JSONB rule applied to ai_analysis, no "(paused)" suffixes added to column purposes, LOW threshold of 8 not approached)*

## Corrections applied

- *(none — initial classification stood through review)*

## Validation results

- Pre-flight count check: 21 + 19 + 17 = 57 = `expected_delta`.
- Confidence classification: 57 HIGH + 0 LOW. Well below the 8-row STOP threshold for this trio.
- JSONB strict rule honoured: `m.compliance_review_queue.ai_analysis` is HIGH because the schema is constructed in `compliance-reviewer/index.ts:205` (visible in the no-rules fallback) and again at line 217 (the analyseWithClaude success path); the column purpose names every observed top-level key and the sub-shape of the two array-of-object fields (`affected_rules`, `new_rules_suggested`).
- Pause-context guidance honoured: column purposes for `external_review_queue` and `external_review_digest` describe the intended semantic without repeating "(paused per D162)". Pause context lives at the table level only.
- Migration syntactic structure matches the F-002 P1/P2/P3/Phase-D, slot-core, post-publish-obs, and pipeline-health-pair precedents: single `DO` block, dollar-quoted column purposes, `WHERE column_id = N`, `RAISE EXCEPTION` on delta mismatch, no embedded BEGIN/COMMIT.

## Stop conditions

- *(none — pre-flight matched expected_delta exactly; LOW count stayed at 0, well below the 8-row STOP threshold)*

## Needs PK approval / chat to drive

Per D170, chat (with PK oversight) takes the next steps. CC does not apply migrations.

1. ✅ Applied `supabase/migrations/20260430065007_audit_operator_alerting_trio_column_purposes.sql` via Supabase MCP `apply_migration`.
2. ✅ Supabase MCP returned `{"success":true}` — `RAISE EXCEPTION` did not fire, i.e. `pre_count - post_count = 57` invariant held.
3. ✅ Post-state independently verified: `compliance_review_queue` 19/19, `external_review_queue` 21/21, `external_review_digest` 17/17.
4. ✅ m-schema coverage verified: **31.6% (217/686) → 39.94% (274/686)** — crosses the 40% mark called out in the brief (39.94 rounds to 40.0).
5. ✅ Will update queue.md row to Recently completed and append closure note.

## Token usage (optional)

- *(not tracked)*

## Issues encountered

- *(none — JSONB ai_analysis was the brief's primary risk and resolved cleanly with a producer-code citation; the two paused tables had a fully spec'd D156 migration to lean on; sample sparsity on paused tables didn't matter because the schema source was the migration not the data)*

## Next step

Closure complete.

## Follow-up candidates (for separate briefs)

Per the brief's "Out of scope" section, the next slice candidate is `m.post_render_log` (16 cols, frozen as F04 — its own smaller brief or combined with another small table).

This is the fourth Tier 1 column-purpose brief in 24 hours: slot-core (56, 0 LOW), post-publish-obs (64, 3 LOW), pipeline-health-pair (37, 0 LOW), operator-alerting-trio (57, 0 LOW). Cumulative: 214 columns documented across 11 tables in 24 hours; m-schema coverage moving 9.2% → ~40.0%.

---

## Chat-applied closure (2026-04-30T07:08:00Z)

Migration applied successfully via Supabase MCP `apply_migration`. Tool returned `{"success":true}` — meaning the atomic DO block's `RAISE EXCEPTION` branch did not fire, i.e. the `pre_count - post_count = 57` invariant held. The `RAISE NOTICE` ("delta 57 (pre=57, post=0, ...)") would have been emitted but Supabase MCP does not surface NOTICE output back to chat; the success return is the load-bearing signal.

**Independent post-state verification (count-delta per Lesson #38):**

| table | total | documented (post) | undocumented (post) |
|---|---|---|---|
| `m.compliance_review_queue` | 19 | 19 | 0 |
| `m.external_review_queue` | 21 | 21 | 0 |
| `m.external_review_digest` | 17 | 17 | 0 |

**m-schema coverage delta:**

- Pre: 217 / 686 (31.6%)
- Post: **274 / 686 (39.94%)** — rounds to 40.0%
- Delta: +57 documented columns (exact match to brief expected_delta)

**Audit observations (chat side, not blocking):**

CC's migration handled three judgment-prone elements with appropriate care:

1. **JSONB strict rule** — `ai_analysis` purpose cites `compliance-reviewer/index.ts:205` and the canonical writer RPC `public.store_compliance_ai_analysis`, lists all 8 documented top-level keys, and gives sub-shapes for both array-of-object fields. This is exactly the citation depth required to resolve LOW vs HIGH on a JSONB column. Strong precedent for future JSONB-bearing briefs.
2. **Paused-table convention** — column purposes for the two D162 paused tables describe semantics WITHOUT a "(paused)" suffix; pause context stays at the table level per brief instruction. Convention is now confirmed across two paused-table runs.
3. **Honest sample-vs-canonical scope on `external_review_digest.status`** — purpose names the full enum (running | succeeded | failed) per D156 COMMENT, then notes "Observed in production to date: succeeded, on a small population of 3 rows on a paused-per-D162 surface." This is the correct way to document an enum where the observed sample is sparser than the canonical spec.

**Cumulative impact across 24 hours of Tier 1 column-purpose work:**

| Brief | Columns | LOW | Cumulative m schema |
|---|---|---|---|
| Phase D ARRAY mop-up (29 Apr) | 7 | 0 | (c+f schemas) |
| Slot-core (30 Apr 02:01Z) | 56 | 0 | 9.2% → 17.3% |
| Post-publish-obs (30 Apr 04:19Z) | 61 | 3 | 17.3% → 26.2% |
| Pipeline-health pair (30 Apr 06:02Z) | 37 | 0 | 26.2% → 31.6% |
| **Operator-alerting trio (30 Apr 06:50Z)** | **57** | **0** | **31.6% → 39.94%** |
| **24h total** | **218** | **3** | **9.2% → 39.94%** |

Closure complete. Brief queue updated to `done`; row moved to Recently completed. Action list R05 closed and removed from Active.
