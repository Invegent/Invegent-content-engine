# ICE — Risk Register
## Last updated: April 2026 (full rewrite — previous version was Phase 1 era, now superseded)

---

## How to Use This Document

Review monthly. Each risk has:
- **Likelihood** — how probable is this occurring
- **Impact** — how bad if it does occur
- **Trigger** — the specific event that means the risk has materialised
- **Response** — exactly what to do when triggered
- **Status** — current mitigation state

A risk with no mitigation in progress is an unacceptable gap.

---

## Risk 1 — Meta API Single Point of Failure
**Category:** Platform / Vendor
**Likelihood:** Medium
**Impact:** Critical — all client Facebook publishing stops simultaneously
**Status:** 🔴 HIGH RISK

**Description:** ICE's text and image publishing runs entirely through the Meta Graph API. One API policy change, account suspension, rate limit change, or Meta outage stops all clients at once. This has happened before (error code 368 spam block causing infinite retry loops).

**Trigger:** Publishing fails for any client for more than 24 hours due to a Meta API issue.

**Response:**
1. Switch affected clients to manual mode in dashboard immediately
2. Notify clients — posts are queued, not lost
3. Diagnose: account-level, app-level, or API-wide?
4. If account-level: follow Meta appeal process
5. If API-wide: activate LinkedIn publishing for all clients as fallback

**Mitigation in progress:**
- LinkedIn publisher built, waiting on API approval
- Exponential backoff on all Meta API calls implemented
- Dead letter queue captures failures for requeue
- Email newsletter channel planned (owned audience, no platform dependency)

**Action required:** LinkedIn API approval pending. When approved, ensure every client is configured for LinkedIn publishing so the fallback is genuinely available.

---

## Risk 2 — Meta App Review Gate
**Category:** Compliance / Business
**Likelihood:** Medium (external dependency)
**Impact:** Critical — blocks all external client Facebook publishing
**Status:** 🟡 IN PROGRESS

**Description:** ICE is operating on development-tier Meta API access. This is not permitted for managing third-party client pages. Standard Access requires approximately 1,500 successful API calls within a 15-day window, plus a completed App Review. Review timeline is 2–8 weeks and cannot be rushed.

**Trigger:** Attempting to onboard an external client to Facebook publishing while still on development-tier access.

**Response:**
1. Do not onboard. This is a hard gate.
2. Explain the situation to the prospect honestly — this is a Meta process, not an ICE delay
3. Offer LinkedIn or other platforms as an interim option if approved

**Current status:** Business verification In Review as of April 2026. Screencasts uploaded. App icon uploaded. Next check: 14 April 2026.

**Action required:** Check status 14 April. If approved, verify Standard Access graduation. Do not sign first external Facebook client until Standard Access confirmed.

---

## Risk 3 — NDIS Content Compliance Liability
**Category:** Legal / Regulatory
**Likelihood:** Low (with mitigations in place)
**Impact:** High — regulatory action against client, reputational damage to ICE, secondary liability
**Status:** 🟡 PARTIALLY MITIGATED

**Description:** ICE generates professional communications for registered NDIS providers. A non-compliant post could expose the provider to NDIS regulatory action. ICE may have secondary liability. The compliance rules are good but not perfect.

**Trigger:** A client receives a formal complaint or regulatory notice related to content ICE generated.

**Response:**
1. Immediately suspend publishing for that client
2. Review all recent published content against compliance rules
3. Document the specific failure — which rule was missed, why
4. Update the compliance rule if the gap is systematic
5. Report to legal counsel immediately

**Mitigations in place:**
- 22 NDIS compliance rules, profession-scoped, calibrated
- HARD_BLOCK for zero-tolerance violations
- Human approval required for all content
- Planned: ToS clause explicitly limiting ICE's liability

**Action required:** Legal review before first external NDIS client. Draft ToS liability limitation clause. See L001 in legal register.

---

