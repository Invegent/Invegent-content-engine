# Claude Questions — Async Inbox

**Purpose:** Async question channel for the non-blocking execution model (D182).

**Writer:** Claude Cowork (or chat session) when executing a brief and hitting a decision point.

**Reader:** OpenAI API (overnight, when Phase 4c lands) or PK (morning).

**Discipline:** Append-only. Never edit existing entries. Never delete entries. Never move entries between sections. To resolve a question, append a resolution block under "Closed (resolution refs)" referencing the original Q-ID.

---

## Question format

```
## Q-{brief-slug}-{nnn}

Context:
<minimal context — what brief, what step, what observed>

Question:
<exact decision needed>

Options:
A. <option a>
B. <option b>
C. <option c>

Default:
<the option Claude proceeds with immediately if no answer arrives>

Impact if wrong:
<what would need to be revised>
```

---

## Open questions

## Q-audit-slice-2-snapshot-generation-001

Context:
Executing `audit-slice-2-snapshot-generation` brief on 2026-04-30 (Cowork run, Tier 0). Six brief-verbatim SQL queries hit schema drift since the brief was authored on the same day:

- Section 1 / `f.feed_source.active=true` → `active` column does not exist. Substituted `status='active'` (returned 48 rows).
- Section 3.1 / `k.table_registry.object_kind` → renamed to `table_kind`. Substituted; result was zero rows regardless (no missing-purpose tables).
- Sections 7, 11, 16 / `c.client.name` → renamed to `client_name`. Substituted everywhere.
- Section 9 / `t.content_vertical.slug` → renamed to `vertical_slug`. Substituted.
- Section 9 / `m.signal_pool.use_count` → renamed to `reuse_count`. Substituted.
- Section 15 / `pg_get_indexdef(indexrelid)` against `pg_indexes` — `indexrelid` not exposed by that view. Joined `pg_class` and passed `oid` instead. Output unchanged.

Sections 11 (brief's documented fallback) and 16 (brief's pre-answered `cpp.enabled` default) are explicitly handled by the brief.

Question:
Are the six column-rename / view-shape substitutions above correct, and should the brief itself be refreshed with the new column names so future daily runs don't need this fallback handling?

Options:
A. Defaults are correct — accept this snapshot as-is and refresh the brief's verbatim queries for tomorrow's run.
B. Defaults are correct — accept this snapshot as-is and leave the brief unchanged (defaults will continue to apply).
C. One or more substitutions are wrong — I'll re-run with the corrected mapping you provide.

Default:
Proceeded with the substitutions listed above. Run is complete; snapshot written; not blocked.

Impact if wrong:
Re-run snapshot generation with corrected column names. The wrong substitution would only affect the four sections whose JSON consumed the renamed column (1, 3.1, 7, 9, 11, 16) — Sections 2, 4, 5, 6, 8, 10, 12, 13, 14, 15, 17 are independent of these renames.

---

## Q-nightly-health-check-v1-001

Context:
Executing `nightly-health-check-v1` brief on 2026-05-02 (Cowork run, Tier 0). Four brief-author schema bugs hit in Q7 and Q9:

- Q7 / `m.post_publish.draft_id` and `m.post_draft.draft_id` → actual column on both tables is `post_draft_id`. Substituted.
- Q7 / `c.client.slug` → actual column is `client_slug`. Substituted.
- Q7 / `pp.status = 'success'` → actual `m.post_publish.status` enum is `{published, failed}`. Substituted `'published'`. Result: 6 rows, all routed to `property-pulse`. Matches `pipeline_health_log.pp_published_today = 6`.
- Q9 / `m.slot_fill_attempt.outcome` → actual column is `decision`. Time filter switched from `created_at` to `attempted_at`. Substituted; query returned 0 rows (consistent with brief pre-flight noting `slot_fill_attempt at zero`).

All substitutions verified against `information_schema.columns` before proceeding. All other queries (Q1–Q6, Q8, Q10–Q12) ran verbatim.

Separately: `m.cron_health_snapshot` returns dual rows per jobid per `computed_at` (one for `window_hours=1`, one for `window_hours=24`). Brief Q3/Q4 did not filter on this dimension. Section 4 summary defaulted to the 24h window. Q4 returned zero rows in either window so output is unaffected.

Question:
Are the four substitutions above correct, and should the brief itself be refreshed with the verified column names + status enum + window_hours filter so future daily runs don't need fallback handling?

