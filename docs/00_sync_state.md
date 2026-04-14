# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-14 (End of day reconciliation — biggest build day in ICE history)
> Written by: PK + Claude reconciliation

---

## SESSION STARTUP PROTOCOL

1. Read this file (`docs/00_sync_state.md`)
2. Query k schema before working on any table: `SELECT * FROM k.vw_table_summary WHERE schema_name='x' AND table_name='y'`
3. Do NOT fall into discovery mode.

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active)
**Gate to first external client conversation is OPEN.**
**4 clients, 14 publish profiles, 5 platforms, 41 cron jobs. Pipeline fully autonomous.**

---

## ALL CLIENTS — FULL STATE

| Client | client_id | Verticals | Feeds | AI | Platforms | Website |
|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | NDIS, AU Disability Policy | 17 | active | FB ✅ IG ✅ LI ✅ YT ✅ | none |
| Property Pulse | 4036a6b5 | AU Property ×3 | 20 | active | FB ✅ IG ✅ LI ✅ YT ✅ | none |
| Care For Welfare | 3eca32aa | NDIS, AU Disability Policy | 17 | active | FB ✅ IG ✅ LI ✅ | careforwelfare.com.au |
| Invegent | 93494a09 | AI & Automation, Social Media, Content Marketing | 5 | active | FB ✅ IG ✅ LI ✅ | invegent.com (blog pending) |

---

## PLATFORM STATUS — ALL CLIENTS

| Platform | Publisher | NDIS Yarns | Property Pulse | CFW | Invegent | Published |
|---|---|---|---|---|---|---|
| Facebook | publisher v1.3.x | ✅ | ✅ | ✅ | ✅ | 374 posts |
| Instagram | instagram-publisher v1.0.0 | ✅ | ✅ | ✅ | ✅ | 0 — needs approved image drafts |
| LinkedIn | linkedin-zapier-publisher v1.0.0 | ✅ Zapier | ✅ Zapier | ✅ Zapier | ✅ Zapier | 0 — queue fired, check pages |
| YouTube | youtube-publisher v1.5.0 | ✅ OAuth | ✅ OAuth | ❌ future | ❌ future | 1 (post_publish now backfilled) |
| Website/WP | wordpress-publisher v1.0.0 | ❌ n/a | ❌ n/a | ✅ ACTIVE | ❌ brief 046 pending | 0 — CFW pipeline not yet generating |

---

## ACTIVE CRON JOBS — 41 TOTAL

| Job | Schedule | Function |
|---|---|---|
| ai-worker-every-5m | */5 * * * * | ai-worker |
| auto-approver-sweep | */10 * * * * | auto-approver |
| content_fetch_every_10min | */10 * * * * | content-fetch |
| enqueue-publish-queue-every-5m | */5 * * * * | publisher |
| image-worker-15min | */15 * * * * | image-worker |
| instagram-publisher-every-15m | */15 * * * * | instagram-publisher |
| pipeline-sentinel-every-15m | */15 * * * * | pipeline-sentinel |
| pipeline-healer-every-15m | 2,17,32,47 * * * * | pipeline-healer |
| linkedin-publisher-every-15m | */15 * * * * | linkedin-publisher (dormant) |
| linkedin-zapier-publisher-every-20m | */20 * * * * | linkedin-zapier-publisher |
| publisher-every-10m | */5 * * * * | publisher |
| seed-and-enqueue-facebook-every-10m | */10 * * * * | bundler/seeder |
| sweep-stale-running-every-10m | */10 * * * * | healer |
| video-worker-every-30min | */30 * * * * | video-worker |
| heygen-worker-every-30min | */30 * * * * | heygen-worker |
| youtube-publisher-every-30min | 15,45 * * * * | youtube-publisher |
| pipeline-doctor-every-30m | 15,45 * * * * | pipeline-doctor |
| draft-notifier-every-30m | */30 * * * * | draft-notifier |
| rss-ingest-run-all-hourly | 0 */6 * * * | ingest |
| email-ingest-every-2h | 0 */2 * * * | email-ingest |
| pipeline-ai-summary-hourly | 55 * * * * | pipeline-ai-summary |
| planner-hourly | 0 * * * * | planner |
| wordpress-publisher-every-6h | 0 */6 * * * | wordpress-publisher (NEW) |
| insights-worker-daily | 0 3 * * * | insights-worker |
| insights-feedback-daily | 30 3 * * * | insights-feedback |
| refresh-format-performance-daily | 15 3 * * * | format-performance |
| dead-letter-sweep-daily | 0 2 * * * | healer |
| ai-diagnostic-daily | 0 20 * * * | ai-diagnostic |
| token-health-daily-7am-sydney | 0 21 * * * | token health |
| weekly-manager-report-monday-7am-aest | 0 21 * * 0 | weekly-manager-report |
| client-weekly-summary-monday-730am-aest | 30 21 * * 0 | client-weekly-summary |
| feed-intelligence-weekly | 0 2 * * 0 | feed-intelligence |
| ice-system-audit-weekly | 0 13 * * 0 | system audit |
| k-schema-refresh-weekly | 0 3 * * 0 | k schema refresh |
| compliance-monitor-monthly | 0 9 1 * * | compliance-monitor |
| compliance-reviewer-monthly | 5 9 1 * * | compliance-reviewer |
| + 5 others (pipeline health, doctor harvester, etc) | various | monitoring |

