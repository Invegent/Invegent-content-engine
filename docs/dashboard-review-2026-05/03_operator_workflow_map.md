# §3 — Operator Workflow Map

## Purpose

Map the operator's loop — **Entry → Review → Investigation → Action → Reporting** — against the locked final-form IA from `00_overview.md` and the fate decisions from `02_target_ia_mapping.md`. Identify where the new IA supports the workflow well, where it breaks it, where current overlaps cause duplicated steps, and where ownership is unclear or affordances are missing.

This section answers: *if a single operator (PK today) opens the dashboard at 8am AEST, what is the path through the day, and where does the path stall?*

## Section-numbering note (transparency)

In the kickoff structure, the operator workflow map was §2 (file `02_operator_workflow.md`). After PK redirected §2 to be Target IA Mapping (`02_target_ia_mapping.md`), this content has been re-slotted to §3 (file `03_operator_workflow_map.md`, this file). The original §3 "Decision criteria" content is now bumped — PK to direct whether it becomes §4, merges with IA Option Comparison, or gets cut. `00_overview.md`'s 11-section table remains out-of-sync; reconciliation deferred per files-changed minimisation.

## Method

- Workflow steps derived from: (a) source reads from §2 (`/overview`, `/inbox` inferred, `/queue`, `/monitor`, `/pipeline-log`, `/diagnostics`, `/failures`, `/compliance`, `/visuals`, `/performance`, `/content-studio`, `/system/formats`, `/reviews`); (b) PK's known session pattern from `userMemories` (mandatory session-start reads, pre-flight P1–P5, D-01 review, 4-way sync close); (c) kickoff Round 1–4 framing.
- Risk levels: **CRITICAL** (blocks publishing flow / loses trust), **HIGH** (common task, real friction), **MEDIUM** (occasional task, friction acceptable but improvable), **LOW** (rare or aesthetic).
- Cadence layers noted where relevant: **daily** (the dominant loop), **weekly** (Monday/Tuesday rhythm + external review digest), **monthly** (compliance-monitor + token rotation + Supabase backup verification).

---

## Role assumptions

Where the dashboard's user model touches more than one role, decisions about labelling, permission, and cross-section handoff change. Today PK is all four roles; the design must hold up when they separate.

| Role | Today | Future state | Boundaries that matter |
|---|---|---|---|
| **Operator** | PK (sole) | PK + (eventual) part-time VA per Risk 6 in `docs/05_risks.md` | Full dashboard read/write. Owns the daily loop. The persona this IA is being designed for. |
| **Reviewer** | PK (folded into Operator) | Future delegated role: PK delegates draft approval to a VA OR to the client themselves | Read-only outside their assigned drafts. Approve/reject + comment. Likely lives in **Layer 2 (portal)**, not Layer 1 (dashboard) — BUT operator-side reviewer (a VA acting for Invegent) still needs Layer 1. Open Decision 5 governs. |
| **Admin** | PK (folded into Operator) | Future split: Operator runs content; Admin owns billing, subscriptions, compliance rules, roadmap, external reviewer config | Quieter loop — weekly/monthly cadence not daily. ADMIN section in new IA is the home. May warrant role-gated nav visibility once split. |
| **Client-facing user** | n/a (no clients on portal yet) | Each onboarded external client | **Out of scope for this dashboard review except at the Layer 1/2 boundary** (Open Decision 5). The dashboard does NOT serve client-facing users. The portal (`invegent-portal`, separate Next.js app) does. |

**Implication for §6:** Every fate decision should pass an "is this an Operator action, an Admin action, or a Reviewer action?" sniff test. Pages that span all three are candidates for nav-level role gating in v2.

---

## The daily loop (5 stages)

```
   ENTRY →→ REVIEW →→ INVESTIGATION →→ ACTION →→ REPORTING
     ↑                                                  ↓
     ┗━━━━━━━━━━━━━━━ next session ━━━━━━━━━━━━━━━┛
```

The loop is **idealised** — in practice the operator skips stages (no incidents → no investigation), short-circuits (Brief sees a draft worth approving → jump to Review), or back-tracks (investigation surfaces a rule problem → jump to Admin then back to Review).

### Stage 1 — ENTRY

