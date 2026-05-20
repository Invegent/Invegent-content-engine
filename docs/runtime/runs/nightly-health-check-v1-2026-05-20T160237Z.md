# Run State: nightly-health-check-v1

Status: review_required
Risk tier: 0
Started: 2026-05-20T16:02:37Z
Finished: 2026-05-20T16:08:30Z

## Work completed

- Read `docs/briefs/queue.md` (SHA `e98b4c95`); first eligible Active row was `nightly-health-check-v1` v3.0, `status: ready`, `owner: cowork`. Picked up.
- Read `docs/briefs/nightly-health-check-v1.md` (SHA `1066a112`); frontmatter verified complete (brief_id, status, risk_tier, owner, default_action, allowed_paths, forbidden_actions, idempotency_check, success_output all present).
- Ran idempotency check: `docs/audit/health/2026-05-20.md` not present → `health_file_absent` passes; proceeded.
- Executed all 14 brief queries verbatim against Supabase project `mbkmaxqhsohbtwsqolns` via `execute_sql`. **0 schema-drift fallbacks** (v2.1 + v3.0 brief locks held).
  - Q1 latest pipeline snapshot: 1 row, snapshot_at 2026-05-20 16:00:02Z (~2.6 min old).
  - Q2 6-snapshot trend: identical values across all 6 (3h flat).
  - Q3 cron 24h: 65 jobs total (61 active).
  - Q4 cron active failures: 0 rows.
  - Q5 publish 24h: facebook=2, linkedin=2 (4 total).
  - Q6 queue state: dead=444, queued=121, published=101.
  - Q7 per-client 24h: invegent=1, property-pulse=3.
  - Q8 ai_job 24h: succeeded=16.
  - Q9 slot_fill_attempt 24h: filled=17.
  - Q10 ingest 24h: 88 rows; success 21.6%, paywalled+blocked 67%.
  - Q11 worker HTTP errors 24h: 0 rows.
  - Q12 chatgpt_review 7d: calls=22, total_tokens=84050, completed=3, escalated=9, failed=0.
  - Q-stuck: 7 rows (2 Cat A, 0 Cat B, 5 Cat C).
  - Q-true-stuck: 5 clusters, 24 items total.
