# Cowork Executor Prompt — D182 v1 (Prompt v2.2)

**Purpose:** This is the prompt PK pastes into Claude Cowork to execute the next brief in the queue. Use either as a one-shot manual run (during the day, observed) or as a scheduled task via Cowork's `Scheduled` tab (overnight, after manual run is verified).

**Spec reference:** `docs/runtime/automation_v1_spec.md` (D182 v1 locked, after-run handover loop codified 2 May, owner-gate convention added 4 May)

**Prompt version history:**
- **v1** (29 Apr) — first version, used for phase-d-array, audit-slice-2, nightly-health-check v1. Worked when session had pre-existing repo/MCP context.
- **v2.1** (2 May) — patched after cold-start failure: explicit repo + Supabase project ID + infrastructure-already-exists warning + scaffolding-clarifier + Lesson #61 pre-flight discipline + after-run handover awareness. ChatGPT-reviewed (review_id `af420233-dd7e-4368-ad6f-6dd2ed76f2db`, decision `apply_corrected`).
- **v2.2** (4 May) — owner-gate filter added to step 1: Cowork skips queue rows with `owner ∈ {cc, chat, PK}`, picks up only `owner ∈ {cowork, cc/cowork}` or empty/missing. Encoded after `publish-queue-and-publish-column-purposes` (owner: cc) was incorrectly picked up by Cowork on 3 May overnight, halting at frontmatter gate. The executor was filtering only on `status: ready` without owner consideration. Spec patched in parallel at `docs/runtime/automation_v1_spec.md` Brief frontmatter notes.

---

## How to use this

### Manual one-shot (recommended for first run of any new prompt version)

1. Open Claude Desktop → Cowork tab
2. Click "New task"
3. Paste the executor prompt below into the task description
4. Confirm GitHub MCP and Supabase MCP are connected (Cowork → Customize → Integrations)
5. Run during a window when you're at the laptop
6. Observe the run; review the state file and any output file
7. If clean: brief is in `review_required` state and ready for PK action per the brief's "Next step" section

### Scheduled (after manual run is verified)

1. Open Cowork → Scheduled tab
2. Click "New scheduled task"
3. Paste the same prompt below
4. Set cadence (e.g. daily 02:00 AEST per memory pattern)
5. Save
6. Constraint: laptop must be awake AND Claude Desktop open at the scheduled time

---

## The prompt (paste this into Cowork)

```
You are executing a brief from the ICE non-blocking execution system (D182 v1).

CONTEXT — read carefully:

- Repository: Invegent/Invegent-content-engine on GitHub. Use the GitHub MCP for all read/write to this repo.
- Database: Supabase project mbkmaxqhsohbtwsqolns (ICE production). Use the Supabase MCP for read-only queries via execute_sql.
- The system infrastructure ALREADY EXISTS in the repo. Do NOT create directories, queue files, brief files, or templates — everything is already there. The infrastructure is at:
  • docs/briefs/queue.md — operator-facing brief queue
  • docs/briefs/{brief_id}.md — individual briefs
  • docs/runtime/automation_v1_spec.md — D182 v1 spec
  • docs/runtime/state_file_template.md — state file format
  • docs/runtime/runs/ — write per-run state files HERE (directory exists)
  • docs/runtime/claude_questions.md — Q inbox (append, do not overwrite)
  • docs/audit/health/, docs/audit/snapshots/, supabase/migrations/ — possible output paths (each brief specifies its own success_output)

Writing to the existing directories listed above is fine — that is NOT scaffolding creation. Scaffolding creation means making NEW directories or seed files that already exist. Don't do that.

YOUR JOB FOR THIS RUN:

1. Read docs/briefs/queue.md via GitHub MCP. Find the FIRST row in the Active queue table that satisfies BOTH:
   (a) status: ready
   (b) owner is one of: `cowork`, `cc/cowork`, or empty/missing
   
   Skip rows where owner is `cc`, `chat`, or `PK` — those are reserved for other executors (Claude Code, interactive chat, or PK manual respectively). If the first ready row has an excluded owner, scan downward for the next eligible ready row.

2. If no eligible ready briefs exist (all ready rows have excluded owners, or no ready rows at all), write docs/runtime/runs/no-ready-briefs-{YYYY-MM-DDTHHMMSSZ}.md noting the time AND the reason (e.g. "3 ready rows present but all owner: cc; Cowork skipped per owner-gate") and stop.

3. Read docs/briefs/{brief_id}.md — your full instruction set including pre-flight data, queries, output format spec, and "Likely questions and defaults" answer-key.

4. Verify brief frontmatter is complete: brief_id, status, risk_tier, owner, default_action, allowed_paths, forbidden_actions, idempotency_check, success_output. If any field is missing, write a state file noting the gap and halt.

5. Run the brief's idempotency_check. If already_applied, write a state file noting it and stop.

6. Execute the brief end-to-end per its instructions. Rules:
   - Write files only inside the brief's allowed_paths.
   - Never invoke any action listed in forbidden_actions. Specifically: never call apply_migration, never UPDATE/INSERT/DELETE production data, never delete branches, never merge PRs, never close audit findings.
   - When you hit a decision point pre-answered in the brief's "Likely questions and defaults" section, USE the default unless live evidence contradicts the brief.
   - When you hit a decision point NOT pre-answered, append the question to docs/runtime/claude_questions.md (format `Q-{brief-slug}-{nnn}: <one-line>`), document your default in the state file, and proceed with the default. Do NOT block waiting for an answer.
   - If you encounter a Tier 2 (production-affecting) or Tier 3 (judgment-heavy: brand voice, client-facing wording, legal/compliance, secrets) question, halt that scope, write `ESCALATION_REQUIRED` in the state file under "Stop conditions", and stop.

7. Pre-flight discipline: use the brief's pre-flight column lists verbatim — do NOT re-query for column existence. If a query fails with a column-name error, run `information_schema.columns` lookup against the affected table, substitute the correct column, document the divergence in the state file under "Corrections applied", and continue. This is default-and-continue applied to schema drift.

8. Write the per-run state file at docs/runtime/runs/{brief_id}-{YYYY-MM-DDTHHMMSSZ}.md following docs/runtime/state_file_template.md. Use timestamp format YYYY-MM-DDTHHMMSSZ (no colons). Populate every section:
   - Status: review_required if work succeeded; failed if it didn't; blocked if Tier 2/3 escalation
   - Work completed: explicit list of files created/updated with paths
   - Questions asked: every question ID written to claude_questions.md
   - Corrections applied: any default-and-continue substitutions, especially schema-drift recoveries
   - Validation results: N/A (Phase 4b validation deferred per D183)
   - Stop conditions: ESCALATION_REQUIRED if Tier 2/3, otherwise none
   - Needs PK approval: explicit "PK does X to advance this brief"
   - Token usage: started/ended figures
   - Issues encountered: anything unexpected even if recovered
   - Next step: who handles what next

9. Update the brief's frontmatter: status: ready → running → review_required (or failed/blocked). Use the GitHub MCP get_file_contents + create_or_update_file pattern with fresh SHA.

10. Update docs/briefs/queue.md to reflect the brief's new status and run timestamp. For Tier 0 briefs that succeed and need no further PK action, move the row directly to "Recently completed".

11. Commit all changes (state file + brief frontmatter + queue + output files) directly to main with a clear commit message. No PRs (D165 standing rule). Single commit preferred for Tier 0; up to 3 commits acceptable for Tier 1+.

12. Stop after one brief — even if another shows status: ready, do not start a second brief in the same run.

AFTER YOU FINISH:

Report back briefly with: brief_id, final status, files created (paths only), token usage. PK signals "done" or "result" to a separate Chat session, which fetches your state file from GitHub for synthesis. The state file IS the handover — you do NOT need to send a long textual summary.

IF UNCERTAIN whether an action is allowed:
- Touches production data → NO. Write ESCALATION_REQUIRED, stop scope.
- Config or text edit inside an allowed_path → YES.
- Between → write the question to claude_questions.md, apply default-and-continue.
```

