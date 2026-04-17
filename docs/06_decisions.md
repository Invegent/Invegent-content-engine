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
- `insert_pipeline_incident` patched to check for existing open incident (client_id + check_name) before inserting — idempotent, returns existing ID if found
- `public.auto_resolve_pipeline_incidents()` created — resolves no_drafts_48h when new drafts exist, resolves no_posts_48h when posts published. Cron #63, every 30 min.
- `public.bulk_resolve_stale_incidents()` created — used to bulk-clear 52 stale incidents on 17 Apr
- 52 stale incidents resolved immediately

---

## D128 — Token Expiry Badge Fix
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief C)

**Root cause:** 12 of 14 publish profiles have `token_expires_at = NULL` — Instagram, LinkedIn, YouTube don't return expiry dates from their APIs. Dashboard was showing amber "expiry unknown" which implies actionable warning.

**Fix:** NULL + has token → grey "Expiry not tracked" badge with tooltip. Only NY Facebook (31 May) and PP Facebook (14 Jun) show actual expiry dates with colour-coded urgency (green > 30d, amber 14-30d, red < 14d).

---

## D129 — Pipeline Health Card on Overview
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief B)

**Decision:** Surface Pipeline AI summary from /pipeline-log directly onto Overview page as a collapsible card. Queries m.ai_diagnostic_report latest row. Shows health score badge, AI narrative (truncated 3 sentences, expand toggle), amber action box if action_item exists, link to full diagnostics page. Compresses daily workflow from 5 pages to 2.

---

## D130 — Collapse Engagement Tables Behind Dev-Tier Banner
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

**Decision:** Performance → Engagement tab: when dev tier banner active, hide "Performance by format" and "Posts ranked by reach" tables (data is meaningless at reach 1-2). Replace with single line: "Full post-level data will appear here once Meta Standard Access is approved." Summary stat cards remain visible.

---

## D131 — Sidebar Reorganisation
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

**Decision:** Performance + AI Costs moved from CONTENT → MONITOR. Compliance moved from CONFIGURATION → MONITOR. CONTENT now contains only: Content Studio, Visuals. Routes unchanged — navigation only.

---

## D132 — Clickable Overview Stat Cards
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

**Decision:** Published today + Overdue queue → /queue. Stuck jobs + Open incidents → /monitor. Hover: cyan border + shadow.

---

## D133 — Cost Page Projections
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief B)

**Decision:** Two new stat cards on AI Costs page: (1) Projected monthly total = (cost so far / days elapsed) × days in month. Shows "Insufficient data" if < 3 days elapsed. (2) Cost per post = total cost / posts published this month. Grid changed from 4 to 3 columns, 2 rows of 3.

---

## D134 — Onboarding Moved to Clients Tab
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief C)

**Decision:** Onboarding removed from sidebar Configuration section. Added as 9th tab in Clients page, renders existing OnboardingPage component inline. /onboarding route preserved.

---

## D135 — Pipeline Selection Gap Fixed
**Date:** 17 April 2026 | **Status:** ✅ FIXED (migration)

**Root cause:** `populate_digest_items_v1` (planner) creates digest items as `selection_state = 'candidate'`. `seed_and_enqueue_ai_jobs_v1` requires `selection_state = 'selected' AND bundled = true`. Nothing was promoting candidates to selected — the old bundler Edge Function's selection step was dropped when the planner was introduced. Gap open since 13 April 2026. 4+ days of content stalled.

**Fix applied:**
- `public.select_digest_candidates()` SECURITY DEFINER function — promotes eligible candidates (body_fetch_status = 'success', last 7 days) to selected + bundled = true
- `digest-selector-every-30m` cron #62 — runs every 30 min permanently
- 550 candidates promoted immediately on 17 Apr. Pipeline unblocked.
- 20 active ai_jobs, 10 new drafts generated within first hour.

---

## D136 — Schedule Grid Icon Fix
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

**Decision:** Schedule tab platform icons were cramped at viewport width. SVG icons enlarged (w-3/h-3 → w-4/h-4 min-w-[16px]), button size increased, column min-width 72px → 90px, gap increased with flex-nowrap. Container already had overflow-x-auto.

