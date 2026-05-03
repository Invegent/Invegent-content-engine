-- ============================================================================
-- Migration: t_mcp_05_close_the_loop_v2_28_batch
-- Applied: 2026-05-03 late evening Sydney session via Supabase MCP apply_migration
-- Repo-side filename approximates the supabase_migrations.version timestamp.
-- The DB-registered migration row is the authoritative artefact.
-- Purpose: Author public.close_chatgpt_review (reusable SECURITY DEFINER 
--          closure function) and execute T-MCP-05 close-the-loop UPDATEs 
--          on 5 review_ids pending across v2.20-v2.28.
--
-- Honours: D-01 (this migration approved via plan_review MCP review_id 
--          1bae5068-c77a-40f1-a2a6-769fbc5988b9; corrected_action honoured 
--          via cross-reference validation against session files; no re-fire 
--          required since amendments were narrative precision not plan 
--          substance change).
--          D-170 (chat applies migrations only).
--          D-186 (closure budget +~0.6h end-to-end including validation).
--
-- Safety hardening:
--   - SECURITY DEFINER with fixed search_path (pg_catalog, public)
--   - Narrow update surface: 4 fields only on m.chatgpt_review
--   - Exact review_id targeting via PK lookup (single row)
--   - No broad update capability
--   - Idempotency guard (refuses to close already-closed rows)
--   - Input validation with RAISE EXCEPTION
--   - REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO service_role only
--
-- Post-apply gap (closed by sibling migration):
--   REVOKE FROM PUBLIC was insufficient against Supabase's role-specific
--   default EXECUTE grants. anon and authenticated still held EXECUTE
--   post-apply. Hardening fix: see
--   t_mcp_05_close_chatgpt_review_grants_hardening migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: public.close_chatgpt_review
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_chatgpt_review(
  p_review_id        uuid,
  p_action_taken     text,
  p_resolved_at      timestamptz,
  p_resolved_by      text DEFAULT 'PK',
  p_terminal_status  text DEFAULT 'completed'
)
RETURNS TABLE (
  review_id            uuid,
  prior_status         text,
  new_status           text,
  prior_action_taken   text,
  new_action_taken     text,
  resolved_at_set      timestamptz,
  resolved_by_set      text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $func$
DECLARE
  v_prior_status        text;
  v_prior_action_taken  text;
  v_prior_resolved_at   timestamptz;
BEGIN
  IF p_terminal_status NOT IN ('completed') THEN
    RAISE EXCEPTION 'close_chatgpt_review: p_terminal_status must be ''completed'' (got %)', p_terminal_status;
  END IF;

  IF p_action_taken IS NULL OR length(trim(p_action_taken)) = 0 THEN
    RAISE EXCEPTION 'close_chatgpt_review: p_action_taken must be non-empty';
  END IF;
  IF p_resolved_by IS NULL OR length(trim(p_resolved_by)) = 0 THEN
    RAISE EXCEPTION 'close_chatgpt_review: p_resolved_by must be non-empty';
  END IF;
  IF p_resolved_at IS NULL THEN
    RAISE EXCEPTION 'close_chatgpt_review: p_resolved_at must be non-null';
  END IF;

  SELECT cr.status, cr.action_taken, cr.escalation_resolved_at
    INTO v_prior_status, v_prior_action_taken, v_prior_resolved_at
  FROM m.chatgpt_review cr
  WHERE cr.id = p_review_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'close_chatgpt_review: review_id % not found', p_review_id;
  END IF;

  IF v_prior_status = p_terminal_status AND v_prior_resolved_at IS NOT NULL THEN
    RAISE EXCEPTION 'close_chatgpt_review: review_id % already closed at % (status=%)',
      p_review_id, v_prior_resolved_at, v_prior_status;
  END IF;

  UPDATE m.chatgpt_review
  SET
    status                  = p_terminal_status,
    action_taken            = p_action_taken,
    escalation_resolved_at  = p_resolved_at,
    resolved_by             = p_resolved_by
  WHERE id = p_review_id;

  RETURN QUERY SELECT
    p_review_id,
    v_prior_status,
    p_terminal_status,
    v_prior_action_taken,
    p_action_taken,
    p_resolved_at,
    p_resolved_by;
END;
$func$;

REVOKE ALL ON FUNCTION public.close_chatgpt_review(uuid, text, timestamptz, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_chatgpt_review(uuid, text, timestamptz, text, text) TO service_role;

COMMENT ON FUNCTION public.close_chatgpt_review IS
  'Close-the-loop UPDATE on m.chatgpt_review row. SECURITY DEFINER pattern '
  'for m-schema DML. Narrow surface (4 fields, single row by PK), idempotency '
  'guarded. Authored 2026-05-04 for T-MCP-05 batch closure; reusable for '
  'future closure work. See docs/runtime/mcp_review_protocol.md.';

-- ----------------------------------------------------------------------------
-- Execute T-MCP-05 batch closure: 5 review_ids
-- (full action_taken narratives stored in m.chatgpt_review; see session
--  record at docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md
--  for the canonical narrative text and validation rationale)
-- ----------------------------------------------------------------------------

-- Row 1: T02 Gate B exit proposal (Sat 2 May, deferred, then superseded)
-- Row 2: T02 ratification close (3 May, Path A hardening, ratified)
-- Row 3: F-AAP-001 v2.27 close-out plan (escalated, corrected, then superseded)
-- Row 4: F-AAP-001 apply (replay test produced new knowledge, T-MCP-08 reinforced)
-- Row 5: F-AAP-002 apply (Lesson #62 type-(c), state-capture exception)
--
-- The 5 SELECT public.close_chatgpt_review(...) calls executed at apply
-- time with full validated narrative text (lengths 507-1779 chars per row).
-- Repo-side .sql file omits the verbose narrative bodies for readability;
-- live row content in m.chatgpt_review is the authoritative record.

-- (See session record for full narrative text per row.)
