# T08 — Auto-Approver Stratification + Reject-Cooldown (v1.6.0)

**Status**: Authored, awaiting ChatGPT round-2 review (4 amendments folded in)
**Pattern**: SQL function update (stratify) + EF source patch (terminal rejection)
**Risk**: MEDIUM — biggest patch of the batch; affects core approval flow. **NEW v2.8**: 4 amendments from round-1 review.
**Deploy order**: 4 of 4 (after publisher gates safe)

## Round-1 amendments folded in

- **T08-A**: Platform-scoped `auto_approve_enabled` lookup with `auto_approve_config_found` flag and EF Set-aggregated warnings (PK-confirmed semantics)
- **T08-B**: Dual-field response (`auto_rejected` + deprecated `skipped_needs_human_review` alias) for backward compat
- **T08-C**: Staged first run protocol (`{limit: 5}`, observe, escalate)
- **T08-D**: P-B snapshot before deploy (must run BEFORE T08 deploy, captures cycling-30 state for retrospective review)

## Scope (D-08 narrow)

Two changes ONLY, no length-cap or keyword changes:

1. **Stratify fetch** by (client, platform) — fair-share across buckets, prevent score-DESC starvation
2. **Add reject-cooldown** — failed-gate drafts move to terminal `'rejected'` state, instead of staying at `'needs_review'` and re-entering top-N every cycle

No length cap changes. No keyword list changes. Those are upstream/per-client config concerns (B22).

## Two artefacts

1. **SQL migration**: `m.auto_approver_fetch_drafts` v2 — stratification + platform-scoped auto_approve lookup + config-found flag
2. **EF source patch**: `auto-approver` v1.5.0 → v1.6.0 — platform field, terminal rejection, dual-field response, Set-aggregated config warnings

## Pre-deploy step — P-B snapshot (NEW v2.8)

**REQUIRED before deploying T08.** Captures the cycling-30 state for retrospective review.

```sql
-- T08-D: P-B snapshot — the cycling drafts that T08 will auto-reject
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

Export result to `docs/audit/runs/2026-05-01-t08-pre-deploy-pb-snapshot.md` BEFORE deploying T08. Each draft retrievable later by `post_draft_id` if operator wants to review individually after T08 auto-rejects.

## Artefact 1 — SQL migration (REVISED v2.8)

**Migration name**: `2026_05_01_t08_auto_approver_fetch_drafts_v2`

```sql
-- T08 v2 (round-1 amendments): Stratified fetch + platform-scoped auto_approve lookup
--   + config-found flag for visible warnings on missing per-platform profile rows.
-- Replaces v1 which: (a) ordered by score-DESC + created_at ASC, causing F-PUB-004
--                       starvation (same 30 drafts cycling); (b) looked up auto_approve_enabled
--                       across all of a client's profiles indiscriminately, which after
--                       stratification by platform becomes unsafe (could pull arbitrary platform).
--
-- New behaviour:
--   - PARTITION BY (client_id, platform) for fair-share fetch
--   - LEFT JOIN LATERAL for platform-specific auto_approve_enabled (NULL = not configured)
--   - auto_approve_config_found boolean tells the EF whether config was missing
--     (so EF can emit one aggregated warning per (client, platform) per run)

CREATE OR REPLACE FUNCTION m.auto_approver_fetch_drafts(p_limit integer DEFAULT 10)
 RETURNS TABLE(
   post_draft_id uuid, client_id uuid, draft_body text, draft_title text,
   draft_format jsonb, approval_status text, digest_item_id uuid,
   final_score numeric, auto_approve_enabled boolean,
   platform text,
   auto_approve_config_found boolean  -- NEW v2: TRUE if exact (client, platform) profile row exists
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
      (cpp.client_id IS NOT NULL) AS auto_approve_config_found,
      ROW_NUMBER() OVER (
        PARTITION BY dr.client_id, pd.platform
        ORDER BY di.final_score DESC NULLS LAST, pd.created_at ASC
      ) AS bucket_rank
    FROM m.post_draft pd
    JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
    JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
    LEFT JOIN LATERAL (
      SELECT cpp.client_id, cpp.auto_approve_enabled
      FROM c.client_publish_profile cpp
      WHERE cpp.client_id = dr.client_id
        AND cpp.platform = pd.platform
      ORDER BY cpp.is_default DESC NULLS LAST
      LIMIT 1
    ) cpp ON true
    WHERE pd.approval_status = 'needs_review'
  )
  SELECT
    post_draft_id, client_id, draft_body, draft_title, draft_format,
    approval_status, digest_item_id, final_score,
    COALESCE(auto_approve_enabled, false) AS auto_approve_enabled,
    platform,
    auto_approve_config_found
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
// v1.6.0 (T08, 1 May 2026): NARROW PATCH (D-08) + round-1 amendments.
//   (1) Stratified fetch via m.auto_approver_fetch_drafts v2 — fair-share
//       across (client, platform) buckets to prevent F-PUB-004 starvation.
//   (2) Reject-cooldown: failed-gate drafts move to terminal 'rejected'
//       state. Fires trg_handle_draft_rejection which resets the slot.
//   (3) Platform-scoped auto_approve_enabled lookup (T08-A): SQL function v2
//       returns auto_approve_enabled per (client, platform) only. If no exact
//       config row, defaults false and emits one aggregated warning per run.
//   (4) Dual-field response (T08-B): returns both auto_rejected and deprecated
//       skipped_needs_human_review alias for backward compat.
//   No length-cap or keyword changes (D-08 narrow scope).
```

### Change 2: DraftRow type — add platform + config-found

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
  platform: string;                    // NEW v1.6.0
  auto_approve_config_found: boolean;  // NEW v1.6.0 (T08-A)
}
```

