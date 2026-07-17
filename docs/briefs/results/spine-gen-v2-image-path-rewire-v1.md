CLAIMED v5.66 · spine-gen-v2-image-path-rewire · isolated-worktree · PK-closeout-gate · 2026-07-17T07:04Z
(renumbered v5.64→v5.66 2026-07-17: v5.64 stub stranded below the committed register head v5.65 `8aa5535` "D4 FORMALLY CLOSED"; v5.66 = next free above the head, verified free. v5.64 abandoned, not backfilled. Independently confirmed against origin/main git truth.)

# Result — Spine Gen v2 (image path) rewire

**Status:** IN PROGRESS — ef-builder lane open; STOP at PK deploy gate.
**Brief:** `docs/briefs/spine-gen-v2-image-path-rewire-brief-v1.md` (Gate-1 APPROVED 2026-07-17).
**Lane class / tier:** PRODUCT_PROOF · T3.
**Base HEAD:** `ef308e2` (origin parity clean).

## PK Gate-1 decisions
1. ONE deploy, all four units (D6-1/D6-2/D6-3/D6-4).
2. NDIS enablement = separate downstream lane (not this).
3. Governance read = image-local (no shared helper this lane).
4. D6-3 dedup mechanism = per-client resolver, keep two vendored files + strengthen the cross-file no-drift parity test (orchestrator recommendation; PK left to orchestrator judgment; no new `_shared` bundling pattern in this gate-lift deploy).

## Non-negotiable STOPs (PK)
- D6-1+D6-2 atomic (no staged slug-only).
- No UUID-fallback slug (fail-closed on null `client_slug`).
- D6-5 `brand_payload_non_pp_fail_closed` guard stays live (image-worker v3.26.0 baseline).
- PP output byte-identical (no-regression proven) before deploy gate.
- Video path untouched.

## Lane record (through the deploy gate)

**Worktree:** `C:\Users\parve\ice-wt-spine-gen-v2` · branch `spine-gen-v2-image-rewire` · base `ef308e2` · LOCAL-ONLY, staged not committed.
**Final diff sha256:** `0bb0a62b619efe2365ccf804fb002d78d97c3210bad4550133349de9b8852cf5` (530 lines, 10 files).
**Version bumps:** image-worker v3.26.0→**v3.27.0** · ai-worker v2.17.0→**v2.18.0**.

### Units (all four, one change set)
- **D6-1+D6-2 (atomic):** gate `isB1GovernedImageQuote(clientId)` → `await isImageGovernanceEnabled(supabase, clientId, 'image_quote')` (reads `c.client_creative_governance.enabled`, fail-closed → legacy); slug resolved via new `getGovernedClientSlug` (throws `governed_slug_unresolved` on null, never the UUID fallback), threaded into both `select_template` `p_client_slug` and the storage path. Both helpers in new image-local `image_governance.ts` (NOT `_shared`).
- **D6-3:** `resolveCreativeContract` → registry lookup keyed on `gate.client_id::gate.recommended_format` (PP identical; brand-extensible). Both vendored copies byte-identical (parity test green).
- **D6-4:** `validateContract` accepts optional per-variant expected identity, defaulting to PP `EXPECTED_*` (warn-only, PP byte-identical). Limitation: image render path still uses PP defaults until a caller passes per-variant identity (deferred coupling — accepted).

### Gate results
- **ef-builder:** 4 units done; 142 image+ai-worker `deno test` pass; `deno check` clean both entrypoints; PP byte-behaviour-identical.
- **branch-warden:** `safe` — exactly the 10-path set, isolated on `ef308e2`, main+origin parity `0/0`, nothing under `video-worker/**`, no leak into main. (Noted: main checkout independently dirty with unrelated lanes' edits → no git writes in main checkout.)
- **External review** (`review_id 10901cd5-ac57-4f46-a3b6-496ab6a32966`, hash-pinned): `partial` / risk medium / conf medium → **auto-escalated to PK**. **No concrete defect** raised; triage = `policy_decision`/`scope_design_concern` (human sign-off on brand-governance change touching client-facing output) + "verify no other `enabled=true` rows". Its verifiable point is answered by the live pre-checks below.
- **Live deploy-gate pre-checks (fresh 2026-07-17):** (a) ONLY `enabled=true` image_quote governance row = PP (property-pulse) — no other client enters the governed branch ✓ · (b) PP image_quote governance enabled=true ✓ · (c) PP `client_slug`='property-pulse' non-null ✓.

### Deploy plan (HELD — PK authorises)
`supabase functions deploy ai-worker --no-verify-jwt` → then → `supabase functions deploy image-worker --no-verify-jwt` (flag REQUIRED on both — x-series-key callers; CLI default flips verify_jwt→true → 401/502).
**Rollback:** redeploy prior versions (image-worker v3.26.0 / ai-worker v2.17.0) from `ef308e2`; no DB state to unwind (no writes/migration).
### Deploy (PK-run, 2026-07-17)
- **ai-worker v2.18.0 LIVE** (deployed source verified: `CREATIVE_CONTRACT_REGISTRY` present; PP-identical).
- **image-worker v3.27.0 LIVE** (deployed source verified: `isImageGovernanceEnabled`, `getGovernedClientSlug`/`governed_slug_unresolved`, production `p_client_slug: governedSlug` + `${governedSlug}/…` storage path; cc-0037 smoke branch still PP-pinned by design; boots clean, cron 200, no runtime errors).
- **Deploy note:** first deploy attempt redeployed the OLD source (run from the main checkout, HEAD ef308e2) — caught by post-deploy source verification (deployed-artifact-mismatch STOP); re-deployed from the worktree. ai-worker landed on the re-deploy, image-worker on a third targeted deploy. All now current.
- **Post-deploy pre-checks (a)(b)(c):** re-confirmed green (only PP enabled=true image_quote; PP gov enabled; PP slug=property-pulse).
- **OPEN watch:** no PP image_quote draft has rendered through v3.27.0 yet (none pending in-window) — live governed-render proof lands on the next PP draft; confirm then.

### Remaining closeout (PK-gated)
- **Source-of-truth reconciliation:** deployed = worktree v3.27.0/v2.18.0 but `main` is still `ef308e2` (v3.26.0/v2.17.0). Commit branch `spine-gen-v2-image-rewire` → fast-forward merge to `main` → push, so the repo matches production. (Main checkout is independently dirty with unrelated lanes — merge only advances the image/ai-worker files; do not sweep the unrelated dirty files.)
- **Rebase required (origin advanced):** `origin/main` moved `ef308e2`→`8aa5535` (v5.65 D4-close + tmr-drift-probe v2.1.0) after this session bootstrapped. FF-merge no longer possible → rebase branch `spine-gen-v2-image-rewire` onto `8aa5535` first. Intervening commits touch `tmr-drift-probe` + docs only — **zero overlap** with the 10 worker files → clean rebase; deployed worker artifact unchanged (re-verify post-rebase).
- **Register cut v5.66** (renumbered from v5.64 — stranded below committed head v5.65): sync_state + action_list pointers (Convention 1).
- **Worktree teardown** after merge.

