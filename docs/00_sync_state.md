# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-18 VERY LATE EVENING (session-close after docs/15 v3 pulled forward from Sunday)
> Written by: PK + Claude session sync

---

## ⚠️ FIRST THING SUNDAY 19 APRIL 2026

**Read `docs/briefs/2026-04-19-session-continuity.md` BEFORE ANYTHING ELSE.**

That brief captures Saturday night's strategic reasoning on the external epistemic diversity layer (Stages 1-4). It is load-bearing for the next 7 days. If fresh-Claude on Sunday suggests a direction that contradicts it, pause and re-read the brief first.

The brief lives on three independent surfaces to survive memory decay:
1. `docs/briefs/2026-04-19-session-continuity.md` (narrative) — patched Saturday evening per sanity-read (commit 04eb1d4)
2. This file's next section (operational)
3. `docs/06_decisions.md` D156 (strategic direction recorded)

---

## SESSION STARTUP PROTOCOL

1. Read the 19 April continuity brief above
2. Read this file (`docs/00_sync_state.md`)
3. Read `docs/15_pre_post_sales_criteria.md` — **v3 now live (commit 96b1051)**. Authoritative pre-sales gate reflecting Saturday closures + D155/D156 fallout. 28 pre-sales items, 7 closed, 21 open.
4. Query `k.vw_table_summary` before working on any table
5. **Session-close SOP (D150):** verify every commit with `git ls-remote origin main | grep <sha>` before asserting it in sync_state

---

## SUNDAY 19 APRIL — COMMITTED PLAN (updated: docs/15 v3 pulled forward Saturday night)

**Two commitments now (was three). Full details in continuity brief.**

### 1. Morning verification (25 min) — before any action
Verify six pipeline indicators from Saturday's work:
- `ai_job.status = 'succeeded'` count > 634
- At least one FB post published since midnight UTC
- At least one LinkedIn post with NATIVE content (not FB fan-out)
- At least one Instagram post published (or clear error)
- `m.post_publish_queue` not accumulating dead rows
- No new trigger errors in Supabase logs

**If any fail:** regression investigation is the priority, rest of plan deferred. Red-path playbook lives in the continuity brief (5 investigation starting points mapped to the 6 indicators, added Saturday evening).

### 2. ~~Update docs/15 to v3~~ ✅ DONE Saturday night (commit 96b1051)
Pulled forward from Sunday. Reflects A9/A10a/A11a/A15/A19 closures + A20–A26 new items. No Sunday action needed on this. **Read the file for Sunday context** — do not re-update.

### 3. Write the epistemic diversity build spec (2-3 hours)
`docs/briefs/2026-04-19-epistemic-diversity-layer.md` — design doc for Stages 1+2. No building on Sunday. Spec must exist before any code.

**Then stop.** Sunday evening is rest. Build starts Monday.

---

## MONDAY-FRIDAY 20-24 APRIL — INDICATIVE PLAN

From continuity brief. Adjust each evening.

| Day | Focus |
|---|---|
| Mon 20 Apr | Build Architect Reviewer (Stage 1 role 1) — Gemini 2.5 Pro on commit diffs. 4-6h. Retroactive test on the commit that introduced the faulty ON CONFLICT clause (on or before 11 April — find via `git log -p -S 'ON CONFLICT' -- supabase/`). Per corrected brief. |
| Tue 21 Apr | Build Meta reconciliation (Stage 2 system 1) — daily 6am Sydney. 2-3h. Retroactive test on 15-17 Apr — should show NY silence. |
| Wed 22 Apr | Build discipline layer (unread-blocks-dashboard) + spec D153 live /debug_token. 3h. |
| Thu 23 Apr | Sales Advisor (D149) + Gemini Devil's Advocate in parallel. First real consultation. |
| Fri 24 Apr | Return to Section A execution — candidates A6, A17, A11b. |
| Sat 25 Apr | Week 1 review. Adjust week 2. |
| Sun 26 Apr | Rest. |
| Mon 27 Apr | Meta App Review escalation trigger (if still In Review). |

---

## 18 APRIL 2026 — FULL DAY SUMMARY

