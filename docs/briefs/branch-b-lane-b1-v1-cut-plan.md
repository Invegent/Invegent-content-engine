# Brief — Branch B / Lane B1-v1: smallest-safe production cut plan

**Created:** 2026-06-25 Sydney
**Author:** Claude Code (orchestrator)
**Executor:** {PK + Claude Code lane}
**Status:** cut plan APPROVED (PK, 2026-06-25) — **planning record only; B1 NOT implemented.** Docs-only.
**Companion docs:** [branch-b-lane-b0-governed-variant-proof.md](branch-b-lane-b0-governed-variant-proof.md) · [branch-b-lane-b0-template-contract-readiness-packet.md](branch-b-lane-b0-template-contract-readiness-packet.md) · [branch-b-template-capability-contracts.md](branch-b-template-capability-contracts.md)

---

## Standing status (explicit)

1. **B1 is NOT implemented** — this is a discovery + cut-plan record only. No code, no DB, no deploy, no render.
2. **B0 remains PROVEN** (`news_static_centered_scrim_1x1_v1`, `provider_template_id fb9820f8…`, proof `50f09ca2`, zero side-effects).
3. **B1-v1 crosses proof → production** (it produces real, publishable PP content) — hence the discovery verdict is **WARN**, not PASS.
4. CE anchor at planning time: `main == origin/main == 2eb3fe5`.

## Discovery (read-only findings)

- **Verdict: WARN.** B1-v1 is small and contained, but it moves from `_smoke/` proof into the
  **production publish pipeline** (real PP `image_quote` images that publish). Correct posture = WARN.
- **No DB / migration required.** Reuses `m.post_draft`, `m.post_render_log`, the
  `resolve_brand_assets` RPC, and the existing storage bucket. No schema change.
- **Production `image_quote` path** = the image-worker `index.ts` loop (≈ lines 497-510) that selects
  `approval_status='approved' AND image_status='pending' AND recommended_format='image_quote'` drafts,
  renders, then writes `image_url` + `image_status='generated'` to `post_draft` (production mutation —
  expected on this path) → normal queue → publishers.
- **Current production render** uses `getBrandAndSlug()` → **`c.client_brand_profile.brand_logo_url`**
  (NOT the governed resolver) and the legacy programmatic **`buildImageQuoteScript`** (1080×1080 PNG,
  solid brand-colour background, no photo). The governed B0 template is a **photo + scrim** card —
  a real visual-style change for PP `image_quote`.
- **B1-v1 proposal:** a **Property-Pulse-only governed branch INSIDE that loop** — every other client
  and every other format stays on the legacy path, byte-unchanged.

## Approved PK decisions (B1-v1)

- **A.** Authorized to produce **real PP `image_quote` production images** — **but only after a
  controlled publish-held proof** (no uncontrolled publishing on the first render).
- **B.** **Background policy = fixed default `bg_perth_cbd`** for B1-v1 (no rotation/selection yet).
- **C.** **Accept the visual-style change** (solid quote card → photo news card) — **Property Pulse
  pilot only.**
- **D.** **Include a minimal headline-length hard-gate** in v1 (cheap insurance against the B0
  overflow defect going public). **No AI rewrite** yet.
- **E.** **First proof must use a controlled, publish-held draft** — the first proof must **not**
  auto-publish.
- **F.** **Keep legacy `buildImageQuoteScript`** for non-PP clients and as the rollback target.

## Recommended implementation shape (image-worker only)

- **PP-gated branch** inside the `image_quote` loop, entered only when ALL hold:
  - `client_slug === 'property-pulse'`
  - `recommended_format === 'image_quote'`
  - `image_status === 'pending'`
  - implementation `news_static_centered_scrim_1x1_v1`
- **Governed resolver:** logo `pp_logo_primary` + background **`bg_perth_cbd`** via
  `resolve_brand_assets` (approved+active, URL present).
