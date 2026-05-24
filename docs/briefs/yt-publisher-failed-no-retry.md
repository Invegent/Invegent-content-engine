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
- **Live backlog (2026-05-25):** `video_status` over the video formats = `failed` 30, `published` 30, `archived_stale` 14, `pending` 3, `generated` 1. The **30 `failed`** are the casualties — a mix of true token-outage victims (publishable, wrongly terminalised during the OAuth Testing-mode outage) and genuinely non-uploadable drafts (sync_state v3.05 notes ~NY 3 + PP 9 failed-out-of-guard: non-uploadable format / non-approved). The recovery pass (Unit B) separates these.
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
- Converting YT to a queue-based publisher (large refactor; explicitly deferred).

## Allowed actions

- Author the `youtube-publisher` v1.7.0 EF code; commit + push to its deploy branch.
- Author the Unit B recovery migration **file** (`supabase/migrations/`); commit + push.
- Run **read-only** verification SQL (draft-state counts, `draft_format` error-string inspection, `cpp.paused_until` reads) and, in a review context, dry-run classification queries over the 30 failed drafts.

## Forbidden actions

- Do **not** deploy the EF, apply the migration, invoke the publisher, or mutate any row until the D-01 chain + explicit PK approval phrase are in place.
- Do **not** touch OAuth, the dashboard callback, cron jobs, client `publish_enabled`, or `archived_stale` drafts.
- Do **not** introduce a new `video_status` value if it would violate a CHECK/enum constraint — confirm the column's constraint first (see §2) and prefer the no-DDL path.
- Honour all active hold-state items in `docs/00_sync_state.md` (YT backlog drain watch; do not bulk-reset `archived_stale`).

## Design detail (ported from instagram-publisher v2.4.0)

### 1. Failure classification helper

A pure function `classifyYouTubeFailure(errMsg: string): 'auth' | 'transient' | 'terminal'`, mirroring IG's `rateLimited` / `PUBLISH_NOT_READY_RE` split:

- **`auth`** (channel-level; the IG `2207051` analogue) — matches `invalid_grant`, `Token refresh failed 400`, `401`, `unauthorized`, `Token has been expired or revoked`. Containment = **channel hold**, NOT per-draft death (a token outage is a property of the channel, not the draft).
- **`transient`** (per-draft, retryable) — matches YouTube `5xx`, `quotaExceeded`, `backendError`, `internalError`, `rateLimitExceeded`, `Failed to download video` / fetch non-ok, network/timeout. Containment = bounded retry, then terminal at cap.
- **`terminal`** (per-draft defect; default for anything unmatched that is clearly a 4xx content/metadata rejection or `No video ID in YouTube response` after a 2xx) — fail immediately, no retry.
- Use `\b`-bounded digit matching for numeric codes (per IG's `PUBLISH_NOT_READY_RE` lesson — don't match codes embedded in trace ids). Default-unmatched → treat as `transient` under the cap (safer than instant death; the cap still bounds it).

### 2. Retry state without a new status value (preferred, no-DDL)

The SELECT filters `video_status='generated'`; setting `'failed'` is terminal. To make transient failures retryable **without** risking a `video_status` CHECK/enum violation:

- On a **`transient`** failure under the cap: **leave `video_status='generated'`** and write into `draft_format`: `youtube_upload_attempts` (int, increment), `youtube_retry_after` (ISO, `now + backoff`), `youtube_upload_error` (existing). Do **not** flip to `failed`.
- **SELECT change:** additionally require the draft is not in backoff — i.e. `draft_format->>youtube_retry_after IS NULL OR (draft_format->>youtube_retry_after)::timestamptz <= now()`. (ISO-8601 strings also sort chronologically if a text compare is simpler in the PostgREST chain.) Bump `LIMIT` from 2 to e.g. 5 and process at most 2 *eligible* per tick so retrying drafts don't starve fresh ones — confirm desired per-tick publish rate with PK; default keep effective publishes ≤2/tick to respect existing cadence.
- On a **`transient`** failure **at the cap** (`youtube_upload_attempts >= MAX_YT_UPLOAD_ATTEMPTS`, suggest 5 to match IG): set `video_status='failed'` (now a *true* terminal) + `draft_format.youtube_dead_reason='max_attempts:N/CAP'`.
- On a **`terminal`** failure: set `video_status='failed'` immediately + `youtube_dead_reason=<class>`.
- **Constraint check (pre-flight):** confirm whether `m.post_draft.video_status` is free text vs a CHECK/enum. If free text, the above needs **zero DDL**. A cleaner explicit `video_status='retry'` state is the alternative **only if** it does not require touching a constrained domain (L33–L35 registry caution applies to any such DDL); the no-DDL jsonb-gate path is the default recommendation.

