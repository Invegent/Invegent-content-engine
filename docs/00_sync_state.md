# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-24/25 — **R4 Step 3 LIVE (classifier function + sweep + cron jobid 68)** — full backfill of ~1,749 canonicals draining at 100/5min, completes in ~80 min
> Written by: PK + Claude session sync

---

## 🟢 24 APR LATE-EVENING — R4 STEP 3 LIVE (classifier function + sweep + cron)

### In one paragraph

PK approved the R4 v1 seed (priority order, rule vocabulary, fallback semantics) with the explicit frame: ship it, run for ~a month, tune in place via UPDATE — everything is table-driven so rank/rules/thresholds change without any function rewrite. Shipped three functions in one atomic migration (`r4_d143_classifier_step3_function_sweep_cron_20260424`): (1) `m.evaluate_rule(rule_type, rule_config, title, body, word_count, first_seen, source_types[], source_names[])` — STABLE, NULL-safe, 9-rule-type CASE interpreter covering `title_regex`, `body_regex`, `numeric_density`, `word_count_range`, `source_type_match`, `source_name_match`, `pronoun_density`, `recency_window`, `list_marker_count`; (2) `m.classify_canonical(UUID)` — loads canonical facts once (title + body + word_count + first_seen + source arrays via `content_item_canonical_map → content_item → feed_source`), iterates classes in priority order, first-match-wins, fallback class (zero active rules) matches unconditionally, hard-backstop to `analytical` if nothing matches; (3) `m.classify_canonicals_unclassified(batch_size INT DEFAULT 100)` — batch sweep with `pg_try_advisory_xact_lock` to prevent overlap and per-row exception tolerance so one bad row doesn't halt the batch. Pre-scheduled smoke tests: 12 random canonicals + 30 random fetch-success canonicals = classification shapes look sensible. Manual sweep of 100 rows ran in <1 second with zero failures. Cron `classify-canonicals-every-5m` (**jobid 68**, active=TRUE, runs under `postgres`) scheduled and fired cleanly once already (06:10 UTC, 0.26s duration, 100 rows). At 100 rows per 5 minutes with ~1,549 remaining, full backfill drains in ~80 minutes. Spec had budgeted 12 hours assuming ~14k canonicals — actual total is 1,749 so we're an order of magnitude faster.

### Distribution snapshot (first 100 classified — biased oldest-first via `ORDER BY updated_at ASC`)

| fetch_status | Rows | Dominant class | Note |
|---|---|---|---|
| `success` | 51 | analytical 49% · stat_heavy 24% · human_story 22% · multi_point 4% · timely_breaking 2% · educational_evergreen 0% | within spec thresholds (<60% any single class); one yellow flag on evergreen at 0% |
| `paywalled` | 36 | analytical 97% | expected — no body → backstop |
| `blocked` | 13 | analytical 85% | expected |
| **All 100** | | analytical 71% · stat_heavy 13% · human_story 11% · multi_point 2% · timely_breaking 2% · educational_evergreen 1% | 71% analytical is oldest-first bias (paywalled-heavy); success-only breakdown is the real signal |

### Yellow flag to monitor over the coming month

`educational_evergreen = 0%` on success rows in a sample of 51. The `^(how to|what is|why|when|the complete guide|a guide to|...)` title anchors are strict — most articles don't literally start with these phrases. Possible tunings (all in-place, zero function change):
- Loosen rule_group 1 anchor from `^` to `(^|\W)` — allows leading punctuation or words before the marker
- Add `|step[- ]by[- ]step|checklist` to rule_group 2 whitelist
- Widen rule_group 3's body marker window from 500 → 1000 chars

Sequence: wait for ~2 weeks of classifications → query distribution → tune if `educational_evergreen` stays below 2%.

### Layer 1 monitoring auto-watches jobid 68

No action needed. `m.refresh_cron_health()` reads from `cron.job_run_details` every 15 min and will pick up jobid 68 automatically. If the classifier starts failing consecutively, `m.cron_health_alert` will surface it.

### Layer 2 (when implemented) will complement

D168 spec includes a check `oldest_unclassified_canonical_hours` with `expected_max=4`. If the classifier runs cleanly but stops producing writes (ID004-class bug), that backlog metric grows linearly → Layer 2 catches what Layer 1 misses. Implementation still deferred per D168 being defence-in-depth.

### Migration

- `r4_d143_classifier_step3_function_sweep_cron_20260424` — 3 functions + cron scheduled + DO-block verification (version consistency + analytical fallback presence).

### Verification queries (for next session startup)

