# Brief — Cost Guardrails (D157 Stop 2 Implementation)

**Created:** 20 April 2026
**Owner:** PK
**Implements:** D157 (two-stop budget enforcement), ID003 remediation layer
**Depends on:** ai-worker three-part fix (must ship first; see ID003 post-mortem)
**Estimated build time:** 4–6 hours (one focused session)
**Priority:** High — pre-sales gate A28

---

## Purpose

Provide ICE-internal cost visibility, anomaly detection, and graceful throttling BELOW the Anthropic console hard cap. Prevent ID003 (or any variant of it) from recurring undetected.

Budget numbers in this brief are **PROVISIONAL**. They are Sunday 19 April estimates from limited clean data. They must be recalibrated after the ai-worker fix ships and 7 days of post-fix data accumulates.

---

## Scope

### In scope

1. `m.cost_expectation` reference table (per-caller expected daily spend)
2. `m.cost_daily_summary` rolling table (per-caller actual spend by day)
3. `m.cost_alert` table (anomaly flags)
4. `m.cost_throttle_log` table (throttle events + reason)
5. `ai-cost-tracker` Edge Function (daily cron)
6. Throttle trigger function (`public.apply_cost_throttle()`)
7. Dashboard Monitor tab → new "AI Costs" panel
8. Telegram alerts via existing `@InvegentICEbot` webhook

### Out of scope (deferred)

- Per-client budget enforcement (wait for post-revenue view; currently all clients share pooled budget)
- Per-draft cost attribution beyond what `m.ai_usage_log` already provides
- Predictive spend forecasting (linear projection is enough for v1)
- Auto-tuning of expected costs (weekly manual calibration for v1)
- Integration with `m.external_reconciliation_result` for Anthropic console reconciliation (Stage 2.9 in D156; build separately)

---

## Data model

### `m.cost_expectation`

One row per caller. Calibrated weekly.

```sql
CREATE TABLE m.cost_expectation (
  caller TEXT PRIMARY KEY,  -- matches ai_usage_log.content_type
  expected_calls_per_day INT NOT NULL,
  expected_input_tokens_per_call INT NOT NULL,
  expected_output_tokens_per_call INT NOT NULL,
  expected_cost_usd_per_day NUMERIC(10,4) NOT NULL,
  soft_alert_threshold_usd NUMERIC(10,4) NOT NULL,  -- typically 1.5× expected
  throttle_threshold_usd NUMERIC(10,4) NOT NULL,    -- typically 3× expected
  halt_threshold_usd NUMERIC(10,4) NOT NULL,        -- typically 10× expected
  is_essential BOOLEAN NOT NULL DEFAULT false,       -- if true, throttle does not disable
  notes TEXT,
  last_calibrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Initial seed rows (PROVISIONAL — refine after post-fix calibration):**

| caller | calls/day | input/call | output/call | cost/day | soft | throttle | halt | essential |
|---|---|---|---|---|---|---|---|---|
| rewrite_v1 | 40 | 3000 | 500 | $0.12 | $0.30 | $1.00 | $5.00 | ✅ |
| synth_bundle_v1 | 10 | 3000 | 500 | $0.03 | $0.10 | $0.30 | $2.00 | ✅ |
| pipeline_ai_summary | 24 | 3500 | 200 | $0.30 | $0.75 | $2.00 | $5.00 | ❌ |
| ai_diagnostic | 1 | 8000 | 800 | $0.04 | $0.10 | $0.30 | $1.00 | ❌ |
| brand_scanner | 0.2 | 15000 | 1500 | $0.02 | $0.10 | $0.30 | $2.00 | ❌ |
| ai_profile_bootstrap | 0.2 | 15000 | 1500 | $0.02 | $0.10 | $0.30 | $2.00 | ❌ |
| client_weekly_summary | 0.6 | 10000 | 1000 | $0.03 | $0.10 | $0.30 | $2.00 | ❌ |
| weekly_manager_report | 0.1 | 20000 | 2000 | $0.02 | $0.10 | $0.30 | $2.00 | ❌ |
| feed_intelligence | 0.1 | 10000 | 1000 | $0.01 | $0.10 | $0.30 | $2.00 | ❌ |
| compliance_reviewer | 0.03 | 5000 | 500 | $0.00 | $0.10 | $0.30 | $2.00 | ❌ |
| **TOTAL (all callers)** | | | | **$0.59/day** | **$2.05** | **$6.40** | **$26.00** | |

**Post-fix monthly target:** ~$18 USD/month ≈ $27 AUD/month.

**PK pain threshold (+25%):** ~$23 USD/month ≈ $34 AUD/month.

**Anthropic console cap (Stop 1) recommendation:** $30 USD/month ≈ $45 AUD/month — to be raised to this only after fix ships and 7 days of clean data.

### `m.cost_daily_summary`

Written by `ai-cost-tracker` each morning at 00:15 UTC (10:15 AEST).

```sql
CREATE TABLE m.cost_daily_summary (
  summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day DATE NOT NULL,
  caller TEXT NOT NULL,
  total_calls INT NOT NULL,
  total_input_tokens BIGINT NOT NULL,
  total_output_tokens BIGINT NOT NULL,
  total_cost_usd NUMERIC(10,4) NOT NULL,
  expected_cost_usd NUMERIC(10,4),  -- from cost_expectation at time of write
  variance_ratio NUMERIC(6,2),       -- actual / expected; 1.0 = on budget
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (day, caller)
);
```

### `m.cost_alert`

```sql
CREATE TABLE m.cost_alert (
  alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day DATE NOT NULL,
  caller TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('soft','throttle','halt')),
  actual_cost_usd NUMERIC(10,4) NOT NULL,
  threshold_cost_usd NUMERIC(10,4) NOT NULL,
  variance_ratio NUMERIC(6,2) NOT NULL,
  message TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `m.cost_throttle_log`

