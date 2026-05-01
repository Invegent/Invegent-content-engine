# Round-3 ChatGPT Review — 1 Amendment (Bypass Fix) + Observability Note

**Date**: 2026-05-01 Friday late evening Sydney
**Reviewer**: ChatGPT (round 3)
**Verdict**: Almost green; one SQL bypass amendment required before deploy
**Action**: Bypass fix folded into T08 brief. Round-4 review pending.

## Summary

| # | Amendment | Affected brief | Severity |
|---|---|---|---|
| 1 | T08 SQL bypass fix — select authoritative profile FIRST, then check `auto_approve_enabled` | 04 | **HIGH** (3rd consecutive on T08-A) |
| 2 | T08 staged deploy — capture full responses preserving `eligibility_safety_net_fires` | 04 | low (observability strengthening) |
| — | T17, T18, T13, T09, T10, T14 — cleared | various | none |

## Amendment 1 — T08 SQL bypass fix

### Issue caught

v2.9 round-2 SQL put `auto_approve_enabled = true` INSIDE the lateral subquery's WHERE clause:

```sql
-- v2.9 (BUGGY):
JOIN LATERAL (
  SELECT cpp.auto_approve_enabled
  FROM c.client_publish_profile cpp
  WHERE cpp.client_id = dr.client_id
    AND cpp.platform = pd.platform
    AND cpp.auto_approve_enabled = true   -- in inner WHERE
  ORDER BY cpp.is_default DESC NULLS LAST
  LIMIT 1
) cpp ON true
```

**Bypass**: this matches ANY profile row where `(client_id, platform, auto_approve_enabled=true)` exists. If a client has:
- An active+default profile with `auto_approve_enabled=false` (the row the publisher actually uses)
- A non-default or inactive profile with `auto_approve_enabled=true`

...the lateral picks the SECOND row and considers the draft eligible — contradicting the operator's intent and the publisher's selection logic.

Real-world risk if deployed: any client with stale/test profile rows could have drafts auto-approved despite the active profile being explicitly disabled.

### Fix folded in

Move `auto_approve_enabled = true` OUT of the inner WHERE, INTO the JOIN ON clause. First select the AUTHORITATIVE active+default profile (matching publisher selection logic), then check the flag on THAT specific row:

```sql
-- v2.10 (FIXED):
JOIN LATERAL (
  SELECT cpp.client_publish_profile_id, cpp.auto_approve_enabled
  FROM c.client_publish_profile cpp
  WHERE cpp.client_id = dr.client_id
    AND cpp.platform = pd.platform
    AND cpp.status = 'active'                                          -- match publisher
  ORDER BY cpp.is_default DESC NULLS LAST, cpp.created_at DESC NULLS LAST
  LIMIT 1
) cpp ON COALESCE(cpp.auto_approve_enabled, false) = true              -- check flag on AUTHORITATIVE row only
```

**Schema verified in chat session** before authoring fix: `c.client_publish_profile` has `status` (text), `is_default` (boolean), `created_at` (timestamptz), `auto_approve_enabled` (boolean NOT NULL DEFAULT false). All required columns exist.

### Verification of alignment with publisher logic

FB publisher source (pulled in T15 audit):
```typescript
.from("client_publish_profile")
.select("*")
.eq("client_id", q.client_id)
.eq("platform", "linkedin")
.eq("status", "active")
.order("is_default", { ascending: false })
.limit(1)
.maybeSingle();
```

LinkedIn-Zapier and IG publishers use the same pattern. The auto-approver SQL v4 now mirrors this selection logic before the `auto_approve_enabled` check, ensuring the eligibility decision is made on the same profile the publisher would publish to.

## Amendment 2 — Staged deploy response capture

### Observation

`eligibility_safety_net_fires` is the EF response field that exposes whether the defence-in-depth path fired. Q1 (post-step query for rejection-by-gate) catches CONTENT-gate regressions, but the safety-net path returns `outcome='skipped'` and DOES NOT write a rejected draft row. Q1 alone doesn't catch safety-net fires.

### Fix folded in

T08 brief staged-run protocol now requires capturing FULL response JSON for both `{limit: 5}` and `{limit: 10}` invocations into audit run state. Specifically preserves `eligibility_safety_net_fires` for retrospective verification.

Both observability surfaces are needed:
- Response field `eligibility_safety_net_fires` must be `0` (catches safety-net fires)
- Q1 must show no `auto_approve_enabled` rejections (catches content-gate-misclassification regressions)

## Meta-pattern note (3 HIGH-severity catches in 3 rounds on T08-A)

| Round | Catch | Severity | Type |
|---|---|---|---|
| 1 | Platform-scope: LIMIT 1 without platform filter | HIGH | wrong target |
| 2 | Eligibility/content gate conflation in processOneDraft | HIGH | wrong outcome semantics |
| 3 | Authoritative-profile bypass: filter inside inner WHERE | HIGH | wrong selection logic |

Each round's bug was different in shape but consistently in T08-A. Pattern signal: T08-A has more structural complexity than "narrow scope" framing implied. The combination of stratification + reject-cooldown + eligibility filter creates four interaction points, and each interaction is a potential bug surface.

**Lesson #51 candidate (NEW v2.10)**: "Patches that touch terminal-decision authority (e.g. terminal-reject + slot-reset triggers) require disproportionately more scrutiny than 'narrow' framing suggests, because terminal decisions amplify any underlying bug. Plan for at least one extra review round than the patch's surface area would suggest."

## Round-4 review prompts

1. Does the v4 SQL have any remaining bypass paths? E.g. could the lateral pick a row that the publisher would NOT actually use under any condition?
2. Is there any state where `cpp.status='active'` returns multiple rows after the ORDER BY tie-break, and which row gets picked is non-deterministic?
3. Are there any other patches in the batch that have similar "select from a candidate set" logic that should be re-examined for the same bypass class?
4. Given 3 consecutive HIGH catches on T08, is there a higher-confidence path (e.g. add a unit test, add a verification probe) before deploy?

## Acceptance criteria (round-3 amendments done when)

1. Bypass fix folded into T08 brief ✓ (this commit)
2. Response-capture requirement folded into staged deploy ✓
3. ChatGPT round-4 review captures any further refinements
4. Round-4 amendments folded in (if any)
5. Then: deploy micro-staged per `00_INDEX.md` sequence
