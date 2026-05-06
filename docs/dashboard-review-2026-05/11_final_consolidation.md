# §11 — Final Consolidation

## Purpose

Closure document for the Dashboard Architecture Review of 2026-05.

This is consolidation, not new thinking. No new concepts; no new structures; no new ideas. Pulls together locked decisions, deferred items, build-blockers, and residual risks from §1–§10 into a single execution checklist + closure record.

---

## 11.1 Final Section Structure (authoritative)

The review actually shipped these 11 sections, in order:

| § | Title | Filename | Purpose |
|---|---|---|---|
| 1 | Current State Inventory | `01_current_state_inventory.md` | 22 routes + 7 overlaps + 8 gaps; foundation for all subsequent reasoning |
| 2 | Target IA Mapping | `02_target_ia_mapping.md` | Per-route fate decisions; 10 corrections to §1 inferences |
| 3 | Operator Workflow Map | `03_operator_workflow_map.md` | 38-row workflow + 14-row handoff matrix + 16 missing affordances; CRITICAL gap surfaced |
| 4 | Decision Criteria | `04_decision_criteria.md` | 7 principles (P1–P7) + 7 axes (A1–A7) + 6 trade-offs + 7 anti-patterns (AP1–AP7) |
| 5 | IA Option Comparison | `05_ia_option_comparison.md` | 3 options compared; **Option B** recommended and locked |
| 6 | Final Target Design | `06_final_target_design.md` | 5-section IA, NOW grouping, Action Layer, Inbox model, Pipeline state machine, Brief surface |
| 7 | Traceability Matrix | `07_traceability_matrix.md` | Verification layer; 0 silent disappearances; 15 FLAGs (3 HIGH / 7 MEDIUM / 5 LOW) |
| 8 | Brief and Comms Layer | `08_brief_and_comms_layer.md` | Brief content model (HYBRID), channel strategy, 5 anti-pattern protections, 8 failure modes |
| 9 | Implementation Plan | `09_implementation_plan.md` | 5 phases (0–4), ~44–54h total, migration risk table, rollback paths, dependencies |
| 10 | Product Objects and Data Model | `10_product_objects_and_data_model.md` | 6 primitives at contract level (no DDL); 8 must-lock-before-Phase-0 |
| 11 | Final Consolidation | `11_final_consolidation.md` | This doc |

### Renumbering note (acknowledged across the series)

The kickoff plan in `00_overview.md` listed a different section sequence:

