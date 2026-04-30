---
status: ready
tier: 2
brief_type: phase_b_patch
allowed_paths:
  - supabase/migrations/
  - docs/runtime/runs/
  - docs/audit/decisions/
  - docs/briefs/queue.md
expected_questions: 0-3
expected_delta: 1 function + 1 view replaced; 0 schema changes
---

# Brief — image_quote body-health gate (Phase B patch)

## Goal

Stop `m.fill_pending_slots()` and `m.hot_breaking_pool` from selecting
canonicals whose body content was never successfully fetched, or whose
fetched body is too short to be quotable. This is the primary fix for
the 4 `exceeded_recovery_attempts` slot failures observed during Gate B
(see investigation 30 Apr Thu morning, ChatGPT-framework analysis).

## Why this is the right fix path

- **96% baseline success** for `image_quote` (97 of 101 jobs, last 7 days)
  refutes "image_quote prompt is brittle". The format works. The 4 failures
  shared one root cause: the candidate pool fed unfetched / stub canonicals.
- **9 of 12 canonicals selected across the 3 fill cycles per failed slot
  had no usable body** (7 unfetched, 2 navigation-chrome stubs).
- The selector queries `m.signal_pool sp` joined to
  `f.canonical_content_item cci` (title + URL only). It never joins
  `f.canonical_content_body`, so `fetch_status`, `extracted_text`, and
  `word_count` are invisible at fill time. This is the gap.

## Small guardrail before starting

When capturing `m.fill_pending_slots`, query by **exact function
signature**, not `proname` alone, so we do not accidentally grab the
wrong overload. Use:

```sql
SELECT pg_get_functiondef('m.fill_pending_slots(integer, boolean)'::regprocedure);
```

If that fails, or if more than one relevant overload exists, **STOP and
flag to PK**. Confirm overload count with:

```sql
SELECT proname, pg_get_function_identity_arguments(oid)
FROM pg_proc WHERE proname = 'fill_pending_slots';
```

## Exact code paths to change

Two PostgreSQL objects in the `m` schema. Both must be patched in the
same migration so they cannot drift:

### 1. `m.fill_pending_slots(integer, boolean)`
**Source-of-truth**: not source-of-truth in any current migration file
by name — function was created via earlier slot-driven migrations and
now lives only in DB. CC must:
- Capture current definition via the exact-signature query above
  (see Small guardrail).
- Add the body-health filter to the **two CTEs that build candidate pools**:
  - `candidate_pool` CTE (the standard pool)
  - `relaxed_pool` CTE inside the `IF (v_pool_health->>'health') = 'red'` branch
- Use `CREATE OR REPLACE FUNCTION` to redeploy.

The exact additions to BOTH CTEs are identical — append to the existing
WHERE block:

```sql
AND EXISTS (
  SELECT 1
  FROM f.canonical_content_body ccb
  WHERE ccb.canonical_id = sp.canonical_id
    AND ccb.fetch_status = 'success'
    AND ccb.extracted_text IS NOT NULL
    AND LENGTH(TRIM(ccb.extracted_text)) >= 200
    AND COALESCE(ccb.word_count, 0) >= 300
)
```

### 2. `m.hot_breaking_pool` view
Used by `m.try_urgent_breaking_fills()` to gate creation of urgent
`source_kind='breaking'` slots. Without this filter, breaking slots can
be inserted for canonicals that will fail body-health when
`m.fill_pending_slots` later picks them up.

Fix is identical — `CREATE OR REPLACE VIEW m.hot_breaking_pool` with
the same body-health EXISTS clause appended to the existing WHERE.

## Pre-flight (mandatory — Lesson #32)

Before drafting any SQL, CC must run and report results from:

