# Brief — Template Capability Contracts (B1 precondition)

**Created:** 2026-06-25 Sydney
**Author:** Claude Code (orchestrator)
**Executor:** {PK + Claude Code lane}
**Status:** approved (PK, 2026-06-25) for docs-only commit. **Docs-only; no implementation.**
**Result file:** n/a (planning brief)

---

## Standing status (explicit)

1. **This is a B1 *prerequisite proposal*, NOT implemented** — no schema, no per-template contract
   JSON, no registry change, no code, no validator. It defines the contract + preflight plan only.
2. **B0 remains PROVEN** (`news_static_centered_scrim_1x1_v1`, `provider_template_id fb9820f8…`,
   proof `50f09ca2`, zero side-effects).
3. **B1 remains unstarted / gated** — nothing here starts B1; the standing B1 blockers (shared-family
   `client_slug` limitation, production logo source, publisher/`image_url` wiring, Advisor→variant
   selection) are unchanged and out of scope.
4. **Numeric limits are NOT invented** — all uncalibrated thresholds are marked `to_be_calibrated`.
5. **Recommended placement is hybrid** — schema doc (authoritative shape) + per-template
   brand-agnostic contract file + registry `capability_contract_ref` (§2).
6. **Validation supports** PASS · WARN · ADAPT/REWRITE · SELECT ALTERNATE · FAIL LOUD (§4).
7. **Advisor uses contracts as an eligibility filter only** — the Advisor remains the decision-maker (§6).
8. **image-worker enforces hard limits before the Creatomate call** as defence-in-depth (§7).
9. **B1 carries remain:** footer/date contrast · neutral tint · long-headline + subtitle robustness ·
   background suitability (§8).

---

## Why this exists

B0 is **PROVEN** (`news_static_centered_scrim_1x1_v1`, `provider_template_id fb9820f8…`, proof
`50f09ca2`, zero side-effects). But it took **3 template iterations** to get a clean render — first
the headline overflowed below the scrim, then the logo and category badge overlapped. Both were
**invisible to ICE before render**: nothing told the system the template's scrim is a fixed
820×760 box, that the headline can only safely wrap to ~3 lines, or that the bottom footer/date
strip has no contrast guarantee. ICE rendered blind and PK caught the defects by eye.

For B0 (one template, PK eyeballs each render) that's fine. For **B1** (production wiring, many
templates, automated renders, multiple brands) it is not: ICE must know **before** spending a
Creatomate render whether a given headline/subtitle/footer/logo/background is **safe** for the
chosen template. This brief defines a **machine-readable Template Capability Contract** and a
**render-preflight** plan so B1 can wire templates into production safely.

## Source context (read, read-only)

- `docs/briefs/branch-b-lane-b0-governed-variant-proof.md` + `…-template-contract-readiness-packet.md`
  — the B0 lane; the readiness packet already enumerated the 8 modification keys + element names.
- `docs/creative-library/registry-schema-v2.md` — §3 variant object (`required_fields`,
  `expected_assets`, free-text `known_limitations`); `client_slug` is **mandatory** at family level.
- `docs/creative-library/property-pulse.json` — variants carry free-text `known_limitations` today.
- `docs/architecture/current-ice-flow-v1.md` §1/§3 — live spine: **`ai-worker` `callFormatAdvisor`
  sets `recommended_format` (FINAL)** → render workers → `m.post_render_log`; Creative Library is
  **declarative, not consumed by any production worker**; production logo still reads
  `c.client_brand_profile.brand_logo_url`, NOT the resolver.
- image-worker proof code (read-only evidence): `manual_render.ts` (the `GovernedImpl` constant +
  `buildManualModifications` 8 keys), `index.ts` `creative_library_draft_proof` branch (governed-only,
  fail-loud, `_smoke/` only), `branch_b_proof.ts` (hard-gate = `image_headline`).
