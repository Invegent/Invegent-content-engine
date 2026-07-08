# Brief cc-0028 — LinkedIn image_quote-first media publish lane v0

**Created:** 2026-07-06 Sydney
**Author:** brief-author draft → PK-narrowed to image_quote-first (2026-07-06)
**Executor:** Claude Code (ef-builder for code; PK-run for deploy)
**Status:** draft — Gate-1 packet (awaiting PK approval; stop before build)
**Result file:** `docs/briefs/results/cc-0028-linkedin-image-media-publish-v0.md` (created on completion)

---

## Classification (PK-assigned, Gate 1)

- **Tier:** **T3** — production LinkedIn publish path + a DDL migration (`platform_support` flip).
- **Label:** **PRODUCT_PROOF**.
- **Scope shape:** image_quote-first. Carousel and video are explicitly deferred/blocked (below).

## Task

Enable **`image_quote`** posts to publish to LinkedIn (instead of being blocked) through the already-deployed `linkedin-zapier-publisher` EF, by building a real media-POST path that carries the rendered image URL to the Zapier "Create Company Update" **single** media field, branching on `decision.method`, and flipping `mediaPublishSupported`→`true` **only after** that path exists and is fail-closed. Carousel stays blocked/held; video stays hard-blocked.

---

## Orchestrator grounding note (live-truth, verified this session 2026-07-06)

- **Live deploy:** `linkedin-zapier-publisher` is live at Supabase **function version 37**, `verify_jwt=false`, `status=ACTIVE` (project `mbkmaxqhsohbtwsqolns`). Code banner still `v1.2.0`. (Guard originally PK-deployed at version 33, `--no-verify-jwt`.)
- **image_quote assets ready:** 51 LinkedIn `image_quote` drafts, **45 rendered** with a single `image_url` in the **public** `post-images` bucket (`is_public_bucket=true`, `/storage/v1/object/public/...`). Directly fetchable — no signed-URL blocker.
- **Historical text-fallback confirmed (the "12"):** exactly **12** non-text LinkedIn `m.post_publish` rows, all `status=published`, all with **text-only** payloads (`text_length` + `webhook_prefix`, no media), all `published_at < 2026-06-15` (before the guard). Post-guard: **0** non-text publishes. This is the bug the fail-closed design exists to prevent.
- **STILL OPEN (product):** whether the Zapier action accepts an ordered **array** of slide URLs for carousel — the reason carousel is deferred to a separate fast-follow lane, not shipped in v0.
- **db-rls-auditor handoff (pre-build):** confirm live `platform_support` values + recompute the migration post-check hashes before the GFCP migration is authored.

---

## Source context

- `supabase/functions/linkedin-zapier-publisher/index.ts` — the **LIVE** EF (`VERSION`, `index.ts:4`). Today POSTs **text-only** `{ text, title, client_name, post_draft_id, queue_id }` with **no media field** (`index.ts:230-241`).
- `supabase/functions/linkedin-zapier-publisher/guard.ts` — asset guard, called `{ mediaPublishSupported: false }` (`index.ts:172`); `image` returns `{ kind:'block' }` today (`guard.ts:58-63`); its forward-compat `image` branch returns `{ kind:'publish', method:'image' }` when a generated image + URL are present (`guard.ts:72`). Byte-identical copy required in `linkedin-publisher/guard.ts` (`guard.ts:7`).
- **CRITICAL TRAP (verified):** the call site branches only on `decision.kind === 'hold'` (`index.ts:174`) / `'block'` (`index.ts:186`); a `publish` decision of **any** method falls through to the text-only POST (`index.ts:209-210` → `230-241`). It **never reads `decision.method`**. Flipping `mediaPublishSupported` alone republishes the 12-post format-loss bug.
- `supabase/functions/image-worker/index.ts:404` — public `post-images` URL shape for the single `image_url`.
- `supabase/migrations/20260615110000_f_series_format_diversity_stage0_platform_support_publisher_reality.sql:99-101` — GFCP sets `image_quote` to `{"facebook":true,"linkedin":false,"instagram":true}`; migration ends with a planned-hash post-check `DO` block that self-rolls-back on mismatch (`:108-119`).
- `docs/briefs/results/f-publisher-assetguard-linkedin.md` — guard lane (commit `891f6eb`); `linkedin-publisher` v1.3.0 committed but **NOT deployed** (B24/F06, `:39`); 0 live post-guard fall-throughs (`:34`).
- `CLAUDE.md` — T3 review chain; `--no-verify-jwt` deploy gotcha; PGRST106 route-via-RPC.

---

## Scope

**In scope:**
- A media-POST path in `linkedin-zapier-publisher` for **`image_quote` only** (single rendered `image_url`) added to the Zapier webhook payload and mapped to the Zapier "Create Company Update" single Media/Image URL field.
- A **fail-closed** guard call site that branches on `decision.method`.
- Flipping `mediaPublishSupported` `false`→`true` (`index.ts:172`) **last** — only after the media path + fail-closed branch exist and are tested.
- A migration flipping GFCP `platform_support` `linkedin:true` for **`image_quote` only**, with pre/post verification and self-abort on hash mismatch.

