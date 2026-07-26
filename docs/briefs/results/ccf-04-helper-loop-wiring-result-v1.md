# CCF-04 Helper Loop — Wiring + Full Set Complete (Result v1)

**Lane:** CCF-04 Mechanical Assistants (S9 agent-quality stream) · **Date:** 2026-07-26 Sydney
**Status:** ✅ COMPLETE + PUSHED to `origin/main` (FF `3b9e4d8..a3bd7f2`, parity 0/0)
**Tier:** T2 (zero-authority local helpers / inform-only hook wiring; no production, DB, or deploy touch)
**Charter test met:** *"remove manual effort WITHOUT removing human judgment"* — every artifact is
zero-authority, inform/log-only; a PASS/clean/PROPOSED verdict **never clears a gate**, and every
specialist + PK gate runs unchanged above these helpers.

---

## 1 · The final checklist (what landed this arc)

| Commit | Type | What |
|---|---|---|
| `3536a7a` | fix | **source-truth-check** repaired — two independent defects that silently defeated the register-head signal at v6: (a) `parseRegisterHead` hardcoded `/\bv5\.(\d+)\b/` → now **generic-major + entry-header-anchored** (ignores foreign prose tokens like `v24.0`/`v6.70`); (b) `git()` had no `maxBuffer` → the >1 MB register overflowed Node's 1 MB default (`ENOBUFS`) → head read UNKNOWN. Raised to 64 MB. Live: reads `v6.27`. Tests 18→23. |
| `e3d4c34` | feat | **source-truth-check → SessionStart** via inform-only adapter `.claude/hooks/source-truth-session-hook.mjs`. Injects the "am I working from truth?" panel (fresh fetch + parsed head + ahead/behind/dirty/already-landed) every session. Complements `session-bootstrap` (fetch-free, so its parity can be stale — the digest-lag failure). **Confirmed firing LIVE on this session's resume.** |
| `3b94016` | feat | **claim-stub → PreToolUse `--log-only` guard** `.claude/hooks/claim-stub-register-guard.mjs`. Fires only when a `git commit` has a **register file staged** (ordinary commits pay nothing); surfaces scanned-highest + next-free + collisions. **Can never block** (no deny channel, statically tested). + owed test for the SessionStart adapter. |
| `809a32f` | docs | **CLAUDE.md "CCF-04 helper loop" checklist** — names which helper fires at which moment (additive, 30 ins / 0 del). |
| `a3bd7f2` | feat | **register-pointer template (#6)** `.claude/helpers/register-pointer.mjs` — the last CCF-04 helper. Propose-only / zero-write, pure composition (no git/network/fs-write, statically tested): composes the canonical Convention-1 pointer (sync_state block + action_list marker) from lane facts; enforces the ≤5-line budget (over→CONCERNS), the additive-only affirmation, and fail-closed INCOMPLETE with text withheld on any missing fact. 26 hermetic tests. |

**Test totals:** 267 helper/hook tests, 266 pass. The single failure is a **pre-existing** CRLF-sensitive
static assertion inside `claim-stub.test.mjs` (line ~389) — unrelated to this arc, flagged as a future
one-line fix. Every new suite passes; no sibling regressed.

## 2 · The full CCF-04 mechanical-assistant set (settled order, PK O-5)

1. **Source-Truth-Check** — built; **AUTO-FIRES at SessionStart** (this arc).
2. **Apply-Harness-Auditor** — built + registered SHADOW (prior).
3. **Hash-Checkpoint** — built + merged, helper-only (prior).
4. **Claim-Stub** — built + merged, helper-only; **AUTO-FIRES as a PreToolUse `--log-only` register-cut guard** (this arc).
5. **Review-Packet-Template** — built, frozen at PK Gate-2 (prior; ruling pending).
6. **Register-Pointer-Template** — **BUILT this arc** (helper-only per the #3/#4 precedent).

Two helpers now **auto-fire** as inform-only hooks; two (`hash-checkpoint`, `apply-harness-auditor`)
have no natural auto-trigger and are invoked by hand / as the shadow agent — documented in the CLAUDE.md
checklist (`809a32f`).

## 3 · Register pointer (composed by the #6 helper — dogfooded; HELD for the next cut)

The live registers were **not mutated** by this lane: another session's **v6.29** cut was staged in the
shared index throughout and left untouched. The pointer below was composed by `register-pointer.mjs`
itself. **The version `v6.30` is PROVISIONAL** — reassign at cut time via `claim-stub`, after the in-flight
v6.29 lands AND the stale v7.x frontier (§4) is reconciled.

**sync_state block:**

```
> **🧾 v6.30 — CCF-04 HELPER LOOP COMPLETE — full mechanical-assistant set built + two helpers auto-wired (all zero-authority, pushed)** — records: `docs/briefs/results/ccf-04-helper-loop-wiring-result-v1.md`.
> · **Verdict:** 5 commits pushed to origin/main (FF 3b9e4d8..a3bd7f2, parity 0/0); source-truth-check confirmed firing LIVE at SessionStart.
> · **Identity:** commits 3536a7a · e3d4c34 · 3b94016 · 809a32f · a3bd7f2.
> · **NEXT GATE:** helper-only (no charter/team-table); version PROVISIONAL — reassign at cut time (in-flight v6.29 + stale v7.x frontier).
>
```

**action_list marker:**

```
> Last updated: 2026-07-26 Sydney — **current marker v6.30 — CCF-04 HELPER LOOP COMPLETE — full mechanical-assistant set built + two helpers auto-wired (all zero-authority, pushed)** — records: `docs/briefs/results/ccf-04-helper-loop-wiring-result-v1.md`. NEXT GATE: helper-only (no charter/team-table); version PROVISIONAL — reassign at cut time (in-flight v6.29 + stale v7.x frontier).
```

## 4 · Findings surfaced (not resolved here — each a future pick)

- **✅ CORRECTED — the v7.x CLAIM stubs are NOT stale.** (Original v1 of this doc called them "stale"; that
  was wrong.) On the claim-stub guard's first live run the allocation frontier read **v7.8 / next-free v7.9**
  while the register head was v6.29. The two S8 result docs (`cc-0081-lever-applied-result-v1.md` `CLAIMED
  v7.08`, `cc-0081-mcp-github-bridge-reconciliation-result-v1.md` `CLAIMED v7.00`) are **PK-authorized
  reserved-block reservations** for the OPEN cc-0081 lane — `docs/00_sync_state.md` line 127 ("New lane
  cc-0081 OPENED in S8 (register block v7.00–v7.09)") + line 129 (the reserved-block scheme "…v6.70–79
  (cc-0078) / v6.90–99 (cc-0080) / v7.00–09 (cc-0081) all as-is"). **They must NOT be edited/removed.** The
  real issue is a claim-stub reliability gap: its ratified "highest-across-all-claims" model (correct for
  collision-avoidance) is not reserved-block-aware, so its raw proposal (v7.9) is above the sequential head
  rather than the normal sequential cut (register head v6.29 → v6.30). Addressed by an ADDITIVE advisory
  (claim-stub now surfaces the sequential head+1 alongside, and names the reserved-block situation — it does
  NOT auto-decide, per the charter). (This result doc carries NO `CLAIMED vX.Y` line-1 stub.)
- **Pre-existing `claim-stub.test.mjs` CRLF failure** — a static import-line assertion sensitive to autocrlf
  checkout line-endings; a one-line fix, not touched here.
- **Worktree hygiene** — 81 active worktrees; the merged `apply-harness-auditor-build` one is redundant
  (⚠ node_modules-junction hazard does not apply — it has none).

## 5 · Boundaries honoured

- Every commit was a **path-scoped `git commit --only -- <paths>`** — the other lane's staged v6.29 register
  cut (and expanding change set) was never included, unstaged, or disturbed.
- `branch-warden` verified the tree before the first commit (STOP correctly raised on the pre-polluted index;
  path-scoping was the resolution). Subsequent commits re-verified state with `git` directly (shared-worktree
  race: a concurrent commit `3b9e4d8` landed mid-operation and my work built cleanly on top of it).
- No DB, deploy, migration, EF, or production touch anywhere in this lane. External review not run
  (connector down — PK action item); acceptable for T2 zero-authority local helpers.
- **This lane is CODE/HELPER only — helpers #3/#4/#6 are helper-only (no charter/team-table/registration).**
  The register pointer in §3 is HELD; folding it into the next register cut is a separate step.

## 6 · source-truth-check two-file fix — focused record (PK "Current outcome complete")

The source-truth-check repair (`3536a7a`, the two files below) is on `origin/main`; PK declared it the
completed current outcome. Its focused, standalone register pointer — composed by the #6 helper
(`register-pointer.mjs`) — is recorded here, HELD for the next register cut (the arc pointer in §3
supersedes it in a single v6.30 cut; this narrower one exists per PK's per-outcome framing).

- **Files:** `.claude/helpers/source-truth-check.mjs` + `.claude/helpers/source-truth-check.test.mjs`.
- **Proof:** current register versions detected correctly at v6+ (generic-major, entry-header-anchored,
  foreign-token-rejecting); large-register reads no longer overflow (64 MB `git()` buffer vs the >1 MB
  register); **tests 23/23**; live `origin register head` reads correctly.

**sync_state block (HELD):**

```
> **🧾 v6.30 — source-truth-check REPAIRED + PROVEN (two-file fix) — register-head detection restored at v6+** — records: `docs/briefs/results/ccf-04-helper-loop-wiring-result-v1.md`.
> · **Verdict:** generic-major entry-header parse + 64MB git buffer; large-register reads no longer overflow; live head reads correctly; tests 23/23.
> · **Identity:** commit 3536a7a — .claude/helpers/source-truth-check.mjs + .test.mjs (pushed origin/main).
> · **NEXT GATE:** none — landed + pushed; version PROVISIONAL (fold into next register cut after v6.29).
>
```
