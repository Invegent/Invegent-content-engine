CLAIMED v5.86 · deploy-verifier build+merge lane · session TMR (agents-only) · worktree agent-a361c3de58f45da47 (agent merged to main a52e788) · gate: PK commit gate (register pointer + CLAUDE.md note) · claimed 2026-07-19 ~13:52 Sydney (03:52Z), renumbered v5.84→v5.86 after a two-way claim collision (NDIS Phase-1 lane took v5.84 then v5.85; deploy-verifier yielded per PK) · re-cut base head 89d4d11 · re-verify at commit

# Result — deploy-verifier build lane (v5.86): the Deployment Governor, realized (candidate)

**Brief file:** `docs/briefs/deploy-verifier-build-lane-gate1-brief-v1.md` (PK-approved Gate 1)
**Executed by:** Claude Code (orchestrator) + ef-builder + branch-warden + external review + PK (merge + push gates)
**Completed:** 2026-07-19 Sydney — **build + merge + push done; candidate, advisory-only, NOT live-trusted (§9 backtest pending)**
**Lane:** CCF-04 item 3, assistant #1 (highest value-per-effort) · **T2 · SIDE_PROVING** · single-concern (agents only)

---

## 1. Result status

`Complete` — for the **build → merge → push** of the agent definition. The agent is admitted as a **read-only advisory candidate**; it is **NOT live-trusted** — the §9 backtest (§7 below) is a separate future PK gate before any live deploy lane may trust its classification.

## 2. Commit(s)

- `a52e788` — `feat(agents): add deploy-verifier read-only advisory Deployment Governor (CCF-04 item 3, candidate)` — pushed to origin/main (`adbc8a6..a52e788`, parity 0/0).

## 3. Files changed

- `.claude/agents/deploy-verifier.md` — **created** (203 lines; blob `3e80c4b`; content sha256 `4dd4fb5bc296f5b79b7162ac3bce2f27816b1ad519ba4df20a256fdb11fa6cb1`). Sole file in the change set.

## 4. Actions taken

