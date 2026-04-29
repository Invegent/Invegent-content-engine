# ICE Automation v1 — Locked Spec

**Status:** LOCKED 28 Apr 2026 evening · patched 29 Apr Wed late evening per ChatGPT review · first run validated 29 Apr Wed evening · build path updated 30 Apr Thu morning per D183 + D184
**Decision:** D182 — Non-blocking execution model (five-rule system)
**Predecessor:** D181 (audit loop architecture)
**Follow-on decisions:** D183 (build-when-evidence-demands), D184 (audit slicing)

---

## Purpose

Convert PK from real-time operator into scheduler + reviewer by enabling overnight progress across Claude Cowork, OpenAI API, and GitHub Actions — without introducing production risk.

**This is NOT a fully autonomous system.** It is an overnight preparation + validation pipeline. PK still approves all production changes.

---

## The five-rule system (D182)

1. **Default-and-continue.** Claude NEVER blocks on questions. Writes question to `claude_questions.md`, proceeds with default immediately, applies correction later if answer differs.
2. **Answer-key pattern.** Every brief includes "Likely questions and defaults" section pre-answering the most predictable decisions. API only handles the genuinely novel cases.
3. **One AI per question.** Decisions go to one AI, not three. Chat catches my blind spots; ChatGPT catches CC's; CC executes. No multi-AI duplication on the same question.
4. **Escalation rules.** API must escalate (not auto-decide) when question involves brand voice, client-facing wording, legal/compliance, applying migrations or destructive SQL, production writes, secrets, high-impact ambiguity, or low-confidence-with-high-impact.
5. **No production writes from automation.** Scheduled tasks may write to explicit allowed_paths only. Tier 1 may write draft code or migration files inside allowed_paths but must never apply them.

---

## v1 Architecture (compressed pipeline, with correction pass)

```
Daytime         PK writes brief with frontmatter, marks status: ready
22:00–01:00     Cowork executes one brief, asks questions, applies
                same-pass corrections from answer-key, leaves any open
                questions in claude_questions.md
01:00–02:00     OpenAI API answers questions written during the run
02:00–02:30     Cowork correction pass — wakes briefly, reads answers,
                applies overrides where API answer != default,
                halts on any escalation
02:30–03:00     GitHub Actions validates the corrected output
Morning         PK reviews report, approves or requests changes
```

Compressed from ChatGPT's original 8-hour spec (three Cowork sessions per night). Cost discipline + lower laptop-awake burden. The correction pass closes the gap between API answers and validation — without it, GH Actions would validate pre-correction artefacts.

If Cowork cannot run a correction pass after 01:00 (e.g. machine sleeping), API answers become advisory for morning review only — Cowork's first-pass output stays as-is and PK applies any corrections in the morning.

