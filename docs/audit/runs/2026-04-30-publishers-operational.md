# Operational Audit Run — 2026-04-30 · Publishers (YouTube + Instagram)

**Trigger:** PK request 2026-04-30 evening Sydney — "audit why YouTube and Instagram aren't working"  
**Scope:** Operational (publisher-side), not Data Auditor scope. Filed here for traceability but NOT under any formal audit role yet (Operations Auditor not built per D181 standing rule).  
**Mode:** Manual investigation by chat session via Supabase MCP.  
**Snapshot reference:** `docs/audit/snapshots/2026-04-30.md` flagged the symptoms in Sections 6, 7, 11; this run drilled into causes.

> **Corrigendum 2026-04-30 late evening Sydney:** F-PUB-001 framing was wrong on first pass and is corrected below. ChatGPT cross-check halted a production migration that would have been useless. Real root cause is YouTube OAuth refresh-token expiry, not a missing trigger entry. The trigger exclusion is architecturally correct because `youtube-publisher` reads from `m.post_draft` directly, not from `m.post_publish_queue`. See F-PUB-001 corrigendum section.

---

## Symptoms (from snapshot)

- Section 7: 19 YouTube slots filled (NDIS-Yarns 5, Property Pulse 14) + 32 Instagram slots filled across 4 clients in last 14 days.
- Section 11: 14-day publish counts — Facebook 42, LinkedIn 93, Instagram 22 published + 1 failed, **YouTube absent entirely**.
- Section 6: `instagram-publisher-every-15m` (jobid 53) is `active=false`. Three legacy `seed-and-enqueue-*` jobs all `active=false` (jobid 11/64/65).

---

## F-PUB-001  ·  HIGH  ·  open  ·  YouTube OAuth refresh tokens expired/revoked

**Area:** Publisher pipeline / OAuth credentials  
**Object:** YouTube refresh tokens stored at `c.client_channel.config->>'refresh_token'` and/or env vars named by `c.client_publish_profile.credential_env_key`  
**Severity rationale:** entire YouTube publishing path silently broken since 11 April 2026; AI synthesis + video render are running on stranded YT slots, but every upload attempt fails at OAuth token refresh.

### ⚠ Original framing (wrong) — corrected below

First pass said the trigger function `m.enqueue_publish_from_ai_job_v1` excludes YouTube from its platform whitelist (true) and that adding `'youtube'` to the IN list would fix the issue (**false**). ChatGPT cross-check on the audit halted the proposed migration before it landed. Verification via the EF source proved the trigger exclusion is **correct architecture**, not a gap.

### Corrected diagnosis

`youtube-publisher` (Edge Function `supabase/functions/youtube-publisher/index.ts` v1.5.0) does **not** read from `m.post_publish_queue`. It reads directly from `m.post_draft` filtered by:

- `video_status = 'generated'`
- `draft_format->youtube_video_id IS NULL`
- `video_url IS NOT NULL`
- `recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice')`
- LIMIT 2 per run

The trigger exclusion is consistent with the R6 implementation spec which explicitly scoped R6 to FB/IG/LI and said "No YouTube in R6 v1." YouTube has its own dedicated path: `m.fill_pending_slots` produces YT slots → `slot_fill_synthesis_v1` ai_job runs → `video-worker` / `heygen-worker` render the video and set `video_status='generated'` + `video_url` → `youtube-publisher` picks up directly from `post_draft`. Adding `'youtube'` to the trigger whitelist would create queue rows that nothing consumes.

The real failure point is at the OAuth token refresh step in `youtube-publisher`. Distinct error patterns from `m.post_draft.draft_format->>'youtube_upload_error'` over the last 21 days:

| Error | Occurrences | Distinct clients | Earliest | Latest |
|---|---|---|---|---|
| `Token refresh failed 400: invalid_grant: Bad Request` | 12 | 2 | 24 Apr 10:15 UTC | 30 Apr 00:45 UTC |
| `Token refresh failed 400: Token has been expired or revoked` | 5 | 2 | **11 Apr 05:15 UTC** | 30 Apr 00:45 UTC |
| `No refresh token found for client 93494a09 (Invegent)` | 1 | 1 | 27 Apr 07:15 UTC | 27 Apr 07:15 UTC |