---

## SUPABASE EDGE FUNCTIONS — LIVE

| Function | Version | Status |
|---|---|---|
| ai-worker | 73 | ACTIVE — v2.8.0 format advisor bias |
| auto-approver | 30 | ACTIVE — v1.4.1 |
| brand-scanner | 1 | ACTIVE — v1.0.0 |
| client-weekly-summary | 1 | ACTIVE — v1.0.0 |
| compliance-monitor | 14 | ACTIVE — monthly |
| compliance-reviewer | 4 | ACTIVE — v1.3.0 |
| content_fetch | 65 | ACTIVE |
| draft-notifier | 16 | ACTIVE |
| email-ingest | 15 | ACTIVE |
| feed-intelligence | 20 | ACTIVE |
| heygen-worker | 2 | ACTIVE — v1.1.0 |
| image-worker | 37 | ACTIVE — v3.9.2 |
| ingest | 95 | ACTIVE |
| insights-feedback | 1 | ACTIVE — v1.0.0 |
| insights-worker | 32 | ACTIVE — v14.0.0 |
| instagram-publisher | 1 | ACTIVE — v1.0.0 |
| linkedin-publisher | 15 | ACTIVE — dormant (no direct profiles) |
| linkedin-zapier-publisher | 1 | ACTIVE — v1.0.0 |
| pipeline-diagnostician | 1 | ACTIVE — v1.0.0 |
| pipeline-healer | 1 | ACTIVE — v1.0.0 |
| pipeline-sentinel | 1 | ACTIVE — v1.0.0 |
| publisher | 58 | ACTIVE — Facebook |
| series-outline | 15 | ACTIVE |
| series-writer | 16 | ACTIVE |
| video-analyser | 4 | ACTIVE — v1.2.0 |
| video-worker | 14 | ACTIVE — v2.1.0 |
| weekly-manager-report | 1 | ACTIVE — v1.1.0 |
| wordpress-publisher | 1 | ACTIVE — v1.0.0 (NEW) |
| youtube-publisher | 15 | ACTIVE — v1.5.0 |

---

## KEY SCHEMA FACTS

- `m.post_publish_queue` unique index: `(post_draft_id, platform)` — multi-platform support
- `public.crosspost_facebook_to_linkedin()` — copies approved FB drafts to LinkedIn queue
- `public.upsert_publish_profile()` — reusable profile upsert helper
- `public.crosspost_facebook_to_linkedin()` — runs inside linkedin-zapier-publisher
- 3 new verticals: AI & Automation (15), Social Media Strategy (16), Content Marketing (17)
- Invegent client_id: `93494a09-cc89-41d1-b364-cb63983063a6`
- CFW WordPress: careforwelfare.com.au, username admin, secret CFW_WP_APP_PASSWORD, category ID 20
- CFW wp_options stored in c.client.profile JSONB
- Mod_Security on careforwelfare.com.au requires User-Agent header on all API calls — handled in wordpress-publisher

---

## ZAPIER LINKEDIN BRIDGE

