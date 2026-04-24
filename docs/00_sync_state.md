# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-24 Friday late-evening — **R5 matching layer LIVE + pool-adequacy diagnostic LIVE + cron health clean**
> Written by: PK + Claude session sync

---

## 🟢 24 APR LATE-EVENING SESSION 2 CLOSE — R5 + POOL-ADEQUACY DIAGNOSTIC

### In one paragraph

PK opened the 6:45pm Friday window for "fix cron alerts, then R5 impl". Cron alerts cleared inside 15 minutes: token-expiry-alert-daily's `checked_at` fix had already landed in `public.check_token_expiry()` earlier today but the function hadn't fired yet — manually invoked, ran clean, zero alerts produced. Five other `no_recent_runs` alerts were monitor v3 cadence-sampling limitation (weekly/monthly crons with ≤1 run sample) — all resolved with notes pointing at the existing "Cron health v3.1" backlog item. Then R5: six atomic migrations landed the 5 tables + 1 view + 60-row fitness matrix + 4 dedup policies + `m.match_demand_to_canonicals()` function. Hit THREE spec-vs-live reconciliations in Step 3 (documented in `docs/briefs/2026-04-24-r5-impl-retrospective.md`). After R5 shipped, PK flagged the right concern: **"confident in the mechanics, but how do I know this will work for a new client?"** CFW 8/8 and Invegent 10/10 read like successes but they were hiding the fact that both clients had demand grids requesting 18 slots — the function was "gracefully failing" on 10 of them. Shipped **pool-adequacy diagnostic** (`m.diagnose_match_pool_adequacy` + `m.summarise_match_pool_adequacy` + `m.vw_match_pool_adequacy`) — 7 status categories, grades A-F, plain-English diagnosis per (client, platform, format) slot with routing to the right fix team (discovery / feed config / demand grid / classifier). First run across all 4 clients: NY grade A, PP grade A, CFW grade B (FEED_CONFIG: 4 carousel slots thin), **Invegent grade D** (DISCOVERY: 7 slots unfillable because feeds produce zero stat_heavy or timely_breaking canonicals — ready-to-hand escalation ticket for discovery team).

### R5 + diagnostic shipping state

**R5 matching layer** (6 migrations):

| Object | Schema | Purpose | Row count |
|---|---|---|---|
| `class_format_fitness` | `t` | Default fitness 0-100 | 60 (6 × 10) |
| `client_class_fitness_override` | `c` | Per-client overrides | 0 |
| `client_match_weights` | `c` | Per-client weights | 0 (global default 40/30/30) |
| `post_format_performance_per_publish` | `m` | R7 learning substrate | 0 (insights-worker pending) |
| `client_dedup_policy` | `c` | Cross/same platform gaps | 4 (all active clients, 24h/7d) |
| `vw_effective_class_format_fitness` | `t` (view) | COALESCE(override, default) | n/a |
| `match_demand_to_canonicals()` | `m` | Greedy matching STABLE function | — |

**Pool-adequacy diagnostic** (1 migration):

| Object | Schema | Purpose |
|---|---|---|
| `diagnose_match_pool_adequacy()` | `m` | Per-(platform, format) diagnostic, 7 status categories |
| `summarise_match_pool_adequacy()` | `m` | Client-level summary with grade A-F + primary action |
| `vw_match_pool_adequacy` | `m` (view) | Snapshot across all active clients, worst-grade first |

### Grade results (24 Apr late-evening)

| Client | Demand | OK | At risk | Unfillable | Classes | Grade | Primary action |
|---|---|---|---|---|---|---|---|
| NDIS-Yarns | 24 | 24 | 0 | 0 | 6/6 | **A** | Healthy |
| Property Pulse | 24 | 24 | 0 | 0 | 6/6 | **A** | Healthy |
| CFW | 18 | 14 | 4 | 0 | 4/6 | **B** | FEED_CONFIG: enable more feeds for multi_point + educational |
| Invegent | 18 | 3 | 8 | 7 | 2/6 | **D** | DISCOVERY: feeds produce zero stat_heavy or timely_breaking canonicals |

