# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D100 — See earlier commits

---

## D101–D125 — See 16 Apr 2026 commits

---

## D126 — Topbar Critical Count Fix
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief C)

Topbar now shows COUNT(DISTINCT client_id) among open CRITICAL incidents.

---

## D127 — Incident Deduplication + Auto-Resolution
**Date:** 17 April 2026 | **Status:** ✅ BUILT (migration)

`insert_pipeline_incident` patched — idempotent. `auto_resolve_pipeline_incidents()` cron #63 every 30 min.
**17 Apr fix v2:** Rewrote to join through digest_item → digest_run (post_draft.client_id was NULL).
Backfilled client_id on all existing post_draft rows. Resolved NY/PP/CFW incidents immediately.

---

## D128 — Token Expiry Badge Fix
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief C)

NULL + has token → grey "Expiry not tracked". NY/PP Facebook show real expiry dates.

---

## D129 — Pipeline Health Card on Overview
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief B)

---

## D130 — Collapse Engagement Tables Behind Dev-Tier Banner
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

---

## D131 — Sidebar Reorganisation
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

Performance + AI Costs + Compliance moved to MONITOR.

---

## D132 — Clickable Overview Stat Cards
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

---

## D133 — Cost Page Projections
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief B)

---

## D134 — Onboarding Moved to Clients Tab
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief C)

---

## D135 — Pipeline Selection Gap Fixed
**Date:** 17 April 2026 | **Status:** ✅ FIXED (migration)

`public.select_digest_candidates()` + cron #62 every 30 min. 550 candidates promoted, pipeline unblocked 17 Apr.

---

## D136 — Schedule Grid Icon Fix
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief A)

---

## D137 — Onboarding Run Scans + Activation Flow
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief E + G)

Run Scans button, scan results panel, Activate Client button with client dropdown.
`public.activate_client_from_submission(UUID, UUID)` migration applied 17 Apr.

---

## D138 — YouTube Discovery Route in Feed Discovery Pipeline
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief D138+D139)

`seed_type = 'youtube_keyword'` routes to YouTube Data API. feed-discovery v1.1.0 deployed.

---

## D139 — Feed Source Taxonomy: Content Origin + Provenance
**Date:** 17 April 2026 | **Status:** ✅ BUILT (Brief D138+D139 + migration)

`f.feed_source.content_origin` + `added_by` columns added and backfilled.
Feeds page shows content origin badges + "Auto-discovered" teal provenance badges.

---

## D140 — Digest Item Scoring Disabled — Pending Future Build
**Date:** 17 April 2026 | **Status:** 🔲 Future build — Phase 3

Root cause: old bundler computed `final_score`; replaced by `select_digest_candidates()` (D135)
which doesn't score. All digest items have `final_score = 0`. Auto-approver v1.5.0 sets
`min_score = 0` as temporary fix. Future build: score-worker computes score from source weight,
recency, fetch quality, vertical relevance. Do not raise min_score until scoring is live.

---

## D141 — Pipeline Synthesis & Demand-Aware Seeding
**Date:** 17 April 2026 | **Status:** 🔲 Future decision — do not build until prerequisites met

### Background — the conversation that led here

On 17 April 2026, a deep analysis of the pipeline revealed a fundamental mismatch between
ICE's stated philosophy and its actual behaviour. This decision records the full analysis,
the options considered, and the agreed path forward. It is intentionally detailed because
the decision has significant downstream implications.

---

### The philosophical gap

ICE was designed as signal-centric: "signals first, posts second." Every piece of content
should be traceable to a real-world signal. The pipeline was intended to ingest many signals,
synthesise the best ones, and produce a small number of high-quality posts matching each
client's publishing schedule.

**What was actually built:** A 1:1 pipeline. One signal → one AI job → one draft → one post.
The synthesis step was designed in the blueprint but never implemented. The throttle at the
publisher end (max_per_day) was acting as a waste bin — discarding most of what the AI generated.

**Evidence (17 Apr 2026, last 7 days):**

| Client | Signals selected | AI jobs created | Drafts generated | Published |
|---|---|---|---|---|
| NDIS-Yarns | 332 | 147 | 147 | 1 |
| Property Pulse | 1,402 | 63 | 63 | 3 |
| Care For Welfare | 36 | 24 | 24 | 0 |

NDIS-Yarns has a 6-post/week schedule. It generated 147 drafts to produce 1 published post.
Token waste rate: ~93%. Every wasted draft consumed a full Claude API call.

---

### The full pipeline — what was audited

```
INGEST (every 6h)
  ingest Edge Function → f.canonical_content_item

CONTENT FETCH (every 10m)
  content_fetch Edge Function → f.canonical_content_body (Jina)

PLANNER (every 1h)
  planner cron → m.digest_item (selection_state = 'candidate')

SELECTOR (every 30m) [added D135, 17 Apr]
  select_digest_candidates() → promotes to selected + bundled = true
  ⚠ Does NOT compute final_score — all scores remain 0 (D140)

SEEDER (every 10m) ← THE PROBLEM POINT
  seed_and_enqueue_ai_jobs_v1('facebook', 10)
  → picks any 10 selected+bundled items with body_fetch_status = 'success'
  → creates post_seed + post_draft stub + ai_job (1 per signal, no demand awareness)
  → no concept of "how many does this client need this week"
  → no client-level limit

AI WORKER (every 5m, limit=5)
  ai-worker v2.8.0
  → format advisor (1 Claude call)
  → content generator (1 Claude call)
  → 2 Claude calls per draft = high token burn

AUTO APPROVER (every 10m)
  auto-approver v1.5.0
  → body length + keyword gates only (score gate disabled, D140)

ENQUEUE (every 5m)
  DISTINCT ON (client_id, platform) — only 1 draft per client per platform per run

PUBLISHER (every 5m)
  max_per_day + min_gap_minutes throttle
  → most approved drafts sit in queue indefinitely
```

