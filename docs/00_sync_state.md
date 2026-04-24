# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-24 evening AEST — **Track B SHIPPED** (R4 tables + R5 spec + D168 spec + CFW parity) after router catalog unification earlier same evening
> Written by: PK + Claude session sync

---

## 🟢 24 APR EVENING (TRACK B) — R4 TABLES LANDED + R5/D168 SPECS + CFW PARITY

### In one paragraph

Track B ran in parallel with Claude Code tasks 01–03 (dashboard roadmap sync, EF `.upsert()` audit, frontend format vocab audit). Delivered four artifacts: (1) R4 classifier catalog tables + v1 seed now live in DB — `t.content_class` (6 classes, all `is_current=TRUE`), `t.content_class_rule` (20 rules across 19 rule groups covering 7 of 9 rule types), plus `content_class` + `classified_at` + `classifier_version` columns on `f.canonical_content_body` with partial work-queue index; partial unique indexes enforce "one current per class_code" and "one current per priority rank". Step 3 (classifier function + sweep + cron) still pending — deliberate gate for PK to review seeded rules before the classifier starts tagging. (2) R5 matching layer spec committed — `t.class_format_fitness` (60-row 6×10 seed matrix v1), `c.client_class_fitness_override` (D167 versioning), `t.vw_effective_class_format_fitness` view, `m.match_demand_to_canonicals()` function signature + composite scoring algorithm (fitness 50% / quality 30% / recency 20%). (3) D168 Layer 2 response-sentinel spec committed — complement to Layer 1 that catches ID004-class silent bugs via downstream-effect sampling; `m.liveness_check` + `m.liveness_sample` tables with 11 v1 seed checks, `m.evaluate_liveness()` sweep reusing Layer 1's `m.cron_health_alert` surface. (4) CFW `c.content_type_prompt` parity fill — 6 new rows (FB/IG/LI × promo_v1 + YouTube × rewrite_v1/synth_bundle_v1/promo_v1) bringing CFW to 12/12, matching NDIS Yarns + Property Pulse coverage. Voice anchored to existing CFW prompts: practice voice ("we/our/at Care For Welfare"), never first-person "I", never named therapist, parents/carers primary audience, small-practice scale as differentiator, OT/paediatric scope guard. All voice + scope rules preserved across the 6 new rows.

### What landed

| # | Artifact | Commit / Migration |
|---|---|---|
| D1 | R4 classifier tables + seed | migration `r4_d143_classifier_catalog_tables_and_seed_v1_20260424` |
| D2 | R5 matching layer spec (25k chars) | `e4bc18f` — `docs/briefs/2026-04-24-r5-matching-layer-spec.md` |
| D3 | D168 Layer 2 response-sentinel spec (23k chars) | `d0820c6` — `docs/briefs/2026-04-24-d168-layer-2-response-sentinel-spec.md` |
| D4 | CFW 6 new content_type_prompt rows | migration `cfw_content_type_prompt_youtube_and_promo_v1_20260424` |

### Coverage matrix after Track B (c.content_type_prompt — active rows)

| Client | FB rewr/synth/promo | IG rewr/synth/promo | LI rewr/synth/promo | YT rewr/synth/promo | Total |
|---|---|---|---|---|---|
| NDIS-Yarns | 1 / 1 / 1 | 1 / 1 / 1 | 1 / 1 / 1 | 1 / 1 / 1 | 12/12 ✅ |
| Property Pulse | 1 / 1 / 1 | 1 / 1 / 1 | 1 / 1 / 1 | 1 / 1 / 1 | 12/12 ✅ |
| **Care For Welfare** | **1 / 1 / 1** | **1 / 1 / 1** | **1 / 1 / 1** | **1 / 1 / 1** | **12/12 ✅ (was 6/12)** |
| Invegent | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0/12 ⚠️ |

Invegent gap surfaced during Track B (memory previously said "Invegent v0.1 locked" — that referred to `brand_profile` and `platform_rules`, not content_type_prompt rows). Flagged as a standalone follow-up, out of Track B scope.

### R4 verification (post-seed, before function ships)

```sql
-- 6 classes, all current + active, priority ranks 1-6 occupied
SELECT priority_rank, class_code, version, COUNT(rule_id) AS rules, COUNT(DISTINCT rule_group) AS groups
FROM t.content_class cc LEFT JOIN t.content_class_rule ccr USING (content_class_id)
WHERE cc.is_current=TRUE AND ccr.is_active=TRUE
GROUP BY 1,2,3 ORDER BY 1;
```

Expected: 6 rows, ranks 1-6, rule counts 3-5 per class (timely_breaking has 5 due to group 1 being an AND pair).

Actual: ✅ verified.

### R4 Step 3 readiness

