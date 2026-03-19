# ICE — Session State
**This file is the single source of truth for project state.**
It overrides Claude memory when there is a conflict.
Updated at the end of every session. Read at the start of every session before doing anything else.

Last updated: 20 March 2026
Last session summary: Night of Reckoning continued. AI Diagnostic Agent Tier 1 built and deployed (pipeline-ai-summary, hourly, Claude API). Signal clustering deployed (pg_trgm, cluster_digest_items_v1, bundle_client_v4, select_digest_items_v2 dedup fix). ICE build discipline added — docs/skills/ and docs/build-specs/ framework. D038 committed.

---

## Who is PK

Parveen Kumar. CPA, 20 years finance/analytics. NDIS Plan Manager.
Administrator for Care for Welfare (mobile allied health OT practice, spouse's business).
Building ICE solo, AI-assisted. No traditional dev background.
Communication style: direct, depth-oriented. Wants honest assessment, not validation.
Starts sessions with "what's next task" — orient fast from this file.

**PRIMARY PRINCIPLE — READ THIS FIRST:**
ICE was built to solve PK's personal content problem across multiple businesses.
External clients are a bonus application of infrastructure that already needed to exist.
Never gate build decisions on client ROI. Never treat YouTube or personal brand
features as lower priority than client features.

**Build priority order:**
1. PK's personal businesses — Care for Welfare / NDIS Yarns, Property Buyers Agent (future), NDIS Accessories/FBA (future)
2. PK's personal brand and creative output — YouTube, personal content series
3. External clients — NDIS providers, property professionals (bonus, not driver)

---

## Build Discipline

ICE has a lightweight skills framework in `docs/skills/`. These are thinking prompts, not rules.
Claude reads the relevant skill before starting a build, applies judgment, skips what doesn't apply.

| Building... | Read... |
|---|---|
| Any Edge Function | `docs/skills/edge-function.md` |
| Any SQL migration or DB function | `docs/skills/sql-migration.md` |
| Any Next.js page or component | `docs/skills/dashboard-page.md` |
| Any pipeline change | `docs/skills/pipeline-verification.md` |
| Complex multi-part feature | `docs/build-specs/TEMPLATE.md` |

**The core habit:** verify after deploying, not just after writing. Call the function. Check the rows. Don't declare done until the output is confirmed correct.

---

## What ICE Is

ICE is an AI-operated business system that produces content as its primary output.
Not a content tool that uses AI — a system where AI runs the operation.

Signal-centric pipeline: ingest → canonicalise → score → cluster → bundle → draft → approve → publish.
AI layer: write content + run the system + diagnose failures + improve over time.

Two internal test clients (personal businesses, not paying):
- **NDIS Yarns** — NDIS sector content for Care for Welfare. `client_id: fb98a472-ae4d-432d-8738-2273231c1ef4`
- **Property Pulse** — Property investment content for future buyers agent business. `client_id: 4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`

---

## Infrastructure

| Item | Detail |
|---|---|
| Database | Supabase PostgreSQL. Project ID: `mbkmaxqhsohbtwsqolns` (ap-southeast-2) |
| Edge Functions | Deno/TypeScript. pg_cron scheduling |
| AI primary | Anthropic `claude-sonnet-4-6` |
| AI fallback | OpenAI `gpt-4o` (silent) |
| Frontend | Next.js 14 + Tailwind + shadcn/ui + Supabase Auth on Vercel |
| Vercel team | `pk-2528s-projects` / team ID: `team_kYqCrehXYxW02AycsKVzwNrE` |
| GitHub org | `github.com/Invegent` |
| Docs repo | `Invegent-content-engine` — docs/ folder |

**Vercel Project IDs:**
- invegent-dashboard: `prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg` → `dashboard.invegent.com`
- invegent-portal: `prj_EpPsX7gCu5wGbiSJr1SA3CmjVlAa` → `portal.invegent.com`
- invegent-web: `prj_tXhG43iaqHBtVZpvU3osyG7dLLDZ` → `invegent.com`

**Key Supabase IDs:**
- NDIS Yarns `client_ai_profile_id`: `3cbcd894-fee4-4511-bfe3-f03de422794a`

---

## Platform Publishing Status

| Platform | Status | Notes |
|---|---|---|
| Facebook | ✅ Validated | Publishing live. Visual pipeline active. |
| LinkedIn | 🔴 Blocked | Publisher built + pg_cron live. Community Management API review in progress. Calendar: Wed 25 Mar |
| Instagram | ⬜ Not built | After Meta App Review approved. 0.5 days effort. |
| YouTube | 🟡 Phase 3 | Script generation ready. Video pipeline (Creatomate + ElevenLabs) Phase 3. NOT Phase 4. |
| Email (Resend) | ✅ Configured | SMTP + magic link + notifications live |

---

## Meta App Review Status (as of 19 Mar 2026)

- Privacy Policy URL: ✅ live
- Data Deletion URL: ✅ live
- Business verification: ✅ submitted, In Review
- App icon: ✅ uploaded 19 Mar
- Screencasts: ✅ uploaded 19 Mar (all 3 permissions)
- Data handling + reviewer instructions: ⬜ PENDING — complete before submitting permissions review
- **Next step:** Complete data handling section → await business verification approval → submit permissions review
- Calendar reminder: Wed 1 Apr
- Timeline after submission: 2–8 weeks

---

## Phase Status

### Phase 1 — Stabilise ✅ COMPLETE
All deliverables done. Meta App Review in progress (ongoing, not a Phase 1 blocker).

### Phase 2 — Automate 🟡 MOSTLY COMPLETE
| Deliverable | Status |
|---|---|
| Facebook Insights back-feed (2.1) | ✅ Done |
| Feed Intelligence agent (2.2) | ✅ Done |
| LinkedIn publisher (2.3) | 🔴 Blocked — Community API pending |
| Campaigns / Content Series (2.4) | ✅ Done — Content Series built and live |
| Next.js dashboard (2.5) | ✅ Done. Retool cancelled |
| Public proof dashboard (2.6) | ✅ Done |
| Visual pipeline — image-worker (2.7) | ✅ v1.4.0 deployed 19 Mar. Fonts from GitHub CDN. |
| Content Studio (2.8) | ✅ Done — series + single post |
| Pipeline Doctor (2.9) | ✅ v1.0.0 deployed 19 Mar. 7 checks. Auto-fixes. |
| Pipeline Health Monitoring (2.10) | ✅ Snapshots + doctor log + AI summary + dashboard live. |
| Signal clustering (2.11) | ✅ cluster_digest_items_v1 + bundle_client_v4 deployed 20 Mar |
| Email newsletter ingest | ✅ Done |
| Client portal (portal.invegent.com) | ✅ Done |

**Phase 2 blocked only by LinkedIn API approval.**

### Phase 3 — Expand + Personal Brand 🟡 IN PROGRESS
| Deliverable | Status |
|---|---|
| Portal /performance + /calendar v2 + /feeds | ✅ Done |
| Dashboard feed suggestions panel | ✅ Done |
| AI Diagnostic Agent — Tier 1 | ✅ Done 20 Mar — pipeline-ai-summary, hourly, Claude API |
| Signal clustering | ✅ Done 20 Mar |
| Compliance-aware NDIS system prompt | ⬜ Next — 3 days |
| LinkedIn publisher live | 🔴 Waiting on API |
| Prospect demo generator | ⬜ Planned — 2 days |
| Client health weekly report (email) | ⬜ Planned — 2 days |
| YouTube Shorts pipeline | ⬜ Phase 3 — Creatomate + ElevenLabs |
| Personal YouTube channel as ICE client | ⬜ Phase 3 — PK's personal brand |
| Instagram publisher | ⬜ After Meta App Review |
| Font upload to Supabase Storage | ⬜ 5 min — drag/drop via Supabase dashboard UI |
| First external client (optional) | ⬜ When engine proven on personal businesses |

### Phase 4 — Scale ⬜ PLANNED
See `04_phases.md` for full deliverable list.

---

## Pending Manual Actions (PK to do)

- [ ] Upload Inter-Bold.ttf + Inter-Regular.ttf to Supabase Storage → brand-assets/fonts/ via dashboard UI (drag/drop — 5 min)
- [ ] Complete Meta App Review data handling + reviewer instructions section
- [ ] Watch physio series posts 5pm, 5:15pm, 5:30pm AEDT 20 Mar — confirm visual pipeline end-to-end
- [ ] Google Workspace Admin → feeds@invegent.com → Add aliases: `ndis-yarns@invegent.com`, `property-pulse@invegent.com`
- [ ] Gmail (as feeds@invegent.com) → Create filters for submit/* labels
- [ ] Restore `max_per_day` to normal value (10-15) after testing is complete

---

## Next Scheduled Build

**Compliance-aware NDIS system prompt** (~3 days)

What it does: Research NDIS Code of Conduct + Practice Standards constraints. Rewrite NDIS Yarns `c.client_ai_profile` system prompt to embed compliance awareness at generation time, not post-generation checking. Test against 20 recent drafts. Document in 06_decisions.md.

Why next: Core differentiator for NDIS client sales. Should be in place before any paying client conversation.

---

## Active Pipeline Details

| Worker | Version | Schedule | Status |
|---|---|---|---|
| ingest-worker | — | Every 6h | ✅ Active |
| content-fetch | v2.5 | Every 10m | ✅ Active |
| ai-worker | v2.3.0 | Every 5m | ✅ Active. Claude primary, OpenAI fallback |
| bundler / scorer | v2/v4 | Hourly | ✅ Active. cluster_digest_items_v1 + bundle_client_v4 |
| publisher (Facebook) | v1.4.0 | Every 5m | ✅ Active. Image hold gate |
| linkedin-publisher | v1.1 | Every 15m | 🔴 Built, blocked on API |
| auto-approver | v1.4.0 | Every 10m | ✅ Active. 9-phrase blocklist |
| image-worker | v1.4.0 | Every 15m | ✅ Active. GitHub font CDN |
| insights-worker | — | Daily 3am UTC | ✅ Active |
| feed-intelligence | v7 | Sundays 2am UTC | ✅ Active |
| email-ingest | v2 | Every 2h | ✅ Active |
| draft-notifier | v1.1 | Every 30m | ✅ Active |
| dead letter sweep | — | Daily 2am UTC | ✅ Active |
| pipeline-doctor | v1.0.0 | :15 and :45 each hour | ✅ Active |
| pipeline-health-snapshot | — | :00 and :30 each hour | ✅ Active |
| pipeline-ai-summary | v1.0.0 | :55 each hour | ✅ NEW 20 Mar — Claude Tier 1 diagnosis |

**Feed sources:** 26 active (rss_app + email_newsletter). NDIS.gov.au rejected.

---

## Portal — Pages Live

| Page | Status |
|---|---|
| /login | ✅ Magic link auth |
| /inbox | ✅ Draft approve/reject |
| /calendar | ✅ Month/week/day drawer. Timezone-aware. |
| /performance | ✅ Stats, weekly chart, top posts |
| /feeds | ✅ Read-only feed list + suggest a source |

**Auth pattern:** `getPortalSession()` server-side → `createServiceClient()` with explicit `p_client_id`.
NEVER use `auth_client_id()` with service role key — returns null.

---

## Dashboard — Tabs Live

Overview, Drafts, Queue, Content Studio, Clients, Feeds (+ suggestions panel),
Failures, Pipeline Log (AI summary + doctor + health snapshots), Client Profile, Connect, AI Costs, Roadmap.
All at `dashboard.invegent.com`.

---

## Key Schema Patterns

- **m/c schema writes:** SECURITY DEFINER functions + `.rpc()`. Never direct PostgREST.
- **Portal data fetch:** server API route → `getPortalSession()` → `createServiceClient()` → SQL fn with `p_client_id`.
- **post_draft → client join:** via digest chain OR direct `client_id` on post_draft.
- **Schemas not exposed via PostgREST:** `c` and `f`. Use `exec_sql` RPC or SECURITY DEFINER functions.
- **Timezone:** UTC storage always. Display in `c.client.timezone`. Never browser local time.
- **Signal dedup:** canonical_id dedup at selection + story_cluster_id dedup at bundling. Both layers needed.

---

## Strategic Context

**ICE is an AI-operated business system, not a content tool.**
AI writes the content AND runs, monitors, fixes, and improves the system.

**Priority order:**
1. Care for Welfare / NDIS Yarns — building digital authority, generating referrals
2. Property Pulse — building audience for future property buyers agent business
3. NDIS Accessories/FBA store (future) — audience building now, product research via signal ingest
4. Personal YouTube / creative brand — Phase 3
5. External NDIS clients — when engine proven on above

**Confidence gate:** visual pipeline confirmed (watch physio series 20 Mar) → compliance prompt → first client conversation when ready.
**Client conversation trigger:** when engine is demonstrably running well on PK's own businesses. No rush.
**Key advantage:** CPA + NDIS Plan Manager + OT practice administrator. Insider credibility no agency can replicate.

---

## Development Workflow

**Standard builds:** GitHub MCP + Supabase MCP + Vercel MCP directly in this chat.
**Complex/iterative:** Windows MCP PowerShell or Claude Code.

**Session start:** Read this file → read relevant skill file if building → check PK corrections → proceed.
**Session end:** Update this file → update 04_phases.md if phase changed → update 06_decisions.md for new decisions → update dashboard roadmap page → update memory.

**STANDING RULE:** Whenever docs or memory are updated with ICE progress, ALSO update `app/(dashboard)/roadmap/page.tsx` in invegent-dashboard — specifically the PHASES array and lastUpdated date. Docs + memory + dashboard must stay in sync every session.
