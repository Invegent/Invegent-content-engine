# T08 — Auto-Approver Stratification + Reject-Cooldown (v1.6.0)

**Status**: Authored, awaiting ChatGPT review
**Pattern**: SQL function update (stratify) + EF source patch (terminal rejection)
**Risk**: MEDIUM — biggest patch of the batch; affects core approval flow
**Deploy order**: 4 of 4 (after publisher gates safe)

## Scope (D-08 narrow)

Two changes ONLY, no length-cap or keyword changes:

1. **Stratify fetch** by (client, platform) — fair-share across buckets, prevent score-DESC starvation
2. **Add reject-cooldown** — failed-gate drafts move to terminal `'rejected'` state with `auto_approval_scores.rejection_reason`, instead of staying at `'needs_review'` and re-entering top-N every cycle

No length cap changes. No keyword list changes. Those are upstream/per-client config concerns (B22).

## Two artefacts

1. **SQL migration**: `m.auto_approver_fetch_drafts` v2 — adds platform column + stratification
2. **EF source patch**: `auto-approver` v1.5.0 → v1.6.0 — adds DraftRow.platform, sets `'rejected'` on gate fail

## Artefact 1 — SQL migration

**Migration name**: `2026_05_01_t08_auto_approver_fetch_drafts_v2`

```sql
-- T08 v2: Stratified fetch across (client_id, platform) buckets.
-- v1 selected score-DESC + created_at ASC, which caused starvation (F-PUB-004):
-- the same 30 drafts cycled through fetch top-30 every 10min for 5 days,
-- failing all gates each cycle. v2 interleaves by bucket rank so other
-- (client, platform) combos are visible.
--
-- New return column: pd.platform (was implicit in dr.client_id alone).

CREATE OR REPLACE FUNCTION m.auto_approver_fetch_drafts(p_limit integer DEFAULT 10)
 RETURNS TABLE(
   post_draft_id uuid, client_id uuid, draft_body text, draft_title text,
   draft_format jsonb, approval_status text, digest_item_id uuid,
   final_score numeric, auto_approve_enabled boolean,
   platform text  -- NEW v2
 )
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'm', 'c', 'public'
AS $function$
  WITH ranked AS (
    SELECT
      pd.post_draft_id,
      dr.client_id,
      pd.draft_body,
      pd.draft_title,
      pd.draft_format,
      pd.approval_status,
      pd.digest_item_id,
      di.final_score,
      COALESCE((
        SELECT cpp.auto_approve_enabled
        FROM c.client_publish_profile cpp
        WHERE cpp.client_id = dr.client_id
        LIMIT 1
      ), false) AS auto_approve_enabled,
      pd.platform,
      ROW_NUMBER() OVER (
        PARTITION BY dr.client_id, pd.platform
        ORDER BY di.final_score DESC NULLS LAST, pd.created_at ASC
      ) AS bucket_rank
    FROM m.post_draft pd
    JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
    JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
    WHERE pd.approval_status = 'needs_review'
  )
  SELECT
    post_draft_id, client_id, draft_body, draft_title, draft_format,
    approval_status, digest_item_id, final_score, auto_approve_enabled, platform
  FROM ranked
  ORDER BY bucket_rank ASC, final_score DESC NULLS LAST, post_draft_id
  LIMIT p_limit;
$function$;
```

**Apply via**: Supabase MCP `apply_migration` (NOT `supabase db push`)

## Artefact 2 — EF source patch (`supabase/functions/auto-approver/index.ts`)

### Change 1: VERSION + comment

```typescript
const VERSION = "auto-approver-v1.6.0";
// v1.6.0 (T08, 1 May 2026): NARROW PATCH (D-08).
//   (1) Stratified fetch via m.auto_approver_fetch_drafts v2 — fair-share
//       across (client, platform) buckets to prevent F-PUB-004 starvation.
//   (2) Reject-cooldown: failed-gate drafts move to terminal 'rejected'
//       state instead of staying at 'needs_review' and re-cycling forever.
//       This also fires trg_handle_draft_rejection which resets the slot
//       to pending_fill (allowing a fresh draft to be generated).
//   No length-cap or keyword changes (D-08 narrow scope).
```

### Change 2: DraftRow type — add platform

```typescript
interface DraftRow {
  post_draft_id: string;
  client_id: string;
  draft_body: string;
  draft_title: string | null;
  draft_format: Record<string, unknown> | null;
  approval_status: string;
  digest_item_id: string;
  final_score: number | null;
  auto_approve_enabled: boolean | null;
  platform: string;  // NEW v1.6.0 — added for observability + future filtering
}
```

### Change 3: processOneDraft — terminal rejection on gate fail

Locate the existing else-branch in `processOneDraft`:

```typescript
  } else {
    await supabase
      .schema("m")
      .from("post_draft")
      .update({
        auto_approval_scores: { gates, passed: false, failed_gate: failed_gate?.gate, reason: failed_gate?.reason, checked_at: checkedAt, agent: VERSION },
        draft_format: { ...existingFormat, auto_review: { passed: false, failed_gate: failed_gate?.gate, reason: failed_gate?.reason, gates, checked_at: checkedAt, agent: VERSION } },
        updated_at: checkedAt,
      })
      .eq("post_draft_id", draft.post_draft_id);

    return { post_draft_id: draft.post_draft_id, client_id: draft.client_id, outcome: "skipped", reason: failed_gate?.reason, gates };
  }
```

