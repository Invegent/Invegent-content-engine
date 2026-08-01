# WS-3 (b) — Asset Gap live writer + scheduler — P-5A implementation packet v1 (rev-2)

**Created:** 2026-08-01 Sydney · **Revised:** 2026-08-01 (rev-2, post-review re-cut)
**Author:** Claude Code (orchestrator)
**Executor:** PK (apply is P-5B, a separate act)
**Status:** `re-cut — awaiting re-review, then P-5B`
**Tier:** **T3** (establishes a standing autonomous production writer)
**Lane class (CCF-02):** SAFETY_GATE
**Governing brief:** `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §3 WS-3(b), §4.3 P-5A/P-5B, §6 week-1 item 3
**Result file:** `docs/briefs/results/ws3-asset-gap-live-writer-result-v1.md` (created on completion)

> **⛔ This packet authorises nothing.** P-5A is scope approval + freeze + review. The apply
> is **P-5B**, a separate PK act against the exact hashes in §2. Per the programme brief's
> closing rule, **P-5B is never folded into another approval** — including this one, the
> WS-3(a) read-view gate, or the programme brief's own ratification.

---

## 0. Rev-2 change log — why this was re-cut

Rev-1 went through the review chain and **did not survive it**. Both auditors independently
found the same root problem: **declared controls the executable text did not enforce.**

| Reviewer | Verdict on rev-1 | Root finding |
|---|---|---|
| `db-rls-auditor` (live) | **block** (artifact 2 only; the WS-3(a) view passed independently) | F-1/F-2: the before-image captured 9 of the 19 columns the analyzer mutates, and the restore UPDATE's `IS DISTINCT FROM` filter skipped the *common* case. The declared rollback was fiction. |
| `apply-harness-auditor` (shadow) | **CONCERNS**, 14 findings | AHA-01-4 independently reached the same conclusion by static analysis. AHA-01-1/2: three stages in ONE file with comment-banner boundaries — a single paste would have executed the live write *and* scheduled the job with no gate between them. |

Rev-1's SQL artifacts (`ws3-asset-gap-live-writer-scheduler-v1.sql`,
sha256 `7383a807…6b18`, and its rollback `223466ba…e3da`) are **deleted, not archived** —
a blocked artifact sitting next to a live one is a foot-gun. Their hashes are recorded here
so the review trail resolves.

**What changed:**

1. **Three stages → three separately hashed files** (+ three rollbacks). "One file = one
   call" is now structural, not advisory. (AHA-01-1)
2. **Every later stage asserts the prior stage committed in a DIFFERENT transaction**
   (`age(xmin) = 0` guard). Pasting stages together now fails closed. (AHA-01-2)
3. **Stage C gained real preconditions**: wrapper exists, and a *clean committed* Stage-B
   proving run exists (`triggered_by='proving' AND dry_run=false AND error_count=0`). STOP 3
   is now executable instead of prose. (AHA-01-3)
4. **Before-image is now a FULL-ROW capture** (`to_jsonb` of every row of both gap tables),
   and Stage B asserts every captured row carries the table's complete column set — so
   coverage is total by construction and future-proof. (F-2, AHA-01-4, AHA-01-7)
5. **The restore UPDATE lost its filter** and restores all 42 non-key columns
   unconditionally; **verification is now field-for-field** (bidirectional `EXCEPT` on
   `to_jsonb`), not row counts. The wrapper pins `TimeZone = 'UTC'` so the comparison
   cannot fail on formatting. (F-1, AHA-01-4)
6. **The wrapper's `p_dry_run` default flipped `false` → `true`.** Rev-1 contradicted its own
   stated invariant on the very object it created: a bare
   `SELECT m.run_asset_gap_analysis_scheduled()` was a live 500-row write. Both call sites
   pass it explicitly. (AHA-01-9)
7. **Privilege assertions rewritten** to `has_table_privilege` / `has_function_privilege`.
   Rev-1's `aclexplode … JOIN pg_roles ON r.oid = a.grantee` silently discarded the PUBLIC
   entry (grantee oid 0) — so the assertion named "the public-default-ACL trap" could not
   detect that trap. Added: `pg_policy` count = 0, and positive service_role checks. (F-3, AHA-01-10)
8. **STOP 10 is now executable**: `md5(pg_get_functiondef(public.run_asset_gap_analysis))`
   is pinned (`ec2bb745bf37d956f8537d0ee2f04b77`) and asserted in Stages A, B, C and
   rollback A. Rev-1 checked only the argument string, which cannot see a body change. (AHA-01-8)
9. **Stage C's health-check seed is a plain INSERT behind a `NOT EXISTS` guard**, not an
   upsert — rev-1 could UPDATE a pre-existing row while its rollback deleted
   unconditionally, destroying a row it never created. (AHA-01-5)
10. **Run selection is by identity** (`run_id`), with a `(ran_at DESC, id DESC)` tiebreaker
    and a "no newer non-dry run exists" guard. Rev-1 selected "newest by `ran_at`", which
    ties because `ran_at` defaults to the transaction timestamp. (F-6, AHA-01-6)
11. **Honest bounding.** Rev-1 claimed Stage B was "bounded to the scan ceiling of 25".
    `p_limit` bounds only the analyzer's *first* loop; the reconcile pass is unbounded.
    Now stated plainly in the artifact and in §3, with guard 6 named as its only ceiling.
    (F-4 — now OQ-5)
12. **Executor, channel, and posture claims corrected**: rollback executor named (postgres —
    `service_role` cannot DELETE from the append-only run log and holds nothing on
    `m.cron_health_check`); channel pinned per stage; `inspector_ro` SELECT added for the
    schema-`m` convention (61/61); the false "mirrors cc-0041 exactly" claim removed; the
    unverifiable "non-REST-exposed" comment replaced with the privilege fact that is
    actually verified. (F-5, F-10, AHA-01-13)
13. **Rollback validation procedure named** with expected output (§5.1). Rev-1 asserted
    "rollback validated" as a success criterion with no declared method. (AHA-01-14)
14. **STOP 6 narrowed** to the facts the packet actually depends on (target minute free,
    jobname absent) and made executable. Rev-1 declared a broad baseline comparison with no
    captured baseline to compare against. (AHA-01-12)

**Not changed, deliberately:** the analyzer itself, the schedule minute, the three-stage
shape, and the auto-resolution semantics. Everything above is harness, not behaviour.

### 0.1 Rev-3 — the second review round

Rev-2 went back through both auditors and **also did not survive**: `db-rls-auditor` returned
`block` again (three must-fix) and `apply-harness-auditor` returned CONCERNS (13 findings).
Two were genuine defects the re-cut itself introduced. All are now fixed.

| Finding | Status | What changed |
|---|---|---|
| **F-2 / AHA-02-2** — Stage C aborts unconditionally. The C3 guard tested `LIKE '%p_dry_run => false%'` (one space) against a job body that column-aligns its arguments: `p_dry_run       => false` (seven spaces). Never matches ⇒ `NOT LIKE` always true ⇒ Stage C raises on a byte-correct apply. | **FIXED — real defect, mine** | Whitespace-insensitive regex (`~ 'p_dry_run\s*=>\s*false'`), verified live to match the aligned body and not to false-positive on the wrapper name. |
| **F-3** — Rollback A pinned the analyzer to the frozen 2026-08-01 md5 *after* its DROPs, so any legitimate future analyzer revision would abort the rollback and undo its own work. | **FIXED — real defect, mine** | Converted to a start-vs-end self-comparison: the rollback now proves *it* changed nothing, instead of demanding the analyzer never changed. Forward-direction pins in Stages A/B/C correctly stay frozen. |
| **F-1 / AHA-02-1** — both auditors called the `age(xmin) = 0` composition guard "inert, can never fire", making it their headline `block`. | **NOT A DEFECT — disproved** | Tested directly on the live server (PG 17.6): created a table and read its catalog row in the *same* transaction → `age(xmin) = 0` is **TRUE** and `xmin = pg_current_xact_id()` is **TRUE**. `db-rls-auditor` reached the opposite conclusion from an indirect `pg_snapshot_xmax` probe in a read-only transaction (no xid assigned); `apply-harness-auditor` corroborated it statically. The guard fires. Both tests are now OR'd into the artifact with the empirical result recorded inline, so a third reviewer does not re-litigate it. |
| S-3 — Stage B guard 6 too tight: the reconcile loop scans rows the same run's insert loop just created, so a legitimately self-resolving gap would abort a **clean** proving run. | **FIXED** | Ceiling is now `b_open + (a_total - b_total)`. |
| S-1 / AHA-02-9 — md5 lookups used an unqualified `proname`, non-deterministic under an overload. | **FIXED** | Resolved by exact signature via `::regprocedure` in all four places; verified live to return the pinned hash. |
| S-2 — `CREATE OR REPLACE FUNCTION` for a brand-new object silently preserves a pre-existing ACL. | **FIXED** | Bare `CREATE FUNCTION`. |
| S-4 / AHA-02-7 — before-image column-completeness asserted for suggestions only. | **FIXED** | Mirror assertion added for `m.asset_gap_observation` against its own live column count. |
| AHA-02-3 — Stage A and Stage C are multi-statement files whose atomicity was an unstated channel assumption. | **FIXED** | Transaction anchor (`set_config`/`pg_current_xact_id` stamped at the top, re-asserted in the closing assert block) in both, per the house idiom. |
| AHA-02-5 — §5 claimed each rollback enforces its own place; rollback B had no such guard. | **FIXED** | Rollback B now refuses while `asset-gap-analysis-daily` is scheduled, mirroring rollback A. |
| AHA-02-11 — rollback C deleted the health-check row unqualified, so it could destroy a row Stage C never created. | **FIXED** | Delete qualified by the marker Stage C writes into `notes`, with `GET DIAGNOSTICS` asserting exactly one row. |
| AHA-02-4 — rollback B's `SET LOCAL TimeZone` could silently degrade, making the field-level compare fail on formatting. | **FIXED** | Explicit `current_setting('TimeZone') = 'UTC'` assertion names that cause instead of surfacing it as a data diff. |
| AHA-02-12 — restored-row count captured but never asserted. | **FIXED** | Asserted against the before-image length. |
| S-6 — a `m.post_draft` deletion between capture and revert makes the observation compare false-fail (FK is `ON DELETE SET NULL`). | **DECLARED, not fixed** | Now a named rollback STOP (§5, below). Fixing it would mean weakening the field-level compare, which is the wrong trade. |
| AHA-02-6 — the restore is UPDATE-only over a frozen column list, so three mutation shapes (a new column after freeze, a deleted baseline row, an in-place observation UPDATE) cause the rollback to *refuse* rather than restore. | **DECLARED, not fixed** | §5 now names those branches explicitly. All three fail closed via the bidirectional `EXCEPT`; the live analyzer performs none of them (it writes only to the two gap tables and never deletes — confirmed against the 12 730-byte live body). |
| AHA-02-8 — §5.1's validation route was self-contradictory and left "rollback validated before apply" unsatisfiable. | **REWRITTEN** | See §5.1. Since the composition guard genuinely does fire, route (b) is impossible and route (a) is stated plainly as what P-5B must authorise. |
| AHA-02-10 — slot check exact-string | **FIXED** | Whitespace-normalised in Stage C. *(Rollback C was NOT normalised at rev-3; fixed at rev-4 under AHA-03-5.)* |
| S-8 — run-log retention | **CARRIED** | OQ-3. No retention policy; one full-table before-image per day. |
| AHA-02-13 — `open → resolved` success criterion unverifiable | **FIXED** | Given a named verification read in the Success criteria, with the caveat that guard 6 is an upper bound so the proving run does not guarantee it. |
| S-5 — `%ROWTYPE` compile-order diagnostic | **ACCEPTED** | Fail-closed either way; a missing Stage A yields a compile error instead of the friendly RAISE. Not worth a record type. |
| S-7 — multi-statement atomicity unasserted | **FIXED** | Transaction anchors added to Stages A and C (rev-3), and to rollback A (rev-4, M-2). |

### 0.2 Round-3 audit result (both auditors, pinned to the rev-3 hashes in §2)

**Both moved off `block` → `CONCERNS`.** No high-severity REST-exposure, grant, or RLS gap; no
migration-name collision; both round-2 must-fixes verified fixed against live rather than
against the fix log.

**Both auditors independently WITHDREW their own round-2 F-1 / AHA-02-1.** `db-rls-auditor`
re-derived it with a non-DDL probe (`age((SELECT pg_current_xact_id())::xid)` = 0, plus
negative controls on three committed relations showing both operands FALSE, plus a frozen-xmin
case) and confirmed the composition guard fires. `xid_age()` uses `GetTopTransactionIdIfAny()`
and only falls back to `ReadNextTransactionId()` when no xid is assigned — which is exactly the
read-only case their round-2 probe ran in, and which cannot occur in the guard's dangerous
branch. **The dual-OR guard is correct.**

**Open — one shared theme, found independently by both.** The transaction anchors *detect*
non-composition but cannot *undo* it, and the packet's text says otherwise:

| Ref | Item |
|---|---|
| M-1 / AHA-03-3 | **Sharpest edge.** If Stage C does not compose, C1's INSERT and `cron.schedule` have already committed when C3 raises — the operator reads `ws3-C STOP` as "nothing applied" while an **armed autonomous daily live writer** is live. No named remediation anywhere. |
| M-2 / AHA-03-4 | Rollback A has no anchor (Stages A and C got one); on a non-composing channel its GUC is gone, so it raises a **false "the analyzer changed"** *after* the DROPs — the worst diagnosis to hand someone mid-reversal. |
| M-3 | `::regprocedure` hard-throws if the analyzer's signature ever changes, blocking the entire reversal path — a narrowed residual of the very class F-3 was cut to close. Use `to_regprocedure` + NULL handling. |
| AHA-03-1 | **STOP 4, §3 guard-table row 6 and the Stage-B header still declare the pre-rev-3 ceiling** (`≤ baseline-open`) while the code enforces `b_open + (a_total − b_total)`. Declared ≠ executable — the exact class this packet exists to kill, reintroduced by the S-3 fix. |
| AHA-03-2 | STOP 10 still claims the frozen md5 is "asserted in … rollback A"; rev-3's F-3 fix removed it there deliberately. Register stale. |
| AHA-03-6 | Rollback B's delete is **snapshot-complement, not run-attribution**: a concurrent third-party write to either gap table is destroyed *and* the bidirectional EXCEPT then confirms "verified field-for-field". §5 claims "none silently corrupts". Needs a sixth declared branch or attribution tightening. |
| AHA-03-7 | Guard 3b compares to the **live** column count, not the frozen 43 the restore list was cut against — a post-freeze column addition passes Stage B and is only discovered when the rollback is needed. Cheap fix: assert `b_cols = 43` and `b_obs_cols = 6`. |
| AHA-03-5 / S-C1 | Rollback C's fleet-wide `50 16` assertion lets an unrelated third-party job block WS-3's own reversal; also exact-match where Stage C is whitespace-normalised. |
| AHA-03-8 | §5.1's "rollback A is proven last or not at all" is **not derived** — after step 4 both its guards are satisfied, so it *is* exercisable; the real cost is a second Stage-A ledger version. |
| AHA-03-10 / AHA-03-12 / S-P1 / S-P2 | §0.1's final row collapses five findings into one cell; §5.1 retains the paste-shaped dead rehearsal block; §3 guard table stale; the cron baseline moved 68 → 70. |

**Cross-resolved:** AHA-03-9 (does `m.heartbeat()` overwrite the `notes` marker rollback C keys
on?) was settled by `db-rls-auditor` reading the live body — the UPDATE path touches only
`last_heartbeat_at`, `consecutive_misses`, `updated_at`. The marker survives every fire.

**`db-rls-auditor`'s own recommendation:** fix M-1/M-2/M-3, re-freeze the affected files, then
go to external review on the new hashes. **A fourth full DB audit is not warranted** — a
re-hash plus a targeted read of the changed blocks suffices.

### 0.3 Rev-4 (PK-authorised 2026-08-01 — packet authoring only, no activation)

PK directive: *"Cut rev-4 now and remediate M-1 so no partial STOP can leave the live writer
armed. Then run external review against the new exact hashes. Preserve P-5B as a separate
live writer/scheduler activation gate. Return only the two exact outstanding judgment calls
after rev-4; no live activation is authorised here."*

| Ref | Fix |
|---|---|
| **M-1** | **STRUCTURAL, not a message.** Stage C now creates the job **DISARMED** — `cron.schedule` + `cron.alter_job(active => false)` inside ONE atomic DO block, which composes on any channel — and **arming moved to C4, the last statement**, behind a re-check of the anchor, the wrapper, a clean proving run, the analyzer md5, and the job's own identity. No path through the file ends with an armed writer and a failed assertion. The worst residue is a job that exists and **cannot fire**. C3's anchor message now states that truth and names the required rollback. |
| **M-2** | Rollback A gained the composition anchor Stages A/C got in rev-3 (`ice.ws3_rb_a_txid`), checked **before** the md5 comparison — so a non-composing channel says "did not compose" instead of the false, mid-reversal *"the analyzer changed"*. |
| **M-3** | Rollback A's `::regprocedure` → `to_regprocedure` + `COALESCE(…, 'absent')` on both capture and compare. A changed or dropped analyzer signature can no longer hard-block the reversal path — rollback A never depended on the analyzer existing. |
| **AHA-03-1** | Ceiling drift reconciled in all four places: STOP 4, §3 guard-table row 6, and the Stage-B artifact header now state the enforced `baseline-open + rows inserted by this run`, with the reason the second term is load-bearing. |
| **AHA-03-2** | STOP 10 corrected — rollback A deliberately asserts self-comparison, not the frozen hash. |
| **AHA-03-5** | Rollback C's fleet-wide 16:50 assertion → scoped to WS-3's own identity and demoted to a NOTICE, with whitespace normalisation matching Stage C. An unrelated third-party job can no longer block WS-3's reversal. |
| **STOP 11** | New: a transaction-anchor mismatch is now a named STOP with its required action (run the matching rollback before any retry). |
| **AHA-03-10 / -12 / S-P1 / S-P2** | §0.1's final row split per finding; the dead paste-shaped rehearsal block removed from §5.1; guard table and cron baseline (68 → 70) corrected. |

**Carried, NOT fixed — named so it is not mistaken for done:**
- **AHA-03-7** — guard 3b compares the captured key count to the **live** column count, not
  the frozen 43 the restore SET list was cut against. A post-freeze column addition therefore
  passes Stage B and is discovered only when the rollback runs. It fails closed (the
  bidirectional `EXCEPT` catches it), and closing it means adding a *new* control rather than
  correcting a declared one — outside rev-4's authorised scope. Carried as **OQ-9**.
- **AHA-03-13** — rollback B's `BEGIN`/`COMMIT` carries no anchor. Diagnostic-only residual;
  atomicity genuinely comes from its single DO block, which the header now states.

**Two judgment calls returned to PK, unresolved by design** — §7 OQ-10 and OQ-11.

### 0.4 External review — rev-4 hashes (PK directive: "run external review against the new exact hashes")

`ask_chatgpt_review`, review_id **`66fb08f0-4015-4513-8e62-ed3da3f8ae32`**, pinned to the six
rev-4 hashes in §2. Verdict **`partial` / risk HIGH / confidence medium / escalate to PK**.

Per the standing rule, a non-clean external verdict halts the lane and surfaces to PK. Triage
of its two pushback points:

1. *"C2 may leave the cron job in an armed state if the preceding assertions fail."*
   **Contradicted by the reviewer's own verified-claims list**, which states *"C2 disarms the
   cron job immediately after creation, which should prevent unintended activity before
   verification."* The two cannot both be true. On the frozen text, C2 creates and disarms
   inside a single DO block and C4 is the only statement that arms — so no assertion failure
   can leave it armed. Classified `missing_evidence` (a misreading), **not**
   `concrete_defect`. **Recorded rather than dismissed:** neither the reviewer nor either
   auditor has named a concrete residual path, and if PK wants certainty here the cheap answer
   is the §5.1 step-6/7 rehearsal, which exercises exactly this.
2. *"Rollback B's delete could inadvertently destroy concurrent third-party writes, which
   isn't adequately mitigated."* **This is OQ-10 verbatim** — the judgment call already being
   returned to PK. Classified `policy_decision` → PK decision gate. It is the third
   independent flag on this branch; §7 OQ-10 now records that.

It also listed the zero-consumer claim as **unverified** — fair at the time, and now closed:
OQ-7 was checked against the dashboard repo in response and returned zero hits.

**No `concrete_defect` was raised against the rev-4 SQL.** The escalation is on risk level and
on OQ-10, both of which are PK's to rule on.

### 0.5 Rev-4a re-review chain (Stage-B rollback only, hash `40467e06…`)

PK instructed the OQ-10 declaration be placed in the rollback file's own header as well. That
changed the file hash, which made review `66fb08f0` stale **for that artifact**, so it was
re-reviewed. Three rounds, each pinned to the then-current hash:

| Review | Verdict | What it moved |
|---|---|---|
| `9bf35841-4118-4b59-b980-b379a4577d06` | `partial` / **MEDIUM** (down from HIGH) / escalate | Verified the comment-only claim. Pushback: operators may not grasp the implications. |
| `0f18b28b-6a40-40a1-b7d6-ce3f3cad7142` | `partial` / MEDIUM / escalate | Same comprehension pushback, **plus a real one**: the `pg_proc`/`pg_views`/`pg_trigger` union might not enumerate all DB-side readers (dynamic SQL, FKs, rules, publications). |
| **`e09a739f-34b8-4e04-8fb4-d825b6c8ec6c`** | `partial` / MEDIUM / **`apply_corrected` — escalate FALSE, `requires_pk_escalation` FALSE** | **Terminating.** Verified: *"The completeness gap was closed by enumerating inbound foreign keys, rules, and publications"* and *"the header explicitly states the classes that are not covered."* |

**Two substantive defects were fixed across this chain, both mine:**
1. The STOP was **unactionable** — it asked the operator to establish that nothing consumes
   the two tables, with no means of doing so. Now a `HOW TO CHECK THAT STOP` block with three
   copy-pasteable checks and their live-verified baselines.
2. The DB-side check was **incomplete** — it missed inbound FKs, rewrite rules, and logical-
   replication publications. Now enumerated, with a COVERED / NOT COVERED list naming the two
   classes no catalog query can reach (name built by concatenation in dynamic SQL; readers
   outside the database), and stating that this is exactly why the both-repos grep is not
   optional.

**Running the checks caught a third error before freeze:** the first draft claimed check (a)
returns two rows including `preview_asset_gap_analysis`. It returns **one** — that function
never names either table in its own source. An operator following the wrong baseline would
have seen a "missing" row and lost confidence in the check. Corrected, absence explained inline.

**Where the chain stopped, and why, stated plainly.** The residual pushback across all three
rounds — *"any warning can be misunderstood"* — has no falsifiable end state, and each round
returned it unchanged at unchanged risk. It was answered where it was concrete (an
uncheckable STOP, then an incomplete check) and **routed to PK where it was not**, rather than
absorbed with more prose. The final round did not escalate.

*Verdict remains `partial`, not `agree`, so this is recorded as a non-clean review under the
standing rule — but with `requires_pk_escalation: false` it is the chain's terminating state,
not an open stop.*

---

## Task

End the state where `public.run_asset_gap_analysis` only ever runs as a dry run, and put it
on a governed daily schedule whose runs leave durable, auditable, **revertable** evidence —
without changing the analyzer's logic and without giving any caller a live-write default.

## Source context

- `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §3 WS-3(b) — the mandate.
- **Live analyzer body**, `pg_get_functiondef` 2026-08-01, md5
  `ec2bb745bf37d956f8537d0ee2f04b77`, 12 730 bytes (NOT the repo file — see §1):
  `public.run_asset_gap_analysis(p_lookback_days int DEFAULT 7, p_limit int DEFAULT 500,
  p_dry_run boolean DEFAULT true, p_run_id text DEFAULT NULL)`, `SECURITY DEFINER`,
  `SET search_path TO ''`, EXECUTE to `postgres` + `service_role` only.
