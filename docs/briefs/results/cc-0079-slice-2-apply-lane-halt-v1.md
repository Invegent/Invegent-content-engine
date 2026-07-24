# cc-0079 Slice 2 — Apply Lane Result: HALTED AT GATE ④ (v1)

> **Lane:** cc-0079 Slice 2 (data-only mix renormalization) · **Session:** S1 · **Type:** APPLY-lane result
> **Outcome:** **HALTED — did NOT reach the PK apply gate.** `db-rls-auditor` returned **`concerns`**, and per the ICE orchestration contract a non-clean subagent verdict halts the lane and surfaces to PK.
> **Production mutation: NONE.** No DML executed, no row mutated, no commit, no push, no deploy.
> **Base:** CE `origin/main == HEAD == ad4a6a9`, parity 0/0. Target project `mbkmaxqhsohbtwsqolns` (`content_engine`). All evidence read live 2026-07-24.

---

## 1 · Outcome in one line

The packet's **data payload is correct and fully reproduced**. Its **execution harness is not fail-closed**, and the default ICE execution channel cannot hold the single transaction the packet's entire safety argument depends on. Three must-fix defects block the apply. **The proposed shares/IDs do not change** — this is a re-cut of the harness, not a re-derivation.

## 2 · Gate chain — actual results

| Gate | Check | Result |
|---|---|---|
| ① | Stale-ref gate — `git fetch --prune`, HEAD vs `origin/main` vs `ls-remote` | **PASS** — all three `ad4a6a9`, parity 0/0, branch `main` |
| ② | Re-hash both artifacts **from ref** (`git show origin/main:<path>`) | **PASS** — packet `73dd7413…` ✓ · review record `0494f77e…` ✓ · both paths clean in worktree |
| ③ | Confirm target project | **PASS** — `mbkmaxqhsohbtwsqolns` = `content_engine`, ACTIVE_HEALTHY, ap-southeast-2, PG 17.6.1 |
| ④ | `db-rls-auditor` on the exact §4 DML | **CONCERNS — GATE FAILED, LANE HALTED** (§3 below) |
| ⑤ | Re-run the §2 derivation | **PASS** — reproduces §2 exactly (§4 below) |
| ⑥ | Re-confirm the 17-row identity set live | **PASS** — zero drift both directions (§5 below) |
| ⑦ | PK apply gate | **NOT REACHED** — blocked by ④ |
| ⑧ | Execute | **NOT RUN** |
| ⑨ | Post-apply proof | **NOT RUN** (but the AFTER state was independently simulated — §4) |

## 3 · Why the lane halted — three must-fix defects

Full findings contract returned by `db-rls-auditor`; S1 independently re-verified M-1 and M-3 by reading the packet, and **converted M-2 from reasoned to empirically tested**.

### M-1 (high) — the §5 assertions are SQL comments, not enforcement

§4 carries `-- must report exactly 17 rows updated, else ABORT` (line 112) and `-- A3..A5 assertions in §5 must all pass BEFORE COMMIT` (line 127). These are **comments**. There is no `RAISE EXCEPTION`, no `DO` block, no conditional. Every statement commits regardless of whether any assertion holds. §7 names A1≠17 / A2≠7 / A3–A6 as STOP conditions — **none of those STOPs exist in the code.**

This is precisely the standing ICE failure mode *"declared control production never reads"*: a control recorded and scored PASS while nothing reads it.

### M-2 (high) — execution channel unnamed; the default channel cannot hold the transaction

§7 says *"run §4 in one transaction"* but never names the channel. **S1 tested this live rather than reasoning about it:**

| Probe | Result |
|---|---|
| Call A: `BEGIN; SELECT pg_backend_pid(), txid_current();` | pid **3363924**, xid **3869213** |
| Call B (separate call): same query | pid **3363941**, xid **3869214** — **different backend, new xid** |

**Each `execute_sql` call lands on a different pooled session.** A `BEGIN` in one call and a `COMMIT` in another do not compose — confirmed, not inferred.

**Concrete failure window:** if §4 is run statement-by-statement over MCP (the routine ICE path), A1 commits alone → facebook, instagram **and** linkedin each have **zero `is_current` rows**.

**Open question O-2 is now answered — the failure is SILENT.** Reading `m.build_weekly_demand_grid`: its `candidate` CTE draws from `platform_format_mix_default WHERE is_current` UNION `c.client_format_mix_override`. PP has **0 current overrides** (verified live). With zero current rows, FB/IG/LI produce no candidate rows and **vanish from the demand grid entirely** — every downstream CTE is partitioned by platform. **No error is raised.** A three-platform outage with no alarm, strictly worse than today's state.

