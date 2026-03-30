# ICE — Session State
**This file is the single source of truth for project state.**
It overrides Claude memory when there is a conflict.
Updated at the end of every session. Read at the start of every session before doing anything else.

Last updated: 30 March 2026
Last session summary: Python 3.12 installed. Claude Desktop MCP timeout fixed — Supabase and Xero MCP servers switched from `npx -y @latest` to globally installed npm packages (D053). NDIS zombie drafts confirmed cleared (24 dead via Claude Code, 0 approved remaining). PP has 61 approved drafts not queuing — needs investigation. Action plan work in progress: pipeline-ai-summary 500 fix and visual format fix both attempted by Claude Code, verification pending. 16 Edge Functions bumped. Credentials exposed in Claude Code session — Supabase token, GitHub PAT, Xero secret should be rotated.

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

⚠️ **Credentials to rotate:** Supabase access token, GitHub PAT, and Xero client secret were exposed in a Claude Code session on 30 Mar 2026.

---

## Platform Publishing Status

| Platform | Status | Notes |
|---|---|---|
| Facebook | ✅ Validated | Publishing live. Visual pipeline active with Creatomate images. |
| LinkedIn | 🔴 Blocked | Publisher built + pg_cron live. Community Management API review in progress. |
| Instagram | ⬜ Not built | After Meta App Review approved. 0.5 days effort. |
| YouTube | 🟡 Phase 3 | Stage A + B built. Voice formats ready to activate. |
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
| Campaigns / Content Series (2.4) | ✅ Done |
| Next.js dashboard (2.5) | ✅ Done. Retool cancelled |
| Public proof dashboard (2.6) | ✅ Done |
| Visual pipeline — image-worker (2.7) | ✅ v3.3.0 Creatomate. 1080×1080 PNG. |
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
| YouTube Stage A + B | ✅ Done 20 Mar. Voice formats ready to activate. |
| Dashboard nav restructure | ✅ Done 21 Mar — 5 nav items, section tabs, Inbox/Monitor |
| Content Studio platform filter + YouTube exclusion | ✅ Done 21 Mar |
| Timezone handling across dashboard | ✅ Done — UTC storage, display in client.timezone |
| pipeline-ai-summary 500 fix | 🟡 Attempted 30 Mar — verify |
| Visual format publishing fix | 🟡 Attempted 30 Mar — verify |
| Compliance-aware NDIS system prompt | ⬜ Next major build (~3 days) |
| LinkedIn publisher live | 🔴 Waiting on API |
| AI Diagnostic Tier 2 | ⬜ ~1 Apr 2026 |
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

- [ ] **ROTATE CREDENTIALS** — Supabase access token, GitHub PAT, Xero client secret exposed in Claude Code session 30 Mar
- [ ] Complete Meta App Review data handling + reviewer instructions section (calendar: 1 Apr)
- [ ] Activate video formats: `UPDATE c.client_format_config SET is_enabled=true WHERE ice_format_key IN ('video_short_kinetic_voice','video_short_stat_voice')` — SQL ready
- [ ] Add real YouTube channel IDs to c.client_channel + OAuth refresh tokens
- [ ] Investigate PP 61 approved drafts not entering publish queue — check c.client_publish_profile publish_mode
- [ ] Fix Cowork scheduled task UUID (pointing at old Max plan project)
- [ ] Google Workspace Admin → feeds@invegent.com → Add aliases: `ndis-yarns@invegent.com`, `property-pulse@invegent.com`

---

## Active Pipeline Details

| Worker | Version | Schedule | Status |
|---|---|---|---|
| ingest-worker | v91 | Every 6h | ✅ Active |
| content-fetch | v62 | Every 10m | ✅ Active |
| ai-worker | v65 | Every 5m | ✅ Active. Claude primary, no fallback in last 24h |
| bundler / scorer | — | Hourly | ✅ Active |
| publisher (Facebook) | v55 | Every 5m | ✅ Active |
| linkedin-publisher | v12 | Every 15m | 🔴 Built, blocked on API |
| auto-approver | v26 | Every 10m | ✅ Active |
| image-worker | v31 | Every 15m | ✅ Active |
| video-worker | v10 | Every 30m | ✅ Built. Formats gated off pending channel IDs. |
| youtube-publisher | v7 | :15 and :45 | ✅ Built. Uploads unlisted. Gated off. |
| insights-worker | v29 | Daily 3am UTC | ✅ Active |
| feed-intelligence | v17 | Sundays 2am UTC | ✅ Active |
| email-ingest | v12 | Every 2h | ✅ Active |
| draft-notifier | v13 | Every 30m | ✅ Active |
| dead letter sweep | — | Daily 2am UTC | ✅ Active |
| pipeline-doctor | v10 | :15 and :45 | ✅ Active |
| pipeline-health-snapshot | — | :00 and :30 | ✅ Active |
| pipeline-ai-summary | v11 | :55 each hour | 🟡 500 fix attempted 30 Mar — verify |
| series-writer | v13 | On demand | ✅ Active |
| series-outline | v12 | On demand | ✅ Active |
| compliance-monitor | v11 | 1st of month | ✅ Active |

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
- Clients: Overview / Profile / Connect / Feeds tabs
- Monitor: Pipeline / Visuals / Compliance / AI Costs tabs
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

**Session start:** Read `00_sync_state.md` first → read `00_session_state.md` → read relevant skill file if building → proceed.
**Session end:** Update both state files → update 04_phases.md if phase changed → update 06_decisions.md for new decisions → update dashboard roadmap page → update memory.

**STANDING RULE:** Whenever docs or memory are updated with ICE progress, ALSO update `app/(dashboard)/roadmap/page.tsx` in invegent-dashboard — specifically the PHASES array and lastUpdated date. Docs + memory + dashboard must stay in sync every session.
