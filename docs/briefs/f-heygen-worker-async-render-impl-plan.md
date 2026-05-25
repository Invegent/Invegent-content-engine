# Implementation Plan — heygen-worker v2.0.0 (async two-phase render)

**Created:** 2026-05-25 Sydney
**Author:** chat
**Status:** ✅ IMPLEMENTED (2026-05-25) — built as heygen-worker **v2.0.0** (deployed EF v33; repo `aa07252`) and **validated** (draft 40f9fa25 → portrait 720×1280 → published `sfQvSM2Osus`). Was: PLAN (after `plan_review` D-01 `6fb98c05-417c-4293-9044-2ffe0d963325`, GENERIC-NON-BLOCKING per L46, + PK greenlight). ef_deploy D-01 `24dcf55b` closed. Full closeout: `docs/operations/avatar-youtube-pipeline-status-2026-05-25.md`.
**Design brief:** `docs/briefs/f-heygen-worker-async-render.md` (the what/why). This doc is the how/exact-code spec the `ef_deploy` will follow.
**Target:** `supabase/functions/heygen-worker/index.ts` → **v2.0.0**. heygen-worker only. No youtube-publisher, no ai-worker, no schema migration.

---

## 0. Pre-implementation audit — RESULT (read-only, done 2026-05-25)

**The new `video_status='rendering'` value is safe across every runtime consumer (evidence, not inspection):**

| Consumer | `video_status` usage | Effect of a `rendering` draft |
|---|---|---|
| youtube-publisher (index.ts:128) | `.eq('video_status','generated')` | invisible → not published (avatar also excluded by allow-list) ✅ |
| instagram-publisher (index.ts:649) | `videoReady = video_url && video_status==='generated'` | `videoReady=false` → benign not-ready hold; also doesn't select youtube-platform avatar drafts ✅ |
| video-worker (index.ts:428) | `.eq('video_status','pending')` | invisible; also doesn't handle the avatar format ✅ |
| dashboard/app | none found | n/a ✅ |

**Current distinct `video_status` values:** `null` (1924), `published` (31), `failed` (31), `archived_stale` (14), `generated` (4), `pending` (4). **`rendering` is unused today** → no collision. Column is unconstrained `text` → new value needs no DDL. **Confirmed: no schema migration; pure `ef_deploy`.**

---

## 1. Constants (v2.0.0)

```ts
const VERSION             = 'heygen-worker-v2.0.0';
const MAX_SUBMITS         = 3;        // Phase A: pending drafts to submit per tick
const MAX_POLLS           = 5;        // Phase B: rendering drafts to check per tick
const STALE_RENDER_MAX_MS = 30 * 60 * 1000;  // 30 min: a rendering draft older than this is failed
// NOTE: no in-request poll LOOP. Phase B does ONE status check per draft per tick.
// The */30 cron IS the wait. Renders take ~2-3 min << 30 min, so by the next tick the
// status is almost always already 'completed' → first check downloads it.
```

Removed: `POLL_INTERVAL_MS`, `POLL_MAX_ATTEMPTS`, `pollHeyGenJob` blocking loop (the whole 120s/240s-in-request mechanism that the EF 150s limit made unworkable).

## 2. Reused unchanged
`getServiceClient`, `lookupAvatar`, `submitHeyGenJob` (still POSTs `dimension {720×1280}`), `downloadAndStore`, the avatar/voice/narration/brand resolution block, auth + env checks. Only the orchestration and the poll mechanism change.

## 3. New / changed functions (concrete spec)

### 3a. `pollOnce` — single non-blocking status check (replaces `pollHeyGenJob`)
```ts
type HeyGenStatus =
  | { state: 'completed'; videoUrl: string }
  | { state: 'processing' }
  | { state: 'failed'; rawError: unknown };

async function pollOnce(apiKey: string, videoId: string): Promise<HeyGenStatus> {
  const resp = await fetch(`${HEYGEN_STATUS}?video_id=${videoId}`, { headers: { 'X-Api-Key': apiKey } });
  const data = await resp.json();
  const status   = data?.data?.status;
  const videoUrl = data?.data?.video_url;
  if (status === 'completed' && videoUrl) return { state: 'completed', videoUrl };
  if (status === 'failed')                return { state: 'failed', rawError: data?.data?.error ?? data };
  return { state: 'processing' };   // pending / processing / waiting / unknown → still rendering
}
```
Fixes the v1.3.0 `[object Object]` defect by returning the raw error object for stringification at the call site.

