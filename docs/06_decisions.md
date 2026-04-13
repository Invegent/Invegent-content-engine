# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D088 — See earlier commits

---

## D089 — Agent Intelligence Architecture — Three-Layer Self-Healing
**Date:** 13 April 2026 | **Status:** ✅ Live

**Decision:** Build a three-layer autonomous intelligence system: Sentinel (proactive detection) → Diagnostician (root cause analysis) → Healer (safe auto-remediation).

**Reasoning:** At 3 clients, manual monitoring is manageable. At 10 it is a full-time job. The agent layer must catch and fix common failures without human involvement. Self-healing rate is the metric that matters — not "we built an AI system" but "84% of incidents resolved autonomously".

**Governance boundary:** Healer may only reset status fields (stuck jobs, stuck queue). It never touches tokens, external APIs, client configuration, or data. Every action logged to m.pipeline_incident with resolved_by='healer-auto'.

**What was built:**
- pipeline-sentinel v1.0.0: 5 checks per client every 15min. Writes to m.pipeline_incident. Telegram alert on CRITICAL.
- pipeline-diagnostician v1.0.0: Claude-powered RCA. Returns finding, probable_cause, recommended_fix, auto_fixable.
- pipeline-healer v1.0.0: Executes reset_stuck_ai_jobs and reset_stuck_queue. Runs 2 min after Sentinel.
- m.pipeline_incident: Immutable table. Delete trigger prevents removal.

---

## D090 — Client Portal Content Strategy — 5-Second Rule
**Date:** 13 April 2026 | **Status:** ✅ Live

**Decision:** The portal Home page must answer within 5 seconds: "How many posts went out this week? Is everything working?" Everything else is secondary.

**Reasoning:** A client who logs in and sees nothing cancels. A client who sees posts published, a count going up, and a platform status green stays. The portal is a retention tool, not an approval screen.

**What was built:** 5 sections on portal Home: week stats (3 cards), platform status row, recent posts (last 5), quick actions, coming up next 7 days. Inbox: full approve/reject workflow with inline expand. Performance: engagement data + top posts. All served via SECURITY DEFINER functions with explicit client_id param.

---

## D091 — invegent.com Positioning — NDIS-First, Founder-Led
**Date:** 13 April 2026 | **Status:** ✅ Live

**Decision:** The invegent.com website leads with the moat: built by a CPA who manages an NDIS practice and holds plan management registration. No competitor can make this claim. It must appear on the hero, not buried in an About section.

**Reasoning:** Generic AI content tools already exist. The only defensible position is vertical depth + insider credibility. "Your NDIS practice posts every day. Without you touching it." is the headline because it speaks directly to the specific anxiety of an NDIS provider founder.

**Pricing shown publicly:** $500/$800/$1,500/mo. No "contact for pricing." NDIS providers are used to NDIA price guides and respect transparency.

**What was built:** 8-section Next.js page. Hero with live NDIS Yarns proof stats from Supabase. Founder section (PK: CPA + Plan Manager + OT administrator). Pricing table. FAQ. Single CTA: mailto:hello@invegent.com.

---

## D092 — External Client Token Workaround — Pre-App Review
**Date:** 13 April 2026 | **Status:** ✅ Decided

**Decision:** First 1–3 external clients can be onboarded before Meta Standard Access and LinkedIn API approval using a manual token workaround. Client generates their own Page Access Token, PK inserts it directly into c.client_publish_profile.page_access_token. ICE publishes with client’s own token immediately.

**Reasoning:** This is exactly how NDIS Yarns and Property Pulse work today. The token is the client’s own — no third-party permission required. Standard Access is only needed for ICE to manage pages it doesn’t own via OAuth. The manual workaround is viable for a managed service with 1–3 clients where PK handles onboarding directly.

**Limitation:** Tokens expire in ~60 days. Renewal is manual. Not scalable beyond ~5 clients. Full OAuth flow required at scale.

**For LinkedIn:** Same approach. Client generates LinkedIn access token. PK inserts into publish profile. linkedin-publisher uses it.

---

## D093 — LinkedIn API Strategy — Monitor + Middleware Evaluation
**Date:** 13 April 2026 | **Status:** ✅ Decided

