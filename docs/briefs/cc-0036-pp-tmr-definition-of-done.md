# Brief cc-0036 — PP TMR Definition of Done (product-decision packet)

**Created:** 2026-07-10 Sydney
**Author:** brief-author (draft) — returned to orchestrator for Gate 1
**Executor:** PK (decision packet — PK answers each open question; orchestrator records the accepted DoD)
**Status:** ✅ **ACCEPTED at Gate 1 — PK, 2026-07-10.** All seven recommended defaults accepted as-written (A-OQ1 named carry · B-OQ1 single-track determinism + tripwire · C-OQ1 IN-as-carry · C-OQ2 stat + stat_voice · C-OQ3 rotation-set only · C-OQ4 unreachable-only · D-OQ1 D1–D7 verbatim, D4/D5/D6 hard gates).
**DoD of record:** `docs/governance/pp-tmr-definition-of-done-v1.md`

---

> **Lane classification (CCF-02):** PRODUCT_PROOF (a definition-of-record decision) · **Tier T1** (docs/product-decision only — nothing implemented, applied, deployed, promoted, or reconciled). Gate 1 = PK acceptance, unchanged.

## Task

Retire the phrase *"Ultimate TMR for Property Pulse is done"* and replace it with a **testable Definition of Done**, so "done" stops being a moving target and a second-brand rollout inherits a copyable exit test.

## Pinned rulings (PK — do NOT re-open)

- The phrase *"Ultimate TMR for Property Pulse is done"* is **RETIRED**, replaced by three labels:
  - **PP Static TMR Done** — `image_quote` governed and production-ready.
  - **PP Video TMR First Proof Done** — `video_short_stat` renders successfully on a real governed PP draft.
  - **PP Ultimate TMR Done** — high-volume PP visual formats governed, defects resolved-or-carried, registry drift closed, safe to copy to another brand.
- **No broader brand rollout beyond READINESS-ONLY work** until this DoD is accepted.
- **Spine Gen v2 does NOT start** until ALL FOUR hold: cc-0035 closed · this DoD accepted · record/registry drift reconciled · cc-0033 plan accepted.
- **cc-0035 alone must NOT be used to declare Ultimate TMR done.**

## Scope

**In scope:** define the four completion levels + testable criteria; present each open question as OPTIONS + RECOMMENDED DEFAULT; state each label's true/near/false status with evidence.

**Out of scope:** implementing/applying/deploying/promoting anything; starting Spine Gen v2; closing cc-0035; re-planning cc-0033; reconciling the 11-vs-9 drift; recording the chokepoint regression; planning the rollout; **deciding any question** (PK decides).

## Forbidden actions

- **No implementation of any level.** Definition, not a lane.
- **No brand rollout beyond READINESS-ONLY** until accepted.
- **Do NOT start Spine Gen v2** — accepting this DoD satisfies exactly ONE of its four preconditions; it does not release it.
- **Do NOT let cc-0035 alone declare Ultimate done** — cc-0035 satisfies Level B, a strict subset of Level D.
- **Do NOT promote the fenced PP video B-roll** (`asset_id 42211c0f…`) — HELD per PK (v5.43).
- **cc-0033 stays HELD** pending its own Gate-1 re-plan.
- **Do NOT reconcile or silently close** the 11-vs-9 drift or the chokepoint regression here — they are Level-D criteria, routed to handoffs.

---

## Level A — PP Static TMR Done

*`image_quote` is governed and production-ready.*

| # | Criterion | Machine-check | Today |
|---|---|---|---|
| A1 | `image_quote` governed | `c.client_creative_governance` (PP, `image_quote`) `enabled=true` | **PASS** |
| A2 | Governed render proven on a REAL draft | ≥1 governed render-log row with non-null `post_draft_id` AND `client_id` | **PASS** — 320 drafts/90d ≈ 61% of visual; first TMR render published to FB (v5.09) |
| A3 | FB / IG pass | `pp-static-tmr-cross-platform-quality-proof-v1-result.md` matrix = FB PASS · IG PASS | **PASS** (v5.27) |
| A4 | LinkedIn carry-or-closure | governed LinkedIn image publish audit row, or cc-0030 named open | **CARRY** — native publish PROVEN + PARKED (v5.30) |
| A5 | Known static carries listed | enumerated list present | **Listed:** C1 geo-pairing · C2 scrim contrast · C3 sold_sign crop · C4 LinkedIn (cc-0030) — **plus** the overprint defect, see A-OQ1 |

