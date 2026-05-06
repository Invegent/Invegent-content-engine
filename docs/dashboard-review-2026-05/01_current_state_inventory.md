# §1 — Current-State Inventory

## Purpose

Capture what the dashboard actually contains today, route-by-route, before the architecture review commits to a future shape. This document is the empirical baseline that §4 (IA option comparison) and §6 (page-by-page fate table) build on.

It does NOT decide anything. "Likely fate" entries below are provisional positions per the locked IA in `00_overview.md`; they are starting points for §6, not decisions.

## Method

- Routes enumerated from `invegent-dashboard/app/(dashboard)/` directory listing on `main` (read 2026-05-06).
- Nav structure read from `components/sidebar.tsx`.
- Page descriptions are first-hand from source reads where the route's purpose was unclear or layered (`/overview`, `/reviews`); other pages are described from route name + sidebar grouping + kickoff Round 1 context.
- Honest limitations are listed at the end of this document. Read them before quoting any "what each page does" claim into a code-affecting decision.

## Layout shell

`app/(dashboard)/layout.tsx` renders `<Sidebar />` + `<StatusStrip />` header + scrolling `<main>`. `dynamic = "force-dynamic"` and `revalidate = 0` — every page is server-rendered fresh, no caching. All routes inherit this shell.

## Current navigation structure (sidebar.tsx)

Five nav sections. Sixteen visible nav items.

```
TODAY         (3 items)
  - Overview        → /overview
  - Inbox           → /inbox        (also matches /drafts)
  - Queue           → /queue

MONITOR       (7 items)
  - Flow            → /monitor
  - Pipeline        → /pipeline-log
  - Diagnostics     → /diagnostics
  - Failures        → /failures
  - Performance     → /performance
  - AI Costs        → /costs
  - Compliance      → /compliance

CONTENT       (2 items)
  - Content Studio  → /content-studio
  - Visuals         → /visuals

CONFIGURATION (3 items)
  - Clients         → /clients      (also matches /client-profile)
  - Feeds           → /feeds
  - Connect         → /connect

SYSTEM        (4 items)
  - Roadmap         → /roadmap
  - Reviews         → /reviews
  - Subscriptions   → /system/subscriptions
  - Format Library  → /system/formats
```

Brand area (top of sidebar) shows "Invegent / ICE Ops" and a sign-out button. No tenant switcher. No search.

---

## Routes inventory (22 total)

### In sidebar nav (16)

| Route | Page name | What it does | Likely fate (provisional) |
|---|---|---|---|
| `/overview` | Overview | **"Operator Briefing"** (verified from source). System-status banner; token-expiry alerts (`m.token_expiry_alert` + `m.vw_ops_token_health`); two-column "Drafts to review" + "Open incidents"; Pipeline Health Card backed by `m.ai_diagnostic_report`; "Publishing schedule (next 24h)"; four quick stats (published today / stuck jobs / overdue queue / open incidents). Closest existing surface to the locked **NOW > Overview**. | NOW > Overview (strongest re-use candidate; rebuild around Brief + Agent status cards on top of existing zones) |
| `/inbox` | Inbox | Draft review queue. Sidebar match string covers `/inbox` + `/drafts`. | NOW > Inbox |
| `/queue` | Queue | Publish queue surface (`m.post_publish_queue`). | NOW > Pipeline (likely state-machine reframe — Open Decision 2) |
| `/monitor` | Flow | Pipeline flow monitor. Linked from Overview's quick stats ("Stuck jobs" + "Open incidents" both link to `/monitor`). | INVESTIGATE > Flow |
| `/pipeline-log` | Pipeline | Pipeline event log / row-level state log. | INVESTIGATE > Pipeline Log |
| `/diagnostics` | Diagnostics | Diagnostic tooling. | INVESTIGATE > absorbed into Flow + Pipeline Log (Diagnostics is NOT in the locked Investigate list) |
| `/failures` | Failures | Dead-letter queue surfacing per Risk 7 / Phase 1.7 — items in `dead` status across pipeline tables with `dead_reason`, with one-click requeue. | INVESTIGATE > likely folded into Pipeline Log; exception items also feed Inbox |
| `/performance` | Performance | Content performance metrics. Reads `m.post_performance` (Phase 2.1 surface). Currently single page serving both ops and (eventual) client audiences. | REPORTS > Performance tab — ops only after portal split (Open Decision 5) |
| `/costs` | AI Costs | AI cost tracking per client + model. | REPORTS > Costs tab |
| `/compliance` | Compliance | Compliance review surface + rule editor. Two products in one page (review queue vs rules). | Split — ADMIN > Compliance Rules (rule editor); review-queue items → NOW > Inbox |
| `/content-studio` | Content Studio | Content creation surface for non-Type-1 content (campaigns, evergreen, promotional). | CREATE > Content Studio |
| `/visuals` | Visuals | Visual generation / preview. Two products in one page (creation vs visual-pipeline log). | Split — CREATE > (folded into Content Studio); INVESTIGATE > Visual Pipeline |
| `/clients` | Clients | Client list + summary cards. Sidebar match covers `/client-profile` (drill-down). | CLIENTS > All Clients |
| `/feeds` | Feeds | Feed source management (`f.feed_source`, give-up rates, health indicators). Risk 1 / Phase 1.1 surface. | CLIENTS > Feeds |
| `/connect` | Connect | OAuth / platform connection surface. Per D-YT-OAUTH-1 standing rule: this is the canonical FB/IG/LI/YT reconnect entry point — preferred over OAuth Playground fallback. | CLIENTS > Connect |
| `/roadmap` | Roadmap | Phases roadmap page. PHASES array in `app/(dashboard)/roadmap/page.tsx`. Subject to Open Decision 4 (keep in dashboard / separate deploy / markdown-only). | ADMIN > Roadmap (provisional) |
| `/reviews` | Reviews | **External Reviews** (verified from source). Gemini 2.5 Pro (Strategist) + GPT-4.1 (Engineer Reviewer) per-commit + weekly digest button. Reads `m.external_review_queue`. Webhook + Edge Function infrastructure. **NOT** the same as `m.chatgpt_review` (D-01 in-conversation reviews per `userMemories`). | ADMIN > Reviews (Open Decision 3 — own section vs Admin nest) |
| `/system/subscriptions` | Subscriptions | Subscription / billing config. | ADMIN > Subscriptions |
| `/system/formats` | Format Library | Format library — formats per `userMemories` (17 formats today; `format-advisor-v1`). | CREATE > Formats |

