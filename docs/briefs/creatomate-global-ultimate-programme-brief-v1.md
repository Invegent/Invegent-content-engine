# Creatomate Global Ultimate — Programme Brief (v1, rev-2)

**Created:** 2026-08-01 Sydney · **Revised:** 2026-08-01 (rev-2, PK amendment directive)
**Author:** chat (Claude Code orchestrator) · **Approver:** PK
**Status:** DRAFT rev-2 — **awaiting final PK ratification.** Direction approved by PK 2026-08-01;
this revision applies PK's eight named amendments (log in §0).
**Supersedes as planning reference:** the daily planning-brief cadence for this programme. Once
ratified, execution runs against THIS document; implementation packets are created only when a
workstream reaches an apply gate.
**Companion evidence doc:** `docs/briefs/creatomate-global-ultimate-strategic-inventory-v1.md`
(full file-cited inventory, 2026-08-01).

> **What this is:** the single governing document ("north star") for the remainder of Creatomate
> Global Ultimate — definitions, current state, six workstreams, dependencies, per-workstream
> definitions of done, a 2–3 week execution order, and a standing Programme Board.
> **What this is not:** an implementation packet. **No live S7 or Asset Gap production apply — and
> no apply, deploy, migration, or DML of any kind — is authorised by this programme-level
> approval** (PK directive 2026-08-01). Every workstream keeps its tier/review chain and PK hard
> stops; all *-B apply gates (§4.3) are separate PK acts against exact reviewed packets and hashes.

---

## 0. Rev-2 amendment log (PK directive, 2026-08-01)

1. **Milestone split:** "Governed Boundary Complete" separated from "Creatomate Global Ultimate"
   (§1.1). Owned gaps satisfy the boundary milestone only; Ultimate requires every committed cell
   ready-and-production-proven or explicitly PK-deferred.
2. **Onboarding claim replaced** with a zero-code capability-enrolment proof using a previously
   unenrolled **existing** brand (§1.1, §5 WS-1). Fifth-brand onboarding stays post-Ultimate
   unless a test brand is deliberately added.
3. **Gate separation:** P-3 split into P-3A (scope/freeze/review) + P-3B (separate T3 apply
   authorisation against the exact reviewed packet + hashes). Same A/B separation applied to the
   Asset Gap live writer + scheduler (P-5A/P-5B). (§4.3)
4. **P-4 now carries a decision-ready OQ4 treatment** (§4.4). **P-8 redefined as interim
   containment only** (its decision content was duplicated by D1/D4, which are now decided).
5. **Matrix decisions D1–D4 DECIDED** (§1.2): D1 governed template-less text path all brands ·
   D2 PP legacy carousel governed for Ultimate v1 · D3 CFW/Invegent YouTube explicitly deferred ·
   D4 graduate PP YouTube kinetic (no collapse to stat-only).
6. **13-rung proof contract RATIFIED** (P-2 closed; §1.4).
7. **Creatomate Specialist charter APPROVED**, first operator-transposition mission = **PP YouTube
   kinetic** (P-6 closed; §3 WS-4, dovetails with D4).
8. **WS-5 first metadata consumer = operator template-intake validation** (P-7 closed; §3 WS-5).

**⚠ New finding surfaced BY these amendments — S7 packet must be amended before freeze (§3 WS-2):**
D1 and the drafted S7 predicate conflict. The drafted guard excludes any format whose
`select_template` fail-closes — which template-less `text` always does. With D1 governing text,
the S7 capability predicate must add an explicit governed-exemption clause (exactly the S9
exemption set `{text}`, still intersected with `platform_support`), or S7 would de-allocate the
cells D1 just governed. This is a packet-content change and belongs in P-3A's freeze, not after.

---

## 1. Definitions and the finish line

### 1.1 Two milestones (PK amendment 1)

