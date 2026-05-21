# §12 — Dashboard Revamp Master Plan

> **Single execution plan for the dashboard revamp.** Converts the saved dashboard architecture review (§00–§11) into one phased, build-ready document. The saved research is the source of truth; this file does **not** reopen the IA debate — it sequences and visualises what is already locked.
>
> Created 2026-05-21 Sydney. Built on dashboard-review §6 (final target design), §9 (implementation plan), §11 (final consolidation), and the v3.04 Slice 0A merge record. Planning/documentation only — no dashboard edits, no Supabase, no implementation.

---

> **Operating mental model (read this first).** The conceptual frame behind this whole revamp — the production pipe, the diagnostic & repair shafts, the friction register as a *backlog* (not a log), and the dashboard as the operations plane on top — lives in `docs/concepts/ice-pipeline-operating-model.md`. That doc explains ICE itself; this §12 is the dashboard execution plan that follows from it. The four-planes → dashboard-surface mapping is recorded there as *design direction*, not a change to the §6-locked IA.

---

## 1. Executive summary

**Goal.** Convert the current ICE operations dashboard from a flat "admin template" sitemap into a calm operator command-centre built around the locked 5-section IA (NOW / CLIENTS / CREATE / REPORTS / ADMIN), with a real exception Inbox, a state-machine Pipeline, a daily Brief, and a complete action layer — so the operator can run a full daily loop without dropping to SQL-via-chat.

**Current state.** The dashboard is live at `dashboard.invegent.com`. As of 2026-05-21 the **sidebar IA shell + visual tokens have shipped** (Slice 0A, merged at `3ec489b`); the nav now reads NOW / CLIENTS / CREATE / REPORTS / ADMIN with NOW grouped Daily / Investigate / Legacy. But every page *behind* that nav is still its pre-revamp self: `/queue` is the old Queue, `/inbox` is an interim surface predating `m.attention_item`, failures live in three places, and the requeue-dead-item action still runs through SQL-via-chat (the single biggest gap in the review).

**What Slice 0A completed.** Cosmetic, reversible shell only — sidebar regrouped to the locked IA, collapsed Legacy group, 5 semantic status colour scales + typography/spacing token helpers, mobile drawer preserved. No routes, pages, data, or backend touched. **Slice 0A is explicitly NOT real Phase 0.**

**What remains.** Everything load-bearing: the real Phase 0 schema groundwork (`m.attention_item`, `m.vw_pipeline_state`, `m.brief`, `m.action_event`/audit), then Phases 1–4 — foundation (requeue + AP5/AP6 cleanup), Inbox + Pipeline reframe, action layer + Brief MVP, and polish + retirements. The review sizes this at **~44–54 chat hours / 5–9 weeks** at 2–3 sessions/week, plus a visual-design workstream layered on top.

**Critical framing held throughout this plan:** Slice 0A (done) → Slice 0A.1 sidebar polish (next, cosmetic) → **real Phase 0** (gated) → Phases 1–4. The first three are easy to conflate; they are not the same thing.

---

## 2. Locked IA (do not reopen)

Five top-level sections, ~18 nav items via internal NOW grouping. This is locked in §6.1 and already implemented in the sidebar at `3ec489b`.

```
NOW        ← operational; the daily loop
CLIENTS    ← per-client surfaces + connections
CREATE     ← authoring (drafts that flow into the pipeline)
REPORTS    ← weekly-cadence trend/analytics, read-mostly
ADMIN      ← monthly-cadence config + ICE-level settings
```

NOW is internally grouped:

- **Daily:** Overview · Inbox · Pipeline
- **Investigate:** Flow · Pipeline Log · Visual Pipeline · Agents (+ Operations as a transitional surface until cc-0015 friction-pool-view supersedes it)
- **Legacy** (collapsed, default-closed): Failures · EF Drift — retained, reachable, slated to dissolve

**PK feedback recorded (to action in Slice 0A.1, §7):**
- **NOW is the preferred top-level label.** Keep it.
- **The "Daily" sub-heading under NOW is felt as redundant** — if NOW already clearly *means* daily work, the Daily label adds a depth the operator doesn't need. Candidate: drop the explicit "Daily" group label and let Overview/Inbox/Pipeline sit directly under NOW, keeping "Investigate" and "Legacy" as the only named sub-groups. (See §7 + north-star §A.)
- **The sidebar needs visual polish** from PK's manual review — brand presence, sign-out clarity, heading hierarchy, collapse-arrow visibility.

