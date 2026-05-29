# Brief — YouTube insights-worker: read-back of status/statistics for ICE-published YouTube videos

**Created:** 2026-05-29 Sydney
**Author:** Claude Code (CCD), read-only repo investigation
**Executor (future):** TBD — CCD (function build) + PK (manual probe / EF deploy approval)
**Status:** **INVESTIGATION COMPLETE + Stage 0 spec AUTHORED + WCCH-HARDENED — NOT implemented.** No code, no deploy, no migration, no cron, no DB write, no YouTube API call has been made. Every stage below fires its own D-01 + PK approval before any production effect.
**WCCH review (2026-05-29, at `becb85e`):** "Approve with changes" — not blocked, but Stage 0 is NOT approved to run until amended. This revision applies all 7 required changes: (1) OAuth token-rotation hazard + containment (§4.3.0, R6); (2) Step 0 Option-A/B decision up front, no mid-probe pivot (§4.3.1, R7); (3) Option A credential-handling hard rules (§4.3.2); (4) Option A now requires a *written* PK approval phrase, not verbal (§5, §9); (5) sample hardening — two video ids/client, batched, probe every client incl. CFW (§4.3.4); (6) required capability-matrix fields incl. `scopes_on_token`, `quota_units_consumed`, `probe_run_at`, `app_oauth_status`, `probe_video_count`, 3-value verdict (§4.4); (7) Option B mandatory delete-after, probe not closed until removed (§4.3.3). Stage 1 remains blocked; no probe executed.
**Origin:** follow-on from the v3.20 youtube-publisher v1.11.0 Public-visibility fix (`supabase/functions/youtube-publisher/index.ts`). The open v3.20 runtime follow-up — authoritative post-publish `privacyStatus` verification — is satisfied durably by Stage 1 of this brief (see §7).
**Scope discipline (PK directive 2026-05-29):** Stage 0 (token/scope probe) + Stage 1 (minimal MVP) only. Typed schema columns, dashboard UI, thumbnails, playlists, captions, comments, and the YouTube Analytics API are explicitly **Later/Deferred** (§6).

---

## 1. Objective

Determine and then build the **smallest useful** YouTube read-back: pull basic per-video status + statistics (and channel-level stats where available) for ICE-published YouTube videos, using the **existing** Google/YouTube authorization, and store a latest-snapshot into the **existing** `m.post_performance` table. Produce a proof/dashboard-ready data foundation — **without** adding OAuth scopes, schema, or a dashboard in the MVP.

---

## 2. Repo-grounded findings

### 2.1 Auth / scope inventory
| Item | Finding | Source |
|---|---|---|
| Scopes requested | `https://www.googleapis.com/auth/youtube.upload` **+** `youtube.readonly` (`access_type=offline` + `prompt=consent`) | `app/api/youtube/auth/route.ts` — **separate dashboard repo, not content-engine**; recorded in `docs/runtime/sessions/2026-05-24-v3.05-youtube-oauth-production-restore.md:43` |
| CFW client | brief_041 specifies **only `youtube.upload`** for CFW | `docs/briefs/brief_041_cfw_platform_configuration.md:47` |
| Refresh-token storage | `c.client_channel.config.refresh_token`; fallback `c.client_publish_profile.credential_env_key` → env secret | `supabase/functions/youtube-publisher/index.ts:119-136` |
| Token→access exchange | already implemented as `refreshAccessToken()` (reusable pattern) | `youtube-publisher/index.ts:111-149` |

⚠️ **Decisive caveat:** `youtube.upload` **alone does not authorize `videos.list` / `channels.list`** (upload-only scope). Read-back requires `youtube.readonly` on the *granted* token. NY/PP appear to carry `readonly`; **CFW may be upload-only.** This is the single biggest unknown and is exactly what **Stage 0** resolves.

### 2.2 Where YouTube IDs live (all three confirmed)
- `m.post_publish.platform_post_id` where `platform='youtube'` — set on success (`youtube-publisher/index.ts:299`). ~61 rows (per v3.16 sync_state).
- `m.post_publish.response_payload.youtube_url` + `.privacy_status` (historically `'unlisted'`; `'public'` from v1.11.0).
- `m.post_draft.draft_format.youtube_video_id` (+ `youtube_url`, `youtube_published`).

