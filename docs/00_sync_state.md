# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-12 (session close — 6 briefs executed, full onboarding pipeline live)
> Written by: PK + Claude reconciliation

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
**Legal review required before first external client is signed (L001).**

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2)

| Function | Version | Status | Notes |
|---|---|---|---|
| ai-profile-bootstrap | 1 | ACTIVE | v1.0.0 — NEW 12 Apr |
| ai-worker | 71 | ACTIVE | v2.7.1 |
| auto-approver | 29 | ACTIVE | v1.4.0 |
| brand-scanner | 1 | ACTIVE | v1.0.0 — NEW 12 Apr |
| compliance-monitor | 14 | ACTIVE | monthly hash check |
| compliance-reviewer | 4 | ACTIVE | v1.3.0 |
| content_fetch | 65 | ACTIVE | |
| draft-notifier | 16 | ACTIVE | |
| email-ingest | 15 | ACTIVE | |
| feed-intelligence | 20 | ACTIVE | |
| heygen-avatar-creator | ACTIVE | v2.2.0 | |
| heygen-avatar-poller | ACTIVE | v2.0.0 | |
| heygen-worker | 2 | ACTIVE | v1.1.0 |
| image-worker | 37 | ACTIVE | v3.9.2 |
| ingest | 95 | ACTIVE | v8-youtube-channel |
| insights-worker | 32 | ACTIVE | v14.0.0 |
| inspector | 82 | ACTIVE | |
| inspector_sql_ro | 37 | ACTIVE | |
| linkedin-publisher | 15 | ACTIVE | waiting on API approval |
| onboarding-notifier | 2 | ACTIVE | v2.0.0 |
| pipeline-ai-summary | 14 | ACTIVE | |
| pipeline-doctor | 13 | ACTIVE | |
| publisher | 58 | ACTIVE | |
| series-outline | 15 | ACTIVE | |
| series-writer | 16 | ACTIVE | |
| video-analyser | 4 | ACTIVE | v1.2.0 |
| video-worker | 14 | ACTIVE | v2.1.0 |
| youtube-publisher | 15 | ACTIVE | v1.5.0 |

---

## PIPELINE HEALTH — VERIFIED 12 Apr 2026

| Metric | Value | Status |
|---|---|---|
| Posts published last 7 days | 29 | ✅ Healthy |
| Stuck AI jobs (>2h) | 0 | ✅ Clean |
| k tables documented | 144 | ✅ |

---

## FULL ONBOARDING PIPELINE — LIVE ✅ (12 Apr 2026)

```
Prospect → portal.invegent.com/onboard
  Step 1: Contact + logo upload (optional base64)
  Step 2: Business + service list + NDIS questions
  Step 4: Content objectives multi-select
  → Submit → c.onboarding_submission (form_data JSONB stores ALL fields)
  → onboarding-notifier fires

PK reviews at dashboard.invegent.com/onboarding
  → Sees: Services, NDIS, Objectives, Logo preview sections
  → Sees: 9-item ReadinessChecklist
  → Clicks "Run Scans" (violet button):
      brand-scanner: website scrape → logo → colours → submission JSONB
      ai-profile-bootstrap: Jina + Claude → persona + system prompt → submission JSONB
  → Checklist shows brand + AI results
  → PK approves:
      c.client created
      c.client_brand_profile created (from brand_scan_result)
      c.client_ai_profile created (status='draft', from ai_profile_scan_result)
      portal_user created, magic link sent

Client logs in → portal.invegent.com
  → Left sidebar (desktop) + bottom tab bar (mobile)
  → Amber banner if platforms not connected
  → /connect page: Facebook card (coming soon until Meta approval)

PK activates AI profile (status: draft → active) → content generation starts
```

### Critical fix (12 Apr):
`c.onboarding_submission` had no `form_data` JSONB column.
Added column + updated `submit_onboarding()` to store full payload.
All new submissions now preserve logo, services, NDIS, objectives data.

---