---

## D137 — Onboarding Run Scans + Activation Flow
**Date:** 17 April 2026 | **Status:** 🔲 Brief E (Claude Code)

**Decision:** Build the missing operator onboarding workflow:

1. **Run Scans button** — triggers brand-scanner + ai-profile-bootstrap Edge Functions sequentially from the operator onboarding panel. Both take `{ submission_id }`. Brand-scanner scrapes website for logo/colours and writes to `form_data.brand_scan_result`. AI-profile-bootstrap scrapes website + Facebook via Jina, calls Claude to generate persona/brand_voice/style_notes/system_prompt, writes to `form_data.ai_profile_scan_result`.

2. **Scan Results panel** — displays after scans run: logo thumbnail, colour swatches (primary/secondary/accent), confidence %, AI persona description, brand voice tags, profession slug, collapsible system prompt.

3. **Activate Client button** — calls `public.activate_client_from_submission(submission_id, client_id)` which reads scan results from form_data and writes to c.client_brand_profile. Sets submission status to 'approved'.

**Backend function applied:** `public.activate_client_from_submission(UUID, UUID)` — migration applied 17 Apr. Maps brand_scan_result → brand colours/logo. Maps ai_scan_result → persona, brand_voice_keywords, brand_identity_prompt (system prompt). Sets submission to approved.

**Checklist items made dynamic:** brand scan ✅/❌ and AI profile scan ✅/❌ now read from form_data in real time.

---

## D138 — YouTube Discovery Route in Feed Discovery Pipeline
**Date:** 17 April 2026 | **Status:** 🔲 Planned — Phase 3

**Decision (design):** Extend `feed-discovery` Edge Function to support a third seed_type: `youtube_keyword`. When a seed has this type, the function routes to the YouTube Data API (search.list, type=channel) instead of RSS.app, preserving RSS.app quota.

**Architecture:**
```
seed_type = 'url'             → RSS.app API (existing)
seed_type = 'keyword'         → RSS.app API (existing)
seed_type = 'youtube_keyword' → YouTube Data API search (new route)
```

**YouTube route:**
- Calls YouTube Data API search.list with `q={seed_value}`, `type=channel`, `regionCode=AU`
- Uses ICE_YOUTUBE_DATA_API_KEY (already in vault)
- Returns channel IDs from search results
- Inserts each channel as `source_type_code = 'youtube_channel'` in f.feed_source
- Config: `{ "channel_id": "UCxxxxxx", "channel_name": "...", "max_videos_per_run": 5 }`
- Uses existing YouTube public RSS: `https://youtube.com/feeds/videos.xml?channel_id={ID}`
- ingest-worker already handles youtube_channel type — no changes needed there

**Why separate from RSS.app:**
- RSS.app keyword search finds web articles, not YouTube channels
- RSS.app Pro has monthly operation limits — no point burning them on YouTube discovery
- YouTube Data API has its own quota (10,000 units/day free) — completely independent

**To add YouTube discovery seeds:**
```sql
INSERT INTO f.feed_discovery_seed
  (seed_type, seed_value, region, vertical_slug, label)
VALUES
  ('youtube_keyword', 'NDIS Australia occupational therapy', 'AU', 'ndis', 'YT: NDIS OT channels'),
  ('youtube_keyword', 'Australian property investment 2026',  'AU', 'property', 'YT: AU property channels');
```

**Build when:** Phase 3 — after current onboarding and dashboard work is stable.

---

## Decisions Pending

| Decision | Context | Target |
|---|---|---|
| D137 — Onboarding Run Scans + Activate | Brief E (Claude Code) — ready to paste | Next Claude Code session |
| D138 — YouTube discovery route | Extend feed-discovery with youtube_keyword seed_type | Phase 3 |
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
| Confirm TBC subscription costs | Vercel, HeyGen, Claude Max, OpenAI — update subscription register | Next session |
| Voice & Formats prompt length fix | Add 250-word constraint to NY + PP prompts — fixes 0% auto-approver | Immediate |
