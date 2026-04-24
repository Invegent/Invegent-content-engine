# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-24 Friday late-evening — **R5 LIVE (`m.match_demand_to_canonicals()` v1.3 greedy dedup) + cron health alerts cleared + token-expiry verified**
> Written by: PK + Claude session sync

---

## 🟢 24 APR LATE-EVENING SESSION 2 — R5 MATCHING LAYER LIVE + CRON HEALTH CLEAN

### In one paragraph

PK opened the 6:45pm Friday window for "fix cron alerts, then R5 impl". Cron alerts cleared inside 15 minutes: token-expiry-alert-daily's `checked_at` fix had already landed in `public.check_token_expiry()` earlier today but the function hadn't fired yet (daily schedule 08:05 AEST, next fire Saturday morning); manually invoked, ran clean, zero alerts produced, resolved the stale `consecutive_failures` alert by hand. Five other `no_recent_runs` alerts were all monitor v3 cadence-sampling limitation (weekly/monthly crons with ≤1 run sample fall back to 2-hour min threshold) — all resolved manually with notes pointing at the existing "Cron health v3.1 schedule-string parsing" backlog item. Migration `resolve_stale_cron_health_alerts_20260424` closed all 6 with audit trail. Then R5: three atomic step-migrations landed the 5 tables + 1 view + 60-row fitness matrix + 4 dedup policies + `m.match_demand_to_canonicals()` function. Hit THREE spec-vs-live reconciliations in Step 3 — documented in `docs/briefs/2026-04-24-r5-impl-retrospective.md`: (1) `m.post_format_performance` name collision with existing aggregate table, renamed R5's per-publish variant; (2) `m.digest_item.final_score` is 0-12 not 0-1 as spec assumed, added normalisation constant `c_bundler_score_max = 12.0` with LEAST clamp; (3) spec's within-run dedup step "fall to second-best candidate" was algorithmically underspecified — first implementation dropped orphan slots silently, v1.3 replaced with proper greedy assignment via PL/pgSQL loop walking the candidate pool in global score-desc order. Final smoke test clean across all 4 clients: NY 20/20 slots, PP 20/20, CFW 8/8, Invegent 10/10, zero duplicate canonicals, score distributions sensible (NY avg 73.5, range 53.0-87.3).

### R5 shipping state

| Object | Schema | Purpose | Row count | Writer |
|---|---|---|---|---|
| `class_format_fitness` | `t` | Default (class × format) → fitness 0-100 | **60** (6 × 10) | seed only |
| `client_class_fitness_override` | `c` | Per-client fitness overrides | 0 | populated as bad fits surface |
| `client_match_weights` | `c` | Per-client fitness/quality/recency weight overrides | 0 | empty = global 40/30/30 |
| `post_format_performance_per_publish` | `m` | R7 learning substrate | 0 | future insights-worker (Phase 2.1) |
| `client_dedup_policy` | `c` | Cross/same platform dedup gaps | **4** (all active clients, 24h/7d) | seed only |
| `vw_effective_class_format_fitness` | `t` (view) | Effective fitness = COALESCE(override, default) | n/a | n/a |
| `match_demand_to_canonicals()` | `m` | Greedy matching function | — | STABLE read-only |

**Verified smoke test output (v1.3 greedy dedup):**

| Client | Slots matched | Distinct canonicals | Dupes | Avg score | Score range |
|---|---|---|---|---|---|
| NDIS-Yarns | 20/20 | 20 | 0 | 73.5 | 53.0–87.3 |
| Property Pulse | 20/20 | 20 | 0 | 70.9 | 50.0–89.8 |
| CFW | 8/8 | 8 | 0 | 53.5 | 48.2–59.0 |
| Invegent | 10/10 | 10 | 0 | 48.8 | 37.0–56.2 |

Routing hits spec rationale on the nose: NY's IG × animated_data goes to stat_heavy (fitness 97), IG × carousel to multi_point (98), YT × video_short_avatar to human_story (92). FB × carousel demoted to analytical (75) because multi_point winners went to IG/LI carousel first — correct greedy behaviour.

### Cron health state

