# ICE — Session State
**This file is the single source of truth for project state.**
It overrides Claude memory when there is a conflict.
Updated at the end of every session. Read at the start of every session before doing anything else.

Last updated: 2026-04-06
Last session summary: Weekly reconciliation 2026-04-06 — automated. ai-diagnostic v1.0.0 (Tier 2 daily health report) deployed 2 Apr. AI Compliance Reviewer v1.3.0 + Profession Dimension live (D065, D066). k schema fully repaired, 117 tables documented, weekly pg_cron added (D069). Claude Code agentic loop proven — 4 tasks autonomous (D067). YouTube Stage B live — PP YouTube connected, first Short published 1 Apr. Pipeline flow diagram live 31 Mar. m.post_format_performance running daily. Credentials rotated 31 Mar ✅. NDIS Yarns last published 2026-03-01 — investigate pipeline.

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

**The Two-Attempt Rule (D039):** If a fix fails twice using the same approach — stop. Question the tool, not the implementation. Switch approaches before attempt 3. Ask "Is this tool capable?" not "What did I get wrong?"

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
| Visual pipeline | Creatomate API. Project ID: `2f8d12c7-5149-4655-bef2-8f9b5587fd11`. Essential plan $54/mo. |
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

## Claude Desktop MCP Config (updated 30 Mar 2026 — D053)

Config: `C:/Users/parve/AppData/Roaming/Claude/claude_desktop_config.json`

| Server | Command | Notes |
|---|---|---|
| supabase | `C:\Users\parve\AppData\Roaming\npm\mcp-server-supabase.cmd` | Global install. Was npx @latest (caused timeouts). |
| github | `C:\Users\parve\github-mcp-server\github-mcp-server.exe` | Unchanged. |
| xero-care-for-welfare | `C:\Users\parve\AppData\Roaming\npm\xero-mcp-server.cmd` | Global install. Was npx @latest (caused timeouts). |

---

## Platform Publishing Status

| Platform | Status | Notes |
|---|---|---|
| Facebook | ✅ Validated | Publishing live. Visual pipeline active with Creatomate images. |
| LinkedIn | 🔴 Blocked | Publisher built + pg_cron live. Community Management API review in progress. |
| Instagram | ⬜ Not built | After Meta App Review approved. 0.5 days effort. |
| YouTube | 🟡 Phase 3 | Stage A + B built. PP live. NDIS Yarns pending Brand Account conversion. |
| Email (Resend) | ✅ Configured | SMTP + magic link + notifications live |

---

## Meta App Review Status (as of 6 Apr 2026)

