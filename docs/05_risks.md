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
infinite retry loops — fixed in publisher v34 with exponential backoff).
Meta has a history of sudden API changes with minimal notice.

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
- Exponential backoff on all Meta API calls ✅ done (publisher v34)
- Never queue more than 7 days of posts — keeps queue manageable during outages
- Meta App Review (Phase 1.6) — in progress

**Status:** 🟡 PARTIALLY MITIGATED
**Action required:** LinkedIn publisher Phase 2.3 — unblocked once LinkedIn account recovery resolves.

---

## Risk 2 — No Database Backups
**Category:** Infrastructure / Data Loss
**Likelihood:** Low
**Impact:** Catastrophic — complete data loss possible

**Description:**
The entire ICE system — 30+ tables, all client configuration,
all content history, all taxonomy, all pipeline data — lives in
a single Supabase project. Without backups, one accidental DELETE,
botched migration, or infrastructure failure could destroy months
of work with no recovery path.

**Trigger:**
Any data loss event — accidental deletion, failed migration,
corruption, or Supabase infrastructure failure.

**Response:**
1. Immediately pause all pipeline cron jobs
2. Contact Supabase support — they may have internal snapshots
3. Assess scope of loss from available logs
4. Restore from most recent backup
5. Rebuild lost configuration from documentation

**Mitigation:**
- ✅ Supabase Pro enabled ($25/month) — daily automatic backups confirmed active
- ✅ Monthly manual export of critical configuration tables
- ✅ All schema changes go through documented migrations

**Status:** ✅ MITIGATED

---

## Risk 3 — Meta App Review Not Complete
**Category:** Compliance / Business
**Likelihood:** High (certainty if not addressed)
**Impact:** Critical — blocks ALL external client publishing AND advertising

**Description:**
ICE currently operates on development-tier Meta API access.
Meta App Review is required for both publishing AND advertising
permissions before managing third-party client pages at scale.

Permissions to obtain:
- pages_manage_posts — publish to client pages
- pages_read_engagement — read post metrics
- pages_show_list — list pages the user manages
- ads_management — create and manage boost campaigns (Phase 3.4)
- ads_read — read campaign performance
- pages_manage_ads — manage ads on client pages

Standard Access graduation requirement: ~1,500 successful API calls
within a 15-day window. NDIS Yarns and Property Pulse publishing is
building this record now.

Review timeline: 2-8 weeks after submission.

**Trigger:**
Attempting to onboard an external client and discovering publishing
is blocked due to insufficient permissions.

**Response:**
1. Explain delay to client honestly — this is a Meta process
2. Use manual publishing workaround while review completes
3. Increase publishing volume on existing pages to build API call record faster

**Mitigation:**
- ✅ Privacy Policy live
- ✅ Business verification submitted (ABN: 39 769 957 807)
- 🔄 Business verification approval pending
- 🔄 Tech Provider status application — after business verification approved
- 🔄 Permissions review submission — after Tech Provider approved
- Do not promise external clients a start date until Standard Access confirmed

**Status:** 🟡 IN PROGRESS
**Action required:** Retry app icon upload. Apply for Tech Provider once business verification approved. Then submit permissions review.

---

## Risk 4 — AI Model Vendor Dependency
**Category:** Vendor / Cost
**Likelihood:** Medium
**Impact:** Medium — cost increase or quality degradation

**Description:**
ICE uses Claude API (primary) and OpenAI (fallback) for all AI generation.
A significant price increase or quality degradation would either increase
costs across all clients or require urgent migration work.
At scale (50+ clients, 3 agents running), AI costs become the primary
cost driver at $100-300/month.

**Trigger:**
AI provider announces price increase > 50%, sustained quality
degradation over 2 weeks, or API deprecation notice.

**Response:**
1. If model router is built: switch affected clients to alternate model
2. If not built: emergency sprint to abstract AI layer
3. Test output quality on alternate model for all client personas
4. Migrate clients one at a time, monitoring quality

**Mitigation:**
- ✅ Claude API as primary model (switched from OpenAI)
- ✅ OpenAI retained as fallback
- ✅ Per-client model config in client_ai_profile
- Build model router in Phase 4 (ai-job → model_router → claude | openai)

**Status:** 🟡 PARTIALLY MITIGATED
**Action required:** Model router abstraction in Phase 4.

---

## Risk 5 — No Performance Feedback Loop
**Category:** Product Quality / Competitive
**Likelihood:** Resolved
**Impact:** Resolved

