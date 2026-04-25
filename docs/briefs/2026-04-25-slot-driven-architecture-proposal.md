# Proposal — Slot-Driven Pipeline Architecture

**Date:** 25 April 2026 Saturday evening
**Status:** Proposal for review — NOT IMPLEMENTED
**Authors:** PK + Claude (in-chat dialogue)
**Reviewers requested:** risk (primary), strategist (secondary)

---

## TL;DR

The current R6 seed_and_enqueue architecture produces 477 drafts/day to feed a publishing capacity of 32/day. ~93% of generated drafts never publish. Anthropic spend is running at ~$190/month against a $18/month target — 10× over budget.

This brief proposes inverting the unit of work: instead of "every signal → many drafts," the new model is "every approaching slot → one draft from current pool." Cost projection: ~$2-10/month, scaling linearly with slot count not signal count.

PK has paused all 3 R6 seed crons (jobid 11, 64, 65) as of ~19:30 AEST 25 Apr to stop the cost bleed during this design discussion. 154 existing approved+queued drafts cover ~5 days of publishing capacity.

This is a structural redesign, not a tuning fix. Reviewer asked to challenge the proposal before implementation begins.

---

## 1. Discovery — what triggered this

PK noticed three things returning to work tonight:
1. Another Anthropic invoice in Gmail (today $11.02, 4 receipts in 7 days = ~$44 = ~$190/mo run rate)
2. Posts on FB/IG/LinkedIn appeared excessive vs intended publishing schedule
3. Hypothesis: "are NDIS drafts being auto-approved without my review?"

Diagnosis ran through the database in parallel. The headline numbers from today (~13 hours of R6 production):

| Metric | Value |
|---|---|
| ai_jobs created in 24h | 479 |
| ai_jobs failed | 0 |
| ai_jobs with retries | 0 |
| Drafts produced today (R6) | 477 (NY 277 + PP 200) |
| Drafts per platform today | FB 21, IG 228, LI 228 |
| Publish capacity per day | 32 (4 clients × 4 platforms × cap 2/day) |
| Actually published today | 24 (FB 2, IG 4 v1.0.0 historical, LI 18) |
| Throttle bypass on LinkedIn (PP) | 14 published vs cap 2 → **7× over** |
| Email storm to PK inbox | 15 review-notification emails in 7 hours |

