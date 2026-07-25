# Gate-2 Packet — `apply-harness-auditor` (build complete, both proof sets PASS, chain clean)

**Status:** ⏸ **STOPPED AT PK GATE 2** — build complete, independently proven, review chain clean. **Nothing registered, merged, deployed, or pushed. Zero production mutation.**
**Lane:** S9 agent-quality stream · CCF-04 candidate · **T2** build lane · SAFETY_GATE
**Date:** 2026-07-25 Sydney · **Owner:** S9 (implementation) + S5 (independent sealed grader) + orchestrator (coordination only)
**Governing Gate-1 brief:** `docs/briefs/apply-harness-auditor-gate1-brief-v1.md` (`c15e7b2c…`, PK-approved) · O-2/O-3/O-5/O-7 resolved therein.

---

## 1. What was built (local-only, uncommitted)

A read-only, deterministic, **zero-authority advisory** analyzer that inspects an ICE apply packet's safety harness **before freeze** and flags where the packet **declares** a protection its executable SQL does not enforce — the cc-0079 Slice-2 failure class (comment-only STOPs · pooled-call transaction non-composition · a baseline that excludes an unaffected platform), caught one gate earlier. It **never** approves an apply, judges business/payload correctness or architecture, verifies live/DB/git truth, or replaces `db-rls-auditor` or PK's apply gate.

- **Worktree:** `C:\Users\parve\ice-worktrees\apply-harness-auditor-build` · **branch:** `lane/apply-harness-auditor-build` (off `befdaf5`) · **0 commits**, all files **untracked**.
- **Deliverable files (the only changed paths):**
  - `.claude/helpers/apply-harness-auditor.mjs` — analyzer (pure core + thin `main()`, fail-closed).
  - `.claude/helpers/apply-harness-auditor.test.mjs` — 82 hermetic `node:test` cases.
  - `.claude/helpers/fixtures/apply-harness-auditor/**` — 30 synthetic fixtures.

## 2. Exact hashes (frozen candidate)

| Artifact | sha256 |
|---|---|
| **analyzer** `apply-harness-auditor.mjs` | `c3e7395fa293b9fc77d919295342369b35e6cd339a083688fa595f0393632cee` |
| tests `apply-harness-auditor.test.mjs` | `2e06d860f1856c7e5f2f2cca779e93748267e8077a12e097263b61933a97ca11` |
| fixtures rollup (30 files) | `bf05e1b8758067b636cd592b44a14118a24090eb6e6b7d732416c72c954ea50a` |

## 3. Design (as resolved at Gate 1)

- **Verdict contract:** `PASS` / `CONCERNS` / `INCOMPLETE` → CCF-02 `clean` / `concerns` / `block`. **O-2:** findings are enumerated **independently** of the rolled-up verdict — an `INCOMPLETE` packet still lists its concrete findings.
- **Ten checks:** (1) declared STOP→executable enforcement; (2) comment/prose-only abort claim; (3) row-count expectation without fail-closed `RAISE`; (4) atomicity vs a NAMED single-call channel; (5) unsafe multi-call/pooled transaction assumption; (6) an assertion evaluating a scope with no covering baseline; (7) apply-vs-rollback identity mismatch (UUID-list + non-ephemeral pre-image relation identity); (8) executable order vs declared gate order; (9) failure branch that continues instead of aborting; (10) missing execution-channel/control-register info.
- **O-3 input:** parses packet prose · SQL/harness blocks · declared STOPs · assertion register · named channel · baseline queries · rollback identities. Never infers a missing control from path naming or session context.
- **Each finding:** stable id · severity · packet section · executable location · declared control · observed implementation · consequence · recommended author action.
- **Safety posture:** fail-closed → `INCOMPLETE` on any parse/internal error (never a fabricated PASS); deterministic (byte-identical across runs); static-audited — **no fs writes** (reads its input only), **no network / child_process / git**; no hardcoded fixture answers / platform names / filenames / line numbers.

## 4. Proof set A — KNOWN-FIXTURE regression (three real ICE packets)

| Packet | Result |
|---|---|
| **v2** `73dd7413…` (defect-bearing) | **Detects all three** — M-1 (AHA-01 unenforced A0–A6 · AHA-02 comment aborts · AHA-03 row-counts) · M-2 (AHA-04/AHA-10 no named channel) · **M-3 (AHA-06 'youtube' non-regression assertion with no covering baseline)** |
| **v3** `a91143311b72…` | **clean PASS**, 0 findings |
| **v4** `1579115675c5…` | **clean PASS**, 0 findings |