### 3b. Phase A — submit (`runSubmitPhase`)
```ts
const { data: pending } = await supabase.schema('m').from('post_draft')
  .select('post_draft_id, client_id, draft_format, recommended_format')
  .eq('recommended_format', 'video_short_avatar')
  .eq('video_status', 'pending')
  .in('approval_status', ['approved', 'published'])
  .limit(MAX_SUBMITS);

for (const draft of pending ?? []) {
  const fmt = draft.draft_format ?? {};
  // GUARD 1 + 2: never resubmit / no duplicate external render.
  if (fmt.heygen_video_id) {
    await markRendering(draft.post_draft_id, fmt, fmt.heygen_video_id, /*submittedAtKnown*/ fmt.heygen_submitted_at ?? nowIso());
    continue;  // recover an id-bearing pending row into 'rendering' without resubmitting
  }
  try {
    // resolve avatar/voice/narration/bgColour exactly as today, then:
    const heygenVideoId = await submitHeyGenJob({ apiKey, talkingPhotoId, voiceId, narrationText, bgColour });
    await markRendering(draft.post_draft_id, fmt, heygenVideoId, nowIso());
  } catch (e:any) {
    await markFailed(draft.post_draft_id, fmt, { submit_error: (e?.message ?? String(e)).slice(0,2000) });
  }
}
```
`markRendering` sets `video_status='rendering'`, `draft_format.heygen_video_id`, `draft_format.heygen_submitted_at`, `draft_format.render_dimension='720x1280'`, `updated_at`. Returns in seconds (submit only, no poll).

### 3c. Phase B — poll (`runPollPhase`)
```ts
const { data: rendering } = await supabase.schema('m').from('post_draft')
  .select('post_draft_id, client_id, draft_format, recommended_format')
  .eq('recommended_format', 'video_short_avatar')
  .eq('video_status', 'rendering')
  .not('draft_format->heygen_video_id', 'is', null)
  .limit(MAX_POLLS);

for (const draft of rendering ?? []) {
  const fmt = draft.draft_format ?? {};
  const videoId = fmt.heygen_video_id as string;
  const submittedAt = Date.parse(fmt.heygen_submitted_at ?? '') || 0;

  let st: HeyGenStatus;
  try { st = await pollOnce(apiKey, videoId); }
  catch (e:any) { continue; }   // transient status-endpoint error → retry next tick (do NOT fail)

  if (st.state === 'completed') {
    const clientSlug = await resolveClientSlug(draft.client_id);   // (small helper; or reuse brand lookup)
    const renderStyle = fmt.video_script?.render_style ?? fmt.render_style ?? 'realistic';
    const storagePath = `${clientSlug}/${draft.post_draft_id}_avatar_${renderStyle}.mp4`;
    const storageUrl  = await downloadAndStore(supabase, st.videoUrl, storagePath);  // upsert:true (idempotent)
    await markGenerated(draft.post_draft_id, fmt, { heygen_video_url: st.videoUrl, video_url: storageUrl });
  } else if (st.state === 'failed') {
    await markFailed(draft.post_draft_id, fmt, { heygen_error: JSON.stringify(st.rawError).slice(0,2000) });
  } else {
    // still processing — GUARD 4: stale detection
    if (submittedAt && (Date.now() - submittedAt) > STALE_RENDER_MAX_MS) {
      await markFailed(draft.post_draft_id, fmt, { heygen_error: 'stale_render_timeout', last_status: 'processing' });
    }
    // else: leave as 'rendering' for the next tick
  }
}
```

### 3d. `Deno.serve` handler — Phase B THEN Phase A
```ts
// ... auth + env checks unchanged ...
const results = { polled: await runPollPhase(supabase, apiKey), submitted: await runSubmitPhase(supabase, apiKey) };
return jsonResponse({ ok: true, version: VERSION, ...results });
```
Order matters: poll existing renders first, then submit new ones — so a draft submitted this tick is not polled until the next tick. Each phase is a few HeyGen calls + at most a few downloads → comfortably under the 150s EF limit.

