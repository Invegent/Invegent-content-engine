# ICE Pipeline Audit — April 2026

> ⚠️ **ARCHIVED 21 Apr 2026.** This is a point-in-time pipeline audit dated April 2026 (mid-month). Authoritative current pipeline state lives in `docs/00_sync_state.md`; live cron and EF data should always be read from Supabase directly via the system-auditor or MCP queries. Treat this file as historical reference only.

---

## Executive Summary

The ICE pipeline is fundamentally sound. The core content generation loop (ingest → digest → AI → approve → publish) is running autonomously for 4 clients across 5 platforms. 374+ Facebook posts published to date, with LinkedIn, Instagram, YouTube, and WordPress all configured and activating. The single biggest risk is **authentication fragmentation** — 40 cron jobs use 5 different auth patterns (vault lookup, hardcoded URL, hardcoded key, current_setting, inline), and 2 crons are silently broken due to `current_setting('app.supabase_url')` returning NULL. The second risk is **platform competition** — the old `linkedin-publisher` Edge Function is still deployed (though its cron was disabled today) and could be accidentally re-enabled.

---

## Pipeline Flow Map

### 1. INGEST
- **Trigger:** `rss-ingest-run-all-hourly` (every 6h), `email-ingest-every-2h` (every 2h)
- **Functions:** `ingest` (v99), `email-ingest` (v19)
- **Tables:** Reads `f.feed_source`, writes `f.raw_content_item`, `f.ingest_run`
- **Status:** ✅ Working — 17+ RSS feeds + 2 email sources active

### 2. CONTENT FETCH
- **Trigger:** `content_fetch_every_10min` (every 10 min)
- **Function:** `content_fetch` (v69)
- **Tables:** Reads `f.canonical_content_body`, writes extracted text back
- **Status:** ✅ Working

### 3. BUNDLER / DIGEST
- **Trigger:** `planner-hourly` (hourly), `seed-and-enqueue-facebook-every-10m` (every 10 min), two legacy bundler crons (`m_phase2_ndis_daily_8am_sydney`, `m_phase2_property_hourly`)
- **Functions:** Direct SQL (`m.create_digest_run_for_client`, `m.seed_and_enqueue_ai_jobs_v1`, `m.run_pipeline_for_client`)
- **Status:** ⚠️ Partial — the 2 `m_phase2_*` crons run `m.run_pipeline_for_client` for ALL active clients (not just NDIS/Property). As new clients are added, these may create unintended digest runs for them.

### 4. AI GENERATION
- **Trigger:** `ai-worker-every-5m` (every 5 min)
- **Function:** `ai-worker` (v2.8.0, version 75)
- **Tables:** Reads `m.ai_job`, writes `m.post_draft`
- **Status:** ✅ Working — format advisor with preferred format bias deployed

### 5. AUTO-APPROVAL
- **Trigger:** `auto-approver-sweep` (every 10 min)
- **Function:** `auto-approver` (v1.4.1, version 36)
- **Status:** ✅ Working — writes `auto_approval_scores` and `compliance_flags`

### 6. IMAGE / VIDEO GENERATION
- **Trigger:** `image-worker-15min` (every 15 min), `video-worker-every-30min` (every 30 min), `heygen-worker-every-30min` (every 30 min)
- **Functions:** `image-worker` (v41), `video-worker` (v18), `heygen-worker` (v4)
- **Status:** ✅ Working

### 7. PUBLISH
- **Facebook:** `publisher-every-10m` → `publisher` (v1.6.0) — ✅ Working (374+ posts)
- **Instagram:** `instagram-publisher-every-15m` → `instagram-publisher` (v1.0.0) — ⚠️ Deployed, 0 posts (waiting for image drafts)
- **LinkedIn:** `linkedin-zapier-publisher-every-20m` → `linkedin-zapier-publisher` (v1.0.0) — ⚠️ Just fixed today, 3 items queued
- **YouTube:** `youtube-publisher-every-30min` → `youtube-publisher` (v1.5.0) — ✅ Working (1+ posts)
- **WordPress:** `wordpress-publisher-every-6h` → `wordpress-publisher` (v1.0.0) — ⚠️ CFW only, 0 posts yet (pipeline just started)

