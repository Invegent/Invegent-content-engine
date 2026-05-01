# T18 — Facebook Publisher Approval Gate (v1.8.0)

**Status**: Authored, awaiting ChatGPT round-2 review (round-1 amendments folded in)
**Pattern**: Per-row in publisher loop (mirror IG; for queue-based publishers)
**Risk**: LOW — small insertion after existing draft load. **NEW v2.8**: gated on go/no-go FB queue-status query first; deploy may intentionally pause FB.
**Deploy order**: 2 of 4 (after T17)

## Round-1 amendment

**ChatGPT round-1 review flagged**: T18 brief said FB may not currently transit through `approval_status='approved'` explicitly. If true, T18 could pause FB publishing entirely. Made into a deploy gate rather than just a footnote.

## Diff summary

Add a per-row gate immediately after the existing `if (!draft) throw new Error("post_draft_not_found");` check. The FB publisher already SELECTs `approval_status` (verified via T15 source pull); only needs the `if (draft.approval_status !== 'approved')` check + held-requeue logic.

Mirror IG v2.0.0 pattern exactly: requeue 60min, `status='queued'`, `last_error='not_approved:<status>'`, no `post_publish` row.

VERSION bumps from `publisher-v1.7.0` to `publisher-v1.8.0`. Comment block at top explaining gate restoration.

## NEW v2.8 — Pre-deploy go/no-go check (REQUIRED before deploy)

Run this query against production:

```sql
SELECT pd.approval_status, COUNT(*) AS queue_count
FROM m.post_publish_queue ppq
JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
WHERE ppq.platform = 'facebook'
  AND ppq.status = 'queued'
GROUP BY pd.approval_status
ORDER BY queue_count DESC;
```

Decision tree:

- **Mostly `'approved'`**: deploy T18 as planned. No production impact expected.
- **Mostly `'needs_review'`**: STOP. Acknowledge that T18 will intentionally pause FB publishing until T08/upstream approval flow produces approved rows. Document the intentional pause in `docs/audit/runs/`. Then deploy with eyes open.
- **Mostly `'published'` or other terminal states**: investigate. The query should not return many of these in `status='queued'` rows. Indicates queue-cleanup hygiene gap; address separately before T18.
- **FB intended to bypass approval**: STOP. Architectural decision required before deploying T18. Open a new decision (D-12 or similar) and don't deploy until resolved.

## Patch (insertion after existing draft load)

Locate this existing block in `supabase/functions/publisher/index.ts`:

```typescript
      const { data: draft, error: draftErr } = await supabase.schema("m").from("post_draft")
        .select("post_draft_id, draft_title, draft_body, approval_status, image_url, image_status, recommended_format, approved_at")
        .eq("post_draft_id", q.post_draft_id).maybeSingle();
      if (draftErr) throw new Error(`load_draft_failed: ${draftErr.message}`);
      if (!draft) throw new Error("post_draft_not_found");

      const title = (draft.draft_title ?? "").trim();
```

INSERT this block between `if (!draft) throw...` and `const title = ...`:

```typescript
      // v1.8.0 (T18, 1 May 2026): APPROVAL GATE (mirror IG v2.0.0 per-row pattern).
      // FB publisher previously had no gate — F-PUB-005-class fix.
      // Holds non-approved drafts in queue with cooldown; no post_publish row created.
      if (draft.approval_status !== 'approved') {
        await supabase.schema("m").from("post_publish_queue").update({
          status: "queued",
          scheduled_for: new Date(Date.now() + 60 * 60_000).toISOString(),
          last_error: `not_approved:${draft.approval_status}`,
          locked_at: null, locked_by: null,
          updated_at: nowIso(),
        }).eq("queue_id", queueId);
        results.push({ queue_id: queueId, status: "held", reason: "not_approved", draft_status: draft.approval_status });
        continue;
      }
```

Also update the VERSION constant near top of file:

```typescript
const VERSION = "publisher-v1.8.0";
// v1.8.0 (T18): Approval gate added — mirror IG v2.0.0 per-row pattern.
//   Previously selected approval_status but never checked. F-PUB-005-class fix.
// v1.7.0: Schedule-aware publishing
// v1.6.0: Organic carousel
```

## FB-specific note

FB's data flow doesn't transit `'approved'` state explicitly — drafts move from `'needs_review'` to `'published'` via the publisher's existing post-publish update. So in the steady state, this gate only matters if a draft is ever explicitly rejected or held. The gate is semantically correct (the architecture relied on it but it was never written) and prevents future surprise — e.g. if FB introduces a manual review step.

**However**: the T15 data showed all 47 published FB drafts in last 14d have `approval_status='published'`. We don't know what the value was AT publish time. The go/no-go query above clarifies the real state of the queue right now.

## Smoke check (post-deploy)

1. Hit `GET /publisher` — expect `{ok: true, version: 'publisher-v1.8.0'}`
2. Wait next FB cron tick OR trigger manually with `{limit: 1, dry_run: true}`
3. If any held rows expected, response should show `{queue_id: ..., status: 'held', reason: 'not_approved'}`
4. Standing check S12 query — confirm zero published-state rows where draft was `'needs_review'` going forward

## Rollback

Redeploy v1.7.0 source (in Supabase EF version history) — single click.

## Acceptance criteria (T18 done when)

1. Source updated and ChatGPT round-2-reviewed
2. **NEW v2.8**: Go/no-go query run; result documented in audit run state with deploy decision
3. Deployed to Supabase as v1.8.0 (or intentionally paused per go/no-go decision)
4. `GET /publisher` returns version `v1.8.0`
5. Test draft with `approval_status='needs_review'` confirmed held with `not_approved:needs_review` (smoke check)
6. S12 standing check confirms compliance over 24h
