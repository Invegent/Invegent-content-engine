# cc-0079 Slice 2 — Apply Packet v4 (data-only mix renormalization)

> **Lane:** cc-0079 Slice 2 · **Type:** APPLY packet (DML + SoD control) · **Tier:** T3 (policy change across platforms → SoD control ON)
> **Supersedes:** apply packet v2 (`73dd7413cad6a8a340838d8eb510b82dbc2ad9b3287026ad3930a4fbacc97637`, 14191 B) — committed, pinned by a review, **not overwritten**. Also supersedes the **withdrawn** v3 (`6ab25793d1f4f257bb8e5c780b3a582ca70188b86728393a3481752f23d42d98`, 54711 B), which exceeded PK's authorization and was never reviewed. Analysis brief `eefd2f4e…` unchanged and still current.
> **Status:** author-only. **NOT APPLIED.** No DML executed, no commit, no push.
> **Author:** S5 (re-cut author). **S5 is NOT the apply hand — S1 is.** Segregation of duties: S1 found the defects and proved the remediation primitives; S1 authoring the fix would collapse author and executor into one hand on a T3 apply. **PK ruling: "S1 must not author or modify its own application packet."** This packet is therefore the one that applies as written — **anything ambiguous in it is a halt for S1, not a judgement call.**
> **Separate lanes — do not combine:** Slice 1 (`ai-worker`, S3) · cc-0080 (reconciler, S9) · any other database window.
> **Author base (stale-ref gate PASSED, independently re-derived):** CE `HEAD == origin/main == git ls-remote origin refs/heads/main == ad4a6a944027897672764c1540f53890e027c2ee`, parity 0/0, branch `main`. Target project `mbkmaxqhsohbtwsqolns` (`content_engine`). Catalog evidence re-read live 2026-07-24.

---

## 0 · Authorization — exactly what this re-cut was permitted to change

`db-rls-auditor` returned **`concerns`** at gate ④ of the S1 apply lane and halted it with **zero production mutation** (result: `docs/briefs/results/cc-0079-slice-2-apply-lane-halt-v1.md`).

**PK on the halt:** *"The halt was correct. A silent loss of Facebook, Instagram, and LinkedIn would have been materially worse than delaying Slice 2."*

**PK's exact scope for this re-cut:**

> *"The data payload and allocator table remain frozen. S5 may repair only:
> 1. single-call transaction containment
> 2. executable fail-closed assertions
> 3. the missing YouTube baseline"*

**Three repairs. That is the whole authorization.** S-3 (`count(*) = 7`) is folded into repair 2 by explicit instruction — it is not a separate item, because an assertion set that cannot detect **absence** is not fail-closed: v2's A3 is satisfied by the zero-current-rows state that is exactly the M-2 catastrophe.

**Everything else is deferred and named in §8.** S-1, S-2, S-4, S-5 and O-4 are **not implemented** here. S-2 in particular is **PK's call** and is surfaced in §9, not decided.

**The data payload is frozen and untouched.** The 17 pinned identities, the 7 proposed rows, the shares (FB 40.00/33.33/26.67 · IG 60.00/40.00 · LI 57.14/42.86) and YouTube-untouched were independently reproduced by S1 character-for-character, including the §1 allocator table (6 of 15 → 0 of 15, **verified, not carried**). **Not one share, key, UUID or allocation string is altered in this packet.**

### The three must-fix defects, and their closure

