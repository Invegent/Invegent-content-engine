# Repair Packet — schedule `day_of_week` contract: `0` (DOW) vs `7` (ISODOW)

**Created:** 2026-07-24 Sydney
**Lane:** **S2 · Sunday contract repair** — minimal repair under PK's blocker rule
**Author:** S2 worker session (READ-ONLY; authoring only)
**Status:** **AUTHOR-ONLY. NOT APPLIED.** No DDL run, no DML run, no dashboard file edited, no commit, no push.
**Canonical ID:** **NOT SELF-ALLOCATED** — central/PK act. No `cc-` number, no register version claimed.
**Lane classification (CCF-02):** SAFETY_GATE · **Tier T3** (production function change on the slot-materialisation spine — §5)
**Blocker-rule position:** blocks **priority 1, client schedule planning** · mechanism demonstrated (§1) · repair contained to **2 functions, 3 lines, 0 rows of data** · program resumes immediately after.

---

## 0 · Stale-ref gate (PASSED — both repos)

| Repo | Fetched | Upstream (this session) | Working base | Verdict |
|---|---|---|---|---|
| CE `Invegent-content-engine` | `fetch --prune` | `ad4a6a944027897672764c1540f53890e027c2ee` (`ls-remote` agrees) | `ad4a6a9` on `main`, parity **0/0** | **AT UPSTREAM** |
| `invegent-dashboard` | `fetch --prune` | `524ca6d1c25da0c37ec014c7612a6623ce38b3bd` | checkout `fda2b51` on `tmr-template-intake-ui-v0`, **0 ahead / 5 behind** | **STALE — read via `git show origin/main:`** |

Dashboard checkout **not** pulled, checked out, branched or written — S6 holds write precedence this round.
Only `git fetch --prune` was run there (ref update, no working-tree effect).

---

## 1 · The defect (restated, both sides verified first-hand)

| Side | Object | Convention | Evidence |
|---|---|---|---|
| **Storage** | `c.client_publish_schedule.day_of_week` | **0–6, Sunday = 0** | `pg_constraint`: `CHECK ((day_of_week >= 0) AND (day_of_week <= 6))` |
| **UI (writer)** | `ScheduleTab.tsx:6-7` → `savePublishSchedule` | 0–6, Sunday = **0** | `ALL_DAYS=["Sun",…]`, `DAY_ORDER=[1,2,3,4,5,6,0]` |
| **CE (reader)** | `m.compute_rule_slot_times`, `m.materialise_slots` | **1–7, Sunday = 7** | `pg_get_functiondef`: `EXTRACT(isodow FROM d)::integer = …day_of_week` |

`isodow` never returns `0`, so a Sunday row matches nothing. The save succeeds, the UI renders
**"Saved ✓"**, and zero slots are produced. Silent — no error, no surface, no log.

---

## 2 · Q1 — which side moves

### 2.1 The finding that decides it: the convention is split **inside production**, and the deviant is the minority

Every DB object referencing `day_of_week` (`pg_proc.prosrc` scan, this session — 7 objects):

| Object | Uses | Correct vs the CHECK? |
|---|---|---|
| `public.get_next_publish_slot` | `EXTRACT(DOW …)` → 0–6 | ✅ |
| `public.get_next_scheduled_for` | `EXTRACT(DOW …) = cps.day_of_week` | ✅ |
| `public.save_publish_schedule` | passthrough insert, no arithmetic | ✅ n/a |
| `public.get_publish_schedule` | passthrough read | ✅ n/a |
| `c.handle_schedule_rule_change` | change-detection only, no arithmetic | ✅ n/a |
| **`m.compute_rule_slot_times`** | **`EXTRACT(isodow …)` → 1–7** | ❌ **deviant** |
| **`m.materialise_slots`** | **`EXTRACT(isodow …)` → 1–7, ×2 join sites** | ❌ **deviant** |

**Two of three consumers already implement 0–6, matching the declared CHECK. Only the `m.*`
materialiser pair deviates.** The table is the contract; the contract says Sunday = 0; two functions
break it.