### 2.3 Existing performance data model
- ✅ **`m.post_performance` EXISTS and is cross-platform.** `platform` column (FK `t.5.0_social_platform.platform_code`, default `'facebook'`); **upsert key `(platform_post_id, insights_period)`**; ~157 rows, **Facebook only**. Columns: `post_performance_id` (PK), `post_publish_id`, `client_id`, `platform`, `platform_post_id`, `reach`, `impressions`, `engaged_users`, `reactions`, `comments`, `shares`, `clicks`, `engagement_rate`, `collected_at`, `insights_period` (`'lifetime'`), `raw_payload` (jsonb), `created_at`, `updated_at`. **No `views`, no `privacy_status`, no channel-stat columns.** (Source: `supabase/migrations/20260430041924_audit_post_publish_observability_column_purposes.sql:76-97` + `insights-worker/index.ts:192-214`.)
- Existing worker `supabase/functions/insights-worker/index.ts` (**v14.1.0**) is **Facebook-only** (Graph API); it is the structural template (never-collected-first ordering, upsert pattern, token-source fallback).
- `insights-feedback` (`v1.0.0`) is **unrelated** (recalculates topic weights). Not a YouTube path.
- `m.post_format_performance_per_publish` — R5 format-tuning table, empty/unused (separate concern).
- `f.raw_metric_point` — reserved analytics layer with `entity_type` enum including `video`, currently **unwritten** (eventual richer-analytics home; Later/Deferred).

### 2.4 Quota
Default YouTube Data API quota = **10,000 units/day**. `videos.list` batches ≤50 ids at **1 unit/call**; `channels.list` = 1 unit. All ~61 videos = 2 calls (2 units) + ~3 channel calls = **≈5 units/day** (~0.05% of quota). Effectively free, with headroom for thousands of videos.

---

## 3. Stage map

| Stage | What | Schema? | Deploy? | Writes? | Gate |
|---|---|---|---|---|---|
| **Stage 0** | Token/scope probe — prove `videos.list`/`channels.list` work per client with stored creds | none | none (manual) **or** temp EF | **none** | manual: PK verbal; temp EF: `ef_deploy` D-01 |
| **Stage 1** | Minimal `youtube-insights-worker` MVP — reuse `m.post_performance`, latest snapshot, idempotent upsert, records authoritative `privacyStatus` | none (reuse table) | yes | runtime DML (upserts) | `ef_deploy` D-01; cron add = separate `sql_destructive` D-01 |
| **Later/Deferred** | typed columns (`views`/`privacy_status`/`upload_status`), `m.channel_performance`, dashboard UI, thumbnails, playlists, captions, comments, **YouTube Analytics API** | DDL (later) | — | — | each its own D-01 when/if promoted |

---

## 4. Stage 0 — token/scope probe spec (detailed)

### 4.1 Stage 0 objective
Prove whether **each live YouTube client token** can read YouTube Data API **status + statistics + snippet** using the **current stored credentials**, with **zero writes and zero mutations**. Output a per-client capability matrix that tells us exactly which clients are Stage-1-ready and which need re-consent.

### 4.2 Questions Stage 0 must answer
1. **Which clients/channels currently have YouTube published videos?**
   - `SELECT client_id, count(*), min(published_at), max(published_at) FROM m.post_publish WHERE platform='youtube' AND status='published' AND platform_post_id IS NOT NULL GROUP BY client_id;`
   - For each, pick one representative `platform_post_id` (most recent) as the probe video id.
2. **Which token source is used per client/channel?**
   - Primary: `c.client_channel.config.refresh_token` (where `platform='youtube'`).
   - Fallback: `c.client_publish_profile.credential_env_key` → env secret (when the inline refresh token is absent).
   - Report only the **source label** (`client_channel.config` / `credential_env_key:<KEYNAME>`) and **presence**, never the token value.
3. **For one existing video per client/channel, can the token call** `videos.list?part=status,statistics,snippet&id={videoId}`? (HTTP status + ok/fail.)
4. **Does it return** `status.privacyStatus`, `statistics.viewCount`, `statistics.likeCount`, `statistics.commentCount`, `snippet.channelId`? (present/absent per field.)
5. **Can channel stats be read** via `channels.list?part=statistics&id={channelId}` (channelId taken from the `videos.list` snippet)? Return `subscriberCount` / `viewCount` / `videoCount` present/absent.
6. **Which clients fail with 403 / insufficient scope?** (classify the error: `insufficientPermissions` / `forbidden` / quota / other.)
7. **Which clients require re-consent before Stage 1?** (= any client whose probe 403s on a readonly call.)