### M-3 (med) — A6 is unevaluatable as written

A6 (§5 line 144) requires comparing YouTube's 5 rows against a pre-apply baseline. §6's designated baseline query (line 163) filters `WHERE platform IN ('facebook','instagram','linkedin')` — **it excludes YouTube entirely.** A named §7 STOP condition has no data to evaluate against.

*(S1 captured the missing baseline anyway — YouTube fingerprint `db67ce6cdfe394e80cbec9dcee422c22`, 5 rows, current sum 100.00.)*

### Remediation is proven, not merely proposed

S1 tested both halves of the fix live:

- **Channel:** a **single** `execute_sql` call **does** compose — 5 statements (BEGIN / CREATE TEMP / INSERT / SELECT / COMMIT) ran in one session under one xid, temp rows read back correctly. So "submit §4 as ONE call" delivers a real transaction; psql or the SQL Editor also qualify.
- **Assertions:** `DO $$ … IF <cond> THEN RAISE EXCEPTION '…'; END IF; END $$;` aborts the entire call — probe returned `ERROR: P0001: A-PROBE FAILED: got 1, expected 99`. Combined with one-call-one-transaction, this makes the STOPs machine-enforced.

## 4 · §5 — derivation reproduced (PASS)

The §2 query re-run verbatim reproduces the §2 table **exactly**: FB `image_quote 40.00 · carousel 33.33 · text 26.67` (invalid Σ 25.00) · IG `carousel 60.00 · image_quote 40.00` (invalid Σ 50.00) · LI `text 57.14 · image_quote 42.86` (invalid Σ 65.00). YouTube all-valid, `invalid_sum` NULL, unchanged.

**§1 independently reproduced — the part the packet carried but nobody had re-run.** Fed the live grid through the real `m.allocate_week_formats(shares, 5)`:

| Platform | BEFORE (reproduced) | invalid |
|---|---|---|
| linkedin | `carousel · carousel · text · image_quote · video_short_kinetic` | **3 of 5** |
| instagram | `carousel · carousel · image_quote · video_short_kinetic · video_short_stat_voice` | **2 of 5** |
| facebook | `image_quote · image_quote · carousel · text · video_short_kinetic` | **1 of 5** |

Allocation strings match the packet **character-for-character**. **6 of 15 (40%) confirmed.**

AFTER, simulated from the exact 7 proposed rows (no mutation): FB `image_quote · carousel · image_quote · carousel · text` · IG `carousel · image_quote · carousel · carousel · image_quote` · LI `text · image_quote · text · text · image_quote` — **every platform 0 invalid of 5.** Matches the packet's §1 AFTER table exactly. **6 of 15 → 0 of 15 is verified, not carried.**

**N=5 confirmed** from `c.client_publish_schedule` (5 enabled slots/week/platform, all four platforms). *Note for the record: the grid's `weekly_slot_count` column is a per-format count (max 2), not the platform total — reading it as N would understate the cadence. The platform total is the sum, = 5. The packet's N=5 is correct.*

## 5 · §6 — live identity confirmation (PASS)

| Check | Expected | Live |
|---|---|---|
| Pinned identity count | 17 | **17** |
| Live current FB/IG/LI rows | 17 | **17** |
| Live rows NOT in pinned list | 0 | **0** |
| Pinned rows NOT live | 0 | **0** |
| Distinct `effective_from` | 1 (`2026-04-22`) | **1 — `2026-04-22`** |
| A0 collision at `CURRENT_DATE` | 0 | **0** (`CURRENT_DATE` = `2026-07-24` in-DB) |
| H2 duplicate current rows now | 0 | **0** |
| YouTube current rows | 5 | **5** |

**Zero drift. The §6 Drift STOP is satisfied as of this read.** `platform_support` still matches the PK ruling exactly — within the mix, FB valid = 3 (`image_quote`,`carousel`,`text`), IG = 2 (`carousel`,`image_quote`), LI = 2 (`text`,`image_quote`).

**Baselines captured** (rollback reference): all 17 FB/IG/LI rows — `is_current=true`, `effective_from=2026-04-22`, `updated_at` uniformly `2026-04-22 07:43:18.946303+00`, shares matching §2 "before". YouTube fingerprint `db67ce6cdfe394e80cbec9dcee422c22`.

