# Brief cc-NNNN — apply-harness-auditor (Gate-1 authoring brief for a NEW candidate ICE subagent)

**Created:** 2026-07-25 Sydney  
**Author:** brief-author (returned draft; orchestrator S9 persists)  
**Executor:** PK (Gate-1 decision only) — no build hand assigned by this brief  
**Status:** ✅ **GATE 1 APPROVED (PK, 2026-07-25)** · **build QUEUED behind Slice 2 (O-4 RESOLVED — not opened now)** · **O-1 RESOLVED: v2 positive fixture, v3/v4 negative controls**  
**Dependency (blocks build-lane open):** cc-0079 Slice 2 applied + proven, then PK lifts the lane-count-freeze-at-nine for this build. Build-design questions O-2/O-3/O-5/O-7 resolve at build-lane open, not now.  
**BUILD LANE OPENED (PK → S9, 2026-07-25):** dependency satisfied (Slice 2 applied+proven), freeze lifted for S9, may run parallel to dashboard/video/AGP (local-only, read-only, zero production-mutation authority). **O-2/O-3/O-5/O-7 RESOLVED** — see below. Build via isolated worktree; **stop at PK Gate 2**; no register/invoke-in-prod/merge/deploy/push without separate authority.  
> **O-2 (verdict/findings):** enumerate EVERY independently detectable finding; roll overall verdict up to `INCOMPLETE` when a missing execution channel / baseline / rollback identity / required section prevents reliable full assessment; **never suppress a proven concern because the verdict is INCOMPLETE**. **O-3 (input):** packet content + its declared control register are the primary input (path accepted operationally, but it must parse+assess prose · SQL/harness blocks · declared STOPs · assertion register · named execution channel · baseline queries · rollback identities); never infer missing controls from path naming or session context. **O-5 (sequence):** build this agent now as the approved candidate; do NOT reorder/implement Claim Stub or Hash Checkpoint in this lane — record their relative placement as an unresolved portfolio-order question AFTER this agent is proven. **O-7 (vehicle):** isolated worktree, normal local helper/agent build path; no production/Supabase/deployed-worker/register/active-lane-artifact changes.  
**Tier / label:** **T1** authoring lane (this brief) · the FUTURE build lane it describes is **T2** · lane class **SAFETY_GATE** · **no cc- ID claimed** (control tower allocates centrally — see Open question O-6) · **no register version claimed**  
**Result file:** `docs/briefs/results/cc-NNNN-apply-harness-auditor-gate1.md` (created only if PK opens the build lane and it completes)

> **Authoring-only.** This brief authorises **no** implementation, registration, production integration, or gate use — only a future PK Gate-1 decision on whether to open the build lane. Nothing here builds the agent, modifies the active Slice-2 gate, or touches production. Approving this brief opens a T2 build lane; it does not itself trust or wire the agent (registration is a SEPARATE PK gate — see Build path step 9).

---

## Task

Define, for a future PK Gate-1 decision, a new **read-only candidate ICE subagent `apply-harness-auditor`**: an agent that mechanically inspects an apply packet's declared **safety harness** *before artifact freeze* and flags every place where the packet **declares** a protection that the **executable SQL does not actually enforce**. It exists to catch the cc-0079 Slice-2 failure class one gate earlier — the class where a named STOP condition is a comment, a `BEGIN`/`COMMIT` is assumed to compose across a pooled channel that splits it, or an assertion's required baseline input is missing (`docs/briefs/results/cc-0079-slice-2-apply-lane-halt-v1.md` §3, lines 32–55). It is the static, pre-freeze counterpart to the `deploy-verifier` post-deploy governor (`.claude/agents/deploy-verifier.md`): stateless, read-only, classifies, **never decides**. It does **not** replace `db-rls-auditor`, external review, or PK's apply gate — those all still run, unchanged, above it (`CLAUDE.md`, PK gates + external-review sections).

This brief is the CCF-04 admission packet for that agent: it must pass the charter's single admission test — *"Can we remove manual effort WITHOUT removing human judgment?"* (`docs/briefs/ccf-04-mechanical-assistants-charter.md:17-19`) — and it must NOT cross the reject list (`ibid:52-57`). The judgment-holding acts (is this the RIGHT invariant? should production be mutated? does the gate pass?) stay with the author, specialist auditors, external review, and PK.

## Source context

