# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-25 Saturday evening AEST — **M12 cross-post bug VERIFIED FIXED via instagram-publisher v2.0.0 (deployed --no-verify-jwt, platform discipline confirmed in production); A10b deferred on Meta API restriction**
> Written by: PK + Claude session sync

---

## 🟢 25 APR SATURDAY AFTERNOON — M12 CLOSURE: IG PUBLISHER v2.0.0 SHIPPED

### In one paragraph

After the morning R6 cutover, PK approved Invegent IG drafts and unpaused IG cron (jobid 53). 4 Invegent IG posts published cleanly. NY/PP didn't publish anything despite 22+ approved+due drafts each. Investigation: instagram-publisher v1.0.0 queries `m.post_draft` directly **without filtering `pd.platform = 'instagram'`** — sorts oldest-first, hits old FB drafts. Worse: **18 NY IG posts on 19 April were ALL cross-posted from FB-platform drafts** (verified `pp.platform='instagram'` AND `pd.platform='facebook'`). FB-shaped content went live on the actual NDIS Yarns Instagram account. PK chose: (a) delete the 18 cross-posts via Meta Graph API, (b) full queue-based refactor of IG publisher — not a surgical fix. Shipped instagram-publisher v2.0.0 mirroring FB publisher (publisher v1.7.0) architecture: `m.publisher_lock_queue_v1(p_platform='instagram')` for atomic locking with built-in throttle, defensive platform check at THREE layers (lock RPC + queue row + draft), image hold gate, video hold gate, carousel path with multi-slide upload, single-image fallback, 10-min failure backoff with `last_error` captured, schedule check via `get_next_publish_slot`, auto-promote to `approval_status='published'` on success. IG cron stays paused until PK deploys EF and verifies via dry-run.

### What's shipped

| Artefact | Location | Status |
|---|---|---|
| **instagram-publisher v2.0.0** | `supabase/functions/instagram-publisher/index.ts` (commit `562ab3e`) | ✅ Deployed with `--no-verify-jwt` (deployment version 17). Platform discipline VERIFIED 25 Apr 08:15 UTC live tick: failed-publish row `m.post_publish.platforms_match = TRUE` proves the EF correctly identified the locked queue row's draft as IG-platform. Cross-post bug FIXED. Cron 53 currently `active=false` while Meta-side restriction clears — see backlog "Meta restriction recovery sequence". |
| **Cron command updated** | jobid 53, migration `update_ig_publisher_cron_for_v2_20260425` | Applied; cron stays `active=false` |
| **D169 decision** | `docs/decisions/D169_instagram_publisher_v2_queue_refactor.md` (commit `7d8c8b5`) | ✅ |
| **Cleanup script for 18 cross-posts** | `scripts/delete_ny_ig_crosspost_cleanup_20260419.sh` (commit `f0c34f3`) | ✅ Awaits PK action with `$NY_IG_TOKEN` |

### Critical state right now

1. **IG cron jobid 53 is PAUSED.** Stays paused until v2.0.0 deployed and verified.
2. **R6 still producing real R5-driven drafts every 10 min.** NY 84 + PP 73 drafts in ~90 min window earlier. ai_jobs flowing.
3. **R6-produced FB and LI publishing are unaffected.** Today's pipeline: 4 Invegent IG (clean), 3 PP LI (note: cap breach, see below), 0 FB (already at cap), 0 NY IG (publisher couldn't pick).
4. **18 cross-post media IDs captured in cleanup script** with full title + timestamp audit. Safe to run anytime.
5. **`m.post_publish` records for the 18 cross-posts retained as historical audit.** No DELETE on m.post_publish — only on Meta side.

### M12 problem proof — what was found

