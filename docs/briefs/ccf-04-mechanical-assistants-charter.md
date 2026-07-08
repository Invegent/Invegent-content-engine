# CCF-04 — Mechanical Assistants (charter)

**Recorded:** 2026-07-08 Sydney · **Tier:** T1 · **Label:** SAFETY_GATE (docs/governance charter record)
**Status:** CHARTER RECORDED — phase framing only. **No lane built.** CCF-04 opens only when PK approves a lane at Gate 1.
**Cut in an isolated worktree off origin/main (register head v5.32) — R4: local main held another session's unpushed commit, untouched.**

---

## Identity (PK, 2026-07-08)

> **CCF is not an AI engineer. It is the engineering operating system.**
> ICE builds products; CCF builds the environment ICE engineers work in.

## The scope-boundary test (every candidate must pass it)

> **"Can we remove manual effort WITHOUT removing human judgment?"**
> — yes → CCF-04 candidate. no → rejected.

This single question is the admission gate for every Mechanical Assistant. It draws the line CCF-03 proved matters: mechanise the *toil* of the proven substrate; never its *judgment*.

## Lineage

CCF-04 is the direct **carry of CCF-02 Phase 3** (the four zero-authority helpers, none built —
`docs/briefs/ccf-02-phase3-synthesis-packet.md` §3), **re-prioritised by CCF-03's RETIRE
verdict** (`docs/briefs/results/ccf-03-phase0-closeout-result.md`): the substrate — CCF-02
claim protocol + R4 + register discipline — is what actually does the coordination, so CCF-04
adds **no roles and no judgment**, only tools that remove repetitive work.

**The CCF arc:**

| Phase | Purpose | Result |
|---|---|---|
| CCF-01 | Protect the engineer | ✅ Complete (log-only guards) |
| CCF-02 | Standardise how engineering is done | ✅ Complete (contract LIVING) |
| CCF-03 | Test whether more coordination is needed | ✅ Retired (negative result, valuable) |
| CCF-04 | Remove mechanical toil from the proven process | 🟡 Charter recorded; no lane built |

## Build discipline

One assistant at a time · ~a day each · independently proven (T2 code lane: ef-builder →
branch-warden → external review pinned to hash → PK gate) · each exists **only** if it
measurably reduces recurring manual effort.

## Priority order (PK-set)

1. **Source Truth Check** — read-only pre-lane "am I working from truth?" reporter (stale local · already-merged-elsewhere · wrong assumptions · duplicated work). *Highest leverage; gentlest — zero writes.* **Brief drafted, reserved.**
2. **Claim Stub** — proposes the next free register version + optionally writes one `CLAIMED` line into a new stub; never resolves a collision. **Brief drafted, reserved.**
3. **Hash Checkpoint** — compute/compare `reviewed_input_hash` at named checkpoints; a mismatch stays a human STOP.
4. **Review Packet Template** — canonical proposal-heavy/minimal-context review-packet scaffold.
5. **Register Pointer Template** — Convention-1 pointer scaffold from lane metadata.

## Explicit reject list (never build — crosses into coordination/judgment)

auto claim-resolution · auto version-bump-after-collision · auto merge · auto rebase · auto
commit · auto review-routing · auto PK-approval · auto lane-ownership. (Each is what CCF-03
showed isn't needed — the substrate already coordinates; a standing role added no demonstrated
value.)

## Standing boundaries

Every assistant is zero-authority: no commit/push/deploy/approval/promotion/enforcement; output
always flows through the existing human gates. CCF-02 is LIVING and amends only by PK
ratification — assistants build *under* the contract, never amend it. Guard enforcement flips
remain separate PK gates. CCF-03 is CLOSED/RETIRED — no standing observer, no BOARD.md.

**Non-claims:** this charter records phase framing only — nothing built, no lane opened, no
contract amended, no assistant exists. The two drafted briefs (Source Truth Check, Claim Stub)
are reserved, not approved. CCF-04 opens when PK approves a lane at Gate 1.
