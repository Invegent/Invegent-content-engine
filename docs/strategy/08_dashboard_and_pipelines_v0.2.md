# ICE — Dashboard & Content Pipeline Operator Surface

## Purpose

This document is the strategic view of the operator experience — the dashboard PK uses to run ICE, and the flow for preparing content pipelines per client. It is paired with `03_blueprint.md` (technical architecture) and `04_phases.md` (delivery roadmap). It is **not** a build brief. Build briefs for any work derived from this doc go under `docs/briefs/` with proper `cc-NNNN` authoring.

This doc covers:

1. Current dashboard state — what exists, what's painful (inferred)
2. Reconciliation layer integration — `cc-0009` through `cc-0013` and beyond
3. Future information architecture — the IA revamp
4. Advanced content pipeline preparation — the per-client config flow
5. Synthesis — how the three threads connect
6. Open questions for resolution

---

## 1. Current dashboard state

### What exists (verified)

`invegent-dashboard` is a Next.js 15 App Router project on Vercel (project `prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg`). It currently exposes 22 top-level routes under `app/(dashboard)/`, all sitting flat at the same level of the navigation hierarchy. (Confirmed via `list_directory` MCP call against `Invegent/invegent-dashboard:main`.)

Grouped by purpose (grouping is the author's reading, not a structure encoded in the repo):

| Bucket | Routes | Count |
|---|---|---|
| **Daily operations** | `overview`, `inbox`, `drafts`, `queue`, `content-studio`, `visuals` | 6 |
| **Client management** | `clients`, `client-profile`, `connect`, `compliance`, `onboarding` | 5 |
| **Health & observability** | `monitor`, `pipeline-log`, `failures`, `ef-drift`, `diagnostics`, `system`, `performance` | 7 |
| **Insights & cost** | `costs`, `reviews`, `performance` (overlaps) | 3 |
| **Plan / meta** | `roadmap` | 1 |

This grouping is implicit in PK's head, but not in the navigation. Every route renders at the same flat level.

### What works (verified by daily use)

The dashboard is operational. PK runs ICE from it daily. Auto-approver, draft review, publish queue management, feed health, client config — all functional. Whatever else is true, the engine works through this surface.

### What's painful — inferred, not articulated

> **Caveat from review:** The three issues below are **inferred from the dashboard's structure and operating signals** — they have not been directly articulated by PK. They should be validated against PK's lived operator experience before being treated as load-bearing inputs to any build decision. Each inference names the signal it rests on.

**1. Flat navigation is at its scaling limit.** *(Inference; signal: route count.)* 22 routes in one flat menu is already a lot to scan. Adding `cc-0013`'s 5 reconciliation surfaces makes it 27. Beyond that the operator likely cannot form a mental model of "where do I go for X" — every visit risks becoming a hunt. This is structural reasoning, not measurement; the actual operational impact would need PK's confirmation.

**2. Observability is the worst-fragmented area.** *(Inference; signal: 7 routes covering overlapping health concerns.)* Health-related surfaces are spread across 7 routes (`monitor`, `pipeline-log`, `failures`, `ef-drift`, `diagnostics`, `system`, `performance`). When something breaks, the operator likely has to check multiple surfaces to triage. There is no obvious single "is the system healthy right now" view. The reconciliation work (`cc-0009` → `cc-0012`) was the first attempt at a unified system-health signal at the database level. `cc-0013` will be the first attempt to surface it at the UI level — but by default it adds 5 more routes on top of the existing 7, not replaces them.

**3. The dashboard may be expensive to change.** *(Weakest inference; signal is ambiguous.)* `docs/00_sync_state.md` records `Dashboard PHASES reconciliation` as deferred for 24 consecutive sessions. Two readings of this signal are both defensible from the available evidence:

- **Narrow reading.** That specific item refers to the synchronisation between the dashboard's roadmap page `PHASES` array and `docs/04_phases.md` — a narrow doc-sync task. The deferral pattern says PHASES sync is low priority and gets bumped for legitimate reasons every session. It tells us nothing about whether the dashboard is broadly expensive to change.
- **Broader reading.** Even narrow doc-sync tasks that touch dashboard files get deferred 24 times in a row, which is *some* evidence that any dashboard touch carries non-trivial setup or coordination cost.

PK is best placed to say which reading is closer to truth. If the broader reading holds, it shapes the build-order decision in §3. If the narrow reading holds, that decision rests on other inputs.

---

## 2. Reconciliation layer integration

### What was delivered (`cc-0009` → `cc-0012`)

The reconciliation layer (the `r.*` schema and `op.*` operator views) is the system's first closed-loop self-monitoring capability. It runs server-side, on a weekly cadence (cron 85) plus on-demand.

In plain terms:

- **`cc-0009`** delivered the cadence rule schema — the system now knows what each client SHOULD publish, per platform, per day.
- **`cc-0010A`/`B`/`C`** delivered the matching infrastructure — the system records what each client DID publish, then matches it against expected.
- **`cc-0011`** delivered the drift checker — when expected ≠ actual, the system logs WHY at three severities (info / warn / critical).
- **`cc-0012`** delivered the operator-facing views — 5 read-only views (`op.v_reconciliation_summary`, `op.v_per_client_rollup`, `op.v_per_platform_rollup`, `op.v_drift_rollup`, `op.v_freshness_rollup`) that any operator can `SELECT` from.

This is among the most important reliability work since dead-letter queueing (Phase 1.7). The system can now tell the operator "your weekly content cadence is on-track / off-track, and here's why" without the operator having to dig through cron logs and `m.post_publish` history.

### What `cc-0013` will deliver

The web surface. Five pages, one per `op.*` view, all read-only, all server-side rendered (no client-side data fetching of service-role data). Auth via Vercel platform-level email allowlist. See `docs/briefs/cc-0013-dashboard-phase-0.md` for the full design brief.

`cc-0013` is currently authored as Phase 0 (brief-only, no code). Stages B/C/D/E remain unauthored. The brief is deliberately narrow on scope; see §3 caveat below before assuming any of the build orders quietly extend it.

### What's still ahead

**PRV-2/3/4 — observer integration.** The reconciliation layer currently matches against `m.post_publish` — what the system thinks it published. PRV-2/3/4 will add platform-side observers that independently verify "did this post actually appear on Facebook / LinkedIn / YouTube?" When those land, the freshness scoreboard's NULL columns (`observer_is_healthy`, etc.) populate, and reconciliation becomes a fully closed loop: expected → published → observed.

**Reconciliation v2 — the matching architecture.** `docs/briefs/reconciliation-v2-spec.md` exists as a draft. It addresses gaps the v1 work surfaced — multi-evidence matching, cross-platform matches, planned content vs unplanned content separation. Not yet promoted to a `cc-NNNN` brief.

**Customer-facing reconciliation.** Clients seeing their own reconciliation in their portal. This is multi-tenant filtering + RLS work and is explicitly out of scope until `invegent-portal` is properly built.

---

## 3. Future outlook — dashboard information architecture

### The proposal: 5 top-level sections

| Section | Purpose | Current routes folded under it |
|---|---|---|
| **Operate** | Daily content work | `overview`, `inbox`, `drafts`, `queue`, `content-studio`, `visuals` |
| **Clients** | Per-client config | `clients`, `client-profile`, `connect`, `compliance`, `onboarding` |
| **Health** | System observability | `monitor`, `pipeline-log`, `failures`, `ef-drift`, `diagnostics`, `system`, `performance`, **`reconciliation` (cc-0013)** |
| **Insights** | Cost + QA + impact | `costs`, `reviews`, `performance` (cross-linked) |
| **Plan** | Roadmap & meta | `roadmap` |

This is the IA revamp. It would turn 22 flat routes into 5 sections of 4–8 routes each. Reconciliation lands cleanly under Health as one more observability surface — not as a 23rd top-level route.

### Where reconciliation actually slides in

Under **Health → Reconciliation**, with 5 child tabs (Summary / Clients / Platforms / Drift / Freshness) matching the 5 `op.*` views from `cc-0013`. The Health section itself would get a unified landing page that aggregates signals across the 8 child routes — answering "is anything broken right now?" with a single attention banner that can deep-link to whichever child surface explains the answer.

This means the `cc-0013` brief's §5 open question ("extend `invegent-dashboard` OR parallel project") would best be resolved in favour of **extend** — but only after the IA revamp is committed. If reconciliation lands first as a parallel project, folding it back in later is more work than building it in the new structure to start with.

### The build order question

There are three viable orderings:

**Order A — IA first, then reconciliation.** Revamp `invegent-dashboard` nav + shell, then build `cc-0013` surfaces under the new structure. Cleanest end state. Costs 2–4 weeks of dashboard work before any reconciliation visibility lands at the UI layer.

**Order B — Reconciliation first as standalone, then fold in.** Build `cc-0013` as a parallel Vercel project (the brief's other option). Get reconciliation visibility quickly. Pay the fold-in cost later. Useful if reconciliation visibility is urgent.

**Order C — Catalyst revamp.** Build `cc-0013` inside `invegent-dashboard` as the wedge for the IA revamp itself. Stage B of `cc-0013` includes the new nav shell + Health section creation. Stage C wires the 5 surfaces under the new structure. Single delivery, double benefit. Highest risk of scope creep, but the only ordering that resolves the 24-deferral pattern (if the broader reading holds) at the same time as shipping reconciliation.

The right answer depends on (a) how painful the current dashboard actually is to operate (see §1 caveat) and (b) how urgent reconciliation visibility is. Neither is currently measured.

### Caveat: `cc-0013` scope under each order

Order C as described would meaningfully **expand `cc-0013` beyond its current Phase 0 / brief-only / no-scaffold scope**. The current `cc-0013` brief is deliberately narrow — it covers design only, with explicit non-deliverables including "no scaffolding". Adopting Order C is not a quiet extension of the existing brief — it requires either:

- a fresh `cc-NNNN` brief covering the IA revamp + nav shell as a peer to `cc-0013`, with `cc-0013` Stage B/C consuming the new shell rather than authoring it, or
- an explicit `cc-0013` v2 brief that re-scopes the original Phase 0 design boundary

Either path means a `cc-NNNN` authoring round + D-01 cycle before any code lands. Order A and Order B do not require this — `cc-0013` Stage B authoring can proceed within the existing Phase 0 boundary under either ordering.

---

## 4. Advanced content pipeline preparation

### The current way — what it takes to set up a pipeline today

Configuring a content pipeline for a new client requires populating 7 tables, roughly in this order:

1. `c.client` — identity (name, slug, timezone, status)
2. `c.client_ai_profile` — persona, system prompt, model, platform rules
3. `c.client_channel` — platform OAuth connections (FB, IG, LI, YT)
4. `c.client_digest_policy` — content selection rules (strict/lenient, window)
5. `c.client_publish_profile` — publish mode, throttle, token, boost settings
6. `c.client_source` — feed → client links with weights
7. `c.client_content_scope` — client → content vertical links

Most of these are not exposed through clean UI. Some flow through the `onboarding` and `client-profile` routes; some are done by SQL. Implicit dependencies are not enforced (you can save `c.client_publish_profile` referencing a token that doesn't exist in `c.client_channel`). The flow is not opinionated, not staged, and not visually navigable. It is database administration with a UI veneer.

### The advanced way — what it could be

> **Caveat:** the Content Pipeline Builder concept below is the author's proposal, not a directly-requested feature. PK asked for "advance way of preparing for content pipelines"; the specifics — Builder, templates, AI brand profile, dry-run, diagnostics — are the author's interpretation of what "advance" means in this context. They should be treated as one possible design framing, not a pre-decided direction.

A **Content Pipeline Builder** — a first-class flow in the dashboard, not a database admin task. The builder would treat pipeline setup as the operator's primary creative act, because it determines everything the pipeline produces for that client for months. Five things would change.

**1. Templates per vertical.** Each starting template would pre-fill 70–80% of the 7-table config. The operator confirms or adjusts, doesn't author from scratch. Template seed set, prioritised per the standing build order documented in memory (personal businesses first, hobbies second, external clients third):

- **Tier 1 — PK's personal businesses:** NDIS Allied Health (Care for Welfare), Property Buyer's Agent, FBA / NDIS Accessories retailer
- **Tier 2 — PK's personal brand:** Personal Creator (YouTube), Invegent brand
- **Tier 3 — External-client verticals:** NDIS Plan Management, NDIS Support Coordination, Property Mortgage Broker, Property Investment Education, Aged Care, Mental Health

*(Note: tier ordering is the author's reading of the memory-recorded priority. PK is best placed to confirm or adjust the specific tier contents — particularly Tier 2, where the YouTube creator vs Invegent brand ordering is not memory-encoded.)*

**2. AI-assisted brand profile generation.** When a client says "we're an OT practice in Brisbane focused on paediatric NDIS work," the system would scan their existing website + Facebook + LinkedIn (if URLs provided), propose a `c.client_ai_profile` (tone, taboo topics, compliance posture, CTA library), and let the operator review/edit. The brand-scanner brief (`docs/briefs/brief_016_brand_scanner.md`) was an early attempt at this; it could become the spine of the new flow rather than remaining a one-off feature.

**3. Visual cadence builder.** Replace database-level `r.client_cadence_rule` authoring with a visual editor — "this client publishes 3 posts per week, Mon/Wed/Fri, between 9am and 5pm AEST, with a 4-hour minimum gap." This is what the reconciliation layer checks against. It would be authored in the dashboard, not in SQL migrations.

**4. Preview mode — dry-run pipeline.** Before any content publishes for a new client, the operator would be able to run the pipeline end-to-end in a sandboxed mode — pull this week's feeds, score against this client's content scope, generate drafts in this client's voice, surface what WOULD have been published, without actually publishing. This is the only honest way to validate a config before going live. Today the validation method is "publish for a week and see what happens", which has real downside.

**5. Pipeline diagnostics — show me why.** For any draft (approved or rejected, auto or manual), the operator would be able to click "explain" and see: which feed item triggered it, which signals scored it, which scope rules matched, which persona rules shaped it, which compliance rules approved or rejected it. The `cc-0009` → `cc-0012` reconciliation infrastructure is the first half of this (we know what happened). Diagnostics is the second half (we know WHY it happened).

### What this would unlock (estimated, not measured)

A pipeline builder of this shape **would likely reduce** ICE's marginal cost per new client. The illustrative direction — from "half a day of careful config" to "30 minutes of operator review of a pre-filled template" — is **an author's estimate, not a measurement**, and would need calibration against an actual onboarding run before being relied on for capacity planning. The direction of effect is high-confidence (templates + dry-run + diagnostics reduce setup cost); the specific magnitude is not.

If even half the estimated reduction holds, it changes the unit-economics maths in `07_business_context.md` from "10 clients = 5 hours/week operational" to a more comfortable number. If none of it holds, the unit economics still work — they just work less elegantly.

For PK specifically, the bigger near-term unlock is **time spent per personal-business pipeline**. Care for Welfare, Property Buyer's Agent, NDIS Accessories, the personal creator brand — each one currently absorbs setup-style effort whenever its config drifts. An opinionated builder + dry-run + diagnostics turns that effort into routine review (estimated, not measured).

### What's missing today — beyond the builder

ICE has an implicit **client lifecycle** but no surface that reflects it:

- **Onboarding** — one-off, manual, partly UI / partly SQL. Covered partially by `onboarding` route.
- **Daily operation** — running pipeline, reviewing drafts, publishing. Covered by `inbox`, `queue`, etc.
- **Reconciliation** — `cc-0009` → `cc-0012`, system-level only at present.

What ICE does NOT have:

- **A "tune the pipeline" mode.** When reconciliation surfaces drift, the operator's only response today is to edit SQL or wait. There could be a flow: "client X is missing posts → here's what's broken → fix it here."
- **A client review cycle.** Periodically, every client's config should be reviewed (model drift, taboo-topic shifts, compliance updates). There's no surface for that. It happens ad-hoc or not at all.
- **A pause / resume / sunset mode.** Turning a client off cleanly without dropping pipeline state. Today this is `c.client.status = 'paused'` and hope for the best.

These are gaps the dashboard revamp could address alongside the IA work and the pipeline builder.

---

## 5. Synthesis — what this all means together

The dashboard revamp, reconciliation integration, and advanced pipeline preparation are framed in this doc as three views of the same project: **turning ICE from a database-admin tool into an operator-grade product.**

- The IA revamp would give the operator a coherent surface to work from.
- The reconciliation integration would give the operator a system-health signal that closes the observability loop.
- The pipeline builder would give the operator a way to set up, tune, and review clients without writing SQL.

Doing any one of these well requires touching the other two at some level. Doing them together — in the right order — is the catalyst-revamp opportunity that Order C in §3 represents.

The single most important decision in the next 30 days is whether to take that catalyst opportunity (Order C) or sequence the work (Order A or B). That decision deserves its own `cc-NNNN` brief once this strategic doc is settled — and, if Order C is selected, additional `cc-NNNN` authoring per the §3 scope caveat.

---

## 6. Open questions for resolution

1. **§1 pain points — validation.** Do the three inferred pain points in §1 match PK's lived experience, or are some of them off?
2. **24-deferral reading.** Narrow (PHASES doc-sync only) or broad (dashboard touch is costly)? This shapes Order selection in §3.
3. **Build order.** A (IA first), B (parallel reconciliation), or C (catalyst). Depends on (1) + (2) above.
4. **Pipeline builder scope.** Full 7-table flow at v1, or staged (e.g. cadence + brand profile first, scope + sources later)?
5. **Template seed set sizing.** Tier 1 only at v1 (3 templates), or all of Tier 1 + Tier 2 (5 templates)? Tier 3 deferred to external-client phase regardless.
6. **Customer portal interaction.** Does the pipeline builder ever expose any surface to the client themselves, or strictly operator-only at v1?
7. **Diagnostics depth.** How much pipeline introspection is exposed? Draft-level only, or full feed-to-publish trace?
8. **Dry-run isolation.** Does preview mode share the production `m.*` tables (with an `is_preview` flag), or use a separate `preview.*` schema? Has implications for cron, RLS, and storage.

---

*Document authored 2026-05-14 Sydney. Pairs with `03_blueprint.md` (architecture) and `04_phases.md` (roadmap). Strategic doc; not a build brief. Update when direction changes, not on cadence.*

*Review history: v0.1 authored by Claude (chat). v0.2 hardened against ChatGPT MCP review `defc0fe1-5dc8-4216-84cf-e35726280f15` (verdict: `partial`, escalated for PK judgment): §1 pain-point claims marked as inferred with named signals; §1 24-deferral interpretation disambiguated (narrow vs broad reading); §4 time savings claims marked as author estimates not measurements; §3 `cc-0013` scope caveat added; §4 template tiering note added. ChatGPT did **not** push on: "most important reliability work" claim in §2; tier ordering faithfulness in §4; "operator-grade product" framing in §5; missing risks (daily-ops continuity, dry-run data leakage, LLM-cost blowup). These remain uncontested in v0.2 and should be specifically targeted in subsequent LLM reviews. Awaiting further reviews before v1.0 commit.*
