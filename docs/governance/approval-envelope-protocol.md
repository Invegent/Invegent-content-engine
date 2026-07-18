# Bounded Approval-Envelope Protocol (CCF-05)

**Status:** design of record — CCF-05 rev-2 ratified 2026-07-18 (T1 governance-document phase).
Source of record: `docs/briefs/ccf-05-engineering-control-plane-brief-v1.md` (Deliverable 4). This is gate-batching done safely — a rigorous expression of CCF-02 **Convention 2** + the `governor-architecture.md` apply-time re-check + `orchestrator-operating-manual-v1.md` §10 paste-block discipline. It **adds no authority**: an envelope *pins* an irreversible step; it never self-authorizes one. Deploy/merge/migrate/publish remain PK-run hard stops.

**Companions:** `control-plane-schema.md` (`envelopes/<id>.json` artifact) · `thin-orchestrator-charter.md` (who prepares it) · `../../CLAUDE.md` (Convention 2, the 7 STOPs, external-review rule 4).

---

## 1. The envelope object (immutable once presented)

The orchestrator prepares one `docs/control-plane/envelopes/<id>.json` per gate; PK executes it. **Once presented to PK it is frozen — any change mints a new `envelope_id`** (this is `reviewed_input_hash` discipline made physical; CLAUDE.md external-review rule 4).

```jsonc
{ "envelope_id": "...", "lane": "...", "presented_at": "<utc>",
  "pinned": { "reviewed_input_hash": "...", "diff_hash": "...", "artifact_version": "..." },
  "ordered_steps": ["1 ...", "2 ..."],
  "preconditions_still_true": ["named live pre-check A", "..."],   // re-checked immediately before apply
  "automatic_stops": [ "hash mismatch", "unexpected origin movement", "any non-clean review",
                       "named live pre-check fail", "deployed/applied artifact mismatch",
                       "unexpected files in the change set", "invalidated rollback" ],
  "max_scope": { "files": ["..."], "objects": ["..."] },
  "expected_post_step_evidence": ["step 1 → rowcount = N", "step 2 → live SELECT shows ..."],
  "rollback": { "written": true, "validated_before_apply": true, "path": "..." },
  "no_improvisation_outside_envelope": true }
```

## 2. The seven mandatory STOPs (non-removable — CCF-02 Convention 2)

hash mismatch · unexpected origin movement (unless independently verified benign and unrelated) · any non-clean review verdict · named live pre-check failure · deployed/applied artifact mismatch · unexpected files in the change set · invalidated rollback path. **A tripped STOP voids the remainder of the sequence; resumption requires a fresh PK gate.** A Convention-2 conditional sequence (pinned hash + ordered steps + these STOPs) is the only one-sitting form for an irreversible sequence — it is how PK exercises deploy authority in one sitting, not a delegation of it.

## 3. Freshness before apply (control-plane §5)

Preconditions are re-checked immediately before the act. Any control-plane state a precondition reads must be **fresh**: rerun the compiler, or verify the full source fingerprint (HEAD · git status · worktree inventory · claim/result stubs · register state) still matches. `generated_at_head == live HEAD` alone is insufficient. Never carry a pinned hash forward from an earlier envelope without re-verifying it — bytes change.

## 4. Calibration — what COMBINES vs what STAYS SEPARATE

This is the judgment the protocol encodes. **Combine steps that share one judgment and whose intermediate gates are machine-checkable; split the moment a new human judgment intervenes.**

**COMBINES into one envelope:**
- `apply_migration` + in-transaction pool-neutrality/fail-closed assertion + post-apply live SELECT/sha256 proof — one judgment ("is this dark/additive change safe?"), all evidence mechanical (image-workflow P2 "per-apply guards never waived" + the governor Closure-recompute).
- build → branch-warden → external review pinned to hash → the deploy command — one judgment ("ship this exact reviewed artifact"), gated by the 7 STOPs. The deploy still stays PK-run.

**STAYS SEPARATE (a distinct PK judgment sits between):**
- A **governance flip** (enable a client, flip a guard to production) **after** a visual/quality proof — "PK visual verdict is the only deciding act," fenced-until-approved default (image-workflow §2). Never bundle the flip into the intake envelope.
- Deploy an EF (code-correct judgment) vs then flip its per-client governance flag (client-safe judgment) — two gates. A `policy_decision` PK already answered is *answered, not passed*; a *new* posture flip is a new decision.
- Security/posture changes (grants, SECDEF, secrets) never combine — T3, nothing waived.

**The rule in one line:** one judgment + mechanical gates → one envelope; a visual, governance, or security judgment between steps → separate gates.

## 5. Paste-block form (operating-manual-v1 §10)

When presented to PK, an envelope is written as a paste-block PK sends himself — in the imperative, self-contained, carrying in order: pinned hashes → numbered steps → named live pre-checks → mandatory STOPs → the written-and-validated rollback → the explicit FORBIDDEN list (commit/push/deploy/publish/flip/which aliases) → "report and stop." A paste-block is PK speaking; the orchestrator never sends the irreversible act itself.

## 6. Boundaries

The envelope authorises nothing on its own; it structures a decision PK makes. It adds no authority to the orchestrator, amends no CCF-02 rule (Convention 2 and the 7 STOPs are unchanged here — this spec references them, it does not redefine them), and its immutability + hash-pinning make review staleness machine-detectable. No envelope is built or executed by this document.
