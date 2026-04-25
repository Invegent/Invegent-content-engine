# Slot-Driven Architecture — Detailed Design

**Date:** 25 April 2026 Saturday late evening
**Status:** Architectural design brief — open for discussion
**Scope:** Pure architecture. Business framing intentionally excluded per PK direction.
**Authors:** PK + Claude (architectural dialogue)

---

## 0. How to read this brief

This brief goes deep on the architecture and stays out of the "should we build it" debate. PK has reserved business decisions to themselves and asked for a no-half-solutions design conversation. Sections are dense by design.

Where I have a strong opinion, I say so. Where the design has multiple defensible options, I list them all and name the trade-offs. Open architectural questions are flagged with "🟡 OPEN" and need PK input before commit.

The brief covers **eight layers of the pipeline**, **six cross-cutting concerns**, and **twelve open architectural questions**. There are repeated places where a small choice cascades into large downstream consequences — those are flagged as 🔥 LOAD-BEARING DECISIONS.

---

## 1. Framing — what's actually wrong, beyond the cost symptom

The cost figure ($190/month vs $18 target) is the alarm that brought you here, but it's not the disease. The disease is an **impedance mismatch between supply (signals) and demand (slots)**, and the current pipeline has no first-class concept of demand. It only knows supply.

Let me name the impedance mismatch precisely:

| Layer | Native unit | Cardinality |
|---|---|---|
| Feeds | RSS items | Continuous, ~50 distinct/day after dedup |
| Canonicals | News stories | ~50/day |
| R4 classification | (canonical, class) labels | ~50/day |
| R5 matching | (canonical, platform, format) fitness rows | ~50 × ~12 = ~600/day fitness scores |
| **R6 (current)** | **(canonical → slot) seeds** | **fanout 1:N → 477/day** |
| Publish capacity | (client, platform, day) slots | **~32/day** |

The R6 layer is where supply meets demand. It currently treats the cardinality of supply as the cardinality of work. That is the architectural error. Demand cardinality is bounded by `published_capacity = clients × platforms × max_per_day`. Work should match demand, not supply.

The proposed inversion makes **demand the unit of work**. R5 stops being "score everything against everything" and becomes "score the pool against this specific slot." R6 stops being a fan-out factory and becomes a fill request executor.

But — and this is the architectural caveat the external reviewers all surfaced — **the inversion creates a new problem**: when you stop generating at supply scale, every miss becomes visible. The current system's waste is also its safety net. The new architecture has to design IN the things the old one got for free (resilience to thin pools, diversity, freshness).

---

## 2. The proposed full pipeline — bird's-eye view

```
┌───────────────────────────────────────────────────────────────────────────┐
│                              EXISTING UPSTREAM                            │
│                                                                           │
│  RSS feeds  →  Ingest (every 6h)  →  f.raw_content_item                   │
│                                            ↓                              │
│                                f.canonical_content_item (deduped)         │
│                                            ↓                              │
│                                  f.canonical_content_body (full text)     │
│                                            ↓                              │
│                              R4 classifier  →  content_class label        │
│                                            ↓                              │
│                            (vertical mapping via t.content_vertical)      │
│                                            ↓                              │
│                         CANONICAL LANDS WITH: class + vertical + body     │
└───────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌───────────────────────────────────────────────────────────────────────────┐
│                          NEW MIDDLE LAYER (REBUILT)                       │
│                                                                           │
│       ┌──────────────────┐                ┌──────────────────┐            │
│       │   m.signal_pool  │ ◄─────────────►│      m.slot      │            │
│       │  (materialised)  │                │   (materialised) │            │
│       │                  │                │                  │            │
│       │  per-client view │                │ from schedules + │            │
│       │  scored, fresh   │                │ format demand    │            │
│       └────────┬─────────┘                └────────┬─────────┘            │
│                │                                   │                      │
│                └─────────────► FILL ◄──────────────┘                      │
│                                  │                                        │
│                                  │  pre-generation quality gate           │
│                                  │  (skip if pool too thin)               │
│                                  ↓                                        │
│                         m.slot_fill_attempt                               │
│                         (audit row w/ pool snapshot)                      │
│                                  ↓                                        │
│                         AI synthesis (1-N items)                          │
│                                  ↓                                        │
│                         m.post_draft (attached to slot)                   │
└───────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌───────────────────────────────────────────────────────────────────────────┐
│                          EXISTING DOWNSTREAM                              │
│                                                                           │
│      Auto-approver  →  m.post_publish_queue  →  Publishers  →  Live       │
└───────────────────────────────────────────────────────────────────────────┘
```

The middle layer is the redesign. Upstream is unchanged. Downstream is unchanged.

---

## 3. Layer-by-layer design

### 3.1 Feeds & canonicalisation (unchanged, expectations clarified)

Stays as-is. Ingest every 6h, normalise, dedup into canonicals. Already working.

**What changes is what we expect from this layer.** Today, ~50 canonicals/day is "the input volume." In the new model, that's **the pool depth**. If a vertical has thin coverage (Invegent's discovery problem — Grade D adequacy), the pool runs dry and slots skip or fall back to evergreen. That's a feed-discovery problem, not a pipeline problem.

