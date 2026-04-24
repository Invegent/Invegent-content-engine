# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-24/25 — **Invegent v0.1 prompt stack SHIPPED (6/6 for configured platforms)** + CC-TASK-02 audit closed with 1 HIGH finding
> Written by: PK + Claude session sync

---

## 🟢 24 APR EVENING (INVEGENT v0.1 PROMPT STACK) — LI + YT SHIPPED

### In one paragraph

Invegent 0/12 gap (surfaced in Track B, parked as standalone follow-up) closed during the window CC-TASK-02 was running. Scope decision: Invegent's `c.client_ai_profile.platform_rules.global.not_configured_platforms = ['facebook', 'instagram', 'twitter_x']` explicitly marks FB + IG as unconfigured in v0.1. Forcing prompt rows for unconfigured platforms would create drift — exactly the opposite of v0.1 honesty posture. So Invegent landed at **6/6 for configured platforms** (LinkedIn + YouTube × rewrite_v1/synth_bundle_v1/promo_v1), not 12/12. Voice anchored to the mid-day profile lock: first-person PK, builder-in-public register, peer-level assumed, honest about mistakes, no LinkedIn-hook openings, zero emojis on LinkedIn (per platform_rules), 5-8 hashtags on YouTube description-only. Both migration guards passed: (1) exactly 6 active rows for Invegent, (2) zero FB/IG contamination. Promo prompts explicitly reframed away from launch-video tropes — Invegent v0.1 has nothing to sell yet, so "promo" means build-log milestones, decision announcements, public-commits. YouTube avatar format disabled across all 6 Invegent prompts (HeyGen not yet configured); kinetic + kinetic_voice are the default video formats until that lands.

### Coverage matrix (final, post Invegent v0.1)

| Client | FB rewr/synth/promo | IG rewr/synth/promo | LI rewr/synth/promo | YT rewr/synth/promo | Total | Scope |
|---|---|---|---|---|---|---|
| NDIS-Yarns | 1 / 1 / 1 | 1 / 1 / 1 | 1 / 1 / 1 | 1 / 1 / 1 | 12/12 | all 4 platforms |
| Property Pulse | 1 / 1 / 1 | 1 / 1 / 1 | 1 / 1 / 1 | 1 / 1 / 1 | 12/12 | all 4 platforms |
| Care For Welfare | 1 / 1 / 1 | 1 / 1 / 1 | 1 / 1 / 1 | 1 / 1 / 1 | 12/12 | all 4 platforms |
| **Invegent** | **0 / 0 / 0** | **0 / 0 / 0** | **1 / 1 / 1** | **1 / 1 / 1** | **6/6** | **LI + YT only (v0.1 config)** |

Invegent's 6/6 is **honest coverage** — FB/IG rows would imply platform_rules that don't exist. If FB or IG get activated in a future Invegent positioning bump (v0.2 at earliest), prompt rows land at that time paired with platform_rules additions.

### Invegent voice + scope (captured for next session cross-checks)

Mirrors `docs/briefs/2026-04-24-invegent-brand-profile-v0.1.md`:

- **Voice:** first-person PK ("I...", "my build...", "what I've found..."). NOT practice voice (that's CFW's pattern).
- **Register:** builder-in-public. Honest about mistakes as core positioning. Knowledgeable-friend tone. Short sentences. Active voice.
- **Audience:** fellow builders, regulated-industry operators, AI-curious professionals.
- **Forbidden:**
  - LinkedIn-hook openings ("Here's why...", "3 things I learned...", "The truth about...")
  - AI hype vocabulary (revolutionary, game-changer, 10x)
  - Growth-bait framing
  - Not-yet-happened outcome claims
  - Self-promotional Invegent/ICE references outside genuine context
  - Client / participant / employee identifying details from practice or property businesses
  - Specific financial or legal advice
  - AHPRA-violating OT claims (critical cross-contamination guard given PK also writes for CFW)
- **Required:**
  - Admit limitations ("I haven't tested this at scale yet", "this is v0.1", "still figuring out...")
  - End with genuine questions, not generic CTAs
  - Connect to real operator experience where it applies
