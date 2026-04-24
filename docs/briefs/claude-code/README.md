# Claude Code task briefs

Briefs in this folder are self-contained tasks for Claude Code to pick up directly in the terminal.

## How to use

**PK triggers a task:** open Claude Code in the `Invegent-content-engine` working directory and paste one of the prompts from the next section. Claude Code reads the brief from disk and executes autonomously.

**Claude Code executes:** reads the brief, follows the SETUP / OBJECTIVE / METHOD / DELIVERABLES sections, commits direct to main per standing workflow rule.

**Closure loop:** CC must update `docs/00_sync_state.md` under "TODAY'S COMMITS" with a one-line summary + commit SHA. This is how Claude Desktop sees the work on the next session.

## Ready-to-paste prompts

Each of the current task briefs can be triggered by pasting the prompt below into Claude Code.

### CC-TASK-01 — Dashboard roadmap sync (✅ closed 25 Apr)

```
Please read and complete the task described in
docs/briefs/claude-code/2026-04-25-cc-task-01-dashboard-roadmap-sync.md

This task lives in a DIFFERENT repo (invegent-dashboard). Clone or cd into
that repo before editing. The brief file itself stays in this repo; the commit
with the dashboard changes goes to invegent-dashboard.

Follow all SETUP, OBJECTIVE, METHOD, DELIVERABLES, VERIFICATION sections.
Before starting, read docs/00_sync_state.md in full (this repo).
Direct-push to main per the standing dev workflow rule.

When complete, update docs/00_sync_state.md in THIS repo under
"TODAY'S COMMITS" with a closure line + commit SHA per the
COMMIT BACK TO SYNC_STATE section.
```

### CC-TASK-02 — EF `.upsert()` audit (✅ closed 25 Apr, 1 HIGH / 0 MED / 1 LOW)

```
Please read and complete the task described in
docs/briefs/claude-code/2026-04-25-cc-task-02-ef-upsert-audit.md

This is an audit-only task. Do NOT fix anything. Produce the findings brief
at the exact path specified in the DELIVERABLES section.

Follow all SETUP, OBJECTIVE, METHOD, DELIVERABLES, VERIFICATION sections.
Before starting, read docs/00_sync_state.md in full and
docs/briefs/2026-04-24-a21-on-conflict-audit.md (it's the methodology template).

The cross-referencing step requires querying pg_constraint + pg_indexes
via Supabase MCP (project_id: mbkmaxqhsohbtwsqolns). If Supabase MCP is not
configured in this Claude Code environment, stop and ask before proceeding —
the audit is not valuable without the cross-reference step.

When complete, update docs/00_sync_state.md under "TODAY'S COMMITS" with a
closure line including finding counts + commit SHA.
```

### CC-TASK-03 — Frontend format/platform vocab audit (✅ closed 25 Apr, 1 HIGH / 9 MED / 3 LOW)

```
Please read and complete the task described in
docs/briefs/claude-code/2026-04-25-cc-task-03-frontend-format-vocab-audit.md

This is a CROSS-REPO audit. Sweep both invegent-dashboard AND invegent-portal.
The findings brief itself gets committed to THIS repo (Invegent-content-engine)
under docs/briefs/.

Follow all SETUP, OBJECTIVE, METHOD, DELIVERABLES, VERIFICATION sections.
Read docs/00_sync_state.md,
docs/briefs/2026-04-24-router-catalog-unification-shipped.md,
and docs/briefs/2026-04-24-router-hardcoded-values-audit.md first.

Audit-only. Do NOT fix anything. Focus especially on the 4 dead format values
(image_ai, video_slideshow, video_avatar, video_voiceover) — any reference to
these in production code paths is now a bug waiting to bite since FKs enforce
the vocabulary.

When complete, update docs/00_sync_state.md under "TODAY'S COMMITS" with
finding counts + commit SHA.
```

### CC-TASK-04 — Dead vocab + email typo cleanup (new, P1 fix)

```
Please read and complete the task described in
docs/briefs/claude-code/2026-04-25-cc-task-04-dead-vocab-email-typo-cleanup.md

This is a FIX task, not an audit. Bundle of 2 mechanical fixes addressing
CC-TASK-03 findings H1 (dead vocab in video-tracker.ts SELECT filter) and
M9 (email→newsletter typo in STUDIO_SUPPORTED_PLATFORMS).

Target repo: invegent-dashboard (clone or cd in). The brief itself lives in
Invegent-content-engine; the code commit goes to invegent-dashboard main.
Direct-push per D165.

Follow all SETUP, OBJECTIVE, METHOD, DELIVERABLES, VERIFICATION sections.
Before starting, read the full findings brief at
docs/briefs/2026-04-25-frontend-format-vocab-audit.md — it has the exact
file paths and line references for both fixes.

Expected scale: 5-15 lines changed, 1 commit, ~15 min wall time. If it's
taking more than 30 min, stop and flag — scope creep is the failure mode.

When complete, update docs/00_sync_state.md per the COMMIT BACK TO SYNC_STATE
section (commit SHA + sprint board + backlog cleanup).
```

## Brief structure (template)

Every CC task brief must include:

1. **CONTEXT** — why this task exists, what it's following up on
2. **SETUP — READ FIRST** — which docs to read, dev workflow, orphan sweep
3. **OBJECTIVE** — one paragraph on the deliverable
4. **METHOD** — step-by-step approach
5. **DELIVERABLES** — exact file paths, commit message template
6. **VERIFICATION CHECKLIST** — how CC confirms done
7. **OUT OF SCOPE** — what NOT to touch
8. **EXPECTED SCALE** — rough size expectations so CC knows if it's drifting
9. **COMMIT BACK TO SYNC_STATE** — closure protocol

## Current briefs (as of 25 Apr 2026)

| ID | Title | Priority | Effort | Risk | Status |
|---|---|---|---|---|---|
| CC-TASK-01 | Dashboard roadmap sync | P1 | 20-30 min | LOW | ✅ closed |
| CC-TASK-02 | EF .upsert() audit | P2 | 60-90 min | LOW | ✅ closed |
| CC-TASK-03 | Frontend format/platform vocab audit | P3 | 45-60 min | LOW | ✅ closed |
| **CC-TASK-04** | **Dead vocab + email typo cleanup (H1 + M9 fix)** | **P1** | **~15 min** | **LOW** | **🔲 pending** |

## Future CC tasks (ideas for when needed)

- CC-TASK-05 — publisher schedule source audit (L5 follow-up)
- CC-TASK-06 — `facebook-publisher` EF audit
- CC-TASK-07 — exec_sql eradication sweep (30+ remaining sites in dashboard)
- CC-TASK-08 — cron health dashboard tile (requires UI design work — pair task, not CC solo)
- CC-TASK-09 — `usePlatformVocab` + `useFormatVocab` hook rollout (3-4h focused frontend PR; solves 7 MED + 3 LOW from CC-TASK-03 in one pattern)

## What makes a GOOD CC task

- Well-bounded scope (can complete in one CC session)
- Clear pass/fail criteria (checklist of verifiable items)
- LOW risk (no hot path, no breaking changes, audit-only or mechanical updates)
- Clear source of truth to read (docs/00_sync_state.md + specific briefs)

## What makes a BAD CC task

- Hot-path changes (e.g., R6 rewrite) — those are paired work
- Ambiguous "figure out what's best" directives — CC needs a concrete target
- Multi-stage tasks that require mid-flight PK decisions — split into stages
- Anything requiring external service access PK hasn't pre-configured
