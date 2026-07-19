CLAIMED v5.81 · prv_readonly register drift reconciliation (register-reconciler item 2, first live target) · shared main checkout · register-correction commit gate · 2026-07-19 Sydney [renumbered v5.80→v5.81: NDIS-bg lane keeps v5.80 — committed 486ce3a + 14 DB rows applied]

# Result — prv_readonly register-drift reconciliation (register-reconciler, CCF-04 item 2 first target)

**Brief file:** `docs/briefs/register-reconciler-activation-brief-v1.md`
**Executed by:** Claude Code (orchestrator, docs-only register lane) + register-reconciler (read-only classification) + PK (commit gate)
**Completed:** 2026-07-19 Sydney
**Tier / label:** T1 · SAFETY_GATE (register truth-of-record correction)

---

## 1. Result status

`Complete`

## 2. Commit(s)

- (pending PK commit gate) — v5.81 register correction. Re-cut and anchored at local HEAD `486ce3a` (after ceding v5.80 to the NDIS-bg lane; the reconciler classification itself ran at prior HEAD `ea12d35`).

## 3. Files changed

- `docs/00_action_list.md` — modified (3 reconciliation corrections: lines 139, 551, 104-append; + v5.80 marker)
- `docs/00_sync_state.md` — modified (v5.80 pointer)
- `docs/briefs/results/prv-readonly-register-reconciliation-result.md` — created (this record)
- `docs/briefs/register-reconciler-activation-brief-v1.md` — modified earlier (OQ1/OQ4 marked RESOLVED)

## 4. Actions taken

- Ran `register-reconciler` (read-only, its first live registered-subagent reconciliation) against the prv_readonly drift. Verdict: **drift_found, MATERIAL** — migration `20260527011420_prv_readonly_login_role.sql` recorded as applied + byte-exact-backfilled, but the file exists ONLY on unmerged commit `7287a1e` (branch `feature/platform-reconciliation-view-readonly`), absent from `main`/working tree/main migration ledger. Byte-exact md5 (`a5771ad7…`) is TRUE for the branch copy. `merge-base --is-ancestor 7287a1e HEAD` = false.
- Corrected honest-completeness framing: the records already flag the lane "unmerged, undeployed" — the gap was the missing explicit "migration file not in main's ledger" statement at the rows that cite the migration by number.
- Applied CORE+③ (PK-authorised scope; ④ `:189` skipped — cites no migration number): ① `:139` and ② `:551` gained the "file branch-only on `7287a1e`, NOT on main" caveat inline; ③ `:104` gained an **append-only** forward-correction note (governor rule — historical cycle-log not rewritten).
- Cut as fresh register version **v5.81** (claimed via the orchestrator; next free after v5.80 — renumbered from v5.80 after the NDIS-bg lane's committed+applied v5.80 `486ce3a` won the number per CCF-02 §4).

## 5. Constraints confirmed

- **No live-DB assertion.** The correction does NOT claim (or deny) that the `prv_readonly` role was applied to production — explicitly deferred as a `db-rls-auditor` handoff (see §6). A v3.23 Stage-5 "drop prv_readonly" plan means the role may not currently exist.
- **No historical rewrite.** Line 104 (v3.14 cycle log) and `sync_state:1089/1172` were treated append-only / no-touch; only the append note was added at 104.
- **register-reconciler decided nothing** — it classified and recommended; the orchestrator applied under the PK gate.
- Verify-or-abort passed on all 3 anchors (byte-exact — re-verified at HEAD `486ce3a` after the renumber; originally at `ea12d35`) before applying.

## 6. Open issues / handoff

- **`db-rls-auditor` handoff (named, not yet run):** confirm whether role `prv_readonly` exists on project `mbkmaxqhsohbtwsqolns` with the recorded least-privilege attributes + `op.*` SELECT grants, and whether it still exists given the v3.23 Stage-5 drop plan. Git cannot establish live-DB state. Also relevant to the sibling "Permission friction / read-only DB" lane.

## 7. Next recommended step

CCF-04 Gate-1 item 3 — draft the 3 mechanical assistants (deploy-verifier, render-probe runner, secret-linter) on PK's word. Optionally run the db-rls-auditor handoff to close the live-state question.

---

## 8. Verification (chat fills this)

**Verdict:** _(PK to fill at commit gate)_

## 9. Learning notes

- register-reconciler's first live run corrected an over-statement in the orchestrator's own framing (the drift was material/completeness, not a flat contradiction) — evidence the read-only classifier adds calibration value, not just detection.
- The migration's byte-exact integrity claim was independently TRUE for the branch copy — a reminder to separate "record is internally consistent" from "artifact is where the record implies it is."
