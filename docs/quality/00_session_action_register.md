# ICE — Session Action Register
## Generated: April 2026 (Holiday Brainstorm Session)
## Last updated: 7 April 2026

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
| A1 | Verify Supabase Pro daily backups active | ✅ | Confirmed 7 Apr. Daily physical backups running 16:03 UTC. 7-day retention. |
| A2 | Meta App Review — complete data handling + reviewer instructions | 🟡 | Business verification In Review. Check status — past 10 Apr calendar date. |
| A3 | Phase 1 status check — verify all four done criteria | 🔴 | Audit shows both clients publishing. Full 4-criteria check still needed. |
| A4 | NDIS Yarns YouTube Brand Account conversion | 🔴 | Next priority this session. |

---

## GROUP B — Quality Assurance Framework

| ID | Action | Status | Depends On | Notes |
|---|---|---|---|---|
| B1 | Write expected system state document | ✅ | Nothing | docs/quality/01_expected_system_state.md committed. |
| B2 | Developer verification protocol document | ✅ | B1 | docs/quality/02_developer_verification.md committed. |
| B3 | Automated test runner — m.pipeline_test_expectation + Edge Function | 🔴 | B4, C1 | Brief ready: docs/briefs/2026-04-07-qa-framework-phase2.md |
| B4 | System audit function — m.run_system_audit() | ✅ | B1 | LIVE. 12 checks. First audit 7 Apr: 12/12 pass. Weekly cron active (Sun 13:00 UTC). |
| B5 | Weekly manager report — extend ai-diagnostic | 🔴 | B4 | Brief ready: docs/briefs/2026-04-07-qa-framework-phase2.md |

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

## GROUP D — Audience Infrastructure

| ID | Action | Status | Depends On | Notes |
|---|---|---|---|---|
| D1 | Meta Pixel + GA4 — add to onboarding checklist | ✅ | — | docs/09_client_onboarding.md updated with Step 7 (tracking infrastructure). |
| D2 | Email capture — add to onboarding checklist | ✅ | — | Included in Step 7 of updated onboarding doc. |
| D3 | m.audience_asset + c.client_audience_policy + m.audience_performance schema | ✅ | — | LIVE 7 Apr. 6 audience_asset rows seeded. k catalog updated. |
| D4 | Audience size tracking extension to insights-worker | 🔴 | C1, D3 | Extend insights-worker to read Meta Custom Audience sizes weekly. |
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

## Progress Summary — 7 April 2026

| Group | Total | Complete | In Progress | Not Started |
|---|---|---|---|---|
| A — Immediate | 4 | 1 | 1 | 2 |
| B — QA Framework | 5 | 3 | 0 | 2 |
| C — Phase 2 ICE | 5 | 0 | 1 | 4 |
| D — Audience Infrastructure | 5 | 3 | 0 | 2 |
| E — IAE (monitor) | 2 | 0 | 0 | 2 (deferred) |
| F — Phase 3 Pending | 5 | 0 | 0 | 5 |
| **Total** | **26** | **7** | **2** | **17** |

---

## Next Actions This Session

```
1. A4 — NDIS Yarns YouTube Brand Account conversion
2. A2 — Check Meta App Review status (past 10 Apr flag)
3. A3 — Phase 1 full status check (4 criteria)
4. C1 — Begin Facebook Insights back-feed planning
```

---

*Last updated: 7 April 2026 — Session: first back from holiday*
*Completed today: A1, B4 (with weekly cron), D3 (audience schema + 6 seed rows), D1, D2, B1, B2 (docs)*
