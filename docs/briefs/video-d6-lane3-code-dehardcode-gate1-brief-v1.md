# Brief — Video D6 Lane 3: video-worker code de-hardcode (D6-8 + D6-6 + D6-7, ATOMIC) — Gate-1

**Status:** Gate-1 DRAFT for PK admission. **Lane class:** PRODUCT_PROOF. **Tier:** T3 (production-touching code + EF deploy).
**Base HEAD:** `adbc8a6` (origin/main, parity 0/0). **Predecessor:** Lane 2 v5.83 — `select_template('video_short_stat')` now resolves PP (fb/ig/li `ok`), NDIS `fail_closed`, image unregressed.
**Governing:** arc brief `docs/briefs/video-d6-unblock-arc-gate1-brief-v1.md` · inventory `tmr-d6-chokepoint-inventory-v2.md` §3/§4/§6.

## Goal

Route the governed PP `video_short_stat` production render through the **live TMR spine** instead of the direct-bind, mirroring the image path (`image-worker/b1_production.buildTmrRenderPlan`). One atomic change covering D6-8 + D6-6 + D6-7; **no behaviour change for any other client/format** (fail-closed preserved).

## The three de-hardcodes (atomic)

- **D6-8 (direct-bind + logo source).** `renderGovernedVideoStat` currently calls `buildGovernedVideoStatPlan(fields, brand.logoUrl, …)` — template = constant `B1_VIDEO_PROVIDER_TEMPLATE_ID` ([b1_video_stat.ts:52](../../supabase/functions/video-worker/b1_video_stat.ts:52)), logo = brand profile. **Change:** call `public.select_template(clientSlug, platform, 'video_short_stat', …)`, then a **baked-bg** plan builder consumes the response: `provider_template_id` ← `selected.provider_template_id`; `Logo.source` ← `slot_resolution.modifications['Logo.source']`. **Background stays BAKED** — the builder requires Logo.source only (NOT Background.source — the one deliberate divergence from image `buildTmrRenderPlan`, which requires both). Fail-loud: selector `status!='ok'` or `slot_resolution.status!='ok'` or missing Logo.source → throw (→ `video_status='failed'`, no fallback).
- **D6-6 (PP-UUID gate).** Drop the `isB1GovernedVideoStat(client_id, fmt)` PP-UUID check from the production fork; gate on `fmt === 'video_short_stat' && await isVideoGovernanceEnabled(supabase, client_id, …)` — governance-driven, generalizes to any enabled client, fail-closed. (Mirrors image: `isB1GovernedImageQuote` is retained but is no longer the production gate — [b1_production.ts:87](../../supabase/functions/image-worker/b1_production.ts:87).)
- **D6-7 (contract literals).** `variant_key` ← `selected.variant_key` (selector response). `contract_ref` in `B1VideoTmrEvidence` → **design decision below** (drop, mirroring image evidence which carries none; or derive).

## Design decisions for PK (Gate-1)

1. **Platform argument** to `select_template` in the one-video-per-draft path (video is 9:16, not per-platform): **(a) pass `null`** → permissive + `platform_input_missing`/`platform_suitability_unproven` warnings (matches the image path's accepted noise; simplest) — *recommended*; **(b)** pass a fixed representative platform; **(c)** pass the draft's target platform if one exists. Lane 2 seeded suitability `candidate`/`feed` for fb/ig/li, so (b)/(c) would resolve without the suitability warning.
2. **`contract_ref` in evidence (D6-7):** **(a) drop it** — mirror image `TmrEvidence` (no contract_ref); simplest, fully de-hardcoded — *recommended*; **(b)** keep it, derived from the registry (selector does not return it → needs an extra read).
3. **Render-parity proof method (Lane 3 success gate):** supervised **`governed_video_stat_smoke`** (non-publishing, `postDraftId=null`) on the de-hardcoded worker → the render MUST be visually+audibly identical to proven `8c41689a` (same `c11bb8ab`, logo `PP_logo_2.png`, baked bg, combo audio) → **PK visual+audio PASS** before deploy. (Alt: controlled publish-safe re-render of an existing PP draft, cc-0033a pattern.)

## In scope
- `supabase/functions/video-worker/` only: `b1_video_stat.ts` (plan builder → spine-driven, baked-bg) + `index.ts` (`renderGovernedVideoStat` call site + the gate + `VERSION`/index bump). Hermetic unit tests for the new builder (fail-loud paths + baked-bg Logo-only contract).
- The `governed_video_stat_smoke` entrypoint updated to the spine path (so the parity proof exercises the real code).

## Out of scope / Forbidden
- **No** registry mutation (Lane 2 is done), **no** governance flip, **no** second-brand (NDIS) video enable, **no** publish.
- **No** D6-9 voice map change (Lane 4). **No** image-worker/ai-worker change. **No** DDL.
- **No** change to the legacy `isKinetic`/`isStat`/`processDraft` bodies — they stay byte-identical.
- **No deploy** without the T3 chain + PK gate 2. **No push** without a PK gate.

## Required proof (exit)
- Hermetic tests pass (ef-builder, isolated worktree).
- Spine-driven render parity: PK visual+audio PASS vs `8c41689a` (decision 3).
- Fail-closed proof: the de-hardcoded path throws (no render) for a non-governed client / NDIS video (select_template `fail_closed`).
- branch-warden `safe` · external review pinned to the final diff hash · db-rls-auditor N/A (no DB change) — confirm read-only-only.

## Preconditions
- **⚠ Creatomate key ROTATED** — before ANY Lane 3 render/smoke, confirm the `CREATOMATE_API_KEY` EF secret carries the NEW value (else renders fail). Key value NEVER in transcript. [[creatomate-api-gotchas]]
- Deploy path: `scripts/safe-deploy.sh video-worker --allow-warn` (raw deploy deny-listed); a helper-only change needs a paired `index.ts` version bump to reclassify A-LE→B-FD [[drift-check-hashes-only-entrypoint]] — the `VERSION` bump here covers it.

## Stop condition
Lane 3 STOPs at the **PK deploy gate (gate 2)** after the parity proof. No deploy, no push, no Lane 4 without a fresh PK gate.