### 4.3 Exact proposed probe method

#### 4.3.0 ⚠️ OAuth token-rotation hazard (WCCH-required — read FIRST)
The probe's OAuth `refresh_token` grant exchange (`POST oauth2.googleapis.com/token`, `grant_type=refresh_token`) **could theoretically rotate the refresh token** — Google may return a **new** `refresh_token` in the response under some app configurations (notably when refresh-token rotation is enabled). **Risk:** if a new refresh token is issued by Google but the probe does **not** capture and persist it, Google may invalidate the old one, and **the live `youtube-publisher` credential could become stale** → publisher breakage on the next real upload. This is the most dangerous side effect of an otherwise read-only probe.

**Containment (mandatory, before any probe runs):**
1. **Confirm the Google OAuth app's posture is Production / non-rotating where it can be confirmed** (the v3.05 fix moved the app Testing→Production; Production-posture apps with `access_type=offline` typically return a refresh token only on first consent and do **not** rotate on every refresh). Record the confirmed status as `app_oauth_status` in the output.
2. **The probe MUST inspect the token-exchange response for a `refresh_token` field.** If the response contains **no** `refresh_token` (the expected, safe case), proceed. 
3. **If a NEW `refresh_token` IS returned, the probe MUST STOP immediately for that client** and either (a) the new token is captured and persisted safely into the same store the publisher reads (`c.client_channel.config.refresh_token` / the `credential_env_key` secret) under a separate explicitly-approved write step, or (b) abort that client's probe **before** the old token can be invalidated. **The probe must never discard a returned refresh token** — discarding it is what bricks the publisher. Mark such a client `ERROR_NEEDS_INVESTIGATION` and do not continue it.

> This hazard means Stage 0, while read-only on the YouTube *content* side, touches a live publisher credential. That is why Option A requires a **written** PK approval phrase (§5, §9), not merely verbal.

#### 4.3.1 Step 0 — resolve Option A vs Option B BEFORE the probe starts (WCCH-required)
**Decide the execution path up front. Do NOT start Option A and pivot to Option B mid-probe.**

> **Step 0 decision:** Determine whether the stored refresh tokens/secrets are **safely readable from the supervised/manual environment**:
> - Can the supervised environment read `c.client_channel.config.refresh_token` (DB) **and/or** the `credential_env_key` env secrets that the publisher uses?
> - **If YES → proceed with Option A** (supervised one-shot), fixed for the whole run.
> - **If NO → STOP and request Option B `ef_deploy` D-01.** Do not attempt Option A first.

The path chosen at Step 0 is **fixed for the entire probe**. A mid-probe pivot is prohibited (it risks partial reads under inconsistent credential handling).

#### 4.3.2 Option A (preferred) — supervised manual/scripted one-shot
A short read-only script (local Deno or a single supervised invocation) that, per client/channel:
1. reads the refresh token from its stored source (DB inline first, else env secret),
2. exchanges it for a short-lived access token via the existing `oauth2.googleapis.com/token` flow (same as `refreshAccessToken()`), **and applies the §4.3.0 rotation check to the response**,
3. issues a single batched **GET** `videos.list?part=status,statistics,snippet&id={id1,id2}` (see §4.3.4 sample hardening) and (if channelId obtained) **GET** `channels.list?part=statistics&id={channelId}`,
4. records only booleans/enums/counts + HTTP status + the §4.4 fields — **never** the token, never raw PII.

**Option A credential handling — HARD rules (WCCH-required):**
- Tokens held **in-memory only**, for the minimum duration of the exchange.
- **No token value printed** to stdout/stderr/logs.
- **No token value written to disk or any temp file.**
- **No token value placed on the shell command line / copied into shell history** (read from the store programmatically; never paste a token as an argument).
- **No token value returned in the probe output.**
- Output reports **only**: source label, presence/absence, and pass/fail status (plus the non-secret §4.4 fields).

#### 4.3.3 Option B (fallback) — temporary throwaway Edge Function `youtube-scope-probe`
Justified **only** if Step 0 determines secrets are reachable solely from the Supabase Edge runtime. It performs the identical read-only calls (incl. the §4.3.0 rotation check) inside the Edge runtime, returns the §4.4 capability matrix as JSON, writes nothing, and is **deleted immediately after the probe**. Because it is deployed, it is classified `ef_deploy` and **must stop for D-01 approval before deployment** (see §5).

