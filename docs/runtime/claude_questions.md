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
