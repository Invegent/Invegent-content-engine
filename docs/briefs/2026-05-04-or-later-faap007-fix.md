# Brief: F-AAP-007 fix — audit matrix bottleneck label backpressure-awareness (Option B)

**Status**: ready-for-apply | revised 2026-05-04 morning Sydney after pre-flight ground-truth (replaces 2026-05-03 evening version)
**Priority**: P2
**Finding ID**: F-AAP-007
**Related**: F-PUB-010 (the backpressure mechanism the matrix label must respect)
**Created**: 2026-05-03 evening (v1) | Revised 2026-05-04 morning (v2 — Option B)
**Author**: chat
**Honours**: D-01 (MCP review on sql_destructive), D-170 (chat applies migrations only), D-186 (closure-first), Lesson #51, T-MCP-11/12

---

## Why this brief was revised (v1 → v2)

v1 assumed Check 8 was a standalone function returning a fail-list, and proposed filtering cap-blocked rows out of the count. Pre-flight 2026-05-04 surfaced two corrections:

1. The check is a CTE column inside the view `audit.v_brand_platform_audit_matrix.approved_drafts_without_queue`, not a standalone function.
2. The matrix's CASE statement already labels these rows `'approved_not_queued_cap_blocked'` **without verifying the cap is actually breached.** The conflation is in the label, not the count.

v2 takes the more precise fix: keep the count factual, fix the label.

## Problem

`audit.v_brand_platform_audit_matrix` surfaces 65 (and rising) approved drafts without queue entry as of 2026-05-04 morning. Pre-flight confirmed all 65 are cap-blocked (zero genuine gaps). The matrix labels them `approved_not_queued_cap_blocked` but the CASE branch fires whenever `approved_drafts_without_queue > 0` — without checking whether `queue_ready >= max_queued_per_platform`. The label is unverified.

Operational impact: audit noise + bottleneck-attribution risk. If a genuine gap appears alongside cap-blocked rows, the matrix would still label the row's bottleneck as cap-blocked, masking the real cause.

## Proposed fix (Option B — label-level)

Rewrite the relevant branch of the matrix view's CASE statement:

```sql
-- Before (current):
WHEN (COALESCE(d.approved_drafts_without_queue, (0)::bigint) > 0)
  THEN 'approved_not_queued_cap_blocked'::text

-- After (Option B):
WHEN (
  COALESCE(d.approved_drafts_without_queue, (0)::bigint) > 0
  AND pp.max_queued_per_platform IS NOT NULL
  AND COALESCE(qs.queue_ready, (0)::bigint) >= pp.max_queued_per_platform
) THEN 'approved_not_queued_cap_blocked'::text
WHEN (COALESCE(d.approved_drafts_without_queue, (0)::bigint) > 0)
  THEN 'approved_not_queued_genuine_gap'::text
```

The `approved_drafts_without_queue` count column is unchanged.

NULL-cap behaviour: `pp.max_queued_per_platform IS NOT NULL` evaluates FALSE → cap-blocked branch skipped → falls through to genuine_gap. Q8 confirmed zero clients currently have NULL cap, but the logic handles the edge case.

cap=0 behaviour: Q9 confirmed zero clients currently have cap=0. If one were configured, queue_ready (≥0) would always be ≥ 0, and the row would label as cap-blocked — which is correct if the platform is explicitly capped to zero capacity.

## Pre-flight already complete (2026-05-04 morning)

| # | Question | Result |
|---|---|---|
| Q6 | Check 8 deployed cnt | 65 (was 56 yesterday) |
| Q7 | Backpressure-aware genuine gaps | 0 |
| Q8 | NULL cap clients | 0 |
| Q9 | cap=0 clients | 0 |

No further pre-flight needed before apply.

## Apply path (CHAT next session, at-home keyboard preferred)

A1. Final SQL: `CREATE OR REPLACE VIEW audit.v_brand_platform_audit_matrix AS ...` with full body from current deployed definition + CASE branch replaced as above.
A2. MCP review fired (action_type = `sql_destructive`).
A3. PK approves outcome of review.
A4. Chat applies via `apply_migration`.
A5. Verification (V1–V4).

Migration filename: `YYYYMMDDHHMMSS_faap007_matrix_bottleneck_backpressure_aware.sql`

## Verification (post-apply, chat)

V1. Source byte-identity preserved (Lesson #36).

V2. Other 11 audit checks unchanged in verdict (regression-detection):
- row count for the matrix view unchanged
- bottleneck label distribution shifts only across the two specific labels: `approved_not_queued_cap_blocked` and `approved_not_queued_genuine_gap`. All other labels unchanged.

V3. Re-query Q6 and Q7 — counts unchanged from pre-flight (column behaviour preserved).

V4. Sample 3 cap-blocked rows + 3 genuine-gap rows (if any) and confirm labels match by inspection.

## Honest limitations

- **No genuine gaps exist right now** (Q7=0). V4 may have to settle for cap-blocked-only validation. That's a pre-existing system state, not a fix shortcoming.
- **F-AAP-001 drain still active.** Cnt may be 70+ by apply time. Not a problem — the fix doesn't depend on the snapshot value.
- **The proper long-term answer** is probably a `queue_pending_reason` enum on `m.post_draft` populated at approval time. Out of scope for this brief; logged for future.
- **D-01 escalation likely.** View rewrites with full body reproduction tend to trigger reviewer caution. Plan for state-capture exception path per Lesson #62 type-(c) if escalation produces no new evidence.

## References

- v1 (superseded): same path, prior commit
- F-AAP-002 closure (similar fix shape): `docs/runtime/sessions/2026-05-03-faap001-002-apply.md`
- F-PUB-010 mechanism: `docs/runtime/sessions/2026-05-03-fpub005-apply.md`
- Pre-flight session note: `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md`
- MCP review protocol v2.17: `docs/runtime/mcp_review_protocol.md`
