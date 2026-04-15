# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-15 (Full session close — feed management complete)
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
| Facebook | publisher v1.6.0 | ✅ | ✅ | ✅ | ✅ | 375+ posts. Platform filter fixed. |
| Instagram | instagram-publisher v1.0.0 | ✅ | ✅ | ✅ | ✅ | 0 published — waiting for image drafts |
| LinkedIn | linkedin-zapier-publisher v1.0.0 | ✅ | ✅ | ✅ | ✅ | LIVE. First PP post published 15 Apr |
| YouTube | youtube-publisher v1.5.0 | ✅ | ✅ | ❌ future | ❌ future | 1+ posts |
| WordPress | wordpress-publisher v1.0.0 | ❌ | ❌ | ✅ active | ❌ brief 046 | CFW pipeline generating |

---

## TODAY’S SESSION — 15 Apr 2026 (FULL DAY)

### Morning: Pipeline Audit + Cleanup Sprint
- Full audit of 40 crons + 46 Edge Functions → 10 issues found, all fixed
- 46 → 40 Edge Functions, 40 → 39 crons
- Auth standardised: 12 functions redeployed --no-verify-jwt (incl. content_fetch — done manually by PK)
- publisher_lock_queue_v1 platform filter fixed → LinkedIn live
- Token expiry alerter built (m.token_expiry_alert, check_token_expiry(), daily cron)
- PP Facebook token refreshed (expires 14 Jun 2026)

### Afternoon: Feed Management UI (Briefs 049–052)
- Brief 049: k.vw_feed_intelligence view, feed assignment modal, intelligence panel
- Brief 050: Health halos, client allocation badge, add/delete, inactive toggle
- Brief 051: Feed UX redesign — client context mode, unassign, pool picker, process guidance
- Brief 052: Feed bug fixes — vertical grouping, deduplication, exec_sql → SECURITY DEFINER

### Evening: Feed API Bugs (all fixed)
**Root cause of all feed write failures:** `exec_sql` silently ignores DML on `c` and `f` schemas.
**Fix:** 3 SECURITY DEFINER functions created in public schema:
- `public.feed_assign_client(p_source_id, p_client_id, p_enabled, p_weight)`
- `public.feed_deactivate(p_source_id)` — sets status = 'deprecated' (not 'inactive' — check constraint)
- `public.feed_unassign_from_client(p_source_id, p_client_id)`

**Additional fixes:**
- `getFeeds` query: LEFT JOIN → INNER JOIN with `cs.is_enabled = true` — unassigned feeds now disappear after unassign
- `handleUnassign` uses `feed.client_id` not `clientContext.clientId` (was pointing at wrong client)
- Clients → Feeds tab: only loads feeds when a specific client is selected; "All clients" shows prompt with link to /feeds
- Error visibility added to all feed modals
- f.feed_source status check constraint: only `'active'`, `'paused'`, `'deprecated'` allowed (not 'inactive')

**Verified working:**
- ✅ Assign/unassign feeds from global Feeds page
- ✅ Unassign from Clients → Feeds tab (specific client selected)
- ✅ Deactivate feed globally (sets deprecated + disables all client_source rows)
- ✅ "Every Australian Counts" — deprecated, 0 enabled assignments confirmed in DB

---

## INFRASTRUCTURE STATE

| Metric | Value |
|---|---|
| Edge Functions | 40 |
| Active cron jobs | 39 |
| Active feeds | 31 |
| Genuinely unassigned feeds | 3 |
| Deprecated feeds | 20 (15 have stale is_enabled=true — pre-existing, low priority cleanup) |

---

## FEED MANAGEMENT ARCHITECTURE

**Two pages, two roles:**
- `/feeds` — global feed pool management. Vertical grouping (Disability & NDIS / Property & Finance / AI & Marketing / Shared / Unassigned). Assign to multiple clients. Deactivate globally. Uses `k.vw_feed_intelligence`.
- Clients → Feeds tab (specific client selected) — manage one client’s feeds. Flat list. Unassign only. Uses INNER JOIN query filtered by client.