### 2.2 Recommendation

> **Change the CE side. Replace `isodow` with `dow` at the three deviant sites in
> `m.compute_rule_slot_times` (×1) and `m.materialise_slots` (×2). Nothing else.**

**Why the alternatives are worse, not merely different:**

| Option | Verdict |
|---|---|
| **UI writes `7`** | **Not viable minimally — it hard-fails.** `7` violates `CHECK (day_of_week <= 6)` → the save errors (23514). Making it work requires constraint change **+** data migration **+** UI read **and** write change **+** re-checking `get_next_publish_slot`/`get_next_scheduled_for`, which would then be reading ISO values with DOW logic. **Four coordinated changes, and it breaks days that currently work.** |
| **Normalise `0↔7` inside `save_publish_schedule` / `get_publish_schedule`** | **Reject.** A hidden dual translation; stored data would then disagree with its own CHECK; and it silently feeds ISO values to the two functions that correctly expect 0–6 — **converting a dormant Sunday bug into a live Sunday bug on the next-slot path.** |
| **Add a constraint only** | Not a repair. It could make the bad value unrepresentable but Sunday stays unschedulable, and it would reject the 24 rows already stored (§3). |
| **✅ CE matcher moves to `dow`** | One convention, already the declared and majority one. **Three tokens. No schema change, no DML, no grant change, no UI change.** |

### 2.3 Behaviour-neutrality is provable, not asserted

`dow` and `isodow` are **identical for Monday–Saturday** and differ **only** on Sunday.
Machine-derived this session over a full week:

| day | `dow` (0–6) | `isodow` (1–7) | identical |
|---|---|---|---|
| Mon–Sat | 1,2,3,4,5,6 | 1,2,3,4,5,6 | **true** (all six) |
| **Sun** | **0** | **7** | **false** |

Combined with §3 (every `day_of_week = 0` row is disabled), the change alters the materialiser's
output for **zero currently-enabled schedule rows**.

---

## 3 · Q2 — existing data (the required R1 read)

Routed properly: R0 (`db-read.py`) cannot reach `c.*`, so this used **R1 `execute_sql`, read-only
SELECT**, project `mbkmaxqhsohbtwsqolns`, 2026-07-24.

| `day_of_week` | label | rows | **enabled** | clients | platforms |
|---|---|---|---|---|---|
| **0** | **Sun** | **24** | **0** | 2 | 3 |
| 1 | Mon | 37 | 14 | 4 | 4 |
| 2 | Tue | 39 | 14 | 4 | 4 |
| 3 | Wed | 36 | 14 | 4 | 4 |
| 4 | Thu | 38 | 14 | 4 | 4 |
| 5 | Fri | 36 | 14 | 4 | 4 |
| **6** | **Sat** | **27** | **0** | 4 | 3 |

**Answer: 24 `day_of_week = 0` rows exist. All 24 are `enabled = false`.**

**Disposition: left in place, unmigrated, and NOT stranded — no DML is required or proposed.**

- Before the repair a disabled Sunday row materialises nothing (disabled **and** unmatched).
- After the repair it materialises nothing (disabled).
- The difference is that enabling one afterwards **works**. That is the whole repair.

> This is why the repair carries **zero DML**. A migration here would be motion without effect: the
> rows are already in the convention the repaired code reads. **The defect is dormant** — confirmed
> against the authoritative table, not inferred from slot counts.

---

## 4 · Q3 — Saturday: **not defective, simply unscheduled**

Do not assume symmetry — and it is not symmetric.

- In the 0–6 storage convention, Saturday = **6**. `EXTRACT(dow)` for Saturday = **6**;
  `EXTRACT(isodow)` for Saturday = **6**. **They agree** (§2.3 table). A Saturday row matches under
  *both* conventions.
- Live: **27 Saturday rows, 0 enabled.**

