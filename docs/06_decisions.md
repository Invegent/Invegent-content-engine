# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D100 — See earlier commits

---

## D101–D125 — See 16 Apr 2026 commits

---

## D126 — Topbar Critical Count Fix
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief C)

**Decision:** Topbar was showing raw row count (42) from m.pipeline_incident. Overview was showing a different subset (10). Fixed by changing topbar to COUNT(DISTINCT client_id) among open CRITICAL incidents — "N clients with critical alerts". Overview incidents grouped by client + check_name with first/last detected timestamps and "recurring" badge when firing > 24h.

---

## D127 — Incident Deduplication + Auto-Resolution
**Date:** 17 April 2026 | **Status:** ✅ BUILT (migration)

**Root cause:** `insert_pipeline_incident` had no deduplication — inserted a new row every time it was called regardless of existing open incidents for same client + check_name. No auto-resolution when condition cleared.

**Fixes applied:**
- `insert_pipeline_incident` patched — idempotent, returns existing ID if found
- `public.auto_resolve_pipeline_incidents()` — cron #63, every 30 min
- `public.bulk_resolve_stale_incidents()` — used to bulk-clear 52 stale incidents 17 Apr

---

## D128 — Token Expiry Badge Fix
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief C)

NULL + has token → grey "Expiry not tracked". NY/PP Facebook show real expiry dates with colour-coded urgency.

---

## D129 — Pipeline Health Card on Overview
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief B)

Pipeline AI summary surfaced on Overview page. Compresses daily workflow from 5 pages to 2.

---

## D130 — Collapse Engagement Tables Behind Dev-Tier Banner
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

Tables hidden when dev tier active. Summary stats remain.

---

## D131 — Sidebar Reorganisation
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

Performance + AI Costs + Compliance moved to MONITOR. CONTENT now: Content Studio, Visuals only.

---

## D132 — Clickable Overview Stat Cards
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

---

## D133 — Cost Page Projections
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief B)

Projected monthly total + cost per post added as stat cards.

---

## D134 — Onboarding Moved to Clients Tab
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief C)

---

## D135 — Pipeline Selection Gap Fixed
**Date:** 17 April 2026 | **Status:** ✅ FIXED (migration)

`public.select_digest_candidates()` + cron #62 every 30 min. 550 candidates promoted, pipeline unblocked 17 Apr.

---

## D136 — Schedule Grid Icon Fix
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

---

## D137 — Onboarding Run Scans + Activation Flow
**Date:** 17 April 2026 | **Status:** 🔲 Brief E (Claude Code)

Run Scans button (brand-scanner + ai-profile-bootstrap), scan results panel, Activate Client button.
`public.activate_client_from_submission(UUID, UUID)` migration applied 17 Apr.

---

## D138 — YouTube Discovery Route in Feed Discovery Pipeline
**Date:** 17 April 2026 | **Status:** 🔲 Planned — Phase 3

New `seed_type = 'youtube_keyword'` routes to YouTube Data API search instead of RSS.app.
Three routes: url→RSS.app, keyword→RSS.app, youtube_keyword→YouTube Data API.
Uses ICE_YOUTUBE_DATA_API_KEY (already in vault). ingest-worker already handles youtube_channel type.

---

## D139 — Feed Source Taxonomy: Content Origin + Provenance
**Date:** 17 April 2026 | **Status:** 🔲 Planned — Phase 3

**Problem:** The Feeds page currently shows a feed name and what clients are assigned. It has no
indication of where the content actually originates (Facebook page vs government website vs YouTube
channel vs newsletter) or how the feed got into ICE (auto-discovered vs manually added vs client
suggested). This makes the feed pool opaque at a glance.

**Three distinct concepts currently conflated or missing:**

**1. Delivery mechanism** (`source_type_code` — already exists, inconsistently used)
How ICE physically receives the content.
Values: `rss_app`, `rss_native`, `youtube_channel`, `email_newsletter`

**2. Content origin** (`content_origin` — NEW FIELD needed on `f.feed_source`)
Where the content actually lives before ICE picks it up.
Values: `facebook`, `youtube`, `website`, `government`, `industry_body`,
`newsletter`, `news_media`, `social_media`, `research`, `other`

