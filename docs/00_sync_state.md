# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-27 Monday late afternoon — **Phase B complete + Discovery Stage 1.1 done + Section 2 charter committed**
> Written by: PK + Claude session sync

---

## 🟢 27 APR MONDAY EVENING — TWO TRACKS RUNNING

### Critical state right now

**Track 1 — Gate B observation (autonomous, 5-7 days, started this morning):**

1. Phase B Stages 10-12 COMPLETE (53 migrations on `feature/slot-driven-v3-build`, ai-worker v2.11.0).
2. Phase A still autonomous (6 crons, 1,694+ pool).
3. Phase B running in shadow mode (5 crons firing, 35 shadow drafts, 2 content-quality failures).
4. R6 paused; FB+LI legacy publishing healthy.
5. Earliest Gate B exit: Sat 2 May.

**Track 2 — Concrete-the-pipeline (active build, Gate-B-safe):**

This morning PK reframed the gap: the system is "patchy" because the UI doesn't expose what's happening upstream and downstream of the slot-driven core. The track has two sections so far, with parallel-safe build during Gate B.

- **Section 1 — Discovery & Onboarding** ← Stage 1.1 ✅ DONE 27 Apr afternoon. Stages 1.2–1.5 pending.
- **Section 2 — Publisher Observability** ← Charter committed; Stage 2.1 brief committed 27 Apr evening.

### Today's Section 1 deltas (afternoon)

| Item | Status |
|---|---|
| Discovery Stage 1.1 brief | ✅ commit (chat) |
| Stage 1.1 migrations 001 + 002 | ✅ applied via Supabase MCP, V1–V6 passed |
| Stage 1.1 frontend (Form + List + clients/page wire-up) | ✅ commits `afc1727` (001), `741f3bc` (002), `57e7da9` (frontend), `c32aaf9` (component split) |
| Stage 1.1 V8 browser test | ✅ PK confirmed in Vercel preview |
| Stage 1.1 merge to main | ✅ both repos merged (content-engine `373c239..741f3bc`, dashboard `2e5fb33..c32aaf9`) |
| 9 CFW seeds in `f.feed_discovery_seed` | ✅ status=pending, vertical=ndis, awaiting tonight's 8pm UTC firing |

### Today's Section 2 deltas (evening)

| Item | Status |
|---|---|
| Publishing audit (5 root causes identified) | ✅ chat |
| CFW feed cleanup (24 inherited NDIS-Yarns assignments removed) | ✅ via Supabase MCP — only 2 OT-aligned feeds remain |
| Section 2 charter committed | ✅ `0ba0b03f` |
| Stage 2.1 brief committed | ✅ `32e7fab7` |

### Publishing audit findings (key finding for Section 2)

5 distinct root causes for missed scheduled slots, none visible in the dashboard:

1. **`mode` is NULL** on CFW Facebook, CFW LinkedIn, Invegent Facebook, Invegent LinkedIn → publisher silently skips them (filters `WHERE mode='auto'`). NOT FIXED via SQL — Stage 2.1 ships UI controls so PK can see and fix this deliberately.
2. **`r6_enabled` is false** for CFW + Invegent (true for NDIS-Yarns + Property Pulse) → no publishing pathway active. Same — Stage 2.1 surfaces it.
3. **CFW had 24 inherited NDIS-Yarns feed assignments** hidden because UI filters on `is_enabled=true`. ✅ CFW assignments cleaned this evening; Stage 2.2 will surface assigned-but-disabled rows for future cases.
4. **Instagram has no per-client UI control** — paused at cron level (jobid 53, Meta restriction). Deferred to Stage 2.5.
5. **YouTube hasn't published in 14+ days** despite valid tokens. No UI explanation. Deferred to Stage 2.5 root-cause drill-down.

### Stage 1.1 architectural addition

`f.feed_discovery_seed` now has `client_id uuid` column (FK to `c.client`, ON DELETE SET NULL, partial index `ix_feed_discovery_seed_client_id WHERE client_id IS NOT NULL`). Existing 9 seeds remain with NULL client_id (operator-submitted). New seeds carry the client_id. RPC `public.add_client_discovery_seeds(p_client_id, p_keywords, p_example_urls)` derives `vertical_slug` from `c.client_content_scope.is_primary` + weight, falls back to `'general'`. Idempotent on `(client_id, lower(seed_value))` per type.

### Section 2 charter

5 stages planned, ~16-20 hrs CC + several chat sessions:

- **2.1** Per-platform toggles (mode, r6_enabled, publish_enabled, auto_approve_enabled) on Overview tab — brief ready
- **2.2** Assigned-but-disabled feed visibility on Feeds tab
- **2.3** Slot outcome resolver function — reason codes per scheduled slot
- **2.4** Schedule adherence view using 2.3
- **2.5** YouTube root-cause drill-down + Instagram per-client surface

Section 2 done = no SQL needed to diagnose missed publishing, every slot resolves to a reason code visible in dashboard.

