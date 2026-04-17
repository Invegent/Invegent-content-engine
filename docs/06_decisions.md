# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D100 — See earlier commits

## D101–D125 — See 16 Apr 2026 commits

## D126–D141 — See 17 Apr 2026 commits (pipeline analysis, synthesis decision, demand-aware seeding direction)

---

## D142 — Demand-Aware Seeder
**Date:** 17 April 2026 | **Status:** 🔲 BUILD NEXT SESSION — Phase 2 priority 1

### The problem this solves

`seed_and_enqueue_ai_jobs_v1` runs every 10 minutes and creates 10 seeds regardless of
how many posts any client actually needs. It has no awareness of the publishing schedule,
the current draft queue depth, or weekly demand. Result: 147 drafts generated for NDIS-Yarns
in one week against a 6-post/week schedule. Token waste rate: 93%.

### What demand-aware seeding does

Before creating any seeds, the function calculates per client per platform:

```
slots_this_week   = COUNT of enabled schedule rows for this client+platform
                    (rolling 7-day window from NOW, not calendar week)
                    OR max_per_day × 7 if no schedule exists

already_in_pipeline = COUNT of post_drafts with approval_status IN
                      ('draft','needs_review','approved','scheduled')
                      linked to this client+platform, created in last 7 days
                      PLUS post_publish_queue items not yet published

needed = CEIL(slots_this_week × buffer_factor) - already_in_pipeline

if needed <= 0 → seed nothing for this client this run
if needed > 0  → seed exactly `needed` items for this client
```

**Buffer factor: 1.5**
For a 6-slot/week schedule: target = 9 in pipeline at all times.
The buffer absorbs human rejections. If you reject 3 drafts, the next
seeder run tops up back to 9. No manual intervention needed.

**Rolling 7-day window (not calendar week)**
Avoids a Monday cliff where the weekly counter resets and the seeder floods.
Always looks at "what slots exist in the next 7 days from right now."

**Per platform, not global**
NY has Facebook (6 slots/week) and YouTube (2 slots/week) both active.
Demand calculation runs independently per platform. A YouTube slot deficit
doesn't trigger extra Facebook seeds.

### What stays completely unchanged downstream

| Component | Change? |
|---|---|
| `m.post_seed` schema | No |
| `m.post_draft` schema | No |
| `m.ai_job` schema | No |
| `ai-worker` | No |
| `auto-approver` | No |
| `enqueue-publish-queue` cron | No |
| `publisher` | No |
| Dashboard Inbox | No |
| All publishers (FB/IG/LI/YT/WP) | No |

Only `seed_and_enqueue_ai_jobs_v1` changes. The cron schedule stays the same.

### Signal selection within the demand budget

Once `needed` is calculated, the seeder picks the best `needed` candidates.
Current ordering: `created_at DESC` (newest signal first — recency proxy).
When D140 (scoring) is live, ordering switches to `final_score DESC`.
The seeder takes the top N after ordering — no other selection logic changes.

### Expected outcome

| Client | Before | After | Saving |
|---|---|---|---|
| NDIS-Yarns (6 slots/wk) | 147 drafts/wk | ~9 drafts/wk | 94% |
| Property Pulse (6 slots/wk) | 63 drafts/wk | ~9 drafts/wk | 86% |
| CFW (no active slots yet) | 24 drafts/wk | 0 drafts/wk | 100% |

Token saving translates directly to Claude API cost reduction.
At current pricing: approximately $15-20/month saved at this volume,
scaling to $150-200/month saved at 10 clients.

### Build notes for next session

- Read current `seed_and_enqueue_ai_jobs_v1` function in full before changing
- Add a per-client demand CTE at the top of the function
- Test on one client (NY) before enabling for all
- Verify: after deployment, queue depth for NY stabilises around 9 drafts, not growing
- Do NOT change the cron schedule — every 10 minutes is still correct
- Do NOT change the seeder for Instagram, LinkedIn, YouTube separately —
  when those platforms get active seeds, they inherit the same demand logic

### Gate to build

Pipeline must be stable for 48 hours post D135 fix before this is deployed.
D135 was fixed 17 Apr 2026. Build this in the next session (18 Apr 2026+).

---

## D143 — Signal Content Type Classifier
**Date:** 17 April 2026 | **Status:** 🔲 GATED — build after D142 stable + 60 days insights data

### What this is

A rule-based classifier that runs on each `m.digest_item` at selection time and
assigns a `content_type` label. No AI cost — pure rule evaluation on the text.

