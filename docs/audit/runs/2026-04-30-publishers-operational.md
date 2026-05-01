# Operational Audit Run — 2026-04-30 · Publishers (YouTube + Instagram)

**Trigger:** PK request 2026-04-30 evening Sydney — "audit why YouTube and Instagram aren't working"  
**Scope:** Operational (publisher-side), not Data Auditor scope. Filed here for traceability but NOT under any formal audit role yet (Operations Auditor not built per D181 standing rule).  
**Mode:** Manual investigation by chat session via Supabase MCP.  
**Snapshot reference:** `docs/audit/snapshots/2026-04-30.md` flagged the symptoms in Sections 6, 7, 11; this run drilled into causes.

> **Corrigenda 2026-04-30 → 2026-05-01:**
> - F-PUB-001 framing was wrong on first pass and is corrected below. ChatGPT cross-check halted a production migration that would have been useless. Real root cause is YouTube OAuth refresh-token expiry, not a missing trigger entry. The trigger exclusion is architecturally correct because `youtube-publisher` reads from `m.post_draft` directly, not from `m.post_publish_queue`. See F-PUB-001 corrigendum section.
> - **F-PUB-002 corrigendum (1 May 00:19 UTC)**: T07 step 4 was attempted via `cron.alter_job(53, true)` and produced two cron ticks. Both ticks fired CFW + NDIS-Yarns IG attempts — and **NDIS-Yarns IG also got flagged with subcode 2207051**. Cron rolled back to `active=false` at 00:19 UTC. NDIS-Yarns IG locked at `publish_enabled=false`. Original T07 step model ("only PP is flagged") was wrong; the actual surface area is multiple IG accounts. See F-PUB-002 corrigendum section.
> - **F-PUB-004 (NEW)**: auto-approver starvation — investigation post-T07 step 4 rollback found that the auto-approver fetches the same 30 highest-scored `needs_review` drafts every cycle and rejects them all (body length / blocked keywords), never reaching IG drafts that would pass. Last successful approval for IG/LinkedIn was 25 Apr 14:46 UTC. FB unaffected (different state-flow).
> - **F-PUB-005 (NEW)**: trigger doesn't gate on approval. `m.enqueue_publish_from_ai_job_v1` pushes ai_job-succeeded → publish queue regardless of `m.post_draft.approval_status`. The publisher EF then catches unapproved drafts at its pre-flight gate. Design coupling problem.

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

## F-PUB-002  ·  MEDIUM  ·  open (corrigendum 1 May 00:19 UTC)  ·  Multiple IG accounts blocked + cron disabled

**Area:** Publisher pipeline  
**Object:** `cron.job` jobid 53 `instagram-publisher-every-15m` + per-client toggles on `c.client_publish_profile.publish_enabled`  
**Severity rationale:** known to operator (cron is deliberately off). Backlog growing daily but not bleeding cost in the same way YT was.

### ⚠ Corrigendum 2026-05-01 00:19 UTC — original "only PP" model was wrong

First pass framed this as a Property-Pulse-only problem. T07 step 4 was attempted at 2026-04-30 23:?? UTC via `cron.alter_job(53, true)` after locking PP IG with `publish_enabled=false`. The cron fired twice (00:00 + 00:15 UTC) before chat disabled it again at 00:19 UTC. Result of those 4 attempts (2 rows per tick × 2 ticks):

- **CFW × 2 attempts**: both failed at the publisher's pre-flight gate with `not_approved:needs_review`. Did NOT reach Meta API.
- **NDIS-Yarns × 2 attempts**: both reached Meta API.
  - 00:00 UTC: subcode 2207027 "Media ID is not available" (Meta refused to publish a freshly-created container — silent flag indicator)
  - 00:15 UTC: subcode 2207051 "Action is blocked" (explicit anti-spam flag, same as PP got 25 Apr)

**NDIS-Yarns IG is now also flagged.** Locked at 00:19 UTC via:

