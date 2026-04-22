# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D100 — See earlier commits

## D101–D125 — See 16 Apr 2026 commits

## D126–D141 — See 17 Apr 2026 commits (pipeline analysis, synthesis decision, demand-aware seeding direction). **D141 sequencing recommendation reversed by D166 — see below.**

## D142–D146 — See 17 Apr 2026 evening commits (demand-aware seeder, classifier, router, benchmark, feed score — all but D142 gated on 60d data). **D144 MVP shadow infrastructure shipped via D167. D145 research portion shipped via D167.**

## D147–D151 — See 18 Apr 2026 afternoon commit (pilot structure, buyer-risk form, advisor layer, session-close SOP, table-purpose rule)

## D152–D155 — See 18 Apr 2026 evening commit (seeder client_id fix, token-health live direction, native LinkedIn flow, ON CONFLICT root-cause fix)

## D156–D162 — See 21 Apr 2026 commits (external reviewer layer shipped + paused, cost guardrails architecture, reviewer implementation details)

---

## D163 — Phase 1.7 Dead Letter Queue Foundation: `m.ai_job` Only, Scoped by Inspection
**Date:** 21 April 2026 evening | **Status:** ✅ IMPLEMENTED (migration `phase_1_7_ai_job_add_dead_status` + Q1 data cleanup applied same session)

### The problem this decides

Sprint item Q1 required updating 13 failed ai_jobs from the ID003 window to a terminal "dead" state so they stopped being flagged by `system_auditor`. The pre-approved SQL in sync_state was `UPDATE m.ai_job SET status='dead', dead_reason='id003_cleanup_2026-04-21' WHERE status='failed' AND created_at < '2026-04-15'`. On execution, two errors surfaced:

1. The `m.ai_job.status` CHECK constraint rejected `'dead'`. The allowed set was `{queued, running, succeeded, failed, cancelled}`. The pre-approved UPDATE was untested.
2. The date cutoff `< 2026-04-15` missed all the target rows — the failures were from 18 Apr within the ID003 window (15–19 Apr), not before it.

This surfaced a broader question: `docs/04_phases.md` Phase 1.7 (Dead Letter Queue) prescribes adding `status='dead'` across four pipeline tables — `m.ai_job`, `m.post_draft`, `m.post_publish_queue`, `f.canonical_content_body`. Should Q1 be handled as an isolated one-off CHECK widen, or should the full Phase 1.7 foundation sweep happen today?

### The decision

**Scope today: `m.ai_job` only.** Widen its CHECK constraint to include `'dead'`. Run the cleanup UPDATE on the 13 rows with a corrected `dead_reason`. Defer the other three tables to a dedicated Phase 1.7 sprint session, with explicit handling for each.

### What inspection found that changed the framing

Before committing to a four-table sweep, a 5-minute inspection of all four current CHECK constraints revealed that the `04_phases.md` Phase 1.7 spec doesn't match current reality uniformly:

| Table | Column | Current CHECK vocabulary | Verdict |
|---|---|---|---|
| `m.ai_job` | `status` | `queued / running / succeeded / failed / cancelled` | Widen to add `'dead'` ✅ applied |
| `m.post_draft` | `approval_status` | Already includes `'dead'` in the ANY array | **Done already — no change needed** |
| `m.post_publish_queue` | `status` | **NO CHECK constraint at all** — any string accepted. Current values in use: `published` (91 rows) / `queued` (12) / `pending` (2) / `dead` (1). One row already using `'dead'` without a constraint protecting it. | Add a NEW CHECK constraint — different work from widening an existing one; needs deliberate vocabulary design |
| `f.canonical_content_body` | `resolution_status` | `active / success / give_up_paywalled / give_up_blocked / give_up_timeout / give_up_error` | **Leave alone** — `give_up_*` IS the dead-letter semantics for this table. Adding generic `'dead'` duplicates vocabulary |

The Phase 1.7 spec was written before these actual semantics were visible. Per D161's authority hierarchy rule — trust the live DB over older doc specs when they conflict — the decision follows what the DB shows, not what the spec says.

### Why not do the full sweep today

Three reasons:

1. **`m.post_draft` is already done.** No work needed. The Phase 1.7 spec overstated the scope.
2. **`f.canonical_content_body` should NOT be changed.** Adding `'dead'` alongside the existing `give_up_*` states creates two ways to say the same thing, actively muddying pipeline semantics. Future writers would have to decide "do I mark this give_up_paywalled or dead?" — that's a worse place to land than just having one vocabulary.
3. **`m.post_publish_queue` needs a CHECK constraint designed from scratch** (currently absent), with a considered vocabulary covering current use (`queued, pending, published, dead`) plus likely-future values (`failed, cancelled`). That's a deliberate design exercise, not a quick-win bolt-on — and sprint discipline favours closing the Q1 scope and moving on rather than expanding.

### What stays open after this decision

A new backlog item (tracked in sync_state Backlog): add a CHECK constraint to `m.post_publish_queue.status` covering the full intended vocabulary. Not an A-item; prerequisite for a proper Phase 1.7 full DLQ sprint that also adds the pg_cron sweep + dashboard Failures panel + requeue action from `04_phases.md` 1.7 deliverable list.

