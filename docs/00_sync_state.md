# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-15 (Evening session close — pipeline audit + cleanup sprint + LinkedIn live)
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
**4 clients, 14 publish profiles, 5 platforms, 39 cron jobs, 40 Edge Functions.**

---

## ALL CLIENTS — FULL STATE

| Client | client_id | Verticals | Feeds | AI | Platforms | Website |
|---|---|---|---|---|----|---|
| NDIS Yarns | fb98a472 | NDIS, AU Disability Policy | 17 | active | FB ✅ IG ✅ LI ✅ YT ✅ | none |
| Property Pulse | 4036a6b5 | AU Property ×3 | 20+ | active | FB ✅ IG ✅ LI ✅ YT ✅ | none |
| Care For Welfare | 3eca32aa | NDIS, AU Disability Policy | 15 | active | FB ✅ IG ✅ LI ✅ WP ✅ | careforwelfare.com.au |
| Invegent | 93494a09 | AI & Automation, Social Media, Content Marketing | 5 | active | FB ✅ IG ✅ LI ✅ | invegent.com (brief 046 pending) |

---

## PLATFORM STATUS — ALL CLIENTS

| Platform | Publisher | NY | PP | CFW | Invegent | Notes |
|---|---|---|---|---|---|---|
| Facebook | publisher v1.6.0 | ✅ | ✅ | ✅ | ✅ | 375+ posts total. Platform filter fixed — only locks facebook items |
| Instagram | instagram-publisher v1.0.0 | ✅ | ✅ | ✅ | ✅ | 0 published — waiting for image drafts |
| LinkedIn | linkedin-zapier-publisher v1.0.0 | ✅ | ✅ | ✅ | ✅ | LIVE as of 15 Apr. First PP post published |
| YouTube | youtube-publisher v1.5.0 | ✅ | ✅ | ❌ future | ❌ future | 1+ posts |
| WordPress | wordpress-publisher v1.0.0 | ❌ | ❌ | ✅ active | ❌ brief 046 | CFW pipeline generating first drafts |

---

## MAJOR CHANGES — 15 Apr 2026 SESSION

### Pipeline Audit Completed
Full audit of all 40 crons + 46 Edge Functions saved to:
`docs/ICE_Pipeline_Audit_Apr2026.md`

**Findings:** 10 issues identified. All addressed in cleanup sprint.

### Cleanup Sprint — All 8 Fixes Complete
1. ✅ ai-diagnostic-daily cron — fixed vault URL (was using NULL current_setting)
2. ✅ feed-intelligence-weekly cron — fixed vault URL (same issue)
3. ✅ auto-approver-sweep — standardised to vault project_url
4. ✅ insights-worker-daily — standardised to vault project_url
5. ✅ linkedin-publisher Edge Function — deleted (orphaned, superseded by Zapier publisher)
6. ✅ 5 test Edge Functions deleted — heygen-test, heygen-voices, tts-test, wasm-bootstrap, youtube-token-test
7. ✅ INGEST_API_KEY vault duplicate — deleted (PK manual via dashboard)
8. ✅ publisher_lock_queue_v1 old overload dropped — only 4-arg version with p_platform DEFAULT 'facebook' remains

### Additional Fixes
- ✅ 2 legacy bundler crons retired — m_phase2_ndis_daily_8am_sydney, m_phase2_property_hourly
- ✅ 11 Edge Functions redeployed with --no-verify-jwt — ai-worker, auto-approver, linkedin-zapier-publisher, instagram-publisher, pipeline-sentinel, pipeline-healer, pipeline-diagnostician, wordpress-publisher, weekly-manager-report, client-weekly-summary, insights-feedback
- ✅ Token expiry alerter built — m.token_expiry_alert table + public.check_token_expiry() function + token-expiry-alert-daily cron (daily 8:05am AEST)
- ✅ PP Facebook token refreshed — new token expires 14 Jun 2026
- ✅ Feed management UI deployed (Brief 049) — k.vw_feed_intelligence view, feed assignment modal, feed intelligence panel
- ✅ 2 YouTube channels linked to Property Pulse — Australian Property Mastery (PK Gupta), Rask Australia

### LinkedIn LIVE
**First PP LinkedIn post published: "Australia keeps talking while the rest of the world builds"**
Root cause of all LinkedIn failures: publisher_lock_queue_v1 had no platform filter — Facebook publisher was stealing LinkedIn queue items on every cycle. Fixed by dropping old 3-arg overload. JWT auth also blocking all non-publisher functions — fixed by --no-verify-jwt redeploy.

### Still 401 — Needs Fix Next Session
`content_fetch` — not included in JWT redeploy. Needs: `npx supabase functions deploy content_fetch --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns`

---

## INFRASTRUCTURE STATE

| Metric | Before | After |
|---|---|---|
| Edge Functions | 46 | 40 |
| Active cron jobs | 40 | 39 |
| Crons with NULL URL | 2 | 0 |
| Hardcoded URLs in crons | 2 | 0 |
| Orphaned functions | 1 | 0 |
| Test functions in prod | 5 | 0 |
| Publisher_lock_queue_v1 overloads | 2 | 1 (platform-filtered) |