```sql
CREATE TABLE m.cost_throttle_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  throttle_level TEXT NOT NULL CHECK (throttle_level IN ('soft','throttle','halt')),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  trigger_reason TEXT NOT NULL,
  day_cost_usd_at_trigger NUMERIC(10,4) NOT NULL,
  crons_disabled TEXT[],
  crons_re_enabled_at TIMESTAMPTZ
);
```

---

## Edge Function: `ai-cost-tracker`

**Cron:** daily at 00:15 UTC (10:15 AEST) via pg_cron
**Timeout:** 60s is sufficient (pure aggregation, no LLM calls)
**Runtime dependencies:** none new

### Logic

1. Query `m.ai_usage_log` for the prior UTC day, aggregated by `content_type` (caller)
2. For each caller, look up expected values from `m.cost_expectation`
3. Insert one row into `m.cost_daily_summary` per caller
4. Calculate variance; if above any threshold, insert into `m.cost_alert`
5. For alerts at `throttle` or `halt` severity, call `public.apply_cost_throttle(severity, reason)`
6. Send Telegram summary if any alert fired (summary format below)
7. Return JSON summary for monitoring

### Telegram alert format

```
🚨 ICE cost alert — [DATE]
Total spend yesterday: $X.XX USD (expected: $Y.YY)
Variance: Z.Zx

By caller (only alerts shown):
• rewrite_v1: $A.AA (3.2× expected) — SOFT
• synth_bundle_v1: $B.BB (8.1× expected) — THROTTLE

Action taken:
• pipeline-ai-summary cron disabled
• ai-diagnostic cron disabled

Acknowledge at: dashboard.invegent.com/monitor
```

---

## Throttle function: `public.apply_cost_throttle()`

**Signature:** `apply_cost_throttle(p_severity TEXT, p_reason TEXT) RETURNS JSONB`
**Security:** SECURITY DEFINER (needs cron.alter_job privileges)

### Logic

**If severity = 'throttle':**
- Disable non-essential crons (those where `cost_expectation.is_essential = false`):
  - `pipeline-ai-summary-hourly` (jobid 30)
  - `ai-diagnostic-daily` (jobid 56)
  - `weekly-manager-report-monday-7am-aest` (jobid 47)
  - `client-weekly-summary-monday-730am-aest` (jobid 51)
  - `feed-intelligence-weekly` (jobid 57)
  - `compliance-reviewer-monthly` (jobid 40) — conditional
- Keep enabled: `ai-worker-every-5m` (jobid 5), `auto-approver-sweep` (jobid 58)
- Write to `m.cost_throttle_log`
- Schedule auto-release at next UTC midnight via a separate one-shot pg_cron

**If severity = 'halt':**
- Disable all LLM-calling crons including essentials
- Also disable seed crons (jobids 11, 64, 65) to stop new ai_jobs being created
- Do NOT auto-release — requires manual PK intervention via dashboard or SQL
- Telegram URGENT alert

**Return:** JSONB with `{ severity, disabled_crons: [...], released_at: null or timestamp }`

---

