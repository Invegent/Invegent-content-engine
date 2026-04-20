# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-20 evening (session-close after ID003 documentation sprint)
> Written by: PK + Claude session sync

---

## ⚠️ FIRST THING TOMORROW (Tuesday 21 April)

**Read `docs/incidents/2026-04-19-cost-spike.md` and `docs/06_decisions.md` D157 BEFORE ANYTHING ELSE.**

The weekend-into-Monday sequence reshaped the week's plan:

- Sunday 19 Apr was meant to be diagnostic + epistemic diversity spec per Saturday's continuity brief. Actual use: cost incident investigation, post-mortem drafted (in chat session only, not committed).
- Monday 20 Apr was meant to start Architect Reviewer build (D156 Stage 1). Actual use: family day + evening admin. Anthropic cap raised to $200 to carry through remainder of April billing cycle.
- Tuesday 21 Apr onwards: see "REVISED PLAN" section below.

The epistemic diversity build (D156 Stages 1+2) is NOT cancelled but is reordered behind the ID003 remediation chain. Rationale: the cost incident has moved closer to the business than silent pipeline failures, because it is tangibly bleeding money, and the fix chain is small and contained.

---

## SESSION STARTUP PROTOCOL

1. Read this file (`docs/00_sync_state.md`)
2. Read `docs/incidents/2026-04-19-cost-spike.md` — full post-mortem on ID003
3. Read `docs/06_decisions.md` D157 — two-stop budget enforcement architecture
4. Read `docs/briefs/2026-04-20-cost-guardrails.md` — Stop 2 build spec
5. Read `docs/15_pre_post_sales_criteria.md` v3 — authoritative pre-sales gate (new items A27/A28/A29 added)
6. Query `k.vw_table_summary` before working on any table
7. **Session-close SOP (D150):** verify every commit with `git ls-remote origin main | grep <sha>` before asserting it in sync_state

---

## REVISED PLAN 21–27 APRIL

Saturday's plan assumed a healthy pipeline. The ID003 incident means the pipeline is **currently dormant** (Anthropic cap enforced; no LLM calls since Sunday 02:40 AEST). Restoring the pipeline safely requires a specific sequence.

### Tuesday 21 April — ai-worker three-part fix

Ship the remediation per `docs/incidents/2026-04-19-cost-spike.md` "Fix plan":

1. **Payload diet** — ai-worker reads `body_excerpt` not `body_text`
2. **Idempotency guard** — skip LLM call if already-logged in last 5 minutes
3. **Retry cap** — `sweep-stale-running` respects `attempts < 3`
4. **Edge Function timeout** — raise to 180s if currently default

Deploy. Verify one clean ai_job end-to-end before leaving the session.

**Do NOT raise the Anthropic cap today.** Keep it at $200. ICE has ~$44 of headroom — that's the test window.

### Wednesday 22 April — verify clean operation + build cost-guardrails DDL

Morning: verify the Tuesday fix is producing 1 LLM call per ai_job and that `m.ai_usage_log` shows no retry multipliers.

Afternoon: start `docs/briefs/2026-04-20-cost-guardrails.md` build — specifically the DDL (4 tables), seed `m.cost_expectation`, and `public.get_monitor_cost_summary()` RPC.

### Thursday 23 April — finish cost-guardrails build

- `ai-cost-tracker` Edge Function
- `public.apply_cost_throttle()` function
- Dashboard AI Costs panel
- End-to-end test with fake high-cost rows

### Friday 24 April — inbox anomaly monitor brief + build

Separate brief to be written: `docs/briefs/2026-04-20-inbox-anomaly-monitor.md` (not yet written — scope captured in D157).

### Saturday 25 April — week review + calibration prep

Pull 5 days of post-fix `m.ai_usage_log` data. Compare to provisional `m.cost_expectation` seed. Adjust expected values.

### Sunday 26 April — rest

### Monday 27 April — epistemic diversity (resumed)

If ID003 chain is fully closed, resume D156 Architect Reviewer build as originally planned for 20 Apr. If not, continue remediation.

Also: 27 Apr is the Meta App Review escalation trigger if still In Review. Contact Meta dev support if so.

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active, but paused on client expansion until cost controls in place)
**Gate status:** Pre-sales gate NOT CLEARED. docs/15 v3 + new A27/A28/A29 from ID003 = 31 total items. 7 closed. 24 open.

**Operational status:** Pipeline dormant. Anthropic cap at $200/month, ~$44 headroom remaining for April. Publishing of already-queued content may still proceed (publishers do not call LLM). No new drafts being generated.

---

## ALL CLIENTS — STATE (POST D155 + ID003)

| Client | client_id | FB token | IG config | LI config | Prompts FB/IG/LI | ID003 impact |
|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ permanent | ✅ active | ✅ active | 3/3/3 | Primary cost-driver in ID003 (277 of 380 Apr 17 drafts) |
| Property Pulse | 4036a6b5 | ✅ permanent | ✅ active | ✅ active | 3/3/3 | Secondary cost-driver (79 of 380 drafts) |
| Care For Welfare | 3eca32aa | ✅ permanent | ⚠ mode=null | ⚠ mode=null | 0/0/0 (A11b) | Minor impact (24 drafts) |
| Invegent | 93494a09 | ✅ permanent | ⚠ mode=null | ⚠ mode=null | 0/0/0 (A11b) | None — no active prompts |

All 4 FB tokens permanent (`expires_at: 0`). D153 (A23) still pending for live revocation detection.

---

## PIPELINE HEALTH

### ai_job status (as of 20 Apr 2026 evening)

| Status | Count | Note |
|---|---|---|
| succeeded | — | Last successful completion approx 19 Apr 02:40 AEST |
| queued | 0 | Empty |
| running | 0 | Empty |
| failed | 13 | From ID003 — need Tuesday triage; these are retry-loop casualties |

