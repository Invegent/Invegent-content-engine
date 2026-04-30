---
status: ready
tier: 1
allowed_paths:
  - supabase/migrations/
  - docs/audit/decisions/
  - docs/runtime/runs/
  - docs/briefs/queue.md
expected_questions: 0-2
expected_delta: 16
---

# Brief — post_render_log column-purpose population

## Goal
Populate `column_purpose` in `k.column_registry` for the last
undocumented small-table m-schema slice:

| schema.table | total cols | undocumented |
|---|---|---|
| m.post_render_log | 16 | 16 |

Total: **16 column rows** expected to flip from NULL → populated.

Table_purpose is already rich and authoritative:
*"Audit log of image and video render attempts via Creatomate. One row
per render API call. Tracks render_engine, status
(pending/rendering/succeeded/failed), output_url, storage_url,
credits_used, render_duration_ms, and attempt_number. render_spec JSONB
holds the full payload sent to Creatomate. Used for cost monitoring and
render debugging."*

The table_purpose explicitly enumerates 8 of the 16 columns by name and
documents the status enum verbatim. This brief is the cleanest of the
five Tier 1 column-purpose briefs in this 24-hour run.

## Why now
Fifth and final Tier 1 column-purpose brief in this 24-hour run. Closes
out the m-schema small-tables documentation sweep:
- Phase D ARRAY (29 Apr): 7 cols (c+f schemas)
- Slot-core (30 Apr 02:01Z): 56 cols (0 LOW)
- Post-publish observability (30 Apr 04:19Z): 61 cols (3 LOW)
- Pipeline-health pair (30 Apr 06:02Z): 37 cols (0 LOW)
- Operator-alerting trio (30 Apr 06:50Z): 57 cols (0 LOW)
- **post_render_log (this brief): 16 cols (expected 0-2 LOW)**

Strategic value:
- Closes the m-schema small-tables sweep — F04 was the last item in the
  Frozen list gated on R05 shipping.
- m schema coverage moves from 39.94% (274/686) to **~42.3% (290/686)**.
- After this brief, the m-schema column-purpose work shifts to large
  tables (`m.post_draft` with 100+ cols, `m.post_seed`, etc.) which
  warrant a different brief shape than the 16-57-col Tier 1 pattern
  used today.
- Touches `k.column_registry` only — zero impact on Phase B +24h
  observation window for the image_quote body-health gate (deploy
  2026-04-30T03:48:25Z, checkpoint 2026-05-01T03:48:25Z).

## Pattern (per D170 / Lesson #36 / Lesson #38)
Identical pattern to the four prior Tier 1 column-purpose briefs.
Reference template: the just-applied
`supabase/migrations/20260430065007_audit_operator_alerting_trio_column_purposes.sql`
(operator-alerting trio).

