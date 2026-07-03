# CCF-02 — Phase 0: Review-Lane Friction Observations (DRAFT v2)

> **v2 (2026-07-03): PK-ratified revision after review** — O-2 merged into O-5 (hash
> checkpoints are pipeline steps; identical Phase 1 fix), ranking revised (O-3 demoted pending
> wall-clock measurement), evidence caveats made explicit on O-1/O-3/O-4. Observation IDs kept
> stable — register v4.85 cites O-1..O-7.
>
> **Status: DRAFT — observation only.** This document records where time and
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
**Evidence caveat:** the "≳4.5KB proposal ceiling" rests on exactly two data points (5.6KB
fail / 4.3KB pass) — the boundary is bracketed, not located, and the connector-layer root
cause is unidentified. The friction claim stands regardless; the threshold is approximate.
**Phase 1 implication:** the contract doc should specify the canonical review-packet shape
(and size budget) so every lane cuts a passing packet on the first attempt.

## O-3 — Read-only agents run serially even where independent (rank pending measurement)

Today's lanes chain warden → db-rls-auditor → security-auditor → external review strictly in
sequence (v4.81 S0 and v4.84 Lane 0 both waited on full serial chains). **Reframed at review
(2026-07-03):** part of this ordering is by design, not friction — CLAUDE.md mandates
security-auditor AFTER db-rls-auditor (facts before judgement), and external review must see
the FINAL diff — so the genuinely parallelizable subset is essentially
**branch-warden ∥ db-rls-auditor** (disjoint read state), narrower than v1 implied. The
existence of serialization is proven; its wall-clock cost is **asserted, not measured** — no
lane has per-stage timing data yet.
**Phase 1 implication:** the contract should mark the (small) parallel-safe subset per lane
type, with db-rls-auditor conditional on DB involvement — sized by the timing data Phase 0
still needs to collect.

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
**Evidence caveat:** the vocabularies are verifiable facts; the interpretation cost is
qualitative — no gate has yet been mis-routed by vocabulary confusion. Ranked on breadth
(every lane pays it), not on a recorded incident.

## O-5 — The pipeline and its checkpoints exist only as prose, re-derived per lane (MERGED with O-2; MEDIUM friction)

*(v2: absorbs former O-2 "manual hash discipline" — hash checkpoints ARE pipeline steps and
the Phase 1 fix is identical: write the flow once.)*
The proof-lane flow exists as prose in CLAUDE.md and is re-instantiated by judgment each time;
v4.77–v4.85 register entries each hand-write the same "gate trail" sentence. The strongest
concrete instance is **hash discipline**: `reviewed_input_hash` is recomputed and compared by
hand at every step — packet cut → review call → pre-apply → post-merge → pre-push (CCF-01.1
did this 5 times; Lane 0 v4.84 re-verified after an auditor-forced fix re-cut). The discipline
is correct and load-bearing (it caught real drift twice on 2026-07-03) — the friction is that
each lane re-invents the verify-or-abort sequence from memory.
**Phase 1 implication:** the contract doc IS this pipeline, written once and referenced by
name, with the hash checkpoints named as an executable checklist (cut / review / apply /
merge / push).

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

## Ranking for Phase 1 (PK-ratified v2 — highest evidence-backed cost first)

1. **O-1** review-packet shape (the only MEASURED loss: 3 failed attempts + 5 diagnostic rows
   + queue pollution in one lane)
2. **O-4** findings contract (breadth: every lane pays interpretation cost; facts verified,
   cost unquantified)
3. **O-5 (+O-2 merged)** pipeline + hash checkpoints written once (strong evidence — 5 manual
   hash points per lane, caught real drift twice; cheap to write)
4. **O-3** parallel fan-out rules (existence proven, magnitude UNMEASURED — demoted pending
   per-stage wall-clock data from the next lanes; parallel-safe subset is narrow by design)
5. **O-7** proving checklist (small table, closes a governance gap)
6. **O-6** version-collision convention (note-level only; discipline has held every time —
   corroborated again 2026-07-03 when the S1 lane's uncommitted v4.86 register edits landed in
   the shared tree during the Phase 0 review itself)

## What Phase 0 is NOT claiming

No automation is proposed here. No agent behaviour changes. No enforcement. The observations
above are inputs to the Phase 1 contract doc, which is itself PK-gated. Observation continues:
the next 2–3 lanes run under current practice, and any new friction gets appended here with
the same evidence-citation standard.

**PK-RATIFIED (2026-07-03): the two Phase 0 measurements are active.** From the next lane
onward, each governed lane passively records in its result/register notes:
(a) **per-gate-stage wall-clock** — rough start/end per stage (build / warden / db-rls-auditor
/ security-auditor / external review / PK gate), minute granularity is enough;
(b) **packet-cut attempts per external review** — how many `ask_chatgpt_review` calls it took
to get a verdict on the final packet (target: 1).
These settle O-3's rank and tighten O-1's threshold bracket. Passive only: no tooling, no
hooks, no behaviour change — just two extra lines in the lane record. Phase 1 cuts after 2–3
lanes carry these numbers.
