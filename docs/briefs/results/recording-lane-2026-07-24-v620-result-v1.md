# Result — Recording Lane pass 7, 2026-07-24: four production mutations recorded

**Status:** `FOUR APPLIED MUTATIONS RECORDED · ZERO PRODUCTION MUTATION BY THIS LANE · SIX AUTHORED ARTIFACTS DEFERRED UNREAD`
**Lane classification (CCF-02):** SAFETY_GATE · **T1** (docs/registers/artifacts — applies nothing)
**Date:** 2026-07-24 Sydney · **Executor:** S4 (Recording Lane)
**Register pointer:** **v6.20**
**Predecessors:** v6.14–v6.19 (`052a9ba`, pushed)

> **This pass exists so no production mutation is represented only in session prose.** Four mutations
> landed today; all four are now recorded with their verbatim proofs.

---

## 0. Stale-ref gate — PASS

`git fetch --prune origin`; `HEAD` = `origin/main` = `052a9ba3ec8f1b7251bfe8e0eb399a3e51a5fcb9`, parity 0/0.

## 1. Hash verification — every pinned artifact recomputed independently

**All matched.** Located by full-tree sha256 sweep, not by filename trust:

| Artifact | Pinned | Result |
|---|---|---|
| `results/cc-0081-lever-applied-result-v1.md` | `f9b24677…` | ✅ |
| `cc-0081-containment-window-runbook-v2.md` | `2226e389…` | ✅ |
| `cc-0081-lever-evidence-addendum-v1.md` | `80e4c180…` (retired pin) | ✅ |
| `results/cc-0054-deployed-result-v1.md` | `ddbeeaf2…` | ✅ |
| `results/cc-0073-window1-policy-result-v1.md` | `3e128269…` | ✅ |
| `cc-0073-manifest-A-policy-cfw-bestfit-v1.md` | `b00e87d9…` | ✅ |
| `results/cc-0073-window2-pilot-result-v1.md` | `05c55c32…` | ✅ |
| `cc-0073-manifest-B-pilot-v2.md` | `eb202701…` | ✅ |
| `cc-0073-manifest-C-invegent-promotion-v1.md` | `23904a03…` | ✅ |

**Independently verified extras:** the recovered bridge source `2b9b7c1d…` exists at
`_harness/cc0081_bridge_recovery_20260724/index.ts.v3.0.0.recovered` (**not committed** — see §5). The
pilot's byte-identity claim is **independently confirmed**: `60344e8f…` and `74f9fea4…` each appear at
**both** the pre-apply preview path and the post-apply live-render path, so the preview was an exact
prediction of live output.

**Two hashes named in the directive were not found in the tree:** the superseded manifest-A pin
`030256b8…` and the cc-0054 diff `652615aa…` (the latter is a diff hash, not a file — expected).

## 2. Mutation 1 — cc-0081 bridge lever, APPLIED

**⛔ Sanctioned wording, verbatim, never paraphrased:**

> **"outstanding renewal chains blocked for 3 credentials; access-token and static-secret exposure remains."**

**NOT revocation.** Already-issued access tokens are **not** invalidated · a new consent flow can
still mint credentials · **L3 is not closed** · **L2 remains open even after the full three-part patch
lands.**

**Why the window existed** — the sentence that justifies the lane: `mcp_gh_6e4ec94e…` was issued
**2026-05-04** against the bridge's **v2.0.0 READ-ONLY** build and **silently acquired GitHub WRITE
authority over three repositories when v3.0.0 deployed 2026-05-14** — tokens are not version-scoped,
and **nobody re-consented**.

Applied: one UPDATE, one column, three rows. Targets now `8a55be9e` / `d4d0aacf` / `d383138d`; the live
review connector `mcp_a73a5315…` unchanged at `db261915`. **Neutrality 14** — corrected from a 7 that
conflated the ever-used subset with all non-github rows (§7). Whole table 30/16/14/3; per-row
fingerprint diff **3 changed / 27 identical**. Carried and now live: the shared table means those three
client_ids also fail at the ChatGPT bridge's `/token` — intended, and the same shared-table defect
class as L3.

## 3. Mutation 2 — dashboard cc-0054, DEPLOYED · containment 7/7