### 8. INSIGHTS / FEEDBACK
- **Trigger:** `insights-worker-daily` (3am UTC), `insights-feedback-daily` (3:30am UTC), `refresh-format-performance-daily` (3:15am UTC)
- **Functions:** `insights-worker` (v37), `insights-feedback` (v1.0.0)
- **Status:** ✅ Working — 154 performance rows, 2 topic weights calculated

---

## Cron Job Health — 40 Active Jobs

| # | Job Name | Schedule | URL Source | Auth Source | Status |
|---|----------|----------|------------|-------------|--------|
| 1 | ai-diagnostic-daily | 0 20 * * * | current_setting (NULL!) | vault:service_role_key | 🔴 BROKEN |
| 2 | ai-worker-every-5m | */5 * * * * | vault:project_url | vault:publishable_key | ✅ |
| 3 | auto-approver-sweep | */10 * * * * | hardcoded URL | hardcoded key | ⚠️ SUSPECT |
| 4 | client-weekly-summary-monday-730am-aest | 30 21 * * 0 | vault:project_url | vault:service_role_key | ✅ |
| 5 | compliance-monitor-monthly | 0 9 1 * * | vault:project_url | inline | ✅ |
| 6 | compliance-reviewer-monthly | 5 9 1 * * | vault:project_url | vault:service_role_key | ✅ |
| 7 | content_fetch_every_10min | */10 * * * * | vault:project_url | inline | ✅ |
| 8 | dead-letter-sweep-daily | 0 2 * * * | direct SQL | N/A | ✅ |
| 9 | draft-notifier-every-30m | */30 * * * * | vault:project_url | vault:service_role_key | ✅ |
| 10 | email-ingest-every-2h | 0 */2 * * * | vault:project_url | vault:service_role_key | ✅ |
| 11 | enqueue-publish-queue-every-5m | */5 * * * * | direct SQL | N/A | ✅ |
| 12 | feed-intelligence-weekly | 0 2 * * 0 | current_setting (NULL!) | inline | 🔴 BROKEN |
| 13 | heygen-worker-every-30min | */30 * * * * | vault:project_url | vault:publisher_api_key | ✅ |
| 14 | ice-system-audit-weekly | 0 13 * * 0 | direct SQL | N/A | ✅ |
| 15 | image-worker-15min | */15 * * * * | vault:project_url | vault:publisher_api_key | ✅ |
| 16 | insights-feedback-daily | 30 3 * * * | vault:project_url | vault:service_role_key | ✅ |
| 17 | insights-worker-daily | 0 3 * * * | hardcoded URL | vault:service_role_key | ⚠️ SUSPECT |
| 18 | instagram-publisher-every-15m | */15 * * * * | vault:project_url | vault:publisher_api_key | ✅ |
| 19 | k-schema-refresh-weekly | 0 3 * * 0 | direct SQL | N/A | ✅ |
| 20 | linkedin-zapier-publisher-every-20m | */20 * * * * | vault:project_url | vault:publisher_api_key | ✅ |
| 21 | m_phase2_ndis_daily_8am_sydney | 0 21 * * * | direct SQL | N/A | ⚠️ SUSPECT |
| 22 | m_phase2_property_hourly | 5 * * * * | direct SQL | N/A | ⚠️ SUSPECT |
| 23 | pipeline-ai-summary-hourly | 55 * * * * | vault:project_url | vault:service_role_key | ✅ |
| 24 | pipeline-doctor-every-30m | 15,45 * * * * | vault:project_url | vault:service_role_key | ✅ |
| 25 | pipeline-doctor-log-harvester | 17,47 * * * * | direct SQL | N/A | ✅ |
| 26 | pipeline-fixer-30min | 25,55 * * * * | vault:project_url | vault:pipeline_fixer_api_key | ✅ |
| 27 | pipeline-healer-every-15m | 2,17,32,47 * * * * | vault:project_url | vault:service_role_key | ✅ |
| 28 | pipeline-health-snapshot-30m | */30 * * * * | direct SQL | N/A | ✅ |
| 29 | pipeline-sentinel-every-15m | */15 * * * * | vault:project_url | vault:service_role_key | ✅ |
| 30 | planner-hourly | 0 * * * * | direct SQL | N/A | ✅ |
| 31 | publisher-every-10m | */5 * * * * | vault:project_url | vault:publishable_key | ✅ |
| 32 | refresh-format-performance-daily | 15 3 * * * | direct SQL | N/A | ✅ |
| 33 | rss-ingest-run-all-hourly | 0 */6 * * * | vault:project_url | vault:ingest_api_key | ✅ |
| 34 | seed-and-enqueue-facebook-every-10m | */10 * * * * | direct SQL | N/A | ✅ |
| 35 | sweep-stale-running-every-10m | */10 * * * * | direct SQL | N/A | ✅ |
| 36 | token-health-daily-7am-sydney | 0 21 * * * | vault:project_url | vault:publishable_key | ✅ |
| 37 | video-worker-every-30min | */30 * * * * | vault:project_url | vault:publisher_api_key | ✅ |
| 38 | weekly-manager-report-monday-7am-aest | 0 21 * * 0 | vault:project_url | vault:service_role_key | ✅ |
| 39 | wordpress-publisher-every-6h | 0 */6 * * * | vault:project_url | vault:publisher_api_key | ✅ |
| 40 | youtube-publisher-every-30min | 15,45 * * * * | vault:project_url | vault:publisher_api_key | ✅ |

