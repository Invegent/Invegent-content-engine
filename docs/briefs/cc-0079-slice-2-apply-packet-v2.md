# cc-0079 Slice 2 — Apply Packet v2 (data-only mix renormalization)

> **Lane:** cc-0079 Slice 2 · **Type:** APPLY packet (DML + SoD control) · **Tier:** T2→T3 (policy change across platforms → SoD control ON)
> **Supersedes:** apply packet v1 (`bc05db17…`). Analysis brief `eefd2f4e…` unchanged and still current.
> **Status:** author-only. **NOT APPLIED.** No DML executed, no commit, no push.
> **Separate lanes — do not combine:** Slice 1 (`ai-worker`, reassigned to S3) · cc-0080 (reconciler, at the SoD apply gate under S9).
> **Author base (stale-ref gate PASSED this turn):** CE `origin/main == HEAD == 052a9ba`, parity 0/0. Target project `mbkmaxqhsohbtwsqolns`. All evidence read live 2026-07-24.

**What v2 adds over v1:** before/after is now **machine-derived** rather than hand-computed · **per-slot allocation** evidence showing the actual harm · two **constraint hazards** discovered and handled · rollback rebuilt to be **by-identity** instead of a date heuristic · post-apply assertions.

---

## 1 · The harm, in slots (not percentages)