**Implication:** the new architecture surfaces feed coverage gaps faster. Pool depth becomes a first-class observability metric. The existing pool-adequacy diagnostic (R5 v1.4) already grades this — A/B/C/D. We extend it to be a real-time concern not a one-shot health check.

### 3.2 R4 Classification (unchanged but expanded)

Today R4 labels canonicals with one of 6 content_class values: stat_heavy, multi_point, timely_breaking, educational_evergreen, human_story, analytical.

This stays. But the new architecture uses class labels in two new ways:

1. **Pool freshness rules per class.** Timely_breaking has a 6h freshness horizon; educational_evergreen has none. The pool-membership rules are class-aware.
2. **Format affinity per class.** Already encoded in `t.class_format_fitness` (60-row matrix). The new architecture uses this matrix as the primary lens for "does this signal fit this slot?"

🟡 **OPEN ARCHITECTURAL QUESTION 1:** Are 6 classes enough, or do we need more granularity?

The reviewers noted "R5 was designed for matching, not ranking within scarcity." Translation: when the pool is thin, R5 might pick the same item repeatedly because all alternatives score lower. More granular classes would give R5 more dimensions to differentiate on.

Options:
- A) Keep 6 classes, accept the limitation
- B) Add sub-classes (e.g. timely_breaking → policy_announcement, market_event, regulatory_change)
- C) Add orthogonal dimensions (sentiment, complexity, geographic_scope)

My lean: **A for v1, but log "near-miss" pool selection so we know when granularity is the bottleneck.** Add classes when data shows we need them.

### 3.3 Vertical & domain mapping — the routing layer

Existing infrastructure (`t.content_vertical`, `c.client_content_scope`) already maps clients to verticals (NDIS Yarns → NDIS, Property Pulse → Real Estate). This is the routing layer that determines which canonicals are *eligible* for which client's pool.

🔥 **LOAD-BEARING DECISION 1:** Pool scope — client-scoped, vertical-scoped, or hybrid?

This is the single biggest architectural choice in the redesign. Three options:

**Option A — Pool per client.** Each client has its own pool table, populated independently. NY's pool only contains canonicals matched to NY's vertical scope.
- Pro: simple mental model, each client's pool is isolated, easy to debug
- Con: duplicate work — same NDIS canonical scored against NY pool AND CFW pool independently. Storage and compute waste at scale.

**Option B — Pool per vertical, client filter.** One pool exists per vertical (NDIS pool, Property pool). Clients query their vertical's pool with their own preferences applied at fill-time.
- Pro: one canonical scored once for vertical-level fit. Storage efficient. Adding a new client in the same vertical is instant — they share the existing pool.
- Con: client-specific preferences (e.g. NY emphasises participant stories, CFW emphasises clinical updates) must be applied as filters at fill-time, not as pool filters. More complex query logic.

**Option C — Hybrid: pool per (vertical, format).** Pool is partitioned both by vertical AND by format-fit. NDIS-carousel pool, NDIS-image_quote pool, Property-carousel pool. Client filters at fill time.
- Pro: format-fit pre-computed, fill-time queries are cheap. Maps directly to slot demand.
- Con: more pool tables (vertical × format = 4 verticals × 7 formats = 28 pools). Eviction logic per pool partition.

My lean: **Option B (pool per vertical)** as the right v1 default. Reasoning:
- New verticals (Aged Care, Mental Health, etc.) are first-class additions — vertical scoping makes that clean
- Multi-client per vertical is the expected shape (NY + CFW share NDIS pool)
- Format filtering at query time is cheap if `r5_fitness_score` is indexed

Option C is a v2 optimisation if pool query becomes expensive at scale.

**Cross-vertical signals:** A "Federal Budget" canonical might be relevant to ALL verticals. The vertical mapping needs to be many-to-many (`canonical_id ←→ vertical_id`), not one-to-one. Already supported in current schema.

### 3.4 The Pool — first-class concept (NEW)

Currently there is no explicit pool table. The closest thing is "canonicals with content_body, classified, R5-matchable" — implicit, query-shaped.

**Proposal: introduce `m.signal_pool` as a materialised, time-windowed, vertical-scoped table.**

```
m.signal_pool
  ────────────────
  pool_entry_id      uuid (PK)
  vertical_id        uuid (FK → t.content_vertical)
  canonical_id       uuid (FK → f.canonical_content_item)
  content_class      text (denorm from R4 for query speed)
  fitness_score_max  numeric (best fitness across all formats)
  fitness_per_format jsonb ({"image_quote": 0.82, "carousel": 0.65, ...})
  pool_entered_at    timestamptz
  pool_expires_at    timestamptz (calculated from class freshness rules)
  is_active          boolean (true while in window)
  used_in_slots      uuid[] (audit — which slots have used this canonical)
```

**How does a canonical enter the pool?**

