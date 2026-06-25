# Brief — Branch B / Lane B0: prove a REUSABLE governed 1:1 news/static template (PP = pilot proof brand)

**Created:** 2026-06-25 Sydney
**Author:** Claude Code (orchestrator)
**Executor:** {PK + Claude Code lane}
**Status:** decisions ratified + reframed (2026-06-25) — **1:1** + **Candidate A** approved; reframed to a **reusable** template (PP = pilot). Held on external dependency (PK to author the generic Creatomate 1:1 template + supply `provider_template_id`). No implementation started.
**Result file:** `docs/briefs/results/branch-b-lane-b0-governed-variant-proof.md` (created on completion)

---

## Task

Create and prove a **reusable, brand-agnostic governed 1:1 news/static template** — a square
"centred-scrim news card" **layout** that any brand can render by binding its own governed
assets — using **Property Pulse only as the pilot proof brand**. The geometry/layout is
reusable; brand identity (logo, background, and — see model note — colours) is a **per-brand
binding**, not baked into the template. Prove it renders through the existing **non-publishing**
B-Proof mechanism (real draft content → `resolve_brand_assets` → Creatomate → `render_spec.template`
evidence → `_smoke/`). **Proof only — no production wiring.**

## Reframing (this revision)

Earlier draft named the artifact `PP_NEWS_STATIC_1x1` / a PP-specific design. **Corrected:**
the template is a **reusable layout**; PP is the **pilot**. Proposed generic identity:

- **`news_static_centered_scrim_1x1_v1`** (implementation_id / template identity) — *recommended*.
- Alt: `static_news_square_centered_scrim_v1`.
- `creative_intent`: generic **`news_static`** (NOT `pp_news`); `capability`: `static_news`.

PP asset keys remain the **proof inputs**; the design does **not** hard-code PP logo, background,
brand name, or colours unless those are variable modification inputs.

## Source context

- `docs/creative-library/property-pulse.json` — family `property-pulse-news` (~line 168);
  proven variants `centred-scrim-16x9` (~182) + `centred-scrim-9x16-video` (~202). 16:9 note:
  *"16:9 master only (1:1 / 4:5 are future)."* (Only per-brand registry file that exists.)
- `docs/creative-library/registry-schema-v2.md` — §1-3 make `client_slug` **required** on
  Style Guide / Pattern / Template Family; **no shared/global family object exists**.
- `supabase/functions/image-worker/manual_render.ts:15-28` — `PP_NEWS_STATIC_16x9` constant
  (brand-named identity). :69-84 — `buildManualModifications` sends **8 keys: 6 text +
  `Background.source` + `Logo.source`** — **no colour key** (colours baked/neutral today).
- `supabase/functions/image-worker/index.ts:404-442` — live `creative_library_draft_proof`
  branch; hardcoded to `PP_NEWS_STATIC_16x9` + gate `clientSlug === 'property-pulse'`.
- `supabase/functions/image-worker/branch_b_proof.ts` — proof field builder (hard-gate = `image_headline`).
- Memory: `branch-b-lane-b-proof-shipped`, `production-logo-source-brand-profile-not-resolver`.
- Commit `7b9a907` (image-worker v3.12.0, fn v73) — B-Proof shipped.

## Model question (answered — gates the design)

**Does the current registry/implementation model support a generic provider template with
brand-specific asset bindings, or does it force brand-specific implementation IDs?**

- **Render mechanism — already reusable.** One Creatomate template is fed all brand-variable
  content via modifications (`Logo.source`, `Background.source`, 6 text fields); assets resolve
  **per `client_slug`** via `resolve_brand_assets`. A single `provider_template_id` can serve
  many brands with their own assets **today**.
- **Colours — not yet variable.** Only 8 modification keys; no colour input. For a brand-neutral
  template, colours/scrim must become **variable modification inputs** OR the layout must use
  **neutral / background-derived** colours. (Design constraint for the new template.)
