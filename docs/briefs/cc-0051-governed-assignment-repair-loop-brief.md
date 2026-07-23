> ## 🔖 CANONICAL ID: **cc-0051** — renumbered 2026-07-24 (governance recovery lane)
> **Former ID:** `cc-0047`. Same collision and rule as the successor brief
> (`cc-0051-governed-execution-spine-coverage-brief.md`); see that header and the collision
> ledger in `docs/briefs/results/governance-recovery-lane-2026-07-24-result-v1.md` §3.
> This document remains **SUPERSEDED / WITHDRAWN** — the renumber changes its identity only,
> never its status.

> ⛔ **SUPERSEDED / WITHDRAWN 2026-07-22 by PK direction.** The assignment-repair framing is
> **not** authorized to build. Findings A/B/C in §3 are ACCEPTED and stand as evidence; they are
> carried forward into the successor brief. Retained for audit only — do not execute anything here.
> **Successor:** `docs/briefs/cc-0047-governed-execution-spine-coverage-brief.md`
> (Governed Execution-Spine Coverage & Repairability Classification).

# Brief cc-0047 — Governed Assignment Repair Loop (Phase 1, proposal-only) — SUPERSEDED

**Created:** 2026-07-22 Sydney
**Author:** Claude Code (orchestrator-direct — see §0 substitution note)
**Executor:** Claude Code + PK gates
**Status:** draft — **awaiting Gate-1 PK decision on the §3 reframe before any build**
**Lane classification (CCF-02):** SAFETY_GATE (a self-healing loop that writes governance config) · **Tier: T2 for Phase 1 (proposal-only, no production write); any apply is T3**
**Result file:** `docs/briefs/results/cc-0047-governed-assignment-repair-loop.md` (created on completion)

---

## 0. Provenance and substitution note

