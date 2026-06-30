# Brief cc-0026 — ICE × Claude Code Integration, Phase 1 (mechanical guards + bootstrap)

**Created:** 2026-06-30 Sydney  
**Author:** Claude Code (orchestrator)  
**Executor:** Claude Code  
**Status:** draft — awaiting PK approval (gate 1)  
**Directive:** CCF-01 — Directive 002 (Directive 001 approved; U1–U6 decided)  
**Result file:** `docs/briefs/results/cc-0026-ice-cc-phase1.md` (created on completion)

---

## Task

Implement the smallest evidence-backed slice of ICE × Claude Code integration: **one auto-firing
session bootstrap (SessionStart) plus three incident-derived mechanical guards (PreToolUse)**, each
built on the proven `sql-content-gate.mjs` dual-mode pattern, shipped log-only first and flipped to
enforcing only on its own evidence under a PK gate. This brief is the governed plan; **no
implementation begins until PK approves it.**

The integration is governed by the one-page Charter (§A) and executed per the Phase 1 spec (§B).
Approved Directive-001 decisions are baked in: U1 track `.claude/hooks/`; U2 governed wiring lives in
a committed `.claude/settings.json`; U3 commit-to-`main` WARNs (never BLOCKs); U4 minimum 3 real ICE
sessions of clean log-only evidence per guard before any enforcing flip; U5 bootstrap reads
`docs/00_sync_state.md` + `docs/00_action_list.md` only for Phase 1; U6 this brief is `cc-0026`.

## Source context

- `docs/briefs/_template_brief.md` — brief format this file follows.
- `.claude/hooks/sql-content-gate.mjs` — **the proven pattern to clone**: dual-mode
  (`--log-only` dry-run → enforcing), fail-closed (internal error → exit 2 / block), cheap
  early-exit on non-match, co-located `.test.mjs`.
- `.claude/hooks/sql-content-gate.test.mjs` — test-harness shape to mirror.
- `.claude/settings.local.json` — existing (gitignored) wiring of the sql-gate; **left untouched**.
- `CLAUDE.md` — ICE orchestration contract; **not modified in Phase 1**.
- Incident basis (each guard maps to a dated, real failure):
  - deploy 502 — `supabase functions deploy` without `--no-verify-jwt` flips `verify_jwt`→true,
    breaking `x-series-key`-only callers (Series v2 live 502). See CLAUDE.md "Standing ICE deploy/DB
    gotchas".
  - worktree node_modules junction — `git worktree remove --force` on a junctioned `node_modules`
    deleted the **main** repo's node_modules (2026-06-22; memory `dashboard-worktree-node-modules-junction-hazard`).
  - shared-worktree branch race — HEAD switched mid-task, a commit landed on the wrong branch
    (memory `shared-worktree-branch-race`); observed live again on 2026-06-30 (HEAD advanced
    `ac73e45 → cb955d5` mid-inspection).

## Scope

**In scope (Phase 1):** four hook scripts + tests, one committed wiring file
(`.claude/settings.json`), tracking `.claude/hooks/` in git, the graduation rule, and the
rollback/removal criteria. Inform/block only.

**Out of scope (deferred — see §F):** any Skill / Workflow-orchestration layer; worktree
*governance* (ownership/merge — Phase 4); MCP `deploy_edge_function` deploy surface; any agent
change; lowering, automating, or bypassing any existing gate; CLAUDE.md edits; register schema
changes.

---

## §A — ICE × Claude Code Charter (one page)

**Principle.** *Automate repetitive mechanics. Preserve engineering judgment.* Automation reduces
operator effort; engineering quality comes from evidence and human review.

**Rule 1 — Evidence before expansion.** No capability expands because it looks useful; it must show
measurable operational value in live ICE use first.

**Rule 2 — Negative evidence is first-class.** Capabilities that fail to earn their place are frozen
or removed, not retained. Optimise for simplicity, not capability count.

**Rule 3 — Inform or block, never approve.** Automation may gather context, warn, block a
deterministic mistake, or invoke a specialist. It may **never** approve a deploy, pass a PK /
deployment / review gate, classify GREEN/AMBER/RED, replace external review, or substitute for
judgment. **Human governance remains authoritative.**

**Rule 4 — Separate mechanics from judgment.** Mechanical (branch checks, context loading, command
validation) → automatable. Judgment (evidence interpretation, production readiness, approval) →
human-led.