## PORTAL ARCHITECTURE — LIVE (12 Apr 2026)

- **invegent-portal** (`portal.invegent.com`)
  - Left collapsible sidebar (desktop) + bottom tab bar (mobile)
  - Client name + plan + avatar in sidebar footer
  - Inbox badge (pending drafts count)
  - /connect page: platform cards, connected/not connected, OAuth routes built
  - Facebook OAuth: built, gated by `FACEBOOK_OAUTH_ENABLED=true` env var
  - LinkedIn OAuth: built, gated by `LINKEDIN_OAUTH_ENABLED=true` env var
  - Connect banner on home if platforms unconnected

## ENV VARS NEEDED IN VERCEL (invegent-portal) — NOT YET SET

```
NEXT_PUBLIC_PORTAL_URL=https://portal.invegent.com
FACEBOOK_OAUTH_ENABLED=false  ← set true when Meta Standard Access confirmed
FACEBOOK_APP_ID=<from Meta App dashboard>
FACEBOOK_APP_SECRET=<secret>
LINKEDIN_OAUTH_ENABLED=false  ← set true when LinkedIn API approved
LINKEDIN_CLIENT_ID=78im589pktk59k
LINKEDIN_CLIENT_SECRET=<secret>
```

---

## SUPABASE AUTH CONFIG

- **Site URL:** `https://portal.invegent.com`
- **Redirect URLs:** dashboard.invegent.com/**, portal.invegent.com/**, portal.invegent.com/callback
- **SMTP:** Resend configured (noreply@invegent.com, port 465) ✅

---

## VERCEL DEPLOYMENTS

| App | Project ID | Domain | Status |
|---|---|---|---|
| invegent-dashboard | prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg | dashboard.invegent.com | ACTIVE |
| invegent-portal | prj_EpPsX7gCu5wGbiSJr1SA3CmjVlAa | portal.invegent.com | ACTIVE |
| invegent-web | prj_tXhG43iaqHBtVZpvU3osyG7dLLDZ | invegent.com | ACTIVE |

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

---

## TOKEN CALENDAR

| Platform | Client | Expiry |
|---|---|---|
| YouTube | NDIS-Yarns | 7 Apr 2031 |
| YouTube | Property Pulse | 2 Apr 2031 |
| Facebook | Property Pulse | ~6 Jun 2026 (~55d) |
| Facebook | NDIS-Yarns | ~1 Jun 2026 (~50d) |

⚠️ Facebook tokens need refreshing early June 2026.

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| Facebook token expiry ~50 days | MED | Refresh early June 2026 |
| Portal CSS custom properties per client | LOW | Not yet built — reads c.client_brand_profile, applies colours |
| ai-worker: write compliance_flags on generation | MED | Edge Function update needed |
| auto-approver: write approved_by + scores | MED | Edge Function update needed |
| NDIS Support Catalogue data load | MED | Tables exist, need NDIA Excel from ndia.gov.au |
| Meta App Review | 🔴 External | Business verification In Review. Check 14 Apr. |
| LinkedIn API | 🔴 External | Community Management API review. Check 14 Apr. |
| Legal review (L001) | 🔴 Business gate | $2–5k AUD before first external client signs |

---

## WHAT IS NEXT

**Tomorrow (Mon 14 Apr):**
1. Check Meta App Review status — if Standard Access confirmed, set FACEBOOK_OAUTH_ENABLED=true in Vercel
2. Check LinkedIn API status — if approved, set LINKEDIN_OAUTH_ENABLED=true in Vercel

**Next build session options:**
3. Portal CSS custom properties (Brief 018) — client brand colours/logo in portal. Small, ~2hrs.
4. ai-worker update — write compliance_flags on draft generation
5. auto-approver update — write approved_by + auto_approval_scores
6. NDIS Support Catalogue load — requires NDIA Excel file
7. Legal review engagement — find solicitor, brief them

**Decisions pending:**
See docs/06_decisions.md Decisions Pending table.