### Real operational finding preserved (separate from this decision)

The 13 failed ai_jobs weren't ID003 timeout-loop failures as the sync_state framing implied. They were **gpt-4o TPM saturation events on 18 Apr 07:20 UTC** — a single digest burst on NDIS Yarns fired 13 concurrent `rewrite_v1` jobs (6 LinkedIn + 7 Instagram) against gpt-4o, saturating the 30k TPM ceiling within one minute. All returned `openai_http_429`. `attempts=0` on all 13 because the D157 retry-cap `attempts` column was added today, after these failures occurred.

`dead_reason` labelled accurately as `'openai_tpm_rate_limit_2026-04-18'`, not the originally-proposed `'id003_cleanup_2026-04-21'` which would have misrepresented the failure mode.

Separate brief at `docs/briefs/2026-04-21-tpm-saturation-staggered-rewrite.md` captures the concurrency design issue for pick-up when the pipeline resumes from drain — this is a latent bug that will recur on first burst.

### What this does NOT decide

- Does not resolve the TPM saturation pattern. That's design work deferred to the brief; this decision is just the DLQ scoping.
- Does not commit to a timeline for `m.post_publish_queue` CHECK. Backlog item, no trigger yet.
- Does not retroactively "fix" the pre-approved SQL process — that's a separate improvement opportunity (probably: test pre-approved SQL before approving it, or flag as untested in sync_state when it's structural DDL).

### Related decisions

- **D157** — added the `dead_reason` column to `m.ai_job` in migration `d157_id003_ai_job_retry_cap`. D163 adds `'dead'` to the status vocabulary so the column has something to pair with semantically.
- **D161** — the authority hierarchy (live DB > older doc specs) applied to resolve the `04_phases.md` spec mismatch.
- **Phase 1.7** (`docs/04_phases.md`) — partially implemented now; remaining tables tracked as future sprint work.
- **Q1 (sprint item)** — the proximate cause of this inspection. Closed in this same session.

---

## D164 — Bundler Per-Client Canonical Dedup Window: 7 Days, Hardcoded
**Date:** 22 April 2026 morning | **Status:** ✅ IMPLEMENTED (migration `20260422_m8_populate_digest_items_v1_dedup_per_client_7d`, M8 PR `ffc767d`)

### The problem this decides

The M8 fix to `m.populate_digest_items_v1` adds a `NOT EXISTS` guard preventing the same `canonical_id` from being re-bundled for the same client within a time window. The window length is the load-bearing parameter — too short and the bundler keeps multiplying drafts (the failure mode that produced 18 visually identical Instagram posts on NDIS Yarns); too long and legitimately recurring news stories get suppressed when they shouldn't.

### The decision

**Window: 7 days. Hardcoded in the SQL function. Same value for every client.**

### Backing — why 7 days, why hardcoded for now

**The candidate windows weighed:**

| Window | What this means in practice | Verdict |
|---|---|---|
| **24 hours** | Same canonical can be re-bundled into a fresh digest_item every day. Hourly cron firings would still produce ~24 digest_items per canonical per day until the canonical drops out of the freshness window. | ❌ Reproduces the IG bloat at lower magnitude. Doesn't actually solve the multiplication. |
| **3 days** | Cuts most of the bloat. Allows a real story re-coverage at day 4. Mid-week-news → end-of-week recap pattern works. | ⚠️ Defensible alternative. Slightly tighter than NDIS news cycle observation suggests is needed. |
| **7 days** | One canonical → one digest_item per client per week. Aligns with the actual NDIS news cadence (most stories have a weekly attention cycle: Mon/Tue announcement → Wed/Thu analysis → Fri/Sat reaction). | ✅ Chosen. |
| **14 days** | Aligns with longer NDIS reform cycles (consultation announcement → submission window → response). | ⚠️ Acceptable but suppresses the "follow-up post a week later" pattern that PK uses for engagement. |
| **30 days** | A real story like an NDIS pricing announcement at week 1, then a peak-body response at week 3, would be deduped out. Bad for the product — peak-body responses are some of the most engageable content. | ❌ Over-suppresses. |

7 days is the sweet spot **for NDIS-vertical news cadence specifically**. It works for property too based on observation but is not specifically tuned to it.

**Why hardcoded (not configurable per client) for now:**

1. **All four current clients are in NDIS or Australian property verticals** with similar news cadences. There is no observable demand right now for per-client tuning.
2. **The configurable version is more code, not less.** A `c.client_digest_policy.canonical_dedup_window_days` column needs the column added, the function signature changed, the seeder/policy resolver updated, and a default behaviour for unset values. That's worth building when there's a use case, not as speculative flexibility.
3. **The 7-day choice is provably better than the status quo (no dedup at all).** Any reasonable value is a strict improvement. Starting hardcoded gets the structural protection in place fast; tunability can follow when a client's pattern actually conflicts with the default.
4. **Changing a hardcoded value later is cheap.** It's a one-line migration. Treating this as "fixed forever" would be wrong, but treating it as "fixed until evidence demands otherwise" is correct discipline.

### When to revisit

Revisit if **any** of these signals appear:

