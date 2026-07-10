CLAIMED v5.46 · cc-0036 PP TMR Definition of Done · main-checkout C:\Users\parve\Invegent-content-engine · gate: PK Gate-1 ACCEPTED → register pointer (pending PK commit instruction) · 2026-07-10T06:05Z

# PP TMR — Definition of Done v1 (ACCEPTED)

**Accepted:** 2026-07-10 Sydney · PK Gate 1
**Source packet:** `docs/briefs/cc-0036-pp-tmr-definition-of-done.md`
**Status:** the DoD **of record**. Supersedes the retired phrase *"Ultimate TMR for Property Pulse is done"*.

---

## The three labels (PK ruling — the phrase they replace is retired)

| Label | Meaning | Status 2026-07-10 |
|---|---|---|
| **PP Static TMR Done** | `image_quote` is governed and production-ready | **NEARLY TRUE** — carries named; overprint carried (A-OQ1) |
| **PP Video TMR First Proof Done** | `video_short_stat` renders on a real governed PP draft | **FALSE** — zero real-draft governed renders (cc-0035 in flight) |
| **PP Ultimate TMR Done** | high-volume visual formats governed, defects resolved-or-carried, drift closed, safe to copy | **FALSE** — D4 / D5 / D6 open |

**cc-0035 alone cannot declare Ultimate done.** It satisfies Level B, a strict subset of Level D.

## Accepted decisions (PK, 2026-07-10 — all seven defaults, as-written)

| # | Decision | Accepted ruling |
|---|---|---|
| A-OQ1 | Overprint defect | **Named carry.** Static Done stands with the 7/17 defect enumerated; closure gated at **D5**, not Level A. It is a template-calibration bug with a known real fix (`max_lines: 3`), not a governance failure. |
| B-OQ1 | Music attribution | **Single-track determinism suffices, with a self-tripping tripwire.** `select_music('format','video_short_stat')` MUST return exactly 1 row. The day a 2nd track is approved, First Video Done **reverts** to requiring per-track attribution (`m.music_usage_event` wired). |
| C-OQ1 | Carousel (94 drafts/90d) | **IN-as-carry.** In scope for Ultimate; satisfiable by governed **or** explicitly carried. Not a Static/First-Video blocker. |
| C-OQ2 | Video formats in scope | **`video_short_stat` + `video_short_stat_voice`.** `kinetic`, `kinetic_voice`, `avatar` are **READINESS-ONLY carries** — `avatar` (49/90d) depends on the Character Model / Brand-Host lane and does not gate Ultimate v1. |
| C-OQ3 | Template proof bar | **Rotation set only.** Non-rotation templates may remain `visually_approved` **if fenced out of rotation**. |
| C-OQ4 | `visually_approved` sufficiency | **Only if provably unreachable** by the live resolver. Check: no `visually_approved` assignment is selectable by `select_template` for the governed platform set. |
| D-OQ1 | Ultimate targets | **D1–D7 adopted verbatim**, with **D4 / D5 / D6 as the three hard reconciliation gates**. |

## The exit test (machine-checkable — no criterion resolves by judgment)

**Level A — Static Done:** `c.client_creative_governance` (PP, `image_quote`) `enabled=true` · ≥1 governed render-log row with non-null `post_draft_id` AND `client_id` · FB PASS + IG PASS per the cross-platform matrix · LinkedIn carried (cc-0030) · carries enumerated (C1 geo-pairing · C2 scrim · C3 crop · C4 LinkedIn · **overprint 7/17, carried per A-OQ1**).

**Level B — First Video Proof Done:** `enabled=true` for `video_short_stat` · ≥1 governed video render-log row with non-null `post_draft_id` AND `client_id` and `variant_key='stat-reveal-9x16-video-v2'` · `select_music(...)` returns exactly 1 row (the B-OQ1 tripwire) · fail-closed exercised on a **real** draft (governed throw → `video_status='failed'` + render-log row, no legacy fallback).

**Level C — Visual scope:** governed set = {`image_quote`, `video_short_stat`, `video_short_stat_voice`}; carousel IN-as-carry; `kinetic` / `kinetic_voice` / `avatar` readiness-only.

**Level D — Ultimate Done:**
- **D1** every in-scope format `enabled=true`.
- **D2** every rotation-set template `assignment_status='production_proven'`. *(today 2/17)*
- **D3** FB PASS · IG PASS · LinkedIn carried-or-closed · a named video-publish target.
- **D4 (HARD GATE)** `property-pulse.json` pool == live governed+active pool == register figure. *(today: live **11** vs declarative **9** — carried since Spine Gen v1's never-executed "Phase 4")*
- **D5 (HARD GATE)** governed-path defect register empty **or** every entry explicitly carried. *(today: 7/17 overprint, carried per A-OQ1; closure via the cc-0033 re-plan)*
- **D6 (HARD GATE)** no PP-hardcoded chokepoint regression: every PP identity literal in the governed worker path is register-recorded and trending to 0. *(today: audit named **5**; Spine Gen v1 closed **1**; the video-worker lane **added 2** — [b1_video_stat.ts:32](supabase/functions/video-worker/b1_video_stat.ts:32), [index.ts:981](supabase/functions/video-worker/index.ts:981) — **net 6, unrecorded**)*
- **D7** the copy artifact carries no PP-hardcoded identity **and** a second-brand dry-run resolves to a governed render **without editing worker code**.

## Standing fences (in force on acceptance)

- **No brand rollout beyond READINESS-ONLY work.**
- **Spine Gen v2 does NOT start** until ALL FOUR: (1) cc-0035 closed · (2) this DoD accepted ✅ · (3) record/registry drift reconciled · (4) cc-0033 re-plan accepted. **Acceptance of this DoD satisfies precondition (2) only.**
- **cc-0033 stays HELD** pending its Gate-1 re-plan; the char-limit step is disproven by `max_lines: 3`.
- **PP video B-roll (`42211c0f…`) stays fenced**, not promoted; it is not a DoD criterion.

## Open handoffs

- **db-rls-auditor** — live eligible pool count at the Ultimate gate (D4); `select_music` single-row invariant (B-OQ1 tripwire); `resolve_brand_assets` brand-genericity (its DDL was absent from repo migrations at the readiness audit).
- **register-reconciler** (TMR Fixups lane) — record the ARC regression (D6) against the 5-chokepoint baseline, and the 11-vs-9 drift (D4).
- **cc-0033 re-plan lane** (TMR Image lane) — D5.
- **TMR Readiness** — author the D7 second-brand exit test; it is the weakest-specified criterion and the rollout depends on it.
