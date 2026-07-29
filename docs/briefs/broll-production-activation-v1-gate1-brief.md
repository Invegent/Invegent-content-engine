# Brief — B-roll Production Activation v1

**Created:** 2026-07-28 Sydney
**Author:** chat (orchestrator)
**Executor:** Claude Code (orchestrator) — apply at PK gate
**Status:** draft — **awaiting PK Gate 1**
**Lane class:** PRODUCT_PROOF · **Tier:** **T3** (production-touching: changes live PP video selection)
**Result file:** `docs/briefs/results/broll-production-activation-v1-result.md` (on completion)

---

## Task

Governed B-roll selection is live and proven (v6.42, resolver v1.4) but **production cannot reach it**.
Template `dd5fd75e` (Creatomate `46c5c4ac`, `AU_generic_national_Suburb_9:16_V1`) sits at
`fit_status='candidate'` and loses the ranking to two `strong_candidate` incumbents on every real
production call. Make the proven B-roll path actually select on Property Pulse's live
`video_short_stat` production call — or decide deliberately not to.

**This brief does not assume the answer.** It carries a real fork (§ Decision required) that only PK
can settle, because the two routes have materially different blast radius and build cost.

## Source context

- `docs/briefs/results/governed-broll-consumption-v1-slice-b-result.md` — the proof this activates; also
  the source of the deliberate containment we would now be removing.
- `docs/briefs/results/governed-broll-resolver-s3-status.md` — the **discarded** competing S3 design.
  **Do not apply `s3_forward.sql`; do not run `s3_rollback.sql`** (it would silently revert live v1.4).
- `supabase/functions/video-worker/index.ts:1231` — the live production caller.
- Live DB, verified 2026-07-28: `public.select_template`, `public.resolve_slot_assets` (v1.4),
  `c.creative_template_variant_candidate`, `c.client_brand_asset`.

### Live mechanics — verified, and they correct an earlier assumption

The production caller is:

```
select_template(p_client_slug=<governed slug>, p_platform=null,
                p_format='video_short_stat', p_variant_intent=null, p_seed=<post_draft_id>)
```

**`platform_suitability` rows are irrelevant here.** `select_template` evaluates suitability only when
`p_platform IS NOT NULL`. With `p_platform=null` that whole rung is skipped, so adding suitability rows
to `dd5fd75e` would change **nothing** about production selection. (An earlier framing of this lane said
otherwise; it was wrong.)

The only ranking lever is:

```
v_ranked := v_b_intent_strong || v_b_intent_other || v_b_strong || v_b_other
```

With `p_variant_intent=null` both intent buckets are empty, so the winner is the first
`fit_status='strong_candidate'` row in registry order (`t.created_at ASC, t.id ASC, vc.variant_key ASC`).

Current `video_short_stat` candidates — all `generic` scope, all `visually_approved`, all with a PP
assignment `visually_approved` + a passed `visual_approval` proof:

| Registry order | variant_key | fit_status | template | bucket |
|---|---|---|---|---|
| 1 (2026-07-09) | `stat-reveal-9x16-video-v2` | **strong_candidate** | `a3d8472d` (`c11bb8ab`) | `v_b_strong` → **WINS today** |
| 2 (2026-07-26) | `stat-reveal-9x16-governed-av-v2` | **strong_candidate** | `4cd2c9e2` (`03bc6a3c`) | `v_b_strong` |
| 3 (2026-07-28) | `stat-reveal-9x16-broll-v1` | `candidate` | `dd5fd75e` (`46c5c4ac`) | `v_b_other` |

**Consequence: promoting `dd5fd75e` to `strong_candidate` is NOT sufficient.** It would join `v_b_strong`
but in position 3 by `created_at`, so `a3d8472d` still wins. Making B-roll the default therefore requires
**demoting both incumbents** — a three-row change, not a one-row change.

## Decision required (PK — Gate 1)

**Route A — Repoint (data-only).** Promote `dd5fd75e` → `strong_candidate`; demote `a3d8472d` and
`4cd2c9e2` → `candidate`. B-roll becomes PP's default governed video.
*Cost:* one contained DML on 3 rows, fully reversible. *Blast radius:* **100% of PP governed
`video_short_stat` output switches to B-roll footage.* No EF deploy.

**Route B — Intent-driven (code).** Leave ranking untouched; change the caller to pass a
`p_variant_intent`, letting B-roll be chosen per slot/schedule alongside the incumbents.
*Cost:* `video-worker` code change + **EF deploy (T3 hard stop)** + a decision about what drives the
intent. *Blast radius:* opt-in per draft; incumbents unaffected.

**Recommendation: Route A**, on the grounds that it is data-only, instantly reversible, and `dd5fd75e`
is your most capable template (the only one registering a video Background + all four text fields +
Logo; `a3d8472d` registers only Background+Logo, `4cd2c9e2` only Logo). Route B is the better end-state
but should follow inventory breadth, not precede it — see risk 1.

## Scope

**In scope**
- The PK-selected route (A or B) for PP `video_short_stat` only.
- Live post-apply proof that the production call signature now selects (or deliberately does not select)
  the B-roll template, plus one end-to-end governed render.
- Correcting the `safe_for_text_overlay` value on clip `42211c0f` **if** PK elects it (see risk 3).

