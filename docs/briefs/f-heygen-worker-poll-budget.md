# Brief F-HEYGEN-WORKER-POLL-BUDGET — raise HeyGen poll ceiling so valid renders stop falsely failing

**Created:** 2026-05-25 Sydney
**Author:** chat
**Status:** AUTHORED — brief only, NOT implemented. Execution gated on PK approval + `ef_deploy` D-01.
**Priority:** P2-blocking — blocks completion of F-HEYGEN-WORKER-LANDSCAPE-DIMENSION validation (the portrait MP4 cannot be produced until renders survive their poll window).
**Relationship:** **Addendum to F-HEYGEN-WORKER-LANDSCAPE-DIMENSION** (`docs/briefs/f-heygen-worker-landscape-dimension.md`). Same function; discovered *during* that brief's validation render. Same governance, same scope discipline (heygen-worker only).
**Result file:** `docs/briefs/results/f-heygen-worker-poll-budget.md` (created on completion)

---

## Header / metadata

**Linked systems**
- `supabase/functions/heygen-worker/index.ts` — **v1.2.0** (deployed EF version 31). The only file in scope.
- HeyGen `v1/video_status.get` polling loop (`pollHeyGenJob`, lines 81-93).

**Dependencies**
- **F-HEYGEN-WORKER-LANDSCAPE-DIMENSION** — parent; its validation step surfaced this issue.
- **F-HEYGEN-NEVER-PRODUCED** (Option A) — the avatar pipeline this keeps alive.
- **F-YT-PUB-AVATAR-EXCLUSION** — downstream; publisher enablement stays deferred to it. This brief does **not** enable publishing.

**Governance**
- **`ef_deploy` D-01 required** (per `docs/runtime/mcp_review_protocol.md` + ICE-PROC-001) — heygen-worker is an Edge Function.
- **Explicit PK approval phrase required** before deploy. Approval of this brief is not approval to deploy.
- **repo↔deploy sync:** deployed v1.2.0 == repo (verified). The patch must be committed to repo **and** deployed from `C:\Users\parve\Invegent-content-engine` (PK deploys manually; Windows MCP times out on `functions deploy`). No drift.

---

## Goal

Prevent valid HeyGen renders from being marked `failed` purely because they take longer than the worker's current 120 s polling ceiling. This is a stabilization fix, not a feature change.

---

## Evidence — from the failed F-HEYGEN-WORKER-LANDSCAPE-DIMENSION validation run (2026-05-25)

- **Controlled render of draft `40f9fa25-cd00-45fb-b642-f65c8446e8b5`** (NDIS-Yarns, `video_short_avatar`, narration 458 chars), invoked via the sanctioned `net.http_post` + vault path, `request_id = 127979`.
- **Result (HTTP 200):** `{"ok":true,"version":"heygen-worker-v1.2.0","processed":1,"results":[{"post_draft_id":"40f9fa25…","status":"failed","error":"HeyGen render timed out after 120s"}]}`. EF wall-time **129,026 ms**.
- **Draft now:** `video_status='failed'`, `heygen_error='HeyGen render timed out after 120s'`, `heygen_failed_at=2026-05-25T09:24:45Z`, `heygen_video_id=null` (id discarded — see §3).
- **Critical distinction:** the submit **succeeded** (the error is thrown by the *polling* loop, not by submit). HeyGen **accepted** the `720×1280` portrait payload — no schema rejection, no plan-tier "subscribe to higher plan" error. The render was in progress when the worker gave up. **This is a timeout, not a dimension or API-compatibility failure.**

---

## Why this is a latent existing issue, not portrait-specific

The 120 s ceiling was already **marginal for the shipped landscape path**, before portrait existed:

- The earlier successful landscape render of `ba5b34eb` (heygen-worker **v1.1.0**, 1280×720, shorter narration ~250 chars) ran **~111 s** (EF log `execution_time_ms ≈ 111,043`) — it cleared the 120 s budget by **< 9 s**.
- `40f9fa25` has a longer narration (458 vs ~250 chars → longer spoken video → longer HeyGen render). That alone is a plausible cause of crossing 120 s; portrait may add a little, but the data does not isolate portrait as the cause.

So any avatar render with a longer script — landscape or portrait — was already at risk of a false-fail under the 120 s ceiling. Portrait did not introduce the fragility; it made an already-thin margin visible. Fixing the budget hardens the whole avatar path, not just portrait.

---

## §2 Recommendation — smallest safe increase (target ≈ 240 s)

Two equivalent-window options were considered:

| Option | Window | Status calls per render | Post-completion lag (worst case) |
|---|---|---|---|
| 48 × 5000 ms | 240 s | 48 | ≤ 5 s |
| **30 × 8000 ms (recommended)** | **240 s** | **30** | **≤ 8 s** |