### What the diagnostic changes about R6 readiness

Pre-diagnostic: "R5 works on NY/PP. Not sure about new clients."
Post-diagnostic: **"R5 works on any client whose pool covers the classes their demand grid requires. The diagnostic tells you before you ship whether a client is ready."**

Every future onboarding now has a measurable go/no-go:
- Grade A or B → enable R6 for this client
- Grade C → configure more feeds before going live
- Grade D → escalate specific missing classes to discovery before going live
- Grade F → pipeline broken, do not proceed

### Cron health state

All 6 open alerts resolved. Live count: 0 open. Next natural run of `token-expiry-alert-daily` Saturday 08:05 AEST will confirm permanent fix.

### Migrations (this session — 8 total)

- `resolve_stale_cron_health_alerts_20260424` — 6 alerts cleared
- `r5_matching_layer_step1_schema_20260424` — 5 tables + 1 view
- `r5_matching_layer_step2_seed_20260424` — 60 fitness rows + 4 dedup policies
- `r5_matching_layer_step3_function_20260424` — initial v1 function
- `r5_matching_layer_step3_function_v1_1_fix_quality_scale_20260424` — normalise quality 0-12→0-100
- `r5_matching_layer_step3_function_v1_2_within_run_dedup_20260424` — rn-based dedup attempt (orphan bug)
- `r5_matching_layer_step3_function_v1_3_greedy_plpgsql_20260424` — greedy PL/pgSQL LIVE
- **`r5_pool_adequacy_diagnostic_20260424`** — 2 functions + 1 view

### Spec-vs-live reconciliations captured

Full write-up: `docs/briefs/2026-04-24-r5-impl-retrospective.md`.

1. **Table name collision** — `m.post_format_performance` existed → R5 renamed to `_per_publish`
2. **Quality normalisation** — spec assumed 0-1, live is 0-12
3. **Greedy dedup gap** — spec said "fall to second-best" without specifying algorithm

Spec-review checklist addition for future specs: (a) grep every new table name against `k.vw_table_summary` before finalising; (b) verify actual MIN/MAX/AVG of any column the spec does arithmetic on; (c) spell out algorithms for "fall to" / "fall through" language explicitly.

### Commits (this block)

- `69986b9` — docs(briefs): R5 implementation retrospective
- `28d9397` — docs(sync_state): R5 LIVE + cron alerts cleared
- `d0f816f` — docs(briefs): R5 pool-adequacy diagnostic
- `425ec31` — docs(roadmap): dashboard synced (invegent-dashboard)
- **THIS COMMIT** — docs(sync_state): pool-adequacy diagnostic LIVE + Session 2 close

### Backlog impact

Removes from HIGH priority:
- ~~R5 impl~~ ✅ CLOSED
- ~~Token-expiry fix / stale monitor alerts~~ ✅ RESOLVED
- ~~"Confident new clients will work?" (unstated but real blocker on R6)~~ ✅ RESOLVED via diagnostic

Unblocks:
- **R6 impl** — `seed_and_enqueue` rewrite consuming R5 output. Every client R6 processes now has a measurable readiness grade before any drafts get written.

