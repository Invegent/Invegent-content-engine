# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-18 PM (classification session + PK Q&A + advisor-layer strategic direction)
> Written by: PK + Claude session sync

---

## SESSION STARTUP PROTOCOL

1. Read this file (`docs/00_sync_state.md`)
2. Read `docs/15_pre_post_sales_criteria.md` — **this is now the authoritative pre-sales gate document.** All future sessions evaluate progress against Section G checklist.
3. Read `docs/14_pre_sales_audit_inventory.md` for the underlying findings if context needed
4. Query `k.vw_table_summary` before working on any table
5. **Session-close SOP (new, D150):** before declaring any file committed, run `git ls-remote origin main | grep <sha>` to verify the commit landed. Do not write "committed" in sync_state on trust.

---

## ⚠️ FIRST THING NEXT SESSION

Two parallel tracks:

**Track A — Stability gap closure (unblocks Clock A window start):**
1. A9 — orphan drafts: reframed by PK to feed-assignment issue (12 unassigned feeds need client scoping). Action: assign via Feeds page.
2. A10 — Instagram publisher: fix for v1 (PK decision). Investigate why 0 posts in 7 days despite publisher deployed + prompts live.
3. A11 — CFW + Invegent activation: PK decision — both in Clock A scope. Requires tokens (Brief 041 still blocked on PK) and content_type_prompts.
4. A15 — commit publisher/index.ts and weekly-manager-report/index.ts.

**Track B — Advisor Layer MVP (D149):**
Build one Claude Project: Sales Advisor. Custom instruction + GitHub repo connection (read-only). Ask three questions this week. If responses are usable, stamp out Legal/Risk, Ops Discipline, Product Strategy advisors on the same template over the following fortnight.

When Track A complete → start 14-day Clock A window.
When Clock A green + remaining Section A items closed → first external sales conversation authorised.

---

## 18 APRIL 2026 — FULL SESSION SUMMARY

### Morning: audit reconciliation
- Claude Code ran audit against brief `docs/briefs/2026-04-18-pre-sales-audit.md` (~12 minutes).
- Produced `docs/14_pre_sales_audit_inventory.md` locally. **Commit/push initially failed; file was not on main until session mid-afternoon.** Drift detection: sync_state reported "audit committed" before verifying the commit landed. Handoff protocol gap surfaced. D150 added.
- 38 items surfaced for PK classification, 13 open questions.

### Afternoon: classification session
- `docs/15_pre_post_sales_criteria.md` v1 produced. All 38 audit items + framework-derived items classified into pre-sales (17) / post-sales tier 1 (8) / tier 2 (7) / tier 3 (11) / parked (4).
- 5 fresh-eyes pushbacks surfaced (Section F of docs/15).
- PK answered all 16 open questions. Material reclassifications triggered:
  - H4: solicitor engagement descoped. Direction is pilot structure with liability waiver. **D147** logged.
  - H10: buyer-risk form = "50% off next month if KPIs not met." **D148** logged.
  - H11: CFW + Invegent activated in Clock A scope (promoted to pre-sales).
  - H12: Instagram fix for v1.
  - H16: 8 source-less Edge Functions promoted from Tier 2 to pre-sales (became A18).
  - H6: orphan drafts are not a pipeline bug — they are drafts from unassigned feeds. A9 reframed to feed-assignment item.
  - H13/H14: standing rule — if a table or view has no documented purpose, call Claude API to write one from contents. **D151** logged.
- `docs/15` v2 produced reflecting all above.

### Evening: advisor-layer strategic discussion
- PK identified the real gap: 20+ junior specialist agents (Edge Functions) exist but zero senior peer-level advisors.
- Discussion landed on: four advisors (Sales, Legal/Risk, Ops Discipline, Product Strategy), three architecture options (Claude Projects → Telegram bots → Edge Function wrappers), build MVP-first via Claude Projects.
- **D149** logged.
- Transferable pattern: same four advisors re-pointable at Care for Welfare, property, FBA, personal brand — each business gets the same advisory board reading its own sync_state.