The two NDIS-Yarns + Property Pulse refresh tokens have been expired/revoked since at least 11 April. Invegent has never had a refresh token configured.

Draft state confirms the breakage:

- 18 drafts in `video_status='failed'` AND `with_video_url=true` AND `youtube_upload_error` populated — render succeeded, YT upload failed.
- 16 drafts in `video_status='pending'` AND no `video_url` — render not done yet (or in flight).
- 0 drafts with `draft_format->youtube_video_id` populated in the last 21 days.

Meaning: zero successful YouTube uploads in 21 days, despite the publisher cron firing 48/48 in last 24h.

### Evidence

- youtube-publisher source: `supabase/functions/youtube-publisher/index.ts` v1.5.0 — reads `m.post_draft` directly, never queries `m.post_publish_queue`.
- Per-error-pattern counts on `m.post_draft.draft_format->>'youtube_upload_error'` (table above).
- Trigger function `m.enqueue_publish_from_ai_job_v1` confirmed via `pg_proc` — excludes `'youtube'` from whitelist intentionally.
- Refresh-token resolution order in EF source: (1) `c.client_channel.config->>'refresh_token'` (2) env var named by `c.client_publish_profile.credential_env_key`. Both currently absent or expired for the 3 YT clients.
- `youtube-publisher-every-30min` (jobid 34) cron runs successfully because EF returns 200 even when individual draft uploads fail (failure goes into `m.post_draft.draft_format->>'youtube_upload_error'`, not into `cron.job_run_details`).
- Spec evidence: R6 implementation default answer "No YouTube in R6 v1." + ChatGPT cross-check 2026-04-30 evening that pulled this evidence.

### Recommended action

**This is a PK action, not a chat / migration action.** PK reconnects YouTube OAuth via the dashboard for each affected client:

- NDIS-Yarns (`fb98a472`) — refresh token expired/revoked, needs reconnect
- Property Pulse (`4036a6b5`) — refresh token expired/revoked, needs reconnect
- Invegent (`93494a09`) — needs first-time YT OAuth setup

Dashboard path per the EF prose: "Connect via dashboard (Clients → Connect → YouTube)."

Verification post-reconnect: trigger one `youtube-publisher` invocation manually OR wait for the 30-min cron tick. If reconnect succeeded, the next cron firing should produce a successful upload + `m.post_publish` audit row + `draft_format->>youtube_video_id` populated on the published draft.

### Resolution

_(open — captured in T06 of action_list as a PK dashboard action; not a migration)_

---

## F-PUB-002  ·  MEDIUM  ·  open  ·  Instagram publisher disabled in response to Meta anti-spam block on Property Pulse

**Area:** Publisher pipeline  
**Object:** `cron.job` jobid 53 `instagram-publisher-every-15m` + per-client toggle on `c.client_publish_profile.publish_enabled`  
**Severity rationale:** known to operator (cron is deliberately off). Backlog growing daily but not bleeding cost in the same way YT was.

### Issue

The Instagram publisher cron has been disabled (`active=false`) since 2026-04-25 ~08:15 UTC. Its 796th run that day attempted to publish a Property Pulse IG post and received Meta API error:

```
403: {
  "message": "Application request limit reached",
  "type": "OAuthException",
  "is_transient": false,
  "code": 4,
  "error_subcode": 2207051,
  "error_user_title": "Action is blocked",
  "error_user_msg": "We restrict certain activity to protect our commun..."
}
```

`error_subcode 2207051` is Meta's per-IG-account anti-automation flag. `is_transient=false` means Meta classifies this as not auto-recoverable.

Since the cron was disabled, **92 Instagram queue items have accumulated across 4 clients**:

| Client | IG queued |
|---|---|
| Property Pulse | 53 |
| NDIS-Yarns | 24 |
| Care For Welfare | 10 |
| Invegent | 5 |
| **Total** | **92** |

### Evidence