### 3. Channel-level auth hold (the IG 2207051 auto-pause analogue)

- On an **`auth`** failure: do **not** increment the per-draft attempt count and do **not** flip the draft to `failed`. Instead set `c.client_publish_profile.paused_until = now() + YT_AUTH_PAUSE_HOURS` (suggest 6, matching IG `RATE_LIMIT_PAUSE_HOURS`) for that `(client_id, 'youtube')` profile. The draft stays `generated` and resumes automatically once the hold lifts and the token is fixed.
- Because YT is **direct-read with no lock RPC to honour the pause**, the publisher must enforce the hold **itself**: at the top of the per-draft loop, load the draft's `(client_id,'youtube')` profile and **skip** (leave untouched) any draft whose channel `paused_until > now()`. Group/short-circuit per client so one auth failure parks the whole channel's drafts for that run.
- This is the core fix for the original incident shape: a channel-wide token outage now **parks** the backlog (recoverable) instead of terminalising every draft it touches.

### 4. Successful-publish path

Byte-unchanged from v1.6.0 (download → `uploadToYouTube` → update draft to `published` + `draft_format` video id/url → insert `m.post_publish`). On success, clear any prior `youtube_retry_after` / `youtube_upload_attempts` so a draft that recovered after retries leaves no stale backoff metadata.

### 5. Detection tie-in (cross-reference, not implemented here)

When the channel hold (§3) fires, that is the genuine "this channel's token is dead" signal. The `F-YT-EXPIRY-DISPLAY-FAKE` cleanup should surface `cpp.paused_until` (and/or a live token probe — see the deployed `fb-token-probe` EF for the pattern) **instead of** the hardcoded 2031 expiry, so the next outage is visible within minutes rather than when posts silently stop. Flag for that brief; do not build here.

## Unit B — one-time recovery of the 30 `failed` drafts

Triage migration (DML), separately D-01-gated:

- Read the 30 `video_status='failed'` video-format drafts and bucket by `draft_format->>youtube_upload_error`:
  - **auth/transient signature** (`invalid_grant`, token/refresh/401, download/5xx) → reset to `video_status='generated'`, clear `youtube_upload_error`, set/clear `youtube_upload_attempts=0`, no `youtube_retry_after` → re-enters the (now-safe) publish path. Respect `approval_status='approved'` (only approved drafts re-enter).
  - **genuine terminal** (unsupported format, content rejection, not-approved) → leave `failed`, set a clear `youtube_dead_reason` so they're auditable and excluded from future confusion.
- Output the bucket counts for the result file. Bound the UPDATE to the 30 known ids (snapshot first); never a blanket `video_status='failed' → 'generated'`.

## Migration / deploy needs

- **Unit A — `youtube-publisher` v1.7.0 EF deploy.** CC builds; **PK deploys manually** from `C:\Users\parve\Invegent-content-engine` (Windows MCP PowerShell times out on `supabase functions deploy`). No DDL if §2 no-DDL path holds and `cpp.paused_until` is reused.
- **Unit B — recovery DML migration** via Supabase MCP `apply_migration` (the only sanctioned DML path on `m.*`; `exec_sql` is read-only for DML on `c/f/m/t`). Bounded, snapshot-first.
- **Order:** deploy Unit A first (so re-activated drafts hit the resilient publisher), then run Unit B (which feeds drafts back into it). A-then-B is required, not optional.
- **Rollback:** Unit A = redeploy v1.6.0 (keep a copy). Unit B = the reset is forward-only data movement; snapshot the pre-state ids+fields so a manual revert to `failed` is possible.