- Canonical repo verified by `git fetch` at draft time: **`origin/main` = `8a885df`** (3 commits *ahead* of the seed packet's expected `b3065c5`; `b3065c5` confirmed an ancestor). The local working checkout is **20 behind** origin and carries 280 changed paths, so **every evidence read in this brief was taken from `origin/main` via `git show`/`git grep`, not the working tree.**
- Next free brief number confirmed by enumerating every `cc-NNNN` on `origin/main`: `cc-0045` exists only as a migration, `cc-0046` is the newest brief → **cc-0047 is free.**
- **Builder substitution (named per CCF-02 R1):** drafting was orchestrator-direct rather than via `brief-author`, because the decisive evidence required live `execute_sql` reads and worker-source greps that `brief-author` (Read/Grep/Glob, no DB) cannot perform. Gate 1 is unchanged — this brief only proposes.
- **Nothing was mutated.** All DB access was read-only (`ice_ro` wrapper for catalog, `execute_sql` SELECT-only for `c.*`/`m.*`). No migration, no DML, no deploy, no commit.

## 1. Task

Design the first governed self-healing repair loop for gap tickets classified `(subject_kind=assignment, failure_state=unassigned)` → `remediation_route=config_repair`, as proposed in the cc-0047 seed.

**The read-only investigation returned a result that changes the lane's premise.** The three named carousel fixtures are *mechanically* correctly classified but are **not** repairable by an assignment write, and repairing them as proposed would close the tickets **without changing any production behaviour**. Gate 1 is therefore a decision gate on §3 before it is an approval to build.

## 2. Source context

| Source | Why it matters |
|---|---|
| `docs/briefs/results/cc-0046-orthogonal-gap-classification.md` (origin/main) | The classifier substrate; §7b–7d record all three T3 applies LIVE |
| `supabase/migrations/20260703035154_create_select_template_v1.sql` | The authoritative decision chain (filters a–f) — the contract this lane must satisfy |
| `supabase/migrations/20260720200000_cc0044_cpd_invegent_quote_card_assignment_and_proof_v1.sql` | The **only** precedent for creating an assignment; the canonical apply + rollback shape |
| `supabase/functions/image-worker/index.ts` (carousel branch, ~L1030–1078) | The live carousel production path — **does not consume `select_template`** |
| `public.record_tmr_proof_event` (live) | The governed proof writer; validates platform proofs, **does not validate `visual_approval`** |
| `public.run_asset_gap_analysis` (live) | The **only** function that sets `status='resolved'` — the governed reconciliation/close mechanism |
| `CLAUDE.md` | Tiering, review chain, PK gates, R0 read path |

## 3. Live fixture evidence — and the two findings that reframe the lane

### 3.1 Fixtures reconfirmed (live, 2026-07-22)

All four open rows match the seed exactly. The three carousel rows:

| Ticket | Client / platform / format | Pair | Route / automation | Confidence |
|---|---|---|---|---|
| `0532d311` | care-for-welfare-pty-ltd / facebook / carousel | `(assignment, unassigned)` | `config_repair` / `operator_manual` | conclusive |
| `3b7b0d36` | care-for-welfare-pty-ltd / linkedin / carousel | `(assignment, unassigned)` | `config_repair` / `operator_manual` | conclusive |
| `273626e5` | invegent / linkedin / carousel | `(assignment, unassigned)` | `config_repair` / `operator_manual` | conclusive |

(`22d3df93` PP/YouTube is `(platform_config, misconfigured)` — **out of Phase-1 scope**.)

`select_template` for all three returns `fail_closed` / `no_selectable_template` with **three** rejected candidates, all `no_assignment`:
`generic_carousel_cover_1x1_v1` (`15ef4676`), `generic_carousel_body_1x1_v1` (`fcdf3bb3`), `generic_carousel_closing_1x1_v1` (`756a5b89`) — plus warning `platform_suitability_unproven`.

All three templates: `scope=generic`, `status=smoke_rendered`, `fit_status=strong_candidate`, suitability rows present for facebook/instagram/linkedin at `candidate` (non-negative → passes, warns). Each has exactly **one** assignment — `property-pulse`, `visually_approved`, `generic_allowed`, `approved_by=PK` — each with a passed `visual_approval` proof. CFW and Invegent have none.

`resolve_slot_assets` was evaluated read-only for **all 12** (client × platform × template) combinations: **12/12 `ok`**. CFW resolves a governed logo (`cfw_logo_mark_colour_plate`) and a governed background (`bg_cfw_brand_texture_navy_waves`). **There is no hidden asset or appetite blocker behind the assignment gap.**

### 3.2 FINDING A — an assignment write cannot repair this gap (structural)

`select_template` filter **(d)** admits only `assignment_status ∈ (visually_approved, client_enabled, production_proven)`; `proposed` → `assignment_not_approved`, `approved` → `not_visually_proven`. Filter **(e)**, which runs immediately after, requires a `c.creative_template_proof_event` row with `proof_type='visual_approval'`, `proof_status='passed'`, bound to **that** `assignment_id`.

Therefore an assignment row alone **always** moves the rejection from `no_assignment` to `not_visually_proven` — never to selectable. The only precedent (`20260720200000`, cc-0044 CP-D) writes **both**, and carries an explicit anti-fake guard plus a header recording that it was applied *only after* a real Creatomate render (`3db0351b`) passed PK's visual gate.

Critically, `record_tmr_proof_event` validates `platform_render`/`platform_publish` evidence against real `m.*` success rows, but applies **no such validation to `visual_approval`** — it requires only a non-empty, non-payload string. **The visual rung is an unfalsifiable human attestation by design.** Any loop that writes it autonomously would be manufacturing proof — the ICE false-proof failure mode, in the one place the schema cannot catch it.

**Consequence:** the repair unit is `assignment + visual proof`, and its second half is irreducibly a PK visual gate. This lane can automate *up to* that gate; it can never automate *through* it.

### 3.3 FINDING B — production never reads the thing this repair would write (decisive)

`select_template` is called at exactly four call sites across all edge functions. Every one hardcodes its format:

- `image-worker/index.ts:809` (smoke) and `:928` (production) — `p_format: 'image_quote'`
- `video-worker/index.ts:994` and `:1177` — `B1_VIDEO_GOVERNED_FORMAT`

**No call site passes `carousel`.** The live carousel branch (`image-worker/index.ts` ~L1038–1077) selects drafts on `recommended_format='carousel'` and renders via `callContentAdvisor()` → `buildCarouselSlideScript()` — a hand-built Creatomate script taking `clientName`/colours/`logoUrl` from `getBrandAndSlug` + `resolveLegacyLogo`. It touches no template registry, no assignment, no `resolve_slot_assets`.

**So assigning the carousel templates to CFW and Invegent would change nothing that renders.** It would flip `select_template`'s answer, the analyzer would stop detecting the gap, and `run_asset_gap_analysis` would auto-close all three tickets — producing a green board with **zero capability gained**, and destroying the only signal that carousel is not on the governed spine.

This is precisely the standing ICE failure mode *"a control declared, recorded, and scored PASS while no worker path reads it — valid only if provably read by production; grep the worker first."* The grep was run; it fires.

**The material gap is not a missing assignment. It is that `carousel` has never been onboarded to the TMR governed spine.** `(assignment, unassigned)` is the honest *mechanical* reading of `select_template`'s output; it is a **true but non-actionable** diagnosis, because the classifier reasons over the governed spine while carousel production runs on the legacy ungoverned path.

### 3.4 FINDING C — ticket count ≠ repair count

Assignment identity is `(template_id, client_id)` — **not** per-platform (unique index `creative_template_client_assignment_uq` on `(template_id, COALESCE(client_id, zero-uuid))`). Carousel is a **three-part composite** (cover/body/closing), all `format_key='carousel'`.

So the three tickets collapse to **two** repair units — CFW (3 assignments + 3 proofs, closing **both** the fb and li tickets at once) and Invegent (3 assignments + 3 proofs). Any proposal object and reconciliation model must be N:M from the start, not 1:1.

### 3.5 Secondary observations (not blockers, but PK should see them)

- **Tie-break is deterministic but semantically arbitrary.** All three templates share an identical `created_at` (`2026-07-02 12:42:40.43611+00`), so ranking falls through to `id ASC` — which happens to pick `cover`. PP's live call confirms: `selected=cover`, `alternatives=[closing, body]`. That is exactly the "incidental order" the seed warns against; it is stable, but it is not a *reason*.
- **A single-part assignment would make `select_template` return `ok` with zero alternatives** — a nominally-selectable but structurally incomplete carousel. Partial repair is worse than none here.
- **Visual proof is not platform-scoped.** Filter (e) does not filter on `platform`; PP's proofs are all `platform='facebook'` yet satisfy the LinkedIn call. A facebook-only visual approval currently unlocks every platform.
- **Write surface is clean.** No DB function and no edge-function code writes `c.creative_template_client_assignment`; the only writers are PK-gated migrations/`execute_sql`. Table grants are `service_role` + `inspector_ro` read, RLS enabled, no `anon`/`authenticated`.
- **R0 coverage gap.** `information_schema` is privilege-filtered for `ice_readonly`, so schema `c` returns 0 rows through `scripts/db-read.py`; `pg_catalog` routes fine. Per CLAUDE.md this is a signal for a future `ice_ro` view, not a workaround.

## 4. DECISION PACKET — settle before the brief is approved to build

The seed's Phase-1 objective ("determine whether an existing template can safely be assigned… then prepare a precise, reviewable change packet") is *executable* — but on the three named fixtures it would prepare a packet whose apply is cosmetic. PK must choose the lane's shape.

| | Option | What it does | Cost / risk |
|---|---|---|---|
| **A** | **Reclassify, don't repair** | Treat `(assignment, unassigned)` on an **ungoverned format** as a distinct diagnosis (e.g. `failure_state=unassigned` + a `spine_coverage=ungoverned` evidence flag, or a new `subject_kind=format_governance`). The three tickets route to `capability_backlog`, not `config_repair`. No repair loop is built yet. | Small, additive, T2. Fixes a real classifier blind spot. Leaves zero Phase-1 fixtures for a repair loop. |
| **B** | **Build the loop; find honest fixtures first** | Build the proposal-only engine as specified, but gate its fixture set on a **spine-coverage precondition** (the format must be read by a live `select_template` call site). Today that admits only `image_quote` and the governed video format — for which **no `(assignment, unassigned)` ticket currently exists**. | Correct engine, but currently **zero live fixtures** — it would be proven on synthetic/hermetic cases only. |
| **C** | **Onboard carousel to the spine first** | A separate code lane routes the carousel branch through `select_template`/`resolve_slot_assets` (as `image_quote` was under Option D). Then the three tickets become genuinely repairable, and the repair loop has real fixtures. | Largest. A T3 worker change touching live rendering for 3 clients. This is the work the tickets actually represent. |
| **D** | **Proceed as seeded** | Prepare assignment+proof packets for CFW and Invegent as-is. | **Not recommended.** Requires manufacturing three visual proofs per client for renders that production will never use, then auto-closing three tickets with no capability change. Violates the false-proof and declared-control-never-read rules. |

**Recommendation: A now, then B — with C opened separately as the real carousel work.** A is small, additive, and repairs a genuine classifier blind spot cc-0046 could not have seen (it reasons over `select_template`, which cannot know whether a *caller* exists). B then builds the engine on an honest precondition. C is a product decision about whether carousel is worth governing at all, and should not ride inside a repair-loop lane.

**This brief specifies the Phase-1 engine (§5–§12) so that it is ready to build the moment PK picks B or C.** Under A alone, §5–§12 are deferred and the lane delivers only the reclassification.

## 5. Scope

**In scope (Phase 1):** a **proposal-only** repair engine for `(assignment, unassigned)` / `config_repair` tickets — read live state, enumerate candidates, apply deterministic eligibility + selection rules, emit a reviewable proposal object with apply SQL, rollback SQL, proof matrix and staleness fingerprint, and surface it to PK. Plus (under Option A) the spine-coverage precondition and its classifier expression.

**Out of scope:** any assignment/proof/suitability/status write · closing or resolving any ticket · template creation · image or video sourcing · the backgrounds-only drain · browser automation · deploy or merge · NDIS-sensitive expansion · the PP/YouTube `platform_config` ticket · the diverged `invegent-dashboard` main and orphaned `AddTemplateDraftWizard.tsx`.

## 6. Allowed actions (Phase 1)

- Read-only DB (R0 wrapper for catalog/views; `execute_sql` SELECT-only for `c.*`/`m.*`).
- Read repo/registers/worker source from `origin/main`.
- Author the proposal engine and its rollback/proof artifacts **in an isolated worktree**, unapplied.
- Emit proposal objects as files/JSON for PK review.
- Run hermetic proofs against an ephemeral PG instance.

## 7. Forbidden actions (Phase 1) — non-negotiable

- No `INSERT`/`UPDATE`/`DELETE` on `c.creative_template_client_assignment`, `c.creative_template_proof_event`, `c.creative_template_platform_suitability`, or `m.asset_gap_suggestion`.
- **No autonomous `visual_approval` proof event, ever** — under any status, evidence string, or automation flag (§3.2). A proof asserts PK looked at a render.
- No `apply_migration`, no `execute_sql` write, no `deploy_edge_function`, no merge, no push.
- No ticket status transition; no `run_asset_gap_analysis` with `p_dry_run=false`. **Gotcha:** the reconcile dry-run skips the write path, so FK/CHECK errors surface only at `p_dry_run=false` — dry-run success is not apply-safety evidence.
- No template creation, no status promotion, no suitability edit, no sourcing, no drain activation, no browser automation.
- Nothing marked proven, approved, or resolved as a side effect.
- Active hold-states untouched: NDIS production video enablement OFF; diverged dashboard main; orphaned template-draft wizard.

## 8. Proposal contract (the canonical object)

Emitted as a file + JSON; **no new table in Phase 1** (smallest safe additive solution — `m.asset_gap_suggestion` already carries the diagnosis, and a proposal that is never auto-applied needs no durable row). A table becomes justified only when proposals must survive across sessions or be queued.

| Field | Notes |
|---|---|
| `proposal_id`, `created_at`, `engine_version` | identity |
| `source_tickets[]` | **array** — N:M per §3.4 (CFW's unit closes two) |
| `client_slug` / `client_id`, `platform[]`, `format` | target |
| `diagnosis{subject_kind, failure_state, evidence_confidence, classifier_version}` | echoed, not re-derived |
| `spine_coverage{is_read_by_production, call_sites[]}` | **§3.3 precondition — a proposal with `false` is emitted as BLOCKED, never as applyable** |
| `proposed_assignments[]` | one per composite part; each `{template_id, name, variant_key, assignment_scope, assignment_status}` |
| `candidate_evidence[]` | per template: scope/status/suitability/proof/existing-assignment/`resolve_slot_assets` verdict, each with the query that produced it |
| `selection_rationale` | the rule that chose it, and the rules that eliminated the rest |
| `residual_blockers[]` | **must** list the `visual_approval` requirement per §3.2 |
| `current_state_fingerprint` | hash over every fact the decision depends on (§10) |
| `apply_sql`, `rollback_sql` | exact, in-transaction, guarded |
| `proof_matrix` | §11 |
| `risk_tier`, `expires_at` | T3 for any apply |
| `pk_decision`, `post_apply_proof`, `reconciliation_result` | filled after the gate, never by the engine |

## 9. Candidate eligibility and deterministic selection

**Eligibility — all must hold, each machine-checked against live state, no field invented:**
`scope='generic'` (or provably reusable) · `status ∈ (smoke_rendered, visually_approved, platform_safe, client_enabled, production_proven)` · a `creative_template_platform_suitability` row exists for **every** target platform with `suitability_status ∉ ('not_suitable','blocked')` · no existing assignment for `(template_id, client_id)` · no `client_blocked`/`deprecated`/`blocked` state · `resolve_slot_assets(client, platform, format, template)` returns `ok` for **every** target platform · **and** `spine_coverage.is_read_by_production = true`.

**Selection determinism — never incidental array order:**
1. **Composite-completeness first.** If the format's candidate set is a composite (carousel = cover+body+closing), the unit is the **whole set**; a proposal that would assign a strict subset is **refused**, not ranked (§3.5).
2. Exact `format_key` match, then `fit_status='strong_candidate'`.
3. Strongest platform suitability across *all* target platforms (`production_proven` > `platform_safe` > `candidate`/`unknown`/`needs_review`).
4. Precedent: a template already `visually_approved` for another client on the same variant (evidence of a working shape) ranks above one with no precedent.
5. Stable tie-break `(created_at ASC, id ASC)` — **recorded as a tie-break, never reported as a reason.**
6. **Refusal rule:** if ≥2 candidates remain materially equivalent for the same composite role, the engine **refuses to choose** and emits an ambiguous proposal for PK. Ambiguity is never resolved autonomously.

## 10. Staleness and concurrency

The proposal carries `current_state_fingerprint` = a hash over: ticket `status` + `(subject_kind, failure_state)` + `classifier_version`; each candidate's `status`/`scope`/suitability rows; the full assignment set for each `(template_id, client_id)`; each `resolve_slot_assets` verdict; and the `spine_coverage` call-site set.

**Pre-apply revalidation (mandatory, at the T3 gate, immediately before apply):** recompute the fingerprint; **any** difference → STOP and void the proposal. Additionally re-confirm: ticket still `open`; diagnosis still `(assignment, unassigned)`; no conflicting assignment now exists; suitability unchanged; the mutation is still required.

**Race-resistant apply:** a single transaction, guarded like the cc-0044 precedent — an explicit pre-INSERT count guard that raises on any existing `(template_id, client_id)` assignment, plus post-assert counts before commit. The unique index `creative_template_client_assignment_uq` is the backstop. Fail closed; never `ON CONFLICT DO NOTHING` (silent no-op would be reported as success).

## 11. Post-apply proof matrix (for the eventual T3 gate)

| # | Proof | Pass condition |
|---|---|---|
| 1 | Exact intended assignment(s) exist | one row per proposed part, exact status/scope/approved_by; count == proposed |
| 2 | No collateral rows | assignment + proof table counts changed by exactly the proposed delta; no other client/template touched |
| 3 | `select_template` advances | rejection is no longer `no_assignment`; **expected to become `not_visually_proven` until the PK visual gate** (§3.2) — recorded as expected, not as failure |
| 4 | After the visual gate only | `select_template` returns `ok`, `selected` == the intended part, `alternatives` == the remaining composite parts |
| 5 | No new blocker | `resolve_slot_assets` still `ok` for every target platform; no new warning class |
| 6 | Analyzer agreement | `run_asset_gap_analysis(p_dry_run=true)` counters change exactly as predicted |
| 7 | Governed close only | the ticket closes **solely** via `run_asset_gap_analysis` (the only function that sets `status='resolved'`) — never by direct UPDATE |
| 8 | Isolation | every other client/platform/format ticket and diagnosis byte-unchanged |
| 9 | **Capability proof** | a real render for the repaired client/format demonstrably takes the governed path — **this is the proof that fails today under Option D and is the reason for §4** |

## 12. Rollback

Delete the proof event(s) first (FK `ON DELETE SET NULL` would orphan otherwise), then the assignment row(s), scoped to exactly the `(template_id, client_id)` pairs written — mirroring the cc-0044 precedent's rollback block. Never delete or overwrite a pre-existing assignment: the pre-INSERT guard guarantees the engine only ever creates rows it can safely remove. After rollback, **re-run the full §11 matrix** and confirm the ticket returns to `open` with the original diagnosis.

## 13. STOP conditions (any one halts the lane and surfaces to PK)

Fingerprint mismatch at revalidation · ticket no longer `open` or diagnosis changed · a conflicting assignment appeared · `spine_coverage.is_read_by_production = false` · materially equivalent candidates remain (§9.6) · a composite would be partially assigned · `resolve_slot_assets` not `ok` on any target platform · rollback cannot be proven before apply · any non-clean review verdict · unexpected origin movement · **any suggestion to write a `visual_approval` proof without a PK-reviewed render.**

## 14. Phased rollout

- **Phase 0 (this brief):** read-only investigation + §4 decision. **← we are here.**
- **Phase 1:** proposal-only engine + hermetic proofs, isolated worktree, nothing applied. T2. Full review chain (`db-rls-auditor` + `branch-warden` + external review pinned to hash).
- **Phase 2:** first real apply — one client, one composite set, PK visual gate for each part, §11 matrix, rollback proven first. **T3, its own gate.**
- **Phase 3:** repeat for the second client only after Phase 2's §11 #9 passes.

## 15. Success criteria (Phase 1)

- PK has ruled on §4.
- If B or C: the engine emits, for every in-scope ticket, either a complete proposal that survives adversarial review or an explicit BLOCKED/AMBIGUOUS return naming the missing precondition.
- Every eligibility claim is backed by a live query recorded in the proposal; zero invented fields.
- Hermetic proof that the selection rules are order-independent (shuffled candidate input → identical output) and that the refusal rule fires on a synthetic tie.
- Rollback proven by apply→rollback→zero-orphans on a hermetic instance **before** any T3 gate.
- Nothing applied, closed, deployed, or merged.

## 16. Stop condition

Report per `docs/briefs/_template_result.md`, then stop. **The next gate is the §4 PK decision — not a build authorization.**

---

## Notes

- Any Phase-2 apply is `execute_sql` at a T3 gate (`apply_migration` is harness-deny-listed) with a post-hoc ledger backfill, per the cc-0044/cc-0046 precedent.
- The §3.5 platform-scoping observation on `visual_approval` proofs is a **separate** governance question. It is noted, not fixed here.