- `cron.job` row for jobid 53: `active=false`. Last run 2026-04-25 08:15 UTC.
- `m.post_publish` row for the failed IG attempt: client=Property Pulse, status=`failed`, full error JSON above.
- `m.post_publish_queue` IG `queued` rows by client: PP 53, NDIS 24, CFW 10, Invegent 5.
- **Facebook unaffected:** 42 FB posts published 2026-04-18 through 2026-04-30 06:10, zero `2207051` / spam errors. Block is per-IG-account, not per-Meta-app.
- IG publisher EF source: `supabase/functions/instagram-publisher/index.ts` v2.0.0. Confirms it honors `profile.publish_enabled === false` (queue row marked `'skipped'` with `last_error='publish_disabled'`). Does NOT honor `paused_until` / `paused_at` columns — those are documentation-only at the EF layer.
- Current state of all 4 IG profiles: all have `publish_enabled=true`. Property Pulse is NOT explicitly disabled — if cron were re-enabled now, PP would immediately be picked up.

### Recommended action — explicit sequence

This is the corrected sequence per ChatGPT's caveat ("don't re-enable global cron unless PP is excluded first"):

1. **First**: `UPDATE c.client_publish_profile SET publish_enabled=false, paused_reason='meta_subcode_2207051_block_25_apr', paused_at=now() WHERE platform='instagram' AND client_id=<PP client_id>`. This is a single-row data update, not a migration. PK or chat can apply.
2. **Verify**: re-query the 4 IG profiles — only PP should show `publish_enabled=false`. The other three remain `true`.
3. **Confirm publisher behavior**: optionally, manually invoke `instagram-publisher` once with `dry_run=true` and the PP queue still containing rows. The EF should return `status='skipped', reason='publish_disabled'` for PP rows.
4. **Re-enable cron**: `UPDATE cron.job SET active=true WHERE jobid=53` (or via Supabase dashboard). Cron resumes every 15 min.
5. **Monitor 30-60 min** for the 39 NDIS+CFW+Invegent queued rows to start clearing. NDIS-Yarns has the largest cap (`max_queued_per_platform=6`) so it'll throttle naturally.
6. **Schedule PP recovery via T05** (Meta dev support contact). When PK contacts Meta dev support for business verification, also raise the PP IG `subcode 2207051` block. Decisions on PP IG (manual unblock, lower cadence, or wait it out) come back from that conversation.

### Resolution

_(open — captured in T07 of action_list with explicit sequencing per ChatGPT cross-check)_

---

## F-PUB-003  ·  LOW  ·  observation  ·  YouTube AI synthesis + video render cost has been sunk while OAuth was broken

**Area:** Cost / hidden waste  
**Object:** 18 drafts in `video_status='failed'` with `youtube_upload_error` populated; 16 drafts in `video_status='pending'`  
**Severity rationale:** observation, not action item. Cost impact unquantified. 

### Issue

With F-PUB-001 active since 11 April, YouTube slots have been filling normally and triggering `slot_fill_synthesis_v1` ai_jobs. 18 drafts had video render succeed (HeyGen + video-worker produced `video_url`) but every YT upload failed at OAuth token refresh.

That synthesis incurred AI generation cost for each draft (script + metadata + HeyGen video render). 16 more drafts are sitting in `video_status='pending'` with no `video_url` yet — either render hasn't run or render itself is bottlenecked.

### Evidence

- 18 drafts `video_status='failed'` with `youtube_upload_error` populated and `video_url` set — render succeeded, upload failed. (Cost: AI synthesis + HeyGen render.)
- 16 drafts `video_status='pending'` with no `video_url` — render not started or not finished. (Cost: AI synthesis only so far; render cost not yet incurred.)
- 0 successful YT uploads in last 21 days.

### Recommended action

**Updated trigger after F-PUB-001 corrigendum:** captured as B21 in action_list. After PK reconnects YT OAuth AND a successful upload completes (verified by `draft_format->>youtube_video_id` populated and `m.post_publish` row written), audit:

- Whether the 18 already-rendered drafts can simply be retried by `youtube-publisher` (since EF resets `video_status` to `'failed'` on upload failure, but render artifacts still exist). The EF re-fetches by `video_status='generated'` so a one-shot reset of `video_status='failed'` → `'generated'` for these 18 drafts would let the publisher retry them on the next cron tick.
- Cost estimate for the 18 already-rendered + already-attempted drafts to bound the sunk cost.
- Whether the 16 `pending` drafts should be allowed to render naturally OR pre-emptively cancelled while OAuth is being fixed (to prevent further rendering cost on currently-unpublishable items).

### Resolution

_(open — informational; gated on F-PUB-001 OAuth reconnect + verified successful upload)_

---

## Cross-check value note (added in corrigendum)

ChatGPT's cross-check on the first pass of this audit caught a wrong production migration before it landed. Specifically, ChatGPT pulled the R6 implementation spec evidence ("No YouTube in R6 v1") that chat had access to but didn't surface, and proposed an architecture pre-check before the trigger DDL. The pre-check via the EF source then proved the trigger exclusion was intentional and the correct architecture — making the trigger fix a wrong call.

This is a real-world data point for D-01 / D185 (red-team review v1 ratification) and worth capturing as a Lesson candidate (#43 below) regardless of whether the formal red-team rule is adopted.

---

## Out-of-scope notes (for completeness)

- **Three legacy `seed-and-enqueue-*` crons (jobid 11 FB, 64 IG, 65 LinkedIn) are inactive.** All show `ERROR: canceling statement due to statement timeout` from their last attempted run. These are LEGACY paths from the pre-slot-driven era (per D170+). Their inactivity is correct — the slot-driven trigger `m.enqueue_publish_from_ai_job_v1` replaced them for FB/IG/LI; YouTube was always on a separate path (see F-PUB-001 corrigendum). The timeout errors are residual evidence of the build burst that exceeded their query budget; not relevant to current operations.

- **Tokens shown as 2099-12-31 in snapshot Section 16** for FB+IG across all 4 clients are placeholder "never-tracked" sentinels in `token_expires_at`, not real expiry. FB is publishing 42 posts in 14d unaffected, so token state is functional even with the placeholder. Out-of-scope for this audit (Security Auditor when role exists). Note that the YT `token_expires_at` (2031-04-15 / 2031-04-01 in snapshot) is similarly unreliable — the actual auth state is captured in OAuth refresh-token validity (per F-PUB-001), not in `token_expires_at`.

- **`enqueue-publish-queue-every-5m` (jobid 48)** showed an `ON CONFLICT specification` error in `last_error` but its 24h record is 288/288 succeeded. That error is historical (pre-window) and not relevant to current operations.

---

## Closure plan (corrected)

- F-PUB-001: PK reconnects OAuth via dashboard for NDIS-Yarns + PP + Invegent YT. T06 captures. Verify via successful upload + `m.post_publish` audit row.
- F-PUB-002: explicit sequence per the Recommended action above. T07 captures with the 6-step ordered plan.
- F-PUB-003: gated on F-PUB-001 reconnect + verified upload. B21 in backlog.

## Lesson candidates raised (for next forward-discipline refinement)

- **Lesson #43 (candidate)** — Always verify the EF source-of-truth before assuming pipeline architecture. The first pass of this audit assumed YouTube went through the same `slot → ai_job → trigger → queue → publisher` path as FB/IG/LI; reading `youtube-publisher` source proved it goes `slot → ai_job → video-worker/heygen-worker → post_draft.video_url → youtube-publisher` directly. Source: F-PUB-001 corrigendum.
- **Lesson #44 (candidate)** — When auditing publisher behavior, distinguish between cron-level success (returned 200) and operation-level success (actually published). The IG cron showed 796/796 succeeded leading up to the disable, but inside those runs were progressively-failing IG publish attempts. Cron-level health alone is not sufficient signal. Source: F-PUB-002 evidence.
- **Lesson #45 (candidate)** — When an external red-team reviewer (ChatGPT in this case) suggests a pre-check before production DDL, treat the pre-check as mandatory rather than optional. Source: F-PUB-001 corrigendum (cross-check halted a wrong migration).

All three captured for promotion review. Promote to canonical Lessons when a second incident hits the same pattern.
