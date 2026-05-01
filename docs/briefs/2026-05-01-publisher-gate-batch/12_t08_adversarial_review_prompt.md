# T08 Adversarial Review Prompt — Round-4-T08

**Date**: 2026-05-01 Friday late evening Sydney
**Status**: Authored under D-01; awaiting ChatGPT focused adversarial review
**Scope**: T08 v4 SQL ONLY — publisher patches (T17/T18/T13) are reviewed separately in brief 11.

## Why adversarial framing

**Three consecutive HIGH-severity catches on T08-A across three review rounds.** Lesson #51 candidate. Each round, my SQL was logically broken in a different way. Round-4 needs to actively try to break v4, not just review it for what it sees.

Reference: `04_t08_auto_approver_stratify_cooldown.md` for the full v4 SQL.

## Live dry-run output (executed in chat session 1 May 2026 evening)

### Query (a) — per-(client, platform) eligibility decisions for current `needs_review` pool

| client_name | platform | needs_review | auth_profile_id (8-char prefix) | auth_is_default | auth_aae | v4_decision |
|---|---|---|---|---|---|---|
| Care For Welfare Pty Ltd | facebook | 3 | e15f5621... | NULL | true | eligible |
| Care For Welfare Pty Ltd | instagram | 7 | 40f0597c... | NULL | true | eligible |
| Invegent | instagram | 3 | 58a49509... | NULL | true | eligible |
| NDIS-Yarns | facebook | 220 | d469a8f3... | **true** | true | eligible |
| NDIS-Yarns | instagram | 123 | 3827af5c... | NULL | true | eligible |
| NDIS-Yarns | linkedin | 134 | 198f7328... | NULL | true | eligible |
| Property Pulse | facebook | 18 | 1a30dd24... | **true** | true | eligible |
| Property Pulse | instagram | 65 | b44167f3... | NULL | true | eligible |
| Property Pulse | linkedin | 66 | 282edb2c... | NULL | true | eligible |

**Pool total**: 639 needs_review drafts across 9 buckets.
**Profiles with explicit `is_default=true`**: 2 of 9 (NDIS-Yarns FB, Property Pulse FB).
**Profiles with `is_default=NULL`**: 7 of 9 (everything else).
**No buckets returned `not_eligible_auth_disabled` or `no_active_profile`**.

### Query (b) — top 30 candidate drafts (one full cron-cycle worth at default limit)

Distribution at bucket_rank=1 (one draft per bucket, 9 total): all 9 buckets represented — the stratification is working as designed.

At bucket_rank=2: 9 more candidates, one from each bucket. Same at bucket_rank=3. Then bucket_rank=4 starts (for buckets that still have material; smaller buckets like CFW FB at 3 drafts deplete by rank 3).

Content diversity sampled at top-30:
- Body sizes 611–2160 chars
- Final scores 0–12
- Topics: NDIS reform, property data, OT continuity, AI policy, federal court rulings, conferences

## Adversarial questions for ChatGPT round-4

### Q1 — Bypass attempt

Given the v4 SQL:
```sql
JOIN LATERAL (
  SELECT cpp.client_publish_profile_id, cpp.auto_approve_enabled
  FROM c.client_publish_profile cpp
  WHERE cpp.client_id = dr.client_id
    AND cpp.platform = pd.platform
    AND cpp.status = 'active'
  ORDER BY cpp.is_default DESC NULLS LAST, cpp.created_at DESC NULLS LAST
  LIMIT 1
) cpp ON COALESCE(cpp.auto_approve_enabled, false) = true
```

**Construct a database state under which a draft would be auto-approved despite the operator's intent that it not be.** If you can construct one, the SQL has a bypass. If you can prove no such state exists given the schema, v4 is correct.

Consider edge cases:
- Client with multiple `status='active'` profiles for the same platform
- Profile with `is_default=true` AND `auto_approve_enabled=false` plus another with `is_default=NULL` AND `auto_approve_enabled=true`
- Profile with `is_default=NULL` for both candidates, tied on `created_at`
- Profile with `status='active'` AND `is_default=true` AND `auto_approve_enabled=true` but the publisher's actual selection diverges

### Q2 — Non-determinism on tie-break

If two profiles match `(client_id, platform, status='active')` and both have `is_default=NULL` and identical `created_at` (e.g. created in the same migration), `ORDER BY is_default DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1` is non-deterministic.