### Routes that exist but are NOT in sidebar nav (4)

| Route | What it is | Likely fate (provisional) |
|---|---|---|
| `/client-profile` | Single-client deep-dive. `ClientProfileShell.tsx` (~42 KB). Reachable from `/clients` cards; sidebar `Clients` match string covers `/client-profile`. | CLIENTS > All Clients > [client] (drill-down — same page as today, no IA change required) |
| `/drafts` | Older draft list page. Sidebar `Inbox` match string covers `/drafts`. Likely legacy / alias-only. | Retire OR keep as alias when Inbox absorbs full functionality (low cost either way) |
| `/onboarding` | Client onboarding wizard (`page.tsx` ~37 KB). Not currently linked from sidebar. | CLIENTS > Onboarding (promote to nav under new IA) |
| `/actions` | Server actions backing other pages — `avatars.ts`, `digest-policy.ts`, `discovery-keywords.ts`, `onboarding-scans.ts`, `publish-profile-toggle.ts`, `video-analyser.ts`, `video-tracker.ts`, `voice.ts`. NOT a route. | n/a — keep as backing logic |

### Other `app/` entries (not dashboard routes)

- `app/(auth)` — login flow (Supabase Auth)
- `app/api` — API routes (e.g. `/api/run-digest` is the Reviews button target)
- `app/mcp-consent`, `app/mcp-github-consent` — MCP auth consent landing pages
- `app/page.tsx` — root redirect (105 bytes; likely redirects to `/overview`)
- `app/layout.tsx`, `app/fonts/`, `app/globals.css`, `app/favicon.ico` — root assets

---

## Overlaps (where two pages do the same job, fully or partially)

1. **Inbox vs Drafts.** `/inbox` and `/drafts` both surface drafts awaiting review. Sidebar treats them as one (Inbox match string includes both). Functional duplicate.

2. **Overview vs Inbox / Queue / Failures.** Overview's "Drafts to review" panel is a subset of Inbox. "Publishing schedule (next 24h)" is a window onto Queue. "Open incidents" overlaps Failures + Monitor. By design Overview is a digest of the others — but the boundary between "digest" and "duplicate" needs to be intentional rather than accidental.

3. **Monitor / Pipeline Log / Failures / Diagnostics.** Four routes in the same sidebar group, all ostensibly about pipeline state. Likely overlap in what each actually displays. §6 needs to draw the line between flow visualisation, row-level log, dead-letter surfacing, and ad-hoc diagnostics — or merge two/three of them.

4. **Performance (ops) vs Performance (client).** Currently one `/performance` page serves both audiences. Open Decision 5 splits this — ops side stays in REPORTS, client side moves to portal (Layer 2).

5. **Compliance review queue vs Compliance rules.** One page renders both. Locked IA splits these — rule editor → ADMIN > Compliance Rules; review-queue items → NOW > Inbox.

6. **Visuals creation vs Visuals pipeline log.** Same pattern as Compliance — two products in one page. Split planned.

7. **Reviews (`/reviews`) vs `m.chatgpt_review`.** `/reviews` surfaces `m.external_review_queue` (Gemini + GPT-4.1 commit reviewer). The D-01 `m.chatgpt_review` review records currently have NO dashboard surface — they're queried via SQL only. Naming collision risk if a `m.chatgpt_review` surface is added later. Worth disambiguating in §3 / §6 (rename one of them, or scope-prefix the surfaces).

