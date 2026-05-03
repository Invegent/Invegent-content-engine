# Brief: F-AAP-007 fix — audit Check 8 backpressure-blindness

**Status**: ready-for-night-job (read-only + migration draft) | apply gated on MCP review next chat session
**Priority**: P2
**Finding ID**: F-AAP-007
**Related**: F-AAP-002 (same fix shape), F-PUB-010 (the backpressure mechanism Check 8 must respect)
**Created**: 2026-05-03 evening Sydney
**Author**: chat
**Honours**: D-01 (MCP review on sql_destructive), D-170 (chat applies migrations only), D-186 (closure-first), Lesson #51 (pre-flight discipline), Lesson #62 type-(c) (consistency-bias awareness)

---

## Problem

Audit Check 8 (`approved_drafts_missing_queue_entry`) returns approved drafts which have no corresponding `m.post_publish_queue` entry. As of 2026-05-03 evening, fail cnt = 56 and growing as the F-AAP-001 drain continues.

The check is correct in intent but blind to F-PUB-010 hard-cap backpressure. When a (client, platform) queue is at or over `max_queued_per_platform`, the publisher legitimately holds approved drafts out of the queue. These holdings are not "missing entries" — they are deliberate backpressure. Surfacing them as findings creates audit noise and obscures genuine queue gaps.

This is the same shape of fix as F-AAP-002 (audit Check 7 v4-compat) but applied to F-PUB-010 logic surface.

---

## Cowork execution scope

**IN SCOPE for night job**:
- All pre-flight steps PF1–PF5 (read-only)
- Drafting the migration file with placeholder column names filled in from PF1/PF2 results
- Writing the pre-flight report at `docs/audit/runs/2026-05-04-faap007-preflight.md`

**OUT OF SCOPE for night job**:
- Applying the migration (chat-only per D-170)
- Firing MCP review (chat-only per D-01)
- Any modifications to `m.post_publish_queue`, `m.post_draft`, `c.client_publish_profile`

