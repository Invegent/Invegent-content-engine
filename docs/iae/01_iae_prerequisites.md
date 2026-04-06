# IAE — Prerequisites Before Any Build

**Status:** Not building. This document defines what must be true
before any IAE build decision is made.

---

## The Gate — Non-Negotiable

IAE build decision requires ALL of the following to be true simultaneously.
Not most of them. All of them.

---

## Prerequisite 1 — ICE Phase 1 Complete

**What it means:**
- Auto-approver running, less than 2 hours/week manual review
- Both clients publishing 5+ posts/week for 4 consecutive weeks
- Feed success rate above 50% across active feeds
- Dashboard stable for daily use

**Why it gates IAE:**
ICE failing costs a client a missed post.
IAE failing costs a client real money — their ad budget.
The operational foundation must be solid before financial liability is introduced.

**Current status:** In progress. Not complete.

---

## Prerequisite 2 — Meta Standard Access Confirmed

**What it means:**
- App Review approved
- Standard Access graduation confirmed (~1,500 successful API calls in 15 days)
- Pages Management permissions live for production use
- Ads Management permissions included (ads_management, ads_read, pages_manage_ads)

**Why it gates IAE:**
Development tier access is explicitly not permitted for third-party client
page boosting. Running ads on client accounts without Standard Access
is a policy violation that can get the entire app suspended.

**Current status:** App Review in progress. Business verification In Review.

---

## Prerequisite 3 — Facebook Insights Back-Feed Live

**What it means:**
- Phase 2.1 complete
- m.post_performance table populated with real engagement data
- insights-worker running daily
- Boost candidate scoring logic has real data to work with

**Why it gates IAE:**
The boost decision reads from m.post_performance.
Without it, IAE is guessing which posts to boost, not deciding.
That removes the entire core advantage of the system.

**Current status:** Phase 2.1 planned but not built.

---

## Prerequisite 4 — Content Format Layer in ICE

**What it means:**
- Five format types defined and prompting (signal_reactive, video_script,
  carousel, community_question, website_traffic)
- format_type field in post draft schema
- Weekly rotation schedule in c.content_format_schedule
- image-worker capable of carousel multi-slide output
- Carousel prompt variant producing slide sequences

**Why it gates IAE:**
IAE's learning loop requires signal variation across format types.
Boosting one implicit format type indefinitely produces one-dimensional learning.
ICE must be producing diverse formats before IAE has meaningful signal to work with.

**Current status:** Not built. Identified in this brainstorm session.

---

## Prerequisite 5 — Audience Infrastructure Live

**What it means:**
- m.audience_asset schema deployed
- c.client_audience_policy schema deployed
- Meta Pixel installed on client website (onboarding step)
- Email capture mechanism on client website (onboarding step)
- insights-worker extended to track Custom Audience sizes via Meta API
- At least one active Custom Audience per client at minimum viable size

**Why it gates IAE:**
Boosting to zero Custom Audience means cold targeting only.
This removes the core advantage — warm audience retargeting at low CPM.
The audience must exist before IAE activates.

**The one build to do now even before IAE decision:**
m.audience_asset schema and the audience size tracking extension to insights-worker.
This costs ~1 week of build work and starts tracking audience growth immediately.
By month 6, you have 6 months of audience data to show clients.
That data turns the IAE sales conversation from hypothetical to concrete.

**Current status:** Schema not built. Identified in this brainstorm session.

---

## Prerequisite 6 — Client Demand Validated

