# T10 — Pre-Fix Queue Disposition Queries + Decision Tree

**Status**: Authored, awaiting ChatGPT round-2 review (round-1 amendments folded in)
**Type**: Disposition SQL + decision tree
**Owner**: PK executes after T08 + T13 + T18 deploy

## Round-1 amendments folded in

- **P-A status**: `'skipped'` (preferred), with `'failed'` as fallback. NOT `'dead'`.
- **P-A discovery**: counts split by `pd.approval_status` (separate `needs_review` from `rejected`) before applying disposition. Don't mix.

## Purpose

T08 fixes the auto-approver going forward. T13/T17/T18 fix the publishers going forward. But pre-existing rows produced under the broken logic still exist in `m.post_publish_queue` and `m.post_draft`. This brief identifies and disposes of those rows.

## Three populations

| Pop | Description | Discovery query | Disposition |
|---|---|---|---|
| **P-A** | IG queue rows referencing non-approved drafts (created via F-PUB-005 trigger gap) | Query A1 below | Mark queue rows `'skipped'` (or `'failed'` fallback); leave drafts alone. **NEW v2.8**: split counts by approval_status before applying |
| **P-B** | ~30 score-DESC drafts re-cycling in auto-approver fetch | Query B1 below | T08 handles via terminal rejection — no manual disposition. **NEW v2.8**: P-B snapshot in T08 brief captures these BEFORE T08 deploys |
| **P-C** | LinkedIn AND FB queue rows referencing `needs_review` drafts not yet published | Query C1 below | Hold pending T13+T18 deploy; once gates active, drafts requeue with `not_approved`; operator decides per draft |

**NOT in scope**: 64 pre-25-Apr LinkedIn `approved` queue rows. These are valid pre-starvation approvals; leave alone.

## Discovery queries

### Query A1 — P-A IG queue rows (split by approval_status, NEW v2.8)

```sql
-- Discovery first — do NOT apply disposition until counts are reviewed
SELECT pd.approval_status AS draft_status,
       COUNT(*) AS queue_count,
       MIN(ppq.created_at) AS oldest_queue_row,
       MAX(ppq.created_at) AS newest_queue_row
FROM m.post_publish_queue ppq
JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
WHERE ppq.platform = 'instagram'
  AND ppq.status = 'queued'
  AND pd.approval_status != 'approved'
GROUP BY pd.approval_status
ORDER BY queue_count DESC;
```

Expected: rows mostly with `pd.approval_status='needs_review'`. Possibly some `'rejected'` from T08 deploy.

**Decision per group**:
- `needs_review` rows: dispose with `'skipped'` status (operator agrees these are pre-fix orphans)
- `rejected` rows: dispose with `'skipped'` status (drafts are terminally rejected; queue row should follow)
- Any other state: investigate before applying disposition

### Query A2 — P-A drill-down (sample for inspection)

```sql
SELECT ppq.queue_id, ppq.post_draft_id, ppq.client_id,
  c.client_name, ppq.scheduled_for, ppq.last_error,
  pd.approval_status AS draft_status,
  pd.created_at AS draft_created
FROM m.post_publish_queue ppq
JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
JOIN c.client c ON c.client_id = ppq.client_id
WHERE ppq.platform = 'instagram'
  AND ppq.status = 'queued'
  AND pd.approval_status != 'approved'
ORDER BY ppq.created_at ASC
LIMIT 50;
```

Use this to spot-check before applying bulk disposition.

### Query B1 — P-B cycling drafts (already captured in T08 P-B snapshot)

P-B snapshot is captured pre-T08-deploy per T08 brief. This query is informational only — disposition is automatic via T08 terminal rejection.

```sql
SELECT pd.post_draft_id, pd.client_id, pd.platform,
  c.client_name, pd.created_at,
  LENGTH(pd.draft_body) AS body_chars,
  pd.draft_format->'auto_review'->>'failed_gate' AS last_failed_gate
FROM m.post_draft pd
JOIN c.client c ON c.client_id = pd.client_id
WHERE pd.approval_status = 'needs_review'
  AND pd.created_at < NOW() - INTERVAL '5 days'
ORDER BY pd.created_at ASC
LIMIT 50;
```

### Query C1 — P-C LinkedIn + FB pre-fix queue rows