1. **Pre-flight** (Lesson #32) — query `k.column_registry` joined to
   `k.table_registry` (via `table_id`, not schema_name+table_name) for
   `m.post_render_log`. Confirm undocumented = 16. STOP and flag if not.

2. **Draft migration** at
   `supabase/migrations/{YYYYMMDDHHMMSS}_audit_post_render_log_column_purposes.sql`.

3. **Atomic count-delta DO block** at end (Lesson #38, now run 4× clean
   today): pre-count NULL/empty/PENDING/TODO rows, run 16 UPDATEs,
   post-count, RAISE EXCEPTION if `pre_count - post_count <> (16 - low_confidence_count)`.

4. **NO embedded BEGIN/COMMIT** — Supabase MCP `apply_migration` provides
   its own transaction wrapper.

## Inference rules (HIGH confidence — proceed)

For each undocumented column, derive `column_purpose` from:
- The detailed `table_purpose` already in place (most authoritative
  source — names 8 columns directly + enumerates status enum).
- column name + `data_type`
- FK edges if any
- production data samples for enum-like text columns
- **producer code paths** — locate the Edge Functions that write this
  table:
  - `image-worker` (Creatomate image render path; v3.9.2 production per
    userMemories — 1080×1080 PNG, Montserrat font)
  - `video-worker` (Creatomate video render path; cron
    `video-worker-every-30min` per cycle 1 snapshot section 6)

Match the prose style of currently-documented column purposes in
`k.column_registry`. Sibling references: the just-populated
`m.post_publish` (18 cols), `m.post_format_performance_per_publish`
(26 cols), `m.post_publish_queue` (17 of 20 cols). Tone and detail
level established across 11 tables now.

### Specific patterns expected

- **`render_spec` JSONB** (CRITICAL — strict JSONB rule applies):
  - HIGH confidence ONLY if the JSONB schema is referenced by an Edge
    Function source file in `supabase/functions/image-worker/` or
    `supabase/functions/video-worker/` that constructs/parses its keys,
    OR a SQL function/trigger body, OR an existing markdown doc.
  - LOW if the only schema evidence is a single sample row.
  - The table_purpose says "the full payload sent to Creatomate" — that
    framing names the producer (Creatomate API) and Creatomate's payload
    schema is documented. Cite both the EF source line that constructs
    the payload AND name the Creatomate API contract.

- **`status` enum** — table_purpose enumerates exactly:
  `pending | rendering | succeeded | failed`. Use this verbatim in the
  column purpose; verify against production data sample.

- **`render_engine`** — likely enum (image | video, or similar). Sample
  production data; cite observed values.

- **`output_url` vs `storage_url`** — the table_purpose distinguishes
  these as separate columns. Distinguish them in column purposes:
  output_url is likely the Creatomate-hosted URL returned by the API,
  storage_url is likely a Supabase Storage URL after the EF copies the
  asset locally. Verify against producer code.

- **`credits_used`** — Creatomate billing unit; integer. Used for cost
  monitoring per table_purpose.

- **`render_duration_ms`** — wall-clock duration of the render call;
  integer (milliseconds).

- **`attempt_number`** — retry counter; suggests the table has
  retry/idempotency logic. Verify by looking for ON CONFLICT or
  attempt_number > 1 in production data.

- **`post_draft_id` / `client_id` / FK columns** — verify FK target.

- **timestamps** (`created_at`, `updated_at`, possibly
  `started_at` / `completed_at`) — standard audit columns.

## Escalate (LOW confidence → followup file, do NOT guess)
Push to followup if:
- `render_spec` JSONB schema cannot be traced to producer code (per
  CRITICAL rule above)
- enum-like columns whose allowed_values cannot be enumerated from
  production data with confidence
- columns whose semantics depend on Creatomate API specifics that
  aren't documented in the EF source

Write LOW-confidence escalations to:
`docs/audit/decisions/post_render_log_low_confidence_followup.md`
following the same format as existing followup files.

The brief expects **0-2 LOW-confidence rows**. Lower ceiling than
previous briefs because: (a) single table, smaller surface; (b) rich
table_purpose pre-resolves much of the inference work; (c) only one
JSONB column. If LOW count exceeds 2, **STOP and flag**.

## Acceptance criteria
- Pre-flight count check matches expected_delta=16 exactly. STOP if not.
- Migration applied via Supabase MCP `apply_migration` per D170 (chat
  applies, not CC — CC drafts, commits, pushes; chat applies + verifies).
- Count-delta DO block self-verification asserts
  `pre - post = 16 - low_confidence_count`.
- LOW-confidence column count documented in closure note.
- LOW-confidence followup file at
  `docs/audit/decisions/post_render_log_low_confidence_followup.md` if
  any rows escalated.
- Closure note at
  `docs/runtime/runs/post-render-log-purposes-{ISO timestamp}.md`.
- queue.md flow: ready → review_required (after CC pushes) → done
  (after chat applies).

## Out of scope
- Other m-schema tables (large tables like m.post_draft are next, but
  that's a different brief shape — defer to next session).
- Any DDL changes (purpose-population only — no ALTER TABLE).
- Touching the prior four briefs' run states or migrations.
- Updating Creatomate's API integration — this brief documents the
  audit log columns only, not the integration layer.
- Writing to `m.post_render_log` rows (this brief writes to
  `k.column_registry` only — production data untouched).

## Brief authorship context
Authored 2026-04-30 ~17:10 Sydney / 07:10Z by chat. Fifth Tier 1
column-purpose brief in this 24-hour run, after slot-core (clean),
post-publish-obs (3 LOW), pipeline-health-pair (clean), and
operator-alerting-trio (clean). Pre-flight by chat confirmed exact
column count (16) and detailed table_purpose presence.

This is intentionally the smallest of the five briefs — it closes out
the small-tables sweep and provides a clean stopping point for the
day's column-purpose work. Any further m-schema column-purpose work
shifts to larger tables (m.post_draft, m.post_seed, etc.) which need
different brief shape and shouldn't be rushed in tonight.

CC may apply this overnight; chat will pick it up tomorrow after
T01 (Phase B obs checkpoint) and T02 (Gate B exit decision) resolve.