**Trigger:** time-based (operator opens browser at 8am AEST) OR notification-based (Telegram Brief alert per locked decision 2).

**Today:** open dashboard → land on `/overview` → scan zones (status banner, drafts-to-review card, open-incidents card, pipeline-health card, schedule, quick stats, token alerts).

**Future state under locked IA:** Telegram delivers narrative Brief → operator opens web → NOW > Overview shows Brief at top + agent status row + existing zones. The Brief is the new entry surface; everything else is supporting context.

**Workflow risk if the Brief surface ships poorly:** the operator falls back to scanning zones (today's pattern), which means the Brief delivers no value. Brief design must be the entry summary, not a duplicate of the cards underneath.

### Stage 2 — REVIEW

**Trigger:** Brief / Overview surfaces something requiring operator decision — a draft, a policy-change alert, an agent annotation.

**Today:** click Inbox → triage drafts (approve / reject / edit). Compliance review queue is on `/compliance` (separate page). Format-advisor escalations don't escalate today.

**Future state under locked IA:** NOW > Inbox is the only surface. It absorbs draft review queue + compliance policy-change alerts + (future) format-advisor low-confidence escalations + (future) per-agent annotation queue items. A single typed exception inbox.

**Workflow risk if Inbox absorbs too much:** dilution. If everything is in Inbox, nothing is. Drafts and policy-change alerts have different urgencies and decision shapes; a single column of mixed exceptions becomes a list to scroll, not a queue to clear. §6 should commit on whether Inbox has typed sub-tabs or stays flat.

### Stage 3 — INVESTIGATION

**Trigger:** something in Stages 1 or 2 surfaces a problem the operator can't act on directly — stuck queue item, dead-letter row, render failure, agent recommendation, drift detection.

**Today:** sprawling. /monitor (visual flow) OR /pipeline-log (Tier 1 doctor + AI summary + health snapshots) OR /diagnostics (Tier 2 LLM agent) OR /failures (cross-table dead items) OR /visuals (render + advisor logs) OR /queue?status=failed. All branded "Monitor" in their H1s. Section tabs `MONITOR_TABS` couple them.

**Future state under locked IA:** INVESTIGATE has 4 named sub-pages — Flow, Pipeline Log, Visual Pipeline, Agents. Diagnostics seeds Agents (per `02_target_ia_mapping.md`). /failures dissolves — dead items surface in Pipeline Log row-level + Inbox action items.

**Workflow risk:** the operator's investigation today is *exploratory* — they don't know which page will surface the answer, so they cycle. The new IA should make the entry point obvious from the symptom: stuck queue item → Pipeline Log; render failed → Visual Pipeline; agent gave bad recommendation → Agents; anything multi-stage → Flow. §6 should commit a *symptom → surface* table.

### Stage 4 — ACTION

**Trigger:** investigation identifies a fix the operator can apply.

**Today, where actions exist:**

- Approve / reject draft → Inbox (working)
- Reconnect token → /connect (D-YT-OAUTH-1, working)
- Toggle feed source → /feeds (working)
- Onboard new client → /onboarding (working but unlinked from sidebar)
- Create single / series → /content-studio (working)
- Toggle format `is_buildable` → /system/formats (working)
- Update compliance rule → /compliance Rules tab (working)
- Adjust subscription → /system/subscriptions (working but source unread §2)

**Today, where actions DON'T exist (workflow dead ends):**

- **Requeue dead item** — `/failures` is read-only; operator has to fix in SQL via chat
- **Apply suggested rule update** from compliance-reviewer AI analysis — today: read AI suggestion, manually edit rule in Rules tab
- **Retry failed render** — `/visuals` Render Log shows error_message but no retry
- **Override format-advisor decision** when low-confidence — today no escalation, no UI
- **Acknowledge / dismiss a Pipeline Doctor auto-fix** — doctor silently fixes; trust-but-verify gap
- **Drill from Calibration gate failure into the failed draft** — today: see "Body too long: 14%" but can't click through
- **Reset auto-approver threshold** — locked decision 3 says NO calibration UI MVP. Today this is SQL-via-chat or briefs.
- **Inline reconnect from token alert banner** — today: click takes you to Connect, no inline

**Future state under locked IA:** the same action endpoints exist, plus Inbox-mediated actions (approve/reject from Inbox), plus exception action items wherever the source page surfaces them. Locked decision 3 keeps calibration / threshold tuning / agent simulator OUT of MVP.

**Workflow risk:** the action gap is the **most expensive** problem in the current dashboard. Every dead end either (a) stalls the operator (they pivot to chat / SQL) or (b) silently degrades trust (auto-fixes happen, operator never reviews). §6 fate decisions should treat "add the missing action" as a first-class outcome, not a v2 polish item.

### Stage 5 — REPORTING

**Trigger:** weekly cadence (review trends), or operator wants outcome data after a content push, OR external review digest fires (Mon 7am AEST per user memory, weekly).

**Today:** /performance (Engagement + Approval Patterns inner tabs) + /costs + /reviews (run-on-demand external digest button) + /diagnostics (Tier 2 reports). Also /pipeline-log AI summary covers trend.

**Future state under locked IA:** REPORTS section with 3 peer tabs — Performance / Costs / Calibration. Approval Patterns inner tab promotes to Calibration peer tab. /reviews relocates to Admin > Reviews (Open Decision 3). /diagnostics becomes INVESTIGATE > Agents but its trend output bubbles up to Overview agent status row.

**Workflow risk:** the loop closure (Reporting → next-day Entry) is currently *manual* — the operator looks at trends, mentally notes "engagement on carousels is dropping", and remembers to react in next session. Brief generation should ingest Reports trends so the loop closes automatically.

---

## Cadence layers

Not every step happens daily. The dashboard should show what's actionable now, not flood the operator with low-cadence noise.

| Cadence | Loop stages | Examples | IA implication |
|---|---|---|---|
| **Hourly** (background) | — | ai-summary writes; pipeline-doctor at :15/:45; auto-approver every 30 min | Surface only when exception. Healthy hourly runs should be invisible. |
| **Daily** | Entry, Review, Investigation, Action | Brief, Inbox triage, incident triage, ad-hoc actions | The dominant loop. NOW + INVESTIGATE primary. |
| **Weekly** | Reporting, Admin (light) | External review digest (Mon 7am), engagement trend review, Calibration trend review, Cowork weekly reconciliation Mon 7am AEST | REPORTS section primary. Admin > Reviews touched. |
| **Monthly** | Reporting, Admin (heavy) | compliance-monitor cron (1st of month), token rotation review, Supabase backup verification, AI cost review per `docs/05_risks.md` | ADMIN section primary. Compliance review queue spikes here. |

**IA implication:** The dashboard should not nudge the operator on daily entry about monthly tasks unless something is overdue. Brief / Overview should respect cadence — monthly Compliance reviews bubble up only when the cron fires or a deadline is approaching.

---

## Workflow table

The central artifact. Each row is a step the operator takes. Steps grouped by loop stage. Risk reflects the cost of the missing-support gap, not the absolute importance of the action.

### Entry

| # | Workflow step | Current route/page | Target IA destination | Actor | Required action | Missing support | Risk |
|---|---|---|---|---|---|---|---|
| 1 | Receive entry signal (notification or scheduled session) | n/a (email / browser bookmark) | Telegram (Brief) + email (digest) | Operator | Open dashboard | Brief surface + Telegram plumbing don't exist | MEDIUM |
| 2 | Land on dashboard | `/overview` | NOW > Overview | Operator | Read header zones | Brief block on top of zones not built | MEDIUM |
| 3 | Read narrative Brief | n/a | NOW > Overview (Brief block) | Operator | Read 1–3 min summary | Entire surface missing | HIGH |
| 4 | Glance at agent status row | partial (`<PipelineHealthCard />` reads single `m.ai_diagnostic_report` row) | NOW > Overview (per-agent status row) | Operator | Spot agent in WARN/CRITICAL | Per-agent status not built; today's card is a single global health number | HIGH |
| 5 | Read token expiry alerts | `/overview` (`m.token_expiry_alert` + `m.vw_ops_token_health`) | NOW > Overview | Operator | Spot expiring tokens | Inline reconnect missing — click goes to Connect | MEDIUM |
| 6 | Read open incidents card | `/overview` (`m.incident`) | NOW > Overview | Operator | Click through to investigate | Click goes to /monitor today — is /monitor the right destination, or should it route by symptom? | MEDIUM |
| 7 | Read "Drafts to review" card | `/overview` (subset of Inbox) | NOW > Overview → click → Inbox | Operator | Approve inline (small set) OR open Inbox | Bulk-approve from card not possible — forces Inbox visit even for trivial sets | LOW |
| 8 | Read "Publishing schedule (next 24h)" | `/overview` | NOW > Overview | Operator | Situational awareness | Cannot reschedule from card | LOW |
| 9 | Glance at quick stats (published / stuck / overdue / incidents) | `/overview` | NOW > Overview | Operator | Spot anomaly | Stats link to /queue + /monitor today; new IA needs the same affordances under Pipeline + Flow | LOW |

### Review

| # | Workflow step | Current route/page | Target IA destination | Actor | Required action | Missing support | Risk |
|---|---|---|---|---|---|---|---|
| 10 | Triage drafts in inbox | `/inbox` (source unread) | NOW > Inbox | Operator (Reviewer in future) | Approve / reject / edit per draft | Bulk approve/reject for backlog clearance (28 drafts in F-AAP-NEEDS-REVIEW-BACKLOG); auto-approver gate-failure context inline | HIGH |
| 11 | Triage policy-change alerts | `/compliance` Review Queue tab | NOW > Inbox | Operator (Admin in future) | Read AI analysis, decide: update rule / dismiss / mark reviewed | One-click "apply suggested rule update" missing — today: read suggestion, manually edit Rules tab; cross-section friction | HIGH |
| 12 | Triage format-advisor escalations | n/a (no escalation pathway today) | NOW > Inbox | Operator | Confirm/override format choice | Entire pathway missing — advisor decisions logged silently in /visuals | MEDIUM |
| 13 | Triage agent annotations | n/a (not built) | NOW > Inbox | Operator | Confirm/override agent action | Annotation queue not built; locked decision 3 may push to v2 | LOW |

### Investigation

| # | Workflow step | Current route/page | Target IA destination | Actor | Required action | Missing support | Risk |
|---|---|---|---|---|---|---|---|
| 14 | Visualise pipeline state | `/monitor` (Flow diagram) | INVESTIGATE > Flow | Operator | Read node colours, click node → detail | `MONITOR_TABS` couples to pages that won't be siblings under new IA; `CLIENT_TABS` hardcoded; "Care For Welfare" present, Invegent absent | MEDIUM |
| 15 | Read row-level pipeline state | `/pipeline-log` (Tier 1 doctor + health snapshots) | INVESTIGATE > Pipeline Log | Operator | Spot stuck items, doctor findings, health trend | Hardcoded NDIS+PP columns at schema + UI level; H1 = "Monitor" not "Pipeline Log" | HIGH |
| 16 | Read agent diagnostic report | `/diagnostics` (Tier 2 LLM agent) | INVESTIGATE > Agents | Operator | Read recommendations + predicted issues | No way to act on a recommendation from the page; "Run now" button works but recommendations are read-only | MEDIUM |
| 17 | Investigate render failure | `/visuals` Render Log | INVESTIGATE > Visual Pipeline | Operator | Read error_message; identify cause | No retry button; no link to advisor decision that picked the format | MEDIUM |
| 18 | Investigate dead-letter rows | `/failures` (3-table union) + `/queue?status=dead` | INVESTIGATE > Pipeline Log + NOW > Inbox (action items) | Operator | Identify root cause; decide requeue vs accept dead | No requeue affordance anywhere; §1 incorrectly stated /failures has one-click requeue | HIGH |
| 19 | Drill into per-client state | partial (`/client-profile` from `/clients`; per-client health columns hardcoded in /pipeline-log) | CLIENTS > [client] | Operator | Read per-client cadence, drafts, queue, performance | No global "switch to client X" pivot — per-client filtering is per-page; multi-client operator workflow forced into manual URL editing | HIGH |
| 20 | Investigate drift (when Stage 2b ships) | F-EF-DRIFT-PREVENTION pending | INVESTIGATE > Pipeline Log (or sub-page — §6 to commit) | Operator | Read `m.ef_drift_log` / `vw_ef_drift_current` | Drift panel not built; sequenced behind S30 + this review's §6 | DEFERRED |

### Action

| # | Workflow step | Current route/page | Target IA destination | Actor | Required action | Missing support | Risk |
|---|---|---|---|---|---|---|---|
| 21 | Approve / reject / edit draft | `/inbox` + `/overview` `<DraftActionButtons />` | NOW > Inbox + Overview card (digest) | Operator | Approve → publish queue; reject → dead | Working; bulk action missing | LOW |
| 22 | Requeue dead item | n/a (SQL-via-chat) | NOW > Inbox or INVESTIGATE > Pipeline Log row action | Operator | One-click requeue with reason capture | Entire affordance missing — single biggest action gap | **CRITICAL** |
| 23 | Reconnect platform token | `/connect` (D-YT-OAUTH-1) | CLIENTS > Connect | Operator | OAuth dance | Inline reconnect from Overview alert missing | MEDIUM |
| 24 | Toggle feed source on/off | `/feeds` | CLIENTS > Feeds | Operator | Click toggle; surface health metrics | Source unread; assumed working | LOW |
| 25 | Onboard new client | `/onboarding` (~37 KB wizard) | CLIENTS > Onboarding | Operator | Step through wizard | Sidebar nav entry missing today; URL-only | LOW |
| 26 | Create single post | `/content-studio` `single` mode | CREATE > Content Studio | Operator | `<PostStudioForm />` flow | Working | LOW |
| 27 | Create / manage campaign series | `/content-studio` `series` mode | CREATE > Content Studio | Operator | List/create/detail series flow | Working | LOW |
| 28 | Manage channel subscriptions | `/content-studio` `analyse` mode (`<ChannelSubscriptions />`) | CLIENTS > Feeds OR Connect (§6 to commit) | Operator | Subscribe / unsubscribe sources | Mis-homed under Create today; conceptual mismatch | MEDIUM |
| 29 | Toggle format `is_buildable` / edit advisor description | `/system/formats` (`t."5.3_content_format"`) | CREATE > Formats | Operator (Admin in future) | Toggle flag; edit advisor instruction | Working | LOW |
| 30 | Update compliance rule | `/compliance` Rules tab (`<ComplianceRulesPanel />`) | ADMIN > Compliance Rules | Admin | Edit rule text / risk level / enforcement | Cross-section flow from Inbox policy-change alert is two clicks + manual paste | MEDIUM |
| 31 | Adjust subscription / billing | `/system/subscriptions` (source unread) | ADMIN > Subscriptions | Admin | Update billing config | Source unread; assumed working | LOW |
| 32 | Override pipeline-doctor auto-fix | n/a (doctor silently auto-resolves stuck items) | INVESTIGATE > Pipeline Log + NOW > Inbox (review-fix action item) | Operator | Acknowledge fix or roll back | Trust-but-verify gap; doctor fixes are not visible as discrete events the operator must approve | HIGH |

### Reporting

| # | Workflow step | Current route/page | Target IA destination | Actor | Required action | Missing support | Risk |
|---|---|---|---|---|---|---|---|
| 33 | Review engagement trends | `/performance` Engagement tab | REPORTS > Performance | Operator (weekly) | Read per-client summary + format breakdown + top posts | Meta App Review (Standard Access) gating per page banner; "Development tier active" caveat | DEFERRED on data quality |
| 34 | Review auto-approver calibration | `/performance?view=approvals` (Approval Patterns inner tab) | REPORTS > Calibration | Operator (weekly) | Read pass rate + gate failures + weekly trend | Cannot click through gate-failure breakdown into a specific failed draft | MEDIUM |
| 35 | Review AI cost trend | `/costs` (source unread) | REPORTS > Costs | Operator (weekly) | Read cost-per-client / cost-per-model | Source unread; assumed working | LOW |
| 36 | Review external commit digest | `/reviews` (Mon 7am AEST weekly + on-demand button) | ADMIN > Reviews | Admin (weekly) | Read findings; act if any | `/api/run-digest` returns aggregated counts; doesn't link from a finding back into the corresponding commit / file | LOW |
| 37 | Reconcile session-state with action_list | n/a (chat + repo + memory edits) | (chat-native, not dashboard) | Operator (every session close) | 4-way sync per `userMemories` | This loop is **chat-native and won't be in the dashboard** — noted here for completeness; the dashboard's roadmap page reflects state but is not the editing surface | n/a |
| 38 | Verify monthly health (backups, tokens, costs) | scattered across `/overview` token alerts + `/costs` + Supabase native | spans REPORTS + ADMIN | Admin (monthly) | Run through monthly checklist in `docs/05_risks.md` | No consolidated monthly check surface; checklist lives in markdown only | MEDIUM |

---

## Handoff points between IA sections

A handoff is a moment in the loop where the operator transitions from one IA section to another. Smooth handoffs reduce cognitive load; broken handoffs cause the operator to lose context and re-orient.

| From | To | Trigger | Today | Future state | Risk |
|---|---|---|---|---|---|
| NOW > Overview | NOW > Inbox | Drafts-to-review card click | Working (`<DraftActionButtons />`) | Same; card stays as digest | LOW |
| NOW > Overview | NOW > Pipeline (or /queue) | Quick-stat "Overdue queue" / "Stuck jobs" click | Working (links to /queue, /monitor) | Same; targets shift per fate map | LOW |
| NOW > Overview | INVESTIGATE > Flow | Open-incidents card click | Working (links to /monitor) | Should route by *symptom*, not generically to Flow | MEDIUM |
| NOW > Overview | CLIENTS > Connect | Token expiry alert click | Working | Inline reconnect would close handoff entirely | MEDIUM |
| NOW > Inbox | ADMIN > Compliance Rules | Policy-change alert → "update rule" | Broken — manual cross-section navigation | One-click "apply suggested rule update" closes handoff | HIGH |
| NOW > Inbox | CLIENTS > [client] | Click client name on draft card | Working in /overview; assumed working in /inbox | Same | LOW |
| INVESTIGATE > Pipeline Log | NOW > Inbox | Dead item needs operator decision | Broken — /failures is read-only; no requeue affordance anywhere | Action item surfaces in Inbox as exception | **CRITICAL** |
| INVESTIGATE > Visual Pipeline | NOW > Inbox | Format-advisor low-confidence escalation | Broken — no escalation pathway | Inbox absorbs format-advisor exceptions | MEDIUM |
| INVESTIGATE > Agents | ADMIN > Compliance Rules | Compliance-reviewer recommendation | Broken — same as Inbox handoff above | Same fix | HIGH |
| INVESTIGATE > Agents | NOW > Overview | Agent state change updates status row | Partial — Tier 2 diagnostic surfaces; per-agent missing | Agent status row reads each agent | MEDIUM |
| REPORTS > Calibration | NOW > Inbox | Gate-failure pattern → specific draft | Broken — no click-through from gate-failure breakdown | Click-through enables calibration-driven correction | MEDIUM |
| REPORTS > Performance | CLIENTS > [client] | Per-client engagement detail | Likely working (Performance has per-client cards) | Same | LOW |
| ADMIN > Reviews | (back to repo / commit) | External-reviewer finding investigation | Broken — digest doesn't link back to commit / file | Link from finding to GitHub commit | LOW |
| ADMIN > Roadmap | (back to chat / repo) | Roadmap reconciliation | Chat-native, not dashboard editing | Open Decision 4 governs whether dashboard becomes editing surface | LOW |

---

## Where the final IA *supports* the workflow

1. **Single named home for each loop stage.** Today the operator has 6 "Monitor"-branded routes for Stage 3 alone. New IA forces a named target for each symptom, removing the "which page should I look at?" stall.
2. **Inbox-as-exception-surface centralises Stage 2.** Today: drafts on /inbox, policy-change alerts on /compliance, format escalations nowhere. New IA: single typed inbox.
3. **REPORTS > Calibration promoted from inner tab to peer tab.** Locked decision 3 keeps calibration MVP-shallow but visible. Promotion respects the operator's weekly cadence — they don't have to remember it lives inside Performance.
4. **CREATE section co-locates content authoring.** Today: /content-studio + /system/formats are nav-distant. New IA puts both under Create, matching the mental model.
5. **Brief surface (when built) closes the Reporting → Entry loop automatically.** Currently the operator manually carries trend insights from one session to the next.

## Where the final IA *breaks* the workflow (gaps, dead ends, ambiguities)

1. **Open Decision 2 (Pipeline state-machine reframe) leaves Stage 3+4 unstable.** If `/queue` is replaced rather than renamed, the operator's existing muscle memory for "see all queue items, filter by failed" breaks. §6 must commit.
2. **Inbox-as-exception-surface has no shape decision.** Drafts, policy alerts, format escalations, agent annotations have different urgencies. Flat list dilutes; sub-tabs fragment. §6 must commit.
3. **Action gap is the single biggest workflow risk.** Locked decision 3 is correct for MVP scope (no calibration UI) but doesn't address the missing requeue / retry / acknowledge / inline-rule-update affordances. **These should be lifted out of "v2 polish" and treated as workflow-completion items.**
4. **No global client switcher.** Multi-client operator workflow today is per-page filtered. Locked decisions don't address sidebar shape; §6 must.
5. **Pipeline Doctor trust-but-verify gap.** Doctor silently auto-resolves stuck items. New IA doesn't surface doctor fixes as discrete events; the operator has no way to spot a wrong fix. **§9 should consider whether `m.attention_item` includes "doctor auto-fix to acknowledge."**
6. **Cross-section handoff via Inbox needs design.** Today the operator pivots manually between sections. The Inbox-as-pivot pattern (a policy-change alert with a one-click "apply suggested update" button that lands the operator in Admin > Compliance Rules with the suggested edit pre-filled) is implied by locked decisions but not yet specified.
7. **Cadence respect.** Brief / Overview should not nudge daily about monthly tasks. Today this isn't a problem because the surfaces don't talk to each other; in the new IA the integration risks alert fatigue.
8. **Operator-vs-Admin role split is invisible in the IA.** Same person today; design implication: which sections can be hidden / read-only when the role split happens?

## Duplicated steps (operator does the same thing in two places)

1. **Approve a draft.** Today on /overview card AND on /inbox. Future: keep both — Overview as digest with inline approve, Inbox as full queue. Pattern is fine; just confirm the Inbox button surface stays consistent.
2. **Read queue depth.** /overview "Publishing schedule", /pipeline-log "Queue depth" stat, /queue table count. Future: one canonical surface (Pipeline) plus digest cards on Overview that link to it.
3. **Read stuck/dead items.** /overview "Open incidents", /pipeline-log "Stuck items" alert, /failures, /queue?status=dead. Future: Pipeline Log row-level + Inbox action items + Overview digest.
4. **Read per-client metrics.** /overview, /performance, /diagnostics per-client findings, /pipeline-log NDIS+PP cards. Future: per-client view in Clients > [client] is canonical; cards on Overview / Reports digest from that.

## Unclear ownership

1. **Inbox** — today PK as Operator and Reviewer combined. When delegated, who owns the queue's authority? Per-client reviewer (client portal) vs operator-side reviewer (VA on Layer 1) split is unaddressed.
2. **Compliance Rules** — today PK. When external clients exist, can a client see their own rules? Author them? Suggest changes? Layer 1/2 boundary unaddressed in locked decisions.
3. **Roadmap** — today PK + chat. When external clients exist, is the roadmap visible to them as a transparency artifact, or admin-only? Open Decision 4 partially covers but not the visibility question.
4. **Subscription / Billing** — today PK. Per-client billing visibility belongs in portal (Layer 2). Dashboard ADMIN > Subscriptions is for ICE-level billing, not client-level.
5. **Pipeline Doctor authority** — today the doctor auto-fixes; nobody approves. Should fixes need acknowledgment past a severity threshold?

## Missing operator affordances (consolidated)

1. Bulk approve / reject on Inbox (HIGH; F-AAP-NEEDS-REVIEW-BACKLOG = 28 drafts at v2.45)
2. Requeue dead item (CRITICAL; today SQL-via-chat)
3. One-click "apply suggested rule update" from Inbox compliance-policy alerts (HIGH)
4. Inline reconnect from Overview token alert banner (MEDIUM)
5. Click-through from REPORTS > Calibration gate-failure breakdown into the failed draft (MEDIUM)
6. Retry failed render from Visual Pipeline (MEDIUM)
7. Override format-advisor decision on low confidence (MEDIUM)
8. Acknowledge / roll back pipeline-doctor auto-fix (HIGH)
9. Global client switcher in sidebar (MEDIUM)
10. Sidebar search across drafts / posts / clients (LOW — not in locked IA)
11. Notification badges on Inbox / dead-item action items / Compliance review queue (LOW)
12. Brief read-state acknowledgment (LOW)
13. Symptom → surface routing from Open Incidents card (MEDIUM)
14. Calibration commentary linking to actionable next-step (MEDIUM)
15. Promote Onboarding to sidebar nav under Clients (LOW)
16. Drift panel exposing `m.ef_drift_log` (DEFERRED — sequenced behind S30 per v2.45)

---

## Open questions feeding §4–§6

1. **Inbox shape: flat vs typed sub-tabs.** Drafts / policy-change alerts / format escalations / agent annotations — single column or four sub-queues?
2. **"Action gap" prioritisation.** Should the missing affordances above (esp. requeue dead item) be lifted into MVP scope, given they are workflow-completion items rather than v2 polish?
3. **Overview Open-Incidents routing.** Should the click route by *symptom* rather than generically to Flow?
4. **Sidebar shape.** Global nav vs per-client switcher vs "clients are worlds" — what's the v1 commitment?
5. **Pipeline Doctor auto-fix surfacing.** Should fixes past a severity threshold create an acknowledgment item in Inbox?
6. **Layer 1/2 boundary on Inbox.** Operator-side reviewer (VA on Layer 1) vs client-side reviewer (portal Layer 2) split.
7. **Cross-section handoff with pre-filled state.** When Inbox policy alert says "apply suggested rule update", does the operator land in Admin > Compliance Rules with the edit pre-filled, or do they paste manually?
8. **Cadence-aware Brief.** Should Brief omit healthy hourly/daily signals and only surface exceptions + monthly-cadence reminders?
9. **Operator vs Admin role split.** Should sidebar visibility be role-gated in v2?
10. **Symptom → Investigate-surface table.** §6 to commit a routing table from incident type to landing surface.
11. **Workflow-step completeness.** Are there steps in PK's actual rhythm not captured here that §6 should add before page-fate is locked?
12. **"Operator workflow map" → §3 vs original §2 slot.** Has the section now permanently re-slotted to §3, or is this a temporary placement until reconciliation?

---

## Honest limitations

- This map is constructed from source reads + memory + kickoff context, not from PK shadowing. PK's actual daily/weekly rhythm may diverge. §6 should pressure-test this against PK's real Tuesday morning behaviour.
- `/inbox` source not read this session — the Stage 2 Inbox claims are partly inferred from `/overview`'s draft cards and the Inbox sidebar match.
- `/onboarding`, `/clients`, `/feeds`, `/connect`, `/costs`, `/system/subscriptions`, `/roadmap` source not read — workflow steps using these are described from sidebar grouping + locked IA, not from observed source.
- The portal repo (`invegent-portal`) was not inventoried — Layer 1/2 handoffs are described in the abstract.
- Edge Functions backing the agents (compliance-reviewer, ai-diagnostic, pipeline-doctor, format-advisor) were noted but not read — the workflow assumes their output behaviour is roughly as described in `/diagnostics`, `/compliance`, `/pipeline-log`, `/visuals`.
- Risk levels are operator-shoes assessments, not from a formal scoring rubric. §6 should commit a rubric.
- The Brief surface and Telegram channel are speculative — the locked decision exists but no design has been drafted; the workflow steps using them describe the *intent* of locked decision 2.
- Multi-client cap-throttle planning (per `userMemories` v2.45 — ~104 IG-overdue when jobid 53 unblocks) is a workflow event NOT yet captured here. §6 should consider whether "surge clearance" deserves its own loop variant.
- Cowork (autonomous brief execution) is a parallel automation surface, not an operator surface; its briefs and queue are chat-native and not in the dashboard scope.
- Operator vs Admin role split is theoretical until PK delegates; the design implications are speculative.

---

*Created 2026-05-06 (Sydney). §3 of 11 in the dashboard architecture review (re-slotted from original §2). Inputs: kickoff session record, `00_overview.md`, `01_current_state_inventory.md`, `02_target_ia_mapping.md`. No new source reads this session beyond the prior §2 reads. Next: §4 IA Option Comparison (or Decision Criteria, depending on PK direction).*
