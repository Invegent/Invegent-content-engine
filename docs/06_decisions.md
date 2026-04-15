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

**Extensibility:** Any client with `website_publish_enabled: true` and `wp_site_url` in `c.client.profile` JSONB will be picked up automatically.

---

## D106 — Platform Connections Dashboard — Dynamic Rendering
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Both `/connect` page and Clients → Connect tab now render platforms dynamically from `c.client_publish_profile` — no hardcoded platform columns. New platforms appear automatically.

**Zapier detection:** LinkedIn profiles with page_access_token starting with `https://hooks.zapier.com` show a purple "Active — Zapier bridge" badge instead of token expiry info.

**Shared util:** `lib/platform-status.ts` in invegent-dashboard exports `PLATFORM_CONFIG`, `PLATFORM_ORDER`, `getTokenStatus()`, `PlatformIcon`, and `PlatformProfile` type — used by both pages.

---

## D107 — Full Pipeline Audit Methodology
**Date:** 15 April 2026 | **Status:** ✅ Complete

**Decision:** Conduct a systematic read-only audit of all 40 crons and 46 Edge Functions before any further feature work. Audit saved as `docs/ICE_Pipeline_Audit_Apr2026.md`.

**Findings summary:** 10 issues found — 2 broken (NULL URL crons), 5 suspect (hardcoded values, legacy bundlers), 3 informational. Core pipeline rated 8/10 as a developer, 7/10 as a CTO. Maintainability rated 5/10 due to auth fragmentation and cron sprawl.

**Outcome:** All 10 issues addressed in the same session. System is now cleaner and more maintainable than before the audit.

**Key principle confirmed:** The architecture (signal-centric pipeline, clean schema separation, platform abstraction) is sound. The debt was operational, not structural. Targeted cleanup is the right approach — not architectural overhaul.

---

## D108 — Auth Standardisation: No-Verify-JWT + Vault Pattern
**Date:** 15 April 2026 | **Status:** ✅ Complete

**Decision:** Standardise all Edge Functions called by crons to use `verify_jwt: false` (deployed with `--no-verify-jwt` flag). Security is enforced instead by internal API key checks within each function (`x-publisher-key`, `x-ai-worker-key` etc).

**Problem:** 11 functions had `verify_jwt: true` but their crons sent no Authorization header — causing 401s on every cycle. ai-worker, auto-approver, instagram-publisher, pipeline-sentinel, pipeline-healer, pipeline-diagnostician, linkedin-zapier-publisher, wordpress-publisher, weekly-manager-report, client-weekly-summary, insights-feedback were all silently failing.

**Fix:** Redeployed all 11 with `--no-verify-jwt`. Functions already had internal key validation so security posture is unchanged.

**Remaining:** `content_fetch` still 401 — needs same redeploy next session.

**Standard pattern going forward:** All cron-called Edge Functions → `verify_jwt: false` + internal API key check. Portal/dashboard-called functions may use either pattern depending on whether they need RLS context.

---

## D109 — Publisher Platform Filter (publisher_lock_queue_v1)
**Date:** 15 April 2026 | **Status:** ✅ Fixed

**Decision:** Drop the old 3-argument overload of `m.publisher_lock_queue_v1` so only the 4-argument version with `p_platform DEFAULT 'facebook'` remains.

**Problem:** The Facebook publisher was calling publisher_lock_queue_v1 without a platform parameter. With two overloads, PostgreSQL resolved to the 3-arg overload (no platform filter), causing the Facebook publisher to lock AND process LinkedIn, Instagram, and YouTube queue items. LinkedIn has never published because of this — the Facebook publisher consumed all LinkedIn items first, failed token validation (Zapier URL ≠ Facebook token), and pushed them back with 6-hour backoff.

**Fix:** Dropped old overload. PostgreSQL now resolves all calls to the 4-arg version, which defaults to `p_platform = 'facebook'`. LinkedIn Zapier publisher uses `publisher_lock_queue_v2` directly with `p_platform = 'linkedin'` — unaffected.

**Result:** LinkedIn published its first ever post within 20 minutes of this fix.

---

## D110 — Token Expiry Alerter
**Date:** 15 April 2026 | **Status:** ✅ Live

**Decision:** Build automated token expiry alerting rather than relying on calendar reminders. A daily cron calls `public.check_token_expiry()` which writes rows to `m.token_expiry_alert`. Dashboard Overview page shows warning (amber) and critical (red) banners.

**Thresholds:** Warning at 30 days remaining. Critical at 14 days remaining.

**Auto-resolution:** When a token is refreshed (token_expires_at pushed past 30 days), the alert row is auto-resolved via resolved_at timestamp.

**Initial scope:** Facebook tokens only (the only platform with near-term expiry). Platform-agnostic fix pending — change `WHERE pp.platform = 'facebook'` to `WHERE pp.token_expires_at IS NOT NULL`.

**Cron:** `token-expiry-alert-daily` at 5 22 * * * UTC (8:05am AEST).

---

## D111 — Feed Management: Shared Signal Model
**Date:** 15 April 2026 | **Status:** ✅ Live

**Decision:** Feeds are shared signals, not client-owned assets. A single DSS feed can serve both NDIS Yarns and Care For Welfare simultaneously. The dashboard now exposes this correctly via a feed assignment modal.

**c.client_source rules:**
- NEVER delete rows — only set `is_enabled = false`
- `weight` defaults to 1.0
- Any feed can be assigned to any number of clients
- Unassigning = `is_enabled = false`, not deletion

**Feed intelligence:** `k.vw_feed_intelligence` view aggregates ingest runs, raw items, give-up rates, and client assignments per feed. Surfaced in dashboard as expandable per-feed panel.

---

## Decisions Pending

| Decision | Context | Target |
|---|---|---|
| content_fetch JWT fix | Redeploy --no-verify-jwt | Next session |
| Token alert platform-agnostic | Change facebook filter to token_expires_at IS NOT NULL | Next session |
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
