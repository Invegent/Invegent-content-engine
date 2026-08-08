# Brief cc-XXXX — Governed video-demand generation (POST-WATCH, GATE 1 DRAFT)

**Created:** 2026-08-08 Sydney · **Author:** CGU final-watch coordination session (PK directive 2026-08-08)
**Status:** **DRAFT — prepared during the watch, NOT a lane. Opens only by a separate post-watch PK Gate-1.**
**Task ID:** `cc-XXXX` — not allocated (deliberately; no lane opened today)
**Tier (proposed):** T2 for design/read-only quantification · **T3 for any schedule DML**
**Lane classification (CCF-02):** PRODUCT_PROOF

> **The question this brief exists to answer:** how should ICE **deliberately generate enough
> governed B-roll-capable video slots to produce visible recurring output — without outrunning the
> available asset pools?**
>
> It does **not** authorise sourcing, intake, schedule DML, or a cap raise. It is the shaped question
> plus the evidence, so the post-watch lane starts from proven numbers instead of re-deriving them.

---

## 1. Why this exists — the constraint was misidentified

The watch proved, by read-only end-to-end trace, that **B-roll output is demand-constrained, not
inventory-constrained.**

- Since B-roll capability went live (~2026-07-29), **pool depth blocked zero renders.**
- Where a B-roll-capable render actually ran, it used B-roll and published: **1 of 1, 100% conversion.**
- **Phase-2 as approved adds ZERO B-roll-capable slots** — its shape is a 17-row *text-led* base plus
  the E-1 *`image_quote`* increment for CFW, a client with no B-roll assets.

**More schedule volume does not produce more B-roll use.** That assumption is disproven, not assumed.

## 2. Proven baseline (read-only, 2026-08-07/08 — re-verify, do not inherit)

**Reachability — B-roll is addressable from exactly ONE fleet cell:**

| Dimension | Fact |
|---|---|
| Clients with `broll_background` assets | **PP only** (all 7 rows). NDIS / CFW / Invegent: zero. |
| Formats that consume a B-roll background | **`video_short_stat` only.** `video_short_kinetic` does not; `video_short_avatar` does not. |
| Platform | YouTube only (no FB/IG/LI video slots exist) |
| ⇒ B-roll-capable cell | **PP × YouTube × `video_short_stat`** |

**Forward demand over the next 7 days, from `format_preference`:**

| Client | Platform | `format_preference` | n | B-roll-capable |
|---|---|---|---|---|
| PP | youtube | `{video_short_stat}` | 1 (08-13, already failed) | ✅ |
| PP | youtube | `{video_short_kinetic_voice}` | 1 | ✗ |
| NDIS | youtube | `{video_short_avatar}` | 5 | ✗ (and no assets) |
| all others | fb/ig/li | image_quote · text · carousel · `{}` | 61 | ✗ |

**B-roll-capable forward demand = 1 slot, and it failed.** Effective recurring output = **zero**.

**Supply ceiling (measured, rolled-back-txn simulation + live confirm):** PP eligible B-roll pool
**3**, effective selection **2** after recent-use exclusion · governance floor 4 / target 6 →
`below_floor = true` · **no minimum-pool threshold exists in the resolver** ("POOL=6 MET" is a
governance figure, not code) · video has **no** shared-pool fallback · pool 0 → `fail_closed`, slot
does not fill · **no automatic backfill**.

**Mechanical note (`format_chosen` is not the signal):** `format_chosen` is NULL on every `future`
slot **by design** — format is assigned at *fill* time by the resolver, not at nightly
materialisation. `format_preference` is the forward-demand signal. Any lane reading `format_chosen`
to forecast demand will read zero and conclude wrongly.

## 3. The two-sided problem the lane must solve

Raising demand alone re-creates the **W-1 failure** on a second axis: added capacity on a thin pool
yields skips, not output (proven for NDIS text and image_quote). So the lane must move **both** sides
together, and must state the coupling numerically.

**The open design question, stated precisely:**

> For a target of *V* governed B-roll-capable video publications per week, what
> (a) schedule shape, (b) client/format enrolment, and (c) minimum eligible pool
> jointly sustain *V* without any slot reaching `fail_closed`?

Sub-questions the lane must answer with evidence, not assertion:

1. **Where does demand come from?** Raise PP `video_short_stat` cadence · enrol a second format as
   B-roll-consuming · enrol a second client (requires that client to have B-roll assets — none do) ·
   or extend B-roll to a format that already has volume. These are **not** equivalent in cost.
2. **What pool does *V* require?** Given recent-use exclusion, the effective selection is
   `pool − recently_used`. Derive the floor from *V* and the cooldown window; do not inherit "6".
3. **Should the resolver gain a real minimum-pool threshold?** Today "POOL=6 MET" is governance-only —
   nothing enforces it, and nothing re-checks pool contents against admission rules. A demand raise
   makes that gap load-bearing rather than latent.
4. **Which of the two silent-loss classes bites first at higher volume?** Both proven classes are
   video-render losses; more video slots means proportionally more silent loss unless the detector
   is operationalised.
5. **Does the 2026-08-08 `b1_video_governed_voiceover_failed` defect gate any of this?** A demand
   raise on a format whose render path has an open terminal defect would multiply failures.
   **Root-cause first — this is a hard precondition, not a parallel track.**

## 4. In scope (for the post-watch lane)

- Read-only quantification of options 1–3 above with real cadence/pool numbers.
- A recommended target *V* and the pool floor it implies, both derived and shown.
- A named sequencing that puts the render defect and detector ahead of any cadence raise.

## 5. Out of scope — forbidden

- **No B-roll sourcing or intake** (explicit PK ruling, 2026-08-08 — and the watch proved it would
  not move output).
- No schedule DML, no cadence/cap raise, no enrolment write inside this brief.
- No resolver change; no `platform_scope` / `copy_geo` governance change.
- Not a vehicle to reopen Phase-2 shape — Phase-2 is settled and simply orthogonal to B-roll.

## 6. Hard preconditions before the lane may open

1. Watch verdict delivered and Phase-2 ruled.
2. **`b1_video_governed_voiceover_failed` root-caused** (2026-08-08, draft `452f58b9`, attempt 11:
   0 ms, NULL `creatomate_render_id` — failed *before* reaching Creatomate). Raising video demand
   over an unfixed terminal render defect multiplies loss.
3. Silent-schedule-loss detector operationalised at a known cadence, so a demand raise is observable.

## 7. Success criteria

A single recommended target *V*, its implied minimum pool, the enrolment change that produces it, the
sequencing against the render defect and detector, and an explicit statement of what would have to be
true for the recommendation to be wrong — with every number evidence-cited and re-verified live.
