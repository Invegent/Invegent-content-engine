# Brief — Roadmap three-tab conversion + pre/post sales view

**Date:** 2026-04-21
**Target repo:** `invegent-dashboard`
**Target file:** `app/(dashboard)/roadmap/page.tsx`
**Owner:** PK
**Executor:** Claude Code
**Branch:** main
**Commit message:** `feat(roadmap): three-tab layout + by-sales-stage view`

---

## Purpose

Convert the ICE Roadmap page from stacked layout (By Layer → By Phase stacked) into a **three-tab interface**. Add a new third view **By Sales Stage** that shows pre-sales gate items, post-sales tiers, parked items, and advisor layer plan.

Refresh `PHASES` and `LAYERS` data to reflect 21 April 2026 state (D155 seeder fix + D156 epistemic layer + D157 cost guardrails + ID003 incident + Saturday 18 Apr closures).

---

## Why

- Current page scrolls a long way — easier to read as tabs
- No pre/post sales view exists — critical for sales-gate tracking
- Roadmap page is the single-glance status view — it has drifted 4 days
- `docs/15_pre_post_sales_criteria.md v3`: 7 of 31 pre-sales items closed, 24 open + 3 timebox windows not startable

---

## Required reading before making changes

1. Current file: `invegent-dashboard/app/(dashboard)/roadmap/page.tsx`
2. `Invegent-content-engine/docs/15_pre_post_sales_criteria.md` — authoritative source for SALES_STAGES data
3. `Invegent-content-engine/docs/00_sync_state.md` — pipeline status + 21 Apr sequence
4. `Invegent-content-engine/docs/06_decisions.md` — D155, D156, D157
5. `Invegent-content-engine/docs/incidents/2026-04-19-cost-spike.md` — ID003 detail

---

## Implementation approach

1. Convert page.tsx from **server component** to **client component**
   - Add `"use client"` at the top
   - Remove `export const dynamic = "force-static"` (incompatible with client component)
2. Add `useState<TabKey>("phase")` for active tab
3. Add tab button row between header and legend
4. Refactor render into conditional: `{activeTab === "phase" && <PhaseView />}`, etc.
5. **Keep all existing helpers** — `STATUS_CONFIG`, `PHASE_BORDER`, `StatusDot`, `StatusBadge`, `ProgressBar` — no changes
6. Add new type definitions and `SALES_STAGES` array
7. Update "Updated" date to `2026-04-21`

---

## Tab design

Three tabs side by side between page header and legend:

```
┌─────────────────────────────────────────────────┐
│ ICE Roadmap                   Updated 2026-04-21│
│ Full project status...                          │
├─────────────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌─────────────┐        │
│  │By Phase│  │By Layer│  │By Sales Stage│       │
│  └────────┘  └────────┘  └─────────────┘        │
├─────────────────────────────────────────────────┤
│ [legend]                                         │
│ [active tab content]                            │
└─────────────────────────────────────────────────┘
```

**Tab button style:**
- Container: `inline-flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800`
- Active: `bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white`
- Inactive: `text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200`
- Each button: `px-3 py-1.5 rounded-md text-xs font-medium transition-colors`

Default tab on load: `"phase"`

---

## Data — PHASES refresh (full replacement)

Replace the `PHASES` array with the following. Phase 1 and Phase 2 unchanged. Phase 3 gets new items. Phase 4 unchanged.

