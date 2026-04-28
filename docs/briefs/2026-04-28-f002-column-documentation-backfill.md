# Brief — F-002 Column Documentation Backfill (P1-P3 Priority Pass)

**Date:** 2026-04-28
**Source:** Audit closure F-2026-04-28-D-002 (action-pending → now actioned via CC)
**Author:** Claude (Opus 4.7) in chat, operator-approved
**Target:** Claude Code
**Branch:** main (direct-push)
**Estimated CC time:** 60-90 min total across 3 phases
**Estimated operator review time:** 60-90 min total across 3 review batches

---

## 1. Context

Audit run 2026-04-28 raised F-002 (MEDIUM): `c` and `f` schemas have 0% column-purpose coverage in `k.column_registry` — 479 columns in `c` and 195 columns in `f`, total **674 columns** with no documentation.

Original F-002 plan was an overnight ChatGPT-assisted job. Operator decided to action via CC instead because:
- CC can inspect actual schema for ambiguous columns (ChatGPT cannot)
- Today's table-level closure proved schema verification catches errors that name-based inference misses (the `c.brand_stakeholder` / `c.brand_avatar` / `c.client_avatar_profile` chain was drafted wrong by name alone, fixed by schema inspection)
- CC can write the migration file ready for chat to apply via Supabase MCP per D170
- CC's V1-V8 verification gates produce a higher-quality output than overnight pass

**Scope is intentionally NOT all 674 columns.** Only P1-P3 priority tiers. P4-P6 (FK columns, audit timestamps, surrogate keys) are deferred. Most P5-P6 may never need explicit purposes — they're self-documenting.

Estimated columns in P1-P3: 100-200 across `c` and `f`. Final count emerges from inventory queries.

---

## 2. Scope

### 2.1 In scope

Three priority tiers across schemas `c` and `f`:

**P1 — Behaviour-control columns** (highest leverage):
- `data_type = 'boolean'` (all)
- Columns named `*_status`, `mode`, `*_kind`, `*_type` where `data_type = 'text'` (likely enumerated)
- Columns named `is_*`, `has_*`, `*_enabled`, `*_required`, `*_active`, `*_locked`, `*_paused` (any data type)

**P2 — Threshold/limit/count columns** (decision parameters):
- Columns named `*_threshold`, `*_max_*`, `*_min_*`, `*_limit*`, `*_per_*`, `*_quota*`
- Columns named `*_count`, `*_score*`, `*_weight*`, `*_priority`
- Restricted to numeric types (`integer`, `bigint`, `numeric`, `real`, `double precision`)

**P3 — Structured config columns** (schema-within-schema):
- `data_type IN ('jsonb', 'json')` (all)
- Columns named `*_payload`, `*_config`, `*_settings`, `*_metadata`, `*_options`, `*_targeting`, `*_filter*` (any data type)

### 2.2 Out of scope (this brief)

- **P4 — Foreign key columns** that don't match P1-P3 patterns. Deferred to future brief. Mostly self-documenting via FK reference.
- **P5 — Audit timestamps** (`created_at`, `updated_at`, `*_at`, `*_signed_at`, `gen_*_at` etc). Deferred. Mostly self-documenting.
- **P6 — Surrogate keys** (`*_id` UUID primary keys). Deferred. Self-documenting.
- **All other ICE schemas** (`a`, `k`, `m`, `r`, `t`). This brief covers `c` and `f` only — they're at 0% which is the audit finding's specific focus.

If a column matches both an in-scope pattern AND an out-of-scope pattern (e.g. `payload_id` — JSONB but also FK), treat as **in-scope** (P3 wins over P4).

---

## 3. Schema verification rule

For any column where the name + table_purpose + data_type does NOT make the meaning unambiguous, CC inspects the actual schema before drafting:

