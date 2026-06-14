# 2026-06-14 — Facebook publisher interim assetless-release guard (publisher v1.9.0): deploy close-out (PASS)

**Status:** DEPLOYED. PK-approved D-01 `fcf2b32d-f234-4a36-bb82-60cfe8038e82` (verdict **agree** / risk **medium** / confidence **high** / proceed, no escalation).
**Brief:** `docs/briefs/publisher-interim-assetless-guard.md`. Interim safety patch before full T2. **Facebook publisher only. No DB/schema change. Not T2 (no OCR/transcript/visual QA).**

---

## 1. Incident & root cause
FB post `962399936961457_122114734587268380`, draft `1d34577bbb5a`, format `image_quote`, `image_status='failed'`, `image_url` absent — **published anyway as a text feed post**. The old image hold gate only caught `image_status='pending'`; `'failed'` fell through, `hasImage=false`, and the publisher silently posted to `/feed` (assetless text downgrade). Video formats had no asset gate at all.

## 2. Shipped
- **content-engine `main` `0216b79`** ← merge (`--no-ff`) of `feat/publisher-assetless-guard` (`2efa58a6`). (Re-merged onto origin/main after the docs-only brief commit `63b72c8` landed; no overlap.)
- **`publisher` edge function deployed via Supabase CLI `--no-verify-jwt`** (v1.8.0 → **v1.9.0**, version 91). Prior `index.ts` blob `56b1d1da`.
- Files: `supabase/functions/publisher/guard.ts` (NEW, pure), `supabase/functions/publisher/index.ts`, `docs/briefs/publisher-assetless-guard-validation.test.ts`. No migration, no other publisher.

## 3. Guard (pure `decideAssetGuard` — never publishes asset-required as text)
| Class | Behaviour |
|---|---|
| text (`''`/`text`) | publish feed (no asset) |
| image (`image_quote`) | generated+url → photo; pending<30m → hold; pending≥30m → block; failed/missing → **block** `image_required_but_<status>` |
| carousel | pending → hold; not generated → block; **<2 slides → block** (no single-image downgrade); else multi-photo |
| video (`video_*`) | pending → hold; failed/missing → block; generated → block `fb_video_publish_not_supported_interim` (FB has no video path) |
| unknown (`animated_*`/future) | **default deny** → block |

**Block** = queue `status='skipped'` (terminal, not re-locked) + `last_error='asset_guard_blocked:<reason>'` + audit `post_publish status='failed'`; draft preserved. **Hold** = requeue (retryable). Approval gate / schedule / token / throttle / dry_run unchanged.

## 4. Post-deploy verification (read-only; no publish run triggered)
1. **Live version** — `GET /publisher/health` → `publisher-v1.9.0`. ✅
2. **verify_jwt = false** — authoritative `list_edge_functions`: publisher version 91, `verify_jwt:false` (deployed with `--no-verify-jwt`; header-less `/health` → 200 corroborates). ✅
3. **No asset-required item can publish as text** — deno test 21/21 on the deployed guard incl. the explicit "no asset-required class ever decides publish-as-text" assertion; live: 0 asset-required FB posts published via `feed` since deploy. ✅
4. **Failed/missing image, carousel, video blocked with `asset_guard_blocked` reason** — proven by unit tests; live `recent_guard_blocks=[]` (no failed-asset item currently queued to trigger one — nothing wrongly published either). Reason is visible via queue `last_error` + audit row when encountered. ✅
5. **Valid text posts still publish** — guard returns `publish/text` for text class (test 1). ✅
6. **Current FB queue not stranded** — the 3 queued FB items (2 `image_quote` generated+url, 1 `carousel` generated) remain `status='queued'`, `last_error=null` — untouched, ready to publish on schedule. ✅

## 5. Validation (pre-deploy)
`deno check` exit 0 (index + guard). **`deno test` 21/21 PASS** importing the real `classifyFbFormat` + `decideAssetGuard`.

## 6. Scope / guardrails (held)
Facebook publisher only. NOT touched: FB video publishing, full T2, OCR, transcript, visual/brand/audio QA, LI/IG/YouTube publishers, render-worker, queue schema, Advisor, compliance, Series, scheduling, register reconciliation. No DB/schema change. No mutation of already-published posts.

## 7. Rollback (no DB)
Redeploy prior **publisher-v1.8.0** (git blob `56b1d1da`) via Supabase CLI **with `--no-verify-jwt`**. No DB rollback — the guard writes only existing columns/values.

## 8. Follow-ups (NOT in this lane)
- LI / IG / YouTube publishers need the same asset-required guard (interim).
- Video-format drafts on FB are currently **blocked** (no FB video publish path) — enabling FB video publishing is separate feature work.
- Full T2 (rendered-asset QA / OCR / transcript / visual review) remains the durable replacement for this interim existence/status guard.
