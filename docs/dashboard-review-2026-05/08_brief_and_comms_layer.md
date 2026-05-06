# §8 — Brief and Comms Layer

## Purpose

Define the Brief system + communication layer as a delivery mechanism for the dashboard. §6 reserved the slot; §8 commits the design.

Resolves §6.10 Q1 (Brief content generation source). Commits the channel strategy for web + Telegram. Defers email to v2 with reason.

This is a decision document. It must produce a Brief that is *not* a nicer version of Overview. The acceptance test is in 8.6.

---

## 8.1 Brief System Definition (authoritative)

### Purpose

Brief is a **decision surface**. It exists to compress what would otherwise be 5 minutes of operator reasoning into ~30 seconds of decision triggers. It is NOT a status report; status lives in the Overview cards below it.

**The inclusion test.** Would a thoughtful operator have to *think* to derive this conclusion from the raw cards on Overview? If yes, Brief surfaces the conclusion. If no — e.g. "system status: healthy" — Brief omits it. The Brief block earns its real estate by saving the operator a derivation, not by re-rendering data.

Brief is the answer to: *"In the next 60 seconds, what should I think about?"*

### What qualifies for inclusion

**Alerts block.** Time-sensitive items where delay incurs cost.
- Token expiry within 7 days
- Stuck items aged beyond doctor-fix window
- Cadence overdue (e.g. compliance review queue last touched > 7 days)
- Surge alerts requiring action (e.g. queue depth exceeding cap-throttle threshold)
- CRITICAL-severity Inbox emergence

**Decisions block.** Pre-framed trade-offs the operator would otherwise have to construct.
- "X drafts stacked on gate Y; bulk-approve with filter clears Z; remaining N are genuine."
- "Re-enable jobid X triggers backfill burst; extend hold defers cap-throttle planning."
- "Token Y expires before next OAuth-test window; pre-test now or accept risk."
- A Decision is always: situation → trade-off → recommendation. If any of those three is missing, it's not a Decision; it's an Alert or a Summary.

**Summary block.** Narrative paragraph (~80 words) that surfaces patterns no single card can show.
- Cross-table patterns ("All 4 flagged drafts hit body-length gate — pattern, not noise")
- 24h trends ("8 publishes shipped, 2 below trailing average")
- Doctor activity rollup ("Doctor cleared 2 stuck items; 1 outstanding")
- Quiet acknowledgement when nothing is notable

### What is explicitly excluded

This list is the active resistance to drift. Any Brief item that matches one of these gets cut.

- **Status restatements.** "System is healthy" / "3 publishes in last hour" / "All clients green." Belongs on Overview cards.
- **Per-row event lists.** "Draft #142 flagged; draft #143 flagged..." Belongs in Pipeline Log.
- **Calibration deep dives.** Pass rates over time, gate-by-gate breakdowns. Belongs in REPORTS > Calibration.
- **Telemetry numbers without interpretation.** "`m.ef_drift_log` row count: 98." Means nothing standalone.
- **Recommendations not actionable in this session.** "Consider building a calibration UI in v2." Not a Brief item.
- **Items requiring more than a sentence to make sense.** If the Alert or Decision needs 3 lines to explain, it's the wrong shape — push it to a surface that can render context.
- **Restatements of what the operator already saw earlier in the same day.** Dedup rule (§8.4) handles this.
- **Speculative content.** "Might want to consider..." without a concrete trade-off framed.
- **Anything LLM-generated that the templated baseline cannot verify.** Hallucination guard (§8.7).

### Tie back to principles

- **P1 (operator-first).** Brief is keyed to operator decisions, not data shape. The salience score (§8.2) weights items by *what the operator does next*, not by table structure.
- **P2 (actionability).** Every Brief item points at a specific action or trade-off. An item that has no next-action is not a Brief item; it's an Overview card or REPORTS content.

---

## 8.2 Brief Content Model (Q1 resolved)

### RESOLVED: HYBRID generation

Templated baseline that ALWAYS works (deterministic SQL queries → templated output). LLM enrichment layer that adds narrative + cross-table pattern detection. If LLM fails, templated baseline ships unmodified with `⚠ basic mode` badge.