### The six content types

| Type | Definition | Indicators |
|---|---|---|
| `stat_heavy` | Content anchored by a specific numeric claim | Number followed by %, $, bps, x, or a unit. RBA rate, property price, funding amount |
| `multi_point` | Content with 3+ distinct structured points or recommendations | List markers, numbered sections, 400+ words with clear structure |
| `timely_breaking` | Published within 24-48 hours, reactive to an event | Recency signal + language like "today", "announced", "just released" |
| `educational_evergreen` | Explanatory, reference, no expiry | "How to", "What is", "Guide to", no date references, 300+ words |
| `human_story` | Personal narrative, case study, community focus | First person language, participant/patient names, "story of" |
| `analytical` | Commentary, opinion, market analysis | Author attribution, expert quotes, hedged language like "suggests", "indicates" |

A signal can have a primary type and a secondary type. Primary drives routing decisions.

### Source type as a confidence prior

The source type modifies classification confidence before content is examined:

| Source type | Prior bias |
|---|---|
| `rss_native` from government | stat_heavy and analytical confidence +20% |
| `rss_native` from industry body | multi_point and educational_evergreen +15% |
| `rss_app` wrapping Facebook page | human_story +20%, stat_heavy -15% |
| `youtube_channel` | multi_point and educational_evergreen +25% |
| `email_newsletter` | analytical and educational_evergreen +20%, quality premium |
| `rss_app` wrapping news site | timely_breaking +20%, stat_heavy +10% |

High confidence classification → router can assign with certainty.
Low confidence → router may assign to text slot (lowest format requirement).

### Schema addition required

```sql
ALTER TABLE m.digest_item
  ADD COLUMN content_type        TEXT,
  ADD COLUMN content_type_confidence NUMERIC(3,2),
  ADD COLUMN content_type_secondary  TEXT;
```

### Where it runs

Option A: Inside `select_digest_candidates()` — classification happens at promotion time.
Option B: Separate `classify-signals` Edge Function called after selection.

Recommendation: Option A. Keeps the pipeline simple. One function, one step.

### Gate to build

- D142 (demand-aware seeder) must be stable
- D140 (scoring) should be live or in progress — classifier output improves scoring
- **Hard gate: 60 days of insights-worker data** — without engagement data,
  cannot validate whether classifier decisions improve post performance.
  Do not build D144 (router) without D143 being validated.

---

## D144 — Signal Router (Platform × Format Matching)
**Date:** 17 April 2026 | **Status:** 🔲 GATED — build after D142 + D143 + D140 + 60 days data

### What this is

The intelligence layer between signal selection and seed creation. Instead of
creating seeds blindly, the router asks per client per week:
"What slots need filling, what format does each slot want, and which signal
fits each slot best?"

### The routing algorithm

```
Step 1 — Build demand grid
  For each client → for each platform → for each enabled format:
    How many slots need filling this week?
  Example for NY:
    Facebook image_quote: 2 slots open
    Facebook text: 3 slots open
    Facebook carousel: 1 slot open
    YouTube video_short_kinetic: 2 slots open

Step 2 — Rank open slots by benchmark value
  Highest-value slots (by expected engagement metric) are filled first.
  A stat-heavy Facebook image_quote benchmarks at 4.2% engagement → filled before
  a Facebook text post at 1.8% baseline.

Step 3 — For each open slot, find best-matched signal
  Match: signal content_type × format content_type affinity × source credibility × final_score
  Pick highest-scoring unassigned signal.
  If no signal matches the optimal type, step down to second-best match.
  If no match found at all, assign text slot (text accepts any signal).

Step 4 — Assign: signal → client → platform → format
  Mark signal as assigned (cannot be used for another slot same client same week).
  One signal fills one slot only.

Step 5 — Create seeds with pre-assigned platform + format
  seed_payload now includes: { platform, format_key, content_type, match_confidence }
  ai-worker reads pre-assigned format → skips format advisory call.
  One Claude call saved per draft (format advisor call eliminated).
```

### The format affinity matrix (summary)

Full matrix stored in `t.platform_format_benchmark`. Summary:

| Content type | Best platform+format |
|---|---|
| stat_heavy | FB image_quote, YT video_short_stat, animated_data |
| multi_point | FB carousel, LI carousel, YT video_short_kinetic |
| timely_breaking | FB text (fastest), IG caption, LI text |
| educational_evergreen | LI carousel, YT explainer, FB carousel |
| human_story | IG reel, FB conversational text, IG image |
| analytical | LI article/text, FB text, LI carousel |