### Morning: audit reconciliation + classification
- Claude Code audit produced `docs/14_pre_sales_audit_inventory.md`
- `docs/15_pre_post_sales_criteria.md` v1 published, v2 after PK Q&A
- D147-D151 logged

### Afternoon: A9 + token crisis + D152 + D154 + D155
- A9 reframed and resolved (307 rows backfilled, D152 prevents recurrence)
- 3 of 4 FB tokens found dead since 13 Apr; all 4 refreshed to permanent
- All 4 IG profiles activated, IG Business Account IDs populated
- D152: seeder `post_draft.client_id` fix
- D154: native LinkedIn draft flow, crosspost neutralised
- D155: enqueue trigger ON CONFLICT clause fix — THE root cause of 7-day pipeline stall since 11 April
- 35 stuck FB jobs manually unblocked, triggers fired cleanly, publish queue populated through 21 April

### Evening: strategic external-layer design session
- PK reframed the problem: internal Claude-only monitoring cannot protect against Claude's blind spots
- Designed four-stage external layer (Stages 1-4, progressively gated by revenue)
- Dual framing: cost-saving infrastructure AND AI-audits-AI sales positioning
- D156 logged (strategic direction)
- Continuity brief written + committed as triple-redundancy against memory decay

### Very late evening: sanity-read + docs/15 v3 pulled forward
- Sanity-read of continuity brief flagged 2 issues: Monday retroactive test target (wrong D-number, wrong date) + no red-path playbook for Sunday verification. Both patched (commit 04eb1d4).
- docs/15 v3 pulled forward from Sunday morning task (commit 96b1051). Reflects Saturday closures (A9, A10a, A11a, A15, A19) + D155 fallout new items (A20-A23) + D156 strategic items (A24-A26). 18 → 28 pre-sales items; 7 closed, 21 open.

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active)
**Gate status:** pre-sales gate NOT CLEARED. External layer (Stages 1+2) now a hard dependency before first pilot per D156. Current docs/15 v3 state: 7 of 28 items closed.

---

## ALL CLIENTS — FULL STATE (POST D155)

| Client | client_id | FB token | IG config | LI config | Prompts FB/IG/LI |
|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ permanent | ✅ active | ✅ active | 3/3/3 |
| Property Pulse | 4036a6b5 | ✅ permanent | ✅ active | ✅ active | 3/3/3 |
| Care For Welfare | 3eca32aa | ✅ permanent | ⚠ mode=null | ⚠ mode=null | 0/0/0 (A11b) |
| Invegent | 93494a09 | ✅ permanent | ⚠ mode=null | ⚠ mode=null | 0/0/0 (A11b) |

All 4 FB tokens permanent (`expires_at: 0`). D153 (A23) pending for live revocation detection.

---

## PIPELINE HEALTH (POST D155)

### ai_job status
| Status | Count | Note |
|---|---|---|
| succeeded | 634 | Baseline at Saturday close — Sunday verify expects > this |
| queued | 431 | Empty stubs (350 FB + 42 IG + 42 LI) — ai-worker draining at 5/run/5min |

### Seeder crons
| Job | jobid | Active |
|---|---|---|
| seed-and-enqueue-facebook-every-10m | 11 | ✅ |
| seed-and-enqueue-instagram-every-10m | 64 | ✅ |
| seed-and-enqueue-linkedin-every-10m | 65 | ✅ |

Total active crons: 42.

### Publish queue (post-D155 + unblock)
| Client | Platform | Queued | Earliest | Latest |
|---|---|---|---|---|
| Care For Welfare | Facebook | 7 | 18 Apr 11:25 UTC | 18 Apr 23:25 UTC |
| NDIS-Yarns | Facebook | 10 | 18 Apr 12:26 UTC | 19 Apr 15:26 UTC |
| Property Pulse | Facebook | 19 | 19 Apr 21:30 UTC | 21 Apr 00:30 UTC |

~3 days of FB content queued. LI + IG will populate as empty-stub backlog drains.

---

## DECISIONS LOGGED 18 APRIL