**Summary:** 33 healthy, 2 broken (NULL URL), 5 suspect (hardcoded values or legacy bundlers)

---

## Edge Function Health — 46 Deployed

| Function | Has Cron? | Called By Other? | Status |
|----------|-----------|-----------------|--------|
| ai-profile-bootstrap | No cron | run-scans API | ✅ On-demand |
| ai-worker | Yes | — | ✅ |
| auto-approver | Yes | — | ✅ |
| brand-scanner | No cron | run-scans API | ✅ On-demand |
| client-weekly-summary | Yes | — | ✅ |
| compliance-monitor | Yes | — | ✅ |
| compliance-reviewer | Yes | — | ✅ |
| content_fetch | Yes | — | ✅ |
| draft-notifier | Yes | — | ✅ |
| email-ingest | Yes | — | ✅ |
| feed-intelligence | Yes (BROKEN) | — | 🔴 Cron uses NULL URL |
| heygen-avatar-creator | No cron | Manual | ✅ On-demand |
| heygen-avatar-poller | No cron | Manual | ✅ On-demand |
| heygen-intro | No cron | Manual | ✅ On-demand |
| heygen-test | No cron | — | ❓ Test function |
| heygen-voices | No cron | — | ❓ Test function |
| heygen-worker | Yes | — | ✅ |
| heygen-youtube-upload | No cron | Manual | ✅ On-demand |
| image-worker | Yes | — | ✅ |
| ingest | Yes | — | ✅ |
| insights-feedback | Yes | — | ✅ |
| insights-worker | Yes | — | ✅ |
| inspector | No cron | — | ❓ Dev tool |
| inspector_sql_ro | No cron | — | ❓ Dev tool |
| instagram-publisher | Yes | — | ✅ |
| **linkedin-publisher** | **No cron (disabled today)** | **Nothing** | **💀 ORPHANED — superseded by linkedin-zapier-publisher** |
| linkedin-zapier-publisher | Yes | — | ✅ |
| onboarding-notifier | No cron | Portal submit | ✅ On-demand |
| pipeline-ai-summary | Yes | — | ✅ |
| pipeline-diagnostician | No cron | Dashboard API | ✅ On-demand |
| pipeline-doctor | Yes | — | ✅ |
| pipeline-fixer | Yes | — | ✅ |
| pipeline-healer | Yes | — | ✅ |
| pipeline-sentinel | Yes | — | ✅ |
| publisher | Yes | — | ✅ |
| series-outline | No cron | Content Studio | ✅ On-demand |
| series-writer | No cron | Content Studio | ✅ On-demand |
| tts-test | No cron | — | ❓ Test function |
| video-analyser | No cron | Dashboard | ✅ On-demand |
| video-worker | Yes | — | ✅ |
| wasm-bootstrap | No cron | — | ❓ Test function |
| weekly-manager-report | Yes | — | ✅ |
| wordpress-publisher | Yes | — | ✅ |
| youtube-publisher | Yes | — | ✅ |
| youtube-token-test | No cron | — | ❓ Test function |

