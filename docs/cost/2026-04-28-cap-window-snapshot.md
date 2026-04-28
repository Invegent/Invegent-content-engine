# AI Cost Snapshot — 2026-04-28 evening (4th shift)

> **Purpose:** Pre-cap-reset diagnostic. Anthropic cap window resets Fri 1 May 2026.
> Snapshot captures run-rate shape and per-call cost characteristics for reference
> against the next 30-day cycle.
> **Status:** Diagnostic / reporting only. No fixes applied.
> **Triggered by:** Operator request, Option C of 4th-shift work plan.

---

## Headline

**No cost problem.** Cap window safe, run-rate at target, payload diet fix from ID003 incident is holding. Gate B autonomous run is comfortably inside envelope.

| Metric | Value |
|---|---|
| Cap window total since 1 Apr | $134.05 USD (4,044 calls) |
| Of which incident period (15-19 Apr) | $119.93 (89% of window) |
| Of which post-incident (20 Apr+) | $12.59 (657 calls) |
| Of which Phase B autonomous (26 Apr+) | $1.45 (112 calls) |
| Anthropic cap remaining | $68.55 of $200 |
| Days to cap reset | 3 (reset 1 May 2026) |
| Projected spend before reset | ~$2 max |

---

## Per-call cost — payload diet fix held

The ID003 incident fix (15-19 Apr root cause: ai-worker timeout + sweep-stale-running requeue + seed_payload bloat using `body_text` instead of `body_excerpt`) reduced per-call cost by **3.3×**:

| Period | Per-call cost (USD) |
|---|---|
| Pre-incident (Apr 1-14) | $0.040 |
| Incident peak (Apr 18) | $0.036 (high call volume diluted) |
| Post-incident reactivation (Apr 23-25) | $0.020 |
| Phase B steady-state (Apr 26-28) | $0.012 |

The fix is structural, not transient. Per-call cost should hold at ~$0.012 unless model changes or payload patterns regress.

---

## Daily run-rate

| Date | Calls | Cost (USD) | Notes |
|---|---|---|---|
| Apr 25 Sat | 511 | $10.47 | Reactivation testing burst (5.7% error rate, healthy) |
| Apr 26 Sun | 1 | $0.00 | Single errored call (Phase A complete) |
| Apr 27 Mon | 91 | $1.21 | Phase B start + Stage 2.1 publisher ship |
| Apr 28 Tue | 20 | $0.24 | Today partial through 21:30 AEST; pure pipeline autonomous |

**Steady-state Phase B run-rate: ~$0.48/day** (last 3 days average, excluding reactivation burst).

**Monthly projection:** $0.48/day × 30 = **$14.50/month** — under the $18 target, well under Stop 1 ($30/month) and Stop 2 thresholds.

---

## Top cost drivers (post-incident 7-day window, $12.59 total)

### By client

| Client | Cost | % | Calls | Errors | Error rate |
|---|---|---|---|---|---|
| ndis-yarns (Claude) | $6.87 | 55% | 306 | 29 | **9.5%** |
| ndis-yarns (OpenAI fallback) | $0.46 | 4% | 28 | 0 | n/a |
| property-pulse (Claude) | $4.59 | 36% | 272 | 5 | 1.8% |
| property-pulse (OpenAI fallback) | $0.05 | 0% | 5 | 0 | n/a |
| care-for-welfare (Claude) | $0.31 | 2% | 23 | 3 | 13.0% |
| invegent (Claude) | $0.27 | 2% | 20 | 3 | 15.0% |
| care-for-welfare (OpenAI fallback) | $0.01 | 0% | 1 | 0 | n/a |
| invegent (OpenAI fallback) | $0.01 | 0% | 2 | 0 | n/a |

### By content type

- `rewrite_v1` (legacy publisher path): 656 calls / $12.59 — **99.9% of cost**
- `slot_fill_synthesis_v1` (slot-driven path): 1 call / $0.00 — single call, errored, so the new path has effectively no production data yet

### By platform

| Platform | Calls | Cost | Per-call |
|---|---|---|---|
| LinkedIn | 266 | $5.72 | $0.0215 |
| Instagram | 295 | $5.20 | $0.0176 |
| Facebook | 78 | $1.44 | $0.0185 |
| YouTube | 18 | $0.23 | $0.0128 |

LinkedIn calls run **22% pricier per call** than Instagram. Likely longer prompts or output payloads on LinkedIn — worth a follow-up if cost optimisation becomes a priority later.

---

## Today's hourly distribution (Apr 28 AEST)

