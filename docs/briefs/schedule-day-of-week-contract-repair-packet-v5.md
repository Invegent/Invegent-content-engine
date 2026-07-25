# Repair Packet v5 — schedule `day_of_week` contract: `dow` (Sunday=0) across ALL live consumers

**Created:** 2026-07-25 Sydney
**Lane:** **S2 · Sunday contract repair — v5 (one-line §6 POST-enumeration accuracy fix over v4; scope + SQL + harness unchanged)**
**Author:** S2 worker session (READ-ONLY; authoring only)
**Status:** **AUTHOR-ONLY. NOT APPLIED.** No DDL run, no DML run, no dashboard file edited, no commit, no push.
**Supersedes:**
- **v1 `1c2230d0…` — NON-EXECUTABLE, withdrawn:** named only the two `m.*` functions; the census (§2) proves a third consumer, `public.get_week_format_allocation`, also uses `isodow`.
- **v2 `656ebf2c…` — superseded by the v3 HARNESS-FIDELITY revision (scope identical):** the shadow `apply-harness-auditor` returned CONCERNS on v2's second pass — the harness *declared* protections its text did not *embed*. v3 embeds them. **The 3-function `isodow→dow` scope is unchanged.** v2 must not be applied.
- **v3 `e3ea8792…` — superseded by v4 (a single STOP-wording accuracy fix):** v4 tightened STOP #8 so the declared control matches the embedded PRE-0 enforcement exactly. **No SQL changed.** v3 must not be applied.
- **v4 `73cad81a…` — superseded by this v5 (a single §6 POST-enumeration accuracy fix; SQL/harness/scope byte-identical otherwise):** the full re-run chain against frozen v4 (shadow harness auditor + `db-rls-auditor`) confirmed E5 included, PRE-0 overstatement fully closed, `db-rls-auditor` PASS (grant/RLS/REST-neutral), and flagged one LOW residual — §6's run-order sentence read "POST-1 … POST-7" while §7 declares nine POST gates through POST-8 (POST-6a/POST-8 added in v3, §6 not updated; functionally covered by the verbatim §7 block + the "every POST guard" catch-all, so no gate is skipped). v5 aligns §6's enumeration to the full §7 POST set. **No SQL changed.** v4 must not be applied.
**Canonical ID:** **NOT SELF-ALLOCATED.** No `cc-` number, no register version claimed.
**Lane classification (CCF-02):** SAFETY_GATE · **Tier T3** (production `SECURITY DEFINER` function bodies on the slot-materialisation spine + the live Slice-A allocator).
**Governed contract (PK Option A):** `c.client_publish_schedule.day_of_week` is **Sunday=0 … Saturday=6**. **Every live consumer must use PostgreSQL `dow`, never `isodow`.**

---

## 0 · Stale-ref gate (PASSED)

| Repo | Fetched | Upstream (this session) | Base | Verdict |
|---|---|---|---|---|
| CE | `fetch --prune` | `64523be4b98a43a3c1b55390f45948dccab9822b` (`ls-remote` agrees) | `64523be` on `main`, parity **0/0** | **AT UPSTREAM** |
| `invegent-dashboard` | `fetch --prune` | `524ca6d…` | `fda2b51`, 5 behind | **N/A — this repair is CE DB-side only; no dashboard file touched** |

---

## 1 · The defect (both sides, verified this session)

`c.client_publish_schedule.day_of_week` stores **Sunday=0** (`CHECK (day_of_week BETWEEN 0 AND 6)`, verified). Three live functions match a generated weekday to it with **`EXTRACT(isodow)`** (1–7, Sunday=**7**). `isodow` never yields 0 → a Sunday row matches nothing → the save succeeds, the UI shows "Saved ✓", and **zero slots materialise**. Silent. Live: enabled slots exist on isodow 1–5 only; **24 Sunday `day_of_week=0` rows exist, all `enabled=false`** (dormant).

---

## 2 · The census that supersedes v1 (independent, not the assumed list)

**v1 broke because it trusted a known list.** v2 enumerates every live function from the catalogue.

**Census method (R0 `db-read.py`, `pg_proc.prosrc`, this session):**

