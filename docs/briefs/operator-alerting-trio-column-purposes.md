---
status: ready
tier: 1
allowed_paths:
  - supabase/migrations/
  - docs/audit/decisions/
  - docs/runtime/runs/
  - docs/briefs/queue.md
expected_questions: 0-3
expected_delta: 57
---

# Brief — Operator-alerting trio column-purpose population

## Goal
Populate `column_purpose` in `k.column_registry` for the three undocumented
operator-alerting / human-review tables (currently 0% each):

| schema.table | total cols | undocumented | state |
|---|---|---|---|
| m.external_review_queue | 21 | 21 | paused per D162 |
| m.compliance_review_queue | 19 | 19 | active (extended 2 Apr 2026) |
| m.external_review_digest | 17 | 17 | paused per D162 |

Total: **57 column rows** expected to flip from NULL → populated.

All three tables have `table_purpose` set in `k.table_registry` already.
Pre-flight (chat, 2026-04-30 ~16:15 Sydney) confirmed counts and
table_purpose presence. **Important:** the table_purposes for
external_review_queue and external_review_digest both explicitly state
"Paused per D162" — column purposes do not need to repeat that, since
the pause context lives at the table level.

## Why now
Fourth Tier 1 column-purpose brief in 24 hours, after slot-core (clean),
post-publish observability (3 LOW correctly escalated), and
pipeline-health pair (clean). The pattern is now proven across four
different table shapes. This brief uses it on the natural next slice —
the operator-alerting / human-review surface.

Strategic value:
- Closes out documentation on the operator-facing review surface (both
  active and paused lanes).
- The active table (`compliance_review_queue`) is part of the
  professional-compliance pipeline that may be reactivated/extended in
  Phase 3.5+; documenting now reduces friction on future work.
- The paused tables (`external_review_queue`, `external_review_digest`)
  are still part of the system schema and accrue rows of audit value;
  documenting them captures the as-built schema before any future
  unpause/re-architect work.
- m schema coverage moves from 31.6% (217/686) to **~40.0% (274/686)** —
  crosses the symbolic 40% mark.
- Touches `k.column_registry` only — zero impact on the Phase B +24h
  observation window for the image_quote body-health gate (deploy
  2026-04-30T03:48:25Z, checkpoint 2026-05-01T03:48:25Z).

## Pattern (per D170 / Lesson #36 / Lesson #38)
Identical pattern to the just-completed `pipeline-health-pair-column-purposes`,
`post-publish-observability-column-purposes`, and `slot-core-column-purposes`
briefs. Used as reference templates.

