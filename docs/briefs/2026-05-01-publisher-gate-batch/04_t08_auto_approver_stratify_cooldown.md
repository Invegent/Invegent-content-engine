# T08 — Auto-Approver Stratification + Reject-Cooldown (v1.6.0)

**Status**: Authored, awaiting ChatGPT round-3 review (round-1 + round-2 amendments folded in)
**Pattern**: SQL function eligibility filter (round-2) + EF source patch (terminal rejection only for content gates)
**Risk**: MEDIUM — biggest patch of the batch. **Round-2 caught a real semantic bug**: original amendment conflated eligibility-gate failures with content-gate failures, would have terminal-rejected drafts purely because operator hadn't enabled auto-approve.
**Deploy order**: 4 of 4 (after publisher gates safe)

## Round-2 amendment summary (NEW v2.9)

ChatGPT round-2 caught: setting `approval_status='rejected'` on ALL gate failures (including the `auto_approve_enabled` gate) is wrong. "Operator hasn't enabled auto-approve" is not the same as "content quality is bad" — yet both would have hit `trg_handle_draft_rejection` and reset the slot.

**Fix**: SQL function v3 now filters at fetch time — only drafts with an EXACT `(client_id, platform)` row in `c.client_publish_profile` AND `auto_approve_enabled=true` are returned. Drafts without explicit auto-approval eligibility stay invisible to this function (remain `needs_review`, never seen by gates).

Visibility for config-gap drafts moves from per-draft EF warnings to standalone observation queries (S13/S14 standing checks in action_list).

