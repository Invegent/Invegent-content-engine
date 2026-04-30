---
status: ready
tier: 1
allowed_paths:
  - supabase/migrations/
  - docs/audit/decisions/
  - docs/runtime/runs/
  - docs/briefs/queue.md
expected_questions: 0-3
expected_delta: 37
---

# Brief — Pipeline-health pair column-purpose population

## Goal
Populate `column_purpose` in `k.column_registry` for the two undocumented
pipeline-health observability tables (currently 0% each):

| schema.table | total cols | undocumented |
|---|---|---|
| m.pipeline_health_log | 21 | 21 |
| m.cron_health_snapshot | 16 | 16 |

Total: **37 column rows** expected to flip from NULL → populated.

Both tables have `table_purpose` set in `k.table_registry` already, so
inference has solid table-level context to work from. Pre-flight (chat,
2026-04-30 ~05:30Z) confirmed counts and table_purpose presence.

## Why now
Third Tier 1 column-purpose brief in 24 hours, after slot-core (56 cols
clean, 0 LOW) and post-publish observability (64 cols, 3 LOW correctly
escalated). The pattern is now proven across two different table shapes.
This brief uses it on the natural next slice — the pipeline-health pair.

Strategic value:
- These two tables are the operator-alerting/observability bedrock. They
  are exactly the surface used to reason about pipeline health during
  incidents (see today's Phase B alert hygiene work — `m.cron_health_snapshot`
  joins to `cron.job_run_details` for the 27 Apr cron-pause investigation).
- Documenting them now makes interpreting tomorrow's Phase B +24h
  observation checkpoint queries easier (the obs queries hit
  `m.slot`/`m.slot_fill_attempt` directly, but the surrounding
  pipeline-health context lives in these two tables).
- m schema coverage moves from 26.2% (180/686) to ~31.6% (217/686).
- Touches `k.column_registry` only — zero impact on the Phase B +24h
  observation window for the image_quote body-health gate (deploy
  2026-04-30T03:48:25Z, checkpoint 2026-05-01T03:48:25Z).

## Pattern (per D170 / Lesson #36 / Lesson #38)
Identical pattern to the just-completed `post-publish-observability-column-purposes`
and `slot-core-column-purposes` briefs. Used as reference templates.

