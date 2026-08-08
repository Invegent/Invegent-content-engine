# Brief cc-NNNN — result-scribe (Gate-1 authoring brief for a NEW candidate ICE subagent)

**Created:** 2026-08-08 Sydney
**Author:** brief-author (returned draft; orchestrator persists)
**Executor:** PK (Gate-1 decision) — build hand assigned only if PK opens the build lane
**Status:** **ISSUED — Gate-1 APPROVED as recommended (PK, 2026-08-08); T2 build lane OPEN**
**Tier / label:** **T1** authoring lane (this brief, docs-only) · the FUTURE build lane it describes is **T2** (candidate agent — `CLAUDE.md` Convention 3 lists "candidate agents" under T2) · lane class **SIDE_PROVING** (CCF-02 lane classification; PK may re-class at Gate 1) · **no cc- ID claimed** · **no register version claimed** (single-register-cut-owner rule, `docs/00_action_list.md:79`)
**Result file:** `docs/briefs/results/cc-NNNN-result-scribe-build.md` (created only if PK opens the build lane and it completes)

> **Authoring-only.** This brief authorises NO implementation, registration, or promotion — only a PK Gate-1 decision on whether to open the T2 build lane. Approving this brief opens the build lane; it does not itself trust, wire, or promote the agent (registration and promotion are SEPARATE PK gates — precedent: `docs/briefs/apply-harness-auditor-gate1-brief-v1.md:13` and `docs/briefs/brief-author-promotion-review-v1.md`).

> **Gate-1 decision record (PK, 2026-08-08 — "Approved as recommended — open the build lane and commit the brief"):**
> - **O-1 (fixtures):** the four example lane shapes named in this brief, one fixture each (N=4): a docs-only lane (orchestrator selects the specific doc at run prep and names it in the proving record) · `dashboard-operator-cockpit-v1-result.md` (code/deploy) · `publish-truth-task2-corrected-view-and-rpc-result-v1.md` (authored-not-applied T2) · `broll-live-pool-fence-result-v1.md` (production-apply T3).
> - **O-2 (isolation):** as recommended — mechanism (a), isolated worktree checked out at the pre-closure commit, where a clean one exists; else (b) instruction-level exclusion with the run transcript checked for reads of the withheld path.
> - **O-3:** as recommended — template §1–§7 mandatory, house-style extensions permitted only where cited evidence fills them; the CLAIMED stub stays orchestrator-owned.
> - **O-4:** as recommended — §8 Verification NEVER drafted by the agent; §9 only as clearly-marked suggestions.
> - **O-5:** cc- ID + register version remain owed via the register-cut-owner channel; none claimed by this issuance.
> - **O-6:** build lane opens NOW, during the watch — local-only/non-production, zero production surface; the mutation-watch hold itself is unchanged.
> - **O-7:** direct docs-lane authoring of the charter file on main (single markdown charter; ef-builder worktree not required — escalation triggers unchanged).
> - **O-8:** DISCHARGED — orchestrator-verified read-only git count (2026-08-08): **579 commits since 2026-07-14, 397 docs-prefixed** (392 `docs(` + 5 `docs/db(`); the asserted ~392 was conservative.
> - **Failure-class names** `evidence_fabrication` / `closure_overclaim` / `evidence_gap_suppression` approved; registration in `docs/governance/failure-classes-v1.md` stays lazy per OAP v1 §4 (at first recorded occurrence or at promotion, whichever comes first).

---

## Task

Define, for a PK Gate-1 decision, a new **read-only candidate ICE subagent `result-scribe`**: the closing-artifact mirror of the proven `brief-author` (`.claude/agents/brief-author.md`, PROVEN 2026-07-05 — `docs/briefs/brief-author-promotion-review-v1.md`). Given **ONE closed (or closing) lane**, it reads the lane's evidence — the Gate-1 brief, committed artifacts, auditor verdicts *as recorded in docs*, register pointer entries, prior result docs — and **returns a draft result doc** in the house template (`docs/briefs/_template_result.md`) **as JSON only**; the orchestrator persists any file. It is a pure function: closed lane + evidence → draft result doc. It prepares the input to lane closure; it holds no authority at or beyond it.