**Notable structural fact:** the table holds exactly **22 rows, all `is_current=true`** — there is no history, not one `is_current=false` row. Consequences: R2's blanket `SET is_current=true` on the 17 is provably correct, and the post-apply current set for FB/IG/LI is arithmetically forced to be exactly the 7 new rows.

## 6 · What the audit CONFIRMED as correct (the payload)

Recorded so the re-cut does not re-litigate settled ground:

- **No migration required** — §4 is pure DML (BEGIN/SELECT/UPDATE/INSERT/COMMIT), zero DDL. Ledger checked (554 entries): no `cc-0079` / `slice_2` name collision either way.
- **Constraints all satisfied** — `UNIQUE (platform, ice_format_key, effective_from)` confirmed to exist exactly as §3/H1 states; A0 = 0 live; both FKs satisfied for all 7 proposed rows; CHECK `0–100` satisfied.
- **H2 CONFIRMED and understated** — `idx_platform_format_mix_default_current` is `USING btree (platform) WHERE is_current=true`, non-unique, and keyed on **platform alone**. There is no uniqueness enforcement on `is_current` at *any* granularity. A3 is the only guard — which is exactly why M-1 matters.
- **Zero user triggers** — all 8 are internal RI constraint triggers; none mutate or cascade. No `updated_at` trigger, so A1's explicit `updated_at = now()` is both correct and necessary.
- **YouTube unreachable four independent ways** — literal 17-UUID IN-list excludes all 5 YT ids; A2 inserts only FB/IG/LI; no triggers/cascades; the only inbound FK is the self-FK on `superseded_by`, which the apply never writes.
- **A5 numeric safety** — `default_share_pct` is `numeric(5,2)`, exact decimal; all sums evaluated in-database at the column's own type = `100.00` exactly for all three platforms.
- **INSERT column list complete** — every NOT NULL column without a default is supplied; no generated/identity columns.
- **Rollback R1 cannot remove an original** — the 7 new ids are `gen_random_uuid()`-minted and disjoint from the 17 fixed originals.
- **No security finding** — RLS off but `relacl` NULL and schema `t` grants USAGE to **neither `anon`, `authenticated`, nor `service_role`**; table unreachable by any API role. The two REST-exposed SECDEF RPC readers have `anon`/`authenticated` already REVOKEd and pin `search_path`. Zero advisor findings reference this table. **Nothing for this lane to fix.**

## 7 · Carried should-fix items (for the re-cut author, not blockers)

