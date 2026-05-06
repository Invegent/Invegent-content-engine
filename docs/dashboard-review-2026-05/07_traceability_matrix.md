# §7 — Traceability Matrix

## Purpose

Verify that every meaningful item from §1–§6 has a clear lineage into the final design. Catch what was lost, what was accidentally introduced, and what was "partially handled" without being acknowledged. Flag weak linkages.

This is a verification layer, not a summary. Findings are flagged inline as **FLAG:** with severity. Residual risks are consolidated at the end.

## Method

- Cross-reference every item from §1 inventory + §2 corrections + §3 risks + §4 framework + §5 options + §6 design.
- Each item is marked: **FULLY RESOLVED / RESOLVED-WITH-BLOCKER / PARTIALLY RESOLVED / DEFERRED-WITH-REASON / UNRESOLVED-FLAG**.
- Items marked UNRESOLVED-FLAG indicate accidental loss or weak linkage — these are the verification's hard outputs.
- Confidence levels reflect linkage strength, not fate-decision correctness.

---

## 7.1 §1 → §6 lineage — routes

### Routes in current sidebar nav (16)

| §1 route | §1 description | Where addressed | §6 outcome | Linkage confidence |
|---|---|---|---|---|
| `/overview` | Operator Briefing — system status, drafts to review, open incidents, pipeline health, schedule, quick stats | §2 (Keep+Rebuild), §6.2, §6.3 | NOW > Daily > Overview with Brief block on top + agent status row | HIGH |
| `/inbox` | Draft review queue (source unread) | §2 (Keep), §6.2, §6.6 | NOW > Daily > Inbox; hybrid flat list + filter chips + bulk select | HIGH-with-caveat **FLAG (LOW): source unread; shape inferred** |
| `/queue` | Flat row table over `m.post_publish_queue`, status filters | §2 (Rename or Replace LOW conf), §5 Q3 → Replace, §6.5 | Replaced by NOW > Daily > Pipeline (state-machine view); row-level moves to Pipeline Log | HIGH |
| `/monitor` | Pipeline Flow Diagram, MONITOR_TABS, hardcoded CLIENT_TABS | §2, §6.2, §6.7 (AP5+AP6 ship-blockers) | NOW > Investigate > Flow; tabs removed; clients data-driven | HIGH |
| `/pipeline-log` | Tier 1 doctor + AI summary + health snapshots, hardcoded NDIS+PP cols | §2, §6.2, §6.7 (AP5+AP6+AP7 work) | NOW > Investigate > Pipeline Log; absorbs `/failures` dead items; severity ack column added | HIGH |
| `/diagnostics` | Tier 2 LLM diagnostic agent (daily) | §2 (Keep+Rename+Re-home), §6.2 | NOW > Investigate > Agents (seed; status MVP) | HIGH |
| `/failures` | Cross-table dead-letter view, read-only | §2 (Merge), §6.2, §6.8 | RETIRES; dead items surface in Pipeline Log + Inbox; route 301-redirects | HIGH |
| `/performance` | Engagement + Approval Patterns inner tabs | §2 (Split), §6.1 | REPORTS > Performance + REPORTS > Calibration as peer tabs | HIGH |
| `/costs` | AI cost tracking (source unread) | §2 (Keep+Rename), §6.1 | REPORTS > Costs | HIGH-fate, **FLAG (LOW): source unread; shape inferred** |
| `/compliance` | Review Queue + Rules inner tabs | §2 (Split), §6.1, §6.2 | Review queue items → NOW > Inbox; Rules → ADMIN > Compliance Rules | HIGH |
| `/content-studio` | single + series + analyse modes | §2 (Split), §6.1 | CREATE > Content Studio (single+series); ChannelSubscriptions → CLIENTS > Feeds | HIGH-fate, **FLAG (MEDIUM): ChannelSubscriptions source unread** |
| `/visuals` | Render Log + Format Advisor + Format Performance (observability-only) | §2 corrected §1 hypothesis, §6.2 | NOW > Investigate > Visual Pipeline; retry + override actions added | HIGH |
| `/clients` | Client list + summary cards (source unread) | §2 (Keep+Rename), §6.1 | CLIENTS > All Clients | HIGH-fate, **FLAG (LOW): source unread** |
| `/feeds` | Feed source management (source unread) | §2 (Keep), §6.1 | CLIENTS > Feeds; absorbs `ChannelSubscriptions` | HIGH-fate, **FLAG (LOW): source unread** |
| `/connect` | OAuth surface (D-YT-OAUTH-1) (source unread) | §2 (Keep), §6.1 | CLIENTS > Connect | HIGH-fate, **FLAG (LOW): source unread** |
| `/roadmap` | PHASES roadmap (source unread) | §2 (Defer Open Decision 4), §6.9 | ADMIN > Roadmap (read-only v1); Open Decision 4 deferred | DEFERRED |
| `/reviews` | External commit reviewer (Gemini + GPT-4.1) | §2 (Keep, Open Decision 3), §6.9 | ADMIN > Reviews; Open Decision 3 deferred | DEFERRED |
| `/system/subscriptions` | Subscription / billing config (source unread) | §2 (Keep+Rename+Flatten), §6.1, §6.8 | ADMIN > Subscriptions at `/subscriptions` | HIGH-fate, **FLAG (LOW): source unread** |
| `/system/formats` | Format library config; 17 ICE formats; format-advisor target | §2 (Keep+Rename+Flatten), §6.1, §6.8 | CREATE > Formats at `/formats` | HIGH |