```sql
-- The smoking gun: oldest "approved IG-target" draft from v1.0.0's perspective for NY
SELECT pd.platform AS draft_platform, pd.created_at AT TIME ZONE 'Australia/Sydney' AS created_aest, LEFT(pd.draft_title, 60) AS title
FROM m.post_draft pd
WHERE pd.client_id = 'fb98a472-...-ndis-yarns'::uuid
  AND pd.approval_status = 'approved'
  AND pd.recommended_format != 'text'
  AND (pd.image_url IS NOT NULL OR pd.video_url IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM m.post_publish pp WHERE pp.post_draft_id = pd.post_draft_id AND pp.platform = 'instagram')
ORDER BY pd.created_at ASC LIMIT 1;

-- Result: A 13 April Facebook draft titled "When dementia care shifts from managing to understanding"
-- That's what v1.0.0 would have published to NY Instagram.
```

```sql
-- Historical damage (19 Apr 2026, 12:30 - 16:00 AEST, 18 posts in 3.5 hours)
SELECT c.client_slug, pd.platform AS draft_platform, pp.platform AS publish_platform, COUNT(*) AS n
FROM m.post_publish pp
JOIN c.client c ON c.client_id = pp.client_id
LEFT JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
WHERE pp.platform = 'instagram'
GROUP BY c.client_slug, pd.platform, pp.platform;

-- ndis-yarns | facebook  | instagram | 18  ← cross-posts (the bug)
-- invegent   | instagram | instagram |  4  ← clean (today's R6-driven publishes)
```

### v2.0.0 architecture — three-layer platform discipline

```
Cron tick → instagram-publisher (HTTP POST)
         ↓
[Layer 1] m.publisher_lock_queue_v1(p_platform='instagram')
   ↓ filters WHERE q.platform = 'instagram' at SQL level
   ↓ enforces max_per_day + min_gap_minutes via lock RPC
   ↓ FOR UPDATE SKIP LOCKED — concurrent ticks can't double-process
   ↓ sets status='running' atomically
   ↓
[Layer 2] EF defensive check: q.platform === 'instagram'
   ↓ if not → fail loudly with platform_mismatch
   ↓
[Layer 3] EF defensive check: draft.platform === 'instagram'
   ↓ if not → fail loudly with draft_platform_mismatch
   ↓ writes m.post_publish status='failed' for audit trail
   ↓
[Publish] IG Graph API call (single, reel, or carousel)
   ↓ writes m.post_publish status='published' on success
   ↓ promotes draft to approval_status='published'
```

Defence-in-depth. Same class of bug failing at any one layer alone would not produce a cross-post. v1.0.0 had zero of these checks.

### Deploy + verification sequence (for PK reference)

```bash
# 1. Deploy v2.0.0
cd C:\Users\parve\Invegent-content-engine
git pull
supabase functions deploy instagram-publisher

# 2. Health check (should return v2.0.0)
curl https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/instagram-publisher/health

# 3. Dry run (no real publishes, validates lock + filter logic)
curl -X POST https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/instagram-publisher \
  -H "x-publisher-key: $PUBLISHER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 2, "dry_run": true}'

# 4. If dry run shows correct platform-tagged rows being locked:
SELECT cron.alter_job(53, active := true);

# 5. Monitor first 30 min
SELECT * FROM cron.job_run_details WHERE jobid = 53 ORDER BY start_time DESC LIMIT 5;
SELECT * FROM m.post_publish WHERE platform = 'instagram' AND created_at > NOW() - INTERVAL '30 min';
```

### 18 cross-post deletion (independent of v2.0.0)

```bash
# Get NY IG token
SELECT page_access_token FROM c.client_publish_profile
WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid AND platform = 'instagram';

export NY_IG_TOKEN='paste_token_here'
bash scripts/delete_ny_ig_crosspost_cleanup_20260419.sh
```

### What v2.0.0 also closes (related findings)

- **PP LinkedIn race condition** earlier today (3 published vs cap=2 in 0.91 sec): same root cause class as M12. The `publisher_lock_queue_v1` RPC's DB-level `max_per_day` enforcement (not in-EF check) is what prevents this. v2.0.0 inherits this protection. **LI publisher needs auditing next session for whether it uses the lock RPC correctly.**
- **M11 enqueue trigger correctness verified** — all 75 active IG queue rows audited today: 100% have `platform='instagram'` AND `pd.platform='instagram'`. Trigger fix from 22 Apr is holding under R6 load.

### Open follow-ups from this session

