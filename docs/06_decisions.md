# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D043 — See previous commits

---

## D044–D055 — See commit 424e91f (31 Mar 2026)

---

## D056 — NDIS Compliance-Aware System Prompt
**Date:** 31 March 2026 | **Status:** ✅ Live

**Problem:**
The NDIS Yarns `brand_identity_prompt` had one generic compliance line: "When content
touches on eligibility, funding, entitlements, or clinical matters, weave this disclaimer
naturally into the post." The 20 active compliance rules in `t.5.7_compliance_rule` —
including 15 hard_block rules — were not embedded at generation time. Violations would
only be caught post-generation by the auto-approver, too late for reliable protection.

**Decision:**
Embed all 20 active compliance rules directly into the `brand_identity_prompt` in
`c.client_brand_profile` for NDIS Yarns. Rules grouped into five structured blocks:
funding & eligibility, clinical claims, dignity & language, regulatory, and disclaimer.

**Changes:**
- `brand_identity_prompt` updated from ~2,600 to 7,625 chars
- New NDIS COMPLIANCE section added after ABSOLUTE PROHIBITIONS
- Existing voice, tone, persona, and format sections preserved unchanged

**Hard-block rules now embedded at generation time:**
- Never assert NDIS will fund specific support (use "may", "where considered reasonable and necessary")
- Never mention specific dollar amounts for NDIS support categories
- Never imply diagnosis automatically qualifies for NDIS
- Never guarantee therapeutic outcomes (use "may support", "research suggests")
- Clinical claims must reference evidence, not provider assertion
- Never write participant stories/case studies (no consent records)
- Never imply special NDIA access or ability to maximise plans
- No sharp practices — no urgency language, inducements, or differential pricing
- Never name or compare other NDIS providers unfavourably
- Plan managers/coordinators must not recommend providers without disclosing relationships
- No specific NDIS decision advice or appeal strategy coaching
- OT scope of practice: don't claim services outside registered AHPRA scope

**Soft-warn rules also embedded:**
- Person-first language as default
- No "vulnerable" as primary descriptor
- Participant agency as central — providers facilitate
- Policy changes reported as announced, not extrapolated
- All policy claims attributed to NDIA/NDIS Commission/DSS

**Review:**
Calendar reminder set for 2 April 2026 to check first drafts under new prompt.
If tone feels too hedged, raise temperature in `client_brand_profile` from 0.72 to 0.76.

**Must be in place before any external client conversation.** This is the pre-sales gate.

---

## D057 — AI Diagnostic Agent Tier 2: pipeline-fixer Edge Function
**Date:** 31 March 2026 | **Status:** ✅ Deployed

**Decision:**
Build a Tier 2 diagnostic layer on top of the existing pipeline-ai-summary (Tier 1).
Tier 1 diagnoses every hour but never acts. Tier 2 takes pre-approved corrective action
automatically, without human involvement, on a defined set of safe reversible operations.

**Architecture:**
Two layers:
- **Layer A** — `pipeline-fixer` Edge Function (deployed, pg_cron job #36, runs :25 and :55)
- **Layer B** — Nightly Auditor Cowork task (already live, runs 2am AEST)

**Layer A: 4 auto-fix actions (all idempotent, safe, reversible):**
1. Unstick locked `m.ai_job` rows (locked > 30 min) → reset to queued
2. Reset failed image renders (`image_status = 'failed'`, approved, > 2h old) → pending for retry
3. Kill orphaned publish queue items (status = 'running' > 20 min) → reset to queued
4. Dead-letter ai_jobs stuck > 7 days → mark dead with reason

**Layer A: 5 escalation detections (alert-only, picked up by Nightly Auditor):**
- `publishing_stalled` — no posts published for active client in >36 hours
- `ai_backlog_critical` — ai_job queue depth > 50 for any client
- `image_pipeline_silent` — 0 image renders in last 48 hours, image generation enabled
- `dead_letter_spike` — dead letter count increased > 10 in last 24 hours
- `health_degraded_persistent` — health_ok = false for 3+ consecutive pipeline-ai-summary runs

**New DB table:**
`m.pipeline_fixer_log` — one row per run, records fixes applied and escalations raised.

**First live run result:** health_ok: true, 0 fixes needed, 0 escalations — system is clean.

**Build spec:** `docs/build-specs/ai-diagnostic-tier2-v1.md`

**What Tier 2 does NOT touch:**
Draft content, approval status, published posts, client configuration, feed sources.
Only queue state and job status — fully reversible with no client-visible impact.

---

## Decisions Pending

| Decision | Context | Target Date |
|---|---|---|
| Activate video formats for clients | Drop D055 trigger, configure YouTube channel IDs | When YouTube channels ready |
| Property Pulse compliance prompt | Financial advice rules, different from NDIS clinical rules | Next session |
| AI Diagnostic Tier 2 — monitor first runs | Watch pipeline_fixer_log for escalations | Apr 1–7 |
| Update c.client_channel with real YouTube channel IDs | OAuth Playground to get refresh tokens | Stage B setup |
| YouTube Stage C — HeyGen avatar, long-form | `video_short_avatar`, `video_long_explainer` | Phase 4 |
| Instagram publisher | 0.5 days after Meta App Review approved | Phase 3 |
| Prospect demo generator | Needs scoping conversation | Phase 3 |
| Client health weekly report (email) | 2 days. Retention driver. | Phase 3 |
| Model router implementation | When AI costs become significant | Phase 4 |
| SaaS vs managed service long-term | When 10 clients served for 3+ months | Phase 4 |
| Upgrade Creatomate to Growth plan | When Phase 3 video pipeline starts | Phase 3 |
| Package source allocation numbers | Define RSS feeds + newsletters per tier | Phase 3 |
| Website chatbot build | Qualifies prospects, routes to form or calendar | Phase 3 |
| Onboarding form build (invegent.com/onboard) | Two-path flow: ready-now vs needs-call | Phase 3 |
| Invegent brand pages setup | Facebook, Instagram, LinkedIn, YouTube for Invegent itself | Phase 3 |
| Pre-recorded onboarding video | Script → Creatomate + ElevenLabs | Phase 3 |
| AI voice assistant | Future Phase 4 — after chatbot proven | Phase 4 |
