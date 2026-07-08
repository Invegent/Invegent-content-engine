# Brief cc-0031 — CCF-04 Lane 1: Source Truth Check assistant

**Created:** 2026-07-08 Sydney · **Author:** brief-author (PROVEN) · **Executor:** Claude Code (ef-builder)
**Status:** issued → complete · **Tier:** T2 · **Label:** SIDE_PROVING
**Result file:** `docs/briefs/results/cc-0031-ccf-04-source-truth-check-result.md`
**Charter:** `docs/briefs/ccf-04-mechanical-assistants-charter.md` (CCF-04 lane 1 of the PK priority order)

---

## Task

Build CCF-04's first Mechanical Assistant: a zero-authority, purely **read-only** local Node ESM helper (`.claude/helpers/source-truth-check.mjs`) a session runs BEFORE starting a lane to answer *"am I working from truth?"* It PRINTS a situational report from five read-only signals and RESOLVES NOTHING — no reset/rebase/commit/pull/merge/push/reconcile/fix, no file write anywhere. A detected divergence / already-landed / stale-local is SURFACED as a human decision, never auto-corrected. Mirrors the proven `.claude/hooks/sql-content-gate.mjs` shape (exported pure core + thin `main()` + fail-closed).

## The five read-only signals

1. `git fetch origin` (sole network/git action; mutates remote-tracking refs only).
2. origin/main HEAD SHA + current origin register head version (derived LIVE from `docs/00_sync_state.md`, highest `v5.NN`, never hardcoded).
3. local `main` vs `origin/main`: ahead N / behind M + diverged.
4. working-tree dirty/staged/untracked summary.
5. optional `--hint <paths,slug>` "already-landed?" check — does origin/main already contain byte-identical files (by git blob id, any path) or a commit subject matching the slug (the cc-0028 class).

## The two honesty guardrails (the design's core)

- **Never writes/resolves:** no fs write (no `node:fs` import); only `git fetch` runs; every risk printed as an explicit human decision.
- **Never a false all-clear:** any internal/git error → UNKNOWN + exit 2 (never a fabricated "clean"); already-landed EMPTY match → "no match found (not proof of novelty)", never "safe"/"not landed"/"clear"; a zero-risk state explicitly declines to certify.

## Motivation (measured)

The cc-0028/cc-0029 reconciliation (2026-07-08) existed entirely because a session's local `main` was stale-and-diverged and did not know its LinkedIn work had already landed on origin under rebased SHAs (source + docs byte-identical). A pre-lane Source Truth Check surfaces "already landed on origin" up front. PK ranked this Priority 1 of the CCF-04 assistants: stale local · already-merged-elsewhere · wrong assumptions · duplicated work.

## Scope

**In scope:** the one helper `.mjs` + a hermetic `node:test` suite, built in an isolated worktree, exported-pure-core + fail-closed. **Out of scope:** the other four CCF-04 assistants (each its own later PK-gated lane); any write surface (incl. a claim stub — that is Priority 2, Claim Stub); any product/pipeline/DB/deploy change; any CLAUDE.md/contract amendment.

## Allowed / Forbidden

**Allowed:** author the helper + test in an isolated ef-builder worktree; the helper runs `git fetch origin` + read-only git/FS reads at run time. **Forbidden:** ZERO writes by the helper (no reset/rebase/commit/pull/merge/push/config/stash/reconcile/fix; not even a claim stub); the entire CCF-04 reject list; no network beyond `git fetch`; no DB/secret/deploy/enforcement-flip; no CCF-02/CLAUDE.md amendment (build UNDER the living contract); no CCF-03 observer rebuild; isolated worktree, R4 (never touch another session's unpushed commit).

## Success criteria (all met — see result doc)

Correctly reports ahead/behind + divergence; SURFACES an already-landed-under-a-different-SHA case as a possibility (never certainty/action); reports stale-local; every risk is a human decision (no resolve in any path); ZERO writes across all paths; exported pure core unit-tested without git; fails closed to UNKNOWN (never false all-clear); hermetic tests green; branch-warden safe; external review clean.

## Review chain (T2)

ef-builder (isolated worktree, local-only) → branch-warden `safe` → external review pinned to hash → PK Gate 2. **db-rls-auditor NOT required per R1** (no DB subject, no DB read) — omission named.

## Stop condition

Report per result template; the helper is local dev tooling — never deployed; a human runs `node .claude/helpers/source-truth-check.mjs [--hint <paths,slug>]` before a lane.
