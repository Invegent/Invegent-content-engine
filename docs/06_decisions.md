# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D100 — See earlier commits

## D101–D125 — See 16 Apr 2026 commits

## D126–D141 — See 17 Apr 2026 commits (pipeline analysis, synthesis decision, demand-aware seeding direction). **D141 sequencing recommendation reversed by D166 — see below.**

## D142–D146 — See 17 Apr 2026 afternoon commits (demand-aware seeder, classifier, router, benchmark, feed score — all but D142 gated on 60d data). **D144 MVP shadow infrastructure shipped via D167. D145 research portion shipped via D167.**

## D147–D151 — See 18 Apr 2026 afternoon commit (pilot structure, buyer-risk form, advisor layer, session-close SOP, table-purpose rule)

## D152–D155 — See 18 Apr 2026 evening commits (seeder client_id fix, token-health live direction, native LinkedIn flow, ON CONFLICT root-cause fix)

## D156–D162 — See 21 Apr 2026 commits (external reviewer layer shipped + paused, cost guardrails architecture, reviewer implementation details)

## D163–D168 — See 21–23 Apr 2026 commits (DLQ scoping, bundler dedup, bloat cleanup, router sequencing reversal, router MVP shadow infrastructure, ID004 sentinel scope)

## D170–D176 — See 26 Apr 2026 morning commits (slot-driven Phase A: MCP-applied migrations, pre-flight as gate, architectural revision authority, two-trigger chain, thin-pool signal, versioned ref FK pattern, state-change rollback discipline). **D170 has a full prose entry below — it is the most-cited operational decision in ICE.**

## D177–D182 — See 26–29 Apr 2026 commits (fitness scale, ai_job FK CASCADE, Stage 10/11 ordering, discovery decides assignment, audit loop architecture, non-blocking execution model). **D181 and D182 have full prose entries below.**

---

## D170 — MCP-applied migrations pattern (canonical DDL path)
**Date:** 26 April 2026 morning | **Status:** ✅ LOCKED — applies for all 19 stages of slot-driven build, all D182 briefs, all column-purpose work. Reinforced by every subsequent migration session.

### The problem this decides

Supabase CLI (`supabase db push`) was originally the canonical path for applying migrations. But the CLI tries to reconcile against migration history — and this project's history contains ~280 DB-only migrations applied directly to production via earlier workflows that didn't write a corresponding file to `supabase/migrations/`. The CLI sees a history with files it doesn't have records of, treats this as drift, and errors out before applying anything new.

The question this decision answers: what's the canonical path for applying migrations in this project, given that CLI is broken on this history?

### The decision

**Chat applies all migrations via the Supabase MCP `apply_migration` tool. CC drafts and pushes migration files to `supabase/migrations/`; chat applies them via MCP after pre-flight verification. The CLI is no longer used for production DDL on this project.**

### Why MCP over CLI

1. **MCP doesn't need to reconcile history.** It executes the SQL directly against the database; the migration file is a record artefact, not a reconciliation key.
2. **Explicit success/failure with full Postgres error context.** MCP returns `{success: true}` or the full error message; CLI swallows specifics inside its reconciliation logic.
3. **CLI's reconciliation step is the observed failure mode.** Trying to fix it = ~280 file backfills + ongoing risk of re-breakage. MCP avoids the entire failure surface.

### What this requires

