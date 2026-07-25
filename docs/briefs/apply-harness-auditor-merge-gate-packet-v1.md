# Merge-Gate Packet — `apply-harness-auditor` (rebased, one code-only commit prepared)

**Status:** ⏸ **STOPPED AT PK MERGE GATE** — rebase + re-proof + one code-only commit complete. **NOT pushed, NOT merged, NOT registered. Zero production mutation.**
**Lane:** S9 agent-quality stream · CCF-04 candidate · **T2** · SAFETY_GATE
**Date:** 2026-07-25 Sydney · **Predecessor:** Gate-2 packet `docs/briefs/apply-harness-auditor-gate2-packet-v1.md` (`27401180…`, PK-APPROVED)

---

## 1. The prepared commit (code-only)

- **Commit:** `a272e2f9e6b84c07f59d89bc79e732ce8e42f6c2` on branch `lane/apply-harness-auditor-build`.
- **Parent:** `3dee7e5a3c8f24f6d51a1275214d3e696c54948d` (current `main` HEAD) → **clean fast-forward candidate** (lane is 1 ahead / 0 behind main).
- **Contents:** exactly the **32 deliverable files** — `.claude/helpers/apply-harness-auditor.mjs`, `.claude/helpers/apply-harness-auditor.test.mjs`, and 30 `.claude/helpers/fixtures/apply-harness-auditor/*.md`. **No** `.claude/agents/` charter, **no** CLAUDE.md team-table edit, **no** register/`supabase`/production path.
- **Not pushed** (`ls-remote origin lane/…` = 0). **Main repo HEAD unchanged** at `3dee7e5` — lane NOT merged.

## 2. Merge-prep re-verification (PK's steps 1–7)

| Step | Check | Result |
|---|---|---|
| 1 | Rebase `befdaf5` → current `main` `3dee7e5` | ✅ fast-forward, 0 lane commits pre-commit; deliverable preserved |
| 2 | Changed set == exactly the 3 deliverable paths | ✅ 32 files, all under `.claude/helpers/…`, nothing outside |
| 3 | Re-run all 82 tests | ✅ **82/82 pass** at the rebased base |
| 4 | Re-run known-fixture regression | ✅ v2 detects **M-1/M-2/M-3**; v3 + v4 **clean PASS** |
| 5 | Analyzer behaviour identical | ✅ identical verdicts; analyzer sha unchanged |
| 6 | Recalculate hashes after rebase | ✅ analyzer `c3e7395f…` · tests `2e06d860…` · fixtures rollup `bf05e1b8…` — **all == accepted candidate** |
| 6b | Committed-blob provenance | ✅ `git show HEAD:…mjs`/`…test.mjs` sha256 == accepted `c3e7395f…`/`2e06d860…` byte-for-byte (CRLF warning cosmetic; LF blobs stored). Fixtures working-tree rollup unchanged at `bf05e1b8…`. |
| 7 | branch-warden on rebased state | ✅ **`safe`** — isolated, 0 pre-commit commits, changed set == deliverable, no agents/register/charter/production, R4 clean |
| 8 | Prepare one code-only commit | ✅ `a272e2f9…`, parent `3dee7e5`, 32 files, code-only |
| 9 | Stop at PK merge gate | ✅ **here** |

## 3. The merge command — PREPARED, NOT EXECUTED (PK runs it)

The merge is a clean fast-forward. The irreversible step PK owns:

```bash
# in the MAIN repo C:\Users\parve\Invegent-content-engine, on branch main @ 3dee7e5:
git merge --ff-only lane/apply-harness-auditor-build   # fast-forwards main to a272e2f9
git push origin main                                   # explicit PK push
```

**STOP conditions (Convention-2):** main HEAD ≠ `3dee7e5` at merge time (origin moved → re-rebase + fresh branch-warden) · lane tip ≠ `a272e2f9…` · any file outside the 32-path deliverable in the commit · any recomputed hash ≠ accepted · non-fast-forward. A tripped STOP voids the merge; resume needs a fresh gate.

## 4. NOT authorised by this packet (each its own separate gate)

- **The merge/push itself** — PK merge gate (above).
- **Registration** — `.claude/agents/apply-harness-auditor.md` charter + CLAUDE.md team-table entry. A **separate registration packet + PK gate** AFTER the code is merged (§5).
- **Invocation in an active production apply gate** — never as an unregistered/unproven tool.
- **Replacing/bypassing `db-rls-auditor`** or any change to PK apply authority.

## 5. After merge — separate registration packet (to be prepared later)

Will define: exact agent name + charter · zero-authority advisory role · allowed inputs · verdict contract · prohibited judgments · relationship to `db-rls-auditor` · required human review · invocation timing · failure/`INCOMPLETE` handling · audit/logging expectations · removal/disable path. **Subject to a separate PK decision.**

## 6. Initial operational posture (post-merge + post-registration)

**OFFLINE ADVISORY / SHADOW MODE** — run on historical defect-bearing packets, historical clean packets, and newly authored apply packets before freeze. For the initial proof period: record its verdict; compare with the human author and `db-rls-auditor`; **its PASS never clears a gate**; `CONCERNS`/`INCOMPLETE` = an author-review signal; **all existing specialist + PK gates preserved**.

## 7. Next gate

> **PK MERGE GATE** — authorise the fast-forward merge of `a272e2f9…` into `main` (and push). On authorisation, ICE runs the §3 command with the §3 STOP conditions. Registration remains a separate PK gate thereafter.