- `docs/briefs/results/cc-0079-slice-2-apply-lane-halt-v1.md` — the **motivating evidence**: the three must-fix defects this agent exists to catch. **M-1 (high):** §5 STOP assertions were SQL comments (`-- must report exactly 17 rows updated, else ABORT`), no `RAISE`/`DO`/conditional — every statement committed regardless; §7 named STOPs that did not exist in code (`:32-36`). **M-2 (high):** execution channel unnamed, and the default pooled MCP channel cannot hold the transaction — two `execute_sql` calls landed on different backends/xids, so a `BEGIN` in one call and `COMMIT` in another do not compose; statement-by-statement execution would silently leave FB/IG/LI with zero `is_current` rows and vanish them from the demand grid with no error (`:38-51`). **M-3 (med):** a named STOP (A6) had no data because the §6 baseline query filtered `WHERE platform IN ('facebook','instagram','linkedin')`, excluding YouTube (`:53-55`). The audited packet was **v2** (`73dd7413…`), which returned `concerns` at gate ④ (`:19,:21`).
- `docs/briefs/cc-0079-slice-2-apply-packet-v3.md` — the **WITHDRAWN** packet (banner `⛔ WITHDRAWN — DO NOT APPLY, DO NOT REVIEW`, `:3-4`). On static read it **closes** all three defects (executable `DO … RAISE EXCEPTION` blocks, a `G-ATOMIC` xid anchor, an in-transaction full-table YouTube snapshot; assertion register `:539-554`) and was withdrawn for **exceeding** PK's three-repair scope, never reviewed. **⚠ This is the crux discrepancy the proof plan must resolve — see Open question O-1 and the Proof plan.**
- `docs/briefs/cc-0079-slice-2-apply-packet-v4.md` — the authoritative re-cut and **negative control**: closes M-1/M-2/M-3 within PK's exact three repairs plus the S-3 fold-in (`:31-39`, freeze block `:752-774`). A correct auditor must NOT flag the three defects here.
- `docs/briefs/ccf-04-mechanical-assistants-charter.md` — admission test (`:17-19`), ratified priority order (`:44-51`), reject list (`:52-57`), zero-authority standing boundaries (`:60-64`), and the CCF-04 lineage/build discipline (`:22-42`).
- `docs/briefs/deploy-verifier-build-lane-gate1-brief-v1.md` + `.claude/agents/deploy-verifier.md` — closest precedent to mirror in **shape only**: a read-only advisory governor, a two-verdict contract, a §9 blind backtest as its proof, recompute-from-ground-truth-not-the-plan's-claims, and "advisory only — the human keeps the gate" (`deploy-verifier.md:24-51,191-234`). Do not copy its content — this agent's subject is *static SQL harness vs its own declared controls*, not *live deploy state*.
- `docs/briefs/ice-agent-roster-audit-v1-DRAFT.md` — roster corrections to record as findings (below).
- `CLAUDE.md` — the team table + agent-charter boundaries; the CCF-02 10-field findings contract (`clean/concerns/block/escalate`); tiers T1–T3; external-review rule that a review is valid only for its exact `reviewed_input_hash`; the standing deploy/DB gotchas (`supabase deploy bundles from CWD`; pooled-call composition).
- `.claude/helpers/source-truth-check.mjs` — grounds roster-correction (a): the Source Truth Check helper file exists.

## Scope

**In scope (this authoring lane):** produce ONE frozen Gate-1 brief that fully specifies the agent below — its ten mechanical checks, its out-of-scope boundary, its advisory verdict contract mapped to the CCF-02 vocabulary, its per-finding fields, its proof plan, its post-approval build path, its proposed CCF-04 helper-sequence position, the three roster corrections as findings, its Gate-1 admission criteria, and its open questions. Nothing more.

**Out of scope (this authoring lane):** building, registering, or running the agent; modifying the active Slice-2 gate or any packet; any production mutation; deciding S-2 lineage, the 13th artifact, or any other open PK item; allocating a cc- ID or register version.

### The agent this brief specifies

**Agent identity.** `apply-harness-auditor` — read-only (`Read`, `Grep`, `Glob` only; NO Bash/DB/network/write), stateless, idempotent, zero apply/approval authority. It reads an apply packet as text plus any freeze/hash metadata the orchestrator supplies, and returns findings JSON only. It NEVER queries the DB, verifies live state, or executes any SQL (that is a `db-rls-auditor` handoff).

