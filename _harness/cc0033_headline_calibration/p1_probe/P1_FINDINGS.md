# cc-0033 probe P1 — findings (evidence record)

**Date:** 2026-07-10 · **Lane:** cc-0033 re-plan, probe P1 (PK-authorised: "run P1")
**Status:** probe COMPLETE. No production surface touched. No commit. 3 render credits spent.
**Question P1 was cut to answer:** does Creatomate honour *geometry* keys in template-mode
modifications — i.e. is design **R1** (a code-side fix, no provider-template write) alive or dead?

**Answer: R1 is ALIVE. Both candidate mechanisms work.**

---

## 1. Method

Provider template `48cba556-0a53-4001-90f0-05420d10efc0`, `POST /v1/renders` in template mode.
Headline fixed across all three probes to a **real colliding headline** from the live render set —
`"Investors are still buying — they are just being a lot more selective"` (69 chars, wraps to 4
lines; `CALIBRATION_FINDINGS.md:64`). The only variable is the modification set.

Key: production Creatomate key (digest `8ab5a356…`), read from PK's Downloads at runtime, never
printed, never written to disk. The `CREATOMATE_API_KEY` env var on this machine is a **different,
invalid** key (digest `df13b951…`) — confirmed by digest, not by trial. Browser `User-Agent` set
(Cloudflare `error code: 1010` otherwise).

Script: `run_p1.py`. Renders: `P1a_control.png`, `P1b_subtitle_y.png`, `P1c_autoshrink.png`.
Render ids in `p1_results.json`. No `m.post_draft`, no publish, no `m.post_render_log` row, no
storage write, no production code path invoked.

## 2. Results

| Probe | Modifications added | Rendered | Verdict |
|---|---|---|---|
| **P1a** control | none (text fields only) | headline 4 lines; subtitle overprints the word "selective" | **collides** — reproduces the live defect exactly |
| **P1b** | `Subtitle.y: "60%"` | headline 4 lines; subtitle clears below | **clean** |
| **P1c** | `Headline.height: "24%"`, `Headline.font_size: null`, `Headline.font_size_minimum: "30 px"`, `Headline.font_size_maximum: "74 px"` | headline auto-shrinks and re-wraps to **3 lines**; subtitle clears at its default `y` | **clean** |

## 3. What each result establishes

**Geometry keys are honoured.** `Subtitle.y` was applied. This is the load-bearing fact: the
modifications map reaches arbitrary element properties, not just `.text` / `.source`. Creatomate's
docs confirm the intent — *"edit any attribute within the template"* — and P1b confirms the
behaviour. **The fix does not require a provider-template write**, which matters because Creatomate
exposes no template create/update API.

**Auto-shrink exists and works.** `font_size: null` + `font_size_minimum` / `font_size_maximum`
against a bounded `height` is accepted and produces the intended fit. P1c is the only probe where
the headline is *structurally prevented* from growing into the subtitle.

**The two are not equivalent.**

- **P1b buys exactly one line.** Subtitle top moves 540px → 648px. Headline top 280.8px, line box
  77.7px. Four lines end at 591.6px (clear); **five lines end at 669.3px — collides again.** P1b
  moves the cliff; it does not remove it. A longer headline than any yet observed would fall off it.
- **P1c removes the cliff** within its bounds. Any headline fits, because the font shrinks. The new
  bound is the shrink floor: at `font_size_minimum: 30px` and `height: 24%` (259px), capacity is
  ~8 lines. Beyond that it clips.

**Therefore the capability is not `max_lines: 3`.** That number was never a property of the card —
it was the line budget *implied by* `Subtitle.y = 50%` and an unbounded headline. Change either
input and the number changes: it is 4 under P1b, and ~8 under P1c. `max_lines: 3` is the
**diagnosis**, and it dies as soon as it is fixed. Nothing downstream should encode `3`.

## 4. Consequences for the execution lane

- **R1 is the design.** Recommend **P1c as the primary** (structural: no headline length can
  collide), optionally with P1b's `Subtitle.y` as margin. R2 (deterministic wrap enforcement +
  font metrics in the worker) and R3 (writer-prompt budget only) are **not needed to close the
  defect**. R3 remains independently worthwhile — a headline auto-shrunk to 30px is *legible*, not
  *good* — but it is a quality lever, not the fix.
- **No tightening is required.** This was the live risk in the re-plan: R2 would have converted
  ~41% of today's headlines into failed drafts. R1 converts 0%. **The PK decision "pre-authorise the
  R2 fallback?" is now moot** — there is no fallback branch to authorise.
- **A real code consequence.** `buildTmrRenderPlan` types modifications as
  `Record<string, string | number>` (`b1_production.ts:~247`). **`font_size: null` is not
  expressible in that type.** The execution lane must widen it to
  `Record<string, string | number | null>`. This is a genuine, small, reviewable diff — and it is
  exactly the kind of thing that would have been discovered at deploy time rather than plan time
  had P1 not been run.
- **Typography changes.** P1c shrinks the headline font on long headlines. That is a visible brand
  change on the highest-volume PP surface. **PK visual review is the deciding act** — this probe
  suggests, it does not approve. Recommend PK look at `P1c_autoshrink.png` before the execution lane
  opens, since the whole design rests on that render being acceptable.

## 4b. ENDPOINT GAP CLOSED — the guard is verified on `/v2/renders` (the production endpoint)

