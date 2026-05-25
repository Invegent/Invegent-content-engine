# Brief F-HEYGEN-WORKER-LANDSCAPE-DIMENSION — switch avatar render to Shorts-native portrait

**Created:** 2026-05-25 Sydney
**Author:** chat
**Status:** ✅ IMPLEMENTED & VALIDATED (2026-05-25) — was: AUTHORED. Portrait **720×1280** shipped (deployed first as heygen-worker **v1.2.0**, EF v31; the same dimension is carried forward in the current **v2.0.0**).

> **✅ FINAL OUTCOME (closeout 2026-05-25):** `submitHeyGenJob` dimension switched `1280×720 → 720×1280` (9:16). Recommended `720×1280` (not `1080×1920`) held — HeyGen accepted it with no plan-tier rejection. Portrait **validated** on draft **40f9fa25**: stored MP4 confirmed **720×1280** (Windows shell props), avatar full-width with modest brand-colour top/bottom bands (mild letterbox — usable Short; full-bleed would need portrait-origin avatars → logged as a future enhancement). D-01 ef_deploy `a62a5ff6` (GENERIC-NON-BLOCKING per L46, closed). The dimension lives on in the current heygen-worker **v2.0.0**. Full closeout: `docs/operations/avatar-youtube-pipeline-status-2026-05-25.md`.
**Priority:** P3 → effectively P2-blocking (it is the hard prerequisite for the recommended production path of F-YT-PUB-AVATAR-EXCLUSION). No client-facing regression — avatar has never published.
**Result file:** `docs/briefs/results/f-heygen-worker-landscape-dimension.md` (created on completion)

---

## Header / metadata

**Linked systems**
- `supabase/functions/heygen-worker/index.ts` — **v1.1.0** (deployed version 30, byte-identical to repo). The sole file in scope.
- HeyGen v2 API — `POST https://api.heygen.com/v2/video/generate` (the `dimension` field).
- `m.post_draft` — avatar drafts whose stored MP4 (`video_url`) is the render output. (Read for validation only; no mutation in this brief.)

**Scope (hard boundaries)**
- **heygen-worker only.** No youtube-publisher changes. No auto-publish changes. No catalog / advisor / ai-worker changes.
- Preserve current F-HEYGEN Option A state: ai-worker v2.13.0 avatar-draft creation, the validated draft `ba5b34eb`, and the publisher's still-active avatar exclusion all remain untouched.

**Dependencies**
- **F-HEYGEN-NEVER-PRODUCED** (`docs/briefs/f-heygen-never-produced.md`, Option A) — validated: avatar drafts generate, render, and store an MP4 end-to-end. This brief fixes the *shape* of that output. Hard upstream dependency.
- **F-YT-PUB-AVATAR-EXCLUSION** (`docs/briefs/f-yt-pub-avatar-exclusion.md`) — downstream consumer. This brief is **Option B step 1** of that brief; publisher enablement stays deferred to it. This brief does **not** enable publishing.

**Governance**
- **`ef_deploy` D-01 required** (per `docs/runtime/mcp_review_protocol.md` + ICE-PROC-001) — heygen-worker is an Edge Function.
- **Explicit PK approval phrase required** before deploy. Approval of this brief is not approval to deploy.
- **repo↔deploy sync:** deployed v1.1.0 == repo (verified this audit). The edit must be committed to repo **and** deployed from `C:\Users\parve\Invegent-content-engine` (PK deploys manually; Windows MCP times out on `functions deploy`). No drift.

---

## Current defect

Avatar renders are **16:9 landscape** but the pipeline target is **YouTube Shorts** (9:16 vertical). `submitHeyGenJob` hardcodes the HeyGen render canvas to landscape:

`supabase/functions/heygen-worker/index.ts:66`
```ts
dimension: { width: 1280, height: 720 },
```

The validation draft `ba5b34eb` was rendered at this dimension. A 16:9 video will not be classified by YouTube as a Short regardless of the publisher's `#Shorts` tags (Shorts require vertical/square). This is the exact dimension mismatch cited in migration `20260508052400_f_yt_pub_avatar_exclusion_...sql` as the reason avatar was originally excluded from YouTube, and named there as this brief's home.

**Step-1 read-only confirmations (2026-05-25):**
1. Read `heygen-worker/index.ts` (v1.1.0). ✅
2. `submitHeyGenJob` dimension is `{ width: 1280, height: 720 }` — line 66, the **only** dimension occurrence in the file. ✅
3. Dimension is passed as the top-level `dimension` field of the `payload` object (lines 60-67), POST'd to `HEYGEN_GENERATE` = `https://api.heygen.com/v2/video/generate` (lines 68-72). ✅
4. HeyGen accepts portrait via the same `dimension {width,height}` object (orientation is driven entirely by which value is larger). See API-compatibility risk below. ✅
5. **No stored metadata records width/height.** `processDraft`'s `updatedFormat` (lines 149-156) writes only `heygen_video_id`, `heygen_video_url`, `video_url`, `render_style`, `rendered_at`. Confirmed against `ba5b34eb`'s live `draft_format` — no `width`/`height`/`dimension` keys anywhere. ✅
6. **Changing the dimension affects future renders only.** The value is used solely at submit time; already-stored MP4s are immutable files in `post-videos`. Existing renders are unaffected; re-rendering a draft requires re-running the worker on it. ✅