- **Minimal headline-length hard-gate** before the Creatomate call (decision D); fail the draft
  (`image_status='failed'`) if exceeded — no truncation, no AI rewrite.
- **Governed-only, fail-loud:** if the resolver or template render fails for PP, the draft goes
  `image_status='failed'` — **NO fallback to legacy `buildImageQuoteScript` for PP**.
- **Production write as normal:** `image_url` (→ `property-pulse/<draft>.jpg`) + `image_status='generated'`;
  stamp `render_spec.template` governed evidence (`resolver_used=true`, `fallback_taken=false`,
  `provider_template_id fb9820f8…`).
- **Unchanged:** non-PP clients (legacy `buildImageQuoteScript`); all other formats (video, avatar,
  carousel, animated, text); **queue/publish logic**; the 16:9 / manual-render / `_smoke/` proof paths;
  legacy Creatomate templates.

### Deferred to B1-v2+ (NOT in v1)

multi-brand activation · Advisor-driven template selection · full capability-contract validator ·
AI headline rewrite · alternate-template selection · background rotation/selection · B2 JSON renderer.

## Likely file list (when implemented — NOT this pass)

- `supabase/functions/image-worker/index.ts` — PP governed branch in the `image_quote` loop + minimal
  headline-length gate + version bump (v3.13.0 → v3.14.0). *(reuses `manual_render.ts` +
  `branch_b_proof.ts` helpers — likely unchanged)*
- a small **default-PP-background constant** (`bg_perth_cbd`).
- `supabase/functions/image-worker/*_test.ts` — PP-governed-branch test + non-PP legacy regression.
- (separate docs commit) register note recording the wiring.

## Proof plan

- **One controlled, publish-held PP `image_quote` draft** (decision E) rendered through the production path.
- Production render path **writes `post_draft.image_url` and `image_status='generated'`** (this is the
  expected production behaviour — distinct from the B0 `_smoke/` proof).
- **Verify `render_log` governed evidence:** `render_spec.template` with `resolver_used=true`,
  `fallback_taken=false`, `provider_template_id fb9820f8…`, assets `pp_logo_primary` + `bg_perth_cbd`,
  production path (`property-pulse/<draft>.jpg`, NOT `_smoke/`).
- **Verify no other brand/format affected** (non-PP `image_quote` still legacy; other formats untouched).
- **Verify queue/publish remains HELD during the proof** (the first render must not auto-publish).
- **After PK visual approval,** PK decides whether to release/continue PP `image_quote` governed production.

## Rollback plan

- **Code:** revert the image-worker commit + redeploy v3.13.0 → PP `image_quote` returns to legacy
  `buildImageQuoteScript`. The branch is additive + PP-gated, so revert fully restores legacy with
  zero blast radius to other brands.
- **Data:** pending drafts re-render via legacy after rollback. **Irreversible caveat:** any post
  already *published* with a governed image cannot be un-published — which is why the first proof is
  publish-held (decision E).

## Risks / open items carried into implementation

- Visual-style change is real (PP pilot only, accepted — decision C).
- Fixed `bg_perth_cbd` means every PP `image_quote` shows the Perth skyline until rotation/selection
  is built (B1-v2). Recorded, accepted for v1.
- No full contract validator in v1 — only the minimal headline gate (decision D); other overflow modes
  (non-empty subtitle, etc.) remain a known risk until the validator lands.
- Resolver becomes a hard dependency for PP `image_quote` (fail-loud → drafts fail rather than publish
  ungoverned — correct, but an availability consideration).

## Standing B1 blockers NOT resolved by B1-v1 (recorded)

shared / brand-agnostic family registry schema (`client_slug` mandatory) · governed resolver replacing
the brand-profile logo source **globally** (B1-v1 only does it for the PP `image_quote` branch) ·
publisher / broad `image_url` wiring beyond this path · Advisor→variant selection.

---

**Do not implement.** This pass records the approved cut plan only. Implementation is a separate
gated lane (ef-builder → branch-warden → external review → PK merge/deploy gates → controlled proof).
