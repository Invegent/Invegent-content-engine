# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-25 Saturday ~12:30pm AEST — **R6 LIVE: R5-driven seeder consuming match output, multi-platform spread real**
> Written by: PK + Claude session sync

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

### Migrations (this session — 8 total)

- `r6_step_1_pause_seed_crons_for_cutover_20260425`
- `resolve_v3_1_known_false_positive_alerts_20260425_morning` (housekeeping)
- `r6_step_3_schema_queue_caps_and_r6_gate_20260425`
- `r6_step_4_trigger_rewrite_finding_1_20260425`
- `r6_step_5_seed_and_enqueue_rewrite_r5_driven_20260425`
- `r6_step_5b_drop_redundant_post_seed_index_20260425`
- `r6_step_5c_seed_enqueue_temp_table_safety_20260425`
- `r5_v1_4_active_seed_canonical_dedup_20260425`
- `r6_step_8_re_enable_seed_crons_20260425`

### Surprises during cutover

1. **Latent schema bug caught** — 2 contradictory unique indexes on `m.post_seed`. Older one `(digest_item_id)` had been silently dictating single-platform model since D118 era. Drop made multi-platform seeding possible for the first time in system history.

2. **R5 dedup gap caught** — same canonical could be re-seeded via different digest_items. R5 v1.4 added canonical-level active-seed dedup CTE.

3. **Performance flag — function takes 26-83 seconds per cron tick.** Most invocations under 60s, but 12:00 FB cron timed out (default Supabase pg_cron statement timeout is 30s). Subsequent ticks at 12:10 + 12:20 succeeded cleanly. Function is functional but expensive — `EXPLAIN ANALYZE` shows `shared hit=5345677 buffers` per call. Worth optimising before scaling beyond 4 clients.

### What R6 LIVE means for the system

Pre-R6: R4 classifier + R5 matching layer ran in shadow — produced match decisions but didn't drive real drafts.

Post-R6: R5's matching decisions ARE the drafts. Every fresh draft has:
- Format chosen by R5 fitness scoring (`recommended_format` populated)
- Full audit trail in `seed_payload.match_metadata` (fitness/quality/recency scores, weights, version, match_reason)
- Multi-platform spread possible (same canonical adapted to different formats across platforms)

R7 (ai-worker platform/format awareness) is now unblocked — the data it needs is sitting in `seed_payload` waiting.

### CFW + Invegent path forward

**CFW (Grade B):** activate the 24 currently-disabled feeds → wait ~1 week → re-run adequacy → flip `r6_enabled=TRUE` per platform.

**Invegent (Grade D):** discovery pipeline work to add feeds producing stat_heavy + timely_breaking → validate via diagnostic → flip `r6_enabled=TRUE` for LinkedIn + YouTube.

Neither blocks anything else — pipeline is producing real content for NY + PP today.

### Commits (this block)

- `576bb12` — docs(briefs): R6 implementation spec (Friday late-evening)
- `594e15e` — docs(archive): R6 pre-rewrite rollback artefacts (Friday late-evening)
- `9c3381a` — docs(briefs): R6 retrospective — LIVE in 75 min, 2 latent schema bugs surfaced + fixed
- **THIS COMMIT** — docs(sync_state): R6 LIVE + final session close

---

## 🟢 24 APR LATE-EVENING SESSION 2 CLOSE — R5 + POOL-ADEQUACY DIAGNOSTIC

### In one paragraph

