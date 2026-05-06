# §4 — Decision Criteria

## Purpose

This document defines **how dashboard architecture decisions are made and evaluated** — not what those decisions are. It is the framework that §5 (IA option comparison), §6 (page-by-page fate), §7–§10, and v1 implementation decisions all reference.

Everything below is grounded in evidence from §1–§3 of this folder. Where a principle, axis, trade-off, or anti-pattern is invoked in a later section, it should cite this file.

## Section-numbering note (transparency)

In the kickoff structure, §3 was "Decision Criteria". After PK redirected §2 to Target IA Mapping (last session) and re-slotted Operator Workflow Map to §3 (this session, prior turn), Decision Criteria has landed at §4. The IA Option Comparison originally slotted at §4 will need to slot at §5 — PK to confirm in next turn. `00_overview.md`'s 11-section table remains out-of-sync; reconciliation deferred per files-changed minimisation.

## How later sections use this document

- §5 (IA Option Comparison) scores each candidate IA against the **axes** in §4.2, checks each candidate against the **principles** in §4.1 and **anti-patterns** in §4.4, and applies the **trade-off defaults** in §4.3.
- §6 (Page-by-page fate) revises each fate decision from §2's migration table by running it through the same checks.
- §7–§9 use this framework when introducing new product objects, channel plans, and Layer 1/2 boundaries.
- §10 (Migration sequence) uses **migration-cost** axis and **"existing pages are evidence"** principle as primary inputs.
- §11 (Risks + open decisions) carries forward the §4.6 open questions plus anything surfaced during §5–§10.

---

## 4.1 Core Decision Principles

Non-negotiable filters. Every later decision must pass all seven. A principle violation is a veto, not a trade-off.

