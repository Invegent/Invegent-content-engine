# CCF-02 Phase 2 — Observation Note #1: cc-0027 (image-harvester / image-reviewer mini-proof)

**Admitted by PK:** 2026-07-05 · **Tier: T2 by mapping · Label: SIDE_PROVING**
**Admission basis (PK verbatim):** the lane satisfied the Phase-1 contract **in substance**; three formal gaps are **accepted because they post-date the lane** (contract ratified after cc-0027 ran) and are recorded as Phase-2 friction, not blockers.

## Contract-conformance record

**Substance satisfied:** external review pinned to artifact hashes (`4c69186d…` brief / `b09ebf2b…` harvester / `f582915a…` reviewer; review `0dc99a6f` agree) · structural containment (harvester writes confined to `_harness/image_harvester_v0/**`, GET-only allow-listed network; reviewer Read/Glob/Grep-only) · PK-only approval preserved end-to-end · honest findings (7 rejects with reasons; `not_harvestable` class available and unused honestly) · SIDE-PROVING label present in PK's Gate-1 directive · pre/post invariants byte-identical (29 rows / 39 objects / fingerprint `198b0923…`) · all 14 package hashes independently recomputed by the orchestrator, 14/14 match.

**Accepted formal gaps (post-date the lane):**
1. Tier was mappable (textbook T2: candidate agents, zero DB/deploy) but not declared at Gate 1.
2. No claim stub / result-doc version existed during the lane (protocol ratified later; this closeout is its first use for the lane — v4.97 claimed).
3. Agent findings mapped cleanly onto the 10-field contract (verdicts normalize to `clean`; `non_claims` natively present in all three agents) but were not natively emitted in that shape — no explicit `confidence`, no `must_fix`/`should_fix` split, no named `recommended_next_gate`. Consistent with the ratified lazy-adoption mechanism (no agent has its charter appendix yet).

## Phase-2 friction record

**PHASE2-FRICTION-001 (key item, PK-named):** clarify when direct orchestrator read-only checks are acceptable versus when `db-rls-auditor` must be invoked. Evidence: the cc-0027 brief named a db-rls-auditor handoff for invariant checks; the orchestrator ran equivalent direct read-only queries instead — same evidence, undocumented substitution. Feeds the Phase-2→Phase-3 contract refinement.

Other observations: the SIDE_PROVING label bounded scope crisply (helped) · claim protocol unused in-lane, ~1-min cost expected per lane (no burden signal) · a uniform findings wrapper would have made PK-package assembly mechanical (three bespoke JSON shapes were hand-assembled; confirms O-4) · mid-session agent-type registration forced stand-in runs for harvester + brief-author (registered-type proving needs the session boundary respected) · package hash re-verification is necessarily orchestrator work (reviewer has no Bash by design) and should be a named checklist step · **do NOT automate yet:** source/licence judgment (CC BY + AI-imagery rules open, cc-0027 Q5), promotion, anything DB, PK-package assembly (one more manual round first).

## Lane verdict (preserved, PK verbatim)

Workflow **PASS as SIDE_PROVING** · `image-harvester` remains **CANDIDATE** · `image-reviewer` remains **CANDIDATE** · no images approved · no images promoted · no DB/storage/render/publish/deploy touched · D6 untouched (pause rule armed throughout, never tripped).
