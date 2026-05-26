# Brief — youtube-publisher F-YT-FAILED-NO-RETRY: failure classification + bounded retry + channel-level auth hold

**Created:** 2026-05-25 Sydney
**Reconciled:** 2026-05-26 Sydney (target v1.7.0 → **v1.8.0**; v1.7.0 was consumed by the avatar allow-list (F-YT-PUB-AVATAR-EXCLUSION); baseline + rollback + Unit B live-bucket counts + the two open decisions reconciled below)
**Author:** chat
**Executor:** Claude Code (youtube-publisher EF build); chat (recovery migration apply via Supabase MCP); PK (manual EF deploy)
**Status:** **PK-approved 2026-05-26 (prepare + commit stage).** v1.8.0 EF source committed to `main` (`631fa93a`); Unit B recovery SQL prepared (not committed as a migration file, not applied). Awaiting: Unit A manual deploy (D-01 `ef_deploy` + PK phrase) → then Unit B apply (D-01 `sql_destructive` + PK phrase). **A-then-B.**
**Model / reference implementation:** `instagram-publisher` v2.4.0 (repo `supabase/functions/instagram-publisher/index.ts` @ `bc78511e`) — its RE-B bounded-retry + 2207051 channel auto-pause pattern is the template this brief ports to YouTube.
**Result file:** `docs/briefs/results/yt-publisher-failed-no-retry.md` (created on completion)

---

## Task

Eliminate the silent-backlog-freeze failure mode in `youtube-publisher` (F-YT-FAILED-NO-RETRY): the publisher's catch handler marks **every** upload failure — including transient ones — as terminal `video_status='failed'`, and its SELECT only ever re-selects `video_status='generated'`. A single transient failure (token blip, network error, YouTube 5xx) therefore permanently bricks a draft, and a channel-level token outage silently freezes the entire rendered backlog. Port the proven `instagram-publisher` v2.4.0 model: **classify** failures, give transient/per-draft failures a **bounded retry** (attempt-capped) before they become terminal, and treat **channel-level auth/token failures** as a channel hold (exempt from the per-draft death cap) so a token outage parks the backlog and self-heals on token fix instead of killing content. Add a one-time recovery pass for the drafts already stuck in `failed`. The successful-publish path stays byte-unchanged.

## Source context

Read-only audit (session 2026-05-25; live re-verified 2026-05-26) established the mechanism and sized the damage. Facts the executor needs (each confirmed against live):