- The PK-supplied Creatomate template JSON for `news_static_centered_scrim_1x1_v1` (canvas 1080²;
  `Scrim` 820×760 `#0a0e1e`@72%; `Headline`/`Subtitle` `6 vmin`; per-text tint `rgba(18,5,118,0.4)`;
  bottom `Location`/`Footer`/`Date` at y≈81%).

---

## 1. What a Template Capability Contract must contain

A contract is a **per-provider-template, brand-agnostic** descriptor of what the template can
safely render. Fields:

- **Identity** — `implementation_id`, `provider`, `provider_template_id`, `template_family`,
  `template_variant`, `contract_version`.
- **Canvas** — `width`, `height`, `aspect_ratio`.
- **Output** — `format` (Creatomate token, e.g. `jpg`), `mime` (`image/jpeg`).
- **Dynamic elements** — for each: `name` (exact Creatomate element name), `type` (`text`|`image`),
  `modification_key` (e.g. `Headline.text`), `required` (bool), `empty_ok` (bool).
- **Field limits** (text): `headline`, `subtitle`, `category_badge`, `location`, `date`, `footer` —
  each with `max_chars`, `max_lines`, `min_font` (if scaling), `wrap`, `container` (which region it
  lives in), `empty_ok`, `overflow_risk` (`low|med|high`).
- **Asset constraints**: `logo` (placement box, `fit`, transparent-bg preference, min resolution,
  aspect tolerance) and `background` (coverage/`cover`, min resolution, orientation, **brightness
  guidance**, subject safe-zone vs scrim).
- **Readability / contrast** — which text sits **on the scrim** (contrast guaranteed) vs **on the
  open background** (contrast **not** guaranteed); scrim spec; per-zone contrast notes.
- **Overflow risks** — explicit list: `{field, trigger, severity, why}` (e.g. headline > ~3 lines
  overruns the fixed scrim).
- **Known limitations** — free-text + structured (fixed non-auto-fitting scrim; bottom-strip
  contrast; indigo tint).
- **Recommended fallbacks** — `{condition → action}` (rewrite/shorten, pick darker background,
  select alternate template).
- **Preflight rules** — `hard_limits[]` (fail-loud) and `soft_limits[]` (warn/adapt).
- **Evidence** — `proof_status`, `render_log_id`, `source_commit` (ties the contract to a real proof).

