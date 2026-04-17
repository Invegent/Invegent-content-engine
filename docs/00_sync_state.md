# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-17 (End-of-session full reconciliation — 17 Apr full day session)
> Written by: PK + Claude reconciliation

---

## SESSION STARTUP PROTOCOL

1. Read this file (`docs/00_sync_state.md`)
2. Query k schema before working on any table: `SELECT * FROM k.vw_table_summary WHERE schema_name='x' AND table_name='y'`
3. Do NOT fall into discovery mode.

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active)
**Gate to first external client conversation is OPEN.**
**4 clients, 14 publish profiles, 5 platforms, 63 cron jobs, 42 Edge Functions.**

---

## ALL CLIENTS — FULL STATE

| Client | client_id | Verticals | Feeds | AI | Platforms | Website |
|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | NDIS, AU Disability Policy | 17+ | active | FB ✅ IG ✅ LI ✅ YT ✅ | none |
| Property Pulse | 4036a6b5 | AU Property ×3 | 20+ | active | FB ✅ IG ✅ LI ✅ YT ✅ | none |
| Care For Welfare | 3eca32aa | NDIS, AU Disability Policy | 15 | active | FB ✅ IG ✅ LI ✅ WP ✅ | careforwelfare.com.au |
| Invegent | 93494a09 | AI & Automation, Social Media, Content Marketing | 5 | active | FB ✅ IG ✅ LI ✅ | invegent.com ✅ blog live |

---

## PLATFORM STATUS — ALL CLIENTS

| Platform | Publisher | NY | PP | CFW | Invegent | Notes |
|---|---|---|---|---|---|---|
| Facebook | publisher v1.7.0 | ✅ | ✅ | ✅ | ✅ | 375+ posts. Schedule wiring live. |
| Instagram | instagram-publisher v1.0.0 | ✅ | ✅ | ✅ | ✅ | 0 published — prompts live |
| LinkedIn | linkedin-zapier-publisher v1.0.0 | ✅ | ✅ | ✅ | ✅ | LIVE. First PP post published 15 Apr. |
| YouTube | youtube-publisher v1.5.0 | ✅ | ✅ | ❌ future | ❌ future | prompts live |
| WordPress | wordpress-publisher v1.0.0 | ❌ | ❌ | ✅ active | ❌ | CFW pipeline generating |

---

## CONTENT TYPE PROMPTS — COVERAGE STATE

| Platform | NDIS Yarns | Property Pulse | CFW | Invegent |
|---|---|---|---|---|
| Facebook | ✅ 3 job types | ✅ 3 job types | ❌ pending | ❌ pending |
| Instagram | ✅ 3 job types | ✅ 3 job types | ❌ pending | ❌ pending |
| LinkedIn | ✅ 3 job types | ✅ 3 job types | ❌ pending | ❌ pending |
| YouTube | ✅ 3 job types | ✅ 3 job types | ❌ future | ❌ future |

**CFW and Invegent content_type_prompts:** Pending — needs dedicated content session per client.

---

## 17 APRIL 2026 — FULL BUILD DAY SUMMARY

### Pipeline fixes
- **D135 — Pipeline selection gap FIXED** — `select_digest_candidates()` + cron #62 every 30m. 550 candidates promoted, pipeline unblocked.
- **D127 v2 — Incident auto-resolve FIXED** — rewritten to join through digest_item → digest_run (post_draft.client_id was NULL). Backfilled client_id on all existing post_draft rows.
- **D140 — Score gate disabled** — auto-approver v1.5.0, min_score=0. All final_scores = 0 (old bundler removed). Gate re-enabled when D140 scoring is built.
- **D142 — Demand-aware seeder LIVE** — seed_and_enqueue_ai_jobs_v1 v2. Caps supply to weekly demand × 1.5 buffer. NY: target=9, was generating 147/week (94% waste). PP: target=9, was generating 63/week. Zero new seeds created on first run — queues already over target.
- **Throttle fix** — all publish profiles now have max_per_day=2, min_gap_minutes=240 minimum. NY/PP Facebook retain 360-minute gap. Publisher schedule overrides throttle (D141).

### Dashboard builds (all via Claude Code briefs)
- **D126** Topbar critical count — COUNT(DISTINCT client_id) ✅
- **D127** Incident deduplication — idempotent insert_pipeline_incident ✅
- **D128** Token expiry badge logic — NULL = "Expiry not tracked" ✅
- **D129** Pipeline health card on Overview ✅
- **D130** Engagement tables collapsed behind dev-tier banner ✅
- **D131** Sidebar reorganised — Performance + AI Costs + Compliance → MONITOR ✅
- **D132** Stat cards clickable on Overview ✅
- **D133** AI Costs — projected monthly + cost per post ✅
- **D134** Onboarding moved to Clients tab ✅
- **D136** Schedule grid icon fix ✅
- **D137** Onboarding Run Scans + Activate button ✅
- **D138** YouTube discovery route in feed-discovery (v1.1.0) ✅
- **D139** Feed taxonomy badges — content_origin + added_by ✅
- **Client switch stale state** — key={activeClientId} on VoiceFormatsTab, DigestPolicyTab, AvatarTab, ClientProfileShell ✅
- **Run Scans visible on approved submissions** — status guard removed ✅
- **Brand Identity tab** — logo + colour swatches display added ✅
- **Presenter Identity mapping** — activation function now writes persona_description → presenter_identity ✅

