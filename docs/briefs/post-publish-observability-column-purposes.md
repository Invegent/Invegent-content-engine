---
status: ready
tier: 1
allowed_paths:
  - supabase/migrations/
  - docs/audit/decisions/
  - docs/runtime/runs/
  - docs/briefs/queue.md
expected_questions: 0-5
expected_delta: 64
---

# Brief — Post-publish observability column-purpose population

## Goal
Populate `column_purpose` in `k.column_registry` for the three undocumented
post-publish observability tables (currently 0% each):

| schema.table | total cols | undocumented |
|---|---|---|
| m.post_format_performance_per_publish | 26 | 26 |
| m.post_performance | 18 | 18 |
| m.post_publish_queue | 20 | 20 |

Total: 64 column rows expected to flip from NULL → populated.

All three tables have `table_purpose` set in `k.table_registry` already, so
inference has solid table-level context to work from.

## Why now
Slot-core column-purposes brief just landed cleanly (56 cols, 100% HIGH
confidence, atomic delta verification passed). This brief uses the exact
same pattern on the natural next slice — the post-publish observability
trio.

Strategic value:
- These three tables drive Phase 2.1 (Facebook Insights back-feed). Documenting them now reduces friction when Phase 2.1 starts.
- `m.post_publish_queue` sits adjacent to the Phase B slot-driven path — clear documentation here helps when slot-driven work resumes after Phase B exit.
- m schema coverage moves from 17.3% (119/686) to ~26.7% (183/686).
- Touches `k.column_registry` only — zero impact on the Phase B +24h
  observation window for the image_quote body-health gate (deploy
  2026-04-30T03:48:25Z, checkpoint 2026-05-01T03:48:25Z).

## Pattern (per D170 / Lesson #36 / Lesson #38)
Identical pattern to `slot-core-column-purposes` (just-completed, used as the reference template):

