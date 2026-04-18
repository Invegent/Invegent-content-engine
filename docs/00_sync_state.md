# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-18 EVENING (end of full-day session — D152–D155 applied, pipeline unstuck, LinkedIn-as-Facebook bug resolved)
> Written by: PK + Claude session sync

---

## SESSION STARTUP PROTOCOL

1. Read this file (`docs/00_sync_state.md`)
2. Read `docs/15_pre_post_sales_criteria.md` — authoritative pre-sales gate document.
3. Read `docs/14_pre_sales_audit_inventory.md` for underlying findings if needed.
4. Query `k.vw_table_summary` before working on any table.
5. **Session-close SOP (D150):** verify every commit with `git ls-remote origin main | grep <sha>` before asserting it in sync_state.

---

## ⚠️ FIRST THING NEXT SESSION

**Pipeline is now unstuck for the first time in 7 days.** The D155 root-cause fix applied today resolves the 11-Apr silent pipeline failure. First post-fix ai-worker run (manual) succeeded end-to-end. Cron-driven runs should have drained the empty-stub backlog and begun generating native LinkedIn + Instagram content.

**Morning check tomorrow:**
1. Count of published posts last 12h per platform — expect first native LinkedIn + first Instagram posts
2. `m.ai_job` status distribution — should show sustained `succeeded` entries, not 441 stuck queued
3. `m.post_publish_queue` depth by platform — should be draining per scheduled_for, not accumulating
4. Any new errors in `linkedin-zapier-publisher` logs (Zapier webhook responses)

**If all green → close remaining Section A items (A3, A6, A11, A14, A15-bonus if needed). If red → investigate regression.**

---

## 18 APRIL 2026 — FULL DAY SUMMARY

### Morning: audit reconciliation + classification
- Claude Code audit produced `docs/14_pre_sales_audit_inventory.md` (38 items, 13 open questions)
- Initial commit failed silently — **D150** session-close SOP added
- `docs/15_pre_post_sales_criteria.md` v1 published

### Afternoon: PK Q&A → docs/15 v2
- 16 open questions answered; material reclassifications logged
- **D147** — pilot-with-waiver supersedes solicitor engagement
- **D148** — buyer-risk clause: 50% off next month on KPI miss
- **D149** — four-advisor layer architecture (Sales Advisor MVP first)
- **D151** — universal table-purpose rule

### Evening session-1: A9 orphan drafts resolved
- PK correctly challenged H6 premise — dashboard showed 0 unassigned feeds
- Investigation revealed 300 orphan drafts from D142 seeder missing `post_draft.client_id` on INSERT
- Backfilled 300 via digest_run join + 7 legacy manual-studio orphans via post_publish join
- **0 NULL client_id rows remain across all time**
- **A9 closed**

### Evening session-2: Facebook + Instagram token crisis + fixes
- Investigation into A10 (Instagram 0 posts) uncovered **3 of 4 FB tokens dead since 13 Apr** despite DB showing NY expires 31 May
- Token-health alerter was trusting stale `token_expires_at` field instead of Meta `/debug_token`
- PK generated long-lived user token via Graph API Explorer (Claude browser couldn't complete OAuth)
- Fired `/me/accounts` via pg_net — retrieved 4 permanent PAGE tokens + 4 IG Business Account IDs
- Verified each via `/debug_token` — all 4 permanent (`expires_at: 0`)
- Updated 4 FB + 4 IG publish profiles with new tokens + IG destination_ids
- End-to-end proof call succeeded
- pg_net response rows cleaned up (tokens now only in destination table)
- **A10 token layer fixed** + A19 (token refresh) logged in the decisions record

### Evening session-3: D152 seeder fix + IG seeder cron
- Patched `m.seed_and_enqueue_ai_jobs_v1` to set `post_draft.client_id` on INSERT
- Test run: 5 new drafts, all with `client_id` populated → **D152 verified working**
- Created `seed-and-enqueue-instagram-every-10m` cron (jobid 64)

### Evening session-4: LinkedIn-as-Facebook bug → deeper root cause
- Starting intent: fix LinkedIn publishing Facebook-styled content
- Investigation: existing `public.crosspost_facebook_to_linkedin()` fans out approved FB drafts into LinkedIn queue rows pointing to FB draft content
- Planned fix: activate native LinkedIn seeder + extend enqueue trigger to LinkedIn + neutralise crosspost
- **D154** applied: LinkedIn publish profile activated (NY+PP), trigger extended to handle linkedin platform, cron created, crosspost neutralised to no-op
- Native LinkedIn drafts start generating — but pipeline appeared stuck

### Evening session-5: D155 — the actual root cause
- Debugging revealed 441 ai_jobs stuck `running` or `queued` despite 2,718 successful Claude API calls in 3 days
- Last `ai_job.status = 'succeeded'` was 11 April — 7 days of silent pipeline failure
- Manual UPDATE test surfaced the real error: **`ON CONFLICT (post_draft_id) DO NOTHING` in the enqueue trigger, but the actual unique constraint is `(post_draft_id, platform)`**
- PostgreSQL error 42P10 rolled back every ai_worker UPDATE silently
- **D155** applied: changed ON CONFLICT clause to match real constraint. Also folded Instagram into the trigger's platform list.
- Manually marked 35 stuck FB jobs with real content as succeeded → 36 queue rows created across 3 clients
- Manual ai-worker invocation: 3 jobs processed end-to-end, `status='succeeded'` confirmed, no trigger errors

### Evening session-6: sync commit (this commit)
- Documenting the full day; D152, D154, D155 added to decisions log
- `docs/15_pre_post_sales_criteria.md` v3 update pending next session (too many items closed to update mid-session)

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active)
**Gate status:** pre-sales gate still NOT CLEARED — but several Section A blockers resolved today.