- A client's vertical demonstrably has a different news cadence (e.g. weekly aged-care policy bulletins vs daily property pricing data) and content is being suppressed inappropriately.
- A client requests posts on the same canonical at sub-7-day intervals (e.g. a daily news briefing service) and the suppression actively prevents the product they're paying for.
- Two or more clients want different windows and the simplest fix becomes adding the column.
- A regression query (below) shows the dedup is suppressing content that the operator manually wants to see published.

### Future enhancement — per-client tunability spec

When the trigger fires, the work to make the window per-client:

1. Add `c.client_digest_policy.canonical_dedup_window_days INT NOT NULL DEFAULT 7` (one migration).
2. Update `m.populate_digest_items_v1` to read the value from the policy row (already loaded in the function) and use `INTERVAL '%s days' % v_dedup_window_days` instead of the hardcoded `INTERVAL '7 days'`.
3. Surface the value in the dashboard Digest Policy tab so operator can see + edit per client.
4. No data migration needed — the DEFAULT 7 preserves current behaviour for every existing client.

Estimated work: 30-45 min when the trigger fires. Tracked in Decisions Pending below.

### Regression — re-runnable query for weekly check

Documented in the M8 PR body. Re-quoted here for the decision-log record (re-runnable weekly to confirm dedup is holding):

```sql
SELECT
  dr.client_id,
  di.canonical_id,
  COUNT(*) AS digest_item_count,
  COUNT(DISTINCT di.digest_run_id) AS distinct_runs,
  MIN(di.created_at) AS first_seen,
  MAX(di.created_at) AS last_seen
FROM m.digest_item di
JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
WHERE di.created_at > NOW() - INTERVAL '7 days'
GROUP BY dr.client_id, di.canonical_id
HAVING COUNT(*) > 1
ORDER BY digest_item_count DESC;
```

For runs created strictly AFTER the M8 deploy timestamp (variant for verifying the fix specifically):

```sql
SELECT dr.client_id, di.canonical_id, COUNT(*) AS cnt
FROM m.digest_item di
JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
WHERE di.created_at > '2026-04-22 00:00 UTC'   -- M8 merge timestamp
GROUP BY dr.client_id, di.canonical_id
HAVING COUNT(*) > 1;
-- Expected: zero rows.
```

PK to re-run on 23 Apr (24h post-deploy gate 4) and weekly thereafter.

### What this does NOT decide

- Does not address content-similarity dedup (two distinct canonicals with near-identical content). That's an embedding / classification problem for a future sprint, not a structural dedup problem.
- Does not address the FB-vs-IG publish disparity flagged during M8 diagnosis (FB got 0 of those drafts, IG got 18). Separate item.
- Does not address the existing bloat in the digest queue from before the fix — natural age-out within 7 days.

### Related decisions