These are derived from §3 findings, locked foundational decisions in `00_overview.md`, and patterns earned across the ICE incident history (Lesson #51, #61, #62, #69, F-EF-DRIFT-PREVENTION work, Phase 1.7 dead-letter policy).

### P1 — Operator-first over system elegance

**Definition.** Every design choice is judged against what serves the human in the loop, not what is internally tidy. When the cleanest data model produces a page the operator can't act on, the data model loses.

**Protects against.** Beautiful taxonomies that fragment the operator's loop (e.g. splitting Inbox by data table rather than by decision type). System-shaped pages that surface raw state instead of operator-actionable items.

**Example today.** `/failures` unions three pipeline tables (`m.post_draft`, `m.post_publish_queue`, `m.ai_job` dead items) into a clean cross-table view — system-elegant, but the operator cannot act on any of it from that page. **Violates P1.**

### P2 — Actionability over observability

**Definition.** A surface that shows a problem must let the operator act on it. Read-only "here's what's wrong" pages are tolerable only when the action is genuinely impossible from that surface and the action's home is one click away.

**Protects against.** Pages that earn their place by displaying signal but force the operator to pivot to chat / SQL / another page to act. The single largest workflow risk identified in §3.

**Example today.** `/diagnostics` produces high-quality recommendations from the Tier 2 LLM agent. The operator can read a recommendation like "Increase NDIS-Yarns auto-approver threshold by 0.05" but cannot apply it from the page — they pivot to SQL via chat. **Violates P2.**

### P3 — Workflow continuity over page purity

**Definition.** Cross-section handoffs preserve context. When the operator clicks from Inbox into Admin to apply a rule update, they should arrive with the suggested edit pre-filled, not on a blank rule editor. Page purity ("this page does one thing") is sacrificed when the cost is operator re-orientation.

**Protects against.** Each page being internally clean while the workflow that crosses pages is broken. §3's handoff matrix flagged 6+ broken handoffs.

**Example today.** Inbox compliance policy-change alert says "suggested rule update: tighten X to Y". Operator clicks through to `/compliance` Rules tab. They land on a fresh editor with no pre-fill. They have to remember the suggestion, navigate to the right rule, and paste manually. **Violates P3.**

### P4 — Web is the workspace, non-web is the nudge

**Definition.** All decisions and actions happen on web. Telegram and email push the operator toward the web; they never substitute for it. No mobile inbox, no voice approval flows, no Telegram-driven decisions.

**Protects against.** Channel proliferation that fragments the source-of-truth surface and creates ambiguity about "where did I approve that draft — phone or laptop?". Reaffirms locked decision 2 from `00_overview.md`.

**Example today.** No violation — there are no non-web channels yet. The principle exists to discipline the Brief design (§7).

### P5 — Existing pages are evidence, not sacred or disposable

**Definition.** Every current page is a recorded operator decision plus accumulated learning. Discarding a page wholesale loses that learning; preserving a page wholesale entrenches its mistakes. Each page enters §6 with a fate decision (keep / merge / rename / retire / defer) that respects what the page taught us without preserving how it taught us.

**Protects against.** Both extremes — the "rewrite it all" reflex and the "don't touch what works" reflex. Reaffirms locked decision 1 from `00_overview.md`.

**Example today.** `/diagnostics` is a strong candidate for retirement-as-a-route, but its Tier 2 LLM agent surface, per-client `cadence_status` framing, and predicted-issues format are valuable patterns to preserve. §2 fates it as **Keep + Rename + Re-home** — the surface seeds INVESTIGATE > Agents.

### P6 — Cadence respect over surfacing everything

**Definition.** Daily-loop surfaces show daily-loop signals. Monthly tasks bubble up only when overdue or actionable. Hourly background runs are invisible unless they fail.

**Protects against.** Alert fatigue. The Brief / Overview becoming a dumping ground for every cron run, every health snapshot, every advisor decision. Identified in §3 cadence-layers section as a forward risk.

**Example today.** Partial violation — `/overview` shows token expiry alerts (correct), open incidents (correct), and Pipeline Health Card (correct, daily). It does NOT yet pull in monthly compliance-monitor state, weekly external-review digest state, or quarterly Supabase-backup state. The new IA's Brief surface is at risk of over-surfacing once those layers are integrated.

### P7 — Auto-actions are auditable events

**Definition.** When a system component takes an action without operator confirmation — pipeline-doctor auto-fixes a stuck item, auto-approver auto-publishes a draft, drift-check sweeps a row — that action surfaces somewhere the operator can see and (when severity warrants) acknowledge or roll back. Silent auto-actions are not allowed even if they always work.

**Protects against.** The pipeline-doctor trust-but-verify gap from §3. Reaffirms the spirit of Phase 1.7 dead-letter policy ("Dead items are never deleted — they are an audit trail") and the F-EF-DRIFT-PREVENTION drift-log retention rule.

**Example today.** Pipeline-doctor auto-fixes stuck items every 30 min via `m.pipeline_doctor_log`. The log exists but is buried under the Tier 1 Pipeline Log section tabs and not surfaced as discrete events the operator must acknowledge. **Partial violation** — audit trail exists but isn't operator-facing.

---

## 4.2 Decision Axes

Dimensions for evaluating competing options that all pass the principles. Each option in §5 is scored HIGH / MEDIUM / LOW per axis. Lower aggregate score loses, all else being equal.

### A1 — Speed to action

**Definition.** Clicks (and seconds) from operator entry signal to first useful action.

**Why it matters here.** Today's operator opens dashboard → scans 4+ Overview zones → clicks Inbox → reads a draft → approves. Best case ~30 seconds. With Brief surface, target is one read + one tap.

**Current gap (from §3).** Stage 4 actions like requeue dead item have **infinite clicks** because the affordance doesn't exist — operator pivots to SQL via chat. Less dramatic but still expensive: inline reconnect from token alert (today 3 clicks), apply suggested rule update (today 5+ clicks).

### A2 — Cognitive load

**Definition.** Number of distinct mental models the operator carries simultaneously to use the surface effectively.

**Why it matters here.** PK is sole operator. Each "what does this page mean and how does it differ from the next page?" is overhead. Today the operator carries ~6 mental models for the "Monitor" cluster alone (Flow vs Pipeline Log vs Diagnostics vs Visuals vs Compliance vs Performance), all branded "Monitor".

**Current gap (from §3).** Six pages with `MONITOR_TABS` coupling and "Monitor" H1 — the operator cannot predict which page will surface a given symptom. Investigation today is exploratory, not directed.

### A3 — Error risk

**Definition.** Likelihood of operator publishing the wrong content, applying the wrong rule, or approving an exception that should have been blocked.

**Why it matters here.** NDIS sector compliance bar is high (`docs/02_scope.md`, `docs/07_business_context.md`). One mis-approved post that violates NDIS rules damages a client's regulatory standing. The auto-approver Calibration tab targets 60–80% pass rate with **zero HARD_BLOCK compliance flags** — zero, not low.

**Current gap (from §3).** Calibration's gate-failure breakdown shows pass rates and gate categories but cannot click through to the failed draft. Operator can see "14% Body too long" but cannot inspect which drafts. Any individual mis-approval hides in aggregate stats.

### A4 — Discoverability

**Definition.** Probability the operator finds the surface without prior knowledge of the URL.

**Why it matters here.** Sole-operator dashboards rot when the operator forgets a surface exists. New roles (eventual VA / Admin) need to find surfaces without onboarding scripts.

**Current gap (from §3).** `/onboarding` is a fully-built ~37 KB wizard that does not appear in the sidebar. Discoverability today: zero. `m.chatgpt_review` records have no dashboard surface at all.

### A5 — Cross-section dependency

**Definition.** Does this surface require state, action, or context from another IA section to be useful?

**Why it matters here.** Inbox is the canonical cross-section dependency surface — it absorbs draft, compliance, format-advisor, and (future) agent annotation items. Designs for Inbox must accept that its content is generated elsewhere, not authored on the page.

**Current gap (from §3).** Inbox → Admin handoff for compliance rule update is broken (no pre-fill). Calibration → Inbox click-through is broken (no link to failed draft). Pipeline Log → Inbox dead-item action item is missing entirely.

### A6 — Automation compatibility

**Definition.** Does this surface degrade gracefully as agents take more of the work? Inbox at 28-draft backlog must work; Inbox at 0-draft cleared state must also work. Per-page surfaces must work whether the auto-approver runs every 30 min or every 5 min.

**Why it matters here.** ICE's stated direction is automate-aggressively-and-surface-exceptions (`docs/02_scope.md` § Auto-Approval Agent, locked decision 3 "agents as status surface"). Surfaces designed for high-volume manual review break when the system becomes mostly-automated.

**Current gap (from §3).** F-AAP-NEEDS-REVIEW-BACKLOG = 28 drafts at v2.45. Inbox source unread but bulk-approve affordance flagged as missing in §3 row 10. Today the backlog and the steady-state both flow through the same UI — neither shape is optimised.

### A7 — Migration cost

**Definition.** Code, data, and operator-relearning work needed to ship this option from current state.

**Why it matters here.** Locked decision 1 ("strategic renovation, staged migration") makes migration cost a first-class axis. An option that scores best on operator axes but requires a full rewrite competes against an option that scores second-best with low migration cost.

**Current gap (from §3).** Hardcoded NDIS+PP fields in `m.pipeline_health_log` schema are a genuine schema migration, not a UI change. `MONITOR_TABS` coupling spans 6 page files. Any IA option that requires removing both pays a meaningful migration cost.

---

## 4.3 Trade-off Patterns

Recurring tensions where both sides have merit. Default bias wins unless an option has explicit countervailing evidence. "Default bias" is the position taken absent further information.

### T1 — Consolidation vs clarity

**The tension.** One Inbox absorbing all exception types vs typed sub-tabs (drafts / policy alerts / format escalations / agent annotations).

**Default bias.** **Consolidation.** A single typed list scrolls, a four-tab Inbox makes the operator pick a tab before seeing what needs attention. Drift toward typed sub-tabs only if mixed-list scanning demonstrably degrades operator throughput at backlog levels we expect.

**Example.** §2 fates `/compliance` Review Queue items as folding into Inbox. Default bias says: same Inbox, with severity sort. Override only with evidence that policy-change alerts and draft reviews need different decision shapes that scrolling won't resolve.

### T2 — Automation vs operator control

**The tension.** Auto-approver auto-publishes vs auto-approver flags every borderline draft for review.

**Default bias.** **Automate aggressively, surface exceptions visibly.** Auto-approver should publish whenever it can; the operator's job becomes catching exceptions, not blessing happy-path output. Locked decision 3 reinforces this for agents broadly.

**Example.** Today auto-approver flags 14% of drafts on "Body too long" — that's exception-worthy. Calibration target of 60–80% pass rate accepts that 20–40% will surface to operator. Acceptable; flagging less than that would not be.

### T3 — Power vs simplicity

**The tension.** Rich filtering / bulk actions / advanced views vs scannable, simple lists.

**Default bias.** **Simplicity for the daily loop, power for backlog clearance.** Daily Inbox is a simple scannable list with one-click approve/reject. Backlog clearance (28 drafts) gets bulk operations and filter affordances behind a clearly-labelled "power" toggle. Daily-loop surfaces should not pay simplicity tax for backlog support.

**Example.** `/queue` today has 5 status filter tabs + client filter + search params. That's appropriate for an investigation surface but would be wrong for the Inbox daily entry.

### T4 — Real-time vs stable views

**The tension.** 30-second auto-refresh on `/monitor` vs static daily-snapshot Reports.

**Default bias.** **Stable for the default view, real-time on demand.** Auto-refresh is appropriate for Flow during incident response. It is wrong for daily Brief, Reports, or Inbox. Brief should be a stable artifact the operator reads once; Reports should be a stable trend the operator scans weekly. Real-time refresh on stable surfaces creates phantom changes that distract.

**Example.** Today `/monitor` auto-refreshes every 30s (useful). Today `/overview` is `force-dynamic` with no caching but no timed refresh — stable per-pageload. The Brief should follow `/overview`'s pattern, not `/monitor`'s.

### T5 — Single nav surface vs role-gated nav

**The tension.** One sidebar for all roles vs role-gated visibility (Operator sees Now/Investigate; Admin sees Reports/Admin).

**Default bias.** **Single nav for v1; role-gating in v2 if and only if a real second role exists.** Today PK is all roles — role gating creates artificial complexity. v2 introduces role gating IF AND WHEN a second human takes part of the loop.

**Example.** `/system/subscriptions` is Admin-shaped today but visible in operator sidebar. Acceptable for v1.

### T6 — Visualisation vs row table

**The tension.** Pipeline Flow Diagram (`/monitor`) vs row-level Pipeline Log table (`/pipeline-log`) — do we keep both, merge, or pick one?

**Default bias.** **Keep both with clean handoff.** Visualisation is for situational awareness during incident response ("which stage is broken?"). Row table is for forensic investigation ("which 3 specific rows are stuck?"). The handoff: clicking a node on the Flow diagram filters the Pipeline Log to that stage. Today the handoff is broken (clicking nodes does its own thing in `<PipelineFlowDiagram />`); restoring it is migration work, not deletion work.

**Example.** §2 fates `/monitor` as Keep + Decouple and `/pipeline-log` as Keep + Rename + Refactor. Default bias supports both fates and adds the cross-link as a §6 to-do.

---

## 4.4 Anti-Patterns

What must NOT be repeated. An anti-pattern triggered by a candidate option is a veto, not a trade-off. Each anti-pattern below has direct evidence in the current dashboard.

### AP1 — Two products in one page

**Description.** A single route renders two functionally distinct surfaces under shared chrome (e.g. "Compliance" = review queue + rule editor; "Performance" = engagement metrics + auto-approver calibration).

**Why dangerous.** The page name describes neither sub-product. Operator carries two mental models per visit. Sub-product growth competes for layout space. Evolution of one half forces re-design of the other.

**Where today.** `/compliance` (Review Queue + Rules inner tabs). `/performance` (Engagement + Approval Patterns inner tabs). Both already split internally — the new IA promotes them to sibling surfaces.

### AP2 — Observability without action

**Description.** A surface displays signal but provides no way to act on it. Operator must pivot to SQL, chat, or another section to act.

**Why dangerous.** Erodes trust in the surface ("why am I looking at this if I can't do anything?"). Forces fallback to chat / SQL, which fragments the source-of-truth. Encourages skipping the surface entirely.

**Where today.** `/failures` is read-only across 3 dead-letter tables. `/diagnostics` recommendations are read-only. `/visuals` Render Log shows error_message with no retry. REPORTS Calibration gate-failure breakdown has no click-through to the failed draft.

### AP3 — Hidden critical actions in SQL / chat

**Description.** Operator-required actions that have no UI path. The only way to perform them is to write SQL or instruct chat.

**Why dangerous.** Action becomes operator-only (no delegation possible). Audit trail is in chat history, not in the dashboard. Errors compound — a fat-fingered SQL command in production is a far worse failure mode than a UI button click.

**Where today.** Requeue dead item (single biggest gap, flagged CRITICAL in §3 row 22). Threshold tuning for auto-approver. Close-the-loop UPDATEs to `m.chatgpt_review`. Schema-level fixes (e.g. NDIS+PP hardcoded columns).

### AP4 — Cross-section dependency without linkage

**Description.** A surface tells the operator to act on another section's content, but the link doesn't carry context. Operator arrives at the destination with a blank state.

**Why dangerous.** The handoff cost approaches the value of the underlying signal — if reading the suggestion + manually applying it takes longer than ignoring the suggestion, the operator ignores it. Defeats the upstream agent's work.

**Where today.** Inbox compliance policy alert → `/compliance` Rules tab (no pre-fill). Calibration gate-failure breakdown → failed draft (no link). Diagnostics recommendations → the action (no link). External-reviewer digest finding → commit / file (no link).

### AP5 — Section-tab coupling across IA-distant pages

**Description.** Multiple pages share section-tab navigation that treats them as siblings, when they are not siblings under the new IA.

**Why dangerous.** Operator's mental model of "these pages belong together" gets entrenched in code (`MONITOR_TABS` array repeated across 6 page files), making future IA shifts more expensive. §6 fate-mapping has to remember to remove these tabs in 6 places.

**Where today.** `MONITOR_TABS` couples `/monitor`, `/pipeline-log`, `/visuals`, `/compliance`, `/costs`, `/performance` (some pages also include `/diagnostics`). Under the new IA these distribute across NOW, INVESTIGATE, REPORTS, ADMIN.

### AP6 — Hardcoded reference data in shipped code

**Description.** Client names, vertical names, format keys, or other reference data baked into UI components or schema as literal strings/columns rather than read from canonical tables.

**Why dangerous.** Any new client / vertical / format requires a code change to be visible. Brittle in a multi-tenant system. Schema-level instances are worse — they require a migration to fix.

**Where today.** `/monitor` `CLIENT_TABS = [NDIS-Yarns, Property Pulse, Care For Welfare]` (Invegent brand absent). `m.pipeline_health_log` schema columns `ndis_published_today` + `pp_published_today` (schema-level, requires migration). `/pipeline-log` UI columns and stat cards.

### AP7 — Silent auto-actions without audit trail

**Description.** A system component takes an action without operator confirmation AND without surfacing the action as a discrete event the operator can see and (when severity warrants) acknowledge.

**Why dangerous.** Operator's belief about system state diverges from actual system state. When the auto-action is wrong, operator finds out only when downstream effects appear — too late to prevent.

**Where today.** Pipeline-doctor auto-fixes stuck items at :15 and :45. Audit trail exists in `m.pipeline_doctor_log` (good) but is buried under section tabs (bad). Operator does not see fix events as a queue.

### Bonus: anti-patterns NOT triggered today but worth naming for v1 design

- **Brief as a duplicate of cards** — if the Brief surface (locked decision 2) just re-states what the Overview cards say, it's a violation of P1 (operator-first) and AP2 (observability without action). The Brief earns its place by being a NARRATIVE summary that integrates across cards, not a paraphrase of any one card.
- **Telegram as a decision channel** — directly violates P4. Locked decision 2 already names this; restating here for clarity.
- **Inbox-as-firehose** — if Inbox absorbs every system event, T1's default bias (consolidation) inverts into a violation of P6 (cadence respect). Inbox absorbs operator-required exceptions, not system events.

---

## 4.5 Decision Application Rules

How this framework gets used in §5 and §6.

### Scoring

Each candidate option (whether a full IA, a single page fate, or a Layer 1/2 split) is evaluated as:

1. **Principle check (§4.1).** Mark each of P1–P7 as PASS or VIOLATE. **Any VIOLATE is a veto** — the option is removed from comparison until the violation is fixed.
2. **Anti-pattern check (§4.4).** Mark each of AP1–AP7 as CLEAN or TRIGGERS. **Any TRIGGERS is a veto** — same as principle violation.
3. **Axis scoring (§4.2).** Score each of A1–A7 as HIGH / MEDIUM / LOW. Aggregate is informative, not decisive — a candidate with one LOW is acceptable, three LOWs is not.
4. **Trade-off application (§4.3).** Where two candidates differ on T1–T6, the candidate aligned with the default bias wins UNLESS the other candidate produces explicit countervailing evidence (cited from §1–§3 source reads or PK direction).
5. **Migration-cost gate (A7).** If the highest-scoring candidate has migration cost above available capacity, the next-highest candidate that fits in capacity wins. Migration cost is a real veto, not a soft factor.

### Conflict resolution

When criteria conflict:

- **Principles trump axes.** A principle violation removes an option; you do not trade off principle compliance against speed-to-action.
- **Anti-patterns trump axes.** Same logic.
- **Axes trump trade-offs.** If aggregate axis scoring favours candidate A but trade-off default bias favours candidate B, axes win.
- **Trade-off defaults trump preference.** Aesthetic preference does not beat documented default bias.
- **PK direction trumps the framework.** PK can override any decision but must do so explicitly, citing the principle / axis / trade-off / anti-pattern they are overriding. Documented in the relevant section.

### "Good enough to move forward"

A decision is good-enough-to-move-forward when:

1. PASSES all 7 principles.
2. CLEAN on all 7 anti-patterns.
3. Acceptable across axes — NO MORE THAN TWO LOWs out of seven.
4. Migration cost fits available capacity (or the option is explicitly staged across multiple migration phases).
5. Default trade-off biases applied OR explicit countervailing evidence cited.
6. Open questions in this document are NOT blocking the specific decision (i.e. the decision can be made without first answering Q1–Q5 in §4.6).

An option is NOT required to be optimal across every axis. It is required to be defensible against every principle and every anti-pattern.

### Re-evaluation triggers

When a later section (§5–§10) surfaces:

- A new candidate **principle** — escalate to PK before locking the decision that surfaced it.
- A new candidate **anti-pattern** — same.
- A new candidate **axis** — may be added without escalation if it doesn't conflict with existing axes.
- A new **trade-off** — may be added without escalation; default bias defaults to the conservative side until evidence accumulates.

Each addition gets back-applied to prior decisions in this folder. If a back-application changes a fate decision, that decision is re-opened.

### Documentation discipline

Every decision in §5–§6 cites the principle(s), axis (axes), trade-off(s), or anti-pattern(s) it invokes. The format is inline:

> **Fate: Keep + Rename. Confidence: HIGH.** Cites P5 (existing pages are evidence), A4 (discoverability — promote to sidebar), AP-clean across all 7. Default bias on T6 (visualisation vs row table) preserved.

This discipline is for the audit trail. Future PK in 6 months reading the decisions back should be able to reconstruct the reasoning without re-reading §1–§3.

---

## 4.6 Open Questions for §5–§6

Only questions that **genuinely block decision-making** AND **cannot be resolved from existing docs**. Questions already in §2 or §3 open-question lists are not duplicated here.

### Q1 — Trade-off default arbitration when two defaults pull opposite ways

T1 (consolidation) and T3 (simplicity) both apply to Inbox shape. Consolidation says "one Inbox, all exception types". Simplicity says "daily loop is a scannable list, not a multi-source firehose". When the two collide, which default wins?

**Why blocker.** Inbox is the canonical Stage 2 surface. §6 cannot fate `/compliance` Review Queue, `/visuals` format-advisor escalations, or future agent annotations into Inbox without resolving this.

**Cannot be resolved from existing docs because** the locked decisions in `00_overview.md` describe Inbox abstractly; §3 surfaced the tension; neither commits a default.

**Proposed resolution path.** PK direction in §5 conversation, OR a small §3-style scenario walk where 28-draft backlog + policy alert + format escalation all hit Inbox in the same hour and we trace the operator's actions.

### Q2 — Anti-pattern severity ordering for migration sequence

AP1–AP7 are all vetoes for new design. But the dashboard already triggers several of them today (AP1 at /compliance, AP2 at /failures, AP3 at requeue, AP6 at hardcoded clients, AP7 at pipeline-doctor). Which of these block the IA migration ship, and which are acceptable to ship-and-fix?

**Why blocker.** §10 (migration sequence) cannot order phases without knowing which anti-pattern instances must be fixed before v1 ships and which can carry forward into v1.x.

**Cannot be resolved from existing docs because** §3 flagged the gaps but did not order them by ship-blocking severity.

**Proposed resolution path.** §10 introduces a "ship blocker / ship-and-fix" tag per anti-pattern instance.

### Q3 — Migration cost veto threshold

A7 (migration cost) is a real veto when cost exceeds capacity. But "available capacity" is not defined in this folder. Is it: PK's available chat hours per week? Cowork's available autonomous-execution hours? An EF deploy budget? A schema-migration count?

**Why blocker.** §10 can only sequence phases if it knows the per-phase capacity envelope. Without it, A7 vetoes are arbitrary.

**Cannot be resolved from existing docs because** the closure-budget tracking in `docs/00_action_list.md` covers operator hours but not split by repo / surface / schema.

**Proposed resolution path.** PK direction in §10. Probable shape: "≤ N chat hours per phase + ≤ M migrations per phase + ≤ K EF deploys per phase".

### Q4 — Evidence threshold for principle invocation

When does a finding rise from "this is a fix item" to "this is a principle violation"? E.g. one cross-section handoff that's broken is a fix item. But the broken-handoff matrix in §3 has 6+ entries — is that pattern dense enough to invoke P3 (workflow continuity) as a principle for every §6 fate decision, or only when a specific handoff is in scope?

**Why blocker.** §6 fate decisions need to know whether to cite P3 against every cross-section handoff or only against specific egregious ones.

**Cannot be resolved from existing docs because** principles are introduced in this document for the first time.

**Proposed resolution path.** Default rule: cite a principle when the candidate decision *creates or preserves* a violation. Cite a fix item when the candidate decision is silent on an existing violation. Confirm with PK in §5.

### Q5 — Capacity reservation for anti-pattern remediation

P5 says existing pages are evidence, not sacred or disposable. But P5 + AP6 (hardcoded reference data) together imply some non-trivial work — NDIS+PP fields in `m.pipeline_health_log` schema is a migration; `MONITOR_TABS` removal spans 6 page files. Should §10 reserve a fixed proportion of migration capacity for anti-pattern remediation, or treat each as ad-hoc?

**Why blocker.** Without explicit reservation, anti-pattern work consistently loses to feature work. The dashboard ships v1 with AP6 still triggered.

**Cannot be resolved from existing docs because** §10 hasn't been written yet.

**Proposed resolution path.** Default rule: §10 reserves ≥ 25% of each phase's capacity for anti-pattern remediation; if reservation is unused in a phase, it carries forward to the next.

---

## Honest limitations

- The principles and anti-patterns are derived from a small set of source reads (12 routes from §2). New evidence from sources not yet read (`/inbox`, `/onboarding`, `/clients`, `/feeds`, `/connect`, `/costs`, `/system/subscriptions`, `/roadmap`) may surface a principle or anti-pattern not represented above. Re-evaluation triggers in §4.5 cover this.
- Default biases in §4.3 are operator-shoes assessments based on `userMemories` PK-style notes (terse, directive, prefers honest assessment). They should be confirmed in the §5 conversation.
- The framework assumes the locked IA in `00_overview.md` survives §5. If §5 IA Option Comparison surfaces a structurally different IA candidate worth considering, principles may need refinement to discriminate.
- Migration-cost axis (A7) is genuinely soft until Q3 (capacity envelope) is resolved.
- "Good enough to move forward" is intentionally permissive. It accepts up to 2 LOW axis scores per option. If §5 finds many candidate IAs all sitting at exactly 2 LOWs, the rule needs sharpening.
- The framework does not address Layer 2 (portal) decisions — those are §8. Several principles (P3 workflow continuity, P4 web-as-workspace) likely transfer; others (P6 cadence respect, P7 auto-action audit) may need adaptation.
- Anti-pattern severity ordering (Q2) is left unresolved here by design. Resolving it now would commit §10 work prematurely.
- The framework does not include a happiness or aesthetic axis. PK's expressed preference for clean visuals (kickoff Round 4) is implicit in "operator-first" but not explicit. Worth flagging in §5 if it bites.

---

*Created 2026-05-06 (Sydney). §4 of 11 in the dashboard architecture review (re-slotted from kickoff §3). Inputs: kickoff session record, `00_overview.md`, `01_current_state_inventory.md`, `02_target_ia_mapping.md`, `03_operator_workflow_map.md`. No new source reads this session. Next: §5 IA Option Comparison.*
