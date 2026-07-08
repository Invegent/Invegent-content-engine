CLAIMED v5.35 · cc-0031-ccf-04-source-truth-check · ice-worktrees/ccf04-stc-merge (isolated, off origin/main 21d65d8) · gate: PK Gate 2 (approved) · 2026-07-08 Sydney

# Result cc-0031 — CCF-04 Lane 1: Source Truth Check assistant (BUILT + MERGED)

**Outcome:** ✅ CCF-04's **first Mechanical Assistant** built, reviewed clean, PK-approved at Gate 2, merged to main. Zero-authority read-only local dev tool; not deployed (a human runs it before a lane).
**Tier/Label:** T2 · SIDE_PROVING · **Brief:** `docs/briefs/cc-0031-ccf-04-source-truth-check.md` · **Charter:** `docs/briefs/ccf-04-mechanical-assistants-charter.md`

## What shipped

`.claude/helpers/source-truth-check.mjs` (+ `source-truth-check.test.mjs`) — a read-only pre-lane truth reporter mirroring the proven `sql-content-gate.mjs` shape (exported pure core `parseRegisterHead`/`classifyRisks`/`computeReport` + thin direct-invocation `main()` + fail-closed). Five read-only signals: git fetch · origin HEAD + live register head · local ahead/behind/diverged · working-tree state · optional `--hint <paths,slug>` already-landed check (byte-identical blob match under any path + commit-subject slug match).

**Run:** `node .claude/helpers/source-truth-check.mjs [--hint <paths,slug>]` — prints the report; exit 0 normally, exit 2 if any signal is UNKNOWN (fail-closed).

## The two honesty guardrails (implemented + test-covered)

1. **Never writes/resolves** — no `node:fs` import; only `git fetch` runs (remote-tracking refs only); every risk printed as an explicit human decision. Statically verified (test: no fs-write import; no resolving git verb as argv).
2. **Never a false all-clear** — error → UNKNOWN + exit 2; already-landed EMPTY match → "no match found (not proof of novelty)", never safe/clear/not-landed; zero-risk state declines to certify.

## Review chain (all clean)

- ef-builder: 2 new files, 664 lines; **19/19** hermetic tests; sibling `sql-content-gate.test.mjs` **95/95** untouched. Live dogfood: correctly flagged the checkout's real diverged+dirty state as human decisions, derived register head live, `--hint` surfaced an already-landed match as possibility-not-certainty.
- branch-warden: **safe** (exactly the 2 files; zero existing-file mods; R4 respected — shared checkout's other-session commit not touched).
- external review: **`90762ebd-5fcd-417a-9c38-55701d8b13b7` agree/low/high, zero pushback, first attempt**, pinned to diff hash `95224be2f25258d4afba1c2dbeda132813805f0e3b3556e72e46cf1c84da558b`.
- db-rls-auditor: omitted per R1 (no DB subject, no DB read) — named.

## Merge

Assembled in an isolated worktree off origin/main `21d65d8` (register v5.34 → claimed v5.35); helper files copied byte-identical from the reviewed build (sha `f18e1bf9…` / `998b147d…`); tests re-run 19/19 green pre-commit. Merged fast-forward to main on PK Gate-2 approval. Package: 2 helper files + this brief + result + register pointers. No deploy.

## CCF-04 status after this lane

Charter live (v5.33). **Lane 1 (Source Truth Check) DONE** — first Mechanical Assistant proven and merged. Reserved next, PK priority order: 2) Claim Stub (brief drafted) · 3) Hash Checkpoint · 4) Review Packet Template · 5) Register Pointer. Each its own future PK-gated ~1-day lane, built only if it measurably reduces recurring toil.

**Non-claims:** local dev tooling only — nothing deployed/wired/enforced; zero-authority (no commit/push/approval/resolve by the helper); no DB/product/pipeline change; CCF-02 contract unchanged; CCF-03 stays retired.