```sql
-- 1. Confirm function exists, capture current definition by EXACT SIGNATURE.
--    Do NOT query by proname alone — that risks grabbing the wrong overload.
SELECT pg_get_functiondef('m.fill_pending_slots(integer, boolean)'::regprocedure);

-- 1a. Verify there is exactly one relevant overload.
--     If this returns >1 row, STOP and flag to PK.
SELECT proname, pg_get_function_identity_arguments(oid)
FROM pg_proc WHERE proname = 'fill_pending_slots';

-- 2. Confirm view still exists.
SELECT pg_get_viewdef('m.hot_breaking_pool'::regclass, true);

-- 3. Confirm no other objects depend on either (so rollback is clean).
SELECT DISTINCT n.nspname || '.' || c.relname AS dependent_object, c.relkind
FROM pg_depend d
JOIN pg_class c ON c.oid = d.objid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE d.refobjid IN (
  'm.hot_breaking_pool'::regclass,
  'm.fill_pending_slots(integer, boolean)'::regprocedure
)
AND n.nspname NOT IN ('pg_catalog','information_schema');
```

If pre-flight surfaces unexpected dependents (e.g. another function
that references `m.hot_breaking_pool` and expects the old shape), or
if step 1a returns more than one overload, **STOP and flag to PK**
before proceeding.

## Reproducibility — verified before brief authored

Tested filter `(fetch_status='success' AND text_len >= 200 AND word_count >= 300)`
against the 12 canonicals selected across the 3 fill cycles of the
4 failed slots:

| Threshold | Excluded (target = 9 of 12) | Passed (target = 3 of 12) |
|---|---|---|
| word_count ≥ 100 | 7 | 3 |
| word_count ≥ 200 | 8 | 3 |
| **word_count ≥ 300** | **9** ✅ | **3** ✅ |
| word_count ≥ 400 | 9 | 3 |

word_count ≥ 300 is the minimum threshold that excludes both navigation
stubs (`nds.org.au/news` 294w, `ndis.gov.au/print/pdf/node/18` 120w) while
keeping the 3 substantive canonicals (NDS Aboriginal guide 1400w, Butler
speech 3484w, Therapy pilot 437w).

CC must re-run this verification SQL post-deploy (see Acceptance) to
confirm reproducibility on the live DB.

## Pool retention impact (verified)

After filter applied:

| Client | signal_pool active | After filter | % retained |
|---|---|---|---|
| Care For Welfare | 381 | 132 | 34.6% |
| NDIS-Yarns | 381 | 132 | 34.6% |
| Property Pulse | 389 | 64 | 16.5% |
| Invegent | 155 | **13** | 8.4% |

All four are above `min_pool_size_for_format = 2` for `image_quote`. The
extreme drop for Invegent **reveals** the pre-existing thin-pool signal
already captured in D174 (26 Apr) — the filter does not cause it. Of
Invegent's 155 active signal_pool rows, 142 had no successfully fetched
body content and would never have produced usable image_quote output.

The `word_count ≥ 300` threshold drops only 0–5 additional candidates
per client beyond the basic `fetch_status='success' AND text_len ≥ 200`
filter, so the threshold choice is low-impact relative to the dominant
fetch_status check.

## Rollback plan

1. The migration captures the **prior** definitions in a comment block at
   the top (CC must paste the result of the pre-flight `pg_get_functiondef`
   and `pg_get_viewdef` queries verbatim into a `-- ROLLBACK SQL:` header
   comment).
2. To roll back: re-apply the original `CREATE OR REPLACE FUNCTION` and
   `CREATE OR REPLACE VIEW` from the rollback comment.
3. Rollback SQL must be tested in chat (apply, then re-apply rollback)
   before declaring the brief done — Lesson #34 (recovery owns dependent
   state). For a function/view this is trivial; the test is mostly to
   confirm the rollback string is valid.
4. No data migration. No state transition. No queue drain required.
   This is reversible with one apply.
5. **After rollback testing**: the patched definitions MUST be re-applied
   immediately after the rollback test, before marking the brief
   complete. Sequence:

   ```
   apply patch → confirm patch active → test rollback (apply original)
     → confirm rollback active → re-apply patch → confirm patched again
     → only then close brief
   ```

   Closure note must record the timestamps of all four state
   transitions, so the audit trail shows the patched definitions are
   the final live state.

## Post-patch observation checks (24h Gate B window)

CC closure note must specify the queries below as the 24h check protocol.
PK or chat will run them at the +24h checkpoint:

1. **No new `exceeded_recovery_attempts`** in the 24h after deploy:
   ```sql
   SELECT COUNT(*) FROM m.slot
   WHERE status='failed' AND skip_reason='exceeded_recovery_attempts'
     AND updated_at >= '<deploy_timestamp>';
   -- Target: 0
   ```

2. **ai_job shadow failure rate stays under 5%** in the 24h after deploy:
   ```sql
   SELECT
     ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('failed','dead'))
           / NULLIF(COUNT(*),0), 2) AS fail_pct
   FROM m.ai_job
   WHERE created_at >= '<deploy_timestamp>'
     AND is_shadow = true;
   -- Target: < 5%
   ```

3. **No new failures with `slot_fill_no_body_content`** error string:
   ```sql
   SELECT COUNT(*) FROM m.ai_job
   WHERE error LIKE 'slot_fill_no_body_content%'
     AND created_at >= '<deploy_timestamp>';
   -- Target: 0
   ```

4. **`slot_fill_attempt.decision='filled'` rate stays comparable to
   pre-patch** (don't want the filter to starve the resolver):
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE decision='filled') AS filled,
     COUNT(*) FILTER (WHERE skip_reason LIKE 'pool_thin%') AS pool_thin,
     COUNT(*) FILTER (WHERE skip_reason='no_eligible_evergreen') AS no_evergreen
   FROM m.slot_fill_attempt
   WHERE attempted_at >= '<deploy_timestamp>';
   ```
   If `pool_thin` skip count rises sharply for Invegent or Property Pulse,
   that's the thin-pool signal getting louder, not a filter regression —
   capture in closure note for PK.

## Acceptance criteria

- Migration filename:
  `supabase/migrations/{YYYYMMDDHHMMSS}_phase_b_patch_image_quote_body_health_gate.sql`
- Pre-flight queries run (including exact-signature lookup and
  overload-count check), dependents check clean (or escalated)
- Migration includes both function replacement AND view replacement in
  one transaction
- Rollback SQL captured at top of migration in comment block
- Patched definitions confirmed as final live state via the four-step
  rollback test sequence (Rollback plan §5)
- Post-deploy verification:
  - Re-run reproducibility query against the 12 canonicals — confirm
    9 excluded, 3 pass
  - Pool retention query — confirm CFW/NDIS/PP/Invegent counts match
    expected (132/132/64/13 ± small drift from natural pool churn)
- Closure note at
  `docs/runtime/runs/phase-b-patch-image-quote-body-health-{ISO timestamp}.md`
  per `state_file_template`, including:
  - The four +24h observation queries
  - Timestamps of all four rollback-test state transitions

## Out of scope (explicitly NOT this patch)

- **Provider diversification on retry** (Anthropic → OpenAI fallback when
  `fallback_used=false` despite `error_call=true`). Real issue, separate
  patch. Has no place in this brief — it touches different code (worker
  retry logic, not slot fill resolver). Mention in closure note as
  "follow-up candidate after 24h obs window confirms primary fix held".
- Stub-content classifier improvements (so navigation pages don't get
  classified `stat_heavy` in the first place). Upstream issue, follow-up
  brief.
- Increasing `min_pool_size_for_format` for image_quote — premature; the
  current min of 2 is fine post-filter.
- Filling Invegent's thin pool with more sources — separate strategic
  question (D174 follow-up).
- Touching ai-worker, OpenAI/Anthropic call paths, schema validators,
  prompt templates, fallback chain logic.

## Decision rule for Gate B exit (Sat 2 May)

Per PK, do **not** extend Gate B preemptively:

- **If this patch ships and the 24h shadow window post-deploy is clean
  (zero new exceeded_recovery_attempts, shadow ai_job fail rate <5%,
  no new slot_fill_no_body_content errors)** → Gate B continues toward
  Sat 2 May exit on the original schedule.
- **If the patch cannot ship before deploy window closes** → extend
  Gate B by 5–7 days OR temporarily disable image_quote at the
  format-mix layer for Phase C cutover. Decision deferred to PK at the
  +24h checkpoint.
- **If image_quote still cascades after the patch** → same fork: extend
  or disable.

CC's success criterion is the patch landing cleanly. Gate B exit
decision is PK's at +24h.
