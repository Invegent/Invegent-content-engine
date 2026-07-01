# TMR G2 Failure Diagnosis — Creatomate Smoke Render Failure Analysis

> **Lane:** TMR Template Proof Lifecycle v1 — **G2 failure diagnosis** (diagnostic, docs-only). No render retry, no patch, no deploy, no proof, no cleanup.
> **Owner:** PK · **Date:** 2026-07-01 Sydney · **Repo HEAD:** `7acbbef` (== origin/main, 0/0) · **Registers:** v4.67 · **Project:** `mbkmaxqhsohbtwsqolns`
> **Target:** Creatomate `490ad9ea-7473-49e4-9d3c-e1ae8a12d790` (`news_quote_insight_1x1_v1`, 1080×1080).

---

## 1. Preflight Result

PASS. branch `main`; `HEAD == origin/main == 7acbbef`; `0/0`; registers v4.67; tree clean except scrap. Read-only: proof rows 0; template `platform_candidate`; G2–G5 events 0; **no output object**; **2 `_smoke/.../inputs/` placeholder PNGs present + untouched** (70 bytes each, `image/png`); no `_smoke/tmr/` `m.post_render_log` / `m.post_publish`; image-worker **v3.20.0 live**; `tmr_template_smoke` branch live.

## 2. Current Baseline

G2 was attempted once (v4.67) and failed safely (`creatomate_render_failed`). Template remains a governed inventory candidate — not render/publish/production-proven, not platform-safe, not enabled, not bound, not Format Mix eligible. This lane only diagnoses; it changes no code, renders nothing, cleans up nothing.

## 3. Failed G2 Summary

The `tmr_template_smoke` branch: uploaded 2 neutral synthetic placeholder PNGs to `_smoke/tmr/news_quote_insight_1x1_v1/a73a537c-…/inputs/`, submitted the render to Creatomate, polled, and Creatomate returned `status="failed"`. The branch surfaced the safe `creatomate_render_failed` and wrote no output / no render-log / no publish / no proof. Gateway log shows this as `POST | 502 | image-worker` (~4893 ms) — a Creatomate-side render failure, not a timeout or upload error.

## 4. Safe Evidence Available

