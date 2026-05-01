# T10 — Pre-Fix Queue Disposition Queries + Decision Tree

**Status**: Authored, awaiting ChatGPT round-3 review (round-1 + round-2 amendments folded in)
**Type**: Disposition SQL + decision tree
**Owner**: PK executes after T08 + T13 + T18 deploy

## Round-2 amendment summary (NEW v2.9)

ChatGPT round-2 recommended live constraint introspection BEFORE applying T10 disposition. **Done in chat session 1 May 2026 evening**:

```sql
-- Result of constraint introspection:
-- (1) No CHECK constraint exists on m.post_publish_queue.status (column is unconstrained)
-- (2) Distinct values currently observed: 'queued' (142), 'published' (91), 'dead' (42)
-- (3) 'skipped' is NOT currently in production data — IG publisher source uses it but has
--     never written it (no publish_disabled event has fired)
```

**Decision**: Use `'skipped'` as primary (no constraint blocks it; semantically right for pre-fix orphans). Fallback to `'dead'` if any downstream consumer breaks during smoke check. **Caveat**: this is the FIRST time `'skipped'` would be written to `m.post_publish_queue` in production.

## Round-1 amendments (already folded in v2.8)

- P-A status: `'skipped'` preferred (vs `'failed'`/`'dead'`)
- P-A discovery: counts split by `pd.approval_status` before disposition

## Purpose

T08 fixes the auto-approver going forward. T13/T17/T18 fix the publishers going forward. But pre-existing rows produced under the broken logic still exist in `m.post_publish_queue` and `m.post_draft`. This brief identifies and disposes of those rows.

## Three populations

| Pop | Description | Discovery query | Disposition |
|---|---|---|---|
| **P-A** | IG queue rows referencing non-approved drafts (created via F-PUB-005 trigger gap) | Query A1 below | Mark queue rows `'skipped'`; leave drafts alone |
| **P-B** | ~30 score-DESC drafts re-cycling in auto-approver fetch | Query B1 below | T08 handles via terminal rejection — no manual disposition |
| **P-C** | LinkedIn AND FB queue rows referencing `needs_review` drafts not yet published | Query C1 below | Hold pending T13+T18 deploy; once gates active, drafts requeue with `not_approved`; operator decides per draft |

**NOT in scope**: 64 pre-25-Apr LinkedIn `approved` queue rows.

## Step 0 — Constraint introspection (NEW v2.9; already done)

Already run in chat session. Result documented above. Confirms `'skipped'` is technically writable. Move to discovery queries.

## Discovery queries

### Query A1 — P-A IG queue rows (split by approval_status)

```sql
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

Decision per group: dispose with `'skipped'` and explicit reason in `last_error`.

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

Use to spot-check before applying bulk disposition.

### Query B1 — P-B cycling drafts (informational; already captured in T08 P-B snapshot)

```sql
SELECT pd.post_draft_id, pd.client_id, pd.platform,
  c.client_name, pd.created_at,
  LENGTH(pd.draft_body) AS body_chars,
  pd.draft_format->'auto_review'->>'failed_gate' AS last_failed_gate
FROM m.post_draft pd
JOIN c.client c ON c.client_id = pd.client_id
WHERE pd.approval_status = 'needs_review'
  AND pd.created_at < NOW() - INTERVAL '5 days'
ORDER BY pd.created_at ASC LIMIT 50;
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

## Decision tree

### For P-A IG queue rows

**Step 1**: Run Query A1 to get counts split by approval_status.

**Step 2**: Apply disposition per group with `'skipped'`:

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

**Step 3 (NEW v2.9)** — Smoke check for `'skipped'` consumer compatibility:

After dispositioning a small batch first (e.g. 10 rows), verify:
- Dashboard / Retool / Next.js queues UI still loads correctly
- No publisher EF crashes when reading queue (publishers should naturally ignore `status='skipped'`)
- `m.worker_http_log` shows no errors related to `m.post_publish_queue` reads

If clean: apply remainder. If a downstream consumer breaks: ROLLBACK affected rows to original `'queued'` state and switch disposition status to `'dead'`:

```sql
-- Fallback if 'skipped' breaks downstream
UPDATE m.post_publish_queue
SET status = 'dead',
    last_error = 'pre_fix_disposition:non_approved_draft:fallback_dead'
WHERE last_error LIKE 'pre_fix_disposition:%';
```

### For P-B cycling drafts

T08 handles via terminal rejection. **No manual disposition needed.** P-B snapshot in T08 brief captures the state pre-deploy.

### For P-C LinkedIn + FB pre-fix queue rows

With T13/T18 deployed, these get held on next publisher run with `last_error='not_approved:<status>'`. Operator review per draft:

- Acceptable quality: manually flip `approval_status='approved'`
- Unacceptable: leave; T08 will eventually move to `'rejected'`
- Bulk-low-quality: similar `'skipped'` UPDATE on the queue

## ChatGPT round-3 review questions

1. After-deploy smoke check approach for `'skipped'` consumer compatibility (Step 3 above) — sufficient? Should we add anything?
2. P-C bulk vs individual review — still open. Is per-draft review tractable?
3. Audit row in `m.post_publish` for each disposition — needed, or queue-row `last_error` field sufficient?

## Audit trail

Results to be captured in `docs/audit/runs/2026-05-01-t10-pre-fix-disposition.md` with:
- Step 0 introspection result ✓ (already documented in this brief)
- Pre-execution counts per population AND per approval_status
- Disposition SQL applied (with timestamps)
- Step 3 smoke check observations
- Post-execution counts
- Operator notes for any edge cases

## Acceptance criteria (T10 done when)

1. **NEW v2.9**: Step 0 constraint introspection ✓ (done in chat session)
2. All discovery queries run with results split by approval_status
3. P-A bulk disposition applied with `pre_fix_disposition` reason and `'skipped'` status
4. **NEW v2.9**: Step 3 smoke check confirms downstream consumer compatibility (or fallback to `'dead'` applied)
5. P-B observed rejecting on T08 next cycle (snapshot captured pre-T08-deploy)
6. P-C orphan count trends to zero as operator approves/rejects each
7. After 24h post-T08+T13+T18 deploy: zero queue rows referencing non-approved drafts on any platform
8. Audit doc committed to `docs/audit/runs/`