> Note: this plan records PK's "Daily redundant" preference as a *proposed* refinement to the locked §6.2.a grouping. §6 locked "Daily + Investigate sub-groups"; dropping the Daily *label* (while keeping the three items at the top of NOW) is a cosmetic refinement, not an IA change, and is safe to do in the sidebar-only Slice 0A.1. If PK wants the items regrouped or reordered, that is still within sidebar scope.

---

## 3. Current completed work — Slice 0A (merged)

| Fact | Value |
|---|---|
| Dashboard main HEAD | `3ec489b6fb1e4ad706aac9d32f7fefa4ad43b9c5` |
| Parent | `d17b6047411ce177d6182d86a21a79f7302459af` |
| Merge method | squash (of `e65b8123…` initial + `399c0874…` CCB polish) |
| Files | `components/sidebar.tsx` · `tailwind.config.ts` · `app/globals.css` (exactly 3) |
| Validation | CCD review PASS · CCB visual QA PASS · CCB polish re-check PASS · `tsc --noEmit` exit 0 · Vercel success |

**Scope:** sidebar IA shell + visual tokens. **No** route / page / backend / Supabase changes. Independently verified (commit SHA + live `sidebar.tsx` read) and recorded in `docs/00_sync_state.md`, `docs/00_action_list.md`, and `docs/runtime/sessions/2026-05-21-v3.04-dashboard-slice-0a-merged.md`.

**Boundary (repeated because it matters):** Slice 0A is Pre-Phase 0 cosmetic work that used the Gate-11 waiting window. It does not start, advance, or substitute for real Phase 0.

---

## 4. Full phased roadmap

The phase content below is the §9 implementation plan, restated as one roadmap. Capacity figures and migration IDs are §9's; this plan does not re-estimate them.

### Pre-Phase 0 (cosmetic, reversible — no schema, no data)
- **Slice 0A — DONE** (`3ec489b`). Sidebar IA shell + visual tokens.
- **Slice 0A.1 — NEXT.** Sidebar visual polish per PK review (§7). Sidebar-only; no routes/pages/backend.
- **Production visual check.** CCB confirms 0A.1 on desktop + the `d17b604` mobile breakpoint; PK confirms it "feels right" before any page-level work.

