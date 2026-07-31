# Brief cc-NNNN — dashboard-schedule-readiness-canonical

**Created:** 2026-07-31 Sydney
**Author:** chat (orchestrator reconciliation — no subagent build performed; read-only research via 4 parallel Explore agents, synthesis by orchestrator)
**Executor:** PK (decision only) — no build executor named yet; this brief's own "in scope" is documentation reconciliation, not a code lane
**Status:** draft — reconciliation brief, PK Gate-1 decision requested
**Result file:** `docs/briefs/results/cc-NNNN-dashboard-schedule-readiness-canonical.md` (created on completion)

> Registrar assigns the final `cc-NNNN` + register version via the claim-stub protocol; this draft never self-numbers.

---

## Why this brief exists

PK asked to reconcile four overlapping threads — `dash-sched-editor-p1`, `platform-readiness-summary-v1`, "S5/S6 capability-gap and schedule requirements", and the standing ruling that portfolio-mix/repetition controls wait for a governed CE mechanism — into ONE canonical dashboard product definition, classify the existing branches/docs, and name the single next Gate-1 outcome. **No code was written for this brief.** The finding, ahead of everything else: **most of the requested product surface is already live.** This brief's job is to state that plainly, stop it from being re-briefed as new work, and name the one real gap.

## Task

Define, in one place, the canonical shape of the ICE dashboard's Schedule & Readiness operator surface — what it must show (schedule visibility/editing, platform×format readiness, blocked-capability reasons, Asset Gap routing, evidence/proof-window status) and what it must never show (portfolio-mix/repetition weighting controls) — by naming which live artifacts already satisfy each requirement, which artifacts are historical stages of the same lane, and which are dead ends. This is a **reconciliation document**, not a build brief: four live production surfaces already jointly satisfy the outcome; the only concrete follow-on work is closing a documentation/register gap (see "Recommended next Gate-1 outcome").

## Source context (evidence, by reconciliation thread)

**Thread 1 — `dash-sched-editor-p1` (schedule visibility + editing):**
- `docs/briefs/authoritative-weekly-schedule-editor-phase-1-brief-v1.md` + `docs/briefs/results/authoritative-weekly-schedule-editor-phase-1-result-v1.md` — Phase 1 (`format_override` column, `save_week_format_override` RPC, extended `get_week_format_allocation`, edited `m.materialise_slots`) is **APPLIED LIVE** on production project `mbkmaxqhsohbtwsqolns`; the dashboard "Format Plan" tab (`WeekFormatPlanTab.tsx`) shipped to `invegent-dashboard@main` (`79e063d`), corroborated independently by `docs/00_sync_state.md:168`. This is durable **schedule *intent*** — the Advisor may still override the format downstream until a Phase-2 resolver is built (unbuilt; the only exception is a single hard-pinned property-pulse YouTube case, `docs/briefs/results/schedule-driven-governed-video-goldenpath-result-v1.md`).
- `docs/briefs/dashboard-schedule-platform-format-planning-surface-gate1-v1.md` (lane label **S2** in the control-tower v2 board) and `docs/briefs/dashboard-schedule-slice-a-allocation-panel-implementation-packet-v1.md` (lane label **S6** in that same board) are the earlier, narrower, read-only "Slice A" scoping brief and implementation packet that Phase 1 was built additively on top of (Phase 1 names the Slice-A wrapper as its seed source and extends it with a new migration identity, per its own §Source context). Same lineage, earlier stage — not a competing design.
- `docs/briefs/schedule-cap-controls-brief-v1.md` — an adjacent, separate lane (posting-cadence/cap controls, same `/clients` tab neighbourhood) — not part of this reconciliation's format-editing scope, noted only to avoid conflation.
- **Gap found (git-verified, not previously recorded):** the Phase-1 brief + result docs are **untracked** in the working tree and exist only on the unmerged local branch `cc-sched-editor-p1` (HEAD `9af1100`). That branch was cut before ~240 files' worth of later migrations landed on `main` and is now badly stale — a direct merge would fight all that intervening history. `docs/00_sync_state.md` and `docs/00_action_list.md` carry **no register pointer at all** for this lane; I grepped both files for `format_override` / `weekly format` / `schedule editor` / `Slice A` and found no headline entry.

