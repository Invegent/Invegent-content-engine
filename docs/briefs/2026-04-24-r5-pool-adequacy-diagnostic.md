# R5 pool-adequacy diagnostic — shipped 24 Apr late-evening

**Status:** 🟢 LIVE — 2 functions + 1 view, tested across all 4 clients
**Purpose:** Answer "why is this client not getting 20/20 slots filled?" and route the fix to the right team
**Migration:** `r5_pool_adequacy_diagnostic_20260424`

---

## Why this exists

R5's smoke test tonight said "20/20 slots for NY and PP, 8/8 for CFW, 10/10 for Invegent, zero dupes" — which **looked** like all four clients were passing. They weren't.

CFW demanded 18 slots and filled 8. Invegent demanded 18 slots and filled 10. The function was just reporting what it filled, not what the demand grid actually asked for. The "success" framing was misleading.

The deeper question PK raised: **"How confident are we that a new client will work when we onboard them cold?"**

The honest answer was "the math works but I've only tested it against 2 rich pools and 2 half-configured pools — so I don't actually know." This diagnostic closes that gap. It turns every future onboarding into a measurable question with a measurable answer.

---

## What it does

For each (client, platform, format) demand slot, the diagnostic answers:
- How many canonicals in your pool are a **strong fit** for this format?
- How many are a **decent fit** (fallback)?
- What's the **adequacy ratio** (strong fits ÷ weekly demand)?
- What's the **status**: healthy / watch / thin / fallback-only / discovery-gap / demand-mismatch / empty?
- **Diagnosis in plain English** with routing — does this go to discovery, feed config, or demand grid review?

And at the client level, a one-line summary with a grade (A-F) and the primary action.

---

## Status categories and what they mean

| Status | What it means | Who fixes it |
|---|---|---|
| `POOL_HEALTHY` | Strong-fit pool ≥ 2× weekly demand | — |
| `POOL_OK` | Strong-fit pool ≥ weekly demand, but < 2× | Add feeds for resilience |
| `POOL_THIN` | Strong-fit pool < weekly demand | Feed config or wait for pool to build |
| `FALLBACK_ONLY` | No strong fit, decent fit available | Quality watch, not a block |
| `DISCOVERY_GAP` | Feeds produce zero canonicals of needed classes | **Escalate to discovery pipeline** |
| `DEMAND_MISMATCH` | Fitness matrix has no strong fit for this format | Review demand grid or matrix |
| `POOL_EMPTY` | Zero classified canonicals | Check ingest / classifier / feed activation |

---

## Grade definitions

| Grade | Meaning |
|---|---|
| **A** | Healthy — all slots have adequate strong-fit pools |
| **B** | Some slots at risk (thin or fallback-only) but nothing unfillable |
| **C** | Multiple thin slots |
| **D** | One or more unfillable slots (discovery gap, demand mismatch, or empty) |
| **F** | Zero classified canonicals — pipeline broken |

---

## Results on current clients (24 Apr late-evening)

| Client | Demand | OK | At risk | Unfillable | Grade | Primary action |
|---|---|---|---|---|---|---|
| NDIS-Yarns | 24 | 24 | 0 | 0 | **A** | Healthy |
| Property Pulse | 24 | 24 | 0 | 0 | **A** | Healthy |
| Care For Welfare | 18 | 14 | 4 | 0 | **B** | FEED_CONFIG: enable more feeds |
| Invegent | 18 | 3 | 8 | 7 | **D** | DISCOVERY: feeds missing classes |

### NY + PP (grade A)

Both production-ready. 6 classes represented in pool, all demand slots adequately covered.

### CFW (grade B — feed config issue)

18 slots demanded, 14 OK, 4 at risk. The 4 at-risk slots are:
- IG × carousel (2 slots, 1 strong-fit canonical available)
- LinkedIn × carousel (2 slots, 1 strong-fit canonical available)

