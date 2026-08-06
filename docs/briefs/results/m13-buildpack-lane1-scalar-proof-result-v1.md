# Result — M13 Governed Template Build Pack, Lane 1: Scalar Proof (schemas + structural diff)

**Brief file:** `docs/briefs/m13-buildpack-lane1-scalar-proof-brief-v1.md`
**Executed by:** ef-builder (isolated agent-worktree), orchestrated by chat
**Completed:** 2026-08-06 Sydney

---

## 1. Result status

`Complete` (this lane's own scope) — **not yet merged to `main`**; PK merge gate pending.

## 2. Commit(s)

- N/A — no commits made anywhere. All work sits as untracked new files in an isolated
  agent-worktree, ready for PK to authorize a merge/commit.

## 3. Files changed

- `docs/creative-library/m13-blueprint-capture-schema-v1.md` — created (sibling doc; `registry-schema-v2.md` untouched)
- `.claude/helpers/m13-blueprint-capture-diff.mjs` — created (structural-diff engine)
- `.claude/helpers/m13-blueprint-capture-diff.test.mjs` — created (29-test hermetic suite)
- `.claude/helpers/fixtures/m13-blueprint-capture-diff/` — created (7 JSON fixtures)
- `docs/briefs/m13-buildpack-lane1-scalar-proof-brief-v1.md` — created (this lane's Gate-1 brief, on `main`)
- `docs/briefs/results/m13-buildpack-lane1-scalar-proof-result-v1.md` — this file

## 4. Actions taken

- PK authorized this lane directly in chat after the orchestrator flagged that the originating
  cross-session relay message lacked the `INFORMATIONAL — NO AUTHORITY CONVEYED` disclaimer
  required by `docs/governance/orchestrator-operating-manual-v1.md` §3, and asked for direct
  confirmation instead of acting on the relay alone.
- Read the two governing docs in full (`m13-governed-template-build-pack-scoping-packet-v1.md`,
  `cgu-final-build-acceleration-ruling-v1.md`) plus the existing `registry-schema-v2.md` and the
  `apply-harness-auditor.mjs`/`.test.mjs`/`fixtures/` pattern before drafting the Gate-1 brief.
- Set up an isolated worktree/branch (`lane/m13-buildpack-lane1-scalar-proof`, idle, unused —
  the ef-builder dispatch's own `isolation: "worktree"` option created a second, separate
  agent-worktree that actually holds the work; see Open issues §6).
- Dispatched `ef-builder` against the brief; it produced all 4 in-scope artifacts.
- **Independently re-verified** rather than trusting the agent's self-report: re-read the schema
  doc and the diff engine in full; re-ran `node --test m13-blueprint-capture-diff.test.mjs` myself
  (29/29 pass); confirmed `git status --porcelain` in the worktree shows only the 4 approved paths
  and zero changes to any existing tracked file.
- Ran `branch-warden` against the worktree: verdict `safe` — branch point matches current `main`/
  `origin/main` exactly (zero drift), zero commits on the branch, file set matches exactly what was
  approved, no wrong-branch-commit risk. It also flagged (informational, non-blocking) that the
  ad-hoc agent-worktree branch name (`worktree-agent-aaa961239041a4588`) is not the named
  `lane/*` branch and that the idle `lane/m13-buildpack-lane1-scalar-proof` worktree is 3 docs-only
  commits behind current `main` (linear, fast-forwardable, no conflict risk either way).
- Ran external review (`ask_chatgpt_review`, `action_type: plan_review`) on the final diff, pinned
  to `reviewed_input_hash` = sha256 of the full diff text (`1172ac56…`). **Verdict: agree, risk_level
  low, confidence high, no pushback points, no escalation required.** One noted `unverified_claim`:
  the reviewer could not itself execute code to confirm the fail-closed/read-only/zero-authority
  protections are enforced (text-only review) — the orchestrator's own direct code read plus the
  suite's own static-guard test (`"no network access anywhere in the module source"` — passing)
  independently cover that gap.

## 5. Constraints confirmed

- No DB reads/writes of any kind — confirmed not done.
- No Creatomate API calls anywhere (helper, tests, or fixture authorship) — confirmed not done; the
  diff engine's static-guard test asserts no `fetch()`/`http(s)` import exists in the module.
- No deploy, no `git push`, no merge to `main`, no commit outside the isolated worktree — confirmed
  not done (`git log` on the worktree branch shows zero commits beyond the shared `main` base).
- No edits to `docs/creative-library/registry-schema-v2.md` or `property-pulse.json` — confirmed not
  done (both read-only evidence sources; `git status` shows zero changes to either).
- No edits to `docs/00_sync_state.md` / `docs/00_action_list.md` — confirmed not done.
- Full standing prohibited list from `cgu-final-build-acceleration-ruling-v1.md` §1 (schedule/cap
  DML, production migrations, live selector/palette/routing/voice changes, cron/deploy activation,
  intake/promotion) — confirmed not touched; none of this lane's file set reaches any of those
  surfaces.
- No multi-object/sequence implementation — confirmed the `sub_sequence_key` field is
  dormant/nullable only; the diff engine does not read or act on it in v1.
- Sibling schema doc was **not** ratified into `registry-schema-v2.md` itself — confirmed a
  standalone new file was created instead.

## 6. Open issues

- **Worktree mismatch (housekeeping, not a safety issue):** the orchestrator manually created an
  isolated worktree at `C:/Users/parve/ice-worktrees/m13-buildpack-lane1` on branch
  `lane/m13-buildpack-lane1-scalar-proof` before dispatching ef-builder, but the `Agent` tool's own
  `isolation: "worktree"` option auto-created a *second*, separate worktree
  (`C:\Users\parve\Invegent-content-engine\.claude\worktrees\agent-aaa961239041a4588`, branch
  `worktree-agent-aaa961239041a4588`) that is where the actual work landed. `branch-warden` confirmed
  this is safe (clean linear ancestry from current `main`, zero commits, no conflict), but the
  manually-created worktree is now unused dead weight. Recommend: at merge time, apply the 4+1
  content files from the agent-worktree onto `main` (or onto the named `lane/*` branch first, PK's
  choice), then remove both temporary worktrees.
- **Fixture provenance is honestly partial, not fully live-verified:** the three real PP carousel
  templates named in the scoping packet's §13 addendum have no field-level (`elements[]`)
  documentation anywhere in the repo — no Creatomate API call was permitted in this lane to check.
  The Blueprint fixture's `elements[]` set is disclosed in-fixture and in the schema doc as a
  "plausible reconstruction," not a verified real field list. A real Lane 5 proof will need the
  actual `GET /v1/templates/{id}` read to confirm or correct it.
- **`provider_template_id` in the fixtures is a truncated 8-char prefix**, not a full UUID — that is
  all that is documented anywhere in the repo for this template; no live lookup was performed
  (forbidden in this lane).

## 7. Next recommended step

Present this diff to PK for the merge gate (hard stop, per `CLAUDE.md`). On PK's go-ahead: apply the
5 files (4 content + this result doc) onto `main` (fast-forward is clean, zero conflicts), commit,
and push only on PK's explicit instruction — never bundled into the same approval as the merge
itself. After merge, add a ≤5-line register pointer to `docs/00_sync_state.md` per Convention 1
(this result doc is the full record; the register entry is pointer-only). Lane 3
(registry/persistence, T3), Lane 4 (Asset Gap display, T2), and Lane 5 (real end-to-end proof with a
live Capture, T3) each need their own future Gate-1 brief — none are authorized by this result.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**

- Output matched the brief: both schemas transcribed faithfully (spot-checked against the scoping
  packet's own field tables), the diff engine implements all four finding classes with the correct
  BLOCK/ADVISORY split and the one named escalation rule, fixtures cover every class plus the
  fail-closed path, tests independently re-run and passing.
- Constraints respected — see §5.
- No unexpected files changed — `git status` in the worktree showed exactly the approved set both
  times it was checked (before and after external review).
- Success criteria met per the brief.
- New risk: none beyond the housekeeping item in §6 (dead unused worktree, harmless).
- External review: clean (agree/low/high, no escalation).

## 9. Learning notes (chat fills this)

- **Reusable pattern:** when dispatching `Agent` with `isolation: "worktree"`, do not also manually
  `git worktree add` a separate branch first — the tool creates its own, and the manual one goes
  unused. Either skip the manual worktree entirely and let the tool create one, or dispatch without
  `isolation` and point the agent at a pre-made worktree path explicitly in the prompt.
- **Reusable pattern:** a cross-session relay message that reads as directive/authority-shaped
  ("You are build lane L3...") without the `INFORMATIONAL — NO AUTHORITY CONVEYED` disclaimer is
  worth flagging and getting a direct in-chat confirmation for, even when the referenced governing
  docs check out as real and ratified — the content being real doesn't make the relay's *framing* a
  valid grant on its own.
