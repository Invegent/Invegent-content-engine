# Image Harvesting — Candidate Verdict Table + Licence Policy Decisions

> **PK RATIFICATION (2026-07-05): ALL SIX POLICY ROWS RATIFIED AS RECOMMENDED — now standing ICE image-licence policy:**
> 1. **CC BY-SA: EXCLUDED** for production backgrounds (holds still recorded for visibility). The superseded Orderinchaos day-skyline hold is **CLOSED**; the Ascot aerial hold converts to a plain record under the exclusion (Perth-aerial carry continues via other paths).
> 2. **CC BY: EXCLUDED for v1** (no attribution plumbing in publishers; revisit only on critical gap).
> 3. **AI-generated imagery: EXCLUDED** for photographic backgrounds (narrow revisit only if/when the abstract-map design row activates).
> 4. **Paid stock: per-asset PK-named purchase process established** — licence docs recorded in `asset_meta`; no standing subscription.
> 5. **Commissioned-shoot path: RATIFIED as a named sourcing route** (mini-brief per asset; strongest rights posture).
> 6. **Auction/crowd gap: ACCEPTED** — auction content renders over the generic pool; revisit when theme-aware selection lands or format evidence justifies bespoke art.
>
> These rows supersede the interim Q5 holds (CC BY pending-rule is now resolved). Candidate verdicts in §1 remain proposals except where PK-stated; no image state changed by this ratification.

**Date:** 2026-07-05 · **Lane:** Session-2 planning · T1/T2 · SAFETY_GATE · **read-only** (no intake, no promotion, no upload, no DB/storage mutation, no rotation change — verified: this lane wrote only `_harness/image_harvester_v0/policy_review/`).
**Visual companion:** `verdict_sheet.jpg` (pending-decision images, badge-annotated, grouped). Full-res originals in the run packages; verdicts here are **proposals except where marked PK-stated**.

## 1. Visual verdict table

### Set A — run 1 offered (cc-0027 original 8)
| Candidate | Source | Verdict | Basis |
|---|---|---|---|
| mm_a-01 Martin David regional aerial | Unsplash | **ACCEPT_VISUAL_ONLY** *(PK-stated)* | best-pick; reviewer PASS |
| mm_a-02 Villanova signage | Unsplash | **REJECT** *(PK-stated)* | readable school name inside 1:1 crop |
| mm_a-03 Sydney suburbs | Unsplash | ALTERNATE | busy texture, needs ≥60 scrim; faint CBD haze |
| mm_a-04 nadir top-down | Pexels | ALTERNATE | portrait vs landscape brief; strongest 1:1 surface of row |
| mm_b-01 contract+keys | Pexels | **ACCEPT_VISUAL_ONLY** *(PK-stated; zoom condition CLOSED — unsigned Ukrainian template, zero PII)* | best-pick |
| mm_b-02 Żerdzicki (Unsplash copy) | Unsplash | ALTERNATE | keep this copy (lighter compression) |
| mm_b-03 Żerdzicki (Pexels dup) | Pexels | **REJECT** *(PK-stated: not both)* | same-frame duplicate of -02 |
| mm_b-04 rc.xyz single key | Unsplash | ALTERNATE (partial-fit) | half-brief; best overlay surface; pseudonymous creator (licence unaffected) |

### Set B — run 2 stress / day-hero
| Candidate | Source | Verdict | Basis |
|---|---|---|---|
| mm_c-01 gl7nkS_h4lo | Unsplash | **DONE — LIVE IN PRODUCTION** (v5.02) | not a pending decision |
| mm_c-02 Zo1eudW62Ks across-Swan | Unsplash | ALTERNATE | max text-space fallback; road foreground, tiny non-identifiable figures |
| mm_c-03 rachelclaire Elizabeth Quay | Pexels | **HOLD** | reviewer PARTIAL_FIT_ONLY: bhp/RioTinto/AMP/Westpac/nab branding readable in the 1:1 text band; endorsement optics |
| mm_c 9 rejects (incl. guguFi5GTw4) | — | REJECT | over-refusal audit 9/9 justified; guguFi5GTw4 carries a revisit note if a moody-variant rule ever exists (unrecorded heavy signage noted) |
| mm_d Melbourne Auctioneer (Commons) | CC BY-SA | **REJECT** | rights-fatal regardless of licence rule: identifiable faces incl. children, 960px |
| mm_d avlxyz Beaconsfield (Flickr) | CC BY-SA | HOLD (academic) | hinges on CC BY-SA rule AND under-res (768×1024) — practically dead |