```typescript
const PHASES: Phase[] = [
  {
    id: "Phase 1", title: "Stabilise", subtitle: "Reliable pipeline for two clients — COMPLETE 7 Apr 2026", status: "done",
    deliverables: [
      { label: "Feed quality — 26 active sources", status: "done" },
      { label: "Auto-approver v1.5 — body + keyword gates", status: "done" },
      { label: "Next.js dashboard — all tabs", status: "done" },
      { label: "Both clients publishing 5+ posts/week for 6+ weeks", status: "done" },
      { label: "Supabase Pro + daily backups", status: "done" },
      { label: "Dead letter queue", status: "done" },
      { label: "Meta App Review submitted", status: "done", note: "Business verification In Review." },
    ],
  },
  {
    id: "Phase 2", title: "Automate", subtitle: "Autonomous operation + feedback loop", status: "active",
    deliverables: [
      { label: "Feed Intelligence agent", status: "done" },
      { label: "Email newsletter ingest", status: "done" },
      { label: "Next.js dashboard — all tabs live", status: "done" },
      { label: "Client portal (portal.invegent.com)", status: "done" },
      { label: "Signal clustering — bundler v4", status: "done" },
      { label: "Content series — series-writer + Content Studio", status: "done" },
      { label: "Pipeline Doctor + AI Diagnostic Tier 1 & 2", status: "done" },
      { label: "Visual pipeline — image formats live", status: "done" },
      { label: "Compliance framework — NDIS rules injected", status: "done" },
      { label: "Facebook Insights back-feed", status: "done" },
      { label: "Performance → scoring feedback loop", status: "done", note: "Bundler wiring pending." },
      { label: "LinkedIn publisher", status: "done", note: "Zapier bridge live all 4 clients." },
    ],
  },
  {
    id: "Phase 3", title: "Expand + Personal Brand", subtitle: "Engine proven on personal businesses. Paused on external expansion until cost controls live.", status: "active",
    deliverables: [
      { label: "YouTube pipeline — kinetic + stat + voice", status: "done" },
      { label: "HeyGen — API key + consent + avatar cast", status: "done" },
      { label: "OpenClaw — Telegram remote control", status: "done" },
      { label: "Portal sidebar + mobile + brand colours", status: "done" },
      { label: "Full onboarding pipeline (Run Scans + Activate)", status: "done" },
      { label: "Audit trail — compliance_flags + auto_approval_scores", status: "done" },
      { label: "B5 weekly manager report email", status: "done" },
      { label: "Sentinel + Diagnostician + Healer agents", status: "done" },
      { label: "Dashboard — D118-D123 all UI tabs", status: "done", note: "Voice, Avatars, Approval Patterns, Compliance Rules, Digest Policy, Format Library." },
      { label: "RSS.app discovery pipeline (D125)", status: "done", note: "9 seeds provisioned. Daily cron." },
      { label: "Pipeline audit + cleanup sprint (15 Apr)", status: "done" },
      { label: "instagram-publisher v1.0.0 — all 4 clients", status: "done" },
      { label: "linkedin-zapier-publisher — all 4 clients", status: "done" },
      { label: "D126-D136 dashboard fixes (17 Apr)", status: "done", note: "Topbar, incidents, token badges, stat cards, sidebar, schedule grid." },
      { label: "D137 Onboarding Run Scans + Activate (17 Apr)", status: "done" },
      { label: "D138 YouTube discovery route (17 Apr)", status: "done" },
      { label: "D139 Feed taxonomy badges (17 Apr)", status: "done" },
      { label: "D135 Pipeline selection gap fix (17 Apr)", status: "done", note: "550 candidates promoted. Pipeline unblocked." },
      { label: "D142 Demand-aware seeder (17 Apr)", status: "done", note: "Token waste 94% → ~20%." },
      { label: "brand-scanner v1.0.1 URL normalisation (17 Apr)", status: "done" },
      { label: "CFW brand profile — logo + persona + AI prompt (17 Apr)", status: "done", note: "70% confidence. Colours need manual entry." },
      { label: "Client switch stale state — all tabs fixed (17 Apr)", status: "done" },
      { label: "Auto-approver 50% pass rate (17 Apr)", status: "done", note: "Was 6.7%. body_too_long remaining gate." },
      { label: "D152 seeder fix — 307 orphan drafts backfilled (18 Apr)", status: "done", note: "post_draft.client_id now written correctly." },
      { label: "Instagram config — all 4 clients (18 Apr)", status: "done", note: "Tokens + mode + destination_id activated." },
      { label: "CFW + Invegent FB/IG tokens activated (18 Apr)", status: "done" },
      { label: "Facebook tokens refreshed — all 4 clients permanent (18 Apr)", status: "done", note: "Verified via /debug_token." },
      { label: "Publisher + weekly-manager-report committed + pushed (18 Apr)", status: "done" },
      { label: "D155 enqueue trigger ON CONFLICT fix", status: "done", note: "7-day silent stall root cause fixed." },
      { label: "ID003 ai-worker three-part fix", status: "active", note: "Tue 21 Apr. Payload diet + idempotency + retry cap + timeout 180s." },
      { label: "D157 cost guardrails — 4 tables + ai-cost-tracker + AI Costs panel", status: "active", note: "Wed-Thu 22-23 Apr build." },
      { label: "Inbox anomaly monitor", status: "planned", note: "Fri 24 Apr brief + build." },
      { label: "CFW content_type_prompts (9 rows)", status: "planned", note: "Fri 24 Apr content session." },
      { label: "Invegent content_type_prompts (9 rows)", status: "planned", note: "Fri 24 Apr content session." },
      { label: "D156 Architect Reviewer (Gemini 2.5 Pro per-commit)", status: "waiting", note: "Resumes Mon 27 Apr after ID003 chain closes." },
      { label: "D156 Sceptic (GPT-4 weekly)", status: "planned", note: "Week 2 of epistemic layer build." },
      { label: "D156 bank reconciliation — Meta + GitHub + Vercel + Supabase", status: "planned", note: "Stage 2 of external epistemic layer." },
      { label: "D149 Sales Advisor — Claude Project", status: "planned", note: "Thu 23 Apr. 2-week validation window." },
      { label: "HeyGen avatar video pipeline", status: "active", note: "Schema + prompts live. Held pending ai-worker fix." },
      { label: "Assign 12 unassigned feeds to clients", status: "planned" },
      { label: "Phase 2.1 — Insights-worker", status: "planned", note: "Gates D143-D146 (60 days data required)." },
      { label: "Phase 2.6 — Proof dashboard", status: "planned", note: "Live metrics for first client conversation." },
      { label: "D140 — Digest item scoring", status: "planned", note: "final_score computation. Re-enables score gate." },
      { label: "D124 Boost Config UI", status: "waiting", note: "Meta Standard Access dependency." },
      { label: "First external client", status: "planned", note: "Pre-sales gate: 24 items open. See By Sales Stage tab." },
    ],
  },
  {
    id: "Phase 4", title: "Scale + Intelligence", subtitle: "AI runs the system. 5-10 clients.", status: "planned",
    deliverables: [
      { label: "D143 Signal content type classifier", status: "planned", note: "Gated — 60 days insights-worker data." },
      { label: "D144 Signal router — platform × format matching", status: "planned", note: "Gated — D143 + D145 + 60 days data." },
      { label: "D145 Platform format benchmark table", status: "planned", note: "Research phase — Hootsuite/Sprout/LinkedIn/Meta data." },
      { label: "D146 Feed pipeline score + intelligent retirement", status: "planned", note: "Gated — Phase 2.1 + 60 days data." },
      { label: "RSS.app seed management dashboard UI", status: "planned" },
      { label: "Cowork daily inbox task (Gmail MCP)", status: "planned" },
      { label: "pgvector — natural language queries", status: "planned" },
      { label: "IAE Phase A — Facebook Ads boost (D124)", status: "planned" },
      { label: "YouTube Stage C — long-form avatar episodes", status: "planned" },
      { label: "Reddit + Perplexity signal sources", status: "planned" },
      { label: "Client websites — ICE to web auto-publish", status: "planned" },
      { label: "Aged care / mental health vertical", status: "planned" },
      { label: "SaaS evaluation at 10 clients", status: "planned" },
    ],
  },
];
```

