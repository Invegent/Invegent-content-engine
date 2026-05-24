# Brief — instagram-publisher v2.3.0 (Option 2): image publish-retry, remove container GET

**Status:** READY — for CCD. Single-EF change, branch + **D-01 before deploy**. No migration. No dashboard change.
**Author:** CCH (chat)  ·  **Date:** 2026-05-24
**Supersedes (for the immediate fix):** `docs/briefs/ig-oauth-reconnect-route-v1.md` (ON HOLD).
**Lineage:** v2.1.0 throttle robustness → v2.2.0 image-container poll (deployed) → **v2.3.0 (this)**.
**Deployed now:** `instagram-publisher-v2.2.0` (branch `fix/ig-publisher-throttle-robustness`, commit `90602787`).

---

## 1. Why

Forensics settled the IG publish failures:

- **v1.0.0 (commit `1a74f238`) — the proven-working path.** 22 successful image publishes (19–25 Apr), all PNG. It published images with **two calls only**: `POST /{ig_user_id}/media` (create container) → `POST /{ig_user_id}/media_publish`. **No container-status GET for images.** Polling existed only for video (`fields=status_code`), and **no video has ever published successfully**, so the container GET has *never once been observed to succeed* with these tokens. Token source: `c.client_publish_profile.page_access_token` (an FB-page token that carries IG) — **no dedicated Instagram OAuth, ever.**
- **v2.0/2.1** kept the no-poll image path → intermittently hit **`9007 / 2207027` "Media ID is not available — the media is not ready to be published. Please wait a moment."** at publish (container not finished yet).
- **v2.2.0** added a container-status **GET** poll (`/{container_id}?fields=status_code,status`) on the image path to fix the 9007 → the GET itself fails with **`code 100 / subcode 33` GraphMethodException "Authorization Error"** (full error captured 2026-05-24). This is a method/object/permission error on a GET the working path never made — **not** a "nonexisting field" error and **not** a token-scope gap (the same token creates the container and authenticates the publish call; on CFW v2.x reached `media_publish`).

**Conclusion:** the fix is to **stay inside the two API calls proven to work with these tokens** (`/media`, `/media_publish`) and never call the failing container GET on the image path. Address the original 9007 ("wait a moment") with a **bounded publish retry** instead of a status poll.

## 2. Goal / definition of done

A v2.3.0 `instagram-publisher` whose **single-image (`image_quote`) path** publishes via create → publish (no container GET), retrying `media_publish` on the transient "media not ready" (`9007/2207027`) signal until it succeeds or a bounded limit is reached.

**Done when (verified in the supervised re-test, separately PK-gated):**
1. A `limit=1` real publish for an enabled low-risk client (Invegent/CFW) produces **exactly one** IG post (`platform_post_id` non-null, `status='published'`), with **no container-status GET** in the logs.
2. If the container was briefly not-ready, logs show one or more `publish retry … 9007 …` lines then success.
3. `destination_id` on the success row is non-null and matches the profile.
4. Immediate re-invoke → `throttled`/`min_gap`, no second publish (RE-A throttle finally validated live).
5. No `100/33` anywhere (the GET is gone from this path).

## 3. Scope of work — `supabase/functions/instagram-publisher/index.ts`

**Change ONLY the single-image publish path.** Bump `VERSION` to `instagram-publisher-v2.3.0` and add a `// v2.3.0` history note.

### 3.1 Remove the image container GET
In `publishSingleMedia`, for the **image** branch (`isVideo === false`), **remove the `pollContainerReady(...)` call** between container creation and `media_publish`. Replace the immediate `media_publish` with a bounded retry helper (3.2).

### 3.2 Add a bounded publish-retry helper (image only)
New helper, e.g. `publishWithReadinessRetry(publishUrl, creationId, accessToken, label)`:
- Calls `igPost(publishUrl, { creation_id: creationId, access_token: accessToken })`.
- **On success:** return `published.id` (validate non-empty as today).
- **On error:** inspect the thrown message.
  - If it matches the **transient not-ready** signal — `9007` **or** `2207027` — wait a backoff and retry, **reusing the same `creationId`** (do NOT recreate the container).
  - For **any other error, rethrow immediately** — in particular `2207051` / `code 4` (rate limit) MUST propagate so the existing v2.1.0 catch auto-pauses the profile; auth errors (`190`, `code 10`, `100/33`, etc.) MUST propagate so they surface as real failures, not silent retries.
- **Bounds:** `PUBLISH_RETRY_MAX_ATTEMPTS = 4` (1 initial + 3 retries); backoff schedule `PUBLISH_RETRY_BACKOFF_MS = [3000, 5000, 8000]` (total added wall-clock ≤ ~16s — far under the EF limit and the 120s poll it replaces). After the last attempt, rethrow the last error (so the row requeues + audits as today).
- **Optional (recommended):** a small fixed pre-publish delay (e.g. `2000ms`) before attempt 1 to reduce 9007 frequency on cold containers. Keep it small.
- **Logging (token-safe):** log `label`, attempt number, and on retry the matched code (e.g. `publish retry attempt=2 reason=9007`). Never log `accessToken` or the publish URL (which carries the token as a param — log only `creationId` and counters).

