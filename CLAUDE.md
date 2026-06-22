# ICE — Orchestration Contract (subagent team v1)

This file governs how the **orchestrator** (the main Claude Code loop) drives the ICE
subagent team. It is the standing contract for command-and-review automation:
**agents reduce cognitive load; PK stays at every irreversible gate.**

## Core principle

> Subagents are pure functions: input → structured findings. The orchestrator owns
> every human gate and every external gate. No subagent asks PK, deploys, merges, or
> mutates production.

Human-in-the-loop tools (`AskUserQuestion`, plan mode) and the external-review decision
live **only at the orchestrator level** — subagents cannot reach them. A subagent's
only output is its returned JSON.

## The team (v1 — built)

| Agent | Mode | May | May NOT |
|---|---|---|---|
| `ef-builder` | write, isolated worktree | edit/write code, run local checks | deploy, migrate, push, merge |
| `branch-warden` | read-only | inspect git state | mutate any ref |
| `db-rls-auditor` | read-only | run SELECT/catalog reads, advisors | DML/DDL, apply migration, deploy |
| `security-auditor` | read-only | security triage: classify exposure, caller/blast-radius, GREEN/AMBER/RED, design remediation batches + D-01 packets | apply migration, REVOKE/GRANT, ALTER FUNCTION, write DB, edit repo, close findings |
| `creative-graph-auditor` | read-only (`Read`/`Grep`/`Glob`) | static-audit the Creative Library v2 declarative object graph (`docs/creative-library/*.json` + `registry-schema-v2.md`): JSON/schema shape, key uniqueness, reference resolution, evidence-SHAPE, runtime-import guard, vendored-registry drift; return a PASS/FAIL/ESCALATE verdict | query the DB, verify live render logs, judge style-guide conformance, approve/mark-proven any creative object, mutate/commit/deploy |

**Security triage lanes:** use `security-auditor` **after** `db-rls-auditor` has gathered the DB
evidence — `db-rls-auditor` collects facts (grants, defs, advisors); `security-auditor` adds the
cross-repo caller analysis, the intended-principal call, blast-radius, and the GREEN/AMBER/RED
remediation-batch + D-01 packet. **`security-auditor` is PROVEN** (2026-06-16 — D-2026-06-16-002
**Phase 1b** `store_linkedin_org_token` search_path triage: classified the lane GREEN, caught and
corrected the earlier `gen_random_uuid()` / `search_path=''` assumption (PG13+ core built-in),
produced D-01 readiness + proof/rollback reasoning, no hard-rule violations).

**Creative Library static lane:** use `creative-graph-auditor` on any Creative Library v2 registry
change BEFORE the PK gate. It is the **static** counterpart to `db-rls-auditor`: it analyses the
declarative object graph (`style_guide → patterns + assets → template_families → variants →
evidence`) for shape, key uniqueness, reference resolution, evidence-SHAPE, the runtime-import guard
(no production worker may read the declarative registry), and vendored-registry drift, and returns a
PASS/FAIL/ESCALATE verdict. It does **not** query Supabase, verify live `m.post_render_log` rows,
validate RLS/grants, audit `resolve_brand_assets()` runtime behaviour, judge style-guide
**conformance**, approve or mark `proven` any creative object, or mutate/commit/deploy — live DB /
asset / render truth is a handoff to `db-rls-auditor`, and brand-conformance judgment stays with PK.
**Status:** built and committed (`37021c5`); its spec was exercised manually in the A1.4 lane
(registers v3.90) because the agent-type was not registered as invocable that session — not yet run
as a registered subagent.

**Status:** all three original v1 agents are **PROVEN**. `branch-warden` (logic exercised inline in
the v3.55 lane, then run as a subagent across the ef-builder proof) and `db-rls-auditor`
(live read-only smoke test, project `mbkmaxqhsohbtwsqolns`) are proven. **`ef-builder` is
PROVEN** as of the 2026-06-15 proof lane (commit `353f221`, a test-only `dedupeByMessageId`
regression in `parser_test.ts`): isolated worktree → ef-builder edit → targeted test
(12/12) → branch-warden `safe` → fast-forward merge + push to main. The next code task can
treat the code lane as routine.

Not yet built (v2, do not assume they exist): `ef-deployer` (gated, non-autonomous),
`brief-author`, `pipeline-medic`.

## External review gate (cross-model adversary)

Before **any** risky action, the orchestrator calls `ask_chatgpt_review`
(`mcp__5c3caad6-6105-4a61-819a-d18615a18d43__ask_chatgpt_review`). Risky =
production SQL (DML/DDL), EF deploy, config change affecting clients, or any plan with
multiple coordinated steps. Rules:

1. **Call on the FINAL diff/plan.** If `ef-builder` changes the diff after a review,
   re-call. Never treat an approval of an earlier diff as still valid.
2. The bridge auto-escalates to PK on disagree / high risk / low confidence / refusal /
   timeout. Treat any non-clean verdict as **stop → surface to PK**.
3. Reviews are idempotent per UTC day on identical inputs — fine for cost; do not
   exploit it to skip re-review after a change.