| # | Defect (v2) | Closure (v4) | PK repair |
|---|---|---|---|
| **M-1** (high) | §5 assertions were **SQL comments** — `-- must report exactly 17 rows updated, else ABORT` and `-- A3..A5 … BEFORE COMMIT`. No `RAISE`, no `DO`, no conditional. Every statement committed regardless. §7 named A1≠17 / A2≠7 / A3–A6 as STOPs and **none existed in the code.** The standing ICE failure mode *"declared control production never reads"*. | Every v2-named assertion and STOP is now a `DO $$ … IF <cond> THEN RAISE EXCEPTION …; END IF; END $$;` block **inside the apply transaction**. Rowcounts are taken with `GET DIAGNOSTICS … = ROW_COUNT` from inside the same PL/pgSQL block that issues the statement — the only place that value is trustworthy. Pattern proven live by S1 (probe P3: `ERROR: P0001: A-PROBE FAILED: got 1, expected 99`). | **2** |
| **M-2** (high) | Execution channel unnamed. S1 proved live that two `execute_sql` calls land on **different pooled backends with different xids** (pid 3363924/xid 3869213 vs pid 3363941/xid 3869214) — a `BEGIN` in one call and a `COMMIT` in another **do not compose**. Statement-by-statement execution would commit A1 alone, leaving FB, IG **and** LI with **zero `is_current` rows**; `m.build_weekly_demand_grid`'s candidate CTE then produces no rows for those platforms and they **vanish from the demand grid with no error raised**. | Closed **twice over**: (a) §7.1 names the three sanctioned channels and makes any other a STOP; (b) **`G-ATOMIC` machine-enforces it** — step 0 records `pg_current_xact_id()` into a temp table and every mutating step re-asserts the current xid still equals it, so fragmented execution autocommits, mints a new xid, and aborts **before** mutating. Additionally **`A3c` detects the catastrophe state itself** (the S-3 fold-in). | **1** + **2** |
| **M-3** (med) | A6 required comparing YouTube against a pre-apply baseline, but §6's designated baseline query filtered `WHERE platform IN ('facebook','instagram','linkedin')` — **excluding YouTube**. A named STOP had no data to evaluate against. | Step 0 snapshots the **whole table, YouTube included**, into a temp table inside the transaction; A6 is a full-row symmetric-difference comparison against that snapshot plus a `count(*) = 5` check. §6.3's out-of-band baseline query is **also** corrected (platform filter dropped). | **3** |

> **On S1's YouTube fingerprint `db67ce6cdfe394e80cbec9dcee422c22`:** recorded for continuity only. The expression that generated it is not on record, so v4 **does not gate on it** — gating on a constant that cannot be reproduced would re-commit the M-1 error in a new place. A6's in-transaction snapshot is self-contained and needs no external value.

### Settled — not re-litigated here

No migration required (pure DML, zero DDL; ledger checked, no `cc-0079`/`slice_2` collision) · H2 confirmed and understated (`idx_platform_format_mix_default_current` is **non-unique** and keyed on **platform alone** — A3 is the only guard, which is exactly why M-1 mattered) · zero user triggers (all 8 are internal RI constraint triggers) · YouTube unreachable four independent ways · A5 numeric-exact at `numeric(5,2)` · INSERT column list complete · R1 cannot remove an original · **no security finding** — schema `t` grants USAGE to neither `anon`, `authenticated` nor `service_role`; nothing for this lane to fix.

---

## 1 · The harm, in slots (not percentages) — FROZEN, S1-reproduced

**This table is frozen by PK instruction and is reproduced verbatim from v2.**

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

## 2 · Before/after shares — FROZEN, machine-derived (reproducible)

**This payload is frozen by PK instruction and is reproduced verbatim from v2.** The derivation query is retained as the evidence of how the numbers were produced:

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

> **Deferred (O-4):** v4 does **not** re-run this derivation inside the apply transaction. See §8 for what that costs and the manual pre-apply step that replaces it.

---

## 3 · Constraint and structural facts (re-read live from `pg_catalog`, 2026-07-24)

Read via `pg_class` / `pg_namespace` / `pg_attribute` / `pg_constraint` — note `information_schema` is privilege-filtered and returns **zero rows** for schema `t` under the read-only role, which is itself corroboration of the no-security-finding conclusion.

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

**H3 — the self-FK is `NO ACTION`.** No effect on §4 as written (which never populates `superseded_by`). **Decisive for the S-2 decision** — see §9.

---

## 4 · The apply script — ONE transaction, ONE call (for the apply hand — NOT run here)

> **Submit this entire block as a SINGLE execution.** See §7.1 for the three sanctioned channels. Fragmented execution is a STOP condition **and** is machine-blocked by `G-ATOMIC`.
> The script produces **exactly one result set** — the final summary `SELECT` immediately before `COMMIT`. Every other statement returns no rows. **Record that result set verbatim; the rollback in §6.1 depends on the 7 UUIDs it emits.**

