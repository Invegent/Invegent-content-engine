# Rollback Runbook — Invegent Content Engine

## Goal
Restore the system to the last known-good baseline (Phase 2 baseline tag).

## 1) Database functions (Phase 2 baseline)
Run this SQL in Supabase SQL Editor:

- supabase/migrations/phase2/2026-02-21_phase2_baseline.sql

This restores:
- seeding gate
- scoring + selection functions
- property bundler

## 2) Cron jobs
Re-apply the cron snapshot from:

- supabase/migrations/phase2/cron_jobs_snapshot.sql

(If jobs were changed in UI, recreate jobs with same schedules/commands.)

## 3) Edge Functions
Redeploy from repo folder:

- supabase/functions/

Functions expected:
- ingest
- content_fetch
- ai-worker
- publisher
- inspector

## 4) Secrets / environment variables
Use the checklist in:

- ENVIRONMENT_VARIABLES_TEMPLATE.md

Do NOT store real values in repo.