**Thread 2 — `platform-readiness-summary-v1` (platform×format readiness):**
- `docs/briefs/results/client-platform-readiness-summary-result-v1.md` — a coarser client×platform (4-platform) capability panel, live on `/clients` Schedule tab, merged `a8ebd05`, Vercel `dpl_8R4hNrh5av4k6pDBY3Ueoudz6eUW` READY.
- `docs/briefs/cc-0088-client-production-readiness-queue-brief-v1.md` + `docs/briefs/results/cc-0088-client-production-readiness-queue-result-v1.md` — the finer client×platform×format superset. Per cell: scheduled demand, next occurrence+source, pause/release state, publisher readiness, capability status+reason, runtime reachability, template winner, eligible-template count, required/declared/resolver-reachable asset counts, **missing proof/governance gate** (this is the evidence-window status — see Thread 3), **owning remediation lane** (this is the Asset Gap routing — 8 named lanes), next required outcome, and a coarse overall state (Ready/Blocked/Waiting-for-proof/Not-configured). **LIVE**: CE migration `20260730120000_client_production_readiness_queue_rpc_v1.sql` applied to production (`5f9131c`); dashboard tab merged `fc9c5c9`, Vercel `dpl_Depi6PAekXru9yWEumsFM4d5UftK` READY. Full review chain clean (`db-rls-auditor`, `branch-warden`, `dashboard-ia-lint` WARN-non-blocking, external review, `security-auditor` GREEN). `docs/00_sync_state.md` v6.78 and `docs/00_action_list.md` both confirm 🟢 LIVE (T2 · PRODUCT_PROOF) as the current, unsuperseded status.
- **This is the dashboard's canonical platform×format readiness surface.** cc-0088 is a strict superset of the client-platform-readiness-summary panel's grain; the summary panel is not superseded (still live, still used), but any NEW readiness work should extend cc-0088, not the coarser summary.

**Thread 3 — "S5/S6 capability-gap and schedule requirements":**
- **Ambiguity resolved, not guessed away:** lane letters S1–S9 are reused across at least four unrelated PK routing generations in `docs/00_sync_state.md` (the cc-0079 control-tower-v2 board where S5=Slice-2 harness re-cut / S6=Schedule Slice A; the capability-demand-architecture routing where S5=Shared Capability Contract classifier owner / S2=dashboard indicator / S8=Asset Gap / S9=Capability Enforcement; the image-intake pipeline stages; and the unrelated cc-0046 duplicate-ID case). **No literal "S5/S6 capability-gap" lane exists as one label.** The best-fit reading: PK means the **capability-demand-architecture generation**, where **S5 = the Shared Capability Contract classifier** (backend truth) and the dashboard-facing half is **S2 (Format Capability Indicator)**, not a schedule-arc "S6."
- `public.classify_format_capability` (`docs/briefs/shared-capability-contract-classifier-gate1-v1.md` + publisher-path-extension) — the **live backend truth source**: SECURITY DEFINER, service_role-only, composing `select_template` + `resolve_slot_assets` + `m.post_publish` evidence into one of `ready · asset_shortage · template_missing · pipeline_missing · governance_unproven · unsupported_silent_degrade · publisher_path_missing` (plus fail-closed `unknown`). Ships dark — no enforcement is wired to it (enforcement, S9, is entirely backend, no dashboard surface).
- **Format Capability Indicator v1** (`docs/briefs/format-capability-indicator-v1-brief.md` + result) — the **live dashboard surface**, `CapabilityCell.tsx` on the Format Plan tab, showing Desired vs. Capability with the exact blocker reason (e.g. "Planned — blocked by capability"), production-smoke-confirmed.
- `global-format-capability-pyramid-slice1b-ui-brief.md` — an older design doc; its shape shipped as the still-live `/create/format-capability` diagnostics page (52 cells, 9 evidence layers), confirmed as the **durable owner** after cc-0046's competing matrix was retired dark 2026-07-22 (memory `cc-0046-capability-matrix-activated.md` verified correct).
- **This is the dashboard's canonical "blocked-capability reasons" surface**, and it is already the mechanism cc-0088 reads from — the two threads are not separate work, cc-0088 *composes* the capability classifier's output.