## Risk 4 — Solo Founder Bottleneck
**Category:** Operations / Scale
**Likelihood:** High if automation targets not met
**Impact:** High — growth ceiling, burnout risk, client service failure
**Status:** 🟡 PARTIALLY MITIGATED

**Description:** ICE is built and operated by one person. Every new client currently adds some manual work. Without the automation targets being met, the business hits a hard ceiling at 3–4 clients where operational load matches available time.

**Trigger:** Total operational time across all clients exceeds 15 hours/week.

**Response:**
1. Identify which clients/tasks are driving the overload
2. Prioritise automation of the highest-time-cost tasks
3. Consider a part-time virtual assistant for client communication at 8+ clients
4. Do not onboard new clients until the bottleneck is resolved

**Mitigations in place:**
- Auto-approver v1.4 running — reduces manual draft review significantly
- Dead letter queue — pipeline failures are visible without manual monitoring
- Dashboard monitoring — operational checks in under 30 minutes/day

**Action required:** Measure actual operational hours per client weekly. If approaching 2 hours/week per client, prioritise the automation backlog before new client conversations.

---

## Risk 5 — Performance Feedback Loop Missing
**Category:** Product Quality
**Likelihood:** Active — already materialised
**Impact:** Medium — cannot prove value, cannot improve scoring, cannot retain clients
**Status:** 🟡 PARTIALLY MITIGATED

**Description:** ICE publishes content but until the insights worker is fully operational, the scoring system cannot improve from real outcomes, and there is no proof of value to show clients or prospects.

**Current state:** insights-worker v14 deployed. 148 rows in m.post_performance. Facebook metric names fixed. Performance dashboard live. But the data is thin — NDIS Yarns has very low reach data due to cold start.

**Trigger:** A client asks for proof that ICE is growing their page and the answer is "we can't show you yet."

**Response:**
1. Show whatever data exists — even thin data is better than none
2. Show publishing consistency (posts published, cadence maintained) as a proxy
3. Be honest about the cold start timeline — 3–6 months for organic content to produce meaningful results

**Action required:** Continue running insights-worker daily. Surface performance data more prominently in client portal once it is meaningful. Build proof document when NDIS Yarns has 12+ weeks of data.

---

## Risk 6 — Copyright and Content Provenance
**Category:** Legal
**Likelihood:** Low (with mitigations)
**Impact:** Medium — publisher complaints, takedown requests, reputational risk
**Status:** 🟡 MONITORING

**Description:** ICE ingests RSS feed content and uses it as context for AI generation. The legal status of using copyrighted article text as AI generation context is unsettled. Publishers who discover systematic ingestion of their content may object even if legally ambiguous.

**Trigger:** A publisher sends a formal complaint or legal notice regarding ICE's use of their content.

**Response:**
1. Immediately remove the source from ICE's active feed list
2. Review all content generated from that source in the past 90 days
3. Delete any content that too closely paraphrases the original
4. Consult legal counsel

**Mitigations in place:**
- Give-up mechanism for paywalled sources — the most copyright-sensitive sources are already excluded
- Published posts do not reproduce source text verbatim
- Source attribution in published posts

**Action required:** Include in legal review. Add ToS clause. See L003 in legal register.

---

## Risk 7 — pg_cron Concurrency at Scale
**Category:** Technology / Infrastructure
**Likelihood:** Low (at current scale), Medium (at 20+ clients)
**Impact:** Medium — silent pipeline failures, content not publishing for some clients
**Status:** 🟡 MONITORING

**Description:** ICE has 31 pg_cron jobs, most running every 5–15 minutes. At two clients, this is fine. At 20 clients, concurrent Edge Function invocations will contend for database connections and Supabase's function concurrency limits. The pipeline could start silently failing not because of logic bugs but because of infrastructure limits.

**Trigger:** Any client goes more than 48 hours without a scheduled post when the pipeline shows no errors.

**Response:**
1. Check pg_cron job run details for timing/concurrency failures
2. Check Edge Function concurrency limits in Supabase dashboard
3. Move to task-based queue pattern if concurrency is the issue