### Change 3: POST handler — Set-aggregated config warnings (T08-A)

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

    // T08-A: emit one aggregated warning per (client, platform) per run
    // when auto_approve config row is missing for that combo.
    const missingConfigSet = new Set<string>();
    for (const draft of drafts) {
      if (!draft.auto_approve_config_found) {
        const key = `${draft.client_id}:${draft.platform}`;
        if (!missingConfigSet.has(key)) {
          console.warn(`[auto-approver] missing_auto_approve_profile:${draft.client_id}:${draft.platform}`);
          missingConfigSet.add(key);
        }
      }
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
      auto_rejected: results.filter((r) => r.outcome === "rejected").length,                       // NEW v1.6.0 (T08-B)
      skipped_needs_human_review: results.filter((r) => r.outcome === "rejected").length,         // T08-B: deprecated alias for backward compat; remove in v1.7.0
      errors: results.filter((r) => r.outcome === "failed").length,
      missing_config_warnings: Array.from(missingConfigSet),                                       // T08-A: surfaces config gaps
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ ok: false, error: msg, version: VERSION }, 500);
  }
});
```

### Change 4: processOneDraft — terminal rejection on gate fail

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

    return { post_draft_id: draft.post_draft_id, client_id: draft.client_id, outcome: "rejected", reason: failed_gate?.reason, gates };
  }
```

### Change 5: ApprovalResult outcome union

Update the type to include `rejected`:

```typescript
interface ApprovalResult {
  post_draft_id: string;
  client_id: string;
  outcome: "approved" | "rejected" | "failed";  // was "approved" | "skipped" | "failed"
  reason?: string;
  gates?: Record<string, boolean | string>;
}
```

## Pre-deploy verification

### Step 1 — P-B snapshot (REQUIRED, see top of this brief)

### Step 2 — Bucket query (informational)

```sql
SELECT dr.client_id, pd.platform, COUNT(*) AS draft_count, MIN(pd.created_at) AS oldest
FROM m.post_draft pd
JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
WHERE pd.approval_status = 'needs_review'
GROUP BY dr.client_id, pd.platform
ORDER BY oldest ASC;
```

Expected: multiple buckets, with oldest entries from before 25 Apr.

## Staged first-run protocol (T08-C)

**REQUIRED — do not invoke with full limit on first run.**

1. Apply SQL migration via Supabase MCP `apply_migration`
2. Deploy EF v1.6.0 via Supabase EF dashboard
3. Hit `GET /auto-approver` — confirm version `v1.6.0`
4. **First invocation: `POST {limit: 5}`** — NOT 30
5. Capture response. Expected fields: `auto_rejected`, `skipped_needs_human_review` (deprecated alias), `missing_config_warnings`, `processed`, `approved`
6. Run post-step queries below. Compare to expected ranges
7. If clean: invoke with `{limit: 10}`. Run post-step queries again
8. If still clean: let normal cron tick at full default limit
9. Document staged-run observations in `docs/audit/runs/2026-05-01-t08-staged-deploy.md`

## Post-step queries

### Q1 — Auto-rejection count by gate

```sql
SELECT
  pd.draft_format->'auto_review'->>'failed_gate' AS failed_gate,
  pd.client_id, pd.platform,
  COUNT(*) AS rejected_count
FROM m.post_draft pd
WHERE pd.approval_status = 'rejected'
  AND pd.draft_format->'auto_review'->>'agent' = 'auto-approver-v1.6.0'
  AND pd.updated_at > NOW() - INTERVAL '15 minutes'
GROUP BY 1, 2, 3
ORDER BY rejected_count DESC;
```

### Q2 — Slot churn observation

```sql
SELECT
  m.slot.status, m.slot.skip_reason,
  COUNT(*) AS slot_count
FROM m.slot
WHERE m.slot.updated_at > NOW() - INTERVAL '15 minutes'
GROUP BY 1, 2
ORDER BY slot_count DESC;
```

Looking for: `pending_fill` (slot reset, refill incoming) vs `skipped` (2nd rejection, no further refill). Excessive `pending_fill` would indicate churn loop; B22 prioritisation signal.

### Q3 — Fresh approvals across buckets (S11 standing check)

```sql
SELECT pd.platform, pd.client_id, COUNT(*) AS fresh_approval_count
FROM m.post_draft pd
WHERE pd.approval_status = 'approved'
  AND pd.updated_at > NOW() - INTERVAL '15 minutes'
GROUP BY 1, 2
ORDER BY fresh_approval_count DESC;
```

Expected: non-zero counts across multiple (client, platform) buckets after stratification kicks in.

## Rollback

1. EF: redeploy v1.5.0 from Supabase EF version history
2. SQL: re-apply v1 function definition (preserved in audit run state)

## Acceptance criteria (T08 done when)

1. **NEW v2.8**: P-B snapshot exported to audit run state BEFORE deploy
2. SQL migration applied via `apply_migration`
3. EF v1.6.0 deployed
4. `GET /auto-approver` returns version `v1.6.0`
5. **NEW v2.8**: Staged first run with `{limit: 5}` documented; post-step queries clean
6. **NEW v2.8**: `missing_config_warnings` field captured — if any (client, platform) appears, decide: add config row OR document why platform is intentionally not auto-approved
7. After 1 cron cycle: S11 shows fresh approvals across multiple (client, platform) buckets
8. After 24h: T10 P-B population (cycling-30) confirmed terminally rejected
9. **NEW v2.8**: 24h churn observation captured: rejected-then-refilled-and-rejected-again rate. If high, prioritise B22