The drafts are NOT being auto-approved (PK's hypothesis disproved). They're piling up in `needs_review` state. The cost driver is generation, not approval.

## 2. Root cause — current architecture is signal-first

Visualised in `docs/visuals/2026-04-25-pipeline-explosion.svg` (referenced; raw description in chat).

Signal flow today:

```
RSS feeds (40 sources, continuous)
  ↓
ingest worker (every 6h) — fetches, normalises
  ↓
canonical_content (deduped, ~50/day)
  ↓
R4 classifier (every 5 min) — labels each canonical with content_class
  ↓
R5 matcher — scores fitness per (canonical, platform, format)
  ↓
R6 seed_and_enqueue cron (every 10 min, 144 ticks/day)
  │ For EACH eligible canonical:
  │   For EACH (client, platform, format) slot it matches:
  │     Create 1 ai_job → 1 draft
  ↓
ai-worker → Claude API call PER DRAFT  ← $$$ COST POINT
  ↓
post_publish_queue (M11 trigger enqueues approved drafts)
  ↓
publishers (FB/IG/LI/YT) — throttle 2/day per (client, platform)
  ↓
Actually published: ~32/day max
```

The architectural failure: **one signal can spawn multiple drafts** (one per matching client × platform × format slot). With ~50 canonicals/day producing R5-fitness matches across NY (4 platforms) and PP (3 platforms active), the fan-out reaches 4-10× per canonical.

R5 v1.4's active-seed canonical dedup blocks the same canonical from being re-seeded for the same slot. But it does NOT block one canonical from filling many distinct slots simultaneously. That's the leak.

## 3. The proposed inversion — slot-first

**Current mental model:** "what should we do with this signal?"
**New mental model:** "what does this approaching slot need?"

The slot becomes the unit of work. Each slot in `c.client_publish_schedule` materialises into a concrete TODO at a specific time. As each TODO's "fill window" opens, ICE asks: given Client X's signal pool right now, what fits this slot's format and policy best? AI synthesises one draft. One AI call per slot, ever.

PK's wording: *"the feeds need to bundle for a limited number of hours, probably six hours or four hours, per platform that we have identified, per format that we identified. And then they get to the draft stage for the AI, not before."*

Refined wording: the bundle isn't time-windowed in a fixed way. It's pulled at slot-fill-time, which itself is demand-based (some lead-time before publish). Different slots fire independently.

## 4. Worked example

Client A (NDIS Yarns) Tuesday:
- 10:00 AEST: Facebook image_quote slot
- 11:00 AEST: LinkedIn carousel slot
- 14:00 AEST: Instagram carousel slot

Some lead time before each (proposed: 1-2h before publish):

**08:30 AEST — FB-10:00 fill window opens**
- Pull Client A's signal pool (canonicals from feeds mapped to Client A, last 48h)
- Filter to those R5 has scored as fit for image_quote format
- Hand the top 5-10 (title + summary + class + score) to AI
- AI returns ONE image_quote draft, attached to FB-10:00 slot
- Cost: 1 Claude call (~$0.02)

**09:30 AEST — LI-11:00 fill window opens**
- Same Client A pool (or refreshed if new canonicals arrived)
- Filter to fitness for LinkedIn carousel (probably DIFFERENT canonicals than FB picked)
- AI returns ONE carousel draft
- Cost: 1 Claude call

**12:00 AEST — IG-14:00 fill window opens**
- Same pool (likely refreshed with new news from morning)
- Filter to fitness for IG carousel
- AI returns ONE draft
- Cost: 1 Claude call

**Total for Client A's day: 3 AI calls, 3 drafts, 3 publishes.** Currently this same day generates ~30+ drafts of which ~3 actually publish.

## 5. Cost projection

Current model:
- 4 active clients (NY, PP active R6-driven; CFW, Invegent r6_enabled=FALSE)
- 477 drafts/day × $0.01-0.02 = $4.77-9.54/day = $143-286/month

Proposed model:
- 4 clients × ~5 slots/week × 3 platforms = ~60 slots/week
- 60 AI calls/week × $0.02 = $1.20/week = ~$5/month
- At 10 clients (vertical expansion): ~$12/month
- Linear scaling with slot count, not signal count

Even with 2-3× safety margin for retries and fallbacks, projected monthly stays well under $18 target.

## 6. What gets rebuilt vs what stays

**Stays (already built and useful):**
- `f.feed_source` and ingest pipeline — unchanged
- R4 classifier — labels feed canonicals with content_class. Inputs to slot-fill logic.
- R5 matching layer (`m.match_demand_to_canonicals`) — fitness scoring per (canonical, platform, format) is exactly what slot-fill needs. Re-purposed: instead of seeding all matches above a threshold, slot-fill picks the top-N for ONE specific slot's format.
- `c.client_publish_schedule` — already holds slot configurations as recurring rules
- `c.client_publish_profile` — clients, platforms, throttles unchanged
- ai-worker — unchanged. Still consumes ai_jobs. Volume drops.
- All 5 publishers — unchanged.
- M11 enqueue trigger — unchanged.
- Auto-approver — unchanged.

**Rebuilt (the redesign target):**
- `m.seed_and_enqueue_ai_jobs_v1` (R6) — replaced entirely
- New: slot materialiser that turns recurring schedule rules into concrete future slot rows
- New: slot-fill cron (or trigger) that fires per-slot at fill-window-opens-time
- New: pool query function (per client, time window, format-fit filter)

**Removed:**
- The current R6 fan-out logic
- Per-canonical seed creation
- Possibly cron 11, 64, 65 (replaced with per-slot scheduling)

## 7. Open design questions

These shape the build. Reviewer is asked to challenge the assumptions and surface ones we missed.

### Q1 — Lead time

How far before each slot's publish time does the fill-window open?

Options:
- **A) 1 hour** — freshest pool, but tight for retries if AI fails
- **B) 2 hours** — moderate buffer, still fresh enough
- **C) 24 hours** — very safe for retries, but pool may be 24h stale by publish time
- **D) Per-slot configurable** — different slots may want different lead times