Commit `524ca6d`, diff `652615aa…`, review `8d0510ca…` (escalation PK-cleared). **Deployed SHA verified
from Vercel:** `dpl_DkYuG4vHSsaoGggvREx2aRkjmGXp`, `githubCommitSha 524ca6d`, READY, alias
`dashboard.invegent.com` live.

**PK completed the post-deploy positive-path check — verbatim:** `/client-profile` rendered real brand
data for Property Pulse · `/monitor` live diagnostics (60 stuck, 51 past-due) · `/feeds` 68 active / 56
healthy · `/visuals` render stats + log table. **No 500s, blanks, not-founds or stuck spinners.**
**That closes the one gap S1 could not** — S1 declined to enter credentials to manufacture the proof,
which was the correct call.

**What 7/7 does NOT mean, verbatim from S1:** authorization still does not exist · every authenticated
account remains operator-equivalent · enforcement is off · `exec_sql` is unremediated. **The Vercel-log
gate is CLOSED (structurally unavailable), not an open carry.**

## 4. Mutations 3 & 4 — CFW policy (Window 1) and CFW pilot (Window 2), APPLIED

**Window 1 — policy, APPLIED and INERT.** Two-sided proof: `shared_bg_rejections` **0 → 8** on
fb/ig/li **while** `bg` and `scrim` stayed byte-identical. Either half alone would not have been a
pass. Policy row verified live: CFW `best_fit` / `allow_global_shared=true`; **Invegent's row untouched**
at `2026-07-20T08:57:02`. Applied by direct `execute_sql` DML — **no migration version minted.**

**Window 2 — pilot, APPLIED.** One row (S3 soft grey bokeh → CFW-only allowlist). P1 pool exactly 2 ·
**P2 measured 20/20 over 40 seeds = 50.0%** · P3 brand-navy reachable · **P4 the meaningful test —
Invegent's shared loop runs, evaluates S3, and correctly rejects it `not_in_allowlist`** · P5 live
renders driven by the resolver's own emitted values · live output **byte-identical** to the approved
preview.

**PK visual gate, verbatim:**

> **"CFW pilot PASS — headline is fully legible, the bokeh is sector-neutral and appropriately warm,
> and the yellow support tag, icon and footer keep it recognisably Care For Welfare."**

**⚠ P6 status, recorded precisely.** The verdict above is the **pre-apply** visual gate (the result doc
places it so). For **P6 — acceptance of the live post-apply output — PK has reviewed and raised
nothing.** The lane is recorded as **pilot-applied with PK visual acceptance**. **cc-0073 is NOT
recorded as fully closed**: expansion beyond S3 remains a fresh gate, and the result doc's own P6 calls
live acceptance "the deciding act", so "reviewed and raised nothing" is recorded as what it is rather
than upgraded to a verbatim live-output verdict.

**Standing expectation, so the pilot is not judged on the wrong metric:** at N=2 the chance two
consecutive CFW posts share a background is **50%** — selection is memoryless. **That is correct
behaviour, not pilot failure.**

## 5. Authored, NOT applied — recorded

**Invegent Manifest C** (`23904a03…`) — **NOT applied**, no window open. PK per-candidate verdicts,
verbatim: **S2 yes · S3 yes · S6 yes** *("provides the best B2B technology signal")* · **S1 no**
*("clean but too generic")* · **S4 no** *("pale diagonal competes with the headline")*. **S5's
distinction, preserved:** S3 is an **allowlist widening**, not a fence flip, so **its rollback must
restore `{CFW}`, not `{}`** — reverting to empty would silently un-promote the CFW pilot, which this
manifest never promoted and has no authority to undo.

**The recovered bridge source** (`2b9b7c1d…`, `_harness/cc0081_bridge_recovery_20260724/`) is **NOT
committed.** The standing provenance record's reasoning holds: a byte-exact transcription whose
fidelity cannot be independently proven should not be recorded as canonical. The cc-0081 result names
the recovery commit as a **separate future step that must precede any deploy** and must stay separate
from the remediation commit.

## 6. 🔴 Six artifacts DEFERRED — hash-verified but NOT read, therefore NOT committed

This lane does not commit a document it has not read. Six remained unread when context ran short.
**All are named and hash-verified; none is lost:**