```sql
-- Function presence
SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'm' AND p.proname LIKE 'classify%' OR p.proname = 'evaluate_rule'
ORDER BY 1;
-- Expected: evaluate_rule, classify_canonical, classify_canonicals_unclassified

-- Cron active
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobid = 68;
-- Expected: 1 row, active=TRUE, schedule '*/5 * * * *'

-- Backfill progress
SELECT COUNT(*) FILTER (WHERE content_class IS NOT NULL) AS done,
       COUNT(*) FILTER (WHERE content_class IS NULL AND fetch_status IS NOT NULL) AS pending,
       COUNT(*) AS total
FROM f.canonical_content_body;
-- After ~80 min from 06:10 UTC: done = 1,749, pending = 0

-- Class distribution (the signal to monitor for tuning)
SELECT content_class, COUNT(*), ROUND(100.0*COUNT(*)/SUM(COUNT(*)) OVER (), 1) AS pct
FROM f.canonical_content_body WHERE content_class IS NOT NULL
GROUP BY content_class ORDER BY 2 DESC;
```

### Classifier design note (durable — worth capturing)

The interpreter (`m.evaluate_rule`) is pure logic — no table reads, no version awareness. All classification vocabulary lives in `t.content_class` + `t.content_class_rule`. Adding a class = INSERT. Changing a rule = UPDATE. Removing a class = UPDATE `is_active=FALSE`. Version bump = INSERT v2 rows + UPDATE v1 `is_current=FALSE`. Reclassification = UPDATE `f.canonical_content_body SET classifier_version = NULL` on the subset to reclassify; next sweep picks it up. The function body itself only changes if:
- A new `rule_type` is added to the vocabulary (requires interpreter update)
- The class-iteration logic itself changes (first-match-wins → weighted voting, etc.)

Neither is on the roadmap. The function should remain stable for months.

### Commits (this block)

- `r4_d143_classifier_step3_function_sweep_cron_20260424` (migration)
- THIS COMMIT — docs(sync_state): R4 Step 3 LIVE + CC-TASK-03 reference trued up

### Backlog impact

Removes from HIGH priority:
- ~~R4 Step 3 (classifier function + sweep + cron)~~ ✅ CLOSED

Unblocks:
- **R5 implementation** — classifier is now producing content_class values. After backfill drains (~80 min), R5 has clean class distribution to match against fitness. Still gated on PK review of R5 spec's 7 open questions.

Adds to monthly-tuning watch:
- educational_evergreen rule looseness (if <2% after 2 weeks of real data)
- analytical rule saturation (if >60% on success-only rows after 2 weeks)
- timely_breaking recency_window threshold (if <2% while freshly-ingested canonicals exist — recency rule too strict?)

---

## 🟢 24 APR EVENING (INVEGENT v0.1 PROMPT STACK) — LI + YT SHIPPED

Invegent 0/12 gap closed with 6/6 for configured platforms (LinkedIn + YouTube × rewrite_v1/synth_bundle_v1/promo_v1). FB + IG intentionally skipped per `platform_rules.global.not_configured_platforms`. Voice: first-person PK, builder-in-public, peer-to-peer, zero emojis on LI. Migration: `invegent_content_type_prompt_v0_1_li_yt_20260424`. Commit: `708421e`.

### Coverage matrix (final)

| Client | FB r/s/p | IG r/s/p | LI r/s/p | YT r/s/p | Total | Scope |
|---|---|---|---|---|---|---|
| NDIS-Yarns | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 12/12 | all 4 platforms |
| Property Pulse | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 12/12 | all 4 platforms |
| Care For Welfare | 1/1/1 | 1/1/1 | 1/1/1 | 1/1/1 | 12/12 | all 4 platforms |
| Invegent | 0/0/0 | 0/0/0 | 1/1/1 | 1/1/1 | 6/6 | LI + YT only (v0.1 config) |

Invegent's 6/6 is honest coverage — FB/IG rows would imply platform_rules that don't exist. Unlocks at v0.2 positioning bump.

---

## 🟢 25 APR — CC-TASK-02 CLOSED (EF `.upsert()` audit — 1 HIGH)

**HIGH:** `feed-intelligence` EF upserts into `m.agent_recommendations` with `onConflict: 'source_id,recommendation_type'` but the matching constraint is a PARTIAL index `uq_agent_rec_pending WHERE status='pending'`. Postgres cannot infer a partial index from ON CONFLICT without echoing the WHERE predicate. Verified live via EXPLAIN: ERROR 42P10. Currently DORMANT (table empty) — fires on first real recommendation. Silent-failure class (same family as M11, A21 Finding 1, ID004).