### Phase 0 — Groundwork (additive only, no UI) — *gated*
Real Phase 0. ~6–8h, 3 migrations, 0 page rewrites (§9.3).
- **`m.attention_item`** — the canonical Inbox surface (the real one; today's `/inbox` is interim).
- **`m.vw_pipeline_state`** (M-09-03) — server-side view deriving the canonical pipeline state per §6.5; foundation for the Pipeline swimlane.
- **`m.brief`** (M-09-02) — Brief storage table.
- **`m.action_event` / audit** — audit trail for the action layer (requeue/retry/ack/bulk-approve); §9 lands this as requeue audit + bulk-approve audit tables.
- **Doctor severity + ack columns** (M-09-01) on `m.pipeline_doctor_log`.
- **Route/data inventory** (I-09-01…04) — hardcoded-client sweep, `MONITOR_TABS` sweep, server-actions gap map.
- **Prerequisites / blockers (hard):** S30 hold-state cleared; M5–M8 queue-integrity reconciled with the `m.vw_pipeline_state` definition; every migration through `apply_migration` + D-01 + Lesson #61 pre-flight + explicit PK go. **Phase 0 cannot start until these clear.**

### Phase 1 — Foundation: page/subnav alignment + requeue + visibility
~10–12h (§9.4). Clears ship-blockers AP5 + AP6, lands AP3.
- Sidebar restructure already substantially done by Slice 0A; Phase 1 reconciles it with the real nav contract and route renames/redirects (`/system/formats`→`/formats`, `/system/subscriptions`→`/subscriptions`).
- **Client selector pattern** made data-driven from `c.client` (kills hardcoded `CLIENT_TABS`; AP6).
- **Requeue dead-item** action (UI + server action + audit) — closes the CRITICAL SQL-via-chat gap (AP3).
- **Doctor severity column** surfaced on Pipeline Log (visibility before the Phase 3 ack action; AP7 foundation).
- **`MONITOR_TABS` removed** across the 6 coupled files (AP5) — stop the misleading shared-tab labels.
- Telegram bot infra + doctor severity classifier (capacity-flagged; may slip to a Phase 1.5).

### Phase 2 — Real Inbox + real Pipeline
~10–12h (§9.5).
- **Real Pipeline** — state-machine swimlane page over `m.vw_pipeline_state`, replacing `/queue`. The intended flow the operator should see: **Feeds → Slots → Ingest → AI Generation → Asset Production → Compliance → Published** (see north-star §C). `/queue` 301-redirects after one stable week.
- **Real Inbox** — `m.attention_item`-backed; filter chips (All/Drafts/Policy/Format/Agent), severity-sorted, bulk approve (clears the 28-draft backlog).
- **Failures folded** into Pipeline Log + Inbox; `/failures` retires (301 to `/pipeline-log?state=dead`).

### Phase 3 — Brief MVP + action layer + audit + operator decision loop
~10–12h (§9.6).
- **Brief MVP** (templated baseline) as the top block on Overview; daily Telegram push.
- **Action layer completed:** acknowledge auto-fix, retry render, override format-advisor, inline rule update (Inbox→Compliance Rules pre-fill), inline reconnect token.
- **Audit events** for every action; severe doctor fixes create Inbox ack items and block downstream movement until acked.

### Phase 4 — Reports/Admin cleanup + legacy retirements + final polish
~8–10h (§9.7).
- LLM enrichment for the Brief Summary; REPORTS Calibration tab promoted to peer.
- Legacy route retirements; URL flattens; `/drafts`→`/inbox`.
- **Irreversible** NDIS+PP column drop on `m.pipeline_health_log` (gated on 4+ weeks dual-write success).
- Final visual-consistency pass.

---

## 5. Visual design workstream (parallel to functional phases)

The functional phases above make the dashboard *correct*; this workstream makes it *feel* like an operator command centre. It runs alongside, anchored by a token layer (the Slice 0A `tailwind.config.ts` + `globals.css` tokens are the v1 seed).

Covers: **typography** (heading scale; stat/number styling; readable body density) · **spacing rhythm** (generous, calm, not dense-admin) · **colour hierarchy** (neutral base; status semantics below) · **alert strip** (the global top bar — legible, not shouty) · **card / table density** (one comfortable, one compact rule) · **status / severity display** (badges driven by the 5 token scales) · **pipeline swimlane design** (the Phase 2 centrepiece — the Feeds→Published flow must read at a glance) · **mobile polish** (preserve + extend the `d17b604` drawer behaviour) .

**Roles in this workstream:** **PK = visual taste + final "does this feel right" judgement.** ChatGPT chat = design/product strategist + directive writer. **CCB = mechanical/browser QA only** (does it render, does it work on mobile, screenshot capture) — **not** the visual-taste authority. The design system is defined before heavy page rewrites so pages don't each grow their own style; tokens early, full component library as surfaces land.

---

## 6. Page-by-page plan

Each page's *current role* and *target role* are from §6; *keep/rename/merge/retire* and *design notes* synthesise §6 fates. "VERIFY" flags where §6's own honest-limitations note the page body wasn't read in the review.

| Route | Current role | Target role | Fate | Dependencies | Design notes |
|---|---|---|---|---|---|
| `/overview` | Status banner, token alerts, health card, quick stats | NOW>Overview command-centre: Brief top block + status + agent row + drafts/incidents two-column + health + schedule | **Keep + expand** | `m.brief` (P0); Brief surface (P3) | Don't duplicate other surfaces — Overview *integrates*, deep-links out. Brief is one block, not the page. |
| `/inbox` | Interim review surface (pre-`m.attention_item`) | NOW>Inbox: single exception-triage surface; flat list + filter chips + severity sort + bulk approve | **Keep, rebuild on `m.attention_item`** | `m.attention_item` (P0); absorption (P2) | Absorbs compliance review items + format/agent escalations + stuck-item acks. `/drafts` aliases here. |
| `/queue` | Current publish queue + status tabs | NOW>Pipeline: state-machine swimlanes (Feeds→…→Published) | **Retire → replaced by `/pipeline`** | `m.vw_pipeline_state` (P0); page build (P2) | `/queue` 301s after 1 stable week. Label already shows "Pipeline" in sidebar (transitional). |
| `/monitor` | Pipeline flow diagram ("Monitor") | NOW>Investigate>Flow: high-altitude diagram | **Keep + rename + de-tab** | `MONITOR_TABS` removal (P1); `CLIENT_TABS` data-driven (P1) | H1 "Monitor"→"Flow"; node click → Pipeline Log filtered to that stage. |
| `/pipeline-log` | Forensic log (mislabelled "Pipeline" pre-0A) | NOW>Investigate>Pipeline Log: row-level forensic + dead/failed + drift | **Keep + rename + absorb /failures** | severity col (P1); failures merge (P2); ack (P3) | Target home for dead/failed items + requeue + doctor ack. Drop hardcoded published-today columns (P0/P4). |
| `/visuals` | Render log + format-advisor + format perf | NOW>Investigate>Visual Pipeline | **Keep + rename + de-tab** | retry/override actions (P3) | H1→"Visual Pipeline"; add Retry (failed render) + Override (low-confidence advisor → Inbox). |
| `/diagnostics` | Tier-2 LLM diagnostic agent | NOW>Investigate>Agents (status MVP) | **Keep + rename + reframe** | per-agent status cards | Status only — NO calibration/tuning UI in v1 (locked decision 3). |
| `/operations` | Friction/case rows (cc-0016 evidence) | Transitional Investigate surface | **Keep transitional → reconcile into cc-0015 friction-pool-view** | cc-0015 (gated 2026-05-26) | Not in the locked target IA; mobile-verified at `d17b604`. Reconcile when friction-pool-view ships. |
| `/clients` | Per-client config + 9 in-page tabs | CLIENTS>[client] drilldown (`ClientProfileShell`) | **Keep** | — | In-page tabs (Connect/Feeds/Onboarding/Voice&Formats) overlap sibling sidebar items — see duplication note below. |
| `/content-studio` | Authoring + analyse mode (`ChannelSubscriptions`) | CREATE>Content Studio (single + series; analyse mode removed) | **Keep + trim** | feeds move (P1+) | `ChannelSubscriptions` analyse-mode → CLIENTS>Feeds. Authors drafts; review happens in Inbox. |
| `/performance` | Engagement metrics + Approval-Patterns inner tab | REPORTS>Performance (+ Calibration promoted to peer) | **Keep + split** | Calibration promotion (P4) | Ops-only until Layer-1/2 portal split. Calibration read-only in v1. |
| `/costs` | AI spend (label "AI Costs" pre-0A) | REPORTS>Costs | **Keep + de-tab** | `MONITOR_TABS` removal (P1) | Single source for cost numbers; don't also render as an Overview card. |
| `/compliance` | Rules editor + review queue (two products) | ADMIN>Compliance Rules (editor only) | **Split** | review items → Inbox (P2) | Locked split: review items become Inbox `policy` items; this page keeps only the rule editor. |
| `/roadmap` | PHASES viewer | ADMIN>Roadmap (read-only v1) | **Keep** | — | Editing stays chat+git. PHASES reconciliation is a separate deferred item; not touched in 0A/0A.1. |

**Cross-page duplication flagged for the build (from the IA audit + §6 fates):** client sub-surfaces exist both as `/clients` tabs and as sibling sidebar items (Connect/Feeds/Onboarding/Voice&Formats) — §6 resolves Feeds and Formats homes; the tab-vs-sidebar boundary should be settled per concept in Phase 1. Failed/dead state lives in three places today (Pipeline card + Pipeline Log + Failures) — collapses into Pipeline Log + Inbox by Phase 2. "Review" naming collides across Inbox / ADMIN Reviews / Compliance — §6.9 defers the `/reviews` vs `m.chatgpt_review` clash.

---

## 7. Sidebar follow-up — Slice 0A.1 (PK manual review)

Sidebar-only, cosmetic, reversible. No routes, pages, data, or backend. Feature branch + preview + CCB QA, same discipline as Slice 0A.

PK manual-review actions:
1. **Remove the redundant "Daily" group label under NOW.** Overview / Inbox / Pipeline sit directly under NOW; keep "Investigate" and "Legacy" as the only named sub-groups. (NOW already means daily.)
2. **Make the Invegent brand slightly bigger / stronger** in the header block.
3. **Make sign-out clearer** (more obvious affordance / label, not a faint icon).
4. **Section headings (NOW/CLIENTS/CREATE/REPORTS/ADMIN) bigger/bolder** than the sub-group labels (Investigate/Legacy) — establish a clear two-tier hierarchy.
5. **Make the collapse arrow more visible** on the Legacy (and any) collapsible group.
6. **Keep all changes sidebar-only** — `components/sidebar.tsx` (+ token tweaks in `tailwind.config.ts`/`globals.css` if needed). No nav targets change.

Acceptance: typecheck clean; mobile drawer (`d17b604`) preserved; CCB desktop + mobile pass; PK visual sign-off before any page-level slice begins.

---

## 8. Execution model

| Role | Responsibility |
|---|---|
| **ChatGPT (chat)** | Product/design strategist; directive writer; IA guardian; reviewer. Holds the saved research as source of truth. |
| **PK** | Final product + visual judgement. "Does this feel right?" Approval authority on every production action + each migration. |
| **CCD** | Implementation engineer — builds branches, edits React/Tailwind, runs typecheck, applies migrations CC authors. |
| **CCH** | Planning / documentation / review where appropriate; repo operations; reads page bodies the review didn't. |
| **CCB** | Mechanical browser QA only — render checks, desktop/mobile screenshots, regression. **Not** visual-taste authority. |

(Naming reconciliation: the build chain in current sync state is CC authors migrations / chat applies via Supabase MCP / D-01 ChatGPT cross-review mandatory before every production mutation. This §8 maps the design-workstream roles onto that existing chain; it does not replace D-01 or the apply_migration path.)

---

## 9. Guardrails (binding; from current sync state + directive)

- **cc-0015 Gate 11 watch remains rank 1 until 2026-05-26.** Do **not** start cc-0015 (friction-pool-view) early.
- **Do not start cc-0016 Stage E** (lifecycle cleanup) — separately-approved-only; CONSTRAINT 2 binds.
- **Do not start PRV** — deferred per D-FR-RECON-001 §7.D.
- **Do not close Q-005** — OPEN, non-blocking, next-fire watch (brief v3.1.1).
- **Do not mutate Supabase without explicit D-01 + PK approval.** All DDL via `apply_migration`; Lesson #61 P1–P5 pre-flight.
- **Do not treat Slice 0A as real Phase 0.** Real Phase 0 (the `m.*` groundwork) is gated on S30 + M5–M8 and has not started.
- Standing don't-redeploy: heygen-creator / heygen-poller / draft-notifier. Phase 0 blocked on S30 clearance + M5–M8 reconciliation.

---

## 10. Recommended immediate next actions

1. **Finish Slice 0A.1 sidebar polish** (§7) — cosmetic, sidebar-only, fast. Gets PK's visual concerns addressed and the nav feeling right before anything structural.
2. **Production visual check** of 0A.1 (CCB desktop + mobile; PK sign-off).
3. **Then plan the first page-level visual/product slice.** Recommended first candidate: **the Pipeline / Queue page**, because it is central to PK's desired operating flow — **Feeds → Slots → Ingest → AI Generation → Asset Production → Compliance → Published** — and it is where the SQL-via-chat requeue gap hurts most. (Note the dependency reality: the *full* Pipeline rebuild needs `m.vw_pipeline_state` from real Phase 0, which is gated on S30 + M5–M8. So the first page-level slice can be a visual/wireframe + read-only swimlane mock against existing data, with the live state-machine wiring landing once Phase 0 clears. This keeps momentum without jumping the gate.)
4. Hold all Phase 0 schema work until S30 clears and M5–M8 reconcile.

---

## 11. End Product Visual Mockup / North-Star Dashboard

> Planning/mockup section. Markdown wireframes only — no image files, no implementation. Purpose: give PK a concrete north-star to react to *before* major build work, and to expose gaps early.

### A. Final sidebar mockup

Reflecting PK's preference to drop the redundant "Daily" label (items sit directly under NOW):

```
┌─────────────────────────────┐
│  ◆  INVEGENT                 │   ← brand: bigger/stronger (0A.1 #2)
│     ICE Ops          [⏻ Sign out]│  ← sign-out clearer (0A.1 #3)
├─────────────────────────────┤
│  NOW                         │   ← section heading: big/bold (0A.1 #4)
│    ▸ Overview                │
│    ▸ Inbox            (3)     │   ← count badge when items await
│    ▸ Pipeline                │
│    Investigate               │   ← sub-group label: smaller/recessive
│      Flow                    │
│      Pipeline Log            │
│      Visual Pipeline         │
│      Agents                  │
│      Operations  (transitional)│
│    Legacy                  ⌄ │   ← collapse arrow more visible (0A.1 #5)
│      Failures                │     (collapsed by default)
│      EF Drift                │
│                              │
│  CLIENTS                     │
│    All Clients               │
│    Feeds                     │
│    Onboarding                │
│    Connect                   │
│                              │
│  CREATE                      │
│    Content Studio            │
│    Formats                   │
│                              │
│  REPORTS                     │
│    Performance               │
│    Costs                     │
│    Calibration   (P4)        │
│                              │
│  ADMIN                       │
│    Reviews                   │
│    Compliance Rules          │
│    Subscriptions             │
│    Roadmap                   │
└─────────────────────────────┘
```

PK preference noted: if NOW already clearly represents daily work, the "Daily" label is dropped (above). Investigate + Legacy remain named because they *change altitude* from the daily three.

### B. Final NOW > Overview command-centre mockup

```
┌──────────────────────────────────────────────────────────────────┐
│ ● 4 critical alerts   ·   37 posts / 7d   ·   5 drafts to review   │ ← alert strip (calm, legible)
├──────────────────────────────────────────────────────────────────┤
│  Overview                                  [ Client: All clients ▾ ]│ ← client selector incl. "All"
│                                                                    │
│  ┌── BRIEF ─────────────────────────────────────────────────────┐ │
│  │ ⚠ Alerts    NDIS-Yarns token expires in 5 days · 1 stuck item │ │
│  │ ◆ Decisions 5 drafts await review (oldest 2 days) · IG cap…   │ │
│  │ ✎ Summary   Last 24h: 8 published, pipeline healthy, 1 render │ │
│  │             retry cleared by doctor. Watch: NY×YT format.     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌ Drafts to review (5) ─────────┐  ┌ Open incidents (1) ────────┐ │
│  │ • NDIS changes…   [Approve][✎]│  │ • Stuck: drafting > 6h     │ │
│  │ • RBA hike…       [Approve][✎]│  │   → Pipeline Log (filtered)│ │
│  └───────────────────────────────┘  └────────────────────────────┘ │
│                                                                    │
│  ┌ Agent status ─────────────────────────────────────────────────┐ │
│  │ auto-approver ●  format-advisor ●  compliance ●  doctor ▲(1)   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌ Pipeline health ─────────┐  ┌ Next 24h schedule ──────────────┐ │
│  │ upstream ● downstream ●  │  │ 08:30 NDIS · 17:00 PP · …       │ │
│  └──────────────────────────┘  └──────────────────────────────────┘ │
│  Quick stats:  Queued 72 · Published 8 · Failed 0 · Dead 120        │
└──────────────────────────────────────────────────────────────────┘
```

Key: Brief = top block (Alerts/Decisions/Summary, ≤~250 words). Every card has an inline action or a typed deep-link (no dead-ends). "Next recommended actions" surface inside Brief>Decisions + the drafts/incidents cards.

### C. Final Pipeline page mockup (the operating flow)

Intended flow as a horizontal swimlane — **Feeds → Slots → Ingest → AI Generation → Asset Production → Compliance → Published** — with counts, stuck/blocked indicators, and row actions:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Pipeline                                        [ Client: All clients ▾ ]      │
│  Status:  Queued 72   Processing 0   Published 8   Failed 0   Dead 120          │ ← status cards
├──────────────────────────────────────────────────────────────────────────────┤
│  FEEDS →   SLOTS →   INGEST →   AI GEN →   ASSETS →   COMPLIANCE →   PUBLISHED  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌───────────┐  │
│  │  ●   │ │  ●   │ │  ●   │ │  ● 6   │ │  ▲ 2   │ │  ● 3     │ │  ● 8      │  │
│  │ heal │ │ heal │ │ heal │ │ drafting│ │ render │ │ review   │ │ published │  │
│  │      │ │      │ │      │ │        │ │ ⚠ stuck│ │ needs_rev│ │           │  │
│  └──────┘ └──────┘ └──────┘ └────────┘ └────────┘ └──────────┘ └───────────┘  │
│                                           ▲ 1 blocked > 6h                      │
├──────────────────────────────────────────────────────────────────────────────┤
│  ⚠ Needs attention                                                             │
│  • Asset render stuck 6h   NDIS-Yarns   [Retry] [Mark dead]                     │
│  • Dead (120)              [View in Pipeline Log]  [Requeue…]  ← UI, not SQL    │
├──────────────────────────────────────────────────────────────────────────────┤
│  Recent rows (click → detail + state history)                                  │
│  CLIENT        STAGE         POST                    AGE     ACTION             │
│  Property Pulse AI Gen       RBA hike…               4m      [open]             │
│  NDIS-Yarns     Compliance   NDIS changes…           12m     [Approve][Reject]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**How it replaces Queue:** ships at `/pipeline` over `m.vw_pipeline_state`, runs *alongside* `/queue` for one stable week, then `/queue` 301-redirects. The flat earliest-first table (today's Queue) becomes the "Recent rows" strip under the swimlane; the swimlane adds the stage/state visibility Queue never had. Requeue/retry are buttons here (closing the SQL-via-chat gap).

### D. Final Inbox page mockup

```
┌──────────────────────────────────────────────────────────────────┐
│  Inbox                                       [ Client: All ▾ ]      │
│  [ All 9 ] [ Drafts 5 ] [ Policy 1 ] [ Format 2 ] [ Agent 1 ]      │ ← filter chips + counts
│  ─── bulk bar (when ≥1 selected): [Approve 3] [Reject] [Skip] ───  │
├──────────────────────────────────────────────────────────────────┤
│ ☐ CRITICAL  HARD_BLOCK compliance flag · PP draft   [review ▾]     │ ← severity DESC, age DESC
│ ☐ CRITICAL  Token expired · NDIS-Yarns              [reconnect]    │
│ ☐ HIGH      Policy change detected (NDIS)           [Apply ▾]      │
│ ☐ MEDIUM    Format-advisor low confidence           [Confirm/Over] │
│ ☐ MEDIUM    Draft needs review · RBA hike           [Approve/Rej]  │
└──────────────────────────────────────────────────────────────────┘
```

Inbox is the single home for everything needing a human decision. Groups by what's surfaced (not separate pages): **Needs review · Approved · Rejected · Published · Dead · Queue failures · Compliance/review items** all arrive here as item types (`draft`/`policy`/`format`/`agent`) with severity. Bulk action = drafts-only in v1 (clears the 28-draft backlog), mixed-type bulk deferred to v2.

### E. Final Investigate area mockup

```
NOW > Investigate
┌────────────────┬───────────────────────────────────────────────────────┐
│ Flow           │ High-altitude pipeline diagram. "Is the whole thing OK?"│
│                │ Click a node → Pipeline Log filtered to that stage.     │
├────────────────┼───────────────────────────────────────────────────────┤
│ Pipeline Log   │ Row-level forensic event log. The deepest surface.      │
│                │ Dead/failed items + requeue + doctor ack live here.     │
├────────────────┼───────────────────────────────────────────────────────┤
│ Visual Pipeline│ Rendering observability: render log, format-advisor     │
│                │ decisions, format performance. Retry + override here.   │
├────────────────┼───────────────────────────────────────────────────────┤
│ Agents         │ Per-agent health (status MVP). auto-approver, format-   │
│                │ advisor, compliance, doctor, ai-worker. Ack → Inbox.    │
├────────────────┼───────────────────────────────────────────────────────┤
│ Operations     │ Transitional friction/case surface (cc-0016 evidence).  │
│ (transitional) │ Reconciles into cc-0015 friction-pool-view when it ships.│
└────────────────┴───────────────────────────────────────────────────────┘
```
Operator mental model: **Flow** = altitude; **Pipeline Log** = forensics + fixes; **Visual Pipeline** = rendering sub-system; **Agents** = who's doing the automating; **Operations** = friction register (temporary).

### F. Final visual language

- **Premium but not flashy** — a calm operational cockpit, not a marketing page and not a dense admin template.
- **Clear hierarchy** — section headings dominate; sub-groups recede; one thing is obviously most important on each screen.
- **Important things highlighted**, everything else quiet.
- **Colour semantics (the 5 token scales from Slice 0A):** **red/critical** only for genuine urgent issues (HARD_BLOCK, expired token, severe stuck) · **amber/warning** for attention-soon · **green/success** for healthy/completed · **muted/grey** for background + legacy items · info/blue for neutral context.
- **Generous spacing**, **readable typography**, tabular numerals for stats.
- Less "admin template," more "operator command centre."

### G. Review questions for PK

1. Does this end-state feel like the dashboard you want to run ICE from every day?
2. Is **NOW** the right top-level label?
3. Should **"Daily"** appear anywhere, or is NOW enough? (This plan assumes it's dropped.)
4. Does the **Pipeline flow** (Feeds → Slots → Ingest → AI Generation → Asset Production → Compliance → Published) match how the business actually works — or are stages missing/misnamed?
5. Is the **Brief block** central enough on Overview, or should it be even more prominent?
6. Are the **alerts** visible enough without feeling ugly or overwhelming?
7. **Which page should be redesigned first** after the sidebar polish — Pipeline (recommended), Overview, or Inbox?
8. What feels **missing** from this end-state?

### H. Gap log

| Gap / concern | Why it matters | Revise plan? |
|---|---|---|
| "Slots" stage in PK's flow has no obvious table in §6.5's state model (states are pending_draft→…→published) | The Pipeline swimlane can't render a stage with no backing data; "Slots" may map to cadence/scheduling rather than a post state | Yes — confirm what "Slots" means and whether it's a real pipeline stage or a scheduling concept before building the swimlane |
| "Asset Production" maps to render (Visual Pipeline) but isn't a first-class pipeline state | Operator expects to see asset/render status inline in Pipeline; today it lives in Visual Pipeline | Maybe — decide whether render status surfaces in the Pipeline swimlane or stays in Visual Pipeline |
| Full Pipeline rebuild needs `m.vw_pipeline_state` (real Phase 0), which is gated on S30 + M5–M8 | The recommended first page-level slice (Pipeline) can't be fully wired until the gate clears | No — handle by doing a visual/read-only swimlane first, live wiring after Phase 0 |
| `/operations` (friction) vs Inbox vs cc-0015 friction-pool-view overlap | Three surfaces touching "things needing attention"; risk of a fourth attention surface | Watch — reconcile when cc-0015 unblocks (2026-05-26); don't build a parallel attention surface |
| Client sub-surfaces duplicated as `/clients` tabs *and* sidebar items | Duplication the revamp is meant to remove; §6 only partially resolves it | Yes — settle tab-vs-sidebar per concept in Phase 1 |
| "Daily" label drop is a refinement to a §6-locked grouping | Small risk of drifting from locked research if treated as an IA change | No — it's cosmetic (label only; items unchanged); safe in sidebar-only 0A.1 |
| Brief is the highest product-risk item (§9): could be "just a nicer Overview" | If Brief misfires, Phase 3 effort is sunk | Watch — templated baseline first, PK sample-reads 2 weeks, go/no-go gate |

> **Operating-model addendum (2026-05-21).** The mental-model work (`docs/concepts/ice-pipeline-operating-model.md`) raises two further IA directions to weigh — **not** decided here, recorded so they aren't lost: (1) whether **Friction Register** should become its own NOW item (peer to Overview/Inbox/Pipeline) rather than living only under Investigate>Operations; (2) whether `/operations` is eventually **renamed/absorbed into a Friction Register surface**, since the operating model makes the register the real operational pool. Both are candidates to settle alongside the cc-0015 build, against the §6.9 deferral of an `m.chatgpt_review` surface. The locked §6 IA is unchanged by this addendum.

---

## Honest limitations

- This plan **consolidates** the saved review (§6 design, §9 implementation, §11 consolidation) and does not re-derive it. Where this plan and the saved research differ, the saved research wins; flag the conflict rather than silently overriding.
- Capacity figures (44–54h; per-phase hours) are §9's author estimates; PK's real pace recalibrates them.
- The north-star mockups (§11) are **markdown wireframes for reaction, not specifications.** The Pipeline flow stages (esp. "Slots", "Asset Production") are taken from PK's directive wording and may not map cleanly to §6.5's state model — see Gap log H. Build must reconcile before the swimlane is wired.
- Page-by-page fates for `/inbox`, `/clients`, `/feeds`, `/connect`, `/onboarding`, `/costs`, `/subscriptions`, `/roadmap` rest on §6, which itself notes those page bodies weren't read in the review. CCH should verify against the live `page.tsx` files (this pairs with the dashboard IA audit workbook's "NEEDS CCH VERIFY" rows).
- PK's "Daily redundant" preference is recorded as a proposed refinement; it is consistent with §6's intent (NOW = the operational/daily section) but is a change to the §6.2.a *label* scheme. Treated here as cosmetic + sidebar-only.
- No sync_state / action_list update was made by creating this file (per directive). If this plan should be reflected in the `00_` index or roadmap PHASES, that is a separate, explicitly-requested step.
- This is planning only: no dashboard edits, no Supabase, no implementation, no start of cc-0015 / Stage E / PRV, no Q-005 closure.

---

*Created 2026-05-21 Sydney. §12 of the dashboard-review series — the single execution plan. Source of truth: §6 (final target design), §9 (implementation plan), §11 (final consolidation). Records Slice 0A complete (`3ec489b`) and explicitly NOT real Phase 0. Distinguishes: Slice 0A (done) · Slice 0A.1 sidebar polish (next) · real Phase 0 (gated on S30 + M5–M8) · Phases 1–4. Guardrails preserved: cc-0015 Gate 11 rank 1 to 2026-05-26; Stage E separately-approved; PRV deferred; Q-005 OPEN. Planning/documentation only. Operating model: docs/concepts/ice-pipeline-operating-model.md.*