PK opened the 6:45pm Friday window for "fix cron alerts, then R5 impl". Cron alerts cleared inside 15 minutes: token-expiry-alert-daily's `checked_at` fix had already landed in `public.check_token_expiry()` earlier today but the function hadn't fired yet — manually invoked, ran clean, zero alerts produced. Five other `no_recent_runs` alerts were monitor v3 cadence-sampling limitation (weekly/monthly crons with ≤1 run sample) — all resolved with notes pointing at the existing "Cron health v3.1" backlog item. Then R5: six atomic migrations landed the 5 tables + 1 view + 60-row fitness matrix + 4 dedup policies + `m.match_demand_to_canonicals()` function. Hit THREE spec-vs-live reconciliations in Step 3 (documented in `docs/briefs/2026-04-24-r5-impl-retrospective.md`). After R5 shipped, PK flagged the right concern: **"confident in the mechanics, but how do I know this will work for a new client?"** CFW 8/8 and Invegent 10/10 read like successes but they were hiding the fact that both clients had demand grids requesting 18 slots — the function was "gracefully failing" on 10 of them. Shipped **pool-adequacy diagnostic** (`m.diagnose_match_pool_adequacy` + `m.summarise_match_pool_adequacy` + `m.vw_match_pool_adequacy`) — 7 status categories, grades A-F, plain-English diagnosis per (client, platform, format) slot with routing to the right fix team.

### Grade results (held overnight, confirmed Saturday morning)

| Client | Demand | OK | At risk | Unfillable | Classes | Grade | Primary action |
|---|---|---|---|---|---|---|---|
| NDIS-Yarns | 24 | 24 | 0 | 0 | 6/6 | **A** | Healthy |
| Property Pulse | 24 | 24 | 0 | 0 | 6/6 | **A** | Healthy |
| CFW | 18 | 14 | 4 | 0 | 4/6 | **B** | FEED_CONFIG: enable more feeds for multi_point + educational |
| Invegent | 18 | 3 | 8 | 7 | 2/6 | **D** | DISCOVERY: feeds produce zero stat_heavy or timely_breaking canonicals |

---

## 🟢 24 APR LATE-EVENING — R4 STEP 3 LIVE (classifier function + sweep + cron)

R4 backfill confirmed complete, distribution: analytical 52.2%, stat_heavy 16%, human_story 14.1%, multi_point 13.5%, educational_evergreen 2.7%, timely_breaking 1.5%. Classifier auto-running every 5m via jobid 68. Every successful-fetch canonical is classified.

---

## 🟢 24 APR EVENING (INVEGENT v0.1 PROMPT STACK) — LI + YT SHIPPED

| Client | FB r/s/p | IG r/s/p | LI r/s/p | YT r/s/p | Total |
|---|---|---|---|---|---|
| NDIS-Yarns | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 12/12 |
| Property Pulse | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 12/12 |
| Care For Welfare | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 12/12 |
| Invegent | 0/0/0 | 0/0/0 | 1/1/1 | 1/1/1 | 6/6 |

---

## 🟢 25 APR — CC-TASK-02 / 03 / 04 CLOSED

CC-TASK-02 HIGH (`feed-intelligence` upsert) DORMANT, fix Option B recommended, PK to choose. CC-TASK-03 + 04 closed.

---

## 🟢 24 APR EVENING — ROUTER CATALOG UNIFICATION SHIPPED

Extended `t.5.0_social_platform` + `t.5.3_content_format`. 29 FKs added.

### Router audit findings status (post-R6)

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

**6 of 9 router findings closed (was 3 of 9). All HIGHs closed.**

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else.** R6 LIVE shifts the system materially — every fresh draft is now R5-driven.

### Full 24-25 Apr tally

- **24 commits** on Invegent-content-engine (23 prior + R6 retrospective)
- **37 DB migrations** applied (29 prior + 8 R6)
- **17 briefs** committed (15 prior + R6 spec + R6 retrospective)
- **9 sprint items closed**
- **4 Claude Code tasks closed**
- **R4 classifier LIVE** and auto-running
- **R5 matching layer LIVE** (now v1.4 with canonical-level active-seed dedup)
- **Pool-adequacy diagnostic LIVE**
- **R6 seed_and_enqueue LIVE** (R5-driven, gate-controlled)
- **Trigger Finding 1 closed** (no more hardcoded UUIDs)
- **Multi-platform seeding now real** (latent schema bug fixed)
- **Invegent v0.1 prompt stack SHIPPED**
- **CFW at full prompt parity**
- **1 live production bug caught + fixed** (token-expiry)
- **8 stale cron-health alerts resolved**
- **11 audit findings produced; 6 of 9 router findings closed**

