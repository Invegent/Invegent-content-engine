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

*(unchanged — full prose preserved in prior commit. See v2.77 sync_state for the full text.)*

---

## D-CC-0017B-Q1 — Severity override provenance lives in `dynamic_context`, NOT in `category_source`
**Date:** 18 May 2026 (cc-0017b authoring + apply) | **Status:** ✅ LOCKED — applies for all queries against `friction.event` from cc-0017b apply (2026-05-18) forward. Note added per brief cc-0017b v1.0 §7.

### The problem this decides

During cc-0017b authoring, a design question surfaced: should the `category_source` enum on `friction.event` include `'severity_override'` as a recognised provenance value, parallel to `'category_override'` / `'manual_at_capture'` / `'emitter_default'`?

The natural intuition is yes — symmetric naming makes both override types discoverable via a single column query. But this conflates two distinct concerns: **category source attribution** (which input determined the event's category) and **severity transformation audit** (which input determined the event's final severity, and what the rule-default severity was before the override).

### The decision

**Severity override provenance is stored EXCLUSIVELY in `friction.event.dynamic_context` under the JSONB key `severity_override` (with `applied` and `effective_was` sub-keys). The `category_source` column does NOT include `'severity_override'` as a value. The CHECK constraint on `category_source` explicitly excludes it.**

**Query pattern (canonical):**
```sql
-- To find emissions that had a severity override applied:
SELECT event_id, severity,
       dynamic_context -> 'severity_override' ->> 'applied'       AS override_severity,
       dynamic_context -> 'severity_override' ->> 'effective_was' AS rule_default_severity
FROM friction.event
WHERE dynamic_context ? 'severity_override';
```

**Anti-pattern (returns ZERO rows by design):**
```sql
-- DO NOT USE — this filter will return zero rows because
-- 'severity_override' is not a valid value for category_source.
SELECT * FROM friction.event WHERE category_source = 'severity_override';
```

### Why this asymmetric design

1. **`category_source` is single-valued and exclusive.** Each event has exactly one category source: `emitter_default`, `category_override`, or `manual_at_capture`. Adding `severity_override` would create category source ambiguity when an event has both a category override AND a severity override.
2. **Severity transformation has more state than a single enum value.** It captures both the applied severity AND the rule-default it overrode (`effective_was`). This is naturally a JSONB structure, not an enum value.
3. **`dynamic_context` is the designated audit channel for transformation provenance.** Both `severity_override` and `category_override` audit records live in this column; `category_source` is the FAST-PATH column for category provenance because category provenance is single-valued.
4. **Future-proofing.** If additional severity transformation modes are introduced (e.g. `severity_promoted_by_age`, `severity_capped_by_quota`), the JSONB schema absorbs them without further CHECK constraint changes.

### What this requires

- All dashboards, alerts, and analytical queries on severity override frequency MUST use the `dynamic_context ? 'severity_override'` filter pattern, not `category_source = 'severity_override'`.
- The `category_source` CHECK constraint (extended in cc-0017b Step 1) explicitly excludes `'severity_override'` as a value. This is deliberate, not an oversight.
- The wrapper functions (`fn_emit_manual_event`, `fn_emit_reconciliation_event`, `fn_emit_health_check_findings`) write severity override audit to `dynamic_context.severity_override` when their `p_severity` arg differs from the rule's `default_severity` — NOT to `category_source`.
- Future work that adds new event types or new override modes MUST follow this pattern: enums for single-valued provenance, JSONB for multi-state transformation audit.

### Related decisions

- **cc-0017b brief v1.0 §7** — first formalisation of the query pattern; this decisions.md entry is the persistent record.
- **D-IOL-001** — friction register as standing infrastructure. Dashboard and analytical queries against the register inherit this query pattern.
- **No new decisions pending from this entry.** This is a query-pattern note, not an architectural commitment requiring follow-on work.

### Sunset clause

None. This is a permanent design property of `friction.event`. If a future redesign chooses to collapse the two columns into a single representation, that becomes its own decision needing its own number — not a reversal of D-CC-0017B-Q1.

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
| **D170 — MCP-applied migrations pattern** | ✅ LOCKED through Phase A+B7-9 + concrete-pipeline track; applies for all 19 stages; reinforced by D182 first run + cc-0017a + cc-0017b | — |
| **D171 — Pre-flight schema verification per stage** | ✅ LOCKED; sharpened by Lesson #32; reinforced by D182 brief pre-flight discipline + cc-0017b P-set | — |
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
| **D-CC-0017B-Q1 — Severity override in `dynamic_context` NOT `category_source`** | ✅ LOCKED 18 May 2026 (cc-0017b apply) — query pattern note for `friction.event`. **Full prose entry above.** | None — permanent design property |
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
| **cc-0017a Wave 0a foundational schema** | ✅ APPLIED + CLOSED 18 May 2026 (v2.81) | — |
| **cc-0017b Wave 0b unified emit_event** | ✅ APPLIED-WITH-CORRECTIVE-MIGRATION + CLOSED 18 May 2026 (v2.82) | — |
| **cc-0017b brief v1.1 doc patch** | 🔲 Required — 6 defects + 2 placeholders identified at apply | Single doc-only commit, any future session |
| **cc-0015 Friction Pool View** | 🟢 AUTHORED, PENDING_EXECUTION — unblocked per D-IOL-001 | Wave 7 |
| **cc-0016 Friction Capture Evidence** | 🟢 AUTHORED, PENDING_EXECUTION — unblocked per D-IOL-001, parallel-executable with cc-0015 | Wave 8 |
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

*Note (2026-05-18 v2.82): Full prose for D181–D186 preserved in commit history. This compaction is editorial only — content unchanged for prior decisions; D-IOL-001 (v2.77) and D-CC-0017B-Q1 (v2.82) are the only new entries.*