**Therefore zero Saturday slots is an operator choice, not a fault.** Enabling a Saturday row today
would produce slots on the current code. **Only Sunday is broken**, because Sunday is the single day
where the two conventions disagree.

*(Corollary: after the repair, Saturday behaviour is bit-identical. It is not part of this repair and
needs no verification beyond the §7 P2 neutrality check.)*

---

## 5 · Q4 — blast radius, tier, gates, rollback

### 5.1 Blast radius — bounded by measurement

- **`day_of_week` exists on exactly ONE table in the entire database.** `pg_attribute` scan across all
  non-catalog schemas returns `c.client_publish_schedule` and its unique index — nothing else.
- **DB consumers: 7 objects, 2 changed** (§2.1).
- **Dashboard consumers: 2 files** — `components/clients/ScheduleTab.tsx`, `actions/schedule.ts`.
  **Neither changes.** (`actions/publishing-plan-pyramid.ts:47 weekdays` is RPC-supplied, not
  written by the UI, and is untouched.)
- **Nothing depends on the current broken behaviour.** The broken path produces no rows; there is no
  consumer of "Sunday produces nothing" other than the absence itself.

### 5.2 Tier — **T3**

Production function change (`CREATE OR REPLACE FUNCTION`) on the slot-materialisation spine; both
functions are `SECURITY DEFINER`. Per CLAUDE.md, production-touching ≥ T3; nothing waived.

**Signature/ACL note:** the change is body-only — identical name, args, return type, volatility,
`SECURITY DEFINER` and `SET search_path`. `CREATE OR REPLACE` **preserves the existing ACL** (the
born-anon-executable trap is `CREATE`-only), so **no GRANT/REVOKE is proposed or required**. The apply
must nonetheless diff `proacl` before/after and STOP on any change.

### 5.3 The change (for the apply hand — NOT run here)

Body-only edit at three sites. Exact current text at each, from `pg_get_functiondef`:

```
m.compute_rule_slot_times   1 site   WHERE EXTRACT(isodow FROM d)::integer = v_day_of_week
m.materialise_slots         2 sites  ON    EXTRACT(isodow FROM d)::integer = s.day_of_week
```

→ replace `isodow` with `dow` at those three occurrences. **No other token changes.**

**Verify-or-abort:** the apply hand re-reads both functions with `pg_get_functiondef` at apply time
and aborts unless it finds **exactly 3** `isodow` occurrences across exactly these two functions. A
different count means the source moved since authoring → **re-derive, do not adapt.**

### 5.4 STOP conditions (non-removable)

1. `isodow` occurrence count ≠ 3, or found outside these two functions.
2. Any signature, return type, volatility, `SECURITY DEFINER`, `search_path` or `proacl` difference before vs after.
3. **P2 neutrality check fails** (§7) — any Mon–Fri schedule_id whose timestamps differ before vs after.
4. `c.client_publish_schedule` CHECK is no longer `0..6`, or any `day_of_week = 0` row is `enabled = true` at apply time (the §3 baseline moved → re-derive; an enabled Sunday row changes the risk profile).
5. Any non-clean auditor or external-review verdict.
6. Rollback not captured and validated **before** the first statement.
7. **Production window not held by this packet** (§6).

### 5.5 Rollback — captured before apply, exact

1. **Baseline (mandatory first step, before any change):** persist `pg_get_functiondef` for **both**
   functions verbatim. That text **is** the rollback — restoring it is a pure body swap with no data
   effect.
2. **Rollback = re-apply the two captured definitions.** Reversible completely; no data is written by
   the repair, so nothing needs undoing.
3. **One conditional cleanup, named explicitly:** if the materialiser cron (`materialise-slots-nightly`,
   15:00Z) runs between apply and rollback **and** any Sunday row has been enabled in that interval,
   Sunday slots will exist. Rollback then also requires
   `DELETE FROM m.slot WHERE status='future' AND <isodow 7> AND schedule_id IN (<the Sunday rows>)`,
   scoped by identity and captured at the time. **With all 24 Sunday rows disabled (§3), this branch
   does not trigger** — it is written because rollback must be valid under the state that exists at
   rollback time, not the state that existed at authoring.