**Layers (each capability lives in exactly one):** Constitution (`CLAUDE.md`) · Workflow
Orchestration · Specialist Analysis (read-only auditors) · Mechanical Guards · Parallel Development.

**Decision framework — every capability must answer yes to all four:** (1) solves a demonstrated
problem? (2) success objectively measurable? (3) failure objectively detectable? (4) benefit exceeds
ongoing maintenance cost?

**Removal is symmetric.** A capability is simplified or deleted on tripwire evidence: repeated
bypass, frequent false positives, declining use, rising maintenance, operator preference for manual,
or any measurable quality regression. A bypassed guard indicts the guard's design, not the operator.

---

## §B — Phase 1 implementation spec

**Build pattern (fixed by precedent — clone `sql-content-gate.mjs`):** each hook is a self-contained
`.mjs` with a co-located `.test.mjs`; dual-mode **`--log-only` (never blocks, appends a WOULD-decision
to a log) → enforcing**; **fail-closed** on internal error (guards block; bootstrap stays silent);
cheap early-exit on non-match so the `Bash` matcher does not tax every shell call. Each guard
graduates to enforcing **individually**, per §D.

### §B.1 — Exact files proposed (Deliverable: file-by-file)

**Add — hook scripts (committed; U1 makes `.claude/hooks/` a tracked dir):**

| File | Surface | Role |
|---|---|---|
| `.claude/hooks/session-bootstrap.mjs` | `SessionStart` | Inform-only context loader |
| `.claude/hooks/session-bootstrap.test.mjs` | — | Test |
| `.claude/hooks/deploy-verify-jwt-guard.mjs` | `PreToolUse` / `Bash` | Guard 1 |
| `.claude/hooks/deploy-verify-jwt-guard.test.mjs` | — | Test |
| `.claude/hooks/worktree-junction-guard.mjs` | `PreToolUse` / `Bash` | Guard 3 |
| `.claude/hooks/worktree-junction-guard.test.mjs` | — | Test |
| `.claude/hooks/commit-branch-guard.mjs` | `PreToolUse` / `Bash` | Guard 2 |
| `.claude/hooks/commit-branch-guard.test.mjs` | — | Test |

**Add — governed wiring (U2):** `.claude/settings.json` (new, committed) — wires the four hooks.

**Untouched:** `.claude/settings.local.json` (existing sql-gate wiring stays), `CLAUDE.md`, all
registers, all agents.

### §B.2 — Guard behaviours (Deliverable: guard behaviours)

| # | Capability | Trigger | Behaviour | Never |
|---|---|---|---|---|
| 0 | **Session bootstrap** | session start | **Inform only.** Emits to session context: branch, short HEAD, detached-HEAD flag, `git status` dirty-count, ahead/behind vs upstream, worktree count, and the *heads* of `docs/00_sync_state.md` + `docs/00_action_list.md` "as recorded". | Never blocks, never reconciles, never approves. |
| 1 | **Deploy `--no-verify-jwt` guard** | `Bash` cmd contains `supabase functions deploy` | **BLOCK** if `--no-verify-jwt` absent, citing the 502. Else no decision. | Never approves a deploy (deploy stays a PK hard stop). |
| 2 | **Commit-branch guard** | `Bash` cmd contains `git commit` | **BLOCK** if HEAD detached; **WARN** branch + ahead/behind; commit-to-`main` = **WARN, not BLOCK** (U3 — docs/register lane is legitimate). | Never infers intended branch; never approves. |
| 3 | **Worktree junction guard** | `Bash` cmd contains `git worktree remove` | Resolve target; if `<target>/node_modules` is a junction/reparse point → **BLOCK** with the runbook (remove junction first, PowerShell not cmd). Unresolvable target → **fail-closed BLOCK** + manual-verify. | Never approves; never auto-removes anything. |

### §C — Inform-or-block-never-approve (explicit)

**Every Phase 1 hook may only inform or block. No hook may approve any action, and no hook may pass,
satisfy, or substitute for a PK gate, a deployment gate, or a review gate.** Guard 1 blocking a
malformed deploy is *not* approval of a well-formed one — deploy remains a manual PK hard stop.
Bootstrap only surfaces state; it makes no judgment and grants no permission.

### §D — Log-only → enforcing graduation rule (U4)