- `docs/briefs/ice-asset-gap-register-v1.md` §0.1 — the recorded git↔DB parity gap.
- Live baselines read 2026-08-01 (**cron count re-read at rev-4: now 70**, two unrelated jobs
  added since the first read; the 16:50 slot and the jobname remain free, and every guard is
  dynamic rather than pinned to the count): 70 cron jobs, no job named `asset-gap-analysis-daily`,
  the `50 16 * * *` slot free; `m.cron_health_check` has no row for that jobname; daily
  precedents seeded at 1440; `m.asset_gap_suggestion` = 8 rows (4 open / 4 resolved),
  43 columns.

## 2. Artifacts (frozen — P-5B is valid ONLY against these hashes)

| # | Stage | Channel | File | sha256 |
|---|---|---|---|---|
**REV-4 HASHES (frozen 2026-08-01). These are the exact values P-5B and the external review pin to.**

| # | Stage | Channel | File | sha256 | rev-4 |
|---|---|---|---|---|---|
| 1 | A apply | `apply_migration` | `docs/briefs/artifacts/ws3-live-writer-stage-a-dark-infra-v2.sql` | `dfa4d8149f81f61596b73a970ec6b19f4ccf33e17921233579a4718f68944fbe` | unchanged |
| 2 | B apply | `execute_sql` | `docs/briefs/artifacts/ws3-live-writer-stage-b-proving-run-v2.sql` | `cdc9527da08c373db94e6925c45ed1369389754038afa6a9c64ab4e8dec2b15d` | **changed** (AHA-03-1) |
| 3 | C apply | `execute_sql` | `docs/briefs/artifacts/ws3-live-writer-stage-c-schedule-v2.sql` | `d997ec3edacbc503cae1cfbdf5ba93d432cdc1741d7776431f3acd74c9b79c80` | **changed** (M-1) |
| 4 | A rollback | `apply_migration` | `docs/briefs/artifacts/ws3-live-writer-stage-a-dark-infra-v2-rollback.sql` | `c4fe9f7483380ec75ffb3dd6d3ffd82635acf0b3f2f36c5b606b06a9085b4172` | **changed** (M-2, M-3) |
| 5 | B rollback | `execute_sql` | `docs/briefs/artifacts/ws3-live-writer-stage-b-proving-run-v2-rollback.sql` | `40467e06c08b388295f6a14424180b06405104bddf072cba36d40dfbe981afe8` | **rev-4a** (comment-only) |
| 6 | C rollback | `execute_sql` | `docs/briefs/artifacts/ws3-live-writer-stage-c-schedule-v2-rollback.sql` | `7cbaff07386319990f7d670f56605baadd6b2588f1bbfb78b6b940be8be49a82` | **changed** (AHA-03-5) |