**Thread 4 — portfolio-mix/repetition-controls ruling:**
- `docs/briefs/results/creatomate-global-capability-map-v2-delta.md:31` (2026-07-31, most current) — verbatim: *"Dashboard mix-weight design (Template Portfolio Mix / Repetition Controls) — Explicitly PK-paused — governing CE mechanism (portfolio-weight policy) not yet decided."* No named mechanism exists yet (no mix-weight table, no resolver, no policy schema) — this is an acknowledged gap, not a pointer to something already designed.
- Repeated as an explicit forbidden/out-of-scope line in `docs/briefs/cc-0088-client-production-readiness-queue-brief-v1.md:63,80`, `docs/briefs/creatomate-global-solid-background-structural-fix-brief-v1.md:79`, and `docs/briefs/creatomate-global-announcement-card-graduation-brief-v1.md:36,316`. **Scope is GENERAL** — a project-wide dashboard exclusion, not domain-specific.
- `t.platform_format_mix_default` (schedule/platform format-mix allocator, `docs/00_action_list.md:591`) is a **related but distinct** concept from template-portfolio mix — do not conflate; both are excluded, for different, separately-tracked reasons.
- The B-roll "no recent-use avoidance" item (memory `broll-rotation-mechanics-and-scope-trap.md`) is a **different, already-resolved, domain-specific** mechanism (video clip selection statelessness), fixed and live as of 2026-07-29/30 — it is not this ruling and must not be cited as precedent for lifting it.

## Scope

**In scope (this brief only):**
- Naming the canonical live artifact for each of the five required outcome elements (schedule visibility/editing, platform×format readiness, blocked-capability reasons, Asset Gap routing via cc-0088's owning-remediation-lane field, evidence/proof-window status via cc-0088's missing-proof-gate field).
- Classifying every reconciled document/branch as CANONICAL / SALVAGE / SUPERSEDED / DISCARD (table below).
- Recording the standing portfolio-mix/repetition-controls exclusion as a permanent, general boundary on this surface.
- Naming the one real outstanding gap and the next Gate-1 decision PK needs to make.

**Out of scope (do NOT build, propose, or imply):**
- Any code change, migration, dashboard edit, or IA restructure — this is a documentation-only reconciliation.
- Any portfolio-mix-weight or repetition-avoidance control, in the dashboard or elsewhere, until the governed CE mechanism from Thread 4 is separately designed and PK-approved.
- Any redesign of `t.platform_format_mix_default`, the format-mix allocator, or Phase-2 downstream format authority (cc-0079 §2.1/2.2 remains the governing boundary; unchanged by this brief).
- Merging, rebasing, or force-pushing the stale `cc-sched-editor-p1` branch — that is a named follow-on decision, not authorized by this brief.

## Allowed actions

- Read repo/docs/registers as evidence (already performed for this draft).
- Write this brief and its eventual result doc.

## Forbidden actions

- No deploy, apply, migrate, merge, or push — nothing in this reconciliation touches production, and the standing PK deploy/merge/migrate HARD STOP (`CLAUDE.md`) is unaffected.
- No implying that the portfolio-mix/repetition exclusion (Thread 4) is close to lifting — it stays paused until a named governed mechanism is separately proposed and gated.
- No treating `dash-sched-editor-p1`, `platform-readiness-summary-v1`, or the capability-indicator lanes as needing a rebuild — they are live; re-briefing them as new work would duplicate shipped production surfaces.

## Success criteria

- Every one of the six requested outcome elements maps to a named, evidence-cited, live artifact or an explicit named gap (done — see Source context + table below).
- Every reconciled document/branch carries exactly one classification (done — table below).
- Exactly one next Gate-1 outcome is named, with no ambiguity about which decision it asks PK to make (done — see final section).

## Stop condition

Report per the result template once PK has read this brief; no further action without a fresh PK instruction.

---

## Lane / document / branch classification

