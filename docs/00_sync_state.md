# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-12 (session close — 11 briefs executed, full audit trail + B5 weekly report live)
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
| ai-profile-bootstrap | 1 | ACTIVE | v1.0.0 — 12 Apr |
| ai-worker | 72 | ACTIVE | v2.7.1 — writes compliance_flags |
| auto-approver | 30 | ACTIVE | v1.4.0 — writes auto_approval_scores |
| brand-scanner | 1 | ACTIVE | v1.0.0 — 12 Apr |
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
| weekly-manager-report | 1 | ACTIVE | v1.0.0 — NEW 12 Apr |
| youtube-publisher | 15 | ACTIVE | v1.5.0 |

---

## PIPELINE HEALTH — VERIFIED 12 Apr 2026

| Metric | Value | Status |
|---|---|---|
| Posts published last 7 days | 29 | ✅ Healthy |
| Drafts needing review | 1 | ✅ Normal |
| Stuck AI jobs (>2h) | 0 | ✅ Clean |
| Clients active | 3 | Property Pulse, NDIS-Yarns, Care For Welfare |
| k tables documented | 144 | ✅ |
| pg_cron jobs active | 34 | +1 from B5 |

---

## AUDIT TRAIL — FULLY COMPLETE (12 Apr 2026)

All four D088 audit columns now written on every draft from 12 Apr:

| Column | Written by | What |
|---|---|---|
| `approved_by` | auto-approver v1.4.0 | 'auto-agent-v1' or portal_user_id |
| `approved_at` | auto-approver v1.4.0 | Timestamp of approval |
| `auto_approval_scores` | auto-approver v1.4.0 | Full gate results JSONB |
| `compliance_flags` | ai-worker v2.7.1 | [] on pass, [{rule, severity, triggered}] on HARD_BLOCK |

Existing drafts (before 12 Apr) have NULL for auto_approval_scores and compliance_flags. Correct.

---

## FULL ONBOARDING PIPELINE — LIVE ✅ (12 Apr 2026)

```
Prospect → portal.invegent.com/onboard
  Step 1: Contact + logo upload (optional base64)
  Step 2: Business + service list + NDIS questions
  Step 4: Content objectives multi-select
  → Submit → c.onboarding_submission (form_data JSONB stores ALL fields)

PK reviews at dashboard.invegent.com/onboarding
  → Clicks "Run Scans":
      brand-scanner → logo + colours → submission JSONB
      ai-profile-bootstrap → Claude persona + system prompt → submission JSONB
  → PK approves → client + brand profile + AI profile (draft) created atomically

Client logs in → portal.invegent.com
  → Left sidebar with CLIENT BRAND COLOURS + LOGO
  → /connect page: OAuth routes built (gated by env vars)

PK activates AI profile (draft → active) → content generation starts
```

---

## WEEKLY MANAGER REPORT — LIVE ✅ (12 Apr 2026)

- **Function:** weekly-manager-report v1.0.0
- **Schedule:** Monday 7am AEST (Sunday 21:00 UTC) — pg_cron job ID 47
- **Recipient:** pk@invegent.com via Resend
- **Test email confirmed:** 12 Apr 2026 — "ICE Weekly — 29 posts published"
  - Showed 2 alerts (Facebook token expiry warnings for both clients)
- **Next automated report:** Monday 14 Apr 2026 at 7am AEST
- **Alerts trigger:** token expiry <60 days, stuck jobs >0, needs_review >3

---

## PORTAL ARCHITECTURE — FULLY LIVE (12 Apr 2026)

- Left sidebar + mobile bottom bar
- Client logo + brand colours from c.client_brand_profile (CSS custom properties)
- Fallback: #06b6d4 (cyan-500)
- /connect page: OAuth routes built, gated by env vars

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

## SUPABASE AUTH + STORAGE

- **Site URL:** `https://portal.invegent.com`
- **SMTP:** Resend (noreply@invegent.com, port 465) ✅
- **Buckets:** brand-assets (public), client-assets (private), post-images (public), post-videos (public)

---

## VERCEL DEPLOYMENTS

| App | Domain | Status | Last deploy |
|---|---|---|---|
| invegent-dashboard | dashboard.invegent.com | READY | `550cb549` (roadmap update) |
| invegent-portal | portal.invegent.com | READY | `8b4b54b8` (brand colours) |
| invegent-web | invegent.com | ACTIVE | — |

---

## TOKEN CALENDAR

| Platform | Client | Expiry | Days |
|---|---|---|---|
| YouTube | NDIS-Yarns | 7 Apr 2031 | ~1821d |
| YouTube | Property Pulse | 2 Apr 2031 | ~1816d |
| Facebook | NDIS-Yarns | 31 May 2026 | ~49d ⚠️ |
| Facebook | Property Pulse | 5 Jun 2026 | ~54d ⚠️ |

⚠️ Both Facebook tokens under 60 days. Will show in Monday manager report. Refresh early June.

---

## PG_CRON — 34 ACTIVE JOBS (verified 12 Apr)

Full list: `SELECT jobname, schedule FROM cron.job ORDER BY jobname;`

Key additions since last sync:
- `weekly-manager-report-monday-7am-aest` — new, job ID 47

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| Facebook token expiry ~50 days | MED | Will appear in Monday report. Refresh early June. |
| NDIS Support Catalogue data load | MED | Tables exist. Needs NDIA Excel from ndia.gov.au. |
| Care For Welfare not in auto-approver CLIENT_CONFIGS | LOW | Falls to default config — non-blocking |
| Meta App Review | 🔴 External | No progress 12 Apr. Business verification still In Review. |
| LinkedIn API | 🔴 External | No progress 12 Apr. Community Management API review ongoing. |
| Legal review (L001) | 🔴 Business gate | When product confidence reached. Before first external client signs. |

---

## WHAT IS NEXT

**Near term (this week):**
- Monday 14 Apr: first automated manager report arrives
- Download NDIA Support Catalogue Excel from ndia.gov.au for data load task

**Next build session options:**
1. NDIS Support Catalogue data load — requires Excel file
2. Care For Welfare added to auto-approver CLIENT_CONFIGS (30 min patch)
3. F1 Prospect demo generator — hold until NDIS Yarns has more data (~early May)
4. Publisher schedule wiring — c.client_publish_schedule → publisher reads it

**External gates:**
- Meta Standard Access → set FACEBOOK_OAUTH_ENABLED=true + app credentials in Vercel
- LinkedIn API approval → set LINKEDIN_OAUTH_ENABLED=true + secret in Vercel
- Legal review → first external client can sign

**Decisions pending:** See docs/06_decisions.md