**Key rules:**
- `c.client_source` rows are NEVER deleted — only `is_enabled = false`
- Feed status: `active`, `paused`, `deprecated` (not inactive — check constraint)
- All feed DML goes through SECURITY DEFINER functions in public schema
- exec_sql is READ-ONLY on c and f schemas — silently ignores DML

---

## ZAPIER LINKEDIN BRIDGE

| Brand | Org URN | Webhook (partial) | Status |
|---|---|---|---|
| NDIS Yarns | urn:li:organization:112982689 | hooks.zapier.com/.../u7nkjq3/ | ✅ |
| Property Pulse | urn:li:organization:112999127 | hooks.zapier.com/.../u7nav0s/ | ✅ |
| Care For Welfare | urn:li:organization:74152188 | hooks.zapier.com/.../u7ngjbh/ | ✅ |
| Invegent | urn:li:organization:111966452 | hooks.zapier.com/.../u7nws8p/ | ✅ |

---

## WORDPRESS PUBLISHER

| Client | Site | Username | Secret | Category ID | Status |
|---|---|---|---|---|---|
| Care For Welfare | careforwelfare.com.au | admin | CFW_WP_APP_PASSWORD | 20 (NDIS News) | ACTIVE |
| Invegent | invegent.com | — | — | — | Brief 046 pending |

---

## TOKEN CALENDAR

| Platform | Client | Expiry | Alert |
|---|---|---|---|
| YouTube | NDIS Yarns | 7 Apr 2031 | ✅ |
| YouTube | Property Pulse | 2 Apr 2031 | ✅ |
| Facebook | NDIS Yarns | 31 May 2026 | ⚠️ Auto-alert at 30d |
| Facebook | Property Pulse | 14 Jun 2026 | ✅ Refreshed 15 Apr |
| Facebook | Care For Welfare | ~Jun 2026 | ⚠️ Auto-alert at 30d |
| Facebook | Invegent | ~Jun 2026 | ⚠️ Auto-alert at 30d |

`public.check_token_expiry()` runs daily 8:05am AEST. Writes to `m.token_expiry_alert`. Dashboard banners auto-show at 30d warning / 14d critical.

---

## EXTERNAL GATES

| Gate | Status | Next action |
|---|---|---|
| Meta App Review | Business verification In Review | Contact dev support if stuck after 27 Apr |
| LinkedIn Community Management API | In Review | Evaluate Late.dev if still pending 13 May |
| Legal review (L001) | Not started | Hard gate before first external client signs |

---

## WHAT IS NEXT (PRIORITY ORDER)

1. **CFW content session** — review first drafts, tune AI profile. Independent pipeline — no cloning from NDIS Yarns.
2. **Content strategy session** — schedule + series plan for all 4 brands
3. **Brief 043** — Subscription register dashboard page
4. **Brief 046** — invegent.com blog section (Supabase → Next.js ISR)
5. **Token alert platform-agnostic** — change `WHERE pp.platform = 'facebook'` to `WHERE pp.token_expires_at IS NOT NULL`
6. **Portal LinkedIn OAuth fix** — set LINKEDIN_OAUTH_ENABLED=false in Vercel portal env
7. **Deprecated feeds cleanup** — 15 deprecated feeds still have is_enabled=true in c.client_source. Low priority.
8. **Facebook token refresh** — NY, CFW, Invegent tokens expiring May/Jun. Auto-alerter will notify.

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| LinkedIn portal OAuth enabled but broken | MED | Set LINKEDIN_OAUTH_ENABLED=false in Vercel portal env |
| LinkedIn redirect URI wrong | MED | Update to portal.invegent.com in LinkedIn dev portal |
| Token alert platform-agnostic | LOW | Change facebook filter to token_expires_at IS NOT NULL |
| HeyGen avatar builds pending | LOW | PK to trigger stock avatar builds |
| CFW WordPress username is 'admin' | LOW | Consider renaming for security |
| Bundler not reading topic weights | LOW | Wire when bundler next touched |
| PP LinkedIn logo missing | LOW | Set via LinkedIn company page settings directly |
| Deprecated feeds stale is_enabled=true | LOW | 15 rows in c.client_source need cleanup |