- **D135** — pipeline block 14-17 Apr (the historical context that created the 1-hour publish burst on 17 Apr that produced the visible IG duplicates).
- **D142** — demand-aware seeder (caps drafts/week per client; correctly capped count, but couldn't prevent duplicate content from filling the cap — exactly the failure D164 fixes upstream).
- **M8 PR** — `ffc767d` — the implementation.

---

## D165 — Bloat-Window Cleanup Discipline: Mark Dead at Source, Clear Queue, Pause Broken Consumers
**Date:** 22 April 2026 afternoon | **Status:** ✅ APPLIED (120 FB drafts + 41 queue items marked dead; `instagram-publisher-every-15m` cron paused)

### The problem this decides

The 17-19 April NDIS Yarns Instagram visible-duplicates incident turned out to have three compounding root causes, each discovered by the next sprint item:

1. **M8 — bundler multiplication.** `m.populate_digest_items_v1` ON CONFLICT scoped to `(digest_run_id, canonical_id)` only. Hourly cron firings re-selected same canonicals into new digest_items. Produced 13 canonicals × ~7-8 runs = 97 bloated drafts on 17 Apr.

2. **M11 — 8-day silent cron outage.** `enqueue-publish-queue-every-5m` had `ON CONFLICT (post_draft_id)` but the actual unique index was `(post_draft_id, platform)`. Postgres raised *"no unique or exclusion constraint matching the ON CONFLICT specification"* every 5-min run from 14 Apr 05:20 onward. 2,258 silent failures. FB queue writes stopped entirely; IG publisher kept working because it bypasses the queue.

3. **M12 — instagram-publisher platform hijacking.** `instagram-publisher` reads `m.post_draft` directly with **no `pd.platform` filter** — grabs any approved draft with an image_url regardless of intended platform. The 18 "IG duplicates" were actually FB-intended drafts hijacked by IG. Not scoped in M11. Proposed as M12 sprint item.

Once M8 + M11 fixed, the immediate question: what do we do with 120 approved FB-intended drafts from 17 Apr (19 newly-queued by M11 fix + 101 still-waiting-to-be-queued) that were generated by the bloated bundler window? Spam them over 4 weeks as FB throttle drains them, or clean up and reset?

### The decision — three-part cleanup discipline

**When a multi-system bug produces a bloat window:**

1. **Mark dead at the source, not at consumers.** `UPDATE m.post_draft SET approval_status='dead', dead_reason='<bug>_bloat_window_<date>'` for every draft in the bloat window. Preserves audit trail (per Phase 1.7 DLQ semantics D163). Stops consumers from ever picking them up again.

2. **Clear every downstream queue item in any non-terminal state.** `UPDATE m.post_publish_queue SET status='dead', dead_reason='<bug>_bloat_window_<date>'` for queued/pending rows. Once the source is dead, queue entries pointing at it are orphans. Don't leave them to fail one-by-one at publish time.

3. **Pause any broken consumer defensively.** Even after upstream cleanup, if a consumer has a known bug (M12 IG hijacking), pause its cron. A single future approved draft on the wrong platform path is enough to trigger the hijack again. `SELECT cron.alter_job(job_id := <id>, active := false)`. Resume only after the consumer fix ships and verifies.

### Why mark dead instead of delete

- Audit trail — `dead_reason` column documents what happened and why, visible forever in the DLQ view
- Reversibility — if any draft turns out to be evergreen worth publishing, one-line UPDATE restores it
- Phase 1.7 alignment — the Dead Letter Queue pattern is the standing approach (D163); this honours it
- Operational discipline — DELETE is destructive and precedent-setting; `dead` is idempotent and reviewable

### Why clear the queue AND the source

- Queue items point at source drafts by FK. If source is dead but queue is still "queued", publisher will either crash or silently skip — both are worse signals than a clean `dead` state.
- One cleanup operation per layer is cheaper than debugging "why is the publisher erroring on a draft that doesn't exist" three days later.

### Why pause the consumer, not just trust the fix

Timeline reality: the M12 fix isn't built yet. Between "clean slate now" and "M12 ships", the IG publisher would pick up the very first new FB-intended approved draft with an image and publish it to IG again. Same embarrassment, fresh cause. Pausing jobid 53 closes that window for zero cost — FB publishing continues, LinkedIn continues, YouTube continues. Only IG is offline until M12 lands.

### The real-world embarrassment cost this avoids

PK framing, verbatim: *"rather than just spamming the pages... if we spam, we put 100 posts or you know 50 or 20 posts in one day, people will have different expectations or they will not take the page seriously. If they go back or maybe the Facebook will tag the page as spam or something."*

The throttle was 2/day per client. 120 drafts across 3 clients at 2/day = 20-40 days of publishing 17 April-dated news. By mid-May, NDIS reform "pre-Federal Budget" content would be reading as stale 30+ days after the actual Budget. That's an audience trust cost AND a Meta reputation cost (spam signal), well beyond the sunk cost of the 120 drafts.

### The applied cleanup (22 Apr afternoon)

```sql
-- Step 1: Mark source drafts dead
UPDATE m.post_draft
SET approval_status = 'dead',
    dead_reason = 'm8_m11_bloat_window_2026-04-17',
    updated_at = NOW()
WHERE platform = 'facebook'
  AND approval_status = 'approved'
  AND created_at >= '2026-04-17 00:00 UTC'
  AND created_at <  '2026-04-18 00:00 UTC'
  AND NOT EXISTS (SELECT 1 FROM m.post_publish pp WHERE pp.post_draft_id = post_draft.post_draft_id AND pp.platform = 'facebook');
-- Result: 120 drafts marked dead (NDIS Yarns 63, PP 44, CFW 13)

-- Step 2: Clear queue items
UPDATE m.post_publish_queue
SET status = 'dead',
    dead_reason = CASE
      WHEN platform = 'facebook'  THEN 'm8_m11_bloat_window_2026-04-17'
      WHEN platform = 'instagram' THEN 'm8_m11_bloat_window_2026-04-17'
      WHEN platform = 'youtube'   THEN 'pre_m8_stale_2026-04-09'
      ELSE 'stale_pre_m8_m11_cleanup'
    END,
    updated_at = NOW()
WHERE status IN ('queued', 'pending');
-- Result: 41 queue rows marked dead (FB 27, IG 12, YouTube 2)

-- Step 3: Pause broken consumer
SELECT cron.alter_job(job_id := 53::bigint, active := false);
-- Result: instagram-publisher-every-15m paused. Will resume post-M12.
```

### What this does NOT decide

- Does not fix M12 — that's a follow-on sprint item (IG publisher `pd.platform` filter + enqueue NOT EXISTS platform-scoping)
- Does not commit to a monitoring fix for silent cron failures — flagged as separate sprint item (D155/D157 should have surfaced this)
- Does not define a SOP for "when to mark dead vs delete" — this decision applies the pattern once; a formal SOP would be a future systems-doc if the pattern recurs

### Related decisions

- **D163** — Phase 1.7 DLQ foundation on `m.ai_job`. D165 extends the DLQ vocabulary to `m.post_draft` (via `dead_reason`) and `m.post_publish_queue` (via `dead_reason`) for a real operational cleanup, not just a constraint widen.
- **D164** — Bundler per-client dedup window. D165 is the downstream cleanup that D164's fix made safe (once bundler stops producing bloat, it's safe to nuke the historical bloat without fear of immediate reproduction).
- **M8 PR** — `ffc767d` — bundler fix
- **M11 PR** — `583cf17` — cron ON CONFLICT fix
- **M12 (pending)** — IG publisher `pd.platform` filter + enqueue NOT EXISTS scoping. Brief needed. **Superseded by D166 — see below.**

### Sprint pending items opened by D165