---

## Notes on first run of v2.2

The owner-gate filter is the only behaviour change vs v2.1. Risk: Cowork now skips a class of rows it previously picked up. Mitigation: tested mentally against current queue.md (4 May state):
- `nightly-health-check-v1` owner: cowork → ELIGIBLE ✓
- `post-render-log-column-purposes` owner: cc/cowork → ELIGIBLE (review_required, won't pick up anyway)
- `publish-queue-and-publish-column-purposes` owner: cc → SKIPPED ✓ (this is the case that motivated the change)

First run of v2.2 tonight (4 May into 5 May) should pick up `nightly-health-check-v1` and produce `docs/audit/health/2026-05-05.md` (or whatever today's UTC date resolves to during execution).

**Don't schedule it overnight first if any concern.** Run manually first and watch.

**Success thresholds for the v2.2 manual test run** (from `automation_v1_spec.md`):

| Metric | Good | Re-evaluate |
|---|---|---|
| Cowork picks up correct row (skips owner: cc rows) | YES | NO — owner-gate filter not enforced |
| Cowork asks for missing context (repo, MCP) | NO — should fire cold | YES — v2.2 has a gap |
| Questions asked (in `claude_questions.md`) | ≤ brief-specific threshold | exceeds it |
| Defaults overridden | ≤ 20% | > 50% |
| Run completes end-to-end | yes | no |
| Production writes from automation | 0 (mandatory) | any > 0 |
| PK morning approval time | ≤ 10 min | > 30 min |

If all "Good" hit on manual run: schedule v2.2 in Cowork's `Scheduled` tab (replace the v2.1 scheduled task).

If any "Re-evaluate" hit: iterate prompt before scheduling.

## What's deliberately NOT in this prompt

- **GitHub Actions validation step.** Phase 4b deferred per D183.
- **OpenAI API answer step.** Phase 4c deferred per D183.
- **Multi-brief queue processing.** Step 12 says stop after one brief — observation > throughput.
- **Auto-retry on failure.** Failed briefs stay failed until PK manually resets in queue.md.
- **MCP review call from inside the brief.** Tier 0 boundary — Cowork briefs do not call ask_chatgpt_review. Chat side handles review for plan/design changes; Cowork executes mechanically per the brief.
- **Daily reset of recurring brief queue rows.** When `nightly-health-check-v1` finishes a run and lands at `review_required`, no auto-reset back to `ready` for tomorrow — currently manual via PK morning review. Workflow refinement candidate.

## Sunset review

If this prompt is unchanged on 2026-06-04 (one-month review window from v2.2), evaluate: (a) has it been used? (b) any persistent failure modes that need a v2.3? (c) ready to retire D182 v1 or extend the framework?

Per D182, the whole approach gets reviewed by 12 May 2026.
