# Interim Publisher Safety Patch — block asset-less publish (CCD-ready brief)

**Brief ID:** `publisher-interim-assetless-guard`
**Parent evidence:** Series v2 reconciliation `fad2a501` (issue #6). Live incident reproduced.
**Status:** BRIEF ONLY — no implementation. Gates: CCD patch on branch → D-01 → PK exact phrase → CLI deploy → V-checks → close-out.
**Class:** `ef_deploy` — publisher EF only. Baseline `publisher-v1.8.0`, blob `56b1d1da` (28,895 B).
**Framing:** NOT full T2. This is an **asset-existence/status gate only** — no OCR, transcript, visual, audio, or brand checks.
**Authority impact:** none (docs-only brief).

---

## 1. Incident summary

Live PP Series v2 child: draft `1d34577bbb5a`, FB post **`962399936961457_122114734587268380`**, `recommended_format=image_quote`, `image_status=failed`, `image_url` absent — yet `publish=published`. The publisher released an image-format post **with no image, silently downgraded to a text feed post**. One PP post is live without its intended image. Same asset-less class as the prior 44-row leak; now confirmed live and reproducible.

## 2. Root cause (verified in source `56b1d1da`)

The IMAGE HOLD GATE only catches `image_status === "pending"`:
```
if (wantsImage && draft.image_status === "pending" && !imageReady) { ...hold... }
```
When `image_status === "failed"`, this condition is **false** → execution falls through to the publish block, where `hasImage = (image_url && image_status==='generated')` is **false** → the `else` branch runs `fbPostToFeed` (text). **A failed image render silently downgrades an image_quote post to a text post and publishes it.** Not a queue-creation issue, not a status mismatch — it's a **missing failed/absent-asset guard**; the only asset check is a `pending`-timeout hold that doesn't cover `failed`, `null`, or non-image asset formats. Classification (your Q2): **publisher ignored render failure → fell back to text.**

Second latent gap found: the publisher has **no video-asset gate at all** — it only inspects `image_status`. A `video_short_*` draft reaching the publish block with no video asset would also hit the text `else` branch. (FB carousel *does* have a `generated`-gate already; image_quote and video do not.)

## 3. Affected formats / platforms

**Formats requiring an asset (must be guarded):** image_quote, carousel, animated_text_reveal, animated_data, video_short_kinetic, video_short_stat, video_short_kinetic_voice, video_short_stat_voice, video_short_avatar. **text** = no asset, must still publish.
**Platforms:** this brief patches the **Facebook publisher** (the EF read here, where the incident occurred). LinkedIn/Instagram/YouTube publishers are **separate EFs** — the brief flags they need the same guard (likely the same bug class) but scopes the patch to the FB publisher first; a follow-up applies the identical guard to the other three (each its own small `ef_deploy`). **Carousel already has a partial `generated` gate** in the FB publisher; image_quote and video do not.

## 4. Recommended minimal patch

A single **asset-required guard** in the FB publisher, evaluated after approval gate, before the publish block:
```
requiresAsset = recommended_format ∉ {text}            // everything non-text needs an asset
isImageFormat = recommended_format ∈ {image_quote, animated_text_reveal, animated_data}
isVideoFormat = recommended_format starts_with 'video_short'
isCarousel    = recommended_format == 'carousel'   // existing gate retained

if requiresAsset:
  if isImageFormat: require image_status=='generated' AND image_url present
  if isCarousel:    require image_status=='generated' AND >=2 generated slides   (tighten existing)
  if isVideoFormat: require video_status=='generated' AND video_url present
  else (unknown asset format): require image_url OR video_url present  // conservative default-deny
  → if NOT satisfied: BLOCK (see §5). Never fall through to fbPostToFeed for an asset-required format.
```
Key change: the existing `pending`-only hold becomes a **terminal-aware block** — `failed`/`null`/missing-asset on an asset-required format must **block, not downgrade to text**. The `image hold timeout → publish as text` path (`console.warn("image hold timeout … publishing as text")`) must be removed for asset-required formats (it is itself a silent-downgrade route).

## 5. Block behaviour

When the guard blocks:
- **Do not publish.** No `post_publish` 'published' row.
- If asset status is **non-terminal** (`pending`, still rendering) and within a reasonable window → **requeue** with `last_error='asset_pending:<status>'` (preserve current hold semantics for genuine in-progress renders).
- If asset status is **terminal** (`failed`) or asset is structurally absent past the hold window → mark queue row **`dead`** (or `failed`-terminal) with `dead_reason='assetless_blocked:<format>:<status>'`, **do not requeue** (avoid infinite republish attempts on a terminal failure), and **preserve the draft** for operator review/retry. Write a `post_publish` 'failed' row recording the block reason for audit (mirrors the existing invalid-token failed-row pattern).
- Clear, queryable reason in both `post_publish_queue.last_error`/`dead_reason` and the `post_publish.error`.

## 6. Not full T2

This patch = **asset existence + render-status gate** only. It does NOT inspect asset *content*: no OCR, no transcript/audio match, no visual safety, no brand/disclaimer checks, no aspect/duration. Those remain the full T2 lane. This is the minimum to stop publishing posts whose required asset is missing or failed.

## 7. Existing queued items (sweep, read-only this lane)

Current `queued`/`pending` asset-required items: FB image_quote ×2 (generated), FB carousel ×1 (generated), IG image_quote ×1 + carousel ×1 (generated), LI carousel ×1 (generated), **YouTube video_short_avatar ×5 (`image_status=pending`, no video asset yet)**. **No `failed`-asset rows currently queued** → the patch will not strand any present queue item; the generated ones publish normally, the 5 YT avatar rows are genuinely mid-render (correctly held, not blocked). **Deploy verification needs no pre-sweep cleanup** — but post-deploy, confirm the 5 YT avatar rows either render→publish or block cleanly if their render terminally fails (they're the closest live test of the video guard). The already-published asset-less post (`1d34…`) is historical; this patch is preventative and does not retroactively pull it (operator action).

## 8. Rollback

Single-step: redeploy `publisher-v1.8.0` (blob `56b1d1da`) via CLI. No DB change in this patch (guard is pure EF logic + existing queue-status writes), so no DB rollback. Worst case if the guard is too strict: asset-required posts hold/dead instead of publishing — visible, non-destructive, reverted by redeploy.

## 9. Validation plan (post-deploy, read-only + controlled)

1. image_quote with `image_status=generated` + url → **publishes** (photo path), no regression.
2. image_quote with `image_status=failed` → **blocked**, queue `dead`, `dead_reason` set, draft preserved, **no FB post, no text downgrade**.
3. image_quote with `image_status=pending` within window → **held + requeued** (existing behaviour preserved).
4. carousel with <2 generated slides → **blocked** (tightened), not single-image fallback for an asset-required carousel.
5. video_short_* with no video asset → **blocked** (new video guard), no text downgrade.
6. **text post → still publishes** with no asset (critical non-regression).
7. blocked item records a clear, queryable reason.
8. no regression on the currently-queued generated items (they publish).
9. confirm no `post_publish` 'published' row is ever written for an asset-required format without the asset.

## 10. D-01 risk notes

- **Behaviour change on a live publisher** — mitigate: guard only *blocks* a path that currently produces a *defective* publish; it cannot cause a wrong publish, only prevent one. Full prior blob retained.
- **False-block risk** (too strict → legitimate posts held): bounded — only asset-required formats affected; text unaffected; held/dead is visible and reversible; generated assets pass.
- **rollback:** single-step redeploy, no DB rollback.
- **no T2 / no other subsystem touched:** ai-worker/Advisor/compliance/render workers/queue schema unchanged; only the FB publisher decision logic.
- **other publishers (LI/IG/YT) still have the bug** until the follow-up — call this out so it's a known, tracked residual, not a silent gap.
- `known_weak_evidence`: video guard untested live (no failed-video row currently); the 5 YT avatar rows are the first natural test.

## 11. Explicitly out of scope

Full T2 (OCR/transcript/visual/audio/brand); scheduling (#7, separate lane); Series v2 Stage 4; the LI/IG/YT publisher guards (immediate follow-up, separate briefs); retroactive handling of the already-published asset-less post (operator action); queue mutations (none in this lane).

## 12. What CCD may implement after PK approval

A single `ef_deploy` to the FB publisher: add the asset-required guard (§4) before the publish block; convert the `pending`-only hold + text-timeout-fallback into a terminal-aware block (§5) for asset-required formats; retain text publishing and the carousel generated-gate (tightened to ≥2 slides). Deploy via Supabase CLI; commit-then-deploy (A-LE). No DB change. Then schedule the identical guard for LI/IG/YT publishers as follow-up briefs. Nothing before D-01 + PK phrase.