- Privacy Policy URL: ✅ live
- Data Deletion URL: ✅ live
- Business verification: ✅ submitted, In Review
- App icon: ✅ uploaded 19 Mar
- Screencasts: ✅ uploaded 19 Mar (all 3 permissions)
- Data handling + reviewer instructions: ⬜ PENDING — complete before submitting permissions review
- **Next step:** Complete data handling section → await business verification approval → submit permissions review
- Calendar reminder: 10 Apr 2026
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
| Campaigns / Content Series (2.4) | ✅ Done |
| Next.js dashboard (2.5) | ✅ Done. Retool cancelled |
| Public proof dashboard (2.6) | ✅ Done |
| Visual pipeline — image-worker (2.7) | ✅ v3.9.1 Creatomate. Carousel fix 31 Mar. |
| Content Studio (2.8) | ✅ Done. Platform filter + YouTube exclusion fixed 21 Mar. |
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
| AI Diagnostic Agent — Tier 1 | ✅ Done 20 Mar. pipeline-ai-summary. |
| Signal clustering | ✅ Done 20 Mar |
| YouTube Stage A + B | ✅ Done 1 Apr. PP YouTube connected + first Short published. NDIS Yarns pending Brand Account. |
| Dashboard nav restructure | ✅ Done 21 Mar — 5 nav items, section tabs, Inbox/Monitor |
| Content Studio platform filter + YouTube exclusion | ✅ Done 21 Mar |
| Timezone handling across dashboard | ✅ Done — UTC storage, display in client.timezone |
| pipeline-ai-summary 500 fix | ✅ Resolved — pipeline healthy per nightly audit |
| Visual format publishing fix | ✅ Resolved — image-worker v3.9.1 carousel fix 31 Mar |
| Compliance-aware NDIS system prompt | ✅ Done 20 Mar. 20 rules injected. compliance-monitor monthly. (D056) |
| Compliance-aware Property Pulse system prompt | ✅ Done. ASIC/AFSL financial advice rules. (D058) |
| m.post_format_performance aggregation | ✅ Done 31 Mar. Daily 3:15am UTC. (D059) |
| Pipeline flow diagram (ReactFlow) | ✅ Done 31 Mar. Live stats, health-coloured nodes, 30s refresh. |
| Unified clients hub + YouTube OAuth dashboard | ✅ Done 1 Apr. Client picker first, Connect tab includes YouTube. |
| AI Diagnostic Tier 2 — daily health report | ✅ Done 2 Apr. ai-diagnostic v1.0.0. Per-client scoring, trends, recommendations, predictions. (D070) |
| Pipeline Doctor log + harvester | ✅ Done 2 Apr. harvest_pipeline_doctor_log(). :17/:47 pg_cron. (D063) |
| Pipeline platform column fix (post_seed) | ✅ Done 2 Apr. post_seed_uniq_run_item_platform. (D062) |
| AI Compliance Reviewer | ✅ Done 2 Apr. compliance-reviewer v1.3.0. Dashboard AI panel live. (D065) |
| Profession Dimension | ✅ Done 2 Apr. t.profession (12 professions). get_compliance_rules(v,p). (D066) |
| k schema governance repair | ✅ Done 2 Apr. 117 tables documented. Weekly pg_cron refresh. (D069) |
| Claude Code agentic loop proven | ✅ Done 2 Apr. Brief → autonomous execution. Pattern adopted. (D067) |
| NDIS Yarns YouTube connected | 🟡 In progress — Brand Account conversion pending |
| LinkedIn publisher live | 🔴 Waiting on API |
| Prospect demo generator | ⬜ Planned |
| Client health weekly report (email) | ⬜ Planned |
| Instagram publisher | ⬜ After Meta App Review |
| Invegent brand pages (FB/IG/LI/YT) | ⬜ Phase 3 |
| Website onboarding flow (D046/D047) | ⬜ Phase 3 |
| Website chatbot (D048) | ⬜ Phase 3 |
| Pre-recorded onboarding video | ⬜ Phase 3 |

### Phase 4 — Scale ⬜ PLANNED
See `04_phases.md` for full deliverable list.

---

## Pending Manual Actions (PK to do)

- [ ] Complete Meta App Review data handling + reviewer instructions section (calendar: 10 Apr)
- [ ] Convert NDIS Yarns YouTube to Brand Account, then connect via dashboard Connect tab
- [ ] Activate NDIS Yarns video formats once YouTube Brand Account connected: `UPDATE c.client_format_config SET is_enabled=true WHERE ice_format_key IN ('video_short_kinetic_voice','video_short_stat_voice')` for NDIS Yarns client
- [ ] Fix Cowork scheduled task UUID (pointing at old Max plan project)
- [ ] Google Workspace Admin → feeds@invegent.com → Add aliases: `ndis-yarns@invegent.com`, `property-pulse@invegent.com`
- [ ] Investigate NDIS Yarns last publish date: 2026-03-01 (35+ days ago) — check if new content is generating and queuing correctly

---

## Active Pipeline Details

| Worker | Version | Schedule | Status |
|---|---|---|---|
| ingest-worker | v91 | Every 6h | ✅ Active |
| content-fetch | v62 | Every 10m | ✅ Active |
| ai-worker | v68 | Every 5m | ✅ Active. v2.7.0: profession-scoped compliance loading (D066) |
| bundler / scorer | — | Hourly | ✅ Active |
| publisher (Facebook) | v55 | Every 5m | ✅ Active |
| linkedin-publisher | v12 | Every 15m | 🔴 Built, blocked on API |
| auto-approver | v26 | Every 10m | ✅ Active |
| image-worker | v36 | Every 15m | ✅ Active. v3.9.1 — carousel image_url fix 31 Mar. |
| video-worker | v13 | Every 30m | ✅ Active. PP video formats live. NDIS Yarns gated pending Brand Account. |
| youtube-publisher | v13 | :15 and :45 | ✅ Active. v1.3.0 — reads refresh token from c.client_channel.config. |
| insights-worker | v29 | Daily 3am UTC | ✅ Active |
| feed-intelligence | v17 | Sundays 2am UTC | ✅ Active |
| email-ingest | v12 | Every 2h | ✅ Active |
| draft-notifier | v13 | Every 30m | ✅ Active |
| dead letter sweep | — | Daily 2am UTC | ✅ Active |
| pipeline-doctor | v13 | :15 and :45 | ✅ Active |
| pipeline-health-snapshot | — | :00 and :30 | ✅ Active |
| pipeline-fixer | v4 | :25 and :55 | ✅ Active. 4 auto-fix actions. (D057) |
| pipeline-ai-summary | v14 | :55 each hour | ✅ Active |
| ai-diagnostic | v1 | Daily | ✅ Active. v1.0.0: Tier 2 daily health report, per-client scoring, trends, recommendations. (D070) |
| compliance-reviewer | v4 | On demand + 1st of month 9:05 UTC | ✅ Active. v1.3.0 — vertical+profession scoped. (D065) |
| compliance-monitor | v11 | 1st of month | ✅ Active |
| series-writer | v13 | On demand | ✅ Active |
| series-outline | v12 | On demand | ✅ Active |