1. **Pre-flight every table touched** (Lesson #32) — query
   `k.column_registry` joined to `k.table_registry` (via `table_id`, not
   schema_name+table_name) for each of the two tables; capture exact
   undocumented `column_id` list and `ordinal_position` ordering before
   drafting any SQL. Confirm undocumented total = 37. If pre-flight
   surfaces a different count, **STOP and flag to PK** — do not silently
   adjust expected_delta.

2. **Draft migration** at
   `supabase/migrations/{YYYYMMDDHHMMSS}_audit_pipeline_health_pair_column_purposes.sql`.
   Use plain `UPDATE k.column_registry SET column_purpose = '...'
   WHERE column_id = ...` — `column_registry` is in `k` schema and DML
   works directly via execute_sql / apply_migration without SECURITY
   DEFINER wrappers.

3. **Atomic count-delta DO block** at end of migration (Lesson #38, the
   self-verification structure that has now passed three times across
   F-002 Phase D, slot-core, and post-publish observability):
   pre-count rows where column_purpose IS NULL/empty/PENDING/TODO for the
   two tables, run the updates, post-count, RAISE EXCEPTION if
   `pre_count - post_count <> (37 - low_confidence_count)`.

4. **Filename naming** (Lesson #36): if any earlier migration with the
   same logical name exists, use `_corrected` suffix on the NEW file
   rather than editing history. (None expected — first run.)

## Inference rules (HIGH confidence — proceed)
For each undocumented column, derive `column_purpose` from:
- column name + `data_type`
- table-level `purpose` already in `k.table_registry`
- FK edges (none in this trio — both tables are append-only logs without FKs)
- existing `columns_list` from `k.vw_table_summary` for sibling tables
- production data samples (these tables have rows — sample value
  distributions for enum/state text columns)
- canonical pipeline state machines (queue status transitions, image
  generation states, publisher states, cron job_run_details semantics)

Match the prose style of currently-documented column purposes elsewhere in
`k.column_registry` — short, precise, written in plain technical English.
One sentence each unless the column needs disambiguation. Sibling
documented column purposes from `m.slot`, `m.slot_fill_attempt`, `m.ai_job`,
`m.post_performance`, `m.post_publish_queue` (just-populated) are the
authoritative reference for tone and detail level.

### Specific patterns expected in this trio

These columns deserve precise treatment — flag in the column purpose:

- **Time-window suffixes**: `_30m`, `_1h`, `_today` are pipeline-health
  conventions. `_30m` = rolling 30-minute window relative to `snapshot_at`;
  `_1h` = rolling 1-hour window; `_today` = since 00:00 in client timezone
  (verify by sampling — the table doesn't store TZ explicitly, infer from
  `snapshot_at` + ICE convention of AEST). Each window-scoped column
  purpose should state the window explicitly.

- **Client-coded columns** (`ndis_published_today`, `pp_published_today`):
  these are hardcoded per-client counters from when ICE only had two
  clients. Column purposes should: (a) state the column counts published
  posts for that specific client today, (b) note the column is a hardcoded
  vestige of the two-client era and will need refactoring before adding
  external clients. Do NOT silently document them as if they were a
  general pattern. (CC: surface this nuance in the column purpose itself
  — it earns the documentation.)

- **`latest_run_status`** (cron_health_snapshot.13): enum-text column.
  Verify allowed values from production data samples. Likely subset of
  pg_cron's `cron.job_run_details.status` enum (`'succeeded'`, `'failed'`,
  `'running'`). State the observed value set in the column purpose.

- **`failure_rate`** (cron_health_snapshot.10): numeric column. Verify
  from production data whether it's a 0..1 ratio or 0..100 percentage.
  State the unit explicitly.

- **`pub_held_30m` vs `pub_throttled_30m`** (pipeline_health_log.16/17):
  these may overlap conceptually (a held post is throttled, a throttled
  post is held). Verify the distinction by reading the publisher Edge
  Function source and pipeline_health_log writer source. If the
  distinction is ambiguous in code, escalate BOTH columns to LOW.

- **`has_stuck_items` / `has_failed_images`** (pipeline_health_log.20/21):
  boolean derivations. State the source signals (which queue states
  count as "stuck", which `image_status` counts as "failed").

## Escalate (LOW confidence → followup file, do NOT guess)
Push to a follow-up markdown for joint operator+chat session if the column
has any of these signals:
- counter columns whose unit is genuinely unclear (e.g. `failure_rate` if
  the production sample range is suspicious)
- enum-like text columns whose allowed_values cannot be enumerated from
  production data with confidence (e.g. only one observed value across
  all rows)
- ambiguous overlapping concepts where source code does not disambiguate
  (e.g. `pub_held_30m` vs `pub_throttled_30m` if the publisher source is
  silent on the distinction)
- domain-specific knowledge required that is not present in code or
  table_purpose

Write LOW-confidence escalations to:
`docs/audit/decisions/pipeline_health_pair_low_confidence_followup.md`
following the same format as existing
`f002_p*_low_confidence_followup.md` and
`post_publish_observability_low_confidence_followup.md` files — one row
per column with: schema.table.column, why low-confidence, suggested
questions for PK.

The brief expects **0–5 LOW-confidence rows** (vs 3 in post-publish, 0 in
slot-core) given these two tables have no JSONB but do have a few
genuinely overlapping or unit-ambiguous columns. If the LOW-confidence
count exceeds 5, **STOP and flag** — the trio may not be a clean Tier 1
brief and may need re-scoping.

## Acceptance criteria
- Pre-flight count check matches expected_delta=37 exactly. STOP if not.
- Migration applied via Supabase MCP `apply_migration` per D170 (chat
  applies, not CC — CC drafts, commits, pushes; chat applies + verifies).
- Count-delta DO block self-verification asserts `pre - post = 37 - low_confidence_count`
  where `low_confidence_count` is the number of columns escalated to the
  followup file (and therefore not updated in this migration).
- LOW-confidence column count is documented in the closure note (e.g.
  "35 of 37 populated, 2 escalated").
- LOW-confidence followup file at
  `docs/audit/decisions/pipeline_health_pair_low_confidence_followup.md`
  if any rows escalated.
- Closure note at
  `docs/runtime/runs/pipeline-health-pair-purposes-{ISO timestamp}.md`
  per `state_file_template`.
- `docs/briefs/queue.md` flow: ready → review_required (after CC pushes) →
  done (after chat applies).

## Out of scope
- The 9 LOW-confidence column rows already pending in the existing
  followup files (3 post-publish + 6 F-002 P1/P2/P3) — awaiting joint
  operator+chat session, do not touch.
- Any DDL changes (this is purpose-population only — no ALTER TABLE).
- Other `m.*` tables not listed above. Next slice candidates per
  slot-core follow-ups: `external_review_queue` 21, `compliance_review_queue`
  19, `external_review_digest` 17, `post_render_log` 16 — separate briefs.
- Touching the slot-core run state, the post-publish observability run
  state, the Phase B patch run state, or any Phase B observation queries.
- Anything that writes to `m.*` rows (this brief writes to
  `k.column_registry` only — production data is untouched).
- The two-client refactor implied by `ndis_published_today` /
  `pp_published_today` — flag in column purpose, do not refactor.

## Out of scope safety
If the pre-flight surfaces a different undocumented count than 37, STOP
and flag to PK — do not silently adjust expected_delta. The two target
tables might have had columns added/removed since this brief was authored.

## Brief authorship context
Authored 2026-04-30 ~15:50 Sydney / 05:50Z by chat, third Tier 1
column-purpose brief in 24 hours after slot-core (clean) and post-publish
observability (3 LOW correctly escalated). Pre-flight by chat confirmed
exact column counts (16 + 21 = 37) and table_purpose presence on both
tables. Phase B +24h observation window
(2026-04-30T03:48:25Z → 2026-05-01T03:48:25Z) is running in parallel and
is independent of this brief — this brief touches `k.column_registry`
only.
