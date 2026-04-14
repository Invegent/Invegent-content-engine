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

**Decision:** Route LinkedIn posts through Zapier as a temporary bridge while Community Management API (`w_organization_social`) is pending approval. ICE sends approved draft content to a Zapier webhook. Zapier posts to LinkedIn Company Pages using its own pre-approved OAuth.

**Architecture:** ICE linkedin-zapier-publisher → crosspost_facebook_to_linkedin() copies approved FB drafts to LinkedIn queue → publisher picks up queue items → POSTs to Zapier webhook URL (stored in page_access_token field) → Zapier fires → post appears on LinkedIn page.

**Token storage pattern:** page_access_token on linkedin profiles = Zapier webhook URL (not a real OAuth token). Detected by checking if value starts with `https://hooks.zapier.com`.

**Rollback:** When Community Management API approved → replace webhook URLs with real tokens → disable zapier cron → existing linkedin-publisher cron takes over automatically.

**Key fix:** `m.post_publish_queue` unique index widened from `(post_draft_id)` to `(post_draft_id, platform)` to support one draft being queued for multiple platforms.

**Zap configuration:**
- NDIS Yarns: org 112982689, webhook u7nkjq3
- Property Pulse: org 112999127, webhook u7nav0s
- Care For Welfare: org 74152188, webhook u7ngjbh
- Invegent: org 111966452, webhook u7nws8p

---

## D103 — Invegent as ICE Client
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Create Invegent as a full ICE client with its own content pipeline, AI profile, and publish profiles. Invegent publishes about AI-driven content marketing, social media strategy, and automation for small business.

**client_id:** `93494a09-cc89-41d1-b364-cb63983063a6`

**New verticals created:** AI & Automation (15, domain 13), Social Media Strategy (16, domain 13), Content Marketing (17, domain 5).

**New feed sources:** TechCrunch AI, The Verge AI, Marketing AI Institute, Social Media Examiner, Content Marketing Institute.

**AI profile tone:** Conversational, practical, curious. Writes like a knowledgeable friend explaining something interesting. Never self-promotional. Ends with a genuine question that invites engagement.

**Platforms:** Facebook, Instagram, LinkedIn (Zapier). YouTube is future.

---

## D104 — Care For Welfare Full Pipeline Setup
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Configure CFW as a full ICE client: clone NDIS Yarns content scope and feed sources (same vertical), create OT-specific AI profile, set profession_slug = occupational_therapy so compliance rules load correctly.

**AI profile differentiation from NDIS Yarns:** CFW writes as a caring OT practitioner to participants, families, and allied health professionals. Warmer tone than NDIS Yarns. Includes CFW-specific disclaimer. Explicitly identifies as a registered NDIS provider.

**Platforms:** Facebook, Instagram, LinkedIn (Zapier). YouTube future.

---

## D105 — WordPress Publishing for CFW Website SEO
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Publish approved CFW drafts to careforwelfare.com.au/ndis-news/ via WordPress REST API. Cross-post pattern — max 3 posts per 6-hour run for SEO-friendly pacing. Yoast SEO plugin (already installed) handles meta titles, descriptions, and structured data automatically.

**Rationale:** Social posts disappear in feeds. Website posts get indexed permanently. NDIS is a low-competition niche — even 150-280 word posts rank for long-tail searches. Free organic traffic from people searching for exactly what CFW offers.

**Key technical finding:** careforwelfare.com.au runs Mod_Security which blocks API requests without a browser-like User-Agent header (returns HTTP 406). Fixed by adding `User-Agent: Mozilla/5.0` to all fetch calls in the wordpress-publisher Edge Function.

**Credentials:** Username `admin`, Application Password stored as Supabase secret `CFW_WP_APP_PASSWORD`, NDIS News category ID 20.

**WordPress situation:** Site is on Crazy Domains Linux Hosting (cPanel). Database is `careforw_wp2`. Developer had changed admin username and email — PK recovered access via phpMyAdmin password reset.

**Extensibility:** Any client with `website_publish_enabled: true` and `wp_site_url` in `c.client.profile` JSONB will be picked up automatically. Each client needs their own `{CLIENT}_WP_APP_PASSWORD` secret.

---

## D106 — Platform Connections Dashboard — Dynamic Rendering
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Both `/connect` page and Clients → Connect tab now render platforms dynamically from `c.client_publish_profile` — no hardcoded platform columns. New platforms appear automatically.

**Zapier detection:** LinkedIn profiles with page_access_token starting with `https://hooks.zapier.com` show a purple "Active — Zapier bridge" badge instead of token expiry info.

**Shared util:** `lib/platform-status.ts` in invegent-dashboard exports `PLATFORM_CONFIG`, `PLATFORM_ORDER`, `getTokenStatus()`, `PlatformIcon`, and `PlatformProfile` type — used by both pages.

---

## Decisions Pending

| Decision | Context | Target |
|---|---|---|
| NDIS Support Catalogue data load | Tables exist. Needs NDIA Excel from ndia.gov.au | Phase 3 |
| Legal review of service agreement | L001 — hard gate before external client #1 | Before C1 |
| F1 Prospect demo generator | Hold until NDIS Yarns has 60+ days data | ~mid-June 2026 |
| LinkedIn middleware evaluation | Late.dev if API still pending | 13 May 2026 |
| Bundler topic weight wiring | recalculate_topic_weights() built, bundler not reading it | When bundler next touched |
| NDIS Yarns image format fix | ai-worker v2.8.0 may resolve — monitor 24-48h | Next session |
| invegent.com blog section | Brief 046 — Supabase → Next.js ISR pattern | Next session |
| Subscription register dashboard | Brief 043 — ready to run | Next session |
| CFW acceptance test | Full onboarding flow end-to-end | Next session |
| Cowork daily inbox task | Gmail MCP — archive noise, surface actions | Phase 4 |
| Model router | When AI costs become significant | Phase 4 |
| SaaS vs managed service | When 10 clients served 3+ months | Phase 4 |