Blocker for R4 implementation: PK reviews v1 rule set (spec `docs/briefs/2026-04-24-r4-d143-classifier-spec.md`) and confirms:
1. Priority order reasonable (timely_breaking > stat_heavy > multi_point > human_story > educational_evergreen > analytical)
2. Rule vocabulary (9 rule_types) covers the cases
3. Fallback semantics: analytical class with rule_groups but lowest priority → "everything that didn't match" lands here

Once confirmed, Step 3 = classifier function + sweep + cron. Implementation ~1.5-2h; backfill ~12h at 100/5min for 14k canonicals.

### R5 key open questions (for weekend review)

From `docs/briefs/2026-04-24-r5-matching-layer-spec.md`:
1. Fitness weightings — 50/30/20 right?
2. Minimum fitness threshold — 50 right?
3. v1 fitness matrix — 6×10 right? (12 non-buildable formats deferred)
4. Cross-platform dedup — aggressive (one canonical per run) or permissive (same content on different platforms different days)?
5. Client override semantics — replace (current) or multiplier?
6. Campaign routing — out of R5 MVP, split to R5.5?
7. Fitness tuning cadence — manual (current) or data-driven from performance tables?

### D168 Layer 2 key open questions

From `docs/briefs/2026-04-24-d168-layer-2-response-sentinel-spec.md`:
1. 11 v1 checks — right shape?
2. Thresholds — conservative (current) or tight?
3. 15m cadence floor — right?
4. Alert dedup semantics — reuse Layer 1's `(jobid, alert_type)` where jobid can be NULL?
5. 30-day retention — enough?
6. Dashboard integration — CC-TASK-07?
7. Out-of-DB notification layer — Telegram/Slack/email?

**Priority:** Not HIGH today. Defence in depth. Triggers: next ID004-class incident, or cron fleet >60, or external client SLA risk.

### Track B commits

- `e4bc18f` — docs(briefs): R5 matching layer spec — fitness matrix + matching algorithm
- `d0820c6` — docs(briefs): D168 Layer 2 — response-layer sentinel spec
- THIS COMMIT — docs(sync_state): 24 Apr evening Track B rolled up

### Track B migrations

- `r4_d143_classifier_catalog_tables_and_seed_v1_20260424` — R4 Step 1 + Step 2 atomic
- `cfw_content_type_prompt_youtube_and_promo_v1_20260424` — CFW 6-row parity fill

---

## 🟢 24 APR EVENING UPDATE — ROUTER CATALOG UNIFICATION SHIPPED

### In one paragraph

PK pushed back on the R4 classifier v1 spec being hardcoded, which triggered a comprehensive audit of the entire router track (`docs/briefs/2026-04-24-router-hardcoded-values-audit.md` — 9 findings, 3 severity tiers). Answering "what else have we hardcoded?" uncovered two existing taxonomy tables (`t.5.0_social_platform` with 14 platforms from Dec 2025, `t.5.3_content_format` with 22 formats from Mar 2026) that we'd been parallelising in CHECK constraints across the codebase. Near-catastrophic: I was about to build `t.platform_catalog` + `t.format_catalog` — the exact parallel-structure anti-pattern the audit was about. PK's "what else is hardcoded?" saved the duplication. Pivoted to extending existing taxonomies: added `is_router_target` + `content_pipeline` columns to `t.5.0_social_platform`, seeded 3 new platform rows (blog/newsletter/website for pre-existing in-use values), dropped 7 hardcoded CHECK constraints, added **29 FKs** pointing at the taxonomy tables. Validation view tolerance fixed. CFW + Invegent both backfilled with explicit `c.client_digest_policy` rows. Duplicate UNIQUE index cleaned. **Bonus find:** `k.refresh_column_registry` had a latent bug (fk CTE produced dupe rows when any column has 2+ FKs, breaking the event trigger on every DDL firing); fixed with `DISTINCT ON` + deterministic `ORDER BY`. Migration attempts: 4 (two data-validation failures, one pre-existing-FK collision, one successful cleanup). Brief: `docs/briefs/2026-04-24-router-catalog-unification-shipped.md` (`ac06043`).

### Findings status after today

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

### Data flow now cleaner

Adding a new platform (e.g. Bluesky, or activating newsletter as router target) is now an INSERT into `t.5.0_social_platform` with `is_router_target=TRUE`. Zero DDL required. Adding a new format is an INSERT into `t.5.3_content_format`. Same — zero DDL. Router functions will read these catalogs for their vocabulary.

### Evening router-catalog commits

- `828de5f` — docs(briefs): router track hardcoded values audit — 9 findings
- `bb8d278` — docs(briefs): R4 classifier spec v2 — rewritten table-driven after PK pushback
- `ac06043` — docs(briefs): router catalog unification SHIPPED
- `74f6de7` — docs(sync_state): 24 Apr evening router catalog rollup
- `931f93d` — docs(briefs/claude-code): three Claude Code task briefs
- `d00293d` — docs(briefs/claude-code): README updated for direct terminal workflow