**In-scope mechanical checks (the ten — each concrete, each tied to the v2 evidence where applicable):**
1. **Declared-STOP → executable-enforcement map.** For every STOP condition the packet *names* (e.g. its §7 STOP list), locate the executable construct that enforces it; a named STOP with no enforcing `DO/RAISE/conditional/constraint` is a finding. (Root of M-1 — `cc-0079-slice-2-apply-lane-halt-v1.md:32-36`.)
2. **Prose-masquerading-as-control.** Flag comments or narrative presented as abort controls — e.g. `-- must report exactly 17 rows updated, else ABORT` with no `RAISE` (the exact M-1 shape; `ibid:34`). A comment is never enforcement.
3. **Expected-row-counts are fail-closed.** Every stated expected count ("exactly 17 / exactly 7") must be backed by `GET DIAGNOSTICS … ROW_COUNT` + `RAISE EXCEPTION` or equivalent; an expected count that only appears in prose is a finding.
4. **Transaction assumptions vs the NAMED execution channel.** If the packet asserts single-transaction atomicity, it must name an execution channel that provides it; an unnamed channel, or a channel known not to compose statement-by-statement, is a finding (M-2 — `ibid:38-51`).
5. **Prohibited multi-call transaction composition.** Flag any design that assumes a `BEGIN` in one call and a `COMMIT`/dependent statement in another compose across pooled backends — they do not (`ibid:44-51`; `CLAUDE.md` pooled-call gotcha). Detect fragmentation risk and the absence of an in-transaction identity guard (e.g. an xid anchor).
6. **Every assertion has its required baseline inputs.** For each assertion that compares against a baseline/snapshot, verify the baseline query actually covers the assertion's scope; a baseline that filters out rows the assertion needs is a finding (M-3 — the YouTube-excluded baseline, `ibid:53-55`).
7. **Apply/rollback identity consistency.** The rollback must target exactly what the apply created/changed, by a consistent identity set (e.g. the same pinned-id list, disjoint from originals); a divergent or duplicated identity list is a finding.
8. **Executable ordering matches the packet's stated gate order.** The order of executable steps must match the sequence the packet declares (pre-checks before mutation, guards before dependent mutations); a mismatch is a finding.
9. **Any failure branch that CONTINUES rather than aborts.** Flag a handled condition that logs/records/continues where the packet's own semantics require an abort (a non-fail-closed branch).
10. **Claim↔SQL discrepancy sweep.** Any place where the packet's safety NARRATIVE (a closure table, an assertion register, a defect-closure matrix) asserts a protection the executable SQL does not implement, or implements differently. (The general form of the `declared-control-not-consulted` failure mode found *inside a safety harness* — `ibid:36`.)

**Explicitly OUT OF SCOPE for the agent (it must NOT judge — this boundary is the crux):**
- Payload / business-decision correctness (are the shares right? is this the correct renormalization?). NOT judged.
- Migration architecture / whether DDL is well-designed. NOT judged.
- RLS / privilege / grant safety beyond **flagging that a specialised review is REQUIRED** — a hand-off to `db-rls-auditor` / `security-auditor`, never a verdict of its own.
- Whether production should be mutated; whether an apply gate passes; whether PK should approve. NOT decided.
- Whether an assertion expresses the RIGHT business invariant (only whether a declared control is mechanically present and internally complete — never whether it is the correct control).
- Any live/DB/deploy/git truth. NOT verified (read-only static text only; live truth is a `db-rls-auditor` handoff).

> **Why the boundary is load-bearing.** If drawn loosely, the agent itself becomes the `declared-control-not-consulted` failure mode it exists to catch — asserting a judgment nobody reads, or duplicating a specialist's verdict without the evidence to hold it. The agent reports *structural presence/absence of declared controls* and hands every judgment upward.

**Advisory verdict contract (small, mirrors the `deploy-verifier` two-verdict shape — `deploy-verifier.md:191-207`):**
- **PASS** — every declared harness control is mechanically represented and internally complete.
- **CONCERNS** — one or more declared controls are absent, unenforced, or inconsistent.
- **INCOMPLETE** — the execution channel, a required baseline, the rollback identity, or a required packet section is missing, so the harness cannot be reliably assessed.

**CCF-02 normalized mapping (NAMED, per `CLAUDE.md` findings-contract):** `PASS → clean` · `CONCERNS → concerns` · `INCOMPLETE → block` (the orchestrator halts and surfaces to PK when the harness cannot be assessed — an unassessable harness must never be routed as clean). No native verdict maps to `escalate`; escalate is reserved for the orchestrator's own routing when PK judgment is required (e.g. O-1 below). **Findings are enumerated independently of the rolled-up verdict** — see O-2: a packet that is INCOMPLETE (missing channel) must still enumerate its comment-only-STOP and missing-baseline findings, so the backtest is scored on the findings list, not only the top verdict.

