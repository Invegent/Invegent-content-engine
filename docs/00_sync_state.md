# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-24 evening AEST — router catalog unification SHIPPED (Findings 2/3/5/6/9 closed + k.refresh_column_registry fix)
> Written by: PK + Claude session sync

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

### Evening commits

- `828de5f` — docs(briefs): router track hardcoded values audit — 9 findings
- `bb8d278` — docs(briefs): R4 classifier spec v2 — rewritten table-driven after PK pushback
- `ac06043` — docs(briefs): router catalog unification SHIPPED
- THIS COMMIT — docs(sync_state): 24 Apr evening — router catalog unification rolled up

### Evening migrations

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
- **Format vocabulary cleanup:** 4 dead profile-only values (image_ai, video_slideshow, video_avatar, video_voiceover) not in t.5.3_content_format. No data uses them, but if any dashboard code hardcodes these strings it'll fail. Audit for hardcoded format strings in invegent-dashboard + invegent-portal — LOW priority.
- **Blog vs website consolidation:** 12 legacy `m.post_publish` rows with platform='website' kept distinct from 'blog'. Migrating them to 'blog' would simplify vocabulary — LOW priority follow-up.
- **Memory correction:** CFW client_id wrong in userMemories (abbreviated `3eca32aa` expanded to wrong full UUID in session summary). Corrected.

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

CFW + Invegent v0.1 content prompts locked. `chk_persona_type` widened. Six `c.content_type_prompt` rows for CFW.

---

## 🟢 24 APR SESSION-START UPDATE — MORNING HOUSEKEEPING

Orphan branch sweep clean, M8 Gate 4 PASSED, CFW correction (26 client_source rows / 2 client_content_scope rows, was wrongly flagged as "never wired").

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else.** 24 Apr was the highest-output session on record. Morning housekeeping + A11b both halves + cron health monitoring Layer 1 + token-expiry bug fix + A21 ON CONFLICT audit + **router hardcoded-values audit (9 findings) + router catalog unification shipped (5 findings closed) + k.refresh_column_registry robustness fix**.

### Today's full session tally (updated 24 Apr evening)

- **13 commits** on Invegent-content-engine
- **17 DB migrations** applied (12 + 5 evening)
- **8 briefs** committed
- **5 sprint items closed** (M1 A11b, Cron monitoring Layer 1, Q5 check_token_expiry, L6/A21 ON CONFLICT, evening router catalog unification)
- **1 live production bug caught and fixed same session**
- **2 orphaned v1 seed functions removed** (M11-class dormant bug dead-code)
- **1 latent infrastructure bug fixed** (k.refresh_column_registry multi-FK dupe)
- **9 audit findings produced + 5 closed**

### Critical state awareness for next session

1. **A11b CLOSED.** CFW + Invegent v0.1 prompt stacks locked.
2. **Cron health monitoring LIVE.** Check `m.cron_health_alert WHERE resolved_at IS NULL` at session start.
3. **Token-expiry bug FIXED.** Auto-resolves at next cron fire.
4. **A21 CLOSED (DB layer).** Edge Function `.upsert()` audit remains as MEDIUM follow-up.
5. **ROUTER CATALOG UNIFIED.** t.5.0_social_platform extended with is_router_target + content_pipeline. 17 platforms catalogued. 29 FKs from data columns to taxonomy. Format vocab drift eliminated. All 4 clients have explicit digest_policy rows.
6. **`k.refresh_column_registry` fixed.** DISTINCT ON for multi-FK columns. Event trigger robust.
7. **R6 prep clearer:** Finding 6 (youtube hack) = 1-line change; Findings 1+4 bundle into R6's hot-path PR. Total R6 remaining: ~3-4h.
8. **R4 classifier v2 specced** (table-driven, brief at `docs/briefs/2026-04-24-r4-d143-classifier-spec.md`). Implementation still ahead.
9. **`instagram-publisher-every-15m` (jobid 53) remains PAUSED** until router integration verifies.
10. **ID004 closed.** Content-fetch cron healthy.
11. **M8 Gate 4 CLOSED.** Zero duplicate canonicals post-merge.
12. **M12 still superseded** by router build per D166.
13. **2 CFW IG drafts in `needs_review`** from AM — decision TBD.
14. **Dashboard roadmap sync still pending** — covers 22 Apr + 24 Apr FULL day.
15. **Reviewers still paused.** All four rows `is_active=false`.
16. **Pipeline clean.** 0 approved-but-unpublished FB drafts, 0 queue items.

