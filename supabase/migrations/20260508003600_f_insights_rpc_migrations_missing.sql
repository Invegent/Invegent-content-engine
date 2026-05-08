-- Migration: F-INSIGHTS-RPC-MIGRATIONS-MISSING (P2) — repo parity recapture
-- Date: 2026-05-08 Sydney
--
-- Purpose: Add repo migration coverage for 1 SECURITY DEFINER function,
--   1 table, and 1 column that exist in deployed production but were never
--   captured in repo migrations. Discovered v2.52 while closing the
--   insights-worker P1 functional drift item (commit 57daf877). Deployed
--   insights-worker v14.0.0 references all three objects in
--   computeFormatPerformance().
--
-- Production state: All 3 objects already exist in production (verified
--   2026-05-08 via pg_get_functiondef + information_schema read-only
--   introspection). This migration is IDEMPOTENT via:
--     - CREATE OR REPLACE FUNCTION
--     - CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS
--     - ALTER TABLE ADD COLUMN IF NOT EXISTS
--     - DO blocks with NOT EXISTS guards for FOREIGN KEY constraints
--       (Postgres has no IF NOT EXISTS for ADD CONSTRAINT)
--
-- Production impact if accidentally applied: NONE. Each statement is a no-op
--   when the target already exists.
--
-- Fresh-DB applicability:
--   - upsert_format_performance() body references m.post_format_performance.
--     plpgsql does not validate table references at CREATE; succeeds
--     regardless. Function is created last in this file so the table exists
--     by the time the function is first called.
--   - m.post_format_performance has FK on ice_format_key →
--     t."5.3_content_format"(ice_format_key). FK is wrapped in a guard that
--     only adds it when the target table exists, so this migration succeeds
--     whether or not the taxonomy reference table is loaded yet. If absent
--     at apply time, the FK is added later when the taxonomy migration runs
--     (assuming a separate migration adds the FK explicitly), or stays
--     absent — the application code is FK-tolerant.
--   - m.post_draft.recommended_format depends on m.post_draft existing —
--     pre-existing core ICE table assumed present in fresh-DB rebuild order.
--   - Same FK guard pattern applied to recommended_format → 5.3_content_format.
--
-- Reference: docs/00_action_list.md F-INSIGHTS-RPC-MIGRATIONS-MISSING (P2)
-- Closure session: 2026-05-08 combined RPC-migration-orphan-closure
-- Sibling commit: 20260508003500_f_heygen_rpc_migrations_missing.sql

-- ─── 1. m.post_format_performance table ──────────────────────────────────
-- Stores 30/90 day rolling-window format performance aggregates per client.
-- Populated by: insights-worker v14.0.0 → upsert_format_performance() (below).
CREATE TABLE IF NOT EXISTS m.post_format_performance (
  perf_id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            uuid        NOT NULL,
  ice_format_key       text        NOT NULL,
  rolling_window_days  integer     NOT NULL DEFAULT 30,
  post_count           integer     NOT NULL DEFAULT 0,
  avg_reach            numeric     NULL,
  avg_impressions      numeric     NULL,
  avg_engagement_rate  numeric     NULL,
  avg_clicks           numeric     NULL,
  avg_shares           numeric     NULL,
  best_post_draft_id   uuid        NULL,
  worst_post_draft_id  uuid        NULL,
  computed_at          timestamptz NULL DEFAULT now(),
  CONSTRAINT uq_format_perf_client_format_window
    UNIQUE (client_id, ice_format_key, rolling_window_days)
);

-- Btree index on (client_id, ice_format_key) for client-scoped lookup
CREATE INDEX IF NOT EXISTS idx_format_perf_client
  ON m.post_format_performance USING btree (client_id, ice_format_key);

-- FK to taxonomy reference table — only add if target exists and FK absent
DO $$
BEGIN
  IF to_regclass('t."5.3_content_format"') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint c
       JOIN pg_class cls ON cls.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = cls.relnamespace
       WHERE n.nspname = 'm'
         AND cls.relname = 'post_format_performance'
         AND c.conname  = 'fk_post_format_performance_format'
     )
  THEN
    EXECUTE 'ALTER TABLE m.post_format_performance
             ADD CONSTRAINT fk_post_format_performance_format
             FOREIGN KEY (ice_format_key)
             REFERENCES t."5.3_content_format"(ice_format_key)';
  END IF;
END
$$;

-- ─── 2. m.post_draft.recommended_format column ───────────────────────────
-- Per-draft recommended content format key. Read by insights-worker v14.0.0
-- in computeFormatPerformance() to group performance aggregates by format.
ALTER TABLE m.post_draft
  ADD COLUMN IF NOT EXISTS recommended_format text NULL;

-- FK to taxonomy reference table — only add if target exists and FK absent
DO $$
BEGIN
  IF to_regclass('t."5.3_content_format"') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint c
       JOIN pg_class cls ON cls.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = cls.relnamespace
       WHERE n.nspname = 'm'
         AND cls.relname = 'post_draft'
         AND c.conname  = 'fk_post_draft_recommended_format'
     )
  THEN
    EXECUTE 'ALTER TABLE m.post_draft
             ADD CONSTRAINT fk_post_draft_recommended_format
             FOREIGN KEY (recommended_format)
             REFERENCES t."5.3_content_format"(ice_format_key)';
  END IF;
END
$$;

-- ─── 3. upsert_format_performance() RPC ──────────────────────────────────
-- Caller: insights-worker v14.0.0 computeFormatPerformance() — upserts
-- one row per (client_id, ice_format_key, rolling_window_days) tuple,
-- refreshing aggregates and best/worst draft references on conflict.
CREATE OR REPLACE FUNCTION public.upsert_format_performance(
  p_client_id           uuid,
  p_ice_format_key      text,
  p_rolling_window_days integer,
  p_post_count          integer,
  p_avg_reach           numeric,
  p_avg_impressions     numeric,
  p_avg_engagement_rate numeric,
  p_avg_clicks          numeric,
  p_avg_shares          numeric,
  p_best_post_draft_id  uuid,
  p_worst_post_draft_id uuid
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO m.post_format_performance (
    client_id, ice_format_key, rolling_window_days,
    post_count, avg_reach, avg_impressions, avg_engagement_rate,
    avg_clicks, avg_shares, best_post_draft_id, worst_post_draft_id,
    computed_at
  )
  VALUES (
    p_client_id, p_ice_format_key, p_rolling_window_days,
    p_post_count, p_avg_reach, p_avg_impressions, p_avg_engagement_rate,
    p_avg_clicks, p_avg_shares, p_best_post_draft_id, p_worst_post_draft_id,
    now()
  )
  ON CONFLICT (client_id, ice_format_key, rolling_window_days)
  DO UPDATE SET
    post_count            = EXCLUDED.post_count,
    avg_reach             = EXCLUDED.avg_reach,
    avg_impressions       = EXCLUDED.avg_impressions,
    avg_engagement_rate   = EXCLUDED.avg_engagement_rate,
    avg_clicks            = EXCLUDED.avg_clicks,
    avg_shares            = EXCLUDED.avg_shares,
    best_post_draft_id    = EXCLUDED.best_post_draft_id,
    worst_post_draft_id   = EXCLUDED.worst_post_draft_id,
    computed_at           = now();
END;
$function$;
