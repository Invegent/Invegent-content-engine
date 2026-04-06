# ICE — Session Action Register
## Generated: April 2026 (Holiday Brainstorm Session)

This document captures all actions arising from the April 2026 brainstorm session.
Covers ICE build items, the new QA framework, audience infrastructure, and IAE concept.

---

## STATUS KEY
🔴 Not started
🟡 In progress
✅ Complete
⏸ Deferred

---

## GROUP A — ICE Immediate (Phase 1 gates everything)

| ID | Action | Status | Notes |
|---|---|---|---|
| A1 | Verify Supabase Pro daily backups active | 🔴 | Non-negotiable. Check dashboard now. |
| A2 | Meta App Review — complete data handling + reviewer instructions | 🟡 | Business verification In Review. Next check 10 Apr 2026. |
| A3 | Phase 1 status check — verify all four done criteria | 🔴 | Run on first session back. Pull live pipeline data. |
| A4 | NDIS Yarns YouTube Brand Account conversion | 🔴 | Identified as next priority 6 Apr session. |

---

## GROUP B — Quality Assurance Framework (New — this session)

The four-layer QA framework. Largest new work item. Sequence matters — B1 must come first.

| ID | Action | Status | Depends On | Notes |
|---|---|---|---|---|
| B1 | Write expected system state document | 🔴 | Nothing | Foundation for B2–B5. Costs no build. Do first. |
| B2 | Developer verification protocol document | 🔴 | B1 | Checklist every build must pass before production deploy. |
| B3 | Automated test runner — m.pipeline_test_expectation + Edge Function | 🔴 | B1, C1 | Runs every 30 min. Pass/fail against expectations. |
| B4 | System audit function — m.run_system_audit() | 🔴 | B1 | SQL function. Structural + operational + data integrity + compliance invariants. |
| B5 | Weekly manager report — extend ai-diagnostic | 🔴 | B4 | Sunday night. Delivered to pk@invegent.com via Resend. |

---

## GROUP C — ICE Phase 2 Build Items

| ID | Action | Status | Depends On | Notes |
|---|---|---|---|---|
| C1 | Facebook Insights back-feed (Phase 2.1) | 🔴 | Phase 1 complete | Critical gate for B3, D4, and IAE. Highest Phase 2 priority. |
| C2 | Content format layer | 🔴 | C1 | Five format types, prompt variants, rotation schedule, carousel output. |
| C3 | Instagram publisher | 🔴 | Meta App Review | Same Meta API. Format adaptation only. |
| C4 | LinkedIn publisher stabilisation | 🟡 | — | Verify stable end-to-end for both clients. |
| C5 | Reddit ingest feed | 🔴 | — | Add r/NDIS to f.feed_source. Intelligence only, no publishing. |

---

## GROUP D — Audience Infrastructure (New — this session)

Low build cost. Start now. Data compounds. By month 6 you have 6 months of audience
growth to show clients — turns IAE sales conversation from hypothetical to concrete.

| ID | Action | Status | Depends On | Notes |
|---|---|---|---|---|
| D1 | Meta Pixel + GA4 — add to onboarding checklist | 🔴 | — | Update docs/09_client_onboarding.md. No build required. |
| D2 | Email capture — add to onboarding checklist | 🔴 | — | Update docs/09_client_onboarding.md. No build required. |
| D3 | m.audience_asset + c.client_audience_policy + m.audience_performance schema | 🔴 | — | Schema only. ~1 week build. Start tracking immediately. |
| D4 | Audience size tracking extension to insights-worker | 🔴 | C1, D3 | Extend insights-worker to also read Meta Custom Audience sizes weekly. |
| D5 | k schema views for audience + format + platform + client intelligence | 🔴 | D3 | Four new views. k synthesises, never stores. |

---

## GROUP E — IAE (Monitor only — do not build)

| ID | Action | Status | Notes |
|---|---|---|---|
| E1 | Monitor IAE prerequisites | ⏸ | See docs/iae/01_iae_prerequisites.md. Revisit when 2–3 paying clients confirmed. |
| E2 | Phase 3.4 Meta boost (ICE feature, not IAE) | ⏸ | Build when Phase 3 begins. Tests whether clients want paid amplification. |

---

## GROUP F — Pending Decisions (Phase 3)

| ID | Action | Status | Notes |
|---|---|---|---|
| F1 | Prospect demo generator | 🔴 | ~1 day. Needed before first external client conversation. |
| F2 | Client health weekly report email | 🔴 | ~2 days. Sunday Edge Function via Resend. |
| F3 | AI compliance rule generator | 🔴 | ANZSCO tasks + code_of_conduct_url → Claude generates draft rules. |
| F4 | Content vertical to topic mapping | 🔴 | Map 13 verticals to relevant topics for bundler precision. |
| F5 | OpenClaw SOUL.md | 🔴 | ICE context for @InvegentICEbot. |

---

## Build Sequence

```
NOW — no build required
  A1 Verify Supabase backups
  B1 Write expected system state document
  D1 Add pixel to onboarding checklist
  D2 Add email capture to onboarding checklist

FIRST SESSION BACK
  A3 Phase 1 status check
  A4 NDIS Yarns YouTube Brand Account
  A2 Meta App Review (when business verification clears)

PHASE 2 BUILD SEQUENCE
  C1 Facebook Insights back-feed        ← gates everything below
  D3 m.audience_asset schema
  B3 Test runner                         ← calibrate against real data
  B4 System audit function
  B5 Weekly manager report
  C2 Content format layer
  D4 Audience size tracking
  D5 k views
  C3 Instagram publisher (after App Review)
  C4 LinkedIn stabilisation
  C5 Reddit ingest feed
  B2 Developer verification protocol

PHASE 3 BUILD SEQUENCE
  F1 Prospect demo generator
  F2 Client health weekly report
  E2 Phase 3.4 Meta boost (ICE feature)
  F3 F4 F5 Remaining pending decisions

NOT YET
  E1 IAE — monitor prerequisites only
```

---

## Action Count

| Group | Count | Build Required |
|---|---|---|
| A — Immediate | 4 | 0 build, 4 operational |
| B — QA Framework | 5 | 1 doc + 4 build |
| C — Phase 2 ICE | 5 | 5 build |
| D — Audience Infrastructure | 5 | 2 doc + 3 build |
| E — IAE (monitor) | 2 | 0 |
| F — Phase 3 Pending | 5 | 5 build |
| **Total** | **26** | **17 build, 6 doc, 3 monitor** |

---

*Last updated: April 2026*
*Source: Holiday brainstorm session — ICE strategy, IAE concept, QA framework*