### Router state — snapshot

Shadow infrastructure LIVE but still unconnected to hot path:
- ✅ R1: `t.platform_format_mix_default` with 22 seed rows
- ✅ R2: `c.client_format_mix_override`
- ✅ R3: `m.build_weekly_demand_grid()`
- 🔲 R4: Classifier (v2 spec done, implementation ahead)
- 🔲 R5: Matching layer
- 🔲 R6: `seed_and_enqueue_ai_jobs_v1` rewrite
- 🔲 R7: ai-worker platform awareness
- 🔲 R8: Cron changes
- **✅ Catalogs unified (24 Apr evening):** t.5.0_social_platform + t.5.3_content_format now drive platform/format vocabulary via FK. Was hardcoded across 7 CHECK constraints.

---

## SESSION STARTUP PROTOCOL (UPDATED 24 APR EVENING)

1. Read this file (`docs/00_sync_state.md`) in full
2. **Orphan branch sweep:** all 3 repos; flag orphans BEFORE new work
3. Check `c.external_reviewer` — confirm reviewers still paused
4. Check IG publisher cron state — jobid 53 `active=false`
5. Validate router shadow infrastructure: `SELECT * FROM t.platform_format_mix_default_check;` → 4 rows status='ok'
6. **Validate router catalogs:** `SELECT COUNT(*) FROM t."5.0_social_platform" WHERE is_router_target=TRUE` = 4; `SELECT COUNT(*) FROM c.client_digest_policy` = 4
7. **Validate event trigger + catalog refresh:** `SELECT evtenabled FROM pg_event_trigger WHERE evtname='trg_k_refresh_catalog'` = 'O'; `SELECT k.refresh_column_registry()` returns empty (no error)
8. Check ID004 recovery: `f.canonical_content_body` pending-backlog drained
9. **Check active cron health alerts:**
   ```sql
   SELECT jobid, jobname, alert_type, threshold_crossed,
          ROUND((EXTRACT(EPOCH FROM NOW() - first_seen_at) / 3600)::numeric, 1) || 'h' AS age,
          LEFT(COALESCE(latest_error, ''), 100) AS error_preview
   FROM m.cron_health_alert WHERE resolved_at IS NULL ORDER BY first_seen_at DESC;
   ```
10. Check file 15 Section G — pick next sprint item
11. Check `m.external_review_queue` for findings landed before pause
12. Read `docs/06_decisions.md` D156–D168 for accumulated decision trail
13. Query `k.vw_table_summary` before working on any table

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

**Pre-sales gate status:** 10 of 28 Section A items closed, 18 open (added: router catalog unification counts as partial close on router track).

**Today's movement:**
- 24 Apr morning: orphan sweep, M8 Gate 4 PASS, CFW correction
- 24 Apr mid-day: M1 / A11b CLOSED
- 24 Apr afternoon: Cron monitoring HIGH-priority CLOSED + Q5 CLOSED
- 24 Apr late-afternoon: A21 / L6 CLOSED
- **24 Apr evening: Router catalog unification SHIPPED (Findings 2/3/5/6/9 closed) + k.refresh_column_registry robustness fix**

---

## ALL CLIENTS — STATE (UPDATED 24 APR EVENING)

