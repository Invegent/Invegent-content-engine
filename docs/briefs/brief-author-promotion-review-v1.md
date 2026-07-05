# brief-author v1 — Promotion Review (CANDIDATE → PROVEN)

**Created:** 2026-07-05 Sydney · **Lane:** T1 docs/governance (escalated: governance change — CLAUDE.md team-table edit) · **Label:** SAFETY_GATE
**Decision owner:** PK (CCF-02 ladder step 4 — promotion is never automatic)
**Charter under review:** `.claude/agents/brief-author.md` — **byte-unchanged since build** at hash `e322670809d94db31e810e3fd33154f17a91b0c1710ffb99a688764405250a40` (build review `6a5a9769` agree; committed `4812904`, register v4.94)

## The proving record (3 runs, all 2026-07-05)

| # | Run | Mode | Verdict | Lane outcome | Quality evidence |
|---|---|---|---|---|---|
| 1 | Image Harvester v0 brief (cc-0027 gate 1) | **stand-in** (type registered mid-session) | DRAFT_READY | PK accepted as **provisional pass**; brief issued with Q1–Q5 decisions; lane closed **workflow PASS** (v4.97) | template-exact; every material claim cited; 8 hold-states landed in Forbidden actions incl. the CCF-02 no-new-agents rule applied **against its own subject matter**; both unprecedented licence edges sent to PK instead of decided; **caught the v4.94→v4.95 register drift** vs the asserted anchor |
| 2 | CCF-02 Phase 1 packet skeleton | **registered** | DRAFT_READY | packet built on the skeleton was externally reviewed (agree `09cac646`) and **PK-ratified** (v4.96) | raised the **load-bearing supersession question** (does ratifying Phase 1 ratify Convention 3 as written or as successor?) that shaped the ratified packet; correctly aligned with the 7 non-removable STOPs; again flagged local-head-vs-asserted-anchor drift |
| 3 | Creatomate Provider Reconciliation packet | **registered** (parallel session) | DRAFT_READY | lane completed **PASS, zero governance drift**; deliverable TMR-GOV-PROVIDER-1 **PK-ratified** (v4.98 @ `786a6db`) | per that lane's result §5: "grounded, cited, zero invention, surfaced the two-project risk + 4 crisp PK questions"; register entry records "brief-author v1 proving run SUCCESSFUL (promotion = PK)" |

## Ladder assessment (CCF-02 item 4: built → exercised → verdict confirmed → promoted)

- **Built** ✓ (v4.94, scope-cleared, externally reviewed).
- **Exercised on real lanes** ✓ — three real PK-directed lanes, two as the **registered type** (the spec's own promotion criterion — "a brief it drafts passes PK gate 1 and its lane runs" — is met twice over by registered runs alone; run 1's stand-in caveat is therefore immaterial to the criterion).
- **Verdict confirmed** ✓ — PK accepted all three drafts at gate 1 with at-most-minor edits; all three resulting lanes completed successfully (PASS / ratified / PASS) with **the brief never the failure point**.
- **Promoted** — **this is PK's decision, taken at this gate or not at all.**

## Charter conformance across all runs (no violations found)

Returned contract JSON only, every run · zero file writes (orchestrator persisted everything) · zero approvals/issuances (Status: draft, always) · unknowns exited via open_questions/evidence_gaps/handoffs, never as invented fact · hold-states reflected every run · anchors recorded as asserted with drift flagged twice · no task-splitting or scope expansion.

**Honest limitations on record (not disqualifying, PK should see them):** run 1 was a stand-in (mitigated: two registered runs since) · outputs are not yet native to the 10-field findings contract (by design — lazy adoption; the promotion edit below carries the appendix) · sample size is 3 lanes in 1 day, all docs/planning-shaped briefs — no code-lane or DB-lane brief drafted yet (first such brief will be new territory; the charter's evidence rules apply unchanged).

## Proposed promotion edits (applied ONLY on PK approval; exact scope)

1. `.claude/agents/brief-author.md` — header status CANDIDATE → **PROVEN** with the proving record (3 runs, dates, lane outcomes) + append the **findings-contract appendix** (10-field output shape per the ratified Phase 1 contract §2 — its lazy-adoption charter touch, taken now since the file is being edited anyway; native JSON keys mapped: DRAFT_READY→clean, DRAFT_BLOCKED→block, ESCALATE→escalate).
2. `CLAUDE.md` — add the brief-author row to the v1 team table (read-only `Read/Grep/Glob` · may: draft ONE brief per PK-named task, evidence-cited, holds reflected · may NOT: write files, approve/issue briefs, author result docs, edit registers, choose/split tasks, invent uncited facts) + a PROVEN status note in the agent-status prose.
3. Register pointer entries (Convention 1) claiming the next version per protocol.

**Non-claims:** nothing here promotes the agent — PK does, or doesn't · image-harvester and image-reviewer candidacies are untouched by this review (their promotion cases are separate) · no tool/permission change is proposed (toolset stays Read/Grep/Glob) · gate 1 (PK brief approval) is unchanged by promotion — a PROVEN brief-author still only proposes.
