## D169 — Instagram Publisher v2.0.0 Queue-Based Refactor: Closes M12, Enforces Platform Discipline at Three Layers
**Date:** 25 April 2026 Saturday afternoon | **Status:** ✅ CODE SHIPPED to main (commit `562ab3e`); EF DEPLOY pending PK action

### The problem this decides

After R6 cutover went live Saturday morning, PK approved the Invegent IG drafts and unpaused IG cron (jobid 53). Within 30 minutes, two findings surfaced:

1. **Invegent IG published 4 posts cleanly today** — proof the EF could publish to IG.
2. **NY and PP IG queue items did not publish** despite being approved + due. Investigation traced this to the IG publisher v1.0.0 querying `m.post_draft` directly with `ORDER BY pd.created_at ASC LIMIT 3` — without any `pd.platform = 'instagram'` filter. NY's #1 result was a 13-day-old Facebook draft.

The deeper audit revealed worse: **18 NDIS Yarns IG posts on 19 April 2026 were ALL cross-posted from FB-platform drafts** (verified via `pp.platform='instagram'` AND `pd.platform='facebook'`). FB-shaped content went live on the actual NY Instagram account. The bug had been in production for at least a week before being caught.

This was the M12 bug, originally classified surgical and superseded by D166's router-build track. R6 cutover changed the calculus — with R6 producing real R5-driven IG drafts every 10 minutes, the IG publisher could no longer be left broken-but-paused.

### The decision

**Refactor `instagram-publisher` to queue-based architecture mirroring the FB publisher (`publisher` v1.7.0).** Specifically:

1. Use `m.publisher_lock_queue_v1(p_platform := 'instagram')` for atomic queue locking
2. Defensive platform check on **both** the queue row AND the loaded draft
3. No direct `m.post_draft` queries — work from queue rows that are already platform-tagged via M11 enqueue trigger
4. Mirror FB publisher's image hold gate, throttle, schedule check, failure backoff, and `dead_reason` semantics

**Reject** the surgical alternative ("just add `AND pd.platform = 'instagram'` to v1.0.0's query") because:

- The queue-bypass architecture itself is the bug class. v1.0.0's design — read drafts directly, decide what to publish — is what allowed the cross-posting in the first place. Adding a filter patches one expression of the bug; refactoring eliminates the class.
- v1.0.0 cannot use `publisher_lock_queue_v1` without restructuring. Once you accept the lock RPC, every other piece of the FB publisher's architecture (throttle, schedule, hold gate, dead_reason) follows naturally.
- The race-condition class flagged earlier today on PP LinkedIn (3 published vs cap 2) is exactly what the lock RPC's `FOR UPDATE SKIP LOCKED` plus DB-level `max_per_day` enforcement prevents. Surgical fix would leave that gap open for IG.
- The post_publish_queue infrastructure was built specifically to be the publisher path. Bypassing it with a parallel data path violates the architectural intent.

### What v2.0.0 enforces explicitly

**Three-layer platform discipline.** Every layer can independently fail-safe a cross-platform draft:

1. **Lock RPC layer** — `m.publisher_lock_queue_v1` filters `WHERE q.platform = 'instagram'` at SQL level. No non-IG queue rows reach the function.
2. **Queue row defensive check** — the EF re-validates `q.platform === 'instagram'` after lock. If somehow a non-IG row was returned (RPC bug, schema change), fail loudly with `platform_mismatch:expected=instagram:got=<actual>`.
3. **Draft platform check** — after loading the draft, validate `draft.platform === 'instagram'`. If somehow a queue row was tagged 'instagram' but pointed at a FB-platform draft (data integrity bug, manual queue insert), fail loudly with `draft_platform_mismatch:queue=instagram:draft=<actual>`. **Critically, never proceed to the IG API call with a non-IG draft.**

This is defence-in-depth. The same class of bug failing at any one layer alone would not produce a cross-post. v1.0.0 had zero of these checks.

### The historical 18 cross-posts — separate cleanup

