# cc-0033 calibration probe — findings (evidence record)

**Date:** 2026-07-10 · **Lane:** cc-0033 probe (split from the wiring lane, PK-authorised)
**Status:** probe COMPLETE. No production surface touched. No commit. 3 render credits spent.

---

## 1. What was measured

Provider template `48cba556-0a53-4001-90f0-05420d10efc0` (`generic_market_insight_card_1x1_v1`),
fetched via `GET /v1/templates/{id}` with the production Creatomate key. Source JSON saved to
`generic_market_insight_card_1x1_v1_provider_template_source.json`.

**Canvas:** 1080 × 1080.

| Element | x | y | width | font | line_height | anchor |
|---|---|---|---|---|---|---|
| `Headline` | 7% | **26%** | 86% | Montserrat 800 @ **74px** | **105%** | `y_anchor: 0%` (top) |
| `Subtitle` | 7% | **— ABSENT —** | 82% | Montserrat @ 34px | 132% | `y_anchor: 0%` (top) |

### Root cause
`Subtitle` **has no `y` key**. Every other element on the card has one. It therefore falls back to
Creatomate's default (**50%** → 540px), confirmed by render. Meanwhile `Headline` is **top-anchored
at 280.8px and grows downward without bound**. Nothing in the template constrains the two.

The `Headline` element's own placeholder text reads: **`"Headline goes here in up to two lines"`** —
the template was authored for 2 lines.

### Collision arithmetic
Line box = 74 × 1.05 = **77.7px**. Headline top = 26% × 1080 = **280.8px**. Subtitle top = **540px**.

| Headline lines | Headline bottom | Result |
|---|---|---|
| 2 | 436.2px | 104px clearance |
| 3 | 513.9px | **26px clearance — SAFE** |
| 4 | 591.6px | **51.6px overlap — COLLIDES** |

**The true capability is: the headline must wrap to ≤ 3 lines.**

## 2. Model validation (3/3)

A PIL wrap simulation (Montserrat variable font instanced to `wght=800`, box 86% × 1080 = 928.8px,
greedy word wrap) was validated against three real Creatomate renders:

| Probe | Chars | Predicted | Rendered | Match |
|---|---|---|---|---|
| `A_78ch_reproduce.png` | 78 | 4 lines, collide | 4 lines, collide | ✅ reproduces the 2026-07-05 published card exactly |
| `B_65ch_avg.png` | 65 | 4 lines, collide | 4 lines, collide | ✅ |
| `C_53ch_predicted_safe.png` | 53 | 3 lines, clean | 3 lines, clean | ✅ |

## 3. THE DECISIVE RESULT — a character limit cannot work

Applying the validated model to the **actual headline text** of every real governed render
(joined `m.post_render_log` → `m.post_draft.image_headline`, label `creative_library_b1_production`,
status `succeeded`):

**7 of 17 real governed renders overprint (41%).**

Two headlines of **identical length (69 chars)** land on opposite sides of the boundary:

| Chars | Lines | Result | Headline |
|---|---|---|---|
| 69 | 3 | clean | `38 cents per unit — but the foreign tax credit detail is what matters` |
| 69 | 4 | **COLLIDES** | `Investors are still buying — they are just being a lot more selective` |
| 60 | 3 | clean | `RBA holds at 4.35% — two more years of cost pressure flagged` |
| 65 | 3 | clean | `8.60% annualised — but are you comparing the right risk profiles?` |

No value of `B1_HEADLINE_MAX_CHARS` separates the two 69-char cases. **Character count is not a
valid proxy for the capability.** Any calibrated char constant will either pass collisions or
reject clean headlines.

### Full verdict table (17 real renders; 6 `B1-v2 proof draft` rows excluded as non-posts)

| Date | Chars | Lines | Verdict |
|---|---|---|---|
| 2026-07-09 | 54 | 3 | ok |
| 2026-07-08 | 74 | 4 | **COLLIDES** |
| 2026-07-08 | 52 | 3 | ok |
| 2026-07-07 | 53 | 3 | ok |
| 2026-07-05 | 78 | 4 | **COLLIDES** ← the published card that triggered this lane |
| 2026-07-05 | 65 | 3 | ok |
| 2026-07-02 | 75 | 4 | **COLLIDES** |
| 2026-07-01 | 71 | 4 | **COLLIDES** |
| 2026-07-01 | 61 | 3 | ok |
| 2026-06-30 | 60 | 3 | ok |
| 2026-06-30 | 69 | 4 | **COLLIDES** |
| 2026-06-29 | 69 | 3 | ok |
| 2026-06-29 | 63 | 3 | ok |
| 2026-06-28 | 71 | 4 | **COLLIDES** |
| 2026-06-28 | 58 | 3 | ok |
| 2026-06-27 | 71 | 4 | **COLLIDES** |
| 2026-06-26 | 40 | 2 | ok |

## 4. Consequence for cc-0033

The brief's step "set `B1_HEADLINE_MAX_CHARS` to the calibrated number" is **disproven** and must be
replaced. The capability is `max_lines: 3`, which requires either:

- **(a) Deterministic wrap enforcement** — the worker/writer computes the wrap (proven simulatable
  to 3/3 accuracy here) and gates on line count. Real capability, no proxy. Needs font metrics at
  the enforcement point.
- **(b) Template-side fix** — give `Subtitle` an explicit `y` below the headline's maximum extent,
  and/or give `Headline` a bounded `height` with auto-fit (font shrink). This addresses the actual
  structural defect: the template is under-specified.
- **(c) Both** — (b) removes the collision; (a) keeps the writer honest.

## 4b. The general pattern

`B1_HEADLINE_MAX_CHARS = 90` was a proxy for a quantity **nobody had ever computed** (the line
budget), and the capability contract's `max_chars: 90` never reached the writer or the render gate.
These are the same disease: **governance metadata that the production path does not consult.**
A number that is declared, stamped, and reviewed — but never enforced against the thing it describes
— provides the appearance of a control without the control. The fix is not a better number; it is
making the capability the production path's actual input.

## 5. Scope / integrity notes

- Probe used the **production Creatomate key** (digest `8ab5a356…`, conveyed by PK from Downloads,
  never printed). Read-only USE + 3 renders. No key written to disk or repo.
- Renders went to the Creatomate account only. **No** `m.post_draft`, **no** publish, **no**
  `m.post_render_log` row, **no** Supabase storage write, **no** production code path invoked.
- Also established (peer-lane handoff): templates `901a30ce`, `c11bb8ab`, `48cba556` are **all
  co-resident** in the deployed key's account (18 templates total). The TMR-Proofing lane's
  runtime-mismatch risk for `c11bb8ab` is **closed, favourably**.
- `error code: 1010` on the Creatomate API is a **Cloudflare** browser-signature block, not an API
  error. Python `urllib` is blocked by default; a browser `User-Agent` header is required. An
  earlier read of this as "the key is render-only / template not found" was wrong and was corrected.
- The `pp-static-tmr-cross-platform-quality-proof-v1` closure (v5.27, "production-ready") passed
  cards that were overprinting. That proof did not inspect headline wrap.