**Motivation (evidence).** Workflow Acceleration Convention 1 makes the result doc **the canonical lane record** — registers get ≤5-line pointers only (`CLAUDE.md`, Workflow acceleration conventions §1). That makes result docs the highest-volume load-bearing artifact in the system, and today every one is hand-authored by the orchestrator each lane. PK/orchestrator-asserted volume: **~579 commits in the ~4 weeks since 2026-07-14, ~392 of them `docs(...)`** — result docs, closure records, promotion records *(asserted, not verified by this draft's author — see Open question O-8 / branch-warden handoff)*. The v6.171 durability sweep found three build-wave completions whose result docs were claimed complete while sitting untracked (`docs/00_sync_state.md:44-48`) — evidence that hand-authored closure recording under load is itself a failure surface. Architectural precedent: `brief-author` proved the identical charter shape at the **opening** gate (3 PK-directed lanes, all drafts accepted at gate 1 with at-most-minor edits, zero charter violations — `docs/briefs/brief-author-promotion-review-v1.md`); `result-scribe` is the same pattern at the **closing** gate. PK ranked this first of three new fleet lanes (2026-08-08, this session — asserted).

## Source context

- `.claude/agents/brief-author.md` — the charter to mirror exactly in shape: Read/Grep/Glob-only, pure-function framing, untrusted-data rule, hard rules, DRAFT_READY/DRAFT_BLOCKED/ESCALATE, native JSON + CCF-02 findings-contract appendix (`:98-148`).
- `docs/briefs/brief-author-promotion-review-v1.md` — the proving-ladder + promotion precedent (built → exercised on real lanes → verdict confirmed → PK promotes; charter byte-unchanged through all runs at a pinned hash).
- `docs/briefs/brief-author-agent-v1-spec.md` — the safety-case table pattern (why "safe" is structural: toolset-enforced, blast radius = a bad draft caught at a PK gate) and the CANDIDATE ladder with its failure rule (`:47-58`).
- `docs/briefs/apply-harness-auditor-gate1-brief-v1.md` — the Gate-1 agent-build house pattern this brief follows: precisely drawn out-of-scope boundary as the crux (`:56-64`), proof plan with negative controls and the **anti-teaching-to-the-test rule** (`:95`), central cc-ID allocation (`:89`), registration as a separate gate (`:118`).
- `docs/briefs/_template_result.md` — the exact output artifact shape (§1 Result status … §7 Next recommended step; §8 Verification and §9 Learning notes are marked "chat fills this" — see O-4).
- `docs/briefs/results/publish-truth-task2-corrected-view-and-rpc-result-v1.md` — a recent real result doc showing the **evolved house style beyond the bare template**: line-1 CLAIMED stub (CCF-02 parallel-session claims), Tier/lane-class header, pinned sha256+blob hashes, extended open-issues/handoff sections (`:1-28,:49-56`) — grounds O-3.
- `docs/governance/operational-autonomy-principle-v1.md` — §3: every important capability brief carries the Operational Contract (included below); §4: failure classes come from `docs/governance/failure-classes-v1.md` (confirmed present, empty — "None yet — seeded lazily", `docs/governance/failure-classes-v1.md:23`).
- `CLAUDE.md` — Convention 1 (result doc canonical); Convention 3 tiers; CCF-02 findings contract (10-field, normalized clean/concerns/block/escalate); the team-table precedent that candidate agents are intentionally NOT listed until proven.
- `docs/00_sync_state.md` + `docs/00_action_list.md` — active hold-states reflected under Forbidden actions.

## Scope

**In scope (this authoring lane):** this ONE Gate-1 brief specifying the agent below — identity, toolset, input/output contracts, out-of-scope boundary, verdict vocabulary + CCF-02 mapping, Operational Contract, proving plan on already-closed lanes, build path, tier + escalation triggers, and the open questions PK decides at Gate 1. Nothing more.

**Out of scope (this authoring lane):** building, registering, running, or promoting the agent; writing any file (this draft is returned JSON; the orchestrator persists); any register edit; any production/DB/deploy/git mutation; deciding any open question below.

### The agent this brief specifies

**Identity.** `result-scribe` — read-only (`Read`, `Grep`, `Glob` ONLY; no Bash, no git, no DB, no network, no Write/Edit, no deploy — mirror of `.claude/agents/brief-author.md:29-31`), stateless, returned-JSON-only. CANDIDATE at build; not listed in the CLAUDE.md team table until PK promotes (precedent: `dashboard-ia-lint`, `CLAUDE.md`).

**Input contract.** The orchestrator hands it ONE named closed/closing lane plus pointers to that lane's evidence (brief path, result-doc target name, relevant artifact/register paths, any asserted anchors). Anchors (HEAD, deploy state, row counts) are recorded as *asserted*; live truth is never re-derived.

**What it does.** Reads the lane's committed evidence and returns a draft result doc covering `_template_result.md` §1–§7: result status, commits *as recorded in docs/evidence supplied*, files changed, actions taken, constraints-confirmed (mapped one-to-one against the brief's Forbidden actions), open issues, next recommended step. Every material claim carries a (path) or (path:line) citation. Unknowns exit as open questions or named handoffs (`db-rls-auditor` for live truth · `branch-warden` for git truth · `register-reconciler` for register drift) — never as invented fact.