**Option B delete-after hardening (WCCH-required, MANDATORY):** deletion of the temporary `youtube-scope-probe` function (`supabase functions delete youtube-scope-probe --project-ref mbkmaxqhsohbtwsqolns`) is a **mandatory post-step**, not optional. **The probe is NOT considered closed until the temporary function is confirmed removed** (verify via `supabase functions list` showing it absent / GET returning 404). A successful probe with the function still deployed is an **incomplete** probe.

#### 4.3.4 Sample hardening (WCCH-recommended)
- **Probe TWO existing published YouTube video IDs per client/channel where available:** (a) the most recent published video, (b) one fallback published video — so a single unlucky deleted/private video doesn't produce a false `NEEDS_RECONSENT`.
- Use **one batched `videos.list` call per client/channel** where possible (`id=id1,id2`) — 1 quota unit regardless.
- If only one video exists for a client, report `probe_video_count = 1`.
- **Probe EVERY client/channel with ≥1 YouTube published row**, including any expected-to-fail client such as **CFW** if present — the expected-failures are exactly the signal we want.

#### 4.3.5 Secrets, endpoints, and write-surface
**Secrets/tokens used:** YouTube refresh tokens (from `c.client_channel.config.refresh_token` or the `credential_env_key` env secret) + `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` for the token exchange. **Values are never logged, returned, or persisted — only source labels and presence** (per §4.3.2 hard rules).

**API endpoints called (READ-only):**
- `POST https://oauth2.googleapis.com/token` (refresh→access exchange; standard OAuth — **but see the §4.3.0 rotation hazard**)
- `GET https://www.googleapis.com/youtube/v3/videos?part=status,statistics,snippet&id={videoId(s)}`
- `GET https://www.googleapis.com/youtube/v3/channels?part=statistics&id={channelId}`

No `videos.update`, no `videos.insert`, no `videos.rate`, no playlist/caption/comment endpoints. **No write endpoint of any kind.** The only thing that could ever be written is a **rotated refresh token**, and that is governed by the §4.3.0 stop-and-capture rule.

### 4.4 Output Stage 0 reports (per client/channel)
A capability matrix (printed/returned only — **not written to any table**; never contains token values):

| Field | Example | Notes |
|---|---|---|
| client_id / client_name | `…/ NDIS-Yarns` | |
| youtube published count | `12` | from `m.post_publish` |
| probe video ids | `qp-ZGm8lNIo, u-xYWGg1qWI` | up to 2 (§4.3.4) |
| **probe_video_count** | `2` (or `1`) | WCCH-required |
| token source | `client_channel.config` / `credential_env_key:YT_NY_REFRESH` | label only, never value |
| token present | `true` | |
| **scopes_on_token** | `youtube.readonly youtube.upload` **or** `unknown/not_returned` | WCCH-required; from token-introspection if available, else `unknown/not_returned` |
| **app_oauth_status** | `production_confirmed` / `unknown` | WCCH-required (§4.3.0 containment 1) |
| refresh_token_rotated | `false` (expected) / `true→STOPPED` | §4.3.0 rotation check |
| videos.list HTTP | `200` | |
| privacyStatus | `public` | per probed video |
| viewCount / likeCount / commentCount | `134 / 5 / 0` | |
| channelId | `UC...` | |
| channels.list HTTP | `200` | |
| subscriberCount / viewCount / videoCount | `41 / 9.2k / 60` (or `hidden`) | |
| **quota_units_consumed** | `2` (observed/estimated) | WCCH-required |
| **probe_run_at** | `2026-05-29T…Z` | WCCH-required (ISO timestamp) |
| **verdict** | `STAGE1_READY` / `NEEDS_RECONSENT` / `ERROR_NEEDS_INVESTIGATION` | WCCH-required 3-value enum |

**Verdict semantics:** `STAGE1_READY` = `videos.list` returned 200 with the expected fields under current scope; `NEEDS_RECONSENT` = 403 / insufficient-scope (token is `youtube.upload`-only or readonly not granted) → re-consent required before Stage 1; `ERROR_NEEDS_INVESTIGATION` = anything else (token rotated and stopped per §4.3.0, network/5xx, malformed response, missing token, ambiguous result).