All 6 open alerts resolved by `resolve_stale_cron_health_alerts_20260424`. Live count: 0 open. Next natural run of `token-expiry-alert-daily` Saturday 08:05 AEST will confirm permanent fix.

| Alert | Root cause | Resolution |
|---|---|---|
| `token-expiry-alert-daily` consecutive_failures | Stale: fix landed earlier; cron hadn't fired to pick it up | Manually invoked function (clean run); resolved alert |
| 5× no_recent_runs on weekly/monthly crons | Monitor v3 needs ≥2 runs for cadence sample; falls back to 2h threshold | All resolved with note pointing at "Cron health v3.1" backlog |

### Migrations (this session)

- `resolve_stale_cron_health_alerts_20260424` — 6 alerts cleared
- `r5_matching_layer_step1_schema_20260424` — 5 tables + 1 view
- `r5_matching_layer_step2_seed_20260424` — 60 fitness rows + 4 dedup policies
- `r5_matching_layer_step3_function_20260424` — initial v1 function
- `r5_matching_layer_step3_function_v1_1_fix_quality_scale_20260424` — normalise quality 0-12→0-100
- `r5_matching_layer_step3_function_v1_2_within_run_dedup_20260424` — rn-based dedup attempt (orphan bug)
- `r5_matching_layer_step3_function_v1_3_greedy_plpgsql_20260424` — greedy PL/pgSQL loop, LIVE

### Spec-vs-live reconciliations captured

Full write-up: `docs/briefs/2026-04-24-r5-impl-retrospective.md`.

1. **Table name collision** — `m.post_format_performance` existed → R5 renamed to `_per_publish`
2. **Quality normalisation** — spec assumed 0-1, live is 0-12
3. **Greedy dedup gap** — spec said "fall to second-best" without specifying algorithm; v1.3 walks candidate pool by global final_score DESC, accepts if both ends unclaimed

Spec-review checklist addition for future specs: (a) grep every new table name against `k.vw_table_summary` before finalising; (b) verify actual MIN/MAX/AVG of any column the spec does arithmetic on; (c) spell out algorithms for "fall to" / "fall through" language explicitly.

### Commits (this block)

- `69986b9` — docs(briefs): R5 implementation retrospective
- **THIS COMMIT** — docs(sync_state): R5 LIVE + cron alerts cleared + token-expiry verified

### Backlog impact

Removes from HIGH priority:
- ~~R5 impl~~ ✅ CLOSED
- ~~Token-expiry fix / stale monitor alerts~~ ✅ RESOLVED

Unblocks:
- **R6 impl** — `seed_and_enqueue` rewrite consuming R5 output; bundles Router Findings 1+4+6; ~3-4h estimated

Adds to backlog:
- None new — all issues were already tracked

---

## 🟢 25 APR SESSION PREP — SPECS ALREADY v2

Prior session (earlier 24-25 Apr) had the R5 and D168 specs labelled "ready for review, 7 open questions each". As of this session start: **both specs are v2, 5-6 of 7 questions resolved, data-dependent ones remaining but non-blocking**. The sync_state was lagging the actual doc state. Reading both specs confirmed:

- R5 spec v2: 5/7 resolved (weights 40/30/30, threshold 50 with recency-override, matrix scope 60 rows, dedup time-windowed, override semantics replacement). 2 data-dependent (when to revisit defaults; when to move to data-driven tuning) — reviewed after 4 weeks of insights data.
- D168 spec v2: 6/7 resolved. 1 runtime (which check fires first). **Implementation still deferred** per defence-in-depth posture.

Structural R5 build therefore unblocked — which is what this session shipped.

---

## 🟢 24 APR LATE-EVENING — R4 STEP 3 LIVE (classifier function + sweep + cron)