1. **PK action: deploy v2.0.0.** EF code is on main; not yet pushed via supabase CLI to production. Do this from the local repo using PowerShell directly per the "Windows MCP times out on supabase functions deploy" memory rule.
2. **PK action: run cleanup script** to delete the 18 NY IG cross-posts. Independent of #1.
3. **PK action: unpause cron after v2.0.0 verified.** Sequence above.
4. **Sprint item — LI publisher audit.** Does it have an M12-class bug? Same diagnostic lens.
5. **Sprint item — PP LinkedIn race condition root cause.** RPC enforcement gap or publisher race.
6. **Sprint item — m.post_publish_queue.status CHECK.** Add 'dead' to vocabulary (D163 backlog item).
7. **Sprint item — Carousel verification.** First real IG carousel publish observation (v2.0.0 untested in production for carousel format).

---

## 🟢 25 APR SATURDAY MORNING — R6 LIVE (75 MIN CUTOVER)

### In one paragraph

PK opened the Saturday window with "let's finish the big job R6". Combined CC + here partition into a single interactive cutover. 75 minutes wall-clock. Eight migrations: pause crons → schema add (max_queued_per_platform + min_post_gap_minutes_override + r6_enabled, with backfill preserving NY+PP behaviour exactly) → trigger rewrite (Finding 1 cascade replaced with column reads) → seeder rewrite (R5-driven, Findings 4+6 closed, recommended_format populated, match_metadata in seed_payload). Two latent schema/dedup issues surfaced via smoke testing — both correctly fixed as structural improvements, not workarounds: (1) redundant `ux_post_seed_digest_item` index from D118 era was silently preventing multi-platform seeding of the same canonical (1,091 historical seeds had been dictating "one platform per item" without anyone realising) — **dropped**; (2) R5 v1.3 had a canonical-level dedup gap where the same canonical could be re-seeded via different digest_items pointing to it — **R5 v1.4 added active_seeds_per_canonical CTE**. Smoke tests across all 3 platforms produced 33 fresh seeds, zero duplicates, 8 cross-platform canonicals (multi-platform spread now real for the first time in system history). Re-enabled the 3 seed crons. R6 is live for NY + PP (r6_enabled=TRUE); CFW + Invegent gated off pending discovery/feed work per their adequacy grades. Pipeline now flows end-to-end: signal → classifier (R4) → demand grid (R3) → R5 match → R6 seed/draft/job → ai-worker → publish queue → publisher.

### R6 shipping state

**Function versions live:**
- `m.seed_and_enqueue_ai_jobs_v1(text, int)` — **v1.0.1** (R5-driven, grade-gated)
- `m.enqueue_publish_from_ai_job_v1()` — **R6 rewrite** (column reads, Finding 1 closed)
- `m.match_demand_to_canonicals(uuid, date, numeric, int)` — **v1.4** (active-seed canonical dedup)

**Schema additions to `c.client_publish_profile`:**
| Column | Type | Default | Purpose |
|---|---|---|---|
| `max_queued_per_platform` | INT NOT NULL | 10 | Replaces hardcoded UUID-cascade values in trigger |
| `min_post_gap_minutes_override` | INT | NULL | Overrides existing min_gap_minutes when needed |
| `r6_enabled` | BOOLEAN NOT NULL | FALSE | Per-(client, platform) gate for R5-driven seeding |

**Schema removals:**
- `m.ux_post_seed_digest_item` — redundant unique index (legacy single-platform constraint)

**Backfill exactly preserves trigger behaviour for NY + PP:**

| Client | Platform | max_queued | min_gap_override (min) | r6_enabled |
|---|---|---|---|---|
| NDIS-Yarns | facebook | 10 | 180 | TRUE |
| NDIS-Yarns | linkedin | 6 | 360 | TRUE |
| NDIS-Yarns | instagram | 6 | 360 | TRUE |
| Property Pulse | facebook | 20 | 90 | TRUE |
| Property Pulse | linkedin | 8 | 240 | TRUE |
| Property Pulse | instagram | 6 | 360 | TRUE |
| CFW (all) | * | 10 (default) | NULL | FALSE |
| Invegent (all) | * | 10 (default) | NULL | FALSE |