### Portal code check (for H5 + H15 resolution)
- Searched `invegent-portal` for avatar / consent / HeyGen / video-analyser references. Zero hits.
- Confirms: A12 already satisfied at code level (HeyGen not exposed in client-facing portal). A13 confirmed (video-analyser is backend-only, not client-facing — aligns with PK's H15 answer).

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active)
**Gate status:** Pre-sales gate defined in `docs/15_pre_post_sales_criteria.md`. Section G checklist is the authoritative go/no-go for first external sales conversation.

**Headline:** NOT cleared to start 14-day Clock A window today. Three active stability defects block measurement: orphan drafts (reframed to feed assignment), Instagram publishing zero, CFW+Invegent no tokens/prompts. Resolve those, then start the clock.

---

## ALL CLIENTS — FULL STATE

| Client | client_id | Verticals | Feeds | AI | Platforms | Website |
|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | NDIS, AU Disability Policy | 17+ | active | FB ✅ IG ⚠ LI ✅ YT ✅ | none |
| Property Pulse | 4036a6b5 | AU Property ×3 | 20+ | active | FB ✅ IG ⚠ LI ✅ YT ✅ | none |
| Care For Welfare | 3eca32aa | NDIS, AU Disability Policy | 15 | active | FB ⚠ IG ⚠ LI ✅ WP ✅ | careforwelfare.com.au |
| Invegent | 93494a09 | AI & Automation, Social Media, Content Marketing | 5 | active | FB ⚠ IG ⚠ LI ⚠ | invegent.com ✅ blog live |

⚠ = platform profile exists but mode=null / no token / no prompts / not producing

---

## PLATFORM STATUS — ALL CLIENTS

| Platform | Publisher | NY | PP | CFW | Invegent | Notes |
|---|---|---|---|---|---|---|
| Facebook | publisher v1.7.0 | ✅ | ✅ | ⚠ | ⚠ | CFW/Invegent tokens pending PK collection (Brief 041) |
| Instagram | instagram-publisher v1.0.0 | ⚠ | ⚠ | ⚠ | ⚠ | 0 published all clients — A10 pre-sales |
| LinkedIn | linkedin-zapier-publisher v1.0.0 | ✅ | ✅ | ✅ | ⚠ | NY/PP/CFW publishing daily |
| YouTube | youtube-publisher v1.5.0 | ✅ | ✅ | ❌ future | ❌ future | prompts live, 0 recent posts |
| WordPress | wordpress-publisher v1.0.0 | ❌ | ❌ | ✅ active | ❌ | CFW pipeline generating |

---

## CONTENT TYPE PROMPTS — COVERAGE STATE

| Platform | NDIS Yarns | Property Pulse | CFW | Invegent |
|---|---|---|---|---|
| Facebook | ✅ 3 job types | ✅ 3 job types | ❌ A11 pre-sales | ❌ A11 pre-sales |
| Instagram | ✅ 3 job types | ✅ 3 job types | ❌ A11 pre-sales | ❌ A11 pre-sales |
| LinkedIn | ✅ 3 job types | ✅ 3 job types | ❌ A11 pre-sales | ❌ A11 pre-sales |
| YouTube | ✅ 3 job types | ✅ 3 job types | ❌ future | ❌ future |

---

## INFRASTRUCTURE STATE (AS AUDITED 18 APR)

| Metric | Value |
|---|---|
| Edge Functions deployed | 40 |
| Edge Functions with local source | 32 |
| Edge Functions deployed with NO local source | 8 (pre-sales A18) |
| Edge Functions local but not deployed | 2 (ai-diagnostic, linkedin-publisher superseded) |
| Active cron jobs | 42 |
| Active feeds | 40 |
| Deprecated feeds | 20 |
| Tables across managed schemas | 166 |
| Tables with NULL/TODO purpose | 22 (D151 standing rule now applies) |
| SECURITY DEFINER functions in public | 115 |
| Storage buckets (all public) | 4 (brand-assets, client-assets, post-images, post-videos) |
| RLS enabled | 10 of 138 surveyed tables |