| Hour | Calls | Cost |
|---|---|---|
| 07:00 | 1 | $0.017 |
| 08:00 | 2 | $0.026 |
| 09:00 | 1 | $0.011 |
| 10:00 | 2 | $0.026 |
| 11:00 | 1 | $0.012 |
| 12:00 | 3 | $0.043 |
| 13:00 | 2 | $0.014 |
| 16:00 | 6 | $0.068 |
| 17:00 | 1 | $0.014 |
| 19:00 | 1 | $0.010 |
| **20:00 onwards** | **0** | **$0.000** |

**Confirms:** 4th-shift session work (audit cycle 1 closure, F-002 LOW joint resolution, brief writing, branch hygiene investigation) was 100% DB+GitHub work via Supabase MCP and GitHub MCP. Zero AI burn from session activity. The $0.24 daily total is pure pipeline autonomous run.

---

## Quality finding (cost-neutral, flagged for follow-up)

**NDIS-Yarns error rate is materially higher than Property Pulse:** 9.5% (29/306) vs 1.8% (5/272). The OpenAI fallback rescues the failed calls — net cost impact negligible — but the differential suggests something specific to NDIS-Yarns content/profile/prompt is causing more Claude failures.

CFW (13.0%) and Invegent (15.0%) also show high error rates, but on small sample sizes (23 and 20 calls respectively, post-yesterday's mode=auto flip). Need a few more days of data before drawing conclusions on those.

**Action:** none tonight. Worth flagging for a future investigation — error log review on NDIS-Yarns specifically would reveal the failure pattern.

---

## Forward watchpoints

1. **Slot-driven cutover cost shape unknown.** `slot_fill_synthesis_v1` has 1 production data point ($0.00). When Gate B exits (earliest Sat 2 May) and Phase C cutover shifts production traffic to the slot-driven path, per-call cost characteristics may differ from `rewrite_v1`. Watch the first 24-48h post-cutover closely.

2. **CFW + Invegent run-rate ramping.** Only flipped to mode=auto + r6=true yesterday (27 Apr). Their daily contribution will grow as they accumulate post history. Currently $0.62 over 7 days; expect $2-3/week steady-state once full.

3. **NDIS-Yarns error rate.** 9.5% with no obvious cause. Investigate when energy permits.

4. **Cap reset 1 May resets the $134.05 ledger to $0.** A clean window starts. With $18 target and current $0.48/day run-rate, the next window should comfortably stay under. Set a soft check-in for ~7 May 2026 to confirm trajectory after the first week.

---

## Source queries (for future re-run)

```sql
-- Daily trend last 14 days
SELECT to_char(created_at AT TIME ZONE 'Australia/Sydney', 'YYYY-MM-DD Dy') AS date_aest,
       COUNT(*), COUNT(*) FILTER (WHERE error_call) AS errors,
       COUNT(*) FILTER (WHERE fallback_used) AS fallbacks,
       ROUND(SUM(cost_usd)::numeric, 4) AS usd_total,
       ROUND(AVG(cost_usd)::numeric, 5) AS usd_per_call
FROM m.ai_usage_log
WHERE created_at > NOW() - INTERVAL '14 days'
GROUP BY 1 ORDER BY 1;

-- Per client + provider 7d
SELECT c.client_slug, ail.provider, ail.model, COUNT(*),
       COUNT(*) FILTER (WHERE ail.error_call) AS errors,
       COUNT(*) FILTER (WHERE ail.fallback_used) AS fallbacks,
       ROUND(SUM(ail.cost_usd)::numeric, 4)
FROM m.ai_usage_log ail
LEFT JOIN c.client c ON c.client_id = ail.client_id
WHERE ail.created_at > NOW() - INTERVAL '7 days'
GROUP BY c.client_slug, ail.provider, ail.model
ORDER BY 7 DESC;

-- Cap window total + remaining
SELECT COUNT(*), ROUND(SUM(cost_usd)::numeric, 2),
       ROUND((200 - SUM(cost_usd))::numeric, 2) AS remaining
FROM m.ai_usage_log
WHERE created_at > '2026-04-01'::timestamptz AND provider = 'anthropic';
```

---

## Snapshot lifecycle

This file becomes a historical reference once the cap window resets (Fri 1 May). Keep for:
- Run-rate baseline for the next cycle
- Per-call cost reference if future regression suspected
- Pattern reference if a similar diagnostic is needed in cycle 2+

The next equivalent snapshot should run ~1 week into the new cap window (around 7-8 May 2026) to confirm trajectory.
