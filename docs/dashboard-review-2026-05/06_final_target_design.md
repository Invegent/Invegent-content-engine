# §6 — Final Target Design

## Purpose

The build-ready dashboard architecture, based on Option B from §5 (Operational Consolidation; INVESTIGATE folds into NOW). Every §5 ambiguity is resolved here or explicitly deferred with reason. Engineering and design execute against this document.

This is a decision document, not a concept doc.

## Section-numbering note (transparency)

In the kickoff structure §6 was "Page-by-page fate table." After three earlier re-slottings, this section now carries both the final target design and the page-fate decisions. Recap of the renumbering:

- Kickoff §2 (Operator workflow) → §3
- Kickoff §3 (Decision criteria) → §4
- Kickoff §4 (IA option comparison) + §5 (Recommended IA) → §5
- Kickoff §6 (Page-by-page fate) → absorbed into this §6

`00_overview.md`'s 11-section table is out-of-sync; reconciliation deferred per files-changed minimisation.

---

## 6.1 Final IA Structure (authoritative)

Five top-level sections. ~18 nav items via internal NOW grouping.

### NOW (operational)

**Purpose.** The operational section. Daily entry, exception triage, investigation, action. The dominant section for the operator's daily loop.

**Lives here.**
- Sub-group **Daily**: Overview, Inbox, Pipeline
- Sub-group **Investigate**: Flow, Pipeline Log, Visual Pipeline, Agents

**Does NOT live here.**
- Trend analysis or historical reports → REPORTS
- Authoring tools (single posts, series, format library) → CREATE
- Per-client drilldown directory → CLIENTS
- ICE-level config (subscriptions, compliance rules, roadmap, external reviewer) → ADMIN
- Calibration / threshold tuning UI → deferred to v2 per locked decision 3

### CLIENTS

**Purpose.** Per-client surfaces and connection management. Entry point for client-scoped work.

**Lives here.**
- All Clients (list)
- [client] drill-down (existing `ClientProfileShell.tsx`)
- Feeds (feed source management; absorbs `ChannelSubscriptions` from old `/content-studio` analyse mode)
- Onboarding (existing wizard, promoted to nav from previously unlinked)
- Connect (OAuth surface; D-YT-OAUTH-1 canonical entry point)

**Does NOT live here.**
- Cross-client trend reports → REPORTS
- Real-time pipeline state per client → NOW (filterable by client where relevant)
- Agent run logs scoped to a client → NOW > Agents

### CREATE

**Purpose.** Content authoring surfaces. Creating drafts that flow into the pipeline.

**Lives here.**
- Content Studio (single mode + series mode; `ChannelSubscriptions` analyse-mode REMOVED)
- Formats (flattened from `/system/formats`)

**Does NOT live here.**
- Format observability or advisor decision logs → NOW > Investigate > Visual Pipeline
- Source / channel subscription management → CLIENTS > Feeds
- Compliance rules (which constrain authoring) → ADMIN > Compliance Rules

### REPORTS

**Purpose.** Weekly-cadence trend and analytics surfaces. Read-mostly.

**Lives here.**
- Performance tab (engagement metrics; ops-only after Layer 1/2 portal split per Open Decision 5)
- Costs tab
- Calibration tab (auto-approver pass rate, gate failures, weekly trend; promoted from `/performance` inner tab)

**Does NOT live here.**
- Per-client drilldown → CLIENTS > [client]
- Real-time pipeline state → NOW
- Agent run timelines → NOW > Agents
- Calibration *UI controls* (threshold tuning) → deferred v2; Calibration tab is read-only in v1

### ADMIN

**Purpose.** Monthly-cadence config and ICE-level system settings. Quieter loop than NOW or REPORTS.

**Lives here.**
- Reviews (external commit reviewer; `m.external_review_queue` + weekly digest)
- Compliance Rules (rule editor; promoted from `/compliance` Rules tab)
- Subscriptions (flattened from `/system/subscriptions`)
- Roadmap (existing)

**Does NOT live here.**
- Client OAuth / Connect → CLIENTS > Connect
- Agent calibration UI → v2
- D-01 ChatGPT MCP review records (`m.chatgpt_review`) → no surface in v1; deferred per honest limitation in §2

---

## 6.2 NOW Section Design

### a. Internal structure (Q1 from §5 resolved)

**RESOLVED: NOW uses grouped sub-nav.** Two sub-groups within NOW: **Daily** and **Investigate**.

Sidebar shape:

```
NOW
  Daily
    Overview
    Inbox
    Pipeline
  Investigate
    Flow
    Pipeline Log
    Visual Pipeline
    Agents
```

**Ordering logic.** State-based per group, ordered by typical operator visit sequence.

- **Daily** group (top to bottom): entry → triage → release. Matches the morning loop.
- **Investigate** group (top to bottom): high-altitude (Flow) → row-level (Pipeline Log) → sub-system (Visual Pipeline) → meta (Agents). Matches the depth-of-dive sequence.

**Why grouped over flat.** Seven flat items in NOW would trigger AP1 at section level (NOW does too many things). Grouping bounds the cognitive load to two named depths the operator already understands. Why not progressive disclosure: PK direction not received; the conservative choice is always-visible groups so investigators can be reached with one click during incidents.

### b. Core modules/pages

#### NOW > Daily > Overview

**Purpose.** Operator briefing. The first surface seen on session entry. Integrates everything else for situational awareness; does not duplicate it.

**Layout (top to bottom).**
1. **Brief block** (NEW, see §6.3)
2. System status banner (existing on `/overview`)
3. Token expiry alerts (existing; with inline reconnect added)
4. **Agent status row** (NEW; per-agent cards)
5. Two-column zone: Drafts to review (digest with inline approve buttons, links to Inbox) | Open incidents (digest, links by symptom into Investigate)
6. Pipeline health card (existing `PipelineHealthCard`)
7. Publishing schedule (next 24h)
8. Quick stats row

