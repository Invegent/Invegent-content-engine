# Minimal landing packet — S9 `cta_text`/video-stat bounded-copy validator

**Created:** 2026-07-31 Sydney
**Author:** chat (orchestrator, read-only disposition review + rebase-check)
**Status:** Packet only. **Nothing merged, applied, or deployed.** Patch file provided for a future
gate; not committed to any branch by this pass.
**Source branch:** `lane/s9-cta-text-bounded-regen` (tip `2aeedb3`, a 2026-07-28 machine-restart
recovery snapshot)
**Diagnosis this implements:** `docs/briefs/s9-cta-text-bounded-copy-dead-draft-diagnosis-packet-v1.md`
(2026-07-24, S9) — recommended **Option B: bounded regeneration before persistence**; register status
as of v6.24 (`docs/00_sync_state.md`) is **"S9 PARKED"**, named as **"required before broad [video]
enablement, not blocking packet prep or the initial smoke."** No record found of a formal PK
accept/reject on Option B since — this build appears to be the in-progress implementation of the
recommendation, interrupted by the restart.

---

## 1. What's preserved (unmodified from the branch, byte-verified)

| File | Purpose | Verified |
|---|---|---|
| `supabase/functions/ai-worker/video_stat_bounds.ts` | Pure, non-throwing validator. **Vendors** the 4 governed `video_short_stat` character-bound constants (`STAT_VALUE=12`, `STAT_LABEL=48`, `CONTEXT_LINE=160`, `CTA_TEXT=90`) from the canonical source (`video-worker/b1_video_stat.ts:78-81`) + a pure `validateStatScriptBounds()` + `buildBoundReminder()`. No I/O, no throw — the render gate keeps its own throwing authority. | byte-identical to the branch blob (`diff` clean) |
| `supabase/functions/ai-worker/video_stat_bounds_test.ts` | 11 hermetic unit tests (conformant/over-length/exact-boundary/blank-field/multi-field cases, incl. the cc-0038 B4 133-char fixture as a real-world regression case) | byte-identical; **11/11 PASS** |
| `supabase/functions/ai-worker/video_stat_bounds_parity_test.ts` | **The one-source-of-truth guard.** Test-only cross-dir import comparing the vendored constants against `../video-worker/b1_video_stat.ts` — the sanctioned pattern (same as `creative_contract_parity_test.ts`), not a production runtime import | byte-identical; **4/4 PASS** |

**Zero modification to any of the three files.** They apply as-is against current `main` because they
depend on nothing that has moved: the canonical constants they vendor (`12`/`48`/`160`/`90`) are
unchanged in `b1_video_stat.ts` since the branch forked.

## 2. Rebase-check performed (isolated worktree, no shared checkout touched)

- Created `C:/Users/parve/ice-wt/s9-cta-bounds-rebase-check`, a fresh worktree forked from current
  `main` (`9112972`).
- Copied only the 3 files above into `supabase/functions/ai-worker/` (no changes to any existing file).
- `deno test video_stat_bounds_parity_test.ts` → **4/4 PASS** — confirms the vendored bounds still
  match the live canonical constants today, not just when the branch forked.
- `deno test video_stat_bounds_test.ts` → **11/11 PASS**.
- Confirmed no naming collision: neither file exists anywhere in `main`'s tree.
- Worktree and scratch branch removed after verification — nothing left checked out.

## 3. What is deliberately NOT included — the historical integration

The branch's `ai-worker/index.ts` diff (105 lines) wires `validateStatScriptBounds`/
`buildBoundReminder` into the video-script generation path — but that `index.ts` predates
`ai-worker-v2.25.0` (S9 capability enforcement Layer 2, 2026-07-29), which has since landed a large,
unrelated rewrite of the same file (the resolver-chokepoint capability gate). Merging the branch's
`index.ts` hunk unchanged would **silently drop v2.25.0's capability enforcement** — confirmed by
diffing branch vs. `main`: the branch's `index.ts` is missing the entire v2.25.0 changelog block and
the resolver-gate call it documents.

**Per instruction, this is not carried forward.** A real integration needs to be re-authored against
the current `index.ts` (find the present-day content-generation write site for `video_short_stat`
scripts, call `validateStatScriptBounds` there, wire the re-prompt-on-violation loop per the diagnosis
packet's Option B design) — its own small design decision, not a mechanical copy, and its own gate.

## 4. The patch

`docs/briefs/artifacts/s9-cta-text-bounds-minimal-landing-patch-v1.diff` — a `git diff` of exactly the
3 new files (215 insertions, 0 deletions, 0 modifications to any existing file). Applies cleanly to
current `main` (verified by construction — extracted from a worktree forked at `main` tip `9112972`).

## 5. What a future landing lane still needs (not done here — scope was "smallest landing packet")

1. **The actual integration** — re-authored against current `ai-worker/index.ts` v2.25.0+, per §3.
2. **A PK decision on Option B itself** — the diagnosis packet's "Next gate" was never formally closed
   in the register (last state: "S9 PARKED", "required before broad enablement, not blocking..."). This
   packet doesn't reopen that decision, it just makes sure the reusable half of the work isn't lost
   waiting for it.
3. Re-run of the two named-not-bundled adjacent findings from the diagnosis packet (§7 trap 2: 36
   failed video drafts with `dead_reason IS NULL`; §7 trap 3: the `ai-worker:1173` error-discard on
   `set_draft_video_script`) remain separate, un-landed findings — out of scope here, restated so they
   aren't lost either.

## 6. Explicitly not done by this pass

No file added to `main`. No commit. No branch created beyond the temporary rebase-check (removed). No
`ai-worker/index.ts` change of any kind — historical or fresh.