Superseded rev-3 hashes (audited round 3, then re-cut): B `608fc25f…c376` · C `69f19d73…3f0a` ·
A-rollback `1fc608e7…4f23` · C-rollback `702872c4…a7ea`.

**Channel is pinned per stage** because it determines the ledger record the apply leaves:
`apply_migration` mints its own migration version, `execute_sql` does not. Stage A is DDL and
must appear in the ledger; Stages B and C are DML/row writes and must not mint a version.
Intended migration name for Stage A: `ws3_asset_gap_live_writer_stage_a_dark_infra_v2`
(no collision — full ledger read 2026-08-01).

### 2.1 Hashes

Re-frozen 2026-08-01 (rev-2). A byte change to any file invalidates every review and voids
P-5B (STOP 1). The superseded rev-1 hashes, recorded so the review trail resolves:
apply `7383a8079b783ff61c7b8e797d641ae60db05ec691457f73462663a26c736b18`,
rollback `223466ba894bef232c6dc0447513ed68ff48a036f131ac7dceeaf888cd78e3da` — **blocked, files deleted.**

---

## 1. ✅ The git↔DB parity precondition IS satisfied (rev-3 correction)

**Rev-2 of this packet stated the opposite, and was wrong.** It carried forward
`docs/briefs/ice-asset-gap-register-v1.md` §0.1's claim that
`supabase/migrations/20260719210000_cc0043_asset_gap_analyzer_writer_v1.sql` exists only on
unmerged worktree branches. That register text is **stale** — it predates the cc-0087
reconciliation and was never updated.