| Client | client_id | FB | IG | LI | YT | Schedule | Digest policy | Prompt stack | Notes |
|---|---|---|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ | ⏸ | ✅ | 🔲 | 6 rows | ✅ lenient | 12 rows | 63 dead m8_m11_bloat |
| Property Pulse | 4036a6b5 | ✅ | ⏸ | ✅ | 🔲 | 6+tier | ✅ lenient | 12 rows | 44 dead |
| Care For Welfare | 3eca32aa-e460 | ✅ | ⏸ | ⚠ | 🔲 | 21 rows | **✅ strict (24 Apr PM)** | **✅ FULL STACK LOCKED** | 2 IG drafts pending |
| Invegent | 93494a09 | ⏸ | ⏸ | ⚠ | ⚠ | 0 rows | **✅ strict (24 Apr PM)** | **🟡 v0.1 LOCKED** | Publishing deferred |

All 4 FB tokens permanent. All 4 clients now have explicit `c.client_digest_policy` rows — no more stealth-default behaviour.

---

## SPRINT MODE — THE BOARD (24 APR END-OF-DAY EVENING)

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

### Router track (22 Apr per D166+D167 + 24 Apr evening catalog work)

| # | Item | Status |
|---|---|---|
| R1 | `t.platform_format_mix_default` + seed | ✅ |
| R2 | `c.client_format_mix_override` | ✅ |
| R3 | `m.build_weekly_demand_grid()` | ✅ |
| **Catalog unification** | t.5.0_social_platform + t.5.3_content_format extended + FKs | **✅ 24 Apr evening** |
| R4 | D143 classifier | 🟡 v2 spec done (table-driven after PK pushback); implementation ahead |
| R5 | Matching layer | 🔲 Depends on R4 |
| R6 | `seed_and_enqueue` rewrite | 🔲 HIGH RISK — now ~3-4h remaining (Findings 1+4+6 bundle in) |
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
| **R6** | `seed_and_enqueue_ai_jobs_v1` rewrite (+ Findings 1+4+6 bundled) | IG publisher paused until router integration verifies |
| **D168** | ID004-class sentinel (Layer 2 of cron monitoring) | Composes with Layer 1 shipped today |

---

## WATCH LIST

### Due next session

- Check `m.cron_health_alert WHERE resolved_at IS NULL` in session startup
- **Verify router catalog state:** `SELECT COUNT(*) FROM t."5.0_social_platform" WHERE is_router_target=TRUE` = 4
- **Verify event trigger enabled:** `SELECT evtenabled FROM pg_event_trigger WHERE evtname='trg_k_refresh_catalog'` = 'O'
- **Verify k.refresh_column_registry doesn't throw:** `SELECT k.refresh_column_registry()` returns empty
- Fresh CFW draft review
- Dashboard roadmap sync — now covers 22 Apr + 24 Apr FULL day including evening

### Due week of 22-27 Apr

- **Mon 27 Apr** — Meta App Review escalation trigger
- **Sat 2 May** — original reviewer calibration cycle trigger (defer)

### Backlog (open, not yet addressed)

**New 24 Apr evening:**
- **R6 bundled work:** Finding 1 (client UUIDs in `enqueue_publish_from_ai_job_v1` trigger), Finding 4 (demand formula hardcoded in `seed_and_enqueue_ai_jobs_v1`), Finding 6 (1-line youtube hack replacement). All land together when R6 hot-path PR ships.
- **Format vocab dashboard/portal audit:** find any hardcoded strings like 'image_ai', 'video_avatar' etc. in invegent-dashboard + invegent-portal. LOW priority — none currently in production use.
- **Blog vs website consolidation:** migrate 12 legacy `m.post_publish.platform='website'` rows to 'blog', then drop 'website' row from catalog. LOW priority.

**New 24 Apr late afternoon:**
- Edge Function `.upsert()` / `onConflict:` audit — MEDIUM priority
- R6 follow-up — cron 48 NOT EXISTS filter platform scope

**24 Apr afternoon:**
- Cron health dashboard tile
- Cron health v3.1 — schedule-string parsing
- Notification layer for `m.cron_health_alert`
- Document `expires_at` sentinel

**24 Apr mid-day:**
- Avatar configuration for Invegent (HeyGen)
- Stream B source type implementation
- Invegent publishing activation checklist
- v0.2 positioning review for Invegent (2-3 months)
- CFW promo_v1 + YouTube content_type_prompt rows