Labeled **KNOWN-FIXTURE REGRESSION** (not blind — the implementer saw these graded outcomes across iterations, per your ruling). These are mandatory regression fixtures; the blind admission proof is set B.

## 5. Proof set B — INDEPENDENT sealed blind grading (S5) — **ALL-PASS 15/15**

An independent hand (S5) authored **15 sealed fixtures** on unrelated invented subject matter (a fictional inventory/ledger migration series — **not** copied from the real packets), sealed the expected answers (manifest `fb82e600…`), kept them hidden from S9, and graded the **exact frozen hash** `c3e7395f…`:

- **15/15 ALL-PASS**, determinism confirmed (two runs byte-identical).
- Included **false-positive traps** (prose control-like tokens; a legitimately-scoped baseline exclusion; a valid full-table baseline) and a **payload-correctness trap** (suspicious business numbers + a sound harness) — all correctly **not** flagged.
- **The two-hand protocol earned its keep twice:** the sealed grader caught two real defects the known-fixture regression missed — a check-7 **false-GREEN** (a broken non-UUID rollback identity passing clean), then a check-7 **over-fire** (a sound in-transaction assertion-baseline shape falsely flagged). Both were fixed **generically** and the final re-grade is clean.

## 6. Review chain

- **branch-warden: `safe`** — isolated worktree, 0 commits, nothing pushed/merged, changed set == the three expected paths, nothing under `.claude/agents/` / registers / `supabase/`, R4 clean. (Note: lane base `befdaf5` is 2 commits behind `main` `3dee7e5`; harmless while uncommitted — a rebase is the normal step **if** a merge is later authorized.)
- **External review: CLEAN** — `review_id` **`fef05399-b62c-4c20-93d9-33bb70045471`**, verdict **agree** / **proceed** / escalate false / requires_pk_escalation false, high confidence, **zero pushback**, pinned to `reviewed_input_hash` `c3e7395f…`. Two standing *assumptions* noted (not defects): the advisory tool must not lull a human into skipping the real review; the independent grader's proof is relied upon — both are the design's explicit conditions (zero authority, human gates unchanged, sealed independent fixtures).

## 7. Build history (transparency)

6 `ef-builder` correction passes: initial build → prose-token/M-3 false-positive fixes → check-6 coverage reframe → prose non-regression scope extraction (M-3 on v2) → C7/channel/C2/C3 fixes → C2 narrative-noun FP fix → C7 over-fire narrowing. **Check 7 (apply/rollback identity) was the persistently-hard check** (three revisions, ping-ponging false-negative↔false-positive); it converged on an ephemeral-vs-durable pre-image distinction and now passes both proof sets. The other nine checks stabilized quickly.

## 8. Known limitations (for PK + a future registration gate)

- Apply/rollback region split keys on a section titled `rollback`; an unlabeled rollback section merges into the apply region (possible miss, **no false fire**).
- Pre-image identity keys on recognized suffixes + `FROM/USING/JOIN` restore reads; a restore via a view/CTE alias or a non-suffix snapshot name is not matched (conservative miss, no false fire).
- Check-2 bare-conditional detection is scoped to directive abort tokens to kill narrative-noun false positives; a genuine abort phrased only with the noun `rollback`/`stop` could be missed.
- Channel recognition is pattern-based; an unusual single-call channel phrasing could read as unnamed → `INCOMPLETE` (fail-safe — never false-approves).

Every limitation is toward a **miss or a fail-safe INCOMPLETE**, never a false GREEN on the proven classes.

## 9. Explicitly DEFERRED — each its own separate gate (NOT done here)

- **Registration** (place `.claude/agents/apply-harness-auditor.md` charter + add to the CLAUDE.md team table) — a **separate PK gate** per the Gate-1 brief. **Not written; not placed in `.claude/agents/`.**
- **Merge to `main`** (would need a rebase onto `3dee7e5` + a fresh branch-warden + your authorization) — **not done**.
- **CCF-04 helper-sequence placement** (O-5 — vs Claim Stub / Hash Checkpoint) — per the Gate-1 brief, recorded as an **unresolved portfolio-order question to settle after this agent is proven**.
- **First live use** at a real apply gate — never in an ACTIVE production gate as an unregistered/unproven tool; offline only until registered.

## 10. Next gate

> **PK Gate 2** — accept or reject the built + proven `apply-harness-auditor` analyzer (`c3e7395f…`). Acceptance clears the analyzer; **registration remains a separate PK gate**, as does any merge. On rejection or requested change, the build returns to S9 (the sealed set + both proofs are reusable).