**Verified 2026-08-01:**
- The migration is **tracked, on `main`, and on `origin/main`**, landed by commit `8fbba80`
  ("docs(cc-0087): backfill 19 missing migration files"), cherry-picked from exactly the
  worktree commit `7c66f80` the register named as authoritative.
- Its header states the reconciliation explicitly and warns that the file's own internal
  "NOT APPLIED / DESIGN" framing is preserved-but-stale.
- The **replay chain is complete**: `main` defines the analyzer at cc-0043
  (`20260719210000`), then `CREATE OR REPLACE`s it at cc-0044 (`20260720190000`) and finally
  cc-0046 (`20260721110000`), which carries the cc-0046 classifier markers present in the live
  body. `main` therefore reproduces what runs, and a future reviewer can reconstruct the
  nightly job from the repository alone.

**Consequence: OQ-1 is CLOSED and requires no PK decision.** The only structural objection to
this packet is gone. The design remains grounded on the **live body** (md5
`ec2bb745bf37d956f8537d0ee2f04b77`, asserted at every stage) rather than on the repo file —
that is unchanged and correct, since live truth outranks a file either way.

*Register §0.1 has been corrected in place (additive note, no historical rewrite).*

## 3. Design

Three stages, **three files, three calls**. Each file is internally atomic; between stages
the system sits in a declared, safe, named intermediate state, and each later stage
machine-asserts the prior one committed in a different transaction.

### Stage A — dark infra (no behaviour change)

