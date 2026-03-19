# ICE Build Skills

These are thinking prompts, not rules. Claude reads the relevant skill file before starting a build. The goal is to catch the class of errors ICE has actually experienced — not to slow things down or constrain good judgment.

When a skill applies, read it. Then decide what matters for this specific build. Skip what doesn't apply. Add to it when you discover a new failure pattern.

## When to use each skill

| Building... | Read... |
|---|---|
| Any Edge Function | `edge-function.md` |
| Any SQL migration or DB function | `sql-migration.md` |
| Any Next.js page or component | `dashboard-page.md` |
| Any change to the publish pipeline | `pipeline-verification.md` |
| A complex multi-part feature | `../build-specs/TEMPLATE.md` |

## Philosophy

These skills exist because ICE has a specific set of failure patterns:
- Silent failures that appear to succeed (font upload, schema mismatches)
- Downstream effects not visible until hours later (image-worker, publisher hold gate)
- State assumptions that drift (max_per_day left at 100, queue sort direction)
- Type mismatches that only surface at runtime (COALESCE uuid/text)

The skills are written around those patterns specifically. They are not generic software engineering advice.

Claude has full freedom to think independently, propose different approaches, and deviate from any skill when there's good reason. The only ask is: read the relevant skill before starting, think about whether each point applies, proceed with judgment.
