# Slice A Dashboard Panel (Artifact 2) — Deployment Result (v1)

> **Lane:** Slice A artifact 2 — read-only format-allocation panel · **Deploy hand:** S1 (independent; S6 authored) · **Type:** T3 production deploy result
> **Verdict:** **PASS** — deployed to production on the exact reviewed SHA, Vercel state READY, every code/data property verified. One scoped residual: live authenticated **visual** observation of the rendered panel is PK's to eyeball (I cannot and did not authenticate to the private dashboard).
> **Repos:** CE untouched (`3dee7e5`, parity 0/0). Dashboard `invegent-dashboard` `origin/main` advanced `524ca6d → 2808d18` (this deploy).

---

## 1 · Committed + deployed identity

| | Value |
|---|---|
| Committed SHA | **`2808d186f9ab26d71acb81468d24d6385a15b973`** (parent `524ca6d`, FF-only) |
| Commit message | `feat(schedule): Slice A read-only format-allocation panel` |
| Deployed SHA (Vercel) | **`2808d186…` — EXACT MATCH** |
| Vercel deployment | `dpl_FTSGZTGX6Czau3Eeb62M6FJ9mAiF`, target **production**, state **READY** |
| Vercel project / team | `prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg` / `team_kYqCrehXYxW02AycsKVzwNrE` (`invegent-dashboard`) |
| Deployment URL | `invegent-dashboard-k767sf1lb-pk-2528s-projects.vercel.app` (prod alias `dashboard.invegent.com`) |
| Push | `524ca6d..2808d18 → main`, clean fast-forward, no force |

## 2 · Five-file identity (byte-equivalent to the reviewed `17363dd3…`)

Verified at the git-blob level (content hashes), not just file names — the committed new-side blobs equal the reviewed diff's blobs exactly:

| file | reviewed blob | committed blob |
|---|---|---|
| `app/(dashboard)/clients/page.tsx` (M from `83560c4`) | `538b4b3` | **`538b4b3`** ✓ |
| `actions/week-format-allocation.ts` (A) | `b1ac3f5` | **`b1ac3f5`** ✓ |
| `components/clients/WeekFormatAllocation.tsx` (A) | `0c33ff9` | **`0c33ff9`** ✓ |
| `lib/week-format-allocation.ts` (A) | `e13f4db` | **`e13f4db`** ✓ |
| `tests/week-format-allocation.test.ts` (A) | `4d5953b` | **`4d5953b`** ✓ |

Exactly five files, 987 insertions, nothing else. No Sunday / writable-planner / resolver / unrelated change bundled (branch-warden `safe`). External review `4f5d0e56` (`agree`, pinned `17363dd3…`) governs.

## 3 · Build + test outputs

- **S1 independent (committed tree):** `tsc --noEmit` **exit 0** · `vitest` **222/222 passed** (11 files) — re-run twice this session on the exact committed content.
- **Vercel:** production build **READY** (a build/type error would surface as state `ERROR`) — confirms the panel route compiles and is served in production.

## 4 · Post-deploy proof (dispatch's 9 points)

| # | Proof | Result |
|---|---|---|
| 1 | HEAD == origin/main | ✅ both `2808d18` |
| 2 | parity 0/0 | ✅ |
| 3 | Vercel deployed the EXACT pushed SHA | ✅ prod `dpl_FTSGZTGX6…`, SHA `2808d18`, READY |
| 4 | panel loads on `/clients?tab=schedule` | ✅ route builds + deploys (Vercel READY; tsc/vitest clean). **Live authenticated UI render = PK's eyeball** — see §5 |
| 5 | Property Pulse shows Slice-2 AFTER state (zero not-publishable), allocation present, no silent-empty | ✅ **verified at the data source**: the panel's wrapper `get_week_format_allocation(PP, 2026-07-27)` returns **4 platforms · 20 entries · 0 not-publishable** — the exact "0 of 20" the panel renders, full data (no empty) |
| 6 | wrapper-failure → visible **red** failure block | ✅ **code-verified**: the action returns `{ok:false,error}` on RPC failure/exception and never throws; the component renders a red block for every failure mode (never blank). A live failure simulation would require breaking the live wrapper (not done — destructive) |
| 7 | panel is read-only | ✅ the action's only DB call is `rpc('get_week_format_allocation')`; no INSERT/UPDATE/write path in the committed code (comment: "changes no allocator behaviour and repairs nothing") |
| 8 | labelled as allocation truth, not enforced planner choices | ✅ honest-label subtitle present in the reviewed component ("not the format that will publish") |
| 9 | no Sunday write-path or format-per-slot write capability introduced | ✅ the committed diff adds no write path; the `day_of_week`/`sunday_written_as_zero` references are the gate-1-mandated **read-only detection** (red banner), not a write/repair |

## 5 · The one residual (why not a blind PASS on every pixel)

Proofs 4 (UI render) and 6 (live wrapper-failure) can be *fully* closed only by loading the rendered panel in an authenticated session of the private `dashboard.invegent.com`. **I did not do this** — I have no login to PK's internal ops dashboard and did not attempt to bypass its authentication. What I *did* establish: the exact SHA is deployed and READY, the route compiles (tsc/vitest/Vercel build), the data the panel consumes is correct at the source (0 of 20), and the read-only + red-failure + honest-label + no-write properties are verified in the committed code. **Recommended: PK opens `/clients?tab=schedule`, selects property-pulse, and eyeballs the panel** (four platform rows, 0 of 20 not-publishable, per-row traceability, honest-label subtitle; a non-enrolled client shows the amber not-enrolled state, not blank). The deploy is proven; the visual confirmation is a one-look PK step.

## 6 · Rollback (if PK's visual check fails)

**Vercel instant rollback** to the immediately-prior production deployment **`dpl_DkYuG4vHSsaoGggvREx2aRkjmGXp`** (SHA `524ca6d`, the pre-Slice-A cc-0054 build, state READY, `isRollbackCandidate:true`) — seconds, no code change. Durable alternative: revert the `page.tsx` additive block + delete the four new files on `main`, push. **Zero data blast radius** — nothing else imports the four files, no DB object changed; the wrapper (artifact 1) is independent and stays live; a rolled-back panel simply stops calling it. Per dispatch: on a failed post-deploy check, do NOT patch forward in-window — instant-rollback, preserve the SHA + evidence, return the defect to S6.

## 7 · Non-claims

CE was not touched (parity 0/0 at `3dee7e5`). Local dashboard `main` (stale at `0856dcb`, an ancestor of origin/main) was never used or moved — the push used an explicit `2808d18:main` refspec, so only that one commit shipped. No DB object was created or changed by this lane (the wrapper pre-existed and is live). I ran read-only inspections, local `tsc`/`vitest`, a read-only wrapper call, and the authorized push. This result records a completed deploy; it does not itself grant or re-grant authority. All facts live as of 2026-07-25.