- **M12** — instagram-publisher platform-filter + enqueue platform-scoped NOT EXISTS. **HIGH priority** because IG publisher is paused until this ships. **Status: SUPERSEDED by D166/D167 router build track. Kept as fallback if router work stalls.**
- **Cron failure-rate monitoring** — `system-auditor` or a new pg_cron sweep should watch `cron.job_run_details` failure rate. 2,258 silent failures over 8 days should never happen undetected.

---

## D166 — Router Sequencing Reversal: Build D144 Router MVP Instead of M12 Surgical Fix
**Date:** 22 April 2026 evening | **Status:** ✅ APPLIED (D167 covers the shipped infrastructure)

### The problem this decides

After M8 + M11 + D165 cleanup closed the morning sprint, the next obvious item on the board was **M12** — a surgical three-bug fix to `instagram-publisher` (add `pd.platform` filter) + `enqueue_publish_queue` (platform-scoped NOT EXISTS) + remove two exec_sql sites. Estimated 2-3 hours. IG publisher cron (jobid 53) is paused until it ships.

A deep read of the relevant code during evening session scoping revealed the framing was wrong. M12 is not a clean surgical fix — it's polish on code the router replaces entirely.

### What the code review surfaced

1. **IG publisher bypasses the queue entirely.** Reads `m.post_draft` directly via `exec_sql`. FB publisher is queue-driven (`publisher_lock_queue_v1`) with schedule/throttle/token-validation. The two publishers have completely different ingestion shapes.

2. **No `seed-and-enqueue-instagram` cron exists.** Only `seed-and-enqueue-facebook-every-10m` (jobid 11). There is **no real IG content pipeline.** IG publisher was hijacking FB-intended drafts because `m.seed_and_enqueue_ai_jobs_v1` fans out drafts only to Facebook.

3. **`m.post_draft` DOES have a `platform` column** (populated by `seed_and_enqueue_ai_jobs_v1`). The M12 "IG publisher filter by `pd.platform`" fix would work — but it's fixing a filter that shouldn't exist because the IG publisher shouldn't be reading the queue-bypass path in the first place.

4. **The enqueue `NOT EXISTS` "bug"** PK remembered from morning is not actually a correctness bug given the current one-draft-per-platform model. The platform-scoped version is defensive hardening only — no live failure mode.

### What the router replaces

Per D142/D143/D144 (recovered from past chats during session), the router's job is exactly the thing `seed_and_enqueue_ai_jobs_v1` does wrong today:

- Current: blind fan-out to Facebook only → no IG/LinkedIn/YouTube pipeline → hijacking pattern
- Router: demand-grid per (client, platform, format) → signal matching → seed jobs with platform and format pre-assigned → ai-worker generates exactly the content each slot needs

Once the router is live, `seed_and_enqueue_ai_jobs_v1` is rewritten to call the router. The IG publisher either becomes queue-driven (same as FB) or reads the router's seeded output directly. Either way, the M12 "filter by `pd.platform`" fix becomes moot — the publisher never sees an FB-intended draft because the seed path produces platform-specific drafts to begin with.

### The decision

**Skip M12 surgical. Build D144 router MVP instead.**

This reverses the sequencing D141 recommended ("router after first client revenue") on three specific grounds:

1. **App Review waiting window funds the work.** Meta App Review + LinkedIn App Review are pending. External go-to-market is gated regardless. The "do revenue-producing work first" argument in D141 assumed time was the constraint; right now platform approval is the constraint.

2. **M12 is wasted work.** 2-3 hours of polish on code that gets replaced entirely. The router makes the IG publisher's platform filter irrelevant.

3. **Pipeline is uniquely clean.** 0 approved-unpublished FB drafts, 0 queue items, IG publisher paused. Zero risk from pausing the surgical-fix track. This window won't exist in the same way after first client signs.

### What this does NOT change

- **IG publisher remains paused** — jobid 53 `active=false`. The router MVP ships shadow-only tonight; integration with the hot path happens Friday+ when fresh.
- **FB publishing continues uninterrupted** — router is additive infrastructure; `seed_and_enqueue_ai_jobs_v1` unchanged tonight; enqueue cron healthy; FB/LinkedIn/YouTube publishing paths untouched.
- **M12 is not closed** — it's *superseded*. If the router build stalls for any reason, M12 surgical fix remains the fallback to resume IG publishing safely.
- **Sprint item count is unchanged on Section A** — router work is sprint-track, not pre-sales-gate work. A-count still 9 of 28 closed.

### The sequencing reversal, explicit

D141 said: *"Multi-perspective review recommending sequence routing AFTER first client revenue."* The reasoning was sound at the time — don't over-invest in infrastructure before revenue validates demand. D166 supersedes this specifically because the binding constraint changed: today it's platform approval time, not engineering time. When App Review clears, revenue-first thinking reapplies.

### Related decisions

