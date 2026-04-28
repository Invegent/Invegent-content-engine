# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-28 Tuesday morning — **Discovery EF unblocked, CFW pool 2→10, Brief A shipped, Day 1 of Gate B healthy**
> Written by: PK + Claude session sync

---

## 🟢 28 APR TUESDAY MORNING — DISCOVERY UNBLOCKED + AUTO-LINK ARCHITECTURE LOCKED + BRIEF A SHIPPED

### What this session did

A 3-hour morning session that turned a broken overnight discovery cron into a thicker CFW pool, locked in an architectural decision about discovery quality control, and shipped one CC brief end-to-end while doing it.

### Critical state right now

**Track 1 — Gate B observation (Day 1, healthy):**

- Phase B Stages 10-12 still running autonomously in shadow mode
- 70 slots filled, 52 future, 2 failed (both shadow, content-quality issues)
- Pool: 295-304 active rows per NDIS/property vertical, 110 per Invegent vertical
- 95 successful fills last 24h, 25 stuck-job recoveries (auto-recovery cron working), 0 threshold-relaxed fills (no quality compromises)
- Cost: $1.20 USD shadow burn last 24h (~$36/mo run rate, well under $30 Stop 1)
- 32 pre-Gate-B critical alerts acknowledged with audit trail (`pk-via-chat-pre-gate-b-cleanup`) so tomorrow's check starts from clean baseline
- Earliest Gate B exit: Sat 2 May

**Track 2 — Concrete-pipeline (3 stages shipped today):**

- **Section 1 — Discovery & Onboarding** ← Stage 1.1 ✅ (yesterday). Stage 1.2-1.5 still pending. **Brief A (Feeds-tab discovery context) ✅ SHIPPED today**.
- **Section 2 — Publisher Observability** ← Stage 2.1 ✅ (yesterday). Stages 2.2-2.5 pending.

### Today's morning deltas

| Item | Status |
|---|---|
| **V7 — Discovery cron pickup check** | ❌ 9 of 9 seeds failed at 06:00 UTC |
| **Diagnosis: 8 of 9 = function-signature mismatch + latent NOT NULL bug** | ✅ via Supabase MCP pre-flight queries |
| **Migration 005 — 5-param overload of `create_feed_source_rss`** | ✅ APPLIED + committed `95abfa30` |
| **Manual EF retrigger via vault credentials** | ✅ 8 of 9 seeds provisioned (1 legit RSS.app "Feed not found" remains) |
| **Side finding 1: Overload B (6-param) latent NOT NULL bug** | ⚠️ Logged, deferred |
| **Side finding 2: GitHub source vs deployed EF drift (`url:` vs `feed_url:`)** | ✅ Source aligned `d1b6469` (EF unchanged — already correct) |
| **Side finding 3: Migration 005 dedupe used wrong key** | ✅ Fixed in migration 008 (`2f261a4`) |
| **Architectural decision call: auto-link vs review queue** | ✅ Auto-link (D180) |
| **Migration 006 — `tg_auto_link_seed_to_client` trigger + backfill** | ✅ APPLIED + committed `7834d3a` |
| **CFW pool: 2 → 10 active feeds** | ✅ via backfill |
| **Migration 007 — seed label uses seed_value (not hardcoded `'client-onboarding'`)** | ✅ APPLIED + committed `e8a79a8` |
| **Brief A — Feeds tab discovery context + unassigned visibility** | ✅ Written, committed `5c302f5` |
| **CC executes Brief A — 4.1 + 4.2 + 4.3 + 4.4** | ✅ commits `27e83f3`, `f9aac5e`, `a3f392b` to invegent-dashboard main |
| **Brief A V8 production browser test (dashboard.invegent.com/feeds)** | ✅ PK confirmed |
| **Brief A result file** | ✅ CC writing now |
| **Daily Gate B observation sweep** | ✅ Day 1 healthy |
| **32 pre-Gate-B critical alerts acknowledged** | ✅ |
| **D180 added to decisions log** | ✅ commit `023893b` |

### Architecture decision — D180

**Discovery decides assignment, intelligence decides retention.**

When `f.feed_discovery_seed.status` transitions to `'provisioned'` and `client_id IS NOT NULL`, trigger `tg_auto_link_seed_to_client` automatically inserts into `c.client_source` linking the new feed to the requesting client. Idempotent via `ON CONFLICT (client_id, source_id) DO NOTHING`.

