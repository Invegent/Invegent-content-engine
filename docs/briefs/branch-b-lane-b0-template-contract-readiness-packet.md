# B0 Template Contract & Readiness Packet — reusable governed 1:1 news/static template

**Created:** 2026-06-25 Sydney
**Author:** Claude Code (orchestrator)
**Mode:** READ-ONLY / docs-only. No code, no migration, no deploy, no proof invocation, no DB mutation, no B1.
**Status:** ready for PK — Creatomate template authoring contract. Local-only, uncommitted.
**Companion brief:** [branch-b-lane-b0-governed-variant-proof.md](branch-b-lane-b0-governed-variant-proof.md)

> Purpose: give PK an unambiguous spec to author the 1:1 Creatomate template later (off Creatomate
> right now). Everything here is derived from the LIVE proven 16:9 path
> (`image-worker/manual_render.ts`, `index.ts:404-442`, `branch_b_proof.ts`) + a read-only asset
> lookup (db-rls-auditor, project `mbkmaxqhsohbtwsqolns`). Nothing is invented.

---

## 1. Exact reusable template identity

| Field | Value |
|---|---|
| **Template family / implementation name (recommended)** | **`news_static_centered_scrim_1x1_v1`** |
| Alt name | `static_news_square_centered_scrim_v1` |
| `creative_intent` | `news_static` (generic — **NOT** `pp_news`) |
| `capability` | `static_news` |
| `template_version` | `v1` |
| Pilot proof brand | **Property Pulse — pilot only, NOT part of the template identity** |

The name describes the **layout** (centred-scrim news card, square), not a brand. PP supplies assets
at render time; it does not appear in the template's identity, design, or baked content.

## 2. Creatomate template requirements (what PK authors)

| Requirement | Spec |
|---|---|
| Canvas | **1080 × 1080 px** (1:1) |
| Output format | **`jpg` recommended** (parity with the proven 16:9 proof, which renders `jpg` / `image/jpeg`; smaller for photographic backgrounds). `png` acceptable if PK wants lossless text/logo edges — but it changes the worker's storage extension + mime, so confirm the value. |
| Scrim | **Neutral / background-derived** dark overlay for text legibility (e.g. neutral black/grey gradient or uniform dark scrim). **No PP teal/brand colour.** |
| Colours (text/accent) | **Neutral** (white/near-white headline on scrim; neutral accent). **No new colour modification keys in B0** — colour-variable expansion is a later lane. |
| Baked brand identity | **NONE.** No PP logo, no PP background, no brand name, no brand colours baked into the template. All brand content arrives via the 8 modification inputs (§3); everything else is neutral. |
| Logo element | Top-left, ~44px inset, contained box ~80–100px (per PP `logo_rules`, generalised). |
| Footer element | Bottom band, inside safe area, centred or left per layout; small neutral text. |
| Headline element | Central safe block, large weight, multi-line wrap, vertically/horizontally centred; legible over scrim. |
| Body / secondary text (Subtitle, Location, Date, CategoryBadge) | Arranged around the headline; **must render gracefully when empty** (the proof sends Subtitle + Location as empty strings — see §3). No placeholder text, no broken layout when blank. |
| Safe area | Keep **all** elements ≥ ~48px from every canvas edge (square crops minimally on feed, but protect against platform chrome). Logo + footer fully inside the safe area. |
| Fonts | Montserrat (evidence-derived from existing ICE specs); weights per PK. No new font invented. |

## 3. Existing modification contract (the 8 keys — DO NOT change in B0)

The worker builds **exactly these 8 keys** (`image-worker/manual_render.ts:69-84`,
`buildManualModifications`). The Creatomate template's **element names must match EXACTLY**
(case-sensitive) or the worker's value is silently dropped → blank/missing content.

| # | Modification key | Creatomate element + property | Worker source (proof) | Notes |
|---|---|---|---|---|
| 1 | `CategoryBadge.text` | element **`CategoryBadge`**, `.text` | `'PROPERTY NEWS'` (proof constant) | category badge label |
| 2 | `Headline.text` | element **`Headline`**, `.text` | `post_draft.image_headline` | **hard-gate field** — never blank |
| 3 | `Subtitle.text` | element **`Subtitle`**, `.text` | `''` (empty in proof) | **must render gracefully empty** |
| 4 | `Location.text` | element **`Location`**, `.text` | `''` (empty in proof) | **must render gracefully empty** |
| 5 | `Date.text` | element **`Date`**, `.text` | e.g. `'25 June 2026'` (D Month YYYY) | en-AU date |
| 6 | `Footer.text` | element **`Footer`**, `.text` | `'propertypulse.com.au'` (content, not baked) | brand URL supplied as content |
| 7 | `Background.source` | element **`Background`** (image), `.source` | resolved background `asset_url` | governed asset URL |
| 8 | `Logo.source` | element **`Logo`** (image), `.source` | resolved logo `asset_url` | governed asset URL |

**Exact-match requirement (critical for authoring):** the 8 element names that MUST exist in the
template, spelled exactly: `CategoryBadge`, `Headline`, `Subtitle`, `Location`, `Date`, `Footer`
(text elements) + `Background`, `Logo` (image elements). `.text` / `.source` are Creatomate
property suffixes. Any mismatch (case, spacing, rename) = that field renders blank.

