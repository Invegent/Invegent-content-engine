# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D100 — See earlier commits

## D101–D125 — See 16 Apr 2026 commits

## D126–D141 — See 17 Apr 2026 commits (pipeline analysis, synthesis decision, demand-aware seeding direction)

## D142–D146 — See 17 Apr 2026 evening commits (demand-aware seeder, classifier, router, benchmark, feed score — all but D142 gated on 60d data)

## D147–D151 — See 18 Apr 2026 afternoon commit (pilot structure, buyer-risk form, advisor layer, session-close SOP, table-purpose rule)

---

## D152 — Seeder post_draft.client_id Fix
**Date:** 18 April 2026 evening | **Status:** ✅ APPLIED

### Context

On 17 April 02:10–07:00 UTC, D142 demand-aware seeder created 300 `post_draft` rows with `client_id = NULL`. The bug: the `ins_draft` CTE inside `m.seed_and_enqueue_ai_jobs_v1` INSERTs into `m.post_draft` without providing `client_id`, even though the upstream `ins_seed` CTE correctly carried client_id through.

Discovered during A9 investigation (18 Apr evening) after PK correctly challenged the dashboard-says-all-feeds-assigned evidence.

### The fix

```sql
ins_draft as (
  insert into m.post_draft (
    post_draft_id,
    client_id,                  -- ADDED
    digest_item_id,
    ...
  )
  select
    gen_random_uuid(),
    s.client_id,                -- ADDED (already carried by ins_seed)
    s.digest_item_id,
    ...
  from ins_seed s
  ...
)
```

Version string bumped to `demand-aware-v2-d152`.

### Backfill

Two backfills executed:
- 300 orphans → client_id from `digest_run.client_id` via `digest_item` join
- 7 legacy manual-studio orphans → client_id from `m.post_publish.client_id` (different class, no digest_item)

**Zero NULL client_id rows remain across all time.**

### Verification

Manual seeder invocation post-fix created 5 new drafts, all with `client_id` populated. Verified.

### Related

This fix made the A10 (Instagram) seeder safe to deploy — otherwise new IG drafts would have inherited the same orphan problem.

---

## D153 — Token-Health Cron Should Call Meta /debug_token Live
**Date:** 18 April 2026 evening | **Status:** 🔲 BUILD NEXT — gap identified, not yet addressed

### Context

18 April investigation revealed that 3 of 4 Facebook page access tokens had been dead since 13 April PDT. The DB's `token_expires_at` field showed NY expiring 31 May 2026 — but Meta had invalidated the token independently 4 days earlier. No alert fired because the token-expiry alerter trusts the DB field only.

Meta can invalidate tokens for multiple reasons disconnected from the stored expiry timestamp:
- User removes app permissions in Facebook settings
- Meta detects anomalous use and revokes
- App-level policy change
- Password change
- Business verification lapses

Any of these creates a silent-publisher-failure window that can run for days before detection via user complaint.

### The fix (not yet built)

Replace the stored-field trust with a live call to Meta's debug endpoint:

```
GET https://graph.facebook.com/debug_token
  ?input_token={stored_token}
  &access_token={stored_token}
```

Response fields to check:
- `is_valid` — must be true
- `expires_at` — update `c.client_publish_profile.token_expires_at` from this
- `data_access_expires_at` — new field to track (some APIs deprecate token 60d before full expiry)

Frequency: daily is enough. This is not performance-critical.

### Implementation sketch

New Edge Function `token-health-live`:
1. Read all active publish profiles with `page_access_token IS NOT NULL`
2. Call `/debug_token` via fetch
3. If `is_valid = false` or `expires_at` differs from DB by > 24h: UPDATE DB + insert alert row into `m.token_health_alert` (new table)
4. Cron: daily at 7am Sydney (superseding `token-health-daily-7am-sydney` which currently calls `publisher/token-health-write`)

Small build (~45 min). High pre-sales value — closes the silent-failure blind spot.

### Gate

None. Build next session.

### Related

The `2099-12-31` sentinel currently stored in `token_expires_at` for all 4 FB + 4 IG profiles is a stopgap. This fix replaces the stopgap with live verification.

---

## D154 — Native LinkedIn Draft Flow (End Facebook Fan-Out)
**Date:** 18 April 2026 evening | **Status:** ✅ APPLIED

### Context

Pre-existing architecture: `public.crosspost_facebook_to_linkedin()` fanned out every approved Facebook draft into a LinkedIn queue row pointing back to the **same Facebook draft**. The `linkedin-zapier-publisher` read `draft_title + draft_body` from the FB draft and sent it to Zapier → LinkedIn. Result: LinkedIn received Facebook-styled content, platform voice mismatch, wasted LinkedIn-specific `content_type_prompt` rows.

This was a temporary bridge designed before the LinkedIn pipeline was native. Time to replace it.

### The fix

Four changes:

**1. Activate LinkedIn publish profiles for NY + PP**

