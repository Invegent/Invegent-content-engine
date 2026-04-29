# ICE Automation v1 — Locked Spec

**Status:** LOCKED 28 Apr 2026 evening
**Decision:** D182 — Non-blocking execution model (five-rule system)
**Predecessor:** D181 (audit loop architecture)

---

## Purpose

Convert PK from real-time operator into scheduler + reviewer by enabling overnight progress across Claude Cowork, OpenAI API, and GitHub Actions — without introducing production risk.

**This is NOT a fully autonomous system.** It is an overnight preparation + validation pipeline. PK still approves all production changes.

---

## The five-rule system (D182)

1. **Default-and-continue.** Claude NEVER blocks on questions. Writes question to `claude_questions.md`, proceeds with default immediately, applies correction later if answer differs.
2. **Answer-key pattern.** Every brief includes "Likely questions and defaults" section pre-answering the most predictable decisions. API only handles the genuinely novel cases.
3. **One AI per question.** Decisions go to one AI, not three. Chat catches my blind spots; ChatGPT catches CC's; CC executes. No multi-AI duplication on the same question.
4. **Escalation rules.** API must escalate (not auto-decide) when question involves brand voice, client-facing wording, legal/compliance, production data, secrets, high-impact ambiguity, or low-confidence-with-high-impact.
5. **No production writes from automation.** Scripts and scheduled tasks may read files and write markdown. They must NOT apply migrations, update Supabase, change production data, delete branches, close findings, merge PRs.

---

## v1 Architecture (compressed pipeline)

```
Daytime  — PK writes brief with frontmatter, marks status: ready
10pm-1am — Cowork executes one brief, asks questions, applies corrections
1am-2am  — OpenAI API answers questions (cloud-side, laptop-independent)
2am-3am  — GitHub Actions validates outputs (cloud-side, laptop-independent)
Morning  — PK reviews report, approves or requests changes
```

**Compressed from ChatGPT's original 8-hour spec.** Three Cowork sessions per night becomes one. Cost discipline + lower laptop-awake burden.

---

## Brief frontmatter (mandatory)

Every brief MUST include this YAML frontmatter at the top:

```yaml
---
brief_id: phase-d-array-mop-up
status: ready
risk_tier: 1
owner: cowork
created_by: PK
default_action: draft_only
allowed_paths:
  - docs/**
  - supabase/migrations/**
forbidden_actions:
  - apply_migration
  - delete_branch
  - merge_pr
  - update_production_data
idempotency_check: "migration_file_absent"
success_output:
  - docs/runtime/runs/phase-d-array-mop-up.md
  - draft migration file
---
```

## Risk tier system (4 tiers)

### Tier 0 — Safe auto-commit

**Allowed:** observation reports, sync summaries, audit run drafts, reconciliation logs, non-decision status files.

**Not allowed:** decision logs, roadmap updates, migrations, production data, client-facing wording.

**Default if uncertain:** Tier 1.

### Tier 1 — Draft only (PR or unmerged commit)

Code drafts, migration files (NOT applied), brief result files, column purpose proposals. Output goes through PK morning review before any apply.

### Tier 2 — STOP for PK

Production-affecting work. Cowork writes `ESCALATION_REQUIRED` in state file and halts that scope.

### Tier 3 — Escalate immediately

Judgment-heavy work: brand voice, client-facing wording, legal/compliance, secrets/tokens. Same halt behaviour as Tier 2 but flagged as "judgment escalation" in morning report.

---

## Status flow

```
ready
  ↓
running
  ↓
questions_pending  ←→  validation_pending
  ↓
review_required
  ↓
done | failed | blocked
```

Valid transitions:
- `ready → running` (Cowork picks up brief)
- `running → questions_pending` (Cowork asks API)
- `questions_pending → running` (API answered, Cowork applies correction)
- `running → validation_pending` (Cowork output ready for GitHub Actions)
- `validation_pending → review_required` (validation passed, awaiting PK approval)
- `review_required → done` (PK approved + applied)
- `* → failed` (Cowork crashed, validation failed, escalation halted)
- `* → blocked` (Tier 2/3 escalation; PK must reset to ready)

**Failed brief stays failed** until PK manually resets to `ready`. No automatic retries.

---

## Idempotency rule

Every brief checks before working: "Has this been done?" If yes, write `already_applied` to state file and stop.

Examples:

| Brief type | Idempotency check |
|---|---|
| Migration draft | `migration_file_absent` (file doesn't exist in `supabase/migrations/`) |
| Report | `report_file_absent` (output file doesn't exist in `docs/runtime/runs/`) |
| Branch task | `branch_exists` (branch still present in remote) |
| Column documentation | `target_columns_unpopulated` (registry rows still have NULL or PENDING_DOCUMENTATION) |

---

## State file format

Each run writes one state file: `docs/runtime/runs/{brief_id}-{timestamp}.md`

Timestamp format: ISO date `YYYY-MM-DDTHHMMSS` (UTC).

Template at `docs/runtime/state_file_template.md`.

---

## Escalation rule (Tier 2 / Tier 3)

When Cowork hits a Tier 2 or Tier 3 question:

1. Stop work on that brief immediately
2. Write `ESCALATION_REQUIRED` in state file under "Stop conditions"
3. Do not continue any work in that scope
4. Morning report puts it at the top under "Needs PK approval"
5. No SMS, no Slack — state file flag + report only

---

## Default-and-continue correction handling

When API answer arrives AFTER Claude has proceeded:

| Scenario | Behaviour |
|---|---|
| Before commit | Revise inline, no extra commit |
| After commit but before apply | Amend in single follow-up commit |
| After apply (live change) | Do NOT auto-revert. Log divergence in state file. Flag for PK decision. |
| Multiple corrections | Apply in dependency order, group into minimal commits |
| Stop condition triggered mid-flight | Pause only affected scope, document state, escalate to PK |

---

## Question filtering (in brief authoring)

Claude should NOT ask:
- Questions answerable via one SQL query (run the query)
- Questions answerable by reading a file (read it)
- Questions where default is clearly safe (just commit)
- Hedging questions ("is this OK?")

Claude SHOULD ask:
- Multiple valid options exist with different downstream implications
- High-impact ambiguity (wording materially affects meaning)
- Conflicting evidence in observed data
- Genuine novelty not addressed in answer-key

---

## API escalation (in brief execution)

API must respond with `Correction needed: stop and ask PK` when question involves:

- Brand voice or public wording
- Client-facing content
- Legal/compliance implications
- Migrations or production writes
- Secrets/tokens
- High-impact ambiguity (multiple valid options + irreversible consequences)
- Low confidence with high impact

---

## Success thresholds (first test = Phase D ARRAY mop-up)

| Metric | Good | Re-evaluate |
|---|---|---|
| Questions asked | ≤ 10 | > 20 |
| Defaults overridden | ≤ 20% | > 50% |
| Cowork run completes | yes | no |
| GitHub Actions validation passes | yes | no |
| Production writes | 0 (mandatory) | any > 0 |
| PK morning approval time | ≤ 10 min | > 30 min |

If 5+ thresholds in "Good" column: scale up (add more briefs).
If 2+ thresholds in "Re-evaluate" column: redesign before next run.

---

## Constraints accepted

1. **Cowork desktop-must-be-awake.** Same constraint as `openclaw tui`. PK accepts: skip nights laptop is off. v2 considers always-on workstation.
2. **Usage limits, not dollar costs.** Cowork on Max 5x bundled in subscription. Real constraint is Max plan usage, not API spend. Daily Cowork run = within budget. Hourly = potentially hits usage limits.
3. **No human-in-the-loop for scheduled tasks.** Mitigated by Tier 2/3 escalation, scoped permissions, idempotency checks.

---

## What this system achieves

- Removes PK from real-time loop
- Enables overnight progress on defined briefs
- Produces "ready-to-approve" work, not auto-applied changes
- Maintains safety boundaries via tier system + escalation
- Scales to multiple briefs per night once stable

## What this system does NOT do

- Fully autonomous production execution
- Replace PK judgment
- Guarantee zero errors
- Eliminate need for review
- Solve laptop-awake constraint
- Make PK redundant

---

## Build path

| Phase | Work | Effort | Status |
|---|---|---|---|
| 1 | Q&A files + brief template additions | 15 min | THIS COMMIT |
| 2 | D182 in decisions log + standing memory | 15 min | THIS COMMIT |
| 3 | First Cowork-executable brief (Phase D ARRAY) | 30 min | Next session |
| 4 | Cowork scheduled task + GitHub Actions validation | 1-2 hours | Next session |
| 5 | First overnight test | overnight | After Phase 4 |
| 6 | Audit loop automation (Data Auditor) | deferred | After 5+ successful runs |

---

## Related infrastructure

- `docs/runtime/claude_questions.md` — Q inbox
- `docs/runtime/claude_answers.md` — A outbox
- `docs/runtime/state_file_template.md` — state file template
- `docs/runtime/runs/` — per-run state files
- `docs/briefs/` — brief queue (when Phase 3 lands)
- `.github/workflows/` — GitHub Actions validation (when Phase 4 lands)

---

## Final principle

Default first, ask rarely, correct safely. Run it, observe failures, refine.