### Evening router-catalog migrations

- `router_catalog_unification_use_existing_taxonomy_20260424_v1` — INSERT value-count mismatch, rolled back
- `router_catalog_unification_use_existing_taxonomy_20260424_v2` — missed `website` orphan in m.post_publish, rolled back
- `router_catalog_unification_use_existing_taxonomy_20260424_v3` — triggered event trigger bug via pre-existing `_fkey` + my `fk_*` multi-FK; PARTIALLY COMMITTED (main DDL landed before Supabase's migration-history wrapper failed on event trigger)
- `router_catalog_unification_v4_trigger_disabled` — PARTIALLY COMMITTED similarly; same event trigger issue
- Manual cleanup via `execute_sql` (trigger disabled for duration):
  - Dropped 2 redundant FKs (`fk_client_format_mix_override_format`, `fk_platform_format_mix_default_format`)
  - Backfilled CFW digest_policy (wrong UUID in session memory — correct: `3eca32aa-e460-462f-a846-3f6ace6a3cae`)
  - Backfilled Invegent digest_policy
  - Recreated view with ABS tolerance
  - Dropped redundant UNIQUE `uq_social_platform_platform_code`
  - **Fixed `k.refresh_column_registry` with DISTINCT ON for multi-FK robustness**
  - Re-enabled event trigger + verified with COMMENT DDL firing

### New backlog items (evening)

- **R6 — 1-line change at Finding 6:** replace `NOT IN ('youtube')` with `platform IN (SELECT platform_code FROM t."5.0_social_platform" WHERE content_pipeline = 'text_bundle')`
- **Format vocabulary cleanup:** 4 dead profile-only values (image_ai, video_slideshow, video_avatar, video_voiceover) not in t.5.3_content_format. No data uses them, but if any dashboard code hardcodes these strings it'll fail. Audit for hardcoded format strings in invegent-dashboard + invegent-portal — LOW priority (now queued as CC-TASK-03).
- **Blog vs website consolidation:** 12 legacy `m.post_publish` rows with platform='website' kept distinct from 'blog'. Migrating them to 'blog' would simplify vocabulary — LOW priority follow-up.
- **Memory correction:** CFW client_id wrong in userMemories (abbreviated `3eca32aa` expanded to wrong full UUID in session summary). Corrected.
- **Invegent content_type_prompt rows:** standalone follow-up — 0/12 coverage, needs v0.1 prompt stack once activation work starts.

---

## 🟢 24 APR LATE-AFTERNOON UPDATE — A21 ON CONFLICT AUDIT CLOSED

### In one paragraph

A21 (Trigger ON CONFLICT audit) closed this afternoon. Swept all 25 `ON CONFLICT` clauses across 21 SQL functions + 1 direct cron command. Cross-referenced each against `pg_index` + `pg_constraint`. Found **1 real dormant M11-class sister bug**: `m.seed_ndis_bundles_to_ai_v1` + `m.seed_property_bundles_to_ai_v1` both referenced `ON CONFLICT ON CONSTRAINT post_seed_uniq_run_item` but the actual constraint is `post_seed_uniq_run_item_platform`. Zero callers in pg_cron, other SQL functions, or pg_depend — truly orphaned v1 predecessors of `m.seed_client_to_ai_v2`. **Both dropped.** PK's principle explicit on this: ICE is a single robust pipeline for all clients; per-client or per-brand functions create divergence surface area and compound into drift. Also flagged **1 architectural inconsistency** in cron 48 (`enqueue-publish-queue-every-5m`): the NOT EXISTS filter scopes on `post_draft_id` only while the unique constraint is `(post_draft_id, platform)` — benign today under one-draft-per-platform model, latent risk under router model (added to R6 backlog). Also **cleaned up 7 redundant unique indexes/constraints** across 6 tables (schema drift from multiple migrations independently adding the same guarantee). Brief: `docs/briefs/2026-04-24-a21-on-conflict-audit.md` (`20d7f6d`).

### A21 findings summary

| Finding | Severity | Status |
|---|---|---|
| v1 seed functions referencing non-existent constraint | Dormant bug (zero callers) | ✅ CLOSED — functions dropped |
| Cron 48 NOT EXISTS filter scope mismatch vs unique constraint | Latent (benign today, breaks under router) | 🟡 FLAGGED — R6 follow-up note |
| 7 redundant unique indexes/constraints | Cleanup candidate | ✅ CLEANED — 4 constraints + 3 indexes dropped |

---

## 🟢 24 APR AFTERNOON UPDATE — CRON HEALTH MONITORING LAYER 1 LIVE + TOKEN-EXPIRY BUG CLOSED

Layer 1 cron failure-rate monitoring shipped to production. New DB-layer system watches `cron.job_run_details` every 15 minutes via `cron-health-every-15m` pg_cron → `m.refresh_cron_health()` → UPSERT into `m.cron_health_snapshot`. Three alert types: `failure_rate_high`, `consecutive_failures`, `no_recent_runs`. First refresh caught **1 live bug (token-expiry-alert-daily schema drift)**, fixed same session.

---

## 🟢 24 APR MID-DAY UPDATE — A11b CLOSED

CFW + Invegent v0.1 content prompts locked. `chk_persona_type` widened. Six `c.content_type_prompt` rows for CFW (rewrite/synth × FB/IG/LI). Invegent v0.1 referred to `brand_profile` + `platform_rules` — NOT content_type_prompt (that gap surfaced in Track B evening).

---

## 🟢 24 APR SESSION-START UPDATE — MORNING HOUSEKEEPING

Orphan branch sweep clean, M8 Gate 4 PASSED, CFW correction (26 client_source rows / 2 client_content_scope rows, was wrongly flagged as "never wired").

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else.** 24 Apr was the highest-output session on record. Morning housekeeping + A11b both halves + cron health monitoring Layer 1 + token-expiry bug fix + A21 ON CONFLICT audit + router hardcoded-values audit (9 findings) + router catalog unification shipped (5 findings closed) + k.refresh_column_registry robustness fix + **Track B: R4 catalog tables + R5 spec + D168 spec + CFW parity fill**.

### Today's full session tally (updated 24 Apr Track B close)

- **16 commits** on Invegent-content-engine
- **19 DB migrations** applied (17 + 2 Track B)
- **11 briefs** committed (including 3 Claude Code task briefs)
- **5 sprint items closed** (M1 A11b, Cron monitoring Layer 1, Q5 check_token_expiry, L6/A21 ON CONFLICT, evening router catalog unification)
- **2 Track B specs committed ready for review** (R5 matching, D168 Layer 2)
- **R4 schema + seed landed** (6 classes, 20 rules, 3 new columns on f.canonical_content_body) — function still pending
- **CFW content_type_prompt at 12/12 parity** (was 6/12)
- **1 live production bug caught and fixed same session**
- **2 orphaned v1 seed functions removed** (M11-class dormant bug dead-code)
- **1 latent infrastructure bug fixed** (k.refresh_column_registry multi-FK dupe)
- **9 audit findings produced + 5 closed**

### Critical state awareness for next session

1. **A11b CLOSED.** CFW + Invegent v0.1 prompt stacks locked.
2. **Cron health monitoring LIVE.** Check `m.cron_health_alert WHERE resolved_at IS NULL` at session start.
3. **Token-expiry bug FIXED.** Auto-resolves at next cron fire.
4. **A21 CLOSED (DB layer).** Edge Function `.upsert()` audit remains as MEDIUM follow-up (now queued as CC-TASK-02).
5. **ROUTER CATALOG UNIFIED.** t.5.0_social_platform extended with is_router_target + content_pipeline. 17 platforms catalogued. 29 FKs from data columns to taxonomy. Format vocab drift eliminated. All 4 clients have explicit digest_policy rows.
6. **`k.refresh_column_registry` fixed.** DISTINCT ON for multi-FK columns. Event trigger robust.
7. **R4 TABLES + SEED LIVE** (Track B). `t.content_class` + `t.content_class_rule` seeded with v1 data. Step 3 (function + sweep + cron) gated on PK review of seed rules.
8. **R5 matching layer spec ready.** 7 open questions for PK. Table-driven 6×10 fitness matrix. Depends on R4 Step 3 producing clean class distribution.
9. **D168 Layer 2 spec ready.** 7 open questions. Not HIGH priority — defence in depth.
10. **CFW at full prompt parity** (12/12 rows). Invegent still at 0/12 — flagged as standalone follow-up.
11. **R6 prep clearer:** Finding 6 (youtube hack) = 1-line change; Findings 1+4 bundle into R6's hot-path PR. Total R6 remaining: ~3-4h after R4+R5 review.
12. **`instagram-publisher-every-15m` (jobid 53) remains PAUSED** until router integration verifies.
13. **ID004 closed.** Content-fetch cron healthy.
14. **M8 Gate 4 CLOSED.** Zero duplicate canonicals post-merge.
15. **M12 still superseded** by router build per D166.
16. **2 CFW IG drafts in `needs_review`** from AM — decision TBD.
17. **Dashboard roadmap sync still pending** — now queued as CC-TASK-01.
18. **Reviewers still paused.** All four rows `is_active=false`.
19. **Pipeline clean.** 0 approved-but-unpublished FB drafts, 0 queue items.

### Router state — snapshot (updated post Track B)

Shadow infrastructure LIVE but still unconnected to hot path:
- ✅ R1: `t.platform_format_mix_default` with 22 seed rows
- ✅ R2: `c.client_format_mix_override`
- ✅ R3: `m.build_weekly_demand_grid()`
- ✅ R4 schema + seed: `t.content_class` (6 classes) + `t.content_class_rule` (20 rules) + f.canonical_content_body columns — **LIVE** (Track B)
- 🟡 R4 function: spec ready, gated on PK review before Step 3 ships
- 🟡 R5: spec committed, 7 open questions — depends on R4 function
- 🔲 R6: `seed_and_enqueue_ai_jobs_v1` rewrite — 3-4h, depends on R4+R5
- 🔲 R7: ai-worker platform awareness
- 🔲 R8: Cron changes
- **✅ Catalogs unified (24 Apr evening):** t.5.0_social_platform + t.5.3_content_format now drive platform/format vocabulary via FK.

---

## SESSION STARTUP PROTOCOL (UPDATED 24 APR EVENING TRACK B)

1. Read this file (`docs/00_sync_state.md`) in full
2. **Orphan branch sweep:** all 3 repos; flag orphans BEFORE new work
3. Check `c.external_reviewer` — confirm reviewers still paused
4. Check IG publisher cron state — jobid 53 `active=false`
5. Validate router shadow infrastructure: `SELECT * FROM t.platform_format_mix_default_check;` → 4 rows status='ok'
6. Validate router catalogs: `SELECT COUNT(*) FROM t."5.0_social_platform" WHERE is_router_target=TRUE` = 4; `SELECT COUNT(*) FROM c.client_digest_policy` = 4
7. Validate event trigger + catalog refresh: `SELECT evtenabled FROM pg_event_trigger WHERE evtname='trg_k_refresh_catalog'` = 'O'; `SELECT k.refresh_column_registry()` returns empty
8. **Validate R4 seed (Track B):** `SELECT COUNT(*) FROM t.content_class WHERE is_current=TRUE` = 6; `SELECT COUNT(*) FROM t.content_class_rule WHERE is_active=TRUE` = 20
9. **Validate CFW parity (Track B):** `SELECT COUNT(*) FROM c.content_type_prompt ctp JOIN c.client c USING(client_id) WHERE c.client_name='Care For Welfare Pty Ltd' AND ctp.is_active=TRUE` = 12
10. Check ID004 recovery: `f.canonical_content_body` pending-backlog drained
11. Check active cron health alerts:
    ```sql
    SELECT jobid, jobname, alert_type, threshold_crossed,
           ROUND((EXTRACT(EPOCH FROM NOW() - first_seen_at) / 3600)::numeric, 1) || 'h' AS age,
           LEFT(COALESCE(latest_error, ''), 100) AS error_preview
    FROM m.cron_health_alert WHERE resolved_at IS NULL ORDER BY first_seen_at DESC;
    ```
12. Check file 15 Section G — pick next sprint item
13. Check `m.external_review_queue` for findings landed before pause
14. Read `docs/06_decisions.md` D156–D168 for accumulated decision trail
15. Query `k.vw_table_summary` before working on any table

---

## DEV WORKFLOW RULE (ADOPTED 22 APR — D165 context)

**Default: direct-push to main.** Claude Code work ships straight to main. Vercel auto-deploys within ~60s.

**Deviate only when:**
- Multi-repo coordinated change where half-state would break production
- PK explicitly flags the work as risky

**Session-start orphan sweep is non-negotiable.**

---

## THE EXTERNAL REVIEWER LAYER — CURRENT STATE (UNCHANGED FROM 21 APR)

| Reviewer | Lens | Model | `is_active` |
|---|---|---|---|
| Strategist | Right direction? | gemini-2.5-pro | false |
| Engineer | Built well? | gpt-4o | false |
| Risk | Silent failures? | grok-4-1-fast-reasoning | false |
| System Auditor | Claim vs reality audit | grok-4-1-fast-reasoning | false |

All still paused. Re-enable ceremony at ~18-19 of 28 Section A items closed.

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** — active, external client expansion gated on pre-sales criteria

**Pre-sales gate status:** 10 of 28 Section A items closed, 18 open (added: router catalog unification counts as partial close on router track; Track B R4 schema+seed is partial close on R4).

**Today's movement:**
- 24 Apr morning: orphan sweep, M8 Gate 4 PASS, CFW correction
- 24 Apr mid-day: M1 / A11b CLOSED
- 24 Apr afternoon: Cron monitoring HIGH-priority CLOSED + Q5 CLOSED
- 24 Apr late-afternoon: A21 / L6 CLOSED
- 24 Apr evening: Router catalog unification SHIPPED (Findings 2/3/5/6/9 closed) + k.refresh_column_registry robustness fix
- **24 Apr evening (Track B): R4 tables+seed LIVE, R5 matching spec COMMITTED, D168 Layer 2 spec COMMITTED, CFW 12/12 parity achieved**

---

## ALL CLIENTS — STATE (UPDATED 24 APR TRACK B)

| Client | client_id | FB | IG | LI | YT | Schedule | Digest policy | Prompt stack | Notes |
|---|---|---|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ | ⏸ | ✅ | 🔲 | 6 rows | ✅ lenient | 12 rows | 63 dead m8_m11_bloat |
| Property Pulse | 4036a6b5 | ✅ | ⏸ | ✅ | 🔲 | 6+tier | ✅ lenient | 12 rows | 44 dead |
| Care For Welfare | 3eca32aa-e460 | ✅ | ⏸ | ⚠ | 🔲 | 21 rows | ✅ strict | **✅ 12/12 (Track B)** | 2 IG drafts pending |
| Invegent | 93494a09 | ⏸ | ⏸ | ⚠ | ⚠ | 0 rows | ✅ strict | **⚠️ 0/12 — needs v0.1 prompt stack** | Publishing deferred |

All 4 FB tokens permanent. All 4 clients have explicit `c.client_digest_policy` rows. CFW now at parity; Invegent content_type_prompt gap flagged as standalone follow-up.

---

## SPRINT MODE — THE BOARD (24 APR TRACK B CLOSE)

### Quick wins

| # | Item | Status |
|---|---|---|
| Q1-Q5 | (all closed) | ✅ |

### Medium

| # | Item | Status |
|---|---|---|
| M1 | A11b | ✅ 24 Apr mid-day |
| M2-M9, M11 | (all closed) | ✅ |
| M12 | IG publisher | 🟡 SUPERSEDED per D166 |
| Cron failure-rate monitoring | Layer 1 | ✅ 24 Apr PM |
| **CFW content_type_prompt parity** | **Track B** | **✅ 24 Apr evening** |

### Router track (22 Apr per D166+D167 + 24 Apr evening catalog work + Track B)

| # | Item | Status |
|---|---|---|
| R1 | `t.platform_format_mix_default` + seed | ✅ |
| R2 | `c.client_format_mix_override` | ✅ |
| R3 | `m.build_weekly_demand_grid()` | ✅ |
| Catalog unification | t.5.0_social_platform + t.5.3_content_format extended + FKs | ✅ 24 Apr evening |
| **R4 tables + seed** | **6 classes, 20 rules, f.canonical_content_body extended** | **✅ Track B** |
| R4 function + sweep + cron | Step 3 gated on PK review of seed rules | 🟡 Spec done, impl pending |
| **R5 spec** | **Fitness matrix + matching algorithm** | **✅ Track B (spec only)** |
| R5 impl | Depends on R4 function producing distributions | 🔲 ~2-3h |
| R6 | `seed_and_enqueue` rewrite | 🔲 HIGH RISK — ~3-4h (Findings 1+4+6 bundled) |
| R7 | ai-worker platform-awareness | 🔲 Depends on R6 |
| R8 | Cron changes | 🔲 Depends on R6 |

### Larger

| # | Item | Status |
|---|---|---|
| L6 | A21 audit | ✅ 24 Apr late PM |
| (others) | | 🔲 unchanged |

### HIGH priority items remaining

| # | Item | Why HIGH |
|---|---|---|
| **R4 Step 3** | classifier function + sweep + cron | Unblocks R5 implementation + backfill of 14k canonicals |
| **R6** | `seed_and_enqueue_ai_jobs_v1` rewrite (+ Findings 1+4+6 bundled) | IG publisher paused until router integration verifies |
| **CC-TASK-02 fix** | Fix `feed-intelligence` upsert into `m.agent_recommendations` (partial-index ON CONFLICT inference fails). Option A: replace partial unique index with full UNIQUE on `(source_id, recommendation_type)`. Option B: wrap in SECURITY DEFINER RPC that echoes the WHERE predicate. PK to choose. Brief: `docs/briefs/2026-04-25-ef-upsert-audit.md`. | Dormant today (zero rows in target table) but fires on first real recommendation. Silent-failure class (same family as M11 + A21 Finding 1 + ID004) — error logged in EF response body, not surfaced via cron status, not caught by Layer 1 monitoring. |

**Not HIGH (defence-in-depth):**
- **D168 Layer 2** — spec ready; implementation triggered by next ID004-class incident OR cron fleet >60 OR SLA risk from external clients.

---

## WATCH LIST

### Due next session

- Check `m.cron_health_alert WHERE resolved_at IS NULL` in session startup
- Verify router catalog state + event trigger (steps 6-7 of startup protocol)
- **Verify R4 seed state + CFW parity** (steps 8-9 of startup protocol)
- Fresh CFW draft review
- PK review of R4 v1 seed rules before Step 3 ships
- PK review of R5 + D168 specs + 14 open questions across them
- Invegent content_type_prompt 0/12 — schedule the v0.1 stack work

### Due week of 22-27 Apr

- **Mon 27 Apr** — Meta App Review escalation trigger
- **Sat 2 May** — original reviewer calibration cycle trigger (defer)

### Backlog (open, not yet addressed)

**New 24 Apr Track B:**
- **Invegent content_type_prompt rows (0/12):** needs v0.1 prompt stack. 6 platforms × 3 job_types potentially — or start with FB/LI × rewrite/synth until publishing activation. Standalone follow-up.
- **R4 Step 3 implementation:** classifier function + sweep + cron. ~1.5-2h after PK review of v1 seed.
- **R5 implementation:** ~2-3h after R4 backfill produces clean class distribution.
- **D168 Layer 2 implementation:** ~2-3h, deferred until defence-in-depth trigger.

**24 Apr evening router-catalog:**
- R6 bundled work: Finding 1 (client UUIDs in `enqueue_publish_from_ai_job_v1` trigger), Finding 4 (demand formula hardcoded in `seed_and_enqueue_ai_jobs_v1`), Finding 6 (1-line youtube hack replacement)
- Format vocab dashboard/portal audit — now CC-TASK-03
- Blog vs website consolidation — LOW priority

**24 Apr late afternoon:**
- Edge Function `.upsert()` / `onConflict:` audit — now CC-TASK-02
- R6 follow-up — cron 48 NOT EXISTS filter platform scope

**24 Apr afternoon:**
- Cron health dashboard tile (tentatively CC-TASK-07)
- Cron health v3.1 — schedule-string parsing
- Notification layer for `m.cron_health_alert` (composed into D168 open Q7)
- Document `expires_at` sentinel

**24 Apr mid-day:**
- Avatar configuration for Invegent (HeyGen)
- Stream B source type implementation
- Invegent publishing activation checklist
- v0.2 positioning review for Invegent (2-3 months)

**Carried from 24 Apr AM:**
- 2 CFW IG drafts in `needs_review` (older prompt stack)
- Stale non-main branches (8 total, cosmetic cleanup)

**Carried from earlier:**
- Publisher schedule source audit
- `m.post_publish_queue.status` has NO CHECK constraint — D163 continuation
- TPM saturation on concurrent platform rewrites
- `docs/archive` 5th-file mystery
- Per-commit external-reviewer pollution
- Property Pulse Schedule Facebook 6/5 tier violation
- 30+ remaining exec_sql sites in dashboard (tentatively CC-TASK-06)
- `facebook-publisher` EF audit (tentatively CC-TASK-05)
- Shrishti 2FA + passkey

---

## TODAY'S COMMITS (24 APR — FINAL INCLUDING TRACK B)

**Invegent-content-engine (main) — 16 commits:**

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
- (sync_state A21 rollup)

Evening (router catalog):
- `828de5f` — docs(briefs): router track hardcoded values audit — 9 findings
- `bb8d278` — docs(briefs): R4 classifier spec v2 — table-driven rewrite
- `ac06043` — docs(briefs): router catalog unification SHIPPED
- `74f6de7` — docs(sync_state): 24 Apr evening router-catalog rollup
- `931f93d` — docs(briefs/claude-code): three Claude Code task briefs
- `d00293d` — docs(briefs/claude-code): README updated for direct terminal workflow

Evening (Track B):
- `e4bc18f` — docs(briefs): R5 matching layer spec — fitness matrix + matching algorithm
- `d0820c6` — docs(briefs): D168 Layer 2 — response-layer sentinel spec
- **THIS COMMIT** — docs(sync_state): 24 Apr evening Track B rolled up

**Migrations (DB-only, 24 Apr — 19 total):**

Mid-day (5), Afternoon (4), Late afternoon (3), Evening router-catalog (5) as previously listed.

Evening Track B (2):
- `r4_d143_classifier_catalog_tables_and_seed_v1_20260424` — R4 Step 1+2 atomic (tables + 6 classes + 20 rules + f.canonical_content_body columns + partial indexes)
- `cfw_content_type_prompt_youtube_and_promo_v1_20260424` — CFW 6-row parity fill (FB/IG/LI × promo_v1 + YT × rewrite/synth/promo)

**invegent-dashboard (main):**

- `59bfe66` — docs(roadmap): sync 22 Apr + 24 Apr full-day closures — Dashboard roadmap sync CC-TASK-01 CLOSED

*(invegent-portal / invegent-web: no 24 Apr commits)*

**25 Apr — CC tasks (Invegent-content-engine):**

- `23ed4c1` — docs(briefs): EF .upsert() audit — CC-TASK-02 CLOSED — 1 HIGH / 0 MEDIUM / 1 LOW findings (brief: `docs/briefs/2026-04-25-ef-upsert-audit.md`). HIGH = `feed-intelligence` upsert into `m.agent_recommendations` — partial unique index `uq_agent_rec_pending` cannot be inferred from `ON CONFLICT (source_id, recommendation_type)` without echoing the partial predicate; verified live via EXPLAIN with ERROR 42P10. Currently dormant (table empty); fires on first real recommendation. Same M11/A21 Finding-1 class.
- THIS COMMIT — docs(sync_state): CC-TASK-02 closure + new HIGH-priority fix item

---

## CLOSING NOTE FOR NEXT SESSION

24 Apr is now the highest-output session on record by a very wide margin.

**Final tally (Track B close):**
- **16 commits** on Invegent-content-engine
- **19 DB migrations** applied
- **11 briefs** committed (including 3 Claude Code task briefs)
- **5 sprint items closed** (M1 A11b, Cron monitoring, Q5, L6/A21, router catalog unification)
- **2 major specs committed ready for PK review** (R5 matching, D168 Layer 2)
- **R4 schema + seed LIVE**, function pending PK review of seeded rules
- **CFW at full prompt parity** (6→12 rows)
- **1 live production bug caught and fixed same session**
- **2 orphaned v1 seed functions removed**
- **1 latent infrastructure bug fixed** (k.refresh_column_registry)
- **9 audit findings produced, 5 closed**

**Pipeline state UNCHANGED operationally** from 22 Apr evening close. All 24 Apr work is prompt-layer / DB-layer / documentation that doesn't touch the live hot path. Router infrastructure still shadow-only. IG publisher still paused per D165.

**Remaining HIGH-priority sprint items:**
- **R4 Step 3** (classifier function + sweep + cron — gated on PK review of seed rules)
- **R6** (seed_and_enqueue router rewrite — now bundles Findings 1+4+6, ~3-4h total)

**Not HIGH (defence-in-depth, deferred):**
- **D168 Layer 2 implementation** (spec ready)
- **R5 implementation** (spec ready, depends on R4 function output)
- **Invegent content_type_prompt stack** (standalone follow-up)

**PK weekend review queue:**
- R4 v1 seed rules (6 classes, 20 rules) — confirm before Step 3 ships
- R5 spec 7 open questions (weightings, thresholds, dedup, overrides, campaigns, tuning cadence)
- D168 spec 7 open questions (check shape, thresholds, cadence, dedup, retention, dashboard, notifications)

**Realistic next working windows:**
- 25 Apr Saturday: dead day, or low-risk doc/audit work / PK spec review
- 27 Apr Monday: Meta App Review escalation + R4 Step 3 + R5 impl
- Whenever: Claude Code tasks 01-03 (dashboard sync / EF .upsert / frontend vocab) any time

**Lessons captured today (14 total):**

1. Client source data is gold (CFW ICE_Analysis → brand_profile)
2. Pre-existing prompt fields can silently contradict each other
3. Check constraints can bite mid-migration — widen rather than placeholder
4. v0.1-with-loose-positioning beats waiting for perfect clarity
5. Ship monitoring systems even when imperfect — first refresh finds hidden bugs
6. Tune thresholds against real data fast (v1 → v2 → v3 same session)
7. Close the loop same session when monitor catches bug
8. `DROP FUNCTION IF EXISTS name()` silently skips overloaded variants
9. `DROP INDEX` fails for UNIQUE-backed indexes; use `ALTER TABLE DROP CONSTRAINT`
10. Per-client or per-brand functions create divergence surface — drop rather than patch (PK principle)
11. Always check existing taxonomy tables before building new catalogs. Nearly built `t.platform_catalog` + `t.format_catalog` when `t.5.0_social_platform` + `t.5.3_content_format` already existed.
12. Dynamic table-driven structures > hardcoded CHECKs + function body literals (PK principle — adding new platform/format is now INSERT, not DDL migration).
13. Event triggers can mask the source of errors — k.refresh_column_registry failure appeared as "migration history init failed" because the trigger fires inside Supabase's post-migration wrapper. Isolation pattern: disable trigger during migration, fix underlying bug, re-enable.
14. **Parallel tracks multiply session output.** Track B (DB + specs, Claude Desktop) ran alongside Claude Code tasks (audits, dashboard sync) with zero conflicts. Different surface areas, no merge risk. Pattern applies whenever work can be partitioned by "hot path vs audit-only + spec-only" lines.