---

## 6 · Sequencing, windows, and the S6 / Slice A interaction

- **Exactly one production window is open at a time, and cc-0079 Slice 2 holds it.** This packet
  **queues behind Slice 2** and gets its own reviewed gate and its own window. It is not bundled with
  Slice 2, Slice A, or anything else.
- **This packet requires no change to Slice A and does not assume Slice A's panel exists.**
- **⚠ Consequence PK must sequence deliberately:** PK has required Slice A to **detect and label** the
  `0` vs `7` mismatch. **This repair removes the mismatch.** Once applied, a Slice A label reading
  *"Sunday: stored 0, matcher expects 7 — will not materialise"* becomes **false**. Recommended
  ordering: **Slice A ships and is observed first; this repair applies after**, so the label has a real
  pre-state to render and its retirement is a deliberate follow-up rather than a silent
  contradiction. **Stated, not decided — the sequencing call is PK's.**
- **Division of labour, unchanged:** S6 detects and labels · S2 authors the fix · **neither applies.**

---

## 7 · Q5 — proof, and what would falsify it

The key property: **`m.compute_rule_slot_times` is `STABLE` and side-effect-free** (`provolatile='s'`,
verified) — it *returns* candidate timestamps and inserts nothing. It also selects its row by
`schedule_id` **without filtering on `enabled`** (verified in the body). **So the repair can be proven
against the 24 existing disabled Sunday rows without enabling anything, without any INSERT, and
without manufacturing a single row of production data.**

| # | Check | Method | PASS | Falsifies |
|---|---|---|---|---|
| **P1** | **The repair works** | Pick a schedule_id of an existing **disabled** `day_of_week = 0` row. Call `m.compute_rule_slot_times(<id>, 7)` **before** and **after**. | **Before: 0 rows. After: ≥1 timestamp, each landing on `isodow = 7`.** | Sunday still unmatched → repair ineffective |
| **P2** | **Neutrality — the load-bearing check** | Same call for **one enabled schedule_id per weekday Mon–Fri**, before and after. | **Identical timestamp sets, byte-for-byte, all five.** | Any difference ⇒ the change was not neutral ⇒ **STOP + rollback** (§5.4-3) |
| **P3** | Contract intact | Re-read `pg_get_functiondef` ×2 + `proacl` + the table CHECK | signature/ACL/CHECK unchanged; 0 `isodow` remaining in the two functions | silent signature or ACL drift |
| **P4** | No data moved | `SELECT count(*) … WHERE day_of_week = 0` and the §3 enabled-per-day distribution | **unchanged — 24 rows, 0 enabled; Mon–Fri 14 enabled each** | an unintended DML slipped in |

**P1 and P2 are both read-only.** The entire repair can be proven without writing a row.

**Full end-to-end proof (a real Sunday slot materialising) requires enabling a Sunday row, which
creates genuine production demand.** That is **NOT proposed here** and needs its own explicit PK
election. If elected, it is reversible: disable the row, delete the resulting `status='future'` slots
by identity.

**Observation affecting proof timing (recorded, NOT in scope to fix):** `save_publish_schedule`
performs `DELETE`-then-`INSERT`, while `trg_handle_schedule_rule_change` fires **`AFTER UPDATE` only**.
A dashboard save therefore does **not** re-materialise; slots appear at the next nightly cron. Anyone
running the elective end-to-end proof must wait for the 15:00Z run or invoke the materialiser
deliberately. **Not a defect claim, not part of this repair.**

---

## Scope

**In scope:** the `0` vs `7` contract mismatch between `c.client_publish_schedule` and the two `m.*`
materialiser functions; its evidence, disposition of existing rows, blast radius, tier, gates,
rollback and proof.

