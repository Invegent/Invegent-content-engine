# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-24 late-afternoon AEST — cron health Layer 1 + token-expiry fix + A21 ON CONFLICT audit closed
> Written by: PK + Claude session sync

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

### DB-layer sweep methodology for next time

1. `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE prosrc ILIKE '%on conflict%'`
2. Line-based extraction of surrounding INSERT INTO context (12 lines preceding each ON CONFLICT)
3. Cross-reference against `pg_index` (unique indexes) AND `pg_constraint` (named unique/PK/check constraints) — some items are in one but not the other
4. `ALTER TABLE ... DROP CONSTRAINT` for items backing UNIQUE constraints; `DROP INDEX` for pure indexes. Check `pg_constraint.conindid` to distinguish.
5. `DROP FUNCTION ...` requires correct arg signature — `IF EXISTS ()` silently skips overloaded variants. Always verify drops by re-querying `pg_proc`.

### Not yet audited — Edge Function `.upsert()` / `onConflict:` layer

Most Edge Functions use `supabase.from(table).upsert(data, { onConflict: 'col1,col2' })` rather than raw `ON CONFLICT` SQL. Same bug class is possible — if the `onConflict` column list doesn't match a unique constraint, Supabase returns an error at call time. **Scoped as separate MEDIUM-priority follow-up** — requires code-search across 40+ Edge Functions, ~60-90 min effort. Added to backlog.

### Cleanup inventory — dropped objects

| Schema | Object | Type | Reason |
|---|---|---|---|
| `m` | `seed_ndis_bundles_to_ai_v1(text, integer)` | FUNCTION | Dormant M11-class bug + orphaned v1 superseded by `seed_client_to_ai_v2` |
| `m` | `seed_property_bundles_to_ai_v1(text, integer)` | FUNCTION | Same as above |
| `c.client_digest_policy` | `client_digest_policy_client_uniq` | UNIQUE constraint | PK on (client_id) already covers |
| `c.client_source` | `client_source_client_source_uniq` | UNIQUE constraint | PK on (client_id, source_id) already covers |
| `m.post_format_performance` | `post_format_performance_client_id_ice_format_key_rolling_wi_key` | UNIQUE constraint | Redundant with `uq_format_perf_client_format_window` |
| `m.post_format_performance` | `post_format_performance_unique_key` | UNIQUE constraint | Redundant with `uq_format_perf_client_format_window` |
| `m.digest_item` | `ux_m_digest_item_run_canonical` | UNIQUE index (pure) | Redundant with `uq_digest_run_canonical` |
| `c.client_ai_profile` | `ux_client_ai_profile_default` | UNIQUE partial index | Identical to `ux_client_ai_profile_one_default_per_client` |
| `f.canonical_content_body` | `uq_canonical_content_body_canonical_id` | UNIQUE index (pure) | PK on (canonical_id) already covers |

### A21 migrations applied

- `a21_drop_orphaned_v1_seed_functions_and_redundant_indexes_20260424` — first attempt (partially succeeded on constraint/index drops; silent no-op on function drops due to missing arg signatures)
- `a21_drop_orphaned_v1_seed_functions_and_redundant_indexes_20260424_v2` — retry correcting DROP CONSTRAINT vs DROP INDEX mix
- `a21_drop_orphaned_v1_seed_functions_correct_signatures_20260424` — drops functions with correct `(text, integer)` signatures

### New backlog items (late afternoon)

- **Edge Function `.upsert()` / `onConflict:` audit** — MEDIUM priority follow-up. Sweep all `.upsert(` calls in `supabase/functions/` directory, validate each `onConflict:` parameter against target table unique constraints. Similar likelihood of finding a bug as the DB-layer sweep (which found 1). ~60-90 min.
- **R6 follow-up note — cron 48 filter:** when `m.seed_and_enqueue_ai_jobs_v1` is rewritten for router, also update cron 48's NOT EXISTS filter to include `AND q.platform = j2.platform` to match the unique constraint scope.

---

## 🟢 24 APR AFTERNOON UPDATE — CRON HEALTH MONITORING LAYER 1 LIVE + TOKEN-EXPIRY BUG CLOSED