> **Numeric thresholds discipline:** where a limit isn't yet measured, mark it
> `to_be_calibrated` — **do not invent numbers** (per registry-schema-v2 "never invent;
> mark TBC"). Calibration = render a sweep of headline/subtitle lengths to `_smoke/` and record the
> overflow point (a small B1-precursor measurement lane, PK-gated).

## 2. Where it belongs — recommendation: **hybrid**

The contract describes the **template** (geometry/limits), which is **brand-agnostic** — but the
registry today scopes everything by `client_slug` (the same constraint that blocks B1's shared
family). So **do not** bury the contract inside the per-brand registry. Proposed:

| Layer | Holds | Path |
|---|---|---|
| **Schema doc** (authoritative shape) | the contract JSON schema + rules | extend `registry-schema-v2.md` with a "§ Template Capability Contract", or a new `docs/creative-library/template-capability-contract-schema.md` |
| **Per-template contract file** (brand-agnostic) | the actual contract per provider template, keyed by `implementation_id` + `provider_template_id` | new dir `docs/creative-library/template-contracts/<implementation_id>.json` |
| **Registry variant** (link only) | a `capability_contract_ref` pointing at the contract file | existing variant object in `property-pulse.json` (and future shared family) |

**Why hybrid:** contracts are template-scoped, not brand-scoped — a per-template file is reusable
across brands (exactly B1's goal) and sidesteps the `client_slug` family limitation; the registry
variant just *references* it; the schema doc keeps one authoritative shape. **Declarative only —
not consumed by production workers until B1 explicitly wires a reader** (the registry-schema-v2
runtime-import guard still applies).

## 3. Sample contract — `news_static_centered_scrim_1x1_v1` (draft)

```jsonc
{
  "contract_version": "v1",
  "implementation_id": "news_static_centered_scrim_1x1_v1",
  "provider": "creatomate",
  "provider_template_id": "fb9820f8-3fee-4448-b324-3d500fa74b40",
  "template_family": "news-static",
  "template_variant": "centered-scrim-1x1",
  "canvas": { "width": 1080, "height": 1080, "aspect_ratio": "1:1" },
  "output": { "format": "jpg", "mime": "image/jpeg" },
  "dynamic_elements": [
    { "name": "Background",    "type": "image", "modification_key": "Background.source", "required": true,  "empty_ok": false },
    { "name": "Logo",          "type": "image", "modification_key": "Logo.source",       "required": true,  "empty_ok": false },
    { "name": "CategoryBadge", "type": "text",  "modification_key": "CategoryBadge.text","required": false, "empty_ok": true },
    { "name": "Headline",      "type": "text",  "modification_key": "Headline.text",     "required": true,  "empty_ok": false },
    { "name": "Subtitle",      "type": "text",  "modification_key": "Subtitle.text",     "required": false, "empty_ok": true },
    { "name": "Location",      "type": "text",  "modification_key": "Location.text",     "required": false, "empty_ok": true },
    { "name": "Date",          "type": "text",  "modification_key": "Date.text",         "required": false, "empty_ok": true },
    { "name": "Footer",        "type": "text",  "modification_key": "Footer.text",       "required": false, "empty_ok": true }
  ],
  "fields": {
    "headline":      { "required": true,  "max_chars": "to_be_calibrated", "max_lines": 3, "wrap": true, "container": "Scrim 820x760", "overflow_risk": "high", "notes": "the proof headline (~60 chars) fits in 3 lines AFTER the scrim fix; 4 lines overran in the first render" },
    "subtitle":      { "required": false, "empty_ok": true, "max_chars": "to_be_calibrated", "container": "Scrim 820x760 (shares height budget with headline)", "overflow_risk": "high", "notes": "proof sent empty; non-empty subtitle + long headline jointly risk scrim overflow" },
    "category_badge":{ "required": false, "max_chars": "to_be_calibrated", "default": "MARKET UPDATE", "notes": "worker sends 'PROPERTY NEWS' for PP pilot" },
    "location":      { "required": false, "empty_ok": true, "container": "bottom-open-strip", "overflow_risk": "low" },
    "date":          { "required": false, "format": "D Month YYYY", "container": "bottom-open-strip", "contrast": "not_guaranteed" },
    "footer":        { "required": false, "max_chars": "to_be_calibrated", "container": "bottom-open-strip", "contrast": "not_guaranteed" }
  },
  "assets": {
    "logo":       { "modification_key": "Logo.source", "placement": "top-center box ~130x130", "fit": "contain", "transparent_bg_preferred": true, "min_resolution": "to_be_calibrated", "aspect": "any (contained)" },
    "background": { "modification_key": "Background.source", "coverage": "full-bleed cover", "min_resolution": "1080x1080", "orientation": "square or landscape-croppable", "brightness_guidance": "mid-to-dark preferred; bright images reduce bottom-strip text contrast", "subject_safe_zone": "centre is covered by the 820x760 scrim" }
  },
  "readability": {
    "scrim": { "shape": "820x760 centered", "fill": "#0a0e1e", "opacity": 0.72 },
    "text_on_scrim": ["Headline", "Subtitle"],
    "text_on_open_background": ["Location", "Date", "Footer"],
    "contrast_constraints": {
      "headline_subtitle": "white/near-white on 72% dark scrim — contrast OK",
      "bottom_strip": "Location/Date/Footer sit on the open background with only a faint rgba(18,5,118,0.4) tint — contrast NOT guaranteed; depends on background brightness"
    }
  },
  "overflow_risks": [
    { "field": "headline", "trigger": "line_count > 3 (≈ char_count > to_be_calibrated)", "severity": "high", "why": "fixed 820x760 scrim does not auto-fit; excess lines render below the scrim on the open image" },
    { "field": "headline+subtitle", "trigger": "non-empty subtitle + long headline", "severity": "high", "why": "both share the fixed scrim height budget" }
  ],
  "known_limitations": [
    "scrim is a fixed 820x760 box — does NOT auto-fit to text",
    "bottom-strip (Location/Date/Footer) contrast is not guaranteed over bright imagery",
    "per-text background tint rgba(18,5,118,0.4) is mildly non-neutral (indigo)"
  ],
  "recommended_fallbacks": [
    { "condition": "headline exceeds safe line/char budget", "action": "rewrite/shorten headline (AI, PK-governed) OR select an alternate template with a larger/auto-fit text area" },
    { "condition": "background too bright for bottom strip", "action": "select a darker governed background asset OR raise the tint opacity (template change)" },
    { "condition": "logo not transparent / wrong aspect", "action": "use a governed transparent logo asset; fail-loud if none" }
  ],
  "preflight": {
    "hard_limits": [
      "required dynamic elements present in the template (all 8 names match)",
      "Headline non-empty (existing hard-gate field)",
      "logo + background asset_keys resolve via resolve_brand_assets (approved+active, url present) — governed-only, fail-loud",
      "headline within max_chars/max_lines once calibrated"
    ],
    "soft_limits": [
      "subtitle length within budget (warn/adapt)",
      "background brightness suitable for bottom strip (warn)",
      "category badge length (warn)"
    ]
  },
  "evidence": { "proof_status": "proven", "render_log_id": "50f09ca2-cfae-462f-bfd5-07aac83c96de", "source_commit": "4ebec3b" }
}
```

## 4. Render preflight behaviour (the 5-tier ladder)

Evaluated by a preflight validator **before** the Creatomate call, against the contract:

| Tier | Trigger | Action |
|---|---|---|
| **PASS** | all hard + soft limits satisfied | render normally |
| **WARN** | a **soft** limit is exceeded (e.g. background a bit bright; long-ish subtitle) | render, but record the warning on `render_spec.qa` for visibility/audit |
| **ADAPT / REWRITE** | a fixable field exceeds a soft/hard text budget (e.g. headline too long) | apply a governed transform (AI shorten/rewrite within brand voice; PK-governed) → re-check; never silently truncate |
| **SELECT ALTERNATE** | content cannot fit this template even after adapt, but another governed template can | choose an eligible alternate variant whose contract fits (Advisor/feasibility filter) |
| **FAIL LOUD** | a **hard** limit fails and no adapt/alternate applies (missing required element, unresolved governed asset, empty headline) | return an error, render nothing — **no legacy/raw fallback** (preserves the B0/B-Proof governed-only fail-loud invariant) |

The ladder is **ordered**: PASS → WARN → ADAPT → SELECT ALTERNATE → FAIL LOUD. Each tier's
outcome is recorded as evidence so the operator/audit can see *why* a render adapted or failed.

## 5. What must happen before B1 production wiring

1. **PK approves this brief** (schema shape + placement + preflight ladder).
2. **Contract schema** added (schema doc) + **calibration lane** run to fill `to_be_calibrated`
   numbers (headline/subtitle char/line budgets, logo min-res) via a `_smoke/` sweep — PK-gated,
   non-publishing.
3. **Per-template contract file** authored for every template B1 will wire (starting with the B0
   template); `capability_contract_ref` added to the registry variant.
4. **Preflight validator built** (pure module + tests) and the **enforcement points decided** (§6/§7).
5. **B1's standing blockers resolved separately** (these are NOT solved by contracts): shared/
   brand-agnostic family schema (`client_slug` mandatory today); production logo source still
   `brand_profile` not the resolver; no publisher/`post_draft.image_url` wiring; no Advisor→variant
   selection. Each its own gated lane.
6. **External review + PK gates** as usual before any deploy.

## 6. Should the Advisor use the contract before recommending a template?

**Yes — as a feasibility filter, not as the decider.** `callFormatAdvisor` (ai-worker) is the
sovereign format decision-maker (per `current-ice-flow-v1.md` §1). The contract should act as an
**eligibility gate**: the Advisor may only recommend a template/variant whose contract can plausibly
fit the content it has (e.g. don't route a 90-char headline to a template whose headline budget is
small). The Advisor still chooses *among eligible* templates on its existing criteria. This keeps
"AI proposes, governance constrains, PK approves" intact and prevents doomed renders at the source.
*(Scope note: Advisor↔template selection is itself a B1 capability — today there is one template;
this is design intent for B1, not a B0 change.)*

## 7. Should image-worker enforce hard limits before calling Creatomate?

**Yes — image-worker is the last line of defence and must enforce `hard_limits` pre-call,
fail-loud.** Creatomate renders cost money and time; a blind call that produces a broken card is
exactly the B0 failure mode. The worker already enforces the `Headline` hard-gate and governed-asset
resolution fail-loud — the contract generalises this: validate required elements + calibrated
hard limits **before** the Creatomate POST. Soft limits → WARN/ADAPT per the ladder. This is
defence-in-depth: Advisor filters at selection, worker enforces at render. **Neither is a B0 change**
— both are B1 wiring, gated.

## 8. B1 carries (recorded — these are the contract's concrete drivers)

- **Footer/date contrast** — bottom-strip text on open background; contract marks `contrast:
  not_guaranteed`; fix via darker background selection or template tint/scrim for the strip.
- **Neutral tint** — per-text `rgba(18,5,118,0.4)` indigo is mildly non-neutral; neutralise (template
  change) or accept; recorded in `known_limitations`.
- **Long headline + non-empty subtitle robustness** — fixed 820×760 scrim doesn't auto-fit; the
  primary overflow risk; drives the headline/subtitle calibration + the ADAPT tier.
- **Background suitability** — brightness/orientation/subject safe-zone vs scrim; drives the
  background `brightness_guidance` + the WARN tier.

---

## Outputs (as requested)

- **Recommended doc path (this brief):** `docs/briefs/branch-b-template-capability-contracts.md`.
- **Proposed artifact paths:** schema → `docs/creative-library/template-capability-contract-schema.md`
  (or a §in `registry-schema-v2.md`); per-template contracts →
  `docs/creative-library/template-contracts/<implementation_id>.json`; registry link →
  `capability_contract_ref` on the variant.
- **Proposed JSON schema:** §1 (fields) + §3 (concrete shape).
- **Sample contract for the B0 template:** §3.
- **B1 preflight plan:** §4 (ladder) + §5 (sequence) + §6/§7 (enforcement points).
- **Risks & open PK decisions:** below.

## Risks & open PK decisions

1. **Placement** — confirm the **hybrid** (schema-doc + per-template file + registry ref) vs putting
   contracts inline in the per-brand registry. *(Recommend hybrid — brand-agnostic, B1-aligned.)*
2. **Calibration lane** — approve a small non-publishing `_smoke/` sweep to measure the
   `to_be_calibrated` numbers, or accept conservative hand-set limits initially? *(Recommend the
   sweep — evidence over guesses.)*
3. **ADAPT tier scope** — is AI headline rewrite/shorten in-scope for B1, or is ADAPT limited to
   "warn + require operator/PK edit"? (Auto-rewrite touches brand voice — a governance call.)
4. **Advisor coupling** — wire the contract into `callFormatAdvisor` as an eligibility filter (§6),
   or keep selection manual/operator-driven for B1 v1?
5. **Contract authority** — does a contract require a real proof (`render_log_id`) before
   `proof_status: proven`, mirroring variant proof-discipline? *(Recommend yes.)*
6. **Scope reminder** — contracts do **not** resolve the shared-family `client_slug` limitation, the
   resolver-vs-brand-profile logo source, or publisher/`image_url` wiring; those remain separate B1
   blockers.

**Do not implement.** Prepare this brief and wait for PK approval. No commit until PK approves.
