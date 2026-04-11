# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-11 (session close — onboarding pipeline live, portal end-to-end tested)
> Written by: PK + Claude reconciliation

---

## HOW TO USE THIS FILE

At the start of every session involving ICE technical work, read this file
before answering any question or writing any code. It tells you what is
actually deployed right now — not what the docs say should be deployed.
If this file contradicts memory or 04_phases.md, this file wins.

For the full document map, see `docs/00_docs_index.md`.

---

## SESSION STARTUP PROTOCOL

1. Read this file (`docs/00_sync_state.md`)
2. For any table you are about to work with, query k schema FIRST:
   ```sql
   SELECT schema_name, table_name, purpose, columns_list, fk_edges, allowed_ops
   FROM k.vw_table_summary
   WHERE schema_name = 'x' AND table_name = 'y';
   ```
3. Do NOT fall into discovery mode. k.vw_table_summary is the single-stop navigation layer.

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (all 4 criteria verified 7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active)
Phase 2 mostly complete — LinkedIn API blocked externally.

**Gate to first external client conversation is OPEN.**
**Legal review required before first external client is signed.**

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2)

| Function | Version | Status | Notes |
|---|---|---|---|
| ai-worker | 71 | ACTIVE | v2.7.1 |
| auto-approver | 29 | ACTIVE | v1.4.0 |
| compliance-monitor | 14 | ACTIVE | monthly hash check |
| compliance-reviewer | 4 | ACTIVE | v1.3.0 |
| content_fetch | 65 | ACTIVE | |
| draft-notifier | 16 | ACTIVE | |
| email-ingest | 15 | ACTIVE | |
| feed-intelligence | 20 | ACTIVE | |
| heygen-avatar-creator | ACTIVE | v2.2.0 | fire-and-forget photo avatar generation |
| heygen-avatar-poller | ACTIVE | v2.0.0 | state machine, tries api2 endpoints |
| heygen-worker | 2 | ACTIVE | v1.1.0 |
| image-worker | 37 | ACTIVE | v3.9.2 |
| ingest | 95 | ACTIVE | v8-youtube-channel |
| insights-worker | 32 | ACTIVE | v14.0.0 |
| inspector | 82 | ACTIVE | |
| inspector_sql_ro | 37 | ACTIVE | |
| linkedin-publisher | 15 | ACTIVE | waiting on API approval |
| onboarding-notifier | 2 | ACTIVE | v2.0.0 — handles new_submission, needs_info, approved |
| pipeline-ai-summary | 14 | ACTIVE | |
| pipeline-doctor | 13 | ACTIVE | |
| publisher | 58 | ACTIVE | |
| series-outline | 15 | ACTIVE | |
| series-writer | 16 | ACTIVE | |
| video-analyser | 4 | ACTIVE | v1.2.0 |
| video-worker | 14 | ACTIVE | v2.1.0 |
| youtube-publisher | 15 | ACTIVE | v1.5.0 |

---

## NDIS YARNS AVATAR CAST — COMPLETE ✅

All 7 roles × 2 styles = 14 slots assigned with avatar_id + voice_id.

| Role | Realistic | Animated | Voice |
|---|---|---|---|
| NDIS Participant (Alex) | ✅ | ✅ | WaFYykjEkTFpHMit8egg |
| Support Coordinator | ✅ | ✅ | P2AIevlJPypjV8xL6zXE |
| Local Area Coordinator | ✅ | ✅ | tweVhPmvCaH9FHkXStKT |
| Allied Health Provider | ✅ | ✅ | wzGb1z85RFicc4sA2pQ8 |
| Plan Manager | ✅ | ✅ | gmGBcI4Ay4BqAUa6viFq |
| Support Worker | ✅ | ✅ | IAfCHMRVp9GOvZIE0GSv |
| Family / Carer | ✅ | ✅ | zSyIsT1kTH7ds4r1Jf7N |

---

## PROPERTY PULSE AVATAR CAST — COMPLETE ✅ (11 Apr 2026)

All 7 roles × 2 styles = 14 slots. Created manually in HeyGen UI (not via API —
training requirement makes API approach too expensive). All assigned in dashboard.