**Out of scope — deliberately, per PK's "MINIMAL is the operative word":** any day-of-week refactor or
normalisation elsewhere · the `DELETE`+`INSERT` vs `AFTER UPDATE` trigger asymmetry · schedule-editor
cleanup · a validation layer · surfacing save failures in the UI · Saturday (not defective, §4) · any
format/mode work (that is the schedule scoping lane) · cc-0079.

## Allowed actions (this lane — complete)

`git fetch --prune` + read-only ref reads in both repos; dashboard read via `git show origin/main:`;
read-only CE repo reads; R0 `db-read.py` over `pg_catalog`; **R1 `execute_sql` read-only SELECTs**
(§3 distribution, §2.3 dow/isodow derivation, §5.1 column scan); authoring this one document.

## Forbidden actions (all honoured)

No apply · no DDL executed · no DML · no migration run · **no dashboard file edited** (S6 holds write
precedence) · no deploy · no new write path · no `cc-` ID self-allocation · no register version · no
self-approval · no commit · no push · production window not taken (Slice 2 holds it).

## Success criteria for this packet

1. Both stale-ref gates run and recorded. ✅ §0
2. All five PK questions answered from first-hand evidence. ✅ §2 · §3 · §4 · §5 · §7
3. One side recommended **and argued**, with the alternatives refuted on evidence. ✅ §2.2
4. Existing-row disposition stated — no half-fix. ✅ §3
5. Rollback written and validated-before-apply, including the conditional branch. ✅ §5.5
6. A proof that needs no manufactured production data. ✅ §7 P1/P2
7. Nothing applied, mutated, committed or pushed. ✅

## Stop condition

Packet ends the lane. Freeze, return path + sha256 + byte count to the control tower.
**S2 returns to the ordered program immediately.** No implementation until PK rules at its own gate,
with its own production window, behind Slice 2.

## Open questions for PK

1. **Approve the CE-side `isodow → dow` repair** (§2.2), or elect a different side?
2. **Sequencing vs Slice A** (§6) — apply after Slice A ships and is observed (recommended), or before?
3. **Elect the end-to-end Sunday proof** (enable one Sunday row post-apply), or accept P1–P4 read-only proof as sufficient?
4. **The 24 disabled Sunday rows** — leave inert (recommended, §3), or is any disposition wanted?

## Non-claims

Does not claim the repair is applied, reviewed, or approved. Does not claim `m.materialise_slots` was
read in full — its `day_of_week`/`isodow` handling was located by targeted pattern match over
`pg_get_functiondef` (3 hits across 2 functions); **the apply hand must re-read both in full and
re-count before changing anything** (§5.3). Does not claim the dashboard working tree is relevant (5
commits stale, deliberately unused). Does not claim the trigger/`DELETE`-`INSERT` asymmetry is a
defect — it is recorded as an observation only. Does not decide sequencing against Slice A. Does not
assert that no Sunday row will be enabled between authoring and apply — §5.4-4 makes that a STOP.

## Evidence basis

CE `ad4a6a9` (parity 0/0) · dashboard `origin/main = 524ca6d` (read via `git show`; checkout left at
`fda2b51`, not pulled). Live reads 2026-07-24, project `mbkmaxqhsohbtwsqolns`:
`pg_get_functiondef` for `m.compute_rule_slot_times`, `m.materialise_slots`,
`public.get_next_publish_slot`, `public.get_next_scheduled_for`, `public.save_publish_schedule`,
`c.handle_schedule_rule_change` · `pg_proc.prosrc ILIKE '%day_of_week%'` scan (7 objects) ·
`pg_constraint` + `pg_trigger` on `c.client_publish_schedule` · `pg_attribute` scan for every
`day_of_week` column (1 table) · `c.client_publish_schedule` distribution by `day_of_week` × `enabled`
· `dow`/`isodow` derivation over 2026-07-27→2026-08-02. Dashboard: `ScheduleTab.tsx`,
`actions/schedule.ts`, `actions/publishing-plan-pyramid.ts`, `app/(dashboard)/clients/page.tsx`.
**No write, no DDL and no DML was issued in this lane.**