**Orphaned:** 1 (linkedin-publisher — old direct-API version, superseded)
**Test/dev functions:** 5 (heygen-test, heygen-voices, tts-test, wasm-bootstrap, youtube-token-test)
**Broken cron link:** 1 (feed-intelligence — cron URL is NULL)

---

## Platform Publishing Status

| Client | Platform | Last Published | Queued | Errors | Status |
|--------|----------|---------------|--------|--------|--------|
| NDIS Yarns | Facebook | 13 Apr 2026 | 0 | 0 | ✅ |
| NDIS Yarns | Instagram | Never | 0 | 0 | ⚠️ Waiting for image drafts |
| NDIS Yarns | LinkedIn | Never | 0 | 0 | ⚠️ Just configured today |
| NDIS Yarns | YouTube | Never (backfill only) | 0 | 0 | ✅ Token valid to 2031 |
| Property Pulse | Facebook | 12 Apr 2026 | 3 | 0 | ✅ |
| Property Pulse | Instagram | Never | 0 | 0 | ⚠️ Waiting for image drafts |
| Property Pulse | LinkedIn | Never | 3 | 0 | ⚠️ 3 items queued, firing soon |
| Property Pulse | YouTube | 1 Apr 2026 | 0 | 0 | ✅ |
| Care For Welfare | Facebook | Never | 0 | 0 | ⚠️ Pipeline just started |
| Care For Welfare | Instagram | Never | 0 | 0 | ⚠️ Pipeline just started |
| Care For Welfare | LinkedIn | Never | 0 | 0 | ⚠️ Pipeline just started |
| Invegent | Facebook | Never | 0 | 0 | ⚠️ Pipeline just started |
| Invegent | Instagram | Never | 0 | 0 | ⚠️ Pipeline just started |
| Invegent | LinkedIn | Never | 0 | 0 | ⚠️ Pipeline just started |

**Token expiry warnings:** All 4 Facebook tokens expire May-Jun 2026 (~46-51 days). YouTube tokens valid to 2031. LinkedIn uses Zapier webhooks (no expiry). Instagram uses Facebook tokens (same expiry).

---

## Vault / Authentication Health

| Vault Key | Length | Used By Crons |
|-----------|--------|---------------|
| ai_worker_api_key | 15 | ai-worker-every-5m (indirectly via publishable_key) |
| ingest_api_key | 15 | rss-ingest-run-all-hourly |
| INGEST_API_KEY | 15 | **DUPLICATE — uppercase version, not referenced by any cron** |
| pipeline_fixer_api_key | 43 | pipeline-fixer-30min |
| project_url | 40 | 26 crons |
| publishable_key | 46 | ai-worker, publisher, token-health |
| publisher_api_key | 15 | 7 publisher crons |
| service_role_key | 15 | 12 crons |

**Issues:**
- `INGEST_API_KEY` (uppercase) is a duplicate of `ingest_api_key` — only the lowercase version is referenced by crons. Safe to delete the uppercase one.
- `auto-approver-sweep` has a hardcoded API key in the cron command — should use vault lookup.
- `insights-worker-daily` has a hardcoded Supabase URL — should use vault `project_url`.