- Wrote markdown output to `docs/audit/health/2026-05-20.md` per Section "Output format" spec (11 numbered sections including 6a + 6b + Section 10 priority findings with `finding_id` HTML comments + Section 11 footer).
- Built `findings` JSONB array with 7 entries (5 P1 + 2 P2) per Section 12.2 schema and called `friction.fn_emit_health_check_findings('nightly-health-check-v1/2026-05-20T160237Z', 'docs/audit/health/2026-05-20.md', $jsonb$)`.
- Function returned `{success_count: 5, failure_count: 0, skipped_count: 2}` — 5 P1 findings emitted to `friction.event`; 2 P2 findings routed to `friction.emit_error` with `error_code=CONDITION-KEY-UNRESOLVED` (problem_key pattern matcher does not recognise `zero-counts-pub-published-30m` or `s17-escalation-rate`).
- Updated Section 11 footer "Emission summary" line in `docs/audit/health/2026-05-20.md` to reflect actual counts (`success_count=5 failure_count=0 skipped_count=2`) plus a one-line discrepancy reference pointing here and to Q-005.
- Appended `Q-nightly-health-check-v1-005` to `docs/runtime/claude_questions.md` (function-contract drift: brief's Section 12 contract anticipated `success_count + failure_count` only; function now also returns `skipped_count` and routes pattern-mismatched findings to `friction.emit_error` rather than per-row INSERT failures).
- Updated `docs/briefs/nightly-health-check-v1.md` frontmatter `status: ready → review_required`.
- Updated `docs/briefs/queue.md` Active row for this brief — status `ready → review_required`, refreshed notes to reflect the 2026-05-20 run.
- Committed changes to `main` across 3 commits (state file + markdown first; claude_questions.md second; brief + queue third) per D182 multi-commit allowance.

Files created / updated (paths):

- `docs/audit/health/2026-05-20.md` (created)
- `docs/runtime/runs/nightly-health-check-v1-2026-05-20T160237Z.md` (this file, created)
- `docs/runtime/claude_questions.md` (appended Q-005, no edit to existing entries)
- `docs/briefs/nightly-health-check-v1.md` (frontmatter `status` field only)
- `docs/briefs/queue.md` (Active row updated)

Plus 5 `friction.event` rows emitted via SECURITY DEFINER function (not a file; see `source_event_id LIKE 'nightly-health-check-v1/2026-05-20T160237Z%'`).
Plus 2 `friction.emit_error` rows (per-finding failures captured by function per brief §12.5; see Issues encountered below).

## Questions asked

- Q-nightly-health-check-v1-005: function-contract drift — `friction.fn_emit_health_check_findings` now returns `skipped_count` (undocumented in brief v3.0 Section 12.3) and routes `problem_key` pattern-mismatches to `friction.emit_error` with `error_code=CONDITION-KEY-UNRESOLVED`. Brief expected only `success_count + failure_count`; brief P2 finding_ids (`zero-counts-{metric}`, `s17-escalation-rate`, `stuck-items-dilution`, `failed-images-present`) need either explicit `condition_key` per finding or function-side problem_key patterns to land in `friction.event` rather than `friction.emit_error`.

## Answers received

- None this run. Default-and-continue applied per brief Section "Likely questions and defaults" (no Q in the answer-key matches function-contract drift). Default: record the 2 P2 skips as a brief-author defect, do NOT retry, do NOT edit Section 10, write discrepancy to state file + Section 11 footer + Q-005.

## Corrections applied

- **None** for SQL execution (v2.1 + v3.0 brief locks held — 0 schema-drift fallbacks across all 14 queries).
- **One** for emission accounting: brief Section 12.3 documents the function as returning a "JSONB row with `success_count`, `failure_count`, and `run_id`" — actual return shape on 2026-05-20 was `{success_count, failure_count, skipped_count, run_id}`. Captured all three fields and surfaced `skipped_count=2` in Section 11 footer; recorded as Q-005 for next-day reconciliation. Scenario type per D182: function-contract drift (not Cowork bug; not strictly brief-author bug — function evolved after brief lock).
- **One** for ID-derivation note: Section 11 footer references Q-005 (not pre-templated in v3.0 footer language); inline addition to preserve the audit trail without restructuring the footer.

## Validation results

- N/A (Phase 4b validation deferred per D183).

## Stop conditions

- none

## Needs PK approval

- **PK reviews the 5 P1 friction.event emissions at `/operations` (cc-0014 Stage C friction triage path).** Five true-stuck clusters surfaced; root cause for the two `instagram` clusters likely jobid 53 `instagram-publisher-every-15m` `is_active=false`. The three remaining clusters (youtube × ndis-yarns +3 day-over-day; youtube × property-pulse unchanged; linkedin × property-pulse unchanged) have active+succeeding publisher crons but are not being claimed — needs separate diagnosis (out of scope for this brief).
- **PK resolves Q-005 by writing A-nightly-health-check-v1-005 to `docs/runtime/claude_answers.md`** with one of: (A) patch v3.0 brief Section 12.3 contract + Section 12.2 to set an explicit `condition_key` per P2 finding; (B) add server-side `problem_key` patterns for the P2 finding_id shapes in `friction.fn_emit_health_check_findings`; (C) accept skipped P2 findings as cosmetic and update brief success criteria to count `success + skipped` as the "matches Section 10" threshold; (D) decide P2s should be markdown-only and remove them from the emission JSONB array (re-categorise to P3-equivalent for emission purposes only).
- **PK decides brief lifecycle after Q-005 resolution**: if Option C — return brief to `ready` immediately for next scheduled fire; if Option A/B/D — patch brief to v3.1 and reset to `ready`.

## Token usage (optional)

- Started: ~92,000 tokens (context-window load: queue.md + brief + template + claude_questions.md)
- Ended: ~110,000 tokens (estimate after all queries + write + emission + state file)
- Burn: ~18,000 tokens

## Issues encountered

1. **Function-contract drift (skipped_count + condition_key).** Brief v3.0 Section 12.3 documented function return shape as `{success_count, failure_count, run_id}`. Actual return on 2026-05-20 was `{success_count, failure_count, skipped_count, run_id}` with `skipped_count=2`. Per-finding `friction.emit_error` rows show `error_code=CONDITION-KEY-UNRESOLVED` with message "condition_key not derivable: no explicit field on finding and problem_key {key} does not match known patterns". The 5 P1 findings used `problem_key=true-stuck-{platform}-{client_slug}` which IS a known pattern → success. The 2 P2 findings used `problem_key=zero-counts-pub-published-30m` and `s17-escalation-rate` which are NOT known patterns → routed to `friction.emit_error`. Recovered via default-and-continue: kept Section 10 unchanged, updated Section 11 footer with actual counts, logged Q-005.
2. **Mid-run schema lookup on `friction.emit_error` + `friction.event`.** First SELECTs against these tables guessed column names `finding_id` / `run_id` (taken from brief Section 12.2 JSONB schema); actual columns are `source_event_id` (composite of `run_id + '/' + finding_id`) and `error_code` / `error_message`. Looked up via `information_schema.columns`, substituted, re-ran. **Default-and-continue applied to schema drift in the diagnostic path, not the brief's authoritative query set.** Lesson #61 holds.
3. **Pipeline appears static.** All 6 snapshots in Q2 returned identical values on every monitored metric (queue_total 666, drafts 53/747, images 466, pub_published_30m 0, has_stuck_items true). This is a P3 informational signal — not flagged for emission but PK may want to investigate whether the snapshot producer is correctly observing change or has stalled itself. Not in scope of this brief.

## Next step

- **PK** reviews this state file + the 5 emitted `friction.event` rows at `/operations` (cc-0014 Stage C path). Once Q-005 is answered in `claude_answers.md`, PK applies the chosen patch (A/B/C/D) and resets brief `status` to `ready` for the next scheduled fire. No re-run of this brief instance required; the 2026-05-20 markdown stands as the canonical artefact regardless of Q-005 outcome (per brief §12.4 — Section 10 not edited).
- **Cowork** does NOT re-pick this brief until `status` is reset to `ready` and `docs/audit/health/2026-05-20.md` is either accepted or deleted (idempotency_check would otherwise return `already_applied` for any same-day re-fire).
- **Next scheduled Cowork fire** of `nightly-health-check-v1` is the next daily 02:00 AEST = 16:00 UTC after PK closes Q-005.