```sql
SELECT ppq.platform, pd.approval_status AS draft_status,
       COUNT(*) AS queue_count
FROM m.post_publish_queue ppq
JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
WHERE ppq.platform IN ('linkedin', 'facebook')
  AND ppq.status = 'queued'
  AND pd.approval_status NOT IN ('approved', 'published')
GROUP BY 1, 2
ORDER BY 1, queue_count DESC;
```

Expected: rows that the new publisher gates would hold on next run.

## Decision tree

### For P-A IG queue rows (REVISED v2.8)

**Step 1**: Run Query A1 to get counts split by approval_status. Document in audit run state.

**Step 2**: Apply disposition per group, using `'skipped'` status:

```sql
-- Disposition for P-A rows referencing 'needs_review' drafts
UPDATE m.post_publish_queue
SET status = 'skipped',
    last_error = 'pre_fix_disposition:non_approved_draft:needs_review',
    locked_at = NULL, locked_by = NULL,
    updated_at = NOW()
WHERE queue_id IN (
  SELECT ppq.queue_id
  FROM m.post_publish_queue ppq
  JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
  WHERE ppq.platform = 'instagram'
    AND ppq.status = 'queued'
    AND pd.approval_status = 'needs_review'
);

-- Separate disposition for P-A rows referencing 'rejected' drafts (post-T08)
UPDATE m.post_publish_queue
SET status = 'skipped',
    last_error = 'pre_fix_disposition:non_approved_draft:rejected',
    locked_at = NULL, locked_by = NULL,
    updated_at = NOW()
WHERE queue_id IN (
  SELECT ppq.queue_id
  FROM m.post_publish_queue ppq
  JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
  WHERE ppq.platform = 'instagram'
    AND ppq.status = 'queued'
    AND pd.approval_status = 'rejected'
);
```

**ChatGPT round-2 review point**: confirm `'skipped'` is in the legal `m.post_publish_queue.status` enum. Source-pull evidence (instagram-publisher v2.0.0) shows `'skipped'` is used for `publish_disabled` reason. Confirms membership in legal set. If round-2 review surfaces evidence to the contrary, fall back to `'failed'`.

**Status semantic note**: `'skipped'` is preferred because these are not publisher failures — they are pre-fix contaminated rows intentionally removed from eligibility. `'failed'` would imply the publisher tried and failed; `'skipped'` correctly signals "won't process, by design".

### For P-B cycling drafts

T08 handles via terminal rejection. **No manual disposition needed.** P-B snapshot in T08 brief captures the state pre-deploy for retrospective review.

### For P-C LinkedIn + FB pre-fix queue rows

With T13/T18 deployed, these get held on next publisher run with `last_error='not_approved:<status>'`. Operator then has time to review each:

- If draft is acceptable quality: manually flip `approval_status` to `'approved'` (will be re-eligible on next publisher run)
- If draft is unacceptable: leave at `'needs_review'`; T08 will eventually move to `'rejected'`
- If draft is bulk-low-quality (e.g. all 17 Apr legacy FB stragglers): bulk dispose via similar `'skipped'` UPDATE on the queue

No bulk action required up-front. Operational time only.

## ChatGPT round-2 review questions

1. **`'skipped'` semantics confirmed?** Need definitive answer that `'skipped'` is in the legal `m.post_publish_queue.status` enum (we have weak evidence from IG publisher source).
2. **Audit row in m.post_publish?** Should T10 disposition produce its own audit row in `m.post_publish` (`status='skipped'` + reason) for each row dispositioned, or is the queue-row `last_error` field sufficient?
3. **P-C bulk vs individual?** Is per-draft operator review of P-C tractable given count? If count is large (>30), do we need a bulk-dispose-all-needs-review-older-than-N-days policy?

## Audit trail

Results to be captured in `docs/audit/runs/2026-05-01-t10-pre-fix-disposition.md` with:
- Pre-execution counts per population AND per approval_status sub-group
- Disposition SQL applied (with timestamps)
- Post-execution counts
- Operator notes for any edge cases

## Acceptance criteria (T10 done when)

1. **NEW v2.8**: All discovery queries run with results split by approval_status
2. P-A bulk disposition applied with `pre_fix_disposition` reason and `'skipped'` status (or `'failed'` if round-2 review reveals `'skipped'` not legal)
3. P-B observed rejecting on T08 next cycle (P-B snapshot already captured pre-T08-deploy)
4. P-C orphan count trends to zero as operator approves/rejects each
5. After 24h post-T08+T13+T18 deploy: zero queue rows referencing non-approved drafts on any platform
6. Audit doc committed to `docs/audit/runs/`