## Validation plan

1. **Pre-snapshot (read-only):** the 30 `failed` ids with their `youtube_upload_error` strings; current `generated`/`pending` counts; NY/PP `cpp.paused_until` (expect null).
2. **Classification unit check:** feed representative error strings through `classifyYouTubeFailure` (in a review/test harness) → `invalid_grant`→`auth`, `quotaExceeded`/`Failed to download`→`transient`, `unsupported`/`No video ID`→`terminal`.
3. **Post Unit A — transient path:** stage a transient failure (e.g. a draft with a momentarily-bad video_url) → assert it stays `generated`, `youtube_upload_attempts` increments, `youtube_retry_after` set, and it is **not** re-selected until the backoff elapses; assert it publishes once the cause clears.
4. **Post Unit A — auth path:** stage/observe an `auth` failure → assert the channel's `cpp.paused_until` is set, the draft is **not** flipped to `failed`, other drafts for that channel are skipped while paused, and they resume after the hold + a good token.
5. **Post Unit A — terminal path & cap:** a genuinely bad draft dies at the cap (or immediately for terminal class) with a `youtube_dead_reason`; assert it does **not** retry forever.
6. **Post Unit B:** token-casualty drafts return to `generated` and drain through v1.7.0; genuine-terminal drafts remain `failed` with a reason. No blanket reset.
7. **Regression:** the successful-publish path is unchanged — `published` drafts still write `m.post_publish` + `draft_format` correctly; effective publish cadence stays within the existing per-tick rate.

## D-01 requirements

Per `docs/runtime/mcp_review_protocol.md` + ICE-PROC-001:

- **D-01 #1 — `plan_review`:** this brief / the v1.7.0 design. (Can be fired at issue time.)
- **D-01 #2 — `ef_deploy`:** the Unit A youtube-publisher v1.7.0 deploy, at execution time.
- **D-01 #3 — `sql_destructive`:** the Unit B recovery DML, at execution time. P1–P5 pre-flight (Lesson #61); if any DDL is introduced (only if §2's no-DDL path fails), the event-trigger pre-flight survey (L33–L35) also applies.
- Explicit PK approval phrase before **each** production mutation (EF deploy; migration apply). Hard-stop discipline at every step. Both YT D-01 fires in v3.05 returned partial/type-c echoes (L62) — expect the same here and handle per the Lesson #62 framework (satisfy the corrected action, then re-fire).

## Success criteria

- A transient/auth failure no longer terminalises a draft: transient drafts retry under a cap; auth failures park the channel via `paused_until` and self-heal.
- A genuinely-bad draft dies at the cap with a `youtube_dead_reason` (no infinite retry — the YT analogue of IG's 734-attempt runaway is impossible by construction).
- The 30 `failed` drafts are correctly triaged: token casualties recovered, genuine terminals retained with reasons.
- The successful-publish path and publish cadence are unchanged (regression passes).
- A future channel-wide token outage parks the backlog instead of silently freezing it.

## Stop condition

Author the EF v1.7.0 code + the Unit B recovery migration file, commit/push, and report per the result template. Do **not** deploy/apply — execution is gated on the D-01 chain + PK approval in a separate, supervised step.

---

## Notes

- **Why mirror IG rather than invent:** IG v2.4.0 already paid for this lesson in production (the 734-attempt runaway and the 2207051 channel restriction). The transient-vs-terminal split, the attempt cap → terminal dead, and the channel-level pause-exempt-from-cap are a directly transferable shape. The only real translation cost is that YT is direct-read (no queue row, no lock RPC), so the attempt counter lives in `draft_format` jsonb and the pause must be enforced inside the EF rather than by `publisher_lock_queue`.
- **Systemic theme:** F-YT-FAILED-NO-RETRY, F-YT-EXPIRY-DISPLAY-FAKE, and the just-closed repo↔deployed IG drift are the same class of bug — a failure made invisible by a layer that lies (terminalised-but-publishable drafts, fake expiry, stale repo). This brief makes YT failures *loud and bounded*; the expiry-display cleanup makes them *visible*. Recommend sequencing the two so detection lands alongside resilience.