---

## Gaps (in the locked final-form IA, not yet present in the dashboard)

- **Brief surface.** LLM-generated narrative briefing on Overview / pushed to Telegram. No corresponding code, no backing object today.
- **Telegram channel plumbing.** Multi-channel Brief + alerts. No deployment, no integration today.
- **Agent status cards.** First-class status surface for each agent on Overview + section in Investigate. No corresponding component or backing view.
- **INVESTIGATE > Agents.** Dedicated section with per-agent runs / outputs / annotation queue. MVP scope: status surface only; calibration deferred to v2 per locked decision 3.
- **INVESTIGATE > Visual Pipeline.** Log of visual jobs (carve-out from `/visuals`).
- **REPORTS > Calibration tab.** Auto-approver / scoring threshold history. Not present today.
- **CLIENTS > Onboarding promoted to nav.** `/onboarding` exists but is not linked from sidebar today.
- **EF Drift panel.** F-EF-DRIFT-PREVENTION Stage 2b will land somewhere under INVESTIGATE (likely Pipeline Log or its own EF Drift sub-page). Not yet built — separate workstream sequenced behind S30 + this review's §6.

---

## Likely-fate summary by new IA section

Provisional mapping. §6 page-fate table is the place to argue and lock these.

```
NOW
  Overview        ← /overview          (rebuild around Brief + Agent status cards + Pipeline health)
  Inbox           ← /inbox + /drafts (alias)
                    + (compliance review-queue items)
                    + (visuals review items)
                    + (agent annotation queue, future)
  Pipeline        ← /queue             (state-machine reframe — Open Decision 2)
                    ± /failures fold-in

CLIENTS
  All Clients     ← /clients + /client-profile
  Feeds           ← /feeds
  Onboarding      ← /onboarding        (promote to nav)
  Connect         ← /connect

CREATE
  Content Studio  ← /content-studio    (+ visual creation half of /visuals?)
  Formats         ← /system/formats

INVESTIGATE
  Flow            ← /monitor
  Pipeline Log    ← /pipeline-log + /diagnostics + /failures (merge candidates)
  Visual Pipeline ← /visuals (log half, carved out)
  Agents          ← (NEW; status MVP)

REPORTS  (1 nav, 3 tabs)
  Performance     ← /performance       (ops-only after portal split — Open Decision 5)
  Costs           ← /costs
  Calibration     ← (NEW)

ADMIN
  Reviews         ← /reviews           (Open Decision 3)
  Compliance Rules ← /compliance       (rule editor half)
  Subscriptions   ← /system/subscriptions
  Roadmap         ← /roadmap           (Open Decision 4)
```

---

## Open questions surfaced by the inventory (for §6 to resolve)

These are observations to feed §6 — NOT decisions for §1.

- Does `/drafts` get formally retired or stay as an alias?
- Does `/diagnostics` survive as a separate route, or fold into Flow + Pipeline Log? (Kickoff's Investigate list has 4 items: Flow, Pipeline Log, Visual Pipeline, Agents — Diagnostics not in that list.)
- Does `/failures` survive as a separate route, or do dead-letter items surface inside Pipeline Log + Inbox?
- Does the Visuals page split cleanly (creation → Content Studio; log → Visual Pipeline) or is the boundary fuzzier in code than it appears from the route name alone?
- Naming collision risk between `/reviews` (external commit reviewer) and `m.chatgpt_review` (D-01 in-conversation reviews) — does §6 propose a rename for one of them?
- Where does the EF Drift panel (F-EF-DRIFT-PREVENTION Stage 2b deliverable) sit under INVESTIGATE? Pipeline Log, or its own surface?
- Does the brand area gain a search affordance? (No search anywhere in the current sidebar.)
- Does Now > Pipeline replace Queue, or do they coexist (Open Decision 2)?

---

## Honest limitations of this inventory

- Page descriptions for routes other than `/overview` and `/reviews` were inferred from route name + sidebar grouping + kickoff Round 1 context. They were NOT verified against current source for this document. §6 page-fate work will read each `page.tsx` directly before committing fate decisions.
- Round 1 of the kickoff conversation (the original page-by-page audit) was held in chat and not preserved verbatim in the kickoff session file. So this inventory is a fresh pass, not a transcription of prior chat work.
- "Likely fate" entries express the provisional mapping per the locked IA. They are starting positions, not commitments.
- Routes that exist on disk but render an empty / placeholder page would not be visible from this listing alone — the route presence does not prove the page is functionally complete.
- The dashboard repo's `app/(dashboard)/components/` directory was not enumerated for this inventory. Component-level overlaps (e.g. shared cards / strips reused across pages) are out of scope for §1 and may surface in §6.
- The portal repo (`invegent-portal`) was not inventoried here — Layer 1/2 boundary work is §8.

---

*Created 2026-05-06 (Sydney). §1 of 11 in the dashboard architecture review. Source-of-truth lives in this folder per `00_overview.md`. Next: §2 Operator workflow map.*