A trigger on `f.canonical_content_body` (when fetch_status='success' AND R4 classifier has labelled). For each vertical the canonical is mapped to (via taxonomy), insert one pool row.

**How does a canonical exit the pool?**

Three eviction paths:
1. **Time-based:** `pool_expires_at < NOW()`. Set `is_active=false`. Class-aware: timely_breaking expires after 6h, analytical after 72h, evergreen never (effectively).
2. **Use-based:** Once used in a slot for a client, optionally evict from that client's view (depends on dedup policy below).
3. **Score-based:** If pool depth > threshold AND newer higher-scoring canonical exists, evict lowest-scoring entry. Prevents pool from growing unbounded for hot vertical.

🟡 **OPEN ARCHITECTURAL QUESTION 2:** How do freshness rules get configured?

Options:
- A) Hard-coded per content_class in code (cheap, inflexible)
- B) `t.class_freshness_rule` table (configurable, observable)
- C) Per-client override on top of class default (most flexible, most complexity)

My lean: **B for v1.** Per-client overrides (C) is a v2 feature when client demand justifies it.

🔥 **LOAD-BEARING DECISION 2:** Materialised pool vs virtual pool

The proposal above is a materialised pool. The alternative is virtual: no `m.signal_pool` table; the pool is just a query against `f.canonical_content_item` filtered by class freshness rules at fill-time.

| Aspect | Materialised | Virtual |
|---|---|---|
| Query speed at fill-time | Fast (indexed table) | Slower (joins canonicals + R4 + R5) |
| Storage cost | Yes (~thousands of rows) | None |
| Observability | High (queryable as a table) | Low (only visible mid-query) |
| Audit "what was in the pool at 10:01am?" | Trivial (point-in-time query) | Hard (need historical snapshot) |
| Dashboard surfacing | Native (just SELECT) | Requires query layer |
| Eviction logic | Explicit (cron sweep) | Implicit (look-back window in query) |
| Bug surface | More (sync drift between pool and source) | Less (always reflects source) |

My lean: **Materialised.** Audit + dashboard + observability win. Pool sync drift is preventable with `pool_entered_at` and a daily reconciliation job.

### 3.5 The Slot — concrete materialised events (NEW)

Today, `c.client_publish_schedule` holds recurring rules ("every Mon/Wed/Fri at 10am AEST FB image_quote for NY"). These rules are not materialised — they're evaluated at scheduler-fire-time.

**Proposal: materialise rules into concrete `m.slot` rows.**

```
m.slot
  ────────────────
  slot_id              uuid (PK)
  client_id            uuid (FK → c.client)
  platform             text
  scheduled_publish_at timestamptz (the actual moment)
  format_preference    text[] (e.g. ['carousel', 'image_quote'] — first match wins)
  fill_window_opens_at timestamptz (e.g. publish - 2h)
  fill_lead_time_min   int (per-slot override)
  status               text (future, pending_fill, filled, approved, published, skipped, failed)
  source_rule_id       uuid (FK → c.client_publish_schedule, NULL for ad-hoc)
  source_kind          text ('recurring', 'one_off', 'breaking_news_insert')
  filled_at            timestamptz
  filled_canonical_ids uuid[] (which pool items contributed)
  filled_draft_id      uuid (FK → m.post_draft)
  skip_reason          text (if status=skipped)
  created_at           timestamptz
  updated_at           timestamptz
```

**Slot lifecycle:**

```
   future ──[fill_window_opens]──> pending_fill ──[fill_succeeds]──> filled
                                        │                              │
                                        ├──[no_pool]──> skipped         │
                                        ├──[low_quality]──> skipped     ├──[approved]──> approved ──[published]──> published
                                        └──[error]──> failed             └──[rejected]──> rejected (back to skipped or retry)
```

🔥 **LOAD-BEARING DECISION 3:** Materialiser cadence

Slots get materialised from rules by a periodic sweep. How often?

Options:
- A) Nightly materialiser (once per day, builds 7 days ahead)
- B) Hourly materialiser (smaller increments, lower lag on rule changes)
- C) Trigger-based (rule change → re-materialise affected slots immediately)

My lean: **A + C.** Nightly default for predictability, trigger-based on rule changes so dashboard edits propagate fast.

🟡 **OPEN ARCHITECTURAL QUESTION 3:** Slot horizon — how far ahead?

7 days vs 14 days vs 30 days.