**Carried from 24 Apr AM:**
- 2 CFW IG drafts in `needs_review` (older prompt stack)
- Stale non-main branches (8 total, cosmetic cleanup)

**Carried from earlier:**
- **D168** — ID004-class response-layer sentinel (HIGH priority)
- Publisher schedule source audit
- `m.post_publish_queue.status` has NO CHECK constraint — D163 continuation
- TPM saturation on concurrent platform rewrites
- `docs/archive` 5th-file mystery
- Per-commit external-reviewer pollution
- Property Pulse Schedule Facebook 6/5 tier violation
- 30+ remaining exec_sql sites in dashboard
- `facebook-publisher` EF audit
- Shrishti 2FA + passkey

---

## TODAY'S COMMITS (24 APR — FINAL)

**Invegent-content-engine (main):**

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
- `8xxxxxx` — docs(sync_state): A21 audit closed + end-of-day rollup

Evening (this block):
- `828de5f` — docs(briefs): router track hardcoded values audit — 9 findings
- `bb8d278` — docs(briefs): R4 classifier spec v2 — table-driven rewrite
- `ac06043` — docs(briefs): router catalog unification SHIPPED
- THIS COMMIT — docs(sync_state): 24 Apr evening — router catalog unification rolled up

**Migrations (DB-only, 24 Apr — 17 total):**

Mid-day (5) + Afternoon (4) + Late afternoon (3) — as previously listed.

Evening (5):
- `router_catalog_unification_use_existing_taxonomy_20260424_v1` — INSERT mismatch, rolled back
- `router_catalog_unification_use_existing_taxonomy_20260424_v2` — missed website orphan, rolled back
- `router_catalog_unification_use_existing_taxonomy_20260424_v3` — partial commit (data landed, history wrapper failed)
- `router_catalog_unification_v4_trigger_disabled` — partial commit
- Manual cleanup via execute_sql — dropped 2 redundant FKs, backfilled CFW+Invegent digest_policy, recreated view with tolerance, dropped duplicate UNIQUE, fixed `k.refresh_column_registry`

*(invegent-dashboard / invegent-portal / invegent-web: no 24 Apr commits)*

---

## CLOSING NOTE FOR NEXT SESSION

24 Apr is now the highest-output session on record by a wide margin.

**Final tally:**
- **13 commits** on Invegent-content-engine
- **17 DB migrations** applied
- **8 briefs** committed
- **5 sprint items closed** (M1 A11b, Cron monitoring, Q5, L6/A21, router catalog unification)
- **1 live production bug caught and fixed same session**
- **2 orphaned v1 seed functions removed**
- **1 latent infrastructure bug fixed** (k.refresh_column_registry)
- **9 audit findings produced, 5 closed**

**Pipeline state UNCHANGED operationally** from 22 Apr evening close. All 24 Apr work is prompt-layer / DB-layer / documentation that doesn't touch the live hot path. Router infrastructure still shadow-only. IG publisher still paused per D165.

**Remaining HIGH-priority sprint items:**
- **R6** (seed_and_enqueue router rewrite — now bundles Findings 1+4+6, ~3-4h total)
- **D168** (ID004-class sentinel — Layer 2)

**Realistic next working windows:**
- 25 Apr Saturday: dead day, or low-risk doc/audit work
- 27 Apr Monday: Meta App Review escalation + R5/R6 router work
- Whenever: Edge Function `.upsert()` audit (60-90 min) + dashboard roadmap sync (20-30 min) + D168 design (30-60 min spec)

**Lessons captured today (13 total):**

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
11. **Always check existing taxonomy tables before building new catalogs.** Nearly built `t.platform_catalog` + `t.format_catalog` when `t.5.0_social_platform` + `t.5.3_content_format` already existed.
12. **Dynamic table-driven structures > hardcoded CHECKs + function body literals** (PK principle — adding new platform/format is now INSERT, not DDL migration).
13. **Event triggers can mask the source of errors** — k.refresh_column_registry failure appeared as "migration history init failed" because the trigger fires inside Supabase's post-migration wrapper. Isolation pattern: disable trigger during migration, fix underlying bug, re-enable.
