---
brief_id: phase-d-array-mop-up
status: running
risk_tier: 1
owner: cowork
created_by: PK
created_at: 2026-04-29
default_action: draft_only
allowed_paths:
  - supabase/migrations/**
  - docs/runtime/runs/**
  - docs/runtime/claude_questions.md
  - docs/briefs/queue.md
  - docs/briefs/phase-d-array-mop-up.md
forbidden_actions:
  - apply_migration
  - update_production_data
  - delete_branch
  - merge_pr
  - close_audit_finding
idempotency_check: migration_file_absent
idempotency_pattern: "supabase/migrations/*audit_f002_phase_d_array*.sql"
success_output:
  - supabase/migrations/{YYYYMMDDHHMMSS}_audit_f002_phase_d_array_columns.sql
  - docs/runtime/runs/phase-d-array-mop-up-{YYYY-MM-DDTHHMMSSZ}.md
estimated_questions: 3
estimated_runtime_minutes: 20
related_decisions:
  - D170
  - D171
  - D181
  - D182
related_lessons:
  - 32
  - 36
  - 38
  - 39
---

# Brief: Phase D ARRAY mop-up — 7 missing column purposes

## Context

F-002 Phase D follow-up. During Phase C apply (28 Apr 2026), chat noticed CC's P3 regex captured all 23 jsonb columns in c+f but missed 7 pure pg ARRAY columns. F-002 closed-action-taken without these 7 because they're enumerated string lists, not safety-sensitive in the way booleans (P1) or thresholds (P2) are.

Full context: `docs/audit/decisions/f002_phase_d_missing_array_columns.md`.

**This is the first test of the D182 non-blocking execution system.** Treat it as a velocity proof, not a coverage emergency. Coverage delta is small (20.2% → ≈21.2% on c+f columns).

## Goal

Draft a single migration file that UPDATEs `k.column_registry` with `column_purpose` for these 7 ARRAY columns. **Do NOT apply.** PK applies in morning review.

## Pre-flight findings (already captured — do not re-run)

PK ran pre-flight before authoring this brief. These results are authoritative for this run; Cowork should NOT re-query unless they're stale.

### Row counts and population (29 Apr 2026)

| schema.table.column | rows_total | rows_populated |
|---|---|---|
| `c.client_brand_asset.platform_scope` | 0 | 0 |
| `c.client_brand_profile.brand_never_do` | 4 | 4 |
| `c.client_brand_profile.brand_voice_keywords` | 4 | 4 |
| `c.content_series.platforms` | 9 | 2 |
| `c.onboarding_submission.content_topics` | 1 | 1 |
| `c.onboarding_submission.desired_platforms` | 1 | 1 |
| `f.video_analysis.key_hooks` | 9 | 9 |

### Sample values (concrete shape per column)

```
brand_never_do (CFW):
  {"Never use markdown formatting...", "Never open with the source name...",
   "Never use AI tell-phrases...", "Never speculate beyond what the source supports...",
   "Never give personal advice...", "Never write a post that any generic content producer
   could have written.", "Never be promotional..."}
  → 7 free-prose voice-discipline rules.

brand_never_do (Property Pulse):
  {"Never use markdown...", "Never predict the future with confidence...",
   "Never promote specific properties...", "Never use AI tell-phrases...",
   "Never open with the source name...", "Never give personal financial advice.",
   "Never write a post that reads like it came from a real estate marketing team."}
  → 7 entries; same shape as CFW.

brand_voice_keywords (CFW):       {warm, plain-English, practitioner-voice, grounded, honest, calm}
brand_voice_keywords (PP):        {measured, direct, data-driven, investor-to-investor, CPA-lens, honest-about-risk}
  → 6-element single-word voice descriptors.

content_series.platforms:         {facebook}, {youtube}
  → single-element platform_key arrays.

onboarding_submission.content_topics:    {"Occupational therapy under NDIS"}
onboarding_submission.desired_platforms: {Facebook, Instagram, LinkedIn}
  → free-text topic strings; title-case platform names.

video_analysis.key_hooks:         {"Unable to identify hooks", "Missing video information", "No content to analyze"}
  → short prose, often fallback strings when analysis was thin.
```

### Registry baseline (29 Apr 2026)

All 7 rows exist in `k.column_registry`. All have `column_purpose IS NULL`. All `data_type = 'ARRAY'`, `udt_name = '_text'`. Clean baseline; no overwrites.

## Pattern to follow

Use `supabase/migrations/20260428064115_audit_f002_p2_column_purposes_corrected.sql` as the template. Specifically:

1. Open with comment block: brief reference, source, what's covered, what's deliberately NOT covered.
2. Wrap UPDATEs in a `DO $audit_phase_d$ ... $audit_phase_d$;` block with `expected_delta CONSTANT integer := 7;`.
3. Capture `before_count` of documented c+f rows (`column_purpose IS NOT NULL AND <> '' AND <> 'PENDING_DOCUMENTATION' AND NOT ILIKE 'TODO%'`).
4. UPDATE pattern (per row):
   ```sql
   UPDATE k.column_registry
   SET column_purpose = $cp$<purpose text>$cp$, updated_at = NOW()
   WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = '<sch>' AND table_name = '<tbl>')
     AND column_name = '<col>';
   ```
5. Capture `after_count` and `RAISE EXCEPTION` if `after_count - before_count <> expected_delta` (Lesson #38).
6. End with `RAISE NOTICE` summarising the delta.

Do NOT use `WHERE column_purpose IS NULL` as the guard — the count-delta verification is the idempotency mechanism here, and PK wants the migration to fail loudly if a row was unexpectedly already populated.

## Critical reminders

- **Lesson #32** — `k.column_registry` does NOT have `schema_name` directly. Join via `table_id` to `k.table_registry`. The pre-flight done by PK uses this pattern; mirror it.
- **Lesson #36** — the migration filename is permanent once applied. Pick one filename and stick with it. Suggested: `{YYYYMMDDHHMMSS}_audit_f002_phase_d_array_columns.sql` where the timestamp is the moment Cowork commits the file (numeric format, no separators).
- **Lesson #38** — verify with COUNT delta, not time-window. The `refresh_column_registry` function bumps `updated_at` on every row when run, so a window-based check is unreliable.
- **Lesson #39** — only relevant to JSONB columns. Not applicable here, but if Cowork notices an ARRAY column with shape variation across rows, flag it in the state file rather than assuming uniformity.

## Wording style guidance

Match P2's style:

- One to three sentences
- Open with the column's role ("Per-client cap on...", "Operator-curated list of...")
- State the unit or shape ("Unit: characters", "text[] of platform keys")
- Cite observed range or representative sample ("Observed: 6-element arrays of single-word descriptors")
- For unpopulated columns, say so explicitly ("No populated rows yet — table not exercised")
- Where the column reads downstream (e.g. ai-worker, publisher), name the consumer with appropriate hedging if not verified

Keep total length ≤ 400 chars per row. Don't speculate beyond pre-flight evidence.

## Likely questions and defaults

### Q1: Should I pre-flight the columns again before drafting?

**Default:** No. Pre-flight findings above are from 29 Apr morning and are authoritative for this run. Re-querying is wasted budget. Trust the data PK pre-loaded; if a sample looks wrong, write a question instead of re-running SQL.

**Escalate if:** any pre-flight value looks impossible (e.g. negative count) or contradicts what the brief asserts.

### Q2: What if `c.client_brand_asset.platform_scope` has zero rows — do I still document it?

**Default:** Yes. The column exists in the schema, registry has a row for it, and the brand-asset table is part of the documented client-config surface. Document it as "text[] of platform keys this asset applies to. No populated rows yet — table not yet exercised." Phase B set the precedent (`c.client_class_fitness_override.override_score`, `c.client_match_weights.fitness_weight` were both unpopulated and got purposes).

**Escalate if:** the column doesn't actually exist in the registry (i.e. pre-flight is wrong).

### Q3: For `c.client_brand_profile.brand_never_do` and `brand_voice_keywords` — do these get baked into the LLM prompt?

**Default:** State the consumer cautiously without asserting a specific code path. Sample data shows these are voice-discipline lists, but the prompt-assembly code path was NOT verified during pre-flight. Use wording like "Intended for brand-voice prompt context; exact downstream consumer not verified in pre-flight." Avoid claiming a specific function name. Don't write "Used by ai-worker" alongside "consumer not verified" — it contradicts itself.

**Escalate if:** the wording would mislead PK about how the column is consumed. P2 corrected wording softened similar claims (`max_output_tokens` removed `assemblePrompts()` reference).

### Q4: Should I match `onboarding_submission.desired_platforms` with `c.platform_channel.platform_key` semantics?

**Default:** No — don't assume. Sample shows title-case entries ("Facebook", "Instagram", "LinkedIn") which are NOT the same as the lowercase `platform_key` values used downstream. Document as "text[] of platform names captured via public onboarding form. Free-text title-case (e.g. {Facebook,Instagram,LinkedIn}); operator normalises to lowercase platform_keys during onboarding review."

**Escalate if:** a downstream consumer would treat these as canonical platform_keys without normalisation.

### Q5: What if I drafted a wording that turns out to be wrong after PK reviews?

**Default:** PK will not apply the migration. The migration sits in the repo, PK or chat revises in a follow-up commit before applying. Per D182 correction handling "after commit but before apply": amend in single follow-up commit. No auto-revert needed because nothing was applied.

**Escalate if:** the wording is clearly safety-impacting (e.g. claims a non-existent constraint).

## Success criteria

At end of run:

1. **One migration file** at `supabase/migrations/{YYYYMMDDHHMMSS}_audit_f002_phase_d_array_columns.sql`
2. **DO block** with `expected_delta := 7`, `before_count`, `after_count`, count-delta verification
3. **Seven UPDATE statements**, one per column from the table above
4. **All 7 wordings** match the style guidance and stay ≤ 400 chars
5. **State file** at `docs/runtime/runs/phase-d-array-mop-up-{YYYY-MM-DDTHHMMSSZ}.md` per `state_file_template.md`
6. **Zero production writes** (no `apply_migration`, no `execute_sql` UPDATE/INSERT/DELETE)
7. **Status** ends as `review_required`
8. **Queue file** `docs/briefs/queue.md` updated with new brief status + run timestamp

## Out of scope

- **Applying the migration.** PK does this in morning review.
- **6 LOW-confidence columns** in P1+P2+P3 followup files — separate joint-resolution session.
- **ARRAY columns in m, t, a, k, r schemas** — only c+f per F-002 brief scope.
- **Updating `f002_phase_d_missing_array_columns.md`** with closure status — PK does this after applying the migration.
- **Touching `k.refresh_column_registry`** or any registry-curation function — only writing UPDATEs.
- **Re-running pre-flight queries** — PK already did. Trust the brief.

## State file expectations

Write `docs/runtime/runs/phase-d-array-mop-up-{YYYY-MM-DDTHHMMSSZ}.md` per `state_file_template.md`. Specifically:

- **Status:** end at `review_required`
- **Risk tier:** 1
- **Work completed:** list the 7 UPDATEs by column, plus the migration filename
- **Questions asked:** any Qs written to `claude_questions.md` (with IDs)
- **Answers received:** N/A unless an OpenAI API run happened first
- **Corrections applied:** N/A on first pass
- **Validation results:** N/A until GitHub Actions runs (Phase 4b of D182)
- **Stop conditions:** none if successful; `ESCALATION_REQUIRED` if any Q5-style safety concern arose
- **Needs PK approval:** "Apply migration `{filename}` after review of 7 wordings"
- **Issues encountered:** anything unexpected, even if recovered
- **Next step:** "PK reviews migration file, applies via Supabase MCP, marks brief done in queue"

## What good looks like

A migration file PK can apply in 60 seconds without modification, after ≤10 minutes of review.

If this brief produces that, the D182 system has earned its first run.