- **D141** — the sequencing recommendation now reversed
- **D142** — demand-aware seeder (already implemented; consumes D144 output once router is live)
- **D143** — classifier (prerequisite for router's matching layer; deferred)
- **D144** — router spec (this is the decision to start building the MVP)
- **D145** — benchmark table (research phase; partially covered by D167 mix defaults research)
- **D165** — bloat-window cleanup discipline (D166 preserves that cleanup; router work is pure-additive)
- **D167** — the actual infrastructure shipped (companion decision recording what landed)

---

## D167 — Router MVP Shadow Infrastructure Shipped: Defaults Table + Override Table + Demand Grid Function
**Date:** 22 April 2026 evening | **Status:** ✅ IMPLEMENTED (two migrations + research doc drafted same session — research doc to be committed next session)

### The problem this decides

D166 committed to building the D144 router MVP. This entry records what actually landed, with the specific trade-offs accepted as MVP, so next session knows exactly what works and what is still wrong by design.

### What landed in this session

Three production changes + one research document (not yet committed) + one validation view, all applied to the live database in one evening:

1. **Migration `create_platform_format_mix_default_d145_seed`** — created `t.platform_format_mix_default` table + 23 seed rows covering FB/IG/LI/YouTube. All platforms sum to exactly 100.00 verified via `t.platform_format_mix_default_check`. Seeded from Buffer 2026 (45M+ posts) + Hootsuite 2026 industry benchmarks.

2. **Migration `create_client_format_mix_override_and_demand_grid_router`** — created `c.client_format_mix_override` (same shape as defaults table, plus `client_id` FK; empty for every client) + created `m.build_weekly_demand_grid(p_client_id UUID, p_week_start DATE DEFAULT CURRENT_DATE)` SQL function.

3. **Research document draft** at `/home/claude/research_platform_format_mix_defaults.md` (362 lines) — full methodology, per-platform rationale, and 10 source citations. Drafted but **not yet committed to repo** in this session's sync push; to be added next session. The core reasoning (matrix + methodology summary + sources list) is preserved in this decision entry so the audit trail is intact even before the standalone doc lands.

### The defaults mix, for reference

| Format | Facebook | Instagram | LinkedIn | YouTube |
|---|---:|---:|---:|---:|
| text | 20 | — | 20 | — |
| image_quote | 30 | 20 | 15 | — |
| carousel | **25** | **30** | **40** | — |
| animated_text_reveal | 5 | 5 | — | — |
| animated_data | — | 10 | — | — |
| video_short_kinetic | 10 | 20 | 15 | 30 |
| video_short_kinetic_voice | 10 | — | — | **25** |
| video_short_stat | — | — | — | 20 |
| video_short_stat_voice | — | 15 | 10 | 15 |
| video_short_avatar | — | — | — | 10 |
| **Total** | **100** | **100** | **100** | **100** |

### Research sources summary (from research doc draft)

- **Primary source:** Buffer 2026 "Best Content Format on Social Platforms" — analysed 45M+ posts across platforms
- **Cross-checks:** Hootsuite 2026 benchmarks (nonprofits, healthcare, financial services, government), Rival IQ 2025 social benchmark report, Socialinsider NGO analysis, multiple YouTube Shorts sources
- **Key findings that informed the mix:** FB format-agnostic (all formats within 1% engagement); IG carousels dominate engagement at 6.9%, Reels get 2.25× reach; LinkedIn carousels 21.77% engagement (196% more than video, 585% more than text); YouTube Shorts 5.91% engagement (highest of any short-form platform); vertical nuances exist for nonprofit/healthcare/FinServ but point same direction

### MVP trade-offs explicitly accepted (worth preserving in case they bite later)

The demand-grid function uses naive `ROUND()` on `slot_count × share / 100`. This has four known behaviours that are fine for MVP but will need revisiting:

1. **Rounding overflow.** For NDIS Yarns (5 scheduled slots per platform), the function produces 6 demand rows summing to 6 slots on every platform — one over the schedule. This is expected from independent per-format rounding. The matching layer (future work) will need a policy: cap at scheduled slots and drop lowest-share overflow, or accept overproduction and reject surplus at approval time.

2. **Low-share vanishing.** Formats at 5% share × 5 slots = 0.25 → rounds to 0. `animated_text_reveal` disappears entirely for 5-slot schedules on all platforms. At 20+ slot volumes this stops being a problem.

3. **No override rebalancing.** When an override row exists for `(client, platform, format)`, its share replaces the default for that cell — but the other formats' shares are NOT rebalanced. If operator sets `linkedin.carousel` override from 40% to 60%, platform total becomes 120%. Visible (via the validation view), not silent, but still operator responsibility to reconcile. Three options were discussed (absolute+rebalance, delta, full override) — deferred per PK's "problem of distant future" call.

4. **No enablement filter.** The router emits formats regardless of `c.client_format_config.is_enabled` or consent flags (`video_short_avatar` requires `c.client_avatar_profile.consent_signed_at`). The caller (future matching layer) is responsible for filtering at selection time. This keeps the router pure and lets the consent/enablement logic live where it's contextual.

### What this does NOT include (still ahead)

- **D143 classifier** — rule-based SQL tagging `m.digest_item` with content_type labels (stat_heavy, multi_point, timely_breaking, educational_evergreen, human_story, analytical). Prerequisite for the matching layer.
- **Matching layer** — for each demand row, find the best signal. Depends on D143.
- **`m.seed_and_enqueue_ai_jobs_v1` integration** — currently still blind FB fan-out. Rewriting this to call the router is the HIGH-RISK hot-path change. Friday+ work.
- **ai-worker platform-awareness** — once seeds arrive with `format_key` preassigned, ai-worker should skip its format advisor. Backwards-compatible change per D144 notes.
- **Cron changes** — new cron for IG/LinkedIn/YouTube seeding, OR consolidate to one router-driven cron replacing jobid 11.
- **Research doc committed to repo** — drafted in `/home/claude/` but sync-push for this session only covers decisions + sync_state + file 15. Research doc to be committed next session as `docs/research/platform_format_mix_defaults.md`.

### Pipeline hot path UNCHANGED

The entire router MVP is shadow infrastructure. `seed_and_enqueue_ai_jobs_v1` is untouched. `enqueue-publish-queue-every-5m` (jobid 48) is untouched. All four publishers are untouched. IG publisher cron (jobid 53) remains paused per D165 — regardless of D166/D167, it stays paused until the router integration work on Friday.

The router can be inspected at any time by running:

```sql
SELECT * FROM m.build_weekly_demand_grid(
  (SELECT client_id FROM c.client WHERE client_slug = 'ndis-yarns')
);
```

Nothing else in the system calls this function today.

### Why research + migration in one session was safe

Multiple structural guardrails kept this from being risky evening work:

- **No hot path touched.** Pure-additive. If the tables were empty or the function broken, nothing else would notice.
- **Validation view runs on demand.** `SELECT * FROM t.platform_format_mix_default_check;` returns 4 rows, all status='ok' now; any mutation can be checked the same way.
- **PK explicitly approved structure, not values.** "Numbers are config, changeable via UPDATE" was PK's framing. Any share can be updated anytime without schema work.
- **Versioning built in.** `effective_from` + `superseded_by` + `is_current` columns support future research refreshes without data loss.
- **Research doc audit trail.** The `evidence_source` column on every seed row points at `docs/research/platform_format_mix_defaults.md` (path pre-registered; file commits next session).

### What changed on the sprint board

- **M12 marked superseded** by router build track (per D166). IG publisher remains paused regardless.
- **D145 partially closed** — the mix defaults portion is shipped. The content_type × format benchmark table portion (matching-layer data) remains deferred, still gated on D143.
- **New open items** — D143 classifier spec, matching layer design, `seed_and_enqueue_ai_jobs_v1` rewrite, cron changes. Friday+ work.

### Related decisions

- **D142** — demand-aware seeder (already implemented 18 Apr+; consumes router output once integration lands)
- **D143** — classifier (spec exists in prior chat history; implementation deferred)
- **D144** — router master spec (this decision is its MVP realisation)
- **D145** — benchmark table (mix-defaults portion shipped via D167; matching-benchmarks portion deferred)
- **D146** — feed pipeline score + retirement (still gated on Phase 2.1 + 60d data)
- **D165** — bloat-window cleanup (the pipeline-clean state that made evening work safe)
- **D166** — the sequencing reversal that authorised this work

### Validation command for next session

To confirm nothing drifted overnight:

```sql
-- All four platforms should show total_share = 100.00 and status = 'ok'
SELECT * FROM t.platform_format_mix_default_check;

-- Demand grid for NDIS Yarns should return 20 rows (5 platforms × avg 4 formats, minus zeros)
SELECT COUNT(*) FROM m.build_weekly_demand_grid(
  (SELECT client_id FROM c.client WHERE client_slug = 'ndis-yarns')
);
```

Expected output recorded: 4 platforms × total_share 100.00, 20 demand rows for NDIS Yarns.

---

## Decisions Pending

| Decision | Status | Gate |
|---|---|---|
| D143 — Signal content type classifier | 🔲 Gated | D142 stable + 60 days data |
| D144 — Signal router (platform × format) | 🟡 MVP shadow infrastructure shipped via D167 22 Apr; matching layer still gated | D143 + 60d data for matching layer |
| D145 — Benchmark table | 🟡 Mix defaults shipped via D167 22 Apr; content_type × format benchmark still gated | D143 |
| D146 — Feed pipeline score + retirement | 🔲 Gated | Phase 2.1 + 60 days data |
| D140 — Digest item scoring | 🔲 Phase 3 | After CFW stable + auto-approver healthy |
| D149 — Advisor Layer MVP (Sales Advisor Project) | 🔲 Deferred post-sprint | Same rationale as D162 |
| D151 — Table purpose backlog sweep (22 rows) | 🔲 Post-pre-sales | Batch job later |
| D153 — Token-health live /debug_token cron | 🔲 Spec this week, build after | None — high priority |
| D156 Stage 2 — Meta reconciliation | 🔲 Post-sprint | Stage 1 verified earning its keep after reactivation |
| D157 — Cost guardrails Stop 2 infrastructure | 🔲 Post-sprint | ai-worker fix verified ✅ + sprint complete |
| D157 — Raise Anthropic cap to calibrated Stop 1 | 🔲 Week of 5 May | 7 days post-fix clean data + weekly calibration |
| D164 — Per-client canonical dedup window column | 🔲 When trigger fires | Vertical/cadence mismatch OR client request OR operator-suppression complaint |
| **D165 — M12 IG publisher platform-filter** | 🟡 SUPERSEDED by D166/D167 router track; kept as fallback | If router build stalls, M12 resumes as surgical path |
| **D165 — Cron failure-rate monitoring** | 🔲 Sprint item TBD | 2,258 silent failures over 8 days must not recur |
| **D166 — Router sequencing reversal** | ✅ APPLIED 22 Apr evening | Companion to D167 |
| **D167 — Router MVP shadow infrastructure** | ✅ APPLIED 22 Apr evening | Integration (R6 seed_and_enqueue rewrite) still ahead — HIGH RISK Friday+ |
| **R4 — D143 classifier spec on paper (6 content types × rules)** | 🔲 Friday+ (low-risk writing) | Start of matching layer design |
| **R5 — Matching layer design (demand row → signal selection)** | 🔲 Depends on R4 | R4 complete |
| **R6 — `m.seed_and_enqueue_ai_jobs_v1` rewrite to call router** | 🔲 **HIGH RISK hot-path change** — Friday+ only | R4 + R5 complete + deliberate planning session |
| **R7 — ai-worker platform-awareness (skip format advisor when seed has format_key)** | 🔲 Depends on R6 | R6 complete + verified |
| **R8 — Cron changes (new IG/LI/YT seeding OR consolidate to router-driven)** | 🔲 Depends on R6 | R6 complete + verified |
| **Research doc commit to repo** | 🔲 Next session | Drafted at /home/claude/; sync-push for 22 Apr evening only covered 3 files |
| Inbox anomaly monitor | 🔲 Post-sprint | Separate brief TBW |
| Phase 2.1 — Insights-worker | 🔲 Next major build | Meta Standard Access |
| Phase 2.6 — Proof dashboard | 🔲 After Phase 2.1 | Engagement data |
| Solicitor engagement | 🔲 Parked per D147 + D156 refinement | First pilot revenue OR second pilot signed |
| Meta App Review | ⏳ In Review | Contact dev support if stuck after 27 Apr |
| CFW + Invegent content prompts | 🔲 A11b pre-sales | PK prompt-writing session Fri 24 Apr |
| TBC subscription costs | 🔲 A6 pre-sales | Invoice check |
| CFW profession fix | 🔲 Immediate | Change in Profile |
| Auto-approver target pass rate | 🔲 C1 | Single PK decision |
| Monitoring items A20–A22 (D155 follow-on) | 🔲 Sprint items | Sprint priority per D162 |
| Professional indemnity insurance | 🔲 Pre-pilot | Underwriting forces clarification |
| A27 — LLM-caller Edge Function audit (ID003 follow-on) | 🔲 After ai-worker fix establishes pattern | Pattern proven |
| **Reviewer role-library rebuild (post-D160)** | 🔲 Captured as brief with consumption-model addendum; execute when evidence justifies | 2+ weekly digests post-sprint + concrete use case for a role not in current library |
| **CFW schedule save bug investigation** | ✅ Closed M2 PR #2 commit `a1d7dc01` | — |
| **getPublishSchedule exec_sql + silent-swallow** | ✅ Closed M5 PR #3 commit `737d150` | — |
| **M6 portal exec_sql eradication** | ✅ Closed M6 PR #1 commit `9c00b5a` | — |
| **M7 dashboard feeds/create exec_sql** | ✅ Closed M7 PR #5 commit `eda95ce` | — |
| **M9 ScheduleTab + FeedsClient client-switch staleness + Schedule platform display** | ✅ Closed M9 PR #4 commit `293f876` | — |
| **Discovery pipeline ingest bug fix** | ✅ Closed Q2 | — |
| **13 failed ai_jobs cleanup SQL** | ✅ Closed 21 Apr evening — see D163 | — |
| **A7 privacy policy update** | ✅ Closed 22 Apr morning — invegent.com/privacy-policy live + canonical | — |
| **External reviewer resume** | 🔲 Paused per D162 | ~18-19 of 28 Section A items closed |
| **Per-commit reviewer iteration bug** | 🔲 Before reviewer resume | Add filter for per_commit_enabled or explicit reviewer_key IN list |
| **Phase 1.7 DLQ continuation — `m.post_publish_queue` CHECK** | 🔲 Backlog per D163 | Dedicated Phase 1.7 full-sprint session |
| **TPM saturation on concurrent rewrites** | 🔲 Brief parked per D163 | Pipeline resumes from drain + fresh digest fires through rewrite |
| **M8 Gate 4 — 24h regression check** | 🔲 23 Apr | Re-run regression query against runs > M8 merge timestamp |
| **Bundler dedup weekly regression check** | 🔲 Ongoing | Weekly Mon — query in D164 |
| **FB-vs-IG publish disparity** | ✅ Closed M11 PR #2 commit `583cf17` — root cause 8-day silent cron outage; bloat cleanup applied per D165 | — |
| **`instagram-publisher` platform filter (ex-M12)** | 🟡 SUPERSEDED by D166/D167 router track — kept as fallback | Router integration (R6) preferred path; M12 surgical fallback if R6 stalls |
| **`instagram-publisher` exec_sql + raw interpolation** | 🔲 Folds into R6 router integration | R6 complete |
| **PP Schedule Facebook 6/5 over-tier-limit** | 🔲 Sprint item TBD | Surfaced in M5 verification — investigate save-side validation |
