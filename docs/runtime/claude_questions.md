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
