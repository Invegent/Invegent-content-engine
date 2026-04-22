# ICE — Platform Format Mix Defaults Research

**Document purpose:** Populate the seed data for `t.platform_format_mix_default`, the industry-researched baseline that tells the D144 Signal Router what share of each platform's publishing slots should be filled by which format.

**Date:** 22 April 2026
**Research scope:** 5 primary sources analysed, covering 45M+ posts across Buffer's dataset plus industry-specific Hootsuite, Rival IQ, Socialinsider, and YouTube platform data.

---

## Executive Summary

A well-researched default mix exists for every platform ICE publishes to. The data is clear enough that we can propose a single universal defaults table that every new client inherits on day one, without waiting for their own performance data.

**Key findings that shape the defaults:**

1. **Facebook is format-agnostic** — images, video, and text all fall within one percentage point of each other (Buffer, 45M+ posts). The mix should be balanced, not dominated by one format.
2. **Instagram carousels outperform everything** on engagement (6.9% vs reels at 3.3%) — but reels reach 2.25× more people. The mix needs both.
3. **LinkedIn carousels dominate** at 21.77% engagement, 196% more than video and 585% more than text-only. Carousels get the largest share.
4. **YouTube is Shorts-only** for ICE today (only `video_short_*` formats are buildable). 100% video.
5. **Industry-specific nuances exist** but point in the same direction — carousels on IG, albums/photos on FB, photo/video on LinkedIn hold across nonprofits, healthcare, financial services.

Recommendation: populate one table with universal defaults based on Buffer's dataset as primary, with Hootsuite industry data as sanity-check. Per-client overrides populate later when performance data demands it.

---

## The Mix at a Glance

The full defaults, visualised as a matrix. Each column sums to 100. A dash means the format is not used for that platform.

| Format | Facebook | Instagram | LinkedIn | YouTube |
|---|---:|---:|---:|---:|
| `text` | 20 | — | 20 | — |
| `image_quote` | 30 | 20 | 15 | — |
| `carousel` | **25** | **30** | **40** | — |
| `animated_text_reveal` | 5 | 5 | — | — |
| `animated_data` | — | 10 | — | — |
| `video_short_kinetic` | 10 | 20 | 15 | 30 |
| `video_short_kinetic_voice` | 10 | — | — | **25** |
| `video_short_stat` | — | — | — | 20 |
| `video_short_stat_voice` | — | 15 | 10 | 15 |
| `video_short_avatar` | — | — | — | 10 |
| **Total** | **100** | **100** | **100** | **100** |

Bold = dominant format for that platform.

**Quick read:**
- Carousel is the heavy hitter on three platforms (FB 25%, IG 30%, LI 40%)
- Facebook is the most spread — six formats in play
- Instagram leans visual — no text at all, heavy on carousel + reels + images
- LinkedIn has only five formats, carousel-dominant with text as second voice
- YouTube is all video variants (only `video_short_*` formats are buildable)

---

## Method

Research question: *For each platform ICE publishes to, what share of publishing slots should be allocated to which format, based on published industry performance data?*

Sources evaluated:

| Source | Dataset | Relevance | Methodology |
|---|---|---|---|
| Buffer "Best Content Format on Social Platforms in 2026: 45M+ Posts Analyzed" | 45M+ posts across 8 platforms | Primary — largest, most recent, format-level resolution | Median engagement rate per format, native analytics |
| Hootsuite 2026 Social Media Benchmarks | Industry-specific data across 20+ industries | Secondary — industry-adjacent vertical matches | Average per-post engagement rates |
| Rival IQ 2025 Industry Benchmark Report | 4M+ posts, 9B interactions, 14 industries | Secondary — cross-industry comparison | Median interactions ÷ followers |
| Hootsuite healthcare benchmarks 2025 | Healthcare, pharma, biotech | Vertical match for NDIS | Industry-specific engagement |
| Multiple YouTube Shorts sources | 200B+ daily views, 2025 data | Primary for YouTube | Aggregate platform stats |

**Methodology caveat worth naming:** engagement rate measurement varies significantly between sources — Rival IQ uses interactions ÷ followers, Hootsuite uses average per-post, Buffer uses median engagement rate. Absolute numbers can't be compared across sources, only within. For the defaults, we use **relative performance between formats on the same platform** as the reliable signal, not absolute rates.

**What we're NOT doing:** we're not setting absolute engagement targets. We're setting *share of slots*. The question is "of 5 FB slots per week, how should they be distributed across formats?" — not "what engagement rate is this format expected to hit?"

---

## Findings by Platform

### Facebook

