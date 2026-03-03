# ICE — Risk Register

## How to Use This Document

This is a living document. Review it monthly. Each risk has:
- **Likelihood** — how probable is this occurring
- **Impact** — how bad if it does occur
- **Trigger** — the specific event that means the risk has materialised
- **Response** — exactly what to do when triggered
- **Mitigation** — what to do NOW to reduce likelihood or impact
- **Status** — current state of the mitigation

A risk with no mitigation in progress is an unacceptable gap.

---

## Risk 1 — Facebook API Dependency
**Category:** Platform / Vendor
**Likelihood:** Medium
**Impact:** Critical — all client publishing stops

**Description:**
ICE's entire publishing operation runs through the Meta Graph API.
A single API policy change, account suspension, rate limit change,
or Meta outage stops all clients from publishing simultaneously.
This has already happened once (error code 368 spam block causing
infinite retry loops). Meta has a history of sudden API changes
with minimal notice.

**Trigger:**
Publishing fails for any client for more than 24 hours due to
a Meta API issue outside our control.

**Response:**
1. Immediately switch affected clients to manual mode in dashboard
2. Notify clients — posts are queued, not lost
3. Diagnose: is it account-level, app-level, or API-wide?
4. If account-level: follow Meta appeal process
5. If API-wide: activate LinkedIn publishing for all clients
6. Post-incident: review exponential backoff and error handling

**Mitigation:**
- Build LinkedIn publisher (Phase 2.3) — reduces to single-platform dependency
- Abstract publish layer so adding platforms takes hours not weeks
- Implement proper exponential backoff on all Meta API calls (done)
- Never queue more than 7 days of posts — keeps queue manageable during outages
- Meta App Review (Phase 1.6) — one submission covers both publishing AND
  advertising permissions (pages_manage_posts, ads_management, ads_read,
  pages_manage_ads, pages_read_engagement). Not two separate reviews.

**Status:** 🔴 HIGH RISK — LinkedIn publisher not yet built. App Review not started.
**Action required:** LinkedIn publisher Phase 2 Priority 1. App Review Phase 1 — start NOW.

---

## Risk 2 — No Database Backups
**Category:** Infrastructure / Data Loss
**Likelihood:** Low
**Impact:** Catastrophic — complete data loss possible

**Description:**
The entire ICE system — 30+ tables, all client configuration,
all content history, all taxonomy, all pipeline data — lives in
a single Supabase project on the free tier. The free tier does
not include automatic backups. One accidental DELETE without a
WHERE clause, one botched migration, or one Supabase incident
could destroy months of work with no recovery path.

**Trigger:**
Any data loss event — accidental deletion, failed migration,
corruption, or Supabase infrastructure failure.

**Response:**
1. Immediately pause all pipeline cron jobs
2. Contact Supabase support — they may have internal snapshots
3. Assess scope of loss from available logs
4. Restore from most recent manual export if available
5. Rebuild lost configuration from documentation

**Mitigation:**
- Upgrade Supabase to Pro plan ($25/month) — includes daily backups
- Enable point-in-time recovery
- Monthly manual export of critical configuration tables
- All schema changes go through documented migrations, never ad-hoc

**Status:** 🔴 CRITICAL — No backups currently active
**Action required:** Upgrade Supabase Pro TODAY. This is non-negotiable.

---

## Risk 3 — Meta App Review Not Started
**Category:** Compliance / Business
**Likelihood:** High (certainty if not addressed)
**Impact:** Critical — blocks ALL external client publishing AND advertising

**Description:**
ICE currently operates on development-tier Meta API access. This is
acceptable for testing with your own pages but is explicitly not permitted
for managing third-party client pages at scale. Meta App Review is required
for both publishing AND advertising permissions — and these should be
submitted together in ONE review, not separately.

Permissions required (submit all five together):
- pages_manage_posts — publish to client pages
- pages_read_engagement — read post metrics
- ads_management — create and manage boost campaigns
- ads_read — read campaign performance data
- pages_manage_ads — manage ads on client pages

Standard Access graduation requirement: approximately 1,500 successful
API calls within a 15-day window before Meta upgrades from Development
to Standard Access. NDIS Yarns and Property Pulse publishing activity
is building this record now — but only if the app is being used with
the correct app credentials. This needs to be verified.

