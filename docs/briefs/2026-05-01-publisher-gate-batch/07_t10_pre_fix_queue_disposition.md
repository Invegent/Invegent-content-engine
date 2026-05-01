# T10 — Pre-Fix Queue Disposition Queries + Decision Tree

**Status**: Authored, awaiting ChatGPT review
**Type**: Disposition SQL + decision tree
**Owner**: PK executes after T08 + T13 + T18 deploy

## Purpose

T08 fixes the auto-approver going forward. T13/T17/T18 fix the publishers going forward. But pre-existing rows produced under the broken logic still exist in `m.post_publish_queue` and `m.post_draft`. This brief identifies and disposes of those rows.

## Three populations

| Pop | Description | Discovery query | Disposition |
|---|---|---|---|
| **P-A** | IG queue rows referencing `needs_review` drafts (created via F-PUB-005 trigger gap) | Query A1 below | Mark queue rows terminal; leave drafts alone |
| **P-B** | ~30 score-DESC drafts re-cycling in auto-approver fetch (17 Apr legacy FB stragglers + 25 Apr LinkedIn over-cap) | Query B1 below | Operator decides per draft (publish / re-score / skip / mark terminal) |
| **P-C** | LinkedIn AND FB queue rows referencing `needs_review` drafts not yet published | Query C1 below | Hold pending T13+T18 deploy; once gates active, drafts requeue with `not_approved`; operator decides per draft |

**NOT in scope**: 64 pre-25-Apr LinkedIn `approved` queue rows. These are valid pre-starvation approvals; leave alone (publisher will publish them as approved drafts in normal flow).

## Discovery queries

### Query A1 — P-A IG queue rows

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
ORDER BY ppq.created_at ASC;
```

Expected: rows mostly with `pd.approval_status='needs_review'`, possibly some `'rejected'` from T08 deploy.

### Query B1 — P-B cycling drafts

```sql
-- The drafts that have been failing auto-approver gates for 5+ days
SELECT pd.post_draft_id, pd.client_id, pd.platform,
  c.client_name, pd.created_at,
  LENGTH(pd.draft_body) AS body_chars,
  pd.draft_format->'auto_review'->>'failed_gate' AS last_failed_gate,
  pd.draft_format->'auto_review'->>'reason' AS last_reason
FROM m.post_draft pd
JOIN c.client c ON c.client_id = pd.client_id
WHERE pd.approval_status = 'needs_review'
  AND pd.created_at < NOW() - INTERVAL '5 days'
ORDER BY pd.created_at ASC
LIMIT 50;
```

Expected: ~30 rows, with last_failed_gate showing `body_length` or `sensitive_keywords`.

### Query C1 — P-C LinkedIn + FB pre-fix queue rows

```sql
SELECT ppq.queue_id, ppq.platform, ppq.post_draft_id, ppq.client_id,
  c.client_name, ppq.status, ppq.scheduled_for,
  pd.approval_status AS draft_status,
  LENGTH(pd.draft_body) AS body_chars
FROM m.post_publish_queue ppq
JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
JOIN c.client c ON c.client_id = ppq.client_id
WHERE ppq.platform IN ('linkedin', 'facebook')
  AND ppq.status = 'queued'
  AND pd.approval_status NOT IN ('approved', 'published')
ORDER BY ppq.platform, ppq.created_at ASC;
```

Expected: rows that the new publisher gates would hold on next run.

## Decision tree

### For P-A IG queue rows

Most are stale needs_review rows. Disposition: mark queue rows terminal (`'failed'` with reason), leave drafts at `'needs_review'` (T08 will eventually move them to `'rejected'` if they hit gates again, or operator can review individually).

```sql
-- P-A disposition: mark queue rows terminal
UPDATE m.post_publish_queue
SET status = 'failed',
    last_error = 'pre_t13_disposition:queue_orphan_needs_review',
    locked_at = NULL, locked_by = NULL,
    updated_at = NOW()
WHERE queue_id IN (
  SELECT ppq.queue_id
  FROM m.post_publish_queue ppq
  JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
  WHERE ppq.platform = 'instagram'
    AND ppq.status = 'queued'
    AND pd.approval_status != 'approved'
);
```

**ChatGPT review point**: should we use `'failed'` or `'dead'` status? `'failed'` allows future requeue if needed; `'dead'` is more clearly terminal. Per memory item #36 the convention is to preserve audit trail; `'failed'` with explicit reason seems cleaner.

### For P-B cycling drafts

These fail auto-approver gates. With T08 deployed, they'll move to `'rejected'` on next cycle automatically. **No manual action needed** — T08 handles the disposition through the new reject-cooldown mechanism.

Optional: operator can pre-emptively move the cycling-30 to `'rejected'` to skip waiting for T08's next cycle, but this is just acceleration. Recommended: let T08 do it.

### For P-C LinkedIn + FB pre-fix queue rows

With T13/T18 deployed, these get held on next publisher run with `last_error='not_approved:<status>'`. Operator then has time to review each:

- If draft is acceptable quality: manually flip `approval_status` to `'approved'` (will be re-eligible on next publisher run)
- If draft is unacceptable: leave at `'needs_review'`; T08 may eventually move to `'rejected'`

No bulk action needed. Operational time only.

## ChatGPT review questions

1. Is `'failed'` or `'dead'` the right terminal queue status for P-A?
2. Should P-A include rows where `pd.approval_status='rejected'` (post-T08 fresh rejections), or only `'needs_review'`?
3. P-B disposition — let T08 handle, or pre-emptively reject to accelerate?
4. P-C — is operator-by-operator review tractable given count, or do we need a bulk policy?
5. Counter-question: should T10 disposition produce its own audit row in `m.post_publish` for each row dispositioned, or is a single audit doc sufficient?

## Audit trail

Results to be captured in `docs/audit/runs/2026-05-01-t10-pre-fix-disposition.md` with:
- Pre-execution counts per population
- Disposition SQL applied (with timestamps)
- Post-execution counts
- Operator notes for any edge cases

## Acceptance criteria (T10 done when)

1. All three discovery queries run and counts documented
2. P-A bulk disposition applied with `pre_t13_disposition` reason
3. P-B observed rejecting on T08 next cycle (or pre-emptively rejected per operator decision)
4. P-C orphan count trends to zero as operator approves/rejects each
5. After 24h post-T08+T13+T18 deploy: zero queue rows referencing non-approved drafts on any platform
6. Audit doc committed to `docs/audit/runs/`