---

## Key Schema Patterns

- **m/c schema writes:** SECURITY DEFINER functions + `.rpc()`. Never direct PostgREST.
- **Portal data fetch:** server API route → `getPortalSession()` → `createServiceClient()` → SQL fn with `p_client_id`.
- **post_draft → client join:** `post_draft → digest_item (digest_item_id) → digest_run (digest_run_id) → client (client_id)`. No direct client_id on post_draft.
- **Schemas not exposed via PostgREST:** `c` and `f`. Use `exec_sql` RPC or SECURITY DEFINER functions.
- **Timezone:** UTC storage always. Display in `c.client.timezone`. Never browser local time.
- **Signal dedup:** canonical_id dedup at selection + story_cluster_id dedup at bundling. Both layers needed.
- **digest_item PK:** `digest_item_id` (not `id`). `c.client` PK: `client_id` (not `id`).
- **Content Studio platforms:** YouTube excluded from picker — goes through video-worker not content_type_prompt.
- **k schema navigation (D068):** Query `k.vw_table_summary` and `k.vw_db_columns` at session start. Do NOT use information_schema for discovery.
- **Compliance rules:** Use `get_compliance_rules(vertical_slug, profession_slug)` SECURITY DEFINER fn. Never query t.5.7_compliance_rule directly in Edge Functions.

---

## Content Studio — Known Behaviour

- YouTube excluded from platform checkboxes — YouTube Shorts go through video-worker, not content_type_prompt
- Platform checkboxes are respected by the API — unchecking Facebook stops generation for Facebook
- Format dropdown shows text/image/animated options only (video formats removed from studio)

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

## Dashboard — Structure

5 nav items: **Inbox / Create / Clients / Monitor / Roadmap**

- Inbox: Drafts + Queue + Failures tabs
- Create: Content Studio (platform filter respected, YouTube excluded)
- Clients: Overview / Profile / Connect / Feeds tabs (Connect includes YouTube OAuth)
- Monitor: Pipeline / Visuals / Compliance / AI Costs / Diagnostics tabs
- Roadmap: Phase + deliverable view, progress bars, external blockers

All at `dashboard.invegent.com`.

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

**Client acquisition architecture (D046–D050):**
- Platform forms → capture leads → redirect to invegent.com/onboard
- Website handles all onboarding: two-path (ready-now form vs needs-call calendar booking)
- Onboarding form: Option A + Hybrid — captures brand voice + platform preferences, PK does technical config
- AI acquisition: chatbot on website first (Phase 3), voice assistant future (Phase 4)
- Invegent gets its own brand pages (runs on ICE) — NDIS Yarns + Property Pulse stay pure sector pages
- Package design: standard tiers + custom; source allocation (feeds per client) is the ICE differentiator

---

## Development Workflow

**Standard builds:** GitHub MCP + Supabase MCP + Vercel MCP directly in this chat.
**Complex/iterative:** Windows MCP PowerShell or Claude Code.
**Autonomous brief execution:** Write brief in `docs/briefs/YYYY-MM-DD-task-name.md` → run Claude Code from `C:\Users\parve\Invegent-content-engine` → prompt: "Read docs/briefs/... and execute all tasks autonomously". (D067)

**Session start:** Read `00_sync_state.md` first → read `00_session_state.md` → read relevant skill file if building → proceed.
**Session end:** Update both state files → update 04_phases.md if phase changed → update 06_decisions.md for new decisions → update dashboard roadmap page → update memory.

**STANDING RULE:** Whenever docs or memory are updated with ICE progress, ALSO update `app/(dashboard)/roadmap/page.tsx` in invegent-dashboard — specifically the PHASES array and lastUpdated date. Docs + memory + dashboard must stay in sync every session.