| Census | Query | Result |
|---|---|---|
| C1 — body mentions `isodow` | `prosrc ILIKE '%isodow%'` | **3:** `m.compute_rule_slot_times`, `m.materialise_slots`, **`public.get_week_format_allocation`** |
| C2 — body mentions `day_of_week` | `prosrc ILIKE '%day_of_week%'` | 8 (the 3 above + `c.handle_schedule_rule_change`, `public.{get_next_publish_slot, get_next_scheduled_for, get_publish_schedule, save_publish_schedule}`) |
| C3 — body references the table | `prosrc ILIKE '%client_publish_schedule%'` | 9 (C2's 8 minus `handle_schedule_rule_change`, plus `m.build_weekly_demand_grid`, `public.get_publishing_plan_pyramid`) |
| C4 — uses `EXTRACT(dow` | `prosrc ILIKE '%extract(dow%'` | 2: `get_next_publish_slot`, `get_next_scheduled_for` |

**Classification of every function that could compare a weekday to `day_of_week`:**

| Function | Weekday comparison? | Convention | Action |
|---|---|---|---|
| `m.compute_rule_slot_times` | yes (1 site) | **isodow** ❌ | **CHANGE** |
| `m.materialise_slots` | yes (2 sites) | **isodow** ❌ | **CHANGE** |
| **`public.get_week_format_allocation`** | yes (1 real site + a coupled range labeler) | **isodow** ❌ | **CHANGE** (§3, §4) |
| `public.get_next_publish_slot` | yes | `dow` ✅ | already correct — no change |
| `public.get_next_scheduled_for` | yes | `dow` ✅ | already correct — no change |
| `c.handle_schedule_rule_change` | no (change-detection only) | — | no change |
| `public.get_publish_schedule` | no (passthrough read) | — | no change |
| `public.save_publish_schedule` | no (passthrough insert) | — | no change |
| `m.build_weekly_demand_grid` | **no** — verified: `COUNT(*) … GROUP BY platform WHERE enabled=true`, zero weekday derivation (grep for `isodow\|dow\|extract\|generate_series` returns nothing) | — | no change |
| `public.get_publishing_plan_pyramid` | **no** — verified same way, zero weekday derivation | — | no change |

**Census verdict: exactly THREE functions require change. Two already use `dow`. Two touch the table but derive no weekday.** No other live consumer exists. This is the contract-level census PK required, and it is the fact v1 missed.

---

## 3 · The exact change set — disambiguated, 5 edits

**⚠ The naïve rule "replace the word `isodow`" is WRONG here and would corrupt `get_week_format_allocation`.** That function contains **two** textual `isodow`, only one of which is code:

| # | Function | Site | Old → New | Kind |
|---|---|---|---|---|
| E1 | `m.compute_rule_slot_times` | `WHERE EXTRACT(isodow FROM d)::integer = v_day_of_week` | `isodow`→`dow` | real |
| E2 | `m.materialise_slots` | join site 1: `ON EXTRACT(isodow FROM d)::integer = s.day_of_week` | `isodow`→`dow` | real |
| E3 | `m.materialise_slots` | join site 2: identical text | `isodow`→`dow` | real |
| E4 | `public.get_week_format_allocation` | occ join: `ON EXTRACT(isodow FROM d)::integer = s.day_of_week` | `isodow`→`dow` | real |
| E5 | `public.get_week_format_allocation` | unmatched labeler: `s.day_of_week NOT BETWEEN 1 AND 7` | `1 AND 7`→`0 AND 6` | **coupled — see §4** |
| — | `public.get_week_format_allocation` | reason_code string `'day_of_week_out_of_isodow_range'` | **DO NOT TOUCH** | string literal (data) |

**The safe mechanical operator is substring `EXTRACT(isodow FROM d)` → `EXTRACT(dow FROM d)`** (not the bare word). Counted live this session: it occurs **1 / 2 / 1** times in the three functions = **4 sites**, and it **cannot** hit the string literal (which does not contain that substring). Plus **E5**, one range-predicate edit, in `get_week_format_allocation` only. **Total: 5 edits. Zero other tokens change; every function header is preserved byte-for-byte** (including `get_week_format_allocation`'s `SET search_path TO ''`).

---

## 4 · The coupled labeler — a REQUIRED scope item, surfaced not smuggled

**PK's instruction says "mechanical change only: `EXTRACT(isodow)`→`EXTRACT(dow)`; do not alter unrelated date logic." For `get_week_format_allocation` that rule alone is internally contradictory, and this packet surfaces the tension rather than resolving it silently.**

The function has TWO coupled halves that both encode the isodow assumption:
1. the **occ join** (E4) that decides which rows are *allocated*;
2. the **unmatched labeler** (E5): `WHERE … s.day_of_week NOT BETWEEN 1 AND 7`, which flags a row as unschedulable and tags it `reason_code='sunday_written_as_zero'` when `day_of_week=0`.

If only E4 is applied, a Sunday `day_of_week=0` row would **both** match the join (allocated) **and** satisfy `NOT BETWEEN 1 AND 7` (flagged unmatched) → the same row appears in the allocation **and** in the unmatched list. **That directly fails PK's own proof #3 — "represented consistently in allocation output" — and PK's invariant "the dashboard wrapper and materialiser use the SAME day convention."**

> **The labeler predicate is not *unrelated* date logic — it is the sibling half of the exact same weekday contract.** E5 (`1 AND 7`→`0 AND 6`) is **mechanically forced by PK's consistency invariant**, not an opportunistic edit.

**After E5, the `WHEN s.day_of_week = 0 THEN 'sunday_written_as_zero'` branch and the `'day_of_week_out_of_isodow_range'` string become unreachable-but-harmless dead code** (0 no longer enters the block). This packet **does not remove them** — that would be unrelated cleanup. It changes exactly the one predicate that consistency requires.

**PK DECISION REQUIRED (§ open decisions):** include E5 (recommended — required for proof #3 and internal consistency), or apply E1–E4 only and **waive proof #3** and accept that the Slice-A labeler will mislabel any future enabled Sunday row. **This packet's primary path INCLUDES E5.** The auditor and reviewers below evaluate the 5-edit version.

---

## 5 · Pinned preconditions (immutable, re-checkable by the apply hand)

All from `pg_get_functiondef` / `pg_proc`, live this session, project `mbkmaxqhsohbtwsqolns`:

| Function | `md5(pg_get_functiondef)` | body len | volatile | secdef | owner | `EXTRACT(isodow FROM d)` n | any `isodow` n | `NOT BETWEEN 1 AND 7` n | `proacl` |
|---|---|---|---|---|---|---|---|---|---|
| `m.compute_rule_slot_times` | `d7e5b94d1a9e35241bcd48ccf09cde43` | 1067 | s | t | postgres | 1 | 1 | 0 | **NULL (default)** |
| `m.materialise_slots` | `e5b340b7be143a8679c68308a48c4f18` | 5645 | v | t | postgres | 2 | 2 | 0 | **NULL (default)** |
| `public.get_week_format_allocation` | `b12639d8141864a26fc96297781e3abd` | 7130 | s | t | postgres | 1 | 2 | 1 | `{postgres=X/postgres,service_role=X/postgres}` |

**Precondition STOP:** if any `md5` or count above does not match live at apply time, the source moved since authoring → **ABORT and re-census.** (This is the immutable-precondition pin PK required.)

---

## 6 · Executable apply (for the apply hand — NOT run here)

**Method — capture-verify-substitute-re-emit** (same discipline as the S8 byte-exact-from-source apply, adapted to function bodies).

**Ordered baseline captures — sequenced BEFORE the first `CREATE OR REPLACE`, because each is the input to a fail-closed assertion the DDL would otherwise invalidate (auditor AHA-01-1, AHA-01-2):**

The **executable run order below is authoritative and equals the declared PRE-gate order** — every PRE assertion in §7 appears here as a numbered step *before* the first `CREATE OR REPLACE` (auditor v2-finding 3):

- **A0 — rollback baseline (satisfies §11 STOP #8, enforced as PRE-0). Runs BEFORE `BEGIN`, in a session-scoped temp table (NOT `ON COMMIT DROP`) so it survives a ROLLBACK** — this captured `body` text IS the §8 rollback:
  ```sql
  CREATE TEMP TABLE _rollback_baseline(sig text, body text, body_md5 text);  -- session-scoped, survives rollback
  INSERT INTO _rollback_baseline(sig, body, body_md5)
  SELECT v.sig, pg_get_functiondef(v.sig::regprocedure), md5(pg_get_functiondef(v.sig::regprocedure))
  FROM (VALUES ('m.compute_rule_slot_times(uuid,integer)'),
               ('m.materialise_slots(integer)'),
               ('public.get_week_format_allocation(uuid,date)')) v(sig);
  ```
  Then run the §9 P5 dry-restore validation out-of-band (restore each captured `body` into a scratch and confirm `md5` round-trips). **PRE-0 (§7) enforces presence + `(sig, body_md5)`==§5 inside the txn; the byte-exact dry-restore is the §9 P5 out-of-band gate.** STOP if either fails, before any CREATE OR REPLACE.
- **A0′ — in-transaction baseline snapshots + txid pin.** `BEGIN`. Then, before the first CREATE OR REPLACE:
  - capture **`txid_current()`** (auditor v2-finding 4 — the atomicity guard):
    ```sql
    CREATE TEMP TABLE _apply_txid(xid bigint) ON COMMIT DROP;
    INSERT INTO _apply_txid VALUES (txid_current());
    ```
  - capture the zero-delta before-results into `_zerodelta_before(kind text, key text, before_value text, after_value text)` — **before-side populated here, after-side left NULL and populated by POST-6a after the DDL**:
    ```sql
    CREATE TEMP TABLE _zerodelta_before(kind text, key text, before_value text, after_value text) ON COMMIT DROP;
    INSERT INTO _zerodelta_before(kind,key,before_value)
      SELECT 'crst', s.schedule_id::text,
             (SELECT COALESCE(array_agg(t ORDER BY t)::text,'{}') FROM m.compute_rule_slot_times(s.schedule_id,7) t)
        FROM c.client_publish_schedule s WHERE s.enabled = true;
    INSERT INTO _zerodelta_before(kind,key,before_value)
      SELECT 'gwfa', cl.client_id::text,
             get_week_format_allocation(cl.client_id, date_trunc('week', now())::date)::text
        FROM c.client cl WHERE m.format_mix_enrolled(cl.client_id);
    ```
  - capture the **deterministic Saturday fixture** (auditor v2-finding 2) into `_saturday_before(before_value text, after_value text, form text)`, OR resolved AT CAPTURE and recorded in `form`:
    ```sql
    CREATE TEMP TABLE _saturday_before(before_value text, after_value text, form text) ON COMMIT DROP;
    INSERT INTO _saturday_before(before_value, form)
    SELECT CASE WHEN sat.schedule_id IS NOT NULL
             THEN (SELECT COALESCE(array_agg(t ORDER BY t)::text,'{}') FROM m.compute_rule_slot_times(sat.schedule_id,7) t)
             ELSE (SELECT array_agg(d::date ORDER BY d)::text FROM generate_series(date_trunc('week',now()::date)::date, date_trunc('week',now()::date)::date+6, interval '1 day') d WHERE EXTRACT(dow FROM d)::int=6)
           END,
           CASE WHEN sat.schedule_id IS NOT NULL THEN 'crst:'||sat.schedule_id::text ELSE 'synthetic_generate_series' END
    FROM (SELECT schedule_id FROM c.client_publish_schedule WHERE day_of_week=6 ORDER BY schedule_id LIMIT 1) sat RIGHT JOIN (SELECT 1) _ ON true;
    ```
    **P2 (POST-8) compares the after-value against this pinned baseline** — no unresolved OR, no ad-hoc probe.

Then run **PRE-1 … PRE-7** (the §7 guard SQL, executed verbatim as `DO`/`RAISE` blocks — see §7); each aborts the transaction on failure. **Only after all PRE gates pass**, per function, in order `compute_rule_slot_times`, `materialise_slots`, `get_week_format_allocation`:

1. Capture live body: `SELECT pg_get_functiondef(p.oid) …`.
2. **Verify** its `md5` == §5 pin. **STOP on mismatch.** *(This is PRE-1's per-function form; PRE-1 already gated all three collectively.)*
3. Apply the substitutions **for that function only**:
   - all three: replace every `EXTRACT(isodow FROM d)` → `EXTRACT(dow FROM d)`;
   - `get_week_format_allocation` **additionally**: replace the single `NOT BETWEEN 1 AND 7` → `NOT BETWEEN 0 AND 6`.
4. **Verify the transformed text** has: `EXTRACT(isodow FROM d)` count = 0; `EXTRACT(dow FROM d)` count = the §5 isodow count for that function; header unchanged; for `get_week_format_allocation`, `any isodow` count = **1** (the surviving string literal) and `NOT BETWEEN 1 AND 7` count = 0. **STOP on any mismatch.**
5. Execute the transformed text as the `CREATE OR REPLACE FUNCTION` statement (pg_get_functiondef already emits a complete, header-preserving CREATE OR REPLACE).

Then run **POST-1 … POST-8 in §7 order — i.e. POST-1, POST-2, POST-3, POST-4, POST-5, POST-6a (populate `_zerodelta_before.after_value`), POST-6, POST-7, POST-8** (§7 guard SQL); **POST-7 re-asserts `txid_current() = _apply_txid`** so a pooled channel that silently split the transaction fails closed mechanically. `COMMIT` only if every POST guard passed.

Wrap steps A0′ + 1–5 (all three functions) in **one transaction** (`BEGIN; … COMMIT;`) via a single atomic channel (§11); the §7 assertions run before `COMMIT`.

**Fallback (pooled channel that cannot compose a multi-statement transaction) — and its atomicity cost, disclosed (auditor AHA-01-3):** apply each function in its own transaction in the stated order; each function's own POST checks must pass, a failure aborts the remainder, and the §8 body-swap rollback recovers any already-committed function. **The cross-function guarantees — POST-6 across all three, and §9 P3 (wrapper · materialiser · allocation agreeing on a Sunday row) — are atomic ONLY on the single-call channel.** On the fallback path the apply hand MUST, after the final function commits, **re-run POST-6 and the P3 consistency check across all three functions**, treating any residual disagreement as a §8-rollback trigger. **The apply record MUST name which channel was actually used.**

> This packet does **not** embed the ~14 KB of rewritten bodies. Embedding hand-transcribed function bodies is the error class the S8 byte-exact discipline exists to avoid, and long-constant transcription is a known corruption hazard. The transformation is defined mechanically (§3) and gated by exact pre/post counts (§5, §7), so the apply hand derives the new body from verified-live source and never from a retyped blob.

---

## 7 · Assertions — the harness (executable guard SQL EMBEDDED, not delegated)

**Enforcement form (auditor v2-finding 1):** every assertion below is embedded as the actual guard SQL the apply hand executes **verbatim** inside the apply transaction — the reviewed artifact CONTAINS the enforcement. The only thing deliberately not embedded is the ~14 KB of rewritten function bodies (§6, transcription-corruption hazard); the guard SQL carries no such hazard. The summary tables are an index to the embedded blocks that follow them.

The guards reference three unambiguous singleton signatures (overloads=1, verified): `m.compute_rule_slot_times(uuid,integer)`, `m.materialise_slots(integer)`, `public.get_week_format_allocation(uuid,date)`. Shorthand `defn(sig) := pg_get_functiondef(sig::regprocedure)`.

**PRE gates — index:**

| # | Gate | On fail |
|---|---|---|
| PRE-0 | rollback baseline A0 present + `(sig, body_md5)`==§5 in-txn (dry-restore byte-exact is out-of-band, §9 P5) | ABORT |
| PRE-1 | 3 body md5 == §5 pins | ABORT |
| PRE-2 | `EXTRACT(isodow FROM d)` counts == 1/2/1 | ABORT |
| PRE-3 | `get_week_format_allocation` `NOT BETWEEN 1 AND 7` count == 1 | ABORT |
| PRE-4 | owner/secdef/volatility/proacl == §5 | ABORT |
| PRE-5 | `client_publish_schedule` CHECK still `0..6` | ABORT |
| PRE-6 | enabled `day_of_week=0` rows == 0 | ABORT |
| PRE-7 | `%isodow%` census == exactly the same 3 functions | ABORT |

**PRE embedded guard SQL** (runs after A0/A0′ of §6, before the first CREATE OR REPLACE):

```sql
-- PRE-0 : rollback baseline present + (sig, body_md5)==§5 in-txn (enforces §11 STOP #8; byte-exact dry-restore is out-of-band, §9 P5)
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM _rollback_baseline
   WHERE (sig,body_md5) IN (
     ('m.compute_rule_slot_times(uuid,integer)','d7e5b94d1a9e35241bcd48ccf09cde43'),
     ('m.materialise_slots(integer)',           'e5b340b7be143a8679c68308a48c4f18'),
     ('public.get_week_format_allocation(uuid,date)','b12639d8141864a26fc96297781e3abd'));
  IF n <> 3 THEN RAISE EXCEPTION 'PRE-0 rollback baseline missing/mismatched (got % of 3)', n; END IF;
END $$;

-- PRE-1 : live body md5 == §5 pins
DO $$
BEGIN
  IF md5(pg_get_functiondef('m.compute_rule_slot_times(uuid,integer)'::regprocedure)) <> 'd7e5b94d1a9e35241bcd48ccf09cde43'
     OR md5(pg_get_functiondef('m.materialise_slots(integer)'::regprocedure))         <> 'e5b340b7be143a8679c68308a48c4f18'
     OR md5(pg_get_functiondef('public.get_week_format_allocation(uuid,date)'::regprocedure)) <> 'b12639d8141864a26fc96297781e3abd'
  THEN RAISE EXCEPTION 'PRE-1 body md5 drift vs pinned baseline'; END IF;
END $$;

-- PRE-2 : EXTRACT(isodow FROM d) occurrence counts == 1 / 2 / 1
DO $$
BEGIN
  IF (SELECT count(*) FROM regexp_matches(pg_get_functiondef('m.compute_rule_slot_times(uuid,integer)'::regprocedure),'EXTRACT\(isodow FROM d\)','g')) <> 1
   OR (SELECT count(*) FROM regexp_matches(pg_get_functiondef('m.materialise_slots(integer)'::regprocedure),'EXTRACT\(isodow FROM d\)','g')) <> 2
   OR (SELECT count(*) FROM regexp_matches(pg_get_functiondef('public.get_week_format_allocation(uuid,date)'::regprocedure),'EXTRACT\(isodow FROM d\)','g')) <> 1
  THEN RAISE EXCEPTION 'PRE-2 isodow site count drift'; END IF;
END $$;

-- PRE-3 : the coupled labeler predicate is present exactly once
DO $$
BEGIN
  IF (SELECT count(*) FROM regexp_matches(pg_get_functiondef('public.get_week_format_allocation(uuid,date)'::regprocedure),'NOT BETWEEN 1 AND 7','g')) <> 1
  THEN RAISE EXCEPTION 'PRE-3 coupled labeler NOT BETWEEN 1 AND 7 not found exactly once'; END IF;
END $$;

-- PRE-4 : owner=postgres, secdef=true, volatility s/v/s, proacl == §5 for all three
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM (VALUES
    ('m.compute_rule_slot_times(uuid,integer)'::regprocedure,'s','NULL'),
    ('m.materialise_slots(integer)'::regprocedure,          'v','NULL'),
    ('public.get_week_format_allocation(uuid,date)'::regprocedure,'s','{postgres=X/postgres,service_role=X/postgres}')
  ) v(sig,vol,acl)
  JOIN pg_proc p ON p.oid=v.sig
  WHERE pg_get_userbyid(p.proowner)<>'postgres' OR p.prosecdef<>true
     OR p.provolatile<>v.vol OR COALESCE(p.proacl::text,'NULL')<>v.acl;
  IF bad<>0 THEN RAISE EXCEPTION 'PRE-4 owner/secdef/volatility/proacl drift on % function(s)', bad; END IF;
END $$;

-- PRE-5 : storage CHECK still Sunday=0..Saturday=6
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid='c.client_publish_schedule'::regclass AND contype='c'
                    AND pg_get_constraintdef(oid)='CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))')
  THEN RAISE EXCEPTION 'PRE-5 client_publish_schedule day_of_week CHECK is not 0..6'; END IF;
END $$;

-- PRE-6 : no enabled Sunday row (dormancy holds)
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM c.client_publish_schedule WHERE day_of_week=0 AND enabled=true;
  IF n<>0 THEN RAISE EXCEPTION 'PRE-6 % enabled day_of_week=0 row(s) exist — risk profile changed', n; END IF;
END $$;

-- PRE-7 : contract-level census — exactly the same 3 functions still use isodow, no 4th
DO $$
DECLARE got text;
BEGIN
  SELECT string_agg(n.nspname||'.'||p.proname, ',' ORDER BY 1) INTO got
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE p.prosrc ILIKE '%isodow%';
  IF got <> 'm.compute_rule_slot_times,m.materialise_slots,public.get_week_format_allocation'
  THEN RAISE EXCEPTION 'PRE-7 isodow census changed since freeze: %', got; END IF;
END $$;
```

**POST gates — index** (after the three CREATE OR REPLACE, before COMMIT):

| # | Gate | On fail |
|---|---|---|
| POST-1 | `EXTRACT(isodow FROM d)` across all 3 == 0 | ROLLBACK |
| POST-2 | `EXTRACT(dow FROM d)` counts == 1/2/1 | ROLLBACK |
| POST-3 | surviving `isodow` in `get_week_format_allocation` == 1 (the string literal) | ROLLBACK |
| POST-4 | `NOT BETWEEN 0 AND 6` == 1 and `NOT BETWEEN 1 AND 7` == 0 | ROLLBACK |
| POST-5 | signature/owner/secdef/volatility/proacl unchanged == §5 | ROLLBACK |
| POST-6a | **populate** `_zerodelta_before.after_value` (re-run same calls post-repair) | — |
| POST-6 | zero-delta vs the A0′ `_zerodelta_before` snapshot | ROLLBACK |
| POST-7 | `txid_current() = _apply_txid` (atomicity — no split) | ROLLBACK |
| POST-8 | Saturday non-regression vs pinned `_saturday_before` | ROLLBACK |

**POST embedded guard SQL:**

```sql
-- POST-1 : no real isodow comparison remains anywhere
DO $$
BEGIN
  IF (SELECT count(*) FROM (VALUES
        ('m.compute_rule_slot_times(uuid,integer)'::regprocedure),
        ('m.materialise_slots(integer)'::regprocedure),
        ('public.get_week_format_allocation(uuid,date)'::regprocedure)) v(sig),
      LATERAL regexp_matches(pg_get_functiondef(v.sig),'EXTRACT\(isodow FROM d\)','g')) <> 0
  THEN RAISE EXCEPTION 'POST-1 an EXTRACT(isodow FROM d) survived the repair'; END IF;
END $$;

-- POST-2 : EXTRACT(dow FROM d) now present 1/2/1
DO $$
BEGIN
  IF (SELECT count(*) FROM regexp_matches(pg_get_functiondef('m.compute_rule_slot_times(uuid,integer)'::regprocedure),'EXTRACT\(dow FROM d\)','g')) <> 1
   OR (SELECT count(*) FROM regexp_matches(pg_get_functiondef('m.materialise_slots(integer)'::regprocedure),'EXTRACT\(dow FROM d\)','g')) <> 2
   OR (SELECT count(*) FROM regexp_matches(pg_get_functiondef('public.get_week_format_allocation(uuid,date)'::regprocedure),'EXTRACT\(dow FROM d\)','g')) <> 1
  THEN RAISE EXCEPTION 'POST-2 EXTRACT(dow FROM d) count wrong after repair'; END IF;
END $$;

-- POST-3 : the string literal 'day_of_week_out_of_isodow_range' survived (isodow count now exactly 1, and it is NOT an EXTRACT)
DO $$
DECLARE d text := pg_get_functiondef('public.get_week_format_allocation(uuid,date)'::regprocedure);
BEGIN
  IF (SELECT count(*) FROM regexp_matches(d,'isodow','g')) <> 1
     OR position('day_of_week_out_of_isodow_range' in d) = 0
  THEN RAISE EXCEPTION 'POST-3 the isodow string literal was wrongly altered or an EXTRACT survived'; END IF;
END $$;

-- POST-4 : labeler moved to 0..6
DO $$
DECLARE d text := pg_get_functiondef('public.get_week_format_allocation(uuid,date)'::regprocedure);
BEGIN
  IF (SELECT count(*) FROM regexp_matches(d,'NOT BETWEEN 0 AND 6','g')) <> 1
     OR (SELECT count(*) FROM regexp_matches(d,'NOT BETWEEN 1 AND 7','g')) <> 0
  THEN RAISE EXCEPTION 'POST-4 coupled labeler predicate not exactly 0..6'; END IF;
END $$;

-- POST-5 : signature/owner/secdef/volatility/proacl unchanged (ACL neutrality — esp. the two NULL-acl m.*)
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM (VALUES
    ('m.compute_rule_slot_times(uuid,integer)'::regprocedure,'s','NULL'),
    ('m.materialise_slots(integer)'::regprocedure,          'v','NULL'),
    ('public.get_week_format_allocation(uuid,date)'::regprocedure,'s','{postgres=X/postgres,service_role=X/postgres}')
  ) v(sig,vol,acl)
  JOIN pg_proc p ON p.oid=v.sig
  WHERE pg_get_userbyid(p.proowner)<>'postgres' OR p.prosecdef<>true
     OR p.provolatile<>v.vol OR COALESCE(p.proacl::text,'NULL')<>v.acl;
  IF bad<>0 THEN RAISE EXCEPTION 'POST-5 signature/owner/secdef/acl drift on % function(s)', bad; END IF;
END $$;

-- POST-6a : POPULATE the after-side by re-running the identical calls post-repair (embedded, not narrated)
UPDATE _zerodelta_before b SET after_value =
  CASE b.kind
    WHEN 'crst' THEN (SELECT COALESCE(array_agg(t ORDER BY t)::text,'{}') FROM m.compute_rule_slot_times(b.key::uuid,7) t)
    WHEN 'gwfa' THEN get_week_format_allocation(b.key::uuid, date_trunc('week', now())::date)::text
  END;

-- POST-6 : zero-delta vs the pinned A0' before-snapshot (every enabled schedule + enrolled client)
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM _zerodelta_before b
  WHERE b.after_value IS DISTINCT FROM b.before_value;
  IF n<>0 THEN RAISE EXCEPTION 'POST-6 zero-delta violated on % pinned baseline row(s)', n; END IF;
END $$;

-- POST-7 : atomicity — the transaction was never split by a pooled channel
DO $$
BEGIN
  IF txid_current() <> (SELECT xid FROM _apply_txid)
  THEN RAISE EXCEPTION 'POST-7 txid changed since A0'' — the apply transaction was split; failing closed'; END IF;
END $$;

-- POST-8 : Saturday non-regression vs the pinned _saturday_before fixture (embedded — true parity with POST-6)
DO $$
DECLARE b text; a text; frm text;
BEGIN
  SELECT before_value, form INTO b, frm FROM _saturday_before;
  IF frm LIKE 'crst:%' THEN
    a := (SELECT COALESCE(array_agg(t ORDER BY t)::text,'{}')
            FROM m.compute_rule_slot_times(split_part(frm,':',2)::uuid,7) t);
  ELSE
    -- synthetic form is convention-invariant (Saturday=6 under dow and isodow); recompute identically
    a := (SELECT array_agg(d::date ORDER BY d)::text
            FROM generate_series(date_trunc('week',now()::date)::date, date_trunc('week',now()::date)::date+6, interval '1 day') d
           WHERE EXTRACT(dow FROM d)::int=6);
  END IF;
  IF a IS DISTINCT FROM b THEN RAISE EXCEPTION 'POST-8 Saturday non-regression failed: before=% after=%', b, a; END IF;
END $$;
```

---

## 8 · Rollback — data-free, exact

**Baseline captured as the mandatory first apply step:** persist `pg_get_functiondef` for all three functions verbatim (their md5s are pinned in §5). **That captured text IS the rollback.**

- **Rollback = re-execute the three captured original `CREATE OR REPLACE` statements**, restoring bodies byte-identical (verify restored md5 == §5). Pure function-body swap; **no data is written by the repair, so nothing needs undoing.**
- **Conditional branch (named, currently inert) — restore-set pinned fail-closed (auditor AHA-01-5):** the repair writes **no** `m.slot` rows. The only way Sunday slots could come to exist is if, between apply and rollback, the nightly materialiser (`materialise-slots-nightly`, 15:00Z) runs **and** a Sunday row has been enabled. With all 24 Sunday rows disabled (PRE-6), this branch does not trigger. If it ever did, the DELETE scope is **not narrated but re-derived fail-closed at rollback time from live state**, with an explicit count guard: `DELETE FROM m.slot WHERE status='future' AND schedule_id IN (SELECT schedule_id FROM c.client_publish_schedule WHERE day_of_week = 0 AND enabled = true)` — and the rollback asserts the deleted count equals the count of Sunday `future` slots observed, aborting the rollback on any mismatch rather than deleting an un-pinned set.

---

## 9 · Proof plan (PK's five, all satisfiable without enabling a Sunday production schedule)

`m.compute_rule_slot_times` is `STABLE`/side-effect-free and selects by `schedule_id` **without an `enabled` filter** (verified), so it can be exercised against the 24 existing disabled Sunday rows read-only. `get_week_format_allocation` is `STABLE`. `m.materialise_slots` is the only VOLATILE one — its Sunday behaviour is proven **transaction-locally with rollback**, never by a committed production enable.

| # | Proof | Method | PASS | Falsifies |
|---|---|---|---|---|
| **P1** | **Zero-delta, all currently-enabled schedules** | For every enabled `schedule_id` (Mon–Fri, all 4 clients), call `m.compute_rule_slot_times(id,7)` before and after; and `get_week_format_allocation(client, monday)` per enrolled client before and after | **byte-identical** results | any Mon–Fri change ⇒ not neutral ⇒ **STOP** |
| **P2** | **Saturday non-regression** | **Enforced by embedded guard POST-8** against the pinned `_saturday_before` fixture (deterministic: lowest `schedule_id` with `day_of_week=6`, else the data-free `generate_series` synthetic probe — OR resolved+recorded at capture). Not a proof-plan step: a real in-txn `DO/RAISE` → ROLLBACK, true parity with POST-6 | identical to the pinned baseline | Saturday drift |
| **P3** | **Sunday seen consistently — wrapper · materialiser · allocation**, transaction-local | In a transaction that **ROLLBACKs**: enable one existing Sunday row; (a) `m.compute_rule_slot_times(id,7)` returns ≥1 timestamp on a Sunday; (b) `m.materialise_slots(7)` creates its `future` slot; (c) `get_week_format_allocation` shows it **allocated and NOT in the unmatched list**; `ROLLBACK` | all three agree; **no contradiction** (this is where E5 is load-bearing) | any component still blind to Sunday, or the labeler still flags it |
| **P4** | **Disabled Sunday rows untouched** | before/after: `count(*) WHERE day_of_week=0` = 24, `enabled` distribution unchanged; no `m.slot` rows created outside P3's rolled-back txn | unchanged | an unintended activation/DML |
| **P5** | **Data-free rollback** | apply the §8 rollback in a scratch verification; assert all 3 md5 == §5 | 3/3 restored | rollback not exact |

**P3 creates NO committed production data** — the enable + materialise happen inside a transaction that is rolled back, so no Sunday demand is ever really created. PK's "do not enable a Sunday production schedule to prove it" is honoured: the enable is transaction-local and reverted.

---

## 10 · Carried governance debt (SEPARATE — not bundled, per PK)

The two `m.*` functions have **`proacl = NULL` (default)** — i.e. they are `SECURITY DEFINER` functions owned by `postgres` with **default EXECUTE grants (anon + authenticated executable)**. `get_week_format_allocation` is correctly locked (`postgres`+`service_role` only). **The anon-executable-SECURITY-DEFINER exposure on `m.compute_rule_slot_times` / `m.materialise_slots` is pre-existing and is NOT addressed here.** This packet's POST-5 asserts the ACLs are **unchanged** (neither widened nor narrowed) so the repair is ACL-neutral. **Recorded as separate carried governance debt for its own triage lane** (`db-rls-auditor` / `security-auditor`), explicitly out of this minimal repair's scope.

---

## 11 · Review chain, channel, gates, stop conditions

**Before freeze:** `apply-harness-auditor` (shadow mode) against this packet — **its PASS clears no gate; CONCERNS/INCOMPLETE returns to S2 for author review.**

> **Shadow-audit disposition — two passes recorded (the invoker's audit, per the shadow-mode contract).**
>
> **Pass 1 (v1→v2 draft):** CONCERNS, 5 findings, none INCOMPLETE-triggering. All 5 addressed: rollback-baseline PRE gate, in-txn before-snapshot, disclosed fallback atomicity cost, executable-guard enforcement note, fail-closed conditional rollback set. Primary body-swap rollback confirmed identity-consistent (check 7 clean).
>
> **Pass 2 (v2→v3):** CONCERNS — the v2 harness *declared* protections it did not *embed*. All 4 addressed: (1·M-1) §7 embeds inline `DO/RAISE` guard SQL for every gate; (2·M-3) §9 P2 Saturday resolves its OR to a deterministic pinned fixture; (3·order) PRE-1..7 are explicit numbered §6 steps before the first CREATE OR REPLACE; (4·M-2) a `txid_current()` guard fails a split channel closed.
>
> **Pass 3 (v3 pre-freeze re-audit):** CONCERNS, 2 findings; auditor confirmed fixes 1/3/4 closed + rollback identity-consistent (check 7 clean). **Both closed:** (AHA-06-1) added embedded **POST-6a** (`UPDATE _zerodelta_before SET after_value = <re-run same calls>`) + concrete `_zerodelta_before` capture SQL; (AHA-02-1) added embedded guard **POST-8** reading `_saturday_before` (`RAISE`→ROLLBACK), true parity with POST-6.
>
> **Pass 4 (v3 residual):** CONCERNS, 1 **low** consistency finding, not INCOMPLETE-triggering; AHA-06-1/AHA-02-1 confirmed closed. **Closed:** (AHA-01-6) the `_rollback_baseline` (A0) and `_apply_txid` (A0′) captures were narrated while the other two baselines were embedded — now **all four captures are embedded literal SQL**, and PRE-0's scope is stated explicitly.
>
> **Pass 5 (v3→v4):** CONCERNS, 1 **low** wording/enforcement mismatch, "for human-gate awareness, not a blocker", all four v2 findings confirmed resolved. **Closed by wording (option a):** (AHA-01-1) STOP #8 said rollback "captured **+ validated**" where §9 P5 defines validated = byte-exact dry-restore, but the embedded PRE-0 guard enforces only presence + `(sig, body_md5)`==§5 in-txn and the dry-restore is out-of-band. **v4 tightens STOP #8 to "captured + md5-pinned in-txn (PRE-0); dry-restore validated out-of-band (§9 P5)". No SQL changed** (content integrity remains byte-pinned via PRE-1; only the executability-of-restore proof stays out-of-band, a genuinely LOW residual since `pg_get_functiondef` output is a valid CREATE OR REPLACE by construction).
>
> **Pass 6 (v4 re-audit):** CONCERNS, 1 **low** finding; closed (AHA-01-2) — the two sibling PRE-0 loci aligned to STOP #8; the overstatement class fully closed.
>
> **Pass 7 (frozen v4 `73cad81a` FULL-CHAIN re-run, PK E5 ruling):** independently confirmed E5 present + the six E5-coupling requirements + the three live md5 pins still match §5 (no drift). **① apply-harness-auditor shadow:** CONCERNS, 1 **low** enumeration finding (AHA-08-1, functionally covered) — closed in v5 by aligning §6's run-order to the full §7 POST set (POST-1…POST-8 incl. POST-6a); confirmed check-7 rollback identity clean, all four baselines populate-before-consume, E5 count-consistent with PRE-3/POST-4. **② `db-rls-auditor`: PASS** — the repair is grant-, RLS-, and REST-exposure-neutral (`CREATE OR REPLACE` preserves ACL; POST-5 guards it). It independently confirmed the §10 carried debt is **live** (security advisor: `m.compute_rule_slot_times` + `m.materialise_slots` are anon-executable SECURITY DEFINER RPCs at `/rest/v1/rpc/*`, `materialise_slots` a VOLATILE writer) — **pre-existing, not introduced or worsened by this body-only repair, correctly carried to its own lane, NOT bundled.** **No SQL changed v4→v5.** Author-side disposition; this chain clears no gate — external exact-hash review and the PK T3 apply gate run unchanged above it.

**Orchestrator chain (after freeze):** `db-rls-auditor` on the exact transformed bodies → exact-hash external review pinned to this packet's sha256 → independent apply-hand prep → **STOP at the PK T3 apply gate.** One production window at a time.

**Atomicity channel:** the apply must run through a channel that composes a real multi-statement transaction (single `execute_sql` with `BEGIN…COMMIT`, or `apply_migration`). If the channel splits statements across a pool, §6's per-function fallback (one txn each, ordered, fail-aborts-remainder) applies; the packet must name which channel the apply hand used.

**STOP conditions (contract-level, replacing v1's stale "isodow only in 2 m.* functions"):**

1. Any §5 `md5`/count/owner/secdef/acl pin ≠ live (PRE-1..5).
2. **Census STOP:** the `%isodow%` census returns anything other than the exact 3 functions — a 4th consumer appearing between freeze and apply is a hard ABORT (PRE-7).
3. Any relevant weekday comparison still on `isodow` after apply (POST-1).
4. The `get_week_format_allocation` string literal altered, or its surviving-`isodow` count ≠ 1 (POST-3).
5. Any enabled `day_of_week=0` row at apply time (PRE-6).
6. Zero-delta (P1) fails for any enabled schedule.
7. Any signature/owner/secdef/volatility/**proacl** drift (POST-5).
8. Rollback not **captured + md5-pinned in-txn** before the first CREATE OR REPLACE (PRE-0 enforces presence + `(sig, body_md5)`==§5); the byte-exact **dry-restore is validated out-of-band (§9 P5)**, not as an in-txn guard.
9. **Atomicity STOP:** `txid_current()` at COMMIT-time ≠ the `_apply_txid` pinned at A0′ — a pooled channel split the transaction (POST-7); fail closed.
10. Production window not held by this packet · any non-clean auditor/review verdict.

---

## Scope

**In scope:** the `isodow`→`dow` contract repair across the **three** live consumers the census identifies (E1–E4), plus the single coupled labeler predicate (E5) that consistency requires; its census, preconditions, executable apply, assertions, rollback, proof.

**Out of scope (per PK "MINIMAL"):** any other date logic · the reason_code CASE / string cleanup (dead-but-harmless after E5) · the `save_publish_schedule` delete-recreate asymmetry · Saturday behaviour (correct, §2) · the anon-executable SECDEF debt (§10, separate lane) · any schedule-row activation/rewrite/migration · any dashboard file · format/mode/planner work · cc-0079.

## Allowed actions (this lane — complete)

`git fetch --prune` + read-only ref reads; read-only CE reads; **R0 `db-read.py`** census + `pg_get_functiondef` + `md5`/count/acl pins (all read-only catalogue); authoring this one document. **No `execute_sql` write, no DDL, no DML.**

## Forbidden actions (all honoured)

No apply · no DDL/DML executed · no migration run · no dashboard file edited · no deploy · no new write path · no schedule row activated/rewritten/migrated · no `cc-` ID self-allocation · no register version · no self-approval · no commit · no push · production window not taken. v1 not presented/applied.

## Success criteria for this packet

1. Both stale-ref gates + a full independent census recorded (not the assumed list). ✅ §0, §2
2. All three real consumers identified; the two already-correct and the two no-weekday consumers proven so. ✅ §2
3. The string-literal-vs-code `isodow` disambiguation and the coupled labeler surfaced, not smuggled. ✅ §3, §4
4. Every invariant PK named has an executable assertion (signatures/owners/secdef/ACL/Mon–Fri neutral/Saturday/disabled-Sunday-inert/same-convention/no-residual-isodow). ✅ §7, §9
5. Contract-level census STOP replaces v1's stale two-function assertion; immutable preconditions pinned. ✅ §5, §11
6. Data-free rollback + a Sunday proof that enables nothing in committed production. ✅ §8, §9 P3
7. Anon-executable SECDEF recorded as separate debt, not bundled. ✅ §10
8. Nothing applied, mutated, committed, pushed. ✅

## Stop condition

Packet ends the lane. Freeze at a **new path** (v1 not overwritten). Return path + sha256 + byte count. `apply-harness-auditor` shadow review before the orchestrator chain; **STOP at the PK T3 apply gate.**

## Open decisions for PK

1. **E5 (the coupled labeler)** — include (recommended; required for proof #3 and consistency), or apply E1–E4 only and waive proof #3?
2. **Sequencing vs Slice A** — Slice A (which is `get_week_format_allocation` itself, now live and labeling the mismatch) is *the function being repaired*. After the repair its `sunday_written_as_zero` label goes dormant. Confirm the intended order: repair now (the label was informational), or hold until the label has served its purpose?
3. **End-to-end committed Sunday proof** — accept the transaction-local P3 (recommended), or elect a real enable in a later window?
4. **The 24 disabled Sunday rows** — leave inert (recommended), or any disposition?
5. **Resolver location / ID allocation** — as before, central/PK.

## Non-claims

Does not claim the repair is applied, reviewed or approved. Does not claim the three bodies were transcribed into this packet (deliberately not — §6). Does not claim `m.materialise_slots` was read in full — its two `isodow` sites and header were read directly and its md5 pinned; the apply hand re-captures and re-verifies in full. Does not decide E5 (§4) or sequencing. Does not assert no Sunday row will be enabled before apply — PRE-6 makes that a STOP. Does not address the anon-executable SECDEF exposure (§10). Does not claim the dashboard is affected.

## Evidence basis

CE `64523be` (parity 0/0). Live read-only 2026-07-25, project `mbkmaxqhsohbtwsqolns` (R0 `db-read.py`, `pg_*` catalogue): C1–C4 census; `pg_get_functiondef` for the 3 targets + `get_next_publish_slot`/`get_next_scheduled_for` (confirmed `dow`) + `build_weekly_demand_grid`/`get_publishing_plan_pyramid` (confirmed no weekday derivation); `md5(pg_get_functiondef)`, `EXTRACT(isodow FROM d)` / `isodow` / `NOT BETWEEN 1 AND 7` / `EXTRACT(dow FROM d)` counts, owner/secdef/volatility/proacl per §5; `c.client_publish_schedule` CHECK + `day_of_week`×`enabled` distribution (24 Sunday, 0 enabled). Prior: v1 `1c2230d0…` (SUPERSEDED). **No write, DDL or DML issued in this lane.**