**Explicitly out of scope (PK-specified):**
- **Carousel publishing** — stays blocked/held pending a separate fast-follow lane confirming Zapier ordered-slide support. Do NOT flip carousel GFCP in v0.
- **Video publishing** — stays hard-blocked (`guard.ts:88-91`). Do NOT flip video GFCP.
- The direct LinkedIn `/rest/posts` publisher (`linkedin-publisher` v1.3.0) — remains repo-only (B24/F06).
- Zapier action restructuring beyond the single image/media URL field.
- Dashboard work.
- Worker hardening beyond what this lane strictly requires (the `image-worker`/`video-worker` platform-filter inconsistency stays a named follow-up carry).
- Broad platform expansion.

---

## Required design (PK-specified — the lane contract)

1. **Build the media-POST path BEFORE flipping `mediaPublishSupported`.**
2. **Branch on `decision.method`** at the call site (do not rely on `decision.kind` alone).
3. **For `publish:image`,** include the rendered `image_url` in the Zapier payload (mapped to the single Zap Media/Image field).
4. **Fail closed** if `decision.method === 'image'` but **no image URL is present** — block, never POST text.
5. **Fail closed** if an **unsupported `decision.method`** appears — block, never fall through.
6. **Keep video hard-blocked.**
7. **Keep carousel blocked/held** until a separate fast-follow lane confirms Zapier ordered-slide support.

## GFCP migration (PK-specified)

- Use a **migration** to flip `platform_support` `linkedin:true` for **`image_quote` only**.
- Migration must include **pre/post verification** and **self-abort on hash mismatch** (extend the `20260615110000` post-check pattern, `:108-119`).
- Do **not** flip carousel in v0. Do **not** flip video.
- db-rls-auditor confirms live `platform_support` + recomputed hashes before authoring.

## Allowed actions

- ef-builder in an **isolated worktree**: edit `linkedin-zapier-publisher/index.ts` (resolve `image_url`, branch on `decision.method`, add the media field, flip the flag last); author the image_quote-only GFCP migration.
- Extend the deno guard/integration test (precedent: `docs/briefs/f-publisher-assetguard-linkedin-validation.test.ts`) proving: `publish:image` + present URL → media POST; `publish:image` + missing URL → block, never text; unsupported method → block; video still blocks; carousel still blocked/held.
- Local checks (deno check/test), branch-warden, db-rls-auditor (migration), external review on the FINAL diff pinned to `reviewed_input_hash`.
- Prepare (not run) the exact `supabase functions deploy linkedin-zapier-publisher --no-verify-jwt --project-ref <ref>` command + the migration apply, for the PK gate.

## Forbidden actions

- Flip `mediaPublishSupported` before the media path + fail-closed `decision.method` branch exist and pass tests.
- Enable video or carousel; weaken the `video`/`unknown`/carousel block branches.
- Deploy the direct `linkedin-publisher` EF (B24/F06 not authorised).
- Deploy without `--no-verify-jwt`.
- Broad/global enable — first live enable is single-client/single-draft (below).
- Touch seeding/throttle/approval gate, worker platform filters (carry only), or any active hold.
- Re-emit the whole EF/migration from stale context; surgical diffs only; re-verify HEAD before commit.

## Dry-run / proof (PK-specified)

- **Staged single-client / single-draft** proof.
- Confirm the Zap payload includes: **`text` · `title` · `client_name` · `post_draft_id` · `queue_id` · `image_url` / media_url field**.
- Confirm **no text-only fallback is possible** for an `image_quote` draft.
- PK visual check that the image renders on the LinkedIn post before any broader enable.

## Hard STOPs (PK-specified — any trips the lane, resume needs a fresh PK gate)

- Zap field cannot accept a single media URL.
- `image_url` missing (for a draft routed as `publish:image`).
- `decision.method` ignored or falls through.
- Carousel or video becomes publishable.
- GFCP hash mismatch.
- Any post publishes **text-only for an `image_quote` draft**.
- Any unexpected queue/publish side effect.

## Stop condition

Persist this narrowed brief as the Gate-1 packet. **Stop at PK approval before build.** After approval: build in an isolated worktree, run the review chain, then **hard-stop at the PK deploy gate** (deploy + migration apply are PK-run, `--no-verify-jwt`). After the staged single-client proof, stop again for PK before any broader enable.

---

*Gate-1 packet. Approval is PK's. Nothing here is built, deployed, migrated, or `mediaPublishSupported`-flipped by this file. Carousel/video remain blocked. brief-author base verdict: `clean` / DRAFT_READY (candidate-level scrutiny — its first code/DB-lane brief), narrowed to image_quote-first per PK on 2026-07-06.*