| Kickoff plan | Actual outcome |
|---|---|
| §2 Operator workflow | Moved to §3 (§2 became target IA mapping) |
| §3 Decision criteria | Moved to §4 |
| §4 IA option comparison + §5 Recommended IA | Combined into §5 |
| §6 Page-by-page fate | Absorbed into §6 final design |
| §10 Migration sequence | Became §9 implementation plan |
| §10 (vacated slot) | Filled by product objects (this version's §10) |

Each affected doc carried a "Section-numbering note" callout explaining the local renumbering.

### What `00_overview.md` should reflect

`00_overview.md` was committed with the kickoff 11-section plan. It is now out-of-sync. Required updates (NOT applied in this turn per files-changed minimisation):

- Replace the kickoff 11-section table with the actual table in 11.1 above
- Note that 5 of the LOCKED decisions in `00_overview.md` ship as committed (5-section IA, web-as-workspace, agents-as-status-MVP, NOW with grouped sub-nav, etc.); these need no change
- Note that the 6 "deferred open decisions" listed in `00_overview.md` have outcomes now: 3 deferred-with-reason in v2, 3 resolved in §6–§10 (Pipeline reframe, Inbox shape, Brief surface scope)
- Add a top-banner pointer: "This review is COMPLETE. See `11_final_consolidation.md` for the execution checklist and closure record."

---

## 11.2 Locked Decisions (consolidated)

Every decision below is locked. Source citations point to the document where the lock was committed.

### IA structure (from §6)

- **5 top-level sections:** NOW + CLIENTS + CREATE + REPORTS + ADMIN
- **NOW internal grouping:** Daily (Overview, Inbox, Pipeline) + Investigate (Flow, Pipeline Log, Visual Pipeline, Agents)
- **Brief lives at NOW > Daily > Overview top block** — not a separate section, not a separate page
- **Pipeline replaces /queue** — state-machine swimlane view at NOW > Daily > Pipeline; row-level forensic at NOW > Investigate > Pipeline Log
- **/failures dissolves** — dead items surface in Pipeline Log + Inbox
- **/diagnostics seeds NOW > Investigate > Agents** — status MVP only, no calibration UI
- **Compliance / Performance / Visuals split decisions per §2** committed:
  - Compliance Review Queue → NOW > Inbox `policy` items; Compliance Rules → ADMIN > Compliance Rules
  - Performance Engagement → REPORTS > Performance; Approval Patterns → REPORTS > Calibration peer tab
  - Visuals stays as observability-only (no creation surface to split); becomes NOW > Investigate > Visual Pipeline
- **/onboarding promotes to CLIENTS sub-section nav**
- **/system/formats flattens to /formats** (CREATE > Formats)
- **/system/subscriptions flattens to /subscriptions** (ADMIN > Subscriptions)
- **ChannelSubscriptions moves to CLIENTS > Feeds** (was `/content-studio` analyse mode)

### NOW design (from §6.2)

- **7 NOW pages** with single-purpose definitions: Overview / Inbox / Pipeline / Flow / Pipeline Log / Visual Pipeline / Agents
- **Sub-nav ordering:** Daily group ordered by typical session sequence (entry → triage → release); Investigate group ordered by depth-of-dive (high-altitude → row-level → sub-system → meta)
- **Brief block on Overview is integrative narrative**, not a second product

### Action layer (from §6.2.c)

Seven actions ship in v1 with audit via `m.action_event`:

| Action | Surface |
|---|---|
| Requeue dead item | NOW > Daily > Pipeline + NOW > Investigate > Pipeline Log + Inbox ack item |
| Retry failed render | NOW > Investigate > Visual Pipeline |
| Acknowledge auto-fix | NOW > Investigate > Pipeline Log |
| Apply suggested rule update (inline pre-fill) | NOW > Daily > Inbox → ADMIN > Compliance Rules |
| Override format-advisor | NOW > Investigate > Visual Pipeline |
| Inline reconnect token | NOW > Daily > Overview banner → CLIENTS > Connect |
| Bulk approve / reject drafts | NOW > Daily > Inbox |

### Inbox model (from §6.6)

- **Hybrid flat list with filter chips** (All / Drafts / Policy / Format / Agent)
- **Severity DESC then age DESC** ordering (CRITICAL pinned at top)
- **Bulk select** for drafts only in v1; mixed-type bulk in v2
- **LOW severity excluded v1** to resist Inbox-as-firehose
- **4 item types** with type-specific inline action sets
- **Backed by `m.attention_item`** per §10.1

### Pipeline state model (from §6.5)

- **8 canonical states:** `pending_draft / drafting / needs_review / queued / publishing / published / failed / dead`
- **Source table mapping** specified per state
- **9-rule precedence** for derivation (dead wins, then published, etc.)
- **Edge cases resolved:** slot-driven v4 NULL `digest_item_id`, race conditions, multiple ai_jobs
- **Default implementation:** server-side view `m.vw_pipeline_state` (Q2 default; reversible to materialised view if perf inadequate)

### Brief system (from §8)

- **Brief is a decision surface, not a status surface** — inclusion test: operator must have to derive the conclusion from raw cards
- **HYBRID generation:** templated baseline + LLM enrichment with deterministic fallback
- **Three sub-blocks:** Alerts (max 3) / Decisions (max 2) / Summary (~80 words)
- **Hard caps:** ≤ ~250 words total; over-cap content dropped before persist
- **Salience formula:** `severity_weight × time_decay × novelty` with severity-escalation override on novelty
- **Web canonical** at NOW > Daily > Overview top block
- **Telegram nudge-only** — zero state-mutation endpoints, permanent ban on inline approvals/reactions
- **Email deferred** to v2
- **Daily 06:30 AEST scheduled generation** + cache-on-load (4h TTL) + CRITICAL emergence event-driven + manual refresh
- **Daily Telegram push 07:00 AEST** with quiet hours 22:00–06:00
- **8 deterministic failure modes** committed
- **5 anti-pattern protections:** firehose, Telegram-as-decision, duplicate-vs-Inbox/Overview, Brief-as-nicer-Overview, chronic-state suppression

### Product objects (from §10)

Six primitives at contract level:

| Primitive | Type | Purpose |
|---|---|---|
| `m.attention_item` | NEW table | Inbox source-of-truth + Brief Alert candidate pool |
| `m.vw_pipeline_state` | View | Canonical state derivation |
| `m.vw_agent_status` | View (default) | Per-agent canonical health |
| Scope primitive | jsonb shape | Multi-tenant readiness |
| `m.brief` | NEW table | Brief storage, 30-day rolling |
| `m.action_event` | NEW table (single, with type discriminator) | Audit for all 6 v1 operator actions |

Locked attribute counts: 18 v1-required on `m.attention_item`, 13 on `m.vw_pipeline_state`, 15 on `m.vw_agent_status`, 14 on `m.brief`, 17 universal + per-action specifics on `m.action_event`.

### Anti-pattern enforcement (from §6.7 + §8.6)

- **AP3 ship-blocker** (hidden critical actions in SQL): Phase 1 closes via Action Layer requeue UI
- **AP5 ship-blocker** (section-tab coupling): Phase 1 removes `MONITOR_TABS` across 6 files
- **AP6 ship-blocker** (hardcoded reference data): Phase 1 UI sweep + Phase 4 NDIS+PP column drop
- **AP1 / AP2 / AP4 / AP7 ship-and-fix per surface:** each new surface requires the discipline check at design review
- **5 bonus anti-patterns** from §8.6 (Brief-as-firehose, Telegram-as-decision, duplicate-vs-Inbox, Brief-as-nicer-Overview, chronic-state suppression) enforced at Brief generation function

### Implementation discipline (from §9)

- **5 phases** (0–4) totalling ~44–54 chat hours / 5–9 weeks elapsed at 2–3 sessions/week
- **Capacity envelope per phase:** ≤12 chat hours / ≤3 migrations / ≤2 page rewrites
- **No operator workflow break mid-phase**
- **Old surfaces remain reachable until new surfaces prove themselves** (1-week soft launch before redirect)
- **Action layer ships before old paths retire**
- **Schema migrations are dual-write before drop** (4+ week dual-write window for irreversible operations)
- **D-01 ChatGPT MCP review on every production patch** per `userMemories`
- **Lesson #61 P1–P5 pre-flight before any production DDL/DML** per `userMemories`
- **D-170 `apply_migration` path** — CC writes file, chat applies, PK approves
- **Standing don't-redeploy:** heygen-creator / heygen-poller / draft-notifier per `userMemories`
- **Each phase has a defined rollback path** — irreversible operations happen LAST in their phase

---

## 11.3 Deferred Decisions (clean list)

Grouped by reconsideration timing. Items locked OUT permanently are listed separately.

### v1.1 — small refinements after v1 stabilises

Reconsidered after first 4–8 weeks of v1 production operation.

- `/drafts` retire vs alias — default alias to `/inbox`; PK preference can switch
- LOW-severity Inbox items — excluded v1; reconsider if visibility complaint surfaces
- Q3 cross-section pre-fill mechanism — default query string params; iterate if URL length limits hit
- Symptom → surface routing table refinement — build phase commits initial table per §7 FLAG #9
- Brief salience weight tuning — PK sample-reads first 2 weeks; weights adjusted from feedback
- Doctor severity threshold tuning — default classifier ships safe; tune from real data
- Format Performance home overlap — retain both lenses (REPORTS + Visual Pipeline); reconsider if confusion reported
- Operator workflow pressure-test refinements — §6 honest limitation; pressure-test against PK's actual rhythm
- Mixed-type bulk Inbox actions — v1 = drafts only; reconsider if mixed-type backlogs accumulate
- Per-request LLM override on Brief — reconsider if cost or quality reason emerges

### v2 — multi-client portal era

Reconsidered when first external client onboards.

- Layer 1/2 boundary on Performance (Open Decision 5) — ops Performance carve-out from client Performance
- Email digest of Brief — weekly client digest becomes real product surface
- Multi-client per-client Brief scope — `m.brief.scope` reserved column populated
- Calibration UI / threshold tuning UI — locked decision 3 v2
- Agent simulator — v2
- Agent profile pages — v2
- Inline agent prompt editing — v2
- `m.chatgpt_review` dashboard surface — v2 if needed
- Brand/client switcher in sidebar — reconsider at 5+ external clients
- Role-gated nav (operator vs admin) — reconsider at 2nd human in loop
- Multi-operator Telegram routing — v2 if applicable
- Brief long-term audit retention — 30-day v1; longer if external client compliance demands
- `client:<slug>` assignee on `m.attention_item` — schema reserved; populated v2
- `external_review` and `client_request` types on `m.attention_item` — reserved v2
- Reviews placement (Open Decision 3) — ADMIN v1; reconsider when external clients arrive
- Roadmap fate (Open Decision 4) — read-only viewer v1; reconsider if dashboard becomes editing surface
- `/reviews` vs `m.chatgpt_review` naming clash — resolve when surface ships

### Future — no committed timeline

Reconsidered if specific trigger fires.

- Sidebar search — trigger: discoverability complaint at scale
- Localisation / time-zone handling — trigger: multi-timezone operators
- Per-client retention policy on `m.brief` — trigger: external client compliance audit
- EF drift panel placement — trigger: F-EF-DRIFT-PREVENTION Stage 2b ships; slot reserved under NOW > Investigate per §6.9
- Component-level fate (within `components/`) — trigger: Phase 1 + Phase 4 sweeps surface specific items
- Cowork integration with Brief generation — trigger: Cowork's role expands beyond parallel automation
- API route review (`/api/run-digest`, `/api/compliance`, `/api/diagnostics`) — trigger: refactor demand
- Edge Function inventory — trigger: agent fate uncertain

### Permanently locked OUT

These will not be reconsidered absent new constraint:

- Mobile inbox — locked decision 2
- Voice approval — locked decision 2
- Two-way Telegram (acknowledge / approve via bot reply) — §8 anti-pattern protection
- Telegram bot reply parsing — §8 channel strategy

---

## 11.4 Build-Blockers (final execution checklist)

Execution checklist for PK before Phase 0 starts. Hard blockers will not start the phase; confirmation blockers have defaults that PK can accept or override.

### Hard blockers (Phase 0 will not start until cleared)

| # | Item | Source | Owner |
|---|---|---|---|
| 1 | S30 hold-state cleared (natural drift-check fire 17:00 UTC + verification + PK explicit go) | `userMemories` v2.45 | PK |
| 2 | M5–M8 queue integrity migrations reconciled with `m.vw_pipeline_state` view definition (sequence M5–M8 first OR confirm view safe to build now) | §9.11 | PK |

### Phase 0 confirmation blockers (defaults exist; PK confirm or override)

| # | Item | Default | Source |
|---|---|---|---|
| 3 | `m.attention_item` is NEW TABLE (not view union) | NEW TABLE | §10.7 |
| 4 | `m.attention_item` Phase 0 backfill from existing sources (drafts + policy items) | YES, idempotent via natural key | §10.7 |
| 5 | `m.action_event` is SINGLE TABLE with type discriminator | SINGLE TABLE | §10.7 |
| 6 | Agent status is VIEW (`m.vw_agent_status`) v1 | VIEW; materialise only if perf demands | §10.7 |
| 7 | `m.brief` final schema per §10.5 | This schema | §10.7 |
| 8 | Scope is `jsonb` column with documented shape | YES, jsonb | §10.7 |
| 9 | Polymorphic source reference is `source_table` + `source_id` (no DB FK) | YES | §10.7 |

### Phase 1 confirmation blockers

| # | Item | Default | Source |
|---|---|---|---|
| 10 | Q4 doctor severity threshold | info / warning / severe (severe = ack required) | §6.10 Q4 |
| 11 | Telegram bot infrastructure | Provision new via @BotFather; bot token in Vercel env | §8.8 Q1 |
| 12 | Operator scheduled-push time | 07:00 AEST | §8.8 Q3 |

### Phase 2 confirmation blockers

| # | Item | Default | Source |
|---|---|---|---|
| 13 | Q5 bulk approve UX safety | Confirmation modal listing HARD_BLOCK / WARN flags + per-draft opt-out + 10s undo | §6.10 Q5 |

### Phase 3 confirmation blockers

| # | Item | Default | Source |
|---|---|---|---|
| 14 | Q3 cross-section pre-fill mechanism | Query string params (URL-encoded JSON for long payloads) | §6.10 Q3 |
| 15 | `m.brief` schema + retention | Schema spec'd in §8.8 + 30-day rolling | §8.8 Q2 |
| 16 | LLM choice for Brief enrichment | Claude API with OpenAI fallback + templated ultimate failsoft | §8.8 Q4 |
| 17 | Multi-client scope | v1 = global only; `scope` column reserved for v2 | §8.8 Q5 |

### Phase 4 has no new blockers

Independent gates: 4+ week dual-write window stability for column drop; PK approval for irreversible operations.

---

## 11.5 Risk Summary (final)

Top residual risks after §6–§10 mitigations. Each carries existing mitigation; no new mitigations introduced here.

### Product risk — Brief is "a nicer version of Overview"

The critical instruction from PK across §8 + §10. Risk: Brief ships, operator opens Overview, sees a block of restated card content, dismisses Brief as noise.

**Mitigation in place:**
- §8.6 anti-pattern protection with explicit acceptance test ("could the operator have reached this conclusion in 5 seconds by glancing at cards?")
- §8.1 explicit exclusion list (status restatements, per-row event lists, telemetry without interpretation)
- §8.2 templated baseline forces salience scoring + cross-table inputs; LLM enrichment prompt explicitly excludes Overview-card-content restatements
- §9 Phase 3 ships templated baseline first; LLM enrichment in Phase 4 only after templated proves
- PK sample-reads first 2 weeks; salience weights tuned from feedback

**Residual:** Subjective judgement during first 2 weeks of production. Calibration mechanism is PK feedback.

### Migration risk — NDIS+PP column drop is irreversible

`m.pipeline_health_log` columns `ndis_published_today` + `pp_published_today` drop in Phase 4. Once dropped, recovery requires backup restore.

**Mitigation in place:**
- Phase 0 adds JSONB col additively; Phase 1 begins dual-write; Phase 2 cuts readers over; Phase 4 drops legacy cols (4+ week dual-write minimum)
- Telemetry verifies zero reads on legacy cols before drop
- Supabase Pro daily backup as ultimate fallback per `docs/05_risks.md`
- D-01 ChatGPT MCP review per migration
- Lesson #61 P1–P5 pre-flight per `userMemories`
- CI grep before DDL ensures no code references survive

**Residual:** Discipline required at the irreversibility boundary. §9.10 commits the staged sequence.

### Operator risk — bulk approve mass-violates HARD_BLOCK compliance

F-AAP-NEEDS-REVIEW-BACKLOG (28 drafts) is the use case Phase 2 closes. Risk: operator clicks "Approve N" without noticing HARD_BLOCK compliance flags on some drafts in the batch.

**Mitigation in place:**
- Q5 default UX: confirmation modal listing HARD_BLOCK / WARN compliance flags per affected draft
- Per-draft opt-out checkbox in modal
- 10-second undo affordance via toast + `m.action_event.undo_window_until`
- Audit trail: per-draft `m.action_event` row + batch summary row with `hard_block_override_count`
- Bulk select honours filter chip (e.g. selecting "all" with Drafts chip selects only drafts)

**Residual:** Operator can override compliance flags despite warning; audit catches but doesn't prevent. Acceptable v1; production telemetry monitors override rate.

### System complexity risk — 6 product primitives + 5 phases + 17 build-blockers

The review committed to a moderately complex data model and a phased build that spans 5–9 weeks of session work.

**Mitigation in place:**
- §9.1 capacity envelope discipline (≤12h / phase, ≤3 migrations, ≤2 page rewrites)
- §9.10 rollback paths defined per phase; irreversible operations LAST in their phase
- D-01 ChatGPT review every patch
- Documentation density at this level resists silent drift; §7 traceability matrix verifies no silent disappearances
- 5 build-blockers from §6.10 + 5 from §8.8 + 7 from §10.7 surfaced explicitly
- Phase 0 is read-only-safe groundwork; lowest-risk start

**Residual:** Documentation can itself become tech debt if not maintained. §9.14 honest limitations notes this. §6–§10 honest-limitations sections explicitly mark items requiring revisit.

---

## 11.6 What This System Now Is

ICE Dashboard is a single-operator workspace organised around one daily decision loop: Brief compresses 5 minutes of reasoning into 30 seconds; Inbox triages exceptions; Pipeline visualises lifecycle state; Investigate surfaces forensic detail when something breaks. Five sections (NOW / CLIENTS / CREATE / REPORTS / ADMIN) replace the previous eight, with NOW dominant via grouped sub-nav (Daily + Investigate). Every operator action that today requires SQL via chat — requeue, acknowledge, retry, bulk approve, inline rule update, override format — surfaces as audited UI through `m.action_event`. The web is canonical; Telegram is a nudge layer with zero state-mutation; email is deferred to v2. Five new product primitives (`m.attention_item`, `m.brief`, `m.action_event`, `m.vw_pipeline_state`, `m.vw_agent_status`) carry the scope primitive forward, making the v2 multi-client portal a policy migration rather than a schema rebuild.

---

## 11.7 Next Step

### Architecture review is COMPLETE

No further architecture work in this series. The 11 sections of `docs/dashboard-review-2026-05/` are the source of truth for design decisions, IA structure, build sequencing, and product object contracts.

### Next phase is implementation Phase 0

Phase 0 starts when:

1. **Hard blockers cleared** (11.4 items 1–2): S30 cleared + M5–M8 reconciled
2. **Phase 0 confirmation blockers acknowledged** (11.4 items 3–9): PK confirms defaults or proposes alternatives
3. **PK gives explicit go** to start Phase 0 work

Phase 0 deliverables (per §9.3): 3 migrations + JSONB additive col + 4 code inventory sweeps. Capacity ~7–9 chat hours. No UI changes. Operator daily session unchanged.

### When the architecture review can be reopened

No further architecture work unless one of these constraints emerges:

- **External client onboarding triggers Layer 1/2 portal split** — §8 reopens for email digest design, multi-client Brief scope, REPORTS Performance carve-out
- **A locked decision conflicts with build reality** — e.g. `m.vw_pipeline_state` perf inadequate → §10.2 reopens for materialised view design
- **Capacity reality differs significantly from estimate** — e.g. Phase 1 takes 25h instead of 14h → §9 phasing reopens
- **A new high-priority anti-pattern emerges in production** — e.g. operator overrides HARD_BLOCK at concerning rate → §6.7 + §8.6 reopen for additional protections
- **PK direction changes on a locked decision** — e.g. PK rejects HYBRID Brief generation in favor of templated-only → §8 reopens

Reopening triggers an isolated amendment doc (`docs/dashboard-review-2026-05/amendments/YYYY-MM-DD-{slug}.md`) rather than restarting the review. The 11 main docs remain the v1 record.

### Closure record

- Review started: kickoff session 2026-05-04 (`docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md`)
- Review committed: 2026-05-06 (Sydney) across 11 commits to main
- Review COMPLETE: 2026-05-06 with this document
- Total review effort: 11 sequential session turns from kickoff to closure
- Total docs: 12 (00_overview.md + 01_through_11_*)
- 0 silent disappearances per §7 verification
- 17 build-blockers itemised for PK execution checklist (11.4)
- 5 phases of implementation work await Phase 0 start gate

---

## Honest limitations of this consolidation

- This consolidation is reflective; §1–§10 are the source of truth. Any decision quoted here that conflicts with its source document is a transcription error in this doc, not a re-decision.
- 11.4 build-blockers list assumes PK works through items 3–17 with default-acceptance unless flagged. If PK rejects multiple defaults, phase capacity estimates in §9 may shift.
- 11.5 risks are top-tier only. §7 consolidated 15 FLAGs across HIGH / MEDIUM / LOW; §9.9 listed 14 migration risks. The full risk surface lives there.
- The 5–6 line system description in 11.6 is reductive by design. New operators or future-PK reviewers should read §6 + §10 for actual contract detail.
- `00_overview.md` 11-section table is still out-of-sync at the time of this commit. 11.1 specifies the required updates. PK applies separately or directs to apply.
- This document does not amend, correct, or revise §1–§10. If any §1–§10 content is found to be incorrect during Phase 0–4 build, the amendment-doc protocol from 11.7 applies.
- The COMPLETE marker is procedural; it does not foreclose discovery during build. The architecture review reopen triggers in 11.7 are real and documented; Phase 0–4 work is expected to surface at least one such trigger.

---

*Created 2026-05-06 (Sydney). §11 of 11 in the dashboard architecture review. Inputs: `00_overview.md`, `04_decision_criteria.md`, `06_final_target_design.md`, `08_brief_and_comms_layer.md`, `09_implementation_plan.md`, `10_product_objects_and_data_model.md`. No new concepts; no new structures; no new ideas. Locked decisions consolidated across IA / NOW / Action Layer / Inbox / Pipeline / Brief / product objects / anti-patterns / implementation discipline. 4 deferred-decision groups (v1.1 / v2 / future / permanently OUT). 17 build-blockers as execution checklist. 4 top-tier residual risks with mitigations cited. System described in 5 sentences. Architecture review **COMPLETE**.*