---

## Proposed fix — portrait dimension

Switch the render canvas to portrait 9:16. **Recommended value: `720×1280`** (see recommendation rationale below). Bump `VERSION` to `heygen-worker-v1.2.0`.

### Exact code delta

`supabase/functions/heygen-worker/index.ts`

Line 7 (version marker):
```diff
-const VERSION           = 'heygen-worker-v1.1.0';
+const VERSION           = 'heygen-worker-v1.2.0';
```

Line 66 (the dimension — the substantive change):
```diff
-    dimension: { width: 1280, height: 720 },
+    dimension: { width: 720, height: 1280 },   // 9:16 portrait — YouTube Shorts native
```

Plus a header comment line documenting the v1.2.0 change. No other change. The downstream code (`pollHeyGenJob`, `downloadAndStore`, the `m.post_draft` update) is dimension-agnostic and needs no edit.

### Recommendation: `720×1280` (not `1080×1920`)

**Recommended: `720×1280`.** It is the **same pixel budget** (921,600 px) as the currently-working `1280×720` render — just rotated — so it is guaranteed to sit within the account's current HeyGen plan tier (which already rendered `ba5b34eb` successfully at 720p). `1080×1920` (≈2.07M px, 1080p tier) is **not recommended for the first cut**: HeyGen's free/lower API tiers cap export at 720p and reject higher resolutions with *"Please subscribe to higher plan to generate higher resolution videos."* `720×1280` matches this brief's stated fallback condition exactly and removes plan-tier risk from the validation. If the account is confirmed on a 1080p-capable plan and PK wants max quality, `1080×1920` can be a follow-up bump after the portrait path is proven.

---

## API compatibility risk

- **Orientation works, but landscape-origin avatars get letterboxed.** HeyGen support confirms that when a `talking_photo` / Instant Avatar was *originally created in landscape*, requesting portrait dimensions yields a portrait **canvas** with the avatar **centered and white/black bars top & bottom** — it does not auto-fill the frame. There is **no `fit` parameter** to control this. So `720×1280` guarantees a *portrait file* (which is what YouTube Shorts classification needs) but **not** necessarily a full-bleed avatar. Whether the result looks good depends on how the source talking photos in `c.brand_avatar` were captured. → validation must include an **eyeball check**, not just an aspect-ratio assert.
- **Plan-tier cap (mitigated by the recommendation).** `720×1280` stays at the proven 720p budget; `1080×1920` risks a plan rejection. Recommendation already chooses the safe value.
- **Background already a flat colour** (`background: { type: 'color' }`, line 64), so any bars will be the brand colour, not raw black — a partial cosmetic mitigation if letterboxing occurs.

---

## Validation plan (at execution time — read-only first)

**Pre-snapshot:** GET version-probe heygen-worker (confirm v1.2.0 deployed, repo == deploy); confirm `ICE_HEYGEN_API_KEY` present; select **one** controlled avatar draft to re-render (e.g. set the preserved `ba5b34eb` back to `video_status='pending'` under explicit PK instruction, **or** use the already-pending `40f9fa25` — PK to choose the controlled subject).

**Checks:**
1. **Render one controlled avatar draft** — one supervised heygen-worker invoke; confirm it completes and writes a new `video_url` / `video_status='generated'`.
2. **Confirm the stored MP4 is portrait** — download the stored object and verify dimensions are `720×1280` (height > width, 9:16). Eyeball the frame for the letterbox caveat above (avatar fill vs bars).
3. **Confirm no publisher enablement yet** — youtube-publisher allow-list still excludes `video_short_avatar`; the re-rendered draft remains **inert / non-publishable**; no `m.post_publish` row is created. (This brief does not touch the publisher.)
4. **Regression** — non-avatar formats are untouched (heygen-worker only handles `recommended_format='video_short_avatar'`, so no other format path exists to regress); confirm the worker still no-ops cleanly when no avatar draft is pending.

**Success criteria:** one avatar MP4 stored at 9:16 portrait; F-HEYGEN Option A state otherwise preserved; avatar still not publishable.

---

## Rollback

- **Redeploy the previous heygen-worker v1.1.0** (current deployed version 30; repo == deploy verified) — restores `1280×720`.
- Revert the repo delta (version marker + line 66) and keep repo == deploy.
- Any MP4 re-rendered to portrait during validation is a stored file; preserve or remove **per PK instruction**. No DB row needs reverting (the only mutation is the draft's `video_url`/`video_status`, which the worker overwrites on the next render).
- No publisher / catalog / advisor state to roll back — none was changed.

---

## Stop condition
Brief authored + committed. **Do not deploy. Do not edit heygen-worker. Do not enable publishing.** Next step is PK approval, then the `ef_deploy` D-01 chain in a separate supervised session; publisher enablement remains owned by F-YT-PUB-AVATAR-EXCLUSION.

## Forbidden actions (until PK approval + D-01 + approval phrase)
- Do **not** edit, deploy, or invoke heygen-worker.
- Do **not** change youtube-publisher, the catalog, or any auto-publish behaviour.
- Do **not** mutate `ba5b34eb`, `40f9fa25`, or the seed rows.
- Honour all active hold-state in `docs/00_sync_state.md`.