### Token saving from router

Currently: 2 Claude calls per draft (format advisor + content generator)
With router: 1 Claude call per draft (content generator only — format pre-assigned)
Additional saving: 50% reduction in Claude calls on top of D142's demand reduction.
Combined D142 + D144 saving vs today: ~97% reduction in token usage per published post.

### What changes in the ai-worker

When `seed_payload.format_key` is present and non-null:
- Skip `callFormatAdvisor()` entirely
- Use `seed_payload.format_key` as `decidedFormat` directly
- Still run `writeVisualSpec()` with the pre-assigned format
- Still run content generation with format-appropriate prompts

When `seed_payload.format_key` is null (legacy or fallback):
- Current behaviour unchanged — format advisor runs as normal

This is a backwards-compatible change. Existing seeds work unchanged.

### Gate to build

All of the following must be true:
- D142 stable and running for 4+ weeks
- D143 (classifier) built and validated
- D140 (scoring) live — final_score non-zero
- Phase 2.1 (insights-worker) live and collecting data
- 60 days of engagement data from insights-worker
- Benchmark table (D145) populated with research data
- Explicit session decision to proceed after reviewing data

---

## D145 — Platform Format Benchmark Table
**Date:** 17 April 2026 | **Status:** 🔲 RESEARCH PHASE — populate before building D144

### What this is

A static reference table holding industry benchmark engagement metrics per
platform × format × content type combination. The foundation of the routing
decision. Without this, D144 cannot make evidence-based routing decisions.

### Schema