7d is the minimum useful horizon (a week's view of upcoming publishes). 30d is overkill for v1 because schedules change too often. 14d is a defensible middle ground if PK wants 2-week dashboard visibility.

Slot horizon affects:
- Materialiser sweep size (30d × 4 clients × 3 platforms × 5 slots/week ≈ 1700 rows)
- Pool fill timing (slots far in future don't fill; only those within `fill_window_opens_at` do)
- Schedule-change propagation (changes affect all materialised slots, need cancel+remat)

My lean: **7d for v1, configurable later.** Avoids over-materialisation for clients with frequently-changing schedules.

### 3.6 The Fill — when slot meets pool (the new R6)

This is the heart of the redesign. The new "fill" replaces the current `m.seed_and_enqueue_ai_jobs_v1` entirely.

**Trigger:** A pg_cron job firing every 5-10 min, OR a `pg_notify` listener triggered by slot status transitions. (Cron is simpler for v1.)

**The fill function:**

```
m.fill_pending_slots(p_limit int DEFAULT 5)
  ─────────────────────────────────────────────
  1. Lock candidate slots:
       SELECT FROM m.slot
       WHERE status = 'pending_fill'
         AND fill_window_opens_at <= NOW()
         AND scheduled_publish_at > NOW()
       ORDER BY fill_window_opens_at ASC
       LIMIT p_limit
       FOR UPDATE SKIP LOCKED

  2. For each slot:
       a. Determine vertical from client_id
       b. Query the vertical's pool, filtered by:
          - is_active = true
          - format-fit (top score for this slot's format_preference)
          - dedup rules (see Section 4.2)
          - quality threshold (see Section 4.3)
       c. Apply quality gate:
          - IF pool returns < min_pool_size → mark slot 'skipped:thin_pool'
          - IF best fitness < min_fitness_threshold → mark slot 'skipped:low_fitness'
          - IF fallback_policy = evergreen → query t.evergreen_library → use that
          - IF none of the above → proceed
       d. Capture pool snapshot to m.slot_fill_attempt (audit)
       e. Build AI prompt (see Section 3.7)
       f. Insert m.ai_job with input_payload = {pool_items[], slot_id, format, brand}
       g. Mark slot status='filled' optimistically (rolled back if AI fails)
```

**Worker pickup:** existing ai-worker picks up the m.ai_job, makes the Claude call, writes m.post_draft. The trigger that currently enqueues from drafts to publish queue (M11 fix) continues to work.

**Failure handling:**
- AI call fails: mark slot status='failed', slot eligible for retry on next fill-cron tick (with backoff)
- AI returns garbage: handled by approval layer (auto-approver or manual review)
- Auto-approver rejects: slot status reverts to 'pending_fill' for one re-attempt, then 'skipped:rejected_repeatedly'

### 3.7 The Synthesis prompt — re-thought

Today, ai-worker's prompt is shaped around a single canonical: "Given this article + brand voice, write a post."

The new architecture's prompt is shaped around a slot + a bundle of pool candidates: "Given these N candidate items + this slot's format requirements + brand voice, synthesise ONE draft."

🟡 **OPEN ARCHITECTURAL QUESTION 4:** Multi-item synthesis vs single-item draft

Two options:
- **Multi-item synthesis:** AI gets 5-10 candidates, picks/weaves implicitly. Better for carousels (multiple angles in one post). Risk: AI might fabricate connections, get "lost in the middle."
- **Single-item draft:** Pre-rank candidates outside the AI; pass top-1 to AI. Simpler, more focused, less hallucination risk. Loses richness for carousel-shaped formats.

The reviewers split on this. Two said multi-item is correct for carousels; two warned about AI hallucinating connections.

My lean: **Format-aware.** image_quote and timely_breaking → single-item (top-fitness pool entry). carousel and analytical → multi-item bundle (top 3-5). text → multi-item (richer context aids longer-form). video formats → single-item (script needs one strong narrative).

This goes in `t.format_synthesis_policy`:
```
format_key   | synthesis_mode  | bundle_size_max
─────────────┼─────────────────┼────────────────
image_quote  | single_item     | 1
carousel     | multi_item      | 5
text         | multi_item      | 4
video_*      | single_item     | 1
```

🟡 **OPEN ARCHITECTURAL QUESTION 5:** Prompt caching strategy

Anthropic supports prompt caching (90% discount on cached prefixes). Brand voice + format rules + system prompt are stable per (client, format) and don't change between fills. These could be cached.

Calculation: if cached prefix is 5k tokens and uncached suffix is 2k tokens per fill:
- Without caching: 7k input × $3/M = $0.021 per call
- With caching: 5k cached × $0.30/M + 2k uncached × $3/M = $0.0015 + $0.006 = $0.0075 per call (~64% savings)

For 60 fills/week, cached saves ~$3.60/month. Marginal but real. Worth doing if Anthropic SDK supports it cleanly.

### 3.8 Approval & publishing (unchanged)

Auto-approver still scores drafts, sets approval_status. The M11 trigger still enqueues approved drafts to `m.post_publish_queue`. Publishers still call `m.publisher_lock_queue_v1` with platform throttles.

**One small addition:** when a draft is rejected (manually or auto), emit a signal back to its source slot — slot status becomes 'pending_fill' again, eligible for one re-attempt with a different pool selection. After a second rejection, slot becomes 'skipped:rejected'. Prevents infinite regeneration loops.

---

## 4. Cross-cutting concerns

### 4.1 Empty pool fallback

When a slot's fill window opens and the pool query returns < min_pool_size or all candidates fail quality threshold, the system needs a graceful fallback path.

🔥 **LOAD-BEARING DECISION 4:** Fallback policy

Three options for what to do:

- **A) Skip the slot.** Simplest. Slot status → 'skipped:thin_pool'. Client misses today's post.
- **B) Stretch look-back.** Try expanded look-back (e.g. 7d for a class that normally uses 24h). Risk: stale content.
- **C) Pull from evergreen library.** Separate `t.evergreen_library` table holds curated foundational content. When pool is thin, fill from evergreen.