Plus a one-line summary: `N STAGE1_READY, M NEEDS_RECONSENT, K ERROR_NEEDS_INVESTIGATION; total quota_units_consumed ≈ Q; probe_run_at <ISO>.`

### 4.5 Stage 0 constraints (hard)
No DB writes · no schema changes · no cron changes · no deployed persistent worker · no YouTube mutation · no `videos.update` · no privacy change · no backfill · no dashboard/UI work · **read-only API calls only, after PK approval.**

---

## 5. D-01 classification

| Step | Classification | Notes |
|---|---|---|
| **Stage 0 — Option A (manual/scripted one-shot)** | **NOT `ef_deploy`** (no deploy, no DB/YouTube write) — **BUT requires PK's explicit *written* approval phrase, not merely verbal**, because it reads **production credentials** and performs **OAuth refresh exchanges** that carry the §4.3.0 token-rotation hazard. Token handling per §4.3.2 hard rules. | Preferred |
| **Stage 0 — Option B (temporary EF)** | **`ef_deploy` D-01** (stop for written approval before deploy) + **mandatory delete-after** (§4.3.3 — probe not closed until function confirmed removed) | Only if Step 0 determines secret access requires it |
| **Stage 1 — worker deploy** | **`ef_deploy` D-01** | Runtime DML upserts to `m.post_performance` are runtime worker behaviour (like the live FB insights-worker), not a migration — the deploy is the gated step. **No schema migration** (zero DDL for MVP). |
| **Stage 1 — add `cron.schedule`** | **separate `sql_destructive` D-01** | Per established cron precedent |
| **Later — typed columns / new table** | **`sql_destructive` D-01** | Only if/when promoted from Deferred |

---

## 6. Stage 1 — minimal MVP (design, NOT for build yet)

New standalone EF `supabase/functions/youtube-insights-worker/index.ts` (separate from the FB `insights-worker` because the APIs/token flows differ entirely):
- **Input:** `SELECT post_publish_id, client_id, platform_post_id FROM m.post_publish WHERE platform='youtube' AND status='published' AND platform_post_id IS NOT NULL`, never-collected-first ordering (mirror `insights-worker/index.ts:161-177`).
- **API:** `videos.list?part=snippet,status,statistics&id=<≤50 ids>` (batched, 1 unit/call) + `channels.list?part=statistics&id=<channelId>` once per channel.
- **Output (reuse `m.post_performance`, NO DDL):** `platform='youtube'`, `insights_period='lifetime'`; `impressions=viewCount`, `reactions=likeCount`, `comments=commentCount`, `engaged_users=likeCount+commentCount` (derived), `engagement_rate=(likes+comments)/views`, `reach/shares/clicks=NULL`; `raw_payload={ privacy_status, upload_status, view_count, like_count, comment_count, channel_id, channel_title, published_at, channel_stats:{subscriber_count,total_view_count,video_count}, version }`.
- **Idempotency:** existing `onConflict:'platform_post_id,insights_period'` upsert (latest snapshot; no duplicates).
- **Failure handling:** per-video try/catch; 403→scope/auth (skip client, surface clearly, no retry-storm); 404→video removed (note in raw_payload); 5xx/quota→transient.
- **Cron:** mirror insights-worker cadence (daily lifetime snapshot suffices); confirm live `cron.job` read-only at impl time; adding the entry is a separate `sql_destructive` gate.

### 6.1 Later / Deferred (explicitly out of MVP)
Typed columns (`views`, `privacy_status`, `upload_status`) · `m.channel_performance` table · dashboard/UI · thumbnails · playlists · captions · comments/community · **YouTube Analytics API** (demographics, retention, traffic sources) · Meta/FB/IG/LinkedIn insights. Each is its own future brief/gate; none are needed to read back status+statistics.

---

## 7. Relation to the open v3.20 visibility verification
The v3.20 follow-up requires authoritative proof = *YouTube Studio OR `videos.list?part=status` showing `status.privacyStatus == 'public'`.* **Stage 1 calls exactly `videos.list?part=status` and records `privacy_status` per video** → it satisfies and *durably closes* the v3.20 verification for every future video, automatically. v3.20 does **not** block on this worker (a single manual Studio check still closes it immediately); the worker just makes it self-verifying ongoing. **Stage 0** can also opportunistically confirm the current `privacyStatus` of a recently-published video as a read-only spot-check.

---

## 8. Risks & rollback/no-op statement