```sql
UPDATE c.client_publish_profile
SET publish_enabled = false,
    paused_reason = 'meta_subcode_2207051_block_2026-05-01_ndis_yarns_ig_anti_spam',
    paused_at = now()
WHERE platform = 'instagram'
  AND client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'
  AND publish_enabled = true;
```

The original PP block (25 Apr 08:15 UTC) was likely the LAST attempted IG publish in a long string, not the start of the problem. Combined with F-PUB-004 (auto-approver starvation), the IG pipeline has been silently failing in multiple ways for the entire 25 Apr → 1 May window.

The CFW × 2 failures revealed F-PUB-005 (trigger doesn't gate on approval) — see that finding.

### Issue (original)

The Instagram publisher cron has been disabled (`active=false`) since 2026-04-25 ~08:15 UTC. Its 796th run that day attempted to publish a Property Pulse IG post and received Meta API error:

```
403: {
  "message": "Application request limit reached",
  "type": "OAuthException",
  "is_transient": false,
  "code": 4,
  "error_subcode": 2207051,
  "error_user_title": "Action is blocked"
}
```

`error_subcode 2207051` is Meta's per-IG-account anti-automation flag. `is_transient=false` means Meta classifies this as not auto-recoverable.

### Updated state at 1 May 00:19 UTC

| Client | publish_enabled | paused_reason | IG queued |
|---|---|---|---|
| Property Pulse | **false** | meta_subcode_2207051_block_25_apr_pp_ig_anti_spam (12:02 UTC 30 Apr) | 53 |
| NDIS-Yarns | **false** | meta_subcode_2207051_block_2026-05-01_ndis_yarns_ig_anti_spam (00:19 UTC 1 May) | 24 |
| Care For Welfare | true | (none) | 10 (all `not_approved:needs_review`) |
| Invegent | true | (none) | 5 (all `not_approved:needs_review`) |

### Evidence

- `cron.job` row for jobid 53: `active=false`. Last cron run 2026-05-01 00:15:00 UTC.
- 4 failures captured tonight: 2 in `m.post_publish` (NDIS Meta API errors); 2 in `m.post_publish_queue.last_error` (CFW `not_approved:needs_review`).
- IG publisher EF source: `supabase/functions/instagram-publisher/index.ts` v2.0.0. Confirms it honors `profile.publish_enabled === false` (queue row marked `'skipped'` with `last_error='publish_disabled'`). Does NOT honor `paused_until` / `paused_at` columns — those are documentation-only at the EF layer.

### Recommended action — corrected for new state

All four IG accounts now have a different state:

1. **Property Pulse + NDIS-Yarns**: Both blocked by Meta. Recovery requires Meta dev support (T05) — single conversation can cover both. Until then, both stay `publish_enabled=false`.
2. **Care For Welfare + Invegent**: NOT blocked by Meta (cron never reached them). But their queue rows reference unapproved drafts (F-PUB-005) AND new drafts can't auto-approve (F-PUB-004). Re-enabling the cron without first fixing the auto-approver will produce more `not_approved:needs_review` failures, not publishes.

**Do not re-enable the cron until:** (a) F-PUB-004 auto-approver patch landed AND (b) at least one CFW or Invegent IG draft observed reaching `approved` status. THEN one controlled tick with `?limit=1`.

### Resolution

_(open — captured in T07 of action_list with corrected sequencing per ChatGPT cross-check + T07 step 4 rollback note)_

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

## F-PUB-004  ·  HIGH  ·  open  ·  Auto-approver starvation: 0 approvals across IG + LinkedIn since 25 Apr 14:46 UTC

**Area:** Approval pipeline / auto-approver EF behaviour  
**Object:** `auto-approver-sweep` cron (jobid 58, every 10 min) + `m.auto_approver_fetch_drafts(p_limit)` SECURITY DEFINER function + auto-approver EF v1.5.0  
**Severity rationale:** ICE has approved zero IG drafts and zero LinkedIn drafts since 25 Apr 14:46 UTC despite the cron returning 200 OK on every run. This is the largest production breakage discovered tonight — and it has been silently in effect for 5+ days. **Lesson #46 in action**: cron health (200 OK every 10 min) hides the actual business outcome (zero approvals).

### Issue

The auto-approver Edge Function returns 200 with `processed: 30, approved: 0, skipped_needs_human_review: 30` on every run. Investigated 30 Apr 12:30 UTC → 1 May 00:30 UTC.

Mechanism:

1. `auto_approver_fetch_drafts(30)` selects the top 30 drafts in `needs_review` ordered by `digest_item.final_score DESC, post_draft.created_at ASC`.
2. The score-DESC ordering keeps picking the same 12.0-tier drafts every cycle:
   - 17 Apr Facebook legacy stragglers (NDIS-Yarns + PP, mostly oversized or containing the blocked keyword "restrictive practice")
   - 25 Apr LinkedIn drafts (also oversized — NDIS-Yarns LinkedIn averages 1809 chars and the cap is 1800; PP LinkedIn averages 1829 chars and the cap is 2000).
3. Auto-approver EF v1.5.0 evaluates each draft against gates: `auto_approve_enabled`, `not_rejected`, `source_score`, `body_length`, `sensitive_keywords`. The same 30 drafts fail the same gates every cycle.
4. No reject-cooldown / terminal state — drafts return to `needs_review` after each skip, re-entering the top 30 next cycle.
5. Lower-scored IG drafts (where viable content lives — 600-1000 chars, no blocked keywords) never get fetched.

### Evidence

- `m.post_draft` aggregates by `(platform, approval_status)` 14d: FB 0 in `approved` / 74 in `published`; **IG 79 in `approved` / 0 in `published`**; **LinkedIn 64 in `approved` / 0 in `published`**.
- Latest `approved` timestamps: FB N/A (skips state), IG **2026-04-25 14:46 UTC**, LinkedIn **2026-04-25 14:16 UTC**.
- Auto-approver EF response captured 1 May 00:30 UTC: `processed: 30, approved: 0, skipped_needs_human_review: 30`. All 30 fail with `Too long: ... (max 1800/2000)` or `Blocked keyword: "restrictive practice"`.
- `m.auto_approver_fetch_drafts(30)` re-run live: returns 13 NDIS FB + 12 NDIS LinkedIn + 1 PP FB + 4 PP LinkedIn = 30 rows, all score-12.0, all oversized for their per-client cap.
- New (last 7d) IG drafts in `needs_review`: 116 NDIS / 59 PP / 11 CFW / 8 Invegent — all under 1200 chars (would pass auto-approver IF fetched).
- New (last 7d) LinkedIn drafts in `needs_review`: 78 of 125 NDIS LinkedIn over 1800; 34 of 60 PP LinkedIn over 1800. Synthesis layer routinely produces LinkedIn drafts above the per-client cap.
- Body length cap is **per-client** (NDIS 1800, PP 2000), not per-platform. Discovered via parsed auto-approver rejection messages.
- `auto-approver-sweep` cron (jobid 58, schedule `*/10 * * * *`): 144/144 succeeded in last 24h. Last run 1 May 00:30 UTC.

### Why it broke on 25 Apr 14:46

Not a code change. Not an explicit trigger. The auto-approver was working until then because lower-scored drafts (some IG) were getting through. Once the legacy-FB and oversized-LinkedIn 12.0-tier rows reached >30 in `needs_review`, the top-30 fetch became 100% rejection and the LIMIT 30 budget was permanently consumed by reject-and-retry.

This is exactly the failure mode O-03 (business-outcome monitors) and S10 standing check were designed to catch. They were captured tonight and would have surfaced this 5 days ago.

### LinkedIn pipeline still partially alive — important

Despite zero new LinkedIn approvals since 25 Apr 14:16, 3 LinkedIn posts published in the last 24h (per S10 baseline at 1 May 00:30 UTC). These came from the 64 LinkedIn `approved` drafts already in queue from before the starvation started. The queue is being slowly drained but no replenishment — LinkedIn pipeline will dry up eventually if F-PUB-004 isn't fixed.

### Recommended action

Two coupled fixes, both in the auto-approver EF (TypeScript, `supabase/functions/auto-approver/index.ts`):

1. **Stratify fetch by (client, platform)** — replace the score-DESC ordering with a per-bucket round-robin so each (client, platform) combination gets a fair share of the 30-slot budget. Even 3 slots per bucket × 10 active buckets prevents single-bucket starvation.
2. **Add reject-cooldown / terminal state** — once the auto-approver skips a draft, transition it to `'rejected'` (with original reason in a separate column) instead of leaving it in `'needs_review'`. Drafts that hit `'rejected'` don't re-enter top-30 next cycle. Operator can manually override back to `'needs_review'` if they review and approve.

Upstream consideration:
- **Tighten ai-worker prompt** to enforce per-client body length cap before generation, OR raise the cap in the auto-approver to match LinkedIn's actual platform max (3000). Current 1800/2000 caps don't match any platform's actual limit.
- **Review the "restrictive practice" blocked keyword for NDIS clients** — that's literal NDIS terminology and central to the content domain. Likely a config-level mismatch.

### Resolution

_(open — captured as primary blocking item for any IG/LinkedIn re-enable; T07 step 4 cannot proceed until F-PUB-004 patch landed AND fresh approvals observed)_

---

## F-PUB-005  ·  MEDIUM  ·  open  ·  Trigger doesn't gate on approval

**Area:** Publish pipeline / state coupling  
**Object:** `m.enqueue_publish_from_ai_job_v1` (AFTER UPDATE trigger on `m.ai_job`) + IG/FB/LI publisher EFs  
**Severity rationale:** design coupling problem. Causes wasted publisher cron cycles + a misleading queue depth. Doesn't itself cause data loss but compounds with F-PUB-004 to make recovery harder.

### Issue

`m.enqueue_publish_from_ai_job_v1` does NOT check `m.post_draft.approval_status` before inserting into `m.post_publish_queue`. Verified via `pg_proc` — function body 2345 chars, no `approval_status` reference, no `approved` reference.

Flow: ai_job succeeds → trigger fires → row inserted into `m.post_publish_queue` regardless of whether the draft is `'approved'`, `'needs_review'`, `'draft'`, or `'rejected'`. Publisher EF then catches unapproved drafts at its own pre-flight gate and writes `last_error='not_approved:needs_review'` to the queue row.

Observed consequence: 4 of 4 attempts on tonight's T07 step 4 cron run fell into this trap (CFW × 2 + Invegent × ? — Invegent never reached it because cron was killed first).

The trigger is optimistic (assume drafts will be approved before publisher picks them up). The publisher is pessimistic (refuse unapproved drafts). When approval lags (F-PUB-004), queue rows pile up against unapproved drafts and the publisher does N round-trips for nothing.

### Recommended action

Add an `approval_status='approved'` check in the trigger function. Either:

- Skip the queue insert entirely if not approved (delays queueing until approved — clean but loses the audit trail of "draft was generated and ready")
- Insert with a new queue status `'awaiting_approval'` (not currently in the enum — would need DDL); then a second trigger on `m.post_draft.approval_status` UPDATE moves the row to `'queued'` when approved.

Option 2 is cleaner architecturally. Option 1 is less invasive. Decide based on whether queue depth is a useful operator signal for "backlog of approved-but-unpublished" vs "backlog of generated-but-not-approved."

### Resolution

_(open — captured in action_list backlog; not blocking; mostly a hygiene item that becomes urgent once F-PUB-004 lands)_

---

## Cross-check value note (added in corrigendum)

ChatGPT's cross-check on the first pass of this audit caught a wrong production migration before it landed. Specifically, ChatGPT pulled the R6 implementation spec evidence ("No YouTube in R6 v1") that chat had access to but didn't surface, and proposed an architecture pre-check before the trigger DDL. The pre-check via the EF source then proved the trigger exclusion was intentional and the correct architecture — making the trigger fix a wrong call.

This is a real-world data point for D-01 / D185 (red-team review v1 ratification) and worth capturing as a Lesson candidate (#43 below) regardless of whether the formal red-team rule is adopted.

**A second ChatGPT cross-check** post-T07 step 4 rollback recommended: (a) don't bulk UPDATE legacy FB stragglers to `'dead'` blindly — use reversible quarantine instead; (b) the cap mismatch is a synthesis-layer issue not a draft-layer issue. Both correct. Chat halted before any UPDATE was applied. See F-PUB-004 recommendations.

---

## Out-of-scope notes (for completeness)

- **Three legacy `seed-and-enqueue-*` crons (jobid 11 FB, 64 IG, 65 LinkedIn) are inactive.** All show `ERROR: canceling statement due to statement timeout` from their last attempted run. These are LEGACY paths from the pre-slot-driven era (per D170+). Their inactivity is correct — the slot-driven trigger `m.enqueue_publish_from_ai_job_v1` replaced them for FB/IG/LI; YouTube was always on a separate path (see F-PUB-001 corrigendum). The timeout errors are residual evidence of the build burst that exceeded their query budget; not relevant to current operations.

- **Tokens shown as 2099-12-31 in snapshot Section 16** for FB+IG across all 4 clients are placeholder "never-tracked" sentinels in `token_expires_at`, not real expiry. FB is publishing 5 posts in 24h unaffected, so token state is functional even with the placeholder. Out-of-scope for this audit (Security Auditor when role exists). Note that the YT `token_expires_at` (2031-04-15 / 2031-04-01 in snapshot) is similarly unreliable — the actual auth state is captured in OAuth refresh-token validity (per F-PUB-001), not in `token_expires_at`.

- **`enqueue-publish-queue-every-5m` (jobid 48)** showed an `ON CONFLICT specification` error in `last_error` but its 24h record is 288/288 succeeded. That error is historical (pre-window) and not relevant to current operations.

---

## Closure plan (corrected)

- F-PUB-001: PK reconnects OAuth via dashboard for NDIS-Yarns + PP + Invegent YT. T06 captures. Verify via successful upload + `m.post_publish` audit row.
- F-PUB-002: PP + NDIS-Yarns IG locked. T07 6-step sequence updated — step 4 cannot proceed until F-PUB-004 fixed AND fresh CFW/Invegent IG approvals observed.
- F-PUB-003: gated on F-PUB-001 reconnect + verified upload. B21 in backlog.
- **F-PUB-004 (NEW)**: requires auto-approver EF code patch (TypeScript). Stratification + reject-cooldown. Deploy via Supabase Edge Functions. PK action; chat can author the patch when GitHub MCP is available.
- **F-PUB-005 (NEW)**: requires migration to add `approval_status` check to `m.enqueue_publish_from_ai_job_v1`. Lower priority — hygiene item.

## Lesson candidates raised (for next forward-discipline refinement)

- **Lesson #43 (candidate)** — Always verify the EF source-of-truth before assuming pipeline architecture. Source: F-PUB-001 corrigendum.
- **Lesson #44 (candidate)** — When auditing publisher behavior, distinguish between cron-level success (returned 200) and operation-level success (actually published). Source: F-PUB-002 + F-PUB-004.
- **Lesson #45 (candidate)** — When an external red-team reviewer (ChatGPT in this case) suggests a pre-check before production DDL, treat the pre-check as mandatory rather than optional. Source: F-PUB-001 corrigendum.

**Lesson #46 (PROMOTED to canonical)** — "Cron health is not system health. Source-of-truth must be verified at the consumer, not inferred from the producer." Supersedes #43, #44, #45 as their parent abstraction. F-PUB-004 is the most direct application.
