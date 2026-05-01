# T13 — LinkedIn Publishers Approval Gate (TWO EF PATCHES)

**Status**: Authored, awaiting ChatGPT review
**Pattern**: Per-row in publisher loop (mirror IG; for queue-based publishers)
**Risk**: LOW each — small insertions; deployed as paired patches
**Deploy order**: 3 of 4 (after T17 + T18)

## Scope (TWO publishers, both lacking gate)

Per ChatGPT v2.6 review and confirmed via repo source pull (commit `6fe2bb1e`):

1. **`linkedin-zapier-publisher` v1.0.0 → v1.1.0** (DEPLOYED — currently active LinkedIn path; 28+ unreviewed posts published in 14d)
2. **`linkedin-publisher` v1.1.0 → v1.2.0** (REPO-ONLY — staged for B24/F06 future activation when LinkedIn Community Management API approved)

Both need same per-row gate. Patching both prevents the bug from being reintroduced when B24 happens.

## T13a — `linkedin-zapier-publisher` v1.1.0

### Diff

Locate this block in `supabase/functions/linkedin-zapier-publisher/index.ts`:

```typescript
      // Load draft
      const { data: draft } = await supabase
        .schema('m')
        .from('post_draft')
        .select('post_draft_id, draft_title, draft_body')
        .eq('post_draft_id', q.post_draft_id)
        .maybeSingle();

      if (!draft) throw new Error('post_draft_not_found');

      const title = (draft.draft_title ?? '').trim();
```

REPLACE WITH:

```typescript
      // Load draft
      // v1.1.0 (T13, 1 May 2026): added approval_status to SELECT for gate check below
      const { data: draft } = await supabase
        .schema('m')
        .from('post_draft')
        .select('post_draft_id, draft_title, draft_body, approval_status')
        .eq('post_draft_id', q.post_draft_id)
        .maybeSingle();

      if (!draft) throw new Error('post_draft_not_found');

      // v1.1.0 (T13): APPROVAL GATE (mirror IG v2.0.0 per-row pattern).
      // Publisher previously had no gate — F-PUB-005-class fix.
      // 28+ unreviewed posts published in 14d before this patch (audit T16).
      if (draft.approval_status !== 'approved') {
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'queued',
          scheduled_for: new Date(Date.now() + 60 * 60_000).toISOString(),
          last_error: `not_approved:${draft.approval_status}`,
          locked_at: null, locked_by: null,
          updated_at: nowIso(),
        }).eq('queue_id', queueId);
        results.push({ queue_id: queueId, status: 'held', reason: 'not_approved', draft_status: draft.approval_status });
        continue;
      }

      const title = (draft.draft_title ?? '').trim();
```

Also bump VERSION:

```typescript
const VERSION = 'linkedin-zapier-publisher-v1.1.0';
// v1.1.0 (T13): Approval gate added — mirror IG v2.0.0 per-row pattern.
//   Previously had NO approval gate (didn't even select approval_status).
//   28+ unreviewed posts published in 14d before this patch.
```

## T13b — `linkedin-publisher` (direct, repo-only) v1.2.0

Identical pattern. Located in `supabase/functions/linkedin-publisher/index.ts`. Locate:

```typescript
      const { data: draft, error: draftErr } = await supabase.schema("m").from("post_draft").select("post_draft_id, draft_title, draft_body").eq("post_draft_id", q.post_draft_id).maybeSingle();
      if (draftErr) throw new Error(`load_draft_failed: ${draftErr.message}`);
      if (!draft) throw new Error("post_draft_not_found");
      const title = (draft.draft_title ?? "").trim();
```

REPLACE WITH:

```typescript
      // v1.2.0 (T13): added approval_status to SELECT for gate check below
      const { data: draft, error: draftErr } = await supabase.schema("m").from("post_draft").select("post_draft_id, draft_title, draft_body, approval_status").eq("post_draft_id", q.post_draft_id).maybeSingle();
      if (draftErr) throw new Error(`load_draft_failed: ${draftErr.message}`);
      if (!draft) throw new Error("post_draft_not_found");

      // v1.2.0 (T13): APPROVAL GATE (mirror IG v2.0.0 per-row pattern).
      // Repo-only publisher prepared for B24/F06 activation when LinkedIn Community
      // Management API approved. Patched defensively so the gate is in place from
      // day-1 of activation.
      if (draft.approval_status !== 'approved') {
        await supabase.schema("m").from("post_publish_queue").update({
          status: "queued",
          scheduled_for: new Date(Date.now() + 60 * 60_000).toISOString(),
          last_error: `not_approved:${draft.approval_status}`,
          locked_at: null, locked_by: null, updated_at: nowIso(),
        }).eq("queue_id", queueId);
        results.push({ queue_id: queueId, status: "held", reason: "not_approved", draft_status: draft.approval_status });
        continue;
      }

      const title = (draft.draft_title ?? "").trim();
```

Also bump VERSION:

```typescript
const VERSION = "linkedin-publisher-v1.2.0";
// v1.2.0 (T13): Approval gate added — mirror IG v2.0.0 per-row pattern.
//   Repo-only EF; not deployed yet. Patched defensively for B24/F06 activation.
```

T13b is a **repo commit only** — no Supabase deploy needed because the EF isn't deployed. Just push to main.

## Pre-deploy verification (T13a)

Query — count LinkedIn queue rows that will be held by the new gate:

```sql
SELECT pd.approval_status, COUNT(*) AS queue_count
FROM m.post_publish_queue ppq
JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
WHERE ppq.platform = 'linkedin'
  AND ppq.status = 'queued'
GROUP BY pd.approval_status
ORDER BY queue_count DESC;
```

Expected: ~64 rows in `'approved'` (pre-25-Apr buffer per memory) plus some in `'needs_review'` (T10 P-C population).

## Smoke check (post-T13a deploy)

1. Hit `GET /linkedin-zapier-publisher` — expect version `v1.1.0`
2. Trigger manually with `{limit: 1, dry_run: true}`
3. Held rows should show `{queue_id: ..., status: 'held', reason: 'not_approved'}`
4. Approved rows should pass through to dry_run_ok as before
5. Standing check S12 query — confirm zero new published-state rows where draft was `'needs_review'` over 24h

## Rollback (T13a)

Redeploy v1.0.0 source from Supabase EF version history.

## Acceptance criteria (T13 done when)

1. Both source files updated and ChatGPT-reviewed
2. T13a deployed to Supabase as `linkedin-zapier-publisher-v1.1.0`
3. T13b committed to repo (no deploy needed)
4. `GET /linkedin-zapier-publisher` returns version `v1.1.0`
5. Pre-deploy query documented in audit run state
6. Smoke check confirms held behaviour for `needs_review` drafts
7. S12 confirms zero new `'needs_review'`-state LinkedIn published rows in 24h post-deploy
8. T16 audit kicks off (PK action, parallel)
