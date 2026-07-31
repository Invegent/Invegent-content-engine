# Branch and Packet Retirement — Batch v1 (PREPARED, NOTHING EXECUTED)

**Created:** 2026-07-31 Sydney · **Lane:** Branch and Packet Retirement (PK session task)
**Status:** PREPARED FOR PK REVIEW — **zero branches deleted, zero worktrees removed, zero records rewritten.**
**Verified against:** CE `origin/main` = `ddfc836` (register v6.93) · dashboard `origin/main` = `fc9c5c9` · all branch states re-fetched (`--prune`) 2026-07-31.

Scope note: this batch covers the PK-named candidates (the overnight r0vbuf lane, cc-0090, anything
superseded by v6.92/v6.93) plus the branches whose dispositions v6.88–v6.91 already recorded. The ~60
legacy `feat/*`/`fix/*`/`cc-*`/session branches (300–1,900 commits behind-fork) are **explicitly out of
this batch** — each needs its own verification and they default to the STOP list (§5).

---

## 1. Exact retirement list (safe to retire after §2 preservation lands)

| # | Ref | Repo | Why safe | Authoritative replacement |
|---|---|---|---|---|
| R1 | `origin/claude/creatomate-global-progress-r0vbuf` — **the cc-0090 draft only** (commit `b399f5c`, `docs/briefs/cc-0090-read-model-apply-packet-PROPOSED-v1.md`) | CE | Overnight PROPOSED draft, never frozen/reviewed/seen by PK; the real cc-0090 lane landed independently and is LIVE | v6.87: `cc-0090-asset-graduation-read-model-v1-brief.md` + result + migration `20260731001557` live-proven on main |
| R2 | `origin/lane/w1-planner-dark-v2` (commit `391f47f`, sole content = never-applied dark migration SQL) | CE | PK already RULED supersession (v6.89); dark table/RPC/ledger verified absent live; branch-warden `safe`; the v6.89 record's §6 prepared exactly this deletion | v6.88 `format_override` mechanism (live) + v6.89 supersession record |
| R3 | `origin/lane/s9-cta-text-bounded-regen-v2` (commit `b7e371e`) — **conditional on P3 below** | CE | 3 of its 4 files verified BYTE-IDENTICAL this session (sha16 `72c56009…`/`366c134b…`/`45cd5301…` match on both sides) to main's `s9-cta-text-bounds-minimal-landing-patch-v1.diff` (v6.91); the 4th file was deliberately excluded by v6.91 as unsafe-to-apply — preserve it first (P3), then the branch carries nothing unique | v6.91 minimal landing packet + patch artifact on main |
| R4 | cc-0090 as a lane | CE | **Nothing left to retire**: no branch on origin, no worktree, no local remnant; brief/result/migration all on main. The only stray cc-0090 artifact anywhere is R1's draft. Classification: CLOSED | v6.87 (as R1) |
| R5 | `origin/s2-gcp-slice3` | dashboard | Fully merged: 0 commits ahead of dashboard `origin/main` — pure ref cleanup, no content at risk | dashboard main history |

**Retirement commands (PK to run after §2 is reviewed/landed — NOT executed):**
```bash
# CE (after P1–P3 preservation commit is on main)
git push origin --delete claude/creatomate-global-progress-r0vbuf   # only after P1+P2 decision (see E1 — the NDIS draft makes this ESCALATE-gated)
git push origin --delete lane/w1-planner-dark-v2                    # per v6.89 §6, already branch-warden-verified safe
git push origin --delete lane/s9-cta-text-bounded-regen-v2          # only after P3
# PK's local machine (from v6.89 §6 — this container has no such worktree/branch):
#   git worktree remove C:/Users/parve/ice-worktrees/lane-w1-planner-dark
#   git branch -D lane-w1-planner-dark
# dashboard
git push origin --delete s2-gcp-slice3                              # unconditional — fully merged
```

## 2. Evidence-preservation plan (lands BEFORE any deletion)

One T1 docs-only archive commit on CE `main` (its own small gate) creating `docs/archive/overnight-r0vbuf-20260730/` + one file in `docs/briefs/artifacts/`, each file stamped with a SUPERSEDED/UNADOPTED banner and its recorded sha256:

| # | Artifact (sole copy today) | From | sha256 |
|---|---|---|---|
| P1 | `cc-0090-read-model-apply-packet-PROPOSED-v1.md` | CE r0vbuf `b399f5c` | `8504abd6…d09166` |
| P2 | `ndis-video-short-stat-youtube-suitability-apply-packet-PROPOSED-v1.md` | CE r0vbuf `73d82bf` | `1dcde08e…680d4e80` |
| P3 | `s9-cta-bounded-regen-index-wiring-wip.patch` (the v6.91-EXCLUDED historical ai-worker integration WIP — archived as history, banner must state it MUST NOT be applied: it predates and would drop the ai-worker v2.25.0 S9 rewrite) | CE s9-v2 `b7e371e` | `20d72b0c…c305cb8` |
| P4 | `template-mix-repetition-controls-gate1-brief-v1.md` (dashboard overnight draft) | dashboard r0vbuf `2f8d5e5` | `97cfa1f7…3ee8762` |
| — | `20260725130000_w1_planner_dark_schedule_format_assignment_v1.sql` (`3375905f…50f1d347`) | w1-v2 `391f47f` | **No archive copy proposed** — PK ruled the design superseded (v6.89) and its record + governing brief (banner-stamped) are on main; hash recorded here suffices. PK may elect archival anyway. |