The review process takes 2-8 weeks. It cannot be rushed. Starting it
now means it may be approved before Phase 1 is complete. Starting it
in Phase 2 means it will still be pending when the first external
client is ready to onboard.

**Trigger:**
Attempting to onboard an external client and discovering publishing
is blocked due to insufficient permissions OR attempting to activate
the boost agent and discovering ads permissions are missing.

**Response:**
1. Explain delay to client honestly — this is a Meta process, not an ICE bug
2. Use manual publishing workaround while review completes
3. Check if Standard Access threshold has been met — if not, increase
   publishing volume on existing pages to build the call record faster

**Mitigation:**
- Submit Meta App Review NOW (Phase 1.6 — not Phase 2 as previously planned)
- Register invegent.com — host privacy policy and terms of service there
- Submit all five permissions in one review, not piecemeal
- Do not promise external clients a start date until Standard Access confirmed
- Verify existing publishing activity is accruing against the correct app credentials

**Status:** 🔴 CRITICAL — Not started. Now a Phase 1 deliverable.
**Action required:** Phase 1.6 — start immediately. Every week of delay
is a week added to the external client onboarding timeline.

---

## Risk 4 — AI Model Vendor Dependency
**Category:** Vendor / Cost
**Likelihood:** Medium
**Impact:** Medium — cost increase or quality degradation

**Description:**
ICE currently depends on OpenAI for all AI generation. OpenAI
has raised prices multiple times, has experienced reliability
issues, and has made breaking API changes (Assistants API
deprecated). A significant price increase or quality degradation
would either increase costs across all clients or require urgent
migration work. At scale (50+ clients, 3 agents running),
AI costs become the primary cost driver at $100-300/month.

**Trigger:**
OpenAI announces price increase > 50%, sustained quality
degradation over 2 weeks, or API deprecation notice
affecting ICE's implementation.

**Response:**
1. If model router is built: switch affected clients to Claude API
2. If model router not built: emergency sprint to abstract AI layer
3. Test output quality on Claude for all client personas
4. Migrate clients one at a time, monitoring quality

**Mitigation:**
- Switch primary model to Claude API now (better for synthesis anyway)
- Build model router in Phase 4 (ai-job → model_router → claude | openai)
- Store model preference in client_ai_profile — per-client flexibility
- Monitor OpenAI cost per client monthly

**Status:** 🟡 PARTIALLY MITIGATED
**Action required:** Switch to Claude API as primary model in next
ai-worker update. Model router abstraction in Phase 4.

---

## Risk 5 — No Performance Feedback Loop
**Category:** Product Quality / Competitive
**Likelihood:** Certain (already materialised)
**Impact:** High — system cannot improve, no proof of value

**Description:**
ICE publishes content but receives no data back about how that
content performs. Without engagement data, the scoring system
cannot improve over time, the auto-approver cannot calibrate
its thresholds against real outcomes, the Content Analyst Agent
cannot function, and most importantly — there is no proof of
value to show potential clients. "We published 5 posts a week"
is not a sales case study. "We grew your page from 0 to 800
followers with 4.2% average engagement rate" is.

**Trigger:**
Already triggered. Every day without the feedback loop is
a day of learning lost.

**Response:**
This risk is already materialised. The response is to build
the mitigation as fast as possible.

**Mitigation:**
- Build insights-worker Edge Function (Phase 2.1)
- Create m.post_performance table
- Call Facebook Graph API /post_id/insights daily
- Store: reach, impressions, engagement, clicks, shares per post
- Wire performance back into digest item scoring weights
- Surface in dashboard Overview tab

**Status:** 🔴 RISK ACTIVE — No mitigation in place
**Action required:** Phase 2.1 is the highest priority item
after Phase 1 is complete.

---

## Risk 6 — Solo Founder Bottleneck
**Category:** Operations / Scale
**Likelihood:** High if agents not built
**Impact:** High — growth ceiling, burnout risk

**Description:**
ICE is built and operated by one person with no development
background, using AI-assisted development. Every new client
currently adds manual work — feed management, draft review,
token management, error handling. Without agents reducing
per-client overhead, the business hits a hard ceiling at
3-4 clients where the operational load matches available time.
There is also no redundancy — if the founder is unavailable,
all client publishing stops.

