# ICE — Session State
**This file is the single source of truth for project state.**
It overrides Claude memory when there is a conflict.
Updated at the end of every session. Read at the start of every session before doing anything else.

Last updated: 18 March 2026
Last session summary: Portal /performance, /calendar v2, /feeds + suggestions panel. D025 documented.

---

## Who is PK

Parveen Kumar. CPA, 20 years finance/analytics. NDIS Plan Manager.
Administrator for Care for Welfare (mobile allied health OT practice, spouse's business).
Building ICE solo, AI-assisted. No traditional dev background.
Communication style: direct, depth-oriented. Wants honest assessment, not validation.
Starts sessions with "what's next task" — orient fast from this file.

---

## What ICE Is

Signal-centric AI content pipeline. Ingests information sources, generates
vertical-specific social media content, publishes autonomously.
B2B managed content service targeting NDIS providers at $500–1,500/month.
Property Pulse is secondary vertical / personal brand validation.

Two internal test clients:
- **NDIS Yarns** — NDIS sector news. client_id: `fb98a472-ae4d-432d-8738-2273231c1ef4`
- **Property Pulse** — property investment. client_id: `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`

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
| Docs repo | `Invegent-content-engine` — 8 markdown files in `/docs` |

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
| Facebook | ✅ Validated | Publishing live for both clients |
| LinkedIn | 🔴 Blocked | Publisher built, pg_cron live. Community Management API form submitted. Status: "1 of 2 Access Form Review". May request docs within 10–14 business days. Calendar check: Wed 25 Mar |
| Instagram | ⬜ Not built | Phase 3+ |
| YouTube | ⬜ Not built | Phase 4 |
| Email (Resend) | ✅ Configured | SMTP + magic link working. Not used for content publishing yet |

**Platform validation is the confidence gate — not client count.**
More platforms validated = more confidence in the system sustaining itself.

---

## Meta App Review Status (as of 18 Mar 2026)

- Privacy Policy URL: ✅ live
- Data Deletion URL: ✅ live
- Business verification: ✅ submitted, In Review (~2 working days)
- App icon: needs retry upload
- Screencasts: ✅ recorded for all 3 permissions (pages_manage_posts, pages_read_engagement, pages_show_list)
- **Next step:** Upload screencasts + complete data handling section in App Review dashboard → await business verification approval → submit permissions review
- Calendar reminder set: Wed 1 Apr
- Timeline after submission: 2–8 weeks for decision

---

## Phase Status

### Phase 1 — Stabilise ✅ COMPLETE (except Meta App Review)
| Deliverable | Status |
|---|---|
| Feed quality — 26 active sources | ✅ Done |
| Auto-approver v1.4 — 9-gate logic | ✅ Done |
| Next.js dashboard — all tabs | ✅ Done |
| Both clients publishing 5+ posts/week | ✅ Done |
| Supabase Pro + daily backups | ✅ Done |
| Dead letter queue | ✅ Done |
| Meta App Review | 🟡 In progress — see above |

### Phase 2 — Automate 🟡 MOSTLY COMPLETE
| Deliverable | Status |
|---|---|
| Facebook Insights back-feed (2.1) | ✅ Done |
| Feed Intelligence agent (2.2) | ✅ Done |
| LinkedIn publisher (2.3) | 🔴 Blocked — Community API pending |
| Campaigns (2.4) | ⏸ Deferred to Phase 3 |
| Next.js dashboard all tabs (2.5) | ✅ Done. Retool cancelled Mar 2026 |
| Public proof dashboard (2.6) | ✅ Done |
| Email newsletter ingest | ✅ Done |
| Client portal (portal.invegent.com) | ✅ Done |
| Roadmap tab in dashboard | ✅ Done |
| Feeds page — client filter + attention banner | ✅ Done |

### Phase 3 — Expand 🟡 IN PROGRESS
| Deliverable | Status |
|---|---|
| Portal /performance page | ✅ Done (18 Mar) |
| Portal /calendar v2 | ✅ Done (18 Mar) |
| Portal /feeds (Sources) page | ✅ Done (18 Mar) |
| Dashboard feed suggestions panel | ✅ Done (18 Mar) |
| Brand visual identity in client profile | ⬜ Planned |
| Image worker — sharp, 3 templates | ⬜ Planned — next build Fri 27 Mar |
| Client-submitted content via email | ⬜ Planned — next build Fri 27 Mar |
| Portal settings — roles (contributor/approver) | ⬜ Planned |
| Client onboarding flow (5-step) | ⬜ Planned |
| Boost agent — Facebook Ads API | ⬜ Planned |
| Evergreen content rotation | ⬜ Planned |
| Meta App Review — permissions approved | ⬜ Waiting on Meta |
| First external NDIS provider live | ⬜ Planned |

### Phase 4 — Scale ⬜ PLANNED
See `04_phases.md` for full deliverable list.

---

## Next Scheduled Build

**Friday 27 March 2026 — Visual Pipeline**

Three pieces, build in this order:
1. Brand visual identity fields in `c.client` profile (logo URL, brand colours, image style)
2. `image-worker` Edge Function — sharp library, 3 templates per client, Supabase Storage
3. Client-submitted content via email attachments — `content_origin` + `image_url` + `image_style` on `m.post_draft`, `client_submitted_requires_approval` on `c.client`, portal_user roles (contributor | approver)

---

## Active Pipeline Details

| Worker | Version | Status |
|---|---|---|
| ingest-worker | — | ✅ Active, every 6h |
| content-fetch | v2.5 | ✅ Active. TRUSTED_FREE_DOMAINS bypass, GOVAU_CLOUDFLARE 5 retries + 12h cooldown |
| ai-worker | v2.1.0 | ✅ Active. Primary: anthropic/claude-sonnet-4-6. Fallback: OpenAI |
| bundler | — | ✅ Active |
| publisher (Facebook) | v1.2.0 | ✅ Active, every 15min |
| linkedin-publisher | v1.1 | 🔴 Built, pg_cron every 15min, blocked on API access |
| auto-approver | v1.4.0 | ✅ Active. 9-phrase blocklist. 5-gate logic |
| insights-worker | — | ✅ Active, daily. 116 performance rows collected |
| email-ingest | v2 | ✅ Active, every 2h. feeds@invegent.com. Gmail OAuth stored as Supabase secrets |
| dead letter sweep | — | ✅ Active, daily 2am UTC |

**Feed sources:** 26 active (all rss_app + email_newsletter). NDIS.gov.au tested and rejected.

---

## Portal — Pages Live

| Page | URL | Status |
|---|---|---|
| Login | /login | ✅ Magic link auth |
| Inbox | /inbox | ✅ Draft approve/reject |
| Calendar | /calendar | ✅ Month/week/day drawer. Platform icons. Adjacent month preload |
| Performance | /performance | ✅ Stats, weekly chart, top posts |
| Sources | /feeds | ✅ Read-only feed list + suggest a source form |

**Auth pattern:** `getPortalSession()` server-side → `createServiceClient()` with explicit `p_client_id` param on all SQL functions. Never use `auth_client_id()` with service role key — returns null.

---

## Dashboard — Tabs Live

All tabs live at `dashboard.invegent.com`:
Overview, Drafts, Queue, Clients, Feeds (+ suggestions panel), Failures, Post Studio, Costs, Roadmap.

---

## Key Schema Patterns

- **m/c schema writes:** always via SECURITY DEFINER functions + `.rpc()`. Never direct PostgREST to unexposed schemas.
- **Portal data fetch:** server API route → `getPortalSession()` → `createServiceClient()` → named SQL function with `p_client_id`. Never `auth_client_id()` with service role.
- **Join chain for post_draft → client:** `post_draft → digest_item → digest_run → client` OR direct `client_id` on `post_draft` for manual posts.
- **Schemas not exposed via PostgREST:** `c` and `f`. Use `exec_sql` RPC or SECURITY DEFINER functions.

---

## Email & Notifications

- Resend: ✅ verified and configured
- draft-notifier v1.1: ✅ deployed. Root cause of spam bug fixed via `public.mark_drafts_notified(uuid[])` SECURITY DEFINER function
- Portal magic link: ✅ confirmed working on mobile (same-browser PKCE requirement documented)
- **Gap:** no email confirmation sent to client on feed suggestion submit — deferred, low priority vs first paying client

---

## Deferred / Parked Decisions

| Item | Decision ref | Build trigger |
|---|---|---|
| Client feed feedback (like/dislike → Feed Agent analysis) | D025 | First paying client + Feed Agent validated + rss.app API |
| AI usage ledger + cost attribution | D021 | Phase 2.10 |
| Per-post platform targeting | D022 | Phase 2.11 |
| Model router | — | Phase 4 / AI costs significant |
| rss.app API upgrade | — | 3–4 paying clients, manual overhead becomes real friction |
| Retool folder rename (Ingest, Content_fetch → lowercase) | D013 | Next Claude Code session |

---

## Development Workflow

**Standard builds (most sessions):**
- Author + push via GitHub MCP directly in this chat
- DB changes via Supabase MCP `apply_migration`
- Build verification via Vercel MCP (team: `pk-2528s-projects`)
- No Claude Code needed

**Complex/iterative builds:**
- Use Windows MCP PowerShell or Claude Code for local iteration
- Vercel MCP reads build logs post-deploy

**Session start protocol:**
1. Read this file (`docs/00_session_state.md`) from GitHub
2. Check for any corrections PK gives verbally at session start
3. Orient to next task from "Next Scheduled Build" above
4. Proceed

**Session end protocol:**
1. Update this file with what changed
2. Update `04_phases.md` if phase status changed
3. Update `06_decisions.md` if a new decision was made
4. Update roadmap tab in `invegent-dashboard` if deliverable status changed
5. Update Claude memory if needed

---

## Strategic Context

**Direction B is primary focus:** NDIS managed content service ($500–1,500/month).
**Confidence gate:** platform validation (not client count). Facebook ✅. LinkedIn, Instagram, YouTube still needed.
**First client conversation:** when Meta App Review submitted + NDIS Yarns proof point document prepared.
**Property Pulse:** passive validation. No active decisions until 1,000 followers.
**Key advantage:** founder is CPA + NDIS Plan Manager + OT practice administrator. Insider credibility no agency can replicate.
