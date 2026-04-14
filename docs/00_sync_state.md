# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-15 (Morning session close — LinkedIn cron conflict fixed)
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
**4 clients, 14 publish profiles, 5 platforms, 40 cron jobs. Pipeline fully autonomous.**

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

| Platform | Publisher | NY | PP | CFW | Invegent | Published |
|---|---|---|---|---|---|---|
| Facebook | publisher v1.3.x | ✅ | ✅ | ✅ | ✅ | 374+ posts |
| Instagram | instagram-publisher v1.0.0 | ✅ | ✅ | ✅ | ✅ | 0 — waiting for image drafts |
| LinkedIn | linkedin-zapier-publisher v1.0.0 | ✅ Zapier | ✅ Zapier | ✅ Zapier | ✅ Zapier | 0 — 3 queued, firing next cycle |
| YouTube | youtube-publisher v1.5.0 | ✅ OAuth | ✅ OAuth | ❌ future | ❌ future | 1+ |
| Website/WP | wordpress-publisher v1.0.0 | ❌ n/a | ❌ n/a | ✅ active | ❌ brief 046 pending | 0 — CFW pipeline generating |

---

## LINKEDIN FIX — 15 Apr 2026

**Root cause:** `linkedin-publisher-every-15m` cron (the OLD direct-API publisher, marked dormant) was still active and picking up LinkedIn queue items before the zapier-publisher could. It tried to use the Zapier webhook URL as an OAuth token, got `invalid_facebook_token` error, and marked all 3 queue items as failed after 3 attempts.

**Fix applied:**
- Disabled `linkedin-publisher-every-15m` cron permanently
- Reset 3 PP LinkedIn queue items (attempt_count=0, last_error=null, status=queued)
- Active cron count: 41 → 40
- linkedin-zapier-publisher-every-20m is now the sole LinkedIn publisher
- 3 queue items will fire on next cron cycle (~20min from fix)

**Key lesson:** Never leave a dormant publisher cron active when a replacement is deployed. Always unschedule old crons explicitly.

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

## PIPELINE HEALTH — 15 Apr 2026 MORNING

| Metric | Value | Status |
|---|---|---|
| Posts last 7 days | 21 | ✅ |
| Needs review | 0 | ✅ |
| Stuck AI jobs | 0 | ✅ |
| Open CRITICAL incidents | 1 | CFW no_drafts — will clear once first draft generates |
| LinkedIn queue | 3 items queued | Will fire next zapier cron cycle |
| Instagram published | 0 | Waiting for image drafts |
| CFW drafts | 0 | Pipeline started 14 Apr, first drafts expected today |
| Invegent drafts | 0 | Pipeline started 14 Apr, first drafts expected today |
| Active cron jobs | 40 | ✅ (was 41, removed dormant linkedin-publisher) |

---

## ACTIVE CRON JOBS — 40 TOTAL

Key ones:
- ai-worker (5min), auto-approver (10min), content_fetch (10min)
- instagram-publisher (15min), pipeline-sentinel (15min), image-worker (15min)
- linkedin-zapier-publisher (20min)
- video-worker (30min), youtube-publisher (15,45 min), heygen-worker (30min)
- wordpress-publisher (every 6h)
- weekly-manager-report (Mon 7am AEST), client-weekly-summary (Mon 7:30am AEST)
- insights-worker (daily 3am UTC), insights-feedback (daily 3:30am UTC)
- NOTE: linkedin-publisher-every-15m DISABLED — was conflicting with zapier publisher

---

## TOKEN CALENDAR

| Platform | Client | Expiry | Days |
|---|---|---|---|
| YouTube | NDIS Yarns | 7 Apr 2031 | ~1821d |
| YouTube | Property Pulse | 2 Apr 2031 | ~1816d |
| Facebook | NDIS Yarns | 31 May 2026 | ~46d ⚠️ |
| Facebook | Property Pulse | 5 Jun 2026 | ~51d ⚠️ |
| Facebook | Care For Welfare | ~Jun 2026 | ~51d ⚠️ |
| Facebook | Invegent | ~Jun 2026 | ~51d ⚠️ |

---

## EXTERNAL GATES

| Gate | Status | Next action |
|---|---|---|
| Meta App Review | Business verification In Review | Contact dev support if stuck after 27 Apr |
| LinkedIn Community Management API | In Review | Evaluate Late.dev if still pending 13 May |
| Legal review (L001) | Not started | Hard gate before first external client signs |

---

## WHAT IS NEXT (PRIORITY ORDER)

1. **LinkedIn** — check PP LinkedIn page in ~20min. 3 posts should appear. Then cross-post function will pick up NY + CFW + Invegent approved drafts on next cycle.
2. **CFW + Invegent first drafts** — expected today. CRITICAL incident will clear.
3. **Content strategy session** — schedule + series plan for all 4 brands. NEXT SESSION.
4. **Brief 043** — Subscription register dashboard page.
5. **Brief 046** — invegent.com blog section (Supabase → Next.js ISR).
6. **Portal LinkedIn OAuth fix** — set LINKEDIN_OAUTH_ENABLED=false in Vercel portal env.
7. **Facebook token refresh** — all 4 clients expiring May/Jun. Refresh early June.

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| LinkedIn portal OAuth enabled but broken | MED | Set LINKEDIN_OAUTH_ENABLED=false in Vercel portal env |
| LinkedIn redirect URI wrong | MED | Update to portal.invegent.com in LinkedIn dev portal |
| NDIS Yarns image formats | LOW | Monitor — v2.8.0 may fix over 24-48h |
| Bundler not reading topic weights | LOW | Wire when bundler next touched |
| HeyGen avatar builds pending | LOW | PK to trigger stock avatar builds |
| CFW WordPress username is 'admin' | LOW | Consider renaming for security |