If any pre-flight reveals an unexpected schema shape (function doesn't exist where expected, column names differ from assumptions), STOP and write findings to the pre-flight report. Do not improvise the migration.

---

## Pre-flight (read-only, night-job-runnable)

**PF1**. Locate the Check 8 function definition. Search both:
- `supabase/migrations/` for the most recent CREATE OR REPLACE for `approved_drafts_missing_queue_entry` (or whatever the actual function name is)
- Live database via `pg_get_functiondef(oid)`

Report: function name, schema, current definition, source migration filename, return signature.

**PF2**. Locate the F-PUB-010 backpressure mechanism. Confirm the column name for the per-(client, platform) cap. Likely candidates: `max_queued_per_platform` on `c.client_publish_profile`. Verify by querying `information_schema.columns` for any column matching `%queued%` or `%cap%` in c/m schemas.

Report: table, column name, data type, default value, current values per active client.

**PF3**. Confirm current Check 8 fail-list shape. Run the existing check function and capture all 56+ rows. Save raw output to `docs/audit/runs/2026-05-04-faap007-preflight.md`. Group by (client, platform) and count.

**PF4**. Compute expected post-fix cnt. For each row in PF3, evaluate whether (client, platform) is at or over the cap. Rows at-or-over-cap will be filtered out by the fix; remaining rows are genuine gaps. Report: expected post-fix cnt, breakdown by genuine-vs-backpressure.

**PF5** (surprise pre-flight per Lesson #51 / F-AAP-002 precedent). Are there any (client, platform) combos where Check 8 surfaces drafts BUT cap = NULL or cap = 0? These are edge cases the fix must handle. NULL cap = no cap configured = treat as no backpressure (row is genuinely missing, should still surface). Cap = 0 = effectively disabled platform — the draft probably shouldn't have been approved in the first place; flag separately.

---

## Proposed fix (DRAFT, do not apply)

Migration filename: `YYYYMMDDHHMMSS_faap007_check8_backpressure_aware.sql`

Placeholder SQL pending pre-flight confirmation of exact identifiers:

```sql
CREATE OR REPLACE FUNCTION <schema>.<check8_function>()
RETURNS TABLE(...) -- match existing signature, capture in PF1
LANGUAGE sql
STABLE
AS $$
  WITH backpressure AS (
    SELECT
      cpp.client_id,
      cpp.platform,
      cpp.max_queued_per_platform,
      (SELECT count(*) FROM m.post_publish_queue q
        WHERE q.client_id = cpp.client_id
          AND q.platform = cpp.platform
          AND q.status = 'queued') AS current_depth
    FROM c.client_publish_profile cpp
    WHERE cpp.publish_enabled = true
  )
  SELECT
    d.draft_id,
    d.client_id,
    d.platform,
    d.approved_at
  FROM m.post_draft d
  LEFT JOIN m.post_publish_queue q
    ON q.draft_id = d.draft_id
  LEFT JOIN backpressure b
    ON b.client_id = d.client_id
   AND b.platform = d.platform
  WHERE d.approval_status = 'approved'
    AND q.queue_id IS NULL
    -- Exclude rows held out by F-PUB-010 backpressure
    AND NOT (
      b.max_queued_per_platform IS NOT NULL
      AND b.current_depth >= b.max_queued_per_platform
    );
$$;
```

NULL-cap behaviour traced through three-valued logic: if `max_queued_per_platform IS NULL`, the inner `AND` evaluates to FALSE (first conjunct false), `NOT(FALSE)` = TRUE, and the row passes the WHERE filter — surfaced as a genuine gap. This matches the desired semantics (NULL cap = no backpressure).

Final SQL must be drafted with the actual column/function names from PF1+PF2. If pre-flight reveals different identifiers or signature, the migration must be revised before commit.

---

## Apply path (CHAT next session)

A1. Pre-flight reports PF1–PF5 reviewed by PK
A2. Final SQL committed with confirmed identifiers
A3. MCP review fired (action_type = `sql_destructive`)
A4. PK approves outcome of review
A5. Chat applies via `apply_migration`
A6. Verification (V1–V4)

---

## Verification (post-apply, chat)

**V1**. Source byte-identity preserved: migration file in repo == migration applied to DB (per Lesson #36)

**V2**. Other 11 audit checks unchanged in verdict (regression-detection)

**V3**. Check 8 cnt drops from 56+ to expected post-fix cnt from PF4

**V4**. Sample 3 genuine-gap rows that survived the filter — confirm they are real backpressure-independent gaps (not edge cases the filter should have caught)

---

## Honest limitations

- **Count predictions are guidance, not contracts.** F-AAP-002 brief expected criterion #1 cnt=0; actual reconciled to cnt=2. Same risk applies here. PF4's prediction is a sanity-check anchor, not a pass/fail gate.
- **F-AAP-001 drain continues**, so Check 8 fail cnt is moving upward. PF3 captures a snapshot; the actual fail cnt at apply time will be higher. Fix correctness doesn't depend on the snapshot value.
- **Pre-flight may reveal Lesson #62 type-(c) territory.** If MCP review escalation in A3 produces a corrected_action with no new measurable evidence (only consistency-bias restatement), apply state-capture exception with PK explicit approval, same pattern as F-AAP-002.
- **The "right" long-term answer** might be a status field on `m.post_draft` like `queue_pending_backpressure` rather than computing backpressure inside the audit check. That would isolate concerns. This brief takes the pragmatic short-term path; the longer refactor is a separate decision.
- **Audit-cycle compounding**: F-AAP-007 itself was discovered during F-AAP-002 verification, not during the B-AUDIT-V4-PEERS audit pass. The fix here may surface another finding during its own verification. That's expected and healthy — log it, don't extend scope mid-flight.

---

## References

- F-AAP-002 closure (same fix shape): `docs/runtime/sessions/2026-05-03-faap001-002-apply.md`
- F-PUB-010 mechanism: `docs/runtime/sessions/2026-05-03-fpub005-apply.md`
- B-AUDIT-V4-PEERS audit: `docs/audit/runs/2026-05-03-baudit-v4-peers.md`
- MCP review protocol v2.17: `docs/runtime/mcp_review_protocol.md`
- Lesson #62 type-(c) and state-capture exception: applied during F-AAP-002 — see session note above
