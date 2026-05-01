# Round-4 Confirmation — Publishers Independent of T08

**Date**: 2026-05-01 Friday late evening Sydney
**Status**: Authored under D-01; awaiting ChatGPT round-4 quick yes/no
**Question for ChatGPT**: "Do you confirm that T17 / T18 / T13 are functionally independent of T08 and remain cleared, allowing them to deploy without T08?"

## Summary

Per PK's B+C plan: ship the cleared publisher gates without further delay; hold T08 for focused adversarial review. This brief documents the analytical case that T17 / T18 / T13 are independent of T08.

## Functional independence analysis

### T17 (YouTube publisher)

- **Reads**: `m.post_draft` directly with `.eq('approval_status', 'approved')` (fetch-time filter)
- **Does NOT call**: `m.auto_approver_fetch_drafts` (the function T08 modifies)
- **Does NOT touch**: `c.client_publish_profile.auto_approve_enabled`
- **Shared state with T08**: `m.post_draft.approval_status` only — publishers READ, auto-approver WRITES

Result: T17 is functionally independent.

### T18 (Facebook publisher)

- **Reads**: `m.post_publish_queue` (locked rows), then `m.post_draft.approval_status` per-row
- **Does NOT call**: `m.auto_approver_fetch_drafts`
- **Does NOT touch**: `c.client_publish_profile.auto_approve_enabled`
- **Shared state**: `m.post_draft.approval_status` only

Result: T18 is functionally independent. Plus go/no-go pre-deploy check is intact regardless of T08 status.

### T13 (LinkedIn Zapier + LinkedIn direct)

- **Reads**: `m.post_publish_queue` via `m.publisher_lock_queue_v2` RPC, then `m.post_draft.approval_status`
- **Does NOT call**: `m.auto_approver_fetch_drafts`
- **Does NOT touch**: `c.client_publish_profile.auto_approve_enabled`
- **Shared state**: `m.post_draft.approval_status` only

Result: T13 is functionally independent.

## Cross-impact considerations

### Q1. Could publisher gate behaviour change with T08 deployed vs not?

**No.** Publishers only check `approval_status='approved'` (boolean). They don't care HOW the draft got approved (auto-approver, human review, manual SQL update, future migration).

### Q2. Could T08 deployment break in-flight publisher queue rows?

**No.** T08 only changes auto-approver behaviour (`m.auto_approver_fetch_drafts` SQL function and `auto-approver` EF). Doesn't modify queue rows directly. Doesn't change any column on `m.post_publish_queue`.

### Q3. Could T08 reject-cooldown affect what's in the queue?

**Indirect, but safe.** When T08 deploys, content-gate failures move drafts to `'rejected'` and fire `trg_handle_draft_rejection`, which resets the corresponding slot to `pending_fill`. If a publisher queue row references that draft, the publisher gate (post-T18/T17/T13) already holds it on next run with `last_error='not_approved:rejected'`. T10 disposition handles cleanup. **No publisher-level fault**.

### Q4. With T08 held, what is the steady-state behaviour?

Auto-approver continues running v1.5.0 (the broken one). Cycling-30 starvation continues. Some drafts get approved sporadically (when content gates happen to pass on the specific drafts in the cycling pool) plus human review. Approval rate is lower than post-T08 but non-zero.

T13 publisher (post-deploy) holds non-approved rows with cooldown; LinkedIn may soft-pause after the 64 pre-25-Apr `'approved'` queue rows drain. **Soft-pause is safer than continuing to publish unreviewed content**.

### Q5. Is there any deployment ordering requirement between T17/T18/T13 and T08?

**No.** The patches are independent. Deploy order T17 → T18 → T13 micro-staged is per the publisher-gate batch sequencing logic (smallest first, with go/no-go on T18). T08 deploys later, in its own focused review window.

## Architectural confirmation

**Decoupling is the right architecture choice** because:
- Publisher gates are CONSUMER-side defence (Lesson #46): they protect the user-facing outcome regardless of producer behaviour
- Auto-approver is a PRODUCER-side fix: it shapes what the producer (auto-approver) writes to `approval_status`
- These two concerns are addressed by separate patches by design; coupling their deploys would be the architectural error

## Question for ChatGPT round-4 (publisher confirmation only)

Given the above analysis: do T17 / T18 / T13 patches remain cleared for deploy without T08, given the patches are functionally independent and publisher gates are CONSUMER-side defence?

## If confirmation is YES

Proceed to micro-staged deploy:
1. T17 YouTube (smallest)
2. T18 Facebook (after go/no-go query)
3. T13 LinkedIn Zapier + LinkedIn direct repo patch

T08 review continues separately under brief `12_t08_adversarial_review_prompt.md`.

## If confirmation is NO

Document the dependency ChatGPT identifies. Re-evaluate B+C plan.
