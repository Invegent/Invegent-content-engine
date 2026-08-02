# WS-3 closeout — read-view gate prep, routing re-verification, loop proof, operator carries — result v1

**Created:** 2026-08-02 Sydney
**Author:** Claude Code (orchestrator), branch `claude/asset-gap-routing-loop-proof-3nib47`
**Governing brief:** `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §3 WS-3, §5 WS-3 DoD
**Seed:** `asset-gap-read-view-routing-and-loop-proof` (relayed at PK's request; "every apply is
its own PK gate")
**Tier:** **T1** (read-only DB verification + docs-only edits). **Task 1 (the read-view apply)
is explicitly NOT executed by this record** — see §1.
**Lane class (CCF-02):** SAFETY_GATE

---

## 0. Status summary

| # | Seed task | Status |
|---|---|---|
| 1 | Read view T2 apply gate | **Prep complete, gate card assembled below. Apply is a hard PK stop — NOT executed.** |
| 2 | Two-register model (D-1) finalization | **Done** — `docs/briefs/ice-asset-gap-register-v1.md` §0.4 added |
| 3 | Routing — all four brands | **Confirmed** — zero unrouted non-ready cells, zero routes to `asset_gap`, all four brands |
| 4 | Loop proof — natural scheduled fire | **Partially closeable now** — one natural fire already captured (2026-08-01); a second has not yet occurred as of this evidence pull |
| 5a | Operator carry — monitor routine | **Proposed, not armed** — `.claude/routines/asset-gap-error-monitor.ps1` |
| 5b | Operator carry — rollback-B condition | **Restated below (§6)** |

No database mutation performed by this record. No migration applied. One repo commit (docs only).

---

## 1. Task 1 — Read-view T2 apply gate (prep complete; apply NOT taken)

**Packet:** `docs/briefs/ws3-asset-gap-read-view-packet-v1.md`. **Frozen artifacts, re-verified
byte-exact today (2026-08-02, local sha256sum):**

| File | sha256 | Match |
|---|---|---|
| `docs/briefs/artifacts/ws3-asset-gap-backlog-view-v1.sql` | `8d5ca12d763f69f0d3f9d804fef40bc97a80d15322add52cd4fe20f62d2e8985` | ✅ exact |
| `docs/briefs/artifacts/ws3-asset-gap-backlog-view-v1-rollback.sql` | `7d41520f2de6e3d3840311ef82635d3b34e22679b75c4fb9a4331c3a9121e014` | ✅ exact |

No re-cut needed — the artifacts are byte-identical to the packet's pinned hashes and to the
hashes the external review (`82ca26aa-fdf6-4bf0-9b36-7b94595f9352`) and `db-rls-auditor` round 2
reviewed.

### 1.1 D-3 / D-4 — confirmed already satisfied by the packet as authored

Per `docs/briefs/results/ws3-p5a-handoff-v1.md` §2, PK ruled:
- **D-3 — keep INNER join** to `c.client` (not LEFT). The packet was authored with INNER.
- **D-4 — keep the grant-total pin** at 15 (not drop it). The packet was authored with the pin.

Both PK rulings match the packet's own authored recommendation, so **the SQL requires no
edit** — the frozen hash above is the artifact PK's rulings apply to. No re-review is needed
under external-review rule 1 (only a diff change invalidates a prior review).

### 1.2 Pin re-derivation (seed's explicit ask — "re-derive the CURRENT correct total, not a
silent bump") — live-read 2026-08-02

```sql
-- relations currently in ice_ro
SELECT table_name FROM information_schema.tables WHERE table_schema='ice_ro';
-- → 14 rows: asset_governance_status, asset_graduation_client_owned,
--   asset_graduation_client_pool_policy, asset_graduation_geo_classes,
--   asset_graduation_shared_reachability, cron_health, deploy_drift_status, draft_status,
--   music_governance_status, pipeline_health, publish_status, render_status, slot_status,
--   template_registry_status

