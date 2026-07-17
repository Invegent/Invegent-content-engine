# Brief — G0b · D6-5 real brand-payload de-hardcode

**Status:** Gate-1 APPROVED 2026-07-17 (design fork resolved by PK: contract-registry source).
**Lane class / tier:** PRODUCT_PROOF · T3 (production-touching render payload; image path only).
**Base HEAD:** `e7923c9` (image-worker v3.27.0 / ai-worker v2.18.0 — Spine Gen v2 reconciled to main).
**Governing spec:** `docs/briefs/tmr-d6-chokepoint-inventory-v2.md` §6 (D6-5) · exit-test `docs/briefs/tmr-d7-second-brand-exit-test-v1.md` (D7-C3).

## Task

Replace the safe fail-closed non-PP brand-payload guard (`brand_payload_non_pp_fail_closed`) in
`buildProofFieldsFromDraft` with a **real governed read**, so a non-PP client no longer hard-fails
purely for being non-PP AND never receives PP's hardcoded `PROPERTY NEWS` / `propertypulse.com.au`.
PP output stays byte-identical.

## Source context (evidence-cited)

- D6-5 chokepoint: `category:'PROPERTY NEWS'` + `footer:'propertypulse.com.au'` written into the live
  render `modifications` — [`branch_b_proof.ts:63`](../../supabase/functions/image-worker/branch_b_proof.ts:63),
  [`:68`](../../supabase/functions/image-worker/branch_b_proof.ts:68) → mapped to `CategoryBadge.text` /
  `Footer.text` via `TMR_WINNER_TEXT_FIELDS` ([`b1_production.ts:184`](../../supabase/functions/image-worker/b1_production.ts:184)).
- Current guard fails **closed** for any non-PP `client_id` ([`:59`](../../supabase/functions/image-worker/branch_b_proof.ts:59)) — safe, but blocks D7/NDIS.
- **`c.client_brand_profile` has NO domain/website/footer column** (verified live, project `mbkmaxqhsohbtwsqolns`; only `website_scraped_at` timestamp); `c.client` has none either → the literal "footer from client_brand_profile" is not implementable without a DDL lane (out of scope).
- The governed source that already carries both literals per-client: the D6-3 registry
  `resolveCreativeContract(client_id, recommended_format).fields.renderer_fixed`
  ([`creative_contract.ts:160-165,222`](../../supabase/functions/image-worker/creative_contract.ts:160)) — vendored from
  `docs/creative-library/property-pulse.json` (category L338 / footer L340). Keyed on `client_id`, pure/no-I/O, currently unused in the image render path.

## PK Gate-1 decision

**Contract-registry source (Design A).** `category`, `footer`, `location` come from
`resolveCreativeContract(client_id, recommended_format).fields.renderer_fixed`. Covered by the lane's
"**or equivalent governed client profile**" latitude. No schema change, no new DB read.

## In scope

- Image path only. `buildProofFieldsFromDraft` ([branch_b_proof.ts](../../supabase/functions/image-worker/branch_b_proof.ts)) sources `category`/`footer`/`location` from the resolved contract's `renderer_fixed`; `date` stays render-computed; `headline` stays the hard-gate; `subtitle` stays `''` (overridden downstream by `deriveB1Subtitle`).
- Fail closed when **no** contract resolves for `(client_id, recommended_format)` → throw `brand_payload_contract_unresolved` (replaces `brand_payload_non_pp_fail_closed`).
- Fail closed when a resolved contract is **missing** required `category`/`footer` → throw `brand_payload_contract_incomplete`.
- Headline hard-gate keeps precedence (missing headline throws first, before any contract lookup).
- Add an injectable resolver param (default `resolveCreativeContract`) purely so the non-PP populated case is hermetically testable (mirrors the existing injectable `today`).
- Version bump in the entrypoint `index.ts` (`VERSION` const + header) — required to change the entrypoint hash so the drift gate reclassifies (helper-only fix otherwise stays A-LE and `safe-deploy` blocks it). image-worker v3.27.0 → **v3.28.0**. Update the one stale `index.ts` comment describing the old guard.
- Tests (see Required proof).

## Out of scope / Forbidden

- No video path change. No NDIS data mutation. No governance flip. No render/publish. No DDL/schema change. No new DB read. No `client_brand_profile` column. No D7 data build-out. No change to PP text/branding (must stay byte-identical). No ai-worker change. No `_shared` bundling.

## Required proof (tests, hermetic)

1. **PP no-regression:** PP `client_id` + `image_quote` → `category='PROPERTY NEWS'`, `footer='propertypulse.com.au'`, `location=''`, `date` computed (proves the governed read returns PP-identical).
2. **Non-PP missing-profile fail-closed:** unregistered non-PP `client_id` (and `null`/`''`) → throws `brand_payload_contract_unresolved`.
3. **Non-PP populated-profile:** injected resolver returns a non-PP contract → `category`/`footer` are that brand's values, **not** PP; composed through `TMR_WINNER_TEXT_FIELDS` the emitted `CategoryBadge.text`/`Footer.text` carry the non-PP values and **no PP string** (D7-C3 payload assertion, not render status).
4. **Contract-incomplete fail-closed:** injected resolver returns a contract missing `footer` → throws `brand_payload_contract_incomplete`.
5. Existing determinism / whitespace-trim / 6-key-shape / missing-headline-precedence tests stay green.

## Success criteria

`deno test` + `deno check` clean for image-worker; PP byte-behaviour-identical; the four D6-5 proofs above pass; branch-warden `safe`; external review pinned to the final diff hash.

## Stop condition

STOP at the PK T3 deploy gate. No commit/deploy/merge/push without explicit PK authorisation.
The D6-5 guard stays safe (fail-closed) throughout — it is being *replaced by a verified governed read*, never merely lifted.
