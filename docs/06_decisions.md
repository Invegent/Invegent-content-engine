# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D100 — See earlier commits

---

## D101 — Instagram Publishing via Graph API — Cross-post Pattern
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Build instagram-publisher as a cross-post function (queries post_draft directly, not queue-based). Uses same Facebook Page Access Token to publish to linked Instagram Business Account via Graph API.

**Key finding:** Instagram Business account must be linked to the Facebook Page in Facebook Business Manager before the Graph API returns an `instagram_business_account` field. The Graph API token also needs `instagram_basic` and `instagram_content_publish` permissions — added via "API setup with Facebook login" use case, not "API setup with Instagram login".

**Format routing:** image_quote/carousel → image post. video_short_* → Reels. text → skipped (Instagram does not support text-only).

**What was built:** instagram-publisher v1.0.0. Cron job 53 every 15min. Publish profiles for NDIS Yarns, Property Pulse, CFW, Invegent.

---

## D102 — LinkedIn Publishing via Zapier Webhook Bridge
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Route LinkedIn posts through Zapier as a temporary bridge while Community Management API (`w_organization_social`) is pending approval.

**Rollback:** When Community Management API approved → replace webhook URLs with real tokens → linkedin-zapier-publisher detects non-Zapier URL and routes correctly.

**Key fix:** `m.post_publish_queue` unique index widened from `(post_draft_id)` to `(post_draft_id, platform)` to support one draft being queued for multiple platforms.

**Zap configuration:** NDIS Yarns: u7nkjq3 | Property Pulse: u7nav0s | Care For Welfare: u7ngjbh | Invegent: u7nws8p

---

## D103 — Invegent as ICE Client
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Create Invegent as a full ICE client. client_id: `93494a09-cc89-41d1-b364-cb63983063a6`. New verticals: AI & Automation, Social Media Strategy, Content Marketing. AI tone: conversational, practical, curious. Platforms: FB, IG, LI (Zapier).

---

## D104 — Care For Welfare Full Pipeline Setup
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Configure CFW as a full ICE client. Clone NDIS Yarns content scope, create OT-specific AI profile, set profession_slug = occupational_therapy. Warmer tone than NDIS Yarns. Platforms: FB, IG, LI (Zapier), WP.

---

## D105 — WordPress Publishing for CFW Website SEO
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Publish approved CFW drafts to careforwelfare.com.au/ndis-news/ via WordPress REST API. Max 3 posts per 6-hour run. Yoast SEO handles meta. Mod_Security requires User-Agent: Mozilla/5.0 header.

**Credentials:** Username `admin`, secret `CFW_WP_APP_PASSWORD`, category ID 20.

---

## D106 — Platform Connections Dashboard — Dynamic Rendering
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Both `/connect` page and Clients → Connect tab render platforms dynamically from `c.client_publish_profile`. LinkedIn profiles with page_access_token starting `https://hooks.zapier.com` show purple Zapier bridge badge.

---

## D107 — Full Pipeline Audit Methodology
**Date:** 15 April 2026 | **Status:** ✅ Complete

**Decision:** Systematic read-only audit of all 40 crons and 46 Edge Functions before further feature work. 10 issues found, all fixed same session. Architecture confirmed sound — debt was operational, not structural.

---

## D108 — Auth Standardisation: No-Verify-JWT + Vault Pattern
**Date:** 15 April 2026 | **Status:** ✅ Complete

**Decision:** All cron-called Edge Functions use `verify_jwt: false` + internal API key check. 12 functions redeployed --no-verify-jwt including content_fetch. Security posture unchanged — internal key validation still in place.

---

## D109 — Publisher Platform Filter (publisher_lock_queue_v1)
**Date:** 15 April 2026 | **Status:** ✅ Fixed

**Decision:** Drop old 3-arg overload of `m.publisher_lock_queue_v1`. Only 4-arg version with `p_platform DEFAULT 'facebook'` remains. Root cause of LinkedIn never publishing: Facebook publisher was stealing all LinkedIn queue items via the unfiltered 3-arg overload.

