# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-27 Monday late evening — **Stage 2.1 SHIPPED, publishing pipeline turned on for CFW + Invegent**
> Written by: PK + Claude session sync

---

## 🟢 27 APR MONDAY LATE EVENING — STAGE 2.1 SHIPPED + FULL FLEET MODE=AUTO

### What changed in the final hour

PK accelerated through Stage 2.1 V8 in a single sitting and did something the brief did not anticipate: rather than test-and-revert, PK used the new toggles to **deliberately enable mode=auto + r6_enabled=true + publish_enabled=true + auto_approve_enabled=true across all 13 client × platform rows in production**.

CFW Facebook, CFW LinkedIn, CFW Instagram, Invegent Facebook, Invegent Instagram, Invegent LinkedIn (last one initially missed and corrected in browser) all now have a complete publishing config matching NDIS-Yarns and Property Pulse. The 4 mode-NULL rows + 5 r6_enabled-false rows are gone. Every change captured in `c.client_publish_profile_audit` with `changed_by='dashboard'`.

This is a meaningful operational state change beyond what Stage 2.1 was specified to deliver, and it is exactly what we wanted from Section 2 — PK regained control through the UI without a single SQL UPDATE.

### Critical state right now

**Track 1 — Gate B observation (autonomous, 5-7 days):**

1. Phase B Stages 10-12 COMPLETE (53 migrations on `feature/slot-driven-v3-build`, ai-worker v2.11.0).
2. Phase A still autonomous (6 crons, 1,694+ pool).
3. Phase B running in shadow mode (5 crons firing, 35+ shadow drafts, 2 content-quality failures).
4. R6 paused; FB+LI legacy publishing healthy.
5. Earliest Gate B exit: Sat 2 May.

**Track 2 — Concrete-the-pipeline (Section 2 Stage 2.1 ✅ DONE):**

- **Section 1 — Discovery & Onboarding** ← Stage 1.1 ✅ DONE 27 Apr afternoon. 9 CFW seeds awaiting tonight's 8pm UTC firing (V7 tomorrow morning). Stages 1.2-1.5 pending.
- **Section 2 — Publisher Observability** ← Charter committed; **Stage 2.1 ✅ SHIPPED 27 Apr evening**. Stages 2.2-2.5 pending.

### Today's Section 1 deltas (afternoon)

| Item | Status |
|---|---|
| Discovery Stage 1.1 brief | ✅ commit (chat) |
| Stage 1.1 migrations 001 + 002 | ✅ applied via Supabase MCP, V1-V6 passed |
| Stage 1.1 frontend (Form + List + clients/page wire-up) | ✅ commits `afc1727` (001), `741f3bc` (002), `57e7da9` (frontend), `c32aaf9` (component split) |
| Stage 1.1 V8 browser test | ✅ PK confirmed in Vercel preview |
| Stage 1.1 merge to main | ✅ both repos merged |
| 9 CFW seeds in `f.feed_discovery_seed` | ✅ status=pending, vertical=ndis, awaiting tonight's 8pm UTC firing |

### Today's Section 2 deltas (evening)

| Item | Status |
|---|---|
| Publishing audit (5 root causes identified) | ✅ chat |
| CFW feed cleanup (24 inherited NDIS-Yarns assignments removed) | ✅ via Supabase MCP — only 2 OT-aligned feeds remain |
| Section 2 charter committed | ✅ `0ba0b03f` |
| Stage 2.1 brief committed | ✅ `32e7fab7` |
| Stage 2.1 migrations 003 + 004 applied | ✅ V1 passed |
| Stage 2.1 V2-V7 RPC verification | ✅ all passed |
| Stage 2.1 frontend (server action + toggle component + Overview wire-up) | ✅ on `feature/publisher-stage-2.1` |
| Stage 2.1 V8 browser test | ✅ PK ran through 13 rows, audit captured every click |
| Stage 2.1 merge to main | ✅ both repos merged: content-engine `cee982a..f10c18b`, dashboard `c32aaf9..fb23a09` |
| Feature branches deleted (local + remote) | ✅ |
| **Production state change**: 13 rows now mode=auto + r6_enabled=true + publish_enabled=true + auto_approve_enabled=true | ✅ deliberate via UI |