PK leaning: not yet decided. Claude leaning: B (2h) as default with per-slot override option.

### Q2 — Pool look-back

How far back does the canonical pool reach?

Options:
- **A) Fixed 48h for all slots** — simple, predictable
- **B) Per-format** — image_quote=24h, carousel=72h, evergreen=∞
- **C) Per-class** — timely_breaking=6h, analytical=72h, educational_evergreen=∞

PK leaning: not yet decided. Claude leaning: B initially, refine to C later if needed.

### Q3 — Empty pool fallback

What happens when fill-window opens and the pool returns zero matches?

Options:
- **A) Skip the slot** — don't publish today
- **B) Stretch look-back** — try 7-day window, then 14-day
- **C) Use evergreen library** — different content type, separate library
- **D) Per-client policy** — some clients prefer skip, others prefer fallback

PK leaning: not yet decided. Claude leaning: D (configurable), with default = stretch look-back to 7d, then skip.

### Q4 — Same-canonical dedup across slots

NDIS Yarns has FB-10:00 and LI-11:00. Top-fitness canonical for both is the same NDIS reform article. Behaviour?

Options:
- **A) Block** — once a canonical is used by a Client A slot today, no other Client A slot can use it (current R5 v1.4 behaviour, extended)
- **B) Allow** — same news, different angle is legitimate. Two distinct drafts.
- **C) Per-format** — block within same format, allow across formats (FB-image_quote and IG-image_quote dedup; FB-image_quote and LI-carousel allowed)

PK leaning: not yet decided. Claude leaning: A as default (avoids "page is just repeating itself"), C if it produces too many empty pools.

### Q5 — Evergreen as a separate track

"What is an NDIS plan?" content has nothing to do with today's news pool. Where does it come from?

Options:
- **A) Separate library** + separate rotation cron for evergreen-tagged slots
- **B) Pool extends to ∞** for slots flagged "evergreen"
- **C) Don't support evergreen yet** — defer until news-driven flow is stable

PK leaning: not yet decided. Claude leaning: C (defer) for v1; revisit at first paying client signing.

### Q6 — Slot scheduler design

How are recurring schedule rules ("every Mon, Wed, Fri at 10am AEST") materialised into concrete slot rows ("Mon 27 Apr 10am AEST FB image_quote for NDIS-Yarns")?

Options:
- **A) Rolling 7-day materialisation** — pg_cron weekly job creates next week's slot rows
- **B) Just-in-time** — fill-cron computes "what slots are due in next N hours" from rules
- **C) Materialise + just-in-time** — slot rows exist (visible in dashboard), but fill happens against them

PK leaning: not surfaced. Claude leaning: C (best of both — visible upcoming slot calendar in dashboard, draft attaches to known slot row).

## 8. Risks Claude has already considered

This list is for the reviewer to challenge and extend.

1. **Empty pool on a slow news day.** Both NY and PP could have zero canonicals matching slot fit at fill-time. Q3 fallback addresses this, but what if the fallback also returns nothing?

2. **Pool look-back creep.** If "stretch look-back to 7d" is the default, every empty-pool slot then queries 7d of canonicals. R5 fitness scoring across larger pools is more expensive. Could reintroduce cost growth.