1. Query distinct values via `SELECT DISTINCT {col} FROM {schema}.{table} LIMIT 10` (only for low-cardinality columns; skip for free-text or jsonb)
2. Check FK target if applicable (read the parent table's purpose and structure)
3. For jsonb columns: query a sample row to see actual key structure
4. For boolean/enum columns: check if values are populated (a column may exist but never be set, indicating it's deprecated)

Each proposal carries a confidence marker:

- **HIGH** — name + table purpose + data type tells the whole story unambiguously. Example: `c.client.is_active` boolean.
- **MEDIUM** — drafted with reasonable inference but operator should sanity-check. Example: `c.client_publish_profile.mode` text — likely enum but exact values matter.
- **LOW** — column purpose unclear from available evidence; operator inspection required. Example: any column named `legacy_*` or with no sample values populated.

**Distribution check:** if more than 80% of proposals are HIGH, CC has not done schema verification thoroughly. Should re-pass with skepticism. Realistic distribution: 50-60% HIGH, 30-40% MEDIUM, 5-15% LOW.

---

## 4. The work

Three sequential phases (P1 → P2 → P3). After each phase, CC pauses for operator review and approval before moving to the next.

### 4.1 Phase A — P1 inventory + proposals + migration

**4.1.1 Inventory query (CC runs via Supabase MCP):**

```sql
SELECT
  tr.schema_name,
  tr.table_name,
  cr.column_name,
  cr.data_type,
  cr.is_nullable,
  cr.is_foreign_key,
  cr.fk_ref_schema || '.' || cr.fk_ref_table || '.' || cr.fk_ref_column AS fk_target,
  tr.purpose AS table_purpose
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name IN ('c', 'f')
  AND (cr.column_purpose IS NULL OR cr.column_purpose = '' OR cr.column_purpose ILIKE 'TODO%')
  AND (
    -- P1: booleans
    cr.data_type = 'boolean'
    OR
    -- P1: enum-like text columns
    (cr.data_type = 'text' AND cr.column_name ~ '(^|_)(status|mode|kind|type)(_|$)')
    OR
    -- P1: behaviour-flag columns
    cr.column_name ~ '^(is_|has_)' OR cr.column_name ~ '_(enabled|required|active|locked|paused)$'
  )
ORDER BY tr.schema_name, tr.table_name, cr.ordinal_position;
```

CC adjusts the regex if it returns no rows — but expected count is 30-60 P1 columns across c and f.

**4.1.2 Proposals file output:**

Path: `docs/audit/snapshots/columns/2026-04-28-p1-proposals.md`

Format:

```markdown
# F-002 Column Proposals — P1 Behaviour-Control

**Generated:** 2026-04-28 [HH:MM] UTC by Claude Code
**Phase:** A (P1 — booleans + enum status + behaviour flags)
**Total columns:** [N]
**Confidence distribution:** HIGH [X], MEDIUM [Y], LOW [Z]

---

## c.client_publish_profile.publish_enabled
- **Type:** boolean
- **Nullable:** true
- **FK:** none
- **Sample distinct values:** [true, false]
- **Table purpose:** "Per-client per-platform publishing profile..."
- **Proposed column_purpose:** "Master toggle for whether ICE will publish to this client x platform. When false, drafts may still be generated and queued but the publisher skips them."
- **Confidence:** HIGH
- **Reasoning:** "Boolean named publish_enabled on a publish_profile table with auto/manual/staging mode column elsewhere — the toggle/mode separation is canonical."

## c.client_publish_profile.mode
- **Type:** text
- **Nullable:** true
- **FK:** none
- **Sample distinct values:** ['auto', 'manual', 'staging']
- **Table purpose:** "Per-client per-platform publishing profile..."
- **Proposed column_purpose:** "Publishing mode — 'auto' = approved drafts publish on schedule; 'manual' = approved drafts wait in queue for human trigger; 'staging' = nothing publishes (test mode)."
- **Confidence:** HIGH
- **Reasoning:** "Distinct values match the documented publishing mode pattern in c.client_publish_profile table purpose."

[... repeat for every column in scope ...]

---

## Summary
- **Total proposals:** [N]
- **Confidence distribution:** HIGH [X] · MEDIUM [Y] · LOW [Z]
- **Operator review checklist:**
  - [ ] Spot-check 5 HIGH proposals — confirm none are wrong
  - [ ] Read every MEDIUM proposal — flag any that need correction
  - [ ] Inspect every LOW proposal — these need operator-written purposes
  - [ ] Approve to apply migration
```

**4.1.3 Migration file:**

Path: `supabase/migrations/[YYYYMMDDHHMMSS]_audit_f002_p1_column_purposes.sql`

Format: One UPDATE statement per approved proposal, plus update of `updated_at`. Example:

```sql
-- Audit closure: F-2026-04-28-D-002 — P1 column purposes (behaviour-control)
-- Source: docs/audit/snapshots/columns/2026-04-28-p1-proposals.md
-- Total UPDATEs: [N]

UPDATE k.column_registry
SET column_purpose = 'Master toggle for whether ICE will publish to this client x platform...',
    updated_at = NOW()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name = 'c' AND table_name = 'client_publish_profile')
  AND column_name = 'publish_enabled';

[... etc ...]
```

The migration must use `SELECT table_id FROM k.table_registry WHERE schema_name = X AND table_name = Y` because `k.column_registry` references `table_id`, not `(schema, table)` directly.

CC writes this file to the GitHub repo. **Chat applies via Supabase MCP `apply_migration` per D170.** CC does NOT call apply_migration itself.

**4.1.4 Operator handoff (end of Phase A):**

CC posts a Phase A completion message in chat with:
- Path to proposals file (committed SHA)
- Path to migration file (committed SHA, NOT yet applied)
- Confidence distribution summary
- Anything CC is uncertain about

Operator pulls the proposals file, reviews, approves (or asks CC to revise specific proposals), then chat applies the migration.

**Wait for operator approval before proceeding to Phase B.**

### 4.2 Phase B — P2 inventory + proposals + migration

Same shape as Phase A, but with P2 inventory query:

```sql
SELECT
  tr.schema_name, tr.table_name, cr.column_name, cr.data_type,
  cr.is_nullable, cr.is_foreign_key,
  cr.fk_ref_schema || '.' || cr.fk_ref_table || '.' || cr.fk_ref_column AS fk_target,
  tr.purpose AS table_purpose
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name IN ('c', 'f')
  AND (cr.column_purpose IS NULL OR cr.column_purpose = '' OR cr.column_purpose ILIKE 'TODO%')
  AND cr.data_type IN ('integer','bigint','numeric','real','double precision','smallint')
  AND cr.column_name ~ '(threshold|max_|min_|_limit|_per_|quota|count|score|weight|priority)'
ORDER BY tr.schema_name, tr.table_name, cr.ordinal_position;
```

Output paths:
- `docs/audit/snapshots/columns/2026-04-28-p2-proposals.md`
- `supabase/migrations/[timestamp]_audit_f002_p2_column_purposes.sql`

Same operator handoff pattern. **Wait for operator approval before Phase C.**

### 4.3 Phase C — P3 inventory + proposals + migration

P3 inventory query:

```sql
SELECT
  tr.schema_name, tr.table_name, cr.column_name, cr.data_type,
  cr.is_nullable, cr.is_foreign_key,
  cr.fk_ref_schema || '.' || cr.fk_ref_table || '.' || cr.fk_ref_column AS fk_target,
  tr.purpose AS table_purpose
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name IN ('c', 'f')
  AND (cr.column_purpose IS NULL OR cr.column_purpose = '' OR cr.column_purpose ILIKE 'TODO%')
  AND (
    cr.data_type IN ('jsonb', 'json')
    OR cr.column_name ~ '(payload|config|settings|metadata|options|targeting|filter)'
  )
ORDER BY tr.schema_name, tr.table_name, cr.ordinal_position;
```

For P3 jsonb columns, CC MUST query at least one sample row to understand the structure:

```sql
SELECT {col} FROM {schema}.{table} WHERE {col} IS NOT NULL LIMIT 1;
```

If no rows have the column populated, mark confidence LOW with reasoning "no populated rows found — column may be unused or deprecated."

Output paths:
- `docs/audit/snapshots/columns/2026-04-28-p3-proposals.md`
- `supabase/migrations/[timestamp]_audit_f002_p3_column_purposes.sql`

### 4.4 Final report (after Phase C completes)

CC writes a brief summary file at `docs/briefs/2026-04-28-f002-column-documentation-backfill-result.md` covering:

- Total columns documented across P1+P2+P3
- Final coverage in `c` and `f` (run the same coverage query the snapshot uses)
- Anything that came up that the operator should know about (out-of-scope-suggest-X observations, columns that turned out to be deprecated, schema oddities)
- Any LOW-confidence proposals that operator wrote manually rather than approving CC's draft

---

## 5. Verification gates (V1-V8 per phase)

CC executes these gates internally before posting Phase X completion to chat. Each phase has its own V1-V8 cycle.

| Gate | Check | Pass criterion |
|---|---|---|
| V1 | Inventory query returns rows | Phase A: 30-60 expected; Phase B: 30-50; Phase C: 20-40 (adjust if much higher/lower — investigate why) |
| V2 | Proposals file written | File exists, header populated, every inventoried column has an entry |
| V3 | Schema verification done | At least 30% of proposals show evidence of schema inspection (sample values queried, FK target inspected, etc.) |
| V4 | Confidence markers present | Every proposal has HIGH, MEDIUM, or LOW. No proposal missing. |
| V5 | Confidence distribution sane | Not >80% HIGH. Not >50% LOW. If outside, re-pass. |
| V6 | Migration file syntactically valid | UPDATE statements use proper `SELECT table_id FROM k.table_registry...` pattern. No malformed strings. |
| V7 | Migration aligns with proposals | UPDATE count = proposal count exactly. Each UPDATE matches a proposal's column_purpose text. |
| V8 | Out-of-scope columns NOT touched | Migration must NOT include FK columns outside P1-P3, audit timestamps, or surrogate keys. CC verifies by re-running the inventory query and confirming the migration only updates those rows. |

If any gate fails, CC investigates before reporting completion.

---

## 6. Iteration model

```
CC: Phase A inventory → propose → migration draft → V1-V8 → commit → @ operator
Operator: review + approve in chat → chat applies migration via Supabase MCP
CC: Phase B (same shape)
Operator: review + approve → apply
CC: Phase C (same shape)
Operator: review + approve → apply
CC: Final report
Done.
```

CC pauses between phases. Operator may pause CC indefinitely between phases — this is fine; phases are independent.

---

## 7. Operator-side notes (for chat)

When operator pulls a proposals file for review, the chat assistant (Claude) helps operator process it:

- Read proposals file
- Pull any LOW-confidence rows for joint inspection
- Fix wrong proposals via direct edit
- Approve to apply migration

Migration application via `Supabase:apply_migration` happens in chat per D170. After application, chat verifies coverage with a coverage query, then commits the result.

---

## 8. Out of scope (explicit list — CC must NOT do these)

1. Documenting columns in `a`, `k`, `m`, `r`, `t` schemas (other audit cycles)
2. Documenting P4-P6 columns even if encountered (defer to future brief)
3. Modifying `k.table_registry` rows (only `k.column_registry`)
4. Applying migrations directly via Supabase MCP (chat applies per D170)
5. Auto-closing F-002 in `open_findings.md` (chat closes after Phase C completes)
6. Adding RLS policies, indexes, or any DDL beyond column_purpose UPDATEs
7. Modifying the schema of `k.column_registry` itself
8. Writing column purposes for columns that are clearly deprecated (note in proposal as LOW with "appears deprecated")

---

## 9. Done criteria

Brief is complete when ALL true:

- [ ] Phase A proposals committed, reviewed, migration applied, coverage updated
- [ ] Phase B proposals committed, reviewed, migration applied, coverage updated
- [ ] Phase C proposals committed, reviewed, migration applied, coverage updated
- [ ] Final report committed at `docs/briefs/2026-04-28-f002-column-documentation-backfill-result.md`
- [ ] Coverage query shows `c` and `f` schemas at >= 50% column coverage (P1-P3 covers most business-leverage columns; P4-P6 deferred remainder still drags average)
- [ ] `open_findings.md` updated by chat to note "extended action-taken — P1-P3 backfilled via CC brief on 2026-04-28"
- [ ] No LOW-confidence proposals sitting un-reviewed (each was either operator-written or rejected)

---

## 10. Notes for CC

**Style:**
- Australian English in all prose proposals (per standing protocol)
- Column purposes are 1-3 sentences. Long enough to convey meaning, short enough to scan.
- No marketing language. State what the column DOES, not how important it is.
- For state/enum columns, list the actual valid values explicitly.
- For threshold/limit columns, state the unit (seconds vs minutes vs count vs percentage).
- For JSONB columns, describe the canonical key structure with a one-line example.

**Discipline:**
- Per Lesson #36 (today's audit closure), each migration file gets its own unique timestamped name. Don't reuse names across phases.
- Per Lesson #35 (today's audit closure), this brief itself is forward-looking — it should make NEW columns ship with column purposes via future brief patterns. Note this in the final report.

**Reference materials CC should read first:**
- `docs/audit/00_audit_loop_design.md` (audit loop architecture)
- `docs/audit/roles/data_auditor.md` (Data Auditor role)
- `docs/audit/decisions/f002_column_backfill_plan.md` (original plan that this brief executes)
- `docs/audit/runs/2026-04-28-data.md` (the run that raised F-002)
- `docs/audit/snapshots/2026-04-28.md` (the snapshot the auditor read)
- `docs/06_decisions.md` (D170 = MCP-applied migrations, D175 = versioned ref FK pattern, D177 = 0..100 fitness, D180 = discovery decides assignment)
- `docs/00_sync_state.md` (current ICE state — read first per standing protocol)

**Supabase MCP project ID:** `mbkmaxqhsohbtwsqolns`

**Repos:** `Invegent/Invegent-content-engine` (main repo for migrations + docs)

---

End of brief. Ready for CC pickup.