REPLACE WITH:

```typescript
  } else {
    // v1.6.0 (T08): set approval_status='rejected' (terminal) on gate fail.
    // Previous behaviour kept draft at 'needs_review' which caused the same
    // 30 drafts to re-cycle through fetch top-N every 10min — F-PUB-004 starvation.
    // Setting 'rejected' fires trg_handle_draft_rejection which resets the slot
    // to pending_fill so a fresh draft can be generated for that signal.
    await supabase
      .schema("m")
      .from("post_draft")
      .update({
        approval_status: "rejected",  // NEW v1.6.0: terminal state
        auto_approval_scores: { gates, passed: false, failed_gate: failed_gate?.gate, reason: failed_gate?.reason, checked_at: checkedAt, agent: VERSION, auto_rejected: true },
        draft_format: { ...existingFormat, auto_review: { passed: false, failed_gate: failed_gate?.gate, reason: failed_gate?.reason, gates, checked_at: checkedAt, agent: VERSION } },
        updated_at: checkedAt,
      })
      .eq("post_draft_id", draft.post_draft_id);

    return { post_draft_id: draft.post_draft_id, client_id: draft.client_id, outcome: "rejected", reason: failed_gate?.reason, gates };  // outcome was "skipped"
  }
```

### Change 4: Result-counting field name (POST endpoint)

Update the response to use the new outcome name:

```typescript
    return jsonResponse({
      ok: true,
      version: VERSION,
      processed: results.length,
      approved: results.filter((r) => r.outcome === "approved").length,
      auto_rejected: results.filter((r) => r.outcome === "rejected").length,  // NEW v1.6.0 (was skipped_needs_human_review)
      errors: results.filter((r) => r.outcome === "failed").length,
      results,
    });
```

## Pre-deploy verification

Query — current starvation state (the F-PUB-004 fingerprint):

```sql
-- How many distinct (client, platform) buckets do drafts in 'needs_review' span?
SELECT dr.client_id, pd.platform, COUNT(*) AS draft_count, MIN(pd.created_at) AS oldest
FROM m.post_draft pd
JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
WHERE pd.approval_status = 'needs_review'
GROUP BY dr.client_id, pd.platform
ORDER BY oldest ASC;
```

Expected: multiple buckets, with oldest entries from before 25 Apr. The stratified fetch will surface drafts from each bucket in next cycle.

## Smoke check (post-deploy, after migration applied)

1. Hit `GET /auto-approver` — expect `{ok: true, version: 'auto-approver-v1.6.0'}`
2. Trigger manually with `{limit: 30}`
3. Response should show `auto_rejected` field (replacing `skipped_needs_human_review`)
4. Wait for next cron tick (~10 min) — confirm new approvals appearing across multiple (client, platform) buckets in S11
5. Standing check S11 — expect non-zero `approved` rows for CFW IG, Invegent IG, LinkedIn within 1 cycle

## Interaction with `trg_handle_draft_rejection`

When a draft moves to `'rejected'` via T08, `trg_handle_draft_rejection` fires:
- If draft has `slot_id`: resets the slot to `pending_fill` (or marks slot `'skipped'` after 2 rejections)
- This means the slot can be re-filled with a fresh draft

**Concern to flag for ChatGPT review**: this could create churn — auto-rejected drafts repeatedly get replaced with new drafts that may also fail the same gate. Mitigation: B22 (ai-worker prompt cap enforcement) addresses this upstream. T08 alone doesn't prevent the churn loop.

## Rollback

1. EF: redeploy v1.5.0 from Supabase EF version history
2. SQL: re-apply the v1 function definition (preserved here for safety):

```sql
CREATE OR REPLACE FUNCTION m.auto_approver_fetch_drafts(p_limit integer DEFAULT 10)
 RETURNS TABLE(post_draft_id uuid, client_id uuid, draft_body text, draft_title text, draft_format jsonb, approval_status text, digest_item_id uuid, final_score numeric, auto_approve_enabled boolean)
 LANGUAGE sql SECURITY DEFINER SET search_path TO 'm', 'c', 'public'
AS $function$
  SELECT pd.post_draft_id, dr.client_id, pd.draft_body, pd.draft_title, pd.draft_format,
    pd.approval_status, pd.digest_item_id, di.final_score,
    COALESCE((SELECT cpp.auto_approve_enabled FROM c.client_publish_profile cpp WHERE cpp.client_id = dr.client_id LIMIT 1), false) AS auto_approve_enabled
  FROM m.post_draft pd
  JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
  JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
  WHERE pd.approval_status = 'needs_review'
  ORDER BY di.final_score DESC NULLS LAST, pd.created_at ASC
  LIMIT p_limit;
$function$;
```

## Acceptance criteria (T08 done when)

1. SQL migration applied via `apply_migration`
2. EF v1.6.0 deployed
3. `GET /auto-approver` returns version `v1.6.0`
4. Pre-deploy bucket query documented
5. After 1 cron cycle: S11 shows fresh approvals across multiple (client, platform) buckets
6. After 24h: T10 P-B population (cycling-30) confirmed terminally rejected (no longer in `needs_review`)
7. Churn-rate observation captured for B22 prioritisation
