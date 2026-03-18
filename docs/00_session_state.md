# ICE — Session State
**This file is the single source of truth for project state.**
It overrides Claude memory when there is a conflict.
Updated at the end of every session. Read at the start of every session before doing anything else.

Last updated: 18 March 2026
Last session summary: Portal /performance, /calendar v2, /feeds + suggestions + email confirmation. D025 client feed feedback deferred. D026 email architecture designed. 00_session_state.md created as ground truth.

---

## Who is PK

Parveen Kumar. CPA, 20 years finance/analytics. NDIS Plan Manager.
Administrator for Care for Welfare (mobile allied health OT practice, spouse's business).
Building ICE solo, AI-assisted. No traditional dev background.
Communication style: direct, depth-oriented. Wants honest assessment, not validation.
Starts sessions with "what's next task" — orient fast from this file.
Confidence gate is platform validation, not client count. More platforms validated = more confidence system sustains itself.

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
| Docs repo | `Invegent-content-engine` — 9 markdown files in `/docs` |

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
| LinkedIn | 🔴 Blocked | Publisher built, pg_cron live. Community Management API "1 of 2 Access Form Review". Calendar check: Wed 25 Mar |
| Instagram | ⬜ Not built | Phase 3+ |
| YouTube | ⬜ Not built | Phase 4 |
| Email (Resend) | ✅ Configured | SMTP + magic link + feed suggestion confirmation emails |

**Platform validation is the confidence gate — not client count.**

---

## Meta App Review Status (as of 18 Mar 2026)

- Privacy Policy URL: ✅ live
- Data Deletion URL: ✅ live
- Business verification: ✅ submitted, In Review
- App icon: needs retry upload
- Screencasts: ✅ recorded for all 3 permissions
- **Next step:** Upload screencasts to App Review + complete data handling section → await business verification → submit permissions review
- Calendar reminder: Wed 1 Apr
- Timeline after submission: 2–8 weeks

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
| Meta App Review | 🟡 In progress |

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
| Portal /calendar v2 | ✅ Done (18 Mar). Month/week/day drawer, platform icons |
| Portal /feeds (Sources) page | ✅ Done (18 Mar). Read-only + suggest a source |
| Dashboard feed suggestions panel | ✅ Done (18 Mar). Approve/reject workflow |
| Feed suggestion email confirmation | ✅ Done (18 Mar). Needs RESEND_API_KEY in portal Vercel env |
| Brand visual identity in client profile | ⬜ Planned — Fri 27 Mar |
| Image worker — SVG→Resvg WASM→PNG→Storage | ⬜ Planned — Fri 27 Mar (NOT sharp — see D026) |
| Client-submitted content via email (submit/* labels) | ⬜ Planned — Fri 27 Mar |
| Portal settings — roles (contributor/approver) | ⬜ Planned |
| Client onboarding flow (5-step) | ⬜ Planned |
| Boost agent — Facebook Ads API | ⬜ Planned |
| Evergreen content rotation | ⬜ Planned |
| Meta App Review — permissions approved | ⬜ Waiting on Meta |
| First external NDIS provider live | ⬜ Planned |

### Phase 4 — Scale ⬜ PLANNED
See `04_phases.md` for full deliverable list.

---

## Pending Manual Actions (PK to do)

- [ ] Add `RESEND_API_KEY` + `NOTIFY_FROM=notifications@invegent.com` to invegent-portal Vercel env vars → redeploy
- [ ] Upload screencasts to Meta App Review + complete data handling section + retry app icon upload
- [ ] Google Workspace Admin → feeds@invegent.com → Add aliases: `ndis-yarns@invegent.com`, `property-pulse@invegent.com`
- [ ] Gmail (as feeds@invegent.com) → Create filters: To: ndis-yarns → label `submit/ndis-yarns` | To: property-pulse → label `submit/property-pulse`

---

## Next Scheduled Build

**Friday 27 March 2026 — Visual Pipeline**

Build in this order:
1. Brand visual identity fields on `c.client` (logo URL, primary colour, secondary colour, image style)
2. Supabase Storage bucket `post-images` (public, image/* mime types)
3. `image-worker` Edge Function — SVG template → Resvg WASM → PNG → Storage. NOT sharp (native binary unreliable in Deno)
4. `image_url` + `image_style` + `content_origin` columns on `m.post_draft`
5. `client_submitted_requires_approval` flag on `c.client`
6. `role` column (contributor | approver) on `public.portal_user`
7. email-ingest Edge Function update — add `submit/*` label routing branch for client submissions

---

## Email Architecture (feeds@invegent.com) — D026

`feeds@invegent.com` is a full Workspace account (not an alias).
All inbound email routing is label-based. Two namespace prefixes:

| Label pattern | Purpose | Routing |
|---|---|---|
| `newsletter/vertical` | Vertical newsletters — shared across all clients | All clients in that vertical via bundler |
| `newsletter/client-slug/pub` | Client-specific newsletter | Named client only |
| `submit/client-slug` | Client content submission | Named client pipeline direct to draft |

Client submission aliases on feeds@invegent.com:
- `ndis-yarns@invegent.com` → label `submit/ndis-yarns` (pending setup)
- `property-pulse@invegent.com` → label `submit/property-pulse` (pending setup)

No new OAuth credentials, no new account, no new Edge Function needed.
Same email-ingest function reads `submit/*` labels and routes per client.

---

## Image Generation — Visual Pipeline Decision

**Do NOT use sharp.** Native libvips binaries are unreliable in Supabase Deno Edge Functions.

**Use instead:** SVG template (pure TypeScript string) → `npm:@resvg/resvg-wasm` → PNG → Supabase Storage.
This is the pattern Supabase's own OG image examples use. Pure WASM, no native dependencies, confirmed Deno-compatible.

**Supabase Storage:** Zero buckets currently. Create `post-images` bucket as part of Fri 27 Mar build.

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
| email-ingest | v2 | ✅ Active, every 2h. feeds@invegent.com. Gmail OAuth in Supabase secrets |
| dead letter sweep | — | ✅ Active, daily 2am UTC |
| draft-notifier | v1.1 | ✅ Active, every 30min. Marks drafts after notification |

**Feed sources:** 26 active (rss_app + email_newsletter). NDIS.gov.au rejected.

---

## Portal — Pages Live

| Page | Status |
|---|---|
| /login | ✅ Magic link auth |
| /inbox | ✅ Draft approve/reject |
| /calendar | ✅ Month/week/day drawer. Platform icons (FB/LI/IG/Email). Adjacent month preload |
| /performance | ✅ Stats, weekly chart, top posts. Auth bug fixed (explicit p_client_id) |
| /feeds | ✅ Read-only feed list + suggest a source + Resend email confirmation |

**Auth pattern:** `getPortalSession()` server-side → `createServiceClient()` with explicit `p_client_id`.
NEVER use `auth_client_id()` with service role key — returns null.

---

## Dashboard — Tabs Live

Overview, Drafts, Queue, Clients, Feeds (+ suggestions panel), Failures, Post Studio, Costs, Roadmap.
All at `dashboard.invegent.com`.

---

## Key Schema Patterns

- **m/c schema writes:** SECURITY DEFINER functions + `.rpc()`. Never direct PostgREST.
- **Portal data fetch:** server API route → `getPortalSession()` → `createServiceClient()` → SQL fn with `p_client_id`.
- **post_draft → client join:** via digest chain OR direct `client_id` on post_draft for manual posts.
- **Schemas not exposed via PostgREST:** `c` and `f`. Use `exec_sql` RPC or SECURITY DEFINER functions.

---

## Deferred / Parked Decisions

| Item | Ref | Build trigger |
|---|---|---|
| Client feed feedback (like/dislike → Feed Agent) | D025 | First paying client + Feed Agent validated + rss.app API |
| AI usage ledger + cost attribution | D021 | Phase 2.10 |
| Per-post platform targeting | D022 | Phase 2.11 |
| email-ingest submit/* label routing | D026 | Fri 27 Mar visual pipeline build |
| Model router | — | Phase 4 |
| rss.app API upgrade | — | 3–4 paying clients |
| Retool folder rename (Ingest, Content_fetch) | D013 | Next Claude Code session |

---

## Development Workflow

**Standard builds:** GitHub MCP + Supabase MCP + Vercel MCP directly in this chat. No Claude Code.
**Complex/iterative:** Windows MCP PowerShell or Claude Code.

**Session start:** Read this file from GitHub → check PK corrections → orient to Next Scheduled Build → proceed.
**Session end:** Update this file → update 04_phases.md if needed → update 06_decisions.md if needed → update dashboard roadmap page → update memory if needed.

---

## Strategic Context

**Direction B is primary:** NDIS managed content service ($500–1,500/month).
**Confidence gate:** platform validation. Facebook ✅. LinkedIn 🔴. Instagram ⬜. YouTube ⬜.
**First client conversation:** Meta App Review submitted + NDIS Yarns proof point document prepared.
**Property Pulse:** passive validation. No active decisions until 1,000 followers.
**Key advantage:** CPA + NDIS Plan Manager + OT practice administrator. Insider credibility no agency can replicate.