---

## Data — LAYERS refresh (full replacement)

Replace the `LAYERS` array. Three layers get re-scored. Others hold.

```typescript
const LAYERS: Layer[] = [
  {
    id: "pipeline", title: "Pipeline engine", pct: 92, status: "active",
    what_works: "Full ingest to publish loop. 4 clients, 42 cron jobs, 42 Edge Functions. Demand-aware seeder live (D142). 60 active feeds. D152 seeder fix (orphan drafts). D155 enqueue trigger fix.",
    what_missing: "ID003 remediation in flight — ai-worker three-part fix (payload diet + idempotency + retry cap + timeout 180s) shipping Tue 21 Apr. Pipeline dormant since 19 Apr 02:40 AEST. D140 digest item scoring pending.",
  },
  {
    id: "content-intelligence", title: "Content intelligence", pct: 85, status: "active",
    what_works: "AI generation all 4 clients. 23 NDIS compliance rules. Auto-approver v1.5.0 — 50% pass rate. Voice & Formats UI. Approval Patterns dashboard.",
    what_missing: "CFW + Invegent content_type_prompts missing (Fri 24 Apr sessions). PP pass rate 26.3% — body_too_long. Generation paused pipeline-wide until ai-worker fix ships.",
  },
  {
    id: "visual", title: "Visual pipeline", pct: 72, status: "active",
    what_works: "Text, video_short_kinetic, video_short_stat publishing. HeyGen avatar cast assigned. YouTube uploading. Avatar Management UI live.",
    what_missing: "All 28 avatar slots gen_status=empty (non-blocking). Instagram zero published (awaiting image drafts).",
  },
  {
    id: "monitoring", title: "Monitoring & self-healing", pct: 75, status: "active",
    what_works: "Weekly manager report. Token expiry alerter (sentinel-based). Compliance Rules UI. Format Library. Approval Patterns. Diagnostics. Incident deduplication + auto-resolve (D127 v2).",
    what_missing: "D155 class silent failures (7-day stall undetected) + ID003 silent cost loop ($155 undetected) both slipped past existing monitors. A20-A23 pre-sales remediation in flight. A24-A26 external epistemic layer (Gemini Architect Reviewer + GPT-4 Sceptic) required per D156.",
  },
  {
    id: "distribution", title: "Distribution — social platforms", pct: 75, status: "active",
    what_works: "Facebook: 375+ posts, all 4 clients. LinkedIn: all 4 clients via Zapier. YouTube: NY + PP. WordPress: CFW. invegent.com blog live.",
    what_missing: "Instagram zero published. Meta Standard Access pending. LinkedIn Community Management API pending.",
  },
  {
    id: "website-seo", title: "Website SEO publishing", pct: 75, status: "active",
    what_works: "wordpress-publisher v1.0.0 — CFW live. invegent.com blog via Next.js ISR. Publisher schedule wiring live (v1.7.0).",
    what_missing: "CFW needs first drafts reviewed + prompts written. Invegent awaiting prompts.",
  },
  {
    id: "feed-management", title: "Feed management", pct: 95, status: "active",
    what_works: "Health halos, assign/unassign, deactivate, pool picker. RSS.app discovery pipeline (9 seeds). Feed taxonomy badges. 60 active feeds.",
    what_missing: "12 feeds unassigned to clients. Government badge not rendering (DSS/RBA typed as RSS, not Government origin).",
  },
  {
    id: "dashboard", title: "Operator dashboard", pct: 97, status: "active",
    what_works: "All tabs live. Client switch stale state fixed on ALL tabs. Brand Identity tab: logo + colour swatches. Pipeline health card on Overview. Clickable stat cards. Sidebar reorganised.",
    what_missing: "D124 Boost Config UI (Meta Standard Access). RSS.app seed management UI. AI Costs panel (D157 — building Wed-Thu).",
  },
  {
    id: "portal", title: "Client portal", pct: 92, status: "active",
    what_works: "Portal fully live. Dynamic platform rendering. Brand colours per client. Inbox, Performance, Queue views. OAuth connect page.",
    what_missing: "Platform OAuth pending Meta + LinkedIn approvals.",
  },
  {
    id: "client-readiness", title: "External client readiness", pct: 60, status: "active",
    what_works: "4 internal clients configured. Full onboarding pipeline (Run Scans + Activate). brand-scanner v1.0.1. CFW brand profile live. Token expiry alerting.",
    what_missing: "Pre-sales gate: 24 of 31 items open. 3 timebox windows (Clock A/B/C) not startable. Legal (A1, A5, A7, A8), Proof (A3, A4), Platform (A2 Meta), Stability (A10b, A11b, A14, A16, A18, A20-A23), Epistemic layer (A24-A26), Clock C (A17), Economics (A6), ID003-driven (A27-A29).",
  },
];
```