- **Platform specifics:**
  - LinkedIn: 200-500 words, ZERO emojis, 3-6 hashtags from allowed_examples
  - YouTube: title 5-12 words (concrete not clickbait), description 80-200 words, narration 60-150 words, 5-8 hashtags in description only, max 2 emojis in description, zero in title
- **Hashtag whitelist (shared LI + YT):** BuildingInPublic, AIForOperations, AppliedAI, AICraft, RegulatedAI, ContentEngineering, SignalCentric, NDIS, PropertyInvestingAU, CPAandAI, IndieBuilder, SoloBuilder
- **Hashtag forbidden:** AIRevolution, AIHustle, ChatGPTTips, AIMillionaire, FutureOfWork, 10xWithAI, AIHack
- **Avatar policy:** not yet configured for Invegent. `video_short_avatar` intentionally omitted from Invegent format selection rules until HeyGen is wired.

### Invegent promo_v1 reframing (worth noting)

Traditional promo_v1 prompts for NY/PP/CFW assume a product/service to promote (open caseload spots, new service region, event invite). Invegent has no product yet. Invegent's promo prompts therefore target:

- **Build-log milestones** — "shipped X this week"
- **Decision announcements** — "switched from Y to Z because of trade-off T"
- **Public commits** — "going to ship W by date D, holding myself accountable"
- **Work-journal entries** — "here's what I wrestled with this week"

Launch-video tropes ("today I'm excited to announce...") are explicit-negative in the Invegent YouTube promo prompt.

### Migration

- `invegent_content_type_prompt_v0_1_li_yt_20260424` — 6 rows atomic; two DO-block guards (exactly 6 rows, zero FB/IG contamination).

### Verification query

```sql
SELECT platform, job_type, version, is_active, LENGTH(task_prompt) AS prompt_len
FROM c.content_type_prompt ctp
JOIN c.client c USING (client_id)
WHERE c.client_name = 'Invegent' AND is_active = TRUE
ORDER BY platform, job_type;
```

Expected: 6 rows — LI+YT × rewrite_v1/synth_bundle_v1/promo_v1, version=1, is_active=TRUE, prompt_len 900-3200 chars per row.

### Commits (this block)

- `invegent_content_type_prompt_v0_1_li_yt_20260424` (migration)
- THIS COMMIT — docs(sync_state): Invegent v0.1 prompt stack closure

### Backlog impact

Removes from backlog:
- ~~Invegent content_type_prompt rows (0/12) — needs v0.1 prompt stack~~ ✅ CLOSED for configured scope

Stays in backlog:
- Invegent FB + IG activation (requires v0.2 positioning + platform_rules additions first)
- Invegent publishing activation checklist (separate workstream)
- Avatar configuration for Invegent (HeyGen) — blocks Invegent YT avatar format unlock

---

## 🟢 25 APR — CC-TASK-02 CLOSED (EF `.upsert()` AUDIT — 1 HIGH FINDING)

### In one paragraph