Is this a real risk? If so, what's the recommended mitigation? Options:
- (a) Add `client_publish_profile_id DESC` as ultimate tie-break for stability
- (b) Add a unique constraint on `(client_id, platform)` where `status='active'` (schema-level guarantee)
- (c) Accept the risk on the basis that simultaneous-creation of two same-platform profiles is an operational mistake to detect, not a function-correctness concern

Dry-run shows current production has 9 buckets, each with one matching profile — no current tie-break ambiguity. But future state matters.

### Q3 — NULL `is_default` semantics

7 of 9 production profiles have `is_default=NULL`. Under `ORDER BY is_default DESC NULLS LAST`, these sort LAST among same-status rows. So the function picks them only when no row has `is_default=true`.

Is `NULL is_default` semantically correct? Three interpretations:
- (a) NULL means "not yet decided" — should NOT be picked as authoritative
- (b) NULL means "effectively not default but technically active" — may be picked when no `true` exists
- (c) NULL means error state — should be flagged, not silently included

If (a) or (c), v4 SQL has a subtle bug because it picks NULL-default rows as authoritative when no `true` exists.

### Q4 — Publisher selection semantics divergence

FB / IG / LinkedIn-Zapier publishers select profile by:
```typescript
.eq("client_id", clientId)
.eq("platform", platform)
.eq("status", "active")
.order("is_default", { ascending: false })
.limit(1)
```

v4 SQL adds a tie-break on `created_at DESC NULLS LAST` that the publishers don't have. If publishers and SQL disagree on which profile is authoritative when there are multiple NULL-default active rows, the auto-approver could deem a draft eligible based on profile A's `auto_approve_enabled=true` while the publisher publishes via profile B.

Does this divergence matter? Or is the contract "any active profile with `auto_approve_enabled=true` justifies auto-approval" sufficient?

Mitigation if it matters: align publisher selection logic to include the same `created_at DESC` tie-break (across 4 publisher EFs).

### Q5 — Operator-intent verification on current state

Dry-run shows CFW IG (7 drafts), Invegent IG (3 drafts), CFW FB (3 drafts) currently have `auto_approve_enabled=true`.

These are the smaller test/personal-brand clients. Were these intentionally enabled for auto-approve? Or were they enabled inadvertently (e.g. via a default-creation flow that set `auto_approve_enabled=true` without operator decision)?

This is not a SQL question — it's an operator-state verification. PK should review and confirm before T08 deploys, OR explicitly flip them to `false` if not intended.

### Q6 — Verification probe before deploy

Given 3 consecutive HIGH catches: is there a higher-confidence verification probe than just "deploy and observe"? Options:
- (a) Unit-test `m.auto_approver_fetch_drafts` v4 against synthetic database states (would require building a test harness)
- (b) Pre-deploy assertion: write a SELECT that proves no draft is in the v4 candidate set whose authoritative profile has `auto_approve_enabled=false` (i.e. the v4 SQL actually filters correctly). Run on production data BEFORE migration applies
- (c) Two-stage migration: deploy v4 as a separate function (e.g. `m.auto_approver_fetch_drafts_v4`), have the EF call it explicitly via version flag, observe parity with v1 for one cycle (capturing what v1 returned vs what v4 would return), then promote

Which (if any) is justified by the catch history?

### Q7 — "Construct a state" probe

If you (ChatGPT) can describe a SPECIFIC database state under which v4 produces a wrong eligibility decision, please write it as a SQL `INSERT INTO c.client_publish_profile ...` snippet so PK can verify whether such a state would be possible/likely in production.

## What we're not asking

- Adversarial review of T17/T18/T13 — those go through brief 11 separately
- Whether T08 should be split into smaller patches — architecturally agreed; we're committed to v4 design
- Whether the staged deploy protocol is safe — already cleared in round-3

## Acceptance criteria (round-4-T08 done when)

1. ChatGPT runs through Q1–Q7 and produces verdict
2. If any HIGH or MEDIUM finding: fold into T08 v5 SQL or supporting brief
3. If clean: PK confirms operator intent on Q5 (CFW IG, Invegent IG, CFW FB), then T08 deploys per staged-run protocol
4. Post-deploy: `eligibility_safety_net_fires=0` and Q1 (no `auto_approve_enabled` rejection rows in `m.post_draft.draft_format`) hold over 24h