| Artifact | Classification | Why |
|---|---|---|
| `authoritative-weekly-schedule-editor-phase-1-brief-v1.md` + result | **CANONICAL** | Current governing spec for schedule format-editing; DB+dashboard live; untracked/unmerged (the gap) |
| `dashboard-schedule-platform-format-planning-surface-gate1-v1.md` (S2/control-tower) | **SALVAGE** | Superseded scoping doc; historically useful, not the current spec |
| `dashboard-schedule-slice-a-allocation-panel-implementation-packet-v1.md` (S6/control-tower) + its apply/deploy results | **SALVAGE** | Superseded implementation stage Phase 1 built on top of; artifact it shipped (the wrapper RPC) is still live and still in use |
| `schedule-cap-controls-brief-v1.md` + result | **CANONICAL (separate lane)** | Live, but posting-cadence/cap controls — not part of this reconciliation's format-editing scope |
| `client-platform-readiness-summary-result-v1.md` | **CANONICAL (coarser precedent)** | Live client×platform panel; superset (cc-0088) exists for new work, this stays live as-is |
| `cc-0088-client-production-readiness-queue-brief-v1.md` + result | **CANONICAL** | The dashboard's platform×format readiness, blocked-capability-reason, Asset-Gap-routing, and evidence/proof-window surface — all in one live artifact |
| `shared-capability-contract-classifier-gate1-v1.md` + publisher-path-extension + results | **CANONICAL** | Live backend truth source every readiness/capability surface reads from |
| `format-capability-indicator-v1-brief.md` + result | **CANONICAL** | Live dashboard capability-gap surface |
| `global-format-capability-pyramid-slice1b-ui-brief.md` | **SALVAGE** | Design-only; its shape shipped as `/create/format-capability`, this file itself is historical |
| `s9-capability-enforcement-architecture-gate1-v1.md` + build results | **CANONICAL (backend, no dashboard surface)** | Live enforcement; not itself a dashboard artifact, cited for completeness |
| `creatomate-global-capability-map-v2-delta.md` | **CANONICAL** | Most current statement of the portfolio-mix/repetition-controls exclusion |
| `cc-0046` capability matrix (flag-gated code) | **DISCARD (retired dark)** | Superseded by `/create/format-capability`; code retained but inert, do not resurrect |
| `broll-rotation-mechanics-and-scope-trap.md` (memory) | **DISCARD for this purpose** | Real and resolved, but a different, domain-specific ruling — not evidence for lifting Thread 4 |
| branch `cc-sched-editor-p1` (local, unmerged, HEAD `9af1100`) | **SALVAGE — needs surgical extraction, not a merge** | Holds the only copies of the Phase-1 brief/result docs; stale relative to `main` by ~240 files of later migrations — a direct merge would fight unrelated history |
| branch `lane/ai-worker-schedule-authority-pin` | **SUPERSEDED (already captured on main)** | Its commit `ba2973f` is an ancestor already reachable on `main`'s history per `git log`; no unique unmerged content found |

## Notes

**Terminology guard.** "S5"/"S6" are not stable identities in this repo — the same letters have named at least four different things across different PK routing generations. Future briefs should stop reusing bare lane letters as if they were permanent IDs; cite the `cc-NNNN` or file path instead.

**What this brief deliberately does NOT do.** It does not propose merging the three live-but-separate readiness/capability tabs (`WeekFormatPlanTab`, the client-platform-readiness-summary panel, cc-0088's Production Readiness Queue) into one unified surface. That is a real IA question (the dashboard now carries three related-but-distinct readiness/capability tabs on `/clients`, and `operator-journey-ia-v1.md` has zero mentions of "readiness" per the platform-readiness-summary research), but it is a NEW scope decision, not a reconciliation of existing rulings, and is named as the alternate Gate-1 option below rather than assumed.

---

## Recommended next Gate-1 outcome

Two candidate next steps were surfaced by this reconciliation; PK picks one (or declines both and leaves the surface as-is):

1. **Narrow docs-only register-reconciliation (T1, recommended default).** Surgically extract the two Phase-1 documents (`authoritative-weekly-schedule-editor-phase-1-brief-v1.md`, its result doc) from the stale `cc-sched-editor-p1` branch onto current `main` (no merge — a direct cherry-pick of the two files, since the underlying DB/dashboard changes are already live independent of git), add the missing register pointer entries to `docs/00_sync_state.md`/`docs/00_action_list.md`, and retire the `cc-sched-editor-p1` and `lane/ai-worker-schedule-authority-pin` branches once confirmed fully captured. This closes a real, verified paperwork gap and creates zero product risk.
2. **IA unification design pass (T2, only if PK wants it now).** A read-only `dashboard-ia-lint`-gated scoping brief for whether the three separate readiness/capability tabs should become one operator surface, updating `operator-journey-ia-v1.md` to actually document "readiness" (currently undocumented despite two live tabs). This is new design work, not implied by anything already ruled — PK must explicitly ask for it.

Default recommendation is **(1)** — it is the only item this reconciliation found that is unambiguously unfinished and low-risk; (2) is a genuine open product question this brief surfaces but does not resolve on PK's behalf.