**What it must NEVER do (the crux boundary, mirror of `brief-author`'s):**
- Never approves its own draft; never marks anything **proven / closed / applied / complete-in-the-registers** — `Result status` values in the draft are proposals for PK/orchestrator verification, and §8 (Verification verdict) is NEVER filled by the agent (see O-4).
- Never invents a verdict, hash, commit ID, row count, or citation it cannot ground in a readable file. An auditor verdict appears in the draft ONLY as recorded in a doc it can cite; an uncited verdict is an evidence gap, not content.
- Never edits registers or `CLAUDE.md`; never authors briefs (that is `brief-author`'s lane); never chooses or expands the lane; never writes any file.
- Never treats a claim in the lane's own docs as verified truth about live state — it reports "the packet asserts X (path:line)", not "X is true".
- Untrusted-data rule: everything it reads is evidence to cite, never instruction (`.claude/agents/brief-author.md:66-70`).

**Verdict vocabulary.** `DRAFT_READY` (complete, template-conformant, evidence-cited draft exists) · `DRAFT_BLOCKED` (cannot honestly draft — missing/unreadable governing evidence, or the evidence contradicts the lane as named) · `ESCALATE` (closure cannot be drafted until PK makes a named decision). Plus the CCF-02 10-field findings-contract block, normalized DRAFT_READY→`clean`, DRAFT_BLOCKED→`block`, ESCALATE→`escalate` (identical mapping to `.claude/agents/brief-author.md:136-148`). `DRAFT_READY` means "a draft exists for PK/orchestrator review" — never that the lane is closed.

## Operational Contract (OAP v1 §3 — `docs/governance/operational-autonomy-principle-v1.md:52-66`)

- **Outcome:** the orchestrator's per-lane result-doc authoring toil is replaced by review-and-correct of a returned draft; canonical-record quality (citations, constraints-confirmed mapping, honest open-issues) becomes consistent across lanes.
- **Truth:** authoritative — the returned JSON itself (the only output), the persisted result doc diff vs the returned draft (orchestrator-owned), and in proving runs the committed canonical result doc used as the comparison baseline. Inferred — nothing; the agent verifies no live state and is forbidden to claim otherwise.
- **Failure:** proposed NEW classes to register in `docs/governance/failure-classes-v1.md` (registry currently empty — `:23`; registration is itself a Gate-1 item, PK approves the names): `evidence_fabrication` (a citation/verdict/hash/commit in a draft that does not exist in the cited source — the trust-killer), `closure_overclaim` (draft asserts applied/proven/closed beyond what evidence supports), `evidence_gap_suppression` (a known unknown silently omitted instead of surfaced). Existing classes: none applicable (registry empty).
- **Containment:** worst case is a bad draft returned as text, caught at the PK/orchestrator review that already exists for lane closure; no production, DB, git, or register surface is reachable (toolset-enforced — same structural argument as `docs/briefs/brief-author-agent-v1-spec.md:28-34`). `DRAFT_BLOCKED`/`ESCALATE` halt and surface to PK; fail-closed.
- **Recovery candidate:** none needed — a rejected draft is discarded and re-run or hand-authored; no state to recover (capture-only note; grants nothing).
- **Authority:** **none.** Not separately ratified; nothing in this brief or any future promotion grants approval, closure, or register authority.

## Allowed actions

*(For the FUTURE build lane, only after PK opens it at Gate 1 — nothing is authorised now.)*
- Author `.claude/agents/result-scribe.md` (charter mirroring `.claude/agents/brief-author.md` in shape: tools `Read`/`Grep`/`Glob`, hard rules, verdict rules, native JSON schema + findings-contract appendix), local-only.
- Run the candidate agent read-only against PK-selected **already-closed** proving lanes (fixtures per O-1/O-2) and return drafts for comparison against the committed canonical result docs.
- Prepare (not apply) the promotion-review doc and proposed CLAUDE.md team-table edit for PK's separate promotion gate (precedent: `docs/briefs/brief-author-promotion-review-v1.md:28-34`).

## Forbidden actions

- **Do NOT build, register, run-in-a-live-lane, or promote the agent under this authoring brief.** Gate-1 approval opens the T2 build lane only; registration and promotion are separate PK gates.
- **Mutation-watch hold (active):** no production mutation of any kind before the watch verdict + PK gate (~2026-08-11 20:20 Sydney) — "Nothing applies before PK's gate" (`docs/00_sync_state.md:36-40`; `docs/00_action_list.md:18`). This lane is docs/agent-file-only and must stay that way; whether the build lane opens during or after the watch is PK's call (O-6).
- **No self-allocated identifiers:** do NOT claim a cc- ID or cut a register version — single-register-cut-owner rule (`docs/00_action_list.md:79`); register pointers land only via the owner at PK-instructed commits.
- **Worktree custody:** if the build uses an isolated worktree, it must NOT touch, clean, or archive worktree `admiring-shtern-6fdb19` (6.1GB harvest evidence — standing rule, `docs/00_sync_state.md:38`).
- The agent (and its build lane) must never acquire Bash/git/DB/network/write tools, never fill `_template_result.md` §8 Verification, never mark a lane closed in any register, never author a brief, and never edit `CLAUDE.md` or any register.
- Do NOT run the unproven candidate as the recording step of any live lane before the proving plan completes and PK explicitly permits the first live-lane draft (Success criteria).
- Do NOT embed any proving fixture's expected answer (the canonical result doc's content) into the agent's charter/rules — the anti-teaching-to-the-test rule (`docs/briefs/apply-harness-auditor-gate1-brief-v1.md:95`).

## Success criteria (of the FUTURE build lane — the bar PK is being asked to set)

- `.claude/agents/result-scribe.md` exists with the `Read`/`Grep`/`Glob`-only profile, the DRAFT_READY/DRAFT_BLOCKED/ESCALATE + findings-contract output schema, and the never-approve/never-invent hard rules above; charter hash pinned and byte-stable through all proving runs (precedent: `docs/briefs/brief-author-promotion-review-v1.md:5`).
- **Proving comparisons on ALREADY-CLOSED lanes (PK-directed plan):** for N PK-selected closed lanes (O-1/O-2), the agent drafts the result doc from the lane's evidence with the committed canonical result doc withheld (isolation mechanism per O-2); PK grades each draft against the canonical record on **fidelity** (facts match), **citation discipline** (every material claim grounded), and **no-overclaim** (nothing asserted beyond evidence; unknowns surfaced not silently resolved).
- **Zero `evidence_fabrication` across ALL runs** — one invented citation, verdict, hash, or commit in any draft is a lane STOP (see Stop condition), not a gradable defect.
- Honest-blocked behaviour demonstrated at least once if any fixture's evidence base is genuinely incomplete: `DRAFT_BLOCKED`/gap-surfacing rather than padding (mirror of brief-author's "never pad" rule, `.claude/agents/brief-author.md:91-93`).
- **Then one LIVE lane:** the agent drafts the result doc for a real closing lane; the draft is PK-accepted (at-most-minor edits) BEFORE the orchestrator persists it; the lane closes without the result doc being the failure point.
- Chain clean: `branch-warden` safe on the build worktree · external review pinned to the exact charter hash (`reviewed_input_hash` rule, `CLAUDE.md`) · PK Gate 2 on the build · **promotion is a separate, explicit PK decision** with its own review doc and its own CLAUDE.md team-table edit gate — never automatic.