| Role | Character | Realistic | Animated |
|---|---|---|---|
| First Home Buyer | Jordan (South East Asian, Young Adult, Man) | ✅ | ✅ |
| Property Investor | Michael (South Asian, Early Middle Age, Man) | ✅ | ✅ |
| Mortgage Broker | Rachel (White, Late Middle Age, Woman) | ✅ | ✅ |
| Buyer's Agent | Daniel (Middle Eastern, Early Middle Age, Man) | ✅ | ✅ |
| Real Estate Agent | Lisa (White, Early Middle Age, Woman) | ✅ | ✅ |
| Landlord | Robert (White, Late Middle Age, Man) | ✅ | ✅ |
| Tenant | Aisha (Black, Young Adult, Woman) | ✅ | ✅ |

**Key learning:** HeyGen photo avatar training (20 credits each) is required to get
talking_photo_id from UI-created avatars. API approach (generate → upload → createGroup)
works without training but groups return empty avatar list until trained.
Stock library avatars (like NDIS Yarns) require no training and are free to use.

---

## CLIENT ONBOARDING PIPELINE — LIVE ✅ (11 Apr 2026)

Full end-to-end client onboarding is operational and tested with Care for Welfare.

### Flow
```
Prospect → portal.invegent.com/onboard (public, 7-step form)
  → Submit → c.onboarding_submission created (status: pending)
  → onboarding-notifier fires:
      - Operator email to onboarding@invegent.com
      - Client confirmation email
  → PK reviews at dashboard.invegent.com/onboarding
      - Detail panel: all 7 sections, operator notes
      - Request Info: flag specific fields + write message → client gets email with update link
      - Client updates at portal.invegent.com/onboard/update?id=...&token=...
      - Approve: creates c.client + portal_user + c.client_service_agreement + sends magic link
  → Client receives magic link → portal.invegent.com
  → Portal homepage: stats, recent posts, upcoming queue, drafts banner
```

### DB tables (all live)
| Table | Purpose |
|---|---|
| `c.platform_channel` | 8 channel types seeded |
| `c.service_package` | 4 packages (starter/standard/growth/professional) v1 |
| `c.service_package_channel` | channel/package mappings |
| `c.onboarding_submission` | client form submissions |
| `c.client_service_agreement` | agreements locked at signing |
| `c.client_channel_allocation` | per-client custom overrides |

### Service packages (v1, current)
| Package | Price | Platforms | Posts/week |
|---|---|---|---|
| Starter | $500/mo | Facebook | 10 (5 auto + 5 series) |
| Standard | $900/mo | Facebook + LinkedIn | 13 |
| Growth | $1,500/mo | Facebook + LinkedIn + Instagram | 18 |
| Professional | $2,000/mo | All + YouTube + Email | 22 |

### SECURITY DEFINER functions (all live)
- `public.submit_onboarding(JSONB)` — anon callable, inserts to c.onboarding_submission
- `public.get_onboarding_submissions(TEXT)` — list with package details
- `public.get_onboarding_submission_detail(UUID)` — full detail for review
- `public.request_onboarding_info(UUID, JSONB, TEXT, UUID)` — flags fields, sets update_token
- `public.approve_onboarding(UUID, TEXT)` — creates client + portal_user + agreement
- `public.reject_onboarding(UUID, TEXT, TEXT)` — marks rejected
- `public.update_onboarding_submission(UUID, UUID, JSONB)` — anon callable, client updates
- `public.validate_update_token(UUID, UUID)` — anon callable, returns missing_fields + operator_notes
- `public.get_portal_dashboard(UUID)` — portal homepage stats
- `public.get_portal_recent_posts(UUID, INTEGER)` — recent published posts
- `public.get_portal_upcoming(UUID, INTEGER)` — upcoming queue
- `public.get_portal_weekly_performance(UUID)` — chart data

### Legal
- Service agreement v1.0: `docs/legal/service_agreement_v1.md`
- Clauses marked [LEGAL REVIEW REQUIRED]: NDIS compliance, limitation of liability
- Must be reviewed by solicitor before first external client signs