Independent of the v2.0.0 deploy, the 18 NY IG cross-posts from 19 April are being deleted via `scripts/delete_ny_ig_crosspost_cleanup_20260419.sh` (committed `f0c34f3`). Bash script + curl loop against the Meta Graph API DELETE endpoint. Requires the NY IG page access token in `$NY_IG_TOKEN`.

The `m.post_publish` records for these 18 rows remain unchanged as historical audit. (Optional follow-up: add a `deleted_from_platform_at` column for explicit reconciliation. Backlog, not blocking.)

### What this also closes

- **PP LinkedIn race condition** flagged earlier today (3 published vs cap=2 in 0.91 seconds) — same root cause class. The LI publisher should be audited next session for whether it uses `publisher_lock_queue_v1` correctly. If yes, the race may be a `max_per_day` enforcement gap inside the RPC; if no, LI publisher needs a parallel refactor.
- **M11 enqueue trigger correctness** — confirmed working. All IG queue rows audited today were correctly tagged `platform='instagram'` with `pd.platform='instagram'`. The trigger fix from 22 Apr is holding.

### What this does NOT decide

- **Does NOT redeploy the EF.** Code is on main. PK actions `supabase functions deploy instagram-publisher` from local repo to push v2.0.0 to production.
- **Does NOT unpause the cron.** Cron jobid 53 stays `active=false`. PK unpauses after deploy verified via health check + first dry-run tick.
- **Does NOT verify Carousel implementation.** Carousel path is implemented in v2.0.0 but untested against real IG carousel containers (the 3-step container/child/publish dance). First carousel publish should be observed; revert path is single-image fallback (built into the EF).
- **Does NOT close the LI publisher race condition.** That's the next session's audit work; LI may or may not have the same architecture as IG v1.0.0.

### Deploy + verification sequence (for PK reference)

```bash
# 1. From C:\Users\parve\Invegent-content-engine
git pull
supabase functions deploy instagram-publisher

# 2. Health check (should return v2.0.0)
curl https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/instagram-publisher/health

# 3. Dry run via direct invocation (no real publishes)
curl -X POST https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/instagram-publisher \
  -H "x-publisher-key: $PUBLISHER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 2, "dry_run": true}'

# 4. If dry run shows correct platform-tagged rows being locked:
SELECT cron.alter_job(53, active := true);

# 5. Monitor first 30 min
SELECT * FROM cron.job_run_details WHERE jobid = 53 ORDER BY start_time DESC LIMIT 5;
SELECT * FROM m.post_publish WHERE platform = 'instagram' AND created_at > NOW() - INTERVAL '30 min';
```

### Related decisions

- **D165** — bloat cleanup discipline that paused IG cron 22 Apr; v2.0.0 is the consumer fix that allows safe unpause
- **D166** — sequencing reversal that gave router track priority over M12 surgical
- **D167** — router shadow infrastructure
- **R6 (25 Apr)** — R5-driven seeder shipped. R6's IG drafts can now flow through to IG publisher safely
- **M11 (22 Apr)** — enqueue trigger ON CONFLICT fix. v2.0.0 depends on M11's correctness — every IG queue row must have `platform='instagram'` and `pd.platform='instagram'`. Trigger correctness verified today
- **D163** — DLQ semantics. v2.0.0 uses `last_error` for backoff and `dead_reason` for terminal failure (when CHECK constraint adds 'dead' to `m.post_publish_queue.status`)

### What this opens

Sprint items for next session:

- **LI publisher audit** — does it have an M12-class bug? Use the same lens (does it bypass the queue?)
- **PP LinkedIn race condition** — investigate whether the cap breach was an RPC enforcement gap or a publisher-level race
- **m.post_publish_queue.status CHECK** — add 'dead' to vocabulary (per D163 backlog)
- **Carousel verification** — first real carousel publish observation
- **`deleted_from_platform_at` column** — optional reconciliation column for the 18 NY IG cross-post deletions