The reviewers were unanimous: **C is the right answer, never A as default, never B unless explicitly opted in.**

**Proposed evergreen architecture:**

```
t.evergreen_library
  ──────────────────
  evergreen_id        uuid (PK)
  vertical_id         uuid
  format_keys         text[] (which formats this can fill)
  content_summary     text (for AI prompt)
  source_canonical_id uuid (NULL for hand-curated)
  last_used_at        timestamptz (rotation tracking)
  use_cooldown_days   int (e.g. 90 — don't reuse within window)
  is_active           boolean
  created_at          timestamptz
```

Rotation logic: when fall back triggers, query evergreen library for active items matching slot's format and vertical, ordered by `last_used_at ASC`, return least-recently-used. Set `last_used_at = NOW()` after fill.

🟡 **OPEN ARCHITECTURAL QUESTION 6:** Where do evergreen items come from?

- A) Hand-curated by PK (clean, slow to scale)
- B) AI-generated from slow-news-day pool (recursive, but cheap)
- C) Selected from canonical pool that has crossed an "ageing" threshold (e.g. canonical that's been useful before)

My lean: **A for v1.** Tens of items per vertical, hand-written by PK. ~3 hours of one-off work to seed each vertical with 20-30 evergreen pieces.

🟡 **OPEN ARCHITECTURAL QUESTION 7:** When is "the pool is thin"?

`min_pool_size` and `min_fitness_threshold` are policy values. Per-format defaults? Per-client overrides?

Suggested defaults:
- min_pool_size: 3 candidates above min_fitness for multi-item formats; 1 for single-item
- min_fitness_threshold: 0.6 (R5 returns 0.0-1.0 fitness scores)

These should be in `t.format_quality_policy` table, configurable.

### 4.2 Dedup across slots/clients/time

🔥 **LOAD-BEARING DECISION 5:** Dedup scope

Today's R5 v1.4 dedup blocks "same canonical re-seeded for same slot." That's a narrow rule. New architecture needs broader rules:

| Dedup scope | Block rule | Rationale |
|---|---|---|
| Same slot | Already-filled slot can't be re-filled with different canonical | Slot has unique identity |
| Same canonical, same client, same day | Don't reuse | Followers see repetition |
| Same canonical, same client, same week | Don't reuse | Brand looks unfocused |
| Same canonical, same client, ever | Don't reuse | "Recycled" feel |
| Same canonical, different platforms, same day | Allow (different angle) | Multi-platform coverage |
| Same canonical, different clients (NY + CFW share NDIS) | Allow | They're different brands |
| Near-duplicate (semantic similarity, not exact same canonical) | Block within client/week? | Hardest case |

The "near-duplicate" case (semantic similarity, not literal same canonical) is the silent killer the reviewers warned about. Two news items about the same NDIS reform from different sources could drift into "same content, different framing" without the dedup catching it because the canonical_ids are different.

🟡 **OPEN ARCHITECTURAL QUESTION 8:** Semantic dedup

Options:
- A) Embedding-based similarity check (compare canonical embeddings, block if cosine > threshold). Cost: embedding generation per canonical. Quality: high.
- B) AI similarity check (cheap LLM call asks "are these two items substantially similar?"). Cost: per-pair LLM call. Quality: highest.
- C) Don't address semantic dedup in v1. Accept some near-duplicate posting risk.

My lean: **C for v1, plan for A in v2.** Embedding infrastructure is a sub-project on its own. Risk of near-duplicate is real but bounded — you have ~5 publishes/week per platform per client, the chance of two near-duplicate canonicals firing in one week is low.

### 4.3 Quality gates before generation

Reviewers emphasised: **don't spend the AI call if the pool is thin.** The current architecture happily generates drafts from weak signals because it doesn't ask "is this worth generating?"

**Proposed quality gates** (run BEFORE AI call):

1. Pool size gate (Section 4.1)
2. Fitness threshold gate (Section 4.1)
3. Diversity gate: if multi-item synthesis, are the items actually distinct? (e.g. 5 items all from same source URL pattern → fail)
4. Recency gate: for class=timely_breaking, fail if best canonical's fetched_at > 12h ago
5. Brand-voice gate: optional, AI score check on whether the content can be shaped to brand voice (more advanced, v2)

If ANY gate fails: skip the slot with explicit `skip_reason`. Skip is cheaper than generate-then-reject.

### 4.4 Time zones

Most ICE timestamps are stored UTC. Display is AEST. Throttle in publisher lock RPC uses `date_trunc('day', NOW())` which is UTC-based. We saw today that this causes confusion (NY FB looked like 3/cap-2 in AEST but was 2/cap-2 in UTC).