## Dashboard panel: "AI Costs" tab under Monitor

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ AI Costs                                                │
│                                                          │
│ Today:     $X.XX USD  (expected $Y.YY, Zx)              │
│ 7-day avg: $X.XX USD/day                                │
│ Month-to-date: $X.XX / $30.00 (Stop 1 hard cap)         │
│                                                          │
│ [7-day line chart: actual vs expected per day]          │
│                                                          │
│ Per caller, last 7 days:                                │
│ • rewrite_v1: $X.XX (⚠ trending 1.4× above)             │
│ • synth_bundle_v1: $X.XX (✅ on budget)                 │
│ • pipeline_ai_summary: $X.XX (✅ on budget)             │
│                                                          │
│ Active alerts: 2 unacknowledged                         │
│ Active throttles: none                                  │
└─────────────────────────────────────────────────────────┘
```

### Data source

- Dashboard reads from new RPC: `public.get_monitor_cost_summary(p_days INT)` returning JSONB with all panel data
- Unacknowledged alert count: `SELECT COUNT(*) FROM m.cost_alert WHERE acknowledged_at IS NULL`
- Active throttle: `SELECT * FROM m.cost_throttle_log WHERE released_at IS NULL ORDER BY triggered_at DESC LIMIT 1`

### Interactions

- Click alert count → drawer showing all unacknowledged alerts
- Each alert has "Acknowledge" button that collects `action_taken` text before dismissing
- Click "Manual throttle" button → confirmation dialog → apply throttle at PK-selected severity

---

## Calibration workflow (ongoing)

**Weekly** (part of Monday morning routine post-epistemic-layer):

1. Query `m.cost_daily_summary` for last 7 days per caller
2. Compute average daily cost per caller over quiet days (exclude any day with `cost_alert` rows)
3. Update `m.cost_expectation.expected_cost_usd_per_day` = average × 1.1 (10% headroom for normal variance)
4. Update soft/throttle/halt thresholds proportionally
5. Log calibration in `docs/cost-calibration-log.md` (new file)

**Monthly** (after month-end):

1. Compare total month spend to previous months
2. If trend is upward for 2 months, investigate — something has changed in the pipeline
3. If trend is stable, raise Anthropic console cap (Stop 1) by one tier if needed

---

## Gate to proceed to build

1. ✅ ai-worker three-part fix shipped (payload diet + idempotency + retry cap)
2. ✅ 24 hours of verified clean post-fix operation
3. ✅ ID003 post-mortem committed to repo
4. ✅ D157 decision committed to repo
5. ⚠ Numbers in this brief are still provisional — that's expected, do NOT wait for perfect numbers to build

---

## Build order (within this brief)

1. **DDL** — create all 4 tables, indexes
2. **Seed `m.cost_expectation`** with provisional numbers above
3. **Build `public.get_monitor_cost_summary()` RPC** — test against empty tables
4. **Build `ai-cost-tracker` Edge Function** — test against `m.ai_usage_log` historical data first
5. **Build `public.apply_cost_throttle()` function** — test by calling manually
6. **Wire dashboard panel** — AI Costs tab in Monitor
7. **Schedule `ai-cost-tracker` cron** — daily 00:15 UTC
8. **Telegram webhook integration** — reuse `@InvegentICEbot` endpoint
9. **Manual end-to-end test**: pick a quiet day, insert fake high-cost rows into `m.ai_usage_log`, observe alert → throttle → Telegram → dashboard flow

---

## Success criteria

- Dashboard AI Costs panel shows accurate 7-day rolling spend
- At least one successful throttle test (manual trigger releases correctly at midnight UTC)
- Telegram alerts received successfully
- Variance ratios are populated on `m.cost_daily_summary` rows
- PK can acknowledge an alert from the dashboard and the acknowledgment persists
- If the ID003 loop recurred today with this infrastructure in place, the throttle level would fire within 6 hours of spend crossing threshold

---

## Follow-on items (explicitly out of scope for this brief)

- **Inbox anomaly monitor** — separate brief (`docs/briefs/2026-04-20-inbox-anomaly-monitor.md`). Monitors Gmail for billing-receipt patterns as belt-and-braces against ICE DB failing to record a call.
- **Per-client budget attribution** — wait until 3+ external clients exist.
- **Anthropic console reconciliation** (Stage 2.9 of D156) — separate work stream under external epistemic layer.

---

## Notes for Future-Claude

- Numbers in the initial `cost_expectation` seed are **provisional**. Calibrate weekly. The first calibration, 7 days after fix ships, is likely to show the pipeline can actually run on ~$5 USD/month rather than $18, because payload diet will reduce input tokens 3–5×.
- Do not mistake `m.ai_usage_log.content_type` values (e.g. `rewrite_v1`, `synth_bundle_v1`) for the Edge Function names that produce them. `rewrite_v1` = ai-worker's rewrite flow. `synth_bundle_v1` = ai-worker's synthesis-bundle flow. Both live in the same Edge Function but with different prompt templates.
- When calibrating thresholds, be generous on the soft threshold (false positives lose trust) and strict on the halt threshold (a false negative costs money).
- Stop 1 cap should always stay below PK's pain threshold ($ target + 25%). Never raise Stop 1 as a reaction to hitting it; raise it only after cost expectation has been revised upward for a structural reason.