**A1 · `m.asset_gap_analysis_run`** — durable per-run evidence plus a full-row before-image.

*Why it exists.* The analyzer returns its counters as jsonb and swallows every per-row
exception internally. A bare `SELECT public.run_asset_gap_analysis(...)` cron command
**discards that jsonb**, and `cron.job_run_details` records only success/failure plus an
error string. A run that silently errored on every row would be indistinguishable from a
clean one. This table is what makes "analyzer live on a governed schedule" verifiable.

`pre_state` captures `to_jsonb` of **every row of both gap tables** — deliberately not a
hand-picked column list, which is exactly how rev-1's rollback became fiction.

Posture: additive · RLS enabled, zero policies (asserted) · no anon/authenticated reach
(asserted via `has_table_privilege`) · `service_role` SELECT+INSERT only (append-only by
design; **this diverges from cc-0041's `arwd`, deliberately**) · `inspector_ro` SELECT for
the schema-`m` convention.

**A2 · `m.run_asset_gap_analysis_scheduled(...)`** — a thin persisting wrapper: capture
before-image, call the analyzer unchanged, record the payload. It re-implements, re-orders,
filters and reinterprets **nothing**.

- **Schema `m`, not `public`** — a *new* function in `public` is born EXECUTE-able by `anon`
  + `authenticated` by default ACL. Schema `m` grants them no USAGE, so placement is the
  fail-safe; the `REVOKE` is belt-and-suspenders.
- **`p_dry_run` DEFAULT `true`.** Both call sites pass it explicitly.
- **`SET TimeZone TO 'UTC'`** so the before-image is byte-stable across sessions.

### Stage B — bounded live proving run (the first real write)

One transaction: preconditions → baselines → run live at `p_limit => 25` → assert → commit
or roll the whole run back. Every guard is an executable `RAISE`; no comment-only STOP, no
non-aborting failure branch.

| # | Guard | Why |
|---|---|---|
| pre | Stage A objects exist **and** `age(xmin) <> 0` | stages were separate calls with a PK gate between them |
| pre | analyzer body md5 == the reviewed capture | STOP 10, executable |
| 1 | `rejected.errors + reconciled.errors = 0` | the only way to see errors the analyzer's `exception when others` hides |
| 2 | `dry_run` is `false` | proves the run was live |
| 3 | exactly one new run-log row, fetched **by `run_id`** | proves persistence works |
| 3b | before-image row counts == baselines **and** every captured row carries all 43 columns | proves the revert path is real, not declared |
| 4 | suggestion rows never decrease | the analyzer must never delete |
| 5 | new suggestion rows ≤ 25 | bounds the draft-scan half |
| 6 | auto-resolutions ≤ (rows open at baseline) **+ (rows this run inserted)** | **the only ceiling on the unbounded reconcile pass.** The second term is load-bearing, not slack — the reconcile cursor opens after the insert loop, so a gap detected and resolved within one run is legitimate; bounding on baseline-open alone would abort a *clean* proving run (rev-3 S-3) |
| 7 | observation rows never decrease | observations only accumulate |

**Honest bounding (rev-2 correction).** `p_limit` bounds only the analyzer's first loop. Its
reconcile loop iterates **every** open suggestion with no limit, calling `select_template`
per row and flipping `open → resolved`. Guard 6 is its only ceiling. Small today (4 open
rows) by accident of backlog size, not by design — see OQ-5.

### Stage C — the schedule

Preconditions: Stage A objects present and committed earlier; a **clean committed proving
run** exists; analyzer md5 unchanged; jobname absent; `50 16 * * *` free; **no pre-existing
`m.cron_health_check` row** (so C1 can only ever be an INSERT).

**C1 · seed `m.cron_health_check` at 1440 BEFORE the job can heartbeat.** Order is
load-bearing: `m.heartbeat()` auto-creates a missing row at `expected_interval_minutes = 60`,
which for a daily job raises a permanent false "missing heartbeat". Both existing daily jobs
are seeded at 1440.

**C2 · create the job DISARMED** (`cron.schedule` + `cron.alter_job(active => false)` inside
ONE atomic DO block). 16:50 UTC = 02:50 Sydney (AEST); slot verified free against the live
cron inventory, nearest neighbours 16:30 (reconcile-signal-pool) and 17:00 (drift-check). The
two-statement heartbeat+call body matches six precedent jobs.

**C3 · assertions** — seed row correct, exactly one job row at the right schedule, **still
disarmed**, calling the *persisting wrapper* with an explicit `p_dry_run => false`, and
**both** functions still defaulting `p_dry_run` to `true`.

**C4 · ARM — the last statement in the file.** One atomic DO block that re-verifies the
composition anchor, the wrapper's existence, a clean committed proving run, the analyzer md5,
and that the job is still the disarmed WS-3 job — then flips `active = true`. It emits the
kill switch (`cron.alter_job(job_id => …, active => false)`) in its NOTICE.

> **⚑ Why C2/C4 are split — the M-1 remediation (PK directive 2026-08-01).** Rev-3 called
> `cron.schedule` as a bare top-level statement, creating the job **active**. On a
> non-composing channel that statement committed alone, so a later C3 failure printed
> `ws3-C STOP` while a standing autonomous live writer was armed for 16:50 — the operator
> reading "nothing applied". The anchor *detected* this but could not undo it, and detection
> was never going to be enough. **Arming is now the last act, behind a full re-check, so no
> path through this file ends with an armed writer and a failed assertion.** The worst state
> it can leave behind is a job that exists and cannot fire.

## 3.1 Standing WS-3 constraints — compliance, verified live not asserted

| Constraint | Status | Evidence (2026-08-01) |
|---|---|---|
| **Existing gap types ONLY — no `subject_kind` CHECK expansion** | ✅ honoured | The packet adds no CHECK, no enum value, and no vocabulary change. Live `asset_gap_suggestion_subject_kind_check` and `..._failure_state_check` are untouched by all six artifacts. |
| **Preserve the `governed_auto_sourcing` monopoly of `(static_background, absent)`** | ✅ honoured, and **hardened** | The monopoly is enforced by two live objects: the IMMUTABLE mapping `public.asset_gap_automation(subject, state)` (only that pair returns `governed_auto_sourcing`) and the CHECK `gap_absent_static_bg_requires_conclusive` (that pair must carry `evidence_confidence='conclusive'`). Neither is touched. **Hardening:** the analyzer swallows a CHECK violation into its `n_error` counter, where today nothing would ever see it; Stage B's guard 1 (`error_count = 0` → abort) converts that into a hard STOP that rolls the run back. |
| **cc-0089 decoupling — gap functions never read `c.creative_template_selector_policy`** | ✅ honoured directly — ⚠ **transitive coupling exists** | Live check of the function bodies: `run_asset_gap_analysis`, `analyze_asset_gap` and `preview_asset_gap_analysis` **do not** reference the policy table. **But** the reconcile pass calls `public.select_template`, which **does** read it. So auto-resolution is *transitively* selector-policy-sensitive: a policy change can change which gap rows auto-resolve, without any gap function reading the policy. Pre-existing behaviour, unchanged by this packet — surfaced because the constraint's wording may not have priced it in. → **OQ-8**. |
| **Reads via `db-read.py` / R0 views where coverable** | ✅ honoured | Catalog and view-coverable reads went through `db-read.py`; `m.*`/`c.*`/`cron.*` data reads used `execute_sql` (the expected residual — `ice_readonly` is walled off from those schemas by design). WS-3(a) exists precisely to move the recurring gap read into R0. |

## 4. Blast radius

**Contained, live-verified.** grep over this repo's two code roots (`app/`,
`supabase/functions/`) for the asset-gap identifiers returns zero functional hits — the one
match is a prose comment at `supabase/functions/image-worker/index.ts:45`. Nothing in
production reads these tables. The live writer cannot affect draft generation, rendering,
publishing, template selection, or asset resolution. Its entire effect is on two dark tables
plus the new run log. *(The dashboard is a separate repository and was not searched — OQ-7.)*