| ID | Title | Status |
|---|---|---|
| D147 | Pilot structure with liability waiver (supersedes solicitor pre-sales) | ✅ DECIDED |
| D148 | Buyer-risk clause: 50% off next month on KPI miss | ✅ DIRECTION SET |
| D149 | Four-advisor architecture (Sales Advisor MVP first) | 🔲 BUILD NEXT |
| D150 | Session-close trust-but-verify protocol | ✅ ADOPTED |
| D151 | Universal table-purpose rule | ✅ ADOPTED |
| D152 | Seeder post_draft.client_id fix | ✅ APPLIED |
| D153 | Token-health cron should call Meta /debug_token live | 🔲 BUILD NEXT |
| D154 | Native LinkedIn draft flow | ✅ APPLIED |
| D155 | Enqueue trigger ON CONFLICT clause fix (root cause of 7-day stall) | ✅ APPLIED |
| D156 | External epistemic diversity layer (Stages 1-4, progressively gated) | ✅ STRATEGIC DIRECTION |

---

## META BUSINESS VERIFICATION

| Item | Status |
|---|---|
| 2FA block on PK admin | ✅ Cleared |
| Shrishti admin 2FA + passkey | ⏳ Pending — PK to chase |
| invegent.com DNS TXT verify | ✅ Verified |
| Business verification | ⏳ In Review |
| App Review | ⏳ In Review — 27 Apr escalation trigger = 9 days |

---

## TOKEN CALENDAR (POST 18 APR REFRESH)

| Platform | Client | Sentinel expiry | Reality |
|---|---|---|---|
| YouTube | NDIS Yarns | 7 Apr 2031 | ✅ |
| YouTube | Property Pulse | 2 Apr 2031 | ✅ |
| Facebook | All 4 clients | 2099-12-31 (permanent) | ✅ verified via /debug_token Saturday |
| Instagram | All 4 clients | 2099-12-31 (shared FB token) | ✅ |

Sentinel is temporary until D153/A23 live /debug_token alerter is built.

---

## PRE-SALES SECTION A — V3 SNAPSHOT

**See `docs/15_pre_post_sales_criteria.md` v3 (commit 96b1051) for full detail. This is a summary only.**

### Closed / confirmed (7 of 28)
- ✅ A9 — orphan drafts (307 backfilled, D152)
- ✅ A10a — Instagram config (tokens + mode + destination_id for all 4)
- ✅ A11a — CFW + Invegent FB/IG tokens
- ✅ A12 — HeyGen not exposed in v1 portal (code search)
- ✅ A13 — video-analyser internal-only (code search + PK H15)
- ✅ A15 — publisher + weekly-report committed
- ✅ A19 — FB token refresh across 4 clients (formalised)

### Open (21 of 28)
**Original (v2, still open):**
- A1 pilot terms + waiver
- A2 Meta App Review status
- A3 one-page proof doc
- A4 NY numbers (time-based)
- A5 KPI definitions (D148)
- A6 TBC subscription costs
- A7 privacy policy refresh
- A8 AI disclosure clause
- A10b first IG post actually publishes (Sunday verify)
- A11b CFW + Invegent content_type_prompts (9 × 2)
- A14 RLS verification
- A16 Clock A dashboard
- A17 Clock C 7 items
- A18 7 source-less Edge Functions (was 8)

**New v3 — D155 fallout:**
- A20 Pipeline liveness monitoring (ai_job stall + last-success freshness)
- A21 Trigger ON CONFLICT audit across all 10+ triggers
- A22 Ai-worker error surfacing (UPDATE rowcount checks)
- A23 D153 live /debug_token cron

**New v3 — D156 external layer:**
- A24 Stage 1 multi-model review MVP (Architect Reviewer + Sceptic)
- A25 Stage 2 bank reconciliation MVP (Meta + GitHub + Vercel + Supabase)
- A26 Review discipline (unread-blocks-dashboard + weekly block)

---

## WATCH LIST

- 27 Apr Meta App Review escalation trigger (9 days)
- Shrishti 2FA + passkey
- D155 regression: watch for trigger failures in EF logs over next 48h
- Empty-stub drain rate: should be draining 5 jobs every 5 min ≈ 60/hour. 434 stubs ≈ 7.2 hours to drain.
- First native LinkedIn post content quality (not just that it published)
- First Instagram post goes through successfully
- Sunday morning 6-indicator verification — red-path playbook in continuity brief