### Known issues / next session
1. **Portal callback redirects to /inbox instead of /**
   Fix: update `app/(auth)/callback/route.ts` to redirect to `/` not `/inbox`
2. **Platform OAuth connection page missing**
   Clients need to connect Facebook/LinkedIn pages on first login
   This gives ICE permission tokens to publish on their behalf
   Blocked for external Facebook clients until Meta Standard Access confirmed
3. **Publishing schedule view missing from portal**
   Clients should see when content is scheduled per platform
4. **Magic link via Supabase default email unreliable to Hotmail**
   Should route magic links through Resend (same as all other emails)
   Fix: configure custom SMTP in Supabase Auth → use Resend SMTP credentials

---

## TEST CLIENT — CARE FOR WELFARE ✅

| Field | Value |
|---|---|
| client_id | 3eca32aa-e460-462f-a846-3f6ace6a3cae |
| client_name | Care For Welfare Pty Ltd |
| status | active |
| portal_email | parveenkumar11@hotmail.com |
| package | Starter $500/mo |
| agreement | active |
| submission_id | 730049b9-937a-4032-b284-e40cd626ffa1 |

Portal login tested and confirmed working (11 Apr 2026).
Next step: connect Facebook page via OAuth on first login.

---

## SUPABASE AUTH CONFIG (updated 11 Apr 2026)

- **Site URL:** `https://portal.invegent.com` (changed from dashboard.invegent.com)
- **Redirect URLs:** dashboard.invegent.com/**, portal.invegent.com/**, portal.invegent.com/callback

---

## VERCEL DEPLOYMENTS

| App | Project ID | Domain | Status |
|---|---|---|---|
| invegent-dashboard | prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg | dashboard.invegent.com | ACTIVE |
| invegent-portal | prj_EpPsX7gCu5wGbiSJr1SA3CmjVlAa | portal.invegent.com | ACTIVE |
| invegent-web | prj_tXhG43iaqHBtVZpvU3osyG7dLLDZ | invegent.com | ACTIVE |

**Dashboard fix (11 Apr 2026):** ChannelSubscriptions.tsx was not committed to git —
all API routes with module-level createClient() calls fixed (force-dynamic + getSupabase()).
vercel.json added with NODE_VERSION: "20" as safeguard.

---

## PG_CRON JOBS — ALL ACTIVE

| Job | Schedule | Function |
|---|---|---|
| rss-ingest-run-all-hourly | every 6h | ingest /run-all |
| video-worker-every-30min | every 30 min | video-worker |
| heygen-worker-every-30min | every 30 min | heygen-worker |
| youtube-publisher (15 min) | every 15 min | youtube-publisher |
| auto-approver | every 30 min | auto-approver |
| k-schema-refresh-weekly | Sunday 3am UTC | k schema refresh |
| system-audit-weekly | Sunday 13:00 UTC | B4 health check |
| compliance-monitor-monthly | 1st of month | compliance hash check |

Note: heygen-avatar-poller-every-60s was paused — PP avatars now assigned manually.

---

## TOKEN CALENDAR

| Platform | Client | Expiry |
|---|---|---|
| YouTube | NDIS-Yarns | 7 Apr 2031 |
| YouTube | Property Pulse | 2 Apr 2031 |
| Facebook | Property Pulse | ~6 Jun 2026 (~56d) |
| Facebook | NDIS-Yarns | ~1 Jun 2026 (~51d) |

⚠️ Facebook tokens need refreshing in ~50 days.

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| Portal callback → /inbox instead of / | HIGH | Fix next session |
| Platform OAuth connection page missing | HIGH | Build next session |
| Portal publishing schedule view | MED | Build next session |
| Magic link email via Supabase unreliable | MED | Configure Resend SMTP |
| Facebook tokens expiring ~50 days | MED | Refresh early June 2026 |
| Meta App Review | 🔴 External | Business verification In Review. Check 14 Apr. |
| LinkedIn API | 🔴 External | Community Management API review. Check 14 Apr. |
| Legal review | 🔴 Business gate | $2–5k AUD before first external client signs |
| Vercel MCP auth | LOW | Token expires — reconnect via Claude Desktop settings |

---

## WHAT IS NEXT

**Immediate — next session:**
1. Fix portal callback redirect (/ not /inbox) — 5 min fix
2. Build platform OAuth connection page in portal
   - Shows platforms selected at onboarding
   - Connect button per platform initiates OAuth
   - Stores tokens in c.client_channel / publish profile
   - Note: Facebook OAuth for external clients blocked until Meta Standard Access
3. Build portal publishing schedule view
4. Configure Resend SMTP in Supabase Auth for reliable magic link delivery
5. Check Meta App Review + LinkedIn (14 Apr)

**Decisions pending:**
- D084: Platform OAuth connection — use existing Facebook connect flow or new portal-specific flow?
- D085: Magic link delivery — Resend SMTP vs Supabase custom SMTP config