3. **Slot-fill timing race.** Two slots for same client at exactly the same time (FB-10:00 + LI-10:00) firing simultaneously may try to use the same top-fitness canonical and conflict on dedup.

4. **Slot scheduler drift.** If the materialiser runs weekly and a client's schedule changes mid-week, drafts may already be attached to soon-to-be-stale slots. Need cancel-and-resync semantics.

5. **Quality regression.** Current model: AI sees only the canonical(s) it's drafting from, narrowly focused. Proposed: AI sees a bundle of 5-10 candidates. More context might lead to less focused drafts, especially for formats where focus matters (image_quote has one statement, not a thesis).

6. **Migration transition risk.** Existing 154 queued drafts shouldn't be lost. Cutover needs to either (a) drain old queue first, then enable new system, or (b) hybrid for a window.

7. **Throttle bypass discovered today (separate fix, but related).** `cpp.destination_id NULL` on LI/YT/CFW-FB/Invegent-FB caused throttle silently bypassed. Fixed via backfill migration `backfill_publish_profile_destination_id_throttle_fix_20260425`. Slot-driven architecture inherently respects schedules so the bypass class becomes less critical, but the underlying lock RPC is still the throttle enforcer.

8. **Auto-approver compatibility.** Auto-approver currently scores drafts against client_ai_profile rules. If drafts now arrive in slot-attached form, does scoring logic change? Probably not, but worth verifying.

9. **What if PK's hypothesis about the bundle is wrong?** Current proposal assumes "AI synthesises better when given a curated pool of candidates." This is unproven. May produce worse drafts than 1-canonical-per-prompt.

10. **No external client gate consideration.** This redesign is being proposed when ICE has zero paying clients. Building infrastructure that scales linearly with slot count is right thinking IF clients arrive. If they don't, this is over-engineering during a window where "leave R6 paused, publish manually" is also a valid posture.

## 9. Decision sought

PK needs to decide:
- **Build it** — proceed to detailed design + implementation. ~1-2 weeks of work depending on scope of Q1-Q6 answers.
- **Pause and reassess later** — leave R6 paused, drain existing queue (~5 days of publishing buffer). Revisit when first paying client signs and demand profile changes.
- **Hybrid** — keep R6 paused, manually approve drafts from existing queue this week, design properly next week with fresh head.

Reviewer is asked to challenge ALL THREE options, particularly:
- Is the "build it" plan structurally sound, or are there design holes?
- Is the "pause and reassess" framing realistic given ICE's commitment to NY/PP as live test clients?
- Is there a fourth option neither PK nor Claude has surfaced?

## 10. Reviewer instructions

Risk reviewer specifically asked to:
- Surface failure modes in Section 8 we missed
- Challenge the cost projection in Section 5 (any hidden cost growth?)
- Audit Section 6 "stays vs rebuilds" — anything we think is unaffected that actually changes shape?
- Pressure-test Q1-Q6 — any options we listed that are obviously wrong, any we missed?
- Name the silent-success failure modes — what could ship and APPEAR to work while not actually working?

Strategist reviewer (if invoked) specifically asked to:
- Pressure-test Section 9 Option 2 (pause and reassess) — is this actually viable given pre-sales gate commitments?
- Assess whether this work belongs ahead of or behind other Phase 3 items
- Challenge the implicit assumption that NY+PP need daily publishing volume

---

## Related context

- `docs/00_sync_state.md` — current system state (Saturday afternoon snapshot, M12 closure, R6 LIVE)
- `docs/decisions/D169_instagram_publisher_v2_queue_refactor.md` — earlier today's M12 closure
- `docs/06_decisions.md` D142–D167 — the router track that shipped R4/R5/R6
- `docs/04_phases.md` — Phase 3 commitments
- `docs/07_business_context.md` — Direction A/B/C strategy framing
- Today's emergency fixes: `pause_r6_seed_crons_cost_control_20260425_evening`, `backfill_publish_profile_destination_id_throttle_fix_20260425`