### 3.3 Wire it in
Single-image path (the `else // image_quote` branch and the carousel single-image fallback `publishSingleMedia(..., isVideo:false)`) routes through 3.2. The success/record-writing code (post_publish insert with `destination_id`, queue→published, draft→published) is **unchanged**.

## 4. Out of scope / do NOT
- **Video path:** leave **exactly as v2.2.0** (still polls via `pollContainerReady` with `fields=status_code,status`). No video has ever published; it's a separate, unproven concern. Do not touch it in v2.3.0.
- **Carousel path:** leave **exactly as v2.2.0** (child + parent `pollContainerReady`). Carousel is not in the current `image_quote` drain (the 95 queued image drafts are `recommended_format='image_quote'`). A carousel row, if locked, will behave as it does today. Separate follow-up if/when needed.
- Do **not** modify the throttle block, `destination_id` gate, `2207051` auto-pause, queue/lock logic, schedule check, hold gates, or any other function. Keep `pollContainerReady` defined (video/carousel still use it) — just don't call it on the image path.
- Do **not** touch any other Edge Function, the dashboard, migrations, crons (53/64 stay paused), `publish_enabled`, NDIS-Yarns/Property Pulse, the backlog, or dead rows.

## 5. Governance & sequencing
1. CCD stages v2.3.0 on branch `fix/ig-publisher-throttle-robustness` (continue the IG-publisher line, on top of `90602787`) **or** a fresh branch off main — CCD's choice; single file changes either way.
2. CCD runs the dashboard-style build/type check is N/A here; for the EF, confirm it compiles/`deno check` clean and `VERSION` shows `v2.3.0` on the `/health` route.
3. **D-01 (`ef_deploy`) before deploy** — CCH reviews: only `instagram-publisher/index.ts` changed; image path no longer calls the container GET; retry is bounded and only triggers on 9007/2207027; 2207051 still propagates to auto-pause; throttle/gate/destination logic byte-unchanged; video/carousel untouched; logs token-safe; no migration/cron/config/other-function change (subtree-SHA compare).
4. CCD deploys `supabase functions deploy instagram-publisher` (run manually from `C:\Users\parve\Invegent-content-engine` — PowerShell-MCP times out on long deploys).
5. **Supervised `limit=1` re-test** (PK-gated, per `docs/runbooks/ig-v2.1.0-deploy-test.md` mechanics, `timeout_milliseconds ≥ 60000` is now ample since the 120s poll is gone — keep ≥ 60000 to cover retry backoff + media): health=v2.3.0 → Test 0 dry-run (0 publishes) → Test a single publish (expect published + `ig_media_id`, no container-GET log, possibly `publish retry` logs) → Test d (`destination_id` matches) → Test c immediate re-invoke (expect `throttled`/`min_gap`). Cap-breach deferred.

## 6. Diagnostic value (important)
This patch is also the **decisive token test**. v2.3.0 lets a real `media_publish` proceed for the test client (the blocking GET is gone). Outcomes:
- **Publishes (with or without 9007 retries) → confirmed:** the token was always fine; the whole `100/33`/OAuth thread was a v2.2.0-introduced GET artefact. Drain can resume (still throttled, cron stays paused until PK decides).
- **`media_publish` returns an auth error** (`190` / `code 10` / `100`) → the token genuinely can't publish → *then* revisit the (held) OAuth/reconnect path. (Considered unlikely: CFW already authenticated for the publish call under v2.x.)
- **Persistent `9007` past all retries** → container genuinely never finishes in-window → image-media specifics (size/format/colour-profile) → image-worker follow-up + D-01.

## 7. Standing carries (unchanged, still owed)
- **RE-B retry-cap / `attempt_count` hardening** on the catch-path requeue — before any unattended cron-53 steady-state. (v2.3.0's publish-retry is a *separate*, in-attempt bounded loop; it does not address the outer per-row requeue cap.)
- **`publisher_lock_queue_v2`** destination-keyed-count root-cause fix (separate regression-tested follow-up).
- **RE-A cap/gap** throttle: runtime-unverified until a publish succeeds — v2.3.0's re-test should finally validate it.
- cron 64 stays paused until backlog drained; NY/PP stay disabled (`2207051` containment); YouTube OAuth reconnect is a separate PK manual action.

## 8. References
- Working path: `instagram-publisher/index.ts` @ `1a74f238` (v1.0.0) — `publishToInstagram`, image = create→publish, no GET.
- Current deployed: same file @ `90602787` (v2.2.0) — `publishSingleMedia` + `pollContainerReady`.
- Errors (captured 2026-05-24): publish `9007/2207027` "media not ready … wait a moment" (is_transient:false but semantically transient); poll `100/33` GraphMethodException "Authorization Error".
- Throttle/gate/auto-pause to preserve: v2.1.0 notes in the file header + the `DEFENSIVE THROTTLE (v2.1.0)` block + the `rateLimited` catch.