**Proposal: standardise on AEST for slot logic, UTC for storage.**

- `m.slot.scheduled_publish_at` stored UTC, but slot calendar always displayed AEST
- Throttle counters in lock RPC: count per AEST day, not UTC day. Modify the CTE: `WHERE p.created_at >= date_trunc('day', NOW() AT TIME ZONE 'Australia/Sydney') AT TIME ZONE 'Australia/Sydney'`
- Pool freshness windows: timezone-naïve durations (e.g. "24h" not "since yesterday"). UTC-based math is fine for durations, only date boundaries need AEST.

🟡 **OPEN ARCHITECTURAL QUESTION 9:** Should the publisher throttle migrate to AEST-day basis, or keep UTC?

Arguments for AEST: matches how PK thinks; matches how clients perceive "today's posts."
Arguments for UTC: existing data, simpler math, no DST issues.

My lean: **AEST.** The system serves Australian content businesses; their day boundary is AEST. Tonight's FB throttle confusion is precedent — the UTC approach is technically defensible but psychologically misleading.

### 4.5 Observability & instrumentation

The reviewers' shared warning: silent failure modes. Architecture needs observability built in, not added later.

**Mandatory instrumentation:**

| Metric | Source | Why it matters |
|---|---|---|
| Pool depth per (vertical, format) | `m.signal_pool` count where active | Catches feed-coverage issues |
| Slot fill success rate | `m.slot.status` distribution | Catches systemic skipping |
| Skip reason breakdown | `m.slot.skip_reason` | Distinguishes thin-pool vs low-fitness vs error |
| AI call cost per slot | `m.slot_fill_attempt.cost_usd` | Live cost tracking |
| Pool freshness distribution | Age of canonicals at fill-time | Catches "we're publishing yesterday's news" |
| Same-canonical reuse rate | Cross-slot canonical_id tracking | Catches dedup gaps |
| Auto-approver pass rate | Existing | Catches drift in synthesis quality |
| Engagement per slot (Phase 2.1) | When insights worker exists | Catches actual outcome quality |

These all become dashboard tiles. The current dashboard has health tiles for cron and queues; this adds a "pool & slot health" section.

🔥 **LOAD-BEARING DECISION 6:** Dashboard build scope for v1

Two options:
- A) Bare minimum dashboard (just enough to see if it's working)
- B) Full instrumentation dashboard (every metric above with charts)

A is faster to ship. B is the foundation for tuning the architecture once it's running.

My lean: **A for v1 (within the build window), B as a fast follow.** The risk is shipping A and never doing B because the system "looks fine."

### 4.6 Versioning & rollback

The pool composition logic, scoring weights, format affinity matrix — all of these will evolve. The architecture should support:

- **Versioned scoring weights:** `t.class_format_fitness` already has `version` and `is_current` columns. Continue using.
- **Audit trail in `m.slot_fill_attempt`:** every fill captures the pool snapshot + scoring weights version + AI model version + prompt version. So you can ask "why did NY-FB-Tuesday-10am get THIS draft?" months later.
- **Rollback path:** if a fitness weight change degrades quality, can we revert quickly? Versioned tables make this trivial. The harder rollback is a draft generated under v1 logic — that draft is published, no rollback. So changes need to be tested in shadow before going live.

---

## 5. Open architectural questions (gathered)

A consolidated list. Some are repeated from above for completeness.

| # | Question | Section | Lean |
|---|---|---|---|
| 1 | Are 6 content classes enough? | 3.2 | A: yes for v1, log near-misses |
| 2 | Where do freshness rules live? | 3.4 | B: `t.class_freshness_rule` table |
| 3 | Slot materialiser horizon? | 3.5 | 7 days |
| 4 | Multi-item vs single-item synthesis? | 3.7 | Format-aware (table-driven) |
| 5 | Prompt caching strategy? | 3.7 | Use Anthropic prompt caching, save ~60% on cached prefix |
| 6 | Where do evergreen items come from? | 4.1 | A: hand-curated by PK for v1 |
| 7 | When is "pool is thin"? | 4.1 | min 3 items above 0.6 fitness for multi; min 1 for single |
| 8 | Semantic dedup needed? | 4.2 | C: defer to v2 |
| 9 | Throttle: AEST or UTC day? | 4.4 | AEST |
| 10 | Materialised pool vs virtual? | 3.4 | Materialised |
| 11 | Pool scope: client vs vertical? | 3.3 | Vertical |
| 12 | Dashboard scope for v1? | 4.5 | A minimum + B as fast follow |

PK to weigh in on each. Anything I marked "A: lean" without resistance is a default; if PK disagrees, the architecture changes.

---

## 6. Data model summary — what stays, what changes

### Stays unchanged

