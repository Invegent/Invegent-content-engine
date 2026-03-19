# ICE — Session State
**This file is the single source of truth for project state.**
It overrides Claude memory when there is a conflict.
Updated at the end of every session. Read at the start of every session before doing anything else.

Last updated: 19 March 2026
Last session summary: Night of Reckoning. Full day intensive + strategic review. Visual pipeline debugged and deployed. Taxonomy scorer v2, bundler v3, content type prompts fixed. Pipeline Doctor + health monitoring built. Timezone overhaul. Queue page fixed. Pipeline Log dashboard. Strategic reframe: ICE is an AI-operated business system. Personal businesses first — clients are a bonus application. YouTube is Phase 3, not Phase 4. Action plan and Night of Reckoning document produced.

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

## What ICE Is

ICE is an AI-operated business system that produces content as its primary output.
Not a content tool that uses AI — a system where AI runs the operation.

Signal-centric pipeline: ingest → canonicalise → score → draft → approve → publish.
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
| Pipeline Health Monitoring (2.10) | ✅ Snapshots every 30 min. Doctor every 30 min. Dashboard live. |
| Email newsletter ingest | ✅ Done |
| Client portal (portal.invegent.com) | ✅ Done |

**Phase 2 blocked only by LinkedIn API approval.**

### Phase 3 — Expand + Personal Brand 🟡 IN PROGRESS
| Deliverable | Status |
|---|---|
| Portal /performance | ✅ Done |
| Portal /calendar v2 | ✅ Done |
| Portal /feeds | ✅ Done |
| Dashboard feed suggestions panel | ✅ Done |
| AI Diagnostic Agent — Tier 1 | ⬜ Next build — 1 day |
| Signal clustering (dedup at source) | ⬜ Planned — 2 days |
| Compliance-aware NDIS system prompt | ⬜ Planned — 3 days |
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

## What Was Built on 19 March 2026 — Full Log

### Pipeline fixes
- **Taxonomy scorer v2** (`score_digest_items_v2`) — proper multi-word phrases, category distribution. 981 items rescored from all-`interest_rates` to 7 categories.
- **Bundler v3** (`bundle_client_v3`) — enforces `p_max_per_cat=2`. `run_pipeline_for_client` updated.
- **Content type prompts** — all 6 `content_type_prompt` rows updated with `recommended_format`, `recommended_reason`, `image_headline` output fields. 6 drafts reset and requeued.
- **image-worker v1.4.0** — fonts from GitHub raw CDN (rsms/inter v4.0). Non-fatal font loading. Fallback to system fonts if unavailable. WASM from Supabase Storage.
- **Publisher v1.4.0** — `IMAGE_HOLD_MINUTES=30` gate. Holds image-format drafts up to 30 min waiting for image-worker before publishing as text.
- **Episode scheduling fix** — `draft_approve_and_enqueue_scheduled()` reads `c.content_series_episode.scheduled_for`. `set_episode_schedule()` propagates to queue.

### Timezone overhaul
- UTC storage confirmed (unchanged). Display always in `c.client.timezone`. Input always interpreted as client timezone.
- `lib/tz.ts` created: `utcToDatetimeLocal()`, `datetimeLocalToUtc()`, `formatAbsoluteInTz()`, `getTzAbbreviation()`
- `EpisodeRow.tsx`, `SeriesDetail.tsx`, Queue page, Portal CalendarView all updated. AEDT labels showing.
- `get_content_series_detail()` updated to return `client_timezone`.

### Queue page improvements
- Sort changed to ASC (earliest first)
- Draft title column added
- last_error notes column added (shows error reason)
- Orphan queue row deleted

### Pipeline health monitoring
- `m.pipeline_health_log` table created — 30-min snapshots
- `m.take_pipeline_health_snapshot()` function
- pg_cron: `pipeline-health-snapshot-30m` at `*/30 * * * *`

### Pipeline Doctor
- `pipeline-doctor` Edge Function v1.0.0 deployed
- `m.pipeline_doctor_log` table created
- 7 checks: image_worker_health, stuck_running, past_due_queue, image_hold_timeouts, orphaned_ai_jobs, approved_images_due, dead_items
- Auto-fixes: resets failed images, unsticks running items, requeues orphaned jobs, retries transient failures
- pg_cron: `pipeline-doctor-every-30m` at `15,45 * * * *`

### Dashboard updates
- Pipeline Log page (`/pipeline-log`) — doctor findings + health snapshots combined
- Sidebar updated with Pipeline Log nav item
- Favicons uploaded and applied to dashboard + portal

### Daily limit for testing
- Both clients: `max_per_day = 100` (testing mode)

### Strategic outputs
- `ICE_Night_of_Reckoning_19Mar2026.docx` — strategic review document
- Master action plan written (in session)
- D032–D037 decisions recorded in 06_decisions.md

---

## Pending Manual Actions (PK to do)