```sql
BEGIN;

-- ============================================================================
-- STEP 0 -- transaction identity + in-transaction baselines (NO mutation yet)
-- ============================================================================

-- G-ATOMIC anchor (PK repair 1). Every mutating step re-asserts the xid still
-- equals this. If §4 is fragmented across pooled calls, each fragment
-- autocommits and mints a new xid -> the next guard aborts BEFORE mutating.
CREATE TEMP TABLE _cc0079_s2_txn ON COMMIT DROP AS
SELECT pg_current_xact_id() AS xid, pg_backend_pid() AS pid, clock_timestamp() AS t0;

-- Full pre-apply snapshot of the ENTIRE table, YouTube INCLUDED (PK repair 3).
CREATE TEMP TABLE _cc0079_s2_before ON COMMIT DROP AS
SELECT mix_default_id, platform, ice_format_key, default_share_pct,
       effective_from, is_current, superseded_by, updated_at
  FROM t.platform_format_mix_default;

-- The 7 proposed rows, as DATA -- FROZEN payload, identical to v2 §2.
-- Single source of truth for both the INSERT and the assertions, so the
-- payload cannot drift between them.
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

-- The 17 identities A1 retires -- FROZEN, identical to v2 §4/§6.
-- Written ONCE (v2 duplicated this list across §4 and §6, where the two
-- copies could silently diverge).
CREATE TEMP TABLE _cc0079_s2_pinned(mix_default_id uuid) ON COMMIT DROP;
INSERT INTO _cc0079_s2_pinned VALUES
  ('750938ae-ee91-4558-9428-15f11bc6828f'),  -- facebook  animated_text_reveal       5.00
  ('6940b232-b7c3-41d7-afb7-540f006bde6a'),  -- facebook  carousel                  25.00
  ('8c111129-5f1b-4700-a2f2-c239a49bebda'),  -- facebook  image_quote               30.00
  ('64bb78b5-a049-4277-aa4f-e3e3d50c5473'),  -- facebook  text                      20.00
  ('7c240ff1-ec07-4c16-b2b4-4b30a044387d'),  -- facebook  video_short_kinetic       10.00
  ('f92a2422-7d27-4dd4-98f2-0c6e961d494f'),  -- facebook  video_short_kinetic_voice 10.00
  ('33281226-f582-492d-b508-dbbb4b428350'),  -- instagram animated_data             10.00
  ('7bf92ca2-6ed5-4e2a-b8e5-6c834251103f'),  -- instagram animated_text_reveal       5.00
  ('a56785a0-9249-4218-9d20-7144d81bec5a'),  -- instagram carousel                  30.00
  ('ba157a91-332b-440b-b4ee-58f3fb3e8a63'),  -- instagram image_quote               20.00
  ('59d3ae9b-9b5f-4cfa-92de-1e713274cab6'),  -- instagram video_short_kinetic       20.00
  ('70b7b142-56d4-448c-bd33-90e5d3ad5a66'),  -- instagram video_short_stat_voice    15.00
  ('a6d042d3-2372-4231-b08e-8b4c2e7a0cf1'),  -- linkedin  carousel                  40.00
  ('37e434ca-027e-4ef0-9a5d-7d45f2fe3032'),  -- linkedin  image_quote               15.00
  ('3cfb0ee5-a542-4770-8bc0-199ed9fec3c8'),  -- linkedin  text                      20.00
  ('54fbe956-17e9-415b-a4ce-d8fe1bf19cfa'),  -- linkedin  video_short_kinetic       15.00
  ('47154b81-ba1f-4a72-95d5-77480b8375b1');  -- linkedin  video_short_stat_voice    10.00

-- ============================================================================
-- A-DRIFT -- v2 §7 named "§6 identity drift" as a STOP but never enforced it.
-- The pinned set must match live EXACTLY, both directions. (PK repair 2.)
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
-- A0 -- no collision at the target effective_from (H1). v2 had this as a bare
-- SELECT with a "-- must return 0, else ABORT" comment. (PK repair 2.)
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
-- A3 / A3b / A3c -- uniqueness, PRESENCE and ABSENCE.  A5 -- sum invariant.
--
-- A3b/A3c are the S-3 fold-in PK folded into repair 2: v2's A3 detects
-- duplicates but NOT absence, so it is satisfied by the zero-current-rows
-- state that is exactly the M-2 catastrophe. A3c is the direct detector --
-- a platform with no current rows vanishes from the demand grid SILENTLY.
-- ============================================================================
DO $$
DECLARE n_dup int; n_plat int; r record;
BEGIN
  -- A3 (H2 guard): no (platform, format) pair may hold more than one current row
  SELECT count(*) INTO n_dup FROM (
    SELECT platform, ice_format_key FROM t.platform_format_mix_default
     WHERE is_current GROUP BY 1,2 HAVING count(*) > 1) d;
  IF n_dup <> 0 THEN
    RAISE EXCEPTION 'A3 FAILED: % (platform,format) pair(s) hold more than one current row. ABORT.', n_dup;
  END IF;

  -- A3c ABSENCE guard: all four platforms must still hold current rows
  SELECT count(DISTINCT platform) INTO n_plat
    FROM t.platform_format_mix_default WHERE is_current;
  IF n_plat <> 4 THEN
    RAISE EXCEPTION 'A3c FAILED: only % platform(s) hold current rows, expected 4 (facebook/instagram/linkedin/youtube). A platform with zero current rows disappears from m.build_weekly_demand_grid SILENTLY. ABORT.', n_plat;
  END IF;

  -- A3b PRESENCE (exact counts) + A5 (per-platform sum), computed directly
  FOR r IN
    SELECT platform, count(*) AS format_count, sum(default_share_pct) AS total_share
      FROM t.platform_format_mix_default
     WHERE is_current
     GROUP BY platform
     ORDER BY platform
  LOOP
    -- A5: default_share_pct is numeric(5,2), exact decimal -- equality is safe
    IF r.total_share <> 100.00 THEN
      RAISE EXCEPTION 'A5 FAILED: platform % current shares sum to %, expected exactly 100.00. ABORT.', r.platform, r.total_share;
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
-- A6 -- YouTube untouched, vs the in-transaction snapshot (PK repair 3).
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
-- FINAL -- the ONLY result set. RECORD THIS OUTPUT VERBATIM.
-- The rollback in §6.1 requires the 7 UUIDs in new_rows.
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

YouTube is deliberately untouched — and now provably so, against a snapshot taken inside the same transaction.

---

## 5 · Assertion register — every STOP, and where it is enforced

Every row below is executable code in §4. **None is a comment.** This table is the direct answer to M-1.

| # | Assertion | Expected | Enforcement | v2 origin |
|---|---|---|---|---|
| **G-ATOMIC** | current xid == the xid anchored at step 0 | equal | `RAISE` in the A1 and A2 blocks; every step also structurally depends on step-0 temp tables | §7 *"run §4 in one transaction"* — unenforced |
| **A-DRIFT** | pinned 17 == live current FB/IG/LI, both directions; pinned list holds 17 distinct ids | 17 / 17 / 0 missing / 0 extra | `RAISE` × 4 | §6 Drift STOP / §7 STOP — unenforced |
| **A0** | no row at the target `effective_from` (H1) | 0 | `RAISE` | §4 bare SELECT + comment |
| **A1** | rows deactivated by identity | exactly **17** | `GET DIAGNOSTICS` + `RAISE` | §5 A1 / `-- must report exactly 17` |
| **A2** | rows inserted | exactly **7** | count over the capture table + `RAISE` | §5 A2 |
| **A3** | no `(platform, format)` pair holds >1 current row (H2) | 0 | `RAISE` | §5 A3 |
| **A3b** | current rows per platform: FB **3** · IG **2** · LI **2** · YT **5**; no unexpected platform | exact | `RAISE` in loop | **S-3 fold-in** (PK-directed) |
| **A3c** | platforms holding current rows | exactly **4** | `RAISE` | **S-3 fold-in** — the M-2 catastrophe detector |
| **A4** | every current row is platform-publishable | 0 violations | `RAISE` | §5 A4 |
| **A5** | per-platform current shares sum exactly | **100.00** each | `RAISE` in loop | §5 A5 |
| **A6** | YouTube identical to the in-transaction pre-apply snapshot | 5 rows, 0 differences | `RAISE` × 2 | §5 A6 — **was unevaluatable (M-3)** |

**Failure semantics:** any `RAISE EXCEPTION` aborts the entire call; the open transaction rolls back and **nothing commits**. Proven live by S1 (probe P3). There is no path in which a subset of §4 commits, provided §4 is submitted through a sanctioned channel — and `G-ATOMIC` aborts it if it is not.

**Every assertion above traces to a v2-named assertion or STOP, or to the PK-directed S-3 fold-in. No assertion is added beyond that scope.**

---

## 6 · Rollback

### 6.1 — Rollback by identity (run as ONE call, same channel rules as §4)

Identity-based, per v2 §6. **Requires the 7 UUIDs from §4's final result set.** See §8/S-1 for what is deferred here.

```sql
BEGIN;