### Critical state awareness

1. **R6 LIVE.** Every cron tick produces R5-matched drafts for NY + PP.
2. CFW + Invegent gated off (`r6_enabled=FALSE`) — explicit per-client opt-in.
3. Pool-adequacy diagnostic remains source-of-truth for "is this client ready".
4. **Performance: seed_and_enqueue takes 26-83s per call.** Close to pg_cron statement timeout. Worth optimising before scaling beyond 4 clients. **Added to backlog.**
5. Cron health: 0 open alerts (2 weekly/monthly v3.1 false positives auto-resolved).
6. Token-expiry permanent fix confirmed — Saturday 08:05 AEST cron run succeeded.
7. R7 (ai-worker platform-awareness) is now fully unblocked.
8. CC-TASK-02 HIGH still dormant — PK to choose Option A vs B.
9. IG publisher cron (jobid 53) still PAUSED. R6 IG drafts will accumulate until PK unpauses.
10. Reviewers still paused per D162.

### Adequacy snapshot (run this next session to confirm nothing drifted)

```sql
SELECT client_slug, adequacy_grade, primary_action
FROM m.vw_match_pool_adequacy;
```

Expected: NY A, PP A, CFW B, Invegent D. Changes from this baseline = investigate.

### R6 health snapshot (run this next session)

```sql
-- Recent seeding activity
SELECT
  ps.created_at AT TIME ZONE 'Australia/Sydney' AS created_aest,
  c.client_slug,
  ps.seed_payload->>'platform' AS platform,
  ps.seed_payload->'match_metadata'->>'ice_format_key' AS format,
  ROUND((ps.seed_payload->'match_metadata'->>'final_match_score')::NUMERIC, 1) AS score
FROM m.post_seed ps
JOIN c.client c ON c.client_id = ps.client_id
WHERE ps.created_at > NOW() - INTERVAL '2 hours'
  AND ps.created_by = 'seed_and_enqueue'
ORDER BY ps.created_at DESC
LIMIT 30;

-- Cron tick timing (watch for >25s)
SELECT
  jobname,
  COUNT(*) FILTER (WHERE status = 'succeeded') AS ok,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  ROUND(AVG(EXTRACT(EPOCH FROM (end_time - start_time)))::NUMERIC, 1) AS avg_secs,
  ROUND(MAX(EXTRACT(EPOCH FROM (end_time - start_time)))::NUMERIC, 1) AS max_secs
FROM cron.job_run_details jrd
JOIN cron.job j USING (jobid)
WHERE jobid IN (11, 64, 65)
  AND start_time > NOW() - INTERVAL '24 hours'
GROUP BY jobname;
```

### Router state — snapshot

- ✅ R1/R2/R3: shadow infrastructure
- ✅ R4 classifier — FULLY LIVE
- ✅ R5 matching layer — FULLY LIVE (v1.4)
- ✅ Pool-adequacy diagnostic — LIVE
- ✅ **R6 seed_and_enqueue rewrite — LIVE**
- 🔲 R7: ai-worker platform-awareness — **NOW UNBLOCKED** (recommended_format + match_metadata waiting in seed_payload)
- 🔲 R8: Cron changes — depends on performance investigation, not strictly blocked

---

## SESSION STARTUP PROTOCOL

