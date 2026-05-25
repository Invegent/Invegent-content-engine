# Brief — youtube-publisher F-YT-FAILED-NO-RETRY: failure classification + bounded retry + channel-level auth hold

**Created:** 2026-05-25 Sydney
**Author:** chat
**Executor:** Claude Code (youtube-publisher EF build + recovery migration-file authoring); chat (migration apply via Supabase MCP); PK (manual EF deploy)
**Status:** draft — NOT implemented
**Model / reference implementation:** `instagram-publisher` v2.4.0 (repo `supabase/functions/instagram-publisher/index.ts` @ `bc78511e`) — its RE-B bounded-retry + 2207051 channel auto-pause pattern is the template this brief ports to YouTube.
**Result file:** `docs/briefs/results/yt-publisher-failed-no-retry.md` (created on completion)

---

## Task

Eliminate the silent-backlog-freeze failure mode in `youtube-publisher` (F-YT-FAILED-NO-RETRY): the publisher's catch handler marks **every** upload failure — including transient ones — as terminal `video_status='failed'`, and its SELECT only ever re-selects `video_status='generated'`. A single transient failure (token blip, network error, YouTube 5xx) therefore permanently bricks a draft, and a channel-level token outage silently freezes the entire rendered backlog. Port the proven `instagram-publisher` v2.4.0 model: **classify** failures, give transient/per-draft failures a **bounded retry** (attempt-capped) before they become terminal, and treat **channel-level auth/token failures** as a channel hold (exempt from the per-draft death cap) so a token outage parks the backlog and self-heals on token fix instead of killing content. Add a one-time recovery pass for the drafts already stuck in `failed`. The successful-publish path stays byte-unchanged.

## Source context

Read-only audit (session 2026-05-25) established the mechanism and sized the damage. Facts the executor needs (confirm each against live before editing):