**Each finding carries:** stable finding ID · severity · packet section · executable location (line/block) · declared control · observed implementation · why-the-mismatch-matters · suggested author action. The agent has **zero apply or approval authority** — every finding is advisory input to the author and to the human gates above it.

## Allowed actions

*(For the FUTURE build lane, only after PK opens it at Gate 1 — nothing is authorised now.)*
- Author `.claude/agents/apply-harness-auditor.md` (charter + `Read`/`Grep`/`Glob` tool profile + the verdict/findings schema above), LOCAL-ONLY, in an isolated worktree (T2 build discipline — `ccf-04-mechanical-assistants-charter.md:40-42`).
- Run the agent read-only against **offline packet fixtures** for the proof plan (a withdrawn/superseded packet read as static text is a legitimate fixture; reading is not applying or reviewing it as a live packet).
- Return classifications; hand off live/DB/privilege questions to `db-rls-auditor` / `security-auditor`; hand off git/HEAD truth to `branch-warden`.

## Forbidden actions

- **Do NOT build, register, or run the agent under this authoring brief.** Approval of THIS brief opens a T2 build lane; the build is a separate gated effort and **registration is a further, separate PK gate** (Build path step 9).
- **Do NOT run the (unproven) agent inside the ACTIVE Slice-2 production gate.** Slice-2 v4 is the sole authority, reviewed clean, and is the ONLY open production window, awaiting PK apply gate ⑦ (`00_sync_state.md:13,:21,:35`). Any v3/v4 use by this agent is an **OFFLINE proof only** and must never gate, delay, or touch the live Slice-2 apply.
- **Respect the v3 WITHDRAWN banner** (`cc-0079-slice-2-apply-packet-v3.md:3`): v3 may be read as a static fixture but must never be applied, reviewed-as-live, or cited as an approved packet.
- **LANE-COUNT FREEZE AT NINE (PK).** No tenth lane opens before Slice 2 is applied and proven; a new finding is carried work unless it is an immediate blocker to one of the five named priorities (`00_sync_state.md:20`). This agent's BUILD is **not** a Slice-2 blocker — so even after PK approves this brief, the build lane is **queued behind the freeze** and opens only when PK explicitly lifts it. This authoring brief (a T1 doc) does not itself open a lane.
- Do NOT modify the active Slice-2 gate, any cc-0079 packet, or any other packet; do NOT touch production (no DML/deploy/migrate/promote/flag change).
- Do NOT allocate a cc- ID or register version (control tower allocates centrally — O-6).
- The agent must never acquire write/DB/network/Bash tools, approve or mark anything proven, or issue a proceed/abort decision — zero authority, output flows through the existing human gates (`ccf-04-mechanical-assistants-charter.md:60-64`).

## Success criteria (of the FUTURE build lane — the bar PK is being asked to set)