**Milestone 1 — GOVERNED BOUNDARY COMPLETE.** For the PK-approved Target Capability Matrix
(§1.2), every client × platform × format cell is in exactly one of three states — no cell is
`unsupported_silent_degrade`, unowned, or unclassified:
1. **Ready and production-proven** — `classify_format_capability` = `ready` AND a live
   `platform_publish` proof event (13-rung ladder, rung 10+);
2. **Explicitly deferred** — PK-named deferral with a recorded reason, visible in the readiness
   queue;
3. **Represented by an owned gap** — a routed row in the activated Asset Gap system with a named
   responsible lane.

**Milestone 2 — CREATOMATE GLOBAL ULTIMATE.** Everything in Milestone 1, **plus**:
- **Every committed (🎯/✅) target cell is state-1 (ready and production-proven) or has been
  explicitly re-deferred by PK.** Owned gaps (state 3) do NOT satisfy Ultimate — they are the
  working backlog between the two milestones, and Ultimate means that backlog has been drained
  for every committed cell.
- **Zero-code capability-enrolment proof (PK amendment 2):** a previously **unenrolled existing
  brand** (NDIS, CFW, or Invegent) is enrolled into format-mix capability
  (`c.client_control_tower_enrollment`) and reaches its committed formats through governed data,
  governed assets, and dashboard/schedule configuration only — demonstrated by an enrolment run
  whose content-engine code diff is empty. **True fifth-brand onboarding remains post-Ultimate**
  unless PK deliberately adds a test brand.

**Measuring instrument (both milestones):** the Client Production Readiness Queue
(`get_client_production_readiness_queue`, live since v6.78). Boundary-complete = zero unowned
non-ready target cells. Ultimate = zero non-ready committed cells that are not explicit PK
deferrals. No new measurement machinery is built.

**Key principle (PK):** the target matrix is deliberate commitment, not theoretical coverage.

### 1.2 Target Capability Matrix (D1–D4 DECIDED by PK, 2026-08-01)

Legend: ✅ proven today · 🎯 committed, to close inside Ultimate · ⏸ explicitly deferred
(state 2) · — out of matrix.

| Format \ Cell | PP FB | PP IG | PP LI | PP YT | NDIS FB | NDIS IG | NDIS LI | NDIS YT | CFW FB | CFW IG | CFW LI | CFW YT | INV FB | INV IG | INV LI | INV YT |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| image_quote | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| text (D1) | 🎯 | — | 🎯 | — | 🎯 | — | 🎯 | — | 🎯 | — | 🎯 | — | 🎯 | — | 🎯 | — |
| carousel (D2) | 🎯 | 🎯 | — | — | ⏸ | ⏸ | — | — | ⏸ | ⏸ | — | — | ⏸ | ⏸ | — | — |
| video_short_stat | — | — | — | 🎯 | — | — | — | 🎯 | — | — | — | ⏸ (D3) | — | — | — | ⏸ (D3) |
| video_short_kinetic (+voice variants) (D4) | — | — | — | 🎯 | — | — | — | ⏸ | — | — | — | ⏸ | — | — | — | ⏸ |
| animated_text_reveal / animated_data | ⏸ (Slice D) across all cells | | | | | | | | | | | | | | | |
| weekly digest (format family) | — out of Ultimate v1 entirely (§1.3) | | | | | | | | | | | | | | | |

**Decided treatments and their execution lanes:**
- **D1 — governed template-less text path, all brands (DECIDED).** Execution = a governance
  declaration lane, not a template build: declare the template-less carve-out
  (`render_engine='none'`, capability-exempt, exemption set exactly `{text}`) as a governed path
  wherever `platform_support` marks text supported (FB/LI today; IG false, YT null — so text
  cells exist only on FB/LI), with an evidence trail per brand. Removes the programme's largest
  silent-degrade mass (PP FB+LI text, 89/90d) by **governing** it rather than blocking it.
  **Consequence:** the S7 predicate gains the governed-exemption clause (§0 warning, §3 WS-2).
