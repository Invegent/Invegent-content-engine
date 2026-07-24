# cc-0079 Slice 2 — Apply Packet v3 (data-only mix renormalization)

> # ⛔ WITHDRAWN — DO NOT APPLY, DO NOT REVIEW
> **Superseded by `docs/briefs/cc-0079-slice-2-apply-packet-v4.md`.** v3 was frozen (`6ab25793…`, 54711 B) *before* PK narrowed the re-cut authorization to exactly three repairs (single-call transaction containment · executable fail-closed assertions · the missing YouTube baseline, with S-3 folded into the second). v3 additionally implements S-1, S-4, S-5 and O-4 and adds two unauthorized assertions (A7, A8) — **it exceeds PK's scope.** It was never reviewed and nothing pins its hash. Retained only as the record of what was cut and why. **The apply hand must use v4.**

> **Lane:** cc-0079 Slice 2 · **Type:** APPLY packet (DML + SoD control) · **Tier:** T3 (policy change across platforms → SoD control ON)
> **Supersedes:** apply packet v2 (`73dd7413cad6a8a340838d8eb510b82dbc2ad9b3287026ad3930a4fbacc97637`, 14191 B). v2 is committed and pinned by a review; it is **not** overwritten. Analysis brief `eefd2f4e…` unchanged and still current.
> **Status:** author-only. **NOT APPLIED.** No DML executed, no commit, no push.
> **Author:** S5 (re-cut author). **S5 is NOT the apply hand — S1 is.** Segregation of duties: S1 found the defects and proved the remediation primitives, so S1 authoring the fix would collapse author and executor into one hand on a T3 apply.
> **Separate lanes — do not combine:** Slice 1 (`ai-worker`, S3) · cc-0080 (reconciler, S9) · any other database window.
> **Author base (stale-ref gate PASSED this turn, independently re-derived):** CE `HEAD == origin/main == git ls-remote origin refs/heads/main == ad4a6a944027897672764c1540f53890e027c2ee`, parity 0/0, branch `main`. Target project `mbkmaxqhsohbtwsqolns` (`content_engine`). Catalog evidence re-read live 2026-07-24.

---

## 0 · What this re-cut is, and what it deliberately is not

v3 re-cuts the **execution harness only**. It exists because `db-rls-auditor` returned **`concerns`** at gate ④ of the S1 apply lane and halted it with **zero production mutation** (result: `docs/briefs/results/cc-0079-slice-2-apply-lane-halt-v1.md`).

**The data payload does not change.** The 17 pinned identities, the 7 proposed rows, the shares (FB 40.00/33.33/26.67 · IG 60.00/40.00 · LI 57.14/42.86) and YouTube-untouched were independently reproduced by S1 character-for-character, including the §1 allocator table (6 of 15 → 0 of 15, **verified, not carried**). Not one share, key or UUID is altered here.

**What changed is that the packet's safety claims are now executed by the database instead of asserted in prose.** v2's STOP conditions were SQL comments; v3 turns every one of them into a `RAISE EXCEPTION` inside the apply transaction.

### Three must-fix defects closed

| # | Defect (v2) | Closure (v3) |
|---|---|---|
| **M-1** (high) | §5 assertions were **SQL comments** — `-- must report exactly 17 rows updated, else ABORT` and `-- A3..A5 … BEFORE COMMIT`. No `RAISE`, no `DO`, no conditional. Every statement committed regardless. §7 named A1≠17 / A2≠7 / A3–A6 as STOPs and **none existed in the code.** The standing ICE failure mode *"declared control production never reads"*. | Every assertion is a `DO $$ … IF <cond> THEN RAISE EXCEPTION …; END IF; END $$;` block **inside the apply transaction**. Rowcounts are taken with `GET DIAGNOSTICS … = ROW_COUNT` from inside the same PL/pgSQL block that issues the statement — the only place that value is trustworthy. Pattern proven live by S1 (probe P3: `ERROR: P0001: A-PROBE FAILED: got 1, expected 99`). |
| **M-2** (high) | Execution channel unnamed. S1 proved live that two `execute_sql` calls land on **different pooled backends with different xids** (pid 3363924/xid 3869213 vs pid 3363941/xid 3869214) — a `BEGIN` in one call and a `COMMIT` in another **do not compose**. Statement-by-statement execution would commit A1 alone, leaving FB, IG **and** LI with **zero `is_current` rows**; `m.build_weekly_demand_grid`'s candidate CTE then produces no rows for those platforms and they **vanish from the demand grid with no error raised**. | Closed **twice over**: (a) §7 names the three sanctioned channels explicitly and makes any other channel a STOP; (b) **`G-ATOMIC` machine-enforces it** — step 0 records `pg_current_xact_id()` into a temp table and every mutating step re-asserts the current xid still equals it. Fragmented execution autocommits, mints a new xid, and aborts before mutating. Additionally **`A3c` detects the catastrophe state itself** (see S-3). |
| **M-3** (med) | A6 required comparing YouTube against a pre-apply baseline, but §6's designated baseline query filtered `WHERE platform IN ('facebook','instagram','linkedin')` — **excluding YouTube**. A named STOP had no data to evaluate against. | A6 no longer depends on any out-of-band baseline. Step 0 snapshots **the whole table, YouTube included**, into a temp table inside the transaction; A6 is a full-row symmetric-difference comparison against that snapshot plus a `count(*) = 5` check. §6's baseline query is **also** fixed (platform filter dropped) for the operator's out-of-band record. |

> **On S1's YouTube fingerprint `db67ce6cdfe394e80cbec9dcee422c22`:** recorded here for continuity only. The expression that generated it is not on record, so v3 **does not gate on it** — gating on a constant I cannot reproduce would re-commit the M-1 error in a new place. A6's in-transaction snapshot is strictly stronger and self-contained.

### Settled — not re-litigated here

No migration required (pure DML, zero DDL; ledger checked, no `cc-0079`/`slice_2` collision) · H2 confirmed and understated (`idx_platform_format_mix_default_current` is **non-unique** and keyed on **platform alone** — A3 is the only guard, which is exactly why M-1 mattered) · zero user triggers (all 8 are internal RI constraint triggers) · YouTube unreachable four independent ways · A5 numeric-exact at `numeric(5,2)` · INSERT column list complete · R1 cannot remove an original · **no security finding** — schema `t` grants USAGE to neither `anon`, `authenticated` nor `service_role`; nothing for this lane to fix.

---

## 1 · The harm, in slots (not percentages) — carried, S1-reproduced

