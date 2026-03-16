-- ICE Migration: 20260316_generic_pipeline_v2
-- Client-generic pipeline functions + per-platform targeting (D022)
-- Applied: 16 March 2026

-- select_digest_items_v2: generic, replaces select_ndis_v1 + select_property_v1
-- bundle_client_v2: generic, replaces bundle_ndis_daily_v1 + bundle_property_dedupe_v1
-- seed_client_to_ai_v2: generic + D022 platform targeting (loops over c.client_publish_profile)
-- run_pipeline_for_client: orchestrator calling all three

-- Cron jobs updated (not dropped):
--   planner-hourly → queries c.client WHERE status=active
--   m_phase2_ndis_daily_8am_sydney → run_pipeline_for_client per active client (48h, score>=0)
--   m_phase2_property_hourly → run_pipeline_for_client per active client (12h, score>=6)
--   enqueue-publish-queue-every-5m → removed hardcoded platform='facebook'

-- See apply_migration call in session log for full SQL.
-- The full function bodies are live in the Supabase database.