### Smoke test results (final)

| Metric | Value |
|---|---|
| Fresh seeds across 3 platforms | 33 |
| Drafts with `recommended_format` populated | 33/33 |
| Seeds with full `match_metadata` audit trail | 33/33 |
| Duplicate (canonical, platform, client) combos | 0 |
| Cross-platform canonicals (same content, multiple platforms) | 8 |
| Distinct platforms covered | 3 |
| R6 crons active | 3/3 |

### Performance flag

**`m.seed_and_enqueue_ai_jobs_v1` takes 26-101s per cron tick.** Most invocations under 60s, but 12:00 FB cron timed out (default Supabase pg_cron statement timeout is 30s; subsequent ticks succeeded). `EXPLAIN ANALYZE` shows `shared hit=5345677 buffers` per call. R6 performance optimisation needed before scaling beyond 4 clients. Likely culprit: R5 candidate-generation CTE.

---

## 🟢 24 APR LATE-EVENING SESSION 2 CLOSE — R5 + POOL-ADEQUACY DIAGNOSTIC

### Grade results (held overnight, confirmed Saturday morning + afternoon)

| Client | Demand | OK | At risk | Unfillable | Classes | Grade | Primary action |
|---|---|---|---|---|---|---|---|
| NDIS-Yarns | 24 | 24 | 0 | 0 | 6/6 | **A** | Healthy |
| Property Pulse | 24 | 24 | 0 | 0 | 6/6 | **A** | Healthy |
| CFW | 18 | 14 | 4 | 0 | 4/6 | **B** | FEED_CONFIG: enable more feeds for multi_point + educational |
| Invegent | 18 | 3 | 8 | 7 | 2/6 | **D** | DISCOVERY: feeds produce zero stat_heavy or timely_breaking canonicals |

---

## 🟢 24 APR — R4 STEP 3 LIVE (classifier function + sweep + cron)

R4 backfill confirmed complete. Distribution: analytical 52.2%, stat_heavy 16%, human_story 14.1%, multi_point 13.5%, educational_evergreen 2.7%, timely_breaking 1.5%. Classifier auto-running every 5m via jobid 68.

---

## 🟢 24 APR EVENING (INVEGENT v0.1 PROMPT STACK) — LI + YT SHIPPED

| Client | FB r/s/p | IG r/s/p | LI r/s/p | YT r/s/p | Total |
|---|---|---|---|---|---|
| NDIS-Yarns | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 12/12 |
| Property Pulse | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 12/12 |
| Care For Welfare | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 12/12 |
| Invegent | 0/0/0 | 0/0/0 | 1/1/1 | 1/1/1 | 6/6 |

---

## 🟢 24 APR EVENING — ROUTER CATALOG UNIFICATION SHIPPED

Extended `t.5.0_social_platform` + `t.5.3_content_format`. 29 FKs added.

### Router audit findings status (post-R6 + M12)

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Client UUIDs hardcoded in `m.enqueue_publish_from_ai_job_v1` | 🔴 HIGH | ✅ **CLOSED in R6** — column reads |
| 2 | Format vocab in 4 CHECKs | 🔴 HIGH | ✅ CLOSED — FK |
| 3 | Platform vocab in 3 CHECKs | 🔴 HIGH | ✅ CLOSED — FK |
| 4 | `seed_and_enqueue` demand formula hardcoded | 🟡 MED | ✅ **CLOSED in R6** — R5-driven |
| 5 | Stealth digest_policy defaults | 🟡 MED | ✅ CLOSED — explicit rows |
| 6 | `NOT IN ('youtube')` exclusion | 🟡 MED | ✅ **CLOSED in R6** — R6 doesn't process YouTube |
| 7 | Job priority magic numbers | 🟢 LOW | Deferred |
| 8 | AI provider CHECK | 🟢 LOW | Acceptable as-is |
| 9 | Validation view strict `= 100` | 🟢 LOW | ✅ CLOSED |

