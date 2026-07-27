# Brief — CCF-04 helper-path measurement lane (cc-0080 packet, path-to-freeze)

**Created:** 2026-07-27 Sydney
**Author:** chat (drafted by `brief-author`, DRAFT_READY / findings `clean`)
**Executor:** Claude Code (orchestrator-driven)
**Status:** APPROVED — PK Gate 1, 2026-07-27
**Result file:** `docs/briefs/results/ccf-04-helper-path-measurement-cc0080-result-v1.md` (created on completion)

> **Lane class (CCF-02):** SIDE_PROVING · **Tier:** T2 (justified in Scope). No new cc-ID (PK: "approve as-is"); rides as a CCF-04 measurement exercise.

---

## PK Gate-1 rulings (2026-07-27)

1. **Brief approved as-is** (SIDE_PROVING / T2, path-to-freeze). No new cc-ID minted.
2. **Live-DB truth SCOPED OUT.** `db-rls-auditor` does not run in this lane; the packet's live cohort claims (0-row queue cohort, 37 YouTube orphans) are NOT re-derived. Recorded as an explicit scope-out; db-rls-auditor stays a handoff for the real apply lane.
3. **Working-tree pin only.** Freeze = `hash-checkpoint` pin of working-tree bytes ("STABLE BUT NOT IMMUTABLE"). No git commit — the lane is genuinely no-mutation. Commit-to-a-ref stays reserved to the later SoD/apply lane.
4. **Orchestrator judgment (flagged, not a PK ask): external review DEFERRED to the apply lane.** Running `ask_chatgpt_review` on `713ab4ae` now would be indistinguishable from the cc-0080 **delta re-review** — a precondition this lane is forbidden to clear (and the bridge is idempotent per-hash/day). Specialist chain for this path-to-freeze lane = **branch-warden only**; db-rls-auditor + external review are apply-lane handoffs.

---

## Task

Route the current cc-0080 Publish-Status Reconciliation apply packet — the artifact the action-list register calls "v3 (`713ab4ae…`)" (`docs/00_action_list.md:8`), described by packet **v6** (`docs/briefs/cc-0080-reconciler-gate1-proof-and-apply-packet-v6.md`) — through the **complete CCF-04 helper path**, from source-truth verification through artifact freeze and register recording, and **measure** whether that path reduces manual effort against the pre-CCF-04 manual baseline. Produce a **count-based tally**: for each CCF-04 helper, (a) did it fire, (b) what did it catch/surface, (c) how many manual checks or governance steps it removed versus doing the same work by hand (`CLAUDE.md` §CCF-04 helper loop; baseline framing `docs/briefs/results/ccf-04-helper-loop-wiring-result-v1.md:6-8`). This is a governance/measurement lane only. It STOPS at the PK apply gate; it performs **no** production apply, deploy, migrate, DML or DDL. cc-0080's real apply remains hard-blocked and is **out of scope** (`docs/briefs/cc-0080-reconciler-gate1-proof-and-apply-packet-v6.md:3`; `docs/00_sync_state.md:141`).

## Source context

- `CLAUDE.md` — "CCF-04 helper loop": `source-truth-check` AUTO-FIRES at SessionStart; `claim-stub` AUTO-FIRES as a PreToolUse `--log-only` guard on a register-file-staged commit and is run by hand before a register version cut; `hash-checkpoint` has NO auto-trigger — invoked by hand when FREEZING/PINNING an artifact → STABLE/UNSTABLE/INCOMPLETE/MISMATCH; `apply-harness-auditor` is the registered SHADOW agent — **its PASS clears no gate**.
- `.claude/helpers/{hash-checkpoint,claim-stub,source-truth-check,apply-harness-auditor,register-pointer}.mjs` — backing helpers (all present).
- `docs/briefs/cc-0080-reconciler-gate1-proof-and-apply-packet-v6.md` — the **current single packet** ("Supersedes v5; single current packet"). Records SQL artifact `supabase/migrations/NOT_APPLIED_cc0080_reconcile_publish_status_v3.sql`, **SHA256 `713ab4ae…`, 23774 bytes**; marks `d227fefc…` the **DEAD PIN**; T3 / APPLY HARD-BLOCKED, apply order LAST.
- `docs/briefs/cc-0080-reconciler-gate1-proof-and-apply-packet-v3.md` — the file literally named "v3" is a **doc-only amendment** still pinning the OLDER `d227fefc…`. **The naming ambiguity to reconcile mechanically, not by assumption.**
- `docs/00_action_list.md:8` / `docs/00_sync_state.md:141,130` — cc-0080 NOT APPROVED / NOT REVIEWED / NOT APPLIED; apply hard-blocked on PK's gate + SoD hand + independent-executor rehearsal + delta re-review.
- `docs/briefs/results/ccf-04-helper-loop-wiring-result-v1.md` — CCF-04 set-complete record; charter test "remove manual effort WITHOUT removing human judgment".
- Register head is **v6.31** (`docs/00_sync_state.md:9`). cc-0080 reserved block **v6.90–99**; cc-0081 reserved block **v7.00–09** — relevant to claim-stub reserved-block-awareness.