## Stop condition

The deliverable of THIS lane is ONE draft Gate-1 brief, returned as JSON for PK to read at Gate 1. For the FUTURE build lane: **any evidence that the agent invented a citation, verdict, hash, or commit — in any proving or live run — is an immediate STOP**; the lane halts, the finding surfaces to PK, and the agent stays CANDIDATE with defects fixed or is retired (failure rule per `docs/briefs/brief-author-agent-v1-spec.md:57-58`). No auto-promotion, ever. Otherwise: on proving-plan completion, report per the result template and stop at PK's promotion gate.

---

## Proof plan (for the build lane — recorded, not executed here)

1. PK selects the fixture set at Gate 1 (O-1): already-closed lanes whose canonical result docs are committed. Author's grounded observation (not a decision): the repo holds 295+ committed result docs under `docs/briefs/results/**` spanning docs-only T1, code/deploy T2, and production-apply T3 lane shapes — fixture diversity is available.
2. For each fixture, the orchestrator prepares the evidence view with the canonical result doc withheld per the O-2 isolation mechanism; the agent returns its draft.
3. PK (or a PK-directed comparer whose comparison is itself only advisory) grades fidelity / citation discipline / no-overclaim against the canonical record; fabrication check runs on every citation.
4. One live closing lane, PK-accepted before persist.
5. Promotion review doc → external review pinned to charter hash → PK promotion decision (mirrors `docs/briefs/brief-author-promotion-review-v1.md`).