| Table | Purpose |
|---|---|
| `f.feed_source` | Feed registry |
| `f.canonical_content_item` | Deduped news items |
| `f.canonical_content_body` | Full text |
| `t.content_class` | R4 label vocabulary |
| `t.content_vertical` | Vertical taxonomy |
| `t.platform_format_mix_default` | D167 mix defaults |
| `c.client_format_mix_override` | D167 client overrides |
| `c.client_publish_schedule` | Recurring schedule rules (input to materialiser) |
| `c.client_publish_profile` | Client-platform credentials/throttle |
| `c.client_source` | Client-feed mapping |
| `c.client_content_scope` | Client-vertical mapping |
| `m.ai_job` | Job queue (unchanged shape, different input_payload schema) |
| `m.post_draft` | Drafts (gain a `slot_id` FK, drop nothing) |
| `m.post_publish_queue` | Publish queue (unchanged) |
| `m.post_publish` | Publish record (unchanged) |
| All publisher EFs | Unchanged |

### Repurposed

| Table/Function | Old purpose | New purpose |
|---|---|---|
| `m.match_demand_to_canonicals` | Bulk match for R5 seeding | Score one canonical against one slot's format requirements |
| `t.class_format_fitness` | Fitness matrix for seeding | Same matrix, queried at fill-time per slot |
| `m.build_weekly_demand_grid` | Used for D167 demand projection | Input to slot materialiser (how many slots per format per week) |
| `m.post_seed` | Per-canonical seed records | Either retired OR repurposed as "fill attempts" — TBD per below |

🟡 **OPEN ARCHITECTURAL QUESTION (TABLE):** Retire `m.post_seed` or transform it?

Option: rename `m.post_seed` to `m.slot_fill_attempt`, add a slot_id column, treat it as the audit log for each fill attempt. Avoids creating a new table, preserves history.

Option: retire `m.post_seed` (mark deprecated), create new `m.slot_fill_attempt` with cleaner schema. More work, cleaner result.

My lean: rename + extend. Less migration pain.

### New tables

| Table | Purpose |
|---|---|
| `m.signal_pool` | The materialised pool (Section 3.4) |
| `m.slot` | Concrete slot rows (Section 3.5) |
| `m.slot_fill_attempt` | Audit per fill (or repurposed `m.post_seed`) |
| `t.evergreen_library` | Fallback content track (Section 4.1) |
| `t.class_freshness_rule` | Pool freshness per class (Section 3.4) |
| `t.format_synthesis_policy` | Multi-item vs single-item per format (Section 3.7) |
| `t.format_quality_policy` | Min pool size + fitness threshold per format (Section 4.3) |

### New functions

| Function | Purpose |
|---|---|
| `m.materialise_slots(p_horizon_days int)` | Cron-fired, builds slot rows from rules |
| `m.refresh_signal_pool(p_vertical_id uuid)` | Triggered on canonical entry, populates pool |
| `m.expire_signal_pool()` | Cron-swept, marks expired pool entries inactive |
| `m.fill_pending_slots(p_limit int)` | The new R6 — Section 3.6 |
| `m.evaluate_slot_quality(p_slot_id uuid)` | Returns gate-pass/gate-fail with reason (Section 4.3) |

### Removed

| Item | Reason |
|---|---|
| `m.seed_and_enqueue_ai_jobs_v1` | Replaced by `m.fill_pending_slots` |
| `seed-and-enqueue-facebook-every-10m` (cron 11) | Replaced by `fill-pending-slots-every-Nm` |
| `seed-and-enqueue-instagram-every-10m` (cron 64) | Replaced |
| `seed-and-enqueue-linkedin-every-10m` (cron 65) | Replaced |

---

## 7. Risk register

These are the silent failure modes the reviewers surfaced PLUS my own additions, with mitigations.

