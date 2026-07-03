# CCF-02 — Phase 0: Review-Lane Friction Observations (DRAFT v1)

> **Status: DRAFT for PK review — observation only.** This document records where time and
> reliability are lost in ICE review lanes today. It authorises nothing, changes nothing, and
> proposes no automation. Its only consumer is the future Phase 1 orchestration-contract doc.
>
> Method: evidence-cited observation of real, recent lanes (CCF-01.1 close-out 2026-07-03; the
> 2026-07-03 TMR/PP register trail v4.77–v4.85; `m.chatgpt_review` history). No survey, no
> speculation — every observation names the lane where the friction actually occurred.
>
> Created: 2026-07-03 Sydney. Parent plan: CCF-02 (PK, 2026-07-03) — "improve the review
> assembly line"; phases 0 observe → 1 contract → 2 manual → 3 automate-proven-parts.

---

## O-1 — External-review packet shape is trial-and-error (HIGH friction, measured)

The `ask_chatgpt_review` bridge rejects packets whose `context` embeds a large raw-diff blob,
and proposals ≳4.5KB, with a **misleading error** ("This connector requires additional
permissions…"). In the CCF-01.1 lane this cost: **3 failed real-review attempts, 5 diagnostic
calls** (rows `3465f576`, `51229b6e`, `26e60ad6`, `86544b78`, `5d08942e` — 3 of them now
polluting the escalation queue), one PK connector-reconnect that changed nothing, and two
packet re-cuts. The working shape (full packet in `proposal`, minimal `context`, diff pinned by
`reviewed_input_hash`) exists only in session memory.
**Phase 1 implication:** the contract doc should specify the canonical review-packet shape
(and size budget) so every lane cuts a passing packet on the first attempt.

## O-2 — Hash discipline is manual and repeated per gate (MEDIUM friction, load-bearing)

`reviewed_input_hash` is recomputed and compared by hand at every step: packet cut → review
call → pre-apply → post-merge → pre-push (CCF-01.1 did this 5 times; Lane 0 v4.84 re-verified
after an auditor-forced fix re-cut). The discipline is correct and has caught real drift
(v4.84's corrected citation re-hash) — the friction is that each lane re-invents the
verify-or-abort sequence in prose.
**Phase 1 implication:** name the hash points once in the contract (cut / review / apply /
merge / push) so lanes execute them as a checklist, not from memory.

## O-3 — Read-only agents run serially even when independent (MEDIUM friction)

Today's lanes chain warden → db-rls-auditor → security-auditor → external review strictly in
sequence, even where inputs don't depend on each other (branch-warden and db-rls-auditor read
disjoint state; v4.81 S0 and v4.84 Lane 0 both waited on full serial chains). Wall-clock cost
per lane is one agent-latency per stage.
**Phase 1 implication:** the contract should mark which agents are safe to fan out in parallel
per lane type (PK's CCF-02 item 2), with db-rls-auditor conditional on DB involvement.

## O-4 — Agent output shapes are non-uniform (MEDIUM friction, causes prose interpretation)

Each agent returns a different verdict vocabulary and shape: branch-warden
`safe/unsafe + reasons[]`; db-rls-auditor `PASS/concerns` with must-fix lists;
security-auditor `GREEN/AMBER/RED`; creative-graph-auditor `PASS/FAIL/ESCALATE`;
dashboard-ia-lint `PASS/WARN/BLOCK/NO_GOVERNING_RULE`; external review
`agree/partial/disagree` + routing. The orchestrator translates between five vocabularies when
composing a gate report, and register entries re-narrate each shape in prose.
**Phase 1 implication:** PK's CCF-02 item 3 findings contract
(`verdict/risk/files_checked/findings/required_changes/confidence`) maps cleanly onto all
five — adoption is a per-agent prompt change, no new agents.

## O-5 — The review pipeline is re-derived from CLAUDE.md every lane (LOW-MEDIUM friction)

The proof-lane flow exists as prose in CLAUDE.md and is re-instantiated by judgment each time;
v4.77–v4.85 register entries each hand-write the same "gate trail" sentence. Nothing is lost
today (discipline holds), but the repetition is exactly what PK's CCF-02 item 1 standard
pipeline would remove.
**Phase 1 implication:** the contract doc IS this pipeline, written once, referenced by name.

## O-6 — Register version-collision races between parallel lanes (LOW friction, real)

Three lanes closed on 2026-07-03 and raced the version counter (v4.82/v4.83 collision note in
the register; this lane observed main move `fc5ffd9 → 65a3547 → … → a4a8add` mid-lane and
re-based/re-verified by hand). Handled correctly each time, but every lane pays a manual
fetch-and-reinspect cost, and the counter is claimed by whoever commits first.
**Phase 1 implication:** minor contract note (verify-HEAD-before-commit is already standing);
possibly a "claim the version number at cut time" convention. Not worth automation yet.

## O-7 — Agent proving status is scattered (LOW friction, governance risk)

Which agents are proven vs candidate lives in CLAUDE.md prose (`dashboard-ia-lint` candidate
"until it has audited at least one real dashboard diff"; `creative-graph-auditor` spec
exercised manually but "not yet run as a registered subagent"). There is no single checklist a
lane can consult, which is how a candidate agent could silently be treated as proven.
**Phase 1 implication:** PK's CCF-02 item 4 proving checklist (built → exercised on real lane
→ verdict confirmed → promoted) should live in the contract doc as a table with dates.

---

## Ranking for Phase 1 (highest observed cost first)

1. **O-1** review-packet shape (measured multi-attempt loss + queue pollution)
2. **O-4** findings contract (every lane pays interpretation cost)
3. **O-3** parallel fan-out rules (wall-clock per lane)
4. **O-2** named hash checkpoints (cheap to write, prevents the worst class of error)
5. **O-5** pipeline written once (mostly subsumes itself once 1–4 exist)
6. **O-7** proving checklist (small table, closes a governance gap)
7. **O-6** version-collision convention (note-level only)

## What Phase 0 is NOT claiming

No automation is proposed here. No agent behaviour changes. No enforcement. The observations
above are inputs to the Phase 1 contract doc, which is itself PK-gated. Observation continues:
the next 2–3 lanes run under current practice, and any new friction gets appended here with
the same evidence-citation standard.
