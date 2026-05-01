# Round-4-T08 ChatGPT Review — 1 HIGH-Severity Amendment + Forward-Defence

**Date**: 2026-05-01 Friday late evening Sydney
**Reviewer**: ChatGPT (round 4 — adversarial review of T08 v4 SQL)
**Verdict**: T08 not green; 1 amendment required + B28 intent confirmation
**Action**: Amendment authored. Round-5 quick review pending before T08 deploys.

## Summary

**4th consecutive HIGH-severity catch on T08-A.** ChatGPT successfully constructed a bad state under v4 SQL: two active profiles for the same (client, platform), older with `auto_approve_enabled=false` (operator intent), newer with `auto_approve_enabled=true` (accidental duplicate). v4 picks the newer via `created_at DESC`, contradicting operator intent.

**Critical context**: live guard query against production shows the bad state is **NOT currently reachable** — every (client, platform) has exactly ONE active profile. So this amendment is forward-defence against future state, not a current-bug-fix.

## Live guard output (executed in chat session)

```sql
SELECT client_id, platform, COUNT(*) AS active_profile_count,
       COUNT(*) FILTER (WHERE is_default = true) AS default_count, ...
FROM c.client_publish_profile
WHERE status = 'active'
GROUP BY client_id, platform
HAVING COUNT(*) > 1
    OR COUNT(*) FILTER (WHERE is_default = true) != 1;
```

Returned 12 rows. Pattern:
- `active_profile_count=1` for ALL 12 rows (no duplicates)
- `default_count=0` for ALL 12 rows (no explicit default; `is_default=NULL`)
- `auto_enabled_count=1` for ALL 12 rows (all currently auto-approve enabled)

The 2 (client, platform) combos NOT flagged — NDIS-Yarns FB and Property Pulse FB — both have `is_default=true` and pass the guard cleanly.

**Interpretation**: current production has clean single-active state but inconsistent default flag. v4 SQL picks deterministically right now (only one row to pick). The bad state ChatGPT constructed requires a SECOND active row, which doesn't exist.

## Amendment summary (4 changes, all small)

| # | Change | Surface | Severity |
|---|---|---|---|
| 1 | v5 SQL: add `client_publish_profile_id DESC` as final tie-break | SQL function | low (deterministic guarantee) |
| 2 | Pre-deploy duplicate/ambiguity guard query | operational | medium (forward-defence) |
| 3 | Path B (RECOMMENDED): UPDATE NULL `is_default` to `true` on sole-active profiles | data hygiene DML | medium |
| 4 | New standing check S15: run guard at session start | observability | low |

Plus existing items not blocking: B28 (operator intent), B29 (partial unique constraint long-term).

## Amendment 1 — v5 SQL with three-level tie-break

Add `client_publish_profile_id DESC` as final deterministic tie-break. Solves nondeterminism if two rows tie on both `is_default` and `created_at`. Doesn't capture operator intent (only Path B + B29 do that), but eliminates the possibility of non-deterministic SQL output.

```sql
-- v5 (round-4-T08): added final deterministic tie-break
ORDER BY cpp.is_default DESC NULLS LAST,
         cpp.created_at DESC NULLS LAST,
         cpp.client_publish_profile_id DESC
```

## Amendment 2 — Pre-deploy guard query (REQUIRED)

Must run BEFORE T08 deploys. Definition of done depends on Path A vs B:

```sql
SELECT
  client_id, platform, COUNT(*) AS active_profile_count,
  COUNT(*) FILTER (WHERE is_default = true) AS default_count,
  COUNT(*) FILTER (WHERE auto_approve_enabled = true) AS auto_enabled_count,
  array_agg(client_publish_profile_id ORDER BY is_default DESC NULLS LAST, created_at DESC NULLS LAST, client_publish_profile_id DESC) AS profile_ids_in_v5_order,
  array_agg(auto_approve_enabled ORDER BY is_default DESC NULLS LAST, created_at DESC NULLS LAST, client_publish_profile_id DESC) AS aae_in_v5_order
FROM c.client_publish_profile
WHERE status = 'active'
GROUP BY client_id, platform
HAVING COUNT(*) > 1
    OR COUNT(*) FILTER (WHERE is_default = true) != 1
ORDER BY client_id, platform;
```

- **Path A**: returns >0 rows; document each row as safe (single-active, no duplicate); proceed
- **Path B**: apply UPDATE first (Amendment 3), re-run guard, expect 0 rows, proceed

## Amendment 3 — Data hygiene UPDATE (RECOMMENDED, Path B)