**6 of 9 router findings closed. All HIGHs closed. M12 IG publisher refactor closed an unrelated cross-post bug class.**

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else.** Two material shifts:
- R6 LIVE — every fresh draft is R5-driven
- M12 closed via instagram-publisher v2.0.0 (refactor) + 18-post cleanup script

### Critical state awareness

1. **R6 LIVE.** Every cron tick produces R5-matched drafts for NY + PP.
2. CFW + Invegent gated off (`r6_enabled=FALSE`).
3. Pool-adequacy diagnostic source-of-truth for "is this client ready".
4. **R6 performance: 26-101s per call.** Optimisation needed before 5+ clients.
5. **IG publisher v2.0.0 code on main but NOT YET DEPLOYED.** Cron jobid 53 paused.
6. **18 NY IG cross-posts script ready.** Awaits PK with token.
7. PP LinkedIn cap breach today (3 vs cap=2) — needs LI publisher audit.
8. CC-TASK-02 HIGH still dormant — PK to choose Option A vs B.
9. R7 (ai-worker platform-awareness) unblocked.
10. Reviewers paused per D162.

### Adequacy snapshot (run next session)

```sql
SELECT client_slug, adequacy_grade, primary_action FROM m.vw_match_pool_adequacy;
-- Expected: NY A, PP A, CFW B, Invegent D
```

### IG publisher v2.0.0 deploy verification (after PK deploys)

```sql
-- After PK runs `supabase functions deploy instagram-publisher`:
-- Check first dry-run tick succeeds
SELECT start_time AT TIME ZONE 'Australia/Sydney' AS aest, status, return_message
FROM cron.job_run_details
WHERE jobid = 53 AND start_time > NOW() - INTERVAL '30 min'
ORDER BY start_time DESC;

-- Verify first publish has matching draft platform (no cross-posts)
SELECT pd.platform = pp.platform AS platforms_match, COUNT(*)
FROM m.post_publish pp
JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
WHERE pp.platform = 'instagram' AND pp.created_at > NOW() - INTERVAL '24 hours'
GROUP BY pd.platform = pp.platform;
-- Expected: only TRUE rows
```

### Router state — snapshot

- ✅ R1/R2/R3: shadow infrastructure
- ✅ R4 classifier — FULLY LIVE
- ✅ R5 matching layer — FULLY LIVE (v1.4)
- ✅ Pool-adequacy diagnostic — LIVE
- ✅ **R6 seed_and_enqueue rewrite — LIVE**
- 🔲 R7: ai-worker platform-awareness — **NOW UNBLOCKED** (recommended_format + match_metadata in seed_payload)
- 🔲 R8: Cron changes — depends on performance investigation

### Publisher state — snapshot

- ✅ FB publisher (publisher v1.7.0) — queue-based, healthy
- ✅ LI publisher (linkedin-zapier-publisher) — healthy but **PP cap breach today needs investigation**
- ✅ YouTube publisher (youtube-publisher v1.5.0) — healthy
- ✅ WordPress publisher (wordpress-publisher v1.0.0) — healthy
- ⏸ **Instagram publisher (instagram-publisher v2.0.0) — deployed + platform discipline verified; cron 53 `active=false` until Meta restriction (error 2207051) clears**

---

## SESSION STARTUP PROTOCOL

