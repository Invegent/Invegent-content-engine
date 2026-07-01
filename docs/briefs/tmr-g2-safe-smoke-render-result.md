# TMR G2 — Safe `_smoke/` Render Result

> **Lane:** TMR Template Proof Lifecycle v1 — **G2** (run one safe `_smoke/` render). **Render result: FAILED** (contained, no leakage). No proof event, no publish, no production coupling.
> **Owner:** PK · **Date:** 2026-07-01 Sydney · **Repo HEAD:** `66e94de` (== origin/main, 0/0) · **Registers:** v4.66 · **Project:** `mbkmaxqhsohbtwsqolns`
> **Target:** Creatomate `490ad9ea-7473-49e4-9d3c-e1ae8a12d790` (`news_quote_insight_1x1_v1`, 1080×1080).

---

## 1. Preflight result

PASS. branch `main`; `HEAD == origin/main == 66e94de`; `0/0`; registers v4.66; tree clean except scrap. Live: image-worker **ACTIVE**, `version:"image-worker-v3.20.0"`, `verify_jwt=false`. DB read-only: proof rows 0, template `platform_candidate`, no prior `_smoke/tmr/news_quote_insight_1x1_v1` object, no `_smoke/tmr/` render_log/publish, G2–G5 events 0.

## 2. Request shape used

Reviewed contract, verbatim (invoked once via the deployed branch; auth via the in-EF `x-image-worker-key`, referenced from env — the secret value was never read or printed):
```json
{ "mode": "tmr_template_smoke", "provider_template_id": "490ad9ea-7473-49e4-9d3c-e1ae8a12d790",
  "provider_template_name": "news_quote_insight_1x1_v1", "run_label": "tmr-g2-smoke", "synthetic_only": true }
```
No overrides, no real assets, no production paths, no publish/proof request.

## 3. Render result

**FAILED.** Response: `{"ok":false,"error":"creatomate_render_failed"}`.
- The branch submitted the render to Creatomate, polled, and Creatomate returned `status="failed"`. The branch surfaced the safe, non-echoing error `creatomate_render_failed` (by design it does NOT return Creatomate's raw failure detail — so the specific provider reason is not in the response).
- run-id: `a73a537c-ce94-4848-bd1d-5b8222d26a2c`.
- provider_render_id: not captured in the safe error path.

## 4. Storage / evidence state

- **Inputs (neutral synthetic placeholders, created):** `_smoke/tmr/news_quote_insight_1x1_v1/a73a537c-ce94-4848-bd1d-5b8222d26a2c/inputs/background.png` + `.../inputs/logo.png` (the two in-code 1×1 solid-grey PNGs).
- **Output:** none (render failed before the output upload).
- These 2 input objects are inert synthetic placeholders under `_smoke/`; harmless. Cleanup optional (PK's call) — not deleted here.

## 5. Post-render verification (all invariants hold)

| Check | Expected | Actual |
|---|---|---|
| render result | — | **FAILED** (`creatomate_render_failed`) |
| provider_template_id | target | ✅ `490ad9ea…` (single-id allowlist) |
| output path scope | `_smoke/tmr/news_quote_insight_1x1_v1/…` | ✅ (no output produced; scope enforced) |
| inputs path scope | `_smoke/tmr/news_quote_insight_1x1_v1/…/inputs/` | ✅ |
| neutral synthetic placeholders only | yes | ✅ (in-code 1×1 PNGs; no real/brand/stock/prior-output asset) |
| proof rows | 0 | ✅ 0 |
| new `m.post_render_log` | 0 | ✅ 0 |
| new `m.post_publish` | 0 | ✅ 0 |
| template lifecycle | `platform_candidate` | ✅ `platform_candidate` |
| publish / enable / bind / platform_safe / production_proven | none | ✅ none |
| G3/G4/G5 | untouched | ✅ untouched |

## 6. Non-claims preserved

**YES.** The template is NOT render-proven, publish-proven, production-proven, platform-safe, enabled, bound, or Format Mix eligible. The render did not succeed, so there is not even a render-proven candidate yet. No proof event was inserted (and none should be — G3 records a `smoke_render` proof only on a *passed* render).

## 7. Likely failure causes (for a future PK-directed diagnosis — NOT retried here)

The branch does not echo Creatomate's error detail (safe by design), so the exact reason is unknown from the response. Candidates, in rough likelihood order:
1. **Modification key mismatch** — the keys (`Headline.text`, `Background.source`, etc.) use element names from the TMR field inventory, but Creatomate may expect a different key format/property for this specific template's elements (the `.text`/`.source` convention is proven for the *other* B0 template `48cba556…`, not necessarily for `490ad9ea…`).
2. **Degenerate placeholder images** — the 1×1 solid-grey PNGs may be rejected by Creatomate for the `Background`/`Logo` image elements (some templates/elements reject 1×1 or require minimum dimensions).
3. **Template-side issue** — a required element/asset the template expects that the synthetic modifications don't satisfy, or a problem with the template itself.

## 8. Recommended next gate

**NOT G3.** G3 (`record smoke_render proof event`) requires a *successful* render — there is nothing to prove yet.

Recommended: a PK-directed **G2 failure-diagnosis lane** to obtain the Creatomate failure reason safely — e.g. (a) a reviewed, minimal runtime change to have `tmr_template_smoke` capture/return Creatomate's *sanitized* failure message (status/error-type only, no raw payload/secret) for smoke mode; and/or (b) PK inspects template `490ad9ea…` in the Creatomate console; and/or (c) test larger neutral placeholder images / confirm the exact modification key format. **Do not retry with a different mechanism without PK approval** (per the G2 directive).

## 9. Verdict

```
G2 — RENDER FAILED (contained; no proof, no publish, no production coupling; non-claims intact)
```