Adds to backlog:
- R5 v1.4 polish (Hungarian optimal dedup if greedy proves suboptimal empirically — not urgent)
- `t.router_policy_default` table for global weight storage (currently hardcoded constant — low-priority cleanup)
- Cold-start synthetic test (PK's comedy brand test client — aspirational, define later)
- Fitness matrix calibration against real engagement data (R7 substrate ready, waits on insights-worker + 4 weeks data)

---

## 🟢 25 APR SESSION PREP — SPECS ALREADY v2

Prior session (earlier 24-25 Apr) had the R5 and D168 specs labelled "ready for review, 7 open questions each". As of this session start: **both specs are v2, 5-6 of 7 questions resolved, data-dependent ones remaining but non-blocking**.

- R5 spec v2: 5/7 resolved. 2 data-dependent — revisit after 4 weeks of insights data.
- D168 spec v2: 6/7 resolved. 1 runtime. Implementation still deferred per defence-in-depth posture.

---

## 🟢 24 APR LATE-EVENING — R4 STEP 3 LIVE (classifier function + sweep + cron)

*(retained from prior sync — R4 backfill confirmed complete, distribution on full success-only sample: analytical 52.2%, stat_heavy 16%, human_story 14.1%, multi_point 13.5%, educational_evergreen 2.7%, timely_breaking 1.5%. No tuning required tonight.)*

Three functions shipped in one atomic migration. Cron `classify-canonicals-every-5m` (**jobid 68**, active=TRUE). 1,749/1,749 canonicals classified.

---

## 🟢 24 APR EVENING (INVEGENT v0.1 PROMPT STACK) — LI + YT SHIPPED

Invegent 0/12 gap closed with 6/6 for configured platforms. FB + IG intentionally skipped per `platform_rules.global.not_configured_platforms`.

### Coverage matrix (final)

| Client | FB r/s/p | IG r/s/p | LI r/s/p | YT r/s/p | Total |
|---|---|---|---|---|---|
| NDIS-Yarns | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 12/12 |
| Property Pulse | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 12/12 |
| Care For Welfare | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 12/12 |
| Invegent | 0/0/0 | 0/0/0 | 1/1/1 | 1/1/1 | 6/6 |

---

## 🟢 25 APR — CC-TASK-02 CLOSED (EF `.upsert()` audit — 1 HIGH)

**HIGH:** `feed-intelligence` EF upserts into `m.agent_recommendations` with partial unique index. Currently DORMANT. Fix Option B (SECURITY DEFINER RPC) recommended. PK to choose.

---

## 🟢 25 APR — CC-TASK-03 CLOSED + CC-TASK-04 CLOSED

CC-TASK-03: 1 HIGH / 9 MEDIUM / 3 LOW. CC-TASK-04: H1 + M9 shipped to dashboard `4861b56`. Audit trilogy complete.

---

## 🟢 24 APR EVENING — ROUTER CATALOG UNIFICATION SHIPPED

Extended `t.5.0_social_platform` + `t.5.3_content_format`. 29 FKs added. `k.refresh_column_registry` multi-FK dupe bug fixed as bonus.

### Router audit findings status

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Client UUIDs hardcoded in `m.enqueue_publish_from_ai_job_v1` | 🔴 HIGH | 🔲 Open — bundle into R6 |
| 2 | Format vocab in 4 CHECKs | 🔴 HIGH | ✅ CLOSED — FK |
| 3 | Platform vocab in 3 CHECKs | 🔴 HIGH | ✅ CLOSED — FK |
| 4 | `seed_and_enqueue` demand formula hardcoded | 🟡 MED | 🔲 Open — bundle into R6 |
| 5 | Stealth digest_policy defaults | 🟡 MED | ✅ CLOSED — explicit rows |
| 6 | `NOT IN ('youtube')` exclusion | 🟡 MED | 🔲 Unblocked — 1-line change in R6 |
| 7 | Job priority magic numbers | 🟢 LOW | Deferred |
| 8 | AI provider CHECK | 🟢 LOW | Acceptable as-is |
| 9 | Validation view strict `= 100` | 🟢 LOW | ✅ CLOSED |

---

## 🟢 24 APR LATE-AFTERNOON — A21 ON CONFLICT AUDIT CLOSED

---

## 🟢 24 APR AFTERNOON — CRON HEALTH MONITORING LAYER 1 LIVE

Caught `token-expiry-alert-daily` drift same session. v3.1 (schedule-string parsing) in backlog.

---

## 🟢 24 APR MID-DAY — A11b CLOSED

CFW + Invegent v0.1 `c.client_ai_profile` locked.

---

## 🟢 24 APR SESSION-START — MORNING HOUSEKEEPING

Orphan branch sweep clean, M8 Gate 4 PASSED, CFW correction.

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else.** 24-25 Apr was the highest-output run on record; late-evening Session 2 added R5 LIVE + pool-adequacy diagnostic.

### Full 24-25 Apr tally

- **23 commits** on Invegent-content-engine (20 prior + 3 Session 2: retrospective + R5 sync + diagnostic brief + this close)
- **29 DB migrations** applied (21 prior + 8 Session 2)
- **15 briefs** committed (13 prior + R5 retrospective + pool-adequacy diagnostic)
- **8 sprint items closed**
- **4 Claude Code tasks closed**
- **R4 classifier LIVE** and auto-running
- **R5 matching layer LIVE** (v1.3 greedy dedup)
- **Pool-adequacy diagnostic LIVE** (grades A-F, 7 status categories, per-slot diagnosis with routing)
- **Invegent v0.1 prompt stack SHIPPED**
- **CFW at full prompt parity**
- **1 live production bug caught + fixed** (token-expiry)
- **6 stale cron-health alerts resolved**
- **11 audit findings produced, 8 closed**

### Critical state awareness

1. A11b CLOSED.
2. Cron health monitoring LIVE. **0 open alerts.**
3. Token-expiry function verified clean.
4. A21 CLOSED (DB). CC-TASK-02 CLOSED (EF) with 1 HIGH pending fix.
5. ROUTER CATALOG UNIFIED.
6. `k.refresh_column_registry` fixed.
7. **R4 LIVE and auto-running.** 1,749/1,749 classified.
8. **R5 LIVE.** v1.3 greedy dedup. All 4 clients verified.
9. **Pool-adequacy diagnostic LIVE.** Every client now has a measurable readiness grade.
10. D168 Layer 2 spec v2 ready. Not HIGH priority.
11. CFW 12/12. Invegent 6/6 configured.
12. **R6 now fully unblocked.** Diagnostic tells you which clients are ready, which aren't.
13. `instagram-publisher-every-15m` (jobid 53) remains PAUSED.
14. ID004 closed.
15. M8 Gate 4 CLOSED.
16. M12 still superseded per D166.
17. 2 CFW IG drafts in `needs_review` — decision TBD.
18. Dashboard roadmap synced.
19. Reviewers still paused.
20. Pipeline clean.

### Adequacy snapshot (run this next session to confirm nothing drifted)

```sql
SELECT client_slug, adequacy_grade, primary_action
FROM m.vw_match_pool_adequacy;
```

Expected: NY A, PP A, CFW B, Invegent D. Changes from this baseline = investigate.

### Router state — snapshot

- ✅ R1/R2/R3: shadow infrastructure
- ✅ R4 classifier — FULLY LIVE
- ✅ **R5 matching layer — FULLY LIVE (v1.3 greedy dedup)**
- ✅ **Pool-adequacy diagnostic — LIVE** (grades every client A-F before R6)
- 🔲 R6: seed_and_enqueue rewrite — ~3-4h, **FULLY UNBLOCKED**
- 🔲 R7: ai-worker platform-awareness — depends on R6
- 🔲 R8: Cron changes — depends on R6
- ✅ Catalogs unified.

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
10. **Validate adequacy grades:** `SELECT * FROM m.vw_match_pool_adequacy;` → expect NY A, PP A, CFW B, Invegent D
11. Validate coverage matrix: CFW 12/12; NY 12/12; PP 12/12; Invegent 6/6
12. Validate R4 backfill complete: 1,749/1,749
13. Check `m.cron_health_alert WHERE resolved_at IS NULL` = 0
14. Check ID004 recovery
15. Check file 15 Section G — pick next sprint item
16. Check `m.external_review_queue`
17. Read `docs/06_decisions.md` D156–D168
18. Query `k.vw_table_summary` before any table work

---

## DEV WORKFLOW RULE (D165)

**Default: direct-push to main.** Deviate only for multi-repo coordinated risk or PK-flagged risk.

---

## EXTERNAL REVIEWER LAYER (UNCHANGED)

All four reviewers still paused.

---

## CURRENT PHASE

**Phase 1 — COMPLETE.** **Phase 3 — Expand + Personal Brand** active.

Pre-sales gate: 12 of 28 Section A items closed.

Today's movement:
- Morning: orphan sweep, M8 Gate 4 PASS, CFW correction
- Mid-day: M1 / A11b CLOSED
- Afternoon: Cron monitoring + Q5 CLOSED
- Late afternoon: A21 / L6 CLOSED
- Evening: Router catalog unification SHIPPED
- Evening Track B: R4 schema+seed LIVE, R5 spec, D168 spec, CFW 12/12
- Evening Invegent: v0.1 LI+YT prompt stack SHIPPED (6/6)
- 25 Apr morning: CC-TASK-01/02/03/04 + R4 Step 3 LIVE
- **24 Apr late-evening Session 2: cron alerts cleared + R5 LIVE + pool-adequacy diagnostic LIVE**

---

## ALL CLIENTS — STATE

| Client | client_id | FB | IG | LI | YT | Prompt stack | Adequacy | Notes |
|---|---|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ | ⏸ | ✅ | 🔲 | 12/12 | **A** | 6/6 classes in pool |
| Property Pulse | 4036a6b5 | ✅ | ⏸ | ✅ | 🔲 | 12/12 | **A** | 6/6 classes in pool |
| Care For Welfare | 3eca32aa | ✅ | ⏸ | ⚠ | 🔲 | 12/12 | **B** | 4/6 classes; 4 carousel slots thin |
| Invegent | 93494a09 | — | — | ⚠ | ⚠ | 6/6 v0.1 | **D** | 2/6 classes; 7 slots need discovery escalation |

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
| R5 spec v2 + impl | `m.match_demand_to_canonicals()` v1.3 | ✅ LIVE |
| **Pool-adequacy diagnostic** | **grades A-F, 7 status categories** | **✅ LIVE** |
| R6 | seed_and_enqueue rewrite (Findings 1+4+6) | 🔲 ~3-4h — **FULLY UNBLOCKED** |
| R7 | ai-worker platform-awareness | 🔲 depends on R6 |
| R8 | Cron changes | 🔲 depends on R6 |

### HIGH priority items remaining

| # | Item | Why HIGH |
|---|---|---|
| **R6** | seed_and_enqueue rewrite (Findings 1+4+6 bundled) | IG publisher paused until router verifies. Now fully unblocked. |
| **CC-TASK-02 fix** | Fix feed-intelligence upsert (Option A vs B) | Silent-failure class, dormant |

**Not HIGH:**
- `usePlatformVocab` + `useFormatVocab` hook rollout
- D168 Layer 2 implementation
- Cron health v3.1 — schedule-string parsing

---

## WATCH LIST

### Due next session

- Validate adequacy grades (step 10) — expect NY A, PP A, CFW B, Invegent D
- Validate cron health alerts still 0
- Check Saturday 08:05 AEST token-expiry auto-ran clean
- PK choose CC-TASK-02 fix: Option A vs B
- R4 distribution monitoring check — 1 week + 1 month windows

### Due week of 22-27 Apr

- **Mon 27 Apr** — Meta App Review escalation trigger
- **Sat 2 May** — original reviewer calibration cycle trigger (defer)

### Backlog (open)

**New 24 Apr Session 2 (from R5 impl + diagnostic):**
- R5 v1.4 polish (Hungarian optimal dedup if greedy proves suboptimal — not urgent)
- `t.router_policy_default` table for global weight storage (low-priority cleanup)
- **Cold-start synthetic test** (PK's comedy brand test client — aspirational, define later)
- Fitness matrix calibration against real engagement data (waits on insights-worker + 4 weeks data)
- R6 impl — bundles Router Findings 1+4+6

**Invegent-specific escalation (from diagnostic, ready to hand off):**
- Discovery needs feeds producing `stat_heavy` + `timely_breaking` content
- Current feed pool produces only `analytical` + `human_story`
- Until discovery addresses this, 7 weekly slots (~39% of demand) can't be filled with strong-fit content

**CFW-specific action:**
- 4 carousel slots (IG + LI) thin because only 2 of 26 feeds enabled
- Feed activation check before R6 goes live on CFW

**Existing HIGH:** CC-TASK-02 HIGH fix

**Not HIGH:**
- CC-TASK-03 usePlatformVocab + useFormatVocab rollout
- D168 Layer 2 implementation
- Invegent FB + IG activation (v0.2 positioning required)
- Avatar configuration for Invegent (HeyGen)

**Earlier backlog unchanged:** R6 follow-up items, cron dashboard tile, stream B source type, v0.2 Invegent positioning, CFW IG drafts, stale branches, publisher schedule audit, m.post_publish_queue CHECK constraint, TPM saturation, docs/archive 5th file, reviewer pollution, PP Schedule FB 6/5 violation, exec_sql sweep, facebook-publisher EF audit, Shrishti 2FA.

---

## TODAY'S COMMITS (24-25 APR — FINAL)

**Invegent-content-engine (main) — 23 commits total:**

Earlier today (through 25 Apr morning) — 20 commits logged in prior sync_state.

Session 2 (24 Apr late-evening):
- `69986b9` — docs(briefs): R5 implementation retrospective
- `28d9397` — docs(sync_state): R5 LIVE + cron alerts cleared
- `d0f816f` — docs(briefs): R5 pool-adequacy diagnostic
- **THIS COMMIT** — docs(sync_state): pool-adequacy diagnostic LIVE + Session 2 close

**Migrations (DB-only, 29 total):**

Earlier today — 21 migrations logged in prior sync_state.

Session 2 (8 new):
- `resolve_stale_cron_health_alerts_20260424`
- `r5_matching_layer_step1_schema_20260424`
- `r5_matching_layer_step2_seed_20260424`
- `r5_matching_layer_step3_function_20260424`
- `r5_matching_layer_step3_function_v1_1_fix_quality_scale_20260424`
- `r5_matching_layer_step3_function_v1_2_within_run_dedup_20260424`
- `r5_matching_layer_step3_function_v1_3_greedy_plpgsql_20260424`
- **`r5_pool_adequacy_diagnostic_20260424`**

**invegent-dashboard (main):**
- `59bfe66` — docs(roadmap): sync 22 + 24 Apr (CC-TASK-01)
- `4861b56` — fix: CC-TASK-04 (H1 + M9)
- `425ec31` — docs(roadmap): R5 LIVE update

---

## CLOSING NOTE FOR NEXT SESSION

24-25 Apr is the highest-output session on record. Session 2 added R5 LIVE + pool-adequacy diagnostic on top.

**Final tally:**
- **23 commits** on Invegent-content-engine
- **29 DB migrations** applied
- **15 briefs** committed
- **8 sprint items closed**
- **4 Claude Code tasks closed**
- **R4 classifier LIVE** and auto-running
- **R5 matching layer LIVE** (v1.3 greedy dedup)
- **Pool-adequacy diagnostic LIVE** (grades A-F with actionable routing)
- **Invegent v0.1 prompt stack SHIPPED**
- **CFW at full prompt parity**
- **1 live production bug caught + fixed**
- **6 stale cron-health alerts resolved**
- **11 audit findings produced, 8 closed**

**Pipeline state:** R4 + R5 + diagnostic LIVE end-to-end. Still not wired into publishing hot path (R6 does that). IG publisher remains paused per D165. CC-TASK-02 HIGH dormant.

**Remaining HIGH-priority items:**
- R6 (~3-4h, Findings 1+4+6 bundled) — **fully unblocked**
- CC-TASK-02 fix (PK chooses Option A vs B)

**Not HIGH (defence-in-depth):** D168 Layer 2, hook rollout, Cron v3.1.

**Realistic next working windows:**
- 25 Apr Saturday: dead day OR R6 impl if energy holds
- 27 Apr Monday: Meta App Review escalation + R6 start + CC-TASK-02 fix

**Lessons captured 24-25 Apr (18 total, 2 new from Session 2):**

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
17. **Spec-vs-live-schema reconciliations are structural, not bugs.** Future specs should include a pre-build verification pass.
18. **"Works on the clients we have" is not the same as "works for any new client."** A 20/20 slot fill rate can hide a 10-slot demand shortfall if you only report what was filled. Ship diagnostic layers alongside functional code so quality problems route to the right team before they become content problems. PK's instinct — "I need to be sure before R6" — was correct and produced a permanent structural improvement, not a one-off check.
