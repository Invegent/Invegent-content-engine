# CCF-02 Phase 2 — Observation Note #2: Creatomate Provider Reconciliation v0

**Recorded:** 2026-07-05 (PK directive) · **Lane:** commit `786a6db`, register v4.98 · **Label: SAFETY_GATE (declared)** · **Observation source:** the completed lane record only (nothing rerun; no provider call, no secret touched, no mutation; TMR/D6 artifact untouched; dead-reference cleanup not started).

## Tier classification (PK question answered)

**T3 — by the ratified text's plain trigger.** The lane used `CREATOMATE_ICE_PROJECT_API_KEY` for its 2 provider GETs, and the in-force table says `secrets → T3` with `doubt → higher tier`; incident history supports conservatism (the very outage this lane audits came from provider-account/key entanglement, v4.95).
**Recorded as PHASE2-FRICTION-002, not argued away:** the contract does not distinguish secret **use** (read-only, contained — here: file handoff, key never in transcript) from secret **posture change** (rotation/grant/exposure). T3-as-written also half-fits: its chain mandates builder isolation and rollback-proven-before-apply, which are meaningless for a read-only inventory — the lane *cannot* satisfy T3's full chain because there is nothing to build or roll back. A PK refinement is needed: either a "T3-lite (read-only-with-secret)" rider or "T2 + mandatory secret-handling rider". Until ruled, read-only-with-secret lanes classify T3 and satisfy the chain elements that apply.

## 1. Gate-1 conformance

- **Label: DECLARED** — "SAFETY_GATE side lane", packet header, PK design approval.
- **Tier: not declared; mappable** (T3 per above) — same gap class as Note #1's, accepted as post-ratification-concurrency friction.
- **Claim protocol: substantively followed, mechanically partial** — v4.98 claimed correctly and **cross-session visibility worked live** (the concurrent cc-0027 session observed the claim and deferred — first real-world validation of the protocol's core mechanism, zero collision). The `CLAIMED`-stub-as-line-1 mechanism was not used (result doc has no stub line).
- **Findings contract: mappable, not native** — three legs returned three native shapes (cartographer PASS, db-rls-auditor pass matrix, orchestrator provider leg); all map cleanly (PASS→`clean`, matrix+citations→`evidence`, carries→`recommended_next_gate`, zero-mutation statements→`non_claims`); lazy adoption unstarted, as designed.
- **Conformance gap recorded (PHASE2-FRICTION-003):** no external review is recorded for this lane, though the in-force table requires one at T2 and T3. The lane was PK-fixed in design and ran concurrent with the contract's ratification; going forward a rule is needed for lanes mid-flight at ratification time (recommend: lanes gated ≥1 step after ratification pick up the requirement at their next gate).

## 2. What the contract helped with

Provider/API boundary held by construction (GET-only, 2 calls, legs composed from proven read-only capability — no new agent) · zero mutation verified in-lane · secret handling was good practice (file handoff, never in transcript) but **ad-hoc** — no standard Gate-1 secret line exists yet · dead-reference cleanups were correctly **parked as carries, not started** — they are natural PARKED-label lanes awaiting PK admission · register versioning: the v4.98 claim coexisted with a concurrent lane without collision (see above — the protocol's first live win).

## 3. Friction summary

**PHASE2-FRICTION-002** — secret *use* vs secret *change* tiering (above; needs PK rule). **PHASE2-FRICTION-003** — mid-flight-at-ratification lanes and the external-review requirement (above). **Checklist:** yes — the three-leg pattern (static refs → registry truth → provider truth → join matrix) is reusable; carry a provider-reconciliation checklist template alongside the ratified TMR-GOV-PROVIDER-1 pre-cleanup guard. **Findings wrapper:** yes — three legs were hand-joined by the orchestrator; a normalized wrapper would make multi-leg joins mechanical (strengthens O-4). **Dead-reference cleanups: remain PK-gated** — they touch vendored contracts/code (≥T2) and auto-admission would breach the admission rule; recommend PK-gated and batched, not automatic.

## 4. Lane verdict (preserved, PK verbatim)

**PASS** · zero governance drift (provider↔registry perfect 1:1, 16==16) · **TMR-GOV-PROVIDER-1 ratified and in force** · dead-reference cleanups parked · D6 untouched.

## 5. Phase-3 implication

**Do not automate yet.** Carry forward: (a) the provider-reconciliation checklist as a reusable lane template; (b) a standard **secret-handling line in Gate 1** (which secret, how conveyed, never-in-transcript, use-vs-change declaration) — cheap, and it resolves half of FRICTION-002 by making secret involvement explicit at admission.