- **Live baseline is now `youtube-publisher` v1.7.0** (repo `main` sha `fad30c62`; deployed — confirmed live by the avatar Short `sfQvSM2Osus` (`video_short_avatar`) published 2026-05-25 11:42:07Z, which only the v1.7.0 allow-list permits; no deploy since). v1.8.0 is built **on top of** v1.7.0 (NOT v1.6.0 — the earlier draft of this brief predated the avatar deploy). Invoked by **cron jobid 34** (`15,45 * * * *`). It is a **direct-read** publisher — it reads `m.post_draft` directly and does **not** use `m.publisher_lock_queue_v1` / a queue row (unlike IG). Consequences:
  - **SELECT (the bug's other half):** `video_status='generated'` AND `approval_status='approved'` AND `draft_format->youtube_video_id IS NULL` AND `video_url IS NOT NULL` AND `recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')` (**5 formats incl `video_short_avatar` as of v1.7.0**), `LIMIT 2`. Nothing re-selects `failed`.
  - **catch (the bug):** on ANY thrown error it does `UPDATE m.post_draft SET video_status='failed', draft_format = {...draft_format, youtube_upload_error: msg, youtube_upload_attempted: now}`. No transient/terminal distinction, no attempt count, no retry, no channel scoping.
  - **Throw sites that are actually transient** (today all collapse to terminal `failed`): `refreshAccessToken` on token-endpoint non-200 (`invalid_grant`, 401), and on missing `access_token`; `fetch(video_url)` non-ok (download blip / signed-URL expiry); `uploadToYouTube` on YouTube non-2xx (incl. 5xx, `quotaExceeded`).
  - **Throw sites that are genuinely terminal** (per-draft defects): permanent video_url 404, unsupported/invalid metadata rejected 400, missing OAuth client id/secret (config — channel-level actually).
  - **YT metadata lives in `m.post_draft.draft_format` (jsonb)** — existing keys `youtube_video_id`, `youtube_url`, `youtube_published`, `youtube_upload_error`, `youtube_upload_attempted`. There is **no** `attempt_count` column on the YT path. New counters live in `draft_format` (no DDL).
- **Live backlog (re-verified 2026-05-26):** `video_status` over the video formats = `failed` **31**, `published` 33, `archived_stale` 15, `pending` 5, `generated` 3, null 1. A read-only live bucket of the **31 `failed`** drafts (by `draft_format->>youtube_upload_error` × `approval_status` × no-upload guard) gives the actual composition — this **supersedes** the brief's original 5/17/8 (B3 drifted **8 → 9**: the +1 new `failed` since v3.06 is a never-connected one):
  - **5** — `YouTube upload 429: Quota exceeded`, `approval_status='approved'`, all pass no-upload guard → transient, cleanly recoverable.
  - **17** — `Token refresh failed 400: invalid_grant`, `approval_status='published'`, **all 17 pass the no-upload guard** (no `youtube_video_id`, no `m.post_publish` youtube row → none actually uploaded) → token casualties of the OAuth Testing-mode outage; the `published` status is a known anomaly, recoverable behind the guard + an `approval_status` normalisation (see §Unit B Bucket 2).
  - **9** — `No refresh token found for client …`, `approval_status='published'` → a YouTube channel that was **never connected** (the 3 distinct clients have **no** `c.client_publish_profile` youtube row at all); **onboarding debt, not retry debt** — out of scope.
  Unit B is specified against these three real buckets, not the estimate. Total 5+17+9 = 31.
- **`c.client_publish_profile`** has a usable **`paused_until`** timestamp column (confirmed live 2026-05-26 via direct SQL: YT profiles for NY (`fb98a472`) + PP (`4036a6b5`) both `paused_until = null`, `publish_enabled = true`, `destination_id` present, DB refresh token present). This is the same field IG v2.1.0 uses for its 2207051 auto-pause — **reuse it** for the YT channel hold. **Caveat (v1.8.0):** the column is confirmed readable/writable via direct SQL, but the EF's supabase-js PostgREST write path to `c.*` is **unverified**, so the persistent `paused_until` write is implemented **best-effort** — the in-run `pausedClients` set is the actual correctness guarantee (see §3). No new column needed.
- **YT OAuth root cause (resolved, do not re-fix):** the 7-day token death was the Google OAuth app being in *Testing* status (`F-YT-OAUTH-TESTING-MODE`, resolved v3.05 — app moved to Production). This brief does **not** touch OAuth; it makes the publisher *survive* a future token blip gracefully instead of freezing.
- **Related:** `F-YT-EXPIRY-DISPLAY-FAKE` (dashboard `app/api/youtube/callback/route.ts` hardcodes `now()+5y`, masking dead tokens) — the channel hold added here is the *real* signal that cleanup should surface (see §5). `docs/runtime/mcp_review_protocol.md` (D-01); `docs/process/ICE-PROC-001-patch-severity.md`.

## Scope

**In scope:**
- `youtube-publisher` **v1.8.0**: a failure-classification helper, a bounded per-draft retry with attempt cap, a channel-level auth/token hold (exempt from the cap), and the corresponding SELECT change so retryable drafts are re-selected after a backoff while genuinely-terminal drafts stay out.
- A one-time recovery (Unit B) to triage the existing 31 `failed` drafts.

**Out of scope:**
- Any OAuth / token-exchange / dashboard-callback change (separate `F-YT-EXPIRY-DISPLAY-FAKE` brief — cross-referenced, not done here).
- The successful-publish path, metadata building, the approval gate, the format allow-list (the 5-format list incl `video_short_avatar` is preserved verbatim).
- Any change to other publishers, cron schedules, client enablement, or `archived_stale` / `pending` drafts.
- The 9 never-connected-channel drafts (Bucket 3) — channel onboarding is a separate first-time-OAuth task.
- Converting YT to a queue-based publisher (large refactor; explicitly deferred).
- Any avatar / async / scheduler redesign; any broad retry framework.

## Allowed actions

- Author the `youtube-publisher` v1.8.0 EF code; commit + push. **(DONE 2026-05-26 — `631fa93a`.)**
- Author the Unit B recovery DML (prepared; apply via Supabase MCP `apply_migration` at execution).
- Run **read-only** verification SQL (draft-state counts, `draft_format` error-string inspection, `cpp.paused_until` reads, the Bucket 2 no-upload guard probe). **(DONE 2026-05-26.)**

## Forbidden actions

- Do **not** deploy the EF, apply the recovery DML, invoke the publisher, or mutate any row until the D-01 chain + explicit PK approval phrase are in place.
- Do **not** touch OAuth, the dashboard callback, cron jobs, client `publish_enabled`, or `archived_stale` drafts.
- Do **not** reset any Bucket 2 draft that fails the no-upload guard (a present `youtube_video_id` or an existing `m.post_publish` row) — that risks double-publishing live content.
- Do **not** attempt to recover the Bucket 3 (never-connected) drafts via retry — they require channel onboarding, not a reset.
- Do **not** introduce a new `video_status` value or any DDL — the column is confirmed `text` with **no CHECK** (re-verified 2026-05-26); the no-DDL jsonb-gate path is the chosen approach.
- Honour all active hold-state items in `docs/00_sync_state.md` (YT backlog drain watch; do not bulk-reset `archived_stale`).

## Design detail (ported from instagram-publisher v2.4.0; as implemented in v1.8.0)

### 1. Failure classification helper

A pure function `classifyYouTubeFailure(errMsg): 'auth' | 'quota' | 'transient' | 'terminal'`. **Resolved decision (PK 2026-05-26):** quota is split into its **own class** (rather than the brief's original transient-under-cap), because YouTube quota is **project/day-wide** — burning a per-draft death cap on a project-wide limit is wrong.

- **`auth`** (channel-level; the IG `2207051` analogue) — matches `invalid_grant`, `token refresh failed`, `expired or revoked`, `unauthorized`, `\b401\b`. Containment = **channel hold**, NOT per-draft death.
- **`quota`** (project-wide) — matches `quota`/`quotaexceeded`/`\b429\b`/`ratelimitexceeded`. Containment = **park `now + 6h`, NOT counted against the cap, never terminalised** (self-heals on the daily quota reset).
- **`transient`** (per-draft, retryable) — matches `\b5\d\d\b`, `backenderror`, `internalerror`, `failed to download`/fetch non-ok, `network`, `timeout`, `temporar`. Containment = bounded retry (`now + 30m` backoff, attempt++), then terminal at the cap.
- **`terminal`** (per-draft defect) — `\b40[03]\b`, `unsupported`, `invalid (metadata|video)`, `no video id`. Fail immediately.
- Default-unmatched → `transient` under the cap (bounded; safer than instant death). `\b`-bounded digit matching so codes embedded in trace ids are not matched.

### 2. Retry state without a new status value (no-DDL — confirmed safe)

- On a **`transient`** failure under the cap: **leave `video_status='generated'`** and write into `draft_format`: `youtube_upload_attempts` (int, increment), `youtube_retry_after` (ISO, `now + 30m`), `youtube_upload_error`.
- On a **`quota`** failure: leave `video_status='generated'`, set `youtube_retry_after = now + 6h`, do **not** increment attempts, do **not** terminalise.
- **SELECT change:** limit bumped 2→5; backed-off drafts (`youtube_retry_after > now`) and channel-paused drafts are **skipped in JS**; effective uploads capped at **2/tick** to preserve cadence. (JS-side filtering chosen over a fragile PostgREST `.or()` on a jsonb path.)
- On a **`transient`** failure **at the cap** (`youtube_upload_attempts + 1 >= MAX_YT_UPLOAD_ATTEMPTS = 5`): set `video_status='failed'` (true terminal) + `youtube_dead_reason='max_attempts:n/5'`.
- On a **`terminal`** failure: set `video_status='failed'` immediately + `youtube_dead_reason='terminal:<class>'`.
- **Constraint check (re-confirmed live 2026-05-26):** `m.post_draft.video_status` is `text` with **no CHECK** → the no-DDL jsonb-gate path carries zero constraint risk.

### 3. Channel-level auth hold (the IG 2207051 auto-pause analogue)

- On an **`auth`** failure: do **not** increment the per-draft attempt count and do **not** flip the draft to `failed`. Instead (a) set `c.client_publish_profile.paused_until = now() + 6h` for `(client_id,'youtube')` **best-effort** (wrapped; logged-not-thrown if the EF `c.*` write path is unavailable), and (b) add the client to an in-run `pausedClients` set so the rest of that channel's drafts are skipped this run; the triggering draft also gets a short `youtube_retry_after = now + 30m`. The draft stays `generated` and resumes once the hold lifts and the token is fixed.
- Because YT is **direct-read with no lock RPC**, the publisher enforces the hold **itself**: at the top of the per-draft loop it skips any draft whose channel is in `pausedClients` or whose preloaded `paused_until > now()`.
- **Correctness does not depend on the persistent `paused_until`** — the in-run set guarantees a token outage parks (does not terminalise) the backlog for the current tick; without the persist, a sustained outage simply re-probes ~1 draft/tick (no count, no fail) and self-heals on token fix.

### 4. Successful-publish path

Byte-unchanged from v1.7.0 (download → `uploadToYouTube` → update draft to `published` + `draft_format` video id/url → insert `m.post_publish`). On success, **clear** any prior `youtube_retry_after` / `youtube_upload_attempts` / `youtube_upload_error` / `youtube_dead_reason` so a draft that recovered after retries leaves no stale backoff metadata.

**Idempotency / no-duplicate-upload hardening (v1.8.0, beyond the original brief):** (a) `youtubeVideoId` is captured in an outer scope so an upload-succeeded-but-persist-failed error **recovers forward** (re-persists the id + `published`, never re-uploads); (b) a **pre-upload `m.post_publish` existence check** reconciles any prior orphaned upload to `published` instead of re-uploading. Together these close the persist-failure duplicate window that the original SELECT-guard-only approach left open.

### 5. Detection tie-in (cross-reference, not implemented here)

When the channel hold (§3) fires, that is the genuine "this channel's token is dead" signal. The `F-YT-EXPIRY-DISPLAY-FAKE` cleanup should surface `cpp.paused_until` (and/or a live token probe) **instead of** the hardcoded 2031 expiry. Flag for that brief; do not build here.

## Unit B — one-time recovery of the 31 `failed` drafts (live-bucketed 2026-05-26)

Triage DML (prepared; separately D-01-gated; `apply_migration` only). Snapshot-first `DO`-block, bounded to the live-classified ids, hard-aborts on any `OTHER` bucket or any B1/B2 no-upload-guard failure (anti-double-publish):

- **Bucket 1 — 5 drafts: transient quota, clean recovery.** `429 Quota exceeded`, `approved`, all guard-pass. → reset `video_status='generated'`, clear `youtube_upload_error`/`youtube_retry_after`/`youtube_dead_reason`, set `youtube_upload_attempts=0`.
- **Bucket 2 — 17 drafts: token casualties, recover behind the no-upload guard.** `invalid_grant`, `approval_status='published'` (anomaly). **All 17 verified passing the guard** (`youtube_video_id IS NULL` AND no `m.post_publish` youtube row). **Resolved decision (PK 2026-05-26): INCLUDE the `approval_status` `published → approved` normalisation** — without it the publisher SELECT (which requires `approved`) would never re-select them. Constraint-safe (the CHECK allows `approved`). → reset `video_status='generated'`, `approval_status='approved'`, clear error/backoff/dead_reason, `youtube_upload_attempts=0`, record `approval_normalised_from='published'`. *(Any guard-failing draft, should one appear before apply, is left `failed` + `youtube_dead_reason='already_published_no_recovery'` — none in the current set.)*
- **Bucket 3 — 9 drafts: no channel connected, OUT OF SCOPE.** `No refresh token found` — never-connected channel (no YT `client_publish_profile`). → leave `video_status='failed'`, set `youtube_dead_reason='no_channel_connected'`, exclude. Onboarding is a separate first-time-OAuth task.

- **Snapshot first:** the `DO`-block classifies the live `failed` set into a temp table and bounds every UPDATE to those ids; **never** a blanket `failed → generated`. `RAISE NOTICE` the per-bucket counts (expected ~5/17/9; re-classifies live at apply so a new failure landing before apply is handled safely).

## Migration / deploy needs

- **Unit A — `youtube-publisher` v1.8.0 EF deploy.** Built + committed (`631fa93a`); **PK deploys manually** from `C:\Users\parve\Invegent-content-engine` (Windows MCP PowerShell times out on `supabase functions deploy`). No DDL.
- **Unit B — recovery DML** via Supabase MCP `apply_migration` (the only sanctioned DML path on `m.*`).
- **Order:** deploy Unit A first (so re-activated drafts hit the resilient publisher), then run Unit B. **A-then-B is required, not optional.**
- **Rollback:** Unit A = redeploy **v1.7.0** (the avatar baseline — NOT v1.6.0; keep a copy). Unit B = the reset is forward-only data movement; the pre-state snapshot makes a manual revert to `failed` possible.

## Validation plan

1. **Pre-snapshot (read-only):** the `failed` ids bucketed (5 / 17 / 9) with error strings + `approval_status`; for Bucket 2, the `youtube_video_id` + `m.post_publish`-exists flag per draft; `generated`/`pending` counts; NY/PP `cpp.paused_until` (null). **(DONE 2026-05-26.)**
2. **Classification check:** representative error strings → `invalid_grant`→`auth`, `quotaExceeded`/`429`→`quota`, `Failed to download`/`5xx`→`transient`, `unsupported`/`No video ID`→`terminal`.
3. **Post Unit A — transient path:** stage a transient failure → stays `generated`, `youtube_upload_attempts` increments, `youtube_retry_after` set, not re-selected until backoff elapses, publishes once the cause clears.
4. **Post Unit A — quota path:** a `429` → stays `generated`, `youtube_retry_after = now+6h`, attempts NOT incremented, never terminal.
5. **Post Unit A — auth path:** an `auth` failure → channel `pausedClients` skip (+ best-effort `cpp.paused_until`), draft not flipped to `failed`, other drafts for that channel skipped this run, resume after the hold + a good token.
6. **Post Unit A — terminal/cap:** a genuinely bad draft dies at the cap (or immediately for terminal class) with a `youtube_dead_reason`; no infinite retry.
7. **Post Unit B:** Bucket 1 (5) → `generated`, drain through v1.8.0. Bucket 2 (17) → `generated` + `approved`. Bucket 3 (9) → retain `failed` + `no_channel_connected`. No blanket reset; counts match the snapshot.
8. **Regression:** successful-publish path unchanged; effective publish cadence stays ≤2/tick.

## D-01 requirements

Per `docs/runtime/mcp_review_protocol.md` + ICE-PROC-001:

- **D-01 #1 — `plan_review`:** the v1.8.0 design + Unit B. **FIRED 2026-05-26 — review_id `056e0e33`; verdict partial/type-c (generic complexity/testing pushback; corrected_action = test edge cases + rollback, already covered by §Validation + §Rollback); escalate=true → PK approved the prepare+commit stage.**
- **D-01 #2 — `ef_deploy`:** the Unit A v1.8.0 deploy, at execution time.
- **D-01 #3 — `sql_destructive`:** the Unit B recovery DML, at execution time. P1–P5 pre-flight (Lesson #61); no DDL (§2), so the L33–L35 event-trigger survey does not apply.
- Explicit PK approval phrase before **each** production mutation. Both YT D-01 fires in v3.05/v3.06 returned partial/type-c echoes (L62) — handle per the Lesson #62 framework (satisfy the corrected action, then re-fire / escalate).

## Success criteria

- A transient/auth/quota failure no longer terminalises a draft: transient drafts retry under a cap; quota parks 6h uncounted; auth parks the channel and self-heals.
- A genuinely-bad draft dies at the cap with a `youtube_dead_reason` (no infinite retry — the YT analogue of IG's 734-attempt runaway is impossible by construction).
- The 31 `failed` drafts are correctly triaged per the live buckets: 5 quota recovered; 17 token casualties recovered (guard-passed + `approved`-normalised); 9 never-connected retained as `no_channel_connected`. No double-publish; no blanket reset.
- The successful-publish path and cadence are unchanged (regression passes).
- A future channel-wide token outage parks the backlog instead of silently freezing it.

## Stop condition

v1.8.0 EF code authored + committed (`631fa93a`); Unit B recovery SQL prepared. **Do not deploy / apply** — execution is gated on the D-01 chain (#2 ef_deploy, #3 sql_destructive) + PK approval in a separate, supervised step, A-then-B.

---

## Notes

- **Why mirror IG rather than invent:** IG v2.4.0 already paid for this lesson in production (the 734-attempt runaway and the 2207051 channel restriction). The transient-vs-terminal split, the attempt cap → terminal dead, and the channel-level pause-exempt-from-cap are a directly transferable shape. The only real translation cost is that YT is direct-read (no queue row, no lock RPC), so the attempt counter lives in `draft_format` jsonb and the pause is enforced inside the EF.
- **Why the live bucket changed Unit B:** the original recovery sketch assumed token casualties were `approved`. The live bucket showed the 17 real casualties are `published` (anomaly), all guard-passing, and that 9 (was 8) of the failed set belong to never-connected channels. Hence the no-upload guard + the `published→approved` normalisation on Bucket 2 and the onboarding-debt reclassification of Bucket 3. Re-verify against live before trusting a composition estimate (L-v3.05-a).
- **Systemic theme:** F-YT-FAILED-NO-RETRY, F-YT-EXPIRY-DISPLAY-FAKE, and the repo↔deployed IG drift are the same class of bug — a failure made invisible by a layer that lies. This brief makes YT failures *loud and bounded*; the expiry-display cleanup makes them *visible*. Recommend sequencing the two so detection lands alongside resilience.