1. Read this file in full
2. Orphan branch sweep — all 3 repos
3. Check `c.external_reviewer` — confirm paused
4. **Check IG publisher cron — jobid 53 `active=false` until v2.0.0 deployed + verified**
5. **Check IG publisher EF version**: `curl https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/instagram-publisher/health` — should return `version: instagram-publisher-v2.0.0`. If still `v1.0.0`, deploy hasn't happened yet.
6. Validate router shadow infrastructure: `SELECT * FROM t.platform_format_mix_default_check;` → 4 rows status='ok'
7. Validate router catalogs: `COUNT(*) FROM t."5.0_social_platform" WHERE is_router_target=TRUE` = 4
8. Validate event trigger: `evtenabled` = 'O'; `k.refresh_column_registry()` returns empty
9. Validate R4 seed + function: `COUNT(*) FROM t.content_class WHERE is_current=TRUE` = 6; rules = 20; `SELECT active FROM cron.job WHERE jobid = 68` = true
10. Validate R5 infrastructure: `COUNT(*) FROM t.class_format_fitness WHERE is_current=TRUE` = 60; `COUNT(*) FROM c.client_dedup_policy` = 4
11. Validate adequacy grades: `SELECT * FROM m.vw_match_pool_adequacy;` → expect NY A, PP A, CFW B, Invegent D
12. Validate R6 crons active: `SELECT jobid, active FROM cron.job WHERE jobid IN (11, 64, 65);` → all TRUE
13. Validate R6 grade-gating
14. Validate coverage matrix: CFW 12/12; NY 12/12; PP 12/12; Invegent 6/6
15. Validate R4 backfill complete
16. Check `m.cron_health_alert WHERE resolved_at IS NULL` ≤ 2
17. Check ID004 recovery
18. Check file 15 Section G — pick next sprint item
19. Read `docs/06_decisions.md` D156–D169
20. Query `k.vw_table_summary` before any table work

---

## DEV WORKFLOW RULE (D165)

**Default: direct-push to main.** Deviate only for multi-repo coordinated risk or PK-flagged risk.

**EF deploys remain manual via PowerShell** (Windows MCP times out on `supabase functions deploy`).

---

## EXTERNAL REVIEWER LAYER (UNCHANGED)

All four reviewers still paused.

---

## CURRENT PHASE

**Phase 1 — COMPLETE.** **Phase 3 — Expand + Personal Brand** active.

Pre-sales gate: 12 of 28 Section A items closed. A10b (first IG post publishes) gates on v2.0.0 deploy + verified clean publish — **the 4 Invegent IG posts today don't count for A10b** because they happened on v1.0.0 which had the cross-post bug. A clean publish under v2.0.0 closes A10b → 13 of 28.

---

## ALL CLIENTS — STATE

| Client | client_id | FB | IG | LI | YT | Prompt stack | Adequacy | r6_enabled | Notes |
|---|---|---|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ | ⏸ v2.0.0 | ✅ | 🔲 | 12/12 | **A** | ✅ all | R5-driven drafts flowing; 18 cross-posts to delete |
| Property Pulse | 4036a6b5 | ✅ | ⏸ v2.0.0 | ⚠ cap | 🔲 | 12/12 | **A** | ✅ all | R5-driven drafts flowing; LI cap breach today |
| Care For Welfare | 3eca32aa | ✅ | ⏸ v2.0.0 | ⚠ | 🔲 | 12/12 | **B** | ❌ all | Awaiting feed activation |
| Invegent | 93494a09 | — | ⏸ v2.0.0 | ⚠ | ⚠ | 6/6 v0.1 | **D** | ❌ all | 4 IG publishes today on v1.0.0 (clean — were IG-platform drafts) |

---

## SPRINT MODE — THE BOARD

### Router track

| # | Item | Status |
|---|---|---|
| R1 | mix_default + seed | ✅ |
| R2 | client override | ✅ |
| R3 | demand grid function | ✅ |
| Catalog unification | extended + FKs | ✅ |
| R4 tables + seed + function + cron | jobid 68 active | ✅ LIVE |
| R5 spec v2 + impl | `m.match_demand_to_canonicals()` v1.4 | ✅ LIVE |
| Pool-adequacy diagnostic | grades A-F | ✅ LIVE |
| **R6 seed_and_enqueue rewrite** | **v1.0.1 R5-driven, grade-gated** | **✅ LIVE** |
| **M12 IG publisher refactor** | **v2.0.0 queue-based** | **✅ CODE SHIPPED — DEPLOY PENDING** |
| R7 | ai-worker platform-awareness | 🔲 **UNBLOCKED** |
| R8 | Cron changes | 🔲 not blocking |

### HIGH priority items remaining

| # | Item | Why HIGH |
|---|---|---|
| **PK: deploy IG publisher v2.0.0** | EF deploy via PowerShell + cron unpause | Pipeline dependency for IG |
| **PK: run cleanup script** | Delete 18 NY IG cross-posts | Live brand-damage on NY IG account |
| **CC-TASK-02 fix** | Fix feed-intelligence upsert | Silent-failure class, dormant |