The live grid PP receives today — `m.build_weekly_demand_grid('4036a6b5…', CURRENT_DATE)` — fed through the real allocator `m.allocate_week_formats(shares, 5)` (5 = PP's enabled slots/week/platform). Both read-only. This is what production computes right now:

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

**Independently reproduced by S1** (halt result §4): both tables match **character-for-character**, BEFORE re-run through the live allocator and AFTER simulated from the exact 7 proposed rows with no mutation. **N=5 confirmed** from `c.client_publish_schedule` — and S1 recorded a trap worth carrying: the grid's `weekly_slot_count` column is a **per-format** count (max 2), not the platform total; reading it as N would understate the cadence. The platform total is the sum, = 5.

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

**Derived output:**

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

**v3 change:** this derivation is no longer only a document. **`A-DERIV` re-runs it inside the apply transaction and aborts if it no longer yields the pinned 7-row payload** — closing O-4 ("confirm it still yields the §2 table" was eyeball, not mechanical).

> **Derivation scope note (v3, corrected):** the in-transaction `A-DERIV` restricts the derivation to `platform IN ('facebook','instagram','linkedin')`. YouTube is all-valid, so an unrestricted derivation would emit its 5 rows unchanged and they would show as a false symmetric difference against the 7-row payload. The §2 document query above is unrestricted **by design** (it is the evidence view, showing YouTube as unchanged); the assertion form must be restricted. Both are correct for their purpose.

---

## 3 · Constraint and structural facts (re-read live from `pg_catalog`, 2026-07-24)

Read via `pg_class`/`pg_namespace`/`pg_attribute`/`pg_constraint` — note `information_schema` is privilege-filtered and returns **zero rows** for schema `t` under the read-only role, which is itself corroboration of the no-security-finding conclusion.

**Column set — all 12, independently re-confirmed:**

| # | column | type | not null | default |
|---|---|---|---|---|
| 1 | `mix_default_id` | uuid | ✓ | `gen_random_uuid()` |
| 2 | `platform` | text | ✓ | — |
| 3 | `ice_format_key` | text | ✓ | — |
| 4 | `default_share_pct` | numeric(5,2) | ✓ | — |
| 5 | `evidence_source` | text | ✓ | — |
| 6 | `evidence_note` | text | — | — |
| 7 | `effective_from` | date | ✓ | `CURRENT_DATE` |
| 8 | `superseded_by` | uuid | — | — |
| 9 | `is_current` | boolean | ✓ | `true` |
| 10 | `notes` | text | — | — |
| 11 | `created_at` | timestamptz | ✓ | `now()` |
| 12 | `updated_at` | timestamptz | ✓ | `now()` |

> **INSERT completeness confirmed:** the NOT-NULL-without-default set is exactly `{platform, ice_format_key, default_share_pct, evidence_source}` — all four are supplied by §4/A2. No generated or identity columns. **No `updated_at` trigger exists**, so A1's explicit `updated_at = now()` is both correct and necessary.

**Constraints — all 6:**

| constraint | definition | on delete |
|---|---|---|
| `platform_format_mix_default_pkey` | `PRIMARY KEY (mix_default_id)` | — |
| `platform_format_mix_default_platform_ice_format_key_effecti_key` | `UNIQUE (platform, ice_format_key, effective_from)` | — |
| `platform_format_mix_default_default_share_pct_check` | `CHECK (default_share_pct >= 0 AND default_share_pct <= 100)` | — |
| `fk_platform_format_mix_default_platform` | `FK (platform) → t."5.0_social_platform"(platform_code)` | `a` = **NO ACTION** |
| `platform_format_mix_default_ice_format_key_fkey` | `FK (ice_format_key) → t."5.3_content_format"(ice_format_key)` | `a` = **NO ACTION** |
| `platform_format_mix_default_superseded_by_fkey` | `FK (superseded_by) → t.platform_format_mix_default(mix_default_id)` **(self-FK)** | `a` = **NO ACTION** |

**H1 — `UNIQUE (platform, ice_format_key, effective_from)`.** §4 inserts at `CURRENT_DATE`; all 17 current rows carry `effective_from = 2026-04-22`, so a **first** apply is safe — but a **same-day retry after a partial failure would violate this constraint**. Handled by A0 (now machine-enforced) plus true single-transaction atomicity (a failure leaves nothing to collide with).

**H2 — no partial-unique on `is_current`.** Only `idx_platform_format_mix_default_current`, a plain partial *index*, non-unique, keyed on **platform alone**. Nothing prevents two `is_current=true` rows for the same `(platform, format)`. A3 is the only guard.

**H3 — NEW in v3, discovered by S5: the self-FK is `NO ACTION`.** This has no effect on §4 as written (which never populates `superseded_by`), but it is **decisive for the S-2 decision** in §9 — see there.

**Sum-invariant view — usable, and better than expected.** `t.platform_format_mix_default_check` exists with definition:

```sql
 SELECT platform,
    sum(default_share_pct) AS total_share,
    count(*) AS format_count,
    CASE WHEN abs(sum(default_share_pct) - 100::numeric) < 0.01 THEN 'ok'::text
         ELSE 'INVALID - sum ' || sum(default_share_pct) || ' not within 0.01 tolerance of 100' END AS status
   FROM t.platform_format_mix_default
  WHERE is_current = true
  GROUP BY platform
  ORDER BY platform;
```

It exposes `platform · total_share · format_count · status`. A single assertion over this view therefore satisfies **A5** (sum), **S-3** (presence/absence) **and** **S-4** (assert via the schema's own declared invariant) simultaneously — and because the view `GROUP BY platform` over `is_current`, **a platform with zero current rows disappears from it entirely**, making the M-2 catastrophe directly detectable as a row-count check.

---

## 4 · The apply script — ONE transaction, ONE call (for the apply hand — NOT run here)

> **Submit this entire block as a SINGLE execution.** See §7 for the three sanctioned channels. Fragmented execution is a STOP condition **and** is machine-blocked by `G-ATOMIC`.
> The script produces **exactly one result set** — the final summary `SELECT` immediately before `COMMIT`. Every other statement returns no rows. Record that result set; it carries the 7 new UUIDs and the applied `effective_from` needed for rollback.

```sql
BEGIN;

-- ============================================================================
-- STEP 0 — transaction identity + in-transaction baselines (NO mutation yet)
-- ============================================================================

-- G-ATOMIC anchor. Every mutating step re-asserts the xid still equals this.
-- If §4 is fragmented across pooled calls, each fragment autocommits and mints
-- a new xid -> the next guard aborts BEFORE any further mutation.
CREATE TEMP TABLE _cc0079_s2_txn ON COMMIT DROP AS
SELECT pg_current_xact_id() AS xid, pg_backend_pid() AS pid, clock_timestamp() AS t0;

-- Full pre-apply snapshot of the ENTIRE table, YouTube included (closes M-3).
CREATE TEMP TABLE _cc0079_s2_before ON COMMIT DROP AS
SELECT mix_default_id, platform, ice_format_key, default_share_pct,
       effective_from, is_current, superseded_by, updated_at
  FROM t.platform_format_mix_default;

-- The 7 proposed rows, as DATA. Single source of truth for BOTH the INSERT and
-- the pre/post assertions -- the payload cannot drift between them.
CREATE TEMP TABLE _cc0079_s2_proposed(
  platform text, ice_format_key text, share numeric(5,2)) ON COMMIT DROP;
INSERT INTO _cc0079_s2_proposed VALUES
  ('facebook' ,'image_quote', 40.00),
  ('facebook' ,'carousel'   , 33.33),
  ('facebook' ,'text'       , 26.67),
  ('instagram','carousel'   , 60.00),
  ('instagram','image_quote', 40.00),
  ('linkedin' ,'text'       , 57.14),
  ('linkedin' ,'image_quote', 42.86);

-- The 17 identities A1 retires. Written ONCE (v2 duplicated this list between
-- §4 and §6, where the two copies could silently diverge).
CREATE TEMP TABLE _cc0079_s2_pinned(mix_default_id uuid) ON COMMIT DROP;
INSERT INTO _cc0079_s2_pinned VALUES
  ('750938ae-ee91-4558-9428-15f11bc6828f'),  -- facebook  animated_text_reveal      5.00
  ('6940b232-b7c3-41d7-afb7-540f006bde6a'),  -- facebook  carousel                 25.00
  ('8c111129-5f1b-4700-a2f2-c239a49bebda'),  -- facebook  image_quote              30.00
  ('64bb78b5-a049-4277-aa4f-e3e3d50c5473'),  -- facebook  text                     20.00
  ('7c240ff1-ec07-4c16-b2b4-4b30a044387d'),  -- facebook  video_short_kinetic      10.00
  ('f92a2422-7d27-4dd4-98f2-0c6e961d494f'),  -- facebook  video_short_kinetic_voice 10.00
  ('33281226-f582-492d-b508-dbbb4b428350'),  -- instagram animated_data            10.00
  ('7bf92ca2-6ed5-4e2a-b8e5-6c834251103f'),  -- instagram animated_text_reveal      5.00
  ('a56785a0-9249-4218-9d20-7144d81bec5a'),  -- instagram carousel                 30.00
  ('ba157a91-332b-440b-b4ee-58f3fb3e8a63'),  -- instagram image_quote              20.00
  ('59d3ae9b-9b5f-4cfa-92de-1e713274cab6'),  -- instagram video_short_kinetic      20.00
  ('70b7b142-56d4-448c-bd33-90e5d3ad5a66'),  -- instagram video_short_stat_voice   15.00
  ('a6d042d3-2372-4231-b08e-8b4c2e7a0cf1'),  -- linkedin  carousel                 40.00
  ('37e434ca-027e-4ef0-9a5d-7d45f2fe3032'),  -- linkedin  image_quote              15.00
  ('3cfb0ee5-a542-4770-8bc0-199ed9fec3c8'),  -- linkedin  text                     20.00
  ('54fbe956-17e9-415b-a4ce-d8fe1bf19cfa'),  -- linkedin  video_short_kinetic      15.00
  ('47154b81-ba1f-4a72-95d5-77480b8375b1');  -- linkedin  video_short_stat_voice   10.00

-- ============================================================================
-- A-DRIFT -- the §6 identity set must match live EXACTLY, both directions.
-- (v2 made this an eyeball step in §7; it is now a STOP the database enforces.)
-- ============================================================================
DO $$
DECLARE n_pinned int; n_live int; n_missing int; n_extra int;
BEGIN
  SELECT count(DISTINCT mix_default_id) INTO n_pinned FROM _cc0079_s2_pinned;
  IF n_pinned <> 17 THEN
    RAISE EXCEPTION 'A-DRIFT FAILED: pinned list holds % distinct ids, expected 17. ABORT.', n_pinned;
  END IF;

  SELECT count(*) INTO n_live FROM t.platform_format_mix_default
   WHERE is_current AND platform IN ('facebook','instagram','linkedin');
  IF n_live <> 17 THEN
    RAISE EXCEPTION 'A-DRIFT FAILED: live current FB/IG/LI rows = %, expected 17 -- the mix changed since authoring. ABORT and re-derive.', n_live;
  END IF;

  SELECT count(*) INTO n_missing FROM _cc0079_s2_pinned p
   WHERE NOT EXISTS (SELECT 1 FROM t.platform_format_mix_default d
                      WHERE d.mix_default_id = p.mix_default_id
                        AND d.is_current
                        AND d.platform IN ('facebook','instagram','linkedin'));
  IF n_missing <> 0 THEN
    RAISE EXCEPTION 'A-DRIFT FAILED: % pinned identity(ies) are not live-current. ABORT and re-derive.', n_missing;
  END IF;

  SELECT count(*) INTO n_extra FROM t.platform_format_mix_default d
   WHERE d.is_current AND d.platform IN ('facebook','instagram','linkedin')
     AND NOT EXISTS (SELECT 1 FROM _cc0079_s2_pinned p WHERE p.mix_default_id = d.mix_default_id);
  IF n_extra <> 0 THEN
    RAISE EXCEPTION 'A-DRIFT FAILED: % live-current row(s) are absent from the pinned list. ABORT and re-derive.', n_extra;
  END IF;
END $$;

-- ============================================================================
-- A-DERIV -- the live §2 renormalization must STILL yield the pinned payload.
-- (Closes O-4. If shares drifted, the packet is stale and this aborts.)
-- ============================================================================
DO $$
DECLARE n_diff int;
BEGIN
  WITH cur AS (
    SELECT d.platform, d.ice_format_key, d.default_share_pct,
           COALESCE((f.platform_support->>d.platform)::boolean, false) AS is_valid
      FROM t.platform_format_mix_default d
      JOIN t."5.3_content_format" f ON f.ice_format_key = d.ice_format_key
     WHERE d.is_current AND d.platform IN ('facebook','instagram','linkedin')
  ), tot AS (
    SELECT platform, SUM(default_share_pct) FILTER (WHERE is_valid) AS valid_sum
      FROM cur GROUP BY platform
  ), derived AS (
    SELECT c.platform, c.ice_format_key,
           ROUND(c.default_share_pct * 100.0 / t.valid_sum, 2)::numeric(5,2) AS share
      FROM cur c JOIN tot t USING (platform)
     WHERE c.is_valid
  )
  SELECT count(*) INTO n_diff FROM (
      (SELECT platform, ice_format_key, share FROM derived
       EXCEPT SELECT platform, ice_format_key, share FROM _cc0079_s2_proposed)
      UNION ALL
      (SELECT platform, ice_format_key, share FROM _cc0079_s2_proposed
       EXCEPT SELECT platform, ice_format_key, share FROM derived)
  ) x;

  IF n_diff <> 0 THEN
    RAISE EXCEPTION 'A-DERIV FAILED: the live renormalization no longer yields the pinned 7-row payload (% symmetric difference(s)). The packet is STALE. ABORT and re-derive.', n_diff;
  END IF;
END $$;

-- ============================================================================
-- A0 -- no collision at the target effective_from (H1)
-- ============================================================================
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM t.platform_format_mix_default
   WHERE platform IN ('facebook','instagram','linkedin')
     AND effective_from = CURRENT_DATE;
  IF n <> 0 THEN
    RAISE EXCEPTION 'A0 FAILED: % row(s) already exist at effective_from=% -- H1 UNIQUE(platform,ice_format_key,effective_from) would be violated. ABORT.', n, CURRENT_DATE;
  END IF;
END $$;

-- ============================================================================
-- A1 -- deactivate the 17 pinned rows. Rowcount asserted where it is real.
-- ============================================================================
DO $$
DECLARE v_anchor xid8; n int;
BEGIN
  SELECT xid INTO v_anchor FROM _cc0079_s2_txn;
  IF pg_current_xact_id() <> v_anchor THEN
    RAISE EXCEPTION 'G-ATOMIC FAILED at A1: transaction identity changed (anchor %, now %). §4 was NOT executed as one transaction. ABORT.', v_anchor, pg_current_xact_id();
  END IF;

  UPDATE t.platform_format_mix_default d
     SET is_current = false, updated_at = now()
    FROM _cc0079_s2_pinned p
   WHERE d.mix_default_id = p.mix_default_id;

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 17 THEN
    RAISE EXCEPTION 'A1 FAILED: deactivated % row(s), expected 17. ABORT.', n;
  END IF;
END $$;

-- ============================================================================
-- A2 -- insert the 7 renormalized rows, capturing their ids for rollback.
-- ============================================================================
DO $$
DECLARE v_anchor xid8;
BEGIN
  SELECT xid INTO v_anchor FROM _cc0079_s2_txn;
  IF pg_current_xact_id() <> v_anchor THEN
    RAISE EXCEPTION 'G-ATOMIC FAILED at A2: transaction identity changed (anchor %, now %). ABORT.', v_anchor, pg_current_xact_id();
  END IF;
END $$;

CREATE TEMP TABLE _cc0079_s2_inserted ON COMMIT DROP AS
WITH ins AS (
  INSERT INTO t.platform_format_mix_default
    (platform, ice_format_key, default_share_pct, evidence_source, evidence_note,
     effective_from, is_current)
  SELECT p.platform, p.ice_format_key, p.share,
         'cc-0079-slice-2',
         'renormalized vs platform_support (Fault A)',
         CURRENT_DATE, true
    FROM _cc0079_s2_proposed p
  RETURNING mix_default_id, platform, ice_format_key, default_share_pct, effective_from
)
SELECT * FROM ins;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM _cc0079_s2_inserted;
  IF n <> 7 THEN
    RAISE EXCEPTION 'A2 FAILED: inserted % row(s), expected 7. ABORT.', n;
  END IF;
END $$;

-- ============================================================================
-- A3 / A3b / A3c / A5 -- uniqueness, PRESENCE, and the schema's own invariant.
-- A3c is the direct detector for the M-2 catastrophe: a platform with zero
-- current rows vanishes from the view and would silently vanish from the grid.
-- ============================================================================
DO $$
DECLARE n_dup int; n_plat int; r record;
BEGIN
  -- A3 (H2 guard): no (platform, format) pair may have >1 current row
  SELECT count(*) INTO n_dup FROM (
    SELECT platform, ice_format_key FROM t.platform_format_mix_default
     WHERE is_current GROUP BY 1,2 HAVING count(*) > 1) d;
  IF n_dup <> 0 THEN
    RAISE EXCEPTION 'A3 FAILED: % (platform,format) pair(s) hold more than one current row. ABORT.', n_dup;
  END IF;

  -- A3c (S-3 absence guard): all four platforms must still be represented
  SELECT count(*) INTO n_plat FROM t.platform_format_mix_default_check;
  IF n_plat <> 4 THEN
    RAISE EXCEPTION 'A3c FAILED: only % platform(s) hold current rows, expected 4 (facebook/instagram/linkedin/youtube). A platform with zero current rows disappears from m.build_weekly_demand_grid SILENTLY. ABORT.', n_plat;
  END IF;

  -- A3b (S-3 presence) + A5/S-4 (sum, via the schema's own declared invariant)
  FOR r IN SELECT platform, format_count, total_share, status
             FROM t.platform_format_mix_default_check ORDER BY platform
  LOOP
    IF r.status <> 'ok' THEN
      RAISE EXCEPTION 'A5 FAILED: platform % -- % (total_share=%)', r.platform, r.status, r.total_share;
    END IF;
    IF r.platform = 'facebook'  AND r.format_count <> 3 THEN
      RAISE EXCEPTION 'A3b FAILED: facebook holds % current rows, expected 3. ABORT.', r.format_count; END IF;
    IF r.platform = 'instagram' AND r.format_count <> 2 THEN
      RAISE EXCEPTION 'A3b FAILED: instagram holds % current rows, expected 2. ABORT.', r.format_count; END IF;
    IF r.platform = 'linkedin'  AND r.format_count <> 2 THEN
      RAISE EXCEPTION 'A3b FAILED: linkedin holds % current rows, expected 2. ABORT.', r.format_count; END IF;
    IF r.platform = 'youtube'   AND r.format_count <> 5 THEN
      RAISE EXCEPTION 'A3b FAILED: youtube holds % current rows, expected 5. ABORT.', r.format_count; END IF;
    IF r.platform NOT IN ('facebook','instagram','linkedin','youtube') THEN
      RAISE EXCEPTION 'A3b FAILED: unexpected platform % holds current rows. ABORT.', r.platform; END IF;
  END LOOP;
END $$;

-- ============================================================================
-- A4 -- every current row must be platform-publishable
-- ============================================================================
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM t.platform_format_mix_default d
    JOIN t."5.3_content_format" f ON f.ice_format_key = d.ice_format_key
   WHERE d.is_current
     AND COALESCE((f.platform_support->>d.platform)::boolean, false) = false;
  IF n <> 0 THEN
    RAISE EXCEPTION 'A4 FAILED: % current row(s) reference a format the platform cannot publish. ABORT.', n;
  END IF;
END $$;

-- ============================================================================
-- A6 -- YouTube untouched, vs the in-transaction snapshot (closes M-3).
-- No external fingerprint constant is trusted.
-- ============================================================================
DO $$
DECLARE n_yt int; n_diff int;
BEGIN
  SELECT count(*) INTO n_yt FROM t.platform_format_mix_default WHERE platform = 'youtube';
  IF n_yt <> 5 THEN
    RAISE EXCEPTION 'A6 FAILED: youtube row count is %, expected 5. ABORT.', n_yt;
  END IF;

  SELECT count(*) INTO n_diff FROM (
    (SELECT mix_default_id, platform, ice_format_key, default_share_pct,
            effective_from, is_current, superseded_by, updated_at
       FROM _cc0079_s2_before WHERE platform = 'youtube'
     EXCEPT
     SELECT mix_default_id, platform, ice_format_key, default_share_pct,
            effective_from, is_current, superseded_by, updated_at
       FROM t.platform_format_mix_default WHERE platform = 'youtube')
    UNION ALL
    (SELECT mix_default_id, platform, ice_format_key, default_share_pct,
            effective_from, is_current, superseded_by, updated_at
       FROM t.platform_format_mix_default WHERE platform = 'youtube'
     EXCEPT
     SELECT mix_default_id, platform, ice_format_key, default_share_pct,
            effective_from, is_current, superseded_by, updated_at
       FROM _cc0079_s2_before WHERE platform = 'youtube')
  ) x;
  IF n_diff <> 0 THEN
    RAISE EXCEPTION 'A6 FAILED: % youtube row difference(s) vs the pre-apply snapshot. ABORT.', n_diff;
  END IF;
END $$;

-- ============================================================================
-- A7 -- the committed FB/IG/LI current state must EQUAL the §2 payload exactly
-- ============================================================================
DO $$
DECLARE n_diff int;
BEGIN
  SELECT count(*) INTO n_diff FROM (
    (SELECT platform, ice_format_key, default_share_pct
       FROM t.platform_format_mix_default
      WHERE is_current AND platform IN ('facebook','instagram','linkedin')
     EXCEPT SELECT platform, ice_format_key, share FROM _cc0079_s2_proposed)
    UNION ALL
    (SELECT platform, ice_format_key, share FROM _cc0079_s2_proposed
     EXCEPT
     SELECT platform, ice_format_key, default_share_pct
       FROM t.platform_format_mix_default
      WHERE is_current AND platform IN ('facebook','instagram','linkedin'))
  ) x;
  IF n_diff <> 0 THEN
    RAISE EXCEPTION 'A7 FAILED: post-apply current FB/IG/LI state differs from the proposed payload in % row(s). ABORT.', n_diff;
  END IF;
END $$;

-- ============================================================================
-- A8 -- blast-radius fence: nothing outside this lane's intent was mutated
-- ============================================================================
DO $$
DECLARE n_before int; n_total int; n_lost int; n_changed int;
BEGIN
  SELECT count(*) INTO n_before FROM _cc0079_s2_before;
  SELECT count(*) INTO n_total  FROM t.platform_format_mix_default;
  IF n_total <> n_before + 7 THEN
    RAISE EXCEPTION 'A8 FAILED: table holds % row(s), expected % (pre-apply % + 7). ABORT.', n_total, n_before + 7, n_before;
  END IF;

  SELECT count(*) INTO n_lost FROM _cc0079_s2_before b
   WHERE NOT EXISTS (SELECT 1 FROM t.platform_format_mix_default d
                      WHERE d.mix_default_id = b.mix_default_id);
  IF n_lost <> 0 THEN
    RAISE EXCEPTION 'A8 FAILED: % pre-existing row(s) no longer exist -- this lane deletes nothing. ABORT.', n_lost;
  END IF;

  SELECT count(*) INTO n_changed
    FROM _cc0079_s2_before b
    JOIN t.platform_format_mix_default d USING (mix_default_id)
   WHERE (b.platform, b.ice_format_key, b.default_share_pct, b.effective_from, b.superseded_by)
      IS DISTINCT FROM
         (d.platform, d.ice_format_key, d.default_share_pct, d.effective_from, d.superseded_by);
  IF n_changed <> 0 THEN
    RAISE EXCEPTION 'A8 FAILED: % pre-existing row(s) had an immutable column changed. This lane may only flip is_current/updated_at on the 17. ABORT.', n_changed;
  END IF;
END $$;

-- ============================================================================
-- FINAL -- the ONLY result set. RECORD THIS OUTPUT (rollback depends on it).
-- ============================================================================
SELECT 'APPLY OK -- all assertions passed'                    AS status,
       (SELECT count(*) FROM _cc0079_s2_pinned)               AS rows_retired,
       (SELECT count(*) FROM _cc0079_s2_inserted)             AS rows_inserted,
       (SELECT min(effective_from) FROM _cc0079_s2_inserted)  AS applied_effective_from,
       (SELECT xid FROM _cc0079_s2_txn)                       AS txn_xid,
       (SELECT jsonb_agg(jsonb_build_object(
                 'id', mix_default_id, 'platform', platform,
                 'format', ice_format_key, 'share', default_share_pct)
               ORDER BY platform, ice_format_key)
          FROM _cc0079_s2_inserted)                           AS new_rows;

COMMIT;
```

YouTube is deliberately untouched — and now provably so, by A6 against a snapshot taken inside the same transaction.

---

## 5 · Assertion register — every STOP, and where it is enforced

Every row below is executable code in §4. **None is a comment.** This table is the direct answer to M-1.

| # | Assertion | Expected | Enforcement | Closes |
|---|---|---|---|---|
| **G-ATOMIC** | current xid == the xid anchored at step 0 | equal | `RAISE` in A1 and A2 blocks; plus every step depends on step-0 temp tables | **M-2** |
| **A-DRIFT** | pinned 17 == live current FB/IG/LI, both directions; pinned list has 17 distinct ids | 17 / 17 / 0 missing / 0 extra | `RAISE` × 4 | v2 §6 eyeball STOP |
| **A-DERIV** | live renormalization still yields the pinned 7-row payload | 0 symmetric differences | `RAISE` | **O-4** |
| **A0** | no row at target `effective_from` (H1) | 0 | `RAISE` | v2 comment |
| **A1** | rows deactivated by identity | exactly **17** | `GET DIAGNOSTICS` + `RAISE` | **M-1** |
| **A2** | rows inserted | exactly **7** | count over capture table + `RAISE` | **M-1** |
| **A3** | no `(platform, format)` pair has >1 current row (H2) | 0 | `RAISE` | **M-1** |
| **A3b** | current rows per platform: FB **3** · IG **2** · LI **2** · YT **5**; no unexpected platform | exact | `RAISE` in loop | **S-3** |
| **A3c** | platforms holding current rows | exactly **4** | `RAISE` | **S-3**, M-2 detector |
| **A4** | every current row is platform-publishable | 0 violations | `RAISE` | **M-1** |
| **A5** | per-platform sum invariant, via `t.platform_format_mix_default_check` | `status = 'ok'` for all 4 | `RAISE` in loop | **M-1**, **S-4** |
| **A6** | YouTube identical to the in-transaction pre-apply snapshot | 5 rows, 0 differences | `RAISE` × 2 | **M-3** |
| **A7** | committed FB/IG/LI current state == §2 payload | 0 differences | `RAISE` | belt-and-braces |
| **A8** | total = pre + 7 · nothing deleted · no immutable column changed on any pre-existing row | exact | `RAISE` × 3 | blast-radius fence |

**Failure semantics:** any `RAISE EXCEPTION` aborts the entire call; the open transaction is rolled back and **nothing commits**. Proven live by S1 (probe P3). There is no path in which a subset of §4 commits, provided §4 is submitted through a sanctioned channel — and `G-ATOMIC` aborts it if it is not.

---

## 6 · Rollback

### 6.1 — Primary rollback (run as ONE call, same channel rules as §4)

```sql
BEGIN;

CREATE TEMP TABLE _cc0079_s2_rb_txn ON COMMIT DROP AS SELECT pg_current_xact_id() AS xid;

CREATE TEMP TABLE _cc0079_s2_pinned(mix_default_id uuid) ON COMMIT DROP;
INSERT INTO _cc0079_s2_pinned VALUES
  ('750938ae-ee91-4558-9428-15f11bc6828f'),('6940b232-b7c3-41d7-afb7-540f006bde6a'),
  ('8c111129-5f1b-4700-a2f2-c239a49bebda'),('64bb78b5-a049-4277-aa4f-e3e3d50c5473'),
  ('7c240ff1-ec07-4c16-b2b4-4b30a044387d'),('f92a2422-7d27-4dd4-98f2-0c6e961d494f'),
  ('33281226-f582-492d-b508-dbbb4b428350'),('7bf92ca2-6ed5-4e2a-b8e5-6c834251103f'),
  ('a56785a0-9249-4218-9d20-7144d81bec5a'),('ba157a91-332b-440b-b4ee-58f3fb3e8a63'),
  ('59d3ae9b-9b5f-4cfa-92de-1e713274cab6'),('70b7b142-56d4-448c-bd33-90e5d3ad5a66'),
  ('a6d042d3-2372-4231-b08e-8b4c2e7a0cf1'),('37e434ca-027e-4ef0-9a5d-7d45f2fe3032'),
  ('3cfb0ee5-a542-4770-8bc0-199ed9fec3c8'),('54fbe956-17e9-415b-a4ce-d8fe1bf19cfa'),
  ('47154b81-ba1f-4a72-95d5-77480b8375b1');

-- R1 -- remove the 7 rows this apply created.
--   Deterministic predicate (S-1): evidence_source='cc-0079-slice-2' returns
--   ZERO rows pre-apply, so combined with the applied effective_from it can
--   only ever match this apply's own rows. This works even if the apply
--   session was lost and the 7 ids were never recorded.
--   >>> SET :apply_date TO THE applied_effective_from FROM §4's FINAL OUTPUT <<<
DO $$
DECLARE n int;
BEGIN
  DELETE FROM t.platform_format_mix_default
   WHERE evidence_source = 'cc-0079-slice-2'
     AND effective_from  = DATE '2026-07-24';   -- <-- REPLACE with applied_effective_from
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 7 THEN
    RAISE EXCEPTION 'R1 FAILED: deleted % row(s), expected 7. Verify the apply date and the evidence_source. ABORT.', n;
  END IF;
END $$;

-- R2 -- reactivate the 17 originals by the SAME pinned identity list
DO $$
DECLARE n int;
BEGIN
  UPDATE t.platform_format_mix_default d
     SET is_current = true, updated_at = now()
    FROM _cc0079_s2_pinned p
   WHERE d.mix_default_id = p.mix_default_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 17 THEN
    RAISE EXCEPTION 'R2 FAILED: reactivated % row(s), expected 17. ABORT.', n;
  END IF;
END $$;

-- R3 -- assert the pre-apply state is restored (machine-enforced, not eyeball)
DO $$
DECLARE n_live int; n_plat int; n_dup int; r record;
BEGIN
  SELECT count(*) INTO n_live FROM t.platform_format_mix_default
   WHERE is_current AND platform IN ('facebook','instagram','linkedin');
  IF n_live <> 17 THEN RAISE EXCEPTION 'R3 FAILED: % current FB/IG/LI rows, expected 17. ABORT.', n_live; END IF;

  SELECT count(*) INTO n_dup FROM (
    SELECT platform, ice_format_key FROM t.platform_format_mix_default
     WHERE is_current GROUP BY 1,2 HAVING count(*) > 1) d;
  IF n_dup <> 0 THEN RAISE EXCEPTION 'R3 FAILED: % duplicate current pair(s). ABORT.', n_dup; END IF;

  SELECT count(*) INTO n_plat FROM t.platform_format_mix_default_check;
  IF n_plat <> 4 THEN RAISE EXCEPTION 'R3 FAILED: % platform(s) with current rows, expected 4. ABORT.', n_plat; END IF;

  FOR r IN SELECT platform, format_count, status FROM t.platform_format_mix_default_check LOOP
    IF r.status <> 'ok' THEN RAISE EXCEPTION 'R3 FAILED: platform % -- %', r.platform, r.status; END IF;
    IF r.platform='facebook'  AND r.format_count<>6 THEN RAISE EXCEPTION 'R3 FAILED: facebook % rows, expected 6', r.format_count; END IF;
    IF r.platform='instagram' AND r.format_count<>6 THEN RAISE EXCEPTION 'R3 FAILED: instagram % rows, expected 6', r.format_count; END IF;
    IF r.platform='linkedin'  AND r.format_count<>5 THEN RAISE EXCEPTION 'R3 FAILED: linkedin % rows, expected 5', r.format_count; END IF;
    IF r.platform='youtube'   AND r.format_count<>5 THEN RAISE EXCEPTION 'R3 FAILED: youtube % rows, expected 5', r.format_count; END IF;
  END LOOP;
END $$;

SELECT 'ROLLBACK OK -- pre-apply state restored' AS status,
       (SELECT jsonb_agg(jsonb_build_object('platform',platform,'formats',format_count,'sum',total_share,'status',status) ORDER BY platform)
          FROM t.platform_format_mix_default_check) AS restored_state;

COMMIT;
```

> **R3's expected pre-apply counts are FB 6 · IG 6 · LI 5 · YT 5 = 22**, and all four sums return to 100.00 (FB `5+25+30+20+10+10` · IG `10+5+30+20+20+15` · LI `40+15+20+15+10` · YT unchanged). These are the counts recorded live by S1, not assumptions.

### 6.2 — Rollback residual (S-5, explicitly named)

Rollback is **not** byte-for-byte. **`updated_at` is the only column that does not return to its pre-apply value** — the 17 originals carried a uniform `2026-04-22 07:43:18.946303+00` and will carry the rollback's `now()` instead. `created_at`, `effective_from`, shares, keys and identities are all untouched. v2's §6 said "no data destroyed" — true, and now stated completely. Nothing else is residual; R1 deletes only the apply's own 7 rows, which cannot include an original (they are `gen_random_uuid()`-minted and disjoint from the 17).

### 6.3 — Out-of-band baseline capture (M-3 fix, for the operator's record)

Capture immediately before the apply. **The `WHERE platform IN (…)` filter is removed** — that filter is what made v2's A6 unevaluatable:

```sql
SELECT mix_default_id, platform, ice_format_key, default_share_pct,
       effective_from, is_current, superseded_by, updated_at
  FROM t.platform_format_mix_default
 ORDER BY platform, ice_format_key;
```

This is a convenience record only. **A6 does not depend on it** — it uses the in-transaction snapshot, which cannot be forgotten or mis-scoped.

### 6.4 — Pinned identity list (the 17 current rows, `effective_from = 2026-04-22`)

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

**Drift STOP:** enforced in code by `A-DRIFT`. If this set does not match live at apply time, the transaction aborts before mutating anything.

---

## 7 · Execution control (SoD + named channel)

Policy change across platforms → **SoD ON**, same shape as cc-0080. **Apply hand ≠ author hand.** S5 authored; **S1 applies**.

### 7.1 — Sanctioned channels (M-2 closure, prose half)

§4 **must** be submitted so that all statements share one backend session and one transaction. Exactly three channels qualify:

| # | Channel | Condition |
|---|---|---|
| **C-1** | A **single** `mcp__supabase__execute_sql` call carrying the entire §4 script | Proven to compose by S1 probe P2 — 5 statements, one session, one xid `3869215`, pid `3363943` |
| **C-2** | `psql` executing the script as one file | `psql -v ON_ERROR_STOP=1 -f <script>` — one session |
| **C-3** | The Supabase SQL Editor, whole script pasted and run **once** | One run action only |

**FORBIDDEN — this is a STOP condition:** statement-by-statement execution, splitting §4 across two or more calls, pressing "run" more than once for §4, or any channel not listed above. S1 proved that two `execute_sql` calls land on **different pooled backends** (pid 3363924/xid 3869213 → pid 3363941/xid 3869214); a `BEGIN` in one and a `COMMIT` in another **do not compose**.

**The channel rule is also machine-enforced** by `G-ATOMIC` — it does not rely on the operator remembering it.

### 7.2 — Sequence

1. Re-hash this packet **from a ref** (`git show <ref>:docs/briefs/cc-0079-slice-2-apply-packet-v3.md`), not from the working tree. Must equal the freeze block. **Mismatch → STOP.**
2. Confirm target project `mbkmaxqhsohbtwsqolns` (`content_engine`). **Different project → STOP.**
3. Confirm the fresh external review's `reviewed_input_hash` equals this packet's sha256 (§11). **Mismatch or missing → STOP.**
4. Confirm `db-rls-auditor` returned normalized `clean` **against this hash**. **Any other verdict → STOP.**
5. Capture the §6.3 out-of-band baseline.
6. **PK apply gate.**
7. Execute §4 through **one** channel from §7.1. Record the final result set verbatim.
8. Post-apply proof: re-run the §1 allocator comparison — every platform must show **0 invalid of 5**.

### 7.3 — STOP conditions

Packet hash mismatch · review hash mismatch, missing or non-clean · `db-rls-auditor` not `clean` on this hash · wrong project · any channel outside §7.1 · **any `RAISE EXCEPTION` from §4** (the transaction has already rolled back; do not retry without re-deriving) · post-apply allocator proof not 0-invalid · unexpected origin movement on the packet's ref.

A tripped STOP voids the remainder of the sequence; resumption requires a fresh PK gate (Convention 2).

### 7.4 — Privilege precondition

§4 reads `t.platform_format_mix_default_check` and `t."5.3_content_format"` and writes `t.platform_format_mix_default`. Schema `t` grants USAGE to **none** of `anon`, `authenticated`, `service_role` — the apply must run under the privileged role the sanctioned channels already use. A `42501 permission denied for schema t` at step 0 means the channel is running as the wrong role: **STOP**, do not widen any grant to make it pass.

---

## 8 · The §8 `policy_decision` is CLOSED — do not re-raise it

v2 §8 carried this as an open PK `policy_decision`. **It is closed.** PK **ruled at v6.22** (commit `ad4a6a9`), *before* the S1 apply lane opened:

> **Facebook 3 valid formats · Instagram 2 · LinkedIn 2** — accepted scope for this slice, and **explicitly not a permanent ceiling** on future formats.

S1 re-verified live `platform_support` against that ruling and it matches exactly. The renormalization collapses valid inventory to those counts; that is truthful, because the removed diversity was never publishable. It intersects open **Q4** (`animated_text_reveal` / `animated_data` are supported on **zero** platforms and are removed from FB/IG here regardless of how Q4 resolves) — Q4 remains open and is **not** decided by this packet.

*Correction of record:* `db-rls-auditor` treated this item as open — correctly, since the ruling post-dates the packet it audited and sits outside its remit. Successor docs must not reproduce the error.

---

## 9 · OPEN — PK decision required: `superseded_by` lineage (S-2)

**This packet does not decide it.** S5 surfaces it with the facts and declines to choose.

`superseded_by uuid` is the table's designed lineage column. §4 leaves it NULL. The mapping is not 1:1 — **17 retired rows → 7 successors**; 10 retired formats have no successor by design (they are unpublishable on that platform and are not replaced). So at most **7** of 17 links are populatable. **Once committed without it, the retired→successor relationship is not reconstructible from data alone** — only from this document.

**Draft implementation, for evaluation only — NOT part of §4:**

```sql
-- Would be inserted after A2 and before A3, inside the same transaction.
DO $$
DECLARE n int;
BEGIN
  UPDATE t.platform_format_mix_default d
     SET superseded_by = i.mix_default_id
    FROM _cc0079_s2_inserted i, _cc0079_s2_pinned p
   WHERE d.mix_default_id = p.mix_default_id
     AND d.platform       = i.platform
     AND d.ice_format_key = i.ice_format_key;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 7 THEN
    RAISE EXCEPTION 'S2 FAILED: linked % lineage row(s), expected 7. ABORT.', n;
  END IF;
END $$;
```

**⚠ Material consequence S5 discovered — this was NOT in the carry, and it changes the trade-off.** The self-FK `platform_format_mix_default_superseded_by_fkey` is **`ON DELETE NO ACTION`** (`confdeltype = 'a'`, re-read live from `pg_constraint` this turn). If lineage is populated, the 17 retired rows hold FK references to the 7 new rows — so **§6.1's `R1` DELETE would fail with a foreign-key violation and the rollback would not run as written.** Electing S-2 therefore requires R1 to null the references first:

```sql
UPDATE t.platform_format_mix_default SET superseded_by = NULL
 WHERE superseded_by IN (SELECT mix_default_id FROM t.platform_format_mix_default
                          WHERE evidence_source='cc-0079-slice-2' AND effective_from = DATE '<apply date>');
```

**PK's options:**

| | Choice | Consequence |
|---|---|---|
| **A** | **Ship v3 as written** (no lineage) | Rollback stays exactly as proven. Lineage lives only in this document. Recoverable later only by a separate backfill lane, which would need this doc as its source. |
| **B** | **Elect S-2** | Lineage is durable in data. **Requires a v4 re-cut** (§4 and §6.1 both change) ⇒ new sha256 ⇒ new external review ⇒ new `db-rls-auditor` run. Adds an FK-ordering step to the rollback. |

**S5 recommends PK choose explicitly rather than by omission** — that is precisely how the column came to be unused in the first place. S5 does not recommend which.

---

## 10 · Defect closure matrix

| Item | Severity | Status in v3 | Where |
|---|---|---|---|
| **M-1** assertions were comments, not enforcement | high | **CLOSED** — 14 machine-enforced assertions, `GET DIAGNOSTICS` for rowcounts | §4, §5 |
| **M-2** execution channel unnamed / cannot hold the transaction | high | **CLOSED twice** — `G-ATOMIC` xid guard + three named channels + structural temp-table dependency; `A3c` detects the catastrophe state directly | §4 G-ATOMIC/A3c, §7.1 |
| **M-3** A6 unevaluatable (baseline excluded YouTube) | med | **CLOSED** — in-transaction full-table snapshot; §6.3 filter also removed | §4 A6, §6.3 |
| **S-1** deterministic rollback fallback | should | **ADOPTED** — R1 uses the `evidence_source` + `effective_from` predicate, survives a lost apply session | §6.1 R1 |
| **S-2** `superseded_by` lineage | should | **SURFACED, NOT DECIDED** — PK decision, with a newly-discovered FK consequence | §9 |
| **S-3** A3 detects duplicates but not absence | should (effectively must, given M-2) | **ADOPTED** — `A3b` exact per-platform counts + `A3c` four-platform presence | §4 A3b/A3c |
| **S-4** assert via `t.platform_format_mix_default_check` | should | **ADOPTED** — A5 asserts the schema's own declared invariant, view definition re-read live | §4 A5, §3 |
| **S-5** rollback residual unnamed | should | **ADOPTED** — `updated_at` named as the sole non-restoring column | §6.2 |
| **O-4** "confirm it still yields §2" was eyeball | obs | **CLOSED** — `A-DERIV` re-runs the derivation in-transaction and aborts on drift | §4 A-DERIV |
| **§8 policy_decision** | — | **CLOSED by PK at v6.22** — not carried forward as open | §8 |

**Added beyond the carry (S5):** `A7` (committed state == payload), `A8` (blast-radius fence: nothing deleted, no immutable column changed, exact row delta), `A-DRIFT` (v2's eyeball drift STOP made executable), single-source-of-truth temp tables (v2 duplicated the 17-id list across §4 and §6 where the copies could diverge), and the §9 self-FK finding.

---

## 11 · Review status — the v2 review is STALE

**`db-rls-auditor` must be re-run against this packet's hash, and a fresh external review is mandatory.**

- External review **`f46949d3-eb68-4a78-9fa9-68381b4f8608` is STALE.** It is valid **only** for v2's `73dd7413cad6a8a340838d8eb510b82dbc2ad9b3287026ad3930a4fbacc97637` (CLAUDE.md external-review rules 1 and 4: a review is valid only for the exact `reviewed_input_hash`; §4 changed, so the approval does not carry). **It must not be cited for v3 under any circumstances.**
- A **fresh external review** pinned to v3's sha256 (freeze block below) is required. **The orchestrator runs it — not S5, and not the apply hand.**
- **`db-rls-auditor` re-run** against v3's hash is required. Cheap: the live-state facts hold absent drift, and A-DRIFT/A-DERIV now make drift self-detecting.
- Only then the **PK apply gate**.

---

## 12 · Non-claims

Nothing applied. **No DML executed, no row mutated, no schema touched, no commit, no push, no deploy, no migration.** S5 ran only read-only catalog queries (`pg_views`, `pg_attribute`, `pg_constraint`, `pg_class`, `information_schema.columns`) through the allowlisted read-only path; no production table was written and no residue was left. The §4 and §6 scripts have **not** been executed in any form — their primitives (`DO`/`RAISE EXCEPTION`, single-call transaction composition, `ON COMMIT DROP` temp tables) were proven by S1's probes P1–P3, but **this specific script has not been run**, and `A-DERIV`/`A-DRIFT`/`A7`/`A8` are new code that has never executed. That is what the fresh `db-rls-auditor` pass and the PK gate are for.

This packet does not approve, ratify or authorise the apply. It does not decide S-2 (§9) or Q4. It does not change the mix function, client overrides (none exist), the Advisor (Slice 1 → S3), or transport. Only PP is `format_mix` enrolled today; the §1 allocation comparison uses N=5 and the live grid shares, and other clients/cadences differ. All counts, IDs and shares are live as of **2026-07-24** and are re-verified **by the script itself** at apply time. The durable fix — a `platform_support` intersection inside `m.build_weekly_demand_grid` — remains a named **code** successor, out of this data-only scope. This lane is not combined with Slice 1, cc-0080, or any other database window.

**Scope honesty:** when this applies, the schedule stops allocating unpublishable formats. It does **not** build platform+format planning in the dashboard UI — that is a separate scoping lane under PK priority 1.

---

## FREEZE BLOCK

```
artifact : docs/briefs/cc-0079-slice-2-apply-packet-v3.md
supersedes: docs/briefs/cc-0079-slice-2-apply-packet-v2.md (73dd7413cad6a8a340838d8eb510b82dbc2ad9b3287026ad3930a4fbacc97637, 14191 B) -- NOT overwritten
author   : S5 (re-cut author; NOT the apply hand)
apply by : S1 (segregation of duties)
base     : CE HEAD == origin/main == ad4a6a944027897672764c1540f53890e027c2ee (v6.22), parity 0/0
target   : project mbkmaxqhsohbtwsqolns (content_engine)
sha256   : carried OUT-OF-BAND in the S5 handoff line (a file cannot contain its own hash).
           Verify with: python -c "import hashlib;print(hashlib.sha256(open(r'docs/briefs/cc-0079-slice-2-apply-packet-v3.md','rb').read()).hexdigest())"
           Any byte change to this file invalidates the pinned hash AND every review pinned to it.
bytes    : carried OUT-OF-BAND in the S5 handoff line.
review   : REQUIRED, NOT YET RUN. v2's review f46949d3-eb68-4a78-9fa9-68381b4f8608 is STALE and must not be cited.
auditor  : db-rls-auditor re-run REQUIRED against this hash.
status   : NOT APPLIED
```
