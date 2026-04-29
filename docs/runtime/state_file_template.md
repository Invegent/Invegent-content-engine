# Run State Template

Use this template for every brief run. Save as `docs/runtime/runs/{brief_id}-{timestamp}.md`.

Timestamp format: `YYYY-MM-DDTHHMMSS` (UTC).

---

```markdown
# Run State: {brief_id}

Status: {ready|running|questions_pending|validation_pending|review_required|done|failed|blocked}
Risk tier: {0|1|2|3}
Started: {ISO 8601 timestamp UTC}
Finished: {ISO 8601 timestamp UTC, or "in progress"}

## Work completed

- {bullet list of actions taken with brief commit refs where applicable}

## Questions asked

- {Q-{brief-slug}-{nnn}: <one-line summary>}

## Answers received

- {A-{brief-slug}-{nnn}: <decision> (matches default | overrides default)}

## Corrections applied

- {what changed, which commit, scenario type per D182 correction handling}

## Validation results

- {GitHub Actions output summary, lint passes/fails, schema checks}

## Stop conditions

- {ESCALATION_REQUIRED if Tier 2/3 hit, otherwise "none"}

## Needs PK approval

- {what awaits PK action: PR merge, migration apply, escalation review}

## Token usage (optional)

- Started: {N tokens}
- Ended: {N tokens}
- Burn: {N tokens}

## Issues encountered

- {anything unexpected, even if recovered}

## Next step

- {explicit handoff: what should happen next, who handles it}
```

---

## Status transition rules

- `ready → running` — Cowork picks up brief
- `running → questions_pending` — Cowork wrote question(s) to inbox
- `questions_pending → running` — answer(s) arrived, Cowork applying correction
- `running → validation_pending` — Cowork output ready, GitHub Actions running
- `validation_pending → review_required` — validation passed, awaiting PK
- `review_required → done` — PK approved and applied
- `* → failed` — anything went wrong
- `* → blocked` — Tier 2/3 escalation; PK must manually reset to `ready`

Failed briefs do NOT auto-retry. PK resets to `ready` if appropriate.
