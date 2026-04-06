# ICE — Session Action Register
## Generated: April 2026 (Holiday Brainstorm Session)
## Last updated: 7 April 2026 — Session 2

---

## STATUS KEY
🔴 Not started
🟡 In progress
✅ Complete
⏸ Deferred
⚠️ Upcoming deadline

---

## GROUP A — ICE Immediate

| ID | Action | Status | Notes |
|---|---|---|---|
| A1 | Verify Supabase Pro daily backups active | ✅ | Confirmed 7 Apr. Daily physical backups running 16:03 UTC. 7-day retention. |
| A2 | Meta App Review — complete data handling + reviewer instructions | 🟡 | Still In Review as of 7 Apr. LinkedIn also still in review. Next check ~14 Apr. |
| A3 | Phase 1 status check — verify all four done criteria | ✅ | Confirmed 7 Apr. All 4 criteria met. Phase 1 COMPLETE. |
| A4 | NDIS Yarns YouTube Brand Account conversion | ✅ | Confirmed 7 Apr. Connected via dashboard. Token valid until 7 Apr 2031 (1825d). |
| A5 | Reconnect Property Pulse Facebook token | ⚠️ | Expires 15 May 2026 — 38 days. Reconnect before 15 May. Do in dashboard now. |
| A6 | Reconnect NDIS-Yarns Facebook token | ⚠️ | Expires 1 Jun 2026 — 54 days. Reconnect before 1 Jun. Calendar reminder set. |

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
| C1 | Facebook Insights back-feed (Phase 2.1) | 🔴 | Phase 1 ✅ | Phase 1 now confirmed complete. This is the next build priority. |
| C2 | Content format layer | 🔴 | C1 | Five format types, prompt variants, rotation schedule, carousel output. |
| C3 | Instagram publisher | 🔴 | Meta App Review | Same Meta API. Format adaptation only. |
| C4 | LinkedIn publisher stabilisation | 🟡 | — | Verify stable end-to-end for both clients. |
| C5 | Reddit ingest feed | 🔴 | — | Add r/NDIS to f.feed_source. Intelligence only, no publishing. |

---

## GROUP D — Audience Infrastructure

| ID | Action | Status | Depends On | Notes |
|---|---|---|---|---|
| D1 | Meta Pixel + GA4 — add to onboarding checklist | ✅ | — | docs/09_client_onboarding.md updated with Step 7. |
| D2 | Email capture — add to onboarding checklist | ✅ | — | Included in Step 7 of updated onboarding doc. |
| D3 | m.audience_asset + c.client_audience_policy + m.audience_performance schema | ✅ | — | LIVE 7 Apr. 6 audience_asset rows seeded. k catalog updated. |
| D4 | Audience size tracking extension to insights-worker | 🔴 | C1, D3 | Extend insights-worker to read Meta Custom Audience sizes weekly. |
| D5 | k schema views for audience + format + platform + client intelligence | 🔴 | D3 | Four new views. k synthesises, never stores. |

---

## GROUP E — IAE (Monitor only — do not build)

| ID | Action | Status | Notes |
|---|---|---|---|
| E1 | Monitor IAE prerequisites | ⏸ | Revisit when 2–3 paying clients confirmed. docs/iae/01_iae_prerequisites.md |
| E2 | Phase 3.4 Meta boost (ICE feature, not IAE) | ⏸ | Build when Phase 3 begins. |

---

## GROUP F — Pending Decisions (Phase 3)

| ID | Action | Status | Notes |
|---|---|---|---|
| F1 | Prospect demo generator | 🔴 | ~1 day. Needed before first external client conversation. |
| F2 | Client health weekly report email (B5) | 🔴 | ~2 days. Sunday Edge Function via Resend. |
| F3 | AI compliance rule generator | 🔴 | ANZSCO tasks + code_of_conduct_url → Claude generates draft rules. |
| F4 | Content vertical to topic mapping | 🔴 | Map 13 verticals to relevant topics for bundler precision. |
| F5 | OpenClaw SOUL.md | 🔴 | ICE context for @InvegentICEbot. |
| F6 | n8n client success workflow | 🔴 | After C1 live + first paying client. D073. |

---

## Token Expiry Calendar

| Platform | Client | Expires | Days | Action |
|---|---|---|---|---|
| Facebook | Property Pulse | 15 May 2026 | 38d | Reconnect ASAP |
| Facebook | NDIS-Yarns | 1 Jun 2026 | 54d | Reconnect before 25 May |
| YouTube | NDIS-Yarns | 7 Apr 2031 | 1825d | No action needed |
| YouTube | Property Pulse | 2 Apr 2031 | 1820d | No action needed |

---

## Progress Summary — 7 April 2026 (End of Session 2)

| Group | Total | Complete | In Progress | Not Started |
|---|---|---|---|---|
| A — Immediate | 6 | 4 | 1 | 1 |
| B — QA Framework | 5 | 3 | 0 | 2 |
| C — Phase 2 ICE | 5 | 0 | 1 | 4 |
| D — Audience Infrastructure | 5 | 3 | 0 | 2 |
| E — IAE (monitor) | 2 | 0 | 0 | 2 (deferred) |
| F — Phase 3 Pending | 6 | 0 | 0 | 6 |
| **Total** | **29** | **10** | **2** | **17** |

---

## Next Session Priorities

```
1. A5 — Reconnect Property Pulse Facebook token (38 days — do soon)
2. C1 — Facebook Insights back-feed (Phase 1 is confirmed complete, gate is open)
3. B5 — Weekly manager report (brief ready, Claude Code candidate)
4. F1 — Prospect demo generator (first external client prep)
```

---

*Completed this session: A3 (Phase 1 confirmed complete), A4 (YouTube Brand Account),*
*B4 (system audit live 12/12 pass), D3 (audience schema live), D073 (AI agents decision)*
*New items added: A5, A6 (Facebook token expiry), F6 (n8n client success workflow)*