---

## D110 — Token Expiry Alerter
**Date:** 15 April 2026 | **Status:** ✅ Live

**Decision:** `public.check_token_expiry()` runs daily 8:05am AEST. Writes to `m.token_expiry_alert`. Dashboard banners at 30d warning / 14d critical. Currently Facebook only — platform-agnostic fix pending.

---

## D111 — Feed Management: Shared Signal Model
**Date:** 15 April 2026 | **Status:** ✅ Live

**Decision:** Feeds are shared signals, not client-owned. Any feed can serve multiple clients simultaneously. `c.client_source` rows are NEVER deleted — only `is_enabled = false`. Feed status values: `active`, `paused`, `deprecated` only.

---

## D112 — Feed DML via SECURITY DEFINER Functions
**Date:** 15 April 2026 | **Status:** ✅ Live

**Decision:** All feed write operations (assign, unassign, deactivate) go through SECURITY DEFINER functions in the public schema, called via `.rpc()`. Direct `exec_sql` DML on `c` and `f` schemas silently fails — returns no error, writes nothing.

**Functions created:**
- `public.feed_assign_client(p_source_id uuid, p_client_id uuid, p_enabled boolean, p_weight numeric)` — upsert client_source row
- `public.feed_unassign_from_client(p_source_id uuid, p_client_id uuid)` — sets is_enabled=false for one client
- `public.feed_deactivate(p_source_id uuid)` — sets feed status='deprecated' + disables all client_source rows

**Key constraint:** `f.feed_source.status` only accepts `'active'`, `'paused'`, `'deprecated'`. Using `'inactive'` throws check constraint violation.

**Pattern to remember:** exec_sql = SELECT only on c/f/t schemas. Any write → SECURITY DEFINER function in public schema.

---

## D113 — Feed UI Page Separation
**Date:** 15 April 2026 | **Status:** ✅ Live

**Decision:** Two pages, two distinct roles for feed management:
- `/feeds` (global Feeds page) — manage the full feed pool. Vertical grouping. Assign to multiple clients. Deactivate globally. Uses `k.vw_feed_intelligence` which includes `assigned_clients` array per feed.
- Clients → Feeds tab (specific client selected) — manage one client’s feeds. Flat list. Unassign only. Uses INNER JOIN query filtered by that client with `is_enabled = true`.

**"All clients" on Clients → Feeds tab** — shows a prompt to select a client with a link to /feeds. Does NOT attempt to show all feeds (the query does not include the `assigned_clients` array needed for vertical grouping).

**handleUnassign** uses `feed.client_id` (actual assignment from DB row), not `clientContext.clientId` (which defaults to clients[0] when no specific client selected and could point to the wrong client).

---

## Decisions Pending

| Decision | Context | Target |
|---|---|---|
| Token alert platform-agnostic | Change facebook filter to token_expires_at IS NOT NULL | Next session |
| Deprecated feeds stale cleanup | 15 deprecated feeds still have is_enabled=true | Low priority |
| NDIS Support Catalogue data load | Tables exist. Needs NDIA Excel from ndia.gov.au | Phase 3 |
| Legal review of service agreement | L001 — hard gate before external client #1 | Before C1 |
| F1 Prospect demo generator | Hold until NDIS Yarns has 60+ days data | ~mid-June 2026 |
| LinkedIn middleware evaluation | Late.dev if API still pending | 13 May 2026 |
| Bundler topic weight wiring | recalculate_topic_weights() built, bundler not reading it | When bundler next touched |
| invegent.com blog section | Brief 046 — Supabase → Next.js ISR pattern | Next session |
| Subscription register dashboard | Brief 043 — ready to run | Next session |
| CFW content session | Review first drafts, tune AI profile | Next session |
| Cowork daily inbox task | Gmail MCP — archive noise, surface actions | Phase 4 |
| Model router | When AI costs become significant | Phase 4 |
| SaaS vs managed service | When 10 clients served 3+ months | Phase 4 |