| # | Risk | Mitigation |
|---|---|---|
| R1 | Pool starvation loops — first slot consumes top items, later slots get scraps | Pool entries don't auto-evict on use; dedup is per-slot/per-client, not pool-wide |
| R2 | Stale content bias when fill window too early | Per-class freshness rules (Section 3.4); re-poll pool at fill-time, not at materialisation |
| R3 | Brittle precision — every miss visible | Quality gates make skips explicit, not silent failures; observability surfaces skip rate |
| R4 | "Slot filled" ≠ "right content" | Engagement back-feed (Phase 2.1) eventually closes loop; for now, manual review remains |
| R5 | Retry cost creep | Hard retry cap per slot (1 re-attempt, then skip); no infinite loops |
| R6 | Pool look-back creep | Look-back is class-based, not slot-based — can't grow per slot |
| R7 | Schedule rule drift after slot materialisation | Trigger-based re-mat on rule changes (Section 3.5) |
| R8 | AI hallucinates connections in multi-item synthesis | Bundle size capped (Section 3.7); approval layer catches gross errors |
| R9 | Race condition: pool refresh during fill | `FOR UPDATE SKIP LOCKED` on slot rows + transactional pool snapshot at fill-time |
| R10 | Time-zone bugs (today's UTC/AEST issue) | Standardise: AEST for date-sensitive logic, UTC for storage |
| R11 | Cost from prompt size growth | Prompt caching (Section 3.7); periodic prompt audit |
| R12 | Slot misses cluster on weekends/holidays | Materialiser respects calendar exceptions (rule extension) |
| R13 | Migration risk: existing 154 drafts in queue | Drain or run dual systems briefly during cutover |
| R14 | Vertical-shared pool means cross-client surprises | Fill-time client filter applies brand voice + scope before AI call |
| R15 | Evergreen library "fades" as items go stale | `last_used_at` rotation + manual freshness reviews monthly |

---

## 8. Implementation strategy

PK said willing to put in 10-20 hours, possibly more, with funds. So a real build plan, not a half-measure.

### Phase A — Foundation (estimated 4-6 hours)

Build the data model + read-only paths. NO behaviour change to running pipeline.

1. Create `m.signal_pool` table + indexes
2. Create `m.slot` table + indexes
3. Create `t.class_freshness_rule`, `t.format_synthesis_policy`, `t.format_quality_policy` + seed initial values
4. Create `t.evergreen_library` (empty — content seeded later)
5. Create `m.materialise_slots()` function (read schedule, write slot rows)
6. Create `m.refresh_signal_pool()` trigger on canonical body fetch
7. Create `m.expire_signal_pool()` cron
8. Verify pool fills correctly without affecting current pipeline (R6 still paused)

**Outcome:** Tables exist, pool reflects reality, slots materialised. Old pipeline still owns generation. Side-by-side observation possible.

### Phase B — Fill function in shadow (estimated 3-5 hours)

Build the fill function but route output to shadow drafts, not real publish queue.

1. Create `m.fill_pending_slots()` function with all quality gates
2. Add `is_shadow` column to `m.post_draft` (default false; shadow fills set true)
3. Run fill cron in shadow mode for one week
4. Compare shadow drafts to what current pipeline would have produced
5. Tune fitness thresholds, quality gates, synthesis prompts

**Outcome:** Confidence the fill function works. Manual evaluation of shadow draft quality.

### Phase C — Cutover (estimated 2-4 hours)

Switch one client/platform to slot-driven, leave others on old pipeline. Observe.

1. Start with NY Facebook (lowest stakes — already at cap)
2. Pause old seed cron for that platform/client only (already paused — no action needed)
3. Activate fill cron in production mode for NY FB
4. Watch for one week — quality, cost, cron success rate
5. If clean: extend to NY IG, NY LI, then PP across platforms
6. CFW + Invegent later (those are r6_enabled=false anyway)

**Outcome:** Live slot-driven generation for NY FB, demonstrable cost & quality.

### Phase D — Decommission (estimated 1-2 hours)

When all clients are on slot-driven and quality matches/exceeds old pipeline:

1. Drop `m.seed_and_enqueue_ai_jobs_v1`
2. Decommission cron 11, 64, 65
3. Update docs, decisions log
4. Archive `m.post_seed` (or rename to `m.slot_fill_attempt` per OAQ)

### Phase E — Evergreen seeding (estimated 3-4 hours, separate session)

PK + Claude pair-write 20-30 evergreen items per active vertical:

1. NDIS evergreen library (NY + CFW share)
2. Property evergreen library (PP)
3. Invegent evergreen library (cross-vertical, smaller)

This is content work, not engineering. Defer until Phase B is in shadow and we know the format requirements precisely.

### Total estimated effort

10-20 hours across 4-6 working sessions, spread over 1-2 weeks.

Costs for shadow runs: ~$1-3 (one week of shadow drafts at projected volume).
Costs for live cutover: starts at ~$5/month, ramps as platforms cut over.

---

## 9. The questions left for PK

These are the architectural calls only PK can make, in priority order:

1. **OAQ 4 + 11 (load-bearing 1, 4, 5):** Pool scope (client vs vertical). Synthesis mode (single-item vs multi-item per format). Fallback policy (skip vs evergreen).
2. **OAQ 9:** Throttle migration to AEST? Affects existing throttle behaviour for FB+IG.
3. **OAQ 6:** Evergreen content sourcing approach.
4. **OAQ 3, 7:** Time/quality thresholds (slot horizon, min pool size, min fitness).

The rest can be set as defaults and tuned later without breaking the architecture.

---

## 10. What I deliberately left out

- Business-side framing (per PK's instruction)
- The "should we build it now" debate (PK's call)
- Implementation details below the design level (will live in Phase-specific briefs)
- Concrete code examples (will live in the implementation work)
- Specific cost re-projections beyond Section 8 (we already have multiple from reviewers)

---

## 11. Reading order if you want to skim

If 60-90 min for the full read isn't realistic, prioritise:

1. **Section 1** — frames the disease, not just the symptom (5 min)
2. **Section 2 diagram** — the bird's-eye flow (2 min)
3. **Section 3.4 + 3.5 + 3.6** — pool, slot, fill (the new heart of the system) (15 min)
4. **Section 4.1 + 4.2 + 4.3** — empty pool, dedup, quality gates (10 min)
5. **Section 6** — data model table (5 min)
6. **Section 9** — questions awaiting your call (5 min)

That's ~40 min for the load-bearing material.

---

*End of brief. Ready for PK pushback or external review.*