### Set C — registered proof set (DB truth today; recap, no decisions)
**Governed/active (6, production pool):** bg_perth_cbd · bg_brisbane_cbd · bg_sydney_cbd · bg_pp_au_suburb_aerial_grid · bg_pp_home_keys_contract_table · **bg_pp_perth_cbd_skyline_day_wide (fb/li only — LIVE, v5.02)**.
**Inactive intake candidates (5, double-fenced):** bg_pp_open_home_entry *(optional #3 — pool-sufficiency decision now that pool is 6)* · bg_pp_perth_skyline_dawn_moody · bg_pp_modern_home_exterior_front · bg_pp_for_sale_sign_street · bg_pp_sold_sign_closeup *(all four deferred pending theme-aware selection)*.

### Set D — rejected/held, clearly separated (standing record)
- **P0-lane CC holds (2026-07-03):** Orderinchaos South-Perth day skyline CC BY-SA → **REJECT proposed: superseded** (the live day-hero fills its purpose; recommend closing this hold) · **Ascot Perth aerial CC BY-SA → HOLD** (the ONLY Perth-specific suburb-aerial candidate ever found; its fate = the CC BY-SA rule below) · Daniel Lee dusk pano CC BY → REJECT (dusk, 730px, marginal).
- **Run-1 never-offered rejects (3):** European-style suburbs, EUR cash handover w/ people, hand-portrait — **NOT_FOR_PP** *(PK-stated: rejects stay rejected)*.
- **Prior-run leftovers** preserved untouched in `prior_run_20260705T1056/` (superseded row keys; never offered).

## 2. Licence-policy decision table (the six open rules)

| # | Policy | Current state | Options | Recommendation |
|---|---|---|---|---|
| 1 | **CC BY-SA** | hold (PK Q5) | (a) permanent EXCLUDE for production backgrounds; (b) allow w/ attribution + ShareAlike acceptance | **(a) EXCLUDE.** ShareAlike arguably attaches to scrim+text composites — untenable for branded cards. Cost is tiny: only the Ascot aerial meaningfully hinges on it (Perth-aerial carry stays open via other paths). Keep recording holds for visibility. |
| 2 | **CC BY** | hold pending PK rule | (a) EXCLUDE for production backgrounds; (b) allow w/ mandatory per-post attribution | **(a) EXCLUDE for v1.** ICE publishers have **no attribution plumbing** — obligation would ride every publish forever, unenforced. Revisit only if a critical gap demands it (none does today). |
| 3 | **AI-generated** | excluded v0 | (a) keep excluded; (b) carve-out for abstract/design assets | **(a) keep excluded for photographic backgrounds.** Revisit as a NARROW carve-out only when the P2 `abstract_perth_map` row activates (that row is an internal-design task anyway, likely no AI involvement needed). |
| 4 | **Paid-stock exception** | none exists | (a) per-asset PK-named purchase w/ licence docs recorded in asset_meta; (b) standing subscription; (c) none | **(a) per-asset process.** Needed eventually for auction + P1 people-rows (agent/tradie/couple all need model releases). No standing budget/subscription until volume justifies it. |
| 5 | **Commissioned-shoot path** | informal (PK-owned assets precedent) | define as named path w/ mini-brief per asset | **Define it.** Strongest rights posture; natural fits: auction crowd (rear-view spec), any future PP-authentic Perth imagery. Requires only a PK decision that it exists as a route — no build. |
| 6 | **Auction/crowd gap** | confirmed genuine (2 independent searches) | (a) accept gap — auction content uses the generic pool; (b) paid stock w/ release (rule 4); (c) commissioned (rule 5) | **(a) accept for now.** Auction posts render fine over the existing pool; blind rotation can't use a themed auction bg safely anyway (same logic that deferred the SOLD sign). Revisit when theme-aware selection lands or auction-format evidence justifies bespoke art. |

## 3. Recommended next gates (each separate, PK-called)
1. **Ratify the six policy rows** (one sitting; rows 1–3 close the Q5 pendings, rows 4–6 establish paths without spending anything).
2. **`bg_pp_open_home_entry` (#3) pool-sufficiency decision** — pool is now 6 on fb/li, 5 on ig; #3 would take ig to 6 (its scope is {fb,ig}); still governed by blind-rotation neutrality (it passed that test in the promotion review as "most neutral of the remainder").
3. **Agent-status call** — image-harvester + image-reviewer: two clean proving runs + one live production asset sourced end-to-end; promote to team table / more reps / iterate.
4. **Close the superseded Orderinchaos hold** (bookkeeping, rides on rule 1).
5. Longer horizon, unchanged: theme-aware selection (unlocks the 4 deferred sign/mood assets) · B3/B4 P1 harvest · Perth-specific aerial carry.

*Stop: PK review gate. Nothing in this packet changes any state.*