4. **`reviewed_input_hash` is mandatory.** Every review result/report must record the
   hash of the **exact** packet/diff it reviewed. A review is valid **only** for that hash:
   if the packet/diff changes, the review is **stale** and must be re-run. The orchestrator
   STOPs when `reviewed_input_hash` ≠ the current packet/diff hash (this machine-enforces
   rule 1 — an approval never carries across a change).
5. **Mandatory triage classification.** Every review result must carry one or more of these
   triage classes (ranked when more than one applies) — a non-clean verdict is never handled
   generically:
   - `concrete_defect` — a real bug in the diff/plan.
   - `missing_evidence` — a claim is unverified.
   - `structural_DDL_DML_escalation` — touches DDL/DML / schema / grant state.
   - `policy_decision` — a judgment call, not a defect.
   - `scope_design_concern` — out-of-scope or architectural.
   - `runtime_verification_required` — needs post-deploy/post-apply proof.

**Triage routing** (the orchestrator routes by class):

- `concrete_defect` → **stop → fix → re-review**.
- `missing_evidence` → **stop → gather evidence → re-review**.
- `structural_DDL_DML_escalation` → **PK judgment gate** (hard stop).
- `policy_decision` → **PK decision gate** (PK decides; not a defect to "fix").
- `scope_design_concern` → **PK / product decision gate**.
- `runtime_verification_required` → proceed **only if** an explicit post-deploy/post-apply
  verification gate is named; otherwise treat as stop.

## PK gates (hard stops — orchestrator must pause for PK)

- **Plan approval.** Before executing a multi-step plan, present it (plan mode) and wait.
- **Deploy / merge / migrate.** This is a HARD STOP. The orchestrator prepares the exact
  command and preconditions, runs external review, then **stops for PK**. PK runs or
  authorises the irreversible step. Deploy is where past incidents happened; it stays manual.

## Standing ICE deploy/DB gotchas (enforce at the gate)

- `supabase functions deploy` without `--no-verify-jwt` flips `verify_jwt`→true and
  breaks `x-series-key`-only callers (401→502). Confirm the flag in any EF deploy plan.
- Revoking from `PUBLIC` alone is insufficient — also `REVOKE ... FROM anon, authenticated`
  for service-role-only objects.
- Reads over REST against an unexposed schema fail with PGRST106 — route via RPC or an
  exposed schema.
- Migration name = permanent identity. A revision gets a NEW number + distinct name,
  never the same name with different SQL.
- Re-verify HEAD/branch before any commit (shared-worktree race); prefer isolated worktrees.

## The proof lane (v1 end-to-end flow)

```
PK gives task
 → orchestrator drafts brief (docs/briefs/_template_brief.md format) → PK approves (gate 1)
 → ef-builder: local-only change in an ISOLATED worktree
 → branch-warden: verify HEAD / branch / parity / diff   (verdict must be "safe")
 → db-rls-auditor: review IF the DB was touched          (verdict must be "pass")
 → orchestrator calls ask_chatgpt_review on the final diff/plan
 → PK approves/rejects (gate 2 — deploy/merge HARD STOP)
 → only then: deploy/merge (PK-run)
 → orchestrator writes result (docs/briefs/_template_result.md format)
```

The orchestrator parses each subagent's JSON verdict and only advances when it is clean;
any `stop`/`block`/`concerns` or non-clean external review halts the lane and surfaces to PK.

## The docs-only register lane (first-class, lighter than the code lane)

Surgical edits to docs/registers (e.g. `00_sync_state.md`, `00_action_list.md`, session
notes) do **not** need `ef-builder` or an isolated worktree. This lane is proven (v3.55):

```
PK gives docs/register task (verify-or-abort, exact payload)
 → orchestrator reads LOCAL HEAD (authoritative) → verify-or-abort on exact anchors
 → orchestrator applies surgical edits directly on main (no worktree, no ef-builder)
 → branch-warden in mode "authorized-main-docs": confirm HEAD/parity + file set == approved set
 → readback + diff verification (changed files must equal the approved set, nothing else)
 → commit only on PK instruction; push only on explicit PK instruction
```

Rules for this lane:

- **Local HEAD is authoritative.** The GitHub/MCP bridge and remote state can be **stale** —
  never treat them as source of truth for a local apply. Derive anchors from local files.
- **Surgical only.** No full-file re-emission, no historical rewrite; touch exactly the
  approved file set.
- **Verify-or-abort.** If any supplied anchor does not match local exactly → STOP and
  return the actual local lines for a re-cut. Never approximate or hand-reconcile.
- **Commit-message policy.** Use the **exact** message PK specifies. Do **not** append a
  `Co-Authored-By` trailer (or any trailer) to register/docs commits unless PK explicitly
  asks. (The default harness trailer caused friction in v3.55.)
- **Push is still a hard stop.** Local commit on PK instruction; push only when PK says so.
  On push rejection (diverged remote), do NOT force-push — inspect the remote commit
  read-only, and only fast-forward/rebase when provably conflict-free, else surface to PK.
