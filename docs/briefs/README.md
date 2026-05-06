# `docs/briefs/` — Brief Runner (markdown-only, v0)

This directory holds the standardised handoff format for chat → executor work cycles. "Executor" is usually PK or Claude Code; occasionally chat itself.

## Why this exists

Chat-to-CC and chat-to-PK handoffs were happening informally — different shape every time, learning lost between cycles. This is the lightweight version: standard templates, no DB, no schema. Promotion to a DB-backed register is gated on (a) 20 cycles accumulated, (b) architecture review Phase 0 shipped (`m.action_event` may cover the audit-trail intent — would build twice if rushed now).

**Naming guardrail** — this is NOT `m.brief`. `m.brief` is the operator-facing daily/weekly surface locked in `docs/dashboard-review-2026-05/11_final_consolidation.md` §11.4. Different concept. Do not conflate.

## Convention

- **Brief file:** `docs/briefs/cc-NNNN-{slug}.md` (zero-padded sequential).
- **Result file:** `docs/briefs/results/cc-NNNN-{slug}.md` (same NNNN, same slug).
- **Templates:**
  - Brief: `docs/briefs/_template_brief.md`
  - Result + verification: `docs/briefs/_template_result.md`
- **Numbering:** strictly sequential. `cc-0001`, `cc-0002`, etc. Do not skip. Do not reuse on cancellation — mark cancelled briefs with `Status: blocked` in-place and explain in §6 of the result file.
- **Slugs:** kebab-case, ≤6 words, descriptive. e.g. `dashboard-phase-0-defaults`.

## Lifecycle

1. Chat drafts the brief, commits to `docs/briefs/`.
2. Executor reads the brief, executes, writes the result file using `_template_result.md` sections 1–7.
3. Chat fills sections 8 + 9 of the result file (verification + learning notes), commits.
4. If a recurring gap is noticed across 3 cycles, promote to a canonical Lesson via the existing Lessons mechanism.

## Re-evaluation gate

After cycle cc-0020, review:

- Did the markdown convention hold up under volume?
- Does grep + git log fall short on retrieval?
- Has architecture review Phase 0 shipped `m.action_event`?

If yes / no / yes — stop. The DB layer is unnecessary. 
If markdown clearly broke down — design a minimal DB layer at that point, sized to actual gaps.

## Constraints (always)

- PK remains approval gate.
- Production mutation requires explicit approval in the brief — never assume.
- No cron triggers, DDL, or DML unless explicitly allowed in the brief's `Allowed actions`.
- Every execution produces a result file. Every result gets verified before the next brief in a chain starts.
- Active hold-states (per `docs/00_sync_state.md`) are appended to every brief's `Forbidden actions` until lifted.