## Tier + escalation triggers (Convention 3 — proposed, PK assigns at Gate 1)

- This authoring lane: **T1** (docs-only). Build + proving lane: **T2** (candidate agent, isolated, read-only, zero production surface — `CLAUDE.md` Convention 3 lists candidate agents under T2), with external review pinned to the charter hash at Gate 2.
- **Escalation triggers (any → higher tier / fresh Gate 1):** any proposed tool beyond Read/Grep/Glob · any DB/deploy/production touch entering scope · the agent's output being wired to auto-persist or auto-close anything · running the candidate inside a live T3 lane's closure · doubt or mixed scope.

## Open questions (for PK at Gate 1 — the author decides none of these)

- **O-1 (fixture lanes + count).** Which already-closed lanes, and how many? Author's grounded options (examples with committed canonical records, NOT a selection): a docs-only lane, a code/deploy lane (e.g. `docs/briefs/results/dashboard-operator-cockpit-v1-result.md`), an authored-not-applied T2 artifact lane (e.g. `docs/briefs/results/publish-truth-task2-corrected-view-and-rpc-result-v1.md`), a production-apply T3 lane (e.g. `docs/briefs/results/broll-live-pool-fence-result-v1.md`). Precedent sample size: brief-author proved on 3 (`docs/briefs/brief-author-promotion-review-v1.md`). PK sets the list and N.
- **O-2 (blind vs open — the isolation mechanism).** The canonical result doc is a committed repo file **reachable by the agent's own Read/Grep/Glob**, so a "blind" comparison is not structural by default. Options: (a) run the agent in an isolated worktree checked out at the pre-closure commit (structural blindness; strongest); (b) instruction-level exclusion ("do not read path X") — weaker, relies on compliance not structure; (c) open-book comparison graded on citation-vs-copying. Author's recommendation: (a) where a clean pre-closure commit exists, else (b) with the run transcript checked for reads of the withheld path. **PK decides.**
- **O-3 (template-exact vs evolved house style).** Real canonical result docs exceed the bare template — line-1 CLAIMED stubs, Tier/lane-class headers, pinned blob hashes, extended sections (`docs/briefs/results/publish-truth-task2-corrected-view-and-rpc-result-v1.md:1-28`). Should result-scribe draft template-exact §1–§7, or template-plus-house-extensions where the lane's evidence demands? Recommendation: template sections mandatory, extensions permitted when cited evidence fills them; the CLAIMED stub stays orchestrator-owned (it is a register-claim act).
- **O-4 (§8/§9 handling).** `_template_result.md` marks §8 Verification and §9 Learning notes "chat fills this" (`:47-67`). Proposal: §8 NEVER drafted (verification is a grading act — authority stays above the agent); §9 optionally drafted as clearly-marked *suggestions*. PK confirms or narrows.
- **O-5 (identifiers).** cc- ID and register version left as placeholders for central allocation (`docs/00_action_list.md:79`); the author claims neither.
- **O-6 (build timing vs the watch).** The build is local-only/non-production; does PK open it during the watch window or after the ~2026-08-11 sitting? (The watch prohibits production mutation, not isolated non-production build — but the timing call is PK's; `docs/00_sync_state.md:36-40`.)
- **O-7 (build vehicle).** Direct docs-lane authoring of the charter file vs ef-builder in an isolated worktree (same fork as `docs/briefs/apply-harness-auditor-gate1-brief-v1.md:144`).
- **O-8 (motivating figures).** The 579-commit / ~392-`docs(...)` figures are asserted, not verified — confirm via a read-only git count (branch-warden or orchestrator) before citing them in the promotion record, or carry them as asserted.

## Notes (non-claims)

Nothing is built, registered, run, approved, or promoted by this brief; no `.claude/agents/result-scribe.md` exists. Gate 1 is unchanged and not pre-empted. This draft was returned as JSON only — the orchestrator persists any file. No live DB/deploy/git state was verified in drafting it. The proposed agent holds zero authority: PK's verification of every result doc, every register pointer, and every promotion remains exactly where it is today — above the agent.