```sql
CREATE TABLE t.platform_format_benchmark (
  benchmark_id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform            TEXT NOT NULL,
  format_key          TEXT NOT NULL,
  content_type        TEXT NOT NULL,
  metric_name         TEXT NOT NULL,  -- engagement_rate | reach_multiplier |
                                      -- retention_rate | impressions_multiplier
  metric_value        NUMERIC(8,4) NOT NULL,
  metric_unit         TEXT NOT NULL,  -- percent | multiplier | seconds
  source_name         TEXT NOT NULL,  -- 'Hootsuite 2025' | 'Sprout Social 2025' etc
  source_url          TEXT,
  source_confidence   TEXT DEFAULT 'medium'
                      CHECK (source_confidence IN ('high','medium','low')),
  published_date      DATE,
  is_active           BOOLEAN DEFAULT true,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### Source credibility hierarchy (dynamic, not hardcoded)

Stored in a separate table so it can be changed without code changes:

```sql
CREATE TABLE t.source_credibility (
  source_id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type         TEXT NOT NULL,  -- matches f.feed_source.source_type_code
  content_origin      TEXT,           -- matches f.feed_source.content_origin
  credibility_tier    INTEGER NOT NULL CHECK (credibility_tier BETWEEN 1 AND 5),
  credibility_label   TEXT NOT NULL,  -- 'authoritative' | 'curated' | 'industry' | etc
  quality_multiplier  NUMERIC(3,2) DEFAULT 1.0,
  notes               TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

Initial credibility tiers (can be updated via dashboard):

| Tier | Label | Examples | Multiplier |
|---|---|---|---|
| 1 | Authoritative | NDIS.gov.au, RBA, DSS, ABS | 1.5 |
| 2 | Curated expert | Industry newsletters, NDIS Commission, Summer Foundation | 1.3 |
| 3 | Industry media | CoreLogic, Mortgage Business, NDS, Inclusion Australia | 1.1 |
| 4 | General news | News aggregators, general property news | 1.0 |
| 5 | Social/community | Facebook-wrapped RSS, community pages | 0.8 |

The `quality_multiplier` modifies how much weight a signal's final_score gets
when routing. A tier-1 signal with score 0.6 routes ahead of a tier-5 signal
with score 0.8 because: 0.6 × 1.5 = 0.9 > 0.8 × 0.8 = 0.64.

### Initial benchmark data to research and populate

Research sources to consult (web search, then populate table):
- Hootsuite Global Social Media Trends Report 2025
- Sprout Social Index 2025
- LinkedIn Marketing Solutions benchmark data
- Meta Business performance benchmarks
- YouTube Creator Academy retention benchmarks
- Rival IQ Social Media Industry Report 2025

Key metrics to capture per platform:
- Facebook: engagement rate by content type and format
- Instagram: reach multiplier for Reels vs static image vs carousel
- LinkedIn: impressions multiplier for carousel vs text vs article
- YouTube Shorts: retention rate by content type (stat reveal vs kinetic text vs explainer)

**This research task can be done independently before any engineering begins.**
Populating the benchmark table requires no code changes to the live system.

### Transition from industry data to own data

Phase 1 (launch, months 0-2): 100% industry benchmarks
Phase 2 (months 2-4): Blend — own data weighted at 30%, industry at 70%
Phase 3 (months 4+): Own data weighted at 70%, industry at 30%
Phase 4 (6+ months, 50+ posts per platform+format): Own data only

Blending formula:
```
effective_rate = (own_weight × own_rate) + (industry_weight × benchmark_rate)
```

Own data comes from `m.post_performance` (Phase 2.1 insights-worker).
The blend weights update automatically as own_data_count crosses thresholds.

---

## D146 — Feed Pipeline Score & Intelligent Retirement
**Date:** 17 April 2026 | **Status:** 🔲 GATED — build after Phase 2.1 + 60 days data

### The problem with current feed retirement

The existing `feed-intelligence` agent retires feeds based on `give_up_rate` only.
Give-up rate is a Stage 2 metric (fetch layer). It tells you whether Jina could
extract the text. It tells you nothing about whether that text was useful.

A feed can have 0% give-up rate (every article fully fetched) and still be
completely useless — if its content never gets selected, or if it produces drafts
that are always rejected, or if posts from it consistently underperform benchmarks.

Conversely, a feed with 40% give-up rate might produce exceptional content on the
60% that does fetch. Retiring it based on give-up alone would be a mistake.

### The five-stage pipeline score

Every feed gets a score composed of five stage metrics, evaluated weekly:

```
feed_pipeline_score =
  (ingest_rate          × 0.10)   -- Stage 1: articles per week vs expected
+ (fetch_success_rate   × 0.15)   -- Stage 2: existing give_up_rate (inverted)
+ (selection_rate       × 0.25)   -- Stage 3: % of fetched items selected to digest
+ (draft_approval_rate  × 0.25)   -- Stage 4: % of drafts approved (auto or manual)
+ (post_performance_vs  × 0.25)   -- Stage 5: actual vs benchmark engagement rate
  benchmark

Score range: 0.0 – 1.0
```

**Stage weights rationale:**
- Stage 1 and 2 are infrastructure failures (low weight) — a quiet source or
  a paywalled source is a problem but not catastrophic. Recovers naturally.
- Stage 3 and 4 are quality failures (high weight) — if content fetches fine
  but never gets selected or approved, the source is irrelevant to the client.
- Stage 5 is outcome failure (high weight) — if posts publish but don't engage,
  the source may be low-credibility or simply wrong for this audience.

### The three retirement states

| State | Condition | Action |
|---|---|---|
| Active | pipeline_score ≥ 0.5 for 2+ weeks | Normal operation |
| Watchlist | pipeline_score < 0.5 for 2 consecutive weeks | Dashboard flag, no auto-action |
| Deprecated | Watchlist for 4+ consecutive weeks, or Stage 2 = 0 for 2 weeks | Stop ingesting |

**The 4-week watchlist buffer is intentional.**
Government feeds go quiet during parliamentary recess. Industry bodies pause
during annual conference periods. A 4-week window prevents premature retirement
of genuinely valuable but temporarily quiet sources.

**Operator override:** You can manually keep a watchlist feed active by
marking it "protected" in the dashboard. Protected feeds never auto-deprecate
regardless of score.

### Benchmark integration in Stage 5

Stage 5 compares actual post engagement against the benchmark for that
platform+format+content_type combination (from D145 benchmark table).

A feed producing stat_heavy signals that become Facebook image_quote posts
should achieve ~4.2% engagement (industry benchmark). If those posts are
averaging 1.5%, the feed pipeline score for Stage 5 drops significantly.

This creates an important diagnostic distinction the current system cannot make:
- Stage 5 failure with correct format assignment → source credibility is the problem
- Stage 5 failure with wrong format assignment → routing is the problem (D144 fix)
- Stage 5 failure with correct format + low source credibility tier → retire the feed
- Stage 5 failure with correct format + high source credibility tier → investigate audience fit

### Dashboard surface

New "Feed Health" tab in the Feeds page showing:
- Pipeline score per feed (gauge or traffic light)
- Stage breakdown (which stage is failing)
- Watchlist list with reason and watchlist_since date
- One-click "Protect from auto-deprecation" toggle per feed
- Historical score trend (last 8 weeks)

### Schema additions required

```sql
ALTER TABLE f.feed_source
  ADD COLUMN pipeline_score         NUMERIC(4,3),
  ADD COLUMN pipeline_stage_scores  JSONB,
  ADD COLUMN watchlist_since        DATE,
  ADD COLUMN is_protected           BOOLEAN DEFAULT false,
  ADD COLUMN last_scored_at         TIMESTAMPTZ;
```

### Gate to build

- Phase 2.1 (insights-worker) must be live and collecting engagement data
- D145 (benchmark table) must be populated
- 60 days of engagement data minimum (Stage 5 cannot be calculated without it)
- D143 (signal classifier) should be live (improves Stage 3 relevance calculation)

---

## D141–D146 — Multi-Perspective Review Summary
**Date:** 17 April 2026

Before committing to D142–D146, a structured review was conducted from five
independent perspectives. Key findings:

**Product Developer:** The format advisor already handles format selection adequately.
The core problem is supply volume, not format mismatch. D142 solves the actual problem.
D143-D146 solve optimisation problems that can't be validated until engagement data exists.

**CTO:** Architecture is sound but must be built sequentially. Six layers on a pipeline
stabilised today creates compounded debugging complexity. Commit to D142 now, D143-D146
conditionally after the 60-day data gate.

**Sales Head:** None of D143-D146 is visible to clients. First client conversation is
gated on proof of results (Phase 2.1 + proof dashboard), not on routing sophistication.
Token efficiency is a cost saving; the first client is a revenue unlock. Prioritise accordingly.

**CEO:** D142 saves ~$15-20/month at current volume. First client at $800/month is
40× more valuable. Build D142 for cost discipline. Build Phase 2.1 for revenue.
Park D143-D146 until 60 days of data exists to inform them with evidence, not theory.

**Auditor:** Five challenged assumptions:
(1) Industry benchmarks may not represent the NDIS/property Australian audience.
(2) Rule-based classifier will have false positives — error rate unknown until tested.
(3) Stage weights in pipeline score are intuitive, not data-derived.
(4) Six-layer system is a significant solo maintenance burden.
(5) Self-calibration (D146 Phase 4) depends on Meta Standard Access, still In Review.

**Agreed conclusion:** Build D142 now. Build Phase 2.1 next. Gate D143–D146 on
60 days of insights-worker engagement data. Do not start D143 before that gate opens.

---

## Decisions Pending

| Decision | Status | Gate |
|---|---|---|
| D142 — Demand-aware seeder | 🔲 Build next session | Pipeline stable 48h post D135 |
| D143 — Signal content type classifier | 🔲 Gated | D142 stable + 60 days data |
| D144 — Signal router (platform × format) | 🔲 Gated | D143 + D140 + D145 + 60 days data |
| D145 — Benchmark table (research + schema) | 🔲 Research now, build with D144 | Can research immediately |
| D146 — Feed pipeline score + retirement | 🔲 Gated | Phase 2.1 + 60 days data |
| D140 — Digest item scoring | 🔲 Phase 3 | After CFW stable + auto-approver healthy |
| Phase 2.1 — Insights-worker | 🔲 Next major build after D142 | Meta Standard Access |
| Phase 2.6 — Proof dashboard | 🔲 After Phase 2.1 | Needs engagement data |
| NDIS Support Catalogue data load | 🔲 Phase 3 | Tables exist |
| Legal review of service agreement | 🔲 Before C1 | Hard gate |
| F1 Prospect demo generator | 🔲 ~mid-June 2026 | 60+ days NDIS Yarns data |
| LinkedIn Community Management API | 🔲 13 May 2026 | Evaluate Late.dev if pending |
| D124 — Boost Configuration UI | 🔲 Phase 3.4 | Meta Standard Access |
| RSS.app discovery dashboard page | 🔲 Phase 3 | No urgency |
| Cowork daily inbox task | 🔲 Phase 4 | Gmail MCP |
| Meta App Review | ⏳ In Review | Contact dev support if stuck after 27 Apr |
| animated_data advisor conflict | 🔲 Immediate | Format Library page fix |
| Assign 12 unassigned feeds to clients | 🔲 Immediate | Via Feeds page |
| CFW content session | 🔲 Next session | Write prompts, tune AI profile |
| Confirm TBC subscription costs | 🔲 Next session | Vercel, HeyGen, Claude Max, OpenAI |
| CFW profession fix | 🔲 Immediate | Change 'other' → 'occupational_therapy' in Profile |