| Evidence | Value |
|---|---|
| render id | not captured (safe error path doesn't return it) |
| sanitized status | `failed` (Creatomate poll) → `creatomate_render_failed` |
| gateway result | `POST 502` (~4.9 s) |
| placeholder objects | `…/inputs/background.png` + `…/inputs/logo.png` — 70 bytes each, `image/png`, **1×1** |
| placeholder public URL fetch | **HTTP 200, `image/png`, 70 bytes** (both) |
| output object | none |
| **Creatomate failure reason** | **NOT available** — the branch never captures `data.error`; console logs aren't in the gateway log view. |

## 5. `tmr_smoke.ts` Request Construction Findings

- Keys sent: `Headline.text`, `Subtitle.text`, `CategoryBadge.text`, `Location.text`, `Date.text`, `Footer.text`, `Background.source`, `Logo.source` (Scrim static — no mod). `output_format:'png'`.
- `Background.source`/`Logo.source` = public URLs of the two **in-code 1×1 solid-grey placeholder PNGs** uploaded to `…/inputs/`.
- All fixed server-side; no passthrough. Construction is internally consistent.

## 6. B0 Smoke Path Comparison (the decisive comparison)

The proven-working B0 branch (`template_smoke`, template `48cba556`, `index.ts:474-499`) uses the **identical** key convention and element names:

| Element key | B0 (`48cba556`, WORKS) | tmr_smoke (`490ad9ea`, FAILED) |
|---|---|---|
| `CategoryBadge.text` … `Footer.text` | ✅ same names, `.text` | ✅ same names, `.text` |
| `Background.source` | `body.background_url` (**real, reachable, full-size**) | **1×1 placeholder** |
| `Logo.source` | `body.logo_url` (**real, reachable, full-size**) | **1×1 placeholder** |

**The `.text`/`.source` suffix convention and the element names are proven correct on the same news-card family. The ONE material difference between the working path and the failed path is the image sources: B0 always uses full-size reachable images (it hard-gates requiring them); tmr_smoke used 1×1 placeholders.**

## 7. Template Modification-Key Findings

Keys/suffixes are almost certainly correct — they are byte-for-byte the same convention + element names as the proven B0 news template. Note the TMR field inventory for `490ad9ea` was `captured_from_docs` (not verified against the live Creatomate template), so a *template-specific* element-name difference cannot be 100% excluded — but the shared naming with the working B0 template makes a key mismatch unlikely to be the cause. No required *text* field was left unset. (Creatomate typically ignores unknown modification keys rather than hard-failing, which further argues against a key mismatch as the failure cause.)

## 8. Placeholder Image Findings

- The placeholders are valid PNGs (`image/png`, 70 bytes) and **fetchable** (public URL HTTP 200) — Creatomate *could* download them.
- But they are **1×1**. The `Background` element is a 1080×1080 image slot; `Logo` is an image slot. A 1×1 source scaled into a full-frame image element is the most likely trigger for `status=failed` — degenerate/tiny images are a known cause of provider-side image-processing failures, and it is the exact variable that differs from the working B0 path (which uses full-size images).

## 9. Storage / URL Accessibility Findings

- Placeholder public URLs: **HTTP 200, `image/png`** — fully accessible (accessibility **ruled out** as the cause).
- `post-images` `public=true` behaved as expected; `getPublicUrl` yields a fetchable URL.
- Input path correct (`…/inputs/…`); output path reserved but not created (render failed pre-output). All storage behaviour was correct.

## 10. Likely Failure Causes (ranked)

1. **[LEADING] 1×1 placeholder images** — Creatomate fails rendering the 1×1 source into the full-size `Background` (and/or `Logo`) element. This is the single variable that differs from the proven B0 path; keys, URLs, and accessibility are all fine. *Not provider-confirmed (the branch doesn't surface Creatomate's error).*
2. **[LOW] Template-specific requirement / element-name difference on `490ad9ea`** — the field inventory was captured from docs, not verified live; a hidden required element or a different element name is possible but less likely (shared naming with working B0).
3. **[RULED OUT] URL inaccessibility** — placeholders are public and 200.
4. **[RULED OUT] Modification-key/suffix convention** — identical to proven B0.

## 11. Recommended Next Fix Lane

**Primary recommendation: Option 2 — placeholder-size patch.** Replace the 1×1 placeholders with proper-sized neutral synthetic images (e.g. a 1080×1080 solid-colour background PNG + a modest logo-sized PNG, e.g. 512×512), still brand-free, still generated in-code / reviewed static fixtures, still under `_smoke/.../inputs/`. This is small, safe, and directly addresses the leading cause. *(Implementation is a separate PK-approved patch+deploy lane — not this lane.)*

**Confirm-first options (recommended before or alongside Option 2, PK's choice):**
- **Option 4 — PK Creatomate console inspection (zero code, fastest):** PK opens the Creatomate dashboard, reads the exact failure reason on the failed render, and confirms `490ad9ea`'s real element names + any required image dimensions. This definitively disambiguates cause #1 vs #2 with no patch/deploy.
- **Option 1 — safe diagnostic logging patch:** add Creatomate's *sanitized* `status` + `error` (type/message only — **never** raw payload, API key, secret-bearing URL, or full response) to the `tmr_template_smoke` result/log, so this and future TMR smoke renders self-report. Durable, but requires a patch + deploy + one re-run.

Not recommended yet: Option 3 (key correction — keys look correct) and Option 5 (template edit — no evidence the template itself is broken) — revisit only if Option 4/1 reveals a key or template-side issue.

**Do not implement any option in this lane.**

## 12. Safety Boundaries Preserved

No render retry · no Creatomate provider call · no secret handled/printed · no raw provider payload · no storage cleanup · no new storage object · no proof event · no `record_tmr_proof_event` · no `m.post_render_log` · no `m.post_publish` · no publish/enable/bind/platform_safe/production_proven · no dashboard code · no runtime patch · no deploy · no G3/G4/G5. The 2 diagnostic placeholder objects remain untouched. Proof rows 0; template `platform_candidate`.

## 13. Final Verdict

```
READY_FOR_PK_REVIEW
```

Diagnosis complete with a strong, evidence-backed leading cause (**1×1 placeholder images**, isolated by the B0 comparison) and a ranked fix plan. The exact Creatomate reason is not provider-confirmed — **Option 4 (PK console)** confirms it at zero code cost, or **Option 1 (safe diagnostic patch)** makes the branch self-report; the primary fix is **Option 2 (larger neutral synthetic placeholders)**.
