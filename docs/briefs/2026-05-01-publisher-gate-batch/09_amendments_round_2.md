# Round-2 ChatGPT Review — 2 Amendments

**Date**: 2026-05-01 Friday late evening Sydney
**Reviewer**: ChatGPT (round 2)
**Verdict**: Not green-to-deploy until 2 amendments applied (one HIGH-severity semantic bug)
**Action**: Both amendments folded into briefs. Round-3 review pending.

## Summary

| # | Amendment | Affected brief | Severity |
|---|---|---|---|
| 1 | T08-A revision — SQL eligibility filter; conflated eligibility-gate with content-gate | 04 | **HIGH** |
| 2 | T10 step 0 — live constraint introspection before disposition | 07 | medium |
| — | T17, T18, T13, T09 — cleared | various | none |

## Amendment 1 — T08-A revision (HIGH)

### Issue caught

My v2.8 amendment defaulted missing per-platform config to `auto_approve_enabled=false` and logged the missing config (correct) — but then `processOneDraft()` set `approval_status='rejected'` (terminal) for ALL gate failures, including the `auto_approve_enabled` gate.

Result: drafts could be terminal-rejected because:
- no `(client_id, platform)` publish profile exists, OR
- operator has explicitly set `auto_approve_enabled=false`

"Auto-approve disabled/missing" means "do not auto-approve", NOT "content is bad; reject and reset slot." My amendment conflated these two failure modes.

Real-world impact if deployed: every draft for a (client, platform) combo without auto-approve config would be silently terminal-rejected, `trg_handle_draft_rejection` would fire, slot would reset, fresh draft would generate, fresh draft would also be terminal-rejected (same missing config), churn loop would eat slots until operator notices.

### Fix folded in

**SQL function v3** — INNER JOIN LATERAL filters at fetch time:

```sql
JOIN LATERAL (
  SELECT cpp.auto_approve_enabled
  FROM c.client_publish_profile cpp
  WHERE cpp.client_id = dr.client_id
    AND cpp.platform = pd.platform
    AND cpp.auto_approve_enabled = true   -- ELIGIBILITY filter
  ORDER BY cpp.is_default DESC NULLS LAST
  LIMIT 1
) cpp ON true
```

Drafts without explicit `auto_approve_enabled=true` config are no longer fetched. They stay at `needs_review` and are invisible to the auto-approver entirely.

**Removed**: `auto_approve_config_found` column (no longer needed; eligibility now binary at SQL).

**EF defence-in-depth** — if the `auto_approve_enabled` gate fires anyway (it shouldn't given the SQL filter), `processOneDraft` returns `outcome='skipped'` and leaves the draft at `needs_review`:

```typescript
if (failed_gate?.gate === "auto_approve_enabled") {
  console.warn(`[auto-approver] eligibility_gate_safety_net_fired:...`);
  return { ..., outcome: "skipped", reason: "eligibility_safety_net", gates };
}
// Content-gate failure → terminal reject
```

**Visibility moves** to standing observation queries (S13/S14 in action_list):
- S13: drafts where NO config row exists (gap that may need closing)
- S14: drafts where config row exists but `auto_approve_enabled=false` (intentional)

These run as standing checks at session start; not per-draft EF warnings.

**New response field** `eligibility_safety_net_fires` — should be 0 in steady state. Non-zero indicates SQL filter not working.

## Amendment 2 — T10 step 0 constraint introspection

### Issue caught

T10 brief assumed `'skipped'` was legal in `m.post_publish_queue.status` based on weak evidence (IG publisher source uses it). ChatGPT recommended live constraint check before disposition.

### Fix folded in (already executed)

Ran introspection in chat session:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'm.post_publish_queue'::regclass AND contype = 'c';

SELECT status, COUNT(*) FROM m.post_publish_queue GROUP BY status;
```

**Findings**:
- No CHECK constraint on `m.post_publish_queue.status` (column unconstrained)
- Production currently observed values: `'queued'` (142), `'published'` (91), `'dead'` (42)
- `'skipped'` is NOT in current production data — IG publisher source writes it but has never fired (no `publish_disabled` event)

**Decision**: Use `'skipped'` as primary (technically writable, semantically correct). T10 brief now includes Step 3: deploy 10-row batch first, smoke-check downstream consumer compatibility, then either apply remainder or fall back to `'dead'`.

## Round-3 review prompts

1. T08 — SQL v3 + EF defence-in-depth design — any remaining gaps?
2. T08 — Q1 post-step query ("should NOT see auto_approve_enabled here") catches regression if defence-in-depth fires unexpectedly. Sufficient?
3. T10 step 3 smoke check — sufficient to catch downstream breakage when `'skipped'` is first written?
4. Any other patches in the batch that conflate "system decision" with "operator decision" the same way T08-A did?

## Acceptance criteria (round-2 amendments done when)

1. Both amendments folded into respective briefs ✓ (this commit)
2. ChatGPT round-3 review captures any further refinements
3. Round-3 amendments folded in (if any)
4. Then: deploy micro-staged per `00_INDEX.md` sequence