Both need `multi_point` or `educational_evergreen` content. CFW's pool is thin in those classes because only 2 of 26 configured feeds are enabled. This is a feed activation / discovery sequencing issue, not a structural R5 problem.

### Invegent (grade D — discovery escalation ticket)

The diagnostic produced this list of unfillable slots — **ready to hand to the discovery team**:

| Platform | Format | Classes needed | Status |
|---|---|---|---|
| FB | image_quote | timely_breaking, stat_heavy | DISCOVERY_GAP |
| IG | animated_data | stat_heavy | DISCOVERY_GAP |
| IG | image_quote | timely_breaking, stat_heavy | DISCOVERY_GAP |
| IG | video_short_stat_voice | stat_heavy | DISCOVERY_GAP |
| LI | image_quote | timely_breaking, stat_heavy | DISCOVERY_GAP |
| LI | video_short_stat_voice | stat_heavy | DISCOVERY_GAP |

**Escalation summary for Invegent:** Discovery needs to produce feeds that yield `stat_heavy` and `timely_breaking` content. Current feed pool produces only `analytical` and `human_story`. Until discovery addresses this, 7 weekly slots (~39% of demand) cannot be filled with strong-fit content.

---

## How to use

### Single client ad-hoc

```sql
-- Per-slot detail
SELECT * FROM m.diagnose_match_pool_adequacy(
  'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid,  -- NDIS-Yarns
  CURRENT_DATE
);

-- One-line summary
SELECT * FROM m.summarise_match_pool_adequacy(
  'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid,
  CURRENT_DATE
);
```

### All clients at a glance (dashboard / ops review)

```sql
SELECT * FROM m.vw_match_pool_adequacy;
```

### As part of onboarding protocol

After configuring a new client's feeds, demand grid, and content scope, run:

```sql
SELECT * FROM m.summarise_match_pool_adequacy(<new_client_id>, CURRENT_DATE);
```

- **Grade A or B** → proceed to enabling R6 for this client
- **Grade C** → configure more feeds before going live
- **Grade D** → escalate specific missing classes to discovery before going live
- **Grade F** → pipeline broken; do not proceed

---

## Design choices worth documenting

1. **Strong-fit threshold = 80.** Parameterised but defaults to the spec's "strong match" threshold used elsewhere. Bumps to 85 would tighten grade boundaries; 75 would loosen.
2. **Adequacy ratio target = 2×.** Anything less than 2× weekly demand risks pool exhaustion mid-week. Keeps one week of slack.
3. **Separate "discovery_gap" from "pool_thin".** Discovery gap means feeds structurally can't produce the class. Pool thin means they can but volume is low. Different fixes — different teams.
4. **`FALLBACK_ONLY` is not a failure.** R5 will fill these slots via the greedy algorithm; they'll just score lower. Worth watching, not blocking.
5. **Grade F is reserved for pipeline-broken state.** A client with zero classified canonicals. Differentiates "bad config" from "system problem."

---

## What this does NOT tell you

- **Quality of the matches** once they're made — that requires actual engagement data (R7).
- **Whether the fitness matrix itself is correct** — still an untested theoretical scoring made up during R5 build. Calibration pending real-world data.
- **Whether your demand grid numbers are right** — it takes the grid as given and tells you whether your pool can satisfy it. Separate question whether the grid itself reflects optimal posting cadence.

---

## Where this plugs in

- **Pre-R6 validation** — run before enabling R6 for any client to confirm pool adequacy
- **Weekly ops review** — `SELECT * FROM m.vw_match_pool_adequacy;` surfaces clients drifting from grade A
- **Onboarding checklist** — last step before going live on a new client
- **Discovery pipeline escalation** — DISCOVERY_GAP rows are literally the escalation payload

---

## Commit trail

- Migration: `r5_pool_adequacy_diagnostic_20260424`
- This brief: `docs/briefs/2026-04-24-r5-pool-adequacy-diagnostic.md`
