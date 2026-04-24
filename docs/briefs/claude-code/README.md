# Claude Code task briefs

Briefs in this folder are self-contained tasks for Claude Code to pick up via Telegram (`@InvegentICEbot` / OpenClaw).

## How to use

**PK triggers a task:** send the brief path to `@InvegentICEbot`. Example message:
```
Please complete docs/briefs/claude-code/2026-04-25-cc-task-01-dashboard-roadmap-sync.md
```

**Claude Code executes:** reads the brief, follows the SETUP / OBJECTIVE / METHOD / DELIVERABLES sections, commits direct to main per standing workflow rule.

**Closure loop:** CC must update `docs/00_sync_state.md` under "TODAY'S COMMITS" with a one-line summary + commit SHA. This is how Claude Desktop sees the work on the next session.

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

## Current briefs (as of 24 Apr 2026)

| ID | Title | Priority | Effort | Risk |
|---|---|---|---|---|
| CC-TASK-01 | Dashboard roadmap sync | P1 | 20-30 min | LOW |
| CC-TASK-02 | EF .upsert() audit | P2 | 60-90 min | LOW |
| CC-TASK-03 | Frontend format/platform vocab audit | P3 | 45-60 min | LOW |

All three are LOW risk (no hot path, no DB schema changes). Can be triggered in any order.

## Future CC tasks (ideas for when needed)

- CC-TASK-04 — publisher schedule source audit (L5 follow-up)
- CC-TASK-05 — `facebook-publisher` EF audit
- CC-TASK-06 — exec_sql eradication sweep (30+ remaining sites in dashboard)
- CC-TASK-07 — cron health dashboard tile (requires UI design work — pair task, not CC solo)

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