**Action required:** No immediate action. Monitor as client count grows. When approaching 10 clients, review cron schedule and consider moving to a task-queue pattern (Edge Function reads a queue table, processes one item, marks done). Address formally at 15+ clients.

---

## Risk 8 — Avatar Consent Failure
**Category:** Legal / Trust
**Likelihood:** Low (if consent workflow is built), High (if it isn't)
**Impact:** High — legal action, reputational damage, platform account suspension
**Status:** 🔴 OPEN — consent workflow not yet built

**Description:** HeyGen avatar creation requires biometric data (video footage). Creating an avatar without explicit written consent, or using it for purposes beyond what was consented to, creates serious legal exposure under Australian privacy law and HeyGen's own ToS.

**Trigger:** Any avatar video is created for a client without a signed consent document on file.

**Response:** Immediate suspension of avatar video production for that client. Legal counsel consulted immediately.

**Action required:** Build consent workflow before HeyGen integration is built. No avatar is ever created without signed consent stored in ICE's database. See L005 in legal register.

---

## Risk 9 — Cold Start / Slow Growth for Internal Proof Pages
**Category:** Product / Commercial
**Likelihood:** Medium
**Impact:** High — no proof document, cannot attract external clients
**Status:** 🟡 ACTIVE

**Description:** NDIS Yarns and Property Pulse need meaningful follower counts and engagement data before ICE can use them as proof of product value. Organic social media growth takes 3–6 months. ICE has been publishing consistently for 6+ weeks but the pages are still in the cold start phase.

**Trigger:** First external client conversation happens without any meaningful performance data to show.

**Response:**
1. Do not rely solely on performance numbers — use publishing consistency, content quality, and compliance record as proof signals
2. Supplement with industry data on organic social media timelines
3. Offer a 90-day pilot with a performance milestone commitment

**Action required:**
- Share NDIS Yarns to PK's personal network to seed initial followers (done 7 April 2026)
- Consider a small boost budget ($200–400) for NDIS Yarns to accelerate the cold start
- Document whatever performance data exists when the first client conversation happens
- Build the proof document when 12+ weeks of data is available

---

## Risk Summary Table

| Risk | Likelihood | Impact | Status | Action |
|---|---|---|---|---|
| Meta API single point of failure | Medium | Critical | 🔴 LinkedIn not yet live | LinkedIn approval pending |
| Meta App Review gate | Medium | Critical | 🟡 In progress | Check 14 Apr, hard gate before external client |
| NDIS compliance liability | Low | High | 🟡 Partial | Legal review before first client |
| Solo founder bottleneck | High | High | 🟡 Partial | Measure hours weekly |
| Performance feedback loop | Active | Medium | 🟡 Partial | Keep insights-worker running daily |
| Copyright / content provenance | Low | Medium | 🟡 Monitoring | Include in legal review |
| pg_cron concurrency at scale | Low now | Medium | 🟡 Monitoring | Revisit at 10+ clients |
| Avatar consent | Low (if workflow built) | High | 🔴 Open | Build before HeyGen integration |
| Cold start / slow growth | Medium | High | 🟡 Active | Network seeding + proof document |

---

## Monthly Review Checklist

Run on the first Monday of each month:
- [ ] Supabase backups — confirm last backup completed successfully
- [ ] Facebook tokens — check token_expires_at for all clients (next expiry: early June 2026)
- [ ] Meta App Review — check submission status
- [ ] LinkedIn API — check approval status
- [ ] Feed health — any feeds in red/give-up state?
- [ ] AI costs — check Anthropic usage dashboard
- [ ] Operational hours — did last month stay under 15 hours total?
- [ ] Legal register — any new issues to add?
- [ ] Avatar consent — is the workflow built before HeyGen is integrated?
- [ ] Any risks resolved? Update status above.
- [ ] Any new risks identified? Add above.