---

## ALL CLIENTS — FULL STATE (POST D155)

| Client | client_id | Verticals | FB token | IG config | LI config | Prompts FB/IG/LI |
|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | NDIS, AU Disability Policy | ✅ permanent | ✅ active | ✅ active | 3/3/3 |
| Property Pulse | 4036a6b5 | AU Property ×3 | ✅ permanent | ✅ active | ✅ active | 3/3/3 |
| Care For Welfare | 3eca32aa | NDIS, AU Disability Policy | ✅ permanent | ⚠ mode=null | ⚠ mode=null | 0/0/0 (A11) |
| Invegent | 93494a09 | AI & Automation, Content Marketing | ✅ permanent | ⚠ mode=null | ⚠ mode=null | 0/0/0 (A11) |

**All 4 FB page access tokens are permanent** (`expires_at: 0`). No more silent expiry risk — but still need D153 (live `/debug_token` health check) for revocation detection.

---

## PIPELINE HEALTH (POST D155)

### ai_job status distribution (post-fix)
| Status | Count | Note |
|---|---|---|
| succeeded | 634 | +47 today (35 manual unblock + 3 test + ~9 cron-triggered since fix) |
| queued | 431 | 350 FB empty stubs + 42 IG stubs + 42 LI stubs — will drain via ai-worker-every-5m |

### Seeder crons (after D154)
| Job | jobid | Cadence | Active |
|---|---|---|---|
| seed-and-enqueue-facebook-every-10m | 11 | */10 * * * * | ✅ |
| seed-and-enqueue-instagram-every-10m | 64 | */10 * * * * | ✅ |
| seed-and-enqueue-linkedin-every-10m | 65 | */10 * * * * | ✅ |

**Total active crons now: 42.**

### Publish queue depth (post D155 + manual unblock)
| Client | Platform | Queued | Earliest slot | Latest slot |
|---|---|---|---|---|
| Care For Welfare | Facebook | 7 | 18 Apr 11:25 UTC | 18 Apr 23:25 UTC |
| NDIS-Yarns | Facebook | 10 | 18 Apr 12:26 UTC | 19 Apr 15:26 UTC |
| Property Pulse | Facebook | 19 | 19 Apr 21:30 UTC | 21 Apr 00:30 UTC |

**~3 days of Facebook content queued.** LinkedIn + Instagram will populate as worker drains empty stubs.

---

## DECISIONS LOGGED TODAY

| ID | Title | Status |
|---|---|---|
| D147 | Pilot structure with liability waiver (supersedes solicitor pre-sales) | ✅ DECIDED |
| D148 | Buyer-risk clause form: 50% off next month on KPI miss | ✅ DIRECTION SET |
| D149 | Advisor layer architecture (4 peer-level advisors, Sales MVP first) | 🔲 BUILD NEXT |
| D150 | Session-close trust-but-verify protocol | ✅ ADOPTED |
| D151 | Universal table-purpose rule | ✅ ADOPTED |
| D152 | Seeder post_draft.client_id fix | ✅ APPLIED |
| D153 | Token-health cron should call Meta /debug_token live | 🔲 BUILD NEXT |
| D154 | Native LinkedIn draft flow (config + trigger + cron + crosspost neutral) | ✅ APPLIED |
| D155 | Enqueue trigger ON CONFLICT clause fix (root cause of 7-day stall) | ✅ APPLIED |