- [ ] Upload Inter-Bold.ttf + Inter-Regular.ttf to Supabase Storage → brand-assets/fonts/ via dashboard UI (drag/drop — 5 min)
- [ ] Complete Meta App Review data handling + reviewer instructions section
- [ ] Watch physio series posts tomorrow 5pm, 5:15pm, 5:30pm AEDT — confirm visual pipeline end-to-end
- [ ] Google Workspace Admin → feeds@invegent.com → Add aliases: `ndis-yarns@invegent.com`, `property-pulse@invegent.com`
- [ ] Gmail (as feeds@invegent.com) → Create filters for submit/* labels
- [ ] Restore `max_per_day` to normal value (10-15) after testing is complete

---

## Next Scheduled Build

**AI Diagnostic Agent — Tier 1** (highest priority, ~1 day)

What it does: Edge Function runs every hour, reads last 2 doctor logs + 4 health snapshots, calls Claude API, writes plain-English summary to `m.pipeline_ai_summary` table. Dashboard Pipeline Log gets one new section at top: "What happened overnight." No actions — diagnosis only.

Why first: eliminates the daily cost of reading raw log tables. After tonight's session, this is the single highest-value build available.

Next after that:
1. Upload fonts to Storage (5 min, manual)
2. Signal clustering (2 days)
3. Compliance-aware NDIS system prompt (3 days)
4. LinkedIn live when API approves (0.5 days)
5. YouTube Shorts pipeline (Phase 3, 3-4 weeks)

---

## Active Pipeline Details

| Worker | Version | Schedule | Status |
|---|---|---|---|
| ingest-worker | — | Every 6h | ✅ Active |
| content-fetch | v2.5 | Every 10m | ✅ Active. TRUSTED_FREE_DOMAINS bypass |
| ai-worker | v2.3.0 | Every 30m | ✅ Active. Claude primary, OpenAI fallback |
| bundler | v3 | Every 2h | ✅ Active. max 2 per category |
| publisher (Facebook) | v1.4.0 | Every 15m | ✅ Active. Image hold gate |
| linkedin-publisher | v1.1 | Every 15m | 🔴 Built, blocked on API |
| auto-approver | v1.4.0 | Every 10m | ✅ Active. 9-phrase blocklist |
| image-worker | v1.4.0 | Every 15m | ✅ Active. GitHub font CDN. |
| insights-worker | — | Daily 3am UTC | ✅ Active |
| feed-intelligence | v7 | Sundays 2am UTC | ✅ Active |
| email-ingest | v2 | Every 2h | ✅ Active |
| draft-notifier | v1.1 | Every 30m | ✅ Active |
| dead letter sweep | — | Daily 2am UTC | ✅ Active |
| pipeline-doctor | v1.0.0 | :15 and :45 each hour | ✅ NEW 19 Mar |
| pipeline-health-snapshot | — | :00 and :30 each hour | ✅ NEW 19 Mar |

**Feed sources:** 26 active (rss_app + email_newsletter). NDIS.gov.au rejected.
**Content series:** Physio in early childhood (3 eps, 5pm 20 Mar), SMSF (eps 2-5, 4pm 20-23 Mar)

---

## Queue State (as of midnight 19 Mar 2026)

| Client | Posts queued | Next publish |
|---|---|---|
| NDIS Yarns | 9 items | Physio ep1 5pm 20 Mar (image_quote) |
| Property Pulse | 4 items | SMSF ep2 4pm 20 Mar (carousel, image generated) |

All times AEDT. max_per_day = 100 for both (testing mode).

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
Failures, Pipeline Log (NEW), Client Profile, Connect, AI Costs, Roadmap.
All at `dashboard.invegent.com`.

---

## Key Schema Patterns

- **m/c schema writes:** SECURITY DEFINER functions + `.rpc()`. Never direct PostgREST.
- **Portal data fetch:** server API route → `getPortalSession()` → `createServiceClient()` → SQL fn with `p_client_id`.
- **post_draft → client join:** via digest chain OR direct `client_id` on post_draft.
- **Schemas not exposed via PostgREST:** `c` and `f`. Use `exec_sql` RPC or SECURITY DEFINER functions.
- **Timezone:** UTC storage always. Display in `c.client.timezone`. Never browser local time.

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

**Confidence gate:** visual pipeline confirmed working (watch physio series 20 Mar) then AI Diagnostic Agent then signal clustering.
**Client conversation trigger:** when engine is demonstrably running well on PK's own businesses. No rush.
**Key advantage:** CPA + NDIS Plan Manager + OT practice administrator. Insider credibility no agency can replicate.

---

## Development Workflow

**Standard builds:** GitHub MCP + Supabase MCP + Vercel MCP directly in this chat.
**Complex/iterative:** Windows MCP PowerShell or Claude Code.

**Session start:** Read this file → check PK corrections → orient to Next Scheduled Build → proceed.
**Session end:** Update this file → update 04_phases.md if phase changed → update 06_decisions.md for new decisions → update dashboard roadmap page → update memory.

**STANDING RULE:** Whenever docs or memory are updated with ICE progress, ALSO update `app/(dashboard)/roadmap/page.tsx` in invegent-dashboard — specifically the PHASES array and lastUpdated date. Docs + memory + dashboard must stay in sync every session.
