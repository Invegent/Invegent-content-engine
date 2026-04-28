# Brief — Remote Branch Hygiene Pass (v2)

> **Owner:** Claude Code
> **Reviewer:** PK (commits result via CC's pushes; final approval before each delete)
> **Output:** Result file at `docs/briefs/2026-04-28-cc-task-remote-branch-hygiene-v2-result.md`
> **Estimated CC time:** 20–30 minutes
> **Date written:** 28 April 2026 evening (4th shift); execute next session

## Why this v2 brief exists

The original `2026-04-28-cc-task-branch-hygiene.md` brief asserted that "9 of 12 branches in the sync state's hygiene list are already gone — only 3 remain". CC ran `git ls-remote` against all three remotes during Task 3 execution and found that all 9 of the supposedly-deleted branches still exist on remote with the SHAs already listed in `docs/00_sync_state.md`.

Root cause of the v1 brief's wrong claim: chat-side phase-1 inventory used GitHub MCP `list_commits` with `sha=<branch_name>` and treated 404 responses as "branch doesn't exist". The 404s were a tool-specific failure mode (likely URL-encoding of the slash in `fix/m8`, `fix/q2`, etc.), not semantically meaningful. **Tentative Lesson #40 candidate** — MCP tool errors are not always meaningful; an unexpected error code does not equal absence of the underlying entity. Cross-check with a different tool or have CC verify with shell access before treating tool errors as ground truth.

This v2 brief avoids the chat-side inventory step entirely. CC's shell + `gh` CLI are the authoritative tools; the whole job runs there.

## The 9 surviving branches

Per CC's result file `docs/briefs/2026-04-28-cc-task-branch-hygiene-result.md`, these 9 branches still exist on remote and need verification before any disposition:

**Invegent-content-engine (3):**
- `fix/m8`
- `fix/m11`
- `fix/q2`

**invegent-dashboard (5):**
- `fix/cfw-schedule`
- `fix/m5`
- `fix/m7`
- `fix/m9`
- `fix/q2`

**invegent-portal (1):**
- `fix/m6`

CC should pull the head SHAs from the v1 result file rather than the sync state (the sync state's branch-list block is the source of the original error and should not be trusted as authoritative for SHAs).

## What CC must do for each branch

### Verification protocol (per branch)

```bash
cd <repo>
git fetch origin --prune

# 1. Confirm the branch still exists and pin the head SHA
HEAD_SHA=$(git ls-remote --heads origin <branch> | awk '{print $1}')
echo "<branch> head: $HEAD_SHA"

# 2. List commits on the branch that are NOT on main
git log origin/main..origin/<branch> --oneline

# 3. Look up any PR opened from this branch (this is the most decisive signal)
gh pr list --head <branch> --state all --json number,state,mergedAt,title,baseRefName

# 4. Diff stat vs main
git diff origin/main...origin/<branch> --stat

# 5. If the diff is non-empty, sanity check by content rather than SHA: are the commit messages already represented on main as direct-push commits?
git log origin/<branch> --oneline | head -10
git log origin/main --oneline | head -50 | grep -F -f <(git log origin/<branch> --pretty=%s | head -10)
```

### Decision matrix

For each branch, after verification:

- **PR merged + diff empty** → DELETE (`git push origin --delete <branch>`)
- **No PR + diff empty** → DELETE
- **No PR + diff non-empty + commit messages match recent main commits** → likely safe but FLAG to PK with the matching evidence; do not delete
- **No PR + diff non-empty + commit messages do NOT match** → DO NOT DELETE. FLAG to PK with the diff stat + commit list

### Pattern recognition

These 9 branches are mostly `fix/m*` and `fix/q*` style names. The naming convention suggests they're small scoped fixes that were probably already squash-merged via PRs — the kind GitHub auto-deletes only when the repo setting is enabled. Most likely outcome: 7–9 of them are merged-and-safe-to-delete, 0–2 may have unique work.

## What CC must NOT do

- Do not touch any branch not on the 9-row list above
- Do not touch `archive/slot-driven-v3-build` (it's the historical record of the slot-driven Phase A build; PK has explicitly said do not delete)
- Do not touch any branch whose name suggests it relates to Gate B, slot-driven, or active Phase B work, even if you find one in `git ls-remote` output that's not on the list above — flag to PK instead
- Do not modify main while doing this
- Do not delete a branch if its head SHA doesn't match what `git ls-remote` returns at the time of execution (avoids race with someone pushing to it)

## Output

Result file at `docs/briefs/2026-04-28-cc-task-remote-branch-hygiene-v2-result.md` with:

For each of the 9 branches:
- Repo + branch name
- Head SHA (from `git ls-remote` at execution time)
- PR status (merged / open / never opened)
- Diff stat vs main (empty / non-empty + counts)
- Commit list vs main (if diff non-empty)
- Action taken (deleted / flagged with reason)

Summary section at the end:
- N deleted, M flagged
- Total branches still surviving after this pass

If any branch was flagged rather than deleted, the file ends with a "PK action required" section listing the branches and the specific reason each was flagged.

## Out of scope

- Re-running the v1 inventory in chat (chat's GitHub MCP gave wrong answers; not the right tool)
- Touching the 3 already-handled branches from Task 3 (`feature/discovery-stage-1.1` engine + dashboard, `feature/slot-driven-v3-build`)
- Touching `archive/slot-driven-v3-build`
- Any work on Stage 12 migration filename audit-trail (that's tracked separately at `docs/audit/candidates_cycle_2.md`)

## After commit

PK acknowledges the result file in the next session's sync state. Branch hygiene closes out as a one-liner like "12 → 0 inventoried (3 handled in Task 3 + 9 in v2 sweep)" or whatever the actual outcome is.