Quality control deferred to `feed-intelligence` (deployed v1.0.0, runs weekly) — scores all active feeds, writes recommendations to `m.agent_recommendations` (`type='deprecate'/'review'/'watch'`).

The unassigned bucket on the Feeds tab retains a real purpose:
- Operator-exploration seeds (`client_id IS NULL`)
- Orphaned feeds (operator unlinked all clients but underlying `f.feed_source` row stays alive)
- Operator-added feeds via the global "Add feed" modal not yet assigned

Bucket is now an audit view of "what's running but unused", not a pre-assignment quality gate.

### Production state — refreshed

**Feeds:**
- 68 active feed sources visible on /feeds
- CFW pool: 10 (was 2 before this morning)
- Invegent pool: unchanged (no discovery seeds yet)
- 9 NULL-client operator-exploration seeds remain in unassigned bucket
- 4 non-rss_app rows still without URL (email_newsletter + youtube_channel, out of Brief A scope)

**Brief A surfaced:**
- COALESCE on `feed_url`/`url` config keys → 44 of 48 active feeds now resolve URL
- LATERAL join to `f.feed_discovery_seed` → discovery_seed_value + discovery_client_name on every FeedRow
- Unassigned bucket render upgrade: clickable URL, Auto-discovered badge, "for {client}" chip
- `classifyOrigin(feed)` helper

**Publishing pipeline:**
- All 4 clients publishing on legacy R6 path (verified via 72h `m.post_publish` lookback)
- CFW: 1 FB + 1 LinkedIn post overnight (legacy publisher healthy)
- Invegent: 1 FB + 1 LinkedIn post overnight (legacy publisher healthy)
- NDIS-Yarns + Property Pulse: continuing as before
- R6 still paused on slot-driven path — Gate B observation continues

---

## ⛔ DO NOT TOUCH NEXT SESSION

- All Phase B Gate B items (unchanged from yesterday — Phase B autonomous)
- The newly-enabled CFW + Invegent publishing config (13 client × platform rows)
- The 8 newly-auto-linked CFW feeds in `c.client_source` (let bundler discover them naturally)
- `f.feed_discovery_seed` table — auto-link trigger now lives on this; don't add competing triggers
- Migration 005's wrapper of `create_feed_source_rss` (5-param) — production discovery EF depends on it

---

## 🟡 NEXT SESSION (Tue 28 Apr afternoon OR Wed 29 Apr)

### Carryover from morning

1. **Daily Gate B observation check (~10 min)** — quick repeat of this morning's sweep. Watch for: cost trend (were last 24h sustained?), slot fill recovery rate stable, no new critical alerts beyond the acknowledged 32, ai_job failure rate stays <5%.

2. **Stage 1.2 brief design** — operator-exploration seed handling. Now narrower scope after D180:
   - The remaining unassigned bucket purpose: operator-exploration seeds (NULL client_id), orphaned feeds, operator-added feeds awaiting assignment
   - Brief A Feeds-tab UX upgrade is already done — surfaces seed_value, URL, origin badges
   - Stage 1.2 may not need to be its own stage anymore; consider merging into Stage 2.2 (assigned-but-disabled feed visibility) since both are Feeds-tab UX

3. **Next CC brief — Feeds-tab URL clickability + dual-URL display**:
   - Make assigned-bucket URL clickable (mirror unassigned `<a target="_blank">` pattern)
   - For URL-type seeds, show BOTH the rss.app feed URL AND the original site URL the feed was generated from. Original site URL is in `f.feed_discovery_seed.seed_value` for URL seeds; for keyword seeds only rss.app URL exists.
   - Operator-added rss_app feeds (not from discovery) — only have rss.app URL in current data; backfill via rss.app `/feeds/{id}` API to capture source URL would be nice-to-have.
   - Keep brief small — single CC session.

### Parallel pre-sales work (any time)

- **A6 subscription costs** — DEFERRED per PK's 28 Apr morning call. PK wants to see the product working + have outside conversations before deciding.
- A11b content prompts × 18 rows
- A4→A3 proof doc
- A18 source-less EFs audit

### Stage 2.3 trigger condition

