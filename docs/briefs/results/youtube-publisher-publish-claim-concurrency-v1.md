# Result — youtube-publisher publish-claim concurrency hardening (F-YT-PUBLISH-CLAIM, v1.15.0)

**Date:** 2026-07-27 Sydney
**Lane:** SAFETY_GATE · **Tier T3** · Option Y-A (no DDL) · sibling of F-VIDEO-RENDER-CLAIM
**Brief:** `docs/briefs/youtube-publisher-publish-claim-concurrency-brief-v1.md`
**Outcome:** ✅ **COMPLETE — deployed + live-proven.** youtube-publisher v1.15.0 live; concurrent-double-PUBLIC-publish race closed.

## Problem

youtube-publisher's per-tick draft SELECT was unlocked (`.eq('platform','youtube').eq('video_status','generated')
.in('approval_status',['approved','published']).is('draft_format->youtube_video_id',null).not('video_url','is',null)
.in('recommended_format',ELIGIBLE).or('scheduled_for.is.null,scheduled_for.lte.<now>').limit(5)` — no `FOR UPDATE`).
Two overlapping invocations both select the same `generated` draft, both pass the pre-upload `m.post_publish`
idempotency guard (which only catches a **completed** prior publish, not a **concurrent** one), and both call
`uploadToYouTube` → **duplicate PUBLIC YouTube video** (irreversible). Higher stakes than the video-worker render
race; same class deferred from F-VIDEO-RENDER-CLAIM.

## Fix — Option Y-A (no DDL): atomic single-row claim before the upload

An atomic guarded UPDATE inserted immediately before the upload try-block (after every existing skip/idempotency/
backstop guard):

```ts
const YT_PUBLISH_CLAIM_TTL_MIN = 15;
const claimStaleCutoff = futureIso(-YT_PUBLISH_CLAIM_TTL_MIN * 60 * 1000);
await supabase.schema('m').from('post_draft')
  .update({ draft_format: { ...df, yt_publish_claim_at: nowIso() }, updated_at: nowIso() })
  .eq('post_draft_id', draft.post_draft_id).eq('video_status', 'generated')
  .is('draft_format->youtube_video_id', null)
  .or(`draft_format->>yt_publish_claim_at.is.null,draft_format->>yt_publish_claim_at.lt.${claimStaleCutoff}`)
  .select('post_draft_id');
// no rows -> skipped_publish_claim_lost; else proceed to uploadToYouTube
```

**Why correct + minimal:** Under READ COMMITTED the loser's `WHERE` re-evaluates after the winner commits the fresh
marker → 0 rows → yields. `video_status` **stays `generated`** so the whole auth/quota/transient/pause/release state
machine is byte-unchanged; the marker is **auto-dropped** by every downstream `draft_format` rebuild from the
pre-claim `df` (no explicit clears). Crash-before-upload self-heals via the 15-min stale reclaim; crash-after-upload
via the existing idempotency reconcile guard. No new status, no DDL, no migration.

## Lane record (T3 chain — pinned to review hash `26a8598e9d77bb6fac88389c81b921653617753a9010ba1cd1d174d929721d2b`)

| Gate | Verdict | Evidence |
|---|---|---|
| ef-builder (local, base v1.14.0 `a0ab233`) | built | `deno check` clean · only `index.ts` changed · no DB change |
| branch-warden | **safe** | HEAD `a0ab233`, exactly the approved file set, no commit at review time |
| external review (ChatGPT) | **agree** | high confidence · no pushback/defect · auto-escalated on `high` risk (public-publish) → PK gate · review_id `e686985a` |

No db-rls-auditor (no DB change).

## Deploy + verification (ground truth)

- **Commit** `aa8b95c` → rebased → on `main` (origin moved +1 disjoint mid-lane; clean rebase, no youtube-publisher overlap).
- **EF deployed** v1.15.0 via `scripts/safe-deploy.sh youtube-publisher --allow-warn` (drift refreshed A-LE→B-FD first, then post-deploy back to A-LE). `verify_jwt` stays **false** (config.toml pinned; `x-youtube-publisher-key` caller).
- **deploy-verifier (inline):** content **PASS** — the v1.15.0 claim CAS block present in the DEPLOYED bundle (after the backstop, before the upload) · VERSION==repo v1.15.0 · `verify_jwt=false` · version 59 ACTIVE. drift **A-LE** aligned. Every out-of-scope path (SELECT, retry lanes, idempotency guard, constants) byte-unchanged in the deployed source.

## Live proof (2026-07-27, PK-directed "GO — prove it")

Executed against `m.post_draft` with **synthetic `generated` drafts seeded `video_url=NULL`** — so the real
youtube-publisher SELECT (`.not('video_url','is',null)`) can **never** select or upload them (zero real-upload risk).
The deployed claim's exact guarded UPDATE was driven concurrently via a **throwaway `/rpc/` harness** running the
identical SQL (created + dropped in-proof); the deployed PostgREST filter shape was independently validated to
return the correct unclaimed rows.

| Required proof | Result | Evidence |
|---|---|---|
| Two concurrent invocations claim/upload a draft at most once | ✅ | 4 concurrent claims on each of 3 rows → **exactly 1 winner per row**; the other 3 yield (`skipped_publish_claim_lost`). |
| Exactly one public YouTube video per draft per cycle | ✅ (by construction) | claim-once (above) + the deployed bundle has a single `uploadToYouTube` reached only after a won claim; loser path records `skipped_publish_claim_lost`. In-flight re-claim of a fresh-claimed row → **0**. No real upload (synthetic rows `video_url=NULL`). |
| Crashed claim does not permanently strand the draft; 15-min stale reclaim recovers | ✅ | Backdated one row's `yt_publish_claim_at` to −20 min → next claim **recovered it**; the 2 fresh in-flight rows were **not** stolen. |
| Retry timing / auth / quota / pause / release + constants unchanged | ✅ | Deployed bundle: SELECT, all retry lanes, `classifyYouTubeFailure`, `MAX_YT_UPLOAD_ATTEMPTS=5`, backoffs, `MAX_PUBLISHES_PER_TICK=2`, release gate, idempotency guard all byte-present; `video_status` never changed by the claim. |
| No unrelated worker/publisher modified | ✅ | Only `youtube-publisher/index.ts` changed (branch-warden approved set); single EF deployed. |

Cleanup verified: throwaway harness dropped, 3/3 synthetic rows deleted, 0 remaining.

## Carries / rollback

- Rollback: redeploy v1.14.0 (drops the claim; nothing to unwind — `video_status` was never changed and the marker
  is inert/self-expiring).
- video-worker (F-VIDEO-RENDER-CLAIM, v3.13.0) and youtube-publisher (this lane) now both close their draft-claim
  races; the two are the known unlocked-SELECT publishers/workers.
