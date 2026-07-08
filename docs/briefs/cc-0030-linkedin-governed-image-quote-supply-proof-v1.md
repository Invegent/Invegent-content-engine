# Brief cc-0030 — LinkedIn governed image_quote supply proof v1 (FUTURE follow-on)

**Created:** 2026-07-08 Sydney
**Status:** FUTURE / not started — Gate-1 packet, opens only on an explicit PK decision to resume
**Tier (proposed):** T3 · **Label:** PRODUCT_PROOF
**Predecessors:** `docs/briefs/results/cc-0028-linkedin-image-media-publish-v0.md` · `docs/briefs/results/cc-0029-linkedin-attempt-no-safety-closeout-and-parking.md`

---

## Why this lane exists

The LinkedIn media lane was **parked** at TRANSPORT PROVEN / GOVERNED SUPPLY CARRY (cc-0029). Transport works and the `attempt_no` audit safety fix is done. What remains unproven is **governed creative actually reaching LinkedIn**: assigning `image_quote` to a fresh LinkedIn draft, rendering it through the governed/TMR path, and publishing it once, supervised, with a persisted audit row. This lane does that — and only that. It supersedes the governed-supply scope of the parked cc-0029 brief.

## Preconditions (must all hold before this lane runs)

- cc-0029 safety fix **deployed + verified** (linkedin-zapier-publisher **v1.4.0** live; production GET returns v1.4.0). Governed publishing must not run on the pre-fix EF.
- Explicit PK decision to resume (this lane is parked by default).

## Scope

**In scope:** the GFCP `image_quote → linkedin:true` apply; sourcing/confirming ONE fresh, never-published PP LinkedIn image_quote draft; confirming its governed/TMR render; ONE supervised native LinkedIn publish; verifying the persisted audit row; the aspect + platform-scope product decisions; the cron-54 re-enable decision.

**Out of scope:** carousel/video; other clients; broad enable (deferred to the final gate); the direct `linkedin-publisher` EF; dashboard; the sibling-publisher attempt_no carry (separate lane).

## Ordered plan (PK-specified)

1. **GFCP flip** — apply migration `20260706120000` (`image_quote → linkedin:true`; pre/post md5 self-abort `aaae14e7…` → `f31ad64…`). db-rls-auditor re-confirms the live baseline immediately before apply. **Only after** v1.4.0 is deployed.
2. **Fresh draft** — produce/await ONE new, never-published PP LinkedIn image_quote draft (`image_status` progressing `pending→generated`; zero prior `post_publish` rows). Screen candidates for prior publishes (the cc-0028 selection miss must not recur).
3. **Governed render proof** — confirm the draft renders through the governed/TMR path: governed winner (`select_template` → e.g. `generic_market_insight_card_1x1_v1`) + governed background/logo/scrim on the actual `image_url` (not a legacy render).
4. **One supervised native LinkedIn publish** — cron 54 still paused; stage the single draft as the sole due item; manual `limit=1` fire; PK visual confirmation of **governed** creative on LinkedIn.
5. **Persisted audit row** — verify the `post_publish` row lands with `method='image'`, `image_sent=true`, `status='published'`, correct `attempt_no`, `audit_row_inserted:true`. This is also the runtime proof of the cc-0029 safety fix.
6. **Cron 54 re-enable decision** — only after 1–5 pass; a separate explicit PK gate. Broadening (other drafts/clients) is a further, separate gate.

## Product decisions to settle (carried from cc-0028)

- **Aspect:** LinkedIn 1:1 governed card (current winner) vs `generic_linkedin_landscape_card_1200x628_v1` (available as an alternative, not selected).
- **Platform scope backing:** formally back LinkedIn suitability/scope in the creative registry (clear `platform_suitability_unproven` / `platform_scope_unbacked`) or accept the advisory warnings for v1.

## Forbidden actions

- Run this lane before v1.4.0 is deployed + verified, or without an explicit PK resume decision.
- Apply the GFCP migration before the safety fix is live.
- Publish more than one supervised draft; publish an already-published or legacy-rendered draft.
- Re-enable cron 54 or broaden before their separate PK gates.
- Deploy/apply/push without the PK gate; deploy without `--no-verify-jwt`.

## Success criteria

- v1.4.0 live (precondition).
- GFCP `image_quote → linkedin:true` (post-check md5 `f31ad64…`); no other row changed.
- One fresh PP LinkedIn image_quote draft renders governed (governed winner + governed assets, not legacy).
- Exactly one supervised native LinkedIn image post, PK-visually-confirmed as governed creative.
- Its `post_publish` row persists (`method='image'`, `image_sent=true`, `attempt_no` correct).
- Aspect + scope-backing decisions recorded.

## Stop condition

Parked. Opens only on explicit PK resume. Each irreversible step (GFCP apply, live publish, cron re-enable) is its own PK gate. Standard T3 chain applies: brief-author/ef-builder · branch-warden · db-rls-auditor (DB) · external review pinned to hash · PK gates.

---

*Future follow-on. Supersedes the governed-supply scope of the parked cc-0029 brief. Nothing runs until PK resumes and each gate is cleared.*
