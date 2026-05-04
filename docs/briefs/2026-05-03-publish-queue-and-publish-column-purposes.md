---
brief_id: publish-queue-and-publish-column-purposes
status: ready
risk_tier: 1
owner: cc
created: 2026-05-03T00:35:00Z
created_by: PK + chat session 2026-05-03 (post-F-PUB-006 cleanup window); frontmatter patched 2026-05-04 to add 5 missing v1-spec fields
default_action: draft_only
allowed_paths:
  - supabase/migrations/**
  - docs/audit/decisions/**
  - docs/runtime/runs/**
  - docs/runtime/claude_questions.md
  - docs/briefs/queue.md
  - docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md
forbidden_actions:
  - apply_migration
  - delete_branch
  - merge_pr
  - update_production_data
  - close_audit_finding
  - calling ask_chatgpt_review (chat-side per "Chat-side apply" section, not from inside this brief)
idempotency_check: "migration_file_absent"
idempotency_pattern: "supabase/migrations/*_audit_publish_queue_and_publish_column_purposes.sql"
success_output:
  - supabase/migrations/{YYYYMMDDHHMMSS}_audit_publish_queue_and_publish_column_purposes.sql
  - docs/runtime/runs/publish-queue-and-publish-column-purposes-{YYYY-MM-DDTHHMMSSZ}.md
  - docs/audit/decisions/publish_queue_and_publish_low_followup.md  # only if any LOW columns deferred
sunset: 2026-05-10T00:35:00Z
related-decisions: D170 (chat applies migrations), Lesson #61 (jsonb pre-flight)
related-findings: F-PUB-004, F-PUB-005, F-PUB-006, F-PUB-007 (NEW candidate)
related-patterns: slot-core-column-purposes, post-publish-observability-column-purposes, pipeline-health-pair-column-purposes, operator-alerting-trio-column-purposes, post-render-log-column-purposes
---

<!-- Frontmatter patched 2026-05-04: added 5 missing v1-spec-mandatory fields
     (default_action, allowed_paths, forbidden_actions, idempotency_check, success_output)
     and renamed id -> brief_id. Original Cowork halt 2026-05-03T160310Z documented at:
     docs/runtime/runs/publish-queue-and-publish-column-purposes-2026-05-03T160310Z.md
     status: failed -> ready 2026-05-04. Owner remains 'cc' (CC pickup, not Cowork —
     owner-gate added 2026-05-04 to v1 spec + cowork_prompt.md v2.2 makes Cowork skip
     owner: cc rows). -->

# Publish Queue + Publish Column Purposes

## Why this brief now

The F-PUB-006 cleanup applied today (Stages 1+2 marked 21 zombie rows dead) surfaced two adjacent findings — F-PUB-005 (premature enqueue) and F-PUB-007 candidate (silent skip at `max_queued_per_platform` cap). Both touch `m.post_publish_queue` semantics directly. **The two tables in scope (`m.post_publish_queue` and `m.post_publish`) are both at 0% documentation coverage** despite being central to the entire publish pipeline. Documenting them now while context is fresh prevents future session-warmup tax and gives next-session debugging a foundation to stand on.

This brief follows the established Tier 1 column-purposes pattern from `slot-core-column-purposes`, `post-publish-observability-column-purposes`, `pipeline-health-pair-column-purposes`, and `operator-alerting-trio-column-purposes`.

## Tables in scope

| Schema | Table | Total cols | Documented (now) | Target |
|---|---|---|---|---|
| m | `post_publish_queue` | 20 | 0 | 20 (HIGH) + 0 LOW |
| m | `post_publish` | 15 | 0 | 15 (HIGH) + 0 LOW |
| | **Total** | **35** | **0** | **35** |

**Pre-flight count check (CC runs first):**
```sql
SELECT 
  c.table_name,
  count(*) AS total_cols,
  count(*) FILTER (WHERE pg_d.description IS NOT NULL AND pg_d.description != '') AS documented_now
FROM information_schema.columns c
LEFT JOIN pg_catalog.pg_statio_all_tables t 
  ON t.schemaname = c.table_schema AND t.relname = c.table_name
LEFT JOIN pg_catalog.pg_description pg_d
  ON pg_d.objoid = t.relid AND pg_d.objsubid = c.ordinal_position
WHERE c.table_schema = 'm'
  AND c.table_name IN ('post_publish_queue','post_publish')
GROUP BY c.table_name;
```
Expected: post_publish_queue 20/0, post_publish 15/0 (recorded 2026-05-03 00:30 UTC).
**Abort if:** documented_now > 5 for either table — means another migration landed since brief authoring; investigate before drafting (Lesson #61).

## Producer code map (where columns are written)

CC reads the following sources before classifying columns. Reading the producer is the whole point — without producer-in-hand, classification defaults to LOW.

### `m.post_publish_queue` writers
- **`m.enqueue_publish_from_ai_job_v1()` trigger function** (`pg_proc` — fetch via `SELECT pg_get_functiondef('m.enqueue_publish_from_ai_job_v1'::regproc)`). Inserts new queue rows on `m.ai_job.status='succeeded'` transition. Sets: `ai_job_id`, `post_draft_id`, `client_id`, `platform`, `scheduled_for`, `status='queued'`, `attempt_count=0`.
- **`m.publisher_lock_queue_v2()` RPC** (similar pg_proc fetch). Acquires queue rows for publishers; sets `locked_at`, `locked_by`, increments `attempt_count`, sets `last_error*` columns on failure.
- **`supabase/functions/publisher/index.ts`** — facebook publisher EF. Calls `publisher_lock_queue_v2`, calls Meta Graph API, on success transitions queue row to `status` (sent/published) and writes `m.post_publish` row; on failure sets `last_error`, `last_error_code`, `last_error_subcode`, `err_368_streak`.
- **`supabase/functions/linkedin-zapier-publisher/index.ts`** — linkedin publisher EF. Same shape, different error semantics.
- **`supabase/functions/instagram-publisher/index.ts`** (currently paused per T05/T07) — read for completeness.
- **F-PUB-006 cleanup SQL today** (`supabase/sql/2026-05-03-fpub006-stage1-orphan-cleanup.sql`) — sets `status='dead'` and `dead_reason`. Documents the dead-state semantics for both columns.
- **`docs/runtime/runs/2026-05-03-fpub006-cleanup-applied.md`** — captures empirical state diagram of the queue lifecycle observed today.

### `m.post_publish` writers
- **`supabase/functions/publisher/index.ts`** — primary writer; INSERT on successful Meta API publish. Sets `platform_post_id`, `platform_url`, `published_at`, `attempt_count` (carried from queue), platform-specific metadata.
- **`supabase/functions/linkedin-zapier-publisher/index.ts`** — same shape for LinkedIn.
- **`supabase/functions/instagram-publisher/index.ts`** — paused, but read for completeness.
- **No trigger writers** (verify via `information_schema.triggers` WHERE event_object_table='post_publish').

CC also surveys `c.client_publish_profile` for any FK or referenced columns (e.g. `max_per_day`, `max_queued_per_platform`, `min_gap_minutes`) so column purposes can reference the policy semantics correctly.

## Classification rules (HIGH vs LOW)

A column is **HIGH** if all three conditions hold:
1. Producer code clearly writes the column with an unambiguous purpose
2. The purpose can be expressed in one sentence covering: what it stores, when it's set, what consumes it
3. No JSONB-shape ambiguity (Lesson #61) — for JSONB columns, CC samples 5+ rows to confirm shape consistency before classifying HIGH

A column is **LOW** (deferred, requires joint PK+chat session) if any of:
- Multiple producers write it with apparent inconsistency
- Column is documented as "TBD" or empty in producer comments
- JSONB shape varies across rows in a way that suggests semantic drift
- Column has < 5% population in production rows AND no clear write path

**LOW budget:** 0-2 LOW columns acceptable. > 2 LOW means the cluster is too messy for a Tier 1 brief — escalate to PK with the LOW list and recommend a focused investigation brief instead of forcing classification.

## Output

CC produces **one migration file**:
`supabase/migrations/{TIMESTAMP}_audit_publish_queue_and_publish_column_purposes.sql`

Format follows `post-render-log-column-purposes` (single atomic DO block, count-delta verification at the end):

```sql
DO $$
DECLARE
  v_pre_count INT;
  v_post_count INT;
BEGIN
  -- Pre-count
  SELECT count(*) INTO v_pre_count
  FROM pg_catalog.pg_description d
  JOIN pg_catalog.pg_class c ON c.oid = d.objoid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'm' AND c.relname IN ('post_publish_queue','post_publish')
    AND d.objsubid > 0;
  
  -- COMMENT ON COLUMN statements (one per HIGH column)
  COMMENT ON COLUMN m.post_publish_queue.queue_id IS '...';
  -- ... (one per column)
  COMMENT ON COLUMN m.post_publish.post_publish_id IS '...';
  -- ...

  -- Post-count + assertion
  SELECT count(*) INTO v_post_count
  FROM pg_catalog.pg_description d
  JOIN pg_catalog.pg_class c ON c.oid = d.objoid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'm' AND c.relname IN ('post_publish_queue','post_publish')
    AND d.objsubid > 0;

  ASSERT v_post_count - v_pre_count = <HIGH_count>,
    format('Expected delta=%s, got %s (pre=%s, post=%s)', <HIGH_count>, v_post_count - v_pre_count, v_pre_count, v_post_count);
  ASSERT v_post_count = <HIGH_count>,
    format('Expected post=%s, got %s', <HIGH_count>, v_post_count);
END $$;
```

CC does NOT apply this migration. Per D170, chat applies via Supabase MCP `apply_migration`.

If any LOW columns are deferred, CC writes a one-page `docs/audit/decisions/publish_queue_and_publish_low_followup.md` capturing each LOW column with: producer code observed, ambiguity signal, recommended joint-session approach.

## Run state file

CC writes `docs/runtime/runs/publish-queue-and-publish-column-purposes-{TIMESTAMP}.md` with:
- Pre-flight count results
- Producer code summary per table (which files read, key write paths identified)
- HIGH/LOW classification table (one row per column) with one-sentence justification per row
- Migration filename + SHA
- LOW followup filename if any
- Open questions (capture as `Q-publish-queue-and-publish-column-purposes-NNN`)

## What this brief explicitly does NOT do

- Patch any logic in the publish pipeline (no DDL beyond `COMMENT ON COLUMN`)
- Rename columns or change types (schema change ≠ documentation)
- Touch any other table or schema (single-cluster scope)
- Apply the migration (chat-side per D170)
- Address F-PUB-007 silent-skip-at-cap finding (separate brief)
- Investigate the ai_job/post_draft documentation regression discovered in pre-flight (separate concern)

## Failure modes

| If… | Then… |
|---|---|
| Pre-flight returns documented_now > 5 for either table | Stop. Investigate why coverage exists — possible recent migration not in repo, or query bug. Write findings to state file before drafting any COMMENT statements. |
| Producer code reading reveals 0% population for a column AND no write path | Mark column LOW with reason "no observed write path; possible legacy/orphan". |
| LOW count > 2 | Stop classification work. Write LOW list + recommendations to state file. PK reviews before resuming. |
| `pg_get_functiondef` returns NULL for trigger function | Critical — function should exist. Investigate before continuing; possible recent DROP. |
| JSONB column has > 3 distinct top-level shapes across 10-row sample | Mark LOW. Don't force a HIGH classification. |
| Migration ASSERT fails on apply (chat side) | Chat halts the apply. CC investigates count discrepancy, drafts revision. |
| Two columns appear identically named across the two tables (e.g. `attempt_count`) | Document each separately — semantics may differ subtly. Don't assume identical. |

## Estimated time

- CC pre-flight: 5 min
- CC producer code reading: 30-40 min (5 EF source files + 1 trigger function + cross-checks)
- CC classification + migration drafting: 25-35 min
- CC state file + LOW followup (if any): 10-15 min

Total: ~70-95 min CC closure budget. Tracks toward D186 4h/week floor.

## Chat-side apply (separate from CC's brief)

After CC delivers, chat:
1. Reads CC's run state file
2. Reads the migration file
3. Fires ChatGPT review (`action_type=sql_destructive`) — same protocol as F-PUB-006 stages
4. Applies migration via Supabase MCP `apply_migration` if review approves
5. Re-runs pre-flight count to verify post-state
6. Bumps queue.md and action_list.md (move row to "Recently completed")
7. Updates m schema coverage % in memory candidate

## Cross-references

- D170 (chat applies migrations): `docs/06_decisions.md`
- Lesson #61 (jsonb pre-flight): see memory entry
- Prior column-purposes briefs (pattern reference): `docs/briefs/queue.md` "Recently completed" rows
- F-PUB-006 closure work: `docs/runtime/runs/2026-05-03-fpub006-cleanup-applied.md`
- F-PUB-005 investigation: `docs/audit/runs/2026-05-03-fpub005-trigger-investigation.md`
