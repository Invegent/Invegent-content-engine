# Brief — Branch Hygiene Sweep (Phase 2 Execution)

> **Owner:** Claude Code
> **Reviewer:** PK (commits result via CC's pushes; final approval before each delete)
> **Output:** 3 branches verified and either deleted or archived
> **Estimated CC time:** 15–20 minutes

## Context — phase 1 already done

Chat (Claude Opus) inventoried all 12 branches the sync state called out for hygiene. **9 of 12 are already gone** — most likely auto-deleted by GitHub after squash merges. Only 3 branches still exist as of the inventory pass on 28 Apr evening:

| # | Repo | Branch | Head SHA | Last commit | Phase 1 recommendation |
|---|---|---|---|---|---|
| 1 | Invegent-content-engine | `feature/discovery-stage-1.1` | `741f3bc47852cd64e708c2e33e30285e9a9dedd0` | 27 Apr 07:29 UTC — Discovery 1.1 RPC migration 002 | Verify + delete |
| 2 | Invegent-content-engine | `feature/slot-driven-v3-build` | `6d66312f7908bec6743e165f90241acc77e1c3b0` | 27 Apr 05:40 UTC — Stage 12.053 fill_pending_slots | **Archive not delete** (see below) |
| 3 | invegent-dashboard | `feature/discovery-stage-1.1` | `c32aaf90596c8464a8fcc1c576493dcd2e1e6bbf` | 27 Apr 07:46 UTC — split DiscoveryKeywordsTab | Verify + delete |

## What CC needs to do for each branch

For each of the 3 branches above, CC must run this exact verification before deleting or archiving:

### Verification protocol

```bash
cd <repo>
git fetch origin --prune

# 1. Confirm the branch still exists
git ls-remote --heads origin <branch> | head -1

# 2. Get the branch's HEAD SHA and confirm it matches the inventory
git log origin/<branch> -1 --format="%H %ci %s"

# 3. List any commits on the branch that are NOT on main
git log origin/main..origin/<branch> --oneline

# 4. Look up any PR opened from this branch
gh pr list --head <branch> --state all --json number,state,mergedAt,title

# 5. If a PR exists and is merged: SAFE to delete (squash already in main)
# 6. If no PR exists: check if branch's commits are content-equivalent to direct-push commits on main (Lesson #38 territory — count diff is risky, do a sanity diff)
git diff origin/main...origin/<branch> --stat
```

### Decision matrix

For each branch, after running the verification:

- **PR merged + diff is empty** → DELETE (`git push origin --delete <branch>`)
- **No PR, but diff is empty (work landed via direct push to main)** → DELETE
- **No PR, diff is non-empty, and the commit messages match recent direct-push commits on main** → likely safe but FLAG to PK before delete
- **No PR, diff is non-empty, commit messages do NOT match any recent main commit** → DO NOT DELETE. Flag to PK with the diff summary

### Special handling — `feature/slot-driven-v3-build`

This branch was the single working branch for the whole slot-driven Phase A build (31 migrations, 6 crons, the foundation Gate B is currently observing). Even if its content has been replicated to main, the branch is a permanent record of the build path.

**Action:** rather than delete, rename to `archive/slot-driven-v3-build`:

```bash
cd Invegent-content-engine
git fetch origin
git branch archive/slot-driven-v3-build origin/feature/slot-driven-v3-build
git push origin archive/slot-driven-v3-build
git push origin --delete feature/slot-driven-v3-build
```

This preserves the SHA history under an `archive/` prefix while removing the misleading `feature/` prefix (which implies active work). If PK prefers a hard delete, they can override and CC just runs `git push origin --delete feature/slot-driven-v3-build` instead.

## What CC must NOT do

- Do not force-delete any branch that fails verification
- Do not delete a branch if its head SHA doesn't match the inventory above (means someone else may have pushed to it since phase 1)
- Do not touch any branch not on the 3-row table above (the other 9 are already gone)
- Do not modify main while doing this — branch deletion is a remote-only operation

## What CC reports back

A single result file at `docs/briefs/2026-04-28-cc-task-branch-hygiene-result.md` with:

For each of the 3 branches:
- The verification output (PR status, diff stat, branch-only commits if any)
- The action taken (deleted / archived / flagged)
- A 1-line summary

If any branch was flagged rather than deleted, the file ends with a "PK action required" section listing them.

## Out of scope

- Auditing branch protection rules
- Cleaning up tags
- Touching the 9 branches that are already gone (no work needed)
- Renaming or archiving any branch on `main` itself

## After commit

PK acknowledges the result file in the next session's sync state. Branch hygiene closes out as a one-liner: "12 → 3 inventoried, 2 deleted + 1 archived" (or whatever the actual outcome is).
