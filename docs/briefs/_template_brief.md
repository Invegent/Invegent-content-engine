# Brief cc-NNNN — {short slug}

**Created:** YYYY-MM-DD Sydney  
**Author:** chat  
**Executor:** {PK | Claude Code | chat}  
**Status:** draft | issued | in-progress | complete | blocked  
**Result file:** `docs/briefs/results/cc-NNNN-{slug}.md` (created on completion)

---

## Task

{One paragraph: what needs to be done. Plain language. No restating context the executor already has.}

## Source context

- `path/to/relevant/doc.md` — {why this is relevant}
- `path/to/another.md` — {why this is relevant}
- {commit hash, table name, EF name — anything the executor needs to find the right thing}

## Scope

**In scope:** {what is included.} 
**Out of scope:** {what is explicitly excluded.}

## Allowed actions

- {Specific list of what the executor may do.}

## Forbidden actions

- {Specific list of what the executor must NOT do. Always include active hold-state items from `docs/00_sync_state.md`.}

## Success criteria

- {Concrete, verifiable check.}
- {Concrete, verifiable check.}

## Stop condition

{What the executor does when criteria are met. Usually: "Report result per result template, then stop."}

---

## Notes (optional)

{Anything else the executor should know. Empty if nothing.}