*(retained from prior sync — R4 backfill confirmed complete, distribution on full 481-row success-only sample: analytical 52.2% (within spec), stat_heavy 16%, human_story 14.1%, multi_point 13.5%, educational_evergreen 2.7% (resolved the first-51 yellow flag), timely_breaking 1.5% (expected — corpus is >72h old). No tuning required tonight; let the month-of-monitoring window run as spec'd.)*

PK approved the R4 v1 seed with the explicit frame: ship it, run for ~a month, tune in place via UPDATE — everything is table-driven so rank/rules/thresholds change without any function rewrite. Three functions shipped in one atomic migration. Cron `classify-canonicals-every-5m` (**jobid 68**, active=TRUE) running cleanly; 1,749/1,749 canonicals classified.

### Layer 1 monitoring auto-watches jobid 68

No action needed. `m.refresh_cron_health()` picks up jobid 68 automatically.

### Migration

- `r4_d143_classifier_step3_function_sweep_cron_20260424` — 3 functions + cron scheduled + DO-block verification

---

## 🟢 24 APR EVENING (INVEGENT v0.1 PROMPT STACK) — LI + YT SHIPPED

Invegent 0/12 gap closed with 6/6 for configured platforms (LinkedIn + YouTube × rewrite_v1/synth_bundle_v1/promo_v1). FB + IG intentionally skipped per `platform_rules.global.not_configured_platforms`.

### Coverage matrix (final)

| Client | FB r/s/p | IG r/s/p | LI r/s/p | YT r/s/p | Total | Scope |
|---|---|---|---|---|---|---|
| NDIS-Yarns | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 12/12 | all 4 platforms |
| Property Pulse | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 12/12 | all 4 platforms |
| Care For Welfare | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 12/12 | all 4 platforms |
| Invegent | 0/0/0 | 0/0/0 | 1/1/1 | 1/1/1 | 6/6 | LI + YT only (v0.1 config) |

---

## 🟢 25 APR — CC-TASK-02 CLOSED (EF `.upsert()` audit — 1 HIGH)

**HIGH:** `feed-intelligence` EF upserts into `m.agent_recommendations` with `onConflict: 'source_id,recommendation_type'` but the matching constraint is a PARTIAL index. Currently DORMANT — fires on first real recommendation. Silent-failure class.

**Fix options (PK to choose):**
- **Option A** — Replace partial unique index with full UNIQUE. Simplest, loses partial semantics.
- **Option B (recommended)** — SECURITY DEFINER RPC echoing WHERE predicate. Preserves semantics.
- **Option C** — NOT VIABLE.

---

## 🟢 25 APR — CC-TASK-03 CLOSED + CC-TASK-04 CLOSED

CC-TASK-03: 1 HIGH / 9 MEDIUM / 3 LOW. CC-TASK-04: H1 + M9 shipped to dashboard `4861b56`. Audit trilogy complete.

---

## 🟢 24 APR EVENING (TRACK B) — R4 TABLES LANDED + R5/D168 SPECS + CFW PARITY

*(both specs now v2 with most questions resolved — see session prep block above)*

---

## 🟢 24 APR EVENING — ROUTER CATALOG UNIFICATION SHIPPED

Near-catastrophic near-miss avoided. Extended `t.5.0_social_platform` + `t.5.3_content_format` instead of building parallel catalogs. 29 FKs added. `k.refresh_column_registry` multi-FK dupe bug fixed as bonus.

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

**Read this entire file before doing anything else.** 24-25 Apr was the highest-output run on record; late-evening Session 2 added R5 LIVE on top of that.

### Full 24-25 Apr tally (now including Session 2)

- **22 commits** on Invegent-content-engine (20 prior + 2 Session 2)
- **28 DB migrations** applied (21 prior + 7 Session 2 R5)
- **14 briefs** committed (13 prior + R5 retrospective)
- **8 sprint items closed** (7 prior + R5)
- **4 Claude Code tasks closed**
- **R4 classifier LIVE** and auto-running (jobid 68, backfill complete)
- **R5 matching layer LIVE** (`m.match_demand_to_canonicals()` v1.3)
- **Invegent v0.1 prompt stack SHIPPED** (6/6 configured scope)
- **CFW at full prompt parity** (12 rows)
- **1 live production bug caught + fixed same session** (token-expiry x 2 checks — initial fix plus Session 2 alert cleanup)
- **2 orphaned v1 seed functions removed**
- **1 latent infrastructure bug fixed** (k.refresh_column_registry)
- **11 audit findings produced, 8 closed**

### Critical state awareness

1. A11b CLOSED.
2. Cron health monitoring LIVE. **All alerts resolved.** 0 open.
3. Token-expiry function verified clean.
4. A21 CLOSED (DB). CC-TASK-02 CLOSED (EF) with 1 HIGH pending fix.
5. ROUTER CATALOG UNIFIED.
6. `k.refresh_column_registry` fixed.
7. **R4 LIVE and auto-running.** Full backfill 1,749/1,749 done.
8. **R5 LIVE.** v1.3 greedy dedup. Smoke tested across all 4 clients.
9. D168 Layer 2 spec v2 ready. Not HIGH priority.
10. CFW 12/12 parity. Invegent 6/6 for configured platforms.
11. **R6 now fully unblocked.** Consumes R5 output. Bundles Router Findings 1+4+6. ~3-4h.
12. `instagram-publisher-every-15m` (jobid 53) remains PAUSED.
13. ID004 closed.
14. M8 Gate 4 CLOSED.
15. M12 still superseded per D166.
16. 2 CFW IG drafts in `needs_review` — decision TBD.
17. Dashboard roadmap sync SHIPPED (CC-TASK-01).
18. CC-TASK-03 CLOSED + CC-TASK-04 CLOSED.
19. Reviewers still paused.
20. Pipeline clean.

### Router state — snapshot

- ✅ R1: `t.platform_format_mix_default` + 22 seed rows
- ✅ R2: `c.client_format_mix_override`
- ✅ R3: `m.build_weekly_demand_grid()`
- ✅ R4 schema + seed + function + sweep + cron — FULLY LIVE
- ✅ **R5 matching layer — FULLY LIVE (v1.3 greedy dedup)**
- 🔲 R6: seed_and_enqueue rewrite — ~3-4h, **NOW FULLY UNBLOCKED**
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
9. **Validate R5 infrastructure:** `COUNT(*) FROM t.class_format_fitness WHERE is_current=TRUE` = 60; `COUNT(*) FROM c.client_dedup_policy` = 4; `m.match_demand_to_canonicals` function present
10. Validate coverage matrix: CFW 12/12; NY 12/12; PP 12/12; Invegent 6/6 (LI+YT only)
11. Validate R4 backfill complete: 1,749/1,749
12. Check `m.cron_health_alert WHERE resolved_at IS NULL` = 0
13. Check ID004 recovery
14. Check file 15 Section G — pick next sprint item
15. Check `m.external_review_queue`
16. Read `docs/06_decisions.md` D156–D168
17. Query `k.vw_table_summary` before any table work

---

## DEV WORKFLOW RULE (D165)

**Default: direct-push to main.** Deviate only for multi-repo coordinated risk or PK-flagged risk.

---

## EXTERNAL REVIEWER LAYER (UNCHANGED)

All four reviewers still paused.

---

## CURRENT PHASE

**Phase 1 — COMPLETE.** **Phase 3 — Expand + Personal Brand** active.

Pre-sales gate: 11-12 of 28 Section A items closed (R5 LIVE adds a full close).

Today's movement:
- Morning: orphan sweep, M8 Gate 4 PASS, CFW correction
- Mid-day: M1 / A11b CLOSED
- Afternoon: Cron monitoring + Q5 CLOSED
- Late afternoon: A21 / L6 CLOSED
- Evening: Router catalog unification SHIPPED
- Evening Track B: R4 schema+seed LIVE, R5 spec, D168 spec, CFW 12/12
- Evening Invegent: v0.1 LI+YT prompt stack SHIPPED (6/6)
- 25 Apr morning: CC-TASK-01/02/03/04 — audit trilogy + cleanup
- 25 Apr morning: R4 Step 3 LIVE
- **24 Apr late-evening Session 2: cron alerts cleared, token-expiry verified, R5 LIVE (v1.3)**

---

## ALL CLIENTS — STATE

| Client | client_id | FB | IG | LI | YT | Schedule | Digest policy | Prompt stack | Notes |
|---|---|---|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ | ⏸ | ✅ | 🔲 | 6 rows | ✅ lenient | 12/12 | 63 dead m8_m11_bloat |
| Property Pulse | 4036a6b5 | ✅ | ⏸ | ✅ | 🔲 | 6+tier | ✅ lenient | 12/12 | 44 dead |
| Care For Welfare | 3eca32aa-e460 | ✅ | ⏸ | ⚠ | 🔲 | 21 rows | ✅ strict | 12/12 | 2 IG drafts pending |
| Invegent | 93494a09 | not configured | not configured | ⚠ | ⚠ | 0 rows | ✅ strict | 6/6 v0.1 (LI+YT) | Publishing deferred |

---

## SPRINT MODE — THE BOARD

### Router track

| # | Item | Status |
|---|---|---|
| R1 | mix_default + seed | ✅ |
| R2 | client override | ✅ |
| R3 | demand grid function | ✅ |
| Catalog unification | extended + FKs | ✅ |
| R4 tables + seed | 6 classes, 20 rules | ✅ |
| R4 function + sweep + cron | jobid 68 active | ✅ LIVE |
| R5 spec v2 | fitness matrix + matching algorithm | ✅ |
| **R5 impl** | `m.match_demand_to_canonicals()` v1.3 | **✅ LIVE** |
| R6 | seed_and_enqueue rewrite (Findings 1+4+6) | 🔲 ~3-4h — **NOW UNBLOCKED** |
| R7 | ai-worker platform-awareness | 🔲 depends on R6 |
| R8 | Cron changes | 🔲 depends on R6 |

### HIGH priority items remaining

| # | Item | Why HIGH |
|---|---|---|
| **R6** | seed_and_enqueue rewrite (Findings 1+4+6 bundled) | IG publisher paused until router verifies. Now fully unblocked by R5 LIVE. |
| **CC-TASK-02 fix** | Fix feed-intelligence upsert (Option A vs B; recommended B) | Silent-failure class, fires on first real recommendation |

**Not HIGH:**
- `usePlatformVocab` + `useFormatVocab` hook rollout — 3-4h
- **D168 Layer 2 implementation** — spec v2 ready; triggered by next ID004-class incident
- Cron health v3.1 — schedule-string parsing (already in backlog)

---

## WATCH LIST

### Due next session

- Validate R5 smoke test still passes (should be stable — STABLE function, read-only)
- Validate `m.cron_health_alert WHERE resolved_at IS NULL` still 0
- Check Saturday 08:05 AEST `token-expiry-alert-daily` auto-ran clean (confirms fix propagated)
- PK choose CC-TASK-02 fix: Option A vs B
- R4 distribution monitoring check — 1 week + 1 month windows

### Due week of 22-27 Apr

- **Mon 27 Apr** — Meta App Review escalation trigger
- **Sat 2 May** — original reviewer calibration cycle trigger (defer)

### Backlog (open)

**New 24 Apr Session 2 (from R5 impl):**
- R5 v1.4 polish opportunities (none urgent): optimal Hungarian dedup if greedy proves suboptimal empirically; `t.router_policy_default` table for global weight storage (currently hardcoded constant)
- R6 impl — bundles Router Findings 1+4+6; consumes R5 output → m.post_seed + m.post_draft + m.ai_job

**Existing HIGH:**
- CC-TASK-02 HIGH fix

**Not HIGH:**
- CC-TASK-03 usePlatformVocab + useFormatVocab hook rollout
- D168 Layer 2 implementation
- Invegent FB + IG activation (v0.2 positioning required)
- Avatar configuration for Invegent (HeyGen) — blocks YT avatar format unlock

**24 Apr Track B remaining:**
- D168 Layer 2 implementation — spec v2 ready, deferred until defence-in-depth trigger

**24 Apr router-catalog:**
- R6 bundled work (Findings 1+4+6)
- Blog vs website consolidation — LOW

**24 Apr afternoon:**
- Cron health dashboard tile (CC-TASK-07 candidate)
- Cron health v3.1 — schedule-string parsing
- Notification layer for `m.cron_health_alert`
- Document `expires_at` sentinel

**24 Apr mid-day:**
- Stream B source type implementation
- Invegent publishing activation checklist
- v0.2 positioning review for Invegent (2-3 months)

**Carried from 24 Apr AM:**
- 2 CFW IG drafts in `needs_review`
- Stale non-main branches (8 total, cosmetic)

**Carried from earlier:**
- Publisher schedule source audit
- `m.post_publish_queue.status` has NO CHECK constraint — D163 continuation
- TPM saturation on concurrent platform rewrites
- `docs/archive` 5th-file mystery
- Per-commit external-reviewer pollution
- Property Pulse Schedule Facebook 6/5 tier violation
- 30+ remaining exec_sql sites in dashboard (CC-TASK-06 candidate)
- `facebook-publisher` EF audit (CC-TASK-05 candidate)
- Shrishti 2FA + passkey

---

## TODAY'S COMMITS (24-25 APR — FINAL)

**Invegent-content-engine (main) — 22 commits total:**

Earlier today (through 25 Apr morning) — 20 commits logged in prior sync_state.

Session 2 (24 Apr late-evening):
- `69986b9` — docs(briefs): R5 implementation retrospective
- **THIS COMMIT** — docs(sync_state): R5 LIVE + cron alerts cleared + token-expiry verified

**Migrations (DB-only, 28 total):**

Earlier today — 22 migrations logged in prior sync_state.

Session 2 (7 new):
- `resolve_stale_cron_health_alerts_20260424` — 6 alerts cleared
- `r5_matching_layer_step1_schema_20260424` — 5 tables + 1 view
- `r5_matching_layer_step2_seed_20260424` — 60 fitness rows + 4 dedup policies
- `r5_matching_layer_step3_function_20260424` — initial function
- `r5_matching_layer_step3_function_v1_1_fix_quality_scale_20260424` — quality fix
- `r5_matching_layer_step3_function_v1_2_within_run_dedup_20260424` — bugged dedup
- `r5_matching_layer_step3_function_v1_3_greedy_plpgsql_20260424` — greedy LIVE

**invegent-dashboard (main):**
- `59bfe66` — docs(roadmap): sync 22 + 24 Apr (CC-TASK-01)
- `4861b56` — fix: CC-TASK-04 (H1 + M9)

*(invegent-portal / invegent-web: no 24-25 Apr commits)*

---

## CLOSING NOTE FOR NEXT SESSION

24-25 Apr is the highest-output session on record. Late-evening Session 2 added R5 LIVE plus cron-health cleanup on top.

**Final tally:**
- **22 commits** on Invegent-content-engine
- **28 DB migrations** applied
- **14 briefs** committed
- **8 sprint items closed**
- **4 Claude Code tasks closed**
- **R4 classifier LIVE** and auto-running
- **R5 matching layer LIVE** (v1.3 greedy dedup)
- **Invegent v0.1 prompt stack SHIPPED**
- **CFW at full prompt parity**
- **1 live production bug caught + fixed same session (twice)**
- **6 stale cron-health alerts resolved with audit trail**
- **11 audit findings produced, 8 closed**

**Pipeline state:** R4 + R5 LIVE end-to-end. Still not wired into the publishing hot path (R6 does that). IG publisher remains paused per D165. CC-TASK-02 HIGH remains dormant/silent — no user impact today.

**Remaining HIGH-priority items:**
- R6 (~3-4h, Findings 1+4+6 bundled) — **fully unblocked**
- CC-TASK-02 fix (PK chooses Option A vs B)

**Not HIGH (defence-in-depth):**
- D168 Layer 2 implementation (spec v2 ready)
- `usePlatformVocab` + `useFormatVocab` hook rollout
- Cron health v3.1 schedule-string parsing

**Realistic next working windows:**
- 25 Apr Saturday: dead day OR R6 impl if energy holds
- 27 Apr Monday: Meta App Review escalation + R6 start + CC-TASK-02 fix

**Lessons captured 24-25 Apr (17 total, 1 new from Session 2):**

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
17. **Spec-vs-live-schema reconciliations are structural, not bugs.** R5 Session 2 hit three: (a) table name already existed, (b) column range was 0-12 not 0-1, (c) spec said "fall to second-best" without specifying algorithm. Each was fixable in 10-30 min mid-implementation. Future specs should include a pre-build verification pass: grep new table names, MIN/MAX/AVG queries on referenced columns, and explicit algorithm spec for "fall through" language.