**Recommended: `POLL_MAX_ATTEMPTS = 30`, `POLL_INTERVAL_MS = 8000`** (= 240 s window). It **minimises API spam** — 30 status calls vs 48 (−37.5%) for the same window — while keeping responsiveness reasonable (at most ~8 s of wasted wait after HeyGen actually finishes, vs ~5 s). The brief's stated priority is "minimise API spam while keeping responsiveness reasonable," which favours the 8 s interval. Doubling the window (120 s → 240 s) comfortably covers the observed ~111–130 s renders with headroom for HeyGen queue variance.

### Exact proposed constant changes

`supabase/functions/heygen-worker/index.ts` (lines 12-13), plus VERSION bump to `v1.3.0` and a changelog note:

```diff
-const POLL_INTERVAL_MS  = 5000;
-const POLL_MAX_ATTEMPTS = 24;
+const POLL_INTERVAL_MS  = 8000;
+const POLL_MAX_ATTEMPTS = 30;   // 30 × 8s = 240s window (F-HEYGEN-WORKER-POLL-BUDGET)
```

```diff
-const VERSION           = 'heygen-worker-v1.2.0';
+const VERSION           = 'heygen-worker-v1.3.0';
```
Header changelog note: `// v1.3.0 — F-HEYGEN-WORKER-POLL-BUDGET: poll window 120s→240s (30×8000ms) to stop valid renders falsely failing.`

No logic change — the throw message at line 92 already interpolates `(POLL_MAX_ATTEMPTS * POLL_INTERVAL_MS)/1000`, so it will correctly read "240s" with no edit.

### EF wall-clock consideration (pre-deploy check, not a blocker)
The worker renders synchronously and the loop returns **early** on completion, so a normal render still returns at ~its true duration (~110–140 s) — the 240 s figure is only a ceiling for a stuck/slow job. The one edge to confirm at deploy time: with `MAX_DRAFTS = 3`, three simultaneously-pending avatar drafts each polling up to 240 s could approach the project's EF `max_duration`. In practice we have observed exactly **one** pending avatar draft at a time. Pre-deploy: confirm the project's EF max-duration comfortably exceeds 240 s for a single draft (prior runs already hit 129 s and 111 s with HTTP 200, so a single 240 s draft is safe); if the multi-draft pathological case is a concern, consider scoping `MAX_DRAFTS` separately — **out of scope for this minimal patch**.

---

## §3 Optional future enhancement — preserve `heygen_video_id` on timeout (ASSESSED, NOT proposed for this patch)

**Feasibility: YES.** Today the id is lost at two points: `pollHeyGenJob` throws at line 92 with a message that excludes `videoId`; and `processDraft` (lines 143-144) has no internal try/catch, so its local `heygenVideoId` const is unreachable from the outer loop catch (lines 205-214). Either is straightforward to fix:

- **Minimal (one line):** include the id in the timeout error — `throw new Error(\`HeyGen render timed out after Ns (video_id=${videoId})\`)`. The outer catch already persists `heygen_error`, so the id would survive in the error string. Low effort, low risk.
- **Cleanest (persist-on-submit):** immediately after `submitHeyGenJob` returns, write `heygen_video_id` into `draft_format` *before* entering the poll loop. Then a timeout (or any later failure) always leaves the id on the row, enabling a future "resume/recover an in-flight render" path instead of re-submitting (saving a duplicate HeyGen render + cost).

**Why deferred:** the budget bump alone resolves the actual false-fail. Id-preservation is a recovery/observability improvement, not required to make valid renders succeed. It is a separate, optional change (its own diff + D-01) and is **not** part of this minimal stabilization patch. Recorded here so the option isn't lost.

---

## Validation plan (at execution time, after deploy — read-only first)
1. GET `/health` → `heygen-worker-v1.3.0`; confirm repo == deploy.
2. Re-run **one** controlled render (reset `40f9fa25` to `pending` under explicit PK instruction, or use the next eligible pending avatar draft) via the sanctioned `net.http_post` + vault path.
3. Confirm the render **completes** within the new window: `video_status='generated'`, non-null `video_url`, stored MP4 present. This also finally unblocks the parent brief's portrait check (720×1280 + letterbox eyeball).
4. Regression: a normal render still returns promptly (early-exit on completion), not at the full 240 s.

## Rollback
- **Redeploy the previous heygen-worker v1.2.0** (deployed EF version 31; repo == deploy verified) — restores the 120 s window.
- Revert the repo diff (constants + VERSION + changelog) and keep repo == deploy.
- No DB/catalog/publisher/cron state is changed by this patch, so nothing else to roll back.

## Stop condition
Brief authored + committed. **Do not patch. Do not deploy.** Next step is PK approval, then the `ef_deploy` D-01 chain in a separate supervised session, then re-run the parent brief's validation render.

## Forbidden actions (until PK approval + D-01 + approval phrase)
- Do **not** edit, deploy, or invoke heygen-worker.
- Do **not** implement the §3 `heygen_video_id` enhancement as part of this patch.
- Do **not** change youtube-publisher, the catalog, cron, or any publish behaviour.
- Do **not** mutate `ba5b34eb`; do not revert `40f9fa25` out of `failed` except as a sanctioned validation step post-deploy.
- Honour all active hold-state in `docs/00_sync_state.md`.
