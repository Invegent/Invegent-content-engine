# T08 — Auto-Approver Stratification + Reject-Cooldown (v1.6.0)

**Status**: Authored, awaiting ChatGPT round-5 light review (round-1 + round-2 + round-3 + **round-4-T08** amendments folded in)
**Pattern**: SQL v5 (round-4-T08: three-level deterministic tie-break) + EF defence-in-depth (round-2) + reject-cooldown for content gates only
**Risk**: MEDIUM — biggest patch of the batch. **Four consecutive HIGH-severity catches on T08-A.** Lesson #51 confirmed.
**Deploy order**: 4 of 4 (after publisher gates safe, after B28 confirmation, after Path A or B chosen)

## Round-4-T08 amendment summary (v2.12)

ChatGPT round-4-T08 successfully constructed a bad state showing v4 has a forward-defence gap: two active profiles for same (client, platform), `created_at DESC` picks the newer-but-disabled-by-intent row.

**Critical**: live guard against production shows the bad state is NOT currently reachable — every (client, platform) has exactly ONE active profile. Amendment is forward-defence, not current-bug-fix.

**Three changes folded in**:
1. **v5 SQL**: add `client_publish_profile_id DESC` as final deterministic tie-break
2. **Pre-deploy guard query** (REQUIRED before deploy)
3. **Recommended Path B**: UPDATE NULL `is_default` to `true` on sole-active profiles before deploy (data hygiene)

Full amendment details in `13_amendments_round_4_t08.md`.

## Earlier round amendments (cumulative)

- T08-A round 1: platform-scoped lookup (superseded by round-2)
- T08-B round 1: dual-field response (auto_rejected + deprecated alias)
- T08-C round 1: staged first run protocol
- T08-D round 1: P-B snapshot before deploy
- Round 2: SQL eligibility filter at fetch (eliminates eligibility/content gate conflation)
- Round 3: authoritative-profile selection (matches publisher logic)
- Round 4-T08: deterministic tie-break + pre-deploy guard + recommended data hygiene UPDATE

## Pre-deploy step 0 — Path A or B decision (NEW v2.12)

PK chooses:
- **Path A**: document current state as safe and proceed (12 NULL-default profiles flagged by guard but no duplicates exist; v5 SQL deterministic regardless)
- **Path B (RECOMMENDED)**: apply UPDATE to set `is_default=true` on NULL profiles where sole-active. Guard returns 0 rows. Cleaner.

## Pre-deploy step 1 — P-B snapshot (REQUIRED, unchanged)

See earlier rounds; export to `docs/audit/runs/2026-05-01-t08-pre-deploy-pb-snapshot.md`.

## Pre-deploy step 2 — Config gap observation S13 + S14 (REQUIRED, unchanged)

See `13_amendments_round_4_t08.md` for the queries (using authoritative-profile lateral pattern).

## Pre-deploy step 3 — Duplicate/ambiguity guard (NEW v2.12, REQUIRED)

Full query in `13_amendments_round_4_t08.md`. Path A: document non-zero rows as safe. Path B: apply UPDATE first, expect 0 rows.

## Pre-deploy step 4 — B28 operator intent confirmation (REQUIRED, unchanged)

PK confirms CFW IG / Invegent IG / CFW FB are intentionally auto-approve enabled (or flips them to false).

## Artefact 1 — SQL migration v5 (REVISED v2.12 round-4-T08)

**Migration name**: `2026_05_01_t08_auto_approver_fetch_drafts_v5`

```sql
-- T08 v5 (round-4-T08 amendments): three-level deterministic tie-break.
-- v4 (round-3) used ORDER BY is_default DESC NULLS LAST, created_at DESC NULLS LAST,
-- which is non-deterministic if two rows tie on both. Round-4-T08 catch: created_at
-- as a business-authority rule is stable but not intent. Need a final deterministic
-- tie-break.
--
-- v5 fix: add cpp.client_publish_profile_id DESC as final tie-break. Solves
-- nondeterminism. Operator intent capture remains a Path B (data hygiene) and B29
-- (partial unique constraint) concern.

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
      pd.post_draft_id, dr.client_id, pd.draft_body, pd.draft_title, pd.draft_format,
      pd.approval_status, pd.digest_item_id, di.final_score, pd.platform,
      cpp.auto_approve_enabled,
      ROW_NUMBER() OVER (
        PARTITION BY dr.client_id, pd.platform
        ORDER BY di.final_score DESC NULLS LAST, pd.created_at ASC
      ) AS bucket_rank
    FROM m.post_draft pd
    JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
    JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
    JOIN LATERAL (
      SELECT cpp.client_publish_profile_id, cpp.auto_approve_enabled
      FROM c.client_publish_profile cpp
      WHERE cpp.client_id = dr.client_id
        AND cpp.platform = pd.platform
        AND cpp.status = 'active'
      ORDER BY cpp.is_default DESC NULLS LAST,
               cpp.created_at DESC NULLS LAST,
               cpp.client_publish_profile_id DESC   -- v5 round-4-T08: deterministic tie-break
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

## Artefact 2 — EF source patch (UNCHANGED from v2.9 round-2)

No changes from round-2 EF design. Only SQL changed in round-3 and round-4-T08. EF v1.6.0 source as captured in v2.9 brief.

## Staged first-run protocol (unchanged from v2.10)

See earlier rounds. Capture full responses for `{limit: 5}` and `{limit: 10}`. Verify `eligibility_safety_net_fires=0`.

## Post-step queries (unchanged)

Q1–Q4 from earlier rounds.

## Rollback (unchanged)

EF: redeploy v1.5.0. SQL: re-apply v1 function definition.

## Acceptance criteria (T08 done when)

1. Round-5 ChatGPT review of round-4-T08 amendments (light verification)
2. **NEW v2.12**: PK chose Path A or Path B; documented in audit run state
3. **NEW v2.12 (Path B only)**: pre-execution verification confirmed 12 rows; UPDATE applied; post-execution guard returned 0 rows
4. **NEW v2.12**: pre-deploy guard returns 0 rows (Path B) OR documented non-zero rows as safe (Path A)
5. P-B snapshot exported BEFORE deploy
6. S13 + S14 observation queries run; legitimate gaps closed
7. **NEW v2.12**: B28 operator intent confirmed for CFW IG / Invegent IG / CFW FB
8. SQL v5 migration applied via `apply_migration`
9. EF v1.6.0 deployed
10. Staged first run with `{limit: 5}` documented; full response captured with `eligibility_safety_net_fires=0`
11. After 1 cron cycle: S11 shows fresh approvals across multiple (client, platform) buckets
12. After 24h: T10 P-B population confirmed terminally rejected
13. 24h churn observation captured