1. Read this file in full
2. Orphan branch sweep — all 3 repos
3. Check `c.external_reviewer` — confirm paused
4. Check IG publisher cron — jobid 53 `active=false`
5. Validate router shadow infrastructure: `SELECT * FROM t.platform_format_mix_default_check;` → 4 rows status='ok'
6. Validate router catalogs: `COUNT(*) FROM t."5.0_social_platform" WHERE is_router_target=TRUE` = 4
7. Validate event trigger: `evtenabled` = 'O'; `k.refresh_column_registry()` returns empty
8. Validate R4 seed + function: `COUNT(*) FROM t.content_class WHERE is_current=TRUE` = 6; rules = 20; `SELECT active FROM cron.job WHERE jobid = 68` = true
9. Validate R5 infrastructure: `COUNT(*) FROM t.class_format_fitness WHERE is_current=TRUE` = 60; `COUNT(*) FROM c.client_dedup_policy` = 4
10. Validate adequacy grades: `SELECT * FROM m.vw_match_pool_adequacy;` → expect NY A, PP A, CFW B, Invegent D
11. Validate R6 crons active: `SELECT jobid, active FROM cron.job WHERE jobid IN (11, 64, 65);` → all TRUE
12. Validate R6 grade-gating: `SELECT client_slug, platform, r6_enabled FROM c.client_publish_profile cpp JOIN c.client c USING (client_id) WHERE c.status='active' ORDER BY 1, 2;` → NY+PP TRUE, CFW+Inv FALSE
13. Validate coverage matrix: CFW 12/12; NY 12/12; PP 12/12; Invegent 6/6
14. Validate R4 backfill complete: all success-fetch canonicals have `content_class`
15. Check `m.cron_health_alert WHERE resolved_at IS NULL` ≤ 2 (acceptable: v3.1 weekly/monthly false positives only)
16. Check ID004 recovery
17. Check file 15 Section G — pick next sprint item
18. Read `docs/06_decisions.md` D156–D168
19. Query `k.vw_table_summary` before any table work

---

## DEV WORKFLOW RULE (D165)

**Default: direct-push to main.** Deviate only for multi-repo coordinated risk or PK-flagged risk.

---

## EXTERNAL REVIEWER LAYER (UNCHANGED)

All four reviewers still paused.

---

## CURRENT PHASE

**Phase 1 — COMPLETE.** **Phase 3 — Expand + Personal Brand** active.

Pre-sales gate: 12 of 28 Section A items closed. (A11b, A21 from yesterday + A24 from 21 Apr; R5 closure noted in dashboard.)

A10b (first IG post publishes) gated on R6 — now landing. Will close as soon as ai-worker processes the R6 IG drafts and the IG publisher cron is unpaused. **Likely closes within 1-2 sessions** → gate moves to ~13 of 28.

---

## ALL CLIENTS — STATE

| Client | client_id | FB | IG | LI | YT | Prompt stack | Adequacy | r6_enabled | Notes |
|---|---|---|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ | ⏸ | ✅ | 🔲 | 12/12 | **A** | ✅ all | R5-driven drafts flowing |
| Property Pulse | 4036a6b5 | ✅ | ⏸ | ✅ | 🔲 | 12/12 | **A** | ✅ all | R5-driven drafts flowing |
| Care For Welfare | 3eca32aa | ✅ | ⏸ | ⚠ | 🔲 | 12/12 | **B** | ❌ all | Awaiting feed activation |
| Invegent | 93494a09 | — | — | ⚠ | ⚠ | 6/6 v0.1 | **D** | ❌ all | Awaiting discovery escalation |

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
| Pool-adequacy diagnostic | grades A-F, 7 status categories | ✅ LIVE |
| **R6 seed_and_enqueue rewrite** | **v1.0.1 R5-driven, grade-gated** | **✅ LIVE** |
| R7 | ai-worker platform-awareness | 🔲 **UNBLOCKED** |
| R8 | Cron changes | 🔲 not blocking |

### HIGH priority items remaining

| # | Item | Why HIGH |
|---|---|---|
| **CC-TASK-02 fix** | Fix feed-intelligence upsert (Option A vs B) | Silent-failure class, dormant |

**Not HIGH but actionable next session:**
- R7 build (ai-worker reading recommended_format + match_metadata)
- IG publisher cron unpause (jobid 53) — now that R6 IG drafts are flowing
- A10b verification once first IG post lands
- R6 performance optimisation (function takes 26-83s per tick)

---

## WATCH LIST

### Due next session

