# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-11 (session close — portal/onboarding/compliance/audit design session)
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
**Legal review required before first external client is signed (L001).**

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

## NDIS YARNS AVATAR CAST — COMPLETE ✅

All 7 roles × 2 styles = 14 slots assigned.

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

All 7 roles × 2 styles = 14 slots. Created manually in HeyGen UI.

| Role | Character | Realistic | Animated |
|---|---|---|---|
| First Home Buyer | Jordan | ✅ | ✅ |
| Property Investor | Michael | ✅ | ✅ |
| Mortgage Broker | Rachel | ✅ | ✅ |
| Buyer's Agent | Daniel | ✅ | ✅ |
| Real Estate Agent | Lisa | ✅ | ✅ |
| Landlord | Robert | ✅ | ✅ |
| Tenant | Aisha | ✅ | ✅ |

---

## CLIENT ONBOARDING PIPELINE — LIVE ✅ (11 Apr 2026)

Full end-to-end tested with Care for Welfare.

### Flow
```
Prospect → portal.invegent.com/onboard (public, 7-step form)
  → Submit → c.onboarding_submission created (status: pending)
  → onboarding-notifier fires (operator + client emails)
  → PK reviews at dashboard.invegent.com/onboarding
      - Request Info: flag fields → client gets update link
      - Approve: creates c.client + portal_user + agreement + sends magic link
  → Client receives magic link → portal.invegent.com
```

### TEST CLIENT — CARE FOR WELFARE ✅

| Field | Value |
|---|---|
| client_id | 3eca32aa-e460-462f-a846-3f6ace6a3cae |
| client_name | Care For Welfare Pty Ltd |
| status | active |
| portal_email | parveenkumar11@hotmail.com |
| package | Starter $500/mo |

---

## SUPABASE AUTH CONFIG

- **Site URL:** `https://portal.invegent.com`
- **Redirect URLs:** dashboard.invegent.com/**, portal.invegent.com/**, portal.invegent.com/callback

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
| Facebook | Property Pulse | ~6 Jun 2026 (~56d) |
| Facebook | NDIS-Yarns | ~1 Jun 2026 (~51d) |

⚠️ Facebook tokens need refreshing in ~50 days.

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| Portal callback → /inbox instead of / | HIGH | In Brief 011 |
| approved_by + compliance_flags missing from m.post_draft | HIGH | In Brief 011 |
| serves_ndis_participants + ndis_registration_status missing from c.client | HIGH | In Brief 011 |
| c.client_brand_profile table does not exist | HIGH | In Brief 011 |
| Published post immutable policy not enforced | MED | In Brief 011 |
| Platform OAuth connection page missing | HIGH | Designed (D088), not built |
| Portal sidebar redesign | MED | Designed (D088), not built |
| Resend SMTP for magic links (unreliable to Hotmail) | P0 | Configure in Supabase dashboard |
| brand-scanner Edge Function | MED | Designed (D087), not built |
| AI profile bootstrap Edge Function | MED | Designed (D087), not built |
| Facebook tokens expiring ~50 days | MED | Refresh early June 2026 |
| Meta App Review | 🔴 External | Business verification In Review. Check 14 Apr. |
| LinkedIn API | 🔴 External | Community Management API review. Check 14 Apr. |
| Legal review service agreement | 🔴 Business gate | $2–5k AUD before first external client signs |

---

## WHAT IS NEXT

**Immediate — Claude Code Brief 011 (ready to run):**
See `docs/briefs/brief_011_db_foundations.md`
Tasks: portal callback fix, audit trail columns, NDIS client fields,
brand profile table, immutable post trigger, k registry update.

**After Brief 011:**
1. Configure Resend SMTP in Supabase Auth (manual, dashboard only, P0)
2. Check Meta App Review + LinkedIn API (14 Apr)
3. Build Portal sidebar redesign (D088)
4. Build Platform OAuth connect page (D088)
5. Build brand-scanner Edge Function (D087)
6. Build AI profile bootstrap Edge Function (D087)
7. Load NDIS Support Catalogue data into t.ndis_registration_group + t.ndis_support_item
8. Legal review service agreement (L001)

**Decisions pending:**
See docs/06_decisions.md Decisions Pending table.