The analyzer calls `public.analyze_asset_gap` and `public.select_template` **read-only**
during a run; unchanged from today's dry-run behaviour, which already makes those calls.

**Residual risk:** auto-resolution. The reconcile loop flips `open → resolved` and writes a
resolution pointer whenever `select_template` now returns `ok` with a resolvable slot asset.
Intended "gap closed" semantics, and the one mutation that would be hard to undo — which is
why the full-row before-image exists.

## 5. Rollback — executable, stage-symmetric, reverse-ordered

Three files, C → B → A. **Executor: the object owner / apply principal (`postgres`).**
`service_role` cannot DELETE from the append-only run log and holds nothing on
`m.cron_health_check`, so the rollback is not executable as `service_role` — stated here
because rev-1 left it unstated.

Ordering is load-bearing in both directions, and each file enforces its own place:
- **C first** — while the job exists it can fire at 16:50 UTC and write a new run,
  invalidating a Stage-B revert performed before it.
- **A last** — Stage B's rollback *reads* `m.asset_gap_analysis_run`. Rollback A **refuses
  to run** while any non-dry run is still recorded, or while the schedule still exists.

Stage B's rollback is a real path because: the wrapper captures a full-row before-image in
the same transaction as the run; Stage B asserts the capture carries **both** tables'
complete column sets; the restore is unfiltered across all 42 non-key columns; and
verification is a **bidirectional field-level `EXCEPT`** on `to_jsonb`, not a row count.

**Where it refuses rather than restores** (rev-3, named honestly rather than left implicit —
all fail closed via that `EXCEPT`, none silently corrupts):

1. **No usable before-image** → raises, manual PK reconciliation.
2. **A column added to `m.asset_gap_suggestion` after freeze.** The capture is future-proof
   (`to_jsonb`) but the restore's SET list is a frozen 42-column enumeration, so a 44th
   column would be captured, counted by guard 3b, and omitted from the restore. The
   `EXCEPT` catches it and the rollback raises.
3. **A baseline row the analyzer deleted.** The restore is UPDATE-only; it never re-INSERTs.
4. **An in-place UPDATE of a pre-existing observation row.** Observations are handled
   delete-only.
5. **A `m.post_draft` row deleted between capture and revert.** `m.asset_gap_observation.source_post_id`
   is `ON DELETE SET NULL`, so the observation's jsonb no longer equals its before-image and
   the compare fails. This is a **rollback STOP**, not a bug: the correct response is PK
   reconciliation, not a weaker comparison.

Branches 3 and 4 cannot occur with the current analyzer — it writes only to the two gap
tables and never deletes, confirmed against the 12 730-byte live body — but the rollback
does not assume that, it detects it.

### Where it does NOT refuse — the one declared, accepted limit (PK ruling, OQ-10 Option A)

Everything above fails closed. **This one does not, and it is accepted deliberately rather
than fixed.** Stated here so the limit is visible at the gate instead of discovered during a
reversal:

> **Rollback B is a whole-table restore to the before-image snapshot, not a per-run diff.**
> Its deletes remove every row absent from the snapshot. That is exactly right for the run's
> own writes — but it would also **destroy any row written by a third party** between the
> capture and the revert. And because the snapshot is whole-table, the bidirectional `EXCEPT`
> then compares the truncated table to the snapshot, finds no difference, and reports
> *"reverted and verified field-for-field"*. **This is the one branch that is silently
> destructive and self-confirming.**

**Why accepting it is reasonable, and exactly what the acceptance rests on:** the two gap
tables are provably unread and unwritten by anything but the analyzer —
- zero code readers across **both** repositories (content-engine and `invegent-dashboard`,
  OQ-7, closed 2026-08-01);
- `public.run_asset_gap_analysis` is the only database object whose source references either
  table (`pg_proc` scan);
- no view reads them; no triggers exist on them;
- both are service-role-only with RLS enabled and zero policies.

**The acceptance is therefore conditional on that remaining true.** If any consumer or writer
of `m.asset_gap_suggestion` / `m.asset_gap_observation` is ever added — a dashboard surface, a
second analyzer, a manual remediation script — **this limit must be re-decided before that
lane ships**, because the mitigation, not the mechanism, is what makes it safe.

*Flagged by three independent reviewers (`apply-harness-auditor` AHA-03-6; external review
`66fb08f0-4015-4513-8e62-ed3da3f8ae32`, which judged it "not adequately mitigated" at HIGH
risk). **PK ruled Option A — declare, do not tighten — 2026-08-01.** The alternative (adding
`created_at >= v_run.ran_at` run attribution) remains available and is a two-predicate change
plus a re-freeze if the condition above ever lapses.*

*Placement (rev-4a, PK 2026-08-01): the declaration now lives in **both** the packet and the
rollback file's own header, so an operator reading the file at 3am meets it before the
`BEGIN;` — including a hard **operator STOP condition**: if any consumer or writer of the two
tables has been added since, do not run the file. The header also carries the four facts the
acceptance rests on and the run-attribution fix should the ruling lapse.*

*The edit is **comment-only**, mechanically verified: stripping all comments and blank lines
from the before and after leaves **122 identical executable lines** with the same content
sha256 (`f71cc9db6710c0f6…`). Only the file hash changed (`a51c4a76…` → `40467e06…`). Per the
standing rule that a review is valid only for the exact hash it reviewed, external review
`66fb08f0` went stale for this artifact and was re-run — see §0.5. **No auditor re-run: the
executable text is provably unchanged.***

*The header also carries a **`HOW TO CHECK THAT STOP`** block — three copy-pasteable checks
(DB objects referencing the tables · grant/RLS posture · a both-repos grep) with their
expected 2026-08-01 baselines, so the STOP is mechanically verifiable rather than a judgment
call. **Every check was run live before freezing**, and doing so caught an error in my own
first draft: I had written that check (a) returns two rows including
`preview_asset_gap_analysis`. It returns **one** — that function never names either table in
its own source. An operator following the wrong baseline would have seen a "missing" row and
distrusted the check. Corrected, with the absence explained inline.*

### 5.1 Rollback validation procedure (before P-5B)

Run against production inside an explicit aborted transaction — the standard ICE dry-run
route, since dev branches come up bare:

**The single-transaction `BEGIN … ROLLBACK` rehearsal does not exist, and cannot.** (Rev-4
deletes the draft block that used to sit here — a paste-shaped, known-unexecutable script
above its own retraction is the same foot-gun §0 cites for deleting the rev-1 artifacts.)
The reason is the composition guard doing its job: inside one transaction Stage B's guard
raises by design, and it genuinely does fire — empirically verified, §0.1, and independently
re-derived by both auditors in round 3. A same-call composition guard and a same-transaction
rehearsal are mutually exclusive by construction. Dev branches do not help either: they come
up bare, with no `c`/`m` schema. And a rehearsal copy of Stage B with the guard removed is
rejected — it would validate a file that is not the one that ships.

**So the honest position, stated plainly rather than dressed up: the rollback cannot be
validated *before* the first live write.** What P-5B authorises is an **apply-and-revert
rehearsal as the first act of the gate**, in real, separate transactions:

| Step | Action | Expected |
|---|---|---|
| 1 | Stage A apply | `ws3-A ok` NOTICE |
| 2 | Stage B apply | `ws3-B ok` NOTICE with the delta and `run_id` |
| 3 | **Stage B rollback** | `ws3-B rollback ok … verified field-for-field` |
| 4 | Re-read the gap tables against the §Source-context baseline (8 rows, 4 open / 4 resolved) | exact match |
| 5 | Stage B apply, second time | `ws3-B ok` — this is the run that stands |
| 6 | Stage C apply | `ws3-C: job … created DISARMED`, then `ws3-C ok (pre-arm)`, then `ws3-C ARMED` |
| 7 | **Stage C rollback**, then Stage C apply again | `ws3-C rollback ok`, then the three C notices again |

Steps 3–4 prove the revert path on real data before any schedule exists; step 7 proves
rollback C.

**Rollback A is deliberately NOT rehearsed (PK ruling, OQ-11 Option B — 2026-08-01).** The
earlier claim that it was "proven last or not at all" was **wrong, and is withdrawn**: it was
asserted rather than derived from the guard text, and `apply-harness-auditor` (AHA-03-8)
correctly showed it is exercisable — after step 4, rollback B has removed the only run-log
row and Stage C has not yet been applied, so *both* of rollback A's refusal guards are
satisfied.

The accurate reason for not rehearsing it is cost, not impossibility: proving it means
re-applying Stage A afterwards, which mints a **second `apply_migration` ledger version** under
a new, permanently reserved name — a durable ledger identity spent on a rehearsal. **PK ruled
that cost not worth paying.** The compensating facts: rollback A is the least risky of the
three (two `DROP`s of objects nothing references — verified, zero readers in both repos) and
the most guarded (it refuses while any live run is recorded or while the schedule exists, and
since rev-4 it also detects non-composition rather than misreporting it as an analyzer change).

**This makes "rollback validated" a step *inside* P-5B, not a precondition of it.** PK should
authorise it on those terms or decline the lane; the Success criteria below are worded to
match, and this is the single biggest thing for PK to accept or reject at this gate.

## 6. Verification after P-5B

```bash
python scripts/db-read.py "SELECT status, count(*) FROM ice_ro.asset_gap_backlog GROUP BY status ORDER BY 1"
```

(Requires WS-3(a); otherwise the equivalent read is a gated `execute_sql`.) After the first
scheduled fire:

- exactly one new `m.asset_gap_analysis_run` row, `triggered_by = 'cron'`, `dry_run = false`,
  `error_count = 0`, non-empty `pre_state`;
- `cron.job_run_details` shows `succeeded` for `asset-gap-analysis-daily`;
- `ice_ro.cron_health` shows the job present and not missed.

### 6.1 The `error_count` monitor — a NAMED READ, not an automatic alert

A scheduled run **cannot** raise on `error_count > 0` without rolling back the very evidence
row that records it: pg_cron runs each job as one transaction, so a `RAISE` would discard the
run log. Evidence beats alerting, so the run is recorded and the condition is surfaced by
this read, to be run **daily for the first week, then weekly**:

```
SELECT run_id, ran_at, triggered_by, scanned, inserted, updated, reconciled_resolved, error_count
FROM m.asset_gap_analysis_run WHERE error_count > 0 ORDER BY ran_at DESC;
```

**Any row returned is an operator STOP** — it means the analyzer is silently failing per row,
the exact condition the run log was built to expose. Automated alerting is OQ-6.

## 7. Open questions (PK decisions — NOT resolved here)

- **OQ-1 — cc-0043 git↔DB parity — ✅ CLOSED, no decision needed.** Rev-2 raised this; rev-3
  disproved it. The migration is on `main`/`origin/main` via cc-0087 commit `8fbba80` and the
  replay chain reproduces the live body (§1). The stale claim came from the register, not from
  a live check.
- **OQ-2 — "ending the permanent dry-run default": which reading?** This packet reads the
  brief as *ending the state where every run is a dry run*, achieved by passing
  `p_dry_run => false` at the call site while both functions keep a `true` default. The
  literal alternative — flipping the default — is rejected because it makes every future
  ungoverned caller live-writing by accident, and requires `CREATE OR REPLACE` on a function
  whose defining migration is not on `main` (§1). **If PK intends the literal flip, this
  packet must be re-cut**; four assertions currently enforce the opposite.
- **OQ-3 — run-log retention and size.** No retention policy. One row per day, each carrying
  a full-row before-image of both gap tables (including two jsonb payload columns). Tiny at
  today's 8 rows; grows with the backlog × days. `m.ef_drift_log` has a 90-day retention cron
  as precedent. Proposed as a follow-on rather than widening a T3 packet.
- **OQ-4 — `p_lookback_days => 7` on a daily schedule** re-scans the same drafts up to seven
  times. Harmless by design (the partial-unique index makes repeat detection an in-place
  UPDATE and `demand_count` is recomputed from observations, not incremented) but a
  deliberate redundancy, not an oversight.
- **OQ-5 — the reconcile pass is unbounded.** It iterates every open suggestion per run,
  calling `select_template` each time. Fine at 4 rows; at a few hundred it is a real cost and
  a real blast-radius question on a standing daily job. A reconcile ceiling would be a change
  to the analyzer, which is out of scope here — flagged for a follow-on.
- **OQ-6 — automated alerting on `error_count > 0`** (§6.1). Deferred; the named read is the
  interim control.
- **OQ-7 — dashboard-repo consumer check — ✅ CLOSED 2026-08-01.** Prompted by the external
  reviewer listing the zero-consumer claim as unverified. Grepped `C:\Users\parve\invegent-dashboard`
  (excluding `node_modules`/`.next`/`.git`) for `asset_gap_suggestion` · `asset_gap_observation` ·
  `run_asset_gap_analysis` · `asset_gap_analysis_run`: **zero hits.** Combined with the
  content-engine grep, the zero-consumer claim now holds across **both** repositories — which
  is the mitigation OQ-10 Option A rests on.
- **OQ-9 (rev-4 carry) — guard 3b compares to the LIVE column count, not the frozen 43.**
  A column added to `m.asset_gap_suggestion` after freeze is captured, counted as complete,
  and passes Stage B — then breaks the restore's frozen 42-column SET list, discovered only
  when the rollback runs. Fails closed via the `EXCEPT`. Closing it means adding a new
  control (`IF b_cols <> 43 … b_obs_cols <> 6 … RAISE`), which is outside rev-4's authorised
  scope; named here so it is not mistaken for done.
### ⚖ The two judgment calls — BOTH DECIDED BY PK 2026-08-01

> **OQ-10 → Option A (DECLARE, do not tighten).** Recorded as an explicit accepted limit in
> §5 ("Where it does NOT refuse"), including the four facts the acceptance rests on and the
> standing condition that it **must be re-decided if any consumer or writer of the two gap
> tables is ever added**. No SQL changed.
>
> **OQ-11 → Option B (do NOT spend a second ledger version).** §5.1 rewritten: the false
> "proven last or not at all" claim withdrawn and replaced with the true reason (cost of a
> permanent second ledger identity), plus the compensating facts. No SQL changed.
>
> **Neither ruling altered any artifact**, so all six rev-4 hashes in §2 stand and external
> review `66fb08f0-4015-4513-8e62-ed3da3f8ae32` remains valid against them.
>
> **P-5B is untouched and remains a separate PK activation gate.**

The original options are preserved below as the decision record.

