-- Migration: F-HEYGEN-RPC-MIGRATIONS-MISSING (P2) — repo parity recapture
-- Date: 2026-05-08 Sydney
--
-- Purpose: Add repo migration coverage for 5 SECURITY DEFINER functions that
--   exist in deployed production but were never captured in repo migrations.
--   Discovered v2.50 during P1 SECURITY-DEFINER triage (heygen-avatar-poller
--   v2.0.0 calls 4 RPCs not in repo) and broadened v2.52 during F-INSIGHTS
--   adjacent scope-check (heygen-avatar-creator v2.2.0 calls 1 additional RPC:
--   save_avatar_generation).
--
-- Production state: All 5 functions already exist in production (verified
--   2026-05-08 via pg_get_functiondef read-only introspection). This migration
--   is IDEMPOTENT via CREATE OR REPLACE FUNCTION — recreates byte-equivalent
--   definitions.
--
-- Production impact if accidentally applied: NONE. CREATE OR REPLACE FUNCTION
--   replaces the definition with byte-equivalent text. No downtime, no
--   behavioural change, no data mutation.
--
-- Fresh-DB applicability: Functions reference c.brand_avatar and
--   c.brand_stakeholder. plpgsql does not validate table references at CREATE
--   time (only at first call), so these CREATE statements succeed regardless
--   of c-schema table existence. The c-schema tables are pre-existing
--   infrastructure assumed present in fresh-DB rebuild order — out of scope
--   for this finding.
--
-- Grants: All 5 functions have EXECUTE granted to PUBLIC by Postgres default
--   (verified via information_schema.routine_privileges 2026-05-08). No
--   explicit GRANT statements are required. If a future security-hardening
--   migration revokes PUBLIC, that decision belongs to a separate hardening
--   file (cf. 20260503105500_t_mcp_05_close_chatgpt_review_grants_hardening).
--
-- Reference: docs/00_action_list.md F-HEYGEN-RPC-MIGRATIONS-MISSING (P2)
-- Closure session: 2026-05-08 combined RPC-migration-orphan-closure
-- Sibling commit: 20260508003600_f_insights_rpc_migrations_missing.sql

-- ─── 1. store_gen_poll_response ───────────────────────────────────────────
-- Caller: heygen-avatar-poller v2.0.0 — debug response capture during polling
CREATE OR REPLACE FUNCTION public.store_gen_poll_response(p_brand_avatar_id uuid, p_response text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE c.brand_avatar
  SET gen_poll_response = p_response
  WHERE brand_avatar_id = p_brand_avatar_id;
END;
$function$;

-- ─── 2. fail_avatar_generation ────────────────────────────────────────────
-- Caller: heygen-avatar-poller v2.0.0 — terminal failure recorder
CREATE OR REPLACE FUNCTION public.fail_avatar_generation(p_brand_avatar_id uuid, p_error text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE c.brand_avatar
  SET avatar_gen_status = 'failed',
      avatar_gen_error  = p_error
  WHERE brand_avatar_id = p_brand_avatar_id;
END;
$function$;

-- ─── 3. advance_avatar_to_creating ────────────────────────────────────────
-- Caller: heygen-avatar-poller v2.0.0 — generation→training state transition
CREATE OR REPLACE FUNCTION public.advance_avatar_to_creating(p_brand_avatar_id uuid, p_group_id text, p_image_url_list jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE c.brand_avatar
  SET group_id          = p_group_id,
      image_url_list    = p_image_url_list,
      avatar_gen_status = 'training'
  WHERE brand_avatar_id = p_brand_avatar_id;
END;
$function$;

-- ─── 4. complete_avatar_training ──────────────────────────────────────────
-- Caller: heygen-avatar-poller v2.0.0 — training→active state transition
CREATE OR REPLACE FUNCTION public.complete_avatar_training(p_brand_avatar_id uuid, p_stakeholder_id uuid, p_avatar_id text, p_display_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE c.brand_avatar
  SET heygen_avatar_id    = p_avatar_id,
      avatar_display_name = p_display_name,
      is_active           = true,
      avatar_gen_status   = 'active',
      gen_completed_at    = NOW()
  WHERE brand_avatar_id = p_brand_avatar_id;

  UPDATE c.brand_stakeholder
  SET last_generated_at = NOW()
  WHERE stakeholder_id  = p_stakeholder_id;
END;
$function$;

-- ─── 5. save_avatar_generation ────────────────────────────────────────────
-- Caller: heygen-avatar-creator v2.2.0 — initial generation record write
-- (notes from EF source: "c schema not writable via exec_sql or PostgREST" —
--  this SECURITY DEFINER fn is the supported write path into c.brand_avatar)
CREATE OR REPLACE FUNCTION public.save_avatar_generation(p_stakeholder_id uuid, p_render_style text, p_generation_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE c.brand_avatar
  SET generation_id     = p_generation_id,
      avatar_gen_status = 'generating',
      avatar_gen_error  = NULL,
      gen_started_at    = NOW(),
      is_active         = false
  WHERE stakeholder_id = p_stakeholder_id
    AND render_style   = p_render_style;
END;
$function$;
