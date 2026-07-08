# Brief cc-0029 — LinkedIn governed image_quote supply proof v1

**Created:** 2026-07-07 Sydney
**Author:** orchestrator draft (follow-on to cc-0028) — PK approves at gate 1
**Executor:** Claude Code (ef-builder for code; PK-run for deploy/apply/publish)
**Status:** draft — Gate-1 packet (awaiting PK approval; stop before build)
**Predecessor:** `docs/briefs/results/cc-0028-linkedin-image-media-publish-v0.md`
**Result file:** `docs/briefs/results/cc-0029-linkedin-governed-image-quote-supply-proof-v1.md` (on completion)

---

## Classification (proposed, Gate 1)

- **Tier:** **T3** — production publish path + a DDL migration (GFCP flip) + a live supervised publish.
- **Label:** **PRODUCT_PROOF**.

## Task

Prove that a **fresh, governed/TMR-rendered** Property Pulse `image_quote` draft can be **assigned to LinkedIn, rendered through the governed path, and published as one supervised native LinkedIn image post** — with a **persisted, correct audit row** — **after** the required safety fix is in place. Close the gap cc-0028 left: cc-0028 proved the media *transport*; cc-0029 proves the *governed creative supply* end-to-end.

## Source context (from cc-0028)

- **Transport is proven & live:** `linkedin-zapier-publisher` v1.3.0 (fn version 38, `verify_jwt=false`) publishes an image_quote draft's `image_url` as a native LinkedIn image (no text fallback). Repo landed local-only at main `4e81263` (unpushed).
- **Render coverage is confirmed:** the image-worker governed branch is **client-gated** (`client_id 4036a6b5…`), and `select_template('property-pulse','linkedin','image_quote',…)` returns a governed winner (`generic_market_insight_card_1x1_v1`, production_proven; governed bg/logo/scrim). See cc-0028 result §7.
- **The upstream gate is assignment:** GFCP `image_quote → linkedin:false` (`t."5.3_content_format"`) blocks the resolver from creating new LinkedIn image_quote drafts. The held migration `20260706120000` flips it to `true` (pre/post md5 self-abort; `aaae14e7…` → `f31ad64…`), UNAPPLIED.
- **Required safety fix (F3, pre-existing EF defect):** the publisher's `post_publish` insert **hardcodes `attempt_no=1`** and **does not check its `.error`**, so a republish collides on `uq_publish_attempt UNIQUE (post_draft_id, attempt_no)`, the error is swallowed, and the queue is marked `published` with **no audit row**. Must be fixed before broadening.
- **Two open product decisions:** LinkedIn aspect (1:1 vs `generic_linkedin_landscape_card_1200x628_v1`); and whether to formally back the LinkedIn platform scope (clears `platform_suitability_unproven` / `platform_scope_unbacked` warnings) or accept them.
- **Held production state:** cron **jobid 54 paused** (all LinkedIn auto-publish OFF); GFCP migration unapplied; no broadening.

## Ordered plan (PK-specified)

1. **Fix `attempt_no` / unchecked `post_publish` insert FIRST** (safety). A republish must never lose its audit row or report `published` on a failed write. Approach options (ef-builder to propose): derive/increment `attempt_no` (e.g. `max(attempt_no)+1` per draft) **and** check the insert `.error` (fail the row / requeue on error rather than swallowing). Applies to the published-path insert (and, for parity, the guard-block insert). Ship + review + PK-gated deploy of the publisher fix before step 4.
2. **Decide LinkedIn aspect** — 1:1 governed card vs the `generic_linkedin_landscape_card_1200x628_v1` template (PK/creative decision; may be a registry/selector change if landscape is chosen).
3. **Decide LinkedIn platform suitability/scope** — formally back it (clear the warnings) or accept the advisory warnings for v1 (PK/creative decision).
4. **Apply GFCP `image_quote → linkedin:true`** (migration `20260706120000`) — **only after** step 1 lands. db-rls-auditor re-confirms the live baseline md5 immediately before apply (self-abort on drift).
5. **Produce/await a fresh, NEVER-published PP LinkedIn image_quote draft** (`image_status` progressing `pending→generated`; zero prior `post_publish` rows).
6. **Confirm it renders through the governed/TMR path** — governed winner + governed assets on the actual draft (not legacy); `image_url` points to the governed render.
7. **Publish exactly ONE supervised native LinkedIn image post** — single-client/single-draft, cron 54 still paused, manual `limit=1` fire (staged as the sole due item), PK visual confirmation of governed creative.
8. **Verify the `post_publish` audit row persists** with `method='image'` and `image_sent=true`, `status=published`, no swallowed error (proves F3 fixed).
9. **Only then** decide whether cron 54 can be re-enabled and broadening (other drafts/clients) can start — a fresh PK gate.

## Scope

**In scope:** the publisher `attempt_no`/insert-error fix; the GFCP image_quote→linkedin:true apply; sourcing/confirming one fresh governed PP LinkedIn image_quote draft; one supervised governed publish + audit verification; the aspect + scope-backing decisions.

**Out of scope (unless a decision above opens them):** carousel/video; other clients; broad enable / cron re-enable (deferred to the final gate); the direct `linkedin-publisher` EF; dashboard; rewriting the governed selector beyond an aspect-ratio choice.

## Forbidden actions

- Apply the GFCP migration **before** the F3 safety fix lands.
- Re-enable cron 54 or broaden before step 9's fresh PK gate.
- Publish more than one supervised draft; publish an already-published or legacy-rendered draft.
- Deploy without `--no-verify-jwt`; push/merge/apply/deploy without the PK gate.

## Success criteria

- F3 fixed and proven (a republish writes a distinct audit row; an insert error never reports `published`).
- GFCP live shows `image_quote → linkedin:true` (post-check md5 `f31ad64…`); no other row changed.
- One fresh PP LinkedIn image_quote draft renders governed (governed winner + governed assets, not legacy).
- Exactly one supervised native LinkedIn image post, PK-visually-confirmed as governed creative.
- Its `post_publish` row persists with `method='image'`, `image_sent=true`, `status=published`.
- Aspect + scope-backing decisions recorded.

## Stop condition

Persist as the Gate-1 packet; **stop at PK approval before build.** Each irreversible step (publisher-fix deploy, GFCP apply, live publish) is a PK gate; cron re-enable + broadening is the final, separate PK gate after step 8.

---

## Non-negotiables carried

- One supervised draft at a time; cron 54 stays paused through the proof.
- `guard.ts` copies stay byte-identical if the shared guard is touched.
- Standard T3 chain: brief-author/ef-builder · branch-warden · db-rls-auditor (DB) · external review pinned to hash · PK deploy/apply/publish gates.

*Gate-1 packet. Approval, tier, and label are PK's. Nothing here builds, applies, deploys, or publishes until PK approves.*