- **OQ-10 (was AHA-03-6) — rollback B's delete is snapshot-complement, not run-attribution:
  DECLARE or TIGHTEN?**
  The revert deletes every row whose id is absent from the before-image. That is correct for
  the run's own writes, but it also destroys any row written by a *third party* between the
  run and the revert — and because the before-image is a whole-table snapshot, the
  bidirectional `EXCEPT` then compares the truncated table to the snapshot, finds no
  difference, and reports *"reverted and verified field-for-field"*. So this is the one
  branch that is silently destructive **and self-confirming**, and §5 currently claims "none
  silently corrupts".
  - **Option A — DECLARE (recommended).** Add a sixth §5 branch stating plainly that the
    revert is a whole-table restore and therefore also discards concurrent third-party
    writes to these two dark tables, citing the zero-consumer evidence (§4) as the
    mitigation. Cheap, honest, matches the packet's stated preference for declaring over
    weakening. Risk: the mitigation is a *present* fact, not a guarantee — the day something
    else writes these tables, the declaration is all that protects it.
  - **Option B — TIGHTEN.** Add run attribution (`created_at >= v_run.ran_at`) alongside the
    `NOT EXISTS`, and raise if the two predicates disagree. Strictly safer; costs a
    re-freeze, a re-review, and introduces a new failure mode (clock/ordering edge cases on
    rows created in the same instant as the run).
  - **⚑ Evidence moved after rev-4 — read before deciding.** This is now flagged by **three
    independent reviewers**: `apply-harness-auditor` (AHA-03-6), and the external review of the
    frozen rev-4 set (`66fb08f0-4015-4513-8e62-ed3da3f8ae32`), which named it one of only two
    pushback points and judged it *"isn't adequately mitigated"* at **high** risk. Cutting the
    other way, the mitigation is now firmer than when Option A was first proposed: **OQ-7
    closed** — zero readers across *both* repositories, not just this one — and the tables are
    service-role-only with RLS deny-all.
  - **Recommendation: A**, on the grounds that the tables are now provably dark in both repos
    and the declaration makes the limit visible at the gate rather than at 3am. **But B is
    materially more defensible than it was**: three reviewers converged on it independently,
    and the genuinely nasty property is not the deletion — it is that the verification step
    *confirms success* afterwards. If PK's instinct is that a self-confirming destructive
    branch should not ship on a declaration, that instinct is well-supported and Option B is a
    two-predicate change plus a re-freeze.

- **OQ-11 (was AHA-03-8) — spend a second ledger version to prove rollback A?**
  §5.1 says rollback A is *"proven last or not at all"*. That was asserted, not derived, and
  `apply-harness-auditor` was right to challenge it: after §5.1 step 4 (rollback B has
  deleted the only run-log row, Stage C not yet applied) **both** of rollback A's refusal
  guards are satisfied, so it IS exercisable there. The real cost is that proving it means
  re-applying Stage A, which mints a **second `apply_migration` ledger version** under a new
  name — permanent ledger identity for a rehearsal.
  - **Option A — prove it.** Insert step 4b: rollback A → re-apply Stage A under a second,
    distinct migration name. Full rehearsal coverage of all three rollbacks; permanent cost
    is one extra ledger row and a name that must never be reused.
  - **Option B — don't.** Keep the current position but replace the inaccurate "not at all"
    with the true reason. Rollback A is the least risky of the three (two DROPs of objects
    nothing references) and the most guarded (it refuses while a live run or the schedule
    exists).
  - **Recommendation: B**, on the grounds that ledger identity is permanent and a rehearsal
    is not worth spending it on — but this is squarely PK's call, and A is defensible if the
    lane wants complete rollback coverage on the record.

- **OQ-8 — transitive selector-policy coupling in the reconcile pass (§3.1).** The cc-0089
  decoupling holds literally — no gap function reads
  `c.creative_template_selector_policy` — but the reconcile pass calls `select_template`,
  which does. Once the writer runs on a schedule, a selector-policy change becomes able to
  flip gap rows `open → resolved` overnight with no gap-side change. Pre-existing and
  unchanged here; the question is whether that satisfies the *intent* of the decoupling or
  merely its letter. Worth a ruling before the schedule stands for months, not before P-5B.

## 8. STOP conditions (Convention 2 — non-removable)

A tripped STOP voids the remainder of the sequence; resumption requires a fresh PK gate.
Marked **[X]** where backed by executable SQL, **[out-of-band]** where it necessarily is not.

1. **[out-of-band]** Artifact sha256 ≠ the hash pinned in the external review's `reviewed_input_hash`.
2. **[X]** Any stage's in-transaction assertion raises.
3. **[X]** Stage B reports `error_count > 0` — the run is already rolled back, and Stage C's
   precondition independently refuses to schedule without a clean proving run.
4. **[X]** Stage B's suggestion-row delta exceeds 25, or auto-resolutions exceed
   **(baseline-open + rows inserted by this run)** — the ceiling guard 6 actually enforces.
5. **[X]** Stages applied out of order or two stages in one call (`age(xmin)` guards).
6. **[X]** At Stage C: the jobname already exists, the `50 16 * * *` slot is taken, or a
   `m.cron_health_check` row already exists for the jobname.
7. **[out-of-band]** `db-rls-auditor` returns anything other than normalized `clean`.
8. **[out-of-band]** `branch-warden` returns anything other than `safe`.
9. **[out-of-band]** Any non-clean external review verdict.
10. **[X]** `public.run_asset_gap_analysis` body md5 ≠ `ec2bb745bf37d956f8537d0ee2f04b77`
    — asserted in Stages A, B, C **and again in C4 immediately before arming**. **Rollback A
    deliberately does NOT assert the frozen hash** (rev-3 F-3): it compares the analyzer to
    itself start-vs-end, so a legitimate future analyzer change cannot block the reversal
    path. (Corrects the stale rev-3 wording — AHA-03-2.)
11. **[X]** *(new, rev-4)* A transaction-anchor mismatch in Stage A, Stage C or rollback A:
    that stage's objects have already committed and the abort cannot remove them. **Run the
    matching rollback before any retry** — a bare retry trips the "already exists"
    precondition and reads as a second, unrelated failure. For Stage C the job is created
    **disarmed**, so this state cannot fire (M-1).

## Success criteria

- Stage A applies dark: run log + wrapper exist, `service_role`-only, zero RLS policies, no
  anon/authenticated reach, both functions defaulting to dry-run, no schedule, empty run log.
- Stage B commits with `error_count = 0`, a bounded delta, and a **complete** before-image
  (43/43 columns per captured row).
- Stage C schedules `asset-gap-analysis-daily` at `50 16 * * *` calling the persisting
  wrapper with an explicit `p_dry_run => false`, health expectation seeded at 1440.
- First scheduled fire produces one clean run-log row (§6).
- Rollback rehearsed per §5.1 **as the first act of P-5B** (steps 3–4 and 7 observed clean),
  not before it — see §5.1 for why that is the only honest form of this criterion.
- ≥1 gap row observed `open → resolved` through the live loop (programme brief §5 WS-3).
  **Verification path:** `SELECT run_id, ran_at, reconciled_resolved FROM
  m.asset_gap_analysis_run WHERE reconciled_resolved > 0 ORDER BY ran_at DESC;` returns at
  least one row. Note this is **not** guaranteed by the proving run — Stage B's guard 6 is an
  upper bound only, so a run that resolves nothing still passes every gate. If the criterion
  is still unmet after the first week of scheduled runs, that is a finding about the backlog
  (all four open rows are `blocked_by_template`, §2 of the reconciliation result), not a
  failure of this packet.

## Stop condition

Report per the result template, then stop. **P-5B is a PK hard stop; the authoring lane does
not apply this packet.**
