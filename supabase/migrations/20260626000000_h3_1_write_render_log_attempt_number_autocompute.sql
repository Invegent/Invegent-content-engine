-- 20260626000000_h3_1_write_render_log_attempt_number_autocompute.sql
-- H3.1 — write_render_log auto-computes attempt_number = (count of prior
-- m.post_render_log rows for this draft+slide) + 1, instead of relying on the
-- column DEFAULT 1.
--
-- REPO RECORD of a PK-APPLIED change. Applied to prod (mbkmaxqhsohbtwsqolns)
-- manually by PK via CREATE OR REPLACE (verified PASS, 2026-06-26). The change
-- was NOT applied through apply_migration, so there is NO supabase_migrations
-- ledger row for it — this repo file IS the record (same backfill-carry pattern
-- as v3.94 publish_origin and the Lane-3A resolver). The 14-digit prefix is a
-- repo-record stamp (apply date known; exact apply time not recorded), ordered
-- after the last ledger migration 20260618092646. Migration name = permanent
-- identity (never reuse 20260320055027 write_render_log_function).
--
-- Live verification (read-only, 2026-06-26, project mbkmaxqhsohbtwsqolns):
--   body md5  baa3531ebe1d3702f6ca8a60f77fdfe8 -> 7aa8e8910ff72db396a5cd805f305f8e
--   overloads = 1 (single 13-arg signature)        — UNCHANGED
--   SECURITY DEFINER = true                          — RETAINED
--   search_path = public                             — RETAINED
--   owner = postgres                                 — RETAINED
--   EXECUTE grants = postgres + service_role only (PUBLIC/anon/authenticated none) — UNCHANGED
--
-- FUNCTION-BODY-ONLY. Signature UNCHANGED (13 args). No table DDL. No grant
-- change. No caller/worker change. Telemetry-only: changes a LOGGED value, never
-- a control decision (no path consumes attempt_number). NO backfill — the 2649
-- pre-existing rows remain attempt_number = 1.
--
-- Grouping key (post_draft_id, slide_id) is null-safe on slide (IS NOT DISTINCT
-- FROM); a null draft cannot be scoped and falls back to 1. m.post_render_log is
-- schema-qualified in both the SELECT and the INSERT (search-path-safe).
--
-- KNOWN LIMITATION (accepted, telemetry-only): SELECT count(*) + INSERT are not
-- atomic, so two concurrent renders of the same (post_draft_id, slide_id) can
-- both read N and write a duplicate attempt_number = N+1. There is no unique
-- constraint to reject it and no control path consumes the value -> no functional
-- risk. Exactness (advisory lock, or a unique index + retry-on-conflict) is
-- deferred to H3.2 (retry cap — OPEN). This is the recorded pre-H3.2 limitation.

CREATE OR REPLACE FUNCTION public.write_render_log(
  p_post_draft_id uuid, p_slide_id uuid, p_client_id uuid, p_ice_format_key text,
  p_render_engine text, p_creatomate_render_id text, p_status text, p_output_url text,
  p_storage_url text, p_credits_used numeric, p_render_duration_ms integer,
  p_error_message text, p_render_spec jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_attempt integer;
BEGIN
  IF p_post_draft_id IS NULL THEN
    v_attempt := 1;
  ELSE
    SELECT count(*) + 1
      INTO v_attempt
      FROM m.post_render_log r
     WHERE r.post_draft_id = p_post_draft_id
       AND r.slide_id IS NOT DISTINCT FROM p_slide_id;
  END IF;

  INSERT INTO m.post_render_log (
    post_draft_id, slide_id, client_id, ice_format_key, render_engine,
    creatomate_render_id, status, output_url, storage_url,
    credits_used, render_duration_ms, attempt_number, error_message, render_spec
  )
  VALUES (
    p_post_draft_id, p_slide_id, p_client_id, p_ice_format_key, p_render_engine,
    p_creatomate_render_id, p_status, p_output_url, p_storage_url,
    p_credits_used, p_render_duration_ms, v_attempt, p_error_message, p_render_spec
  );
END;
$function$;
