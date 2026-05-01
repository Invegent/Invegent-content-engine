# T08 — Auto-Approver Stratification + Reject-Cooldown (v1.6.0)

**Status**: Authored, awaiting ChatGPT round-4 review (round-1 + round-2 + **round-3** amendments folded in)
**Pattern**: SQL function authoritative-profile eligibility filter (round-3) + EF defence-in-depth (round-2) + reject-cooldown for content gates only
**Risk**: MEDIUM — biggest patch of the batch. **Three consecutive HIGH-severity catches on T08-A across three review rounds** — see meta-pattern note below.
**Deploy order**: 4 of 4 (after publisher gates safe)

## Meta-pattern note (v2.10)

T08-A has had **three HIGH-severity catches in three review rounds**:
- **Round 1**: platform-scoped lookup risk — `LIMIT 1` without platform filter could pull arbitrary platform's auto_approve setting after stratification
- **Round 2**: eligibility-vs-content gate conflation — terminal-rejecting drafts on the operator-decision `auto_approve_enabled` gate would have caused churn loops
- **Round 3**: authoritative-profile bypass — `auto_approve_enabled=true` filter inside lateral subquery WHERE could match a non-default/inactive profile, contradicting the publisher's actual selection logic

Lesson signal: **"narrow" patches that touch terminal-decision authority (reject + slot-reset triggers) require extra scrutiny because any underlying bug gets amplified by the terminal action.** Captured as Lesson #51 candidate.

## Round-3 amendment summary

ChatGPT round-3 found that v2.9 SQL had a bypass:

```sql
-- v2.9 (BUGGY):
JOIN LATERAL (
  SELECT cpp.auto_approve_enabled
  FROM c.client_publish_profile cpp
  WHERE cpp.client_id = dr.client_id
    AND cpp.platform = pd.platform
    AND cpp.auto_approve_enabled = true   -- in inner WHERE: matches ANY enabled row
  ORDER BY cpp.is_default DESC NULLS LAST
  LIMIT 1
) cpp ON true
```

Bypass: if a client has multiple profile rows for the same (client, platform), this could match a non-default or non-active row that has `auto_approve_enabled=true`, even if the row the publisher would actually use has `auto_approve_enabled=false`.

Fix (v3 → v4 SQL): select the authoritative active+default profile FIRST (matching publisher selection logic), then check the flag in JOIN ON:

```sql
-- v2.10 (FIXED):
JOIN LATERAL (
  SELECT cpp.client_publish_profile_id, cpp.auto_approve_enabled
  FROM c.client_publish_profile cpp
  WHERE cpp.client_id = dr.client_id
    AND cpp.platform = pd.platform
    AND cpp.status = 'active'    -- match publisher logic
  ORDER BY cpp.is_default DESC NULLS LAST, cpp.created_at DESC NULLS LAST
  LIMIT 1
) cpp ON COALESCE(cpp.auto_approve_enabled, false) = true   -- check flag on AUTHORITATIVE row only
```

This aligns auto-approver eligibility source with publisher destination/profile source. Verified against publisher source (FB/IG/LinkedIn-Zapier all select profile by `status='active' ORDER BY is_default DESC LIMIT 1`).

**Schema verified in chat session**: `c.client_publish_profile` has all required columns (`status` text, `is_default` boolean, `created_at` timestamptz, `auto_approve_enabled` boolean NOT NULL default false).

## Round-1 + Round-2 amendments (already folded in v2.8/v2.9)

- T08-B: Dual-field response (`auto_rejected` + deprecated `skipped_needs_human_review` alias)
- T08-C: Staged first run protocol (`{limit: 5}`, observe, escalate)
- T08-D: P-B snapshot before deploy
- Round-2: SQL eligibility filter at fetch (no longer terminal-rejects on operator-decision gate); EF defence-in-depth `outcome='skipped'` for safety-net; visibility moves to S13/S14 standing checks; new response field `eligibility_safety_net_fires`

## Scope (D-08 narrow — with T08-A complexity acknowledgment)

Two changes ONLY, no length-cap or keyword changes:

1. **Stratify fetch** by (client, platform) — prevent score-DESC starvation
2. **Reject-cooldown** — failed-CONTENT-gate drafts move to terminal `'rejected'`. Eligibility-gate failures don't terminate (round-2 fix; round-3 strengthens eligibility check to authoritative profile)

## Two artefacts

1. **SQL migration**: `m.auto_approver_fetch_drafts` v4 (round-3) — stratification + authoritative-profile eligibility filter
2. **EF source patch**: `auto-approver` v1.5.0 → v1.6.0 (no changes from round-2 — EF design is unchanged; only SQL changed in round-3)

## Pre-deploy step — P-B snapshot (REQUIRED, unchanged from v2.9)

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

Export to `docs/audit/runs/2026-05-01-t08-pre-deploy-pb-snapshot.md` BEFORE deploy.

## Pre-deploy step — config gap observation (S13 + S14)

Unchanged from v2.9. Run BEFORE deploy.

