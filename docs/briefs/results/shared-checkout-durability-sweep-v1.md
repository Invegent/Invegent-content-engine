# Shared-Checkout Durability Sweep + Attribution Triage v1

**Lane:** S1 — shared-checkout durability sweep (CGU Final control-tower seed)
**Tier:** T1 · read-only analysis · **zero mutations** (no deletions, no commits, no pushes, no moves, no `git rm`, no `git clean`)
**Date:** 2026-08-07 Sydney
**Governing constraints:** v6.140 watch ruling · v6.147 (isolated non-production work only)
**HEAD at sweep:** `11212c8` · branch `main` · upstream parity **ahead 0, behind 0**
**Working tree:** **zero tracked modifications** — every one of the 201 `git status` paths is `??` (untracked)
**Scope exclusions (per seed):** `_harness/**` (custody-locked, deliberately git-excluded via `.gitignore:21`) and `node_modules/**` — **neither touched nor enumerated**

> **This document is a classification, not an execution.** Every RECOMMENDED action below is a proposal awaiting PK's word. Nothing in this lane deleted, moved, staged, or committed anything.

---

## 0. Headline findings

1. **✅ The v6.140–v6.170 register arc has ZERO dangling citations.** All 38 distinct `docs/**` paths cited across that arc (plus the sitting agenda) resolve to **committed** files. Six apparent misses were run down and are all false alarms: three were brace-notation (`m11b-seed-{a…,b…}`, `m6-triptych-{…}`) whose expansions are committed; one is the header's template placeholder (`YYYY-MM-DD-{slug}.md`); one is a **memory-file** name, not a repo path (`video-worker-2min-render-timeout-no-retry.md`); one is branch-resident by design (§1.1).
2. **🔴 The real breakage is the INVERSE: 67 untracked files are POINTED AT by committed documents.** A committed record cites a file that exists only in this working tree — if the tree is swept, the citation dies. 13 of these are cited by `docs/00_sync_state.md` itself.
3. **🔴 The v6.151 build-wave scoreboard claims three lanes DONE whose result docs are untracked and cited by nothing.** `L2/M7 ✅`, `M16 ✅`, `M14 WS-1+WS-3 ✅` are marked closed in the register, but `cgu-m7-cost-capture-lane-result-v1.md`, `cgu-m16-pool-health-fix-lane-result-v1.md`, and `cgu-m14-ws1-ws3-lane-result-v1.md` are all uncommitted **and appear in no register entry**. This is the highest-value durability gap found: *completion asserted, evidence homeless.*
4. **🟡 Four of v6.16's own "🔴 FIVE DANGLING REFERENCES" are still untracked**, 14 days after being recorded as open. One (`cc-0073-backgrounds-only-asset-gap-drain.md`) has since landed. The register already flagged this class and it has not been closed.
5. **🟢 The bulk is inert:** 1,468 of 1,824 untracked files (80.5%) are two byte-identical copies of a 734-file plugin skill tree. They carry no lane evidence.

---

## 1. Inventory

`git status --porcelain` reports **201 paths**; four of those are collapsed directories. Expanded, and excluding `_harness/**` and `node_modules/**`:

| Group | Files | Note |
|---|---:|---|
| `docs/briefs/**` (incl. `results/`, `artifacts/`, `seeds/`) | 182 | the evidence corpus |
| `supabase/migrations/**` | 8 | SQL, incl. 2 `NOT_APPLIED_`/`ROLLBACK_` |
| `.agents/skills/**` | 734 | duplicate skill tree |
| `.claude/skills/**` | 734 | duplicate skill tree (identical file list) |
| `videos/**` | 158 | 445 MB; 16 project docs + 142 media/thumbnails |
| `.claude/` misc (`launch.json`, `routines/`×2, settings backups ×3) | 6 | local config |
| `skills-lock.json` | 1 | tool-generated |
| `docs/runtime/monitoring/broll-rotation-monitor.log` | 1 | armed-monitor output |
| **TOTAL** | **1,824** | |

### 1.1 Branch-resident (not on `main`, not a defect)