Pipeline at rest. No LLM calls in 48+ hours (as of 20 Apr evening). Publishing of previously-queued content continues via Facebook API only.

### Seeder crons

| Job | jobid | Active |
|---|---|---|
| seed-and-enqueue-facebook-every-10m | 11 | ✅ but producing no seeds (upstream content flow quiet) |
| seed-and-enqueue-instagram-every-10m | 64 | ✅ |
| seed-and-enqueue-linkedin-every-10m | 65 | ✅ |
| **sweep-stale-running-every-10m** | **9** | ✅ — **KNOWN-BUGGY, will be fixed Tuesday** |

Total active crons: 42.

### Publish queue (post-D155 + pre-ID003-fix)

| Client | Platform | Queued | Note |
|---|---|---|---|
| Care For Welfare | Facebook | 7 | Publishing continues |
| NDIS-Yarns | Facebook | 10 | Publishing continues |
| Property Pulse | Facebook | 19 | Publishing continues |

~3 days of FB content queued. New content generation paused until Tuesday fix.

---

## COST STATUS

**April billing cycle:** 1 April → 30 April
**Spent month-to-date:** ~$156 USD (most of which is ID003)
**Anthropic console cap:** $200 USD (raised Monday 20 Apr evening from $150)
**Headroom remaining this month:** ~$44 USD
**Resets:** 1 May 2026

**Post-fix operating target:** ~$18 USD/month (to be recalibrated after 7 days of post-fix data — see D157)

**Stop 1 (Anthropic console) target after fix:** $30 USD/month — will set once cost-guardrails calibration complete.

---

## DECISIONS LOGGED — RECENT

| ID | Title | Status |
|---|---|---|
| D147 | Pilot structure with liability waiver | ✅ DECIDED |
| D148 | Buyer-risk clause | ✅ DIRECTION SET |
| D149 | Four-advisor architecture | 🔲 BUILD NEXT (deferred to late week) |
| D150 | Session-close trust-but-verify protocol | ✅ ADOPTED |
| D151 | Universal table-purpose rule | ✅ ADOPTED |
| D152 | Seeder post_draft.client_id fix | ✅ APPLIED |
| D153 | Token-health cron should call Meta /debug_token live | 🔲 BUILD NEXT |
| D154 | Native LinkedIn draft flow | ✅ APPLIED |
| D155 | Enqueue trigger ON CONFLICT clause fix | ✅ APPLIED |
| D156 | External epistemic diversity layer | 🔲 STRATEGIC DIRECTION — build resumed Mon 27 Apr |
| **D157** | **Two-stop budget enforcement (ICE internal + Anthropic console)** | **✅ ARCHITECTURAL — build this week** |

---

## INCIDENTS LOGGED — RECENT

| ID | Title | Status |
|---|---|---|
| ID003 | AI cost retry loop (15–19 Apr, ~$155 AUD) | ⚠ Contained, remediation pending Tuesday |

---

## META BUSINESS VERIFICATION

| Item | Status |
|---|---|
| 2FA block on PK admin | ✅ Cleared |
| Shrishti admin 2FA + passkey | ⏳ Pending — PK to chase |
| invegent.com DNS TXT verify | ✅ Verified |
| Business verification | ⏳ In Review |
| App Review | ⏳ In Review — **27 Apr = escalation trigger** |

---

## TOKEN CALENDAR

| Platform | Client | Sentinel expiry | Reality |
|---|---|---|---|
| YouTube | NDIS Yarns | 7 Apr 2031 | ✅ |
| YouTube | Property Pulse | 2 Apr 2031 | ✅ |
| Facebook | All 4 clients | 2099-12-31 (permanent) | ✅ verified via /debug_token 18 Apr |
| Instagram | All 4 clients | 2099-12-31 (shared FB token) | ✅ |

Sentinel is temporary until D153/A23 live /debug_token alerter is built.

---

## PRE-SALES SECTION A — UPDATED SNAPSHOT (31 items, 7 closed, 24 open)

**See `docs/15_pre_post_sales_criteria.md` for full detail. Summary only.**

### Closed (7)
- A9, A10a, A11a, A12, A13, A15, A19

### Open — original 21 items (from v3)
A1, A2, A3, A4, A5, A6, A7, A8, A10b, A11b, A14, A16, A17, A18, A20, A21, A22, A23, A24, A25, A26

### New from ID003 (3 items)
- **A27** — LLM-caller Edge Function audit. All ~8 LLM-calling functions beyond ai-worker need idempotency + retry-cap patterns applied where structurally necessary. Gate: Tuesday fix establishes the pattern.
- **A28** — Cost guardrails infrastructure (D157 Stop 2) live. Gate: `docs/briefs/2026-04-20-cost-guardrails.md` built and verified.
- **A29** — Inbox anomaly monitor live. Gate: separate brief + build by end of week.

---

## WATCH LIST

- **Tuesday 21 Apr** — ship ai-worker three-part fix
- **Wednesday 22 Apr** — verify clean operation, start cost-guardrails DDL
- **Friday 24 Apr** — cost-guardrails infrastructure live, calibration data collection starts
- **Sunday 26 Apr** — rest
- **Monday 27 Apr** — Meta App Review escalation trigger; D156 Architect Reviewer build resumes if ID003 chain closed
- **Saturday 2 May** — first weekly cost calibration cycle after post-fix baseline established
- Shrishti 2FA + passkey (Meta admin redundancy)
- 13 failed ai_jobs from ID003 need Tuesday triage (not urgent, not leaking money)
- Pipeline has been silent 48+ hours — confirm content seeds are arriving from ingest layer (may be a secondary issue masked by dormant LLM state)