Options:
A. Substitutions are correct — accept this run as-is and refresh the brief queries (Q7, Q9, and add `AND window_hours = 24` to Q3/Q4) for tomorrow's run.
B. Substitutions are correct — accept this run as-is and leave the brief unchanged (defaults will continue to apply).
C. One or more substitutions are wrong — re-run with the corrected mapping you provide.

Default:
Proceeded with the substitutions listed above. Run is complete; health file written; not blocked.

Impact if wrong:
Re-run Q7 / Q9 with corrected mapping; only Sections 5 and 7 of `docs/audit/health/2026-05-02.md` would be affected.

---

## Q-nightly-health-check-v1-002

Context:
Executing `nightly-health-check-v1` brief v2 on 2026-05-02T07:48:28Z (Cowork run, Tier 0, re-fire after PK pre-deleted `docs/audit/health/2026-05-02.md` for idempotency reset). v2 schema fixes for Q7 / Q9 / Q3 / Q4 all worked verbatim (the v2 patch closed Q-001 mechanically). The only fallback hit on this v2 run was a single SQL-syntax issue in **Q-true-stuck**:

```sql
array_agg(pd.post_draft_id ORDER BY ppq.scheduled_for LIMIT 5) AS sample_draft_ids
```

`LIMIT` is not valid syntax inside a `array_agg(...)` aggregate call in PostgreSQL — `ORDER BY` is supported per the SQL standard, but `LIMIT` is an SELECT-clause modifier and Postgres rejects it inside aggregate function calls. The literal brief query would have errored.

Substituted with a correlated subquery that picks the 5 earliest-stuck draft IDs per `(platform, client_slug)` cluster (same semantic). Result: 1 cluster — linkedin × property-pulse, 5 items, sample_draft_ids returned correctly. All other v2 queries (Q1–Q12, Q-stuck) ran verbatim. **No schema drift this run** — only the SQL syntax issue.

Question:
Is the correlated-subquery rewrite correct (same intent: top-5-earliest sample IDs per cluster), and should the brief Q-true-stuck be patched (v3, or inline-edit) so tomorrow's run is verbatim-clean?

Options:
A. Rewrite is correct — accept this run as-is and refresh the Q-true-stuck SQL in the brief to use the correlated-subquery shape (or a Postgres-valid alternative like `(array_agg(pd.post_draft_id ORDER BY ppq.scheduled_for))[1:5]`).
B. Rewrite is correct — accept this run as-is and leave the brief unchanged.
C. Rewrite is wrong — re-run with corrected SQL.

Default:
Proceeded with the correlated-subquery rewrite. Output `docs/audit/health/2026-05-02.md` written; run not blocked.

Impact if wrong:
Re-run Q-true-stuck with corrected SQL; only Section 6b of `docs/audit/health/2026-05-02.md` would change. The Cat-C count (5) and the fact-of-the-cluster (linkedin × property-pulse) come from `count(*)` and `min/max(scheduled_for)` which are correct regardless — only the `sample_draft_ids` array would differ if the rewrite was wrong.

---

## Q-post-render-log-column-purposes-001

Context:
Executing `post-render-log-column-purposes` brief on 2026-05-02T10:20:54Z (Cowork run, Tier 1, drafting only — chat applies). Brief expected 0-2 LOW-confidence rows on a 16-column surface. Two distinct decisions arose:

1. **render_spec (jsonb) confidence judgement.** Brief's strict JSONB rule says HIGH ONLY if the schema is constructed/parsed by an EF source line, a SQL function/trigger body, or a markdown doc. Live producer-code reading shows `supabase/functions/image-worker/index.ts` v3.9.2 always passes `p_render_spec: null` on every render call (success and failure paths). The `public.write_render_log` RPC is a straight-through INSERT with no schema enforcement. Production sample is 0 of 932 rows populated. `supabase/functions/video-worker/` does not exist (only `heygen-worker/`, which does not write to this table). Brief's separate paragraph on render_spec suggested HIGH was achievable by citing the build*Script() functions + Creatomate API contract — but those construct the **Creatomate payload's** keys, not **render_spec's** keys (which are never written today). Defaulted to **LOW**, with a followup file at `docs/audit/decisions/post_render_log_low_confidence_followup.md` listing three resolution paths (image-worker patch, drop column, write markdown spec).

2. **status enum reconciliation.** Brief carried "pending | rendering | succeeded | failed" verbatim from the table_purpose. Live image-worker code writes `{succeeded, failed, timeout}`; the column default `submitted` is never written. Production sample is 896 succeeded + 36 failed across 932 rows (no in-flight states observed). The column purpose I drafted documents the **observed/code-cited** values rather than the table_purpose verbatim list, and notes the unwritten default. Same pattern of brief-author bug as the v1 nightly-health-check-v1 Q7 status-enum mismatch on `m.post_publish` — the table_purpose appears to have been authored from intent, not from current code.