- **D2 — PP legacy carousel governed for Ultimate v1 (DECIDED).** Execution = declaration +
  evidence lane: declare the legacy carousel pipeline governed for PP FB/IG, record proof events
  against the live publishes (104 real drafts). No TMR carousel migration inside Ultimate v1;
  the BackgroundSolid fix + TMR carousel remain a post-Ultimate (or B2-optional) lane.
- **D3 — CFW/Invegent YouTube explicitly deferred (DECIDED).** Record state-2 deferrals in the
  readiness queue, named reason "publisher onboarding not performed (PK OAuth + publish profiles
  outstanding)". Promotable later without moving the finish line.
- **D4 — graduate PP YouTube kinetic; do NOT collapse PP to stat-only (DECIDED).** Execution =
  the WS-4 specialist's **first operator-transposition mission** (§3 WS-4): design the kinetic
  template package → PK transposes in Creatomate → registry capture → probe renders → visual
  verdict → 13-rung graduation. **Interim behaviour is understood and accepted:** until kinetic
  reaches rung 10, the S7 guard correctly allocates PP YT to `video_short_stat` only; the moment
  kinetic graduates, allocation self-heals with zero code change (that self-healing property is
  the point of S7's data-driven design).
  **Clarification (PK direction, 2026-08-01 — visual-approval scope rider):** the design/build/
  approval work executed under D4 so far is scoped to **silent, solid-brand-background, 3-point**
  kinetic — the rung-6 visual verdict (proof event `2ccdb697…`) covers exactly that composition,
  no more. **Voice, music, and any imagery-backed (B-roll/image) variant are explicitly deferred**
  — each is a separate election requiring its own probes and a fresh visual verdict before it can
  count toward D4's graduation. `video_short_kinetic` (silent) proceeds on the landed evidence;
  `video_short_kinetic_voice` and any B-roll-backed variant are out of scope of every approval
  recorded to date. Full record: `docs/briefs/results/ws5-constraints-shape-design-lane-result-v1.md`
  ("VISUAL-APPROVAL SCOPE RIDER"); register pointer: `docs/00_sync_state.md` v6.115.

### 1.3 Explicitly OUT of Ultimate v1
Unchanged from rev-1: Weekly Digest implementation (design contract may be authored; build is
post-Ultimate) · animated formats (Slice D) · Asset Gap subject-type expansion (music / avatar /
voice / feed-volume / provider-capability — loop proven first on existing types) · selector
redesign (evolution only via the WS-5 consumer path) · true fifth-brand onboarding (per §1.1;
enabled by Ultimate, performed after it).

### 1.4 Proof authority — RATIFIED
**The 13-rung graduation contract
(`docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §4) is ratified by
PK (2026-08-01) as the formal proof authority for cell state-1 classification** (closes S6 OQ1).
Register pointer to be cut at the next register update; this brief records the ruling.

---

## 2. Current State (as of 2026-08-01; citations in the companion inventory)

### 2.1 Foundations COMPLETE (permanent — do not redesign)
Template registry (TMR-3/4) · 13-rung graduation contract (**now ratified**, §1.4) ·
`select_template` + selector policy (cc-0089) · seven-state `classify_format_capability` (v2) ·
Client Production Readiness Queue (v6.78) · S9 capability→publisher enforcement (both
boundaries) · asset intake/promotion machinery (S1→S8, harvester/reviewer agents) · multi-signal
synthesis (`synth_bundle_v1`) · schedule authority + Weekly Schedule Editor Phase 1 · S6 Slice B1
truth alignment (v6.94).

### 2.2 Foundations ACTIVE
`image_quote` production across 4 brands × FB/IG/LI · B-roll rotation v1.5 (first natural render
pending; monitor armed) · S5 schedule surface (prepared evidence window, WS-1) · dashboard
readiness surfaces.

### 2.3 DORMANT systems (built, idle — activation is the work)
- **Asset Gap:** live schema + analyzer + autoclose + orthogonal classifier; writer dry-run
  defaults true, no scheduler, no read view, markdown register ⇄ DB ledger never reconciled.
- **Template metadata:** `constraints` jsonb never written; TMR-4 appetite columns NULL on static
  templates; per-template capability contract designed
  (`branch-b-template-capability-contracts.md`) and never built; no governed write RPC.
- **R3a `resolve_final_format`:** SHADOW; independently re-derives the S7 predicate — future
  consolidation material.

### 2.4 Known blockers and active defects
1. **S7 defect (ACTIVE, correctness):** `m.build_weekly_demand_grid` enforces neither
   `platform_support` nor selectability. Live: **PP 5/11 and NDIS 7/11 candidate allocations
   `unsupported_silent_degrade`**; safety is downstream containment + accidental table state
   (`s7-durable-capability-enforcement-demand-grid-gate1-v1.md` §2/§6). **Precedes any
   reachability expansion.** Note rev-2: the drafted packet requires the D1 exemption amendment
   (§0) before freeze.
2. **Slice A UNBLOCKED (2026-08-01)** — both original dry-run STOP reasons cleared: S7 landed
   (v6.106) and OQ4 decided (Option A, below). Resumption itself is a separate, not-yet-scoped
   execution lane (WS-1).
3. **`task_05bf8b3d`** — standing release gate on unattended `announcement_card` selection (STOP
   condition for B2 lanes).
4. **F-AIW-PREF-COL-HARDCODE** — fix before any platform-specific preferred-format config.
5. **OQ4 — DECIDED** (Option A, PK 2026-08-01; §4.4/P-4). Track-B Slice-2 demoted to a named
   T2 hygiene carry, no longer a Slice A precondition.
6. **Registry/docs hygiene:** S6 governing brief + B1 packet off-main; S7 brief + Slice-A
   brief/result + this brief untracked; v6.94 double-assigned across branches; stale cc-0046
   "UNAPPLIED" doc.
7. **Untracked deployed drift hazard** on `select_template` — verify live function bodies before
   any selector-adjacent change.
8. **Creatomate external constraints (permanent, shaping WS-4/WS-5):** no template-create API ·
   no safe template-metadata read path · upstream deletion undetectable in-repo · 2-min render
   ceiling · row-19 timeout rate.

---

## 3. Programme Workstreams

### WS-1 — Capability Expansion (lane label: S6; includes the S5 evidence window)
Close the committed matrix cells: B2 (extend template families through real
render→draft→publish proof), Slice A resumption (= the §1.1 zero-code capability-enrolment
proof, on a previously unenrolled existing brand), and execution of the decided D1/D2 declaration
lanes. Passively: the **S5 evidence window** — let the prepared schedule exercise the current
surface and record what selects / renders / publishes / lacks feed supply / lacks assets / is
capability-blocked; findings route into WS-3 as its first real input. Slices C and D stay parked
per §1.2/§1.3; Slice E fires only on its natural trigger.

### WS-2 — S7 Capability Enforcement (highest technical priority)
Land the durable capability predicate at the demand-grid boundary. **Rev-2 packet amendment
(required before freeze):** the predicate becomes
`platform_support ∩ (select_template not fail-closed ∪ governed template-less exemption)` — the
exemption set exactly `{text}` (mirroring S9's resolver exemption), still intersected with
`platform_support`, fail-closed on NULL/error exactly as the drafted `COALESCE` correction
specifies. Without this clause, S7 would de-allocate the D1-governed text cells (§0).
Then: freeze under P-3A (review chain: apply-harness-auditor shadow · db-rls-auditor · external
review pinned to hash · branch-warden) → **P-3B separate PK T3 apply authorisation against the
exact reviewed packet and hashes** → post-apply rerun of the PP and NDIS before/after matrices
(re-derived for the amended predicate: text cells now survive; unsupported video/carousel
candidates still excluded) → Slice A unblocks. Companion diagnostic view
(`ice_ro.format_mix_capability_gaps`) = named follow-on T2 lane. Carry: three-way predicate
consolidation (`build_weekly_demand_grid` / `resolve_final_format` /
`get_week_format_allocation`).

### WS-3 — Asset Gap Activation
Convert the dormant substrate into the living backlog, existing gap types only:
(a) secret-free `ice_ro` read view over `m.asset_gap_suggestion` (cc-0090 pattern);
(b) live scheduled run of `run_asset_gap_analysis(p_dry_run⇒false)` — ending the permanent
dry-run default — **gated P-5A (scope/freeze/review) then P-5B (separate PK apply authorisation
against the exact reviewed packet)**, mirroring the S7 gate separation;
(c) reconcile DB ledger ⇄ markdown register into ONE register (DB-generated; markdown demoted to
commentary); (d) route every non-ready target cell to an owner (readiness queue
`responsible_lane` coverage extended, not rebuilt). Capability gaps stay live-computed; asset
gaps persist. Subject expansion deferred until the loop is proven live.

*(WS-3(c)/(d) sequencing, PK-decided 2026-08-01: reconciliation found the markdown register is a
superset the DB ledger cannot fully represent (9 of 15 items structurally invisible to the
analyzer, plus a live divergence), so demoting it per (c) before (d) routes those items would
silently drop them. **(d) now runs before (c)** — the reverse of the letter order above; neither
workstream's content changes. Record: `docs/briefs/results/ws3-asset-gap-register-reconciliation-result-v1.md`.)*

### WS-4 — Creatomate Specialist (charter APPROVED; candidate lane; operator-transposition loop)
**Charter approved by PK 2026-08-01 (P-6 closed).** Read-only/design agent, candidate-level until
its first mission proves. The closed loop:

> **AI proposes → human transposes and visually adjusts → ICE registers → system proves →
> template becomes selectable.**

- **Specialist produces (per template):** recommended layout + purpose · Creatomate source-mode
  JSON or structured build spec · scene/layer structure · element names · animation settings ·
  slot contract · text limits · required assets · platform/aspect suitability · expected visual
  description · validation checklist.
- **Operator (PK) performs the Creatomate-only act:** create/import in the editor, adjust
  visually, save as template, return template name + provider_template_id, record deviations
  from the proposed spec.
- **ICE closes the loop:** registry capture (`captured_from_manual_entry` precedent) · governed
  metadata + capability contract (via WS-5 machinery) · probe renders · PK visual verdict ·
  platform suitability · 13-rung graduation.

**First mission (DESIGNATED by PK): PP YouTube kinetic (executes D4).** Design the kinetic
template package (and its voice variants as PK elects), carry it through the full loop to
graduation. The specialist's intake **validation checklist** doubles as the first consumer of
WS-5 metadata (§WS-5). Permanence decision on the mission's evidence. Future (separately gated):
CI-4C→CI-4H provider read-path slices.

### WS-5 — Template Metadata Evolution
**First consumer DECIDED by PK: operator template-intake validation** — the WS-4 loop's
registration step validates the operator-returned template against the specialist's declared
contract (element names present · slot contract satisfied · text limits calibrated by probe
render · required assets mapped), so metadata is consumed the moment it is written. Build: the
missing governed write RPC; populate `creative_provider_template_field.constraints` (+
platform-suitability constraints) for 2–3 production-proven templates from the branch-b contract
design, probe-render-calibrated (layout geometry lives provider-side — capacity is probed, never
read). Later consumers (each its own decision): missing-cell template recommendation · dashboard
suitability explanations · Asset Gap needs-template vs needs-assignment precision. No inert
declared-only fields, ever.

### WS-6 — Dashboard Capability Visibility
Slice F only: shared Format Capability Indicator six→seven states
(`lib/format-capability.ts` + `CapabilityCell.tsx`). Do not rebuild the readiness queue, schedule
editor, or gap routing. Parallel-safe; separate repo.

---

## 4. Dependencies and gates

### 4.1 Sequential (hard)
```
Final ratification of THIS brief ─→ P-3A (S7 amend + freeze + review) ─→ P-3B (PK T3 apply)
  ─→ before/after matrices (amended predicate) ─→ Slice A resumes ─→ enrolment proof (§1.1)
  └→ B2 tranches safely expand reachability
WS-4 mission (D4 kinetic) ─→ PP YT kinetic cell closes    [independent of B2; PK transposition act in the middle]
P-5A ─→ P-5B ─→ Asset Gap loop live ─→ state-3 "owned gap" classification becomes real
B2/D4 graduating a YT format + PK OAuth act ─→ Slice C (currently deferred per D3)
First natural B-roll render ─→ Slice E
```
**Ordering rule (unchanged, PK-confirmed): S7 before B2.**

### 4.2 Parallel
WS-3 prep (view + reconciliation) ∥ WS-6 ∥ WS-5 (RPC + population) ∥ WS-4 design work ∥ docs
hygiene — all independent of S7. S5 evidence window runs passively throughout. Standing
constraint: one writer per edge function; same-EF lanes serialise at the PK deploy gate.

### 4.3 PK decision points (rev-2 state)
| # | Decision | Status |
|---|---|---|
| P-1 | Ratify this rev-2 brief (definitions §1.1, matrix §1.2 with D1–D4 as recorded, workstreams, gates) | **OPEN — the final ratification act** |
| P-2 | 13-rung contract as formal proof authority | **CLOSED — ratified 2026-08-01 (§1.4)** |
| P-3A | S7 scope approval + packet amendment (§0 exemption clause) + freeze + full review chain | Resolves at P-1 ratification; produces the frozen packet + hashes |
| P-3B | **Separate** PK T3 apply authorisation for S7, against the exact reviewed packet and hashes | **OPEN — never bundled with P-1/P-3A** |
| P-4 | OQ4 disposition | **DECIDED 2026-08-01 — Option A (supersede); see §4.4. Record: `docs/briefs/results/p4-oq4-disposition-decided-v1.md`** |
| P-5A | Asset Gap live-writer + scheduler scope approval + freeze + review | Resolves at P-1 ratification; produces the frozen packet |
| P-5B | **Separate** PK apply authorisation for the Asset Gap live writer/scheduler | **OPEN — never bundled** |
| P-6 | Specialist charter + first mission | **CLOSED — approved 2026-08-01; mission = PP YT kinetic (D4)** |
| P-7 | WS-5 first consumer | **CLOSED — operator template-intake validation** |
| P-8 | **Interim containment only (redefined):** whether to pause PP text (FB/LI) and/or PP YT kinetic-family publishing between now and S7's P-3B apply. Default = no action (S7 is imminent and D1/D4 give both cells owned treatments); PK may elect containment if P-3B is delayed | **OPEN — optional, default no-action** |

### 4.4 P-4: OQ4 decision-ready treatment (Track-B / cc-0079 queue currency)
**The question:** Track-B's Slice-2 data-cleanup queue (format-mix table hygiene) has an
unresolved currency ruling — its only record is stale, and Slice A named it a STOP.
**What changed since:** S7's code-level guard fail-closes bad mix rows *regardless* of table
state (the S7 brief itself: cleanup becomes "less urgent but not moot").

**Options (pick one at or after P-1):**
- **Option A — supersede (RECOMMENDED):** rule that S7's guard supersedes Track-B Slice-2 as the
  *safety* control; demote the data cleanup to a named hygiene carry (unblocks Slice A
  immediately upon S7 apply; the stale rows become confusing-but-inert data, cleaned in a later
  T2 lane).
- **Option B — re-cut then proceed:** require a fresh re-verification of the Track-B queue
  against live tables before Slice A resumes (adds one read-only lane; safest-looking but
  duplicates what S7's guard already enforces mechanically).
- **Option C — hold:** keep OQ4 as a Slice-A STOP pending a separate Track-B session (slowest;
  preserves the original sequencing intent).

Recommendation: **A**, on the grounds that a mechanical fail-closed guard at the allocation
boundary is strictly stronger than data cleanliness as a control, and the cleanup retains value
only as hygiene.

**PK RULING (2026-08-01): Option A — supersede.** S7's live guard (v6.106,
`m.build_weekly_demand_grid`) is now the safety control; Track-B Slice-2 data cleanup is demoted
to a named hygiene carry, cleaned in a later T2 lane. **Both of Slice A's original STOP reasons
(S7 absent; OQ4 ambiguous) are now cleared — Slice A is unblocked.** Resumption itself (the §1.1
zero-code enrolment proof) remains a separate, not-yet-scoped execution lane. Record:
`docs/briefs/results/p4-oq4-disposition-decided-v1.md`.

---

## 5. Definition of Done — per workstream (rev-2)

- **WS-1:** every 🎯 cell state-1; D1/D2 declaration lanes executed with evidence; **the
  zero-code capability-enrolment proof completed on a previously unenrolled existing brand**
  (empty CE code diff); S5 evidence-window findings recorded and routed into WS-3.
- **WS-2:** amended guard live; PP + NDIS before/after matrices rerun on the amended predicate —
  text cells allocate (D1), unsupported video/carousel candidates do not; `format_override`
  slots + instagram's unchanged row confirm non-regression; rollback proven; diagnostic lane
  named.
- **WS-3:** analyzer live on a governed schedule (via P-5A/P-5B); secret-free read view serving
  the backlog; ONE register (DB-generated); every non-ready target cell routed to an owner; ≥1
  gap row observed open→resolved through the live loop.
- **WS-4:** PP YT kinetic designed → operator-transposed → registered → probe-rendered → PK
  visual verdict → graduated (or an honest FAIL with recorded cause); permanence decision made.
- **WS-5:** governed write RPC live; 2–3 proven templates carry calibrated constraints; the
  intake-validation consumer demonstrably reads them during WS-4's registration; zero inert
  fields.
- **WS-6:** shared indicator renders all seven states correctly; nothing else rebuilt.

**Milestone 1 (Governed Boundary Complete)** = §1.1 three-state criterion holds across the
matrix. **Milestone 2 (Ultimate)** = additionally, every committed cell is state-1 or explicitly
PK-re-deferred, and the enrolment proof is done. Both measured by the readiness queue.

---

## 6. Execution order — next 2–3 weeks

**Week 1 — enforce and activate (nothing expands yet):**
1. **P-1 final ratification** of this rev-2 brief (P-3A and P-5A resolve with it).
2. **WS-2:** amend S7 packet (exemption clause) → freeze → full review chain → **stop at P-3B**
   (separate PK sitting authorises the apply against the frozen hashes) → apply → matrix
   verification.
3. **WS-3 in parallel:** read view (T2) + register reconciliation (T1); live-writer/scheduler
   packet through P-5A review → **stop at P-5B**.
4. **WS-6 in parallel:** Slice F.
5. **Docs hygiene (T1):** land S6 governing brief, S7 brief, Slice-A brief/result, this brief on
   `main`; reconcile v6.94; correct the stale cc-0046 doc. Cut the P-2 ratification pointer.
6. **WS-4:** specialist begins the PP YT kinetic design package (design work needs no gate).

**Week 2 — expand on the fixed boundary:**
7. **WS-1:** resume Slice A (OQ4 per P-4) → zero-code enrolment proof on the chosen brand.
   Begin **B2 tranche 1** (respect `task_05bf8b3d`). Execute D1/D2 declaration lanes.
8. **WS-4:** operator transposition sitting (PK in Creatomate) → registry capture → probe
   renders, with WS-5's intake validation consuming the declared contract.
9. **WS-5:** write RPC + first constraints populated (calibrated by the WS-4 probes where they
   overlap).

**Week 3 — prove and measure:**
10. **WS-1:** B2 tranche 2; D3 deferrals recorded; if PK elects, Slice C's OAuth prerequisite.
11. **WS-4:** PK visual verdict → graduation of the kinetic template → PP YT kinetic cell
    closes (D4 complete).
12. **Programme Board review against the matrix:** readiness queue re-read. Milestone-1 check:
    every non-ready target cell state-2 or state-3. Residual state-3 rows on committed cells =
    the exact remaining distance to Milestone 2.

Throughout: Convention-1 pointer entries only; result docs canonical; no new planning briefs —
implementation packets only at apply gates; **P-3B and P-5B are never folded into another
approval.**

---

## 7. Programme Board (standing — update at each register cut, pointer-style)

| Programme | Current state | Owner lane | Blockers | Next milestone |
|---|---|---|---|---|
| Capability Expansion (incl. S5 evidence window) | Active — B1 done; S7 live; Slice A unblocked (resumption not yet scoped); B2 held pending Slice A | S6 | `task_05bf8b3d`; Slice A resumption scoping | Slice A resumed + enrolment proof + B2 tranche 1 |
| S7 Capability Enforcement | **COMPLETE — applied/live-proven v6.106** | S7 | none | Guard live + amended-predicate matrices verified (met) |
| Asset Gap | Activation (substrate built, idle) | New lane (WS-3) | P-5A→P-5B; read view | Live detector + one register |
| Creatomate Specialist | **Charter approved**; first mission designated (PP YT kinetic) | New lane (WS-4) | Operator transposition sitting (PK) | First template graduated |
| Template Metadata | Foundation exists; consumer decided (intake validation) | New lane (WS-5) | Write RPC | First governed metadata consumed at WS-4 registration |
| Dashboard Visibility | **Complete — Slice F landed** | Dashboard lane | none | None — WS-6 scope closed |

*(Owner-lane note: Capability Expansion = **S6**; S4 is NDIS controlled render, a different lane.)*
*(Dashboard Visibility closed 2026-08-01 — Slice F was found already landed on `invegent-dashboard`
`origin/main` `aa8209f` (2026-07-29); independently re-verified, zero code change needed from this
programme. Register: v6.100, result: `docs/briefs/results/slice-f-seven-state-indicator-verification-result-v1.md`.)*

---

## 8. Standing risks (carried, monitored, not blocking ratification)
- ~~PP text + PP YT kinetic degrade continues until P-3B lands~~ — **RETIRED 2026-08-01**: S7
  landed (v6.106); PP's YouTube kinetic-family degrade is now structurally excluded, PP text is
  D1-governed and allocating. P-8 interim containment is now moot (per its own redefinition).
- NDIS `client_format_config` enables two unsupported animated formats with no guard — S7 closes
  the allocation edge (live). The config rows are Track-B hygiene material — **now formally a
  named T2 hygiene carry, not a Slice A precondition** (P-4 Option A, decided 2026-08-01).
- Provider-side template deletion invisible in-repo (row-17 precedent) — WS-4's future CI-4
  slices are the durable answer; the WS-4 mission's registry capture must record provider
  identity + probe evidence for exactly this reason.
- Render reliability (row-19 timeouts, 2-min ceiling, EF wall-clock poll) — Slice E when
  triggered; D4's kinetic graduation must record render-reliability evidence as part of rung
  proof.
- Shared-worktree / register-collision hazards — claim-stub + source-truth hooks remain the
  standing mitigations.

— End v1 rev-2 — awaiting final PK ratification (P-1; P-3B/P-4/P-5B/P-8 remain separate acts) —