CREATE TEMP TABLE _cc0079_s2_rb_txn ON COMMIT DROP AS SELECT pg_current_xact_id() AS xid;

-- The 17 originals to reactivate -- SAME pinned list as §4/A1, unchanged.
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

-- >>> PASTE THE 7 UUIDS FROM §4's FINAL RESULT SET (new_rows[].id) BELOW. <<<
-- >>> If they were not recorded, STOP -- see §8/S-1. Do NOT improvise a     <<<
-- >>> predicate; this packet does not authorise one.                        <<<
CREATE TEMP TABLE _cc0079_s2_rb_targets(mix_default_id uuid) ON COMMIT DROP;
INSERT INTO _cc0079_s2_rb_targets VALUES
  ('00000000-0000-0000-0000-000000000001'),   -- <-- REPLACE all 7
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000005'),
  ('00000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0000-000000000007');

-- R0 -- guard the paste before anything is deleted
DO $$
DECLARE n int; n_overlap int;
BEGIN
  SELECT count(DISTINCT mix_default_id) INTO n FROM _cc0079_s2_rb_targets;
  IF n <> 7 THEN
    RAISE EXCEPTION 'R0 FAILED: % distinct rollback target id(s) supplied, expected 7. ABORT.', n;
  END IF;
  SELECT count(*) INTO n_overlap FROM _cc0079_s2_rb_targets rt
    JOIN _cc0079_s2_pinned p USING (mix_default_id);
  IF n_overlap <> 0 THEN
    RAISE EXCEPTION 'R0 FAILED: % rollback target(s) are ORIGINAL pinned rows. The rollback must never delete an original. ABORT.', n_overlap;
  END IF;