---

## ZAPIER LINKEDIN BRIDGE

| Brand | Org URN | Webhook (partial) | Zap status |
|---|---|---|---|
| NDIS Yarns | urn:li:organization:112982689 | hooks.zapier.com/.../u7nkjq3/ | Published ✅ |
| Property Pulse | urn:li:organization:112999127 | hooks.zapier.com/.../u7nav0s/ | Published ✅ |
| Care For Welfare | urn:li:organization:74152188 | hooks.zapier.com/.../u7ngjbh/ | Published ✅ |
| Invegent | urn:li:organization:111966452 | hooks.zapier.com/.../u7nws8p/ | Published ✅ |

Rollback: when Community Management API approved → replace webhook URLs with real tokens → linkedin-zapier-publisher detects non-Zapier URL and routes correctly.

---

## WORDPRESS PUBLISHER

| Client | Site | Username | Secret | Category ID | Status |
|---|---|---|---|---|---|
| Care For Welfare | careforwelfare.com.au | admin | CFW_WP_APP_PASSWORD | 20 (NDIS News) | ACTIVE |
| Invegent | invegent.com | — | — | — | Brief 046 pending |

Publishes max 3 posts per 6-hour run. Yoast SEO handles meta/sitemaps. Mod_Security requires User-Agent header (handled).

---

## TOKEN CALENDAR

| Platform | Client | Expiry | Days | Alert |
|---|---|---|---|---|
| YouTube | NDIS Yarns | 7 Apr 2031 | ~1821d | ✅ |
| YouTube | Property Pulse | 2 Apr 2031 | ~1816d | ✅ |
| Facebook | NDIS Yarns | 31 May 2026 | ~46d | ⚠️ Auto-alert at 30d |
| Facebook | Property Pulse | 14 Jun 2026 | ~60d | ✅ Refreshed today |
| Facebook | Care For Welfare | ~Jun 2026 | ~51d | ⚠️ Auto-alert at 30d |
| Facebook | Invegent | ~Jun 2026 | ~51d | ⚠️ Auto-alert at 30d |

**Token expiry alerter active:** `public.check_token_expiry()` runs daily at 8:05am AEST. Writes to `m.token_expiry_alert`. Dashboard Overview shows warning/critical banners automatically. No manual calendar tracking needed.

---

## FEED INTELLIGENCE

**View:** `k.vw_feed_intelligence` — aggregates ingest runs, raw items, give-up rates, client assignments per feed.

**Top feeds by volume (as of 15 Apr):**
| Feed | Type | Runs | Raw Items | Clients |
|---|---|---|---|---|
| NDIS Newsletter Feed | email | 425 | 17 | CFW, NDIS Yarns |
| DSS - Updates | rss | 388 | 19 | CFW, NDIS Yarns |
| Disability Gateway | rss | 388 | 14 | CFW, NDIS Yarns |
| DSS - Resources | rss | 388 | 40 | CFW, NDIS Yarns |

**Feed management UI:** assign/unassign feeds to multiple clients via dashboard modal. is_enabled toggle per client. Never deletes from c.client_source — disable only.

---

## EXTERNAL GATES

| Gate | Status | Next action |
|---|---|---|
| Meta App Review | Business verification In Review | Contact dev support if stuck after 27 Apr |
| LinkedIn Community Management API | In Review | Evaluate Late.dev if still pending 13 May |
| Legal review (L001) | Not started | Hard gate before first external client signs |

---

## WHAT IS NEXT (PRIORITY ORDER)

1. **content_fetch JWT fix** — redeploy with --no-verify-jwt (still 401 on every cycle)
2. **CFW content session** — review first drafts, tune AI profile, confirm publishing schedule. Independent pipeline — no cloning from NDIS Yarns.
3. **Content strategy session** — schedule + series plan for all 4 brands
4. **Brief 043** — Subscription register dashboard page
5. **Brief 046** — invegent.com blog section (Supabase → Next.js ISR)
6. **Token alert platform-agnostic fix** — change `WHERE pp.platform = 'facebook'` to `WHERE pp.token_expires_at IS NOT NULL` in check_token_expiry()
7. **Portal LinkedIn OAuth fix** — set LINKEDIN_OAUTH_ENABLED=false in Vercel portal env
8. **Facebook token refresh** — NY, CFW, Invegent tokens expiring May/Jun. Auto-alerter will notify at 30 days.

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| content_fetch 401 on every cycle | HIGH | Redeploy with --no-verify-jwt next session |
| LinkedIn portal OAuth enabled but broken | MED | Set LINKEDIN_OAUTH_ENABLED=false in Vercel portal env |
| LinkedIn redirect URI wrong | MED | Update to portal.invegent.com in LinkedIn dev portal |
| Token alert platform-agnostic | LOW | Change facebook filter to token_expires_at IS NOT NULL |
| HeyGen avatar builds pending | LOW | PK to trigger stock avatar builds |
| CFW WordPress username is 'admin' | LOW | Consider renaming for security |
| Bundler not reading topic weights | LOW | Wire when bundler next touched |
| PP LinkedIn logo missing | LOW | Set via LinkedIn company page settings directly |
