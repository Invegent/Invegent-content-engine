# Cowork Executor Prompt — D182 v1

**Purpose:** This is the prompt PK pastes into Claude Cowork to execute the next brief in the queue. Use either as a one-shot manual run (during the day, observed) or as a scheduled task via Cowork's `/schedule` UI (overnight, after first run is verified).

**Spec reference:** `docs/runtime/automation_v1_spec.md` (D182 v1 locked)

---

## How to use this

### Manual one-shot (recommended for first run)

1. Open Claude Desktop → Cowork tab
2. Click "New task"
3. Paste the executor prompt below into the task description
4. Run it during the day so you can observe and intervene if needed
5. Review the state file and migration file output
6. If clean: apply the migration via Supabase MCP per D170

### Scheduled (after manual run is verified)

1. Open Cowork → Scheduled tab
2. Click "New scheduled task"
3. Paste the same prompt below
4. Set cadence (e.g. weekday-only, 22:00 local)
5. Save
6. Laptop must be awake AND Claude Desktop open at the scheduled time — same constraint as `openclaw tui`

---

## The prompt (paste this into Cowork)

```
You are executing a brief from the ICE non-blocking execution system (D182 v1).

Your job for this run:

1. Read docs/briefs/queue.md from github.com/Invegent/Invegent-content-engine via GitHub MCP.

2. Find the FIRST row in the Active queue table with status: ready.

3. If no ready briefs exist, write a state file at docs/runtime/runs/no-ready-briefs-{YYYY-MM-DDTHHMMSSZ}.md noting that no ready briefs were found, the time you checked, and stop. Do not create a brief-specific state file in this case.

4. Read the matching brief at docs/briefs/{brief_id}.md — this is your full instruction set.

5. Verify the brief's frontmatter is complete: brief_id, status, risk_tier, owner, default_action, allowed_paths, forbidden_actions, idempotency_check, success_output. If any required field is missing, halt and report.

6. Run the brief's idempotency_check. If it indicates the work is already done, write a state file at docs/runtime/runs/{brief_id}-{YYYY-MM-DDTHHMMSSZ}.md noting "already_applied" and stop.

7. Execute the brief end-to-end per its instructions. Follow these rules without exception:

   - You may write files only inside the paths listed in allowed_paths.
   - You must NOT take any action listed in forbidden_actions. Specifically: never call apply_migration, never UPDATE/INSERT/DELETE production data, never delete branches, never merge PRs, never close audit findings.
   - When you hit a decision point not pre-answered in the brief's "Likely questions and defaults" section, write the question to docs/runtime/claude_questions.md using the format in that file, document your default in the state file, and proceed with the default. Do NOT block waiting for an answer.
   - When the brief's "Likely questions and defaults" pre-answers a decision, use the default unless evidence in the run contradicts the brief.
   - For the first test run (Phase D ARRAY mop-up), the brief's pre-flight findings were captured by PK before authoring — do not re-query Supabase for data the brief already provides. If a value seems wrong, write a question and use the brief's data anyway.
   - If you encounter a Tier 2 (production-affecting) or Tier 3 (judgment-heavy: brand voice, client-facing wording, legal/compliance, secrets) question, halt that scope, write ESCALATION_REQUIRED in the state file under "Stop conditions", and stop.

8. Write the per-run state file at docs/runtime/runs/{brief_id}-{YYYY-MM-DDTHHMMSSZ}.md following docs/runtime/state_file_template.md. Use the format YYYY-MM-DDTHHMMSSZ (no colons in the timestamp — colons break some filesystems). Specifically:

   - Status: end at review_required if work succeeded; failed if it didn't; blocked if Tier 2/3 escalation hit.
   - Work completed: explicit list of files created or updated, with paths.
   - Questions asked: every question ID written to claude_questions.md.
   - Validation results: N/A on first run (Phase 4b/c of D182 not yet built).
   - Stop conditions: ESCALATION_REQUIRED if Tier 2/3, otherwise none.
   - Needs PK approval: explicit "PK does X to advance this brief".
   - Token usage: report your started/ended token figures.
   - Issues encountered: anything unexpected even if recovered.
   - Next step: who handles what next.

9. Commit the brief output (migration file, state file, any answer-key follow-ups) directly to main with a clear commit message. Do not open a PR; D165 standing rule is direct-push to main for non-risky single-repo work.

10. Update the brief's frontmatter status as you transition: ready → running → review_required (or failed/blocked). Use the GitHub MCP get_file_contents + create_or_update_file pattern with fresh SHA.

11. Update docs/briefs/queue.md to reflect the new status of the brief and the latest run timestamp (in the same YYYY-MM-DDTHHMMSSZ format).

12. Stop. Do not start a second brief in the same run — even if another shows status: ready, stop after the first to keep observation signal clean.

If at any point you are uncertain about whether an action is allowed:
- If it touches production data, the answer is no. Stop and escalate.
- If it's a configuration or text edit inside an allowed path, the answer is yes.
- If it's between, write the question to claude_questions.md and proceed with the default-and-continue rule.

Report back when done with: brief_id processed, status, files created, token usage. PK reviews in the morning.
```

---

## Notes on first run

**Don't schedule it overnight first.** Run it manually during a window when you're at the laptop. Watch the run unfold. Note where defaults broke down, where questions surfaced, whether the migration file matches your judgment.

**Success thresholds for the first run** (from `automation_v1_spec.md`):

| Metric | Good | Re-evaluate |
|---|---|---|
| Questions asked | ≤ 10 | > 20 |
| Defaults overridden | ≤ 20% | > 50% |
| Cowork run completes | yes | no |
| Production writes | 0 (mandatory) | any > 0 |
| PK morning approval time | ≤ 10 min | > 30 min |

Note: cost-per-run is not a metric here. Cowork on Max 5x is bundled in the subscription, not metered per-run. The real constraint is Max plan usage limits, which are reported by Anthropic separately. If the first run feels heavy on usage, factor that observation into the sunset review.

If 5+ thresholds in "Good" column: scale up. If 2+ in "Re-evaluate": redesign before next run.

## What's deliberately NOT in this prompt

- **GitHub Actions validation step.** Phase 4b of D182 build, deferred to next session. The brief's inline count-delta verification is the primary validation for the first run.
- **OpenAI API answer step.** Phase 4c of D182 build. For the first run, any questions Cowork writes to `claude_questions.md` get answered by PK in the morning, not by an API overnight.
- **Multi-brief queue processing.** Step 12 says stop after one brief. This is intentional — one variable changing per run is enough; observability matters more than throughput right now.
- **Auto-retry on failure.** Failed briefs stay failed until PK manually resets to ready in queue.md. No silent retries.

## Sunset review

If this prompt is still in use unchanged on 12 May 2026, that's a smell. Either the system works and the prompt should evolve, or the system isn't being used and the model needs reconsideration. Per D182, the whole approach gets reviewed by 12 May.