END $$;

-- R1 -- remove the 7 rows this apply created
DO $$
DECLARE v_anchor xid8; n int;
BEGIN
  SELECT xid INTO v_anchor FROM _cc0079_s2_rb_txn;
  IF pg_current_xact_id() <> v_anchor THEN
    RAISE EXCEPTION 'G-ATOMIC FAILED at R1: transaction identity changed. ABORT.'; END IF;

  DELETE FROM t.platform_format_mix_default d
   USING _cc0079_s2_rb_targets rt
   WHERE d.mix_default_id = rt.mix_default_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 7 THEN
    RAISE EXCEPTION 'R1 FAILED: deleted % row(s), expected 7. ABORT.', n;
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

  SELECT count(DISTINCT platform) INTO n_plat FROM t.platform_format_mix_default WHERE is_current;
  IF n_plat <> 4 THEN RAISE EXCEPTION 'R3 FAILED: % platform(s) with current rows, expected 4. ABORT.', n_plat; END IF;

  FOR r IN SELECT platform, count(*) AS format_count, sum(default_share_pct) AS total_share
             FROM t.platform_format_mix_default WHERE is_current GROUP BY platform LOOP
    IF r.total_share <> 100.00 THEN RAISE EXCEPTION 'R3 FAILED: platform % sums to %, expected 100.00', r.platform, r.total_share; END IF;
    IF r.platform='facebook'  AND r.format_count<>6 THEN RAISE EXCEPTION 'R3 FAILED: facebook % rows, expected 6', r.format_count; END IF;
    IF r.platform='instagram' AND r.format_count<>6 THEN RAISE EXCEPTION 'R3 FAILED: instagram % rows, expected 6', r.format_count; END IF;
    IF r.platform='linkedin'  AND r.format_count<>5 THEN RAISE EXCEPTION 'R3 FAILED: linkedin % rows, expected 5', r.format_count; END IF;
    IF r.platform='youtube'   AND r.format_count<>5 THEN RAISE EXCEPTION 'R3 FAILED: youtube % rows, expected 5', r.format_count; END IF;
  END LOOP;
END $$;

SELECT 'ROLLBACK OK -- pre-apply state restored' AS status,
       (SELECT jsonb_agg(jsonb_build_object('platform', platform, 'formats', format_count, 'sum', total_share) ORDER BY platform)
          FROM (SELECT platform, count(*) AS format_count, sum(default_share_pct) AS total_share
                  FROM t.platform_format_mix_default WHERE is_current GROUP BY platform) s) AS restored_state;

COMMIT;
```

> **R3's expected pre-apply counts are FB 6 · IG 6 · LI 5 · YT 5 = 22**, all four sums returning to 100.00 (FB `5+25+30+20+10+10` · IG `10+5+30+20+20+15` · LI `40+15+20+15+10` · YT unchanged). These are the counts S1 recorded live, not assumptions.

Fully reversible; the 17 originals are only flag-flipped, never deleted, and R0 makes that structurally impossible to get wrong.

### 6.2 — Out-of-band baseline capture (PK repair 3, operator's record)

Capture immediately before the apply. **The `WHERE platform IN (…)` filter is removed** — that filter is what made v2's A6 unevaluatable:

```sql
SELECT mix_default_id, platform, ice_format_key, default_share_pct,
       effective_from, is_current, superseded_by, updated_at
  FROM t.platform_format_mix_default
 ORDER BY platform, ice_format_key;