**Out of scope**
- Any other client. **Corrected rationale (db-rls-auditor, round 3):** an earlier draft said NDIS/CFW/
  Invegent "have no video governance row". That is **false** — `ndis-yarns` *does* have a
  `video_short_stat` assignment (`visually_approved`, visual proof passed 2026-07-20) and
  `select_template('ndis-yarns',…)` returns `ok` today. The operative reason blast radius is confined to
  property-pulse is **stronger**: the B-roll template `dd5fd75e` has **no client↔template assignment**
  for any other client, and assignment gating sits **upstream** of `fit_status` — every other client
  rejects it with `no_assignment`, so no `fit_status` edit can flip them. Verified live per-client:
  property-pulse → `ok`/`dd5fd75e`; ndis-yarns → `ok`/`a3d8472d` (both other templates rejected
  `no_assignment`); care-for-welfare + invegent → `fail_closed`/`no_selectable_template`.
  NDIS keeps selecting `a3d8472d`, which stays selectable at `candidate` (the bucket split is two-way:
  `strong_candidate` vs everything else).
- Any other format; any 1:1 or non-`video_short_stat` breadth.
- B-roll inventory sourcing (Asset Gap Video B-roll Intake v1 — its own Gate 1).
- Promoting the fenced Perth clip `42211c0f` to production.
- Re-opening the discarded S3 resolver design.

## Allowed actions

- Read-only inspection of live DB, repo and registers.
- Author the migration + a **proven rollback** before any apply; hash-pin both.
- Run the full T3 review chain: `db-rls-auditor`, `apply-harness-auditor` (shadow, pre-freeze),
  external `ask_chatgpt_review` pinned to the frozen hash, `branch-warden` before any commit.
- Apply **only** at an explicit PK gate (or a Convention-2 hash-pinned sequence with named STOPs).
- Post-apply: `deploy-verifier` if and only if Route B involves an EF deploy.

## Forbidden actions

- **Do not run `_harness/cc_broll_resolver_20260728/s3_rollback.sql`** — no self-verify, and its
  safe-fail precondition does not fire; it would silently revert live resolver v1.4.
- Do not modify `resolve_slot_assets` or `select_template`. This lane is registry/caller only.
- Do not weaken any eligibility fence (`is_active`, `approved`, licence, bucket, text-safety) to make a
  clip selectable.
- Do not promote, unfence, or alter clip `42211c0f` except the explicit sfto correction if PK elects it.
- Do not publish externally; do not touch a publisher path.
- No commit or push without explicit PK instruction (Convention 1: one register pointer per terminal state).

## Success criteria

1. **Selection changes as intended.** `select_template('property-pulse', null, 'video_short_stat', null, <seed>)`
   returns `selected.template_id = dd5fd75e` with `slot_resolution.modifications['Background.source']`
   pointing at the governed clip — for Route A. (Route B: the same, only when the intent is supplied,
   with the no-intent call provably unchanged.)
2. **Fail-closed fallback proven.** With the B-roll clip made temporarily ineligible **inside a
   rolled-back transaction**, `select_template` falls through to an incumbent rather than failing the
   slot. (See risk 2 — this should hold by construction; prove it, don't assume it.)
3. **One end-to-end governed render** through the real worker path completes within the 2-min Creatomate
   ceiling, with measured audio (not declared) and legible text over the footage.
4. **No fence weakened** — post-apply re-read shows every eligibility gate at its pre-apply value.
5. **Rollback proven before apply**, and re-verified as still valid after.

## Stop condition

Report per `docs/briefs/_template_result.md`, then stop. Any non-clean review verdict, any STOP
condition tripping, or a selection result other than the one predicted → halt and surface to PK.

---

## Notes — risks and gotchas found while scoping

1. **⚠ The eligible B-roll pool is exactly ONE clip.** Only `2d62b04e`
   (`broll_pp_au_suburb_aerial.mp4`) passes the gates. A seeded pick over a pool of one is deterministic,
   so under Route A **every PP governed video gets the identical AU suburb aerial**. This is the
   strongest argument for sequencing inventory intake alongside or before activation, and PK should
   weigh it as a content-quality decision, not just a technical one.

2. **Fallback is graceful by construction — but verify.** If the clip later becomes ineligible,
   `resolve_slot_assets` fail-closes, `select_template` rejects `dd5fd75e` with
   `assets_fail_closed:no_governed_background`, and (under Route A) the demoted incumbents still sit in
   `v_b_other` and win. So the slot degrades to a still-background video rather than dying. Criterion 2
   exists to prove this rather than trust it.

3. **⚠ `safe_for_text_overlay='needs_gradient_scrim'` is not a recognised value.** The fenced Perth clip
   `42211c0f` carries it, but resolver v1.4 accepts only `'true'` and `'needs_scrim'` — anything else
   returns `text_safety_unknown`. If that clip is ever promoted without correcting this, it will
   **silently fail closed** and look like a promotion that did nothing. Worth fixing at intake time even
   though promotion is out of scope here.

4. **Geo.** The active clip is AU-national suburb aerial; `label_constraint`/`geo_scope` are not
   machine-enforced. PP copy naming a specific city (e.g. "Perth") over generic national footage is a
   known, unresolved authenticity carry (C1 class), not introduced by this lane but amplified by making
   B-roll the default.

5. **`platform_scope=['youtube']` is inert on this path.** The clip is youtube-scoped, but
   `resolve_slot_assets` skips the platform filter when `p_platform IS NULL` — which is the production
   signature. The clip is therefore eligible for production regardless of the scope tag. Flagging so the
   tag is not mistaken for a control that is actually constraining anything here.

6. **Audio is declared, never measured** (`video-worker/qa.ts`). Criterion 3 requires a real measurement,
   not a `status='succeeded'` row — a silent video has previously been recorded as a success.