## 4. Proof invocation contract (PK-run, AFTER the gated code change + deploy)

> The proof CANNOT run until BOTH happen: (a) PK authors the template + supplies
> `provider_template_id` + `output_format`; (b) the gated additive code change is made + deployed
> (the live branch currently hard-codes `implementation_id === 'pp_news_static_16x9_v1'`,
> `index.ts:411`). PK authoring is necessary but **not sufficient**.

Request body to the image-worker:

```jsonc
{
  "mode": "creative_library_draft_proof",
  "client_slug": "property-pulse",                       // hard gate (pilot)
  "implementation_id": "news_static_centered_scrim_1x1_v1", // NEW generic id (needs additive code accept)
  "post_draft_id": "<a real PP draft uuid>",
  "asset_keys": {                                        // OBJECT, not array
    "logo": "pp_logo_primary",                           // FIXED
    "background": "bg_perth_cbd"                          // PK-chosen 2026-06-25 (cleanest proof bg; PP/Perth is a proof input only)
  }
}
```

| Field | Expected value | Source / gate |
|---|---|---|
| `client_slug` | `property-pulse` | hard gate (`index.ts:411`) |
| `implementation_id` | `news_static_centered_scrim_1x1_v1` | NEW generic id (requires additive accept; today only `pp_news_static_16x9_v1`) |
| `asset_keys.logo` | `pp_logo_primary` | resolver-confirmed approved+active, URL = `PP_logo_2.png` |
| `asset_keys.background` | **`bg_perth_cbd`** (PK-chosen 2026-06-25) | resolver-confirmed approved+active, URL present; Perth CBD = cleanest proof background. Alts `bg_brisbane_cbd` / `bg_sydney_cbd` resolve identically. Template stays generic — PP/Perth is a proof input only. |
| Draft type | `recommended_format === 'image_quote'` AND non-blank `image_headline` | **two hard gates** (`index.ts:420-425`) |
| client_id (for reference) | `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd` | from read-only lookup |
| `_smoke/` output path | currently `_smoke/branch_b_proof_<post_draft_id>.jpg` (16:9). For 1:1 the additive change parametrizes by `output_format` (e.g. `_smoke/branch_b_proof_<post_draft_id>_1x1.<ext>`), mime matching `output_format`. | `index.ts:441` |

## 5. Pass / fail checklist

| Check | Pass condition | How verified |
|---|---|---|
| Render succeeds | HTTP `ok:true`, `storage_url` returned | proof response |
| `render_spec.template` present | carries the **generic** identity (`implementation_id=news_static_centered_scrim_1x1_v1`, `creative_intent=news_static`, `provider_template_id`, `props_hash`, `asset_keys`, `asset_ids`) | render-log `render_spec.template` |
| `resolver_used` | `true` | `render_spec.template` |
| `fallback_taken` | `false` | `render_spec.template` |
| Governed assets | `asset_keys=[pp_logo_primary,<bg>]`, `asset_ids` has 2 | `render_spec.template` |
| Source draft untouched | no `image_url` / `image_status` / `updated_at` change | read-back of `m.post_draft` before vs after |
| No publish | no publish event, draft not advanced | publish path / queue unchanged |
| No queue change | queue counts/state unchanged | queue read-back |
| Output scope | exactly ONE object under `_smoke/`, nothing else written | storage |
| Render-log shape | `ice_format_key='image_quote'`, `label='creative_library_draft_proof'`, `source_post_draft_id` set | `m.post_render_log` |
| Visually acceptable + brand-neutral | 1080×1080; logo+footer in safe area; headline legible over neutral scrim; empty Subtitle/Location render cleanly; **no baked PP colours/identity** | **PK judgment** (creative-graph-auditor cannot judge visuals) |

## 6. B1 blockers (B0 does NOT clear these)

- **Shared / brand-agnostic template-family schema NOT yet supported.** `client_slug` is mandatory
  on Style Guide / Pattern / Template Family (registry-schema-v2 §1-3) and the registry is per-brand
  (`property-pulse.json` only). So B0's proof must be recorded as a **PP-pilot variant**; a
  shared-family schema extension is a **separate model lane**.
- **Brand colour variables deferred.** Colours are neutral/background-derived in B0; making
  scrim/text/accent brand-variable (new modification keys) is a later lane.
- **B0 proof does NOT approve production wiring.** Production render path still sources the logo from
  `client_brand_profile` (not the governed resolver); no publisher / `post_draft.image_url` wiring;
  no Advisor→format→governed-variant selection; only the 1:1 aspect proven. Each is its own gated lane.

---

## Deferred code change (FYI only — NOT implemented; for PK's mental model)

Once PK provides `provider_template_id` + `output_format`, the gated ef-builder step will (additively,
16:9 path byte-unchanged): (1) add a generically-named governed constant
(`news_static_centered_scrim_1x1_v1`, new `provider_template_id`, `output_format`,
`creative_intent='news_static'`); (2) extend the proof branch (`index.ts:411`) to ALSO accept the new
`implementation_id`; (3) parametrize the `_smoke/` storage path + mime by `output_format`. No change to
`buildManualModifications` (the 8 keys stay). Then: branch-warden `safe` → `ask_chatgpt_review` on the
final diff → **PK deploy/merge hard stop** → PK-run proof → §5 checklist → optional `proven` PP-pilot
variant record under gate.