**Fix options (PK to choose):**
- **Option A** — Replace partial unique index with full UNIQUE on `(source_id, recommendation_type)`. Simplest, but loses the partial-index semantics (can't have two rows same cols with different status).
- **Option B (recommended)** — SECURITY DEFINER RPC that echoes the WHERE predicate. Mirrors `public.upsert_publish_profile()` pattern. Preserves partial semantics.
- **Option C** — NOT VIABLE. `supabase-js .upsert()` can't take a WHERE clause.

Brief: `docs/briefs/2026-04-25-ef-upsert-audit.md`. Closure commits: `23ed4c1` + `e9897d2`.

---

## 🟢 25 APR — CC-TASK-03 CLOSED (frontend vocab audit — 1 HIGH / 9 MEDIUM / 3 LOW)

Closure commits: `4f1ff5d` (findings brief `docs/briefs/2026-04-25-frontend-format-vocab-audit.md`) + `2a478fd` (sync_state closure line).

**HIGH (H1):** `invegent-dashboard/app/(dashboard)/actions/video-tracker.ts:52` — exec_sql SELECT filter includes `'video_avatar'` + `'video_episode'`. Both absent from `t."5.3_content_format"` catalog; zero rows in `m.post_draft` use them today. Dead-vocab read-path trap — silent UX bug today, latent write bug if pattern ever gets copied to an INSERT path. **10-min fix**, zero risk.

**MEDIUM ×9:** Dashboard dropdowns and arrays hardcoded to 3-7 of 17 catalog platforms.
- 7× platform dropdowns limited to FB/IG/LI/YT (`clients/page.tsx`, `VoiceFormatsTab.tsx`, Content Studio forms, `ScheduleTab.tsx`, `lib/platform-status.ts`)
- 1× `ClientProfileShell.tsx:640` at 7/17
- 1× (**M9**) `STUDIO_SUPPORTED_PLATFORMS` references `'email'` which is NOT in `t."5.0_social_platform"` — likely meant `'newsletter'`. Single-word fix worth doing promptly; if any route writes this value to a catalog-FK-bound column, FK fires.
- 1× `invegent-portal/app/onboard/OnboardingForm.tsx:13` — 5 titleCase display options (portal-only finding)

**LOW ×3:** `FORMAT_LABELS` Record maps missing active catalog entries. Falls through to raw format_key display. Cosmetic only.

**Recommended pattern:** `usePlatformVocab` + `useFormatVocab` React hooks fetching from catalog tables on mount with 5-min cache. Dropdowns consume hooks instead of hardcoding. Estimated 3-4 hours as focused frontend PR, or cleanup-on-touch. **Zero R6 blockers — frontend is decoupled from hot path.**

**Audit trilogy complete.** CC-TASK-01 (roadmap sync) + CC-TASK-02 (EF upsert) + CC-TASK-03 (frontend vocab) all closed in one session — 2 HIGH findings surfaced across all three (both classified HIGH, both currently dormant), rest cleanup-on-touch or defer.

### Proposed CC-TASK-04 — "Dead vocab + email typo cleanup" (pending PK approval)

Bundle fixes: CC-TASK-03 H1 (10 min — dead vocab in video-tracker.ts) + CC-TASK-03 M9 (single-word — `'email'` → `'newsletter'`). Zero interpretation risk. Single commit, ~15 min total. Deferred until PK approves the brief.

---

## 🟢 24 APR EVENING (TRACK B) — R4 TABLES LANDED + R5/D168 SPECS + CFW PARITY

Four deliverables in parallel with CC tasks 01–03:

| # | Artifact | Commit / Migration |
|---|---|---|
| D1 | R4 classifier tables + seed | `r4_d143_classifier_catalog_tables_and_seed_v1_20260424` |
| D2 | R5 matching layer spec (25k chars) | `e4bc18f` — `docs/briefs/2026-04-24-r5-matching-layer-spec.md` |
| D3 | D168 Layer 2 response-sentinel spec (23k chars) | `d0820c6` — `docs/briefs/2026-04-24-d168-layer-2-response-sentinel-spec.md` |
| D4 | CFW 6 new content_type_prompt rows | `cfw_content_type_prompt_youtube_and_promo_v1_20260424` |

Track B sync_state rollup: `80a55d1`.

### R5 / D168 open questions

R5 spec: weightings, threshold, matrix scope, dedup, overrides, campaigns, tuning cadence (7).
D168 spec: check shape, thresholds, cadence, dedup, retention, dashboard, notifications (7). Not HIGH priority.

---

## 🟢 24 APR EVENING — ROUTER CATALOG UNIFICATION SHIPPED

Near-catastrophic near-miss: was about to build `t.platform_catalog` + `t.format_catalog` parallel to existing `t.5.0_social_platform` (Dec 2025) + `t.5.3_content_format` (Mar 2026). PK's "what else is hardcoded?" saved the duplication. Pivoted to extending existing taxonomies: `is_router_target` + `content_pipeline` columns, 3 new platform rows (blog/newsletter/website), dropped 7 hardcoded CHECK constraints, added 29 FKs. Bonus: fixed `k.refresh_column_registry` multi-FK dupe bug (event trigger was breaking on every DDL). Brief: `docs/briefs/2026-04-24-router-catalog-unification-shipped.md` (`ac06043`).

### Router audit findings status

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Client UUIDs hardcoded in `m.enqueue_publish_from_ai_job_v1` | 🔴 HIGH | 🔲 Open — bundle into R6 |
| 2 | Format vocab in 4 CHECKs | 🔴 HIGH | ✅ CLOSED — FK to `t.5.3_content_format` |
| 3 | Platform vocab in 3 CHECKs | 🔴 HIGH | ✅ CLOSED — FK to `t.5.0_social_platform` |
| 4 | `seed_and_enqueue` demand formula hardcoded | 🟡 MED | 🔲 Open — bundle into R6 |
| 5 | Stealth digest_policy defaults | 🟡 MED | ✅ CLOSED — all 4 clients have explicit rows |
| 6 | `NOT IN ('youtube')` exclusion | 🟡 MED | 🔲 Unblocked — 1-line change in R6 once `content_pipeline` is read |
| 7 | Job priority magic numbers | 🟢 LOW | Deferred |
| 8 | AI provider CHECK | 🟢 LOW | Acceptable as-is |
| 9 | Validation view strict `= 100` | 🟢 LOW | ✅ CLOSED — ABS tolerance |

---

## 🟢 24 APR LATE-AFTERNOON — A21 ON CONFLICT AUDIT CLOSED

Swept 25 `ON CONFLICT` clauses across 21 SQL functions. 1 dormant M11-class bug (v1 seed functions referencing non-existent constraint — dropped). 1 latent cron 48 inconsistency (flagged for R6). 7 redundant indexes/constraints cleaned. Brief: `docs/briefs/2026-04-24-a21-on-conflict-audit.md` (`20d7f6d`).

---

## 🟢 24 APR AFTERNOON — CRON HEALTH MONITORING LAYER 1 LIVE

Watches `cron.job_run_details` every 15 min. Three alert types. First refresh caught live `token-expiry-alert-daily` schema drift — fixed same session.

---

## 🟢 24 APR MID-DAY — A11b CLOSED

CFW + Invegent v0.1 `c.client_ai_profile` (brand_profile + platform_rules + system_prompt) locked. CFW content_type_prompt 6 rows landed (extended to 12 in Track B).

---

## 🟢 24 APR SESSION-START — MORNING HOUSEKEEPING

Orphan branch sweep clean, M8 Gate 4 PASSED, CFW correction.

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else.** 24 Apr + early 25 Apr was the highest-output run on record by a very wide margin.

### Today's full tally

- **20 commits** on Invegent-content-engine (through R4 Step 3 close)
- **21 DB migrations** applied
- **13 briefs** committed (3 CC task briefs + 1 CC-TASK-02 findings + 1 CC-TASK-03 findings)
- **7 sprint items closed** (M1/A11b, Cron Layer 1, Q5, L6/A21, router catalog unification, CC-TASK-02 audit, **R4 Step 3**)
- **3 Claude Code tasks closed** (CC-TASK-01 roadmap sync + CC-TASK-02 EF audit + CC-TASK-03 frontend vocab audit)
- **R4 classifier LIVE and auto-running** (jobid 68, every 5m, backfill ~80 min from 06:10 UTC)
- **Invegent v0.1 prompt stack SHIPPED** (6/6 configured scope)
- **CFW at full prompt parity** (6→12 rows)
- **1 live production bug caught + fixed same session** (token-expiry)
- **2 orphaned v1 seed functions removed**
- **1 latent infrastructure bug fixed** (k.refresh_column_registry)
- **11 audit findings produced + 6 closed** (9 router + 1 CC-TASK-02 HIGH + 1 LOW + 1 CC-TASK-03 HIGH + 9 MEDIUM + 3 LOW)

### Critical state awareness

1. A11b CLOSED.
2. Cron health monitoring LIVE. Check `m.cron_health_alert WHERE resolved_at IS NULL`.
3. Token-expiry bug FIXED.
4. A21 CLOSED (DB). CC-TASK-02 CLOSED (EF) with 1 HIGH pending fix (Option A vs B, recommended B).
5. ROUTER CATALOG UNIFIED.
6. `k.refresh_column_registry` fixed.
7. **R4 LIVE and auto-running.** Classifier function + sweep + cron jobid 68. Backfill draining at 100/5min; full backfill ~80 min from 06:10 UTC.
8. R5 matching layer spec ready. 7 open Qs.
9. D168 Layer 2 spec ready. 7 open Qs. Not HIGH priority.
10. CFW at 12/12 parity. Invegent at 6/6 for configured platforms.
11. **R6 prep clearer:** Finding 6 = 1-line change; Findings 1+4 bundle. Total ~3-4h after R5 review.
12. `instagram-publisher-every-15m` (jobid 53) remains PAUSED.
13. ID004 closed.
14. M8 Gate 4 CLOSED.
15. M12 still superseded per D166.
16. 2 CFW IG drafts in `needs_review` — decision TBD.
17. Dashboard roadmap sync SHIPPED (CC-TASK-01).
18. **CC-TASK-03 CLOSED** with 1 HIGH dead-vocab finding, 9 MEDIUM, 3 LOW — all frontend, zero hot-path blockers.
19. Reviewers still paused.
20. Pipeline clean.

### Router state — snapshot

- ✅ R1: `t.platform_format_mix_default` + 22 seed rows
- ✅ R2: `c.client_format_mix_override`
- ✅ R3: `m.build_weekly_demand_grid()`
- ✅ R4 schema + seed + **function + sweep + cron** — FULLY LIVE. Classifying automatically every 5m.
- 🟡 R5: spec ready, 7 open questions — ready to impl once PK reviews
- 🔲 R6: seed_and_enqueue rewrite — ~3-4h, depends on R5
- 🔲 R7: ai-worker platform-awareness
- 🔲 R8: Cron changes
- ✅ Catalogs unified.

---

## SESSION STARTUP PROTOCOL

1. Read this file in full
2. Orphan branch sweep — all 3 repos
3. Check `c.external_reviewer` — confirm paused
4. Check IG publisher cron — jobid 53 `active=false`
5. Validate router shadow infrastructure: `SELECT * FROM t.platform_format_mix_default_check;` → 4 rows status='ok'
6. Validate router catalogs: `COUNT(*) FROM t."5.0_social_platform" WHERE is_router_target=TRUE` = 4; `COUNT(*) FROM c.client_digest_policy` = 4
7. Validate event trigger: `evtenabled` = 'O'; `k.refresh_column_registry()` returns empty
8. Validate R4 seed + function: `COUNT(*) FROM t.content_class WHERE is_current=TRUE` = 6; rules = 20; `SELECT active FROM cron.job WHERE jobid = 68` = true
9. Validate coverage matrix: CFW 12/12; NY 12/12; PP 12/12; Invegent 6/6 (LI+YT only)
10. **Validate R4 backfill complete:** `COUNT(*) FROM f.canonical_content_body WHERE content_class IS NULL AND fetch_status IS NOT NULL` should be 0 after ~80 min from 06:10 UTC
11. Check ID004 recovery
12. Check active cron health alerts
13. Check file 15 Section G — pick next sprint item
14. Check `m.external_review_queue`
15. Read `docs/06_decisions.md` D156–D168
16. Query `k.vw_table_summary` before any table work

---

## DEV WORKFLOW RULE (D165)

**Default: direct-push to main.** Deviate only for multi-repo coordinated risk or PK-flagged risk. Session-start orphan sweep non-negotiable.

---

## EXTERNAL REVIEWER LAYER (UNCHANGED)

All four reviewers still paused. Re-enable ceremony at ~18-19 of 28 Section A items closed.

---

## CURRENT PHASE

**Phase 1 — COMPLETE.** **Phase 3 — Expand + Personal Brand** active.

Pre-sales gate: 10-11 of 28 Section A items closed (R4 LIVE counts as full close on the classifier pre-req; R5 spec + D168 spec are partial progress).

Today's movement:
- Morning: orphan sweep, M8 Gate 4 PASS, CFW correction
- Mid-day: M1 / A11b CLOSED
- Afternoon: Cron monitoring + Q5 CLOSED
- Late afternoon: A21 / L6 CLOSED
- Evening: Router catalog unification SHIPPED
- Evening Track B: R4 schema+seed LIVE, R5 spec, D168 spec, CFW 12/12
- Evening Invegent: v0.1 LI+YT prompt stack SHIPPED (6/6 configured scope)
- 25 Apr morning: CC-TASK-01 dashboard roadmap sync
- 25 Apr morning: CC-TASK-02 EF upsert audit (1 HIGH)
- 25 Apr morning: CC-TASK-03 frontend vocab audit (1 HIGH / 9 MED / 3 LOW)
- **25 Apr morning: R4 Step 3 LIVE — classifier function + sweep + cron jobid 68**

---

## ALL CLIENTS — STATE

| Client | client_id | FB | IG | LI | YT | Schedule | Digest policy | Prompt stack | Notes |
|---|---|---|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ | ⏸ | ✅ | 🔲 | 6 rows | ✅ lenient | 12/12 | 63 dead m8_m11_bloat |
| Property Pulse | 4036a6b5 | ✅ | ⏸ | ✅ | 🔲 | 6+tier | ✅ lenient | 12/12 | 44 dead |
| Care For Welfare | 3eca32aa-e460 | ✅ | ⏸ | ⚠ | 🔲 | 21 rows | ✅ strict | 12/12 | 2 IG drafts pending |
| Invegent | 93494a09 | not configured | not configured | ⚠ | ⚠ | 0 rows | ✅ strict | 6/6 v0.1 (LI+YT) | Publishing deferred; FB+IG blocked on v0.2 positioning |

All 4 FB tokens permanent. All 4 clients have explicit `c.client_digest_policy`. Prompt stack consistent with each client's configured scope.

---

## SPRINT MODE — THE BOARD

### Quick wins

| # | Item | Status |
|---|---|---|
| Q1-Q5 | (all closed) | ✅ |

### Medium

| # | Item | Status |
|---|---|---|
| M1 | A11b | ✅ |
| M2-M9, M11 | (all closed) | ✅ |
| M12 | IG publisher | 🟡 SUPERSEDED per D166 |
| Cron failure-rate monitoring Layer 1 | | ✅ |
| CFW content_type_prompt parity | | ✅ |
| Invegent v0.1 content_type_prompt stack | LI+YT configured scope | ✅ |
| CC-TASK-02 EF upsert audit | 1 HIGH finding identified | ✅ (audit) — fix TBD |
| **CC-TASK-03 frontend vocab audit** | **1 HIGH / 9 MED / 3 LOW** | **✅ (audit) — fixes TBD** |
| **CC-TASK-04 dead vocab + email typo cleanup** | H1 + M9 shipped (dashboard `4861b56`) | **✅** |

### Router track

| # | Item | Status |
|---|---|---|
| R1 | mix_default + seed | ✅ |
| R2 | client override | ✅ |
| R3 | demand grid function | ✅ |
| Catalog unification | platform + format taxonomies extended + FKs | ✅ |
| R4 tables + seed | 6 classes, 20 rules, f.canonical_content_body extended | ✅ |
| **R4 function + sweep + cron** | **3 functions + jobid 68 active** | **✅ LIVE** |
| R5 spec | fitness matrix + matching algorithm | ✅ |
| R5 impl | depends on R4 backfill + PK spec review | 🔲 ~2-3h |
| R6 | seed_and_enqueue rewrite | 🔲 ~3-4h (Findings 1+4+6 bundled) |
| R7 | ai-worker platform-awareness | 🔲 depends on R6 |
| R8 | Cron changes | 🔲 depends on R6 |

### Larger

| # | Item | Status |
|---|---|---|
| L6 | A21 audit | ✅ |

### HIGH priority items remaining

| # | Item | Why HIGH |
|---|---|---|
| **R5 impl** | `m.match_demand_to_canonicals()` + fitness tables + view | Now unblocked by R4 LIVE. Depends on PK reviewing R5 spec's 7 open questions. |
| **R6** | seed_and_enqueue rewrite (Findings 1+4+6 bundled) | IG publisher paused until router verifies. Depends on R5 impl. |
| **CC-TASK-02 fix** | Fix feed-intelligence upsert (Option A vs B; recommended B) | Silent-failure class, fires on first real recommendation |
| **CC-TASK-03 H1 fix** | Remove dead vocab `video_avatar` + `video_episode` from `video-tracker.ts:52` filter | 10-min fix, zero risk. Dead vocab trap for future editors. |
| **CC-TASK-03 M9 fix** | Change `'email'` → `'newsletter'` in `STUDIO_SUPPORTED_PLATFORMS` | Single-word fix. Prevents future FK rejection if route writes this value. |

**Not HIGH:**
- `usePlatformVocab` + `useFormatVocab` hook rollout — 3-4h focused PR, or cleanup-on-touch
- **D168 Layer 2 implementation** — spec ready; triggered by next ID004-class incident

---

## WATCH LIST

### Due next session

- Check `m.cron_health_alert WHERE resolved_at IS NULL`
- Validate router catalogs + event trigger (startup steps 6-7)
- Validate R4 seed + function + jobid 68 active (step 8)
- Validate coverage matrix (step 9)
- **Validate R4 backfill complete** — `COUNT(*) WHERE content_class IS NULL AND fetch_status IS NOT NULL` = 0 (step 10)
- Fresh CFW draft review
- PK review of R5 + D168 specs (14 open questions)
- PK choose CC-TASK-02 fix: Option A vs B
- PK decide on CC-TASK-04 (dead-vocab + email typo cleanup bundle) — approve → CC takes it
- Run R4 distribution query (spec's `verification queries`) after backfill completes to check for class anomalies worth tuning before the month-of-monitoring window starts

### Due week of 22-27 Apr

- **Mon 27 Apr** — Meta App Review escalation trigger
- **Sat 2 May** — original reviewer calibration cycle trigger (defer)

### Backlog (open)

**New 25 Apr late-morning (from CC-TASK-03 + R4 Step 3):**
- ~~**Proposed CC-TASK-04** — Dead vocab + email typo cleanup bundle~~ ✅ CLOSED (dashboard `4861b56`)
- **R4 distribution monitoring** — check after backfill completes + at 1 week + at 1 month. Tune rules in place via UPDATE if: educational_evergreen <2%, analytical >60% on success-only, timely_breaking <2% while fresh signals exist.

**25 Apr morning (from CC-TASK-02):**
- CC-TASK-02 HIGH fix — see Sprint Board HIGH priority

**25 Apr morning (from CC-TASK-03):**
- ~~CC-TASK-03 H1 fix — video-tracker.ts dead vocab~~ ✅ CLOSED via CC-TASK-04 (dashboard `4861b56`)
- ~~CC-TASK-03 M9 fix — email→newsletter~~ ✅ CLOSED via CC-TASK-04 (dashboard `4861b56`)
- CC-TASK-03 usePlatformVocab + useFormatVocab hook rollout — 3-4h focused PR or cleanup-on-touch

**24 Apr Invegent close:**
- Invegent FB + IG activation (requires v0.2 positioning + platform_rules additions)
- Avatar configuration for Invegent (HeyGen) — blocks YT avatar format unlock

**24 Apr Track B (open):**
- R5 implementation — ~2-3h, ready once PK reviews spec
- D168 Layer 2 implementation — ~2-3h, deferred until defence-in-depth trigger

**24 Apr router-catalog:**
- R6 bundled work (Findings 1+4+6)
- Blog vs website consolidation — LOW

**24 Apr late afternoon:**
- R6 follow-up — cron 48 NOT EXISTS filter platform scope

**24 Apr afternoon:**
- Cron health dashboard tile (CC-TASK-07 candidate)
- Cron health v3.1 — schedule-string parsing
- Notification layer for `m.cron_health_alert` (composed into D168 open Q7)
- Document `expires_at` sentinel

**24 Apr mid-day:**
- Stream B source type implementation
- Invegent publishing activation checklist
- v0.2 positioning review for Invegent (2-3 months — also unlocks FB/IG prompt rows)

**Carried from 24 Apr AM:**
- 2 CFW IG drafts in `needs_review`
- Stale non-main branches (8 total, cosmetic) — CC-TASK-03 confirmed 5 of the 8 on dashboard

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

**Invegent-content-engine (main) — 20 commits:**

Morning:
- `3365b87` — docs(sync_state): morning housekeeping

Mid-day:
- `2029383` — docs(briefs): CFW brand profile + platform_rules lock
- `53fb86c` — docs(briefs): Invegent brand profile v0.1
- `f1b4c36` — docs(briefs): Invegent work-journal source type
- `8c8968b` — docs(sync_state): mid-day A11b + Invegent v0.1

Afternoon:
- `0a60756` — docs(briefs): cron failure-rate monitoring Layer 1
- `5e55c27` — docs(sync_state): afternoon cron + sprint closures
- `8413603` — docs(sync_state): token-expiry fix + end-of-day close

Late afternoon:
- `20d7f6d` — docs(briefs): A21 trigger ON CONFLICT audit

Evening (router catalog):
- `828de5f` — docs(briefs): router track hardcoded values audit
- `bb8d278` — docs(briefs): R4 classifier spec v2
- `ac06043` — docs(briefs): router catalog unification SHIPPED
- `74f6de7` — docs(sync_state): evening router-catalog rollup
- `931f93d` — docs(briefs/claude-code): three CC task briefs
- `d00293d` — docs(briefs/claude-code): README for direct terminal workflow

Evening (Track B):
- `e4bc18f` — docs(briefs): R5 matching layer spec
- `d0820c6` — docs(briefs): D168 Layer 2 spec
- `80a55d1` — docs(sync_state): Track B rolled up

25 Apr:
- `be6082e` — docs(sync_state): CC-TASK-01 CLOSED line
- `23ed4c1` — docs(briefs): EF .upsert() audit — CC-TASK-02 CLOSED (1 HIGH / 0 MED / 1 LOW)
- `e9897d2` — docs(sync_state): CC-TASK-02 CLOSED line
- `708421e` — docs(sync_state): Invegent v0.1 prompt stack closure + CC-TASK-02 integration
- `4f1ff5d` — docs(briefs): frontend format + platform vocab audit — CC-TASK-03 CLOSED (1 HIGH / 9 MED / 3 LOW)
- `2a478fd` — docs(sync_state): CC-TASK-03 CLOSED line
- **THIS COMMIT** — docs(sync_state): R4 Step 3 LIVE + CC-TASK-03 closure true-up

**Migrations (DB-only, 21 total):**

Mid-day (5) + Afternoon (4) + Late afternoon (3) + Evening router-catalog (5) + Track B (2) + Invegent close (1):
- See prior sync_state for details

25 Apr close (1):
- **`r4_d143_classifier_step3_function_sweep_cron_20260424`** — `m.evaluate_rule` + `m.classify_canonical` + `m.classify_canonicals_unclassified` + cron `classify-canonicals-every-5m` (jobid 68)

**invegent-dashboard (main):**
- `59bfe66` — docs(roadmap): sync 22 + 24 Apr (CC-TASK-01)
- `4861b56` — fix: removed dead format vocab (H1) + email→newsletter (M9) — CC-TASK-04 CLOSED

*(invegent-portal / invegent-web: no 24-25 Apr commits)*

---

## CLOSING NOTE FOR NEXT SESSION

24-25 Apr is the highest-output session on record by a wide margin.

**Final tally:**
- **20 commits** on Invegent-content-engine
- **21 DB migrations** applied
- **13 briefs** committed (4 CC task briefs + 2 CC findings briefs)
- **7 sprint items closed**
- **4 Claude Code tasks closed** (roadmap sync + EF upsert audit + frontend vocab audit + dead-vocab/email-typo cleanup)
- **R4 classifier LIVE** and auto-running every 5m
- **Invegent v0.1 prompt stack SHIPPED** (6/6 configured scope)
- **CFW at full prompt parity** (6→12 rows)
- **1 live production bug caught + fixed same session**
- **2 orphaned v1 seed functions removed**
- **1 latent infrastructure bug fixed** (k.refresh_column_registry)
- **11 audit findings produced, 8 closed** (CC-TASK-04 shipped H1 + M9; CC-TASK-02 HIGH remains)

**Pipeline state:** Router infrastructure is no longer purely shadow — R4 is LIVE and classifying every 5m. Still no hot-path integration (R5/R6/R7/R8 ahead). IG publisher remains paused per D165. Remaining HIGH-priority fix (CC-TASK-02) is currently dormant/silent — no user-facing impact today.

**Remaining HIGH-priority items:**
- R5 impl (after PK spec review; ~2-3h)
- R6 (after R5; ~3-4h with Findings 1+4+6 bundled)
- CC-TASK-02 fix (PK chooses Option A vs B)

**Not HIGH (defence-in-depth):**
- D168 Layer 2 implementation (spec ready)
- `usePlatformVocab` + `useFormatVocab` hook rollout (3-4h focused PR or cleanup-on-touch)

**PK weekend review queue (5 items):**
- R5 spec 7 open questions
- D168 spec 7 open questions
- CC-TASK-02 fix: Option A vs B
- CC-TASK-04 (proposed): dead vocab + email typo cleanup bundle — approve or defer
- R4 distribution after backfill completes + 1 week check + 1 month check

**Realistic next working windows:**
- 25 Apr Saturday: dead day or R5 impl if PK reviews spec / CC-TASK-04 if PK approves
- 27 Apr Monday: Meta App Review escalation + R5 impl + R6 start + CC-TASK-02 fix

**Lessons captured today (16 total):**

1. Client source data is gold
2. Pre-existing prompt fields can silently contradict each other
3. Check constraints can bite mid-migration — widen rather than placeholder
4. v0.1-with-loose-positioning beats waiting for perfect clarity
5. Ship monitoring systems even when imperfect
6. Tune thresholds against real data fast
7. Close the loop same session when monitor catches bug
8. `DROP FUNCTION IF EXISTS name()` silently skips overloaded variants
9. `DROP INDEX` fails for UNIQUE-backed; use `ALTER TABLE DROP CONSTRAINT`
10. Per-client / per-brand functions create divergence surface — drop rather than patch
11. Always check existing taxonomy tables before building new catalogs
12. Dynamic table-driven > hardcoded CHECKs + function body literals
13. Event triggers can mask the source of errors — isolation pattern: disable, fix, re-enable
14. Parallel tracks multiply session output — Track B + 3 CC tasks + Invegent v0.1 + R4 Step 3 ran concurrently with zero merge conflicts
15. Configured scope beats forced parity — Invegent 6/6 for LI+YT is correct; forcing 12/12 would create prompt drift
16. **Table-driven interpreter enables ship-first-tune-later.** R4 classifier shipped with seed rules that may skew distribution (e.g. educational_evergreen 0% on first sample). Without table-driven design, tuning would require migration + function rewrite. With it, tuning is `UPDATE t.content_class_rule SET rule_config = ... WHERE rule_id = ...`. Monthly tuning window is cheap because the architecture made it cheap.
