CLAIMED v5.67 · g0b-d6-5-brand-payload-de-hardcode · isolated-worktree · DEPLOYED-merged-local · push+register HELD · 2026-07-17

# Result — G0b · D6-5 real brand-payload de-hardcode

**Status:** DEPLOYED (image-worker v3.28.0 LIVE, source-verified) + FF-merged to LOCAL `main` (`e1ee2bf`). **Push HELD** (origin/main still `e7923c9`, ahead 1) — PK authorises push + register cut.
**Brief:** `docs/briefs/g0b-d6-5-brand-payload-de-hardcode-brief-v1.md` (Gate-1 APPROVED 2026-07-17).
**Lane class / tier:** PRODUCT_PROOF · T3.
**Base HEAD:** `e7923c9` (image-worker v3.27.0 — origin parity clean).
**Governing spec:** `tmr-d6-chokepoint-inventory-v2.md` §6 (D6-5) · exit-test `tmr-d7-second-brand-exit-test-v1.md` (D7-C3).

## PK Gate-1 decision
Governed source for `category`/`footer`/`location` = the **D6-3 contract registry**
(`resolveCreativeContract(client_id, recommended_format).fields.renderer_fixed`), NOT a new
`client_brand_profile` column. Reason: `c.client_brand_profile` has **no** domain/website/footer
column (verified live, project `mbkmaxqhsohbtwsqolns`) and `c.client` has none either — the literal
"footer from client_brand_profile" needs a DDL lane, out of scope. The registry is the
"equivalent governed client profile" the lane wording allows; PP byte-identical, no schema change,
no new DB read.

## Non-negotiable STOPs (PK)
- Image path only; video/ai-worker untouched.
- No NDIS data mutation, no governance flip, no publish/render.
- PP output byte-identical.
- D6-5 stays fail-closed throughout — replaced by a verified governed read, never merely lifted.

## Lane record (through the deploy gate)

**Worktree:** `C:\Users\parve\ice-g0b-d6-5` · branch `g0b-d6-5-brand-payload` · base `e7923c9` · LOCAL-ONLY, staged-not-committed.
**Final diff sha256:** `47cc0f8f20be740015ad0fbec29969c8f70d274c0939409b5cf5d81663aa4aae` (3 files).
**Version bump:** image-worker v3.27.0 → **v3.28.0** (VERSION const in the entrypoint `index.ts`).

### Change (3 files, image-worker only)
- **`branch_b_proof.ts`** — `buildProofFieldsFromDraft` sources `category`/`footer`/`location` from
  `resolveCreativeContract(client_id, recommended_format).fields.renderer_fixed`. Order: headline
  hard-gate FIRST → resolve contract (null → throw `brand_payload_contract_unresolved`, replacing
  `brand_payload_non_pp_fail_closed`) → `category`+`footer` required (undefined →
  `brand_payload_contract_incomplete`), `location` optional (`''`) → return; `date` stays
  render-time. Injectable `resolve` param (default = real resolver) for hermetic tests. Import
  swapped `B1_GOVERNED_CLIENT_ID` → `resolveCreativeContract`. First time the image render path
  imports the contract resolver.
- **`branch_b_proof_test.ts`** — PP-default tests kept (now prove no-regression via the governed
  read); non-PP fail-closed message → `brand_payload_contract_unresolved`; added non-PP
  populated-profile (injected resolver → brand values + D7-C3 emitted-payload proof through
  `TMR_WINNER_TEXT_FIELDS`, PP-free), contract-incomplete → `brand_payload_contract_incomplete`,
  and headline-gate-precedence tests.
- **`index.ts`** — `VERSION` `image-worker-v3.27.0`→`v3.28.0` + v3.28.0 header + one additive
  `[SUPERSEDED by v3.28.0]` marker. **No logic change**; call sites (smoke ~729, production ~845)
  already pass `client_id`+`recommended_format:'image_quote'` → resolve identically. Bump lives in
  the entrypoint so the drift gate reclassifies A-LE→B-FD (drift-check hashes only `index.ts`).