- Validate adequacy grades unchanged
- Validate R6 crons still active and succeeding within statement timeout
- Validate R6 grade-gating still configured correctly
- PK choose CC-TASK-02 fix: Option A vs B
- Watch first R6-produced IG draft → publish queue chain
- R4 distribution monitoring check — 1 week + 1 month windows

### Due week of 22-27 Apr

- **Mon 27 Apr** — Meta App Review escalation trigger
- **Sat 2 May** — original reviewer calibration cycle trigger (defer)

### Backlog (open)

**New 25 Apr R6:**
- **R6 performance optimisation** — function takes 26-83s per cron tick. Close to pg_cron statement timeout. Investigate `EXPLAIN ANALYZE` (5.3M shared hits) — likely the R5 candidate-generation CTE. Worth a session before scaling beyond 4 clients.
- R6 v1.1 polish — `clients_skipped_gated` counter doesn't catch mode=null cases. Diagnostic accuracy only, functional gate works.
- `post_visual_spec` cascade trigger investigation — fired during R6 testing on draft INSERT, blocked DELETE cleanup. Want to understand which trigger and whether intentional.

**Carried from 24 Apr Session 2:**
- R5 v1.5 polish (Hungarian optimal dedup if greedy proves suboptimal — not urgent)
- `t.router_policy_default` table for global weight storage (low-priority cleanup)
- Cold-start synthetic test (PK's comedy brand test client — aspirational)
- Fitness matrix calibration against real engagement data (waits on insights-worker + 4 weeks)

**Invegent-specific escalation:**
- Discovery needs feeds producing `stat_heavy` + `timely_breaking` content
- Until discovery addresses this, 7 weekly slots can't be filled with strong-fit content

**CFW-specific action:**
- 4 carousel slots (IG + LI) thin because only 2 of 26 feeds enabled
- Feed activation check before flipping `r6_enabled=TRUE` for CFW

**Existing HIGH:** CC-TASK-02 HIGH fix

**Not HIGH:**
- CC-TASK-03 usePlatformVocab + useFormatVocab rollout
- D168 Layer 2 implementation
- Invegent FB + IG activation (v0.2 positioning required)
- Avatar configuration for Invegent (HeyGen)
- Cron health v3.1 schedule-string parsing

**Earlier backlog unchanged:** cron dashboard tile, stream B source type, v0.2 Invegent positioning, CFW IG drafts, stale branches, publisher schedule audit, m.post_publish_queue CHECK constraint, TPM saturation, docs/archive 5th file, reviewer pollution, PP Schedule FB 6/5 violation, exec_sql sweep, facebook-publisher EF audit, Shrishti 2FA.

---

## TODAY'S COMMITS (24-25 APR — FINAL)

**Invegent-content-engine (main) — 24 commits total:**

Earlier today (through 25 Apr morning) — 20 commits.

Friday Session 2:
- `69986b9` — docs(briefs): R5 implementation retrospective
- `28d9397` — docs(sync_state): R5 LIVE + cron alerts cleared
- `d0f816f` — docs(briefs): R5 pool-adequacy diagnostic
- `8f475ec` — docs(sync_state): pool-adequacy diagnostic LIVE
- `576bb12` — docs(briefs): R6 implementation spec
- `594e15e` — docs(archive): R6 pre-rewrite rollback artefacts

Saturday R6 cutover:
- `9c3381a` — docs(briefs): R6 retrospective — LIVE in 75 min
- **THIS COMMIT** — docs(sync_state): R6 LIVE + Saturday session close

**Migrations (DB-only, 37 total):**

Earlier — 29 logged.

Saturday R6 (8 new):
- `resolve_v3_1_known_false_positive_alerts_20260425_morning`
- `r6_step_1_pause_seed_crons_for_cutover_20260425`
- `r6_step_3_schema_queue_caps_and_r6_gate_20260425`
- `r6_step_4_trigger_rewrite_finding_1_20260425`
- `r6_step_5_seed_and_enqueue_rewrite_r5_driven_20260425`
- `r6_step_5b_drop_redundant_post_seed_index_20260425`
- `r6_step_5c_seed_enqueue_temp_table_safety_20260425`
- `r5_v1_4_active_seed_canonical_dedup_20260425`
- `r6_step_8_re_enable_seed_crons_20260425`

**invegent-dashboard (main):**
- `59bfe66` — docs(roadmap): sync 22 + 24 Apr (CC-TASK-01)
- `4861b56` — fix: CC-TASK-04 (H1 + M9)
- `425ec31` — docs(roadmap): R5 LIVE update
- **NEXT COMMIT** — docs(roadmap): R6 LIVE update

---

## CLOSING NOTE FOR NEXT SESSION

24-25 Apr is the highest-output session on record. R6 cutover landed in 75 minutes — half what the spec estimated — because the riskiest piece (trigger rewrite) was actually low-risk thanks to backfill, while the unsuspected schema artefacts that surfaced were caught early by smoke testing and fixed cleanly mid-cutover.

**Final tally:**
- **24 commits** on Invegent-content-engine
- **37 DB migrations** applied
- **17 briefs** committed
- **9 sprint items closed**
- **4 Claude Code tasks closed**
- **R4 classifier LIVE** and auto-running
- **R5 matching layer LIVE** (v1.4 with canonical-level active-seed dedup)
- **Pool-adequacy diagnostic LIVE**
- **R6 seed_and_enqueue LIVE** — R5 drives drafts now
- **Trigger Finding 1 CLOSED** (no more hardcoded UUIDs)
- **Multi-platform seeding now real** (latent D118-era schema bug fixed)
- **Invegent v0.1 prompt stack SHIPPED**
- **CFW at full prompt parity**
- **1 live production bug caught + fixed** (token-expiry)
- **8 stale cron-health alerts resolved**
- **6 of 9 router findings CLOSED**

**Pipeline state:** R4 + R5 + R6 fully wired. Pipeline now flows signal → classifier → demand grid → R5 match → R6 seed/draft/job → ai-worker → publish queue. CFW + Invegent gated off pending feed/discovery work. IG publisher cron remains paused (next session: unpause and watch first R6 IG post land — closes A10b).

**Remaining HIGH-priority items:**
- CC-TASK-02 fix (PK chooses Option A vs B)

**Realistic next working windows:**
- 25 Apr Saturday afternoon: rest (today was a big one)
- 27 Apr Monday: Meta App Review escalation + R7 build start + IG publisher unpause + A10b verification

**Lessons captured 24-25 Apr (19 total, 1 new from R6 cutover):**

1. Client source data is gold
2. Pre-existing prompt fields can silently contradict each other
3. Check constraints can bite mid-migration
4. v0.1-with-loose-positioning beats waiting for perfect clarity
5. Ship monitoring systems even when imperfect
6. Tune thresholds against real data fast
7. Close the loop same session when monitor catches bug
8. `DROP FUNCTION IF EXISTS name()` silently skips overloaded variants
9. `DROP INDEX` fails for UNIQUE-backed
10. Per-client / per-brand functions create divergence surface
11. Always check existing taxonomy tables before building new catalogs
12. Dynamic table-driven > hardcoded CHECKs
13. Event triggers can mask the source of errors
14. Parallel tracks multiply session output
15. Configured scope beats forced parity
16. Table-driven interpreter enables ship-first-tune-later
17. Spec-vs-live-schema reconciliations are structural, not bugs.
18. "Works on the clients we have" is not the same as "works for any new client."
19. **Latent schema artefacts surface when new code paths exercise unused contracts.** R6 surfaced two: (a) the redundant ux_post_seed_digest_item index that had been silently dictating single-platform seeding model, (b) R5 v1.3's digest_item-level dedup missing canonical-level coverage. Both fixable in 10-30 min mid-cutover when caught by smoke tests. Future cutover specs should allow buffer for cleanup migrations — they're not exceptional, they're expected.