Question:
Are both defaults correct — render_spec deferred LOW, and the status column purpose documenting actual write set `succeeded|failed|timeout` (not the brief's verbatim `pending|rendering|succeeded|failed`)? And should the brief / table_purpose be patched so future audits don't repeat the divergence?

Options:
A. Both defaults correct — accept the migration draft as-is and refresh the brief / `k.table_registry.purpose` for `m.post_render_log` so the status enum reads `succeeded|failed|timeout` and the render_spec paragraph acknowledges current null-population.
B. Both defaults correct — accept the migration draft as-is and leave the brief / table_purpose unchanged.
C. One or both defaults wrong — re-run with corrected guidance.

Default:
Proceeded with both defaults above. Migration `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql` drafted, committed, awaiting chat to apply via Supabase MCP per D170. LOW followup file written. Run not blocked.

Impact if wrong:
Re-draft the affected column purposes (status row at column_id 824265, and/or render_spec at column_id 824258) before chat applies the migration. Other 14 columns are independent of this judgement.

---

## Q-nightly-health-check-v1-003

Context:
Executing `nightly-health-check-v1` brief v2.1 on 2026-05-04T16:08:46Z (Cowork run, Tier 0, second scheduled fire of the day). PK pre-reset the queue at 11:30 UTC and explicitly scheduled "Next nightly fire ~02:00 AEST 5 May = 16:00 UTC 4 May". Brief's output-format spec says verbatim: **"Use today's UTC date for the filename."** The idempotency_pattern is `docs/audit/health/{YYYY-MM-DD}.md` and idempotency_check is `health_file_absent`. Live evidence at run-time:

- Bash UTC clock: `2026-05-04T16:08:46Z` → today's UTC date is `2026-05-04`.
- Cowork env date (Sydney/AEST): `2026-05-05`.
- File `docs/audit/health/2026-05-04.md` already exists from this morning's run at 2026-05-04T10:51:09Z (Sydney 20:51 4 May).
- The schedule was set explicitly to fire at 02:00 AEST 5 May — i.e. PK *intended* a fresh "5 May" health snapshot at this fire. Strict UTC reading would have made this scheduled run an immediate no-op (already_applied), which contradicts the schedule's clear intent.

Two competing interpretations:
- **Strict UTC reading** (per brief verbatim): file should be `2026-05-04.md`; file exists; idempotency hit; write `already_applied` and stop.
- **Operational/Sydney reading** (per env date + schedule intent): file should be `2026-05-05.md`; file does not exist; proceed with full run.

Cowork chose the operational reading and produced `docs/audit/health/2026-05-05.md` so the schedule produced fresh data. Brief's `idempotency_check: health_file_absent` test passed against the `2026-05-05.md` filename. Run output produced 6 true-stuck items (4 clusters), including a NEW cluster (linkedin × ndis-yarns) that wouldn't have been surfaced under strict UTC interpretation.

Question:
Was the operational/Sydney filename interpretation correct, and how should the brief idempotency language be patched so future scheduled runs near the AEST→UTC date boundary are unambiguous?

Options:
A. Operational reading was correct — accept this run as-is and patch the brief to clarify the date convention (e.g. "Use today's AEST date for the filename" OR "Use the date from the run timestamp + 10h offset" OR "Use the env-provided today's date"). Pick one canonical phrasing and re-author Section "Output format" + Section "Idempotency".
B. Operational reading was correct — accept this run as-is, leave the brief unchanged (Cowork will continue applying the same operational default near the AEST→UTC boundary).
C. Strict UTC reading was correct — `docs/audit/health/2026-05-05.md` was written prematurely; PK should delete the file and the run state file, and the schedule should be re-tuned to fire after 00:00 UTC rolls over (10:00 AEST) so UTC-date and AEST-date agree.
D. Both readings should be supported — patch the brief idempotency to check for either filename (today's UTC OR today's env-date) and prefer not-yet-existing filename; explicitly handle the boundary case.

Default:
Proceeded with operational reading. Output `docs/audit/health/2026-05-05.md` written; run not blocked. Documented divergence in run state file under "Corrections applied" + this Q-003.

Impact if wrong:
Under Option C: delete `docs/audit/health/2026-05-05.md` and the run state file at `docs/runtime/runs/nightly-health-check-v1-2026-05-04T160846Z.md`; re-tune the schedule. Under Option A or D: keep this run's output, refresh brief language. Under Option B: no immediate action — but the same boundary case will recur on every scheduled run that fires between 14:00 UTC (00:00 AEST next day) and 24:00 UTC. Roughly 10 hours of every 24h falls in this window; the schedule fires at 16:00 UTC = 02:00 AEST, so this divergence will repeat daily until resolved.

---

## Q-nightly-health-check-v1-004

Context:
Executing `nightly-health-check-v1` brief v3.0 on 2026-05-17T16:02:10Z (Cowork run, Tier 0, **first scheduled fire of v3.0** — daily 02:00 AEST schedule resumed 2026-05-17 after 12-day owner-gate skip 2026-05-05→2026-05-16). Q-stuck returned 7 platform×client rows; Q-true-stuck returned 5 clusters. Two of those 5 (`instagram × care-for-welfare-pty-ltd` n=2, `instagram × invegent` n=2 — both `publish_enabled=true`, both `scheduled_for=2026-05-15`) sit in an ambiguous zone of the Section 6a categorisation rules:

- Brief Cat A reads: "platform=instagram + scheduled_for >= 25 Apr 2026, OR `profile_enabled=false`" → parses as `(instagram AND scheduled>=25 Apr) OR profile_enabled=false`. Under that strict reading both rows are Cat A (instagram + scheduled >= 25 Apr).
- Q-true-stuck SQL filters on `cpp.publish_enabled=true` AND zero attempts; both rows match, so the SQL ground truth says they ARE TRUE stuck (Cat C).

The brief's "Likely questions and defaults" Q4 covers Cat A vs Cat B overlap (Cat A wins) but not Cat A vs Cat C overlap. Strict reading would put both rows in Cat A in Section 6a but Q-true-stuck (which drives Section 6b + Section 10 P1) still includes them. That's an internal inconsistency between Section 6a's narrative categorisation rules and Section 6b's SQL-derived membership.

Cowork defaulted to: **Cat A means `profile_enabled=false` only**; the `instagram + scheduled >= 25 Apr` clause is treated as a heuristic shorthand for the `profile_enabled=false` state and is superseded when `cpp.publish_enabled` is directly observable. Under this default, the two instagram clusters are Cat C — matching Q-true-stuck. Section 6a tabulates them as Cat C; Section 6b lists them; Section 10 P1 emits one finding per cluster (5 total P1 findings emitted to friction.event; success_count=5).

Additionally noted (separate signal, not the question itself): `instagram-publisher-every-15m` (jobid 53) is `is_active=false` per Q3. So while the profile is `publish_enabled=true`, there is no active publisher cron consuming queued instagram items — this is the apparent root cause for both instagram clusters being stuck.

Question:
Is Cowork's "`profile_enabled=false` only" reading of Cat A correct, and how should the brief Cat A definition be rewritten so future scheduled runs are unambiguous?

Options:
A. Cowork's reading correct — accept this run as-is and patch the brief Cat A to "platform-lock artefact: profile_enabled=false (regardless of platform)". Drop the `instagram + scheduled>=25 Apr` clause as it's a leaky heuristic now that `cpp.publish_enabled` is the canonical signal.
B. Cowork's reading correct — accept this run as-is and leave brief unchanged (Cowork will continue applying the same default at the same overlap each run).
C. Strict reading correct — re-categorize: 4 Cat A rows + 0 Cat B + 3 Cat C rows; the two instagram clusters should be Cat A (platform-lock) rather than Cat C (true-stuck). Section 10 P1 then drops to 3 findings (only linkedin × property-pulse + youtube × property-pulse + youtube × ndis-yarns). friction.event has 2 over-emissions that Day-19 audit would need to filter out.
D. Add a new Cat D ("instagram with `publish_enabled=true` but publisher cron is `is_active=false`") to capture instagram × {care-for-welfare-pty-ltd, invegent}. The underlying cron `instagram-publisher-every-15m` (jobid 53) is inactive, so there's no consumer for these queued items even though the profile is enabled. This is the actual root cause — different from Cat A (queue-residue from a disabled-platform period) and different from Cat C (queue + healthy publisher mismatch). Section 10 P1 emission unchanged at 5; Section 6a/6b adds Cat D dimension.

Default:
Proceeded with Option A reading. Output `docs/audit/health/2026-05-17.md` written; emission completed (success_count=5, failure_count=0); run not blocked.

Impact if wrong:
Under Option C: 2 friction.event rows already emitted (`priority-1/true-stuck-instagram-care-for-welfare-pty-ltd`, `priority-1/true-stuck-instagram-invegent`) are over-emissions and would need to be marked false-positive in Day-19 reconciliation; Section 6a categorisation + Section 6b table + Section 10 P1 bullet count would shift from 5 → 3. Under Option D: same data, additional category column in Section 6a + new finding_id pattern (e.g. `priority-1/instagram-publisher-inactive-{client_slug}`) for future runs; emission counts unchanged but next-day's emission would use a different finding_id, breaking day-over-day recurrence detection for these two clusters. Under Option A or B: no immediate change to this run's output.

---

## Q-nightly-health-check-v1-005

Context:
Executing `nightly-health-check-v1` brief v3.0 on 2026-05-20T16:02:37Z (Cowork run, Tier 0, second v3.0 scheduled fire after Q-004 resolution on 2026-05-20 Sydney). All 14 brief queries ran verbatim with 0 schema-drift fallbacks. Section 10 generated 7 P1+P2 bullets (5 P1 true-stuck clusters + 2 P2: `zero-counts-pub-published-30m`, `s17-escalation-rate`). Built the JSONB findings array per Section 12.2 schema and called `friction.fn_emit_health_check_findings('nightly-health-check-v1/2026-05-20T160237Z', 'docs/audit/health/2026-05-20.md', findings)`.

Function returned `{success_count: 5, failure_count: 0, skipped_count: 2, run_id: 'nightly-health-check-v1/2026-05-20T160237Z'}`. Two divergences from brief v3.0 Section 12.3:

1. **Return shape drift.** Brief v3.0 §12.3 documents the function as returning "`success_count`, `failure_count`, and `run_id`". Actual return on 2026-05-20 includes a fourth field `skipped_count`. Brief §12.5 "Error handling" only enumerates "function call itself failed" and "function returned but count mismatch" — no third case for `skipped_count > 0`.

2. **Per-finding skip semantics.** The 5 P1 findings (problem_key shape `true-stuck-{platform}-{client_slug}`) emitted to `friction.event` cleanly. The 2 P2 findings (problem_keys `zero-counts-pub-published-30m` and `s17-escalation-rate`) were skipped and routed to `friction.emit_error` with:
   - `error_code = 'CONDITION-KEY-UNRESOLVED'`
   - `error_message = 'condition_key not derivable: no explicit field on finding and problem_key {key} does not match known patterns'`

   This indicates the function's `problem_key`→`condition_key` pattern matcher (added between brief v3.0 lock 2026-05-15 and 2026-05-20, per cc-0014 verification expectations) only recognises the `true-stuck-{platform}-{slug}` shape; the brief's other documented P2 finding_id patterns (`zero-counts-{metric}`, `s17-escalation-rate`, `stuck-items-dilution`, `failed-images-present`) are not in the recogniser. Brief Section 12.2 JSONB schema does NOT include a `condition_key` field — so the function has no override input from the finding payload.

Brief §12.4 says "If `success_count != number_of_P1_P2_bullets_in_Section_10`, do not edit Section 10 — write the discrepancy to the state file as a brief-author defect for next-day review." Cowork applied this default: kept Section 10 unchanged (7 bullets), updated Section 11 footer with `success_count=5 failure_count=0 skipped_count=2`, logged this Q-005 as the next-day review item. Markdown stands as canonical artefact.

Note: this is **function-contract drift**, not Cowork bug and not strictly brief-author bug. The function evolved (added skipped_count + condition_key pattern matching) after the brief was locked. Q-005 is the resolution channel.

Question:
How should the brief contract + function contract be reconciled so future runs emit all P1+P2 findings to `friction.event` rather than splitting some into `friction.emit_error`?

Options:
A. Patch brief v3.0 → v3.1 Section 12.2 JSONB schema to require an explicit `condition_key` field per finding (e.g. `zero_count_metric_missing` for `zero-counts-*`, `s17_escalation_rate_breach` for `s17-escalation-rate`). Brief writer controls mapping; function consumes verbatim.
B. Patch `friction.fn_emit_health_check_findings` (server-side) to extend its `problem_key`→`condition_key` pattern matcher to recognise all v3.0 brief finding_id shapes: `zero-counts-{ai-job|slot-fill-attempt|post-publish|canonical-content-body|pub-published-30m}`, `s17-escalation-rate`, `s17-failure-rate`, `stuck-items-dilution`, `failed-images-present`, `cron-consecutive-failures-{jobname}`, `worker-http-errors`, `pipeline-snapshot-stale`. Function evolves; brief unchanged.
C. Accept the skip behaviour as cosmetic — update brief Section 12.4 success criteria to compute "matches Section 10" as `success_count + skipped_count == bullet count`. Skipped findings are still observable via `friction.emit_error` and the Day-19 audit can reconcile from there. No emission flow change.
D. Re-categorise the 2 P2 finding shapes (`zero-counts-{metric}`, `s17-*`) as markdown-only (P3-equivalent for emission), and only emit P1 (and any P2 that has server-side pattern support). Brief Section 10 still tabulates them; brief Section 12.2 JSONB array excludes them; emission success_count would have been 5 of 5 P1, with the P2s purely informational like P3 today.

Default:
Proceeded with the contract-drift accommodation: kept Section 10 unchanged (per brief §12.4), updated Section 11 footer with `success_count=5 failure_count=0 skipped_count=2`, logged this question. No retry; no re-edit of `docs/audit/health/2026-05-20.md` beyond the footer line.

Impact if wrong:
Under Option A: brief v3.1 patch + retroactive `condition_key` on this run's 2 P2 findings (re-emit via direct INSERT or function re-call — function may need an idempotency-relaxing mode for re-fires); next-day brief produces all 7 emissions cleanly. Under Option B: function patch + apply_migration (Tier 2 work; out of Cowork scope); brief unchanged; next-day brief produces all 7 emissions cleanly. Under Option C: trivial brief-text edit; no data change; future runs produce same `success + skipped = N` shape and friction.emit_error fills with cosmetic skips. Under Option D: brief Section 10 still surfaces P2 to humans but emission excludes them — IOL signal scope narrows to P1-only, which simplifies cc-0014 Day-19 audit but loses two signal classes. **No re-emission required for 2026-05-20 under any option** — markdown is canonical and the 5 P1 emissions stand correctly.

---

## Q-nightly-health-check-v1-006

Context:
Executing `nightly-health-check-v1` brief v3.1.1 on 2026-05-21T16:03:02Z (Cowork run, Tier 0, scheduled fire). Q-stuck returned 8 platform×client rows. Seven classify cleanly into the Section 6a scheme (2 Cat A, 0 Cat B, 5 Cat C). One row matches none of the three categories:

- `facebook × care-for-welfare-pty-ltd`: `approval_status=approved`, n=3, `zero_publish_attempts=0`, `profile_enabled=true`, scheduled 2026-05-21 08:00–08:30Z (overdue >1h).

Section 6a Cat A is `profile_enabled=false` (row is true → not Cat A). Cat B is `approval_status=needs_review` (row is approved → not Cat B). Cat C requires `approval_status=approved` AND `profile_enabled=true` AND `zero_publish_attempts > 0` — this row has `zero_publish_attempts=0` (all 3 items already carry at least one `m.post_publish` row), so it fails the `> 0` clause and is NOT Cat C. Q-true-stuck (the Priority 1 ground-truth query, which requires zero publish attempts) correctly excludes the row. The brief "Likely questions and defaults" answer-key covers a Cat A vs Cat B overlap (Q4) but not a row that matches none of the three categories.

These 3 items are approved, profile-enabled, overdue, but already attempted (≥1 publish attempt each) and still `status='queued'` — a retry-pending state, not zero-attempt true-stuck. Facebook is publishing normally (Q5: 3 published, 1 failed in 24h).

Question:
How should Q-stuck rows that are `approved + profile_enabled=true + overdue` but have `zero_publish_attempts=0` (already attempted, awaiting retry) be categorised, and should brief Section 6a add an explicit fourth bucket for them?

Options:
A. Add an explicit Cat D — "attempted-not-true-stuck: approved + profile_enabled=true + zero_publish_attempts=0" — transient retry-pending residue, non-actionable from this brief, not surfaced in Section 10 Priority 1. Patch Section 6a to define it.
B. Treat as non-actionable and report under a Section 6a "does not match Cat A/B/C" note without a formal category; leave the three-category scheme unchanged.
C. These items are genuinely stuck and should be Priority 1 — relax Cat C / Q-true-stuck to also include attempted-but-still-queued items.

Default:
Proceeded with Option B for this run — the `facebook × care-for-welfare-pty-ltd` row is reported in Section 6a under an explicit "Unclassified (does not match Cat A/B/C)" note, counted separately in the category totals (1 row, 3 items), treated as non-actionable (consistent with Q-true-stuck excluding it), and surfaced only as a Priority 3 informational line in Section 10. Not emitted to friction.event. No brief change this run.

Impact if wrong:
Under Option A: brief Section 6a gains a Cat D definition; this run's output is re-tabulated with the row as Cat D (cosmetic — same non-actionable outcome, no emission change). Under Option C: Q-true-stuck SQL + Cat C definition widen; the 3 facebook items would become a sixth Priority 1 true-stuck cluster and emit a sixth `friction.event` row — materially changes emission scope. Under Option B: no brief change; the same row shape recurs and is handled the same way each run.

---

## Closed (resolution refs)

When a question is resolved, append a resolution block here referencing the original Q-ID. Do NOT move the original question entry from the Open section — leave it where it was written. The resolution block here is a back-pointer.

```
## Resolved Q-{brief-slug}-{nnn}

Resolved by: <Q-{...}-{nnn} answer in claude_answers.md | PK chat | obsolete>
Resolved at: {YYYY-MM-DDTHHMMSSZ}
Outcome: <decision A/B/C/custom + one-line summary>
```

## Resolved Q-audit-slice-2-snapshot-generation-001

Resolved by: PK chat (2026-04-30 ~17:35 Sydney / 07:35Z)
Resolved at: 2026-04-30T07:35:00Z
Outcome: **Option A** — chat verified all 6 substitutions against `information_schema` (every claim was factually correct: `f.feed_source.active`, `k.table_registry.object_kind`, `c.client.name`, `t.content_vertical.slug`, `m.signal_pool.use_count` all confirmed missing; `status`, `table_kind`, `client_name`, `vertical_slug`, `reuse_count` all confirmed present; `c.client_publish_profile.enabled` and `m.post_draft.post_seed_id` both confirmed missing). Snapshot at `docs/audit/snapshots/2026-04-30.md` accepted as-is. Brief refreshed at the same commit to fix all 6 schema-drift queries + the `pg_indexes.indexrelid` view-shape bug + Section 11 simplification (drop the `post_seed` indirection — `m.post_draft.client_id` exists directly, no hop needed). Tomorrow's daily run targets 0 fallbacks. Sections that were affected but are now correct: 1, 3.1, 7, 9, 11, 15, 16.

## Resolved Q-nightly-health-check-v1-001

Resolved by: PK chat (2026-05-02 ~17:00 Sydney / 07:00Z, then v2 brief patch at 7d6e31d7)
Resolved at: 2026-05-02T07:00:00Z
Outcome: **Option A** — chat verified all 4 schema substitutions against `information_schema`. Confirmed: `m.post_publish.draft_id` does NOT exist (correct column is `post_draft_id`); `m.post_draft.draft_id` does NOT exist (PK is `post_draft_id`); `c.client.slug` does NOT exist (correct is `client_slug`); `m.post_publish.status='success'` is invalid (enum is `{published, failed}`); `m.slot_fill_attempt.outcome` does NOT exist (correct is `decision`); `m.slot_fill_attempt.created_at` does NOT exist (correct is `attempted_at`). All 4 Cowork substitutions were factually correct. Run output `docs/audit/health/2026-05-02.md` (v1 run) accepted. Brief refreshed at commit 7d6e31d7 (v2 patch) with: Q7 corrected joins + filter; Q9 corrected column + time field; Q3/Q4 added `AND window_hours = 24` filter; new Q-stuck + Q-true-stuck queries; new Section 6a/6b drill-down; Section 10 priority-tier categorisation; S17 minimum-n guard. v2 first-run hit 7-of-7 measurable thresholds — v2 schema patches all worked verbatim, closing this question mechanically.

## Resolved Q-nightly-health-check-v1-002

Resolved by: PK chat (2026-05-02 ~20:30 Sydney / 10:30Z, then v2.1 brief patch at c726f232)
Resolved at: 2026-05-02T10:42:49Z
Outcome: **Option A** — Cowork's correlated-subquery rewrite was semantically correct. PK chat decision: patch the brief Q-true-stuck SQL using the slice-notation alternative `(array_agg(pd.post_draft_id ORDER BY ppq.scheduled_for))[1:5]` rather than the correlated subquery. Slice notation is more efficient (single aggregate evaluation per group) and idiomatic Postgres. Verified syntax: `array_agg()` accepts `ORDER BY` per SQL standard but rejects `LIMIT` (which is a SELECT-clause modifier); slice notation `[1:5]` applied to the resulting array picks the first 5 elements after ordering. Run output `docs/audit/health/2026-05-02.md` (v2 run) accepted as-is — Section 6b sample_draft_ids array values are correct. Brief refreshed at commit `c726f232` (v2.1 patch). Tomorrow's scheduled run targets 0 fallbacks. **Pattern note:** Two consecutive Cowork runs surfaced brief-author SQL bugs recovered via default-and-continue (Q7/Q9 schema bugs in v1; Q-true-stuck syntax bug in v2). Lesson #61 (pre-flight discipline) extends from `information_schema.columns` lookup to also include test-running every brief SQL block before authoring. **v2.1 is the locked brief shape — schedule candidate at Cowork → Scheduled → daily 02:00 AEST.**

## Resolved Q-post-render-log-column-purposes-001

Resolved by: PK chat (2026-05-03 ~12:00 Sydney / 02:00Z)
Resolved at: 2026-05-03T02:00:00Z
Outcome: **Option A** — chat verified Cowork's two design decisions against producer code by personally reading `supabase/functions/image-worker/index.ts` v3.9.2 line-by-line via github MCP. Cross-checked 12 material producer-code citations:
- p_render_engine='creatomate' literal in both write_render_log calls ✓
- p_render_spec=null literal in both calls (production: 0/932 populated) ✓
- status write set: 'succeeded' (success path) / 'timeout' (errMsg.includes('timed out')) / 'failed' (else). Column default 'submitted' never written by code ✓
- errMsg.slice(0, 500) truncation on error_message ✓
- attempt_number not passed (column default 1 applies) ✓
- render_duration_ms = Date.now() - startMs ✓
- 5 ice_format_keys present (image_quote, animated_text_reveal, animated_data, carousel, image_quote_video_fallback) ✓
- resolveClientId chain: direct → m.post_draft → m.digest_item → m.digest_run ✓
- POLL_INTERVAL_MS=1500, POLL_MAX_ATTEMPTS=30 ✓
- credits_used = data.credits != null ? Number(data.credits) : null ✓
- storage path patterns for all 5 formats ✓
- slide_id NULL for single-image, set for carousel ✓

Migrations applied via Supabase MCP `apply_migration` per D170:
1. `audit_post_render_log_column_purposes` — atomic DO block, 15 UPDATEs on `k.column_registry`, Lesson #38 verification (pre_count=16, post_count=1, delta=15). render_spec deferred LOW per `docs/audit/decisions/post_render_log_low_confidence_followup.md`.
2. `refresh_post_render_log_table_purpose_to_match_code_cited_write_set` — single UPDATE on `k.table_registry.purpose` for table_id=81572 with ROW_COUNT verification. Aligns table-level enum with column-level code-cited values; closes the temporary inconsistency between `k.column_registry` (post-F04) and `k.table_registry`.

MCP review fires: 2 fires (review_id `043e1831-ba73-4027-9f3c-90a646bcd99f` first-pass, `bbef4ace-bae8-4510-ad84-bc980e1b8a1e` second-pass). Both escalated despite Path B providing concrete producer-code verification. Pattern: **ChatGPT consistency-bias on sql_destructive** — `pushback_points` repeated verbatim from first-pass even when `verified_claims` body acknowledged Path B evidence cleared the originals. PK explicit override applied; both migrations applied. **Lesson #62 candidate refined to type-(c)** pattern.

m schema docs coverage bump: 26.2% (180/686) → 28.4% (195/686).

Closure-budget contribution: ~0.5h.

Run state: `docs/runtime/runs/2026-05-03-f04-and-fpub007-fpub010-session.md`.

## Resolved Q-nightly-health-check-v1-004

Resolved by: A-nightly-health-check-v1-004 in `docs/runtime/claude_answers.md` (PK ratification, 2026-05-20 Sydney)
Resolved at: 2026-05-20T02:43:00Z (approximate; see commit timestamp for precise mark)
Outcome: **Option A** — PK ratifies Cowork's reading: Cat A is the platform-lock artefact (`profile_enabled=false`), regardless of platform. The `instagram + scheduled_for >= 25 Apr 2026` clause is dropped from the brief as a leaky heuristic now superseded by the canonical `cpp.publish_enabled` / `cpp.profile_enabled` signals. The two instagram clusters from the 2026-05-17 run (instagram × care-for-welfare-pty-ltd, instagram × invegent) are correctly classified as Cat C true-stuck per Q-true-stuck SQL ground truth, and the 5 P1 emissions to `friction.event` for that run stand as correct — no friction.event cleanup, no finding_id changes. Brief patched at `docs/briefs/nightly-health-check-v1.md` Section 6a simplifying Cat A wording. Underlying root cause for the two instagram clusters (jobid 53 `instagram-publisher-every-15m` is `is_active=false`) belongs in friction triage at `/operations`, not in the brief's Cat A definition.