1. **Pre-flight every table touched** (Lesson #32) — query
   `k.column_registry` joined to `k.table_registry` (via `table_id`, not
   schema_name+table_name) for each of the three tables; capture exact
   undocumented `column_id` list and `ordinal_position` ordering before
   drafting any SQL. Confirm undocumented total = 57. If pre-flight
   surfaces a different count, **STOP and flag to PK** — do not silently
   adjust expected_delta.

2. **Draft migration** at
   `supabase/migrations/{YYYYMMDDHHMMSS}_audit_operator_alerting_trio_column_purposes.sql`.
   Use plain `UPDATE k.column_registry SET column_purpose = '...'
   WHERE column_id = ...` — `column_registry` is in `k` schema and DML
   works directly via execute_sql / apply_migration without SECURITY
   DEFINER wrappers.

3. **Atomic count-delta DO block** at end of migration (Lesson #38, the
   self-verification structure that has now passed FOUR times across
   F-002 Phase D, slot-core, post-publish observability, and pipeline-
   health pair):
   pre-count rows where column_purpose IS NULL/empty/PENDING/TODO for the
   three tables, run the updates, post-count, RAISE EXCEPTION if
   `pre_count - post_count <> (57 - low_confidence_count)`.

4. **Filename naming** (Lesson #36): if any earlier migration with the
   same logical name exists, use `_corrected` suffix on the NEW file
   rather than editing history. (None expected — first run.)

## Inference rules (HIGH confidence — proceed)
For each undocumented column, derive `column_purpose` from:
- column name + `data_type`
- table-level `purpose` already in `k.table_registry`
- FK edges (some expected — most likely client_id, post_draft_id, reviewer_id)
- existing `columns_list` from `k.vw_table_summary` for sibling tables
- production data samples (sample value distributions for enum/state text columns)
- **producer code paths** — locate the Edge Function / DB function that
  writes each table:
  - `m.compliance_review_queue` ← `compliance-monitor` and
    `compliance-reviewer` Edge Functions (per the table_purpose)
  - `m.external_review_*` ← `D156 external reviewer layer` migration
    (`supabase/migrations/20260421_d156_external_reviewer_layer.sql`)

Match the prose style of currently-documented column purposes elsewhere in
`k.column_registry` — short, precise, written in plain technical English.
One sentence each unless the column needs disambiguation. Sibling
documented column purposes from `m.slot`, `m.slot_fill_attempt`, `m.ai_job`,
`m.post_performance`, `m.post_publish_queue`, `m.pipeline_health_log`,
`m.cron_health_snapshot` (just-populated) are the authoritative reference
for tone and detail level.

### Specific patterns expected in this trio

These columns deserve precise treatment — flag in the column purpose:

- **Pause state**: do NOT add "(paused per D162)" to every column purpose
  on `external_review_queue` / `external_review_digest`. The pause context
  lives at the table level (already in `k.table_registry.purpose`).
  Column purposes describe the column's intended semantic — same as if
  the table were active. Adding "paused" to every column would be noise.

- **`ai_analysis` JSONB on compliance_review_queue** (CRITICAL — strict
  JSONB rule applies):
  - HIGH confidence ONLY if the JSONB schema is referenced by an Edge
    Function source file in `supabase/functions/compliance-reviewer/`
    that constructs/parses its keys, OR a SQL function/trigger body, OR
    an existing markdown doc.
  - LOW confidence if the only schema evidence is a single sample row
    with clear-looking key names. Sample-only is not a documented schema.
  - If LOW: escalate to followup with the sampled key set so PK can
    decide whether (a) the compliance-reviewer is the source of truth
    and the schema lives in code, or (b) a separate canonical schema
    doc is needed.

- **`ai_analysis` and related columns** (`ai_confidence`, `ai_reviewed_at`):
  these were extended on 2 Apr 2026 per the table_purpose. CC should
  check the compliance-reviewer Edge Function source (`supabase/functions/`)
  to find the canonical write path before classifying confidence.

- **External review pause artefacts**: the D156 migration created the
  external_review_* tables. CC should grep the migration file for the
  CREATE TABLE statements and use the column-level COMMENTS or DEFAULT
  clauses (if any) as additional evidence beyond the table_purpose.

- **Status / state enum columns**: each table likely has a status or
  state column (lifecycle). Verify allowed values from production data
  samples. State the observed enum explicitly. compliance_review_queue
  table_purpose already cites status lifecycle: `pending -> reviewed | dismissed`
  and AI analysis lifecycle. Use those as ground truth.

- **Reviewer/role columns**: `external_review_*` tables likely have
  `reviewer_id` or similar FK to a reviewers table. Check FK refs and
  document the FK target.

## Escalate (LOW confidence → followup file, do NOT guess)
Push to a follow-up markdown for joint operator+chat session if the column
has any of these signals:
- ambiguous JSONB shape with no documented schema source (per the
  CRITICAL rule above)
- enum-like text columns whose allowed_values cannot be enumerated from
  production data with confidence (e.g. only one observed value across
  all rows, especially likely on paused tables with sparse samples)
- columns whose purpose depends on a workflow that's currently paused —
  if the producer code path is unclear because the workflow hasn't run
  recently, escalate rather than guess
- domain-specific knowledge required (compliance review semantics,
  external reviewer role definitions) that's not present in code or
  table_purpose

Write LOW-confidence escalations to:
`docs/audit/decisions/operator_alerting_trio_low_confidence_followup.md`
following the same format as existing
`f002_p*_low_confidence_followup.md` and
`post_publish_observability_low_confidence_followup.md` files — one row
per column with: schema.table.column, why low-confidence, suggested
questions for PK.

The brief expects **0–8 LOW-confidence rows** (vs 0 in slot-core, 3 in
post-publish, 0 in pipeline-health-pair). The higher ceiling reflects
two pressures: (a) JSONB ambiguity on `ai_analysis`, (b) sample sparsity
on the paused tables. If the LOW-confidence count exceeds 8, **STOP and
flag** — the trio may not be a clean Tier 1 brief and may need
re-scoping.

## Acceptance criteria
- Pre-flight count check matches expected_delta=57 exactly. STOP if not.
- Migration applied via Supabase MCP `apply_migration` per D170 (chat
  applies, not CC — CC drafts, commits, pushes; chat applies + verifies).
- Count-delta DO block self-verification asserts `pre - post = 57 - low_confidence_count`
  where `low_confidence_count` is the number of columns escalated to the
  followup file (and therefore not updated in this migration).
- LOW-confidence column count is documented in the closure note (e.g.
  "53 of 57 populated, 4 escalated").
- LOW-confidence followup file at
  `docs/audit/decisions/operator_alerting_trio_low_confidence_followup.md`
  if any rows escalated.
- Closure note at
  `docs/runtime/runs/operator-alerting-trio-purposes-{ISO timestamp}.md`
  per `state_file_template`.
- `docs/briefs/queue.md` flow: ready → review_required (after CC pushes) →
  done (after chat applies).

## Out of scope
- The 9 LOW-confidence column rows already pending in the existing
  followup files (3 post-publish + 6 F-002 P1/P2/P3) — awaiting joint
  operator+chat session, do not touch.
- Any DDL changes (this is purpose-population only — no ALTER TABLE).
- Any change to the D162 pause state — `external_review_queue` and
  `external_review_digest` remain paused regardless of this brief's
  outcome. This brief only documents the columns; it does not unpause.
- Other `m.*` tables not listed above. Next slice candidates after this
  brief: `post_render_log` (16 cols) — frozen as F04, will be its own
  smaller brief or combined with another small table.
- Touching the slot-core run state, the post-publish observability run
  state, the pipeline-health pair run state, the Phase B patch run
  state, or any Phase B observation queries.
- Anything that writes to `m.*` rows (this brief writes to
  `k.column_registry` only — production data is untouched).

## Out of scope safety
If the pre-flight surfaces a different undocumented count than 57, STOP
and flag to PK — do not silently adjust expected_delta. The three target
tables might have had columns added/removed since this brief was authored.

## Brief authorship context
Authored 2026-04-30 ~16:20 Sydney / 06:20Z by chat, fourth Tier 1
column-purpose brief in 24 hours after slot-core (clean), post-publish
observability (3 LOW correctly escalated), and pipeline-health pair
(clean). Pre-flight by chat confirmed exact column counts (21 + 19 + 17 = 57)
and table_purpose presence on all three tables (including explicit "Paused
per D162" markers on two of the three). Phase B +24h observation window
(2026-04-30T03:48:25Z → 2026-05-01T03:48:25Z) is running in parallel and
is independent of this brief — this brief touches `k.column_registry`
only.

CC will likely apply this overnight while chat is offline. Chat will pick
up the migration tomorrow after T01 (Phase B obs checkpoint) and T02
(Gate B exit decision) are resolved — those P0 items take priority over
applying this Tier 1 audit migration.
