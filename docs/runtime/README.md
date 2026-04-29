# Runtime Directory

This directory holds the live execution surface of the ICE non-blocking automation system (D182).

## What lives here

| File | Purpose | Writer |
|---|---|---|
| `automation_v1_spec.md` | Locked v1 spec for overnight execution | PK + Claude (review only) |
| `claude_questions.md` | Async question inbox | Cowork (append-only) |
| `claude_answers.md` | Async answer outbox | OpenAI API or PK (append-only) |
| `state_file_template.md` | Template for per-run state files | reference only |
| `runs/` | Per-run state files (`{brief_id}-{timestamp}.md`) | Cowork (one per run) |

## How to read this directory

If you're picking up an in-flight brief, read in this order:

1. `automation_v1_spec.md` — what the system is supposed to do
2. `runs/{latest brief_id}.md` — what state the most recent run ended in
3. `claude_questions.md` and `claude_answers.md` — outstanding decisions
4. `docs/briefs/{brief_id}.md` — the brief that's executing

## Append-only discipline

Questions and answers are append-only. Never edit existing entries. If a correction is needed, write a new question/answer block referencing the original ID.

## Related decisions

- **D182** — Non-blocking execution model (five-rule system)
- **D181** — Audit loop architecture (predecessor in the "reduce PK as bottleneck" line)
- **D170** — MCP-applied migrations (the pattern this system extends)