---

## META BUSINESS VERIFICATION

| Item | Status |
|---|---|
| 2FA block on PK admin account | ✅ Cleared |
| Shrishti admin 2FA + passkey | ⏳ Pending — PK to chase |
| invegent.com domain DNS TXT verify | ⏳ Pending — DNS propagation issue, needs investigation |
| Business verification | ⏳ In Review |
| App Review | ⏳ In Review — 27 Apr escalation trigger = 9 days |

---

## TOKEN CALENDAR

| Platform | Client | Expiry | Alert |
|---|---|---|---|
| YouTube | NDIS Yarns | 7 Apr 2031 | ✅ |
| YouTube | Property Pulse | 2 Apr 2031 | ✅ |
| Facebook | NDIS Yarns | 31 May 2026 | ⚠ Auto-alert fires ~1 May |
| Facebook | Property Pulse | 14 Jun 2026 | ✅ |
| Facebook | Care For Welfare | NULL — not set | ❌ A11 pre-sales |
| Facebook | Invegent | NULL — not set | ❌ A11 pre-sales |

---

## PIPELINE HEALTH (AS AUDITED 18 APR)

### Publishing last 7 days
| Client | Platform | Posts | Last published |
|---|---|---|---|
| NDIS-Yarns | facebook | 5 | 2026-04-13 |
| NDIS-Yarns | linkedin | 11 | 2026-04-17 |
| Property Pulse | facebook | 4 | 2026-04-15 |
| Property Pulse | linkedin | 18 | 2026-04-17 |
| Care For Welfare | linkedin | 7 | 2026-04-17 |
| **Instagram (all clients)** | **0** | — |
| **YouTube (all clients)** | **0** | — |

### Auto-approver 7-day rolling pass rate
| Client | Total | Approved | Flagged | Rejected | Pass rate |
|---|---|---|---|---|---|
| NDIS-Yarns | 26 | 6 | 8 | 0 | 23.1% |
| Property Pulse | 45 | 11 | 8 | 0 | 24.4% |
| Care For Welfare | 21 | 2 | 5 | 0 | 9.5% |
| (NULL client_id) | 300 | — | — | — | feed-assignment issue (A9) |

**Auto-approver target pass rate NOT YET DEFINED (C1 open).** PK raised correct framing in Q&A: supply-ratio × pass-rate = demand met. 23% is acceptable if supply is high enough. Needs explicit target.

### Open incidents (3)
| Incident | Client | Severity | Detected |
|---|---|---|---|
| ai_queue_depth | NDIS-Yarns | WARNING | 2026-04-17 |
| ai_queue_depth | Property Pulse | WARNING | 2026-04-17 |
| no_drafts_48h | Invegent | CRITICAL | 2026-04-17 (expected — A11) |

### Compliance review queue
4 items AI-reviewed, pending human review since 1 Apr. **17 days stale.** C3 Tier 2.

---

## KNOWN ACTIVE ISSUES (POST-CLASSIFICATION)

All items now have explicit classification in `docs/15_pre_post_sales_criteria.md`. Severity here reflects pre-sales urgency.