EF gets defence-in-depth: if `auto_approve_enabled` gate fires anyway (shouldn't, given SQL filter), `processOneDraft` returns `outcome='skipped'` and leaves draft at `needs_review`.

## Round-1 amendments (already folded in v2.8)

- ~~T08-A: Platform-scoped `auto_approve_enabled` lookup with `auto_approve_config_found` flag~~ → **superseded by round-2 SQL filter**
- T08-B: Dual-field response (`auto_rejected` + deprecated `skipped_needs_human_review` alias) for backward compat
- T08-C: Staged first run protocol (`{limit: 5}`, observe, escalate)
- T08-D: P-B snapshot before deploy (must run BEFORE T08 deploy)

## Scope (D-08 narrow)

Two changes ONLY, no length-cap or keyword changes:

1. **Stratify fetch** by (client, platform) — fair-share across buckets, prevent score-DESC starvation
2. **Add reject-cooldown** — failed-CONTENT-gate drafts move to terminal `'rejected'` state. Eligibility-gate failures (operator config) leave drafts at `'needs_review'` (round-2 fix)

## Two artefacts

1. **SQL migration**: `m.auto_approver_fetch_drafts` v3 — stratification + INNER JOIN LATERAL eligibility filter
2. **EF source patch**: `auto-approver` v1.5.0 → v1.6.0 — platform field, content-gate terminal rejection, eligibility-gate skip safety net, dual-field response

## Pre-deploy step — P-B snapshot (REQUIRED)

Captures the cycling-30 state for retrospective review BEFORE T08 auto-rejects them.

```sql
WITH cycling_drafts AS (
  SELECT pd.post_draft_id, pd.client_id, pd.platform,
    c.client_name, pd.created_at, pd.updated_at,
    LENGTH(pd.draft_body) AS body_chars,
    LEFT(pd.draft_title, 100) AS title_excerpt,
    LEFT(pd.draft_body, 200) AS body_excerpt,
    pd.draft_format->'auto_review'->>'failed_gate' AS last_failed_gate,
    pd.draft_format->'auto_review'->>'reason' AS last_reason,
    pd.draft_format->'auto_review'->>'checked_at' AS last_checked
  FROM m.post_draft pd
  JOIN c.client c ON c.client_id = pd.client_id
  WHERE pd.approval_status = 'needs_review'
    AND pd.created_at < NOW() - INTERVAL '5 days'
  ORDER BY pd.created_at ASC
)
SELECT * FROM cycling_drafts;
```

Export result to `docs/audit/runs/2026-05-01-t08-pre-deploy-pb-snapshot.md` BEFORE deploying T08.

## Pre-deploy step — config gap observation (NEW v2.9, S13 + S14)

Run BEFORE deploying T08 to understand which (client, platform) combos will become invisible to auto-approver:

```sql
-- S13: drafts where NO config row exists (config GAP — may need adding)
SELECT pd.client_id, c.client_name, pd.platform, COUNT(*) AS needs_review_count
FROM m.post_draft pd
JOIN c.client c ON c.client_id = pd.client_id
LEFT JOIN c.client_publish_profile cpp
  ON cpp.client_id = pd.client_id
 AND cpp.platform = pd.platform
WHERE pd.approval_status = 'needs_review'
  AND cpp.client_id IS NULL
GROUP BY 1, 2, 3
ORDER BY needs_review_count DESC;

-- S14: drafts where config row exists BUT auto_approve_enabled=false (intentional)
SELECT pd.client_id, c.client_name, pd.platform, COUNT(*) AS needs_review_count
FROM m.post_draft pd
JOIN c.client c ON c.client_id = pd.client_id
JOIN c.client_publish_profile cpp
  ON cpp.client_id = pd.client_id
 AND cpp.platform = pd.platform
WHERE pd.approval_status = 'needs_review'
  AND COALESCE(cpp.auto_approve_enabled, false) = false
GROUP BY 1, 2, 3
ORDER BY needs_review_count DESC;
```

Expected interpretation:
- S13 results: gaps where the operator hasn't yet configured auto-approve for that platform. Decide per case: add the config row (auto-approve eligible) OR document why platform stays human-review only.
- S14 results: explicit operator decisions to keep human-review. No action needed; these stay at `needs_review` indefinitely until a human reviews them.

## Artefact 1 — SQL migration (REVISED v2.9 round-2)

**Migration name**: `2026_05_01_t08_auto_approver_fetch_drafts_v3`

```sql
-- T08 v3 (round-2 amendments): Eligibility filter at SQL level.
--   v2 (round-1) used LEFT JOIN LATERAL + auto_approve_config_found flag, but the
--   EF then terminal-rejected drafts that failed the auto_approve_enabled gate —
--   conflating eligibility (operator decision) with content quality (system decision).
--   Round-2 review caught this. Fix: only fetch drafts where exact (client, platform)
--   config row exists AND auto_approve_enabled=true. Drafts without explicit
--   eligibility stay invisible to this function.
--
-- Removed: auto_approve_config_found column (no longer needed; eligibility binary at SQL).
-- Stratification (round-1): unchanged.

CREATE OR REPLACE FUNCTION m.auto_approver_fetch_drafts(p_limit integer DEFAULT 10)
 RETURNS TABLE(
   post_draft_id uuid, client_id uuid, draft_body text, draft_title text,
   draft_format jsonb, approval_status text, digest_item_id uuid,
   final_score numeric, auto_approve_enabled boolean,
   platform text
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
      pd.platform,
      cpp.auto_approve_enabled,
      ROW_NUMBER() OVER (
        PARTITION BY dr.client_id, pd.platform
        ORDER BY di.final_score DESC NULLS LAST, pd.created_at ASC
      ) AS bucket_rank
    FROM m.post_draft pd
    JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
    JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
    JOIN LATERAL (
      SELECT cpp.auto_approve_enabled
      FROM c.client_publish_profile cpp
      WHERE cpp.client_id = dr.client_id
        AND cpp.platform = pd.platform
        AND cpp.auto_approve_enabled = true   -- v3 round-2: ELIGIBILITY filter
      ORDER BY cpp.is_default DESC NULLS LAST
      LIMIT 1
    ) cpp ON true
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

**Note**: function signature changed from v2 (dropped `auto_approve_config_found` column). EF must be redeployed in same window to consume new signature. Apply migration THEN deploy EF — the order matters because v1.5.0 EF tries to read columns that v3 still returns (auto_approve_enabled, platform) but doesn't read the dropped column either way — so v1.5.0 happens to be forward-compatible. Still: deploy both in close succession.

## Artefact 2 — EF source patch (`supabase/functions/auto-approver/index.ts`)

### Change 1: VERSION + comment

```typescript
const VERSION = "auto-approver-v1.6.0";
// v1.6.0 (T08, 1 May 2026): NARROW PATCH (D-08) + round-1 + round-2 amendments.
//   (1) Stratified fetch via m.auto_approver_fetch_drafts v3 — fair-share
//       across (client, platform) buckets to prevent F-PUB-004 starvation.
//   (2) Eligibility filter at SQL level (round-2): only drafts with explicit
//       (client, platform) auto_approve_enabled=true are fetched. Removes the
//       conflation between eligibility-gate fails and content-gate fails.
//   (3) Reject-cooldown: failed-CONTENT-gate drafts move to terminal 'rejected'.
//       Fires trg_handle_draft_rejection which resets the slot.
//   (4) Defence-in-depth: if auto_approve_enabled gate fires (should not normally,
//       given SQL filter), processOneDraft returns outcome='skipped' — NOT
//       'rejected' — leaving draft at needs_review.
//   (5) Dual-field response: returns both auto_rejected and deprecated
//       skipped_needs_human_review alias for backward compat.
//   No length-cap or keyword changes (D-08 narrow scope).
```

### Change 2: DraftRow type — add platform; drop auto_approve_config_found

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
  auto_approve_enabled: boolean;       // always true post-v3 SQL filter; defence-in-depth
  platform: string;                    // NEW v1.6.0
  // auto_approve_config_found: REMOVED v2.9 round-2 — eligibility now binary at SQL
}
```

### Change 3: ApprovalResult outcome union

```typescript
interface ApprovalResult {
  post_draft_id: string;
  client_id: string;
  outcome: "approved" | "rejected" | "skipped" | "failed";
  // approved   - passed all gates, approval_status flipped to 'approved'
  // rejected   - failed CONTENT gate, approval_status flipped to 'rejected' (terminal)
  // skipped    - failed eligibility gate (defence-in-depth, should not normally fire)
  // failed     - error state (DB error etc)
  reason?: string;
  gates?: Record<string, boolean | string>;
}
```

### Change 4: processOneDraft — distinguish gate types (round-2 fix)

Locate the existing else-branch and REPLACE WITH:

```typescript
  } else {
    // v1.6.0 round-2 fix: distinguish ELIGIBILITY-gate failures (operator decision)
    // from CONTENT-gate failures (system decision). Only content-gate failures
    // terminal-reject. Eligibility-gate failures leave draft at needs_review and
    // return outcome='skipped' as defence-in-depth (the SQL filter normally
    // prevents these from being seen at all).
    if (failed_gate?.gate === "auto_approve_enabled") {
      // Defence-in-depth only: should not fire post-v3 SQL filter
      console.warn(
        `[auto-approver] eligibility_gate_safety_net_fired:${draft.client_id}:${draft.platform}:${draft.post_draft_id}`
      );
      return {
        post_draft_id: draft.post_draft_id,
        client_id: draft.client_id,
        outcome: "skipped",
        reason: "eligibility_safety_net",
        gates,
      };
    }

    // Content-quality gate failure — terminal reject (fires trg_handle_draft_rejection)
    await supabase
      .schema("m")
      .from("post_draft")
      .update({
        approval_status: "rejected",  // terminal
        auto_approval_scores: { gates, passed: false, failed_gate: failed_gate?.gate, reason: failed_gate?.reason, checked_at: checkedAt, agent: VERSION, auto_rejected: true },
        draft_format: { ...existingFormat, auto_review: { passed: false, failed_gate: failed_gate?.gate, reason: failed_gate?.reason, gates, checked_at: checkedAt, agent: VERSION } },
        updated_at: checkedAt,
      })
      .eq("post_draft_id", draft.post_draft_id);

    return {
      post_draft_id: draft.post_draft_id,
      client_id: draft.client_id,
      outcome: "rejected",
      reason: failed_gate?.reason,
      gates,
    };
  }
```

### Change 5: POST handler — simplified (no Set aggregation needed)

Round-1 added a `missingConfigSet` for per-(client, platform) warnings. Round-2 removes that block because the SQL filter prevents these drafts from being fetched. Visibility moves to S13/S14 standing checks.

```typescript
app.post("*", async (c) => {
  try {
    const supabase = getServiceClient();
    let limit = 10;
    let filterClientId: string | null = null;

    try {
      const body = await c.req.json();
      if (typeof body?.limit === "number") limit = Math.min(body.limit, 50);
      if (typeof body?.client_id === "string") filterClientId = body.client_id;
    } catch { /* body optional */ }

    const drafts = await fetchDraftsViaRpc(supabase, limit, filterClientId);

    if (drafts.length === 0) {
      return jsonResponse({ ok: true, version: VERSION, message: "no_drafts_to_review", processed: 0, results: [] });
    }

    const results: ApprovalResult[] = [];
    for (const draft of drafts) {
      results.push(await processOneDraft(supabase, draft));
    }

    return jsonResponse({
      ok: true,
      version: VERSION,
      processed: results.length,
      approved: results.filter((r) => r.outcome === "approved").length,
      auto_rejected: results.filter((r) => r.outcome === "rejected").length,
      // Deprecated alias: sums BOTH rejected + skipped because v1.5.0 used 'skipped'
      // for any non-approval outcome. Preserves backward-compat semantic. Remove in v1.7.0.
      skipped_needs_human_review: results.filter((r) => r.outcome === "rejected" || r.outcome === "skipped").length,
      eligibility_safety_net_fires: results.filter((r) => r.outcome === "skipped").length,  // NEW v1.6.0 round-2: should be 0 in steady state
      errors: results.filter((r) => r.outcome === "failed").length,
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ ok: false, error: msg, version: VERSION }, 500);
  }
});
```

## Pre-deploy verification

### Step 1 — P-B snapshot (REQUIRED, see top of brief)

### Step 2 — Config-gap observation (NEW v2.9, S13 + S14 above)

Run S13 + S14 and document results. Operator may need to add config rows for legitimate platforms before T08 deploys (otherwise those drafts become invisible).

### Step 3 — Bucket query (informational)

```sql
SELECT dr.client_id, pd.platform, COUNT(*) AS draft_count, MIN(pd.created_at) AS oldest
FROM m.post_draft pd
JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
JOIN c.client_publish_profile cpp
  ON cpp.client_id = dr.client_id
 AND cpp.platform = pd.platform
 AND cpp.auto_approve_enabled = true
WHERE pd.approval_status = 'needs_review'
GROUP BY dr.client_id, pd.platform
ORDER BY oldest ASC;
```

This shows what the new fetch function will see. Buckets here are the AUTO-APPROVE-ELIGIBLE ones only.

## Staged first-run protocol (T08-C, unchanged)

Do not invoke with full limit on first run.

1. Apply SQL migration via `apply_migration`
2. Deploy EF v1.6.0
3. `GET /auto-approver` — confirm version `v1.6.0`
4. **First invocation: `POST {limit: 5}`**
5. Verify response: `auto_rejected`, `skipped_needs_human_review` (deprecated), `eligibility_safety_net_fires` (should be 0), `processed`, `approved`
6. Run post-step queries (Q1–Q3 below)
7. If clean: invoke with `{limit: 10}`, then let cron tick at full default
8. Document in `docs/audit/runs/2026-05-01-t08-staged-deploy.md`

## Post-step queries

### Q1 — Auto-rejection count by gate

```sql
SELECT pd.draft_format->'auto_review'->>'failed_gate' AS failed_gate,
       pd.client_id, pd.platform, COUNT(*) AS rejected_count
FROM m.post_draft pd
WHERE pd.approval_status = 'rejected'
  AND pd.draft_format->'auto_review'->>'agent' = 'auto-approver-v1.6.0'
  AND pd.updated_at > NOW() - INTERVAL '15 minutes'
GROUP BY 1, 2, 3 ORDER BY rejected_count DESC;
```

Expected: rejections by content gates only (`body_length`, `sensitive_keywords`). Should NOT see `auto_approve_enabled` here (that was round-2's whole point).

### Q2 — Slot churn

```sql
SELECT m.slot.status, m.slot.skip_reason, COUNT(*) AS slot_count
FROM m.slot
WHERE m.slot.updated_at > NOW() - INTERVAL '15 minutes'
GROUP BY 1, 2 ORDER BY slot_count DESC;
```

### Q3 — Fresh approvals across buckets (S11)

```sql
SELECT pd.platform, pd.client_id, COUNT(*) AS fresh_approval_count
FROM m.post_draft pd
WHERE pd.approval_status = 'approved'
  AND pd.updated_at > NOW() - INTERVAL '15 minutes'
GROUP BY 1, 2 ORDER BY fresh_approval_count DESC;
```

### Q4 — Safety-net check (NEW v2.9)

Response field `eligibility_safety_net_fires` should be 0 in steady state. Non-zero indicates the SQL filter is not working as intended.

## Rollback

1. EF: redeploy v1.5.0 from Supabase EF version history
2. SQL: re-apply v1 function definition (preserved in audit run state)

## Acceptance criteria (T08 done when)

1. P-B snapshot exported BEFORE deploy
2. **NEW v2.9**: S13 + S14 observation queries run; config gaps documented; legitimate gaps closed (config rows added) before deploy
3. SQL v3 migration applied via `apply_migration`
4. EF v1.6.0 deployed
5. `GET /auto-approver` returns version `v1.6.0`
6. Staged first run with `{limit: 5}` documented; post-step queries clean
7. **NEW v2.9**: `eligibility_safety_net_fires=0` confirmed in steady state
8. After 1 cron cycle: S11 shows fresh approvals across multiple (client, platform) buckets
9. After 24h: T10 P-B population confirmed terminally rejected
10. 24h churn observation captured for B22 prioritisation