**Decision:** Continue waiting for LinkedIn Community Management API approval. Evaluate Late.dev (or equivalent pre-approved middleware) if still pending by 13 May 2026.

**Reasoning:** LinkedIn’s Community Management API approval is notoriously difficult for small/new businesses. Documented cases of 2+ months stuck In Review with no response. Late.dev and similar services already hold pre-approved API access and expose a unified REST endpoint — ICE could call their API instead of LinkedIn directly. Cost ~$50–200/month depending on volume.

**Review trigger:** 13 May 2026 — if still no approval, evaluate middleware route. Decision D093-B to be logged at that point.

---

## D094 — CFW Wipe and Restart as Acceptance Test
**Date:** 13 April 2026 | **Status:** ✅ Decided — pending execution

**Decision:** Care for Welfare (3eca32aa) is an empty shell — no AI profile, no publish profile, no feeds, no content scope. Rather than patching it, wipe the client record and run it through the full onboarding flow from scratch. The output is the acceptance test: if every step from prospect → portal login → content generating → published works without manual intervention, ICE is ready for the first external client.

**Timing:** After all pipeline issues (NDIS Yarns image formats, PP video re-queue) are resolved. Next dedicated build session.

**What the test must prove:**
1. Onboarding form submits cleanly
2. Run Scans: brand-scanner extracts logo + colours
3. Run Scans: ai-profile-bootstrap generates persona
4. PK approves → client + brand + AI profile created atomically
5. Client logs in → brand colours + logo appear
6. Client connects Facebook
7. Pipeline generates first draft within 24h
8. Auto-approver evaluates draft
9. Post published to CFW Facebook page
10. Portal Home shows: 1 post published, next post scheduled, Facebook connected
11. Client weekly email arrives next Monday

---

## D095 — Performance Feedback Loop Architecture
**Date:** 13 April 2026 | **Status:** ✅ Partially live

**Decision:** Wire engagement data from m.post_performance back into digest scoring via per-client per-topic weight multipliers. Topics that perform well get boosted; topics that underperform decay. No manual tuning required.

**What was built:**
- m.topic_score_weight table: per-client, per-topic weight (clamped 0.3–2.5). Requires 3+ posts on a topic for a real weight; fewer = neutral 1.0.
- recalculate_topic_weights() SECURITY DEFINER function: runs against last 90 days of engagement data. Global average as baseline. ON CONFLICT UPSERT.
- insights-feedback Edge Function v1.0.0: daily at 3:30am UTC (30min after insights-worker). Calls recalculate for all active clients.
- 2 topic weights seeded for NDIS Yarns from live data.

**Pending:** Bundler function not found during build — needs wiring so final_score is multiplied by topic_weight_multiplier. Wire when bundler is next touched.

---

## D096 — GitHub Pages Kill — Source to GitHub Actions
**Date:** 13 April 2026 | **Status:** ✅ Resolved

**Problem:** GitHub Pages was accidentally enabled on Invegent-content-engine repo (a non-website repo of Edge Functions + SQL migrations). Every push to main triggered the pages build and deployment workflow, which failed and sent an email. 753 unread emails accumulated over the session.

**Resolution:** Changed Source in Settings → Pages from "Deploy from a branch" to "GitHub Actions". Since no .github/workflows file exists in the repo, no workflow fires. Emails stop.

**Why Unpublish site alone didn’t work:** Unpublishing removes the live site but leaves the build trigger active. Only changing Source removes the trigger.

---

## D097 — Client Weekly Email Pattern
**Date:** 13 April 2026 | **Status:** ✅ Live

**Decision:** Send each active client a weekly summary email Monday 7:30am AEST (30 minutes after the B5 manager report). Content: posts published this week, upcoming queued, drafts to review (if require_client_approval=true). Sent via Resend.

**Reasoning:** Clients who don’t log in still see proof of value every Monday morning. Keeps ICE top of mind. Reduces churn by maintaining perceived activity even during low-engagement periods.

**Pattern:** B5 at 7:00am (PK’s view), client email at 7:30am (client’s view). Both generated from same Supabase data layer.

---

## D098 — Dashboard Three-Zone Navigation Architecture
**Date:** 13 April 2026 | **Status:** ✅ Live

**Decision:** Restructure the dashboard from a flat 20+ route nav into three clear zones matching the operator’s three real intents: (1) Is everything working? (2) What needs my attention today? (3) Let me configure something.