```sql
UPDATE c.client_publish_profile
SET mode = 'auto',
    token_expires_at = '2099-12-31'::timestamptz,
    paused_until = NULL, paused_reason = NULL, paused_at = NULL
WHERE platform = 'linkedin'
  AND client_id IN (NY, PP);
```

(CFW + Invegent stay mode=NULL because they have no LinkedIn content_type_prompts — A11.)

**2. Extend `m.enqueue_publish_from_ai_job_v1()` trigger** to handle `platform IN ('facebook','linkedin')` with per-platform cadence. Original logic was `platform = 'facebook'` only.

LinkedIn cadence:
- PP: 240min gap, 8 max queued (≈4–6 posts/day peak)
- NY: 360min gap, 6 max queued (≈3–4 posts/day peak)
- Default: 360min gap, 6 max queued

**3. Create `seed-and-enqueue-linkedin-every-10m` cron** (jobid 65) — mirrors FB/IG cadence.

**4. Neutralise `public.crosspost_facebook_to_linkedin`** to a no-op that returns `{queued_for_linkedin: 0}`. Kept signature so `linkedin-zapier-publisher` RPC call still succeeds. Reversible.

### Why this works without touching the publisher

The `linkedin-zapier-publisher` Edge Function reads `draft_title + draft_body` from whatever `post_draft_id` the queue row points to. It does not care about `draft.platform`. So pointing queue rows at native LinkedIn drafts (not fanned-out Facebook drafts) gives it LinkedIn content to publish unchanged.

### Verification (at config-level)

- Manual LinkedIn seeder invocation: 3 seeds, 3 drafts, 3 jobs queued with `platform='linkedin'` and `client_id` populated.
- Crosspost function returns `{queued_for_linkedin: 0, note: 'disabled_d154_native_linkedin_seeding_active'}`.
- End-to-end publish verification deferred to next morning check (ai-worker processing backlog).

### Caveat surfaced immediately after

D154 appeared to work but native LI drafts stayed queued. Investigation led to **D155** (below).

### Related

A11 remains open: CFW + Invegent need LinkedIn `content_type_prompt` rows before their LI profiles can be activated.

---

## D155 — Enqueue Trigger ON CONFLICT Clause Mismatch (Root Cause of 11 Apr Silent Pipeline Stall)
**Date:** 18 April 2026 evening | **Status:** ✅ APPLIED — THE FIX OF THE DAY

### The 7-day silent failure

Investigation into why native LinkedIn drafts stayed queued revealed a much larger issue:

- **Last `ai_job.status = 'succeeded'` was 11 April 13:10 UTC.** Seven days ago.
- **2,718 successful Claude API calls** in 3 days per `m.ai_usage_log`. Worker was generating content.
- **Post-draft bodies populated** (1,800+ char real content).
- **But every ai_job stayed `running` or `queued`.**
- **441 jobs stuck by end of investigation.**

Control observation: FB posts did publish 12–15 April because they drew from a pre-11-April backlog that had already been marked succeeded. The last FB publish was 15 April. After that, zero genuinely new posts made it to the publisher.

### The bug

AI-worker's final step writes `ai_job.status = 'succeeded'`. The AFTER-UPDATE trigger `trg_enqueue_publish_from_ai_job_v1` fires, calling:

```sql
INSERT INTO m.post_publish_queue (...)
VALUES (...)
ON CONFLICT (post_draft_id) DO NOTHING;
```

But the actual unique index on `m.post_publish_queue` is:

```sql
CREATE UNIQUE INDEX uq_post_publish_queue_post_draft_platform
  ON m.post_publish_queue (post_draft_id, platform);
```

PostgreSQL throws error 42P10: `there is no unique or exclusion constraint matching the ON CONFLICT specification`.

The error propagates up. The AFTER trigger's failure rolls back the ai_job UPDATE. The worker's `.update(...)` call was not awaited with error handling (typical `await supabase.from().update()` returns result silently). So the worker swallows the rollback, marks the response as processed, and returns. Ten minutes later the `sweep-stale-running-every-10m` cron unlocks the job back to `queued`. Worker picks it up again, regenerates, same outcome.

### The fix

One-line change:

```sql
-- BEFORE
on conflict (post_draft_id) do nothing;

-- AFTER
on conflict (post_draft_id, platform) do nothing;
```

Applied via migration `d155_fix_enqueue_trigger_on_conflict_clause`. Also folded `platform = 'instagram'` into the trigger at the same time (previously only `facebook` and `linkedin`).

### Also applied: Instagram cadence in trigger

```
Instagram:
- PP: 360min gap, 6 max queued
- NY: 360min gap, 6 max queued
- Default: 480min gap, 4 max queued
```

### Unblock executed

35 stuck FB ai_jobs with real content (>100 char body) manually set to `status='succeeded'` post-fix. Triggers fired cleanly; 36 queue rows created across CFW (7), NY (10), PP (19), scheduled through 21 April.

