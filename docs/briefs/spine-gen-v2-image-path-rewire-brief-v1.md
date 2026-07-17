# Brief — Spine Gen v2 (image path): de-hardcode the PP identity gate + selector slug + contract

**Created:** 2026-07-17 Sydney
**Author:** chat (orchestrator)
**Executor:** ef-builder (isolated worktree) → PK deploy gate
**Status:** draft — **Gate-1 approval HELD until D4/C lands on origin** (per PK)
**Lane class / tier:** PRODUCT_PROOF · **T3** (production render worker; deploy = irreversible)
**Result file:** `docs/briefs/results/spine-gen-v2-image-path-rewire-v1.md` (on completion)

---

## Task

Rewire the image-worker governed `image_quote` path so it is **brand-agnostic** instead of Property-Pulse-literal. Four de-hardcoding units from the ratified D6 inventory, image path only:

- **D6-1 + D6-2 (ONE atomic change).** Replace the `isB1GovernedImageQuote(clientId)` PP-UUID boolean with a `c.client_creative_governance` lookup (the table the video gate already reads), and pass the **draft's resolved client slug** to `select_template` and the storage path — never the `B1_GOVERNED_CLIENT_SLUG` constant.
- **D6-3.** Replace the frozen single-client contract + UUID-keyed `resolveCreativeContract` with a per-client contract lookup, and **de-duplicate** the two byte-identical `creative_contract.ts` files.
- **D6-4.** Make the warn-only contract-identity validation expectations **per-variant** (sourced from the resolved contract), not the PP-literal `EXPECTED_*` constants.

Target second client = **NDIS Yarns**. Design the rewire so it *governs* NDIS Yarns, and produce the precondition list NDIS Yarns needs before it can actually render (it has only a fenced logo intake today). **This brief is design + code-lane scoping only — no implementation, no deploy, no DB writes, no video-path touch.**

## Source context

