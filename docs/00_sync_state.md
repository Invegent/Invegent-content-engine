# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-12 (doc review — cron jobs corrected, decisions log cleaned)
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
| Drafts needing review | 1 | ✅ Normal |
| Stuck AI jobs (>2h) | 0 | ✅ Clean |
| Clients active | 3 | Property Pulse, NDIS-Yarns, Care For Welfare |
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
  → Left sidebar with CLIENT BRAND COLOURS + LOGO (CSS custom properties)
  → Amber connect banner if platforms unconnected
  → /connect page: platform cards, OAuth routes built, gated by env vars

PK activates AI profile (status: draft → active) → content generation starts
```

Critical fix (12 Apr): c.onboarding_submission had no form_data JSONB column — added.

---

## PORTAL ARCHITECTURE — FULLY LIVE (12 Apr 2026)

- Left collapsible sidebar (desktop) + bottom tab bar (mobile)
- Client logo in sidebar top badge (fallback to "I")
- Active nav items + avatar circle in brand primary colour (CSS vars)
- Brand colours appear automatically on next login after brand-scanner runs
- Fallback: #06b6d4 (cyan-500) — zero visual regression without brand profile

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

## STORAGE BUCKETS

| Bucket | Public | Purpose |
|---|---|---|
| brand-assets | true | Brand visual assets (pre-existing) |
| client-assets | false | Logo uploads per submission — NEW 12 Apr |
| post-images | true | Generated post images |
| post-videos | true | Generated post videos |

---

## VERCEL DEPLOYMENTS

| App | Project ID | Domain | Status | Last deploy |
|---|---|---|---|---|
| invegent-dashboard | prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg | dashboard.invegent.com | READY | `550cb549` |
| invegent-portal | prj_EpPsX7gCu5wGbiSJr1SA3CmjVlAa | portal.invegent.com | READY | `8b4b54b8` |
| invegent-web | prj_tXhG43iaqHBtVZpvU3osyG7dLLDZ | invegent.com | ACTIVE | — |

---

## PG_CRON JOBS — 33 ACTIVE (verified 12 Apr 2026)

The sync state previously listed a simplified 8-job summary. Actual count is 33.
Full list always available via:
```sql
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
```

Key jobs for operational awareness:

| Job | Schedule | Notes |
|---|---|---|
| ai-worker-every-5m | every 5 min | Content generation |
| auto-approver-sweep | every 10 min | Draft approval |
| publisher-every-10m | every 5 min | Facebook + LinkedIn publish |
| content_fetch_every_10min | every 10 min | Full text extraction |
| image-worker-15min | every 15 min | Image/carousel generation |
| draft-notifier-every-30m | every 30 min | Portal inbox notifications |
| video-worker-every-30min | every 30 min | Video generation |
| heygen-worker-every-30min | every 30 min | HeyGen avatar builds |
| rss-ingest-run-all-hourly | every 6h | Feed ingestion |
| insights-worker-daily | 3am UTC daily | Facebook performance data |
| ai-diagnostic-daily | 8pm UTC daily (6am AEST) | Pipeline health report |
| dead-letter-sweep-daily | 2am UTC daily | Stale item cleanup |
| compliance-monitor-monthly | 9am UTC 1st of month | Policy URL hash check |
| k-schema-refresh-weekly | 3am UTC Sunday | k catalog refresh |
| ice-system-audit-weekly | 1pm UTC Sunday | 12-gate system audit |
| token-health-daily-7am-sydney | 9pm UTC daily (7am AEST) | Token expiry check |

Note: `seed-and-enqueue-facebook-every-10m`, `planner-hourly`, `pipeline-doctor-every-30m`,
`pipeline-fixer-30min`, `pipeline-health-snapshot-30m` and others also active.

---

## TOKEN CALENDAR

| Platform | Client | Expiry | Days remaining |
|---|---|---|---|
| YouTube | NDIS-Yarns | 7 Apr 2031 | ~1821d |
| YouTube | Property Pulse | 2 Apr 2031 | ~1816d |
| Facebook | NDIS-Yarns | 31 May 2026 | ~49d |
| Facebook | Property Pulse | 5 Jun 2026 | ~54d |

⚠️ Facebook tokens need refreshing early June 2026.

---

## CRITICAL DB FUNCTIONS — ALL CONFIRMED LIVE (12 Apr 2026)

| Function | Purpose |
|---|---|
| approve_onboarding | Creates client + brand profile + AI profile + portal user atomically |
| auth_client_id | RLS helper — resolves portal session to client_id |
| exec_sql | Generic SQL execution for cross-schema reads |
| get_client_connect_status | Returns platforms allocated to client via service agreement |
| get_onboarding_submissions | Lists submissions for dashboard review panel |
| request_onboarding_info | Sends info request to client, flags submission |
| store_platform_token | Upserts OAuth token to c.client_publish_profile |
| submit_onboarding | Inserts new submission with full form_data JSONB |
| update_submission_ai_scan | Writes AI profile scan result to submission JSONB |
| update_submission_brand_scan | Writes brand scan result to submission JSONB |

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| Facebook token expiry ~50 days | MED | Refresh early June 2026 |
| ai-worker: compliance_flags not written on generation | MED | Column exists, Edge Function not updated yet |
| auto-approver: approved_by + scores not written | MED | Columns exist, Edge Function not updated yet |
| NDIS Support Catalogue data load | MED | Tables exist. Needs NDIA Excel from ndia.gov.au |
| Meta App Review | 🔴 External | Business verification In Review. No progress 12 Apr. |
| LinkedIn API | 🔴 External | Community Management API review. No progress 12 Apr. |
| Legal review (L001) | 🔴 Business gate | $2–5k AUD. Before first external client signs. |

---

## WHAT IS NEXT

**Next build session:**
1. ai-worker update — write compliance_flags on every draft (column exists, not written)
2. auto-approver update — write approved_by + approved_at + auto_approval_scores
3. Weekly manager report email (B5) — Sunday Edge Function via Resend
4. NDIS Support Catalogue data load — requires NDIA Excel
5. Legal review (L001) — engage solicitor when product confidence reached

**External gates (no action possible on our side):**
- Meta Standard Access → then set FACEBOOK_OAUTH_ENABLED=true + app credentials in Vercel
- LinkedIn API approval → then set LINKEDIN_OAUTH_ENABLED=true + secret in Vercel

**Decisions pending:** See docs/06_decisions.md
