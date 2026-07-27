# Brief — youtube-publisher publish-claim concurrency hardening (F-YT-PUBLISH-CLAIM)

**Created:** 2026-07-27 Sydney
**Executor:** ef-builder (isolated worktree off `a0ab233`) → branch-warden → external review → PK deploy gate → deploy-verifier
**Status:** draft (Gate 1 — PK GO to harden youtube-publisher; Option Y-A recommended)
**cc-ID:** none — recorded under **F-YT-PUBLISH-CLAIM** (sibling of F-VIDEO-RENDER-CLAIM)
**Result file:** `docs/briefs/results/youtube-publisher-publish-claim-concurrency-v1.md`
**Lane class:** SAFETY_GATE · **Tier T3** (production publish path; **NO DB change** in Option Y-A)

## Task

Close the concurrent-double-publish race in youtube-publisher (v1.14.0). Its per-tick SELECT is unlocked
(`.eq('platform','youtube').eq('video_status','generated').in('approval_status',['approved','published'])
.is('draft_format->youtube_video_id',null).not('video_url','is',null).in('recommended_format',ELIGIBLE)
.or('scheduled_for.is.null,scheduled_for.lte.<now>').limit(5)` — no `FOR UPDATE`). Two overlapping
invocations both select the same `generated` draft, both pass the pre-upload idempotency guard (which
only catches a **completed** prior publish in `m.post_publish`, not a concurrent one), and both call
`uploadToYouTube` → **duplicate PUBLIC YouTube video**. Higher stakes than the video-worker render race
(irreversible, public). Same class deferred from F-VIDEO-RENDER-CLAIM.

## Fix — Option Y-A (RECOMMENDED, no DDL): atomic single-row claim before the upload

The race point is exactly the `uploadToYouTube` call. Insert an atomic claim **immediately before** the
upload try-block (after the existing skip/idempotency/backstop guards, before `let youtubeVideoId`):

```ts
const YT_PUBLISH_CLAIM_TTL_MIN = 15;   // new const
const claimStaleCutoff = futureIso(-YT_PUBLISH_CLAIM_TTL_MIN * 60 * 1000);
const { data: claimRows, error: claimErr } = await supabase.schema('m').from('post_draft')
  .update({ draft_format: { ...df, yt_publish_claim_at: nowIso() }, updated_at: nowIso() })
  .eq('post_draft_id', draft.post_draft_id)
  .eq('video_status', 'generated')
  .is('draft_format->youtube_video_id', null)
  .or(`draft_format->>yt_publish_claim_at.is.null,draft_format->>yt_publish_claim_at.lt.${claimStaleCutoff}`)
  .select('post_draft_id');
if (claimErr) { …skipped_publish_claim_error; continue; }
if (!claimRows?.length) { …skipped_publish_claim_lost; continue; }   // another invocation won → yield
```

**Why this is correct + minimal:**
- **Atomic CAS:** under READ COMMITTED the loser's `WHERE` re-evaluates after the winner commits the
  fresh `yt_publish_claim_at` → matches 0 rows → yields. Exactly one invocation reaches the upload.
- **`video_status` stays `generated`** — the entire auth/quota/transient/pause/release/backstop state
  machine is **byte-unchanged**. No `publishing` status, no release-back logic.
- **Marker auto-drops:** every downstream update rebuilds `draft_format` from the pre-claim `df`
  snapshot (success `okDf`, all retry lanes, terminal), so `yt_publish_claim_at` is dropped without any
  explicit clear. A backed-off draft is re-claimable once its existing `youtube_retry_after` expires.
- **Crash recovery:** crash *before* upload → marker holds ≤15 min then stale-reclaims (re-attempt).
  Crash *after* upload → already covered by the existing `m.post_publish` idempotency guard (reconcile,
  never re-upload). Timestamps are ISO-8601-Z (lexicographic == chronological — same as v3.12.0).

**Alternative Option Y-B** (mirror video-worker: SECURITY DEFINER claim RPC + `FOR UPDATE SKIP LOCKED`)
requires a new `publishing` status + release-back across ~6 skip/retry paths + a migration + db-rls-auditor
— far larger surface on the irreversible public-publish path. Y-A preferred for that reason.

## Scope

**In scope:** the pre-upload atomic claim + the new TTL const + `skipped_publish_claim_lost/error`
results + VERSION bump (v1.14.0→v1.15.0) + header; a hermetic test where feasible.
**Out of scope / BYTE-UNCHANGED:** the SELECT predicates, platform isolation, release gate (v1.14.0),
channel-pause, `m.post_publish` idempotency guard, no-video/backstop guards, `uploadToYouTube`,
`classifyYouTubeFailure`, all retry lanes + constants (`MAX_YT_UPLOAD_ATTEMPTS=5`, backoffs), the
attempt_no audit, `MAX_PUBLISHES_PER_TICK=2`, `DEFAULT_PRIVACY_STATUS`. No DB/DDL, no other EF, no publisher.

## Success criteria

- Two concurrent invocations upload a given draft **at most once** (only one wins the claim).
- Exactly one public YouTube video per draft per cycle; the loser records `skipped_publish_claim_lost`.
- A crashed claim self-heals ≤15 min (stale reclaim) and/or via the existing idempotency reconcile.
- Retry/auth/quota/pause/release behaviour and all constants unchanged.
- `deno check` clean; branch-warden `safe`; external review clean on the FINAL diff (pinned hash).

## Forbidden actions

- No deploy/merge/DB change/push — PK gates. Base off `a0ab233` (origin/main), not local HEAD.
- No change to any out-of-scope path; no new `video_status` value; no DDL.

## Stop condition

Report per result template at each gate; halt on any non-clean verdict. Deploy is a PK hard stop.