```

This is a convenience record only. **A6 does not depend on it** — it uses the in-transaction snapshot, which cannot be forgotten or mis-scoped.

### 6.3 — Pinned identity list (the 17 current rows, `effective_from = 2026-04-22`) — FROZEN

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

Policy change across platforms → **SoD ON**, same shape as cc-0080. **Apply hand ≠ author hand.** S5 authored; **S1 applies**. Per PK: *"S1 must not author or modify its own application packet."* **If any step below is ambiguous, S1 halts and surfaces to PK — S1 does not amend this packet.**

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

1. Re-hash this packet **from a ref** (`git show <ref>:docs/briefs/cc-0079-slice-2-apply-packet-v4.md`), not from the working tree. Must equal the pinned hash. **Mismatch → STOP.**
2. Confirm target project `mbkmaxqhsohbtwsqolns` (`content_engine`). **Different project → STOP.**
3. Confirm the fresh external review's `reviewed_input_hash` equals this packet's sha256. **Mismatch or missing → STOP.**
4. Confirm `db-rls-auditor` returned normalized `clean` **against this hash**. **Any other verdict → STOP.**
5. **Manual `platform_support` check** (replaces the deferred O-4 — see §8). Run §2's derivation query read-only and confirm its `after_share` column still yields exactly the 7 frozen values. **Any difference → STOP, do not apply, surface to PK for a re-derive.**
6. Capture the §6.2 out-of-band baseline.
7. **PK apply gate ⑦. No production mutation occurs before this point.**
8. Execute §4 through **one** channel from §7.1. **Record the final result set verbatim** — §6.1 needs its 7 UUIDs.
9. Post-apply proof: re-run the §1 allocator comparison; every platform must show **0 invalid of 5**.

### 7.3 — STOP conditions

Packet hash mismatch · review hash mismatch, missing or non-clean · `db-rls-auditor` not `clean` on this hash · wrong project · any channel outside §7.1 · step-5 manual check showing any drift · **any `RAISE EXCEPTION` from §4** (the transaction has already rolled back; do not retry without re-deriving) · post-apply allocator proof not 0-invalid · unexpected origin movement on the packet's ref · **any ambiguity in this packet**.

A tripped STOP voids the remainder of the sequence; resumption requires a fresh PK gate (Convention 2).

### 7.4 — Privilege precondition

§4 reads `t."5.3_content_format"` and writes `t.platform_format_mix_default`. Schema `t` grants USAGE to **none** of `anon`, `authenticated`, `service_role` — the apply must run under the privileged role the sanctioned channels already use. A `42501 permission denied for schema t` at step 0 means the channel is running as the wrong role: **STOP**, do not widen any grant to make it pass.

---

## 8 · Deferral register — named, deliberate, with their cost

PK authorized three repairs. The following carried items are **not implemented** in v4. Each is recorded here rather than silently dropped.

| Item | Deferred | What the deferral costs |
|---|---|---|
| **S-1** deterministic rollback fallback (`evidence_source='cc-0079-slice-2' AND effective_from=<apply date>`, a predicate that returns 0 rows today and so can only ever match this apply's 7 rows) | **Not implemented.** §6.1 is identity-based only. | **If the §4 final result set is not recorded, there is no authorized rollback path.** The packet deliberately does not let the operator improvise a predicate. Mitigation is procedural: §7.2 step 8 makes recording the result set mandatory. |
| **S-2** `superseded_by` lineage | **Not implemented — and not decided.** Surfaced in §9 as PK's call. | Once committed without lineage, the retired→successor relationship is **not reconstructible from data alone** — only from this document. |
| **S-4** assert the sum invariant *via* `t.platform_format_mix_default_check` | **Not implemented.** A5 computes the sum directly instead. | The apply does not exercise the schema's own declared invariant (`abs(sum − 100) < 0.01`), so a future divergence between that view and this packet's expectation would go unnoticed. A5 is equally strict (exact `= 100.00` on `numeric(5,2)`), so there is no loss of apply-time safety. |
| **S-5** name the rollback residual | **Not implemented as a packet section.** | The cost is the fact itself: **`updated_at` is the only column that does not return to its pre-apply value** — the 17 originals carried a uniform `2026-04-22 07:43:18.946303+00` and will carry the rollback's `now()`. Everything else restores exactly; nothing is destroyed. |
| **O-4** re-run the §2 derivation mechanically inside the transaction | **Not implemented.** | v2 §7's *"confirm it still yields the §2 table"* and its **"`platform_support` changed since authoring"** STOP remain **operator steps, not machine-enforced**. `A-DRIFT` still catches identity/row-count drift and `A4` still catches a current row becoming unpublishable — but a format becoming **newly** publishable would not be caught, and would mean the frozen payload is no longer the correct renormalization. **This is why §7.2 step 5 is mandatory and is a STOP.** |
| **A7/A8** (S5-proposed: assert committed state == payload; blast-radius fence on row delta / deletions / immutable columns) | **Not implemented.** Outside PK's three repairs; they repair no named defect. | A7 is redundant — A2 inserts *from* the frozen payload table, so the shares are structurally guaranteed. A8 would have detected an out-of-band mutation racing the apply; without it, that scenario is caught only if it happens to trip A3/A3b/A3c/A4/A5. Available for a future PK decision. |

---

## 9 · OPEN — PK decision required: `superseded_by` lineage (S-2)

**This packet does not decide it.** S5 surfaces it with the facts and declines to choose, per instruction.

`superseded_by uuid` is the table's designed lineage column. §4 leaves it NULL. The mapping is not 1:1 — **17 retired rows → 7 successors**; 10 retired formats have no successor by design (they are unpublishable on that platform and are not replaced). At most **7** of 17 links are populatable. **Once committed without it, the relationship is not reconstructible from data alone** — only from this document.

**⚠ Material consequence S5 discovered while auditing the rollback — this was NOT in the carry, and it changes the trade-off.** The self-FK `platform_format_mix_default_superseded_by_fkey` is **`ON DELETE NO ACTION`** (`confdeltype = 'a'`, re-read live from `pg_constraint`). If lineage is populated, the 17 retired rows hold FK references to the 7 new rows — so **§6.1's `R1` DELETE would fail with a foreign-key violation and the rollback would not run as written.** Electing S-2 requires R1 to null those references first.

**PK's options:**

| | Choice | Consequence |
|---|---|---|
| **A** | **Ship v4 as written** (no lineage) | Rollback stays exactly as specified. Lineage lives only in this document. Recoverable later only by a separate backfill lane, which would need this doc as its source. |
| **B** | **Elect S-2** | Lineage is durable in data. **Requires a v5 re-cut** (§4 and §6.1 both change) ⇒ new sha256 ⇒ new external review ⇒ new `db-rls-auditor` run. Adds an FK-ordering step to the rollback. |

**S5 recommends PK choose explicitly rather than by omission** — that is how the column came to be unused in the first place. S5 does not recommend which.

---

## 10 · The v2 §8 `policy_decision` is CLOSED — do not re-raise it

v2 §8 carried this as an open PK `policy_decision`. **It is closed.** PK **ruled at v6.22** (commit `ad4a6a9`), *before* the S1 apply lane opened:

> **Facebook 3 valid formats · Instagram 2 · LinkedIn 2** — accepted scope for this slice, and **explicitly not a permanent ceiling** on future formats.

S1 re-verified live `platform_support` against that ruling and it matches exactly. The renormalization collapses valid inventory to those counts; that is truthful, because the removed diversity was never publishable. It intersects open **Q4** (`animated_text_reveal` / `animated_data` are supported on **zero** platforms and are removed from FB/IG here regardless of how Q4 resolves) — Q4 remains open and is **not** decided by this packet.

*Correction of record:* `db-rls-auditor` treated this item as open — correctly, since the ruling post-dates the packet it audited and sits outside its remit. Successor docs must not reproduce the error.

---

## 11 · Review status — every prior review is STALE

**`db-rls-auditor` must be re-run against this packet's hash, and a fresh external review is mandatory.**

- External review **`f46949d3-eb68-4a78-9fa9-68381b4f8608` is STALE.** It is valid **only** for v2's `73dd7413cad6a8a340838d8eb510b82dbc2ad9b3287026ad3930a4fbacc97637` (CLAUDE.md external-review rules 1 and 4: a review is valid only for the exact `reviewed_input_hash`; §4 changed, so the approval does not carry). **It must not be cited for v4 under any circumstances.**
- **v3 (`6ab25793…`) is WITHDRAWN and was never reviewed.** It must not be applied or cited.
- A **fresh external review** pinned to v4's sha256 is required. **The orchestrator runs it — not S5, and not the apply hand.**
- **`db-rls-auditor` re-run** against v4's hash is required.
- Only then the **PK apply gate ⑦**.

**Ratified chain:** S5 freezes → orchestrator runs the fresh review against the exact new hash → S1 receives the reviewed packet as the independent apply hand → S1 works the gate chain and **stops at PK gate ⑦** → **no production mutation before that gate.**

---

## 12 · Non-claims

Nothing applied. **No DML executed, no row mutated, no schema touched, no commit, no push, no deploy, no migration.** S5 ran only read-only catalog queries (`pg_views`, `pg_attribute`, `pg_constraint`, `pg_class`, `information_schema.columns`) through the allowlisted read-only path; no production table was written and no residue was left.

The §4 and §6 scripts have **not** been executed in any form. Their primitives (`DO`/`RAISE EXCEPTION`, single-call transaction composition, `ON COMMIT DROP` temp tables) were proven by S1's probes P1–P3, but **this specific script has never been run**, and `A-DRIFT`, `A3b`, `A3c` and the `G-ATOMIC` guard are new code that has never executed. That is what the fresh `db-rls-auditor` pass and the PK gate are for.

**The data payload and allocator table are frozen and unaltered** — no share, key, UUID or allocation string differs from v2. This packet repairs only the execution harness, within the three repairs PK authorized plus the PK-directed S-3 fold-in; §8 records everything deliberately left out.

This packet does not approve, ratify or authorise the apply. It does not decide S-2 (§9) or Q4. It does not change the mix function, client overrides (none exist), the Advisor (Slice 1 → S3), or transport. Only PP is `format_mix` enrolled today; the §1 comparison uses N=5 and the live grid shares, and other clients/cadences differ. All counts, IDs and shares are live as of **2026-07-24**; identity drift is re-verified **by the script itself** at apply time, and share/`platform_support` drift by the mandatory §7.2 step 5. The durable fix — a `platform_support` intersection inside `m.build_weekly_demand_grid` — remains a named **code** successor, out of this data-only scope. This lane is not combined with Slice 1, cc-0080, or any other database window.

**Scope honesty:** when this applies, the schedule stops allocating unpublishable formats. It does **not** build platform+format planning in the dashboard UI — that is a separate scoping lane under PK priority 1.

---

## FREEZE BLOCK

```
artifact  : docs/briefs/cc-0079-slice-2-apply-packet-v4.md
supersedes: docs/briefs/cc-0079-slice-2-apply-packet-v2.md
            (73dd7413cad6a8a340838d8eb510b82dbc2ad9b3287026ad3930a4fbacc97637, 14191 B) -- NOT overwritten
            docs/briefs/cc-0079-slice-2-apply-packet-v3.md
            (6ab25793d1f4f257bb8e5c780b3a582ca70188b86728393a3481752f23d42d98, 54711 B) -- WITHDRAWN, exceeded PK scope, never reviewed