**A-OQ1 — the headline-overprint defect.** 7 of 17 real PP static cards overprint the headline onto the subtitle; the real capability is `max_lines: 3`, which **disproves cc-0033's char-limit step**. **This defect is INSIDE the governed path.**

## Level B — PP Video TMR First Proof Done

*`video_short_stat` renders successfully on a real governed PP draft.*

| # | Criterion | Machine-check | Today |
|---|---|---|---|
| B1 | `video_short_stat` governed | `c.client_creative_governance` (PP, `video_short_stat`) `enabled=true` | **PASS** — flipped 2026-07-10 04:25:44Z |
| B2 | Real-draft governed render proven | ≥1 governed video render-log row with non-null `post_draft_id` AND `client_id` | **FALSE** — both rows (`e52df6b4`, `485571c5`) are null/null smokes. This is cc-0035. |
| B3 | Voice/music proven or excluded | see B-OQ1 | **PARTIAL** — combo audio rendered, PK aural PASS on the smoke; attribution is a closing window |
| B4 | Fail-closed proven | on a real draft: governed throw → `video_status='failed'` + render-log row, no legacy fallback ([index.ts:795-800](supabase/functions/video-worker/index.ts:795)) | **CODE-ONLY** — not exercised on a real draft |

**B-OQ1 — music attribution.** `m.music_usage_event` is unwired and `c11bb8ab`'s baked `MusicBed.source` is blanked, so audio-present proves a bed was **BOUND**, not **WHICH** track. Attribution holds only while `select_music('format','video_short_stat')` returns exactly one row.

## Level C — PP Visual TMR Done (scope decisions)

Visual drafts (ex-`text`) = **527/90d**. Four decisions set the boundary: **C-OQ1** carousel (94/90d) · **C-OQ2** which video formats (`stat` 15 · `stat_voice` 15 · `kinetic` 22 · `kinetic_voice` 12 · `avatar` 49) · **C-OQ3** all-17 vs rotation-set `production_proven` (today **2/17**) · **C-OQ4** is `visually_approved` sufficient for non-rotation templates.

## Level D — PP Ultimate TMR Done

| # | Criterion | Machine-check | Today |
|---|---|---|---|
| D1 | Governed format coverage | every in-scope format (C-OQ2) `enabled=true` | **PARTIAL** — 2 governed |
| D2 | Production-proven template coverage | every rotation-set template (C-OQ3) `assignment_status='production_proven'` | **2/17** |
| D3 | Platform coverage | FB PASS · IG PASS · LinkedIn carry-or-closed · named video-publish target | **PARTIAL** |
| D4 | Drift-free declarative registry | `property-pulse.json` pool == live governed+active pool == register figure | **DRIFT OPEN — live 11 vs declarative 9** (Spine Gen v1; "Phase 4" never happened) |
| D5 | No live governed-path defects | defect register empty OR every entry explicitly carried | **DEFECT OPEN** — 7/17 overprint |
| D6 | No PP-hardcoded chokepoint regression | Grep of PP identity literals in the governed worker path trends to 0, each register-recorded. Known: [b1_video_stat.ts:32](supabase/functions/video-worker/b1_video_stat.ts:32), [index.ts:981](supabase/functions/video-worker/index.ts:981) | **REGRESSED + UNRECORDED** — audit named 5 chokepoints; 1 closed, **2 added** (net 6); no register entry |
| D7 | Ready to copy to another brand | copy artifact carries no PP-hardcoded identity AND a second-brand dry-run resolves to a governed render without editing worker code | **FALSE** — depends on D4+D6 |

