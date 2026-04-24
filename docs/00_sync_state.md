# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-24 late-afternoon AEST — cron health Layer 1 LIVE + token-expiry bug fixed end-to-end
> Written by: PK + Claude session sync

---

## 🟢 24 APR AFTERNOON UPDATE — CRON HEALTH MONITORING LAYER 1 LIVE + TOKEN-EXPIRY BUG CLOSED

### In one paragraph

Layer 1 cron failure-rate monitoring shipped to production. New DB-layer system watches `cron.job_run_details` every 15 minutes via a new `cron-health-every-15m` pg_cron job calling `m.refresh_cron_health()` (SECURITY DEFINER). Results UPSERT into `m.cron_health_snapshot` (one row per jobid × window), with threshold crossings creating lifecycle-tracked rows in `m.cron_health_alert` (partial-unique index on `(jobid, alert_type) WHERE resolved_at IS NULL`). Three alert types: `failure_rate_high` (≥ 20% in 24h with 3+ runs), `consecutive_failures` (≥ 3 in a row), `no_recent_runs` (schedule-aware: historical median × 2 with 2h floor / 32d ceiling; jobs with 0 runs and active=true alert immediately). Tuned through v1 → v2 → v3 same session (v2 added schedule-awareness, v3 lowered `min_runs_for_cadence` from 3 to 1 to handle young-system weekly/monthly crons with only 1-2 runs of history). First refresh caught **1 live bug and 17 false positives**; v3 cleared 11 of the false positives, 3 remain as acceptable bootstrap transients. Catches M11-class; does NOT catch ID004-class (that's D168 domain, not yet built). Brief at `docs/briefs/2026-04-24-cron-health-monitoring-layer-1.md` (`0a60756`). **Sprint-board "Cron failure-rate monitoring" HIGH-priority item CLOSED.** The live bug caught by the monitor (token-expiry-alert-daily schema drift) was then fixed and verified end-to-end in the same session — function now runs clean, belt-and-braces check on all 12 non-permanent tokens confirmed none were in a warning window during the 8-day outage.

### Live bug caught AND FIXED on first refresh

`token-expiry-alert-daily` (jobid 60) — 8 consecutive daily failures with `ERROR: column "checked_at" does not exist`. Root cause was schema drift: `public.check_token_expiry()` function was written against an older version of `m.token_expiry_alert` that had a `checked_at` column. The current table has `created_at` instead. The function also referenced `client_name` in its INSERT column list but the table doesn't have that column. Classic drift — table was rebuilt at some point without updating the consuming function. **Severity was LOW** because all 4 FB tokens are permanent (`expires_at: 0`), so the token-expiry monitor has had no real work to do; the bug was pure noise. But it had been silently erroring daily since at least 16 Apr, and nothing else in the system was surfacing this.

**Fix applied in same session** (migration `fix_check_token_expiry_schema_drift_20260424`):
- DELETE predicate: `checked_at` → `created_at`
- INSERT column list: removed `client_name` (not in table), removed `checked_at` (not in table); `created_at` has a `NOW()` default so omitting is fine
- SELECT: removed corresponding `c.client_name` and `NOW() AS checked_at`
- Added belt-and-braces filter: `token_expires_at > TO_TIMESTAMP(0)` to skip epoch-sentinel "permanent" tokens explicitly

**Verification:**
- Manually invoked `SELECT public.check_token_expiry();` post-fix → executed without error (was failing 100% before)
- `m.token_expiry_alert` row count = 0 (expected — no tokens in warning window)
- Belt-and-braces: queried all 12 profiles with non-null non-epoch `token_expires_at` → all classified `fine` (earliest expiry is 1 Apr 2031 for YouTube tokens; remaining 10 use `2099-12-31` as "permanent" sentinel). **No warnings were missed during the 8-day outage.**

**Alert lifecycle:** the `consecutive_failures` alert on jobid 60 is still active because `cron.job_run_details` only records actual cron invocations, not manual function calls. The alert will auto-resolve at 22:05 UTC tonight (8:05am AEST Saturday) when the cron next fires and succeeds — `consecutive_failures_at_end` will reset to 0 at that point, and the next `m.refresh_cron_health()` cycle will flip `resolved_at`. Fresh-eyes check for next session: `m.cron_health_alert WHERE resolved_at IS NULL` should show the alert cleared.

**Side-finding:** sync_state historically said "all 4 FB tokens permanent (`expires_at: 0`)" but the actual sentinel used is `2099-12-31`, not epoch 0. Minor doc drift, not operationally significant. Function handles both correctly.

This is the primary validation that the monitor is worth the 1.5 hours it cost to build. The first time we turned it on, it found a bug that had been silent for 8+ days, and we fixed it in the same session. Monitoring + fix + verify, textbook loop.

### Current `m.cron_health_alert` state (7 active at time of writing)

**True positives (3 alerts, keep for now):**
- `token-expiry-alert-daily` — `consecutive_failures` × 8 (**bug fixed; will auto-resolve at 22:05 UTC**)
- `compliance-reviewer-monthly` — `no_recent_runs` (never-ran-ever, active=true)
- `external-reviewer-digest-weekly` — `no_recent_runs` (never-ran-ever, reviewer-pause context)

**Transient (1 alert):**
- `cron-health-every-15m` (self) — `no_recent_runs` (bootstrap; auto-resolves on first 15-min tick)

**Bootstrap false positives (3 alerts, self-resolve on next natural run):**
- `compliance-monitor-monthly` — only 1 historical run; next expected 1 May
- `client-weekly-summary-monday-730am-aest` — only 1 historical run; next expected 26 Apr
- `feed-intelligence-weekly` — only 1 historical run; next expected 26 Apr

These 3 have `sample_size = 0` (only 1 run in history = 0 intervals), so they fall back to the 2h floor despite having known weekly/monthly cadence. v3.1 enhancement (schedule-string parsing) will fix this — sketched in the brief, not today's scope.

### Sprint-board state

The "Cron failure-rate monitoring" HIGH-priority item that's been on the board since 22 Apr M11 close is **CLOSED**. The `Fix public.check_token_expiry()` item that was briefly on the board this afternoon is also **CLOSED**. Remaining HIGH-priority: **R6** (seed_and_enqueue_ai_jobs_v1 rewrite — blocks IG publisher resume) and **D168** (ID004-class sentinel — composes with Layer 1).

### 24 Apr afternoon commits + migrations

**Commits (Invegent-content-engine main):**
- `0a60756` — docs(briefs): cron failure-rate monitoring Layer 1 — live in production
- `5e55c27` — docs(sync_state): 24 Apr afternoon — cron health Layer 1 live + M1/cron-monitoring sprint items closed
- THIS COMMIT — docs(sync_state): token-expiry bug fix + end-of-day close

**Migrations (DB-only):**
- `cron_health_monitoring_layer_1_schema_and_refresh_20260424` — v1 schema + function + `cron-health-every-15m` cron job
- `cron_health_schedule_aware_no_run_threshold_20260424` — v2 function replacement (schedule-aware no_recent_runs)
- `cron_health_lower_cadence_sample_size_min_20260424` — v3 function replacement (v_min_runs_for_cadence 3 → 1)
- `fix_check_token_expiry_schema_drift_20260424` — corrected `public.check_token_expiry()` after cron-health surfaced the bug

### New backlog items (afternoon)

- ~~**Fix `public.check_token_expiry()`**~~ ✅ **CLOSED 24 Apr afternoon** — migration `fix_check_token_expiry_schema_drift_20260424` applied and verified.
- **Cron health dashboard tile** — UI surface for `m.cron_health_alert`. Proposed route `/monitoring/cron-health` on `invegent-dashboard`. ~2-3h when warranted. Not building yet — query-direct is fine while system is small.
- **Cron health v3.1 — schedule-string parsing** — parse `cron.job.schedule` strings (patterns like `*/N * * * *`, `M H * * 0-6`) to derive expected interval when historical sample_size insufficient. ~1h. Eliminates the 3 remaining bootstrap false positives. Nice-to-have, not urgent.
- **Notification layer for `m.cron_health_alert`** — weekly digest email OR push to `@InvegentICEbot` Telegram. Deferred until alert volume warrants it. Currently query-direct at session start is adequate.
- **Document `expires_at` sentinel convention** — `2099-12-31` is the "permanent" sentinel in actual use; earlier sync_state docs referred to epoch 0. Minor; update any docs that mention it next time they're touched.

### Operational check for next session start

Add to protocol:
```sql
-- Active cron health alerts (adds to session startup checks)
SELECT jobid, jobname, alert_type, threshold_crossed,
       ROUND((EXTRACT(EPOCH FROM NOW() - first_seen_at) / 3600)::numeric, 1) || 'h' AS age,
       LEFT(COALESCE(latest_error, ''), 100) AS error_preview
FROM m.cron_health_alert
WHERE resolved_at IS NULL
ORDER BY first_seen_at DESC;
```

**Expected at next session start (assuming 22:05 UTC has passed):**
- `token-expiry-alert-daily` → **RESOLVED** (consecutive_failures cleared when cron next succeeds)
- `cron-health-every-15m` self-alert → **RESOLVED** (auto-resolved within 15 min of creation)
- `compliance-reviewer-monthly` + `external-reviewer-digest-weekly` → still active (legitimately never-ran)
- 3 bootstrap false positives → still active (until their natural cadence fires)

**If `token-expiry-alert-daily` is still active at next session start**, that means the cron didn't run at 22:05 UTC (or ran and still failed — which would indicate the fix was insufficient). Investigate by querying `cron.job_run_details` for jobid 60 ordered by start_time DESC.

---

## 🟢 24 APR MID-DAY UPDATE — A11b CLOSED (CFW FULL + INVEGENT v0.1)

### In one paragraph

A11b (CFW + Invegent content prompts) functionally closed this session. For **CFW**: `c.client_brand_profile` all 8 empty fields filled + `brand_identity_prompt` rewritten (2,671 chars, aligned with system_prompt); `c.client_ai_profile.platform_rules` populated with structured JSONB for FB + IG + LI (word counts, emoji allowed/forbidden, hashtag allowed/forbidden, voice rule); `c.client_ai_profile.system_prompt` refactored from 2,119 → 2,860 chars (cleaner separation of concerns — points to brand_identity_prompt for voice, platform_rules for specifics); 6 `c.content_type_prompt` rows created (`rewrite_v1` + `synth_bundle_v1` × FB/IG/LI). For **Invegent**: `c.client_brand_profile` INSERTED (row didn't exist) with v0.1 dual-stream framing (Stream A external + Stream B internal work-journal); `system_prompt` refactored 1,866 → 4,370 chars; `platform_rules` populated for LinkedIn + YouTube only (no FB/IG/X); `persona_type = 'hybrid_operator_and_avatar'` after widening `chk_persona_type` constraint to support mixed PK-recorded + avatar-delivered content. Three briefs committed: CFW profile (`2029383`), Invegent v0.1 profile (`53fb86c`), Invegent work-journal source-type scope (`f1b4c36`).

### Schema change — chk_persona_type widened

Added `hybrid_operator_and_avatar` and `hybrid_operator_only` to the allowed values on `c.client_brand_profile.persona_type`. Before: 4 values. After: 6 values. Applied via `apply_migration`. CFW row unchanged (still `voiceover_only`). Invegent updated to `hybrid_operator_and_avatar` as intended.

### 24 Apr mid-day commits (beyond morning)

- `2029383` — docs(briefs): CFW brand profile + platform_rules lock
- `53fb86c` — docs(briefs): Invegent brand profile v0.1 + platform_rules lock
- `f1b4c36` — docs(briefs): scope Invegent work-journal source type (Stream B)
- `8c8968b` — docs(sync_state): 24 Apr mid-day A11b close + Invegent v0.1
- Migration `cfw_lock_brand_profile_and_platform_rules_20260424` (DB-only)
- Migration `cfw_align_system_prompt_with_brand_and_platform_rules_20260424` (DB-only)
- Migration `cfw_seed_content_type_prompts_rewrite_and_synth_20260424` (DB-only)
- Migration `invegent_create_brand_profile_v01_and_refactor_ai_profile_20260424_v2` (DB-only)
- Migration `widen_chk_persona_type_add_hybrid_values_20260424` (DB-only)

### Mid-day backlog added

- Avatar configuration for Invegent (HeyGen) — prompts forward-compatible
- Stream B source type implementation — scope brief at `docs/briefs/2026-04-24-invegent-work-journal-source-type.md`
- Invegent publishing activation checklist — 8 steps in v0.1 brief
- v0.2 positioning review for Invegent — 2-3 months out
- CFW promo_v1 + YouTube content_type_prompt rows — if/when CFW wants them

---

## 🟢 24 APR SESSION-START UPDATE — MORNING HOUSEKEEPING

### In one paragraph

Three housekeeping items closed at session start. (1) **Orphan branch sweep** across 3 repos — 8 pre-existing stale branches from 21-22 Apr squash-merged work, zero new orphans overnight. (2) **M8 Gate 4 regression check — PASSED** — zero duplicate canonicals across digest_runs for same client since 22 Apr 00:43 UTC merge; 24h+ of production data confirms D164 7-day NOT EXISTS guard is holding. (3) **CFW overnight digest_items anomaly investigated** — turned out to be correct behaviour, but uncovered that yesterday's "CFW never wired into the pipeline" side-finding was wrong. Reality: CFW has 26 `c.client_source` rows (2 enabled), 2 `c.client_content_scope` rows, runs hourly in jobid 12 `planner-hourly` loop. The 2 overnight items were the first successful selection since ID004 unstuck content-fetch — fresh canonicals at 11:00 UTC tick became IG drafts by 11:40 UTC. They're sitting in `needs_review` and won't publish (IG cron paused per D165).

### 24 Apr morning commits

- `3365b87` — docs(sync_state): 24 Apr morning housekeeping

### 2 CFW IG drafts in `needs_review` (still pending decision)

- `2d8204ac-e02c-4693-a6dd-7a4c3e8d09ed` — "Research Study: Early-career OTs transitioning to specialty practice"
- `fdb1ff8a-d344-4a05-9a33-2771f62e99bd` — "Policy and Advocacy update"

Both `platform='instagram'`, created 23 Apr 11:40 UTC with OLDER prompt stack (pre-A11b). Decision TBD — mark dead, reassign platform, or let router sort it out.

### Calibration note

Yesterday's "CFW never wired" assertion sat in sync_state for 14+ hours before being caught. F11-style verification discipline applies equally to side-findings.

---

## 🟢 23 APR SESSION UPDATE — ID004 RESOLVED

9-day silent outage in content-fetch cron resolved. Cron jobid 4 (`content_fetch_every_10min`) queried `vault.decrypted_secrets` with filter `name='INGEST_API_KEY'` (uppercase), but the actual vault entry is `name='ingest_api_key'` (lowercase). Case-sensitive string comparison → NULL subquery → null `x-ingest-key` HTTP header → EF 401. All verification gates passed by 10:01 UTC 23 Apr.

**Full incident:** `docs/incidents/2026-04-23-content-fetch-casing-drift.md` (ID004)
**Decision:** D168 — response-layer sentinel for this failure class. Scope defined, implementation deferred.

### 23 Apr commits

- `9094d75` — docs(incident): add ID004 content-fetch silent outage
- `7ccf5df` — docs(decisions): add D168 — response-layer sentinel
- `33efcb6` — docs(sync_state): 23 Apr mid-session — ID004 resolved, D168 scoped
- fix(cron): jobid 4 vault secret filter uppercase→lowercase (applied via `cron.alter_job`, not a migration file — live DB state only)

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else.** 24 Apr was a full day — morning housekeeping + A11b both halves + cron health monitoring shipped + live bug caught AND fixed. Four briefs committed, 9 DB migrations applied, 8 commits to main.

### Today's outcomes in one paragraph (24 Apr end-of-day)

Morning: orphan sweep clean, M8 Gate 4 PASSED, CFW "never wired" side-finding corrected. Mid-day: A11b CFW FULL STACK LOCKED (brand_profile + brand_identity_prompt + system_prompt + platform_rules + 6 content_type_prompt rows), A11b Invegent v0.1 LOCKED (brand_profile CREATED with dual-stream framing + system_prompt + platform_rules for LI+YT only), `chk_persona_type` constraint widened. Afternoon: Cron failure-rate monitoring Layer 1 LIVE (schema + refresh function + 15-min cron); first refresh caught a silent schema-drift bug in `public.check_token_expiry()`; bug fixed in the same session and verified end-to-end. Pipeline state unchanged operationally; all today's work is prompt-layer / DB-layer / documentation that doesn't touch the live hot path.

### Critical state awareness for next session

1. **A11b CLOSED.** CFW has full prompt stack; Invegent has v0.1 prompt stack.
2. **Cron health monitoring LIVE.** Check `m.cron_health_alert WHERE resolved_at IS NULL` at session start. Expect ~3-5 active alerts (token-expiry should have auto-resolved; 2 legitimate never-ran + up to 3 bootstrap transients depending on whether 26 Apr Sunday has passed).
3. **Token-expiry bug FIXED.** `public.check_token_expiry()` migration applied + manually verified. Alert will auto-resolve at 22:05 UTC when next cron fires. If alert is still active next session, investigate jobid 60 in `cron.job_run_details`.
4. **Router work R4/R6 — still Monday+ with fresh head.** Shadow infrastructure (D166, D167) untouched.
5. **`instagram-publisher-every-15m` (jobid 53) remains PAUSED.** Do not resume until router integration verifies.
6. **ID004 closed.** Content-fetch cron healthy.
7. **M8 Gate 4 CLOSED.** Zero duplicate canonicals post-merge.
8. **M12 still superseded** by router build per D166.
9. **2 CFW IG drafts in `needs_review`** from 24 Apr AM — decision TBD.
10. **Dashboard roadmap sync still pending** — covers 22 Apr + 24 Apr work. Low-risk content job.
11. **Reviewers still paused.** All four rows `is_active=false`.
12. **Pipeline clean.** 0 approved-but-unpublished FB drafts, 0 queue items, bundler M8 dedup active.

### Verification opportunity for next session

Read one fresh CFW draft produced with the new A11b stack (any draft created post-24 Apr 00:36 UTC). Compare voice, format, and platform-rule adherence to intent. If the draft feels off, tune specific fields in brand_profile or platform_rules.

---

## SESSION STARTUP PROTOCOL (UPDATED 24 APR)

1. Read this file (`docs/00_sync_state.md`) in full
2. **Orphan branch sweep:** query all 3 repos for non-main branches; flag orphans BEFORE new work
3. Check `c.external_reviewer` — confirm reviewers still paused
4. Check IG publisher cron state — jobid 53 `active=false`
5. Validate router shadow infrastructure: `SELECT * FROM t.platform_format_mix_default_check;` → 4 rows status='ok'
6. Check ID004 recovery: `f.canonical_content_body` pending-backlog drained; NDIS/Invegent producing digest_items
7. **NEW 24 Apr afternoon — Check active cron health alerts:**
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
12. **NEW 24 Apr mid-day — if a fresh CFW draft has been produced since 24 Apr 00:36 UTC,** compare voice/format/platform-rule adherence to intent

---

## DEV WORKFLOW RULE (ADOPTED 22 APR — D165 context)

**Default: direct-push to main.** Claude Code work ships straight to main. Vercel auto-deploys within ~60s.

**Deviate only when:**
- Multi-repo coordinated change where half-state would break production
- PK explicitly flags the work as risky

**Session-start orphan sweep is non-negotiable.**

---

## TODAY'S FULL RUN (22 APR)

*(22 Apr narrative preserved in prior commits. Summary: M5/M6/M7/M8/M9/M11 closed, privacy policy migration, D166/D167 router pivot. See commit `034ab9f0` for the detailed chronology.)*

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

**Pre-sales gate status:** 9 of 28 Section A items closed, 19 open. Router MVP work and cron monitoring are sprint-track, not A-items.

**Today's movement:**
- 24 Apr morning: orphan sweep, M8 Gate 4 PASS, CFW correction
- 24 Apr mid-day: **M1 / A11b CLOSED** (CFW full + Invegent v0.1)
- 24 Apr afternoon: **"Cron failure-rate monitoring" HIGH-priority sprint item CLOSED** (Layer 1 shipped) + token-expiry bug fixed in same afternoon

**Operational status:** Pipeline clean. Bundler M8 dedup active. FB queue enqueue M11 fix live. IG publishing paused until router integration. LI / YouTube / WordPress publishing unaffected. Router shadow infrastructure live but unconnected to hot path. **CFW full prompt stack locked; Invegent v0.1 locked; cron health monitoring watching 46 crons every 15 minutes; check_token_expiry function restored.**

---

## ALL CLIENTS — STATE (UPDATED 24 APR MID-DAY)

| Client | client_id | FB | IG | LI | YT | Schedule | Pending | Prompt stack | Notes |
|---|---|---|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ | ⏸ paused | ✅ | 🔲 | 6 rows | 0 | 12 content_type_prompt rows | 63 drafts dead as m8_m11_bloat |
| Property Pulse | 4036a6b5 | ✅ | ⏸ paused | ✅ | 🔲 | 6 rows + tier violation | 0 | 12 content_type_prompt rows | 44 drafts dead as m8_m11_bloat |
| Care For Welfare | 3eca32aa | ✅ | ⏸ paused | ⚠ mode=null | 🔲 | 21 rows | 2 IG drafts (older stack) | **✅ FULL STACK LOCKED 24 Apr** | 13 drafts dead; `c.client_digest_policy` missing (backlog) |
| Invegent | 93494a09 | ⏸ not configured | ⏸ not configured | ⚠ mode=null | ⚠ mode=null | 0 rows | 0 | **🟡 v0.1 LOCKED 24 Apr** | Publishing deferred; dual-stream content model; Stream B source type scoped |

All 4 FB tokens permanent (sentinel `2099-12-31` in `token_expires_at`).

---

## SPRINT MODE — THE BOARD (24 APR END-OF-DAY)

Source of truth: `docs/15_pre_post_sales_criteria.md` Section G.

### Quick wins (<1 hour each)

| # | Item | Status |
|---|---|---|
| Q1 | 13 failed ai_jobs SQL cleanup | ✅ CLOSED 21 Apr — D163 |
| Q2 | Discovery pipeline `config.feed_url` | ✅ CLOSED 22 Apr overnight |
| Q3 | A24 → closed in file 15 | ✅ CLOSED 21 Apr morning |
| Q4 | A7 privacy policy update | ✅ CLOSED 22 Apr |
| **Q5** | Fix `public.check_token_expiry()` schema drift | **✅ CLOSED 24 Apr afternoon** — caught by cron health Layer 1, fixed same session |

### Medium (1-3 hours)

| # | Item | Status |
|---|---|---|
| **M1** | A11b CFW + Invegent content prompts | **✅ CLOSED 24 Apr mid-day** |
| M2 | CFW schedule save bug | ✅ CLOSED 21 Apr |
| M3 | A14 RLS verification | 🟡 Audit complete; HS-1/HS-2 OAuth state signing remain |
| M4 | A18 — 7 source-less EFs | 🔲 Not yet picked |
| M5 | `getPublishSchedule` RPC hardening | ✅ CLOSED 22 Apr |
| M6 | Portal exec_sql eradication | ✅ CLOSED 22 Apr |
| M7 | Dashboard `feeds/create` exec_sql | ✅ CLOSED 22 Apr |
| M8 | Bundler draft multiplication | ✅ CLOSED 22 Apr — Gate 4 PASSED 24 Apr AM |
| M9 | Client-switch staleness | ✅ CLOSED 22 Apr |
| M11 | FB-vs-IG publish disparity | ✅ CLOSED 22 Apr |
| M12 | IG publisher filter + enqueue NOT EXISTS | 🟡 SUPERSEDED per D166 |
| **Cron failure-rate monitoring** | Layer 1 | **✅ CLOSED 24 Apr afternoon — `docs/briefs/2026-04-24-cron-health-monitoring-layer-1.md`** |

### Router build track (22 Apr per D166 + D167)

| # | Item | Status |
|---|---|---|
| R1 | `t.platform_format_mix_default` + 22 seed rows + validation view | ✅ CLOSED 22 Apr |
| R2 | `c.client_format_mix_override` | ✅ CLOSED 22 Apr |
| R3 | `m.build_weekly_demand_grid()` | ✅ CLOSED 22 Apr |
| R4 | D143 classifier spec | 🔲 Next sprint work |
| R5 | Matching layer design | 🔲 Depends on R4 |
| R6 | `m.seed_and_enqueue_ai_jobs_v1` rewrite | 🔲 HIGH RISK — hot path, Monday+ fresh head |
| R7 | ai-worker platform-awareness | 🔲 Depends on R6 |
| R8 | Cron changes | 🔲 Depends on R6 |

### Larger (half-day+)

| # | Item | Status |
|---|---|---|
| L1 | A1 + A5 + A8 — Pilot terms + KPI + AI disclosure | 🔲 PK draft |
| L2 | A3 + A4 — One-page proof doc | 🔲 |
| L3 | A16 — Clock A dashboard | 🔲 |
| L4 | A17 — Clock C seven items | 🔲 |
| L5 | A20 — Pipeline liveness monitoring | 🔲 D155 fallout; overlaps with cron health — could close partially |
| L6 | A21 — Trigger ON CONFLICT audit | 🔲 M11 is a live example of the class |
| L7 | A22 — ai-worker error surfacing | 🔲 |
| L8 | A23 — Live /debug_token cron | 🔲 D153 |
| L9 | A25 — Stage 2 bank reconciliation | 🔲 |
| L10 | A26 — Review discipline mechanism | 🔲 |

### HIGH priority items remaining

| # | Item | Why HIGH |
|---|---|---|
| **R6** | `seed_and_enqueue_ai_jobs_v1` rewrite (supersedes M12) | IG publisher paused until router integration verifies |
| **D168** | ID004-class sentinel (Layer 2 of cron monitoring) | HTTP-response health table + refresh + alerts; composes with the Layer 1 shipped today |

### Blocked / external

| # | Item | Status |
|---|---|---|
| A2 | Meta App Review | In Review; escalate 27 Apr if no movement |
| A6 | Unit economics (TBC subs) | Invoice check |

---

## WATCH LIST

### Due next session

- **Check `m.cron_health_alert WHERE resolved_at IS NULL`** as part of session startup protocol — NEW
- **Verify token-expiry-alert-daily auto-resolved** (cron should have fired at 22:05 UTC; alert condition clears on first successful run)
- **Fresh CFW draft review** — read first draft produced with new A11b stack; compare to intent
- **Dashboard roadmap sync** — covers 22 Apr closures + 24 Apr A11b + 24 Apr cron health. Low-risk content job in `app/(dashboard)/roadmap/page.tsx`.

### Due week of 22-27 Apr

- **Mon 27 Apr** — Meta App Review escalation trigger if no movement
- **Sat 2 May** — original reviewer calibration cycle trigger (defer until reviewers resume)

### Backlog (open, not yet addressed)

**New 24 Apr afternoon:**
- **Cron health dashboard tile** — `/monitoring/cron-health` route on invegent-dashboard. ~2-3h when warranted.
- **Cron health v3.1 — schedule-string parsing** — eliminates bootstrap false positives for crons with only 1 historical run. ~1h enhancement.
- **Notification layer for `m.cron_health_alert`** — weekly digest or Telegram push. Deferred until volume warrants.
- **Document `expires_at` sentinel** — `2099-12-31` (not epoch 0) is actual convention. Update docs next time they're touched.

**New 24 Apr mid-day:**
- Avatar configuration for Invegent (HeyGen)
- Stream B source type implementation — scope brief at `docs/briefs/2026-04-24-invegent-work-journal-source-type.md`
- Invegent publishing activation checklist
- v0.2 positioning review for Invegent (2-3 months)
- CFW promo_v1 + YouTube content_type_prompt rows

**Carried from 24 Apr AM:**
- CFW `c.client_digest_policy` row missing
- 2 CFW IG drafts in `needs_review` (older prompt stack) — `2d8204ac...` and `fdb1ff8a...`
- Stale non-main branches (8 total, cosmetic cleanup via GitHub UI)

**Carried from earlier:**
- **D168** — ID004-class response-layer sentinel (HIGH priority, composes with Layer 1 shipped today)
- Publisher schedule source audit
- `m.post_publish_queue.status` has NO CHECK constraint — D163 continuation
- TPM saturation on concurrent platform rewrites
- `docs/archive` 5th-file mystery
- Per-commit external-reviewer pollution (before reviewers resume)
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
- THIS COMMIT — docs(sync_state): token-expiry bug fix + end-of-day close

**Migrations (DB-only, 24 Apr — 9 total):**
- `cfw_lock_brand_profile_and_platform_rules_20260424`
- `cfw_align_system_prompt_with_brand_and_platform_rules_20260424`
- `cfw_seed_content_type_prompts_rewrite_and_synth_20260424`
- `invegent_create_brand_profile_v01_and_refactor_ai_profile_20260424_v2`
- `widen_chk_persona_type_add_hybrid_values_20260424`
- `cron_health_monitoring_layer_1_schema_and_refresh_20260424`
- `cron_health_schedule_aware_no_run_threshold_20260424`
- `cron_health_lower_cadence_sample_size_min_20260424`
- `fix_check_token_expiry_schema_drift_20260424`

*(invegent-dashboard / invegent-portal / invegent-web: no 24 Apr commits)*

---

## CLOSING NOTE FOR NEXT SESSION

24 Apr was a full productive day. Morning: 3 housekeeping items. Mid-day: A11b both halves + 3 briefs + 1 constraint widening. Afternoon: cron failure-rate monitoring Layer 1 shipped to production + 1 live bug caught AND fixed + 1 brief + 2 sync_state updates. Total today: **8 commits on Invegent-content-engine, 9 DB migrations applied, 4 briefs committed, 3 HIGH/MEDIUM-priority sprint items closed (M1 A11b, Cron monitoring, Q5 check_token_expiry fix).**

**Closed HIGH-priority sprint items today:** M1 (A11b content prompts) + "Cron failure-rate monitoring." Remaining HIGH: R6 (seed_and_enqueue router rewrite — Monday+ fresh-head work) and D168 (ID004-class sentinel — composes with Layer 1).

**Pipeline state UNCHANGED operationally** from 22 Apr evening close. All 24 Apr work is prompt-layer / DB-layer / documentation that doesn't touch the live hot path. Router infrastructure still shadow-only. IG publisher still paused per D165.

Next CFW digest_item (typically within 1-24 hours) will be drafted with the new A11b stack — that's the first verification signal. The token-expiry-alert-daily auto-resolution at 22:05 UTC tonight is the second verification signal — confirms the fix and confirms the monitor's resolve-lifecycle works end-to-end.

**Session startup protocol now includes:**
1. Orphan branch sweep
2. Router shadow infrastructure validation
3. **NEW — cron health alert check** (`m.cron_health_alert WHERE resolved_at IS NULL`)

**Realistic next working windows:**
- 25 Apr Saturday: dead day or R4 classifier spec (low-risk writing)
- 27 Apr Monday: Meta App Review escalation day + R5/R6 router work with fresh head
- Whenever convenient: dashboard roadmap sync (20-30 min) + D168 Layer 2 design (30-60 min spec)

**Calibration reminder:** side-findings get the same verification rigour as main findings. The CFW "never wired" claim from 23 Apr sat in sync_state for 14+ hours before 24 Apr's anomaly surfaced it. Structured verification beats speed.

**A11b + cron health + bug fix lessons:**
1. Client source data is gold — the CFW `ICE_Analysis` folder (3,262 pages) shaped the entire brand_profile; Invegent had no equivalent and that's why v0.1 is deliberately loose
2. Pre-existing prompt fields can silently contradict each other (CFW brand_identity_prompt vs system_prompt)
3. Check constraints can bite mid-migration — widen rather than leave placeholders
4. v0.1-with-loose-positioning beats waiting for perfect clarity when tight voice+compliance+format rules are locked
5. Ship monitoring systems even when imperfect — the first refresh found a bug that had been silent for 8+ days; that alone justified the 1.5h cost
6. Tune thresholds against real data fast — v1 → v2 → v3 same session was cheaper than over-designing upfront
7. Close the loop the same session — monitor caught bug, bug fixed, verification ran, backlog item closed. Full cycle in one afternoon.