**Key actions supported.**
- Read Brief (no action, but contextualises everything below)
- Approve / reject draft inline (existing `<DraftActionButtons />`)
- Acknowledge agent status
- Inline reconnect from token alert banner (NEW; closes §3 missing affordance)
- Tap card / stat → drill into target page (with symptom-based routing per §6.4)

**Anti-patterns avoided.**
- AP1: single product = operator briefing
- AP2: every card has either an inline action or a typed drilldown link
- AP4: card click destinations are pre-filled with the relevant filter (e.g. "Open incidents" → Pipeline Log filtered to incident's stage)
- AP6: data-driven from canonical tables; no hardcoded client lists
- AP7: agent status row surfaces auto-actions as ack-able events

#### NOW > Daily > Inbox

**Purpose.** Operator-required exception triage. Single surface for everything that needs operator decision.

**Items absorbed.**
- Drafts auto-approver flagged (today's `/inbox`)
- Policy-change alerts from compliance-reviewer (today's `/compliance` Review Queue tab)
- Format-advisor low-confidence escalations (NEW pathway)
- Pipeline-doctor SEVERE auto-fix ack items (NEW pathway)
- Stuck-item action items (NEW pathway: items dead-lettered after retry exhaustion surface for operator decision)

**Layout** — see §6.6 Inbox Model below.

**Key actions supported** — see §6.6.

**Anti-patterns avoided.**
- AP1: single product = exception triage
- AP2: every item is actionable (item types without action affordance are filtered out)
- AP4: cross-section actions (e.g. "Apply suggested rule update") use inline pre-filled editors, not deflection

#### NOW > Daily > Pipeline

**Purpose.** State-machine view of the post lifecycle. Replaces `/queue` (Open Decision 2 resolved — see §6.5).

**Layout.** Swimlanes per state with item count + recent rows. Sortable by client / age / format / status.

**Key actions supported.**
- Click swimlane → filtered row table (drills into Pipeline Log scoped to that state)
- Click row → detail panel with state history + actions
- Approve in `needs_review` → transitions to `queued`
- Reject in `needs_review` → transitions to `dead` with reason
- Click `failed` row → retry / accept-as-dead options
- Click `dead` row → **requeue** (resets to appropriate prior state) or accept-as-dead
- Filter by client (data-driven from `c.client`)

**Anti-patterns avoided.**
- AP1: single product = lifecycle state visualisation
- AP2: every state has a typed action menu
- AP3: requeue dead item is UI, not SQL (closes §3's CRITICAL gap)
- AP6: client filter data-driven
- AP7: state transitions audit-visible

#### NOW > Investigate > Flow

**Purpose.** High-altitude visual diagram of pipeline. Situational awareness during incident response.

**Existing functionality preserved.** `<PipelineFlowDiagram />` from current `/monitor`.

**Refactor required.**
- Remove `MONITOR_TABS` (AP5)
- `CLIENT_TABS` data-driven from `c.client` (AP6) — includes Invegent brand
- H1 changes from "Monitor" to "Flow"
- Auto-refresh interval stays at 30s

**Key actions supported.**
- Click node → cross-link into Pipeline Log filtered to that stage (replaces in-place modal)
- Hover for stat tooltips

**Anti-patterns avoided.**
- AP5: section tabs gone
- AP6: client list data-driven

#### NOW > Investigate > Pipeline Log

**Purpose.** Row-level forensic surface. The deepest event log in the dashboard. Combines current `/pipeline-log` (Tier 1 doctor + health snapshots + AI summary) + dead-letter rows from current `/failures` + drift detections from F-EF-DRIFT-PREVENTION Stage 2b when shipped.

**Refactor required.**
- Drop hardcoded `ndis_published_today` and `pp_published_today` columns from `m.pipeline_health_log` schema (ship-blocker migration; per-client JSONB or join via `c.client`)
- Drop matching UI columns and stat cards
- Rename H1 from "Monitor" to "Pipeline Log"
- Remove `MONITOR_TABS`
- Add doctor auto-fix event view with severity column and ack column (uses new schema field on `m.pipeline_doctor_log`)

**Key actions supported.**
- Filter by stage / client / status / time / event type
- Click stuck item → state history + retry / requeue / mark dead options
- **Acknowledge doctor auto-fix** (closes AP7 gap; SEVERE-severity fixes block until ack)
- View row history (state transitions audit log)

**Anti-patterns avoided.**
- AP1: single product = forensic event log
- AP2: actions on every event row
- AP3: row actions are UI, not SQL
- AP6: schema fix lands here
- AP7: auto-fix events surfaced and ack-able

#### NOW > Investigate > Visual Pipeline

**Purpose.** Visual rendering observability. Render log, format-advisor decisions, format performance.

**Existing functionality preserved.** `/visuals` page contents (Render Log, Format Advisor Decisions, Format Performance — see §2 finding 1).

**Refactor required.**
- Remove `MONITOR_TABS`
- Rename H1 to "Visual Pipeline"
- Add **Retry** button on failed render rows
- Add **Override format** button on low-confidence advisor decisions (escalates to Inbox)

**Key actions supported.**
- View render log + advisor decisions + format performance
- **Retry failed render**
- **Override format-advisor decision** when low-confidence

**Anti-patterns avoided.**
- AP2: retry + override actions exist
- AP5: section tabs gone

#### NOW > Investigate > Agents

**Purpose.** Per-agent status surface (MVP per locked decision 3 — status, not calibration).

**Seeded by.** Relocating `/diagnostics` (Tier 2 LLM diagnostic agent) plus per-agent status cards drawn from existing artefacts.

**Agents surfaced.**
- auto-approver
- format-advisor
- compliance-reviewer
- ai-diagnostic
- pipeline-doctor
- ai-worker (parser)

**Each agent card displays.** Status (healthy / warning / critical), last run time, recent activity summary, recommendation count, ack count.

**Key actions supported.**
- Click agent → recent runs + outputs
- Acknowledge agent recommendation → either resolves locally or creates Inbox item if action required
- View per-agent annotation queue (escalations)

**Explicit MVP exclusions** (locked decision 3).
- NO calibration UI
- NO threshold tuning controls
- NO simulator
- NO agent profile pages
- NO inline agent prompt editing

**Anti-patterns avoided.**
- AP2: every recommendation creates either a local resolution or an Inbox item; no read-only dead-end
- AP7: agent actions visible and ack-able

### c. Action Layer (CRITICAL)

This directly resolves the §3 "action gap." Every action below has a defined surface, mechanic, and replacement target.

| Action | Surface | Mechanic | Replaces |
|---|---|---|---|
| **Requeue dead item** | NOW > Daily > Pipeline (state swimlane row) + NOW > Investigate > Pipeline Log (forensic row) + NOW > Daily > Inbox (operator-required ack item) | Click "Requeue" → confirm reason in modal → server action resets `status` and `dead_reason` per state-machine rules → audit row inserted | SQL via chat (the single biggest §3 gap, CRITICAL severity) |
| **Retry failed render** | NOW > Investigate > Visual Pipeline (Render Log row) | Click "Retry" → re-fires image-worker job for that `post_draft_id` | Manual chat / nothing |
| **Acknowledge auto-fix** | NOW > Investigate > Pipeline Log (doctor event row) | Click "Acknowledge" → marks `m.pipeline_doctor_log.ack_at`. SEVERE fixes block downstream queue movement until ack | Silent (no current mechanism; AP7 violation) |
| **Apply suggested rule update** | NOW > Daily > Inbox (policy-change alert item, expanded) | Click "Apply" → inline rule editor opens with suggested edit pre-filled → save → PATCH `m.compliance_rule` → returns to Inbox | Manual paste in `/compliance` Rules tab; broken handoff per AP4 |
| **Override format-advisor decision** | NOW > Investigate > Visual Pipeline (advisor decision row, low-confidence) | Click "Override" → format picker → if downstream impact (queued for render), creates Inbox item; otherwise applies inline | Nothing (decisions logged silently today) |
| **Inline reconnect token** | NOW > Daily > Overview (token alert banner) | Click "Reconnect" → redirects to `/connect?platform=X&client_slug=Y` with deep link to OAuth flow for the specific token | Click-through to `/connect` (3 clicks) |
| **Bulk approve / reject drafts** | NOW > Daily > Inbox (multi-select on draft items) | Checkbox select → bulk action bar shows count → click "Approve N" → confirmation modal showing any HARD_BLOCK compliance flags → server batch action | Per-item only (28-draft backlog F-AAP-NEEDS-REVIEW-BACKLOG forces serial work) |

#### Escalation paths (NEW pathways into Inbox)

- Agent low-confidence decision → Inbox item (type="format" or "agent")
- Policy change detected via compliance-reviewer → Inbox item (type="policy")
- Stuck item beyond N hours (default 6h) → Inbox item (type="agent", subtype="pipeline-doctor")
- Doctor auto-fix at SEVERE severity → Inbox item (type="agent", subtype="pipeline-doctor", action="acknowledge")
- Auto-approver gate failure when daily failure rate exceeds threshold → Inbox item (type="agent", subtype="auto-approver", action="investigate trend") — NOT a calibration UI; just a notice with link to REPORTS > Calibration

---

## 6.3 Brief Layer

**Where it lives.** NOW > Daily > Overview, as a **TOP block** above existing zones (Q2 from §5 resolved).

**What it contains** (three rolling sub-blocks; each 1-3 lines).

1. **Alerts.** Critical items needing attention NOW. Includes: incident summary, token expiry within 7 days, cadence reminders (e.g. "Compliance review queue last reviewed 12 days ago").
2. **Decisions.** Exception items needing operator action that didn't get filtered into Inbox automatically. Examples: surge alerts ("104 IG drafts queued — cap-throttle planning needed before re-enable"), capacity warnings, calibration trend warnings.
3. **Summary.** Narrative paragraph of last 24h — what happened, what's working, what to watch. Generated via LLM; templated synthesis as fallback.

**What Brief replaces.** Nothing in v1. Existing Overview zones remain below.

**What Brief complements.**
- System status banner: Brief contextualises ("healthy with one degraded agent")
- Drafts to review card: Brief surfaces backlog status ("28 drafts pending review since 2 May; ~2h to clear")
- Open incidents card: Brief narrates pattern across 24h ("3 stuck items since 02:00; pipeline-doctor cleared 2, 1 outstanding")

**What Brief is NOT** (avoid Option C overreach).
- Brief is NOT the entire daily surface. Brief is one block on Overview.
- Brief does NOT eliminate the existing zones. Cards offer one-tap affordances Brief narrative cannot.
- Brief does NOT regenerate mid-session. Brief is generated once per session entry (or via cron-driven push to Telegram) and held stable.
- Brief does NOT include bulk-listed events. Events live in Pipeline Log; Brief narrates them.
- Brief does NOT include calibration deep dives. Cadence reminder only.
- Brief is NOT a top-level section. It is a block. Sidebar still leads to Overview.

**Channels.**
- Web (canonical): NOW > Daily > Overview Brief block
- Telegram (nudge): same content, sent on cron schedule (frequency TBD — §7)
- Email digest: deferred to v2 per locked decision 2

---

## 6.4 Cross-Section Boundaries

What flows across section boundaries; what must NOT cross. AP4 (cross-section dependency without linkage) prevention lives here.

### NOW ↔ REPORTS

**Crosses NOW → REPORTS.**
- Brief contains weekly trend reminder ("Performance: 6% engagement this week, ↑ from 4%"). Click → REPORTS > Performance.
- Agent status row on Overview shows calibration headline ("Auto-approver pass rate 72%"). Click → REPORTS > Calibration.

**Crosses REPORTS → NOW.**
- REPORTS > Calibration gate-failure breakdown: click a gate ("Body too long: 14%") → NOW > Daily > Inbox filtered to drafts that hit that gate. Closes the click-through gap from §3 row 34.

**Must NOT cross.**
- Cross-client engagement comparison stays in REPORTS. NOW does not show roll-ups.
- Real-time pipeline state stays in NOW. REPORTS does not show live queue depth.
- Cadences stay distinct: NOW = daily; REPORTS = weekly. Brief reminders point at REPORTS but do not replicate REPORTS content.

### NOW ↔ CREATE

**Crosses NOW → CREATE.**
- From NOW > Inbox draft item, "Edit" → CREATE > Content Studio (single mode) with draft loaded.
- From NOW > Visual Pipeline format-advisor decision, "Edit format" → CREATE > Formats with that format key opened.

**Crosses CREATE → NOW.**
- After creating single post or series, drafts arrive in NOW > Daily > Inbox for review (existing pipeline).
- After toggling `is_buildable` in CREATE > Formats, format-advisor outputs change — surfaces in NOW > Visual Pipeline.

**Must NOT cross.**
- Format observability stays in NOW > Visual Pipeline. CREATE > Formats is CRUD only.
- Compliance rules (which constrain authoring) live in ADMIN > Compliance Rules, not CREATE.
- Channel / source subscriptions live in CLIENTS > Feeds, not CREATE.

### NOW ↔ ADMIN

**Crosses NOW → ADMIN.** *Critical handoff with linkage — closes the largest AP4 risk.*
- From NOW > Inbox policy-change alert, "Apply suggested rule update" → inline rule editor opens with suggested edit pre-filled. After save, returns to Inbox. Operator never visits ADMIN > Compliance Rules unless they choose to navigate there.
- From NOW > Investigate > Pipeline Log doctor auto-fix, ack flow may surface a rule-tuning suggestion (rare); links to ADMIN > Compliance Rules for the relevant rule.

**Crosses ADMIN → NOW.**
- Rule changes propagate to next compliance-reviewer run; results bubble back to Inbox.
- Roadmap updates do not cross to NOW (read-only from operator perspective in v1).

**Must NOT cross.**
- ICE-level subscription/billing config stays ADMIN-only. NOW does not show billing.
- Roadmap edits stay in repo (chat + git). Dashboard ADMIN > Roadmap is read-only viewer in v1.
- External-reviewer findings (`m.external_review_queue`) do not auto-create Inbox items (volume risk; review remains weekly digest in ADMIN > Reviews).

### NOW ↔ CLIENTS (supplementary boundary)

Not in PK's three-boundary spec but real and worth committing.

**Crosses.**
- Click client name on any NOW item → CLIENTS > [client] drill-down (existing `ClientProfileShell.tsx`)
- From CLIENTS > [client] queue summary, click row → NOW > Pipeline filtered to that client

**Must NOT cross.**
- Per-client OAuth lives in CLIENTS > Connect, not NOW > Daily > Overview (Overview shows alert + reconnect deep link, which redirects)
- Per-client onboarding state lives in CLIENTS > Onboarding, not NOW

---

## 6.5 Pipeline State Model (Open Decision 2 resolved)

Canonical state-machine for post lifecycle.

```
pending_draft  →  drafting  →  needs_review  →  queued  →  publishing  →  published
                       ↓                  ↓                                       
                      dead              dead                                   
                       ↑                  ↑                                       
                       ┗━━━━  failed  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Canonical states

| State | Source table | Definition |
|---|---|---|
| `pending_draft` | `m.digest_item` | Digest item selected for draft generation; no AI job yet |
| `drafting` | `m.ai_job` | AI job in progress |
| `needs_review` | `m.post_draft.approval_status='needs_review'` | Draft created, awaiting human approval (auto-approver may have flagged it) |
| `queued` | `m.post_publish_queue.status='queued'` | Approved, scheduled, awaiting publish window |
| `publishing` | `m.post_publish_queue.status='locked'` | Locked by publisher worker; mid-publish |
| `published` | `m.post_publish` | Successfully published; `platform_post_id` captured |
| `failed` | `m.post_publish_queue.status='failed'` | Terminal failure; retry possible |
| `dead` | `*.status='dead'` (`m.post_draft`, `m.post_publish_queue`, `m.ai_job`) | Terminal failure with no retry; preserved as audit trail per Phase 1.7 |

### How states surface in UI

- **NOW > Daily > Pipeline** — swimlanes per state; counts visible at a glance; recent rows in each lane; client filter applies across lanes
- **NOW > Investigate > Pipeline Log** — row-level table with state transitions visible; filter by state
- **CLIENTS > [client]** — per-client roll-up showing same swimlane shape scoped to one client
- **NOW > Daily > Overview Pipeline health card** — healthy/warning/critical aggregate over `pending_draft + drafting + needs_review` ("upstream") and `queued + publishing` ("downstream")

### How operator interacts with states

| State | Operator action surface | Action |
|---|---|---|
| `needs_review` | NOW > Inbox | Approve → `queued`; Reject → `dead`; Edit → CREATE > Content Studio |
| `failed` | NOW > Pipeline (failed lane) or Pipeline Log row | Retry → returns to `queued`; Mark dead → `dead` |
| `dead` | NOW > Pipeline (dead lane) or Pipeline Log row or Inbox ack item | Requeue → returns to appropriate prior state with reason audit; Accept → stays dead (no action) |
| `publishing` (stuck) | Pipeline Log row | Pipeline-doctor auto-fixes after timeout; SEVERE-severity fix surfaces ack item in Inbox |

### Implementation source-of-truth

State derivation logic produces the canonical state for any pipeline row. Two implementation paths (Q2 in §6.10):

- Server-side view (`m.vw_pipeline_state`) — SQL JOIN across `m.digest_item`, `m.ai_job`, `m.post_draft`, `m.post_publish_queue`, `m.post_publish` with derived `state` column. Preferred.
- Client-side aggregation — dashboard reads each table separately and derives state in TS. Higher latency, more code.

Default: server-side view. Confirmed in Q2 of §6.10 if alternatives surface during build.

---

## 6.6 Inbox Model (Q4 from §5 resolved)

**RESOLVED: HYBRID flat list with filter chips.**

### Structure

- Single column ordered by **severity DESC, then age DESC**
- Filter chips at top: **All / Drafts / Policy / Format / Agent** (counts shown per chip)
- Bulk select checkbox per row
- Bulk action bar (sticky top) shows when ≥1 row selected: "Approve N", "Reject N", "Skip for now"

### Item types

- `draft` — auto-approver flagged drafts (existing)
- `policy` — policy-change alerts from compliance-reviewer
- `format` — format-advisor low-confidence escalations
- `agent` — agent annotations (recommendations, doctor SEVERE acks, stuck-item escalations, calibration trend warnings)

### Severity levels

| Severity | Examples |
|---|---|
| **CRITICAL** | HARD_BLOCK compliance flag on a draft; expired token blocking publish; SEVERE doctor auto-fix awaiting ack |
| **HIGH** | Auto-approver gate failure with high impact; policy-change alert flagged "high relevance" by compliance-reviewer; agent recommendation marked `human_action_required: true` |
| **MEDIUM** | Format-advisor low-confidence escalation; agent recommendation without `human_action_required` |
| **LOW** | Informational items (deferred to v2; not surfaced in v1) |

### Prioritisation rules

1. CRITICAL items always at top, regardless of age
2. Within severity: oldest first (FIFO; resists permanent deferment)
3. Filter chips reduce visible set; severity order preserved within filtered set
4. Bulk select honours filter chip (selecting "all" with Drafts chip selects only drafts)

### Interaction model

- **Click row** → expand inline (no page navigation) for action affordances
- **Inline actions per type**:
  - `draft`: Approve / Reject / Edit / Mark for later
  - `policy`: Apply suggested update / Dismiss / Mark reviewed
  - `format`: Confirm / Override / Mark reviewed
  - `agent`: Acknowledge / Override / Mark reviewed
- **Bulk select** for multi-item action (drafts only in v1; mixed-type bulk deferred to v2)
- **"Mark for later"** moves item out of view for 24h; resurfaces unless resolved

### Alignment with §4

- **P1 (operator-first):** the dominant Stage-2 surface designed around what the operator does, not what the data tables look like
- **P2 (actionability):** every item has at least one inline action; LOW severity excluded from v1 because it would tempt observation-only display
- **T1 default bias (consolidation):** single column wins
- **T3 default bias (simplicity for daily, power for backlog):** scannable single list daily; bulk-action affordances for backlog clearance behind the multi-select toggle

---

## 6.7 Anti-Pattern Mitigations (explicit)

For each AP1–AP7: how the final design prevents it, and where enforcement lives.

### AP1 — Two products in one page

**Prevention.** Each NOW page in §6.2 has a single-product purpose stated explicitly. The Brief block on Overview is integrative narrative (one product), not a second product.

**Enforcement.** Page H1 must match the single purpose. Build acceptance review: if a page accumulates a second product during build, escalate to PK before shipping. Compliance + Performance + Visuals splits from §2 land in this section.

### AP2 — Observability without action

**Prevention.** Every page in §6.2 lists "Key actions supported." Surfaces without actions are rejected at design review. Inbox v1 excludes LOW severity items (which would tempt observation-only display).

**Enforcement.** §6.2 actions table is the build spec. Reviews of new surfaces (post-v1) require an actions list before surfaces are added.

### AP3 — Hidden critical actions in SQL / chat

**Prevention.** Action Layer §6.2.c lists all operator-required actions with their UI surface. Requeue dead item ships in v1 (the largest §3 gap).

**Enforcement.** Build acceptance criteria: zero v1-ship-blocker actions require SQL / chat. Threshold tuning explicitly v2 (locked decision 3); not a regression because it never had a UI.

### AP4 — Cross-section dependency without linkage

**Prevention.** §6.4 cross-section boundaries specify what crosses with what context. Inbox → ADMIN compliance update has inline pre-filled rule editor. Calibration → Inbox click-through is filter-pre-populated. Symptom-based routing from Overview cards.

**Enforcement.** §8 migration plan blocks shipping NOW → ADMIN handoff until the inline pre-filled editor works. Build acceptance: all cross-section links pass the "arrives with context" test.

### AP5 — Section-tab coupling across IA-distant pages

**Prevention.** `MONITOR_TABS` removed across all 6 affected page files: `/monitor`, `/pipeline-log`, `/visuals`, `/compliance`, `/costs`, `/performance`. Replaced by either NOW internal sub-group nav (for the four moved into NOW > Investigate) or no shared nav (for `/compliance` Rules, `/costs`, `/performance` which move to ADMIN, REPORTS).

**Enforcement.** **Ship-blocker.** Phase 1 of §8 migration. No `MONITOR_TABS` references survive in the codebase post-Phase 1.

### AP6 — Hardcoded reference data in shipped code

**Prevention.**
- `m.pipeline_health_log` schema migration: drop `ndis_published_today`, `pp_published_today`. Replace with per-client breakdown (JSONB or join via `c.client`).
- `/monitor` `CLIENT_TABS` replaced with dynamic load from `c.client` (matching the existing `getClients()` pattern in `/pipeline-log`).
- Sweep all dashboard files for hardcoded NDIS / Property Pulse / Care for Welfare references; convert to `c.client` joins.

**Enforcement.** **Ship-blocker.** Schema migration is Phase 1 of §8. No hardcoded client name strings in dashboard code post-Phase 1.

### AP7 — Silent auto-actions without audit trail

**Prevention.**
- Pipeline-doctor auto-fixes surface as discrete events in NOW > Investigate > Pipeline Log
- SEVERE-severity fixes create Inbox `agent` ack items
- `m.pipeline_doctor_log` gains `severity` and `ack_at` columns (migration); UI displays severity badge
- Drift-check sweeps similarly surface in Pipeline Log

**Enforcement.** Schema fields are build spec. Doctor fix events are queryable + UI-rendered. Severity threshold for ack-required is set during build (Q4 in §6.10).

### Bonus anti-patterns (from §4.4)

- **Brief-as-firehose:** Brief is bounded to 3 sub-blocks (Alerts / Decisions / Summary), each 1–3 lines. Build acceptance: Brief total length ≤ ~250 words.
- **Telegram as decision channel:** Telegram receives Brief content only, no action affordances. Web is canonical per locked decision 2.
- **Inbox-as-firehose:** LOW severity excluded from v1. Item types restricted to four named types. New types require explicit design review.

---

## 6.8 Migration Notes (high-level)

Not a full §10 plan. Major transformations, high-risk migrations, and dependencies surfaced for §10 sequencing.

### Major transformations

1. **Section restructure (6 → 5).** NOW absorbs INVESTIGATE. Sidebar nav rebuild. Page parents updated. Internal grouping within NOW (Daily / Investigate sub-groups).
2. **`MONITOR_TABS` removal across 6 files.** Replaced with NOW internal nav (Investigate group) for four pages; replaced with no shared nav (REPORTS / ADMIN siblings) for the others.
3. **Hardcoded data cleanup.** Schema migration on `m.pipeline_health_log`. UI sweep for NDIS / PP / CFW string literals.
4. **Action layer additions.** Multiple new server actions + UI: requeue, retry, acknowledge, inline rule update, override format, inline reconnect, bulk approve.
5. **Brief surface build.** New component, content generation pipeline (LLM agent or templated fallback), persistence on `m.brief` (or similar).
6. **Pipeline state-machine view.** Replaces `/queue`. New component over a server view (`m.vw_pipeline_state`) or client-side aggregation.
7. **Inbox absorption.** `/compliance` review queue items become Inbox items via `type` field. New escalation pathways from format-advisor, pipeline-doctor SEVERE, stuck-item watcher.
8. **Cross-section pre-fill plumbing.** Inbox → ADMIN Compliance Rules editor accepts pre-fill (mechanism in Q3 of §6.10).
9. **Drop `/failures`.** Dead items surface in Pipeline Log + Inbox. Route retires (or 301-redirects).
10. **Promote `/onboarding` to nav** under CLIENTS sub-section.
11. **URL flattens:** `/system/formats` → `/formats`; `/system/subscriptions` → `/subscriptions`.
12. **Schema migration: `m.pipeline_doctor_log`** gains `severity` and `ack_at` columns.

### High-risk migrations

- **`m.pipeline_health_log` schema change.** Data preservation; cron + UI dependencies; affects Tier 1 doctor + AI summary + health snapshots views. Test in non-production first.
- **`/queue` → NOW > Pipeline rebuild.** Existing route breaks. Old `/queue` URL must redirect to NOW > Pipeline. Backlinks from Overview quick stats updated.
- **Brief surface MVP.** Unproven design (§5 product risk). If Brief misfires, dashboard remains usable via existing Overview zones — but Brief work is sunk cost. Stage Brief as separate sub-phase with explicit go/no-go gate.
- **`MONITOR_TABS` removal across 6 files.** Touch surface large; six files coordinated; risk of partial removal leaving dead links.
- **Inbox absorption of compliance review queue.** Existing `/compliance` Review Queue depends on `/api/compliance` PATCH endpoint; Inbox UI must accept the same item shape OR endpoint adapter.

### Dependencies

- **Action layer** requires server actions exist before UI surfaces ship. Build server first, then UI.
- **Pipeline state-machine view** requires either `m.vw_pipeline_state` shipped, or client-side aggregation logic written first.
- **Brief surface** requires content generation pipeline (LLM agent or templated fallback) shipped before Brief block displays.
- **Hardcoded data cleanup** requires `m.pipeline_health_log` schema migration shipped before UI columns are dropped (otherwise `/pipeline-log` shows nulls).
- **Cross-section pre-fill plumbing** requires Q3 mechanism resolution before Inbox → ADMIN handoff goes live.
- **Doctor auto-fix ack** requires `m.pipeline_doctor_log` schema migration before NOW > Investigate > Pipeline Log surfaces ack column.

### Capacity envelope (Q5 from §5 default)

- 8–12 chat hours per phase
- ≤3 migrations per phase
- ≤2 page rewrites per phase
- Ship-blocker anti-patterns prioritised in earliest phase

### Phasing (high-level, detail in §10)

- **Phase 1 — Foundation (ship-blockers).** Hardcoded data cleanup (schema), `MONITOR_TABS` removal, requeue dead item action (UI + server action), sidebar restructure to 5 sections with NOW internal grouping.
- **Phase 2 — Inbox + Pipeline reframe.** Inbox absorption + filter chips + bulk approve. Pipeline state-machine view rebuild over `m.vw_pipeline_state`.
- **Phase 3 — Action layer + Brief.** Remaining actions (retry, acknowledge, inline rule update, override format, inline reconnect). Brief surface MVP with Telegram push.
- **Phase 4 — Polish.** Cross-section pre-fills, REPORTS Calibration tab promotion, `/onboarding` nav promotion, `/failures` retire / redirect, URL flatten.
- **Phase 5+ (deferred to v2 per locked decision 3).** Calibration UI, threshold tuning, agent profile pages, simulator. NOT scoped here.

---

## 6.9 Decisions Locked vs Deferred

### LOCKED in §6 (no further debate)

- Final IA = 5 sections (NOW + CLIENTS + CREATE + REPORTS + ADMIN)
- NOW internal grouping = Daily + Investigate sub-groups
- Inbox shape = hybrid flat-list with filter chips + severity sort + bulk select
- Pipeline = state-machine view at NOW > Daily > Pipeline; row-level forensic at NOW > Investigate > Pipeline Log
- `/queue` replaced by NOW > Pipeline (Open Decision 2 resolved)
- `/failures` dissolves; dead items surface in Pipeline Log + Inbox
- `/diagnostics` seeds NOW > Investigate > Agents (status MVP only)
- Brief lives in NOW > Daily > Overview as top block (NOT a separate section)
- Brief content scope = three sub-blocks (Alerts / Decisions / Summary), bounded by length
- Compliance, Performance, Visuals split decisions from §2 (each into peer surfaces)
- `/onboarding` promotes to CLIENTS sub-section nav
- `/system/formats` flattens to `/formats` (CREATE > Formats)
- `/system/subscriptions` flattens to `/subscriptions` (ADMIN > Subscriptions)
- `ChannelSubscriptions` (was `/content-studio` analyse mode) moves to CLIENTS > Feeds
- Action layer minimum spec: requeue / retry / acknowledge / inline rule update / override format / inline reconnect / bulk approve
- Anti-pattern remediation severity (Q6 from §5 resolved):
  - **Ship-blockers**: AP3 (requeue dead item), AP5 (`MONITOR_TABS` removal), AP6 (hardcoded reference data including schema)
  - **Ship-and-fix per surface**: AP1, AP2, AP4, AP7
- Pipeline state-machine canonical states (§6.5)
- Cross-section boundary rules (§6.4)
- Web is canonical for actions; Telegram is nudge only (locked decision 2 reaffirmed)
- Capacity envelope per phase: 8–12 chat hours, ≤3 migrations, ≤2 page rewrites

### DEFERRED with reason

| Item | Reason |
|---|---|
| **Reviews placement** (Open Decision 3) | Stays in ADMIN per §2 default. Re-revisit when external clients onboard and Reviews scope shifts. |
| **Roadmap fate** (Open Decision 4) | Stays in ADMIN as read-only viewer per §2 default. Editing remains chat + git. Re-revisit if dashboard becomes editing surface. |
| **Layer 1/2 boundary on Performance** (Open Decision 5) | §8 work. Doesn't block §6 because both ops Performance and (future) client Performance live in REPORTS today; portal split is triggered by first external client onboarding, not by IA migration. |
| **`/reviews` vs `m.chatgpt_review` naming clash** | Low cost, no operator-facing impact today. Resolve when `m.chatgpt_review` gets a surface. |
| **`/drafts` alias-vs-retire** | Low cost. Default = alias to `/inbox`. PK preference can switch later. |
| **Format Performance home** (REPORTS Performance vs NOW Visual Pipeline) | Both lenses retained: post-keyed in REPORTS Performance; format-keyed in NOW Visual Pipeline. Re-revisit if duplication confuses operators. |
| **Calibration UI / threshold tuning / agent simulator / agent profile pages / inline agent prompt editing** | Locked decision 3 → v2. No reconsideration in v1. |
| **Sidebar search** | Not in v1. Default = no search. Re-evaluate if discoverability becomes a complaint. |
| **Brand/client switcher in sidebar** | v1 keeps global nav with per-page filtering. Re-evaluate at 5+ external clients (Phase 4 in `docs/04_phases.md`). |
| **Email digest of Brief** | Deferred to v2. Telegram + web cover the channel mix in v1. |
| **Mobile inbox / voice approval** | Out per locked decision 2. Permanent. |
| **Role-gated nav (Operator vs Admin)** | v1 single nav. Re-evaluate when a real second human takes part of the loop. |
| **`m.chatgpt_review` dashboard surface** | No operator value today; D-01 records are queried via SQL by chat. v2 if needed. |
| **EF drift panel placement (Stage 2b)** | Lands under NOW > Investigate > Pipeline Log as a sub-view OR its own sub-page. Decision sequenced behind S30 + Stage 2b implementation per `userMemories` v2.45. §6 reserves the slot under NOW > Investigate. |
| **LOW-severity Inbox items** | Excluded from v1 to resist Inbox-as-firehose. Re-evaluate if operator reports missing visibility. |
| **Mixed-type bulk Inbox actions** | v1 bulk = drafts only. Mixed-type bulk in v2. |

---

## 6.10 Open Questions (final set; build-blockers only)

Five items genuinely block build and need PK direction before §10 commits the migration sequence. Everything else is either resolved above or in 6.9 deferred-with-reason.

### Q1 — Brief content generation source

**The decision.** LLM agent (cron-driven, like ai-diagnostic) vs templated synthesis from existing tables vs hybrid (templated baseline with LLM enrichment).

**Why blocker.** Affects §7 Brief + Telegram channel plan, EF deploy scope, AI cost projections, and Phase 3 build effort.

**Default if no preference.** Hybrid: templated baseline that always works, LLM enrichment when available. Failsoft: if LLM call fails, templated baseline ships.

### Q2 — Pipeline state derivation logic

**The decision.** Server-side view (`m.vw_pipeline_state`) vs client-side aggregation across `m.digest_item` + `m.ai_job` + `m.post_draft` + `m.post_publish_queue` + `m.post_publish`.

**Why blocker.** Build path differs significantly. Server-side view is a migration; client-side aggregation is TypeScript.

**Default if no preference.** Server-side view (`m.vw_pipeline_state`). Cleaner abstraction; reusable from CLIENTS > [client] roll-up; lower latency; consistent with existing `k.vw_*` view patterns.

### Q3 — Cross-section pre-fill mechanism

**The decision.** Mechanism for Inbox → ADMIN Compliance Rules pre-fill: query string params (e.g. `/compliance/rules?rule_key=X&suggestion=Y`), session storage, OR ephemeral DB row keyed by reviewer session.

**Why blocker.** Drives URL design + share-link behaviour + persistence semantics. AP4 prevention depends on this.

**Default if no preference.** Query string params. Shareable URLs (PK can copy-paste a deep link). No persistence overhead. Limit: long suggestions need encoding.

### Q4 — Doctor auto-fix `severity` thresholds

**The decision.** Which `severity` levels of `m.pipeline_doctor_log` require operator ack? Schema currently lacks `severity` — migration adds it. Threshold needs definition.

**Why blocker.** Schema migration content + Inbox escalation pathway + doctor cron severity classifier all depend on this.

**Default if no preference.** Three severities: `info` (no ack), `warning` (logged, no ack), `severe` (ack required, blocks downstream movement on the affected row until acknowledged). Severity classification logic in doctor EF (existing) extended.

### Q5 — Bulk approve UX safety

**The decision.** Bulk approve drafts UX: confirmation modal vs undo affordance vs both. Risk: HARD_BLOCK compliance flag mass-approval if operator doesn't notice.

**Why blocker.** Bulk approve is the requested fix for F-AAP-NEEDS-REVIEW-BACKLOG (28 drafts). UX must surface compliance flags clearly to avoid one-click compliance violation across N drafts.

**Default if no preference.** Confirmation modal that explicitly lists any HARD_BLOCK or WARN compliance flags in the selected set, with per-draft opt-out. Undo affordance (10s revert window) on top, surfacing in toast.

---

## Honest limitations

- Source for `/inbox`, `/clients`, `/feeds`, `/connect`, `/onboarding`, `/costs`, `/system/subscriptions`, `/roadmap`, `ChannelSubscriptions` not read in this review. Fate decisions for those surfaces assume they work as named; build will surface mismatches.
- The portal repo (`invegent-portal`) was not inventoried. Layer 1/2 boundary work (§8) will revisit REPORTS Performance assignment.
- Brief design specification is not in this document. §7 (Brief + Telegram channel plan) commits the design. §6 reserves the slot and bounds Brief's scope.
- Migration cost estimates per phase are not quantified beyond the §5 default envelope (8–12 chat hours / ≤3 migrations / ≤2 page rewrites). §10 quantifies per task.
- The Action Layer table in §6.2.c is the build spec for v1 actions. Actions not listed (e.g. mass requeue, retry-with-modified-params, partial-publish-retry) are explicitly v2.
- Some boundary calls (e.g. format-advisor escalation criteria, doctor severity classifier rules) are deferred to build-time logic. §6 commits that escalation EXISTS; doesn't commit exact thresholds.
- The supplementary NOW ↔ CLIENTS boundary in §6.4 is honest scope creep beyond PK's three-boundary spec; it captures a real handoff that exists but is documented for completeness rather than directed by the spec.
- AP6 sweep (`/monitor` `CLIENT_TABS` + schema columns) catches the obvious instances. There may be additional hardcoded references in components (`@/components/clients/`, `@/components/overview/`) not inventoried this review. Build phase 1 sweep verifies.
- `m.chatgpt_review` records and the EF drift panel are deferred surfaces. §6 reserves slots under NOW > Investigate but does not commit shapes.
- Pipeline state-machine (§6.5) is the canonical states from the operator's perspective. Underlying data tables retain their existing `status` columns; the state-machine view derives the canonical state from them. Edge cases (e.g. row in `m.post_draft.approval_status='dead'` while `m.post_publish_queue.status='queued'` for the same `post_draft_id`) need handling rules during build.
- Cowork (autonomous brief execution) is not considered an operator surface. If §7 or §10 needs Cowork integration with Brief surface generation, scope expands.

---

*Created 2026-05-06 (Sydney). §6 of 11 in the dashboard architecture review. Inputs: kickoff session record, `00_overview.md`, `01_current_state_inventory.md`, `02_target_ia_mapping.md`, `03_operator_workflow_map.md`, `04_decision_criteria.md`, `05_ia_option_comparison.md`. No new source reads this session. Final IA: 5 sections (NOW / CLIENTS / CREATE / REPORTS / ADMIN). Recommendation locked: Option B with NOW internal sub-grouping, hybrid-flat Inbox, state-machine Pipeline, ship-blocker anti-pattern remediation. Five build-blocker open questions surfaced for PK resolution before §10 commits migration sequence. Next: §7 Brief + Telegram channel plan.*