---

## META BUSINESS VERIFICATION (UNCHANGED SINCE MORNING)

| Item | Status |
|---|---|
| 2FA block on PK admin account | ✅ Cleared |
| Shrishti admin 2FA + passkey | ⏳ Pending — PK to chase |
| invegent.com domain DNS TXT verify | ✅ Verified in Meta Business Manager today |
| Business verification | ⏳ In Review |
| App Review | ⏳ In Review — 27 Apr escalation trigger = 9 days |

---

## KNOWN ACTIVE ISSUES (POST SESSION)

### Closed today
- ✅ A9 — orphan drafts (backfilled 307 rows, D152 prevents recurrence)
- ✅ A10 part 1 — Instagram config fixed (mode/destination_id/token for all 4 clients)
- ✅ A19 (new) — FB token refresh across 4 clients (all permanent now)
- ✅ Pipeline stall (undiagnosed until today) — D155
- ✅ LinkedIn-as-Facebook bug — D154

### Still pre-sales open
- A1 pilot terms (per D147)
- A2 Meta App Review (external)
- A3 one-page proof document
- A4 NY numbers (time-based — 4–8 weeks from today)
- A5 KPI definitions for D148
- A6 4 TBC subscription costs
- A7 privacy policy refresh
- A8 AI disclosure clause
- A10 part 2 — first IG post actually publishes (next 12h verification)
- A11 — CFW + Invegent content_type_prompts (now unblocked, tokens in place)
- A14 — RLS portal verification
- A15 — already done 18 Apr morning
- A16 — Clock A dashboard
- A17 — Clock C 7 items
- A18 — 7 remaining source-less Edge Functions (one committed today, was 8)

---

## TOKEN CALENDAR (POST D155)

| Platform | Client | Sentinel expiry | Reality |
|---|---|---|---|
| YouTube | NDIS Yarns | 7 Apr 2031 | ✅ |
| YouTube | Property Pulse | 2 Apr 2031 | ✅ |
| Facebook | NDIS Yarns | 2099-12-31 (permanent) | ✅ verified via /debug_token today |
| Facebook | Property Pulse | 2099-12-31 (permanent) | ✅ verified via /debug_token today |
| Facebook | Care For Welfare | 2099-12-31 (permanent) | ✅ verified via /debug_token today |
| Facebook | Invegent | 2099-12-31 (permanent) | ✅ verified via /debug_token today |
| Instagram | All 4 | 2099-12-31 (permanent — shared FB token) | ✅ |

**The 2099 sentinel is temporary until D153 builds a live `/debug_token` alerter.** Revocation risk still exists (user removes app permissions, Meta policy change) and currently would not trigger alert.

---

## NEXT SESSION PRIORITIES

### Morning verification (15 min)
1. Confirm pipeline drained overnight — published posts per platform last 12h
2. Confirm `m.ai_job` succeeded count kept climbing past 634
3. Confirm Property Pulse LinkedIn post used native LinkedIn content (not FB fan-out)
4. Confirm first Instagram post published (or diagnose if not)

### Build (in order)
1. **D153** — Token-health cron with live `/debug_token` call. ~45 min Edge Function. High priority — token-revocation blind spot.
2. **A11** — CFW + Invegent LinkedIn content_type_prompts. PK prompt-writing session.
3. **D149** — Sales Advisor Claude Project setup. ~1 hour.
4. **A3** — One-page proof document using NY numbers. ~2 hours.
5. **A6** — Confirm 4 TBC subscription costs (invoice check — Vercel, HeyGen, Claude Max, OpenAI).

### Decide
- C1 auto-approver target pass rate (single PK decision, cheap).
- CFW profession fix ('other' → 'occupational_therapy').
- Whether docs/15 v3 update is needed next session (5 items closed today).

### Watch
- 27 Apr Meta App Review escalation trigger (9 days).
- Shrishti 2FA + passkey.
- D155 regression risk: watch for any Edge Function error logs mentioning trigger failures over next 48h.