---

## Label status today

- **PP Static TMR Done — NEARLY TRUE** (substantially true, named carries). A1/A2/A3 PASS; A4 accepted carry. Only A-OQ1 unsettled.
- **PP Video TMR First Proof Done — FALSE.** B1 passes; B2 fails (zero real-draft governed renders), B4 code-only. cc-0035 would flip it.
- **PP Ultimate TMR Done — FALSE.** D4 drift, D5 defect, D6 regression, D2 = 2/17, C-scope unresolved.

## Open questions — PK decides (OPTIONS + RECOMMENDED DEFAULT)

**A-OQ1 — Overprint: carry or blocker for Static Done?**
Opt 1 named carry · Opt 2 blocker.
**DEFAULT: Opt 1 (named carry).** `image_quote` is governed and rendering at volume; this is a template-calibration bug with a known real fix (`max_lines: 3`), not a governance failure. Carry it explicitly; gate its closure at D5, not Level A.

**B-OQ1 — Music attribution for First Video Done?**
Opt 1 single-track determinism suffices · Opt 2 require `m.music_usage_event` wired.
**DEFAULT: Opt 1, with a tripwire.** Accept single-track determinism now; add a machine tripwire — `select_music('format','video_short_stat')` MUST return exactly 1 row. The day a 2nd track is approved, First Video Done reverts to needing attribution.

**C-OQ1 — Carousel IN or OUT?**
Opt A IN · Opt B OUT · Opt C IN-as-carry.
**DEFAULT: Opt C (IN-as-carry).** Excluding the 2nd-largest visual surface silently makes "Ultimate" hollow; requiring a full carousel build makes it unbounded.

**C-OQ2 — Which video formats in scope?**
Opt A `stat` only · Opt B `stat` + `stat_voice` · Opt C all five.
**DEFAULT: Opt B**, with `kinetic`/`kinetic_voice`/`avatar` as READINESS-ONLY carries. `avatar` (49/90d) depends on the Character Model / Brand-Host lane and should not gate Ultimate v1.

**C-OQ3 — All 17 templates production_proven, or rotation set only?**
Opt A all 17 · Opt B rotation set only (non-rotation may stay `visually_approved` IF fenced out of rotation).
**DEFAULT: Opt B.** Requiring all 17 blocks on templates the resolver never selects.

**C-OQ4 — Is `visually_approved` sufficient for non-rotation templates?**
Opt A yes unconditionally · Opt B yes ONLY if provably unreachable by the live resolver.
**DEFAULT: Opt B.** Check: no `visually_approved` assignment is selectable by `select_template` for the governed platform set.

**D-OQ1 — Confirm the Ultimate coverage/drift/regression/copy targets.**
**DEFAULT:** adopt the D1–D7 table verbatim, with **D4/D5/D6 as the three hard reconciliation gates** — they are the concrete blockers today.

## Success criteria (for THIS packet)

- PK can answer each of A-OQ1, B-OQ1, C-OQ1..4, D-OQ1 with a single decision.
- Each label has ≥1 criterion testable by a query or named artifact, not judgment alone.
- Each label's true/nearly-true/false status is stated with evidence.

## Stop condition

Present for PK Gate-1 acceptance. On acceptance, orchestrator records the four-level DoD + PK's decisions as a governance doc + Convention-1 register pointer, then stops. **Acceptance satisfies exactly ONE of the four Spine-Gen-v2 preconditions; it does not release Spine Gen v2.**

## Handoffs

- **db-rls-auditor** — at the Ultimate gate: live eligible pool count (D4, asserted 11 vs declarative 9); `select_music` single-row invariant (B-OQ1); `resolve_brand_assets` brand-genericity (its DDL was absent from repo migrations at the readiness audit).
- **register-reconciler** — record the ARC regression (2 re-added PP literals, D6) against the 5-chokepoint baseline, and the 11-vs-9 drift carried since Spine Gen v1 "Phase 4" (D4).
- **cc-0033 re-plan lane** — D5 governed-path defect.