```sql
-- S13: drafts where NO config row exists
SELECT pd.client_id, c.client_name, pd.platform, COUNT(*) AS needs_review_count
FROM m.post_draft pd
JOIN c.client c ON c.client_id = pd.client_id
LEFT JOIN c.client_publish_profile cpp
  ON cpp.client_id = pd.client_id AND cpp.platform = pd.platform
WHERE pd.approval_status = 'needs_review' AND cpp.client_id IS NULL
GROUP BY 1, 2, 3 ORDER BY 4 DESC;

-- S14: drafts where authoritative active profile has auto_approve_enabled=false
-- v2.10 round-3 amendment: aligns S14 with new eligibility logic (authoritative profile)
SELECT pd.client_id, c.client_name, pd.platform, COUNT(*) AS needs_review_count
FROM m.post_draft pd
JOIN c.client c ON c.client_id = pd.client_id
JOIN LATERAL (
  SELECT cpp.auto_approve_enabled
  FROM c.client_publish_profile cpp
  WHERE cpp.client_id = pd.client_id
    AND cpp.platform = pd.platform
    AND cpp.status = 'active'
  ORDER BY cpp.is_default DESC NULLS LAST, cpp.created_at DESC NULLS LAST
  LIMIT 1
) auth_cpp ON true
WHERE pd.approval_status = 'needs_review'
  AND COALESCE(auth_cpp.auto_approve_enabled, false) = false
GROUP BY 1, 2, 3 ORDER BY 4 DESC;
```

## Artefact 1 — SQL migration v4 (REVISED v2.10 round-3)

**Migration name**: `2026_05_01_t08_auto_approver_fetch_drafts_v4`

```sql
-- T08 v4 (round-3 amendments): Authoritative-profile eligibility filter.
-- v3 (round-2) put auto_approve_enabled=true inside the lateral subquery WHERE,
-- which could match any enabled row for the (client, platform) — not necessarily
-- the active+default row the publisher would use. Round-3 catch.
--
-- v4 fix: select the authoritative profile first (status='active' ORDER BY
-- is_default DESC, created_at DESC), then check auto_approve_enabled=true on
-- THAT row in the JOIN ON clause. This aligns auto-approver eligibility source
-- with publisher destination/profile source.
--
-- Stratification (round-1) and EF defence-in-depth (round-2): unchanged.

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
      -- v4 round-3: select AUTHORITATIVE profile first (matches publisher logic),
      -- then check auto_approve_enabled in the JOIN ON clause
      SELECT cpp.client_publish_profile_id, cpp.auto_approve_enabled
      FROM c.client_publish_profile cpp
      WHERE cpp.client_id = dr.client_id
        AND cpp.platform = pd.platform
        AND cpp.status = 'active'
      ORDER BY cpp.is_default DESC NULLS LAST, cpp.created_at DESC NULLS LAST
      LIMIT 1
    ) cpp ON COALESCE(cpp.auto_approve_enabled, false) = true
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

**Apply via**: Supabase MCP `apply_migration`.

**Note on COALESCE**: `auto_approve_enabled` is `NOT NULL DEFAULT false` per schema verification, so the COALESCE is technically redundant. Kept as defence-in-depth against any future schema migration that relaxes the NOT NULL constraint. Cost is zero; clarity benefit is non-zero.

## Artefact 2 — EF source patch (UNCHANGED from v2.9 round-2)

The EF design is unchanged from round-2. Round-3 fix is SQL-only. EF v1.6.0 source includes:

- VERSION + comment block (round-2)
- DraftRow type with `platform` field
- `ApprovalResult.outcome` union: `"approved" | "rejected" | "skipped" | "failed"`
- `processOneDraft` distinguishes content-gate (terminal reject) from eligibility-gate safety net (outcome `'skipped'`, no termination)
- POST handler returns dual-field response + `eligibility_safety_net_fires` counter

[Full EF source unchanged from v2.9 brief — see git history for `04_t08_auto_approver_stratify_cooldown.md` v2.9 commit `c4d5bb53`]

## Staged first-run protocol (round-3 addition: response capture)

Unchanged plan + new requirement to preserve full responses in audit run state:

1. Apply SQL migration v4 via `apply_migration`
2. Deploy EF v1.6.0
3. `GET /auto-approver` — confirm version
4. **First invocation: `POST {limit: 5}`** — **NEW v2.10**: capture full response JSON to audit run state, specifically preserving `eligibility_safety_net_fires` value
5. Run post-step queries (Q1–Q4)
6. If clean: invoke with `{limit: 10}` — **NEW v2.10**: capture full response JSON
7. If still clean: let cron tick
8. Document in `docs/audit/runs/2026-05-01-t08-staged-deploy.md` with both response captures inline

**Why response capture matters**: Q1 catches content-gate regressions but the `auto_approve_enabled` safety-net path returns `skipped` (no rejected draft row written). Only the response field exposes safety-net fires. Both observability surfaces are needed.

## Post-step queries (unchanged from v2.9)

Q1, Q2, Q3, Q4 as in v2.9 brief.

**Round-3 reinforcement of Q1**: must show ZERO `auto_approve_enabled` rejections in `m.post_draft.draft_format->'auto_review'->>'failed_gate'`. Any non-zero value indicates either:
- defence-in-depth fired (also shows in `eligibility_safety_net_fires`), or
- v2.9 logic regressed somehow (shouldn't be possible after v4 SQL but verify)

## Rollback (unchanged)

1. EF: redeploy v1.5.0 from Supabase EF version history
2. SQL: re-apply v1 function definition

## Acceptance criteria (T08 done when)

1. P-B snapshot exported BEFORE deploy
2. S13 + S14 observation queries run; config gaps documented; legitimate gaps closed before deploy
3. SQL v4 migration applied via `apply_migration`
4. EF v1.6.0 deployed
5. `GET /auto-approver` returns version `v1.6.0`
6. **NEW v2.10**: Full `{limit: 5}` and `{limit: 10}` responses captured in audit run state
7. `eligibility_safety_net_fires=0` in steady state (any non-zero treated as alert)
8. Q1 shows no `auto_approve_enabled` rejections in `m.post_draft.draft_format` (round-3 specific)
9. After 1 cron cycle: S11 shows fresh approvals across multiple (client, platform) buckets
10. After 24h: T10 P-B population confirmed terminally rejected
11. 24h churn observation captured for B22 prioritisation