- **`youtube-publisher` v1.6.0** (deployed Supabase fn version 46; repo `supabase/functions/youtube-publisher/index.ts`). Invoked by **cron jobid 34** (`15,45 * * * *`). It is a **direct-read** publisher — it reads `m.post_draft` directly and does **not** use `m.publisher_lock_queue_v1` / a queue row (unlike IG). Consequences:
  - **SELECT (the bug's other half):** `video_status='generated'` AND `approval_status='approved'` AND `draft_format->youtube_video_id IS NULL` AND `video_url IS NOT NULL` AND `recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice')`, `LIMIT 2`. Nothing re-selects `failed`.
  - **catch (the bug):** on ANY thrown error it does `UPDATE m.post_draft SET video_status='failed', draft_format = {...draft_format, youtube_upload_error: msg, youtube_upload_attempted: now}`. No transient/terminal distinction, no attempt count, no retry, no channel scoping.
  - **Throw sites that are actually transient** (today all collapse to terminal `failed`): `refreshAccessToken` on token-endpoint non-200 (`invalid_grant`, 401), and on missing `access_token`; `fetch(video_url)` non-ok (download blip / signed-URL expiry); `uploadToYouTube` on YouTube non-2xx (incl. 5xx, `quotaExceeded`).
  - **Throw sites that are genuinely terminal** (per-draft defects): permanent video_url 404, unsupported/invalid metadata rejected 400, missing OAuth client id/secret (config — channel-level actually).
  - **YT metadata lives in `m.post_draft.draft_format` (jsonb)** — existing keys `youtube_video_id`, `youtube_url`, `youtube_published`, `youtube_upload_error`, `youtube_upload_attempted`. There is **no** `attempt_count` column on the YT path (IG's cap uses `m.post_publish_queue.attempt_count` + `dead_reason`, which YT has no analogue for because it has no queue row). New counters must live in `draft_format` unless DDL is justified.
- **Live backlog (2026-05-25):** `video_status` over the video formats = `failed` 30, `published` 30, `archived_stale` 14, `pending` 3, `generated` 1. A read-only live bucket of the **30 `failed`** drafts (by `draft_format->>youtube_upload_error` × `approval_status`, session 2026-05-25) gives the actual composition — this **supersedes** the earlier ~NY 3 + PP 9 estimate:
  - **5** — `YouTube upload 429: Quota exceeded`, `approval_status='approved'` → transient, cleanly recoverable.
  - **17** — `Token refresh failed 400: invalid_grant`, `approval_status='published'` → token casualties of the OAuth Testing-mode outage; the `published` status is a known anomaly (they failed yet carry `published`), so recoverable **only after proving no upload landed** (see §Unit B Bucket 2).
  - **8** — `No refresh token found for client 3eca32aa…`, `approval_status='published'` → a YouTube channel that was **never connected** (consistent with the CFW/Invegent never-connected note in sync_state); **onboarding debt, not retry debt** — out of scope for this brief.
  Unit B is specified against these three real buckets, not the estimate.
- **`c.client_publish_profile`** has a usable **`paused_until`** timestamp column (confirmed live: YT profiles for NY + PP both `paused_until = null`, `publish_enabled = true`, `destination_id` present). This is the same field IG v2.1.0 uses for its 2207051 auto-pause — **reuse it** for the YT channel hold. No new column needed for the hold.
- **YT OAuth root cause (resolved, do not re-fix):** the 7-day token death was the Google OAuth app being in *Testing* status (`F-YT-OAUTH-TESTING-MODE`, resolved v3.05 — app moved to Production). This brief does **not** touch OAuth; it makes the publisher *survive* a future token blip gracefully instead of freezing.
- **Related:** `F-YT-EXPIRY-DISPLAY-FAKE` (dashboard `app/api/youtube/callback/route.ts` hardcodes `now()+5y`, masking dead tokens) — the channel hold added here is the *real* signal that cleanup should surface (see §5). `docs/runtime/mcp_review_protocol.md` (D-01); `docs/process/ICE-PROC-001-patch-severity.md`.

## Scope

**In scope:**
- `youtube-publisher` v1.7.0: a failure-classification helper, a bounded per-draft retry with attempt cap, a channel-level auth/token hold (exempt from the cap), and the corresponding SELECT change so retryable drafts are re-selected after a backoff while genuinely-terminal drafts stay out.
- A one-time recovery migration (Unit B) to triage the existing 30 `failed` drafts.

**Out of scope:**
- Any OAuth / token-exchange / dashboard-callback change (separate `F-YT-EXPIRY-DISPLAY-FAKE` brief — cross-referenced, not done here).
- The successful-publish path, metadata building, the approval gate, the format allow-list.
- Any change to other publishers, cron schedules, client enablement, or `archived_stale` / `pending` drafts.
- The 8 never-connected-channel drafts (Bucket 3) — channel onboarding is a separate first-time-OAuth task.
- Converting YT to a queue-based publisher (large refactor; explicitly deferred).

## Allowed actions

- Author the `youtube-publisher` v1.7.0 EF code; commit + push to its deploy branch.
- Author the Unit B recovery migration **file** (`supabase/migrations/`); commit + push.
- Run **read-only** verification SQL (draft-state counts, `draft_format` error-string inspection, `cpp.paused_until` reads, the Bucket 2 no-upload guard probe) and, in a review context, dry-run classification queries over the 30 failed drafts.

## Forbidden actions

- Do **not** deploy the EF, apply the migration, invoke the publisher, or mutate any row until the D-01 chain + explicit PK approval phrase are in place.
- Do **not** touch OAuth, the dashboard callback, cron jobs, client `publish_enabled`, or `archived_stale` drafts.
- Do **not** reset any Bucket 2 draft that fails the no-upload guard (a present `youtube_video_id` or an existing `m.post_publish` row) — that risks double-publishing live content.
- Do **not** attempt to recover the Bucket 3 (never-connected) drafts via retry — they require channel onboarding, not a reset.
- Do **not** introduce a new `video_status` value if it would violate a CHECK/enum constraint — the column is confirmed free-text (§2); the no-DDL path is the chosen approach.
- Honour all active hold-state items in `docs/00_sync_state.md` (YT backlog drain watch; do not bulk-reset `archived_stale`).

## Design detail (ported from instagram-publisher v2.4.0)

### 1. Failure classification helper

A pure function `classifyYouTubeFailure(errMsg: string): 'auth' | 'transient' | 'terminal'`, mirroring IG's `rateLimited` / `PUBLISH_NOT_READY_RE` split:

- **`auth`** (channel-level; the IG `2207051` analogue) — matches `invalid_grant`, `Token refresh failed 400`, `401`, `unauthorized`, `Token has been expired or revoked`. Containment = **channel hold**, NOT per-draft death (a token outage is a property of the channel, not the draft).
- **`transient`** (per-draft, retryable) — matches YouTube `5xx`, `quotaExceeded`, `backendError`, `internalError`, `rateLimitExceeded`, `429`, `Failed to download video` / fetch non-ok, network/timeout. Containment = bounded retry, then terminal at cap. *(Note: the 5 live Bucket-1 casualties are `429 Quota exceeded` — confirm whether a YT daily-quota 429 should pause the channel like `auth` rather than burn per-draft attempts; default keep it transient-under-cap unless PK/operational data says quota exhaustion is channel-wide.)*
- **`terminal`** (per-draft defect; default for anything unmatched that is clearly a 4xx content/metadata rejection or `No video ID in YouTube response` after a 2xx) — fail immediately, no retry.
- Use `\b`-bounded digit matching for numeric codes (per IG's `PUBLISH_NOT_READY_RE` lesson — don't match codes embedded in trace ids). Default-unmatched → treat as `transient` under the cap (safer than instant death; the cap still bounds it).

### 2. Retry state without a new status value (no-DDL — confirmed safe)

The SELECT filters `video_status='generated'`; setting `'failed'` is terminal. To make transient failures retryable **without** risking a `video_status` CHECK/enum violation:

- On a **`transient`** failure under the cap: **leave `video_status='generated'`** and write into `draft_format`: `youtube_upload_attempts` (int, increment), `youtube_retry_after` (ISO, `now + backoff`), `youtube_upload_error` (existing). Do **not** flip to `failed`.
- **SELECT change:** additionally require the draft is not in backoff — i.e. `draft_format->>youtube_retry_after IS NULL OR (draft_format->>youtube_retry_after)::timestamptz <= now()`. (ISO-8601 strings also sort chronologically if a text compare is simpler in the PostgREST chain.) Bump `LIMIT` from 2 to e.g. 5 and process at most 2 *eligible* per tick so retrying drafts don't starve fresh ones — confirm desired per-tick publish rate with PK; default keep effective publishes ≤2/tick to respect existing cadence.
- On a **`transient`** failure **at the cap** (`youtube_upload_attempts >= MAX_YT_UPLOAD_ATTEMPTS`, suggest 5 to match IG): set `video_status='failed'` (now a *true* terminal) + `draft_format.youtube_dead_reason='max_attempts:N/CAP'`.
- On a **`terminal`** failure: set `video_status='failed'` immediately + `youtube_dead_reason=<class>`.
- **Constraint check (CONFIRMED live 2026-05-25):** `m.post_draft.video_status` is `text` with **no CHECK constraint** (`information_schema.columns` data_type=`text`/udt=`text`; `pg_constraint` scan for any `video_status` CHECK returned none). The no-DDL jsonb-gate path therefore carries **zero constraint risk** and is the chosen approach; no `video_status='retry'` value (which would risk a constrained-domain change) is needed. L33–L35 registry caution applies only if future DDL is introduced — it is not, here.

### 3. Channel-level auth hold (the IG 2207051 auto-pause analogue)

- On an **`auth`** failure: do **not** increment the per-draft attempt count and do **not** flip the draft to `failed`. Instead set `c.client_publish_profile.paused_until = now() + YT_AUTH_PAUSE_HOURS` (suggest 6, matching IG `RATE_LIMIT_PAUSE_HOURS`) for that `(client_id, 'youtube')` profile. The draft stays `generated` and resumes automatically once the hold lifts and the token is fixed.
- Because YT is **direct-read with no lock RPC to honour the pause**, the publisher must enforce the hold **itself**: at the top of the per-draft loop, load the draft's `(client_id,'youtube')` profile and **skip** (leave untouched) any draft whose channel `paused_until > now()`. Group/short-circuit per client so one auth failure parks the whole channel's drafts for that run.
- This is the core fix for the original incident shape: a channel-wide token outage now **parks** the backlog (recoverable) instead of terminalising every draft it touches.

### 4. Successful-publish path

Byte-unchanged from v1.6.0 (download → `uploadToYouTube` → update draft to `published` + `draft_format` video id/url → insert `m.post_publish`). On success, clear any prior `youtube_retry_after` / `youtube_upload_attempts` so a draft that recovered after retries leaves no stale backoff metadata.

### 5. Detection tie-in (cross-reference, not implemented here)

When the channel hold (§3) fires, that is the genuine "this channel's token is dead" signal. The `F-YT-EXPIRY-DISPLAY-FAKE` cleanup should surface `cpp.paused_until` (and/or a live token probe — see the deployed `fb-token-probe` EF for the pattern) **instead of** the hardcoded 2031 expiry, so the next outage is visible within minutes rather than when posts silently stop. Flag for that brief; do not build here.

## Unit B — one-time recovery of the 30 `failed` drafts (live-bucketed 2026-05-25)

Triage migration (DML), separately D-01-gated. A read-only live bucket (session 2026-05-25, `draft_format->>youtube_upload_error` × `approval_status`) established the **actual** composition of the 30 `video_status='failed'` video-format drafts. Recovery is specified against these three real buckets — **NOT** the earlier "auth/transient vs genuine-terminal, only `approved` re-enter" sketch, which the live data showed to be wrong (the real token casualties are `published`, not `approved`):

- **Bucket 1 — 5 drafts: transient quota, clean recovery.** `YouTube upload 429: Quota exceeded`, `approval_status='approved'`. → reset to `video_status='generated'`, clear `youtube_upload_error`, set `youtube_upload_attempts=0`, no `youtube_retry_after`. They re-enter the (now bounded-retry-safe) publish path and drain under the cap.
- **Bucket 2 — 17 drafts: token casualties, recover ONLY after proving no upload landed.** `Token refresh failed 400: invalid_grant`, `approval_status='published'` (NOT `approved` — a known anomaly: these failed during the OAuth Testing-mode outage yet carry `published`). Blindly resetting risks double-publishing a video that actually went out. **Per-draft guard (must pass BOTH): `draft_format->>'youtube_video_id' IS NULL` AND no `m.post_publish` row exists for that `post_draft_id` (no upload landed).**
  - Passes guard → reset to `video_status='generated'`, clear `youtube_upload_error`, set `youtube_upload_attempts=0`, no `youtube_retry_after`. *(Decide at execution whether to also normalise `approval_status` `published→approved` so the SELECT re-selects them — the publisher SELECT requires `approval_status='approved'`; if these stay `published` they will NOT be picked up. Confirm with PK at Unit B time.)*
  - Fails guard (a `youtube_video_id` present OR a `m.post_publish` row exists) → leave as-is, set `youtube_dead_reason='already_published_no_recovery'`, do **not** reset (treat as genuinely published; reconcile separately if needed).
- **Bucket 3 — 8 drafts: no channel connected, OUT OF SCOPE.** `No refresh token found for client 3eca32aa…` — a YouTube channel that was never connected (CFW/Invegent never-connected note). **Channel-onboarding debt, not retry debt** — a retry can never succeed without a first-time OAuth connection. → leave `video_status='failed'`, set `youtube_dead_reason='no_channel_connected'`, exclude from this brief. Onboarding is a separate first-time-OAuth task tracked under the CFW+Invegent YouTube onboarding carry.

- **Snapshot first:** capture the affected ids + pre-state (`video_status`, `approval_status`, `draft_format->>youtube_video_id`, `youtube_upload_error`, and the `m.post_publish` existence flag for Bucket 2) before any UPDATE. Output the per-bucket counts and the Bucket-2 guard pass/fail split for the result file. Bound every UPDATE to the explicit snapshotted ids; **never** a blanket `video_status='failed' → 'generated'`.

## Migration / deploy needs

- **Unit A — `youtube-publisher` v1.7.0 EF deploy.** CC builds; **PK deploys manually** from `C:\Users\parve\Invegent-content-engine` (Windows MCP PowerShell times out on `supabase functions deploy`). No DDL — §2 no-DDL path confirmed and `cpp.paused_until` reused.
- **Unit B — recovery DML migration** via Supabase MCP `apply_migration` (the only sanctioned DML path on `m.*`; `exec_sql` is read-only for DML on `c/f/m/t`). Bounded, snapshot-first, three-bucket per above.
- **Order:** deploy Unit A first (so re-activated drafts hit the resilient publisher), then run Unit B (which feeds Bucket 1 + guarded Bucket 2 back into it). A-then-B is required, not optional.
- **Rollback:** Unit A = redeploy v1.6.0 (keep a copy). Unit B = the reset is forward-only data movement; the pre-state snapshot makes a manual revert to `failed` possible.

## Validation plan

1. **Pre-snapshot (read-only):** the 30 `failed` ids bucketed (5 / 17 / 8) with their `youtube_upload_error` strings + `approval_status`; for Bucket 2, the `youtube_video_id` + `m.post_publish`-exists flag per draft; current `generated`/`pending` counts; NY/PP `cpp.paused_until` (expect null).
2. **Classification unit check:** feed representative error strings through `classifyYouTubeFailure` (in a review/test harness) → `invalid_grant`→`auth`, `quotaExceeded`/`429`/`Failed to download`→`transient`, `unsupported`/`No video ID`→`terminal`.
3. **Post Unit A — transient path:** stage a transient failure (e.g. a draft with a momentarily-bad video_url) → assert it stays `generated`, `youtube_upload_attempts` increments, `youtube_retry_after` set, and it is **not** re-selected until the backoff elapses; assert it publishes once the cause clears.
4. **Post Unit A — auth path:** stage/observe an `auth` failure → assert the channel's `cpp.paused_until` is set, the draft is **not** flipped to `failed`, other drafts for that channel are skipped while paused, and they resume after the hold + a good token.
5. **Post Unit A — terminal path & cap:** a genuinely bad draft dies at the cap (or immediately for terminal class) with a `youtube_dead_reason`; assert it does **not** retry forever.
6. **Post Unit B:** Bucket 1 (5) → `generated`, drain through v1.7.0. Bucket 2 guard-passing drafts → `generated` (and re-selectable per the `approval_status` decision); guard-failing drafts → retain `failed` + `youtube_dead_reason='already_published_no_recovery'`. Bucket 3 (8) → retain `failed` + `youtube_dead_reason='no_channel_connected'`. No blanket reset; bucket counts match the pre-snapshot.
7. **Regression:** the successful-publish path is unchanged — `published` drafts still write `m.post_publish` + `draft_format` correctly; effective publish cadence stays within the existing per-tick rate.

## D-01 requirements

Per `docs/runtime/mcp_review_protocol.md` + ICE-PROC-001:

- **D-01 #1 — `plan_review`:** this brief / the v1.7.0 design. (Can be fired at issue time.)
- **D-01 #2 — `ef_deploy`:** the Unit A youtube-publisher v1.7.0 deploy, at execution time.
- **D-01 #3 — `sql_destructive`:** the Unit B recovery DML, at execution time. P1–P5 pre-flight (Lesson #61); no DDL is introduced (§2 no-DDL path confirmed), so the event-trigger pre-flight survey (L33–L35) does not apply unless that changes.
- Explicit PK approval phrase before **each** production mutation (EF deploy; migration apply). Hard-stop discipline at every step. Both YT D-01 fires in v3.05 returned partial/type-c echoes (L62) — expect the same here and handle per the Lesson #62 framework (satisfy the corrected action, then re-fire).

## Success criteria

- A transient/auth failure no longer terminalises a draft: transient drafts retry under a cap; auth failures park the channel via `paused_until` and self-heal.
- A genuinely-bad draft dies at the cap with a `youtube_dead_reason` (no infinite retry — the YT analogue of IG's 734-attempt runaway is impossible by construction).
- The 30 `failed` drafts are correctly triaged per the live buckets: the 5 quota casualties recovered; the 17 token casualties recovered **only** where the no-upload guard passes (the rest retained with `already_published_no_recovery`); the 8 never-connected drafts retained as `no_channel_connected` onboarding debt. No double-publish; no blanket reset.
- The successful-publish path and publish cadence are unchanged (regression passes).
- A future channel-wide token outage parks the backlog instead of silently freezing it.

## Stop condition

Author the EF v1.7.0 code + the Unit B recovery migration file, commit/push, and report per the result template. Do **not** deploy/apply — execution is gated on the D-01 chain + PK approval in a separate, supervised step.

---

## Notes

- **Why mirror IG rather than invent:** IG v2.4.0 already paid for this lesson in production (the 734-attempt runaway and the 2207051 channel restriction). The transient-vs-terminal split, the attempt cap → terminal dead, and the channel-level pause-exempt-from-cap are a directly transferable shape. The only real translation cost is that YT is direct-read (no queue row, no lock RPC), so the attempt counter lives in `draft_format` jsonb and the pause must be enforced inside the EF rather than by `publisher_lock_queue`.
- **Why the live bucket changed Unit B:** the original recovery sketch assumed token casualties were `approval_status='approved'` and could be reset on an error-signature match alone. The 2026-05-25 live bucket showed the 17 real casualties are `published` (an anomaly), and that 8 of the 30 belong to a never-connected channel. Hence the no-upload guard (anti-double-publish) on Bucket 2 and the onboarding-debt reclassification of Bucket 3. Verify against live data before trusting a composition estimate (L-v3.05-a).
- **Systemic theme:** F-YT-FAILED-NO-RETRY, F-YT-EXPIRY-DISPLAY-FAKE, and the just-closed repo↔deployed IG drift are the same class of bug — a failure made invisible by a layer that lies (terminalised-but-publishable drafts, fake expiry, stale repo). This brief makes YT failures *loud and bounded*; the expiry-display cleanup makes them *visible*. Recommend sequencing the two so detection lands alongside resilience.