**Description:**
Without engagement data, the scoring system cannot improve over time,
the Content Analyst Agent cannot function, and there is no proof of
value to show potential clients.

**Status:** ✅ MITIGATED — Phase 2.1 complete
- m.post_performance table live with 50 rows (25 with reach data)
- insights-worker running daily
- Note: New Pages Experience limits impressions data (platform constraint, not a bug)
- Data will feed back into scoring as volume grows

---

## Risk 6 — Solo Founder Bottleneck
**Category:** Operations / Scale
**Likelihood:** Medium (reducing as automation increases)
**Impact:** High — growth ceiling, burnout risk

**Description:**
ICE is built and operated by one person growing to a small team.
Without agents reducing per-client overhead, the business hits a hard
ceiling at 3-4 clients where operational load matches available time.

**Trigger:**
Total operational time across all clients exceeds 15 hours per week,
OR a client escalates because of a publishing failure during founder
unavailability.

**Response:**
1. Triage: which clients need immediate attention
2. Communicate proactively with affected clients
3. Prioritise automation sprint to reduce manual load
4. Document all recurring manual tasks as candidates for automation

**Mitigation:**
- ✅ Auto-approval agent (Phase 1.2) — eliminates largest manual task
- ✅ Feed intelligence agent (Phase 2.2) — automates feed monitoring
- 🔄 Next.js dashboard (Phase 2.5) — reduces debugging time per issue
- 🔲 Client portal (Phase 3.1) — clients self-serve common requests
- ✅ Dashboard auth designed for 2-3 team members from day one
- Document all SOPs so processes survive founder unavailability
- Consider part-time VA for client communication at 8+ clients

**Status:** 🟡 PARTIALLY MITIGATED
**Action required:** Next.js dashboard (Phase 2.5) is the current priority.

---

## Risk 7 — Silent Pipeline Failures
**Category:** Operations / Reliability
**Likelihood:** Low (significantly reduced)
**Impact:** Medium — clients miss posts, trust erodes

**Description:**
The ICE pipeline has multiple failure modes that could produce no
alert and leave no visible record. Without monitoring, pipeline
stalls are only discovered when a client notices missing posts.

**Trigger:**
Any client goes more than 48 hours without a scheduled post, OR
an ai_job or post_publish_queue item remains stuck for more than 2 hours.

**Response:**
1. Check dashboard Failures panel (m.vw_ops_failures_24h)
2. Identify which table and which rows are stuck
3. Manually reset status or requeue as appropriate
4. Investigate root cause
5. Add the failure pattern to the dead letter sweep rules

**Mitigation:**
- ✅ Dead Letter Queue (Phase 1.7) complete:
  - dead status on all pipeline tables
  - dead_reason column capturing last error
  - pg_cron daily sweep at 2am UTC
  - m.vw_ops_failures_24h view for dashboard
- ✅ sweep-stale-running-every-10m cron job requeues stuck items
- ✅ token-health-daily cron job monitors Facebook token expiry
- 🔄 Dashboard Failures panel (Phase 2.5 Session 4) — surfaces all dead items

**Status:** 🟡 MOSTLY MITIGATED — backend detection complete, dashboard surfacing in progress

---

## Risk Summary Table

| Risk | Likelihood | Impact | Status | Priority |
|---|---|---|---|---|
| Facebook API dependency | Medium | Critical | 🟡 Partial — LinkedIn pending | Phase 2.3 |
| No database backups | Low | Catastrophic | ✅ Mitigated | Done |
| Meta App Review | Medium | Critical | 🟡 In Progress | Phase 1.6 continuing |
| AI model vendor dependency | Medium | Medium | 🟡 Partial | Phase 4 |
| No feedback loop | Resolved | Resolved | ✅ Mitigated (Phase 2.1) | Done |
| Solo founder bottleneck | Medium | High | 🟡 Partial | Phase 2.5 |
| Silent pipeline failures | Low | Medium | 🟡 Mostly mitigated | Phase 2.5 |

---

## Monthly Review Checklist

Run through this checklist on the first Monday of each month:
- [ ] Supabase backups — confirm last backup completed successfully
- [ ] Facebook tokens — check m.vw_ops_token_health for expiry warnings
- [ ] Meta App Review — check submission status if in progress
- [ ] Feed health — check m.agent_recommendations for new recommendations
- [ ] AI costs — check Anthropic/OpenAI usage dashboard
- [ ] Operational hours — did last month exceed 15 hours total?
- [ ] Any new risks identified this month? Add to this document.
- [ ] Any mitigations completed? Update status above.
