# cc-0091 A3 — design finding: the silent-degradation path is located

**Created:** 2026-08-08 Sydney · **Author:** Claude Code (cc-0091 Gate A, A3)
**Status:** DESIGN FINDING — **no code written, nothing applied.** Contains a design fork that
is PK's call.
**Brief:** `docs/briefs/cc-0091-distribution-audience-growth-gate-a-brief-v3.md` (ISSUED, `241cb1c1`)

---

## 1. The path is `m.fill_pending_slots`, and it is a known, deliberately-deferred residual

```
COALESCE(v_slot.format_preference[1], 'image_quote')
```

Live in `m.fill_pending_slots` at **four** sites (function lines 91, 122, 242, 390; 34,417 bytes).
When a slot carries no format preference, it silently becomes `image_quote` — a static post — and
**nothing anywhere records that a format was wanted and not produced.**

This is not a newly-discovered bug. It is **residual R2a**, named explicitly in the retired S7
design of record:

> *R2a — a dropped non-enrolled preference routes to `m.fill_pending_slots`' default
> `COALESCE(format_preference[1],'image_quote')`; image_quote is NOT valid on YouTube. Airtight for
> FB/IG/LI; a YouTube-default hole remains (optional sub-change 3 in `m.fill_pending_slots` — NOT in
> this migration).*

Source: `NOT_APPLIED_20260725120000_durable_platform_support_guard_grid_and_materialiser.sql`,
retired to `ice-wt/watch-hygiene-20260808/` (commit `26d67e3`, class UNAPPLIED EXECUTABLE RISK — do
not restore; it would regress two live functions). It was known, scoped out, and never picked up.

## 2. A3 is NOT adding a guard to an unguarded system

The capability gate **is already live and deliberately fail-closed**. `m.build_weekly_demand_grid`
carries `capability_gated` with `COALESCE((cf.platform_support ->> es.platform)::boolean, false)`
— shipped as `20260801023502 s7_demand_grid_capability_guard_v1` on 2026-08-01, seven days ago, to
stop platform-invalid slot materialisation (a real production bug).

**So the collapse of absent→false was an intentional safety decision, not an oversight.** A3 must
not simply stop collapsing — that would reopen the S7 bug.

Read PK's governing statement precisely:

> *Capability data must not be allowed to **silently** remove requested format capability from a
> schedule. Unsupported, null, or unproven capability must **surface as an explicit gap/status**…*

The requirement is **observability, not permission**. A3 keeps the fail-closed behaviour and makes
the drop *visible*. There is precedent for exactly this in the same retired design: sub-change 2
surfaced a `v_dropped_pref` counter "in the return jsonb for observability."

**That counter never landed** — live `m.materialise_slots` has no `v_dropped_pref` (verified against
`pg_get_functiondef`). Sub-change 1 shipped under a different ledger entry; sub-change 2 did not.

## 3. Scale — this is the majority path, not an edge case

Slots created in the last 60 days with **no** `format_preference`, therefore defaulting to
`image_quote`:

| Platform | Slots | Defaulted | % |
|---|---|---|---|
| **linkedin** | 346 | 211 | **61.0%** |
| **instagram** | 319 | 175 | **54.9%** |
| youtube | 196 | 8 | 4.1% |
| facebook | 332 | 9 | 2.7% |

**Honest caveat:** "no preference" is not proof that a capability gate dropped one. Non-enrolled
clients never receive a grid-allocated preference at all, so this figure mixes *never-assigned* with
*assigned-then-dropped*. The two are **indistinguishable in the current data** — and that
indistinguishability is itself the defect. You cannot currently tell "deliberately static" from
"wanted video, couldn't produce it, degraded quietly."

**Live latent bug surfaced in passing:** 8 YouTube slots defaulted to `image_quote`, which YouTube
cannot publish. That is R2a's named hole, live. Not fixed here; flagged.

## 4. THE DESIGN FORK — PK's call

When a requested format cannot be produced, what happens to the slot?

**Option A — fill with fallback, record the degradation.**
Slot still fills as `image_quote`; a gap record + capability status is written. Content volume
unchanged; the degradation becomes visible and attributable.
*Satisfies the governing statement minimally. Lowest risk. Does not reduce output.*

**Option B — do not fill; surface the gap and leave the slot unfilled.**
Strongest honesty: ICE stops producing content it did not intend to produce.
*Reduces content volume, possibly materially on IG/LI given the 55%/61% figures. A behavioural
change to the nightly path.*

**Option C — fill only if the fallback is itself platform-valid, else skip; record either way.**
Fixes the live YouTube hole as a side effect. Middle ground.
*Requires the fallback to be capability-checked — more surface than A, less volume risk than B.*

**Recommendation: A now, C next, B only if you want volume to reflect capability.**
A is the only option that satisfies PK's statement without a nightly-path behaviour change, which
matters because Gate A must make **zero live behaviour change** — A is buildable and testable now
and applies later; B and C are behavioural and belong with A2a in Gate B. Choosing A now does not
foreclose C.

## 5. Scope reality — this is T3, not a small edit

`m.fill_pending_slots` is 34 KB on the nightly publish path. Any change is **T3** by the brief's own
tiering (production-touching). Gate A applies nothing, so A3's deliverable is
artifact + test + rollback, not an apply. But PK should know the target is a large production
function before the packet arrives, not after.

## 6. What does NOT need building — extend, don't rebuild

Three consumers already implement a three-state read (from the A1 cross-consumer audit):

- `public.get_global_format_capability_pyramid` — already emits `'unknown'` for a raw value that is
  neither `'true'` nor `'false'`
- `public.get_week_format_allocation` — already computes `(platform_support ? platform) AS
  support_key_present`
- `public.get_publishing_plan_pyramid` — already branches on the raw value

A3's three-state model should **extend these**, not invent a parallel one. The seven
`COALESCE(...,false)` decision-path consumers are where the collapse actually happens.

## Non-claims

- Not claimed: that all 175 IG / 211 LI defaulted slots are capability drops. They are not
  separable in current data — that is the defect, not the measurement.
- Not claimed: any fix to the YouTube `image_quote` hole. Flagged only.
- Not done: no code written, no function altered, no migration authored, nothing applied.