---

## Data — SALES_STAGES new (full addition)

Add new type definitions and the `SALES_STAGES` array. Place after the existing `LAYERS` constant and before `STATUS_CONFIG`.

```typescript
type SalesItem = {
  id: string;
  label: string;
  status: Status;
  note?: string;
  ref?: string;
};
type SalesCategory = { title: string; items: SalesItem[]; };
type SalesSection = {
  id: string;
  title: string;
  subtitle: string;
  status: Status;
  totalCount: number;
  closedCount: number;
  categories: SalesCategory[];
};

const SALES_STAGES: SalesSection[] = [
  {
    id: "pre-sales-open",
    title: "Pre-sales — Open",
    subtitle: "Must close before first external sales conversation",
    status: "active",
    totalCount: 24,
    closedCount: 0,
    categories: [
      {
        title: "Legal",
        items: [
          { id: "A1", label: "Pilot terms + liability waiver drafted", status: "planned", note: "Per D147. Solicitor deferred until first pilot revenue. One-page, PK-drafted.", ref: "A1 · D147" },
          { id: "A5", label: "50% off next month on KPI miss — clause with defined KPIs", status: "planned", note: "Per D148. 2–3 measurable KPIs (posts/week, engagement rate, follower growth).", ref: "A5 · D148" },
          { id: "A7", label: "Privacy policy updated — YouTube + HeyGen + video-analyser", status: "planned", note: "Current policy dated 4 Mar. Three paragraphs to add + re-host.", ref: "A7 · L006" },
          { id: "A8", label: "AI content disclosure clause in pilot terms", status: "planned", note: "Contract-level is pre-sales. Per-post labelling is Tier 2 (C3).", ref: "A8 · L007" },
        ],
      },
      {
        title: "Proof",
        items: [
          { id: "A3", label: "One-page proof document", status: "planned", note: "Hosted at invegent.com/proof. NY posts, reach, top-3, compliance rules, time saved.", ref: "A3" },
          { id: "A4", label: "NDIS Yarns numbers support the proof document", status: "planned", note: "~10 weeks in. Extract metrics end of week. Gap analysis if thin.", ref: "A4" },
        ],
      },
      {
        title: "Platform",
        items: [
          { id: "A2", label: "Meta App Review resolved OR pilot workaround documented", status: "waiting", note: "In Review. 27 Apr escalation trigger. Two-track: (a) await, (b) pilot-mode doc (PK admin on client BM).", ref: "A2 · L002" },
        ],
      },
      {
        title: "Stability — original",
        items: [
          { id: "A10b", label: "First IG post actually publishes", status: "planned", note: "Verification only. Test after ai-worker fix.", ref: "A10b" },
          { id: "A11b", label: "CFW + Invegent content_type_prompts — 9 × 2 rows", status: "planned", note: "Fri 24 Apr content sessions.", ref: "A11b" },
          { id: "A14", label: "RLS verification — no portal route bypasses SECURITY DEFINER", status: "planned", note: "Grep invegent-portal for direct Supabase queries.", ref: "A14" },
          { id: "A16", label: "Clock A dashboard — schedule adherence per client × platform", status: "planned", note: "/continuity route. 14-day rolling. Required before Clock A starts.", ref: "A16" },
          { id: "A18", label: "7 source-less Edge Functions investigated + source pulled", status: "planned", note: "Extract deployed source, commit, check error rates.", ref: "A18" },
        ],
      },
      {
        title: "Stability — D155 fallout",
        items: [
          { id: "A20", label: "Pipeline liveness monitoring — ai_job stall + last-success freshness", status: "planned", note: "pg_cron every 4h + daily. Dashboard banner for unresolved alerts.", ref: "A20 · D155" },
          { id: "A21", label: "Trigger ON CONFLICT audit — all 10+ triggers", status: "planned", note: "Proof-by-audit. Same class of bug as D155.", ref: "A21 · D155" },
          { id: "A22", label: "Ai-worker error surfacing — UPDATE rowcount checks", status: "planned", note: "All EFs that UPDATE pipeline tables must check rowcount.", ref: "A22 · D155" },
          { id: "A23", label: "D153 — live /debug_token cron (replaces sentinel)", status: "planned", note: "Cron calls Meta /debug_token daily per FB token.", ref: "A23 · D153 · D155" },
        ],
      },
      {
        title: "External epistemic layer",
        items: [
          { id: "A24", label: "Stage 1 multi-model review MVP — Architect Reviewer + Sceptic", status: "active", note: "Resumes Mon 27 Apr after ID003 chain closes. Gemini 2.5 Pro per-commit + GPT-4 weekly.", ref: "A24 · D156" },
          { id: "A25", label: "Stage 2 bank reconciliation MVP — Meta + GitHub + Vercel + Supabase", status: "planned", note: "External sources authoritative when disagreeing with DB.", ref: "A25 · D156" },
          { id: "A26", label: "Review discipline — unread-blocks-dashboard + weekly block", status: "planned", note: "Output of A24+A25 is theatre without structural reading discipline.", ref: "A26 · D156" },
        ],
      },
      {
        title: "Clock C",
        items: [
          { id: "A17", label: "All 7 client-handling items defined", status: "planned", note: "docs/16_client_handling.md. Inbound + SLA + routing + modes + pause + testimonial + billing.", ref: "A17" },
        ],
      },
      {
        title: "Economics",
        items: [
          { id: "A6", label: "All TBC subscription costs resolved", status: "planned", note: "4 TBC rows in k.subscription_register. Check Vercel, HeyGen, Claude Max, OpenAI invoices.", ref: "A6" },
        ],
      },
      {
        title: "ID003-driven",
        items: [
          { id: "A27", label: "LLM-caller Edge Function audit — idempotency + retry-cap patterns", status: "planned", note: "~8 EFs beyond ai-worker. Tuesday fix establishes pattern.", ref: "A27 · ID003" },
          { id: "A28", label: "Cost guardrails infrastructure live (D157 Stop 2)", status: "active", note: "Wed-Thu 22-23 Apr build. 4 tables + ai-cost-tracker EF + AI Costs panel.", ref: "A28 · D157" },
          { id: "A29", label: "Inbox anomaly monitor live", status: "planned", note: "Fri 24 Apr brief + build.", ref: "A29 · D157" },
        ],
      },
    ],
  },
  {
    id: "pre-sales-closed",
    title: "Pre-sales — Closed",
    subtitle: "Verified and ticked off the gate checklist",
    status: "done",
    totalCount: 7,
    closedCount: 7,
    categories: [
      {
        title: "Closed",
        items: [
          { id: "A9", label: "Orphan drafts resolved — 307 rows backfilled + D152 seeder fix", status: "done", ref: "A9 · D152" },
          { id: "A10a", label: "Instagram config — all 4 clients (tokens + mode + destination_id)", status: "done", ref: "A10a" },
          { id: "A11a", label: "CFW + Invegent FB/IG tokens activated", status: "done", ref: "A11a" },
          { id: "A12", label: "HeyGen not exposed in v1 client portal (verified)", status: "done", ref: "A12 · L005" },
          { id: "A13", label: "video-analyser internal-only (verified)", status: "done", ref: "A13 · L004" },
          { id: "A15", label: "Publisher + weekly-manager-report committed + pushed", status: "done", ref: "A15" },
          { id: "A19", label: "Facebook tokens refreshed — all 4 clients permanent", status: "done", ref: "A19" },
        ],
      },
    ],
  },
  {
    id: "timebox",
    title: "Timebox windows",
    subtitle: "14-day windows — cannot start until all pre-sales items closed",
    status: "waiting",
    totalCount: 3,
    closedCount: 0,
    categories: [
      {
        title: "Clocks",
        items: [
          { id: "CLK-A", label: "Clock A — 14 consecutive days ≥95% schedule adherence, supply ratio ≥1.5×", status: "waiting", note: "Requires A16 dashboard + A10b + A11b first.", ref: "Clock A" },
          { id: "CLK-B", label: "Clock B — 14 days avg <2 hrs/day operational time", status: "waiting", note: "Runs same window as Clock A.", ref: "Clock B" },
          { id: "CLK-C", label: "Clock C — all 7 client-handling items green", status: "waiting", note: "Requires A17 definition + operational evidence.", ref: "Clock C" },
        ],
      },
    ],
  },
  {
    id: "post-sales-t1",
    title: "Post-sales — Tier 1",
    subtitle: "Within 7 days of first signed pilot",
    status: "planned",
    totalCount: 8,
    closedCount: 0,
    categories: [
      {
        title: "Tier 1",
        items: [
          { id: "B1", label: "secrets_reference.md with 20+ env vars + rotation cadence", status: "planned", ref: "B1" },
          { id: "B2", label: "Client-facing portal dashboard — rebuild operator view as client view", status: "planned", ref: "B2" },
          { id: "B3", label: "Document c.client_service_agreement + c.onboarding_submission tables", status: "planned", ref: "B3 · D151" },
          { id: "B4", label: "Onboarding runbook — docs/17_first_client_onboarding_runbook.md", status: "planned", ref: "B4" },
          { id: "B5", label: "Billing automation — Xero or Stripe recurring invoice", status: "planned", ref: "B5 · Clock C #7" },
          { id: "B6", label: "Testimonial capture workflow — month 3 scripted email + calendar", status: "planned", ref: "B6 · Clock C #6" },
          { id: "B7", label: "Emergency pause — public.pause_client() function", status: "planned", ref: "B7 · Clock C #5" },
          { id: "B8", label: "Inbound channel + SLA + routing defined", status: "planned", ref: "B8 · Clock C #1-3" },
        ],
      },
    ],
  },
  {
    id: "post-sales-t2",
    title: "Post-sales — Tier 2",
    subtitle: "Within 30-60 days of first sale",
    status: "planned",
    totalCount: 6,
    closedCount: 0,
    categories: [
      {
        title: "Tier 2",
        items: [
          { id: "C1", label: "Auto-approver demand-met target — supply × pass-rate = demand met", status: "planned", note: "Current: 1.5× × 23% = 35% of demand met. Target TBD.", ref: "C1" },
          { id: "C2", label: "Compliance review queue SLA — 7-day human review", status: "planned", note: "4 items pending since 1 Apr.", ref: "C2" },
          { id: "C3", label: "Per-post AI disclosure labelling — ai_disclosure_text column", status: "planned", ref: "C3" },
          { id: "C4", label: "Cron schedule fragility — queue-table reads + per-client concurrency", status: "planned", note: "Critical between clients 5-10.", ref: "C4" },
          { id: "C5", label: "Document k.vw_feed_intelligence + wire to Feed page", status: "planned", ref: "C5 · D151" },
          { id: "C6", label: "HeyGen productisation decision — yes in v2 or park", status: "planned", ref: "C6" },
        ],
      },
    ],
  },
  {
    id: "post-sales-t3",
    title: "Post-sales — Tier 3",
    subtitle: "Ongoing doc / governance / hygiene",
    status: "planned",
    totalCount: 12,
    closedCount: 0,
    categories: [
      {
        title: "sync_state drift",
        items: [
          { id: "D1", label: "EF count drift fix", status: "planned", ref: "D1" },
          { id: "D2", label: "Cron count drift fix", status: "planned", ref: "D2" },
          { id: "D3", label: "Feed count drift fix", status: "planned", ref: "D3" },
          { id: "D4", label: "Close client-assets bucket issue", status: "planned", ref: "D4" },
        ],
      },
      {
        title: "Code + docs",
        items: [
          { id: "D5", label: "Clean up 2 local-only EFs (ai-diagnostic + legacy linkedin-publisher)", status: "planned", ref: "D5" },
          { id: "D6", label: "Document 22 TODO tables per D151", status: "planned", ref: "D6 · D151" },
          { id: "D7", label: "Brief 041 result file — log PARTIAL / blocked", status: "planned", ref: "D7" },
          { id: "D8", label: "Brief 042 result file — retroactive DONE", status: "planned", ref: "D8" },
          { id: "D9", label: "Brief 036 gap investigated", status: "planned", ref: "D9" },
          { id: "D10", label: "Subscription register 13 vs 12 rows reconciled", status: "planned", ref: "D10" },
          { id: "D11", label: "115 SECURITY DEFINER functions — quarterly dead code sweep", status: "planned", ref: "D11" },
          { id: "D12", label: "Audit brief SQL templates — 3 queries column-mismatch fixes", status: "planned", ref: "D12" },
        ],
      },
    ],
  },
  {
    id: "parked",
    title: "Parked",
    subtitle: "Do not work on until specific trigger fires",
    status: "deferred",
    totalCount: 4,
    closedCount: 0,
    categories: [
      {
        title: "Parked items",
        items: [
          { id: "E1", label: "CFW brand colours NULL", status: "deferred", note: "Unpark: CFW reaches full production after A11b.", ref: "E1" },
          { id: "E2", label: "HeyGen productisation for clients", status: "deferred", note: "Unpark: L005 consent flow shipped + C6 decision.", ref: "E2" },
          { id: "E3", label: "Self-serve SaaS onboarding", status: "deferred", note: "Unpark: 5+ pilot clients retained 3+ months.", ref: "E3" },
          { id: "E4", label: "Creator / entertainment tier", status: "deferred", note: "Unpark: after self-serve SaaS layer exists.", ref: "E4" },
        ],
      },
    ],
  },
  {
    id: "advisors",
    title: "Advisor layer (D149)",
    subtitle: "Parallel track — not on critical path but highest-leverage long-term",
    status: "planned",
    totalCount: 4,
    closedCount: 0,
    categories: [
      {
        title: "Build order",
        items: [
          { id: "ADV-1", label: "Sales Advisor — Claude Project + custom instruction", status: "planned", note: "Thu 23 Apr. Validate 2 weeks. Devil's Advocate (Gemini) in parallel per D156.", ref: "Advisor 1 · D149" },
          { id: "ADV-2", label: "Legal/Risk Advisor — reads pilot terms", status: "planned", note: "Week 3 if Sales Advisor validates.", ref: "Advisor 2 · D149" },
          { id: "ADV-3", label: "Ops Discipline Advisor — Clock B overcommitment catcher", status: "planned", note: "Week 4.", ref: "Advisor 3 · D149" },
          { id: "ADV-4", label: "Product Strategy Advisor — separate voice from executor-Claude", status: "planned", note: "Week 5.", ref: "Advisor 4 · D149" },
        ],
      },
    ],
  },
];
```