### In one paragraph

Layer 1 cron failure-rate monitoring shipped to production. New DB-layer system watches `cron.job_run_details` every 15 minutes via a new `cron-health-every-15m` pg_cron job calling `m.refresh_cron_health()` (SECURITY DEFINER). Results UPSERT into `m.cron_health_snapshot` (one row per jobid × window), with threshold crossings creating lifecycle-tracked rows in `m.cron_health_alert` (partial-unique index on `(jobid, alert_type) WHERE resolved_at IS NULL`). Three alert types: `failure_rate_high` (≥ 20% in 24h with 3+ runs), `consecutive_failures` (≥ 3 in a row), `no_recent_runs` (schedule-aware: historical median × 2 with 2h floor / 32d ceiling; jobs with 0 runs and active=true alert immediately). Tuned through v1 → v2 → v3 same session. First refresh caught **1 live bug and 17 false positives**; v3 cleared 11 of the false positives, 3 remain as acceptable bootstrap transients. Catches M11-class; does NOT catch ID004-class (that's D168 domain, not yet built). Brief at `docs/briefs/2026-04-24-cron-health-monitoring-layer-1.md` (`0a60756`). **Sprint-board "Cron failure-rate monitoring" HIGH-priority item CLOSED.** The live bug caught by the monitor (token-expiry-alert-daily schema drift) was fixed and verified end-to-end in the same session — function now runs clean, belt-and-braces check on all 12 non-permanent tokens confirmed none were in a warning window during the 8-day outage.

### Live bug caught AND FIXED on first refresh

`token-expiry-alert-daily` (jobid 60) — 8 consecutive daily failures with `ERROR: column "checked_at" does not exist`. Root cause was schema drift: `public.check_token_expiry()` function referenced a `checked_at` column that doesn't exist (table has `created_at`) plus a `client_name` column that doesn't exist. Classic drift. Fix applied (migration `fix_check_token_expiry_schema_drift_20260424`): DELETE predicate `checked_at` → `created_at`, removed stale INSERT columns. Manually invoked post-fix — executed without error. Alert will auto-resolve at 22:05 UTC tonight when the cron next fires.

### Cron health alert state at time of writing (7 active)

**True positives:** `token-expiry-alert-daily` (fixed, awaiting next cron run), `compliance-reviewer-monthly` (never-ran), `external-reviewer-digest-weekly` (never-ran), `cron-health-every-15m` (bootstrap transient).

**Bootstrap false positives (3 alerts, self-resolve on next natural run):** `compliance-monitor-monthly` (next: 1 May), `client-weekly-summary-monday-730am-aest` (next: 26 Apr), `feed-intelligence-weekly` (next: 26 Apr). All have only 1 historical run; v3.1 schedule-string parsing would eliminate these.

### 24 Apr afternoon commits + migrations

**Commits (Invegent-content-engine main):**
- `0a60756` — docs(briefs): cron failure-rate monitoring Layer 1 — live in production
- `5e55c27` — docs(sync_state): 24 Apr afternoon — cron health Layer 1 live + M1/cron-monitoring sprint items closed
- `8413603` — docs(sync_state): token-expiry bug fix + end-of-day close
- `20d7f6d` — docs(briefs): A21 trigger ON CONFLICT audit — complete + remediation applied
- THIS COMMIT — docs(sync_state): A21 audit closed + end-of-day rollup

**Migrations (DB-only, afternoon):**
- `cron_health_monitoring_layer_1_schema_and_refresh_20260424`
- `cron_health_schedule_aware_no_run_threshold_20260424`
- `cron_health_lower_cadence_sample_size_min_20260424`
- `fix_check_token_expiry_schema_drift_20260424`
- `a21_drop_orphaned_v1_seed_functions_and_redundant_indexes_20260424`
- `a21_drop_orphaned_v1_seed_functions_and_redundant_indexes_20260424_v2`
- `a21_drop_orphaned_v1_seed_functions_correct_signatures_20260424`

### Afternoon backlog additions (complete list)

- ~~**Fix `public.check_token_expiry()`**~~ ✅ CLOSED same session
- **Cron health dashboard tile** — `/monitoring/cron-health` route, ~2-3h when warranted
- **Cron health v3.1 — schedule-string parsing** — ~1h enhancement, eliminates bootstrap false positives
- **Notification layer for `m.cron_health_alert`** — weekly digest or Telegram, deferred until volume warrants
- **Document `expires_at` sentinel** — `2099-12-31` not epoch 0 is actual convention
- **Edge Function `.upsert()` / `onConflict:` audit** — MEDIUM priority, ~60-90 min
- **R6 follow-up — cron 48 filter** — update NOT EXISTS to include platform when router ships

---

## 🟢 24 APR MID-DAY UPDATE — A11b CLOSED (CFW FULL + INVEGENT v0.1)

### In one paragraph

A11b (CFW + Invegent content prompts) functionally closed this session. For **CFW**: `c.client_brand_profile` all 8 empty fields filled + `brand_identity_prompt` rewritten (2,671 chars); `c.client_ai_profile.platform_rules` populated with structured JSONB for FB + IG + LI; `c.client_ai_profile.system_prompt` refactored 2,119 → 2,860 chars; 6 `c.content_type_prompt` rows created (`rewrite_v1` + `synth_bundle_v1` × FB/IG/LI). For **Invegent**: `c.client_brand_profile` INSERTED (row didn't exist) with v0.1 dual-stream framing; `system_prompt` refactored 1,866 → 4,370 chars; `platform_rules` populated for LinkedIn + YouTube only; `persona_type = 'hybrid_operator_and_avatar'` after widening `chk_persona_type` constraint. Three briefs committed: CFW profile (`2029383`), Invegent v0.1 profile (`53fb86c`), Invegent work-journal source-type scope (`f1b4c36`).

### 24 Apr mid-day commits

- `2029383` — docs(briefs): CFW brand profile + platform_rules lock
- `53fb86c` — docs(briefs): Invegent brand profile v0.1 + platform_rules lock
- `f1b4c36` — docs(briefs): scope Invegent work-journal source type (Stream B)
- `8c8968b` — docs(sync_state): 24 Apr mid-day A11b close + Invegent v0.1

### Mid-day migrations (DB-only)

- `cfw_lock_brand_profile_and_platform_rules_20260424`
- `cfw_align_system_prompt_with_brand_and_platform_rules_20260424`
- `cfw_seed_content_type_prompts_rewrite_and_synth_20260424`
- `invegent_create_brand_profile_v01_and_refactor_ai_profile_20260424_v2`
- `widen_chk_persona_type_add_hybrid_values_20260424`

---

## 🟢 24 APR SESSION-START UPDATE — MORNING HOUSEKEEPING

### In one paragraph

Three housekeeping items closed at session start. (1) **Orphan branch sweep** across 3 repos — 8 pre-existing stale branches, zero new orphans. (2) **M8 Gate 4 regression check — PASSED** — zero duplicate canonicals post-22 Apr merge. (3) **CFW overnight digest_items anomaly investigated** — correct behaviour; corrected yesterday's wrong "CFW never wired" side-finding. CFW actually has 26 `c.client_source` rows (2 enabled), 2 `c.client_content_scope` rows, runs hourly in planner loop. Real gap is missing `c.client_digest_policy` row.

### 24 Apr morning commits

- `3365b87` — docs(sync_state): 24 Apr morning housekeeping

### 2 CFW IG drafts in `needs_review` (still pending decision)

- `2d8204ac-e02c-4693-a6dd-7a4c3e8d09ed` — "Research Study: Early-career OTs"
- `fdb1ff8a-d344-4a05-9a33-2771f62e99bd` — "Policy and Advocacy update"

Both IG drafts with OLDER prompt stack. Decision TBD.

---

## 🟢 23 APR SESSION UPDATE — ID004 RESOLVED

9-day silent outage in content-fetch cron resolved. Cron jobid 4 queried `vault.decrypted_secrets` with uppercase `name='INGEST_API_KEY'` but the actual vault entry is lowercase `name='ingest_api_key'`. Fix via `cron.alter_job`. All verification gates passed by 10:01 UTC 23 Apr.

**Full incident:** `docs/incidents/2026-04-23-content-fetch-casing-drift.md` (ID004)
**Decision:** D168 — response-layer sentinel, scope defined, implementation deferred.

### 23 Apr commits

- `9094d75` — docs(incident): add ID004 content-fetch silent outage
- `7ccf5df` — docs(decisions): add D168 — response-layer sentinel
- `33efcb6` — docs(sync_state): 23 Apr mid-session — ID004 resolved
- fix(cron): jobid 4 vault secret filter uppercase→lowercase (live DB state only)

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else.** 24 Apr was a BIG day — morning housekeeping + A11b both halves + cron health monitoring Layer 1 + token-expiry bug fix + A21 ON CONFLICT audit. **Five briefs, 12 DB migrations, 10 commits, 4 sprint items closed.**

### Today's outcomes in one paragraph (24 Apr end-of-day)

Morning: orphan sweep clean, M8 Gate 4 PASSED, CFW "never wired" side-finding corrected. Mid-day: A11b CFW FULL STACK LOCKED + A11b Invegent v0.1 LOCKED + `chk_persona_type` constraint widened. Afternoon: Cron failure-rate monitoring Layer 1 LIVE + live `token-expiry-alert-daily` bug caught and fixed in same session + belt-and-braces verified. Late afternoon: A21 Trigger ON CONFLICT audit complete + 2 orphaned v1 seed functions dropped (M11-class sister bug) + 7 redundant unique indexes/constraints cleaned up + 1 architectural inconsistency flagged for R6. Pipeline state unchanged operationally; all today's work is prompt-layer / DB-layer / documentation that doesn't touch the live hot path.

### Critical state awareness for next session

1. **A11b CLOSED.** CFW has full prompt stack; Invegent has v0.1 prompt stack.
2. **Cron health monitoring LIVE.** Check `m.cron_health_alert WHERE resolved_at IS NULL` at session start. Expect ~3-5 active alerts.
3. **Token-expiry bug FIXED.** Alert will auto-resolve at 22:05 UTC when next cron fires.
4. **A21 CLOSED (DB layer).** Two orphaned v1 seed functions dropped. 7 redundant indexes cleaned. Edge Function layer audit remains as MEDIUM-priority follow-up.
5. **Router work R4/R6 — still Monday+ with fresh head.** When R6 (seed_and_enqueue rewrite) ships, also update cron 48 NOT EXISTS filter to include `AND q.platform = j2.platform`.
6. **`instagram-publisher-every-15m` (jobid 53) remains PAUSED.** Do not resume until router integration verifies.
7. **ID004 closed.** Content-fetch cron healthy.
8. **M8 Gate 4 CLOSED.** Zero duplicate canonicals post-merge.
9. **M12 still superseded** by router build per D166.
10. **2 CFW IG drafts in `needs_review`** from 24 Apr AM — decision TBD.
11. **Dashboard roadmap sync still pending** — covers 22 Apr + 24 Apr work. Low-risk content job.
12. **Reviewers still paused.** All four rows `is_active=false`.
13. **Pipeline clean.** 0 approved-but-unpublished FB drafts, 0 queue items.

### Verification opportunity for next session

Read one fresh CFW draft produced with the new A11b stack (any draft created post-24 Apr 00:36 UTC). Compare voice, format, and platform-rule adherence to intent.

---

## SESSION STARTUP PROTOCOL (UPDATED 24 APR)

1. Read this file (`docs/00_sync_state.md`) in full
2. **Orphan branch sweep:** query all 3 repos for non-main branches; flag orphans BEFORE new work
3. Check `c.external_reviewer` — confirm reviewers still paused
4. Check IG publisher cron state — jobid 53 `active=false`
5. Validate router shadow infrastructure: `SELECT * FROM t.platform_format_mix_default_check;` → 4 rows status='ok'
6. Check ID004 recovery: `f.canonical_content_body` pending-backlog drained
7. **Check active cron health alerts:**
   ```sql
   SELECT jobid, jobname, alert_type, threshold_crossed,
          ROUND((EXTRACT(EPOCH FROM NOW() - first_seen_at) / 3600)::numeric, 1) || 'h' AS age,
          LEFT(COALESCE(latest_error, ''), 100) AS error_preview
   FROM m.cron_health_alert WHERE resolved_at IS NULL ORDER BY first_seen_at DESC;
   ```
8. Check file 15 Section G — pick next sprint item
9. Check `m.external_review_queue` for findings landed before pause
10. Read `docs/06_decisions.md` D156–D168 for accumulated decision trail
11. Query `k.vw_table_summary` before working on any table
12. **If a fresh CFW draft has been produced since 24 Apr 00:36 UTC,** compare voice/format/platform-rule adherence to intent

---

## DEV WORKFLOW RULE (ADOPTED 22 APR — D165 context)

**Default: direct-push to main.** Claude Code work ships straight to main. Vercel auto-deploys within ~60s.

**Deviate only when:**
- Multi-repo coordinated change where half-state would break production
- PK explicitly flags the work as risky

**Session-start orphan sweep is non-negotiable.**

---

## TODAY'S FULL RUN (22 APR)

*(22 Apr narrative preserved in prior commits. Summary: M5/M6/M7/M8/M9/M11 closed, privacy policy migration, D166/D167 router pivot. See commit `034ab9f0` for detailed chronology.)*

---

## THE EXTERNAL REVIEWER LAYER — CURRENT STATE (UNCHANGED FROM 21 APR)

| Reviewer | Lens | Model | `is_active` |
|---|---|---|---|
| Strategist | Right direction? | gemini-2.5-pro | false |
| Engineer | Built well? | gpt-4o | false (OpenAI Tier 2 pending) |
| Risk | Silent failures? | grok-4-1-fast-reasoning | false |
| System Auditor | Claim vs reality audit | grok-4-1-fast-reasoning | false |

All still paused. Re-enable ceremony at ~18-19 of 28 Section A items closed.

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** — active, external client expansion gated on pre-sales criteria

**Pre-sales gate status:** 9 of 28 Section A items closed, 19 open. Router MVP work, cron monitoring, and A21 audit are sprint-track.

**Today's movement:**
- 24 Apr morning: orphan sweep, M8 Gate 4 PASS, CFW correction
- 24 Apr mid-day: **M1 / A11b CLOSED** (CFW full + Invegent v0.1)
- 24 Apr afternoon: **"Cron failure-rate monitoring" HIGH-priority CLOSED** + Q5 token-expiry fix CLOSED
- 24 Apr late-afternoon: **A21 / L6 Trigger ON CONFLICT audit CLOSED** + 2 orphaned functions dropped + 7 redundant indexes cleaned

**Operational status:** Pipeline clean. Bundler M8 dedup active. FB queue enqueue M11 fix live. IG publishing paused. LI / YouTube / WordPress publishing unaffected. Router shadow infrastructure live but unconnected to hot path. **CFW full prompt stack locked; Invegent v0.1 locked; cron health monitoring watching 46 crons every 15 minutes; check_token_expiry function restored; DB-layer ON CONFLICT audit clean after cleanup.**

---

## ALL CLIENTS — STATE (UPDATED 24 APR)

| Client | client_id | FB | IG | LI | YT | Schedule | Pending | Prompt stack | Notes |
|---|---|---|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ | ⏸ paused | ✅ | 🔲 | 6 rows | 0 | 12 content_type_prompt rows | 63 drafts dead as m8_m11_bloat |
| Property Pulse | 4036a6b5 | ✅ | ⏸ paused | ✅ | 🔲 | 6 rows + tier violation | 0 | 12 content_type_prompt rows | 44 drafts dead as m8_m11_bloat |
| Care For Welfare | 3eca32aa | ✅ | ⏸ paused | ⚠ mode=null | 🔲 | 21 rows | 2 IG drafts (older stack) | **✅ FULL STACK LOCKED 24 Apr** | 13 drafts dead; `c.client_digest_policy` missing |
| Invegent | 93494a09 | ⏸ not configured | ⏸ not configured | ⚠ mode=null | ⚠ mode=null | 0 rows | 0 | **🟡 v0.1 LOCKED 24 Apr** | Publishing deferred; dual-stream model |

All 4 FB tokens permanent (sentinel `2099-12-31` in `token_expires_at`).

---

## SPRINT MODE — THE BOARD (24 APR END-OF-DAY)

Source of truth: `docs/15_pre_post_sales_criteria.md` Section G.

### Quick wins (<1 hour each)

| # | Item | Status |
|---|---|---|
| Q1 | 13 failed ai_jobs SQL cleanup | ✅ CLOSED 21 Apr |
| Q2 | Discovery pipeline `config.feed_url` | ✅ CLOSED 22 Apr |
| Q3 | A24 → closed in file 15 | ✅ CLOSED 21 Apr |
| Q4 | A7 privacy policy update | ✅ CLOSED 22 Apr |
| **Q5** | Fix `public.check_token_expiry()` schema drift | ✅ CLOSED 24 Apr afternoon |

### Medium (1-3 hours)

| # | Item | Status |
|---|---|---|
| **M1** | A11b CFW + Invegent content prompts | ✅ CLOSED 24 Apr mid-day |
| M2 | CFW schedule save bug | ✅ CLOSED 21 Apr |
| M3 | A14 RLS verification | 🟡 Audit complete; HS-1/HS-2 OAuth state signing remain |
| M4 | A18 — 7 source-less EFs | 🔲 |
| M5 | `getPublishSchedule` RPC hardening | ✅ CLOSED 22 Apr |
| M6 | Portal exec_sql eradication | ✅ CLOSED 22 Apr |
| M7 | Dashboard `feeds/create` exec_sql | ✅ CLOSED 22 Apr |
| M8 | Bundler draft multiplication | ✅ CLOSED 22 Apr — Gate 4 PASSED 24 Apr AM |
| M9 | Client-switch staleness | ✅ CLOSED 22 Apr |
| M11 | FB-vs-IG publish disparity | ✅ CLOSED 22 Apr |
| M12 | IG publisher filter + enqueue NOT EXISTS | 🟡 SUPERSEDED per D166 |
| **Cron failure-rate monitoring** | Layer 1 | ✅ CLOSED 24 Apr afternoon |

### Router build track (22 Apr per D166 + D167)

| # | Item | Status |
|---|---|---|
| R1 | `t.platform_format_mix_default` + 22 seed rows | ✅ CLOSED 22 Apr |
| R2 | `c.client_format_mix_override` | ✅ CLOSED 22 Apr |
| R3 | `m.build_weekly_demand_grid()` | ✅ CLOSED 22 Apr |
| R4 | D143 classifier spec | 🔲 Next sprint work |
| R5 | Matching layer design | 🔲 Depends on R4 |
| R6 | `m.seed_and_enqueue_ai_jobs_v1` rewrite | 🔲 HIGH RISK — hot path, Monday+ fresh head — also update cron 48 NOT EXISTS filter when rewriting |
| R7 | ai-worker platform-awareness | 🔲 Depends on R6 |
| R8 | Cron changes | 🔲 Depends on R6 |

### Larger (half-day+)

| # | Item | Status |
|---|---|---|
| L1 | A1 + A5 + A8 — Pilot terms + KPI + AI disclosure | 🔲 PK draft |
| L2 | A3 + A4 — One-page proof doc | 🔲 |
| L3 | A16 — Clock A dashboard | 🔲 |
| L4 | A17 — Clock C seven items | 🔲 |
| L5 | A20 — Pipeline liveness monitoring | 🔲 overlaps with cron health — could close partially |
| **L6** | A21 — Trigger ON CONFLICT audit | **✅ CLOSED 24 Apr late afternoon (DB layer) — `docs/briefs/2026-04-24-a21-on-conflict-audit.md`** |
| L7 | A22 — ai-worker error surfacing | 🔲 |
| L8 | A23 — Live /debug_token cron | 🔲 D153 |
| L9 | A25 — Stage 2 bank reconciliation | 🔲 |
| L10 | A26 — Review discipline mechanism | 🔲 |

### HIGH priority items remaining

| # | Item | Why HIGH |
|---|---|---|
| **R6** | `seed_and_enqueue_ai_jobs_v1` rewrite (supersedes M12) | IG publisher paused until router integration verifies |
| **D168** | ID004-class sentinel (Layer 2 of cron monitoring) | Composes with Layer 1 shipped today |

### Blocked / external

| # | Item | Status |
|---|---|---|
| A2 | Meta App Review | In Review; escalate 27 Apr if no movement |
| A6 | Unit economics (TBC subs) | Invoice check |

---

## WATCH LIST

### Due next session

- **Check `m.cron_health_alert WHERE resolved_at IS NULL`** as part of session startup protocol
- **Verify token-expiry-alert-daily auto-resolved** (cron should have fired at 22:05 UTC; alert clears on first successful run)
- **Fresh CFW draft review** — read first draft produced with new A11b stack
- **Dashboard roadmap sync** — covers 22 Apr closures + 24 Apr A11b + 24 Apr cron health + 24 Apr A21 cleanup

### Due week of 22-27 Apr

- **Mon 27 Apr** — Meta App Review escalation trigger if no movement
- **Sat 2 May** — original reviewer calibration cycle trigger (defer until reviewers resume)

### Backlog (open, not yet addressed)

**New 24 Apr late afternoon:**
- **Edge Function `.upsert()` / `onConflict:` audit** — MEDIUM priority. Sweep all `.upsert(` calls in `supabase/functions/`, validate `onConflict:` params against unique constraints. ~60-90 min.
- **R6 follow-up note — cron 48 filter:** update NOT EXISTS to include platform when router rewrite ships.

**24 Apr afternoon:**
- **Cron health dashboard tile** — `/monitoring/cron-health` route, ~2-3h
- **Cron health v3.1 — schedule-string parsing** — ~1h enhancement
- **Notification layer for `m.cron_health_alert`** — weekly digest or Telegram
- **Document `expires_at` sentinel** — `2099-12-31` not epoch 0

**24 Apr mid-day:**
- Avatar configuration for Invegent (HeyGen)
- Stream B source type implementation — scope at `docs/briefs/2026-04-24-invegent-work-journal-source-type.md`
- Invegent publishing activation checklist
- v0.2 positioning review for Invegent (2-3 months)
- CFW promo_v1 + YouTube content_type_prompt rows

**Carried from 24 Apr AM:**
- CFW `c.client_digest_policy` row missing
- 2 CFW IG drafts in `needs_review` (older prompt stack)
- Stale non-main branches (8 total, cosmetic cleanup)

**Carried from earlier:**
- **D168** — ID004-class response-layer sentinel (HIGH priority, composes with Layer 1)
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

## TODAY'S COMMITS (24 APR)

**Invegent-content-engine (main):**

Morning:
- `3365b87` — docs(sync_state): 24 Apr morning housekeeping

Mid-day:
- `2029383` — docs(briefs): CFW brand profile + platform_rules lock
- `53fb86c` — docs(briefs): Invegent brand profile v0.1 + platform_rules lock
- `f1b4c36` — docs(briefs): scope Invegent work-journal source type (Stream B)
- `8c8968b` — docs(sync_state): 24 Apr mid-day A11b close + Invegent v0.1

Afternoon:
- `0a60756` — docs(briefs): cron failure-rate monitoring Layer 1 — live in production
- `5e55c27` — docs(sync_state): 24 Apr afternoon — cron health Layer 1 live + sprint items closed
- `8413603` — docs(sync_state): token-expiry bug fix + end-of-day close

Late afternoon:
- `20d7f6d` — docs(briefs): A21 trigger ON CONFLICT audit — complete + remediation applied
- THIS COMMIT — docs(sync_state): A21 audit closed + end-of-day rollup

**Migrations (DB-only, 24 Apr — 12 total):**

Mid-day (5):
- `cfw_lock_brand_profile_and_platform_rules_20260424`
- `cfw_align_system_prompt_with_brand_and_platform_rules_20260424`
- `cfw_seed_content_type_prompts_rewrite_and_synth_20260424`
- `invegent_create_brand_profile_v01_and_refactor_ai_profile_20260424_v2`
- `widen_chk_persona_type_add_hybrid_values_20260424`

Afternoon (4):
- `cron_health_monitoring_layer_1_schema_and_refresh_20260424`
- `cron_health_schedule_aware_no_run_threshold_20260424`
- `cron_health_lower_cadence_sample_size_min_20260424`
- `fix_check_token_expiry_schema_drift_20260424`

Late afternoon (3):
- `a21_drop_orphaned_v1_seed_functions_and_redundant_indexes_20260424`
- `a21_drop_orphaned_v1_seed_functions_and_redundant_indexes_20260424_v2`
- `a21_drop_orphaned_v1_seed_functions_correct_signatures_20260424`

*(invegent-dashboard / invegent-portal / invegent-web: no 24 Apr commits)*

---

## CLOSING NOTE FOR NEXT SESSION

24 Apr was one of the highest-output sessions on record. Morning: 3 housekeeping items. Mid-day: A11b both halves + 3 briefs + 1 constraint widening. Afternoon: cron failure-rate monitoring Layer 1 shipped to production + 1 live bug caught AND fixed + 1 brief. Late afternoon: A21 ON CONFLICT audit complete + 2 orphaned v1 seed functions dropped + 7 redundant unique indexes/constraints cleaned up + 1 architectural inconsistency flagged for R6 + 1 brief.

**Final tally:**
- **10 commits** on Invegent-content-engine
- **12 DB migrations** applied
- **5 briefs** committed
- **4 sprint items closed** (M1 A11b, Cron monitoring Layer 1, Q5 check_token_expiry, L6/A21 ON CONFLICT audit)
- **1 live production bug caught and fixed same session**
- **2 orphaned v1 seed functions removed** (M11-class dormant bug dead-code)

**Pipeline state UNCHANGED operationally** from 22 Apr evening close. All 24 Apr work is prompt-layer / DB-layer / documentation that doesn't touch the live hot path. Router infrastructure still shadow-only. IG publisher still paused per D165.

**Remaining HIGH-priority sprint items:**
- **R6** (seed_and_enqueue router rewrite — Monday+ fresh-head work; also update cron 48 NOT EXISTS filter when rewriting)
- **D168** (ID004-class sentinel — Layer 2, composes with Layer 1 shipped today)

**Session startup protocol now includes:**
1. Orphan branch sweep
2. Router shadow infrastructure validation
3. Cron health alert check (`m.cron_health_alert WHERE resolved_at IS NULL`)

**Realistic next working windows:**
- 25 Apr Saturday: dead day, or R4 classifier spec (low-risk writing)
- 27 Apr Monday: Meta App Review escalation + R5/R6 router work with fresh head
- Whenever convenient: Edge Function `.upsert()` audit (60-90 min) + dashboard roadmap sync (20-30 min) + D168 Layer 2 design (30-60 min spec)

**A11b + cron health + bug fix + A21 audit lessons (7 in total):**
1. Client source data is gold — CFW ICE_Analysis shaped the brand_profile
2. Pre-existing prompt fields can silently contradict each other
3. Check constraints can bite mid-migration — widen rather than leave placeholders
4. v0.1-with-loose-positioning beats waiting for perfect clarity
5. Ship monitoring systems even when imperfect — first refresh found a bug silent for 8+ days
6. Tune thresholds against real data fast — v1 → v2 → v3 same session
7. Close the loop the same session — monitor caught bug, bug fixed, verification ran, backlog item closed
8. `DROP FUNCTION IF EXISTS name()` silently skips overloaded variants — always verify drops by re-querying `pg_proc`
9. `DROP INDEX` fails for items backing UNIQUE constraints — use `ALTER TABLE DROP CONSTRAINT` for those; check `pg_constraint.conindid` to distinguish
10. PK's principle: ICE is a single robust pipeline for all clients. Per-client or per-brand functions (like the v1 seeds we dropped) create divergence surface area. Drop rather than patch.