**What it means:**
- 2–3 paying ICE clients exist and are stable
- ICE has run for 3+ months for at least one client
- At least two clients have explicitly confirmed they want paid amplification
- Clients understand the distinction between ad spend (their money) and
  management fee (Invegent's fee)

**Why it gates IAE:**
IAE is being built for confirmed demand, not hypothetical demand.
The assumption that ICE clients will want IAE is plausible but unproven.
Ask the question directly. Listen to the answers.
Do not build supply for demand that may not exist in this specific market.

**Current status:** Zero external paying clients.

---

## Prerequisite 7 — Compliance Framework for Paid Content

**What it means:**
- Ad-specific compliance rules added to t.5.7_compliance_rule
- NDIS paid advertising rules under AHPRA guidelines documented
- NDIS Code of Conduct advertising restrictions documented for paid context
- Meta health advertising policies documented
- compliance-reviewer running ad-specific checks on boost candidates
- Human sign-off required on every boost before spend goes live

**Why it gates IAE:**
Organic posts flagged by compliance-reviewer get human review.
Paid ads are under AHPRA + NDIS Code of Conduct + Meta health policies simultaneously.
A policy violation on an organic post is embarrassing.
A policy violation that gets an ad account suspended stops all paid activity
for every client on that account simultaneously.
The compliance gate for paid is stricter than organic — non-negotiable.

**Current status:** Organic compliance framework live (20 rules, 0 HARD_BLOCK on test run).
Paid-specific rules not yet defined.

---

## IAE Build Phases — When Prerequisites Are Met

### Phase A — Meta Boost Only (Phase 3.4 as designed)

Entry point. Already scoped in blueprint. Extension of existing infrastructure.

```
boost-worker Edge Function
  reads m.post_performance → identifies candidates above threshold
  reads c.client_audience_policy → confirms audiences eligible
  reads c.client_publish_profile → boost_budget, boost_targeting, boost_duration
  human approval gate → boost_candidates table
  on approval → Meta Ads API 4-step hierarchy
    Campaign (objective)
    Ad Set (targeting, budget, schedule)
    Creative (reference platform_post_id — carries organic social proof)
    Ad (combine, submit for review)
  writes campaign_id, adset_id, ad_id → m.post_boost
  daily pull from Ads Insights API → m.audience_performance
```

**Estimated build time once prerequisites met:** 2–3 weeks

### Phase B — Audience Activation Layer

Once Phase A is proven and client budgets are flowing.

```
Lookalike creation
  Meta: automated via Ads API when seed exceeds threshold
  Google: email list upload via Customer Match API
  LinkedIn: email list upload via Matched Audiences API

Cross-platform bridging
  Email list export (periodic or cron-triggered)
  Upload to Google Customer Match
  Upload to LinkedIn Matched Audiences
  One audience asset, three platform expressions
```

### Phase C — LinkedIn Referrer Targeting

LinkedIn Sponsored Content targeting support coordinators by job title.
Requires:
- LinkedIn Advertising API access (separate approval)
- Minimum 6 months of LinkedIn organic content before paid
- Clear success metric: referrer relationships formed, not impressions
- Budget modelling: LinkedIn CPCs $8–15, significantly higher than Meta

### Phase D — Google Search

Intent capture for 'NDIS OT Sydney' style searches.
Requires:
- Google Ads API access and developer token
- Conversion tracking on client websites (enquiry form submissions)
- Dedicated landing pages per service type
- AHPRA compliance review of search ad copy

Most complex IAE component. Highest ROI for participant acquisition.
Furthest from current infrastructure. Phase 4+ thinking.

---

## Schema Requirements — IAE-Specific

### New tables in c schema (configuration)

```sql
c.client_audience_policy
  client_id              uuid FK → c.client
  platforms_enabled      text[]     -- ['meta', 'linkedin', 'google']
  audience_types_enabled text[]     -- ['page_engagers', 'video_viewers', 'email_list']
  min_boost_audience_size integer   -- don't boost until this many in pool
  email_capture_enabled  boolean
  lookalike_auto_create  boolean

c.content_format_schedule
  client_id              uuid FK → c.client
  day_of_week            integer    -- 1=Monday to 7=Sunday
  format_type            text       -- signal_reactive | video_script | carousel |
                                   --   community_question | website_traffic
  audience_goal          text       -- credibility | video_viewers | post_savers |
                                   --   social_proof | pixel_retargeting

c.prompt_template
  template_id            uuid PK
  format_type            text
  prompt_text            text
  model                  text
  client_scope           text[]     -- null = all clients
  version                integer
  active                 boolean
```

### New tables in m schema (facts)

```sql
m.audience_asset
  audience_id            uuid PK
  client_id              uuid FK → c.client
  platform               text       -- meta | linkedin | google
  audience_type          text       -- page_engagers | video_viewers | post_savers |
                                   --   website_visitors | email_list | lookalike
  seed_audience_id       uuid FK → m.audience_asset  -- self-referential for lookalikes
  size                   integer    -- current member count
  min_viable_size        integer    -- when is it usable for IAE
  platform_audience_id   text       -- Meta/LinkedIn/Google's own ID
  boost_eligible         boolean
  last_refreshed_at      timestamptz
  created_at             timestamptz
  status                 text       -- active | building | insufficient | archived

m.audience_performance
  performance_id         uuid PK
  audience_id            uuid FK → m.audience_asset
  post_boost_id          uuid FK → m.post_boost
  impressions            integer
  clicks                 integer
  spend_aud              numeric
  results                integer
  cost_per_result_aud    numeric
  roas                   numeric
  recorded_at            timestamptz

m.platform_health
  health_id              uuid PK
  platform               text
  client_id              uuid FK → c.client
  last_successful_call   timestamptz
  last_error             text
  consecutive_failures   integer
  status                 text       -- healthy | degraded | failed
  checked_at             timestamptz
```

### New views in k schema (intelligence layer)

```sql
k.vw_audience_summary
  -- synthesises m.audience_asset by client
  -- shows what's been built per platform per audience type
  -- includes times_used_in_iae and avg_roas_when_used

k.vw_format_performance
  -- synthesises m.post_performance by format_type
  -- shows which formats drive which audience signals

k.vw_platform_status
  -- synthesises m.platform_health
  -- shows health of every platform integration at a glance

k.vw_client_intelligence
  -- one row per client
  -- everything ICE knows: posts published, avg engagement,
  --   top format, audience sizes per platform, boost candidates pending,
  --   pipeline health, compliance flags open
```

---

## The k Schema Principle — Unchanged

k remains lean. Views not tables. k synthesises, never stores.

The dual nature of audience data:
- **As configuration:** c.client_audience_policy (what to build per client)
- **As fact:** m.audience_asset (what got built, with FK to c.client)
- **As intelligence:** k.vw_audience_summary (what the guru sees)

Guru got smarter. Did not get fatter.

---

*Document created: April 2026*
*Source: brainstorming session — holiday period*
*Status: prerequisites only — no build commitment*
