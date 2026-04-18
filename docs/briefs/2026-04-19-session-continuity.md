# ICE — Session Continuity Brief, 19 April 2026

> **Written Saturday 18 April 2026 22:30 Sydney time by PK + Claude.**
> **Purpose:** persist tonight's strategic reasoning so it's not lost to Claude Project memory decay by Sunday morning.
> **Authority:** this brief takes precedence over any fresh Claude suggestions tomorrow that contradict it — tonight-PK reasoned carefully, morning-Claude will be working from a cold start.

---

## How to use this brief

**First action Sunday morning:** read this file in full before acting on anything else. If tomorrow's session suggests a direction that contradicts what's here, pause and re-read. If after re-reading it still feels wrong, push back — but the burden of proof is on fresh-Claude, not on tonight's reasoning.

**This brief is load-bearing for the next 7 days.** Decisions tracked here are not preferences — they are the committed direction until explicitly revisited.

**Three independent surfaces point at the same conclusion** (per tonight's hierarchy pattern):
1. This brief (`docs/briefs/2026-04-19-session-continuity.md`) — the narrative and reasoning
2. `docs/00_sync_state.md` — "FIRST THING NEXT SESSION" updated to point here
3. `docs/06_decisions.md` D156 — the strategic decision recorded in the authoritative log

If any one surface decays (Claude memory forgets, sync_state gets overwritten, docs drift), the other two hold.

---

## Context — why this brief exists

Saturday 18 April was the biggest diagnostic and repair day since ICE began. Three silent failures were surfaced that had been running undetected for up to 7 days:

- **D155:** enqueue trigger `ON CONFLICT` clause mismatch caused every ai_worker UPDATE to silently roll back since 11 April. 441 ai_jobs stuck. No alert fired. API calls were succeeding, drafts had content, but `ai_job.status` never flipped to `succeeded`, so publishing stopped.
- **D152:** D142 seeder was creating `post_draft` rows with `client_id = NULL`. 300 orphans per week.
- **FB tokens dead 5 days:** 3 of 4 Facebook page tokens had been invalidated by Meta on 13 April PDT. Token-expiry alerter was trusting the stored `token_expires_at` field, which was stale. No alert fired.

All three were caught by accident during investigation of a visible symptom (LinkedIn publishing Facebook-styled content). None were caught by ICE's own monitoring.

PK's response: confidence crashed. The correct calibrated response to learning that monitoring you believed existed doesn't actually watch for the shape of failures that matter.

The evening turned into a strategic design session about how to structurally solve this. Output of that session is captured below.

---

## The core insight

ICE's failure mode today is not "we need more monitoring." It's:

> **Everything in the ICE system shares the same epistemic foundation.** Code, docs, monitors, audits, advisors — all derive from Claude-assisted reasoning over Claude-written artefacts interpreting Claude-generated outputs, with PK as the only external node. When Claude is wrong in a systematic way, the whole system is wrong in a correlated way, and PK is the only person who can see it.

Real companies solve this with **diversified epistemic bases**: different vendors with different incentives, different AI models with different training data, external auditors whose job is to catch their client out, legal/insurance frameworks that punish self-dealing.

ICE needs some of this, bolted ON ICE, not built INSIDE ICE.

PK's reframing (verbatim): "The approach that we bring is everybody is on their own. And there is a competitiveness between the employees because they always try to prove themselves right and the other person wrong. This basic structure always work within companies... What I want is not just to internalize solution, but something from the external that we can build if we need to call in AI elements or if we need to create any different agents which are not just Claude specific."

The dual purpose (PK's framing): cost savings AND positioning as an AI-audits-AI product. Every external layer component becomes both a failure-catching mechanism AND a sales differentiator. Customers eventually see: "We run GPT-4 against Claude's outputs weekly. Here's what it caught last quarter."

---

## The four-stage external layer (PK-refined, this is the committed direction)

### Stage 1 — Multi-model adversarial review
**Timing:** build during pre-sales (starts this coming week). Continues through post-sales.
**Vendors:** OpenAI (GPT-4 / GPT-4.1) + Google (Gemini 2.5 Pro).
**Cost:** ~$75/year at current volume.

**Four roles, assigned by model strength:**

| Role | Model | What it reads | What it writes |
|---|---|---|---|
| **The Sceptic** | GPT-4 / GPT-4.1 | Weekly: sync_state + decisions log updates | "Claims vs evidence" report — finds assertions without verification |
| **The Architect Reviewer** | Gemini 2.5 Pro | Per-commit: diffs touching EFs, triggers, migrations | Structural bug findings — would have caught D155 on day one |
| **The Compliance Auditor** | GPT-4 | Weekly: 5 published posts/client + privacy policy + service agreement | Drift between promises and reality |
| **The Devil's Advocate** | Gemini 2.5 Pro | Within 2h of any D149 advisor output | Counter-argument to the advisor's recommendation |

**Output surface:** `m.external_review_queue` table. Dashboard surfaces unresolved items. Each item has `action_taken` field PK fills in.

**Discipline layer (this is critical, don't skip):** unread items block dashboard home until acknowledged. Weekly review is a scheduled block on Monday morning. Output without reading-discipline is theatre — it must be structurally unavoidable.

### Stage 2 — Bank reconciliation against external platforms
**Timing:** parallel to Stage 1. Build first priority system this week.
**Cost:** marginal (platform API calls PK already makes).

**Eight systems, four in priority order:**

| Priority | System | Compare to | Failure mode caught |
|---|---|---|---|
| 1 | Meta Graph API — `/me/posts?limit=100` per page | `m.post_publish WHERE platform='facebook'` | Posts that went out but weren't logged; silent token revocation; the D155 symptom on the platform side |
| 2 | GitHub API — last commit SHA on main + push timestamps | `docs/00_sync_state.md` "last written" + assertions | sync_state going stale; commits landing but not documented |
| 3 | Vercel deploy API — last deploy SHA per project | `git rev-parse origin/main` | Deploy drift between dashboard / portal / web |
| 4 | Supabase management API — Edge Function list + timestamps | `supabase/functions/` in repo | Deployed-without-source drift (the 8 source-less functions) |
| 5 | LinkedIn via Zapier logs | `m.post_publish WHERE platform='linkedin'` | Zapier silent failures, webhook throttling |
| 6 | Meta Insights API | Populate `m.post_performance` | Phase 2.1 — also serves as engagement truth source |
| 7 | YouTube Data API | `m.post_publish WHERE platform='youtube'` | YouTube pipeline silence check |
| 8 | Xero API (once set up) | Future `m.client_billing` | Revenue actually received vs invoiced |

**Output surface:** `m.external_reconciliation_result` table. One row per system per comparison. Dashboard has a single screen showing latest green/amber/red per system.

**Key discipline inversion:** ICE's records are never the authoritative source when they disagree with the external system. If Meta says 3 posts published and ICE's DB says 5, **Meta is right until proven otherwise, and we investigate the 2-post discrepancy, not assume the DB is canonical.**

### Stage 3 — External human review (tiered by exposure)
**Timing:** Tier A after Stages 1+2 stable (≈6 weeks out). Tier B after revenue. Tier C as Stage 4.

**Tier A — Public sanitised brief, $50/finding, no NDA**
- Post architecture-only brief (no code, no tokens, no client data, no prompts) on r/supabase, Claude Developers Discord, Hacker News Show HN
- Pay $50 per credible design concern
- Also functions as marketing: "we publish our architecture for review, here's what was found and fixed"
- Low risk because nothing shared is sensitive

**Tier B — Signed brief + NDA on Upwork/Fiverr, $200-500/engagement**
- Australian freelancer preferred (jurisdiction)
- Targeted skills (PostgreSQL + Supabase + security review)
- Rotate Supabase service-role key afterwards
- Never expose prompts or client tokens
- Test with small engagement first

**Tier C — Agency retainer (see Stage 4)**

### Stage 4 — Human CTO / agency retainer (revenue-gated)
**Timing:** 5+ clients or $5k MRR. NOT before.

**Profile:**
- Australian, NSW preferred (jurisdiction)
- Supabase + Next.js specialists
- NDIS-adjacent or regulated-sector experience
- Small team (3-8 people) — senior-level conversation
- Fixed monthly retainer (not T&M)

**What you buy:** monthly 90-min architecture review + quarterly deep audit + emergency response SLA + their security review checklist.

**Budget:** ~$10-15k AUD/year. Sustainable at 10+ clients, not before.

**Solicitor trigger (PK position, noted):** PK said "waiver or avoidance of the legal cost would not be an issue if the confidence is 100% in the product." **Counter-recommendation captured tonight:** even a perfect product has exposure (client misuse, regulatory change, vendor breach, post-attribution disputes). Trigger solicitor engagement when EITHER first pilot converts to full-price OR pilot runs cleanly for 90 days and second client is signing. Revenue is the trigger, not confidence.

---

## Explicitly deferred / NOT doing

These are captured to prevent scope creep and to preserve the decision when energy is high tomorrow:

- ❌ Do NOT start Stage 3B (Upwork/Fiverr engagements) until revenue exists. Capital preservation.
- ❌ Do NOT start Stage 4 (agency retainer) until $5k MRR. Same reason.
- ❌ Do NOT engage solicitor until first pilot converts or second pilot signs. Per D147 + tonight's refinement.
- ❌ Do NOT build more internal Claude-only monitoring as a substitute for external layer. This was PK's explicit pushback tonight — tomorrow-Claude will be tempted to suggest this, don't let it.
- ❌ Do NOT skip the discipline layer (unread-items-block-dashboard, mandatory weekly review). External layer output without structural reading-discipline is theatre. PK named this as the missed angle tonight.
- ❌ Do NOT build all four Stage 1 roles at once. Architect Reviewer first. Others added as the pattern proves out.
- ❌ Do NOT build all eight Stage 2 systems at once. Meta first. Others added as priority 1 proves out.

---

## The 7-day plan (committed direction, adjust each evening)

All weekdays corrected — today is Saturday 18 April, Sunday 19 April is tomorrow.

### Sunday 19 April — diagnostic + planning day (no heavy build)

**Morning (25 min):** Verification of Saturday's work before any new action.
1. `ai_job.status = 'succeeded'` count > 634 (was the baseline at end of Saturday)
2. At least one new Facebook post published since midnight UTC
3. At least one LinkedIn post with native content (not FB fan-out) — verify by inspecting `m.post_publish` joined to `m.post_draft.platform`
4. At least one Instagram post published (or clear error log if not)
5. `m.post_publish_queue` not accumulating dead rows
6. No new trigger errors in Supabase function logs

**If any fail:** that regression becomes the priority investigation. Rest of Sunday plan deferred.

**If all green (midday 30-45 min):** Update `docs/15_pre_post_sales_criteria.md` to v3. Reflect:
- A9 closed ✅
- A15 closed ✅
- A10 split into A10a (config done) + A10b (first-publish pending verification)
- A11 split into A11a (tokens done) + A11b (prompts remaining)
- A18 reduced by one (7 source-less EFs remaining)
- NEW items added:
  - A19 — FB token refresh (formalise)
  - A20 — Pipeline liveness monitoring (ai_job stall alert + last-success freshness alert)
  - A21 — Trigger ON CONFLICT audit across all 10+ triggers
  - A22 — Ai-worker error surfacing (unchecked UPDATE rollbacks)
  - A23 — D153 live /debug_token cron
  - A24 — Stage 1 external multi-model review layer
  - A25 — Stage 2 bank reconciliation layer
  - A26 — Review discipline (weekly reading + acknowledgement for external layer output)

Update Section G checklist. Push commit. Verify per D150.

**Afternoon (2-3 hours):** Write `docs/briefs/2026-04-19-epistemic-diversity-layer.md`. This is the single authoritative design doc for Stages 1+2 with:
- Stage 1: 4 roles, model assignments, trigger patterns, `m.external_review_queue` schema, prompt templates for each role
- Stage 2: `m.external_reconciliation_result` schema, 4 priority systems (Meta, GitHub, Vercel, Supabase), cron cadence, dashboard surface
- Discipline layer: unread-blocks-dashboard mechanism, weekly review block, 72-hour meta-alert
- Sequence: Architect Reviewer first, Meta reconciliation first, others layered in as proven
- Not-goals explicitly

**Evening:** stop. Don't build anything Sunday. Sunday is diagnostic + planning. Build days start Monday.

### Monday 20 April — Architect Reviewer build (4-6 hours)

Build Stage 1 role 1 (Architect Reviewer). Single highest-ROI external component.

- Edge Function `architect-reviewer` triggered by GitHub webhook on commit to main
- Filter diffs: only proceed if commit touches `supabase/functions/`, triggers, or migration files
- Call Gemini 2.5 Pro with the diff + surrounding context
- Tight prompt: "find structural bugs — ON CONFLICT clause mismatches, RLS gaps, UPDATE-without-error-check patterns, RPC signature mismatches, SECURITY DEFINER scope issues. Only flag if you can describe the specific failure mode and its consequence."
- Write findings to `m.external_review_queue`
- Discipline: dashboard home surfaces unread count

**Retroactive validation:** point it at the 16 April D135 commit. Expected output: flag on ON CONFLICT (post_draft_id) given the unique constraint is (post_draft_id, platform). If it catches that, the pattern is validated. If it doesn't, tune the prompt.

### Tuesday 21 April — Meta reconciliation build (2-3 hours)

Stage 2 system 1 (Meta). Daily 6am Sydney cron:

- For each active FB page: call Meta Graph API `/posts?limit=100&fields=id,created_time,message`
- Compare against `m.post_publish WHERE platform='facebook' AND published_at > NOW() - INTERVAL '48 hours'`
- Any post on Meta's side not in DB → `m.external_reconciliation_result` row with severity=warning
- Any post in DB not on Meta's side → severity=critical
- Dashboard surface: green/amber/red per page

**Retroactive validation:** run backdated against 15-17 April. Expected output: clear discrepancy showing no new NDIS Yarns posts despite ICE thinking publishing was healthy. That's the D155 signature — would have fired on 16 April, not 18.

### Wednesday 22 April — Discipline layer + D153 spec (2-3 hours build, 1 hour spec)

**Morning build:** `m.external_review_queue` dashboard surface. Unread count visible on dashboard home. Clicking "acknowledge" on any item requires filling `action_taken` before dismiss.

**Afternoon spec:** brief for D153 (live `/debug_token` cron). ~45 min to spec, build Thursday or later.

### Thursday 23 April — Sales Advisor (D149) + Devil's Advocate

Claude Project setup for Sales Advisor per D149. Gemini 2.5 Pro Devil's Advocate prompt ready in parallel. First real consultation question:

> "Given Section A status as of today (v3), what's my honest readiness for a first external sales conversation? Which gate items are theatre vs substance?"

Both AIs asked. PK reads both. PK reacts. Log both in `m.advisor_log` (from D149) plus Devil's Advocate counter-response in `m.external_review_queue`.

### Friday 24 April — back to Section A execution

Safety net is up. Return to pre-sales item closure. Candidates:
- A6 (subscription costs) — invoice check, ~1 hour
- A17 (Clock C 7 items) — writing, ~2 hours
- A11b (CFW + Invegent content_type_prompts) — content strategy session, ~3 hours

### Saturday 25 April — week review

What did the external layer catch in its first week? What did it miss? Is the discipline layer being used or ignored? Adjust week 2 plan.

### Sunday 26 + Monday 27 April — rest + Meta escalation trigger

27 April is the escalation date if Meta App Review still In Review. Either escalate via dev support or continue waiting.

---

## Commitments tonight-PK is making to tomorrow-PK

Only three. All small.

1. **25-min verification before anything else Sunday morning.** If green, proceed. If red, regression investigation is the priority.
2. **Update `docs/15` to v3 before any building.** The gate doc currently undercounts real state.
3. **Write the epistemic diversity build spec before any code.** Stage 1+2 are too important to build by vibes.

That's Sunday. Full rest Sunday evening. Monday starts building.

---

## Project integrity read (end-of-day Saturday)

ICE as a project tonight is **healthier than yesterday despite looking worse on paper.**

- Yesterday: silently broken for 7 days, PK didn't know, monitoring gave false confidence
- Tonight: pipeline working, gaps mapped, false-confidence illusion broken, external layer designed

Knowing you're in a mess is strictly better than thinking you're not when you are. Today was a meaningful upgrade to ICE's epistemic state even if it's not a meaningful upgrade to its feature state.

Confidence crashed today is **the correct response to information PK didn't have yesterday.** Calibration recovered beats calibration lost. This is a good day for ICE.

ICE has been running 5 months, produced ~600 successful AI jobs, publishes real content to real platforms for 4 clients, and today surfaced the biggest silent failure that has ever occurred. We caught it. It's fixed. We've designed the layer that would have caught it earlier. And we've designed the sales positioning that turns the discipline into a moat.

For a solo founder with AI tooling: this is a remarkable day, not a bad one.

---

## Final note to tomorrow-PK

If you read this tomorrow and feel the plan is too much: **don't do all of it.** Do verification (25 min) + docs/15 v3 (30 min) + the build spec (2 hours). Stop there if tired. The rest of the week can slip by a day.

If you read this tomorrow and feel the direction is wrong: **push back.** But the burden of proof is on fresh-Claude's argument being materially better than tonight's reasoning, not just different. Tonight we had three hours of careful thinking; fresh-Claude has a cold start.

If you read this tomorrow and something seems missing: **check if it's in the other two surfaces** — sync_state Sunday-first-action section, and D156 in decisions log — before concluding it's been forgotten.

Three surfaces. Any one can decay. At least two will hold.

Close the laptop. Good work today.

— PK + Claude, Saturday 18 April 2026, 22:30 Sydney.