**Not HIGH but actionable next session:**
- LI publisher audit (does it have an M12-class bug? PP cap breach root cause)
- R7 build
- A10b — blocked by Meta API restriction (error subcode 2207051) on the FB App credentials, likely caused by the 18 NY IG cross-posts on 19 April plus 4 rapid Invegent publishes 25 April morning under v1.0.0. Resolves after PK runs cleanup script + Meta auto-clears (typical 24-48h). v2.0.0 platform discipline already verified independently — A10b is gated only on the external clearance, not on any v2.0.0 code work.
- R6 performance optimisation
- m.post_publish_queue.status CHECK with 'dead' (D163 backlog)
- Carousel verification (v2.0.0 untested for carousel format in production)

---

## WATCH LIST

### Due next session

- Validate adequacy grades unchanged
- Validate R6 crons still active
- Verify IG publisher v2.0.0 deployed + first IG post lands clean
- LI publisher audit
- PK choose CC-TASK-02 fix

### Due week of 22-27 Apr

- **Mon 27 Apr** — Meta App Review escalation trigger
- **Sat 2 May** — original reviewer calibration cycle trigger (defer)

### Backlog (open)

**New 25 Apr afternoon (M12 closure):**
- ~~**PK action: deploy v2.0.0**~~ ✅ Deployed with `--no-verify-jwt`; platform discipline verified 25 Apr 08:15 UTC live tick.
- **Meta restriction recovery sequence** (replaces "PK action: run cleanup script" — same first step, expanded into the full sequence to actually close A10b):
  - (a) PK runs `scripts/delete_ny_ig_crosspost_cleanup_20260419.sh` with `$NY_IG_TOKEN` to delete the 18 NY IG cross-posts from 19 April
  - (b) Wait 24-48h for Meta to auto-clear the App restriction (error subcode 2207051; typical recovery window per Meta Graph API docs)
  - (c) Manual `curl` test to `/instagram-publisher` with `dry_run=false` and `limit=1` against a known-clean PP draft, using `sb_publishable_*` apikey and `x-publisher-key` from vault — expect HTTP 200 with `status:"published"` and a non-null `platform_post_id`
  - (d) If 200 + published cleanly: `SELECT cron.alter_job(53, active := true)` to unpause the cron
  - (e) Close A10b in `docs/15_pre_post_sales_criteria.md` and update Pre-sales gate count from 12 → 13
- **LI publisher audit** — does it bypass the queue like IG v1.0.0 did?
- **PP LinkedIn race condition** — 3 published vs cap=2 root cause
- **m.post_publish_queue.status CHECK** — add 'dead' (D163 backlog)
- **Carousel verification** — first real IG carousel publish observation (deferred until cron resumes post-restriction)
- **`deleted_from_platform_at` column** — optional reconciliation column for the 18 deletions

**New 25 Apr morning (R6):**
- **R6 performance optimisation** — 26-101s per cron tick
- R6 v1.1 polish — `clients_skipped_gated` counter mode=null gap
- `post_visual_spec` cascade trigger investigation

**Carried from 24 Apr Session 2:**
- R5 v1.5 polish (Hungarian optimal dedup if greedy proves suboptimal)
- `t.router_policy_default` table for global weight storage
- Cold-start synthetic test
- Fitness matrix calibration against real engagement data

**Invegent-specific escalation:**
- Discovery needs feeds producing `stat_heavy` + `timely_breaking`
- 7 weekly slots can't be filled with strong-fit content until then

**CFW-specific action:**
- 4 carousel slots thin because only 2 of 26 feeds enabled
- Feed activation before flipping `r6_enabled=TRUE` for CFW

**Existing HIGH:** CC-TASK-02 HIGH fix

**Not HIGH:**
- CC-TASK-03 usePlatformVocab + useFormatVocab rollout
- D168 Layer 2 implementation
- Invegent FB + IG activation (v0.2 positioning required)
- Avatar configuration for Invegent (HeyGen)
- Cron health v3.1 schedule-string parsing