---

### Options considered

**Option A — True synthesis (N signals → 1 post)**
Pass multiple signals to one AI call. Ask Claude: "Here are 8 signals about NDIS this week.
Write one Facebook post synthesising the most important insight." One Claude call produces one
post. Ratio: many signals → few posts.

Pros: Realises the original design intent. Most token-efficient. Posts are editorially richer.
Cons: Requires scoring to work first (D140) — otherwise synthesis picks random signals.
     Provenance becomes "came from these 5 signals" — harder to audit.
     Unknown whether synthesised posts perform better than 1:1 posts.
     Requires new `synth_bundle_v1` seeder path (though ai-worker already handles this job_type).
     Cannot validate until engagement data exists (Phase 2.1 not yet built).

**Option B — Demand-aware seeding (1 signal → 1 post, but only as many as needed)**
Keep the 1:1 structure completely. Change only the seeder.
Instead of "seed 10 items every 10 minutes always," ask:
"How many posts does this client need this week? Seed that many + a buffer."

Example: NY has 6 slots/week. Seed 9 items (6 × 1.5 buffer). Not 147.
Token waste drops from 93% to ~20-30% overnight. Zero architectural change downstream.

Pros: Minimal risk. One function change. All downstream code unchanged.
     Delivers 90% of the token saving with 5% of the complexity.
     Correct regardless of whether synthesis is ever built.
Cons: Doesn't deliver the synthesis vision. Still 1:1 ratio.

---

### Decision — agreed 17 April 2026

**Do not build synthesis (Option A) yet.**

The prerequisites are not met:
1. `final_score = 0` on all digest items (D140 not yet built). Synthesis requires ranked inputs.
2. No engagement data exists (Phase 2.1 insights-worker not yet tracking post performance).
   Cannot know whether synthesised posts perform better without a baseline.
3. The pipeline only became stable on 17 Apr (D135 pipeline gap fix). Layering synthesis
   on an unstable foundation creates compounded debugging complexity.

**Build Option B (demand-aware seeder) as the next pipeline improvement.**
This is the correct intermediate state: supply is capped to demand, token waste is solved,
architecture stays simple, and the path to synthesis remains fully open.

**Build Option A (synthesis) only after:**
1. D140 — scoring is live and final_score is non-zero
2. Phase 2.1 — insights-worker is collecting engagement data
3. 60+ days of 1:1 baseline data exists to compare against
4. Explicit decision to proceed after reviewing baseline engagement rates

**The synthesis path remains fully open.** The ai-worker already contains `synth_bundle_v1`
handling code. The schema supports it. When the prerequisites are met, synthesis can be enabled
for one client as a 4-week experiment, compared against baseline, and adopted or abandoned
based on evidence — not theory.

---

### What demand-aware seeding means end-to-end

See D142 for the detailed design of the demand-aware seeder. This decision establishes
the direction; D142 records the implementation design.

---

### Key architectural principles confirmed by this analysis

1. **Ingest broadly, seed narrowly.** Many signals in is correct — it gives ICE awareness.
   The problem was never too many signals. It was converting too many signals into AI jobs.
   The fix is at the seeder, not the ingest layer.

2. **The throttle is a safety net, not a production mechanism.** `max_per_day` and `min_gap_minutes`
   exist to prevent accidents. The seeder should produce the right volume, not rely on the
   throttle to discard excess.

3. **Supply should match demand.** Each client has a known weekly post requirement from their
   schedule. The seeder should produce exactly enough candidates to fill that schedule plus a
   rejection buffer. Everything else is waste.

4. **Token cost scales with seeder output, not ingest volume.** Fixing ingest volume does
   nothing for costs. Fixing seeder output directly reduces the Claude API bill.

---

### Dependency map — what must change vs what must not change

For demand-aware seeding (Option B):

| Component | Change required? | Notes |
|---|---|---|
| `seed_and_enqueue_ai_jobs_v1` | Yes — add demand calculation | The only change |
| `m.post_seed` schema | No | Same structure |
| `m.post_draft` schema | No | Same structure |
| `m.ai_job` schema | No | Same job_type |
| `ai-worker` Edge Function | No | Unchanged |
| `auto-approver` Edge Function | No | Unchanged |
| `enqueue-publish-queue` cron | No | Unchanged |
| `publisher` Edge Function | No | Unchanged |
| Dashboard Inbox | No | Unchanged |
| `c.client_publish_schedule` | Read-only dependency | Used to count demand |
| `c.client_publish_profile` | Read-only dependency | Used as fallback if no schedule |

For synthesis (Option A — future):

| Component | Change required? | Notes |
|---|---|---|
| `seed_and_enqueue_ai_jobs_v1` | Yes | New `synth_bundle_v1` path |
| `m.post_seed.seed_payload` | Yes | `{items: [...]}` instead of `{digest_item: {...}}` |
| `m.ai_job.job_type` | New value | `synth_bundle_v1` — ai-worker already handles it |
| `ai-worker` | No | Already has synth_bundle_v1 code |
| Everything downstream | No | Unchanged |

---