1. Each hook is wired in `--log-only` (or, for bootstrap, inform-only) when first committed.
2. A guard may flip to **enforcing** only after **≥ 3 real ICE sessions** of clean log-only evidence
   for *that* guard — "clean" = its dry-run log shows zero false-positive WOULD-blocks of legitimate
   work and zero misclassifications.
3. Each flip is **per-guard and independent** — one guard graduating does not graduate the others.
4. **Each enforcing flip is a separate PK gate** (§G). The executor presents the dry-run evidence;
   PK authorises the flip. The executor never flips autonomously.
5. Bootstrap is inform-only and has no enforcing mode, so no flip gate applies to it.

### §E — Rollback / removal criteria

- **Instant de-risk (no removal):** flip the offending guard back to `--log-only` (one wiring edit).
- **Full removal:** unwire the hook from `.claude/settings.json` and delete its script + test;
  record in the register at closure.
- **Triggers (any one):** ≥ 2 false-positive blocks of legitimate work; any repeated operator
  bypass of the guard; dry-run evidence that it would mis-fire; or maintenance cost exceeding the
  friction it removes. Per Charter Rule 2, negative evidence → revert. A bypassed guard indicts the
  guard, not the operator.

### §F — Deferred / out-of-scope (explicit)

- MCP `deploy_edge_function` deploy surface (different mechanism; no CLI flag).
- Any Skill / Workflow-orchestration capability (e.g. ICE Review, ICE Handover).
- Worktree governance: ownership, merge protocol, branch lifecycle, cleanup (Phase 4).
- Any new or modified specialist agent.
- Any change to CLAUDE.md, register schemas, or existing gates.
- Lowering, automating, or auto-passing any PK / deploy / review gate.

---

## Allowed actions (this brief / Phase 1, post-approval)

- Create the four hook scripts + tests and the committed `.claude/settings.json` per §B.1.
- Track `.claude/hooks/` in git (U1).
- Wire all four hooks in `--log-only` / inform-only mode initially.
- Run local tests and dry-run evidence collection.

## Forbidden actions

- No enforcing-mode wiring at first commit (log-only/inform-only only).
- No autonomous enforcing flip — every flip is a PK gate (§G).
- No edits to `CLAUDE.md`, `settings.local.json`, registers, or agents.
- No deploy, migrate, merge, or push as part of Phase 1.
- No hook may approve an action or pass any PK/deploy/review gate.
- Honour all active hold-states in `docs/00_sync_state.md`.

## Success criteria

- Four hooks committed with passing co-located tests; `.claude/hooks/` tracked; wiring in committed
  `.claude/settings.json`; existing sql-gate wiring unchanged.
- Each guard demonstrably blocks its target incident class in dry-run and does not fire on benign
  commands.
- Measurable reduction in the three incident classes recurring, and reduced session-start
  context-gathering, **without** any increase in gate bypasses, bypass-inducing false positives, or
  review rework. Engineering quality unchanged or improved.
- Each enforcing flip occurs only after ≥ 3 clean sessions (U4) and a PK gate (§G).

## §G — PK approval gates

1. **Gate 1 — plan approval (this brief).** No implementation begins until PK approves cc-0026.
2. **Gate 2..n — enforcing flips.** Each guard's `log-only → enforcing` flip is its own PK gate,
   presented with that guard's ≥3-session dry-run evidence. The executor prepares; PK authorises.
3. **Commit/push of Phase 1 artifacts** follows standard ICE policy (commit on PK instruction; push
   a hard stop) — not performed in this directive.

## Stop condition

This directive (CCF-002) ends at **brief created**. The executor stops here and awaits PK approval
(Gate 1). No hooks, no `.claude/settings.json`, no `.claude/hooks/` changes, no registers, no
commits.

---

## Notes

- Numbering: brief files run to `cc-0020`; referenced tokens extend to `cc-0025`; `cc-0026` is the
  next non-colliding number (U6).
- Dependency order for implementation (post-Gate-1): (1) `session-bootstrap` (inform-only, zero
  block risk, immediate value); (2) `worktree-junction-guard` (highest blast radius); (3)
  `deploy-verify-jwt-guard`; (4) `commit-branch-guard`. Each guard then runs its own §D dry-run →
  Gate-2 flip.
- Residual risk (Guard 2): it cannot deterministically know the *intended* branch, so it only
  hard-blocks the unambiguous hazard (detached HEAD) and informs otherwise — accepted, stated.
- Windows junction detection (reparse point vs symlink) must be tested against a real dashboard
  worktree before Guard 3's enforcing flip.