**Buffer 2026 (primary, 45M+ posts):**
- Images: 5.20% (winner)
- Video: 4.84% (-7% vs images)
- Text: 4.76% (-9% vs images)
- Links: 4.43% (last)

Observation: the race is tight. All formats within ~15% of each other. No single format dominates.

**Industry cross-check:**

| Industry | Best FB format | Engagement rate | Source |
|---|---|---|---|
| Nonprofit | Albums | 2.36-3.0% | Hootsuite 2026 |
| Healthcare | Albums | 3.8% | Hootsuite 2025 |
| Financial Services | Albums | 2.4% | Hootsuite 2026 |
| Education | Albums | N/A% | Hootsuite 2026 |
| General (nonprofits charity) | Video (short-form clips) | N/A | Socialinsider 2025 |

Consistent signal across verticals: **"albums" (Hootsuite's term for multi-image posts) consistently perform best industry-by-industry, but Buffer's general dataset shows single images edge albums out.**

Resolution: ICE doesn't have a distinct "album" format — its closest equivalents are `image_quote` (single image) and `carousel` (multi-image). Carousels on FB perform strongly per Hootsuite; images perform strongly per Buffer. Both deserve meaningful share.

**Proposed FB mix (shares must sum to 100):**

| ICE format | Share | Rationale |
|---|---|---|
| `image_quote` | 30% | Highest Buffer engagement; strong for stat-anchored content |
| `carousel` | 25% | Hootsuite industry favourite; multi-point educational content |
| `text` | 20% | Close-third engagement; conversational, news-reaction, community-building voice |
| `video_short_kinetic` | 10% | Short-form video on FB performs well (4.84%); Meta pushing video |
| `video_short_kinetic_voice` | 10% | Voice adds retention; stat reveals particularly effective |
| `animated_text_reveal` | 5% | Differentiator; low-cost visual variation |

For a client with 5 FB slots/week, this yields approximately: 2 image_quote, 1 carousel, 1 text, 1 video (rotating variants), with animated_text_reveal appearing roughly once every 4 weeks.

---

### Instagram

**Buffer 2026 (primary):**

Engagement rate (as % of reach):
- Carousels: 6.9% (winner)
- Stories: 5.1% (small sample n=520 — caveat)
- Single images: 4.4%
- Reels: 3.3%

**BUT reach picture inverts this:**
- Reels reach 2.25× more people than single-image posts
- Reels reach 1.36× more people than carousels

Source note: Buffer explicitly frames this as *"Instagram is two different platforms in one"* — reels for discovery, carousels for engagement. Both matter; any mix that ignores either is wrong.

**Industry cross-check:**

| Industry | Best IG format | Engagement | Source |
|---|---|---|---|
| Nonprofit | Carousels | 5.5% | Hootsuite 2026 |
| Healthcare | Carousels | 4.5% | Hootsuite 2025 |
| Financial Services | Carousels | 4.1% | Hootsuite 2026 |
| Education | Carousels (2× Reels engagement) | N/A | Hootsuite 2025 |

**Carousels dominate engagement across every industry checked.** No exceptions.

**Proposed IG mix:**

| ICE format | Share | Rationale |
|---|---|---|
| `carousel` | 30% | Engagement leader across all industries; Buffer + Hootsuite agree |
| `video_short_kinetic` | 20% | Reels-style kinetic content; reach optimiser |
| `video_short_stat_voice` | 15% | Reels with voiceover; stronger retention per YouTube Shorts data |
| `image_quote` | 20% | Solid performer (4.4% per Buffer); low production cost |
| `animated_data` | 10% | Scroll-stopping for stat-heavy signals; differentiator |
| `animated_text_reveal` | 5% | Low-cost visual variation |

For 5 IG slots/week: approximately 2 carousel, 1 video (rotating), 1 image_quote, 1 animated. Roughly balances engagement (carousel heavy) and reach (video-short heavy at 35% combined).

---

### LinkedIn

**Buffer 2026 (primary):**
- Carousels (document posts): **21.77%** — 196% more than video, 585% more than text
- Videos: 7.35%
- Images: 6.52%
- Links: 3.81%
- Text: 3.18%

The gap is massive. LinkedIn carousels are the single highest-performing format across all platforms in Buffer's entire dataset. 21.77% on LinkedIn is exceptional for any platform.

**Industry cross-check:**

| Industry | Best LI format | Engagement | Source |
|---|---|---|---|
| Nonprofit | Photos | 3.4% | Hootsuite 2026 |
| Healthcare | Photos/videos | N/A | Hootsuite 2025 |
| Financial Services | Photos, videos (tied) | 3.3% | Hootsuite 2026 |
| Technology | Videos | 3.9% | Hootsuite 2026 |

Industry-specific data doesn't break out "document posts" separately, which likely explains why photos/videos win in the narrower slices. But Buffer's 45M+ general dataset shows carousels dominate when they're distinguished as a format.

**Context from LinkedIn itself:** their Head of Premium Content & Community Strategy told Buffer, *"Video, Video, Video, Video"* when asked for growth advice. The platform algorithm is pushing video. So even with carousels winning engagement, video deserves share for reach/discoverability (same dynamic as IG Reels).

**Proposed LinkedIn mix:**

| ICE format | Share | Rationale |
|---|---|---|
| `carousel` | 40% | 21.77% engagement dominates; highest of any format on any platform |
| `text` | 20% | LinkedIn's native voice; thought-leadership content; lower engagement but core to credibility |
| `image_quote` | 15% | Solid 6.52% engagement; stat-snippet-style content |
| `video_short_kinetic` | 15% | LinkedIn is algorithmically pushing video; reach optimiser |
| `video_short_stat_voice` | 10% | Voice adds authority; analytical content |

For 5 LI slots/week: 2 carousel, 1 text, 1 image_quote, 1 video (rotating). Carousel-heavy but not dominant enough to become monotonous.

---

### YouTube (Shorts)

YouTube's current scope in ICE is Shorts-only. All `video_short_*` formats are buildable; `video_long_*` formats are `is_buildable = false` in `t.5.3_content_format`.

**YouTube Shorts data (2025-2026):**
- Average engagement rate: **5.91%** — highest of any short-form platform
- 200B+ daily views (up from 70B in March 2024)
- 72% of YouTube users watch Shorts weekly
- Videos under 25 seconds = 68% of all views
- Best completion rate: 50-60 second Shorts at 76%
- Channels using Shorts + long-form grow 41% faster than long-form only

For ICE, the question is which *short format* to publish, not whether to publish video. All 5 weekly YouTube slots are Shorts by definition.

**Proposed YouTube mix:**

| ICE format | Share | Rationale |
|---|---|---|
| `video_short_kinetic` | 30% | Most versatile buildable short format; text-forward |
| `video_short_kinetic_voice` | 25% | Voice adds retention; hook-payoff structure benefits from narration |
| `video_short_stat` | 20% | Data-heavy signals translate to stat reveals; highly shareable |
| `video_short_stat_voice` | 15% | Stat + voice combines strongest elements |
| `video_short_avatar` | 10% | HeyGen-rendered avatar content; differentiator; requires avatar consent flow |

For 5 YouTube slots/week: rough mix of 2 kinetic, 1 voice, 1 stat, 1 stat+voice. Avatar appears approximately every 2 weeks.

**Caveat:** the avatar format requires signed client consent per `c.client_avatar_profile.consent_signed_at`. For clients without consent, the 10% avatar share redistributes proportionally into the other video formats. This is a downstream routing concern, not a policy-table concern.

---

## The Proposed Defaults Table

Single new table: `t.platform_format_mix_default`.

Schema:

```sql
CREATE TABLE t.platform_format_mix_default (
  platform            text NOT NULL,
  ice_format_key      text NOT NULL,
  default_share_pct   numeric(5,2) NOT NULL CHECK (default_share_pct >= 0 AND default_share_pct <= 100),
  evidence_source     text NOT NULL,
  evidence_note       text,
  effective_from      date NOT NULL DEFAULT CURRENT_DATE,
  superseded_by       uuid,
  is_current          boolean NOT NULL DEFAULT true,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (platform, ice_format_key, effective_from),
  FOREIGN KEY (ice_format_key) REFERENCES t."5.3_content_format"(ice_format_key)
);

-- Per-platform sum-to-100 check
CREATE CONSTRAINT TRIGGER check_platform_mix_sums_100 ...
  -- (validation: SUM(default_share_pct) WHERE is_current = true must = 100 per platform)
```

Versioning rationale: when the research data updates (new Buffer/Hootsuite annual report), we insert new rows with a new `effective_from` date, set `superseded_by` on the old rows, and flip `is_current` without losing history. Same pattern as `c.service_package`.

**Seed data — all 23 rows:**

```sql
INSERT INTO t.platform_format_mix_default
  (platform, ice_format_key, default_share_pct, evidence_source, evidence_note)
VALUES
  -- Facebook (5 rows, sums to 100)
  ('facebook', 'image_quote',                30, 'Buffer 2026 (45M+ posts)',       'Images lead FB engagement at 5.20% median'),
  ('facebook', 'carousel',                   25, 'Hootsuite 2026 industry data',   'Albums/carousels top industry performance'),
  ('facebook', 'text',                       20, 'Buffer 2026',                    'Text at 4.76%, close third; conversational voice'),
  ('facebook', 'video_short_kinetic',        10, 'Buffer 2026 + Meta guidance',    'Video at 4.84%; Meta algorithm pushes video'),
  ('facebook', 'video_short_kinetic_voice',  10, 'YouTube Shorts data extrapolated','Voice adds retention; reuses kinetic asset'),
  ('facebook', 'animated_text_reveal',        5, 'Internal judgement',             'Differentiator; low volume'),

  -- Instagram (6 rows, sums to 100)
  ('instagram', 'carousel',                  30, 'Buffer 2026 + Hootsuite',        'Carousels at 6.9% lead engagement across all industries'),
  ('instagram', 'video_short_kinetic',       20, 'Buffer 2026 reach analysis',     'Reels get 2.25x reach of single-image posts'),
  ('instagram', 'video_short_stat_voice',    15, 'YouTube Shorts data',            'Voice reels drive retention'),
  ('instagram', 'image_quote',               20, 'Buffer 2026',                    'Single images at 4.4%; low production cost'),
  ('instagram', 'animated_data',             10, 'Internal judgement',             'Stat-heavy signals benefit from animated reveal'),
  ('instagram', 'animated_text_reveal',       5, 'Internal judgement',             'Scroll-stopping visual variation'),

  -- LinkedIn (5 rows, sums to 100)
  ('linkedin', 'carousel',                   40, 'Buffer 2026 (dominant)',         'Document posts at 21.77% — highest format on any platform'),
  ('linkedin', 'text',                       20, 'LinkedIn native voice',          'Thought leadership; native format despite 3.18% engagement'),
  ('linkedin', 'image_quote',                15, 'Buffer 2026',                    'Images at 6.52%; stat-snippet content'),
  ('linkedin', 'video_short_kinetic',        15, 'LinkedIn platform guidance',     'LinkedIn algorithmically pushing video per Head of Content Strategy'),
  ('linkedin', 'video_short_stat_voice',     10, 'Buffer 2026',                    'Videos at 7.35%; voice adds authority'),

  -- YouTube (Shorts only, 5 rows, sums to 100)
  ('youtube', 'video_short_kinetic',         30, 'YouTube Shorts 2025 data',       'Most versatile buildable short format'),
  ('youtube', 'video_short_kinetic_voice',   25, 'YouTube Shorts retention data',  'Voice adds retention; 76% completion at 50-60s'),
  ('youtube', 'video_short_stat',            20, 'YouTube Shorts 2025 data',       'Data reveals highly shareable; first-second hook critical'),
  ('youtube', 'video_short_stat_voice',      15, 'YouTube Shorts data',            'Stat + voice combines strongest retention signals'),
  ('youtube', 'video_short_avatar',          10, 'Internal judgement',             'HeyGen avatar; requires client consent; differentiator');
```

Validation: each platform sums to exactly 100. All `ice_format_key` values exist in `t.5.3_content_format` and are marked `is_buildable = true`.

---

## Vertical Adjustments (For Future Consideration, Not Now)

The research surfaced some vertical nuances that don't warrant different universal defaults today but are worth recording for future calibration:

**NDIS / Healthcare / Nonprofit vertical — possible adjustments:**
- Facebook albums outperform single images in these verticals (Hootsuite). May justify bumping `carousel` share up 5 points and `image_quote` down 5 on FB for these clients.
- LinkedIn photos outperform videos in nonprofits/healthcare. May justify bumping `image_quote` share up and `video_*` share down by ~5 points on LI for these clients.
- Instagram carousel dominance is even stronger in nonprofits (5.5% vs 3.3% baseline). May justify bumping `carousel` share to 35%.

**Property / Financial Services vertical — possible adjustments:**
- LinkedIn videos perform equally to photos in FinServ, unlike the general bias toward photos. May justify bumping `video_*` share up ~5 points on LI for these clients.
- FinServ Instagram rewards high posting frequency (26/week) — but this is a schedule density question, not a format-mix question.

**When to populate vertical overrides:** after 60 days of `m.post_performance` engagement data (Phase 2.1 dependency). Per-client override table `c.client_format_mix_override` (created alongside the defaults table — empty on day one for every client) populates organically when client-specific performance diverges from defaults by >20% for a given format.

**Explicit decision:** NOT adding vertical-level defaults to the initial table. Universal defaults for all clients is simpler, defensible, and sufficient for MVP. Per-client overrides from performance data is the path to specialisation, not vertical presets.

---

## Known Gaps & Future Work

**Gaps in this research:**

1. **No Instagram Stories in the proposed mix.** Buffer's data shows 5.1% engagement but small sample (n=520). Stories are ephemeral (24h lifespan) which doesn't map cleanly to scheduled slot-based publishing. Revisit when ICE's publishing layer supports Stories natively.

2. **No TikTok.** Not in ICE's current publisher roster. Not a gap if TikTok is never added; revisit when it is.

3. **No Facebook Reels separately.** Facebook Reels exist as a format but are lumped under general "video" in most research. Buffer treats FB video as one bucket. ICE's `video_short_*` formats all publish to FB feed as video — the Reels-specific surface is a future consideration.

4. **Sample size on `animated_*` formats is small.** No major benchmark source reports on animated GIF-style content separately from static images or video. The 5-10% share is an internal judgement — treat as tentative and validate against real performance data.

5. **Engagement vs. reach trade-off not explicitly modelled.** The current mix balances both qualitatively. A future enhancement could split the mix into `reach_optimised_share` and `engagement_optimised_share` for more surgical allocation.

**Future work triggered by this research:**

1. ~~**Populate `t.platform_format_mix_default` table**~~ — **SHIPPED 22 Apr evening.** Table + 23 seed rows + validation view (`t.platform_format_mix_default_check`) applied to production via migration `create_platform_format_mix_default_d145_seed`. Accompanied by `c.client_format_mix_override` (empty) and `m.build_weekly_demand_grid(p_client_id, p_week_start)` SQL function (migration `create_client_format_mix_override_and_demand_grid_router`). See D167 in `docs/06_decisions.md`.

2. **D145 benchmark table separately.** This research document is the D145 benchmark input. D145 creates `t.platform_format_benchmark` holding content_type × format engagement predictions (stat_heavy → image_quote: 4.2% expected), which is the *matching* layer data, different from the *mix defaults* layer. Still deferred — gated on D143 classifier.

3. **Quarterly refresh cycle.** Industry benchmarks shift. New Buffer/Hootsuite/Rival IQ annual reports drop every 6-12 months. Propose: schedule a `t.platform_format_mix_default` refresh review every 6 months, with versioning support in schema preserving history.

4. **A/B testing infrastructure.** Once `m.post_performance` is populated, compare client-specific format engagement against these defaults. If a client's `image_quote` engagement consistently outperforms their `text` engagement by >50% of the ratio in the defaults table, that's evidence to override.

---

## Sources

1. **Buffer, "Best Content Format on Social Platforms in 2026: 45M+ Posts Analyzed"** (March 2026). Median engagement rates per format per platform. https://buffer.com/resources/data-best-content-format-social-media/

2. **Hootsuite, "Social Media Benchmarks: 2026 Data + Tips"** (March 2026). Industry-specific engagement by format. https://blog.hootsuite.com/social-media-benchmarks/

3. **Hootsuite, "Healthcare Social Media Benchmarks: 2025 Research"** (April 2025). Healthcare/pharma/biotech vertical specifics. https://blog.hootsuite.com/healthcare-social-media-benchmarks/

4. **Hootsuite, "Social Media Benchmarks for Financial Services: 2025 Update"** (April 2025). FinServ-specific format performance. https://blog.hootsuite.com/social-media-benchmarks-for-financial-services/

5. **Hootsuite, "Government Social Media Benchmarks: 2026 Update"** (March 2026). Government sector proxy for NDIS program context. https://blog.hootsuite.com/government-social-media-benchmarks/

6. **Rival IQ, "2025 Social Media Industry Benchmark Report"** (February 2025). 4M+ posts, 14 industries. https://www.rivaliq.com/blog/social-media-industry-benchmark-report/

7. **Socialinsider, "Social Media Benchmarks for the NGO & Charity Industry"** (July 2025). Nonprofit format-specific breakdown. https://www.socialinsider.io/social-media-benchmarks/ngo-charity

8. **AllOutSEO, "YouTube Shorts Statistics 2025"** (September 2025). YouTube Shorts engagement and growth data. https://alloutseo.com/youtube-shorts-statistics/

9. **Loopex Digital, "YouTube Shorts Statistics 2026"** (January 2026). Shorts engagement rates and platform comparisons. https://www.loopexdigital.com/blog/youtube-shorts-statistics

10. **Zebracat, "100+ YouTube Shorts Statistics: 2025 List"** (March 2025). Shorts production and consumption patterns. https://www.zebracat.ai/post/youtube-shorts-statistics