If posts don't flow for CFW or Invegent within 48h **of yesterday's mode=auto flip** (so by ~end of Wed 29 Apr), Stage 2.3 (slot outcome resolver) jumps the queue to give us reason codes per missed slot. Current state: legacy publisher IS producing posts for CFW + Invegent, so this trigger appears NOT activated yet.

### Gate B exit window

- Earliest exit: Sat 2 May
- Conditions: 5-7 days clean shadow data, no critical alerts (other than known acknowledged ones), cost stays under Stop 1 ($30/mo), ai_job failure rate <5%
- If exit goes well: Phase C cutover (Stages 12-18) — production traffic shifts to slot-driven

---

## TODAY'S FINAL COMMITS (28 APR MORNING)

**Invegent-content-engine — `main`:**

- `5c302f5` — docs(briefs): Brief A — feeds tab discovery context
- `95abfa30` — fix(feed-discovery): migration 005, 5-param overload
- `7834d3a` — feat(discovery): migration 006, auto-link client-scoped seeds + backfill
- `e8a79a8` — fix(discovery): migration 007, seed label uses seed_value
- `d1b6469` — fix(feed-discovery): align committed EF source with deployed convention
- `2f261a4` — fix(create_feed_source_rss): migration 008, dedupe key-tolerant
- `023893b` — docs(decisions): D180 — discovery decides assignment, intelligence decides retention
- THIS COMMIT — docs(sync_state): 28 Apr morning close

**invegent-dashboard — `main`:**

- `27e83f3` — feat(feeds): 4.1 COALESCE feed_url|url
- `f9aac5e` — feat(feeds): 4.2 LATERAL discovery join + 3 FeedRow fields
- `a3f392b` — feat(feeds): 4.3 + 4.4 — origin classification + unassigned render upgrade
- (CC will add result file after V8 — likely no dashboard commit)

**Migrations applied this session (4 total):**

- 005 — `create_feed_source_rss(text, text, jsonb, text, text)` 5-param overload
- 006 — `tg_auto_link_seed_to_client` trigger + 8-row backfill
- 007 — `add_client_discovery_seeds` label fix + 9-seed backfill + 8-feed_source rename
- 008 — `create_feed_source_rss` dedupe key-tolerance

**Production state changes:**

- Discovery EF unblocked (was 100% failure since 27 Apr 06:00 UTC discovery cron)
- 8 new RSS.app feeds provisioned + auto-linked to CFW (CFW pool 2 → 10)
- Feed source naming corrected (8 rows renamed from `'client-onboarding'` to seed_value)
- Dashboard /feeds + /clients?tab=feeds now show URLs and discovery context

---

## CLOSING NOTE FOR NEXT SESSION

This was a focused 3-hour morning session that did exactly what good ICE work should do: turn a broken cron into a thicker pool while locking in an architectural pattern that scales beyond this specific case.

**The work split that worked:**

- **Chat lane** (sequential): diagnostics → migrations → architecture decision → daily Gate B obs → docs
- **CC lane** (parallel, briefed): Brief A end-to-end execution while chat did everything else

Both lanes finished with chat sequencing slightly faster than CC. Brief A's V1-V8 cycle is a clean reference for the lane pattern going forward.

**What to bring to next session:**

- Gate B Day 2 obs (~10 min)
- Stage 1.2 brief design — likely merges into Stage 2.2 scope
- Next CC brief — clickable URLs + dual-URL display (small, 1 page)
- Pre-sales register parallel work if energy allows

**State at close (28 Apr ~10:30am Sydney):**

- Phase A + B autonomous, Gate B Day 1 healthy
- Discovery EF working, auto-link trigger live
- CFW pool 10 active feeds (was 2)
- Brief A shipped to dashboard.invegent.com/feeds
- 8 new migrations + 1 EF source change + 4 invegent-dashboard commits + 2 doc commits
- Anthropic cap $200, May 1 reset (3 days), today's burn ~$1.20

**Realistic ambition for next session:** Stage 1.2 design call → next CC brief written → CC executes → Gate B Day 2 obs. Light session by today's standards.

---

## END OF TUESDAY 28 APR MORNING SESSION

Next session: Gate B Day 2 obs + Stage 1.2/2.2 design call + next CC brief.
