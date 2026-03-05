-- ============================================================
-- pg_cron jobs snapshot — Invegent Content Engine
-- Last updated: 2026-03-05
-- Source: live Supabase project mbkmaxqhsohbtwsqolns
--
-- NOTE: This file is a reference snapshot only.
-- Do not run it blindly — cron.job entries must match
-- your live Supabase project's vault secrets.
-- ============================================================

-- ----------------------------------------------------------------
-- PIPELINE JOBS (original phase 2 baseline)
-- ----------------------------------------------------------------

-- RSS ingest — every 6 hours
-- jobid: 1 | schedule: 0 */6 * * *
-- triggers: ingest Edge Function
-- jobname: rss-ingest-run-all-hourly

-- Content fetch — every 10 minutes
-- jobid: 4 | schedule: */10 * * * *
-- triggers: content_fetch Edge Function
-- jobname: content_fetch_every_10min

-- AI worker — every 5 minutes, limit 5 jobs
-- jobid: 5 | schedule: */5 * * * *
-- triggers: ai-worker Edge Function
-- jobname: ai-worker-every-5m

-- Publisher drain — every 5 minutes, limit 2 posts
-- jobid: 7 | schedule: */5 * * * *
-- triggers: publisher Edge Function
-- jobname: publisher-every-10m

-- Seed and enqueue ai_jobs — every 10 minutes
-- jobid: 11 | schedule: */10 * * * *
-- calls: m.seed_and_enqueue_ai_jobs_v1('facebook', 10)
-- jobname: seed-and-enqueue-facebook-every-10m

-- Enqueue approved drafts to publish queue — every 5 minutes
-- jobid: 8 | schedule: */5 * * * *
-- inserts into m.post_publish_queue where ai_job.status = 'succeeded'
-- includes: approval_status filter (approved, scheduled, published)
-- jobname: enqueue-publish-queue-every-5m

-- Stale lock sweep — every 10 minutes
-- jobid: 9 | schedule: */10 * * * *
-- requeues m.ai_job and m.post_publish_queue stuck in 'running' > 20 min
-- jobname: sweep-stale-running-every-10m

-- Planner — every hour
-- jobid: 12 | schedule: 0 * * * *
-- creates digest runs for property-pulse and ndis-yarns
-- calls: m.create_digest_run_for_client + m.populate_digest_items_v1
-- jobname: planner-hourly

-- NDIS daily digest — 8am Sydney (21:00 UTC)
-- schedule: 0 21 * * *
-- calls: m.score_digest_items_v1, m.select_ndis_v1, m.bundle_ndis_daily_v1, m.seed_ndis_bundles_to_ai_v1
-- jobname: m_phase2_ndis_daily_8am_sydney

-- Property hourly digest — every hour at :05
-- schedule: 5 * * * *
-- calls: m.score_digest_items_v1, m.select_property_v1, m.bundle_property_dedupe_v1, m.seed_property_bundles_to_ai_v1
-- jobname: m_phase2_property_hourly

-- ----------------------------------------------------------------
-- AGENT & MAINTENANCE JOBS (added after phase 2 baseline)
-- ----------------------------------------------------------------

-- Auto-approver sweep — every 10 minutes
-- schedule: */10 * * * *
-- triggers: auto-approver Edge Function with limit=30
-- auth: x-auto-approver-key header
-- added: ~2026-03-03
-- jobname: auto-approver-sweep

-- Dead letter sweep — daily at 2am UTC
-- schedule: 0 2 * * *
-- calls: m.dead_letter_sweep()
-- moves stale pipeline items to 'dead' status with reason
-- added: ~2026-03-03
-- jobname: dead-letter-sweep-daily

-- Token health check — daily 7am Sydney (21:00 UTC)
-- schedule: 0 21 * * *
-- triggers: publisher Edge Function /token-health-write endpoint
-- writes results to m.platform_token_health
-- added: ~2026-03-03
-- jobname: token-health-daily-7am-sydney