## 4. `draft_format` JSONB keys (all existing-style, no columns)
`heygen_video_id`, `heygen_submitted_at`, `render_dimension`, `heygen_video_url`, `video_url`, `rendered_at` (on generated), `heygen_error` (raw JSON string), `heygen_failed_at` (on failed). All written via `{...fmt, ...}` spread, mirroring current convention.

## 5. State machine + guards (as implemented above)
`pending → rendering → generated | failed`.
- **G1 no-resubmit / G2 no-duplicate:** Phase A skips any draft already carrying `heygen_video_id`; Phase B never submits.
- **G3 raw error:** `JSON.stringify(rawError)` on every failure path (submit, HeyGen-failed, stale).
- **G4 stale max-age:** `STALE_RENDER_MAX_MS` flips a stuck `rendering` to `failed`.
- **G5 idempotent storage:** deterministic path + `upsert:true` (re-download safe if a tick is retried).

## 6. Decisions / edge cases
- **Latency:** detection of completion is bounded by the */30 cron, not by render time → up to ~30 min from submit to `generated`. Acceptable for this scheduled pipeline (slots have day+ lead time). *Optional tuning (separate, not in this change): increase cron frequency to */10 for faster detection.*
- **Concurrency:** because a draft leaves `pending` the moment Phase A sets `rendering` (persisted before return), the next cron tick's Phase A won't re-submit it. The earlier stuck-`pending`→duplicate-render loop is structurally eliminated.
- **Transient status-endpoint errors** in Phase B → skip, retry next tick (never auto-fail on a network blip).
- **MAX_POLLS/MAX_SUBMITS** keep per-tick work bounded; backlog drains across ticks.

## 7. Validation plan (post-deploy, supervised — read-only first)
1. `/health` = `heygen-worker-v2.0.0`; repo == deploy.
2. Reset ONE controlled draft to `pending` (e.g. `40f9fa25` under explicit PK instruction; do not touch `ba5b34eb`).
3. **Tick 1 (submit):** invoke once → confirm response `submitted:1`, draft now `video_status='rendering'` with `heygen_video_id` + `heygen_submitted_at`, returns in seconds. Confirm exactly ONE HeyGen submit.
4. **Tick 2 (poll):** invoke again (or await cron) → confirm draft → `generated`, `video_url` set, MP4 in `post-videos`, same `heygen_video_id` (no duplicate render).
5. **Inspect MP4:** portrait, height>width, ideally 720×1280; record full-frame vs letterbox (completes the F-HEYGEN-WORKER-LANDSCAPE-DIMENSION check).
6. Regression/safety: youtube-publisher still excludes avatar; a `rendering` draft is ignored by other consumers (per §0). **No publisher enablement.**

## 8. Rollback
Redeploy v1.3.0/v1.2.0. `rendering` drafts stay recoverable (`heygen_video_id` persisted → hand-poll or re-deploy v2.0.0 to finish; no re-render). Interim: hand-poll or `failed` any leftover `rendering` rows so the synchronous worker doesn't ignore them. No DB structure to revert.

## 9. Governance — remaining gates
- **`ef_deploy` D-01** on the v2.0.0 build (with the actual diff) — fire at implementation time.
- **No `sql_destructive`** anticipated (§0 confirmed). If the build unexpectedly needs DDL, it fires its own `sql_destructive` D-01 via `apply_migration`.
- **Explicit PK approval phrase** before the deploy. PK deploys manually; repo↔deploy sync. Honour `docs/00_sync_state.md` holds.

## 10. Open tuning params (confirm with first real renders — not blockers)
- `STALE_RENDER_MAX_MS` (start 30 min; adjust once HeyGen's real worst-case render time is observed).
- Cron frequency (keep */30; consider */10 only if detection latency matters).
- `MAX_SUBMITS`/`MAX_POLLS` (start 3/5; raise if backlog grows).

---

## Stop condition
Implementation plan authored + committed. **Do not write the v2.0.0 code, do not deploy, do not migrate, do not render.** Next step: implement the code per this spec → `ef_deploy` D-01 → PK approval phrase → deploy → run §7 validation.