### Gate results
- **ef-builder:** 3 files; `deno check` clean; full image-worker `deno test` **128/128** (with
  `--allow-read`, a pre-existing flag requirement of `creative_contract_test.ts`, not a regression);
  PP byte-behaviour-identical.
- **branch-warden:** `safe` — exactly the 3 files, isolated on `e7923c9`, origin parity 0/0, no
  commit yet, no leak into the main checkout.
- **db/security:** NOT required — no DB read changed (the resolver is a pure in-module registry
  lookup; no new query, no DML/DDL).
- **External review:** `review_id 5bbfef54-0f84-487f-8f92-b9264ada2587`, hash-pinned to
  `47cc0f8f…` — **agree · risk low · confidence high · no pushback · proceed** (no escalation).

### Production-safety framing (for the deploy gate)
Only PP has `client_creative_governance.enabled=true` for `image_quote` (spine-gen-v2 pre-check
(a), 2026-07-17), so only PP drafts reach `buildProofFieldsFromDraft` in production today → PP
byte-identical → **this change is behaviourally inert for production as it stands.** It only
changes behaviour WHEN a future non-PP client is governance-enabled: that client then needs a
registered contract or fails closed (the intended D6-5 outcome). No non-PP literal can reach any
render — the registry holds only the PP entry.

### Deploy (PK-run, 2026-07-17)
- **image-worker v3.28.0 LIVE** — `supabase functions deploy image-worker --project-ref
  mbkmaxqhsohbtwsqolns --no-verify-jwt`, run **from the worktree** `C:\Users\parve\ice-g0b-d6-5`.
  Deployed source verified via `get_edge_function`: VERSION `image-worker-v3.28.0`; new throws
  `brand_payload_contract_unresolved` + `brand_payload_contract_incomplete` present; governed
  `renderer_fixed.find` read wired; old `brand_payload_non_pp_fail_closed` survives ONLY in
  comments (not a throw); spine-gen-v2 markers `isImageGovernanceEnabled`/`getGovernedClientSlug`
  intact (no regression).
- **Deploy note (bundles-from-CWD near-miss):** first attempt ran from the WRONG dir
  (`ice-wt-spine-gen-v2`, which lacks `image-worker/index.ts`) → **no-op**, production stayed
  v3.27.0 (verified). Re-run from the correct worktree landed v3.28.0. `config.toml` pins
  `image-worker verify_jwt=false`, so JWT-safe.
- **safe-deploy.sh note:** its `--check-only` gate BLOCKED on class `A-LE` — a STALE false-positive
  (drift view recorded `deploy_version 3.26.0` @ 05:39Z, predating the v3.27.0 deploy, and cannot
  see the uncommitted v3.28.0; live source was independently confirmed v3.27.0). Deployed via the
  raw CLI from the worktree (spine-gen-v2 precedent). Drift-check refresh queued (below).
- **Post-deploy pre-checks:** (a) ONLY `property-pulse` has `client_creative_governance.enabled=true`
  for `image_quote` → only PP reaches the builder → PP byte-identical, no non-PP fail-closed in
  production ✓ · image-worker edge-function logs all 200, no boot errors (lone 500 = unrelated
  `pipeline-ai-summary`, pre-existing) ✓.

### Source reconciliation
- Commit `e1ee2bf` on branch `g0b-d6-5-brand-payload` (3 files, +132/−23; reviewed diff sha256 +
  external review id in the message) → **FF-merged to LOCAL `main`** (`e7923c9`→`e1ee2bf`, clean
  linear). `origin/main` still `e7923c9` — **ahead 1, push HELD for PK**. Delta `origin..HEAD` =
  exactly the 3 image-worker files.

### Remaining closeout (PK-gated)
- **Push** `main` → `origin/main` (hard stop — explicit PK go).
- **Register cut v5.67** (sync_state + action_list pointers, Convention 1).
- **Drift-check refresh** so `m.vw_ef_drift_current` reflects v3.28.0 (clears the stale A-LE):
  `POST /functions/v1/drift-check?write=true&slug=image-worker`.
- **Worktree teardown** (`ice-g0b-d6-5`) after push — mind the node_modules junction hazard if it applies.
- **WATCH:** first live PP `image_quote` render through v3.28.0 confirms PP byte-identity in production.
