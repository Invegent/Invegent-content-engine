-- F-AAP-001 fix — loosen auto-approver SQL fetcher for slot-driven v4 compat
--
-- Brief:           docs/briefs/2026-05-03-faap001-fix.md
-- Finding:         F-AAP-001 (P1)
-- Rootcause doc:   docs/runtime/sessions/2026-05-03-faap001-rootcause.md
--
-- WHAT:
--   `m.auto_approver_fetch_drafts(p_limit)` currently INNER-JOINs `m.digest_item`
--   and `m.digest_run`. Slot-driven v4 drafts (`slot_fill_synthesis_v1` job
--   type, ai-worker v2.10.0+, shipped late-April) have `pd.digest_item_id =
--   NULL` by design — slot-fill never inserts a `m.digest_item` row. INNER
--   JOIN drops every v4 draft. 0 of 122 current `needs_review` drafts pass.
--
-- FIX (Path 1 per brief §2):
--   * `INNER JOIN m.digest_item di` → `LEFT JOIN m.digest_item di`
--   * `INNER JOIN m.digest_run dr` → `LEFT JOIN m.digest_run dr`
--   * `dr.client_id` references → `pd.client_id` (SELECT, PARTITION BY,
--     LATERAL WHERE). v3 backward-compat verified by pre-flight #3:
--     0 rows where `pd.client_id IS DISTINCT FROM dr.client_id` across all
--     historical drafts with intact digest_item linkage.
--   * `di.final_score` left as-is (NULL on v4 drafts via LEFT JOIN); existing
--     `ORDER BY ... NULLS LAST` handles correctly. Per brief: D135 already
--     made final_score behaviourally a no-op so v4 NULL-final_score
--     intermixing with v3 final_score is acceptable; ordering not
--     load-bearing.
--   * SECURITY DEFINER, search_path, language, parameter list, RETURNS
--     clause, all other filters / CTEs / cooldown / status checks: preserved
--     unchanged.
--
-- PRE-FLIGHT (per brief §4 — all 6 cleared, no STOP triggered):
--   #1 Function source captured verbatim (see "BEFORE" block below).
--   #2 k.vw_table_summary confirms m.post_draft.client_id exists, type uuid.
--      Note for chat: column registry reports is_nullable=true but pre-flight
--      #5 returned 0 NULL rows empirically. m.post_draft.digest_item_id is
--      explicitly nullable=true (consistent with v4 design — slot-fill drafts
--      have NULL digest_item_id).
--   #3 v3 backward-compat client_id mismatch count: 0. Path 1 safe.
--   #4 dr./di. reference audit:
--        - 4 dr.* refs: SELECT (dr.client_id → pd.client_id), PARTITION BY
--          (dr.client_id → pd.client_id), JOIN (→ LEFT JOIN), LATERAL WHERE
--          (cpp.client_id = dr.client_id → pd.client_id). All addressed.
--        - 4 di.* refs: SELECT di.final_score (NULL acceptable per brief),
--          ORDER BY di.final_score DESC NULLS LAST (handles NULL), JOIN
--          (→ LEFT JOIN), chained JOIN dr.digest_run_id = di.digest_run_id
--          (di.digest_run_id NULL on v4 propagates correctly through second
--          LEFT JOIN). No semantic-breaking refs found in cooldown/status/
--          score gates (function has none).
--   #5 m.post_draft client_id NULL count: 0. No B-AUDIT-V4-PEERS escalation.
--   #6 cron.job jobid 58 (auto-approver-sweep): active=true, schedule
--      '*/10 * * * *'. Confirmed.
--
-- DEPLOY MODEL: Per D170, chat applies via Supabase MCP `apply_migration`
-- after firing MCP review (`action_type=sql_destructive`). CC drafts only.
--
-- ATOMICITY: `CREATE OR REPLACE FUNCTION` is atomic in PostgreSQL DDL — no
-- partial state during apply. No embedded BEGIN/COMMIT (apply_migration
-- provides its own transaction wrapper).
--
-- ──────────────────────────────────────────────────────────────────────────
-- BEFORE (verbatim from pg_get_functiondef pre-flight #1)
--
-- CREATE OR REPLACE FUNCTION m.auto_approver_fetch_drafts(p_limit integer DEFAULT 10)
--  RETURNS TABLE(post_draft_id uuid, client_id uuid, draft_body text, draft_title text, draft_format jsonb, approval_status text, digest_item_id uuid, final_score numeric, auto_approve_enabled boolean, platform text)
--  LANGUAGE sql
--  SECURITY DEFINER
--  SET search_path TO 'm', 'c', 'public'
-- AS $function$
--   WITH ranked AS (
--     SELECT
--       pd.post_draft_id, dr.client_id, pd.draft_body, pd.draft_title, pd.draft_format,
--       pd.approval_status, pd.digest_item_id, di.final_score, pd.platform,
--       cpp.auto_approve_enabled,
--       ROW_NUMBER() OVER (
--         PARTITION BY dr.client_id, pd.platform
--         ORDER BY di.final_score DESC NULLS LAST, pd.created_at ASC
--       ) AS bucket_rank
--     FROM m.post_draft pd
--     JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
--     JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
--     JOIN LATERAL (
--       SELECT cpp.client_publish_profile_id, cpp.auto_approve_enabled
--       FROM c.client_publish_profile cpp
--       WHERE cpp.client_id = dr.client_id
--         AND cpp.platform = pd.platform
--         AND cpp.status = 'active'
--       ORDER BY cpp.is_default DESC NULLS LAST,
--                cpp.created_at DESC NULLS LAST,
--                cpp.client_publish_profile_id DESC
--       LIMIT 1
--     ) cpp ON COALESCE(cpp.auto_approve_enabled, false) = true
--     WHERE pd.approval_status = 'needs_review'
--   )
--   SELECT
--     post_draft_id, client_id, draft_body, draft_title, draft_format,
--     approval_status, digest_item_id, final_score, auto_approve_enabled, platform
--   FROM ranked
--   ORDER BY bucket_rank ASC, final_score DESC NULLS LAST, post_draft_id
--   LIMIT p_limit;
-- $function$
--
-- END BEFORE
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION m.auto_approver_fetch_drafts(p_limit integer DEFAULT 10)
 RETURNS TABLE(post_draft_id uuid, client_id uuid, draft_body text, draft_title text, draft_format jsonb, approval_status text, digest_item_id uuid, final_score numeric, auto_approve_enabled boolean, platform text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'm', 'c', 'public'
AS $function$
  WITH ranked AS (
    SELECT
      pd.post_draft_id, pd.client_id, pd.draft_body, pd.draft_title, pd.draft_format,
      pd.approval_status, pd.digest_item_id, di.final_score, pd.platform,
      cpp.auto_approve_enabled,
      ROW_NUMBER() OVER (
        PARTITION BY pd.client_id, pd.platform
        ORDER BY di.final_score DESC NULLS LAST, pd.created_at ASC
      ) AS bucket_rank
    FROM m.post_draft pd
    LEFT JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
    LEFT JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
    JOIN LATERAL (
      SELECT cpp.client_publish_profile_id, cpp.auto_approve_enabled
      FROM c.client_publish_profile cpp
      WHERE cpp.client_id = pd.client_id
        AND cpp.platform = pd.platform
        AND cpp.status = 'active'
      ORDER BY cpp.is_default DESC NULLS LAST,
               cpp.created_at DESC NULLS LAST,
               cpp.client_publish_profile_id DESC
      LIMIT 1
    ) cpp ON COALESCE(cpp.auto_approve_enabled, false) = true
    WHERE pd.approval_status = 'needs_review'
  )
  SELECT
    post_draft_id, client_id, draft_body, draft_title, draft_format,
    approval_status, digest_item_id, final_score, auto_approve_enabled, platform
  FROM ranked
  ORDER BY bucket_rank ASC, final_score DESC NULLS LAST, post_draft_id
  LIMIT p_limit;
$function$;