**3. Provenance** (`added_by` — NEW FIELD needed on `f.feed_source`)
How the feed entered ICE.
Values: `discovery_pipeline`, `operator`, `client_suggestion`

**What the Feeds page should show per feed:**
```
NDIS Australia news
RSS_APP  ·  Web/News  ·  Discovery pipeline

RBA - Media Releases
RSS_NATIVE  ·  Government  ·  Operator

NDIS Newsletter Feed
EMAIL_NEWSLETTER  ·  Newsletter  ·  Operator

[Future] Some Facebook Page
RSS_APP  ·  Facebook  ·  Discovery pipeline
```

**Schema changes needed:**
```sql
ALTER TABLE f.feed_source
  ADD COLUMN content_origin  TEXT,   -- facebook | youtube | website | government | etc.
  ADD COLUMN added_by        TEXT DEFAULT 'operator'
    CHECK (added_by IN ('discovery_pipeline', 'operator', 'client_suggestion'));
```

**Backfill logic:**
- All existing `source_type_code = 'youtube_channel'` → `content_origin = 'youtube'`
- All existing `source_type_code = 'email_newsletter'` → `content_origin = 'newsletter'`
- All `feed_discovery_seed` linked rows → `added_by = 'discovery_pipeline'`
- `f.feed_suggestion` linked rows → `added_by = 'client_suggestion'`
- Everything else → `added_by = 'operator'`
- `content_origin` for remaining rows: operator sets manually via Feeds page

**Feed discovery pipeline changes (D138 + D139 together):**
- When `feed-discovery` provisions a feed → set `added_by = 'discovery_pipeline'`
- When youtube_keyword route provisions a channel → also set `content_origin = 'youtube'`
- When RSS.app URL route targets a Facebook page → set `content_origin = 'facebook'`

**Dashboard changes:**
- Feeds page: show content_origin + added_by as small badges on each feed card
- Feed add/edit form: dropdown for content_origin, auto-set added_by = 'operator'
- Filter options: filter by content_origin or added_by
- Feeds page category grouping could eventually use content_origin as the grouping
  dimension instead of the current manual category system

**Build when:** Phase 3. Do schema migration first, then dashboard update.
Can be done in one Claude Code brief + one migration.

---

## Decisions Pending

| Decision | Context | Target |
|---|---|---|
| D137 — Onboarding Run Scans + Activate | Brief E ready to paste into Claude Code | Next Claude Code session |
| D138 — YouTube discovery route | feed-discovery + youtube_keyword seed_type | Phase 3 |
| D139 — Feed source taxonomy | content_origin + added_by fields + Feeds page display | Phase 3 |
| NDIS Support Catalogue data load | Tables exist. Needs NDIA Excel from ndia.gov.au | Phase 3 |
| Legal review of service agreement | L001 — hard gate before external client #1 | Before C1 |
| F1 Prospect demo generator | Hold until NDIS Yarns has 60+ days data | ~mid-June 2026 |
| LinkedIn Community Management API | Evaluate Late.dev if still pending 13 May 2026 | 13 May 2026 |
| D124 — Boost Configuration UI | Meta Standard Access dependency | Phase 3.4 |
| RSS.app discovery dashboard page | Seed management UI — add/view/manage without SQL | Phase 3 |
| Cowork daily inbox task | Gmail MCP — archive noise, surface actions | Phase 4 |
| Model router | ai-job → model_router → claude OR openai | Phase 4 |
| SaaS vs managed service | When 10 clients served 3+ months | Phase 4 |
| Meta App Review | In Review. Contact dev support if stuck after 27 Apr 2026 | Waiting |
| animated_data advisor conflict | Fix in Format Library page — remove NOT YET BUILDABLE text | Immediate |
| Assign 12 unassigned feeds to clients | Via Feeds page — 9 discovery + 3 legacy | Immediate |
| CFW content session | Review first drafts, tune AI profile, write prompts | Next session |
| Confirm TBC subscription costs | Vercel, HeyGen, Claude Max, OpenAI | Next session |
| Voice & Formats prompt length fix | Add 250-word constraint to NY + PP prompts — fixes 0% auto-approver | Immediate |
