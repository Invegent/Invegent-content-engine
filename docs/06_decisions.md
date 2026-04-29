# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D100 — See earlier commits

## D101–D125 — See 16 Apr 2026 commits

## D126–D141 — See 17 Apr 2026 commits (pipeline analysis, synthesis decision, demand-aware seeding direction). **D141 sequencing recommendation reversed by D166 — see below.**

## D142–D146 — See 17 Apr 2026 evening commits (demand-aware seeder, classifier, router, benchmark, feed score — all but D142 gated on 60d data). **D144 MVP shadow infrastructure shipped via D167. D145 research portion shipped via D167.**

## D147–D151 — See 18 Apr 2026 afternoon commit (pilot structure, buyer-risk form, advisor layer, session-close SOP, table-purpose rule)

## D152–D155 — See 18 Apr 2026 evening commit (seeder client_id fix, token-health live direction, native LinkedIn flow, ON CONFLICT root-cause fix)

## D156–D162 — See 21 Apr 2026 commits (external reviewer layer shipped + paused, cost guardrails architecture, reviewer implementation details)

## D163–D168 — See 21–23 Apr 2026 commits (DLQ scoping, bundler dedup, bloat cleanup, router sequencing reversal, router MVP shadow infrastructure, ID004 sentinel scope)

## D170–D176 — See 26 Apr 2026 morning commits (slot-driven Phase A: MCP-applied migrations, pre-flight as gate, architectural revision authority, two-trigger chain, thin-pool signal, versioned ref FK pattern, state-change rollback discipline)

## D177–D182 — See 26–29 Apr 2026 commits (fitness scale, ai_job FK CASCADE, Stage 10/11 ordering, discovery decides assignment, audit loop architecture, non-blocking execution model)

---

## D183 — D182 v1 First-Run Learnings + Phase 4b/4c Deferral Principle
**Date:** 30 April 2026 morning | **Status:** ✅ LOCKED — captured during 30 Apr Thu morning end-of-session reconciliation. Phase 4b + Phase 4c DEFERRED until briefs demand them.

### The problem this decides

D182 v1 spec authored 28 Apr evening had a build path with Phase 4b (GitHub Actions cloud-side validation workflow) and Phase 4c (OpenAI API overnight answer step + Cowork correction pass wiring) listed as "next session" tasks blocking Phase 5 (first overnight test).

PK ran the first test manually on 29 Apr Wed evening WITHOUT 4b or 4c. The brief was Phase D ARRAY mop-up — Tier 1, draft-only, mechanical, finite scope, 7 ARRAY columns to document. Cowork picked it up via paste-in prompt, executed end-to-end in ~5 min, produced a clean migration file + state file, asked 0 questions.

The question for this decision: now that the system has earned its first run without 4b/4c, should we still build them speculatively, or defer until a brief actually surfaces the gap they fill?

### The decision

**Defer 4b and 4c. Build automation infrastructure when observation under load demands it, not pre-emptively.**

Specifically:

- **Phase 4b (GitHub Actions validation workflow)** — DEFERRED. The first run's inline count-delta DO block (Lesson #38) raises an exception on delta mismatch and is sufficient safety for mechanical Tier 1 briefs. Build 4b only when a brief whose verification cannot be encoded inline lands in the queue.
- **Phase 4c (OpenAI API answer step + Cowork correction pass)** — DEFERRED. The first run produced 0 questions because the answer-key pre-empted every decision. Build 4c only when 2–3 briefs in succession surface real questions PK cannot trivially answer in the morning.

### Why deferral over pre-emptive build

Three reasons:

1. **Speculative infrastructure ages badly.** GitHub Actions written for hypothetical brief shapes will need rework once real briefs surface real validation needs. The first run's success suggests the inline DO block pattern may scale to most Tier 1 briefs; building 4b before knowing which briefs need it = guessing.

2. **Q&A pipeline needs question signal.** Phase 4c's value comes from API answering questions Cowork couldn't auto-default. Without observed questions, building the pipeline = building a forklift to lift zero packages. Authoring 2–3 more briefs without 4b/4c will reveal whether Q&A flow is needed at all, or whether tighter answer-keys are sufficient.

3. **Sunset clause already covers re-evaluation.** D182 has a sunset review on 12 May 2026 (2 weeks from lock). If by then briefs are surfacing volumes of real questions or PK is repeatedly hand-validating outputs the inline DO block missed, build 4b/4c then. Until then: observe.

### What this requires