Manual ai-worker invocation test: 3 new jobs processed end-to-end with `status='succeeded'` properly written, no trigger errors. Pipeline is now genuinely flowing for the first time in 7 days.

### What was salvaged vs lost

- **Salvaged:** All 36 already-generated FB drafts with real content now scheduled to publish.
- **Lost:** None — drafts were never deleted, just stuck.
- **Deferred:** 434 empty stubs (350 FB + 42 IG + 42 LI) will re-process through ai-worker at 5/run every 5 min over the next ~7 hours. Clean drain.

### Why this wasn't caught earlier

The failure was invisible from every normal monitoring angle:
- No errors in Edge Function logs (error was downstream of the worker's last observed line)
- No failed ai_jobs (they stayed at `running`, not `failed`)
- `ai_usage_log` showed healthy API use
- Draft bodies were populated (content generation was succeeding)
- FB posts kept publishing (from pre-existing queue depth) until 15 April
- By the time the queue drained, attention was on other issues (Instagram config, token expiry, LinkedIn fan-out)

Monitoring gap: no alert fires when `ai_job.status` distribution shifts toward `running`/`queued` over time. This gap is the highest-value follow-on item from D155.

### Follow-on items

1. Add monitoring: alert when ai_job queued depth > 100 for > 2 hours.
2. Add monitoring: alert when `last_successful_ai_job_at > NOW() - 3 hours` (right now that condition was true for 7 days).
3. Review every trigger's ON CONFLICT clause against current unique constraints.
4. Review ai-worker's UPDATE calls for unchecked errors (surface swallowed rollbacks).

All four go into `docs/15` as new pre-sales items next session (likely A20–A23).

### Related

D154 (native LinkedIn flow) did not actually break anything new — the trigger was already broken for FB-only and would have been for LinkedIn too. D154 would have silently failed had D155 not been diagnosed in the same session.

---

## Decisions Pending

| Decision | Status | Gate |
|---|---|---|
| D142 — Demand-aware seeder | ✅ Live (now as v2-d152 post patch) | — |
| D143 — Signal content type classifier | 🔲 Gated | D142 stable + 60 days data |
| D144 — Signal router (platform × format) | 🔲 Gated | D143 + D140 + D145 + 60 days data |
| D145 — Benchmark table | 🔲 Research now, build with D144 | Research immediate |
| D146 — Feed pipeline score + retirement | 🔲 Gated | Phase 2.1 + 60 days data |
| D140 — Digest item scoring | 🔲 Phase 3 | After CFW stable + auto-approver healthy |
| D149 — Advisor Layer MVP (Sales Advisor Project) | 🔲 Build this week | None — ready now |
| D151 — Table purpose backlog sweep (22 rows) | 🔲 Post-pre-sales | Non-blocking; batch job later |
| D153 — Token-health live /debug_token cron | 🔲 Build next session | None — ready now, high priority |
| Phase 2.1 — Insights-worker | 🔲 Next major build after D142 stable | Meta Standard Access |
| Phase 2.6 — Proof dashboard | 🔲 After Phase 2.1 | Needs engagement data |
| NDIS Support Catalogue data load | 🔲 Phase 3 | Tables exist |
| Solicitor engagement | 🔲 Parked per D147 | First pilot revenue OR $2k MRR |
| F1 Prospect demo generator | 🔲 ~mid-June 2026 | 60+ days NDIS Yarns data |
| LinkedIn Community Management API | 🔲 13 May 2026 | Evaluate Late.dev if pending |
| D124 — Boost Configuration UI | 🔲 Phase 3.4 | Meta Standard Access |
| RSS.app discovery dashboard page | 🔲 Phase 3 | No urgency |
| Cowork daily inbox task | 🔲 Phase 4 | Gmail MCP |
| Meta App Review | ⏳ In Review | Contact dev support if stuck after 27 Apr |
| animated_data advisor conflict | 🔲 Immediate | Format Library page fix |
| CFW content session + Invegent content session | 🔲 A11 pre-sales | PK tokens acquired today; needs prompt writing |
| Confirm TBC subscription costs | 🔲 A6 pre-sales | Invoice check — Vercel, HeyGen, Claude Max, OpenAI |
| CFW profession fix ('other' → 'occupational_therapy') | 🔲 Immediate | Change in Profile |
| Auto-approver target pass rate decision | 🔲 C1 | Single PK decision |
| Monitoring: ai_job stall alert (follow-on from D155) | 🔲 New pre-sales item | Build next session |
| Monitoring: last_successful_ai_job freshness alert | 🔲 New pre-sales item | Build next session |
| All triggers: review ON CONFLICT clauses against current constraints | 🔲 New pre-sales item | Due-diligence sweep |
| ai-worker: surface swallowed UPDATE rollbacks | 🔲 New pre-sales item | Code-level fix |