**Trigger:**
Total operational time across all clients exceeds 15 hours
per week, OR a client escalates because of a publishing
failure during a period of founder unavailability.

**Response:**
1. Triage: which clients need immediate attention
2. Communicate proactively with affected clients
3. Prioritise automation sprint to reduce manual load
4. Document all recurring manual tasks as candidates for automation

**Mitigation:**
- Auto-approval agent (Phase 1.2) — eliminates largest manual task
- Feed intelligence agent (Phase 2.2) — eliminates feed monitoring
- Client portal (Phase 3.1) — clients self-serve common requests
- Next.js dashboard (Phase 2.5) — reduces debugging time per issue
- Document all SOPs so processes survive founder unavailability
- Consider a part-time virtual assistant for client communication
  at 8+ clients

**Status:** 🟡 PARTIALLY MITIGATED
**Action required:** Auto-approval agent is Phase 1 Priority 1.
Nothing reduces this risk faster.

---

## Risk 7 — Silent Pipeline Failures
**Category:** Operations / Reliability
**Likelihood:** Medium — already occurring
**Impact:** Medium — clients miss posts, trust erodes, debugging is slow

**Description:**
The ICE pipeline has multiple failure modes that currently produce no
alert and leave no visible record. An ai_job can stay in 'pending' state
indefinitely if the Edge Function crashes mid-run. A post_publish_queue
item can be locked by a worker that timed out and never unlocked. A
feed ingest run can fail silently with no error surfaced to the dashboard.
The operator has no reliable way to know when the pipeline has stalled
until a client notices they haven't received posts.

This is not a theoretical risk — the error code 368 incident was only
discovered because publishing stopped, not because an alert fired.
At 2 clients this is recoverable. At 8-10 clients, silent failures
become a business-threatening pattern.

**Trigger:**
Any client goes more than 48 hours without a scheduled post, OR
an ai_job or post_publish_queue item remains in a locked/pending
state for more than 2 hours with no progress.

**Response:**
1. Check dashboard Failures panel (once built — Phase 1.7)
2. Identify which table and which rows are stuck
3. Manually reset status or requeue as appropriate
4. Investigate root cause — was it a timeout? An API error? A lock not released?
5. Add the failure pattern to the dead letter sweep rules

**Mitigation:**
- Build Dead Letter Queue (Phase 1.7):
  - dead status on all pipeline tables
  - dead_reason column capturing last error
  - pg_cron daily sweep moves stale locked/pending items to dead
  - dashboard Failures panel surfaces all dead items with requeue action
- Add monitoring: pg_cron job that alerts (writes to a monitoring table)
  if no posts have been published in > 36 hours for any active client

**Status:** 🟡 RISK ACTIVE — No dead letter queue or monitoring in place
**Action required:** Phase 1.7 — Dead Letter Queue. Pairs with dashboard
Failures panel to make all pipeline state visible at a glance.

---

## Risk Summary Table

| Risk | Likelihood | Impact | Status | Priority |
|---|---|---|---|---|
| Facebook API dependency | Medium | Critical | 🔴 App Review not started | Phase 1.6 + 2.3 |
| No database backups | Low | Catastrophic | 🔴 Not active | TODAY |
| Meta App Review not started | High | Critical | 🔴 Not started | Phase 1.6 — NOW |
| AI model vendor dependency | Medium | Medium | 🟡 Partial | Phase 4 |
| No feedback loop | Certain | High | 🔴 Active | Phase 2.1 |
| Solo founder bottleneck | High | High | 🟡 Partial | Phase 1.2 |
| Silent pipeline failures | Medium | Medium | 🟡 Active | Phase 1.7 |

---

## Monthly Review Checklist

Run through this checklist on the first Monday of each month:
□ Supabase backups — confirm last backup completed successfully
□ Facebook tokens — check token_expires_at for all clients
(dashboard Overview tab shows warning banners)
□ Meta App Review — check submission status if in progress
□ Feed health — check getFeedsQuery for any feeds turning red
□ AI costs — check OpenAI/Anthropic usage dashboard
□ Operational hours — did last month exceed 15 hours total?
□ Any new risks identified this month? Add to this document.
□ Any mitigations completed? Update status above.