P1a–P1d all rendered via `POST /v1/renders`. **Production posts to `POST /v2/renders`**
(`image-worker/index.ts:312`, `CREATOMATE_API`). "Geometry keys are honoured in template-mode
modifications" was therefore proven on v1 and merely *assumed* on v2 — the same species of untested
premise this lane exists to dismantle.

**Probe V2 (1 render, PK-authorised, 2026-07-10) closes it.** `run_v2.py` posts the **exact production
render-script shape** — `{template_id, modifications, output_format: 'jpg'}` (`index.ts:689`) — to
`/v2/renders`, carrying the `TMR_WINNER_LAYOUT_GUARD` values copied byte-for-byte from the cc-0033a
diff, with the real 4-line colliding headline.

Result: `succeeded`, render `14d5f62f-…`. `V2_guard_production_shape.jpg` shows the headline
auto-shrunk to **3 clean lines**, subtitle clear at its default `y`. **`/v2` honours `Headline.height`,
`font_size: null`, and the min/max bounds identically to `/v1`.** The fix is verified on the endpoint
that will run it, in the payload shape the worker sends.

## 4c. EDGE-CASE PROBES — raised by external review `0a63f124`, answered by render

External review returned `partial` / high risk and listed "untested edge cases" as an unverified
claim. Five renders close it. **No edge case produces a REGRESSION. The guard is a strict improvement
or a no-op on every class tested.** One PRE-EXISTING latent defect is surfaced; it is out of scope
for cc-0033a and is proposed as a named carry.

| Case | Input (all ≤ 90 chars ⇒ admissible) | Result |
|---|---|---|
| Empty headline | `''` / whitespace | **UNREACHABLE.** `assertHeadlineWithinGate` throws `b1: missing image_headline` before any render plan is built (`b1_production.ts`). Closed by code, not by probe. |
| `E2_cjk` | 62 CJK chars, no spaces | **PASS.** Wraps to 3 clean lines (CJK breaks between glyphs), subtitle clear. |
| `E3_mixed_longtoken` | prose + a 55-char URL | **PASS.** No overprint. Headline auto-shrinks; the URL sits flush to the right margin — cosmetically tight, not broken. |
| `E1_unbreakable_token` | 84-char single token, no spaces | **FAIL — overflows the right canvas edge.** |

**E1 is NOT caused by the guard.** Control render `E1x_control_noguard` — same token, guard keys
absent, i.e. exactly what production does TODAY — overflows *worse*: the font stays at its
unshrunk size and the text clips ~30 chars earlier. The guard shrinks the font and reveals strictly
more of the token. **The unbreakable-token overflow is a pre-existing latent defect of the template,
independent of this lane.**

**A width bound does not close it.** `E1y_guard_plus_width` adds `Headline.width: '88%'` to the guard
and renders **pixel-equivalent to E1** — Creatomate will not break a token that has no break
opportunity; it overflows the box regardless of width. There is no fix for this in the
`modifications` map. Closing it needs an *input-side* assert (a max-token-length rule in
`assertHeadlineWithinGate`), which is a change to the input gate that this lane explicitly does not make.

**Exposure of the pre-existing defect: nil in practice.** `Headline.text` binds to
`post_draft.image_headline`, AI-written prose. No published card in the 16-row governed population
contains a token long enough to overflow. E1 is a synthetic worst case, not an observed one.

→ **Proposed named carry (not this lane):** add a max-token-length assert to
`assertHeadlineWithinGate`. It is a fail-loud input gate, orthogonal to the layout guard.

Renders: `E1_unbreakable_token.jpg` · `E1x_control_noguard.jpg` · `E1y_guard_plus_width.jpg` ·
`E2_cjk.jpg` · `E3_mixed_longtoken.jpg`; machine record `edge_results.json`, `edge2_results.json`.
**The cc-0033a diff is UNCHANGED by these probes — hash `aeecb588…` still stands.**

## 5. Reproducibility

The wrap model depends on the exact font build. `Montserrat[wght].ttf` (variable, instanced to
`wght=800`) is **deliberately not committed** — it is a 728K binary with its own licence. Its identity
is pinned instead: `sha256 = 0f7b311b2f3279e4eef9b2f968bcdbab6e28f4daeb1f049f4f278a902bcd82f7`.
A future run must verify this hash before trusting a re-derived line count; a different Montserrat
build can wrap differently. The file lives beside this record in the harness sub-root, untracked.

Also untracked and deliberately excluded: `../audiotest/` — video/music-lane artifacts that were sitting
inside this harness sub-root. Not this lane's, not this lane's to move (R4 attribution).

## 6. Scope / integrity notes

- 3 renders, exactly the authorised budget. Output to this harness sub-root only.
- The card's `Background`/`Logo` are the template's baked defaults — the governed asset URLs
  normally arrive via `slot_resolution.modifications`. Irrelevant to the text-geometry question,
  and deliberately not simulated: no governed asset was resolved, so no governed asset was touched.
- P1a is an in-batch control, not a re-use of the earlier `A_78ch_reproduce.png` probe. It uses a
  different (shorter, 69-char) real headline and reproduces the collision independently — which
  also re-confirms that character count is not the discriminator.
- **`max_lines: 3` should be retired from the cc-0036 DoD wording**, where it is cited as the
  "known real fix". It is not the fix; it was the symptom's arithmetic. → orchestrator handoff.