- **Registry governance — forces brand scoping.** `client_slug` is mandatory at family level and
  the registry is per-brand; **no shared family object** → a "reusable governed family" is **not
  representable** without a schema extension.
- **Implementation constant + proof branch — brand-hardcoded** (`pp_*` ids, `property-pulse-news`,
  `clientSlug === 'property-pulse'`).

**Therefore B0:** builds a reusable *template + generically-named implementation identity* (fixes
the naming + colour-variability) and proves it with PP as pilot. It does **NOT** add a
shared/global registry family — that schema extension is a separate model lane (see Q8).

## The eight questions (proposed answers — PK to ratify; Q1 + Q3-path already ratified)

**1. 1:1, 4:5, or both?** **1:1 only** (ratified). Square centred-scrim; broadest feed use; 4:5 is an identical later lane.

**2. Which PP draft / content type?** A **real `m.post_draft` row, read-only**, with a non-blank
`image_headline` (the hard-gate field) and a news/image `recommended_format`. Selected at
execution by a read-only query; `post_draft_id` pinned in the result. Content type: News (the
only proven governed static composition). No draft is created or mutated.

**3. Which template / implementation candidate?** **Candidate A (ratified) — a NEW *reusable*
Creatomate template**, generically named `news_static_centered_scrim_1x1_v1`, derived from the
proven centred-scrim composition re-laid for square safe-area. **All brand identity arrives as
modifications** (logo URL, background URL, text). **Colour decision (ratified 2026-06-25):
neutral / background-derived scrim/text/accent — NO new colour modification keys in B0.** The
template consumes the **existing 8 modification inputs** (6 text + `Logo.source` + `Background.source`)
and styles scrim/text/accent neutrally. Brand colour-variable expansion is a **later model lane**,
deliberately excluded from this proof. Add a generically-named sibling governed constant alongside
`PP_NEWS_STATIC_16x9`; additively extend the proof branch to accept the new `implementation_id`
(16:9 path byte-unchanged; **no `buildManualModifications` key-set change**). Candidate B
(re-aspect `48cba556`) rejected (fixed-pixel 16:9 layout distorts at square). Programmatic-source
builders are out-of-model (not template-pinned governed identity).
> **External gate:** PK authors the generic Creatomate template + supplies `provider_template_id`
> and `output_format`. The template must contain **no baked PP logo/background/brand-name/colours**
> — no baked identity at all; only the existing 8 modification inputs, neutral styling elsewhere.

**4. Which governed assets?** PP **logo** + PP **background** governed `asset_keys`, resolved via
`resolve_brand_assets` (`resolver_used=true`, `fallback_taken=false`; governed-only, fail-loud).
These are the **pilot brand binding** — a second brand would supply its own keys against the same
template. Exact keys pinned at execution. (Governed resolver path, not the production brand-profile
logo source — see `production-logo-source-brand-profile-not-resolver`.)

**5. What evidence?** `render_spec.template` with the **generic** identity
(`implementation_id=news_static_centered_scrim_1x1_v1`, `creative_intent=news_static`,
`provider_template_id=<new>`, `props_hash`, `asset_keys`, `asset_ids`, `resolver_used=true`,
`fallback_taken=false`); a new `m.post_render_log` smoke row (`label=creative_library_draft_proof`,
`source_post_draft_id`); `storage_url` under **`_smoke/` only** at square dimensions; the rendered
artifact for PK brand-conformance + brand-neutrality judgment.

**6. What remains untouched?** `post_draft` (read-only — **no `image_url`**, no `image_status`);
publish path; queue; all production loops; the proven 16:9 + 9:16 variants (byte-unchanged);
`template_smoke` + `creative_library_manual_render` branches; `resolve_brand_assets` (consumed,
not altered); the dashboard. **No migration** (registry is JSON docs). No B1, no publisher/auto
integration, no HeyGen, no broad 16:9 production wiring.