---

## Render — By Sales Stage tab

Each section renders as a card similar to phase cards. Inside each card, render categories as sub-groups. Each item renders with `StatusDot` + label + optional `ref` badge + optional note.

**Section card shape:**

```
┌──────────────────────────────────────────────────────────┐
│ Pre-sales — Open              [0/24] [In progress]       │
│ Must close before first external sales conversation      │
│ ████████░░░░░░░░░░░░░░░░░ progress bar                  │
│ ─────────────────────────────────────────────────────── │
│ Legal                                                    │
│ ● A1  Pilot terms + liability waiver drafted            │
│      Per D147. Solicitor deferred...                    │
│ ● A5  50% off next month on KPI miss — clause...       │
│                                                          │
│ Proof                                                    │
│ ● A3  One-page proof document                           │
│ ● A4  NDIS Yarns numbers support the proof document     │
│                                                          │
│ [... more categories ...]                                │
└──────────────────────────────────────────────────────────┘
```

**Progress bar logic:** `pct = Math.round((closedCount / totalCount) * 100)`. Use existing `ProgressBar` helper.

**Category sub-header style:**
- `text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-4 mb-2 first:mt-0`

**Ref badge style** (for A1, A5, etc.):
- `inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ml-2`

**Pre-sales gate summary banner** at the top of By Sales Stage tab:

```
┌──────────────────────────────────────────────────────────┐
│ Pre-sales gate: 7 of 31 closed · 24 open · 3 timebox    │
│ First external sales conversation authorised only when  │
│ every Section A item is closed AND Clock A/B/C complete.│
└──────────────────────────────────────────────────────────┘
```

Use existing card styles: `rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-5 py-4`.

---

## Date update

Change line:

```tsx
<span className="text-xs text-slate-400 dark:text-slate-500">Updated 2026-04-17</span>
```

to:

```tsx
<span className="text-xs text-slate-400 dark:text-slate-500">Updated 2026-04-21</span>
```

---

## External blockers refresh (in existing block at bottom of page)

Replace the existing items array with:

```typescript
[
  { dot: "bg-red-400", title: "ID003 cost incident — ai-worker three-part fix", note: "Pipeline dormant since 19 Apr 02:40 AEST. Fix ships Tue 21 Apr. Anthropic cap $200 / $44 headroom." },
  { dot: "bg-blue-400", title: "Meta App Review — permissions review", note: "Business verification In Review. 27 Apr escalation trigger — contact Meta dev support if still stuck." },
  { dot: "bg-blue-400", title: "LinkedIn Community Management API", note: "Zapier bridge active. Evaluate Late.dev if still pending 13 May 2026." },
  { dot: "bg-blue-400", title: "Legal review — pilot terms + waiver (A1)", note: "Per D147: solicitor deferred until first pilot revenue. PK-drafted one-pager." },
  { dot: "bg-amber-400", title: "12 feeds unassigned to clients", note: "Assign via Feeds page. 9 discovery feeds + 3 legacy." },
  { dot: "bg-amber-400", title: "CFW colours missing", note: "Site has no theme-color meta tag. Enter Primary/Secondary/Accent manually in Profile tab." },
  { dot: "bg-amber-400", title: "Shrishti admin 2FA + passkey (Meta business)", note: "Backup admin invitation pending acceptance." },
]
```