Apply BEFORE T08 deploys. Sets `is_default=true` on NULL profiles where they're sole-active for their (client, platform).

```sql
-- Path B: clean is_default=NULL on sole-active profiles before T08 deploy.
-- Safe because: only updates rows where no other active profile exists for the same
-- (client, platform). After this UPDATE, the guard returns 0 rows.
UPDATE c.client_publish_profile cpp_target
SET is_default = true,
    updated_at = NOW()
WHERE cpp_target.status = 'active'
  AND cpp_target.is_default IS DISTINCT FROM true   -- catches both NULL and false
  AND NOT EXISTS (
    -- Only set is_default=true on rows that are SOLE active profile for (client, platform)
    SELECT 1 FROM c.client_publish_profile cpp_other
    WHERE cpp_other.client_id = cpp_target.client_id
      AND cpp_other.platform = cpp_target.platform
      AND cpp_other.status = 'active'
      AND cpp_other.client_publish_profile_id != cpp_target.client_publish_profile_id
  );
```

Apply via Supabase MCP `execute_sql` (DML, not DDL). Returns count of rows affected. Verify against pre-execution count of 12.

**Side effects**:
- Publishers (`ORDER BY is_default DESC LIMIT 1`) get explicit `is_default=true` rather than implicit-via-NULLS-LAST. Behaviour identical (still picks the same row), but more legible.
- Auto-approver v5 SQL: same row picked, but tie-break `is_default DESC NULLS LAST` now picks via `true` (explicit) rather than NULLS LAST (implicit).
- No publisher behaviour change because there's still only one active profile per bucket.

**Pre-execution verification**:
```sql
-- Confirm 12 rows would be affected (matches guard count above)
SELECT COUNT(*) FROM c.client_publish_profile
WHERE status = 'active' AND is_default IS DISTINCT FROM true
  AND NOT EXISTS (
    SELECT 1 FROM c.client_publish_profile cpp2
    WHERE cpp2.client_id = c.client_publish_profile.client_id
      AND cpp2.platform = c.client_publish_profile.platform
      AND cpp2.status = 'active'
      AND cpp2.client_publish_profile_id != c.client_publish_profile.client_publish_profile_id
  );
```

Expected: 12.

**Post-execution verification**:
- Re-run guard — expect 0 rows
- Re-run v4/v5 dry-run candidate query — expect same 9 buckets, same 639 candidates (no functional change)

## Amendment 4 — Standing check S15 (added to action_list)

Guard query becomes session-start standing check. Triggers investigation if any (client, platform) shows duplicate actives or missing default. Forward-defence against operational accidents creating duplicate active profiles.

## Outstanding (not blocking T08 if Path B + B28 cleared)

### B28 — Operator intent on smaller-client auto-approve configs (still PK action)

Dry-run shows CFW IG (7), CFW FB (3), Invegent IG (3) all currently auto_approve_enabled=true. PK confirms intentional OR sets to false before T08 deploys. ChatGPT cannot answer this; it's an operator-knowledge question.

### B29 (NEW v2.12) — Partial unique constraint (long-term forward-defence)

Long-term: add partial unique constraint to make duplicate active profiles structurally impossible.

```sql
-- Conceptual, future migration:
CREATE UNIQUE INDEX uq_client_publish_profile_active_default
ON c.client_publish_profile (client_id, platform)
WHERE status = 'active' AND is_default = true;
```

Makes the bad state ChatGPT constructed unrepresentable at the schema level. Don't deploy tonight; design properly with rollout plan.

## Round-5 review prompts (light verification)

1. Does v5 SQL with three tie-breaks (is_default DESC NULLS LAST, created_at DESC NULLS LAST, client_publish_profile_id DESC) produce a deterministic single-row pick under all schema-valid inputs?
2. Path B UPDATE — is the `NOT EXISTS` predicate correctly scoped to prevent flipping `is_default` on (client, platform) combos that have multiple active rows?
3. Are 12 rows the right expected affected count given current production state? (Verifiable from the pre-execution verification query.)
4. Is the post-deploy plan (re-run guard → expect 0 → proceed) sufficient verification?

## Acceptance criteria (round-4-T08 done when)

1. Round-5 ChatGPT review of these amendments (light verification)
2. PK chooses Path A or Path B (recommend B)
3. If Path B: pre-execution verification confirms 12 rows; UPDATE applied; post-execution guard returns 0
4. B28 PK intent confirmed for CFW IG, Invegent IG, CFW FB
5. T08 v5 SQL migration applied via `apply_migration`
6. EF v1.6.0 deployed
7. Staged `{limit: 5}` first run captured with `eligibility_safety_net_fires=0`
