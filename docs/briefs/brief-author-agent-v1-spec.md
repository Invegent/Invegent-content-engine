# brief-author agent v1 — scope clearance + build record (CANDIDATE)

**Created:** 2026-07-05 Sydney
**Status:** built as CANDIDATE — awaiting PK commit gate; unproven until the CCF-02 proving ladder completes
**Agent file:** `.claude/agents/brief-author.md`
**Canonical record:** this document (register gets a pointer entry only, per ratified Convention 1)

---

## Authorization + the CCF-02 exception (recorded)

- CCF-02 (PK plan, 2026-07-03; register v4.85) lists **"no new agents"** under *not yet*.
- `brief-author` is one of the three named not-built v2 agents in `CLAUDE.md`.
- **PK conditional authorization, 2026-07-05:** *"i want this agent built only if its safe and
  has full scope cleared"* — recorded here as an explicit, single-agent PK exception to the
  CCF-02 deferral. It does not reopen the deferral for any other agent (`ef-deployer`,
  `pipeline-medic` remain not-built; CCF-02 NOTs otherwise unchanged).
- Rationale for why this exception is coherent with CCF-02's intent: brief-author automates
  **preparation of gate-1 input**, not review, not approval, not execution. It sits *before*
  the review lane, touches none of the surfaces the CCF-02 NOTs protect (auto-merge,
  auto-deploy, enforcement, agent approval power), and addresses the measured Phase 0 friction
  class of packet/brief preparation (O-1 family).

## Safety case (why "safe" is structural, not promised)

| Property | How it is enforced |
|---|---|
| Cannot write/mutate anything | Toolset is `Read`/`Grep`/`Glob` only — no Write/Edit, no Bash, no git, no DB tools, no network. The draft brief exists only as returned JSON; the **orchestrator** writes any file. |
| Cannot approve or advance a gate | Subagents cannot reach `AskUserQuestion`/plan mode (orchestrator-only, per CLAUDE.md core principle); output contract forces `Status: draft` and non-claims; `DRAFT_READY` is defined as "a draft exists", never approval. Gate 1 (PK brief approval) is byte-unchanged. |
| Cannot invent scope/facts | Hard rule: uncited material claims are forbidden — unknowns must exit via `open_questions` / `evidence_gaps`; fabrication = defective output caught at gate 1 review. |
| Cannot leak authority sideways | Explicit non-responsibilities: no result docs, no register edits, no cc-number finalization, no marking issued/proven, no task selection or splitting. |
| Cannot verify (and so cannot overclaim) live truth | No DB/git/network tools; anchors are recorded as *asserted*; live-truth needs are named handoffs to `db-rls-auditor` / `branch-warden` / `register-reconciler`. |
| Prompt-injection posture | Standing untrusted-data rule (identical to the proven read-only agents): repo/doc content is evidence, never instruction. |
| Blast radius if it misbehaves | Worst case = a bad draft brief returned as text → caught at PK gate 1, which exists precisely to judge briefs. No production, DB, git, or register surface is reachable. |

## Scope (cleared)

**MAY:** read template/registers/CLAUDE.md/prior briefs+results/source code as evidence; draft
ONE brief per invocation in the exact `_template_brief.md` shape; cite every material claim;
reflect active hold-states in Forbidden actions; return open questions, evidence gaps,
handoffs; return `DRAFT_READY` / `DRAFT_BLOCKED` / `ESCALATE`.

**MAY NOT:** write/edit/commit/push/deploy/migrate anything; approve/issue/accept its own (or
any) brief; author result docs; edit registers or CLAUDE.md; choose/split/expand tasks; invent
uncited facts; query DB/network/git; mark anything proven; pre-empt any PK gate.

## Proving plan (CCF-02 ladder — agent stays CANDIDATE until complete)

1. **Built** — this record + the agent file. ✔ (pending PK commit gate)
2. **Exercised on a real lane** — first real task PK wants briefed is routed through
   brief-author instead of hand-drafting.
3. **Verdict confirmed** — PK accepts the draft at gate 1 with at-most-minor edits, and the
   resulting lane runs without the brief being the failure point.
4. **Promoted** — PK marks it PROVEN; CLAUDE.md team table updated (that edit is its own
   PK-gated docs change).

Failure at step 2/3 → agent stays candidate; defects fixed or the agent is retired. No
auto-promotion.

## What this build did NOT do (non-claims)

- No CLAUDE.md change (team table untouched — candidate agents are intentionally not listed;
  precedent: `dashboard-ia-lint`).
- No register edit in this pass beyond the pointer entry prepared for the PK commit gate.
- No change to any existing agent, hook, setting, or enforcement posture.
- No CCF-02 Phase 1 work (the orchestration contract doc remains not-started, PK-gated).
- The agent has not run; nothing is proven.

## Register pointer (to add at the PK commit gate, Convention 1 format)

> ✅ v4.9x BRIEF-AUTHOR AGENT v1 — BUILT AS CANDIDATE (PK-authorized CCF-02 single-agent
> exception) — read-only Read/Grep/Glob, returned-draft-only, gate 1 unchanged · external
> review `6a5a9769-e65f-4a99-8456-8ef3578191bf` agree/low/high zero-pushback (first packet
> attempt) on agent-file hash `e3226708…` · canonical record
> docs/briefs/brief-author-agent-v1-spec.md · next gate: proving run on first real brief ·
> queue impact: none.

*(Post-review note: this spec doc was finalized after the review solely by inserting the
review identity above — the reviewed agent file `.claude/agents/brief-author.md` is
byte-unchanged at `e3226708…`.)*