**Note (30 Apr per D183):** Phase 4b (GH Actions validation) and Phase 4c (OpenAI answer step + Cowork correction pass) are DEFERRED until briefs demand them. The pipeline above describes the target architecture; the system currently operates with manual one-shot Cowork runs and PK morning review only. First run on 29 Apr proved this is sufficient for mechanical Tier 1 briefs.

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
  - supabase/migrations/**
  - docs/runtime/runs/**
  - docs/runtime/claude_questions.md
  - docs/briefs/queue.md
  - docs/briefs/phase-d-array-mop-up.md
forbidden_actions:
  - apply_migration
  - delete_branch
  - merge_pr
  - update_production_data
  - close_audit_finding
idempotency_check: "migration_file_absent"
success_output:
  - supabase/migrations/{YYYYMMDDHHMMSS}_audit_f002_phase_d_array_columns.sql
  - docs/runtime/runs/phase-d-array-mop-up-{YYYY-MM-DDTHHMMSSZ}.md
---
```

Notes:

- `allowed_paths` must include the brief's own file path and `queue.md` if the executor needs to update either (e.g. brief frontmatter status transitions, queue row updates).
- Filename timestamp format is `YYYY-MM-DDTHHMMSSZ` (no colons — some filesystems reject them). Migration filenames keep the existing `YYYYMMDDHHMMSS` format already in use across the repo.

## Risk tier system (4 tiers)

### Tier 0 — Safe auto-commit

**Allowed:** observation reports, sync summaries, audit run drafts, reconciliation logs, non-decision status files, audit snapshots (per D184). Markdown only.

**Not allowed:** decision logs, roadmap updates, migrations, production data, client-facing wording.

**Default if uncertain:** Tier 1.

### Tier 1 — Draft only (PR or unmerged commit)

Code drafts, migration files (NOT applied), brief result files, column purpose proposals. Output goes through PK morning review before any apply.

May write to draft paths inside `allowed_paths` but MUST NOT call `apply_migration`, MUST NOT execute UPDATE/INSERT/DELETE against production. The migration file sits in the repo as text; PK applies via Supabase MCP per D170.

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
- `questions_pending → running` (API answered, Cowork correction pass applies overrides)
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
| Migration draft | `migration_file_absent` (file matching `idempotency_pattern` doesn't exist) |
| Report | `report_file_absent` (output file doesn't exist in `docs/runtime/runs/`) |
| Audit snapshot | `snapshot_file_absent` (file at `docs/audit/snapshots/{YYYY-MM-DD}.md` doesn't exist) |
| Branch task | `branch_exists` (branch still present in remote) |
| Column documentation | `target_columns_unpopulated` (registry rows still have NULL or PENDING_DOCUMENTATION) |

---

## State file format

Each run writes one state file: `docs/runtime/runs/{brief_id}-{YYYY-MM-DDTHHMMSSZ}.md`

If no ready briefs exist when an executor runs, file goes at `docs/runtime/runs/no-ready-briefs-{YYYY-MM-DDTHHMMSSZ}.md` instead — not under any brief_id.

Timestamp format: `YYYY-MM-DDTHHMMSSZ` (UTC, no colons). Example: `2026-04-29T094430Z`. Avoid colons because some filesystems and CLI tools reject them.

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

## API escalation (in brief execution)

API may answer questions about Tier 1 draft-only work inside `allowed_paths` provided no `apply_migration` and no production write occurs. Specifically:

**API may answer:**
- Wording choice for column purposes, comments, doc text
- Pattern selection between two file-only options
- Choice of variable names, function signatures (in draft files)
- Schema interpretation that informs draft SQL but doesn't apply it
- Tier 1 draft migration-file content questions

**API must escalate (`Correction needed: stop and ask PK`) when the question involves:**
- Applying migrations or destructive SQL
- Production writes (any UPDATE/INSERT/DELETE against live data)
- Irreversible schema semantics (DROP, ALTER COLUMN with data loss, type narrowing)
- Unclear data-loss or backfill implications
- Brand voice or public wording (Tier 3)
- Client-facing content (Tier 3)
- Legal/compliance implications (Tier 3)
- Secrets/tokens (Tier 3)
- High-impact ambiguity (multiple valid options + irreversible consequences)
- Low confidence with high impact

The distinction: drafting a migration file = OK. Applying it = escalate.

---

## Default-and-continue correction handling

When API answer arrives AFTER Cowork has proceeded:

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

## Success thresholds (first test = Phase D ARRAY mop-up)

| Metric | Good | Re-evaluate |
|---|---|---|
| Questions asked | ≤ 10 | > 20 |
| Defaults overridden | ≤ 20% | > 50% |
| Cowork run completes | yes | no |
| GitHub Actions validation passes | yes (when Phase 4b lands) | no |
| Production writes | 0 (mandatory) | any > 0 |
| PK morning approval time | ≤ 10 min | > 30 min |

If 5+ thresholds in "Good" column: scale up (add more briefs).
If 2+ thresholds in "Re-evaluate" column: redesign before next run.

**Note on cost:** dollar cost per run is NOT in the success thresholds. Cowork on Max 5x is bundled in PK's subscription, not metered per-run. The real constraint is Max plan usage limits. If the first run feels heavy on usage, that observation feeds into the sunset review.

---

## First-run learnings (29 Apr Wed evening)

First test: Phase D ARRAY mop-up brief, Tier 1, mechanical, 7 columns to document.

**Hit 5/5 thresholds:**

| Metric | Threshold | Actual |
|---|---|---|
| Questions asked | ≤ 10 | **0** |
| Defaults overridden | ≤ 20% | **0%** |
| Cowork run completes | yes | **yes** |
| Production writes from automation | 0 (mandatory) | **0** |
| PK approval time | ≤ 10 min | **yes** (~5 min) |

**Key observations to inform future briefs (per D183):**

1. **Pre-loaded pre-flight data eliminates ~5 SQL re-query loops.** PK ran row counts + sample values + registry baseline + table_id JOIN pattern before authoring; brief embedded findings as authoritative. Cowork did not re-query Supabase. Worth keeping as a discipline.
2. **Answer-key pattern works completely when scope is tight.** All 5 anticipated decision points pre-answered with defaults. 0 questions written to `claude_questions.md`. Future briefs should aim for similar pre-flight depth before run.
3. **3-commit run pattern emerged organically.** ready→running, work, running→review_required+queue update. Clean transitions, easy audit trail. Future executor-prompt revision can codify this.
4. **Runtime ~5 min vs estimated 20 min.** First brief was tighter than predicted. May need to set tighter estimates for similar mop-up briefs.
5. **Token burn ~45k.** Modest on Max 5x bundled. No per-run dollar cost concern.
6. **Two minor wording observations during PK review accepted as-is** — (a) `f.video_analysis.key_hooks` claimed producer "video-analysis worker extracted..." — real per A13 closure but goes slightly beyond pre-flight evidence; (b) `c.client_brand_asset.platform_scope` had shape speculation hedged with "no observed sample available to confirm" — useful future-reader hint. Neither was safety-impacting.

**Constraints accepted (carried forward):**

1. **Cowork desktop-must-be-awake.** Same constraint as `openclaw tui`. PK accepts: skip nights laptop is off. v2 considers always-on workstation.
2. **Usage limits, not dollar costs.** Cowork on Max 5x bundled in subscription. Real constraint is Max plan usage, not API spend.
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
| 1 | Q&A files + brief template additions | 15 min | DONE 28 Apr |
| 2 | D182 in decisions log + standing memory | 15 min | DONE 28 Apr |
| 3 | First Cowork-executable brief (Phase D ARRAY) | 30 min | DONE 29 Apr |
| 4a | Cowork executor prompt | 15 min | DONE 29 Apr |
| 4b | GitHub Actions validation workflow | 1 hour | **DEFERRED per D183** — first run inline DO block sufficient. Build when a brief demands cloud-side validation. |
| 4c | OpenAI API answer step + Cowork correction pass wiring | 1 hour | **DEFERRED per D183** — first run produced 0 questions. Build when a brief actually generates real questions PK cannot trivially answer. |
| 5 | First overnight test (or first manual test) | overnight or 1 hour | **DONE 29 Apr** — 5/5 thresholds. Phase D ARRAY mop-up applied via Supabase MCP per D170. |
| 6 | Audit loop automation — Slice 2 (snapshot generation) | 30 min | **NEXT as Tier 0 D182 brief per D184**. Reads `k.*` registry + targeted `f.*`/`m.*` extracts, writes `docs/audit/snapshots/{YYYY-MM-DD}.md`. |
| 7 | Audit loop automation — Slice 3 (auditor pass) | TBD | **DEFERRED per D184 + D181** — wait for 5+ manual cycles before automating auditor judgment. |

---

## Related infrastructure

- `docs/runtime/claude_questions.md` — Q inbox
- `docs/runtime/claude_answers.md` — A outbox
- `docs/runtime/state_file_template.md` — state file template
- `docs/runtime/cowork_prompt.md` — paste-ready Cowork executor prompt
- `docs/runtime/runs/` — per-run state files
- `docs/briefs/queue.md` — operator-facing queue
- `docs/briefs/` — brief queue
- `docs/briefs/phase-d-array-mop-up.md` — first brief (status: done)
- `docs/briefs/audit-snapshot-cycle-2.md` — next brief (to be authored, per D184)
- `.github/workflows/` — GitHub Actions validation (deferred per D183)

---

## Final principle

Default first, ask rarely, correct safely. Run it, observe failures, refine. **Don't pre-build infrastructure for problems you haven't seen yet** (D183).