`docs/briefs/results/cgu-m1-loudness-phase1-l1-result-v1.md` and `supabase/migrations/NOT_APPLIED_m1_create_record_render_loudness_rpc.sql` are cited by v6.151/v6.153 and are **absent from `main`** — but both are committed on branch `worktree-cgu-l1-m1-loudness-phase1` @ `106e0e6` (13 files, 835 insertions), which exists locally **and** on `origin`. v6.153 states this explicitly ("control-tower-verified on origin"). **Not dangling — durable, just not on `main`.** A `main`-only reader cannot follow the citation; that is a discoverability note, not an evidence loss.

---

## 2. Bucket A — LOAD-BEARING, NOT COMMITTED

**158 files** (190 in `docs/briefs` + `supabase/migrations`, less the 32 superseded in Bucket B). Split by how strong the evidence link is.

### A1 — Cited by a COMMITTED document → **broken evidence link** (67 files)

Each of these is named inside a file that *is* in git. Sweeping the working tree breaks a live reference.

**A1a — cited by `docs/00_sync_state.md` itself (13 — highest severity):**

| Citing version | Untracked file | Note |
|---|---|---|
| v6.90 | `docs/briefs/ccf-04-review-packet-gate2-packet-v1.md` | **live carry** — CLAUDE.md lists Review-Packet-Template as "built, PK Gate-2 pending"; this *is* the pending gate packet |
| v6.45 | `docs/briefs/ndis-capability-leak-containment-apply-packet-v1.md` | record of an **applied T3 production change** (4 NDIS platforms paused) |
| v6.45 | `docs/briefs/ndis-capability-leak-interim-containment-plan-v1.md` | parent plan of the above |
| v6.42 | `docs/briefs/governed-broll-resolver-s3-packet.md` | |
| v6.24 | `docs/briefs/artifacts/slice-a-dashboard-panel.diff` | reviewed diff artifact |
| v6.16 | `docs/briefs/results/cc-0053-cc-0054-gate1-review-evidence-v1.md` | **the `security-auditor` evidence** (v6.16's own words) |
| v6.16 | `docs/briefs/results/eq4-nextjs-server-action-route-scoping-verdict-v1.md` | the AC-LAYOUT derivation, rev-2 |
| v6.16 | `docs/briefs/cc-0063-brand-host-designation-implementation-packet-v1.md` | |
| v6.16 | `docs/briefs/agp-persona-signal-outage-handoff-v1.md` | |
| v5.78 | `docs/briefs/register-reconciler-activation-brief-v1.md` | |
| v5.48 | `docs/briefs/cc-0035-governed-pp-video-live-draft-render-proof.md` | ⚠ see §2.1 — ambiguous duplicate |
| v5.39 | `docs/briefs/creatomate-video-tmr-sprint-phase2-packet.md` | committed `-v2` exists |
| v4.04 | `docs/briefs/h3-2-retry-cap-design-packet.md` | oldest |

**The four v6.16 rows are the same four v6.16 recorded verbatim as "🔴 FIVE DANGLING REFERENCES — cited documents that exist untracked but were NOT in the approved file set"** and routed to "NEXT GATE: PK rules on … the disposition of the five dangling references." That gate appears never to have been discharged. The fifth (`cc-0073-backgrounds-only-asset-gap-drain.md`) **is now committed**.

**A1b — cited by other committed `docs/**` records (54 further files).** Highest citation counts:

| Cites | File |
|---:|---|
| 6 | `docs/briefs/ndis-capability-leak-containment-apply-packet-v1.md` |
| 4 | `docs/briefs/results/eq4-nextjs-server-action-route-scoping-verdict-v1.md` |
| 4 | `docs/briefs/resolver-enforcement-r3-contract-gate1-v1.md` |
| 4 | `docs/briefs/cc-0044-ultimate-tmr-proof-1-data-only-onboarding.md` |
| 3 | `supabase/migrations/20260725120000_durable_platform_support_guard_grid_and_materialiser.sql` |
| 3 | `supabase/migrations/20260710115043_select_music_require_content_id_safe.sql` |
| 3 | `docs/briefs/video-d6-unblock-arc-gate1-brief-v1.md` · `results/static-template-graduation-batch1-image-worker-compat-result-v1.md` · `results/creatomate-global-capability-map-v2-delta.md` · `music-completion-gate1-packet-v1.md` · `cc-0032-governed-video-combo-audio-vo-music-bed.md` · `branch-b-lane-b1-v2-expansion-brief.md` · `aci-slice-c-contract-validation-warn-only-brief.md` |
| 2 | 14 further files (TMR workbooks, schedule-cap brief, PP/NDIS packets, `deploy-verifier` Gate-1 brief, `ccf-04-review-packet-template-gate1-brief-v1.md`, …) |
| 1 | 26 further files |

### A2 — Attributable evidence, cited by nothing (91 files)

Every one carries a clear lane/task identity (`cc-00NN`, `m13-`, `cgu-`, `ccf-04-`, `r3a-`, `slice-a-`). They are not unattributable — they are **orphaned**: real lane output no record points to. Highest-consequence subsets:

**Build-wave result docs the register calls DONE (3) — see §0 finding 3:**
- `docs/briefs/results/cgu-m7-cost-capture-lane-result-v1.md` (2026-08-06)
- `docs/briefs/results/cgu-m14-ws1-ws3-lane-result-v1.md` (2026-08-06)
- `docs/briefs/results/cgu-m16-pool-health-fix-lane-result-v1.md` (2026-08-06)

**Apply packets / deploy runbooks / gate handoffs (16):** `durable-platform-support-guard-apply-packet-v1.md` · `h3-1-pk-apply-packet.md` · `artifacts/r3a-t3-gate-handoff{,-v2}.md` · `artifacts/slice-a-{dashboard-deploy,wrapper-apply}-runbook.md` · `creatomate-video-breadth-2b-apply-hand-handoff-v{1,2}.md` · `schedule-day-of-week-repair-apply-handoff-v1.md` · `cc-0039-batch2-content-id-runbook-v1.md` · `results/c2-inv2-apply-{preflight,final}-handoff-v1.md` · `results/cc-0063-step-b-deploy-preflight-handoff-v1.md` · `results/s8-six-slot-repair-apply-preflight-handoff-v1.md` · `results/slice-a-dashboard-deploy-preflight-handoff-v1.md`

**SQL with no committed home (4):** `supabase/migrations/20260710024629_add_recorded_at_and_backfill_drifting_piano_approval.sql` · `20260710024829_create_select_music_rpc.sql` · `NOT_APPLIED_cc0080_reconcile_publish_status_v1.sql` (v2 + v3 **are** committed → arguably Bucket B) · `ROLLBACK_20260725120000_durable_platform_support_guard.sql` (its FORWARD migration is A1b-cited — **a rollback path whose forward half is referenced but neither is in git**)

**CCF-04 helper gate chain (7):** the full `claim-stub` and `hash-checkpoint` Gate-1/Gate-2/merge-gate packet sets, plus `ccf-04-item3-mechanical-assistants-scope-brief-v1.md`. CLAUDE.md records both helpers as **built and hook-wired**; their gate paperwork is uncommitted.

**Remaining ~61:** lane result docs, gate-1 briefs, and workbooks across cc-0032/34/38/43/45/54/55/79/81, TMR, creatomate-breadth, asset-gap, multi-avatar, NDIS/TMR `.xlsx` workbooks.

### 2.1 One ambiguous duplicate (not a clean supersession)

`docs/briefs/cc-0035-governed-pp-video-live-draft-render-proof.md` (untracked, 114 lines) vs `docs/briefs/results/cc-0035-…md` (**committed**, `2d8b092`, 67 lines). Same basename, different directory, **different content** — the untracked copy is the full brief (template header, author/executor block); the committed copy is the result-doc form carrying a CCF-02 claim stub. v5.48 cites the bare name, so the citation is satisfiable by the committed copy. **Not safe to treat as a pure duplicate** — the untracked file holds ~47 lines the committed one does not.

**RECOMMENDED (Bucket A):** **commit** — as one or more evidence-preservation commits, at PK's word, ideally A1a first (register-cited), then A1b, then A2. **Do not sweep any Bucket A path.** §2.1 needs a human read before either copy is treated as authoritative.

---

## 3. Bucket B — SUPERSEDED (32 files)

An older revision whose successor **is committed**. Named successor for each family:

| Untracked (superseded) | Committed successor |
|---|---|
| `artifacts/r3a-ai-worker-shadow.diff` | `artifacts/r3a-ai-worker-shadow-v2.diff` |
| `artifacts/r3a-apply-deploy-runbook.md`, `-v3.md` | `artifacts/r3a-apply-deploy-runbook-v4.md` |
| `artifacts/r3a-resolver-shadow-migration.sql`, `-v2`, `-v3` | `artifacts/r3a-resolver-shadow-migration-v4.sql` |
| `r3a-resolver-shadow-packet-v1/v2/v3.md` | `r3a-resolver-shadow-packet-v4.md` |
| `cc-0079-slice-2-apply-packet-v1.md` | `-v2` / `-v3` / `-v4` |
| `cc-0080-reconciler-gate1-proof-and-apply-packet-v1/v3/v4/v5.md` | `-v2` and `-v6` |
| `cc-0081-containment-window-runbook-v1.md` | `-v2` |
| `creatomate-video-breadth-2b-design-packet-v1.md` | `-v2` / `-v3` |
| `creatomate-video-tmr-sprint-phase2-packet.md` | `-v2` (⚠ also A1a-cited by v5.39 at the *bare* name) |
| `durable-platform-support-intersection-demand-grid-gate1-v1/v3.md` | `-v2` |
| `governed-broll-consumption-v1-gate1-brief.md` | `…-gate1-brief-DRAFT.md` (⚠ successor is a **DRAFT** — weaker, verify direction) |
| `post-cgu-v1-optimum-schedule-expansion-packet-v3/4/6/7/8/9/10.md` (7) | `-v11` (and `-v5`) |
| `schedule-day-of-week-contract-repair-packet-v2/v3/v4.md` | `-v1` and `-v5` |
| `seeds/orchestrator-control-packet-v2.md` | `-v1` and `-v3` |
| `cc-0035-governed-pp-video-live-draft-render-proof.md` | `results/…` — **see §2.1, NOT a clean supersession** |

**Five of the 32 are still cited by committed docs** (lineage references) — sweeping them turns a lineage note into a dead link, which may be acceptable but is PK's call.

**RECOMMENDED (Bucket B):** **propose-for-cleanup** — but two carve-outs: the `governed-broll-consumption` row (successor is a DRAFT) and the §2.1 cc-0035 row must be **left** pending a human read. The `post-cgu-v1-optimum-schedule-expansion` v3–v10 chain (7 files) is the cleanest single cleanup candidate in the tree.

---

## 4. Bucket C — SCRATCH/LOCAL (1,481 files)

| Path | Files | Reason | RECOMMENDED |
|---|---:|---|---|
| `.claude/skills/**` | 734 | plugin-installed skill tree (hyperframes et al.), tool-managed | leave |
| `.claude/settings.local.json.bak-20260629-180125` | 1 | settings backup | propose-for-cleanup |
| `.claude/settings.local.json.bak-preapply-20260719-140220` | 1 | settings backup | propose-for-cleanup |
| `.claude/settings.local.json.presupervisor` | 1 | settings backup | propose-for-cleanup |
| `.claude/launch.json` | 1 | Browser-pane dev-server config, machine-local | leave |
| `.claude/routines/desktop-health-check-{prompt.md,…}` + `run-desktop-health-check.ps1` | 2 | local operator routine | leave (or commit if it should be fleet-shared — PK's call) |
| `skills-lock.json` | 1 | tool-generated lockfile | leave |
| `docs/runtime/monitoring/broll-rotation-monitor.log` | 1 | output of the **armed** B-roll rotation monitor — runtime log, but the monitor is live | leave |
| `videos/**` media (`.mp4`/`.png`/`.jpg`/`.srt`/`.wav`/`.webp`) | 142 | rendered output, ~445 MB total for `videos/` | see Bucket D |
| `videos/**` project docs (8 `.md` + 8 `.json`) | 16 | incl. `videos/pp-character-intros/FINDINGS.md`, which a standing memory pointer names as the PP video lab log | **commit** (docs only, not the media) |

---

## 5. Bucket D — UNKNOWN (876 files)

| Path | Files | Why it cannot be attributed |
|---|---:|---|
| `.agents/skills/**` | 734 | **Byte-identical file list to `.claude/skills/**` (734 = 734, diff clean).** Cannot determine which tool wrote the second copy, which is canonical, or whether removing either breaks skill resolution. Not a lane artifact either way. |
| `videos/**` media | 142 | ~445 MB of render output across `pp-character-intros`, `pp-story-final`, `pp-story-recut`. Cannot attribute ownership or custody without opening another session's working files — **deliberately not opened** (task 4). No `.gitignore` entry exists for `videos/`, unlike `_harness/`. |

**RECOMMENDED (Bucket D):** **leave, and raise as two explicit PK questions** — (1) is the `.agents/` ↔ `.claude/skills/` duplication intentional, and should one be gitignored? (2) does `videos/` want a `.gitignore` entry for media (as `_harness/` has) so 445 MB stops appearing as sweepable working-tree fog?

---

## 6. Dangling-citation list (task 3)

### 6.1 Register → file (v6.140–v6.170 arc + sitting agenda)

**ZERO dangling.** 38 distinct cited `docs/**` paths, all committed. Verified individually against `git ls-files --error-unmatch`. Six apparent misses resolved as false alarms (§0 finding 1). The one genuine off-`main` case is §1.1 (branch-resident, durable on `origin`).

### 6.2 File → register (the inverse — where the breakage actually is)

**67 untracked files are cited by committed documents**, 13 of them by `docs/00_sync_state.md`. Full enumeration in §2 (A1a table + A1b counts). Plus **3 result docs for lanes the register scoreboards as ✅ DONE, cited by nothing** (§0 finding 3).

---

## 7. Possible in-flight work — DO NOT SWEEP (task 4)

Recently modified untracked paths. **No judgement offered on content; not opened beyond mtime.**

| mtime (local) | Path |
|---|---|
| 2026-08-07 16:26 | `docs/briefs/migration-directory-hygiene-gate1-brief-v1.md` |
| 2026-08-07 16:25 | `docs/briefs/select-music-seed-rotation-gate1-brief-v1.md` |
| 2026-08-07 16:23 | `docs/briefs/artifacts/lane5-select-music-seed-rotation-FORWARD.sql` |
| 2026-08-07 16:23 | `docs/briefs/artifacts/lane5-select-music-seed-rotation-ROLLBACK.sql` |
| 2026-08-07 15:31 | `docs/briefs/pp-broll-batch4-intake-v1-apply-packet.md` |
| 2026-08-07 14:39 | `docs/briefs/music-rotation-decision-packet-v1.md` |
| 2026-08-07 14:39 | `docs/briefs/cc-0039-batch2-content-id-runbook-v1.md` |
| 2026-08-06 20:03 | `.claude/launch.json` |
| 2026-08-06 15:27 | `docs/briefs/m13-buildpack-lane5-e2e-proof-brief-v1.md` |
| 2026-08-06 14:38 | `docs/briefs/results/cgu-m14-ws1-ws3-lane-result-v1.md` |
| 2026-08-06 14:11 | `docs/briefs/results/cgu-m16-pool-health-fix-lane-result-v1.md` |
| 2026-08-06 12:09 | `docs/briefs/results/cgu-m7-cost-capture-lane-result-v1.md` |

The four 2026-08-07 16:2x paths (a Gate-1 brief + a FORWARD/ROLLBACK SQL pair, written within three minutes of each other) read as an **active Lane-5 select_music seed-rotation session mid-authoring**. The three 2026-08-06 `cgu-*` result docs are the build-wave evidence from §0 finding 3 — recent, and simultaneously the most durability-exposed files in the tree.

---

## 8. Recommendations summary (proposals only — PK's word executes)

| Bucket | Files | RECOMMENDED |
|---|---:|---|
| A1a — register-cited, untracked | 13 | **commit** — first priority; also **discharge the v6.16 five-dangling-references gate**, still open since 2026-07-24 |
| A1b — cited by other committed docs | 54 | **commit** |
| A2 — attributable evidence, uncited | 91 | **commit**, prioritising the 3 build-wave result docs, the 16 apply/deploy/handoff packets, and the 4 SQL files |
| B — superseded | 32 | **propose-for-cleanup**, minus 2 carve-outs (`governed-broll-consumption` DRAFT successor; §2.1 cc-0035) and noting 5 carry lineage citations |
| C — scratch/local | 1,481 | **leave**, except: 3 settings backups → propose-for-cleanup; 16 `videos/**` project docs → commit |
| D — unknown | 876 | **leave** + two PK questions (§5) |

**Sequencing note.** Committing Bucket A closes the evidence-link gap without deleting anything, and it must land **before** any Bucket B cleanup — otherwise a sweep could remove a superseded file while its successor's lineage citation is still the only pointer. Nothing here needs the 2026-08-11 watch gate: all of it is docs/evidence, zero DB, zero deploy, zero production mutation.

**Two carries this lane did not resolve** (out of scope, read-only):
1. Whether the 4 untracked `supabase/migrations/*.sql` files are **applied in production**. They are invisible to any git-based migration-ledger reconciliation (the cc-0087 backfill class) precisely because they are untracked. Verifying needs a gated `execute_sql` ledger read — **not performed**.
2. Whether `.claude/routines/**` should be fleet-shared or stay machine-local.

---

## 9. Register payload (version-less — control tower allocates)

> **✅ vX.XX — SHARED-CHECKOUT DURABILITY SWEEP v1 COMPLETE (T1 · read-only classification · zero mutation; no deletions/commits/pushes/moves)** — result: `docs/briefs/results/shared-checkout-durability-sweep-v1.md`.
> · **v6.140–v6.170 citation arc is CLEAN — zero dangling register→file citations** (38 cited paths, all committed; 6 apparent misses were brace-notation/template-placeholder/memory-file false alarms; the M1 loudness pair is branch-resident on `origin/worktree-cgu-l1-m1-loudness-phase1` @ `106e0e6`, durable but off `main`).
> · **🔴 The breakage is inverse: 67 untracked files are cited by COMMITTED documents (13 by `00_sync_state.md`).** Includes the v6.45 applied-T3 NDIS containment packet, the v6.90 CCF-04 Review-Packet Gate-2 packet (a live carry), and **4 of the 5 refs v6.16 itself recorded as "🔴 FIVE DANGLING REFERENCES" — that PK gate is still undischarged** (the 5th has since landed).
> · **🔴 v6.151's build-wave scoreboard marks `L2/M7`, `M16`, `M14 WS-1+WS-3` ✅ DONE, but all three result docs are untracked AND cited by no register entry** — completion asserted, evidence homeless.
> · **Buckets (1,824 files, `_harness`/`node_modules` excluded and not enumerated):** load-bearing-not-committed **158** · superseded **32** · scratch/local **1,481** · unknown **876** (`.agents/` is a byte-identical 734-file duplicate of `.claude/skills/`; `videos/` = 445 MB with no `.gitignore` entry). Recommendations only: commit A, propose-for-cleanup B (2 carve-outs), leave C/D. **Nothing executed.**
> · **In-flight, do-not-sweep:** an active Lane-5 select_music seed-rotation session (Gate-1 brief + FORWARD/ROLLBACK SQL pair, all 2026-08-07 16:2x) plus 3 recent `cgu-*` build-wave result docs. Content not opened.
> · **Carries:** (1) applied-state of the 4 untracked migrations unverified — untracked files are invisible to git-based ledger reconciliation (cc-0087 class); needs a gated ledger read. (2) `.agents/` ↔ `.claude/skills/` duplication + `videos/` custody are two open PK questions.