| Artifact | Hash | State |
|---|---|---|
| `NOT_APPLIED_cc0080_reconcile_publish_status_v3.sql` | `713ab4ae…` | authored, NOT applied |
| `cc-0080-reconciler-gate1-proof-and-apply-packet-v6.md` | `547733ac…` | authored, NOT applied |
| `cc-0079-slice-2-apply-packet-v2.md` | `73dd7413…` | authored, NOT applied |
| `cc-0079-slice-2-external-review-record-v1.md` | `0494f77e…` | **read**, deferred to travel with its packet |
| `cc-0063-step-b-resolver-consumes-designation-design-v1.md` | `2bfd7b3a…` | design, NOT built |
| `cc-0078-s1b-format-chain-repair-design-v1.md` | `ab218678…` | design, NOT built |
| `dashboard-redesign-gap-analysis-brief-v1.md` | `3beb67e7…` | parked |

**The Slice 2 review record was read but deliberately held back** so it lands atomically with the
packet whose hash it pins — committing a review record without its reviewed artifact would create the
dangling-reference defect this lane has flagged before.

**Recorded from the directive without committing the artifacts:** **cc-0080 v3** — `d227fefc…` is a
**DEAD PIN**; the prior delta review and S9's verification are **VOID, as authorised**; two surfaces
only (slot 752 / draft 315), queue machinery removed with the future contract recorded, SERIALIZABLE
machine-enforced; **awaiting focused delta re-review + rehearsal by an independent executor.**
**Slice 2** — external review **clean on the first pass** (`f46949d3…`), **NOT applied**, queued next.
**S3 designs** — `:92` repair approved in-scope with Step B; **C-2 remains open — second-avatar
prevention is a governance control, not a database one.**

## 7. Two upstream errors — recorded as process evidence

Both were **caught by the executing hand, not by the author and not by the orchestrator**:

1. **The neutrality miscount (7 → 14)** — it originated in the packet, propagated through the
   orchestrator's own directive carrying its authority, and was caught at **A2 preflight, before any
   mutation**. The correction was ruled clerical **only on condition of a delta verification proving
   the executable blocks byte-identical** — and that proof was produced: the gating and both mutating
   blocks hash-match v1 exactly; **the A4 verification block was the sole change.**
2. **S5's false-PASS predicate** — the original A5 check counted 7 CFW **logo** rejections that exist
   regardless of any policy row, so it **would have "passed" whether or not the shared loop ever ran.**
   S5 caught it pre-apply and corrected it to discriminate on `slot='Background'` +
   `asset_key LIKE 'Shared/Backgrounds/%'`.

**Neither error was caught by review.** That is the finding worth keeping.

## 8. ⚠ Register-number conflict — flagged, not silently resolved

**v6.20 was directed as "sequential, NOT a reserved block."** It is sequential after v6.19. **But the
canonical ID ledger reserves v6.20–v6.29 to S1** (`orchestrator-control-packet-v1.md` §3), and every
prior pass of this lane explicitly recorded "v6.20 not taken" as reserved-block discipline.

**This entry uses v6.20 as directed** — the registrar owns allocation. It is recorded here so a future
reader sees the convention was **changed by ruling, not violated silently**, and so S1's block is
understood to now start at v6.21.

## 9. What this lane changed

**Committed (10 read + hash-verified artifacts, + this result, + 2 registers):** the four applied
result docs · cc-0081 runbook v2 + evidence addendum · cc-0073 manifests A, B, C · (Slice 2 review
record deferred, §6).

**NOT committed:** the six deferred artifacts (§6) · the recovered bridge source (§5) · `cc-0050-*`
(VOID) · the `.xlsx` · everything else untracked.

**Production mutations by this lane: 0.** All four mutations recorded here were their owners', at their
own PK-opened windows. `branch-warden` ran before commit; origin parity re-verified immediately before.

## 10. Next gate

> **A follow-up recording pass for the six deferred artifacts** (§6) — they are hash-pinned and stable.
> **cc-0073:** pilot-applied with PK visual acceptance; **expansion beyond S3 is a fresh gate.**
> **cc-0080 v3:** focused delta re-review + independent-executor rehearsal, then a PK apply gate.
> **Slice 2:** awaiting "S7 GO — Slice 2 window open."
> **cc-0081:** patch A/B/C designed not built; **the recovery commit must land before any deploy and
> stay separate from the remediation commit.**
> **cc-0063:** APPLIED, still HELD OPEN for the natural live-submit proof.

**Push remains a PK hard stop.**