**Why hybrid over pure LLM.** Pure LLM = LLM failure means no Brief. Brief on Overview can't fail silently; that's worse than no Brief at all (operator sees blank top block, doesn't know if dashboard or Brief is broken).

**Why hybrid over pure templated.** Pure templated = no cross-table pattern detection. Templated can say "4 drafts flagged"; only LLM enrichment can say "all 4 hit body-length gate — pattern, not noise." The pattern detection is what saves operator thinking time.

### Inputs

#### Templated baseline inputs (deterministic)

| Input | Source | What it produces |
|---|---|---|
| Pipeline state counts per state | `m.vw_pipeline_state` (Q2 resolution) OR aggregations across `m.post_publish_queue` + `m.post_draft` + `m.ai_job` + `m.post_publish` | Counts for each canonical state from §6.5 |
| Inbox items by type and severity | Inbox source (TBD per §6.6 backing tables) | Counts: drafts / policy / format / agent × CRITICAL / HIGH / MEDIUM |
| Token expiry within window | `c.client_channel.token_expires_at` WHERE expires within 7 days | Per-client list of expiring tokens |
| Stuck items | Pipeline-doctor flag rows aged > 6h | Per-stage stuck count |
| Performance anomalies | REPORTS > Calibration weekly trend; pass rate week-over-week delta | Pass rate change exceeding threshold (e.g. ≥10pp WoW) |
| Cadence reminders | Last-touched timestamps on key surfaces (compliance review queue, ADMIN > Reviews, etc.) | Items aged beyond cadence threshold |
| Recent publishing volume | Last 24h `m.post_publish` count vs trailing 7d average | Volume delta with sign |
| Cron job status | `cron.job_run_details` last_run_at delta vs schedule | Cron jobs missing scheduled runs |

#### LLM enrichment inputs

| Input | Source |
|---|---|
| Templated baseline outputs | Pipe through |
| Last 24h doctor events | `m.pipeline_doctor_log` rows from window |
| Last 24h diagnostic agent digest | `m.ai_diagnostic_log` (Tier 2 LLM agent output) |
| Recent stuck-item resolutions | `m.pipeline_doctor_log` resolved events |
| Recent calibration changes | `m.compliance_rule` recent edits, `c.client_ai_profile` recent edits |

LLM enrichment prompt (high-level): *"Given the following templated baseline + 24h activity log, produce 0–3 cross-table patterns the operator would benefit from knowing. Each pattern ≤ 1 sentence. Do not restate templated content. If no pattern, return empty."*

### Transformation logic — selection

Each candidate item gets a **salience score**:

```
salience = severity_weight × time_decay × novelty
```

Where:
- `severity_weight`: CRITICAL=4, HIGH=3, MEDIUM=2 (LOW=1 excluded from Brief v1)
- `time_decay`: < 6h = 1.0, < 24h = 0.7, < 7d = 0.4, > 7d = 0.1
- `novelty`: 1.0 if not surfaced in last 3 Briefs, 0.3 if repeat (resists day-after-day repetition without suppressing escalations)

Selection per block:
- **Alerts:** top 3 items by salience, with CRITICAL severity always at top regardless of score
- **Decisions:** top 2 trade-offs by potential cost-of-delay (LLM-derived where enrichment available; templated fallback uses queue depth + age proxies)
- **Summary:** LLM-narrated paragraph; templated fallback is single-line health string

### Prioritisation rules

- CRITICAL severity items always surface in Alerts even if 4th by score (displaces lowest)
- Decisions block ordered by cost-of-delay descending
- Summary always last; bounded
- Tie-break: oldest-first (FIFO; matches Inbox prioritisation in §6.6)

### Output structure (concrete shape)

The Brief block on Overview renders three sub-blocks, top to bottom. This is the canonical shape; web + Telegram both use it.

```
[ALERTS]
• ⚠ Token: PP Facebook expires in 6 days — OAuth flow not exercised since 12 Mar
• ⚠ Stuck: 3 items in `publishing` aged > 4h — doctor cleared 2; 1 outstanding (NDIS Yarns IG)
• ⚠ Cadence: compliance review queue untouched 12 days

[DECISIONS]
• 28 drafts pending since 2 May. Auto-approver pass rate dropped 16pp on body-length gate.
  → Bulk-approve with body-length filter clears ~22; remaining 6 are genuine quality issues.
• IG queue at 104 (jobid 53 paused). Re-enable triggers backfill burst; extend hold pushes
  cap-throttle planning into next session.
  → Recommend: extend hold until cap-throttle plan committed.

[SUMMARY]
Last 24h: doctor cleared 2 stuck items, 1 outstanding. Auto-approver passed 16, flagged 4 —
all 4 on body-length gate (pattern, not noise). 8 publishes shipped, 2 below trailing average.
Compliance review queue untouched 12 days.
```

### Hard limits per block

- **Alerts:** max 3 items, each ≤ 1 line, bullet-prefixed
- **Decisions:** max 2 trade-offs, each ≤ 2 lines + recommendation arrow
- **Summary:** max ~80 words / 4–5 sentences
- **Total:** ≤ ~250 words per Brief (matches §6.3 bound)

Build acceptance: any Brief render exceeding limits fails review. Exceeding caused by salience scoring producing > 3 items at severity ≥ HIGH means the items are surfaced but not in Brief — they remain accessible in Inbox / Pipeline directly.

---

## 8.3 Channel Strategy

### a. Web (canonical)

**Surface.** NOW > Daily > Overview top block, above System status banner per §6.3.

**Render.** Server-rendered on Overview load. Cached in `m.brief` table (schema in 8.8 Q2). Cache TTL = 4h. On Overview load: if cached Brief < 4h, serve cached; else regenerate.

**Interaction model.**

Each Alert and Decision item has at most one primary drilldown. The drilldown lands the operator on the exact surface where the action lives, with filter pre-fill via Q3 mechanism (default: query string params per §6.10).

| Brief item type | Drilldown destination | Filter pre-fill |
|---|---|---|
| Token expiry alert | Overview reconnect banner (in-place) OR CLIENTS > Connect | `client_id`, `platform` |
| Stuck item alert | NOW > Investigate > Pipeline Log | `state=publishing&age_gt=4h` |
| Drafts decision | NOW > Daily > Inbox | `type=draft&gate=body_length` |
| Cadence reminder | ADMIN > Reviews / ADMIN > Compliance Rules | none |
| Performance anomaly | REPORTS > Calibration | `gate` filter if applicable |
| Cross-table pattern (LLM) | None (Summary block has no drilldown) | n/a |

Items without a clean single-action drilldown (e.g. IG queue planning decision, compliance review cadence) have no link in v1. The operator reads the trade-off and decides on the spot. Click-through is one-way; Brief does not refresh on return from drilldown (per §8.5 state sync).

### b. Telegram (nudge layer)

**Purpose.** Notify the operator that a Brief exists. Surface CRITICAL-severity items immediately. Prompt session entry to web. Telegram is a one-way notify channel in v1 — it never resolves anything.

**Message format.** Same content as web Brief, with adjustments:
- CRITICAL items in Alerts highlighted with leading 🚨
- Decisions block compressed: trade-off + recommendation only, no expansion
- Summary block included verbatim
- Bottom line: "Open dashboard to action. → https://invegent-dashboard.vercel.app/"
- Total length ≤ ~250 words (Telegram message limit ~4096 chars; well under)

Example Telegram message:

```
*ICE Brief — Wed 6 May, 07:00 AEST*

[ALERTS]
🚨 Token: PP Facebook expires in 6 days
⚠ Stuck: 3 items in publishing aged > 4h (1 outstanding)
⚠ Cadence: compliance review untouched 12 days

[DECISIONS]
28 drafts on body-length gate → bulk-approve with filter clears ~22
IG queue at 104 → extend hold until cap-throttle plan committed

[SUMMARY]
Last 24h: doctor cleared 2 stuck items, 1 outstanding. 4 flagged drafts all
on body-length gate. 8 publishes shipped, 2 below trailing average.

Open dashboard to action.
```

**Frequency rules.**
- Daily push at start-of-session local time. Default: **07:00 AEST** (configurable per operator; PK confirms in 8.8 Q3).
- Push on CRITICAL-severity emergence within 15 min of detection. Rate limit: max 3 CRITICAL pushes per hour to prevent flood.
- Skip push if no new CRITICAL since last Brief (deduplication; see 8.4).
- Quiet hours: no push 22:00–06:00 AEST unless CRITICAL.
- One operator in v1; multi-operator routing deferred to v2 if/when applicable.

**What is NEVER allowed on Telegram.**

| Forbidden | Reason |
|---|---|
| Inline approval / rejection of drafts | Decision channel scope creep — violates §6 anti-pattern "Telegram-as-decision-channel" |
| Inline rule update apply | Same |
| Any state mutation via bot reply | Same |
| Bot commands that mutate `m.*` tables | Same |
| Even reactive acknowledgements ("👍" → mark-read) | Invites scope creep toward decision channel; web is canonical for state |
| Two-way conversations with operator messages | Telegram bot does not parse incoming messages in v1 |

Build acceptance: Telegram bot integration must have **zero write endpoints** exposed to bot replies. Verifiable by code review + test that `POST /telegram-webhook` either ignores or rejects all incoming bot replies.

### c. Email (deferred / v2)

**What it would include.** Weekly Brief digest summary (not daily) — a rollup of the week's Alerts trends, Decisions taken, and Summary highlights. Different cadence and content from daily Brief.

**Why not v1.**
- Telegram + web cover the channel mix for solo operator
- Email adds operational complexity (deliverability, formatting per email client, unsubscribe, bounce handling, throttling)
- Cadence overlap risk: daily Telegram push already covers "start of day reminder" use case
- v1 audience is one person; email digest payoff is low
- External clients shift this calculus when onboarded — weekly client email digest becomes a real product surface

**Re-evaluate when.** First external client onboards (per §6.9 Open Decision 5 / Layer 1/2 portal split). Until then, deferred.

---

## 8.4 Triggering & Cadence

### Generation triggers

| Trigger | Condition | Action |
|---|---|---|
| **On Overview load** | Cached Brief age > 4h | Regenerate; serve fresh |
| **On Overview load** | Cached Brief age ≤ 4h | Serve cached |
| **Scheduled (cron)** | Daily at 06:30 AEST | Generate; write to `m.brief`; queue Telegram push for 07:00 |
| **Event-driven** | CRITICAL emergence AND last Brief > 1h old | Regenerate; queue Telegram push |
| **Event-driven** | CRITICAL emergence AND last Brief ≤ 1h old | Patch existing Brief; queue Telegram push if not yet pushed |
| **Manual refresh** | Operator clicks "Refresh Brief" button on Overview | Regenerate; do NOT queue Telegram push (this is a web-only action) |

Daily scheduled generation is the dominant trigger. Cache-on-load handles same-session staleness. Event-driven is rare (CRITICAL only) and bounded.

### Alignment with §3 cadence layers

- **Daily dominant.** Brief lives at start-of-day; one Telegram push per day; renders fresh on first Overview load. Operator sees Brief once per session minimum.
- **Weekly summaries.** Brief Alerts block includes cadence reminders pointing at REPORTS — does NOT replicate REPORTS content. "Performance trend up 6%, full breakdown in REPORTS > Performance."
- **Monthly.** Brief does not include monthly content. Cadence reminder only ("Compliance review queue last touched 12 days").

### Deduplication rules

**Item-level dedup.**
- Each Alert and Decision item has a content hash (e.g. `sha256(item_type + key_subject + severity)`)
- Novelty score reduces if hash appears in last 3 Briefs (see 8.2 salience formula)
- A repeat item is **not silently suppressed** — it's deprioritised. If severity escalates (e.g. token-expiry alert went from "7 days" to "2 days"), novelty resets to 1.0 because severity escalation IS news.

**Summary dedup.**
- Summary regenerates fresh each Brief; deduplication does NOT apply to narrative paragraph
- LLM enrichment receives prior 3 summaries as context with instruction "do not repeat language patterns"

**Cross-channel dedup (Telegram vs web).**
- Telegram push omits any Alert that appeared in last 24h Telegram push UNLESS severity escalates
- Telegram push always includes Decisions and Summary fresh (even if same as web Brief), because Telegram cadence is daily and operator wouldn't see the web Brief between pushes

**Failure-pattern dedup.**
- If templated input "stuck items aged > 6h" produces the same set of stuck items 3 days running, it's a chronic state, not an Alert. The salience score's novelty factor surfaces it once with high severity, then drops it; chronic items live in Pipeline Log, not Brief.
- Build acceptance: chronic-state suppression must be observable — if Brief stops surfacing an item, it's logged so the operator can verify.

---

## 8.5 Integration with NOW

### Brief connects to

- **NOW > Daily > Inbox.** Drafts decisions, policy alerts, format escalations drill into Inbox with filter pre-applied.
- **NOW > Daily > Pipeline.** Stuck-item Alerts drill into Pipeline state lane filtered to specific stage + age.
- **NOW > Investigate > Pipeline Log.** Doctor-event-related Alerts drill into Pipeline Log filtered to event type + time range.
- **NOW > Investigate > Visual Pipeline.** Render-failure Alerts drill into Visual Pipeline Render Log.
- **NOW > Investigate > Agents.** Agent-recommendation Alerts drill into Agents card.
- **REPORTS > Calibration.** Performance anomaly Alerts cross-link to REPORTS > Calibration (cross-section per §6.4).
- **REPORTS > Performance.** Volume anomalies cross-link to REPORTS > Performance.
- **CLIENTS > Connect.** Token-expiry alerts cross-link to CLIENTS > Connect with `client_id` + `platform` pre-fill.
- **ADMIN > Compliance Rules.** Cadence reminders for compliance link here (read-only orientation; operator navigates to Inbox to apply).
- **Failures.** N/A. `/failures` retires per §6; dead items surface in Pipeline Log + Inbox.

### Click-through behaviour

- Each Brief item has at most one primary drilldown
- Drilldowns carry filter pre-fill via Q3 mechanism (default: query string params per §6.10)
- Items without a clean single-action drilldown (e.g. IG queue planning decision) have no link — the operator reads the trade-off and decides
- Click-through is one-way; Brief does not refresh on return from drilldown (operator must regenerate via Refresh button or wait for next scheduled generation)

### State synchronisation

Brief is a read-only snapshot at generation time. The complication: the operator may resolve an item (e.g. approve drafts), then return to Overview — Brief still shows the resolved item.

**v1 default behaviour.**
- Cached Brief renders unchanged after operator action
- Stale-indicator on Alert items whose underlying count has changed (e.g. "28 drafts" with current count 22 → strikethrough on "28" + new count "22" beside it)
- Decisions block does not auto-update; the trade-off framing is point-in-time
- Summary block does not auto-update
- Manual "Refresh Brief" button regenerates on demand (web only; does not push Telegram)
- Auto-regeneration on Overview load if cached > 4h old

**Why not auto-refresh after every action.**
- Brief is a session-entry decision surface, not a live dashboard. Regenerating on every action would defeat the "compress thinking time" purpose.
- Cost: regeneration costs LLM tokens and DB queries; once-per-session is the right cadence.
- Stale-indicator is sufficient for the v1 trust contract.

---

## 8.6 Anti-Pattern Protections

### Brief-as-firehose

**Enforcement rule.** Hard caps per block (3 Alerts, 2 Decisions, ~80 words Summary, ~250 words total). If salience scoring produces > 3 items at severity ≥ HIGH, only top 3 surface in Brief; remainder remain accessible in Inbox or Pipeline directly.

**Build acceptance.** Brief render that exceeds limits fails review. Salience overflow is logged so operator can verify behaviour.

**Where enforcement lives.** Brief generation function (Edge Function or templated SQL function) hard-caps before render; no UI-side trimming.

### Telegram-as-decision-layer

**Enforcement rule.** Zero state-mutation endpoints exposed to Telegram bot. No inline buttons that fire server actions. No bot command grammar that maps to mutations. Every Telegram message terminates with "Open dashboard to action."

**Build acceptance.**
- Telegram bot integration tests verify zero write endpoints
- Code review checks: `POST /telegram-webhook` handler either ignores or rejects all incoming bot messages in v1
- No Telegram-bot library calls invoke `m.*` table writes

**Where enforcement lives.** Telegram bot integration code; tests in dashboard repo.

### Duplicate information vs Inbox / Overview cards

**Enforcement rule.** Brief items are *decisions / patterns / predictions*; Inbox items are exception-triage rows; Overview cards are state snapshots. The three are non-overlapping.

**Test for duplication.** If a Brief item could be derived from a single Overview card OR a single Inbox row alone, it doesn't qualify for Brief.

**Examples.**
- BAD Brief Alert: "3 drafts pending review" (already on Overview Drafts to Review card; failure)
- GOOD Brief Alert: "28 drafts pending since 2 May; pass rate dropped 16pp on body-length gate" (cross-table pattern; Overview cards don't show pass-rate-trend correlation)
- BAD Brief Decision: "Approve draft #142" (per-row; belongs in Inbox)
- GOOD Brief Decision: "28 drafts on body-length gate → bulk-approve with filter clears ~22" (pre-frames the bulk-approve workflow)

**Where enforcement lives.** Brief content review at v1 ship checks every item against the duplication test. Salience scoring + LLM prompt explicitly exclude Overview-card-content restatements.

### Brief-as-nicer-Overview (PK's critical instruction)

**Enforcement rule.** Every Brief item must surface a conclusion the operator would otherwise have to derive. If the conclusion is visible by glancing at Overview cards, the Brief item fails.

**Acceptance test.** Take a sample Brief. For each item, ask: *"Could the operator have reached this conclusion in 5 seconds by glancing at Overview cards?"* If yes for any item, the item fails.

**Implementation guard.**
- Brief generation logic explicitly excludes restatements of Overview card content (templated baseline has an "is this on a card?" check before inclusion)
- LLM enrichment prompt receives explicit instruction: "Do not restate visible Overview card content. Surface only patterns or trade-offs that require cross-table reasoning."
- PK sample-reads first week of production Briefs and provides thumbs-up/down feedback; salience weights tuned from feedback (procedural, not infrastructural)

**Where enforcement lives.** Brief generation function + LLM prompt + procedural review during first 2 weeks of v1 operation.

---

## 8.7 Failure Modes

Brief MUST be deterministic in failure. The whole point is that the operator opens Overview and sees something useful. If Brief silently fails, Overview shows a blank top block — confusing.

### LLM fails (timeout, API error, malformed output)

- Templated baseline ships unmodified
- Summary block replaced with deterministic templated paragraph: auto-generated 1-line health summary from templated inputs (e.g. "Last 24h: 8 publishes shipped; 4 drafts flagged; 2 stuck items resolved.")
- Visible indicator: small `⚠ basic mode` badge next to Brief block heading
- No retry within session; next scheduled generation tries again
- Failure logged to `m.pipeline_doctor_log` with `type=brief_llm_failure`

**Why this is acceptable.** Templated baseline is sufficient for safety — the operator still gets the high-priority Alerts and the templated Decisions. Only the cross-table pattern detection in Summary degrades. Operator sees `⚠ basic mode` and knows.

### Data is incomplete (missing tables, query failures)

- Each templated input has a try-catch wrapper
- Failed input contributes nothing; other inputs still flow
- Salience scoring runs over surviving inputs only
- If > 50% of inputs fail: Brief renders empty top block with single error message: "Brief unavailable — [N] inputs failed; check Pipeline Log for queries"
- Render existing Overview cards normally below; Brief failure does NOT block Overview
- Failure logged to `m.pipeline_doctor_log` with `type=brief_input_failure` and per-input fault breakdown

### Signals conflict

E.g. doctor-log says cleared, but cron last_run shows still stuck.

- Templated layer surfaces both signals as separate Alerts; does NOT attempt resolution
- LLM enrichment receives conflict marker; if LLM is operating, it narrates the conflict in Summary ("Doctor log says cleared but cron last-run is stale — inspect row directly")
- Default behaviour: operator sees two alerts pointing at the same subject — escalation to Pipeline Log row inspection
- This is ACCEPTABLE — better to surface uncertainty than hide it

### Cache is stale (Brief generated > 4h ago)

- Stale indicator on Brief block heading: "Generated 5h ago — [Refresh]"
- Manual refresh button regenerates on demand
- Auto-regeneration on Overview load if > 4h old (per 8.4 trigger)

### Telegram push fails

- Web Brief unaffected
- Failure logged to `m.pipeline_doctor_log` with `type=telegram_push_failure`
- No retry within window (avoid duplicate notifications if push partially succeeded)
- Next scheduled push tries again at next cadence point
- If 3 consecutive pushes fail → surface as Brief Alert (severity HIGH, type=infrastructure)

### No content meets salience threshold

Healthy state during steady periods.

- Brief renders three sub-blocks, each containing single-line acknowledgement: "Nothing notable in last 24h"
- Operator gets visual confirmation Brief ran and produced no items — distinct from Brief broken (which would render error message)
- Telegram push still fires daily; message reads "ICE Brief — nothing notable in last 24h. → dashboard"

### Two Brief generations race (concurrency)

- Generation function uses advisory lock on `m.brief.client_id` (or singleton lock for global Brief)
- Second call sees lock and serves last-cached row
- Build acceptance: concurrent test verifies no duplicate `m.brief` rows from race

### Brief table write fails

- Brief renders inline (best-effort) without persisting to `m.brief`
- No cache benefit until next generation
- Failure logged

---

## 8.8 Open Questions

Build-blockers only. Items that block §10 sequencing or Phase 3 work.

### Q1 — Telegram bot infrastructure

**The decision.** Provision new Telegram bot (via `@BotFather`) and configure on Vercel env, OR use existing Invegent infrastructure if present.

**Why blocker.** Affects Phase 3 build scope (bot creation + webhook handler + auth flow + chat ID storage).

**Default if no preference.** Provision new bot. Bot token in Vercel env. Single chat ID stored in `c.client_channel` or new `c.operator_telegram` table.

### Q2 — `m.brief` table schema and retention

**The decision.** Schema columns + retention window. Full-history (audit trail) vs rolling window (cost-bounded).

**Why blocker.** Affects schema migration in Phase 1; affects dedup query cost in 8.4.

**Default if no preference.** Schema:
```
m.brief (
  id uuid PK,
  generated_at timestamptz,
  scope text, -- 'global' | 'client:slug' (v1 = global only)
  alerts jsonb,
  decisions jsonb,
  summary text,
  templated_only bool, -- true if LLM enrichment failed
  generation_ms int,
  llm_input_hash text -- for debugging
)
```
Retention: 30-day rolling window via daily cleanup cron. Audit needs covered by §3 source logs (`m.pipeline_doctor_log`, `m.ai_diagnostic_log`).

### Q3 — Operator scheduled-push time

**The decision.** Daily Telegram push default 07:00 AEST. PK may prefer different time.

**Why blocker.** Trivial value but worth confirming — wrong time = useless notification.

**Default if no preference.** 07:00 AEST. Configurable in `c.operator_telegram.push_time_local`.

### Q4 — LLM choice for enrichment

**The decision.** Claude API (per `userMemories`: primary model) or OpenAI fallback or templated only.

**Why blocker.** Affects EF deploy scope (which API client) and AI cost projection.

**Default if no preference.** Claude API for enrichment, OpenAI fallback per existing ai-worker pattern, templated fallback as ultimate failsoft per 8.7. Enrichment runs through ai-worker (or new brief-worker EF) using existing API key infrastructure.

### Q5 — Multi-client scope (v1 vs v2)

**The decision.** v1 Brief = single global Brief covering all PK's clients. v2 = per-client Briefs (e.g. for external client portal).

**Why blocker.** Affects schema (v1: scope='global' only; v2: scope='client:slug'). Affects Telegram routing (v1: one chat; v2: per-client chats or per-operator chats).

**Default if no preference.** v1 = global scope only. Per-client scope reserved in schema (`scope` column) but unused in v1.

---

## 8.9 Decisions locked vs deferred

### LOCKED in §8

- Brief is a decision surface, not a status surface
- Inclusion test: operator would have to derive the conclusion from raw cards
- Three sub-blocks: Alerts (max 3), Decisions (max 2), Summary (~80 words), total ≤~250 words
- HYBRID generation: templated baseline + LLM enrichment with deterministic fallback
- Salience scoring: severity_weight × time_decay × novelty
- LOW severity excluded from Brief v1 (consistent with Inbox §6.6)
- Web canonical at NOW > Daily > Overview top block
- Telegram nudge-only with zero state-mutation endpoints
- Email deferred to v2 with reason
- Daily scheduled generation at 06:30 AEST + cache-on-load (TTL 4h) + event-driven on CRITICAL emergence + manual refresh button
- Daily Telegram push at 07:00 AEST default
- Item-level dedup via content hash with severity-escalation override
- Stale indicator on Brief items whose underlying count changes; no auto-refresh-on-action
- Five anti-patterns guarded: firehose, Telegram-as-decision, duplication, nicer-Overview, chronic-state
- Six failure modes deterministic: LLM fail, data incomplete, signal conflict, cache stale, Telegram push fail, no salient content, concurrency, table write fail

### DEFERRED in §8

| Item | Reason |
|---|---|
| Per-client Brief scope | v1 = global only; v2 when external clients onboard |
| Email digest | v2; cadence overlap risk with Telegram daily; deliverability complexity |
| Two-way Telegram (acknowledge / approve via bot reply) | Permanent; violates Telegram-as-nudge principle |
| Multi-operator Telegram routing | v2 if/when applicable |
| Brief content quality acceptance test (formal) | Procedural; PK sample-reads first 2 weeks; salience weights tuned from feedback |
| Brief storage long-term audit retention | 30-day rolling window in v1; audit via source logs |
| LLM model preference per Brief request | Default Claude; per-request override deferred |
| Localisation / time-zone handling | AEST only in v1; PK is the only operator |

---

## 8.10 Honest limitations

- Brief content quality is a *judgement* call. §8.6 commits enforcement rules and acceptance tests, but the difference between "a nicer Overview" and "a real decision surface" is partly subjective. PK feedback in the first 2 weeks of production is the ultimate calibration mechanism.
- LLM enrichment cost not estimated. Salience scoring + structured prompt should cap input size; ballpark assumption is one ~2000-token call per Brief generation = ~6 calls/day at most = trivial.
- Telegram bot infrastructure (Q1) is not blocked-on-itself — it can be provisioned in parallel with templated baseline build. But Phase 3 of §6.8 commits Brief surface MVP, and Telegram is part of MVP per this section. Build path: provision bot → templated baseline → LLM enrichment → Telegram push, in that order.
- `m.brief` schema (Q2) interacts with the dedup queries in 8.4 — a poor schema choice could make hash-lookup slow at scale. v1 scale is one Brief per day = 30 rows in the rolling window = trivial. Re-evaluate at multi-client v2.
- Q3 cross-section pre-fill mechanism is the same Q3 as §6.10 — Brief drilldowns inherit it. If Q3 isn't resolved before Phase 3, Brief drilldowns degrade to filter-less destinations. Same dependency as the Inbox→ADMIN handoff in §6 / §7.
- The salience scoring formula is a starting point. Weights (severity_weight, time_decay multipliers, novelty values) will need tuning. §8 commits the formula structure; tuning is build-time work.
- Brief is generated for one operator (PK) in v1. If a second operator joins (e.g. virtual assistant per `docs/05_risks.md` Risk 6 mitigation), routing logic + scope semantics need rethinking. Out of §8 scope.
- Cowork (autonomous brief execution per `userMemories`) is parallel automation infrastructure, not a Brief input source in v1. If Cowork's role expands to feed Brief content ("Cowork resolved 3 doctor flags overnight"), §8 needs amendment. Currently Cowork outputs are visible via `docs/runtime/sessions/` not via `m.*` tables.
- The acceptance test in 8.6 "could the operator reach this in 5 seconds by glancing at cards?" requires that the operator actually has the cards visible and is glancing. If Brief loads before cards render, the test fails its premise. v1 implementation: Brief renders simultaneously with cards, both server-rendered.
- The 4h cache TTL + manual refresh + auto-on-load combination is a heuristic, not derived. May be too aggressive or too lax. Tune in production.
- F-EF-DRIFT-PREVENTION Stage 2b drift events are currently planned to surface in Pipeline Log per §6.9. §8 does NOT route drift events into Brief in v1, but they are eligible for Brief Alerts via the templated baseline once Stage 2b ships and `m.ef_drift_log` becomes a stable input source.

---

*Created 2026-05-06 (Sydney). §8 of 11 in the dashboard architecture review. Inputs: `06_final_target_design.md`, `07_traceability_matrix.md`. Resolves §6.10 Q1 (Brief content generation source = HYBRID). Locks Brief content model, channel strategy, triggering cadence, anti-pattern protections, failure modes. Five new build-blocker open questions surfaced for PK direction before §10. Q3 (cross-section pre-fill) inherited from §6.10 — no new dependency. Next: §9 New product objects (`m.attention_item`, agent status, scope primitive, `m.brief`).*