### Stage 1.1 architectural addition

`f.feed_discovery_seed` now has `client_id uuid` column (FK to `c.client`, ON DELETE SET NULL, partial index `ix_feed_discovery_seed_client_id WHERE client_id IS NOT NULL`). Existing 9 seeds remain with NULL client_id (operator-submitted). New seeds carry the client_id. RPC `public.add_client_discovery_seeds(p_client_id, p_keywords, p_example_urls)` derives `vertical_slug` from `c.client_content_scope.is_primary` + weight, falls back to `'general'`. Idempotent on `(client_id, lower(seed_value))` per type.

### Stage 2.1 architectural additions

- **`c.client_publish_profile_audit`** table — append-only audit of every toggle change. Columns: `audit_id, client_id, platform, field, old_value::jsonb, new_value::jsonb, changed_by, changed_at`. Index on `(client_id, platform, changed_at DESC)`.
- **`public.update_publish_profile_toggle(uuid, text, text, jsonb, text)`** RPC — `SECURITY DEFINER`, validates field against allowed set (`mode`, `publish_enabled`, `r6_enabled`, `auto_approve_enabled`), validates value type per field, updates row + writes audit row in same transaction. RPC enforces allowed mode values (`'auto'`, `'manual'`, `'staging'`, or NULL only) since DB has no CHECK constraint on `mode`.
- **`PublishProfileToggles`** client component in invegent-dashboard. Mode 3-button group (Auto/Manual/Staging) + 3 boolean pill toggles (Publishing, R6 enabled, Auto-approve). Optimistic UI with rollback on RPC error. Lesson #33 destructuring throughout.

### Section 2 charter

5 stages planned, ~16-20 hrs CC + several chat sessions:

- **2.1** ✅ DONE — Per-platform toggles on Overview tab
- **2.2** Assigned-but-disabled feed visibility on Feeds tab
- **2.3** Slot outcome resolver function — reason codes per scheduled slot
- **2.4** Schedule adherence view using 2.3
- **2.5** YouTube root-cause drill-down + Instagram per-client surface

Section 2 done = no SQL needed to diagnose missed publishing, every slot resolves to a reason code visible in dashboard.

### Publishing pipeline state — newly ENABLED for 4 of 4 clients

All 13 active client × platform rows now configured for autonomous publishing:

| Client | Platforms with mode=auto + r6=true | Notes |
|---|---|---|
| **Care for Welfare** | facebook, linkedin, instagram (3) | NEW — was 0 of 3 in mode=auto until tonight |
| **Invegent** | facebook, linkedin, instagram (3) | NEW — was 0 of 3 in mode=auto until tonight |
| **NDIS-Yarns** | facebook, linkedin, instagram, youtube (4) | unchanged from prior state |
| **Property Pulse** | facebook, linkedin, instagram, youtube (4) | unchanged from prior state |

Whether posts actually start flowing for CFW + Invegent depends on the chain: discovery → ingest → bundler → ai-worker → auto-approve → queue → publisher. Tonight's 8pm UTC discovery cron is the next link to fire. V7 tomorrow morning surfaces whether RSS.app provisioned the 9 CFW seeds. Subsequent 24-48h of pipeline data tells us whether CFW + Invegent actually publish.

If posts don't start flowing within 48h, **Stage 2.3 (slot outcome resolver) becomes urgent** — we need reason codes per missed slot to diagnose without another publishing audit session.

---

## ⛔ DO NOT TOUCH NEXT SESSION

(Phase B Gate B items unchanged.)

Plus:

- The 9 CFW seeds in `f.feed_discovery_seed` (`status='pending'`, awaiting tonight's 8pm UTC firing). V7 tomorrow morning checks for transitions.
- The newly-enabled CFW + Invegent publishing rows (13 total in mode=auto + r6=true). Let the pipeline run, observe, fix via UI if anything misbehaves.
- The `c.client_publish_profile_audit` table — append-only by design. Don't truncate, don't add triggers, don't reformat.

---

## 🟡 NEXT SESSION (Tue 28 Apr)

### Morning order of operations

1. **V7 — Discovery cron pickup check** (~7am Sydney). Run from chat:
```sql
SELECT seed_value, status, feed_source_id IS NOT NULL AS has_feed, error_message
FROM f.feed_discovery_seed
WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae'::uuid
ORDER BY created_at DESC;
```
Expect ≥1 of the 9 CFW seeds transitioned `pending → provisioned` (or `failed` with error_message). RSS.app may not provision every seed — that's expected and Stage 1.2 review-queue territory.

2. **Stage 2.1 post-deploy reality check.** Did anything publish for CFW or Invegent overnight? If yes, the chain works end-to-end and we're in observe-mode. If no, run a quick diagnostic on which stage of the chain is the new blocker (likely: feed pool too thin → no relevant content → no draft → no queue item).

3. **Chat writes Stage 1.2 brief.** Based on what V7 shows.

4. **Daily Gate B observation check (~10 min).** Pool health, evergreen ratio, slot confidence, recovery rate, ai_job failure trend, cost per draft.

### Parallel pre-sales work (any time)

A11b content prompts × 18 rows, A6 subscription costs (genuinely 1-hour task), A4→A3 proof doc, A18 source-less EFs.

---

## TODAY'S FINAL COMMITS (27 APR LATE EVENING)

**Invegent-content-engine — `main`:**

- `0ba0b03f` — docs(briefs): Section 2 charter — Publisher Observability
- `32e7fab7` — docs(briefs): Publisher Stage 2.1 — per-platform toggles on Overview
- `cee982a` — docs(sync_state): Section 1 done, Section 2 charter, publishing audit findings
- `f10c18b` — Stage 2.1 migrations 003 + 004 (audit table + toggle RPC)
- THIS COMMIT — docs(sync_state): Stage 2.1 SHIPPED + full fleet enabled

**invegent-dashboard — `main`:**

- `57e7da9` — feat: Discovery Stage 1.1 frontend
- `c32aaf9` — refactor: Discovery component split + router.refresh()
- `fb23a09` — feat: Stage 2.1 publisher profile toggles

**Migrations applied this session (4 total):**

- 001 — `f.feed_discovery_seed.client_id` column + partial index
- 002 — `public.add_client_discovery_seeds` RPC
- 003 — `c.client_publish_profile_audit` table
- 004 — `public.update_publish_profile_toggle` RPC

(Plus 53 from earlier Phase A + B work, captured in prior versions of this file.)

---

## CLOSING NOTE FOR NEXT SESSION

27 Apr was a 12+ hour session that closed with:

- Phase A + B in production, Gate B observation running autonomously
- Discovery Stage 1.1 shipped, 9 CFW seeds queued for overnight discovery cron
- Section 2 charter + Stage 2.1 brief written, executed, shipped, deployed all in one day
- **Publishing pipeline turned on for CFW + Invegent for the first time** — they were sitting in mode-NULL no-man's-land for unknown duration; UI surfaced the gap, PK fixed it deliberately
- Audit table captured 11+ deliberate config changes via dashboard
- 0 SQL UPDATEs to fix configuration. Every change went through the UI.

That is exactly the operational pattern Section 2 was designed to deliver. The remaining stages (2.2-2.5) extend it: feed visibility, slot reason codes, schedule adherence view, YouTube/IG drill-down.

**State at close (27 Apr ~midnight Sydney):**

- Phase A still autonomous, Phase B autonomous in shadow
- Discovery Stage 1.1 in production
- Stage 2.1 in production
- 13 client × platform publishing configs all green (mode=auto, r6=true, publish_enabled=true, auto_approve_enabled=true)
- Tonight's 8pm UTC = first overnight test of: do CFW seeds provision? does new pipeline produce drafts for CFW/Invegent overnight?
- Pre-sales register: 14 of 30 closed (no change tonight)

**Realistic ambition for Tue 28 Apr:** V7 + Stage 1.2 brief + observe Stage 2.1 outcomes. If anything publishes for CFW or Invegent overnight, Stage 2.3 (slot resolver) can wait. If nothing publishes, Stage 2.3 jumps the queue.

---

## END OF MONDAY 27 APR SESSION (FINAL)

Next session: V7 + post-deploy observation + Stage 1.2 brief.