The live grid PP receives today — `m.build_weekly_demand_grid('4036a6b5…', CURRENT_DATE)` — fed through the real allocator `m.allocate_week_formats(shares, 5)` (5 = PP's enabled slots/week/platform). Both are read-only functions; this is what production computes right now:

| Platform | BEFORE — actual week allocation | invalid |
|---|---|---|
| linkedin | `carousel · carousel · text · image_quote · video_short_kinetic` | **3 of 5** |
| instagram | `carousel · carousel · image_quote · video_short_kinetic · video_short_stat_voice` | **2 of 5** |
| facebook | `image_quote · image_quote · carousel · text · video_short_kinetic` | **1 of 5** |

| Platform | AFTER — renormalized | invalid |
|---|---|---|
| linkedin | `text · image_quote · text · text · image_quote` | **0 of 5** |
| instagram | `carousel · image_quote · carousel · carousel · image_quote` | **0 of 5** |
| facebook | `image_quote · carousel · image_quote · carousel · text` | **0 of 5** |

> **6 of 15 weekly PP slots (40%) are currently allocated to formats the platform cannot publish. After: 0 of 15.**
> On LinkedIn specifically, **3 of every 5 slots** — `carousel` is `linkedin:false` and holds the single largest share (40%). This is the source of the LinkedIn text-dominance recorded in the architecture brief: the Advisor was overriding an allocation that was never publishable.

YouTube is untouched (all 5 of its mix entries are `youtube:true`).

---

## 2 · Before/after shares — machine-derived (reproducible)

Not hand-typed. This query derives the renormalization live; its output **is** the proposed data:

```sql
WITH cur AS (
  SELECT d.platform, d.ice_format_key, d.default_share_pct,
         COALESCE((f.platform_support->>d.platform)::boolean, false) AS is_valid
  FROM t.platform_format_mix_default d
  JOIN t."5.3_content_format" f ON f.ice_format_key = d.ice_format_key
  WHERE d.is_current
), tot AS (
  SELECT platform, SUM(default_share_pct) FILTER (WHERE is_valid) AS valid_sum,
                   SUM(default_share_pct) FILTER (WHERE NOT is_valid) AS invalid_sum
  FROM cur GROUP BY platform)
SELECT c.platform, c.ice_format_key, c.default_share_pct AS before_share, c.is_valid,
       t.invalid_sum AS platform_invalid_share,
       CASE WHEN c.is_valid THEN ROUND(c.default_share_pct*100.0/t.valid_sum, 2) END AS after_share
FROM cur c JOIN tot t USING (platform) ORDER BY c.platform, c.is_valid DESC, after_share DESC NULLS LAST;
```

**Derived output (matches the hand-computed v1 figures exactly):**

| platform | format | before | valid | after |
|---|---|---|---|---|
| facebook | image_quote | 30.00 | ✓ | **40.00** |
| facebook | carousel | 25.00 | ✓ | **33.33** |
| facebook | text | 20.00 | ✓ | **26.67** |
| facebook | video_short_kinetic · video_short_kinetic_voice · animated_text_reveal | 10 · 10 · 5 | ✗ | *removed* (invalid Σ **25.00**) |
| instagram | carousel | 30.00 | ✓ | **60.00** |
| instagram | image_quote | 20.00 | ✓ | **40.00** |
| instagram | video_short_kinetic · video_short_stat_voice · animated_data · animated_text_reveal | 20 · 15 · 10 · 5 | ✗ | *removed* (invalid Σ **50.00**) |
| linkedin | text | 20.00 | ✓ | **57.14** |
| linkedin | image_quote | 15.00 | ✓ | **42.86** |
| linkedin | carousel · video_short_kinetic · video_short_stat_voice | 40 · 15 · 10 | ✗ | *removed* (invalid Σ **65.00**) |
| youtube | all 5 | — | ✓ | **unchanged** |

**Weighting preserved (renormalize, not flatten):** FB `30:25:20 == 40:33.33:26.67` ✓ · IG `30:20 == 60:40` ✓ · LI `20:15 == 57.14:42.86` ✓. Each platform sums to 100.00.

---

## 3 · Constraint hazards discovered (new in v2)

Read live from `pg_constraint` / `pg_index`:

**H1 — `UNIQUE (platform, ice_format_key, effective_from)`.** v1's DML inserts at `CURRENT_DATE`. Verified all 17 current rows carry `effective_from = 2026-04-22`, so a **first** apply is safe — but a **same-day retry after a partial failure would violate this constraint**. Handling: the DML runs in a single transaction (all-or-nothing, so a failure leaves nothing to collide with), and step 0 of the apply asserts no row already exists at the target `effective_from`.

**H2 — no partial-unique on `is_current`.** There is only `idx_platform_format_mix_default_current` (a plain partial *index*, not unique). Nothing prevents **two `is_current=true` rows for the same (platform, format)** if a deactivate is missed — which would silently corrupt the grid (its `max()`/`COALESCE` collapse would pick arbitrarily). Handling: a mandatory post-apply assertion (§5 A3) that every (platform, format) has exactly one current row.

Also noted: FKs to `t."5.0_social_platform"(platform_code)` and `t."5.3_content_format"(ice_format_key)` — all proposed rows reference existing keys; and `CHECK (default_share_pct BETWEEN 0 AND 100)` — all proposed values pass.

---

## 4 · Exact DML (for the apply hand — NOT run here)

```sql
BEGIN;

-- A0 PRE-ASSERT: no collision at the target effective_from (H1)
--   must return 0, else ABORT
SELECT count(*) FROM t.platform_format_mix_default
 WHERE platform IN ('facebook','instagram','linkedin') AND effective_from = CURRENT_DATE;

-- A1 Deactivate the 17 current rows BY IDENTITY (pinned in §6)
UPDATE t.platform_format_mix_default
   SET is_current = false, updated_at = now()
 WHERE mix_default_id IN (
   '750938ae-ee91-4558-9428-15f11bc6828f','6940b232-b7c3-41d7-afb7-540f006bde6a',
   '8c111129-5f1b-4700-a2f2-c239a49bebda','64bb78b5-a049-4277-aa4f-e3e3d50c5473',
   '7c240ff1-ec07-4c16-b2b4-4b30a044387d','f92a2422-7d27-4dd4-98f2-0c6e961d494f',
   '33281226-f582-492d-b508-dbbb4b428350','7bf92ca2-6ed5-4e2a-b8e5-6c834251103f',
   'a56785a0-9249-4218-9d20-7144d81bec5a','ba157a91-332b-440b-b4ee-58f3fb3e8a63',
   '59d3ae9b-9b5f-4cfa-92de-1e713274cab6','70b7b142-56d4-448c-bd33-90e5d3ad5a66',
   'a6d042d3-2372-4231-b08e-8b4c2e7a0cf1','37e434ca-027e-4ef0-9a5d-7d45f2fe3032',
   '3cfb0ee5-a542-4770-8bc0-199ed9fec3c8','54fbe956-17e9-415b-a4ce-d8fe1bf19cfa',
   '47154b81-ba1f-4a72-95d5-77480b8375b1');
-- must report exactly 17 rows updated, else ABORT

-- A2 Insert the 7 renormalized rows; CAPTURE THE RETURNED IDS for rollback
INSERT INTO t.platform_format_mix_default
  (platform, ice_format_key, default_share_pct, evidence_source, evidence_note, effective_from, is_current)
VALUES
 ('facebook','image_quote',40.00,'cc-0079-slice-2','renormalized vs platform_support (Fault A)',CURRENT_DATE,true),
 ('facebook','carousel',   33.33,'cc-0079-slice-2','renormalized vs platform_support (Fault A)',CURRENT_DATE,true),
 ('facebook','text',       26.67,'cc-0079-slice-2','renormalized vs platform_support (Fault A)',CURRENT_DATE,true),
 ('instagram','carousel',  60.00,'cc-0079-slice-2','renormalized vs platform_support (Fault A)',CURRENT_DATE,true),
 ('instagram','image_quote',40.00,'cc-0079-slice-2','renormalized vs platform_support (Fault A)',CURRENT_DATE,true),
 ('linkedin','text',       57.14,'cc-0079-slice-2','renormalized vs platform_support (Fault A)',CURRENT_DATE,true),
 ('linkedin','image_quote',42.86,'cc-0079-slice-2','renormalized vs platform_support (Fault A)',CURRENT_DATE,true)
RETURNING mix_default_id, platform, ice_format_key;   -- ← RECORD THESE 7 IDS

-- A3..A5 assertions in §5 must all pass BEFORE COMMIT
COMMIT;
```

YouTube is deliberately untouched.

---

## 5 · Pre-commit assertions (all must pass, else ROLLBACK)

| # | Assertion | Expected |
|---|---|---|
| **A1** | rows deactivated by identity | exactly **17** |
| **A2** | rows inserted | exactly **7** |
| **A3** | **exactly one current row per (platform, format)** (H2 guard) — `SELECT platform, ice_format_key, count(*) FROM … WHERE is_current GROUP BY 1,2 HAVING count(*)>1` | **0 rows** |
| **A4** | every current row is platform-valid — `… WHERE is_current AND COALESCE((f.platform_support->>d.platform)::bool,false)=false` | **0 rows** |
| **A5** | per-platform share sums | FB/IG/LI = **100.00** each; YT = 100.00 unchanged |
| **A6** | YouTube untouched | its 5 rows' `mix_default_id`/`updated_at` unchanged |

---

## 6 · Rollback — by identity (rebuilt; v1's date heuristic withdrawn)

v1 rolled back with `is_current=false AND updated_at::date=CURRENT_DATE` — fragile: it could catch unrelated rows updated the same day and breaks across a UTC midnight. **Withdrawn.** v2 is exact:

```sql
BEGIN;
-- R1 delete the 7 rows created by the apply (ids captured from A2's RETURNING)
DELETE FROM t.platform_format_mix_default WHERE mix_default_id IN (<the 7 captured ids>);
-- R2 reactivate the 17 originals BY THE SAME PINNED IDENTITY LIST used in A1
UPDATE t.platform_format_mix_default SET is_current = true, updated_at = now()
 WHERE mix_default_id IN (<the same 17 ids from §4/A1>);
-- R3 assert: 17 current rows for FB/IG/LI, shares match the §2 "before" column, A3 holds
COMMIT;
```

Fully reversible; no data destroyed (the 17 originals are only flag-flipped, never deleted). **Baseline to capture immediately before apply** (and diff against §2 "before"): `SELECT mix_default_id, platform, ice_format_key, default_share_pct, effective_from, is_current FROM t.platform_format_mix_default WHERE platform IN ('facebook','instagram','linkedin') ORDER BY platform, ice_format_key;`

**Pinned identity list — the 17 current rows (verified live, `effective_from=2026-04-22`):**

| platform | format | share | mix_default_id |
|---|---|---|---|
| facebook | animated_text_reveal | 5.00 | `750938ae-ee91-4558-9428-15f11bc6828f` |
| facebook | carousel | 25.00 | `6940b232-b7c3-41d7-afb7-540f006bde6a` |
| facebook | image_quote | 30.00 | `8c111129-5f1b-4700-a2f2-c239a49bebda` |
| facebook | text | 20.00 | `64bb78b5-a049-4277-aa4f-e3e3d50c5473` |
| facebook | video_short_kinetic | 10.00 | `7c240ff1-ec07-4c16-b2b4-4b30a044387d` |
| facebook | video_short_kinetic_voice | 10.00 | `f92a2422-7d27-4dd4-98f2-0c6e961d494f` |
| instagram | animated_data | 10.00 | `33281226-f582-492d-b508-dbbb4b428350` |
| instagram | animated_text_reveal | 5.00 | `7bf92ca2-6ed5-4e2a-b8e5-6c834251103f` |
| instagram | carousel | 30.00 | `a56785a0-9249-4218-9d20-7144d81bec5a` |
| instagram | image_quote | 20.00 | `ba157a91-332b-440b-b4ee-58f3fb3e8a63` |
| instagram | video_short_kinetic | 20.00 | `59d3ae9b-9b5f-4cfa-92de-1e713274cab6` |
| instagram | video_short_stat_voice | 15.00 | `70b7b142-56d4-448c-bd33-90e5d3ad5a66` |
| linkedin | carousel | 40.00 | `a6d042d3-2372-4231-b08e-8b4c2e7a0cf1` |
| linkedin | image_quote | 15.00 | `37e434ca-027e-4ef0-9a5d-7d45f2fe3032` |
| linkedin | text | 20.00 | `3cfb0ee5-a542-4770-8bc0-199ed9fec3c8` |
| linkedin | video_short_kinetic | 15.00 | `54fbe956-17e9-415b-a4ce-d8fe1bf19cfa` |
| linkedin | video_short_stat_voice | 10.00 | `47154b81-ba1f-4a72-95d5-77480b8375b1` |

**Drift STOP:** if this 17-row identity set does not match live at apply time, the mix changed since authoring → **ABORT and re-derive**.

---

## 7 · Segregation-of-duties apply control

Policy change across platforms → SoD ON, same shape as cc-0080. **Apply hand ≠ author/review hand.**

- **Pinned artifact:** this packet, sha256 in the freeze block. **Target:** project `mbkmaxqhsohbtwsqolns`, bound explicitly; abort if different. **Precondition:** the packet must be on a ref so the apply hand can hash `git show <ref>:<path>`, not a working-tree file.
- **Sequence:** re-hash packet → confirm project → re-run §2 derivation and confirm it still yields the §2 table → confirm the §6 17-row identity set matches live → run §4 in one transaction → §5 assertions A1–A6 all pass → COMMIT; else ROLLBACK.
- **Post-apply proof:** re-run the §1 allocator comparison; every platform must show **0 invalid of 5**.
- **STOP conditions:** A0 collision ≠ 0 · A1 ≠ 17 · A2 ≠ 7 · any of A3–A6 failing · §6 identity drift · `platform_support` changed since authoring · any YouTube row touched.
- `db-rls-auditor` on the exact DML before apply.

---

## 8 · Material consequence (PK `policy_decision`, unchanged)

Renormalization collapses valid inventory: **FB → 3 formats, IG → 2, LI → 2.** Truthful — the removed diversity was never publishable. Intersects open **Q4** (`animated_text_reveal` / `animated_data` are supported on **zero** platforms and are removed from FB/IG here regardless of how Q4 resolves). PK ratifies whether thin-but-valid is acceptable or whether platform-valid formats must be onboarded first. **This packet does not decide it.**

---

## 9 · Non-claims

Nothing applied; no DML run. YouTube untouched. Does not change the mix function, client overrides (none exist), the Advisor (Slice 1 → S3), or transport. Does not decide Q4. The §1 allocation comparison uses N=5 (PP's current enabled cadence) and the live grid shares — other clients/cadences differ, and only PP is `format_mix` enrolled today. Counts and IDs are live as of 2026-07-24 and must be re-verified at apply. The durable fix (a `platform_support` intersection inside `m.build_weekly_demand_grid`) remains a named **code** successor, out of this data-only scope.
