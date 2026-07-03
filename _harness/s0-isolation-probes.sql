-- =============================================================================
-- S0 PRODUCTION-ISOLATION INVARIANT PROBES (read-only companion artifact)
-- _harness/s0-isolation-probes.sql
--
-- Design:  docs/briefs/tmr-shadow-mode-stamping-design-packet.md §5
--          (production-isolation verification step — mandatory per external
--           review 2026-07-03; PK-accepted). The claim "S0 touches nothing
--           production" is verified with evidence, not asserted.
--
-- HOW TO USE
--   1. Run this file IMMEDIATELY BEFORE applying
--      _harness/s0-shadow-retroactive-batch.sql — save the output as PRE.
--   2. Apply the S0 batch.
--   3. Run this file IMMEDIATELY AFTER — save the output as POST.
--   4. Diff PRE vs POST: every row must be BYTE-IDENTICAL. Any difference in
--      any production table = STOP, investigate before accepting the batch.
--
--   The single ORDER BY + text casts make the two outputs directly diffable.
--   This file is 100% read-only: SELECT + aggregates only, no writes, no locks
--   beyond ordinary reads.
--
-- CAVEAT (recorded for the orchestrator): production crons remain active during
--   the S0 apply (design packet §5c — isolation is structural). If a cron writes
--   between PRE and POST, those tables can legitimately drift for reasons
--   unrelated to S0. Minimise the PRE→apply→POST window (same session,
--   back-to-back); if a drift appears, re-run the PRE/apply/POST triple in a
--   quiet window or reconcile the drift against cron activity before accepting.
--
-- TABLE/COLUMN NOTES (verified against repo source 2026-07-03):
--   m.post_draft          — PK post_draft_id; has updated_at (obs grant list,
--                           20260609081127) → count + max(created_at) + max(updated_at)
--   m.post_render_log     — PK render_log_id; NO updated_at in the obs grant list
--                           → count + max(created_at) only
--   m.post_publish_queue  — PK queue_id; publisher updates updated_at
--                           (functions/publisher/index.ts) → count + both maxes
--   m.post_publish        — PK post_publish_id; publisher INSERTs set created_at
--                           only → count + max(created_at) only
--   (Table names m.post_publish_queue / m.post_publish confirmed in
--    supabase/migrations/20260422_m11_fix_enqueue_publish_queue_on_conflict.sql
--    and supabase/functions/publisher/index.ts. If live catalog disagrees,
--    orchestrator verifies before the apply.)
--
-- Also probed: c.tmr_shadow_decision batch count — the ONLY value that is
--   EXPECTED to change (0 → 17). It is emitted as a separate, clearly-labelled
--   row so the production-table diff stays byte-identical.
-- =============================================================================

SELECT * FROM (
  SELECT
    'm.post_draft'::text            AS probe_table,
    count(*)::text                  AS row_count,
    max(created_at)::text           AS max_created_at,
    max(updated_at)::text           AS max_updated_at
  FROM m.post_draft
  UNION ALL
  SELECT
    'm.post_render_log',
    count(*)::text,
    max(created_at)::text,
    'n/a (no updated_at column)'
  FROM m.post_render_log
  UNION ALL
  SELECT
    'm.post_publish_queue',
    count(*)::text,
    max(created_at)::text,
    max(updated_at)::text
  FROM m.post_publish_queue
  UNION ALL
  SELECT
    'm.post_publish',
    count(*)::text,
    max(created_at)::text,
    'n/a (insert-only audit trail)'
  FROM m.post_publish
  UNION ALL
  -- Expected delta row (NOT part of the byte-identical invariant):
  -- 0 before the S0 apply, 17 after. Everything above must not move.
  SELECT
    'zz_expected_delta: c.tmr_shadow_decision[s0-retroactive-2026-07]',
    count(*)::text,
    max(created_at)::text,
    'EXPECTED 0 pre / 17 post'
  FROM c.tmr_shadow_decision
  WHERE batch_label = 's0-retroactive-2026-07'
) probes
ORDER BY probe_table;
