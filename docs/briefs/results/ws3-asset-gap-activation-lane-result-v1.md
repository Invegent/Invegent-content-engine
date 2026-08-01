# WS-3 — Asset Gap activation lane (read view · register reconciliation · live-writer packet) — result v1

**Created:** 2026-08-01 Sydney
**Author:** Claude Code (orchestrator)
**Governing brief:** `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §3 WS-3, §6 week-1 item 3
**Lane scope as given:** "ice_ro gap read view (T2) + DB⇄markdown register reconciliation + the
live-writer/scheduler packet through review, **stop at P-5B**."
**Verdict:** `CONCERNS` — all three deliverables produced; **two of the three halt at a PK gate
with a non-clean verdict**, as the contract requires. Nothing applied, nothing committed,
nothing pushed. Zero database mutations.

---

## 1. What was produced

| # | Deliverable | State |
|---|---|---|
| (a) | `ice_ro.asset_gap_backlog` read view — T2 packet + apply artifact + rollback | **Review chain COMPLETE. Verdict NOT clean** → halted at PK (2 policy decisions) |
| (c) | DB ledger ⇄ markdown register reconciliation — T1 | **COMPLETE.** Verdict `CONCERNS`: the demotion the brief asks for is not safe as written → 2 PK decisions |
| (b) | Live writer + scheduler — P-5A packet + 6 apply/rollback artifacts | **Re-cut twice under review. Rev-3 awaits a third audit round**, then external review, then P-5B |
| (d) | `responsible_lane` routing design for every non-ready target cell | **COMPLETE** (added after the seed packet arrived). Finding: cell routing is **already complete** — and it **overturns the D-1 recommendation above** |

Files:
- `docs/briefs/ws3-asset-gap-read-view-packet-v1.md` (+ 2 artifacts)
- `docs/briefs/results/ws3-asset-gap-register-reconciliation-result-v1.md` (+ a `§0.3` block added to `docs/briefs/ice-asset-gap-register-v1.md`)
- `docs/briefs/ws3-asset-gap-live-writer-scheduler-packet-v1.md` rev-3 (+ 6 artifacts)

## 2. The finding that matters most

**The Asset Gap analyzer has never run live, and the reason is now named.** Its
`p_dry_run` default is `true` and no schedule exists, so `m.asset_gap_suggestion` has held the
same 8 rows (4 open / 4 resolved) since 2026-07-20 — re-verified live 2026-08-01, twelve days on.

**All four open rows are `blocked_by_template`. Not one is `drainable`.** The genuine
asset-shortage backlog is empty; every open row is a template/config gap that no image
harvest can close. That is the honest state of the "living backlog" WS-3 is meant to activate.

**And the markdown register is not a stale duplicate of the DB ledger — it is a superset.** Of
its 15 items, 2 reconcile to ledger rows, 3 closed without ever leaving a trace, **9 are
structurally not representable** by the analyzer (music / avatar / voice / brand colours /
video governance — subject-type expansion is out of Ultimate v1), and 1 is a live divergence.
**Demoting it to commentary today would move ten live backlog items into a file marked
non-authoritative with nothing inheriting them.** That is a quiet deletion of most of the
backlog, not a reconciliation — so the demotion was *not* executed. See §6 D-1.

## 3. What the review chain caught — and what it got wrong

Both auditors ran twice. This is the substance of the lane, not a formality.

**Round 1 → `block` + CONCERNS.** Two auditors independently found the same root defect: the
live-writer rollback captured **9 of the 19 columns** the analyzer mutates, and its restore
`UPDATE` was filtered on `(status, demand_count) IS DISTINCT FROM …` — which skips exactly the
*common* case, because the analyzer's repeat-detection path leaves both unchanged while
overwriting six other columns. The declared rollback was fiction, and the verification
compared row counts only, so nothing could see it. Separately: three stages sat in ONE file
behind comment-banner boundaries, so a single paste would have executed the first live
production write **and** scheduled the standing job with no gate between them.

**Round 2 → `block` again + CONCERNS.** The re-cut introduced two fresh defects of its own:
- Stage C's assertion tested `LIKE '%p_dry_run => false%'` (one space) against a job body that
  column-aligns its arguments (`p_dry_run       => false`, seven spaces). **Stage C would have
  aborted on every byte-correct apply.**
- Rollback A pinned the analyzer's md5 *after* its DROPs, so any legitimate future analyzer
  revision would abort the rollback and undo its own work — making the reversal path unusable
  exactly when needed.

**One headline finding was wrong, and I checked rather than complied.** Both auditors called
the `age(xmin) = 0` same-transaction composition guard "inert, can never fire" — it was
`db-rls-auditor`'s primary `block`. Tested directly on the live server: created a table and
read its catalog row in the same transaction → `age(xmin) = 0` is **TRUE**. The auditor had
inferred it from an indirect `pg_snapshot_xmax` probe run in a *read-only* transaction, where
no xid is assigned; the second auditor corroborated the bad conclusion statically. The guard
works. Both tests are now OR'd into the artifact with the empirical result recorded inline so
a third reviewer does not re-litigate it.

## 4. `branch-warden`: `stop` — and it is a live finding, not paperwork

HEAD moved **three times** during the audit, in the shared default worktree this lane's
uncommitted work sits in — another lane committed v6.99 and then a v6.100 Slice-F register
cut while this lane ran. Also: the session bootstrap's "behind origin/main by 1" was **stale
and backwards** — local `main` is *ahead* by 3 unpushed commits (the known fetch-free digest
lag).

This lane's own file set stayed clean and confined to the 8 approved paths. But **nothing here
should be committed with `git add -A`** — only the 8 explicit paths — and the ahead-of-origin
commit list must be re-derived immediately before any push. Nothing was committed or pushed.

## 5. External review (read view only)

`ask_chatgpt_review` on the frozen read-view artifact: **`partial` / medium / high confidence /
escalate**, review_id `82ca26aa-fdf6-4bf0-9b36-7b94595f9352`, pinned to hash `8d5ca12d…8985`.
Both pushback points triage as `policy_decision`, not `concrete_defect` → PK decision gate
(§6 D-3, D-4). The live-writer packet has **not** been externally reviewed: doing so before its
third audit round would produce a review that goes stale on the next re-cut.

## 6. PK decisions required

| # | Decision | Recommendation |
|---|---|---|
| **D-1** | WS-3(c) demotion sequencing: ~~route via WS-3(d) first, then demote (A)~~ · demote now and accept the loss (B) · **two-register model (C)** | **C — corrected.** A was my first recommendation and is **withdrawn**: WS-3(d) proved `responsible_lane` structurally cannot inherit pool-depth items, so routing-then-demoting would cause the exact loss A was meant to prevent |
| **D-2** | P1-5 (NDIS authoritative logo): the one live divergence — a representable type the fail-closed detector will never emit, because it cannot see a *promotion-quality* gap | Route under D-1, or record it as a stated limit of the Asset Gap system |
| **D-3** | Read view: INNER vs LEFT join to `c.client` (external reviewer suggested LEFT) | **Keep INNER** — `client_id` is NOT NULL with an FK carrying NO ACTION on delete, so the orphan state the reviewer is guarding against is unreachable by construction |
| **D-4** | Read view: the hardcoded schema-wide grant total of 15 (reviewer flagged brittleness) | **Keep** — the brittleness is the control; it converts a silent over-grant into an abort, and cc-0090 set the precedent at 14 |
| ~~D-5~~ | ~~cc-0043 git↔DB parity commit before P-5B~~ | **✅ CLOSED — no decision needed.** The gap was already closed by cc-0087 (`8fbba80`); the migration is on `main`/`origin/main` and the replay chain reproduces the live body. My rev-2 packet inherited a **stale claim from the register** instead of checking git — corrected in packet §1, and the register's §0.1 text fixed in place |
| **D-6** | Live writer OQ-2: "ending the permanent dry-run default" — this packet passes `p_dry_run => false` at the call site and keeps both functions defaulting to `true`. The literal alternative is flipping the default | **Keep the call-site reading**; a flipped default makes every future ungoverned caller live-writing by accident. If PK wants the literal flip, the packet must be re-cut |
| **D-7** | Live writer §5.1: the rollback **cannot** be validated before the first live write — a same-call composition guard and a same-transaction rehearsal are mutually exclusive, and dev branches come up bare. P-5B would therefore authorise an apply-and-revert rehearsal as its *first act* | Accept on those terms or decline the lane. **This is the biggest thing to accept or reject at this gate** |

## 6.1 Seed-packet reconciliation (relay received after the work was done)

The `asset-gap-activation-v1-p5a` seed arrived post-delivery, informational, no authority. Its
task list is (a)(b)(c)(d); (a)(b)(c) were already delivered. Two items it raised were **not**
covered and are now closed:

1. **"Register §0.1's parity gap appears closed by cc-0087 but the text was never updated."**
   Correct, and worse than a doc nit: my rev-2 packet had **inherited that stale claim** and
   built a whole unsatisfied-precondition section plus a PK decision (D-5) on top of it. Both
   are now retracted; the register text is corrected in place.
2. **WS-3(d)** — delivered (§1 above), and it overturned D-1.

**Standing constraints, verified live rather than asserted** (packet §3.1):

- *Existing gap types only, no `subject_kind` CHECK expansion* — honoured; no artifact touches
  any CHECK or vocabulary.
- *`governed_auto_sourcing` monopoly of `(static_background, absent)`* — honoured, and
  **hardened**. The monopoly rests on the IMMUTABLE `asset_gap_automation()` mapping plus the
  CHECK `gap_absent_static_bg_requires_conclusive`. Today a CHECK violation would be swallowed
  into the analyzer's `n_error` counter where nothing would ever see it; Stage B's guard 1
  turns it into a hard STOP that rolls the run back.
- *cc-0089 decoupling* — honoured **literally**, with a caveat worth a ruling: none of the
  three gap functions reads `c.creative_template_selector_policy`, **but** the reconcile pass
  calls `select_template`, which does. Auto-resolution is therefore *transitively*
  policy-sensitive — once scheduled, a selector-policy change can flip gap rows
  `open → resolved` overnight with no gap-side change. Pre-existing, unchanged by this packet,
  now recorded as **OQ-8**.
- *R0 reads where coverable* — honoured.

## 6.2 Rev-4 + external review (PK decision sitting, 2026-08-01 item 4)

PK authorised rev-4 as packet authoring. Delivered: **M-1 remediated structurally** — Stage C
now creates the cron job **disarmed** inside one atomic DO block and arms it in C4, the last
statement, behind a full re-check. No path through the file ends with an armed writer and a
failed assertion; the worst residue is a job that exists and **cannot fire**. M-2, M-3 and the
AHA-03-1 ceiling drift folded in; STOP 11 added; four of six artifacts re-frozen.

**External review against the new exact hashes:** `partial` / **HIGH** risk / escalate,
review_id `66fb08f0-4015-4513-8e62-ed3da3f8ae32`. **No `concrete_defect` against the rev-4
SQL.** One pushback contradicts the reviewer's own verified-claims list (it asserts C2 may
leave the job armed *and* that C2 disarms it immediately); the other is OQ-10 verbatim. It
also listed the zero-consumer claim as unverified — **now closed**: the dashboard repo greps
clean, so zero readers holds across both repositories.

P-5B remains a separate PK activation gate. Nothing was applied.

**Both judgment calls DECIDED by PK, 2026-08-01 — the lane's last open items:**

- **OQ-10 → Option A (declare, do not tighten).** Rollback B's whole-table-restore limit is
  now an explicit, named, accepted limit in packet §5, with the four facts the acceptance
  rests on and a **standing condition: it must be re-decided if any consumer or writer of the
  two gap tables is ever added.** That condition is the live part of this ruling — the
  mitigation, not the mechanism, is what makes it safe.
- **OQ-11 → Option B (do not spend a second ledger version).** §5.1's false "proven last or
  not at all" claim withdrawn; replaced with the true reason (a permanent second
  `apply_migration` identity spent on a rehearsal) plus the compensating facts.

**Neither ruling changed any SQL.** OQ-11 is packet text only. OQ-10's declaration was then,
on PK's follow-up instruction, also placed in the **rollback file's own header** so an operator
meets it before the first statement — see below.

### 6.2.1 OQ-10 declaration in the rollback header (rev-4a)

`ws3-live-writer-stage-b-proving-run-v2-rollback.sql` → `40467e06c08b388295f6a14424180b06405104bddf072cba36d40dfbe981afe8`.
**Comment-only, mechanically verified after every edit**: 122 identical executable lines,
identical stripped-content sha256, against the pre-amendment original. No SQL statement was
added, removed, or altered. The other five artifact hashes are untouched.

The header now carries: the accepted-limit declaration (whole-table restore; silently
destructive *and* self-confirming; a clean success message is not evidence third-party rows
survived), the four facts the acceptance rests on, an operator **STOP**, and — after the
re-review chain — a `HOW TO CHECK THAT STOP` block: three copy-pasteable checks with
live-verified baselines, plus an explicit COVERED / NOT COVERED list.

Re-review chain (packet §0.5): `9bf35841` → `0f18b28b` → **`e09a739f`, which did NOT escalate**
(`requires_pk_escalation: false`) and verified the completeness gap closed. Two real defects
were fixed en route — an unactionable STOP and an incomplete DB-side check — plus a wrong
expected-baseline in my own first draft, caught by actually running the checks.

## 6.3 Register pointer payload — VERSION-LESS (per PK item 7)

`docs-hygiene-register-reconciliation-t1` is the single register-cut owner; this lane does not
allocate a version. Payload for that lane to cut:

> **WS-3 Asset Gap activation — read view + register reconciliation + P-5A packet.** T2 read
> view `ice_ro.asset_gap_backlog` frozen, chain complete, external `partial`→PK (D-3/D-4).
> Register reconciliation done — markdown is a *superset* of the DB ledger; demotion HELD
> (D-1 → two-register model). WS-3(d): cell routing already complete, zero cells route to
> `asset_gap`; `responsible_lane` cannot inherit pool-depth items. Live-writer packet at
> **rev-4**, six artifacts frozen, three audit rounds + external review, M-1 remediated
> structurally (job created disarmed, armed last). **P-5B NOT taken — separate PK activation
> gate.** Both judgment calls DECIDED 2026-08-01: **OQ-10 → A** (declare rollback-B's
> whole-table-restore limit — declaration placed in packet §5 **and** the rollback file header
> at rev-4a, comment-only, with a checkable operator STOP; **standing condition — re-decide if
> any consumer or writer of the two gap tables is added**) · **OQ-11 → B** (no second ledger
> version). Neither ruling changed SQL. External review chain terminated non-escalating
> (`e09a739f`). Result: `docs/briefs/results/ws3-asset-gap-activation-lane-result-v1.md`.

**SUBMITTED** to `docs-hygiene-register-reconciliation-t1` (session
`local_6f339e32-0bc4-428f-bab8-d935a6e1b416`) 2026-08-01, version-less per PK item 7. This
lane allocated no register version.

## 7. Next step before P-5B

Three audit rounds and the external review are **complete**, all pinned to hashes. The lane is
at P-5B with two PK judgment calls outstanding (OQ-10, OQ-11).

`db-rls-auditor`'s round-3 ruling stands: **a fourth full DB audit is not warranted** — rev-4's
changes are narrow and each changed expression was verified individually against live
(`to_regprocedure` absent-case returns `absent` without throwing; the C4 identity regex matches
the real job body; `cron.alter_job`'s five optional params all default to NULL so the named-arg
disarm/arm calls are valid; the rollback-C normaliser works). What remains is PK's ruling on
OQ-10 and OQ-11, and — if OQ-10 goes to Option B — one re-freeze plus a fresh external review
on the new hash.

## 7.1 Session closed — P-5A complete

Handoff record: **`docs/briefs/results/ws3-p5a-handoff-v1.md`** — the eight frozen hashes
(re-verified byte-exact at handoff), the four outstanding decisions (D-1, D-3, D-4, OQ-10),
confirmation that P-5B is untaken, and a live-verified table showing nothing was applied.

**Continuation session: `asset-gap-p5b-apply-and-closeout`.**

## 8. Non-claims

Nothing was applied, deployed, migrated, committed, or pushed. No DML or DDL was executed
against production; every database interaction was a SELECT or catalog read (plus one
session-local `CREATE TEMP TABLE` used solely to settle the `age(xmin)` question, which
vanished with the session). The markdown register was **not** demoted — that awaits D-1.
WS-3(d) was **designed, not built** — no `responsible_lane` edit, no schema change, no
register re-scoping (that is D-1's consequence, not this lane's authority); its cell-coverage
verification enumerated NDIS Yarns only, though the routing logic is client-agnostic. No
register version was cut. The
zero-consumer claim is verified for this repository only; the dashboard repo was not searched.
The live-writer packet is **not** cleared for apply, and this lane holds no apply authority.