- **S-1** — record a deterministic rollback fallback: `evidence_source='cc-0079-slice-2'` returns **0 rows today**, so `DELETE … WHERE evidence_source='cc-0079-slice-2' AND effective_from=DATE '2026-07-24'` can only ever match the 7 rows this apply creates. Protects against a lost apply session.
- **S-2** — `superseded_by` (the table's designed lineage column) is left NULL by A1. Mapping is not 1:1 (17 retired → 7 successors; 10 have no successor by design), so at most 7 links are populatable. **PK's call** — flagged so it is decided deliberately rather than by omission. Once committed without it, lineage is not reconstructible from data alone.
- **S-3** — A3 (`HAVING count(*)>1 → 0 rows`) detects duplicates but not absence; it is satisfied by a zero-current-rows state too. Add an explicit `count(*) = 7` assertion.
- **S-4** — a pre-existing view `t.platform_format_mix_default_check` already codifies the sum invariant as `abs(sum − 100) < 0.01`. Asserting via it would align the apply with the schema's own declared invariant.
- **S-5** — name the rollback residual: `updated_at` is the **only** column that does not return to its pre-apply value. §6 says "no data destroyed" (true) but does not state this.
- **O-4** — §7's "confirm it still yields the §2 table" is eyeball, not mechanical. Same class of gap as M-1.

## 8 · Required next steps (none waivable)

1. **Re-cut the packet** to close M-1, M-2, M-3. All three are edits to the execution harness and the §6 baseline query. **The proposed DATA does not change.**
2. **The re-cut gets a NEW sha256 ⇒ the external review goes STALE.** Review `f46949d3-eb68-4a78-9fa9-68381b4f8608` is valid **only** for `73dd7413…` (CLAUDE.md external-review rules 1 and 4). A fresh review is mandatory the moment §4 changes.
3. **Re-run `db-rls-auditor`** against the new hash — cheap, since the live-state facts hold absent drift.
4. **Then** the PK apply gate.
5. **The packet's §8 `policy_decision` is CLOSED — do not carry it forward as open.** PK **ruled** it at **v6.22** (commit `ad4a6a9`), *before* this lane opened: **Facebook 3 valid formats · Instagram 2 · LinkedIn 2**, accepted scope for this slice and **explicitly NOT a permanent ceiling on future formats**. The live `platform_support` state was re-verified against that ruling in §5 above and matches it exactly. *Correction of record: an earlier byte state of this doc listed this item as "independently open" — that was stale. `db-rls-auditor` likewise treated it as open, correctly, since the ruling post-dates the packet it audited and sits outside its remit.* Successor docs must not re-raise it.

## 9 · Scope honesty

This lane, when it eventually applies, makes the schedule **stop allocating unpublishable formats**. It does **not** build platform+format planning in the dashboard UI — that is a separate scoping lane. Nothing here changes the mix function, client overrides (none exist), the Advisor (Slice 1), or transport. The durable fix — a `platform_support` intersection inside `m.build_weekly_demand_grid` — remains a named **code** successor, out of this data-only scope.

## 10 · Handoff to the re-cut author (S5) — validated harness patterns

S1 is **not** the re-cut author (segregation of duties: S1 found the defects and remains the apply hand). These are the exact probes S1 ran, recorded here so S5 inherits tested primitives rather than re-deriving them. **All three touched only temp tables or session functions — no production table.**

**P1 — proves separate `execute_sql` calls do NOT share a session or transaction (M-2).** Run as two separate calls:

```sql
-- call A
BEGIN; SELECT pg_backend_pid() AS pid, txid_current() AS xid;
-- call B (separate invocation)
SELECT pg_backend_pid() AS pid, txid_current() AS xid, pg_current_xact_id_if_assigned()::text AS in_xact;
```

Observed: pid `3363924` / xid `3869213` → pid `3363941` / xid `3869214`. **Different backend.** The `BEGIN` did not survive.

**P2 — proves a SINGLE call DOES compose into one transaction (the channel fix).** One call:

```sql
BEGIN;
CREATE TEMP TABLE _atom_probe(x int) ON COMMIT DROP;
INSERT INTO _atom_probe VALUES (1),(2),(3);
SELECT count(*) AS rows_seen_in_same_txn, txid_current() AS xid, pg_backend_pid() AS pid FROM _atom_probe;
COMMIT;
```

Observed: `rows_seen_in_same_txn = 3`, single xid `3869215`, pid `3363943`. **All five statements shared one session and one transaction.** `ON COMMIT DROP` self-cleans.

**P3 — proves the assertion pattern aborts the whole call (the M-1 fix).** One call:

```sql
BEGIN;
CREATE TEMP TABLE _abort_probe(x int) ON COMMIT DROP;
INSERT INTO _abort_probe VALUES (1);
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM _abort_probe;
  IF n <> 99 THEN RAISE EXCEPTION 'A-PROBE FAILED: got %, expected 99', n; END IF;
END $$;
COMMIT;
```

Observed: `ERROR: P0001: A-PROBE FAILED: got 1, expected 99`. **The call aborts; nothing commits.**

**Therefore the re-cut §4 should:** be submitted as **ONE** call (or via psql / the SQL Editor — never statement-by-statement); wrap **A0 and A1–A6** in `DO $$ … IF <cond> THEN RAISE EXCEPTION …; END IF; END $$;` blocks interleaved in the same transaction, taking the A1/A2 rowcounts via `GET DIAGNOSTICS … = ROW_COUNT`; and drop the `WHERE platform IN (…)` filter from the §6 baseline query so A6 has YouTube data to compare against (baseline fingerprint `db67ce6cdfe394e80cbec9dcee422c22` is recorded in §5 above).

## 11 · Non-claims

Nothing applied. No DML executed, no row mutated, no schema touched, no commit, no push, no deploy. This lane was **not** combined with Slice 1, cc-0080, or any other database window. No YouTube row was touched or read for mutation. The three probes S1 ran (`pg_backend_pid`/`txid_current`, a `ON COMMIT DROP` temp table, and a `RAISE EXCEPTION` DO block) touched **no** production table and left no residue. All counts, IDs and shares are live as of **2026-07-24** and must be re-verified at apply time per the packet's own §6 Drift STOP — the identity confirmation in §5 above is a point-in-time read, not a lock. This result doc does **not** approve, ratify, or authorise the apply; `concerns` is evidence for PK, not permission.