**Earlier backlog unchanged:** cron dashboard tile, stream B source type, v0.2 Invegent positioning, CFW IG drafts, stale branches, publisher schedule audit, TPM saturation, docs/archive 5th file, reviewer pollution, PP Schedule FB 6/5 violation, exec_sql sweep, facebook-publisher EF audit, Shrishti 2FA.

---

## TODAY'S COMMITS (24-25 APR — FINAL)

**Invegent-content-engine (main) — 27 commits total:**

Earlier today (R6 morning + R5 Friday) — 24 commits.

Saturday afternoon (M12 closure):
- `f0c34f3` — scripts: NY IG cross-post cleanup script
- `562ab3e` — feat(instagram-publisher): v2.0.0 queue-based refactor
- `7d8c8b5` — docs(decisions): D169 — IG publisher v2.0.0 queue-based refactor
- **THIS COMMIT** — docs(sync_state): M12 closure + v2.0.0 deploy steps

**Migrations (DB-only, 38 total):**

Earlier — 37 logged.

Saturday afternoon:
- `update_ig_publisher_cron_for_v2_20260425`
- `re_pause_ig_cron_m12_bug_active_20260425` (paused after discovery)
- `approve_invegent_ig_drafts_and_unpause_ig_cron_20260425` (initial unpause; later re-paused after cross-post discovery)

**invegent-dashboard (main):**
- `7672154` — docs(roadmap): R6 LIVE update
- (no afternoon dashboard commit — M12 closure doesn't change roadmap shape; deploy pending)

---

## CLOSING NOTE FOR NEXT SESSION

25 Apr was the highest-output session day on record. R6 cutover landed in 75 min (morning); M12 IG publisher v2.0.0 refactor + 18-post cleanup script + 3 commits + 3 migrations (afternoon). Two material shifts to the system:

1. **R6 LIVE** — every fresh draft is R5-driven, multi-platform spread real for first time
2. **M12 closed** — IG publisher rewritten queue-based, three-layer platform discipline, 18 historical cross-posts to be deleted

**Final tally (24-25 Apr):**
- **27 commits** on Invegent-content-engine
- **38 DB migrations** applied
- **18 briefs** committed (17 prior + D169 decision file)
- **10 sprint items closed** (was 9; M12 added)
- **4 Claude Code tasks closed**
- **R4 + R5 + R6 all LIVE**
- **Pool-adequacy diagnostic LIVE**
- **6 of 9 router findings CLOSED**
- **M12 IG publisher cross-post bug class CLOSED via v2.0.0 refactor**

**Pipeline state:**
- R4 + R5 + R6 fully wired
- All publishers healthy except IG (paused awaiting v2.0.0 deploy)
- 4 Invegent IG posts today were clean (v1.0.0 happened to pick IG-platform drafts only because Invegent has no FB drafts to confuse it)
- 18 NY IG cross-posts to be deleted via Meta Graph API
- LI publisher needs auditing for M12-class bug

**Realistic next working windows:**
- 25 Apr Saturday evening: rest (today was a big one)
- 26 Apr Sunday: PK deploys v2.0.0 + runs cleanup script (~30 min total)
- 27 Apr Monday: Meta App Review escalation + LI publisher audit + R7 build start

**Lessons captured 24-25 Apr (20 total, 1 new from M12):**

1-19. (See prior commits.)

20. **"Bypass the queue" architecture choices accumulate cross-cutting bugs.** The IG publisher v1.0.0 was designed to read drafts directly because it was simpler. That simplicity contained the M12 cross-post bug, the absence of throttle protection (would have race-conditioned like PP LinkedIn did), the absence of schedule respect, the absence of failure backoff with `last_error`, and the absence of `dead_reason` semantics. ALL of these were free in v2.0.0 once we adopted `m.publisher_lock_queue_v1` — the cost wasn't writing the lock RPC (already existed for FB), it was choosing to use it. **When designing a publisher, always ask: "is there a lock RPC for this?" If yes, use it. The cost of bypass is structural, not just defensive-check-related.**