Claude Code closed CC-TASK-02 with a targeted brief at `docs/briefs/2026-04-25-ef-upsert-audit.md` (commit `23ed4c1`). Audit found **1 HIGH-severity latent bug** in `feed-intelligence` Edge Function: the upsert into `m.agent_recommendations` uses `ON CONFLICT (source_id, recommendation_type)` but the actual unique constraint is a PARTIAL index `uq_agent_rec_pending ON (source_id, recommendation_type) WHERE status = 'pending'`. Postgres cannot infer a partial index from `ON CONFLICT` without also echoing the WHERE predicate — verified live via EXPLAIN returning error code 42P10. Currently DORMANT because `m.agent_recommendations` has zero rows today (feed-intelligence has not yet produced a real recommendation — waiting on weekly scheduler enable). Fires the first time a real recommendation is written. Silent-failure class (error surfaces in EF response body, not via cron status — Layer 1 monitoring would NOT catch this; Layer 2 spec'd today WOULD catch this as "no recommendations landed in 14 days despite cron running"). Same family as M11, A21 Finding 1, ID004. Also found 1 LOW finding (benign; non-partial upsert pattern elsewhere with matching full unique index). Zero MEDIUM.

### Fix options (PK to choose)

**Option A — Replace partial unique index with full UNIQUE on `(source_id, recommendation_type)`.**
Pros: ON CONFLICT inference works without code change; simplest resolution.
Cons: Changes semantics — two rows with same (source_id, recommendation_type) can't coexist regardless of status. Today's use case only has pending rows, but future states (accepted, rejected, superseded) would conflict. Blocks a natural "revive this recommendation with new status" workflow.

**Option B — Wrap in SECURITY DEFINER RPC that echoes the WHERE predicate.**
Pros: Preserves partial index semantics. RPC enforces correct ON CONFLICT WHERE clause. EF calls RPC rather than raw upsert.
Cons: One more layer. Slight indirection. Requires the RPC to keep the predicate in sync if index predicate ever changes.

**Option C (not recommended) — Echo the WHERE predicate in EF TypeScript code.**
The `.upsert()` method in supabase-js does not accept a WHERE clause argument for ON CONFLICT. Would require dropping to raw SQL via RPC — which IS Option B.

Recommendation: **Option B.** Same pattern as `public.upsert_publish_profile()` — partial-index-aware upserts routed through SECURITY DEFINER RPCs. Consistent with PK principle on dynamic structure (RPC knows the predicate; EF doesn't need to).

### CC-TASK-02 brief

Full methodology + per-upsert finding breakdown: `docs/briefs/2026-04-25-ef-upsert-audit.md`.

### Cross-audit correlation

This finding is a DIFFERENT bug class than A21 (same morning). A21 caught `ON CONFLICT ON CONSTRAINT name-that-doesnt-exist` patterns — syntactic drift between function body + actual constraint name. CC-TASK-02 caught `ON CONFLICT (columns)` with partial-index semantic mismatch — constraint exists, but inference rules don't allow it. Complementary coverage. Both classes need periodic re-audit as schema evolves.

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

### R4 Step 3 readiness

Blocker for R4 implementation: PK reviews v1 rule set (spec `docs/briefs/2026-04-24-r4-d143-classifier-spec.md`) and confirms:
1. Priority order reasonable (timely_breaking > stat_heavy > multi_point > human_story > educational_evergreen > analytical)
2. Rule vocabulary (9 rule_types) covers the cases
3. Fallback semantics: analytical class with rule_groups but lowest priority → "everything that didn't match" lands here

Once confirmed, Step 3 = classifier function + sweep + cron. Implementation ~1.5-2h; backfill ~12h at 100/5min for 14k canonicals.

### R5 key open questions

From `docs/briefs/2026-04-24-r5-matching-layer-spec.md`: weightings, threshold, matrix scope, dedup, overrides, campaigns, tuning cadence (7 total).

### D168 Layer 2 key open questions

From `docs/briefs/2026-04-24-d168-layer-2-response-sentinel-spec.md`: check shape, thresholds, cadence, dedup, retention, dashboard, notifications (7 total). Not HIGH priority.

---

## 🟢 24 APR EVENING UPDATE — ROUTER CATALOG UNIFICATION SHIPPED

### In one paragraph

PK pushed back on the R4 classifier v1 spec being hardcoded, which triggered a comprehensive audit of the entire router track (`docs/briefs/2026-04-24-router-hardcoded-values-audit.md` — 9 findings, 3 severity tiers). Answering "what else have we hardcoded?" uncovered two existing taxonomy tables (`t.5.0_social_platform` with 14 platforms from Dec 2025, `t.5.3_content_format` with 22 formats from Mar 2026) that we'd been parallelising in CHECK constraints across the codebase. Near-catastrophic: I was about to build `t.platform_catalog` + `t.format_catalog` — the exact parallel-structure anti-pattern the audit was about. PK's "what else is hardcoded?" saved the duplication. Pivoted to extending existing taxonomies: added `is_router_target` + `content_pipeline` columns to `t.5.0_social_platform`, seeded 3 new platform rows (blog/newsletter/website for pre-existing in-use values), dropped 7 hardcoded CHECK constraints, added **29 FKs** pointing at the taxonomy tables. Validation view tolerance fixed. CFW + Invegent both backfilled with explicit `c.client_digest_policy` rows. Duplicate UNIQUE index cleaned. **Bonus find:** `k.refresh_column_registry` had a latent bug (fk CTE produced dupe rows when any column has 2+ FKs, breaking the event trigger on every DDL firing); fixed with `DISTINCT ON` + deterministic `ORDER BY`. Migration attempts: 4 (two data-validation failures, one pre-existing-FK collision, one successful cleanup). Brief: `docs/briefs/2026-04-24-router-catalog-unification-shipped.md` (`ac06043`).

### Findings status

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

## 🟢 24 APR LATE-AFTERNOON UPDATE — A21 ON CONFLICT AUDIT CLOSED

A21 closed. Swept 25 `ON CONFLICT` clauses across 21 SQL functions. Found 1 dormant M11-class sister bug (`m.seed_ndis_bundles_to_ai_v1` + `m.seed_property_bundles_to_ai_v1` referencing non-existent constraint — dropped), 1 latent architectural inconsistency in cron 48 (flagged for R6), 7 redundant unique indexes/constraints (cleaned). Brief: `docs/briefs/2026-04-24-a21-on-conflict-audit.md` (`20d7f6d`).

---

## 🟢 24 APR AFTERNOON UPDATE — CRON HEALTH MONITORING LAYER 1 LIVE

Layer 1 cron failure-rate monitoring shipped. Watches `cron.job_run_details` every 15 min. Three alert types: `failure_rate_high`, `consecutive_failures`, `no_recent_runs`. First refresh caught live token-expiry-alert-daily schema drift — fixed same session.

---

## 🟢 24 APR MID-DAY UPDATE — A11b CLOSED

CFW + Invegent v0.1 content prompts locked. `chk_persona_type` widened. Six `c.content_type_prompt` rows for CFW (rewrite/synth × FB/IG/LI). Invegent v0.1 referred to `brand_profile` + `platform_rules` — NOT content_type_prompt (that gap surfaced in Track B evening, resolved 24 Apr evening per Invegent v0.1 prompt stack section above).

---

## 🟢 24 APR SESSION-START UPDATE — MORNING HOUSEKEEPING

Orphan branch sweep clean, M8 Gate 4 PASSED, CFW correction (26 client_source rows / 2 client_content_scope rows).

---

## ⚠️ FIRST THING NEXT SESSION

**Read this entire file before doing anything else.** 24 Apr was the highest-output session on record. Morning housekeeping + A11b both halves + cron health monitoring Layer 1 + token-expiry bug fix + A21 ON CONFLICT audit + router hardcoded-values audit (9 findings) + router catalog unification shipped (5 findings closed) + k.refresh_column_registry robustness fix + **Track B: R4 catalog tables + R5 spec + D168 spec + CFW parity fill** + **Invegent v0.1 prompt stack** + **CC-TASK-01 dashboard roadmap sync + CC-TASK-02 EF .upsert() audit with 1 HIGH finding**.

### Today's full session tally

- **19 commits** on Invegent-content-engine (through Invegent v0.1 close)
- **20 DB migrations** applied
- **12 briefs** committed (including 3 Claude Code task briefs + 1 CC-TASK-02 findings brief)
- **6 sprint items closed** (M1 A11b, Cron monitoring Layer 1, Q5 check_token_expiry, L6/A21 ON CONFLICT, evening router catalog unification, CC-TASK-02 EF upsert audit)
- **2 Claude Code tasks closed** (CC-TASK-01 dashboard roadmap sync shipped; CC-TASK-02 audit with HIGH-priority fix queued)
- **Invegent v0.1 prompt stack SHIPPED** (6/6 for LI + YT configured scope)
- **CFW content_type_prompt at 12/12 parity** (was 6/12)
- **R4 schema + seed landed** (6 classes, 20 rules, 3 new columns on f.canonical_content_body) — function still pending PK review
- **1 live production bug caught and fixed same session** (token-expiry)
- **2 orphaned v1 seed functions removed** (M11-class dormant bug dead-code)
- **1 latent infrastructure bug fixed** (k.refresh_column_registry multi-FK dupe)
- **10 audit findings produced + 6 closed** (9 router + 1 CC-TASK-02 HIGH + 1 CC-TASK-02 LOW)

### Critical state awareness for next session

1. **A11b CLOSED.** CFW + Invegent v0.1 prompt stacks locked.
2. **Cron health monitoring LIVE.** Check `m.cron_health_alert WHERE resolved_at IS NULL` at session start.
3. **Token-expiry bug FIXED.**
4. **A21 CLOSED (DB layer). CC-TASK-02 CLOSED (EF layer) with 1 HIGH-priority fix pending PK decision** (Option A vs B — recommended B).
5. **ROUTER CATALOG UNIFIED.**
6. **`k.refresh_column_registry` fixed.**
7. **R4 TABLES + SEED LIVE** (Track B). Step 3 gated on PK review.
8. **R5 matching layer spec ready.** 7 open Qs.
9. **D168 Layer 2 spec ready.** 7 open Qs. Not HIGH priority.
10. **CFW at 12/12 parity. Invegent at 6/6 for configured platforms** (LI + YT — correct v0.1 scope, NOT a gap).
11. **R6 prep clearer:** Finding 6 = 1-line change; Findings 1+4 bundle. Total R6 remaining: ~3-4h after R4+R5 review.
12. **`instagram-publisher-every-15m` (jobid 53) remains PAUSED.**
13. **ID004 closed.**
14. **M8 Gate 4 CLOSED.**
15. **M12 still superseded per D166.**
16. **2 CFW IG drafts in `needs_review`** from AM — decision TBD.
17. **Dashboard roadmap sync SHIPPED** (CC-TASK-01 closed 25 Apr morning, commit `59bfe66` on invegent-dashboard).
18. **Reviewers still paused.**
19. **Pipeline clean.**

### Router state — snapshot

- ✅ R1: `t.platform_format_mix_default` + 22 seed rows
- ✅ R2: `c.client_format_mix_override`
- ✅ R3: `m.build_weekly_demand_grid()`
- ✅ R4 schema + seed: 6 classes, 20 rules, f.canonical_content_body extended — **LIVE**
- 🟡 R4 function: spec ready, gated on PK review
- 🟡 R5: spec ready, 7 open questions
- 🔲 R6: seed_and_enqueue rewrite — ~3-4h, depends on R4+R5
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
8. Validate R4 seed: `COUNT(*) FROM t.content_class WHERE is_current=TRUE` = 6; rules = 20
9. **Validate coverage matrix:** CFW 12/12; NY 12/12; PP 12/12; **Invegent 6/6 (LI+YT only — correct per v0.1)**
10. Check ID004 recovery
11. Check active cron health alerts
12. Check file 15 Section G — pick next sprint item
13. Check `m.external_review_queue`
14. Read `docs/06_decisions.md` D156–D168
15. Query `k.vw_table_summary` before any table work

---

## DEV WORKFLOW RULE (D165)

**Default: direct-push to main.** Deviate only for multi-repo coordinated risk or PK-flagged risk. Session-start orphan sweep non-negotiable.

---

## EXTERNAL REVIEWER LAYER (UNCHANGED)

All four reviewers still paused. Re-enable ceremony at ~18-19 of 28 Section A items closed.

---

## CURRENT PHASE

**Phase 1 — COMPLETE.** **Phase 3 — Expand + Personal Brand** active.

Pre-sales gate: 10 of 28 Section A items closed (L6/A21 + A11b count this session; Track B R4 schema+seed + CC-TASK-02 closure + Invegent v0.1 stack are partial progress on other items).

Today's movement:
- Morning: orphan sweep, M8 Gate 4 PASS, CFW correction
- Mid-day: M1 / A11b CLOSED
- Afternoon: Cron monitoring + Q5 CLOSED
- Late afternoon: A21 / L6 CLOSED
- Evening: Router catalog unification SHIPPED
- Evening Track B: R4 schema+seed LIVE, R5 spec, D168 spec, CFW 12/12
- Evening Invegent: v0.1 LI+YT prompt stack SHIPPED (6/6 configured scope)
- 25 Apr morning: CC-TASK-01 dashboard roadmap sync; CC-TASK-02 EF upsert audit (1 HIGH)

---

## ALL CLIENTS — STATE

| Client | client_id | FB | IG | LI | YT | Schedule | Digest policy | Prompt stack | Notes |
|---|---|---|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | ✅ | ⏸ | ✅ | 🔲 | 6 rows | ✅ lenient | 12/12 | 63 dead m8_m11_bloat |
| Property Pulse | 4036a6b5 | ✅ | ⏸ | ✅ | 🔲 | 6+tier | ✅ lenient | 12/12 | 44 dead |
| Care For Welfare | 3eca32aa-e460 | ✅ | ⏸ | ⚠ | 🔲 | 21 rows | ✅ strict | 12/12 | 2 IG drafts pending |
| Invegent | 93494a09 | not configured | not configured | ⚠ | ⚠ | 0 rows | ✅ strict | **6/6 v0.1 (LI+YT configured)** | Publishing deferred; FB+IG blocked on v0.2 positioning |

All 4 FB tokens permanent. All 4 clients have explicit `c.client_digest_policy` rows. Prompt stack coverage now consistent with each client's configured scope.

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
| **Invegent v0.1 content_type_prompt stack** | **LI+YT configured scope** | **✅** |
| **CC-TASK-02 EF upsert audit** | **1 HIGH finding identified** | **✅ (audit) — fix TBD** |

### Router track

| # | Item | Status |
|---|---|---|
| R1 | mix_default + seed | ✅ |
| R2 | client override | ✅ |
| R3 | demand grid function | ✅ |
| Catalog unification | platform + format taxonomies extended + FKs | ✅ |
| R4 tables + seed | 6 classes, 20 rules, f.canonical_content_body extended | ✅ |
| R4 function + sweep + cron | gated on PK review | 🟡 |
| R5 spec | fitness matrix + matching algorithm | ✅ |
| R5 impl | depends on R4 function | 🔲 ~2-3h |
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
| **R4 Step 3** | classifier function + sweep + cron | Unblocks R5 + backfill of 14k canonicals |
| **R6** | seed_and_enqueue rewrite (Findings 1+4+6 bundled) | IG publisher paused until router verifies |
| **CC-TASK-02 fix** | Fix `feed-intelligence` upsert into `m.agent_recommendations`. Option A (replace partial index with full UNIQUE) vs Option B (SECURITY DEFINER RPC echoing WHERE predicate). **Recommended: B** — same pattern as `public.upsert_publish_profile()`. PK chooses. Brief: `docs/briefs/2026-04-25-ef-upsert-audit.md`. | Dormant today (zero rows in target). Fires on first real recommendation. Silent-failure class (same family as M11 + A21 Finding 1 + ID004) — Layer 1 monitoring wouldn't catch it. |

**Not HIGH (defence-in-depth):**
- **D168 Layer 2 implementation** — spec ready; implementation triggered by next ID004-class incident OR cron fleet >60 OR SLA risk from external clients.

---

## WATCH LIST

### Due next session

- Check `m.cron_health_alert WHERE resolved_at IS NULL`
- Validate router catalogs + event trigger (startup steps 6-7)
- Validate R4 seed state + 4-client matrix (startup steps 8-9)
- Fresh CFW draft review
- PK review of R4 v1 seed rules before Step 3 ships
- PK review of R5 + D168 specs (14 open questions total)
- PK choose CC-TASK-02 fix: Option A vs B
- CC-TASK-03 (frontend format vocab audit) — whenever PK runs it

### Due week of 22-27 Apr

- **Mon 27 Apr** — Meta App Review escalation trigger
- **Sat 2 May** — original reviewer calibration cycle trigger (defer)

### Backlog (open)

**New 25 Apr (from CC-TASK-02):**
- **CC-TASK-02 HIGH fix** — see Sprint Board HIGH priority section

**24 Apr Invegent close:**
- **Invegent FB + IG activation** (requires v0.2 positioning + platform_rules additions first)
- Avatar configuration for Invegent (HeyGen) — blocks YT avatar format unlock

**24 Apr Track B (open):**
- **R4 Step 3 implementation** — ~1.5-2h after PK review
- **R5 implementation** — ~2-3h after R4 backfill produces clean distribution
- **D168 Layer 2 implementation** — ~2-3h, deferred until defence-in-depth trigger

**24 Apr router-catalog:**
- R6 bundled work (Findings 1+4+6)
- Format vocab dashboard/portal audit — CC-TASK-03 pending
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

**Invegent-content-engine (main) — 19 commits:**

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
- `59bfe66` (dashboard) — docs(roadmap): 22 + 24 Apr closures synced (CC-TASK-01)
- `be6082e` — docs(sync_state): CC-TASK-01 CLOSED line
- `23ed4c1` — docs(briefs): EF .upsert() audit — CC-TASK-02 CLOSED (1 HIGH / 0 MED / 1 LOW)
- THIS COMMIT — docs(sync_state): Invegent v0.1 prompt stack closure + CC-TASK-02 integration

**Migrations (DB-only, 20 total):**

Mid-day (5) + Afternoon (4) + Late afternoon (3) + Evening router-catalog (5) + Track B (2):
- `r4_d143_classifier_catalog_tables_and_seed_v1_20260424`
- `cfw_content_type_prompt_youtube_and_promo_v1_20260424`

Invegent v0.1 close (1):
- `invegent_content_type_prompt_v0_1_li_yt_20260424` — Invegent 6-row v0.1 stack (LI + YT × rewrite/synth/promo), FB+IG intentionally skipped per not_configured_platforms

**invegent-dashboard (main):**
- `59bfe66` — docs(roadmap): sync 22 + 24 Apr (CC-TASK-01)

*(invegent-portal / invegent-web: no 24-25 Apr commits)*

---

## CLOSING NOTE FOR NEXT SESSION

24 Apr remains the highest-output session on record.

**Final tally (post Invegent v0.1 + CC-TASK-02):**
- **19 commits** on Invegent-content-engine
- **20 DB migrations** applied
- **12 briefs** committed (3 CC task briefs + 1 CC-TASK-02 findings brief)
- **6 sprint items closed**
- **2 Claude Code tasks closed** (CC-TASK-01 dashboard sync + CC-TASK-02 audit)
- **Invegent v0.1 prompt stack SHIPPED** (6/6 configured scope)
- **CFW at full prompt parity** (6→12 rows)
- **R4 schema + seed LIVE**
- **1 live production bug caught and fixed same session**
- **2 orphaned v1 seed functions removed**
- **1 latent infrastructure bug fixed** (k.refresh_column_registry)
- **10 audit findings produced, 6 closed** (1 HIGH remaining — CC-TASK-02 fix)

**Pipeline state UNCHANGED operationally** from 22 Apr evening close. All 24-25 Apr work is prompt-layer / DB-layer / documentation that doesn't touch the live hot path. Router infrastructure still shadow-only. IG publisher still paused per D165. CC-TASK-02 HIGH-priority fix is dormant (zero rows today) — fires on first real recommendation, date unknown.

**Remaining HIGH-priority sprint items:**
- **R4 Step 3** (classifier function + sweep + cron — gated on PK review)
- **R6** (seed_and_enqueue router rewrite — Findings 1+4+6 bundled, ~3-4h)
- **CC-TASK-02 fix** (PK chooses Option A or B — recommended B)

**Not HIGH (defence-in-depth, deferred):**
- **D168 Layer 2 implementation** (spec ready)
- **R5 implementation** (spec ready, depends on R4 function output)

**PK weekend review queue (4 items):**
- R4 v1 seed rules (6 classes, 20 rules)
- R5 spec 7 open questions
- D168 spec 7 open questions
- CC-TASK-02 fix: Option A vs B

**Realistic next working windows:**
- 25 Apr Saturday: dead day or low-risk / PK spec review / CC-TASK-03
- 27 Apr Monday: Meta App Review escalation + R4 Step 3 + R5 impl + CC-TASK-02 fix
- Whenever: CC-TASK-03 (frontend vocab audit)

**Lessons captured today (15 total):**

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
14. Parallel tracks multiply session output (Track B + CC tasks + Invegent v0.1 ran concurrently with zero merge conflicts)
15. **Configured scope beats forced parity.** Invegent 6/6 for LI+YT is correct; 12/12 including FB+IG would create prompt drift against platform_rules that don't exist. Scope honesty > matrix symmetry. Applies to any future client added with partial platform activation.