Red dot (`bg-red-400`) is a new severity — add to status vocabulary if not present, or keep as inline hex. Inline is fine for this card.

---

## Strategic principle block refresh (bottom of page)

Replace with:

```tsx
<p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
  ICE is an AI-operated business system, not a content tool. 4 clients. 5 platforms. 42 cron jobs. 42 Edge Functions. 60 active feeds. Build priority: (1) PK personal businesses. (2) Personal brand. (3) External clients — bonus, not driver. Pre-sales gate: 7 of 31 closed, 24 open. First external conversation after gate closes + Clock A/B/C complete.
</p>
```

---

## Acceptance criteria

- [ ] Three tabs render between header and legend. Default active = **By Phase**.
- [ ] Clicking each tab shows the correct view; no layout shift.
- [ ] All three data arrays (PHASES, LAYERS, SALES_STAGES) render without TypeScript errors.
- [ ] `"use client"` at top, `force-static` export removed.
- [ ] **By Sales Stage** tab renders 8 sections (Pre-sales Open, Pre-sales Closed, Timebox, Tier 1, Tier 2, Tier 3, Parked, Advisors).
- [ ] Pre-sales Open section shows 9 category sub-groups (Legal, Proof, Platform, Stability-original, Stability-D155, Epistemic, Clock C, Economics, ID003).
- [ ] Pre-sales gate summary banner renders at top of By Sales Stage tab with "7 of 31 closed · 24 open · 3 timebox".
- [ ] `Updated 2026-04-21` renders in header.
- [ ] External blockers card shows ID003 at top with red dot.
- [ ] Page builds successfully on Vercel preview.
- [ ] Dark mode works on all three tabs.
- [ ] Existing `STATUS_CONFIG`, `PHASE_BORDER`, `StatusDot`, `StatusBadge`, `ProgressBar` helpers unchanged.

---

## Post-merge checklist

- [ ] Verify on Vercel preview URL before merging to main
- [ ] After merge: load `dashboard.invegent.com/roadmap` and confirm all three tabs render
- [ ] Update `docs/00_sync_state.md` session-close section with commit SHA + "roadmap three-tab conversion live"

---

*End of brief. Claude Code may proceed once PK confirms.*