authorized: PK -- three repairs only (single-call transaction containment ·
            executable fail-closed assertions · missing YouTube baseline), plus the
            PK-directed S-3 fold-in. S-1/S-2/S-4/S-5/O-4 deferred and named in §8.
payload   : FROZEN -- data and allocator table unaltered from v2.
author    : S5 (re-cut author; NOT the apply hand)
apply by  : S1 (segregation of duties; S1 must not author or modify this packet)
base      : CE HEAD == origin/main == ad4a6a944027897672764c1540f53890e027c2ee (v6.22), parity 0/0
target    : project mbkmaxqhsohbtwsqolns (content_engine)
sha256    : carried OUT-OF-BAND in the S5 handoff line (a file cannot contain its own hash).
            Verify: python -c "import hashlib;print(hashlib.sha256(open(r'docs/briefs/cc-0079-slice-2-apply-packet-v4.md','rb').read()).hexdigest())"
            Any byte change invalidates the pinned hash AND every review pinned to it.
bytes     : carried OUT-OF-BAND in the S5 handoff line.
review    : REQUIRED, NOT YET RUN. v2's review f46949d3-eb68-4a78-9fa9-68381b4f8608 is STALE
            and must not be cited. v3 was never reviewed.
auditor   : db-rls-auditor re-run REQUIRED against this hash.
status    : NOT APPLIED
```