| Issue | docs/15 ref | Priority |
|---|---|---|
| Service agreement legal review → pilot waiver structure | A1 (reframed per D147) | Pre-sales |
| Meta App Review status + pilot workaround | A2 | Pre-sales |
| One-page proof document | A3 | Pre-sales |
| NDIS Yarns numbers support proof doc | A4 | Pre-sales (time-based) |
| Buyer-risk clause — 50% off next month KPI miss (D148) | A5 | Pre-sales |
| TBC subscription costs | A6 | Pre-sales |
| Privacy policy refresh (YouTube + HeyGen + video-analyser) | A7 | Pre-sales |
| AI disclosure clause in service agreement | A8 | Pre-sales |
| Orphan drafts = unassigned feeds | A9 (reframed) | Pre-sales |
| Instagram fix for v1 | A10 | Pre-sales |
| CFW + Invegent activation (tokens + prompts) | A11 | Pre-sales |
| Confirm HeyGen hidden in portal | A12 | ✅ CONFIRMED via code search |
| Confirm video-analyser internal-only | A13 | ✅ CONFIRMED via code search |
| RLS verification — no portal route bypasses SECURITY DEFINER | A14 | Pre-sales |
| Commit publisher + weekly-manager-report | A15 | Pre-sales (5 min) |
| Clock A dashboard | A16 | Pre-sales |
| Clock C 7 items defined | A17 | Pre-sales |
| 8 source-less Edge Functions | A18 (promoted from C2 per H16) | Pre-sales |
| Build advisor layer MVP (Sales Advisor Claude Project) | D149 | Parallel to pre-sales track |

### Resolved / closed this session
- ✅ `docs/14_pre_sales_audit_inventory.md` committed (late) — `35dc183` then `1951266` for docs/15
- ✅ 16 open questions answered (H1–H16)
- ✅ H5 + H15 resolved via portal code search
- ✅ D147, D148, D149, D150, D151 logged

---

## ZAPIER LINKEDIN BRIDGE

| Brand | Org URN | Status |
|---|---|---|
| NDIS Yarns | urn:li:organization:112982689 | ✅ |
| Property Pulse | urn:li:organization:112999127 | ✅ |
| Care For Welfare | urn:li:organization:74152188 | ✅ |
| Invegent | urn:li:organization:111966452 | ⚠ no prompts yet |

---

## SUBSCRIPTION REGISTER (13 rows per audit)

| Service | Monthly AUD | Status |
|---|---|---|
| Supabase Pro | $25 | ✅ |
| Creatomate Essential | ~$85 | ✅ |
| Zapier | ~$30 | ✅ |
| Google Workspace (2 users) | $74 | ✅ |
| RSS.app Pro | ~$100 | ✅ |
| Resend | $0 | ✅ |
| GitHub | $0 | ✅ |
| Vercel | TBC | ❓ A6 pre-sales |
| HeyGen | TBC | ❓ A6 pre-sales |
| Claude Max | TBC | ❓ A6 pre-sales |
| OpenAI | TBC | ❓ A6 pre-sales |
| **Confirmed total** | **~$314 AUD/mo** | 4 TBC |

13th row identified per D10 — verify via `SELECT * FROM k.subscription_register`. If purpose missing, D151 rule applies.

---

## NEXT SESSION PRIORITIES

### Build (in order)
1. **Advisor Layer MVP** — Sales Advisor Claude Project (D149). ~1 hour setup.
2. **A9 resolution** — assign 12 unassigned feeds to correct clients. ~30 min via Feeds page.
3. **A15** — commit publisher/index.ts + weekly-manager-report/index.ts. ~5 min.
4. **A3** — one-page proof document using NY numbers. ~2 hours.
5. **A10** — Instagram pipeline investigation. ~2–4 hours.
6. **A11** — CFW token collection + CFW/Invegent content_type_prompts. Requires PK tokens.

### Decide (cheap)
- C1 auto-approver target pass rate — PK single decision.
- CFW profession fix (change 'other' → 'occupational_therapy' in Profile — was listed 17 Apr, still open).

### Watch
- 27 Apr Meta App Review escalation trigger (9 days).
- Shrishti 2FA + passkey (pending her action).
- invegent.com DNS TXT propagation.
- PK Facebook token NY: 31 May (43 days, auto-alert at 30d).