- D182 spec build path table updated (this session's commit) to mark Phase 5 DONE 29 Apr (5/5 thresholds), Phase 4b DEFERRED per D183, Phase 4c DEFERRED per D183.
- First-run learnings section added to spec capturing what worked: answer-key pre-empted every decision, pre-flight reuse saved ~5 SQL calls, 3-commit run pattern emerged organically, ~5 min runtime vs ~20 min estimated, ~45k token burn (modest on Max 5x bundled).
- Memory entry 14 updated to reflect first-run validation.

### What this does NOT change

- D182 five-rule system stays as-is (default-and-continue, answer-key, one-AI-per-question, escalation, no-production-writes-from-automation).
- D182 4-tier risk system stays as-is.
- D182 sunset clause unchanged: 12 May 2026 re-evaluation.
- All other deferred items (audit Slice 2/3, branch sweep, filename hygiene, etc.) untouched.

### First-run findings worth keeping for future briefs

1. **Pre-loaded pre-flight data eliminates ~5 SQL re-query loops.** Saved meaningful runtime + token burn vs Cowork starting cold. Worth keeping as a discipline: brief authors run pre-flight via Supabase MCP, embed findings as authoritative data for the run.
2. **Answer-key pattern works completely when scope is tight.** All 5 anticipated decision points pre-answered; 0 questions written. Future briefs should aim for similar pre-flight depth.
3. **3-commit run pattern emerged organically.** ready→running, work, running→review_required + queue update. Clean transitions, easy audit trail. Worth codifying in next executor-prompt revision.
4. **Runtime ~5 min vs estimated 20 min.** First brief was tighter than predicted. May need to set tighter estimates for similar mop-up briefs.
5. **Two minor wording observations during PK review accepted as-is** — (a) `f.video_analysis.key_hooks` claimed producer "video-analysis worker extracted..." — real per A13 closure but goes slightly beyond pre-flight evidence; (b) `c.client_brand_asset.platform_scope` had shape speculation hedged with "no observed sample available to confirm" — useful future-reader hint. Neither was safety-impacting.

### Related decisions

- **D182** — v1 spec lock. D183 is the first-run validation + deferral lock that complements it.
- **D181** — audit loop architecture. D183 reinforces D181's pattern of "run manually for N cycles before automating".
- **Lesson #38** — count-delta verification beats time-window. The first run's DO block applied this directly.

---

## D184 — Audit Workflow Automation Slicing (D181 + D182 Composition)
**Date:** 30 April 2026 morning | **Status:** ✅ LOCKED — Slice 2 designated as next D182 Tier 0 brief; Slice 3 waits 5+ cycles per D181 standing rule.

### The problem this decides

D181 (audit loop architecture) introduced three slices:

- **Slice 1** (recurrence prevention) — LIVE since 28 Apr. PENDING_DOCUMENTATION sentinel + 14-day grace + DEFERRED escape hatch + automated naming-discipline detector.
- **Slice 2** (snapshot generation automation) — currently manual. ~30k char snapshot is generated by chat session running queries against `k.*` + targeted `f.*`/`m.*`, written to `docs/audit/snapshots/{YYYY-MM-DD}.md`.
- **Slice 3** (auditor pass automation) — ChatGPT reads snapshot + role definition, writes findings. Currently manual.

D181 set a standing rule: don't automate the auditor (Slice 3) until 5+ manual cycles have established that findings format is stable, judgment patterns are repeatable, and failure modes are understood.

The question this decision answers: now that D182 (non-blocking execution) has earned its first run, how do D181 and D182 compose? Specifically: which audit slice gets automated next, via D182 brief, or via something else?

### The decision

**Slice 2 (snapshot generation) is authored next as a D182 Tier 0 brief. Slice 3 (auditor pass) waits per D181's 5+ cycles rule.**

The Slice 2 brief is the second D182 test — different shape from the first (markdown generation + DB read, no DB writes, no migration drafting). If it runs clean to 5/5 thresholds, D182 is validated across two brief shapes. If it surfaces real questions, those become the signal that Phase 4c (Q&A flow per D183) has earned its build.

### Why Slice 2 next, Slice 3 later

Three reasons:

1. **Slice 2 is mechanical. Slice 3 is judgment-heavy.** Snapshot generation is read-only SQL queries against `k.*` views, plus markdown formatting. Tier 0 (auto-commit, no DB writes). Slice 3 is auditor *judgment*: deciding what's a finding, what severity, what evidence to cite. That's domain reasoning the system has only practiced once. Five practice runs first, then automate.

2. **Slice 2 is the natural second D182 test.** First test was migration drafting (Tier 1). Slice 2 brief is markdown generation (Tier 0). Two different shapes validates whether D182's primitives generalise. If Slice 2 hits 5/5, that's stronger signal than two Tier 1 runs in a row.

3. **Slice 3 readiness is also Q&A readiness.** Automating the auditor requires deciding whether ambiguous patterns are findings or noise. That's exactly the kind of decision Phase 4c (API answer step) was designed for. Building Slice 3 = building Phase 4c. D183 says wait for evidence; same principle applies here.

### What this requires

- **Next session:** PK + chat author the Slice 2 brief at `docs/briefs/audit-snapshot-cycle-2.md` with v1 frontmatter (Tier 0, allowed_paths includes `docs/audit/snapshots/**` and `docs/runtime/runs/**`, idempotency_check verifies file at target date doesn't exist).
- Brief includes pre-flight findings (sections to include, query templates per section, example output from 28 Apr cycle 1 snapshot).
- Cowork executes via paste-in prompt, produces `docs/audit/snapshots/{YYYY-MM-DD}.md`.
- PK reviews + commits per Tier 0 auto-commit rule (or per current D182 manual approval pattern — PK to choose).
- ChatGPT then reads the auto-generated snapshot + cycle 1 closure context + role definition + writes cycle 2 findings to `docs/audit/runs/{YYYY-MM-DD}-data.md`. This step stays manual per D181.
- After 5+ cycles of manual Slice 3 (i.e. ~5 weeks at weekly cadence, or longer if findings volume justifies), re-evaluate Slice 3 automation.

### What this does NOT decide

- The exact Slice 2 brief contents (locked when authored next session).
- Whether snapshot cadence changes from weekly to something else (kept as default Tuesday cadence per D181).
- Whether new audit roles (Security, Operations, Financial, Compliance) get added — D181 standing rule says wait for Data role to run 5+ cycles first.
- Whether D182 brief authoring itself becomes automated (i.e. Cowork writes briefs for Cowork to execute) — explicitly out of scope; PK authors briefs.

### Standing rule reminder for future audit roles

When a future audit role (Security, Operations, etc.) is added per D181, it follows the same slicing:

- Slice 1 (recurrence prevention) — designed at role-spec time.
- Slice 2 (snapshot generation) — D182 Tier 0 brief if scoped, manual otherwise.
- Slice 3 (auditor pass) — manual for 5+ cycles, then re-evaluate automation.

### Related decisions

- **D181** — audit loop architecture. D184 operationalises Slice 2/3 sequencing.
- **D182** — non-blocking execution model. D184 says Slice 2 is the natural second test brief.
- **D183** — build-when-evidence-demands principle. D184 applies it to Slice 3 deferral.

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
| **D170 — MCP-applied migrations pattern** | ✅ LOCKED through Phase A+B7-9 + concrete-pipeline track; applies for all 19 stages; reinforced by D182 first run (PK applied via Supabase MCP) | — |
| **D171 — Pre-flight schema verification per stage** | ✅ LOCKED; sharpened by Lesson #32 (query every directly-touched table); reinforced by D182 brief pre-flight discipline | — |
| **D172 — Architectural revision authority** | ✅ LOCKED; R-A through R-E applied in Phase A | — |
| **D173 — Two-trigger chain pattern** | ✅ APPLIED Stage 3 | — |
| **D174 — Invegent thin-pool operational signal** | ✅ Observed; informs Phase E priority | Phase E content work |
| **D175 — Versioned reference table pattern** | ✅ APPLIED Stage 2.009 | Apply to future lookup tables referencing versioned sources |
| **D176 — State-change rollback discipline** | ✅ APPLIED Stage 5 | Build-stage pattern |
| **D177 — fitness_score_max scale 0..100** | ✅ APPLIED Stage 7.032 | Apply at every fitness consumer |
| **D178 — ai_job.slot_id FK = ON DELETE CASCADE** | ✅ APPLIED Stage 9.039 | — |
| **D179 — Stage 10/11 ordering: Option B** | ✅ LOCKED for Stage 10 brief | Stage 10 next session |
| **D180 — Discovery decides assignment, intelligence decides retention** | ✅ APPLIED via migration 006 trigger; backfill ran for 8 CFW seeds | Apply to any future discovery channel (YouTube channel discovery, email-newsletter discovery, etc.) |
| **D181 — Audit loop as three-layer architecture** | ✅ BUILT — first cycle complete same day; slice 1 prevention live; D184 sequences Slice 2/3 | Apply to future audit roles (Security, Operations, Financial, Compliance) when added |
| **D182 — Non-blocking execution model (five-rule system)** | ✅ LOCKED — v1 spec at `docs/runtime/automation_v1_spec.md`; Phase 1+2+3+4a+5 done; Phase 4b/4c DEFERRED per D183; sunset review 12 May 2026 | — |
| **D183 — D182 v1 first-run learnings + Phase 4b/4c deferral** | ✅ LOCKED 30 Apr morning — build-when-evidence-demands principle | Build 4b when a brief demands cloud-side validation; build 4c when 2–3 briefs surface real questions |
| **D184 — Audit workflow automation slicing** | ✅ LOCKED 30 Apr morning — Slice 2 next as D182 Tier 0 brief; Slice 3 waits 5+ cycles per D181 | Slice 2 brief authored next session; Slice 3 re-evaluation after cycle 5 |
| **Slot-driven Phase A** | ✅ COMPLETE 26 Apr morning | — |
| **Slot-driven Phase B Stages 7-9** | ✅ COMPLETE 26 Apr afternoon–evening | — |
| **Slot-driven Phase B Stages 10-12** | ✅ COMPLETE 27 Apr | — |
| **Gate B observation** | 🔄 IN PROGRESS — Day 1 healthy. Day 2 obs slipped 29 Apr; due 30 Apr. Earliest exit Sat 2 May | 5-7 days post-Stage 12 |
| **Concrete-pipeline track** | 🔄 IN PROGRESS — Discovery Stage 1.1 ✅, Publisher Stage 2.1 ✅, Brief A ✅, Brief 2 ✅. Stages 1.2-1.5 + 2.2-2.5 pending | Parallel to Gate B |
| **F-002 closure** | ✅ CLOSED-ACTION-TAKEN — P1 + P2 + P3 all applied 28 Apr same day. Phase D ARRAY mop-up applied 29 Apr via D182 first brief. c+f coverage 0% → 22.1% (149/674). 6 LOW rows deferred to followups. | — |
| **Phase D ARRAY mop-up** | ✅ CLOSED-ACTION-TAKEN 29 Apr — first D182 brief, applied via Supabase MCP, 5/5 thresholds | — |
| **6 LOW-row joint resolution session** | 🔲 Backlog | PK + chat session, ~30 min, likely synchronous (not Cowork) per D184 reasoning |
| **Audit loop slice 2 (snapshot automation)** | 🟡 Next session as D182 Tier 0 brief per D184 | Brief authoring next session |
| **Audit loop slice 3 (API auditor pass via Cowork+OpenAI)** | 🔲 Deferred per D184 | After 5+ manual cycles of Slice 3 |
| **Slot-driven Phase C — Cutover (Stages 12-18)** | 🔲 After Gate B exit | Gate B exit |
| **Slot-driven Phase D Stage 19 decommission R6** | 🔲 After Phase C | All client-platforms cut over |
| **Slot-driven Phase E — Evergreen seeding** | 🔲 Parallel | Prioritise Invegent verticals per D174 |
| **Overload B of `create_feed_source_rss` cleanup** | 🔲 Backlog | Drop or fix in follow-up; latent NOT NULL bug uncovered by D180 work |
| **Feeds-tab URL clickability follow-up** | ✅ SHIPPED 28 Apr afternoon (Brief 2) | — |
| Inbox anomaly monitor | 🔲 Post-sprint | Separate brief TBW |
| Phase 2.1 — Insights-worker | 🔲 Next major build | Meta Standard Access |
| Phase 2.6 — Proof dashboard | 🔲 After Phase 2.1 | Engagement data |
| Solicitor engagement | 🔲 Parked per D147 + D156 refinement | First pilot revenue OR second pilot signed |
| Meta App Review | ⏳ In Review | Contact dev support if stuck after 27 Apr |
| CFW + Invegent content prompts | 🔲 A11b pre-sales | PK prompt-writing session Fri 24 Apr |
| TBC subscription costs | 🔲 A6 pre-sales | PK said 28 Apr morning: deferred until product evaluation + outside conversations complete |
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
| **PP Schedule Facebook 6/5 over-tier-limit** | 🔲 Sprint item TBD | Surfaced in M5 verification — investigate save-side validation |
| **Stage 12+ refinement: try_urgent_breaking_fills per-platform variance** | 🔲 After Gate B | Currently picks same top breaking item across all platforms for a client; fill function's LD15 dedup masks it. Refine to pick different item per platform within client. |
| **Branch sweep — invegent-content-engine + invegent-dashboard + invegent-portal (10 stale branches)** | 🔲 Backlog | content-engine 4, dashboard 5, portal 1; cleanup with `git push origin --delete` after each branch verified merged |
| **Phase B filename hygiene** | 🔲 Backlog | Rename `supabase/migrations/20260428163000_audit_f002_p2_column_purposes_corrected.sql` to match DB version `20260428064115` per Lesson #36 |