- [`docs/briefs/tmr-d6-chokepoint-inventory-v2.md`](tmr-d6-chokepoint-inventory-v2.md) §3 (unit table) + **§6** (the committed removal plan — this brief's basis). PK-ratified denominator of record.
- [`supabase/functions/image-worker/b1_production.ts:28`](../../supabase/functions/image-worker/b1_production.ts:28) `B1_GOVERNED_CLIENT_ID` · [`:33`](../../supabase/functions/image-worker/b1_production.ts:33) `B1_GOVERNED_CLIENT_SLUG` · [`:83`](../../supabase/functions/image-worker/b1_production.ts:83) `isB1GovernedImageQuote` (the **D6-1** gate).
- [`supabase/functions/image-worker/index.ts:798`](../../supabase/functions/image-worker/index.ts:798) gate wiring · [`:806`](../../supabase/functions/image-worker/index.ts:806) `select_template` call (slug arg) · [`:860`](../../supabase/functions/image-worker/index.ts:860) storage-path slug (the **D6-2** sites).
- [`supabase/functions/image-worker/creative_contract.ts`](../../supabase/functions/image-worker/creative_contract.ts) + [`supabase/functions/ai-worker/creative_contract.ts`](../../supabase/functions/ai-worker/creative_contract.ts) — the **D6-3** byte-dup pair (differ only in the line-1 header comment; verified by local `diff`). Live consumer: [`ai-worker/index.ts:993`](../../supabase/functions/ai-worker/index.ts:993) `resolveCreativeContract`. The image-worker copy's resolver is **not** imported by the render path.
- [`supabase/functions/image-worker/contract_validation.ts:10`](../../supabase/functions/image-worker/contract_validation.ts:10) `EXPECTED_VARIANT_KEY` · [`:11`](../../supabase/functions/image-worker/contract_validation.ts:11) `EXPECTED_CONTRACT_REF` · [`:16`](../../supabase/functions/image-worker/contract_validation.ts:16) `EXPECTED_CONTRACT_VERSION` (the **D6-4** PP-literals) · wired [`index.ts:844`](../../supabase/functions/image-worker/index.ts:844).
- **Mirror pattern:** [`supabase/functions/video-worker/b1_video_stat.ts:74`](../../supabase/functions/video-worker/b1_video_stat.ts:74) `isB1GovernedVideoStat` + the video gate's `c.client_creative_governance.enabled` runtime read — the governance-table read this rewire brings to the image path.
- **`select_template` definition** (verified live, project `mbkmaxqhsohbtwsqolns`, SECURITY DEFINER): resolves the passed `p_client_slug` → `client_id`, then requires a **per-client** `creative_template_client_assignment` at `visually_approved`+ (step d, `WHERE client_id = v_client_id`), a **passed `visual_approval` proof event** on that assignment (step e), and `resolve_slot_assets` = `ok` (step f). This is why passing the *resolved* slug is correct and sufficient for D6-2 — it routes each client to its own assignment + assets.
- **D6-5 coupling (out of scope here, hard dependency):** [`supabase/functions/image-worker/branch_b_proof.ts:59`](../../supabase/functions/image-worker/branch_b_proof.ts:59) `buildProofFieldsFromDraft` now throws `brand_payload_non_pp_fail_closed` for any non-PP client (deployed image-worker **v3.26.0**), and its `category:'PROPERTY NEWS'` / `footer:'propertypulse.com.au'` literals ([`:63`](../../supabase/functions/image-worker/branch_b_proof.ts:63), [`:68`](../../supabase/functions/image-worker/branch_b_proof.ts:68)) still feed the winner text map. **Owned by the D6-5 safety lane — do NOT fix here.**

## Scope

**In scope (image path, four units):**
- D6-1: `isB1GovernedImageQuote` → runtime `c.client_creative_governance` lookup keyed on `(client_id, format='image_quote')` with `enabled=true`, fail-closed (mirrors the video gate).
- D6-2: pass the draft's **reliably-resolved** client slug to `select_template` (`p_client_slug`) and to the storage path, atomically with D6-1.
- D6-3: per-client contract resolver + de-dup of the two `creative_contract.ts` files.
- D6-4: per-variant contract-validation expectations sourced from the resolved contract.
- Updating the affected unit tests (gate, contract, validation, and the cross-file no-drift consistency guard referenced in [`creative_contract.ts:9`](../../supabase/functions/image-worker/creative_contract.ts:9)).
- The NDIS-Yarns **precondition list** (design output; see below) — no execution of it.

**Out of scope (explicit):**
- **D6-5 brand-payload de-hardcode** (`category`/`footer`) — separate safety lane already open.
- **All video units** (D6-6/D6-7/D6-8/D6-9) and any `video-worker/**` edit — PK-held.
- Any **DB write**: creating NDIS governance rows, assignments, proof events, promoting assets, sourcing backgrounds — those are the *NDIS enablement lane*, downstream of this rewire.
- Any deploy, migration, register cut, or the `enabled=true` flip for NDIS.
- `tmr-drift-probe` and `property-pulse.json` (out-of-scope per inventory §2a).

## Allowed actions

- Static read of repo/registers/DB (read-only) to design and cite.
- (At execution, post-Gate-1) ef-builder edits in an **isolated worktree**, local-only, LOCAL tests.
- Return the diff + a deploy plan to the orchestrator for external review + the PK deploy gate.

## Forbidden actions

- No implementation, deploy, migration, DB write, or register mutation in this Gate-1 draft.
- Never touch `video-worker/**` or fix D6-5.
- Never reuse `getBrandAndSlug`'s slug when it can be the client-id **UUID fallback** ([`b1_production.ts:24-27`](../../supabase/functions/image-worker/b1_production.ts:24), the v3.14.0 defect) — the resolved slug for `select_template` must come from a canonical `c.client.client_slug` read, fail-closed if null.
- Do not lift the gate **staged** (gate lifted, slug still PP): inventory §6 rules this "strictly worse" — it resolves a second brand against PP's own templates/logo/backgrounds.
- Do not proceed to Gate-1 approval until **D4/C lands on origin** (PK hold).

## Success criteria (of the rewire, once executed — not of this draft)

- PP `image_quote` renders **byte-behaviour-identical** to today (governance row already `enabled=true`; contract identity unchanged) — proven on PP first, zero regression.
- The gate is a `c.client_creative_governance` read: a client with an `enabled=true` `image_quote` row enters the governed branch; a client with a disabled/absent row falls to legacy.
- `select_template` and the storage path receive the **draft's resolved slug**; a null/unreliable slug fails closed (no UUID-slug leak).
- The two `creative_contract.ts` files are de-duplicated; `resolveCreativeContract` resolves per-client (returns PP's contract for PP, null/na for a client with no registered contract).
- Contract validation expectations derive from the resolved contract, not PP literals.
- A non-PP client with a governance row but incomplete registry/assets **fails closed** (no wrong-brand render) — verified by the existing fail-loud throws + the D6-5 `brand_payload_non_pp_fail_closed` guard.

## NDIS-Yarns preconditions (grounded in live DB, project `mbkmaxqhsohbtwsqolns`)

NDIS Yarns `client_id = fb98a472-ae4d-432d-8738-2273231c1ef4`, slug `ndis-yarns`. **The rewire makes the code brand-agnostic, but NDIS cannot render end-to-end until ALL of these land** (each is a separate, PK-gated step, NOT part of this brief):

| # | Precondition | Live state today | Blocks |
|---|---|---|---|
| N1 | `c.client_creative_governance` row `(NDIS, image_quote, enabled=true)` | **0 rows** (PP has 2) | D6-1 gate → legacy |
| N2 | `c.creative_template_client_assignment` for NDIS on the generic `image_quote` template at `visually_approved`+ | **0 rows** (PP has 17) | `select_template` step d → `no_assignment` |
| N3 | `c.creative_template_proof_event` `visual_approval=passed` on that NDIS assignment | none (no assignment) | `select_template` step e → `not_visually_proven` |
| N4 | Governed **logo** asset for NDIS (un-fenced: `is_active` + `approved` + `production_use_allowed`) | 17 logo candidates, **ALL fenced** (`intake_candidate`, all three flags false) | `resolve_slot_assets` Logo slot fail-closed |
| N5 | Governed **background** assets for NDIS | **0 backgrounds exist** | `resolve_slot_assets` Background slot → `buildTmrRenderPlan` throws `tmr_slot_resolution_incomplete` |
| N6 | **D6-5 brand-payload de-hardcode** landed (category from taxonomy, footer from `c.client_brand_profile`) | PP-literal + fail-closed guard live (v3.26.0) | `buildProofFieldsFromDraft` throws `brand_payload_non_pp_fail_closed` for NDIS |
| N7 | Per-client contract registered for NDIS (feeds D6-3/D6-4) | none | validation warns / contract resolver returns null |

Already satisfied: publish profile `image_generation_enabled=true` (FB/IG/LI); a real non-null slug (`ndis-yarns`, no UUID-fallback risk); a `brand_logo_url` exists in `client_brand_profile` — **but** its brand colours are the ICE defaults (`#0A2A4A`/`#1C8A8A`), likely placeholder, and the governed image path resolves the logo via `resolve_slot_assets` (N4), *not* `brand_profile`, so the profile logo does not satisfy N4.

**Key scope truth to record:** this rewire (D6-1/2/3/4) is **necessary but not sufficient** for a live second-brand render. Its correct, safe outcome is that NDIS **fails closed** until N1–N7 complete. The D6-5 fail-closed guard is precisely what makes it safe to land and prove this rewire on PP now with **zero risk of PP branding leaking onto NDIS**.

## Files touched (rewire lane — for the eventual ef-builder pass)

- `supabase/functions/image-worker/b1_production.ts` — retire the PP-literal gate const/fn; slug no longer a constant.
- `supabase/functions/image-worker/index.ts` — gate wiring (:798), slug into `select_template` (:806) + storage path (:860). **This is the drift-check entrypoint** — since `index.ts` changes, the fix reclassifies cleanly (no A-LE stall; cf. `drift-check-hashes-only-entrypoint`).
- `supabase/functions/image-worker/contract_validation.ts` — per-variant expectations.
- `supabase/functions/image-worker/creative_contract.ts` + `supabase/functions/ai-worker/creative_contract.ts` — dedup + per-client resolver (likely one shared/vendored source).
- `supabase/functions/ai-worker/index.ts:993` — `resolveCreativeContract` call site, if its signature changes.
- Test files: `image-worker/*_test.ts` for the gate, contract, validation, and the no-drift guard.
- Possible new shared helper for the governance-table read (image + video both read `c.client_creative_governance`).

## Test surface

- Hermetic unit: gate returns governed for an `enabled=true` client, legacy for disabled/absent; slug pass-through; slug fail-closed on null; per-client contract resolution (PP → PP contract, unknown → null); per-variant validation.
- The cross-file no-drift consistency guard (`creative_contract.ts` ↔ `b1_production.ts` constants) must survive the dedup.
- Post-deploy live proof: one PP `image_quote` render, unchanged output + evidence (`render_spec.tmr`, `background_key`, contract validation `pass`).

## Rollback

Single EF surface (`image-worker`; `ai-worker` only if its call site changes). **No DB migration in the rewire itself.** Rollback = redeploy the prior image-worker (and ai-worker) binary; nothing to reverse in the DB. Rollback path must be written + validated before the T3 apply.

## STOP / risk points

1. **Atomic D6-1+D6-2** — mandatory; a staged lift renders wrong-brand (inventory §6). STOP if the diff lifts the gate without also passing the resolved slug.
2. **Slug reliability** — the resolved slug must not be `getBrandAndSlug`'s UUID fallback (v3.14.0 defect). STOP if the design reads slug from a path that can yield the UUID.
3. **D6-5 guard must be live** — confirm image-worker **v3.26.0** (the `brand_payload_non_pp_fail_closed` guard) is the deployed baseline before the gate lift. If the guard is ever removed while the gate is generic and D6-5's real fix is not in, a second brand renders PP branding (fails OPEN — highest severity).
4. **PP no-regression** — PP must resolve identically; prove on PP before any NDIS enablement.
5. **Video untouched** — STOP if any `video-worker/**` file appears in the change set.
6. **External review + PK deploy gate** — final diff → `ask_chatgpt_review` (pinned hash) → PK T3 deploy gate. Deploy stays a hard stop.

## Open decisions for PK (Gate-1)

1. **Atomic-vs-staged (bundling).** D6-1+D6-2 are non-negotiably atomic. Do D6-3 + D6-4 ride the **same** deploy, or a follow-up? They are additive / warn-only (no gate-behaviour effect). *Recommendation: one deploy for all four* (single EF, single review, prove once on PP), with D6-3/D6-4 splittable to a fast-follow if the gate change must land first.
2. **NDIS enablement = separate lane?** This brief *designs for* NDIS and lists N1–N7 but executes none of them. *Recommendation: yes — the rewire ships and proves on PP; NDIS enablement (governance row + assignment + visual proof + logo promotion + background intake + D6-5) is its own downstream brief with its own gates.* Confirm, or ask that this brief absorb NDIS enablement.
3. **Shared governance-read helper.** Extract the `c.client_creative_governance` read into a helper shared by image + video gates (video already reads it), or keep image-local for now? *Recommendation: image-local in this lane; unify when the video units (D6-6/7) are done.*

## Stop condition

Return this brief for PK Gate-1 review. Gate-1 is **held** until D4/C lands on origin. On approval, proceed to the ef-builder pass per the proof lane; no register cut is claimed by this draft (claims route through the orchestrator).

---

## Notes

- Evidence for N1–N7 gathered via read-only SELECTs against `mbkmaxqhsohbtwsqolns` on 2026-07-17 (orchestrator read-only, CCF-02 R1 — DB is not this lane's mutation subject). Live NDIS asset/registry truth should be re-confirmed at the NDIS enablement lane's own gate before any promotion.
- The `creative_contract.ts` pair diff is header-comment-only (line 1); the contract data + resolver body are identical — the dedup is safe.
