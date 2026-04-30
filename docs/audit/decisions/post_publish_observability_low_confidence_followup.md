# Post-publish observability — LOW-confidence column followup

**Status:** Backlog — awaiting joint operator + chat session
**Source:** CC pre-flight + code grep during execution of brief
`docs/briefs/post-publish-observability-column-purposes.md`, 2026-04-30
**Originating brief:** post-publish observability column-purpose population
(slot-core sibling, Tier 1)
**Related migration:** `supabase/migrations/20260430041924_audit_post_publish_observability_column_purposes.sql`
(applies the 61 HIGH-confidence rows; the 3 LOW rows below are intentionally
retained as undocumented for this followup)

---

## Why these 3 rows are deferred

The brief's stricter JSONB / platform-API rule (operator precision-point):
a column is HIGH confidence ONLY if its meaning is grounded in code that
constructs/reads it OR a markdown doc that documents it. For platform-API
fields specifically, "domain-specific platform-API knowledge required" is
a LOW-confidence trigger — the exact semantics of Facebook Graph error
code/subcode pairs and the FB-368 abuse streak counter cannot be safely
inferred from column names and type alone.

CC's grep found:
- No producer code path in `supabase/functions/publisher/` (or any other
  Edge Function) that writes any of these three columns.
- No SQL function or trigger body that constructs them.
- No markdown doc in `docs/` that defines their semantics or value space.

Per the brief: "A column gets HIGH confidence ONLY if the grep produces
a clear producer or consumer of its JSONB shape" — the same applies here
to platform-API integer fields whose values are only meaningful in the
context of the platform's API version.

---

## The 3 deferred columns (all on `m.post_publish_queue`)

### 1. `m.post_publish_queue.last_error_code`

- **Type:** integer · **Nullable:** true · **Default:** none · **FK:** none
- **Current state in DB:** column exists, **0 of 284 rows populated** (all NULL)
- **Likely meaning (UNVERIFIED):** Facebook Graph API error code from the most
  recent failed publish attempt. Graph API error responses include an integer
  `error.code` (commonly 4 = rate limit, 100 = invalid parameter, 190 =
  invalid OAuth token, 368 = action blocked / spam, etc.).
- **Why LOW:** the column is never written by `publisher/index.ts` (the
  Edge Function records only the free-text `last_error` string today); no
  producer for this column exists. The Graph error-code vocabulary is
  platform-specific and version-specific — we should not pin a
  `column_purpose` to one interpretation without operator confirmation that
  the future publisher iteration will populate it as expected.
- **Suggested next step (one of three):**
  1. **Confirm designed-but-unimplemented** — operator confirms the column
     is reserved for a future publisher iteration that splits the free-text
     `last_error` into structured (`code`, `subcode`, `message`) parts; on
     confirmation, write a column_purpose that names Facebook Graph error
     `code` with a `(currently unwritten)` qualifier.
  2. **Confirm deprecated** — column was added speculatively and never
     wired up; mark with `DEFERRED until YYYY-MM-DD: never wired,
     remove in future schema cleanup` per the audit slice 1 escape hatch.
  3. **Confirm cross-platform** — operator clarifies the column is
     platform-agnostic (LinkedIn, YouTube error codes also routed
     here) — column_purpose then names the multi-platform integer error
     code abstraction.
- **Suggested questions for PK:**
  - Is `last_error_code` reserved for the FB-Graph error code specifically,
    or intended to absorb any platform's integer error code?
  - Is there a planned publisher iteration that will populate this from
    parsed Graph error responses, or is this leftover from an early sketch?

---

### 2. `m.post_publish_queue.last_error_subcode`

- **Type:** integer · **Nullable:** true · **Default:** none · **FK:** none
- **Current state in DB:** column exists, **0 of 284 rows populated** (all NULL)
- **Likely meaning (UNVERIFIED):** Facebook Graph API `error.error_subcode`
  alongside `last_error_code`. Graph errors often carry a subcode that
  refines the primary code (e.g. code 368 + subcode 1404006 = "We
  restrict certain content because it goes against our Community Standards").
- **Why LOW:** same as `last_error_code` — no producer code, no markdown
  documentation, no observed values. Subcode semantics are platform-
  and Graph-version-specific. Resolution is paired with `last_error_code`.
- **Suggested next step:** resolve jointly with `last_error_code` in the
  same operator session.

---

### 3. `m.post_publish_queue.err_368_streak`

- **Type:** integer · **Nullable:** false · **Default:** 0 · **FK:** none
- **Current state in DB:** column exists, all 284 rows have value 0 (default)
- **Likely meaning (UNVERIFIED):** consecutive-attempts counter for
  Facebook Graph error 368 ("Action blocked" / spam-and-abuse policy)
  hits, used by some flavour of progressive-back-off when the same row
  keeps tripping the same FB anti-abuse rule. Naming is highly specific
  to one error code (368), which suggests there was a designed back-off
  policy keyed on FB-368 at some point.
- **Why LOW:** no code path increments or reads this column; no doc
  references it; default 0 is the only observed value. We can name what
  the column LOOKS LIKE it tracks but cannot cite the design.
- **Suggested next step (one of three):**
  1. **Confirm designed-but-unimplemented FB-368 back-off** — operator
     confirms the policy intent; column_purpose names FB error 368 streak
     for back-off, with a `(currently unwritten — planned)` qualifier.
  2. **Confirm deprecated** — never wired up; mark DEFERRED for later
     drop, ideally alongside `last_error_code` / `last_error_subcode`
     since they share the same not-wired state.
  3. **Confirm renamed semantics** — operator clarifies the column was
     repurposed (e.g. now tracks a generic "rate-limit streak" not tied
     to error 368 specifically); column_purpose updated accordingly and
     the column is renamed in a separate DDL migration.

---

## Related rows worth revisiting at the same time

`m.post_publish_queue.locked_by` was promoted to HIGH (well-named, paired
with `locked_at`, table_purpose explicitly mentions optimistic locking)
but is currently NULL on all 284 rows because the publisher writes
`locked_by: null` on every status update path. If the FB-368 back-off
column is confirmed as deprecated, this is a moment to ask whether
`locked_by` is also worth dropping or whether it is genuinely waiting for
multi-worker concurrency (the same situation as `m.ai_job.locked_by`,
which was documented as such in the slot-core brief).

---

## How to close this followup

In a future session, PK and chat sit together and:

1. For each of the 3 columns, decide one of:
   - Write a confident purpose (operator knowledge fills the gap).
   - Mark as DEFERRED until first use (`'DEFERRED until YYYY-MM-DD: ...'`)
     using the audit slice 1 escape hatch.
   - Mark as deprecated/vestigial if appropriate; schedule a column-drop
     migration if all three go that way.
2. Apply a small follow-up migration with the 3 UPDATEs (or a DROP COLUMN
   migration if they are deprecated together).
3. Update `docs/runtime/runs/post-publish-observability-purposes-2026-04-30T041924Z.md`
   closure note for the parent brief to reflect the 3 rows are now resolved.
4. Delete this file (its job is done).

The slot-core brief had 0 LOW rows; this trio has 3. Both within the
brief's expected 0-10 range. Forward discipline matches the F-002 Phase A/B/C
pattern: LOW rows go to followup file, never silently dropped, never
carried into a migration.