## Scope

**In scope:**
- Run the complete CCF-04 helper path over the cc-0080 packet, **path-to-freeze only**: source-truth-check (confirm auto-fire / re-run by hand for the already-landed check) → hash-checkpoint (pin the authoritative packet bytes) → apply-harness-auditor SHADOW (on the packet's declared harness) → branch-warden (HEAD/parity/change-set at freeze) → artifact freeze → result doc + a **single** register pointer (claim-stub at the version cut).
- **First in-scope step — the hash reconciliation.** Use `hash-checkpoint` to mechanically determine which file's bytes equal `713ab4ae…` and confirm the DEAD PIN `d227fefc…` is not the pinned artifact.
- The count-based measurement tally + a plain-language conclusion on whether the path reduced repeated checks and manual governance steps.

**Out of scope:**
- Any production apply, deploy, migrate, DML or DDL (PK apply gate is the hard stop, outside this lane).
- cc-0080's SoD gate, independent-executor rehearsal, delta re-review — neither performed nor cleared.
- Editing the applied cc-0063 `.sql` or any frozen artifact.
- Building any new agent.
- Re-deriving the packet's live-DB claims (PK-scoped-out; db-rls-auditor handoff).
- External review (deferred to apply lane per Gate-1 ruling 4).

**Tier justification (T2):** touches no production, mutates no DB, issues no deploy/migrate/DML/DDL (< T3); above T1 because it runs T2 machinery (apply-harness-auditor SHADOW, branch-warden) against a T3 packet. Escalation up is free but must be named.

## Allowed actions

- Read the cc-0080 packet(s), CCF-04 helpers/hooks, registers, CLAUDE.md as evidence.
- Run `source-truth-check`, `hash-checkpoint`, `claim-stub` — zero-authority, inform/log-only.
- Invoke `apply-harness-auditor` as the registered SHADOW agent; record verdict as author-signal only.
- Run branch-warden for HEAD/parity/ref + change-set at freeze.
- Freeze the measured artifact by pinning its confirmed working-tree hash; compose **one** Convention-1 register pointer (optionally via the #6 register-pointer helper) at the terminal state.
- Write the result doc and (on PK instruction) the single register pointer.

## Forbidden actions

- **No production apply, deploy, migrate, DML, or DDL** — path-to-freeze only.
- **Do NOT mark cc-0080 approved, reviewed, or proven; do NOT clear or claim to clear the SoD gate, independent-executor rehearsal, or delta re-review** — all remain open and PK-owned.
- **Do NOT edit the applied cc-0063 `.sql` or any frozen artifact.** Editing cc-0080 SQL would re-hash it and void the pin/review.
- **Build NO new agent.**
- **Do NOT alter, delegate, or bypass any PK gate or PK decision authority.** Every CCF-04 helper is inform/log-only — a PASS/clean/PROPOSED/STABLE verdict clears **no** gate.
- **No historical register rewrite.** Register touch = a **single** pointer at the terminal state (Convention 1).
- **Do NOT assume which file equals `713ab4ae`.** Resolve by `hash-checkpoint`.
- **Convention-2 mandatory STOPs remain armed:** hash mismatch, unexpected origin movement, any non-clean review verdict, unexpected change-set, invalidated pin → STOP and surface to PK.

## Success criteria

- **Count-based tally produced**, one row per CCF-04 helper in the path — `source-truth-check`, `hash-checkpoint`, `apply-harness-auditor` (SHADOW), `claim-stub` (+ #6 `register-pointer` template) — each recording: (a) did it fire (Y/N + evidence), (b) what it caught/surfaced, (c) how many manual checks/steps it removed vs the pre-CCF-04 baseline.
- **Hash reconciliation closed mechanically:** hash-checkpoint names which file's bytes equal `713ab4ae…` and confirms `d227fefc…` is the dead pin — a verified byte result, not an assumption.
- **Path-to-freeze chain ran and is recorded:** apply-harness-auditor SHADOW verdict captured (author-signal only); branch-warden HEAD/parity/ref + change-set clean; db-rls-auditor + external review recorded as apply-lane handoffs with reason.
- **Net-effort conclusion stated honestly:** whether the path yielded fewer repeated checks and fewer manual governance steps, with counts backing the claim.
- **Proof conditions hold:** no new agent built; PK decision authority unchanged (no gate cleared by any helper); no production apply/deploy/migrate/DML/DDL; register touch is a single terminal-state pointer.
- **Findings-contract block returned** (10-field, `verdict.normalized`).

## Stop condition

When the tally, the mechanical hash reconciliation, and the path-to-freeze chain are complete and recorded, **freeze the measured artifact (pin its confirmed working-tree hash), compose the single Convention-1 register pointer, write the result, and STOP.** Do **not** proceed toward the cc-0080 PK apply gate. A tripped Convention-2 STOP voids the remainder and surfaces to PK for a fresh gate.