---

## Issues Found — Priority Order

1. **🔴 ai-diagnostic-daily cron uses `current_setting('app.supabase_url')` which returns NULL.** The ai-diagnostic function never fires. Fix: recreate cron with vault `project_url` lookup.

2. **🔴 feed-intelligence-weekly cron same issue.** Uses `current_setting('app.supabase_url')` — NULL. Feed intelligence analysis never runs. Fix: recreate cron with vault `project_url` lookup.

3. **⚠️ auto-approver-sweep has hardcoded API key in the cron command.** If this key is rotated, the cron breaks silently. Fix: recreate cron using vault `publisher_api_key` lookup.

4. **⚠️ insights-worker-daily has hardcoded Supabase URL.** Works today, but inconsistent with all other crons. Fix: recreate using vault `project_url`.

5. **⚠️ `linkedin-publisher` Edge Function is still deployed but orphaned.** Its cron was disabled today but the function still exists. If anyone accidentally re-enables the cron or creates a new one pointing to it, it will compete with `linkedin-zapier-publisher`. Fix: delete the function.

6. **⚠️ `m_phase2_ndis_daily_8am_sydney` and `m_phase2_property_hourly` run `m.run_pipeline_for_client` for ALL active clients.** Originally designed for 2 clients, they now fire for 4. New clients (CFW, Invegent) may get double-seeded. Fix: review whether these are still needed or should be replaced by the `planner-hourly` + `seed-and-enqueue-facebook-every-10m` pattern.

7. **⚠️ Duplicate vault secret `INGEST_API_KEY` (uppercase).** No cron references it. Fix: delete it to avoid confusion.

8. **⚠️ `publisher-every-10m` is named "every-10m" but actually runs every 5 minutes** (`*/5 * * * *`). Misleading name. Low priority but confusing during debugging.

9. **⚠️ 5 test/dev Edge Functions still deployed** (heygen-test, heygen-voices, tts-test, wasm-bootstrap, youtube-token-test). Not harmful but add noise.

10. **INFO: Facebook tokens for all 4 clients expire in 46-51 days.** Not urgent yet but needs a calendar reminder for early June refresh.

---

## What Is Working Well

- **Core content loop is solid.** Ingest → digest → AI → approve → publish runs every 5-10 minutes without intervention. 374+ Facebook posts published autonomously.
- **Monitoring stack is comprehensive.** Sentinel (every 15 min) → Healer (auto-remediation) → Diagnostician (Claude-powered RCA) → weekly manager report. This is genuinely enterprise-grade for a system this size.
- **Schedule-aware publishing works correctly.** `get_next_scheduled_for()` correctly assigns Mon-Sat AEST slots per client.
- **Multi-platform architecture is clean.** Each platform has its own publisher function and cron, no shared queue locks (after today's fix). Adding a new platform is a single Edge Function + cron + publish profile row.
- **The vault-based auth pattern (project_url + service_role_key)** used by 26 of 40 crons is the right approach. The 7 that don't use it are legacy.
- **The `publisher_lock_queue_v1` → v2 delegation with platform filter** (fixed today) is architecturally correct.

---

## Recommended Next Session Agenda

1. **Fix the 2 broken crons** (ai-diagnostic-daily, feed-intelligence-weekly) — 10 minutes each, recreate with vault lookup.
2. **Standardise the 3 inconsistent crons** (auto-approver hardcoded key, insights-worker hardcoded URL, publisher name mismatch) — 15 minutes total.
3. **Delete the orphaned `linkedin-publisher` Edge Function** — prevents future accidents.
4. **Review the 2 legacy bundler crons** (`m_phase2_*`) — decide whether to keep, scope-limit, or remove.
5. **Delete duplicate `INGEST_API_KEY` vault secret** and the 5 test Edge Functions.
6. **Set Facebook token refresh calendar reminder** for early June 2026.