## 3. Worktree and branch cleanup plan (this container + dashboard)

- **CE container worktrees:** only the primary worktree exists (`/home/user/Invegent-content-engine` on `claude/gate-1-capability-expansion-paw1ew`, clean, 0 uncommitted, pushed = `e611c2c`). **No stale worktrees to remove.**
- **Dashboard container:** single worktree, clean; local `main` == `origin/main` (`fc9c5c9`); local lane branch identical to main — nothing stale.
- **CE local `main`:** behind `origin/main` by 23 (stale pointer only, no local commits) → safe non-destructive cleanup: `git fetch origin && git branch -f main origin/main` (or fast-forward on next checkout). No deletion involved.
- **PK's own machine:** the v6.89-prepared `lane-w1-planner-dark` worktree+branch removal (commands in §1) — only PK can run those.

## 4. ESCALATE — PK decision required before any action

- **E1 · The overnight NDIS packet (P2) — the branch's real question.** `ndis-video-short-stat-youtube-suitability-apply-packet-PROPOSED-v1.md` is **NOT superseded by any landed result**: no suitability row for `video_stat_reveal_9x16_v2 × youtube` was ever applied; YouTube remains 0%-restored **by design** (v6.85 PK ruling), and PK's S6 Gate-1 amendments place NDIS/YouTube baseline with the existing NDIS/YouTube lane while Slices C/B2 (the governed YouTube path) are explicitly un-started and gated. The draft is a live one-row proposal in PK-gated territory, and r0vbuf holds its only copy. **PK options:** (a) archive-as-unadopted (P2) and retire the branch — the capability-expansion lane's Slice C/B2 Gate-1 would re-derive it fresh; (b) adopt it as a named input artifact to the future Slice-C/B2 Gate-1 (still archive + retire branch); (c) discard without archive (not recommended — loses an honest evidence-chain draft). The batch defaults to (a).
- **E2 · Dashboard overnight brief (P4).** It proposes template-mix/repetition controls — an area the register says **stays PK-paused pending a governed CE mechanism** (v6.78 carry, restated v6.88). Same options as E1; default (a) archive-as-unadopted, then the dashboard r0vbuf branch is retire-safe.
- **E3 · `cc-sched-editor-p1`** (local branch on PK's machine; NOT on origin): v6.88 recovered its 2 docs to main but **7 unique files remain unmerged** (2 applied-migration SQL + 5 apply artifacts) — named as a carry, not silently dropped. **STOP: do not delete anywhere** until a small T1 backfill lane recovers those 7 files (the 2 applied-migration SQLs belong in `supabase/migrations/` for ledger honesty). This batch cannot verify the branch's uncommitted state from this container — PK's machine holds it.

## 5. STOP list — not safe to retire, do not touch

| Ref | Why |
|---|---|
| `origin/claude/s5-cross-brand-evidence-schedule-x7rbn8` (CE, ahead 7) | **ACTIVE lane** — S5 apply runbook executes Sat 2026-08-01 evening; holds the frozen apply/rollback payloads |
| `origin/claude/gate-1-capability-expansion-paw1ew` (CE, ahead 3) | **ACTIVE lane (S6)** — B1 rev-2 packet parked at the fresh PK apply gate |
| `origin/lane/ccf04-review-packet-v2` (CE, ahead 1) | **PENDING PK GATE** — v6.90: build APPROVED, merge NOT authorized; branch is the sole carrier of the approved helper + 32 tests until the future merge gate |
| `cc-sched-editor-p1` (PK-local) | E3 — 7 unique files unmerged |
| `origin/tmr-template-intake-ui-v0` (dashboard, unmerged real commits) | Out of this batch's named scope; content not verified — needs its own pass |
| All ~60 legacy CE `feat/*`/`fix/*`/`cc-*`/`rescue/*`/`archive/*`/session branches + remaining dashboard branches | Out of scope this batch; default STOP; recommend a separate per-branch sweep lane if PK wants them processed |

## 6. Verification summary (per PK checklist, per candidate)

Every classified candidate was checked for: authoritative replacement (cited per row) · unique unmerged
evidence (P1–P4 identified; R2/R3/R5 verified redundant — R3 by byte-hash comparison against main's patch
artifact this session; R5 by merge-base ancestry) · uncommitted/unpushed work (both container repos
clean; PK-local branches flagged E3, unverifiable from here) · active-lane references (register grep:
r0vbuf referenced by no active lane; w1/s9/ccf04 dispositions are exactly v6.89/v6.91/v6.90; S5/S6/ccf04
active refs → STOP list) · classification (retire R1–R5 · preserve via STOP list · escalate E1–E3).

**Recommended execution order after PK review:** (1) archive commit (§2, P1–P4) on CE main + note in
dashboard if PK wants P4 mirrored there → (2) PK rules E1/E2 → (3) run §1 deletions → (4) E3 backfill
lane for `cc-sched-editor-p1`'s 7 files as its own small gate → (5) one register pointer for the batch
(Convention 1). Legacy-branch sweep = separate future lane.