| Brand | Org URN | Webhook (partial) |
|---|---|---|
| NDIS Yarns | urn:li:organization:112982689 | hooks.zapier.com/.../u7nkjq3/ |
| Property Pulse | urn:li:organization:112999127 | hooks.zapier.com/.../u7nav0s/ |
| Care For Welfare | urn:li:organization:74152188 | hooks.zapier.com/.../u7ngjbh/ |
| Invegent | urn:li:organization:111966452 | hooks.zapier.com/.../u7nws8p/ |

Rollback: when Community Management API approved → replace webhook URLs with real tokens → disable zapier cron.

---

## WORDPRESS PUBLISHER

| Client | Site | Username | Secret | Category ID | Status |
|---|---|---|---|---|---|
| Care For Welfare | careforwelfare.com.au | admin | CFW_WP_APP_PASSWORD | 20 (NDIS News) | ACTIVE |
| Invegent | invegent.com | — | — | — | Brief 046 pending |

Publishes max 3 posts per 6-hour run. Yoast SEO handles meta/sitemaps automatically.

---

## PIPELINE HEALTH — EOD 14 Apr 2026

| Metric | Value | Status |
|---|---|---|
| Posts last 7 days | 23 | ✅ |
| Needs review | 0 | ✅ |
| Stuck AI jobs | 0 | ✅ |
| Open CRITICAL incidents | 1 | CFW no_drafts — will clear ~12-24h |
| LinkedIn published | 0 | Queue fired, check pages manually |
| Instagram published | 0 | Waiting for image drafts |
| Website published | 0 | CFW pipeline not yet generating |
| Active cron jobs | 41 | ✅ |
| Active clients | 4 | ✅ |
| Active publish profiles | 14 | ✅ |

---

## TOKEN CALENDAR

| Platform | Client | Expiry | Days |
|---|---|---|---|
| YouTube | NDIS Yarns | 7 Apr 2031 | ~1821d |
| YouTube | Property Pulse | 2 Apr 2031 | ~1816d |
| Facebook | NDIS Yarns | 31 May 2026 | ~47d ⚠️ |
| Facebook | Property Pulse | 5 Jun 2026 | ~52d ⚠️ |
| Facebook | Care For Welfare | ~Jun 2026 | ~52d ⚠️ |
| Facebook | Invegent | ~Jun 2026 | ~52d ⚠️ |

---

## EXTERNAL GATES

| Gate | Status | Next action |
|---|---|---|
| Meta App Review | Business verification In Review | Contact dev support if stuck after 27 Apr |
| LinkedIn Community Management API | In Review | Evaluate Late.dev if still pending 13 May |
| Legal review (L001) | Not started | Before first external client signs |

---

## WHAT IS NEXT (PRIORITY ORDER)

1. **Morning check** — verify LinkedIn posts fired on all 4 pages, Instagram posted for PP/NY
2. **CFW first drafts** — should generate within 12-24h. Watch for CRITICAL incident to clear.
3. **Brief 043** — Subscription register dashboard page. Run via Claude Code.
4. **Brief 046** — invegent.com blog section (Supabase → Next.js ISR). Write and run.
5. **Portal LinkedIn OAuth fix** — set LINKEDIN_OAUTH_ENABLED=false in Vercel portal env.
6. **LinkedIn redirect URI** — update in LinkedIn dev portal from dashboard → portal.invegent.com.
7. **Facebook token refresh** — all 4 clients expiring May/Jun. Refresh early June.
8. **NDIS Yarns image generation** — monitor if v2.8.0 format advisor fix generates image_quote drafts.

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| LinkedIn portal OAuth enabled but broken | MED | Set LINKEDIN_OAUTH_ENABLED=false in Vercel |
| LinkedIn redirect URI wrong | MED | Update to portal.invegent.com in LinkedIn dev portal |
| NDIS Yarns image formats | LOW | Monitor — v2.8.0 may fix this over next 24-48h |
| Bundler not reading topic weights | LOW | Wire when bundler next touched |
| HeyGen avatar builds pending | LOW | PK to trigger stock avatar builds |
| CFW WordPress admin account | LOW | Consider changing username from 'admin' to something specific |
