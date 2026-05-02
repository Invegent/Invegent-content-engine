# Run State: post-render-log-column-purposes

Status: review_required
Risk tier: 1
Started: 2026-05-02T10:18:00Z
Finished: 2026-05-02T10:30:00Z

## Work completed

- Pre-flight live verified: 16 undocumented column rows on `m.post_render_log` (column_id 824257..824272), every `column_purpose` IS NULL. Matches brief expected_delta=16.
- Producer-code citation: `supabase/functions/image-worker/index.ts` v3.9.2 (`renderUploadAndLog` → `public.write_render_log` RPC). Read end-to-end. Confirmed image-worker is the **only** producer of `m.post_render_log` rows in the repo (no `video-worker/` directory exists; `heygen-worker/` does not write to this table).
- Producer-RPC body fetched live from production (`pg_get_functiondef`): `public.write_render_log` is a 13-arg straight-through INSERT into `m.post_render_log`; no schema enforcement on `render_spec jsonb`.
- Production sample: 932 rows, 896 succeeded / 36 failed, render_engine 100% `creatomate`, attempt_number 100% =1, `render_spec` NULL on all 932, `credits_used` NULL on all 932.
- Drafted migration at `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql` — 15 HIGH-confidence UPDATEs in a single atomic DO block with the Lesson-#38 count-delta verification (asserts `pre_count - post_count = 15` AND `post_count = 1`, the single deferred LOW row). No embedded BEGIN/COMMIT.
- Drafted LOW-confidence followup at `docs/audit/decisions/post_render_log_low_confidence_followup.md` — render_spec deferred (1 of 16, within brief's "0-2 LOW" budget), with three named resolution paths.
- Run state file written (this file).
- Brief frontmatter advanced ready → review_required.
- queue.md row updated to reflect review_required + run timestamp + LOW count.

## Files created/updated

- **Created:** `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql` (single migration; 15 HIGH UPDATEs + atomic count-delta verification; safe to run via Supabase MCP `apply_migration` per D170).
- **Created:** `docs/audit/decisions/post_render_log_low_confidence_followup.md` (1 LOW row: render_spec).
- **Created:** `docs/runtime/runs/post-render-log-column-purposes-2026-05-02T102054Z.md` (this file).
- **Updated:** `docs/briefs/post-render-log-column-purposes.md` (frontmatter status: ready → review_required).
- **Updated:** `docs/briefs/queue.md` (row moved/annotated).
- **Updated:** `docs/runtime/claude_questions.md` (appended Q-post-render-log-column-purposes-001 — open).

## Questions asked

- `Q-post-render-log-column-purposes-001` — render_spec confidence judgement (HIGH vs LOW per brief's strict JSONB rule, given the producer constructs the Creatomate payload but always passes p_render_spec=null) AND status enum reconciliation (brief carried pending|rendering|succeeded|failed verbatim from table_purpose; image-worker actually writes succeeded|failed|timeout, column default 'submitted' never written by code). Default applied: **render_spec → LOW (deferred to followup file); status column purpose → documents observed/code-cited values (succeeded|failed|timeout)** and notes the unwritten default.

## Answers received

- *(none — non-blocking; default applied per brief's "default-and-continue")*

## Corrections applied

- **Schema lookup on `k.column_registry.confidence`** (Cowork-side, not brief-author bug). The brief's pre-flight pattern reference said "query `k.column_registry` joined to `k.table_registry` (via `table_id`...)". My first pre-flight query speculatively included a `cr.confidence` column; live `information_schema.columns` lookup returned the actual column set (no `confidence` column exists in `k.column_registry`; relevant fields are `column_purpose`, `value_semantics`, `allowed_values`, `example_values`, `quality_rules`, `pii_risk`, `notes`). Re-issued the pre-flight query without `confidence`. No impact on output — purely a corrected scratch query.
- **Status enum default-and-continue** — see Q-001 above. The brief copy-pasted "pending | rendering | succeeded | failed" verbatim from the table_purpose, but live producer-code reading + production data sample showed the actual write set is `{succeeded, failed, timeout}` and the column default 'submitted' is never written by image-worker. Column purpose documents the **observed/code-cited** values, not the table_purpose verbatim list. (Brief-author bug, not Cowork bug — same pattern as the v1 nightly-health-check Q7 status enum mismatch on m.post_publish.)
- **video-worker/ vs heygen-worker/** — brief mentioned `supabase/functions/video-worker/` as a candidate producer. That directory does not exist in the repo (only `heygen-worker/`, which does not call `write_render_log`). Documented this in the followup file's "video-worker/ does not exist" line.
- **Brief frontmatter shape** — the brief frontmatter is `status / tier / allowed_paths / expected_questions / expected_delta` (the established Tier 1 column-purpose-brief shape). The D182 v1 spec lists a different field set (brief_id, status, risk_tier, owner, default_action, allowed_paths, forbidden_actions, idempotency_check, success_output). Per the four prior Tier 1 column-purpose briefs that have run cleanly (slot-core, post-publish-obs, pipeline-health-pair, operator-alerting-trio), the established shape is acceptable for this brief class — fields inferred from filename / queue.md / the brief body. **Did not halt.** Treated as a known shape divergence, not a missing-frontmatter halt condition.

## Validation results

- N/A (Phase 4b validation deferred per D183).

## Stop conditions

- none.

## Needs PK approval

- **Chat applies the migration** via Supabase MCP `apply_migration` per D170 (CC drafts/commits/pushes; chat applies/verifies). Specifically: chat reads `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql`, calls `mcp__supabase__apply_migration` with the file body, and confirms the RAISE NOTICE ("delta 15 (pre=15, post=1, 1 LOW-confidence row deferred — render_spec...)") fires cleanly.
- **PK closes Q-post-render-log-column-purposes-001** by appending a resolution block to `docs/runtime/claude_questions.md` under "Closed (resolution refs)". Recommended outcome: **Option A** — substitutions are correct, brief is final-form for the column-purpose-brief shape; no further refresh needed because there is no v2 follow-up planned (this brief closes the m-schema small-tables sweep).
- **PK / chat decides** the render_spec resolution path (followup file lists three options: image-worker patch, drop the column, or write a discriminated-union markdown spec). None is urgent.

## Token usage

- Started: ~50000 (pre-tool-loading)
- Ended: ~140000 (estimated)
- Burn: ~90000

## Issues encountered

- **render_spec / status / video-worker** — covered above; all resolved via default-and-continue.
- **Frontmatter format divergence** — covered above; not a halt.
- No production-data writes attempted. No `apply_migration` calls. No PR / merge / branch ops.

## Next step

- **Chat (next session):** apply `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql` via Supabase MCP per D170; verify the DO block's RAISE NOTICE; flip the brief in queue.md from review_required → done; close Q-001 with resolution block.
- **CC / chat (later, low-urgency):** resolve render_spec deferred LOW per the followup file (image-worker patch / drop-column / markdown-spec — pick one). Not on any critical path.
- **Strategic next brief:** m-schema column-purpose work shifts to large tables (m.post_draft 100+ cols, m.post_seed) — different brief shape; defer.