- `.claude/agents/apply-harness-auditor.md` exists as a read-only agent with the `Read`/`Grep`/`Glob`-only profile and the PASS/CONCERNS/INCOMPLETE + findings schema above, mapped to `clean/concerns/block`.
- **First proof = a BLIND backtest against the defect-bearing packet v2** (`73dd7413…`; fixture confirmed by PK 2026-07-25, O-1 RESOLVED). **Acceptance:** the agent independently detects ALL THREE known defects — comment-only STOP (M-1) · pooled-call transaction non-composition (M-2) · missing YouTube baseline (M-3). **CRITICAL anti-teaching-to-the-test rule:** the expected answer may be held by the proof reviewer but MUST NOT be embedded into the agent's prompt or rules to pass — the charter's rules must be generic ("named STOP → executable enforcement"), never "look for the YouTube filter on line 163".
- **Negative controls, all must hold:** (a) **v3** (`a91143311b72…`, WITHDRAWN/over-scoped) and **v4** (`1579115675c5…`, authoritative) must NOT trip the same three defects — both close them; (b) a **safe** packet with executable row-count aborts + complete baselines must return **PASS**; (c) a packet with correct SQL but **no named execution channel** must return **INCOMPLETE**, not PASS.
- **Zero false-CONCERNS on the safe control** (the trust-killer; mirrors `deploy-verifier`'s zero-false-MISMATCH bar — `deploy-verifier.md:57-59`).
- Chain clean: `branch-warden` safe · external review pinned to the exact definition hash (`CLAUDE.md` external-review `reviewed_input_hash` rule) · PK Gate 2.
- The backtest is read-only, PK-reviewed, and runs **no** production apply and does NOT enter the active Slice-2 gate.

## Stop condition

The deliverable of THIS lane is ONE frozen Gate-1 brief and nothing else. When the brief is authored, PK reads it at Gate 1 and decides whether to open the T2 build lane (and, separately, where it sits against the CCF-04 helper sequence and the lane-count freeze). Report per the result template only if the build lane is later opened and completes; otherwise this authoring lane's terminal state is "brief frozen, awaiting PK Gate 1." Do NOT build the agent, do NOT modify the active Slice-2 gate, do NOT touch production.

---

## Proof plan (for the build lane — recorded, not executed here)

1. **Blind backtest** against the defect-bearing packet — **v2** (`73dd7413…`, audited to `concerns` — `cc-0079-slice-2-apply-lane-halt-v1.md:19,:21`). **Fixture confirmed by PK 2026-07-25 (O-1 RESOLVED): v2 positive, v3/v4 negative controls.** Acceptance = independently detects M-1 + M-2 + M-3, with the expected answer withheld from the agent's rules.
2. **Negative control — v3** (`a91143311b72…`, WITHDRAWN/over-scoped) must return no M-1/M-2/M-3 findings (`cc-0079-slice-2-apply-packet-v3.md:24-31,:539-554`).
3. **Negative control — v4** (`1579115675c5…`, authoritative) must return no M-1/M-2/M-3 findings (`cc-0079-slice-2-apply-packet-v4.md:31-39`).
4. **Negative control (safe):** a hand-built safe packet (executable `RAISE`-backed row counts + complete in-transaction baselines) → PASS.
5. **False-positive / INCOMPLETE control:** a packet with correct SQL but no named execution channel → INCOMPLETE, not PASS.
6. All read-only, offline, PK-reviewed; none enters the active Slice-2 gate.

## Build path (recorded for AFTER a future PK Gate-1 approval — nothing authorised now)

1. Isolated T2 build lane. 2. Local-only implementation of `.claude/agents/apply-harness-auditor.md`. 3. Unit + fixture tests. 4. Blind v2 backtest (per O-1). 5. Negative + false-positive controls. 6. `branch-warden` safe. 7. External review pinned to the exact definition hash. 8. PK Gate 2. 9. **Registration ONLY after approval — a SEPARATE PK gate.** No production window is required for development. (Discipline mirrors `deploy-verifier-build-lane-gate1-brief-v1.md:42,:55-63`.)

## Proposed CCF-04 helper-sequence position (author's recommendation — PK decides; do NOT read as a decision)

The ratified CCF-04 order is: 1 Source Truth Check · 2 Claim Stub · 3 Hash Checkpoint · 4 Review Packet Template · 5 Register Pointer Template (`ccf-04-mechanical-assistants-charter.md:44-51`). `apply-harness-auditor` is a **newly proposed candidate on fresh evidence** (the Slice-2 halt) and requires PK approval before being placed ahead of any of them. **Author's recommendation, reasoned from the fresh evidence:** the Slice-2 halt was a *high-severity, silent-three-platform-outage* class defect caught only because `db-rls-auditor` happened to read the SQL closely at gate ④ (`cc-0079-slice-2-apply-lane-halt-v1.md:30,:49-51`); the existing helpers 2–5 remove clerical toil (number allocation, hash compare, packet/pointer scaffolds), whereas this agent removes a *safety* toil whose miss is materially worse. On value-per-miss it is reasonable to sequence it **immediately after Claim Stub (2) and before/alongside Hash Checkpoint (3)** — but it is a bigger effort than helpers 3–5 and must stay one-at-a-time-and-proven (`ibid:40`). **PK owns the placement and whether the lane-count freeze permits it at all.** The author does not assert the decision.

## Roster corrections (recorded as FINDINGS for PK — NOT work this lane does; they correct `ice-agent-roster-audit-v1-DRAFT.md`)

- **(a) Source Truth Check is already BUILT.** The charter lists it as "Brief drafted, reserved" (`ccf-04-mechanical-assistants-charter.md:46`), but the helper file exists on disk: `.claude/helpers/source-truth-check.mjs` (+ `.test.mjs`). *[Evidence gap: this agent grounds file existence only; the "+ PROVEN" status is the orchestrator's assertion, not verified here — a `register-reconciler` confirmation item.]*
- **(b) `deploy-verifier` is already PROVEN** (2026-07-19) — `.claude/agents/deploy-verifier.md:209-234`; CLAUDE.md team table. The roster DRAFT predates or under-states this in places; record it as PROVEN.
- **(c) `register-reconciler`'s before-every-register-cut cadence remains UNENFORCED** — ruled by PK but not wired as a standing pre-cut gate; runs on-demand today (`ice-agent-roster-audit-v1-DRAFT.md:45`, and its promotion gate "not yet run", `ibid:22`).

These are observations for PK; this lane implements none of them.

## Gate-1 admission criteria (how PK decides PASS at Gate 1)

PK admits the build lane if: (1) the agent passes the CCF-04 admission test — removes the *toil* of hand-checking harness-claim↔SQL fidelity without removing *judgment* (`ccf-04-mechanical-assistants-charter.md:17-19`); (2) it stays clear of the reject list — no auto-resolution, auto-approval, or authority (`ibid:52-57`); (3) the in/out-of-scope boundary above is accepted as precisely drawn (the crux); (4) the verdict contract and CCF-02 mapping are accepted; (5) the blind-backtest-first proof plan (with the O-1 fixture resolved and the anti-teaching-to-the-test rule) is accepted as the trust bar; (6) the lane-count freeze either permits the build lane or PK explicitly queues it behind Slice 2; and (7) the helper-sequence placement is set by PK.

## Open questions (for PK at Gate 1)

- **O-1 (✅ RESOLVED — PK, 2026-07-25).** **PK ruling: v2 (`73dd7413…`) is the positive (defect-bearing) fixture; v3 and v4 are negative controls.** Grounded before the ruling: v2 is the packet audited to `concerns` at the halt (`cc-0079-slice-2-apply-lane-halt-v1.md:19,:21`; hash verified `73dd7413cad6…`, 14191 B); **v3** *closes* all three (over-scoped, WITHDRAWN — `cc-0079-slice-2-apply-packet-v3.md:3-4,:24-31,:539-554`; `a91143311b72…`) and **v4** also closes them (`cc-0079-slice-2-apply-packet-v4.md:31-39`; `1579115675c5…`). The original task's "backtest against v3" framing is superseded by this ruling. Acceptance: the agent must detect M-1+M-2+M-3 on **v2**, and return **no** M-1/M-2/M-3 findings on **v3** and **v4**.
- **O-2 (verdict↔findings interaction).** v2 exhibits BOTH a missing named channel (which maps to INCOMPLETE) AND comment-only STOPs + a scoped-out baseline (which map to CONCERNS). Does missing-channel short-circuit the top verdict to INCOMPLETE, and if so, must the agent STILL enumerate the M-1/M-3 findings so the backtest's "detects all three" bar is met? **Recommendation:** yes — verdict rolls up, but the findings list is always fully enumerated and acceptance is scored on the findings list, not the top verdict alone.
- **O-3 (input contract).** What does the orchestrator hand the agent — the packet path only, or path + freeze/hash metadata + the packet's declared STOP/assertion register? (Mirrors the deploy-verifier "plan names the marker vs agent derives it" question — `deploy-verifier-build-lane-gate1-brief-v1.md:68`.) **Recommendation:** the packet text plus its self-declared STOP/assertion register, so the agent checks declared-vs-implemented rather than inventing the intended control set.
- **O-4 (✅ RESOLVED — PK, 2026-07-25).** **Build QUEUED behind Slice 2.** The build lane does not open until cc-0079 Slice 2 is applied + proven and PK lifts the lane-count-freeze-at-nine for it. Gate-1 approval records intent; it does not open work.
- **O-5 (helper-sequence placement).** Where does it sit vs Claim Stub and Hash Checkpoint? (Author recommendation above; PK decides.)
- **O-6 (identifiers).** cc- ID and register version are left as named placeholders for central control-tower allocation; the author claims neither.
- **O-7 (build vehicle).** Author via ef-builder in an isolated worktree, or direct docs-lane authoring of the definition file? (Precedent question — `deploy-verifier-build-lane-gate1-brief-v1.md:67`.)

## Notes (non-claims)

Nothing is built, registered, run, approved, or marked proven by this brief; no `.claude/agents/apply-harness-auditor.md` exists. Gate 1 (PK brief approval) is unchanged and not pre-empted. No file was written by this agent — the orchestrator persists this returned draft. No live DB/deploy/git state was verified. This brief does not modify the active Slice-2 gate, any cc-0079 packet, the CCF-04 charter, or any register. The proposed agent holds zero authority; every human and external gate lives above it — it would confirm, never act.