1. **Pre-flight every table touched** (Lesson #32) — query
   `k.column_registry` joined to `k.table_registry` for each of the three
   tables; capture exact undocumented `column_id` list and `ordinal_position`
   ordering before drafting any SQL. Confirm undocumented total = 64.
   If pre-flight surfaces a different count, **STOP and flag to PK** — do
   not silently adjust expected_delta.

2. **Draft migration** at
   `supabase/migrations/{YYYYMMDDHHMMSS}_audit_post_publish_observability_column_purposes.sql`.
   Use plain `UPDATE k.column_registry SET column_purpose = '...'
   WHERE column_id = ...` — `column_registry` is in `k` schema and DML works
   directly via execute_sql / apply_migration without SECURITY DEFINER wrappers.

3. **Atomic count-delta DO block** at end of migration (Lesson #38, the same
   self-verification structure that has now passed twice across F-002 Phase D and slot-core):
   pre-count rows where column_purpose IS NULL/empty/PENDING/TODO for the
   three tables, run the updates, post-count, RAISE EXCEPTION if
   `pre_count - post_count <> 64`.

4. **Filename naming** (Lesson #36): if any earlier migration with the same
   logical name exists, use `_corrected` suffix on the NEW file rather than
   editing history.

## Inference rules (HIGH confidence — proceed)
For each undocumented column, derive `column_purpose` from:
- column name + `data_type`
- table-level `purpose` already in `k.table_registry`
- FK edges (`fk_ref_schema`, `fk_ref_table`, `fk_ref_column`)
- existing `columns_list` from `k.vw_table_summary` for sibling tables
- production data samples (these tables have rows — sample value
  distributions for enum/state text columns)
- canonical post-publish state machines (queue status transitions,
  approval transitions, performance metric refresh cadence)

Match the prose style of currently-documented column purposes elsewhere in
`k.column_registry` — short, precise, written in plain technical English.
One sentence each unless the column needs disambiguation. Sibling
documented column purposes from `m.slot`, `m.slot_fill_attempt`, `m.ai_job`
(just-populated) are a good reference for tone and detail level.

## CRITICAL — JSONB columns specifically (operator-added precision point)

These three tables are highly likely to contain JSONB columns holding raw
platform metric blobs from external APIs (Facebook Graph insights,
LinkedIn analytics responses, etc.). Slot-core had `check_pool_health()`
function as a documented JSONB schema source for `pool_health_at_attempt`.
**This trio likely has no equivalent function.**

Therefore the JSONB confidence rule is stricter than slot-core:
- A JSONB column is HIGH confidence ONLY if its schema is referenced by:
  - a SQL function or trigger body that constructs/reads its keys, OR
  - an Edge Function source file in `supabase/functions/` that
    constructs/parses its keys, OR
  - an existing markdown doc in `docs/` referencing the schema
- A JSONB column is **LOW confidence** if its only schema evidence is a
  single sample row, even if that row has clear key names. Platform
  responses can drift between API versions; one sample is not a
  documented schema.
- LOW-confidence JSONB columns go straight to the followup file with a
  short note explaining what the sampled key set looks like and
  suggesting either (a) a Phase 2.1 implementation will canonicalise
  the schema or (b) the operator clarifies which platform API version
  is the source of truth.

This guardrail is intentional. The point of HIGH confidence is "I can
cite where this came from." A single sample with no source citation is
exactly the case the LOW-confidence escalation exists for.

## Escalate (LOW confidence → followup file, do NOT guess)
Push to a follow-up markdown for joint operator+chat session if the column
has any of these signals:
- ambiguous JSONB shape with no documented schema source (see CRITICAL section above)
- counter columns whose unit is genuinely unclear (impressions vs reach
  vs unique reach is a real ambiguity for Facebook insights)
- enum-like text columns whose allowed_values cannot be enumerated from
  data with confidence (e.g. only one observed value across all rows)
- domain-specific platform-API knowledge required (Facebook Graph version
  semantics, LinkedIn analytics taxonomy)

Write LOW-confidence escalations to:
`docs/audit/decisions/post_publish_observability_low_confidence_followup.md`
following the same format as existing
`f002_p*_low_confidence_followup.md` files — one row per column with:
schema.table.column, why low-confidence, suggested questions for PK.

The brief expects 0–10 LOW-confidence rows in this trio (vs 0 in
slot-core) given the JSONB-heavy and platform-metric-heavy nature of
these tables. If the LOW-confidence count exceeds 10, **STOP and flag** —
the trio may not be a clean Tier 1 brief and may need re-scoping.

## Acceptance criteria
- Pre-flight count check matches expected_delta=64 exactly. STOP if not.
- Migration applied via Supabase MCP `apply_migration` per D170 (chat
  applies, not CC — CC drafts, commits, pushes; chat applies + verifies).
- Count-delta DO block self-verification asserts `pre - post = 64 - low_confidence_count`
  where `low_confidence_count` is the number of columns escalated to the
  followup file (and therefore not updated in this migration).
- LOW-confidence column count is documented in the closure note (e.g.
  "61 of 64 populated, 3 escalated").
- LOW-confidence followup file at
  `docs/audit/decisions/post_publish_observability_low_confidence_followup.md`
  if any rows escalated.
- Closure note at
  `docs/runtime/runs/post-publish-observability-purposes-{ISO timestamp}.md`
  per `state_file_template`.
- `docs/briefs/queue.md` flow: ready → review_required (after CC pushes) →
  done (after chat applies).

## Out of scope
- The 6 LOW-confidence column rows already pending in
  `docs/audit/decisions/f002_p*_low_confidence_followup.md` — awaiting joint
  operator+chat session, do not touch.
- Any DDL changes (this is purpose-population only — no ALTER TABLE).
- Other `m.*` tables not listed above (next slice candidates per slot-core
  follow-ups: `pipeline_health_log` 21, `external_review_queue` 21,
  `compliance_review_queue` 19, `external_review_digest` 17,
  `cron_health_snapshot` 16, `post_render_log` 16 — separate briefs).
- Touching the slot-core run state, the Phase B patch run state, or any
  Phase B observation queries.
- Anything that writes to `m.*` rows (this brief writes to
  `k.column_registry` only — production data is untouched).

## Out of scope safety
If the pre-flight surfaces a different undocumented count than 64, STOP
and flag to PK — do not silently adjust expected_delta. The three target
tables might have had columns added/removed since this brief was authored.

## Brief authorship context
Authored 2026-04-30 ~04:00Z, ~10 minutes after the Phase B patch run state
closed cleanly. The Phase B +24h observation window
(2026-04-30T03:48:25Z → 2026-05-01T03:48:25Z) is running in parallel and
is independent of this brief — this brief touches `k.column_registry`
only.