**What was built:**
- StatusStrip: persistent top bar on every page. Green/amber/red. Shows open criticals, stuck jobs, posts this week, inbox count.
- 6-zone nav: TODAY (Overview, Inbox, Queue) / MONITOR (Flow, Pipeline log, Diagnostics, Failures) / CONTENT (Content Studio, Visuals, Performance, Costs) / CONFIGURATION (Clients, Feeds, Compliance, Onboarding, Connect) / SYSTEM (Roadmap).
- Overview page rebuilt as operator briefing: status bar, drafts+incidents 2-column, today’s schedule, 4 stat cards.

---

## D099 — Platform Gating Strategy for External Clients
**Date:** 13 April 2026 | **Status:** ✅ Decided

**Current platform status for external clients:**
- Facebook (own pages): ✅ Working. No gating.
- Facebook (client pages via OAuth): 🔴 Requires Meta Standard Access. Gate: FACEBOOK_OAUTH_ENABLED env var.
- LinkedIn (own pages): ✅ Working (manual token).
- LinkedIn (client pages): 🔴 Requires Community Management API. Gate: LINKEDIN_OAUTH_ENABLED env var.
- YouTube: ✅ Working (manual token). No OAuth flow built — PK inserts token manually.

**Decision:** For first 1–3 external clients, use the manual token workaround for both Facebook and LinkedIn. PK walks client through generating their own Page Access Token. Token inserted directly into c.client_publish_profile. Full OAuth gated behind env vars until approvals clear.

---

## D100 — Publish Pipeline Format Audit — Known Gaps
**Date:** 13 April 2026 | **Status:** ⚠️ Active issues

**Findings from live data audit:**

1. NDIS Yarns — image formats stopped ~20 March:
   - image_quote published: 7 (last: 20 Mar). carousel published: 7 (last: 20 Mar).
   - Zero image ai_jobs created in the last 30 days for NDIS Yarns.
   - preferred_format_facebook = 'image_quote' is set on publish profile.
   - Root cause: unknown. ai-worker not generating image format jobs. Investigation needed.

2. Property Pulse — 3 approved video drafts with no queue items:
   - video_short_kinetic (2 drafts, Apr 3 and Apr 5) and video_short_stat (1 draft, Apr 2).
   - queue_id = null — draft_approve_and_enqueue() did not create queue items.
   - Likely timing issue with video worker state at time of approval.
   - Fix: manually call enqueue function for these 3 draft IDs, or re-approve.

3. NDIS Yarns YouTube — 2 avatar videos stuck pending:
   - video_short_avatar × 2 (Alex Intro — Realistic + Animated). Approved Apr 9.
   - Queue items in 'pending' status — waiting for HeyGen avatar builds.
   - Not a pipeline bug. Avatar build is the blocker.

**Actions required:** Brief to Claude Code for items 1 and 2. Item 3 awaits avatar build.

---

## Decisions Pending

| Decision | Context | Target |
|---|---|---|
| NDIS Support Catalogue data load | Tables exist. Needs NDIA Excel from ndia.gov.au | Phase 3 |
| Legal review of service agreement | L001 — hard gate before external client #1 | Before C1 |
| F1 Prospect demo generator | Hold until NDIS Yarns has 60+ days data | ~mid-June 2026 |
| LinkedIn middleware evaluation | Late.dev or equivalent if API still pending | 13 May 2026 |
| Bundler topic weight wiring | recalculate_topic_weights() built, bundler not reading it | When bundler next touched |
| NDIS Yarns image format fix | ai-worker not generating image jobs since 20 Mar | Next build session |
| PP video re-queue | 3 approved drafts with no queue item | Next build session |
| CFW acceptance test | Wipe + full onboarding flow end-to-end | Next build session |
| Cowork daily inbox task | Gmail MCP — archive noise, surface actions | Phase 4 |
| AI compliance rule generator | ANZSCO tasks + code_of_conduct_url → Claude draft rules | Phase 4 |
| Model router | When AI costs become significant | Phase 4 |
| video_short_avatar_conversation | After D081 maturity threshold met | Phase 4 |
| SaaS vs managed service | When 10 clients served 3+ months | Phase 4 |