**7. What qualifies B0 as PASSED?**
- A 1:1 governed render is produced via the non-publishing mechanism, `resolver_used=true` /
  `fallback_taken=false`, artifact in **`_smoke/` only**.
- **Zero** publish / `post_draft` / `image_status` / queue / production change (verified post-run).
- **PK judges** the square card both **brand-conformant** (legible; logo+footer in safe area) **and
  brand-neutral by construction** (no baked PP identity beyond the bound assets).
- Then, under PK gate + `creative-graph-auditor` static PASS, the proven variant may be recorded
  (initially as a PP pilot variant — see Q8) with the B0 `render_log_id`.

**8. What still BLOCKS B1?**
B0 proves the reusable template *renders*; it authorizes **no** production consumption. B1 stays
blocked because:
(a) **Registry cannot express a shared/brand-agnostic family** — `client_slug` is mandatory; the
    B0 proof must be recorded as a PP-pilot variant. A **shared-family schema extension** (brand
    binding as a first-class concept) is a separate model lane, NOT in B0.
(b) Production render path still sources the logo from `client_brand_profile`, not the governed
    resolver — swapping it in is a separate gated lane.
(c) No automatic publisher / `post_draft.image_url` wiring is approved.
(d) Only one aspect (1:1) is proven; others remain `unproven`.
(e) No Advisor→format→governed-variant selection exists in production.
(f) No Content Studio / operator consumption; external-review gate + PK ratification of broad
    governed consumption not done.

## Scope

**In scope:** plan + (on approval) PK authors one generic 1:1 Creatomate template; add a
generically-named governed constant; additively extend the proof branch; one non-publishing proof
render with PP assets; capture evidence; record one `unproven`→`proven` variant (PP pilot) under gate.
**Out of scope:** 4:5, B1, any production/queue/publisher wiring, the shared-family schema
extension, logo-source swap, dashboard, HeyGen, any draft mutation/publish, broad 16:9 wiring.

## Allowed actions (only after this revision is approved; each step still gated)

- Read-only DB select to pick the proof draft.
- PK authors the generic Creatomate template (external).
- ef-builder additive code change in an isolated worktree (generic constant + proof-branch
  acceptance of the new `implementation_id`); local tests.
- One non-publishing proof invocation (PK-run), `_smoke/` only.
- Surgical registry/docs edit to record the proven PP-pilot variant (docs-only register lane).

## Forbidden actions

- No publish, no `post_draft` mutation (incl. `image_url`), no `image_status` change, no queue or
  production-loop change, no deploy/merge without the PK hard-stop gate, no B1, no HeyGen, no
  dashboard, no broad 16:9 wiring, no raw-URL/brand-profile asset fallback.
- **No baked PP identity** in the Creatomate template (logo, background, brand name, colours).
- **No new colour modification keys** in B0 — scrim/text/accent are neutral / background-derived;
  the key-set stays the existing 8 (brand colour-variable expansion is a later model lane).
- **No shared-family schema change** in B0 (flag it for a later lane).

## Success criteria

See Q7: one `_smoke/` artifact + one `m.post_render_log` smoke row (`resolver_used=true` /
`fallback_taken=false`), zero mutation/publish (verified), PK conformance + brand-neutrality PASS,
optional `proven` variant record under gate.

## Stop condition

Revision prepared → **stop for PK approval (gate 1)**. Do not implement, author the template, or
render until PK approves and supplies the generic `provider_template_id`.

---

## Notes

- **Template authoring contract / readiness packet:** [branch-b-lane-b0-template-contract-readiness-packet.md](branch-b-lane-b0-template-contract-readiness-packet.md)
  — exact 1:1 template spec, the 8 modification keys + required element names, the proof
  invocation contract (pinned PP asset keys), and the pass/fail checklist.
- This brief is **local-only and uncommitted** pending PK approval.
- Deploy/merge (if the proof-branch extension is deployed) is a **HARD STOP**: prepare exact
  command + `--no-verify-jwt`, run `ask_chatgpt_review` on the final diff, then stop for PK.