-- matching ice_readonly SELECT grants
SELECT count(*) FROM information_schema.role_table_grants
WHERE grantee='ice_readonly' AND table_schema='ice_ro' AND privilege_type='SELECT';
-- → 14
```

**Result: still exactly 14 relations, still exactly 14 matching grants.** No relation was added
to `ice_ro` between authoring (2026-08-01) and this re-check (2026-08-02). **The pin of 15
(post-apply total) in the frozen SQL is still the correct value — no re-cut required.** This
satisfies STOP condition 3 of the packet ("`ice_ro` holds anything other than 14 relations
immediately before apply") as of this read; the apply gate should re-run this exact check
immediately before the actual `apply_migration` call, since "immediately before" is a
time-of-apply guarantee, not a point-in-time one.

### 1.3 Review chain — status

| Stage | Verdict |
|---|---|
| `db-rls-auditor` round 2 | `pass` (packet §9) |
| `branch-warden` (at authoring) | `stop` — unrelated to this artifact (packet §9) |
| `ask_chatgpt_review` | `partial` / escalate to PK on D-3/D-4 only — **both now PK-ruled, matching the artifact as authored** (§1.1) |
| Pin re-derivation | **Re-confirmed live 2026-08-02** (§1.2) |

**The chain is complete and clean as of today's re-verification.** Nothing here clears the
apply gate itself — per the seed packet's own instruction ("every apply is its own PK gate")
and the standing CLAUDE.md contract ("Deploy / merge / migrate... HARD STOP... PK runs or
authorises the irreversible step"), the actual `apply_migration` call is **not executed by
this orchestrator session**. It is prepared and gated in the accompanying chat turn.

### 1.4 Exact sequence for the apply, when PK authorises

1. Immediately before: re-run §1.2's two SELECTs. Any drift from 14/14 → STOP, do not apply.
2. `apply_migration` with `docs/briefs/artifacts/ws3-asset-gap-backlog-view-v1.sql`, intended
   name `ws3_asset_gap_backlog_read_view_v1`. Record the **minted** version (not the intended
   name) in the outcome.
3. Run packet §7's two read-only verifications via `db-read.py` (zero-prompt, `ice_readonly`).
4. If both succeed: apply is clean. If either fails: MISMATCH, packet §8 STOP condition 7.

---

## 2. Task 2 — Two-register model (D-1) finalized

`docs/briefs/ice-asset-gap-register-v1.md` gained a new `§0.4` (following the file's own
"dated subsection, no historical rewrite" convention already used by §0.1–§0.3):

- States the split explicitly: DB ledger (`m.asset_gap_suggestion` / `ice_ro.asset_gap_backlog`)
  = machine register for analyzer-detected, cell-attributable demand; readiness queue
  (`get_client_production_readiness_queue`) = cell ownership (unchanged, already complete);
  this file = retained, re-scoped to the **9 pool-depth items** no detector can or will ever
  emit a row for (P0-2, P0-3, P1-5, P1-6, P2-1, P2-2, P2-3, P2-4, P2-5).
- Names the **6 items removed** from live tracking (P0-1, P1-1, P1-2, P1-3, P1-4, P2-6) —
  closed, or independently confirmed by ledger `resolved` rows, or never asset-subject-typed.
- Cross-references both ways: this file → ledger read command and → readiness-queue call;
  ledger/queue → this file (a pool-depth item that starts making a specific cell fail moves
  out of this file and into the ledger's own detection, not before).
- Corrects, without rewriting, the stale "D-1 Option A" line recorded in §0.3 (written
  earlier the same day it was superseded, per `docs/briefs/results/ws3-responsible-lane-routing-design-v1.md`
  §5) — a pointer note is added immediately after that line, the line itself is untouched.

**§§1–2's severity tables are NOT rewritten** (Convention 1 — no historical rewrite); §0.4
states explicitly that every row there except the 9 retained items is superseded.

---

## 3. Task 3 — Routing coverage, all four brands (live-read 2026-08-02)

`get_client_production_readiness_queue(p_client_slug)`, project `mbkmaxqhsohbtwsqolns`:

| Brand | Total cells | Routed (`responsible_lane` set) | `NULL`-lane cells | Unrouted **and** not-ready | Routed to `asset_gap` |
|---|---|---|---|---|---|
| care-for-welfare-pty-ltd | 9 | 7 | 2 | **0** | **0** |
| invegent | 6 | 4 | 2 | **0** | **0** |
| ndis-yarns | 46 | 40 | 6 | **0** | **0** |
| property-pulse | 40 | 32 | 8 | **0** | **0** |

Every `NULL`-lane cell was individually inspected: all 18 of them carry `overall_state='ready'`
(the routing rule's own "ready, nothing to route" case — e.g. the D1 governed template-less
text cells, and genuinely production-ready image_quote/carousel/video_short_stat cells). **Zero
cells, on any of the four brands, are both non-ready and unrouted. Zero cells, on any brand,
route to `asset_gap`.**

This extends the prior NDIS-only finding (v6.108: 46/46 routed, zero to `asset_gap`) to all
four brands and reconfirms it live for NDIS itself (cell count and ready-cell count have
drifted slightly since 2026-08-01 — 6 ready cells now vs. 4 previously — improvement, not
regression, and immaterial to the routing-completeness claim). **Task 3 is closed: every
non-ready target-matrix cell carries a `responsible_lane` owner, on all four brands.**

---

## 4. Task 4 — Loop proof

**Evidence already on record (not re-litigated here):** the standing Stage-B proving run
during the P-5B apply sequence (`docs/briefs/results/ws3-asset-gap-live-writer-result-v1.md`
step 5) produced a live `open → resolved` transition (`run_id=agr_b348204f2e...`,
`reconciled_resolved=1`) — this independently satisfies the programme brief's §5 WS-3 DoD
criterion "≥1 gap row observed open→resolved through the live loop," **ahead of any scheduled
fire.**

**Natural scheduled fire — live-read 2026-08-02, `cron.job_run_details` for `jobid=94`:**

| runid | status | start_time (UTC) | end_time (UTC) |
|---|---|---|---|
| 479374 | succeeded | 2026-08-01 16:50:00.37 | 2026-08-01 16:50:01.19 |

**Exactly one natural fire exists so far** — the one already recorded in the P-5B result doc
(§3: `run_id=agr_0dc027ed...`, `dry_run=false`, `error_count=0`, `scanned=20`,
`reconciled_resolved=0` — the one resolvable gap had already cleared during the standing
proving run, so this fire correctly found nothing new to resolve). Live DB clock at this
evidence pull: `2026-08-02 00:53:43 UTC` (`2026-08-02 10:53 Sydney`) — the schedule's next fire
(`50 16 * * *` UTC) is **2026-08-02 16:50 UTC / 2026-08-03 02:50 Sydney, still ~16 hours away**
at the time of this record. `m.asset_gap_suggestion` remains 3 open / 5 resolved, unchanged
since the apply — consistent with only one natural fire having run.

**Disposition:** the seed's phrase "first: tonight 02:50 Sydney" refers to the fire that has
already occurred and is already fully documented (P-5B result doc §3, commit `6515bdd`). One
complete, zero-error autonomous cycle is captured. The WS-3 DoD's "≥1 gap row observed
open→resolved" clause is independently satisfied by the proving run (above). **A second natural
fire, if PK wants a further autonomous-evidence data point, will occur at 2026-08-02 16:50
UTC and can be captured in a follow-up read** — not performed here since it has not yet
happened.

---

## 5. Task 5a — Operator carry: error_count monitor (proposed, not armed)

Drafted: `.claude/routines/asset-gap-error-monitor.ps1`. Follows the proven pattern of
`.claude/routines/broll-rotation-monitor.ps1` (ARMED 2026-07-30, v6.78): daily, silent when
clean, writes a trigger file and disarms on the first `error_count > 0` row, never mutates
production, re-arming is a deliberate human act. **Not wired into any scheduler** — arming it
is named in the script header as its own T1/T2 gate, not taken here. This directly automates
the manual named read `docs/briefs/results/ws3-asset-gap-live-writer-result-v1.md` §4 already
calls for ("run daily for the first week, then weekly").

## 6. Task 5b — Operator carry: rollback-B standing condition, restated

**Restated verbatim from `docs/briefs/results/ws3-asset-gap-live-writer-result-v1.md` §4
(OQ-10), carried forward unchanged by this closeout:**

> Rollback-B (`docs/briefs/artifacts/ws3-live-writer-stage-b-proving-run-v2-rollback.sql`) is a
> **whole-table restore**, not a per-run diff. **PK-accepted ONLY while `m.asset_gap_suggestion`
> and `m.asset_gap_observation` have zero consumers and zero writers besides the analyzer
> itself.** If any new consumer (a dashboard read, a report, another worker) or any new writer
> is ever added to either table, **this must be re-decided before that lane ships** — the
> acceptance does not carry forward automatically. Live-verified true immediately before the
> P-5B apply (both DB-catalog and both-repositories code grep, zero hits beyond
> `run_asset_gap_analysis`); **the WS-3(a) read view being gated in this same record does NOT
> trip this condition** — a `SELECT`-only view is not a writer, and reading through it is not a
> new DML/DDL consumer of the base tables in the sense OQ-10 means (it reads `m.asset_gap_suggestion`,
> which was already the analyzer's own object; it adds no new *write* path). Any future worker,
> RPC, or dashboard feature that *writes* to either gap table is what re-opens this condition.

---

## 7. WS-3 DoD (programme brief §5) — status against this closeout

> "analyzer live on a governed schedule (via P-5A/P-5B); secret-free read view serving the
> backlog; ONE register (DB-generated); every non-ready target cell routed to an owner; ≥1 gap
> row observed open→resolved through the live loop."

| Clause | Status |
|---|---|
| Analyzer live on governed schedule | ✅ **Done** — P-5B applied, jobid 94, one clean natural fire (§4) |
| Secret-free read view serving the backlog | ⏳ **Gated, ready to apply** — §1, awaiting PK |
| ONE register (DB-generated) per kind of thing | ✅ **Done under the two-register model (D-1/Option C)** — §2; this is the corrected reading of "ONE register", not literally one file (see `docs/briefs/results/ws3-responsible-lane-routing-design-v1.md` §5 for why the literal reading was disproved) |
| Every non-ready target cell routed to an owner | ✅ **Done, all four brands** — §3 |
| ≥1 gap row observed open→resolved through the live loop | ✅ **Done** — §4 (proving run; natural-fire second data point available on request) |

**The DoD is fully satisfied except the read-view apply itself, which is a hard PK gate by the
seed packet's own instruction and is not taken by this record.**

## 8. Non-claims

This record applies no migration, writes no DML, arms no monitor, and cuts no register
version (Convention 1 — pointer entries held per the seed's explicit instruction, no active
`docs-register-cut-continuation`). It does not re-open OQ-3/OQ-5/OQ-6/OQ-8/OQ-9 (all
pre-existing, unchanged). It does not promote or source any of the 9 retained pool-depth
register items. The dashboard repository was not touched or searched in this lane.

## 9. Next step

**PK gate: authorise the read-view apply** (§1.4's four-step sequence) — the sole remaining
item to fully close WS-3. On authorisation, the orchestrator runs the sequence and records the
outcome in a follow-up result doc (`ws3-asset-gap-read-view-result-v1.md`, already named in the
packet).