### Routes that exist but are NOT in sidebar (4)

| §1 route | §1 description | Where addressed | §6 outcome | Linkage confidence |
|---|---|---|---|---|
| `/client-profile` | Single-client deep-dive `ClientProfileShell.tsx` | §2 (Keep), §6.1 | CLIENTS > [client] drill-down; no IA-level change | HIGH |
| `/drafts` | Older draft list, sidebar Inbox match covers it | §2 (Retire OR alias), §6.9 | Default: alias to `/inbox`; PK preference deferred | DEFERRED |
| `/onboarding` | Wizard, ~37KB, NOT linked from sidebar | §2 (Keep+Promote), §6.1, §6.8 | CLIENTS > Onboarding; sidebar entry added | HIGH-fate, **FLAG (LOW): source unread** |
| `/actions` | Server actions backing other pages (not a route) | §2 (n/a), §6 (n/a) | Backing logic; no IA change | HIGH (correctly out of scope) |

---

## 7.2 §1 → §6 lineage — overlaps and gaps

### §1 overlaps (7) + §2 newly-identified (2) = 9 total

| Overlap | Where addressed | §6 resolution | Status |
|---|---|---|---|
| 1. `/inbox` vs `/drafts` | §2, §6.9 | Default alias; PK preference deferred | DEFERRED |
| 2. `/overview` digest cards vs `/inbox` / `/queue` / `/failures` | §6.2, §6.4 | Overview keeps digest with inline approve; full surfaces live in target IA homes | FULLY RESOLVED |
| 3. `/monitor` / `/pipeline-log` / `/failures` / `/diagnostics` overlap | §2, §6.2 | Flow stays /monitor; Pipeline Log absorbs Failures; Diagnostics seeds Agents | FULLY RESOLVED |
| 4. `/performance` ops vs client | Open Decision 5 deferred to §8, §6.9 | Ops stays REPORTS; client view moves to portal | DEFERRED |
| 5. `/compliance` Review Queue vs Rules | §6.1, §6.2 | Review queue items → Inbox; Rules → ADMIN > Compliance Rules | FULLY RESOLVED |
| 6. `/visuals` creation vs log | §2 corrected §1 hypothesis | No split needed (visuals is observability-only) | FULLY RESOLVED |
| 7. `/reviews` vs `m.chatgpt_review` naming clash | §6.9 deferred | Naming clash deferred; `m.chatgpt_review` no surface v1 | DEFERRED |
| 8. (§2) Format Performance: `/performance` vs `/visuals` | §6.9 deferred | Both lenses retained: post-keyed in REPORTS Performance; format-keyed in NOW Visual Pipeline | DEFERRED |
| 9. (§2) `/reviews` vs `m.chatgpt_review` (cross-listing of #7) | duplicate | (same as 7) | (same) |

### §1 gaps (8) — things the locked IA needs that don't exist today

| Gap | Where addressed | §6 resolution | Status |
|---|---|---|---|
| 1. Brief surface | §6.3 | NOW > Daily > Overview top block; 3 sub-blocks (Alerts/Decisions/Summary); bounded ≤~250 words | RESOLVED-WITH-BLOCKER **(§6 Q1: content generation source TBD)** |
| 2. Telegram channel plumbing | §6.3 reserved; §7 (next section) commits design | Same content as web Brief; cron schedule TBD in next § | DEFERRED to §8 (next doc §) |
| 3. Agent status cards on Overview | §6.2 | NOW > Daily > Overview agent status row; per-agent | PARTIALLY RESOLVED **(component design TBD build)** |
| 4. INVESTIGATE > Agents section | §6.2 | NOW > Investigate > Agents seeded by /diagnostics | FULLY RESOLVED |
| 5. INVESTIGATE > Visual Pipeline | §6.2 | NOW > Investigate > Visual Pipeline | FULLY RESOLVED |
| 6. REPORTS > Calibration tab | §6.1 | REPORTS Calibration peer tab promoted from inner tab | FULLY RESOLVED |
| 7. CLIENTS > Onboarding promoted to nav | §6.1, §6.8 | Sidebar entry added under CLIENTS | FULLY RESOLVED |
| 8. EF Drift panel (F-EF-DRIFT-PREVENTION Stage 2b) | §6.9 deferred | Slot reserved under NOW > Investigate; placement (Pipeline Log sub-view vs own page) decided at Stage 2b implementation | DEFERRED-WITH-REASON |

---

## 7.3 §2 corrections propagation

Verify the 10 corrections §2 made to §1 inferences all reached §6.

| §2 correction | §6 propagation | Status |
|---|---|---|
| 1. `/visuals` is observability-only (not creation+log split) | §6.2 NOW > Visual Pipeline scope | PROPAGATED |
| 2. `/compliance` review queue is policy-change alerts (not draft flags) | §6.6 Inbox model item type `policy`; §6.2 escalation path | PROPAGATED |
| 3. `/performance` already has Calibration content as Approval Patterns inner tab | §6.1 REPORTS Calibration tab is a *promotion* not a build; §6.8 marked accordingly | PROPAGATED |
| 4. `/diagnostics` is Tier 2 LLM agent (daily) | §6.2 NOW > Investigate > Agents seed | PROPAGATED |
| 5. `/pipeline-log` is Tier 1 doctor + summary + snapshots | §6.2 NOW > Investigate > Pipeline Log; ack column for doctor events | PROPAGATED |
| 6. MONITOR_TABS hidden coupling across 6 pages | §6.7 AP5 ship-blocker; §6.8 Phase 1 | PROPAGATED |
| 7. `/failures` has no requeue button (§1 was wrong) | §6.2.c Action Layer requeue is the canonical resolution | PROPAGATED |
| 8. `/content-studio` 3 modes; analyse mode mis-homed | §6.1 ChannelSubscriptions → CLIENTS > Feeds | PROPAGATED-WITH-FLAG (source unread) |
| 9. Hardcoded NDIS+PP at schema and UI level | §6.7 AP6 ship-blocker; schema migration in §6.8 Phase 1 | PROPAGATED |
| 10. `/system/formats` configures format-advisor agent | §6.1 CREATE > Formats; §6.2 link from format-advisor decisions | PROPAGATED |

All §2 corrections propagated. No silent loss.

---

## 7.4 Anti-pattern traceability (AP1–AP7)

For each: where it existed, where identified, how §6 resolves it, residual risk.

### AP1 — Two products in one page

- **Where existed.** `/compliance` (Review Queue + Rules inner tabs); `/performance` (Engagement + Approval Patterns inner tabs).
- **Where identified.** §1 overlap 5; §4.4 AP1; §6.7.
- **§6 resolution.** Compliance splits into Inbox items + ADMIN > Compliance Rules. Performance splits into REPORTS > Performance + REPORTS > Calibration. Each NOW page has single-product purpose stated explicitly. Bonus AP "Brief-as-firehose" bounds Brief.
- **Status.** RESOLVED-WITH-RESIDUAL-RISK.
- **Residual risk.** **FLAG (MEDIUM):** NOW with 7 nav items + Brief block on Overview risks AP1 at *section* level (NOW does too many things; Overview accumulates Brief + 7 zones). §6.7 enforces page-H1 match purpose but section-level discipline is implicit.

### AP2 — Observability without action

- **Where existed.** `/failures` (read-only); `/diagnostics` recommendations (read-only); `/visuals` Render Log (no retry); REPORTS Calibration gate-failure breakdown (no click-through to draft).
- **Where identified.** §3 rows 16, 17, 18, 32, 34; §4.1 P2; §4.4 AP2; §6.7.
- **§6 resolution.** §6.2.c Action Layer specifies action per surface: requeue (Pipeline + Pipeline Log + Inbox), retry (Visual Pipeline), acknowledge (Pipeline Log doctor events), inline rule update (Inbox), override format (Visual Pipeline), inline reconnect (Overview), bulk approve (Inbox). §6.4 Calibration→Inbox click-through committed.
- **Status.** FULLY RESOLVED at design level; pending build.
- **Residual risk.** Build phase must hold the line. §6.7 enforcement requires "Key actions supported" listed on every new surface design review.

### AP3 — Hidden critical actions in SQL / chat

- **Where existed.** Requeue dead item; threshold tuning; close-the-loop UPDATEs to `m.chatgpt_review`; schema-level fixes for hardcoded data.
- **Where identified.** §3 row 22 CRITICAL; §4.1 P2; §4.4 AP3; §6.7.
- **§6 resolution.** Requeue UI shipped v1 (§6.2.c). Threshold tuning explicitly v2 per locked decision 3 — not a regression; explicit deferral. Schema-level fixes addressed via AP6 ship-blocker. Close-the-loop UPDATEs to `m.chatgpt_review` deferred to v2 surface (DEFERRED in §6.9).
- **Status.** RESOLVED for ship-blocker actions; PARTIALLY RESOLVED for v2-deferred items.
- **Residual risk.** **FLAG (MEDIUM):** Threshold tuning, calibration UI, agent simulator remain SQL/chat-only per locked decision 3. Acceptable in MVP framing but the "AP3 is closed" claim is partial. This must not slip past the v2 boundary review.

### AP4 — Cross-section dependency without linkage

- **Where existed.** Inbox → ADMIN Compliance Rules (no pre-fill); REPORTS Calibration → failed draft (no link); INVESTIGATE Diagnostics → action (no link); ADMIN Reviews digest finding → commit / file (no link).
- **Where identified.** §3 handoff matrix (multiple HIGH); §4.1 P3; §4.4 AP4; §6.4 boundaries; §6.7.
- **§6 resolution.** §6.4 cross-section boundaries commit what crosses + with what context. Inbox→ADMIN Compliance Rules "Apply" with inline pre-fill. Calibration→Inbox click-through with filter pre-populated. Symptom-based routing from Overview cards.
- **Status.** RESOLVED-WITH-BLOCKER.
- **Residual risk.** **FLAG (HIGH):** AP4 prevention contingent on §6.10 Q3 (cross-section pre-fill mechanism). Without Q3 resolved, the Inbox→ADMIN handoff is the same broken pattern as today. ADMIN Reviews→commit linkage NOT addressed in §6 (small impact; flagged as OPEN in 7.9).

### AP5 — Section-tab coupling across IA-distant pages

- **Where existed.** `MONITOR_TABS` array hardcoded in 6 page files (`/monitor`, `/pipeline-log`, `/visuals`, `/compliance`, `/costs`, `/performance`).
- **Where identified.** §2 finding 6; §4.4 AP5; §6.7.
- **§6 resolution.** Ship-blocker. Phase 1 of §6.8 removes `MONITOR_TABS` from all 6 files. Replaced with NOW internal sub-group nav (Investigate group) for the four moved into NOW; removed entirely for the others.
- **Status.** RESOLVED at design level; pending build.
- **Residual risk.** **FLAG (MEDIUM):** Build coordination risk — partial removal could leave dead links. §6.8 acceptance check covers but is implicit; build phase 1 should explicitly verify no `MONITOR_TABS` references survive.

### AP6 — Hardcoded reference data in shipped code

- **Where existed.** `m.pipeline_health_log` schema columns (`ndis_published_today`, `pp_published_today`); `/monitor` `CLIENT_TABS` array; `/pipeline-log` UI columns and stat cards.
- **Where identified.** §2 finding 9; §4.4 AP6; §6.7.
- **§6 resolution.** Ship-blocker. Schema migration drops NDIS+PP columns (replaced with per-client JSONB or join). `CLIENT_TABS` data-driven from `c.client`. UI sweep planned in Phase 1.
- **Status.** RESOLVED at design level; pending build sweep.
- **Residual risk.** **FLAG (MEDIUM):** Per §6 honest limitations, additional hardcoded references may exist in component files (`@/components/clients/`, `@/components/overview/`) not inventoried. Phase 1 sweep covers but completeness depends on grep discipline.

### AP7 — Silent auto-actions without audit trail

- **Where existed.** Pipeline-doctor auto-fixes at :15 / :45 every 30 min — audit trail in `m.pipeline_doctor_log` exists but not surfaced.
- **Where identified.** §3 row 32 HIGH; §4.4 AP7; §6.7.
- **§6 resolution.** §6.2 NOW > Investigate > Pipeline Log surfaces doctor events. `m.pipeline_doctor_log` schema migration adds `severity` + `ack_at` columns. SEVERE fixes create Inbox ack items and block downstream movement on the affected row until acknowledged.
- **Status.** RESOLVED-WITH-BLOCKER.
- **Residual risk.** **FLAG (HIGH):** AP7 prevention contingent on §6.10 Q4 (severity threshold definition). Without Q4 resolved, the severity classifier in doctor EF is undefined and "silent for low-severity" persists. Drift-check sweeps (separate workstream behind S30) follow same pattern but their AP7 surface is deferred per §6.9.

### Bonus anti-patterns from §4.4

- **Brief-as-firehose.** §6.3 bounds Brief to 3 sub-blocks ≤~250 words. §6.7 enforcement.
- **Telegram-as-decision-channel.** §6.3 explicitly nudge-only. P4 honored.
- **Inbox-as-firehose.** §6.6 LOW severity excluded v1; 4 named item types only. New types require explicit design review per §6.7.

---

## 7.5 Workflow risk closure (§3 CRITICAL + HIGH)

Every CRITICAL and HIGH risk from §3's 38-row workflow table + handoff matrix.

### CRITICAL (1 row + 1 handoff)

| §3 risk | Original issue | §6 resolution | Status |
|---|---|---|---|
| Row 22 — Requeue dead item | No UI; SQL via chat only | §6.2.c Action Layer requeue at Pipeline state lane + Pipeline Log row + Inbox ack item | FULLY RESOLVED at design level; pending build |
| Handoff: Pipeline Log → Inbox dead-item action | Broken (no requeue affordance anywhere) | Same as above + §6.5 state-machine commits dead→prior-state transition with reason audit | FULLY RESOLVED at design level; pending build |

### HIGH (10 rows / handoffs)

| §3 risk | Original issue | §6 resolution | Status |
|---|---|---|---|
| Row 3 — Read narrative Brief | Surface entirely missing | §6.3 Brief block on NOW > Daily > Overview; 3 sub-blocks bounded | RESOLVED-WITH-BLOCKER **(Q1 content generation source)** |
| Row 4 — Glance at agent status row | Per-agent surface missing; today's `<PipelineHealthCard />` is single global health | §6.2 NOW > Daily > Overview agent status row + NOW > Investigate > Agents | PARTIALLY RESOLVED **(component design TBD build)** |
| Row 10 — Triage drafts in inbox (bulk + gate context) | Bulk approve missing; gate-failure context inline missing | §6.6 Inbox bulk select + filter chips + severity sort + bulk action bar | RESOLVED-WITH-BLOCKER **(Q5 bulk approve UX safety)** |
| Row 11 — Triage policy-change alerts (apply rule update inline) | One-click "apply suggested rule update" missing; manual paste required | §6.2 Inbox `policy` items with "Apply" inline rule editor; §6.4 NOW→ADMIN with pre-fill | RESOLVED-WITH-BLOCKER **(Q3 pre-fill mechanism)** |
| Row 15 — Pipeline Log NDIS+PP hardcoded cols | Schema-level + UI-level hardcoding | §6.7 AP6 ship-blocker; schema migration in §6.8 Phase 1 | FULLY RESOLVED at design level; pending build |
| Row 18 — Investigate dead-letter rows (no requeue) | Same as row 22 | §6.2.c requeue UI; `/failures` retires; dead items in Pipeline Log + Inbox | FULLY RESOLVED at design level; pending build |
| Row 19 — Drill into per-client state (no global switcher) | Per-page filtering only; no global pivot | §6.4 NOW↔CLIENTS supplementary boundary: click client name → drill-down. Global switcher deferred per §6.9 | PARTIALLY RESOLVED **(no global switcher v1; sufficient for solo operator)** |
| Row 32 — Pipeline-doctor trust-but-verify (override auto-fix) | Doctor silently auto-fixes; no operator review | §6.2 ack column; SEVERE fixes block until ack; Inbox ack items | RESOLVED-WITH-BLOCKER **(Q4 severity threshold)** |
| Handoff: NOW > Inbox → ADMIN > Compliance Rules | Broken (no pre-fill) | §6.4 NOW→ADMIN crosses with pre-fill | RESOLVED-WITH-BLOCKER **(Q3 mechanism)** |
| Handoff: NOW > Investigate > Agents → ADMIN > Compliance Rules | Broken (no link) | §6.2 Agent recommendations create Inbox items; from Inbox "Apply" flows to ADMIN with pre-fill | RESOLVED-WITH-BLOCKER **(Q3 mechanism)** |

### Special-attention items per PK direction

**Action gap.** Closed for v1 ship-blocker actions: requeue, retry, acknowledge, inline rule update, override format, inline reconnect, bulk approve. NOT closed for: threshold tuning, calibration UI, agent simulator (locked decision 3 → v2). The "action gap" claim of full closure is partial — see AP3 residual risk above.

**Requeue dead item.** Specifically called out by PK. FULLY RESOLVED at design level: surfaces at NOW > Daily > Pipeline (state lane), NOW > Investigate > Pipeline Log (forensic row), NOW > Daily > Inbox (operator-required ack item). Mechanic: confirm reason in modal → server action resets status per state-machine → audit row.

**Cross-page dead ends.** §3 handoff matrix listed broken transitions across multiple section boundaries. §6.4 commits boundaries with linkage. **HOWEVER:** all "crosses with pre-fill" outcomes are gated on §6.10 Q3 (cross-section pre-fill mechanism). If Q3 isn't resolved before Phase 4 of §6.8, the dead-end risk re-emerges. **FLAG (HIGH).**

---

## 7.6 Open question propagation

Every open question raised in §2–§6 — resolved, deferred, or remaining blocker.

### From §2 (6 open questions)

| OQ | Resolution path | Status |
|---|---|---|
| `/drafts` retire vs alias | §6.9 default alias | DEFERRED-WITH-REASON |
| `/diagnostics` survive vs fold | §6.2 seeds Agents | RESOLVED |
| `/failures` survive vs absorb | §6.2 retires; absorbs into Pipeline Log + Inbox | RESOLVED |
| Visuals split cleanly | §2 corrected (no split needed) | RESOLVED |
| `/reviews` vs `m.chatgpt_review` naming clash | §6.9 deferred | DEFERRED-WITH-REASON |
| EF Drift panel placement | §6.9 deferred | DEFERRED-WITH-REASON |

### From §3 (12 open questions)

| OQ | Resolution path | Status |
|---|---|---|
| Inbox shape (flat vs typed) | §5 Q1 → §6.6 hybrid | RESOLVED |
| Action gap prioritisation | §6.7 ship-blocker tags | RESOLVED |
| Overview Open-Incidents routing by symptom | §6.4 symptom-based routing | RESOLVED |
| Sidebar shape (global vs switcher) | §6.9 deferred (global v1) | DEFERRED-WITH-REASON |
| Pipeline Doctor auto-fix surfacing | §6.2 + §6.7 severity + ack | RESOLVED-WITH-BLOCKER (Q4) |
| Layer 1/2 boundary on Inbox | §6.9 deferred to §8 | DEFERRED-WITH-REASON |
| Cross-section handoff pre-fill | §6.4 commits pattern; §6.10 Q3 mechanism | RESOLVED-WITH-BLOCKER |
| Cadence-aware Brief | §6.3 Alerts sub-block includes cadence reminders | RESOLVED |
| Operator vs Admin role split | §6.9 deferred to v2 | DEFERRED-WITH-REASON |
| Symptom → Investigate-surface table | §6.4 partial; specific symptom routing TBD build | PARTIALLY RESOLVED **FLAG (MEDIUM): explicit symptom→surface table not committed in §6; build risk** |
| Workflow-step completeness pressure-test | §6 honest limitation; pressure-test pending | DEFERRED-WITH-REASON |
| Operator workflow re-slot (was §2 in kickoff, now §3) | §6 carries renumbering note | RESOLVED-PROCEDURAL |

### From §4 (5 open questions)

| OQ | Resolution path | Status |
|---|---|---|
| Trade-off arbitration (T1 vs T3 on Inbox) | §6.6 hybrid honors both defaults | RESOLVED |
| Anti-pattern severity ordering | §6.7 + §6.9 ship-blocker tags | RESOLVED |
| Migration cost veto threshold | §6.8 capacity envelope (8–12h / ≤3 mig / ≤2 page rewrites per phase) | RESOLVED-PROCEDURAL |
| Evidence threshold for principle invocation | Not explicitly resolved in §6; procedural rule from §4 stands | DEFERRED-WITH-REASON (no §6 commit needed) |
| Capacity reservation for AP remediation | §6.7 Phase 1 prioritises ship-blocker AP work | RESOLVED |

### From §5 (6 open questions)

| OQ | Resolution path | Status |
|---|---|---|
| NOW internal organisation | §6.2.a grouped sub-nav | RESOLVED |
| Brief surface scope | §6.3 top block | RESOLVED |
| Pipeline state-machine reframe | §6.5 replace | RESOLVED |
| Inbox shape | §6.6 hybrid | RESOLVED |
| Capacity envelope | §6.8 codified | RESOLVED |
| Anti-pattern severity ordering | §6.7 codified | RESOLVED |

### From §6 (5 build-blocker open questions)

| OQ | Status |
|---|---|
| Q1 Brief content generation source (LLM / templated / hybrid) | REMAINS BUILD-BLOCKER |
| Q2 Pipeline state derivation logic (server view vs client aggregation) | REMAINS BUILD-BLOCKER |
| Q3 Cross-section pre-fill mechanism | REMAINS BUILD-BLOCKER |
| Q4 Doctor severity thresholds | REMAINS BUILD-BLOCKER |
| Q5 Bulk approve UX safety | REMAINS BUILD-BLOCKER |

### Silent disappearances check

No open questions silently disappeared. All questions raised in §2–§6 have a documented resolution path or explicit deferral.

**FLAG (LOW):** Symptom → surface routing table from §3 OQ#10 was partially addressed in §6.4 but no explicit table was committed. Build risk: operator clicks Overview "Open incidents" card and lands on a generic destination rather than symptom-routed. Build phase to commit the routing table per Phase 1 of §6.8.

---

## 7.7 Decision consistency check

### Principles (P1–P7) honoured?

| Principle | §6 honor | Notes |
|---|---|---|
| P1 Operator-first | YES | §6 designed around §3 operator workflow stages; §6.6 Inbox model is operator-keyed not data-keyed |
| P2 Actionability over observability | YES | §6.2.c Action Layer + §6.7 AP2 enforcement |
| P3 Workflow continuity | CONTINGENT | §6.4 cross-section boundaries with linkage. **Contingent on §6.10 Q3 (pre-fill mechanism).** Without Q3, Inbox→ADMIN handoff is broken. |
| P4 Web is workspace, non-web is nudge | YES | §6.3 Telegram nudge only; web canonical. Locked decision 2 reaffirmed. |
| P5 Existing pages are evidence | YES | §6.1 keeps most pages with rename / reframe / refactor; §6.8 staged migration |
| P6 Cadence respect | YES | §6.1 NOW daily / REPORTS weekly / ADMIN monthly. Brief Alerts sub-block includes cadence reminders. |
| P7 Auto-actions auditable | CONTINGENT | §6.2 ack column; §6.7 enforcement. **Contingent on §6.10 Q4 (severity threshold).** Without Q4, low-severity doctor fixes still effectively silent. |

**FLAG (HIGH):** P3 + P7 honor are gated on Q3 + Q4 resolution. These are the largest §6 → §10 dependencies.

### Anti-patterns (AP1–AP7) avoided?

| AP | §6 avoidance | Notes |
|---|---|---|
| AP1 | YES-with-residual | NOW with 7 nav items + Brief on Overview risks AP1 at section level. Page-H1 enforcement covers per-page; section discipline implicit. |
| AP2 | YES | Action Layer + per-page "Key actions supported" enforcement |
| AP3 | YES-with-residual | v1 ship-blocker actions covered. Threshold tuning, calibration UI, simulator remain SQL-only per locked decision 3 (v2). |
| AP4 | CONTINGENT | Boundary commits with linkage; gated on Q3. |
| AP5 | YES | Ship-blocker; Phase 1. |
| AP6 | YES-with-residual | Schema + main UI hardcoding addressed; component-level grep depends on Phase 1 sweep discipline. |
| AP7 | CONTINGENT | Schema migration + ack column. Gated on Q4. |

**FLAG (HIGH):** AP4 and AP7 prevention is contingent on Q3 + Q4. AP3 and AP6 have residual risks that must not slip past v2 boundary.

### Tensions / violations

- **NOW with 7 items + Brief block** — risk of AP1 at section/Overview level. §6.7 enforcement is page-level; section-level not codified. **FLAG (MEDIUM).**
- **Brief surface scope vs Brief-as-firehose anti-pattern** — §6.3 bounds Brief to ~250 words and 3 sub-blocks. Build phase must hold the line. **FLAG (LOW).**
- **Inbox absorbing four item types** — risk of Inbox-as-firehose. §6.6 LOW severity excluded; type taxonomy fixed. Acceptable.
- **AP3 v2 deferral** — PK should not let v2 expand into a permanent dumping ground for SQL-only operations. **FLAG (MEDIUM): tracking discipline needed at v2 review.**
- **REPORTS Calibration tab as read-only** — honors locked decision 3 but operator may want a click-to-tune affordance. The lack of one is intentional MVP discipline; flag the temptation to add it ad-hoc. **FLAG (LOW).**

---

## 7.8 Residual risk register

Risks that exist after §6 ships. Sorted by category.

### Build-blockers (must resolve before §10 commits sequence)

| Risk | Why accepted | Where handled |
|---|---|---|
| Q1 Brief content generation source unresolved | Brief is reserved slot; design TBD | §8 (next doc) |
| Q2 Pipeline state derivation unresolved | Reversible; default = server view | Build Phase 2 |
| Q3 Cross-section pre-fill mechanism unresolved | AP4 + P3 prevention contingent | Build Phase 3 / 4 |
| Q4 Doctor severity threshold unresolved | AP7 + P7 prevention contingent | Build Phase 1 (schema migration) + Phase 3 (Inbox ack) |
| Q5 Bulk approve UX safety unresolved | F-AAP-NEEDS-REVIEW-BACKLOG (28 drafts) waiting | Build Phase 2 |

### Source-unread route assumptions (verification at build)

| Risk | Why accepted | Where handled |
|---|---|---|
| `/inbox` shape inferred | Source not read this review | Build Phase 2 reads source; reconcile fate if mismatch |
| `/onboarding` source unread (~37KB wizard) | Time-bounded review scope | Build Phase 4 nav promotion verifies |
| `/clients`, `/feeds`, `/connect`, `/costs`, `/system/subscriptions`, `/roadmap` source unread | Same | Build phase per route |
| `ChannelSubscriptions` (analyse mode) source unread | Time-bounded review scope | Build Phase 1 reads source; §6 fate (move to CLIENTS > Feeds) verifies |

### Deferred-with-reason items (carried forward)

| Item | Reason | Where handled |
|---|---|---|
| Reviews placement (Open Decision 3) | External clients not yet on; placement low-impact | Re-revisit at first external client onboard |
| Roadmap fate (Open Decision 4) | Editing remains chat+git; dashboard read-only sufficient | Re-revisit if dashboard becomes editing surface |
| Layer 1/2 boundary on Performance (Open Decision 5) | Portal split triggered by first external client | §8 |
| `/reviews` vs `m.chatgpt_review` naming clash | No surface for `m.chatgpt_review` v1 | Resolve when `m.chatgpt_review` surface ships |
| `/drafts` alias-vs-retire | Low cost; default alias | PK preference any time |
| Format Performance home overlap | Both lenses retained | Re-revisit if operator confusion reported |
| Calibration UI / threshold tuning / agent simulator / agent profile pages / inline agent prompt editing | Locked decision 3 → v2 | v2 review |
| Sidebar search | Discoverability acceptable v1 | Re-evaluate if complaint surfaces |
| Brand/client switcher | Solo operator + 4 clients today | Re-evaluate at 5+ external clients |
| Email digest of Brief | Telegram + web cover v1 | v2 |
| Mobile inbox / voice approval | Locked decision 2 | Permanently out |
| Role-gated nav | Solo operator | Re-evaluate at 2nd human |
| `m.chatgpt_review` dashboard surface | No operator value today | v2 if needed |
| EF drift panel placement | Sequenced behind S30 + Stage 2b implementation | Stage 2b shipping |
| LOW-severity Inbox items | Inbox-as-firehose resistance | Re-evaluate if visibility complaint |
| Mixed-type bulk Inbox actions | v1 simplicity | v2 |

### Residual technical risks

| Risk | Why exists | Mitigation |
|---|---|---|
| `m.pipeline_health_log` schema migration data preservation | Live cron writes; UI consumers; no rollback | Test in non-production first; staged migration; column rename + dual-write before drop |
| `/queue` → NOW > Pipeline rebuild breaks existing route | URL change | 301-redirect from `/queue`; backlinks updated |
| `MONITOR_TABS` removal coordination across 6 files | Touch surface large | Phase 1 build acceptance: zero `MONITOR_TABS` references survive |
| Inbox absorption requires `/api/compliance` endpoint adapter | Existing PATCH endpoint returns review queue items shape | Adapter built in Phase 2 OR endpoint extended |
| Brief surface unproven design (§5 product risk) | Misfire fallback = existing zones, sunk effort | Stage Brief as separate sub-phase with explicit go/no-go gate |
| AP6 sweep completeness depends on grep discipline | Component files not inventoried in this review | Phase 1 sweep + acceptance check |
| NOW with 7 nav items section-level AP1 risk | Section discipline implicit | §6.7 page-H1 enforcement covers per-page; section design review at Phase 1 |
| Symptom → surface routing table not explicitly committed in §6 | Build risk for Overview card click destinations | Build Phase 1 commits routing |
| Cowork integration with Brief generation | Cowork is parallel automation, not operator surface | Out of §6 scope; revisit if Cowork role expands |
| Layer 2 (portal) considerations not in this review | §8 work | §8 |
| AP3 v2 deferral discipline | Threshold tuning + calibration UI + simulator remain SQL-only per locked decision 3 | v2 review must not let SQL-only persist; tracking commitment in v2 retro |

### Other items

- **Operator workflow pressure-test against PK's actual rhythm.** §6 is constructed from source reads + memory + kickoff context; PK's daily/weekly rhythm has not been shadowed. Pressure-test pending. **FLAG (LOW).**
- **Component-level fate** (within `app/(dashboard)/components/` and `components/`) not addressed in §6. Build phase per surface.
- **API routes** (`/api/run-digest`, `/api/compliance`, `/api/diagnostics`) noted but not read. Build phase verifies.
- **Edge Functions** backing the agents not inventoried this review. §6 fate assumes existing functionality survives migration.

---

## 7.9 Consolidated FLAG list

All inline **FLAG** markers from above, ordered by severity.

### HIGH severity

1. **AP4 prevention contingent on Q3** (cross-section pre-fill mechanism). Without Q3 resolved before Phase 4, Inbox→ADMIN handoff is the same broken pattern as today. P3 honor is conditional.
2. **AP7 prevention contingent on Q4** (doctor severity threshold). Without Q4 resolved, low-severity doctor fixes effectively silent. P7 honor is conditional.
3. **Cross-page dead-end risk re-emerges if Q3 isn't resolved before Phase 4.** Special-attention item per PK direction.

### MEDIUM severity

4. **AP1 at NOW section level.** 7 nav items + Brief block on Overview risks the anti-pattern at section level even though page-level discipline is enforced.
5. **AP3 residual.** Threshold tuning, calibration UI, simulator remain SQL-only per locked decision 3 (v2). "AP3 closed" claim is partial.
6. **AP5 build coordination.** Partial `MONITOR_TABS` removal could leave dead links. Phase 1 acceptance check covers but is implicit.
7. **AP6 sweep completeness.** Component-level files not inventoried; grep discipline gates completeness.
8. **`/content-studio` analyse-mode (`ChannelSubscriptions`) source unread.** Move to CLIENTS > Feeds is HIGH-fate but mechanism unread.
9. **Symptom → surface routing table not explicitly committed.** §3 OQ#10 partially addressed; build phase must commit.
10. **AP3 v2 deferral discipline.** v2 review must not let SQL-only persist as a dumping ground.

### LOW severity

11. **`/inbox` source unread.** Shape inferred from sidebar + kickoff context. Build verifies.
12. **`/onboarding`, `/clients`, `/feeds`, `/connect`, `/costs`, `/system/subscriptions`, `/roadmap` source unread.** Fate HIGH-confidence; shape work pending build.
13. **REPORTS Calibration tab as read-only** — intentional MVP discipline; flag temptation to add tune-from-here affordances ad-hoc.
14. **Brief surface scope discipline** — §6.3 bounds at ~250 words / 3 sub-blocks; build must hold the line.
15. **Operator workflow pressure-test against PK's actual rhythm not done.** §6 is constructed from source + memory + context.

---

## 7.10 Honest limitations of this verification

- The traceability table covers the 22 routes in §1 inventory + 9 overlaps + 8 gaps + 10 §2 corrections + 38-row §3 workflow + 7 anti-patterns + 7 principles + open questions across §2–§6. Items below the meaningful threshold (e.g. `/actions` server actions; mcp-consent route; `app/page.tsx` redirect) are noted but not traced row-by-row.
- Confidence levels in 7.1 are linkage strength assessments, NOT fate-decision correctness. A HIGH-confidence-fate row may still be wrong if the underlying source read missed something; only the linkage from §1 to §6 is verified.
- This verification was performed by the same author who wrote §2–§6, which biases against catching "the author missed something" errors. Independent review (e.g. ChatGPT cross-check via D-01 if PK chooses) would catch additional gaps.
- Component-level traceability (within `components/` and `app/(dashboard)/components/`) is not addressed. §6 fate decisions operate at the route/page level.
- Edge Function traceability is not addressed. The agents (auto-approver, format-advisor, compliance-reviewer, ai-diagnostic, pipeline-doctor, ai-worker, etc.) are referenced by behaviour, not by EF source review.
- Cowork traceability is not addressed — Cowork is parallel automation infrastructure, not an operator surface. If Cowork's role expands to feed Brief or to perform operator actions, traceability scope expands.
- Portal repo (`invegent-portal`) traceability is deferred to §8. Layer 1/2 boundary work may surface routes that should have been considered here.
- Risk severity assessments (HIGH / MEDIUM / LOW) in the FLAG list are author-shoes calibrations, not derived from a quantitative rubric. §4 explicitly accepts this for axis scoring; the same caveat applies here.
- The `m.pipeline_doctor_log` schema currently lacks `severity` — §6.10 Q4 commits to adding it. This document treats Q4 as build-blocker; if the schema migration falls outside Phase 1, AP7 + P7 honor degrades silently. §10 should explicitly bind Q4 resolution to Phase 1.
- The `m.chatgpt_review` records (D-01 audit trail per `userMemories`) have no dashboard surface in v1 and no direct verification target. They live in SQL queries only; if a v2 surface is added, naming-clash risk vs `/reviews` re-emerges.
- This document does NOT propose new design decisions. Where verification surfaces a gap, the gap is FLAGGED but not closed in this section.

---

*Created 2026-05-06 (Sydney). §7 of 11 in the dashboard architecture review. Inputs: kickoff session record, `00_overview.md`, `01_current_state_inventory.md`, `02_target_ia_mapping.md`, `03_operator_workflow_map.md`, `04_decision_criteria.md`, `05_ia_option_comparison.md`, `06_final_target_design.md`. No new source reads this session. Findings: 0 silent disappearances; 5 build-blocker open questions remain; 15 FLAGs (3 HIGH / 7 MEDIUM / 5 LOW) consolidated for §10 attention. All §2 corrections propagated. All §1 routes traced. Next: §8 Brief + Telegram channel plan (carrying Brief Q1 forward).*
