# Slice A — **ARTIFACT 2 of 2**: dashboard read-only allocation panel

**Created:** 2026-07-24 Sydney · **Lane:** S6 · Schedule Slice A (PK priority 1)
**Status:** **BUILT LOCAL-ONLY, NOT COMMITTED, NOT PUSHED, NOT DEPLOYED.**
**Tier:** **T2** (read-only dashboard). No schema, no RPC, no write path, no new route, no cc-0054 target.
**Canonical ID:** NOT self-allocated.

> **Separation is mandatory (PK).** This packet governs the **dashboard code only**. The DB wrapper is
> **artifact 1**, `docs/briefs/slice-a-db-wrapper-packet-v1.md`, with its **own hash, own review, own
> gate, own rollback**. **Artifact 1 applies FIRST** — without it this panel renders its red failure block.

| Artifact | Path | sha256 | Bytes |
|---|---|---|---|
| **2 — dashboard diff (this packet's subject)** | `docs/briefs/artifacts/slice-a-dashboard-panel.diff` | `17363dd31789a3e6ad4ee5e7bf68d9c1d9a26df4a7b014ee8dca1c95d763ca57` | 44288 |

**Worktree:** `C:\Users\parve\dashboard-wt-s6-slice-a`, branch `s6-slice-a-allocation-panel`, base
`524ca6d`, **0 commits ahead**. The shared checkout (`fda2b51`, `tmr-template-intake-ui-v0`) was never
pulled, checked out, or written.

---

## 1 · Change set — exactly five files

| File | Action |
|---|---|
| `lib/week-format-allocation.ts` | **NEW** — types + pure normaliser |
| `actions/week-format-allocation.ts` | **NEW** — `'use server'` boundary; one async export |
| `components/clients/WeekFormatAllocation.tsx` | **NEW** — presentational, no state, no interactivity |
| `tests/week-format-allocation.test.ts` | **NEW** — 32 tests |
| `app/(dashboard)/clients/page.tsx` | **EDIT, additive only** — 2 imports, 1 destructure entry, 1 parallel loader, 1 mount block |

`package.json` / `package-lock.json` **untouched**. Untouched: `ScheduleTab.tsx`,
`PublishingPlanPyramid.tsx`, `ClientCapabilityOverlay.tsx`, `actions/schedule.ts`, `lib/validation.ts`,
every cc-0054 authoritative target, every route file, the sidebar.

**Split rationale:** a `'use server'` module may export **only async functions**. Exporting the
synchronous normaliser from the action would have failed `next build`. The pure logic therefore lives in
`lib/`, which also makes it directly unit-testable.

**Client selection:** the panel receives `activeClientId` as a prop from the page that already resolved
it. It introduces **no** client-conveyance mechanism, reads no `?client=`, and does **not** bridge the two
incompatible selection mechanisms.

---

## 2 · Verification — executed, not asserted

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npx next build` | **exit 0** (proves the `'use server'` and RSC constraints hold) |
| `npx vitest run` (full suite) | **222 passed / 222**, of which **32 new**; 190 pre-existing tests unaffected |

Dependencies were installed **inside the isolated worktree**. The shared checkout's `node_modules`
predates vitest; it was briefly junctioned, found insufficient, and the junction was removed with
`cmd /c rmdir` (link only) — **main's `node_modules` verified intact at 58 entries afterwards**, per the
known worktree-junction hazard.

**Not verified by browser preview, deliberately.** Rendering the happy path needs a dev server holding
production service-role credentials, and no Gate-1 secret-handling rider was granted (CCF-02 R2). It also
needs artifact 1 applied. Verification is build + tests + live SQL instead; the post-deploy visual check
belongs at the deploy gate.

---

## 3 · The oracle — reproduced first-hand, twice

Recomputed live against production (not inherited from the cc-0079 packet), then **re-confirmed a second
time under `search_path=''`**, with `N` derived rather than assumed:

| Platform | N | Allocation | invalid |
|---|---|---|---|
| linkedin | 5 | `carousel · carousel · text · image_quote · video_short_kinetic` | **3 of 5** |
| instagram | 5 | `carousel · carousel · image_quote · video_short_kinetic · video_short_stat_voice` | **2 of 5** |
| facebook | 5 | `image_quote · image_quote · carousel · text · video_short_kinetic` | **1 of 5** |
| **youtube** | 5 | `video_short_kinetic · video_short_kinetic · video_short_kinetic_voice · video_short_stat · video_short_stat_voice` | **0 of 5** |

Matches `cc-0079-slice-2-apply-packet-v2.md` §1 character-for-character on the three platforms it tables.

**Open question for PK — the oracle is four platforms, not three.** Both the seed and the cc-0079 packet
table only LI/IG/FB. A correct panel renders **four** rows. Stated unresolved, both figures asserted in
the test suite: **6 of 15** across LI/IG/FB, **6 of 20** across all four. *Recommendation: render all four
and report both — hiding a platform to match a table is the wrong direction of fit.*

Live data also produced **two distinct** invalidity reasons, vindicating PK's "specific reason"
requirement: `platform_support_false` (e.g. `carousel` on LinkedIn) and
`platform_absent_from_support_map` (IG `video_short_stat_voice`).

---

## 4 · Acceptance oracle — how each requirement is met

| PK requirement | Where |
|---|---|
| platform | per-platform block header |
| scheduled slot / day / time | per-row, client-local, ISO day label |
| format assigned by the allocator | per-row `assigned_format`, mirroring `materialise_slots` |
| valid / invalid status | per-row badge + per-platform `n of N` |
| **specific reason when invalid** | four distinct reason codes rendered as prose naming format, platform and the governing field |
| **schedule row + allocation source (traceability)** | per-row `#ordinal · schedule_id`, plus `allocation_source` and per-platform `allocation_status` |
| reproduce pre-Slice-2 allocation | §3 + test suite |
| reproduce post-Slice-2 `0 of 15` | test suite (`ORACLE_AFTER`) |
| **expose mismatch/failure VISIBLY** | §5 |
| remain read-only | no write path, no mutation, `STABLE` RPC |

### 4.1 What would falsify the panel

1. A rendered sequence differing from the wrapper's output for the same client/moment.
2. `slot_count` differing from production's matched-occurrence count.
3. A validity mark disagreeing with `platform_support` three-state semantics (absent ⇒ unsupported).
4. Anything other than **four** platform rows for `property-pulse`.
5. Any week label, picker, or date range (`p_week_start` is inert).
6. Copy asserting the allocation is what will publish.
7. Aggregates other than 6/15 and 6/20 pre-Slice-2.
8. A platform with zero enabled slots rendering a non-empty allocation.
9. **The panel rendering blank, quiet, or healthy-looking on any failure.**

---

## 5 · Fail visibly — designed first, as instructed

There is **no** `error.tsx` / `global-error.tsx` / `not-found.tsx` anywhere in `app/` (re-confirmed at
`origin/main`), so "renders nothing" was the single most likely way this panel could lie. Contained
entirely inside the panel:

- The action **never throws** — every path returns a discriminated result, so it cannot 500 the
  `/clients` route and take the schedule editor, Pyramid and Overlay down with it.
- **Load failure** → red bordered block, ending *"This is a failure, not an empty week. Do not read it as
  'nothing is scheduled'."*
- **Contract-version mismatch** → refuses to render rather than best-effort.
- **No platforms** → red *"No allocation could be computed"*, explicitly *"a finding, not an empty view"*.
- **A platform with zero slots** → red *"No slots — nothing will publish on X this week."*
- **Client not enrolled** → amber banner: the allocator is not consulted; production uses the legacy
  format; what is shown is **not** what production uses.
- **Grid empty** → distinct amber state, separated from not-enrolled.
- **Unmatchable rows** → red block listing each row (§6).
- An **unrecognised future `allocation_status`** normalises *away from* `allocated` — unit-tested, so a
  newer RPC can never make a degraded state read as healthy.
- `invalid_count` is **recomputed from entries**, never trusted — unit-tested against a lying aggregate.

Only a healthy, fully-valid allocation renders quietly.

**This is not hypothetical.** Live, `property-pulse` is the **only** format-mix-enrolled client;
`invegent`, `ndis-yarns` and `care-for-welfare` all hit `not_enrolled_legacy_fallback`, and their
Instagram/LinkedIn slots have **no legacy format at all** (`no_format_assigned`). Without these states,
three of four clients would have shown an empty panel indistinguishable from a healthy one.

---

## 6 · Sunday — surfaced before the repair, per PK

PK: *"Slice A must surface the mismatch even before the repair is applied."*

The panel renders a red block listing every enabled row whose `day_of_week` matches no isodow —
platform, time, raw `day_of_week`, schedule id — distinguishing `sunday_written_as_zero` from
`day_of_week_out_of_isodow_range`, and closing with *"Reported only — this panel does not modify the
schedule."*

**Nothing is repaired, activated, or rewritten.** The 24 disabled Sunday rows stay inert. Production
already excludes these rows from N, so the panel reports exactly the set production silently drops. The
repair is S2's packet with its own gate.

---

## 7 · Timing vs cc-0079 Slice 2 — **do not hold Slice 2 for this lane**

Slice 2 has a clean fresh external review (`600ac75e…`, agree) and is moving to its apply gate.

**The falsifiable proof does not depend on beating it.** The BEFORE state is already captured
machine-derived — twice, live — and frozen in this packet and in the test fixtures; the suite asserts
BEFORE *and* AFTER, so the panel can be verified against whichever state is live when it deploys.

Only the **operator-visible demonstration** (an operator watching 6→0 change on screen) needs Slice A
live before Slice 2 applies, and that would require: wrapper gate → apply → dashboard gate → deploy →
capture. That is a lot of gates to fit in front of an apply that is ready now.

> **Recommendation: let Slice 2 proceed on its own merits.** The demo is a nice-to-have; the proof is
> already secured. If PK wants the live before/after demo, that is a deliberate decision to sequence
> Slice 2 behind four gates — say so explicitly and I will hold.

---

## 8 · Gates, stop conditions, rollback

**Gate sequence:** **artifact 1 applied and §P1 passed** → re-run the stale-ref gate in both repos →
`branch-warden` (must be `safe`; changed set must equal §1 exactly) → external review pinned to
`17363dd31789a3e6ad4ee5e7bf68d9c1d9a26df4a7b014ee8dca1c95d763ca57` → **PK deploy gate (hard stop)** →
PK deploys → post-deploy visual check against §3.

**Stop conditions:** diff hash ≠ `reviewed_input_hash` · `origin/main` moved without re-gating ·
`branch-warden` not `safe` · changed set exceeds §1 · any cc-0054 target in the diff · any write path or
mutation appears · artifact 1 not applied or §P1 not passed · rendered output diverges from the wrapper
(§4.1) · any attempt to repair the Sunday defect in this lane.

**Rollback:** revert the additive block in `page.tsx` (1 commit) and delete the four new files — nothing
else imports them. Zero data blast radius: no row written, no grant on an existing object altered, no
existing function replaced. Worst case is a dashboard tab without one panel.

⚠ **Worktree note:** `C:\Users\parve\dashboard-wt-s6-slice-a` now holds a **real** `node_modules` (not a
junction), so `git worktree remove --force` is safe with respect to the main repo. Do not re-junction it
before removal.

---

## 9 · Open questions carried to PK's decision sheet (not blocking)

| # | Question | Where the answer would change the design |
|---|---|---|
| 1 | Render YouTube — `6 of 20` — or scope to LI/IG/FB at `6 of 15`? | one filter in the component + two test assertions |
| 2 | `p_week_start` is inert — accept the un-week-labelled panel, or open a lane to make the grid week-aware? | provenance copy only today; a real week-picker is a new lane |
| 3 | Sequence vs Slice 2 (§7) | sequencing only — no code change |
| 4 | Sunday disposition | none for Slice A; it detects either way |
| 5 | `cc-` ID + register block | recording only |
| 6 | **New:** only `property-pulse` is enrolled — is a mostly-legacy fleet expected, or is that itself a finding for the schedule program? | none for Slice A; the panel reports it truthfully either way |

---

## 10 · Non-claims

Does **not** claim: that this is deployed or approved for deploy · that artifact 1 exists in the database ·
that the happy path has been rendered in a browser (§2) · that Slice A completes the schedule redesign —
it is the first slice, and joining a format to a writable schedule row is explicitly **not** this lane ·
that the Sunday defect is fixed (it is detected) · that the panel's output is the format that will publish
(it is demand/allocation) · that CE `main`'s unpushed commit `565540d` was authored or pushed by this lane.