| # | Risk | Mitigation |
|---|---|---|
| R1 | Per-client `readonly` not actually granted (esp. CFW upload-only) → `videos.list` 403 | This is precisely what Stage 0 detects; affected clients flagged `NEEDS_RECONSENT` before any Stage 1 build |
| R2 | YouTube "views" ≠ FB "impressions/reach" semantics | Authoritative raw fields in `raw_payload`; column reuse documented as approximation |
| R3 | `subscriberCount` may be hidden by channel settings | Tolerate null; record `hidden` in raw_payload |
| R4 | Reading refresh tokens for the probe | Presence/source-label only; never log/return/persist token values (privacy contract, same discipline as cc-0020 Unit A); §4.3.2 hard rules (in-memory only, no disk/shell-history/output) |
| R5 | Probe via temp EF leaves a deployed surface | **Mandatory** delete-after (§4.3.3); classified `ef_deploy`; stops for written D-01 first; **probe not closed until function confirmed removed** |
| **R6** | **OAuth refresh exchange could rotate the refresh token; a returned-but-discarded new token would invalidate the live publisher credential → publisher breakage** | **§4.3.0 containment: confirm Production/non-rotating posture; inspect every token-exchange response for a `refresh_token`; if present, STOP that client and capture+persist under a separate approved write step or abort before invalidation — never discard a returned refresh token.** This is why Option A needs a written approval phrase (§5, §9). |
| R7 | Mid-probe pivot Option A↔B under inconsistent credential handling | §4.3.1 Step 0 fixes the path up front; pivot prohibited |
| OQ1 | Live `cron.job` for insights-worker to mirror? | Confirm read-only at Stage 1 impl (not in repo migrations — likely created out-of-band) |

**Rollback / no-op statement:** Stage 0 performs **only HTTP GETs** against the YouTube Data API plus the standard OAuth refresh exchange. It **writes nothing** to the database, changes **no** schema/cron/secret, and **mutates nothing** on YouTube content. **The one residual write-risk is a rotated refresh token** (R6 / §4.3.0) — contained by the stop-and-capture rule so the live publisher credential is never silently invalidated. Option A persists no artifact (nothing to roll back). Option B's only artifact is the temporary function, whose removal (`supabase functions delete youtube-scope-probe`) is a **mandatory close-step**, restoring the prior state byte-for-byte. There is therefore **no rollback to perform** beyond (a) the mandatory temp-function deletion (Option B only) and (b) persisting any rotated refresh token if R6 ever fires.

---

## 9. Approval gate wording for PK

> **Prerequisite — Step 0 (§4.3.1):** CCD first determines whether stored refresh tokens/secrets are safely readable from the supervised environment. The path chosen is fixed for the whole probe (no mid-probe pivot).
>
> **Stage 0 (probe) requires PK's explicit WRITTEN approval phrase** (not merely verbal) for **either** path, because the probe reads production credentials and performs OAuth refresh exchanges carrying the §4.3.0 token-rotation hazard:
> - **If Step 0 → Option A (manual/scripted one-shot):** required written phrase — *"PK approves running the Stage 0 YouTube scope probe (Option A) — read-only `videos.list`/`channels.list` GETs against existing video ids, OAuth refresh-exchange with the §4.3.0 rotation stop-and-capture rule enforced, no DB/schema/cron/YouTube writes, token values never printed or persisted."*
> - **If Step 0 → Option B (temporary Edge Function):** this is additionally an **`ef_deploy`** — CCD will **stop and request a separate `ef_deploy` D-01 + the exact written approval phrase** before deploying `youtube-scope-probe`, and **deletion of the temp function is a mandatory close-step** (the probe is not closed until the function is confirmed removed).
>
> **Stage 1 (worker) is NOT approved by the above** — it requires its own `ef_deploy` D-01 (+ a separate `sql_destructive` D-01 if a cron entry is added), after Stage 0 confirms which clients are `STAGE1_READY`.

---

## Hard stop (current state)
Investigation + this brief + the WCCH-hardened Stage 0 spec are complete. **The probe has NOT been run; no YouTube API call, no probe-function deploy, no DB/schema/cron mutation of any kind has occurred.** Next action = PK's **written** Stage 0 approval phrase (§9) after Step 0 fixes the Option-A/B path. Stage 1 worker build remains blocked until Stage 0 reports per-client `STAGE1_READY`.