---

## ⛔ DO NOT TOUCH NEXT SESSION

(Phase B Gate B items unchanged from prior version of this file — see commit history if needed.)

Plus new:

- The 9 CFW seeds in `f.feed_discovery_seed` (`status='pending'`, awaiting tonight's 8pm UTC firing).
- The 4 NULL `mode` rows in `c.client_publish_profile` (CFW FB, CFW LinkedIn, Invegent FB, Invegent LinkedIn). These are deliberately left NULL until Stage 2.1 UI ships and PK fixes them through the dashboard.
- The 5 `r6_enabled=false` rows on CFW + Invegent. Same reason as above.

---

## 🟡 NEXT SESSION (Tue 28 Apr)

### Morning order of operations

1. **V7 — Discovery cron pickup check.** Run from chat:
```sql
SELECT seed_value, status, feed_source_id IS NOT NULL AS has_feed, error_message
FROM f.feed_discovery_seed
WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid
ORDER BY created_at DESC;
```
Expect ≥1 of the 9 CFW seeds transitioned `pending → provisioned` (or `failed` with error_message). RSS.app may not provision every seed — that's expected and Stage 1.2 review-queue territory.

2. **Hand Stage 2.1 brief to CC.** Brief at `docs/briefs/2026-04-27-publisher-stage-2.1-overview-toggles.md`. CC runs 4 pre-flights, applies migrations 003 + 004, runs V1-V7, then frontend in `feature/publisher-stage-2.1` branch.

3. **Chat writes Stage 1.2 brief.** Based on what V7 shows. If most seeds provisioned, 1.2 is straightforward review-queue UI. If many failed, 1.2 needs failed-seed UX too. Hand to CC after Stage 2.1 ships.

4. **Daily Gate B observation check (~10 min).** Pool health, evergreen ratio, slot confidence, recovery rate, ai_job failure trend, cost per draft. See "Gate B observation" section in prior commit for full metric list.

### Parallel pre-sales work (any time)

A11b content prompts × 18 rows, A6 subscription costs (genuinely 1-hour task), A4→A3 proof doc, A18 source-less EFs.

---

## TODAY'S COMMITS (27 APR EVENING ADDITIONS)

**Invegent-content-engine — `main`:**

- `0ba0b03f` — docs(briefs): Section 2 charter — Publisher Observability
- `32e7fab7` — docs(briefs): Publisher Stage 2.1 — per-platform toggles on Overview
- THIS COMMIT — docs(sync_state): Section 1 done, Section 2 charter, publishing audit findings

(Earlier today: Stage 1.1 brief + execution covered in `feature/discovery-stage-1.1` branch, since merged to main.)

**invegent-dashboard — `main`:**

- `57e7da9` — feat: Discovery Stage 1.1 frontend (Form + List + Onboarding tab wire-up)
- `c32aaf9` — refactor: split Form + List per brief, router.refresh() coordination

**Migrations applied this session (Stage 1.1):**

- 001 — `f.feed_discovery_seed.client_id` column + partial index
- 002 — `public.add_client_discovery_seeds` RPC

(Plus 53 from earlier Phase A + B work, captured in prior version of this file.)

---

## ARCHITECTURAL ADDITIONS THIS SESSION

None to v4 (Phase B). Added:

- **`f.feed_discovery_seed.client_id`** column for per-client discovery seed attribution
- **`public.add_client_discovery_seeds`** RPC with vertical_slug derivation
- (Pending) `c.client_publish_profile_audit` table — append-only toggle audit trail (Stage 2.1)
- (Pending) `public.update_publish_profile_toggle` RPC — per-platform toggle writer (Stage 2.1)

---

## CLOSING NOTE FOR NEXT SESSION

Tue 28 Apr is two-track day from the start:

- **Background:** Gate B observation continues. ~10 min check.
- **Foreground:** V7 first (must be done in early Sydney morning to catch overnight cron output), then Stage 2.1 to CC, then chat writes Stage 1.2 based on V7.

**Realistic ambition for Tue:** Stage 2.1 shipped, Stage 1.2 brief written, V7 reviewed, sync_state updated. Maybe Stage 1.2 execution started if CC moves quickly on 2.1.

**State at close (27 Apr ~6:00pm Sydney):**

- Phase A still autonomous, Phase B autonomous in shadow
- Discovery Stage 1.1 in production, 9 CFW seeds awaiting overnight cron
- Section 2 charter and Stage 2.1 brief ready for CC
- CFW feed pool clean (only 2 OT-aligned feeds, no inherited NDIS-Yarns clones)
- 4 mode-NULL rows + 5 r6_enabled-false rows deliberately preserved for Stage 2.1 UI to expose
- Total Phase A + B + Section 1 + Section 2 brief commits today: solid productive day

---

## END OF MONDAY 27 APR SESSION (EVENING UPDATE)

Next session: V7 + Stage 2.1 CC handoff + Stage 1.2 brief.