### CFW brand profile — full resolution
- brand-scanner v1.0.1 deployed — URL normalisation (https:// prepend fix)
- CFW client_brand_profile created via migration (AI profile from Facebook scan)
- CFW logo extracted at 70% confidence (OG image from careforwelfare.com.au)
- CFW colours: NULL — site has no theme-color meta tag (manual entry needed)
- CFW profession_slug: 'other' → 'occupational_therapy' ✅
- CFW presenter_identity: backfilled from persona_description ✅

### Decisions logged
- **D141** — Pipeline synthesis & demand-aware seeding — full analysis + 5-perspective review
- **D142** — Demand-aware seeder (BUILT)
- **D143** — Signal content type classifier (GATED — 60 days data)
- **D144** — Signal router platform × format (GATED — 60 days data)
- **D145** — Platform format benchmark table (GATED — research phase)
- **D146** — Feed pipeline score + intelligent retirement (GATED — 60 days data)
- **D140** — Digest item scoring (GATED — Phase 3)

---

## INFRASTRUCTURE STATE

| Metric | Value |
|---|---|
| Edge Functions | 42 (brand-scanner v1.0.1 updated) |
| Active cron jobs | 63 (digest-selector #62, incident-auto-resolver #63 added) |
| Active feeds | 60 |
| Deprecated feeds | 20 |
| content_type_prompt rows | 24 (NY + PP across 4 platforms × 3 job types) |
| f.feed_discovery_seed rows | 9 (all provisioned) |

### Key function versions
- `publisher v1.7.0` — schedule-aware, throttle enforced
- `ai-worker v2.8.0` — format advisor + content generation
- `auto-approver v1.5.0` — min_score=0, body_length + keyword gates only
- `brand-scanner v1.0.1` — URL normalisation fix
- `feed-discovery v1.1.0` — YouTube keyword route added
- `seed_and_enqueue_ai_jobs_v1` — demand-aware v2 (supply capped to weekly demand × 1.5)

---

## AUTO-APPROVER STATE (17 Apr 2026)

| Metric | Value |
|---|---|
| Overall pass rate | 50% (was 6.7% before today) |
| NDIS-Yarns | 57.1% |
| Property Pulse | 26.3% |
| Care For Welfare | 100% (7 drafts, all passed) |
| Top gate failure | body_too_long — 100% of failures |
| Score gate | disabled (min_score=0) — D140 pending |

**PP at 26.3% — body_too_long is the remaining tuning task.** PP prompts may need stricter length constraints than NY.

---

## DASHBOARD — CLIENTS TAB STATE (17 Apr 2026)

| Tab | Status |
|---|---|
| Overview | ✅ Live |
| Profile | ✅ Live — logo + swatches + client switch fixed |
| Voice & Formats | ✅ Live — client switch fixed |
| Digest Policy | ✅ Live — client switch fixed |
| Connect | ✅ Live |
| Feeds | ✅ Live — content_origin + added_by badges |
| Schedule | ✅ Live |
| Avatars | ✅ Live — client switch fixed |
| Onboarding | ✅ Live — Run Scans + Activate, status guard removed |

---

## CFW BRAND PROFILE STATE (17 Apr 2026)

| Field | Value |
|---|---|
| Brand name | Care For Welfare Pty Ltd |
| Brand bio | Full NDIS allied health persona paragraph |
| Brand voice | educational, informative, compassionate, empowering, plain-English |
| Presenter identity | Full persona paragraph (backfilled) |
| System prompt | Full content writer prompt for CFW |
| Logo | ✅ Extracted from OG image (70% confidence) |
| Primary colour | ❌ NULL — site has no theme-color meta tag |
| Secondary colour | ❌ NULL |
| Accent colour | ❌ NULL |
| Profession | occupational_therapy ✅ |
| Notes | Colours need manual entry in Profile tab |

---

## PUBLISH PROFILE THROTTLE STATE (17 Apr 2026)

All profiles now have throttle set. No platform can spam.

| Client | Platform | Mode | Max/day | Min gap |
|---|---|---|---|---|
| NDIS-Yarns | Facebook | auto | 2 | 6h |
| NDIS-Yarns | YouTube | auto | 2 | 6h |
| Property Pulse | Facebook | auto | 2 | 6h |
| Property Pulse | YouTube | auto | 2 | 6h |
| All others | All | null | 2 | 4h |

---

## PIPELINE QUEUE STATE (17 Apr evening)

| Client | Platform | In pipeline | Target | Status |
|---|---|---|---|---|
| NDIS-Yarns | Facebook | 26 | 9 | Draining — seeder paused until below 9 |
| Property Pulse | Facebook | 43 | 9 | Draining — seeder paused until below 9 |
| CFW | Facebook | 21 | 9 | Draining |

AI-worker processing 5 jobs/run every 5 minutes. Queue clears overnight.
Invegent has no content_type_prompts — no drafts can generate (correct).

---

## OPEN INCIDENTS (17 Apr evening)

| Client | Check | Status |
|---|---|---|
| Invegent | no_drafts_48h | ✅ Correct — no prompts written, genuine gap |
| NDIS-Yarns | ai_queue_depth | ⚠️ Transient — queue draining, clears overnight |
| Property Pulse | ai_queue_depth | ⚠️ Transient — queue draining, clears overnight |

---

## META BUSINESS VERIFICATION

| Item | Status |
|---|---|
| 2FA block | ✅ Cleared |
| Business verification | ⏳ In Review |
| App Review | ⏳ In Review — contact dev support if stuck after 27 Apr 2026 |
| invegent.com domain | ⏳ DNS TXT — click Verify when resolved |

---

## TOKEN CALENDAR

| Platform | Client | Expiry | Alert |
|---|---|---|---|
| YouTube | NDIS Yarns | 7 Apr 2031 | ✅ |
| YouTube | Property Pulse | 2 Apr 2031 | ✅ |
| Facebook | NDIS Yarns | 31 May 2026 | ⚠️ Auto-alert fires ~1 May |
| Facebook | Property Pulse | 14 Jun 2026 | ✅ |
| Facebook | Care For Welfare | ~Jun 2026 | ⚠️ Auto-alert at 30d |
| Facebook | Invegent | ~Jun 2026 | ⚠️ Auto-alert at 30d |

---

## WHAT IS NEXT

### OPERATIONAL (you, no build needed)
1. **CFW colours** — enter Primary / Secondary / Accent manually in Clients → CFW → Profile → Brand Identity
2. **CFW content session** — write content_type_prompts for Facebook, Instagram, LinkedIn
3. **Invegent content session** — write content_type_prompts
4. **Assign 12 unassigned feeds** to clients via Feeds page
5. **PP prompt length** — check PP prompts have 250-word constraint (body_too_long at 26.3% pass rate)
6. **Fix animated_data advisor conflict** — Format Library page, remove "NOT YET BUILDABLE" text
7. **Meta domain verify** — click when DNS propagates
8. **Confirm TBC subscriptions** — Vercel, HeyGen, Claude Max, OpenAI

### BUILD (priority order, next sessions)
1. **Phase 2.1 — Insights-worker** — collect engagement data. Gates D143–D146.
2. **Phase 2.6 — Proof dashboard** — live metrics page for first client conversation
3. **D140 — Digest item scoring** — final_score computation on digest_item
4. **D124 — Boost Config UI** — gated on Meta Standard Access
5. **D142 benchmark research** — research Hootsuite/Sprout Social benchmarks for D145 table

### GATED — DO NOT BUILD (60 days data required)
- D143 Signal classifier
- D144 Signal router
- D145 Benchmark table
- D146 Feed pipeline score

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| CFW colours missing | MED | Manual entry needed — site has no meta colour tags |
| CFW + Invegent prompts missing | HIGH | Content session needed |
| PP auto-approver 26.3% | MED | body_too_long — check prompt length constraints |
| Invegent no_drafts_48h incident | LOW | Correct — no prompts written |
| Meta domain verification | MED | DNS TXT propagating |
| 12 feeds unassigned | MED | Assign via Feeds page |
| 4 TBC subscription costs | LOW | Vercel, HeyGen, Claude Max, OpenAI |
| animated_data advisor conflict | LOW | Format Library page edit |

---

## ZAPIER LINKEDIN BRIDGE

| Brand | Org URN | Status |
|---|---|---|
| NDIS Yarns | urn:li:organization:112982689 | ✅ |
| Property Pulse | urn:li:organization:112999127 | ✅ |
| Care For Welfare | urn:li:organization:74152188 | ✅ |
| Invegent | urn:li:organization:111966452 | ✅ |

---

## SUBSCRIPTION REGISTER

| Service | Monthly AUD | Status |
|---|---|---|
| Supabase Pro | $25 | ✅ |
| Creatomate Essential | ~$85 | ✅ |
| Zapier | ~$30 | ✅ |
| Google Workspace (2 users) | $74 | ✅ |
| RSS.app Pro | ~$100 | ✅ |
| Resend | $0 | ✅ |
| GitHub | $0 | ✅ |
| Vercel | TBC | ❓ |
| HeyGen | TBC | ❓ |
| Claude Max | TBC | ❓ |
| OpenAI | TBC | ❓ |
| **Confirmed total** | **~$314 AUD/mo** | 4 TBC |