- **Gate 1:** PK approved `deploy-verifier-build-lane-gate1-brief-v1.md` (build via ef-builder in an isolated worktree; advisory-only).
- **ef-builder (isolated worktree `agent-a361c3de58f45da47` @ base `d627a8c`):** authored `.claude/agents/deploy-verifier.md`, LOCAL-ONLY, no commit/merge/deploy/push. Realizes the **Deployment Governor** named-but-unbuilt in `docs/governance/governor-architecture.md` §3/§10.
- **Contract encoded:** read-only Governor (stateless · idempotent · never-decides · recompute-from-ground-truth, never validate against the plan's *claimed* values). Four PASS/MISMATCH checks, each carrying `{expected, observed, delta, why_it_matters}`: (1) marker+version present in the DEPLOYED bundle via `get_edge_function` — the **bundles-from-CWD "old code shipped" guard**, must name which source it read (a PASS that cannot name its source is not a PASS); (2) deployed VERSION/index == repo; (3) `verify_jwt` == expected (401→502 guard); (4) drift class B-FD vs stale A-LE — READS/flags only, never runs the `drift-check?write=true` refresh. `overall=MISMATCH` if any check MISMATCH; unreadable ground truth → MISMATCH, never a guessed PASS; unsure → prefer MISMATCH (a false-PASS on a bad deploy is the trust-killer).
- **branch-warden (worktree):** verdict **concerns-but-clean** — branch/HEAD/file-set/isolation all exact (own branch, base `d627a8c`, sole untracked `.claude/agents/deploy-verifier.md`, blob `3e80c4b`, zero register-churn leakage). Sole concern = a merge-gate note (origin/main had advanced 2 commits; additive-file merge to be re-verified conflict-free) — resolved at the merge (disjoint path, clean).
- **External review (T2, pinned to hash `4dd4fb5b…`):** `ask_chatgpt_review` → **agree / medium / high → proceed**, `review_id 9f7ad065-c283-4e33-b011-81b871dec5b0`, zero pushback, no escalation. Reviewed the read-only guarantee, the four-check coverage, and the false-PASS-prevention posture.
- **PK merge gate (Convention-2 conditional approval — merge after the register recovery settles):** verified the register recovery settled (parity 0/0, no in-progress op, prv_readonly v5.81/v5.82 landed+pushed), re-verified pinned preconditions (artifact hash `4dd4fb5b…` unchanged · HEAD `adbc8a6` no race · target path absent · staged set = exactly one file), landed the byte-identical file on main, committed `a52e788` (blob `3e80c4b` == reviewed worktree blob).
- **PK push gate:** fetch → clean fast-forward (origin ahead 0, sole local-ahead commit `a52e788`) → `git push origin main` → `adbc8a6..a52e788`, parity 0/0, origin tip `a52e788`.

## 5. Constraints confirmed (Gate-1 Forbidden items — confirmed not done)

- **Tool profile is read-only-only** — `Read, Grep, Glob, Bash, mcp__supabase__get_edge_function, mcp__supabase__list_edge_functions, mcp__supabase__get_advisors`. **No** Edit/Write/commit/merge/push/`apply_migration`/`deploy_edge_function`/`execute_sql` — verified absent in frontmatter.
- **No authority conveyed** — the agent never deploys, redeploys, edits repo/EF/DB, runs the drift write-refresh, approves/marks-proven, or issues a proceed/abort decision. Deploy stays the PK hard stop; the agent runs *after* a PK-run deploy to confirm.
- **Advisory-only kept** (PK instruction) — MISMATCH is a human STOP signal, not an executed abort.
- **§9 backtest NOT run** — the agent is a candidate; it is not treated as proven and is intentionally kept OUT of the CLAUDE.md team table.
- **Single-concern** — agents only; no NDIS bg / image-promotion work in this lane.
- **Byte-exactness** — landed blob `3e80c4b` is byte-identical to the branch-warden'd + externally-reviewed worktree artifact; no drift between review and merge.

## 6. Open issues

- **§9 backtest pending** — the classifier is unproven against real deploy history until it passes (§7). Until then, advisory candidate only.
- **Not in the CLAUDE.md team table** — deliberately, mirroring the `dashboard-ia-lint` posture (built + committed as a candidate, not listed until proven). The draft candidate note (below) is held for the PK commit gate.
- **Remaining CCF-04 item-3 assistants (render-probe runner, secret-linter) are NOT built** — held pending the PK decision on the render-probe controlled-mutation-vs-strictly-read-only question (surfaced to PK by the orchestrator).
- **Parked worktree `agent-a361c3de58f45da47`** — safe to clean up when convenient (left intact for now).

## 7. Next recommended step — §9 read-only backtest plan (for a PK gate)

Prove the PASS/MISMATCH classifier against **past real ICE deploys**, read-only (recompute-and-compare; **no deploy, no write, no drift-refresh**). Mandatory replay cases (governor-architecture §9):

1. **Wrong-source case** (v5.66/v5.67 shape — a deploy run from the wrong checkout, deployed bundle missing the new marker) → must classify **`MISMATCH`** on check 1, naming the deployed source it read.
2. **Known-good deploy** (v5.73 shape — image-worker v3.30.0: VERSION==repo, drift clean, `verify_jwt=false`) → must classify **PASS** on all checks with **zero false-MISMATCH** (the trust-killer).
3. **Stale-`A-LE` helper-only case** (a helper-only fix whose `index.ts` hash is unchanged) → must report the drift class **correctly** (`A-LE` + `write_refresh_needed: true`), NOT a false PASS and NOT a false MISMATCH on the deploy itself.

**Pass criteria:** 100% correct class on the mandatory cases; **zero false-MISMATCH on the known-good case**; every output carries a why-it-matters reason and a named `source_read`. Results presented at a PK gate; a pass promotes only the *classifier's* trust — never any authority to deploy/refresh/decide. Same proof-lane discipline that proved `branch-warden` and `ef-builder`.

---

## HOLD FOR PK COMMIT GATE — draft register pointer (Convention 1) + CLAUDE.md candidate note (NOT yet applied)

> These are **drafts only**. The registers (`00_sync_state.md` / `00_action_list.md`) and `CLAUDE.md` are **unedited**; applying them is the orchestrator's surgical docs-lane edit under the PK commit gate, with the v5.86 number re-verified against live head at commit.

### Draft — `docs/00_sync_state.md` pointer (new top entry after the `---`)

> **✅ v5.86 — deploy-verifier (Deployment Governor) BUILT + MERGED + PUSHED as a read-only ADVISORY candidate (CCF-04 item 3 #1; T2 · SIDE_PROVING)** — record: `docs/briefs/results/deploy-verifier-build-lane-result-v1.md`.
> · Read-only post-deploy verification Governor (governor-architecture §3/§10): recomputes live deploy state, classifies PASS/MISMATCH on marker-in-deployed-bundle (bundles-from-CWD "old code shipped" guard, names its source) · VERSION==repo · `verify_jwt` (401→502 guard) · drift class (A-LE/B-FD, READ/flag only). Chain: Gate-1 brief → ef-builder isolated worktree → branch-warden concerns-but-clean → external `9f7ad065` agree/med/high (hash `4dd4fb5b…`) → PK merge → PK push. Commit `a52e788`, file `.claude/agents/deploy-verifier.md` (blob `3e80c4b`), byte-identical to the reviewed artifact. **Advisory-only, NOT live-trusted; OUT of the CLAUDE.md team table** (dashboard-ia-lint posture) until its **§9 read-only backtest** passes at a PK gate. Remaining item-3 assistants (render-probe, secret-linter) held on a PK decision. Next: §9 backtest.

### Draft — `docs/00_action_list.md` marker (top-line update, same content compressed)

> current marker **v5.86 — deploy-verifier read-only advisory Deployment Governor BUILT+MERGED+PUSHED (candidate; CCF-04 item 3 #1; T2·SIDE_PROVING)** — commit `a52e788`, `.claude/agents/deploy-verifier.md` (blob `3e80c4b`, reviewed hash `4dd4fb5b…`); chain ef-builder→branch-warden(concerns-but-clean)→external `9f7ad065` agree/med/high→PK merge→PK push; advisory-only, NOT live-trusted, OUT of team table until §9 backtest passes; render-probe/secret-linter held on PK decision; result `docs/briefs/results/deploy-verifier-build-lane-result-v1.md`.

### Draft — `CLAUDE.md` candidate note (to sit alongside the `dashboard-ia-lint` candidate paragraph, NOT in the team table)

> `deploy-verifier` is built and committed (`a52e788`) as a read-only **candidate** — a post-deploy verification **Deployment Governor** (`Read`/`Grep`/`Glob`/read-only `Bash`/`get_edge_function`/`list_edge_functions`/`get_advisors`; PASS/MISMATCH). It recomputes live deploy state and classifies marker-in-deployed-bundle (the bundles-from-CWD guard) · VERSION==repo · `verify_jwt` · drift class; advisory only, never deploys/refreshes/decides. **Not yet proven** — it stays a candidate (and intentionally out of the team table above) until its `governor-architecture.md` §9 read-only backtest passes at a PK gate, the same discipline that proved `branch-warden`/`ef-builder`.

## 8. Verification (chat fills this)

**Verdict:** _pending PK — build/merge/push verified clean; §9 backtest and the register/CLAUDE.md commit gate are the remaining PK acts._

## 9. Learning notes

- The Convention-2 conditional merge approval ("merge after the register recovery settles") worked cleanly: the settle condition was objectively verifiable from git (parity 0/0, no in-progress op, the dependency commits landed), and the pinned STOP conditions (hash · HEAD-race · file-set · path-absence) all held.
- Landing a single reviewed additive file by byte-copy + hash-assert (== `4dd4fb5b…`) onto main is a clean, fully-auditable alternative to cross-worktree git merge for an uncommitted new file — the committed blob (`3e80c4b`) provably equals the reviewed worktree blob.