- Every migration file must be idempotent or wrapped in a DO block with verification (matches Lesson #38: count-delta verification, not time-window).
- Pre-flight per D171 + Lesson #32 — query `k.vw_table_summary` (and any directly-touched tables) before authoring DML.
- Migration filename = draft timestamp; the apply-time version stamp in `supabase_migrations.schema_migrations` will differ. This is acceptable; Lesson #36 covers the rename pattern when filename hygiene matters.
- CC's role is bounded: draft + push to `supabase/migrations/` only. Apply is chat's responsibility because chat has live MCP access to the database while CC operates on the file tree.

### Related decisions

- **D171** — pre-flight schema verification per stage. D170 specifies how to apply; D171 specifies what to verify before applying.
- **D182** — non-blocking execution model. Tier 1+ briefs apply via D170 path (chat MCP); Tier 0 briefs don't touch the database at all.
- **Lesson #38** — count-delta verification beats time-window. Embedded in DO blocks under D170.

---

## D181 — Audit loop as three-layer architecture
*(unchanged — see prior commits for full text)*

## D182 — Non-blocking execution model (five-rule automation system)
*(unchanged — see prior commits for full text)*

## D183 — D182 v1 First-Run Learnings + Phase 4b/4c Deferral Principle
*(unchanged — see prior commits for full text)*

## D184 — Audit Workflow Automation Slicing (D181 + D182 Composition)
*(unchanged — see prior commits for full text)*

## D185 — RESERVED for `structured_red_team_review_v1` ratification
*(unchanged — see prior commits for full text)*

## D186 — Closure-First Discipline (Find/Fix Imbalance Constraint)
*(unchanged — see prior commits for full text. Full prose preserved in prior decision log.)*

---

## D-IOL-001 — Friction Register as Standing Infrastructure
**Date:** 18 May 2026 morning | **Status:** ✅ LOCKED — applies from this session forward. Replaces cc-0014 experimental framing.

### The problem this decides

cc-0014 was authored as a 14-day operational experiment: instrument a friction register with three emitters (reconciliation / health_check / manual FAB), run for 14 days, score five pre-locked criteria at Day 19, render PASS / FAIL / INVALID verdict. The register was framed as conditional infrastructure — useful if and only if it produced quality signal across multiple sources within the window.

By Day 4 of the window, three conditions emerged that the experimental framing did not anticipate:

1. **Manual FAB validated faster than the window required.** PK filed 3/3 in-window events by Day 3 and reported the workflow felt real and useful. Validation question on this source was empirically answered before 11 more days of window time could add anything.
2. **Reconciliation cadence was structurally insufficient.** cron 85 ran weekly, producing at most 2 fires in 14 days. Criterion 3 (≥2 sources × ≥3 events) was unachievable on this source within window length, regardless of register quality.
3. **Health_check produced zero signal.** Root cause was upstream (Cowork brief stuck at `status: review_required`), unrelated to register design. Diagnosis required, not verdict.

Day-19 verdict on this trajectory would have read INVALID due to insufficient signal density. That is a procedural verdict that does not inform whether the register concept is sound — it informs whether the upstream signal sources were correctly instrumented and cadenced.

The question this decision answers: should the register be treated as a thing-to-be-evaluated, or as a thing-to-be-operated?

### The decision

**The friction register is standing operational infrastructure, not an experiment. Verdict ritual is retired. The register runs continuously and improves continuously through signal-quality iteration, not through periodic re-evaluation.**

Specifically:

- cc-0014 closes at status=archived. Brief frozen. Postmortem authored per brief §14 commitment.
- The register's schema, triggers, emitters, FAB, and triage surface all remain live and unchanged.
- The register's *value* improves as more cases land, get worked, and the underlying system gets fixed. The register itself does not iterate; the system it diagnoses does.
- Three sources are treated as three independent diagnostic streams. Manual is proven. Recon and health_check require diagnostic follow-up (cadence change applied for recon this session; health_check diagnostic deferred).
- Pool review cadence proposed as Fridays 09:00 Sydney (per cc-0015 brief §G). Cases pooled, worked in sprints, fixed.

### What this changes

- **IOL hold-stance lifted.** Work previously deferred pending cc-0014 Day-19 verdict is now actionable in normal queue priority. This includes:
  - cc-0015 friction-pool-view brief execution (unblocked)
  - cc-0016 friction-capture-evidence brief execution (unblocked, parallel-executable with cc-0015)
  - Publisher recovery sequence (music / IG cron 53 / YT diagnostic)
  - Dashboard PHASES sync (now 30 consecutive deferrals; unblocked for next dashboard session)
  - Brief authoring for other initiatives (Platform Reconciliation View, etc.)
- **Reconciliation cron promoted weekly → daily** this session. Migration `cc_0014_recon_daily_cadence` applied. First daily fire 2026-05-19 03:30 AEST. Cadence change is independent of brief mechanics; it is operational infrastructure tuning.
- **Day-19 calendar item retired.** Mid-window check-in at Day 7 retired.

### What this does NOT change

- The register's schema, grants, RLS posture, triggers, and functions remain stable.
- ICE-PROC-001 D-01 cross-review discipline remains active for production mutations.
- D-186 closure-first discipline remains active. The friction register cases populating the backlog become subject to D-186's closure budget.
- No claim that the register is "validated" in the experimental sense. Manual is empirically proven. Recon and health_check remain diagnostic targets, not validated sources.
- `friction.experiment_run` row is preserved at status=archived as audit trail. criteria_snapshot remains immutable on the archived row. Future researchers reading this record can see what would have been scored had the window completed.

### Why archived (not passed/failed/invalid/superseded)

- **Not passed.** Criteria designed for Day-14 evaluation were not scored. Claiming pass would overclaim against the brief's own §11 criteria.
- **Not failed.** Window did not run to completion. Failure verdict implies the criteria were tested and not met — they were not tested.
- **Not invalid.** The instrument worked. emit_error rates negligible. Closure was operator-driven reframing, not instrument failure.
- **Not a new enum value (e.g. superseded).** Adding a new CHECK constraint value would require migration + downstream cascade review. The brief's existing `archived` enum value covers "closed, terminal, neutral" cases — the most honest fit available without schema change.

### What this requires

- Postmortem at `docs/postmortems/cc-0014-closing-note.md` (this session).
- Action_list and sync_state rebuilt to reflect lifted hold-stance (this session, v2.77).
- Memory edits to remove cc-0014-window references (this session).
- Future cc-NNNN that depend on the register cite this decision rather than re-relitigating the experimental framing.
- The register's standing diagnostic role is reflected in operational rituals (pool review session; friction-driven sprint planning).

### Sunset clause

None. This is a structural reframing, not a time-bounded constraint. If at any future point the register accumulates evidence that it is not earning its operational keep (e.g. cases sit untriaged for months, signal sources never produce after diagnostic attempts, operator stops using the FAB), that becomes its own decision needing its own number — not a reversal of D-IOL-001.

### Related decisions

- **D-186** — closure-first discipline. The register's pooled cases now feed D-186's 20-finding cap.
- **D-IOL-001 supersedes the cc-0014 Day-19 verdict commitment.** The brief's §14 commitments map onto follow-up work (cc-0015 / cc-0016 / health_check diagnostic / recon cadence change), but the verdict ritual itself is retired.
- **Brief cc-0014** — frozen at v1.1 commit `34305092f4`. Postmortem at `docs/postmortems/cc-0014-closing-note.md`.

---

## Decisions Pending

| Decision | Status | Gate |
|---|---|---|
| D143 — Signal content type classifier | 🔲 Gated | D142 stable + 60 days data |
| D144 — Signal router (platform × format) | 🟡 Superseded by slot-driven build (D170+); shadow infrastructure shipped via D167 retained as historical context | Slot-driven Phase D Stage 19 decommissions D144 router |
| D145 — Benchmark table | 🟡 Mix defaults shipped via D167 22 Apr; content_type × format benchmark still gated | D143 |
| D146 — Feed pipeline score + retirement | 🔲 Gated | Phase 2.1 + 60 days data |
| D140 — Digest item scoring | 🔲 Phase 3 | After CFW stable + auto-approver healthy |
| D149 — Advisor Layer MVP (Sales Advisor Project) | 🔲 Deferred post-sprint | Same rationale as D162 |
| D151 — Table purpose backlog sweep (22 rows) | ✅ SUPERSEDED — closed via F-2026-04-28-D-001 (registry now 100%) | — |
| D153 — Token-health live /debug_token cron | 🔲 Spec this week, build after | None — high priority |
| D156 Stage 2 — Meta reconciliation | 🔲 Post-sprint | Stage 1 verified earning its keep after reactivation |
| D157 — Cost guardrails Stop 2 infrastructure | 🔲 Post-sprint | ai-worker fix verified ✅ + sprint complete |
| D157 — Raise Anthropic cap to calibrated Stop 1 | 🔲 Week of 5 May | 7 days post-fix clean data + weekly calibration |
| D164 — Per-client canonical dedup window column | 🔲 When trigger fires | Vertical/cadence mismatch OR client request OR operator-suppression complaint |
| **D165 — M12 IG publisher platform-filter** | 🟡 Superseded by slot-driven Phase B (Stage 11 ai-worker refactor handles platform discipline at synthesis layer) | Slot-driven Phase C cutover phases out the legacy IG publisher path |
| **D165 — Cron failure-rate monitoring** | 🔲 Sprint item TBD | 2,258 silent failures over 8 days must not recur |
| **D166 — Router sequencing reversal** | ✅ APPLIED 22 Apr evening — superseded by slot-driven build (D170+) | — |
| **D167 — Router MVP shadow infrastructure** | ✅ APPLIED 22 Apr evening — preserved as shadow infrastructure; slot-driven Phase D decommissions | Phase D Stage 19 |
| **D168 — ID004 sentinel** | 🔲 Backlog A-item | Spec defined; implementation deferred |
| **D170 — MCP-applied migrations pattern** | ✅ LOCKED through Phase A+B7-9 + concrete-pipeline track; applies for all 19 stages; reinforced by D182 first run | — |
| **D171 — Pre-flight schema verification per stage** | ✅ LOCKED; sharpened by Lesson #32; reinforced by D182 brief pre-flight discipline | — |
| **D172 — Architectural revision authority** | ✅ LOCKED; R-A through R-E applied in Phase A | — |
| **D173 — Two-trigger chain pattern** | ✅ APPLIED Stage 3 | — |
| **D174 — Invegent thin-pool operational signal** | ✅ Observed; informs Phase E priority | Phase E content work |
| **D175 — Versioned reference table pattern** | ✅ APPLIED Stage 2.009 | Apply to future lookup tables referencing versioned sources |
| **D176 — State-change rollback discipline** | ✅ APPLIED Stage 5 | Build-stage pattern |
| **D177 — fitness_score_max scale 0..100** | ✅ APPLIED Stage 7.032 | Apply at every fitness consumer |
| **D178 — ai_job.slot_id FK = ON DELETE CASCADE** | ✅ APPLIED Stage 9.039 | — |
| **D179 — Stage 10/11 ordering: Option B** | ✅ LOCKED for Stage 10 brief | Stage 10 next session |
| **D180 — Discovery decides assignment, intelligence decides retention** | ✅ APPLIED via migration 006 trigger; backfill ran for 8 CFW seeds | Apply to any future discovery channel |
| **D181 — Audit loop as three-layer architecture** | ✅ BUILT — first cycle complete same day; slice 1 prevention live; D184 sequences Slice 2/3 | Apply to future audit roles when added |
| **D182 — Non-blocking execution model (five-rule system)** | ✅ LOCKED — v1 spec at `docs/runtime/automation_v1_spec.md` | — |
| **D183 — D182 v1 first-run learnings + Phase 4b/4c deferral** | ✅ LOCKED 30 Apr morning | — |
| **D184 — Audit workflow automation slicing** | ✅ LOCKED 30 Apr morning | — |
| **D185 — `structured_red_team_review_v1` ratification** | 🔲 RESERVED — gated on R10. Sunset 31 May 2026 if R10 hasn't completed | R10 outcome |
| **D186 — Closure-First Discipline (find/fix imbalance constraint)** | ✅ LOCKED 2 May late evening — 20-finding cap on P0+P1 + 4h/week closure floor + 2-week pause trigger on new automation. Sunset 30 June 2026 | Per-session check at session start |
| **D-IOL-001 — Friction Register as Standing Infrastructure** | ✅ LOCKED 18 May 2026 morning — cc-0014 reframed from experiment to standing infrastructure; IOL hold-stance lifted; verdict ritual retired. **Full prose entry above.** | None — structural reframing, no sunset |
| **Slot-driven Phase A** | ✅ COMPLETE 26 Apr morning | — |
| **Slot-driven Phase B Stages 7-9** | ✅ COMPLETE 26 Apr afternoon–evening | — |
| **Slot-driven Phase B Stages 10-12** | ✅ COMPLETE 27 Apr | — |
| **Gate B observation** | 🔄 IN PROGRESS — Day 1 healthy. Day 2 obs slipped 29 Apr; due 30 Apr. Earliest exit Sat 2 May | 5-7 days post-Stage 12 |
| **Concrete-pipeline track** | 🔄 IN PROGRESS — Discovery Stage 1.1 ✅, Publisher Stage 2.1 ✅, Brief A ✅, Brief 2 ✅. Stages 1.2-1.5 + 2.2-2.5 pending | Parallel to Gate B |
| **F-002 closure** | ✅ CLOSED-ACTION-TAKEN — P1 + P2 + P3 all applied 28 Apr same day. Phase D ARRAY mop-up applied 29 Apr via D182 first brief | — |
| **Phase D ARRAY mop-up** | ✅ CLOSED-ACTION-TAKEN 29 Apr — first D182 brief, applied via Supabase MCP, 5/5 thresholds | — |
| **6 LOW-row joint resolution session** | 🔲 Backlog | PK + chat session, ~30 min, likely synchronous |
| **Audit loop slice 2 (snapshot automation)** | ✅ FIRST RUN 30 Apr evening — 5/5 thresholds | — |
| **Audit loop slice 3 (API auditor pass via Cowork+OpenAI)** | 🔲 Deferred per D184 + D186 | After 5+ manual cycles AND closure-budget headroom |
| **B31 — Reconstruct auto-approver v1.6.0 EF source** | ✅ CLOSED-ACTION-TAKEN 2 May late evening | — |
| **B32 — Cooldown design decision** | ✅ CLOSED 2 May late evening — Path 3 chosen | — |
| **T08 — EF v1.6.0 deploy** | ✅ CLOSED-ACTION-TAKEN 2 May late evening via B31 | — |
| **F04 — post_render_log column-purposes migration** | 🔲 Pending chat apply per D170 | Chat apply at next session |
| **Slot-driven Phase C — Cutover (Stages 12-18)** | 🔲 After Gate B exit | Gate B exit |
| **Slot-driven Phase D Stage 19 decommission R6** | 🔲 After Phase C | All client-platforms cut over |
| **Slot-driven Phase E — Evergreen seeding** | 🔲 Parallel | Prioritise Invegent verticals per D174 |
| **Overload B of `create_feed_source_rss` cleanup** | 🔲 Backlog | Drop or fix in follow-up |
| **Feeds-tab URL clickability follow-up** | ✅ SHIPPED 28 Apr afternoon (Brief 2) | — |
| **cc-0014 Friction Register Capture Experiment** | ✅ CLOSED-ARCHIVED 18 May 2026 — postmortem at `docs/postmortems/cc-0014-closing-note.md`; reframed via D-IOL-001 | — |
| **cc-0015 Friction Pool View** | 🟢 AUTHORED, PENDING_EXECUTION — unblocked per D-IOL-001 | Normal queue priority |
| **cc-0016 Friction Capture Evidence** | 🟢 AUTHORED, PENDING_EXECUTION — unblocked per D-IOL-001, parallel-executable with cc-0015 | Normal queue priority |
| Inbox anomaly monitor | 🔲 Post-sprint | Separate brief TBW |
| Phase 2.1 — Insights-worker | 🔲 Next major build | Meta Standard Access |
| Phase 2.6 — Proof dashboard | 🔲 After Phase 2.1 | Engagement data |
| Solicitor engagement | 🔲 Parked per D147 + D156 refinement | First pilot revenue OR second pilot signed |
| Meta App Review | ⏳ In Review | Contact dev support if stuck after 27 Apr |
| CFW + Invegent content prompts | 🔲 A11b pre-sales | PK prompt-writing session Fri 24 Apr |
| TBC subscription costs | 🔲 A6 pre-sales | PK deferred until product evaluation complete |
| CFW profession fix | 🔲 Immediate | Change in Profile |
| Auto-approver target pass rate | 🔲 C1 | Single PK decision |
| Monitoring items A20–A22 (D155 follow-on) | 🔲 Sprint items | Sprint priority per D162 |
| Professional indemnity insurance | 🔲 Pre-pilot | Underwriting forces clarification |
| A27 — LLM-caller Edge Function audit (ID003 follow-on) | 🔲 After ai-worker fix establishes pattern | Pattern proven |
| **Reviewer role-library rebuild (post-D160)** | 🔲 Captured as brief with consumption-model addendum; execute when evidence justifies | 2+ weekly digests post-sprint + concrete use case for a role not in current library |
| **External reviewer resume** | 🔲 Paused per D162 | ~18-19 of 28 Section A items closed |
| **Per-commit reviewer iteration bug** | 🔲 Before reviewer resume | Add filter for per_commit_enabled or explicit reviewer_key IN list |
| **Phase 1.7 DLQ continuation — `m.post_publish_queue` CHECK** | 🔲 Backlog per D163 | Dedicated Phase 1.7 full-sprint session |
| **TPM saturation on concurrent rewrites** | 🔲 Brief parked per D163 | Pipeline resumes from drain + fresh digest fires through rewrite |
| **M8 Gate 4 — 24h regression check** | 🔲 23 Apr | Re-run regression query against runs > M8 merge timestamp |
| **Bundler dedup weekly regression check** | 🔲 Ongoing | Weekly Mon — query in D164 |
| **`instagram-publisher` exec_sql + raw interpolation** | 🔲 Folds into slot-driven Phase B Stage 11 ai-worker refactor | Stage 11 |
| **PP Schedule Facebook 6/5 over-tier-limit** | 🔲 Sprint item TBD | Surfaced in M5 verification |
| **Stage 12+ refinement: try_urgent_breaking_fills per-platform variance** | 🔲 After Gate B | — |
| **Branch sweep — invegent-content-engine + invegent-dashboard + invegent-portal (10 stale branches)** | 🔲 Backlog | content-engine 4, dashboard 5, portal 1 |
| **Phase B filename hygiene** | 🔲 Backlog | Rename per Lesson #36 |

*Note (2026-05-18): Full prose for D181–D186 preserved in commit history. This compaction is editorial only — content unchanged for prior decisions; only D-IOL-001 is new.*
